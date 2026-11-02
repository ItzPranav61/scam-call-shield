import { createRelay } from './server.js';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { warningsDirectory } from './providers/gnani-tts.js';
import { allowedOrigins, loadLiveEnvironment, resolveMode, startupLine } from './config.js';

try {
  const mode = resolveMode(process.argv.slice(2), process.env);
  loadLiveEnvironment(mode, process.env, () => parseEnv(readFileSync(join(warningsDirectory(), '../../.env'), 'utf8')));
  process.env.RELAY_MODE = mode;
  const port = Number(process.env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const origins = allowedOrigins(process.env.ALLOWED_ORIGINS);
  const relay = createRelay({ mode });
  relay.server.on('error', () => {
    console.error('Relay failed to listen');
    process.exitCode = 1;
    void relay.close();
  });
  relay.server.listen(port, '0.0.0.0', () => console.info(startupLine(mode, port, origins.size, Boolean(process.env.GNANI_API_KEY?.trim()))));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void relay.close().catch(() => { console.error('Relay shutdown failed'); process.exitCode = 1; });
    });
  }
} catch (error) {
  const message = error instanceof Error && /^(Invalid [A-Z_]+|Missing GNANI_API_KEY:)/.test(error.message)
    ? error.message : 'Relay startup failed';
  console.error(message);
  process.exitCode = 1;
}
