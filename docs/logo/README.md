# FireBridge logo concepts

`preview.png` shows every concept, plus the current mark, at 16 · 24 · 48 · 128 px, then as a lockup at top-bar size and at a large size, on the
app's light and dark grounds. `topbar-a.png`, `topbar-b.png` and `topbar-c.png` are real crops of the app's top bar
(`dist/firebridge.html#tab=dash&z=canada&anim=0`, 1440×900, light theme) with the concept's SVG swapped into the DOM.
`topbar-current.png` shows the current top bar for comparison. To rebuild: `node docs/logo/render.mjs` from the project root (it writes
`preview.html`, `preview.png` and the crops here, and only reads `dist/firebridge.html`).

All marks use `viewBox="0 0 24 24"` and `currentColor`, contain no text and no gradients, and stay on the pixel grid at 24 px (2-unit strokes on
whole coordinates where possible). The wordmark stays typographic: "FireBridge" in Atelier Texte 600, as the app already sets it (`.product-name`).

## A · Flame rising from bridge arch (`concept-a.svg`)
A single solid flame, with a leaning tip and a side tongue, stands on two legs. The arch between the legs is cut out of the shape, so the flame
grows out of a bridge, and the two legs (two records) join into one fire above it. Trade-off: it carries "fire + bridge + two become one" in one
silhouette and is the strongest at 16 px, but the MODIS/VIIRS story is only implied: both legs look the same.

## B · Hollow and solid, one flame (`concept-b.svg`)
One flame split on a seam: the left half is an outline (MODIS, before 2012) and the right half is solid (VIIRS), using the app's own rule that
sensors differ by shape (hollow vs filled). Trade-off: it tells the sensor story most literally, but the hollow half is a 1.3 px line at 16 px,
and a half-filled teardrop shape is close to common "contrast / invert colours" icons.

## C · Two piers carry one deck (`concept-c.svg`)
A level deck rests on two piers of the same height, one hollow (MODIS) and one solid (VIIRS): two records brought to one level, drawn like the
app's bars and cells. Trade-off: it is the crispest and most sober of the three, but it says nothing about fire, and on its own it can read as
a "Π", a table or a layout icon.

## Recommendation: A
A is the only concept that reads as fire and as a bridge at a glance, and it is a single closed path of about a dozen segments with no strokes, so it stays sharp at
16 px, in one colour, on light and dark. It also holds up where the app shows the mark without the wordmark: from 760 to 1023 px wide the
wordmark is hidden. Keep it in `currentColor` (ink) and do not add the blue accent: the app keeps the accent for selection, the active
segment and focus. If an accent is wanted outside the app (video end card, slides), use a warm token from the calendar ramp, for example
`--sensor-viirs` (`#d55e00` light), on the whole flame, never on part of it.

## Integration notes (where the current mark lives)
The current mark is in `current.svg` (two bars under an arc). Replace it in these places. Line numbers are from the tree at the time of writing.

1. **Top bar: `src/App.jsx` lines 76–84**, `function Mark()`. Replace the body with the chosen SVG and keep `className="fb-mark"` and
   `aria-hidden="true"`. For A:
   ```jsx
   function Mark() {
     return (
       <svg className="fb-mark" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
         <path d="M14 1.5C16.5 5 20 8.5 20 14v7h-4.5v-3a3.5 3.5 0 0 0-7 0v3H4v-7c0-3 1.2-5.5 3.5-7.5.5 1.5 1.3 2.6 2.5 3C10 6.5 12 4.5 14 1.5Z" />
       </svg>
     );
   }
   ```
   It is used once, at line 495 (`<BrandTag className="fb-brand"><Mark />…`). Nothing else needs to change there.
2. **Mark styles: `src/app.css` lines 23–26.** Keep line 23 (`.fb-mark { width: 24px; height: 24px; flex: none; }`). Lines 24–26
   (`.m-modis`, `.m-viirs`, `.m-bridge`) style the old shapes only: delete them, or reuse them if you pick B or C (B: the hollow path
   `fill:none; stroke:currentColor; stroke-width:2`, the solid half `fill:currentColor`; C: the same for the hollow pier).
   Related, unchanged: `src/v5.css` line 32 (brand gap `--sp-2`), lines 426, 627 and 882 (the wordmark is hidden at narrow widths, so the mark
   stands alone), line 568 (on a phone the whole brand is visually hidden).
3. **Boot shell: `build.mjs` line 64.** The static first paint has the wordmark but no mark: `<div class="fb-brand"><span class="product-name">FireBridge</span></div>`.
   When React mounts, the wordmark moves right by 24 px plus the gap. Put the same `<svg class="fb-mark" …>` before the `<span>` so the
   first paint and the app match.
4. **Favicon: `build.mjs`, after line 57 (`<title>`).** There is no favicon today. The CSP (`img-src data: blob:`, line 56) allows an inline
   `data:` SVG. A favicon cannot use `currentColor`, so give it the ink colour and a dark-mode colour:
   ```js
   // near the top of build.mjs
   const markPath = fs.readFileSync(here + '/docs/logo/concept-a.svg', 'utf8').match(/ d="([^"]+)"/)[1];
   const favicon = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>path{fill:#181c21}@media (prefers-color-scheme:dark){path{fill:#e9ecef}}</style><path d="${markPath}"/></svg>`);
   ```
   ```html
   <link rel="icon" type="image/svg+xml" href="${favicon}">
   ```
   (`#181c21` and `#e9ecef` are close to `--ink` light and dark. For B or C, which have more than one shape, copy the whole SVG and change
   `currentColor` the same way.)
5. **Video end card: `video/src/Demo.jsx` lines 81–89**, `function Mark({ size })`, used at line 102 (`<Mark size={104} />` next to the 124 px
   title). Replace the three shapes with the new ones, using explicit attributes (`fill="currentColor"`), because the `src/app.css` rules do not
   apply there.
6. **Slides: `video/slides.mjs` line 83**, `const mark = '<svg … width="64" height="64">…'`. Same replacement (one-line string).
7. **README header: `README.md` line 1** (`# FireBridge`, no mark today). GitHub renders an `<img>` SVG without the page colour, so
   `currentColor` falls back to black and disappears in dark mode. Either leave the header as text, or add two fixed-colour copies (for example
   `docs/logo/mark-light.svg` with `#181c21` and `docs/logo/mark-dark.svg` with `#e9ecef`) and:
   ```html
   <h1><picture><source media="(prefers-color-scheme: dark)" srcset="docs/logo/mark-dark.svg"><img src="docs/logo/mark-light.svg" width="28" height="28" alt=""></picture> FireBridge</h1>
   ```
8. **Built files:** `dist/firebridge.html` and `dist/firebridge-2025-backup.html` contain the old mark because they are build outputs. Run
   `node build.mjs` (or the Windows build) after the source change. Do not edit them by hand.

## Files
- `concept-a.svg`, `concept-b.svg`, `concept-c.svg`: the marks, `currentColor`.
- `current.svg`: the existing mark, extracted from `src/App.jsx` and `src/app.css`.
- `preview.html`, `preview.png`: the comparison sheet (1600×1200).
- `topbar-a.png`, `topbar-b.png`, `topbar-c.png`, `topbar-current.png`: 700×80 crops of the real top bar.
- `render.mjs`: rebuilds the sheet and the crops (puppeteer-core plus the local Chrome; no network).
