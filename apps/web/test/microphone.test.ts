import { describe, expect, it } from 'vitest';
import { defaultMicrophoneSettings, inputLevel, microphoneConstraints } from '../lib/relay/microphone';

describe('microphone levels and constraints', () => {
  it('keeps browser device selection implicit and preserves previous processing defaults', () => {
    expect(microphoneConstraints(defaultMicrophoneSettings)).toEqual({
      video: false, audio: { channelCount: 1, echoCancellation: true, autoGainControl: false, noiseSuppression: true },
    });
  });
  it('requests the chosen device exactly and respects explicit processing switches', () => {
    expect(microphoneConstraints({ deviceId: 'synthetic-device', autoGainControl: true, noiseSuppression: false })).toEqual({
      video: false, audio: { channelCount: 1, echoCancellation: true, deviceId: { exact: 'synthetic-device' }, autoGainControl: true, noiseSuppression: false },
    });
  });
  it('measures silence and empty blocks without NaN', () => {
    expect(inputLevel(new Float32Array(0))).toEqual({ peak: 0, rms: 0 });
    expect(inputLevel(new Float32Array(128))).toEqual({ peak: 0, rms: 0 });
  });
  it('measures bipolar signal energy and peak independently', () => {
    const level = inputLevel(new Float32Array([1, -1, 0, 0]));
    expect(level.peak).toBe(1); expect(level.rms).toBeCloseTo(Math.sqrt(0.5));
    expect(inputLevel(new Float32Array([0.25, -0.25]))).toEqual({ peak: 0.25, rms: 0.25 });
  });
  it('clamps out-of-range samples and ignores nonfinite values as silence', () => {
    expect(inputLevel(new Float32Array([2, -2, NaN, Infinity]))).toEqual({ peak: 1, rms: Math.sqrt(0.5) });
  });
});
