# FireBridge — project page text

Paste each section into the field of the same name on the Space Apps project page (profile icon → My Team →
Project → Edit): Project Name, High-Level Project Summary, Link to Project Demo, Link to Final Project, Detailed
Project Description, Use of Super Intelligence (SI), NASA Data, Space Agency Partner Data and Other References.
Everything on the page and in the linked materials must be in English. Every figure below comes from
the app's self-check (`node tools-win/selfcheck.mjs`, record ending October 2026), except the raw point counts in
"The problem", which are counted from the two FIRMS extracts embedded in the app (`data/hotspots/`), and the
Argentina burned-area comparison, printed by `node scripts/check_argentina_official.mjs` from
`data/official/argentina_area_burned.json`, the national-statistics comparison (`node scripts/check_argentina_national.mjs`), and the method tests, printed by
`node research/seasonal.mjs` and `node research/spatial.mjs`.

Team BlackCoffeeOnly: Yasmine Lounaci and Mouloud Serir.

---

## Project Name

FireBridge

## High-Level Project Summary

Since 2012 NASA has watched fires with two sensors. Any record that uses MODIS before 2012 and VIIRS after it jumps
in 2012: VIIRS is sharper and, counted on the same ~1 km grid, records about twice as many fire detections (2.10× in
Canada, 2.13× in Argentina). FireBridge measures that factor in the years when both sensors fly, puts the 2001–2011 record on the
VIIRS scale, and shows a harmonized burning calendar (months × years) for any area of Canada or Argentina, from 2001
to October 2026. The answer changes. In Argentina, the naive record says fire detections rose 1.45×; on one scale,
they fell (0.68×). In Canada, 4.23× becomes 2.01×, a trend close to official area burned on the same years (1.92×
official, 1.88× ours). It is one offline HTML file: no install, no network, and it says "uncertain" where the data
cannot tell.

## Link to Project Demo

Paste this one link in the field:

https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/demo.mp4

(a video of 28.5 seconds, in English, with English captions; no login needed)

## Link to Final Project

Paste this one link in the field (the solution itself, a web app that opens in any browser, no login needed):

https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/

## Detailed Project Description

**Try it:** https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/ · **Code, data and the offline file (GitHub):**
https://github.com/Mouloud08/BlackCoffeeOnly-Nasa-Space-Apps · **30-second demo:**
https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/demo.mp4

### The problem

A long fire trend from NASA FIRMS joins MODIS (from 2000; our record starts in 2001) and VIIRS (from 2012, 375 m
pixels, so it also sees small fires), a second, sharper pair of eyes flying alongside the first. The 2012 seam then
looks like a rise in fire. Raw points exaggerate the gap: in the two FIRMS extracts the app embeds, VIIRS S-NPP has
1,686 points to MODIS's 418 (Terra + Aqua; La Rioja, August 2024) and 81,841 to 14,746 (Boreal Québec, June 2023).
So we compare the sensors on one grid.

### What it does, in 4 steps

1. **Count** *cell-days* (a ~1 km square where a satellite saw fire that day) per month on 0.5° squares, the same
   grid for both sensors.
2. **Measure the jump** where both fly (2012–2025): VIIRS ÷ MODIS = 2.10 over Canada, 2.13 over Argentina, measured
   for each selected area (small areas borrow it from a wider one).
3. **Bridge**: MODIS months before 2012 × that ratio; VIIRS months unchanged. The record, 2001 to October 2026, reads
   on the scale of the sensor that continues.
4. **Test, and say when we cannot tell**: overlap years predicted from each other; the trend re-run without its
   biggest year and with resampled years. Too small or too variable: the factor and "uncertain", no rise.

### Try it first: three screens, two minutes

