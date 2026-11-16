// Version 5 calendar panel: the DS BurnCalendar fills the panel (cells sized from the panel's height), a Counts ·
// Anomaly view control (Raw/Harmonized is the global switch), a date-range popover, the selected-month chip, one
// legend row and an (i) holding the notes. A year column hovered in the calendar lights up its places on the map;
// a place hovered on the map outlines its record-year column here.
import { useRef, useState, useLayoutEffect, useEffect, useMemo, memo } from 'react';
import { BurnCalendar, ColorLegend, ProvenanceLine } from '../ds/components/src/components.jsx';
import { FIRST, LAST, SW, NM, STATS_FROM, END_KEY, monthKey, monthIndex, partialLabel, endLabel, monthReading } from './metrics.js';
import { F2, monthLong, NUM, anomalyWords, rankWords } from './copy.js';
import { Pop, Info } from './ui.jsx';
import { MONTHS_SHORT_L, monthShort, monthYear, monthYearShort, endLabelL, partialLabelL, tm, trMonthsIn } from './l10n.js';
import { cx, Icon, IC, reduced } from './util.jsx';

const monthKeys = () => Array.from({ length: NM }, (_, i) => monthKey(i));

export function SkeletonCal() {
  return (
    <div className="fb-skel-cal" aria-hidden="true">
      <div className="fb-skel-barsrow"><span /><i /></div>
      {Array.from({ length: 12 }, (_, m) => <div key={m} className="fb-skel-row"><span /><div>{Array.from({ length: 25 }, (_, y) => <i key={y} className="at-cell at-cell-zero" />)}</div></div>)}
    </div>
  );
}

const MON = MONTHS_SHORT_L;
// Range button label: long "2001 – déc. 2025" (the end month matters: the record ends there); short "2001–2025".
export const rangeLabel = (from, to, short) => short
  ? from.slice(0, 4) + '–' + to.slice(0, 4)
  : (from.slice(5) === '01' ? from.slice(0, 4) : cap1(monthYearShort(+from.slice(5) - 1, from.slice(0, 4)))) + ' – ' + monthYearShort(+to.slice(5) - 1, to.slice(0, 4));
const K = (y, m) => y + '-' + String(m).padStart(2, '0');
// Date range (v6.2): Month + Year selects for From and To, quick presets, immediate apply. Impossible choices are
// disabled (From ≤ To; nothing after the record end); a year change that would leave the month impossible moves the
// month to the nearest possible one.
function RangePop({ from, to, onChange, short }) {
  const lab = rangeLabel(from, to, short), labLong = rangeLabel(from, to, false);
  const EY = +END_KEY.slice(0, 4), EM = +END_KEY.slice(5);
  const fy = +from.slice(0, 4), fm = +from.slice(5), ty = +to.slice(0, 4), tm = +to.slice(5);
  const years = []; for (let y = FIRST; y <= EY; y++) years.push(y);
  const clamp = (k, lo, hi) => (k < lo ? lo : k > hi ? hi : k);
  const setFrom = (y, m) => { const k = clamp(K(y, m), '2001-01', to); onChange(k, to); };
  const setTo = (y, m) => { const k = clamp(K(y, m), from, END_KEY); onChange(from, k); };
  const presets = [['Tout (' + FIRST + '–' + EY + ')', '2001-01'], ['Depuis 2012 (ère VIIRS)', '2012-01'], ['Depuis 2003 (statistiques)', '2003-01'], ['10 dernières années', K(EY - 9, 1)], ['5 dernières années', K(EY - 4, 1)]];
  const isAll = from === '2001-01' && to === END_KEY;
  return (
    <Pop id="fb-range-pop" ariaLabel={labLong + ' : période du ' + from + ' au ' + to + '. Modifier'} btnClass="at-btn at-btn-sm fb-rangebtn" panelClass="fb-pop-form fb-pop-range" align="end"
      label={<>{lab}<Icon d={IC.down} /></>}>
      <div className="fb-range2">
        <fieldset className="fb-range2-f"><legend>De</legend>
          <select className="at-select" data-autofocus aria-label="Mois de début" value={fm} onChange={(e) => setFrom(fy, +e.target.value)}>
            {MON.map((n, i) => <option key={n} value={i + 1} disabled={K(fy, i + 1) > to}>{cap1(n)}</option>)}
          </select>
          <select className="at-select" aria-label="Année de début" value={fy} onChange={(e) => setFrom(+e.target.value, fm)}>
            {years.map((y) => <option key={y} value={y} disabled={y > ty}>{y}</option>)}
          </select>
        </fieldset>
        <fieldset className="fb-range2-f"><legend>À</legend>
          <select className="at-select" aria-label="Mois de fin" value={tm} onChange={(e) => setTo(ty, +e.target.value)}>
            {MON.map((n, i) => <option key={n} value={i + 1} disabled={K(ty, i + 1) < from || (ty === EY && i + 1 > EM)}>{cap1(n)}</option>)}
          </select>
          <select className="at-select" aria-label="Année de fin" value={ty} onChange={(e) => setTo(+e.target.value, tm)}>
            {years.map((y) => <option key={y} value={y} disabled={y < fy}>{y}</option>)}
          </select>
        </fieldset>
        <div className="fb-range2-pre" role="group" aria-label="Périodes rapides">
          {presets.map(([l, f]) => <button key={l} type="button" className={cx('fb-chip', from === f && to === END_KEY && 'is-on')} aria-pressed={from === f && to === END_KEY} onClick={() => onChange(f, END_KEY)}>{l}</button>)}
        </div>
      </div>
      <p className="fb-pop-p">Les dates ne changent que l’affichage et le rang des mois ; le ratio est toujours estimé sur tout le chevauchement 2012–{LAST}.</p>
      {!isAll && <button type="button" className="at-link fb-range2-reset" onClick={() => onChange('2001-01', END_KEY)}>Réinitialiser à {FIRST}–{EY}</button>}
    </Pop>
  );
}

