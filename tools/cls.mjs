// Layout shift per interaction (v5.1, audit-v5 §3.7): sum of layout-shift values (input-excluded ones included) in the
// 1.2 s after each action, 1440×900 and 1366×768. Target < 0.02 on every interaction.
import puppeteer from 'puppeteer-core';
const url = 'file://' + (process.env.FB_HTML || new URL('..', import.meta.url).pathname + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const rows = [];
for (const [W, H] of [[1440, 900], [1366, 768]]) {
  const p = await b.newPage(); await p.setViewport({ width: W, height: H });
  await p.evaluateOnNewDocument(() => { window.__ls = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__ls.push({ t: e.startTime, v: e.value, src: (e.sources || []).map((s) => s.node && s.node.className ? String(s.node.className.baseVal ?? s.node.className).split(' ')[0] : '?').join('|') }))).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(url + '#z=canada', { waitUntil: 'load' }); await sleep(3000);
  const load = await p.evaluate(() => window.__ls.reduce((a, e) => a + e.v, 0));
  rows.push([W + 'x' + H, 'load', load]);
  const run = async (name, act) => {
    await p.evaluate(() => { window.__ls = []; }); await act(); await sleep(1200);
    const r = await p.evaluate(() => ({ v: window.__ls.reduce((a, e) => a + e.v, 0), src: [...new Set(window.__ls.filter((e) => e.v > 0.001).map((e) => e.src))].join(', ') }));
    rows.push([W + 'x' + H, name, r.v, r.src]);
  };
  const preset = (re) => async () => { await p.click('.fb-zonebtn'); await sleep(250); await p.evaluate((re) => [...document.querySelectorAll('.fb-preset2')].find((e) => new RegExp(re).test(e.textContent)).click(), re); };
  for (const z of ['All of Argentina', 'La Rioja', 'Chilecito', 'Tucumán', 'Côte-Nord', 'Boreal', 'All of Canada']) await run('preset ' + z, preset(z));
  await run('country → Argentina', async () => { await p.click('.fb-zonebtn'); await sleep(250); await p.evaluate(() => [...document.querySelectorAll('.fb-pop-zone .fb-seg2-i')].find((e) => /Argentina/.test(e.textContent)).click()); });
  await run('country → Canada', async () => { await p.evaluate(() => [...document.querySelectorAll('.fb-pop-zone .fb-seg2-i')].find((e) => /Canada/.test(e.textContent)).click()); await sleep(100); await p.keyboard.press('Escape'); });
  const mv = await p.$eval('.fb-mappanel .fb-map-view', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await run('map click (2° box)', () => p.mouse.click(mv.x + mv.w * 0.35, mv.y + mv.h * 0.55));
  await run('map click outside data', () => p.mouse.click(mv.x + mv.w * 0.85, mv.y + mv.h * 0.12));
  await run('fit', () => p.click('.fb-zoomctl [aria-label="Fit country"]').catch(() => {}));
  await p.evaluate(() => [...document.querySelectorAll('.fb-zoomctl button')].find((e) => /Fit/.test(e.getAttribute('aria-label') || '')));
  await p.goto(url + '#z=canada', { waitUntil: 'load' }); await sleep(2500);
  await run('month select', () => p.click('.fb-calpanel .at-cal-cells [data-key="2019-06"]'));
  await run('month clear', () => p.click('.fb-monthchip button'));
  await run('flip raw', () => p.click('.fb-series .fb-series-i:nth-child(1)'));
  await run('flip harmonized', () => p.click('.fb-series .fb-series-i:nth-child(2)'));
  for (const k of [2, 3, 4, 1]) await run('layer ' + k, () => p.click('.fb-layerctl .fb-layerbtn:nth-child(' + k + ')'));
  await run('tab Evidence', () => p.click('#fb-tab-evidence'));
  await run('tab How', () => p.click('#fb-tab-how'));
  for (let i = 0; i < 3; i++) await run('step next', () => p.evaluate(() => [...document.querySelectorAll('.fb-how-nav button')].find((e) => /Next/.test(e.textContent)).click()));
  await run('step previous', () => p.evaluate(() => [...document.querySelectorAll('.fb-how-nav button')].find((e) => /Previous/.test(e.textContent)).click()));
  await run('tab Dashboard', () => p.click('#fb-tab-dash'));
  await p.close();
}
let worst = 0;
for (const r of rows) { worst = Math.max(worst, r[2]); console.log(r[0].padEnd(9), r[1].padEnd(24), r[2].toFixed(4), r[2] >= 0.02 ? 'OVER' : '', r[3] || ''); }
console.log('worst', worst.toFixed(4));
await b.close();
