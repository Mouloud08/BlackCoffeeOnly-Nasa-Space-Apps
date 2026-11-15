// Unit test for build_2026_tiles on a synthetic CSV built from known cells.
import { tilesFromFiles, foreignMask, CELL_LAT, CELL_LON } from './build_2026_tiles.mjs';
const ref = { country: 'Canada', i0: 83, j0: -283, rows: 83, cols: 178, bbox: {} };
const cellCentre = (ci, cj) => [((ci + 0.5) * CELL_LAT).toFixed(5), ((cj + 0.5) * CELL_LON).toFixed(5)];
const A = cellCentre(5555, -5300), B = cellCentre(5554, -5300); // two adjacent ~1 km cells, same 0.5° tile
const modis = 'latitude,longitude,acq_date,satellite,type\n' +
  [A, A, B].map((c, k) => c[0] + ',' + c[1] + ',2026-01-0' + (k === 1 ? 1 : 1) + ',Aqua,0').join('\n') + '\n' + A[0] + ',' + A[1] + ',2026-01-02,Terra,0\n' + A[0] + ',' + A[1] + ',2026-01-03,Terra,2\n';
const snppNrt = 'latitude,longitude,acq_date,satellite\n' + A[0] + ',' + A[1] + ',2026-02-01,N\n' + B[0] + ',' + B[1] + ',2026-02-01,N\n';
const out = tilesFromFiles([{ source: 'MODIS_SP', text: modis }, { source: 'VIIRS_SNPP_NRT', text: snppNrt }], ref);
const ti = Math.floor(((5555 + 0.5) * CELL_LAT) / 0.5) - ref.i0, tj = Math.floor(((-5300 + 0.5) * CELL_LON) / 0.5) - ref.j0;
const ok = [
  ['modis Jan cell-days = 3 (A twice same day counted once, B, A next day; type 2 dropped)', out.totals.modis['2026-01'] === 3],
  ['aqua Jan cell-days = 2', out.totals.aqua['2026-01'] === 2],
  ['tile key', out.series.modis['2026-01'] === ti + ',' + tj + ',3'],
  ['snpp Feb = 2', out.totals.snpp['2026-02'] === 2],
  ['NRT month flagged provisional', out.provisional.includes('snpp:2026-02') && !out.provisional.includes('modis:2026-01')],
];
const ca = await foreignMask('canada'), ar = await foreignMask('argentina');
ok.push(['mask: Minneapolis (US) foreign for Canada', ca(44.98, -93.27) === true]);
ok.push(['mask: Fort McMurray kept for Canada', ca(56.73, -111.38) === false]);
ok.push(['mask: Hudson Bay (water) kept for Canada', ca(60, -86) === false]);
ok.push(['mask: Santiago (Chile) foreign for Argentina', ar(-33.45, -70.67) === true]);
ok.push(['mask: Asunción (Paraguay) foreign for Argentina', ar(-25.28, -57.63) === true]);
ok.push(['mask: Chilecito kept for Argentina', ar(-29.16, -67.5) === false]);
const us = 'latitude,longitude,acq_date,satellite,type\n44.98,-93.27,2026-03-01,Aqua,0\n' + A[0] + ',' + A[1] + ',2026-03-01,Aqua,0\n';
const o2 = tilesFromFiles([{ source: 'MODIS_SP', text: us }], ref, ca);
ok.push(['mask applied: US point dropped, Canadian point kept', o2.totals.modis['2026-03'] === 1 && o2.foreignDropped === 1]);
ok.forEach(([k, v]) => console.log(v ? 'PASS' : 'FAIL', k));
if (ok.some(([, v]) => !v)) { console.log(JSON.stringify(out)); process.exit(1); }
