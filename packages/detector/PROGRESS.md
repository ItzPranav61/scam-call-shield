# Rules-only detector — 2026-10-25

Test-first evidence: before implementation, `npm test -w packages/detector` exited 1
with 61 failed tests because analyze/createDetectorState/normalizeText are not implemented.
Tests cover all six signal groups, Hindi/Marathi requests, local negation/protective
context, combinations across segments, escalation, determinism/immutability, bounded
state, prompt-injection text and five synthetic JSON scenarios. No accuracy claims.

The test commit preserves the pre-existing domain interfaces and adds test/build
configuration plus root test wiring. Vitest is already installed in the workspace;
no installation or additional dependency was needed beyond declaring that test tool.
Implementation and final verification follow in the second commit.

Implementation evidence:

- Added pure analyze/createDetectorState/normalizeText functions, finite group state,
  canonical reasons, fixed advice, weights/thresholds in DETECTOR_CONFIG and detector
  warning values typed with the existing WarningCode alias. LanguageCode is also a
  type-only import. Existing interfaces, risk names and protocol files are unchanged.
- Initial implementation passed 60/61 tests; the borderline-delivery scenario exposed
  missing negation for `bhejne ki zarurat nahi`. A local need-negation rule fixed it.
- Added Marathi group tests, contraction/need-negation regressions and five acronym
  regressions before implementing their support. Acronym tests first failed (5/74),
  then passed after normalizing spaced/dotted OTP/PIN/CVV and Hindi spaced OTP.
- Final `npm test -w packages/detector`: 74 passed, 0 failed.
- Root `npm test`: detector 74 passed plus relay 34 passed (108 total).
- Root `npm run typecheck`: exit 0. Detector-only typecheck with --noUnusedLocals and
  --noUnusedParameters: exit 0. Its initial TS5090 path configuration error was fixed
  by making the detector path explicitly relative.
- `npm run build -w packages/detector`: exit 0 with declaration output. The build
  includes referenced type sources under the existing monorepo-root output layout;
  no runtime protocol import or new runtime dependency is introduced.
- Root lint still prints `not implemented yet`, so it supplies no real lint evidence.
  Strict/unused-code checks above are the actual static checks. No dependency install,
  external service calls, relay wiring, web changes or accuracy measurements occurred.

Limitations are documented in README.md: heuristic word lists/negation windows,
whole-session accumulation and no phrase reconstruction across segment boundaries.
No raw transcript is retained by the detector. Caller must create fresh session state.


## 2026-10-26 STT spelling variants

Added thirteen tests first: two failed for unrecognized positive requests using bataaen and bata do, while the other spelling/negation cases passed. Added anchored bata/bataaen request variants using the existing proximity and negation rules. All eighty-seven detector tests now pass, including mat bataaen, mat batana and never share OTP protective advice; no scoring or contract changes. Detector typecheck, lint and build passed. Requested scope only; no external LLM.


The authorized realtime probe later returned ओटीपी मैट बताएं for protective OTP advice. A regression test first failed (danger instead of safe); added the observed phonetic मैट spelling to the existing negation tokens. This does not change scores or expand negation windows. All eighty-eight detector tests must pass before the final provider commit; this additional item-six fix is included alongside the live-probe evidence.


## 2026-10-26 contextual live-STT regression suite

Thirty-seven new cases were committed before implementation: fourteen failed for contextual rest/arrested/officer variants. Added a transcript-free law-enforcement context flag, gated rest karenge/rest kar denge threats and digital_arrest classification, and added arrested/officer tokens. Bank-only claims and benign rest stay safe, as do negated threats and the complete genuine/borderline scenarios. Secrecy, account-block tense variants and OTP abhi bataiye were already recognized; tests retain their behavior. All original tests are retained. Scores/thresholds and protocol types are unchanged. Final detector count: 128 tests, including three separate demo-fixture tests. Root test/typecheck/lint/build all pass; no API/audio generation.
