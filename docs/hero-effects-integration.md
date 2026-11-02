# Hero text, shine and dot effects

Implemented 2026-10-26. Existing off-white/forest-green palette and warm warning colors are retained. No new sections or dependencies.

## Sources and adaptations

- Magic UI Text Animate: https://magicui.design/docs/components/text-animate . Adapted only the staggered blurInUp treatment into a small CSS-driven TextAnimate, with seven words delayed by 70ms each, 650ms ease-out reveal, a single accessible heading name and readable server-rendered text. Does not import the library's unrelated presets or replay on viewport entry.
- Magic UI Shine Border: https://magicui.design/docs/components/shine-border . Retains the source radial-gradient, 300% background size and composite mask technique. Uses an aria-hidden span valid inside a button, existing green/off-white colors, and a finite four-second pass rather than an infinite animation.
- Magic UI Dot Pattern: https://magicui.design/docs/components/dot-pattern . Uses a scalable SVG pattern with useId rather than generated per-dot Motion circles, random glow delays or resize listeners. Static 24px spacing, .8px radius, low-opacity forest-green fill and radial fade.
- Full MIT notice retained in docs/licenses/magic-ui-MIT.txt. Relative utility imports follow the existing workspace conventions.

## Files

- apps/web/components/ui/text-animate.tsx
- apps/web/components/ui/shine-border.tsx
- apps/web/components/ui/dot-pattern.tsx
- apps/web/components/ui/hero-effects.module.css
- Integration: apps/web/components/hero.tsx and hero.module.css

## Verification

Root lint, web strict typecheck, web production build and git diff --check passed. Browser confirmed seven staggered words (0–420ms), one four-second shine pass, one SVG pattern, and working demo warning interaction. Reduced-motion media reports animation:none and opacity:1 for text, animation:none for shine. No horizontal overflow at 1440, 768, 390 and 320px. Desktop screenshot reviewed. Existing tilt and parallax code is unchanged.

Run npm run dev:web, open http://localhost:3000 and reload to see the entrance. Check the CTA, mobile wrapping and reduced-motion preference.
