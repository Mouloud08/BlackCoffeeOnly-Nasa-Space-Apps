# FireBridge — version 2: changes required after the independent jury review

An independent judge (remote-sensing literate, strict) scored the app 17.5/25
and showed that part of our headline does not hold. This document turns that
review into build instructions. It AMENDS /home/claude/final/SPEC.md: anything
not mentioned here stays as built. The judge's throwaway analysis scripts are in
/home/claude/final/review/judge-analysis/ (a1–a4.mjs) and its screenshots in
/home/claude/final/review/judge-shots/ — read them, but recompute everything
yourself in the app's own metrics module; never paste the judge's numbers into
the UI.

Guiding rule for this round: every claim on screen must survive a hostile
expert. Where a number is fragile, the app says so before anyone asks. Never
make a figure look better than it is; if an analysis weakens one of our results,
show the weaker result.

## What the judge found (so you understand the why)
1. The trend headline is fragile. For Boreal Québec the harmonized rise is 1.6×,
   but 0.66× without 2023, and a year-resampling bootstrap gives roughly
   0.1–6.1. The bracket "(1.62–1.70)" only reflects ratio uncertainty and reads
   as a confidence interval on the trend. "Reliability A" grades the bridge but
   reads as grading the trend.
2. What IS robust: the correction factor. Raw rise ÷ harmonized rise = the
   ratio r exactly (algebra), e.g. 2.11 (2.02–2.12). "Raw data overstate any
   before/after-2012 comparison by 2.1×" survives every test.
3. The "control" is not a control. Harmonized rise equals the MODIS-only rise by
   construction, and Aqua is 55–67% of MODIS cell-days; Aqua's overpass time has
   also drifted since 2021. Aqua agreeing shows Terra and Aqua agree, not that
   the bridge is right.
