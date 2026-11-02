import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveRelayDemo } from '../components/demo/live-relay-demo';
import { initialLiveState, RelayClient, type LiveState, type RelaySocket } from '../lib/relay/client';
import { canStart, initialLiveView, liveViewReducer } from '../lib/relay/view-state';
import { AUDIO } from '../lib/relay/messages';

afterEach(() => vi.unstubAllEnvs());

describe('live demo consent and presentation', () => {
  it('renders a fresh page with unchecked consent, disabled Start and collapsed technical details', () => {
    vi.stubEnv('NEXT_PUBLIC_RELAY_URL', 'ws://localhost:8787/ws');
    const html = renderToStaticMarkup(createElement(LiveRelayDemo));
    const checkbox = html.match(/<input[^>]+type="checkbox"[^>]*>/)?.[0];
    expect(checkbox).toBeDefined();
    expect(checkbox).not.toMatch(/\schecked(?:=|\s|>)/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Start scenario<\/button>/);
    expect(html.match(/<details[^>]*>/)?.[0]).not.toMatch(/\sopen(?:=|\s|>)/);
    expect(html).toContain('Demo build - synthetic scenarios only. Not for use on real calls.');
    expect(html).toContain('Prototype. Risk indicators are not definitive, and a safe result never guarantees safety.');
    expect(canStart(initialLiveView)).toBe(false);
  });

  it.each(['ended', 'error', 'relay-offline'] as const)('requires new consent after %s', phase => {
    let view = liveViewReducer(initialLiveView, { type: 'consent', checked: true });
    expect(canStart(view)).toBe(true);
    view = liveViewReducer(view, { type: 'session', session: { ...initialLiveState, phase } });
    expect(view.consent).toBe(false);
    expect(canStart(view)).toBe(false);
    expect(canStart(liveViewReducer(view, { type: 'consent', checked: true }))).toBe(true);
  });

  it('retains consent while active, disables Start, and clears it on a real client session.end', () => {
    let view = liveViewReducer(initialLiveView, { type: 'consent', checked: true });
    const socket: RelaySocket = { readyState: 1, bufferedAmount: 0, onopen: null, onmessage: null, onerror: null, onclose: null, send: vi.fn(), close: vi.fn() };
    const client = new RelayClient({ socket: () => socket, capture: vi.fn(), stopCapture: vi.fn(), playWarning: vi.fn(),
      change: (session: LiveState) => { view = liveViewReducer(view, { type: 'session', session }); } });
    client.start('ws://localhost:8787/ws', view.consent, 'en-IN', 'kyc-otp');
    expect(view.consent).toBe(true); expect(canStart(view)).toBe(false);
    socket.onmessage?.({ data: JSON.stringify({ type: 'session.ready', sessionId: 's', audio: AUDIO }) });
    expect(view.consent).toBe(true); expect(canStart(view)).toBe(false);
    socket.onmessage?.({ data: JSON.stringify({ type: 'session.end', sessionId: 's', reason: 'timeout' }) });
    expect(view.consent).toBe(false); expect(canStart(view)).toBe(false);
    expect(initialLiveView.consent).toBe(false);
  });
});
