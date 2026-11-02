import { readFile, readdir, mkdir, mkdtemp, stat, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GnaniTtsProvider } from '../apps/relay/dist/apps/relay/src/providers/gnani-tts.js';
import { decodeWav, encodePcm } from './mix-noise.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
let key;
let spent = 0;
try {
  const output = join(root, 'data/scenarios/audio');
  const scenarios = [];
  const catalog = {};
  for (const name of (await readdir(join(root, 'data/scenarios'))).sort()) {
    if (!/^[a-z0-9-]+\.json$/.test(name)) continue;
    const scenario = JSON.parse(await readFile(join(root, 'data/scenarios', name), 'utf8'));
    if (!Array.isArray(scenario.segments) || !scenario.segments.length
        || scenario.segments.some((text) => typeof text !== 'string' || !text.trim() || [...text].length >= 200)) throw new Error('Invalid scenario text');
    const base = name.slice(0, -5);
    let exists = false;
    try { await stat(join(output, `${base}.wav`)); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const jobs = [];
    for (const [index, text] of scenario.segments.entries()) {
      const code = `CALL_${base.replaceAll('-', '_').toUpperCase()}_${index}`;
      const path = join(output, 'segments', `${base}.${index}.Poorvi.wav`);
      let cached = exists;
      if (!cached) { try { await stat(path); cached = true; } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      jobs.push({ code, text, path, cached });
      catalog[code] = { 'hi-en': text };
    }
    scenarios.push({ base, jobs, exists, characters: jobs.reduce((sum, job) => sum + (job.cached ? 0 : [...job.text].length), 0) });
  }
  const planned = scenarios.reduce((sum, scenario) => sum + scenario.characters, 0);
  scenarios.forEach((scenario) => console.info(`plan scenario=${scenario.base} characters=${scenario.characters} skipped=${scenario.exists}`));
  console.info(`plan total-characters=${planned} budget-exclusive=3000`);
  if (planned >= 3000) throw new Error('TTS budget exceeded before any call');
  if (process.argv.includes('--plan')) process.exit(0);
  // Runtime-only credential loading. Never display/copy env contents or headers.
  key = parseEnv(await readFile(join(root, '.env'), 'utf8')).GNANI_API_KEY;
  if (!key) throw new Error('GNANI_API_KEY missing');
  process.env.GNANI_TTS_VOICE_HI_EN = 'Poorvi'; // Only documented v2.5 Hinglish voice.
  await mkdir(join(output, 'segments'), { recursive: true });
  const catalogDirectory = await mkdtemp(join(tmpdir(), 'synthetic-call-catalog-'));
  await writeFile(join(catalogDirectory, 'warnings.json'), JSON.stringify(catalog));
  let current = '';
  const provider = new GnaniTtsProvider({ apiKey: key, directory: catalogDirectory, retries: 0,
    onResponse: ({ status, credits }) => console.info(`segment=${current} HTTP=${status} credits=${credits ?? 'not-reported'}`) });
  for (const scenario of scenarios) {
    if (scenario.exists) { decodeWav(await readFile(join(output, `${scenario.base}.wav`))); continue; }
    const pieces = [];
    const segmentEndsMs = [];
    let totalBytes = 0;
    for (const [index, job] of scenario.jobs.entries()) {
      current = `${scenario.base}/${index + 1}`;
      let wav;
      if (job.cached) wav = await readFile(job.path);
      else {
        spent += [...job.text].length;
        wav = Buffer.from(await provider.synthesize(job.code, 'hi-en', 'Poorvi'));
        await writeFile(job.path, wav, { flag: 'wx' });
      }
      const pcm = decodeWav(wav).pcm;
      pieces.push(pcm); totalBytes += pcm.length; segmentEndsMs.push(totalBytes / 32);
      if (index < scenario.jobs.length - 1) { pieces.push(Buffer.alloc(12800)); totalBytes += 12800; }
    }
    await writeFile(join(output, `${scenario.base}.wav`), encodePcm(Buffer.concat(pieces)), { flag: 'wx' });
    await writeFile(join(output, `${scenario.base}.segments.json`), JSON.stringify({ segmentEndsMs, audioMs: totalBytes / 32, voice: 'Poorvi', silenceMs: 400 }, null, 2), { flag: 'wx' });
    console.info(`scenario=${scenario.base} bytes=${totalBytes + 44} seconds=${totalBytes / 32000} characters=${scenario.characters}`);
  }
  console.info(`summary characters-submitted=${spent}`);
} catch (error) {
  console.error(key ? String(error.message).split(key).join('[REDACTED]') : 'Synthetic generation failed before credential loading');
  console.info(`summary characters-submitted=${spent}`);
  process.exitCode = 1;
}
