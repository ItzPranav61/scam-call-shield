# Interactive Scam Demo section

Implemented 2026-10-27. Scope: the next approved landing section after Features. No live monitoring, microphone capture, provider integration or new page.

## Architecture and implementation

- apps/web/components/marketing/interactive-demo.tsx — server-rendered section heading, scoped theme and disclaimer.
- apps/web/components/demo/demo-workspace.tsx — client scenario tabs, scripted transcript, evidence marks, prepared risk/advice, progress and playback controls.
- apps/web/components/demo/demo-scenarios.ts — strict typed, deterministic synthetic scripts for Bank OTP, Fake KYC, Digital arrest and UPI request; context at 0s, caution at 4s, high risk at 8s, completion at 14s.
- apps/web/hooks/use-demo-playback.ts — isolated timing/state logic. Explicit start only; pause/resume preserve position, restart returns idle, replay starts fresh. Interval cleanup on pause/completion/unmount; scenario panels unmount on selection change.
- apps/web/components/demo/interactive-demo.module.css — scoped dark layout; transcript/risk columns stack on mobile; warning text/icons supplement severity color.
- Page mounts the section immediately after Features. Shared navigation Live Demo now targets #interactive-demo-title; hero's modal demo remains available unchanged.

## Dependencies

None added. Reuses existing shadcn Button, Radix-backed Tabs, Lucide and scoped dark theme. Run npm ci and npm run dev:web from repository root.

## UX and accessibility

- Exact label: Simulated Demo — No live audio is being processed. The label stays sticky under the global header while reading the example.
- Microphone off, scripted dialogue and prepared risk events are explicit. No invented speaker detection, confidence score or live AI connection.
- Start Demo, Pause Demo, Resume Demo, Restart Demo and Replay Demo work. Restart is disabled only in the initial idle state. No autoplay on page load.
- Transcript additions use a polite, additions-only live region; risk updates use one atomic status region. Timer/progress updates do not live-announce each tick. Timeline has numeric progressbar values.
- Scenario tabs support arrow-key navigation. Control touch targets are at least 44px. Reduced motion removes progress transitions; transcript events continue as readable discrete updates.
- No sound is played. There are no microphone/audio uploads, external requests or API-key requirements. Advice and risk events are fixed scripts, not detector predictions.

## Implementation notes

- What I should customize: synthetic script copy/timing in demo-scenarios.ts, after content review.
- What remains simulated or a placeholder: every transcript, risk event, explanation and summary in this section.
- One known limitation or technical dependency: this text-based demonstration does not validate live speech recognition or detection quality.

## Verification actually performed

- Root lint, web strict typecheck, web production build and git diff --check passed.
- Browser controlled-clock tests: Bank OTP caution at 4s, high-risk at 8s, complete at 14s; pause held progress at 4 through an additional 5 seconds; resume, restart and completion/replay control verified.
- Fake KYC, Digital arrest and UPI request each reached their scripted high-risk state. Switching back to Bank OTP resets to idle/0.
- Keyboard ArrowRight changes scenario tabs. Progressive transcript marks both urgency and sensitive-request evidence.
- Instrumented microphone/fetch during playback: zero calls to either.
- 375/768/1280/1440px: no horizontal overflow. Desktop/mobile screenshots reviewed. Live Demo anchor lands at roughly 105px beneath the sticky header. Synthetic label remains visible at mobile risk-panel scroll position.
- Reduced motion progress transition duration: 0s. Console: no errors or warnings.
- This does not constitute a screen-reader assistive-technology audit, a live provider test or a measured Lighthouse score.
