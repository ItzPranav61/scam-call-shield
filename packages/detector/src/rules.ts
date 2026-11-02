import type { WarningCode } from '@scamcall/protocol';

/** Heuristic policy, not an accuracy estimate. All scoring/context thresholds live here. */
export const DETECTOR_CONFIG = {
  // A weak authority claim or urgency phrase alone stays below caution.
  cautionScore: 25,
  dangerScore: 60,
  maxScore: 100,
  // Direct secret requests and remote-install requests warrant a warning on their own.
  weights: { sensitive: 65, urgency: 20, authority: 20, money: 45, remote: 65, secrecy: 25 },
  // Independent groups compound risk; repeated words within a group add nothing.
  extraGroupBonus: 25,
  // Polite OTP handover phrases alone are caution; any independent group compounds them.
  politeSensitiveWeight: 35,
  requestWindowTokens: 6,
  negationBeforeTokens: 3,
  negationAfterTokens: 2,
} as const;

export const SIGNAL_REASONS = {
  sensitive: 'Requests an OTP, PIN, CVV, or password.',
  urgency: 'Uses urgency, blocking, or arrest threats.',
  authority: 'Claims authority from an institution or official.',
  money: 'Requests money movement or a payment.',
  remote: 'Requests remote access, an app installation, or a suspicious link.',
  secrecy: 'Pressures you to keep secrets or stay on the line.',
} as const;

// WarningCode is the existing protocol alias; no transport types or enums are changed.
export const WARNING_CODES = {
  sensitive: 'SENSITIVE_REQUEST',
  arrest: 'DIGITAL_ARREST',
  money: 'MONEY_MOVEMENT',
  remote: 'REMOTE_ACCESS',
  other: 'SCAM_PATTERN',
} as const satisfies Record<string, WarningCode>;
