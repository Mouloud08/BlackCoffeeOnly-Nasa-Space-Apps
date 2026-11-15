// FireBridge — the one metrics module (app + self-check). Pure functions, no DOM.
// Rules: /home/claude/final/SPEC.md §9.1 (overrides COMMON_BRIEF §6 where they differ).
// The record's end comes from the data (setRecordEnd, called once before any computation; build.mjs embeds it).
//  NM       months in the record, 2001-01 .. END_KEY (300 for December 2025)
//  LAST     last COMPLETE year: annual statistics (rise, ratio, trend, typical month) use 2001..LAST only
//  CAL_LAST last year shown in the calendar and the month row; PARTIAL = { year, month } when CAL_LAST is incomplete
export const FIRST = 2001, SW = 2012;
// VIIRS (S-NPP) active-fire data begin on 20 January 2012: January 2012 is a partial VIIRS month (country VIIRS/MODIS
// 1.04 in Canada, 0.64 in Argentina, against about 2 in every other month). It is treated like a month before 2012:
// MODIS (× the ratio when harmonized), and it is left out of the ratio estimation and the monthly error.
export const VJ = (SW - FIRST) * 12; // index of 2012-01
export const isMODISMonth = (i) => i <= VJ;
export let LAST = 2025, CAL_LAST = 2025, NM = 300, END_KEY = '2025-12', PARTIAL = null;
export let YEARS = [], CAL_YEARS = [];
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export function setRecordEnd(key) {
  const y = +key.slice(0, 4), m = +key.slice(5, 7);
  END_KEY = key; NM = (y - FIRST) * 12 + m; CAL_LAST = y;
  LAST = m === 12 ? y : y - 1; PARTIAL = m === 12 ? null : { year: y, month: m };
  YEARS = range(FIRST, LAST); CAL_YEARS = range(FIRST, CAL_LAST);
}
setRecordEnd('2025-12');
// S-NPP VIIRS data production ended on 2 November 2026: from that month on the record continues on NOAA-20.
export const SNPP_END = '2026-11', CONT_FROM = '2026-01';
export const SERIES = ['modis', 'aqua', 'snpp', 'n20'];
export const STATS_FROM = 2003; // typical month, anomaly, ranks, record: 2003 onwards (2001-01..2002-06 is Terra only)
export const N20_FROM = monthIndexOf(2018, 4);
function monthIndexOf(y, m) { return (y - 2001) * 12 + m - 1; }
export const GAP = { ratio: 1.25, min: 200 };
export const LOW = 10; // a typical month under 10 cell-days: too few to compare
export const MIN_MODIS = 50; // an overlap year is "usable" for the leave-one-out test when MODIS has >= 50 cell-days
export const BORROW = { below: 5, need: 10, rings: 8 }; // wider-area rule
export const GRADE_RULES = { A: { years: 10, err: 0.30, spread: 0.10 }, B: { years: 5, err: 0.50, spread: 0.25 } };

// Boxes. Québec boxes are FIRMS_META zones of the DS (firms-data.js); Argentina boxes from the common brief §5.
export const PRESETS = [
  { id: 'canada', label: 'All of Canada', country: 'canada', box: { s: 41.5, n: 83, w: -141.5, e: -52.5 }, whole: true },
  { id: 'argentina', label: 'All of Argentina', country: 'argentina', box: { s: -55, n: -21.5, w: -73.5, e: -53.5 }, whole: true },
  { id: 'boreal', label: 'Boreal Québec', country: 'canada', box: { s: 47.5, n: 52.5, w: -80, e: -68 }, reference: true },
  { id: 'chibougamau', label: 'Chibougamau', country: 'canada', box: { s: 49.5, n: 51.5, w: -79, e: -72.5 }, reference: true },
  { id: 'cotenord', label: 'Côte-Nord', country: 'canada', box: { s: 48.5, n: 52.5, w: -70, e: -61 }, reference: true },
  { id: 'larioja', label: 'La Rioja', country: 'argentina', box: { s: -32, n: -27.5, w: -69.5, e: -65.5 } },
  { id: 'cordoba', label: 'Córdoba', country: 'argentina', box: { s: -35, n: -29.5, w: -66, e: -62 } },
  { id: 'tucuman', label: 'Tucumán', country: 'argentina', box: { s: -28, n: -26, w: -66.5, e: -64.5 } },
  { id: 'chilecito', label: 'Chilecito', country: 'argentina', box: { s: -29.5, n: -28.5, w: -68, e: -67 } },
];
export const sameBox = (a, b) => !!(a && b && a.s === b.s && a.n === b.n && a.w === b.w && a.e === b.e);
export const presetFor = (country, box) => PRESETS.find((p) => p.country === country && sameBox(p.box, box)) || null;
export const isReference = (country, box) => { const p = presetFor(country, box); return !!(p && p.reference); };

