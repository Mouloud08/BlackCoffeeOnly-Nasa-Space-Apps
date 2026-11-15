// Clicks every "Raw hotspots (CSV) — <name>" item of the ⋯ menu, lets the browser download the file, and compares it
// byte for byte with data/hotspots/<name>.csv. Every file in data/hotspots must be offered by the build. Also downloads
// the Series CSV for both countries (kept for inspection). Exit 1 on any failure.
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
const chrome = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A download is done when the file exists and Chrome has no partial (.crdownload) file left.
const waitFile = async (f, ms = 20000) => { for (let t = 0; t < ms; t += 250) { if (fs.existsSync(f) && !fs.readdirSync(dl).some((x) => x.endsWith('.crdownload'))) return true; await sleep(250); } return false; };
let fail = 0;
for (const c of ['canada', 'argentina']) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const cdp = await p.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await p.goto(pathToFileURL(file).href + `#tab=dash&z=${c}&anim=0`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__fb && window.__fb.pending === false, { timeout: 30000 }).catch(() => {});
  await sleep(1000);
  const click = async (re) => {
    await p.click('button[aria-label^="More"]'); await sleep(300);
    const ok = await p.evaluate((src) => { const r = new RegExp(src); const x = [...document.querySelectorAll('[role="menuitem"]')].find((e) => r.test(e.innerText)); if (!x) return false; x.click(); return true; }, re);
    await sleep(500);
    return ok;
  };
  if (c === 'canada') {
    const names = await p.evaluate(() => { const e = document.getElementById('fb-hotspots'); return e ? Object.keys(JSON.parse(e.textContent)) : null; });
    if (!names) { fail++; console.log('FAIL no fb-hotspots element in the build'); }
    for (const n of onDisk) if (!names || !names.includes(n)) { fail++; console.log('FAIL', 'data/hotspots/' + n + '.csv is not embedded in the build'); }
    if (!onDisk.length) console.log('NOTE no data/hotspots/*.csv: nothing to compare');
    for (const n of names || []) {
      const ok = await click('Raw hotspots \\(CSV\\) — ' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const got = path.join(dl, 'firebridge_hotspots_' + n + '.csv'), src = path.join(hsDir, n + '.csv');
      const same = ok && (await waitFile(got)) && fs.existsSync(src) && Buffer.compare(fs.readFileSync(got), fs.readFileSync(src)) === 0;
      if (!same) fail++;
      console.log((same ? 'PASS' : 'FAIL'), 'hotspot download', n, !ok ? '(menu item not found)' : fs.existsSync(got) ? fs.statSync(got).size + ' bytes, identical to the source: ' + same : '(no file)');
    }
  }
  const before = new Set(fs.readdirSync(dl));
  const ok = await click('Series CSV');
  let got = false;
  for (let t = 0; ok && !got && t < 20000; t += 250) { got = fs.readdirSync(dl).some((x) => !before.has(x) && x.endsWith('.csv')); if (!got) await sleep(250); }
  if (!got) fail++;
  console.log(got ? 'PASS' : 'FAIL', 'series CSV downloaded for', c, ok ? '' : '(menu item not found)');
  await p.close();
}
console.log('downloaded:', fs.readdirSync(dl).join(', '));
await b.close();
process.exit(fail ? 1 : 0);
