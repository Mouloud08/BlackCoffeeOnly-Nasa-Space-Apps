# Version 6 — working notes
- v6 = copy of v5 (5.2 frozen). Overview tab: src/Overview.jsx, CSS at the end of src/v5.css, headline rules in copy.js.
- Bare URL opens Overview; any hash state opens where it points (state.js).
- Chart: linear scale, harmonized solid, raw outline before 2012 (from 2012 both records are the same VIIRS
  measurement, so a "raw outline above the bars from 2012 on" would be false: deviation from the first spec).
- Priority order after the judge's report: C1 guard, C2 download+unit, Overview with A1–A7, C3, C4, C5, B1–B5.
- C1 guard: thresholds G1 harmonized before-2012 mean < 50 cell-days/yr, G2 90% range hi/lo > 10 (or lo = 0), G3 no
  rise. 58–59°N 100–99°W: before "48.4× harmonized", green "Holds without 2013: 9.7×" → after "÷2.4 · Raw reads 2.4×
  too high · No trend: too little data", neutral "Too little data for a trend", reason: only 6 cell-days a year before 2012.
- Guard also catches the three Québec reference zones (Boreal 0.13–4.7, Chibougamau 0.08–7.9, Côte-Nord 0.42–5.8:
  ranges wider than ×10); they were "uncertain" before; now no rise figure is printed for them.
- C4: subtitle in the top bar's free space (container query; hidden < 12.5 rem of room, e.g. dashboard at 1280);
  pill "Pre-2012 computed" / "As recorded" (stacked, constant width, dashed, quiet); default readout = peak month of
  the last complete calendar year ("Peak month of 2025: …"), not in the hash; Terra note over 2001–02; Aqua key
  "Aqua alone (consistency check)"; margin caption "typical month, 2003–2025" above the bars with a gap; light
  --seq-0 #f3d09f, --seq-1 #ee9c5c (cvd PASS, monotonic L* 85→4).
- C5: Evidence 4th panel Records / Official / By month (Canada too); off-season flag (residual > 1.3×: Feb, Mar,
  Dec in Canada; none in Argentina) in readout + month card; Spearman official vs harmonized 2003–2024 n=22: 0.96
  (raw 0.84; earlier judge quoted 0.97 — same within rounding, 0.965); "<1%" error labels; provenance wording "tile
  counts not re-checked against the FIRMS points here (done for the Québec reference zones)"; Aqua dotted outline;
  map: Draw area top-right, halo dots, labels need ≤ 2 % data under plate, far positions with leader lines, new
  labels Québec, Sherbrooke, La Rioja in the country-scale list; phone/tablet open on the Calendar panel.
- B1 one-line "Harmonized: 90% range 0.57–0.82"; B2 header gap → chip fits at 1920; B3 zone names wrap / compact
  button shortens; B4 CLS: grid fit reads DOM size (load 0.029 → 0.001), zone-button min width, fixed strip
  proportions ≥ 1366, zoom-to-zone always present; Overview chart/figures keyed by country (toggle CLS 0.030 → 0).
- v6.1: phone Overview order (figures + button before the chart; lede/honest after); phone raw level label dropped
  (legend entry added); rule C wording; Evidence "Monthly"; error label beside low dots; map leaders may not cross
  data; headline measure widened ≥ 1680 (2 lines at 1920 and 2560).
