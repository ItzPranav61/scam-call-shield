export interface MicrophoneSettings {
  deviceId: string;
  autoGainControl: boolean;
  noiseSuppression: boolean;
}
export const defaultMicrophoneSettings: Readonly<MicrophoneSettings> = {
  deviceId: '', autoGainControl: false, noiseSuppression: true,
};
export function microphoneConstraints(settings: Readonly<MicrophoneSettings>): MediaStreamConstraints {
  return {
    video: false,
    audio: { channelCount: 1, echoCancellation: true,
      autoGainControl: settings.autoGainControl, noiseSuppression: settings.noiseSuppression,
      ...(settings.deviceId ? { deviceId: { exact: settings.deviceId } } : {}) },
  };
}
export interface InputLevel { peak: number; rms: number }
export const silentInput: InputLevel = { peak: 0, rms: 0 };
/** Linear full-scale level, not a speech detector or confidence score. */
export function inputLevel(samples: Float32Array): InputLevel {
  let peak = 0;
  let squares = 0;
  for (const sample of samples) {
    const value = Number.isFinite(sample) ? Math.min(1, Math.abs(sample)) : 0;
    peak = Math.max(peak, value);
    squares += value * value;
  }
  return { peak, rms: samples.length ? Math.sqrt(squares / samples.length) : 0 };
}
