// FireBridge — version 5: an application. Four tabs (Dashboard · Evidence · How it works · Method) in a full-viewport
// shell; one global Raw/Harmonized switch (with hold-to-peek); the zone, export, link and theme live in the top bar.
import { useState, useEffect, useMemo, useRef, useCallback, memo, useDeferredValue } from 'react';
import { flushSync } from 'react-dom';
import { decodeCountry, computeZone, cellStats, floorShare, calendarData, PRESETS, presetFor, sameBox, monthKey, NM, CAL_LAST, lastComparable, endLabel, recordMonth, LOW } from './metrics.js';
// Peak month of the last complete calendar year among months with a comparable typical value (harmonized series).
export function peakOfLastYear(Z) { if (!Z || Z.empty) return null; const arr = Z.harmOK ? Z.harm : Z.raw, end = NM - (NM % 12) - 1; let b = null, bv = 0; for (let j = end - 11; j <= end; j++) if (Z.typical[j % 12] >= LOW && arr[j] > bv) { bv = arr[j]; b = j; } return b; }
import { X } from './copy.js';
import { officialData, officialCheck } from './official.js';
import { readHash, writeHash, TABS } from './state.js';
import { Overview } from './Overview.jsx';
import { guarded } from './guard.js';
import { Verdict } from './Verdict.jsx';
import { MapPanel } from './MapPanel.jsx';
import { CalPanel } from './CalPanel.jsx';
import { Evidence } from './Evidence.jsx';
import { How } from './How.jsx';
import { Method } from './Method.jsx';
import { BoxFields } from './Picker.jsx';
import { boxCover } from './geo.js';
import { Pop, navKeys, useTransitionRunner } from './ui.jsx';
import { seriesCsv, calendarSvg, downloadSvg, downloadPng, hotspotText, fileStem, mapCsv } from './exports.js';
import { cx, reduced, useWidth, useHeight, useTheme, copyText, downloadBlob, Icon, IC } from './util.jsx';

const COUNTRIES = { canada: 'Canada', argentina: 'Argentina' };
const TAB_LABEL = { overview: 'Overview', dash: 'Dashboard', evidence: 'Evidence', how: 'How it works', method: 'Method' };
const TAB_ICON = { overview: 'M4 19h16M6 16V10M10 16V6M14 16v-4M18 16V8', dash: 'M4 5h7v6H4zM13 5h7v14h-7zM4 13h7v6H4z', evidence: 'M5 19V9M10 19V5M15 19v-7M20 19v-11', how: 'M5 12h14M13 6l6 6-6 6', method: 'M6 4h9l3 3v13H6zM9 10h6M9 14h6' };
const HOTSPOT_FILES = (() => { try { return JSON.parse(document.getElementById('fb-hotspots').textContent); } catch (e) { return {}; } })();

function Mark() {
  return (
    <svg className="fb-mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="10" width="6.5" height="10.5" rx="1.5" className="m-modis" />
      <rect x="15" y="5" width="6.5" height="15.5" rx="1.5" className="m-viirs" />
      <path d="M5.75 7.5 Q12 1.5 18.25 2.5" className="m-bridge" />
    </svg>
  );
}

// Zones computed once per (country, box): the verdict, presets' live facts, examples and the Method share them.
const ZCACHE = new Map();
const zoneOf = (data, country, box) => {
  const k = country + '|' + box.s + ',' + box.n + ',' + box.w + ',' + box.e;
  let z = ZCACHE.get(k);
  if (!z && data && data[country]) { z = guarded(computeZone(data[country], box)); ZCACHE.set(k, z); }
  return z || null;
};
const factOf = (z) => (!z ? '' : z.empty ? 'no detections' : !z.harmOK ? 'raw only · C' : (z.trend && z.trend.status === 'uncertain' ? 'sensor effect ' + X(z.ratio) + ' · trend uncertain' : X(z.riseH)) + (z.gradeWhy === 'borrowed' ? ' · borrowed' : '') + ' · ' + z.grade);

/* ───────── top bar pieces ───────── */
function Tabs({ tab, setTab, bottom }) {
  const ref = useRef(null);
  const onKey = (e) => {
    const i = TABS.indexOf(tab), d = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key];
    if (d == null) return;
    e.preventDefault();
    const j = d === -99 ? 0 : d === 99 ? TABS.length - 1 : (i + d + TABS.length) % TABS.length;
    setTab(TABS[j]); const el = document.getElementById('fb-tab-' + TABS[j]); el && el.focus(); // the element exists already; the tab change itself may run in a view transition
  };
  return (
    <div className={cx('fb-tabs', bottom && 'is-bottom')} role="tablist" aria-label="Views" ref={ref} onKeyDown={onKey}>
      {TABS.map((t) => (
        <button key={t} type="button" role="tab" id={'fb-tab-' + t} aria-selected={tab === t} aria-controls="fb-tabpanel" tabIndex={tab === t ? 0 : -1} className={cx('fb-tab', tab === t && 'is-on')} onClick={() => setTab(t)}>
          {bottom && <Icon d={TAB_ICON[t]} />}<span>{TAB_LABEL[t]}</span>
        </button>
      ))}
    </div>
  );
}

