import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { performance } from 'node:perf_hooks';
import { WebSocketServer, WebSocket } from 'ws';
import { afterEach, expect, it, vi } from 'vitest';
import { GnaniSttProvider } from '../src/providers/gnani-stt.js';
import type { SttEvent, Transcript } from '../src/providers/types.js';
import { AUDIO } from '../src/validation.js';
import { createMockRelay } from '../src/server.js';

const key = 'synthetic-local-key';
const config = { language: 'hi-IN', audio: AUDIO };
const connected = { type: 'connected', config: { sample_rate: 16000, chunk_size: 512 } };
const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function localServer() {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(server, 'listening');
  cleanups.push(() => new Promise<void>((resolve) => {
    for (const client of server.clients) client.terminate();
    server.close(() => resolve());
  }));
  return { server, url: `ws://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

it('maps connected, processing and transcript metadata through a local websocket', async () => {
  const { server, url } = await localServer();
  let headers: Record<string, unknown> = {};
  server.on('connection', (socket, request) => {
    headers = request.headers;
    socket.send(JSON.stringify(connected));
    socket.on('message', (_raw, binary) => {
      expect(binary).toBe(true);
      socket.send(JSON.stringify({ type: 'processing' }));
      socket.send(JSON.stringify({ type: 'transcript', text: 'otp mat bataaen', segment_id: 'synthetic-segment', audio_duration_ms: 100, latency: 15 }));
    });
  });
  const events: SttEvent[] = [];
  const transcripts: Transcript[] = [];
  const provider = new GnaniSttProvider({ apiKey: key, url });
  cleanups.push(() => provider.stop());
  provider.start(config, (segment) => transcripts.push(segment), (event) => events.push(event));
  await vi.waitFor(() => expect(events[0]?.type).toBe('connected'));
  expect(headers).toMatchObject({ 'x-api-key-id': key, lang_code: 'hi-IN', 'x-sample-rate': '16000', 'x-format': 'verbatim' });
  provider.write(new Uint8Array(1024));
  await vi.waitFor(() => expect(transcripts).toHaveLength(1));
  expect(transcripts[0]).toEqual({ text: 'otp mat bataaen', segmentId: 'synthetic-segment', languageCode: 'hi-IN' });
  expect(events.map((event) => event.type)).toEqual(['connected', 'processing', 'transcript']);
  expect(events[2]).toMatchObject({ segment_id: 'synthetic-segment', audio_duration_ms: 100, latency: 15 });
});

it.each(['error', 'close'])('sanitizes a server %s without logging the key', async (kind) => {
  const { server, url } = await localServer();
  server.on('connection', (socket) => {
    socket.send(JSON.stringify(connected));
    setTimeout(() => {
      if (kind === 'error') socket.send(JSON.stringify({ type: 'error', message: key }));
      else socket.close(1011, key);
    }, 20);
  });
  const logs: unknown[] = [];
  const events: SttEvent[] = [];
  const provider = new GnaniSttProvider({ apiKey: key, url, log: (event) => logs.push(event) });
  cleanups.push(() => provider.stop());
  provider.start(config, () => {}, (event) => events.push(event));
  await vi.waitFor(() => expect(events.at(-1)?.type).toBe('error'));
  expect(events.at(-1)).toMatchObject({ recoverable: true });
  expect(JSON.stringify({ logs, events })).not.toContain(key);
});

it('delivers five 1024-byte frames through the socket and stops cleanly', async () => {
  const { server, url } = await localServer();
  const times: number[] = [];
  const sizes: number[] = [];
  server.on('connection', (socket) => {
    socket.send(JSON.stringify(connected));
    socket.on('message', (raw) => { times.push(performance.now()); sizes.push(Buffer.isBuffer(raw) ? raw.length : 0); });
  });
  const provider = new GnaniSttProvider({ apiKey: key, url });
  cleanups.push(() => provider.stop());
  const events: SttEvent[] = [];
  provider.start(config, () => {}, (event) => events.push(event));
  await vi.waitFor(() => expect(events[0]?.type).toBe('connected'));
  for (let index = 0; index < 5; index++) provider.write(new Uint8Array(1024));
  await vi.waitFor(() => expect(times).toHaveLength(5), { timeout: 2000, interval: 10 });
  expect(sizes).toEqual([1024, 1024, 1024, 1024, 1024]);
  // Socket receive timestamps include event-loop/network jitter and can coalesce.
  // Exact send cadence is verified with fake timers in pcm.test.ts, not arrival gaps.
  provider.stop();
  await vi.waitFor(() => expect(server.clients.size).toBe(0));
  provider.write(new Uint8Array(1024));
  expect(times).toHaveLength(5);
});

it('logs unknown types only, without their contents or the key', async () => {
  const { server, url } = await localServer();
  server.on('connection', (socket) => {
    socket.send(JSON.stringify(connected));
    socket.send(JSON.stringify({ type: 'future_event', message: key, transcript: 'private synthetic text' }));
  });
  const log = vi.fn();
  const provider = new GnaniSttProvider({ apiKey: key, url, log });
  cleanups.push(() => provider.stop());
  provider.start(config, () => {});
  await vi.waitFor(() => expect(log).toHaveBeenCalledWith({ type: 'future_event' }));
  expect(JSON.stringify(log.mock.calls)).not.toContain(key);
  expect(JSON.stringify(log.mock.calls)).not.toContain('private synthetic');
});

it('retries one failed connection after backoff, then succeeds', async () => {
  const { server, url } = await localServer();
  const times: number[] = [];
  server.on('connection', (socket) => {
    times.push(performance.now());
    if (times.length === 1) socket.close();
    else socket.send(JSON.stringify(connected));
  });
  const events: SttEvent[] = [];
  const provider = new GnaniSttProvider({ apiKey: key, url, backoffMs: 40 });
  cleanups.push(() => provider.stop());
  provider.start(config, () => {}, (event) => events.push(event));
  await vi.waitFor(() => expect(events[0]?.type).toBe('connected'));
  expect(times).toHaveLength(2);
  expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(40);
});

it('enforces the configured session length and emits a recoverable error', async () => {
  const { server, url } = await localServer();
  server.on('connection', (socket) => socket.send(JSON.stringify(connected)));
  const events: SttEvent[] = [];
  const provider = new GnaniSttProvider({ apiKey: key, url, maxSessionSeconds: 0.1 });
  cleanups.push(() => provider.stop());
  provider.start(config, () => {}, (event) => events.push(event));
  await vi.waitFor(() => expect(events.at(-1)?.type).toBe('error'));
  expect(events.at(-1)).toMatchObject({ recoverable: true });
});

it('maps provider failure to a recoverable relay session.error without ending the session', async () => {
  const { server, url } = await localServer();
  server.on('connection', (socket) => {
    socket.send(JSON.stringify(connected));
    setTimeout(() => socket.send(JSON.stringify({ type: 'error', message: key })), 20);
  });
  const relay = createMockRelay({ createSttProvider: () => new GnaniSttProvider({ apiKey: key, url }), log: () => {} });
  relay.server.listen(0, '127.0.0.1');
  await once(relay.server, 'listening');
  cleanups.push(relay.close);
  const client = new WebSocket(`ws://127.0.0.1:${(relay.server.address() as AddressInfo).port}/ws`, { origin: 'http://localhost:3000' });
  cleanups.push(() => client.terminate());
  const messages: { type: string; recoverable?: boolean }[] = [];
  client.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
  await once(client, 'open');
  client.send(JSON.stringify({ type: 'session.start', version: 1, consent: true, languageCode: 'hi-IN', audio: AUDIO }));
  await vi.waitFor(() => expect(messages).toContainEqual(expect.objectContaining({ type: 'session.error', recoverable: true })));
  expect(messages.some((message) => message.type === 'session.end')).toBe(false);
  expect(client.readyState).toBe(WebSocket.OPEN);
  expect(JSON.stringify(messages)).not.toContain(key);
});

