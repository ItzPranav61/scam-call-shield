'use client';

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { availableRelayUrl, HOSTED_LIVE_NOTICE } from '../../lib/relay/availability';
import { readmeLink } from '../../lib/site-links';
import type { LanguageCode } from '@scamcall/protocol';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAudioInputs } from '../../hooks/use-audio-inputs';
import { defaultMicrophoneSettings, type MicrophoneSettings } from '../../lib/relay/microphone';
import { useRelayHealth } from '../../hooks/use-relay-health';
import { StreamDiagnostics } from '../../lib/relay/diagnostics';
import { LiveDiagnostics } from './live-diagnostics';
import { TranscriptPanel, RiskPanel } from './relay-panels';
import { BrowserAudio } from '../../lib/relay/browser-audio';
import { browserSocket } from '../../lib/relay/browser-socket';
import { initialLiveState, RelayClient, type WarningAudio } from '../../lib/relay/client';
import { canStart, initialLiveView, liveViewReducer } from '../../lib/relay/view-state';
import styles from './live-relay-demo.module.css';

const scenarios = ['kyc-otp', 'digital-arrest', 'refund-upi', 'genuine-bank-alert', 'borderline-delivery'] as const;


const subscribeHostname = () => () => {};
const browserHostname = () => window.location.hostname;
const serverHostname = () => '';

export function LiveRelayDemo({ recording = false }: { recording?: boolean } = {}) {
  const hostname = useSyncExternalStore(subscribeHostname, browserHostname, serverHostname);
  const url = availableRelayUrl(process.env.NEXT_PUBLIC_RELAY_URL, hostname, recording);
  if (!url) return <p className={styles.hostedNotice} role="status">{HOSTED_LIVE_NOTICE.split('README')[0]}{readmeLink ? <a href={readmeLink} target="_blank" rel="noopener noreferrer" aria-label="README (opens in a new tab)">README</a> : 'README'}{HOSTED_LIVE_NOTICE.split('README')[1]}</p>;
  return <ConnectedLiveRelayDemo recording={recording} url={url} />;
}

