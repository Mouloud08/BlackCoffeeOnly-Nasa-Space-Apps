// Calendar header fit (v6.2): with the longest month names selected, at calendar panel widths 320–1200 px (20 px steps),
// both themes, Counts and Anomaly. Every width: each header child fully visible and inside the header, no two
// overlapping. From 560 px: ONE row (all children on the first line), the same header height with and without a
// selected month, and the title and the Counts/Anomaly control at the same x in both. Also: the "Terra only" note never
// overlaps the seam labels (MODIS × r | VIIRS).
import puppeteer from 'puppeteer-core';
const url = 'file://' + (process.env.FB_HTML || new URL('..', import.meta.url).pathname + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let n = 0, bad = 0; const forms = {};
const probe = () => {
  const h = document.querySelector('.fb-calhead'); const H = h.getBoundingClientRect();
  const kids = [...h.querySelectorAll(':scope > *')].filter((e) => !e.classList.contains('fb-hprobes') && e.getBoundingClientRect().width > 0);
  const errs = [];
  const boxes = kids.map((e) => (e.classList.contains('fb-monthslot') ? e.querySelector('.fb-monthchip') : e)).filter(Boolean).map((e) => ({ e, r: e.getBoundingClientRect() }));
  for (const { e, r } of boxes) {
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') errs.push('clip ' + e.className);
    if (r.left < H.left - 1 || r.right > H.right + 1) errs.push('outside ' + e.className);
    e.querySelectorAll('*').forEach((c) => { if (c.children.length === 0 && c.scrollWidth > c.clientWidth + 1 && getComputedStyle(c).overflow !== 'visible' && !c.classList.contains('sr-only')) errs.push('clip ' + c.className); });
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i].r, c = boxes[j].r; if (a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1) errs.push('overlap ' + boxes[i].e.className + ' / ' + boxes[j].e.className); }
  const mids = boxes.map(({ r }) => r.top + r.height / 2);
  const rows = mids.length ? Math.max(...mids) - Math.min(...mids) : 0;
  const note = document.querySelector('.fb-terranote'), seams = [...document.querySelectorAll('.fb-seam span')];
  if (note && getComputedStyle(note).visibility !== 'hidden') { const a = note.getBoundingClientRect(); for (const s of seams) { const c = s.getBoundingClientRect(); if (a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1) errs.push('terra note overlaps seam label "' + s.textContent + '"'); } }
  const t = h.querySelector('.fb-paneltitle'), sg = h.querySelector(':scope > .fb-seg2'), chip = h.querySelector('.fb-monthchip');
  return { errs, rows, H: Math.round(H.height * 10) / 10, tx: t ? Math.round(t.getBoundingClientRect().left) : 0, sx: sg ? Math.round(sg.getBoundingClientRect().left) : 0, form: (h.className.match(/is-(long|short|wrap)/) || [])[1], chip: chip ? chip.textContent : null, note: note ? note.textContent : null };
};
const open = async (hash) => { const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(url + '#' + hash, { waitUntil: 'load' }); await sleep(1800); return p; };
const setW = async (p, W) => { await p.evaluate((W) => { const c = document.querySelector('.fb-calpanel'); c.style.width = W + 'px'; c.style.justifySelf = 'start'; }, W); await sleep(90); };
for (const theme of ['light', 'dark']) for (const cv of ['counts', 'anomaly']) for (const m of ['2019-09', '2019-02']) {
  const base = 'z=canada&anim=0' + (cv === 'anomaly' ? '&cv=anomaly' : '') + (theme === 'dark' ? '&theme=dark' : '');
  const p = await open(base + '&m=' + m), q = await open(base);
  for (let W = 320; W <= 1200; W += 20) {
    // one page in front at a time (a background tab gets no resize callbacks)
    await p.bringToFront(); await setW(p, W); const r = await p.evaluate(probe);
    await q.bringToFront(); await setW(q, W); const r0 = await q.evaluate(probe);
    const errs = r.errs.concat(r0.errs.map((e) => 'no month: ' + e));
    if (!r.chip) errs.push('no chip shown');
    if (W >= 560) {
      if (r.rows > 3) errs.push('two rows with a month (' + Math.round(r.rows) + ' px apart)');
      if (r0.rows > 3) errs.push('two rows without a month');
      if (Math.abs(r.H - r0.H) > 0.5) errs.push('header height ' + r.H + ' with a month vs ' + r0.H + ' without');
      if (r.tx !== r0.tx || r.sx !== r0.sx) errs.push('title/segment x moved (' + r.tx + '/' + r.sx + ' vs ' + r0.tx + '/' + r0.sx + ')');
      if (r.form === 'wrap') errs.push('wrap form at ≥ 560');
    }
    n++; forms[r.form] = (forms[r.form] || 0) + 1;
    if (errs.length) { bad++; console.log(theme, cv, m, W, r.form, r.chip, errs.join('; ')); }
  }
  await p.close(); await q.close();
}
console.log(n + ' checks, ' + bad + ' failed · chip forms used:', JSON.stringify(forms));
await b.close();
