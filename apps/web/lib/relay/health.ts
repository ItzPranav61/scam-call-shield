import { relayUrl } from './messages';

export type RelayHealth = 'mock' | 'live' | 'unreachable';
export function healthUrl(socketUrl: string): string {
  const url = new URL(relayUrl(socketUrl));
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname = '/health';
  return url.href;
}
export async function fetchRelayHealth(url: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<RelayHealth> {
  try {
    const response = await request(healthUrl(url), { signal, cache: 'no-store', credentials: 'omit' });
    if (!response.ok) return 'unreachable';
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || Object.keys(result).sort().join(',') !== 'mode,ok' ||
        !('ok' in result) || result.ok !== true || !('mode' in result)) return 'unreachable';
    return result.mode === 'live' || result.mode === 'mock' ? result.mode : 'unreachable';
  } catch { return 'unreachable'; }
}
