import type { AudioConfig, LanguageCode, RelayMessage, WarningCode } from '@scamcall/protocol';

export type Transcript = Extract<RelayMessage, { type: 'transcript.final' }>['segment'];
export type Assessment = Extract<RelayMessage, { type: 'risk.update' }>['assessment'];
export type SttEvent =
  | { type: 'connected'; sampleRate: number; chunkSize: number }
  | { type: 'processing' }
  | { type: 'transcript'; text: string; segment_id: string; audio_duration_ms: number; latency: number }
  | { type: 'error'; message: string; recoverable: true };
export interface SttProvider {
  start(config: { language: LanguageCode; audio: AudioConfig }, onTranscript: (segment: Transcript) => void, onEvent?: (event: SttEvent) => void): void;
  write(frame: Uint8Array): void;
  stop(): void;
}
export interface TtsProvider {
  readonly cacheDirectory?: string;
  synthesize(warningCode: WarningCode, language: LanguageCode, voice: string): Promise<Uint8Array>;
}
