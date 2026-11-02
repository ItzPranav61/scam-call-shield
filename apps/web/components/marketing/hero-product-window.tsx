'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AudioLines, FileText, ShieldAlert, Hand, ListChecks, MicOff, Phone, LockKeyhole } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import styles from './experimental-hero.module.css';

const views = [
  { id: 'listen', label: 'Listen', icon: AudioLines, caption: 'Speakerphone audio would enter here, only after explicit consent.' },
  { id: 'transcript', label: 'Transcript', icon: FileText, caption: 'Read the request in context. These Hinglish lines are prepared examples.' },
  { id: 'signals', label: 'Signals', icon: ShieldAlert, caption: 'Understand the tactic behind the words, without a made-up confidence score.' },
  { id: 'action', label: 'Next step', icon: Hand, caption: 'A clear next step matters more than an alarming score.' },
  { id: 'summary', label: 'Summary', icon: ListChecks, caption: 'Review the example. No real conversation has been recorded or saved.' },
] as const;
const lines = [
  { time: '00:04', text: 'Namaste, main aapke bank se bol raha hoon. Aapka KYC update pending hai.' },
  { time: '00:14', text: 'Aaj hi verify karna hoga, warna aapka account block ho jayega.' },
  { time: '00:24', text: 'Aapke phone par jo OTP aaya hai, woh mujhe bata dijiye.' },
] as const;

export function HeroProductWindow() {
  const [view, setView] = useState('signals');
  const reduced = useReducedMotion();
  return <div className={styles.product}>
    <p className={styles.demoLabel}>Simulated Demo — No live audio is being processed.</p>
    <Tabs value={view} onValueChange={setView}>
      <TabsList className={styles.tabs} aria-label="Explore the simulated prototype workflow">{views.map(item => <TabsTrigger key={item.id} value={item.id}><item.icon size={16} aria-hidden="true" />{item.label}</TabsTrigger>)}</TabsList>
      <div className={styles.window}>
        <div className={styles.toolbar}><span><ShieldAlert size={18} aria-hidden="true" />ScamCall Shield <span className={styles.previewTag}>Product preview</span></span><span><MicOff size={14} aria-hidden="true" />Microphone off</span></div>
        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.phone}><Phone size={24} aria-hidden="true" /></div>
            <strong>Bank / KYC example</strong><p>A fictional conversation.<br />A very familiar pressure tactic.</p>
            <dl><div><dt>Content</dt><dd>Synthetic</dd></div><div><dt>Analysis</dt><dd>Scripted</dd></div><div><dt>Audio capture</dt><dd>None</dd></div></dl>
            <div className={styles.sidebarNote}><LockKeyhole size={15} aria-hidden="true" /><p>No OTP, phone number or personal details needed.</p></div>
          </aside>
          <div className={styles.main}>
            {views.map(item => <TabsContent key={item.id} value={item.id} className={styles.panel}>
              <motion.div initial={false} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: reduced ? 0 : .2 }}>
                <p className={styles.viewLabel}>Fictional call walkthrough</p>
                {item.id === 'listen' && <><h2>Listen with your permission.</h2><p className={styles.body}>A planned live session would use nearby speakerphone audio. This illustration does not activate your microphone.</p><div className={styles.wave} aria-hidden="true">{Array.from({length:48},(_,i)=><i key={i} style={{height:12+(i*17%48)}} />)}</div><div className={styles.info}><MicOff size={20} aria-hidden="true" /><div><strong>Microphone is off</strong><p>No audio input or live provider connection.</p></div></div></>}
                {item.id === 'transcript' && <><h2>See what was asked.</h2><p className={styles.body}>Scripted Hinglish transcript. No speaker identification is inferred.</p><ol className={styles.transcript}>{lines.map((line,i)=><li key={line.time}><time>{line.time}</time><p>{i===2 ? <mark>{line.text}</mark> : line.text}</p></li>)}</ol></>}
                {item.id === 'signals' && <><h2>A request worth questioning.</h2><p className={styles.body}>Two prepared indicators from this example. They are reasons to verify, not a verdict about a real caller.</p><div className={styles.risk}><ShieldAlert size={21} aria-hidden="true" /><div><strong>Potential scam indicators</strong><p>Pressure to act, followed by a request for a private code.</p></div></div><div className={styles.evidence}><span>Urgency &amp; account threat</span><blockquote>“Aaj hi verify karna hoga…”</blockquote><p>The threat narrows the time you feel you have to check.</p></div><div className={styles.evidence}><span>Private OTP request</span><blockquote>“OTP aaya hai, woh mujhe bata dijiye.”</blockquote><p>A convincing introduction does not justify sharing a private code.</p></div></>}
                {item.id === 'action' && <><h2>Pause. Keep the code private.</h2><p className={styles.body}>A prepared recommendation for this fictional OTP request.</p><ol className={styles.steps}><li><strong>Do not share the OTP.</strong><p>Keep passwords, UPI PINs and banking credentials private too.</p></li><li><strong>End the suspicious call.</strong><p>You do not need to decide while someone pressures you.</p></li><li><strong>Verify independently.</strong><p>Use the bank’s official app or a contact number you already trust.</p></li></ol></>}
                {item.id === 'summary' && <><h2>The pattern, in perspective.</h2><p className={styles.body}>This is a prepared example summary, not a saved monitoring session.</p><dl className={styles.summary}><div><dt>Claim</dt><dd>A bank representative needs urgent KYC verification.</dd></div><div><dt>Indicators</dt><dd>Account closure pressure and an OTP request.</dd></div><div><dt>Safer response</dt><dd>Keep the code private and contact the bank independently.</dd></div></dl><p className={styles.body}>Missing an indicator never establishes that a caller is safe.</p></>}
              </motion.div>
            </TabsContent>)}
          </div>
        </div>
        <div className={styles.windowFoot}><span>Prepared illustration · Not live analysis</span><a href="#interactive-demo-title">Try the full scripted demo <span aria-hidden="true">↗</span></a></div>
      </div>
      <p className={styles.caption}>{views.find(item=>item.id===view)?.caption}</p>
    </Tabs>
  </div>;
}
