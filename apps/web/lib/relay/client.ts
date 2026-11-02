import { initialTransport, type TransportDiagnostics } from './diagnostics';
import type { BrowserMessage, RelayMessage, LanguageCode } from '@scamcall/protocol';
import { AUDIO, parseRelayMessage, relayUrl } from './messages';
import { warningBytes } from './pcm';

export interface RelaySocket {
  readyState: number;
  bufferedAmount: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send(data: string | ArrayBuffer): void;
  close(): void;
}
type Transcript = Extract<RelayMessage, { type: 'transcript.final' }>['segment'];
type Assessment = Extract<RelayMessage, { type: 'risk.update' }>['assessment'];
export type WarningAudio = Extract<RelayMessage, { type: 'warning.audio' }>;
export interface LiveState {
  phase: 'idle' | 'connecting' | 'listening' | 'ended' | 'relay-offline' | 'error';
  detail: string;
  transcripts: readonly Transcript[];
  assessment: Assessment | null;
  warning: string;
}
export const initialLiveState: LiveState = {
  phase: 'idle', detail: 'Choose a synthetic scenario or microphone input.', transcripts: [], assessment: null, warning: '',
};
interface Hooks {
  socket(url: string): RelaySocket;
  capture(push: (frame: Uint8Array) => void): Promise<void>;
  stopCapture(): void;
  playWarning(message: WarningAudio): void;
  change(state: LiveState): void;
  diagnostics?(value: TransportDiagnostics): void;
}

/** One explicit user start per client. No reconnects, storage, or transcript logging. */
export class RelayClient {
  private state: LiveState = initialLiveState;
  private socket?: RelaySocket;
  private sessionId?: string;
  private active = false;
  private used = false;
  private scenario = false;
  private stats: TransportDiagnostics = { ...initialTransport };
  private deadline: ReturnType<typeof setTimeout> | undefined;
  private limit: ReturnType<typeof setTimeout> | undefined;
  private warningCodes = new Set<string>();
  constructor(private hooks: Hooks) {}

  start(url: string, consent: boolean, languageCode: LanguageCode, scenario?: string): void {
    if (!consent) throw new Error('Consent is required before starting a session.');
    if (this.used) throw new Error('Create a fresh connection to retry.');
    if (!['hi-IN', 'en-IN', 'mr-IN'].includes(languageCode)) throw new Error('Unsupported language.');
    const target = relayUrl(url);
    this.used = this.active = true;
    this.scenario = scenario !== undefined;
    this.update({ ...initialLiveState, phase: 'connecting', detail: 'Connecting to relay; microphone off.' });
    try { this.socket = this.hooks.socket(target); }
    catch { this.finish('relay-offline', 'Relay offline. Start the relay, then Retry.'); return; }
    const socket = this.socket;
    socket.onopen = () => {
      if (!this.active) return;
      const message: BrowserMessage = { type: 'session.start', version: 1, consent: true, languageCode, audio: AUDIO,
        ...(scenario === undefined ? {} : { scenario }) };
      try { socket.send(JSON.stringify(message)); }
      catch { this.finish('relay-offline', 'Relay connection failed. Retry when it is available.'); }
    };
    socket.onmessage = event => {
      if (!this.active) return;
      try {
        const message = parseRelayMessage(event.data);
        this.stats.lastMessageType = message.type; this.stats.lastMessageAt = Date.now();
        this.hooks.diagnostics?.(this.stats);
        this.receive(message);
      }
      catch { this.finish('error', 'Invalid relay response. Monitoring stopped.'); }
    };
    socket.onerror = socket.onclose = () => {
      if (this.active) this.finish('relay-offline', 'Relay offline or disconnected. Microphone stopped. Retry to start a fresh session.');
    };
    this.deadline = setTimeout(() => {
      if (!this.sessionId) this.finish('relay-offline', 'Relay readiness timed out. Retry when the relay is available.');
    }, 15000);
    this.limit = setTimeout(() => this.stop('Five-minute session limit reached.'), 300000);
  }

