export const FRAME_BYTES = 1024;
export const FRAME_MS = 32;

/** Pure: inputs are never modified. Keep an even-length tail until more PCM arrives. */
export function rechunkPcm16(input: Uint8Array, remainder: Uint8Array = new Uint8Array()): {
  frames: Uint8Array[]; remainder: Uint8Array;
} {
  if (input.byteLength % 2 || remainder.byteLength % 2 || remainder.byteLength >= FRAME_BYTES) {
    throw new Error('PCM16 requires even byte lengths and a remainder smaller than one frame');
  }
  const combined = new Uint8Array(remainder.byteLength + input.byteLength);
  combined.set(remainder);
  combined.set(input, remainder.byteLength);
  const frames: Uint8Array[] = [];
  let offset = 0;
  while (offset + FRAME_BYTES <= combined.byteLength) {
    frames.push(combined.slice(offset, offset + FRAME_BYTES));
    offset += FRAME_BYTES;
  }
  return { frames, remainder: combined.slice(offset) };
}

/** Absolute sample-clock deadlines; late callbacks catch up only to the elapsed frame budget. */
export function createPacedEmitter(emit: (frame: Uint8Array) => void, maxFrames = 128) {
  if (!Number.isInteger(maxFrames) || maxFrames < 1) throw new Error('Invalid queue bound');
  const queue: Uint8Array[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let start: number | undefined;
  let emitted = 0;
  const deadline = () => start! + (emitted + 1) * FRAME_MS;
  function schedule() { timer = setTimeout(tick, Math.max(0, Math.ceil(deadline() - performance.now()))); }
  function tick() {
    timer = undefined;
    if (stopped || !queue.length) return;
    if (performance.now() < deadline()) { schedule(); return; }
    const frame = queue.shift()!;
    emitted++;
    emit(frame);
    if (!stopped && queue.length) schedule();
  }
  return {
    enqueue(frame: Uint8Array) {
      if (stopped || frame.byteLength !== FRAME_BYTES || queue.length >= maxFrames) return false;
      const now = performance.now();
      if (start === undefined || (!queue.length && timer === undefined && now - deadline() >= FRAME_MS)) {
        start = now; emitted = 0; // Skip unused slots after an idle gap, never accumulate idle credit.
      }
      queue.push(Uint8Array.from(frame));
      if (timer === undefined) schedule();
      return true;
    },
    stop() {
      stopped = true;
      clearTimeout(timer); timer = undefined; queue.length = 0;
    },
  };
}
