# FireBridge — version 5: from a long page to an application

Decision by the orchestrator, based on the measured audit in
/home/claude/audit-v4/AUDIT.md (37 findings; read it in full, especially its
sections 3 and 5 — its layouts, type scale, spacing scale and motion plan are
the baseline for this build unless this document says otherwise). SPEC.md,
SPEC_V2.md and SPEC_V3.md stay binding for content, computation and honesty
rules. The metrics module and every validated number must not change.

Work on a COPY: `cp -r /home/claude/final /home/claude/v5` (recreate the
node_modules symlink; do not copy shots/). Never write under /home/claude/final:
version 4 is the fallback for the submission and must stay exactly as it is.
Output: /home/claude/v5/dist/firebridge.html.

## 0. What "better" means here
Premium = calm, fast, obvious. One screen, one question, one answer; everything
else one deliberate step away. Fewer words, fewer controls, bigger and better
proportioned graphics, an interface that grows with the screen, and motion that
explains a change of state instead of decorating it. Nothing may become less
honest: every caveat that exists today survives, but it moves to where it is
needed (tooltip, info popover, Evidence, Method) instead of sitting on the
first screen.

## 1. Shell
- Full viewport (100dvh). The page never scrolls on Dashboard, Evidence and How
  it works at ≥ 1280×720; only Method (a document) and, where unavoidable,
  Evidence on small heights scroll inside the tab area. No double scroll.
  Fallback under 600 px height: let the page scroll rather than cut content.
- Max content width 2240 px; the interface GROWS with the screen (audit F01):
  fluid type and spacing scales in rem driven by viewport width AND height
  (audit §5), a single `html { font-size }` declaration, everything else in rem.
