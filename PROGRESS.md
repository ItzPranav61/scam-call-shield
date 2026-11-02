# ScamCall Shield progress

Current engineering status: **mock relay and rules-only detector implemented; clean-clone build verified**. Updated 2026-10-25 (Asia/Calcutta). Live-provider verification remains separate. Earlier entries below are historical evidence.

## Relay deploy readiness and CI — 2026-10-25

The relay now binds 0.0.0.0 using PORT (default 8787). WebSocket upgrades require an
explicit Origin from ALLOWED_ORIGINS; defaults remain the two localhost frontend
origins. Missing/null/unlisted headers are rejected. Non-loopback proxy traffic is
no longer rejected solely by address. Origin configuration is validated at startup;
it is not session authentication. The scenario client accepts URL via argument or
RELAY_WS_URL and sends RELAY_ORIGIN, with safe localhost defaults.

SIGTERM/SIGINT use an idempotent graceful close path: stop HTTP accepts, stop mock
timers/PCM queues, send the existing terminal session event, close WebSockets with
code 1000, then clear cache. A five-second deadline terminates unresponsive peers.
The Docker CMD starts Node directly rather than an npm/shell parent.

Added a Node 20 multi-stage Dockerfile calling the root build:node script, a non-root
runtime, healthcheck, production-only workspace dependency install, explicit runtime
copies and context allowlist. Env files and project tests are not copied; vendored
test/env fixtures are scrubbed inside node_modules with a path-boundary check. No
secrets are read, added, or required; the image remains --mock with no Gnani calls.
No detector, web, contract, root package or dependency-lock changes were made.

CI triggers on pushes and PRs targeting main, uses Ubuntu + Node 20.x and runs npm ci,
build, test, typecheck and lint. Workflow YAML was parsed with the installed js-yaml
library, and triggers, required command order and Node version were checked. No
repository secret references or deploy/publish steps are present. docs/deploy.md
contains Railway and Fly steps checked against linked official documentation,
including always-on settings, origin configuration, host shutdown grace and URL-based
post-deploy mock checks. No actual host deployment or GitHub CI run was performed.

Actual verification:

- Docker CLI is unavailable on this machine; docker build was explicitly skipped,
  so the image build itself remains unverified here.
- Installed dependencies require Node 20.19+ for Vite. Obtained a temporary Node
  20.20.2 runtime without changing package manifests or lockfile.
- A direct Node 20 root build hit Windows EPERM on an old cloud-synced .next/static
  directory. No unknown processes were killed and no locked directory was deleted.
- Exported HEAD plus only the task's allowed edits to a fresh source snapshot at
  local-artifacts/scam-call-shield-node20-42e63f22 outside a cloud-synced folder and without .env. Under
  Node 20.20.2, npm ci, root build (including web), test, typecheck and lint all exited 0.
  Tests: 74 detector + 59 relay + 3 foundation = 136 passed; 1 actual POSIX SIGTERM
  process test skipped on Windows. It runs on Ubuntu CI; cross-platform graceful
  shutdown tests still verified close code 1000.
- Separately installed the Dockerfile's exact production workspace dependency selection
  in local-artifacts/scam-call-shield-runtime-bb21e412. No TypeScript, Vitest, tsx, ESLint or
  Next runtime was installed. Executed the Dockerfile's fixture scrub and audited the
  assembled compiled runtime: no env/test files remained in that app payload.
- That production-only payload ran on Node 20.20.2 at PORT=18787. Windows listener
  inspection showed 0.0.0.0; /health returned {"ok":true}; the URL-parameterized client
  with an allowed HTTPS Origin finished kyc-otp at danger with one 32044-byte WAV.
- A connected client observed close code 1000 when that runtime received console
  SIGINT. Runtime and client both stopped; no manually started server remains.
- git diff --check passed. Existing smoke-script modifications and intent-to-add
  quick-start/smoke notes remain untouched and are not included in this task's commit.

## Clean-clone build repair — 2026-10-25

Pinned the installed TypeScript 5.9.3 and @types/node 24.19.2 at the root. Declared
the existing ESLint 9.39.5 and eslint-config-next 16.4.3 tooling required by the
scaffold config. npm warns that ESLint 9.39.5 is deprecated; these versions preserve
the previously used compatible tooling rather than introducing a framework upgrade.
Root build runs protocol, detector and relay, followed by the existing Next.js web
placeholder. Protocol resolves its type-only detector references from source, so it
does not require generated declarations before the first build; exports match its
monorepo-root output layout. No relay/detector logic or contract edits were made.

Root dev:web and lint are real commands. Root typecheck checks all four workspaces.
Root tests build their Node prerequisites and run detector, relay and updated root
foundation tests. The latter verify built exports, root compiler resolution from
every workspace, exact compiler/Node-type pins, and built mock relay health.

Working-checkout checks before clone verification: npm install, root build (including
web), lint, test and typecheck all exited 0. Tests: 74 detector + 51 relay + 3 foundation
(128 total). Root examples were checked for empty credential values.

Fresh-clone evidence: used `git clone --no-local --single-branch --branch
codex/clean-clone-build` into
`local-artifacts/scam-call-shield-clean-20261025-a20218c6`.
Before installation, .env, node_modules, apps/web/.next and detector/dist were absent.
The install used a new npm cache in a sibling verification folder, with inherited
provider-key variables and NODE_PATH removed from the verification process.

Executed in that clone, in order:

| Command | Actual result |
| --- | --- |
| npm install | Exit 0; found 0 vulnerabilities |
| npm run build | Exit 0; protocol, detector, relay and Next.js web built; / and /_not-found prerendered |
| npm test | Exit 0; detector 74 passed, relay 51 passed, foundation 3 passed, 0 failed (128 total) |
| npm run typecheck | Exit 0; all four workspace tsc commands passed |
| npm run lint | Exit 0; real ESLint checks passed |

No .env existed after the sequence, and git status was clean. Full command logs are
in the sibling `-verification` folder, outside the repository. The foundation test
confirmed every workspace resolves the clone's root TypeScript compiler and exact
root compiler/Node-type versions, not an undeclared global or original checkout tool.

Additional clone smoke checks: `npm run dev:web -- --port 3107` served HTTP 200 with
the expected placeholder, and `npm run dev:relay -- --mock` served HTTP 200 with
the expected health object on port 8787. Both manually started servers were stopped.
Next.js dev generated its own agent metadata in the verification clone; no such dev
output was copied into this repository. No framework or application logic changed.

The final commit amendment only records this evidence in PROGRESS.md; the tested
build code, dependencies, lockfile and scaffold are unchanged. Excluded local smoke
scripts/quick-start changes, private env and sample audio remain outside this commit.

## Completed and verified

- DONE: inspected the initially empty repository; main was clean. Work is on codex/phase-0-foundation. Existing local directory name scam-call-shield was preserved; intended remote repository name is scamcall-shield.
- DONE: npm workspaces for web, relay, detector and shared protocol. Next.js App Router placeholder, Tailwind and strict TypeScript configured. Detector and protocol expose domain/transport types only. Relay exposes liveness only, with no recording, WebSocket or provider integration.
- DONE: AGENTS.md, architecture, proposed contract with directions/validation/framing/state transitions, separate env examples and secret exclusions.
- DONE: official Gnani introduction, quick start, realtime STT, REST STT, REST TTS and documentation index retrieved 2026-10-24. Notes identify conflicting examples and UNVERIFIED details; this is documentation verification, not live API verification.
- DONE: prepared PowerShell/curl STT and TTS smoke scripts. PowerShell parser validation passed. Missing-credential paths actually executed and reported BLOCKED (exit 2). No live provider requests were sent.
- DONE: initial strict typecheck across all four workspaces, two foundation tests (2 passed, 0 failed), all production builds including Next.js static placeholder.
- DONE: .env.local, relay .env and smoke artifacts verified ignored; all three .env.example files remain trackable. No real credential was added or printed.

## Verification record

Environment: Windows PowerShell, Node 24.14.1, npm 11.13.0. Next.js 16.4.3, React 19.3.1, TypeScript 5.9.3. Initial npm install succeeded with zero reported vulnerabilities.

| Check | Status | Evidence |
| --- | --- | --- |
| Clean npm ci with final dependency pins | DONE | Exit 0; 377 packages audited, zero reported vulnerabilities; deprecation warning documented below |
| npm workspace resolution | DONE | npm ls --depth=0 and import-resolution test |
| npm run lint | DONE | Corrected monorepo rootDir and default-export warnings; rerun passed |
| npm run typecheck | DONE | All four workspaces passed |
| npm test | DONE | 2 foundation tests passed, 0 failed |
| npm run build | DONE | Shared packages, relay and Next.js built; / is static |
| Production HTTP placeholder check | DONE | Local Next.js production server returned HTTP 200 and expected placeholder text; process stopped afterwards |
| STT live smoke | BLOCKED | GNANI_API_KEY absent; consented synthetic WAV/expected text also needed |
| TTS live smoke and audibility | BLOCKED | GNANI_API_KEY absent; listening cannot be confirmed |
| Vercel deployment | BLOCKED | Read-only project lookup returned UNAUTHORIZED: connection requires reauthentication |
| Eligibility question sent manually | BLOCKED | User must send draft from README to organizers |

Final verification after the clean install: npm ls --depth=0 and npm ls eslint both exited 0; npm run lint, npm run typecheck, npm test and npm run build all exited 0. Tests: 2 passed, 0 failed. git diff --check passed.

Tooling issue found and corrected: ESLint 10 passed lint but npm ls detected unsupported peer ranges in Next.js's bundled import/react/accessibility plugins. Final configuration pins compatible ESLint 9.39.5, which npm labels deprecated. This is a documented development-tool limitation; do not force ESLint 10 past peer checks. Re-evaluate when the plugin dependency ranges support it. Initial lint configuration warnings were fixed. The initial HTTP verification helper used a workspace-local binary path rather than the hoisted root path and exited 1; correcting the helper produced HTTP 200. No failing application tests were observed. Generated builds, dependencies and local env files are excluded from Git; no commit, push or PR was created.

## Manual actions and next engineering step

1. Configure GNANI_API_KEY locally in the relay/server environment without sharing it in chat. Prepare a consented synthetic WAV and expected phrase. Execute scripts/smoke/README.md and record actual transcription and listening outcomes.
2. Reauthenticate the connected Vercel app, then deploy the placeholder using README settings. GitHub remote/push requires your authorization. There is no deployment URL and no remote push/PR was performed.
3. Send the external-LLM eligibility question manually using the README draft; record date/channel and eventual reply. External LLM use remains BLOCKED pending eligibility confirmation.

Next engineering step: finish these Phase 0 acceptance checks and record evidence. Do not begin Phase 1 or call this phase complete until the live smoke tests, deployment and manually sent question are verified.

- 2026-10-25 Task 0: restored missing spec/fetch/smoke scripts unchanged from supplied ZIP; raw Gnani docs absent, so B/C stopped with zero API attempts and language/voice/audio_config facts UNVERIFIED; data/sample.wav absent. Root now has explicit web/relay/detector/protocol workspaces and five dependency-free stubs; test/lint/typecheck/dev:relay/dev:web printed "not implemented yet" and exited 0 (stub checks only, no production build applicable). Existing app/package files and lockfile preserved; prior implementation/build records above describe the earlier checkout, not this Task 0 verification.
- 2026-10-25 Task 0 resumed: moved credential from .env.example into ignored root .env without displaying it; configured Poorvi/en-IN from raw Markdown; corrected required TTS audio_config and response checks, enabled Windows UTF-8, installed requests/python-dotenv. Python syntax, npm test (placeholder, exit 0), and git diff --check passed; sample audio absent at preflight, so live verification remains pending; changes uncommitted.


