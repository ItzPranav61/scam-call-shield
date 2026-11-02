import { AudioLines, Mic, FileText, ScanText, ShieldAlert, ArrowRight, Info, LockKeyhole } from 'lucide-react';
import { ProcessFlow } from './process-flow';
import theme from './marketing/product-theme.module.css';
import styles from './how-it-works.module.css';

const steps = [
  { id: 'listen', label: 'Listen', icon: Mic, title: 'You decide when it starts.', description: 'With your explicit permission, the microphone would pick up a nearby call on speakerphone. Stop should always be one tap away.', detail: 'Permission first. Always.' },
  { id: 'transcribe', label: 'Transcribe', icon: FileText, title: 'Follow the conversation.', description: 'The configured speech service would turn usable audio into readable text. Language support depends on the verified service configuration.', detail: 'Recognised text can contain errors.' },
  { id: 'analyze', label: 'Analyze', icon: ScanText, title: 'Look for patterns, not proof.', description: 'The detector would look for requests for private codes, urgent payments, threats and impersonation, and explain the signals it finds.', detail: 'Context matters. No certainty score.' },
  { id: 'alert', label: 'Alert', icon: ShieldAlert, title: 'Know why to pause.', description: 'A visual warning would show the concerning phrase and a practical next step. Spoken warnings would be optional, where configured.', detail: 'A warning is guidance, not a verdict.' },
] as const;

type Stage = typeof steps[number]['id'];

function ProcessIllustration({ stage }: { stage: Stage }) {
  return <div className={styles.illustration} aria-hidden="true">
    {stage === 'listen' && <><div className={styles.micLabel}><span /><AudioLines />Speakerphone audio</div><div className={styles.wave}>{Array.from({length:23},(_,index)=><i key={index} style={{height: `${5 + (index * 11 + 7) % 27}px`}} />)}</div><span className={styles.microcopy}>Illustrative waveform</span></>}
    {stage === 'transcribe' && <><div className={styles.sampleLabel}><span>00:24</span>Example transcript</div><p className={styles.sampleText}>“Phone par jo <mark>OTP aaya hai,<br />woh bata dijiye.</mark>”</p><div className={styles.textLines}><i /><i /></div></>}
    {stage === 'analyze' && <><div className={styles.sampleLabel}><ScanText />Example indicators</div><div className={styles.indicator}><span>!</span>Request for an OTP</div><div className={styles.indicator}><span>!</span>Pressure to act now</div><span className={styles.microcopy}>Signals need context</span></>}
    {stage === 'alert' && <><div className={styles.warning}><ShieldAlert /><div><strong>Pause before you share.</strong><span>Keep your OTP private.</span></div></div><div className={styles.nextAction}>Contact your bank independently.<ArrowRight /></div></>}
  </div>;
}

export function HowItWorks() {
  return <section className={`${theme.theme} ${styles.section}`} aria-labelledby="how-it-works-title">
    <div className={styles.inner}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>How it works</p><h2 id="how-it-works-title">From a conversation<br />to a reason to pause.</h2></div>
        <div className={styles.introduction}><span className={styles.planned}><span />Illustrative prototype workflow · Synthetic testing only</span><p>Four clear stages. You stay in control.<br />Here’s how a verified live session would work.</p></div>
      </header>
      <ProcessFlow><ol className={styles.process} aria-label="Prototype analysis workflow">
        {steps.map((step,index)=><li className={styles.step} key={step.id}>
          <div className={styles.stepTop}><span className={styles.number}>0{index+1}</span><span data-flow-node className={styles.stageIcon}><step.icon aria-hidden="true" /></span></div>
          <h3>{step.label}</h3><ProcessIllustration stage={step.id} />
          <h4>{step.title}</h4><p className={styles.description}>{step.description}</p>
          <p className={styles.detail}>{step.id === 'listen' ? <LockKeyhole aria-hidden="true" /> : <Info aria-hidden="true" />}{step.detail}</p>
        </li>)}
      </ol></ProcessFlow>
      <aside className={styles.note} aria-label="Audio quality and prototype status"><Info aria-hidden="true" /><div><p><strong>Clearer audio helps.</strong> Background noise, speaker volume and distance from the microphone affect transcription quality.</p><p>Current status: the website uses synthetic examples. Live microphone monitoring is not connected.</p></div></aside>
    </div>
  </section>;
}
