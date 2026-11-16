# FireBridge seasonal preview (EXPERIMENTAL)

A separate build of FireBridge in which the harmonized record uses **one VIIRS ÷ MODIS factor per calendar month**
(shrunk toward the single pooled ratio) instead of one ratio for the whole year. It exists to show the seasonal
correction of `research/SEASONAL.md` working in the app. **Its figures are not the validated ones.** The validated app
(`src/`, `dist/firebridge.html`) is untouched: `src/metrics.js` is still sha256 `779e3785…`.

- Output: `dist/firebridge.seasonal-preview.html` (one offline file, same six embedded data blocks as `dist/firebridge.html`).
- Every tab carries a banner: "Experimental preview · seasonal correction · not the validated figures" with a link to
  the validated app (`firebridge.html` next to the file offline, `./` when hosted; the view in the hash is kept).
- `<title>`: "FireBridge (seasonal preview) · experimental, not the validated figures". No language row (`LANGS = ['en']`).

## Commands
```sh
node research/seasonal-app/build.mjs     # → dist/firebridge.seasonal-preview.html (temp root + junctions, removed after)
node research/seasonal-app/check.mjs     # proof vs research/seasonal.mjs + validated app (exit 1 on mismatch); saved: check.out.txt
node research/seasonal-app/browser.mjs   # page/console errors, banner, figures, screenshots → shots/; saved: browser.out.txt
FB_HTML=<abs path> node tools-win/stripfit.mjs | calhead.mjs | measure.mjs   # layout checks (results below)
```

## What changed (only in `research/seasonal-app/src/`, a copy of `src/`)
Base: `src/` as of 15 Nov 2026 22:05 (it includes the map-image export added to `src/` at 21:50–21:58). If `src/`
changes again, re-copy it and re-apply the edits listed below (each is a small exact-text replacement); `metrics.js`
can be re-applied only while `src/metrics.js` is still the validated `779e3785…`.
- `metrics.js`
  - `bridgeStats`: adds `seasonal = seasonalStats(S, usableYears)`.
  - new `seasonalStats` (+ `SEASON_MIN_W = 0.5`): exactly the method c of `research/seasonal.mjs` (`shrinkParts`:
    jackknife variance of each month's log ratio over the overlap years, DerSimonian–Laird τ², weight
    w = τ² / (τ² + s²), log r_m = log R + w (log ρ_m − log R)). Factor used `f[m]` = shrunk ratio when w ≥ 0.5, else
    the pooled ratio R. Also: leave-one-year-out ranges of the factors used (same usable years as the pooled
    leave-one-out), and the out-of-sample monthly error (each overlap year hidden, factors refitted) for the pooled
    ratio, method c and the preview's factors, with the per-month "still off" factor Σ VIIRS ÷ Σ prediction.
  - `computeZone`: `harm/lo/hi` before February 2012 (and January 2012) = MODIS × f/lo/hi of the calendar month; the
    annual totals (`ann`, `annHarm`), the rise (`riseH`, `riseHlo/hi`), `levels.harmonized` (guard G1 input), the
    trend robustness (guard G2/G5 inputs), the typical month, the colour breaks and the calendar all follow. New
    fields: `seasonal`, `factors`, `riseModis` (MODIS alone), `byMonth[m].factor / w / corrected / residS`.
    `seamWarn` now asks whether an active month is still off by > 1.3× out of sample under the factors used.
  - `calendarData`: the January 2012 note shows the January factor.
  - Unchanged: the pooled ratio (still the "VIIRS ÷ MODIS" figure, the verdict's ÷ factor, `validation`,
    `step.override`), the raw series, the monthly check `monthly` (guard G6 stays on the pooled ratio), the grade,
    borrowing, and the map (`cellStats`, `monthLayer`: local pooled ratio).
- `guard.js`: unchanged (byte-identical).
- `official.js`: `perKm2.harmBefore` uses `annHarm` (was ratio × MODIS).
- `copy.js`: `mfac` (factor of a month: "3.48 in March", or the pooled ratio when it falls back), `modisAloneLine`
  (MODIS alone vs harmonized, computed for the zone; returns nothing for a guarded or uncertain zone, which gets
  `MODIS_ALONE_UNCERTAIN` and no figure).
- `CalPanel.jsx`: seam "MODIS × month factor (2.10 over a year) | VIIRS" (short "MODIS × month factor" when the seam
  is near the left edge); readout "Estimated from the older satellite (MODIS × 3.48 in March)" or the pooled wording
  when the month falls back; the off-fit flag uses the out-of-sample residual of the factor used; notes reworded.
- `MonthRow.jsx`, `Evidence.jsx`: the "off" caveat/outline uses the out-of-sample residual of the factors used;
  "exact in annual totals by construction" removed.
- `Method.jsx`: one paragraph "Experimental preview: seasonal correction" (method, shrinkage, fallback, out-of-sample
  figures from `research/seasonal.mjs`, the same test for the zone shown, the assumption) and three rows in the
  ratio-by-month table (Weight w, Factor used, Still off ×); the sentence "the method is not changed" removed.
- `Overview.jsx`, `Story.jsx`: "MODIS alone gives the same answer, by construction" replaced by the computed
  difference (Canada: MODIS alone 2.01×, 0.1% below the harmonized 2.01×), or by a no-figure sentence when the
  trend is uncertain/guarded.
