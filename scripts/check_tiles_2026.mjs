// Compares a converted 2026 tile file with the 2001–2025 record of the same country: monthly country totals per
// series against the same calendar month in 2021–2025, tile-sum vs totals, provisional list, N20/SNPP by month.
// Usage: node scripts/check_tiles_2026.mjs canada
import fs from 'fs';
const c = process.argv[2];
const T = JSON.parse(fs.readFileSync(`data/2026/${c}.json`, 'utf8'));
const R = JSON.parse(fs.readFileSync(`data/${c}.json`, 'utf8'));
const sumCell = (s) => { if (!s) return 0; let n = 0; for (const p of String(s).split(';')) { const x = p.split(','); if (x.length === 3) n += +x[2]; } return n; };
console.log(c, '| keys', Object.keys(T).join(','), '| through', T.through, '| grid', T.i0, T.j0, T.rows + 'x' + T.cols, '(ref', R.i0, R.j0, R.rows + 'x' + R.cols + ')', '| foreignDropped', T.foreignDropped);
console.log('provisional:', JSON.stringify(T.provisional));
console.log('totals shape:', JSON.stringify(T.totals).slice(0, 200));
const tot = (D, s, k) => { const t = D.totals && D.totals[s]; if (t && !Array.isArray(t) && t[k] != null) return +t[k]; return sumCell(D.series[s] && D.series[s][k]); };
const refIsStr = typeof (R.series.modis['2025-07']) === 'string';
console.log('ref series entry type:', typeof R.series.modis['2025-07'], Array.isArray(R.series.modis) ? '(array)' : '', '| ref totals shape:', JSON.stringify(R.totals).slice(0, 160));
for (const s of ['modis', 'aqua', 'snpp', 'n20']) {
  console.log(`\n${s}:  month | 2026 total (tile sum) | 2021..2025 same month | 2026 ÷ median`);
  for (let m = 1; m <= 11; m++) {
    const k = '2026-' + String(m).padStart(2, '0');
    const v = T.totals && T.totals[s] && T.totals[s][k] != null ? +T.totals[s][k] : null, ts = sumCell(T.series[s][k]);
    const prev = [2021, 2022, 2023, 2024, 2025].map((y) => refIsStr ? sumCell(R.series[s][y + '-' + String(m).padStart(2, '0')]) : null);
    const srt = [...prev].sort((a, b) => a - b), med = srt[2];
    console.log(`  ${k} | ${v} (${ts})${v != null && v !== ts ? ' MISMATCH' : ''} | ${prev.join(' ')} | ${med ? (ts / med).toFixed(2) : '—'}${ts === 0 ? '  <-- ZERO' : ''}`);
  }
}
console.log('\nN20 ÷ SNPP by month 2026:', Array.from({ length: 11 }, (_, i) => { const k = '2026-' + String(i + 1).padStart(2, '0'); const a = sumCell(T.series.n20[k]), b = sumCell(T.series.snpp[k]); return k.slice(5) + ':' + (b ? (a / b).toFixed(2) : 'inf'); }).join('  '));
console.log('VIIRS(snpp) ÷ MODIS by month 2026:', Array.from({ length: 11 }, (_, i) => { const k = '2026-' + String(i + 1).padStart(2, '0'); const a = sumCell(T.series.snpp[k]), b = sumCell(T.series.modis[k]); return k.slice(5) + ':' + (b ? (a / b).toFixed(2) : 'inf'); }).join('  '));
