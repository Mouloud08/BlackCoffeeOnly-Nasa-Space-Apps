# Notes for the interface team (data hand-off, 15 November 2026)

Written while adding the real 2026 data (record now ends October 2026) and two real hotspot files. Items 1 and 14 were
changed in this folder (`src/`, and three lines of `build.mjs`), at the owner's request; everything else is reported here
and left as it is. Screenshots are in `shots/verify-2026/`
(not committed) and can be regenerated with the scripts named below.

## 1. Calendar: the "typical month" margin is drawn over the grid when the last year is partial — FIXED LOCALLY, please carry into 6.2.1

- **Screen:** Dashboard, calendar panel, any width where the margin shows (cells ≥ 24 px: seen at 1100 × 900, 1920 × 1080,
  2560 × 1300; also at 1280–1680 with a shorter date range), both themes.
- **Steps:** open the build with 2026 data (record ends October 2026) at 1920 × 1080. The grey "typical month,
  2003–2025" bars and their label start at the left edge of the panel and cover the month rows. It needs a record
  that ends before December: a date range alone does not trigger it (the calendar always builds whole years), so the
  December-2025 build is not affected.
- **Cause:** `src/CalPanel.jsx`, overlay geometry: the right edge is measured on the cell `<last year>-12`. When the
  record ends before December, the months after it have no `data-key`, so `right` is 0 and the margin is placed at
  `left: 0`.
- **Second defect, same code:** the month rows are measured on the first year's keyed cells. With a date range that
  starts in the partial last year (only 2026, or March 2026 onwards) the measure stops and the previous range's
  geometry stays: the "MODIS × 2.10 | VIIRS" seam and the "2001–02: Terra only" note remain drawn over a 2026-only grid.
- **Fix applied in this folder (`src/CalPanel.jsx`, the only file of `src/` that differs from 6.2):**
  ```js
  // was: const yA = cd.years[0], rows = [];
  //      for (…) { const c = el.querySelector('.at-cal-cells [data-key="' + yA + '-' + MM + '"]'); if (!c) return; … }
  const rowEls = el.querySelectorAll('.at-cal-cells'), rows = [];
  for (let m = 0; m < 12; m++) { const c = rowEls[m] && rowEls[m].firstElementChild; if (!c) { if (geo) setGeo(null); return; } const r = c.getBoundingClientRect(); rows.push({ y: Math.round(r.top - b0.top), h: Math.round(r.height) }); }
  // was: const last = el.querySelector('.at-cal-cells [data-key="' + cd.years[cd.years.length - 1] + '-12"]');
  let lastR = 0; for (const c of el.querySelectorAll('.at-cal-cells [data-key^="' + cd.years[cd.years.length - 1] + '-"]')) lastR = Math.max(lastR, c.getBoundingClientRect().right);
  // was: const right = last ? Math.round(last.getBoundingClientRect().right - b0.left + 8) : 0;
  const right = lastR ? Math.round(lastR - b0.left + 8) : 0;
  // and the margin is rendered only when the measure succeeded:
  {!empty && cd && geo && geo.right > 0 && margin && Z.harmOK && ( … )}
  ```
- **Check:** `node scripts/check_margin.mjs` (7 sizes × 2 themes × 8 cases, including the last year alone and a range
  starting in March of the last year): before the fix the bars start inside the grid wherever the margin shows; after,
  the margin is shown in 88 cases with 0 failures.
- **If 6.2.1 replaces `src/` without this change, both defects come back** as soon as the record ends in a month other
  than December.

## 2. The visible Download menu does not offer the real hotspot files

- **Screen:** top bar, "Download" button.
- **Steps:** build with `data/hotspots/*.csv` present, open Download: it lists Series CSV, Calendar image (SVG/PNG),
  Map layer (CSV) and "Raw hotspots… Where to get the points for this box". The items
  "Raw hotspots (CSV) — la-rioja-2024-08" and "Raw hotspots (CSV) — quebec-boreal-2023-06" appear only in the ⋯ menu.
