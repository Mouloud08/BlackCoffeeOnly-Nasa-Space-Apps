// Research prototype (not shipped, not used by the app): does a correction that varies BY PLACE, or that models the
// DETECTION FLOOR, harmonize MODIS → VIIRS better than one ratio per zone?  Run: node research/spatial.mjs
// Uses the app's own module (src/metrics.js, src/guard.js) and the Windows tile loader; nothing in src/ is modified.
// Deterministic: the only randomness is trendRobustness's seeded bootstrap (metrics.js).
import fs from 'fs';
import * as MX from '../src/metrics.js';
import { decodeCountry, computeZone, setRecordEnd, cellStats, ratioPercentiles, floorShare, trendRobustness, median, PRESETS, cellKey, CELL } from '../src/metrics.js';
import { guarded, GUARD } from '../src/guard.js';
import { loadTiles } from '../tools-win/tiles.mjs';

const here = new URL('..', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
const LT = loadTiles(here); setRecordEnd(LT.end);
const { FIRST, SW, VJ, STATS_FROM } = MX, LAST = MX.LAST;
const COUNTRIES = ['canada', 'argentina'];
const C = {}; for (const c of COUNTRIES) C[c] = decodeCountry(LT.tiles[c]);
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? '—' : x.toFixed(d)), pc = (x, d = 1) => (x == null || !isFinite(x) ? '—' : (x * 100).toFixed(d) + '%');
const out = [];
const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };

/* ───────── 1. Baseline reproduction with the app's functions ───────── */
log('# FireBridge research: place-aware and floor-aware harmonization (research/spatial.mjs)');
log('Record ends ' + LT.end + ' | last complete year ' + LAST + ' | overlap years ' + SW + '–' + LAST + ' (January 2012 is a MODIS month)');
log('\n## 1. Baseline reproduced with src/metrics.js (reference = tools-win/selfcheck.mjs output)');
const REF = {
  canada: { ratio: '2.10', loo: '3%', hold: '7%', pct: '1.60 / 2.02 / 3.53', above4: 62, floor: '4.1%' },
  argentina: { ratio: '2.13', loo: '3%', hold: '5%', pct: '1.44 / 1.97 / 3.16', above4: 27, floor: '5.5%' },
};
const CS = {}; let allMatch = true;
const chk = (label, got, want) => { const ok = String(got) === String(want); if (!ok) allMatch = false; log('  ' + label.padEnd(44) + String(got).padEnd(22) + 'self-check ' + want + '  ' + (ok ? 'MATCH' : 'MISMATCH')); };
for (const c of COUNTRIES) {
  const Z = computeZone(C[c], PRESETS.find((p) => p.id === c).box);
  const S = cellStats(C[c]); CS[c] = S;
  const q = ratioPercentiles(S);
  log(c + ':');
  chk('country ratio r', f2(Z.ratio), REF[c].ratio);
  chk('leave-one-year-out median error', pc(Z.medErr, 0), REF[c].loo);
  chk('hold-out (2012–18 → 2019–25) median error', pc(Z.holdout.medErr, 0), REF[c].hold);
  chk('local ratio p5 / p50 / p95 (eligible places)', f2(q.p5) + ' / ' + f2(q.p50) + ' / ' + f2(q.p95), REF[c].pct);
  chk('eligible places with local ratio > 4', S.cells.filter((x) => x.eligible && x.ratio > 4).length, REF[c].above4);
  chk('detection floor (floorShare)', pc(floorShare(C[c])), REF[c].floor);
}
log('Baseline reproduction: ' + (allMatch ? 'ALL MATCH' : 'SOME MISMATCH'));

/* ───────── 2. Place-month arrays (0.5° places, 2003-01 .. LAST-12) ───────── */
const SERIES = ['modis', 'aqua', 'snpp', 'n20'];
const m0 = (STATS_FROM - FIRST) * 12, mEnd = (LAST - FIRST + 1) * 12, T = mEnd - m0, ov0 = VJ + 1, tOv = ov0 - m0, tJan = VJ - m0;
const OY = LAST - SW + 1;
const yOf = (t) => Math.floor((m0 + t) / 12) - (SW - FIRST); // overlap-year index (0 = 2012)
const BINS = [1, 2, 4, 10, 30, 100], binOf = (M) => { let b = 0; for (let i = 0; i < BINS.length; i++) if (M >= BINS[i]) b = i; return b; };
const BIN_LABEL = ['1', '2–3', '4–9', '10–29', '30–99', '≥100'];
const NEED = CELL.need; // 300 cell-days: the app's minimum for a local ratio (cellStats)

