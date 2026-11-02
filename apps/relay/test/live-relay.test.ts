import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { afterEach, expect, it, vi } from 'vitest';
import type { RelayMessage } from '@scamcall/protocol';
import { createRelay } from '../src/server.js';
import { GnaniSttProvider } from '../src/providers/gnani-stt.js';
import { GnaniTtsProvider } from '../src/providers/gnani-tts.js';
import { GNANI_STT_LANGUAGES } from '../src/providers/gnani-languages.js';
import { createMockWav, MockTtsProvider } from '../src/providers/mock.js';
import { AUDIO } from '../src/validation.js';
import { gnaniUsage } from '../src/usage.js';

const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.unstubAllEnvs();
});
const start = { type: 'session.start', version: 1, consent: true, languageCode: 'hi-IN', audio: AUDIO };
async function fixture(options: Parameters<typeof createRelay>[0] = {}, texts = ['Apna otp batao.', 'OTP share karo abhi.']) {
  const upstream = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(upstream, 'listening');
  let connections = 0;
  upstream.on('connection', (socket) => {
    connections++;
    socket.send(JSON.stringify({ type: 'connected', config: { sample_rate: 16000, chunk_size: 512 } }));
    let frame = 0;
    socket.on('message', () => {
      const text = texts[frame++];
      if (text) socket.send(JSON.stringify({ type: 'transcript', text, segment_id: `synthetic-${frame}`, audio_duration_ms: 32, latency: 1 }));
    });
  });
  cleanups.push(() => new Promise<void>((resolve) => {
    for (const client of upstream.clients) client.terminate();
    upstream.close(() => resolve());
  }));
  const logs: { stage: string; audioSeconds?: number; ttsCharacters?: number }[] = [];
  const url = `ws://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  const relay = createRelay({ mode: 'live', createSttProvider: () => new GnaniSttProvider({ url, apiKey: 'synthetic-live-key' }),
    ttsProvider: new MockTtsProvider(), log: (entry) => logs.push(entry), ...options });
  cleanups.push(relay.close);
  relay.server.listen(0, '127.0.0.1');
  await once(relay.server, 'listening');
  const relayUrl = `ws://127.0.0.1:${(relay.server.address() as AddressInfo).port}/ws`;
  async function client() {
    const ws = new WebSocket(relayUrl, { origin: 'http://localhost:3000' });
    const messages: RelayMessage[] = [];
    ws.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
    await once(ws, 'open');
    cleanups.push(() => { ws.terminate(); });
    return { ws, messages };
  }
  return { upstream, relay, client, logs, connections: () => connections, relayUrl };
}
async function begin(client: Awaited<ReturnType<Awaited<ReturnType<typeof fixture>>['client']>>) {
  client.ws.send(JSON.stringify(start));
  await vi.waitFor(() => expect(client.messages[0]?.type).toBe('session.ready'));
  const ready = client.messages[0];
  if (ready?.type !== 'session.ready') throw new Error('Expected readiness');
  return ready.sessionId;
}

it('runs final transcript -> risk -> cached audio once and records usage without text', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'relay-live-cache-'));
  cleanups.push(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'audio'));
  await writeFile(join(directory, 'audio', 'SENSITIVE_REQUEST.hi-en.Poorvi.wav'), createMockWav());
  const http = vi.fn<typeof fetch>();
  const charactersBefore = gnaniUsage.ttsCharacters;
  const f = await fixture({ ttsProvider: new GnaniTtsProvider({ directory, apiKey: 'synthetic-live-key', fetch: http }) });
  const client = await f.client();
  const id = await begin(client);
  client.ws.send(Buffer.alloc(1024));
  await vi.waitFor(() => expect(client.messages.some((message) => message.type === 'warning.audio')).toBe(true));
  client.ws.send(Buffer.alloc(1024));
  await vi.waitFor(() => expect(client.messages.filter((message) => message.type === 'transcript.final')).toHaveLength(2));
  const types = client.messages.map((message) => message.type);
  expect(types.indexOf('transcript.final')).toBeLessThan(types.indexOf('risk.update'));
  expect(types.indexOf('risk.update')).toBeLessThan(types.indexOf('warning.audio'));
  expect(client.messages.filter((message) => message.type === 'warning.audio')).toHaveLength(1);
  expect(http).not.toHaveBeenCalled();
  expect(gnaniUsage.ttsCharacters).toBe(charactersBefore);
  expect(f.logs.some((entry) => entry.stage === 'tts.cache')).toBe(true);
  client.ws.send(JSON.stringify({ type: 'session.end', sessionId: id, reason: 'user' }));
  await vi.waitFor(() => expect(client.messages.at(-1)?.type).toBe('session.end'));
  expect(f.logs).toContainEqual(expect.objectContaining({ stage: 'gnani.usage', audioSeconds: expect.any(Number), ttsCharacters: expect.any(Number) }));
  expect(f.logs.every((entry) => !('text' in entry))).toBe(true);
  await vi.waitFor(() => expect(f.upstream.clients.size).toBe(0));
});

it('keeps transcript and risk flowing after a TTS failure', async () => {
  const synthesize = vi.fn(async () => { throw new Error('synthetic TTS failure'); });
  const f = await fixture({ ttsProvider: { synthesize } });
  const client = await f.client();
  await begin(client);
  client.ws.send(Buffer.alloc(1024));
  client.ws.send(Buffer.alloc(1024));
  await vi.waitFor(() => expect(client.messages.filter((message) => message.type === 'transcript.final')).toHaveLength(2));
  expect(client.messages.filter((message) => message.type === 'risk.update')).toHaveLength(2);
  expect(client.messages).toContainEqual(expect.objectContaining({ type: 'session.error', recoverable: true }));
  expect(client.messages.some((message) => message.type === 'session.end')).toBe(false);
  expect(synthesize).toHaveBeenCalledTimes(1);
});

