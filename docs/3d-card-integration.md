# Aceternity 3D Card integration

Source: user-supplied `Pasted text.txt`, 2026-10-26, Aceternity UI 3D Card component prompt.

## Integration

- Component: apps/web/components/ui/3d-card.tsx
- Utility: apps/web/lib/utils.ts (clsx + tailwind-merge)
- Consumer: apps/web/components/hero.tsx
- Existing layout styles: apps/web/components/hero.module.css
- The public exports CardContainer, CardBody, CardItem and useMouseEnter are retained.
- CardContainer encloses the existing hero scene. CardBody keeps its responsive dimensions. Phone lifts 35px, familiar-name note 85px, OTP note 100px, pause note 65px. All share the cursor tilt with their own depth.

## Every intentional difference from the supplied source

1. Rewrote @/lib/utils to ../../lib/utils to match this project's relative imports. Added the specified clsx/tailwind-merge helper and dependencies; no components.json exists, so manual integration was used.
2. Preserved the supplied Tailwind base utilities and added motion-reduce:transition-none. The hero overrides py-20 and fixed h-96/w-96 through the component's supported class props so the existing layout is retained.
3. Used the actual hero content instead of adding the unrelated forest-image demo, signup and Twitter links. There is no additional demo section/file. Existing off-white/green palette and orange-red warning behavior remain.
4. Changed the existing static CSS transform:rotate(...) on the phone/notes to the independent rotate property. Otherwise CardItem's inline depth transform would erase their original angle. Orbit and unrelated transforms are unchanged.
5. Replaced the source's open-ended any props with typed polymorphic native element props; explicitly accept optional undefined className values for the project's strict exactOptionalPropertyTypes/noUncheckedIndexedAccess configuration.
6. Inlined the CardItem effect's animation update and included all transform inputs in its dependency list, avoiding the source's stale closure/dependency warning. Removed unused mouse-event arguments.
7. Guarded mouse tilt/depth using hover/fine-pointer and reduced-motion media queries. Preference changes reset the scene and depth, with cleaned-up change listeners. Touch taps do not activate movement.
8. Clamped rotation to +/-8 degrees and inverted the vertical rotation for natural cursor response. Captured untransformed bounds on mouse enter rather than reading a moving transformed rectangle every mousemove, preventing feedback/jitter.
9. Added data-card-tilt on the rotating element for direct behavior verification. Improved the context error message to name CardContainer.

## Verification

- Root lint, web typecheck and web production build pass. Initial optional-prop strict type mismatch was fixed before the final successful build.
- Fine-pointer mouse movement produces nonzero X/Y rotation and phone translateZ(35px); static phone rotate(4deg) is retained.
- Mouse leave resets both container rotation axes to zero.
- Emulated reduced motion keeps rotation/depth zero, including changing the preference after interaction.
- Separate mobile/touch context reports coarse pointer and keeps tilt/depth inactive after tapping.
- No horizontal overflow at 1440, 768, 390 and 320px. Existing hero demo/reset control remains functional.

Run npm ci then npm run dev:web. At http://localhost:3000, move the mouse around the hero's right-hand illustration, then move away; verify the demo CTA and mobile layout as well.
