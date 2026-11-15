# FireBridge — 30-second demo script

> The rendered video (`video/out/firebridge-demo.mp4`, 28.5 s) uses the captions in `video/captions.json`, tightened so that every number matches what the screen shows in that shot. This file is the planning script.

Screen recording of the live app at 1440 × 900, light theme. Base URL:
`https://mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps/` followed by the hash below. Add `&anim=0` when a screen
must open in its final state (no intro animation). Captions are burned in, English, one per shot. The voice-over, if
used, reads exactly the captions.

| # | Time | Screen (hash) | What happens on screen | Caption |
|---|---|---|---|---|
| 1 | 0:00–0:05 | `#tab=overview&z=argentina&anim=0` | Overview, Argentina. Click "Show the raw record" (or hold the R key): the bars before 2012 drop to the raw record; click "Back to harmonized". | In 2012 NASA's fire record moved to a sharper satellite. It sees about twice as many fires. |
| 2 | 0:05–0:11 | `#tab=dash&z=argentina&l=rec&v=raw` | Calendar tab, "Record years" map in Raw. Click **Harmonized**: blue squares (record since 2012) turn sand (record before 2012). | Joined naively, Argentina's fire detections rose 1.45×. On one scale, they fell: 0.68×. |
| 3 | 0:11–0:16 | `#tab=dash&z=canada&anim=0` | Calendar for All of Canada: months × years, the 2012 seam labelled "MODIS × 2.10". Hover a few cells. | Canada: 4.23× joined, 2.01× on one scale. |
| 4 | 0:16–0:21 | `#tab=evidence&z=canada&anim=0` | Evidence: the official area-burned panel. | Canada's official area burned agrees: 1.92× official, 1.88× ours. |
| 5 | 0:21–0:26 | `#tab=dash&z=argentina&m=2026-10&anim=0` | Click a place on the map (the box and calendar update), then open **Download** to show "FIRMS hotspots (CSV) · La Rioja, Aug 2024". | Any area, any month to October 2026, against a typical month. Real FIRMS hotspots included. |
| 6 | 0:26–0:30 | `#tab=overview&z=canada&anim=0` | End card over the Overview: name and link. | FireBridge: one offline file. Not a NASA product. mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps |

Caption total: 67 words (the link in shot 6 counted as one word).

## Voice-over (optional, identical to the captions)

In 2012 NASA's fire record moved to a sharper satellite. It sees about twice as many fires.
Joined naively, Argentina's fire detections rose 1.45×. On one scale, they fell: 0.68×.
Canada: 4.23× joined, 2.01× on one scale.
Canada's official area burned agrees: 1.92× official, 1.88× ours.
Any area, any month to October 2026, against a typical month. Real FIRMS hotspots included.
FireBridge: one offline file. Not a NASA product.

(Read "×" as "times". The link is shown, not read.)

## Notes for the edit

- Every figure is from the self-check (record ends October 2026): Canada 2.10, 4.23×, 2.01×; Argentina 1.45×, 0.68×;
  official area burned 1.92× against harmonized 1.88× (2012–2024 against 2003–2011).
- Say "fire detections", not "fires" or "area burned", when a figure is shown (shot 2 and 3 figures are detections).
- No NASA logo. Keep the "Not a NASA product" line on the end card.
