import { randomUUID } from 'node:crypto';
import type { AudioConfig, LanguageCode, WarningCode } from '@scamcall/protocol';
import type { SttProvider, Transcript, TtsProvider } from './types.js';

export const MOCK_VOICE = 'mock-tone';
const SCRIPT = [
  'Synthetic mock: Hello, this is a fictional support call.',
  'Synthetic mock: Please act immediately to avoid a fictional account block.',
  'Synthetic mock: The fictional caller asks you to share an OTP. Do not share it.',
] as const;
export class MockSttProvider implements SttProvider {
  private timers: ReturnType<typeof setTimeout>[] = [];
  constructor(private readonly script: readonly string[] = SCRIPT, private readonly delayMs = 100) {}
  start(config: { language: LanguageCode; audio: AudioConfig }, onTranscript: (segment: Transcript) => void): void {
    this.stop();
    this.script.forEach((text, index) => {
      this.timers.push(setTimeout(() => onTranscript({
        segmentId: randomUUID(), text, languageCode: config.language,
      }), (index + 1) * this.delayMs));
    });
  }
  write(_frame: Uint8Array): void { /* Mock deliberately ignores microphone content. */ }
  stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}

/** Valid one-second PCM16 LE mono 16 kHz WAV generated entirely in memory. */
export function createMockWav(): Buffer {
  const samples = 16000;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let sample = 0; sample < samples; sample++) {
    // Short fade avoids sharp clicks; amplitude is 2% of full scale.
    const fade = Math.min(1, sample / 160, (samples - 1 - sample) / 160);
    wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * sample / 16000) * 655 * fade), 44 + sample * 2);
  }
  return wav;
}

export class MockTtsProvider implements TtsProvider {
  async synthesize(_warningCode: WarningCode, _language: LanguageCode, _voice: string): Promise<Uint8Array> {
    return createMockWav();
  }
}
