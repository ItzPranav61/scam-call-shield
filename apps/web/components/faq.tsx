import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import styles from './faq.module.css';
import theme from './marketing/product-theme.module.css';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const questions = [
  { question: 'How does ScamCall Shield work?', answer: 'Choose Scripted demo for prepared events, or Live relay to connect to a configured relay. Live relay supports synthetic scenario playback without a microphone and consented microphone role-play. Mock mode does not transcribe speech. Test synthetic dialogue only; this build is not for real calls.' },
  { question: 'Can it listen directly to normal phone calls?', answer: 'No. A browser cannot intercept cellular calls. A future live session would need explicit microphone permission and usable speakerphone audio nearby. Background noise, distance and call volume can affect what is recognised.' },
  { question: 'Does it support Hindi and Hinglish?', answer: 'The demo includes synthetic Hinglish examples. That does not verify live language support. Hindi, English and mixed-language transcription depend on the configured provider and must be checked before being offered as live capabilities.' },
  { question: 'Is my microphone always active?', answer: 'No. Scripted demo and relay scenario playback keep it off. Live relay microphone input requests permission only after consent and Start. Stop, switching away from the live workspace, hiding the page or losing the relay connection stops capture.' },
  { question: 'Are conversations recorded or stored?', answer: 'The client holds transcript text and audio buffers in memory and has no saved-session feature. Microphone audio goes to the configured relay; a live provider sends it for transcription. This does not establish provider retention or a production privacy policy.' },
  { question: 'Can it detect every scam?', answer: 'No. Indicators can miss scams or flag language that has an innocent explanation. Scripted demo uses prepared risk changes; Live relay displays assessments returned by the relay. A warning is a reason to pause and verify; an absence of warnings never guarantees that a caller is safe.' },
  { question: 'Does it work on mobile browsers?', answer: 'The learning content and scripted demo are designed for mobile browsers and need no microphone permission. Live monitoring on a phone is not verified. It would depend on browser microphone support, a secure connection and usable audio while the call is on speakerphone.' },
  { question: 'What happens when an alert is triggered?', answer: 'In the demo, a prepared warning identifies a suspicious request, highlights its supporting phrase and suggests a safer response. No call is blocked or reported automatically. Never share OTPs, passwords, UPI PINs or banking credentials; independently contact the organisation through its official app or a number you already trust.' },
] as const;

export function FAQ() {
  return <section className={`${theme.theme} ${styles.section}`} aria-labelledby="faq-title">
    <div className={styles.inner}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Frequently asked questions</p>
        <h2 id="faq-title">Know what<br />you can rely on.</h2>
        <p>Clear answers about the preview, your microphone and the limits of scam indicators.</p>
        <aside className={styles.note}><Badge variant="outline">Research prototype</Badge><p>Scripted demo available.<br />Live relay requires configuration.</p></aside>
        <nav className={styles.links} aria-label="FAQ related sections"><Button asChild variant="outline"><a href="#interactive-demo-title">Try the demo<ArrowRight data-icon="inline-end" aria-hidden="true" /></a></Button><Button asChild variant="ghost"><a href="#prototype-scope-title"><LockKeyhole data-icon="inline-start" aria-hidden="true" />Privacy &amp; Safety</a></Button></nav>
      </header>
      <Accordion type="multiple" defaultValue={["question-0"]} className={styles.questions}>
        {questions.map((item, index) => <AccordionItem key={item.question} value={`question-${index}`}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>)}
      </Accordion>
    </div>
  </section>;
}
