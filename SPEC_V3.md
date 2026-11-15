# FireBridge — version 3: the map becomes a main element

Amends SPEC.md and SPEC_V2.md (both still binding where not changed here).
Decision by the orchestrator after three independent proposals (Fable, Opus,
Sonnet) that all concluded the same thing: the map must be a main element, and
it must show what the bridge CHANGES, place by place — not where fires are
(FIRMS, GWIS, Global Forest Watch and CONAE's viewer already do that).

Chosen concept: the "record years" map (primary layer) + the "sensor effect"
map (second layer) + a "this month" layer for emergency managers + a plain
"detections" layer. NOT chosen: classifying each cell as a real rise or a
"mirage" — a per-cell trend claim is exactly what the jury rejected for Boreal
Québec. A record is a fact about one year, not a trend; say so on screen.

Rule for this round, as before: every claim must survive a hostile expert;
never make a figure look better than it is; every number on screen is computed
by the app's own metrics module and covered by the self-check. The figures
quoted below from the advisors are expectations to TEST, not targets to hit.

## 1. Cell statistics (metrics module + self-check first, before any UI)
Grid: the 0.5° tiles. Years: 2003 → last complete year. Outage-month
substitution and all V2 rules apply.
- Local ratio for a cell: pooled Σ VIIRS / Σ MODIS over the overlap years in the
  3×3 neighbourhood (cell + 8 neighbours). If the neighbourhood has fewer than
  300 cell-days for either sensor, widen to 5×5; if still short, use the
  country ratio. Record which case applied (`own3`, `own5`, `country`).
- Annual totals per cell: raw (MODIS before 2012, VIIRS from 2012) and
  harmonized (MODIS × local ratio before 2012, VIIRS from 2012).
- Eligible cell: ≥ 200 cumulative harmonized cell-days over the period.
  Others are "too few" (neutral, no claim).
- Record year: the year with the largest annual total, for raw and for
  harmonized. Era = before 2012 / since 2012.
- Sensitivity: recompute the harmonized record with the local ratio × 0.85 and
  × 1.15. If the ERA changes in either case, flag the cell "depends on the
  ratio".
- Country counters over eligible cells: share whose record falls since 2012,
  raw and harmonized; the no-change benchmark = (years since 2012) ÷ (years in
  the period), e.g. 14/23 = 61%; share flagged "depends on the ratio"; the most
  frequent record year and its share (expect 2023 to dominate Canada).
- Box counters: the same shares restricted to the selected box.
- Sensor-effect layer value = the local ratio (with its case).
- This-month layer, for the month selected in the calendar: per cell, the rank
  of that month's harmonized value among the same calendar month of all years
  in the period → classes "record", "top 3", "active, not unusual", "no
  detection". No anomaly-vs-median at cell level (typical values are too small
  per cell); say so in the legend's note.
- Detections layer: mean annual VIIRS cell-days per cell, 2012 → last year.
Self-check additions (print and report): for Canada and Argentina — number of
eligible cells, share by ratio case, raw and harmonized record-since-2012
shares, benchmark, share "depends on the ratio", top three record years with
shares (raw and harmonized), 5th/50th/95th percentile of the local ratio, and
the five highest-ratio areas with coordinates. Advisors' quick estimates, for
comparison only: Argentina about 71% raw → 40% harmonized (737 cells), Canada
about 84% → 73% (1,997 cells), ratio 5th–95th percentile about 1.4–3.3. If your
numbers differ, yours are the ones to trust — explain the difference.

## 2. Look before building
Render the record-years map statically (raw and harmonized, Canada and
Argentina) at the size it will have on screen and LOOK. Report honestly whether
the raw → harmonized change is readable in two seconds. If it is readable for
Argentina but weak for Canada, keep "Record years" as default and say in the
report that the video should use Argentina. If it is not readable even for
Argentina, make "Sensor effect" the default layer instead and tell me.

## 3. First screen layout (1280×800, everything below visible without scroll)
Left column (5/12):
- MAP CARD (about 380 px tall): header row with the country switch (Canada ·
  Argentina) and the layer control (Record years · Sensor effect · This month ·
  Detections); the map; a one-line legend; the counter line.
- VERDICT STRIP (about 270 px): zone name + coordinates; the big number (56 px)
  with its clause (robust/uncertain logic from V2 unchanged); the plain
  sentence; "Without <year>, the largest year: X×."; bridge-quality pill; link
  "See the proof ↓".
Right column (7/12): the calendar card, unchanged in content.
Second row (first scroll): PROOF CARD (the bars: Raw, Harmonized, Aqua only,
Official area burned where available; proof line; provenance) next to the month
row.
The old in-flow zone-picker band and the 96 px thumbnail are removed: the map
card IS the zone picker.
ONE shared Raw/Harmonized state for the whole screen: the calendar's control
(Raw · Harmonized · Anomaly) and a Raw · Harmonized switch on the map card
drive the same state (Anomaly = harmonized on the map). Flipping it changes the
map, the calendar and the counter together — this is the product's signature
moment and the centre of the 30-second video. Keyboard: R / H as today.
First-load choreography: map, calendar and number go raw → harmonized together,
once.
If the three blocks cannot fit 800 px without cramping, reduce the map card
before the verdict strip; if it still does not fit, tell me the measurements
and the best alternative rather than shrinking text below the DS sizes.

