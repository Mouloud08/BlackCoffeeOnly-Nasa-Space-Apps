# v6.2 working notes (resume from here)

Order: J1 → J2 → 6.2 header/range/terra note → P1–P7 → verification.

Done so far:
- J1 guard G4 (ratio > 4 → not harmonized, Z.notHarm), G5 (Aqua vs harmonized opposite sides of 1 → guard), G6 (monthly
  missing / < 6 months / medErr > 50 % → trend uncertain). Method + CLAUDE.md updated; Method fire-size sentence fixed.
  coherence (0c) guard boxes. Random sample in /tmp/j1r.txt (.scratch/j1r.mjs). Presets: no change.
- J2 a–m done (chanceRange single source; chanceWords edge rule; "roughly doubled"; LOO title k of n (rounded like the
  labels); "Latest: December 2025"; payoff wording; How uses selected country (ex 'canada' = whole selected country);
  story answers "Partly…"/"No: once harmonized, activity fell."; Overview key footnote Jan 2012; official chip/ladder
  years + rule; Method periods named; provenance codes removed from surface, re-check note once).
- 6.2 header: levels 0–4 + wrap (< 560 panel), probes in .fb-hprobes; calhead.mjs rewritten (one row, same height,
  title/segment x unchanged, terra note vs seam) → 360/0. Terra note long/short/min/none by measure.
- Range popover: Month+Year selects, presets, Reset link, disabled impossible options; interact + coherence updated.
- P5 default layer Detections (LAYERS order det, rec, ratio, month); interact updated.
- P2 strip plainSentence; Evidence titles as questions; calendar readout sentence; map sentences colours first.
- P1 partial: cell-days → fire detections on surface strings; product codes removed; pill text "Before 2012: estimated
  from the older satellite"; seam tooltip.
- P3 Guide (dismiss per session, anim=0 hides unless guide=1, guide=0 hides).
- P4 Words popover (in progress: top bar overflow at < 1280).
TODO: P1 glosses Raw/Harmonized; P6; P7 copycheck banned-terms walk; How steps ≤ 40 words + question titles;
verification + screenshots + report.
- (11:xx) P1 glosses (Raw/Harmonized tooltips, Overview dt glosses), "stitched" removed (headline: "Read naively, the
  satellites say they …"), quality tooltips, Spearman caption plain, tiles→places, guard G1 text in detections,
  How steps rewritten (question titles, ≤ 40 words), P7 checks in coherence (walk) and copycheck (78 sentences, 0 fail).
  Words popover in the top bar (compact "?" < 1280; phone shows Words instead of Download; exports stay in More).
- Naive record phrase everywhere: "Simply joining the two satellite records …" / "the two records simply joined"
  (headline A/B/C, strip sentence, Raw glosses, How, map). Headline font clamp reduced ≥ 1100 → 2 lines 1280–2560.
- Fixes: strip checks wrap + align start (Côte-Nord CLS), map hint fixed height, monthslot fixed height, last year
  label transform independent of the active label; guard G2 pill "Years vary too much".
- Final verification started (see /tmp/*62.txt).
- 12:4x fixes: subtitle never > 2 lines (each line nowrap; shown only when ≥ 19 rem free: visible at 1920, hidden ≤ 1440);
  Counts/Anomaly always present (Anomaly disabled with reason in raw-only zones); pill natural width, short text
  "Before 2012: estimated" / "As recorded", left out (no glyph) at tight levels.
