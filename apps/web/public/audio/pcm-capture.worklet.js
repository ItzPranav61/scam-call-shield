/* global AudioWorkletProcessor, registerProcessor */
/* Capture only; output remains silent. Resampling and framing preserve state on the main thread. */
class ShieldPcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length || !channels[0]?.length) return true;
    const mono = new Float32Array(channels[0].length);
    for (const channel of channels) {
      for (let i = 0; i < mono.length; i++) mono[i] += (channel[i] ?? 0) / channels.length;
    }
    this.port.postMessage(mono, [mono.buffer]);
    return true;
  }
}
registerProcessor('shield-pcm-capture', ShieldPcmCapture);
