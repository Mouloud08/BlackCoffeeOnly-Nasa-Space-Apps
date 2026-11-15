// Prints every generated sentence for the presets, Lac-Saint-Jean, a grade C box and synthetic edge cases.
import fs from 'fs';
import { decodeCountry, computeZone, PRESETS, monthReading, monthIndex, lastComparable, setRecordEnd, END_KEY } from '../src/metrics.js';
import { loadTiles } from './tiles.mjs';
import * as T from '../src/copy.js';
const here = new URL('..', import.meta.url).pathname;
const LT = loadTiles(here); setRecordEnd(LT.end);
const C = { canada: decodeCountry(LT.tiles.canada), argentina: decodeCountry(LT.tiles.argentina) };
const zones = PRESETS.map((p) => ({ label: p.label, country: p.country, box: p.box }));
zones.push({ label: 'NWT (judge)', country: 'canada', box: { s: 58, n: 63.5, w: -125.5, e: -116.5 } });
zones.push({ label: 'Nunavik C (judge)', country: 'canada', box: { s: 58, n: 59, w: -75, e: -74 } });
zones.push({ label: 'Lac-Saint-Jean', country: 'canada', box: { s: 48, n: 50, w: -76, e: -72 } });
zones.push({ label: 'Arctic box', country: 'canada', box: { s: 70, n: 72, w: -100, e: -96 } });
zones.push({ label: 'Tierra del Fuego', country: 'argentina', box: { s: -55, n: -53, w: -68.5, e: -65.5 } });
zones.push({ label: 'Small Patagonia', country: 'argentina', box: { s: -46, n: -45, w: -70, e: -69 } });
zones.push({ label: 'Nunavut 1 tile', country: 'canada', box: { s: 63.5, n: 64, w: -96, e: -95.5 } });
for (const z of zones) {
  const Z = computeZone(C[z.country], z.box);
  console.log('\n## ' + z.label + ' ' + T.boxText(z.box) + ' · ' + T.boxSize(z.box) + ' | grade ' + Z.grade + ' (' + Z.gradeWhy + ')' + (Z.empty ? ' EMPTY' : ''));
  console.log('  rule:', T.gradeRule(Z));
  if (Z.harmOK && Z.trend && Z.trend.status === 'uncertain') {
    console.log('  UNCERTAIN number:', T.corrFactor(Z), '| sensor effect |', T.uncertainSentence(Z), '|', T.withoutLine(Z));
  } else if (Z.harmOK) {
    console.log('  ROBUST number:', T.X(Z.riseH), '|', T.clause(Z), '| case', T.verdictCase(Z), '| range', T.bootRange(Z.trend));
    console.log('  sentence:', T.sentence(Z), '|', T.withoutLine(Z));
  } else console.log('  C:', T.whyC(Z));
  const s = T.story(Z, z.label); console.log('  story:', s.q, '/', s.a, '/', s.p);
  // V5 verdict strip and Evidence headings
  console.log('  V5 short sentence:', T.shortSentence(Z));
  if (Z.harmOK && Z.trend && Z.trend.status === 'uncertain') console.log('  V5 factor clause:', T.factorClause(Z));
  if (!Z.empty) console.log('  V5 headings:', T.proofHeading(Z, null), '|', T.looHeading(Z));
  for (const k of [END_KEY, '2025-12', '2023-06'].filter((k, i, a) => a.indexOf(k) === i)) {
    const i = monthIndex(k); let p = monthReading(Z, i);
    if (p.low && Z.harmOK) { const j = lastComparable(Z, i); console.log('  ' + k + ': too few (typ ' + p.typ.toFixed(1) + ') -> comparable', j == null ? 'none' : j); if (j != null) p = monthReading(Z, j); else continue; }
    if (Z.harmOK) console.log('  ' + p.y + '-' + (p.m + 1) + ':', T.NUM(p.v), 'typ', T.NUM(p.typ), '|', T.anomalyWords(p.anomaly, T.monthLong(p.m)), '|', T.rankWords(p.rank, p.of, T.monthLong(p.m)), '|', T.payoff(p), p.depends ? '| depends ' + p.rankRange : '');
  }
}
// synthetic combos for the verdict wording
console.log('\n## synthetic R/H combos');
for (const [R, H] of [[3.44, 1.63], [1.78, 0.77], [1.07, 0.55], [2.0, 1.0], [1.3, 1.25], [0.8, 0.4], [1.2, 1.9], [0.95, 0.72], [1.0, 0.85], [2.4, 2.3], [0.6, 0.55], [5.2, 2.0], [1.16, 1.0]]) {
  const Z = { riseRaw: R, riseH: H, harmOK: true };
  const s = T.story(Z);
  console.log(R, H, '|', T.verdictCase(Z), '|', T.clause(Z), '|', T.sentence(Z), '|', s.q, s.a, s.p);
}
// v6 Overview headline: both countries (from the metrics) and synthetic cases for every branch and verb band.
console.log('\n## Overview headline (rule table in src/copy.js)');
for (const c of ['canada', 'argentina']) { const p = PRESETS.find((q) => q.id === c); const Z = computeZone(C[c], p.box); const h = T.overviewHeadline(c === 'canada' ? 'Canada' : 'Argentina', Z.riseH, Z.riseRaw); console.log(c, 'H', T.X(Z.riseH), 'R', T.X(Z.riseRaw), 'rule', h.rule, '|', h.text, '| lede:', T.ratioWords(Z.ratio)); }
for (const [H, R] of [[2.0, 4.2], [1.85, 3.0], [2.3, 4.4], [2.4, 5.0], [1.5, 2.2], [1.1, 1.6], [3.0, 6.5], [0.7, 1.4], [0.9, 1.1], [1.0, 1.1], [1.2, 1.3], [0.5, 0.9], [1.05, 1.36], [1.0, 1.0], [1.0, 1.04], [1.3, 1.25]]) { const h = T.overviewHeadline('X', H, R); console.log('synthetic H', H, 'R', R, '→', h.rule, '|', h.text); }

