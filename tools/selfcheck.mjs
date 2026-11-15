// Self-check (SPEC §9.1 + SPEC_V2 §1) on the embedded tiles, with the module the app uses.
import fs from 'fs';
import { decodeCountry, computeZone, PRESETS, setRecordEnd } from '../src/metrics.js';
import { LAST } from '../src/metrics.js';
import { loadTiles } from './tiles.mjs';
const here = new URL('..', import.meta.url).pathname;
const C = {};
const LT = loadTiles(here); setRecordEnd(LT.end); // data/2026 merged when present
console.log('Record ends', LT.end, '| last complete year', LAST);
for (const c of ['canada', 'argentina']) C[c] = decodeCountry(LT.tiles[c]);
for (const c of ['canada', 'argentina']) if (C[c].cont.length) console.log('Months continued on NOAA-20 rescaled to S-NPP (' + c + '):', C[c].cont.map((g) => g.key).join(', '), '| provisional months:', [...C[c].provSet].length, '| country NOAA-20/S-NPP', C[c].n20Factor.toFixed(3));
for (const c of ['canada', 'argentina']) console.log('S-NPP gap months (' + c + '):', C[c].gaps.map((g) => g.key + ' N20/SNPP ' + g.ratio.toFixed(2) + ' (' + g.snpp + ' vs ' + g.n20 + ')').join('; ') || 'none');
const f = (x, d = 2) => (x == null ? '—' : x.toFixed(d)), p = (x) => (x == null ? '—' : (x * 100).toFixed(0) + '%');
const zones = PRESETS.map((q) => ({ label: q.label, country: q.country, box: q.box }));
zones.push({ label: 'NWT (judge)', country: 'canada', box: { s: 58, n: 63.5, w: -125.5, e: -116.5 } });
zones.push({ label: 'Lac-Saint-Jean', country: 'canada', box: { s: 48, n: 50, w: -76, e: -72 } });
zones.push({ label: 'Nunavik C (judge)', country: 'canada', box: { s: 58, n: 59, w: -75, e: -74 } });
console.log('\n| zone | r (LOO range) | raw rise | harm rise | without largest (year) | bootstrap 90% | P(rise>1) | trend | bridge | LOO err | hold-out err | monthly err | Aqua | NOAA-20/S-NPP (yearly) |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const z of zones) {
  const Z = computeZone(C[z.country], z.box), T = Z.trend;
  console.log('| ' + [z.label, f(Z.ratio) + ' (' + f(Z.rMin) + '–' + f(Z.rMax) + ')' + (Z.gradeWhy === 'borrowed' ? ' borrowed' : ''), f(Z.riseRaw), f(Z.riseH), T ? f(T.without) + ' (' + T.bigYear + ')' : '—', T ? f(T.lo) + '–' + f(T.hi) : '—', T ? p(T.pUp) : '—', T ? T.status : '—', Z.grade, p(Z.medErr), Z.holdout ? p(Z.holdout.medErr) + ' (r12-18 ' + f(Z.holdout.ratio) + ')' : '—', Z.monthly ? p(Z.monthly.medErr) + ' (n ' + Z.monthly.n + ')' : '—', f(Z.riseAqua), Z.n20 ? f(Z.n20.factor) + ' (' + f(Z.n20.lo) + '–' + f(Z.n20.hi) + ')' : '—'].join(' | ') + ' |');
}
// Official area burned, All of Canada.
const ab = JSON.parse(fs.readFileSync(here + 'data/official/canada_area_burned.json', 'utf8')).total;
const Zc = computeZone(C.canada, PRESETS[0].box);
const mean = (ys, g) => ys.reduce((s, y) => s + g(y), 0) / ys.length;
const B = [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011], A = []; for (let y = 2012; y <= Math.min(LAST, Math.max(...Object.keys(ab).map(Number))); y++) A.push(y);
const off = mean(A, (y) => ab[y]) / mean(B, (y) => ab[y]);
const raw = mean(A, Zc.annRaw) / mean(B, Zc.annRaw), harm = mean(A, Zc.annHarm) / mean(B, Zc.annHarm);
console.log('\nOfficial area burned (NFD) rise 2012–' + A[A.length - 1] + ' / 2003–2011:', f(off), '| raw', f(raw), '| harmonized', f(harm), '| cell-days per km² before (raw, harm):', f(mean(B, (y) => Zc.M[y]) / mean(B, (y) => ab[y]), 3), f(mean(B, (y) => Zc.ratio * Zc.M[y]) / mean(B, (y) => ab[y]), 3), '| after:', f(mean(A, Zc.annHarm) / mean(A, (y) => ab[y]), 3));
const Zc20 = (() => { let v = 0, m = 0; Zc.own.overlap.filter((o) => o.year <= 2020).forEach((o) => { v += o.viirs; m += o.modis; }); return v / m; })();
console.log('Canada ratio 2012–2020 vs all years:', f(Zc20, 3), f(Zc.ratio, 3));