// The readout line under the grid (replaces the floating tooltip that covered the cells): the hovered or focused month,
// else the selected one (the latest by default). Anomaly view leads with the anomaly. Also draws the crosshair bands.
const cap1 = (x) => x.charAt(0).toUpperCase() + x.slice(1);
// 15 Nov (late): the line never wraps and is never cut on desktop. When it does not fit, it drops detail step by step
// before paint: 1 short source words and "Provisional."; 2 no source sentence; 3 no "(peak month of …)" and a short
// off-season flag. Only past step 3 can the CSS ellipsis still cut it.
function CalReadout({ reg, Z, sel, y0, y1, raw, harm, anomaly, isDef }) {
  const [hov, setHov] = useState(null);
  reg.current = setHov;
  const ri = hov != null ? hov : sel;
  const ref = useRef(null);
  const fitKey = [ri, hov == null, raw, harm, anomaly, isDef, y0, y1, Z.ratio, Z.box.s, Z.box.n, Z.box.w, Z.box.e].join('|');
  const [fit, setFit] = useState({ k: '', l: 0 });
  const lvl = fit.k === fitKey ? fit.l : 0;
  useLayoutEffect(() => {
    const p = ref.current && ref.current.closest('.fb-calread');
    if (p && lvl < 3 && p.scrollWidth > p.clientWidth + 1) setFit({ k: fitKey, l: lvl + 1 });
  });
  useEffect(() => { const re = () => setFit({ k: '', l: 0 }); window.addEventListener('resize', re); return () => window.removeEventListener('resize', re); }, []);
  const pre = hov == null && isDef && lvl < 3 ? ' (mois de pointe de ' + Math.floor(sel / 12 + FIRST) + ')' : ''; // after the month: "Juillet 2025 (mois de pointe de 2025) : …"
  const q = monthReading(Z, ri, y0, y1), nm = monthLong(q.m), lab = cap1(monthYear(q.m, q.y));
  const noaa = Z.contSet && Z.contSet.has(ri);
  const src = lvl >= 2 ? '' : lvl === 1
    ? (q.computed ? (raw ? 'ancien satellite (MODIS)' : 'estimé (MODIS × ' + F2(Z.ratio) + ')') : (noaa ? 'NOAA-20 ajusté' : 'nouveau satellite (VIIRS)'))
    : (q.computed ? (raw ? 'ancien satellite (MODIS), tel qu’enregistré' : 'estimé d’après l’ancien satellite (MODIS × ' + F2(Z.ratio) + ')') : (noaa ? 'NOAA-20 ajusté' : 'mesuré par le nouveau satellite (VIIRS)'));
  const val = NUM(raw ? q.raw : q.v) + ' détections de feux';
  const prov = Z.provSet && Z.provSet.has(ri);
  // v6 (judge C5): a computed month whose calendar month sits off the pooled ratio by more than 1.3× is flagged.
  const bm = Z.byMonth && Z.byMonth[q.m], offFit = !raw && q.computed && bm && bm.active && bm.resid != null && (bm.resid > 1.3 || bm.resid < 1 / 1.3);
  const flag = offFit ? <>{' '}<span className="fb-offfit" title="Mois hors saison : le ratio annuel lui convient mal (son propre ratio s’écarte du ratio global de plus de 1,3×)">{lvl >= 3 ? 'mois hors saison' : 'mois hors saison : ratio mal adapté'}</span></> : null;
  const an = q.partial ? 'couverture MODIS partielle (' + q.y + ') : hors statistiques'
    : !harm ? 'brut : pas comparable avant/après 2012' : q.low ? 'trop peu de feux dans un ' + nm + ' typique pour comparer' : anomalyWords(q.anomaly, nm);
  const mm = String(q.m + 1).padStart(2, '0');
  const cross = hov != null ? '.fb-calpanel .at-cal-cells [data-key^="' + q.y + '-"], .fb-calpanel .at-cal-cells [data-key$="-' + mm + '"] { box-shadow: inset 0 0 0 100px color-mix(in oklab, var(--surface) 26%, transparent); } .fb-calpanel .at-cal-cells [data-key="' + q.y + '-' + mm + '"] { box-shadow: inset 0 0 0 2px var(--ink), inset 0 0 0 3px var(--surface); }' : '';
  return (
    <span ref={ref}>
      {cross && <style>{cross}</style>}
      {/* v6.2 (P2): a sentence: "July 2025: 81,333 fire detections, 3.9 times a normal July." */}{anomaly && harm && !q.low && !q.partial ? <>{pre ? <><b>{lab}</b>{pre} : <b>{an}</b></> : <b>{lab} : {an}</b>}.{offFit || !src ? null : ' ' + cap1(src) + '.'}{prov ? <>{' '}<span title="Provisoire : données à diffusion rapide, pas encore filtrées des sources autres que les feux.">Provisoire.</span></> : ''}{flag}</> : <><b>{lab}</b>{pre} : {val}, {an}.{offFit || !src ? null : ' ' + cap1(src) + '.'}{prov ? <>{' '}<span title="Provisoire : données à diffusion rapide, pas encore filtrées des sources autres que les feux.">{lvl >= 1 ? 'Provisoire.' : 'Provisoire (quasi temps réel).'}</span></> : ''}{flag}</>}
    </span>
  );
}

