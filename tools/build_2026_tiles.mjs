// Converts the CSV files written by scripts/fetch_firms_2026.mjs (data/raw/2026/<name>/<SOURCE>_<date>_<range>d.csv)
// into the FireBridge tile JSON format for one country: series modis, aqua, snpp, n20; same cell-day rule as the
// 2000–2025 country tiles (cell = floor(lat/0.009), floor(lon/0.014); tile of the cell centre; one count per cell and day).
// Rows without a `type` column (NRT) are kept and their month is flagged "provisional, not filtered for non-fire sources".
// Usage: node tools/build_2026_tiles.mjs --in=data/raw/2026/<name> --country=canada [--out=data/2026/canada.json]
import fs from 'fs';
import path from 'path';
export const CELL_LAT = 0.009, CELL_LON = 0.014, TILE = 0.5;
const SENSOR = (src) => (/^MODIS/.test(src) ? 'modis' : /^VIIRS_SNPP/.test(src) ? 'snpp' : /^VIIRS_NOAA20/.test(src) ? 'n20' : null);
export function parseCsv(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const h = head.split(',').map((x) => x.trim());
  return rows.filter(Boolean).map((r) => { const v = r.split(','); const o = {}; h.forEach((k, i) => (o[k] = v[i])); return o; });
}
// The 2001–2025 tiles come from FIRMS COUNTRY files (clipped at the border); the 2026 fetch is a bounding box, which
// also holds detections from neighbouring countries (United States, Greenland; Chile, Bolivia, Paraguay, Brazil,
// Uruguay). foreignMask() drops any detection inside another country's Natural Earth 1:50m polygon, so 2026 stays
// comparable with the country files (offshore detections are kept, as no other country claims them).
export function foreignMask(country) {
  const here = new URL('..', import.meta.url).pathname;
  const self = { canada: '124', argentina: '032' }[country];
  const topo = JSON.parse(fs.readFileSync(here + 'vendor/node_modules/world-atlas/countries-50m.json', 'utf8'));
  return import(here + 'vendor/node_modules/topojson-client/src/index.js').then(({ feature }) => {
    const fc = feature(topo, topo.objects.countries);
    const mine = fc.features.find((f) => f.id === self);
    const bb = [180, 90, -180, -90];
    const eachRing = (f, cb) => { const g = f.geometry; if (!g) return; (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []).forEach((poly) => cb(poly)); };
    eachRing(mine, (poly) => poly[0].forEach(([x, y]) => { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); }));
    const polys = [];
    for (const f of fc.features) {
      if (f.id === self) continue;
      eachRing(f, (poly) => {
        const r = poly[0]; let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
        for (const [x, y] of r) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        if (x1 - x0 > 180) return; // antimeridian rings: far from both countries
        if (x1 < bb[0] - 1 || x0 > bb[2] + 1 || y1 < bb[1] - 1 || y0 > bb[3] + 1) return;
        polys.push({ box: [x0, y0, x1, y1], rings: poly, id: f.id });
      });
    }
    const inRing = (r, x, y) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    return (lat, lon) => {
      for (const p of polys) {
        if (lon < p.box[0] || lon > p.box[2] || lat < p.box[1] || lat > p.box[3]) continue;
        if (inRing(p.rings[0], lon, lat) && !p.rings.slice(1).some((h) => inRing(h, lon, lat))) return true;
      }
      return false;
    };
  });
}
export function tilesFromFiles(files, ref, isForeign = null) {
  const foreignCache = new Map(); let dropped = 0;
  const cells = { modis: new Map(), aqua: new Map(), snpp: new Map(), n20: new Map() };
  const provisional = new Set(), seenType = {};
  for (const { source, text } of files) {
    const s = SENSOR(source); if (!s) continue;
    for (const r of parseCsv(text)) {
      const hasType = r.type !== undefined && r.type !== '';
      if (hasType && String(r.type).trim() !== '0') continue; // type 0 only, as in the 2000–2025 tiles
      const ym = String(r.acq_date).slice(0, 7);
      if (!hasType) provisional.add(s + ':' + ym);
      const lat = +r.latitude, lon = +r.longitude;
      if (!isFinite(lat) || !isFinite(lon)) continue;
      const ci = Math.floor(lat / CELL_LAT), cj = Math.floor(lon / CELL_LON);
      if (isForeign) { const ck = ci + ',' + cj; let f = foreignCache.get(ck); if (f === undefined) { f = isForeign((ci + 0.5) * CELL_LAT, (cj + 0.5) * CELL_LON); foreignCache.set(ck, f); } if (f) { dropped++; continue; } }
      const key = ci + ',' + cj + ',' + r.acq_date;
      const targets = [s];
      if (s === 'modis' && /aqua/i.test(r.satellite || '') ) targets.push('aqua');
      for (const t of targets) { const m = cells[t].get(ym) || new Map(); m.set(key, [ci, cj]); cells[t].set(ym, m); }
    }
  }
  const out = { v: 1, country: ref.country, i0: ref.i0, j0: ref.j0, rows: ref.rows, cols: ref.cols, bbox: ref.bbox, series: {}, totals: {}, provisional: [...provisional].sort(), foreignDropped: dropped, unit: 'cell-days (same rule as the 2000–2025 tiles)' };
  for (const s in cells) {
    out.series[s] = {}; out.totals[s] = {};
    for (const ym of [...cells[s].keys()].sort()) {
      const tiles = new Map();
      for (const [ci, cj] of cells[s].get(ym).values()) {
        const ti = Math.floor(((ci + 0.5) * CELL_LAT) / TILE), tj = Math.floor(((cj + 0.5) * CELL_LON) / TILE);
        const k = (ti - ref.i0) + ',' + (tj - ref.j0); tiles.set(k, (tiles.get(k) || 0) + 1);
      }
      out.series[s][ym] = [...tiles.entries()].map(([k, n]) => k + ',' + n).join(';');
      out.totals[s][ym] = cells[s].get(ym).size;
    }
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('build_2026_tiles.mjs')) {
  const a = Object.fromEntries(process.argv.slice(2).map((x) => x.replace(/^--/, '').split('=')));
  if (!a.in || !a.country) { console.error('Usage: --in=<dir> --country=canada|argentina [--out=...]'); process.exit(2); }
  const here = new URL('..', import.meta.url).pathname;
  const ref = JSON.parse(fs.readFileSync(here + 'data/' + a.country + '.json', 'utf8'));
  const files = fs.readdirSync(a.in).filter((f) => f.endsWith('.csv')).map((f) => ({ source: f.split('_').slice(0, -2).join('_'), text: fs.readFileSync(path.join(a.in, f), 'utf8') }));
  const out = tilesFromFiles(files, ref, await foreignMask(a.country));
  // Last day covered: the fetch manifest's `to` date when present, else the latest acquisition date in the files.
  // The app uses only months that end on or before it (an incomplete current month is left out).
  const man = path.join(a.in, 'manifest.json');
  let through = fs.existsSync(man) ? JSON.parse(fs.readFileSync(man, 'utf8')).to : null;
  if (!through) for (const f of files) for (const r of parseCsv(f.text)) if (r.acq_date && (!through || r.acq_date > through)) through = r.acq_date;
  out.through = through || null;
  const dest = a.out || here + 'data/2026/' + a.country + '.json';
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, JSON.stringify(out));
  console.log('wrote', dest, 'through', out.through, 'dropped (other countries)', out.foreignDropped, Object.fromEntries(Object.entries(out.totals).map(([s, t]) => [s, Object.keys(t).length + ' months'])), 'provisional', out.provisional.length);
}
