import { memo, useSyncExternalStore } from 'react';
import type { StreamDiagnostics } from '../../lib/relay/diagnostics';
import styles from './live-relay-demo.module.css';

/** This leaf is the only React subscriber to hot-path audio counters and levels. */
export const LiveDiagnostics = memo(function LiveDiagnostics({ store }: { store: StreamDiagnostics }) {
  const { microphone, transport, level } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return <dl>
    <dt>Microphone permission</dt><dd>{microphone.permission}</dd>
    <dt>AudioContext input sample rate</dt><dd>{microphone.sampleRate === null ? 'Not reported yet' : `${microphone.sampleRate} Hz`}</dd>
    <dt>Audio frames sent this session</dt><dd>{transport.framesSent}</dd>
    <dt>Input level (linear 0–1)</dt><dd className={styles.level}>
      <label>RMS <meter min={0} max={1} value={level.rms} aria-label="Microphone RMS input level" /> {level.rms.toFixed(3)}</label>
      <label>Peak <meter min={0} max={1} value={level.peak} aria-label="Microphone peak input level" /> {level.peak.toFixed(3)}</label>
    </dd>
    <dt>Audio bytes sent this session</dt><dd>{transport.bytesSent}</dd>
    <dt>Last relay message</dt><dd>{transport.lastMessageType ?? 'None'}</dd>
    <dt>Last received at</dt><dd>{transport.lastMessageAt === null ? 'Never' : new Date(transport.lastMessageAt).toLocaleTimeString()}</dd>
  </dl>;
});
