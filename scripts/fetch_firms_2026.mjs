#!/usr/bin/env node
// Downloads 2026-to-date FIRMS active-fire detections for one bounding box from the FIRMS area API,
// in 5-day windows, into data/raw/2026/ (gitignored). Node 18+, no dependencies.
//
// The MAP_KEY is read ONLY from the environment variable FIRMS_MAP_KEY (or from a local .env file at the repo
// root, which is gitignored). It is never accepted on the command line, never logged, never written to disk:
// every URL printed is masked. Get a key at https://firms.modaps.eosdis.nasa.gov/api/map_key/
//
// Usage:
//   FIRMS_MAP_KEY=... node scripts/fetch_firms_2026.mjs --bbox=-80,47.5,-68,52.5 --name=quebec-boreal
//   node scripts/fetch_firms_2026.mjs --bbox=-68.5,-29.8,-66.5,-28.2 --name=la-rioja --sensors=VIIRS_SNPP,VIIRS_NOAA20,MODIS
// Options:
//   --bbox=west,south,east,north   required, decimal degrees
//   --name=slug                    output sub-folder (default: bbox digits)
//   --sensors=MODIS,VIIRS_SNPP,VIIRS_NOAA20,VIIRS_NOAA21,LANDSAT   (default: MODIS,VIIRS_SNPP,VIIRS_NOAA20)
//   --from=2026-01-01 --to=YYYY-MM-DD (default: today, UTC)
//   --pause=1500                   ms between requests (default 1500; FIRMS limit is 5,000 transactions / 10 min)
//   --dry-run                      print the plan (masked URLs) without calling the API
//
// Standard-quality (SP) data replaces near-real-time (NRT) after about 5 months. For each sensor the script asks
// /api/data_availability/ which dates each source covers and uses SP where available, NRT otherwise.
// Files already on disk are skipped, so an interrupted run can simply be restarted.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HOST = 'https://firms.modaps.eosdis.nasa.gov';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');

// Sensor family -> [standard-quality source, near-real-time source]
const SOURCES = {
  MODIS: ['MODIS_SP', 'MODIS_NRT'],
  VIIRS_SNPP: ['VIIRS_SNPP_SP', 'VIIRS_SNPP_NRT'],
  VIIRS_NOAA20: ['VIIRS_NOAA20_SP', 'VIIRS_NOAA20_NRT'],
  VIIRS_NOAA21: ['VIIRS_NOAA21_SP', 'VIIRS_NOAA21_NRT'],
  LANDSAT: [null, 'LANDSAT_NRT'],
};

// ---------- key handling (never printed) ----------
function loadDotEnv() {
  const f = path.join(repo, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] === 'FIRMS_MAP_KEY' && !process.env.FIRMS_MAP_KEY) process.env.FIRMS_MAP_KEY = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();
const KEY = (process.env.FIRMS_MAP_KEY || '').trim();
const mask = (s) => (KEY ? String(s).split(KEY).join('***') : String(s));
const log = (...a) => console.log(...a.map(mask));
const warn = (...a) => console.error(...a.map(mask));

// ---------- arguments ----------
const args = {};
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
  if (!m) { warn('Unknown argument:', a); process.exit(2); }
  if (/key/i.test(m[1])) { warn('The MAP_KEY is read from FIRMS_MAP_KEY only. Do not pass it as an argument.'); process.exit(2); }
  args[m[1]] = m[2] === undefined ? true : m[2];
}
if (!args.bbox) { warn('Missing --bbox=west,south,east,north'); process.exit(2); }
const bbox = String(args.bbox).split(',').map(Number);
if (bbox.length !== 4 || bbox.some((x) => !Number.isFinite(x)) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]
  || bbox[0] < -180 || bbox[2] > 180 || bbox[1] < -90 || bbox[3] > 90) { warn('Bad --bbox, expected west,south,east,north'); process.exit(2); }
