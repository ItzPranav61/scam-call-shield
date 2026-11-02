import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { analyze, createDetectorState, WARNING_CODES, type RiskLevel } from '@scamcall/detector';
import type { RelayMessage } from '@scamcall/protocol';
import { WebSocket } from 'ws';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRelay } from '../src/server.js';
import { AUDIO, relayMessageSchema } from '../src/validation.js';
import { createMockWav, MockSttProvider, MOCK_VOICE } from '../src/providers/mock.js';

const start = { type: 'session.start', version: 1, consent: true, languageCode: 'en-IN', audio: AUDIO };
const cleanups: (() => Promise<void>)[] = [];
beforeEach(() => { vi.stubEnv('DEBUG_TRANSCRIPTS', '0'); vi.stubEnv('DEMO_MODE', '0'); });
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
async function fixture(options: Parameters<typeof createMockRelay>[0] = {}) {
  const logs: { stage: string; sessionId: string | null; latencyMs: number; text?: string }[] = [];
  const relay = createMockRelay({ log: (event) => logs.push(event), ...options });
  cleanups.push(relay.close);
  relay.server.listen(0, '127.0.0.1');
  await once(relay.server, 'listening');
  return { url: `ws://127.0.0.1:${(relay.server.address() as AddressInfo).port}/ws`, logs };
}
async function connect(url: string) {
  const ws = new WebSocket(url, { origin: 'http://localhost:3000' });
  const messages: RelayMessage[] = [];
  const queue: RelayMessage[] = [];
  let waiter: ((message: RelayMessage) => void) | undefined;
  ws.on('message', (data) => {
    const message = relayMessageSchema.parse(JSON.parse(data.toString()));
    messages.push(message);
    if (waiter) { const resolve = waiter; waiter = undefined; resolve(message); }
    else queue.push(message);
  });
  await once(ws, 'open');
  return { ws, messages, next: () => new Promise<RelayMessage>((resolve) => {
    const first = queue.shift();
    if (first) resolve(first); else waiter = resolve;
  }) };
}
type Client = Awaited<ReturnType<typeof connect>>;
interface Scenario { segments: string[]; expectedFinalLevel: RiskLevel; expectedWarningCode: string | null }
function readScenario(name: string): Scenario {
  return JSON.parse(readFileSync(new URL(`../../../data/scenarios/${name}.json`, import.meta.url), 'utf8')) as Scenario;
}
async function finish(client: Client, sessionId: string, segmentCount: number) {
  let seen = 0;
  while (seen < segmentCount) if ((await client.next()).type === 'transcript.final') seen++;
  // Server processes each segment synchronously. Drain all ordered sends through session.end.
  client.ws.send(JSON.stringify({ type: 'session.end', sessionId, reason: 'user' }));
  while ((await client.next()).type !== 'session.end') { /* Drain pending risk/audio messages. */ }
  client.ws.close();
  await once(client.ws, 'close');
  return client.messages;
}
async function replay(url: string, name: string, languageCode = 'en-IN') {
  const client = await connect(url);
  client.ws.send(JSON.stringify({ ...start, languageCode, scenario: name }));
  const ready = await client.next();
  if (ready.type !== 'session.ready') throw new Error('Scenario failed to start');
  return finish(client, ready.sessionId, readScenario(name).segments.length);
}
const risks = (messages: RelayMessage[]) => messages.filter((event) => event.type === 'risk.update');
const audio = (messages: RelayMessage[]) => messages.filter((event) => event.type === 'warning.audio');

