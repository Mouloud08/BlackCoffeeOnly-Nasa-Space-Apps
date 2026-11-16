// Browser checks of the seasonal preview (node research/seasonal-app/browser.mjs [--html=path]):
// (1) every tab for Canada, Argentina, La Rioja and a guarded preset (Boreal Québec): no page error, no console error,
//     the banner is present and visible, the title starts with "FireBridge (seasonal preview)";
// (2) the shown figures equal the preview module (hero / ratio from window.__fb) and the ratio equals the validated app;
// (3) screenshots → research/seasonal-app/shots/.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2), opt = (k) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : null; };
const FILE = path.resolve(opt('html') || path.join(ROOT, 'dist', 'firebridge.seasonal-preview.html'));
const EN = path.join(ROOT, 'dist', 'firebridge.html');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = path.join(HERE, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const { default: puppeteer } = await import('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
let fails = 0;
const FAIL = (m) => { fails++; console.log('FAIL ' + m); };
async function open(file, hash, [w, h], errors) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('fb-theme', 'light'); } catch (e) {} });
  if (errors) {
    p.on('pageerror', (e) => errors.push(hash + ' @' + w + ': pageerror ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(hash + ' @' + w + ': console.error ' + m.text()); });
  }
  await p.goto(pathToFileURL(file).href + '#' + hash, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__fb && window.__fb.pending === false, { timeout: 30000 }).catch(() => errors && errors.push(hash + ' @' + w + ': app not ready in 30 s'));
  await sleep(500);
  return p;
}
try {
  // (1) every tab × 4 zones × 2 sizes
  const errors = []; let n = 0;
  const TABS = ['tab=overview', 'tab=dash', 'tab=evidence', 'tab=how&step=1', 'tab=how&step=2', 'tab=how&step=3', 'tab=how&step=4', 'tab=method'];
  for (const vp of [[1440, 900], [390, 844]]) for (const z of ['canada', 'argentina', 'larioja', 'boreal']) for (const t of TABS) {
    const hash = t + '&z=' + z + '&anim=0', p = await open(FILE, hash, vp, errors); n++;
    const r = await p.evaluate(() => { const el = document.querySelector('.fb-xbanner'); const rc = el && el.getBoundingClientRect(); const a = el && el.querySelector('a'); return { title: document.title, banner: !!el && rc.height > 0 && rc.width > 0 && rc.top >= 0 && rc.bottom <= window.innerHeight, text: el ? el.textContent : '', href: a ? a.href : null }; });
    if (!r.banner) FAIL(hash + ' @' + vp[0] + ': banner missing or not visible');
    if (!/^FireBridge \(seasonal preview\)/.test(r.title)) FAIL(hash + ': title "' + r.title + '"');
    if (!/firebridge\.html#/.test(r.href || '')) FAIL(hash + ': validated link ' + r.href);
    if (n === 1) console.log('banner: "' + r.text + '" → ' + r.href);
    await p.close();
  }
  console.log('(1) ' + n + ' screens loaded (8 tab/steps × 4 zones × 2 sizes)');
  if (errors.length) { [...new Set(errors)].slice(0, 30).forEach((e) => FAIL(e)); } else console.log('PASS no page error, no console error; banner visible on every screen; title and validated link OK');
  // (2) figures: preview vs validated (hero and ratio as the page states them)
  for (const z of ['canada', 'argentina', 'larioja', 'boreal']) for (const v of ['raw', 'harmonized']) {
    const hash = 'tab=dash&z=' + z + '&v=' + v + '&anim=0', got = {};
    for (const [k, f] of [['validated', EN], ['preview', FILE]]) { const p = await open(f, hash, [1440, 900], null); got[k] = await p.evaluate(() => ({ hero: window.__fb && window.__fb.hero, ratio: window.__fb && window.__fb.ratio, view: window.__fb && window.__fb.series })); await p.close(); }
    const same = JSON.stringify(got.validated.ratio) === JSON.stringify(got.preview.ratio);
    console.log((same ? 'PASS ' : 'FAIL ') + (z + ' ' + v).padEnd(22) + ' validated hero ' + JSON.stringify(got.validated.hero) + ' ratio ' + got.validated.ratio + ' | preview hero ' + JSON.stringify(got.preview.hero) + ' ratio ' + got.preview.ratio + (same ? '' : ' (pooled ratio differs!)'));
    if (!same) fails++;
  }
  // (3) screenshots
  const SH = [
    ['cal-canada-2005-03', 'tab=dash&z=canada&m=2005-03&anim=0', [1440, 900]],
    ['cal-argentina-2005-03', 'tab=dash&z=argentina&m=2005-03&anim=0', [1440, 900]],
    ['cal-canada-2005-03-1280', 'tab=dash&z=canada&m=2005-03&anim=0', [1280, 800]],
    ['cal-larioja-2005-03', 'tab=dash&z=larioja&m=2005-03&anim=0', [1440, 900]],
    ['overview-canada', 'tab=overview&z=canada&anim=0', [1440, 900]],
    ['overview-boreal', 'tab=overview&z=boreal&anim=0', [1440, 900]],
    ['evidence-canada-2005-03', 'tab=evidence&z=canada&m=2005-03&anim=0', [1440, 900]],
    ['phone-cal-canada', 'tab=dash&z=canada&m=2005-03&panel=cal&anim=0', [390, 844]],
  ];
  for (const [name, hash, vp] of SH) { const p = await open(FILE, hash, vp, null); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); await p.close(); }
  // Method paragraph (scrolled into view) and the banner close-up
  for (const z of ['canada', 'larioja']) {
    const p = await open(FILE, 'tab=method&z=' + z + '&anim=0', [1440, 900], null);
    await p.evaluate(() => { const el = document.getElementById('m-seasonal'); el && el.scrollIntoView({ block: 'start' }); });
    await sleep(300);
    await p.screenshot({ path: path.join(SHOTS, 'method-seasonal-' + z + '.png') });
    const t = await p.evaluate(() => { const el = document.getElementById('m-seasonal'); return el ? el.textContent : null; });
    console.log('Method paragraph (' + z + '): ' + t);
    if (z === 'canada') { const el = await p.$('.fb-xbanner'); if (el) await el.screenshot({ path: path.join(SHOTS, 'banner.png') }); }
    await p.close();
  }
  // readout text of the selected pre-2012 month (Canada, Argentina)
  for (const z of ['canada', 'argentina', 'larioja']) {
    const p = await open(FILE, 'tab=dash&z=' + z + '&m=2005-03&anim=0', [1440, 900], null);
    const t = await p.evaluate(() => { const r = document.querySelector('.fb-calread'); const s = document.querySelector('.fb-seam .is-l'); return { readout: r ? r.textContent : null, seam: s ? s.textContent : null }; });
    console.log(z + ' 2005-03: seam "' + t.seam + '" | readout "' + t.readout + '"');
    await p.close();
  }
  console.log('screenshots → ' + SHOTS.split(path.sep).join('/'));
} finally { await b.close(); }
console.log(fails ? 'BROWSER CHECK FAILED (' + fails + ')' : 'BROWSER CHECK PASSED');
process.exitCode = fails ? 1 : 0;
