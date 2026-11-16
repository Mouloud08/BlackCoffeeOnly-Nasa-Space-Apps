// Research prototype (NOT shipped, NOT used by the app): would a SEASONAL (per-calendar-month) correction harmonize
// MODIS and VIIRS better than the single pooled ratio? Everything is computed from the app's own module
// (src/metrics.js: decoding, box sums, the bridge, the grade rule, colour classes) and the Windows tile loader.
// Deterministic: no random draws. Run: node research/seasonal.mjs
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as MX from "file:///c:/Users/moulo/Downloads/firebridge-v6.2-preview-source/src/metrics.js";
import { decodeCountry, computeZone, boxMonthly, bridgeStats, ownGrade, PRESETS, setRecordEnd, median, countClass, countBreaks, calendarData, FIRST, SW, VJ, MIN_MODIS } from "file:///c:/Users/moulo/Downloads/firebridge-v6.2-preview-source/src/metrics.js";
import { loadTiles } from "file:///c:/Users/moulo/Downloads/firebridge-v6.2-preview-source/tools-win/tiles.mjs";

const here = "c:/Users/moulo/Downloads/firebridge-v6.2-preview-source/";
const LT = loadTiles(here); setRecordEnd(LT.end);
const LAST = MX.LAST, NM = MX.NM, mEnd = (LAST - FIRST + 1) * 12;
const C = { canada: decodeCountry(LT.tiles.canada), argentina: decodeCountry(LT.tiles.argentina) };
const OY = []; for (let y = SW; y <= LAST; y++) OY.push(y); // overlap years
const idx = (y, m) => (y - FIRST) * 12 + m;
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
const pc = (x, d = 1) => (x == null || !isFinite(x) ? '—' : (x * 100).toFixed(d) + '%');
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? '—' : x.toFixed(d));
const fx = (x) => (x == null ? '—' : x.toFixed(2) + '×');
console.log('# Seasonal correction: research prototype (node research/seasonal.mjs)');
console.log('Record ends ' + LT.end + ' | last complete year ' + LAST + ' | overlap years ' + SW + '–' + LAST + ' (January 2012 left out, as in the app)');

/* ───────── zone tables ───────── */
// For each zone: the series the app's bridge is estimated on (src: the zone's own box, or the borrowed wider box),
// and the zone's own box (where the correction is applied).
function zoneData(z) {
  const Cc = C[z.country], Z = computeZone(Cc, z.box);
  const srcBox = Z.gradeWhy === 'borrowed' ? Z.borrowed.box : z.box;
  const S = boxMonthly(Cc, srcBox);
  const inOv = (i) => i > VJ && i < mEnd && !(S.contMask && S.contMask[i]);
  const V = OY.map((y) => Array.from({ length: 12 }, (_, m) => (inOv(idx(y, m)) ? S.snpp[idx(y, m)] : 0)));
  const M = OY.map((y) => Array.from({ length: 12 }, (_, m) => (inOv(idx(y, m)) ? S.modis[idx(y, m)] : 0)));
  // Fire season = the app's "critical" window (shortest run of consecutive months holding >= 80% of a typical year).
  const season = new Set(); if (Z.critical) for (let k = 0; k < Z.critical.len; k++) season.add((Z.critical.start + k) % 12);
  return { z, Z, S, srcBox, borrowed: Z.gradeWhy === 'borrowed', inOv, V, M, season };
}

