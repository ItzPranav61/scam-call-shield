import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { GnaniSttProvider } from '../dist/apps/relay/src/providers/gnani-stt.js';
import { validateWav } from '../dist/apps/relay/src/providers/gnani-tts.js';
import { rechunkPcm16, FRAME_BYTES, FRAME_MS } from '../dist/apps/relay/src/pcm.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
let provider;
let key;
try {
  // Only this process loads credentials; neither headers nor raw errors are printed.
  if (!process.env.GNANI_API_KEY) loadEnvFile(join(root, '.env'));
  key = process.env.GNANI_API_KEY;
  if (!key) throw new Error('GNANI_API_KEY unavailable');
  const rawDoc = await readFile(join(root, 'docs/gnani/raw/api_STT_stt-websocket.md'), 'utf8');
  // This reference mentions x-partials but provides no enabling value/settings schema.
  if (process.argv.includes('--partials')) {
    console.info('partials probe skipped: raw document does not specify how to enable x-partials');
  } else {
    const wav = await readFile(join(root, 'data/warnings/audio/SENSITIVE_REQUEST.hi-en.Poorvi.wav'));
    validateWav(wav);
    let pcm;
    for (let offset = 12; offset + 8 <= wav.length;) {
      const tag = wav.toString('ascii', offset, offset + 4);
      const declared = wav.readUInt32LE(offset + 4);
      const start = offset + 8;
      const size = tag === 'data' && [0, 0xffffffff].includes(declared) ? wav.length - start : declared;
      if (tag === 'data') { pcm = wav.subarray(start, start + size); break; }
      offset = start + size + size % 2;
    }
    if (!pcm) throw new Error('PCM data missing');
    const { frames, remainder } = rechunkPcm16(Buffer.concat([pcm, Buffer.alloc(32000)]));
    if (remainder.length) {
      const padded = new Uint8Array(FRAME_BYTES);
      padded.set(remainder);
      frames.push(padded); // Only final silence is zero-padded to the required frame size.
    }
    if (frames.length * FRAME_MS >= 10000) throw new Error('Probe must remain below ten seconds of audio');
    const started = performance.now();
    let firstMessageMs = null;
    let finalTranscriptMs = null;
    const transcripts = [];
    const partialMessages = [];
    let resolveReady;
    let rejectReady;
    let failed = false;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    provider = new GnaniSttProvider({ maxSessionSeconds: 15, retryConnect: false,
      onMessage: ({ type, fields }) => {
        firstMessageMs ??= performance.now() - started;
        if (type === 'partial_transcript') partialMessages.push(fields);
        console.info(JSON.stringify({ type, fields }));
      } });
    provider.start({ language: 'hi-IN', audio: { encoding: 'pcm_s16le', sampleRate: 16000, channels: 1, frameBytes: 1024 } },
      (segment) => {
        transcripts.push(segment.text);
        finalTranscriptMs = performance.now() - started;
      },
      (event) => {
        if (event.type === 'connected') resolveReady();
        if (event.type === 'error') { failed = true; rejectReady(new Error(event.message)); }
      });
    await ready;
    for (const frame of frames) {
      if (failed) throw new Error('Realtime probe failed during audio');
      provider.write(frame);
      await new Promise((resolve) => setTimeout(resolve, FRAME_MS));
    }
    const waitUntil = performance.now() + 7000;
    while (!transcripts.length && !failed && performance.now() < waitUntil) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    provider.stop();
    if (failed || !transcripts.length) throw new Error('Realtime probe produced no final transcript');
    console.info(JSON.stringify({ transcript: transcripts.join(' ').split(key).join('[REDACTED]'),
      timeToFirstMessageMs: Math.round(firstMessageMs), timeToFinalTranscriptMs: Math.round(finalTranscriptMs),
      audioMs: frames.length * FRAME_MS, frames: frames.length, credits: 'not-reported', partialMessageFields: partialMessages,
      partials: rawDoc.includes('x-partials') ? 'mentioned without enabling value; second run skipped' : 'not documented; second run skipped' }));
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Realtime STT probe failed';
  console.error(key ? message.split(key).join('[REDACTED]') : 'Realtime STT key unavailable');
  process.exitCode = 1;
} finally { provider?.stop(); }
