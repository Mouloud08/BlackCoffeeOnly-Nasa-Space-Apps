// Theme toggle (V5: in the ⋯ menu): both directions at 1280 and 390, persistence across reload, not in the hash, axe after toggling, redraw of the map canvas, shots.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const here = new URL('..', import.meta.url).pathname;
const url = 'file://' + (process.env.FB_HTML || here + 'dist/firebridge.html');
const axe = fs.readFileSync(here + 'node_modules/axe-core/axe.min.js', 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
for (const [w, h] of [[1366, 768], [390, 844], [320, 700]]) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: h });
  await p.goto(url + '#z=boreal', { waitUntil: 'load' }); await sleep(1500);
  const px = () => p.evaluate(() => { const c = document.querySelector('.fb-map-view canvas'); if (!c) return null; const d = c.getContext('2d').getImageData(Math.floor(c.width * 0.15), Math.floor(c.height * 0.5), 1, 1).data; return d.slice(0, 3).join(','); });
  const st = async () => ({ theme: await p.evaluate(() => document.documentElement.getAttribute('data-theme')), label: await p.evaluate(() => document.documentElement.getAttribute('data-theme')), hash: await p.evaluate(() => location.hash.includes('theme')), mapPixel: await px(), topH: await p.evaluate(() => Math.round(document.querySelector('.fb-top2').scrollHeight)) });
  const out = [await st()];
  await p.click('.fb-morebtn'); await sleep(200); await p.evaluate(() => [...document.querySelectorAll('#fb-more button')].find((e) => /theme/.test(e.textContent)).click()); await sleep(500); out.push(await st());
  await p.evaluate(axe); const v1 = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => v.id));
  if (w === 1366) await p.screenshot({ path: here + 'shots/v5-theme-toggled-dark.png' });
  await p.reload({ waitUntil: 'load' }); await sleep(1200); out.push(Object.assign({ afterReload: true }, await st()));
  await p.click('.fb-morebtn'); await sleep(200); await p.evaluate(() => [...document.querySelectorAll('#fb-more button')].find((e) => /theme/.test(e.textContent)).click()); await sleep(500); out.push(await st());
  await p.evaluate(axe); const v2 = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => v.id));
  if (w === 1366) await p.screenshot({ path: here + 'shots/v5-theme-toggled-back-light.png' });
  if (w === 320) await p.screenshot({ path: here + 'shots/v5-theme-phone-320.png' });
  console.log(w, JSON.stringify(out), 'axe after dark toggle', v1.length ? v1 : 0, 'axe after light toggle', v2.length ? v2 : 0, 'errors', errs.length ? errs : 0);
  await ctx.close();
}
await b.close();
