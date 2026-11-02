import test from 'node:test';
import assert from 'node:assert/strict';
import { mixNoise, encodeWav, decodeWav } from '../../../scripts/mix-noise.mjs';

const signal = Float64Array.from({ length: 16000 }, (_, index) => 0.9 * Math.sin(2 * Math.PI * 440 * index / 16000));
const power = (samples) => samples.reduce((sum, value) => sum + value ** 2, 0) / samples.length;
for (const kind of ['white', 'pink', 'brown']) for (const snr of [10, 0]) {
  test(`${kind} noise at ${snr} dB retains SNR after PCM encoding without clipping`, () => {
    const result = mixNoise(signal, snr, kind);
    const decoded = decodeWav(encodeWav(result.samples)).samples;
    const recoveredNoise = decoded.map((value, index) => value - result.signal[index]);
    const measured = 10 * Math.log10(power(result.signal) / power(recoveredNoise));
    assert.ok(Math.abs(measured - snr) < 0.02, `SNR ${measured}`);
    assert.ok(decoded.every((value) => Math.abs(value) < 0.99));
    assert.ok(result.gain < 1, 'high-amplitude signal should invoke common headroom gain');
  });
}
test('silence stays finite, deterministic mixing and format validation', () => {
  assert.deepEqual(mixNoise(signal, 10).samples, mixNoise(signal, 10).samples);
  assert.ok(mixNoise(new Float64Array(1024), 0).samples.every((value) => value === 0));
  assert.throws(() => encodeWav([1.1]), /clipping/);
  assert.throws(() => mixNoise(signal, NaN), /Invalid/);
});
