import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { availableRelayUrl, HOSTED_LIVE_NOTICE, LOCAL_RELAY_URL } from '../lib/relay/availability';
import { LiveRelayDemo } from '../components/demo/live-relay-demo';
import { DemoWorkspace } from '../components/demo/demo-workspace';

afterEach(() => vi.unstubAllEnvs());

describe('production-safe relay availability', () => {
  it('shows the hosted notice without mounting connection controls when unconfigured', () => {
    vi.stubEnv('NEXT_PUBLIC_RELAY_URL', '');
    const html = renderToStaticMarkup(createElement(LiveRelayDemo));
    expect(html.replace(/<[^>]*>/g, '')).toContain(HOSTED_LIVE_NOTICE.replaceAll("'", '&#x27;'));
    expect(html).toMatch(/class="[^"]*hostedNotice[^"]*"/);
    expect(html).not.toContain('Start scenario');
    expect(html).not.toContain('Relay: unreachable');
  });
  it('does not default to a localhost relay on a non-local host', () => {
    expect(availableRelayUrl(undefined, 'preview.vercel.app')).toBeNull();
    expect(availableRelayUrl('', 'example.test')).toBeNull();
    expect(availableRelayUrl('  ', 'localhost.example.test')).toBeNull();
    expect(availableRelayUrl(undefined, '')).toBeNull(); // server render before hostname is known
  });
  it.each(['localhost', '127.0.0.1'])('keeps the default relay on %s', host => {
    expect(availableRelayUrl(undefined, host)).toBe(LOCAL_RELAY_URL);
  });
  it('honors an explicit URL on a non-local host', () => {
    expect(availableRelayUrl('wss://relay.example.test/ws', 'preview.vercel.app')).toBe('wss://relay.example.test/ws');
  });
  it('keeps recording-mode defaults unchanged', () => {
    expect(availableRelayUrl(undefined, 'preview.vercel.app', true)).toBe(LOCAL_RELAY_URL);
  });
  it.each(['', 'ws://localhost:8787/ws'])('keeps the scripted default with unavailable or configured relay URL: %s', configured => {
    vi.stubEnv('NEXT_PUBLIC_RELAY_URL', configured);
    expect(availableRelayUrl(configured, 'preview.vercel.app')).toBe(configured || null);
    const html = renderToStaticMarkup(createElement(DemoWorkspace));
    expect(html).toContain('Scripted preview - not live');
    const scripted = html.match(/<button[^>]*role="tab"[^>]*>Scripted preview - not live<\/button>/)?.[0];
    const live = html.match(/<button[^>]*role="tab"[^>]*>Live relay<\/button>/)?.[0];
    expect(scripted).toContain('aria-selected="true"');
    expect(live).toContain('aria-selected="false"');
    expect(html).not.toContain(HOSTED_LIVE_NOTICE); // inactive live tab does not mount a client
    expect(html).not.toContain('Relay: unreachable');
  });
});