// v6.2 (P7): generated surface sentences, every preset and the guard boxes: no banned technical term, at most 30 words.
{
  const BAN = [/cell-days?/i, /MCD14ML/, /VNP14IMGT/, /\bpooled\b/i, /bootstrap/i, /permutation/i, /leave-one-out/i, /Spearman/i, /\btiles?\b/i];
  const { guarded } = await import('../src/guard.js');
  let bad = 0, n = 0;
  const boxes = PRESETS.map((p) => [p.label, p.country, p.box]).concat([['Sherbrooke area', 'canada', { s: 45, n: 47, w: -73, e: -71 }], ['58–59°N', 'canada', { s: 58, n: 59, w: -100, e: -99 }], ['50–49°S', 'argentina', { s: -50, n: -49, w: -70, e: -69 }], ['27–25°S 58–56°W', 'argentina', { s: -27, n: -25, w: -58, e: -56 }]]);
  console.log('\n## v6.2 plain surface sentences (≤ 30 words, no banned terms)');
  for (const [lab, c, box] of boxes) {
    const Z = guarded(computeZone(C[c], box)), st = T.story(Z, lab);
    for (const x of [T.plainSentence(Z), st.q, st.a, st.p, T.proofHeading(Z, null), T.looHeading(Z)]) {
      if (!x) continue; n++;
      const words = x.split(/\s+/).length, ban = BAN.filter((re) => re.test(x));
      if (words > 30 || ban.length) { bad++; console.log('  FAIL', lab, words + 'w', ban.map((r) => r.source).join(','), x); }
    }
    console.log('  ' + lab + ': ' + T.plainSentence(Z));
  }
  console.log('plain sentences checked: ' + n + ', failed: ' + bad);
  if (bad) process.exitCode = 1;
}
