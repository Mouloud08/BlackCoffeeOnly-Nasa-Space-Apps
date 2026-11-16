# Would a seasonal correction harmonize better than one ratio?

Research prototype, outside the app (nothing in `src/`, `tools/` or `dist/` was changed). Every number below is printed
by `node research/seasonal.mjs` (deterministic, no network), which imports the app's own
`src/metrics.js` and the tile loader `tools-win/tiles.mjs`.

## The question
FireBridge puts MODIS (2001+) and VIIRS (2012+) on one scale with **one** ratio per zone: VIIRS ÷ MODIS over 2012–2025
(2.10 for Canada, 2.13 for Argentina), applied to every MODIS month before 2012. But the ratio is not the same every
month: in Canada it is 4.10 in March and 1.73 in May. So the harmonized calendar (months × years) is off by up to
**1.95×** in March. Would one ratio per calendar month do better **on data it has not seen**?

## How it was tested
- **Same yardstick as the app.** The harness first reproduces the self-check for all 9 zones: the ratio, the
  leave-one-year-out error and the month-by-month error (e.g. Canada 2.1049, 3.00 %, 16.38 % on 165 months). All
  match to 1e-9, and the 12 per-month ratios match the app's "ratio by calendar month". Chilecito uses the wider
  "borrowed" box, as the app does.
