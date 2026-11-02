# Web verification evidence

- 2026-11-01 — Hosted demo polish, branched from origin/main ea9487e (PR #4).
  Controlled mode starts scripted; manual tab activation prevents restored focus
  from selecting Live relay without a click or Enter/Space. Existing availability
  logic and record=1 flow unchanged. Hosted notice uses 16px vertical / 24px
  horizontal padding with inherited theme text and wrapping.
  Full npm test: 382 passed / 1 skipped (detector176, relay119/1 skipped,
  web84, foundation3). Lint and workspace typecheck passed. Production build
  passed via npm run build from apps/web in the D: verification checkout, using
  the same frontend sources and existing locked dependencies. Private env reads
  were blocked for all checks and the temporary production server.
  Headless Chrome checked widths375/1280 in light/dark: no horizontal page or
  notice overflow, text fits, correct theme text colours, scripted default after
  reload, focus does not activate live, Enter opens notice. Hosted views made
  zero health requests / WebSocket connections. Local live controls still render
  and Start remains disabled without consent. Record-mode regression tests pass.
  Screenshots and browser measurements: local-artifacts/
  hosted-polish-{375,1280}-{light,dark}.png and hosted-polish-browser-check.json.
  No relay/detector/protocol or contract changes, dependencies, or new env vars.

- 2026-11-01 — Social links, branched from origin/main 8c42948 (PR #5).
  Public destinations live only in lib/site-links.ts. GitHub and the supplied
  LinkedIn profile render as icon+label anchors; X is empty because no handle was
  supplied and therefore is omitted. Footer includes Built by Pranav and Vedant.
  Header GitHub hides at <=1000px to preserve the demo action. Hosted notice
  links only README to the configured repository #readme without changing text
  or 16px/24px padding. External anchors use _blank plus noopener noreferrer.
  All link targets are at least44px high; theme tokens and focus outlines retained.
  Full npm test389 passed/1 skipped (detector176, relay119/1 skip, web91,
  foundation3), lint and workspace typecheck passed. Web production build passed
  from apps/web in the D: verification checkout using matching source files.
  Strict optional className typing was fixed after the initial build caught it.
  Headless Chrome checked header/notice/footer at375/1280 in light/dark: no
  horizontal overflow, header overlap, or text clipping; README and social
  targets44px high; keyboard-visible2px focus outline. Hosted views made zero
  external requests, health requests or WebSocket connections. Screenshots:
  local-artifacts/social-{375,1280}-{light,dark}-{header,demo,footer}.png
  Browser metrics: local-artifacts/social-browser-report.json.
  Private env reads blocked throughout. No new dependencies, env vars, tracking,
  Gnani branding/handles, relay/detector/protocol changes, or unrelated copy edits.

- 2026-11-01 — X link: confirmed PR #6 merged into origin/main 6e3dd55,
  branched codex/web-x-link from it. Config now uses https://x.com/PSawant610;
  X aria-label is exactly ScamCall Shield creator on X (opens in a new tab).
  Existing styles, blank omission, _blank/rel protection and44px targets retained.
  Full npm test389 passed/1 skipped (web91); typecheck, lint and web build passed.
  Chrome verified375/1280 light/dark: three footer links fit, no overflow or header
  crowding, X destination/label and keyboard focus verified, no external requests.
  Footer screenshots: local-artifacts/x-link-{375,1280}-{light,dark}-footer.png.
  Checks used matching sources in D: for the build; private env reads blocked.
  No protected-package, contract, dependency, stylesheet or other handle changes.
