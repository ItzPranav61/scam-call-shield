import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { LanguageCode, WarningCode } from '@scamcall/protocol';
import type { TtsProvider } from './providers/types.js';
import { validateWav } from './providers/gnani-tts.js';

/** Instance cache: share in-flight requests and optionally load generated WAVs at startup. */
export class WarningAudioCache {
  private readonly entries = new Map<string, Promise<Uint8Array>>();
  private readonly ready: Promise<void>;
  private generation = 0;
  constructor(private readonly provider: TtsProvider) {
    this.ready = this.load();
    // Startup failure is surfaced by get(), without an unhandled rejection before first use.
    void this.ready.catch(() => {});
  }
  private async load(): Promise<void> {
    const directory = this.provider.cacheDirectory;
    if (!directory) return;
    let names: string[];
    try { names = await readdir(directory); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new Error('Warning audio cache cannot be read');
    }
    const generation = this.generation;
    for (const name of names) {
      const match = /^([A-Z_]+)\.(hi-en|mr-IN)\.([A-Za-z0-9_-]+)\.wav$/.exec(name);
      if (!match) continue;
      const bytes = new Uint8Array(await readFile(join(directory, name)));
      validateWav(bytes);
      if (generation === this.generation && this.entries.size < 32) {
        this.entries.set(JSON.stringify(match.slice(1)), Promise.resolve(bytes));
      }
    }
  }
  async get(warningCode: WarningCode, language: LanguageCode, voice: string, onSource?: (source: 'cache' | 'live') => void): Promise<Uint8Array> {
    await this.ready;
    const cacheLanguage = language === 'hi-IN' || (language === 'en-IN' && this.provider.cacheDirectory) ? 'hi-en' : language;
    const key = JSON.stringify([warningCode, cacheLanguage, voice]);
    let audio = this.entries.get(key);
    onSource?.(audio ? 'cache' : 'live');
    if (!audio) {
      audio = Promise.resolve().then(() => this.provider.synthesize(warningCode, language, voice))
        .then((bytes) => Uint8Array.from(bytes));
      if (this.entries.size >= 32) this.entries.delete(this.entries.keys().next().value!);
      this.entries.set(key, audio);
    }
    try { return Uint8Array.from(await audio); }
    catch (error) {
      if (this.entries.get(key) === audio) this.entries.delete(key);
      throw error;
    }
  }
  clear(): void { this.generation++; this.entries.clear(); }
}
