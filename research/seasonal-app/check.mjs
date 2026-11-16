// Evidence that the seasonal preview computes what the research prototype tested (node research/seasonal-app/check.mjs).
// It imports the research code itself (research/seasonal.mjs, loaded verbatim with an export line appended; its own
// printout is captured, not shown), the VALIDATED module (src/metrics.js) and the PREVIEW module
// (research/seasonal-app/src/metrics.js), and compares them. Exit 1 on any mismatch with the prototype.
// Options: --grid=N  side of the box grid in degrees (default 2); --no-grid  skip (e).
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash } from 'crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const argv = process.argv.slice(2), opt = (k) => { const a = argv.find((x) => x === '--' + k || x.startsWith('--' + k + '=')); return a == null ? null : a.includes('=') ? a.slice(a.indexOf('=') + 1) : true; };
let fails = 0;
const FAIL = (m) => { fails++; console.log('FAIL ' + m); };
const sha = (p) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');

console.log('# Seasonal preview: check against the research prototype and the validated app');
const vsha = sha('src/metrics.js');
console.log('validated src/metrics.js sha256 ' + vsha.slice(0, 12) + (vsha.startsWith('779e3785') ? ' (unchanged)' : ' — CHANGED'));
if (!vsha.startsWith('779e3785')) FAIL('src/metrics.js is not the validated module');
console.log('preview research/seasonal-app/src/metrics.js sha256 ' + sha('research/seasonal-app/src/metrics.js').slice(0, 12));

// ── 1. the research code, loaded verbatim (imports pointed at the validated module and the tile loader) ──
const rsrc = fs.readFileSync(path.join(ROOT, 'research', 'seasonal.mjs'), 'utf8');
const subs = [
  ["'../src/metrics.js'", JSON.stringify(url('src/metrics.js')), 2],
  ["'../tools-win/tiles.mjs'", JSON.stringify(url('tools-win/tiles.mjs')), 1],
  ["fileURLToPath(new URL('..', import.meta.url))", JSON.stringify(ROOT.split(path.sep).join('/') + '/'), 1],
];
let gen = rsrc;
for (const [a, b, n] of subs) { const k = gen.split(a).length - 1; if (k !== n) { console.log('FAIL research/seasonal.mjs: ' + a + ' found ' + k + ' times (expected ' + n + ')'); process.exit(1); } gen = gen.split(a).join(b); }
gen += '\nexport { zones, R2, HO, fits, shrinkParts, evaluate, fitPooled, fitShrink, OY, harmSeries, riseOf, BEF, AFT };\n';
const GEN = path.join(HERE, '.gen'); fs.mkdirSync(GEN, { recursive: true });
const genFile = path.join(GEN, 'seasonal.research.mjs'); fs.writeFileSync(genFile, gen);
const captured = []; const log0 = console.log; console.log = (...a) => captured.push(a.join(' '));
let RS;
try { RS = await import(pathToFileURL(genFile).href); } finally { console.log = log0; }
const base = captured.find((l) => l.startsWith('Baseline: ')) || '';
console.log('research/seasonal.mjs imported (' + captured.length + ' lines of its own output captured). ' + base);
if (!/ALL MATCH/.test(base)) FAIL('research baseline does not reproduce the validated app');

// ── 2. validated and preview modules on the same tiles ──
const MX = await import(url('src/metrics.js'));
const PX = await import(url('research/seasonal-app/src/metrics.js'));
const GV = await import(url('src/guard.js'));
const GP = await import(url('research/seasonal-app/src/guard.js'));
const OV = await import(url('src/official.js'));
const OP = await import(url('research/seasonal-app/src/official.js'));
const { loadTiles } = await import(url('tools-win/tiles.mjs'));
const LT = loadTiles(ROOT + path.sep);
PX.setRecordEnd(LT.end);
if (MX.LAST !== PX.LAST || MX.NM !== PX.NM) FAIL('record end differs');
const CV = { canada: MX.decodeCountry(LT.tiles.canada), argentina: MX.decodeCountry(LT.tiles.argentina) };
const CP = { canada: PX.decodeCountry(LT.tiles.canada), argentina: PX.decodeCountry(LT.tiles.argentina) };
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? '—' : x.toFixed(d));
const pc = (x, d = 1) => (x == null || !isFinite(x) ? '—' : (x * 100).toFixed(d) + '%');
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
const sgn = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%';

