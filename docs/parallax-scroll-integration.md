# Aceternity Parallax Scroll integration

Source: user-supplied Aceternity Parallax Scroll prompt, 2026-10-26.

## Installed and used

- apps/web/components/ui/parallax-scroll.tsx exports ParallaxScroll.
- Existing ScamScenarios uses it around the three existing BentoCard articles.
- Added motion; reused installed clsx/tailwind-merge and apps/web/lib/utils.ts.

## Differences from the supplied source

1. Relative ../../lib/utils import replaces the unsupported @/ alias. No components.json exists; manual integration was used.
2. children/itemClassName replace the images-only input because the requested content is the existing scenario bento layout. No unrelated Unsplash photo gallery or extra demo section was added. The application retains its CSS Module grid/layout and palette; component defaults use Tailwind utilities with cn.
3. useScroll uses a single typed div target with page-scroll offsets ['start end', 'end start']. The supplied source assigned one ref to two elements and used an internal fixed-height scroller. This adaptation follows normal page scrolling and has no nested scroll region or clipped content.
4. The source's three alternating vertical motion values are retained, but travel is capped at +/-24px instead of +/-200px so the educational cards and their controls stay readable. Motion is tied directly to scroll, without extra spring/easing or autoplay.
5. Cards remain in their original DOM order, rather than splitting images into three column groups. The first wrapper spans both desktop grid columns; mobile retains a single column. Extra desktop row spacing prevents opposite-moving cards from overlapping.
6. Added responsive/reduced-motion handling through useSyncExternalStore plus CSS media rules. The supplied code has no reduced-motion guard despite the prompt mentioning one. Parallax runs only at 1024px+ with a fine, hover-capable pointer and no reduced-motion preference. Smaller screens/touch/reduced motion remain static, including preference changes during the session.
7. A card with keyboard focus is held still by :focus-within; native scenario disclosures remain operable. No scroll interception or wheel/touch listener is added.
8. Replaced useRef<any> with HTMLDivElement and guarded indexed motion values for the project's strict TypeScript options. Added data-parallax-scroll/item attributes for direct verification.

## Verification

- Root lint, web strict typecheck and production build pass after correcting a strict indexed-access MotionStyle mismatch.
- Desktop page scrolling changed the first card Y translation from about -12px to -15px while the second moved from +12px to +15px.
- Container overflow is visible and clientHeight equals scrollHeight: no internal scroll trap.
- Reduced-motion mode reports transform:none for all three cards; keyboard-focused card is also static and Enter opens advice.
- No horizontal overflow at 1440, 1024, 768, 390 and 320px. Cards are static at 768px and below. Browser console: no errors.

Run npm ci then npm run dev:web. Open http://localhost:3000 and scroll through Scam scenarios with a desktop mouse. Verify keyboard advice interaction and the static mobile/reduced-motion view.
