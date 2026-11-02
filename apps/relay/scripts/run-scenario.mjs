import { WebSocket } from 'ws';

// Sends only a scenario name and protocol configuration; no microphone or file access.
const scenario = process.argv[2] ?? 'kyc-otp';
const target = process.argv[3] ?? process.env.RELAY_WS_URL ?? 'ws://127.0.0.1:8787/ws';
const origin = process.env.RELAY_ORIGIN ?? 'http://localhost:3000';
const ws = new WebSocket(target, { origin });
let sessionId;
let finalLevel = 'safe';
let audioWarnings = 0;
let ending = false;
let idle;
const deadline = setTimeout(() => {
  console.error('Scenario client timed out');
  process.exitCode = 1;
  ws.terminate();
}, 15000);

ws.on('open', () => ws.send(JSON.stringify({
  type: 'session.start', version: 1, consent: true, languageCode: 'en-IN',
  audio: { encoding: 'pcm_s16le', sampleRate: 16000, channels: 1, frameBytes: 1024 }, scenario,
})));
ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.type === 'session.ready') { sessionId = message.sessionId; console.info('session.ready'); }
  if (message.type === 'transcript.final') console.info('transcript.final');
  if (message.type === 'risk.update') {
    finalLevel = message.assessment.level;
    console.info(`risk.update: ${finalLevel}`);
  }
  if (message.type === 'warning.audio') {
    audioWarnings++;
    console.info(`warning.audio: ${Buffer.from(message.audioBase64, 'base64').length} WAV bytes`);
  }
  if (message.type === 'session.error') {
    console.error(`session.error: ${message.code}`);
    process.exitCode = 1;
    ws.close();
    return;
  }
  if (message.type === 'session.end') {
    console.info(`Completed: final risk ${finalLevel}; audio warnings ${audioWarnings}`);
    ws.close();
    return;
  }
  if (idle) clearTimeout(idle);
  if (sessionId && !ending) idle = setTimeout(() => {
    ending = true;
    ws.send(JSON.stringify({ type: 'session.end', sessionId, reason: 'user' }));
  }, 750);
});
ws.on('unexpected-response', (_request, response) => {
  console.error(`Relay upgrade rejected: HTTP ${response.statusCode}`);
  process.exitCode = 1;
  response.resume();
  ws.terminate();
});
ws.on('error', () => { console.error('Relay connection failed'); process.exitCode = 1; });
ws.on('close', () => { clearTimeout(deadline); if (idle) clearTimeout(idle); });
