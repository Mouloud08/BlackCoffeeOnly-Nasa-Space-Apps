// State coherence (v5.2): (1) scripted pairs and order-independence checks, (2) a seeded random walk over every control,
// asserting after each action that the DOM agrees with the app state (window.__fb) and that generated text makes sense.
// Usage: node tools/coherence.mjs [actionsPerRun=300] [seeds=1,2,3] [sizes=1366x768,390x844]
import puppeteer from 'puppeteer-core';
const url = 'file://' + (process.env.FB_HTML || new URL('..', import.meta.url).pathname + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = +(process.argv[2] || 300), SEEDS = (process.argv[3] || '1,2,3').split(',').map(Number), SIZES = (process.argv[4] || '1366x768,390x844').split(',').map((s) => s.split('x').map(Number));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const LAYER_WORD = { rec: 'record before 2012', ratio: 'too high', month: 'top 3', det: 'a year' };
let totalViol = 0;
const report = [];

// DOM ⇔ state invariants. Returns a list of violation strings.
async function check(p, errs) {
  // park the pointer on the top bar so hover state must be clear
  await p.mouse.move(2, 2); await sleep(120);
  const v = await p.evaluate((LAYER_WORD) => {
    const out = [], F = window.__fb; if (!F) return ['no state'];
    const st = F.st, q = (s) => document.querySelector(s), t = (s) => (q(s) ? q(s).textContent : null);
    const hash = decodeURIComponent(location.hash);
    // tab
    const tp = q('#fb-tabpanel'); if (!tp || !tp.className.includes('is-' + st.tab)) out.push('tab panel ≠ state ' + st.tab);
    const selTab = q('.fb-tab[aria-selected="true"]'); if (selTab && selTab.id !== 'fb-tab-' + st.tab) out.push('tab button ≠ state');
    // v6.2 (P7) reading level: no banned technical term in visible surface text (Method tab and popovers excepted),
    // no visible sentence over 30 words.
    if (st.tab !== 'method') {
      const BAN = [/cell-days?/i, /MCD14ML/, /VNP14IMGT/, /\bpooled\b/i, /bootstrap/i, /permutation/i, /leave-one-out/i, /Spearman/i, /\btiles?\b/i];
      const tw = document.createTreeWalker(document.querySelector('.fb-app'), NodeFilter.SHOW_TEXT); let nd;
      while ((nd = tw.nextNode())) { const e = nd.parentElement; if (!e || e.closest('[popover], .fb-hprobes, .sr-only, .fb-def, script, style') || !e.checkVisibility()) continue; for (const re of BAN) if (re.test(nd.textContent)) out.push('banned term ' + re.source + ' in "' + nd.textContent.trim().slice(0, 40) + '"'); }
      document.querySelectorAll('.fb-app p, .fb-app h1, .fb-app h2').forEach((e) => { if (e.closest('[popover], .fb-hprobes, .fb-def') || !e.checkVisibility()) return; e.textContent.split(/(?<=[.?!])\s+/).forEach((x) => { if (x.trim().split(/\s+/).length > 30) out.push('sentence over 30 words: "' + x.slice(0, 50) + '"'); }); });
    }
    // v6.2 range: From ≤ To, never past the record end; the open popover's selects show the state
    if (st.from > st.to) out.push('range From > To (' + st.from + ' > ' + st.to + ')');
    const rs = [...document.querySelectorAll('.fb-range2 select')];
    if (rs.length === 4) { const k = (y, m) => y + '-' + String(m).padStart(2, '0'); if (k(rs[1].value, rs[0].value) !== st.from || k(rs[3].value, rs[2].value) !== st.to) out.push('range selects ≠ state'); }
    const rb = t('.fb-rangebtn'); if (rb && !rb.includes(st.from.slice(0, 4))) out.push('range button "' + rb + '" ≠ from ' + st.from);
    // zone: hash b= ⇔ state box; zone button label ⇔ strip zone name
    const hb = (hash.match(/b=([^&]+)/) || [])[1]; if (hb && hb.split(',').map(Number).join() !== [st.box.s, st.box.n, st.box.w, st.box.e].join()) out.push('hash box ≠ state box');
    if (F.pending) return out; // deferred zone still computing: skip the zone-derived checks this round
    const zb = t('.fb-zonebtn-t'), zn = t('.fb-verdict2 .fb-zone-name');
    // v6 (B3): the compact zone button (< 1024 px) shows the short form of the same name ("Canada", "Custom zone").
    const shortZ = (n) => n.replace(/^All of /, '').replace(/^Custom zone, .*/, 'Custom zone');
    if (zb && zn && zb.trim() !== zn.trim() && !(innerWidth < 1024 && zb.trim() === shortZ(zn.trim()))) out.push('zone button "' + zb + '" ≠ strip "' + zn + '"');
    if (zn && zn.trim() !== F.zoneName) out.push('strip zone ≠ state zone');
    // Overview (v6): the toggle shows the app's country; the hold button shows the raw state; the chart class follows it
    if (st.tab === 'overview' && q('.fb-ov')) {
      const ck = q('.fb-ov-country [aria-checked="true"]'); if (ck && !ck.textContent.includes(st.country === 'canada' ? 'Canada' : 'Argentina')) out.push('overview toggle ≠ country');
      const rawOn = !!(F.peek || st.view === 'raw'), hb = q('.fb-ov-holdbtn'); if (hb && (hb.getAttribute('aria-pressed') === 'true') !== rawOn) out.push('overview hold button ≠ raw state');
      if (q('.fb-ov-chart') && q('.fb-ov-chart').classList.contains('is-raw') !== rawOn) out.push('overview chart ≠ raw state');
      if (!q('.fb-ov-open')) out.push('overview without its primary button');
    }
    // series switch ⇔ view (peek shows raw)
    const on = t('.fb-series .fb-series-i.is-on'); const want = F.peek ? 'Raw' : st.view === 'raw' || !F.harmOK ? 'Raw' : 'Harmonized';
    if (on && F.harmOK && !on.startsWith(want.slice(0, 3)) ) out.push('switch "' + on + '" ≠ ' + want);
    // hero
    if (st.tab === 'dash' && F.hero) { const num = t('.fb-verdict2 .fb-num'); if (num !== F.hero) out.push('hero "' + num + '" ≠ expected ' + F.hero); }
    if (st.tab === 'dash' && F.harmOK && !F.uncertain) { const raw = !!q('.fb-verdict2 .fb-vrow-hero.is-raw'); if (raw !== (F.series === 'raw')) out.push('hero emphasis ≠ view'); }
    // small-box guard (v6 C1): no hero rise and no success chip when the guard is on
    if (F.guard && st.tab === 'dash') { const num = t('.fb-verdict2 .fb-num') || ''; if (!num.startsWith('÷')) out.push('guarded zone shows a rise "' + num + '"'); if (q('.fb-verdict2 .fb-vz-checks .fb-pill.is-success')) out.push('guarded zone shows a success chip'); }
    // seam ratio ⇔ verdict ratio (harmonized, counts or anomaly)
    const seam = t('.fb-seam .is-l'); if (seam && F.ratio && F.series !== 'raw' && !seam.includes(F.ratio)) out.push('seam "' + seam + '" ≠ ratio ' + F.ratio);
    if (seam && F.borrowed && F.series !== 'raw' && !seam.includes('wider area')) out.push('seam ratio borrowed but not said');
    // month chip ⇔ mPicked ⇔ hash m=
    const chip = q('.fb-calpanel .fb-monthchip'), hm = /(^|[#&])m=/.test(hash);
    if (st.tab === 'dash' && q('.fb-calpanel') && !F.empty) { if (!!chip !== !!st.mPicked) out.push('chip ' + !!chip + ' ≠ picked ' + st.mPicked); }
    if (hm !== !!st.mPicked) out.push('hash m= ' + hm + ' ≠ picked ' + st.mPicked);
    // map: selection box ⇔ zone; layer button ⇔ legend ⇔ state
    const mv = q('.fb-mappanel .fb-map-view[data-box]');
    if (mv && mv.dataset.box !== [st.box.s, st.box.n, st.box.w, st.box.e].join(',')) out.push('map box ≠ zone');
    if (mv && !F.whole && !q('.fb-mappanel .fb-sel')) out.push('custom zone without a selection rectangle');
    const lb = q('.fb-layerctl [aria-checked="true"]'), lg = t('.fb-legend1');
    if (lb && lg && !lg.includes(LAYER_WORD[st.layer])) out.push('legend does not match layer ' + st.layer);
    if (q('.fb-layerctl') && q('.fb-layerctl [aria-checked="true"]') !== q('.fb-layerctl .fb-layerbtn:nth-child(' + (['det', 'rec', 'ratio', 'month'].indexOf(st.layer) + 1) + ')')) out.push('layer button ≠ state');
    // draw button ⇔ draw mode
    const db = q('.fb-drawbtn'); if (db && mv && (db.getAttribute('aria-pressed') === 'true') !== (mv.dataset.draw === '1')) out.push('draw button ≠ draw mode');
    // popovers: at most one open
    const hint = t('.fb-maphint') || ''; const bk = hint.match(/Back to (.+)$/); if (bk && bk[1].trim() === (zn || '').trim()) out.push('undo offers the current zone');
    if (document.querySelectorAll(':popover-open').length > 1) out.push('more than one popover open');
    // no stuck hover once the pointer is parked
    if (q('.fb-hovcell')) out.push('stuck map hover outline');
    if (q('.fb-hlchip')) out.push('stuck year highlight on the map');
    if ([...document.querySelectorAll('.fb-calpanel style')].some((s) => /data-key\^="\d{4}-"/.test(s.textContent) || /100px color-mix/.test(s.textContent))) out.push('stuck calendar highlight');
    // wording
    const rd = t('.fb-calread') || '';
    if (st.cv === 'anomaly' && F.series !== 'raw' && /typical/.test(rd) && /cell-days/.test(rd) && !/too few|partial/.test(rd)) out.push('anomaly readout worded in cell-days');
    if (/undefined|NaN|null/.test((t('.fb-verdict2') || '') + rd + (t('.fb-mapfoot') || ''))) out.push('undefined/NaN in generated text');
    const ms = t('.fb-mapsentence') || ''; if (st.layer === 'rec' && /This box \((\d+) places\)/.test(ms) && +ms.match(/This box \((\d+) places\)/)[1] < 30) out.push('box counters under their minimum sample');
    if (F.series === 'raw' && F.harmOK && st.tab === 'dash' && q('.fb-verdict2 .fb-vz-checks .fb-pill.is-success, .fb-verdict2 .fb-vz-checks .fb-pill.is-warning') && !/harmonized record/.test(t('.fb-verdict2 .fb-vz-checks .fb-eyebrow') || 'harmonized record')) out.push('checks in raw view not labelled as harmonized');
    return out;
  }, LAYER_WORD);
  if (errs.length) { v.push('console: ' + errs.splice(0).join(' | ').slice(0, 200)); }
  return v;
}

async function open(W, H, hash = 'z=canada') {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: W, height: H, isMobile: W < 500, hasTouch: false });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('fb-peek-hint', '1'); } catch (e) { /* */ } });
  await p.goto(url + '#' + hash + '&anim=0', { waitUntil: 'load' }); await sleep(2200);
  return { p, errs };
}
const settle = async (p) => { await sleep(260); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); for (let i = 0; i < 20; i++) { if (!(await p.evaluate(() => window.__fb && window.__fb.pending))) break; await sleep(80); } await sleep(60); };
const snapshot = (p) => p.evaluate(() => ['.fb-verdict2', '.fb-calread', '.fb-mapsentence', '.fb-legend1', '.fb-calpanel .fb-monthchip'].map((s) => { const e = document.querySelector(s); return e ? e.textContent : ''; }).join(' ¦ '));

