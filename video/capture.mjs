// Records the demo footage from the real app (dist/firebridge.html): one clip per shot, 1920×1080, light theme,
// real clicks with a visible cursor and a click ring. Each clip is a Chrome screencast (CDP) resampled to a
// constant 30 fps by the frame timestamps, so the animations play at their real speed.
//
// Usage: node video/capture.mjs [path/to/firebridge.html] [--only id1,id2]
// Output: video/public/captures/<shot>.mp4, <shot>-start.png, <shot>-end.png, facts.json (screen text per shot).
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const htmlArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--only');
const HTML = resolve(htmlArg ?? join(ROOT, 'dist', 'firebridge.html'));
if (!existsSync(HTML)) throw new Error(`App not found: ${HTML}`);
const URL0 = pathToFileURL(HTML).href;
const OUT = join(HERE, 'public', 'captures');
mkdirSync(OUT, { recursive: true });
const PLAN = JSON.parse(readFileSync(join(HERE, 'captions.json'), 'utf8'));
const FPS = PLAN.fps;
const W = 1920, H = 1080;
const TAIL = 0.6; // extra seconds recorded after each shot (cross-fade overlap and safety)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---- Selectors: by id / class / role, never by label text (labels are being renamed) ----------------------
const SEL = {
  harmonized: async (page) => page.evaluate(() => {
    const radios = [...document.querySelectorAll('.fb-series [role="radio"]')];
    const el = radios[1] ?? [...document.querySelectorAll('button[title^="Harmonized"]')][0];
    if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }),
  // a point of the map canvas, as fractions of its box
  map: (fx, fy) => async (page) => page.evaluate((fx, fy) => {
    const c = document.querySelector('.fb-map canvas') ?? document.querySelector('#map canvas');
    if (!c) return null;
    const b = c.getBoundingClientRect(); return { x: b.x + fx * b.width, y: b.y + fy * b.height };
  }, fx, fy),
  // a calendar cell by the start of its accessible label ("October 2026: …"); falls back to the last measured cell
  cell: (re) => async (page) => page.evaluate((src) => {
    const cells = [...document.querySelectorAll('button[role="gridcell"]')];
    const el = cells.find((c) => new RegExp(src).test(c.getAttribute('aria-label') ?? '')) ?? cells[cells.length - 1];
    if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, label: el.getAttribute('aria-label') };
  }, re),
  // an element by CSS selector (centre, or a given fraction of its box)
  el: (css, fx = 0.5, fy = 0.5) => async (page) => page.evaluate((css, fx, fy) => {
    const el = document.querySelector(css); if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: b.x + fx * b.width, y: b.y + fy * b.height };
  }, css, fx, fy),
};

// ---- Shots: the hash opened, where the cursor starts, and the scripted actions (seconds from shot start) ----
const SHOTS = {
  argentina: {
    hash: 'tab=overview&z=argentina&v=raw', cursor: [1180, 560],
    async run(c) { await c.at(0.7); await c.glide(SEL.harmonized, 1.2); await c.at(2.35); await c.click(); },
  },
  canada: {
    hash: 'tab=overview&z=canada&v=raw', cursor: [1600, 120],
    async run(c) { await c.at(0.35); await c.glide(SEL.harmonized, 0.6); await c.at(1.15); await c.click(); },
  },
  calendar: {
    hash: 'tab=dash&z=argentina&l=rec&v=raw', cursor: [1180, 300],
    async run(c) {
      await c.at(0.5); await c.glide(SEL.harmonized, 1.1); await c.at(1.9); await c.click();
      // hovering a year lights that year's record places on the map (2020: since 2012; 2003: before 2012)
      await c.at(3.2); await c.glide(SEL.cell('^August 2020'), 1.0);
      await c.at(4.9); await c.glide(SEL.cell('^August 2003'), 1.2);
    },
  },
  place: {
    hash: 'tab=dash&z=canada', cursor: [700, 420],
    // click a place (2° box), "Zoom to it" in the selection chip, then the October 2026 cell of the calendar
    async run(c) {
      await c.at(0.15); await c.glide(SEL.map(0.3, 0.45), 0.75); await c.at(1.0); await c.click();
      await c.at(1.35); await c.glide(SEL.el('.fb-selchip button'), 0.5); await c.at(1.95); await c.click();
      await c.at(2.55); await c.glide(SEL.cell('^October 2026'), 0.8); await c.at(3.5); await c.click();
    },
  },
  evidence: {
    hash: 'tab=evidence&z=canada', cursor: [1300, 620],
    // the cursor comes to rest under the year-by-year panel's title ("Within ±10% in 13 of 14 years")
    async run(c) { await c.at(0.2); await c.glide(SEL.el('#fb-tabpanel', 0.885, 0.135), 1.3); },
  },
};

