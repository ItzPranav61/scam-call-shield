import { LockKeyhole, MicOff, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { ProtectionReadiness } from './protection-readiness';
import theme from './product-theme.module.css';
import styles from './safety-trust.module.css';

const controls = [
  { title: 'Permission comes before listening', text: 'Prototype microphone testing needs explicit consent. Use synthetic role-play only. A browser cannot intercept cellular call audio.' },
  { title: 'An active indicator must mean active audio', text: 'A future live workspace must show when the microphone is actually capturing audio, separately from connection and processing status. The scripted demo’s waveform is an illustration, not microphone activity.' },
  { title: 'Stopping must be immediate', text: 'The live workspace must provide an obvious Stop control that ends microphone capture and processing. Live relay provides Stop session; leaving its workspace or losing the connection also stops capture. Pause Demo only pauses the fictional script.' },
  { title: 'A live transcript is different from saved history', text: 'Scripted demo displays prepared text; Live relay holds returned transcripts in page memory. Neither client mode has a saved-session feature. Live audio processing, temporary transcript handling and provider retention still need verification before live use. Do not assume a provider deletes data immediately.' },
  { title: 'A warning gives you a reason to pause', text: 'Check the highlighted request and its explanation. Do not share an OTP, password, UPI PIN or banking credentials. End a suspicious call and independently contact the organisation using its official app or a number you already trust.' },
] as const;

export function SafetyTrust() {
  return <section className={`${theme.theme} ${styles.section}`} aria-labelledby="prototype-scope-title">
    <div className={styles.inner}>
      <header className={styles.header}>
        <p className={styles.label}><LockKeyhole size={15} aria-hidden="true" />Safety &amp; trust</p>
        <h2 id="prototype-scope-title">Your microphone.<br />Your decision.</h2>
        <p>Understand the prototype workflow and its limits before testing synthetic dialogue.</p>
      </header>
      <div className={styles.layout}>
        <Card className={styles.current} role="region" aria-labelledby="privacy-current-title"><CardHeader>
          <div className={styles.mic}><MicOff size={26} aria-hidden="true" /></div>
          <Badge variant="outline" className={styles.previewBadge}>Current preview</Badge>
          <CardTitle id="privacy-current-title">Microphone off.</CardTitle>
          <CardDescription>You can explore the scripted demo without giving microphone permission.</CardDescription></CardHeader><CardContent>
          <dl>
            <div><dt>Audio capture</dt><dd><Badge variant="secondary">No capture</Badge></dd></div>
            <div><dt>Conversation content</dt><dd><Badge variant="secondary">Synthetic examples</Badge></dd></div>
            <div><dt>Saved session history</dt><dd><Badge variant="outline">Not available</Badge></dd></div>
            <div><dt>Live provider connection</dt><dd><Badge variant="outline">Unverified</Badge></dd></div>
          </dl></CardContent><CardFooter>
          <ProtectionReadiness><Button variant="outline" className={styles.button}>Review prototype limits</Button></ProtectionReadiness>
        </CardFooter></Card>
        <div className={styles.controls}>
          <h3>Before you test the prototype</h3>
          <p className={styles.intro}>These are requirements for the live experience. The current preview does not capture or analyse your call.</p>
          <Accordion type="multiple" defaultValue={['control-0']} className={styles.accordion}>
            {controls.map((item, index) => <AccordionItem key={item.title} value={`control-${index}`}>
              <AccordionTrigger>{item.title}</AccordionTrigger>
              <AccordionContent>{item.text}</AccordionContent>
            </AccordionItem>)}
          </Accordion>
        </div>
      </div>
      <Alert variant="warning" role="note" className={styles.warning}><ShieldAlert size={22} aria-hidden="true" /><div><AlertTitle>Indicators are a prompt to check. Never a safety guarantee.</AlertTitle><AlertDescription>A suspicious phrase does not confirm fraud, and an absence of warnings does not mean a caller is safe. Live processing and provider retention remain unverified. Never disclose OTPs, passwords or UPI PINs.</AlertDescription></div></Alert>
    </div>
  </section>;
}
