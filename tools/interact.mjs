// V5 interaction script (SPEC_V5 §10): tabs, zone popover (keyboard too), the global switch incl. hold-to-peek (pointer
// and R key), layers, map click / Shift+drag / wheel / keys, linked highlights both ways, month selection and its chip,
// Evidence panel switch, stepper (buttons, keys, dots), exports, deep links, reduced motion. Counts console errors and
// any non-file request. Exit 1 on any failed check.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const here = new URL('..', import.meta.url).pathname;
const url = 'file://' + (process.env.FB_HTML || here + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const errs = [], reqs = []; let fails = 0, passes = 0;
const ok = (cond, what, extra = '') => { if (cond) passes++; else fails++; console.log((cond ? 'PASS ' : 'FAIL ') + what + (extra ? ' — ' + extra : '')); };
const page = async (hash, w = 1366, h = 768, opts = {}) => {
  const p = await b.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('request', (r) => { if (!/^(data|blob|file):/.test(r.url())) reqs.push(r.url()); });
  await p.setViewport({ width: w, height: h });
  if (opts.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const dl = here + '.scratch/dl'; fs.mkdirSync(dl, { recursive: true });
  const cdp = await p.target().createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl }).catch(() => {});
  await p.goto(url + '#' + hash, { waitUntil: 'load' }); await sleep(opts.wait || 2200);
  return p;
};
const txt = (p, s) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, s);
const hash = (p) => p.evaluate(() => decodeURIComponent(location.hash));