function build(c) {
  const Cc = C[c], gap = Cc.gapSet || new Set(), idx = new Map(), P = [];
  const reg = (i, j) => { const k = cellKey(i, j); let p = idx.get(k); if (p === undefined) { p = P.length; idx.set(k, p); P.push({ i, j, k }); } return p; };
  const md = Cc.s.modis, sp = Cc.s.snpp, nn = Cc.s.n20;
  const okM = (mi) => mi >= m0 && mi < mEnd, okS = (mi) => mi >= ov0 && mi < mEnd && !gap.has(mi), okN = (mi) => mi >= ov0 && mi < mEnd && gap.has(mi);
  for (let k = 0; k < md.n; k++) if (okM(md.M[k])) reg(md.I[k], md.J[k]);
  for (let k = 0; k < sp.n; k++) if (okS(sp.M[k])) reg(sp.I[k], sp.J[k]);
  for (let k = 0; k < nn.n; k++) if (okN(nn.M[k])) reg(nn.I[k], nn.J[k]);
  const nP = P.length, M = new Float64Array(nP * T), V = new Float64Array(nP * T);
  for (let k = 0; k < md.n; k++) if (okM(md.M[k])) M[idx.get(cellKey(md.I[k], md.J[k])) * T + md.M[k] - m0] += md.N[k];
  for (let k = 0; k < sp.n; k++) if (okS(sp.M[k])) V[idx.get(cellKey(sp.I[k], sp.J[k])) * T + sp.M[k] - m0] += sp.N[k];
  for (let k = 0; k < nn.n; k++) if (okN(nn.M[k])) V[idx.get(cellKey(nn.I[k], nn.J[k])) * T + nn.M[k] - m0] += nn.N[k];
  // 2° boxes on a fixed grid (even degrees): 4 × 4 places.
  const bIdx = new Map(), boxes = [];
  P.forEach((pl, p) => { const bi = Math.floor(pl.i / 4), bj = Math.floor(pl.j / 4), key = bi + ',' + bj; let b = bIdx.get(key); if (b === undefined) { b = boxes.length; bIdx.set(key, b); boxes.push({ bi, bj, ps: [] }); } pl.b = b; boxes[b].ps.push(p); });
  const nB = boxes.length;
  // Per-year sums over the overlap months (February 2012 .. December LAST).
  const MY = new Float64Array(nP * OY), VY = new Float64Array(nP * OY), VYpos = new Float64Array(nP * OY);
  const Z0V = new Float64Array(nP * 12 * OY), Z0N = new Float64Array(nP * 12 * OY);
  const BMY = new Float64Array(nB * OY), BVY = new Float64Array(nB * OY), BVYpos = new Float64Array(nB * OY), BZ0V = new Float64Array(nB * 12 * OY), BZ0N = new Float64Array(nB * 12 * OY);
  const CMY = new Float64Array(OY), CVY = new Float64Array(OY), CVYpos = new Float64Array(OY);
  const BinV = new Float64Array(BINS.length * OY), BinM = new Float64Array(BINS.length * OY);
  for (let p = 0; p < nP; p++) {
    const b = P[p].b;
    for (let t = tOv; t < T; t++) {
      const y = yOf(t), m = (m0 + t) % 12, mm = M[p * T + t], vv = V[p * T + t];
      MY[p * OY + y] += mm; VY[p * OY + y] += vv; BMY[b * OY + y] += mm; BVY[b * OY + y] += vv; CMY[y] += mm; CVY[y] += vv;
      if (mm > 0) { VYpos[p * OY + y] += vv; BVYpos[b * OY + y] += vv; CVYpos[y] += vv; const bn = binOf(mm); BinV[bn * OY + y] += vv; BinM[bn * OY + y] += mm; }
      else { Z0V[(p * 12 + m) * OY + y] += vv; Z0N[(p * 12 + m) * OY + y] += 1; BZ0V[(b * 12 + m) * OY + y] += vv; BZ0N[(b * 12 + m) * OY + y] += 1; }
    }
  }
  return { c, P, nP, M, V, boxes, nB, MY, VY, VYpos, Z0V, Z0N, BMY, BVY, BVYpos, BZ0V, BZ0N, CMY, CVY, CVYpos, BinV, BinM };
}