## 2026-10-26: Gnani TTS provider and warning generator (BLOCKED at live WAV verification)

Work branch: codex/gnani-tts-warnings. Initial C: free space: 7,395,196,928 bytes (6.887 GiB), above the user gate. All work stayed in local-artifacts/scam-call-shield. No npm install, dependency changes, deployment, protocol/contract edits or deletions were performed. TEMP/TMP were directed to local-artifacts/Temp for checks. Existing smoke_test.py changes, quick-start.md and scripts/smoke were left uncommitted and untouched.

Architecture: TtsProvider is asynchronous; mock WAV bytes remain identical. The server publishes transcript/risk synchronously, deduplicates warning codes before starting audio work, suppresses late completions after session end, and emits a recoverable sanitized error on synthesis/format/size failure. A pre-send validation guard prevents invalid upstream audio from closing a healthy session. The cache preloads generated WAVs for the injected real provider, shares concurrent misses, clones returned bytes, and drops failed promises. Mock mode remains synthetic and network-free. No provider-selection startup mode or STT provider was introduced.

The real TTS adapter implements documented authentication/model/voice/audio_config, a ten-second abort covering response bytes, one bounded retry on 429/500/503, sanitized errors, and PCM16 mono 16000 Hz WAV validation without conversion. Existing hi-IN session language maps internally to provider hi-en; wire values remain unchanged. The catalog covers the five concrete warning codes emitted by the detector (protocol WarningCode itself aliases an unrestricted string), with Hinglish and Marathi texts totaling 253 Unicode characters, maximum thirty-two per text. OTP is spelled out; no personal data or numbers are used.

Verification before live execution: npm test PASS (74 detector + 75 relay + 3 foundation; one pre-existing relay test skipped), npm run typecheck PASS, npm run lint PASS, npm run build PASS (all packages/relay and static Next.js production pages). Tests include mocked HTTP success/403/429/500/503/timeout/WAV checks, disk-cache preload, concurrent misses, failed-cache recovery, deferred audio ordering, recoverable failures/timeouts/oversized responses, and suppression after session end. No test made a real API request. A new cache-test Buffer type mismatch was corrected before the final passing checks. Provider tests were placed in apps/relay/test to match the existing runner include pattern.

Live evidence: the generator ran ONCE. Probe one (omit voice, explicit hi-en, numeric speed one) returned HTTP 400, 731 error bytes, no credit header reported. Probe two (omit language, explicit Poorvi, numeric speed one) had response.ok=true but failed complete-WAV validation. Exact second status/byte count are unavailable because validation preceded logging; this ordering is now corrected for future authorized runs, without rerunning. Only two of the maximum three verification requests were used, eighteen characters submitted; no generation calls, audio files or silent conversions. Actual billed credits, required fields, string speeds and live compatible WAV format are UNVERIFIED. The invalid live format is a real blocker; implementation is not declared complete and no commit was made.

Part C: skipped — no sample yet (no data/sample.* file present). The existing smoke script was not run or committed. A follow-up must inspect the response format within the remaining verification allowance without weakening the wire contract or silently converting audio. Do not rerun the full generator blindly.


## 2026-10-26: explicit-fields diagnostic and partial warning batch

First saved the passing implementation on codex/gnani-tts-warnings as ab877d9, "TTS: async provider interface, cache and retries (live WAV verification pending)". Included the warning catalog required by the provider/tests and the audio ignore rule; excluded generated audio, probe files, env files and pre-existing smoke changes. C: free at this turn's preflight: 6.878 GiB.

New authorization: four diagnostic requests plus the full ten-file batch; hard cap six hundred total submitted characters. Stop optional-field/string-speed probes permanently. Both WAV validators and their tests were authorized to accept the observed streamed headers without changing protocol types or wire fields.

Exactly ONE new diagnostic call: text is the first catalog warning (nineteen characters), Poorvi/hi-en/timbre-v2.5, numeric speed one and all audio_config fields explicit. HTTP 200; content-type audio/wav; content-length 46124; actual bytes 46124; first four ASCII RIFF; bytes eight through twelve ASCII WAVE; first forty-eight bytes hex 52494646ffffffff57415645666d74201000000001000100803e0000007d00000200100064617461fffffffff7ffebff. Raw response saved exclusively to local-artifacts/tts-probe.bin. No audio/header conversion or rewriting. Both RIFF and data size fields contain UINT32_MAX, while fmt is PCM16 mono 16000 Hz. The saved file passed the corrected provider and full wire validators offline before the batch.

WAV validation now tolerates zero/UINT32_MAX size placeholders and padded extra chunks, retains actual fmt/sample constraints, and rejects missing samples. Both provider and relay schema use this same check. All old tests retained. Acceptance checks PASS: npm test (74 detector, 84 relay, 3 foundation; one pre-existing relay test skipped), npm run typecheck, npm run lint, npm run build (packages, relay, Next.js production). No dependencies installed. Generator syntax checked separately.

The full batch was invoked ONCE after that successful diagnostic validation, with retries disabled, and stopped immediately at the first full-wire incompatibility. Per-call evidence:

| Warning | Language/voice | HTTP | Saved bytes | Submitted characters |
| --- | --- | --- | --- | --- |
| SENSITIVE_REQUEST | hi-en/Poorvi | 200 | 51244 | 19 |
| SENSITIVE_REQUEST | mr-IN/Zahira | 200 | 51244 | 18 |
| DIGITAL_ARREST | hi-en/Poorvi | 200 | 61484 | 31 |
| DIGITAL_ARREST | mr-IN/Zahira | 200 | 56364 | 26 |
| MONEY_MOVEMENT | hi-en/Poorvi | 200 | 66604 | 25 |
| MONEY_MOVEMENT | mr-IN/Zahira | 200 | 76844 | 31 |
| REMOTE_ACCESS | hi-en/Poorvi | 200 | 46124 | 23 |
| REMOTE_ACCESS | mr-IN/Zahira | 200 | 46124 | 21 |
| SCAM_PATTERN | hi-en/Poorvi | 200 | 66604 | 27 |
| SCAM_PATTERN | mr-IN/Zahira | 200 | Not saved: full wire validation failed | 32 |

Nine files generated successfully. All ten responses passed the provider WAV validator; the last failed the existing complete warning.audio schema, which retains the 128000-character base64 limit. The final response byte count was not captured before the check and is unavailable; generator logging is now ordered before that check for future authorized execution. No retries or automatic rerun occurred. Need to resolve the final warning's wire compatibility without silently modifying protocol/contract or audio. Previously unverified response optionality/string speeds stay unverified; all production calls provide fields explicitly.

Character accounting: prior probes eighteen + new diagnostic nineteen + full batch 253 = 290 submitted characters total. The earlier estimate of 289 was off by one because the first warning contains nineteen characters. No x-credits-used values reported; actual billed credits UNVERIFIED. Part C remains skipped: no sample yet; smoke_test.py was not run, modified or committed. Audio stays ignored; the final verified-WAV commit records a PARTIAL batch, not complete warning coverage.


## 2026-10-26: final Marathi warning wire-limit fix

User authorized exactly one call for SCAM_PATTERN/mr-IN and a relay-only validator correction if needed. C: preflight free 6.876 GiB. Added --scam-pattern-mr to the generator so the other nine warnings cannot be regenerated by this targeted command. It captures bytes/hex before wire validation and reports exact Zod errors, saving diagnostic bytes only to local-artifacts/scam-pattern-mr-probe.bin.

One live call: HTTP 200, WAV PCM16 mono 16000 Hz, 97324 bytes, first forty-eight bytes hex 52494646ffffffff57415645666d74201000000001000100803e0000007d00000200100064617461fffffffffdfff9ff. RIFF and data lengths use the already-supported UINT32_MAX placeholders; actual sample bytes are even. No conversion was required or performed. Exact relay rejection: audioBase64, code too_big, inclusive maximum 128000, message "Too big: expected string to have <=128000 characters". The valid WAV expands to 129768 base64 characters. That limit exists only in apps/relay/src/validation.ts, not packages/protocol. No protocol or docs/contract.md edit was needed.

Raised the relay-only base64 bound to 256000 characters (at most 192000 decoded bytes, roughly six seconds), still below the existing 256 KiB output queue ceiling for one event. Added regression coverage for the 97324-byte generated response shape plus valid/invalid inclusive size boundaries. Wrong-format and other existing tests remain intact. This raises only an implementation bound and changes no wire fields or audio bytes.

Submitted thirty-two characters on this call (the actual existing catalog text), bringing the cumulative total to 322, below six hundred. No credits reported by the inspected response header. No second live call and no full-batch rerun. Final verification and offline file-save results are recorded below.


Final results: npm test PASS (74 detector, 86 relay, three foundation; one pre-existing relay test skipped), npm run typecheck PASS, npm run lint PASS, npm run build PASS. Saved the same diagnostic response offline as data/warnings/audio/SCAM_PATTERN.mr-IN.Zahira.wav, exactly 97324 bytes, SHA-256 9670032942f398ab735756cf26214c6281ac993168c27e594dbd9ba0a10cd818. Byte-for-byte comparison matched the diagnostic; no conversion/header rewrite. All ten saved WAVs now pass the full relay wire validator offline, total 619960 bytes. git check-ignore confirms audio is excluded. No extra API calls, no protocol/docs-contract changes, no audio commits. Existing smoke changes remain untouched. The fix and evidence are committed by explicit paths with the user-requested message.


## 2026-10-26: realtime STT adapter, phonetic variants and one synthetic live probe

Preflight: read AGENTS.md; C: free 6.874 GiB, above 1.5 GiB. API facts restricted to docs/gnani/raw/api_STT_stt-websocket.md. No dependency installation, protocol/docs-contract/web changes, deployment or secret output. Runtime-only root env loading occurs in the explicit probe process; the adapter reads process.env only. Existing untracked quick-start.md and scripts/smoke remain excluded.

Detector item six: wrote thirteen tests first; bataaen and bata do requests failed while other positive spellings/negations passed. Added anchored bata/bataaen tokens with existing proximity/negation windows. Eighty-seven tests, typecheck, lint and detector build passed; committed as 520fb7b (Detector: STT spelling variants). Work continues on codex/gnani-realtime-stt, which contains that commit. After the live transcript exposed a phonetic Devanagari negation miss, an additional test for ओटीपी मैट बताएं first failed (danger vs safe), then the observed मैट spelling was added to the existing negation tokens. This narrow item-six follow-up is included with the STT/probe evidence commit.

Interface decision explained before editing: start originally exposed final transcripts only and could not report asynchronous connected/processing/error states or provider segment metadata. Added an optional internal SttEvent callback; preserved the final transcript callback and void start/write/stop shape, so existing mocks stay compatible. The relay caller maps errors to existing recoverable UPSTREAM_UNAVAILABLE session.error. No new wire event or changed protocol type. Default mock CLI remains unchanged; real provider can be injected through the existing createSttProvider factory.

GnaniSttProvider uses the documented stream URL and four upgrade headers (never logged). Connected echo must confirm sixteen kilohertz and 512 samples. Raw 1024-byte frames go through the existing bounded pacer with a monotonic minimum thirty-two-millisecond send guard; pre-connect buffering is bounded. Ten-second connected deadline, one connect-only retry with backoff, no midstream reconnect/replay, application max session plus a fourteen-minute ceiling to stay below the service's fifteen-minute cap. Close/stop clears timers and pending audio; raw upstream errors and websocket exceptions are never logged. Unknown server events log only a sanitized type. Transcript mapping preserves text/id and exposes duration/latency through the internal callback.

