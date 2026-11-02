/** raw/api_STT_stt-websocket.md, Supported Languages table. hi-en is TTS-only. */
export const GNANI_STT_LANGUAGES = {
  'en-IN': { code: 'en-IN', script: 'Latin' },
  'hi-IN': { code: 'hi-IN', script: 'Devanagari (Hindi)' },
  'mr-IN': { code: 'mr-IN', script: 'Devanagari (Marathi)' },
  'hi-en': { code: null, script: 'Unsupported for STT' },
} as const;

export function gnaniSttLanguage(language: string): string | undefined {
  const entry = GNANI_STT_LANGUAGES[language as keyof typeof GNANI_STT_LANGUAGES];
  return entry?.code ?? undefined;
}
