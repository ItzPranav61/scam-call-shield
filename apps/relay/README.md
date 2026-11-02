# Local mock relay

Run from the repository root: `npm run dev:relay -- --mock`. HTTP health is
`http://localhost:8787/health`; WebSocket is `ws://localhost:8787/ws`.
Only mock mode is implemented. STT replays synthetic transcripts; the real rules-only
detector analyzes each segment with per-session state. Warning audio is a quiet one-second tone,
not synthesized speech. There are no Gnani calls or credential reads.

The server binds to 0.0.0.0 on PORT (default 8787). Allowed browser origins default
to `http://localhost:3000` and `http://127.0.0.1:3000`; `ALLOWED_ORIGINS` can set a
comma-separated allowlist. Every WebSocket client must supply an allowed Origin,
including CLI clients (`RELAY_ORIGIN`). This is not production session authentication.
SIGTERM/SIGINT use close code 1000, with a five-second fallback for unresponsive peers.
See [deployment instructions](../../docs/deploy.md) for container and host settings.

Set environment variables in PowerShell before starting, for example
`$env:MAX_SESSION_SECONDS = '60'`. Server configuration does not load `.env`.
`PORT` defaults to 8787, `MAX_SESSION_SECONDS` to 300. Setting `RELAY_DISABLED=1`
rejects new upgrades and new starts without interrupting existing sessions.
`DEBUG_TRANSCRIPTS=1` explicitly enables synthetic transcript text in stage logs.
Stage logs otherwise contain only session IDs, stage names and elapsed milliseconds.

The wire protocol remains session.start version 1. Supported mock language codes
are en-IN, hi-IN and mr-IN. JSON messages are strict and capped at 16 KiB.
Recoverable validation errors use session.error / INVALID_MESSAGE. Transport payloads
over 64 KiB close the socket rather than buffering unbounded input. Binary messages
must be exactly 1024 bytes after readiness, with no WAV container. Headerless PCM
does not identify its own channel count or sample rate; those are declared and
validated in session.start. The forwarding queue holds at most 128 frames and uses absolute 32 ms
deadlines (31.25 frames/s on average), correcting timer lateness. Queue overflow rejects the frame with a recoverable session.error.

The first successful analysis publishes its initial risk, including safe/zero. Later
risk.update messages are sent only if level or internal score changed. Risk never
decreases. Existing RiskAssessment has no numeric score field; its wire shape is unchanged.
Reasons retain bounded references to the first supporting segment for each group.
Detector exceptions leave state intact, send recoverable INTERNAL_ERROR, and continue.
Risk summaries and warning text identify the synthetic source. Each new detector
warningCode produces one warning and warning.audio per session. Audio is cached
across sessions in memory by warningCode/language/voice, before calling TtsProvider;
the mock voice is `mock-tone`. Client stop, timeout, disconnect, and server shutdown
cancel timers and discard audio buffers. One session is allowed per socket, including
after termination. Create a new connection for a new session.

`npm run test` runs Vitest, and `npm run typecheck` checks relay/tests plus imported
protocol and detector types with the existing TypeScript compiler. The existing
TypeScript 5.9.3 compiler must be installed in the checkout; this task adds no new
compiler dependency. `npm run build --workspace=@scamcall/relay` compiles server code;
`npm run start --workspace=@scamcall/relay -- --mock` runs the compiled relay.

Contract note v1.2 adds optional `session.start.scenario` (e.g. `kyc-otp`). Names are
looked up in a catalog loaded from actual JSON files in data/scenarios at startup;
client input is never converted into a path. Unknown names return recoverable
INVALID_MESSAGE without starting. Scenarios require the mock provider or explicit
DEMO_MODE=1. In a demo with another provider selected, fixture replay replaces that
provider and never calls it. No microphone frames are required; audio configuration
remains mandatory and any binary frames during an active scenario session are ignored.
Other input validation and the 64 KiB transport ceiling still apply.

Start the relay, then run `node apps/relay/scripts/run-scenario.mjs kyc-otp` from the
root (or select genuine-bank-alert, borderline-delivery, digital-arrest, refund-upi).
The client prints message types, risk levels and WAV byte counts, never transcripts.
It ends the session after fixture messages stop. Without scenario, the default mock
script remains available and incoming PCM frames retain their validation/pacing.

Predev/pretest/prebuild compile the existing detector before runtime import; no new
dependency is installed. Logs include per-segment stt->detector, detector->tts (when
warning audio is needed), and total processing milliseconds, not acoustic latency.


## Explicit live startup and mode diagnosis

`npm run dev:relay` keeps its existing default: shell `RELAY_MODE` or mock when
unset. The legacy `--mock` flag is ignored. Root environment-file settings do not
select the mode because the mode is resolved before that file is loaded. Existing
live loading keeps its precedence: the file credential overrides the shell
credential, while other file settings fill only unset shell variables. Missing
credentials fail startup rather than selecting mock. `DEMO_MODE` does not select
live, and this branch still rejects `session.start.scenario` in live mode.

Use `npm run dev:relay:live` from the root to force live even if a shell variable
says mock. It forwards the new `--live` opt-in, loads configuration inside the
relay, and exits nonzero with a one-line error naming `GNANI_API_KEY` if absent.
The relay's first log line gives mode, port, allowlisted-origin count and key
presence only. No credential or origin value is printed by that diagnostic.

`GET /health` now returns exactly `{"ok":true,"mode":"mock"}` or the live
variant. Requests with an allowed Origin receive matching CORS; foreign origins
receive 403. Requests without Origin remain available for health checks. Health
exposes no counts, credentials or other configuration. This is HTTP metadata;
WebSocket session messages remain contract v1.2.


Continuous streaming uses absolute deadlines rather than adding 32 ms after
callbacks finish. Late callbacks catch up only to the elapsed frame budget;
idle gaps do not bank unlimited catch-up credit. The live STT provider relies
on this scheduler instead of adding a second relative pacing timer. Its pending
connection queue holds 128 frames, and its upstream WebSocket buffer guard is
128 KiB. Overflow remains a sanitized, recoverable provider failure. Long fake-
timer simulations cover steady and eight-frame-burst input with delayed callbacks.