// Verdict as the page shows it (guard.js on the zone).
function verdict(G, Z) {
  if (Z.empty) return 'empty';
  const g = G.guarded(Z);
  if (!g.harmOK) return Z.harmOK ? 'not harmonized (G4)' : 'not harmonized (grade ' + Z.grade + ')';
  if (g.guard) { const r = g.guard; const which = r.startsWith('no detections') ? 'G3' : r.startsWith('only') ? 'G1' : r.startsWith('Aqua') ? 'G5' : 'G2'; return 'guarded ' + which; }
  if (g.g6) return 'uncertain (G6)';
  return g.trend ? g.trend.status : 'no trend';
}

const ALL = Array.from({ length: RS.OY.length }, (_, k) => k);
const results = [];
for (const p of MX.PRESETS) {
  const ZV = MX.computeZone(CV[p.country], p.box), ZP = PX.computeZone(CP[p.country], p.box);
  const D = RS.zones.find((d) => d.z.label === p.label);
  const sea = ZP.src.seasonal, sp = RS.shrinkParts(D, ALL);
  console.log('\n## ' + p.label + (D.borrowed ? ' (bridge on the borrowed wider box ' + JSON.stringify(D.srcBox) + ', as the app)' : '') + ' — grade ' + ZP.grade);
  // (a) pooled ratio + 12 month factors
  if (!(ZV.ratio === ZP.ratio || (ZV.ratio == null && ZP.ratio == null))) FAIL(p.label + ': pooled ratio changed ' + ZV.ratio + ' → ' + ZP.ratio);
  console.log('(a) pooled VIIRS ÷ MODIS ' + f2(ZV.ratio, 4) + ' validated / ' + f2(ZP.ratio, 4) + ' preview' + (ZV.ratio === ZP.ratio ? ' (identical)' : '') + ' | τ ' + f2(Math.sqrt(sea.tau2), 3));
  console.log('| | ' + MN.join(' | ') + ' |'); console.log('|---|' + MN.map(() => '---').join('|') + '|');
  console.log('| shrunk ratio (method c) | ' + sea.shrunk.map((x) => f2(x)).join(' | ') + ' |');
  console.log('| weight w | ' + sea.w.map((x) => f2(x)).join(' | ') + ' |');
  console.log('| factor used (w ≥ 0.5, else pooled) | ' + sea.f.map((x, m) => f2(x) + (sea.corrected[m] ? '' : '*')).join(' | ') + ' |');
  console.log('| leave-one-year-out range | ' + sea.f.map((x, m) => f2(sea.lo[m]) + '–' + f2(sea.hi[m])).join(' | ') + ' |');
  console.log('(* = weight below 0.5: pooled ratio; ' + sea.corrected.filter(Boolean).length + ' of 12 months seasonally corrected)');
  // equality with the research prototype (factors, weights, τ², pooled R) to 1e-9
  let dmax = 0, wmax = 0;
  sea.shrunk.forEach((x, m) => { dmax = Math.max(dmax, rel(x, sp.r[m])); wmax = Math.max(wmax, Math.abs(sea.w[m] - sp.wt[m])); });
  const eqR = rel(sea.R, sp.R) < 1e-9 && Math.abs(sea.tau2 - sp.tau2) < 1e-9;
  const fOk = sea.f.every((x, m) => x === (sea.w[m] >= 0.5 ? sea.shrunk[m] : sea.R));
  const ok1 = dmax < 1e-9 && wmax < 1e-9 && eqR && fOk;
  console.log('    = research shrinkParts: max rel. diff of the 12 shrunk ratios ' + dmax.toExponential(1) + ', of the weights ' + wmax.toExponential(1) + ', pooled R and τ² ' + (eqR ? 'equal' : 'DIFFER') + ', fallback rule ' + (fOk ? 'applied' : 'WRONG') + ' → ' + (ok1 ? 'MATCH' : 'MISMATCH'));
  if (!ok1) FAIL(p.label + ': month factors differ from research/seasonal.mjs');
  // (b) headline rises
  const rc = RS.riseOf(RS.harmSeries(D, RS.fits[p.label].c), RS.AFT, RS.BEF);
  if (ZV.riseRaw !== ZP.riseRaw) FAIL(p.label + ': raw rise changed');
  const dH = ZV.riseH != null && ZP.riseH != null ? ZP.riseH / ZV.riseH - 1 : null, dM = ZP.riseH != null ? ZP.riseH / ZP.riseModis - 1 : null;
  console.log('(b) rise raw ' + f2(ZV.riseRaw, 3) + ' / ' + f2(ZP.riseRaw, 3) + (ZV.riseRaw === ZP.riseRaw ? ' (identical)' : '') + ' | harmonized validated ' + f2(ZV.riseH, 3) + ' → preview ' + f2(ZP.riseH, 3) + (dH != null ? ' (' + sgn(dH) + ')' : '') + ' | research c (no fallback) ' + f2(rc, 3) + ' | MODIS alone ' + f2(ZP.riseModis, 3) + ' → preview − MODIS alone ' + (dM != null ? sgn(dM) : '—'));
  // (c) out-of-sample monthly error: research evaluate() vs the preview module
  const ra = RS.R2[p.label].a.ev.all, rcE = RS.R2[p.label].c.ev.all, o = sea.oos;
  const ok3 = ra.n === o.pooled.n && rcE.n === o.shrunk.n && Math.abs(ra.med - o.pooled.medErr) < 1e-9 && Math.abs(rcE.med - o.shrunk.medErr) < 1e-9;
  console.log('(c) out-of-sample median monthly error (leave one overlap year out, n months): single ratio ' + pc(o.pooled.medErr) + ' (' + o.pooled.n + ') → month factors c ' + pc(o.shrunk.medErr) + ' | research: ' + pc(ra.med) + ' → ' + pc(rcE.med) + ' → ' + (ok3 ? 'MATCH (to 1e-9, same n)' : 'MISMATCH') + ' | with the preview fallback (w < 0.5 → pooled) ' + pc(o.applied.medErr));
  if (!ok3) FAIL(p.label + ': out-of-sample error differs from research/seasonal.mjs');
  const worst = (q) => { let b = null; ZP.byMonth.forEach((x) => { if (!x.active || q[x.m] == null) return; const fct = Math.max(q[x.m], 1 / q[x.m]); if (!b || fct > b.f) b = { m: x.m, f: fct }; }); return b ? MN[b.m] + ' ' + f2(b.f) + '×' : '—'; };
  console.log('    worst active month out of sample: single ' + worst(o.pooled.q) + ', c ' + worst(o.shrunk.q) + ', preview ' + worst(o.applied.q) + ' | research: a ' + (RS.R2[p.label].a.ev.worst ? MN[RS.R2[p.label].a.ev.worst.m] + ' ' + f2(RS.R2[p.label].a.ev.worst.f) + '×' : '—') + ', c ' + (RS.R2[p.label].c.ev.worst ? MN[RS.R2[p.label].c.ev.worst.m] + ' ' + f2(RS.R2[p.label].c.ev.worst.f) + '×' : '—'));
  // (e) verdict
  const vV = verdict(GV, ZV), vP = verdict(GP, ZP);
  console.log('(e) verdict validated "' + vV + '" → preview "' + vP + '"' + (vV === vP ? '' : '  ← CHANGES') + (ZP.trend ? ' | preview trend ' + f2(ZP.trend.rise) + ' without ' + ZP.trend.bigYear + ' ' + f2(ZP.trend.without) + ', 90% ' + f2(ZP.trend.lo) + '–' + f2(ZP.trend.hi) + ' (validated ' + f2(ZV.trend.lo) + '–' + f2(ZV.trend.hi) + ')' : ''));
  // (f) calendar cells 2001–2011 changing colour class
  const pre = (MX.SW - MX.FIRST) * 12; let ch = 0; const list = [];
  for (let i = 0; i < pre; i++) { const a = MX.countClass(Math.round(ZV.harm[i]), ZV.breaks), b = PX.countClass(Math.round(ZP.harm[i]), ZP.breaks); if (a !== b) { ch++; if (list.length < 8) list.push(MX.monthKey(i) + ' ' + a + '→' + b); } }
  console.log('(f) calendar cells 2001–2011 changing colour class (harmonized view): ' + ch + ' of ' + pre + (ZV.breaks.join() !== ZP.breaks.join() ? ' (class breaks change: ' + ZV.breaks.join(',') + ' → ' + ZP.breaks.join(',') + ')' : ' (same breaks)') + (list.length ? ' e.g. ' + list.join(', ') : ''));
  results.push({ p, ZV, ZP, vV, vP, ch });
}

