import { loadEnvFile } from 'node:process';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { relayMessageSchema } from '../apps/relay/dist/apps/relay/src/validation.js';
import { GnaniTtsProvider, validateWav } from '../apps/relay/dist/apps/relay/src/providers/gnani-tts.js';

const root = fileURLToPath(new URL('../', import.meta.url));
let spent = 0;
let key;
let current = '';
try {
  // User-authorized internal loading only: never display/copy environment contents.
  if (!process.env.GNANI_API_KEY) loadEnvFile(join(root, '.env'));
  key = process.env.GNANI_API_KEY;
  if (!key) throw new Error('GNANI_API_KEY is missing');
  const directory = join(root, 'data/warnings');
  const texts = JSON.parse(await readFile(join(directory, 'warnings.json'), 'utf8'));
  const jobs = [];
  for (const [code, translations] of Object.entries(texts)) {
    for (const language of ['hi-en', 'mr-IN']) {
      const text = translations[language];
      if (!/^[A-Z_]+$/.test(code) || typeof text !== 'string' || !text.trim() || [...text].length >= 200) {
        throw new Error('Invalid warning catalog');
      }
      const voice = language === 'hi-en' ? process.env.GNANI_TTS_VOICE_HI_EN ?? 'Poorvi'
        : process.env.GNANI_TTS_VOICE_MR_IN ?? 'Zahira';
      if (!/^[A-Za-z0-9_-]+$/.test(voice)) throw new Error('Invalid voice name');
      jobs.push({ code, language, voice, text, name: `${code}.${language}.${voice}.wav` });
    }
  }
  const singleWarning = process.argv.includes('--scam-pattern-mr');
  if (singleWarning) {
    const index = jobs.findIndex((job) => job.code === 'SCAM_PATTERN' && job.language === 'mr-IN');
    const job = jobs[index];
    if (!job) throw new Error('Requested warning not found');
    jobs.splice(0, jobs.length, job);
  }
  const planned = jobs.reduce((sum, job) => sum + [...job.text].length, 0);
  // Reserve eighteen previously submitted characters and all four diagnostic allowances.
  if (planned + 18 + 4 * [...jobs[0].text].length > 600) throw new Error('Overall character budget exceeds six hundred');
  if (process.argv.includes('--diagnose')) {
    const text = jobs[0].text;
    spent += [...text].length;
    const response = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key-ID': key },
      body: JSON.stringify({ text, model: 'timbre-v2.5', voice: 'Poorvi', language: 'hi-en', speed: 1,
        audio_config: { sample_rate: 16000, num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' } }),
      signal: AbortSignal.timeout(10000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    // Capture diagnostics before validation. Never display request or response error bodies.
    console.info(JSON.stringify({ status: response.status, contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'), bytes: bytes.length,
      first48Hex: bytes.subarray(0, 48).toString('hex'), first4Ascii: bytes.toString('ascii', 0, 4),
      bytes8to12Ascii: bytes.toString('ascii', 8, 12) }));
    await writeFile(join(tmpdir(), 'tts-probe.bin'), bytes, { flag: 'wx' });
  } else {
    await mkdir(join(directory, 'audio'), { recursive: true });
    const provider = new GnaniTtsProvider({ directory, retries: 0,
      onResponse: ({ status, credits }) => console.info(`file=${current} HTTP=${status} credits=${credits ?? 'not-reported'}`) });
    for (const job of jobs) {
      const path = join(directory, 'audio', job.name);
      try {
        await stat(path);
        const existing = new Uint8Array(await readFile(path));
        validateWav(existing);
        console.info(`file=${job.name} skipped bytes=${existing.length} chars=0`);
        continue;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      current = job.name;
      spent += [...job.text].length;
      const audio = await provider.synthesize(job.code, job.language, job.voice);
      console.info(`file=${job.name} bytes=${audio.length} chars=${[...job.text].length}`);
      if (singleWarning) {
        console.info(`first48Hex=${Buffer.from(audio).subarray(0, 48).toString('hex')}`);
        await writeFile(join(tmpdir(), 'scam-pattern-mr-probe.bin'), audio, { flag: 'wx' });
      }
      const check = relayMessageSchema.safeParse({ type: 'warning.audio', warningCode: job.code,
        language: job.language === 'hi-en' ? 'hi-IN' : job.language, mimeType: 'audio/wav',
        audioBase64: Buffer.from(audio).toString('base64') });
      if (singleWarning) console.info(`wireValidation=${check.success ? 'passed' : check.error.message}`);
      if (!check.success) throw new Error(`Warning ${job.name} does not pass the unchanged wire contract`);
      await writeFile(path, audio, { flag: 'wx' });
    }
    console.info(`summary characters-submitted=${spent} files=${jobs.length} verification-attempts=0`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Warning generation failed';
  const safeMessage = key ? message.split(key).join('[REDACTED]') : 'Warning generation failed; key unavailable';
  console.error(`${current ? `file=${current} ` : ''}${safeMessage}`);
  console.info(`summary characters-submitted=${spent}`);
  process.exitCode = 1;
}
