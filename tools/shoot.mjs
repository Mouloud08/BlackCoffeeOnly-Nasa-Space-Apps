// Screenshots from file://, logging console errors and any non-local request.
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';
const here = new URL('..', import.meta.url).pathname;
const url = pathToFileURL(process.env.FB_HTML || here + 'dist/firebridge.html').href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shots = JSON.parse(process.argv[2]);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] });
for (const s of shots) {
  const p = await b.newPage();
  const errs = [], reqs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 400)));
  p.on('request', (r) => { const u = r.url(); if (!/^(data|blob|file):/.test(u)) reqs.push(u.slice(0, 120)); });
  await p.setViewport({ width: s.w || 1280, height: s.h || 800, deviceScaleFactor: s.dpr || 1 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: s.dark ? 'dark' : 'light' }].concat(s.reduce ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : []));
  await p.goto(url + (s.hash ? '#' + s.hash : ''), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await sleep(s.wait || 2200);
  if (s.js) { await p.evaluate(s.js); await sleep(s.after || 900); }
  if (s.scroll) { await p.evaluate((sel, off) => { const el = document.querySelector(sel); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (off || 0)); }, s.scroll, s.off || 0); await sleep(s.after || 1200); }
  if (s.hover) { const el = await p.$(s.hover); if (el) { await el.hover(); await sleep(400); } }
  const info = await p.evaluate(() => ({ H: document.documentElement.scrollHeight, W: document.documentElement.scrollWidth, over: document.documentElement.scrollWidth > window.innerWidth }));
  if (s.el) { const el = await p.$(s.el); if (el) await el.screenshot({ path: here + 'shots/' + s.name + '.png' }); }
  else await p.screenshot({ path: here + 'shots/' + s.name + '.png', fullPage: !!s.full });
  console.log(s.name, JSON.stringify(info), reqs.length ? 'REQUESTS: ' + reqs.join(' | ') : 'no-net', errs.length ? '\n  ' + errs.slice(0, 8).join('\n  ') : '');
  await p.close();
}
await b.close();
