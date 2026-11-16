// The fallback deck: 7 slides, 16:9, one sentence each, built on real screenshots of the app, printed to PDF by Chrome.
// Every number in a slide sentence must appear on that slide's screenshot (same check as the video captions).
//
// Usage: node video/slides.mjs [path/to/firebridge.html]   → video/out/firebridge-slides.pdf (+ out/slides/*.png)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HTML = resolve(process.argv[2] ?? join(ROOT, 'dist', 'firebridge.html'));
if (!existsSync(HTML)) throw new Error(`App not found: ${HTML}`);
const SHOTS = join(HERE, 'tmp', 'slides');
const OUT = join(HERE, 'out');
mkdirSync(SHOTS, { recursive: true }); mkdirSync(join(OUT, 'slides'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const URL_SITE = 'mouloud08.github.io/BlackCoffeeOnly-Nasa-Space-Apps';
const SLIDES = [
  { eyebrow: 'The problem', title: 'Since 2012, two satellite sensors count the same fires differently.',
    text: 'NASA FIRMS publishes MODIS hot spots (since 2000) and, since 2012, VIIRS hot spots too, from a sharper sensor that records about twice as many fire detections. A record that uses MODIS before 2012 and VIIRS after jumps in 2012, even where fire activity did not change.',
    hash: 'tab=how&z=canada&step=1' },
  { eyebrow: 'The answer', title: 'On one scale, the trends change.',
    text: 'Harmonized, Argentina\'s fire detections show a decline (0.7×) instead of a rise (1.4×), and Canada\'s roughly doubled (2.0×) instead of quadrupling (4.2×), after 2012 against before.',
    hash: 'tab=overview&z=argentina', also: 'tab=overview&z=canada' },
  { eyebrow: 'How it works', title: 'One correction factor, measured where both sensors overlap.',
    text: 'FireBridge measures how many times more fire detections VIIRS records than MODIS in the years both fly (2012 on), and multiplies the MODIS-only years by that factor (Canada: 2.10×), so the whole record reads on one scale.',
    hash: 'tab=how&z=canada&step=2' },
  { eyebrow: 'Checks', title: 'Compared with an independent record, and year by year.',
    text: 'Canada\'s harmonized rise agrees with official area burned on the same years (1.9× vs 1.9×); with each overlap year left out in turn, the factor from the other years predicts it within ±10% in 13 of 14 years.',
    hash: 'tab=evidence&z=canada' },
  { eyebrow: 'The tool', title: 'What the challenge asks for, in one offline file.',
    text: 'A harmonized burning calendar (months × years) for any place chosen on the map, any date range, each month against its historical median, downloads, and colour-blind-safe ramps, with no network at all.',
    hash: 'tab=dash&z=custom&c=canada&b=57.5%2C59.5%2C-117%2C-115&m=2026-10' },
  { eyebrow: 'Honesty and limits', title: 'When the data cannot tell, the app says so.',
    text: 'A small zone whose years vary too much gets no trend (Boreal Québec: “No trend: too variable”); places whose local factor is above 4× are not harmonized, and 2026 months are marked provisional.',
    hash: 'tab=dash&z=boreal', also: 'tab=evidence&z=canada' },
  { eyebrow: 'Links', title: 'FireBridge', end: true,
    text: 'One offline file · NASA FIRMS data, 2001 – Oct 2026 · team BlackCoffeeOnly (Yasmine Lounaci & Mouloud Serir) · NASA Space Apps Challenge 2026, challenge “Harmonization of MODIS and VIIRS Hot Spots”. Not a NASA product.',
    hash: 'tab=overview&z=canada' },
];

// ---- screenshots of the real app --------------------------------------------------------------------------
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'] });
const texts = [];
try {
  for (const [i, s] of SLIDES.entries()) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    let text = '';
    for (const h of [s.hash, s.also].filter(Boolean)) {
      await page.goto(`${pathToFileURL(HTML).href}#${h}&anim=0`, { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction(() => window.__fb && !window.__fb.pending, { timeout: 60000 });
      // a tab key renamed in a later build: open the tab by its position instead
      const want = new URLSearchParams(h).get('tab');
      if (want && !(await page.evaluate((w) => window.__fb?.st?.tab === w, want))) {
        await page.evaluate((i) => document.querySelectorAll('[role="tab"][id^="fb-tab-"]')[i]?.click(), { overview: 0, dash: 1, evidence: 2, how: 3, method: 4 }[want]);
        await sleep(1000);
      }
      await sleep(2500);
      text += (await page.evaluate(() => document.body.innerText)) + '\n';
      if (h === s.hash) await page.screenshot({ path: join(SHOTS, `slide-${i + 1}.png`) });
    }
    texts.push(text.replace(/\s+/g, ' '));
    await ctx.close();
  }

  // ---- number check ---------------------------------------------------------------------------------------
  const NUM = /±?\d+(?:[.,]\d+)?\s?[×%]|\d+ of \d+|× \d+\.\d+/g;
  const bad = [];
  SLIDES.forEach((s, i) => { for (const n of s.text.match(NUM) ?? []) if (!texts[i].includes(n)) bad.push(`slide ${i + 1}: "${n}" not on its screenshot`); });
  bad.forEach((b) => console.log(`  MISMATCH ${b}`));
  if (bad.length && !process.argv.includes('--force')) throw new Error('A slide number is not on the app screen.');

  // ---- deck ---------------------------------------------------------------------------------------------
  const font = (f) => pathToFileURL(join(HERE, 'public', 'fonts', f)).href;
  const img = (i) => pathToFileURL(join(SHOTS, `slide-${i + 1}.png`)).href;
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // the app's mark, concept A (docs/logo/concept-a.svg), in the ink colour
  const mark = '<svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" aria-hidden="true"><path d="M14 1.5C16.5 5 20 8.5 20 14v7h-4.5v-3a3.5 3.5 0 0 0-7 0v3H4v-7c0-3 1.2-5.5 3.5-7.5.5 1.5 1.3 2.6 2.5 3C10 6.5 12 4.5 14 1.5Z"/></svg>';
  const deck = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FireBridge — slides</title><style>
@font-face { font-family: 'Atelier Texte'; src: url('${font('atelier-texte.woff2')}'); font-weight: 100 900; }
@font-face { font-family: 'Radio Canada'; src: url('${font('radio-canada-latin-wght-normal.woff2')}'); font-weight: 300 700; }
@page { size: 1920px 1080px; margin: 0; }
:root { --ground: oklch(0.968 0.005 250); --surface: oklch(0.997 0.0015 250); --ink: oklch(0.21 0.011 250); --ink2: oklch(0.48 0.012 250);
  --line: oklch(0.88 0.007 250); --accent: oklch(0.49 0.11 250); --stage: oklch(0.935 0.007 250); }
* { box-sizing: border-box; margin: 0; }
html, body { background: var(--stage); }
body { font-family: 'Radio Canada', 'Segoe UI', system-ui, sans-serif; color: var(--ink); }
.slide { width: 1920px; height: 1080px; display: grid; grid-template-columns: 500px 1fr; gap: 56px; align-items: center; padding: 72px 72px 72px 88px; page-break-after: always; break-after: page; position: relative; overflow: hidden; }
.eyebrow { font-size: 22px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink2); }
.eyebrow b { color: var(--accent); font-weight: 650; margin-right: 10px; }
h1 { font-family: 'Atelier Texte', 'Radio Canada', sans-serif; font-size: 54px; line-height: 1.1; font-weight: 600; letter-spacing: -0.02em; margin-top: 22px; }
p { font-size: 30px; line-height: 1.42; margin-top: 30px; color: var(--ink); }
.shot { justify-self: end; width: 1196px; border-radius: 16px; overflow: hidden; border: 1.5px solid var(--line); box-shadow: 0 22px 44px -26px rgba(20,30,45,.5); background: var(--surface); }
.shot img { display: block; width: 100%; height: auto; }
.foot { position: absolute; left: 88px; bottom: 40px; font-size: 18px; color: var(--ink2); }
.end { grid-template-columns: 1fr; justify-items: center; text-align: center; background: var(--ground); }
.end > div { display: flex; flex-direction: column; align-items: center; }
.end .eyebrow { margin-bottom: 36px; }
.end .brand { display: flex; align-items: center; gap: 22px; font-family: 'Atelier Texte', sans-serif; font-size: 112px; font-weight: 600; letter-spacing: -0.02em; }
.end p { max-width: 1300px; font-size: 34px; }
.end .url { margin-top: 40px; font-size: 44px; font-weight: 560; color: var(--accent); background: var(--surface); border: 1.5px solid var(--line); border-radius: 999px; padding: 14px 44px 18px; }
.end .shot.small { width: 760px; justify-self: center; margin-top: 44px; }
</style></head><body>
${SLIDES.map((s, i) => (s.end ? `<section class="slide end"><div>
  <div class="eyebrow"><b>${i + 1} / ${SLIDES.length}</b>${esc(s.eyebrow)}</div>
  <div class="brand">${mark}${esc(s.title)}</div>
  <div class="url">${URL_SITE}</div>
  <p>${esc(s.text)}</p>
</div></section>` : `<section class="slide"><div>
  <div class="eyebrow"><b>${i + 1} / ${SLIDES.length}</b>${esc(s.eyebrow)}</div>
  <h1>${esc(s.title)}</h1>
  <p>${esc(s.text)}</p>
</div><div class="shot"><img src="${img(i)}" alt=""></div>
<div class="foot">FireBridge · screenshots of the app itself (${esc(s.hash.replace(/&anim=0/, ''))}) · data: NASA FIRMS</div></section>`)).join('\n')}
</body></html>`;
  const deckPath = join(HERE, 'tmp', 'slides.html');
  writeFileSync(deckPath, deck);
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(pathToFileURL(deckPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = join(OUT, 'firebridge-slides.pdf');
  await page.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  // a PNG preview of each slide
  const n = await page.$$eval('section.slide', (els) => els.length);
  for (let i = 0; i < n; i++) {
    const el = (await page.$$('section.slide'))[i];
    await el.screenshot({ path: join(OUT, 'slides', `slide-${i + 1}.png`) });
  }
  console.log(`Slides: ${n} → ${pdf}`);
} finally {
  await browser.close();
}
