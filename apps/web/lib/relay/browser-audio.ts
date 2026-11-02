import { defaultMicrophoneSettings, inputLevel, microphoneConstraints, silentInput, type InputLevel, type MicrophoneSettings } from './microphone';
import type { WarningAudio } from './client';
import { PcmEncoder, warningBytes } from './pcm';

export interface MicrophoneInfo { permission: 'not-requested' | 'requesting' | 'granted' | 'denied-or-unavailable'; sampleRate: number | null }
export const initialMicrophoneInfo: MicrophoneInfo = { permission: 'not-requested', sampleRate: null };

/** All resources belong to one explicit Start gesture. Stop also cancels pending permission work. */
export class BrowserAudio {
  private context: AudioContext;
  private stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private worklet: AudioWorkletNode | undefined;
  private encoder: PcmEncoder | undefined;
  private playback: AudioBufferSourceNode | undefined;
  private stopped = false;
  private playing = false;
  private unlocked: Promise<void>;

  private readonly settings: MicrophoneSettings;
  private levelPeak = 0;
  private levelSquares = 0;
  private levelSamples = 0;
  private nextLevelAt = 0;

  constructor(private readonly diagnostics: (info: MicrophoneInfo) => void = () => {},
    settings: Readonly<MicrophoneSettings> = defaultMicrophoneSettings,
    private readonly level: (value: InputLevel) => void = () => {}) {
    this.settings = { ...settings };
    // Called synchronously from the Start button so warning playback has a user gesture.
    this.context = new AudioContext();
    this.unlocked = this.context.resume().catch(() => {});
    this.diagnostics({ permission: 'not-requested', sampleRate: this.context.sampleRate });
  }

  async capture(push: (frame: Uint8Array) => void): Promise<void> {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw new Error('Microphone requires HTTPS or localhost. Open this page on a secure origin.');
    if (!this.context.audioWorklet) throw new Error('AudioWorklet is unavailable. Use a browser with AudioWorklet support.');
    this.diagnostics({ permission: 'requesting', sampleRate: this.context.sampleRate });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(microphoneConstraints(this.settings));
    } catch {
      if (!this.stopped) this.diagnostics({ permission: 'denied-or-unavailable', sampleRate: this.context.sampleRate });
      throw new Error('Microphone access denied or unavailable. Allow microphone permission in your browser and retry.');
    }
    if (this.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
    this.stream = stream;
    this.diagnostics({ permission: 'granted', sampleRate: this.context.sampleRate });
    await this.unlocked;
    await this.context.audioWorklet.addModule('/audio/pcm-capture.worklet.js');
    if (this.stopped) return;
    if (this.context.state !== 'running')
      throw new Error('Browser audio is suspended. Retry using the Start button.');
    this.encoder = new PcmEncoder(this.context.sampleRate);
    this.source = this.context.createMediaStreamSource(stream);
    this.worklet = new AudioWorkletNode(this.context, 'shield-pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    this.worklet.port.onmessage = event => {
      if (this.stopped || this.playing || !(event.data instanceof Float32Array)) return;
      const measured = inputLevel(event.data);
      this.levelPeak = Math.max(this.levelPeak, measured.peak);
      this.levelSquares += measured.rms ** 2 * event.data.length;
      this.levelSamples += event.data.length;
      if (performance.now() >= this.nextLevelAt) {
        this.level({ peak: this.levelPeak, rms: this.levelSamples ? Math.sqrt(this.levelSquares / this.levelSamples) : 0 });
        this.levelPeak = this.levelSquares = this.levelSamples = 0;
        this.nextLevelAt = performance.now() + 100;
      }
      for (const frame of this.encoder!.push(event.data)) push(frame);
    };
    this.source.connect(this.worklet);
    // The worklet writes no output samples, so there is no microphone-to-speaker feedback.
    this.worklet.connect(this.context.destination);
  }

  async playWarning(message: WarningAudio): Promise<void> {
    if (this.stopped) return;
    await this.unlocked;
    if (this.context.state !== 'running') throw new Error('Warning playback blocked. Press Play warning to hear it.');
    const bytes = warningBytes(message.audioBase64);
    const decoded = await this.context.decodeAudioData(new Uint8Array(bytes).buffer);
    if (this.stopped) return;
    this.playback?.stop();
    const playback = this.context.createBufferSource();
    playback.buffer = decoded;
    playback.connect(this.context.destination);
    this.playback = playback;
    this.playing = true;
    this.resetLevel();
    this.encoder?.clear();
    playback.onended = () => { if (this.playback === playback) this.playing = false; };
    playback.start();
  }

  async replayWarning(message: WarningAudio): Promise<void> {
    if (this.stopped) return;
    await this.context.resume();
    await this.playWarning(message);
  }

  private resetLevel(): void {
    this.levelPeak = this.levelSquares = this.levelSamples = this.nextLevelAt = 0;
    this.level(silentInput);
  }

  stop(): void {
    this.stopped = true;
    this.resetLevel();
    this.stream?.getTracks().forEach(track => track.stop());
    this.source?.disconnect();
    if (this.worklet) { this.worklet.port.onmessage = null; this.worklet.disconnect(); }
    this.encoder?.clear();
    this.playback?.stop();
    void this.context.close().catch(() => {});
  }
}