/* ───────── 3. Variants: fit on the overlap years minus `excl`, predict a place-month's VIIRS from its MODIS ───────── */
// b0 = d1 without its floor (isolates the floor's own effect from the refit of the ratio on months where MODIS > 0).
// a  country ratio; b  2° zone ratio (today's method at click size; box under 300 cell-days → country ratio);
// c  local ratio shrunk to the zone ratio (gamma–Poisson empirical Bayes: (V_p + k·r_zone) ÷ (M_p + k), k chosen by
//    inner leave-one-year-out), capped at the app's 4×; d1/d2  two-part "floor" model: MODIS > 0 → zone ratio
//    (fitted on months where MODIS > 0), MODIS = 0 → the mean VIIRS of that place (d1) or zone (d2) in that calendar
//    month when MODIS saw nothing; e  ratio by activity level (MODIS cell-days of the place-month, country-wide);
//    f  e + the place floor.
const VAR = ['a', 'b', 'b0', 'c', 'd1', 'd2', 'e', 'f'];
const VLABEL = { a: 'a country ratio', b: 'b 2° zone ratio (today)', b0: 'b0 zone ratio on MODIS > 0 months, no floor', c: 'c local ratio shrunk to zone', d1: 'd1 zone ratio + place floor', d2: 'd2 zone ratio + zone floor', e: 'e ratio by activity level', f: 'f activity ratio + place floor' };
const KGRID = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000];
function fit(D, excl, k, light = false) {
  const keep = new Uint8Array(OY).fill(1); excl.forEach((y) => { keep[y] = 0; });
  const tot = (arr, base) => { let s = 0; for (let y = 0; y < OY; y++) if (keep[y]) s += arr[base + y]; return s; };
  const cm = tot(D.CMY, 0), rC = tot(D.CVY, 0) / cm, rCpos = tot(D.CVYpos, 0) / cm;
  const rB = new Float64Array(D.nB), rBpos = new Float64Array(D.nB); let fall = 0;
  for (let b = 0; b < D.nB; b++) { const m = tot(D.BMY, b * OY), v = tot(D.BVY, b * OY); if (m >= NEED && v >= NEED) { rB[b] = v / m; rBpos[b] = tot(D.BVYpos, b * OY) / m; } else { rB[b] = rC; rBpos[b] = rCpos; fall++; } }
  const rP = new Float64Array(D.nP); let capped = 0;
  for (let p = 0; p < D.nP; p++) { const m = tot(D.MY, p * OY), v = tot(D.VY, p * OY), r = (v + k * rB[D.P[p].b]) / (m + k); if (r > CELL.high) { capped++; rP[p] = CELL.high; } else rP[p] = r; }
  if (light) return { rP };
  const rBin = BINS.map((_, i) => { const m = tot(D.BinM, i * OY); return m > 0 ? tot(D.BinV, i * OY) / m : rCpos; });
  const aP = new Float64Array(D.nP * 12), aB = new Float64Array(D.nB * 12);
  for (let q = 0; q < D.nP * 12; q++) { const n = tot(D.Z0N, q * OY); aP[q] = n > 0 ? tot(D.Z0V, q * OY) / n : 0; }
  for (let q = 0; q < D.nB * 12; q++) { const n = tot(D.BZ0N, q * OY); aB[q] = n > 0 ? tot(D.BZ0V, q * OY) / n : 0; }
  return { rC, rCpos, rB, rBpos, rP, rBin, aP, aB, fall, capped, k };
}
function pred(D, F, v, p, t, M) {
  const b = D.P[p].b, m = (m0 + t) % 12;
  switch (v) {
    case 'a': return F.rC * M;
    case 'b': return F.rB[b] * M;
    case 'b0': return M > 0 ? F.rBpos[b] * M : 0;
    case 'c': return F.rP[p] * M;
    case 'd1': return M > 0 ? F.rBpos[b] * M : F.aP[p * 12 + m];
    case 'd2': return M > 0 ? F.rBpos[b] * M : F.aB[b * 12 + m];
    case 'e': return M > 0 ? F.rBin[binOf(M)] * M : 0;
    case 'f': return M > 0 ? F.rBin[binOf(M)] * M : F.aP[p * 12 + m];
  }
}
// k for (c): inner leave-one-year-out on the training years, annual place-level absolute error.
function chooseK(D, excl) {
  let best = null;
  for (const k of KGRID) {
    let e = 0;
    for (let y2 = 0; y2 < OY; y2++) { if (excl.includes(y2)) continue; const F = fit(D, excl.concat([y2]), k, true); for (let p = 0; p < D.nP; p++) e += Math.abs(F.rP[p] * D.MY[p * OY + y2] - D.VY[p * OY + y2]); }
    if (!best || e < best.e) best = { k, e };
  }
  return best.k;
}

