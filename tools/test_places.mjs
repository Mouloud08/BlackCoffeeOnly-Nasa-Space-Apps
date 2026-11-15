// Each place label must fall inside its own country's Natural Earth 1:50m polygon (the outline the map draws).
import fs from 'fs';
import { feature } from '../vendor/node_modules/topojson-client/src/index.js';
import { PLACES } from '../src/places.js';
const here = new URL('..', import.meta.url).pathname;
const topo = JSON.parse(fs.readFileSync(here + 'vendor/node_modules/world-atlas/countries-50m.json', 'utf8'));
const fc = feature(topo, topo.objects.countries);
const inRing = (r, x, y) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const inside = (id, lat, lon) => { const g = fc.features.find((f) => f.id === id).geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; return polys.some((p) => inRing(p[0], lon, lat) && !p.slice(1).some((h) => inRing(h, lon, lat))); };
// Coastal and river cities can sit just outside the generalised 1:50m outline: accepted when the outline is within
// 0.08° (about 6–9 km, under one pixel of the picker map), and reported as such.
const near = (id, lat, lon, r) => { for (let a = 0; a < 32; a++) for (const f of [0.25, 0.5, 0.75, 1]) { const t = (a / 32) * 2 * Math.PI; if (inside(id, lat + r * f * Math.sin(t), lon + r * f * Math.cos(t))) return true; } return false; };
let bad = 0;
for (const [c, id] of [['canada', '124'], ['argentina', '032']]) for (const [n, lat, lon] of PLACES[c]) {
  const ok = inside(id, lat, lon), close = !ok && near(id, lat, lon, 0.08);
  if (!ok && !close) bad++;
  console.log(ok ? 'PASS' : close ? 'PASS (coast: outline within 0.08°)' : 'FAIL', c, n, lat, lon);
}
process.exit(bad ? 1 : 0);