/* ───────── the five (+1) ways to estimate the ratio(s) from a set of training years ───────── */
// Each fit takes the zone data D and an array of overlap-year indices T, and returns 12 ratios (one per calendar month).
const sums = (D, T, m) => { let v = 0, b = 0; for (const k of T) { v += D.V[k][m]; b += D.M[k][m]; } return [v, b]; };
const pooledR = (D, T) => { let v = 0, b = 0; for (const k of T) for (let m = 0; m < 12; m++) { v += D.V[k][m]; b += D.M[k][m]; } return b > 0 && v > 0 ? v / b : null; };
// (a) today's method: one pooled ratio.
function fitPooled(D, T) { const R = pooledR(D, T); return Array(12).fill(R); }
// (b) one ratio per calendar month: Σ VIIRS ÷ Σ MODIS of that month over the training years.
function fitMonth(D, T) { const R = pooledR(D, T); return Array.from({ length: 12 }, (_, m) => { const [v, b] = sums(D, T, m); return b > 0 ? v / b : R; }); }
// Jackknife (leave-one-training-year-out) variance of a month's log ratio: captures the year-to-year clustering of
// fires (cell-days are far from independent counts). Infinite when one year carries the whole month.
function monthLogVar(D, T, m) {
  const [v, b] = sums(D, T, m); if (!(v > 0 && b > 0)) return { l: null, v: Infinity };
  const jk = T.map((j) => { const a = v - D.V[j][m], c = b - D.M[j][m]; return a > 0 && c > 0 ? Math.log(a / c) : null; });
  if (jk.some((x) => x == null)) return { l: Math.log(v / b), v: Infinity };
  const n = T.length, mu = mean(jk);
  return { l: Math.log(v / b), v: Math.max(1e-12, ((n - 1) / n) * sum(jk.map((x) => (x - mu) ** 2))) };
}
// (c) per-month ratios shrunk toward the pooled ratio (empirical Bayes, random-effects model on log ratios):
//     log r_m = log R + w_m (log ρ_m − log R), w_m = τ² / (τ² + s_m²), s_m² = jackknife variance of log ρ_m over the
//     training years, τ² = between-month variance (DerSimonian–Laird moment estimate). A month whose ratio is noisy
//     (sparse winter months, a single big year) gets w ≈ 0, i.e. the pooled ratio.
function shrinkParts(D, T) {
  const R = pooledR(D, T), mu = Math.log(R), P = Array.from({ length: 12 }, (_, m) => monthLogVar(D, T, m));
  const ok = P.filter((p) => p.l != null && isFinite(p.v)), w = ok.map((p) => 1 / p.v), sw = sum(w);
  let tau2 = 0;
  if (ok.length >= 2) { const lb = sum(ok.map((p, k) => w[k] * p.l)) / sw, Q = sum(ok.map((p, k) => w[k] * (p.l - lb) ** 2)); tau2 = Math.max(0, (Q - (ok.length - 1)) / (sw - sum(w.map((x) => x * x)) / sw)); }
  const wt = P.map((p) => (p.l != null && isFinite(p.v) ? tau2 / (tau2 + p.v) : 0));
  return { R, tau2, wt, r: P.map((p, m) => Math.exp(mu + wt[m] * ((p.l == null ? mu : p.l) - mu))) };
}
function fitShrink(D, T) { return shrinkParts(D, T).r; }
// (d) smooth seasonal curve: log r(m) = β0 + β1 cos(2πm/12) + β2 sin(2πm/12), weighted least squares on the training
//     months' log ratios, weights = inverse Poisson variance V·M/(V+M) (i.e. by the month's counts).
function solve(A, b) { const n = b.length, X = A.map((r, i) => r.concat([b[i]])); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(X[r][c]) > Math.abs(X[p][c])) p = r; [X[c], X[p]] = [X[p], X[c]]; if (Math.abs(X[c][c]) < 1e-12) return null; for (let r = 0; r < n; r++) if (r !== c) { const q = X[r][c] / X[c][c]; for (let k = c; k <= n; k++) X[r][k] -= q * X[c][k]; } } return X.map((r, i) => r[n] / r[i]); }
const harmX = (m, order) => { const x = [1]; for (let h = 1; h <= order; h++) x.push(Math.cos((2 * Math.PI * h * m) / 12), Math.sin((2 * Math.PI * h * m) / 12)); return x; };
function fitHarm(D, T, order = 1) {
  const rows = []; for (let m = 0; m < 12; m++) { const [v, b] = sums(D, T, m); if (v > 0 && b > 0) rows.push({ x: harmX(m, order), y: Math.log(v / b), w: (v * b) / (v + b) }); }
  const p = 2 * order + 1; if (rows.length < p + 1) return fitPooled(D, T);
  const A = Array.from({ length: p }, () => Array(p).fill(0)), bb = Array(p).fill(0);
  for (const r of rows) for (let i = 0; i < p; i++) { bb[i] += r.w * r.x[i] * r.y; for (let j = 0; j < p; j++) A[i][j] += r.w * r.x[i] * r.x[j]; }
  const beta = solve(A, bb); if (!beta) return fitPooled(D, T);
  return Array.from({ length: 12 }, (_, m) => Math.exp(sum(harmX(m, order).map((x, i) => x * beta[i]))));
}
// (e) two ratios: fire season (the app's critical window) and off-season.
function fitSeason(D, T) {
  const R = pooledR(D, T); if (!D.season.size) return Array(12).fill(R);
  const part = (inS) => { let v = 0, b = 0; for (const k of T) for (let m = 0; m < 12; m++) if (D.season.has(m) === inS) { v += D.V[k][m]; b += D.M[k][m]; } return b > 0 && v > 0 ? v / b : R; };
  const rs = part(true), ro = part(false); return Array.from({ length: 12 }, (_, m) => (D.season.has(m) ? rs : ro));
}
// (f) hard fallback rule (proposal for integration): a month gets its own ratio only when that month, treated as its
//     own bridge, would earn grade A under the app's OWN rule (ownGrade: ≥ 10 usable years with ≥ 50 MODIS cell-days
//     in that month, leave-one-year-out median error ≤ 30%, LOO spread ≤ 10%); every other month uses the pooled ratio.
function monthBridge(D, T, m) {
  const [v, b] = sums(D, T, m); const r = b > 0 && v > 0 ? v / b : null;
  const usable = T.filter((k) => D.M[k][m] >= MIN_MODIS);
  if (r == null || usable.length < 2) return { ratio: r, medErr: null, spread: null, usable, rMin: null, rMax: null };
  const loo = usable.map((k) => { const a = v - D.V[k][m], c = b - D.M[k][m]; const rr = a > 0 && c > 0 ? a / c : NaN; return { rr, err: D.V[k][m] > 0 && isFinite(rr) ? Math.abs(D.M[k][m] * rr - D.V[k][m]) / D.V[k][m] : Infinity }; });
  const rrs = loo.map((l) => l.rr), bad = rrs.some((x) => !isFinite(x));
  const rMin = bad ? null : Math.min(...rrs), rMax = bad ? null : Math.max(...rrs);
  return { ratio: r, medErr: median(loo.map((l) => l.err)), spread: bad ? Infinity : (rMax - rMin) / r, usable, rMin, rMax };
}
function fitGraded(D, T) { const R = pooledR(D, T); return Array.from({ length: 12 }, (_, m) => { const b = monthBridge(D, T, m); return b.ratio != null && b.medErr != null && ownGrade(b) === 'A' ? b.ratio : R; }); }

