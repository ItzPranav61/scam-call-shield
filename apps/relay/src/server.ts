import { allowedOrigins as parseOrigins } from './config.js';
import { gnaniUsage } from './usage.js';
import { GnaniSttProvider } from './providers/gnani-stt.js';
import { gnaniSttLanguage } from './providers/gnani-languages.js';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { performance } from 'node:perf_hooks';
import { TextDecoder } from 'node:util';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { analyze, createDetectorState, SIGNAL_REASONS, type SignalGroup } from '@scamcall/detector';
import type { BrowserMessage, RelayMessage } from '@scamcall/protocol';
import { AUDIO, browserMessageSchema, relayMessageSchema } from './validation.js';
import { createPacedEmitter } from './pcm.js';
import { MockSttProvider, MockTtsProvider, MOCK_VOICE } from './providers/mock.js';
import type { SttProvider, TtsProvider } from './providers/types.js';
import { loadScenarios } from './scenarios.js';
import { GnaniTtsProvider } from './providers/gnani-tts.js';
import { WarningAudioCache } from './warning-cache.js';

interface RelayOptions {
  mode?: 'mock' | 'live';
  maxConcurrentSessions?: number;
  maxSessionSeconds?: number;
  disabled?: () => boolean;
  analyze?: typeof analyze;
  createSttProvider?: (segments?: readonly string[]) => SttProvider;
  ttsProvider?: TtsProvider;
  voice?: string;
  log?: (event: { stage: string; sessionId: string | null; latencyMs: number; text?: string; audioSeconds?: number; ttsCharacters?: number }) => void;
}

function asBuffer(raw: RawData): Buffer {
  if (Array.isArray(raw)) return Buffer.concat(raw);
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
}

let activeSessions = 0;

