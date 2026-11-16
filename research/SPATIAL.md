# Does a place-aware or floor-aware correction beat the zone ratio?

Research prototype, outside the app. Script: `node research/spatial.mjs` (deterministic; it also writes
`research/spatial.out.txt`). Every number below is printed by that script. Nothing in `src/`, `tools/` or `dist/` was
changed.

## The question
FireBridge puts MODIS (2001+) on the VIIRS scale (2012+) with one ratio per zone: VIIRS ÷ MODIS over 2012–2025, and
every month before 2012 is multiplied by it. A judge called this "the first thing anyone would try" and pointed at the
**detection floor**: VIIRS sees small fires MODIS misses entirely, and zero times a ratio stays zero. We tested whether
a correction that changes **from place to place**, or that adds a **floor term**, predicts VIIRS better.

## How it was tested
- Data: the app's own 0.5° monthly tiles and functions (`src/metrics.js`, `src/guard.js`, `tools-win/tiles.mjs`).
- **Baseline reproduced first, all MATCH:** country ratio 2.10 / 2.13, leave-one-year-out error 3 % / 3 %, hold-out
  7 % / 5 %, local-ratio percentiles 1.60 / 2.02 / 3.53 and 1.44 / 1.97 / 3.16, 62 / 27 places above 4×, floor 4.1 % /
  5.5 % (Canada / Argentina). Rebuilding the app's verdict for every 2° box with our own code gives 0 differences.
- **Out of sample:** each of the 14 overlap years is hidden in turn; parameters are fitted on the other 13; the hidden
  year's VIIRS counts are predicted from its MODIS counts, for every 0.5° place and month, then summed to 2° boxes
  (fixed even-degree grid: 467 boxes in Canada, 102 in Argentina) and to the country.
- Error = total absolute error ÷ total VIIRS (WAPE), except the country-month column (median relative error).
- Variants: **a** one country ratio · **b** one ratio per 2° box (today's method at click size; under 300 cell-days the
  country ratio) · **b0** = b fitted only on months where MODIS saw something, no floor · **c** each place's own ratio
  shrunk toward its box's ratio (empirical Bayes, strength chosen by an inner leave-one-year-out: 1,000 MODIS cell-days
  in Canada, 100 in Argentina; capped at 4×) · **d1** b0 + a **floor**: where MODIS saw nothing, the place's average
  VIIRS in that calendar month over the training years (zero where VIIRS never saw fire there) · **d2** the same floor
  averaged over the 2° box · **e** a country ratio that depends on the month's MODIS count · **f** e + the d1 floor.

## Results
Out-of-sample error, Canada / Argentina (lower is better):

| variant | 0.5° place, annual | 2° box, annual | 2° box, monthly | country, monthly | years better than b (2° box, annual, of 14) |
|---|---|---|---|---|---|
| a country ratio | 26.6 / 26.1 % | 19.1 / 17.8 % | 25.1 / 25.0 % | 16.8 / 11.7 % | 2 / 0 |
| **b zone ratio (today)** | **24.6 / 21.9 %** | **15.5 / 9.9 %** | **22.3 / 20.0 %** | **12.8 / 9.5 %** | — |
| b0 zone ratio, MODIS > 0 months | 23.4 / 21.2 % | 15.4 / 10.7 % | 21.1 / 19.4 % | 21.6 / 11.7 % | 4 / 4 |
| c place ratio shrunk to zone | 24.4 / 17.5 % | 15.2 / 9.7 % | 22.1 / 19.5 % | 13.3 / 11.1 % | 10 / 10 |
| **d1 zone ratio + place floor** | **22.4 / 20.1 %** | **14.1 / 9.1 %** | **20.1 / 18.3 %** | **9.3 / 6.9 %** | **13 / 12** |
| d2 zone ratio + zone floor | 23.1 / 21.4 % | 14.1 / 9.1 % | 20.1 / 18.2 % | 9.4 / 6.1 % | 13 / 13 |
| e ratio by activity level | 25.6 / 25.8 % | 18.2 / 18.1 % | 24.1 / 23.7 % | 17.6 / 11.8 % | 3 / 0 |
| f activity ratio + place floor | 25.0 / 25.6 % | 18.0 / 18.3 % | 23.4 / 23.6 % | 12.1 / 8.2 % | 3 / 0 |

