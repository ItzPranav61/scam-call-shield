# Shadcn dialog and synthetic scam simulator

Implemented 2026-10-26, following the user request for shadcn base components and an interactive simulator from the hero CTA.

## Components and sources

- Added reusable Button, Dialog, Alert and Badge primitives under apps/web/components/ui. Button uses cva variants and Radix Slot; Dialog uses Radix Portal/Overlay/Content/Trigger/Close and accessible Title/Description.
- Official source reviewed: https://ui.shadcn.com/r/styles/new-york/dialog.json and https://ui.shadcn.com/r/styles/new-york/button.json . MIT notice retained in docs/licenses/shadcn-ui-MIT.txt.
- Ran npx shadcn@latest docs button dialog alert badge. The CLI defaults to Base UI without a configured project; used the documented Radix implementation to match this site's existing Origin/Radix tabs and accordion.
- https://ui.shadcn.com/docs/components/radix/dialog
- https://ui.shadcn.com/docs/components/radix/button
- Installed scoped @radix-ui/react-dialog, @radix-ui/react-slot, class-variance-authority and lucide-react. npm reported zero vulnerabilities after installation.
- Added Tailwind v4 semantic color mappings in the existing global stylesheet, mapped to approved off-white, forest-green and warm warning tokens. Theme/layout remain intact.
- Manual source integration preserves relative imports and existing component ownership. No broad shadcn initialization, theme replacement or unrelated tooltip/modal surfaces.

## Product flow

- Hero CTA is a shared Button wrapped in DialogTrigger asChild. Opening also highlights the existing static phone warning. CTA now always says Explore a scam example rather than toggling the inline preview/reset.
- Dialog contains Bank/KYC, Fake arrest and Remote access scenario tabs using the existing accessible Tabs primitive.
- Each scenario has three stages: caller introduction, pressure + visible warning signs, and user response. Users can choose to comply or independently verify, receive prepared feedback and restart/finish.
- All text and feedback are fixed synthetic learning content. No requests for actual OTP, phone number or private data; no microphone, audio playback, recording, relay or provider connection, persistence or external analysis. No real transfer/access action is performed when choosing a response.
- Scenario data lives in simulator-scenarios.ts; simulator UI lives in scam-simulator.tsx with a scoped layout stylesheet. Tab changes and reopening reset scenario progress. No new landing-page section added.

## Accessibility and responsive behavior

Radix supplies focus trap, Escape/outside close, background interaction blocking and focus return. Dialog has title/description and an accessible 44px close button. Native button variants keep focus rings and disabled states. Progress uses an ordered list with aria-current; prepared feedback is a polite status. Mobile remains the same bounded, internally scrollable dialog; no unnecessary separate drawer dependency. Animations are disabled for reduced motion.

## Verification

- Root lint, web strict typecheck, production build and git diff --check pass.
- Browser covered all three scenarios; both comply and verify branches produce the expected feedback. Start over resets and reopening starts at Bank introduction.
- Focus remains inside when Tab wraps; Escape closes and focus returns to hero CTA. No console errors or Radix missing-title/description warnings.
- At 1440/768/390/320px, neither page nor dialog has horizontal overflow. Long content scrolls inside a viewport-bounded modal. Reduced-motion computed animation is none. Desktop and mobile screenshots reviewed.

Run npm ci then npm run dev:web. Open http://localhost:3000, click Explore a scam example, try each scenario/response, restart, then close with Escape or the close/finish controls.