- **Where:** `src/App.jsx`, `DownloadMenu` (no `HOTSPOT_FILES` loop) versus `MoreMenu` (has it).
- **Also:** with a real file embedded, "Raw hotspots… Where to get the points for this box" still says that the
  prototype "does not make that file"; the wording could point to the two embedded events.

## 3. Coherence check: one violation, present in the December-2025 build too (reload changes the calendar readout)

- **Tool:** `tools/coherence.mjs`, 1366 × 768, seed 1, step 234 (300 actions): after
  `panel false → peek → draw+Esc → reload`, the readout changes from "October 2026: 55% of a normal October…" to
  "Peak month of 2025: July 2025: 3.9 times a normal July…". The other five walks (1,500 actions) have no violation.
- **Reading:** a month shown without being "picked" (so not written to the hash as `m=`) is lost on reload, where the
  default month (peak of the last complete year) comes back.
- **Not caused by the 2026 data:** the original December-2025 build gives the same violation at the same seed and
  step ("December 2025: 71% of a normal December…" → "Peak month of 2025: July 2025…"), 1 violation in 1,800 actions
  in both builds.

## 4. Partial-year label on the calendar bars overlaps the previous bar

- **Screen:** Dashboard, calendar, All of Argentina, 1920 × 1080, light theme.
- **Steps:** the "to Oct" label above the 2026 bar starts over the top of the tall 2025 bar; its first letter is
  hidden ("o Oct"). For All of Canada the label is clear of the bars.

## 5. Wording for months continued on NOAA-20 during a partial S-NPP outage

- **Screen:** Evidence / month row caveat, a 2026 month continued on NOAA-20 (Canada: March, July; Argentina: April, July).
- **Text:** "Computed: NOAA-20 rescaled to S-NPP (…); S-NPP has no data this month." In 2026 these are partial outages
  (S-NPP has no detection on 10–12 March, 28–30 April, 1–2 June, 11–16 July and 3 August, in both countries), not
  months without data. The same outage days leave April (Canada) and June (both countries) on S-NPP alone, a little
  low, because their NOAA-20 ÷ S-NPP ratio stays under the 1.25 threshold.

## 6. Texts that still say 2025

- `build.mjs`, `<meta name="description">`: "…on one scale, 2001–2025…" is fixed text; the record now ends October 2026.
- `src/Method.jsx`: "Country yearly files, 2000–2025, 96 files, 19.2 million detections read" does not mention the
  2026 months, which come from the FIRMS area API.

## 7. Tools

- `tools/interact.mjs`: the "Last 5 years" check expects `f=2021-01` (record ending in 2025). With the record ending
  in 2026 the app correctly gives 2022 – Oct 2026 and the check fails. Suggested: expected year = record-end year − 4.
- `tools/copycheck.out.txt` is older than the current sentences ("tiles" instead of "places", older story wording):
  175 differing lines before any 2026 data.
- The tools do not run on Windows as shipped (`new URL('..', import.meta.url).pathname` gives `/C:/…`; Chrome path
  `/usr/bin/google-chrome`; `'file://' +` a drive path; a dynamic `import()` of a drive path). `tools/` is untouched
  here: `node scripts/winport.mjs` generates patched copies in `tools-win/` and `build-win.mjs`.
  `fileURLToPath(new URL('..', import.meta.url))` and a `CHROME` environment variable would remove the need.
- `tools/README.md` gives `/home/claude/...` paths; `barcheck.mjs`, `exportshot.mjs`, `flash.mjs` default to
  `/home/claude/v62/...`.

## 8. Fetch script (`scripts/fetch_firms_2026.mjs`): days lost at the standard / near-real-time boundary

- A 5-day window that straddles the last day of the standard product is requested entirely from the near-real-time
  source, which starts the day after. On 15 November 2026 this lost 30–31 July (VIIRS S-NPP and NOAA-20) and
  29–31 August (MODIS) in both countries.