- **Out of sample.** Each of the 14 overlap years is hidden in turn. The ratio(s) are estimated on the other 13
  years, then used to predict the hidden year's VIIRS months from its MODIS months. Months count when both sensors
  have ≥ 30 cell-days (the app's rule). Error = |predicted − VIIRS| ÷ VIIRS.
- **Methods.**
  - **a.** One pooled ratio (today).
  - **b.** One ratio per calendar month.
  - **c.** Per-month ratios **shrunk toward the pooled ratio** (empirical Bayes):
    log r_m = log R + w_m (log ρ_m − log R), with w_m = τ² / (τ² + s_m²). Here s_m² is the year-to-year (jackknife)
    variance of that month's log ratio, and τ² is the real between-month spread (DerSimonian–Laird). A noisy month
    gets w ≈ 0 (the pooled ratio), and so does a month carried by a single year (infinite variance).
  - **d.** A smooth yearly curve (first harmonic, count-weighted).
  - **e.** Two ratios: fire season and off-season.
  - **f.** A hard rule: a month keeps its own ratio only if it would earn grade A under the app's own `ownGrade`
    (≥ 10 usable years, error ≤ 30 %, spread ≤ 10 %); every other month uses the pooled ratio.
- **Extra checks.** A sign test over held-out **years**, not months: the months of one year share the same fires, so
  they are not independent. A time hold-out in both directions (train 2012–18 → test 2019–25, and the reverse).

## Results (out of sample)
| | Canada a (today) | Canada b | Canada **c** | Canada d | Canada e | Argentina a | Argentina b | Argentina **c** | Argentina d | Argentina e |
|---|---|---|---|---|---|---|---|---|---|---|
| median monthly error | 16.5 % | 11.2 % | **11.7 %** | 15.0 % | 17.2 % | 11.7 % | 6.8 % | **6.9 %** | 7.0 % | 7.4 % |
| fire season / off-season | 9.0 / 24.4 % | 8.3 / 13.8 % | **8.5 / 15.7 %** | 9.8 / 22.9 % | 9.0 / 27.2 % | 9.2 / 15.6 % | 7.0 / 6.1 % | **7.2 / 6.8 %** | 7.2 / 6.9 % | 7.8 / 6.3 % |
| worst calendar month | Mar 1.95× | Feb 1.03× | **Feb 1.19×** | Mar 2.12× | Mar 2.08× | Mar 1.20× | Apr 1.01× | **Nov 1.01×** | Nov 1.10× | Nov 1.12× |
| held-out years better / worse than today | — | 12 / 2 | **12 / 2 (p 0.0065)** | 9 / 5 | 4 / 10 | — | 14 / 0 | **14 / 0 (p 0.000061)** | 14 / 0 | 14 / 0 |
| backward hold-out (train 2019–25, test 2012–18) | 15.5 % | 13.7 % | **13.5 %** | 12.3 % | 17.7 % | 11.8 % | 7.1 % | **6.6 %** | 7.9 % | 7.6 % |
| annual error (leave-one-year-out) | 3.0 % | 4.0 % | 3.6 % | 3.0 % | 2.0 % | 2.7 % | 2.4 % | 2.5 % | 2.3 % | 2.7 % |

**All 9 zones** (change in median monthly error; helped / hurt / unchanged within ±0.5 pt):
- b: 6 / 2 / 1. It hurts Boreal Québec (+2.6 pt) and Chibougamau (+1.8 pt). In the time hold-out, Chibougamau goes
  from 11.1 % to 41.3 %: the per-month ratios overfit the small boxes.
- **c: 7 / 0 / 2.** The worst result is Chibougamau at +0.5 pt on 10 months.
- d: 7 / 2 / 0.
- e: 5 / 3 / 1.
- f: 4 / 0 / 5.

In the small zones (Boreal Québec, Chibougamau, Côte-Nord, Chilecito), no method wins significantly by held-out
years (c: p ≥ 0.17).

## Side effects that matter for honesty (method c, ratios fitted on 2012–2025)
- **Headline rise.** Canada stays at 2.01×, Argentina at 0.68×; both move by 0.4 % or less. The harmonized figure no
  longer equals "MODIS alone" exactly. With raw per-month ratios (b), the rise is exactly MODIS alone × (MODIS-weighted
  mean month ratio after ÷ before 2012). That factor is 0.998 for Canada and 1.002 for Argentina, because the month
  mix of the fires is nearly the same before and after 2012. Shrunk ratios (c) behave the same within 0.4 %. Small
  zones move more: Côte-Nord +5.4 %, Chilecito +5.1 %, Boreal Québec +2.4 %. This has to be disclosed.
- **Official area burned (Canada, 2012–2024 ÷ 2003–2011).** Official 1.92; harmonized 1.88 today and 1.88 with c.
- **Calendar.** 13 of the 132 cells for 2001–2011 change colour class in Canada (17 with b), and 13 in Argentina.
  The class breaks do not change in any zone.
- **Uncertainty.** In Canada, the per-month leave-one-out ranges are tight (spread 2–15 %). February (15 %) and
  March (11 %) miss the grade-A bar, so the hard rule f falls back to the pooled ratio exactly where the error is
  largest: February stays 1.77× off. All 12 Argentine months are grade A. In the small zones, most months have ≤ 2
  usable years. Months with no usable year get weight 0.00–0.08 from c, which means the pooled ratio: Boreal Québec
  Jan–Apr and Nov–Dec, including March at 17.00 from a few cell-days. **Proposed fallback rule: the shrinkage weight itself.** A month counts as "seasonally corrected" in
  the copy only when w_m ≥ 0.5; otherwise it shows the pooled ratio.

## Conclusion
Yes, at country scale. Per-month ratios shrunk toward the pooled one beat the single ratio out of sample:
- **Canada:** median monthly error 16.5 % → 11.7 %, better in 12 of 14 held-out years.
- **Argentina:** 11.7 % → 6.9 %, better in 14 of 14 held-out years.
- The gain holds in a backward time hold-out.
- It cuts Canada's worst-month residual from 1.95× to 1.19×.

The limits:
- **Where the gain comes from.** Almost all of it is in off-season months. During the fire season the single ratio
  was already good (Canada 9.0 % → 8.5 %).
- **What it does not fix.** It does not improve annual totals (Canada 3.0 % → 3.6 %), and it does not change the
  headline rises. In small zones it neither clearly helps nor (shrunk) hurts.
- **Methods that failed.** The smooth curve d and the season split e fail in Canada: its spring peak is too sharp for
  them. Raw per-month ratios b overfit small boxes.

## Recommendation: B tonight, C after the deadline
**B. Sentences for the project page** (numbers printed by the script):
> Next step, measured but not yet in the app: a seasonal correction (one VIIRS ÷ MODIS ratio per calendar month,
> shrunk toward the single ratio when a month has few fires) predicts held-out VIIRS months better than today's
> single ratio: median monthly error 16.5 % → 11.7 % in Canada and 11.7 % → 6.9 % in Argentina, lower in 12 of 14
> and 14 of 14 held-out years, and Canada's worst calendar month goes from 1.95× off to 1.19×. It leaves the headline
> rises unchanged (Canada 2.01×, Argentina 0.68×) and brings no clear gain in small zones, so the uncertainty guard
> stays.

**C. Integration plan (about 2–2.5 person-days):**
1. **`src/metrics.js`.**
   - `bridgeStats`: add the shrunk month ratios `rm[12]`, their weights `w[12]`, τ, and per-month leave-one-year-out
     ranges. `monthly` becomes the out-of-sample error of `rm`, with the pooled error kept for comparison.
   - `computeZone`:
     - `harm/lo/hi[i] = rm/rmMin/rmMax[m] × MODIS` for i ≤ VJ.
     - `ann(y, ·)`, `riseAt`, `levels` and `trend` take the 12 ratios.
     - `byMonth.resid` and `seamWarn` are measured against `rm` out of sample.
   - `calendarData`: the January 2012 note uses `rm[0]`. `validation`/`step.override` keep the pooled ratio as the
     zone's headline factor.
   - `cellStats` and `monthLayer` (the map) keep the local pooled ratio. Places have too few months per calendar
     month, and annual records barely move.
   - The sha256 of `metrics.js`, and therefore `scdiff.sh` "IDENTICAL TO V4", change on purpose. Write a new
     reference.
2. **Self-check output.** Per zone: the 12 shrunk ratios, weights and τ, the pooled vs seasonal out-of-sample monthly
   error, the worst month (both), the rise vs MODIS alone (difference shown), the official check, and the number of
   calendar cells that changed. Then re-run copycheck, coherence, measure and axe.
3. **Wording.**
   - Seam label "MODIS × 2.10" → "MODIS × month factor (2.10 over a year)".
   - Readout "Estimated from the older satellite (MODIS × 2.10)" → "… (MODIS × 2.64 for January; 2.10 over a year)",
     or "(MODIS × 2.10, single ratio: too few fires this month)" when w_m < 0.5.
   - Method tab: a 12-bar ratio strip with leave-one-out ranges (extend `RatioStrip`). Replace "harmonized equals
     MODIS alone by construction" with "within 0.4 % of MODIS alone (seasonal weighting)".
   - Guard: G4/G6 unchanged on the pooled ratio. Add "seasonal shape not used" when no month has w_m ≥ 0.5.
4. **Risks.**
   - It assumes the monthly ratios of 2012–2025 also held in 2001–2011. The time hold-out supports this but cannot
     prove it.
   - The honesty rule "MODIS-only equals harmonized" must be reworded.
   - Small zones move by up to 5.4 % with no measured gain.
   - It adds complexity to every check and to the copy (`copy.js`, `i18n/`).