4. An independent check exists and passes at country scale: Canada, official
   area burned (National Forestry Database) rose about ×1.9 between 2003–2011
   and 2012–2024; our raw record says about ×3.9, harmonized about ×1.9.
   (Judge's figures — you must re-derive them.)
5. Terra-only era (2001-01 to 2002-06, before Aqua) is displayed and used as if
   harmonized; 2001 totals are about a third of normal.
6. S-NPP outage months are taken as measured (Canada July 2024; Argentina July
   2024 and July 2022 show NOAA-20/S-NPP ≈ 1.4–1.6).
7. Low-count months: VIIRS detects where MODIS sees zero; no multiplication
   recovers that. Must be stated.
8. Bugs and copy errors listed in §6 below.

## 1. Metrics module: additions (P1)
Implement in the single metrics module, with a Node self-check printing a table.
- Stats window starts 2003-01. Typical month (median), anomaly, ranks, critical
  period, record month: computed over 2003–last complete year only. 2001-01 to
  2002-06 is the "Terra-only era" (flag `partial`); 2002-07 to 2002-12 is shown
  but excluded from stats for simplicity (label the whole 2001–2002 block
  "before 2003: partial MODIS coverage, not used in statistics").
- S-NPP gap substitution. Embed the `n20` series. For each country and month
  from 2018-04 on, compute country-level N20/S-NPP. Flag a month as an S-NPP
  gap when that ratio exceeds 1.25 AND both counts are ≥ 200 cell-days; in
  flagged months use the NOAA-20 tile values in place of S-NPP everywhere
  (ratio, harmonized series, calendar). Report which months get flagged (expect
  Canada 2024-07; Argentina 2022-07 and 2024-07; report any others, do not hide
  them). These months carry provenance "NOAA-20 used: S-NPP outage".
- Trend robustness for a box, on annual harmonized totals, before = 2003–2011,
  after = 2012–last complete year:
  a. rise (as today);
  b. rise without the single largest year of the whole record;
  c. bootstrap: resample years with replacement within each period, 2,000
     draws, seeded PRNG (deterministic), 90% interval of the rise, and
     P(rise > 1);
  d. status: "robust" if the 90% interval excludes 1 AND (b) lies on the same
     side of 1 as (a); otherwise "uncertain".
- Correction factor = r, with its leave-one-out range (already computed).
- Hold-out test: ratio estimated on 2012–2018, used to predict annual VIIRS for
  2019–last year; median absolute error. Reported next to leave-one-out.
- Monthly error: over overlap months where both sensors have ≥ 30 cell-days,
  median |modis×r − viirs| / viirs.
- NOAA-20 continuity factor per country and per box: Σ n20 / Σ snpp over months
  2018-04 to last, excluding flagged gap months; plus its yearly range.
- Rename in code and UI: reliability grade → "Bridge quality" (A/B/C rules
  unchanged).
Self-check table must include: All of Canada, All of Argentina, Boreal Québec,
La Rioja, Córdoba, Tucumán, Chilecito, and the judge's Northwest Territories box
(58–63.5° N, 125.5–116.5° W): r, range, raw rise, harmonized rise, rise without
largest year (and which year), bootstrap 90% interval, P(rise>1), status,
hold-out error, monthly error, gap months used. Report it in full.

## 2. Independent check against official area burned (P1)
- Obtain Canada's official annual area burned, national total, 2003–2024, from
  the National Forestry Database (the judge used the Environment and Climate
  Change Canada indicator page:
  https://www.canada.ca/en/environment-climate-change/services/environmental-indicators/forest-management-disturbances.html
  — use WebFetch; if the figures are not on that page, find the NFD table).
  Save to data/official/canada_area_burned.json with source URL, retrieval
  date, units, and every yearly value. If you cannot retrieve the values from an
  official page yourself, STOP this item and report — do not use numbers from
  memory or from the judge's scripts without a source you fetched.
- Compute for "All of Canada": official rise = mean area 2012–2024 ÷ mean area
  2003–2011; raw and harmonized rises over the SAME years (2012–2024); cell-days
  per km² burned before and after 2012, raw and harmonized.
- Argentina: spend at most 10 minutes looking for an official or published
  national annual burned-area series (e.g. national fire management service
  statistics, or GWIS/MCD64A1 country statistics) fetchable by WebFetch. If
  found with clear provenance, do the same; if not, the app says for Argentine
  zones: "No independent area-burned series checked yet for Argentina."
- UI: when an independent series exists for the zone (only "All of Canada" for
  now), the verdict bars get a fourth row "Official area burned" with sub-label
  "National Forestry Database, independent of both sensors", drawn in a
  distinct, non-colour style from the DS vocabulary (e.g. a marker-and-stem or
  double outline — not another solid bar), value "1.9×". Add an "Independent
  check" block in Method with a chart: annual area burned vs annual cell-days
  (raw and harmonized) 2003–2024, and the two cell-days-per-km² figures.

## 3. Verdict card: what the big number is (P1)
New presets "All of Canada" and "All of Argentina" (whole-country sums) at the
top of the preset list. DEFAULT ZONE ON LOAD: All of Canada.
The headline now depends on trend status:
- Trend "robust": as today. Big number = harmonized rise; clause "not R× as raw
  data suggest" (same clause rules). Under it, the plain sentence.
- Trend "uncertain": the big number becomes the correction factor. Label above:
  "Raw data overstate the change after 2012 by"; number "2.1×"; clause, muted:
  "the sensor effect, measured on 14 overlap years". Sentence under it, built
  from the data: "The trend itself is uncertain here: 1.6× on the bridged
  record, 0.7× without 2023 (90% range 0.1–6.1)."
- Grade C / empty: unchanged.
Bars (one log scale around "1× no change"):
- Raw — hollow. Sub-label "MODIS, then VIIRS".
- Harmonized — solid ink. Value text: "1.6×" followed by the bootstrap range
  "(90% range 0.1–6.1)". Remove the ratio-only bracket everywhere. A value must
  never sit outside its own printed range.
- Aqua only — muted. Sub-label "one MODIS satellite: a consistency check". It is
  no longer called a control anywhere.
- Official area burned — only where available (§2).
Line under the bars, always visible: "Without <largest year>: X×." (so the
dependence on one year is on the first screen).
Proof line: "Bridge tested: leaving one year out, median error 27% · trained on
2012–18, predicting 2019–25: Y% · 13 usable overlap years · How we know →".
Pill: "Bridge quality A" (title: grades the sensor bridge, not the trend).
The first-load choreography stays (raw → harmonized) for robust zones; for an
uncertain zone the number does not count — it fades in.
The first viewport must still fit 1280×800 with four bar rows for All of Canada.

## 4. Calendar and month row (P1)
- 2001-01 to 2002-12 cells and annual bars: DS "partial/computed" hatch (or
  reduced-opacity outline) + tooltip line "Before 2003: partial MODIS coverage
  (Terra only until July 2002). Not used in statistics." Legend entry added.
- Gap-substituted months: tooltip line "NOAA-20 used: S-NPP outage this month
  (documented for July 2024)." Replace the old "possible data gap" status line.
- Fix the foot key "mean before / after 2012, driven by …": name only years
  inside the means' periods (2003–2011 and 2012–last).
- Under the ColorLegend, one sentence: "Colour ramp chosen to stay readable
  with colour-vision deficiency; values are also in the tooltip and the CSV."
  Only state this if the DS documents the ramp as colour-vision safe; otherwise
  write "Values are also in the tooltip and the CSV."
- Month row: ranks and "typical" over 2003–last ("of 23"); title "Every June
  since 2003"; the 2001–2002 marks drawn hatched and excluded; the line "Last
  month available, December 2025: too few detections to compare" appears only
  when December 2025 itself is selected or when the default fell back from it —
  not after the user picks another month. Pay-off sentence updated ("among 14
  VIIRS years … on the bridged record: of 23").
- Raw/Harmonized toggle barely changes cell colours (the judge counted 51 of
  132 pre-2012 cells changing class in Boreal Québec). Make the difference
  visible: when switching views, the annual bars animate and the cells that
  change class get a brief 450 ms outline; add under the toggle a live count
  "Harmonized changes the colour class of N of M months before 2012."

## 5. Story and Method (P1)
- Story example switch: "All of Canada" · "La Rioja" · "This zone". Default
  All of Canada. Step 1 headline from the raw rise ("Did fire activity in Canada
  almost quadruple after 2012?"). Step 3 shows the four bars for Canada and the
  sentence "Official area burned, independent of both sensors: 1.9×."
- Wording to fix everywhere: "about twice as many detections for the same
  fires" → "about twice as many 1 km cell-days as Terra and Aqua MODIS
  together" (it is our measure, not raw pixels); "which never changed sensor /
  the control" → "MODIS alone across the seam gives the same figure by
  construction; Aqua alone agrees. This shows Terra and Aqua agree, not that
  the bridge is right."; any "activity fell / went down" → "detections fell".
- Method: add (a) "What is robust and what is not": the correction factor is
  robust; trends over two short periods depend on extreme years — show for the
  zone the rise, the rise without the largest year, and the bootstrap range;
  (b) hold-out test and monthly error next to the per-year chart; (c) the
  independent check block (§2); (d) "Detection floor": "Below about 10 cell-days
  in a typical month, VIIRS sees fires MODIS could not; no ratio recovers them,
  so those months are not compared."; (e) "The next seam": S-NPP data production
  ended on Nov 2 2026; the record continues on NOAA-20; show the measured
  NOAA-20/S-NPP factor and yearly range for the country (computed), and state
  that 2026 is not in this build; (f) one-sentence answers, as a compact list
  titled "Questions an expert will ask": fire size and biome (ratio is estimated
  inside each box; give the computed range across presets); overpass time
  (ratio absorbs the average sampling difference, not single days); scan angle
  and cloud (monthly sums over many overpasses); MODIS orbit drift (give the
  computed ratio on 2012–2020 vs all years for the country); counts vs burned
  area (see the independent check).
- References list at the end of Method. Verify each by fetching it yourself
  (WebFetch) before listing; list only what you could open, with title and URL:
  NASA Earthdata notice on the S-NPP VIIRS transition for FIRMS users
  (https://www.earthdata.nasa.gov/news/blog/transitioning-from-s-npp-viirs-omps-what-nasa-firms-users-need-know);
  the July 2024 S-NPP anomaly alert
  (https://www.earthdata.nasa.gov/data/alerts-outages/suomi-npp-viirs-data-product-anomaly-july-2024);
  Chen et al. 2026, GFED5NRT (https://essd.copernicus.org/articles/18/7535/2026/).
  If a page does not open or does not say what is claimed (S-NPP end date Nov 2
  2026; outage July 24 2024), drop the claim from the UI and report it.

## 6. Defects to fix (P1)
- Grade-C state at 58–59° N, 75–74° W: the Raw bar overflows the card to the
  left and strikes through its label. Clamp the scale; test extreme values
  (very large and very small rises) on both sides of 1×.
- Exported PNG/SVG: subtitle and legend clipped at the right edge (640 px
  canvas) and font falls back to Arial. Export at 1280 px wide, nothing
  clipped; PNG rendered with the page's fonts; SVG with a sensible font stack
  and a note in the file that fonts are not embedded.
- Story step 1, La Rioja: "mean 2003–2011" label collides with the 2003 bar.
- The date range only changes the display: say so next to the selects in one
  short muted line.
- Northwest Territories box shows "13.6× · Reliability A": with §3 this becomes
  an "uncertain trend" verdict led by the correction factor — verify.

## 7. Ready for 2026 and for real hotspots, without the key (P2)
The team will get a FIRMS API key later; nothing here may call the network.
- tools/build_2026_tiles.mjs: converts the CSV files written by
  /home/claude/export/firebridge/scripts/fetch_firms_2026.mjs (read that script
  for its output layout) into the same tile JSON format, per country, for
  modis, snpp (until its end) and n20, same cell-day rule; NRT rows without a
  `type` column are kept and the month is flagged "provisional, not filtered
  for non-fire sources". Unit-test it on a synthetic CSV you generate from known
  cells.
- build.mjs embeds data/2026/<country>.json when present. The app derives "last
  month available" from the data (no hard-coded December 2025 anywhere) and,
  for months after S-NPP's end, uses NOAA-20 ÷ the box's NOAA-20/S-NPP factor
  (provenance "Computed: NOAA-20 rescaled to S-NPP"). Validate the continuation
  by simulation: hide S-NPP for 2025, continue on NOAA-20, compare with the real
  S-NPP 2025 — report the error per preset.
- build.mjs embeds data/hotspots/<name>.csv when present; the Export menu then
  offers "Raw hotspots (CSV) — <name>" as a real download for that event, and
  keeps the explanatory panel for everything else. Document in a short
  tools/README.md the two commands the team will run once they have the key.
- With no 2026 data and no hotspot files present, the app must look exactly as
  specified above and say plainly that data stop in December 2025.

## 8. Smaller items (P3 — only after P1 and P2 pass all checks)
- Zone picker map: about a dozen place labels per country at their true
  coordinates (Canada: Vancouver, Edmonton, Fort McMurray, Yellowknife,
  Whitehorse, Winnipeg, Toronto, Montréal, Québec, Chibougamau, Sept-Îles,
  Halifax; Argentina: Buenos Aires, Rosario, Córdoba, Mendoza, San Miguel de
  Tucumán, Salta, La Rioja, Chilecito, Resistencia, Neuquén, Bariloche,
  Ushuaia). Small muted labels with a dot; check each falls on land in the
  right place; drop any you are not sure of.
- Footer AI line, accurate: "Code, data processing and analysis were produced
  with extensive AI assistance, directed and reviewed by the team." (The team
  will adjust the wording; do not claim more human authorship than that.)
- Do NOT rename the app, add languages, countries, themes or animations.

## 9. Verification and report
All checks from SPEC §15 again (self-check incl. the new table, copy check for
every preset in both trend states, first-viewport measurements for All of
Canada / Boreal Québec / La Rioja / Chilecito / grade C, axe in both themes,
interaction script incl. exports at 1280 px, no console errors, zero network).
New screenshots, all looked at: first viewport All of Canada (light, dark);
Boreal Québec (uncertain-trend verdict); La Rioja; Chilecito; Northwest
Territories box; the judge's grade-C box; calendar with the 2001–2002 hatch and
a gap month tooltip; month row; story steps 1–3 for Canada; Method blocks
(robustness, independent check, next seam, expert questions); an exported PNG;
phone first screen. Report: the full self-check table; the area-burned data
with source; which claims you could verify by fetching and which you dropped;
flagged S-NPP gap months; continuation-simulation errors; what is done / cut;
remaining flaws; anything in this spec you judged wrong and what you did
instead. Output path unchanged: /home/claude/final/dist/firebridge.html.
