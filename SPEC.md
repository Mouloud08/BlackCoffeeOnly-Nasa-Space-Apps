# FireBridge — final prototype: design specification

Author of the design: the orchestrator. Builder: one Opus agent. This is the
version the team will ship from. It supersedes the four variant prototypes and
keeps the best element of each. Where this document and
/home/claude/variants/COMMON_BRIEF.md disagree, THIS document wins; everything
in the common brief that is not overridden here still binds (design-system
rules, data, exports, single offline file, verification, report).

## 0. The idea in one sentence
One page that answers one question — "Is the rise in fire activity here real,
or is it the satellite?" — with one number, shows the evidence for that number
on the same screen, and lets anyone ask it again for their own zone.

Why this shape (so you can make good local decisions):
- Judges give an app seconds. The first viewport must contain the answer, its
  proof and the calendar the challenge asks for — without a click.
- In 2026 a polished UI is table stakes. What wins is a verifiable result, one
  flawless flow, and honesty about limits. So: the check figures sit next to the
  headline number, never behind a disclosure; and when the data cannot support
  an answer, the app says so in plain words.
- The page is the product AND its own explanation: tool first, the three-step
  story directly below it, computed live for the zone in view. No separate
  landing page, no routes, no modal, no overlay.

## 1. Page map (one scrolling page, native scroll, max width 1280, 32 px gutters)
1. Top bar (sticky, 56 px)
2. Question line (40 px)
3. FIRST VIEWPORT ROW: Verdict card (5/12) + Calendar card (7/12) — both fully
   visible at 1280×800 together with 1 and 2. This is non-negotiable; size
   everything to make it true (calendar cells ~20 px tall, annual bars ~96 px).
4. Zone picker (in flow, collapsed by default, opens directly under the question
   line and pushes the content down)
5. Month row: "Every <month> since 2001" strip card (full width)
6. How it works: three steps (Problem, Bridge, Proof)
7. Method, checks and limits + data sources
8. Footer

## 2. Top bar
Left: wordmark "FireBridge" (DS wordmark style). Centre-left: three anchor links
"Calendar", "How it works", "Method" (scroll to sections 3, 6, 7; current one
gets the DS active treatment). Right: "Copy link" (copies the URL with its hash;
confirm with a 2-second inline "Link copied") and "Export" menu button: Series
CSV · Calendar image (SVG) · Calendar image (PNG) · Raw hotspots… (opens the
explanatory panel in flow under the calendar). Phone: wordmark + Export only;
anchors move to the footer.

## 3. Question line
Left, as the page's h1, 20 px medium: "Is the rise in fire activity real — or
is it the satellite?" Right, muted 13 px: "NASA MODIS + VIIRS · 2001–2025 ·
Canada and Argentina · last month available: December 2025".

## 4. Verdict card (the left 5/12 of the first viewport)
Top row: a mini-map button (96×64, the country silhouette with the zone
rectangle; aria-label "Change zone"), then zone name (18 px medium) with the box
in DS mono under it ("47.5°–52.5° N · 80°–68° W"), then a "Change zone" button
(secondary). Far right: the reliability pill (A / B / C; title attribute gives
the rule that was met).

Label (13 px muted): "Fire activity after 2012, compared with before".

The answer: the harmonized rise, 72 px, tabular figures, e.g. "1.6×", and on
the same baseline a muted 18 px clause generated from the data (R = raw rise,
H = harmonized rise, both rounded to 1 decimal for the test):
- H ≥ 1.15 and R − H > 0.2 → "not R× as raw data suggest"
- R ≥ 1.15 and H ≤ 0.9   → "raw data say R× — a rise that is not there"
- |R − H| ≤ 0.2           → "raw and harmonized agree"
- R < 1 and R − H > 0.2   → "a steeper decline than raw data show (R×)"
- otherwise               → "raw data say R×"
Under the number, one plain sentence that reads the result aloud for a
non-specialist, also generated: "Detections rose 1.6-fold, not 3.4-fold: over
half of the apparent rise came from the sensor change." / "Detections fell by
about a quarter; the raw record shows a rise that the sensor change created." /
"Detections barely changed." Compute the share honestly ((R−H)/(R−1) when R>1
and H≥1); when a clean phrase is not possible, state the two numbers only.

Three bars on ONE log scale around a labelled reference line "1× no change"
(bars grow right for a rise, left for a decline):
- Raw — hollow outline; sub-label "MODIS, then VIIRS from 2012"
- Harmonized — solid ink; sub-label "MODIS × 2.11 before 2012"; value shown as
  "1.6× (1.6–1.7)" where the bracket is the leave-one-out range, always in text
  (no whisker that disappears when narrow)
