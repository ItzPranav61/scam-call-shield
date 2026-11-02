import { gnaniSttLanguage } from './gnani-languages.js';
import { gnaniUsage } from '../usage.js';
import { WebSocket } from 'ws';
import type { AudioConfig, LanguageCode } from '@scamcall/protocol';
import { createPacedEmitter, FRAME_BYTES, FRAME_MS } from '../pcm.js';
import type { SttEvent, SttProvider, Transcript } from './types.js';

interface Options {
  apiKey?: string;
  /** Local mock-server injection only; production always uses the documented endpoint. */
  url?: string;
  connectTimeoutMs?: number;
  backoffMs?: number;
  maxSessionSeconds?: number;
  retryConnect?: boolean;
  onMessage?: (event: { type: string; fields: string[] }) => void;
  log?: (event: { type: string }) => void;
}

/** Raw-document-only transport. It never persists audio, transcripts or credentials. */
export class GnaniSttProvider implements SttProvider {
  private socket: WebSocket | undefined;
  private running = false;
  private ready = false;
  private pending: Uint8Array[] = [];
  private pace?: ReturnType<typeof createPacedEmitter>;
  private deadline?: ReturnType<typeof setTimeout>;
  private connectDeadline?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private onEvent: ((event: SttEvent) => void) | undefined;

  constructor(private readonly options: Options = {}) {}

  start(config: { language: LanguageCode; audio: AudioConfig }, onTranscript: (segment: Transcript) => void,
    onEvent?: (event: SttEvent) => void): void {
    this.stop();
    this.running = true;
    this.onEvent = onEvent;
    const language = gnaniSttLanguage(config.language);
    const key = this.options.apiKey ?? process.env.GNANI_API_KEY;
    const seconds = this.options.maxSessionSeconds ?? Number(process.env.MAX_SESSION_SECONDS ?? 300);
    if (!language || !key || !Number.isFinite(seconds) || seconds <= 0
        || config.audio.sampleRate !== 16000 || config.audio.channels !== 1
        || config.audio.encoding !== 'pcm_s16le' || config.audio.frameBytes !== FRAME_BYTES) {
      queueMicrotask(() => { if (this.running) this.fail(); });
      return;
    }
    const url = this.options.url ?? 'wss://api.vachana.ai/stt/v3/stream';
    if (this.options.url && !/^ws:\/\/(?:127\.0\.0\.1|localhost):\d+(?:\/|$)/.test(url)) {
      queueMicrotask(() => { if (this.running) this.fail(); });
      return;
    }
    // Always stop before Gnani's fifteen-minute cap, including connection/retry time.
    this.deadline = setTimeout(() => this.fail(), Math.min(seconds, 840) * 1000);
    this.pace = createPacedEmitter((frame) => {
      if (!this.running || this.socket?.readyState !== WebSocket.OPEN) return;
      if (this.socket.bufferedAmount + frame.byteLength > FRAME_BYTES * 128) { this.fail(); return; }
      this.socket.send(frame, (error) => {
        if (!error) gnaniUsage.audioSeconds += FRAME_MS / 1000;
        else if (this.running) this.fail();
      });
    });
    const connect = (attempt: number) => {
      if (!this.running) return;
      let connected = false;
      let failed = false;
      const failConnect = () => {
        if (failed || !this.running || this.socket !== socket) return;
        failed = true;
        clearTimeout(this.connectDeadline);
        socket.terminate();
        if (!connected && attempt === 0 && this.options.retryConnect !== false) {
          this.retryTimer = setTimeout(() => connect(1), this.options.backoffMs ?? 300);
        } else this.fail();
      };
      const socket = new WebSocket(url, {
        headers: { 'x-api-key-id': key, lang_code: language, 'x-sample-rate': '16000', 'x-format': 'verbatim' },
        maxPayload: 64 * 1024,
      });
      this.socket = socket;
      this.connectDeadline = setTimeout(failConnect, this.options.connectTimeoutMs ?? 10000);
      socket.on('error', failConnect); // Never log websocket Error objects or response headers.
      socket.on('close', () => { if (!failed && this.running) failConnect(); });
      socket.on('message', (raw, binary) => {
        if (!this.running || failed || this.socket !== socket) return;
        if (binary) { this.fail(); return; }
        let message: Record<string, unknown>;
        try {
          const parsed: unknown = JSON.parse(raw.toString());
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
          message = parsed as Record<string, unknown>;
        } catch { this.fail(); return; }
        const clean = (name: string) => name.split(key).join('[REDACTED]').slice(0, 80);
        const type = typeof message.type === 'string' ? clean(message.type) : 'invalid';
        this.options.onMessage?.({ type, fields: Object.keys(message).map(clean) });
        if (type === 'connected') {
          const echoed = message.config as Record<string, unknown> | undefined;
          if (connected || echoed?.sample_rate !== 16000 || echoed.chunk_size !== 512) { this.fail(); return; }
          connected = true;
          this.ready = true;
          clearTimeout(this.connectDeadline);
          onEvent?.({ type: 'connected', sampleRate: 16000, chunkSize: 512 });
          for (const frame of this.pending.splice(0)) this.pace?.enqueue(frame);
        } else if (type === 'processing') onEvent?.({ type: 'processing' });
        else if (type === 'transcript') {
          const { text, segment_id, audio_duration_ms, latency } = message;
          if (!connected || typeof text !== 'string' || !text.trim() || text.length > 8000
              || typeof segment_id !== 'string' || !segment_id || segment_id.length > 128
              || typeof audio_duration_ms !== 'number' || !Number.isFinite(audio_duration_ms) || audio_duration_ms < 0
              || typeof latency !== 'number' || !Number.isFinite(latency) || latency < 0
              || text.includes(key) || segment_id.includes(key)) { this.fail(); return; }
          onEvent?.({ type: 'transcript', text, segment_id, audio_duration_ms, latency });
          onTranscript({ text, segmentId: segment_id, languageCode: config.language });
        } else if (type === 'error') this.fail();
        else (this.options.log ?? ((event) => console.info(JSON.stringify(event))))({ type });
      });
    };
    connect(0);
  }

  write(frame: Uint8Array): void {
    if (!this.running) return;
    if (frame.length !== FRAME_BYTES) { this.fail(); return; }
    if (!this.ready) {
      if (this.pending.length >= 128) { this.fail(); return; }
      this.pending.push(Uint8Array.from(frame));
    } else if (!this.pace?.enqueue(frame)) this.fail();
  }

  private fail(): void {
    const callback = this.onEvent;
    this.stop();
    callback?.({ type: 'error', message: 'Realtime transcription unavailable; start a new session to resume monitoring.', recoverable: true });
  }

  stop(): void {
    this.running = false;
    this.ready = false;
    this.pending = [];
    this.pace?.stop();
    for (const timer of [this.deadline, this.connectDeadline, this.retryTimer]) clearTimeout(timer);
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.close(1000);
    else if (this.socket?.readyState === WebSocket.CONNECTING) this.socket.terminate();
    this.socket = undefined;
    this.onEvent = undefined;
  }
}
