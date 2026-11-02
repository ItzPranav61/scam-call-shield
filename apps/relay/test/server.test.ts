import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RelayMessage } from '@scamcall/protocol';
import { createMockRelay } from '../src/server.js';
import { AUDIO, MOCK_WARNING_CODE, relayMessageSchema } from '../src/validation.js';
import { MockTtsProvider, MOCK_VOICE } from '../src/providers/mock.js';
import { GnaniSttProvider, GnaniTtsProvider } from '../src/providers/gnani.js';
import { WARNING_CODES } from '@scamcall/detector';
import { WarningAudioCache } from '../src/warning-cache.js';

const start = { type: 'session.start', version: 1, consent: true, languageCode: 'en-IN', audio: AUDIO };
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.unstubAllEnvs();
});
async function fixture(options: Parameters<typeof createMockRelay>[0] = {}) {
  const logs: object[] = [];
  const relay = createMockRelay({ log: (entry) => logs.push(entry), ...options });
  cleanups.push(relay.close);
  relay.server.listen(0, '127.0.0.1');
  await once(relay.server, 'listening');
  const port = (relay.server.address() as AddressInfo).port;
  return { base: `http://127.0.0.1:${port}`, url: `ws://127.0.0.1:${port}/ws`, logs };
}
async function connect(url: string) {
  const ws = new WebSocket(url, { origin: 'http://localhost:3000' });
  const all: RelayMessage[] = [];
  const pending: RelayMessage[] = [];
  let waiter: ((message: RelayMessage) => void) | undefined;
  ws.on('message', (data) => {
    const message = relayMessageSchema.parse(JSON.parse(data.toString()));
    all.push(message);
    if (waiter) { const resolve = waiter; waiter = undefined; resolve(message); }
    else pending.push(message);
  });
  await once(ws, 'open');
  return { ws, all,
    next: () => new Promise<RelayMessage>((resolve) => {
      const queued = pending.shift();
      if (queued) resolve(queued); else waiter = resolve;
    }),
  };
}
describe('local mock relay', () => {
  it('serves health only on GET /health', async () => {
    const { base } = await fixture();
    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, mode: 'mock' });
    expect((await fetch(`${base}/health`, { method: 'POST' })).status).toBe(405);
    expect((await fetch(`${base}/other`)).status).toBe(404);
  });
  it('delivers ordered mock transcripts, escalating risks, and exactly one valid WAV warning', async () => {
    const { url, logs } = await fixture();
    const client = await connect(url);
    client.ws.send(JSON.stringify(start));
    let message = await client.next();
    expect(message.type).toBe('session.ready');
    const sessionId = message.type === 'session.ready' ? message.sessionId : '';
    while (message.type !== 'warning.audio') message = await client.next();
    expect(client.all.map((event) => event.type)).toEqual([
      'session.ready', 'transcript.final', 'risk.update', 'transcript.final', 'risk.update',
      'transcript.final', 'risk.update', 'warning', 'warning.audio',
    ]);
    const levels = client.all.filter((event) => event.type === 'risk.update').map((event) => event.assessment.level);
    expect(levels).toEqual(['safe', 'safe', 'danger']);
    const knownSegments = new Set<string>();
    for (const event of client.all) {
      if ('sessionId' in event) expect(event.sessionId).toBe(sessionId);
      if (event.type === 'transcript.final') knownSegments.add(event.segment.segmentId);
      if (event.type === 'risk.update') for (const indicator of event.assessment.indicators) {
        for (const id of indicator.segmentIds) expect(knownSegments.has(id)).toBe(true);
      }
    }
    const wav = Buffer.from(message.audioBase64, 'base64');
    expect(message.warningCode).toBe(WARNING_CODES.sensitive);
    expect(message.language).toBe('en-IN');
    expect(message.mimeType).toBe('audio/wav');
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(16000);
    expect(wav.readUInt32LE(28)).toBe(32000);
    expect(wav.readUInt16LE(32)).toBe(2);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.toString('ascii', 36, 40)).toBe('data');
    expect(wav.readUInt32LE(40)).toBe(32000);
    client.ws.send(JSON.stringify({ type: 'session.end', sessionId, reason: 'user' }));
    expect(await client.next()).toEqual({ type: 'session.end', sessionId, reason: 'user' });
    expect(client.all.filter((event) => event.type === 'warning.audio')).toHaveLength(1);
    expect(logs.every((entry) => !('text' in entry))).toBe(true);
    expect(logs.every((entry) => 'latencyMs' in entry && 'sessionId' in entry)).toBe(true);
  });
  it('keeps the socket usable after invalid JSON, binary frames, and duplicate starts', async () => {
    const { url } = await fixture();
    const client = await connect(url);
    for (const invalid of ['{', JSON.stringify({ ...start, consent: false }),
      'x'.repeat(16 * 1024 + 1), Buffer.alloc(1024), Buffer.alloc(3)]) {
      client.ws.send(invalid);
      expect(await client.next()).toMatchObject({ type: 'session.error', sessionId: null,
        code: 'INVALID_MESSAGE', recoverable: true });
    }
    client.ws.send(JSON.stringify(start));
    const ready = await client.next();
    if (ready.type !== 'session.ready') throw new Error('Expected readiness');
    for (const invalid of [JSON.stringify(start), Buffer.alloc(3), Buffer.alloc(1022),
      JSON.stringify({ type: 'session.end', sessionId: 'wrong', reason: 'user' })]) {
      client.ws.send(invalid);
      expect(await client.next()).toMatchObject({ type: 'session.error', sessionId: ready.sessionId,
        code: 'INVALID_MESSAGE', recoverable: true });
    }
    client.ws.send(Buffer.alloc(1024));
    client.ws.send(JSON.stringify({ type: 'session.end', sessionId: ready.sessionId, reason: 'user' }));
    expect((await client.next()).type).toBe('session.end');
    client.ws.send(Buffer.alloc(1024));
    expect((await client.next()).type).toBe('session.error');
    client.ws.send(JSON.stringify(start));
    expect((await client.next()).type).toBe('session.error');
  });
  it('expires sessions and cancels scripted output and queued audio', async () => {
    const { url } = await fixture({ maxSessionSeconds: 0.05 });
    const client = await connect(url);
    client.ws.send(JSON.stringify(start));
    expect((await client.next()).type).toBe('session.ready');
    expect(await client.next()).toMatchObject({ type: 'session.error', code: 'SESSION_EXPIRED', recoverable: false });
    expect(await client.next()).toMatchObject({ type: 'session.end', reason: 'timeout' });
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(client.all.some((event) => event.type === 'transcript.final')).toBe(false);
  });
  it('rejects new upgrades with kill switch, wrong paths, and disallowed browser origins', async () => {
    const { url } = await fixture({ disabled: () => true });
    for (const [target, origin, expected] of [[url, undefined, 403], [url.replace('/ws', '/bad'), undefined, 404]] as const) {
      const socket = new WebSocket(target, { origin: origin ?? 'http://localhost:3000' });
      const response = await new Promise<number>((resolve, reject) => {
        socket.once('unexpected-response', (_request, result) => { result.resume(); resolve(result.statusCode ?? 0); socket.terminate(); });
        socket.on('error', () => {});
        socket.once('open', () => reject(new Error('Unexpected accepted upgrade')));
      });
      expect(response).toBe(expected);
    }
    const enabled = await fixture();
    const socket = new WebSocket(enabled.url, { origin: 'https://untrusted.invalid' });
    socket.on('error', () => {});
    const [_, response] = await once(socket, 'unexpected-response');
    expect(response.statusCode).toBe(403);
    response.resume();
    socket.terminate();
  });
  it('checks kill switch again on session.start for an already-open connection', async () => {
    let disabled = false;
    const { url } = await fixture({ disabled: () => disabled });
    const client = await connect(url);
    disabled = true;
    client.ws.send(JSON.stringify(start));
    expect(await client.next()).toMatchObject({ type: 'session.error', sessionId: null, code: 'UPSTREAM_UNAVAILABLE' });
  });
  it('honors MAX_SESSION_SECONDS and RELAY_DISABLED environment variables', async () => {
    vi.stubEnv('MAX_SESSION_SECONDS', '0.01');
    const { url } = await fixture();
    const client = await connect(url);
    client.ws.send(JSON.stringify(start));
    await client.next();
    expect(await client.next()).toMatchObject({ type: 'session.error', code: 'SESSION_EXPIRED' });
    expect(await client.next()).toMatchObject({ type: 'session.end', reason: 'timeout' });
    vi.stubEnv('RELAY_DISABLED', '1');
    const blocked = new WebSocket(url, { origin: 'http://localhost:3000' });
    blocked.on('error', () => {});
    const [_, response] = await once(blocked, 'unexpected-response');
    expect(response.statusCode).toBe(403);
    response.resume();
    blocked.terminate();
    expect(() => createMockRelay({ maxSessionSeconds: 0 })).toThrow('Invalid MAX_SESSION_SECONDS');
  });
  it('logs transcript text only when DEBUG_TRANSCRIPTS=1', async () => {
    vi.stubEnv('DEBUG_TRANSCRIPTS', '1');
    const { url, logs } = await fixture();
    const client = await connect(url);
    client.ws.send(JSON.stringify(start));
    const ready = await client.next();
    if (ready.type !== 'session.ready') throw new Error('Expected readiness');
    expect((await client.next()).type).toBe('transcript.final');
    expect(logs.some((entry) => 'text' in entry)).toBe(true);
    client.ws.send(JSON.stringify({ type: 'session.end', sessionId: ready.sessionId, reason: 'user' }));
  });
  it('stops scripted transcripts when the client disconnects', async () => {
    const { url, logs } = await fixture();
    const client = await connect(url);
    client.ws.send(JSON.stringify(start));
    expect((await client.next()).type).toBe('session.ready');
    client.ws.close();
    await once(client.ws, 'close');
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(logs.some((entry) => 'stage' in entry && entry.stage === 'transcript.mock')).toBe(false);
  });
});

