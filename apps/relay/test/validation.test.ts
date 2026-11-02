import { describe, expect, it } from 'vitest';
import { AUDIO, browserMessageSchema, MOCK_WARNING_CODE, relayMessageSchema } from '../src/validation.js';
import { createMockWav } from '../src/providers/mock.js';
import { WARNING_CODES } from '@scamcall/detector';

const start = { type: 'session.start', version: 1, consent: true, languageCode: 'en-IN', audio: AUDIO };
describe('strict protocol validators', () => {
  it('accepts existing start/end messages and the mock language allowlist', () => {
    for (const languageCode of ['en-IN', 'hi-IN', 'mr-IN']) {
      expect(browserMessageSchema.safeParse({ ...start, languageCode }).success).toBe(true);
    }
    expect(browserMessageSchema.safeParse({ type: 'session.end', sessionId: 'abc', reason: 'user' }).success).toBe(true);
    expect(browserMessageSchema.safeParse({ ...start, scenario: 'kyc-otp' }).success).toBe(true);
  });
  it.each([
    null, [], {}, { ...start, type: 'start' }, { ...start, version: 2 },
    { ...start, consent: false }, { ...start, languageCode: 'unknown' },
    { ...start, extra: true }, { ...start, audio: { ...AUDIO, frameBytes: 512 } },
    { ...start, scenario: '' }, { ...start, scenario: 1 }, { ...start, scenario: null },
    { ...start, scenario: 'x'.repeat(129) },
    { ...start, audio: { ...AUDIO, channels: 2 } },
    { ...start, audio: { ...AUDIO, sampleRate: 8000 } },
    { ...start, audio: { ...AUDIO, encoding: 'wav' } },
    { type: 'audio.chunk', data: [] },
    { type: 'session.end', sessionId: '', reason: 'user' },
    { type: 'session.end', sessionId: 'x'.repeat(129), reason: 'user' },
    { type: 'session.end', sessionId: 'abc', reason: 'timeout' },
  ])('rejects malformed browser input %#', (message) => {
    expect(browserMessageSchema.safeParse(message).success).toBe(false);
  });
  it('accepts every existing relay event and the additive warning.audio event', () => {
    const segment = { segmentId: 'seg', text: 'Synthetic test', languageCode: 'en-IN' };
    for (const message of [
      { type: 'session.ready', sessionId: 'abc', audio: AUDIO },
      { type: 'transcript.partial', sessionId: 'abc', segment },
      { type: 'transcript.final', sessionId: 'abc', segment },
      { type: 'risk.update', sessionId: 'abc', assessment: { level: 'safe', indicators: [], summary: 'Mock only' } },
      { type: 'warning', sessionId: 'abc', code: MOCK_WARNING_CODE, message: 'Mock only' },
      { type: 'session.error', sessionId: null, code: 'INVALID_MESSAGE', message: 'Invalid', recoverable: true },
      { type: 'session.end', sessionId: 'abc', reason: 'user' },
      { type: 'warning.audio', warningCode: MOCK_WARNING_CODE, language: 'en-IN', mimeType: 'audio/wav',
        audioBase64: createMockWav().toString('base64') },
    ]) expect(relayMessageSchema.safeParse(message).success).toBe(true);
  });
  it('rejects old error shapes, wrong risks, invalid audio, and extra fields', () => {
    expect(relayMessageSchema.safeParse({ type: 'error', fatal: false }).success).toBe(false);
    expect(relayMessageSchema.safeParse({ type: 'risk.update', sessionId: 'abc',
      assessment: { level: 'high', indicators: [], summary: 'Mock' } }).success).toBe(false);
    const audio = { type: 'warning.audio', warningCode: MOCK_WARNING_CODE, language: 'en-IN',
      mimeType: 'audio/wav', audioBase64: createMockWav().toString('base64') };
    for (const invalid of [{ ...audio, audioBase64: '??==' }, { ...audio, mimeType: 'audio/mpeg' },
      { ...audio, audioBase64: Buffer.from('invalid WAV').toString('base64') },
      { ...audio, warningCode: 'unknown' }, { ...audio, sessionId: 'extra' }]) {
      expect(relayMessageSchema.safeParse(invalid).success).toBe(false);
    }
  });
  it('rejects WAVs with the wrong sample rate, channels, or bit depth', () => {
    for (const [offset, value] of [[24, 8000], [22, 2], [34, 8]] as const) {
      const wav = createMockWav();
      if (offset === 24) wav.writeUInt32LE(value, offset); else wav.writeUInt16LE(value, offset);
      expect(relayMessageSchema.safeParse({ type: 'warning.audio', warningCode: MOCK_WARNING_CODE,
        language: 'en-IN', mimeType: 'audio/wav', audioBase64: wav.toString('base64') }).success).toBe(false);
    }
  });
  it('accepts all detector warning codes without changing the wire shape', () => {
    for (const code of Object.values(WARNING_CODES)) {
      expect(relayMessageSchema.safeParse({ type: 'warning', sessionId: 'abc', code, message: 'Rules indicator' }).success).toBe(true);
      expect(relayMessageSchema.safeParse({ type: 'warning.audio', warningCode: code, language: 'en-IN',
        mimeType: 'audio/wav', audioBase64: createMockWav().toString('base64') }).success).toBe(true);
    }
  });
});