/* ───────── 4. Metrics ───────── */
// Units: place / 2° box / country × month / year, over the overlap months. Active unit: VIIRS > 0 or MODIS > 0.
function agg(D, PR, scale, period) {
  const nS = scale === 'place' ? D.nP : scale === 'box' ? D.nB : 1, nT = period === 'month' ? T : OY;
  const O = new Float64Array(nS * nT), Pp = new Float64Array(nS * nT), Mm = new Float64Array(nS * nT);
  for (let p = 0; p < D.nP; p++) {
    const s = scale === 'place' ? p : scale === 'box' ? D.P[p].b : 0;
    for (let t = tOv; t < T; t++) { const u = s * nT + (period === 'month' ? t : yOf(t)); O[u] += D.V[p * T + t]; Pp[u] += PR[p * T + t]; Mm[u] += D.M[p * T + t]; }
  }
  return { O, P: Pp, M: Mm };
}
function metr(A, thr = 30) {
  let sa = 0, so = 0; const ae = [], re = [];
  for (let u = 0; u < A.O.length; u++) {
    if (!(A.O[u] > 0 || A.M[u] > 0)) continue;
    const e = Math.abs(A.P[u] - A.O[u]); sa += e; so += A.O[u]; ae.push(e);
    if (A.O[u] >= thr) re.push(e / A.O[u]);
  }
  return { wape: so > 0 ? sa / so : null, mae: median(ae), mre: re.length ? median(re) : null, n: ae.length, nRel: re.length };
}

/* ───────── 5. Trend verdicts of 2° boxes (the app's thresholds: trendRobustness + guard.js) ───────── */
function bucketize(Cc) {
  const B = {};
  for (const s of SERIES) { const d = Cc.s[s], m = new Map(); for (let k = 0; k < d.n; k++) { const key = (Math.floor(d.I[k] / 4) + 512) * 4096 + (Math.floor(d.J[k] / 4) + 1024); let a = m.get(key); if (!a) { a = []; m.set(key, a); } a.push(k); } B[s] = m; }
  return B;
}
// Records within ±4° of a 2° box (the farthest ring the app's borrowing rule can reach): computeZone gives the same
// result as on the whole country, faster.
function subC(Cc, B, bi, bj) {
  const o = Object.assign({}, Cc, { s: {} });
  for (const s of SERIES) {
    const d = Cc.s[s], ks = [];
    for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) { const a = B[s].get((bi + di + 512) * 4096 + (bj + dj + 1024)); if (a) for (const k of a) ks.push(k); }
    const n = ks.length, Mi = new Int16Array(n), I = new Int16Array(n), J = new Int16Array(n), N = new Int32Array(n);
    ks.forEach((k, x) => { Mi[x] = d.M[k]; I[x] = d.I[k]; J[x] = d.J[k]; N[x] = d.N[k]; });
    o.s[s] = { M: Mi, I, J, N, n };
  }
  return o;
}
const appVerdict = (Z) => { const G = guarded(Z); if (!G.harmOK) return 'n/h'; if (G.guard || !G.trend || G.trend.status !== 'robust') return 'uncertain'; return Z.riseH > 1 ? 'rise' : 'decline'; };
function verdictOf(Z, ann) {
  const G = guarded(Z); if (!G.harmOK) return 'n/h';
  const rows = []; for (let y = STATS_FROM; y <= LAST; y++) rows.push({ year: y, v: ann[y] });
  const T2 = trendRobustness(rows);
  const before = rows.filter((r) => r.year < SW).reduce((s, r) => s + r.v, 0) / (SW - STATS_FROM);
  if (!(before > 0) || T2.rise == null) return 'uncertain'; // G3
  if (before < GUARD.minBefore) return 'uncertain'; // G1
  if (Z.riseAqua != null && isFinite(Z.riseAqua) && Z.riseAqua > 0 && (Z.riseAqua - 1) * (T2.rise - 1) < 0) return 'uncertain'; // G5
  if (T2.lo != null && T2.hi != null && (T2.lo <= 0 || T2.hi / T2.lo > GUARD.maxSpan)) return 'uncertain'; // G2
  if (T2.status !== 'robust') return 'uncertain';
  const Mo = Z.monthly; if (!Mo || Mo.n < GUARD.minMonths || Mo.medErr > GUARD.maxMonthlyErr) return 'uncertain'; // G6
  return T2.rise > 1 ? 'rise' : 'decline';
}

