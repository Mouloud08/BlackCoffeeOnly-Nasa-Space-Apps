# FireBridge — project page text

Paste each section into the field of the same name on the Space Apps project page. Every figure below comes from
the app's self-check (`node tools-win/selfcheck.mjs`, record ending October 2026).

Team BlackCoffeeOnly: Yasmine Lounaci and Mouloud Serir.

---

## High-Level Project Summary

NASA's fire record changed eyes in 2012. MODIS has counted fires from space since 2000. VIIRS, a sharper sensor in
the record since 2012, sees about twice as many. Join the two records naively and fire activity seems to jump in 2012:
partly a real change, partly better eyes. FireBridge separates the two. It measures the jump in the years when both
sensors fly together, puts the older record on the new scale, and shows a harmonized burning calendar (months ×
years) for any area of Canada or Argentina, from 2001 to October 2026. The answer changes. In Argentina, the naive
record says fire detections rose 1.45×; on one scale, they fell (0.68×). In Canada, 4.23× becomes 2.01×, and it
matches official area burned on the same years (1.92× official, 1.88× ours). It is one offline HTML file: no
install, no network, and honest about what it cannot tell.

## Link to Project Demo

https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/demo.mp4 (30 seconds, English captions)

## Link to Final Project

- Live app: https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/
- Code, data and the offline file: https://github.com/Mouloud08/BlackCoffeeOnly-Nasa-Space-Apps

## Detailed Project Description

**In one sentence.** In 2012 the long-term fire record switches to a sharper satellite sensor that sees about twice
as many fires, like trading old glasses for new ones: the count jumps overnight, so "more fires" is partly "better
eyes", and FireBridge measures how much.

### The problem

A *fire detection* is a spot where a satellite saw a fire. NASA FIRMS publishes them from two sensors: MODIS (from
2000; our record starts in 2001) and VIIRS (from 2012, 375 m pixels, so it also sees small fires). A long fire trend
drawn from FIRMS joins the two, and the 2012 sensor change shows up as a rise in fire. In Argentina it even flips the
answer: the joined record says fire detections rose, the harmonized record says they fell.

### What it does, in 4 steps

1. **Count.** We count *cell-days*: a ~1 km square of ground where a satellite saw at least one fire on a given day,
   summed per month on a grid of 0.5° squares.
2. **Measure the jump.** From 2012 to 2025 both sensors fly at the same time. In those years we divide what VIIRS saw
   by what MODIS saw in the same area: over all of Canada VIIRS sees 2.10 times as much, over all of Argentina 2.13
   times.
3. **Bridge.** We multiply every MODIS month before 2012 by that ratio. VIIRS months stay as measured. The whole
   record, 2001 to October 2026, now reads as if one sensor had watched it.
4. **Test, and say when we cannot tell.** Each overlap year is predicted from the others; the result is compared with
   official area burned; the trend is re-run without its biggest year and with resampled years. When a zone is too
   small or too variable, the app prints the correction factor and the word "uncertain", not a rise.

The ratio is measured for each area you select (small areas borrow it from a wider area around them). Every number on
screen is computed in your browser from the embedded data.

### Try it first: three screens, two minutes