// The actions. Each returns a short label (for the violation report).
const ACTIONS = {
  preset: async (p, R) => { await p.evaluate(() => document.querySelector('.fb-zonebtn').click()); await sleep(150); const n = await p.$$eval('.fb-preset2', (e) => e.length); const i = Math.floor(R() * n); await p.evaluate((i) => document.querySelectorAll('.fb-preset2')[i].click(), i); return 'preset ' + i; },
  country: async (p, R) => { await p.evaluate(() => document.querySelector('.fb-zonebtn').click()); await sleep(150); const c = R() < 0.5 ? 'Canada' : 'Argentina'; await p.evaluate((c) => { const b = [...document.querySelectorAll('.fb-pop-zone .fb-seg2-i')].find((e) => e.textContent === c); b && b.click(); }, c); await p.keyboard.press('Escape'); return 'country ' + c; },
  mapClick: async (p, R) => { const m = await mapBox(p); if (!m) return 'mapClick (no map)'; const x = m.x + m.w * (0.1 + 0.8 * R()), y = m.y + m.h * (0.15 + 0.7 * R()); await p.mouse.click(x, y); await sleep(300); return 'mapClick ' + Math.round(x) + ',' + Math.round(y); },
  draw: async (p, R) => { const m = await mapBox(p); if (!m || !(await p.$('.fb-drawbtn'))) return 'draw (no map)'; await p.click('.fb-drawbtn'); await sleep(80); const x = m.x + m.w * (0.2 + 0.5 * R()), y = m.y + m.h * (0.25 + 0.4 * R()); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 40 + 60 * R(), y + 30 + 40 * R(), { steps: 5 }); await p.mouse.up(); return 'draw'; },
  drawEsc: async (p) => { if (!(await p.$('.fb-drawbtn'))) return 'drawEsc (no map)'; await p.click('.fb-drawbtn'); await sleep(60); await p.keyboard.press('Escape'); return 'draw+Esc'; },
  resize: async (p, R) => { const r = await p.evaluate(() => { const e = document.querySelector('.fb-mappanel .fb-sel'); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; }); if (!r || r.w < 20) return 'resize (none)'; await p.mouse.move(r.x + r.w, r.y + r.h / 2); await p.mouse.down(); await p.mouse.move(r.x + r.w + 20 + 30 * R(), r.y + r.h / 2, { steps: 4 }); await p.mouse.up(); return 'resize'; },
  moveSel: async (p, R) => { const r = await p.evaluate(() => { const e = document.querySelector('.fb-mappanel .fb-sel'); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; }); if (!r || r.w < 30 || r.h < 30) return 'move (none)'; await p.mouse.move(r.x + r.w / 2, r.y + r.h / 2); await p.mouse.down(); await p.mouse.move(r.x + r.w / 2 + 25 * R(), r.y + r.h / 2 + 25 * R(), { steps: 4 }); await p.mouse.up(); return 'move selection'; },
  undo: async (p) => { const ok = await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-maphint button')].find((e) => /Back to/.test(e.textContent)); if (b) b.click(); return !!b; }); return 'undo ' + ok; },
  clearZone: async (p) => { const ok = await p.evaluate(() => { const b = document.querySelector('.fb-selchip button[aria-label="Back to the whole country"]'); if (b) b.click(); return !!b; }); return 'chip × ' + ok; },
  layer: async (p, R) => { const k = 1 + Math.floor(R() * 4); const ok = await p.$('.fb-layerctl .fb-layerbtn:nth-child(' + k + ')'); if (ok) await ok.click(); return 'layer ' + k; },
  month: async (p, R) => { const y = 2001 + Math.floor(R() * 25), m = 1 + Math.floor(R() * 12); const k = y + '-' + String(m).padStart(2, '0'); const ok = await p.evaluate((k) => { const c = document.querySelector('.fb-calpanel .at-cal-cells [data-key="' + k + '"]'); if (c) c.click(); return !!c; }, k); await p.evaluate(() => { const b = document.querySelector('.fb-sheet .fb-evbtn'); if (b) b.click(); }); return 'month ' + k + ' ' + ok; },
  monthClear: async (p) => { const ok = await p.evaluate(() => { const b = document.querySelector('.fb-monthchip button'); if (b) b.click(); return !!b; }); return 'month × ' + ok; },
  monthEsc: async (p) => { await p.mouse.click(4, 120); await p.keyboard.press('Escape'); return 'Esc'; },
  mode: async (p) => { const ok = await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-calpanel .fb-seg2-i')].find((e) => !e.classList.contains('is-on') && !e.disabled); if (b) b.click(); return !!b; }); return 'counts/anomaly ' + ok; },
  // v6.2 range control: Month + Year selects for From and To (set in a random order, To first sometimes), and presets.
  range: async (p, R) => { if (!(await p.$('.fb-rangebtn'))) return 'range (none)'; await p.click('.fb-rangebtn'); await sleep(120); const f = 2001 + Math.floor(R() * 15), t = f + 3 + Math.floor(R() * 8), fm = 1 + Math.floor(R() * 12), tm = 1 + Math.floor(R() * 12), toFirst = R() < 0.5;
    await p.evaluate(([f, t, fm, tm, toFirst]) => { const s = document.querySelectorAll('.fb-range2 select'); const set = (el, v) => { if (!el) return; const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value'); d.set.call(el, String(v)); el.dispatchEvent(new Event('change', { bubbles: true })); };
      const from = () => { set(document.querySelectorAll('.fb-range2 select')[1], f); set(document.querySelectorAll('.fb-range2 select')[0], fm); }, to = () => { set(document.querySelectorAll('.fb-range2 select')[3], Math.min(t, 2025)); set(document.querySelectorAll('.fb-range2 select')[2], tm); };
      if (toFirst) { to(); from(); } else { from(); to(); } }, [f, t, fm, tm, toFirst]); await sleep(60); await p.keyboard.press('Escape'); return 'range ' + fm + '/' + f + '–' + tm + '/' + t; },
  rangePreset: async (p, R) => { if (!(await p.$('.fb-rangebtn'))) return 'preset range (none)'; await p.click('.fb-rangebtn'); await sleep(120); const k = Math.floor(R() * 5); await p.evaluate((k) => { const c = document.querySelectorAll('.fb-range2-pre .fb-chip')[k]; if (c) c.click(); }, k); await sleep(60); await p.keyboard.press('Escape'); return 'range preset ' + k; },
  rangeReset: async (p) => { if (!(await p.$('.fb-rangebtn'))) return 'reset (none)'; await p.click('.fb-rangebtn'); await sleep(120); await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-pop-form button')].find((e) => /Reset/.test(e.textContent)); if (b) b.click(); }); await p.keyboard.press('Escape'); return 'range reset'; },
  raw: async (p) => { await p.mouse.click(4, 120); await p.keyboard.press('r'); return 'R'; },
  harm: async (p) => { await p.mouse.click(4, 120); await p.keyboard.press('h'); return 'H'; },
  peek: async (p) => { await p.mouse.click(4, 120); await p.keyboard.down('r'); await sleep(400); await p.keyboard.up('r'); return 'peek'; },
  ovCountry: async (p, R) => { await p.evaluate(() => document.getElementById('fb-tab-overview') && document.getElementById('fb-tab-overview').click()); await sleep(200); const c = R() < 0.5 ? 'Canada' : 'Argentina'; await p.evaluate((c) => { const b = [...document.querySelectorAll('.fb-ov-country .fb-seg2-i')].find((e) => e.textContent.includes(c)); b && b.click(); }, c); return 'overview country ' + c; },
  ovHold: async (p) => { const b = await p.$('.fb-ov-holdbtn'); if (!b) return 'ovHold (not on overview)'; const r = await b.boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await sleep(350); await p.mouse.up(); return 'overview hold'; },
  ovOpen: async (p) => { const b = await p.$('.fb-ov-open'); if (b) await b.click(); return 'overview open ' + !!b; },
  tab: async (p, R) => { const t = ['overview', 'dash', 'evidence', 'how', 'method', 'dash'][Math.floor(R() * 6)]; const b = await p.$('#fb-tab-' + t); if (b) await b.click(); return 'tab ' + t; },
  theme: async (p) => { await p.click('.fb-morebtn'); await sleep(100); await p.evaluate(() => { const b = [...document.querySelectorAll('#fb-more button')].find((e) => /theme/.test(e.textContent)); b && b.click(); }); return 'theme'; },
  popover: async (p, R) => { const s = ['.fb-zonebtn', '.fb-morebtn', '.fb-info', '.fb-rangebtn'][Math.floor(R() * 4)]; const e = await p.$(s); if (e) await e.click(); await sleep(100); if (R() < 0.5) { const e2 = await p.$('.fb-morebtn'); if (e2) await e2.click(); } return 'popover ' + s; },
  esc: async (p) => { await p.keyboard.press('Escape'); return 'Esc key'; },
  panel: async (p) => { const ok = await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-panelswitch .fb-seg2-i')].find((e) => !e.classList.contains('is-on')); if (b) b.click(); return !!b; }); return 'panel ' + ok; },
  // Back past the app's first history entry leaves the page (normal browser behaviour): then come Forward again.
  back: async (p) => { await p.goBack().catch(() => {}); await sleep(250); if (!(await p.evaluate(() => !!window.__fb).catch(() => false))) { await p.goForward().catch(() => {}); await sleep(2000); return 'Back (left the app; Forward)'; } return 'Back'; },
  reload: async (p) => { await p.mouse.move(1, 1); await sleep(200); // v6.2: a hovered calendar cell changes the readout line; hover is not state
    const before = await snapshot(p); await p.reload({ waitUntil: 'load' }); await sleep(2000); const after = await snapshot(p); return before === after ? 'reload (same)' : 'reload DIFFERENT: ' + diff(before, after); },
};
const diff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return JSON.stringify(a.slice(Math.max(0, i - 30), i + 50)) + ' → ' + JSON.stringify(b.slice(Math.max(0, i - 30), i + 50)); };
async function mapBox(p) { return p.evaluate(() => { const e = document.querySelector('.fb-mappanel .fb-map-view'); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 50 && r.height > 50 && r.top < innerHeight - 40 ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; }); }

// ── (0) self-test of the checker: each injected fault must be reported
{
  const { p, errs } = await open(1366, 768);
  const faults = [
    ['stuck calendar highlight', () => { const s = document.createElement('style'); s.textContent = '.fb-calpanel .at-cal-cells [data-key^="2019-"]{}'; document.querySelector('.fb-calpanel').appendChild(s); }],
    ['hero', () => { document.querySelector('.fb-verdict2 .fb-num').textContent = '9.9×'; }],
    ['zone button', () => { document.querySelector('.fb-zonebtn-t').textContent = 'Elsewhere'; }],
    ['popover', () => { document.querySelectorAll('.fb-pop').forEach((e) => { try { e.popover = 'manual'; e.showPopover(); } catch (x) { /* */ } }); }],
  ];
  for (const [name, f] of faults) { await p.reload({ waitUntil: 'load' }); await sleep(2000); await p.evaluate(f); const v = await check(p, errs); const ok = v.some((x) => x.toLowerCase().includes(name.split(' ')[0])); report.push('self-test "' + name + '": ' + (ok ? 'caught' : 'MISSED')); if (!ok) totalViol++; }
  await p.close();
}
// ── (0b) Overview figures = strip figures for the whole country, both views, both countries
for (const c of ['canada', 'argentina']) for (const v of ['harmonized', 'raw']) {
  const { p: p1, errs: e1 } = await open(1366, 768, 'tab=overview&z=' + c + '&v=' + v);
  const ov = await p1.evaluate(() => [...document.querySelectorAll('.fb-ov-pair .fb-ov-v')].map((e) => e.textContent));
  const head = await p1.evaluate(() => (document.querySelector('.fb-ov-h') || {}).textContent);
  await p1.close();
  const { p: p2 } = await open(1366, 768, 'z=' + c + '&v=' + v);
  const strip = await p2.evaluate(() => { const num = document.querySelector('.fb-verdict2 .fb-num').textContent; const pill = [...document.querySelectorAll('.fb-verdict2 .fb-vrow-hero .fb-pill')].map((e) => e.textContent).join(' '); return { num, pill }; });
  await p2.close();
  const H = v === 'raw' ? (strip.pill.match(/([\d.]+×)/) || [])[1] : strip.num, Rr = v === 'raw' ? strip.num : (strip.pill.match(/([\d.]+×)/) || [])[1];
  const ok = ov[0] === H && ov[1] === Rr && e1.length === 0;
  if (!ok) totalViol++;
  report.push(`overview ${c} ${v}: overview ${ov.join(' / ')} · strip harmonized ${H}, raw ${Rr} → ${ok ? 'equal' : 'MISMATCH'} · headline "${head}"`);
}
// ── (0c) v6.2 guard boxes: G4 (ratio > 4×, Sherbrooke area; 50–49°S 70–69°W is 3.98×, G1 instead), G5, G1: no
// harmonized hero figure and no success chip; G4 shows the not-harmonized answer.
for (const [name, h, want] of [['Sherbrooke 45–47°N 73–71°W (G4)', 'c=canada&b=45,47,-73,-71', 'notharm'], ['58–59°N 100–99°W (G1)', 'c=canada&b=58,59,-100,-99', 'guard'], ['50–49°S 70–69°W', 'c=argentina&b=-50,-49,-70,-69', 'guard'], ['27–25°S 58–56°W (G5)', 'c=argentina&b=-27,-25,-58,-56', 'guard']]) {
  const { p, errs } = await open(1366, 768, h);
  const r = await p.evaluate(() => { const v = document.querySelector('.fb-verdict2'); const num = v.querySelector('.fb-num'); return { num: num ? num.textContent : null, success: !!v.querySelector('.fb-vz-checks .fb-pill.is-success'), ans: (v.querySelector('.fb-answer') || {}).textContent || '', pill: [...v.querySelectorAll('.fb-pill')].map((e) => e.textContent).join(' | ') }; });
  await p.close();
  const bad = [];
  if (r.success) bad.push('success chip shown');
  if (want === 'notharm' && !/Not harmonized/.test(r.ans)) bad.push('no not-harmonized answer');
  if (want === 'guard' && r.num && !r.num.includes('÷')) bad.push('rise figure ' + r.num);
  if (errs.length) bad.push(errs.length + ' console errors');
  if (bad.length) totalViol++;
  report.push('guard ' + name + ': ' + (bad.length ? 'VIOLATION ' + bad.join('; ') : 'ok') + ' · ' + (r.num || r.ans) + ' · ' + r.pill);
}
// ── (1) scripted pairs and order independence
for (const [W, H] of SIZES) {
  const steps = {
    'zone then month': [['preset', 2], ['month', '2019-06']], 'month then zone': [['month', '2019-06'], ['preset', 2]],
    'layer then raw': [['layer', 2], ['raw']], 'raw then layer': [['raw'], ['layer', 2]],
  };
  const run = async (seq) => {
    const { p, errs } = await open(W, H);
    if (W < 760) await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-panelswitch .fb-seg2-i')].find((e) => /Calendar/.test(e.textContent)); b && b.click(); });
    for (const [a, arg] of seq) {
      if (a === 'preset') { await p.evaluate(() => document.querySelector('.fb-zonebtn').click()); await sleep(150); await p.evaluate((i) => document.querySelectorAll('.fb-preset2')[i].click(), arg); }
      if (a === 'month') { if (W < 760) await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-panelswitch .fb-seg2-i')].find((e) => /Calendar/.test(e.textContent)); b && b.click(); }); await sleep(150); await p.evaluate((k) => { const c = document.querySelector('.fb-calpanel .at-cal-cells [data-key="' + k + '"]'); c && c.click(); const s = document.querySelector('.fb-sheet .fb-evbtn'); s && s.click(); }, arg); }
      if (a === 'layer') { if (W < 760) await p.evaluate(() => { const b = [...document.querySelectorAll('.fb-panelswitch .fb-seg2-i')].find((e) => /Map/.test(e.textContent)); b && b.click(); }); await sleep(150); await p.click('.fb-layerctl .fb-layerbtn:nth-child(' + arg + ')'); }
      if (a === 'raw') { await p.mouse.click(4, 120); await p.keyboard.press('r'); }
      await settle(p);
    }
    await p.mouse.move(2, 2); await sleep(150);
    const snap = await snapshot(p), hash = await p.evaluate(() => location.hash), v = await check(p, errs);
    await p.close(); return { snap, hash, v };
  };
  for (const [a, c] of [['zone then month', 'month then zone'], ['layer then raw', 'raw then layer']]) {
    const r1 = await run(steps[a]), r2 = await run(steps[c]);
    const same = r1.snap === r2.snap && r1.hash === r2.hash;
    const v = [...r1.v, ...r2.v];
    if (!same) v.push('order dependence: ' + diff(r1.snap + r1.hash, r2.snap + r2.hash));
    totalViol += v.length; report.push(`${W}x${H} order ${a} ≡ ${c}: ${v.length ? v.join(' | ') : 'identical, coherent'}`);
  }
}

// ── (2) random walk
for (const [W, H] of SIZES) for (const seed of SEEDS) {
  const R = rng(seed * 7919 + W);
  const { p, errs } = await open(W, H);
  const names = Object.keys(ACTIONS), log = []; let viol = 0; const seen = new Set();
  for (let i = 0; i < N; i++) {
    const a = names[Math.floor(R() * names.length)];
    let lab;
    try { lab = await ACTIONS[a](p, R); } catch (e) { lab = a + ' (threw: ' + e.message.slice(0, 60) + ')'; }
    log.push(lab);
    await settle(p);
    const v = await check(p, errs);
    if (/reload DIFFERENT/.test(lab)) v.push(lab);
    for (const x of v) { const key = x.replace(/\d+/g, '#'); if (!seen.has(key)) { seen.add(key); report.push(`${W}x${H} seed ${seed} step ${i}: ${x}  ⟵ ${log.slice(-4).join(' → ')}`); } viol++; }
    if (v.length && /console/.test(v.join())) errs.length = 0;
  }
  totalViol += viol;
  const kinds = {}; log.forEach((l) => { const k = l.split(' ')[0]; kinds[k] = (kinds[k] || 0) + 1; });
  report.push(`${W}x${H} seed ${seed}: ${N} actions, ${viol} violations (${seen.size} distinct) · actions: ${Object.entries(kinds).map(([k, n]) => k + ' ' + n).join(', ')}`);
  if (process.env.FB_LOG) console.log(log.join('\n'));
  await p.close();
}
console.log(report.join('\n'));
console.log('TOTAL violations', totalViol);
await b.close();
process.exit(totalViol ? 1 : 0);
