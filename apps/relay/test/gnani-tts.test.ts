import { afterEach, expect, it, vi } from 'vitest';
import { GnaniTtsProvider, validateWav } from '../src/providers/gnani-tts.js';
import { gnaniUsage } from '../src/usage.js';
import { createMockWav } from '../src/providers/mock.js';

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
const key = 'synthetic-test-key';
const wavResponse = () => new Response(new Uint8Array(createMockWav()), { headers: { 'Content-Type': 'audio/wav' } });

it('posts documented fields and validates a PCM16 mono 16000 Hz WAV', async () => {
  const http = vi.fn<typeof fetch>().mockResolvedValue(wavResponse());
  const provider = new GnaniTtsProvider({ apiKey: key, fetch: http });
  expect(await provider.synthesize('SENSITIVE_REQUEST', 'hi-en', 'Poorvi')).toEqual(new Uint8Array(createMockWav()));
  const [url, options] = http.mock.calls[0]!;
  expect(url).toBe('https://api.vachana.ai/api/v1/tts/inference');
  expect(options?.headers).toEqual({ 'Content-Type': 'application/json', 'X-API-Key-ID': key });
  expect(JSON.parse(options?.body as string)).toMatchObject({ model: 'timbre-v2.5', voice: 'Poorvi', language: 'hi-en', speed: 1,
    audio_config: { sample_rate: 16000, sample_width: 2, num_channels: 1, container: 'wav', encoding: 'linear_pcm' } });
});

it('returns a clear sanitized 403 without retrying', async () => {
  const http = vi.fn<typeof fetch>().mockResolvedValue(new Response(key, { status: 403 }));
  await expect(new GnaniTtsProvider({ apiKey: key, fetch: http }).synthesize('SCAM_PATTERN', 'mr-IN', 'Zahira'))
    .rejects.toThrow('API key, organization status or available credits');
  expect(http).toHaveBeenCalledTimes(1);
});

it.each([429, 500, 503])('retries HTTP %s once with backoff', async (status) => {
  const http = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status })).mockResolvedValueOnce(wavResponse());
  const before = gnaniUsage.ttsCharacters;
  await expect(new GnaniTtsProvider({ apiKey: key, fetch: http, backoffMs: 1 })
    .synthesize('SCAM_PATTERN', 'mr-IN', 'Zahira')).resolves.toHaveLength(32044);
  expect(http).toHaveBeenCalledTimes(2);
  const text = (JSON.parse(http.mock.calls[0]![1]!.body as string) as { text: string }).text;
  expect(gnaniUsage.ttsCharacters - before).toBe([...text].length * 2);
});

it('times out without retrying or leaking the HTTP error', async () => {
  const http = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error(key)), { once: true });
  }));
  await expect(new GnaniTtsProvider({ apiKey: key, fetch: http, timeoutMs: 10 })
    .synthesize('SCAM_PATTERN', 'hi-en', 'Poorvi')).rejects.toThrow('timed out');
  expect(http).toHaveBeenCalledTimes(1);
});

it('rejects incorrect WAV headers and upstream formats instead of converting', () => {
  expect(() => validateWav(new Uint8Array(44))).toThrow('complete WAV');
  for (const [offset, value] of [[24, 48000], [22, 2], [34, 8]]) {
    const wav = createMockWav();
    wav.writeUInt16LE(value!, offset!);
    expect(() => validateWav(wav)).toThrow('PCM16 mono 16000');
  }
});

it('redacts arbitrary transport exceptions', async () => {
  const http = vi.fn<typeof fetch>().mockRejectedValue(new Error(`request failed ${key}`));
  await expect(new GnaniTtsProvider({ apiKey: key, fetch: http })
    .synthesize('SCAM_PATTERN', 'hi-en', 'Poorvi')).rejects.toThrow(/^Gnani TTS request failed$/);
});

it.each([[0, 0], [0xffffffff, 0xffffffff], [0, 0xffffffff], [0xffffffff, 0]])(
  'accepts streamed WAV size placeholders RIFF=%s data=%s without rewriting bytes', (riffSize, dataSize) => {
    const wav = createMockWav();
    wav.writeUInt32LE(riffSize!, 4);
    wav.writeUInt32LE(dataSize!, 40);
    const before = Buffer.from(wav);
    expect(() => validateWav(wav)).not.toThrow();
    expect(wav).toEqual(before);
  },
);

it('accepts extra padded chunks and still locates PCM format and data', () => {
  const original = createMockWav();
  const junk = Buffer.from([74, 85, 78, 75, 3, 0, 0, 0, 1, 2, 3, 0]);
  const wav = Buffer.concat([original.subarray(0, 12), junk, original.subarray(12)]);
  wav.writeUInt32LE(wav.length - 8, 4);
  expect(() => validateWav(wav)).not.toThrow();
});

it('rejects a header without samples even with streamed placeholders', () => {
  const wav = createMockWav().subarray(0, 44);
  wav.writeUInt32LE(0xffffffff, 4);
  wav.writeUInt32LE(0xffffffff, 40);
  expect(() => validateWav(wav)).toThrow('Invalid WAV PCM data');
});