// Colour classes of the calendar: 9 classes (the DS ramp), breaks adapted to the zone. -1 for zero.
// Breaks are a log ladder of round values, anchored at the largest monthly value and going down 8 steps:
// 1-3-10 (half decades) by default, 1-2-5 (thirds of a decade) when half decades would leave more classes empty below
// the zone's smallest non-zero month (narrow ranges, e.g. La Rioja, Chilecito, All of Argentina). Never below 1.
export const NCLASS = 9;
export const DS_STEPS = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000];
const LADDERS = [[1, 3], [1, 2, 5]];
export function countBreaks(values) {
  let lo = Infinity, hi = 0;
  for (const v of values) if (v > 0) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!(hi > 0)) return DS_STEPS.slice();
  lo = Math.max(1, lo);
  let best = null;
  LADDERS.forEach((L, li) => {
    const lad = [];
    for (let e = -3; e <= 9; e++) L.forEach((m) => lad.push(+(m * Math.pow(10, e)).toPrecision(6)));
    lad.sort((a, b) => a - b);
    let top = lad.filter((x) => x <= hi).pop();
    let k = lad.indexOf(top);
    if (k - (NCLASS - 1) < 0 || lad[k - (NCLASS - 1)] < 1) k = lad.indexOf(1) + NCLASS - 1; // floor 1: start the ladder at 1
    const br = lad.slice(k - (NCLASS - 1), k + 1);
    const empty = br.slice(1).filter((b) => b <= lo).length + br.filter((b) => b > hi).length; // classes below the smallest or above the largest month
    if (!best || empty < best.empty) best = { br, empty, li };
  });
  return best.br;
}
export const countClass = (v, br = DS_STEPS) => { if (!(v > 0)) return -1; let k = 0; for (let i = 0; i < br.length; i++) if (v >= br[i]) k = i; return k; };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const partialLabel = () => (PARTIAL ? PARTIAL.year + ': partial year, to ' + MONTH_NAMES[PARTIAL.month - 1] : null);
export const endLabel = () => MONTH_NAMES[(NM - 1) % 12] + ' ' + CAL_LAST;
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : 0);
export function median(xs) {
  const s = xs.slice().sort((a, b) => a - b), n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
export const monthKey = (i) => (FIRST + Math.floor(i / 12)) + '-' + String((i % 12) + 1).padStart(2, '0');
export const monthIndex = (key) => (+key.slice(0, 4) - FIRST) * 12 + (+key.slice(5, 7) - 1);

/* ───────── decode ───────── */
// One country file -> flat typed arrays per series (month index, tile lat index, tile lon index, count),
// plus per-tile totals for the map and the country-wide totals (July 2024 check).
export function decodeCountry(D) {
  const out = { country: D.country, i0: D.i0, j0: D.j0, rows: D.rows, cols: D.cols, bbox: D.bbox, totals: D.totals || {}, s: {} };
  // Months whose VIIRS counts come from near-real-time files without the `type` column (2026 only).
  out.provSet = new Set((D.provisional || []).filter((p) => /^(snpp|n20):/.test(p)).map((p) => monthIndex(p.slice(-7))).filter((i) => i >= 0 && i < NM));
  for (const s of SERIES) {
    const src = D.series[s] || {};
    let n = 0;
    for (const ym in src) { const mi = monthIndex(ym); if (mi >= 0 && mi < NM) n += src[ym].split(';').length; }
    const M = new Int16Array(n), I = new Int16Array(n), J = new Int16Array(n), N = new Int32Array(n);
    let k = 0;
    for (const ym in src) {
      const mi = monthIndex(ym);
      if (mi < 0 || mi >= NM) continue;
      const parts = src[ym].split(';');
      for (let p = 0; p < parts.length; p++) {
        const t = parts[p]; const a = t.indexOf(','), b = t.indexOf(',', a + 1);
        M[k] = mi; I[k] = D.i0 + +t.slice(0, a); J[k] = D.j0 + +t.slice(a + 1, b); N[k] = +t.slice(b + 1); k++;
      }
    }
    out.s[s] = { M, I, J, N, n: k };
  }
  // Map shading: mean annual S-NPP cell-days per tile, 2012-2025 (VIIRS is the reference scale).
  const acc = new Map();
  const v = out.s.snpp;
  const mEnd = (LAST - FIRST + 1) * 12; // complete years only
  for (let k = 0; k < v.n; k++) { if (v.M[k] >= mEnd) continue; const key = (v.I[k] + 2048) * 4096 + (v.J[k] + 2048); acc.set(key, (acc.get(key) || 0) + v.N[k]); }
  out.tiles = [];
  acc.forEach((t, key) => { const i = Math.floor(key / 4096) - 2048, j = (key % 4096) - 2048; out.tiles.push({ i, j, lat: i * 0.5, lon: j * 0.5, total: t, mean: t / (LAST - SW + 1) }); });
  out.tileMap = new Map(out.tiles.map((t) => [t.i + ',' + t.j, t]));
  // S-NPP gap months: country-level NOAA-20 / S-NPP above 1.25 with both >= 200 cell-days (from 2018-04).
  const T = out.totals;
  out.gaps = [];
  if (T.snpp && T.n20) for (let i = N20_FROM; i < NM; i++) {
    const k = monthKey(i), a = T.n20[k] || 0, b = T.snpp[k] || 0;
    if (a >= GAP.min && b >= GAP.min && a / b > GAP.ratio) out.gaps.push({ i, key: k, snpp: b, n20: a, ratio: a / b });
  }
  // From 2026: months where S-NPP is absent (after its end, missing, or far below NOAA-20 country-wide) continue on
  // NOAA-20 rescaled to S-NPP (÷ the box's NOAA-20/S-NPP factor). Earlier outage months keep NOAA-20 as it is.
  const c0 = monthIndex(CONT_FROM), sEnd = monthIndex(SNPP_END);
  out.cont = [];
  for (let i = c0; i < NM; i++) {
    const k = monthKey(i), a = (T.n20 && T.n20[k]) || 0, b = (T.snpp && T.snpp[k]) || 0;
    if (!(a > 0)) continue;
    if (i >= sEnd || b === 0 || b < 0.5 * a || (a >= GAP.min && b >= GAP.min && a / b > GAP.ratio)) out.cont.push({ i, key: k, snpp: b, n20: a });
  }
  out.contSet = new Set(out.cont.map((g) => g.i));
  out.gaps = out.gaps.filter((g) => !out.contSet.has(g.i));
  out.gapSet = new Set(out.gaps.map((g) => g.i));
  // Country-wide NOAA-20/S-NPP factor (fallback for boxes with too few S-NPP detections).
  let ca = 0, cb = 0;
  if (T.snpp && T.n20) for (let i = N20_FROM; i < NM; i++) { if (out.gapSet.has(i) || out.contSet.has(i)) continue; const k = monthKey(i); ca += T.n20[k] || 0; cb += T.snpp[k] || 0; }
  out.n20Factor = cb > 0 ? ca / cb : 1;
  out.jul2024 = T.snpp && T.n20 && T.n20['2024-07'] ? { snpp: T.snpp['2024-07'], n20: T.n20['2024-07'], gap: 1 - T.snpp['2024-07'] / T.n20['2024-07'] } : null;
  return out;
}

/* ───────── box sums ───────── */
// Monthly sums of each series over tiles whose south-west corner (tile index × 0.5) lies in [s, n) × [w, e),
// i.e. tiles fully inside a box on the 0.5° grid.
export function boxMonthly(C, box) {
  const iS = Math.round(box.s * 2), iN = Math.round(box.n * 2), jW = Math.round(box.w * 2), jE = Math.round(box.e * 2);
  const res = {};
  for (const s of SERIES) {
    const a = new Float64Array(NM), d = C.s[s];
    for (let k = 0; k < d.n; k++) { const i = d.I[k], j = d.J[k]; if (i >= iS && i < iN && j >= jW && j < jE) a[d.M[k]] += d.N[k]; }
    res[s] = a;
  }
  res.snppOrig = Float64Array.from(res.snpp);
  if (C.gapSet) C.gapSet.forEach((i) => { res.snpp[i] = res.n20[i]; }); // NOAA-20 used in S-NPP outage months
  // NOAA-20 continuity factor for the box: sum NOAA-20 / sum S-NPP, 2018-04 .. end, outage and continued months excluded.
  let n20s = 0, sps = 0; const n20y = {};
  for (let i = N20_FROM; i < NM; i++) { if ((C.gapSet && C.gapSet.has(i)) || (C.contSet && C.contSet.has(i))) continue; const y = FIRST + Math.floor(i / 12); n20s += res.n20[i]; sps += res.snppOrig[i]; n20y[y] = n20y[y] || [0, 0]; n20y[y][0] += res.n20[i]; n20y[y][1] += res.snppOrig[i]; }
  const yr = Object.keys(n20y).map(Number).filter((y) => n20y[y][1] >= 50).map((y) => n20y[y][0] / n20y[y][1]);
  res.n20info = sps > 0 ? { factor: n20s / sps, lo: yr.length ? Math.min(...yr) : null, hi: yr.length ? Math.max(...yr) : null, sps } : null;
  res.contFactor = res.n20info && sps >= 50 ? res.n20info.factor : (C.n20Factor || 1);
  res.contFactorFrom = res.n20info && sps >= 50 ? 'box' : 'country';
  res.contMask = new Uint8Array(NM);
  if (C.contSet) C.contSet.forEach((i) => { res.snpp[i] = res.n20[i] / res.contFactor; res.contMask[i] = 1; }); // Computed: NOAA-20 rescaled to S-NPP
  return res;
}
const yearTotals = (arr) => { const o = {}; YEARS.forEach((y) => { let t = 0; for (let m = 0; m < 12; m++) t += arr[(y - FIRST) * 12 + m]; o[y] = t; }); return o; };

// The bridge for one area: pooled ratio over ALL overlap years; leave-one-out over usable years only.
export function bridgeStats(S) {
  const M = yearTotals(S.modis), A = yearTotals(S.aqua), Vt = yearTotals(S.snpp);
  // Overlap totals without January 2012 (partial VIIRS month) on either side.
  const V = {}; YEARS.forEach((y) => { V[y] = y >= SW ? Vt[y] - (y === SW ? S.snpp[VJ] : 0) : null; });
  const Mo = (y) => M[y] - (y === SW ? S.modis[VJ] : 0);
  const overlap = YEARS.filter((y) => y >= SW).map((y) => ({ year: y, modis: Mo(y), viirs: V[y] }));
  const sV = sum(overlap.map((r) => r.viirs)), sM = sum(overlap.map((r) => r.modis));
  const ratio = sM > 0 && sV > 0 ? sV / sM : null;
  const usable = overlap.filter((r) => r.modis >= MIN_MODIS);
  const loo = ratio != null && usable.length >= 2 ? usable.map((r) => {
    const rr = (sV - r.viirs) / (sM - r.modis);
    const predicted = r.modis * rr;
    const error = r.viirs > 0 ? Math.abs(predicted - r.viirs) / r.viirs : Infinity;
    return { year: r.year, ratio: rr, predicted, error, signed: r.viirs > 0 ? (predicted - r.viirs) / r.viirs : null, modis: r.modis, viirs: r.viirs };
  }) : [];
  const medErr = loo.length ? median(loo.map((l) => l.error)) : null;
  const rMin = loo.length ? Math.min(...loo.map((l) => l.ratio)) : ratio, rMax = loo.length ? Math.max(...loo.map((l) => l.ratio)) : ratio;
  const spread = ratio && loo.length ? (rMax - rMin) / ratio : null;
  // Hold-out: ratio on 2012-2018, predicting annual VIIRS 2019-2025 (usable years only).
  const tr = overlap.filter((r) => r.year <= 2018), te = usable.filter((r) => r.year >= 2019 && r.viirs > 0);
  const rTrain = sum(tr.map((r) => r.modis)) > 0 ? sum(tr.map((r) => r.viirs)) / sum(tr.map((r) => r.modis)) : null;
  const holdout = rTrain && te.length ? { ratio: rTrain, n: te.length, medErr: median(te.map((r) => Math.abs(r.modis * rTrain - r.viirs) / r.viirs)) } : null;
  // Monthly error: overlap months where both sensors have >= 30 cell-days.
  const me = [];
  const mEnd = (LAST - FIRST + 1) * 12; // complete years; continued (NOAA-20) months are not S-NPP and are left out
  if (ratio) for (let i = VJ + 1; i < mEnd; i++) if (!(S.contMask && S.contMask[i]) && S.modis[i] >= 30 && S.snpp[i] >= 30) me.push(Math.abs(S.modis[i] * ratio - S.snpp[i]) / S.snpp[i]);
  const monthly = me.length ? { n: me.length, medErr: median(me) } : null;
  return { M, A, V, overlap, usable, sumV: sV, sumM: sM, ratio, loo, medErr, rMin, rMax, spread, holdout, monthly };
}
// Grade of an area's OWN ratio (A, B or C) and which rule decided it.
export function ownGrade(b) {
  const G = GRADE_RULES, n = b.usable.length;
  if (b.ratio != null && b.medErr != null && n >= G.A.years && b.medErr <= G.A.err && b.spread <= G.A.spread) return 'A';
  if (b.ratio != null && b.medErr != null && n >= G.B.years && b.medErr <= G.B.err && b.spread <= G.B.spread) return 'B';
  return 'C';
}
export function ringBox(box, k, bb) {
  return { s: Math.max(bb.s, box.s - 0.5 * k), n: Math.min(bb.n, box.n + 0.5 * k), w: Math.max(bb.w, box.w - 0.5 * k), e: Math.min(bb.e, box.e + 0.5 * k) };
}

/* ───────── everything for one box ───────── */
export function computeZone(C, box) {
  const S = boxMonthly(C, box);
  const own = bridgeStats(S);
  const { M, A, V } = own;
  let src = own, borrowed = null, grade, gradeWhy;
  if (own.usable.length < BORROW.below) {
    const tried = [];
    for (let k = 1; k <= BORROW.rings; k++) {
      const wb = ringBox(box, k, C.bbox);
      if (tried.length && sameBox(wb, tried[tried.length - 1].box)) break; // clipped: no larger area exists
      const st = bridgeStats(boxMonthly(C, wb));
      tried.push({ k, box: wb, usable: st.usable.length });
      if (st.usable.length >= BORROW.need) { borrowed = { rings: k, box: wb, stats: st, grade: ownGrade(st) }; break; }
    }
    if (borrowed && borrowed.grade !== 'C') { src = borrowed.stats; grade = 'B'; gradeWhy = 'borrowed'; }
    else { grade = 'C'; gradeWhy = borrowed ? 'borrowed-weak' : 'no-wider'; }
    if (!borrowed) borrowed = { rings: null, tried };
  } else {
    grade = ownGrade(own);
    gradeWhy = 'own';
  }
  const harmOK = grade !== 'C' && src.ratio != null;
  const r = harmOK ? src.ratio : null, rMin = harmOK ? src.rMin : null, rMax = harmOK ? src.rMax : null;

  const raw = new Float64Array(NM), harm = new Float64Array(NM), lo = new Float64Array(NM), hi = new Float64Array(NM);
  for (let i = 0; i < NM; i++) {
    const y = FIRST + Math.floor(i / 12);
    if (y < SW || i === VJ) { raw[i] = S.modis[i]; harm[i] = harmOK ? r * S.modis[i] : S.modis[i]; lo[i] = harmOK ? rMin * S.modis[i] : S.modis[i]; hi[i] = harmOK ? rMax * S.modis[i] : S.modis[i]; }
    else { raw[i] = harm[i] = lo[i] = hi[i] = S.snpp[i]; }
  }
  const before = YEARS.filter((y) => y >= 2003 && y < SW), after = YEARS.filter((y) => y >= SW);
  const rise = (f) => { const b = mean(before.map(f)); return b > 0 ? mean(after.map(f)) / b : null; };
  // Annual total at factor k: MODIS × k before 2012; VIIRS after, with January 2012 = MODIS × k.
  const ann = (y, k) => (y < SW ? k * M[y] : V[y] + (y === SW ? k * S.modis[VJ] : 0));
  const riseRaw = rise((y) => ann(y, 1));
  const riseAt = (k) => rise((y) => ann(y, k));
  const riseH = harmOK ? riseAt(r) : null;
  const rr = harmOK ? [riseAt(rMin), riseAt(rMax)].sort((a, b) => a - b) : [null, null];
  const riseAqua = rise((y) => A[y]);
  const trend = harmOK ? trendRobustness(YEARS.filter((y) => y >= 2003).map((y) => ({ year: y, v: ann(y, r) }))) : null;
  const n20 = S.n20info;
  const levels = {
    raw: { before: mean(before.map((y) => M[y])), after: mean(after.map((y) => ann(y, 1))) },
    harmonized: harmOK ? { before: mean(before.map((y) => r * M[y])), after: mean(after.map((y) => ann(y, r))) } : null,
  };

  // Typical month = median of the shown series over all complete years (2001-2025). Harmonized when bridged; raw otherwise (not used for anomalies then).
  const series = harm;
  const typical = [];
  const SY = YEARS.filter((y) => y >= STATS_FROM);
  for (let m = 0; m < 12; m++) typical.push(median(SY.map((y) => series[(y - FIRST) * 12 + m])));
  const typYear = sum(typical);
  let critical = null;
  if (harmOK && typYear >= LOW) {
    for (let len = 1; len <= 12 && !critical; len++) {
      let best = null;
      for (let st = 0; st < 12; st++) { let t = 0; for (let k = 0; k < len; k++) t += typical[(st + k) % 12]; if (t >= 0.8 * typYear && (!best || t > best.t)) best = { start: st, len, t }; }
      if (best) critical = { start: best.start, len, share: best.t / typYear };
    }
  }
  const empty = sum(Array.from(S.modis)) + sum(Array.from(S.snpp)) === 0;
  // The ratio by calendar month (disclosure, not used to harmonize): Σ VIIRS ÷ Σ MODIS of that month over the overlap
  // (February 2012 .. last complete year), and its residual against the pooled ratio. A month counts as "active" when a
  // typical month has ≥ LOW cell-days and both sums are ≥ 30.
  const mEndC = (LAST - FIRST + 1) * 12, byMonth = [];
  for (let m = 0; m < 12; m++) {
    let a = 0, b = 0;
    for (let i = VJ + 1 + ((m - 1 + 12) % 12); i < mEndC; i += 12) if (i > VJ && !(S.contMask && S.contMask[i])) { a += S.snpp[i]; b += S.modis[i]; }
    byMonth.push({ m, V: a, M: b, ratio: b > 0 ? a / b : null });
  }
  const typAt = (m) => median(YEARS.filter((y) => y >= STATS_FROM).map((y) => harm[(y - FIRST) * 12 + m]));
  byMonth.forEach((x) => { x.resid = r && x.ratio != null ? x.ratio / r : null; x.active = typAt(x.m) >= LOW && x.V >= 30 && x.M >= 30; });
  const seamWarn = !!r && byMonth.some((x) => x.active && x.resid != null && (x.resid > 1.3 || x.resid < 1 / 1.3));
  // Months with no detection at all: before 2012 (2003–2011) and after (February 2012 .. last complete year).
  let zeroBefore = 0, zeroAfter = 0;
  for (let i = (STATS_FROM - FIRST) * 12; i < mEndC; i++) { if (raw[i] > 0) continue; if (isMODISMonth(i)) zeroBefore++; else zeroAfter++; }
  // Colour-class breaks of the calendar, shared by Raw and Harmonized so the switch shows the correction.
  const breaks = countBreaks(Array.from(raw).concat(Array.from(harm)));
  return {
    box, S, M, A, V, own, src, gapSet: C.gapSet, borrowed: gradeWhy === 'borrowed' || gradeWhy === 'borrowed-weak' ? borrowed : (gradeWhy === 'no-wider' ? borrowed : null), gradeWhy, grade, harmOK, empty,
    ratio: r, rMin, rMax, medErr: harmOK ? src.medErr : own.medErr, spread: harmOK ? src.spread : own.spread, usable: harmOK ? src.usable : own.usable, loo: harmOK ? src.loo : own.loo,
    raw, harm, lo, hi, breaks, byMonth, seamWarn, zeroBefore, zeroAfter, emptyNote: zeroBefore >= 3 && zeroBefore / ((SW - STATS_FROM) * 12 + 1) >= 3 * (zeroAfter / Math.max(1, (LAST - SW + 1) * 12 - 1)), annRaw: (y) => ann(y, 1), annHarm: (y) => ann(y, harmOK ? r : 1), riseRaw, riseH, riseHlo: rr[0], riseHhi: rr[1], riseAqua, levels, typical, typYear, critical, trend, n20, gaps: C.gaps || [],
    contSet: C.contSet || new Set(), cont: C.cont || [], contFactor: S.contFactor, contFactorFrom: S.contFactorFrom, provSet: C.provSet || new Set(),
    holdout: harmOK ? src.holdout : own.holdout, monthly: harmOK ? src.monthly : own.monthly,
  };
}

/* ───────── one calendar month across the 25 years ───────── */
// Value, typical, anomaly, rank among 25, rank among the 14 VIIRS years, and whether moving the computed years by
// ± the median leave-one-out error changes the rank.
// yr0..yr1: the page's date range (SPEC_V3 §6a); the typical month stays the median of the full period.
export function monthReading(Z, i, yr0 = FIRST, yr1 = CAL_LAST) {
  const m = i % 12, y = FIRST + Math.floor(i / 12);
  const arr = Z.harmOK ? Z.harm : Z.raw;
  // Every year in which this calendar month is available (the current partial year included once the month is in).
  const avail = CAL_YEARS.filter((yy) => (yy - FIRST) * 12 + m < NM && ((yy >= yr0 && yy <= yr1) || yy === y));
  const cm = (yy) => isMODISMonth((yy - FIRST) * 12 + m);
  const vals = avail.filter((yy) => yy >= STATS_FROM).map((yy) => ({ year: yy, v: arr[(yy - FIRST) * 12 + m], computed: cm(yy) }));
  const all = avail.map((yy) => ({ year: yy, v: arr[(yy - FIRST) * 12 + m], computed: cm(yy), partial: yy < STATS_FROM, cont: !!(Z.contSet && Z.contSet.has((yy - FIRST) * 12 + m)) }));
  const v = arr[i];
  const typ = Z.typical[m];
  const low = !Z.harmOK || typ < LOW;
  const rank = 1 + vals.filter((x) => x.v > v).length;
  const viirs = vals.filter((x) => !x.computed);
  const rankV = !cm(y) ? 1 + viirs.filter((x) => x.v > v).length : null;
  const modis = vals.filter((x) => x.computed);
  const rankM = cm(y) ? 1 + modis.filter((x) => x.v > v).length : null;
  let rankRange = null;
  if (Z.harmOK && Z.medErr != null) {
    const e = Z.medErr;
    const rk = (f) => { const hv = cm(y) ? v * f : v; return 1 + vals.filter((x) => x.year !== y && (x.computed ? x.v * f : x.v) > hv).length; };
    // The computed years all move together (one ratio): test both directions.
    const a = rk(1 - e), b = rk(1 + e);
    rankRange = [Math.min(a, b, rank), Math.max(a, b, rank)];
  }
  return { i, y, m, v, raw: Z.raw[i], typ, low, anomaly: !low && typ > 0 ? v / typ : null, rank, of: vals.length, rankV, ofV: viirs.length, rankM, ofM: modis.length, rankRange, depends: !!(rankRange && rankRange[0] !== rankRange[1]), vals, all, computed: cm(y), partial: y < STATS_FROM, gap: false };
}
// Most recent month (at or before i) whose typical value allows a comparison.
export function lastComparable(Z, i) {
  for (let j = i; j >= (STATS_FROM - FIRST) * 12; j--) if (Z.typical[j % 12] >= LOW) return j;
  return null;
}
export function recordMonth(Z) {
  const arr = Z.harmOK ? Z.harm : Z.raw;
  let best = -1, bv = -1;
  const i0 = (STATS_FROM - FIRST) * 12;
  for (let i = i0; i < NM; i++) if (Z.typical[i % 12] >= LOW && arr[i] > bv) { bv = arr[i]; best = i; }
  if (best < 0) for (let i = i0; i < NM; i++) if (arr[i] > bv) { bv = arr[i]; best = i; }
  return best;
}

/* ───────── calendar data in the DS BurnCalendar shape (same as realData()) ───────── */
export function calendarData(Z, y0 = FIRST, y1 = CAL_LAST) {
  const years = CAL_YEARS.filter((y) => y >= y0 && y <= y1);
  const cells = [], byKey = {};
  years.forEach((y) => {
    for (let m = 1; m <= 12; m++) {
      const i = (y - FIRST) * 12 + m - 1, key = monthKey(i);
      const med = Z.typical[m - 1];
      if (i >= NM) { const c = { key, year: y, month: m, sensor: 'viirs', status: 'future', raw: null, harmonized: null, median: med, ref: med, ratio: null, low: true, notes: [], cls: '' }; cells.push(c); byKey[key] = c; continue; }
      const c = { key, year: y, month: m, sensor: isMODISMonth(i) ? 'modis' : 'viirs', status: 'ok', raw: Z.raw[i], harmonized: Math.round(Z.harm[i]), lo: Math.round(Z.lo[i]), hi: Math.round(Z.hi[i]), median: med, ref: med };
      c.ratio = Z.harmOK && med > 0 ? Z.harm[i] / med : null;
      c.low = !Z.harmOK || med < LOW;
      if (!Z.harmOK) c.noCompare = 'Raw only: not comparable across 2012';
      c.notes = []; const cl = [];
      if (Z.harmOK && isMODISMonth(i) && countClass(c.raw, Z.breaks) !== countClass(c.harmonized, Z.breaks)) cl.push('is-chg');
      if (i === VJ) c.notes.push('Computed: S-NPP record starts 20 Jan 2012; this month is MODIS' + (Z.harmOK ? ' × ' + Z.ratio.toFixed(2) : '') + '.');
      if (y < STATS_FROM) { cl.push('is-era'); c.notes.push('Before 2003: partial MODIS coverage (Terra only until July 2002). Not used in statistics.'); }
      if (Z.gapSet && Z.gapSet.has(i)) { cl.push('is-gap'); c.notes.push('NOAA-20 used: S-NPP outage this month (S-NPP far below NOAA-20 country-wide).'); }
      if (Z.contSet && Z.contSet.has(i)) { cl.push('is-gap'); c.notes.push('Computed: NOAA-20 rescaled to S-NPP (÷ ' + Z.contFactor.toFixed(2) + ', ' + (Z.contFactorFrom === 'box' ? 'this box' : 'country-wide') + ' NOAA-20/S-NPP).'); }
      if (Z.provSet && Z.provSet.has(i)) c.notes.push('Provisional, not filtered for non-fire sources (near-real-time data).');
      if (PARTIAL && y === PARTIAL.year) c.notes.push(y + ': partial year, to ' + MONTH_NAMES[PARTIAL.month - 1] + '; not in annual statistics.');
      c.cls = cl.join(' ');
      cells.push(c); byKey[key] = c;
    }
  });
  const yt = (arr, y) => { let t = 0; for (let m = 0; m < 12; m++) { const i = (y - FIRST) * 12 + m; if (i < NM) t += arr[i]; } return t; };
  const annual = years.map((y) => ({ year: y, raw: yt(Z.raw, y), harmonized: Math.round(yt(Z.harm, y)), lo: Math.round(yt(Z.lo, y)), hi: Math.round(yt(Z.hi, y)), aquaRaw: y < 2003 || y > LAST ? null : Z.A[y], sensor: y < SW ? 'modis' : 'viirs', partial: !!(PARTIAL && y === PARTIAL.year), partialNote: PARTIAL && y === PARTIAL.year ? 'to ' + MONTH_NAMES[PARTIAL.month - 1].slice(0, 3) : null, preStats: y < STATS_FROM, cls: y < STATS_FROM ? 'is-era' : '' }));
  // Aqua index scaled to the harmonized level over the overlap (shape only; DS convention).
  const ov = YEARS.filter((y) => y >= SW);
  const aSum = sum(ov.map((y) => Z.A[y] || 0)), hSum = sum(ov.map((y) => Z.annHarm(y) || 0));
  const aquaScale = aSum > 0 ? hSum / aSum : 1;
  annual.forEach((a) => { a.aqua = a.aquaRaw == null ? null : Math.round(a.aquaRaw * aquaScale); });
  const full = y0 <= 2003 && y1 >= LAST;
  const step = {
    year: SW, stat: 'mean', raw: Z.riseRaw || 0, harmonized: Z.harmOK ? Z.riseH : Z.riseRaw || 0, aqua: Z.riseAqua || 0, before: [2003, SW - 1], after: [SW, LAST],
    levels: full ? { raw: Z.levels.raw, harmonized: Z.levels.harmonized || Z.levels.raw } : null,
    // Uncertain trend: the seam shows the correction factor (as the verdict card does), not the harmonized rise.
    override: Z.harmOK && Z.trend && Z.trend.status === 'uncertain' ? { pre: 'raw', value: Z.ratio, label: 'too high', other: 'sensor effect; trend uncertain', def: 'VIIRS ÷ MODIS over the overlap years: raw data after 2012 count ' + Z.ratio.toFixed(2) + '× what MODIS would' } : null,
  };
  const pre = cells.filter((c) => c.year < SW);
  const changed = Z.harmOK ? pre.filter((c) => countClass(c.raw, Z.breaks) !== countClass(c.harmonized, Z.breaks)).length : 0;
  return {
    changed, preMonths: pre.length, breaks: Z.breaks,
    years, cells, byKey, annual, step, switchYear: SW, lowMedian: LOW, illustrative: false, source: 'firms',
    validation: { ratio: Z.harmOK ? Z.ratio : 1, ratioLo: Z.rMin, ratioHi: Z.rMax, overlap: Z.usable.map((r) => ({ year: r.year, modis: r.modis, viirs: r.viirs })), years: [SW, LAST], loo: Z.loo },
    note: 'Real NASA FIRMS tiles, MCD14ML and VNP14IMGT',
  };
}

/* ───────── trend robustness on annual totals (before 2003-2011, after 2012-last) ───────── */
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function trendRobustness(rows, draws = 2000, seed = 20261114) {
  const b = rows.filter((r) => r.year < SW), a = rows.filter((r) => r.year >= SW);
  const m = (xs) => (xs.length ? sum(xs.map((r) => r.v)) / xs.length : 0);
  const rise = m(b) > 0 ? m(a) / m(b) : null;
  const big = rows.reduce((p, r) => (r.v > p.v ? r : p), rows[0]);
  const b2 = b.filter((r) => r.year !== big.year), a2 = a.filter((r) => r.year !== big.year);
  const without = m(b2) > 0 ? m(a2) / m(b2) : null;
  const rnd = mulberry32(seed), res = [];
  for (let k = 0; k < draws; k++) {
    let sb = 0, sa = 0;
    for (let i = 0; i < b.length; i++) sb += b[Math.floor(rnd() * b.length)].v;
    for (let i = 0; i < a.length; i++) sa += a[Math.floor(rnd() * a.length)].v;
    if (sb > 0) res.push((sa / a.length) / (sb / b.length));
  }
  res.sort((x, y) => x - y);
  const q = (p) => res[Math.min(res.length - 1, Math.max(0, Math.floor(p * (res.length - 1))))];
  const lo = res.length ? q(0.05) : null, hi = res.length ? q(0.95) : null;
  const pUp = res.length ? res.filter((x) => x > 1).length / res.length : null;
  const side = (x) => (x > 1 ? 1 : x < 1 ? -1 : 0);
  const robust = rise != null && lo != null && (lo > 1 || hi < 1) && without != null && side(without) === side(rise);
  return { rise, without, bigYear: big.year, lo, hi, pUp, status: robust ? 'robust' : 'uncertain', draws: res.length };
}

/* ───────── cell statistics: the map (SPEC_V3 §1) ───────── */
// Grid = the 0.5° tiles; years STATS_FROM (2003) .. LAST (complete years). VIIRS = S-NPP with the outage months on
// NOAA-20 (as boxMonthly) and, from 2026, the continued months on NOAA-20 ÷ the country factor.
export const CELL = { need: 300, eligible: 200, sens: [0.85, 1.15], high: 4, perms: 2000 };
const ck = (i, j) => (i + 2048) * 4096 + (j + 2048);
export function cellStats(C) {
  const Y0 = STATS_FROM, ny = LAST - Y0 + 1, mEnd = (LAST - FIRST + 1) * 12, m0 = (Y0 - FIRST) * 12;
  const cells = new Map();
  const get = (i, j) => { const k = ck(i, j); let c = cells.get(k); if (!c) { c = { i, j, lat: i * 0.5, lon: j * 0.5, M: new Float64Array(ny), V: new Float64Array(ny), MJ: 0 }; cells.set(k, c); } return c; };
  const md = C.s.modis;
  for (let k = 0; k < md.n; k++) { const mi = md.M[k]; if (mi < m0 || mi >= mEnd) continue; const c = get(md.I[k], md.J[k]); c.M[Math.floor(mi / 12) - (Y0 - FIRST)] += md.N[k]; if (mi === VJ) c.MJ += md.N[k]; }
  const sp = C.s.snpp, nn = C.s.n20, sub = (mi) => (C.gapSet && C.gapSet.has(mi)) || (C.contSet && C.contSet.has(mi));
  const v0 = VJ + 1; // VIIRS from February 2012 (January 2012 is partial)
  for (let k = 0; k < sp.n; k++) { const mi = sp.M[k]; if (mi < v0 || mi >= mEnd || sub(mi)) continue; get(sp.I[k], sp.J[k]).V[Math.floor(mi / 12) - (Y0 - FIRST)] += sp.N[k]; }
  for (let k = 0; k < nn.n; k++) {
    const mi = nn.M[k]; if (mi < v0 || mi >= mEnd || !sub(mi)) continue;
    const f = C.contSet && C.contSet.has(mi) ? 1 / (C.n20Factor || 1) : 1;
    get(nn.I[k], nn.J[k]).V[Math.floor(mi / 12) - (Y0 - FIRST)] += nn.N[k] * f;
  }
  const ys = SW - Y0; // index of 2012
  const list = [...cells.values()];
  let tV = 0, tM = 0;
  for (const c of list) { let a = 0, b = 0; for (let y = ys; y < ny; y++) { a += c.V[y]; b += c.M[y]; } b -= c.MJ; c.oV = a; c.oM = b; tV += a; tM += b; }
  const countryRatio = tM > 0 ? tV / tM : null;
  const nb = (c, r) => { let a = 0, b = 0; for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const o = cells.get(ck(c.i + di, c.j + dj)); if (o) { a += o.oV; b += o.oM; } } return [a, b]; };
  const recOf = (vals) => { let best = 0; for (let y = 1; y < vals.length; y++) if (vals[y] > vals[best]) best = y; return best; }; // ties: earliest year
  for (const c of list) {
    let [a, b] = nb(c, 1); c.rcase = 'own3';
    if (a < CELL.need || b < CELL.need) { [a, b] = nb(c, 2); c.rcase = 'own5'; }
    if (a < CELL.need || b < CELL.need) { c.ratio = countryRatio; c.rcase = 'country'; } else c.ratio = a / b;
    // Annual series at factor f: MODIS × f before 2012 and for January 2012; VIIRS from February 2012.
    const ser = (f) => { const h = new Float64Array(ny); for (let y = 0; y < ny; y++) h[y] = y < ys ? f * c.M[y] : c.V[y] + (y === ys ? f * c.MJ : 0); return h; };
    const raw = ser(1), H = ser(c.ratio);
    c.cum = H.reduce((s0, x) => s0 + x, 0);
    c.eligible = c.cum >= CELL.eligible;
    // Local ratio above 4×: not bridged (unusual for vegetation fire; possible non-fire heat sources, not verified).
    c.high = c.eligible && c.rcase !== 'country' && c.ratio > CELL.high;
    c.claim = c.eligible && !c.high;
    c.ri = recOf(raw); c.hi = recOf(H); c.mi = recOf(c.M);
    c.recRaw = Y0 + c.ri; c.recHarm = Y0 + c.hi; c.recModis = Y0 + c.mi;
    c.eraRaw = c.recRaw >= SW ? 'since' : 'before'; c.eraHarm = c.recHarm >= SW ? 'since' : 'before'; c.eraModis = c.recModis >= SW ? 'since' : 'before';
    c.depends = CELL.sens.some((f) => (Y0 + recOf(ser(c.ratio * f)) >= SW ? 'since' : 'before') !== c.eraHarm);
    c.det = (LAST >= SW) ? c.oV / (LAST - SW + 1) : 0; // mean annual VIIRS cell-days, Feb 2012..LAST
    c.H = H; c.R = raw;
  }
  list.sort((p, q) => q.i - p.i || p.j - q.j);
  // Chance permutations (seeded, deterministic): the same reshuffle of year labels for every place, so spatial
  // dependence (one big season sets many records at once) is kept.
  const rnd = mulberry32(20261115), perms = [];
  for (let k = 0; k < CELL.perms; k++) { const p = Array.from({ length: ny }, (_, y) => y); for (let y = ny - 1; y > 0; y--) { const z = Math.floor(rnd() * (y + 1)); const t = p[y]; p[y] = p[z]; p[z] = t; } perms.push(p); }
  const S = { cells: list, map: cells, countryRatio, years: [Y0, LAST], since: LAST - SW + 1, period: ny, ys, perms };
  S.summary = cellSummary(list, S);
  S.summaryAll = cellSummary(list, S, null, true);
  return S;
}
// Counters over the places a claim is made for (eligible, local ratio ≤ 4×), in the country or a box (cells whose
// south-west corner is in [s, n) × [w, e)). withHigh: include the > 4× places (for the report only).
export function cellSummary(list, S, box, withHigh = false) {
  const inBox = (c) => !box || (c.lat >= box.s && c.lat < box.n && c.lon >= box.w && c.lon < box.e);
  const L = list.filter((c) => (withHigh ? c.eligible : c.claim) && inBox(c));
  const n = L.length, sh = (f) => (n ? L.filter(f).length / n : null);
  const tops = (key) => { const t = {}; L.forEach((c) => { t[c[key]] = (t[c[key]] || 0) + 1; }); return Object.keys(t).map((y) => ({ year: +y, n: t[y], share: t[y] / n })).sort((a, b) => b.n - a.n); };
  // Chance range: share "since 2012" under each permutation of the year labels, 5th–95th percentile.
  const chance = (key) => {
    if (!n) return null;
    const h = new Array(S.period).fill(0); L.forEach((c) => { h[c[key]]++; });
    const v = S.perms.map((p) => { let k = 0; for (let y = 0; y < S.period; y++) if (h[y] && p[y] >= S.ys) k += h[y]; return k / n; }).sort((a, b) => a - b);
    const q = (x) => v[Math.min(v.length - 1, Math.max(0, Math.round(x * (v.length - 1))))];
    return { lo: q(0.05), hi: q(0.95), median: q(0.5) };
  };
  return {
    n, all: list.length, benchmark: S.since / S.period, excludedHigh: list.filter((c) => c.high && inBox(c)).length,
    sinceRaw: sh((c) => c.eraRaw === 'since'), sinceHarm: sh((c) => c.eraHarm === 'since'), sinceModis: sh((c) => c.eraModis === 'since'), depends: sh((c) => c.depends),
    chanceRaw: chance('ri'), chanceHarm: chance('hi'), chanceModis: chance('mi'),
    cases: { own3: sh((c) => c.rcase === 'own3'), own5: sh((c) => c.rcase === 'own5'), country: sh((c) => c.rcase === 'country') },
    topRaw: tops('recRaw').slice(0, 3), topHarm: tops('recHarm').slice(0, 3),
  };
}
export const versus = (x, ch) => (x == null || !ch ? null : x > ch.hi ? 'above' : x < ch.lo ? 'below' : 'inside');
const pct = (xs, p) => { const s0 = xs.slice().sort((a, b) => a - b); return s0.length ? s0[Math.min(s0.length - 1, Math.floor(p * (s0.length - 1) + 0.5))] : null; };
export const ratioPercentiles = (S) => { const r = S.cells.filter((c) => c.eligible).map((c) => c.ratio); return { p5: pct(r, 0.05), p50: pct(r, 0.5), p95: pct(r, 0.95) }; };
// "This month" layer: rank of the selected month's harmonized value among the same calendar month of every year in
// the period (2003 .. LAST, plus the partial year when that month is in). Places with a claim only.
export function monthLayer(C, S, mi) {
  const m = mi % 12, yS = FIRST + Math.floor(mi / 12), Y0 = STATS_FROM;
  const years = CAL_YEARS.filter((y) => y >= Y0 && (y - FIRST) * 12 + m < NM);
  const idx = new Map(years.map((y, k) => [y, k]));
  const vals = new Map();
  const add = (i, j, y, v) => { const k = ck(i, j); let a = vals.get(k); if (!a) { a = new Float64Array(years.length); vals.set(k, a); } a[idx.get(y)] += v; };
  const sub = (x) => (C.gapSet && C.gapSet.has(x)) || (C.contSet && C.contSet.has(x));
  const scan = (d, pick) => { for (let k = 0; k < d.n; k++) { const x = d.M[k]; if (x % 12 !== m || x >= NM) continue; const y = FIRST + Math.floor(x / 12); if (!idx.has(y)) continue; const w = pick(x, y, d.I[k], d.J[k]); if (w) add(d.I[k], d.J[k], y, d.N[k] * w); } };
  const cellOf = (i, j) => S.map.get(ck(i, j));
  scan(C.s.modis, (x, y, i, j) => { if (!isMODISMonth(x)) return 0; const c = cellOf(i, j); return c ? c.ratio : 0; });
  scan(C.s.snpp, (x) => (!isMODISMonth(x) && !sub(x) ? 1 : 0));
  scan(C.s.n20, (x) => (!isMODISMonth(x) && sub(x) ? (C.contSet && C.contSet.has(x) ? 1 / (C.n20Factor || 1) : 1) : 0));
  const out = new Map(); let rec = 0, top3 = 0, act = 0, none = 0;
  if (!idx.has(yS)) return { cls: out, counts: { rec, top3, act, none }, years };
  const sel = idx.get(yS);
  for (const c of S.cells) {
    if (!c.claim) continue;
    const a = vals.get(ck(c.i, c.j)), v = a ? a[sel] : 0;
    let cl;
    if (!(v > 0)) { cl = 'none'; none++; }
    else { const rank = 1 + a.filter((x) => x > v).length; cl = rank === 1 ? 'record' : rank <= 3 ? 'top3' : 'active'; if (cl === 'record') rec++; else if (cl === 'top3') top3++; else act++; }
    out.set(ck(c.i, c.j), cl);
  }
  return { cls: out, counts: { rec, top3, act, none }, years };
}
export const cellKey = ck;
// Detection floor in numbers: share of VIIRS cell-days (2012..LAST, S-NPP months) that fall in place-months where MODIS
// recorded nothing. No ratio can recover those before 2012 (a ratio times zero is zero).
export function floorShare(C) {
  const mEnd = (LAST - FIRST + 1) * 12, v0 = VJ + 1, seen = new Set();
  const md = C.s.modis; for (let k = 0; k < md.n; k++) if (md.M[k] >= v0 && md.M[k] < mEnd && md.N[k] > 0) seen.add(ck(md.I[k], md.J[k]) * 400 + md.M[k]);
  const sp = C.s.snpp; let all = 0, miss = 0;
  for (let k = 0; k < sp.n; k++) { const mi = sp.M[k]; if (mi < v0 || mi >= mEnd || (C.gapSet && C.gapSet.has(mi))) continue; all += sp.N[k]; if (!seen.has(ck(sp.I[k], sp.J[k]) * 400 + mi)) miss += sp.N[k]; }
  return all ? miss / all : null;
}
// 1° blocks (2 × 2 tiles) for the map at country scale: majority era of the eligible tiles inside; an exact tie is
// "mixed". Display only — every counter is computed on the 0.5° cells.
export function cellBlocks(S, harm) {
  const B = new Map();
  for (const c of S.cells) {
    if (!c.claim) continue;
    const bi = Math.floor(c.i / 2), bj = Math.floor(c.j / 2), k = bi * 100000 + bj;
    let b = B.get(k);
    if (!b) { b = { bi, bj, lat: bi, lon: bj, n: 0, since: 0, before: 0, depends: 0, sinceRaw: 0 }; B.set(k, b); }
    const era = harm ? c.eraHarm : c.eraRaw;
    b.n++; if (era === 'since') b.since++; else b.before++;
    if (c.eraRaw === 'since') b.sinceRaw++;
    if (c.depends) b.depends++;
  }
  for (const b of B.values()) b.era = b.since > b.before ? 'since' : b.since < b.before ? 'before' : 'mixed';
  return B;
}
// Places whose record era changes between raw and harmonized (eligible 0.5° cells; country or box).
export function flipCounts(S, box) {
  let toBefore = 0, toSince = 0, n = 0;
  for (const c of S.cells) {
    if (!c.claim || (box && !(c.lat >= box.s && c.lat < box.n && c.lon >= box.w && c.lon < box.e))) continue;
    n++;
    if (c.eraRaw === 'since' && c.eraHarm === 'before') toBefore++;
    if (c.eraRaw === 'before' && c.eraHarm === 'since') toSince++;
  }
  return { n, toBefore, toSince };
}
