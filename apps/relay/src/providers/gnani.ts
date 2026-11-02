import type { AudioConfig, LanguageCode } from '@scamcall/protocol';
import type { SttProvider, Transcript } from './types.js';

// Deliberately no network client or credential access.
export class GnaniSttProvider implements SttProvider {
  start(_config: { language: LanguageCode; audio: AudioConfig }, _onTranscript: (segment: Transcript) => void): never {
    throw new Error('not implemented');
  }
  write(_frame: Uint8Array): never { throw new Error('not implemented'); }
  stop(): never { throw new Error('not implemented'); }
}
export { GnaniTtsProvider } from './gnani-tts.js';