describe('scenario -> detector -> risk -> cached warning audio', () => {
  it.each(['kyc-otp', 'digital-arrest', 'refund-upi', 'genuine-bank-alert', 'borderline-delivery'])(
    'runs %s with real detector state and unchanged message shapes', async (name) => {
      const scenario = readScenario(name);
      const { url, logs } = await fixture();
      const messages = await replay(url, name);
      expect(messages.filter((event) => event.type === 'transcript.final').map((event) => event.segment.text)).toEqual(scenario.segments);
      const updates = risks(messages);
      expect(updates.at(-1)?.assessment.level).toBe(scenario.expectedFinalLevel);
      // Includes first publication, then only changed level/score pairs (score stays internal).
      let state = createDetectorState();
      const expected: { level: RiskLevel; score: number }[] = [];
      for (const segment of scenario.segments) {
        const step = analyze(segment, state);
        state = step.state;
        const previous = expected.at(-1);
        if (!previous || previous.level !== step.result.level || previous.score !== step.result.score) {
          expected.push({ level: step.result.level, score: step.result.score });
        }
      }
      expect(updates.map((event) => event.assessment.level)).toEqual(expected.map((event) => event.level));
      const rank = { safe: 0, caution: 1, danger: 2 };
      let previousRank = 0;
      const knownSegments = new Set<string>();
      for (const message of messages) {
        if (message.type === 'transcript.final') knownSegments.add(message.segment.segmentId);
        if (message.type === 'risk.update') {
          expect(rank[message.assessment.level]).toBeGreaterThanOrEqual(previousRank);
          previousRank = rank[message.assessment.level];
          for (const indicator of message.assessment.indicators) for (const id of indicator.segmentIds) expect(knownSegments.has(id)).toBe(true);
        }
        if (message.type === 'warning.audio') {
          const index = messages.indexOf(message);
          expect(messages.slice(0, index).some((event) => event.type === 'risk.update' && event.assessment.level === 'danger')).toBe(true);
          const wav = Buffer.from(message.audioBase64, 'base64');
          expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
          expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
          expect(wav.readUInt32LE(24)).toBe(16000);
          expect(wav.readUInt16LE(22)).toBe(1);
          expect(wav.readUInt16LE(34)).toBe(16);
        }
      }
      expect(audio(messages).map((event) => event.warningCode)).toEqual(scenario.expectedWarningCode ? [scenario.expectedWarningCode] : []);
      if (name === 'genuine-bank-alert' || name === 'borderline-delivery') {
        expect(updates.every((event) => event.assessment.level !== 'danger')).toBe(true);
        expect(audio(messages)).toHaveLength(0);
      }
      expect(logs.filter((event) => event.stage === 'stt->detector')).toHaveLength(scenario.segments.length);
      expect(logs.filter((event) => event.stage === 'total')).toHaveLength(scenario.segments.length);
      if (scenario.expectedWarningCode) expect(logs.some((event) => event.stage === 'detector->tts')).toBe(true);
      expect(logs.every((event) => !('text' in event) && event.latencyMs >= 0)).toBe(true);
    });

  it('second session uses cached audio with zero additional TtsProvider calls', async () => {
    const synthesize = vi.fn(async () => createMockWav());
    const { url } = await fixture({ ttsProvider: { synthesize } });
    const first = await replay(url, 'kyc-otp');
    expect(synthesize).toHaveBeenCalledExactlyOnceWith(WARNING_CODES.sensitive, 'en-IN', MOCK_VOICE);
    synthesize.mockClear();
    const second = await replay(url, 'kyc-otp');
    expect(synthesize).not.toHaveBeenCalled();
    expect(audio(first)[0]?.audioBase64).toBe(audio(second)[0]?.audioBase64);
    expect(risks(second)[0]?.assessment.level).toBe('safe');
    const benign = await replay(url, 'genuine-bank-alert');
    expect(risks(benign).at(-1)?.assessment.level).toBe('safe');
    expect(audio(benign)).toHaveLength(0);
  });

  it('cache separates languages', async () => {
    const synthesize = vi.fn(async () => createMockWav());
    const { url } = await fixture({ ttsProvider: { synthesize } });
    await replay(url, 'kyc-otp', 'en-IN');
    const hindi = await replay(url, 'kyc-otp', 'hi-IN');
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(audio(hindi)[0]?.language).toBe('hi-IN');
  });

  it('detector exception is sanitized, recoverable, and does not stop later segments', async () => {
    const detector = vi.fn(analyze).mockImplementationOnce(() => { throw new Error('private-exception-content'); });
    const { url, logs } = await fixture({ analyze: detector });
    const messages = await replay(url, 'kyc-otp');
    expect(detector).toHaveBeenCalledTimes(3);
    expect(messages.filter((event) => event.type === 'session.error')).toEqual([
      expect.objectContaining({ code: 'INTERNAL_ERROR', recoverable: true }),
    ]);
    expect(messages.filter((event) => event.type === 'transcript.final')).toHaveLength(3);
    expect(risks(messages).at(-1)?.assessment.level).toBe('danger');
    expect(audio(messages)).toHaveLength(1);
    expect(JSON.stringify([...messages, ...logs])).not.toContain('private-exception-content');
    expect(logs.some((event) => event.stage === 'detector.error')).toBe(true);
    expect(messages.at(-1)).toMatchObject({ type: 'session.end', reason: 'user' });
  });

  it('rejects unknown/traversal names without starting, then accepts a valid start', async () => {
    const { url } = await fixture();
    const client = await connect(url);
    for (const scenario of ['../.env', 'unknown', '%2e%2e%2f.env', 'constructor', 'toString']) {
      client.ws.send(JSON.stringify({ ...start, scenario }));
      expect(await client.next()).toMatchObject({ type: 'session.error', sessionId: null, code: 'INVALID_MESSAGE', recoverable: true });
    }
    expect(client.messages.some((event) => event.type === 'session.ready')).toBe(false);
    client.ws.send(JSON.stringify({ ...start, scenario: 'genuine-bank-alert' }));
    const ready = await client.next();
    if (ready.type !== 'session.ready') throw new Error('Valid retry failed');
    await finish(client, ready.sessionId, readScenario('genuine-bank-alert').segments.length);
  });

  it('ignores binary input in scenario sessions, including odd-length input', async () => {
    const write = vi.spyOn(MockSttProvider.prototype, 'write');
    const { url } = await fixture();
    const client = await connect(url);
    client.ws.send(JSON.stringify({ ...start, scenario: 'genuine-bank-alert' }));
    const ready = await client.next();
    if (ready.type !== 'session.ready') throw new Error('Expected readiness');
    for (const length of [0, 1, 3, 1024, 2048]) client.ws.send(Buffer.alloc(length));
    const messages = await finish(client, ready.sessionId, readScenario('genuine-bank-alert').segments.length);
    expect(write).not.toHaveBeenCalled();
    expect(messages.some((event) => event.type === 'session.error')).toBe(false);
    expect(audio(messages)).toHaveLength(0);
  });

  it('requires mock provider or explicit DEMO_MODE=1; demo replay never starts the non-mock provider', async () => {
    const provider = { start: vi.fn(), write: vi.fn(), stop: vi.fn() };
    const { url } = await fixture({ createSttProvider: () => provider });
    const client = await connect(url);
    client.ws.send(JSON.stringify({ ...start, scenario: 'genuine-bank-alert' }));
    expect(await client.next()).toMatchObject({ type: 'session.error', sessionId: null, code: 'INVALID_MESSAGE', recoverable: true });
    expect(provider.start).not.toHaveBeenCalled();
    vi.stubEnv('DEMO_MODE', 'true');
    client.ws.send(JSON.stringify({ ...start, scenario: 'genuine-bank-alert' }));
    expect((await client.next()).type).toBe('session.error');
    vi.stubEnv('DEMO_MODE', '1');
    client.ws.send(JSON.stringify({ ...start, scenario: 'genuine-bank-alert' }));
    const ready = await client.next();
    if (ready.type !== 'session.ready') throw new Error('Explicit demo failed');
    await finish(client, ready.sessionId, readScenario('genuine-bank-alert').segments.length);
    expect(provider.start).not.toHaveBeenCalled();
  });

  it('suppresses unchanged risks and repeated codes, while allowing a different new code', async () => {
    const script = ['OTP batao abhi.', 'OTP batao abhi.', 'AnyDesk install karo.'];
    const synthesize = vi.fn(async () => createMockWav());
    const { url } = await fixture({ createSttProvider: () => new MockSttProvider(script), ttsProvider: { synthesize } });
    const client = await connect(url);
    client.ws.send(JSON.stringify(start));
    const ready = await client.next();
    if (ready.type !== 'session.ready') throw new Error('Expected readiness');
    const messages = await finish(client, ready.sessionId, script.length);
    expect(risks(messages)).toHaveLength(1);
    expect(audio(messages).map((event) => event.warningCode)).toEqual([WARNING_CODES.sensitive, WARNING_CODES.remote]);
    expect(synthesize).toHaveBeenCalledTimes(2);
  });
});