const METHODS = [
  { id: 'a', name: 'single pooled ratio (today)', fit: fitPooled, params: '1' },
  { id: 'b', name: 'one ratio per calendar month', fit: fitMonth, params: '12' },
  { id: 'c', name: 'per-month, shrunk to pooled (EB)', fit: fitShrink, params: '12 (shrunk)' },
  { id: 'd', name: 'smooth curve (1st harmonic)', fit: (D, T) => fitHarm(D, T, 1), params: '3' },
  { id: 'e', name: 'fire season / off-season', fit: fitSeason, params: '2' },
  { id: 'f', name: 'per-month only where grade A, else pooled', fit: fitGraded, params: '≤ 12' },
];

/* ───────── out-of-sample evaluation: leave one overlap year out ───────── */
function evaluate(D, fit) {
  const n = OY.length, all = OY.map((_, k) => k);
  const pred = OY.map(() => Array(12).fill(0));
  for (let ko = 0; ko < n; ko++) { const T = all.filter((k) => k !== ko), r = fit(D, T); for (let m = 0; m < 12; m++) pred[ko][m] = D.M[ko][m] * r[m]; }
  // Monthly error: the app's usable-month rule (both sensors >= 30 cell-days; overlap months only).
  const errs = [];
  for (let k = 0; k < n; k++) for (let m = 0; m < 12; m++) { const i = idx(OY[k], m); if (!D.inOv(i) || D.M[k][m] < 30 || D.V[k][m] < 30) continue; errs.push({ k, m, e: Math.abs(pred[k][m] - D.V[k][m]) / D.V[k][m], season: D.season.has(m) }); }
  const E = (L) => (L.length ? { n: L.length, med: median(L.map((x) => x.e)), mean: mean(L.map((x) => x.e)) } : { n: 0, med: null, mean: null });
  // Annual error: usable years (MODIS >= 50 cell-days, January 2012 excluded), as the app's leave-one-out.
  const ann = [];
  for (let k = 0; k < n; k++) { const Mo = sum(D.M[k]), Vy = sum(D.V[k]); if (Mo < MIN_MODIS) continue; ann.push(Vy > 0 ? Math.abs(sum(pred[k]) - Vy) / Vy : Infinity); }
  // Worst calendar month: Σ VIIRS ÷ Σ out-of-sample prediction of that month over the overlap, active months only
  // (the app's byMonth "active" flag), shown as a factor >= 1 (over- or under-correction).
  let worst = null;
  for (let m = 0; m < 12; m++) {
    if (!D.Z.byMonth[m].active) continue;
    const v = sum(OY.map((_, k) => D.V[k][m])), p = sum(OY.map((_, k) => pred[k][m])); if (!(v > 0 && p > 0)) continue;
    const q = v / p, fct = q >= 1 ? q : 1 / q; if (!worst || fct > worst.f) worst = { m, f: fct, q };
  }
  return { pred, errs, all: E(errs), fire: E(errs.filter((x) => x.season)), off: E(errs.filter((x) => !x.season)), annMed: ann.length ? median(ann) : null, annN: ann.length, worst };
}
// In-sample monthly error of a fit on ALL overlap years (for the optimism gap).
function inSample(D, fit) {
  const r = fit(D, OY.map((_, k) => k)), errs = [];
  for (let k = 0; k < OY.length; k++) for (let m = 0; m < 12; m++) { const i = idx(OY[k], m); if (!D.inOv(i) || D.M[k][m] < 30 || D.V[k][m] < 30) continue; errs.push(Math.abs(D.M[k][m] * r[m] - D.V[k][m]) / D.V[k][m]); }
  return { r, med: errs.length ? median(errs) : null, n: errs.length };
}

