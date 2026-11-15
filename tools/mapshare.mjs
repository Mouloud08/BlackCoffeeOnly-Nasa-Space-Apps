// Map data share (v5.1, audit-v5 DB1/D2): the share of the map view covered by the data extent (places with a claim,
// +1°), at every size, Canada and Argentina; plus where the data sits (empty above / below).
import puppeteer from 'puppeteer-core';
const url = 'file://' + (process.env.FB_HTML || new URL('..', import.meta.url).pathname + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
for (const [w, h] of [[390, 844], [768, 1024], [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) for (const z of ['canada', 'argentina']) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h });
  await p.goto(url + '#z=' + z + '&anim=0', { waitUntil: 'load' }); await sleep(2200);
  const r = await p.evaluate(() => {
    const v = document.querySelector('.fb-mappanel .fb-map-view'); if (!v) return null;
    const [fs, fn, fw, fe] = v.getAttribute('data-frame').split(',').map(Number), [es, en, ew, ee] = v.getAttribute('data-ext').split(',').map(Number);
    const ov = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
    const W = (ov(fw, fe, ew, ee)) / (fe - fw), H = (ov(fs, fn, es, en)) / (fn - fs);
    const rr = v.getBoundingClientRect();
    return { view: Math.round(rr.width) + '×' + Math.round(rr.height), w: W, h: H, share: W * H, above: Math.max(0, fn - en) / (fn - fs), below: Math.max(0, es - fs) / (fn - fs) };
  });
  if (r) console.log(`${w}x${h} ${z.padEnd(9)} view ${r.view.padEnd(10)} data ${Math.round(r.w * 100)}% × ${Math.round(r.h * 100)}% = ${Math.round(r.share * 100)}% of the view · empty above ${Math.round(r.above * 100)}% · below ${Math.round(r.below * 100)}%`);
  await p.close();
}
await b.close();
