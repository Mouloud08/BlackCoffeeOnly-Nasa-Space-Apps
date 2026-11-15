# Patches to the local copy of Atelier Terrain v3 (to upstream)

Source of the copy: `/home/claude/variants/v1-verdict/ds/` (identical to `export/firebridge/design-system/components/src`).

## components.jsx
1. `BurnCalendar`: new prop `selectMode` (default `false`). When on, a click or Enter **selects** a month instead of toggling a pin: `onPin(key)` always receives the key, Escape no longer clears it, the selected cell keeps the ink `is-pin` outline but no longer shows the permanent "Pinned · Esc to clear" mini tooltip, and the tooltip note reads "Click to select this month" / "Selected month".
2. `BurnCalendar`: new prop `keyInFootAt` (default `1100`, the old hard-coded threshold) so a page can keep the series keys in the foot at any width (FireBridge passes a large value: the annotation row then holds only the 2012 step, never the keys).
3. `Tip`: a cell may carry `noCompare` (string); it replaces the "Too few detections to compare (median: …)" line. Used for reliability-C boxes, where a raw series must not be described as "too few".

4b. `BurnCalendar`, log bar scale: adaptive domain. Lower bound = half the smallest non-zero annual total snapped down to 1-2-5 (min 1), upper bound = 1.12 × the largest; 2–4 labelled ticks (decades if two fit, else 1-2-5 values), spaced at least 24% of the height apart. The old fixed floor of 10 made every bar reach nearly full height in steady zones (La Rioja).
4c. `BurnCalendar`: the Aqua index polyline is not drawn when every Aqua value is zero (empty box).

## describe.js
4. `stepTexts().label`: "rise" only when the value is ≥ 1.05; below that "change" (e.g. "0.8× change, harmonized", La Rioja, Córdoba).

## Page CSS overrides (src/app.css, not DS source)
5. `.at-mono { font-size: max(12px, .92em) }` — the 11 px defect; plus `font-variant-ligatures: none` (DM Mono drew "fi" as a ligature in "firms").
6. `--focus: var(--accent)` and an accent inset ring on `.at-seg-item.is-on`: SPEC §11 reserves the one accent for map selection, active segment and focus rings (DS used ink for both).
7. Chart tick sizes on phones: the step charts and method charts sit in horizontally scrollable wrappers with a 560–600 px minimum width instead of shrinking ticks below 12 px.

## FireBridge final round (items 1–3, 2026 wiring)
8. `scale.js countClass(v, scale, max, steps)`: optional 4th argument, the class breaks (same count as `COUNT_STEPS`); default unchanged.
9. `BurnCalendar`: colours use `data.breaks` when present (zone-adaptive classes computed by the page); `ColorLegend`: new prop `steps` (labels and aria-label follow the breaks).
10. `BurnCalendar`: `data.step.override = { pre, value, label, other, def }` replaces the step figure next to the seam (FireBridge: the correction factor, "raw 2.1× too high", when the trend is uncertain); the Aqua witness is not shown then.
11. `BurnCalendar`: an annual entry may carry `partialNote` (e.g. "to Oct"), printed above a partial-year bar instead of "in progress".
Page CSS: on desktop the first legend label is centred on its boundary like the others (three-character labels such as 100 200 500 would touch).

## Version 3 (map round)
No change to DS source files. Colour-vision check (`tools/cvd.mjs`, Machado 2009 simulation, both themes): the
calendar ramp (`--seq-*`, inferno), `--civ-*` and `--gray-*` pass for deuteranopia, protanopia and tritanopia
(monotonic lightness, adjacent classes ≥ 5.0 L* apart; worst case: light theme, protanopia, seq ramp). The calendar
ramp is therefore kept. The map's sensor-effect layer uses `--gray-1,2,4,5,6,8`; the detections layer uses `--seq-*`.
Page CSS: `.at-btn.at-btn-sm` (28 px button) for the map card.

## Version 3.1
No DS source change. Page tokens `--rec-before` / `--rec-since` / `--rec-hatch` (app.css): light theme `--seq-0` / `--seq-7`,
dark theme `--seq-2` / `--seq-7`; `tools/cvd.mjs` checks the pair (ΔL* ≥ 40 under every simulation, so it also reads in
grayscale). Sensor-effect layer moved from `--gray-*` to `--civ-0,2,3,5,6,8`.
12. Aqua wording: "control" → "consistency check" in the calendar key, step witness, DS sentence strings (round 4, A4).
13. Tip: the harmonized line no longer prints the leave-one-out ratio bracket (it read as a ±1% interval on a month whose error is 12–17%) (round 4, B7).

## Version 5
14. `scale.js`: `Intl.NumberFormat` instances are cached per locale and digit count (`nf()`); output unchanged (audit F02).
15. `BurnCalendar`: the internal compact threshold is `width < 560` (was 640): the V5 rail gives the calendar 600–640 px.
Page tokens (src/v5.css, not DS files): `--rec-before/--rec-since` now cividis ends (light `--civ-1`/`--civ-7`, dark
`--civ-6`/`#4f6ab3`, the one non-DS value: a lighter cividis blue readable on the dark land); status trio
`--st-success|warning|neutral-bg|ink|edge`, light and dark. `tools/cvd.mjs` checks both (record pair ΔL* ≥ 25 under every
simulation; status ink on tint ≥ 4.5:1).

## Version 5.1
No DS source change beyond V5 items 14–15. Page CSS overrides DS motion: `.at-bar` transitions transform only (200 ms;
none under reduced motion), calendar gutter colour 120 ms; the count legend shows every other label. Detections layer
uses page tokens `--det-0..8` (ink mixed into the land colour), not the calendar's `--seq-*`.
16. `BurnCalendar`: new prop `tip` (default true); FireBridge passes false on desktop and uses its readout line.
17. `BurnCalendar` year axis: a regular tick label within one label width of the active year is hidden (was 1 column).

## Version 5.2
No DS source change. Page token `--rec-before` (light) is #94802f (3.17:1 against the light land; cividis-family sand, darker); `tools/cvd.mjs` passes.

## Version 6
No DS source change. Page overrides in src/v5.css: light `--seq-0` #f3d09f and `--seq-1` #ee9c5c (the lowest calendar
classes were the most saturated colours in light; monotonic lightness kept, `tools/cvd.mjs` passes). The Aqua legend
swatch is the DS `.at-aqua-swatch` widened by a page class.
