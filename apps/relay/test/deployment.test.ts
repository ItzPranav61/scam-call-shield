import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockRelay } from '../src/server.js';
import { AUDIO } from '../src/validation.js';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.unstubAllEnvs();
});
async function fixture() {
  const relay = createMockRelay({ log: () => {} });
  cleanups.push(relay.close);
  relay.server.listen(0, '0.0.0.0');
  await once(relay.server, 'listening');
  const address = relay.server.address() as AddressInfo;
  expect(address.address).toBe('0.0.0.0');
  return { relay, url: `ws://127.0.0.1:${address.port}/ws` };
}
async function rejected(url: string, origin?: string) {
  const ws = new WebSocket(url, origin === undefined ? {} : { origin });
  ws.on('error', () => {});
  const [_, response] = await once(ws, 'unexpected-response');
  const status = response.statusCode;
  response.resume();
  ws.terminate();
  return status;
}
describe('deployment origins and shutdown', () => {
  it('rejects missing, null, foreign, and spoofed multi-origin headers by default', async () => {
    const { url } = await fixture();
    for (const origin of [undefined, 'null', 'https://example.invalid', 'http://localhost:3000,https://example.invalid']) {
      expect(await rejected(url, origin)).toBe(403);
    }
  });
  it('allows explicit deployed origins and rejects origins outside the configured list', async () => {
    vi.stubEnv('ALLOWED_ORIGINS', ' https://shield.example , https://preview.example/ ');
    const { url } = await fixture();
    for (const origin of ['https://shield.example', 'https://preview.example']) {
      const ws = new WebSocket(url, { origin });
      await once(ws, 'open');
      ws.close();
      await once(ws, 'close');
    }
    expect(await rejected(url, 'http://localhost:3000')).toBe(403);
    expect(await rejected(url, 'https://shield.example.attacker.invalid')).toBe(403);
  });
  it.each(['', '*', 'null', 'https://example.invalid/path', 'https://example.invalid?query=1'])(
    'rejects invalid origin configuration without logging its value: %s', (value) => {
      vi.stubEnv('ALLOWED_ORIGINS', value);
      expect(() => createMockRelay()).toThrow('Invalid ALLOWED_ORIGINS');
    });
  it('closes active sessions with code 1000, stops output, and makes close idempotent', async () => {
    const { relay, url } = await fixture();
    const ws = new WebSocket(url, { origin: 'http://localhost:3000' });
    await once(ws, 'open');
    ws.send(JSON.stringify({ type: 'session.start', version: 1, consent: true,
      languageCode: 'en-IN', audio: AUDIO, scenario: 'kyc-otp' }));
    const [ready] = await once(ws, 'message');
    expect(JSON.parse(ready.toString()).type).toBe('session.ready');
    const closed = once(ws, 'close');
    const pending = relay.close();
    expect(relay.close()).toBe(pending);
    expect((await closed)[0]).toBe(1000);
    await pending;
    expect(relay.server.listening).toBe(false);
  });
  it.skipIf(process.platform === 'win32')('handles actual SIGTERM with normal WS close and exit 0', async () => {
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = (reservation.address() as AddressInfo).port;
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../src/index.ts', import.meta.url)), '--mock'], {
      env: { ...process.env, PORT: String(port), RELAY_DISABLED: '0', ALLOWED_ORIGINS: 'http://localhost:3000' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    cleanups.push(async () => {
      if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await once(child, 'exit'); }
    });
    await Promise.race([
      once(child.stdout!, 'data'),
      once(child, 'exit').then(() => { throw new Error('Relay failed to start'); }),
    ]);
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: 'http://localhost:3000' });
    await once(ws, 'open');
    const closed = once(ws, 'close');
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    expect((await closed)[0]).toBe(1000);
    expect((await exited)[0]).toBe(0);
  });
});