Local-WebSocket-only tests cover lifecycle/metadata mapping, server error, midstream close, exact frame length and spacing >=32 ms, clean stop, unknown type logging without private contents/key, connect retry/backoff, retry exhaustion, connected timeout, configured session deadline, and recoverable relay session.error without terminating the session. All network-test URLs are loopback and use a synthetic key. No test makes a real provider request. An exactOptionalPropertyTypes mismatch in new class fields was corrected before acceptance checks.

Live probe: ONE run, no connect retries, 82 frames / 2.624 seconds total (<10 seconds). Input was existing synthetic warning PCM (1.600 seconds), plus 1.024 seconds silence because the requested one-second silent tail needs twenty-four milliseconds padding to satisfy exact 1024-byte frames. No speech conversion or audio/transcript persistence. First message 300 ms, final transcript 3260 ms from provider start. Text: ओटीपी मैट बताएं. Message fields printed before mapping:

| Type | Top-level field names |
| --- | --- |
| connected | type, message, request_id, config, timestamp |
| speech_start | type, utterance_id, timestamp |
| transcript | type, text, audio_duration_ms, segment_id, segment_index, utterance_id, is_final, latency, timestamp |

speech_start is undocumented in the permitted guide and safely handled as unknown; no processing message observed. No partial_transcript observed. The guide mentions x-partials only at line 847 and never describes an enabling value or setting, so the second/partials run was SKIPPED without guessing. Credits not reported; actual spend UNVERIFIED. The observed transcript had a phonetic negation spelling error, now covered by the additional detector regression; no broader STT accuracy claim is made.

Final checks and commit evidence follow.


Final acceptance: npm test PASS (88 detector + 96 relay + three foundation; one existing relay test skipped), npm run typecheck PASS, npm run lint PASS, npm run build PASS including Next.js production build. Probe syntax/lint passed. The live transcript now analyzes as safe with no sensitive-request warning in the exact-output regression. No additional live calls were needed. The final provider/probe commit includes the documented live-informed negation spelling follow-up in item-six files. Both requested commit subjects are present; no push or PR.


## 2026-10-26: live relay pipeline, guards and WAV client

Read AGENTS.md and checked C: free 6.873 GiB, above 1.5 GiB. Work branch codex/live-relay-pipeline. User clarified the contract substitutions before implementation: session.end with id/reason user, exactly 1024-byte frames at thirty-two milliseconds, STT en-IN/hi-IN rather than TTS-only hi-en. No protocol, docs/contract.md or frontend changes, no dependency install, push, PR or deployment.

Runtime: createRelay selects mode from RELAY_MODE (default mock; only mock/live accepted), preserving createMockRelay as an explicit compatibility wrapper. Live CLI startup parses only the root env file inside Node and takes GNANI_API_KEY from that file; credentials/headers are never printed. Existing mock startup reads no env file. Live defaults instantiate GnaniSttProvider/GnaniTtsProvider. Generated warning files load at startup via the existing cache and cache misses share synthesis promises. English and Hindi recognition use the existing hi-en/Poorvi spoken-warning catalog; Marathi uses mr-IN/Zahira. This TTS fallback is explicit and does not add hi-en to STT validation.

STT language mapping is centralized in apps/relay/src/providers/gnani-languages.ts using only raw/api_STT_stt-websocket.md Supported Languages: en-IN Latin (mixed English/Hindi accepted), hi-IN Hindi Devanagari, mr-IN Marathi Devanagari, hi-en unsupported/TTS-only. Live scenarios and unsupported codes are rejected before creating upstream streams.

Flow: live session.ready waits for provider connected; binary audio before readiness is rejected. Browser frames pass the existing bounded relay pacer into the provider pacer. Each final transcript is sent before detector/risk work; unchanged risk level/score pairs are suppressed. Warning audio is asynchronous and deduplicated once per code/session. Both immediate and deferred TTS tests show later transcript/risk messages do not wait. Errors use existing recoverable session.error events. Live risk summaries are labeled recognized speech rather than mock transcripts.

Guards: one start/stream per browser session, max duration default three hundred seconds (live clamped to fourteen minutes), process-wide active-session cap default three configurable by MAX_CONCURRENT_SESSIONS, slot release on every cleanup, close STT on browser end/disconnect/expiry. RELAY_DISABLED rejects upgrades/starts and stops active sessions within a one-hundred-millisecond guard tick. gnani.usage logs cumulative per-process actual upstream successful frame writes in seconds and TTS text submitted (including retries) at session cleanup. Cache source is internal tts.cache/tts.live telemetry only. No transcript text is logged unless DEBUG_TRANSCRIPTS=1.

Client: apps/relay/scripts/stream-wav.mjs validates the existing WAV format, strips headers without altering speech samples, rechunks to 1024 bytes, paces every thirty-two milliseconds, appends one second silence plus only the final framing pad, waits for readiness and sends session.end at completion. CLI refuses fifteen seconds or more of audio, sends allowed localhost Origin, and prints message type/time, final text/risk, and warning byte count only (no key/raw audio). It has no scenario or extra wire mode field.

Tests before live calls: npm test PASS (88 detector, 107 relay, three foundation; one pre-existing relay test skipped), npm run typecheck PASS, npm run lint PASS, npm run build PASS including static Next.js production pages. Eleven new local-WebSocket-only relay tests cover full transcript/risk/cached-warning ordering with zero HTTP synthesis, STT error, disconnect and slot release, session expiry, concurrent cap across two relay instances, kill switch, unsupported language/live scenarios, duplicate starts, TTS failure and deferred TTS not delaying transcripts/risks. All test credentials are synthetic; no test calls Gnani. Existing provider tests remain passing.

LIVE CHECK: two of three permitted runs used; each 2.624 seconds of audio (<15 s), same synthetic protective warning, no scenario. Mode was explicitly live, DEBUG_TRANSCRIPTS=0, root env loaded inside the child Node process. Server stdout/stderr stayed in local-artifacts/Temp; no credential/transcript log from the relay. Message timings are client-relative milliseconds:

| STT language | Ordered received messages/timings | Transcript/script | Risk | Warning/audio source |
| --- | --- | --- | --- | --- |
| en-IN | session.ready 290; transcript.final 3203; risk.update 3212; session.end 5149 | otp mat bataaen — Latin | safe | None, zero bytes; neither cache lookup nor live TTS needed |
| hi-IN | session.ready 225; transcript.final 3247; risk.update 3254; session.end 4915 | ओटीपी मैट बताएं — Devanagari | safe | None, zero bytes; neither cache lookup nor live TTS needed |

Counters after first session: audioSeconds 2.624, ttsCharacters zero. After second: cumulative audioSeconds 5.248, ttsCharacters zero. Thus per-run audio is 2.624 seconds and TTS text zero; under the eight-hundred-character budget. No billed-credit usage was shown. There was no positive-risk live warning to test audibility/cache source, so local integration tests provide cache/TTS-path evidence, not a fabricated live warning. The verification relay process was stopped after both session.end messages; no upstream streams remain from these runs.

No generated audio, raw response, env file or unrelated untracked smoke/quick-start files are committed. Actual live scripts were observed, not guessed from language codes. Full task changes are committed by explicit path with the requested subject.


Final verification after usage assertions: npm test, npm run typecheck and npm run lint passed again with the same counts; previous final production build passed for the unchanged implementation. Mocked HTTP retry tests now assert characters are counted per submission; cached live-relay tests assert zero character increment. git diff --check and stream-wav syntax check passed. No subsequent real API calls were made.


## 2026-10-26: synthetic caller generation, noise math and five live scenarios

Read AGENTS.md; initial C: free 6.841 GiB (>1.5 GiB). Work branch codex/synthetic-scenario-audio. Allowed script/audio/text/evidence scope only; no provider, detector, contract, protocol or web changes. No new dependencies, external recordings, push, PR or deployment. Runtime credential loading stays inside Node; keys/headers/env contents are never printed or copied. Synthetic source text/catalog/segments only, no real personal data.

Generator: five scenarios, sixteen caller segments, preflight budget 672 characters (exclusive cap three thousand), printed by scenario before calls: borderline-delivery 146, digital-arrest 135, genuine-bank-alert 180, kyc-otp 113, refund-upi 98. Hinglish text replacements were made in the allowed scenario text files before generation, including Romanized O T P and family/call phrasing. The raw timbre-v2.5 catalog lists only Poorvi for Hinglish; therefore the caller uses Poorvi and no different language/voice is guessed. The existing GnaniTtsProvider reads a local-artifacts/Temp temporary text catalog; provider code was not changed. Retries disabled; each completed segment is cached, existing completed scenarios are skipped. All sixteen calls returned HTTP 200; no credit header value reported. Total submitted synthesis characters 672. Outputs (PCM16 mono 16000 Hz WAV, four-hundred-millisecond inter-segment silence): borderline 8.960 s, digital-arrest 9.120 s, genuine-bank 11.600 s, KYC 8.800 s, refund 7.200 s. No sample resampling or silent format conversion.

Noise mixer: pure Node, deterministic seed, white plus approximate pink/brown generation, requested SNR by signal/noise power, common headroom gain prevents clipping while preserving SNR. Seven unit tests pass for white/pink/brown at zero/ten dB, post-PCM SNR tolerance 0.02 dB, no clipping, silence, determinism and invalid input. The live files use generated white noise at ten and zero dB; gains were one in both actual mixes. No external audio files or dependency installation.

Acceptance before paid generation: npm test PASS (88 detector, 107 relay, three foundation; one pre-existing relay test skipped), npm run typecheck PASS, npm run lint PASS, npm run build PASS including production Next.js. New mixing tests also pass with node --test apps/relay/scripts/mix-noise.test.mjs. Targeted script syntax/lint checks pass. The CLI's optional settle interval was added to collect delayed final segments; no server or wire event changed.

Live preflight measured exactly 52.224 planned STT seconds including frame-aligned one-second silence: KYC 9.824 three times, digital-arrest 10.144, genuine-bank 12.608, below 120 total. Per-run fifteen-second default ceiling remained sufficient. One local live relay was started with DEBUG_TRANSCRIPTS=0, root env loaded privately in the process. Used en-IN, no scenario wire field, 1024-byte frames at thirty-two-millisecond cadence, five-second post-audio settling. Sequential runs stopped only after their observed end/risk condition was checked. No stop condition fired; no detector tuning was performed.

### Actual received transcripts (all Latin script)

Clean kyc-otp, received as three final segments:
1. ye ek kalpanik kyc verification call hai
2. aapka kyc pending hai account block ho jaayega
3. apna otp abhi bataiye

Clean digital-arrest, received as three final segments:
1. main police se bol raha hoon ye kalpanik call hai
2. aapko rest karenge abhi turant kaam karo
3. family ko mat batana aur call per raho

Clean genuine-bank-alert, received as three final segments (source segments three/four were merged by STT):
1. ye kalpanik bank appointment reminder hai
2. bank will never ask for otp never share your otp
3. apna otp kisi ko mat bataiye confirm karna ho toh official channel khud verify karen

KYC with white noise, ten dB SNR, three final segments:
1. ye ek kalpanik kyc verification call hai
2. aapka kyc pending hai account block ho jaayega
3. apna otp abhi bataiye

KYC with white noise, zero dB SNR, three final segments:
1. ye ek kalpanik kyc verification call hai
2. aapka kyc pending hai account block ho gaya
3. apna otp abhi bataiye

### Per-run outcomes and measured costs

| Run | Final risk | Category from local replay | warning.audio | Source | Request-end to first danger | Upstream audio |
| --- | --- | --- | --- | --- | --- | --- |
| KYC clean | danger | kyc_otp | 51244 bytes | cache | 703 ms | 9.824 s |
| Digital-arrest clean | danger | other | 66604 bytes | cache | 614 ms | 10.144 s |
| Genuine bank clean | safe | none | none | no lookup/call | not applicable | 12.608 s |
| KYC white noise ten dB | danger | kyc_otp | 51244 bytes | cache | 551 ms | 9.824 s |
| KYC white noise zero dB | danger | kyc_otp | 51244 bytes | cache | 699 ms | 9.824 s |

