// Logo concepts: writes preview.html from the SVG files, renders preview.png and the top-bar crops (topbar-*.png).
// Run from the project root:  node docs/logo/render.mjs   (only reads dist/firebridge.html, writes in docs/logo/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
// Inline form of an SVG file: drop the comment and the xmlns, keep viewBox and shapes.
const inline = (f, cls = '') => read(f).replace(/<!--[\s\S]*?-->\s*/g, '').replace(' xmlns="http://www.w3.org/2000/svg"', '').replace('<svg', `<svg class="${cls}"`).trim();

const ROWS = [
  { id: 'a', file: 'concept-a.svg', letter: 'A', name: 'Flame rising from bridge arch' },
  { id: 'b', file: 'concept-b.svg', letter: 'B', name: 'Hollow and solid, one flame' },
  { id: 'c', file: 'concept-c.svg', letter: 'C', name: 'Two piers carry one deck' },
  { id: 'cur', file: 'current.svg', letter: 'Now', name: 'Two bars under an arc' },
];

const panel = (r, theme) => `
  <div class="panel ${theme}">
    <div class="sizes">
      ${[16, 24, 48, 128].map((s) => `<figure><div class="m" style="width:${s}px;height:${s}px">${inline(r.file)}</div><figcaption>${s}</figcaption></figure>`).join('')}
    </div>
    <div class="locks">
      <div class="lock sm">${inline(r.file)}<span>FireBridge</span></div>
      <div class="lock lg">${inline(r.file)}<span>FireBridge</span></div>
    </div>
  </div>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>FireBridge logo concepts</title>
<style>
@font-face { font-family: 'Atelier Texte'; src: url('../../ds/fonts/atelier-texte.woff2') format('woff2'); font-weight: 200 800; }
@font-face { font-family: 'Radio Canada'; src: url('../../node_modules/@fontsource-variable/radio-canada/files/radio-canada-latin-wght-normal.woff2') format('woff2'); font-weight: 300 700; }
:root { --ground-l: oklch(0.968 0.005 250); --ink-l: oklch(0.21 0.011 250); --ink2-l: oklch(0.48 0.012 250); --line-l: oklch(0.91 0.006 250);
        --ground-d: oklch(0.16 0.006 250); --ink-d: oklch(0.94 0.006 250); --ink2-d: oklch(0.68 0.008 250); --line-d: oklch(0.27 0.008 250); }
* { box-sizing: border-box; margin: 0; }
body { width: 1600px; height: 1200px; background: oklch(0.997 0.0015 250); color: var(--ink-l); font-family: 'Radio Canada', system-ui, sans-serif; padding: 28px 32px; }
header { display: flex; align-items: baseline; gap: 16px; height: 56px; }
header h1 { font-family: 'Atelier Texte', 'Radio Canada', sans-serif; font-size: 26px; font-weight: 600; letter-spacing: -0.012em; }
header p { font-size: 14px; color: var(--ink2-l); }
.row { display: grid; grid-template-columns: 190px 1fr 1fr; gap: 14px; height: 272px; padding: 8px 0; border-top: 1px solid var(--line-l); }
.row.cur { opacity: 1; }
.label { padding-top: 14px; }
.label b { display: block; font-family: 'Atelier Texte', 'Radio Canada', sans-serif; font-size: 44px; line-height: 1; font-weight: 600; }
.label span { display: block; margin-top: 10px; font-size: 15px; line-height: 20px; font-weight: 500; }
.label small { display: block; margin-top: 6px; font-size: 12px; color: var(--ink2-l); }
.panel { border-radius: 14px; padding: 14px 18px; display: flex; flex-direction: column; justify-content: space-between; }
.panel.light { background: var(--ground-l); color: var(--ink-l); box-shadow: inset 0 0 0 1px var(--line-l); --cap: var(--ink2-l); }
.panel.dark { background: var(--ground-d); color: var(--ink-d); --cap: var(--ink2-d); }
.sizes { display: flex; align-items: flex-end; gap: 26px; }
figure { display: flex; flex-direction: column; align-items: center; gap: 6px; }
figcaption { font-size: 11px; color: var(--cap); font-variant-numeric: tabular-nums; }
.m svg { width: 100%; height: 100%; display: block; }
.locks { display: flex; align-items: center; gap: 36px; }
.lock { display: flex; align-items: center; font-family: 'Atelier Texte', 'Radio Canada', sans-serif; font-weight: 600; white-space: nowrap; }
/* top-bar size: the app's 24 px mark, var(--sp-2) gap, product-name 1.125rem at 17 px root */
.lock.sm { gap: 8px; font-size: 19px; letter-spacing: -0.01em; }
.lock.sm svg { width: 24px; height: 24px; flex: none; }
.lock.lg { gap: 14px; font-size: 46px; letter-spacing: -0.02em; }
.lock.lg svg { width: 52px; height: 52px; flex: none; }
</style></head>
<body>
<header><h1>FireBridge · logo concepts</h1><p>Each mark in one colour (currentColor), at 16 · 24 · 48 · 128 px, then the lockup at top-bar size and large. Light and dark app grounds.</p></header>
${ROWS.map((r) => `<section class="row ${r.id}"><div class="label"><b>${r.letter}</b><span>${r.name}</span><small>${r.file}</small></div>${panel(r, 'light')}${panel(r, 'dark')}</section>`).join('\n')}
</body></html>`;
fs.writeFileSync(path.join(HERE, 'preview.html'), html);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files', '--no-first-run'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(HERE, 'preview.html')).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(HERE, 'preview.png') });
  if (!process.argv.includes('--no-topbar')) {
    const app = pathToFileURL(path.join(ROOT, 'dist', 'firebridge.html')).href + '#tab=dash&z=canada&anim=0';
    const p2 = await browser.newPage();
    await p2.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await p2.goto(app, { waitUntil: 'load', timeout: 120000 });
    await p2.waitForSelector('.fb-top2 .fb-mark', { timeout: 60000 });
    await p2.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 1500));
    const h = await p2.$eval('.fb-top2', (e) => Math.round(e.getBoundingClientRect().height));
    const clip = { x: 0, y: 0, width: 700, height: 80 };
    await p2.screenshot({ path: path.join(HERE, 'topbar-current.png'), clip });
    for (const r of ROWS.filter((x) => x.id !== 'cur')) {
      const svg = inline(r.file, 'fb-mark');
      await p2.evaluate((s) => { const old = document.querySelector('.fb-top2 .fb-mark'); const t = document.createElement('template'); t.innerHTML = s; old.replaceWith(t.content.firstElementChild); }, svg);
      await p2.screenshot({ path: path.join(HERE, `topbar-${r.id}.png`), clip });
    }
    console.log('top bar height', h, 'clip', clip);
  }
} finally {
  await browser.close();
}
console.log('done');
