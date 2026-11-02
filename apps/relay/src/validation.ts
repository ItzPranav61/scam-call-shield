import { z } from 'zod';
import { validateWav } from './providers/gnani-tts.js';
import { WARNING_CODES } from '@scamcall/detector';
import type { AudioConfig, BrowserMessage, RelayMessage } from '@scamcall/protocol';

// Schemas mirror the existing protocol; bidirectional compile checks below prevent drift.
export const MOCK_WARNING_CODE = 'MOCK_SCAM_WARNING';
const warningCode = z.enum([MOCK_WARNING_CODE, ...Object.values(WARNING_CODES)]);
export const languages = ['en-IN', 'hi-IN', 'mr-IN'] as const;
const id = z.string().min(1).max(128);
const language = z.enum(languages);
const shortText = z.string().min(1).max(1000);
function isPcm16Wav(base64: string): boolean {
  try { validateWav(Buffer.from(base64, 'base64')); return true; }
  catch { return false; }
}
export const audioConfigSchema = z.strictObject({
  encoding: z.literal('pcm_s16le'), sampleRate: z.literal(16000),
  channels: z.literal(1), frameBytes: z.literal(1024),
});
export const browserMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('session.start'), version: z.literal(1),
    consent: z.literal(true), languageCode: language, audio: audioConfigSchema,
    scenario: z.string().min(1).max(128).optional() }),
  z.strictObject({ type: z.literal('session.end'), sessionId: id, reason: z.literal('user') }),
]).transform((message): BrowserMessage => {
  if (message.type !== 'session.start') return message;
  const { scenario, ...base } = message;
  return scenario === undefined ? base : { ...base, scenario };
});
const segment = z.strictObject({ segmentId: id, text: z.string().min(1).max(8000), languageCode: language });
const assessment = z.strictObject({
  level: z.enum(['safe', 'caution', 'danger']),
  indicators: z.array(z.strictObject({ code: id, explanation: shortText,
    segmentIds: z.array(id).max(32) })).max(32),
  summary: shortText,
});
export const relayMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('session.ready'), sessionId: id, audio: audioConfigSchema }),
  z.strictObject({ type: z.literal('transcript.partial'), sessionId: id, segment }),
  z.strictObject({ type: z.literal('transcript.final'), sessionId: id, segment }),
  z.strictObject({ type: z.literal('risk.update'), sessionId: id, assessment }),
  z.strictObject({ type: z.literal('warning'), sessionId: id,
    code: warningCode, message: shortText }),
  z.strictObject({ type: z.literal('session.error'), sessionId: id.nullable(),
    code: z.enum(['INVALID_MESSAGE', 'UPSTREAM_UNAVAILABLE', 'SESSION_EXPIRED', 'INTERNAL_ERROR']),
    message: shortText, recoverable: z.boolean() }),
  z.strictObject({ type: z.literal('session.end'), sessionId: id,
    reason: z.enum(['user', 'timeout', 'error']) }),
  z.strictObject({ type: z.literal('warning.audio'), warningCode,
    language, mimeType: z.literal('audio/wav'),
    // At most 192 KB decoded audio (~six seconds); below the output queue ceiling.
    audioBase64: z.string().min(4).max(256000)
      .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
      .refine(isPcm16Wav, 'Expected complete PCM16 mono 16000 Hz WAV') }),
]);

export const AUDIO: AudioConfig = audioConfigSchema.parse({
  encoding: 'pcm_s16le', sampleRate: 16000, channels: 1, frameBytes: 1024,
});

// Runtime validators narrow strings to the mock allowlists; wire structure stays unchanged.
type Assert<T extends true> = T;
type SameShape<A, B> = [A] extends [B] ? true : false;
export type BrowserSchemaMatchesProtocol = Assert<SameShape<z.output<typeof browserMessageSchema>, BrowserMessage>>;
export type RelaySchemaMatchesProtocol = Assert<SameShape<z.output<typeof relayMessageSchema>, RelayMessage>>;
type WidenStrings<T> = T extends string ? string : T extends readonly (infer U)[]
  ? readonly WidenStrings<U>[] : T extends object ? { [K in keyof T]: WidenStrings<T[K]> } : T;
export type BrowserProtocolMatchesSchema = Assert<SameShape<WidenStrings<BrowserMessage>, WidenStrings<z.output<typeof browserMessageSchema>>>>;
export type RelayProtocolMatchesSchema = Assert<SameShape<WidenStrings<RelayMessage>, WidenStrings<z.output<typeof relayMessageSchema>>>>;