- Aqua only — solid muted; sub-label "one satellite throughout, the control"
Label column, bar column and value column share baselines with the text above.

Proof line (always visible, 13 px, one or two lines):
"Tested by leaving one year out: median error 27% · Aqua alone gives 1.7× ·
13 usable overlap years". Use "Checked" instead of "Tested" only for the three
Québec reference zones. End with the link "How we know →" (scrolls to section 7).

Foot: DS ProvenanceLine (Computed · Source NASA FIRMS · MCD14ML · VNP14IMGT ·
years used). For non-reference zones append "· not compared with direct counts".

States:
- Borrowed ratio (see §9): everything as above plus one line above the bars:
  "Too few detections in this box alone. Ratio taken from the wider area
  (31.5°–26.5° S · 70°–65° W): 2.32." Pill shows B.
- Grade C: no big number. In its place, 22 px: "Too few detections here to
  bridge the two sensors reliably." Only the Raw bar, labelled "raw, not
  comparable across 2012". Proof line explains why with the real counts.
- No data in box: "No detections in this box. Choose a zone inside Canada or
  Argentina." and the Change zone button; calendar shows sunken cells.

First-load choreography (once per page load, never on zone change; none with
prefers-reduced-motion): calendar starts on Raw and the clause reads "raw data,
before the sensors are bridged" with the number showing R; after 900 ms the
calendar switches to Harmonized with the DS 450 ms transition while the number
counts from R to H and the three bars settle. Total under 2 seconds.