Category is replayed using the existing unchanged detector on the received final texts; it is not an invented wire field. For digital-arrest, STT emitted rest, not arrest; authority/urgency/secrecy still produced danger but no digital_arrest category. Preserve this exact observation. Latencies are client measurements from the completed paced frame covering source request segment three (KYC) / two (digital-arrest) to first danger message; they include source-boundary/trailing-silence uncertainty and are not claimed as pure model latency. All risk messages preceded warning audio; repeat codes stayed suppressed.

Relay tts.cache telemetry confirms each of the four warning deliveries was cached. Cumulative process audioSeconds after the five clean ends: 9.824, 19.968, 32.576, 42.400, 52.224. ttsCharacters stayed zero for every live stream. No live cache miss required synthesis, no credit charge value was shown; billed credits UNVERIFIED. Generator characters 672 are separate from zero live TTS characters. No accuracy percentage or accuracy comparison is reported. Verification relay was stopped after all five session ends.

Commit scope follows the explicit instruction: scripts and tests only. Audio stays locally gitignored and is never staged. Scenario text, .gitignore and evidence document edits remain uncommitted for review, along with the previously untracked smoke/quick-start files. No key, generated audio or probe file enters the commit.

Scripts/tests-only commit: e048204 — Synthetic call generator, noise mixer and live scenario run. Four explicit script/test paths committed; ignored audio and scenario/ignore/evidence edits excluded as requested. A post-generation plan showed zero characters for every existing scenario, without any additional API call.


## 2026-10-26: offline live-STT detector variants, tests first

Read AGENTS.md; work branch codex/live-stt-detector-variants. No API calls, credential/env access, audio generation, contract/protocol/web changes, dependency installs, push or PR. Showed the previous scenario/evidence diff summary (five files, sixty-four insertions and four deletions), then committed only .gitignore, PROGRESS.md and the three previously edited scenario JSONs as 0bccf7f (Scenarios: preserve synthetic call text and run evidence). The separate pre-existing docs/gnani/README.md edit and unrelated untracked files were not staged.

Tests-first evidence: added thirty-seven offline regression cases; fourteen failed before implementation, with 111 tests passing. The failures covered rest karenge/rest kar denge/arrested and officer authority context. Committed the failing test file alone as afafe8f (Detector: live STT variants (tests first)), before any implementation edits. Existing secrecy/block/request and protective cases already passed and were retained rather than rewritten or weakened.

Implementation: added arrested and officer tokens, plus a bounded lawEnforcementContext boolean to internal DetectorState. No transcript text is stored. Non-negated police/CBI/officer context in current/prior segments allows the exact misheard threat phrases rest karenge/rest kar denge to contribute threat and authority; bare rest, take some rest and I need rest remain safe, including a benign police advice mention. A bank claim alone cannot enable the ambiguous spelling. The digital_arrest category requires law-enforcement context, arrest threat and authority. Existing unambiguous arrest urgency behavior, weights, thresholds, negation windows and category priorities remain intact. Threat negations and state isolation are explicitly tested. The internal state addition does not alter any protocol/wire field.

The previously observed account block ho gaya/ho jaayega, OTP abhi bataiye, family ko mat batana and call per raho patterns are locked down with tests; those patterns already worked and required no unnecessary keyword/scoring changes. Every original detector test still passes, including bank will never ask for otp, apna otp kisi ko mat bataiye, all genuine-bank-alert segments and all borderline-delivery segments.

Final working-tree acceptance (including separate demo-fixture tests): npm test PASS (128 detector + 107 relay + three foundation; one pre-existing relay test skipped), npm run typecheck PASS, npm run lint PASS, npm run build PASS (Node packages/relay and Next.js static production pages). git diff --check passed. No live rerun was made or implied; these are deterministic offline checks.


Demo scripts: added kyc-otp-demo.json, digital-arrest-demo.json and refund-upi-demo.json alongside, without replacing, their three original scam scenarios. Only the kalpanik word was removed from caller text; expected risk/warning metadata and segment counts were retained. No genuine/borderline clone was added because those scenarios are not scams. Three dedicated offline tests verify the retained originals, absent announcement word and expected danger/warning for each demo. No audio was generated. Implementation commit e4cf7d2 follows the intentionally failing tests-first commit; demo data/tests are committed separately as Scenarios: demo scripts.

## 2026-10-26 — Landing hero

- Request: use ToDesktop as a visual reference and build only the starting hero.
- Cloned the repository into the empty local workspace; work is on feat/landing-hero. No push or deployment.
- Replaced the placeholder with a small client Hero component in apps/web/components/hero.tsx, global responsive styling, descriptive root metadata and a local SVG app icon. Kept the existing npm workspaces and dependency lockfile.
- Dark violet canvas, centered headline, blue CTA and framed conversation preview adapt the reference to ScamCall Shield. The CTA toggles a fixed, explicitly synthetic OTP example; it does not run detector analysis, capture audio or connect to a relay.
- Verification: npm ci succeeded (0 reported vulnerabilities); npm run lint passed; npm run typecheck passed across all workspaces; npm run build passed; npm test passed (128 detector + 107 relay + 3 foundation tests; 1 relay test skipped).
- Browser verification: at 1440px desktop and 390px mobile there was no horizontal overflow. CTA expands the example and sets aria-expanded=true; reset restores the preview. Screen-reader live region and visible keyboard focus are included. Local icon resolves through Next metadata.
- Run from repository root: npm ci, then npm run dev:web; open http://localhost:3000. Review hero wrapping, mobile stacking, keyboard focus and the example/reset action. The private GitHub project link requires repository access.

## 2026-10-26 — How it works section

- Added only the requested How it works section after Hero, with a reusable server component and isolated CSS Module. No additional dependencies or client JavaScript.
- Three numbered steps explain the existing synthetic preview, its OTP/account-threat illustration, and independent verification. The copy does not promise a scenario selector or live analysis.
- Verification: root npm run lint passed; web npm run typecheck passed; web production build passed. Browser checks at 1440, 768, 390 and 320px found three ordered steps and no horizontal overflow; the existing hero expand/reset interaction still works. Desktop screenshot visually reviewed. No backend changes; existing backend tests were not repeated for this static UI addition.
- Manual review: npm run dev:web, open http://localhost:3000 and scroll below the hero. Check step order, readable mobile stacking and the hero example/reset button.

## 2026-10-26 — How it works visual redesign

- Reworked only HowItWorks and its CSS Module using the supplied Skydive reference: spacious central composition, four tilted scenario tiles, restrained pastel accents and an orbital guide, integrated with the existing dark palette.
- Added three user-controlled steps (Explore, Recognise, Verify) and a changing synthetic quote/explanation panel. Native buttons expose aria-pressed, control a polite live region, work by keyboard, and respect reduced motion. No automatic animation, new dependencies or backend/provider integration.
- Verification: root lint, web typecheck, production build and git diff --check passed. Initial strict-index type error was fixed with a safe default step before the final successful build. Browser checks at 1440, 768, 390 and 320px found no horizontal overflow; all three step controls update selected state; Enter activates Recognise and updates its heading. Desktop and mobile screenshots reviewed.
- Run npm run dev:web and review http://localhost:3000 below the hero; click each walkthrough step or navigate using Tab and Enter. Existing hero and page composition unchanged.

## 2026-10-26 — Hero visual redesign

- Rebuilt only the hero to complement the Skydive-inspired How it works: oversized split headline, a tilted fictional-call panel, pastel awareness notes and a pill CTA. Existing demo/reset behavior still highlights the illustrative OTP warning; no live-analysis claim or microphone use.
- Added scoped hero.module.css and removed obsolete hero selectors from globals.css, retaining shared font, base palette and accessible focus styles. HowItWorks remains unchanged and its Verify step was regression checked.
- Verification: root lint, web typecheck, web production build and git diff --check passed. Browser checks at 1440, 1024, 768, 390 and 320px found no horizontal overflow. Demo updates its warning text, keyboard Enter resets it with aria-expanded=false. Desktop and mobile visuals reviewed; reduced motion supported.
- Run npm run dev:web and open http://localhost:3000. Review headline wrapping, layered call preview, demo/reset interaction and keyboard focus.

## 2026-10-26 — Scam scenarios section

- Added only ScamScenarios after HowItWorks, with three fictional examples: bank/KYC impersonation, fake arrest threats and unsolicited remote device access. Each article includes a synthetic quote, two visible warning signs, their explanation, an independently expandable next-action disclosure and a short takeaway.
- Implemented as a server component with a scoped CSS Module and native details/summary controls; no new dependencies, client bundle, backend analysis or provider calls. Blue, peach and sage accents continue the existing visual direction.
- Verification: root lint, web production build and web typecheck passed; git diff --check passed. Browser checks at 1440, 768, 390 and 320px found no horizontal overflow. All three advice disclosures opened with keyboard Enter; the first also closed by click. Desktop and mobile screenshots reviewed.
- Run npm run dev:web, open http://localhost:3000, scroll after How it works and check each What you can do disclosure with mouse and keyboard. No new sections, push or deployment.

## 2026-10-26 — Prototype capabilities and limits

- User authorized choosing and building the next section. Added PrototypeScope after ScamScenarios to clarify current website capabilities before users rely on the demo.
- Two-column comparison describes available fictional examples and awareness guidance versus unavailable live-call recording, analysis and safety certification. Privacy strip explains that these examples require no microphone or private details. Claims are scoped to this website and reflect the current implementation/README.
- Static server component and isolated CSS Module; no dependencies or backend changes. Existing sections unchanged.
- Verification: root lint, web typecheck, web production build and git diff --check passed. Browser checked six list items and responsive layout at 1440, 768, 390 and 320px with no horizontal overflow. Desktop screenshot reviewed. No redundant backend tests for this static UI addition.
- Run npm run dev:web and open http://localhost:3000; review the new comparison below Scam scenarios and its mobile stacking.

## 2026-10-26 — FAQ section

- User authorized choosing and building the next section. Added FAQ after capabilities/limits to answer concrete questions about real calls, prepared examples, microphone/personal-data requirements, indicator uncertainty, convincing caller identity and synthetic content.
- Static server component with isolated CSS Module and six native details/summary disclosures. First answer starts open. Split heading/accordion layout, pastel question note, visible focus and reduced-motion support match the existing site. No new dependencies or backend work.
- Verification: root lint, web typecheck, production build and git diff --check passed. Browser checks at 1440, 768, 390 and 320px found no overflow. All six answers toggled using keyboard Enter; desktop screenshot reviewed. Backend tests not repeated for this static frontend addition.
- Run npm run dev:web, open http://localhost:3000 and scroll below capabilities/limits. Check mobile wrapping and opening/closing answers with click, Tab and Enter.

## 2026-10-26 — Closing CTA and footer

- User authorized choosing/building the next section. Added a closing demo CTA and semantic site footer after FAQ so the page ends with a useful return path and links to existing content.
- Includes Back to the demo, section navigation, GitHub project link and concise prototype context. No invented contact details, legal pages or external submissions. Static server component with a CSS Module and no dependencies. Footer is a sibling of main to expose the contentinfo landmark.
- Verification: root lint, web typecheck, production build and git diff --check passed. Browser checks at 1440, 768, 390 and 320px found no overflow; all six internal anchor links resolved to existing targets. CTA click navigated to #hero-title. Desktop screenshot reviewed.
- Run npm run dev:web, open http://localhost:3000 and scroll to the bottom; check footer wrapping, keyboard focus and the demo/section links.

## 2026-10-26 — Off-white and luxury green theme