const sensors = String(args.sensors || 'MODIS,VIIRS_SNPP,VIIRS_NOAA20').split(',').map((s) => s.trim().toUpperCase());
for (const s of sensors) if (!SOURCES[s]) { warn('Unknown sensor', s, '- use', Object.keys(SOURCES).join(', ')); process.exit(2); }
const today = new Date().toISOString().slice(0, 10);
const from = String(args.from || '2026-01-01');
const to = String(args.to || today);
const pause = Math.max(500, Number(args.pause || 1500));
const dry = !!args['dry-run'];
const name = String(args.name || bbox.join('_')).replace(/[^a-zA-Z0-9_.-]/g, '-');
const outDir = path.join(repo, 'data', 'raw', '2026', name);
if (!KEY && !dry) { warn('FIRMS_MAP_KEY is not set (environment or .env). Get a key at ' + HOST + '/api/map_key/'); process.exit(2); }

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const day = (s) => new Date(s + 'T00:00:00Z');
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = day(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
let requests = 0;
const windowStart = Date.now();

async function get(url, { tries = 5 } = {}) {
  for (let i = 1; i <= tries; i++) {
    requests++;
    // Stay far below 5,000 transactions / 10 min: hard cap of 400 requests per 10 minutes.
    if (requests % 400 === 0 && Date.now() - windowStart < 600000) { log('Pausing 10 minutes to stay well under the FIRMS rate limit'); await sleep(600000); }
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 90000);
      const res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'firebridge-fetch/0.3 (hackathon prototype)' } });
      clearTimeout(t);
      const body = await res.text();
      if (res.ok && !/^\s*(Invalid|Error|Exceeding)/i.test(body)) return body;
      warn(`  attempt ${i}/${tries}: HTTP ${res.status} ${body.slice(0, 120).replace(/\s+/g, ' ')}`);
      if (/Invalid MAP_KEY/i.test(body)) throw new Error('FIRMS rejected the MAP_KEY');
    } catch (e) {
      if (/rejected the MAP_KEY/.test(e.message)) throw e;
      warn(`  attempt ${i}/${tries}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    }
    await sleep(Math.min(60000, 3000 * 2 ** (i - 1)) + Math.random() * 1000); // the FIRMS site fails often: back off and retry
  }
  throw new Error('giving up after retries: ' + mask(url));
}

// /api/data_availability/csv/KEY/SOURCE -> { min_date, max_date } for that source
async function availability(source) {
  if (!source) return null;
  if (dry) return null;
  const csv = await get(`${HOST}/api/data_availability/csv/${KEY}/${source}`);
  await sleep(pause);
  const [head, ...rows] = csv.trim().split(/\r?\n/);
  const cols = head.split(',');
  const iMin = cols.indexOf('min_date'), iMax = cols.indexOf('max_date'), iId = cols.indexOf('data_id');
  for (const r of rows) {
    const c = r.split(',');
    if (iId < 0 || c[iId] === source) return { min: c[iMin], max: c[iMax] };
  }
  return null;
}

// ---------- main ----------
const windows = [];
for (let d = from; d <= to; d = addDays(d, 5)) {
  const end = addDays(d, 4);
  windows.push({ date: d, range: end <= to ? 5 : (day(to) - day(d)) / 86400000 + 1 });
}
log(`FireBridge FIRMS fetch: bbox ${bbox.join(',')} (${name}), ${from} to ${to}, ${windows.length} windows x ${sensors.length} sensors`);
log(`Output: ${path.relative(repo, outDir)}/  (gitignored)`);
if (!dry) fs.mkdirSync(outDir, { recursive: true });

const plan = [];
for (const s of sensors) {
  const [sp, nrt] = SOURCES[s];
  const spAv = await availability(sp);
  const nrtAv = await availability(nrt);
  log(`${s}: SP ${spAv ? spAv.min + '..' + spAv.max : 'n/a'} | NRT ${nrtAv ? nrtAv.min + '..' + nrtAv.max : 'n/a'}`);
  for (const w of windows) {
    const last = addDays(w.date, w.range - 1);
    // SP only if the whole window is inside its availability, otherwise NRT (which covers the recent months).
    const source = spAv && w.date >= spAv.min && last <= spAv.max ? sp : nrt;
    if (nrtAv && source === nrt && last < nrtAv.min && !(spAv && w.date >= spAv.min)) { log(`  ${w.date}: not covered by ${s} SP or NRT, skipped`); continue; }
    plan.push({ sensor: s, source, ...w });
  }
}

let done = 0, skipped = 0, rows = 0;
const manifest = [];
for (const p of plan) {
  const file = path.join(outDir, `${p.source}_${p.date}_${p.range}d.csv`);
  const url = `${HOST}/api/area/csv/${KEY}/${p.source}/${bbox.join(',')}/${p.range}/${p.date}`;
  if (dry) { log('[dry-run]', url); continue; }
  if (fs.existsSync(file) && fs.statSync(file).size > 0) { skipped++; continue; }
  const csv = await get(url);
  const n = Math.max(0, csv.trim().split(/\r?\n/).length - 1);
  fs.writeFileSync(file + '.part', csv);
  fs.renameSync(file + '.part', file);
  rows += n; done++;
  manifest.push({ source: p.source, date: p.date, days: p.range, rows: n, file: path.basename(file) });
  log(`  ${p.source} ${p.date} +${p.range}d: ${n} rows  (${done + skipped}/${plan.length})`);
  await sleep(pause);
}
if (!dry) {
  // The manifest never contains the key or any URL.
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ bbox, name, from, to, sensors, fetchedAt: new Date().toISOString(), files: manifest }, null, 1));
  log(`Done: ${done} downloaded, ${skipped} already present, ${rows} detections, ${requests} API transactions.`);
  log('Note: read acq_time as a string (HHMM with leading zeros). MODIS confidence is 0-100, VIIRS is l/n/h.');
}