// One-sided sign test: P(X >= k) for X ~ Binomial(n, 1/2). Years, not months, are the independent units here
// (months of one year share the same fires), so this is the honest count.
function signP(k, n) { let p = 0, c = 1; for (let i = 0; i <= n; i++) { if (i > 0) c = (c * (n - i + 1)) / i; if (i >= k) p += c; } return p / Math.pow(2, n); }
// Hold-out in time (stricter than leave-one-year-out: the ratios must transfer to another period, as they must when
// applied to 2001–2011): train on one half of the overlap, predict the other half's months.
function holdout(D, fit, trainYears, testYears) {
  const T = OY.map((y, k) => k).filter((k) => trainYears(OY[k])), r = fit(D, T), errs = [];
  for (let k = 0; k < OY.length; k++) { if (!testYears(OY[k])) continue; for (let m = 0; m < 12; m++) { const i = idx(OY[k], m); if (!D.inOv(i) || D.M[k][m] < 30 || D.V[k][m] < 30) continue; errs.push(Math.abs(D.M[k][m] * r[m] - D.V[k][m]) / D.V[k][m]); } }
  return errs.length ? { med: median(errs), n: errs.length } : null;
}

/* ───────── 1. baseline reproduction ───────── */
const zones = PRESETS.map((p) => zoneData({ label: p.label, country: p.country, box: p.box, whole: !!p.whole }));
console.log('\n## 1. Baseline reproduction (this harness vs the app\'s computeZone / bridgeStats)');
console.log('| zone | series | ratio app / here | LOO err app / here | monthly err app / here (n) | worst month in-sample (app byMonth) | match |');
console.log('|---|---|---|---|---|---|---|');
let allMatch = true;
for (const D of zones) {
  const Z = D.Z, a = evaluate(D, fitPooled), ins = inSample(D, fitPooled), R = ins.r[0];
  const rel = (x, y) => Math.abs(x - y) / Math.max(1e-300, Math.abs(y));
  const ok = rel(R, Z.ratio) < 1e-9 && Math.abs(a.annMed - Z.medErr) < 1e-9 && Math.abs(ins.med - Z.monthly.medErr) < 1e-9 && ins.n === Z.monthly.n;
  allMatch = allMatch && ok;
  // In-sample worst calendar month of today's method, as the app's byMonth (active months only).
  const wm = Z.byMonth.filter((x) => x.active && x.resid != null).map((x) => ({ m: x.m, f: Math.max(x.resid, 1 / x.resid), q: x.resid })).sort((p, q) => q.f - p.f)[0];
  D.worstIn = wm;
  console.log('| ' + [D.z.label, D.borrowed ? 'borrowed box ' + JSON.stringify(D.srcBox) : 'own box', f2(Z.ratio, 4) + ' / ' + f2(R, 4), pc(Z.medErr, 2) + ' / ' + pc(a.annMed, 2), pc(Z.monthly.medErr, 2) + ' / ' + pc(ins.med, 2) + ' (' + Z.monthly.n + ' / ' + ins.n + ')', wm ? MN[wm.m] + ' ' + fx(wm.f) + (wm.q > 1 ? ' (VIIRS above)' : ' (VIIRS below)') : 'no active month', ok ? 'MATCH' : 'MISMATCH'].join(' | ') + ' |');
}
console.log('Baseline: ' + (allMatch ? 'ALL MATCH (ratio to 1e-9 relative; leave-one-year-out and monthly median errors to 1e-9; same month count)' : 'MISMATCH — stop and investigate'));
// Per-month ratios of this harness (method b, all years) vs the app's byMonth (own box only).
let bmOk = true; for (const D of zones.filter((d) => !d.borrowed)) { const r = fitMonth(D, OY.map((_, k) => k)); D.Z.byMonth.forEach((x) => { if (x.ratio != null && Math.abs(r[x.m] - x.ratio) > 1e-9 * x.ratio) bmOk = false; }); }
console.log('Per-month ratios (method b on all years) vs the app\'s byMonth: ' + (bmOk ? 'MATCH' : 'MISMATCH'));

