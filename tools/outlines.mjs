// Natural Earth 1:50m outlines (world-atlas) -> compact rings for the two map frames, built at compile time.
import fs from 'fs';
import { feature } from '../vendor/node_modules/topojson-client/src/index.js';
const here = new URL('..', import.meta.url).pathname;
const topo = JSON.parse(fs.readFileSync(here + 'vendor/node_modules/world-atlas/countries-50m.json', 'utf8'));
const fc = feature(topo, topo.objects.countries);
const FRAMES = {
  canada: { self: '124', frame: { s: 25, n: 86, w: -175, e: -10 } },
  argentina: { self: '032', frame: { s: -60, n: -12, w: -95, e: -30 } },
};
const Q = 50; // 0.02° grid
export function outlines(minStep = 0.06) {
  const out = {};
  for (const [k, F] of Object.entries(FRAMES)) {
    const self = [], others = [];
    for (const f of fc.features) {
      const g = f.geometry; if (!g) continue;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const poly of polys) for (const ring of poly) {
        let inF = false;
        for (const [x, y] of ring) if (x >= F.frame.w && x <= F.frame.e && y >= F.frame.s && y <= F.frame.n) { inF = true; break; }
        if (!inF) continue;
        let wrap = false; for (let i = 1; i < ring.length; i++) if (Math.abs(ring[i][0] - ring[i - 1][0]) > 90) { wrap = true; break; }
        if (wrap) continue; // rings crossing the antimeridian (eastern Russia) would draw across the frame
        const pts = []; let lx = 1e9, ly = 1e9;
        for (const [x, y] of ring) { if (Math.abs(x - lx) + Math.abs(y - ly) < minStep) continue; pts.push(Math.round(x * Q), Math.round(y * Q)); lx = x; ly = y; }
        if (pts.length < 8) continue;
        (f.id === F.self ? self : others).push(pts);
      }
    }
    out[k] = { q: Q, self, others };
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('outlines.mjs')) {
  const o = outlines();
  for (const k in o) console.log(k, 'self rings', o[k].self.length, 'other rings', o[k].others.length, 'bytes', JSON.stringify(o[k]).length);
}
