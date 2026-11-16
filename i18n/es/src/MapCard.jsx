// The map card (SPEC_V3 §3–§4): the zone picker AND the record-years map. Four layers on the 0.5° cells, one shared
// Raw/Harmonized state with the calendar, click / drag / arrows to choose a box, presets menu, type-a-box, zoom and pan.
import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Segmented } from '../ds/components/src/components.jsx';
import { formatNumber, formatDecimal } from '../ds/components/src/scale.js';
import { PRESETS, sameBox, LAST, SW, STATS_FROM, monthLayer, cellSummary, cellKey, countBreaks, countClass, ratioPercentiles, cellBlocks, flipCounts, versus } from './metrics.js';
import { boxText, boxSize, monthLong, PCT, recordSentence, chanceRange } from './copy.js';
import { outlines, makeProj, ringsPath } from './geo.js';
import { PLACES } from './places.js';
import { BoxFields } from './Picker.jsx';
import { cx, cssColor, Icon, IC, reduced } from './util.jsx';

const COUNTRIES = { canada: 'Canada', argentina: 'Argentina' };
export const LAYERS = [
  { value: 'rec', label: 'Record years' }, { value: 'ratio', label: 'Sensor effect' },
  { value: 'month', label: 'This month' }, { value: 'det', label: 'Detections' },
];
const snapDown = (v) => Math.floor(v * 2 + 1e-9) / 2, snapUp = (v) => Math.ceil(v * 2 - 1e-9) / 2;
// Sensor-effect classes: local VIIRS ÷ MODIS, single-hue gray ramp of the DS (gray-1 … gray-8).
export const RATIO_BREAKS = [1.5, 2, 2.5, 3, 4];
const RATIO_TOK = [0, 2, 3, 5, 6, 8]; // --civ-* (cividis family, passes tools/cvd.mjs)
const ratioClass = (r) => { let k = 0; RATIO_BREAKS.forEach((b) => { if (r >= b) k++; }); return k; };
const fx = (r) => formatDecimal(r, r < 10 ? 1 : 0, 'en') + '×';
const P1 = (x) => (x == null ? '—' : Math.round(x * 100) + '%');

