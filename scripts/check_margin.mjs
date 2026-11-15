// Checks the calendar's "typical month" margin: it must sit to the right of the last year's column, never overlap
// the grid and line up with the month rows, at wide sizes, both themes, for the full record, for date ranges ending
// mid-year and for a range inside the last (possibly partial) year, loaded directly or reached by changing the range.
// Also checks that the seam and the Terra note are only drawn when their years are in range (no stale overlay).
// Usage: node scripts/check_margin.mjs [file.html] [shot-prefix]   (default: dist/firebridge.html)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.resolve(process.argv[2] || path.join(root, 'dist', 'firebridge.html')), tag = process.argv[3] || 'fix';
const rec = fs.readFileSync(file, 'utf8').match(/id="fb-record">([^<]*)</);
if (!rec) { console.error('FAIL: no fb-record in', file); process.exit(1); }
const EY = JSON.parse(rec[1]).end.slice(0, 4); // last year of the record (partial when the record ends before December)
const shots = path.join(root, 'shots', 'verify-2026'); fs.mkdirSync(shots, { recursive: true });
const chrome = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ready = (p) => p.waitForFunction(() => window.__fb && window.__fb.pending === false, { timeout: 30000 }).catch(() => {});
let fail = 0, shown = 0;
const sizes = [[1280, 800], [1440, 900], [1680, 1050], [1920, 1080], [2560, 1300], [1100, 900], [900, 1100]];
// [hash, label, hash to switch to after the first load (optional)]
const cases = [['z=canada', 'full record'], ['z=argentina', 'full record'], ['z=canada&t=2020-06', 'range to Jun 2020'], ['z=canada&f=2012-01&t=2026-03', 'range 2012 – Mar 2026'], ['z=canada&t=2025-12', 'range to Dec 2025'], ['z=canada&panel=cal', 'calendar panel'],
  ['z=canada&f=' + EY + '-01', 'range ' + EY + ' only'], ['z=canada', 'switch to Mar ' + EY + ' – end', 'z=canada&f=' + EY + '-03']];
for (const theme of ['light', 'dark']) for (const [w, h] of sizes) for (const [hash, label, then] of cases) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument((t) => { try { localStorage.setItem('fb-theme', t); } catch (e) {} }, theme);
  await p.goto(pathToFileURL(file).href + '#tab=dash&' + hash + '&anim=0', { waitUntil: 'load' });
  await ready(p);
  await sleep(1500);
  if (then) { await p.evaluate((x) => { location.hash = x; }, '#tab=dash&' + then + '&anim=0'); await ready(p); await sleep(1500); }
  const r = await p.evaluate(() => {
    const m = document.querySelector('.fb-margin'); const cells = [...document.querySelectorAll('.fb-calpanel .at-cal-cells [data-key]')];
    if (!cells.length) return { none: true };
    const keys = new Set(cells.map((c) => c.getAttribute('data-key')));
    const note = document.querySelector('.fb-terranote');
    const o = { seamOk: !document.querySelector('.fb-seam') || (keys.has('2011-12') && keys.has('2012-01')), noteOk: !note || note.style.visibility === 'hidden' || keys.has('2001-01') };
    const gridR = Math.max(...cells.map((c) => c.getBoundingClientRect().right)), gridL = Math.min(...cells.map((c) => c.getBoundingClientRect().left));
    if (!m) return { ...o, margin: false, gridL: Math.round(gridL), gridR: Math.round(gridR) };
    const rowTops = [...document.querySelectorAll('.fb-calpanel .at-cal-cells')].map((e) => e.firstElementChild.getBoundingClientRect().top);
    const all = [...m.querySelectorAll('i')].map((e) => e.getBoundingClientRect()), bars = all.filter((x) => x.width > 0);
    const panel = document.querySelector('.fb-calpanel').getBoundingClientRect();
    return { ...o, margin: true, gridL: Math.round(gridL), gridR: Math.round(gridR), marginL: Math.round(m.getBoundingClientRect().left), barL: bars.length ? Math.round(Math.min(...bars.map((x) => x.left))) : null, barR: bars.length ? Math.round(Math.max(...bars.map((x) => x.right))) : null, panelR: Math.round(panel.right), label: Math.round(m.querySelector('.fb-margin-t').getBoundingClientRect().left), aligned: all.length === 12 && rowTops.length === 12 && all.every((x, i) => Math.abs(x.top - rowTops[i]) <= 2) };
  });
  let ok = true, why = '';
  if (r.none) { ok = false; why = 'no calendar cells (page not ready?)'; }
  else if (!r.seamOk) { ok = false; why = 'seam drawn without 2011/2012 in range (stale overlay)'; }
  else if (!r.noteOk) { ok = false; why = 'Terra note drawn without 2001 in range (stale overlay)'; }
  if (r.margin) {
    shown++;
    if (r.marginL < r.gridR) { ok = false; why = 'margin starts inside the grid'; } else if (r.barL == null) { ok = false; why = 'margin without bars'; } else if (r.barL < r.gridR) { ok = false; why = 'bars start inside the grid'; } else if (r.label < r.gridR) { ok = false; why = 'label over the grid'; } else if (r.barR > r.panelR + 1) { ok = false; why = 'bars leave the panel'; } else if (!r.aligned) { ok = false; why = 'bars not aligned with the month rows'; }
  }
  if (!ok) fail++;
  if (!ok || (r.margin && w === 1920 && theme === 'light')) await p.screenshot({ path: path.join(shots, `margin-${tag}-${theme}-${w}-${label.replace(/[^a-z0-9]+/gi, '_')}.png`) });
  if (!ok || r.margin) console.log(ok ? 'PASS' : 'FAIL', theme, w + 'x' + h, label, JSON.stringify(r), why);
  await p.close();
}
if (!shown) { fail++; console.log('FAIL the margin was never shown: nothing was checked'); }
console.log(`margin shown in ${shown} cases; failures: ${fail}`);
await b.close();
process.exit(fail ? 1 : 0);
