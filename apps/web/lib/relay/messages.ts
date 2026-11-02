import { z } from 'zod';
import type { AudioConfig, RelayMessage } from '@scamcall/protocol';

export const AUDIO = {
  encoding: 'pcm_s16le', sampleRate: 16000, channels: 1, frameBytes: 1024,
} as const satisfies AudioConfig;

const id = z.string().min(1).max(128);
const text = z.string().min(1).max(1000);
const language = z.enum(['hi-IN', 'en-IN', 'mr-IN']);
const audio = z.strictObject({ encoding: z.literal('pcm_s16le'), sampleRate: z.literal(16000), channels: z.literal(1), frameBytes: z.literal(1024) });
const segment = z.strictObject({ segmentId: id, text: z.string().min(1).max(8000), languageCode: language });
const schema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('session.ready'), sessionId: id, audio }),
  z.strictObject({ type: z.literal('transcript.partial'), sessionId: id, segment }),
  z.strictObject({ type: z.literal('transcript.final'), sessionId: id, segment }),
  z.strictObject({ type: z.literal('risk.update'), sessionId: id, assessment: z.strictObject({
    level: z.enum(['safe', 'caution', 'danger']), summary: text,
    indicators: z.array(z.strictObject({ code: id, explanation: text, segmentIds: z.array(id).max(32) })).max(32),
  }) }),
  z.strictObject({ type: z.literal('warning'), sessionId: id, code: id, message: text }),
  z.strictObject({ type: z.literal('warning.audio'), warningCode: id, language, mimeType: z.literal('audio/wav'),
    audioBase64: z.string().min(4).max(256000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/) }),
  z.strictObject({ type: z.literal('session.error'), sessionId: id.nullable(),
    code: z.enum(['INVALID_MESSAGE', 'UPSTREAM_UNAVAILABLE', 'SESSION_EXPIRED', 'INTERNAL_ERROR']), message: text, recoverable: z.boolean() }),
  z.strictObject({ type: z.literal('session.end'), sessionId: id, reason: z.enum(['user', 'timeout', 'error']) }),
]) satisfies z.ZodType<RelayMessage>;

export function parseRelayMessage(value: unknown): RelayMessage {
  if (typeof value !== 'string' || value.length > 270000) throw new Error('Invalid relay response');
  const message = schema.parse(JSON.parse(value));
  if (message.type !== 'warning.audio' && new TextEncoder().encode(value).length > 16384)
    throw new Error('Relay response exceeds the contract limit');
  return message;
}

export function relayUrl(value: string): string {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'wss:' && !(local && url.protocol === 'ws:')) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/ws')
    throw new Error('Use wss://host/ws, or ws://localhost:8787/ws for local testing.');
  return url.href;
}