- Replaced the full violet/dark palette across every section and SVG favicon with shared theme tokens: off-white canvas #f7f6f0, near-white surface #fdfcf8, luxury forest green #123e2e and restrained sage #e5ebe1. Switched native color-scheme to light; updated shadows, borders, controls, selected states, focus outlines and hover colors.
- Warning-specific hero results/OTP highlights, Recognise example, suspicious orbit icons and scenario red-flag markers use warm orange-red treatments (#fbe7db background / #8e2d1e text / #e9b39e border). Normal controls remain green. Warning text/icons remain alongside color.
- Verification: root lint, web production build, web typecheck and git diff --check passed. Browser checked hero warning interaction, Recognise state, FAQ/scenario disclosures and widths 1440, 768, 390, 320px without horizontal overflow. Hero, walkthrough and footer screenshots reviewed.
- Contrast calculations for principal token pairs: primary text 11.13:1, muted text on canvas 6.10:1, muted on surface 6.43:1, muted on sage 5.44:1, CTA 11.06:1, warning 6.90:1. These are token-pair checks, not a full accessibility audit.
- Run npm run dev:web and open http://localhost:3000. Review all sections plus Explore/Recognise warning states. No layout/content or backend changes.

## 2026-10-26 — Component-library audit and upgrades

- Audited the existing page against Aceternity Bento/card patterns, Magic UI Bento Grid, Origin UI tabs/accordion, shadcn accordion and Radix keyboard documentation. Findings, selection rationale, source links and verification are in docs/component-library-audit.md.
- Applied meaningful upgrades: featured bank scenario and two supporting bento cards, larger instructional text, shorter hero display measure, proper accessible walkthrough tabs, and reusable single-open FAQ accordion. Preserved the approved palette, orange-red warnings and synthetic/demo boundaries.
- Adapted Magic UI MIT Bento source and legacy Origin UI MIT accordion/tabs wrappers. Full notices retained in docs/licenses. Only scoped Radix tabs and accordion packages added; no coss AGPL code, paid Aceternity assets or continuous visual effects copied.
- Verification: root lint, web typecheck, production build and git diff --check passed. Dependency install reported 0 vulnerabilities. Browser checked 1440, 1024, 768, 390, 320px without horizontal overflow; ArrowRight and End select walkthrough tabs, one visible tab panel; FAQ ArrowDown focus and Enter expansion/collapse passed. Native scenario advice and hero warning preview remain functional. Desktop bento/FAQ and mobile hero visually reviewed. Corrected a shared-card CSS precedence issue discovered during screenshot review.
- Run npm ci then npm run dev:web; open http://localhost:3000. No push/deployment performed.

## 2026-10-26 — Hero Aceternity 3D tilt

- Integrated the user-supplied Aceternity CardContainer/CardBody/CardItem/useMouseEnter source into the existing right-hand hero composition. Phone and three floating notes lift at different depths and tilt together with the cursor. Added cn helper with clsx/tailwind-merge; no unrelated demo/photo/signup content.
- Preserved static card angles via CSS rotate; added capped tilt, stable enter bounds, strict polymorphic typing, correct effect dependencies and touch/reduced-motion guards. Complete source differences and checks are recorded in docs/3d-card-integration.md.
- Verification: lint, web typecheck, web production build and git diff --check passed; browser console has 0 errors. Fine-pointer movement gives nonzero rotation and depth; leave resets; reduced-motion resets and suppresses movement. Separate touch context keeps tilt/depth disabled. No horizontal overflow at 1440, 768, 390 and 320px. Existing hero example/reset still works.
- Run npm ci then npm run dev:web; hover over the right-hand hero scene at http://localhost:3000. No push or deployment.

## 2026-10-26 — Scenario bento parallax

- Integrated the supplied Aceternity Parallax Scroll concept with Motion around the existing three scenario bento cards. Uses normal page scroll, small alternating vertical depth and existing green/off-white/caution palette; no unrelated photos or new sections.
- Added motion dependency and reusable ParallaxScroll export; source differences recorded in docs/parallax-scroll-integration.md. Typed single target ref replaces the supplied duplicated any ref; strict indexed fallback prevents undefined motion values.
- Browser verification: desktop scroll changed card offsets in opposite directions; no nested scroll region (overflow visible, clientHeight=scrollHeight). Reduced-motion and sub-1024px layouts stay static. Focused card stays still and keyboard Enter opens its advice. No horizontal overflow at 1440/1024/768/390/320px. Console has no errors. Lint, web typecheck, production build and git diff --check passed after fixing the strict MotionStyle mismatch.
- Run npm ci then npm run dev:web; scroll through Scam scenarios at http://localhost:3000. No push or deployment.

## 2026-10-26 — Magic UI hero polish

- Added requested headline word/blur entrance, subtle primary-button shine and radial-faded dot background. Adapted Magic UI treatments into reusable TextAnimate/ShineBorder/DotPattern components. Full source differences are in docs/hero-effects-integration.md; existing MIT notice retained.
- Seven words reveal once at 70ms stagger/650ms duration. Button shine runs once for four seconds, with no infinite loop. SVG pattern is static and has no resize/random animation overhead. Both entrance and shine are disabled for reduced motion; heading keeps a single accessible name.
- Verification: lint, web typecheck, production build and git diff --check passed. Browser verified seven staggered segments, finite shine, dot pattern, functioning demo and reduced-motion static states. No overflow at 1440/768/390/320px; screenshot reviewed. No dependencies or other sections changed.
- Run npm run dev:web and reload http://localhost:3000 to review the entrance and shine.

## 2026-10-26 — Shadcn simulator dialog

- User requested shadcn base controls and a full interactive example from the hero CTA. Added shared Button/Dialog/Alert/Badge with Radix-backed accessible overlay behavior and semantic Tailwind theme mapping.
- Added three fixed synthetic scenario walkthroughs (Bank/KYC, Fake arrest, Remote access), each with intro, pressure, red flags, response choices, prepared branch feedback, restart and finish. No microphone, real OTP, audio capture, provider, relay or live analysis. Hero trigger now opens the simulator and retains its phone warning highlight.
- Source, MIT notice, dependency choices and integration details recorded in docs/simulator-dialog-integration.md and docs/licenses/shadcn-ui-MIT.txt.
- Verification: root lint, web typecheck, production build and git diff --check passed. Browser covered all three scenarios and both feedback branches, restart/reopen reset, focus trap, Escape close and focus restoration. Mobile/dialog scroll checks at 1440/768/390/320px found no horizontal overflow. Reduced-motion animation disabled. Console has no errors/warnings; desktop/mobile screenshots reviewed.
- Run npm ci then npm run dev:web; open http://localhost:3000 and click Explore a scam example. No push or deployment.

## 2026-10-26 — Refined header badges

- Refined only the top-left logo mark and top-right research label using Origin-inspired minimal badge treatments. Shared Badge now supports secondary (existing default), outline and brand variants plus standard/large/icon sizes.
- Logo has a consistent 40px green icon badge, optical 20px shield and refined wordmark spacing. Research label has an outlined pill, restrained shadow and decorative lab icon. Both remain informational spans without misleading button semantics, hover motion or extra tab stops.
- Kept the status visible on mobile with wrapping/alignment instead of hiding it. Preserved the simulator's default secondary badge and existing UI theme. Reference: https://coss.com/ui/docs/components/badge ; no new third-party source/dependency added.
- Verification: root lint, web typecheck, production build and git diff --check passed. Browser confirmed label visibility/no overflow at 1440, 768, 390 and 320px; simulator badge still renders and Escape returns to trigger. Desktop screenshot reviewed.
- Run npm run dev:web and review the top corners at http://localhost:3000; narrow the viewport to check badge wrapping.

## 2026-10-26 — Approved dark-first Header + Hero

- Implemented only the approved Header + Hero using scoped dark product tokens, Geist Sans/Mono via next/font, sticky desktop navigation, reusable shadcn-style mobile Sheet and truthful CTA readiness flow.
- Server components own static header/hero composition; client islands own menus, dialogs and scripted monitoring preview. Existing remaining sections/backend retained. No dependencies added. Complete file map and implementation notes: docs/header-hero-dark-first.md.
- Hero has the requested headline/subheadline with adjacent prototype qualification, Start Protection readiness dialog and existing interactive demo trigger. Preview has explicitly simulated microphone/waveform, Hinglish transcript, evidence-linked caution/high-risk states, recommendations and manual Restart/Next signal. No microphone/provider call, confidence percentage or fake live connection.
- Verification: lint, web typecheck, production build (including fonts), and git diff --check passed. Browser at 375/768/1280/1440px: no overflow; screenshots reviewed. Sticky position, working anchors, mobile Sheet links/Escape, readiness focus trap/Escape/focus return and existing demo verified. Instrumented readiness run made zero getUserMedia calls. Preview progresses through caution/high-risk; reduced-motion waveform is static. Browser console zero errors/warnings.
- Live provider/audio verification, real-device audio, screen-reader audit and Lighthouse remain outside this scope. No push or deployment.

## 2026-10-26 — Dark-first How It Works

- User requested the next section after Header + Hero approval. Rebuilt only HowItWorks as the specified Listen -> Transcribe -> Analyze -> Alert process; existing import path and how-it-works-title anchor retained.
- Replaced the prior three-tab orbit illustration with a server-rendered ordered process, four static microvisuals, plain-language descriptions, consent/context/uncertainty notes and an audio-quality/status aside. Scoped dark product theme matches the new header/hero. No extra libraries, dependencies, audio APIs or client JavaScript.
- Language consistently describes the planned verified live workflow, not an operational connection. Illustrations are labeled examples; explicit note says live microphone monitoring is not connected. Speakerphone noise, volume and distance caveat included; optional spoken alerts are configuration-dependent.
- Verification: root lint, web production build, web typecheck and git diff --check passed. Browser at 375/768/1280/1440px verified four ordered stages and no horizontal overflow; desktop/mobile screenshots reviewed. Reduced-motion mode has zero active animations. No newly introduced controls or keyboard traps; decorative illustrations are aria-hidden with readable explanations outside them. Console has zero errors/warnings. No backend changes or redundant backend test runs.
- Architecture: apps/web/components/how-it-works.tsx (server) and how-it-works.module.css; existing marketing/product-theme.module.css reused. Customization: stage copy after provider verification. Simulated: transcript/waveform/indicator illustrations. Limitation: live STT/audio path still requires separate approval and end-to-end verification.
- Run npm run dev:web and open http://localhost:3000; scroll below Hero or use How It Works navigation. No push or deployment.

## 2026-10-27 — Dark-first Features bento section

- User approved the next section in the agreed sequence. Added only Features after HowItWorks, with six semantic articles covering transcription, rules-based scam signals, warnings, conditional language support, privacy controls and explainable guidance.
- Reused existing BentoGrid/BentoCard and scoped dark product theme. Two featured cards, three supporting cards and one full-width explanation card form the desktop composition; tablet uses two columns and mobile one. Static microvisuals are aria-hidden; real copy/status remains accessible. No new library/dependency, client component, audio API or animation.
- Every card distinguishes current scripted/available behavior from live-connection requirements. No guaranteed language availability, detection accuracy, confidence percentage or actual audio capture claimed. Updated the shared Header Features link to the new #features-title; existing sections otherwise preserved.
- Architecture: apps/web/components/marketing/features.tsx (server) and features.module.css. Page mounts Features; layout/navigation.ts links to the real section. Customization: provider-verified feature/status wording. Simulated: all card microvisuals. Limitation: live transcription/alerts remain dependent on a separately verified backend session.
- Verification: root lint, web typecheck, web production build and git diff --check passed. Browser at 375/768/1280/1440px found six cards and no horizontal overflow. Features header anchor lands below the sticky header (heading y=105px). Reduced-motion check found zero active animations. Desktop screenshot reviewed; console has zero errors. No new interactive controls requiring focus handling. No backend code/tests changed.
- Run npm run dev:web, open http://localhost:3000 and use Features navigation or scroll below How It Works. No push or deployment.

## 2026-10-27 — Interactive scripted demo section

- Built only the next requested section after Features: a deterministic interactive monitoring-style demo with four scenarios, progressive transcript/evidence, caution/high-risk events, explanations, recommendations, session completion summary and Start/Pause/Resume/Restart/Replay controls.
- Architecture: server marketing wrapper, client demo workspace, typed synthetic scenario data and isolated playback hook. Existing shadcn/Button/Tabs/theme reused; no dependencies added. Page navigation now targets the section; existing hero modal remains intact.
- Explicit synthetic label, microphone-off status and prepared-event language remain visible; sticky demo label improves long mobile reading. No microphone, audio, provider, external AI request, persistence or actual detector execution. Data/timing and full implementation notes: docs/interactive-demo-section.md.
- Verification: lint, web typecheck, production build and git diff --check passed. Controlled-clock browser tests covered all four scenarios, pause-hold/resume/restart/completion, tab reset and keyboard selection. Microphone/fetch instrumentation both zero during playback. 375/768/1280/1440px had no overflow; screenshots reviewed. Navigation anchor and sticky labeling verified; reduced-motion progress transition 0s; console zero errors/warnings.
- Run npm ci then npm run dev:web; open http://localhost:3000/#interactive-demo-title. No push or deployment.

## 2026-10-27 — Safety & Trust section

- Rebuilt PrototypeScope as the next approved SafetyTrust section immediately after InteractiveDemo. Preserved the existing export/anchor and other sections. Server-rendered status panel and five native details explain consent, real microphone indicators, stopping, transcript/history distinction and actionable warnings. Existing client readiness dialog reused. No dependencies or audio/provider implementation added.
- Files: components/marketing/safety-trust.tsx and safety-trust.module.css, components/prototype-scope.tsx re-export, app/page.tsx placement. Preview facts are separated from planned live requirements. Provider processing/retention explicitly unverified; no guarantee, certification or blanket deletion claims.
- Verification: web production build and web typecheck passed. Browser at 375/768/1280/1440px: five disclosure rows and no horizontal overflow. Enter toggles disclosure; focus outline present; readiness dialog opens, Escape closes and focus returns. Reduced-motion mode has zero section animations. Desktop screenshot reviewed. Calculated muted body contrast 6.92:1 on elevated surface, 7.76:1 on canvas; warning body 9.59:1. git diff --check passed. Screen-reader and Lighthouse audits not performed.
- Customize: provider-verified privacy and retention wording when available. Simulated: existing demo remains scripted; this section captures no audio. Limitation: live microphone/provider workflow remains unverified. Run npm run dev:web and open /#prototype-scope-title. No push or deployment.
- Root npm run lint also passed (exit 0).

## 2026-10-27 — FAQ section

- Rebuilt only FAQ with the eight requested questions covering workflow, cellular-call limits, conditional language support, microphone consent, storage, imperfect detection, mobile limitations and warning responses. Preserved faq-title navigation target and existing page position. Existing Radix/Origin Accordion reused; server FAQ wrapper with client accordion boundary. No new dependencies, backend changes or audio capture.
- Scoped dark product theme and responsive two-column layout replace the old green FAQ. Preview status note distinguishes working scripts from unverified live monitoring. No claims of guaranteed detection, verified provider retention or operational live language support.
- Verification: root lint, web typecheck, web production build and git diff --check passed. Browser at 375/768/1280/1440px found no horizontal overflow and eight triggers. ArrowDown moves focus; Enter opens/closes, single-open behavior works, visible focus outline verified. Reduced-motion mode reports zero animations. Desktop screenshot reviewed. Existing tested tokens retain 6.92:1 muted text contrast on #111827; heading/button text #e2e8f0 on #111827. Screen-reader and Lighthouse audits remain unperformed.
- Files: apps/web/components/faq.tsx and faq.module.css. Customize provider-verified FAQ answers when live integration is available. Current demo remains scripted. Limitation: real mobile audio and language support need separate verification. Run npm run dev:web and visit /#faq-title. No push or deployment.

## 2026-10-27 — Footer

- Rebuilt only SiteFooter as a server component using scoped dark tokens, product wordmark, concise description, five navigation links, scripted-demo shortcut, project attribution, prototype status and Back to top. Replaced old oversized closing hero with compact footer hierarchy. No dependencies or client code added.
- Git remote matches the supplied GitHub URL, but unauthenticated HTTP HEAD returned 404. Omitted the public-source link and noted unavailable public access rather than publishing a dead link. Privacy & Safety points to existing implementation-specific information, not an invented policy.
- Verification: root lint passed. Initial build/typecheck caught unsupported Lucide Github export; removed with unavailable GitHub link, then reran checks. Final web production build/typecheck passed. Browser checks at 375/768/1280/1440px: no overflow, all eight links have valid targets and 44px height. Keyboard Enter on privacy navigates to correct anchor; solid focus outline; reduced-motion zero animations. Desktop screenshot reviewed. Shared muted-text/canvas tokens retain previously calculated 7.76:1 contrast. git diff --check passed. Full screen-reader and Lighthouse audits not performed.
- Files: apps/web/components/site-footer.tsx and site-footer.module.css. Customize project attribution as needed. Simulated: existing demo remains scripted, live status explicitly not connected. Limitation: public GitHub access must be restored before adding source link. Run npm run dev:web and scroll to bottom. No push or deployment.

## 2026-10-27 — Scam Scenarios dark redesign

- Rebuilt only existing ScamScenarios with three synthetic conversations: bank/KYC OTP request, arrest/payment threat and remote access. Preserved existing copy, placement and anchor; added persistent scripted labels, meaningful icons, evidence explanations and safe next steps open by default.
- Replaced parallax/Bento wrapper with semantic server-rendered articles and native disclosures. Static presentation reduces movement while reading safety advice and removes this section's animation client boundary. No dependencies added; shared parallax component retained for other uses.
- Verification: root lint, web typecheck and web production build passed. Browser at 375/768/1280/1440px: no overflow, three articles and three explicit synthetic labels. Enter/Space close/reopen advice; solid focus outline; reduced-motion zero animations. Desktop screenshot reviewed. Existing tested dark text tokens reused (muted on surface 6.92:1); risk badges use text/icons as well as red. git diff --check passed. Screen-reader/Lighthouse audit not performed.
- Files: apps/web/components/scam-scenarios.tsx and scam-scenarios.module.css. Customize synthetic examples; no real personal data. All examples remain fixed learning content, not detector output. Limitation: scenarios cannot assess an actual caller. Run npm run dev:web and visit /#scam-scenarios-title. No push or deployment.

## 2026-10-27 — Navbar dark/light theme toggle

- Added accessible 44px Sun/Moon toggle with stable Light mode label and aria-pressed state. Server header retained; small useSyncExternalStore client island handles preference, system changes and cross-tab storage events with listener cleanup. No dependencies added.
- Preference stored as scamcall-theme (theme only, no user content). Initial head script applies stored/system theme before paint; html suppressHydrationWarning is limited to intentional theme attribute. Storage failures retain working in-page toggle. Explicit saved preference takes priority over OS changes.
- Migrated component CSS color literals to shared paired palette tokens in app/theme-colors.css so sections, warnings, sheets and dialog portals follow the selected theme. Dark appearance retained; light uses slate/white surfaces, dark text, blue controls and red warnings. Existing scoped product theme now has light overrides. Root canvas follows selected theme; mobile navbar spacing accommodates toggle without removing primary action.
- Verification: root lint, web typecheck, web production build and git diff --check passed. Browser both modes at 375/768/1280/1440px: no horizontal overflow. Keyboard Space toggles with aria-pressed update and visible focus ring; target 44x44. Reload preserves stored light/dark choice. Fresh isolated browser contexts adopt light/dark OS settings. Light readiness dialog renders white/dark text; mobile menu opens. Pageerror capture zero errors. Desktop light screenshot reviewed. Computed text/background contrast scan on displayed landing text found no ratios below 4.5:1 (spot-check excludes alpha compositing, hidden states and graphical contrast; not a complete WCAG audit).
- Files: components/layout/theme-toggle.tsx, site-header.tsx/module.css, app/layout.tsx, globals.css, theme-colors.css, paired CSS component tokens and marketing/product-theme.module.css. Customize light/dark palette centrally. Existing demos remain simulated. Limitation: persistence requires available browser localStorage; theme still changes when storage is blocked. No push or deployment.

## 2026-10-27 — GitHub accountability checkpoint

- User authorized a new GitHub repository and committing all work to date. Created implementation checkpoint 8f77e2f with complete frontend, scripted demonstrations, reusable UI and persisted dark/light mode; retained inherited Git history and existing origin remote. Documentation checkpoint preserves integration notes, third-party licenses and per-section QA evidence.
- Destination: ItzPranav61/scamcall-shield-website (private). New remote will be website; current branch is feat/landing-hero, published to new repository main without rewriting local main or pushing to original origin. No PR/deployment requested or created.
- Verification for checkpoint: root lint and all-workspace typecheck passed. npm test passed 128 detector tests, 107 relay tests with 1 skipped, and 3 foundation tests (238 passed total, 1 skipped). Node production packages built during pretest; final web production build already passed in preceding theme step. git diff --cached --check passed; implementation diff reviewed before committing. Current-tree credential-pattern scan checked 177 paths and found zero matches. Secret-bearing environment files remain ignored; only secret-free examples tracked. Pattern scans are not a guarantee of absence of all sensitive content.
- Historical credential-pattern scan: 187 inherited blobs checked, zero matches.

## 2026-10-27 — Experiment: centered interactive hero

- User requested @aceternity/minimal-hero-with-huge-interactions on experiment. Ran shadcn info/view/add. Official registry view/add returned Unauthorized (valid API token or sign-in required); no Pro code or new dependencies installed. Official reference: https://ui.aceternity.com/blocks/hero-sections/minimal-hero-with-huge-interactions . This is an original implementation inspired by the public composition, not an installed/licensed Aceternity Pro block.
- Replaced only hero presentation with centered headline/CTAs and a large five-view product window (Listen, Transcript, Signals, Next step, Summary). Existing navbar and rest of landing retained. Server hero owns copy, client window reuses existing accessible Radix Tabs and Motion. Contextual captions, 200ms blur/fade on user selection; reduced-motion disables transitions. All content explicitly scripted, microphone off, no provider requests or recording. Existing readiness and interactive-demo CTAs retained.
- Verification: root lint, web typecheck, web production build and git diff --check passed. Isolated browser tests covered all five views in both themes at 375/768/1280/1440px (40 combinations), no overflow. ArrowRight selects next tab; reduced-motion zero animations; both CTA dialogs open. Original browser session had residual modal state, so repeated checks in a fresh isolated context. No backend tests repeated for UI-only change. Full screen-reader and Lighthouse audits remain unperformed.
- Files: apps/web/components/marketing/hero.tsx, hero-product-window.tsx, experimental-hero.module.css. Customize preview copy; all five views simulated. Exact Pro installation remains dependent on authorized Aceternity access. Run npm run dev:web and open /#hero-title. Changes remain local on experiment; no push or PR.

## 2026-10-27 — Experiment: Animated Beam How It Works

- Added actual Magic UI Animated Beam source from https://magicui.design/r/animated-beam.json, adapted under existing MIT attribution/license. Existing motion dependency reused; no package installation. Server HowItWorks keeps readable semantic steps and microvisuals; small ProcessFlow client wrapper measures icon nodes and connects three SVG beams.
- Desktop/tablet four-stage horizontal sequence, mobile below 701px vertical timeline. ResizeObservers track container/endpoints and disconnect on unmount. Unique gradient IDs; SVGs are decorative and excluded from accessibility tree. Beam starts once on viewport entry, three sequential 1.1-second traversals with repeat=0. Vertical gradient direction adapted for mobile. Reduced-motion suppresses gradient animations while retaining static paths. Existing illustrations/labels remain synthetic; no audio or provider access.
- Verification: root lint passed. Initial build/typecheck caught strict optional className mismatch from registry typing; fixed with fallback. Final web production build and typecheck passed, git diff --check passed. Browser in both themes at 375/768/1280/1440px: no overflow, four nodes, three correctly measured connector paths; mobile paths vertical and desktop horizontal. Reduced-motion: zero gradients/animations. Normal-motion isolated test observed all three x1 gradients finish at 110% and remain unchanged one second later. Zero pageerrors in isolated responsive test. Light screenshot reviewed. No new controls/keyboard traps; ordered text remains accessible without animation. Full screen-reader and Lighthouse audits remain unperformed.
- Customize stage descriptions after provider verification. Simulated: entire workflow/beam illustrates planned behavior. Limitation: animation is explanatory, not live processing status. Run npm run dev:web and open /#how-it-works-title. Existing local hero experiment preserved; no commit/push or PR in this step.

## 2026-10-27 — Experiment: Features bento glow and badges

- User approved recommended Bento Grid + Glowing Effect + Badge combination. Reused existing BentoGrid/BentoCard and Badge; added an adapted pointer-angle glow from the publicly accessible Aceternity registry source https://ui.aceternity.com/registry/glowing-effect.json (Manu Arora attribution retained). shadcn view verified registry availability. No new package or Pro block installed. No MIT license claim made for Aceternity source because a standalone upstream MIT file was not verified; source is attributed to its official registry.
- Only transcription/pattern cards get monochrome border glow. Existing six feature microvisuals, product-status qualifications and text retained. Client glow is decorative, pointer-events none, aria-hidden; parent article stays semantic/non-interactive. Glow stops on pointer leave/scroll, reduced-motion/coarse-pointer/mobile disables it. RAF, Motion controls, media listeners and pointer listeners clean up. Six actual capability statuses now use existing shadcn-style Badge with wrapping text.
- Verification: root lint, web typecheck, web production build passed. Isolated browser tests both themes at 375/768/1280/1440px: no overflow, six articles and six badges. Hover activates glow, leave deactivates; reduced-motion/mobile computed display none. Zero pageerrors. Screenshot reviewed. No new focusable controls, keyboard-only readers receive complete static content. git diff --check passed. Full screen-reader and Lighthouse audits remain unperformed.
- Files: marketing/features.tsx/module.css and ui/glowing-effect.tsx/module.css. Customize card copy/status as verified capabilities evolve. All microvisuals remain synthetic. Limitation: decorative CSS masking depends on browser support; regular borders remain available. Run npm run dev:web and visit /#features-title. Earlier hero/How It Works experiments preserved; no commit/push or PR.

## 2026-10-27 — Experiment: refined scripted demo

- Refined DemoWorkspace with existing Tabs/Button/Badge/Alert composition and Motion sentence entrances. Persistent synthetic-demo and microphone-off badges, playback-state badge, immediate risk Alert with supporting script phrase, separate recommendation, and reusable native Progress component. Native progress avoids adding a runtime package and exposes duration via accessible value text; this is a native implementation, not newly installed shadcn Progress.
- Deterministic scenarios/playback hook retained; no audio capture, sound or AI requests added. Transcript enters as full sentences in 180ms; reduced-motion uses no entrance animation. Risk warnings have no animation delay. Pause/Resume/Restart/Replay controls unchanged.
- Verification: root lint, web typecheck, web production build passed. Controlled-clock tests covered all four scenarios reaching high-risk with evidence, pause-hold, resume/completion, reset to zero and keyboard tab selection. Both themes at 375/768/1280/1440px passed overflow recheck; initial rapid resize exposed prior measured beam SVG width, fixed with max-width:100%. Reduced-motion section animations zero. Screenshot reviewed. git diff --check passed. Full screen-reader/Lighthouse audit not performed.
- Files: components/demo/demo-workspace.tsx and interactive-demo.module.css, components/ui/progress.tsx/module.css, one beam sizing safeguard in how-it-works.module.css. Customize synthetic scenarios. All risk events remain scripted. Limitation: text-only demonstration, no audio playback or live analysis. Run npm run dev:web and visit /#interactive-demo-title. No commit/push or PR.

## 2026-10-27 — Experiment: Safety & Trust component composition

- Implemented approved Card + Badge + Accordion + Alert composition, retaining existing availability Dialog and prototype-scope-title anchor. Added reusable typed server Card primitives using existing semantic tokens; SafetyTrust remains server composition with existing client Accordion/Dialog islands. No dependencies added.
- Current-preview card uses five truthful badges and clear status facts. Five multiple-open accordion explanations cover permission, real microphone status, immediate stop, history/processing and response guidance. Always-visible role=note warning states uncertainty, unverified retention and private-code guidance without unnecessary live announcement. No recording, provider connection, consent switch or security certification added.
- Verification: root lint, web typecheck, production build and git diff --check passed. Browser both themes at 375/768/1280/1440px: no overflow, one Card and five badges. ArrowDown/Enter navigation works; multiple explanations stay open. Availability dialog opens, Escape dismisses and restores trigger focus. Reduced-motion zero active section animations. Screenshot reviewed. Full screen-reader/Lighthouse audit remains unperformed.
- Files: marketing/safety-trust.tsx/module.css and ui/card.tsx. Customize privacy wording only after backend/provider verification. Demo remains synthetic; live data retention is unverified. Run npm run dev:web and visit /#prototype-scope-title. Earlier experiments preserved on experiment; no commit/push or PR.

## 2026-10-27 — Experiment: Scam Scenarios Card/Badge/Alert

- Applied approved composition using existing server Card primitives, Badge and Alert. Three semantic articles preserve fictional bank/KYC, arrest-threat and remote-access examples. Each quote highlights a synthetic evidence phrase; nine badges label fictional status and tactics. Safe response is always visible in role=note Alert; removed the collapsible advice interaction so crucial guidance is never hidden. No extra accordion needed for these short explanations.
- Server-only composition, no new dependency, audio access or animation. Neutral safety-action surface; red risk labels/highlights distinguish concerning requests with text/icons. No real-caller classification or safety guarantee. Existing experiment changes preserved.
- Verification: root lint, web typecheck, web production build and git diff --check passed. Browser both themes at 375/768/1280/1440px: no overflow, three Cards, nine Badges, three evidence marks and three visible advice notes. Zero section animations under reduced-motion; zero newly focusable controls/keyboard traps. Screenshot reviewed. Full screen-reader and Lighthouse audit remain unperformed.
- Files: apps/web/components/scam-scenarios.tsx and scam-scenarios.module.css. Customize synthetic scenario copy/evidence together. All conversations remain fictional, not detector output. Limitation: these educational examples cannot assess a live caller. Run npm run dev:web and visit /#scam-scenarios-title. No commit/push or PR.

## 2026-10-27 — Experiment: FAQ refinement

- Reused existing Accordion, Badge and Button. Eight existing implementation-grounded answers retained. Changed single-open cards to multiple-open spacious divider rows; first answer initially open. Added Research prototype Badge and actual demo/privacy section links via Button asChild. No packages or new client boundary added; FAQ remains server composition around existing interactive Accordion.
- Verification: root lint, web typecheck, production build and git diff --check passed. Both themes at 375/768/1280/1440px: no overflow. Browser confirmed eight questions, ArrowDown/Enter interaction, two simultaneous open answers, solid focus outline; both links target existing headings and are 44px high. Reduced-motion zero active animations. Full screen-reader/Lighthouse audit not performed.
- Files: apps/web/components/faq.tsx and faq.module.css. Customize answers as verified capabilities change. Existing demo remains synthetic; live audio/provider support remains unverified. Run npm run dev:web and open /#faq-title. All earlier experiment edits preserved. No commit/push or PR.

## 2026-10-27 — Experiment: Footer completion

- Refined only footer content/layout using existing Badge, Button asChild and Lucide icons; no new dependency. Added prominent scripted-demo CTA, Research prototype/Microphone off badges, Scam Scenarios navigation, private-repository status matching actual project setup and keyboard-accessible Back to top. Existing project attribution, independent-project qualifier and safety caveats retained. Server component remains static.
- Verification: root lint, web typecheck and production build passed; both themes at 375/768/1280/1440px had no overflow. All nine footer links target existing anchors and have 44px height; keyboard Enter on Back to top reaches hero anchor with solid focus outline. Reduced-motion zero footer animations.
- Browser console check found a pre-existing reduced-motion hydration mismatch in experimental hero initial animation. Fixed initial attributes to be identical server/client and moved entrance to media-gated CSS. Fresh isolated reduced-motion browser check captured zero console errors. Repeated lint and production build after repair. Full screen-reader/Lighthouse audit not performed.
- Files: site-footer.tsx/module.css; small corrective change in marketing/hero-product-window.tsx and experimental-hero.module.css. Customize attribution/copy. Demo stays scripted; public source link remains unavailable while repository is private. Run npm run dev:web and scroll to footer. Earlier experiments preserved. No commit/push or PR.

## 2026-10-27 — Promote experiment to main

- User explicitly authorized merging experiment into the new website repository main and deleting experiment locally/remotely. All local experiment edits checkpointed; inherited repository origin remains unchanged. Target is website remote (ItzPranav61/scamcall-shield-website), not the older origin repository.
- Pre-merge verification: root lint, all-workspace typecheck, web production build, node production builds via pretest and full npm test passed (238 tests passed; 1 skipped). Current-tree secret-pattern scan found zero matches; git diff --cached --check passed and staged diff/stat reviewed. Prior per-section browser evidence above remains applicable.
- Promote with a non-squash merge commit to preserve implementation/documentation checkpoints. Fast-forward local main to website/main first, set upstream to website/main, then push main before deleting experiment. No force push, PR or deployment command required. Merge does not verify or configure any external deployment pipeline.


## Website consolidation: 2026-10-29

- On consolidate-website, fast-forwarded a3f3af3 to f3f3043 (five website commits), with main unchanged. Restored the tracked local generator edit byte-for-byte from the local-s02 stash; quick-start and smoke files remain local. Untracked twelve raw Gnani pages while retaining them on disk, ignored raw pages and smoke scripts, and documented local raw-page fetching. npm ci installed 450 packages with zero vulnerabilities; npm test passed 128 detector, 107 relay and 3 foundation tests (one Windows relay skip); npm run lint, npm run build (including the Next.js marketing site), and npm run typecheck all exited zero. No live provider calls were made.

- 2026-10-30: Web live relay demo on codex/web-live-relay, branched from consolidate-website (90591e5), not native branches. Kept scripted preview and added consented relay scenario/microphone modes using protocol v1.2 imports, strict runtime validation, bounded PCM/transcript queues, 16 kHz mono PCM16 worklet conversion and 1024-byte/32 ms transport, escalating risk, warnings, explicit retry, and stop/disconnect/hidden-page cleanup. Relay mode is not reported by the contract and is labeled unknown; mock microphone output is explicitly scripted. Only NEXT_PUBLIC_RELAY_URL is public configuration (default ws://localhost:8787/ws). No protocol/relay/native changes or Gnani calls.
- Verification: root npm test passed: detector 128, relay 107 (1 skipped), web 34, foundation 3 (272 passed total). Root workspace typecheck and Node+web production build passed. Lint passed with zero warnings, excluding the existing untracked apps/mobile build leftovers via CLI only; no native tooling was run or changed. Existing dependencies were usable; package-lock-only install updated web declarations and reported zero vulnerabilities. A temporary external Node preload blocked environment-file reads during tests/builds. The new client was also exercised against a real in-process mock relay for all five scenarios: kyc-otp/digital-arrest/refund-upi danger with one warning.audio each; genuine-bank-alert/borderline-delivery safe with none. Physical browser microphone/playback checks remain manual; no browser was launched. Existing local generator edits and quick-start/smoke work remain uncommitted.

- 2026-10-30: Polished live-relay UI on codex/web-live-relay: controlled consent defaults false, resets on page restoration and all terminal states, and gates Start through a tested view reducer; five new tests cover initial rendered markup, terminal resets and real client session.end. Technical notes are closed by default; red synthetic-only banner stays visible/sticky and one concise prototype disclaimer follows consent. Header/mobile/hero CTAs now link to the demo, with all prototype-copy replacements listed in apps/web/README.md. Inventoried 600,474,619 bytes of existing native leftovers; added Android/Expo/iOS ignore rules and ESLint exclusions, deleting nothing. Relay and detector source unchanged; existing generator/quick-start work preserved.
- Verification: npm test passed 277 tests (128 detector, 107 relay, 39 web, 3 foundation), with 1 existing relay skip; npm run lint and npm run typecheck passed; web production build passed. Environment-file reads were blocked by the existing external preload guard during checks. No live Gnani call or native build was run. Step 6 limitation documented: current live relay unconditionally rejects scenario, so DEMO_MODE=1 cannot enable dropdown WAV-to-STT playback without forbidden relay changes. Documented truthful live startup plus the existing separate synthetic-WAV CLI stream; key loading remains exclusively in relay startup.

- 2026-10-30: Explicit mode diagnosis on codex/web-live-relay: confirmed and stopped earlier mock development server. Added forced dev:relay:live (--live), preserved normal dev mode/file precedence, sanitized missing-GNANI_API_KEY startup failure, first startup line with resolved mode/port/origin count/key presence, and mode-only health with shared origin/CORS checks. Web adds mode badges, mock-microphone warning, permission/sample-rate diagnostics, successful PCM frame/byte counters and last-message timestamps; contract v1.2 and detector source unchanged. No new dependencies.
- Controlled authorized live test, exactly one CLI session: startup relay mode=live port=8787 origins=2 gnani_key=present; health {"ok":true,"mode":"live"}; 9.824 seconds synthetic audio, three real STT finals, danger, warning.audio 51,244 bytes from cache, zero TTS characters. Stopped the owned live process and confirmed 8787 free. No secret values inspected/logged; only the relay runtime loaded its own configuration. Tests passed 294 (128 detector, 114 relay, 49 web, 3 foundation) with one existing skip; lint, typecheck and web production build passed under the external environment-file blocking guard. Browser hardware verification remains manual.

- 2026-10-30: Web microphone robustness on codex/web-live-relay: added audioinput enumeration/default-device selector, explicit exact deviceId constraints for chosen inputs, AGC/noise suppression next-Start options (existing defaults false/true), and worklet-derived peak/RMS meters beside frame diagnostics. Settings are snapshotted per session; labels refresh after permission/device changes; level updates aggregate around 10 Hz and reset on Stop/warning playback. No samples/device IDs are persisted or logged. Added six tests for constraints, levels and capture integration; all 55 web tests pass.
- Verification: root tests passed on rerun (300 passed, 1 skipped: detector 128, relay 114, web 55, foundation 3); first concurrent run hit the existing unchanged relay timing assertion at 31.87 ms vs 32 ms. Lint and workspace typecheck passed; web production build passed. ffprobe audited all 10 local cached warning WAVs: every file is 16000 Hz, mono, 16-bit pcm_s16le; per-file results are in apps/web/README.md. No environment-file reads, real Gnani calls, dependencies, relay/detector/contract edits, or native tooling changes. Physical browser device switching remains manual.

- 2026-10-31: Removed invalid STT socket receive-gap timing assertion: network/event-loop delivery can coalesce even when sender pacing is correct. Socket integration now checks bounded delivery of five 1024-byte frames and shutdown; exact 32/64/96/128/160 ms sender deadlines and post-stop cancellation are checked with fake timers in PCM tests. Removed the post-stop sleep. Full relay suite passed 10 consecutive runs, each 115 passed/1 skipped (1,150 passes, 10 existing skips); no production relay logic changed.
- Added record=1 opt-in on the existing home page: server-side query selection avoids a marketing-page flash, with dynamic rendering of the same route. Normal layout is unchanged without the exact opt-in. Recording shows only the live demo workspace, larger transcript/risk typography, persistent synthetic/mode banners and keyboard-focusable scrolling panels; closed Technical details sits below the capture viewport. Eight parameter/layout tests pass. Browser checks at 1280x720 and 1920x1080 confirmed no nav/footer, closed offscreen details, 24/28 px and 30/36 px transcript/risk text, and preserved normal-page navigation/FAQ/scripted preview.
- Added scripts/start-demo.ps1 and stop-demo.ps1 plus docs/demo-recording.md. PowerShell parsing passed; a dummy-listener integration test verified occupied-port PID rejection before launch and stop isolation (8787/3000 stopped, unrelated 18789 preserved). The full live launcher was not executed: no real provider sessions or environment-file reads were authorized for this task. Visible server windows are intentional per user request. Existing local generator/quick-start edits preserved; detector and v1.2 contract unchanged.
- Final verification: full npm test 309 passed, 1 existing skip (detector 128, relay 115, web 63, foundation 3); lint, workspace typecheck and web production build passed. npm audit --omit=dev counts: info 0, low 0, moderate 0, high 0, critical 0, total 0. No new dependencies. Recording narration/cost guidance identifies synthetic calls and variable credit usage; hardware audio and screen-recorded spoken warning still require the user's take.

- 2026-10-31: Fixed continuous mic flow on codex/web-live-relay. Browser completed frames now send immediately from source/worklet callbacks; no local timer or queue, exact 1024-byte validation and 256 KiB transport guard remain. Per-frame diagnostics no longer update session React state: mutable transport/level refs feed an immutable snapshot store at most every 250 ms; only the memoized Technical details leaf subscribes, and transcript/risk panels are memoized separately. Local LiveState diagnostics were separated from UI session state; wire types and v1.2 contract unchanged.
- Relay pacing now uses absolute start+n*32 ms deadlines, corrects lateness only within elapsed frame budget, rebases after unused idle slots, and bounds queues to 128 frames. Removed the redundant provider relative/min-gap timer so it cannot reintroduce drift; pending connection frames and upstream WebSocket buffering are bounded to 128 frames/128 KiB. Overflow still fails loudly. Fake-timer 300 s steady and eight-frame/256 ms burst simulations passed, including 1 ms late callbacks, exact 32 ms average output spacing, no accumulating backlog, stalled-consumer limits, diagnostics <=4 updates/s, and no per-frame parent state updates.
- Validation: full test suite 317 passed, 1 existing skip (detector 128, relay 119, web 67, foundation 3); relay full suite passed 5 consecutive runs, each 119 passed/1 skipped. Lint, workspace typecheck and web production build passed. No new dependencies or detector/contract edits; normal checks used the external environment-file read blocker.
- Exactly one authorized real CLI run: live startup confirmed and health live; entire kyc-otp.wav input plus trailing silence forwarded (9.824 s), three STT finals, danger/kyc_otp, 51,244 cached warning bytes, zero TTS characters, normal session end at about 15.05 s wall time. Relay runtime alone loaded private configuration; no key value inspected or printed. Stopped owned relay and verified 8787/3000 free. No second session or physical browser mic test. Five-minute browser cap, configured relay cap, finite network/queue budgets and genuine device/network stalls remain.

- 2026-10-31: Web demo retains caution/danger only after normal Stop/session.end, labels the last assessment in grey, and clears safe results plus session output on errors/disconnection/new Start. Error-reason session.end clears results. Added terminal-state and rendered-label tests; npm test: 326 passed, 1 skipped (web 76); lint, workspace typecheck and web production build passed with private env reads blocked. No relay/protocol/detector changes or provider calls.

- 2026-10-31: Offline human Hinglish regression tuning, tests first (13 failing/133 passing before implementation; 146 detector tests green after). Sessions a/b/c before safe0/safe20/safe20 -> after safe20/danger65/danger100; d/e/f before safe0/safe20/safe20 -> after safe0/safe20/danger80. Bank claim without main and polite OTP handover phrases now match; polite weight35 alone caution, direct weight65 preserved via bounded internal directSensitiveRequest flag. Block variants already matched and are regression-tested; existing negation/genuine/borderline levels preserved plus three new genuine OTP warnings. Relay sends transcript before evidence-linked risk and suppresses unchanged level/score; c/f previously suppressed, now emitted; web evidence/escalation checks accept both sequences. Full npm test: 344 passed/1 skipped (detector146, relay119/1 skipped, web76, foundation3); lint, workspace typecheck and web production build passed with env reads blocked. No network/provider calls or contract/message-type changes.

- 2026-10-31: Digital-arrest human STT regression, tests first: 19 failed/157 passed before fix, 176 detector tests pass after. Observed RBI/yeah/case/conditional-payment session: safe20/safe20/safe20/safe20 before -> safe20/safe20/danger65/danger100 after. Scoped payment nahi kiya toh away from the arrest consequence for negation; added named case/warrant threats and ED/cyber-crime authority claims, reusing authority/urgency/money and existing DIGITAL_ARREST. No score thresholds, public IDs/types, contract, or message changes. All four requested genuine sentences remain safe0; prior negation/scenarios retain their levels. Full npm test: 374 passed/1 skipped (detector176, relay119/1 skipped, web76, foundation3); lint, workspace typecheck and web production build passed with env reads blocked. Offline only; no provider/network calls.

- 2026-11-01: Vercel web readiness on unmerged codex/web-live-relay: hosted pages without NEXT_PUBLIC_RELAY_URL do not mount relay health/socket/mic controls; local defaults and record=1 preserved, scripted preview default explicitly labelled. Web engines pins Node24.x; npm prebuild compiles protocol then detector declarations (type-only dependency, no client runtime import), not relay. Fresh checkout on D: had no node_modules/dist/.next or private env files; root npm ci installed450/audited455, then cd apps/web + npm run build passed after fixing a reproduced missing-detector-declarations failure. Build outputs from the failed attempt were preserved outside source directories before the passing run; all commands blocked private env reads. Full npm test381 passed/1 skipped (detector176, relay119/1 skip, web83, foundation3), lint and all-workspace typecheck passed. Clean .next scan199 files: GNANI5 filenames, x-api-key0, api_key0, broad30+ token-pattern127 filenames, credential-assignment-pattern0; full filenames-only report local-artifacts/vercel-bundle-scan.json. Only public app variable NEXT_PUBLIC_RELAY_URL. npm ci reported16 moderate dependency advisories plus existing ESLint deprecation; dependencies unchanged. Root README now documents TODO links, local live/record commands, honest limits, credits/team and exact dashboard settings. No Vercel login/deploy, source changes to relay/detector/protocol, contract/message changes or new dependencies.


## Public source snapshot preparation — 2026-11-02

Exported the tracked main tree at ceb40822fd43c5f34957d6104c07e247e510f7d3 (PR #10) without its history or local files. Replaced provider reference summaries with short integration notes and public documentation links; raw pages are absent. Generalized local artifact paths and changed generator temporary paths to the system temporary directory. Preserved third-party notices and added the proposed MIT license. On Node 24.14.1, npm ci, npm test (389 passed, one platform skip), typecheck, lint and the full production build passed without a local environment file. The README asset checker and its eleven tests passed. Installation reported sixteen moderate dependency advisories; dependencies were not changed. No live provider session, publication or remote configuration was performed.