- `Verdict.jsx`, `How.jsx`: "× month factors (2.10 over a year)".
- `exports.js`: the series CSV header says EXPERIMENTAL SEASONAL PREVIEW and lists the 12 factors and weights; the
  calendar image subtitle says "MODIS × month factor (2.10 over a year) … EXPERIMENTAL seasonal preview".
- `App.jsx`, `lang.js` (`validatedUrl`), `v5.css`: the banner.

## Check output (check.out.txt, browser.out.txt)
- **Equality with the prototype: PASS.** For all 9 zones the 12 shrunk ratios, the weights, R and τ² equal
  `research/seasonal.mjs`'s `shrinkParts` (max difference 0, tolerance 1e-9); the out-of-sample median monthly
  errors equal its `evaluate` (pooled and method c, same n). The research baseline itself still reproduces the app
  ("ALL MATCH").
- **Key figures:** Canada 16.5% → 11.7% (165 months), Argentina 11.7% → 6.9% (167); with the preview's fallback rule
  the same (all 12 months have w ≥ 0.5 in both countries). Worst month out of sample: Canada Mar 1.95× → Feb 1.19×;
  Argentina Mar 1.20× → Nov 1.01×.
- **Headline rises** (validated → preview): Canada 2.009 → 2.011 (+0.10%), Argentina 0.681 → 0.684 (+0.42%), Boreal
  Québec 1.628 → 1.666 (+2.3%, guarded: no headline rise), Chibougamau unchanged (no month with w ≥ 0.5), Côte-Nord 2.036 →
  2.138 (+5.0%, guarded: no headline rise), La Rioja 0.766 → 0.791 (+3.2%, uncertain: the headline shows the ÷ factor), Córdoba 0.554 → 0.557, Tucumán
  0.554 → 0.552, Chilecito 1.187 → 1.256 (+5.8%, uncertain: the headline shows the ÷ factor). Raw rises and pooled ratios identical.
  MODIS alone vs preview harmonized: +0.10% Canada, +0.42% Argentina, up to +6.6% Chilecito.
- **Official area burned (Canada, 2012–2024 ÷ 2003–2011):** official 1.92; harmonized 1.88 validated, 1.88 preview.
- **Verdicts:** no preset changes (Canada robust, Argentina robust, Córdoba robust, Tucumán robust, La Rioja and
  Chilecito uncertain, Boreal Québec, Chibougamau, Côte-Nord guarded G2). Grid of 2° boxes (528 with detections):
  12 change, listed in check.out.txt — 3 × "uncertain (G6)" → "uncertain" (still no success chip), 3 × uncertain →
  guarded G5, 2 × guarded G5 → uncertain, 1 guarded G2 → G5, 1 uncertain → guarded G1, 1 uncertain → robust
  (Argentina S −32…−30, W −66…−64: 90% range 0.39–1.03 → 0.40–0.99), 1 robust → uncertain (Argentina S −30…−28,
  W −62…−60: 0.62–0.97 → 0.63–1.00). All are boxes whose range sits at the edge of 1×.
- **Calendar cells 2001–2011 changing colour class** (harmonized view, class breaks unchanged in every zone):
  Canada 13/132, Argentina 13, Boreal Québec 2, Chibougamau 0, Côte-Nord 5, La Rioja 9, Córdoba 27, Tucumán 9,
  Chilecito 14.
- **Browser:** 64 screens (8 tab/steps × Canada, Argentina, La Rioja, Boreal Québec × 1440 and 390): no page error,
  no console error, banner visible on each, title and validated link correct. Hero and ratio equal the validated app
  for the 8 zone/view pairs checked (the hero is rounded to one decimal).
- **Layout (tools-win, final build):** stripfit 84 checks / 0 failed; calhead 360 / 0; measure "ALL HEIGHT/WIDTH
  CHECKS PASS" with the same 15 CLIP notes (same screens) as the validated app. (One calhead run made while five Chrome
  checks ran at once reported 1 failure at a 320 px panel, dark/anomaly; the rerun on the final build passed.)
- Screenshots looked at: `shots/cal-canada-2005-03.png`, `cal-argentina-2005-03.png`, `cal-larioja-2005-03.png`,
  `phone-cal-canada.png`, `overview-canada.png`, `method-seasonal-canada.png`, `banner.png` and others in `shots/`.

## Known limits
- It assumes the 2012–2025 monthly ratios also held in 2001–2011 (the backward time hold-out in
  `research/SEASONAL.md` supports this; it cannot prove it).
- No clear gain in small zones (Boreal Québec, Chibougamau, Côte-Nord, Chilecito: p ≥ 0.17); their rises move by up to
  5.8%, but none of them is a headline figure (guarded or uncertain zones show the ÷ factor), and the guard is unchanged.
- The annual leave-one-year-out error is slightly worse with month factors (Canada 3.0% → 3.6%); the gain is in
  off-season months.
- Not covered by the project's self-check (`tools/selfcheck.mjs`, `scdiff.sh`), copycheck, coherence, axe or the
  i18n builds; only by `check.mjs`, `browser.mjs` and the three layout checks above. English only.
- The map (record years, This month) keeps the single local ratio per place.
- The year-by-year leave-one-out panel (Evidence, How 2), the "month by month 16%" line, the grade and guard G6 still
  test the pooled ratio (as validated); the month factors' own out-of-sample test is printed in Method only.
- `src/` was being edited by someone else during this work; the copy was re-synced at 22:05 (see "Base" above).

## If the team publishes it
Sentence for the project page:
> An experimental build with the seasonal correction is online at <url>; its figures are not the validated ones.
