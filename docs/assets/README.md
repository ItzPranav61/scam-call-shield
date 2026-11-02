# README capture assets

Capture the real app in live mode, with the **LIVE** badge visible. Use synthetic
scripts only, including for the benign/genuine-call take. No real names, phone or
account numbers, financial identifiers, notifications or personal tabs may appear.
Do not use mock-mode captures, stand-ins or fabricated UI. Do not alter risk labels.

| File | Required content | Limits |
| --- | --- | --- |
| `demo.gif` | Real app progressing SAFE → CAUTION → DANGER, with explanation visible | 10–12 seconds; under 10 MB; at most 960px wide |
| `shot-danger.png` | DANGER state with the explanation visible | At most 2 MB |
| `shot-safe.png` | SAFE state on a synthetic benign/genuine-call script | At most 2 MB |
| `shot-live-health.png` | LIVE badge plus `/health` showing `mode: live`, cropped to the relevant area | At most 2 MB |

The GIF is silent. The separately hosted demo video should include system audio
for the spoken warning. Provide its URL when the captures are ready.

Keep raw MP4/MOV/MKV takes in the top-level `takes/` folder or locally under this
folder. They are gitignored and must not be committed. Share only the reviewed
GIF/PNG captures and a video URL; never include credentials or configuration screens.

Run `npm run check:readme-assets` from the repository root. It checks active README
image paths, non-empty alt text, GIF/PNG file sizes and GIF width. It also checks
GIF/PNG files present here before they are embedded. Commented embeds are ignored;
external image URLs are never fetched. Limits use decimal MB: GIF 10,000,000 bytes,
PNG 2,000,000 bytes. LIVE provenance, content, progression and GIF duration need
human review; the checker cannot establish those facts.

Run the checker tests separately with `node --test tests/check-readme-assets.test.mjs`.
Neither the checker nor its tests are added to CI in this phase.

Leave the README embeds commented in Phase 1. Once all files and the video URL
are supplied, ask for Phase 2 to enable only the available captures. Do not use a
placeholder image to make the check pass.
