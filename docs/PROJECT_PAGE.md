# FireBridge — project page text

Paste each section into the field of the same name on the Space Apps project page. Every figure below comes from
the app's self-check (`node tools-win/selfcheck.mjs`, record ending October 2026), except the raw point counts in
"The problem", which are counted from the two FIRMS extracts embedded in the app (`data/hotspots/`), and the
Argentina burned-area comparison, printed by `node scripts/check_argentina_official.mjs` from
`data/official/argentina_area_burned.json`.

Team BlackCoffeeOnly: Yasmine Lounaci and Mouloud Serir.

---

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

https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/demo.mp4 (30 seconds, English captions)

## Link to Final Project

- Live app: https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/
- Code, data and the offline file: https://github.com/Mouloud08/BlackCoffeeOnly-Nasa-Space-Apps

## Detailed Project Description

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
1.01), the path the record takes after S-NPP.

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
- Argentina has no ground-based check yet: its result rests on MODIS records (the detections, and a MODIS
  burned-area product that agrees with them). National statistics are not usable for this: the open file starts in 2017.
- One pooled ratio per zone leaves a seasonal residual (Canada: March 4.10 against 2.10), disclosed, not corrected.
- Places with a local ratio above 4× (62 in Canada, 27 in Argentina) are not harmonized; cause not investigated.
- 4.1% (Canada) and 5.5% (Argentina) of VIIRS cell-days fall where MODIS saw nothing that month: a ratio cannot put those back.
- Quality thresholds are our heuristics, calibrated on Québec.
- 2026 is partial (to October), outside yearly statistics, its last months provisional. As recorded in the FIRMS
  availability on 15 November 2026, the S-NPP near-real-time data end on 2 November 2026; the record continues on
  NOAA-20 (1.01 times S-NPP in both countries).
- Two countries only.

### What we would do next

- **First, a ground-based series for Argentina**: national fire statistics rebuilt back to 2003 from the yearly
  reports, compared the same way as Canada's official area burned.
- Any country (FIRMS covers the world); a seasonal ratio; hotspot points for any box and date; monthly updates
  carried through NOAA-20 and NOAA-21.

### Tools, languages and software

JavaScript/JSX, React 18, esbuild (one self-contained HTML file, network blocked by its content security policy);
Node.js scripts (FIRMS fetch, tiles, self-check); puppeteer-core, headless Chrome, axe-core; topojson-client,
world-atlas; GitHub Pages; Visual Studio Code. AI assistance: see below.

## Space Agency Data

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

Other data:

- **Canadian National Forestry Database** (Canadian Council of Forest Ministers, through Environment and Climate
  Change Canada): area burned by year, the independent check of Canada's trend.
- **Global Wildfire Information System** (European Commission Joint Research Centre / Copernicus), yearly burned
  area for Argentina, 2002–2025, from NASA's MODIS MCD64A1 product, as redistributed by Our World in Data (CC BY 4.0):
  the consistency check of Argentina's trend (not used inside the app; `scripts/check_argentina_official.mjs`).
- **Natural Earth** country outlines (1:50m): the map and the mask that removes detections in neighbouring countries.

FireBridge is a hackathon prototype. It is not a NASA product and is not endorsed by NASA.

## References

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
- Natural Earth, free vector map data — naturalearthdata.com
- Space Apps Challenge 2026, "Harmonization of MODIS and VIIRS Hot Spots" (challenge author: CONAE, Argentina).

## Use of Artificial Intelligence

We used an AI assistant (Anthropic's Claude, through Claude Code) extensively: to write and check the code, the
data-processing scripts and the texts, including this page. The team chose the question and the method, directed the
work and reviewed the results. AI did not produce any data: every figure is computed by the app's code from NASA
FIRMS and official data, and the same code prints a self-check table that we used to verify each number quoted here
(the raw point counts were counted from the embedded FIRMS extracts). The images on this page are screenshots of the
app. The narration of the demo video is an AI-generated voice (ElevenLabs text-to-speech) reading the on-screen
captions; the footage is a real screen recording of the app. The app itself declares AI use (Method tab → About and
credits).
