import { memo } from 'react';
import type { LiveState } from '../../lib/relay/client';
import { Button } from '../ui/button';
import styles from './live-relay-demo.module.css';

const labels = { safe: 'safe — no strong indicators; safety is not guaranteed', caution: 'caution — suspicious indicators', danger: 'danger — high-risk indicators' };

export const TranscriptPanel = memo(function TranscriptPanel({ segments, recording }: { segments: LiveState['transcripts']; recording: boolean }) {
  return <section aria-label="Relay transcript" tabIndex={recording ? 0 : undefined}><h3>Relay transcript</h3><ol aria-live="polite" aria-relevant="additions">{segments.map(segment => <li key={segment.segmentId}>{segment.text}</li>)}</ol>{!segments.length && <p>No final transcript received yet.</p>}</section>;
});

export const RiskPanel = memo(function RiskPanel({ assessment, warning, audioError, canReplay, onReplay, recording, ended = false }: {
  assessment: LiveState['assessment']; warning: string; audioError: string; canReplay: boolean; onReplay: () => void; recording: boolean; ended?: boolean;
}) {
  return <section aria-label="Relay risk assessment" tabIndex={recording ? 0 : undefined}><h3>Risk indicators</h3><p className={styles.risk} data-level={assessment?.level ?? 'none'} data-ended={ended} aria-live="polite">{assessment ? ended ? `Session ended - last assessment: ${assessment.level.toUpperCase()}` : labels[assessment.level] : 'No current assessment'}</p>
        {assessment && <><p>{assessment.summary}</p><h4>Why</h4><ul>{assessment.indicators.map((indicator, index) => <li key={`${indicator.code}-${index}`}>{indicator.explanation}</li>)}</ul></>}
        {warning && <p role="alert">{warning}</p>}
        {audioError && <p role="alert">{audioError}</p>}
        {canReplay && <Button variant="outline" onClick={onReplay}>Play warning</Button>}
      </section>;
});