/* ───────── 2. out-of-sample comparison ───────── */
console.log('\n## 2. Out-of-sample (leave one overlap year out) monthly and annual errors');
console.log('Monthly error = |predicted − VIIRS| ÷ VIIRS for overlap months with ≥ 30 cell-days on both sensors; ratios estimated without the predicted year.');
console.log('Fire season = the app\'s critical window (shortest run of consecutive months with ≥ 80% of a typical year).');
const R2 = {};
for (const D of zones) {
  R2[D.z.label] = {};
  const seasonTxt = D.season.size ? [...D.season].sort((a, b) => a - b).map((m) => MN[m]).join(' ') : 'none';
  console.log('\n### ' + D.z.label + (D.borrowed ? ' (bridge estimated on the borrowed wider box, as the app does)' : '') + ' — fire season: ' + seasonTxt);
  console.log('| method | params | median monthly err (n) | mean monthly err | fire season median (n) | off-season median (n) | annual LOO median (years) | worst active month, out of sample | in-sample median monthly err |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const Mt of METHODS) {
    const ev = evaluate(D, Mt.fit), ins = inSample(D, Mt.fit); R2[D.z.label][Mt.id] = { ev, ins };
    console.log('| ' + [Mt.id + '. ' + Mt.name, Mt.params, pc(ev.all.med) + ' (' + ev.all.n + ')', pc(ev.all.mean), pc(ev.fire.med) + ' (' + ev.fire.n + ')', pc(ev.off.med) + ' (' + ev.off.n + ')', pc(ev.annMed) + ' (' + ev.annN + ')', ev.worst ? MN[ev.worst.m] + ' ' + fx(ev.worst.f) : '—', pc(ins.med)].join(' | ') + ' |');
  }
  // Paired comparison with today's method: share of the evaluated months where each method is closer, and years.
  const base = R2[D.z.label].a.ev.errs;
  const line = METHODS.slice(1).map((Mt) => {
    const e = R2[D.z.label][Mt.id].ev.errs; let better = 0, worse = 0;
    e.forEach((x, k) => { if (x.e < base[k].e - 1e-12) better++; else if (x.e > base[k].e + 1e-12) worse++; });
    let yb = 0, yw = 0; OY.forEach((_, k) => { const a = base.filter((x) => x.k === k).map((x) => x.e), b = e.filter((x) => x.k === k).map((x) => x.e); if (!a.length) return; if (median(b) < median(a) - 1e-12) yb++; else if (median(b) > median(a) + 1e-12) yw++; });
    R2[D.z.label][Mt.id].years = { better: yb, worse: yw, p: signP(yb, yb + yw) };
    return Mt.id + ': closer in ' + better + ' / worse in ' + worse + ' of ' + e.length + ' months; held-out years with a lower median error ' + yb + ', higher ' + yw + ' (one-sided sign test p = ' + (yb + yw ? signP(yb, yb + yw).toPrecision(2) : '—') + ')';
  });
  console.log('Paired vs a — ' + line.join(' | '));
}