it('Gnani implementations throw without performing network calls', async () => {
  const stt = new GnaniSttProvider();
  expect(() => stt.start({ language: 'en-IN', audio: AUDIO }, () => {})).toThrow('not implemented');
  expect(() => stt.write(new Uint8Array(1024))).toThrow('not implemented');
  expect(() => stt.stop()).toThrow('not implemented');
  vi.stubEnv('GNANI_API_KEY', '');
  await expect(new GnaniTtsProvider().synthesize(MOCK_WARNING_CODE, 'en-IN', MOCK_VOICE)).rejects.toThrow('GNANI_API_KEY');
});
it('mock TTS cache includes warning code, language and voice and protects cached bytes', async () => {
  const provider = new MockTtsProvider();
  const synthesize = vi.spyOn(provider, 'synthesize');
  const tts = new WarningAudioCache(provider);
  const original = await tts.get(MOCK_WARNING_CODE, 'en-IN', MOCK_VOICE);
  original[0] = 0;
  const cached = await tts.get(MOCK_WARNING_CODE, 'en-IN', MOCK_VOICE);
  expect(Buffer.from(cached).toString('ascii', 0, 4)).toBe('RIFF');
  expect(synthesize).toHaveBeenCalledTimes(1);
  expect(await tts.get(MOCK_WARNING_CODE, 'mr-IN', MOCK_VOICE)).toEqual(cached);
  await tts.get(MOCK_WARNING_CODE, 'mr-IN', 'another-mock-tone');
  await tts.get(WARNING_CODES.sensitive, 'en-IN', MOCK_VOICE);
  expect(synthesize).toHaveBeenCalledTimes(4);
});
