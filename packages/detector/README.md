# Pure rules-only detector

```ts
let state = createDetectorState('en-IN');
const step = analyze('Synthetic example: apna OTP batao.', state);
state = step.state;
// step.result: { level, score, category, reasons, advice, warningCode? }
```

Create a fresh state for each session. Risk uses the existing safe/caution/danger
names and never decreases; score is the running maximum in 0–100. No globals hold
session data. The core performs no I/O, logging, clock reads, randomness, network
requests, evaluation of instructions, or LLM calls. State stores at most six group
IDs plus risk/score, bounded context flags (including whether a direct secret request
was seen), and the supplied language; no transcript
text or personal information is retained. Input/output states are separate objects.

`DETECTOR_CONFIG` contains all numeric policy values. Weights are sensitive request
65 (35 for polite Hinglish handover phrases such as "otp de sakte ho" or
"otp de dijiye"), urgency 20, authority 20, money movement 45, remote access 65,
secrecy 25. A lone polite request stays caution; independent context such as a bank
claim or block/KYC threat combines to danger. Direct commands retain their original
weight, even after a polite request in the same session. Each
additional independent group adds 25; the score caps at 100. Caution starts at 25,
danger at 60. Repetition within a group adds nothing. A single weak urgency or
authority clue stays safe; safe never guarantees safety. Reasons are fixed strings,
never excerpts of transcript content. All scoring is heuristic, not a probability
or a claim of measured accuracy.

Normalization lowercases text, preserves Indic vowel marks, collapses whitespace,
maps Devanagari digits to ASCII and replaces punctuation/symbols with spaces.
Sentence/contrast boundaries are retained separately for local negation matching.
Spelled-out OTP/PIN/CVV forms are recognized. Request verbs must occur near the
corresponding secret, money, or remote-access terms. Merely mentioning OTP or a bank
does not constitute a request or impersonation. Protective/negated clauses suppress
their own action; they do not erase evidence from other clauses or previous segments.

No protocol interface changed. DetectorState includes a directSensitiveRequest boolean
to retain the stronger request weight across segments. Detector types: SignalGroup, DetectorCategory,
DetectorState and DetectorResult. WarningCode and LanguageCode are imported as types
from the existing protocol aliases, without a runtime import or protocol edits.
Detector-only warning values are SENSITIVE_REQUEST, DIGITAL_ARREST, MONEY_MOVEMENT,
REMOTE_ACCESS and SCAM_PATTERN; warningCode is present only at danger. Categories
are none, kyc_otp, digital_arrest, refund_upi, remote_access and other. English advice
is the fallback; hi-IN/mr-IN select Hindi/Marathi advice. There is no language detection.

Known limits: word lists and bounded negation windows miss paraphrases, dialects,
indirect requests, complicated quotations and transcription mistakes. They can also
flag legitimate instructions. Groups accumulate for the entire supplied session,
so unrelated clues can combine; only a new state resets them. Partial secret/action
phrases split across transcript segments are not joined. These limitations require
evaluation before any real use. There is no relay adapter or change to its mock
warning allowlist in this task.

Run `npm test -w packages/detector`, `npm run typecheck -w packages/detector`, and
`npm run build -w packages/detector` using the checkout's existing TypeScript compiler.
The root test script runs detector tests followed by the unchanged relay suite.

Human Hinglish regression coverage includes named case/warrant threats (aapke naam
par/per case, aapke khilaf warrant), ED/cyber-crime claims, and conditional payment
pressure (payment nahi kiya toh). Only that observed payment condition is scoped
away from its consequence for arrest negation; normal protective negatives remain
negated. These reuse authority, urgency and money indicators. A recognized legal
threat paired with an authority claim uses the existing digital_arrest category
and DIGITAL_ARREST warning, including an RBI/bank impersonation claim; this does
not imply that the claimed institution has arrest powers. No public types changed.
