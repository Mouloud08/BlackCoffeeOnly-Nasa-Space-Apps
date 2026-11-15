// V5 performance pass (SPEC_V5 §7, §10): the same method as the version 4 audit (audit-v4/perf.mjs), on the v5 shell.
// Input-to-paint = Event Timing duration of the click / keydown; long tasks after the action; rAF frame rate for 1.5 s.
// Usage: CPU=1|4 node tools/perf.mjs   (prints one JSON line per measure; writes tools/perf.<cpu>x.json)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const here = new URL('..', import.meta.url).pathname;
const url = 'file://' + (process.env.FB_HTML || here + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const throttle = +(process.env.CPU || 1);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--enable-precise-memory-info'] });
const res = { cpu: throttle };
const reqs = [], errs = [];
const watch = (p) => { p.on('request', (r) => { if (!/^(data|blob|file):/.test(r.url())) reqs.push(r.url()); }); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
// ---------- load
{
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); watch(p);
  await p.setViewport({ width: 1440, height: 900 });
  const cdp = await p.target().createCDPSession(); if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.evaluateOnNewDocument(() => {
    window.__lt = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
    const mo = new MutationObserver(() => {
      if (!window.__numT && document.querySelector('.fb-verdict2 .fb-num')) window.__numT = performance.now();
      const v = document.querySelector('.fb-mappanel .fb-map-view[data-view]'); if (!window.__mapT && v && v.getAttribute('data-view')) window.__mapT = performance.now();
      if (!window.__cellT && document.querySelector('.fb-calpanel .at-cell')) window.__cellT = performance.now();
    });
    document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-view'] }));
  });
  await p.goto(url, { waitUntil: 'load' });
  await sleep(5000);
  res.load = await p.evaluate(() => ({ fcp: Math.round((performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint') || {}).startTime || 0), numT: Math.round(window.__numT), mapT: Math.round(window.__mapT), cellT: Math.round(window.__cellT), decode: window.__fbDecodeMs, compute: window.__fbComputeMs, longtasks: window.__lt, dom: document.querySelectorAll('*').length, heapMB: performance.memory && Math.round(performance.memory.usedJSHeapSize / 1e6) }));
  console.log('LOAD', JSON.stringify(res.load));
  await ctx.close();
}
// ---------- interactions
const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); watch(p);
await p.setViewport({ width: 1440, height: 900 });
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('fb-peek-hint', '1'); } catch (e) { /* */ } });
await p.goto(url + '#z=canada', { waitUntil: 'load' }); await sleep(4000);
const cdp = await p.target().createCDPSession(); if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await p.evaluate(() => {
  window.__lt = []; window.__ev = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask' });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.interactionId || /click|pointer|key|wheel/.test(e.name)) window.__ev.push([e.name, Math.round(e.startTime), Math.round(e.duration), Math.round(e.processingEnd - e.processingStart)]); })).observe({ type: 'event', durationThreshold: 16, buffered: false });
  window.__frames = (ms) => new Promise((r) => { const ts = []; const t0 = performance.now(); (function f(t) { ts.push(t); if (t - t0 < ms) requestAnimationFrame(f); else { const g = ts.slice(1).map((x, i) => x - ts[i]); r({ fps: Math.round((ts.length - 1) / ((ts.at(-1) - ts[0]) / 1000)), maxGap: Math.round(Math.max(...g)), over50: g.filter((x) => x > 50).length }); } })(t0); });
});
const measure = async (name, act) => {
  await p.evaluate(() => { window.__lt = []; window.__ev = []; });
  const fr = p.evaluate(() => window.__frames(1500));
  await sleep(30);
  const t0 = await p.evaluate(() => performance.now());
  await act();
  const f = await fr; await sleep(300);
  const r = await p.evaluate((t0) => ({ lt: window.__lt.filter((x) => x[0] >= t0 - 5).map((x) => x[1]), ev: window.__ev }), t0);
  const ev = r.ev.filter((e) => /click|keydown|keyup|pointerup|pointerdown/.test(e[0]));
  res[name] = { ...f, longtasks: r.lt, inp: Math.max(0, ...ev.map((e) => e[2])), proc: Math.max(0, ...ev.map((e) => e[3])) };
  console.log(name.padEnd(24), JSON.stringify(res[name]));
};
res.rest = await p.evaluate(() => window.__frames(2000)); console.log('rest', JSON.stringify(res.rest));
const RAW = '.fb-series .fb-series-i:nth-child(1)', HARM = '.fb-series .fb-series-i:nth-child(2)';
for (let i = 0; i < 2; i++) { await measure('flip_raw', () => p.click(RAW)); await sleep(700); await measure('flip_harm', () => p.click(HARM)); await sleep(700); }
await measure('key_H_after_tap_R', async () => { await p.keyboard.press('r'); await sleep(500); await p.keyboard.press('h'); }); await sleep(700);
await measure('cal_anomaly', () => p.click('.fb-calpanel .fb-seg2-i:nth-child(2)')); await sleep(700);
await measure('cal_counts', () => p.click('.fb-calpanel .fb-seg2-i:nth-child(1)')); await sleep(700);
for (const k of [2, 3, 4, 1]) { await measure('layer_' + k, () => p.click('.fb-layerctl .fb-layerbtn:nth-child(' + k + ')')); await sleep(600); }
await measure('zoom_in_btn', () => p.click('.fb-zoomctl [aria-label="Zoom in"]')); await sleep(600);
const mv = await p.$eval('.fb-mappanel .fb-map-view', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
await p.mouse.move(mv.x + mv.w / 2, mv.y + mv.h / 2);
await measure('wheel_zoom', async () => { for (let i = 0; i < 5; i++) { await p.mouse.wheel({ deltaY: -120 }); await sleep(60); } }); await sleep(500);
await measure('pan_drag', async () => { await p.mouse.move(mv.x + mv.w * 0.5, mv.y + mv.h * 0.5); await p.mouse.down(); await p.mouse.move(mv.x + mv.w * 0.3, mv.y + mv.h * 0.35, { steps: 20 }); await p.mouse.up(); }); await sleep(500);
await measure('fit_btn', () => p.click('.fb-zoomctl [aria-label="Fit country"]')); await sleep(600);
await measure('hover_map', async () => { for (let i = 0; i < 20; i++) await p.mouse.move(mv.x + mv.w * (0.2 + i * 0.03), mv.y + mv.h * 0.5); });
await measure('hover_calendar', async () => { const c = await p.$$('.fb-calpanel .at-cell'); for (let i = 0; i < 12; i++) { await c[100 + i * 13].hover(); } });
// presets through the zone popover
await p.click('.fb-zonebtn'); await sleep(250);
const presets = await p.$$eval('.fb-presetlist button', (bs) => bs.map((x) => x.textContent.trim()));
await p.keyboard.press('Escape'); await sleep(200);
// rAF-based check alongside Event Timing: frames from the click until the verdict shows the new zone's number.
res.presetFrames = {};
for (const [i, nm] of presets.entries()) {
  await p.click('.fb-zonebtn'); await sleep(250);
  const key = 'preset_' + nm.slice(0, 16).replace(/\s+/g, '_');
  await measure(key, async () => {
    res.presetFrames[key] = await p.evaluate((i) => new Promise((done) => {
      const before = document.querySelector('.fb-verdict2 .fb-vnum') && document.querySelector('.fb-verdict2').textContent;
      const t0 = performance.now(); let first = null;
      document.querySelector('.fb-presetlist li:nth-child(' + (i + 1) + ') button').click();
      const f = (t) => { if (first == null) first = Math.round(t - t0); const now = document.querySelector('.fb-verdict2').textContent; if (now !== before || t - t0 > 2000) done({ firstFrame: first, verdictFrame: Math.round(t - t0) }); else requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }), i);
  });
  console.log('   frames', JSON.stringify(res.presetFrames[key]));
  await sleep(900);
}
await measure('click_box', () => p.mouse.click(mv.x + mv.w * 0.35, mv.y + mv.h * 0.55)); await sleep(800);
await p.keyboard.down('Shift');
await measure('shift_drag_box', async () => { await p.mouse.move(mv.x + mv.w * 0.3, mv.y + mv.h * 0.45); await p.mouse.down(); await p.mouse.move(mv.x + mv.w * 0.4, mv.y + mv.h * 0.55, { steps: 10 }); await p.mouse.up(); });
await p.keyboard.up('Shift'); await sleep(800);
{ const cells = await p.$$('.fb-calpanel .at-cell'); await measure('cal_cell_click', () => cells[Math.min(100, cells.length - 1)].click()); } await sleep(600);
for (const t of ['evidence', 'how', 'method', 'dash']) { await measure('tab_' + t, () => p.click('#fb-tab-' + t)); await sleep(900); }
await measure('theme_toggle', async () => { await p.click('.fb-morebtn'); await sleep(150); await p.evaluate(() => [...document.querySelectorAll('#fb-more button')].find((x) => /theme/.test(x.textContent)).click()); }); await sleep(800);
res.requests = reqs; res.errors = errs;
console.log('requests', reqs.length, 'errors', errs.length, errs.slice(0, 3));
fs.writeFileSync(here + 'tools/perf.' + throttle + 'x.json', JSON.stringify(res, null, 1));
await b.close();
