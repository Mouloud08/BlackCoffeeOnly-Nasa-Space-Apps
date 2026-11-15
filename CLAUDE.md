# CLAUDE.md — FireBridge, version 5 (application shell)

## 0.5 Data hand-off, 15 November 2026 (read with §7 and §9; details in NOTES_FOR_UI.md and README.md)
- Real 2026 data are in: `data/2026/canada.json`, `data/2026/argentina.json` (FIRMS area API, fetched 15 Nov 2026,
  MODIS + VIIRS S-NPP + NOAA-20). The record ends **October 2026**; last complete year 2025; the 2003–2025 table of §5
  is unchanged. Months continued on NOAA-20: Canada 2026-03, 2026-07; Argentina 2026-04, 2026-07. Provisional
  (near-real-time): VIIRS August–October, MODIS September–October. Raw files: `data/raw/2026/` (git-ignored).
- Real hotspot files: `data/hotspots/quebec-boreal-2023-06.csv` (whole month) and `la-rioja-2024-08.csv`, built with
  `scripts/assemble_hotspots.mjs`. They are offered in the Download menu and in the ⋯ menu.
- `dist/firebridge.html` = 6.2 source + these data + the changes of 15 November listed in NOTES_FOR_UI.md items 1, 14
  and 15 (calendar geometry with a partial last year; calendar-first layout 1 : 2; light theme by default; first-visit
  guide only with `guide=1`; plain-language wording; hotspot files in Download). Vocabulary now on screen: tab
  "Calendar" (hash still `tab=dash`), "Glossary", "Enter coordinates…", layer "One month", "Correction A · reliable",
  "Still up / Still down / Reverses / Without YEAR", "correction factor", "typical month (median …)".
  `dist/firebridge-2025-backup.html` = the original 6.2 build.
- Published: repository https://github.com/Mouloud08/BlackCoffeeOnly-Nasa-Space-Apps (branch `main`); the app is
  served from branch `gh-pages` (`index.html` = `dist/firebridge.html`, plus `demo.mp4` and `slides.pdf`) at
  https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/ . Submission texts: `docs/PROJECT_PAGE.md`,
  `docs/VIDEO_SCRIPT.md`. Video: `video/` (Remotion; `node video/render.mjs <html>` re-captures and re-renders).
- Rule from the owner: `src/`, `tools/`, `build.mjs`, `ds/`, `vendor/` belong to the interface team (a 6.2.1 will
  replace them). Interface or text bugs go to `NOTES_FOR_UI.md`, not into the code. Keep `data/` and rebuild.
- Toolchain that reproduces the original build byte for byte: esbuild 0.28.2, @fontsource-variable/radio-canada 5.3.0,
  React 18.3.1 (pinned in `package.json`). On Windows: `node scripts/winport.mjs` generates `tools-win/` and
  `build-win.mjs`; use those instead of `tools/` and `build.mjs`.
- The fetch script loses the standard-product days of the window that straddles the standard / near-real-time
  boundary: check with `scripts/check_raw_2026.mjs` and fetch them under another `--name` (README, "Updating 2026").
- `tools/selfcheck.out.txt` and `tools/copycheck.out.txt` are the December-2025 references (the second was already
  out of date). `tools/coherence.mjs` reports 1 violation in both the original and the 2026 build (same seed and step).

## 0.1 Version 5.1 (audit `/home/claude/audit-v5/AUDIT.md` closed; read with §0)
- No document-wide View Transitions any more (they captured the page and swallowed clicks). Motion is local: map canvas
  cross-fade (ghost canvas, 200 ms) on layer/series change, calendar fade on flip, tab and step content fade-in, number fade.
- Map click: movement under 6 px (10 px touch) or a press under 250 ms with < 16 px slip is a click.
- Verdict strip has a FIXED height (6.5rem; columns 16rem · 1fr · auto), texts clamped. Vocabulary: "Harmonized"
  everywhere ("Quality A · reliable", "Not harmonized"); "Holds/Flips without YEAR" replaces "Trend robust". Raw view
  swaps the hero to the raw figure ("raw view") with a filled "Harmonized x" pill.
