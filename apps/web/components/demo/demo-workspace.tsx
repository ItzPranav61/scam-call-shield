'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Badge } from '../ui/badge';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Play, Pause, RotateCcw, MicOff, FileText, ShieldAlert, CircleAlert, AudioLines, ArrowRight, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LiveRelayDemo } from './live-relay-demo';
import { useDemoPlayback } from '../../hooks/use-demo-playback';
import { demoScenarios, DEMO_DURATION, type DemoScenario } from './demo-scenarios';
import styles from './interactive-demo.module.css';

function EvidenceText({ text, evidence }: { text: string; evidence?: string | undefined }) {
  if (!evidence || !text.includes(evidence)) return <>{text}</>;
  const index = text.indexOf(evidence);
  return <>{text.slice(0,index)}<mark>{evidence}</mark>{text.slice(index+evidence.length)}</>;
}

function DemoPlayer({ scenario }: { scenario: DemoScenario }) {
  const reduced = useReducedMotion();
  const { status, elapsed, play, pause, restart } = useDemoPlayback(DEMO_DURATION);
  const visibleSegments = status === 'idle' ? [] : scenario.segments.filter(segment => segment.at <= elapsed);
  const latest = visibleSegments[visibleSegments.length - 1];
  const risk = latest?.risk ?? 'context';
  const riskLabel = !latest ? 'Ready when you are' : risk === 'high' ? 'High risk indicators' : risk === 'caution' ? 'Caution' : 'Not enough context';
  const playing = status === 'playing';

  return <div className={styles.player}>
    <div className={styles.sessionTop}><div><span className={styles.mic}><MicOff aria-hidden="true" /></span><span><strong>{scenario.description}</strong><small>Microphone off · Prepared script · No voice recording</small></span></div><span className={styles.clock}>{String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}<small>/ 00:14</small></span></div>
    <Progress value={elapsed} max={DEMO_DURATION} aria-label="Scripted example progress" aria-valuetext={`${elapsed} of ${DEMO_DURATION} seconds — scripted playback`} />
    <div className={styles.workspace}>
      <div className={styles.transcript}>
        <div className={styles.panelHeading}><span><FileText aria-hidden="true" />Example transcript</span><Badge variant="outline">{status === 'idle' ? 'Not started' : status === 'playing' ? 'Playing script' : status === 'paused' ? 'Paused' : 'Complete'}</Badge></div>
        {status === 'idle' ? <div className={styles.empty}><AudioLines aria-hidden="true" /><h3>Read the pattern. See the warning.</h3><p>Press Start Demo to reveal a fictional conversation as text. No sound is played and no live audio is processed.</p></div> : <ol className={styles.segments} aria-label="Fictional transcript" aria-live="polite" aria-relevant="additions" aria-atomic="false">{visibleSegments.map(segment=><motion.li key={segment.at} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .18 }}><span>00:{String(segment.at).padStart(2,'0')}</span><p><EvidenceText text={segment.text} evidence={segment.evidence} /></p></motion.li>)}</ol>}
        <p className={styles.scriptNote}>Fictional caller dialogue. No speaker recognition or real-time AI output.</p>
      </div>
      <div className={styles.riskPanel}>
        <p className={styles.panelLabel}>Prepared risk events</p>
        <Alert variant={risk === 'context' ? 'default' : 'warning'} className={styles.assessment} data-risk={risk} aria-live="polite" aria-atomic="true">
          <span className={styles.riskIcon}>{risk === 'high' ? <ShieldAlert aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}</span><AlertTitle className={styles.riskTitle}>{riskLabel}</AlertTitle>
          <AlertDescription>{latest?.explanation ?? 'The transcript and warning states will change at fixed points in the script. They are not predictions.'}</AlertDescription>
          {latest && <Badge variant="outline" className={styles.indicator}>{latest.indicator}</Badge>}
          {latest?.evidence && <blockquote className={styles.supporting}><span>Supporting phrase in this script</span>“{latest.evidence}”</blockquote>}
        </Alert>
        <div className={styles.advice}><span>Suggested next step</span><p>{latest?.recommendation ?? 'Choose a scenario and start the example. Never disclose real OTPs, passwords or payment PINs.'}</p></div>
      </div>
    </div>
    <div className={styles.controls}><div className={styles.buttons}>
      <Button onClick={playing ? pause : play}>{playing ? <Pause data-icon="inline-start" aria-hidden="true" /> : <Play data-icon="inline-start" aria-hidden="true" />}{playing ? 'Pause Demo' : status === 'paused' ? 'Resume Demo' : status === 'complete' ? 'Replay Demo' : 'Start Demo'}</Button>
      <Button variant="outline" onClick={restart} disabled={status === 'idle'}><RotateCcw data-icon="inline-start" aria-hidden="true" />Restart Demo</Button>
    </div><span className={styles.playbackNote}>{status === 'complete' ? <><Check aria-hidden="true" />Example complete</> : <><MicOff aria-hidden="true" />Your microphone stays off</>}</span></div>
    {status === 'complete' && <div className={styles.summary} role="status"><strong>This example is complete—not a real call assessment.</strong><p>{latest?.recommendation} Risk indicators never guarantee safety.</p></div>}
  </div>;
}

function ScriptedDemo() {
  return <Tabs defaultValue="otp" className={styles.demo}>
    <div className={styles.demoToolbar}><Badge variant="outline" className={styles.demoBadge}>Scripted preview, not live — No live audio is being processed.</Badge><Badge variant="secondary"><MicOff aria-hidden="true" />Microphone off</Badge></div>
    <div className={styles.scenarioPicker}><p>Choose a scenario<ArrowRight aria-hidden="true" /></p><TabsList aria-label="Choose an interactive demo scenario" className={styles.scenarioTabs}>{demoScenarios.map(scenario=><TabsTrigger key={scenario.id} value={scenario.id}>{scenario.label}</TabsTrigger>)}</TabsList></div>
    {demoScenarios.map(scenario=><TabsContent key={scenario.id} value={scenario.id} className={styles.tabPanel}><DemoPlayer scenario={scenario} /></TabsContent>)}
  </Tabs>;
}

export function DemoWorkspace({ recording = false }: { recording?: boolean } = {}) {
  const [mode, setMode] = useState('scripted');
  if (recording) return <LiveRelayDemo recording />;
  // Restored browser focus must not auto-activate Live relay on page load.
  return <Tabs value={mode} onValueChange={setMode} activationMode="manual" className={styles.demo}>
    <TabsList aria-label="Demo mode">
      <TabsTrigger value="scripted">Scripted preview - not live</TabsTrigger>
      <TabsTrigger value="live">Live relay</TabsTrigger>
    </TabsList>
    <TabsContent value="scripted"><ScriptedDemo /></TabsContent>
    <TabsContent value="live"><LiveRelayDemo /></TabsContent>
  </Tabs>;
}
