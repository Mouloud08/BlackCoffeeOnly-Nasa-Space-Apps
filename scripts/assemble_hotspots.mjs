// Assembles ONE hotspot CSV for an event from the raw FIRMS area-API files of a fetch folder.
// Values are copied unchanged. MODIS and VIIRS files name two columns differently (brightness/bright_t31 vs
// bright_ti4/bright_ti5), so the header is the union of the original FIRMS column names; a column a sensor does not
// have is left empty. Rows are sorted by date, time, instrument, satellite (stable: equal keys keep file order).
// FIRMS area-API CSVs are unquoted; a row whose field count differs from its header stops the script (never dropped).
// Usage (from the repo root; writes data/hotspots/<name>.csv under the current folder):
//   node scripts/assemble_hotspots.mjs <raw folder> <from YYYY-MM-DD> <to YYYY-MM-DD> <output name>
import fs from 'fs';
import path from 'path';
const [dir, from, to, name] = process.argv.slice(2);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
if (!dir || !DAY.test(from || '') || !DAY.test(to || '') || from > to || !name) { console.error('Usage: node scripts/assemble_hotspots.mjs <raw folder> <from YYYY-MM-DD> <to YYYY-MM-DD> <output name>'); process.exit(2); }
const HEAD = ['latitude', 'longitude', 'brightness', 'bright_ti4', 'scan', 'track', 'acq_date', 'acq_time', 'satellite', 'instrument', 'confidence', 'version', 'bright_t31', 'bright_ti5', 'frp', 'daynight', 'type'];
const rows = [], per = {}, unknown = new Set(), bad = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.csv')).sort()) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '').trim();
  if (!text) { console.log('empty file (no header), skipped:', f); continue; }
  const lines = text.split(/\r?\n/);
  const h = lines[0].split(',');
  for (const c of h) if (!HEAD.includes(c)) unknown.add(c);
  const ix = HEAD.map((c) => h.indexOf(c)), iD = h.indexOf('acq_date');
  if (iD < 0) { console.error('No acq_date column in', f, '- stopping.'); process.exit(1); }
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const c = lines[i].split(',');
    if (c.length !== h.length) { bad.push(f + ' line ' + (i + 1) + ' (' + c.length + ' fields, header ' + h.length + ')'); continue; }
    if (c[iD] < from || c[iD] > to) continue;
    rows.push(ix.map((j) => (j < 0 ? '' : c[j])));
    const k = f.replace(/_\d{4}-\d{2}-\d{2}_\d+d\.csv$/, ''); per[k] = (per[k] || 0) + 1;
  }
}
if (unknown.size) { console.error('Unknown columns, stopping:', [...unknown]); process.exit(1); }
if (bad.length) { console.error('Rows whose field count differs from the header (quoted values?), stopping:', bad.length, bad.slice(0, 5)); process.exit(1); }
if (!rows.length) { console.error('No rows between', from, 'and', to, 'in', dir, '- nothing written.'); process.exit(1); }
const D = HEAD.indexOf('acq_date'), T = HEAD.indexOf('acq_time'), I = HEAD.indexOf('instrument'), S = HEAD.indexOf('satellite');
const key = (r) => r[D] + r[T].padStart(4, '0') + r[I] + r[S];
rows.sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : 0; });
const out = path.join('data', 'hotspots', name + '.csv');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, HEAD.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n') + '\n');
console.log(out, '|', rows.length, 'rows |', (fs.statSync(out).size / 1e6).toFixed(2), 'MB | by source', JSON.stringify(per), '| dates', rows[0][D], '..', rows[rows.length - 1][D]);