- Map frame = data extent (eligible places +1°), centred, 6 % padding; a box takes ~22 % of the short side; a box with
  no data keeps the country view. Argentina gets a narrower map column (`.fb-dashb.is-argentina`).
- Calendar header is one row (month chip slot; range button "2001 – Dec 2025"); bars 16 %, cells ≤ 1.15 × width, a
  one-line month readout under the grid; under 30 cell-days → a compact empty block, not a grid.
- Charts in `src/Strips.jsx` (HTML, type-scale text): ErrorStrip (Evidence panel 2, shown once), RatioStrip (How 2,
  Method), RecordMini (How 4: raw vs harmonized record-year maps).
- Presets' zones precompute in idle slices after both countries decode. Tools: `tools/cls.mjs` (layout shift per
  interaction), `tools/mapshare.mjs` (data share of the map view).

## 0.4 Version 6
- Overview tab (src/Overview.jsx; default for a bare URL). Headline rules in copy.js (overviewHeadline, changeVerb).
- Small-box guard (src/guard.js, page layer): a zone with a harmonized mean before 2012 < 50 cell-days a year, or a 90%
  year-resampling range wider than ×10, is shown as "uncertain": no rise printed, the sensor factor + the reason.
  Applied by wrapping every zone in `zoneOf` (App.jsx), so strip, cards, ladder, Evidence, How and Method all follow.

- v6.2 guard additions (src/guard.js): G4 zone ratio > 4× → not harmonized; G5 Aqua-only and harmonized rises on opposite sides of 1× → no rise printed; G6 monthly check missing, < 6 months or median error > 50 % → trend uncertain (no success chip). G1 < 50 cell-days/yr before 2012, G2 90% range > ×10, G3 no detections before 2012.
- v6 details (Overview tab, guard, judge C1–C5, B1–B5): see OVERVIEW.md; state rules in COHERENCE.md.
- Tab keys 1–5 (1 = Overview). Default phone/tablet panel = Calendar (`panel=map` in the hash for the map).

## 0.3 Version 5.2: layout and the state model
- The strip is the layout at every width ≥ 1280 (the rail code is unreachable: `rail = false` in App.jsx). At ≥ 1680 the
  strip has a fourth zone (the four-measure ladder + range line) and a fixed 8rem height; below, 6.5rem.
  `tools/stripfit.mjs` replaces railfit. Map | calendar 5 : 7 under 1440, 5.6 : 6.4 at 1440, 1 : 1 from 1680.
- Calendar header (`.fb-calhead`): controls never shrink; the month chip goes long → short ("Aug 2019") → second row.
  `tools/calhead.mjs` checks 320–1200 px panel widths.
- `window.__fb` is a read-only state snapshot used by `tools/coherence.mjs` (scripted pairs + seeded random walk).

