'use client';

import { useState } from 'react';
import { Activity, AudioLines, CircleAlert, Mic, MicOff, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import styles from './monitoring-preview.module.css';

const stages = [
  { text: 'Namaste, main aapke bank se bol raha hoon. Aapka KYC update pending hai.', level: 'Awaiting more context', message: 'An introduction alone does not verify identity.', state: 'context' },
  { text: 'Aaj hi verify karna hoga, warna aapka account block ho jayega.', level: 'Caution', message: 'An account-blocking threat creates pressure to act quickly.', state: 'caution' },
  { text: 'Aapke phone par jo OTP aaya hai, woh mujhe bata dijiye.', level: 'High risk indicators', message: 'Do not share your OTP. End the call and contact your bank independently.', state: 'high' },
] as const;

export function MonitoringPreview() {
  const [stageIndex, setStageIndex] = useState(2);
  const stage = stages[stageIndex] ?? stages[0];
  const waveform = Array.from({ length: 44 }, (_, index) => 6 + ((index * 13 + 7) % 25));

  return <div className={styles.wrapper}>
    <div className={styles.caption}><span />Simulated Demo — No live audio is being processed.</div>
    <div className={styles.window}>
      <div className={styles.toolbar}><span className={styles.appTitle}><ShieldAlert aria-hidden="true" />ScamCall Shield<span className={styles.divider} /><span className={styles.sessionTitle}>Session preview</span></span><span className={styles.demoTag}>Demo</span></div>
      <div className={styles.sessionBar}><div><span className={styles.mic}><Mic aria-hidden="true" /></span><span><strong>Speakerphone session</strong><small>Microphone activity is simulated</small></span></div><span className={styles.sessionTime}>00:24 <span>example</span></span></div>
      <div className={styles.audio}><div className={styles.audioLabel}><span><AudioLines aria-hidden="true" />Simulated voice activity</span><span>Hinglish example</span></div><div key={stageIndex} className={styles.wave} aria-hidden="true">{waveform.map((height, index) => <i key={index} style={{ height, animationDelay: `${index % 5 * 60}ms` }} />)}</div></div>
      <div className={styles.panels}>
        <div className={styles.transcript}>
          <div className={styles.panelTitle}><span><Activity aria-hidden="true" />Conversation</span><span>Scripted</span></div>
          <ol className={styles.segments}>{stages.slice(0,stageIndex + 1).map((segment,index) => <li key={segment.state}><span className={styles.timestamp}>00:{String(4 + index * 10).padStart(2,'0')}</span><p>{index === 2 ? <>Aapke phone par jo <mark>OTP aaya hai, woh mujhe bata dijiye.</mark></> : segment.text}</p></li>)}</ol>
          <p className={styles.segmentNote}>Fictional transcript · No speaker identification</p>
        </div>
        <div className={styles.riskPanel} aria-live="polite" aria-atomic="true">
          <p className={styles.riskLabel}>Risk indicators</p>
          <span className={styles.riskIcon} data-risk={stage.state}>{stage.state === 'high' ? <ShieldAlert aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}</span>
          <h3 data-risk={stage.state}>{stage.level}</h3>
          <p>{stage.message}</p>
          {stageIndex >= 1 && <ul className={styles.signals}><li>Urgency & account threat</li>{stageIndex === 2 && <li>Private OTP request</li>}</ul>}
          <small>Prepared illustration,<br />not a live assessment.</small>
        </div>
      </div>
      <div className={styles.bottom}><span><MicOff aria-hidden="true" />Your microphone is off</span><span className={styles.previewControls}><Button variant="ghost" size="icon" aria-label="Restart simulated preview" onClick={() => setStageIndex(0)}><RotateCcw aria-hidden="true" /></Button><Button variant="ghost" size="sm" disabled={stageIndex === 2} onClick={() => setStageIndex(index => Math.min(index + 1,2))}><Play data-icon="inline-start" aria-hidden="true" />Next signal</Button></span></div>
    </div>
    <p className={styles.footnote}>Illustrative interface. Live STT, language coverage and audible alerts require a verified backend connection.</p>
  </div>;
}
