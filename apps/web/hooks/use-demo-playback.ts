'use client';

import { useEffect, useRef, useState } from 'react';

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'complete';

export function useDemoPlayback(duration: number) {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const position = useRef(0);

  useEffect(() => {
    if (status !== 'playing') return;
    const startedAt = performance.now();
    const initialPosition = position.current;
    const timer = window.setInterval(() => {
      const next = Math.min(duration, initialPosition + (performance.now() - startedAt) / 1000);
      position.current = next;
      setElapsed(Math.floor(next));
      if (next >= duration) setStatus('complete');
    }, 100);
    return () => window.clearInterval(timer);
  }, [duration, status]);

  function play() {
    if (status === 'complete') { position.current = 0; setElapsed(0); }
    setStatus('playing');
  }
  function pause() { setStatus('paused'); }
  function restart() { position.current = 0; setElapsed(0); setStatus('idle'); }

  return { status, elapsed, play, pause, restart };
}