### State model (who changes it · what reacts · what resets it)
| State | Changed by | Must react | Reset / cleared by |
|---|---|---|---|
| zone (preset / custom box / drawn area) + country | zone popover, map click, draw, move/resize, undo, chip ×, Nearest data, Try a larger box, hash/Back | verdict strip, zone button, map selection + chip, calendar (cells, breaks, seam ratio, readout), map sentence, Evidence, How, hash | chip × (whole country); country change drops a custom box and a pending undo |
| view Raw / Harmonized (+ peek) | switch, R/H keys, hold Raw / hold R | hero emphasis, calendar cells and bars, readout wording, map colours and counters, tooltip, checks label, Evidence | release of peek, window blur, pointer cancel |
| map layer | layer control | legend, sentence, tooltip, hover outline, ghost cross-fade | — (persists across tabs) |
| selected month (`mPicked`) | calendar click, Evidence month strip, This-month layer (record month if none chosen) | chip, readout, This-month layer, Evidence month panel, hash m= | chip ×, Esc, clicking the same cell, a date range that excludes it |
| default month | the zone (latest comparable month) | readout, Evidence | follows the zone while no month is chosen |
| calendar mode Counts / Anomaly | segment, A key | cells, legend wording, readout (leads with the anomaly, no cell-days) | Raw view disables Anomaly |
| date range | range popover | calendar years, ranks, readout | Reset; clears a chosen month outside it |
| hover (place, month, year) | pointer | map outline + tooltip, calendar column (Record years layer only), map year highlight, readout | pointer leave, tab change, unmount |
| draw mode | Draw area button, Shift+drag | cursor, hint line, button pressed | Esc, drawing done, layer change, country change, any popover opening, tab change |
| zoom / pan | wheel, drag, double-click, +/−, Fit, Zoom to it, preset | map only | Fit; never changed by a click on the map |
| tab, step, theme | tabs / keys 1–4, stepper, ⋯ menu | tab content; theme repaints everything | — |
| hash / history | every state change (push per step, bursts < 600 ms replace) | Back / Forward / reload restore the same screen | — |

## 0.2 Version 5.1 additions (user requests A–C)
- Rail never scrolls: flex column; `useFit` in Verdict.jsx drops blocks by priority (data-drop 1 ladder, 2 coordinates,
  3 sentence). `tools/railfit.mjs` checks 1700/1920/2560 × 600–1500 px × 2 themes × 5 states. Rail needs h ≥ 1000.
- Calendar: no floating tooltip on desktop (DS prop `tip`); a readout line under the grid (hover/focus → selected →
  latest) with a crosshair; seam hairline labelled "MODIS × r | VIIRS"; seasonal "typical" margin on the right only
  when cells stay ≥ 24 px wide; cells up to 1.6 × width, then bars up to 20 %, then the block is centred.
- Map interaction: click a place = 2° box, the view does not move (preset/Zoom-to-it/Fit move it); no-data click =
  footer message, zone unchanged; drag pans, wheel/double-click zoom; Draw area button (Esc cancels; Shift+drag);
  move/resize the selection by its body/edges/corners (snapped 0.5°, applied on release); selection chip with
  "Zoom to it" and ×; footer hint line; "Back to …" undo for 8 s and Ctrl/Cmd+Z. Tooltip clamped inside the view.

## 0. Version 5 — read this first (supersedes the layout notes in §2)
- Work tree: `/home/claude/v5` (a copy of version 4). `/home/claude/final` is version 4, the team's fallback: never
  write there. Output: `dist/firebridge.html`. Spec: `SPEC_V5.md` (wins over the audit `/home/claude/audit-v4/AUDIT.md`).
- `src/metrics.js` is unchanged (sha256 779e3785…); `bash tools/scdiff.sh` must print "SELF-CHECK IDENTICAL TO V4".
- Shell (`src/App.jsx`, `src/v5.css`): 100dvh, top bar (wordmark h1 · tabs Dashboard / Evidence / How it works /
  Method · zone popover · the ONE Raw/Harmonized switch · ⋯ menu with exports, copy link, theme, About, the data line
  and the "hold R" tip). Only the visible tab is rendered. Phone (< 760): bottom tab bar in a `<nav>`.
  Layout classes: phone < 760; tablet 760–1279 (verdict card + Map | Calendar switch); strip 1280+; rail w ≥ 1680
  AND h ≥ 1000 (verdict as a left column).