## 5. Calendar card (the right 7/12 of the first viewport)
Header: title "Burning calendar" (16 px medium), segmented control Raw ·
Harmonized · Anomaly (default Harmonized; keyboard shortcuts R, H, A when focus
is not in a field), and at right the date range: two compact year-month selects
"2001-01 → 2025-12". Sub-header, muted: what is displayed ("MODIS × 2.11 before
2012, VIIRS from 2012 · cell-days per month").
Body: DS BurnCalendar, years as columns 2001→2025, months as rows, annual
totals as bars above on the LOG bar scale (the linear scale makes labels
collide), the 2012 seam marker with its annotation. If the DS annotation says
"rise" when the value is below 1, fix the wording in your copy ("change,
harmonized: 0.8×"). ColorLegend aligned to the calendar's left gutter.
Interaction: a cell is a button; clicking or pressing Enter selects that month
(outlined with ink, not the accent) and drives the month row (§7). Tooltip from
the DS (value, typical value, anomaly, provenance); for Canadian zones the July
2024 cell adds "S-NPP is about 30% below NOAA-20 this month (possible data gap)"
as a status line under the calendar while that cell is active.
Foot of card: three quiet buttons — Series CSV · Calendar image · Raw hotspots….
Date range narrower than the full record: calendar shows only those years and a
muted note says "The ratio is always estimated on the full overlap, 2012–2025."

## 6. Zone picker (in flow; opened by "Change zone" or the mini-map)
A full-width band under the question line, 440 px tall at desktop:
- Left 62%: the map. Draw it ourselves, offline:
  - Land outlines from Natural Earth via the npm package `world-atlas`
    (countries-110m or 50m) + `topojson-client`, inlined in the file. Simple
    equirectangular projection with a latitude-corrected aspect per country
    (cos of the mid-latitude). Show the selected country and its neighbours as
    neutral land, water as the page surface. If this is not working within 20
    minutes, fall back to the tile-only map and say so in the report.
  - On top, our 0.5° tiles shaded in the DS NEUTRAL gray ramp by mean annual
    VIIRS cell-days (colour is reserved for the calendar). A small legend
    "fewer → more detections".
  - The selected rectangle in the single accent, with its size label
    ("5° × 12° · 240 tiles").
  - Drag draws a rectangle that snaps outward to the 0.5° grid; the cursor is a
    crosshair; while dragging, show the live box and its coordinates. When the
    map has focus, arrow keys move the box by 0.5° and Shift+arrows resize it.
  - Hovering a tile shows a DS tooltip: coordinates and total cell-days.
  - Caption under the map: "Map: Natural Earth outlines; shading from the
    detection grid (0.5°)".
- Right 38%: a "Country" segmented control (Canada · Argentina); "Presets" as a
  list of buttons, each with its one-line fact computed live (e.g. "Boreal
  Québec — 1.6× · A", "La Rioja — 0.8× · A", "Chilecito — borrowed ratio · B"):
  Boreal Québec, Chibougamau and Côte-Nord (boxes from FIRMS_META in
  firms-data.js), La Rioja, Córdoba, Tucumán, Chilecito (boxes from the common
  brief); then "Or type a box": four number fields N, S, W, E (step 0.5, with
  validation messages inline: north must be above south, inside the country,
  etc.); then a primary "Done" button that closes the band and returns focus to
  the Change zone button. The verdict and calendar update live while the band is
  open (they are pushed below it, so on a 800 px screen the user sees the top of
  the verdict card — make sure the big number is visible under the band at
  1280×900; if not, reduce the band to 400 px).
Phone: map 60 vh on top, controls below.

## 7. Month row: "Every <month> since 2001"
Full-width card. Left third: title generated from the selected month, e.g.
"Every June since 2001"; a chip row "Latest month" · "Record month" (jump
buttons; "Latest month" = December 2025, the last available; default selection
on load = Latest month); then the reading for the selected month:
- normal case: "June 2023: 24,968 cell-days. A typical June has 113." then the
  anomaly "over 100× a typical June" (keep the DS cap, but the COUNTS lead when
  the anomaly exceeds 20×) and the rank "Most active June of 25".
- typical < 10: the DS "too few" dot and "Too few detections in a typical
  December to compare." followed by "Most recent comparable month: October
  2025, 0.8× a typical October, 16th of 25" with a button to select it.
- then the pay-off line, computed: "Without the bridge this month could only be
  ranked among 14 VIIRS years (1st of 14). On the bridged record: 1st of 25."
  If the rank is the same, say "the same rank, now over 25 years instead of 14".
Right two thirds: the 25-year strip — one mark per year for that calendar
month, log scale, HOLLOW for 2001–2011 (computed from MODIS), FILLED from 2012
(VIIRS), a dashed line at the typical (median) level labelled "typical June",
year ticks at 2001, 2006, 2012 (with the seam), 2018, 2025. The selected year is
marked with an ink outline and a caret + year label under it — NOT the accent
colour, and no colour that the anomaly ramp also uses. Clicking a mark selects
that year-month in the calendar too. A caveat line appears only when moving the
computed years by ± the leave-one-out error would change the selected month's
rank: "This rank depends on computed years (±27%)."
Grade C: strip of raw counts only, labelled "raw, not comparable across 2012".

## 8. How it works (three steps, live for the zone in view)
Section title: "How it works", and a small segmented control to switch the
example without leaving the section: "Boreal Québec" · "La Rioja" · "This zone"
(the last only when the current zone is neither). Each step is one row, text on
the left (5/12) and a chart on the right (7/12), 360–400 px tall, each designed
to stand alone as a 16:9 screenshot (they will be reused on the submission page
and in the 30-second video):
1. The problem. Headline from the data: "Did fire activity more than triple in
   2012?" (use "almost double", "more than double", "rise by half" etc. from the
   raw rise; when raw < 1.3: "Raw data say fire activity barely changed.").
   Second line: "No. The satellite changed." (or "They hide a decline." when
   harmonized ≤ 0.9 and raw ≥ 1). Two sentences of explanation: MODIS 1 km vs
   VIIRS 375 m, about twice as many detections for the same fires. Chart: raw
   annual totals, MODIS years hollow, VIIRS years filled, 2012 seam, dashed mean
   lines for 2003–2011 and 2012–2025 with the raw rise labelled; DS SensorFrieze
   under the same x axis.
2. The bridge. "14 years where both sensors fly." + "Here VIIRS records 2.11×
   what MODIS records." DS OverlapChart with the pooled ratio annotated; one
   sentence on how it is used ("We multiply the MODIS years by that ratio;
   VIIRS years are left untouched.").
3. The proof. "3.4× becomes 1.6×." (variants: "…: the rise was not real" when it
   crosses 1; "no real change"; "a steeper decline"). The three bars (same
   component as the verdict card, vertical or horizontal as fits), then the two
   check sentences: "Leaving one year out and predicting it: median error 27%."
   and "One satellite throughout (Aqua only), no sensor change: 1.7×." Do not
   call Aqua "independent" — it is part of MODIS; "one satellite throughout" is
   the accurate claim. One limits sentence: "The ratio is pulled by big fire
   years; quiet years are overestimated."
Motion: each step animates once when it enters the viewport (bars draw; in step
3 the harmonized bar travels from the raw value), DS durations, none with
reduced motion.

## 9. Method (this section also fixes the computation — overrides brief §6)
### 9.1 Computation rules to implement
- Ratio r = Σ V_y / Σ M_y pooled over ALL overlap years 2012–2025 (this is the
  DS `poolRatio` definition and the one behind the published 2.11). No year
  filter on the ratio itself.
- "Usable years" = overlap years with M_y ≥ 50 cell-days. The leave-one-out
  test runs over usable years only: for each usable y, r_-y = pooled ratio
  without y; error_y = |M_y·r_-y − V_y| / V_y; report the median error and the
  range of r_-y.
- Wider-area ratio (new). If the box has fewer than 5 usable years, expand it
  by one tile ring (0.5° on every side, clipped to the country's tile extent)
  and recompute, up to 8 rings; stop at the first expansion with ≥ 10 usable
  years. Use THAT area's ratio, range and error for the box, and say so (§4
  "borrowed ratio"). If no expansion qualifies → grade C.
- Grades: A = own ratio, ≥ 10 usable years, median error ≤ 30%, range width ÷ r
  ≤ 10%. B = own ratio with ≥ 5 usable years, error ≤ 50%, range width ÷ r ≤
  25%; or a borrowed ratio whose wider area meets A or B. C = otherwise: raw
  only. Thresholds are heuristics calibrated on Québec; say it in the section.
- Everything else as in the common brief (harmonized series, rise on 2003–2011
  vs 2012–2025 with the harmonized range from r_min/r_max sorted, typical month
  = median over complete years, "too few" below 10, anomaly, rank, critical
  period, date range affects display and export only).
Self-check before any UI (Node script on the tiles, same module as the app),
report the table: Boreal Québec r 2.11, raw 3.4, harmonized 1.6, Aqua 1.7, error
26–27%; La Rioja 2.32 / 1.8 / 0.8 / 0.7; Córdoba 1.94 / 1.1 / 0.6 / 0.5;
Chilecito: own data insufficient → borrowed ratio (report the wider box, its
ratio, usable years, resulting grade and rises); a custom box around
Lac-Saint-Jean (48–50° N, 76–72° W): report what the wider-area rule gives.
Never tune a threshold to obtain a result; report what comes out.

### 9.2 What the section shows
Title "Method, checks and limits". Two columns.
Left: "How it is computed" in four short numbered sentences (cell-days; ratio on
the overlap; rescale MODIS years; check by leaving one year out and by Aqua
alone). "Limits" as a short list: ratio pulled by big fire years; quiet years
overestimated; heuristic reliability thresholds, calibrated on Québec; small
boxes borrow the ratio of their wider area; data stop in December 2025; counts
are detections (cell-days), not fires or burned area; country files stop at
borders. "Reliability" — the three grades with their rules and, highlighted,
the one this zone met with its actual figures.
Right: a per-year check chart for the zone: for each usable overlap year, the
predicted VIIRS value (MODIS × ratio without that year, hollow mark) against the
measured one (filled mark) on a log scale, so the reader SEES the error behind
"27%"; under it the DS OverlapChart if not already on screen in §8 for this
zone, otherwise the DS RecoveryChart is not required — skip it.
Then "Data": NASA FIRMS active fire products with exact names — MODIS
Collection 6.1 (MCD14ML), VIIRS S-NPP 375 m (VNP14IMGT), VIIRS NOAA-20 375 m
(VJ114IMGT) — "country yearly files, 2000–2025, 96 files, 19.2 million
detections read; aggregated to 0.5° monthly tiles"; type-0 (vegetation fire)
filter; the tile/point difference (−0.2 to −0.5%).

## 10. Footer
One line each: "FireBridge — NASA Space Apps Challenge 2026, challenge
'Harmonization of MODIS and VIIRS Hot Spots'." · "Data: NASA FIRMS. Outlines:
Natural Earth. Not affiliated with or endorsed by NASA." · "AI assistance was
used for code and data processing; the method, checks and decisions are the
team's." · anchors (Calendar, How it works, Method) · "Prototype — every figure
is computed in your browser from 0.5° monthly tiles."

## 11. Visual design (Atelier Terrain v3, applied with restraint)
- Use the DS tokens, fonts and components. This is the final version: you MAY
  patch your own copy of the DS where it is wrong (`.at-mono` 12 px floor,
  chart tick sizes on narrow screens, the "rise" wording below 1, label
  collisions) — keep a list of every patch in PATCHES.md so it can be
  upstreamed. Never restyle the DS's visual language.
- One accent, used for exactly three things: the selected rectangle on the map,
  the active segment of a segmented control, and focus rings. The primary
  "Done" button uses the DS primary (ink) fill. Everything else is ink and
  neutrals; colour belongs to the calendar ramp only.
- Type: the answer at 72 px (44 px on phone), section titles 22 px, card titles
  16 px, body 14–15 px, captions 12–13 px; tabular figures everywhere numbers
  align; DM Mono only for coordinates, product names and the ratio formula.
- Space: 8 px grid; cards with 24 px padding and 16 px gaps in the first
  viewport; sections separated by 64 px; hairline dividers; no card inside a
  card; no shadows except the DS's own on the Export menu.
- The first viewport must feel calm: at most four distinct text sizes visible,
  generous air around the big number, bars and calendar aligned to shared
  baselines and edges across the two cards (same top, same bottom).
- Copy: sentence case, short, numeric, no exclamation marks, no "successfully",
  never "validated" outside Québec, never "fires" for counts, "typical" always
  followed by the month or "year". Percent without space ("27%").
- Dark and light from the DS tokens following the system; check both.
- Skeleton: while tiles decode, sunken DS cells in the calendar's exact grid and
  a neutral bar where the big number will be; no spinner; target first
  meaningful paint under 1 s and zone recompute under 100 ms.

## 12. Phone (390 px)
Order: question line (wraps) → verdict card (number 44 px; mini-map and Change
zone on one row; bars full width) → calendar (DS compact mode, horizontally
scrollable inside its card only if needed, the 2012 seam visible at rest —
start the scroll position so that 2008–2016 is in view) → month row (text, then
strip) → how it works (text above chart) → method → footer. Zone picker: map
60 vh then controls. No horizontal page overflow at 320 px.

## 13. State, exports, accessibility
- URL hash holds: zone box, country, preset id, date range, calendar view,
  selected month, example in §8, picker open/closed. Opening a copied link
  restores the exact view (and skips the first-load choreography).
- Exports as in the common brief §8, plus PNG of the calendar (render the same
  SVG to canvas). The CSV header also states whether the ratio is own or
  borrowed and from which box. File names include zone and dates.
- Keyboard: everything reachable; visible focus; segmented controls as radio
  groups; calendar cells as a grid with arrow-key navigation (reuse the DS
  behaviour); the map's keyboard path is the four fields plus arrow nudging.
- axe-core: zero violations of any severity, light and dark, 1280 and 390.

## 14. Reuse — do not start from zero
Four working prototypes exist; read their sources and take the best parts:
- /home/claude/variants/v1-verdict/ — BASE: verdict card, clause logic, three
  bars around 1×, first-load choreography, exports, C state, metrics.js.
- /home/claude/variants/v3-recit/ — the three story steps with generated
  headlines, 16:9 frames, scroll-triggered motion, corrected Aqua wording.
- /home/claude/variants/v4-pouls/ — the 25-year strip and rank logic, the
  "too few" handling, counts-first for extreme anomalies.
- /home/claude/variants/v2-atelier/ — gray map shading, tile tooltip, arrow-key
  nudging, box size label, empty-box state.
Unify on ONE metrics module (extend v1's with §9.1) and delete duplicates.

## 15. Output, verification, report
- Folder: /home/claude/final/ (sources in src/, DS copy in ds/, node_modules as
  a symlink to /home/claude/build/node_modules; `npm install world-atlas
  topojson-client` into your own folder if they are missing).
- Output: /home/claude/final/dist/firebridge.html — one self-contained offline
  file, CSP with connect-src 'none', under about 7 MB.
- Verify as in the common brief §9 and additionally: (a) at 1280×800 the verdict
  card and the whole calendar card are fully inside the first viewport — measure
  it with getBoundingClientRect and report the numbers; (b) screenshots, all
  LOOKED AT and fixed until clean: first viewport light and dark; picker open;
  La Rioja; Chilecito (borrowed ratio); a grade C or empty box; month row with
  June 2023 selected; each of the three steps as a 1280×720 frame for Boreal
  Québec and La Rioja; method section; phone first screen, phone picker, phone
  calendar; 320 px. (c) interaction test by script: draw a box, type a box, arrow
  nudge, switch view with R/H/A, select a month, each export's content, copy
  link → reload restores the view.
- Be your own harshest critic on the screenshots: alignment, clipped text,
  collisions, empty holes, inconsistent spacing, anything that looks unfinished.
  Fix, re-shoot, look again. Budget about a third of your time for this.
- Report (concise): path and size; the self-check table including the borrowed
  ratio cases; first-viewport measurements; what is implemented vs cut; check
  results; PATCHES.md summary; screenshot list; remaining known flaws in order
  of importance; doubts about data or method. No memory writes.
