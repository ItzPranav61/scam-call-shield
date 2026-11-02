# Approved Header + Hero: dark-first voice safety direction

Implemented 2026-10-26 after explicit approval. Scope is Header + Hero only. Existing lower sections, detector, relay, protocol and scripted simulator retained; no backend integration or new pages were added.

## Architecture / complete source files

- apps/web/components/layout/site-header.tsx — server header, desktop anchors and sticky primary action.
- apps/web/components/layout/brand.tsx — server wordmark and shield.
- apps/web/components/layout/navigation.ts — shared navigation data.
- apps/web/components/layout/mobile-navigation.tsx — client Sheet menu.
- apps/web/components/layout/site-header.module.css — scoped responsive header styles.
- apps/web/components/marketing/hero.tsx — server copy, explanation and mockup composition.
- apps/web/components/marketing/hero-actions.tsx — client primary readiness / secondary existing demo triggers.
- apps/web/components/marketing/protection-readiness.tsx — client availability/privacy dialog, no microphone APIs.
- apps/web/components/marketing/monitoring-preview.tsx — client prepared Hinglish transcript, three user-controlled risk states and finite simulated waveform.
- apps/web/components/marketing/hero.module.css and monitoring-preview.module.css — scoped layouts.
- apps/web/components/marketing/product-theme.module.css — dark-first variables scoped to this approved work and its portals.
- apps/web/components/ui/sheet.tsx and sheet.module.css — shadcn-style Sheet composed from installed Radix Dialog.
- apps/web/components/hero.tsx — old import path preserved by re-export.
- apps/web/app/page.tsx — mounts SiteHeader before existing main content.
- apps/web/app/layout.tsx — self-hosted next/font Geist Sans and Geist Mono variables and honest metadata.

## Dependencies

No new package dependencies. Reuses existing Next/React/Tailwind, Lucide, shadcn Button/Dialog/Alert, Radix Dialog and existing simulator/Tabs. Sheet follows the official shadcn Radix composition without running init or adding a second primitive library. No extra animation-library components added; existing 3D/parallax/shine are not mounted in the new hero.

Run from repository root:

    npm ci
    npm run dev:web

Open http://localhost:3000.

## UX decisions

- Sticky header has working existing-section anchors, primary CTA, skip link and mobile focus-trapped Sheet. Mobile keeps Start Protection in the header; compact branding retains its full accessible name.
- Main headline/value proposition leads; desired future product behavior is immediately qualified by the visible live-protection availability message.
- Start Protection opens a readiness/privacy dialog. It never represents monitoring as active and never requests microphone permission. The secondary action opens the existing deterministic simulator.
- Preview explicitly says: Simulated Demo — No live audio is being processed. The microphone icon and waveform are labeled simulated, timestamps are examples and the microphone-off status is visible. A 2.4-second illustrative waveform runs only on load/state change and is static for reduced motion.
- Restart/Next signal progress from context to Caution to High risk indicators. Explanations and evidence accompany colored indicators. No risk percentage or speaker identity is fabricated.
- Fonts and dark palette are scoped to approved surfaces so the existing lower sections are not silently restyled. Features currently links to the actual capabilities section until a separate Features section is approved. Live Demo points to the functioning demo trigger.

## Implementation notes

- What I should customize: final logo asset, provider-verified language wording and later approved navigation destinations.
- What remains simulated or a placeholder: hero transcript/waveform/risk events, fixed 00:24 example timestamp, existing scripted demo. Start Protection is an honest readiness gate, not a working monitoring workspace.
- One known limitation or technical dependency: the live browser-audio-to-relay/provider path remains unverified; a separately approved protection workspace and end-to-end provider testing are required.

## Verification actually performed

- Root npm run lint passed.
- Web npm run typecheck passed.
- Web production build passed, including Geist font loading.
- git diff --check passed.
- Browser at 375, 768, 1280 and 1440px: no horizontal overflow. Desktop and mobile screenshots reviewed; mobile headline spacing was corrected.
- Sticky computed position verified. All header hash links resolve to existing IDs.
- Mobile Sheet opens, traps focus via Radix, closes by Escape and closes after selecting FAQ. The primary mobile-header action opens readiness.
- Readiness dialog traps focus, closes with Escape and returns focus to the initiating CTA.
- Instrumented getUserMedia during readiness interactions: zero calls. No permission prompt or capture.
- Existing demo still opens/closes, with scoped dark theme. Shared tab selected text honors the new primary-foreground token without changing its old default.
- Preview Restart/Next signal yields Caution then High risk indicators. Reduced-motion computed waveform animation is none.
- Browser console has zero errors/warnings. No Lighthouse score or complete WCAG conformance claimed.
- Relevant palette contrast was computed during direction review: main text/canvas 19.02:1, muted/surface 6.92:1, white/strong-blue CTA 4.94:1. Focus indicator uses lighter blue; risk text uses light red/amber with text labels.

Not yet tested: physical microphone devices, live provider sessions, real language recognition, spoken warnings, production hosting, screen-reader assistive software or Lighthouse. These are outside this approved Header + Hero step.