export function createRelay(options: RelayOptions = {}): { server: Server; close: () => Promise<void> } {
  const mode = options.mode ?? process.env.RELAY_MODE ?? 'mock';
  if (mode !== 'mock' && mode !== 'live') throw new Error('Invalid RELAY_MODE');
  const requestedMax = options.maxSessionSeconds ?? Number(process.env.MAX_SESSION_SECONDS ?? 300);
  const maxSeconds = mode === 'live' ? Math.min(requestedMax, 840) : requestedMax;
  const concurrentCap = options.maxConcurrentSessions ?? Number(process.env.MAX_CONCURRENT_SESSIONS ?? 3);
  if (!Number.isInteger(concurrentCap) || concurrentCap < 1) throw new Error('Invalid MAX_CONCURRENT_SESSIONS');
  if (!Number.isFinite(requestedMax) || maxSeconds <= 0 || maxSeconds * 1000 > 2147483647) {
    throw new Error('Invalid MAX_SESSION_SECONDS');
  }
  const disabled = options.disabled ?? (() => process.env.RELAY_DISABLED === '1');
  const analyzeSegment = options.analyze ?? analyze;
  const scenarios = loadScenarios();
  const voice = options.voice ?? MOCK_VOICE;
  const log = options.log ?? ((event) => console.info(JSON.stringify(event)));
  const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
  let shuttingDown = false;
  let closing: Promise<void> | undefined;
  const shutdownHandlers = new Set<() => void>();
  const server = createServer((request, response) => {
    if (request.url !== '/health') {
      response.writeHead(404).end();
    } else if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end();
    } else {
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.has(origin)) { response.writeHead(403, { Vary: 'Origin' }).end(); return; }
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin',
        ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) });
      response.end(JSON.stringify({ ok: true, mode }));
    }
  });
  // A bounded transport ceiling; application limits below return recoverable errors.
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });
  const ttsProvider = options.ttsProvider ?? (mode === 'live' ? new GnaniTtsProvider() : new MockTtsProvider());
  const audioCache = new WarningAudioCache(ttsProvider);
  server.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    const status = shuttingDown ? 503 : request.url !== '/ws' ? 404
      : !origin || !allowedOrigins.has(origin) || disabled() ? 403 : 0;
    if (status) {
      const reason = status === 503 ? 'Service Unavailable' : status === 404 ? 'Not Found' : 'Forbidden';
      socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws));
  });
  wss.on('connection', (ws) => {
    let started = false;
    let sessionId: string | null = null;
    let active = false;
    let sessionReady = false;
    let counted = false;
    let killTimer: ReturnType<typeof setInterval> | undefined;
    let startedAt = performance.now();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let stt: SttProvider | undefined;
    let scenarioSession = false;
    let detectorState = createDetectorState();
    let lastRisk: { level: typeof detectorState.level; score: number } | undefined;
    const evidence = new Map<SignalGroup, string>();
    const warned = new Set<string>();
    const pace = createPacedEmitter((frame) => {
      if (active) {
        const before = performance.now();
        stt?.write(frame);
        stage('audio.forward', before);
      }
    });
    function stage(name: string, since: number, text?: string) {
      log({ stage: name, sessionId, latencyMs: Math.max(0, performance.now() - since),
        ...(process.env.DEBUG_TRANSCRIPTS === '1' && text !== undefined ? { text } : {}) });
    }
    function cleanup() {
      if (counted) {
        counted = false;
        activeSessions--;
        log({ stage: 'gnani.usage', sessionId, latencyMs: 0,
          audioSeconds: Number(gnaniUsage.audioSeconds.toFixed(3)), ttsCharacters: gnaniUsage.ttsCharacters });
      }
      if (killTimer) clearInterval(killTimer);
      active = false;
      sessionReady = false;
      if (timeout) clearTimeout(timeout);
      timeout = undefined;
      stt?.stop();
      pace.stop();
      evidence.clear();
      warned.clear();
      detectorState = createDetectorState();
      lastRisk = undefined;
    }
    function send(message: RelayMessage): boolean {
      const checked = relayMessageSchema.safeParse(message);
      if (!checked.success) {
        cleanup();
        ws.close(1011, 'Invalid internal message');
        return false;
      }
      if (ws.readyState !== WebSocket.OPEN) return false;
      if (ws.bufferedAmount > 256 * 1024) {
        cleanup();
        ws.close(1008, 'Output queue full');
        return false;
      }
      ws.send(JSON.stringify(checked.data));
      return true;
    }
    function invalid() {
      send({ type: 'session.error', sessionId, code: 'INVALID_MESSAGE',
        message: 'Invalid message or session state.', recoverable: true });
    }
    function end(reason: 'user' | 'timeout' | 'error') {
      if (!active || !sessionId) return;
      cleanup();
      send({ type: 'session.end', sessionId, reason });
      stage('session.end', startedAt);
    }
    function start(message: Extract<BrowserMessage, { type: 'session.start' }>) {
      if (started) { invalid(); return; }
      if (disabled()) {
        send({ type: 'session.error', sessionId: null, code: 'UPSTREAM_UNAVAILABLE',
          message: 'Relay is disabled.', recoverable: false });
        return;
      }
      if (activeSessions >= concurrentCap) {
        send({ type: 'session.error', sessionId: null, code: 'UPSTREAM_UNAVAILABLE',
          message: 'Concurrent session limit reached.', recoverable: true });
        return;
      }
      if (mode === 'live' && (!gnaniSttLanguage(message.languageCode) || message.scenario !== undefined)) { invalid(); return; }
      const script = message.scenario === undefined ? undefined : scenarios.get(message.scenario);
      if (message.scenario !== undefined && !script) { invalid(); return; }
      let provider = options.createSttProvider?.(script) ?? (mode === 'live' ? new GnaniSttProvider() : new MockSttProvider(script));
      if (message.scenario !== undefined && !(provider instanceof MockSttProvider)) {
        if (process.env.DEMO_MODE !== '1') { invalid(); return; }
        // Explicit demos always replay fixtures, never start a real upstream provider.
        provider = new MockSttProvider(script);
      }
      started = true;
      active = true;
      counted = true;
      activeSessions++;
      sessionId = randomUUID();
      startedAt = performance.now();
      scenarioSession = message.scenario !== undefined;
      detectorState = createDetectorState(message.languageCode);
      stt = provider;
      function publishReady() {
        if (!active || sessionReady) return;
        sessionReady = true;
        send({ type: 'session.ready', sessionId: sessionId!, audio: AUDIO });
        stage(mode === 'live' ? 'session.ready.live' : 'session.ready.mock', startedAt);
      }
      stt.start({ language: message.languageCode, audio: message.audio }, (segment) => {
        if (!active || !sessionId) return;
        const received = performance.now();
        if (!send({ type: 'transcript.final', sessionId, segment })) return;
        stage(mode === 'live' ? 'transcript.live' : 'transcript.mock', startedAt, segment.text);
        let analysis: ReturnType<typeof analyze>;
        try { analysis = analyzeSegment(segment.text, detectorState); }
        catch {
          // Never log the exception: its message may contain transcript text or credentials.
          stage('detector.error', received);
          stage('stt->detector', received);
          send({ type: 'session.error', sessionId, code: 'INTERNAL_ERROR',
            message: 'Detector failed for this segment; analysis will continue.', recoverable: true });
          stage('total', received);
          return;
        }
        const detectorDone = performance.now();
        stage('stt->detector', received);
        detectorState = analysis.state;
        for (const group of detectorState.signalGroups) {
          if (!evidence.has(group)) evidence.set(group, segment.segmentId);
        }
        const { result } = analysis;
        // Publish one initial baseline; thereafter suppress unchanged level/score pairs.
        if (!lastRisk || result.level !== lastRisk.level || result.score !== lastRisk.score) {
          if (!send({ type: 'risk.update', sessionId, assessment: {
            level: result.level,
            indicators: detectorState.signalGroups.map((group) => ({ code: group,
              explanation: SIGNAL_REASONS[group], segmentIds: [evidence.get(group)!] })),
            summary: `${mode === 'live' ? 'Rules-only indicators on recognized speech.' : 'Rules-only indicators on synthetic mock transcripts.'} ${result.advice}`,
          } })) return;
          lastRisk = { level: result.level, score: result.score };
        }
        if (result.warningCode && !warned.has(result.warningCode)) {
          warned.add(result.warningCode);
          const audioSession = sessionId;
          void (async () => {
            try {
              const warningVoice = ttsProvider instanceof GnaniTtsProvider
                ? message.languageCode === 'mr-IN' ? process.env.GNANI_TTS_VOICE_MR_IN ?? 'Zahira'
                  : process.env.GNANI_TTS_VOICE_HI_EN ?? 'Poorvi' : voice;
              const audio = await audioCache.get(result.warningCode!, message.languageCode, warningVoice,
                (source) => stage(`tts.${source}`, detectorDone));
              if (!active || sessionId !== audioSession) return;
              const audioMessage = { type: 'warning.audio' as const, warningCode: result.warningCode!,
                language: message.languageCode, mimeType: 'audio/wav' as const, audioBase64: Buffer.from(audio).toString('base64') };
              if (!relayMessageSchema.safeParse(audioMessage).success) throw new Error('Warning audio does not fit the existing contract');
              if (!send({ type: 'warning', sessionId: audioSession, code: result.warningCode!,
                message: `${ttsProvider instanceof GnaniTtsProvider ? 'Warning indicators.' : 'Mock warning audio.'} ${result.advice}` })) return;
              send(audioMessage);
              stage('detector->tts', detectorDone);
            } catch {
              if (!active || sessionId !== audioSession) return;
              stage('tts.error', detectorDone);
              send({ type: 'session.error', sessionId: audioSession, code: 'INTERNAL_ERROR',
                message: 'Warning audio unavailable; analysis will continue.', recoverable: true });
            }
          })();
        }
        stage('total', received);
      }, (event) => {
        if (event.type === 'connected' && mode === 'live') publishReady();
        if (event.type === 'error' && active) {
          send({ type: 'session.error', sessionId, code: 'UPSTREAM_UNAVAILABLE',
            message: event.message, recoverable: true });
        }
      });
      if (mode === 'mock') publishReady();
      killTimer = setInterval(() => {
        if (active && disabled()) {
          send({ type: 'session.error', sessionId, code: 'UPSTREAM_UNAVAILABLE', message: 'Relay is disabled.', recoverable: false });
          end('error');
        }
      }, 100);
      timeout = setTimeout(() => {
        send({ type: 'session.error', sessionId, code: 'SESSION_EXPIRED',
          message: 'Maximum session length reached.', recoverable: false });
        end('timeout');
      }, maxSeconds * 1000);
    }
    ws.on('message', (raw, binary) => {
      const bytes = asBuffer(raw);
      if (binary) {
        if (active && scenarioSession) return;
        // PCM cannot identify its own sample rate/channels: enforce declared config and frame size.
        const wavHeader = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE';
        if (!active || !sessionReady || bytes.byteLength % 2 || bytes.byteLength !== 1024 || wavHeader || !pace.enqueue(bytes)) invalid();
        return;
      }
      if (bytes.byteLength > 16 * 1024) { invalid(); return; }
      let input: unknown;
      try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
      catch { invalid(); return; }
      const parsed = browserMessageSchema.safeParse(input);
      if (!parsed.success) { invalid(); return; }
      if (parsed.data.type === 'session.start') start(parsed.data);
      else if (!active || parsed.data.sessionId !== sessionId) invalid();
      else end('user');
    });
    const shutdown = () => {
      if (active) end('error'); else cleanup();
      ws.close(1000, 'Server shutdown');
    };
    shutdownHandlers.add(shutdown);
    ws.on('close', () => { cleanup(); shutdownHandlers.delete(shutdown); });
    ws.on('error', cleanup);
  });
  return {
    server,
    close: () => {
      if (closing) return closing;
      shuttingDown = true;
      closing = (async () => {
        const httpClosed = new Promise<void>((resolve, reject) => {
          if (!server.listening) { resolve(); return; }
          server.close((error) => error ? reject(error) : resolve());
          server.closeIdleConnections();
        });
        for (const shutdown of shutdownHandlers) shutdown();
        // Attempt a normal handshake first, then bound shutdown for unresponsive peers.
        const deadline = setTimeout(() => {
          for (const ws of wss.clients) ws.terminate();
          server.closeAllConnections();
        }, 5000);
        deadline.unref();
        const socketsClosed = new Promise<void>((resolve) => wss.close(() => resolve()));
        try { await Promise.all([httpClosed, socketsClosed]); }
        finally { clearTimeout(deadline); audioCache.clear(); }
      })();
      return closing;
    },
  };
}


/** Compatibility entry for existing synthetic tests and demos. */
export function createMockRelay(options: RelayOptions = {}) {
  return createRelay({ ...options, mode: 'mock' });
}