## 4. Map card details
- Base: Natural Earth outlines as today; neighbours in a lighter neutral.
- Record years layer (default): each eligible cell drawn in the DS sensor-era
  vocabulary — record before 2012 = HOLLOW (outlined) cell, record since 2012 =
  FILLED cell — the same hollow/filled language as MODIS/VIIRS everywhere else
  in the app, no hue needed; "depends on the ratio" = hatched; "too few" = faint
  dot or nothing. Hover/focus tooltip: coordinates, record year raw and
  harmonized, the local ratio and its case, cumulative cell-days. Optional if
  cheap and legible: a subtle tint for cells whose record is the single most
  frequent year (e.g. 2023), with a legend entry.
- Counter line under the map, generated: "Raw: 84% of places set their record
  since 2012. Harmonized: 73%. With no change you would expect 61%." Then, in
  muted text: "A record is one year, not a trend." When a box is selected, a
  second line gives the same shares inside the box.
- Sensor effect layer: sequential single-hue ramp from the DS, about 1× to 4×+,
  legend "raw data read N× too high here"; cells using the country ratio drawn
  at reduced emphasis and listed in the legend.
- This month layer: classes by shape/weight (record = filled strong, top 3 =
  filled light, active = small dot), title follows the selected month ("June
  2023: where it was a record"), with a count ("a record in 396 places").
- Detections layer: the DS sequential colour ramp, legend "mean cell-days per
  year, 2012–2025" (so nobody confuses it with the calendar's monthly scale).
- Selecting a zone: click a cell → a 2° × 2° box around it, snapped to the grid;
  drag → a rectangle (as today); arrow keys nudge, Shift+arrows resize; a
  "Presets" menu button on the card (all presets with their live verdicts, as
  today); a "Type a box" disclosure with the four fields and validation. The
  selection is the single accent, with its size label; the label must never be
  covered by the legend.
- Zoom: + / − / "Fit country" / "Zoom to zone" buttons; when zoomed, drag pans
  if the Pan tool is active (two tools: Select · Pan; Select is default);
  place labels (from V2) appear by zoom level without collisions.
- Phone: map card first (about 55 vh), then verdict strip, calendar, proof.

## 5. Copy and method
- Method section, new block "What the map shows": how the local ratio is
  computed, eligibility, the sensitivity flag, the benchmark, "a record is not
  a trend", and that small fires invisible to MODIS are not recovered so the
  correction is, if anything, conservative for records before 2012 — state
  this only as far as the data support it.
- If the high-ratio pockets coincide with places you cannot explain, say
  "local ratios above about 4× occur in a few areas (listed); causes not
  investigated" — do not guess causes (no claims about gas flares or crops).
- Story section: add the record-years counter as a fourth beat or fold it into
  step 3, for All of Canada and for Argentina.
- CSV export of the map layer: one row per cell (coordinates, eligibility,
  record year raw/harmonized, era, flag, local ratio and case), with the
  provenance header.

## 6. Pending retouches to include in this round
a. Date range also drives the month row and all exports (ratio still estimated
   on the full overlap — say so).
b. Verdict bars: the "4×" tick collides with "1× no change" for All of Canada.
c. Colour-vision check of the calendar ramp and of the new map ramps: simulate
   deuteranopia, protanopia and tritanopia (compute simulated colours and check
   that adjacent classes remain distinguishable in lightness); if the calendar
   ramp fails, replace it with a sequential ramp that passes (viridis/cividis
   family, expressed in DS tokens) and record it in PATCHES.md; then state the
   result under the legend truthfully.
d. Widths: verify by screenshots 768, 1024, 1366×768, 1440, 1920, light and
   dark; at 1366×768 the first screen must fit; fix what breaks.
e. Write /home/claude/final/CLAUDE.md: the project memory for whoever continues
   (challenge, rules, the V3 app, where everything is, how to build and check,
   the validated numbers from the current self-check, the 2026 procedure, what
   is solid vs uncertain, the honesty rules, open items). It replaces the
   outdated memory in the old export, whose headline numbers no longer hold.

## 7. Verification and report
Everything from SPEC §15 and V2 §9, plus: the self-check additions (§1); the
static look (§2) with your honest verdict; first-screen measurements at
1280×800 and 1366×768 for All of Canada, All of Argentina, Boreal Québec, La
Rioja, Chilecito, a grade C box; axe 0 violations in both themes at 1280 and
390 with each layer active; interaction script extended (layer switch, shared
raw/harmonized switch, click-to-select, drag, zoom and pan, presets, type a
box, map CSV export); zero console errors and network requests; no overflow at
320. Fresh screenshots of everything after the final build, all looked at:
each layer for both countries in both raw and harmonized states, light and
dark, phone, and the widths in §6d. The 2026 simulation (V2 §7) must still
pass with the new layout — run it and delete the synthetic data afterwards.
Report: self-check table incl. the new counters; the §2 verdict; measurements;
checks; what is done / cut; what remains wrong; anything in this spec you
judged wrong and what you did instead. Output path unchanged.