it('exhausts exactly one connection retry and reports one sanitized error', async () => {
  const { server, url } = await localServer();
  let connections = 0;
  server.on('connection', (socket) => { connections++; socket.close(1011, key); });
  const events: SttEvent[] = [];
  const provider = new GnaniSttProvider({ apiKey: key, url, backoffMs: 10 });
  cleanups.push(() => provider.stop());
  provider.start(config, () => {}, (event) => events.push(event));
  await vi.waitFor(() => expect(events.at(-1)?.type).toBe('error'));
  expect(connections).toBe(2);
  expect(events.filter((event) => event.type === 'error')).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain(key);
});

it('times out a missing connected message and retries only once', async () => {
  const { server, url } = await localServer();
  let connections = 0;
  server.on('connection', () => { connections++; });
  const events: SttEvent[] = [];
  const provider = new GnaniSttProvider({ apiKey: key, url, connectTimeoutMs: 30, backoffMs: 10 });
  cleanups.push(() => provider.stop());
  provider.start(config, () => {}, (event) => events.push(event));
  await vi.waitFor(() => expect(events.at(-1)?.type).toBe('error'));
  expect(connections).toBe(2);
});

it('holds 128 pending frames while connecting and fails loudly on the 129th', async () => {
  const { url } = await localServer();
  const events: SttEvent[] = [];
  const provider = new GnaniSttProvider({ apiKey: key, url, retryConnect: false });
  cleanups.push(() => provider.stop());
  provider.start(config, () => {}, event => events.push(event));
  for (let i = 0; i < 128; i++) provider.write(new Uint8Array(1024));
  expect(events.some(event => event.type === 'error')).toBe(false);
  provider.write(new Uint8Array(1024));
  expect(events.at(-1)?.type).toBe('error');
});
