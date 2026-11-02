import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPacedEmitter, rechunkPcm16 } from '../src/pcm.js';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
describe('PCM16 rechunker', () => {
  it('preserves exact byte order across calls and returns full frames with a separate tail', () => {
    const source = Uint8Array.from({ length: 3000 }, (_, i) => i % 256);
    const first = rechunkPcm16(source.slice(0, 600));
    expect(first.frames).toHaveLength(0);
    expect(first.remainder).toHaveLength(600);
    const second = rechunkPcm16(source.slice(600), first.remainder);
    expect(second.frames.map((frame) => frame.length)).toEqual([1024, 1024]);
    expect(second.remainder).toHaveLength(952);
    expect(Buffer.concat([...second.frames, second.remainder])).toEqual(Buffer.from(source));
    expect(first.remainder).toEqual(source.slice(0, 600));
    // Caller can discard the tail on session end; no implicit padding or emission.
    expect(rechunkPcm16(new Uint8Array()).remainder).toHaveLength(0);
    expect(rechunkPcm16(new Uint8Array(1024)).remainder).toHaveLength(0);
  });
  it('rejects odd input and malformed remainder rather than inventing a PCM sample', () => {
    expect(() => rechunkPcm16(new Uint8Array(3))).toThrow();
    expect(() => rechunkPcm16(new Uint8Array(2), new Uint8Array(1))).toThrow();
    expect(() => rechunkPcm16(new Uint8Array(2), new Uint8Array(1024))).toThrow();
  });
  it('emits five frames at exact 32 ms sender deadlines without relying on socket arrival time', () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const times: number[] = [];
    const sizes: number[] = [];
    const pace = createPacedEmitter(frame => { times.push(Date.now()); sizes.push(frame.length); });
    for (let i = 0; i < 5; i++) expect(pace.enqueue(new Uint8Array(1024))).toBe(true);
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(31); expect(times).toHaveLength(i);
      vi.advanceTimersByTime(1); expect(times).toHaveLength(i + 1);
    }
    expect(times).toEqual([32, 64, 96, 128, 160]);
    expect(sizes).toEqual([1024, 1024, 1024, 1024, 1024]);
    pace.enqueue(new Uint8Array(1024)); pace.stop();
    vi.advanceTimersByTime(1000); expect(times).toHaveLength(5);
  });
  it.each([1, 8])('has no accumulating timer drift for 300 s with %i-frame bursts and 1 ms late callbacks', burst => {
    vi.useFakeTimers();
    const nativeTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) =>
      nativeTimeout(callback, (delay ?? 0) + 1, ...args)) as typeof setTimeout);
    const times: number[] = []; let produced = 0;
    const pace = createPacedEmitter(() => times.push(performance.now()));
    for (let time = 0; time < 300000; time += burst * 32) {
      for (let i = 0; i < burst; i++) { expect(pace.enqueue(new Uint8Array(1024))).toBe(true); produced++; }
      vi.advanceTimersByTime(Math.min(burst * 32, 300000 - time));
    }
    vi.advanceTimersByTime(256);
    expect(times).toHaveLength(produced);
    expect(times.at(-1)).toBe(produced * 32 + 1);
    expect((times.at(-1)! - times[0]!) / (produced - 1)).toBe(32);
    for (let i = 0; i < times.length; i++) expect(times[i]!).toBeGreaterThanOrEqual((i + 1) * 32);
    pace.stop();
  });
  it('rejects the 129th queued frame if a consumer cannot drain', () => {
    vi.useFakeTimers(); const pace = createPacedEmitter(vi.fn());
    for (let i = 0; i < 128; i++) expect(pace.enqueue(new Uint8Array(1024))).toBe(true);
    expect(pace.enqueue(new Uint8Array(1024))).toBe(false); pace.stop();
  });
  it('paces frames at 32 ms, bounds its queue, and discards queued frames on stop', () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const pace = createPacedEmitter(emit, 2);
    expect(pace.enqueue(new Uint8Array(2))).toBe(false);
    const input = Buffer.alloc(1024, 7);
    expect(pace.enqueue(input)).toBe(true);
    input.fill(0);
    expect(pace.enqueue(new Uint8Array(1024))).toBe(true);
    expect(pace.enqueue(new Uint8Array(1024))).toBe(false);
    vi.advanceTimersByTime(31);
    expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]?.[0]).toEqual(new Uint8Array(1024).fill(7));
    vi.advanceTimersByTime(32);
    expect(emit).toHaveBeenCalledTimes(2);
    pace.enqueue(new Uint8Array(1024));
    pace.stop();
    vi.advanceTimersByTime(1000);
    expect(emit).toHaveBeenCalledTimes(2);
    expect(pace.enqueue(new Uint8Array(1024))).toBe(false);
  });
});
