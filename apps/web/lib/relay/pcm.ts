/** Streaming box resampler: preserve fractional source samples across worklet callbacks. */
export class PcmEncoder {
  private sum = 0;
  private weight = 0;
  private frame = new Uint8Array(1024);
  private offset = 0;
  private readonly ratio: number;

  constructor(sampleRate: number) {
    if (!Number.isFinite(sampleRate) || sampleRate < 16000 || sampleRate > 192000)
      throw new Error('Unsupported microphone sample rate');
    this.ratio = sampleRate / 16000;
  }

  push(samples: Float32Array): Uint8Array[] {
    const frames: Uint8Array[] = [];
    for (const sample of samples) {
      const value = Number.isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0;
      let remaining = 1;
      while (remaining > 1e-9) {
        const used = Math.min(remaining, this.ratio - this.weight);
        this.sum += value * used;
        this.weight += used;
        remaining -= used;
        if (this.weight >= this.ratio - 1e-9) {
          const averaged = this.sum / this.ratio;
          const pcm = Math.round(averaged * (averaged < 0 ? 32768 : 32767));
          new DataView(this.frame.buffer).setInt16(this.offset, pcm, true);
          this.offset += 2;
          this.sum = 0;
          this.weight = 0;
          if (this.offset === 1024) {
            frames.push(this.frame);
            this.frame = new Uint8Array(1024);
            this.offset = 0;
          }
        }
      }
    }
    return frames;
  }

  clear(): void {
    this.sum = this.weight = this.offset = 0;
    this.frame = new Uint8Array(1024);
  }
}

export function warningBytes(base64: string): Uint8Array {
  if (base64.length > 256000) throw new Error('Warning audio is too large');
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const tag = (offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (bytes.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error('Invalid warning WAV');
  if (![0, 0xffffffff, bytes.length - 8].includes(view.getUint32(4, true)))
    throw new Error('Truncated warning WAV');
  let format = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const declared = view.getUint32(offset + 4, true);
    const size = tag(offset) === 'data' && [0, 0xffffffff].includes(declared)
      ? bytes.length - offset - 8 : declared;
    if (offset + 8 + size > bytes.length) throw new Error('Truncated warning WAV');
    if (tag(offset) === 'fmt ') {
      format = size >= 16 && view.getUint16(offset + 8, true) === 1 &&
        view.getUint16(offset + 10, true) === 1 && view.getUint32(offset + 12, true) === 16000 &&
        view.getUint32(offset + 16, true) === 32000 && view.getUint16(offset + 20, true) === 2 &&
        view.getUint16(offset + 22, true) === 16;
    }
    if (tag(offset) === 'data') {
      if (format && size > 0 && size % 2 === 0) return bytes;
      throw new Error('Unsupported warning WAV');
    }
    offset += 8 + size + size % 2;
  }
  throw new Error('Missing warning audio');
}
