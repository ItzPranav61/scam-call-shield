import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWav } from '../apps/relay/dist/apps/relay/src/providers/gnani-tts.js';

export function decodeWav(wav) {
  validateWav(wav);
  for (let offset = 12; offset + 8 <= wav.length;) {
    const tag = wav.toString('ascii', offset, offset + 4);
    const declared = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    const size = tag === 'data' && [0, 0xffffffff].includes(declared) ? wav.length - start : declared;
    if (tag === 'data') {
      const pcm = wav.subarray(start, start + size);
      const samples = Float64Array.from({ length: pcm.length / 2 }, (_, index) => pcm.readInt16LE(index * 2) / 32768);
      return { pcm, samples };
    }
    offset = start + size + size % 2;
  }
  throw new Error('WAV data missing');
}

export function encodePcm(pcm) {
  if (!pcm.length || pcm.length % 2) throw new Error('PCM16 samples required');
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
  return wav;
}

export function encodeWav(samples) {
  const pcm = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => {
    if (!Number.isFinite(sample) || Math.abs(sample) > 1) throw new Error('Out-of-range sample; clipping is forbidden');
    pcm.writeInt16LE(Math.round(sample * 32767), index * 2);
  });
  return encodePcm(pcm);
}

const power = (samples) => samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length;

/** Deterministic generated noise; common headroom gain preserves the requested power ratio. */
export function mixNoise(input, snrDb, kind = 'white', seed = 12345) {
  if (!input.length || !Number.isFinite(snrDb) || !['white', 'pink', 'brown'].includes(kind)) throw new Error('Invalid noise configuration');
  let state = seed || 1;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2147483648 - 1; };
  const rows = Array.from({ length: 12 }, random);
  let rowSum = rows.reduce((sum, value) => sum + value, 0);
  let brown = 0;
  const raw = Float64Array.from(input, (_, index) => {
    const white = random();
    if (kind === 'brown') { brown = 0.995 * brown + white; return brown; }
    if (kind === 'pink') {
      // Staggered random rows approximate pink noise without FFTs or external recordings.
      let row = 0;
      let counter = index + 1;
      while (counter % 2 === 0 && row < rows.length - 1) { row++; counter /= 2; }
      rowSum -= rows[row]; rows[row] = white; rowSum += white;
      return rowSum + random();
    }
    return white;
  });
  const mean = raw.reduce((sum, value) => sum + value, 0) / raw.length;
  const centered = raw.map((value) => value - mean);
  const signalPower = power(input);
  const noisePower = power(centered);
  const scale = signalPower === 0 ? 0 : Math.sqrt(signalPower / (noisePower * 10 ** (snrDb / 10)));
  const noise = centered.map((value) => value * scale);
  let peak = 0;
  for (let index = 0; index < input.length; index++) peak = Math.max(peak, Math.abs(input[index] + noise[index]));
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  const signal = Float64Array.from(input, (value) => value * gain);
  const scaledNoise = noise.map((value) => value * gain);
  const samples = signal.map((value, index) => value + scaledNoise[index]);
  return { samples, signal, noise: scaledNoise, gain, measuredSnrDb: signalPower === 0 ? null : 10 * Math.log10(power(signal) / power(scaledNoise)) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, output, snr = '10', kind = 'white'] = process.argv.slice(2);
    if (!input || !output) throw new Error('Usage: node scripts/mix-noise.mjs input.wav output.wav snrDb [white|pink|brown]');
    const result = mixNoise(decodeWav(await readFile(input)).samples, Number(snr), kind);
    await writeFile(output, encodeWav(result.samples), { flag: 'wx' });
    console.info(JSON.stringify({ output, kind, requestedSnrDb: Number(snr), measuredSnrDb: result.measuredSnrDb, gain: result.gain }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
