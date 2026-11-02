import type { RelayMessage } from '@scamcall/protocol';
import { silentInput, type InputLevel } from './microphone';
import { initialMicrophoneInfo, type MicrophoneInfo } from './browser-audio';

export interface TransportDiagnostics {
  framesSent: number; bytesSent: number;
  lastMessageType: RelayMessage['type'] | null; lastMessageAt: number | null;
}
export const initialTransport: TransportDiagnostics = { framesSent: 0, bytesSent: 0, lastMessageType: null, lastMessageAt: null };
export interface DiagnosticsSnapshot { transport: TransportDiagnostics; level: InputLevel; microphone: MicrophoneInfo }

/** Mutable hot-path refs; only subscribers get an immutable snapshot, at most once per 250 ms. */
export class StreamDiagnostics {
  private latest: DiagnosticsSnapshot = { transport: { ...initialTransport }, level: silentInput, microphone: initialMicrophoneInfo };
  private published = { ...this.latest, transport: { ...this.latest.transport } };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  readonly getSnapshot = () => this.published;
  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); if (!this.listeners.size) { clearTimeout(this.timer); this.timer = undefined; } };
  };
  private changed(): void {
    if (this.timer !== undefined) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.published = { transport: { ...this.latest.transport }, level: { ...this.latest.level }, microphone: { ...this.latest.microphone } };
      for (const listener of this.listeners) listener();
    }, 250);
  }
  readonly transport = (value: TransportDiagnostics) => { this.latest.transport = { ...value }; this.changed(); };
  readonly level = (value: InputLevel) => { this.latest.level = value; this.changed(); };
  readonly microphone = (value: MicrophoneInfo) => { this.latest.microphone = value; this.changed(); };
  reset(): void {
    this.latest = { transport: { ...initialTransport }, level: silentInput, microphone: initialMicrophoneInfo };
    this.changed();
  }
}
