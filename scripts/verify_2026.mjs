// Step-3 manual controls, scripted: what the built app SHOWS about the record end, the partial year, provisional and
// NOAA-20-rescaled months, the headline figures, and the hotspot export items. Read-only; prints a report.
// Usage: node scripts/verify_2026.mjs [path/to/firebridge.html]
import puppeteer from 'puppeteer-core';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.resolve(process.argv[2] || process.env.FB_HTML || path.join(root, 'dist/firebridge.html'));
const base = pathToFileURL(file).href;
const chrome = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

async function open(hash, w = 1440, h = 900) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  p.on('pageerror', (e) => errors.push(hash + ' :: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(hash + ' :: console: ' + m.text()); });
  await p.goto(base + '#' + hash, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__fb && window.__fb.pending === false && window.__fb.hero !== undefined, { timeout: 30000 }).catch(() => errors.push(hash + ' :: app not ready after 30 s'));
  await sleep(1800);
  return p;
}
const snap = (p) => p.evaluate(() => {
  const f = window.__fb || {};
  const txt = document.body.innerText;
  const uniq = (re) => [...new Set(txt.match(re) || [])];
  return {
    record: document.getElementById('fb-record').textContent,
    meta: (document.getElementById('fb-tabpanel') || {}).dataset ? document.getElementById('fb-tabpanel').dataset.meta : null,
    hero: f.hero, ratio: f.ratio, series: f.series, zone: f.zoneName, uncertain: f.uncertain, guard: f.guard, harmOK: f.harmOK, sel: f.st && f.st.sel, to: f.st && f.st.to,
    rangeButtons: [...document.querySelectorAll('button')].map((x) => x.innerText.trim()).filter((t) => /^2001\s*[–-]/.test(t)),
    partial: uniq(/\d{4}: partial year[^.\n]*/g),
    provisional: uniq(/[^.\n]*[Pp]rovisional[^.\n]*/g).slice(0, 6),
    rescaled: uniq(/[^.\n]*NOAA-20 rescaled[^.\n]*/g).slice(0, 6),
    cells2026: [...document.querySelectorAll('.at-cal-cells [data-key^="2026-"]')].map((c) => c.getAttribute('data-key') + '|' + (c.getAttribute('aria-label') || c.getAttribute('title') || '').slice(0, 160)),
    // DOM order is month by month (the December row comes last): sort the keys to get the last months of the record.
    lastCells: [...document.querySelectorAll('.at-cal-cells [data-key]')].map((c) => c.getAttribute('data-key')).sort().slice(-3),
  };
});

const out = {};
for (const c of ['canada', 'argentina']) {
  for (const v of ['raw', 'harmonized']) {
    const p = await open(`tab=dash&z=${c}&v=${v}&anim=0`);
    const s = await snap(p);
    out[c + '/' + v] = s;
    console.log(`\n== ${c} · ${v}`);
    console.log('  record', s.record, '| meta:', s.meta);
    console.log('  zone', JSON.stringify(s.zone), '| hero', s.hero, '| ratio', s.ratio, '| series', s.series, '| uncertain', s.uncertain, '| guard', s.guard);
    console.log('  range button(s):', JSON.stringify(s.rangeButtons), '| state.to', s.to, '| last calendar cells', s.lastCells.join(' '));
    console.log('  partial-year text:', JSON.stringify(s.partial));
    if (v === 'harmonized') {
      console.log('  2026 cells (' + s.cells2026.length + '):'); for (const x of s.cells2026) console.log('     ', x);
      console.log('  provisional text:', JSON.stringify(s.provisional));
      console.log('  NOAA-20 rescaled text:', JSON.stringify(s.rescaled));
    }
    await p.close();
  }
}

// A chosen 2026 month (the last one of the record), readout and month row wording.
const end = JSON.parse(out['canada/harmonized'].record).end;
if (end > '2025-12') {
  for (const c of ['canada', 'argentina']) {
    for (const m of [end, end.slice(0, 5) + '01']) {
      const p = await open(`tab=dash&z=${c}&m=${m}&anim=0`);
      const s = await snap(p);
      const read = await p.evaluate(() => { const e = document.querySelector('.fb-readout, .fb-calread, [class*="readout"]'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 400) : null; });
      console.log(`\n== ${c} · month ${m}: readout:`, read);
      console.log('  provisional:', JSON.stringify(s.provisional), '| rescaled:', JSON.stringify(s.rescaled));
      await p.close();
    }
  }
}

// Overview tab (bare URL) and the ⋯ menu (hotspot items, data line).
{
  const p = await open('anim=0');
  const o = await p.evaluate(() => ({ h1: [...document.querySelectorAll('h1')].map((x) => x.innerText.trim()), foot: (document.body.innerText.match(/NASA FIRMS MODIS[^\n]*/g) || []).slice(0, 2), top: (document.body.innerText.match(/Canada and Argentina · [^\n]*/g) || []).slice(0, 1) }));
  console.log('\n== Overview (bare URL): h1', JSON.stringify(o.h1), '| top', JSON.stringify(o.top), '| foot', JSON.stringify(o.foot));
  await p.close();
}
{
  const p = await open('tab=dash&z=canada&anim=0');
  const more = await p.$('button[aria-label^="More"]');
  if (more) { await more.click(); await sleep(500); }
  const items = await p.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  const meta = await p.evaluate(() => (document.body.innerText.match(/NASA FIRMS · MODIS \+ VIIRS[^\n]*/g) || []).slice(0, 1));
  const hs = await p.evaluate(() => { const e = document.getElementById('fb-hotspots'), o = e ? JSON.parse(e.textContent) : {}; return Object.keys(o).map((k) => k + ' (' + o[k].length + ' chars, ' + (o[k].trim().split(/\r?\n/).length - 1) + ' rows, header: ' + o[k].slice(0, o[k].indexOf('\n')).trim().slice(0, 120) + ')'); });
  console.log('\n== ⋯ menu: opened', !!more, '| data line', JSON.stringify(meta));
  console.log('  hotspot menu items:', JSON.stringify(items.filter((t) => /hotspot/i.test(t))));
  console.log('  embedded hotspot files:', hs.length ? '' : '(none)'); for (const x of hs) console.log('     ', x);
  await p.close();
}
console.log('\n== page errors:', errors.length); for (const e of errors.slice(0, 10)) console.log('  ', e);
await b.close();
process.exitCode = errors.length ? 1 : 0;
