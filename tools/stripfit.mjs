// Strip fit (v5.2; replaces railfit): the verdict strip never clips text or scrolls, 1280–2560 wide, seven states, both
// themes; its height is fixed per breakpoint (same height in every state at a given size).
import puppeteer from 'puppeteer-core';
const url = 'file://' + (process.env.FB_HTML || new URL('..', import.meta.url).pathname + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ST = { robust: 'z=canada', uncertain: 'z=boreal', borrowed: 'c=canada&b=58,59,-100,-99', rawview: 'z=canada&v=raw', notharmonized: 'c=argentina&b=-55,-53,-68.5,-65.5', nodata: 'c=canada&b=59,60,-88,-87', datapoor: 'c=canada&b=58,59,-75,-74' };
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let n = 0, bad = 0; const H = {};
for (const [W, Hh] of [[1280, 720], [1366, 768], [1440, 900], [1680, 1050], [1920, 1080], [2560, 1440]]) for (const th of ['light', 'dark']) for (const [k, h] of Object.entries(ST)) {
  const p = await b.newPage(); await p.setViewport({ width: W, height: Hh });
  await p.goto(url + '#' + h + '&anim=0' + (th === 'dark' ? '&theme=dark' : ''), { waitUntil: 'load' }); await sleep(1500);
  const r = await p.evaluate(() => {
    const v = document.querySelector('.fb-verdict2'), R = v.getBoundingClientRect(), errs = [];
    if (v.scrollHeight > v.clientHeight + 1 || v.scrollWidth > v.clientWidth + 1) errs.push('scroll');
    v.querySelectorAll('.fb-pill, .fb-evbtn, .fb-num, .fb-eyebrow, .fb-ladder-row, .fb-ladder-note, .fb-vsent, .fb-answer').forEach((e) => {
      const q = e.getBoundingClientRect(); if (!q.width) return;
      if (q.right > R.right + 1 || q.bottom > R.bottom + 1 || q.left < R.left - 1) errs.push('outside ' + e.className.split(' ')[0] + ' ' + e.textContent.slice(0, 24));
      if (e.scrollWidth > e.clientWidth + 1) errs.push('clipped ' + e.className.split(' ')[0] + ' "' + e.textContent.slice(0, 30) + '"');
    });
    v.querySelectorAll('.fb-vz').forEach((z) => { if (z.scrollWidth > z.clientWidth + 1) errs.push('zone overflow ' + z.className); });
    return { errs, h: Math.round(R.height), cls: v.className };
  });
  n++; (H[W] = H[W] || new Set()).add(r.h);
  if (r.errs.length) { bad++; console.log(W, th, k, r.errs.join('; ')); }
  await p.close();
}
for (const [W, s] of Object.entries(H)) console.log(W, 'strip heights', [...s].join(', '));
console.log(n + ' checks, ' + bad + ' failed');
await b.close();