/* ───────── summary over zones ───────── */
console.log('\n## 2b. Summary: change in out-of-sample median monthly error vs today (percentage points; negative = better)');
console.log('| zone | months (n) | a (today) | b | c | d | e | f |');
console.log('|---|---|---|---|---|---|---|---|');
const help = {}; METHODS.forEach((Mt) => { help[Mt.id] = { help: 0, hurt: 0, same: 0, d: [] }; });
for (const D of zones) {
  const r = R2[D.z.label], a = r.a.ev.all.med;
  const cells = METHODS.slice(1).map((Mt) => { const x = r[Mt.id].ev.all.med, d = (x - a) * 100; const H = help[Mt.id]; if (d < -0.5) H.help++; else if (d > 0.5) H.hurt++; else H.same++; H.d.push(d); return (d > 0 ? '+' : '') + d.toFixed(1); });
  console.log('| ' + [D.z.label, r.a.ev.all.n, pc(a)].concat(cells).join(' | ') + ' |');
}
console.log('| zones helped / hurt / unchanged (±0.5 pt) | | | ' + METHODS.slice(1).map((Mt) => help[Mt.id].help + ' / ' + help[Mt.id].hurt + ' / ' + help[Mt.id].same).join(' | ') + ' |');
console.log('\nSame, worst active calendar month out of sample (factor; today in-sample in brackets):');
console.log('| zone | a (in-sample) | a | b | c | d | e | f |');
console.log('|---|---|---|---|---|---|---|---|');
for (const D of zones) { const r = R2[D.z.label]; console.log('| ' + [D.z.label, D.worstIn ? MN[D.worstIn.m] + ' ' + fx(D.worstIn.f) : '—'].concat(METHODS.map((Mt) => (r[Mt.id].ev.worst ? MN[r[Mt.id].ev.worst.m] + ' ' + fx(r[Mt.id].ev.worst.f) : '—'))).join(' | ') + ' |'); }
console.log('\nSame, held-out years in which the method beats today (lower median monthly error) — better / worse, one-sided sign test p:');
console.log('| zone | b | c | d | e | f |');
console.log('|---|---|---|---|---|---|');
for (const D of zones) { const r = R2[D.z.label]; console.log('| ' + [D.z.label].concat(METHODS.slice(1).map((Mt) => { const y = r[Mt.id].years; return y.better + ' / ' + y.worse + (y.better + y.worse ? ' (p ' + y.p.toPrecision(2) + ')' : ''); })).join(' | ') + ' |'); }
console.log('\n## 2c. Hold-out in time: median monthly error, train 2012–2018 → test 2019–' + LAST + ' | train 2019–' + LAST + ' → test 2012–2018 (backward, like the use before 2012)');
console.log('| zone | a (today) | b | c | d | e | f |');
console.log('|---|---|---|---|---|---|---|');
const HO = {};
for (const D of zones) {
  HO[D.z.label] = {};
  console.log('| ' + [D.z.label].concat(METHODS.map((Mt) => { const fw = holdout(D, Mt.fit, (y) => y <= 2018, (y) => y >= 2019), bw = holdout(D, Mt.fit, (y) => y >= 2019, (y) => y <= 2018); HO[D.z.label][Mt.id] = { fw, bw }; return (fw ? pc(fw.med) : '—') + ' | ' + (bw ? pc(bw.med) : '—'); }).map((s) => s.replace(' | ', ' · '))).join(' | ') + ' |');
}
console.log('\nSame, annual leave-one-year-out median error:');
console.log('| zone | a | b | c | d | e | f |');
console.log('|---|---|---|---|---|---|---|');
for (const D of zones) { const r = R2[D.z.label]; console.log('| ' + [D.z.label].concat(METHODS.map((Mt) => pc(r[Mt.id].ev.annMed))).join(' | ') + ' |'); }

