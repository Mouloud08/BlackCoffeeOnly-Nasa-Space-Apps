// Tile loading shared by build.mjs and the node checks: the 2001–2025 country tiles, plus data/2026/<country>.json
// when present (written by tools/build_2026_tiles.mjs). The record ends at the last COMPLETE month common to both
// countries (a country without a 2026 file keeps the record at 2025-12, so no month is ever shown as a false zero).
import fs from 'fs';
export const BASE_END = '2025-12';
const SERIES = ['modis', 'aqua', 'snpp', 'n20'];
const prevMonth = (k) => { let y = +k.slice(0, 4), m = +k.slice(5, 7) - 1; if (m < 1) { m = 12; y--; } return y + '-' + String(m).padStart(2, '0'); };
const lastDay = (k) => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate();
// Last complete month of a 2026 tile file: the month of `through` if `through` is that month's last day, else the month before.
export function completeThrough(T) {
  let through = T.through;
  if (!through) { // older files: the latest month with any detection, assumed complete
    const ks = SERIES.flatMap((s) => Object.keys((T.totals || {})[s] || {})).sort();
    return ks.length ? ks[ks.length - 1] : BASE_END;
  }
  const k = through.slice(0, 7);
  return +through.slice(8, 10) === lastDay(k) ? k : prevMonth(k);
}
export function loadTiles(here) {
  const out = {}, ends = [];
  for (const c of ['canada', 'argentina']) {
    const D = JSON.parse(fs.readFileSync(here + 'data/' + c + '.json', 'utf8'));
    D.provisional = [];
    const f = here + 'data/2026/' + c + '.json';
    let end = BASE_END;
    if (fs.existsSync(f)) {
      const T = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (T.i0 !== D.i0 || T.j0 !== D.j0) throw new Error(f + ': tile origin differs from data/' + c + '.json');
      end = completeThrough(T);
      if (end < BASE_END) end = BASE_END;
      for (const s of SERIES) {
        D.series[s] = D.series[s] || {}; D.totals[s] = D.totals[s] || {};
        for (const k in (T.series[s] || {})) if (k > BASE_END && k <= end) D.series[s][k] = T.series[s][k];
        for (const k in (T.totals[s] || {})) if (k > BASE_END && k <= end) D.totals[s][k] = T.totals[s][k];
      }
      D.provisional = (T.provisional || []).filter((p) => p.slice(-7) <= end);
      D.through = T.through || null;
    }
    out[c] = D; ends.push(end);
  }
  const end = ends.sort()[0];
  // Trim to the common end.
  for (const c in out) {
    const D = out[c];
    for (const s of SERIES) { for (const k in (D.series[s] || {})) if (k > end) delete D.series[s][k]; for (const k in (D.totals[s] || {})) if (k > end) delete D.totals[s][k]; }
    D.provisional = D.provisional.filter((p) => p.slice(-7) <= end);
  }
  return { tiles: out, end };
}