// Key figures quoted in research/SEASONAL.md
console.log('\n## Key figures (research/SEASONAL.md: Canada 16.5 % → 11.7 %, Argentina 11.7 % → 6.9 %; rises 2.01× and 0.68×)');
const K = { 'All of Canada': ['16.5%', '11.7%', '2.01'], 'All of Argentina': ['11.7%', '6.9%', '0.68'] };
for (const [lab, [a, c, rise]] of Object.entries(K)) {
  const R = results.find((r) => r.p.label === lab), o = R.ZP.src.seasonal.oos;
  const ok = pc(o.pooled.medErr) === a && pc(o.shrunk.medErr) === c && f2(R.ZV.riseH) === rise && f2(R.ZP.riseH) === rise;
  console.log((ok ? 'PASS ' : 'FAIL ') + lab + ': ' + pc(o.pooled.medErr) + ' → ' + pc(o.shrunk.medErr) + ' (preview with fallback ' + pc(o.applied.medErr) + '); rise ' + f2(R.ZV.riseH) + '× → ' + f2(R.ZP.riseH) + '×');
  if (!ok) fails++;
}

// (d) official area burned, Canada
{
  const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'official', 'canada_area_burned.json'), 'utf8'));
  const R = results.find((r) => r.p.label === 'All of Canada'), a = OV.officialCheck(D, R.ZV), b = OP.officialCheck(D, R.ZP);
  console.log('\n## (d) Canada vs official area burned (NFD), ' + a.after[0] + '–' + a.after[1] + ' ÷ 2003–2011: official ' + f2(a.rise) + ' | harmonized validated ' + f2(a.harm) + ' → preview ' + f2(b.harm) + ' | raw ' + f2(a.raw) + ' / ' + f2(b.raw) + ' | Spearman harmonized ' + f2(a.rho.harm) + ' → ' + f2(b.rho.harm));
  if (f2(a.rise) !== '1.92' || f2(a.harm) !== '1.88') FAIL('official check of the validated app is not 1.92 / 1.88');
}