- Worked around without changing the script: the missing days were fetched with `--from/--to` under another
  `--name` and the files copied into the country folder (see the hand-off report). A proper fix is to split the
  straddling window at the last standard day.
- The manifest is rewritten at every run and its `to` date becomes the record's `through`: a top-up run with the same
  `--name` and an earlier `--to` would silently shorten the record.

## 9. Neighbour-country mask (`tools/build_2026_tiles.mjs`): a few coastal points kept

- The 1:50m outlines put some coastal places of neighbouring countries in the sea, and offshore points are kept.
  In 2026: 12 tiles on the United States and Greenland coasts for Canada (19 cell-days) and 7 tiles on the Chilean
  coast for Argentina (20 cell-days), none of which had a detection in 2001–2025. No effect on any printed figure
  (annual statistics stop at 2025); they can appear in the This-month layer for a 2026 month.

## 10. Near-real-time months are not filtered for non-fire sources (disclosed in the app as "provisional")

- August to October 2026 come from near-real-time files, which have no `type` column. Share of S-NPP cell-days that
  fall in cells flagged as static sources in the January–July standard files: Canada 3% (August), 35% (September),
  18% (October); Argentina 5%, 3%, 8%. October 2026 is the last month of the record.

## 11. Dark theme: the legend wording is the wrong way round (present before today's work)

- **Screen:** Dashboard, dark theme, calendar legend and map legend (Detections layer).
- **Steps:** switch to the dark theme. The calendar legend reads "fire detections a month: lighter = fewer, darker =
  more" and the map sentence reads "Darker = more fires seen each year…", but in the dark theme both ramps run from
  dark (few) to light (many): the busiest months and places are the lightest. In the light theme the wording is right.
- **Where:** `src/CalPanel.jsx` (legend `unit` text) and the map sentence in `src/MapPanel.jsx`.

## 12. Manifest and gap-fill files

- Each country's `data/raw/2026/<country>/manifest.json` lists the 192 files of the main run; the folder holds 195
  CSV files (the three gap-fill files of item 8 were copied in and are not listed). The converter reads the folder,
  not the list.

## 13. More on the tools (found in review, not changed in `tools/`)

