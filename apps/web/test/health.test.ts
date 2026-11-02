import { describe, expect, it, vi } from 'vitest';
import { fetchRelayHealth, healthUrl } from '../lib/relay/health';

describe('relay mode discovery', () => {
  it('derives health from the same host and port with HTTP(S)', () => {
    expect(healthUrl('ws://localhost:8787/ws')).toBe('http://localhost:8787/health');
    expect(healthUrl('wss://relay.example/ws')).toBe('https://relay.example/health');
  });
  it.each(['mock', 'live'] as const)('reads %s without sending credentials', async mode => {
    const request = vi.fn(async () => new Response(JSON.stringify({ ok: true, mode })));
    const signal = new AbortController().signal;
    expect(await fetchRelayHealth('ws://localhost:8787/ws', signal, request)).toBe(mode);
    expect(request).toHaveBeenCalledWith('http://localhost:8787/health', { signal, cache: 'no-store', credentials: 'omit' });
  });
  it.each([{ ok: true }, { ok: true, mode: 'other' }, { ok: true, mode: 'live', extra: true }, { ok: false, mode: 'live' }])('rejects invalid or old health payloads', async value => {
    expect(await fetchRelayHealth('ws://localhost:8787/ws', new AbortController().signal,
      async () => new Response(JSON.stringify(value)))).toBe('unreachable');
  });
  it('treats network and CORS errors as unreachable', async () => {
    expect(await fetchRelayHealth('ws://localhost:8787/ws', new AbortController().signal,
      async () => { throw new Error('Unavailable'); })).toBe('unreachable');
  });
});
