/** Conceptual levels only. `safe` never guarantees a call is safe. */
export type RiskLevel = 'safe' | 'caution' | 'danger';
export interface TranscriptSegment {
  segmentId: string;
  text: string;
  languageCode: string;
}
export interface DetectorInput {
  sessionId: string;
  segments: readonly TranscriptSegment[];
}
export interface RiskIndicator {
  code: string;
  explanation: string;
  segmentIds: readonly string[];
}
export interface RiskAssessment {
  level: RiskLevel;
  indicators: readonly RiskIndicator[];
  summary: string;
}
export { analyze, createDetectorState } from './analyze.js';
export { normalizeText } from './normalize.js';
export { DETECTOR_CONFIG, SIGNAL_REASONS, WARNING_CODES } from './rules.js';
export type { DetectorCategory, DetectorResult, DetectorState, SignalGroup } from './types.js';