function SeriesSwitch({ view, setView, peek, setPeek, disabled, compact, hintOK }) {
  const t0 = useRef(0);
  const done = () => {};
  // Hold-to-peek always ends: pointer released, cancelled, or the window loses focus.
  useEffect(() => { const b = () => { if (t0.current) { t0.current = 0; setPeek(false, true); } }; window.addEventListener('blur', b); return () => window.removeEventListener('blur', b); }, []);
  if (disabled) return <span className="fb-series is-off" title="Too few detections in this box to bridge the two sensors: raw only">Raw only</span>;
  const down = (e) => { if (e.button !== 0 || view === 'raw') return; t0.current = performance.now(); setPeek(true, true); e.currentTarget.setPointerCapture(e.pointerId); };
  const up = () => { if (!t0.current) return; const held = performance.now() - t0.current; t0.current = 0; if (held < 260) { setView('raw', true); done(); } setPeek(false, true); }; // via the same transition queue, so the order holds
  const shown = peek ? 'raw' : view;
  return (
    <span className="fb-series-wrap">
      <span className={cx('fb-series', compact && 'is-compact')} role="radiogroup" aria-label="Record shown everywhere: raw or harmonized">
        <button type="button" role="radio" aria-checked={shown === 'raw'} tabIndex={view === 'raw' ? 0 : -1} className={cx('fb-series-i', shown === 'raw' && 'is-on')}
          title="Raw: the two records simply joined. Hold this button, or hold R, to peek at it" onPointerDown={down} onPointerUp={up} onPointerCancel={up}
          onClick={(e) => { if (e.detail === 0) { setView('raw'); done(); } }}
          onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setView('harmonized'); requestAnimationFrame(() => document.querySelector('.fb-series [aria-checked="true"]').focus()); } }}>Raw</button>
        <button type="button" role="radio" aria-checked={shown === 'harmonized'} tabIndex={view === 'harmonized' ? 0 : -1} className={cx('fb-series-i', shown === 'harmonized' && 'is-on')}
          title="Harmonized: both satellites on the same scale (H)" onClick={() => { setView('harmonized'); done(); }}
          onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setView('raw'); requestAnimationFrame(() => document.querySelector('.fb-series [aria-checked="true"]').focus()); } }}>{compact ? <><span aria-hidden="true">Harm.</span><span className="sr-only">Harmonized</span></> : 'Harmonized'}</button>
      </span>
    </span>
  );
}