- Top bar (52 px): wordmark · the four tabs as one segmented control
  (Dashboard · Evidence · How it works · Method) · zone button · the global
  Raw/Harmonized switch · a "⋯" menu (Export…, Copy link, Theme).
  - Zone button: shows the current zone name; opens a popover (Popover API)
    with the country switch, the presets with their live verdicts, and "Type a
    box" with the four fields. Arrow keys move inside it; Escape closes and
    returns focus.
  - Global Raw/Harmonized switch: the product's signature control, the ONLY
    one (remove the two local switches). Keys R / H. Hold-to-peek: holding the
    "Raw" segment (pointer down) or holding the R key shows raw; releasing
    returns to harmonized. A one-time hint on first load ("Hold R to see the raw
    record"), dismissed on first use, never shown again (remember locally).
- Tabs are real views (hash-routed, `tab=`), only the visible one is rendered.
  Deep links restore tab, zone, layer, month, dates.
- Phone (< 760 px): bottom tab bar with the four tabs (icons + labels), compact
  top bar (wordmark, zone button, Raw/Harmonized, ⋯).

## 2. Dashboard (the one screen)
Layouts per audit §5:
- 1280–1679 px wide: verdict strip (about 92 px) across the top; below it the
  map panel (5/12) and the calendar panel (7/12) filling ALL remaining height.
- ≥ 1680 px: a verdict rail on the left (360–420 px: the question, the number
  at 72–88 px, the sentence, mini proof bars, the evidence chips), then map and
  calendar side by side filling the rest. The interface must look designed for
  1920×1080 and 2560×1440, not stretched.
- 760–1279 px: verdict card, then a Map | Calendar switch showing one panel at
  a time at full size; no page scroll.
- Phone: compact verdict card, then the Map | Calendar switch; the first useful
  action at y ≤ 220 px.
Verdict strip / rail content (cut the separate question line; the question
becomes the strip's kicker): kicker "Is the rise real — or the satellite?";
the big number with its clause (robust/uncertain/C logic unchanged; the
sensor-effect number in the uncertain state must look different from a rise —
e.g. prefixed "÷" semantics in words: "raw reads 2.4× too high" — never styled
exactly like a rise); at most two evidence chips, generated: "Official area
burned 1.9×" (where available) and "Without 2023: 1.6×"; the bridge-quality
mark as a small glyph with a plain-language tooltip; "Evidence →" (switches
tab). No sentence that merely restates the number.
First load opens directly in Harmonized with the correct number (remove the
raw-first intro and the count-up: audit F03/F11 measured a wrong figure on
screen for 1.9 s and a "4.2× not 4.2×" frame).

### Map panel
- The map fills the panel. Frame fits the country's data extent with a small
  margin (crop empty ocean/foreign land; Canada must not leave a third of the
  frame to the USA — audit measured 21%; letterbox as little as possible, pan
  is available). Selecting a preset or a small box animates the map to it
  ("fly to zone"); a 1° box must be zoomed to.
- Gestures: drag pans; wheel and pinch zoom (the dashboard does not scroll, so
  plain wheel is safe); click selects a 2° × 2° box; Shift+drag (and a "Draw"
  toggle for touch) draws a rectangle; arrows nudge, Shift+arrows resize.
  Zoom buttons (+, −, fit) float bottom-right; nothing else floats.
- Layers: one compact segmented control floating top-left inside the map
  (Record years · Sensor effect · This month · Detections).
- Colours: the Record-years pair must NOT reuse the calendar ramp's hues at the
  same lightness (today both are purple/orange with different meanings). Pick a
  pair from the DS palette that is clearly not the calendar ramp and not the
  accent, strong lightness contrast, CVD-validated with tools/cvd.mjs; replace
  hatching by a calmer treatment (e.g. reduced opacity or a dot) wherever it
  stays legible; report the choice.
- Legend: one line. Counter: ONE sentence, generated, e.g. "Records since 2012:
  raw 84% → harmonized 74%; chance gives 45–74%." with an (i) popover holding
  everything else (MODIS alone, places counted, not-bridged places, box
  counters, "a record is one year, not a trend" stays visible as a short
  suffix). No box counter line when the box has fewer than 30 places.
- Place names at country scale: a handful of major ones without collisions.

### Calendar panel
- Fills the panel; cells grow with it (about 27×28 px at 1366×768 per audit);
  annual bars above; the 2012 seam marked.
- Header: title, a two-option view control "Counts · Anomaly" (Raw/Harmonized
  comes from the global switch), and a compact date-range button ("2001–2025")
  opening a popover.
- One legend row inside the panel's footer; all notes (hatched years, seasonal
  note, empty-month note, colour-vision statement, log scale) move into an (i)
  popover and into cell tooltips. Remove the "changes the colour class of N of
  M months" line from the dashboard (it lives in Evidence). No blank band.
- 2001–2002: a calmer "partial" treatment than diagonal hatching.
### Linked interactions (new)
- Hover/focus a year column in the calendar → on the Record-years layer the
  places whose record is that year light up, with a count ("2023: a record in
  396 places").
- Click a month cell → it becomes the selected month; the This-month layer and
  the Evidence month strip follow; a small "June 2023" chip appears in the
  calendar header with a clear (×).
- Hover a place on the map → its record year column is outlined in the
  calendar and the tooltip gives the place's facts.
All linked highlights are instant (no animation), keyboard-accessible, and
never trap focus.

## 3. Evidence tab
One screen at ≥ 1366×768 (2 × 2 grid; scroll inside the tab only if the height
is short). Each panel has a one-line takeaway as its heading, generated from
the numbers:
1. "Bridged, the record matches official area burned" (or the Argentina
   wording when no official series): the proof bars, large (Raw, Harmonized,
   Aqua only, Official), with "without <year>" and the bootstrap range.
2. "Year by year, the bridge predicts what VIIRS measured": the per-year
   leave-one-out chart + hold-out figure + monthly error.
3. "Every <month> since 2003": the month strip with its reading and rank, month
   chosen by chips (Latest · Record) or from the calendar.
4. "Records on the map are within chance once bridged" (generated per
   country): raw / harmonized / MODIS-alone shares against the chance range as
   a small range chart, plus the official area-burned time series where it
   exists (Canada), or the ratio-by-month strip otherwise.
The proof bars exist once in the app (remove the duplicate in How it works;
step 3 there shows the same component only as that step's chart).

## 4. How it works tab
A stepper, one step per screen (Problem · Bridge · Proof · Records), 16:9-safe,
Next/Previous buttons, arrow keys, step dots, deep-linkable (`step=`), `anim=0`
honoured. Charts draw when their step becomes active.

## 5. Method tab
A readable document: sticky section list on the left (How it is computed ·
What is robust · Limits · The ratio by month · What the map shows · Questions
an expert will ask · Data · References), text column ≤ 72 characters wide,
charts and tables in the flow, scrolls inside the tab. Source lines appear once
per chart, not nine times.

## 6. Motion (audit §5 plan, with these decisions)
- Three durations: 120, 200, 320 ms; one easing token; transform and opacity
  only — fix the four transitions that animate left/width/height/bottom
  (audit). With prefers-reduced-motion: no animation at all (today 91 still
  start).
- Tab change: View Transitions API (cross-fade, 200 ms; the verdict number
  shares a `view-transition-name` so it stays put between Dashboard and
  Evidence). Fallback: instant.
- Raw ↔ Harmonized: one View Transition for the whole dashboard (320 ms): the
  calendar's pre-2012 columns and the map recolour together, the number
  cross-fades (no count-up, never an intermediate wrong sentence). The 223
  simultaneous outline animations are removed; instead the places/months that
  change are briefly emphasised by the transition itself.
- Zone change: the map flies to the zone (320 ms, transform on the existing
  canvas image, redraw when settled); numbers and calendar cross-fade (200 ms).
- Layer change: 160–200 ms cross-fade. Zoom: transform during the gesture,
  redraw on settle. Hover, tooltips, selection, focus: instant.
- Popovers and menus: 120 ms fade/scale from their anchor.
- No infinite animation anywhere.

## 7. Performance (audit F02) — targets, measured with CPU slowed 4×
Under 100 ms from input to updated paint for the flip, a layer change and a
preset change; no long task over 100 ms after load; 55+ fps during pan/zoom and
during the flip; map visible within 1 s of load at normal speed. Means: cache
`Intl.NumberFormat` instances (audit: a new one per number), memoise panels so
a flip does not re-render the whole app, precompute both raw and harmonized
derived data per zone once, render only the visible tab, decode tiles off the
main thread if needed. Report before/after numbers using the audit's scripts in
/home/claude/audit-v4/.

## 8. Also fix (audit findings to close)
Card paddings unified (one value per level); header controls aligned across
panels; the 30 px gutter shift between rows; 13 font sizes → the 7-step scale +
hero; 23 spacing values → the spacing scale; hit targets ≥ 24 px (≥ 44 px on
phone where feasible; calendar cells may stay smaller but the grid is one tab
stop with arrow navigation); tab order: verdict before map; month strip as one
tab stop with arrow keys; the map's focus ring distinguishable from the
selection box; menus navigable with arrows; outside-data and data-poor states
show a designed empty state (illustration-free: one sentence + one action),
never empty charts drawn as if they held data.

## 9. What must survive
Verdict logic and wording per state; honesty markers (Real/Computed, borrowed
ratio, A/B/C, not-bridged places, "a record is one year, not a trend",
"consistency check"); the URL state; exports (series CSV, map CSV, calendar
SVG/PNG, hotspots when present); 2026 ingestion; the colour tokens for both
themes; sensors by shape; one accent; ≥ 12 px text; aria-labels; keyboard
support. English UI.

## 10. Verification and report
- Metrics self-check: identical to version 4 (the metrics module is untouched);
  copy check adapted to the new wording and run for every preset and state.
- No page scroll: document height == viewport height on Dashboard, Evidence
  and How it works at 1366×768, 1440×900, 1920×1080, 2560×1440 (measure and
  report); no horizontal overflow anywhere, including 320 px.
- Use of space: report the map and calendar boxes and the share of the viewport
  left empty at each size (audit baseline: map 5.4% of the viewport at
  2560×1440).
- Performance table (before = audit, after = yours), normal and 4× slowed.
- axe 0 violations, both themes, each tab, 1366 and 390; keyboard walk-through
  of the Dashboard written out; reduced-motion check (zero animations started).
- Interaction script covering: tabs, zone popover, global switch incl.
  hold-to-peek, layers, click/Shift+drag/wheel on the map, linked calendar ↔
  map highlights, month selection, Evidence month chips, stepper, exports, deep
  links for every tab; zero console errors, zero network requests.
- 2026 simulation still passes (then delete its output).
- Screenshots after the final build, ALL LOOKED AT critically: Dashboard at the
  four desktop sizes + 768 + 390, light and dark, for All of Canada, All of
  Argentina (raw and harmonized), Boreal Québec (uncertain), Chilecito
  (borrowed), a data-poor box, outside-data; Evidence, How it works (each
  step), Method; popovers open; linked highlight active. Fix what looks wrong
  before reporting: alignment, proportions, empty areas, collisions, anything
  unfinished. Budget a third of the time for this.
- Report: what was built vs cut; measurements; performance before/after; the
  colour pair chosen for the map and its CVD result; remaining flaws ranked;
  anything in this spec you judged wrong and what you did instead. Update
  CLAUDE.md, PATCHES.md and tools/README.md in the v5 folder.
