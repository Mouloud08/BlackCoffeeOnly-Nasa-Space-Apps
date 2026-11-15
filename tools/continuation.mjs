// Continuation test: hide S-NPP for 2025, continue on NOAA-20 ÷ the box's NOAA-20/S-NPP factor (2018-04..2024-12,
// outage months excluded), compare with the real S-NPP 2025 — annual total and month by month.
import fs from 'fs';
import { decodeCountry, boxMonthly, PRESETS, N20_FROM, NM, FIRST, median } from '../src/metrics.js';
const here = new URL('..', import.meta.url).pathname;
const C = { canada: decodeCountry(JSON.parse(fs.readFileSync(here + 'data/canada.json'))), argentina: decodeCountry(JSON.parse(fs.readFileSync(here + 'data/argentina.json'))) };
const i25 = (2025 - FIRST) * 12;
console.log('| zone | factor (2018-04..2024) | S-NPP 2025 real | continued from NOAA-20 | annual error | median monthly error (months ≥ 30) |');
console.log('|---|---|---|---|---|---|');
for (const p of PRESETS) {
  const c = C[p.country], S = boxMonthly(c, p.box);
  let a = 0, b = 0;
  for (let i = N20_FROM; i < i25; i++) { if (c.gapSet.has(i)) continue; a += S.n20[i]; b += S.snppOrig[i]; }
  const f = b > 0 ? a / b : null;
  let real = 0, cont = 0; const me = [];
  for (let i = i25; i < NM; i++) { real += S.snpp[i]; const est = f ? S.n20[i] / f : 0; cont += est; if (S.snpp[i] >= 30) me.push(Math.abs(est - S.snpp[i]) / S.snpp[i]); }
  console.log('| ' + [p.label, f ? f.toFixed(3) : '—', real, Math.round(cont), real ? ((cont - real) / real * 100).toFixed(1) + '%' : '—', me.length ? (median(me) * 100).toFixed(0) + '% (n ' + me.length + ')' : '—'].join(' | ') + ' |');
}