- `tools/interact.mjs`, the two date-range checks before "Last 5 years" (To year set to 2025, "months after the record
  end disabled in its last year (record ends Dec)") test nothing once the record ends in October 2026: they pass
  without looking at the last year. The generated `tools-win/` copy follows the record end.
- `tools/perf.mjs` writes its result into `tools/` (`tools/perf.<n>x.json`).
- `tools/scdiff.sh` cannot print "SELF-CHECK IDENTICAL TO V4" with the 2026 record: the first line of the self-check
  is now "Record ends 2026-10". The 2003–2025 table is unchanged (see the hand-off report).
- The tools build paths from `new URL('..', import.meta.url).pathname`, which is percent-encoded: a checkout path
  with spaces or accents breaks them (on any system).

## 14. Changes made in this folder at the owner's request on 15 November (to carry into 6.2.1, or they are lost)

- **Calendar first** (`src/v5.css`): in the strip layout (≥ 1280) map | calendar is 1 : 2 at every width (was 5 : 7,
  5.6 : 6.4 from 1440, 1 : 1 from 1680). The layer control may use the full width of the map column, "Draw area" sits
  on a second row under it, the year chip moves below that row, and the map footer is sized for 6 sentence lines
  (5 from 1680). Effect: calendar cells 26 × 23 at 1280 up to 49 × 48 at 2560, the "typical month" margin shows from
  1366 instead of 1920, and the Canada map is 20–33 % smaller (Argentina 3–8 %).
- **First-visit guide hidden by default** (`src/App.jsx`): the numbered line shows only with `guide=1` in the hash.
  `tools/interact.mjs` line 128 ("guide shown on the dashboard (no anim=0)") now fails and line 129 throws, which stops
  the script after 40 checks; with `guide=1` added to that one page it gives 91 PASS / 0 FAIL.
- **Light theme by default** (`build.mjs`: `data-theme`, `color-scheme` meta and the inline bootstrap script;
  `src/util.jsx`: initial theme): a first open is light whatever the system preference; a stored choice still wins.
  `tools/axe.mjs` selects the theme through `prefers-color-scheme` only, so its "dark" passes now run in light: it
  still reports 0 violations but no longer covers the dark theme (a copy that also stores `fb-theme` gives 0
  violations in 34 dark and 34 light runs).
- The verdict strip was left as it is: it has 2 px of spare height, so a row cannot be removed without clipping.
- `CLAUDE.md` mentions a narrower map column for Argentina (`.fb-dashb.is-argentina`); no such rule exists in the CSS.

## 15. Wording and small fixes made in this folder on the evening of 15 November (owner's request; carry into 6.2.1)

Items 2 and 11 above are now fixed here; items 3 (reload readout) and 4 ("to Oct" label) are unchanged.
Figures are untouched: `tools/selfcheck.mjs` gives the same output before and after.

- **Hotspot files** (`src/App.jsx`): the embedded FIRMS extracts are listed in the Download menu as well as in ⋯, with
  readable labels ("FIRMS hotspots (CSV) · La Rioja, Aug 2024", "· Boreal Québec, Jun 2023"); the request item is
  "Hotspots for this box (FIRMS request)…" and its dialog no longer says that no such file exists.
- **Overview** (`src/Overview.jsx`): a click on the raw button toggles the view ("Show the raw record" / "Back to
  harmonized"); a long press still peeks. Lede rewritten: MODIS did not stop in 2012, both sensors flew from 2012 on
  ("In 2012 NASA's fire record moved to VIIRS, a sharper sensor that sees about twice as many fire detections as
  MODIS. Both flew from 2012 on, so FireBridge measures the gap and corrects for it."). Eyebrow "NASA fire satellites ·
  the 2012 change"; note with "by construction" kept; "Jan 2012 estimated from MODIS" moved to a tooltip.
  Picking a zone that is not a whole country from the Overview opens the Calendar tab.
- **Labels**: tab "Dashboard" → "Calendar" (id and hash unchanged); "Words" → "Glossary"; "Type a box" → "Enter
  coordinates…"; map layer "This month" → "One month"; pill "Quality A · reliable" → "Correction A · reliable" (it
  grades the correction, not the trend); check pill "Holds / Flips without Y" → "Still up / Still down / Reverses /
  Without Y"; eyebrow "sensor effect" → "correction factor"; "Aqua only" → "Aqua alone".
- **Legends** (`src/CalPanel.jsx`, `src/MapPanel.jsx`): wording follows the theme (lighter/darker); Anomaly legend
  "blue = quieter than typical, orange–red = busier"; margin "typical month (median 2003–25)"; sensor-effect legend
  "× more seen"; Terra and Aqua glossed ("one MODIS satellite only", "Aqua satellite alone (a check)").
- **Generated sentences** (`src/copy.js`, `src/guard.js`, `src/MonthRow.jsx`): one verb table (`changeVerb`) for the
  Overview, the verdict and How step 1 ("Fire detections roughly doubled. Simply joining the two satellite records
  says they quadrupled"); "normal" → "typical"; guarded zones name the correction factor; Evidence headings answer
  the question (Yes / No / Partly / Unclear); the 90% range is "resampled", the chance test "reshuffled"; an uncertain
  zone no longer shows a rise in How step 3; the NOAA-20 caveat reads "S-NPP data are missing this month, or well
  below NOAA-20 country-wide".
- **Glitches**: overlapping ratio labels (`src/Strips.jsx`), clipped map keyboard hint, missing spaces in the map hint
  line, double colon in the calendar readout.
- **Glossary**: the VIIRS entry said "about twice as many small fires"; it is about twice as many fire detections.
- **Tests that encode the previous texts** (`tools/` is untouched; `scripts/winport.mjs` patches the generated
  `tools-win/` copies): `interact.mjs` (guide shown by default, layer label "This month"), `coherence.mjs`
  (`LAYER_WORD` "too high"), `axe.mjs` (theme chosen through `prefers-color-scheme` only).
- **Left for the interface team**: the provenance badge "Real" on the raw chart of How step 1 (in `ds/`); a visible
  colour-vision mention next to the Counts legend (no room without resizing the calendar); "bars before 2012:
  estimated" in the Overview key (true only in the harmonized view, and no room at 1366).

## 16. Export menus, logo and credits (owner's request, 15 November, late evening; carry into 6.2.1)

- **Export menus** (`src/App.jsx`, `src/v5.css`): one shared component for both menus. Two groups, "This zone"
  (Series, Calendar image SVG, Calendar image PNG, Map layer) and "Real FIRMS hotspots" (one item per embedded file,
  with its number of points and size computed from the file, then "Another area or period…"); the format is a small
  badge on the right, every title fits on one line. The ⋯ menu no longer repeats the exports where the Download
  button is shown (Calendar tab, width ≥ 1024); elsewhere it keeps them, with the same grouped layout.
  Export contents and file names are unchanged. A map image export (PNG with its legend) was not added: no time to
  do it properly.
- **Logo** (`docs/logo/`): concept A, "flame rising from bridge arch", one colour (ink), replaces the two-bars mark in
  `Mark()` (`src/App.jsx`); the old shape rules are removed from `src/app.css`; `build.mjs` now puts the mark in the
  first-paint shell (the wordmark no longer jumps when the app mounts) and adds an inline `data:` SVG favicon.
- **Credits** (`src/Method.jsx`, About and credits): "Team BlackCoffeeOnly: Yasmine Lounaci and Mouloud Serir."
- **Tests** (`tools/` untouched; patches in `scripts/winport.mjs`): `interact.mjs` and `exportshot.mjs` find the
  export items by title and badge in the menu that offers them.

## 17. After an independent mock judging (15 November, ~20:30; carry into 6.2.1)

- **Theme**: the ⋯ menu item "Switch to dark/light theme" is now a row "Dark theme" with an on/off control
  (`role="menuitemcheckbox"`: axe rejects `role="switch"` inside a menu); the menu stays open when it is toggled.
- **Exports in one place**: the Download button shows on every tab at width ≥ 1024 (not on phones); where it shows,
  the ⋯ menu has no export item; on phones and narrow widths the ⋯ menu keeps the grouped export list.
- **Languages**: `src/lang.js` holds `LANG`, `LANGS` and `langUrl()`. A "Language" row in the ⋯ menu links the
  English, French and Spanish builds (`firebridge.html` / `.fr.html` / `.es.html` offline; `./`, `./fr.html`,
  `./es.html` hosted), keeping the hash; the row lists only the codes in `LANGS`. The French and Spanish builds are
  full copies of `src/` translated in place under `i18n/<lang>/src/` (no i18n framework; `metrics.js` byte-identical;
  see `i18n/README.md`, `i18n/GLOSSARY.md`, `scripts/lang.mjs`). Any later change to an English text must be carried
  into both copies by hand.
- **Bug fixed**: the hotspot request dialog printed "La Rioja0Aug 2024; Boreal Québec1Jun 2023" (`.map(hotName)`
  passed the index as separator).
- **Calendar readout**: when the line does not fit it now shortens in steps (short source wording, then no source,
  then no "(peak month of …)") instead of being cut with "…".
- **Overview lede**: "Since 2012 NASA has watched fires with a second, sharper sensor, VIIRS, which sees about twice
  as many fire detections as MODIS. Both have flown since, so FireBridge measures the gap and corrects for it."
  (the previous wording suggested that MODIS stopped in 2012). The paragraph is one line longer; the chart is one
  line shorter.
- **Reviewer's remarks left open**: a box over water (Hudson Bay) answers "outside Canada"; an inverted coordinate
  box silently returns to the whole country; calendar labels are clipped at 900 × 700; the Evidence month panel
  title can name the peak month while a "Latest" chip sits under it; no independent series for Argentina.
