// Natural Earth outlines (inlined at build) and the equirectangular projection used by both maps.
let OUT = null;
export function outlines() {
  if (!OUT) { try { OUT = JSON.parse(document.getElementById('fb-outlines').textContent); } catch (e) { OUT = {}; } }
  return OUT;
}
// Fit `frame` (lat/lon box) into w × h with padding; aspect corrected by cos(mid-latitude). The view extends beyond the frame.
export function makeProj(frame, w, h, pad = 16, padBottom = pad) {
  const k = Math.cos(((frame.s + frame.n) / 2) * Math.PI / 180);
  const wDeg = (frame.e - frame.w) * k, hDeg = frame.n - frame.s;
  const sc = Math.max(0.0001, Math.min((w - 2 * pad) / wDeg, (h - pad - padBottom) / hDeg));
  const ox = (w - wDeg * sc) / 2, oy = pad + (h - pad - padBottom - hDeg * sc) / 2;
  return {
    k, sc, w, h,
    x: (lon) => ox + (lon - frame.w) * k * sc, y: (lat) => oy + (frame.n - lat) * sc,
    lon: (x) => frame.w + (x - ox) / (k * sc), lat: (y) => frame.n - (y - oy) / sc,
  };
}
// Rings (integer coords × q) to one SVG path / canvas Path2D string in screen space.
export function ringsPath(rings, q, P, minPx = 0) {
  let d = '';
  for (const r of rings) {
    let s = '', lx = null, ly = null, n = 0;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) {
      const x = P.x(r[i] / q), y = P.y(r[i + 1] / q);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (lx != null && Math.abs(x - lx) + Math.abs(y - ly) < 0.6) continue;
      s += (n ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); lx = x; ly = y; n++;
    }
    if (n > 2 && x1 - x0 + (y1 - y0) >= minPx) d += s + 'Z';
  }
  return d;
}
// Which 0.5° tiles of the country grid lie in the country, in another country, or in water (tile centre vs the
// Natural Earth outlines, scanline even-odd fill). Used to say "outside the country data" and to warn when a box
// straddles a border. Tiles with detections always count as in the country (the FIRMS country files decided).
const COVER = {};
export function tileCover(country, C) {
  if (COVER[country]) return COVER[country];
  const o = outlines()[country]; if (!o) return null;
  const fill = (rings) => {
    const grid = new Uint8Array(C.rows * C.cols);
    for (let r = 0; r < C.rows; r++) {
      const lat = (C.i0 + r + 0.5) * 0.5 * o.q, xs = [];
      for (const ring of rings) for (let k = 0, n = ring.length; k < n; k += 2) {
        const k2 = (k + 2) % n, y1 = ring[k + 1], y2 = ring[k2 + 1];
        if ((y1 > lat) !== (y2 > lat)) xs.push(ring[k] + ((lat - y1) * (ring[k2] - ring[k])) / (y2 - y1));
      }
      xs.sort((a, b) => a - b);
      for (let p = 0; p + 1 < xs.length; p += 2) {
        const j0 = Math.ceil(xs[p] / o.q / 0.5 - 0.5), j1 = Math.floor(xs[p + 1] / o.q / 0.5 - 0.5);
        for (let j = Math.max(j0, C.j0); j <= Math.min(j1, C.j0 + C.cols - 1); j++) grid[r * C.cols + (j - C.j0)] = 1;
      }
    }
    return grid;
  };
  COVER[country] = { self: fill(o.self), foreign: fill(o.others) };
  return COVER[country];
}
export function boxCover(country, C, box) {
  const T = tileCover(country, C); if (!T) return null;
  let inside = 0, foreign = 0, n = 0;
  for (let i = Math.round(box.s * 2); i < Math.round(box.n * 2); i++) for (let j = Math.round(box.w * 2); j < Math.round(box.e * 2); j++) {
    n++;
    const r = i - C.i0, c = j - C.j0;
    if (r < 0 || r >= C.rows || c < 0 || c >= C.cols) { foreign++; continue; }
    const k = r * C.cols + c;
    if (T.self[k] || C.tileMap.has(i + ',' + j)) inside++; else if (T.foreign[k]) foreign++;
  }
  return { n, inside, foreign };
}