it('reports STT errors without exposing upstream contents', async () => {
  const f = await fixture();
  const client = await f.client();
  await begin(client);
  for (const socket of f.upstream.clients) socket.send(JSON.stringify({ type: 'error', message: 'synthetic-live-key' }));
  await vi.waitFor(() => expect(client.messages).toContainEqual(expect.objectContaining({ type: 'session.error', recoverable: true })));
  expect(JSON.stringify(client.messages)).not.toContain('synthetic-live-key');
});

it('closes upstream on browser disconnect and frees its concurrent slot', async () => {
  const f = await fixture({ maxConcurrentSessions: 1 });
  const first = await f.client();
  await begin(first);
  first.ws.send(Buffer.alloc(1024));
  first.ws.close();
  await once(first.ws, 'close');
  await vi.waitFor(() => expect(f.upstream.clients.size).toBe(0));
  const second = await f.client();
  await begin(second);
  expect(f.connections()).toBe(2);
});

it('enforces session expiry and closes the one upstream stream', async () => {
  const f = await fixture({ maxSessionSeconds: 0.2 });
  const client = await f.client();
  await begin(client);
  await vi.waitFor(() => expect(client.messages).toContainEqual(expect.objectContaining({ type: 'session.end', reason: 'timeout' })));
  await vi.waitFor(() => expect(f.upstream.clients.size).toBe(0));
});

it('enforces a process-wide concurrent cap without opening an extra STT stream', async () => {
  const f = await fixture({ maxConcurrentSessions: 1 });
  const first = await f.client();
  await begin(first);
  const otherRelay = await fixture({ maxConcurrentSessions: 1 });
  const second = await otherRelay.client();
  second.ws.send(JSON.stringify(start));
  await vi.waitFor(() => expect(second.messages).toContainEqual(expect.objectContaining({ type: 'session.error', code: 'UPSTREAM_UNAVAILABLE' })));
  expect(f.connections()).toBe(1);
  expect(otherRelay.connections()).toBe(0);
});

it('rejects upgrades when killed and ends an already-active session when killed', async () => {
  let disabled = false;
  const f = await fixture({ disabled: () => disabled });
  const client = await f.client();
  await begin(client);
  disabled = true;
  await vi.waitFor(() => expect(client.messages).toContainEqual(expect.objectContaining({ type: 'session.end', reason: 'error' })));
  await vi.waitFor(() => expect(f.upstream.clients.size).toBe(0));
  const blocked = new WebSocket(f.relayUrl, { origin: 'http://localhost:3000' });
  blocked.on('error', () => {});
  const response = await new Promise<number>((resolve) => blocked.on('unexpected-response', (_request, reply) => {
    reply.resume(); resolve(reply.statusCode!); blocked.terminate();
  }));
  expect(response).toBe(403);
});

it('rejects TTS-only language and live scenarios without creating a provider', async () => {
  const f = await fixture();
  const client = await f.client();
  client.ws.send(JSON.stringify({ ...start, languageCode: 'hi-en' }));
  client.ws.send(JSON.stringify({ ...start, scenario: 'kyc-otp' }));
  await vi.waitFor(() => expect(client.messages.filter((message) => message.type === 'session.error')).toHaveLength(2));
  expect(f.connections()).toBe(0);
  expect(GNANI_STT_LANGUAGES['en-IN'].script).toBe('Latin');
  expect(GNANI_STT_LANGUAGES['hi-IN'].script).toContain('Devanagari');
});

it('keeps process usage counters nonnegative and rejects unknown runtime modes', () => {
  expect(gnaniUsage.audioSeconds).toBeGreaterThanOrEqual(0);
  expect(gnaniUsage.ttsCharacters).toBeGreaterThanOrEqual(0);
  vi.stubEnv('RELAY_MODE', 'invalid');
  expect(() => createRelay()).toThrow('Invalid RELAY_MODE');
});

it('does not hold later live transcripts or risks while warning synthesis is pending', async () => {
  let resolveAudio!: (audio: Uint8Array) => void;
  const synthesize = vi.fn(() => new Promise<Uint8Array>((resolve) => { resolveAudio = resolve; }));
  const f = await fixture({ ttsProvider: { synthesize } });
  const client = await f.client();
  await begin(client);
  client.ws.send(Buffer.alloc(1024));
  client.ws.send(Buffer.alloc(1024));
  await vi.waitFor(() => expect(client.messages.filter((message) => message.type === 'transcript.final')).toHaveLength(2));
  expect(client.messages.filter((message) => message.type === 'risk.update')).toHaveLength(2);
  expect(client.messages.some((message) => message.type === 'warning.audio')).toBe(false);
  resolveAudio(createMockWav());
  await vi.waitFor(() => expect(client.messages.filter((message) => message.type === 'warning.audio')).toHaveLength(1));
  expect(synthesize).toHaveBeenCalledTimes(1);
});

it('refuses duplicate starts without creating another upstream stream', async () => {
  const f = await fixture();
  const client = await f.client();
  await begin(client);
  client.ws.send(JSON.stringify(start));
  await vi.waitFor(() => expect(client.messages).toContainEqual(expect.objectContaining({ type: 'session.error', code: 'INVALID_MESSAGE' })));
  expect(f.connections()).toBe(1);
});
