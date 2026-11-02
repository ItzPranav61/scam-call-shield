import type { LanguageCode, WarningCode } from '@scamcall/protocol';
import type { RiskLevel } from './index.js';

export type SignalGroup = 'sensitive' | 'urgency' | 'authority' | 'money' | 'remote' | 'secrecy';
export type DetectorCategory = 'none' | 'kyc_otp' | 'digital_arrest' | 'refund_upi' | 'remote_access' | 'other';

/** Bounded session summary; never contains transcript text or personal details. */
export interface DetectorState {
  readonly language: LanguageCode;
  readonly signalGroups: readonly SignalGroup[];
  readonly arrestThreat: boolean;
  readonly directSensitiveRequest: boolean;
  readonly lawEnforcementContext: boolean;
  readonly level: RiskLevel;
  readonly score: number;
}
export interface DetectorResult {
  level: RiskLevel;
  score: number;
  category: DetectorCategory;
  reasons: string[];
  advice: string;
  warningCode?: WarningCode;
}
