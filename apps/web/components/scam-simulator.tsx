'use client';

import { useState, type ReactElement } from 'react';
import { ArrowRight, RotateCcw, PhoneOff, ShieldCheck } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { simulatorScenarios, type SimulatorScenario } from './simulator-scenarios';
import styles from './scam-simulator.module.css';

function Simulation({ scenario }: { scenario: SimulatorScenario }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<'verify' | 'comply' | null>(null);
  const reset = () => { setStep(0); setAnswer(null); };

  return <div className={styles.simulation}>
    <ol className={styles.steps} aria-label="Simulation progress">
      {['The introduction', 'The pressure', 'Your response'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span>{label}</li>)}
    </ol>
    <div aria-live="polite" aria-atomic="true" className={styles.story}>
      <p className={styles.caller}>{scenario.caller}</p>
      <h3>{answer ? 'What your choice means' : ['A familiar-sounding introduction.', 'Here comes the pressure.', 'What would you do next?'][step]}</h3>
      <blockquote>“{step === 0 ? scenario.introduction : scenario.demand}”</blockquote>
      {step === 0 && <p className={styles.context}>This is a fictional caller. Their introduction alone does not establish who they are.</p>}
      {step >= 1 && <Alert variant="warning"><AlertTitle>Warning signs in this example</AlertTitle><AlertDescription><ul className={styles.flags}>{scenario.flags.map(flag => <li key={flag}>{flag}</li>)}</ul></AlertDescription></Alert>}
      {answer && <Alert variant={answer === 'comply' ? 'warning' : 'default'}><AlertTitle>{answer === 'verify' ? 'A more cautious next step.' : 'Pause before following that request.'}</AlertTitle><AlertDescription>{answer === 'verify' ? scenario.safeFeedback : scenario.unsafeFeedback}</AlertDescription></Alert>}
    </div>
    {step === 2 && !answer && <div className={styles.choices} role="group" aria-label="Choose a response to the fictional caller">
      <Button variant="outline" onClick={() => setAnswer('comply')}>{scenario.unsafeAction}</Button>
      <Button onClick={() => setAnswer('verify')}><PhoneOff data-icon="inline-start" aria-hidden="true" />{scenario.safeAction}</Button>
    </div>}
    {answer && <p className={styles.verification}><ShieldCheck aria-hidden="true" />{scenario.verification}</p>}
    <div className={styles.controls}>
      <Button variant="ghost" size="sm" onClick={reset}><RotateCcw data-icon="inline-start" aria-hidden="true" />Start over</Button>
      {step < 2 && <Button onClick={() => setStep(current => current + 1)}>{step === 0 ? 'Continue the example' : 'Choose your response'}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>}
      {step === 2 && <DialogClose asChild><Button variant="outline">Finish example</Button></DialogClose>}
    </div>
  </div>;
}

export function ScamSimulator({ children, onOpen, themeClassName }: { children: ReactElement; onOpen: () => void; themeClassName?: string | undefined }) {
  return <Dialog onOpenChange={open => { if (open) onOpen(); }}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent themeClassName={themeClassName}>
      <DialogHeader>
        <div><Badge>Synthetic learning demo</Badge></div>
        <DialogTitle>Take a closer look at the call.</DialogTitle>
        <DialogDescription>Choose a fictional scenario, follow the conversation and practise your response. No microphone, real calls or live analysis.</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="bank" className={styles.tabs}>
        <TabsList aria-label="Choose a scam scenario" className={styles.scenarioTabs}>
          {simulatorScenarios.map(scenario => <TabsTrigger key={scenario.id} value={scenario.id}>{scenario.label}</TabsTrigger>)}
        </TabsList>
        {simulatorScenarios.map(scenario => <TabsContent key={scenario.id} value={scenario.id} className={styles.panel}><Simulation scenario={scenario} /></TabsContent>)}
      </Tabs>
      <p className={styles.disclaimer}>Prepared examples, not predictions. A warning sign is a reason to verify; its absence never guarantees safety.</p>
    </DialogContent>
  </Dialog>;
}
