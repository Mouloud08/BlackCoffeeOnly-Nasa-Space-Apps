// 1280×720 frames of each story step (scrolled through so the entrance motion runs), plus method and month row.
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';
const here = new URL('..', import.meta.url).pathname;
const url = pathToFileURL(process.env.FB_HTML || here + 'dist/firebridge.html').href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [hash, prefix, dark] = [process.argv[2] || 'z=boreal', process.argv[3] || 'f', process.argv[4] === 'dark'];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.setViewport({ width: 1280, height: 720 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]);
await p.goto(url + '#' + hash, { waitUntil: 'load' }); await sleep(2000);
for (const [id, name] of [['step-problem', '1'], ['step-bridge', '2'], ['step-proof', '3'], ['month', 'month'], ['method', 'method']]) {
  await p.evaluate((id) => { const el = document.getElementById(id); const r = el.getBoundingClientRect(); const target = r.top + window.scrollY - (id.startsWith('step') ? 56 + Math.max(0, (664 - r.height) / 2) : 72); window.scrollTo(0, target); }, id);
  await sleep(1800);
  await p.screenshot({ path: here + 'shots/' + prefix + '-' + name + '.png' });
}
console.log(prefix, errs.length ? errs : 'no errors');
await b.close();
