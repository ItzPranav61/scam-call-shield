import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import test from 'node:test';

test('workspaces resolve their built packages and frontend examples contain no private key', async () => {
  assert.ok(import.meta.resolve('@scamcall/detector').endsWith('/dist/packages/detector/src/index.js'));
  assert.ok(import.meta.resolve('@scamcall/protocol').endsWith('/dist/packages/protocol/src/index.js'));
  assert.equal(typeof (await import('@scamcall/detector')).analyze, 'function');
  assert.deepEqual(Object.keys(await import('@scamcall/protocol')), []);
  const frontendExample = await readFile(new URL('../apps/web/.env.example', import.meta.url), 'utf8');
  assert.ok(!frontendExample.includes('GNANI_API_KEY'));
});

test('every workspace resolves the declared root TypeScript compiler', async () => {
  const require = createRequire(import.meta.url);
  const root = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(require('typescript/package.json').version, root.devDependencies.typescript);
  assert.equal(require('@types/node/package.json').version, root.devDependencies['@types/node']);
  const compiler = realpathSync(require.resolve('typescript/bin/tsc'));
  for (const workspace of root.workspaces) {
    const local = createRequire(new URL(`../${workspace}/package.json`, import.meta.url));
    assert.equal(realpathSync(local.resolve('typescript/bin/tsc')), compiler);
  }
});

test('built mock relay reports health and rejects unknown application routes', async (t) => {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const relay = spawn(process.execPath, ['apps/relay/dist/apps/relay/src/index.js', '--mock'], {
    env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (relay.exitCode === null) { relay.kill(); await once(relay, 'exit'); }
  });
  await Promise.race([
    once(relay.stdout, 'data'),
    once(relay, 'exit').then(([code]) => { throw new Error(`Relay exited before readiness: ${code}`); }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Relay readiness timeout')), 10000); timer.unref(); }),
  ]);
  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, mode: 'mock' });
  assert.equal((await fetch(`http://127.0.0.1:${port}/session`)).status, 404);
});