function useBox(ref) {
  const [s, setS] = useState({ w: 480, h: 260 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((es) => { const r = es[0].contentRect; if (r.width > 0 && r.height > 0) setS({ w: Math.round(r.width), h: Math.round(r.height) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return s;
}

function PresetsMenu({ country, box, onPick, facts, onType, typeOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current && ref.current.querySelector('button').focus(); } };
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="fb-export fb-mc-presets is-right" ref={ref}>
      <button type="button" className="at-btn at-btn-sm fb-mc-btn" aria-haspopup="true" aria-expanded={open} aria-controls="fb-presets-menu" onClick={() => setOpen((o) => !o)}>Presets<Icon d={IC.down} /></button>
      {open && (
        <div className="fb-menu fb-presets-menu" id="fb-presets-menu" role="menu">
          {PRESETS.map((p, i) => {
            const on = p.country === country && sameBox(p.box, box);
            return (
              <button key={p.id} type="button" role="menuitemradio" aria-checked={on} className={cx(on && 'is-on', i > 0 && PRESETS[i - 1].country !== p.country && 'is-sep', i > 0 && PRESETS[i - 1].reference && !p.reference && p.country === PRESETS[i - 1].country && 'is-sep')}
                onClick={() => { setOpen(false); onPick(p.country, p.box); }}>
                <b>{p.label}{p.reference ? <span className="fb-preset-ref"> · reference</span> : null}</b><span>{facts ? facts[p.id] : ''}</span>
              </button>
            );
          })}
          <button type="button" role="menuitem" className="is-sep" aria-expanded={typeOpen} onClick={() => { setOpen(false); onType(); }}><b>Type a box…</b><span>Four coordinates, 0.5° grid</span></button>
        </div>
      )}
    </div>
  );
}

export function MapCard({ rawOnly, C, S, country, box, onPick, view, setView, layer, setLayer, sel, facts, theme, phone, zoneName, onExportMap }) {
  const harm = view !== 'raw';
  const [typeOpen, setTypeOpen] = useState(false);
  const setCountry = (c) => { if (c === country) return; const p = PRESETS.find((q) => q.country === c); onPick(c, p.box); };
  const ML = useMemo(() => (C && S && layer === 'month' ? monthLayer(C, S, sel) : null), [C, S, layer, sel]);
  const boxSum = useMemo(() => (S ? cellSummary(S.cells, S, box) : null), [S, box.s, box.n, box.w, box.e]);
  const detBreaks = useMemo(() => (S ? countBreaks(S.cells.filter((c) => c.eligible || c.det > 0).map((c) => c.det)) : null), [S]);
  const pc = useMemo(() => (S ? ratioPercentiles(S) : null), [S]);
  const whole = !!PRESETS.find((p) => p.whole && p.country === country && sameBox(p.box, box));
  const mName = monthLong(sel % 12) + ' ' + (2001 + Math.floor(sel / 12));

  let legend = null, count = null;
  if (S) {
    const s = S.summary;
    if (layer === 'rec') {
      legend = (
        <>
          <span className="fb-lg"><i className="fb-sw is-before" aria-hidden="true" />record before 2012</span>
          <span className="fb-lg"><i className="fb-sw is-since" aria-hidden="true" />since 2012</span>
          <span className="fb-lg"><i className="fb-sw is-hatch" aria-hidden="true" />{harm ? 'depends on ratio, or tie' : 'tie'}</span>
          <span className="fb-lg" title="Local VIIRS ÷ MODIS above 4×: unusual for vegetation fire; possible non-fire heat sources, not verified. Not bridged and not counted."><i className="fb-sw is-nb" aria-hidden="true" />ratio &gt; 4×: not bridged</span>
        </>
      );
      const rs = recordSentence(s, versus), bs = !whole && boxSum && boxSum.n ? recordSentence(boxSum, versus) : null;
      const rng = chanceRange;
      count = (
        <>
          <p className="fb-mc-count" title={'Chance ranges (5th–95th percentile, ' + S.perms.length + ' permutations of the year labels, the same for every place): raw ' + rng(s.chanceRaw) + ', harmonized ' + rng(s.chanceHarm) + ', MODIS alone ' + rng(s.chanceModis) + '. ' + s.n + ' places; ' + s.excludedHigh + ' with a local ratio above 4× are not bridged and not counted.'}>
            {rs.head} {rs.chance}. <b>{rs.verdict}</b> <span className="fb-muted">A record is one year, not a trend.</span>
          </p>
          {!whole && boxSum && <p className="fb-mc-count fb-mc-box">{bs ? 'This box (' + boxSum.n + '): raw ' + Math.round(boxSum.sinceRaw * 100) + '%, harmonized ' + Math.round(boxSum.sinceHarm * 100) + '%, MODIS alone ' + Math.round(boxSum.sinceModis * 100) + '%; chance ' + rng(boxSum.chanceHarm) + '. ' + bs.verdict : 'This box: no place with ≥ 200 cell-days and a ratio ≤ 4×.'}</p>}
        </>
      );
    } else if (layer === 'ratio') {
      legend = (
        <>
          <span className="fb-lg fb-ramp is-steps" role="img" aria-label={'Classes: under 1.5, then ' + RATIO_BREAKS.join(', ') + ', and 4 or more'}>{RATIO_TOK.map((t, k) => <span key={t}><i style={{ background: 'var(--civ-' + t + ')' }} />{k < RATIO_BREAKS.length && <em>{RATIO_BREAKS[k]}</em>}</span>)}<em>×</em></span>
          <span className="fb-lg is-note">raw data read N× too high here; faded: country ratio; <i className="fb-sw is-nbr" aria-hidden="true" /> above 4×: not bridged — unusual for vegetation fire; possible non-fire heat sources, not verified</span>
        </>
      );
      count = <p className="fb-mc-count">Local ratio across {formatNumber(s.n, 'en')} places: median {fx(pc.p50)}, 90% of places between {fx(pc.p5)} and {fx(pc.p95)}; {COUNTRIES[country]} as a whole {formatDecimal(S.countryRatio, 2, 'en')}×. <span className="fb-muted">{s.excludedHigh} places above 4× are not bridged; causes not investigated.</span></p>;
    } else if (layer === 'month') {
      legend = (
        <>
          <span className="fb-lg"><i className="fb-sw is-filled" aria-hidden="true" />record</span>
          <span className="fb-lg"><i className="fb-sw is-light" aria-hidden="true" />top 3</span>
          <span className="fb-lg"><i className="fb-sw is-dot" aria-hidden="true" />active, not unusual</span>
          <span className="fb-lg is-note">vs the same month of {STATS_FROM}–{ML && ML.years.length ? ML.years[ML.years.length - 1] : LAST}, harmonized</span>
        </>
      );
      count = ML && <p className="fb-mc-count"><b>{mName}: where it was a record.</b> A record in {formatNumber(ML.counts.rec, 'en')} {ML.counts.rec === 1 ? 'place' : 'places'}, top 3 in {formatNumber(ML.counts.top3, 'en')}, active in {formatNumber(ML.counts.act, 'en')}; no detection in {formatNumber(ML.counts.none, 'en')} (of {formatNumber(s.n, 'en')}). <span className="fb-muted">Ranked, not compared with a typical month: counts per place are too small. Select another month in the calendar.</span></p>;
    } else {
      legend = (
        <>
          <span className="fb-lg fb-ramp is-steps" role="img" aria-label={'Classes from ' + detBreaks[0] + ' to ' + detBreaks[8] + ' or more'}><em>{formatNumber(detBreaks[0], 'en')}</em>{Array.from({ length: 9 }, (_, k) => <span key={k}><i style={{ background: 'var(--seq-' + k + ')' }} /></span>)}<em>{formatNumber(detBreaks[8], 'en')}+</em></span>
          <span className="fb-lg is-note">mean cell-days per year, VIIRS, 2012–{LAST}</span>
        </>
      );
      count = <p className="fb-mc-count">Where VIIRS records fire activity: {formatNumber(S.cells.filter((c) => c.det > 0).length, 'en')} places with at least one detection. <span className="fb-muted">A yearly scale, not the calendar’s monthly one. The other layers show what the bridge changes.</span></p>;
    }
  }

  return (
    <section className={cx('fb-card fb-mapcard', phone && 'is-phone')} id="map" aria-labelledby="fb-map-t">
      <h2 className="at-sr" id="fb-map-t">Map: choose a zone; where records fell, raw and harmonized</h2>
      <div className="fb-mc-head">
        <Segmented size="sm" ariaLabel="Country" value={country} onChange={setCountry} options={[{ value: 'canada', label: 'Canada' }, { value: 'argentina', label: 'Argentina' }]} />
        <Segmented size="sm" ariaLabel="Series shown on the map and the calendar" value={harm ? 'harmonized' : 'raw'} onChange={setView} options={rawOnly ? [{ value: 'raw', label: 'Raw only: this box is not bridged' }] : [{ value: 'raw', label: 'Raw' }, { value: 'harmonized', label: 'Harmonized' }]} />
        <PresetsMenu country={country} box={box} onPick={onPick} facts={facts} onType={() => setTypeOpen(true)} typeOpen={typeOpen} />
      </div>
      <div className="fb-mc-layers"><Segmented size="sm" ariaLabel="Map layer" value={layer} onChange={setLayer} options={LAYERS} /></div>
      {S && layer === 'rec' && (() => {
        const f = flipCounts(S);
        const q = (n) => formatNumber(n, 'en') + (n === 1 ? ' place' : ' places');
        return <p className="fb-mc-flip" aria-live="polite">{harm ? 'Harmonized: ' + q(f.toBefore) + ' move to “before 2012”; ' + f.toSince + ' the other way.' : 'Raw. Harmonizing moves ' + q(f.toBefore) + ' to “before 2012”; ' + f.toSince + ' the other way.'}</p>;
      })()}
      <div className="fb-mc-mapwrap">
        {C && S ? <MapView C={C} S={S} ML={ML} detBreaks={detBreaks} country={country} box={box} wholeBox={whole} onBox={(b) => onPick(country, b)} harm={harm} layer={layer} theme={theme} phone={phone} mName={mName} /> : <div className="fb-map-wait" aria-hidden="true" />}
      </div>
      {typeOpen && C && (
        <div className="fb-mc-type">
          <BoxFields country={country} box={box} bbox={C.bbox} onBox={(b) => onPick(country, b)} done={<button type="button" className="at-btn at-btn-sm" onClick={() => setTypeOpen(false)}>Close</button>} />
        </div>
      )}
      <div className="fb-mc-legend" title={'Places drawn: 0.5° tiles with at least 200 harmonized cell-days, ' + STATS_FROM + '–' + LAST + '. Counters always use the 0.5° places; at country scale the map groups them in 1° blocks (majority era).'}>{legend}</div>
      {count}
    </section>
  );
}

function MapView({ C, S, ML, detBreaks, country, box, wholeBox, onBox, harm, layer, theme, phone, mName }) {
  const wrap = useRef(null), cvs = useRef(null);
  const size = useBox(wrap);
  const bb = C.bbox;
  // "Fit country": the extent of the places the map can say something about (≥ 200 cell-days), plus 1.5°.
  const full = useMemo(() => {
    const E = S.cells.filter((c) => c.eligible);
    if (!E.length) return { s: bb.s - 0.5, n: bb.n + 0.5, w: bb.w - 0.5, e: bb.e + 0.5 };
    const r = { s: Math.min(...E.map((c) => c.lat)) - 0.5, n: Math.max(...E.map((c) => c.lat)) + 1, w: Math.min(...E.map((c) => c.lon)) - 0.5, e: Math.max(...E.map((c) => c.lon)) + 1 };
    return { s: Math.max(bb.s - 0.5, r.s), n: Math.min(bb.n + 0.5, r.n), w: Math.max(bb.w - 0.5, r.w), e: Math.min(bb.e + 0.5, r.e) };
  }, [S, bb]);
  const [frame, setFrame] = useState(full);
  const [tool, setTool] = useState('select');
  useEffect(() => { setFrame(full); }, [country]);
  const P = useMemo(() => makeProj(frame, Math.max(80, size.w - (size.h < 200 ? 72 : 40)), size.h, 6, 6), [frame, size.w, size.h]); // the right 40 px hold the tools
  const zoomLevel = (full.n - full.s) / (frame.n - frame.s);
  const paths = useMemo(() => {
    const o = outlines()[country];
    if (!o) return null;
    return { self: new Path2D(ringsPath(o.self, o.q, P)), others: new Path2D(ringsPath(o.others, o.q, P)) };
  }, [country, P]);

  // Country scale: a 0.5° cell under ~5 px reads as noise → 1° blocks (majority era); back to cells from ~6 px.
  const cellPx = Math.min(0.5 * P.k * P.sc, 0.5 * P.sc);
  const blockRef = useRef(true);
  if (cellPx < 5) blockRef.current = true; else if (cellPx >= 6) blockRef.current = false;
  const blocks = layer === 'rec' && blockRef.current;
  const BL = useMemo(() => ({ raw: cellBlocks(S, false), harm: cellBlocks(S, true) }), [S]);
  // The flip: places (or blocks) whose era changes get a 450 ms outline when Raw ↔ Harmonized switches.
  const [flash, setFlash] = useState(false);
  const prevHarm = useRef(harm);
  useEffect(() => {
    if (prevHarm.current === harm) return undefined;
    prevHarm.current = harm;
    if (reduced() || layer !== 'rec') return undefined;
    setFlash(true); const t = setTimeout(() => setFlash(false), 450); return () => clearTimeout(t);
  }, [harm]);

  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size.w, size.h);
    const land = cssColor('--map-land'), border = cssColor('--map-border'), ink = cssColor('--ink'), ink3 = cssColor('--ink-3'), ink2 = cssColor('--ink-2'), water = cssColor('--map-water');
    if (paths) { g.fillStyle = water; g.globalAlpha = 0.55; g.fill(paths.others); g.globalAlpha = 1; g.fillStyle = land; g.fill(paths.self); }
    const cw = 0.5 * P.k * P.sc, ch = 0.5 * P.sc;
    const gap = cw > 5 ? 0.6 : cw > 2.5 ? 0.35 : 0;
    const rect = (c) => [P.x(c.lon) + gap, P.y(c.lat + 0.5) + gap, Math.max(0.8, cw - 2 * gap), Math.max(0.8, ch - 2 * gap)];
    const vis = (c) => P.x(c.lon + 0.5) >= 0 && P.x(c.lon) <= size.w && P.y(c.lat) >= 0 && P.y(c.lat + 0.5) <= size.h;
    if (layer === 'rec') {
      const cBefore = cssColor('--rec-before'), cSince = cssColor('--rec-since'), hatch = cssColor('--rec-hatch');
      const hatchAt = (x, y, w, h) => { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = hatch; g.lineWidth = 1.2; g.beginPath(); for (let d = -h; d < w; d += 4) { g.moveTo(x + d, y + h); g.lineTo(x + d + h, y); } g.stroke(); g.restore(); };
      const surf = cssColor('--surface');
      const outline = (x, y, w, h) => { g.strokeStyle = surf; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, Math.max(0.5, w - 3), Math.max(0.5, h - 3)); g.strokeStyle = ink; g.lineWidth = 1.5; g.strokeRect(x - 0.75, y - 0.75, w + 1.5, h + 1.5); };
      if (blocks) {
        const bw = P.k * P.sc, bh = P.sc, gp = bw > 4 ? 0.5 : 0;
        const cur = harm ? BL.harm : BL.raw, other = harm ? BL.raw : BL.harm;
        { const nbc = cssColor('--rec-nb'); const seen = new Set(); for (const c of S.cells) { if (!c.high) continue; const k = Math.floor(c.i / 2) * 100000 + Math.floor(c.j / 2); if (cur.has(k) || seen.has(k)) continue; seen.add(k); g.fillStyle = nbc; g.fillRect(P.x(Math.floor(c.j / 2)) + gp, P.y(Math.floor(c.i / 2) + 1) + gp, Math.max(1, bw - 2 * gp), Math.max(1, bh - 2 * gp)); } }
        for (const [k, b] of cur) {
          const x = P.x(b.lon) + gp, y = P.y(b.lat + 1) + gp, w = Math.max(1, bw - 2 * gp), h = Math.max(1, bh - 2 * gp);
          if (x + w < 0 || x > size.w || y + h < 0 || y > size.h) continue;
          g.fillStyle = b.era === 'since' ? cSince : cBefore;
          if (b.era === 'mixed') { g.fillStyle = cBefore; g.fillRect(x, y, w, h); hatchAt(x, y, w, h); }
          else { g.fillRect(x, y, w, h); if (harm && b.depends * 2 > b.n) hatchAt(x, y, w, h); }
        }
        if (flash) for (const [k, b] of cur) { const o = other.get(k); if (o && o.era !== b.era) outline(P.x(b.lon) + gp, P.y(b.lat + 1) + gp, Math.max(1, bw - 2 * gp), Math.max(1, bh - 2 * gp)); }
      } else {
        const nbc = cssColor('--rec-nb');
        for (const c of S.cells) {
          if (!c.eligible || !vis(c)) continue;
          if (c.high) { const [x, y, w, h] = rect(c); g.fillStyle = nbc; g.fillRect(x, y, w, h); continue; }
          const [x, y, w, h] = rect(c), since = (harm ? c.eraHarm : c.eraRaw) === 'since';
          g.fillStyle = since ? cSince : cBefore; g.fillRect(x, y, w, h);
          if (harm && c.depends) hatchAt(x, y, w, h);
          if (flash && c.eraRaw !== c.eraHarm) outline(x, y, w, h);
        }
      }
    } else if (layer === 'ratio') {
      const ramp = RATIO_TOK.map((t) => cssColor('--civ-' + t));
      for (const c of S.cells) {
        if (!c.eligible || !vis(c)) continue;
        g.globalAlpha = c.rcase === 'country' ? 0.35 : 1;
        g.fillStyle = ramp[ratioClass(c.ratio)]; g.fillRect(...rect(c));
        if (c.high) { const [x, y, w, h] = rect(c); g.globalAlpha = 1; g.strokeStyle = ink; g.lineWidth = 1.5; g.strokeRect(x + 0.75, y + 0.75, Math.max(0.5, w - 1.5), Math.max(0.5, h - 1.5)); }
      }
      g.globalAlpha = 1;
    } else if (layer === 'month' && ML) {
      for (const c of S.cells) {
        if (!c.eligible || !vis(c)) continue;
        const cl = ML.cls.get(cellKey(c.i, c.j)); const [x, y, w, h] = rect(c);
        if (cl === 'record') { g.fillStyle = ink; g.fillRect(x, y, w, h); }
        else if (cl === 'top3') { g.fillStyle = ink3; g.globalAlpha = 0.6; g.fillRect(x, y, w, h); g.globalAlpha = 1; }
        else if (cl === 'active') { g.fillStyle = ink2; const r = Math.max(0.7, Math.min(w, h) / 5); g.beginPath(); g.arc(x + w / 2, y + h / 2, r, 0, 2 * Math.PI); g.fill(); }
      }
    } else if (layer === 'det') {
      const ramp = Array.from({ length: 9 }, (_, k) => cssColor('--seq-' + k));
      for (const c of S.cells) {
        if (!(c.det > 0) || !vis(c)) continue;
        const k = countClass(c.det, detBreaks); if (k < 0) continue;
        g.fillStyle = ramp[k]; g.fillRect(...rect(c));
      }
    }
    if (paths) { g.lineWidth = 0.8; g.strokeStyle = border; g.stroke(paths.others); g.lineWidth = 1; g.stroke(paths.self); }
  }, [S, ML, P, paths, theme, size.w, size.h, layer, harm, detBreaks, blocks, BL, flash]);

  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const [kbd, setKbd] = useState(false);
  const pt = (e) => { const r = wrap.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const clampBox = (b) => ({ s: Math.max(bb.s, b.s), n: Math.min(bb.n, b.n), w: Math.max(bb.w, b.w), e: Math.min(bb.e, b.e) });
  const toBox = (a, b) => {
    const la = [P.lat(a.y), P.lat(b.y)], lo = [P.lon(a.x), P.lon(b.x)];
    const r = clampBox({ s: snapDown(Math.min(...la)), n: snapUp(Math.max(...la)), w: snapDown(Math.min(...lo)), e: snapUp(Math.max(...lo)) });
    if (r.n - r.s < 0.5) r.n = Math.min(bb.n, r.s + 0.5), r.s = r.n - 0.5;
    if (r.e - r.w < 0.5) r.e = Math.min(bb.e, r.w + 0.5), r.w = r.e - 0.5;
    return r;
  };
  // Click on a place: a 2° × 2° box around it, on the grid, inside the country frame.
  const clickBox = (p) => {
    const lat = snapDown(P.lat(p.y)), lon = snapDown(P.lon(p.x));
    let s = lat - 0.5, w = lon - 0.5;
    s = Math.min(Math.max(bb.s, s), bb.n - 2); w = Math.min(Math.max(bb.w, w), bb.e - 2);
    return { s, n: s + 2, w, e: w + 2 };
  };
  const onDown = (e) => { if (e.button !== 0 || (e.target.closest && e.target.closest('.fb-mc-tools'))) return; e.currentTarget.setPointerCapture(e.pointerId); const p = pt(e); setDrag({ a: p, b: p, frame0: frame }); setHover(null); };
  const onMove = (e) => {
    if (!drag && e.target.closest && e.target.closest('.fb-mc-tools')) { setHover(null); return; }
    const p = pt(e);
    if (drag) {
      if (tool === 'pan') {
        const f0 = drag.frame0, dLon = (p.x - drag.a.x) / (P.k * P.sc), dLat = (p.y - drag.a.y) / P.sc;
        const wd = f0.e - f0.w, hd = f0.n - f0.s;
        const w = Math.min(Math.max(full.w - wd / 2, f0.w - dLon), full.e - wd / 2), s = Math.min(Math.max(full.s - hd / 2, f0.s + dLat), full.n - hd / 2);
        setFrame({ s, n: s + hd, w, e: w + wd });
      } else setDrag(Object.assign({}, drag, { b: p }));
      return;
    }
    const c = S.map.get(cellKey(Math.floor(P.lat(p.y) * 2), Math.floor(P.lon(p.x) * 2)));
    setHover(c ? { c, x: p.x, y: p.y } : null);
  };
  const onUp = () => {
    if (!drag) return;
    const { a, b } = drag; setDrag(null);
    if (tool === 'pan') return;
    if (Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 4) { onBox(clickBox(a)); return; }
    onBox(toBox(a, b));
  };
  const onKey = (e) => {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(1.6); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); zoom(1 / 1.6); return; }
    const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!d) return;
    e.preventDefault(); setKbd(true);
    const st = 0.5;
    let nb;
    if (e.shiftKey) {
      nb = { s: box.s, w: box.w, n: box.n + d[1] * st, e: box.e + d[0] * st };
      if (nb.n - nb.s < 0.5 || nb.e - nb.w < 0.5 || nb.n > bb.n || nb.e > bb.e) return;
    } else {
      nb = { s: box.s + d[1] * st, n: box.n + d[1] * st, w: box.w + d[0] * st, e: box.e + d[0] * st };
      if (nb.s < bb.s || nb.n > bb.n || nb.w < bb.w || nb.e > bb.e) return;
    }
    onBox(nb);
  };
  const zoomTo = (f) => {
    const hd = Math.min(full.n - full.s, Math.max(2, f.n - f.s)), wd = Math.min(full.e - full.w, Math.max(2, f.e - f.w));
    const cy = (f.s + f.n) / 2, cx0 = (f.w + f.e) / 2;
    setFrame({ s: cy - hd / 2, n: cy + hd / 2, w: cx0 - wd / 2, e: cx0 + wd / 2 });
  };
  function zoom(k) { zoomTo({ s: (frame.s + frame.n) / 2 - (frame.n - frame.s) / (2 * k), n: (frame.s + frame.n) / 2 + (frame.n - frame.s) / (2 * k), w: (frame.w + frame.e) / 2 - (frame.e - frame.w) / (2 * k), e: (frame.w + frame.e) / 2 + (frame.e - frame.w) / (2 * k) }); }
  const zoomZone = () => { const m = Math.max(1, 0.4 * Math.max(box.n - box.s, box.e - box.w)); zoomTo({ s: box.s - m, n: box.n + m, w: box.w - m, e: box.e + m }); };
  const isFull = Math.abs(frame.n - frame.s - (full.n - full.s)) < 0.01 && Math.abs(frame.e - frame.w - (full.e - full.w)) < 0.01;

  const live = drag && tool === 'select' && Math.abs(drag.a.x - drag.b.x) + Math.abs(drag.a.y - drag.b.y) >= 4 ? toBox(drag.a, drag.b) : null;
  const shown = live || box;
  const R = { x: P.x(shown.w), y: P.y(shown.n), w: Math.max(2, P.x(shown.e) - P.x(shown.w)), h: Math.max(2, P.y(shown.s) - P.y(shown.n)) };
  const label = live ? boxText(live) + ' · ' + boxSize(live) : boxSize(box);
  const lw = Math.min(size.w - 12, label.length * 7.2 + 18);
  const toolsW = size.h < 200 ? 72 : 40; // the tool stack at the top right (two columns on short maps)
  let labelTop = R.y > 26 ? R.y - 24 : R.y + R.h + 6;
  if (labelTop + 22 > size.h) labelTop = Math.max(4, Math.min(size.h - 26, R.y + 4));
  let labelLeft = Math.min(Math.max(4, R.x), size.w - 8 - lw);
  // A box covering most of the view (a whole country): its label goes to the bottom-left corner, off the cells.
  if ((R.w * R.h > 0.35 * size.w * size.h || R.h > 0.6 * size.h) && labelTop > R.y - 2 && labelTop < R.y + R.h) { labelTop = size.h - 28; labelLeft = 6; }
  if (labelTop < 196 && labelLeft + lw > size.w - toolsW - 6) labelLeft = Math.max(4, size.w - toolsW - 10 - lw);
  // Place labels by zoom level: more of them as the view narrows; dropped rather than collide or cover the selection.
  const places = (() => {
    const taken = [], out = [], cwc = 7.4, lh = 15;
    const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const avoid = [
      { x: labelLeft - 2, y: labelTop - 2, w: lw + 4, h: 26 }, { x: size.w - toolsW - 6, y: 0, w: toolsW + 6, h: Math.min(size.h, 196) },
      { x: R.x - 5, y: R.y - 5, w: R.w + 10, h: 10 }, { x: R.x - 5, y: R.y + R.h - 5, w: R.w + 10, h: 10 },
      { x: R.x - 5, y: R.y - 5, w: 10, h: R.h + 10 }, { x: R.x + R.w - 5, y: R.y - 5, w: 10, h: R.h + 10 },
    ];
    const max = zoomLevel < 1.3 ? 0 : zoomLevel < 2.5 ? 6 : 12; // none at country scale: they would hide the cells
    for (const [name, lat, lon] of PLACES[country] || []) {
      if (out.length >= max) break;
      const x = P.x(lon), y = P.y(lat), w = name.length * cwc + 2;
      if (x < 4 || x > size.w - 4 || y < 4 || y > size.h - 4) continue;
      const dot = { x: x - 3, y: y - 3, w: 6, h: 6 };
      if (avoid.slice(1).some((a) => hit(dot, a))) continue;
      const cands = [{ x: x + 5, y: y - lh / 2, a: 'start' }, { x: x - 5 - w, y: y - lh / 2, a: 'end' }, { x: x - w / 2, y: y - 4 - lh, a: 'middle' }, { x: x - w / 2, y: y + 4, a: 'middle' }];
      const c = cands.find((q) => { const r = { x: q.x, y: q.y, w, h: lh }; return r.x >= 2 && r.x + w <= size.w - 2 && r.y >= 2 && r.y + lh <= size.h - 2 && !taken.some((t) => hit(r, t)) && !avoid.some((t) => hit(r, t)); });
      if (!c) continue;
      taken.push({ x: c.x - 2, y: c.y - 1, w: w + 4, h: lh + 2 }, dot);
      out.push({ name, x, y, tx: c.a === 'start' ? c.x : c.a === 'end' ? c.x + w : c.x + w / 2, ty: c.y + 11, a: c.a });
    }
    return out;
  })();
  // Tooltip: the cell under the pointer; with keyboard focus, the cell at the centre of a small box.
  const tipBlock = hover && blocks ? (harm ? BL.harm : BL.raw).get(Math.floor(hover.c.i / 2) * 100000 + Math.floor(hover.c.j / 2)) || null : null;
  const tipCell = hover ? hover.c : kbd && box.n - box.s <= 4 && box.e - box.w <= 4 ? S.map.get(cellKey(Math.floor((box.s + box.n) / 2 * 2 - 1e-9), Math.floor((box.w + box.e) / 2 * 2 - 1e-9))) : null;
  const tipPos = hover ? { x: hover.x, y: hover.y } : { x: R.x + R.w / 2, y: R.y + R.h / 2 };
  const ml = tipCell && ML ? ML.cls.get(cellKey(tipCell.i, tipCell.j)) : null;
  const ariaSum = 'Map of ' + COUNTRIES[country] + ', layer ' + LAYERS.find((l) => l.value === layer).label + ', ' + (harm ? 'harmonized' : 'raw') + '. Selected box ' + boxText(box) + ', ' + boxSize(box) + '. Click a place for a 2° box, drag to draw one. With the map focused, arrow keys move the box by 0.5°, Shift with arrows resizes it, plus and minus zoom.';
  return (
    <div className="fb-map">
      <div className={cx('fb-map-view', drag && 'is-drag', tool === 'pan' && 'is-pan')} ref={wrap} data-frame={[frame.s, frame.n, frame.w, frame.e].map((v) => v.toFixed(2)).join(',')} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)} onPointerLeave={() => setHover(null)}>
        <canvas ref={cvs} style={{ width: size.w + 'px', height: size.h + 'px' }} aria-hidden="true" />
        <svg className="fb-map-svg" width={size.w} height={size.h} tabIndex={0} role="img" onKeyDown={onKey} onFocus={() => setKbd(true)} onBlur={() => setKbd(false)} aria-label={ariaSum}>
          <g className="fb-places" aria-hidden="true">
            {places.map((q) => <g key={q.name}><circle cx={q.x} cy={q.y} r="2.2" /><text x={q.tx} y={q.ty} textAnchor={q.a}>{q.name}</text></g>)}
          </g>
          <rect x={R.x} y={R.y} width={R.w} height={R.h} rx="1.5" className="fb-sel-halo" />
          <rect x={R.x} y={R.y} width={R.w} height={R.h} rx="1.5" className={cx('fb-sel', live && 'is-live')} />
        </svg>
        {(live || !wholeBox) && <span className={cx('fb-sel-label', live && 'is-live')} style={{ left: labelLeft + 'px', top: labelTop + 'px' }} aria-hidden="true">{label}</span>}
        {tipCell && !drag && (
          <div className={cx('fb-maptip', tipPos.x > size.w * 0.55 && 'is-left', tipPos.y > size.h * 0.5 && 'is-up')} style={{ left: tipPos.x + 'px', top: tipPos.y + 'px' }} aria-hidden="true">
            <div className="fb-maptip-t at-mono">{tipBlock ? boxText({ s: tipBlock.lat, n: tipBlock.lat + 1, w: tipBlock.lon, e: tipBlock.lon + 1 }) : boxText({ s: tipCell.lat, n: tipCell.lat + 0.5, w: tipCell.lon, e: tipCell.lon + 0.5 })}</div>
            {tipBlock ? (
              <>
                <div className="fb-maptip-v">{tipBlock.since} of {tipBlock.n} {tipBlock.n === 1 ? 'place' : 'places'}: record since 2012</div>
                <div className="fb-maptip-m">{harm ? 'harmonized' : 'raw'} · 1° block{tipBlock.era === 'mixed' ? ', a tie' : ''}{harm && tipBlock.depends ? ' · ' + tipBlock.depends + ' depend on the ratio' : ''}{harm && tipBlock.sinceRaw !== tipBlock.since ? ' · raw: ' + tipBlock.sinceRaw + ' of ' + tipBlock.n : ''}</div>
                <div className="fb-maptip-m">Zoom in to see the 0.5° places</div>
              </>
            ) : layer === 'det' ? (
              <div className="fb-maptip-v">{formatNumber(tipCell.det, 'en')} <span>cell-days a year, VIIRS 2012–{LAST}</span></div>
            ) : tipCell.eligible ? (
              <>
                {layer === 'month' && <div className="fb-maptip-v">{mName}: {ml === 'record' ? 'a record' : ml === 'top3' ? 'top 3' : ml === 'active' ? 'active, not unusual' : 'no detection'}</div>}
                {tipCell.high ? <div className="fb-maptip-v">Ratio above 4×: not bridged</div> : <div className={layer === 'rec' ? 'fb-maptip-v' : 'fb-maptip-m'}>Record year: raw {tipCell.recRaw}, harmonized {tipCell.recHarm}, MODIS alone {tipCell.recModis}{tipCell.depends ? ' (depends on the ratio)' : ''}</div>}
                <div className={layer === 'ratio' ? 'fb-maptip-v' : 'fb-maptip-m'}>Local ratio {formatDecimal(tipCell.ratio, 2, 'en')}× <span>({tipCell.rcase === 'own3' ? '3 × 3 cells' : tipCell.rcase === 'own5' ? '5 × 5 cells' : 'country ratio'})</span></div>
                <div className="fb-maptip-m">{formatNumber(tipCell.cum, 'en')} cell-days {STATS_FROM}–{LAST}, harmonized</div>
              </>
            ) : <div className="fb-maptip-m">Too few detections here ({formatNumber(tipCell.cum, 'en')} cell-days, {STATS_FROM}–{LAST}): no claim</div>}
          </div>
        )}
        <div className="fb-mc-tools" role="toolbar" aria-label="Map tools">
          <div className="fb-mc-toolset" role="radiogroup" aria-label="Pointer tool">
            <button type="button" role="radio" aria-checked={tool === 'select'} className={cx('fb-tool', tool === 'select' && 'is-on')} aria-label="Select tool: click or drag to choose a box" title="Select" onClick={() => setTool('select')}><Icon d="M5 3l14 8-6 2-2 6z" /></button>
            <button type="button" role="radio" aria-checked={tool === 'pan'} className={cx('fb-tool', tool === 'pan' && 'is-on')} aria-label="Pan tool: drag to move the map" title="Pan" onClick={() => setTool('pan')}><Icon d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></button>
          </div>
          <button type="button" className="fb-tool" aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1.6)} disabled={frame.n - frame.s <= 2.05}><Icon d="M12 5v14M5 12h14" /></button>
          <button type="button" className="fb-tool" aria-label="Zoom out" title="Zoom out" onClick={() => zoom(1 / 1.6)} disabled={isFull}><Icon d="M5 12h14" /></button>
          <button type="button" className="fb-tool" aria-label="Fit country" title="Fit country" onClick={() => setFrame(full)} disabled={isFull}><Icon d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></button>
          <button type="button" className="fb-tool" aria-label="Zoom to zone" title="Zoom to zone" onClick={zoomZone}><Icon d="M7 7h10v10H7zM3 12h2M19 12h2M12 3v2M12 19v2" /></button>
        </div>
      </div>
    </div>
  );
}