export const CalPanel = memo(function CalPanel({ Z, cd, empty: empty0, outside, onLarger, onNearest, onMethod, mPicked, onClear, series, cv, setCv, from, to, setRange, sel, defSel, defIsPeak, onSelect, onHoverYear, markYear, phone, theme }) {
  const harm = Z && Z.harmOK;
  // Data-poor: under 30 cell-days in 25 years is not drawn as a calendar (an empty grid reads as data).
  const total = Z && !Z.empty ? Z.raw.reduce((a, b) => a + b, 0) : 0;
  const sparse = !!(Z && !Z.empty && !empty0 && total < 30);
  const empty = empty0 || sparse;
  const raw = series === 'raw' || !harm;
  const anomaly = !raw && cv === 'anomaly';
  const y0 = +from.slice(0, 4), y1 = +to.slice(0, 4);
  const selKey = monthKey(sel);
  // Display copy of the calendar data: its English note (grid aria-label) and partial-year bar note, translated.
  // Notes metrics.js writes with a number inside are rebuilt here from the values (not translated from the English).
  const trNote = (t) => (typeof t !== 'string' ? t : t.startsWith('Computed: NOAA-20 rescaled to S-NPP') ? 'Calculé : NOAA-20 ramené à l’échelle de S-NPP (÷ ' + F2(Z.contFactor) + ', rapport NOAA-20/S-NPP ' + (Z.contFactorFrom === 'box' ? 'de cette zone' : 'du pays') + ').' : t.startsWith('Computed: S-NPP record starts 20 Jan 2012') ? 'Calculé : la série S-NPP commence le 20 janv. 2012 ; ce mois-ci est MODIS' + (Z.harmOK ? ' × ' + F2(Z.ratio) : '') + '.' : tm(t));
  const ovL = (o) => (o ? Object.assign({}, o, { pre: o.pre === 'raw' ? 'brut' : tm(o.pre), label: tm(o.label), other: tm(o.other), def: 'VIIRS ÷ MODIS sur les années de chevauchement : après 2012, les données brutes comptent ' + F2(o.value) + '× ce qu’aurait compté MODIS' }) : o);
  const cdL = useMemo(() => { if (!cd) return cd; const cells = cd.cells ? cd.cells.map((c) => (c && c.notes && c.notes.length ? Object.assign({}, c, { notes: c.notes.map(trNote) }) : c)) : cd.cells; const byKey = {}; if (cells) cells.forEach((c) => { byKey[c.key] = c; }); return Object.assign({}, cd, { note: tm(cd.note), cells, byKey: cd.byKey ? byKey : cd.byKey, step: cd.step ? Object.assign({}, cd.step, { override: ovL(cd.step.override) }) : cd.step, annual: cd.annual ? cd.annual.map((x) => (x.partialNote ? Object.assign({}, x, { partialNote: trMonthsIn(x.partialNote).replace(/^jusqu’en /, 'janv.–') }) : x)) : cd.annual }); }, [cd]); // cd is recomputed with its zone
  const body = useRef(null), readRef = useRef(null), footRef = useRef(null);
  const [sheet, setSheet] = useState(false);
  const [geo, setGeo] = useState(null); // grid geometry for the overlays (seam, margin chart, crosshair) // phone: the tapped month in a bottom sheet (cells are ~9 px wide)
  const [cellH, setCellH] = useState(16);
  const [barH, setBarH] = useState(64);
  // v6 (CLS): the grid stays invisible (visibility, so it neither paints nor counts as shifting) until the size fit has
  // converged once; 700 ms fallback so it can never stay hidden.
  const [settled, setSettled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSettled(true), 700); return () => clearTimeout(t); }, []);
  const [bodyH, setBodyH] = useState(0);
  const [bodyW, setBodyW] = useState(0);
  const bodyH0 = bodyH, bodyW0 = bodyW;
  useLayoutEffect(() => {
    const el = body.current; if (!el) return undefined;
    const ro = new ResizeObserver((es) => { const r = es[0].contentRect; setBodyH(Math.floor(r.height)); setBodyW(Math.floor(r.width)); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  // Size the grid from the panel: bars at most 18 % of the panel; cells between square and 1 : 1.15 (height : width)
  // when the height allows; any spare height is centred around the grid and its one-line month readout (no blank band).
  useLayoutEffect(() => {
    if (!bodyH0 || phone) return;
    // v6 (CLS): read the body's size from the DOM, not from the ResizeObserver state (which arrives a frame late, after
    // a paint, and made the grid jump once on load when the header changed form).
    let bodyH = bodyH0, bodyW = bodyW0;
    if (body.current) { const cs = getComputedStyle(body.current), el = body.current; bodyH = Math.floor(el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)); bodyW = Math.floor(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); }
    const n = cd ? cd.years.length : 25, colW = (bodyW * (margin ? 0.88 : 1) - 50) / n;
    // Height budget, in order: cells grow (up to 1.6 × their width), then the bars (16 % → 20 % of the body); whatever is
    // left centres the block (grid + readout + legend together), so no dead band between header, bars and legend.
    const base = Math.round(Math.max(40, Math.min(220, bodyH * 0.16))), maxB = Math.round(Math.min(280, bodyH * 0.2));
    const cal = body.current && body.current.querySelector('.at-cal');
    if (!cal) { if (barH !== base) setBarH(base); return; }
    const extra = (readRef.current ? readRef.current.getBoundingClientRect().height + 6 : 0) + (footRef.current ? footRef.current.getBoundingClientRect().height + 8 : 0) + 20;
    const over = cal.getBoundingClientRect().height + extra - bodyH;
    const cap = Math.floor(colW * 1.6);
    if (barH < base) { setBarH(base); return; }
    if (over > 2 && barH > base) { setBarH(Math.max(base, Math.round(barH - over))); return; }
    if (cellH >= cap && over < -2 && barH < maxB) { setBarH(Math.min(maxB, Math.round(barH - over))); return; }
    const target = Math.max(12, Math.min(cap, Math.floor(cellH - over / 12)));
    if (Math.abs(target - cellH) >= 1) { setCellH(target); return; }
    if (!settled) setSettled(true);
  });
  // Flip (raw ↔ harmonized, counts ↔ anomaly): the grid fades in over 200 ms, the same both ways (no page transition).
  const prevMode = useRef(null);
  useEffect(() => {
    const m = raw + '|' + anomaly;
    if (prevMode.current && prevMode.current !== m && body.current && !reduced()) body.current.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    prevMode.current = m;
  }, [raw, anomaly]);
  const isDefSel = !mPicked; // the chip shows a month the user chose (v5.2)
  // Header fit (v6.2): ONE row at every panel width ≥ 560 px, with or without a selected month, same height either way.
  // The level depends only on the width (never on whether a chip is shown), measured from hidden probes. As the width
  // shrinks: 0 everything long; 1 chip "Aug 2023 ×"; 2 the provenance pill becomes a dashed dot (tooltip; the words are
  // in the (i)); 3 range "2001–2025"; 4 title "Calendar". Under 560 px (phone) the chip has its own second row, always
  // present, so nothing moves. The chip slot is the flexible item: a chip appearing or leaving moves nothing.
  const headRef = useRef(null);
  const [lvl, setLvl] = useState(0);
  useLayoutEffect(() => {
    const el = headRef.current; if (!el) return undefined;
    const fit = () => {
      const W = el.clientWidth, w = (q) => { const e = el.querySelector(q); return e ? e.getBoundingClientRect().width : 0; };
      const PW = el.closest('.fb-calpanel') ? el.closest('.fb-calpanel').getBoundingClientRect().width : W;
      if (phone || PW < 560) { setLvl((o) => (o === 'wrap' ? o : 'wrap')); return; }
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, gap = 0.5 * rem; // --sp-2, whatever the current class
      const seg = w(':scope > .fb-seg2'), info = w(':scope > .fb-info, :scope > .fb-pop-anchor .fb-info') || w('.fb-info') || 28;
      const P = (k) => w('.fb-hprobes > .is-' + k);
      const need = (L) => (L >= 4 ? P('t-s') : P('t-l')) + seg + (L >= 1 ? P('c-s') : P('c-l')) + (L >= 3 ? P('r-s') : P('r-l')) + (L >= 2 ? 0 : P('pill')) + info + (L >= 4 ? 0.25 * rem : gap) * ((seg ? 5 : 4) - (L >= 2 ? 1 : 0)) + 2;
      let L = 0; while (L < 4 && need(L) > W) L++;
      setLvl((o) => (o === L ? o : L));
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [empty, harm, raw, from, to, phone]);
  const chipForm = lvl === 'wrap' ? 'wrap' : lvl === 0 ? 'long' : 'short';
  // v6.2: the "Terra only" note never overlaps the seam label (MODIS × r): long, short or minimal form, by measure.
  const noteRef = useRef(null);
  const [noteForm, setNoteForm] = useState('long');
  useLayoutEffect(() => {
    const n = noteRef.current, b = body.current; if (!n || !b) return;
    const lab = b.querySelector('.fb-seam .is-l');
    const limit = lab ? lab.getBoundingClientRect().left - 6 : b.getBoundingClientRect().right;
    const over = n.getBoundingClientRect().right > limit;
    if (over && noteForm !== 'none') setNoteForm(noteForm === 'long' ? 'short' : noteForm === 'short' ? 'min' : 'none');
    else if (!over && noteForm !== 'long' && lastW.current !== bodyW) { lastW.current = bodyW; setNoteForm('long'); }
  });
  const lastW = useRef(0);
  const margin = !phone && bodyW >= 520 && (bodyW * 0.86 - 64) / (cd ? cd.years.length : 25) >= 24; // the seasonal profile on the right, only when cells keep ≥ 24 px
  // Overlay geometry, measured after layout (absolute overlays: no layout shift).
  useLayoutEffect(() => {
    const el = body.current; if (!el || !cd || empty) { if (geo) setGeo(null); return; }
    const b0 = el.getBoundingClientRect();
    const cal = el.querySelector('.at-cal'); if (!cal) return;
    // Month rows from each row's first cell, keyed or not: a month past the record end has no data-key, and a range
    // inside a partial last year must still be measured (else the previous range's seam, note and margin stay drawn).
    const rowEls = el.querySelectorAll('.at-cal-cells'), rows = [];
    for (let m = 0; m < 12; m++) { const c = rowEls[m] && rowEls[m].firstElementChild; if (!c) { if (geo) setGeo(null); return; } const r = c.getBoundingClientRect(); rows.push({ y: Math.round(r.top - b0.top), h: Math.round(r.height) }); }
    // Right edge of the last year's column, from any of its keyed cells: when the record ends before December, the
    // months after it have no data-key (calendarData always gives whole years, so a date range alone never does this).
    let lastR = 0; for (const c of el.querySelectorAll('.at-cal-cells [data-key^="' + cd.years[cd.years.length - 1] + '-"]')) lastR = Math.max(lastR, c.getBoundingClientRect().right);
    const s12 = el.querySelector('.at-cal-cells [data-key="2012-01"]'), s11 = el.querySelector('.at-cal-cells [data-key="2011-12"]');
    const right = lastR ? Math.round(lastR - b0.left + 8) : 0;
    const seam = s12 && s11 ? Math.round((s11.getBoundingClientRect().right + s12.getBoundingClientRect().left) / 2 - b0.left) : null;
    const top = Math.round(cal.getBoundingClientRect().top - b0.top), bottom = rows[11].y + rows[11].h;
    const c01 = el.querySelector('.at-cal-cells [data-key="' + FIRST + '-01"]');
    const x01 = c01 ? Math.round(c01.getBoundingClientRect().left - b0.left) : null;
    const g = { rows, right, seam, top, bottom, x01 };
    if (!geo || JSON.stringify(g) !== JSON.stringify(geo)) setGeo(g);
  });
  const hovSet = useRef(null); // the readout owns the hover state, so hovering never re-renders the calendar
  const readout = Z && !Z.empty && cd ? <CalReadout reg={hovSet} Z={Z} sel={sel} y0={y0} y1={y1} raw={raw} harm={harm} anomaly={anomaly} isDef={isDefSel && sel === defSel && defIsPeak} /> : null;
  const marker = markYear && !anomaly ? <style>{'.fb-calpanel .at-cal-cells [data-key^="' + markYear + '-"]{box-shadow:inset 0 0 0 2px var(--ink),inset 0 0 0 3px var(--surface)}'}</style> : null;
  const notes = [];
  if (Z && !Z.empty) {
    notes.push(<><b>Cellule-jour</b> : un carré de 1 km avec au moins une détection de feu ce jour-là ; on les additionne par mois.</>);
    notes.push(raw ? <><b>Brut</b> : MODIS jusqu’en janvier 2012, puis VIIRS, sans correction.</> : <><b>Harmonisé</b> : MODIS × {F2(Z.ratio)} avant février 2012 (calculé), VIIRS ensuite (mesuré).</>);
    if (anomaly) notes.push(<><b>Anomalie</b> : chaque mois ÷ la médiane du même mois, 2003–{LAST}. Un point : trop peu de détections.</>);
    else notes.push(<><b>Couleurs</b> : ajustées à cette zone (échelle log) ; l’harmonisation change {cd.changed} des {cd.preMonths} mois avant 2012.</>);
    notes.push(<><b>Estompé</b> : 2001–2002, couverture MODIS partielle, non utilisé.</>);
    if (harm && Z.seamWarn && !raw) notes.push('Les mois hors saison sont moins bien harmonisés (un seul ratio par année).');
    if (Z.emptyNote) notes.push('Des mois vides avant 2012 peuvent correspondre à des feux trop petits pour MODIS.');
    if (Z.gaps && Z.gaps.length) notes.push('Les mois de panne de S-NPP (principal satellite VIIRS) utilisent son jumeau NOAA-20 : ' + Z.gaps.map((g) => g.key).join(', ') + '.');
    if (partialLabel()) notes.push(partialLabelL() + ' ; affichée, mais pas utilisée dans les statistiques annuelles.');
    if (NM % 12) notes.push('Cases vides après ' + endLabelL() + ' : la série s’arrête là.');
    notes.push('Barres : totaux annuels sur une échelle logarithmique (MODIS creux, VIIRS plein) ; pointillé : Aqua seul, une vérification de cohérence ; lignes de niveau : moyenne avant / après 2012.');
    notes.push('Le dégradé de couleurs garde les classes voisines distinctes en clarté sous deutéranopie, protanopie et tritanopie simulées.');
  }
  return (
    <section className={cx('fb-panel fb-calpanel', phone && 'is-phone')} id="calendar" aria-labelledby="fb-cal-t">
      {marker}
      <div className={cx('fb-panelhead', 'fb-calhead', 'is-' + chipForm, lvl === 4 && 'is-tight')} ref={headRef}>
        <h2 id="fb-cal-t" className="fb-paneltitle">{lvl === 4 ? <>Calendrier<span className="sr-only"> (calendrier des feux)</span></> : 'Calendrier des feux'}</h2>
        {/* v6.2: the segment is always there (the header keeps its shape between zones); in a zone that cannot be
            harmonized, Anomaly is disabled with its reason. */}
        {!empty && (
          <div className="fb-seg2" role="radiogroup" aria-label="Couleurs du calendrier">
            {[['counts', 'Totaux'], ['anomaly', 'Anomalie']].map(([v, l]) => { const an = harm && anomaly; return <button key={v} type="button" role="radio" aria-checked={(v === 'anomaly') === an} disabled={v === 'anomaly' && (raw || !harm)} title={v === 'anomaly' ? (!harm ? 'L’anomalie demande les deux satellites sur une même échelle, ce qui n’est pas possible dans cette zone' : raw ? 'L’anomalie utilise la série harmonisée' : 'Anomalie : chaque mois comparé à un mois typique du même nom') : 'Totaux : détections de feux par mois (un carré de 1 km avec au moins un feu un jour donné)'} className={cx('fb-seg2-i', (v === 'anomaly') === an && 'is-on')} onClick={() => setCv(v)}>{l}</button>; })}
          </div>
        )}
        <span className="fb-hprobes" aria-hidden="true"><span className="fb-paneltitle is-t-l">Calendrier des feux</span><span className="fb-paneltitle is-t-s">Calendrier</span><span className="fb-chipprobe is-c-l">Septembre 2019<i className="fb-chipx" /></span><span className="fb-chipprobe is-c-s">Sept. 2019<i className="fb-chipx" /></span><span className="at-btn at-btn-sm fb-rangeprobe is-r-l">{rangeLabel(from, to, false)}<Icon d={IC.down} /></span><span className="at-btn at-btn-sm fb-rangeprobe is-r-s">{rangeLabel(from, to, true)}<Icon d={IC.down} /></span><span className="fb-provchip is-comp is-pill">Avant 2012 : estimé</span></span>
        <span className="fb-monthslot">{!isDefSel && !empty && <span className="fb-monthchip" title={cap1(monthYear(sel % 12, FIRST + Math.floor(sel / 12))) + ' : le mois sélectionné'}>{cap1(chipForm === 'long' ? monthLong(sel % 12) : monthShort(sel % 12))} {FIRST + Math.floor(sel / 12)}<button type="button" aria-label="Effacer le mois sélectionné" onClick={onClear}><Icon d={IC.x} /></button></span>}</span>
        {!empty && <RangePop from={from} to={to} onChange={setRange} short={lvl === 3 || lvl === 4} />}
        {/* v6.2: provenance pill at its natural width, short text; when the header is tight it is left out (the (i) and the seam tooltip carry it), never a bare glyph. */}
        {!(typeof lvl === 'number' && lvl >= 2) && <span aria-hidden={!empty && Z ? undefined : true} style={!empty && Z ? undefined : { visibility: 'hidden' }} className={cx('fb-provchip', raw ? 'is-real' : 'is-comp')} title={raw ? 'Tel qu’enregistré : comptages NASA FIRMS, sans correction' : 'Avant 2012 : estimé d’après l’ancien satellite (comptages MODIS × le ratio, une estimation de ce que VIIRS aurait vu)'}>{raw ? 'Tel qu’enregistré' : 'Avant 2012 : estimé'}</span>}
        {!empty && Z && <Info id="fb-cal-info" label="À propos du calendrier">
          {notes.map((n, i) => <p key={i}>{n}</p>)}
          {onMethod && <button type="button" className="at-link" onClick={onMethod}>Méthode <Icon d={IC.arrow} /></button>}
          <ProvenanceLine status={raw ? 'real' : 'computed'} locale="fr" source="NASA FIRMS" products={['MCD14ML', 'VNP14IMGT']} period={y0 + '–' + y1}>{!raw && <span>avant 2012 calculé</span>}</ProvenanceLine>
        </Info>}
      </div>
      <div className={cx('fb-calbody', (settled || phone) && 'is-settled')} ref={body}>
        {empty ? (
          <div className="fb-emptyblock">
            <p>{outside ? 'Pas de calendrier : cette zone est hors des données du pays.' : sparse ? (total < 1 ? 'Aucune détection dans cette zone, 2001–' + LAST + '.' : 'Seulement ' + Math.round(total) + ' cellules-jours ici en 2001–' + LAST + ' : trop peu pour dessiner un calendrier.') : 'Aucune détection dans cette zone, 2001–' + LAST + '.'}</p>
            {outside ? <button type="button" className="fb-evbtn" onClick={onNearest}>Données les plus proches<Icon d={IC.arrow} /></button> : <button type="button" className="fb-evbtn" onClick={onLarger}>Essayer une zone plus grande<Icon d={IC.arrow} /></button>}
          </div>
        ) : cd ? (
          <div className={cx('fb-calgrid', margin && 'has-margin')}>
          <BurnCalendar data={cdL} mode={raw ? 'raw' : 'harmonized'} view={anomaly ? 'anomaly' : 'counts'} locale="fr" barScale="log" showStates={false}
            annotate={harm && y0 <= 2011 && y1 >= SW} selectMode pinned={FIRST + Math.floor(sel / 12) >= y0 && FIRST + Math.floor(sel / 12) <= y1 ? selKey : null}
            onPin={(k) => { if (k) { if (mPicked && monthIndex(k) === sel) { onClear(); return; } onSelect(monthIndex(k)); if (phone) setSheet(true); } }} onActive={(c) => { onHoverYear && onHoverYear(c ? c.year : null); hovSet.current && hovSet.current(c && c.key ? monthIndex(c.key) : null); }} tip={phone} cellHeight={phone ? 14 : cellH} barHeight={phone ? 72 : barH} keyInFootAt={99999} compact={phone} />
          </div>
        ) : <SkeletonCal />}
        {!empty && cd && geo && geo.seam != null && harm && (
          <div className="fb-seam" aria-hidden="true" style={{ transform: 'translateX(' + geo.seam + 'px)', top: geo.top + 'px', height: (geo.bottom - geo.top) + 'px' }}>
            <span className="is-l" title={raw ? 'Avant cette ligne : l’ancien satellite (MODIS), tel qu’enregistré' : 'Avant cette ligne, l’ancien satellite (MODIS) a été multiplié par ' + F2(Z.ratio) + ' pour correspondre au nouveau (VIIRS)'}>{raw ? 'MODIS' : 'MODIS × ' + F2(Z.ratio) + (Z.gradeWhy === 'borrowed' ? ' (zone plus large)' : '')}</span><span className="is-r">VIIRS</span>
          </div>
        )}
        {!empty && cd && geo && geo.x01 != null && !phone && (
          <p className="fb-terranote" ref={noteRef} style={{ left: geo.x01 + 'px', top: geo.top + 'px', visibility: noteForm === 'none' ? 'hidden' : undefined }} aria-hidden={noteForm === 'none' ? true : undefined}>{noteForm === 'long' ? <>{FIRST}–{String(FIRST + 1).slice(2)} : un seul satellite MODIS,<br />hors des statistiques</> : noteForm === 'short' ? <>{FIRST}–{String(FIRST + 1).slice(2)} : un satellite,<br />hors statistiques</> : <>{FIRST}–{String(FIRST + 1).slice(2)} :<br />partiel</>}</p>
        )}
        {!empty && cd && geo && geo.right > 0 && margin && Z.harmOK && (
          <div className="fb-margin" title="Comparez chaque ligne à son mois typique." aria-label={'Mois typique (médiane ' + STATS_FROM + '–' + LAST + ') : ' + Z.typical.map((v, m) => monthShort(m) + ' ' + NUM(v)).join(', ')} role="img" style={{ left: geo.right + 'px' }}>
            <span className="fb-margin-t" style={{ top: geo.rows[0].y + 'px' }}>mois typique<br />médiane {STATS_FROM}–{String(LAST).slice(2)}</span>
            {geo.rows.map((r, m) => { const t = Z.typical[m], mx = Math.max(...Z.typical, 1), f = t > 0 ? Math.max(0.04, Math.log10(1 + t) / Math.log10(1 + mx)) : 0; return <i key={m} title={cap1(monthLong(m)) + ' typique : ' + NUM(t) + ' cellules-jours (médiane ' + STATS_FROM + '–' + LAST + ')'} style={{ top: r.y + 'px', height: r.h + 'px', width: (f * 100) + '%' }} />; })}
          </div>
        )}
        {!empty && cd && !phone && <p className="fb-calread" ref={readRef}><span key={(Z ? [Z.box.s, Z.box.n, Z.box.w, Z.box.e].join(',') : '') + ':' + sel}>{readout}</span></p>}
  {!empty && (
          <div className="fb-calfoot" ref={footRef}>
            <span title={anomaly ? 'Chaque mois divisé par un mois typique du même nom' : 'Détections de feux par mois, comptées en cellules-jours : un carré de 1 km avec au moins un feu ce jour-là'}><ColorLegend view={anomaly ? 'anomaly' : 'counts'} compact locale="fr" steps={cd ? cd.breaks : undefined} unit={anomaly ? 'bleu = plus calme que le typique, orange–rouge = plus actif' : theme === 'dark' ? 'détections de feux par mois : plus foncé = moins, plus clair = plus' : 'détections de feux par mois : plus clair = moins, plus foncé = plus'} /></span>
            <span className="fb-keys" aria-hidden="true"><span title="Aqua : un seul satellite MODIS, qui ne change pas de capteur en 2012 (une vérification de cohérence)"><i className="at-aqua-swatch fb-aquakey" />Satellite Aqua seul (une vérification)</span></span>

          </div>
        )}
        {phone && sheet && readout && (
          <div className="fb-sheet" role="dialog" aria-label="Mois sélectionné">
            <p>{readout}</p>
            <button type="button" className="fb-evbtn" onClick={() => setSheet(false)}>Fermer</button>
          </div>
        )}
      </div>
    </section>
  );
});
