// Checks a raw 2026 fetch folder: per sensor family, which days have detections, days outside their file's window,
// rows per month, duplicate rows across files, bad/non-CSV files. Read-only. Exit 1 when a file or line is bad.
// Usage: node scripts/check_raw_2026.mjs data/raw/2026/canada
import fs from 'fs';
import path from 'path';
const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('Usage: node scripts/check_raw_2026.mjs <raw folder>'); process.exit(2); }
const fam = (src) => src.replace(/_(SP|NRT)$/, '');
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const F = {}; // family -> { days: Map(date -> {SP, NRT}), months, dup, seen }
const bad = [], outside = [], empties = [];
let man = null;
try { man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); } catch (e) {}
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.csv')).sort()) {
  const m = f.match(/^(.*)_(\d{4}-\d{2}-\d{2})_(\d+)d\.csv$/);
  if (!m) { bad.push(f + ' (name)'); continue; }
  const [, src, d0, n] = m, kind = src.endsWith('_SP') ? 'SP' : 'NRT', d1 = addDays(d0, +n - 1);
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',');
  const iD = head.indexOf('acq_date'), iLat = head.indexOf('latitude'), iLon = head.indexOf('longitude'), iT = head.indexOf('acq_time'), iS = head.indexOf('satellite'), iC = head.indexOf('confidence'), iTy = head.indexOf('type'), iDN = head.indexOf('daynight');
  if (iD < 0 || iLat < 0) { bad.push(f + ' (header: ' + lines[0].slice(0, 80) + ')'); continue; }
  if (lines.length === 1) empties.push(f);
  const o = (F[fam(src)] ||= { days: new Map(), months: {}, dup: 0, seen: new Set(), sats: {}, conf: {}, types: {}, dn: {}, rows: 0, lat: [90, -90], lon: [180, -180] });
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    if (c.length !== head.length) { bad.push(f + ' line ' + (i + 1) + ' (' + c.length + ' fields)'); continue; }
    const d = c[iD];
    if (d < d0 || d > d1) outside.push(f + ' has ' + d);
    const key = c[iLat] + ',' + c[iLon] + ',' + d + ',' + c[iT] + ',' + c[iS];
    if (o.seen.has(key)) o.dup++; else o.seen.add(key);
    const e = o.days.get(d) || { SP: 0, NRT: 0 }; e[kind]++; o.days.set(d, e);
    const mo = d.slice(0, 7); (o.months[mo] ||= { SP: 0, NRT: 0 })[kind]++;
    o.sats[c[iS]] = (o.sats[c[iS]] || 0) + 1;
    const cf = /^\d+$/.test(c[iC]) ? (+c[iC] < 30 ? '<30' : +c[iC] < 80 ? '30-79' : '>=80') : c[iC]; o.conf[cf] = (o.conf[cf] || 0) + 1;
    if (iTy >= 0) o.types[c[iTy]] = (o.types[c[iTy]] || 0) + 1;
    o.dn[c[iDN]] = (o.dn[c[iDN]] || 0) + 1;
    o.rows++;
    const la = +c[iLat], lo = +c[iLon]; if (la < o.lat[0]) o.lat[0] = la; if (la > o.lat[1]) o.lat[1] = la; if (lo < o.lon[0]) o.lon[0] = lo; if (lo > o.lon[1]) o.lon[1] = lo;
  }
}
console.log('folder', dir, '| manifest:', man ? `from ${man.from} to ${man.to}, bbox ${man.bbox}, ${man.files.length} files listed, fetched ${man.fetchedAt}` : 'none');
console.log('bad files/lines:', bad.length, bad.slice(0, 8)); console.log('rows outside their file window:', outside.length, [...new Set(outside)].slice(0, 8)); console.log('header-only files:', empties.length, empties.slice(0, 12).join(' '));
const from = man ? man.from : '2026-01-01', to = man ? man.to : '2026-11-15';
for (const [k, o] of Object.entries(F)) {
  console.log(`\n== ${k}: ${o.rows} rows, duplicates across/within files ${o.dup}, lat ${o.lat.join('..')}, lon ${o.lon.join('..')}`);
  console.log('  satellites', JSON.stringify(o.sats), '| confidence', JSON.stringify(o.conf), '| type', JSON.stringify(o.types), '| daynight', JSON.stringify(o.dn));
  console.log('  rows per month (SP/NRT):', Object.keys(o.months).sort().map((m) => m.slice(5) + ':' + o.months[m].SP + '/' + o.months[m].NRT).join('  '));
  const miss = []; for (let d = from; d <= to; d = addDays(d, 1)) if (!o.days.has(d)) miss.push(d);
  // group missing days into runs
  const runs = []; for (const d of miss) { const r = runs[runs.length - 1]; if (r && addDays(r[1], 1) === d) r[1] = d; else runs.push([d, d]); }
  console.log('  days with NO detection (' + miss.length + '):', runs.map((r) => r[0] === r[1] ? r[0].slice(5) : r[0].slice(5) + '..' + r[1].slice(5)).join(', '));
  const both = [...o.days].filter(([, e]) => e.SP && e.NRT).map(([d]) => d).sort();
  console.log('  days present in BOTH SP and NRT files:', both.length, both.slice(0, 10).join(' '));
  for (const d of ['2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']) { const e = o.days.get(d); process.stdout.write('  ' + d.slice(5) + ' ' + (e ? e.SP + '/' + e.NRT : '—')); }
  console.log();
}
if (!Object.keys(F).length) console.log('\nno readable CSV file in', dir);
process.exitCode = bad.length || !Object.keys(F).length ? 1 : 0;
