import { initialTransport, type TransportDiagnostics } from '../lib/relay/diagnostics';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelayClient, initialLiveState, type LiveState, type RelaySocket } from '../lib/relay/client';
import { AUDIO, parseRelayMessage, relayUrl } from '../lib/relay/messages';
import { wav } from './fixtures';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function harness() {
  let state: LiveState = initialLiveState;
  let diagnostics: TransportDiagnostics = { ...initialTransport };
  const change = vi.fn((next: LiveState) => { state = next; });
  let push = (_frame: Uint8Array) => {};
  const socket: RelaySocket = { readyState: 1, bufferedAmount: 0, onopen: null, onmessage: null, onerror: null, onclose: null, send: vi.fn(), close: vi.fn() };
  const capture = vi.fn(async (callback: typeof push) => { push = callback; });
  const stopCapture = vi.fn();
  const playWarning = vi.fn();
  const connect = vi.fn(() => socket);
  const client = new RelayClient({ socket: connect, capture, stopCapture, playWarning, change, diagnostics: value => { diagnostics = { ...value }; } });
  const receive = (value: unknown) => socket.onmessage?.({ data: JSON.stringify(value) });
  return { client, socket, connect, capture, stopCapture, playWarning, receive, change, diagnostics: () => diagnostics, state: () => state, push: (frame: Uint8Array) => push(frame) };
}
const ready = { type: 'session.ready', sessionId: 's', audio: AUDIO };
const transcript = { type: 'transcript.final', sessionId: 's', segment: { segmentId: 'a', text: 'Synthetic OTP request', languageCode: 'en-IN' } };
const risk = (level: string) => ({ type: 'risk.update', sessionId: 's', assessment: { level, summary: 'Synthetic indicators', indicators: [{ code: 'otp', explanation: 'Sensitive code request', segmentIds: ['a'] }] } });

