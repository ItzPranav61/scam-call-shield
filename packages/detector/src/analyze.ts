import type { LanguageCode } from '@scamcall/protocol';
import type { RiskLevel } from './index.js';
import { DETECTOR_CONFIG, SIGNAL_REASONS, WARNING_CODES } from './rules.js';
import { findSignals } from './signals.js';
import type { DetectorCategory, DetectorResult, DetectorState, SignalGroup } from './types.js';

export function createDetectorState(language: LanguageCode = 'en-IN'): DetectorState {
  return { language, signalGroups: [], arrestThreat: false, directSensitiveRequest: false, lawEnforcementContext: false, level: 'safe', score: 0 };
}

function categoryFor(groups: readonly SignalGroup[], arrest: boolean): DetectorCategory {
  if (groups.includes('remote')) return 'remote_access';
  if (arrest && groups.includes('authority')) return 'digital_arrest';
  if (groups.includes('sensitive')) return 'kyc_otp';
  if (groups.includes('money')) return 'refund_upi';
  return groups.length ? 'other' : 'none';
}
function adviceFor(level: RiskLevel, language: LanguageCode): string {
  if (language === 'mr-IN') return level === 'danger'
    ? 'कॉल बंद करा. गुप्त माहिती देऊ नका, पैसे पाठवू नका आणि अॅप इन्स्टॉल करू नका. अधिकृत संपर्क स्वतः तपासा.'
    : 'अधिकृत संपर्क स्वतः तपासा. कोणतीही गुप्त माहिती देऊ नका. सुरक्षिततेची हमी नाही.';
  if (language === 'hi-IN') return level === 'danger'
    ? 'कॉल काट दें। गुप्त जानकारी न दें, पैसे न भेजें और ऐप इंस्टॉल न करें। आधिकारिक संपर्क खुद जाँचें।'
    : 'आधिकारिक संपर्क खुद जाँचें और गुप्त जानकारी न दें। सुरक्षित होने की गारंटी नहीं है।';
  if (level === 'danger') return 'End the call. Do not share secrets, install apps, or send money. Verify the institution independently.';
  if (level === 'caution') return 'Be cautious. Verify the caller independently; do not share secrets or send money.';
  return 'No strong scam indicators detected. A safe result never guarantees safety.';
}

/** Pure, deterministic session update. Transcript content is data, never instructions. */
export function analyze(segment: string, state: DetectorState): { state: DetectorState; result: DetectorResult } {
  const detected = findSignals(segment, state.lawEnforcementContext);
  // Canonical order gives stable reasons regardless of the order of matching words.
  const signalGroups = (Object.keys(SIGNAL_REASONS) as SignalGroup[])
    .filter((group) => state.signalGroups.includes(group) || detected.groups.includes(group));
  const directSensitiveRequest = state.directSensitiveRequest || detected.directSensitiveRequest;
  const weights = signalGroups.reduce((sum, group) => sum + (group === 'sensitive' && !directSensitiveRequest
    ? DETECTOR_CONFIG.politeSensitiveWeight : DETECTOR_CONFIG.weights[group]), 0);
  const combined = weights + Math.max(0, signalGroups.length - 1) * DETECTOR_CONFIG.extraGroupBonus;
  const score = Math.min(DETECTOR_CONFIG.maxScore, Math.max(state.score, combined));
  const computed: RiskLevel = score >= DETECTOR_CONFIG.dangerScore ? 'danger'
    : score >= DETECTOR_CONFIG.cautionScore ? 'caution' : 'safe';
  const rank = { safe: 0, caution: 1, danger: 2 };
  const level = rank[state.level] > rank[computed] ? state.level : computed;
  const arrestThreat = state.arrestThreat || detected.arrestThreat;
  const category = categoryFor(signalGroups, arrestThreat);
  const result: DetectorResult = { level, score, category,
    reasons: signalGroups.map((group) => SIGNAL_REASONS[group]), advice: adviceFor(level, state.language) };
  if (level === 'danger') {
    result.warningCode = category === 'remote_access' ? WARNING_CODES.remote
      : category === 'digital_arrest' ? WARNING_CODES.arrest
      : category === 'kyc_otp' ? WARNING_CODES.sensitive
      : category === 'refund_upi' ? WARNING_CODES.money : WARNING_CODES.other;
  }
  return { state: { language: state.language, signalGroups, arrestThreat, directSensitiveRequest, lawEnforcementContext: detected.lawEnforcementContext, level, score }, result };
}