- Verdict (`src/Verdict.jsx`): three zones with eyebrows — Zone (name, coordinates, bridge-quality status pill with
  popover), Answer (question + hero number + hollow "Raw x" → filled "Bridged y" pills, or "÷ factor" + "Raw reads …
  too high" + warning "Trend uncertain"), Checks (≤ 3 generated status pills + "See the evidence" button). Status
  tokens `--st-{success,warning,neutral}-{bg,ink,edge}` in v5.css (the DS has none); AA checked by tools/cvd.mjs.
- Map (`src/MapPanel.jsx`): view {cx, cy, sc}; CSS transform during gestures/fly, crisp redraw on settle; drag pans,
  wheel/pinch zoom, click = 2° box, Shift+drag or Draw draws, arrows nudge, Shift+arrows resize, +/−/0. Record colours
  `--rec-before/--rec-since` are cividis ends (not the calendar ramp). One sentence + (i).
- Calendar (`src/CalPanel.jsx`): cell height from the panel (cap 1.25 × width; spare height to the bars, up to 34 %).
- Linked: calendar hover → map lights that year's record places + count chip; map hover → calendar column outline;
  calendar click → month chip (×), This-month layer and Evidence follow.
- Zone-dependent work runs on `useDeferredValue` copies of country/box (input paints first, numbers follow).
  Cell statistics are computed after the first paint (`warm`), the second country is decoded after that.
- CSS is written in px/rem and passed through `tools/cssscale.mjs` at build (font sizes → 7-step scale, spacing →
  scale, other px → rem). Watch for class collisions with the old app.css (`.fb-dash`, `.fb-how` were renamed).


Project memory for whoever continues. Read it first; keep it accurate. It replaces the memory in
`/home/claude/export/firebridge/CLAUDE.md`, whose headline numbers and "what is missing" list are out of date
(e.g. its boreal leave-one-out error of 26 % comes from an older method; the current self-check gives 16 %).

## 1. Challenge and deadline
- NASA Space Apps Challenge 2026, challenge "Harmonization of MODIS and VIIRS Hot Spots" (author: CONAE, Córdoba,
  Argentina). Statement: harmonize MODIS (2000+) and VIIRS (2012+) so the sensor no longer matters; a harmonized
  burning calendar (months × years); region by map or coordinates; date range; downloads incl. hotspot CSV;
  accessible ramps; current month vs historical median. Only listed resource: NASA FIRMS.
- Team BlackCoffeeOnly (two people), Sherbrooke local event. Submission closes **Sun Nov 15 2026 23:59 America/Toronto**.
  Demo = 30-second video or ≤ 7 slides, English. AI use must be declared (footer line does it).
- Public name: qualify as "FireBridge Québec" if needed (another team uses "FireBridge").

## 2. The app (one offline file)
- Output: `dist/firebridge.html` (~5.6 MB), one self-contained HTML, CSP `connect-src 'none'`, no network at all.
  React 18 + esbuild IIFE; fonts, tiles, Natural Earth outlines, official area-burned table inlined by `build.mjs`.
- First screen (≥ 1180 px wide, fits 1280×800 and 1366×768 without scroll; version 3.1): the **verdict** as a
  full-width band (zone + pill | big number + clause | sentence, "Without <year>", "See the proof ↓"), then the
  **map card** (5/12, full height: country switch, shared Raw/Harmonized switch, Presets menu with "Type a box…",
  layers Record years · Sensor effect · This month · Detections, live flip line, tools, legend, counter) next to the
  **calendar card** (7/12, tight mode: 14 px cells, 56 px bars; its seam annotation and quiet export buttons are
  hidden there because the band and the top-bar Export menu carry them). Second row: proof card + month row.
- Record years layer: before 2012 = light warm tone (`--rec-before`), since 2012 = strong tone (`--rec-since`), both
  from the calendar ramp; hatch = depends on the ratio (or a 1° tie). Below ~5 px per 0.5° place the map draws 1°
  blocks (majority era); counters always use 0.5° places. Flipping Raw ↔ Harmonized outlines the places that change
  for 450 ms (not with reduced motion) and the flip line states the count (Canada 228, Argentina 236; 0 the other way).
- ONE Raw/Harmonized state: the map switch, the calendar control and keys R/H drive it (Anomaly = harmonized on the
  map). First load: map, calendar and number go raw → harmonized together once.
- State in the URL hash: `z` preset, `c` country, `b` box, `v` view, `m` month, `l` map layer, `f`/`t` date range,
  `ex` story example, `h` hotspot panel. Old links with `p=1` still open (the map is always shown now).
- Below 1180 px the first screen stacks (map card, verdict strip, calendar); phone: map ≈ 55 vh first.

## 3. Where everything is
- `SPEC.md`, `SPEC_V2.md`, `SPEC_V3.md`: binding specs (later wins). `PATCHES.md`: changes to the local copy of the
  Atelier Terrain design system (`ds/`). `review/`: the jury's material (reference).
- `src/metrics.js` — the ONE metrics module (pure, no DOM): record end (`setRecordEnd`), decode, box sums, bridge,
  grade, trend robustness, calendar data, adaptive colour classes, month readings, **cell statistics for the map**
  (`cellStats`, `cellSummary`, `monthLayer`, `ratioPercentiles`, `floorShare`).
- `src/copy.js` every generated sentence; `src/MapCard.jsx` map card; `src/Verdict.jsx` verdict strip, proof card,
  bars; `src/Calendar.jsx`; `src/MonthRow.jsx`; `src/Story.jsx`; `src/Method.jsx`; `src/exports.js` (series CSV,
  calendar SVG/PNG, map CSV, hotspot request); `src/Picker.jsx` (only `BoxFields` is still used); `src/places.js`.
- `data/canada.json`, `data/argentina.json` (0.5° monthly tiles 2001–2025: modis, aqua, snpp, n20);
  `data/official/canada_area_burned.json`; `data/2026/` (empty unless 2026 is fetched); `data/hotspots/` (optional).
- `tools/` — checks and helpers, documented in `tools/README.md`.

## 4. Build and check
```sh
node build.mjs                    # → dist/firebridge.html (FB_OUT=… to write elsewhere)
node tools/selfcheck.mjs          # metrics table + map counters (saved: tools/selfcheck.out.txt)
node tools/copycheck.mjs          # every generated sentence (tools/copycheck.out.txt)
node tools/measure.mjs            # first screen at 1280×800 and 1366×768, 6 zones, incl. content spill
node tools/interact.mjs           # draw/click/zoom/pan/layers/shared switch/presets/type a box/exports/link
node tools/axe.mjs                # 0 violations expected, light+dark, 1280+390, every map layer
node tools/theme.mjs              # theme toggle at 1280/390/320
node tools/cvd.mjs                # colour-vision check of the ramps and the record-years tone pair, both themes
node tools/flash.mjs              # the flip outline appears and clears
node tools/test_2026_tiles.mjs && node tools/test_places.mjs
node tools/shoot.mjs '[{"hash":"z=canada","name":"x"}]'   # screenshots → shots/
```
Any check can target another file: `FB_HTML=/path/file.html node tools/<check>.mjs`.
Chrome: `/usr/bin/google-chrome`; `node_modules` → `/home/claude/build/node_modules`.

## 5. Validated numbers (tools/selfcheck.out.txt, record to December 2025; round 4: January 2012 is a MODIS month)
| zone | ratio | raw | harmonized | trend | grade |
|---|---|---|---|---|---|
| All of Canada | 2.10 | 4.23× | 2.01× (1.62× without 2023; 90% 1.30–2.92) | robust | A |
| All of Argentina | 2.13 | 1.45× | 0.68× | robust | A |
| Boreal Québec | 2.12 | 3.45× | 1.63× (0.67× without 2023) | uncertain | A |
| La Rioja | 2.33 | 1.78× | 0.77× | uncertain | A |
| Córdoba | 1.95 | 1.08× | 0.55× | robust | A |
| Chilecito | 2.44 borrowed | 2.89× | 1.19× | uncertain | B |
Official area burned (Canada, NFD), 2012–2024 ÷ 2003–2011: 1.92×; ours harmonized on the same years 1.88×.
Map (0.5° places, 2003–2025, ≥ 200 harmonized cell-days, local ratio ≤ 4×): Canada 1,947 places (62 above 4× not
bridged), record since 2012 raw 84.1%, harmonized 73.7%, MODIS alone 73.5%; chance ranges (2,000 seeded
permutations of the year labels, same for every place) 42.7–76.3% / 44.7–74.5% / 44.6–74.4% → raw above, harmonized
and MODIS alone inside. Argentina 713 places (27 not bridged): raw 70.0%, harmonized 38.7%, MODIS alone 41.5%;
chance 42.2–76.7% / 41.9–78.7% / 42.8–78.0% → raw inside, harmonized and MODIS alone below.
Harmonizing moves 203 (Canada) / 223 (Argentina) places to "before 2012"; 0 the other way.
The ratio by month (Canada): Jan 2.69, Feb 3.74, Mar 4.10 … May 1.73, Jul 2.13 against 2.10 pooled — disclosed, not
corrected. 4.1% / 5.5% of VIIRS cell-days fall in place-months where MODIS saw nothing.

## 6. Solid vs uncertain
- Solid: the correction factor (VIIRS ≈ 2.1× MODIS at country scale, tight leave-one-out ranges); Canada's
  harmonized rise ≈ 2× agrees with official area burned (1.9× vs 1.9× on the same years); Argentina's apparent rise
  is a sensor effect (raw 1.4×, harmonized 0.7×).
- Disclosed limits: a single annual ratio leaves a seasonal residual (winter months in Canada off by up to 1.9×);
  places with a local ratio above 4× are not bridged (possible non-fire heat sources, not verified); January 2012 is
  computed from MODIS (S-NPP starts 20 Jan 2012).
- Uncertain: trends in small zones (Boreal Québec, La Rioja, Chilecito: one or two extreme years decide them);
  per-place records (a record is one year, not a trend; neighbouring places are not independent); grade thresholds
  are heuristics calibrated on Québec; high local ratios (> 4×) in a few areas, causes not investigated.

## 7. 2026 procedure (nothing in the app calls the network)
See `tools/README.md`: fetch both countries with `/home/claude/export/firebridge/scripts/fetch_firms_2026.mjs`
(key only via `FIRMS_MAP_KEY`), convert with `tools/build_2026_tiles.mjs` (drops detections inside neighbouring
countries), `node build.mjs`. The record then ends at the last complete month common to both countries; a partial
year is shown but not in annual statistics; months without S-NPP use NOAA-20 ÷ the box factor (labelled computed);
NRT months are labelled provisional. Simulation used to test it: `.scratch/sim2026.mjs` (not shipped). Afterwards
delete BOTH the synthetic `data/2026/*.json` and `dist/firebridge-sim2026.html`, rebuild, and confirm the normal
build ends in December 2025. Screenshots/video: add `anim=0` to the hash (charts in their final state).

## 8. Honesty rules (binding)
Never make a figure look better than it is; every number on screen comes from `src/metrics.js` and is covered by
the self-check; never tune a threshold for a nicer picture; provenance under every figure (Real / Computed); the
median is always named ("a typical June"); MODIS-only equals harmonized by construction — never call it a
validation; "uncertain" trends show the correction factor, not a rise; no causes guessed for high ratios.
Design system: sensors by shape (MODIS hollow, VIIRS filled), one accent (selection, active segment, focus),
text ≥ 12 px. The FIRMS key is never pasted, committed or logged.

## 9. Open items
- Real 2026 data fetched on 15 Nov 2026 (§0.5). The neighbour-country mask ran on real data: it lets a few coastal
  points of neighbouring countries through (NOTES_FOR_UI.md item 9).
- First-screen map ≈ 470 × 400 (1280×800) / 470 × 370 (1366×768). Argentina's raw → harmonized change reads at a
  glance (use it in the video); Canada's is visible but modest (84% → 73%).
- Place labels appear only when zoomed in. Presets menu replaces the old preset list.
- Argentina has no independent area-burned check yet.