// v6 (B3): the compact zone button shortens the name instead of cutting it with an ellipsis.
const shortZone = (n) => n.replace(/^All of /, '').replace(/^Custom zone, .*/, 'Custom zone');
// v6.2 (P3): first-visit guide on the Dashboard: one dismissible line, three steps; hovering or focusing a step outlines
// its target. Dismissed for the rest of the session (module memory, no storage).
// v6.3 (Option A): hidden by default; guide=1 in the hash shows it (with or without anim=0); guide=0 and anim=0 keep it
// hidden. When hidden, no row is reserved for it (has-guide is not set).
let guideGone = (() => { try { const h = window.location.hash; return !/(^#|&)guide=1(&|$)/.test(h); } catch (e) { return true; } })();
function Guide({ onClose }) {
  const mark = (k) => { const a = document.querySelector('.fb-app'); if (a) { if (k) a.setAttribute('data-guide', k); else a.removeAttribute('data-guide'); } };
  const steps = [['map', 'Pick a place on the map'], ['answer', 'Read the answer at the top'], ['cal', 'See each month in the calendar']];
  return (
    <div className="fb-guide" role="note" aria-label="How to use this page">
      {steps.map(([k, l], i) => <button key={k} type="button" className="fb-guide-s" onMouseEnter={() => mark(k)} onMouseLeave={() => mark(null)} onFocus={() => mark(k)} onBlur={() => mark(null)}><b>{i + 1}</b>{l}</button>)}
      <button type="button" className="fb-guide-x" aria-label="Hide these tips" onClick={() => { mark(null); onClose(); }}><Icon d={IC.x} /></button>
    </div>
  );
}
// v6.2 (P4): a small glossary in the top bar, six plain entries.
const WORDS = [
  ['MODIS', 'The older NASA fire sensor (on the Terra and Aqua satellites), used from 2001.'],
  ['VIIRS', 'The newer, sharper fire sensor; it took over in 2012 and sees about twice as many small fires.'],
  ['The 2012 satellite change', 'The fire record switched from MODIS to VIIRS in 2012, so the two records simply joined jump that year even if fires did not.'],
  ['Raw', 'The two satellite records simply joined, without any correction.'],
  ['Harmonized', 'Both satellites on the same scale: the older years are multiplied by how much more the newer satellite sees.'],
  ['Fire detection (cell-day)', 'One 1 km square with at least one fire seen on one day; this is what all counts here add up.'],
];
function WordsMenu({ compact }) {
  return (
    <Pop id="fb-words" ariaLabel="Words used on this page" btnClass="fb-dlbtn fb-wordsbtn" panelClass="fb-pop-words" align="end" label={compact ? <span aria-hidden="true">?</span> : <span>Words</span>}>
      <dl className="fb-words">{WORDS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </Pop>
  );
}
function ZoneButton({ data, country, box, zoneName, onPick, compact }) {
  const C = data ? data[country] : null;
  const [typing, setTyping] = useState(false);
  return (
    <Pop id="fb-zone-pop" ariaLabel={'Zone: ' + zoneName + '. Change zone'} btnClass="fb-zonebtn" panelClass="fb-pop-zone" align="start" menu
      label={<><Icon d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /><span className="fb-zonebtn-t">{compact ? shortZone(zoneName) : zoneName}</span><Icon d={IC.down} /></>}>
      {(close) => (
        <>
          <div className="fb-pop-row">
            <span className="fb-pop-k">Country</span>
            <span className="fb-seg2" role="radiogroup" aria-label="Country">
              {['canada', 'argentina'].map((c) => <button key={c} type="button" role="radio" aria-checked={country === c} className={cx('fb-seg2-i', country === c && 'is-on')} onClick={() => { if (c !== country) onPick(c, PRESETS.find((q) => q.country === c).box); }}>{COUNTRIES[c]}</button>)}
            </span>
          </div>
          <div className="fb-pop-k">Presets</div>
          <ul className="fb-presetlist" role="none">
            {PRESETS.map((p, i) => {
              const on = p.country === country && sameBox(p.box, box);
              return (
                <li key={p.id} role="none" className={cx(i > 0 && PRESETS[i - 1].country !== p.country && 'is-sep')}>
                  <button type="button" role="menuitemradio" data-nav aria-checked={on} className={cx('fb-preset2', on && 'is-on')} onClick={() => { onPick(p.country, p.box); close(); }}>
                    <span>{p.label}</span><span className="fb-preset2-f">{p.reference ? <em className="fb-reftag">reference</em> : null}{data ? factOf(zoneOf(data, p.country, p.box)) : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="fb-typebtn" data-nav aria-expanded={typing} onClick={() => setTyping((x) => !x)}><Icon d={typing ? IC.down : IC.arrow} />Type a box</button>
          {typing && C && <BoxFields country={country} box={box} bbox={C.bbox} onBox={(b) => onPick(country, b)} done={<button type="button" className="at-btn at-btn-sm" onClick={close}>Done</button>} />}
        </>
      )}
    </Pop>
  );
}

// v6 (judge C2): a visible Download button with the export items (the ⋯ menu keeps them too).
function DownloadMenu({ onExport, disabled, compact }) {
  return (
    <Pop id="fb-dl" ariaLabel="Download: series CSV, calendar image, map layer" btnClass="fb-dlbtn" panelClass="fb-pop-menu" align="end" menu label={<><Icon d={IC.dl} />{!compact && <span>Download</span>}</>}>
      {(close) => {
        const go = (k) => { close(); onExport(k); };
        return (
          <>
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('csv')}><b>Series CSV</b><span>Monthly series with provenance</span></button>
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('svg')}><b>Calendar image (SVG)</b><span>The calendar as shown</span></button>
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('png')}><b>Calendar image (PNG)</b><span>The same drawing, 2× pixels</span></button>
            <button type="button" role="menuitem" data-nav onClick={() => go('map')}><b>Map layer (CSV)</b><span>One row per 0.5° place, with provenance</span></button>
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('hot')}><b>Raw hotspots…</b><span>Where to get the points for this box</span></button>
          </>
        );
      }}
    </Pop>
  );
}

function MoreMenu({ onExport, disabled, copyLink, copied, theme, toggleTheme, onAbout, meta }) {
  return (
    <Pop id="fb-more" ariaLabel="More: export, copy link, theme" btnClass="fb-morebtn" panelClass="fb-pop-menu" align="end" menu label={<Icon d="M5 12h.01M12 12h.01M19 12h.01" />}>
      {(close) => {
        const go = (k) => { close(); onExport(k); };
        return (
          <>
            <div className="fb-pop-k">Export</div>
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('csv')}><b>Series CSV</b><span>Monthly series with provenance</span></button>
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('svg')}><b>Calendar image (SVG)</b><span>The calendar as shown</span></button>
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('png')}><b>Calendar image (PNG)</b><span>The same drawing, 2× pixels</span></button>
            <button type="button" role="menuitem" data-nav onClick={() => go('map')}><b>Map layer (CSV)</b><span>One row per 0.5° place, with provenance</span></button>
            {Object.keys(HOTSPOT_FILES).map((n) => <button key={n} type="button" role="menuitem" data-nav onClick={() => { close(); downloadBlob('firebridge_hotspots_' + n + '.csv', new Blob([HOTSPOT_FILES[n]], { type: 'text/csv' })); }}><b>Raw hotspots (CSV) — {n}</b><span>NASA FIRMS points for this event</span></button>)}
            <button type="button" role="menuitem" data-nav disabled={disabled} onClick={() => go('hot')}><b>Raw hotspots…</b><span>Where to get the points for this box</span></button>
            <div className="fb-pop-sep" role="separator" />
            <button type="button" role="menuitem" data-nav onClick={() => { copyLink(); }}><b>{copied === 'ok' ? 'Link copied' : copied === 'fail' ? 'Copy failed: use the address bar' : 'Copy link'}</b><span>This view, as a URL</span></button>
            <button type="button" role="menuitem" data-nav onClick={() => { close(); toggleTheme(); }}><b>Switch to {theme === 'dark' ? 'light' : 'dark'} theme</b></button>
            <button type="button" role="menuitem" data-nav onClick={() => { close(); onAbout(); }}><b>About and credits</b><span>Challenge, data, AI use</span></button>
            <p className="fb-pop-meta">{meta}</p>
            <p className="fb-pop-meta">Tip: hold R (or hold the Raw button) to peek at the raw record.</p>
          </>
        );
      }}
    </Pop>
  );
}

function HotDialog({ open, text, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} className="fb-dialog" aria-labelledby="fb-hot-t" onClose={onClose}>
      <h2 id="fb-hot-t" className="fb-paneltitle">Raw hotspots for this box and period come from NASA FIRMS</h2>
      <p className="fb-pop-p">This prototype holds monthly 0.5° counts, not individual detections, so it does not make that file. Request the points from FIRMS with these values:</p>
      <pre className="fb-hot-pre at-mono">{text}</pre>
      <div className="fb-dialog-act">
        <button type="button" className="at-btn" onClick={() => copyText(text).then((ok) => { setCopied(ok); setTimeout(() => setCopied(false), 2000); })}><Icon d={copied ? IC.check : IC.copy} />{copied ? 'Copied' : 'Copy request'}</button>
        <button type="button" className="at-btn at-btn-primary" onClick={onClose}>Close</button>
      </div>
    </dialog>
  );
}

/* ───────── the app ───────── */
export function App() {
  const [theme, toggleTheme0] = useTheme();
  const init = useMemo(readHash, []);
  const [st, setSt] = useState(init.st);
  const set = useCallback((patch) => setSt((s) => Object.assign({}, s, typeof patch === 'function' ? patch(s) : patch)), []);
  useEffect(() => { writeHash(st); }, [st]);
  const autoSel = useRef(!init.hasM);
  // No document-wide View Transitions: they captured the page and swallowed clicks for ~200–400 ms (audit-v5 D1/S3).
  // Motion is local instead: map canvas cross-fade, calendar fade, tab and step content fade-in (v5.css).
  const runVT = useCallback((fn) => fn(), []);
  useEffect(() => {
    const on = () => { const r = readHash(); autoSel.current = !r.hasM; setSt(r.st); };
    window.addEventListener('popstate', on);
    window.addEventListener('hashchange', on);
    return () => { window.removeEventListener('hashchange', on); window.removeEventListener('popstate', on); };
  }, []);
  const w = useWidth(), h = useHeight();
  const phone = w < 760, tablet = w >= 760 && w < 1280, rail = false; // v5.2: the strip is the layout at every width ≥ 1280 (user decision); the rail code stays but is unreachable
  const [data, setData] = useState(null);
  const [peek, setPeek] = useState(false);
  const [warm, setWarm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const [showGuide, setShowGuide] = useState(!guideGone);
  const closeGuide = useCallback(() => { guideGone = true; setShowGuide(false); }, []);
  const [hlYear, setHlYear] = useState(null); // calendar → map
  const [markYear, setMarkYear] = useState(null); // map → calendar
  const [hot, setHot] = useState(false);

  // Decode the tiles in small tasks after the first paint: the current country first, then the other.
  useEffect(() => {
    let alive = true;
    const t0 = performance.now();
    const read = (id) => decodeCountry(JSON.parse(document.getElementById(id).textContent));
    const first = st.country, second = first === 'canada' ? 'argentina' : 'canada';
    const out = {};
    // First country, then (after the verdict and the map have painted) the other one, in separate tasks.
    const a = () => { if (!alive) return; out[first] = read('fb-' + first); setData(Object.assign({}, out)); requestAnimationFrame(() => setTimeout(() => { if (alive) setWarm(true); requestAnimationFrame(() => setTimeout(b, 60)); }, 0)); };
    const b = () => { if (!alive) return; out[second] = read('fb-' + second); window.__fbDecodeMs = Math.round(performance.now() - t0); setData(Object.assign({}, out)); };
    const raf = requestAnimationFrame(() => setTimeout(a, 0));
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  // Zone-dependent work (computeZone, cell statistics) runs on deferred copies of the zone, so the input that changed
  // it (preset, click, drawn box) paints first and the numbers follow in the next render (SPEC_V5 §7).
  const dCountry = useDeferredValue(st.country), dBox = useDeferredValue(st.box);
  const C = data ? data[dCountry] : null;
  const Z = useMemo(() => {
    if (!C) return null;
    const t0 = performance.now();
    const z = zoneOf(data, dCountry, dBox);
    window.__fbComputeMs = Math.round((performance.now() - t0) * 10) / 10;
    return z;
  }, [C, dCountry, dBox.s, dBox.n, dBox.w, dBox.e]);
  // Overview: always the whole selected country (the same cached zone the Dashboard uses for that preset).
  const ovZ = useMemo(() => { if (!data || !data[st.country] || st.tab !== 'overview') return null; const p = PRESETS.find((q) => q.whole && q.country === st.country); return zoneOf(data, st.country, p.box); }, [data, st.country, st.tab]);
  const ovOfficial = useMemo(() => (ovZ && st.country === 'canada' ? officialCheck(officialData(), ovZ) : null), [ovZ, st.country]);
  // v6 (judge C4): the default readout is the peak month of the last complete calendar year (the last complete fire
  // season in both countries), not an off-season December. Still a default: the chip and the hash show a chosen month only.
  const defSel = useMemo(() => { if (!Z) return NM - 1; const p = peakOfLastYear(Z); if (p != null) return p; const j = Z.harmOK ? lastComparable(Z, NM - 1) : null; return j == null ? NM - 1 : j; }, [Z]);
  // Month rule (v5.2): a month the user chose stays through zone changes (every zone covers the same months); otherwise
  // the selection follows the zone's default (its latest comparable month). The chip and the hash show a chosen month only.
  useEffect(() => {
    if (!Z) return;
    setFellBack(!st.mPicked && defSel !== NM - 1 && Z.typical[(NM - 1) % 12] < LOW);
    if (!st.mPicked && defSel !== st.sel) set({ sel: defSel });
  }, [Z, st.mPicked, st.sel]); // v6.2: also when a restored state (Back, reload) brings an unchosen month back
  // Idle precompute (v5.1, audit-v5 D5): the presets' zones, one per idle slice, once both countries are decoded, so a
  // preset, a country change and the zone menu's live verdicts read from the cache instead of computing.
  useEffect(() => {
    if (!data || !data.canada || !data.argentina) return undefined;
    let i = 0, h = 0, alive = true;
    const ric = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 50));
    const step = (dl) => { if (!alive) return; while (i < PRESETS.length && dl.timeRemaining() > 4) { const p = PRESETS[i++]; zoneOf(data, p.country, p.box); } if (i < PRESETS.length) h = ric(step); };
    h = ric(step);
    return () => { alive = false; (window.cancelIdleCallback || clearTimeout)(h); };
  }, [data]);
  // Cell statistics, per country, when that country is shown (map, Evidence, How it works, Method).
  const cellCache = useRef({});
  const cellsFor = (c) => { if (!data || !data[c]) return null; if (!cellCache.current[c]) { const t0 = performance.now(); cellCache.current[c] = cellStats(data[c]); (window.__fbCellMs = window.__fbCellMs || {})[c] = Math.round(performance.now() - t0); } return cellCache.current[c]; };
  const S = useMemo(() => (warm ? cellsFor(dCountry) : null), [data, dCountry, warm]); // after the first paint of the verdict
  const needBoth = st.tab === 'method' || st.tab === 'how';
  const cells = useMemo(() => (needBoth && data && data.canada && data.argentina ? { canada: cellsFor('canada'), argentina: cellsFor('argentina') } : null), [data, needBoth]);
  const floors = useMemo(() => (st.tab === 'method' && data && data.canada && data.argentina ? { canada: floorShare(data.canada), argentina: floorShare(data.argentina) } : null), [data, st.tab]);
  const y0 = +st.from.slice(0, 4), y1 = +st.to.slice(0, 4);
  const cd = useMemo(() => (Z ? calendarData(Z, y0, y1) : null), [Z, y0, y1]);
  const preset = presetFor(dCountry, dBox);
  const whole = !!(preset && preset.whole);
  const reference = !!(preset && preset.reference);
  const cover = useMemo(() => (C && !whole ? boxCover(dCountry, C, dBox) : null), [C, whole, dBox.s, dBox.n, dBox.w, dBox.e]);
  const zoneName = preset ? preset.label : 'Custom zone, ' + COUNTRIES[dCountry];
  const official = useMemo(() => (Z && preset && preset.id === 'canada' ? officialCheck(officialData(), Z) : null), [Z, preset && preset.id]);
  const outside = !!(cover && cover.inside === 0);
  const empty = !!(Z && (Z.empty || outside));
  const view = Z && !Z.harmOK ? 'raw' : st.view;
  const series = peek ? 'raw' : view; // the effective record shown everywhere
  const harmOK = !!(Z && Z.harmOK);

  // How it works example.
  const showThis = !preset || (preset.id !== 'canada' && preset.id !== 'larioja');
  const ex0 = st.ex === 'zone' && !showThis ? (preset && preset.id === 'larioja' ? 'larioja' : 'canada') : st.ex;
  // v6.2: the country example follows the selected country (state value 'canada' means "the whole selected country").
  const ex = ex0 === 'canada' && st.country === 'argentina' ? 'argentina' : ex0;
  const exZ = useMemo(() => { if (!data || st.tab !== 'how') return null; if (ex === 'zone') return Z; const p = PRESETS.find((q) => q.id === ex); return zoneOf(data, p.country, p.box); }, [data, ex, Z, st.tab]);
  const exOfficial = useMemo(() => (exZ && ex === 'canada' ? officialCheck(officialData(), exZ) : null), [exZ, ex]);
  const exName = ex === 'zone' ? zoneName : PRESETS.find((q) => q.id === ex).label;
  const wholeZ = useMemo(() => { if (!data || !data[st.country] || st.tab !== 'method') return null; const p = PRESETS.find((q) => q.id === st.country); return zoneOf(data, st.country, p.box); }, [data, st.country, st.tab]);
  const ratioRange = useMemo(() => { if (!data || !data.canada || !data.argentina || st.tab !== 'method') return null; const r = PRESETS.map((p) => zoneOf(data, p.country, p.box)).filter((z) => z.harmOK).map((z) => z.ratio); return [Math.min(...r), Math.max(...r)]; }, [data, st.tab]);

  // State changes that the eye should follow run in a View Transition (instant with reduced motion).
  const setView = useCallback((v, now) => (now ? set({ view: v }) : runVT(() => set({ view: v }), 'flip')), []); // now: a tap on Raw already shows raw (peek on press)
  const setTab = useCallback((t) => { setHlYear(null); setMarkYear(null); runVT(() => set({ tab: t }), 'tab'); }, []); // no hover highlight survives a tab change
  // The map canvas cross-fades itself (no page transition). "This month" with no month chosen opens on the zone's record
  // month (December is an off-season month in Canada: the layer opened nearly blank, audit-v5 DB12).
  const zRef = useRef(null); zRef.current = { Z, defSel };
  const setLayer = useCallback((l) => set((s) => { const q = zRef.current; return l === 'month' && q.Z && !q.Z.empty && !s.mPicked ? { layer: l, sel: recordMonth(q.Z), mPicked: true } : { layer: l }; }), []);
  // Peek (hold Raw or R): the same 200 ms map + calendar cross-fade as a flip, both directions.
  const peekVT = useCallback((v, vt) => (vt ? runVT(() => setPeek(v), 'flip') : setPeek(v)), []);
  const toggleTheme = useCallback(() => runVT(() => toggleTheme0(), 'theme'), [toggleTheme0]);
  const pick = useCallback((country, box) => { autoSel.current = true; set({ country, box }); }, []); // the map flies; the number fades (no View Transition: it held the paint ~300 ms)
  const onBox = useCallback((b) => set((s) => ({ box: b })), []);
  const onMapBox = useCallback((b) => { autoSel.current = true; set({ box: b }); }, []);
  const onSelect = useCallback((i) => { setFellBack(false); set({ sel: i, mPicked: true }); }, []);
  const onClearMonth = useCallback(() => set({ mPicked: false }), []);
  const setRange = useCallback((from, to) => set((s) => { const k = monthKey(s.sel); return s.mPicked && (k < from || k > to) ? { from, to, mPicked: false } : { from, to }; }), []); // a chosen month outside the new range is cleared
  const setCv = useCallback((v) => set({ cv: v }), []);
  const larger = () => { if (!C) return; const bb = C.bbox, b = st.box; pick(st.country, { s: Math.max(bb.s, b.s - 2), n: Math.min(bb.n, b.n + 2), w: Math.max(bb.w, b.w - 2), e: Math.min(bb.e, b.e + 2) }); };
  // Outside the data: jump to a 2° box around the nearest place with data (same country).
  const nearest = () => {
    if (!S || !C) return;
    const cy = (st.box.s + st.box.n) / 2, cxx = (st.box.w + st.box.e) / 2, kk = Math.cos(cy * Math.PI / 180);
    let best = null, bd = Infinity;
    for (const c of S.cells) { if (!c.eligible) continue; const d = Math.hypot(c.lat + 0.25 - cy, (c.lon + 0.25 - cxx) * kk); if (d < bd) { bd = d; best = c; } }
    if (!best) return;
    const bb = C.bbox, s0 = Math.max(bb.s, Math.floor((best.lat - 0.75) * 2) / 2), w0 = Math.max(bb.w, Math.floor((best.lon - 0.75) * 2) / 2);
    pick(st.country, { s: s0, n: Math.min(bb.n, s0 + 2), w: w0, e: Math.min(bb.e, w0 + 2) });
  };
  const goMethod = useCallback(() => set({ tab: 'method' }), []);
  const openPicker = () => { const b = document.querySelector('.fb-zonebtn'); b && b.click(); };

  // Keys: R (tap: raw; hold: peek), H harmonized, A anomaly, 1–5 tabs (1 = Overview). Not when typing.
  const rDown = useRef(0);
  useEffect(() => {
    const typing = (e) => { const t = e.target, tag = t && t.tagName; return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (t && t.isContentEditable); };
    const kd = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      const k = e.key.toLowerCase();
      if (k === 'r') { if (e.repeat || !harmOK) return; if (st.view === 'harmonized') { rDown.current = performance.now(); peekVT(true, true); } return; }
      if (e.key === 'Escape' && st.tab === 'dash' && st.mPicked && !document.querySelector(':popover-open') && !document.querySelector('.fb-map-view[data-draw="1"]')) { set({ mPicked: false }); return; }
      if (k === 'h' && harmOK) { setView('harmonized'); return; }
      if (k === 'a' && harmOK && st.tab === 'dash') { set((s) => ({ cv: s.cv === 'anomaly' ? 'counts' : 'anomaly', view: 'harmonized' })); return; }
      if (/^[1-5]$/.test(e.key) && !(e.target && e.target.closest && e.target.closest('.fb-map-view'))) setTab(TABS[+e.key - 1]);
    };
    const ku = (e) => {
      if (e.key.toLowerCase() !== 'r' || !rDown.current) return;
      const held = performance.now() - rDown.current; rDown.current = 0;
      if (held < 260) setView('raw', true);
      peekVT(false, true);
    };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    return () => { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
  }, [harmOK, st.view, st.tab, st.mPicked]);
  useEffect(() => { const b = () => { if (rDown.current) { rDown.current = 0; setPeek(false); } }; window.addEventListener('blur', b); return () => window.removeEventListener('blur', b); }, []);

  const stem = fileStem(zoneName, st.from, st.to);
  const calView = series === 'raw' ? 'raw' : st.cv === 'anomaly' ? 'anomaly' : 'harmonized';
  const onExport = (k) => {
    if (k === 'map' && S) { downloadBlob('firebridge_map_' + st.country + '_' + st.layer + '.csv', new Blob([mapCsv(S, st, series, monthKey(st.sel), data[st.country])], { type: 'text/csv' })); return; }
    if (!Z || empty) return;
    if (k === 'csv') downloadBlob(stem + '.csv', new Blob([seriesCsv(Z, st, zoneName, reference)], { type: 'text/csv' }));
    if (k === 'svg') downloadSvg(stem.replace('firebridge_', 'firebridge_calendar_') + '_' + calView + '.svg', calendarSvg(cd, Z.harmOK ? calView : 'raw', zoneName, Z, monthKey(st.sel)).svg);
    if (k === 'png') downloadPng(stem.replace('firebridge_', 'firebridge_calendar_') + '_' + calView + '.png', calendarSvg(cd, Z.harmOK ? calView : 'raw', zoneName, Z, monthKey(st.sel), true));
    if (k === 'hot') setHot(true);
  };
  const copyLink = () => copyText(window.location.href).then((ok) => { setCopied(ok ? 'ok' : 'fail'); setTimeout(() => setCopied(false), 2000); });

  // Read-only snapshot for tools/coherence.mjs (state vs DOM invariants). Not used by the app.
  if (typeof window !== 'undefined') window.__fb = { st, peek, series, harmOK, empty, outside, whole, zoneName, pending: st.country !== dCountry || st.box !== dBox,
    guard: !!(Z && Z.guard), uncertain: !!(Z && Z.harmOK && Z.trend && Z.trend.status === 'uncertain'), ratio: Z && Z.harmOK ? Z.ratio.toFixed(2) : null, borrowed: !!(Z && Z.gradeWhy === 'borrowed'),
    hero: Z && !Z.empty && Z.harmOK ? (Z.trend && Z.trend.status === 'uncertain' ? '÷' + Z.ratio.toFixed(1) : X(series === 'raw' ? Z.riseRaw : Z.riseH)) : null };
  const meta = 'NASA FIRMS · MODIS + VIIRS · 2001–' + CAL_LAST + ' · last month ' + endLabel() + (data && data[st.country] && data[st.country].provSet.has(NM - 1) ? ' (provisional)' : '');
  const verdict = (variant) => <Verdict variant={variant} wide={w >= 1680} Z={Z} box={dBox} zoneName={zoneName} official={official} cover={cover} country={COUNTRIES[dCountry]} onEvidence={() => setTab('evidence')} onMethod={() => setTab('method')} onLarger={larger} onPicker={openPicker} onNearest={nearest} rawView={series === 'raw' && harmOK} />;
  const mapPanel = <MapPanel monthPicked={st.mPicked} onMethod={goMethod} C={C} S={S} country={dCountry} box={st.country === dCountry ? st.box : dBox} onBox={onMapBox} harm={series === 'harmonized' && harmOK} rawOnly={!harmOK && !!Z} layer={st.layer} setLayer={setLayer} sel={st.sel} theme={theme} phone={phone} hlYear={hlYear} onHoverYear={setMarkYear} />;
  const calPanel = <CalPanel onMethod={goMethod} mPicked={st.mPicked} onClear={onClearMonth} Z={Z} cd={cd} empty={empty} outside={outside} onLarger={larger} onNearest={nearest} series={series} cv={st.cv} setCv={setCv} from={st.from} to={st.to} setRange={setRange} sel={st.sel} defSel={defSel} defIsPeak={!!Z && peakOfLastYear(Z) === defSel} onSelect={onSelect} onHoverYear={setHlYear} markYear={markYear} phone={phone} />;
  const layoutClass = rail ? 'is-rail' : tablet ? 'is-tablet' : phone ? 'is-phone' : 'is-strip';

  let content;
  if (st.tab === 'overview') {
    content = <Overview Z={ovZ} country={st.country} official={ovOfficial} raw={peek || st.view === 'raw'} peek={peek} phone={phone}
      onCountry={(c) => { if (c !== st.country) pick(c, PRESETS.find((q) => q.whole && q.country === c).box); }}
      onPeek={(v) => peekVT(v, true)} onToggleView={() => setView(view === 'raw' ? 'harmonized' : 'raw', true)}
      onOpen={() => setTab('dash')} onHow={() => setTab('how')} onMethod={() => setTab('method')} />;
  } else
  if (st.tab === 'dash') {
    content = (rail || (!tablet && !phone)) ? (
      <div className={cx('fb-dashb', layoutClass, 'is-' + dCountry, showGuide && 'has-guide')}>
        {showGuide && <Guide onClose={closeGuide} />}
        {verdict(rail ? 'rail' : 'strip')}
        {mapPanel}
        {calPanel}
      </div>
    ) : (
      <div className={cx('fb-dashb', layoutClass, 'is-' + dCountry, showGuide && 'has-guide')}>
        {showGuide && <Guide onClose={closeGuide} />}
        {verdict('card')}
        <div className="fb-panelswitch fb-seg2" role="tablist" aria-label="Panel">
          {[['map', 'Map'], ['cal', 'Calendar']].map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={st.panel === v} className={cx('fb-seg2-i', st.panel === v && 'is-on')} onClick={() => runVT(() => set({ panel: v }), 'layer')}>{l}</button>)}
        </div>
        {st.panel === 'map' ? mapPanel : calPanel}
      </div>
    );
  } else if (st.tab === 'evidence') {
    content = (
      <div className="fb-evtab">
        <h2 className="fb-evhead">{zoneName}</h2>
        <Evidence Z={Z} S={S} official={official} country={dCountry} zoneName={zoneName} reference={reference} sel={st.sel} onSelect={onSelect} from={st.from} to={st.to} fellBack={fellBack} phone={phone} whole={whole} box={st.box} />
      </div>
    );
  } else if (st.tab === 'how') {
    content = <How onEvidence={() => setTab('evidence')} Z={exZ} cells={cells} ex={ex} setEx={(v) => set({ ex: v === 'argentina' ? 'canada' : v })} showThis={showThis} zoneName={exName} official={exOfficial} step={st.step} setStep={(n) => runVT(() => set({ step: Math.max(1, Math.min(4, n)) }), 'tab')} reference={ex === 'zone' && reference} phone={phone} />;
  } else {
    content = <Method onEvidence={() => setTab('evidence')} cells={cells} floors={floors} country={st.country} wholeZ={wholeZ} ratioRange={ratioRange} countryName={COUNTRIES[st.country]} official={official} phone={phone} Z={Z} zoneName={zoneName} reference={reference} showOverlap cdValidation={{}} />;
  }

  // One h1 per page (v6): the Overview headline and the Method title are the page's h1 there; elsewhere the wordmark is.
  const BrandTag = st.tab === 'overview' || st.tab === 'method' ? 'div' : 'h1';
  return (
    <div className={cx('fb-app', layoutClass, 'tab-' + st.tab)}>
      <a className="fb-skip" href="#fb-tabpanel">Skip to content</a>
      <header className="fb-top2">
        <BrandTag className="fb-brand"><Mark /><span className="product-name">FireBridge</span><span className="sr-only"> — MODIS and VIIRS fire hotspots, harmonized</span></BrandTag>
        {!phone && <Tabs tab={st.tab} setTab={setTab} />}
        <span className="fb-topgap">{!phone && <span className="fb-subtitle"><span>Fire detections from MODIS and VIIRS on one scale</span><span><span className="sr-only"> · </span>Canada and Argentina · 2001–{CAL_LAST}</span></span>}</span>
        <ZoneButton data={data} country={st.country} box={st.box} zoneName={zoneName} onPick={pick} compact={phone || w < 1024} />
        <SeriesSwitch view={view} setView={setView} peek={peek} setPeek={peekVT} disabled={!!Z && !harmOK} compact={phone || w < 1024} hintOK={st.tab === "dash"} />
        {st.tab === 'dash' && !phone && w >= 1024 && <DownloadMenu onExport={onExport} disabled={!Z || empty} compact={phone || w < 1280} />}
        <WordsMenu compact={phone || w < 1280} />
        <MoreMenu meta={meta} onExport={onExport} disabled={!Z || empty} copyLink={copyLink} copied={copied} theme={theme} toggleTheme={toggleTheme} onAbout={() => { setTab('method'); setTimeout(() => { const el = document.getElementById('m-about'); el && el.scrollIntoView({ block: 'start' }); }, 50); }} />
      </header>
      <main className="fb-main"><div id="fb-tabpanel" className={cx('fb-tabarea', 'is-' + st.tab)} role="tabpanel" aria-labelledby={'fb-tab-' + st.tab} tabIndex={-1} data-meta={'2001–' + CAL_LAST + ' · last month ' + endLabel()}>
        <div className="fb-tabin" key={st.tab}>{content}</div>
      </div></main>
      {phone && <nav className="fb-bottomnav" aria-label="Views"><Tabs tab={st.tab} setTab={setTab} bottom /></nav>}
      <HotDialog open={hot} text={Z ? hotspotText(st.box, st.from, st.to) : ''} onClose={() => setHot(false)} />
    </div>
  );
}