// ── tabs: click, arrow keys, number keys; only the visible tab rendered; hash
{
  const p = await page('z=canada');
  for (const t of ['evidence', 'how', 'method', 'dash']) { await p.click('#fb-tab-' + t); await sleep(500); ok((await p.$eval('#fb-tabpanel', (e) => e.className)).includes('is-' + t), 'tab ' + t + ' shown', await hash(p)); }
  ok(!(await p.$('.fb-evgrid')) && !(await p.$('.fb-doc')), 'only the visible tab is rendered');
  await p.focus('#fb-tab-dash'); await p.keyboard.press('ArrowRight'); await sleep(400);
  ok((await p.evaluate(() => document.activeElement.id)) === 'fb-tab-evidence', 'arrow key moves to the next tab and focus follows');
  await p.keyboard.press('Home'); await sleep(300);
  await p.mouse.click(5, 300); await p.keyboard.press('4'); await sleep(400); ok((await hash(p)).includes('tab=how'), 'key 4 opens How it works (v6: 1 is the Overview)');
  await p.keyboard.press('2'); await sleep(400);
  // ── zone popover: open, arrows, Escape returns focus; preset with live verdicts
  await p.click('.fb-zonebtn'); await sleep(250);
  ok(await p.$eval('#fb-zone-pop', (e) => e.matches(':popover-open')), 'zone popover opens');
  const facts = await p.$$eval('.fb-preset2-f', (es) => es.map((e) => e.textContent));
  ok(facts.length >= 8 && facts.every((f) => f.length > 0), 'presets show live verdicts', facts.slice(0, 3).join(' | '));
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await sleep(100);
  ok((await p.evaluate(() => document.activeElement.className)).includes('fb-preset2'), 'arrow keys move inside the menu');
  await p.keyboard.press('Escape'); await sleep(200);
  ok((await p.evaluate(() => document.activeElement.className)) === 'fb-zonebtn', 'Escape closes and returns focus to the zone button');
  await p.click('.fb-zonebtn'); await sleep(250);
  await p.evaluate(() => [...document.querySelectorAll('.fb-preset2')].find((e) => /Boreal/.test(e.textContent)).click()); await sleep(900);
  ok((await txt(p, '.fb-zone-name')).includes('Boreal'), 'preset Boreal Québec selected', await txt(p, '.fb-vz-answer'));
  ok((await hash(p)).includes('b=47.5,52.5,-80,-68'), 'zone in the hash');
  // ── switch: tap Raw, H, hold-to-peek (pointer), R hold and tap
  await p.goto(url + '#z=canada', { waitUntil: 'load' }); await sleep(3000);
  const calRaw = async () => p.evaluate(() => document.querySelector('.fb-series .fb-series-i.is-on').textContent);
  await p.click('.fb-series .fb-series-i:nth-child(1)'); await sleep(500);
  ok((await calRaw()) === 'Raw' && (await hash(p)).includes('v=raw'), 'tap Raw switches to raw everywhere');
  await p.keyboard.press('h'); await sleep(500); ok((await calRaw()) === 'Harmonized', 'H switches back to harmonized');
  const rb = await p.$('.fb-series .fb-series-i:nth-child(1)'); const bb = await rb.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await sleep(450);
  const during = await calRaw(); await p.mouse.up(); await sleep(400);
  ok(during === 'Raw' && (await calRaw()) === 'Harmonized', 'hold Raw peeks, release returns to harmonized', during);
  await p.mouse.click(5, 400); await p.keyboard.down('r'); await sleep(450); const rDuring = await calRaw(); await p.keyboard.up('r'); await sleep(400);
  ok(rDuring === 'Raw' && (await calRaw()) === 'Harmonized', 'hold R peeks, release returns');
  await p.keyboard.press('r'); await sleep(500); ok((await calRaw()) === 'Raw', 'tap R switches to raw'); await p.keyboard.press('h'); await sleep(400);
  // ── layers (radio group, arrows)
  for (const [k, l] of [[3, 'ratio'], [4, 'month'], [2, 'rec'], [1, 'det']]) { await p.click('.fb-layerctl .fb-layerbtn:nth-child(' + k + ')'); await sleep(350); ok((await p.$eval('.fb-layerctl [aria-checked="true"]', (e) => e.textContent)).length > 0 && ((await hash(p)).includes('l=' + l) || l === 'det'), 'layer ' + l); }
  await p.focus('.fb-layerctl [aria-checked="true"]'); await p.keyboard.press('ArrowRight'); await sleep(350);
  ok((await p.evaluate(() => document.activeElement.getAttribute('aria-checked'))) === 'true' && (await hash(p)).includes('l=rec'), 'arrow key changes layer and keeps focus');
  await p.click('.fb-layerctl .fb-layerbtn:nth-child(1)'); await sleep(300);
  // ── map: click → 2° box, Shift+drag → drawn box, wheel zoom, keys
  const mv = await p.$eval('.fb-mappanel .fb-map-view', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.click(mv.x + mv.w * 0.32, mv.y + mv.h * 0.45); await sleep(900);
  const b1 = (await hash(p)).match(/b=([^&]+)/)[1].split(',').map(Number);
  ok(Math.abs(b1[1] - b1[0] - 2) < 1e-6 && Math.abs(b1[3] - b1[2] - 2) < 1e-6, 'click selects a 2°×2° box', b1.join(','));
  await p.keyboard.down('Shift'); await p.mouse.move(mv.x + mv.w * 0.3, mv.y + mv.h * 0.45); await p.mouse.down(); await p.mouse.move(mv.x + mv.w * 0.45, mv.y + mv.h * 0.6, { steps: 8 }); await p.mouse.up(); await p.keyboard.up('Shift'); await sleep(900);
  const b2 = (await hash(p)).match(/b=([^&]+)/)[1];
  ok(b2 !== b1.join(','), 'Shift+drag draws a box', b2);
  const v0 = await p.$eval('.fb-mappanel .fb-map-view', (e) => e.getAttribute('data-view'));
  await p.mouse.move(mv.x + mv.w / 2, mv.y + mv.h / 2); for (let i = 0; i < 3; i++) { await p.mouse.wheel({ deltaY: -150 }); await sleep(60); } await sleep(500);
  const v1 = await p.$eval('.fb-mappanel .fb-map-view', (e) => e.getAttribute('data-view'));
  ok(+v1.split(',')[2] > +v0.split(',')[2], 'wheel zooms in', v0 + ' → ' + v1);
  await p.evaluate(() => document.querySelector('.fb-mappanel .fb-map-svg').focus()); const bk0 = (await hash(p)).match(/b=([^&]+)/)[1]; await p.keyboard.press('ArrowUp'); await sleep(600);
  ok((await hash(p)).match(/b=([^&]+)/)[1] !== bk0, 'arrow key nudges the box');
  await p.keyboard.press('0'); await sleep(600);
  // ── linked highlights: calendar year → map; map place → calendar column
  await p.goto(url + '#z=canada&anim=0&l=rec', { waitUntil: 'load' }); await sleep(2000);
  await (await p.$('.fb-calpanel .at-cal-cells [data-key="2023-07"]')).hover(); await sleep(250);
  ok(/2023: a record in \d+/.test((await txt(p, '.fb-hlchip')) || ''), 'hover a calendar year lights its record places', await txt(p, '.fb-hlchip'));
  let marked = '';
  for (const fx of [0.3, 0.35, 0.4, 0.45, 0.5]) { await p.mouse.move(mv.x + mv.w * fx, mv.y + mv.h * 0.5); await sleep(150); marked = await p.evaluate(() => [...document.querySelectorAll('.fb-calpanel style')].map((s) => s.textContent).join('')); if (marked) break; }
  ok(/data-key\^="\d{4}-"/.test(marked), 'hover a map place outlines its record-year column');
  // ── month selection: click a cell → chip with ×; This-month layer and Evidence follow
  await p.click('.fb-calpanel .at-cal-cells [data-key="2019-06"]'); await sleep(400);
  ok(/Jun(e)? 2019/.test((await txt(p, '.fb-monthchip')) || '') && (await hash(p)).includes('m=2019-06'), 'calendar click selects the month and shows a chip');
  await p.click('.fb-layerctl .fb-layerbtn:nth-child(4)'); await sleep(400);
  ok(((await txt(p, '.fb-mappanel')) || '').includes('June 2019'), 'This-month layer follows the selection');
  await p.click('#fb-tab-evidence'); await sleep(600);
  ok(((await txt(p, '.fb-evmonth')) || '').includes('June'), 'Evidence month panel follows the selection');
  await p.click('#fb-tab-dash'); await sleep(500);
  await p.click('.fb-monthchip button'); await sleep(400);
  ok(!(await hash(p)).includes('m=2019-06'), 'chip × clears the month');
  // ── Evidence: panel 4 switch; empty state
  await p.goto(url + '#z=canada&tab=evidence', { waitUntil: 'load' }); await sleep(1800);
  await p.evaluate(() => [...document.querySelectorAll('.fb-evpanel .fb-seg2-i')].find((e) => /Official/.test(e.textContent)).click()); await sleep(400);
  ok(((await txt(p, '#ev4')) || '').toLowerCase().includes('official'), 'Evidence: Official series panel', await txt(p, '#ev4'));
  // ── stepper: Next, Previous, keys, dots, hash
  await p.click('#fb-tab-how'); await sleep(500);
  await p.evaluate(() => [...document.querySelectorAll('.fb-how-nav button')].find((e) => /Next/.test(e.textContent)).click()); await sleep(400);
  ok((await hash(p)).includes('step=2'), 'Next → step 2');
  await p.mouse.click(5, 300); await p.keyboard.press('ArrowRight'); await sleep(400); ok((await hash(p)).includes('step=3'), 'ArrowRight → step 3');
  await p.keyboard.press('ArrowLeft'); await sleep(400); ok((await hash(p)).includes('step=2'), 'ArrowLeft → step 2');
  await p.click('.fb-dots li:nth-child(4) button'); await sleep(400); ok((await hash(p)).includes('step=4'), 'dot → step 4');
  // ── exports (downloads, no network)
  await p.click('#fb-tab-dash'); await sleep(500);
  const dl = here + '.scratch/dl'; for (const f of fs.readdirSync(dl)) fs.unlinkSync(dl + '/' + f);
  for (const k of ['Series CSV', 'Calendar image (SVG)', 'Calendar image (PNG)', 'Map layer (CSV)']) {
    await p.click('.fb-morebtn'); await sleep(200);
    await p.evaluate((k) => [...document.querySelectorAll('#fb-more button')].find((e) => e.textContent.startsWith(k)).click(), k); await sleep(700);
  }
  const files = fs.readdirSync(dl);
  ok(files.length >= 4, 'four exports downloaded', files.join(', '));
  await p.click('.fb-morebtn'); await sleep(200);
  ok(((await txt(p, '#fb-more')) || '').includes('NASA FIRMS · MODIS + VIIRS'), 'data line lives in the ⋯ menu'); await p.keyboard.press('Escape');
  await p.close();
}

// ── v6.2 first-visit guide (P3) and glossary (P4)
{
  const p = await page('z=canada');
  ok(!!(await p.$('.fb-guide')), 'guide shown on the dashboard (no anim=0)');
  await p.hover('.fb-guide-s:nth-child(1)'); await sleep(150);
  ok((await p.evaluate(() => document.querySelector('.fb-app').getAttribute('data-guide'))) === 'map', 'guide step 1 outlines the map');
  await p.click('.fb-guide-x'); await sleep(300);
  ok(!(await p.$('.fb-guide')), 'guide dismissed');
  await p.click('#fb-tab-evidence'); await sleep(300); await p.click('#fb-tab-dash'); await sleep(400);
  ok(!(await p.$('.fb-guide')), 'guide stays dismissed for the session');
  await p.click('.fb-wordsbtn'); await sleep(300);
  ok((await p.$$eval('#fb-words dt', (e) => e.length)) === 6, 'Words: six entries');
  await p.keyboard.press('Escape'); await sleep(200);
  ok((await p.evaluate(() => document.activeElement.className)).includes('fb-wordsbtn'), 'Words: Esc closes and returns focus');
  await p.close();
  const q = await page('z=canada&anim=0'); ok(!(await q.$('.fb-guide')), 'guide hidden with anim=0'); await q.close();
  const r = await page('z=canada&anim=0&guide=1'); ok(!!(await r.$('.fb-guide')), 'guide=1 shows it with anim=0'); await r.close();
}
// ── v6.2 date range: Month + Year selects (From ≤ To by disabled options), presets, Reset, immediate apply, Esc
{
  const p = await page('z=canada');
  await p.click('.fb-rangebtn'); await sleep(300);
  ok((await p.evaluate(() => document.activeElement.getAttribute('aria-label'))) === 'From month', 'range: focus starts on From month');
  const setSel = (i, v) => p.evaluate(([i, v]) => { const el = document.querySelectorAll('.fb-range2 select')[i]; const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value'); d.set.call(el, String(v)); el.dispatchEvent(new Event('change', { bubbles: true })); }, [i, v]);
  await setSel(1, 2010); await sleep(250);
  ok((await hash(p)).includes('f=2010-01') && (await p.evaluate(() => document.querySelector('#fb-range-pop').matches(':popover-open'))), 'range: From year applies at once, popover stays open', await hash(p));
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll('.fb-range2 select')[3].options]; return o.filter((x) => +x.value < 2010).every((x) => x.disabled) && !o.find((x) => x.value === '2010').disabled; }), 'range: To years before From are disabled');
  await setSel(3, 2025); await sleep(150);
  ok(await p.evaluate(() => [...document.querySelectorAll('.fb-range2 select')[2].options].every((x) => x.disabled === (+x.value > 12))), 'range: months after the record end disabled in its last year (record ends Dec)');
  await p.evaluate(() => [...document.querySelectorAll('.fb-range2-pre .fb-chip')].find((e) => /Last 5/.test(e.textContent)).click()); await sleep(250);
  ok((await hash(p)).includes('f=2021-01') && /2021/.test(await txt(p, '.fb-rangebtn')), 'range: "Last 5 years" preset', await txt(p, '.fb-rangebtn'));
  await p.evaluate(() => document.querySelector('.fb-range2-reset').click()); await sleep(250);
  ok(!(await hash(p)).includes('f='), 'range: Reset returns to All');
  await p.keyboard.press('Escape'); await sleep(200);
  ok((await p.evaluate(() => document.activeElement.className)).includes('fb-rangebtn'), 'range: Esc closes and returns focus to the button');
  await p.close();
}
// ── Overview (v6): the bare URL opens it; one h1; its toggle is the app country; hold-to-see-raw (R key, pointer,
// aria-pressed); the primary button opens the dashboard; any hash state opens where it points.
{
  const p = await page('');
  ok(await p.evaluate(() => window.__fb.st.tab === 'overview'), 'bare URL opens the Overview');
  ok(await p.evaluate(() => document.querySelectorAll('h1').length === 1), 'Overview: one h1');
  ok(/Canada/.test(await txt(p, '.fb-ov-h')), 'Overview headline names Canada', await txt(p, '.fb-ov-h'));
  await p.evaluate(() => [...document.querySelectorAll('.fb-ov [role=radio]')].find((e) => /Argentina/.test(e.textContent)).click()); await sleep(700);
  ok(await p.evaluate(() => window.__fb.st.country === 'argentina'), 'Overview toggle sets the app country');
  ok(/Argentina/.test(await txt(p, '.fb-ov-h')), 'headline follows the toggle', await txt(p, '.fb-ov-h'));
  ok(/No independent official series for Argentina/.test(await txt(p, '.fb-ov-check')), 'Argentina: the no-official-series line');
  const pressed = () => p.$eval('.fb-ov-holdbtn', (e) => e.getAttribute('aria-pressed'));
  await p.keyboard.down('r'); await sleep(300); ok((await pressed()) === 'true', 'R held: raw shown'); await p.keyboard.up('r'); await sleep(300);
  ok((await pressed()) === 'false', 'R released: harmonized again');
  const bb = await p.$eval('.fb-ov-holdbtn', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(bb.x, bb.y); await p.mouse.down(); await sleep(350); ok((await pressed()) === 'true', 'pointer hold: raw shown'); await p.mouse.up(); await sleep(350);
  ok((await pressed()) === 'false', 'pointer release: harmonized again');
  await p.click('.fb-ov-open'); await sleep(700); ok(await p.evaluate(() => window.__fb.st.tab === 'dash'), 'primary button opens the dashboard', await hash(p));
  await p.close();
  const q = await page('z=canada&tab=evidence'); ok(await q.evaluate(() => window.__fb.st.tab === 'evidence'), 'a hash state opens where it points'); await q.close();
}

// ── map click robustness (audit-v5 §3.8): 5 px slip between press and release; click 50–250 ms after a flip, a layer
// change and a return to the Dashboard (when View Transitions used to swallow input). Every one must select a box.
{
  const conds = [
    ['slip 5 px', async () => {}, async (p, x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 5, y + 2, { steps: 2 }); await p.mouse.up(); }],
    ['50 ms after flip to Harmonized', async (p) => { await p.keyboard.press('r'); await sleep(500); await p.keyboard.press('h'); await sleep(50); }],
    ['150 ms after a layer change', async (p) => { await p.click('.fb-layerctl .fb-layerbtn:nth-child(2)'); await sleep(150); }],
    ['100 ms after returning to the Dashboard', async (p) => { await p.click('#fb-tab-evidence'); await sleep(500); await p.click('#fb-tab-dash'); await sleep(100); }],
  ];
  for (const [name, setup, click] of conds) {
    let fails = 0;
    for (let i = 0; i < 4; i++) {
      const p = await page('z=canada', 1440, 900, { wait: 2000 });
      const mv = await p.$eval('.fb-mappanel .fb-map-view', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await setup(p);
      const b0 = await hash(p); const x = mv.x + mv.w * (0.3 + i * 0.05), y = mv.y + mv.h * 0.55;
      if (click) await click(p, x, y); else await p.mouse.click(x, y);
      await sleep(700); if ((await hash(p)) === b0) fails++;
      await p.close();
    }
    ok(fails === 0, 'map click: ' + name + ' (4 clicks)', fails + ' failed');
  }
}
// ── map interaction model (v5.1c): 100 clicks on places → 100 selections, view unchanged; no-data clicks, pan and wheel
// never change the zone; draw start / draw / cancel; move and resize snap to 0.5°; undo; frame rate at 4× CPU.
{
  const p = await page('z=canada&l=rec&guide=0', 1440, 900, { wait: 2500 }); // v6.2: Record years and no guide keep this block's v6.1 geometry (its pan starts at the map centre, which must not land on the selection edge); the Detections default and the guide are tested elsewhere
  const mv = await p.$eval('.fb-mappanel .fb-map-view', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.w || r.width, h: r.h || r.height }; });
  const B = async () => (await hash(p)).match(/b=([^&]+)/)[1];
  const V = () => p.$eval('.fb-mappanel .fb-map-view', (e) => e.getAttribute('data-view'));
  // candidate points over data (hover outline present), spread over the map
  const pts = [];
  for (let gy = 0.25; gy <= 0.8; gy += 0.05) for (let gx = 0.05; gx <= 0.8; gx += 0.04) {
    await p.mouse.move(mv.x + mv.w * gx, mv.y + mv.h * gy);
    if (await p.$('.fb-hovcell')) pts.push([gx, gy]);
  }
  let okSel = 0, viewSame = 0, n = 0; const setups = [async () => {}, async () => { await p.keyboard.press('r'); await sleep(300); await p.keyboard.press('h'); }, async () => { await p.click('.fb-layerctl .fb-layerbtn:nth-child(2)'); await sleep(40); await p.click('.fb-layerctl .fb-layerbtn:nth-child(1)'); }, async () => { await p.click('#fb-tab-evidence'); await sleep(250); await p.click('#fb-tab-dash'); }];
  for (let i = 0; i < 200 && n < 100 && pts.length; i++) {
    const [gx, gy] = pts[(i * 37) % pts.length];
    if (i % 25 === 0 && i) { await p.mouse.move(mv.x + mv.w / 2, mv.y + mv.h / 2); await p.mouse.wheel({ deltaY: i % 50 ? -120 : 120 }); await sleep(400); }
    await setups[i % 4](); await sleep((i * 53) % 500);
    const b0 = await B(), v0 = await V();
    const x = mv.x + mv.w * gx, y = mv.y + mv.h * gy, j = i % 6;
    if (!(await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('.fb-map-view')); }, [x, y]))) continue;
    await p.mouse.move(x, y); await sleep(30);
    if (!(await p.$('.fb-hovcell'))) continue; // the view moved (zoom): this point is not over data now
    n++;
    await p.mouse.down(); if (j) await p.mouse.move(x + j * 0.8, y + j * 0.6, { steps: 2 }); await p.mouse.up();
    await sleep(450);
    const b1 = await B(); const nb = b1.split(',').map(Number);
    if (b1 !== b0 || (nb[1] - nb[0] === 2 && nb[3] - nb[2] === 2)) okSel++;
    if ((await V()) === v0) viewSame++;
  }
  ok(n === 100 && okSel === n, 'map: clicks on places select a 2° box (' + okSel + ' of ' + n + ', jitter 0–5 px, 0–500 ms after flip / layer / tab)');
  ok(viewSame === n, 'map: a click never moves the view (' + viewSame + ' of ' + n + ')');
  // no-data clicks
  await p.click('.fb-zoomctl [aria-label="Fit country"]').catch(() => {}); await sleep(500);
  let nd = 0, ndOk = 0;
  for (const [gx, gy] of [[0.9, 0.1], [0.95, 0.5], [0.5, 0.95], [0.05, 0.95], [0.6, 0.05]]) {
    const x = mv.x + mv.w * gx, y = mv.y + mv.h * gy; await p.mouse.move(x, y); await sleep(30);
    if (await p.$('.fb-hovcell')) continue;
    if (!(await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('.fb-map-view') && !e.closest('.fb-zoomctl, .fb-layerctl, .fb-selchip')); }, [x, y]))) continue;
    nd++; const b0 = await B(); await p.mouse.click(x, y); await sleep(450); if ((await B()) === b0) ndOk++;
  }
  ok(nd > 0 && ndOk === nd, 'map: clicks with no data never change the zone (' + ndOk + ' of ' + nd + ')', await txt(p, '.fb-maphint'));
  // pan and wheel
  { const b0 = await B(); await p.mouse.move(mv.x + mv.w * 0.5, mv.y + mv.h * 0.5); await p.mouse.down(); await p.mouse.move(mv.x + mv.w * 0.4, mv.y + mv.h * 0.4, { steps: 8 }); await p.mouse.up(); for (let i = 0; i < 3; i++) { await p.mouse.wheel({ deltaY: -120 }); await sleep(50); } await sleep(500); ok((await B()) === b0, 'map: pan and wheel never change the zone'); }
  // draw: start, draw, apply; start, Esc cancel
  await p.click('.fb-zoomctl [aria-label="Fit country"]').catch(() => {}); await sleep(500);
  await p.click('.fb-drawbtn'); await sleep(150);
  ok((await txt(p, '.fb-maphint')).includes('Drag to draw'), 'map: draw mode shows its instruction');
  await p.mouse.move(mv.x + mv.w * 0.45, mv.y + mv.h * 0.3); await p.mouse.down(); await p.mouse.move(mv.x + mv.w * 0.6, mv.y + mv.h * 0.45, { steps: 8 });
  const liveLab = await txt(p, '.fb-sel-label'); await p.mouse.up(); await sleep(500);
  const db = (await B()).split(',').map(Number);
  ok(db.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9) && (await p.$eval('.fb-drawbtn', (e) => e.getAttribute('aria-pressed'))) === 'false', 'map: draw applies a 0.5°-snapped box and leaves draw mode', db.join(',') + ' · live label ' + liveLab);
  await p.click('.fb-drawbtn'); await sleep(100); await p.keyboard.press('Escape'); await sleep(100);
  ok((await p.$eval('.fb-drawbtn', (e) => e.getAttribute('aria-pressed'))) === 'false', 'map: Esc cancels draw mode');
  // resize by the east edge, move by dragging inside
  const R = await p.evaluate(() => { const r = document.querySelector('.fb-sel').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const b0 = (await B()).split(',').map(Number);
  await p.mouse.move(R.x + R.w, R.y + R.h / 2); await p.mouse.down(); await p.mouse.move(R.x + R.w + 50, R.y + R.h / 2, { steps: 6 }); await p.mouse.up(); await sleep(500);
  const b1 = (await B()).split(',').map(Number);
  ok(b1[3] > b0[3] && b1[0] === b0[0] && b1[2] === b0[2] && Math.abs(b1[3] * 2 - Math.round(b1[3] * 2)) < 1e-9, 'map: dragging the east edge resizes, snapped', b0.join(',') + ' → ' + b1.join(','));
  const R2 = await p.evaluate(() => { const r = document.querySelector('.fb-sel').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.move(R2.x + R2.w / 2, R2.y + R2.h / 2); await p.mouse.down(); await p.mouse.move(R2.x + R2.w / 2 + 30, R2.y + R2.h / 2 + 20, { steps: 6 }); await p.mouse.up(); await sleep(500);
  const b2 = (await B()).split(',').map(Number);
  ok(Math.abs((b2[1] - b2[0]) - (b1[1] - b1[0])) < 1e-9 && Math.abs((b2[3] - b2[2]) - (b1[3] - b1[2])) < 1e-9 && b2.join() !== b1.join(), 'map: dragging inside moves the box, size kept', b1.join(',') + ' → ' + b2.join(','));
  // undo (footer link) and Ctrl+Z
  await p.evaluate(() => [...document.querySelectorAll('.fb-maphint button')].find((e) => /Back to/.test(e.textContent)).click()); await sleep(500);
  ok((await B()) === b1.join(','), 'map: "Back to …" restores the previous zone');
  await p.evaluate(() => document.querySelector('.fb-map-svg').focus()); await p.keyboard.press('ArrowUp'); await sleep(400);
  await p.keyboard.down('Control'); await p.keyboard.press('z'); await p.keyboard.up('Control'); await sleep(500);
  ok((await B()) === b1.join(','), 'map: Ctrl+Z on the focused map undoes the last zone change');
  // frame rate at 4× CPU during pan, wheel zoom and a resize drag
  const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const fps = async (act) => { const pr = p.evaluate(() => new Promise((r) => { const ts = []; const t0 = performance.now(); (function f(t) { ts.push(t); if (t - t0 < 1200) requestAnimationFrame(f); else r(Math.round((ts.length - 1) / ((ts.at(-1) - ts[0]) / 1000))); })(t0); })); await sleep(20); await act(); return pr; };
  const fPan = await fps(async () => { await p.mouse.move(mv.x + mv.w * 0.5, mv.y + mv.h * 0.6); await p.mouse.down(); await p.mouse.move(mv.x + mv.w * 0.3, mv.y + mv.h * 0.5, { steps: 30 }); await p.mouse.up(); });
  const fZoom = await fps(async () => { for (let i = 0; i < 6; i++) { await p.mouse.wheel({ deltaY: i < 3 ? -100 : 100 }); await sleep(60); } });
  const R3 = await p.evaluate(() => { const e = document.querySelector('.fb-sel'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const fRes = R3 ? await fps(async () => { await p.mouse.move(R3.x + R3.w, R3.y + R3.h / 2); await p.mouse.down(); await p.mouse.move(R3.x + R3.w + 80, R3.y + R3.h / 2, { steps: 30 }); await p.mouse.up(); }) : 0;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok(fPan >= 50 && fZoom >= 50 && fRes >= 50, 'map at 4× CPU: pan ' + fPan + ' fps, wheel zoom ' + fZoom + ' fps, resize ' + fRes + ' fps (target ≥ 50)');
  await p.close();
}
// ── deep links restore tab, zone, layer, month, dates, step, calendar view
{
  const p = await page('c=argentina&b=-30,-28,-68,-66&l=month&m=2020-09&f=2010-01&t=2020-12&tab=how&step=3&cv=anomaly');
  const h = await hash(p);
  ok(h.includes('tab=how') && h.includes('step=3') && (await p.$eval('.fb-dots [aria-current="step"]', (e) => e.textContent)).includes('3'), 'deep link: tab + step');
  await p.click('#fb-tab-dash'); await sleep(600);
  ok((await txt(p, '.fb-layerctl [aria-checked="true"]')) === 'This month' && /Sep(tember)? 2020/.test((await txt(p, '.fb-monthchip')) || ''), 'deep link: layer + month');
  ok(((await txt(p, '.fb-rangebtn')) || '').includes('2010'), 'deep link: dates', await txt(p, '.fb-rangebtn'));
  ok((await p.$eval('.fb-calpanel .fb-seg2 [aria-checked="true"]', (e) => e.textContent)) === 'Anomaly', 'deep link: anomaly view');
  await p.close();
}
// ── reduced motion: no animation runs on tab, flip, zone
{
  const p = await page('z=canada', 1366, 768, { reduced: true });
  await p.click('#fb-tab-evidence'); await sleep(30); const a1 = await p.evaluate(() => document.getAnimations().length);
  await p.click('#fb-tab-dash'); await sleep(400); await p.keyboard.press('r'); await sleep(30); const a2 = await p.evaluate(() => document.getAnimations().length);
  await p.click('.fb-zonebtn'); await sleep(30); const a3 = await p.evaluate(() => document.getAnimations().length);
  ok(a1 + a2 + a3 === 0, 'reduced motion: no animation on tab, flip or popover', [a1, a2, a3].join(','));
  await p.close();
}
// ── motion on: tab change uses a view transition, nothing infinite
{
  const p = await page('z=canada');
  await p.click('#fb-tab-evidence'); await sleep(40);
  const an = await p.evaluate(() => document.getAnimations().map((a) => a.effect && a.effect.getTiming ? a.effect.getTiming().iterations : 1));
  ok(an.every((n) => n !== Infinity), 'no infinite animation', an.length + ' running');
  await p.close();
}
ok(errs.length === 0, 'no console errors', errs.slice(0, 3).join(' | '));
ok(reqs.length === 0, 'no network requests', reqs.slice(0, 3).join(' | '));
console.log(`${passes} passed, ${fails} failed`);
await b.close();
process.exit(fails ? 1 : 0);
