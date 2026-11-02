import { readFile, readdir } from 'node:fs/promises';
import { beforeEach, expect, it, vi } from 'vitest';
import { WarningAudioCache } from '../src/warning-cache.js';
import { createMockWav } from '../src/providers/mock.js';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn(), readdir: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); });

it('loads generated WAVs at startup and serves them without invoking TTS', async () => {
  vi.mocked(readdir).mockResolvedValue(['SENSITIVE_REQUEST.hi-en.Poorvi.wav'] as never);
  vi.mocked(readFile).mockResolvedValue(Buffer.from(new Uint8Array(createMockWav())));
  const synthesize = vi.fn(async () => createMockWav());
  const cache = new WarningAudioCache({ synthesize, cacheDirectory: 'synthetic-audio-directory' });
  expect(readdir).toHaveBeenCalledOnce();
  const audio = await cache.get('SENSITIVE_REQUEST', 'hi-IN', 'Poorvi');
  expect(Buffer.from(audio)).toEqual(createMockWav());
  expect(synthesize).not.toHaveBeenCalled();
});

it('shares one in-flight cache miss and returns independent copies', async () => {
  let resolveAudio!: (bytes: Uint8Array) => void;
  const synthesize = vi.fn(() => new Promise<Uint8Array>((resolve) => { resolveAudio = resolve; }));
  const cache = new WarningAudioCache({ synthesize });
  const first = cache.get('SCAM_PATTERN', 'mr-IN', 'Zahira');
  const second = cache.get('SCAM_PATTERN', 'mr-IN', 'Zahira');
  await vi.waitFor(() => expect(synthesize).toHaveBeenCalledTimes(1));
  resolveAudio(createMockWav());
  const a = await first;
  a[0] = 0;
  expect((await second)[0]).toBe(82);
  expect((await cache.get('SCAM_PATTERN', 'mr-IN', 'Zahira'))[0]).toBe(82);
});

it('does not permanently cache a failed request', async () => {
  const synthesize = vi.fn().mockRejectedValueOnce(new Error('synthetic failure')).mockResolvedValue(Buffer.from(new Uint8Array(createMockWav())));
  const cache = new WarningAudioCache({ synthesize });
  await expect(cache.get('SCAM_PATTERN', 'mr-IN', 'Zahira')).rejects.toThrow('synthetic failure');
  await expect(cache.get('SCAM_PATTERN', 'mr-IN', 'Zahira')).resolves.toHaveLength(32044);
  expect(synthesize).toHaveBeenCalledTimes(2);
});
