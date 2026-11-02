import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { PcmEncoder, warningBytes } from '../lib/relay/pcm';

import { wav } from './fixtures';

describe('browser PCM boundary', () => {
  it('encodes signed PCM16 little endian, clips values, and silences nonfinite input', () => {
    const encoder = new PcmEncoder(16000);
    const samples = new Float32Array(512);
    samples.set([-2, 0, 2, NaN, Infinity]);
    const frame = encoder.push(samples)[0]!;
    expect([...frame.slice(0, 10)]).toEqual([0, 128, 0, 0, 255, 127, 0, 0, 0, 0]);
  });
  it.each([16000, 44100, 48000])('produces exactly 16 kHz at source rate %i across arbitrary callback boundaries', rate => {
    const samples = Float32Array.from({ length: rate * 2 }, (_, i) => Math.sin(i / 30));
    const whole = new PcmEncoder(rate).push(samples);
    const streaming = new PcmEncoder(rate);
    const frames: Uint8Array[] = [];
    for (let i = 0; i < samples.length; i += 127) frames.push(...streaming.push(samples.slice(i, i + 127)));
    expect(frames.length).toBe(62); // 32000 samples: 62 complete frames and a discarded tail.
    expect(frames.every(frame => frame.length === 1024)).toBe(true);
    expect(frames).toEqual(whole);
  });
  it('drops partial samples/frames when cleared', () => {
    const encoder = new PcmEncoder(48000);
    expect(encoder.push(new Float32Array(1000))).toEqual([]);
    encoder.clear();
    expect(encoder.push(new Float32Array(1535))).toEqual([]);
    expect(encoder.push(new Float32Array(1))).toHaveLength(1);
  });
  it.each([0, 8000, NaN, Infinity])('rejects invalid source rate %s', rate => {
    expect(() => new PcmEncoder(rate)).toThrow();
  });
  it('mixes stereo to mono in the actual worklet and leaves output silent', () => {
    const posted: Float32Array[] = [];
    let Processor: new () => { process(inputs: Float32Array[][]): boolean };
    runInNewContext(readFileSync(new URL('../public/audio/pcm-capture.worklet.js', import.meta.url), 'utf8'), {
      Float32Array,
      AudioWorkletProcessor: class { port = { postMessage: (data: Float32Array) => posted.push(data) }; },
      registerProcessor: (_name: string, processor: typeof Processor) => { Processor = processor; },
    });
    const processor = new Processor!();
    expect(processor.process([[new Float32Array([1, -1]), new Float32Array([-1, 1])]])).toBe(true);
    expect([...posted[0]!]).toEqual([0, 0]);
    expect(processor.process([])).toBe(true);
    expect(posted).toHaveLength(1);
  });
  it('validates complete 16 kHz mono PCM16 warning WAVs', () => {
    expect(warningBytes(wav()).length).toBe(46);
    expect(() => warningBytes('AAAA')).toThrow();
    const bytes = warningBytes(wav());
    new DataView(bytes.buffer).setUint32(24, 48000, true);
    expect(() => warningBytes(btoa(String.fromCharCode(...bytes)))).toThrow();
  });
});