// Deferred providers must never hold back transcript/risk processing.
it('delivers later transcripts and risks while audio is pending, then sends audio once', async () => {
  let resolveAudio!: (audio: Uint8Array) => void;
  const synthesize = vi.fn(() => new Promise<Uint8Array>((resolve) => { resolveAudio = resolve; }));
  const { url } = await fixture({ createSttProvider: () => new MockSttProvider(['OTP batao abhi.', 'OTP batao abhi.'], 20), ttsProvider: { synthesize } });
  const client = await connect(url);
  client.ws.send(JSON.stringify(start));
  const ready = await client.next();
  if (ready.type !== 'session.ready') throw new Error('Expected readiness');
  let transcripts = 0;
  while (transcripts < 2) if ((await client.next()).type === 'transcript.final') transcripts++;
  expect(risks(client.messages)).toHaveLength(1);
  expect(audio(client.messages)).toHaveLength(0);
  resolveAudio(createMockWav());
  while ((await client.next()).type !== 'warning.audio') { /* Await only the deferred audio. */ }
  expect(audio(client.messages)).toHaveLength(1);
  expect(synthesize).toHaveBeenCalledTimes(1);
  client.ws.send(JSON.stringify({ type: 'session.end', sessionId: ready.sessionId, reason: 'user' }));
  while ((await client.next()).type !== 'session.end') { /* Drain. */ }
  client.ws.close();
  await once(client.ws, 'close');
});