1. **The flip.**
   [Argentina, Record years map](https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/#tab=dash&z=argentina&l=rec):
   click **Raw**, then **Harmonized**. Each square shows whether its busiest fire year came before or after 2012; on
   one scale, 223 places move to "before 2012", none the other way.
2. **The checks.**
   [Evidence, Canada](https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/#tab=evidence&z=canada): harmonized
   1.88×, official area burned 1.92× (same years), records simply joined 3.96×. The verdict pills read "Correction A ·
   reliable" and "Still up without 2023".
3. **Your own area.** **Calendar** → click the map, **Draw area**, or the zone picker → **Enter coordinates…**: the
   calendar, the verdict and the checks recompute.

### For the judges, in four paragraphs

**Impact.** When MODIS stops, every FIRMS time series becomes VIIRS-only; FireBridge gives the factor that puts the
2001–2011 archive on that scale, zone by zone, with a stated quality. The stakes: Canada reads 4.23× joined, 2.01×
harmonized; in Argentina the sign flips. Built for analysts who draw fire trends from FIRMS and must judge whether a
rise, or this month, is unusual for their area: one offline file, no account, no network, every number sourced.

**Creativity.** One question ("is the rise real, or is it the satellite?"), one switch that flips every view between
the two answers, and a Record years map whose squares change colour when the records share one scale. The app refuses
to print a trend the data cannot support, and already continues S-NPP outage months on NOAA-20 (NOAA-20 ÷ S-NPP =
1.01), the path the record takes after S-NPP. The next method step is already measured out of sample: a seasonal
correction (see "What we would do next").

**Validity.** The correction is tested where both sensors fly; the trend against official area burned and without its
biggest year (details below). One metrics module computes every figure; a self-check prints them all.

**Relevance.** Every requirement answered (table below), NASA FIRMS (the challenge's listed resource) for every
detection, Argentina (the challenge author's country) and Canada, to October 2026.

### How it answers each requirement of the challenge

Clicks from the first screen (Overview). Tabs: Overview, Calendar, Evidence, How it works, Method.

| Requirement | Where to find it in the app | Clicks |
|---|---|---|
| Harmonized MODIS + VIIRS | Default everywhere; the **Raw \| Harmonized** switch (keys R / H) flips map, calendar and numbers. | 0 (1 to compare) |
| Burning calendar, months × years | **Calendar** tab: month rows, year columns 2001–2026, the 2012 seam labelled. | 1 |
| Region by map | **Calendar** → click a place (2° box), **Draw area**, or move / resize the box. Layers: Detections, Record years, Sensor effect, One month. | 2 |
| Region by coordinates | Zone picker → **Enter coordinates…** | 2 + typing |
| Date range | **Calendar** → the date-range button ("2001 – Oct 2026"). | 2 |
| Downloads, including hotspot CSV | **Download** (top bar, every tab on desktop). **This zone**: series CSV, calendar SVG / PNG, map layer CSV. **Real FIRMS hotspots**: **La Rioja · Aug 2024**, **Boreal Québec · Jun 2023** (original points, unchanged, with point count and size); **Another area or period…** gives the exact FIRMS request for any other area (the app holds monthly counts, not individual detections). | 2 |
| Accessible colour ramps | Ramps checked for colour blindness and grayscale; sensors told apart by shape (MODIS hollow, VIIRS filled); light and dark themes; keyboard; **Glossary**. | 0 |
| Current month vs historical median | **Calendar** → click a month: compared with the median of that month, 2003–2025; **Anomaly** mode; **One month** layer. [October 2026, Argentina](https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/#tab=dash&z=argentina&m=2026-10). | 2 |

### Validation

- **Why not simply use MODIS alone?** For the single before/after figure, MODIS alone gives the same answer, by
  construction: the years before 2012 are multiplied by the ratio that links VIIRS to MODIS after 2012, so the ratio
  cancels. That equality validates nothing. The harmonized record gives what MODIS alone cannot: a month-by-month
  calendar and month ranks on the scale of the sensor that continues, so the record does not break when MODIS stops.
- **The correction itself.** Each overlap year (2012–2025) predicted from the others: median error 3% in both
  countries. Trained on 2012–2018, the ratio predicts 2019–2025 within 7% (Canada) and 5% (Argentina); median monthly
  error 16% and 12%. Leaving one year out keeps the ratio within 2.07–2.12 (Canada) and 2.11–2.15 (Argentina).
- **The trend against an independent source** (a check of the trend, not of the correction). Canada's National
  Forestry Database, independent of both sensors, mean year 2012–2024 against 2003–2011: official area burned 1.92×,
  harmonized 1.88×, records simply joined 3.96×.
- **Argentina: a consistency check, not a ground check.** A satellite burned-area record with no sensor change in
  2012 (Global Wildfire Information System, from NASA's MODIS MCD64A1 product) shows 0.78× as much area burned per
  year in 2012–2024 as in 2003–2011; on the same years our harmonized detections give 0.69× and the records simply
  joined 1.46×. Year by year, burned area ranks like the harmonized record (rank correlation 0.79) far more than like
  the joined one (0.32). That product is also MODIS-based: it supports reading the post-2012 rise as a sensor effect,
  but it is not an agency series like Canada's.
- **The trend without its biggest year.** Canada 2.01×, still 1.62× without 2023 (90% resampled range 1.30–2.92);
  Argentina 0.68×, 0.62× without 2020 (0.57–0.82). Both robust.
- **False records from the seam?** Share of 0.5° places whose busiest year is 2012 or later, against chance (2,000
  reshuffles of the year labels). Canada: joined 84.1%, above chance (42.7%–76.3%); harmonized 73.7%, inside
  (44.7%–74.5%). Argentina: joined 70.0%, inside (42.2%–76.7%); harmonized 38.7%, below (41.9%–78.7%).
- **Knowing when to stop.** Boreal Québec: 1.63× harmonized, but 0.67× without 2023 and a 90% range of 0.13–4.72.
  The app prints no rise there, only the correction factor (2.12) and the reason.

### Limits we declare

- Fire detections, not burned area.
- Argentina has no ground-based check: its result rests on MODIS records (the detections, and a MODIS burned-area
  product that agrees with them). We assembled Argentina's official fire statistics (Programa Nacional de Estadística
  Forestal, 20 of the 22 years) and they cannot settle it: they add up what each province declares, with different
  provinces missing in different years, so their 2012–2024 ÷ 2003–2011 ratio moves from 0.75× to 1.37× when a single
  year is left out (0.85× with all years, 1.37× without 2003). On the one near-complete window (2012–2016 against
  2009–2011) they show a rise, 1.34×, where our harmonized record shows 0.71×: three years against five, driven by
  one province. That series neither confirms nor refutes our result (`node scripts/check_argentina_national.mjs`).
- One pooled ratio per zone leaves a seasonal residual (Canada: March 4.10 against 2.10), disclosed, not corrected in
  the app. We measured the correction (see "What we would do next").
- Places with a local ratio above 4× (62 in Canada, 27 in Argentina) are not harmonized; cause not investigated.
- 4.1% (Canada) and 5.5% (Argentina) of VIIRS cell-days fall where MODIS saw nothing that month: a ratio cannot put those back.
- Quality thresholds are our heuristics, calibrated on Québec.
- 2026 is partial (to October), outside yearly statistics, its last months provisional. As recorded in the FIRMS
  availability on 15 November 2026, the S-NPP near-real-time data end on 2 November 2026; the record continues on
  NOAA-20 (1.01 times S-NPP in both countries).
- Two countries only.

### What we would do next

- **First, a usable ground-based series for Argentina**: the national statistics we assembled are too uneven
  (provinces missing by year); a check needs province-level series restricted to provinces that reported every year.
- **A seasonal correction, measured, not yet in the app.** One VIIRS ÷ MODIS ratio per calendar month, pulled
  toward the single ratio when a month has few fires. Tested on years left out one at a time, it predicts VIIRS
  months better than today's single ratio: median monthly error 16.5% → 11.7% in Canada and 11.7% → 6.9% in
  Argentina, lower in 12 of 14 and 14 of 14 left-out years; Canada's worst calendar month goes from 1.95× off to
  1.19×. The headline rises do not move (Canada 2.01×, Argentina 0.68×). It brings no clear gain in small zones, and
  an independent review of our prototype found what it still lacks: the month factors are not capped, so in a small
  area a month where MODIS saw very few fires can get a factor far above the app's 4× limit. It stays out of the app
  until that is fixed (`node research/seasonal.mjs`, report in `research/SEASONAL.md`; prototype in
  `research/seasonal-app/`).
- **Two ideas tested and set aside** (`node research/spatial.mjs`, `research/SPATIAL.md`). Ratios that vary place by
  place did not help at the scale of a selected area (error of predicted VIIRS counts in 2° boxes, years left out one
  at a time: 15.5% → 15.2% in Canada, 9.9% → 9.7% in Argentina), so the app keeps one ratio per zone. Adding the small
  fires VIIRS sees where MODIS saw nothing helps a little (15.5% → 14.1%, 9.9% → 9.1%) but puts fire in months where
  MODIS recorded none (8.1% of Canada's 2003–2011 total): an assumption about the past, not a measurement, so it
  stays out.
- Any country (FIRMS covers the world); hotspot points for any box and date; monthly updates
  carried through NOAA-20 and NOAA-21.

### Tools, languages and software

JavaScript/JSX, React 18, esbuild (one self-contained HTML file, network blocked by its content security policy);
Node.js scripts (FIRMS fetch, tiles, self-check); puppeteer-core, headless Chrome, axe-core; topojson-client,
world-atlas; GitHub Pages; Visual Studio Code. AI assistance: see below.

## Use of Super Intelligence (SI)

Yes. We used an SI assistant (Anthropic's Claude, a large language model, through Claude Code) extensively, as a
tool for coding, reviewing code, and searching:

- **Coding:** the application code, the build and check scripts, the FIRMS download and tile conversion scripts and
  the research scripts were written with the SI assistant. This is acknowledged in the app (Method tab → About and
  credits), in the repository README, and in the repository metadata (each commit carries a `Co-Authored-By: Claude`
  trailer).
- **Reviewing code:** the SI assistant reviewed the code and ran the checks (self-check of every figure, interface
  and accessibility tests), and independent SI reviews were used to look for errors in the method and the texts.
- **Searching:** the SI assistant searched for documentation and for the public data sources used to check the
  results (official burned-area statistics for Canada and Argentina, satellite burned-area products).
- **Texts:** the on-screen texts, the README, this page and the French and Spanish translations of the app were
  drafted with the SI assistant and reviewed by the team.
- **Demo video:** the footage is a real screen recording of the app, assembled by script. The voice-over is an
  SI-generated voice (ElevenLabs text-to-speech) reading the on-screen captions; this is stated on the video's end
  card ("AI-generated voice") and in the video file's metadata.
- **Logo:** the FireBridge mark (a flame over a bridge arch) was drawn as vector code with the SI assistant. It uses
  no NASA branding or design element.
- **Not generated by SI:** the data. Every figure is computed by the app's code from NASA FIRMS and official data;
  the same code prints a self-check table that we used to verify the numbers quoted here. The images on this page
  are screenshots of the app.

The team chose the challenge, the question and the method, directed the work and reviewed the results.

## NASA Data

All fire data come from **NASA FIRMS** (Fire Information for Resource Management System), the challenge's listed
resource:

- **MODIS Collection 6.1 active fire detections** (`MCD14ML`, Terra and Aqua, 1 km; Giglio et al., 2016): the record
  before 2012, and the older sensor in the overlap years.
- **VIIRS 375 m active fire detections, Suomi NPP** (`VNP14IMGT`; Schroeder et al., 2014): the record from 2012.
- **VIIRS 375 m active fire detections, NOAA-20** (`VJ114IMGT`): months with an S-NPP outage, and the factor for the
  next seam after S-NPP's end.
- Access: FIRMS country yearly files (2000–2025, used from 2001); the FIRMS area API (standard and near-real-time)
  for January to October 2026, fetched on 15 November 2026, when the FIRMS availability listed S-NPP near-real-time
  data from 1 August to 2 November 2026.
- NASA Earthdata notices on the transition from S-NPP VIIRS and on its July 2024 anomaly, cited in the Method tab.
- NASA's **MODIS MCD64A1** burned-area product, through the Global Wildfire Information System country statistics
  (see below): the consistency check of Argentina's trend.

FireBridge is a hackathon prototype. It is not a NASA product and is not endorsed by NASA.

## Space Agency Partner Data and Other References

Other data:

- **Canadian National Forestry Database** (Canadian Council of Forest Ministers, through Environment and Climate
  Change Canada): area burned by year, the independent check of Canada's trend.
- **Global Wildfire Information System** (European Commission Joint Research Centre / Copernicus), yearly burned
  area for Argentina, 2002–2025, as redistributed by Our World in Data (CC BY 4.0): the consistency check of
  Argentina's trend (not used inside the app; `scripts/check_argentina_official.mjs`).
- **Argentina's official fire statistics** (Programa Nacional de Estadística Forestal, yearly reports and yearbooks,
  argentina.gob.ar): assembled and found unusable for a before/after comparison (`scripts/check_argentina_national.mjs`).
- **Natural Earth** country outlines (1:50m, public domain), through the `world-atlas` package: the map and the mask
  that removes detections in neighbouring countries.
- The challenge statement, "Harmonization of MODIS and VIIRS Hot Spots", written by the National Space Activities
  Commission of Argentina (CONAE).

Code, tools and typefaces (open source, used under their licences): React and React DOM; esbuild; topojson-client and
world-atlas; puppeteer-core and axe-core (checks only); Remotion and FFmpeg (demo video); Radio Canada and DM Mono
typefaces (SIL Open Font License); the team's own design-system components and its text typeface.

References:

- NASA FIRMS, Fire Information for Resource Management System — firms.modaps.eosdis.nasa.gov
- Giglio, L., Schroeder, W., Justice, C. O. (2016). The collection 6 MODIS active fire detection algorithm and fire
  products. Remote Sensing of Environment, 178, 31–41.
- Schroeder, W., Oliva, P., Giglio, L., Csiszar, I. A. (2014). The New VIIRS 375 m active fire detection data product:
  Algorithm description and initial assessment. Remote Sensing of Environment, 143, 85–96.
- NASA Earthdata, "Transitioning from Suomi NPP VIIRS & OMPS: What FIRMS Users Need to Know" —
  earthdata.nasa.gov/news/blog/transitioning-from-s-npp-viirs-omps-what-nasa-firms-users-need-know
- NASA Earthdata, "Suomi NPP VIIRS Data Product Anomaly - July 2024" —
  earthdata.nasa.gov/data/alerts-outages/suomi-npp-viirs-data-product-anomaly-july-2024
- Environment and Climate Change Canada, "Forest management and disturbances" indicator; data: CCFM National Forestry
  Database, "Area burned by forest fires by region, Canada" —
  canada.ca/en/environment-climate-change/services/environmental-indicators/forest-management-disturbances.html
- Global Wildfire Information System (GWIS), "Global Yearly Burned Area by Land Cover Type", country profiles —
  gwis.jrc.ec.europa.eu/apps/country.profile/downloads; values taken from Our World in Data, "Annual area burnt by
  wildfires" — ourworldindata.org/grapher/annual-area-burnt-by-wildfires-gwis (accessed 15 November 2026)
- Programa Nacional de Estadística Forestal (Argentina), "Estadística de Incendios Forestales" yearly reports and
  forest statistics yearbooks — argentina.gob.ar (accessed 15 November 2026; file list in
  `data/official/argentina_national_reports.json`)
- Natural Earth, free vector map data — naturalearthdata.com
