import { analyze, createDetectorState } from '@scamcall/detector';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { WebSocket } from 'ws';
import { validateWav } from '../dist/apps/relay/src/providers/gnani-tts.js';
import { rechunkPcm16, FRAME_MS } from '../dist/apps/relay/src/pcm.js';

const [path, languageCode = 'en-IN', ...flags] = process.argv.slice(2);
const option = (name) => flags.find((flag) => flag.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const maxAudioSeconds = Number(option('max-audio-seconds') ?? 15);
if (!Number.isFinite(maxAudioSeconds) || maxAudioSeconds <= 0 || maxAudioSeconds > 120) throw new Error('Invalid audio ceiling');
const expected = option('expect');
const settleMs = Number(option('settle-ms') ?? 0);
if (!Number.isFinite(settleMs) || settleMs < 0 || settleMs > 10000) throw new Error('Invalid settle interval');
let requestEndMs;
if (option('timing')) {
  const metadata = JSON.parse(await readFile(option('timing'), 'utf8'));
  const index = Number(option('request-segment')) - 1;
  requestEndMs = metadata.segmentEndsMs[index];
  if (!Number.isFinite(requestEndMs)) throw new Error('Request segment timing unavailable');
}
if (!path || !['en-IN', 'hi-IN', 'mr-IN'].includes(languageCode)) {
  throw new Error('Usage: node apps/relay/scripts/stream-wav.mjs <synthetic.wav> [en-IN|hi-IN|mr-IN]');
}
const wav = await readFile(path);
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
if (!pcm) throw new Error('WAV data missing');
const { frames, remainder } = rechunkPcm16(Buffer.concat([pcm, Buffer.alloc(32000)]));
if (remainder.length) {
  const tail = new Uint8Array(1024);
  tail.set(remainder);
  frames.push(tail); // Pad only final silence to a whole 32 ms frame.
}
if (frames.length * FRAME_MS >= maxAudioSeconds * 1000) throw new Error('Audio exceeds the selected per-run ceiling');
const started = performance.now();
const ws = new WebSocket(process.env.RELAY_URL ?? 'ws://localhost:8787/ws', { origin: 'http://localhost:3000' });
let sessionId;
let finals = 0;
let detectorState = createDetectorState(languageCode);
let category = null;
let risk = null;
let firstDangerAt = null;
let requestEndAt = null;
const warningBytes = [];
let ended = false;
let failed = false;
let resolveReady;
let rejectReady;
const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
const deadline = setTimeout(() => { failed = true; rejectReady(new Error('Relay readiness timed out')); ws.terminate(); }, 12000);
ws.on('error', () => { failed = true; rejectReady(new Error('Relay connection failed')); });
ws.on('close', () => { if (!sessionId) rejectReady(new Error('Relay closed before readiness')); });
ws.on('open', () => ws.send(JSON.stringify({ type: 'session.start', version: 1, consent: true, languageCode,
  audio: { encoding: 'pcm_s16le', sampleRate: 16000, channels: 1, frameBytes: 1024 } })));
ws.on('message', (raw) => {
  const message = JSON.parse(raw.toString());
  const summary = { ms: Math.round(performance.now() - started), type: message.type };
  if (message.type === 'session.ready') { sessionId = message.sessionId; clearTimeout(deadline); resolveReady(); }
  if (message.type === 'transcript.final') {
    summary.transcript = message.segment.text;
    const devanagari = /\p{Script=Devanagari}/u.test(message.segment.text);
    const latin = /[a-z]/i.test(message.segment.text);
    summary.script = devanagari ? latin ? 'mixed' : 'Devanagari' : latin ? 'Latin' : 'other';
    const step = analyze(message.segment.text, detectorState); detectorState = step.state; category = step.result.category;
    finals++;
  }
  if (message.type === 'risk.update') {
    risk = message.assessment.level; summary.risk = risk;
    if (risk === 'danger' && firstDangerAt === null) firstDangerAt = performance.now();
  }
  if (message.type === 'warning.audio') { summary.bytes = Buffer.from(message.audioBase64, 'base64').length; warningBytes.push(summary.bytes); }
  if (message.type === 'session.error') {
    summary.code = message.code; summary.recoverable = message.recoverable;
    if (!sessionId) rejectReady(new Error('Relay rejected session start'));
  }
  if (message.type === 'session.end') ended = true;
  console.info(JSON.stringify(summary));
});
try {
  await ready;
  for (const [index, frame] of frames.entries()) {
    if (failed || ended || ws.readyState !== WebSocket.OPEN) throw new Error('Session ended during audio');
    ws.send(frame);
    await new Promise((resolve) => setTimeout(resolve, FRAME_MS));
    if (requestEndMs !== undefined && index === Math.ceil(requestEndMs / FRAME_MS) - 1) requestEndAt = performance.now();
  }
  if (settleMs) await new Promise((resolve) => setTimeout(resolve, settleMs));
  const waitUntil = performance.now() + 7000;
  while (!finals && !failed && !ended && performance.now() < waitUntil) await new Promise((resolve) => setTimeout(resolve, 50));
  // Allow an already-started asynchronous TTS request to complete without blocking transcripts.
  if (finals && !ended) await new Promise((resolve) => setTimeout(resolve, 1200));
  if (ws.readyState === WebSocket.OPEN && !ended) {
    ws.send(JSON.stringify({ type: 'session.end', sessionId, reason: 'user' }));
    const endDeadline = performance.now() + 3000;
    while (!ended && performance.now() < endDeadline) await new Promise((resolve) => setTimeout(resolve, 20));
  }
  console.info(JSON.stringify({ summary: true, sessionId, languageCode, audioSeconds: frames.length * FRAME_MS / 1000, finals, risk, category,
    categorySource: 'local detector replay of received final transcripts', warningBytes,
    requestToDangerMs: requestEndAt !== null && firstDangerAt !== null ? Math.round(firstDangerAt - requestEndAt) : null }));
  if (expected && (expected === 'danger' ? risk !== 'danger' : risk === 'danger')) {
    console.error('STOP: observed scenario risk did not meet the requested condition; transcripts are listed above');
    process.exitCode = 1;
  }
  if (!finals) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Streaming failed');
  process.exitCode = 1;
} finally { clearTimeout(deadline); ws.close(); }
