// The view in the URL hash: tab, zone box, country, preset id, date range, series, calendar view, selected month,
// map layer, How-it-works step, Dashboard panel (tablet/phone). Version 5: `v` is the global series (raw|harmonized);
// the calendar's Counts/Anomaly view is `cv`. Old links with v=anomaly open as harmonized + cv=anomaly.
import { NOANIM } from './util.jsx';
import { PRESETS, presetFor, NM, END_KEY, monthKey, monthIndex } from './metrics.js';

// Defaults follow the record's end (read at call time, after setRecordEnd).
export const defaults = () => ({ country: 'canada', box: PRESETS[0].box, from: '2001-01', to: END_KEY, view: 'harmonized', sel: NM - 1, ex: 'canada', picker: false, hot: false, layer: 'det', tab: 'dash', step: 1, panel: 'cal', cv: 'counts', mPicked: false });
export const TABS = ['overview', 'dash', 'evidence', 'how', 'method'];
const VIEWS = ['raw', 'harmonized', 'anomaly'];
const okKey = (k) => /^\d{4}-\d{2}$/.test(k || '') && monthIndex(k) >= 0 && monthIndex(k) < NM;

export function readHash() {
  const DEF = defaults();
  const st = Object.assign({}, DEF);
  let explicit = false, hasM = false;
  try {
    const raw = window.location.hash.slice(1);
    explicit = raw.length > 0;
    const h = new URLSearchParams(raw);
    const p = PRESETS.find((q) => q.id === h.get('z'));
    if (p) { st.country = p.country; st.box = p.box; }
    if (h.get('c') === 'canada' || h.get('c') === 'argentina') st.country = h.get('c');
    const b = (h.get('b') || '').split(',').map(Number);
    if (b.length === 4 && b.every(isFinite) && b[0] < b[1] && b[2] < b[3]) st.box = { s: b[0], n: b[1], w: b[2], e: b[3] };
    else if (!p && h.get('c') && h.get('c') !== DEF.country) st.box = PRESETS.find((q) => q.country === st.country).box;
    if (okKey(h.get('f'))) st.from = h.get('f');
    if (okKey(h.get('t'))) st.to = h.get('t');
    if (st.from > st.to) { const t = st.from; st.from = st.to; st.to = t; }
    if (VIEWS.indexOf(h.get('v')) >= 0) st.view = h.get('v');
    if (st.view === 'anomaly') { st.view = 'harmonized'; st.cv = 'anomaly'; }
    if (h.get('cv') === 'anomaly') st.cv = 'anomaly';
    if (TABS.indexOf(h.get('tab')) >= 0) st.tab = h.get('tab');
    if (/^[1-4]$/.test(h.get('step') || '')) st.step = +h.get('step');
    // v6 (judge C5): phone and tablet open on the Calendar panel; the map is one tap away (panel=map in the hash).
    if (h.get('panel') === 'map') st.panel = 'map';
    if (okKey(h.get('m'))) { st.sel = monthIndex(h.get('m')); hasM = true; st.mPicked = true; }
    if (['canada', 'larioja', 'zone'].indexOf(h.get('ex')) >= 0) st.ex = h.get('ex');
    st.picker = false; // V3: the map card is always shown (old links with p=1 still open)
    if (['rec', 'ratio', 'month', 'det'].indexOf(h.get('l')) >= 0) st.layer = h.get('l');
    st.hot = h.get('h') === '1';
  } catch (e) { /* unreadable hash: defaults */ }
  if (!explicit) st.tab = 'overview'; // v6: a bare URL opens the Overview; any hash state opens where it points
  return { st, explicit, hasM };
}
export function hashFor(st) {
  const DEF = defaults();
  const h = new URLSearchParams();
  const p = presetFor(st.country, st.box);
  h.set('z', p ? p.id : 'custom');
  h.set('c', st.country);
  h.set('b', [st.box.s, st.box.n, st.box.w, st.box.e].join(','));
  h.set('v', st.view);
  if (st.mPicked) h.set('m', monthKey(st.sel)); // only a month the user chose (v5.2 coherence: chip ⇔ hash)
  if (st.from !== DEF.from) h.set('f', st.from);
  if (st.to !== DEF.to) h.set('t', st.to);
  if (st.ex !== DEF.ex) h.set('ex', st.ex);
  if (st.layer !== DEF.layer) h.set('l', st.layer);
  if (st.tab !== DEF.tab) h.set('tab', st.tab);
  if (st.tab === 'how') h.set('step', String(st.step));
  if (st.cv !== DEF.cv) h.set('cv', st.cv);
  if (st.panel !== DEF.panel) h.set('panel', st.panel);
  if (NOANIM) h.set('anim', '0');
  if (st.hot) h.set('h', '1');
  return '#' + h.toString();
}
// History (v5.2): a new entry per user step (zone, tab, layer, month, view, range…), so Back/Forward walk the states;
// bursts (arrow nudges, quick clicks) within 600 ms replace the entry instead of piling up.
let lastPush = 0;
export function writeHash(st) {
  const h = hashFor(st);
  try {
    if (h === window.location.hash) return;
    const now = Date.now();
    if (lastPush && now - lastPush > 600) window.history.pushState(null, '', h); else window.history.replaceState(null, '', h);
    lastPush = now;
  } catch (e) { /* strict file:// */ }
}
