# Phase 0 completion checklist

Evidence and current blockers are maintained in ../PROGRESS.md. DONE means verified for the stated scope, not just that a file exists. Earlier Phase 0 entries describe the foundation; separately authorized mock/detector work is recorded in the workspace progress files.

| Acceptance criterion | Status | Evidence / remaining action |
| --- | --- | --- |
| npm monorepo exists and workspaces resolve | DONE | Installation and workspace-resolution test |
| Next.js placeholder builds | DONE | Local production build generated static / route |
| Relay typechecks | DONE | Strict tsc; local mock WebSocket pipeline and health endpoint |
| Detector package typechecks | DONE | Strict tsc; pure rules-only functions |
| AGENTS.md exists | DONE | Mandatory repo rules reviewed |
| Architecture document exists | DONE | docs/architecture.md |
| Contract and matching TypeScript types exist | DONE | docs/contract.md and packages/protocol/src/index.ts |
| Verified Gnani integration notes exist | DONE | Official references retrieved 2026-10-24; unknowns explicitly marked |
| Secret management configured | DONE | Separate examples; .env exclusion checks; no real credentials added |
| STT API smoke test passes | BLOCKED | Live verification is separate from mock build/test results |
| TTS API smoke test passes | BLOCKED | Live audio and listening verification are separate from generated mock WAVs |
| Placeholder deployed to Vercel | BLOCKED | Vercel connector requires reauthentication; exact steps in README |
| Eligibility question sent manually | BLOCKED | User must send organizer question; draft in README |
| PROGRESS.md reflects evidence | DONE | Verification outcomes and blockers recorded |

Live-provider acceptance remains BLOCKED; mock relay and rules-only detector were separately authorized. Prepared smoke scripts are not proof of provider readiness; a successful local build is not proof of deployment.