What each variant does to the past (fitted on all overlap years, applied to 2003–2011):

| variant | fire placed where MODIS saw nothing (share of 2003–2011) | Canada rise (app 2.01×) | Canada 2012–2024 vs official 1.92× (app 1.88×) | Argentina rise (app 0.68×) | 2° box verdicts changed (Canada of 467 / Argentina of 102) |
|---|---|---|---|---|---|
| a | 0 % / 0 % | 2.01× | 1.88× | 0.68× | 8 / 8 |
| b | 0 % / 0 % | 2.10× | 1.96× | 0.69× | 1 / 2 |
| b0 | 0 % / 0 % | 2.22× | 2.08× | 0.73× | 12 / 6 |
| c | 0 % / 0 % | 2.10× | 1.97× | 0.71× | 1 / 2 |
| d1 | 8.1 % / 3.1 % | 2.04× | 1.91× | 0.71× | 5 / 3 |
| d2 | 8.1 % / 3.3 % | 2.04× | 1.91× | 0.71× | 5 / 5 |
| e | 0 % / 0 % | 2.12× | 1.98× | 0.73× | 6 / 9 |
| f | 7.7 % / 3.1 % | 1.95× | 1.83× | 0.71× | 13 / 12 |

(The app uses **a** for a whole country and **b** for a box; its own box verdicts are 23 rise / 5 decline / 271
uncertain / 168 not harmonized in Canada, 6 / 27 / 57 / 12 in Argentina, so "changed" also counts the 1 / 2 boxes where
our simplified b already differs from the app's borrowing rule.)

## What we learned
1. **Place-by-place ratios do not help at the scale the app shows.** Shrunk local ratios (c) cut the error of single
   0.5° places in Argentina (21.9 → 17.5 %, better in all 14 years) but not in Canada (24.6 → 24.4 %), and do almost
   nothing for 2° boxes (15.5 → 15.2 %, 9.9 → 9.7 %). In Canada they overfit (18.6 % in sample → 24.4 % out of sample).
   A ratio that depends on activity (e) loses to the zone ratio everywhere, even though Argentina's ratio does climb for
   tiny months (3.19 for one MODIS cell-day, 1.89 at ≥ 100; Canada 2.07 vs 2.05).
2. **The floor is real and steady.** VIIRS cell-days in place-months where MODIS saw nothing stay at 5,007–6,668 a year
   in Canada (median 5,601) while total VIIRS ranged from 21,664 (2020) to 510,715 (2023); 4,892–6,459 in Argentina. As
   a share it swings from 1.3 % to 23.1 %, which is why a ratio cannot capture it and an added term can.
3. **The floor model (d1) is the only variant that beats the zone ratio consistently**: for places, boxes and country
   months in both countries, in 13 and 12 of the 14 held-out years for 2° boxes (one exception: Canada's annual
   country total, 3.8 % median error against 2.8 %). The gain is modest for boxes (15.5 → 14.1 %,
   9.9 → 9.1 %) and largest month by month at country scale (12.8 → 9.3 %, 9.5 → 6.9 %). The refit ratio alone (b0)
   does not do it: it under-predicts totals (country, monthly 21.6 %); the floor puts the missing mass back.
4. **Headlines barely move:** Canada 2.01× → 2.04× (official area burned 1.92×; d1 reads 1.91× on the same years, the
   app 1.88×, so the official check cannot tell them apart), Argentina 0.68× → 0.71×. Box verdicts: 5 of 467 and 3 of
   102 change.

## Honesty checks
- **It is an assumption about the past.** d1 places 51,367 cell-days (8.1 % of Canada's 2003–2011 total; 42,648 or
  3.1 % in Argentina) in months where MODIS recorded nothing. It assumes the 2012–2025 floor of each place and calendar
  month also held in 2003–2011. Its stability from the quietest to the busiest year of 2012–2025 supports that, but
  nothing before 2012 can confirm it. Defensible only as a labelled estimate, never as a measurement.
- **Never at the scale of one place-month:** where MODIS saw nothing, the floor's error is 130 % (Canada) / 111 %
  (Argentina) of the VIIRS there, worse than predicting zero (100 %). It only pays off once summed (year, box, country).
- **Where everything fails:** places with under 50 MODIS cell-days in 14 years (2,536 in Canada, 486 in Argentina)
  keep 67–87 % (Canada) and 78–87 % (Argentina) error under every variant but d2; the map's > 4× places stay poor (d1 31 % / 66 %, b 37 % / 83 %); quiet
  months get slightly worse with a floor (Canada 67 → 71 %). The box-wide floor (d2) spreads fire to places VIIRS
  never saw (141 % error on Argentina's sparse places): rejected.

## Recommendation: B tonight, C after the deadline (floor only)
No place-aware correction clearly beats the zone ratio where it matters; the floor-aware one does, consistently but
modestly, at the price of an explicit assumption. Do not change the app tonight. Put this on the project page:

> "Next step, already tested out of sample: adding a detection floor (the small fires VIIRS sees where MODIS saw
> nothing, estimated for each 0.5° place and calendar month) to the zone ratio lowered the error of predicted VIIRS
> counts in 2° boxes from 15.5% to 14.1% in Canada and from 9.9% to 9.1% in Argentina (leave-one-year-out; better in
> 13 and 12 of 14 years) and barely moved the national figures (Canada 2.01× → 2.04×, official area burned 1.92×;
> Argentina 0.68× → 0.71×). It is not in the app because it adds fire to months where MODIS recorded none (8.1% of
> Canada's 2003–2011 total): an assumption about the past, not a measurement."
>
> "Ratios that vary place by place (each 0.5° place shrunk toward its zone) did not help at the 2° scale (15.5% →
> 15.2% in Canada, 9.9% → 9.7% in Argentina), so the app keeps one ratio per zone."

**Plan for C (after the deadline, about 1.5–2 days):**
- `metrics.js`: a new `floorTable(C)` (per place × calendar month: mean VIIRS over 2012–LAST place-months where MODIS = 0);
  `boxMonthly` also returns the box's floor for each MODIS month; `bridgeStats` fits the ratio on MODIS > 0 months and
  its leave-one-out / hold-out / monthly checks predict with ratio + floor; `computeZone` builds `harm` (and `lo`/`hi`)
  as r × MODIS + floor before 2012. `cellStats`, `monthLayer` and the map stay ratio-only (place-month error > 100 %).
  `floorShare` stays; add the floor's share of each zone's 2003–2011 total.
- Self-check must print: the b vs d1 table above (place, box, country), the floor per year in cell-days, the share
  added before 2012 for every preset, and the rise and official check with and without the floor. Every figure in
  CLAUDE.md §5 changes, and so does the `metrics.js` hash (the "identical to v4" check must be rebased on purpose).
- UI wording: "Harmonized = MODIS × r, plus about N cell-days a year of small fires MODIS cannot see (estimated from
  2012–2025, not measured)"; the provenance line of pre-2012 months says "Computed: includes a floor estimate".
- Guard: a zone whose floor exceeds a fixed share of its 2003–2011 harmonized total (to be set before looking at
  results, e.g. a quarter) shows "trend uncertain"; the floor is never shown for a single place-month.
- Risks: the floor may contain non-fire heat sources (not investigated, as for the > 4× places); 2026 provisional
  months must not feed it; the pre-2012 stationarity cannot be verified.
