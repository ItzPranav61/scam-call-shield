'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRelayHealth, type RelayHealth } from '../lib/relay/health';

export function useRelayHealth(url: string) {
  const [mode, setMode] = useState<RelayHealth>('unreachable');
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    const result = await fetchRelayHealth(url, controller.signal);
    clearTimeout(timeout);
    if (pending.current === controller) setMode(result);
  }, [url]);
  useEffect(() => {
    void refresh();
    const cancel = () => { pending.current?.abort(); pending.current = null; };
    return cancel;
  }, [refresh]);
  return { mode, refresh };
}
