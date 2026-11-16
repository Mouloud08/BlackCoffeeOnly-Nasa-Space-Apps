// Clicks every embedded FIRMS hotspot item ("La Rioja · Aug 2024" in the "Real FIRMS hotspots" group) of EVERY menu
// that offers it, lets the browser download the file, and compares it byte for byte with data/hotspots/<name>.csv.
// Every file in data/hotspots must be offered by the build. Menus checked (exports live in exactly one place):
//   - Desktop width (1440 px): the Download button is shown on EVERY tab and offers the exports (checked on the
//     Calendar and Evidence tabs); the ⋯ menu has NO export item on any of the five tabs.
//   - Calendar tab at 390 px (phone): no Download button; the ⋯ menu offers them.
// The item title is derived from the file name ("la-rioja-2024-08" → "La Rioja · Aug 2024"; an unknown name is shown
// as is); its detail line gives the number of data rows and the size, both checked against the file on disk. Also
// downloads the Series CSV for both countries (kept for inspection). Exit 1 on any failure.
// Usage: node scripts/check_hotspot_download.mjs [path/to/firebridge.html]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.resolve(process.argv[2] || path.join(root, 'dist/firebridge.html'));
const dl = path.join(root, '.scratch', 'dl-verify');
fs.rmSync(dl, { recursive: true, force: true }); fs.mkdirSync(dl, { recursive: true });
const hsDir = path.join(root, 'data', 'hotspots');
const onDisk = fs.existsSync(hsDir) ? fs.readdirSync(hsDir).filter((f) => f.endsWith('.csv')).map((f) => f.replace(/\.csv$/, '')) : [];
// The same rule as hotName(n, ' · ') in src/App.jsx.
const PLACE = { 'la-rioja': 'La Rioja', 'quebec-boreal': 'Boreal Québec' };
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = (n) => { const m = /^(.+)-(\d{4})-(\d{2})$/.exec(n); const mo = m ? +m[3] : 0; return m && PLACE[m[1]] && mo >= 1 && mo <= 12 ? PLACE[m[1]] + ' · ' + MON3[mo - 1] + ' ' + m[2] : n; };
// The detail line expected from the file on disk: data rows (lines after the header) and size in MB (10^6 bytes).
const facts = (n) => {
  const buf = fs.readFileSync(path.join(hsDir, n + '.csv')), s = buf.toString('utf8');
  const lines = s.split('\n').length - (s.endsWith('\n') ? 1 : 0), rows = Math.max(0, lines - 1), bytes = buf.length;
  return rows.toLocaleString('en-US') + ' points · ' + (bytes >= 1e5 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1e3)) + ' kB');
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chrome = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A download is done when the file exists and Chrome has no partial (.crdownload) file left.
const waitFile = async (f, ms = 20000) => { for (let t = 0; t < ms; t += 250) { if (fs.existsSync(f) && !fs.readdirSync(dl).some((x) => x.endsWith('.crdownload'))) return true; await sleep(250); } return false; };
const DL = 'button[aria-controls="fb-dl"]', MORE = 'button[aria-controls="fb-more"]';
// Where each menu offers the exports: [name, hash, width, height, trigger, panel id].
const OFFERS = [
  ['Download menu (Calendar tab, 1440)', 'tab=dash', 1440, 900, DL, 'fb-dl'],
  ['Download menu (Evidence tab, 1440)', 'tab=evidence', 1440, 900, DL, 'fb-dl'],
  ['⋯ menu (Calendar tab, phone 390)', 'tab=dash', 390, 844, MORE, 'fb-more'],
];
let fail = 0;
const check = (ok, what, extra = '') => { if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', what, extra); };
const open = async (hash, w, h) => {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  const cdp = await p.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await p.goto(pathToFileURL(file).href + '#' + hash + '&anim=0', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__fb && window.__fb.pending === false, { timeout: 30000 }).catch(() => {});
  await sleep(1000);
  return p;
};
// Open a menu and list its items: title (first line), detail line, format badge, group label.
const items = async (p, trigger, id) => {
  if (!(await p.$(trigger))) return null;
  await p.click(trigger); await sleep(300);
  const r = await p.evaluate((id) => [...document.querySelectorAll('#' + id + ' [role="menuitem"]')].map((e) => ({ title: (e.querySelector('b') || e).textContent || '', sub: (e.querySelector(':scope > span') || {}).textContent || '', fmt: (e.querySelector('.fb-pop-fmt') || {}).textContent || '', group: (e.closest('[role="group"]') || { getAttribute: () => '' }).getAttribute('aria-label') })), id);
  return r;
};
const clickItem = async (p, trigger, id, title) => {
  if (!(await p.$(trigger))) return false;
  await p.click(trigger); await sleep(300);
  const ok = await p.evaluate((id, title) => { const x = [...document.querySelectorAll('#' + id + ' [role="menuitem"]')].find((e) => e.querySelector('b') && e.querySelector('b').textContent === title); if (!x) return false; x.click(); return true; }, id, title);
  if (!ok) await p.keyboard.press('Escape');
  await sleep(500);
  return ok;
};

// 1. Every tab at 1440: the Download button is shown, so the ⋯ menu carries no export item.
for (const tab of ['overview', 'dash', 'evidence', 'how', 'method']) {
  const p = await open('tab=' + tab + '&z=canada', 1440, 900);
  const names = await p.evaluate(() => { const e = document.getElementById('fb-hotspots'); return e ? Object.keys(JSON.parse(e.textContent)) : null; });
  if (tab === 'overview') {
    if (!names) check(false, 'no fb-hotspots element in the build');
    for (const n of onDisk) if (!names || !names.includes(n)) check(false, 'data/hotspots/' + n + '.csv is embedded in the build');
    if (!onDisk.length) console.log('NOTE no data/hotspots/*.csv: nothing to compare');
  }
  check(!!(await p.$(DL)), 'Download button visible on the ' + tab + ' tab at 1440');
  const more = await items(p, MORE, 'fb-more'); await p.keyboard.press('Escape'); await sleep(200);
  const exportish = (more || []).filter((i) => (i.group && i.group !== 'Language') || i.fmt || /Series|Calendar image|Map layer|Map image|Another area|points ·/.test(i.title + ' ' + i.sub));
  check(more && more.length > 0 && exportish.length === 0, '⋯ menu has NO export item on the ' + tab + ' tab at 1440 (Download button shown)', more ? '(items: ' + more.map((i) => i.title).join(' / ') + ')' : '(⋯ menu not found)');
  await p.close();
}

// 2. Every menu that offers the exports: groups, labels, detail lines, hotspot bytes.
for (const [mname, hash, w, h, trig, id] of OFFERS) {
  const p = await open(hash + '&z=canada', w, h);
  if (trig === MORE) check(!(await p.$(DL)), mname, 'no Download button there (the ⋯ menu carries the exports)');
  const list = await items(p, trig, id); await p.keyboard.press('Escape'); await sleep(200);
  if (!list) { check(false, mname, '(menu button not found)'); await p.close(); continue; }
  const zone = list.filter((i) => i.group === 'This zone').map((i) => i.title + ' ' + i.fmt);
  check(['Series CSV', 'Calendar image SVG', 'Calendar image PNG', 'Map layer CSV'].every((t) => zone.includes(t)), mname, 'group "This zone": ' + zone.join(' / '));
  const real = list.filter((i) => i.group === 'Real FIRMS hotspots');
  check(real.some((i) => i.title === 'Another area or period…' && i.sub === 'How to request the points from FIRMS'), mname, 'request item "Another area or period…" in "Real FIRMS hotspots"');
  check(!list.some((i) => /^Raw hotspots|^FIRMS hotspots \(CSV\)|^Hotspots for this box/.test(i.title)), mname, 'no old label left');
  for (const n of onDisk) {
    const it = real.find((i) => i.title === label(n)), want = facts(n);
    check(!!it && it.sub === want && it.fmt === 'CSV', mname, 'item "' + label(n) + '" with "' + want + '"', it ? '(shown: "' + it.sub + '")' : '(not found)');
    const got = path.join(dl, 'firebridge_hotspots_' + n + '.csv'), src = path.join(hsDir, n + '.csv');
    fs.rmSync(got, { force: true }); // each menu must produce the file itself
    const ok = await clickItem(p, trig, id, label(n));
    const same = ok && (await waitFile(got)) && fs.existsSync(src) && Buffer.compare(fs.readFileSync(got), fs.readFileSync(src)) === 0;
    check(same, mname, 'hotspot download "' + label(n) + '" ' + n, !ok ? '(menu item not found)' : fs.existsSync(got) ? fs.statSync(got).size + ' bytes, identical to the source: ' + same : '(no file)');
  }
  await p.close();
}

// 3. Series CSV for both countries (Download menu on the Calendar tab).
for (const c of ['canada', 'argentina']) {
  const p = await open('tab=dash&z=' + c, 1440, 900);
  const before = new Set(fs.readdirSync(dl));
  const ok = await clickItem(p, DL, 'fb-dl', 'Series');
  let got = false;
  for (let t = 0; ok && !got && t < 20000; t += 250) { got = fs.readdirSync(dl).some((x) => !before.has(x) && x.endsWith('.csv')); if (!got) await sleep(250); }
  check(got, 'series CSV downloaded for ' + c, ok ? '' : '(menu item not found)');
  await p.close();
}
console.log('downloaded:', fs.readdirSync(dl).join(', '));
await b.close();
process.exit(fail ? 1 : 0);