function ConnectedLiveRelayDemo({ recording, url }: { recording: boolean; url: string }) {
  const [view, dispatch] = useReducer(liveViewReducer, initialLiveView);
  const { session: state, consent } = view;
  const [input, setInput] = useState('scenario');
  const [scenario, setScenario] = useState<string>('kyc-otp');
  const [language, setLanguage] = useState<LanguageCode>('en-IN');
  const [audioError, setAudioError] = useState('');
  const [settings, setSettings] = useState<MicrophoneSettings>({ ...defaultMicrophoneSettings });
  const [diagnostics] = useState(() => new StreamDiagnostics());
  const inputs = useAudioInputs();
  const [warning, setWarning] = useState<WarningAudio | null>(null);
  const client = useRef<RelayClient | null>(null);
  const audio = useRef<BrowserAudio | null>(null);
  const generation = useRef(0);
  const busy = state.phase === 'connecting' || state.phase === 'listening';
  const health = useRelayHealth(url);

  useEffect(() => {
    const invalidate = () => { generation.current++; };
    const stop = () => { client.current?.stop('Page hidden. Microphone off; press Start to begin again.'); };
    const visibility = () => { if (document.hidden) stop(); };
    const resetConsent = () => dispatch({ type: 'consent', checked: false });
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', resetConsent);
    return () => {
      invalidate();
      client.current?.stop(); audio.current?.stop();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('pageshow', resetConsent);
    };
  }, []);

  function start() {
    if (!canStart(view)) return;
    client.current?.stop(); audio.current?.stop();
    const token = ++generation.current;
    setAudioError(''); setWarning(null); diagnostics.reset();
    void health.refresh();
    try {
      if (input === 'microphone' && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia))
        throw new Error('Microphone requires HTTPS or localhost.');
      const device = new BrowserAudio(info => {
        if (generation.current !== token) return;
        diagnostics.microphone(info);
        if (info.permission === 'granted') void inputs.refresh();
      }, settings, measured => { if (generation.current === token) diagnostics.level(measured); });
      audio.current = device;
      const session = new RelayClient({
        socket: browserSocket,
        diagnostics: value => { if (generation.current === token) diagnostics.transport(value); },
        capture: push => device.capture(push),
        stopCapture: () => device.stop(),
        playWarning: message => {
          setWarning(message);
          void device.playWarning(message).catch(() => {
            if (generation.current === token) setAudioError('Warning playback blocked or unavailable. Press Play warning; read the warning text meanwhile.');
          });
        },
        change: next => { if (generation.current === token) dispatch({ type: 'session', session: next }); },
      });
      client.current = session;
      session.start(url, consent, language, input === 'scenario' ? scenario : undefined);
    } catch (error) {
      audio.current?.stop();
      dispatch({ type: 'session', session: { ...initialLiveState, phase: 'error', detail: error instanceof Error ? error.message : 'Browser audio unavailable.' } });
    }
  }

  const replayWarning = useCallback(() => {
    if (!warning) return;
    void audio.current?.replayWarning(warning).then(() => setAudioError('')).catch(() => setAudioError('Warning audio unavailable. Read the warning text.'));
  }, [warning]);

  const statusBanners = (<>
    <p className={styles.notice}>Demo build - synthetic scenarios only. Not for use on real calls.</p>
    <p className={styles.modeBadge} data-mode={health.mode} role="status">{health.mode === 'mock'
      ? 'Relay: MOCK (scripted, your speech is not transcribed)'
      : health.mode === 'live' ? 'Relay: LIVE (Gnani Prisma + Timbre)' : 'Relay: unreachable'}</p>
  </>);
  const technicalDetails = (
    <details className={styles.technical}>
      <summary>Technical details</summary>
    <p>Relay mode is read from the relay health endpoint. Session messages remain contract v1.2.</p>
    <p>In mock mode, transcripts are scripted and warning audio is a tone. A microphone connection to mock mode does not transcribe your speech.</p>
      <p>The contract describes scenario playback with mock STT or DEMO_MODE=1. This relay currently rejects scenario requests in live mode even with DEMO_MODE=1; the dropdown requires mock mode.</p>
    <p>Scenario playback sends no microphone audio. Only a live provider sends microphone audio to Gnani. Browser microphone access cannot intercept cellular calls.</p>
      <p>Stop turns off capture and keeps the last caution or danger assessment labelled as ended. Safe assessments are cleared. Errors, connection loss, and a new Start clear session results.</p>
      <fieldset className={styles.micSettings}>
        <legend>Microphone settings — applied on the next Start</legend>
        <label>Input device<select value={settings.deviceId} onChange={event => setSettings(previous => ({ ...previous, deviceId: event.target.value }))}>
          <option value="">Browser default</option>
          {settings.deviceId && !inputs.devices.some(device => device.deviceId === settings.deviceId) && <option value={settings.deviceId}>Selected microphone unavailable — choose another</option>}
          {inputs.devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
        </select></label>
        <label><input type="checkbox" checked={settings.autoGainControl} onChange={event => setSettings(previous => ({ ...previous, autoGainControl: event.target.checked }))} />Automatic gain control</label>
        <label><input type="checkbox" checked={settings.noiseSuppression} onChange={event => setSettings(previous => ({ ...previous, noiseSuppression: event.target.checked }))} />Noise suppression</label>
        <Button variant="outline" onClick={() => { void inputs.refresh(); }}>Refresh microphones</Button>
        <p>Device names may appear only after microphone permission. Settings are requests; browser support varies.</p>
        {inputs.error && <p role="status">{inputs.error}</p>}
      </fieldset>
      <LiveDiagnostics store={diagnostics} />
      <Button variant="outline" onClick={() => { void health.refresh(); }}>Refresh relay status</Button>
    </details>
  );

  return <div className={`${styles.live} ${recording ? styles.recording : ''}`} data-recording={recording}>
    <div className={recording ? styles.captureArea : undefined}>
    {recording ? <div className={styles.recordBanners}>{statusBanners}</div> : statusBanners}
    <div className={styles.inputs}>
      <label>Input<select disabled={busy} value={input} onChange={event => setInput(event.target.value)}><option value="scenario">Scenario playback (no microphone)</option><option value="microphone">Microphone (synthetic role-play)</option></select></label>
      {input === 'scenario' && <label>Synthetic scenario<select disabled={busy} value={scenario} onChange={event => setScenario(event.target.value)}>{scenarios.map(name => <option key={name}>{name}</option>)}</select></label>}
      <label>Language<select disabled={busy} value={language} onChange={event => setLanguage(event.target.value)}><option value="en-IN">Hinglish</option><option value="hi-IN">Hindi</option><option value="mr-IN">Marathi</option></select></label>
    </div>
    <label className={styles.consent}><input type="checkbox" autoComplete="off" disabled={busy} checked={consent} onChange={event => dispatch({ type: 'consent', checked: event.target.checked })} /><span>This demo does not save audio. Audio is sent to Gnani for transcription.</span></label>
    <p>Prototype. Risk indicators are not definitive, and a safe result never guarantees safety.</p>
    {!recording && technicalDetails}
    {health.mode === 'mock' && input === 'microphone' && <p className={styles.mockWarning} role="alert">This relay is in MOCK mode. Your speech will not be transcribed; the transcript is scripted.</p>}
    <div className={styles.controls}>
      <Button disabled={!canStart(view)} onClick={start}>{state.phase === 'relay-offline' || state.phase === 'error' ? 'Retry' : input === 'scenario' ? 'Start scenario' : 'Start microphone'}</Button>
      <Button variant="outline" disabled={!busy} onClick={() => client.current?.stop()}>Stop session</Button>
      <Badge variant="outline">{state.phase}</Badge>
    </div>
    <p role={state.phase === 'error' || state.phase === 'relay-offline' ? 'alert' : 'status'}>{state.detail}</p>
    <div className={styles.panels}>
      <TranscriptPanel segments={state.transcripts} recording={recording} />
      <RiskPanel assessment={state.assessment} warning={state.warning} audioError={busy ? audioError : ''} ended={state.phase === 'ended'} canReplay={Boolean(warning) && busy} onReplay={replayWarning} recording={recording} />
    </div>
    </div>
    {recording && <div className={styles.recordTechnical}>{technicalDetails}<a href="#interactive-demo-title">Return to capture view</a></div>}
  </div>;
}