  private receive(message: RelayMessage): void {
    if ('sessionId' in message && message.type !== 'session.ready' && message.sessionId !== this.sessionId &&
        !(message.type === 'session.error' && message.sessionId === null && !this.sessionId)) throw new Error('Wrong session');
    if (message.type === 'session.error') {
      this.finish('error', `${message.code}: ${message.message}`);
      return;
    }
    if (message.type === 'session.ready') {
      if (this.sessionId) throw new Error('Duplicate readiness');
      this.sessionId = message.sessionId;
      clearTimeout(this.deadline);
      if (this.scenario) this.update({ ...this.state, phase: 'listening', detail: 'Receiving synthetic scenario from relay. Microphone off.' });
      else void this.hooks.capture(frame => this.push(frame)).then(() => {
        if (!this.active) { this.hooks.stopCapture(); return; }
        this.update({ ...this.state, phase: 'listening', detail: 'Microphone active. Speak synthetic dialogue only.' });
      }).catch(error => {
        if (this.active) this.finish('error', error instanceof Error ? error.message : 'Microphone unavailable.');
      });
      return;
    }
    if (!this.sessionId) throw new Error('Message before readiness');
    if (message.type === 'transcript.final') {
      if (this.state.transcripts.some(segment => segment.segmentId === message.segment.segmentId)) return;
      if (this.state.transcripts.length >= 256) { this.stop('Transcript limit reached.'); return; }
      this.update({ ...this.state, transcripts: [...this.state.transcripts, message.segment] });
    }
    if (message.type === 'risk.update') {
      const ranks = ['safe', 'caution', 'danger'];
      if (ranks.indexOf(message.assessment.level) < ranks.indexOf(this.state.assessment?.level ?? 'safe')) throw new Error('Risk decreased');
      if (message.assessment.indicators.some(indicator => indicator.segmentIds.some(id =>
        !this.state.transcripts.some(segment => segment.segmentId === id)))) throw new Error('Unknown evidence');
      this.update({ ...this.state, assessment: message.assessment });
    }
    if (message.type === 'warning') this.update({ ...this.state, warning: message.message });
    if (message.type === 'warning.audio' && !this.warningCodes.has(message.warningCode)) {
      if (!this.state.assessment) throw new Error('Warning before risk');
      warningBytes(message.audioBase64);
      this.warningCodes.add(message.warningCode);
      this.hooks.playWarning(message);
    }
    if (message.type === 'session.end') this.finish(message.reason === 'error' ? 'error' : 'ended', `Session ended (${message.reason}). Microphone off.`);
  }

  private push(frame: Uint8Array): void {
    if (!this.active || this.scenario || !this.sessionId || !this.socket) return;
    if (frame.length !== 1024) { this.finish('error', 'Invalid microphone frame: expected exactly 1024 bytes.'); return; }
    if (this.socket.readyState !== 1 || this.socket.bufferedAmount + frame.byteLength > 256 * 1024) {
      this.finish('relay-offline', 'Relay connection too slow. Microphone stopped.'); return;
    }
    try {
      // The worklet/source sample clock already paces PCM. Never re-pace it on the UI thread.
      this.socket.send(new Uint8Array(frame).buffer);
      this.stats.framesSent++; this.stats.bytesSent += frame.byteLength;
      this.hooks.diagnostics?.(this.stats);
    } catch { this.finish('relay-offline', 'Audio send failed. Microphone stopped.'); }
  }
  stop(detail = 'Stopped. Microphone off.'): void { if (this.active) this.finish('ended', detail); }
  private finish(phase: LiveState['phase'], detail: string): void {
    this.active = false;
    clearTimeout(this.deadline); clearTimeout(this.limit);
    this.hooks.stopCapture();
    if (this.socket) {
      this.socket.onopen = this.socket.onmessage = this.socket.onerror = this.socket.onclose = null;
      try {
        if (this.socket.readyState === 1 && this.sessionId) {
          const message: BrowserMessage = { type: 'session.end', sessionId: this.sessionId, reason: 'user' };
          this.socket.send(JSON.stringify(message));
        }
        this.socket.close();
      } catch { /* No transport retry; capture has already stopped. */ }
    }
    const normalEnd = phase === 'ended';
    const assessment = normalEnd && this.state.assessment?.level !== 'safe' ? this.state.assessment : null;
    this.update({ ...(normalEnd ? this.state : initialLiveState), phase, detail, assessment, warning: '' });
  }
  private update(state: LiveState): void { this.state = state; this.hooks.change(state); }
}
