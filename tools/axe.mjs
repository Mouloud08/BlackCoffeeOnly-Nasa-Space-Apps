// axe-core (V5 §10): every rule set incl. best-practice, light and dark, 1366 and 390, each tab, several zones and states.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { pathToFileURL } from 'url';
const here = new URL('..', import.meta.url).pathname;
const url = pathToFileURL(process.env.FB_HTML || here + 'dist/firebridge.html').href;
const axe = fs.readFileSync(here + 'node_modules/axe-core/axe.min.js', 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let total = 0;
const HASHES = ['z=canada', 'z=boreal&tab=evidence', 'z=canada&tab=how&step=1', 'z=chilecito&tab=how&step=3', 'z=canada&tab=how&step=4', 'z=argentina&tab=method',
  'z=chilecito&cv=anomaly', 'c=argentina&b=-55,-53,-68.5,-65.5', 'c=canada&b=70,72,-100,-96', 'z=canada&l=ratio', 'z=argentina&l=month&m=2020-09', 'z=argentina&l=det&v=raw', 'z=canada&panel=map', 'z=canada&tab=evidence&v=raw', '', 'tab=overview&c=argentina', 'tab=overview&v=raw'];
for (const theme of ['light', 'dark']) for (const [w, h] of [[1366, 768], [390, 844]]) for (const hash of HASHES) {
  const p = await b.newPage();
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('fb-peek-hint', '1'); } catch (e) { /* */ } });
  await p.goto(url + '#' + hash, { waitUntil: 'load' }); await sleep(1500);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(400); await p.evaluate(() => window.scrollTo(0, 0)); await sleep(200);
  await p.evaluate(axe);
  const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map((x) => x.target.join(' ') + ' :: ' + (x.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220)) })));
  total += res.length;
  console.log(theme, w, '#' + hash, res.length ? JSON.stringify(res) : 'OK');
  await p.close();
}
console.log('TOTAL violations', total);
await b.close();
