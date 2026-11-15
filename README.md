# FireBridge

**Is the rise in fire activity real, or is it the satellite?**

FireBridge puts NASA's two long active-fire records on one scale: MODIS (since 2001) and VIIRS (since 2012). VIIRS
sees smaller fires than MODIS, so simply joining the two records shows a jump in 2012 that is partly a change of
instrument. FireBridge measures that jump where both sensors overlap, corrects the older record with it, and shows a
harmonized burning calendar (months × years) for any box in Canada or Argentina.

Built for the NASA Space Apps Challenge 2026, challenge "Harmonization of MODIS and VIIRS Hot Spots", by team
BlackCoffeeOnly. This is a hackathon prototype. It is not a NASA product and is not endorsed by NASA.

## Open it

The whole application is one file: [`dist/firebridge.html`](dist/firebridge.html). Download it and open it in a
browser. It works offline: fonts, data and map outlines are embedded, and the page is not allowed to make network
requests (`connect-src 'none'`).

- **Overview** (opens first), **Dashboard** (verdict, map, calendar), **Evidence**, **How it works**, **Method**.
- Dashboard: click the map to select a 2° × 2° area, drag to pan, scroll to zoom, or use "Draw area". One switch
  shows the two records simply joined ("Raw") or harmonized.
- The ⋯ menu exports the monthly series (CSV), the calendar (SVG, PNG), the map layer (CSV) and two real hotspot
  extracts from NASA FIRMS (see below).

`dist/firebridge-2025-backup.html` is the earlier build whose record ends in December 2025.

## What the numbers say (from `node tools/selfcheck.mjs`)

| Zone | VIIRS ÷ MODIS | Records simply joined | Harmonized |
|---|---|---|---|
| All of Canada | 2.10 | 4.23× | 2.01× |
| All of Argentina | 2.13 | 1.45× | 0.68× |

Rise = annual fire detections 2012–2025 against 2003–2011. For Canada, official area burned (National Forestry
Database) rose 1.92× over 2012–2024 against 2003–2011; the harmonized record gives 1.88× on the same years.

The application declines to print a rise when the data do not support one: too few detections before 2012, years too
variable, or sensors too far apart (ratio above 4: "Not harmonized here").

## Data and sources

- **NASA FIRMS** active-fire detections: MODIS Collection 6.1 (Terra and Aqua), VIIRS 375 m on S-NPP and NOAA-20.
  2001–2025 come from the FIRMS country yearly files, aggregated to 0.5° monthly tiles (`data/canada.json`,
  `data/argentina.json`). 2026 comes from the FIRMS area API (`data/2026/`).
- **Canadian National Forestry Database**: area burned by year (`data/official/`), used as an independent check for
  Canada.
- **Natural Earth** country outlines (map and neighbour-country mask).
- **Real hotspot extracts** (`data/hotspots/`), original FIRMS points, values unchanged: Boreal Québec, June 2023
  (`quebec-boreal-2023-06`, box 80°–68° W, 47.5°–52.5° N) and La Rioja, Argentina, August 2024 (`la-rioja-2024-08`,
  box 68.5°–66.5° W, 29.8°–28.2° S); MODIS, VIIRS S-NPP and VIIRS NOAA-20, standard-quality files. MODIS and VIIRS
  files name two columns differently (`brightness`, `bright_t31` / `bright_ti4`, `bright_ti5`): the header is the
  union of the original column names, and a column a sensor does not have is left empty.

The unit everywhere is the **cell-day**: a ~1 km cell with at least one detection on a day, summed per month.

## Limits

- Detections, not burned area. A cell-day says a fire was seen, not how much burned.
- One VIIRS ÷ MODIS ratio per zone, estimated on the overlap years. It leaves a seasonal residual (off-season months
  are less well harmonized); this is disclosed in the app, not corrected.
- No official series for Argentina: the Argentine result has no independent area-burned check.
- Trends in small zones are often decided by one or two extreme years; the app then says "uncertain" and prints the
  sensor factor instead of a rise.
