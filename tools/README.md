# Tools (FireBridge version 5)

V5 checks: `bash tools/scdiff.sh` (self-check identical to v4), `node tools/measure.mjs` (document height == viewport on
Dashboard / Evidence / How at 1280–2560, no horizontal overflow down to 320, map/calendar boxes, empty share, clipped
panels), `node tools/interact.mjs` (tabs, zone popover, switch + hold-to-peek, layers, map gestures, linked highlights,
month chip, Evidence switch, stepper, exports, deep links, reduced motion; exit 1 on failure), `node tools/axe.mjs`
(each tab, 1366 and 390, both themes), `CPU=1|4 node tools/perf.mjs` (Event Timing, long tasks, frame rate; writes
tools/perf.<n>x.json), `node tools/theme.mjs`, `node tools/exportshot.mjs`, `node tools/cvd.mjs`.
V5.2 adds `node tools/stripfit.mjs` (replaces railfit: the strip never clips, 1280–2560, 7 states), `node tools/calhead.mjs`
(calendar header never clips, 320–1200 px panels) and `node tools/coherence.mjs [n] [seeds] [sizes]` (state coherence:
self-test, order independence, seeded random walk; see COHERENCE.md). V5.1 adds `node tools/railfit.mjs` (the verdict never scrolls), `node tools/cls.mjs` (layout shift per interaction, target < 0.02) and `node tools/mapshare.mjs` (share of the
map view covered by the data extent, every size). `interact.mjs` also checks map clicks with a 5 px slip and 50–250 ms
after a flip, a layer change and a tab return. The older V3/V4 notes below still describe the data tools; `measure.mjs`, `interact.mjs`, `axe.mjs` were rewritten.


Checks: `node tools/selfcheck.mjs` (metrics table), `node tools/copycheck.mjs` (every generated sentence),
`node tools/measure.mjs`, `node tools/axe.mjs`, `node tools/interact.mjs`, `node tools/theme.mjs`,
`node tools/continuation.mjs` (NOAA-20 continuation test), `node tools/test_2026_tiles.mjs` (converter unit test),
`node tools/test_places.mjs` (map place labels on land), `node tools/cvd.mjs` (colour-vision check of the ramps and the
record-years tone pair), `node tools/flash.mjs` (the Raw ↔ Harmonized outline appears and clears),
`node tools/barcheck.mjs` (proof bars at 320/390/1280). `measure.mjs` checks the V3 first screen (map card, verdict strip,
calendar, and content spilling out of a card) at 1280×800 and 1366×768 (`FB_VIEWPORTS=1440x900,…` for others).

## Adding 2026 (the record's end follows the data; nothing in the app calls the network)

The app reads its end from the tiles embedded at build: without `data/2026/*.json` it ends in December 2025 and says so.
With them, the last complete month common to both countries becomes "last month available"; the calendar, date selects,
month row, ranks, exports and wording follow. An incomplete current year is shown (calendar, month row, CSV) but left out
of annual statistics ("2026: partial year, to <month>"); the rise stays 2012 → last complete year. Months without S-NPP
(after 2 November 2026, or missing) use NOAA-20 ÷ the box's NOAA-20/S-NPP factor ("Computed: NOAA-20 rescaled to S-NPP");
months from near-real-time files (no `type` column) are flagged "provisional, not filtered for non-fire sources".

The key is read from `FIRMS_MAP_KEY` (environment, or `.env` at the export repo root) — never type it on a command line
that gets logged, never commit it. Run, in this order:

```sh
# 1. Fetch (network; about 70 five-day windows × 3 sensors per country; restartable: files already on disk are skipped).
#    Output: /home/claude/export/firebridge/data/raw/2026/<name>/<SOURCE>_<date>_<days>d.csv + manifest.json
cd /home/claude/export/firebridge
node scripts/fetch_firms_2026.mjs --bbox=-141.5,41.5,-52.5,83 --name=canada --sensors=MODIS,VIIRS_SNPP,VIIRS_NOAA20
node scripts/fetch_firms_2026.mjs --bbox=-73.5,-55,-53.5,-21.5 --name=argentina --sensors=MODIS,VIIRS_SNPP,VIIRS_NOAA20

# 2. Convert to tiles (offline). Same cell-day rule as 2001–2025; detections inside another country's polygon are
#    dropped (the fetch is a box, the 2001–2025 tiles are country files); writes data/2026/<country>.json with
#    `through` = the manifest's end date (only months that end on or before it are used).
cd /home/claude/v6
node tools/build_2026_tiles.mjs --in=/home/claude/export/firebridge/data/raw/2026/canada --country=canada
node tools/build_2026_tiles.mjs --in=/home/claude/export/firebridge/data/raw/2026/argentina --country=argentina

# 3. Build and check (offline).
node build.mjs                     # prints "record ends YYYY-MM"
node tools/selfcheck.mjs           # first line: record end; lists months continued on NOAA-20
node tools/copycheck.mjs && node tools/measure.mjs && node tools/interact.mjs && node tools/axe.mjs
```

Fetch BOTH countries: if only one has a 2026 file the record stays at December 2025 (no month is shown as a false zero).
To return to the 2025 record, delete `data/2026/` and rebuild. Any check can target another file with
`FB_HTML=/path/to/file.html node tools/<check>.mjs`; `FB_OUT=/path/to/out.html node build.mjs` builds to another file.

## Raw hotspot downloads

For a real hotspot download, copy one event's CSV to `data/hotspots/<name>.csv` and run `node build.mjs`:
the Export menu then offers "Raw hotspots (CSV) — <name>".

## Screenshots and video: `anim=0`
Add `anim=0` to the URL hash (e.g. `firebridge.html#z=canada&anim=0`) and every chart is drawn in its final state at
once: no first-load choreography, no scroll-triggered entrance, no transitions. The flag survives the app's own hash
updates. `tools/shoot.mjs` hashes in this round use it.

## The 2026 simulation output must not be published
After running the checks on `dist/firebridge-sim2026.html` (built with `FB_OUT=`), delete it together with the
synthetic `data/2026/*.json`: `rm data/2026/*.json dist/firebridge-sim2026.html`, then `node build.mjs` and confirm
`dist/` holds only `firebridge.html` and that the build says "record ends 2025-12".

Version 6: `axe.mjs` also covers the Overview (bare URL, Argentina, raw); `interact.mjs` checks the Overview (bare URL,
one h1, toggle = app country, hold by R and pointer, primary button) and uses key 4 for How it works (1 = Overview);
`coherence.mjs` includes the Overview in the walk and checks Overview figures = strip figures and the guard invariant.
