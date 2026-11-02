# Proposed application contract v1.2 (additive; session.start version remains 1)

Canonical unions: packages/protocol/src/index.ts. Detector types: packages/detector/src/index.ts. No transport handlers or runtime validators are implemented in Phase 0. TypeScript types do not validate network input.

## Browser to relay

| Event | Payload | Validation expectation |
| --- | --- | --- |
| session.start | version: 1, consent: true, languageCode, audio, scenario?: string | First text message only; reject duplicates, absent consent, unsupported language/audio |
| audio.chunk | Binary data, not a JSON event | Exactly 1024 bytes of mono PCM signed 16-bit LE at 16000 Hz, only after readiness |
| session.end | sessionId, reason: user | Must identify current session; stop capture before sending |

AudioConfig fixes encoding=pcm_s16le, sampleRate=16000, channels=1, frameBytes=1024. One session per socket. Each binary WebSocket message is exactly one PCM chunk; its connection identifies the session, with no JSON envelope, base64 or WAV header. Maintain 32 ms cadence and bounded queues; reject audio before readiness or after termination. A future browser converter must reframe AudioWorklet output and discard incomplete tail samples unless a tested padding policy is introduced.

The optional `scenario` names a scenario in `data/scenarios`, for example `"kyc-otp"`. It is honored only with the mock STT provider (`--mock`) or an explicit `DEMO_MODE=1` environment flag. In any other mode, including `scenario` returns a recoverable `session.error` with code `INVALID_MESSAGE`, and the session does not start. Unknown scenario names produce the same recoverable error. Validate names against the list of files in `data/scenarios`; never use the supplied name directly as a file path. When `scenario` is given, no microphone audio is required and binary audio frames during the active scenario session are ignored; the `audio` configuration field remains required.

## Relay to browser

| Event | Payload | Validation expectation |
| --- | --- | --- |
| session.ready | sessionId, audio | Nonempty generated ID, config must match request; only after upstream ready |
| transcript.partial | sessionId, segment | Reserved; provider partial capability UNVERIFIED |
| transcript.final | sessionId, segment | segmentId, text, languageCode; deduplicate by segmentId |
| risk.update | sessionId, assessment | level safe/caution/danger; indicators and summary; references to existing segments |
| warning | sessionId, code, message | Known application code and sanitized user-facing text |
| warning.audio | warningCode: existing warning code type, language: existing language type, mimeType: audio/wav, audioBase64: string | Complete PCM16 mono 16000 Hz WAV, base64-encoded; one message per warning, no streaming |
| session.error | sessionId or null, code, message, recoverable | null only before readiness; bounded sanitized message |
| session.end | sessionId, reason user/timeout/error | Terminal notification; clear resources |

Error codes in the union: INVALID_MESSAGE, UPSTREAM_UNAVAILABLE, SESSION_EXPIRED, INTERNAL_ERROR. Never include keys, provider headers, raw stack traces or sensitive financial details in any response.

For `warning.audio`, the relay sends it once per warningCode per session, after the matching `risk.update` message. The browser plays it only after a user gesture (the Start button). The relay caches audio by (warningCode, language, voice). Mock mode generates a short valid WAV in code (for example, a one-second low-volume tone), with no external file. The wire object is exactly `{ type: "warning.audio", warningCode, language, mimeType: "audio/wav", audioBase64 }`; warningCode uses the existing warning code type and language uses the existing language type.

Before implementing handlers, validate JSON object shape and exact discriminators at every boundary; require nonempty IDs (maximum 128 characters), language allowlist, strings and finite numeric values, limit text frames to 16 KiB and transcript text to 8000 characters, reject unknown fields/events and oversized data. Limit detector history and indicator counts explicitly in implementation. Strings are untrusted data, never HTML. Session IDs identify a connection, not authorization credentials. Only accept allowed browser origins and authenticated/authorized sessions before allocating upstream resources.

## Provider protocol is separate

See gnani/stt-realtime.md for upstream headers, binary frames and provider messages: connected, processing, transcript, error, settings_updated; client update_settings. Our session.start/session.ready are not Gnani event names. Relay maps transcript to transcript.final; it must not invent partials. Close upstream when internal session.end arrives; a provider JSON stop event is UNVERIFIED.

## Detector boundary

DetectorInput: sessionId and readonly transcript segments (segmentId, text, languageCode). RiskAssessment: level, readonly indicators (code, explanation, segmentIds), summary. No detection function exists yet. Evidence references should identify segments without copying sensitive substrings into alerts. Assessment is an indicator, never proof; safe never guarantees safety.

## Proposed frontend state machine

| From | To | Trigger |
| --- | --- | --- |
| idle | connecting | Explicit consent and start |
| connecting | listening | session.ready |
| connecting | error / ended | Failure / user cancellation |
| listening / caution / danger | listening / caution / danger | New risk assessment (safe maps to listening) |
| listening / caution / danger | error | Capture, transport or fatal session failure |
| listening / caution / danger | ended | User stop or session.end |
| error | connecting | Explicit retry creating a fresh session |
| error | ended | Dismiss/stop |
| ended | connecting | New consented start |

Connection loss stops capture and invalidates prior risk immediately. Ignore stale events from earlier sockets. Recoverable provider errors may show warning only if continued monitoring is confirmed; otherwise enter error. All other transitions are invalid. No automatic recording on mount, retry or page restoration. No state-machine UI is implemented in Phase 0.
