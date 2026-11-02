# Component-library audit and applied changes

Reviewed: 2026-10-26. Scope: existing landing page only. No new product features, sections, live analysis or deployment.

## Benchmarks and selection

| Library / pattern | Fit for ScamCall Shield | Decision |
| --- | --- | --- |
| Aceternity UI Bento Grid / card interactions | Useful for separating example importance; animated decoration is secondary to educational content | Reviewed layout/hierarchy as a benchmark; no Aceternity source copied and no Pro assets used |
| Magic UI Bento Grid | Good fit for a featured scenario with supporting examples | Adapted MIT source into reusable semantic BentoGrid/BentoCard wrappers, CSS Modules and always-visible actions |
| Origin UI Tabs | Strong fit for three mutually exclusive walkthrough panels | Adapted the MIT-licensed legacy Origin wrappers using scoped Radix packages; proper tablist/tab/tabpanel relationships and arrow/Home/End keys |
| Origin UI Accordion / shadcn Accordion | Strong fit for FAQ content and keyboard navigation | Adapted Origin MIT wrapper into shared Accordion primitives, single-open behavior, chevrons, measured height animation and reduced motion |
| Animated marquees, cursor effects, autoplay carousels | Weak fit for reading scam indicators and verifying claims | Not added; no continuous decorative animation |

Origin's domain redirects to coss UI. The repository root has a different license; only the explicit MIT source under apps/origin was adapted. Full notices are in docs/licenses/origin-ui-MIT.txt and docs/licenses/magic-ui-MIT.txt. This is a comparison with relevant established libraries, not a claim that every library or component on the internet was tested.

## Prioritized findings and resolution

| Priority | Finding before audit | Applied fix |
| --- | --- | --- |
| Important | Three identical tall scenario cards created weak hierarchy; fixed minimum heights left unnecessary empty space | Featured bank scenario spans the desktop grid; two supporting cards follow. Removed fixed content heights; mobile returns to one column |
| Important | Walkthrough used generic buttons; no tab semantics or tab-panel keyboard model | Origin-derived Radix Tabs provide roving focus, selected state, related panels and keyboard navigation |
| Important | Numerous supporting labels were 8–11px, and reading copy was often 11–13px | Raised key instructional copy to 14–17px, supporting labels to 12px where useful, retained small purely decorative mock labels |
| Important | Hero headline wrapped into four lines on desktop and crowded its column | Reduced display scale to a 72px maximum and refined mobile scale; retained the existing content and illustration |
| Polish | FAQ behavior and styling were bespoke and inconsistent with the upgraded controls | Shared Origin-derived Accordion with semantic heading/trigger, focus handling, single-open behavior and restrained panel motion |
| Polish | Scenario warnings relied on small markers | Clearly labeled warm orange-red badges remain readable alongside icons and explanatory text |

Strengths retained: off-white / forest-green palette, orange-red caution treatment, explicit synthetic-content boundaries, responsive stacking, and no microphone or private-data request.

## Source references

- Aceternity Bento Grid: https://ui.aceternity.com/components/bento-grid
- Aceternity licensing: https://ui.aceternity.com/licence
- Magic UI Bento Grid docs: https://magicui.design/docs/components/bento-grid
- Adapted Magic source: https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/bento-grid.tsx
- Magic license: https://github.com/magicuidesign/magicui/blob/main/LICENSE.md
- Legacy Origin accordion source: https://github.com/cosscom/ui/blob/main/apps/origin/registry/default/ui/accordion.tsx
- Legacy Origin tabs source: https://github.com/cosscom/ui/blob/main/apps/origin/registry/default/ui/tabs.tsx
- Legacy Origin license: https://github.com/cosscom/ui/blob/main/apps/origin/LICENSE.md
- Current coss docs: https://coss.com/ui/docs/components/accordion
- shadcn docs: https://ui.shadcn.com/docs/components/accordion
- Radix keyboard behavior: https://www.radix-ui.com/primitives/docs/components/tabs

## Verification

- npm install for scoped Radix accordion/tabs succeeded; npm audit reported 0 vulnerabilities at installation.
- Root lint, web strict typecheck and web production build passed.
- Browser checks at 1440, 1024, 768, 390 and 320px: no horizontal overflow.
- Walkthrough ArrowRight selects Recognise; End selects Verify; exactly one visible tab panel.
- FAQ ArrowDown moves trigger focus; Enter opens the second answer and closes the first.
- Hero example still reveals its orange-red OTP warning. Scenario next-action disclosures remain native and accessible.
- Desktop bento and mobile hero screenshots visually reviewed; featured-card style precedence was corrected after the first visual check.
- Reduced-motion CSS disables accordion/key control transitions and panel animation. No Lighthouse score or complete WCAG conformance is claimed.

## Run and review

From repository root: npm ci, then npm run dev:web. Open http://localhost:3000. Check hero wrapping, walkthrough keyboard navigation, bento layout at desktop/mobile, scenario advice, and FAQ focus/expansion. No push or deployment performed.