// (e) grid of boxes
if (!opt('no-grid')) {
  const step = +(opt('grid') || 2), changes = [], counts = {};
  let n = 0; const t0 = Date.now();
  for (const country of ['canada', 'argentina']) {
    const bb = CV[country].bbox, tiles = CV[country].tiles;
    for (let s = Math.floor(bb.s / step) * step; s < bb.n; s += step) for (let w = Math.floor(bb.w / step) * step; w < bb.e; w += step) {
      const box = { s, n: s + step, w, e: w + step };
      if (!tiles.some((t) => t.lat >= s && t.lat < s + step && t.lon >= w && t.lon < w + step)) continue; // no VIIRS detection at all
      const ZV = MX.computeZone(CV[country], box), ZP = PX.computeZone(CP[country], box);
      if (ZV.empty) continue;
      n++;
      const vV = verdict(GV, ZV), vP = verdict(GP, ZP), k = vV + ' → ' + vP; counts[k] = (counts[k] || 0) + 1;
      if (vV !== vP) changes.push(country + ' ' + JSON.stringify(box) + ': ' + vV + ' → ' + vP + ' | rise ' + f2(ZV.riseH) + ' → ' + f2(ZP.riseH) + ', 90% ' + (ZV.trend ? f2(ZV.trend.lo) + '–' + f2(ZV.trend.hi) : '—') + ' → ' + (ZP.trend ? f2(ZP.trend.lo) + '–' + f2(ZP.trend.hi) : '—') + ', without big year ' + (ZV.trend ? f2(ZV.trend.without) : '—') + ' → ' + (ZP.trend ? f2(ZP.trend.without) : '—'));
    }
  }
  console.log('\n## (e) Verdict changes on a grid of ' + step + '° boxes (' + n + ' boxes with detections, both countries; ' + Math.round((Date.now() - t0) / 1000) + ' s)');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));
  console.log(changes.length ? changes.length + ' boxes change verdict:' : 'No box changes verdict.');
  changes.forEach((c) => console.log('  ' + c));
}
const presetChanges = results.filter((r) => r.vV !== r.vP);
console.log('\nPreset verdict changes: ' + (presetChanges.length ? presetChanges.map((r) => r.p.label + ' (' + r.vV + ' → ' + r.vP + ')').join('; ') : 'none'));
console.log('\n' + (fails ? 'CHECK FAILED (' + fails + ')' : 'CHECK PASSED: the preview\'s month factors and out-of-sample errors equal research/seasonal.mjs (1e-9); pooled ratio and raw figures unchanged'));
process.exitCode = fails ? 1 : 0;
