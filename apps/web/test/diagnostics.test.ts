import { afterEach, describe, expect, it, vi } from 'vitest';
import { StreamDiagnostics } from '../lib/relay/diagnostics';

afterEach(() => vi.useRealTimers());
describe('isolated diagnostics snapshots', () => {
  it('does not mutate a published snapshot before its 250 ms notification', () => {
    vi.useFakeTimers();
    const store = new StreamDiagnostics(); const listener = vi.fn(); const off = store.subscribe(listener);
    const original = store.getSnapshot();
    store.transport({ framesSent: 1, bytesSent: 1024, lastMessageType: null, lastMessageAt: null });
    vi.advanceTimersByTime(249); expect(listener).not.toHaveBeenCalled(); expect(original.transport.framesSent).toBe(0);
    vi.advanceTimersByTime(1); expect(listener).toHaveBeenCalledOnce(); expect(store.getSnapshot().transport.framesSent).toBe(1);
    off();
  });
  it('publishes no more than four updates per second through 300 seconds of counters and levels', () => {
    vi.useFakeTimers(); const store = new StreamDiagnostics(); const listener = vi.fn(); const off = store.subscribe(listener);
    let frames = 0;
    const producer = setInterval(() => {
      frames++;
      store.transport({ framesSent: frames, bytesSent: frames * 1024, lastMessageType: 'session.ready', lastMessageAt: 0 });
      store.level({ peak: 0.8, rms: 0.4 });
    }, 32);
    for (let second = 0; second < 300; second++) {
      const before = listener.mock.calls.length; vi.advanceTimersByTime(1000);
      expect(listener.mock.calls.length - before).toBeLessThanOrEqual(4);
    }
    clearInterval(producer); vi.advanceTimersByTime(250);
    expect(store.getSnapshot().transport.framesSent).toBe(9375);
    expect(store.getSnapshot().transport.bytesSent).toBe(9375 * 1024);
    off(); expect(vi.getTimerCount()).toBe(0);
  });
});
