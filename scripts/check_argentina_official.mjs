// Independent check for Argentina (run from the repo root: node scripts/check_argentina_official.mjs).
// Compares annual burned area from GWIS (MODIS MCD64A1 burned-area product, data/official/argentina_area_burned.json)
// with FireBridge's raw and harmonized detection series for "All of Argentina", exactly as the app compares Canada
// with the National Forestry Database: src/official.js officialCheck() (mean 2012–Y ÷ mean 2003–2011 on the same
// years, Spearman rank correlation on the common years 2003–Y). Nothing in src/ is modified; tiles load like
// tools-win/selfcheck.mjs.
import fs from 'fs';
import { decodeCountry, computeZone, PRESETS, setRecordEnd, LAST } from '../src/metrics.js';
import { officialCheck, spearman } from '../src/official.js';
import { loadTiles } from '../tools-win/tiles.mjs';

const here = new URL('..', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
const LT = loadTiles(here); setRecordEnd(LT.end);
const AR = decodeCountry(LT.tiles.argentina);
const P = PRESETS.find((q) => q.id === 'argentina');
const Z = computeZone(AR, P.box);
const D = JSON.parse(fs.readFileSync(here + 'data/official/argentina_area_burned.json', 'utf8'));
const f = (x, d = 2) => (x == null || Number.isNaN(x) ? '—' : x.toFixed(d));
const fi = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));

// 1. The JSON values must equal the downloaded original, row for row.
const rawRows = fs.readFileSync(here + 'data/official/raw/argentina_gwis_owid_annual-area-burnt-by-wildfires-gwis_ARG.csv', 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
const bad = rawRows.filter((r) => D.total[r[2]] !== Number(r[3]));
console.log('Record ends', LT.end, '| last complete year', LAST, '| zone', P.label, '| ratio', f(Z.ratio), '| grade', Z.grade, '| harmOK', Z.harmOK);
console.log('JSON vs raw GWIS CSV:', rawRows.length, 'rows,', bad.length ? 'MISMATCH ' + JSON.stringify(bad) : 'identical');
console.log('App headline (computeZone, 2012–' + LAST + ' ÷ 2003–2011): raw', f(Z.riseRaw), '| harmonized', f(Z.riseH));

const cut = (tot, a, b) => { const o = {}; for (const y in tot) if (+y >= a && +y <= b && tot[y] != null) o[y] = tot[y]; return o; };
const mean = (ys, g) => ys.reduce((s, y) => s + g(y), 0) / ys.length;
const yrs = (a, b) => { const o = []; for (let y = a; y <= b; y++) o.push(y); return o; };
// Leave-one-year-out range of each ratio (how much a single year decides it).
function loo(tot, after) {
  const B = yrs(2003, 2011), A = yrs(2012, after), all = B.concat(A), out = { off: [], raw: [], harm: [] };
  for (const drop of all) {
    const b = B.filter((y) => y !== drop), a = A.filter((y) => y !== drop);
    out.off.push(mean(a, (y) => tot[y]) / mean(b, (y) => tot[y]));
    out.raw.push(mean(a, Z.annRaw) / mean(b, Z.annRaw));
    out.harm.push(mean(a, Z.annHarm) / mean(b, Z.annHarm));
  }
  const r = (v) => f(Math.min(...v)) + '–' + f(Math.max(...v));
  return { off: r(out.off), raw: r(out.raw), harm: r(out.harm) };
}
// Seeded permutation of the year labels (same idea as the map's chance ranges): share of the 9 / n-9 splits whose
// official ratio is at or below the observed one.
function perm(tot, after, obs, n = 20000) {
  const ys = yrs(2003, after); let s = 12345, k = 0;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < n; i++) {
    const v = ys.map((y) => tot[y]);
    for (let j = v.length - 1; j > 0; j--) { const t = Math.floor(rnd() * (j + 1)); [v[j], v[t]] = [v[t], v[j]]; }
    const b = v.slice(0, 9), a = v.slice(9);
    if (a.reduce((p, q) => p + q, 0) / a.length / (b.reduce((p, q) => p + q, 0) / b.length) <= obs + 1e-12) k++;
  }
  return k / n;
}
function run(label, tot) {
  const O = officialCheck({ total: tot, source: label }, Z);
  if (!O) { console.log(label, ': officialCheck returned null (harmonization not OK for this zone)'); return null; }
  const L = loo(tot, O.after[1]);
  console.log('\n## ' + label);
  console.log('Rise 2012–' + O.after[1] + ' / 2003–2011: burned area', f(O.rise), '| raw', f(O.raw), '| harmonized', f(O.harm));
  console.log('Leave-one-year-out range: burned area', L.off, '| raw', L.raw, '| harmonized', L.harm);
  console.log('Spearman rho over ' + O.rho.from + '–' + O.rho.to + ' (n ' + O.rho.n + '): burned area vs harmonized', f(O.rho.harm), '| burned area vs raw', f(O.rho.raw));
  console.log('Permutation (20,000 seeded relabellings of the years): share with a burned-area ratio ≤ observed', f(perm(tot, O.after[1], O.rise), 3));
  console.log('| year | burned area | raw cell-days | harmonized cell-days |');
  console.log('|---|---|---|---|');
  for (const r of O.years) if (r.area != null) console.log('| ' + [r.year, fi(r.area), fi(r.raw), fi(r.harm)].join(' | ') + ' |');
  return O;
}

const G = D.total;
console.log('\nSource:', D.source);
console.log('Units:', D.units, '| retrieved', D.retrieved, '|', D.csv);
run('GWIS burned area (MCD64A1), main window 2003–2024 (the same years as the Canada check)', cut(G, 2003, 2024));
run('GWIS burned area (MCD64A1), 2003–' + LAST + ' (latest release year included)', cut(G, 2003, LAST));
const g24 = cut(G, 2003, 2024);
const no = (y) => { const o = { ...g24 }; delete o[y]; return o; };
for (const y of [2003, 2020, 2017]) {
  const t = no(y), B = yrs(2003, 2011).filter((x) => x !== y), A = yrs(2012, 2024).filter((x) => x !== y);
  console.log('Without ' + y + ' (2003–2024): burned area', f(mean(A, (x) => t[x]) / mean(B, (x) => t[x])), '| raw', f(mean(A, Z.annRaw) / mean(B, Z.annRaw)), '| harmonized', f(mean(A, Z.annHarm) / mean(B, Z.annHarm)));
}
run('Cross-check, CRU global fire dashboard (same MCD64A1 product, C6.1), 2003–2022 (2023 incomplete in the file)', cut(D.secondary.cru_mcd64a1.total, 2003, 2022));
run('Secondary, Argentina native forest affected by fire (Subsecretaría de Ambiente, CIAM dt 382), 2003–2023', cut(D.secondary.argentina_native_forest.total, 2003, 2023));
// Spearman sanity: the app's function on a known case.
console.log('\nspearman([1,2,3,4],[1,3,2,4]) =', f(spearman([1, 2, 3, 4], [1, 3, 2, 4]), 3), '(expected 0.800)');
