import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserAudio } from '../lib/relay/browser-audio';

afterEach(() => vi.unstubAllGlobals());
function setup() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] };
  const getUserMedia = vi.fn(async () => stream);
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const node = { port: { onmessage: null as ((event: { data: unknown }) => void) | null }, connect: vi.fn(), disconnect: vi.fn() };
  const close = vi.fn(async () => {});
  const addModule = vi.fn(async () => {});
  vi.stubGlobal('window', { isSecureContext: true });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('AudioContext', class {
    sampleRate = 48000; state = 'running'; destination = {};
    audioWorklet = { addModule }; resume = vi.fn(async () => {}); close = close;
    createMediaStreamSource = () => source;
  });
  vi.stubGlobal('AudioWorkletNode', class { constructor() { return node; } });
  return { track, getUserMedia, source, node, close, addModule, stream };
}

describe('browser microphone ownership', () => {
  it('snapshots settings per Start, measures worklet input, and zeros the meter on Stop', async () => {
    const h = setup();
    const settings = { deviceId: 'synthetic-device', autoGainControl: true, noiseSuppression: false };
    const level = vi.fn();
    const device = new BrowserAudio(vi.fn(), settings, level);
    settings.deviceId = 'changed-for-next-start';
    await device.capture(vi.fn());
    expect(h.getUserMedia).toHaveBeenCalledWith({ video: false, audio: {
      channelCount: 1, echoCancellation: true, deviceId: { exact: 'synthetic-device' }, autoGainControl: true, noiseSuppression: false,
    } });
    h.node.port.onmessage?.({ data: new Float32Array(128).fill(0.5) });
    expect(level).toHaveBeenLastCalledWith({ peak: 0.5, rms: 0.5 });
    device.stop(); expect(level).toHaveBeenLastCalledWith({ peak: 0, rms: 0 });
  });
  it('requests audio only, produces frames after worklet setup and stops all tracks immediately', async () => {
    const h = setup(); const diagnostics = vi.fn(); const device = new BrowserAudio(diagnostics); const push = vi.fn();
    expect(h.getUserMedia).not.toHaveBeenCalled();
    await device.capture(push);
    expect(diagnostics).toHaveBeenLastCalledWith({ permission: 'granted', sampleRate: 48000 });
    expect(h.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }));
    expect(h.addModule).toHaveBeenCalledWith('/audio/pcm-capture.worklet.js');
    for (let i = 0; i < 12; i++) h.node.port.onmessage?.({ data: new Float32Array(128) });
    expect(push).toHaveBeenCalledOnce(); expect(push.mock.calls[0]![0]).toHaveLength(1024);
    device.stop(); expect(h.track.stop).toHaveBeenCalledOnce(); expect(h.node.disconnect).toHaveBeenCalled(); expect(h.node.port.onmessage).toBeNull();
  });
  it('stops a microphone permission request that resolves after Stop', async () => {
    const h = setup(); let resolve!: (value: typeof h.stream) => void;
    h.getUserMedia.mockImplementation(() => new Promise(done => { resolve = done; }));
    const device = new BrowserAudio(); const capture = device.capture(vi.fn());
    device.stop(); resolve(h.stream); await capture;
    expect(h.track.stop).toHaveBeenCalledOnce(); expect(h.source.connect).not.toHaveBeenCalled();
  });
  it('reports permission denial without exposing raw native errors', async () => {
    const h = setup(); h.getUserMedia.mockRejectedValue(new Error('untrusted detail'));
    const device = new BrowserAudio(); await expect(device.capture(vi.fn())).rejects.toThrow('Microphone access denied or unavailable'); device.stop();
  });
  it('rejects insecure pages before requesting permission', async () => {
    const h = setup(); vi.stubGlobal('window', { isSecureContext: false });
    const device = new BrowserAudio(); await expect(device.capture(vi.fn())).rejects.toThrow('HTTPS or localhost');
    expect(h.getUserMedia).not.toHaveBeenCalled(); device.stop();
  });
});