it.each(['upstream failure', 'TTS timeout', 'oversized audio'])('keeps monitoring after %s with a recoverable error and no audio', async (reason) => {
  const synthesize = vi.fn(async () => {
    if (reason === 'oversized audio') return new Uint8Array(128001);
    throw new Error(reason);
  });
  const { url } = await fixture({ createSttProvider: () => new MockSttProvider(['OTP batao abhi.', 'OTP batao abhi.'], 20), ttsProvider: { synthesize } });
  const client = await connect(url);
  client.ws.send(JSON.stringify(start));
  const ready = await client.next();
  if (ready.type !== 'session.ready') throw new Error('Expected readiness');
  const messages = await finish(client, ready.sessionId, 2);
  expect(messages.filter((message) => message.type === 'transcript.final')).toHaveLength(2);
  expect(messages.filter((message) => message.type === 'session.error')).toEqual([
    expect.objectContaining({ recoverable: true, code: 'INTERNAL_ERROR', message: 'Warning audio unavailable; analysis will continue.' }),
  ]);
  expect(audio(messages)).toHaveLength(0);
  expect(synthesize).toHaveBeenCalledTimes(1);
});

it('does not send late audio or errors after session end', async () => {
  let resolveAudio!: (audio: Uint8Array) => void;
  const { url } = await fixture({ createSttProvider: () => new MockSttProvider(['OTP batao abhi.'], 20),
    ttsProvider: { synthesize: () => new Promise<Uint8Array>((resolve) => { resolveAudio = resolve; }) } });
  const client = await connect(url);
  client.ws.send(JSON.stringify(start));
  const ready = await client.next();
  if (ready.type !== 'session.ready') throw new Error('Expected readiness');
  while ((await client.next()).type !== 'risk.update') { /* Wait for pending synthesis. */ }
  client.ws.send(JSON.stringify({ type: 'session.end', sessionId: ready.sessionId, reason: 'user' }));
  while ((await client.next()).type !== 'session.end') { /* Drain. */ }
  resolveAudio(createMockWav());
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(audio(client.messages)).toHaveLength(0);
  expect(client.messages.at(-1)?.type).toBe('session.end');
  client.ws.close();
  await once(client.ws, 'close');
});
