# FireBridge v5.2 — state coherence and sense review (working notes)

State model: see CLAUDE.md §0.3 (table: who changes each piece of state, what reacts, what resets it).
Checker: `tools/coherence.mjs` — self-test (injected faults must be caught), scripted order-independence pairs,
seeded random walk over 26 action kinds with DOM ⇔ state invariants after every action.

## D. Sense review (situation → what was wrong → rule adopted → before / after)

| # | Situation | What was wrong | Rule adopted (why least surprising) | Before → after |
|---|---|---|---|---|
| 1 | Month chip on first load | The chip appeared whenever the shown month differed from the zone default; the hash always carried `m=` even if the user never chose a month | A month exists in the UI only when the user chose it (`mPicked`). The default month is a readout, not a selection | chip on Boreal at load, `m=` always in hash → no chip, no `m=` until a month is clicked |
| 2 | Zone change with a chosen month | The month was reset to the new zone's default (autoSel), losing the user's choice | Every zone covers the same months, so a chosen month stays; an unchosen month follows the zone | zone then month ≠ month then zone → identical screens (tested) |
| 3 | Clearing a month | × only; clicking the same cell re-selected it | ×, Esc, and clicking the selected cell again all clear it everywhere (chip, readout, map layer, hash) | — → all three paths clear |
| 4 | Date range excluding the chosen month | The chip kept pointing at a month outside the visible years | A chosen month outside the new range is cleared visibly | stale chip → cleared |
| 5 | Month chosen while the map shows another layer | The month had no visible effect on the map | The map does not switch layer by itself (the user chose that layer); the hint line says "<Month> is selected in the calendar. Show it on the map" | silent → one-click affordance |
| 6 | "This month" layer with no month chosen | It showed December (off-season, nearly blank) under a generic name | It opens on the zone's record month and marks it chosen (chip + hash), so the layer always names its month | blank Dec 2025 → record month, named |
| 7 | 2001–2002 month on the This-month layer | Ranked as if it counted | 2001–2002 (Terra-only, not in statistics) are not ranked: the layer says so and asks for a month from 2003; the readout says "partial MODIS coverage: not used in statistics" | ranked → explained |
| 8 | Anomaly readout | Worded with cell-days first | Anomaly view leads with the anomaly and drops cell-days | — |
| 9 | Raw view and the checks | "Holds without 2023" (harmonized) shown under a raw hero with no qualifier | In Raw view the Checks label reads "Checks · on the harmonized record" | ambiguous → labelled |
| 10 | Borrowed ratio on the calendar seam | "MODIS × 2.15" without saying it came from a wider area | Seam label adds "(wider area)" when the ratio is borrowed | — |
| 11 | Provisional month in the readout | Presented like a complete month | Readout adds "provisional (near-real-time)" | — |
| 12 | Map hover → calendar year column on Sensor effect / Detections layers | The link fired on layers that are not about record years | The hover-to-year link exists on Record years only | — |
| 13 | Pending "Back to …" after a zone change made elsewhere | Undo could restore a zone from before an unrelated preset or country change | A map undo is dropped when the zone changes by any other route, and on country change | stale undo → dropped |
| 14 | Draw mode and other controls | Stayed on after layer / country change or opening a popover | Draw mode exits on Esc, finishing a draw, layer change, country change, any popover opening, tab change | — |
| 15 | Hover highlights after a tab change | Year highlight could stay when the map unmounted | Tab change clears both hover links; map unmount clears mode and hover | — |
| 16 | Peek and window focus | Holding Raw then switching window could leave raw shown | Peek ends on release, pointer cancel or window blur (pointer and R key) | — |
| 17 | Back / Forward | history used replaceState only: Back left the app | Each user step pushes a history entry (bursts < 600 ms replace) and popstate restores the state | Back leaves the page → Back steps through states |
| 19 | Calendar header with a chosen month | The chip shrank behind overflow:hidden ("Augu"); choosing a month could push the header onto a second row (layout shift) | The chip form is decided from the room the other controls leave, measured with hidden probes of the longest labels: "September 2019", else "Sep 2019", else a second row that is reserved whether or not a month is chosen | clipped / shifting → never clipped (360/360), no shift on select/clear |
| 18 | Box counters for a small box | "within chance" for a box with few places | Box counters only at ≥ 30 places, else "Whole country:" (since 5.1; asserted by the checker) | — |

Choices the user may want to overrule: #5 (no automatic layer switch), #6 (This-month marks the record month as chosen),
#2 (a chosen month survives zone changes), #17 (history entry per step).

## Test results
See the final report; raw outputs in /tmp/X-*.txt at the time of the run.

## v6
- Overview invariants: its country toggle = app country; hold button aria-pressed = raw state; chart class follows it;
  primary button present. Overview figures = strip figures for the whole country (both views, both countries).
- Guard invariant: no non-÷ hero and no success chip when a zone is guarded.
- Default month: peak month of the last complete calendar year (comparable months only); still a default (no chip,
  not in the hash); a chosen month stays (mPicked rule unchanged).
