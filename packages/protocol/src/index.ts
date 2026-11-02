import type { RiskAssessment, TranscriptSegment } from '@scamcall/detector';

export type AudioConfig = { encoding: 'pcm_s16le'; sampleRate: 16000; channels: 1; frameBytes: 1024 };
export type BrowserMessage =
  | { type: 'session.start'; version: 1; consent: true; languageCode: string; audio: AudioConfig; scenario?: string }
  | { type: 'session.end'; sessionId: string; reason: 'user' };
export type RelayMessage =
  | { type: 'session.ready'; sessionId: string; audio: AudioConfig }
  | { type: 'transcript.partial'; sessionId: string; segment: TranscriptSegment }
  | { type: 'transcript.final'; sessionId: string; segment: TranscriptSegment }
  | { type: 'risk.update'; sessionId: string; assessment: RiskAssessment }
  | { type: 'warning'; sessionId: string; code: string; message: string }
  | WarningAudioMessage
  | { type: 'session.error'; sessionId: string | null; code: 'INVALID_MESSAGE' | 'UPSTREAM_UNAVAILABLE' | 'SESSION_EXPIRED' | 'INTERNAL_ERROR'; message: string; recoverable: boolean }
  | { type: 'session.end'; sessionId: string; reason: 'user' | 'timeout' | 'error' };
/** Binary WebSocket message; never JSON serialized. Connection identifies the session. */
export interface AudioChunk { type: 'audio.chunk'; data: ArrayBuffer }
export type FrontendState = 'idle' | 'connecting' | 'listening' | 'caution' | 'danger' | 'error' | 'ended';

export type WarningCode = Extract<RelayMessage, { type: 'warning' }>['code'];
export type LanguageCode = Extract<BrowserMessage, { type: 'session.start' }>['languageCode'];
export interface WarningAudioMessage {
  type: 'warning.audio';
  warningCode: WarningCode;
  language: LanguageCode;
  mimeType: 'audio/wav';
  audioBase64: string;
}