1. **The flip.** Open
   [the Argentina map](https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/#tab=dash&z=argentina&l=rec)
   (Calendar tab, "Record years" layer) and click **Raw**, then **Harmonized** in the top bar. Each square shows
   whether its busiest fire year came before or after 2012. On one scale, 223 places move their record to "before
   2012"; none move the other way.
2. **The proof.** Open
   [Evidence for Canada](https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/#tab=evidence&z=canada): our
   harmonized rise is 1.88× where Canada's official area burned rose 1.92× (same years, 2012–2024 against
   2003–2011). The records simply joined say 3.96×.
3. **Your own area.** Click the **Calendar** tab, then any place on the map (or "Draw area", or the zone picker →
   "Enter coordinates…"). The calendar, the verdict and the checks recompute for that area.

### For the judges, in four paragraphs

**Impact.** Fire trends drawn from FIRMS feed reports, news stories and planning. Any trend that crosses 2012 carries
the sensor change inside it. FireBridge shows how big that error is (Canada: 4.23× joined, 2.01× harmonized;
Argentina: the sign flips) and gives a corrected calendar, with downloads, for any area. It is one offline file: once
downloaded, a fire office, a classroom or a newsroom can open it with no account, no install and no network, and see
where each number comes from.

**Creativity.** Not another dashboard: one question ("is the rise real, or is it the satellite?") and one switch that
flips every view between the two answers. The record-years map makes the sensor change visible: squares change colour
when the records are put on one scale. The app refuses to print a trend the data cannot support. And it already
handles the next seam: S-NPP ended on 2 November 2026, and the record continues on NOAA-20.

**Validity.** Three checks of the correction (year-by-year prediction, official area burned, robustness to the biggest
year) and a chance test on the map, all shown in the app with their sources (details below). One metrics module
computes every figure on screen, and a self-check script prints them; this page quotes only figures from it. Our limits are listed below, and where
the data are thin the app says "uncertain".

**Relevance.** It answers the challenge point by point (table below), uses NASA FIRMS, the challenge's listed
resource, for every detection, covers Argentina (the challenge author's country) and Canada, and runs to October 2026.

### How it answers each requirement of the challenge

Clicks are counted from the first screen (Overview).

| Requirement | Where to find it in the app | Clicks |
|---|---|---|
| Harmonized MODIS + VIIRS | Every view is harmonized by default. The **Raw \| Harmonized** switch in the top bar (keys R / H) flips map, calendar and numbers together. | 0 (1 to compare) |
| Burning calendar, months × years | **Calendar** tab: a row per month, a column per year from 2001 to 2026, yearly totals above, the 2012 seam labelled with its ratio. | 1 |
| Region by map | **Calendar** tab → click a place on the map (a 2° box), or **Draw area** and drag, or move and resize the box. | 2 |
| Region by coordinates | Zone picker in the top bar → **Enter coordinates…** → type the box. | 2 + typing |
| Date range | **Calendar** tab → the date-range button above the calendar ("2001 – Oct 2026"). | 2 |
| Downloads, including hotspot CSV | **Calendar** tab → **Download**: monthly series (CSV), calendar (SVG, PNG), map layer (CSV), **FIRMS hotspots (CSV) · La Rioja, Aug 2024** and **FIRMS hotspots (CSV) · Boreal Québec, Jun 2023** (real FIRMS points, values unchanged). | 3 |
| Accessible colour ramps | On screen everywhere: calendar and map ramps checked for colour blindness and grayscale; the two record-year tones come from the colour-blind-safe cividis family; sensors are told apart by shape (MODIS hollow, VIIRS filled), not only by colour; light and dark themes; keyboard shortcuts; a **Glossary** button explains the words used on the page. | 0 |
| Current month vs historical median | **Calendar** tab → click a month: the line under the calendar compares it with a typical month (the median of that month, 2003–2025). **Anomaly** mode colours every month that way; the **One month** map layer ranks every place for that month; Evidence explains it. Example: [October 2026, Argentina](https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/#tab=dash&z=argentina&m=2026-10). | 2 |

### Validation

- **Does the correction work year by year?** Each overlap year (2012–2025) is left out and predicted from the others.
  Median error: 3% in Canada, 3% in Argentina. A ratio trained on 2012–2018 predicts 2019–2025 within 7% (Canada)
  and 5% (Argentina). Month by month, the median error is 16% over 165 months (Canada) and 12% over 167 months
  (Argentina): single months are noisier than years. Leaving one year
  out moves the ratio only between 2.07 and 2.12 (Canada) and 2.11 and 2.15 (Argentina).
- **Does it match an independent source?** Canada's National Forestry Database (Canadian Council of Forest
  Ministers) reports area burned each year, independently of both sensors. Mean year 2012–2024 against 2003–2011: official 1.92×, our harmonized record 1.88×, the
  records simply joined 3.96×.
- **Does the trend survive its biggest year?** Canada: 2.01×, still 1.62× without 2023; 90% range 1.30–2.92 when years
  are resampled. Argentina: 0.68×, 0.62× without 2020; 90% range 0.57–0.82. Both are marked robust.
- **Did the satellite create false records?** On the map, each 0.5° place gets its busiest year. We reshuffle the year
  labels 2,000 times to see what chance alone gives. Canada: with the records simply joined, 84.1% of places have
  their record in 2012 or later, above chance (42.7%–76.3%); harmonized, 73.7%, inside chance (44.7%–74.5%).
  Argentina: 70.0% joined, inside chance (42.2%–76.7%); harmonized 38.7%, below chance (41.9%–78.7%): the years
  since 2012 are quieter. A record is one year, not a trend.
- **Does it know when to stop?** Boreal Québec reads 1.63× harmonized, but 0.67× without 2023 and a 90% range of
  0.13–4.72. The app prints no rise there: only the correction factor (2.12) and the reason.

### Limits we declare

- These are fire detections, not burned area. A cell-day says a fire was seen, not how much burned.
- No official burned-area series was checked for Argentina; the Argentine result rests on the satellite records alone.
- One ratio per zone, pooled over whole years, leaves a seasonal residual: in Canada the March ratio is 4.10 against
  2.10 pooled. Disclosed month by month in the Method tab, not corrected.
- 62 places in Canada and 27 in Argentina have a local ratio above 4×, unusual for vegetation fire. They are shown in
  grey and not harmonized; we have not investigated their cause.
- VIIRS sees small fires MODIS cannot: 4.1% (Canada) and 5.5% (Argentina) of VIIRS cell-days fall in a 0.5° place
  and month where MODIS recorded nothing. A ratio cannot put those back.
- Trends in small areas often hinge on one or two extreme years; the app then says "uncertain". Quality thresholds are
  our heuristics, calibrated on Québec.
- 2026 is a partial year (to October): shown, but not used in yearly statistics. Its last months come from
  near-real-time files and are marked provisional. S-NPP VIIRS data production ended on 2 November 2026; the record
  continues on NOAA-20, which reads 1.01 times S-NPP in both countries.
- Two countries only.

### What we would do next

- Any country: the method and the code are not specific to Canada or Argentina; FIRMS covers the world.
- A seasonal ratio where enough years exist, to remove the off-season residual.
- An independent burned-area check for Argentina, for example against national burned-area statistics.
- A hotspot CSV for any box and date (today: two real events are embedded).
- A monthly update, and the next seam: carry the record from S-NPP to NOAA-20 and NOAA-21.

### Tools, languages and software

JavaScript and JSX; React 18; esbuild (one self-contained HTML file: fonts, data and map outlines inlined, network
blocked by its content security policy); Node.js scripts to fetch FIRMS data, build the 0.5° monthly tiles and run a
self-check that prints every figure the app shows; puppeteer-core with headless Chrome and axe-core for interaction,
layout, consistency and accessibility checks; topojson-client and world-atlas (Natural Earth outlines); Radio Canada
and DM Mono typefaces; Git, GitHub and GitHub Pages; Visual Studio Code. AI assistance: see below.

## Space Agency Data

All fire data come from **NASA FIRMS** (Fire Information for Resource Management System), the challenge's listed
resource:

- **MODIS Collection 6.1 active fire detections** (`MCD14ML`, Terra and Aqua, 1 km): the record before 2012, and the
  older sensor in the overlap years.
- **VIIRS 375 m active fire detections, Suomi NPP** (`VNP14IMGT`): the record from 2012.
- **VIIRS 375 m active fire detections, NOAA-20** (`VJ114IMGT`): months with an S-NPP outage, and the factor for the
  next seam after S-NPP's end.
- Access: FIRMS country yearly files (2000–2025, used from 2001); the FIRMS area API (standard and near-real-time)
  for January to October 2026, fetched on 15 November 2026.
- NASA Earthdata notices on the end of S-NPP VIIRS production and its July 2024 anomaly, cited in the Method tab.

Other data:

- **Canadian National Forestry Database** (Canadian Council of Forest Ministers, through Environment and Climate
  Change Canada): area burned by year, the independent check for Canada.
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
- Chen, Y. et al. (2026). Tracking recent extremes and interannual variability of global fire emissions using a
  near-real-time extension to the Global Fire Emissions Database. Earth System Science Data, 18, 7535–7555.
- Environment and Climate Change Canada, "Forest management and disturbances" indicator; data: CCFM National Forestry
  Database, "Area burned by forest fires by region, Canada" —
  canada.ca/en/environment-climate-change/services/environmental-indicators/forest-management-disturbances.html
- Natural Earth, free vector map data — naturalearthdata.com
- Space Apps Challenge 2026, "Harmonization of MODIS and VIIRS Hot Spots" (challenge author: CONAE, Argentina).

## Use of Artificial Intelligence

We used an AI assistant (Anthropic's Claude, through Claude Code) extensively: to write and check the code, the
data-processing scripts and the texts, including this page. The team chose the question and the method, directed the
work and reviewed the results. AI did not produce any data: every figure is computed by the app's code from NASA
FIRMS and official data, and the same code prints a self-check table that we used to verify each number quoted here.
The images on this page are screenshots of the app. The narration of the demo video is an AI-generated voice
(ElevenLabs text-to-speech) reading the on-screen captions; the footage is a real screen recording of the app. The app
itself declares AI use (Method tab → About and credits).
