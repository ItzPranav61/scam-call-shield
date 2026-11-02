'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';

const eventName = 'scamcall-theme-change';
function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('scamcall-theme'); } catch { /* Storage may be unavailable. */ }
    document.documentElement.dataset.theme = saved === 'light' || saved === 'dark' ? saved : media.matches ? 'dark' : 'light';
    callback();
  };
  window.addEventListener(eventName, callback);
  window.addEventListener('storage', update);
  media.addEventListener('change', update);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener('storage', update);
    media.removeEventListener('change', update);
  };
}
const snapshot = () => document.documentElement.dataset.theme === 'light';
const serverSnapshot = () => false;

export function ThemeToggle() {
  const light = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('scamcall-theme', next); } catch { /* Theme still works without persistence. */ }
    window.dispatchEvent(new Event(eventName));
  };
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label="Light mode" aria-pressed={light} title={light ? 'Switch to dark mode' : 'Switch to light mode'}>{light ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</Button>;
}