/* ───────── 3. side effects ───────── */
// Harmonized monthly series of the zone's OWN box with month ratios r (fitted on all overlap years): MODIS × r_m before
// 2012 and for January 2012, VIIRS after (exactly the app's construction when r is constant).
function harmSeries(D, r) { const S = D.Z.S, h = new Float64Array(NM); for (let i = 0; i < NM; i++) h[i] = i <= VJ ? S.modis[i] * r[i % 12] : S.snpp[i]; return h; }
const annual = (h, y) => { let t = 0; for (let m = 0; m < 12; m++) t += h[idx(y, m)]; return t; };
const riseOf = (h, A, B) => mean(A.map((y) => annual(h, y))) / mean(B.map((y) => annual(h, y)));
const BEF = [], AFT = []; for (let y = 2003; y < SW; y++) BEF.push(y); for (let y = SW; y <= LAST; y++) AFT.push(y);
console.log('\n## 3(i). Headline rise (mean ' + SW + '–' + LAST + ' ÷ mean 2003–2011) under each method, ratios fitted on all overlap years');
console.log('| zone | raw | MODIS alone | a (today; app riseH) | b | c | d | e | f |');
console.log('|---|---|---|---|---|---|---|---|---|');
const fits = {};
for (const D of zones) {
  const all = OY.map((_, k) => k); fits[D.z.label] = {}; METHODS.forEach((Mt) => { fits[D.z.label][Mt.id] = Mt.fit(D, all); });
  const S = D.Z.S, modisOnly = new Float64Array(NM); for (let i = 0; i < NM; i++) modisOnly[i] = S.modis[i];
  const ra = riseOf(harmSeries(D, fits[D.z.label].a), AFT, BEF);
  console.log('| ' + [D.z.label, f2(D.Z.riseRaw), f2(riseOf(modisOnly, AFT, BEF)), f2(ra) + ' (app ' + f2(D.Z.riseH) + ')'].concat(METHODS.slice(1).map((Mt) => { const x = riseOf(harmSeries(D, fits[D.z.label][Mt.id]), AFT, BEF); return f2(x) + ' (' + (x / ra - 1 >= 0 ? '+' : '') + ((x / ra - 1) * 100).toFixed(1) + '%)'; })).join(' | ') + ' |');
}
// Why the rise moves: seasonal composition of MODIS before vs after 2012 (share of MODIS cell-days per month).
for (const lab of ['All of Canada', 'All of Argentina']) {
  const D = zones.find((d) => d.z.label === lab), S = D.Z.S, sh = (Y) => { const t = Array(12).fill(0); Y.forEach((y) => { for (let m = 0; m < 12; m++) t[m] += S.modis[idx(y, m)]; }); const s = sum(t); return t.map((x) => x / s); };
  const b = sh(BEF), a = sh(AFT), r = fits[lab].b;
  const wb = sum(b.map((x, m) => x * r[m])), wa = sum(a.map((x, m) => x * r[m]));
  console.log(lab + ': MODIS share by month 2003–2011 vs ' + SW + '–' + LAST + ': ' + MN.map((n, m) => n + ' ' + (b[m] * 100).toFixed(1) + '/' + (a[m] * 100).toFixed(1)).join(', ') + ' | MODIS-weighted mean per-month ratio before ' + f2(wb, 3) + ', after ' + f2(wa, 3) + ' → rise factor vs MODIS alone ' + f2(wa / wb, 3));
}
// (ii) Official area burned, Canada (NFD), same years as the self-check.
const ab = JSON.parse(fs.readFileSync(here + 'data/official/canada_area_burned.json', 'utf8')).total;
const Aoff = []; for (let y = SW; y <= Math.min(LAST, Math.max(...Object.keys(ab).map(Number))); y++) Aoff.push(y);
const offR = mean(Aoff.map((y) => ab[y])) / mean(BEF.map((y) => ab[y]));
{
  const D = zones.find((d) => d.z.label === 'All of Canada');
  const vals = METHODS.map((Mt) => Mt.id + ' ' + f2(riseOf(harmSeries(D, fits['All of Canada'][Mt.id]), Aoff, BEF)));
  const appH = mean(Aoff.map(D.Z.annHarm)) / mean(BEF.map(D.Z.annHarm));
  console.log('\n## 3(ii). Canada vs official area burned (NFD), ' + Aoff[0] + '–' + Aoff[Aoff.length - 1] + ' ÷ 2003–2011: official ' + f2(offR) + ' | app harmonized ' + f2(appH) + ' | ' + vals.join(', '));
}
// (iii) Calendar cells before 2012 (2001–2011) that change colour class vs today's harmonized calendar.
console.log('\n## 3(iii). Calendar cells 2001–2011 (132) whose colour class changes vs today\'s harmonized calendar');
console.log('Today raw → harmonized changes the class of N cells (context). "same breaks" = today\'s class breaks; "rebuilt" = breaks recomputed from raw + the new harmonized series, as the app would.');
console.log('| zone | today raw→harm | b same / rebuilt | c same / rebuilt | d same / rebuilt | e same / rebuilt | f same / rebuilt |');
console.log('|---|---|---|---|---|---|---|');
for (const D of zones) {
  const Z = D.Z, cal = calendarData(Z), pre = []; for (let i = 0; i < (SW - FIRST) * 12; i++) pre.push(i);
  const today = pre.map((i) => countClass(Math.round(Z.harm[i]), Z.breaks));
  const cells = METHODS.slice(1).map((Mt) => {
    const h = harmSeries(D, fits[D.z.label][Mt.id]), br = countBreaks(Array.from(Z.raw).concat(Array.from(h)));
    const same = pre.filter((i, k) => countClass(Math.round(h[i]), Z.breaks) !== today[k]).length;
    const reb = pre.filter((i, k) => countClass(Math.round(h[i]), br) !== today[k]).length;
    return same + ' / ' + reb + (br.join() !== Z.breaks.join() ? ' (breaks change)' : '');
  });
  console.log('| ' + [D.z.label, cal.changed + ' of ' + cal.preMonths].concat(cells).join(' | ') + ' |');
}
// (iv) Uncertainty of the per-month ratios: leave-one-year-out range over the years with ≥ 50 MODIS cell-days in that
// month, the app's grade for that month as its own bridge, and the shrinkage weight.
console.log('\n## 3(iv). Per-month ratios: leave-one-year-out range, grade (app rule ownGrade on the month as its own bridge), shrinkage weight');
for (const D of zones) {
  const all = OY.map((_, k) => k), sp = shrinkParts(D, all);
  const parts = Array.from({ length: 12 }, (_, m) => { const b = monthBridge(D, all, m); const g = b.ratio != null && b.medErr != null ? ownGrade(b) : 'C'; return { m, b, g }; });
  const nA = parts.filter((p) => p.g === 'A').length, nB = parts.filter((p) => p.g === 'B').length;
  console.log('\n' + D.z.label + ' — pooled ' + f2(sp.R) + ', τ (between-month SD of log ratio) ' + f2(Math.sqrt(sp.tau2), 3) + ' | months grade A: ' + nA + ', B: ' + nB + ', C: ' + (12 - nA - nB));
  console.log('| month | ratio b | LOO range | spread | usable yrs | LOO median err | grade | EB weight | shrunk ratio c | curve d | f uses |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const p of parts) { const b = p.b; console.log('| ' + [MN[p.m], f2(b.ratio), b.rMin != null ? f2(b.rMin) + '–' + f2(b.rMax) : '—', b.spread != null && isFinite(b.spread) ? pc(b.spread, 0) : '—', b.usable.length, pc(b.medErr, 0), p.g, f2(sp.wt[p.m]), f2(sp.r[p.m]), f2(fits[D.z.label].d[p.m]), p.g === 'A' ? 'own' : 'pooled'].join(' | ') + ' |'); }
}

/* ───────── numbers quoted in research/SEASONAL.md ───────── */
console.log('\n## Key figures (quoted in research/SEASONAL.md)');
for (const lab of ['All of Canada', 'All of Argentina']) {
  const r = R2[lab]; console.log(lab + ': out-of-sample median monthly error ' + METHODS.map((Mt) => Mt.id + ' ' + pc(r[Mt.id].ev.all.med)).join(', ') + ' | c beats a in ' + r.c.years.better + ' of ' + (r.c.years.better + r.c.years.worse) + ' held-out years (p ' + r.c.years.p.toPrecision(2) + ') | backward hold-out (train 2019–' + LAST + ', test 2012–2018) a ' + pc(HO[lab].a.bw.med) + ', c ' + pc(HO[lab].c.bw.med) + ' | fire season ' + METHODS.map((Mt) => Mt.id + ' ' + pc(r[Mt.id].ev.fire.med)).join(', ') + ' | off-season ' + METHODS.map((Mt) => Mt.id + ' ' + pc(r[Mt.id].ev.off.med)).join(', ') + ' | worst month ' + METHODS.map((Mt) => Mt.id + ' ' + (r[Mt.id].ev.worst ? MN[r[Mt.id].ev.worst.m] + ' ' + fx(r[Mt.id].ev.worst.f) : '—')).join(', '));
}
const pres = zones.filter((d) => !d.z.whole);
for (const Mt of METHODS.slice(1)) { const d = pres.map((D) => (R2[D.z.label][Mt.id].ev.all.med - R2[D.z.label].a.ev.all.med) * 100); console.log('Presets (7): method ' + Mt.id + ' median monthly error change ' + d.map((x) => (x > 0 ? '+' : '') + x.toFixed(1)).join(', ') + ' pt; helped ' + d.filter((x) => x < -0.5).length + ', hurt ' + d.filter((x) => x > 0.5).length); }

export { zones, R2, HO, fits, shrinkParts, evaluate, fitPooled, fitShrink, OY, harmSeries, riseOf, BEF, AFT };