it.each([0, 0xffffffff])('accepts streamed WAV placeholders %s without changing the wire shape', (size) => {
  const wav = createMockWav();
  wav.writeUInt32LE(size, 4);
  wav.writeUInt32LE(size, 40);
  expect(relayMessageSchema.safeParse({ type: 'warning.audio', warningCode: MOCK_WARNING_CODE,
    language: 'hi-IN', mimeType: 'audio/wav', audioBase64: wav.toString('base64') }).success).toBe(true);
});

it('accepts a padded extra chunk but rejects missing sample data', () => {
  const original = createMockWav();
  const junk = Buffer.from([74, 85, 78, 75, 3, 0, 0, 0, 1, 2, 3, 0]);
  const wav = Buffer.concat([original.subarray(0, 12), junk, original.subarray(12)]);
  wav.writeUInt32LE(wav.length - 8, 4);
  const message = { type: 'warning.audio', warningCode: MOCK_WARNING_CODE,
    language: 'hi-IN', mimeType: 'audio/wav', audioBase64: wav.toString('base64') };
  expect(relayMessageSchema.safeParse(message).success).toBe(true);
  const empty = original.subarray(0, 44);
  empty.writeUInt32LE(0xffffffff, 4);
  empty.writeUInt32LE(0xffffffff, 40);
  expect(relayMessageSchema.safeParse({ ...message, audioBase64: empty.toString('base64') }).success).toBe(false);
});

function sizedWav(bytes: number): Buffer {
  const wav = Buffer.alloc(bytes);
  createMockWav().copy(wav, 0, 0, 44);
  wav.writeUInt32LE(bytes - 8, 4);
  wav.writeUInt32LE(bytes - 44, 40);
  return wav;
}

it('accepts generated Marathi audio above the former base64 limit', () => {
  const wav = sizedWav(97324);
  wav.writeUInt32LE(0xffffffff, 4);
  wav.writeUInt32LE(0xffffffff, 40);
  const audioBase64 = wav.toString('base64');
  expect(audioBase64).toHaveLength(129768);
  expect(relayMessageSchema.safeParse({ type: 'warning.audio', warningCode: 'SCAM_PATTERN',
    language: 'mr-IN', mimeType: 'audio/wav', audioBase64 }).success).toBe(true);
});

it('retains a bounded base64 limit with an inclusive boundary', () => {
  const message = { type: 'warning.audio', warningCode: 'SCAM_PATTERN', language: 'mr-IN', mimeType: 'audio/wav' };
  const boundary = sizedWav(192000).toString('base64');
  expect(boundary).toHaveLength(256000);
  expect(relayMessageSchema.safeParse({ ...message, audioBase64: boundary }).success).toBe(true);
  const oversized = relayMessageSchema.safeParse({ ...message, audioBase64: sizedWav(192002).toString('base64') });
  expect(oversized.success).toBe(false);
  if (!oversized.success) expect(oversized.error.issues).toContainEqual(expect.objectContaining({ code: 'too_big', path: ['audioBase64'] }));
});
