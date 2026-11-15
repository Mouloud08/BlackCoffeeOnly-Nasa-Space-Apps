// README and project-page images: five screens of the offline app at 1440 x 900, light theme, scale 1.
// Run from the repository root:  node scripts/shoot_readme.mjs [path/to/firebridge.html]   (default dist/firebridge.html)
// Writes docs/img/{overview,calendar,flip-raw,flip-harmonized,evidence}.png. Needs puppeteer-core and a local Chrome
// (CHROME=... to override). The page makes no network request; any non-local request is reported.
import puppeteer from 'puppeteer-core';
import { mkdirSync, statSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const html = resolve(process.argv[2] || 'dist/firebridge.html');
const out = resolve('docs/img');
mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const url = pathToFileURL(html).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { name: 'overview', hash: 'tab=overview&z=argentina&anim=0' },
  { name: 'calendar', hash: 'tab=dash&z=canada&anim=0' },
  { name: 'flip-raw', hash: 'tab=dash&z=argentina&l=rec&v=raw&anim=0' },
  { name: 'flip-harmonized', hash: 'tab=dash&z=argentina&l=rec&v=harmonized&anim=0' },
  { name: 'evidence', hash: 'tab=evidence&z=canada&anim=0' },
];

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] });
let failed = 0;
for (const s of SHOTS) {
  const page = await browser.newPage();
  const errs = [], reqs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  page.on('request', (r) => { if (!/^(data|blob|file):/.test(r.url())) reqs.push(r.url().slice(0, 120)); });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('fb-theme', 'light'); } catch (e) { /* file:// without storage */ } });
  await page.goto(url + '#' + s.hash, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(3500); // first paint, then cell statistics and the second country decode after it
  const file = resolve(out, s.name + '.png');
  await page.screenshot({ path: file });
  const kb = Math.round(statSync(file).size / 1024);
  if (errs.length || reqs.length) failed++;
  console.log(s.name + '.png', kb + ' KB', reqs.length ? 'REQUESTS: ' + reqs.join(' | ') : 'no network', errs.length ? 'ERRORS: ' + errs.join(' | ') : '');
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