describe('real relay client with a fake WebSocket', () => {
  it('requires consent before opening a socket or starting a microphone', () => {
    const h = harness();
    expect(() => h.client.start('ws://localhost:8787/ws', false, 'en-IN')).toThrow('Consent');
    expect(h.connect).not.toHaveBeenCalled(); expect(h.capture).not.toHaveBeenCalled();
  });
  it('sends the exact v1.2 scenario request and renders relay output without microphone capture', () => {
    const h = harness();
    h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp'); h.socket.onopen?.();
    expect(JSON.parse(vi.mocked(h.socket.send).mock.calls[0]![0] as string)).toEqual({ type: 'session.start', version: 1, consent: true, languageCode: 'en-IN', audio: AUDIO, scenario: 'kyc-otp' });
    expect(h.state().phase).toBe('connecting'); h.receive(ready);
    expect(h.state().phase).toBe('listening'); expect(h.capture).not.toHaveBeenCalled();
    h.receive(transcript); h.receive(transcript); h.receive(risk('caution'));
    expect(h.state().transcripts).toHaveLength(1); expect(h.state().assessment?.level).toBe('caution');
    h.receive(risk('danger')); expect(h.state().assessment?.level).toBe('danger'); h.client.stop();
  });
  it.each(['safe', 'caution', 'danger'])('handles %s after user Stop and relay session.end', level => {
    for (const ending of ['user', 'relay']) {
      const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp');
      h.receive(ready); h.receive(transcript); h.receive(risk(level));
      if (ending === 'user') h.client.stop();
      else h.receive({ type: 'session.end', sessionId: 's', reason: 'timeout' });
      expect(h.state().phase).toBe('ended');
      expect(h.state().assessment?.level ?? null).toBe(level === 'safe' ? null : level);
      expect(h.state().transcripts).toHaveLength(1);
      const next = harness(); next.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp');
      expect(next.state().assessment).toBeNull(); expect(next.state().transcripts).toEqual([]);
      expect(next.state().warning).toBe(''); next.client.stop();
    }
  });
  it.each(['error', 'offline', 'error-end'])('clears all session results on %s', ending => {
    const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp');
    h.receive(ready); h.receive(transcript); h.receive(risk('danger'));
    if (ending === 'offline') h.socket.onclose?.();
    else if (ending === 'error-end') h.receive({ type: 'session.end', sessionId: 's', reason: 'error' });
    else h.receive({ type: 'session.error', sessionId: 's', code: 'INVALID_MESSAGE', message: 'Invalid input', recoverable: true });
    expect(h.state().assessment).toBeNull(); expect(h.state().transcripts).toEqual([]); expect(h.state().warning).toBe('');
  });
  it('waits for readiness and sends completed worklet frames immediately', async () => {
    vi.useFakeTimers(); const h = harness();
    h.client.start('ws://localhost:8787/ws', true, 'hi-IN'); h.socket.onopen?.();
    expect(h.capture).not.toHaveBeenCalled(); h.receive(ready); await Promise.resolve();
    h.push(new Uint8Array(1024)); h.push(new Uint8Array(1024));
    await vi.advanceTimersByTimeAsync(31);
    expect(vi.mocked(h.socket.send).mock.calls.filter(([value]) => value instanceof ArrayBuffer)).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(33);
    const frames = vi.mocked(h.socket.send).mock.calls.filter(([value]) => value instanceof ArrayBuffer);
    expect(frames).toHaveLength(2); expect((frames[0]![0] as ArrayBuffer).byteLength).toBe(1024);
    h.client.stop(); expect(h.stopCapture).toHaveBeenCalled();
    expect(JSON.parse(vi.mocked(h.socket.send).mock.calls.at(-1)![0] as string)).toEqual({ type: 'session.end', sessionId: 's', reason: 'user' });
  });
  it('counts only frames actually sent and records message type/time per session', async () => {
    vi.useFakeTimers(); const h = harness();
    h.client.start('ws://localhost:8787/ws', true, 'en-IN'); h.socket.onopen?.();
    expect(h.diagnostics().framesSent).toBe(0);
    h.receive(ready); await Promise.resolve();
    h.push(new Uint8Array(1024)); h.push(new Uint8Array(1024));
    expect(h.diagnostics().bytesSent).toBe(2048);
    await vi.advanceTimersByTimeAsync(64);
    expect(h.diagnostics().framesSent).toBe(2);
    expect(h.diagnostics().bytesSent).toBe(2048);
    h.receive(transcript);
    expect(h.diagnostics().lastMessageType).toBe('transcript.final');
    expect(h.diagnostics().lastMessageAt).toBe(Date.now());
    h.client.stop(); expect(h.diagnostics().bytesSent).toBe(2048);
    const next = harness(); next.client.start('ws://localhost:8787/ws', true, 'en-IN');
    expect(next.diagnostics().framesSent).toBe(0); next.client.stop();
  });
  it('does not count a failed audio send', async () => {
    vi.useFakeTimers(); const h = harness();
    h.client.start('ws://localhost:8787/ws', true, 'en-IN'); h.receive(ready); await Promise.resolve();
    vi.mocked(h.socket.send).mockImplementation(() => { throw new Error('Disconnected'); });
    h.push(new Uint8Array(1024)); await vi.advanceTimersByTimeAsync(32);
    expect(h.diagnostics().bytesSent).toBe(0);
    expect(h.state().phase).toBe('relay-offline');
  });
  it.each([1, 8])('streams 300 simulated seconds with %i-frame source bursts and no parent updates per frame', async burst => {
    vi.useFakeTimers(); const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN');
    h.receive(ready); await Promise.resolve();
    let produced = 0;
    for (let time = 0; time < 300000; time += burst * 32) {
      for (let i = 0; i < burst; i++) { h.push(new Uint8Array(1024)); produced++; }
      vi.advanceTimersByTime(Math.min(burst * 32, 300000 - time));
    }
    expect(h.diagnostics().framesSent).toBe(produced);
    expect(h.diagnostics().bytesSent).toBe(produced * 1024);
    expect(h.state().phase).toBe('ended'); // Existing five-minute cap, never an overflow error.
    expect(h.change).toHaveBeenCalledTimes(3); // connecting, listening, ended only.
  });
  it('rejects risk decreases and clears stale assessments', () => {
    const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp');
    h.receive(ready); h.receive(transcript); h.receive(risk('danger')); h.receive(risk('safe'));
    expect(h.state().phase).toBe('error'); expect(h.state().assessment).toBeNull();
  });
  it('shows a session.error plainly and stops uncertain monitoring even if recoverable', () => {
    const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', '../.env');
    h.receive({ type: 'session.error', sessionId: null, code: 'INVALID_MESSAGE', message: 'Unknown scenario', recoverable: true });
    expect(h.state().detail).toBe('INVALID_MESSAGE: Unknown scenario'); expect(h.state().phase).toBe('error');
  });
  it('invalidates risk on connection loss, ignores stale events, and never auto reconnects', () => {
    const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp');
    h.receive(ready); h.receive(transcript); h.receive(risk('danger'));
    const stale = h.socket.onmessage; h.socket.onclose?.();
    stale?.({ data: JSON.stringify(transcript) });
    expect(h.state().phase).toBe('relay-offline'); expect(h.state().assessment).toBeNull(); expect(h.connect).toHaveBeenCalledOnce();
    expect(() => h.client.start('ws://localhost:8787/ws', true, 'en-IN')).toThrow('fresh');
  });
  it('requires a fresh explicit start after ended', () => {
    const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp'); h.receive(ready);
    h.receive({ type: 'session.end', sessionId: 's', reason: 'timeout' });
    expect(h.state().phase).toBe('ended'); expect(h.stopCapture).toHaveBeenCalled();
  });
  it('times out an offline relay and enforces a five-minute local limit', async () => {
    vi.useFakeTimers(); const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN');
    await vi.advanceTimersByTimeAsync(15000); expect(h.state().phase).toBe('relay-offline');
    const next = harness(); next.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp'); next.receive(ready);
    await vi.advanceTimersByTimeAsync(300000); expect(next.state().phase).toBe('ended');
  });
  it('rejects malformed PCM and stalled transport beyond 256 KB', async () => {
    const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN'); h.receive(ready); await Promise.resolve();
    h.push(new Uint8Array(1023)); expect(h.state().phase).toBe('error');
    const next = harness(); next.client.start('ws://localhost:8787/ws', true, 'en-IN'); next.receive(ready); await Promise.resolve();
    next.socket.bufferedAmount = 256 * 1024;
    next.push(new Uint8Array(1024));
    expect(next.state().phase).toBe('relay-offline');
    expect(next.state().detail).toContain('Relay connection too slow');
  });
  it('plays validated warning audio only once per code after risk', () => {
    const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp'); h.receive(ready); h.receive(transcript); h.receive(risk('danger'));
    const warning = { type: 'warning.audio', warningCode: 'SENSITIVE_REQUEST', language: 'en-IN', mimeType: 'audio/wav', audioBase64: wav() };
    h.receive(warning); h.receive(warning); expect(h.playWarning).toHaveBeenCalledOnce(); h.client.stop();
  });
  it('rejects a warning before risk, wrong sessions and unknown fields', () => {
    for (const message of [{ ...ready, extra: 'untrusted' }, { ...transcript, sessionId: 'other' }, { type: 'warning.audio', warningCode: 'SENSITIVE_REQUEST', language: 'en-IN', mimeType: 'audio/wav', audioBase64: wav() }]) {
      const h = harness(); h.client.start('ws://localhost:8787/ws', true, 'en-IN', 'kyc-otp'); h.receive(ready); h.receive(message);
      expect(h.state().phase).toBe('error');
    }
  });
  it('stops a capture that finishes after the user presses Stop', async () => {
    let resolve!: () => void;
    const capture = new Promise<void>(done => { resolve = done; });
    const stopCapture = vi.fn();
    const socket = harness().socket;
    const client = new RelayClient({ socket: () => socket, capture: () => capture, stopCapture, playWarning: vi.fn(), change: vi.fn() });
    client.start('ws://localhost:8787/ws', true, 'en-IN'); socket.onmessage?.({ data: JSON.stringify(ready) }); client.stop(); resolve();
    await Promise.resolve(); expect(stopCapture).toHaveBeenCalledTimes(2);
  });
});

describe('untrusted protocol input', () => {
  it.each(['ws://remote.example/ws', 'https://host/ws', 'wss://user:pass@host/ws', 'wss://host/ws?key=no', 'wss://host/other'])('rejects unsafe relay URL %s', value => { expect(() => relayUrl(value)).toThrow(); });
  it('allows local ws and remote wss', () => { expect(relayUrl('ws://localhost:8787/ws')).toBe('ws://localhost:8787/ws'); expect(relayUrl('wss://relay.example/ws')).toBe('wss://relay.example/ws'); });
  it('rejects invalid JSON and unrecognized event types', () => { expect(() => parseRelayMessage('{')).toThrow(); expect(() => parseRelayMessage('{"type":"error","fatal":false}')).toThrow(); });
});
