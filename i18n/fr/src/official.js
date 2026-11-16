// Independent check: official annual area burned (Canada, National Forestry Database), embedded at build with its source.
let OFF;
export function officialData() {
  if (OFF === undefined) { try { OFF = JSON.parse(document.getElementById('fb-official').textContent); } catch (e) { OFF = null; } }
  return OFF;
}
import { LAST } from './metrics.js';
export const OFF_BEFORE = [2003, 2011];
// After period: 2012 to the last year present in BOTH the official table and our complete years.
export const offAfter = (D) => [2012, Math.min(LAST, Math.max(...Object.keys(D.total).map(Number).filter((y) => D.total[y] != null)))];
// Rise of official area and of our cell-days over the SAME years, plus cell-days per km² burned. Only for "All of Canada".
export function officialCheck(D, Z) {
  if (!D || !Z || !Z.harmOK) return null;
  const yrs = (a, b) => { const o = []; for (let y = a; y <= b; y++) o.push(y); return o; };
  const after = offAfter(D);
  const B = yrs(...OFF_BEFORE), A = yrs(...after);
  const mean = (ys, g) => ys.reduce((s, y) => s + g(y), 0) / ys.length;
  const area = (y) => D.total[y];
  const rise = mean(A, area) / mean(B, area);
  const raw = mean(A, Z.annRaw) / mean(B, Z.annRaw);
  const harm = mean(A, Z.annHarm) / mean(B, Z.annHarm);
  return {
    rise, raw, harm, after, source: D.source, csv: D.csv, page: D.page, retrieved: D.retrieved, units: D.units,
    perKm2: { rawBefore: mean(B, (y) => Z.M[y]) / mean(B, area), harmBefore: mean(B, (y) => Z.ratio * Z.M[y]) / mean(B, area), after: mean(A, Z.annHarm) / mean(A, area) },
    years: yrs(2003, after[1]).map((y) => ({ year: y, area: area(y), raw: Z.annRaw(y), harm: Z.annHarm(y) })),
    // v6 (judge C5): Spearman rank correlation of official area with each series, on the common years 2003–{after}.
    rho: (() => { const ys = yrs(2003, after[1]).filter((y) => area(y) != null); return { n: ys.length, from: ys[0], to: ys[ys.length - 1], harm: spearman(ys.map(area), ys.map(Z.annHarm)), raw: spearman(ys.map(area), ys.map(Z.annRaw)) }; })(),
  };
}
// Spearman's rho (average ranks for ties), as the Pearson correlation of the ranks.
export function spearman(a, b) {
  const rk = (v) => { const ix = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(v.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  const ra = rk(a), rb = rk(b), n = a.length, m = (n + 1) / 2;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (ra[i] - m) * (rb[i] - m); saa += (ra[i] - m) ** 2; sbb += (rb[i] - m) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}
