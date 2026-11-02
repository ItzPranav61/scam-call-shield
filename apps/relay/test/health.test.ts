import { once } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRelay } from '../src/server.js';
import { MockTtsProvider } from '../src/providers/mock.js';

afterEach(() => vi.unstubAllEnvs());
describe('public mode-only health endpoint', () => {
  it.each(['mock', 'live'] as const)('reports exactly ok and %s mode, with allowlisted CORS', async mode => {
    vi.stubEnv('ALLOWED_ORIGINS', 'http://localhost:3000');
    const relay = createRelay({ mode, ttsProvider: new MockTtsProvider(), log: () => {} });
    relay.server.listen(0, '127.0.0.1'); await once(relay.server, 'listening');
    const address = relay.server.address();
    if (!address || typeof address === 'string') throw new Error('No listener');
    const url = `http://127.0.0.1:${address.port}/health`;
    try {
      const response = await fetch(url, { headers: { Origin: 'http://localhost:3000' } });
      expect(await response.json()).toEqual({ ok: true, mode });
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Vary')).toBe('Origin');
      const local = await fetch(url); expect(local.status).toBe(200); await local.body?.cancel();
      const denied = await fetch(url, { headers: { Origin: 'https://foreign.invalid' } });
      expect(denied.status).toBe(403); expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull(); await denied.body?.cancel();
      const post = await fetch(url, { method: 'POST' }); expect(post.status).toBe(405); await post.body?.cancel();
    } finally { await relay.close(); }
  });
});