// ---- In-page cursor (drawn by the page, so the screencast records it) -------------------------------------
function installCursor() {
  if (document.getElementById('__vc')) return;
  const c = document.createElement('div');
  c.id = '__vc';
  c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))"><path d="M4.5 2.5v16.2l4.1-3.9 2.9 6.7 2.9-1.25-2.85-6.6h5.7z" fill="#15181c" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-200px,-200px)' });
  document.documentElement.appendChild(c);
  const move = (e) => { c.style.transform = `translate(${e.clientX - 6.4}px, ${e.clientY - 3.5}px)`; };
  window.addEventListener('mousemove', move, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('mousedown', (e) => {
    const r = document.createElement('div');
    Object.assign(r.style, { position: 'fixed', left: `${e.clientX - 26}px`, top: `${e.clientY - 26}px`, width: '52px', height: '52px', borderRadius: '50%',
      border: '3px solid oklch(0.49 0.11 250)', background: 'oklch(0.49 0.11 250 / 0.14)', zIndex: '2147483646', pointerEvents: 'none' });
    document.documentElement.appendChild(r);
    r.animate([{ transform: 'scale(0.35)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.9, offset: 0.45 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' })
      .finished.then(() => r.remove());
  }, true);
}

async function waitReady(page) {
  await page.waitForFunction(() => window.__fb && !window.__fb.pending && document.fonts.status === 'loaded', { timeout: 60000 });
  // the second country is decoded after the first paint; wait for it so no stall lands in the recording
  await page.waitForFunction(() => window.__fbDecodeMs !== undefined, { timeout: 60000 }).catch(() => {});
  await sleep(2200);
}

// If a tab key in the hash was renamed in a later build, open the tab by its position instead.
const TAB_INDEX = { overview: 0, dash: 1, evidence: 2, how: 3, method: 4 };
async function ensureTab(page, hash) {
  const want = new URLSearchParams(hash).get('tab');
  if (!want) return;
  const ok = await page.evaluate((w) => window.__fb?.st?.tab === w, want);
  if (ok) return;
  const done = await page.evaluate((i) => { const t = document.querySelectorAll('[role="tab"][id^="fb-tab-"]')[i]; if (t) t.click(); return !!t; }, TAB_INDEX[want]);
  console.log(`  note: tab "${want}" not taken from the hash; ${done ? 'opened it by position' : 'tab not found'}`);
  await sleep(1800);
}

function encode(frames, path) {
  return new Promise((ok, ko) => {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-g', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path], { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.on('error', ko);
    ff.on('close', (code) => (code === 0 ? ok() : ko(new Error(`ffmpeg exited ${code} for ${path}`))));
    (async () => {
      for (const f of frames) { if (!ff.stdin.write(f)) await new Promise((r) => ff.stdin.once('drain', r)); }
      ff.stdin.end();
    })();
  });
}

async function record(browser, id, spec, dur) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setBypassCSP(true);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(`${URL0}#${spec.hash}`, { waitUntil: 'load', timeout: 120000 });
  await waitReady(page);
  await ensureTab(page, spec.hash);
  await page.evaluate(installCursor);
  let pos = { x: spec.cursor[0], y: spec.cursor[1] };
  await page.mouse.move(pos.x, pos.y);
  await sleep(300);
  await page.screenshot({ path: join(OUT, `${id}-start.png`) });

  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', (e) => {
    frames.push({ ts: e.metadata.timestamp, data: Buffer.from(e.data, 'base64') });
    cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 93, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  // nudge a repaint so the first frame arrives at once
  await page.mouse.move(pos.x + 1, pos.y); await page.mouse.move(pos.x, pos.y);
  await sleep(500);
  const t0 = Date.now();
  const log = [];
  const c = {
    at: async (s) => { const ms = t0 + s * 1000 - Date.now(); if (ms > 0) await sleep(ms); },
    glide: async (target, s) => {
      let to = typeof target === 'function' ? await target(page) : target;
      for (let k = 0; !to && k < 40; k++) { await sleep(50); to = await target(page); } // wait up to 2 s for it to appear
      if (!to) throw new Error(`${id}: target not found`);
      if (to.label) log.push({ t: (Date.now() - t0) / 1000, hover: to.label });
      const from = { ...pos }, start = Date.now(), n = Math.max(10, Math.round(s * 60));
      for (let i = 1; i <= n; i++) {
        const k = ease(i / n);
        await page.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
        const wait = start + (i * s * 1000) / n - Date.now(); if (wait > 0) await sleep(wait);
      }
      pos = { x: to.x, y: to.y };
    },
    click: async () => {
      log.push({ t: (Date.now() - t0) / 1000, click: [Math.round(pos.x), Math.round(pos.y)] });
      await page.mouse.down(); await sleep(90); await page.mouse.up();
    },
  };
  await spec.run(c);
  await c.at(dur + TAIL);
  await cdp.send('Page.stopScreencast');
  await sleep(150);
  const facts = await page.evaluate(() => ({
    hash: location.hash,
    state: window.__fb ? { zone: window.__fb.zoneName, hero: window.__fb.hero, view: window.__fb.st.view, uncertain: window.__fb.uncertain } : null,
    text: (document.querySelector('header')?.innerText ?? '') + '\n' + (document.querySelector('#fb-tabpanel')?.innerText ?? document.body.innerText),
  }));
  await page.screenshot({ path: join(OUT, `${id}-end.png`) });
  await ctx.close();

  // resample to a constant frame rate: frame k shows the latest screencast frame at t0 + k / FPS
  const tStart = t0 / 1000;
  const n = Math.round((dur + TAIL) * FPS);
  const out = [];
  let j = 0;
  if (!frames.length) throw new Error(`${id}: no screencast frames`);
  for (let k = 0; k < n; k++) {
    const t = tStart + k / FPS;
    while (j + 1 < frames.length && frames[j + 1].ts <= t) j++;
    out.push(frames[j].data);
  }
  const real = frames.filter((f) => f.ts >= tStart && f.ts <= tStart + dur).length;
  await encode(out, join(OUT, `${id}.mp4`));
  console.log(`  ${id}: ${n} frames (${(n / FPS).toFixed(2)} s), ${real} distinct screencast frames (${(real / dur).toFixed(0)}/s) · ${facts.hash}`);
  return { ...facts, log, duration: (n / FPS) };
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`],
});
const factsPath = join(OUT, 'facts.json');
const allFacts = existsSync(factsPath) ? JSON.parse(readFileSync(factsPath, 'utf8')) : {};
allFacts._html = HTML;
const started = Date.now();
console.log(`Capturing from ${HTML}`);
try {
  for (const shot of PLAN.shots) {
    const spec = SHOTS[shot.id];
    if (!spec || (only && !only.includes(shot.id))) continue;
    allFacts[shot.id] = await record(browser, shot.id, spec, shot.end - shot.start);
  }
} finally {
  await browser.close();
}
writeFileSync(factsPath, JSON.stringify(allFacts, null, 1));
console.log(`Captured in ${Math.round((Date.now() - started) / 1000)} s → ${OUT}`);
