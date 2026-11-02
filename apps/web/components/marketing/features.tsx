import { AudioLines, FileText, ScanText, BellRing, Languages, ShieldCheck, MessageSquareText, MicOff, Info } from 'lucide-react';
import { BentoCard, BentoGrid } from '../ui/bento-grid';
import { Badge } from '../ui/badge';
import { GlowingEffect } from '../ui/glowing-effect';
import theme from './product-theme.module.css';
import styles from './features.module.css';

const features = [
  { id: 'transcription', icon: FileText, label: 'Real-time transcription', title: 'Less guesswork. More context.', description: 'Follow recognised speech as readable text in a connected session. The current preview uses a prepared transcript; live transcription is not connected.', status: 'Live connection required' },
  { id: 'patterns', icon: ScanText, label: 'Scam pattern detection', title: 'Recognise the tactic.', description: 'Requests for private codes, payment pressure and impersonation can be warning signs. Existing rules identify patterns; they do not establish that a call is fraudulent.', status: 'Rules-based indicators' },
  { id: 'alerts', icon: BellRing, label: 'Instant alerts', title: 'A clear reason to pause.', description: 'See the concern and a practical response. Current warnings are scripted; live alerts and optional speech depend on a verified session.', status: 'Scripted preview available' },
  { id: 'languages', icon: Languages, label: 'Hinglish-friendly experience', title: 'Built around how you speak.', description: 'Explore Hindi, English and mixed-language examples. Live availability and recognition quality depend on configured, verified speech-service support.', status: 'Language support conditional' },
  { id: 'privacy', icon: ShieldCheck, label: 'Privacy-first controls', title: 'Your microphone. Your decision.', description: 'Scripted preview keeps the microphone off. Live relay microphone testing requires explicit consent and Start; Stop turns capture off. Synthetic role-play only.', status: 'Consented relay testing' },
  { id: 'explanations', icon: MessageSquareText, label: 'Explainable warnings', title: 'Understand the “why”.', description: 'Examples connect concerning phrases to an explanation and an independent verification step. No unexplained risk percentage or promise of guaranteed safety.', status: 'Explore in the demo' },
] as const;

type FeatureId = typeof features[number]['id'];

function FeatureVisual({ id }: { id: FeatureId }) {
  return <div className={styles.visual} aria-hidden="true">
    {id === 'transcription' && <><div className={styles.visualTop}><span><AudioLines />Example conversation</span><span>Scripted</span></div><div className={styles.transcriptRow}><span>00:04</span><p>“Main aapke bank se bol raha hoon.”</p></div><div className={styles.transcriptRow}><span>00:14</span><p>“Account block ho jayega. <mark>OTP bata dijiye.</mark>”</p></div><div className={styles.wave}>{Array.from({length:34},(_,i)=><i key={i} style={{height:6+(i*13+7)%21}} />)}</div></>}
    {id === 'patterns' && <><div className={styles.patternPhrase}>“Verify <mark>right now</mark> or your account will be blocked.”</div><div className={styles.chips}><span>Urgency</span><span>Account threat</span></div><span className={styles.visualNote}>Context matters. A signal is not proof.</span></>}
    {id === 'alerts' && <div className={styles.alert}><BellRing /><div><strong>Potential scam indicators</strong><p>A private code is being requested.<br />Pause and verify independently.</p><span>Illustrative warning</span></div></div>}
    {id === 'languages' && <><div className={styles.languageChips}><span>हिन्दी</span><span>English</span><span>Hinglish</span></div><p className={styles.languageQuote}>“OTP share mat kijiye.”</p><span className={styles.visualNote}>Example text · Not a language availability claim</span></>}
    {id === 'privacy' && <><div className={styles.micStatus}><span><MicOff /></span><div><strong>Microphone off</strong><small>No audio is being captured</small></div></div><div className={styles.privacySteps}><span>Explicit permission</span><span>Visible session state</span><span>Immediate stop</span></div></>}
    {id === 'explanations' && <><div className={styles.evidence}><span>Concerning phrase</span><p>“Tell me your OTP.”</p></div><div className={styles.reason}><span>Why pause?</span><p>An unverified caller is asking for a private code.</p></div></>}
  </div>;
}

export function Features() {
  return <section className={`${theme.theme} ${styles.section}`} aria-labelledby="features-title">
    <div className={styles.inner}>
      <header className={styles.header}><div><p className={styles.eyebrow}>A thoughtful prototype, by design</p><h2 id="features-title">The details that help<br />you see the bigger picture.</h2></div><p>A voice-first experience built around clarity,<br />control and understandable warnings.</p></header>
      <BentoGrid className={styles.grid}>
        {features.map(feature=><BentoCard key={feature.id} className={`${styles.card} ${styles[feature.id]}`} aria-labelledby={`feature-${feature.id}`}>
          {(feature.id === 'transcription' || feature.id === 'patterns') && <GlowingEffect />}
          <div className={styles.cardHeading}><span className={styles.icon}><feature.icon aria-hidden="true" /></span><span>{feature.label}</span></div>
          <FeatureVisual id={feature.id} />
          <div className={styles.copy}><h3 id={`feature-${feature.id}`}>{feature.title}</h3><p>{feature.description}</p><div className={styles.status}><Badge variant="outline">{feature.status}</Badge></div></div>
        </BentoCard>)}
      </BentoGrid>
      <p className={styles.note}><Info aria-hidden="true" />Product direction and current capability are shown separately. No live audio is processed by these illustrations.</p>
    </div>
  </section>;
}