/* ───────── run ───────── */
const ab = JSON.parse(fs.readFileSync(here + 'data/official/canada_area_burned.json', 'utf8')).total;
const abLast = Math.min(LAST, Math.max(...Object.keys(ab).map(Number)));
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const yrs = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const officialRise = mean(yrs(SW, abLast).map((y) => ab[y])) / mean(yrs(STATS_FROM, SW - 1).map((y) => ab[y]));
const RES = {};
for (const c of COUNTRIES) {
  const t0 = Date.now();
  const D = build(c), S = CS[c];
  log('\n## 2. ' + c + ': ' + D.nP + ' places with a detection 2003–' + LAST + ', ' + D.nB + ' 2° boxes');
  // Out-of-sample: leave one overlap year out.
  const PR = Object.fromEntries(VAR.map((v) => [v, new Float64Array(D.nP * T)]));
  const IS = Object.fromEntries(VAR.map((v) => [v, new Float64Array(D.nP * T)]));
  const ks = [], falls = [], caps = [];
  for (let Y = 0; Y < OY; Y++) {
    const k = chooseK(D, [Y]); ks.push(k);
    const F = fit(D, [Y], k); falls.push(F.fall); caps.push(F.capped);
    for (let p = 0; p < D.nP; p++) for (let t = tOv; t < T; t++) { if (yOf(t) !== Y) continue; const M = D.M[p * T + t]; for (const v of VAR) PR[v][p * T + t] = pred(D, F, v, p, t, M); }
  }
  const kAll = chooseK(D, []), FA = fit(D, [], kAll);
  for (let p = 0; p < D.nP; p++) for (let t = 0; t < T; t++) { const M = D.M[p * T + t]; for (const v of VAR) { const x = pred(D, FA, v, p, t, M); if (t < tOv) PR[v][p * T + t] = x; else IS[v][p * T + t] = x; } }
  log('Shrinkage strength k (MODIS cell-days) chosen by inner leave-one-year-out, per held-out year: ' + ks.join(', ') + ' | all years: ' + kAll);
  log('2° boxes under ' + NEED + ' cell-days (zone ratio → country ratio): ' + FA.fall + ' of ' + D.nB + ' | places whose shrunk ratio is capped at 4×: ' + FA.capped + ' (all years)');
  log('Country ratio (all years) ' + f2(FA.rC, 3) + ' | on months with MODIS > 0 ' + f2(FA.rCpos, 3) + ' | ratio by MODIS cell-days in the place-month: ' + BIN_LABEL.map((l, i) => l + ' → ' + f2(FA.rBin[i])).join(', '));

  // Metrics table.
  const R = {};
  for (const v of VAR) {
    const r = R[v] = {};
    for (const [sc, per] of [['place', 'year'], ['place', 'month'], ['box', 'year'], ['box', 'month'], ['country', 'year'], ['country', 'month']]) r[sc + '-' + per] = metr(agg(D, PR[v], sc, per));
    const perYear = (A) => { const a = new Float64Array(OY), o = new Float64Array(OY); for (let u = 0; u < A.O.length; u++) { const y = u % OY; a[y] += Math.abs(A.P[u] - A.O[u]); o[y] += A.O[u]; } return Array.from(a, (x, y) => x / o[y]); };
    r.pyY = perYear(agg(D, PR[v], 'place', 'year')); r.byY = perYear(agg(D, PR[v], 'box', 'year'));
    r.isPY = metr(agg(D, IS[v], 'place', 'year')); r.isBY = metr(agg(D, IS[v], 'box', 'year'));
    // Detection floor, out of sample.
    let sV = 0, sV0 = 0, sP0 = 0, e0 = 0, zeroPred = 0, sV12 = 0, e12 = 0;
    for (let q = 0; q < D.nP * T; q++) {
      if (q % T < tOv) continue;
      const o = D.V[q], pp = PR[v][q], M = D.M[q];
      sV += o; if (!(pp > 0)) zeroPred += o;
      if (M === 0) { sV0 += o; sP0 += pp; e0 += Math.abs(pp - o); }
      else if (M <= 2) { sV12 += o; e12 += Math.abs(pp - o); }
    }
    r.floorLeft = zeroPred / sV; r.recovered = sP0 / sV0; r.wape0 = e0 / sV0; r.wape12 = e12 / sV12;
    // Strata (place-year, out of sample): sparse places, the map's > 4× places; off-season place-months.
    const sparse = new Uint8Array(D.nP), high = new Uint8Array(D.nP);
    for (let p = 0; p < D.nP; p++) { let m = 0; for (let y = 0; y < OY; y++) m += D.MY[p * OY + y]; sparse[p] = m < 50 ? 1 : 0; const cc = S.map.get(D.P[p].k); high[p] = cc && cc.high ? 1 : 0; }
    const A = agg(D, PR[v], 'place', 'year');
    const wapeOf = (flag) => { let a = 0, o = 0; for (let p = 0; p < D.nP; p++) if (flag[p]) for (let y = 0; y < OY; y++) { a += Math.abs(A.P[p * OY + y] - A.O[p * OY + y]); o += A.O[p * OY + y]; } return o > 0 ? a / o : null; };
    r.wSparse = wapeOf(sparse); r.wHigh = wapeOf(high);
    r.nSparse = sparse.reduce((s, x) => s + x, 0); r.nHigh = high.reduce((s, x) => s + x, 0);
    // Off-season: calendar months with < 3% of the country's overlap VIIRS.
    const mon = new Float64Array(12); for (let q = 0; q < D.nP * T; q++) { const t = q % T; if (t >= tOv) mon[(m0 + t) % 12] += D.V[q]; }
    const tv = mon.reduce((s, x) => s + x, 0), off = Array.from(mon, (x) => x / tv < 0.03);
    let ao = 0, oo = 0; for (let q = 0; q < D.nP * T; q++) { const t = q % T; if (t >= tOv && off[(m0 + t) % 12]) { ao += Math.abs(PR[v][q] - D.V[q]); oo += D.V[q]; } }
    r.wOff = oo > 0 ? ao / oo : null; r.offMonths = off.map((x, i) => (x ? 'JFMAMJJASOND'[i] : '')).join('');
    // Pre-2012 (2003–2011) under the all-years fit: total, and the part put in place-months where MODIS saw nothing.
    let pre = 0, pre0 = 0;
    for (let p = 0; p < D.nP; p++) for (let t = 0; t < tJan; t++) { const x = PR[v][p * T + t]; pre += x; if (D.M[p * T + t] === 0) pre0 += x; }
    r.pre = pre; r.pre0 = pre0;
    // Country annual series and headline figures.
    const ann = {}; for (let y = STATS_FROM; y <= LAST; y++) ann[y] = 0;
    for (let p = 0; p < D.nP; p++) for (let t = 0; t < T; t++) { const y = FIRST + Math.floor((m0 + t) / 12); ann[y] += t < tOv ? PR[v][p * T + t] : D.V[p * T + t]; }
    r.rise = mean(yrs(SW, LAST).map((y) => ann[y])) / mean(yrs(STATS_FROM, SW - 1).map((y) => ann[y]));
    r.official = mean(yrs(SW, abLast).map((y) => ann[y])) / mean(yrs(STATS_FROM, SW - 1).map((y) => ann[y]));
  }
  { const fy = [], fz = []; for (let y = 0; y < OY; y++) { let z = 0; for (let q = 0; q < D.nP * 12; q++) z += D.Z0V[q * OY + y]; fy.push(z / D.CVY[y]); fz.push(z); }
    const lo = Math.min(...fy), hi = Math.max(...fy);
    log('Floor by overlap year (VIIRS cell-days in place-months where MODIS saw nothing, and ÷ all VIIRS): ' + fy.map((x, y) => (SW + y) + ' ' + Math.round(fz[y]).toLocaleString('en-US') + ' (' + pc(x) + ')').join(', ') + ' | in cell-days ' + Math.round(Math.min(...fz)).toLocaleString('en-US') + '–' + Math.round(Math.max(...fz)).toLocaleString('en-US') + ' a year, median ' + Math.round(median(fz)).toLocaleString('en-US') + ' | range ' + pc(lo) + '–' + pc(hi) + ' | lowest in ' + (SW + fy.indexOf(lo)) + ', highest in ' + (SW + fy.indexOf(hi)) + ' (country VIIRS that year: ' + Math.round(D.CVY[fy.indexOf(lo)]).toLocaleString('en-US') + ' vs ' + Math.round(D.CVY[fy.indexOf(hi)]).toLocaleString('en-US') + ')'); }
  // Consistency with the app: variant a, country-annual leave-one-year-out median error (app: 3%).
  log('Harness check: variant a, country-annual leave-one-year-out median error ' + pc(R.a['country-year'].mre, 0) + ' (app: ' + REF[c].loo + '); country rise with variant a ' + f2(R.a.rise) + '; my floor share (NOAA-20 in outage months included) ' + pc(R.a.floorLeft));

  // Trend verdicts of 2° boxes.
  const Bk = bucketize(C[c]), vt = { app: {}, ...Object.fromEntries(VAR.map((v) => [v, {}])) }, changed = Object.fromEntries(VAR.map((v) => [v, 0])), trans = Object.fromEntries(VAR.map((v) => [v, {}]));
  let nBox = 0, recon = 0;
  for (let b = 0; b < D.nB; b++) {
    const bx = D.boxes[b], box = { s: bx.bi * 2, n: bx.bi * 2 + 2, w: bx.bj * 2, e: bx.bj * 2 + 2 };
    const Z = computeZone(subC(C[c], Bk, bx.bi, bx.bj), box);
    if (Z.empty) continue;
    nBox++;
    const av = appVerdict(Z); vt.app[av] = (vt.app[av] || 0) + 1;
    const annOf = (g) => { const a = {}; for (let y = STATS_FROM; y <= LAST; y++) a[y] = 0; for (const p of bx.ps) for (let t = 0; t < T; t++) { const y = FIRST + Math.floor((m0 + t) / 12); a[y] += t < tOv ? g(p, t) : D.V[p * T + t]; } return a; };
    if (Z.harmOK) { const vb = verdictOf(Z, annOf((p, t) => Z.ratio * D.M[p * T + t])); if (vb !== av) recon++; }
    for (const v of VAR) {
      const vv = Z.harmOK ? verdictOf(Z, annOf((p, t) => PR[v][p * T + t])) : 'n/h';
      vt[v][vv] = (vt[v][vv] || 0) + 1;
      if (vv !== av) { changed[v]++; const k = av + '→' + vv; trans[v][k] = (trans[v][k] || 0) + 1; }
    }
  }
  log('2° boxes with any detection: ' + nBox + ' | app verdicts (computeZone + guard.js): ' + JSON.stringify(vt.app) + ' | reconstruction with the app ratio differs in ' + recon + ' boxes');
  RES[c] = { D, R, vt, changed, trans, nBox, FA, kAll, ks };

  log('\n### Out-of-sample error (leave one overlap year out; WAPE = Σ|pred − VIIRS| ÷ Σ VIIRS; rel = median |pred − VIIRS| ÷ VIIRS over units with VIIRS ≥ 30; abs = median |pred − VIIRS| in cell-days over active units)');
  log('| variant | place-year WAPE / rel / abs | place-month WAPE / abs | 2° box-year WAPE / rel | 2° box-month WAPE / rel | country-year rel | country-month rel |');
  log('|---|---|---|---|---|---|---|');
  for (const v of VAR) { const r = R[v]; log('| ' + [VLABEL[v], pc(r['place-year'].wape) + ' / ' + pc(r['place-year'].mre) + ' / ' + f2(r['place-year'].mae, 1), pc(r['place-month'].wape) + ' / ' + f2(r['place-month'].mae, 1), pc(r['box-year'].wape) + ' / ' + pc(r['box-year'].mre), pc(r['box-month'].wape) + ' / ' + pc(r['box-month'].mre), pc(r['country-year'].mre), pc(r['country-month'].mre)].join(' | ') + ' |'); }
  log('(units: place-year ' + R.a['place-year'].n + ' active, ' + R.a['place-year'].nRel + ' with VIIRS ≥ 30; 2° box-year ' + R.a['box-year'].n + ' / ' + R.a['box-year'].nRel + '; country-month ' + R.a['country-month'].n + ')');
  log('\n### Detection floor, overfitting, failure strata (out of sample unless noted)');
  log('| variant | held-out years where it beats b (place-year / box-year, of ' + OY + ') | VIIRS in place-months predicted 0 | floor recovered (Σ pred ÷ Σ VIIRS where MODIS = 0) | WAPE where MODIS = 0 | WAPE where MODIS = 1–2 | in-sample → out-of-sample place-year WAPE | box-year | sparse places (' + R.a.nSparse + ', < 50 MODIS cell-days 2012–' + LAST + ') | the map\'s > 4× places (' + R.a.nHigh + ') | off-season months (' + R.a.offMonths + ') |');
  log('|---|---|---|---|---|---|---|---|---|---|---|');
  const wins = (v, key) => R[v][key].filter((x, y) => x < R.b[key][y]).length;
  for (const v of VAR) { const r = R[v]; log('| ' + [VLABEL[v], v === 'b' ? '—' : wins(v, 'pyY') + ' / ' + wins(v, 'byY'), pc(r.floorLeft), pc(r.recovered, 0), pc(r.wape0, 0), pc(r.wape12, 0), pc(r.isPY.wape) + ' → ' + pc(r['place-year'].wape), pc(r.isBY.wape) + ' → ' + pc(r['box-year'].wape), pc(r.wSparse, 0), pc(r.wHigh, 0), pc(r.wOff, 0)].join(' | ') + ' |'); }
  log('\n### Consequences (all-years fit applied to 2003–2011)');
  log('| variant | pre-2012 total (cell-days, 2003–2011) | vs zone ratio (b) | of which in place-months where MODIS saw nothing | country rise 2012–' + LAST + ' ÷ 2003–2011 | ' + (c === 'canada' ? 'official-area check 2012–' + abLast + ' (NFD ' + f2(officialRise) + ') | ' : '') + '2° box verdicts rise / decline / uncertain / not harmonized | boxes whose verdict changes vs the app |');
  log('|---|---|---|---|---|' + (c === 'canada' ? '---|' : '') + '---|---|');
  for (const v of VAR) {
    const r = R[v], V2 = vt[v];
    log('| ' + [VLABEL[v], Math.round(r.pre).toLocaleString('en-US'), (r.pre / R.b.pre >= 1 ? '+' : '') + pc(r.pre / R.b.pre - 1), Math.round(r.pre0).toLocaleString('en-US') + ' (' + pc(r.pre0 / r.pre) + ')', f2(r.rise)].concat(c === 'canada' ? [f2(r.official)] : []).concat([(V2.rise || 0) + ' / ' + (V2.decline || 0) + ' / ' + (V2.uncertain || 0) + ' / ' + (V2['n/h'] || 0), changed[v] + (changed[v] ? ' (' + Object.entries(trans[v]).map(([k2, n]) => k2 + ' ' + n).join(', ') + ')' : '')]).join(' | ') + ' |');
  }
  log('(app today, for reference: 2° box verdicts ' + (vt.app.rise || 0) + ' / ' + (vt.app.decline || 0) + ' / ' + (vt.app.uncertain || 0) + ' / ' + (vt.app['n/h'] || 0) + ')');
}

