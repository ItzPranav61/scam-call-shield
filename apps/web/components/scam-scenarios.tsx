import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import styles from './scam-scenarios.module.css';
import { Landmark, ShieldAlert, ScreenShare, TriangleAlert } from 'lucide-react';
import theme from './marketing/product-theme.module.css';


const scenarios = [
  {
    id: 'bank',
    category: 'Bank / KYC impersonation',
    title: '“Your account will be blocked.”',
    hook: 'A familiar name. A request that goes too far.',
    quote: 'Your KYC is expiring today. Tell me the OTP you just received so I can keep your account active.',
    evidence: 'Tell me the OTP you just received',
    flags: ['Account-blocking threat', 'Request for an OTP'],
    explanation: 'The caller pairs a threat with a request for a private code, giving you little time to question their identity.',
    action: 'End the call. Check your account through the bank’s official app or a contact number you find independently. Keep your OTP private.',
    takeaway: 'A bank name is not proof of identity.',
  },
  {
    id: 'arrest',
    category: 'Fake arrest threat',
    title: '“Pay now. Tell no one.”',
    hook: 'Fear makes an urgent demand feel official.',
    quote: 'This is an investigation. Transfer money now to avoid arrest, stay on the line and do not discuss this with anyone.',
    evidence: 'Transfer money now to avoid arrest',
    flags: ['Threats and secrecy', 'Immediate money transfer'],
    explanation: 'The demand combines fear, isolation and a payment request to discourage independent verification.',
    action: 'Pause and end the call. Do not transfer money under pressure. Independently contact the relevant authority through an official channel and speak to someone you trust.',
    takeaway: 'A frightening claim still needs verification.',
  },
  {
    id: 'access',
    category: 'Remote-access pretext',
    title: '“Install this. I’ll fix it.”',
    hook: 'An offer to help can come with hidden access.',
    quote: 'I can fix your payment issue. Install this screen-sharing app and let me control your phone while you open your banking app.',
    evidence: 'let me control your phone',
    flags: ['Unsolicited device access', 'Banking during screen sharing'],
    explanation: 'An unexpected caller asks for control of your device and access to a sensitive banking session.',
    action: 'Decline the request and end the call. Do not open banking apps or share your screen with an unverified caller. Seek support through the service’s official app or website.',
    takeaway: 'Help should not cost you control.',
  },
] as const;

export function ScamScenarios() {
  return <section className={`${theme.theme} ${styles.section}`} aria-labelledby="scam-scenarios-title">
    <div className={styles.inner}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}><span /> Scam scenarios</p><h2 id="scam-scenarios-title">Different stories.<br />Familiar red flags.</h2></div>
        <p>The details change. The pressure often doesn’t.<br />Recognise the tactic. Choose a safer next step.</p>
      </header>
      <div className={styles.grid}>
        {scenarios.map(scenario => <article key={scenario.id} className={styles.article} aria-labelledby={`scenario-${scenario.id}`}><Card className={styles.card}><CardHeader>
          <div className={styles.cardTop}><span className={styles.icon} aria-hidden="true">{scenario.id === 'bank' ? <Landmark size={20} /> : scenario.id === 'arrest' ? <ShieldAlert size={20} /> : <ScreenShare size={20} />}</span><span>{scenario.category}</span></div>
          <CardTitle id={`scenario-${scenario.id}`}>{scenario.title}</CardTitle>
          <CardDescription className={styles.hook}>{scenario.hook}</CardDescription></CardHeader><CardContent>
          <div className={styles.conversation}><Badge variant="outline">Fictional example</Badge><blockquote>“{scenario.quote.slice(0, scenario.quote.indexOf(scenario.evidence))}<mark>{scenario.evidence}</mark>{scenario.quote.slice(scenario.quote.indexOf(scenario.evidence) + scenario.evidence.length)}”</blockquote></div>
          <div className={styles.flags}><h4>What to notice</h4><ul>{scenario.flags.map(flag => <li key={flag}><Badge variant="outline" className={styles.flag}><TriangleAlert data-icon="inline-start" aria-hidden="true" />{flag}</Badge></li>)}</ul><p>{scenario.explanation}</p></div>
          <Alert variant="default" role="note" className={styles.advice}><AlertTitle>What you can do</AlertTitle><AlertDescription>{scenario.action}</AlertDescription></Alert>
          </CardContent><CardFooter className={styles.takeaway}>{scenario.takeaway}</CardFooter></Card>
        </article>)}
      </div>
      <p className={styles.note}><span aria-hidden="true">◇</span> Fictional learning examples, not detector results. Warning signs are reasons to pause and verify.</p>
    </div>
  </section>;
}
