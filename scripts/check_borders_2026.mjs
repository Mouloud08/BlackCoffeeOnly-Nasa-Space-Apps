// Border / leakage check on the converted 2026 tiles. For each 0.5° tile, S-NPP (and MODIS) cell-days Jan–Oct 2026
// against the same tile's Jan–Oct totals in 2012–2025. Lists: tiles active in 2026 that were NEVER active before
// (a neighbour-country point kept by mistake would show up here), and tiles far above their own record.
// Usage: node scripts/check_borders_2026.mjs canada|argentina
import fs from 'fs';
const c = process.argv[2];
const T = JSON.parse(fs.readFileSync(`data/2026/${c}.json`, 'utf8'));
const R = JSON.parse(fs.readFileSync(`data/${c}.json`, 'utf8'));
const add = (map, str) => { if (!str) return; for (const p of str.split(';')) { const x = p.split(','); if (x.length === 3) { const k = x[0] + ',' + x[1]; map.set(k, (map.get(k) || 0) + +x[2]); } } };
const mm = (m) => String(m).padStart(2, '0');
for (const s of ['snpp', 'modis']) {
  const y0 = s === 'snpp' ? 2012 : 2003;
  const now = new Map(); for (let m = 1; m <= 10; m++) add(now, T.series[s]['2026-' + mm(m)]);
  const ever = new Map(), best = new Map();
  for (let y = y0; y <= 2025; y++) { const yr = new Map(); for (let m = 1; m <= 12; m++) { const str = R.series[s][y + '-' + mm(m)]; add(ever, str); if (m <= 10) add(yr, str); } for (const [k, v] of yr) if (v > (best.get(k) || 0)) best.set(k, v); }
  const pos = (k) => { const [di, dj] = k.split(',').map(Number); return ((R.i0 + di) * 0.5).toFixed(1) + ',' + ((R.j0 + dj) * 0.5).toFixed(1); };
  const fresh = [...now].filter(([k]) => !ever.has(k)).sort((a, b) => b[1] - a[1]);
  const total = [...now.values()].reduce((a, b) => a + b, 0);
  const freshSum = fresh.reduce((a, b) => a + b[1], 0);
  const high = [...now].filter(([k, v]) => ever.has(k) && v >= 100 && v > 2 * (best.get(k) || 0)).sort((a, b) => b[1] / (best.get(b[0]) || 1) - a[1] / (best.get(a[0]) || 1));
  console.log(`\n${c} ${s}: ${now.size} tiles active Jan–Oct 2026, ${total} cell-days | tiles ever active ${y0}–2025: ${ever.size}`);
  console.log(`  NEW tiles (never active ${y0}–2025): ${fresh.length}, holding ${freshSum} cell-days (${(100 * freshSum / total).toFixed(2)}% of 2026) | largest (lat,lon SW corner: cell-days):`, fresh.slice(0, 10).map(([k, v]) => pos(k) + ': ' + v).join(' | '));
  console.log(`  tiles ≥ 100 cell-days and > 2× their own best Jan–Oct year: ${high.length} |`, high.slice(0, 10).map(([k, v]) => pos(k) + ': ' + v + ' vs ' + (best.get(k) || 0)).join(' | '));
  // Tiles outside the reference grid would have been rejected; report the extent used.
  let la = [90, -90], lo = [180, -180]; for (const k of now.keys()) { const [a, b] = pos(k).split(',').map(Number); la = [Math.min(la[0], a), Math.max(la[1], a)]; lo = [Math.min(lo[0], b), Math.max(lo[1], b)]; }
  console.log(`  extent of active tiles: lat ${la.join('..')}, lon ${lo.join('..')}`);
}