- 2026 is a partial year: its months are shown in the calendar and the exports but are not used in any annual
  statistic. Months from near-real-time files are marked provisional (not filtered for non-fire sources). Months in
  which S-NPP had an outage are continued on NOAA-20, rescaled to S-NPP, and marked as computed. S-NPP data
  production ended on 2 November 2026.
- A few coastal points of neighbouring countries pass the country mask (1:50m outlines); see `NOTES_FOR_UI.md`.

## Rebuild

Node 18 or later.

```sh
npm install                # esbuild, React 18, the Radio Canada font, puppeteer-core and axe-core for the checks
(cd vendor && npm install) # Natural Earth outlines (world-atlas) and topojson-client
node build.mjs             # writes dist/firebridge.html and prints "record ends YYYY-MM"
node tools/selfcheck.mjs   # the metrics table every on-screen figure comes from
```

The checks in `tools/` (`interact.mjs`, `coherence.mjs`, `axe.mjs`, …) drive a headless Chrome; see
`tools/README.md`. `tools/` and `build.mjs` assume Linux paths. On Windows, `node scripts/winport.mjs` generates
patched copies (`tools-win/`, `build-win.mjs`) without touching the originals; use `node build-win.mjs` and
`node tools-win/<check>.mjs`.

## Updating 2026

Nothing in the application calls the network. New months are fetched once, converted to tiles and embedded at build.

1. Get a FIRMS MAP_KEY and put it in a `.env` file at the root (`FIRMS_MAP_KEY=...`, see `.env.example`). The file is
   git-ignored. Never pass the key on a command line and never commit it.
2. Fetch both countries (the record moves only when both have data):
   ```sh
   node scripts/fetch_firms_2026.mjs --bbox=-141.5,41.5,-52.5,83 --name=canada --sensors=MODIS,VIIRS_SNPP,VIIRS_NOAA20
   node scripts/fetch_firms_2026.mjs --bbox=-73.5,-55,-53.5,-21.5 --name=argentina --sensors=MODIS,VIIRS_SNPP,VIIRS_NOAA20
   ```
   Files go to `data/raw/2026/<name>/` (git-ignored) with a `manifest.json`; an interrupted run can be restarted.
3. Check the raw files day by day: `node scripts/check_raw_2026.mjs data/raw/2026/canada`. The fetch script asks the
   near-real-time source for a window that straddles the last day of the standard product, and loses the standard
   days of that window. Fetch them separately with `--from=... --to=...` under another `--name`, then copy the CSV
   files into the country folder (do not reuse the country `--name`: the manifest's end date would be overwritten).
4. Convert and rebuild:
   ```sh
   node tools/build_2026_tiles.mjs --in=data/raw/2026/canada --country=canada
   node tools/build_2026_tiles.mjs --in=data/raw/2026/argentina --country=argentina
   node build.mjs
   ```
   The record ends at the last complete month common to both countries.
5. Verify: `node tools/selfcheck.mjs` (the 2003–2025 figures must not change), `node tools/test_2026_tiles.mjs`,
   `node tools/continuation.mjs`, `node scripts/check_tiles_2026.mjs canada`, `node scripts/check_borders_2026.mjs canada`,
   then `node tools/interact.mjs` and `node tools/coherence.mjs`.

To return to the December 2025 record, delete `data/2026/*.json` and rebuild.

Hotspot extracts: fetch a small box and a short period with the same script (`--from`, `--to`), then
`node scripts/assemble_hotspots.mjs <raw folder> <from> <to> <name>` writes `data/hotspots/<name>.csv`; rebuild.

## Credits

Data: NASA FIRMS (MODIS Collection 6.1, VIIRS 375 m S-NPP and NOAA-20); Canadian National Forestry Database;
Natural Earth. Code: React, esbuild, topojson-client; Radio Canada, Atelier Texte and DM Mono typefaces.
AI assistance was used to write and check this prototype; this is also declared in the application ("About and credits").

Licence: MIT for the code (see `LICENSE`); the embedded data keep their own terms.