// SPEC_V3 §1: cell statistics for the map.
import('../src/metrics.js').then(({ cellStats, ratioPercentiles, cellSummary }) => {
  const P = (x) => (x == null ? '—' : (x * 100).toFixed(1) + '%');
  console.log('\n## Map: cell statistics (0.5° cells, 2003–' + LAST + ', eligible = ≥ 200 harmonized cell-days)');
  console.log('| country | cells (with detections) | eligible | ratio case own3 / own5 / country | record since 2012 raw | harmonized | benchmark | depends on ratio | top record years raw | top record years harmonized | local ratio p5 / p50 / p95 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  const out = {};
  for (const c of ['canada', 'argentina']) {
    const t0 = Date.now(), S = cellStats(C[c]), s = S.summary, q = ratioPercentiles(S); out[c] = S;
    const ty = (t) => t.map((x) => x.year + ' ' + P(x.share)).join(', ');
    console.log('| ' + [c, s.all, s.n, P(s.cases.own3) + ' / ' + P(s.cases.own5) + ' / ' + P(s.cases.country), P(s.sinceRaw), P(s.sinceHarm), P(s.benchmark) + ' (' + S.since + '/' + S.period + ')', P(s.depends), ty(s.topRaw), ty(s.topHarm), f(q.p5) + ' / ' + f(q.p50) + ' / ' + f(q.p95)].join(' | ') + ' |  (' + (Date.now() - t0) + ' ms; country ratio ' + f(S.countryRatio, 3) + ')');
  }
  for (const c of ['canada', 'argentina']) {
    const S = out[c], top = [];
    for (const x of S.cells.filter((x) => x.eligible && x.rcase !== 'country').sort((a, b) => b.ratio - a.ratio)) { if (top.every((t) => Math.abs(t.lat - x.lat) > 1 || Math.abs(t.lon - x.lon) > 1)) top.push(x); if (top.length === 5) break; }
    console.log('Highest local ratios (' + c + ', eligible cells ≥ 1° apart): ' + top.map((x) => x.lat + '–' + (x.lat + 0.5) + '°, ' + x.lon + '–' + (x.lon + 0.5) + '°: ' + f(x.ratio) + ' (' + x.rcase + ', ' + Math.round(x.cum) + ' cell-days)').join('; '));
    const above4 = S.cells.filter((x) => x.eligible && x.ratio > 4).length;
    console.log('  eligible cells with local ratio > 4: ' + above4);
  }
  for (const z of PRESETS.filter((p) => !p.whole)) { const s = cellSummary(out[z.country].cells, out[z.country], z.box); console.log('Box ' + z.label + ': ' + s.n + ' eligible cells; record since 2012 raw ' + P(s.sinceRaw) + ', harmonized ' + P(s.sinceHarm) + ', depends ' + P(s.depends)); }
});
import('../src/metrics.js').then(({ cellStats, monthLayer, monthIndex }) => {
  for (const [c, k] of [['canada', '2023-06'], ['canada', '2025-12'], ['argentina', '2020-09'], ['argentina', '2025-12']]) {
    const S = cellStats(C[c]), L = monthLayer(C[c], S, monthIndex(k));
    console.log('This-month layer ' + c + ' ' + k + ': record ' + L.counts.rec + ', top 3 ' + L.counts.top3 + ', active ' + L.counts.act + ', no detection ' + L.counts.none + ' (of ' + S.summary.n + ' eligible; ' + L.years.length + ' years compared)');
  }
});
import('../src/metrics.js').then(({ floorShare }) => {
  for (const c of ['canada', 'argentina']) console.log('Detection floor ' + c + ': ' + (floorShare(C[c]) * 100).toFixed(1) + '% of VIIRS cell-days 2012–' + LAST + ' fall in place-months (0.5°, month) where MODIS recorded nothing');
});
import('../src/metrics.js').then(({ cellStats, flipCounts, cellBlocks }) => {
  for (const c of ['canada', 'argentina']) {
    const S = cellStats(C[c]), f = flipCounts(S), bh = [...cellBlocks(S, true).values()], br = [...cellBlocks(S, false).values()];
    const cnt = (L) => ({ since: L.filter((b) => b.era === 'since').length, before: L.filter((b) => b.era === 'before').length, mixed: L.filter((b) => b.era === 'mixed').length });
    console.log('Flip ' + c + ': ' + f.toBefore + ' places move from since 2012 to before 2012 when harmonized, ' + f.toSince + ' the other way (of ' + f.n + '); 1° blocks raw ' + JSON.stringify(cnt(br)) + ', harmonized ' + JSON.stringify(cnt(bh)));
  }
});
import('../src/metrics.js').then(({ cellStats, cellSummary, versus, PRESETS: PR }) => {
  const P = (x) => (x == null ? '—' : (x * 100).toFixed(1) + '%'), R = (c) => (c ? P(c.lo) + '–' + P(c.hi) : '—');
  console.log('\n## Record since 2012 vs chance (year labels permuted together for every place, 2000 seeded permutations, 5th–95th percentile)');
  console.log('| area | places | raw (chance) | harmonized (chance) | MODIS alone (chance) | with the > 4× places: n, raw, harmonized |');
  console.log('|---|---|---|---|---|---|');
  const row = (label, s, a) => console.log('| ' + [label, s.n + (s.excludedHigh ? ' (' + s.excludedHigh + ' > 4× excluded)' : ''), P(s.sinceRaw) + ' (' + R(s.chanceRaw) + ', ' + versus(s.sinceRaw, s.chanceRaw) + ')', P(s.sinceHarm) + ' (' + R(s.chanceHarm) + ', ' + versus(s.sinceHarm, s.chanceHarm) + ')', P(s.sinceModis) + ' (' + R(s.chanceModis) + ', ' + versus(s.sinceModis, s.chanceModis) + ')', a ? a.n + ', ' + P(a.sinceRaw) + ', ' + P(a.sinceHarm) : '—'].join(' | ') + ' |');
  const S = { canada: cellStats(C.canada), argentina: cellStats(C.argentina) };
  for (const c of ['canada', 'argentina']) row(c, S[c].summary, S[c].summaryAll);
  for (const z of PRESETS.filter((p) => !p.whole)) row(z.label, cellSummary(S[z.country].cells, S[z.country], z.box), cellSummary(S[z.country].cells, S[z.country], z.box, true));
});
import('../src/metrics.js').then(({ computeZone, PRESETS: PR }) => {
  console.log('\n## The ratio by calendar month (Σ VIIRS ÷ Σ MODIS, Feb 2012–' + LAST + '; residual = ÷ pooled ratio; * = active month)');
  for (const p of PRESETS) {
    const Z = computeZone(C[p.country], p.box); if (!Z.harmOK) continue;
    console.log(p.label.padEnd(17) + ' pooled ' + Z.ratio.toFixed(2) + ' | ' + Z.byMonth.map((x) => ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][x.m] + ' ' + (x.ratio == null ? '—' : x.ratio.toFixed(2)) + (x.active ? '*' : '')).join(' ') + ' | seam note ' + (Z.seamWarn ? 'yes' : 'no') + ' | empty months 2003–2011 / after: ' + Z.zeroBefore + ' / ' + Z.zeroAfter);
  }
});