/* ───────── 6. Summary lines for the report ───────── */
log('\n## 3. Summary');
for (const c of COUNTRIES) {
  const R = RES[c].R, b = R.b, best = (key, sub) => VAR.reduce((p, v) => (R[v][key][sub] < R[p][key][sub] ? v : p), 'b');
  const bPY = best('place-year', 'wape'), bBY = best('box-year', 'wape'), bPM = best('place-month', 'wape');
  log(c + ': best place-year WAPE ' + VLABEL[bPY] + ' ' + pc(R[bPY]['place-year'].wape) + ' vs zone ratio ' + pc(b['place-year'].wape) + ' (' + pc(1 - R[bPY]['place-year'].wape / b['place-year'].wape) + ' less error)'
    + ' | best place-month WAPE ' + VLABEL[bPM] + ' ' + pc(R[bPM]['place-month'].wape) + ' vs ' + pc(b['place-month'].wape)
    + ' | best 2° box-year WAPE ' + VLABEL[bBY] + ' ' + pc(R[bBY]['box-year'].wape) + ' vs ' + pc(b['box-year'].wape)
    + ' | floor: the place floor (d1) predicts ' + pc(R.d1.recovered, 0) + ' of the VIIRS cell-days in place-months where MODIS saw nothing, with ' + pc(R.d1.wape0, 0) + ' error there; it adds ' + pc(R.d1.pre0 / R.d1.pre) + ' of the 2003–2011 total in place-months where MODIS saw nothing'
    + ' | rise b ' + f2(b.rise) + ' → c ' + f2(R.c.rise) + ', d1 ' + f2(R.d1.rise) + ', f ' + f2(R.f.rise));
}
{
  const ca = RES.canada.R, ar = RES.argentina.R, wins = (R, v, key) => R[v][key].filter((x, y) => x < R.b[key][y]).length;
  log('\n## 4. Proposed project-page sentences (numbers above)');
  log('"Next step, already tested out of sample: adding a detection floor (the small fires VIIRS sees where MODIS saw nothing, estimated for each 0.5° place and calendar month) to the zone ratio lowered the error of predicted VIIRS counts in 2° boxes from ' + pc(ca.b['box-year'].wape) + ' to ' + pc(ca.d1['box-year'].wape) + ' in Canada and from ' + pc(ar.b['box-year'].wape) + ' to ' + pc(ar.d1['box-year'].wape) + ' in Argentina (leave-one-year-out; better in ' + wins(ca, 'd1', 'byY') + ' and ' + wins(ar, 'd1', 'byY') + ' of ' + OY + ' years) and barely moved the national figures (Canada ' + f2(ca.a.rise) + '× → ' + f2(ca.d1.rise) + '×, official area burned ' + f2(officialRise) + '×; Argentina ' + f2(ar.a.rise) + '× → ' + f2(ar.d1.rise) + '×). It is not in the app because it adds fire to months where MODIS recorded none (' + pc(ca.d1.pre0 / ca.d1.pre) + ' of Canada\'s 2003–2011 total): an assumption about the past, not a measurement."');
  log('"Ratios that vary place by place (each 0.5° place shrunk toward its zone) did not help at the 2° scale (' + pc(ca.b['box-year'].wape) + ' → ' + pc(ca.c['box-year'].wape) + ' in Canada, ' + pc(ar.b['box-year'].wape) + ' → ' + pc(ar.c['box-year'].wape) + ' in Argentina), so the app keeps one ratio per zone."');
}
fs.writeFileSync(here + 'research/spatial.out.txt', out.join('\n') + '\n');
