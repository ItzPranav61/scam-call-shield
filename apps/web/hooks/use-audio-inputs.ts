'use client';
import { useCallback, useEffect, useState } from 'react';

export function useAudioInputs() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const available = await navigator.mediaDevices?.enumerateDevices?.();
      if (!available) { setError('Input-device discovery requires HTTPS or localhost and browser support.'); return; }
      setDevices(available.filter(device => device.kind === 'audioinput' && device.deviceId && device.deviceId !== 'default'));
      setError('');
    } catch { setError('Could not list microphones. Use browser default or refresh after granting permission.'); }
  }, []);
  useEffect(() => {
    const change = () => { void refresh(); };
    const initialRefresh = setTimeout(change, 0);
    navigator.mediaDevices?.addEventListener?.('devicechange', change);
    return () => {
      clearTimeout(initialRefresh);
      navigator.mediaDevices?.removeEventListener?.('devicechange', change);
    };
  }, [refresh]);
  return { devices, error, refresh };
}
