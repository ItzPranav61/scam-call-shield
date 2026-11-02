# Mock relay verification — 2026-10-25

Implemented only the local mock relay, additive warning.audio protocol, and requested
root script changes. Mock STT produces fixed synthetic transcripts; mock risk values
are fixtures, not detector logic. Provider interfaces isolate a future implementation;
every Gnani method throws `not implemented` without reading credentials or making calls.
Warning audio is a generated one-second PCM16 mono 16 kHz tone, cached in memory.
The relay enforces the wire contract's exact 1024-byte frames; the separate pure
rechunker handles arbitrary even-length buffers and returns an unpadded remainder.

Actual evidence:

- `npm run test`: 34 tests passed in 3 files; real loopback ws sessions verify message
  order, safe/caution/danger progression, invalid-input recovery, timeout, kill switch,
  disconnect cleanup, logging opt-in, and warning.audio WAV headers/sample format.
- `npm run typecheck`: exit 0, real TypeScript checking of relay/tests and imported types.
- `npm run typecheck --workspace=@scamcall/relay -- --noUnusedLocals --noUnusedParameters`: exit 0.
- `npm run build --workspace=@scamcall/relay`: exit 0; compiled server starts successfully.
- `npm run dev:relay -- --mock`: started on 127.0.0.1:8787. `curl.exe` GET /health returned
  HTTP 200 and exactly `{"ok":true}`; POST /health returned 405, unknown path returned 404.
- Compiled `npm run start --workspace=@scamcall/relay -- --mock` also returned `{"ok":true}`.
  Both manually started servers were stopped afterwards.
- Root `npm run lint` still prints `not implemented yet`; it is not actual lint evidence.
  Its script was outside the authorized changes. Real strict/unused-code checks ran above.
- Initial tests caught Buffer.slice sharing cached WAV memory; returning a copy fixed it.
  The mutation regression test passes. Initial workspace-filtered npm installs skipped
  dependencies; declared workspace manifests plus root install resolved that. The existing
  TypeScript 5.9.3 compiler was restored locally without a new manifest dependency.

Scope limitations: root PROGRESS.md, apps/web, detector source and the existing root
lockfile were not edited. This checkout's pre-existing detector scaffold and TypeScript
installation remain prerequisites; the detector files are still uncommitted and outside
this task's allowed files. This commit alone is not a self-contained clean-clone setup.
There is no public relay authentication; mock mode is restricted to local connections
and an explicit browser-origin allowlist. No real Gnani behavior or analysis is claimed.

## Detector pipeline integration — 2026-10-25

This supersedes the fixed-risk mock path described above. The detector scaffold was
committed in the preceding detector task; it is no longer an uncommitted prerequisite.
Each connection now owns DetectorState, bounded first-supporting-segment references,
last published level/score, and a warning-code set. Real analyze() runs on synthetic
mock STT segments. Initial risk is published once; subsequent risk messages require
changed level or score. Existing RiskAssessment remains unchanged (no score field).
The detector's result is mapped to existing indicators/summary fields without copying
transcript text into alerts. Detector failures are sanitized, recoverable and leave
the prior state intact so later segments continue. Latency stages are stt->detector,
detector->tts and total per-segment processing time, not acoustic latency.

WarningAudioCache lives outside the per-connection handler and calls TtsProvider
only on a (warningCode, language, voice) miss. It stores defensive copies and is
bounded at 32 entries. Each warningCode is handled once per session. No new dependency,
provider network call, key access, detector edit, web edit, or root script edit occurred.

Authorized contract/protocol changes only: v1.2 note, optional session.start.scenario,
and mock/explicit-demo gating, unknown-name rejection, safe file-catalog lookup and
ignored scenario binary frames. File names are read at server startup; client names
are only Map lookup keys, never paths. DEMO_MODE=1 routes explicit demos to mock
replay even if a non-mock provider was otherwise selected; that provider is not started.
The protocol's other fields, risk names, aliases and wire version 1 remain unchanged.

Actual final evidence:

- `npm test`: 74 detector + 51 relay tests passed (125 total). New integration tests
  cover all five scenarios, monotonic risk, suppression of unchanged results and
  duplicate warnings, distinct warning codes, per-session reset, language cache keys,
  zero additional TtsProvider calls in the second session, traversal `../.env`, unknown
  names, mock/demo gating, ignored odd-length scenario audio and detector exceptions.
- `npm run typecheck`: exit 0.
- Relay typecheck with --noUnusedLocals --noUnusedParameters: exit 0.
- `npm run build --workspace=@scamcall/relay`: exit 0. Predev/pretest/prebuild now compile
  the existing detector before runtime imports; no dependency installation was needed.
- `node --check apps/relay/scripts/run-scenario.mjs`: exit 0.
- `npm run dev:relay -- --mock`: started on 127.0.0.1:8787. Client script kyc-otp finished
  danger with one 32044-byte WAV; genuine-bank-alert finished safe with zero audio.
  curl.exe /health returned exactly {"ok":true}.
- Compiled server + the same client replayed digital-arrest: danger, one 32044-byte WAV,
  no repeated audio after the later danger update. Both manual servers were stopped.
- Root lint remains the pre-existing placeholder, not real lint evidence. Strict
  compiler/unused-code checks above provide the actual static checks.
