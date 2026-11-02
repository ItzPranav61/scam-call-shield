import { gnaniUsage } from '../usage.js';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { LanguageCode, WarningCode } from '@scamcall/protocol';
import type { TtsProvider } from './types.js';

export function warningsDirectory(): string {
  let root = resolve(process.cwd());
  while (!existsSync(join(root, 'data/warnings/warnings.json'))) {
    const parent = dirname(root);
    if (parent === root) throw new Error('Warning texts not found');
    root = parent;
  }
  return join(root, 'data/warnings');
}

/** Validate upstream bytes; never silently convert a mismatched format. */
export function validateWav(bytes: Uint8Array): void {
  const wav = Buffer.from(bytes);
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF'
      || wav.toString('ascii', 8, 12) !== 'WAVE'
      || ![0, 0xffffffff, wav.length - 8].includes(wav.readUInt32LE(4))) {
    throw new Error('TTS response is not a complete WAV');
  }
  let format = false;
  let data = false;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const tag = wav.toString('ascii', offset, offset + 4);
    const declaredSize = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    // A streamed data chunk uses zero or UINT32_MAX until the response ends.
    const size = tag === 'data' && [0, 0xffffffff].includes(declaredSize)
      ? wav.length - start : declaredSize;
    if (start + size > wav.length) throw new Error('Truncated WAV chunk');
    if (tag === 'fmt ') {
      if (size < 16 || wav.readUInt16LE(start) !== 1 || wav.readUInt16LE(start + 2) !== 1
          || wav.readUInt32LE(start + 4) !== 16000 || wav.readUInt32LE(start + 8) !== 32000
          || wav.readUInt16LE(start + 12) !== 2 || wav.readUInt16LE(start + 14) !== 16) {
        throw new Error('TTS requires WAV PCM16 mono 16000 Hz; conversion is disabled');
      }
      format = true;
    }
    if (tag === 'data') {
      if (!size || size % 2) throw new Error('Invalid WAV PCM data');
      data = true;
    }
    offset = start + size + size % 2;
  }
  if (!format || !data) throw new Error('WAV format or data chunk missing');
}

interface Options {
  fetch?: typeof fetch;
  apiKey?: string;
  directory?: string;
  timeoutMs?: number;
  backoffMs?: number;
  retries?: 0 | 1;
  onResponse?: (result: { status: number; credits: string | null }) => void;
}

export class GnaniTtsProvider implements TtsProvider {
  readonly cacheDirectory: string;
  private readonly directory: string;
  constructor(private readonly options: Options = {}) {
    this.directory = options.directory ?? warningsDirectory();
    this.cacheDirectory = join(this.directory, 'audio');
  }
  async synthesize(code: WarningCode, language: LanguageCode, _voice: string): Promise<Uint8Array> {
    const key = this.options.apiKey ?? process.env.GNANI_API_KEY;
    if (!key?.trim()) throw new Error('GNANI_API_KEY is required in the relay environment');
    language = ['hi-IN', 'en-IN'].includes(language) ? 'hi-en' : language;
    const voice = language === 'hi-en' ? process.env.GNANI_TTS_VOICE_HI_EN ?? 'Poorvi'
      : language === 'mr-IN' ? process.env.GNANI_TTS_VOICE_MR_IN ?? 'Zahira' : undefined;
    if (!voice) throw new Error('Unsupported warning language');
    const texts = JSON.parse(await readFile(join(this.directory, 'warnings.json'), 'utf8')) as Record<string, Record<string, string>>;
    const text = texts[code]?.[language];
    if (!text || [...text].length >= 200) throw new Error('Missing or oversized warning text');
    const body = JSON.stringify({ text, model: 'timbre-v2.5', voice, language, speed: 1.0,
      audio_config: { sample_rate: 16000, num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' } });
    for (let attempt = 0; attempt <= (this.options.retries ?? 1); attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 10000);
      try {
        gnaniUsage.ttsCharacters += [...text].length;
        const response = await (this.options.fetch ?? fetch)('https://api.vachana.ai/api/v1/tts/inference', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key-ID': key }, body, signal: controller.signal,
        });
        const creditHeader = response.headers.get('x-credits-used');
        const credits = creditHeader && /^\d+(?:\.\d+)?$/.test(creditHeader) ? creditHeader : null;
        this.options.onResponse?.({ status: response.status, credits });
        if (response.status === 403) throw new Error('Gnani TTS HTTP 403: check API key, organization status or available credits');
        if ([429, 500, 503].includes(response.status) && attempt < (this.options.retries ?? 1)) {
          await response.body?.cancel();
          clearTimeout(timer);
          await new Promise((done) => setTimeout(done, this.options.backoffMs ?? 300));
          continue;
        }
        if (!response.ok) throw new Error(`Gnani TTS HTTP ${response.status}`);
        const audio = new Uint8Array(await response.arrayBuffer());
        validateWav(audio);
        return audio;
      } catch (error) {
        if (controller.signal.aborted) throw new Error('Gnani TTS timed out after ten seconds');
        if (error instanceof Error && /^(Gnani TTS HTTP|TTS |WAV |Truncated WAV|Invalid WAV)/.test(error.message)
            && !error.message.includes(key)) throw error;
        throw new Error('Gnani TTS request failed');
      } finally { clearTimeout(timer); }
    }
    throw new Error('Gnani TTS retry exhausted');
  }
}
