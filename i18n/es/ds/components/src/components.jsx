// Atelier Terrain : composants de données (spécification visuelle, réutilisable dans l'app React).
import { illustrativeData, ILLUSTRATIVE_NOTE, zoneField, realData, zoneTiles, recoveryTest, poolRatio, FIRMS_META, FIRMS_ZONES, SENSORS } from './data.js';
import { COUNT_STEPS, RATIO_STEPS, RATIO_NAMES, countClass, ratioClass, paletteVar, formatNumber, formatRatio, formatStep, formatShort, formatDecimal, MONTHS, MONTHS_LONG, monthYear, cap1 } from './scale.js';
import { verdict, modeLine, unitLine, stepTexts, zoneLabel, recordLine, medianPhrase, ratioText, monthRank, bigYears } from './describe.js';

// React est lu au rendu (window.React), jamais au chargement : le bundle se charge avant ou après React.
const R = () => window.React;
const useState = (...a) => R().useState(...a);
const useMemo = (...a) => R().useMemo(...a);
const useRef = (...a) => R().useRef(...a);
const useCallback = (...a) => R().useCallback(...a);
const useEffect = (...a) => R().useEffect(...a);
const cx = (...a) => a.filter(Boolean).join(' ');
const reducedMotion = () => typeof window !== 'undefined' && (document.documentElement.getAttribute('data-motion') === 'reduce' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));

// Durées de la bascule : vague 2001 → 2011, 35 ms d'écart, 480 ms par barre (≈ 0,87 s au total).
const WAVE_STEP = 35, WAVE_DUR = 450; // = --duration-toggle

/* ───────────── Segmented ───────────── */
export function Segmented({ options = [], value, defaultValue, onChange, ariaLabel = 'Opciones', size = 'md', className }) {
  const [inner, setInner] = useState(defaultValue ?? (options[0] && options[0].value));
  const current = value ?? inner;
  const refs = useRef([]);
  const pick = (v) => { if (value === undefined) setInner(v); onChange && onChange(v); };
  const onKey = (e, i) => {
    const n = options.length;
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
    if (j == null) return;
    e.preventDefault();
    pick(options[j].value);
    refs.current[j] && refs.current[j].focus();
  };
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx('at-seg', size === 'sm' && 'at-seg-sm', className)}>
      {options.map((o, i) => {
        const on = o.value === current;
        return (
          <button key={o.value} ref={(el) => (refs.current[i] = el)} type="button" role="radio" aria-checked={on}
            tabIndex={on ? 0 : -1} className={cx('at-seg-item', on && 'is-on')} onClick={() => pick(o.value)} onKeyDown={(e) => onKey(e, i)}>
            {o.swatch && <i className="at-seg-swatch" style={{ background: o.swatch }} aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── SeriesToggle : la bascule Brut / Harmonisé, contrôle principal ───────────── */
// Clic : choisit. Appui long (ou Espace maintenu quand la bascule a le focus) : montre l'autre série tant qu'on maintient.
export function SeriesToggle({ value = 'harmonized', onChange, locale = 'en', hint = true, size = 'lg' }) {
  const fr = true /* i18n */;
  const hold = useRef(null);
  const refs = useRef({});
  const [held, setHeld] = useState(false);
  const other = (v) => (v === 'raw' ? 'harmonized' : 'raw');
  const emit = (v) => onChange && onChange(v);
  const start = (base) => {
    if (hold.current) return;
    hold.current = { base, held: false, timer: setTimeout(() => { if (!hold.current) return; hold.current.held = true; setHeld(true); emit(other(base)); }, 260) };
  };
  const end = (pick) => {
    const h = hold.current; hold.current = null;
    if (!h) return;
    clearTimeout(h.timer);
    if (h.held) { setHeld(false); emit(h.base); }
    else if (pick && pick !== value) emit(pick);
  };
  useEffect(() => () => { if (hold.current) clearTimeout(hold.current.timer); }, []);
  const opts = [
    { v: 'raw', label: fr ? 'Brut' : 'Raw' },
    { v: 'harmonized', label: fr ? 'Harmonisé' : 'Harmonized' },
  ];
  const shown = held ? other(hold.current ? hold.current.base : value) : value;
  const hintText = held ? (fr ? 'Relâchez pour revenir' : 'Release to go back')
    : value === 'raw' ? (fr ? 'Maintenez pour voir l’harmonisé' : 'Press and hold to see harmonized')
      : (fr ? 'Maintenez pour revoir le brut' : 'Press and hold to see raw');
  return (
    <div className={cx('at-toggle', 'is-' + size, held && 'is-held')}>
      <div role="radiogroup" aria-label={fr ? 'Série' : 'Series'} className={cx('at-toggle-track', 'on-' + value)}>
        <span className="at-toggle-thumb" aria-hidden="true" />
        {opts.map((o) => {
          const on = o.v === value;
          return (
            <button key={o.v} ref={(el) => (refs.current[o.v] = el)} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
              className={cx('at-toggle-item', on && 'is-on')}
              onPointerDown={(e) => { if (e.button !== 0) return; start(value); }}
              onPointerUp={() => end(o.v)}
              onPointerLeave={() => { if (hold.current && hold.current.held) end(null); }}
              onPointerCancel={() => end(null)}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => { if (e.detail === 0 && !hold.current) emit(o.v); }}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(value); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const t = other(value); emit(t); refs.current[t] && refs.current[t].focus(); }
              }}
              onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(o.v); } }}>
              {o.v === 'raw' && <span className="at-toggle-dots" aria-hidden="true"><i className="d-modis" /><i className="d-viirs" /></span>}
              {o.label}
            </button>
          );
        })}
      </div>
      {hint && <span className="at-toggle-hint" aria-live="polite">{hintText}</span>}
      <span className="at-sr" aria-live="polite">{shown === 'raw' ? (fr ? 'Série brute affichée' : 'Raw series shown') : (fr ? 'Série harmonisée affichée' : 'Harmonized series shown')}</span>
    </div>
  );
}

/* ───────────── ColorLegend : bornes entre les cases, même convention pour les deux vues ───────────── */
export function ColorLegend({ view = 'counts', palette = 'inferno', compact = false, locale = 'en', unit, unitTitle, showStates = false, steps }) {
  const fr = true /* i18n */;
  const counts = view !== 'anomaly';
  const cells = counts ? 9 : 7;
  const fills = counts ? Array.from({ length: 9 }, (_, k) => paletteVar(palette, k)) : RATIO_NAMES.map((nm) => 'var(--' + nm + ')');
  // Libellés aux frontières : i = 0 (bord gauche) … n (bord droit).
  const ticks = counts
    ? (steps || COUNT_STEPS).map((v, i) => ({ i, t: formatShort(v, locale) }))
    : RATIO_STEPS.map((v, i) => ({ i: i + 1, t: formatDecimal(v, v === 1.25 || v === 0.25 ? 2 : v % 1 ? 1 : 0, locale) }));
  const unitText = unit || (counts ? (fr ? 'celdas-día por mes' : 'cell-days per month') : (fr ? '× la mediana del mismo mes' : '× the same month’s median'));
  const label = counts
    ? (fr ? 'Leyenda: celdas-día por mes, de ' + formatNumber((steps || COUNT_STEPS)[0], locale) + ' a más de ' + formatNumber((steps || COUNT_STEPS)[(steps || COUNT_STEPS).length - 1], locale) + ', escala logarítmica' : 'Legend: cell-days per month, from ' + formatNumber((steps || COUNT_STEPS)[0], locale) + ' to over ' + formatNumber((steps || COUNT_STEPS)[(steps || COUNT_STEPS).length - 1], locale) + ', log scale')
    : (fr ? 'Leyenda: razón con la mediana del mismo mes, de menos de un cuarto a más de cuatro veces' : 'Legend: ratio to the same month’s median, from under a quarter to over four times');
  return (
    <div className={cx('at-legend', compact && 'is-compact', counts && 'is-counts')} role="img" aria-label={label + (unitTitle ? '. ' + unitTitle : '')} style={{ '--n': cells }}>
      <div className="at-legend-scale">
        <div className="at-legend-ramp">{fills.map((f, k) => <i key={k} className="at-cell" style={{ background: f }} />)}</div>
        <div className="at-legend-ticks">
          {ticks.map((t) => <span key={t.i} style={{ left: 'calc(' + t.i + ' * (var(--cw) + var(--gap)) - var(--gap) / 2)' }} className={t.i === 0 ? 'is-start' : ''}>{t.t}</span>)}
        </div>
      </div>
      <div className={cx('at-legend-unit', unitTitle && 'has-title')} title={unitTitle || undefined}>{unitText}</div>
      {showStates && <CalendarStates view={view} locale={locale} />}
    </div>
  );
}

export function CalendarStates({ view = 'counts', locale = 'en', nodata = true, partial = true }) {
  const fr = true /* i18n */;
  return (
    <div className="at-states">
      {view !== 'anomaly' && <span className="at-state"><i className="at-cell at-cell-zero" aria-hidden="true" />{fr ? 'sin detección' : 'no detection'}</span>}
      {nodata && <span className="at-state"><i className="at-cell at-cell-nodata" aria-hidden="true" />{fr ? 'sin observación' : 'no observation'}</span>}
      {partial && <span className="at-state"><i className="at-cell at-cell-partial" aria-hidden="true" />{fr ? 'mes en curso' : 'month in progress'}</span>}
      {view === 'anomaly' && <span className="at-state"><i className="at-cell at-cell-low" aria-hidden="true" />{fr ? 'muy pocas para comparar' : 'too few to compare'}</span>}
    </div>
  );
}

/* ───────────── VerdictCard : surtitre, nombre, une phrase, une action ───────────── */
const ARROW_FWD = 'M5 12h14M13 6l6 6-6 6', ARROW_BACK = 'M19 12H5M11 6l-6 6 6 6';
const xSplit = (v) => (typeof v === 'string' && /\u202F×$/.test(v) ? <>{v.slice(0, -2)}<span className="at-x">×</span></> : v);
export function VerdictCard({ kicker, value, valueFrom, sentence, actionLabel, actionCta, actionDir = 'forward', onAction, note, children, label = 'Verdict' }) {
  return (
    <section className="at-verdict" aria-label={label} aria-live="polite">
      {kicker && <div className="at-verdict-kicker">{kicker}</div>}
      <div key={String(valueFrom) + String(value)} className="at-verdict-number answer-number">
        {valueFrom != null && <><span className="at-verdict-from">{xSplit(valueFrom)}</span><svg className="at-verdict-arrow" viewBox="0 0 24 24" role="img" aria-label="→"><path d="M4 12h15M13 6l6 6-6 6" /></svg></>}
        {xSplit(value)}
      </div>
      <p className="at-verdict-sentence verdict">{sentence}</p>
      {(actionLabel || actionCta) && (
        <div className="at-verdict-action">
          {actionLabel && <span>{actionLabel}</span>}
          {actionCta && <button type="button" className={cx('at-link', actionDir === 'back' && 'is-back')} onClick={onAction}>
            {actionDir === 'back' && <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ARROW_BACK} /></svg>}{actionCta}{actionDir !== 'back' && <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ARROW_FWD} /></svg>}
          </button>}
        </div>
      )}
      {note && <p className="at-note"><span className="at-note-dot" aria-hidden="true" />{note}</p>}
      {children}
    </section>
  );
}

/* ───────────── nombre animé (compteur du saut) ───────────── */
function useTween(target, duration) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reducedMotion() || from.current === target) { from.current = target; setV(target); return; }
    const a = from.current, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      const x = a + (target - a) * e;
      setV(x);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = target; };
  }, [target]);
  return v;
}

/* ───────────── BurnCalendar ───────────── */
// Totaux annuels (avec le repère 2012 et le témoin Aqua), grille mois × année, axe et états, sur un seul axe des années.
export function BurnCalendar({ data, mode = 'harmonized', view = 'counts', palette = 'inferno', locale = 'en', pinned, onPin, onActive, barHeight = 112, cellHeight = 16, annotate = true, showStates = true, compact: compactProp = false, barScale = 'linear', selectMode = false, keyInFootAt = 1100, tip = true }) {
  const rootRef = useRef(null);
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((es) => setWidth(es[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = width < 560; // FireBridge V5 patch: was 640; the rail layout gives the calendar 600–640 px at 1680–1920
  const keyInFoot = width < keyInFootAt; // sous ~1100 px, les clés des lignes descendent en pied pour ne pas croiser le repère
  const compact = compactProp || narrow;
  const barH = compact ? Math.round(barHeight * 0.78) : barHeight;
  const cellH = compact ? Math.min(cellHeight, 14) : cellHeight;
  const d = useMemo(() => data || illustrativeData(), [data]);
  const fr = true /* i18n */;
  const years = d.years;
  const n = years.length;
  const [hover, setHover] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const active = hover || focusKey || (selectMode ? null : pinned) || null;
  const byKey = d.byKey;
  const colOf = (y) => years.indexOf(y);
  const sw = d.switchYear || 2012;
  const swFrac = colOf(sw) / n;

  const full = d.annual.filter((a) => !a.partial).map((a) => a.harmonized).sort((a, b) => a - b);
  const medYear = full[Math.floor(full.length / 2)] || 1;
  const isLog = barScale === 'log';
  // Linéaire : plafond à 3,3 années médianes (les géants sont coupés et chiffrés). Log : décades de 10 au maximum, rien n'est coupé.
  const top = Math.max(...d.annual.map((a) => Math.max(a.raw || 0, a.harmonized || 0, a.aqua || 0)), 10);
  // Adaptive log domain (FireBridge patch): lower bound ~ half the smallest non-zero annual total, snapped down to 1-2-5; upper bound a little above the largest.
  const nz = d.annual.flatMap((a) => [a.raw, a.harmonized, a.aqua]).filter((x) => x != null && x > 0);
  const snap125 = (x) => { const e = Math.pow(10, Math.floor(Math.log10(x))), m = x / e; return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e; };
  const lo = isLog ? Math.max(1, snap125((nz.length ? Math.min(...nz) : 10) / 2)) : 10;
  const hiLog = isLog ? Math.max(top * 1.12, lo * 10) : Math.pow(10, Math.ceil(Math.log10(top * 1.05) * 4) / 4);
  const cap = isLog ? hiLog : medYear * 3.3;
  const frac = (x) => (x == null || x <= 0 ? 0 : isLog ? Math.max(0, Math.min(1, (Math.log10(Math.max(x, lo)) - Math.log10(lo)) / (Math.log10(hiLog) - Math.log10(lo)))) : Math.min(x, cap) / cap);
  const logTicks = (() => {
    if (!isLog) return [];
    const cand = [];
    for (let e = 0; e <= 6; e++) [1, 2, 5].forEach((m) => { const t = m * Math.pow(10, e); if (t > lo * 1.05 && t < hiLog / 1.05) cand.push(t); });
    const dec = cand.filter((t) => Math.log10(t) % 1 === 0);
    const fr = (t) => (Math.log10(t) - Math.log10(lo)) / (Math.log10(hiLog) - Math.log10(lo));
    const space = (list) => { const out = []; list.slice().reverse().forEach((t) => { if (!out.length || fr(out[out.length - 1]) - fr(t) >= 0.24) out.push(t); }); return out.reverse().slice(-4); };
    const a = space(dec.length >= 2 ? dec : cand);
    return a.length >= 2 ? a : space(cand);
  })();
  const v = (a) => (mode === 'raw' ? a.raw : a.harmonized);
  const value = (c) => (c ? (mode === 'raw' ? c.raw : c.harmonized) : null);
  const wave = (y) => (y < sw ? (y - years[0]) * WAVE_STEP : 0);

  const cellStyle = (c) => {
    if (c.status === 'future' || c.status === 'nodata') return null;
    const delay = { transitionDelay: wave(c.year) + 'ms' };
    if (view === 'anomaly') return c.low || c.ratio == null ? null : Object.assign({ background: 'var(--' + RATIO_NAMES[ratioClass(c.ratio)] + ')' }, delay);
    const k = countClass(value(c), 'log', null, d.breaks);
    if (k === -1) return null;
    return Object.assign({ background: paletteVar(palette, k) }, delay);
  };
  const cellLabel = (c) => {
    const mon = cap1(monthYear(c.month, c.year, locale));
    if (c.status === 'future') return mon + (fr ? ': aún no' : ': not yet');
    if (c.status === 'nodata') return mon + (fr ? ': sin observación' : ': no observation');
    let s = mon + (fr ? ': ' : ': ') + formatNumber(value(c), locale) + (fr ? ' celdas-día' : ' cell-days');
    if (c.low || c.ratio == null) s += fr ? ', muy pocas para comparar' : ', too few to compare';
    else s += ', ' + ratioText(c.ratio, locale) + ' ' + medianPhrase(c.month, locale);
    if (c.status === 'partial') s += fr ? ' (mes en curso)' : ' (month in progress)';
    if (c.key === pinned) s += fr ? ', fijado' : ', pinned';
    return s;
  };

  const gridRef = useRef(null);
  const firstKey = d.cells.find((c) => c.status !== 'future').key;
  const tabKey = focusKey || pinned || firstKey;
  const setActive = (k) => { onActive && onActive(k ? byKey[k] : null); };
  const move = useCallback((c, dy, dx) => {
    let y = c.year + dx, m = c.month + dy;
    if (m < 1) m = 12; if (m > 12) m = 1;
    if (y < years[0] || y > years[n - 1]) return;
    const k = y + '-' + String(m).padStart(2, '0');
    const t = byKey[k];
    if (!t || t.status === 'future') return;
    const el = gridRef.current && gridRef.current.querySelector('[data-key="' + k + '"]');
    el && el.focus();
  }, [byKey, years, n]);
  const onKey = (e, c) => {
    const map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (map[e.key]) { e.preventDefault(); move(c, map[e.key][0], map[e.key][1]); }
    if (e.key === 'Escape') { if (!selectMode) onPin && onPin(null); setFocusKey(null); e.currentTarget.blur(); }
  };
  const pin = (c) => onPin && onPin(selectMode ? c.key : c.key === pinned ? null : c.key);

  const ac = active && byKey[active];
  const pct = (i) => ((i + 0.5) / n) * 100;

  // Témoin Aqua (indice) : même capteur depuis 2003, identique dans les deux modes.
  const aquaRows = d.annual.filter((a) => a.aqua != null);
  const aquaPts = aquaRows.map((a) => pct(colOf(a.year)).toFixed(3) + ',' + (100 - frac(a.aqua) * 100).toFixed(2)).join(' ');
  const aquaFirst = aquaRows[0];
  
  const st0 = stepTexts(d, mode, locale);
  // FireBridge patch: a page may replace the step figure (e.g. the correction factor when the trend is uncertain).
  const ov = d.step && d.step.override;
  const st = ov ? Object.assign({}, st0, { value: ov.value, label: ov.label, pre: ov.pre, def: ov.def || st0.def, other: ov.other, witness: null, match: false }) : st0;
  const levels = d.step && d.step.levels ? d.step.levels[mode] : null;
  const stepNum = useTween(st.value, WAVE_STEP * (sw - years[0] - 1) + WAVE_DUR);
  const landed = Math.abs(stepNum - st.value) < 0.01;

  const axisYears = years.filter((y) => y === years[0] || y === years[n - 1] || (y % (compact ? 10 : 5) === 0 && years[n - 1] - y >= (compact ? 4 : 3)));
  const activeYear = ac ? ac.year : null;

  return (
    <div className={cx('at-cal', 'is-' + mode, 'view-' + view, compact && 'is-compact')} ref={rootRef} style={{ '--at-cols': n, '--cell-h': cellH + 'px', '--bars-h': barH + 'px', '--wave': WAVE_DUR + 'ms' }}
      onMouseLeave={() => { setHover(null); setActive(null); }}>
      {annotate && compact && (
        <div className="at-cal-row at-cal-annot">
          <div className="at-cal-gutter" />
          <div className={cx('at-step-flow', st.match && 'is-match')}>
            <div className="at-step-main" title={st.def}><span className="at-step-kicker">{sw}</span>{st.pre && <span className="at-step-label">{st.pre}</span>}<span className="at-step-num">{formatStep(stepNum, locale)}</span><span className="at-step-label">{st.label}</span></div>
            <div className="at-step-sub">{st.other}{st.witness && <> · <i className="at-aqua-swatch" aria-hidden="true" />{st.witness}{st.match && landed ? ' ✓' : ''}</>}</div>
          </div>
        </div>
      )}
      {annotate && !compact && (
        <div className="at-cal-row at-cal-annotrow">
          <div className="at-cal-gutter" />
          <div className={cx('at-cal-track', 'at-annot-track', keyInFoot && 'is-nokey')} style={{ '--swf': (swFrac * 100).toFixed(3) + '%' }}>
            {!keyInFoot && (
              <span className="at-aqua-key">
                {isLog && <b>{fr ? 'Total anual, escala log' : 'Annual total, log scale'}</b>}
                <span><i className={cx('at-bar-key', mode === 'raw' ? 'is-raw' : 'is-calc')} aria-hidden="true" />{mode === 'raw' ? 'MODIS' : 'MODIS × ' + formatDecimal(d.validation ? d.validation.ratio : 1, 2, locale)}<i className="at-bar-key is-viirs" aria-hidden="true" />VIIRS</span>
                <span><i className="at-aqua-swatch" aria-hidden="true" />{fr ? 'Solo Aqua, índice (control)' : 'Aqua only, index (consistency check)'}</span>
                <span><i className="at-level-key" aria-hidden="true" />{st.levelKey}</span>
              </span>
            )}
            <i className="at-mark" style={{ left: swFrac * 100 + '%' }} aria-hidden="true" />
            <div className={cx('at-step', 'is-row', st.match && 'is-match')} title={st.def}>
              <span className="at-step-kicker">{st.kicker}<b>MODIS</b> → <b>VIIRS</b>{st.pre ? ' · ' : ''}</span>
              {st.pre && <span className="at-step-label">{st.pre}</span>}
              <span className="at-step-num">{formatStep(stepNum, locale)}</span>
              <span className="at-step-label">{st.label}</span>
            </div>
          </div>
        </div>
      )}
      {/* Totaux annuels */}
      <div className="at-cal-row at-cal-bars" aria-hidden="true">
        {isLog ? (
          <div className="at-cal-gutter at-cal-yticks">
            {logTicks.map((t) => <span key={t} style={{ bottom: frac(t) * 100 + '%' }}>{formatShort(t, locale)}</span>)}
          </div>
        ) : <div className="at-cal-gutter at-cal-gutter-label">{compact ? 'Total' : (fr ? 'Total anual' : 'Annual total')}</div>}
        <div className="at-cal-track">
          <div className="at-bars-area">
            {logTicks.map((t) => <i key={t} className="at-ygrid" style={{ bottom: frac(t) * 100 + '%' }} />)}
            {d.annual.map((a, i) => {
              const val = v(a);
              const h = frac(val);
              const clipped = !isLog && val > cap;
              const on = activeYear === a.year;
              return (
                <div key={a.year} className={cx('at-bar-col', on && 'is-on', a.partial && 'is-partial', a.cls)} style={{ left: (i / n) * 100 + '%', width: 100 / n + '%' }}>
                  <div className={cx('at-bar', 'sensor-' + a.sensor)} style={{ transform: 'scaleY(' + h.toFixed(4) + ')', transitionDelay: wave(a.year) + 'ms, 0ms' }} />
                  {clipped && <div className="at-bar-break" />}
                  {isLog && val > 0 && val < lo && <div className="at-bar-floor" title={fr ? 'menos de 10' : 'under 10'} />}
                  {a.partial && !compact && <div className="at-bar-note" style={{ bottom: 'calc(' + (h * 100).toFixed(1) + '% + 3px)' }}>{(a.partialNote && a.partialNote.replace(/^to (\w{3})$/, (_, m) => 'hasta ' + MONTHS.fr[['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m)])) || (fr ? 'en curso' : 'in progress')}</div>}
                  {clipped && <div className="at-bar-clip">{formatNumber(val, locale)}</div>}
                </div>
              );
            })}
            {aquaRows.some((a) => a.aqua > 0) && <svg className="at-aqua" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={aquaPts} vectorEffect="non-scaling-stroke" />
            </svg>}
            {annotate && levels && (
              <>
                <i className="at-level is-before" style={{ left: (colOf(d.step.before[0]) / n) * 100 + '%', width: ((colOf(sw) - colOf(d.step.before[0])) / n) * 100 + '%', bottom: frac(levels.before) * 100 + '%' }} />
                <i className="at-level is-after" style={{ left: swFrac * 100 + '%', width: ((colOf(d.step.after[1]) + 1 - colOf(sw)) / n) * 100 + '%', bottom: frac(levels.after) * 100 + '%' }} />
              </>
            )}
          </div>
          {annotate && <div className="at-mark" style={{ left: swFrac * 100 + '%' }} />}
        </div>
      </div>

      {/* Grille mois × année */}
      <div className="at-cal-grid" ref={gridRef}>
        {annotate && <i className="at-mark at-mark-grid" style={{ '--sw': swFrac }} aria-hidden="true" />}
        {ac && tip && <Tip c={ac} col={colOf(ac.year)} n={n} mode={mode} locale={locale} pinned={pinned} selectMode={selectMode} viaKey={!hover && focusKey === ac.key} factor={d.validation ? d.validation.ratio : null} mini={ac.key === pinned && !hover && !focusKey} rowH={cellH + 2} />}
        <div className="at-cal-rows" role="grid" aria-label={(fr ? 'Calendario de quemas, mes por año, ' : 'Fire calendar, month by year, ') + years[0] + '–' + years[n - 1] + '. ' + (({ 'Real NASA FIRMS tiles, MCD14ML and VNP14IMGT': 'Teselas reales de NASA FIRMS, MCD14ML y VNP14IMGT' })[d.note] || d.note || ILLUSTRATIVE_NOTE)}>
        {Array.from({ length: 12 }, (_, mi) => (
          <div key={mi} role="row" className="at-cal-row at-cal-month">
            <div role="rowheader" className={cx('at-cal-gutter', 'at-cal-mlabel', ac && ac.month === mi + 1 && 'is-on')}>{cap1((fr ? MONTHS.fr : MONTHS.en)[mi])}</div>
            <div className="at-cal-cells">
              {years.map((y) => {
                const c = byKey[y + '-' + String(mi + 1).padStart(2, '0')];
                const on = active === c.key;
                const isZero = view === 'counts' && value(c) === 0 && c.status !== 'nodata';
                const cls = cx('at-cell', 'st-' + c.status, c.cls, isZero && 'is-zero', view === 'anomaly' && (c.low || c.ratio == null) && c.status !== 'nodata' && 'is-low', on && 'is-on', c.key === pinned && 'is-pin', activeYear === y && 'is-col');
                if (c.status === 'future') return <div key={c.key} role="gridcell" aria-label={cellLabel(c)} className={cls} />;
                return (
                  <button key={c.key} type="button" role="gridcell" data-key={c.key} className={cls} style={cellStyle(c)} aria-label={cellLabel(c)} aria-selected={c.key === pinned}
                    tabIndex={c.key === tabKey ? 0 : -1}
                    onMouseEnter={() => { setHover(c.key); setActive(c.key); }}
                    onClick={() => pin(c)}
                    onFocus={() => { setFocusKey(c.key); setActive(c.key); }}
                    onBlur={() => setFocusKey((k) => (k === c.key ? null : k))} onKeyDown={(e) => onKey(e, c)} />
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Axe des années */}
      <div className="at-cal-row at-cal-axis" aria-hidden="true">
        <div className="at-cal-gutter" />
        <div className="at-cal-track">
          {axisYears.filter((y) => activeYear == null || Math.abs(colOf(y) - colOf(activeYear)) > Math.max(compact ? 3 : 1, Math.ceil(44 / Math.max(1, (width - 60) / n)))).map((y) => ( /* FireBridge V5.1: hide a tick within one label width of the active year */
            <span key={y} style={{ left: pct(colOf(y)) + '%' }}>{y}</span>
          ))}
          {activeYear != null && <span className="is-on" style={{ left: pct(colOf(activeYear)) + '%' }}>{activeYear}</span>}
        </div>
      </div>
      {showStates && (
        <div className="at-cal-row at-cal-foot">
          <div className="at-cal-gutter" />
          <div className="at-cal-foot-items">
            {keyInFoot && <span className="at-state"><i className={cx('at-bar-key', mode === 'raw' ? 'is-raw' : 'is-calc')} aria-hidden="true" />{mode === 'raw' ? 'MODIS' : 'MODIS × ' + formatDecimal(d.validation ? d.validation.ratio : 1, 2, locale)}<i className="at-bar-key is-viirs" aria-hidden="true" />VIIRS</span>}
            {keyInFoot && <span className="at-state"><i className="at-aqua-swatch" aria-hidden="true" />{fr ? 'Solo Aqua, índice (control)' : 'Aqua only, index (consistency check)'}</span>}
            {keyInFoot && isLog && <span className="at-state">{fr ? 'Totales anuales en escala log' : 'Annual totals on a log scale'}</span>}
            {keyInFoot && annotate && <span className="at-state"><i className="at-level-key" aria-hidden="true" />{st.levelKey || (fr ? 'año mediano antes / después de 2012' : 'median year before / after 2012')}</span>}
            <CalendarStates view={view} locale={locale} nodata={d.cells.some((c) => c.status === 'nodata')} partial={d.cells.some((c) => c.status === 'partial')} />
          </div>
        </div>
      )}
    </div>
  );
}

function Tip({ c, col, n, mode, locale, pinned, viaKey = false, factor, mini = false, rowH = 18, selectMode = false }) {
  const fr = true /* i18n */;
  const left = col > n * 0.55;
  const frac = left ? col / n : (col + 1) / n;
  // Ancrée sur la grille, dans la moitié opposée à la rangée : jamais sur les barres ni sur le repère 2012.
  const top = c.month <= 6 ? 6 * rowH + 2 : 0;
  const pos = { left: 'calc(var(--at-gutter) + (100% - var(--at-gutter)) * ' + frac.toFixed(4) + ')' };
  if (mini) {
    return <div className={cx('at-tip', 'is-mini', left && 'is-left')} role="status" style={Object.assign({ top: (c.month - 1) * rowH - 3 + 'px' }, pos)}>{fr ? 'Fijado · Esc para quitar' : 'Pinned · Esc to clear'}</div>;
  }
  const val = mode === 'raw' ? c.raw : c.harmonized;
  const rows = [];
  if (c.status === 'nodata') rows.push(<div key="v" className="at-tip-value">{fr ? 'Sin observación' : 'No observation'}</div>);
  else {
    rows.push(<div key="v" className="at-tip-value metric">{formatNumber(val, locale)} <span>{fr ? 'celdas-día' : 'cell-days'}</span></div>);
    if (c.noCompare) rows.push(<div key="r" className="at-tip-ratio is-low">{c.noCompare}</div>);
    else if (c.low || c.ratio == null) rows.push(<div key="r" className="at-tip-ratio is-low">{fr ? 'Muy pocas detecciones para comparar' : 'Too few detections to compare'} <span>({fr ? 'mediana: ' : 'median: '}{formatNumber(c.median, locale)})</span></div>);
    else rows.push(<div key="r" className="at-tip-ratio">{ratioText(c.ratio, locale)} {medianPhrase(c.month, locale)} <span>({formatNumber(c.median, locale)})</span></div>);
    let proof;
    if (c.sensor === 'modis') proof = mode === 'raw' ? (fr ? 'MODIS crudo, sin corregir' : 'Raw MODIS, not corrected')
      : (fr ? 'MODIS crudo ' : 'Raw MODIS ') + formatNumber(c.raw, locale) + (factor ? ' × ' + formatDecimal(factor, 2, locale) : '') + ' → ' + formatNumber(c.harmonized, locale);
    else proof = fr ? 'VIIRS, la referencia' : 'VIIRS, the reference';
    (c.notes || []).forEach((t, k) => rows.push(<div key={'n' + k} className="at-tip-meta at-tip-flag">{t}</div>));
    rows.push(<div key="p" className="at-tip-meta">{proof}{c.status === 'partial' ? (fr ? ' · mes en curso' : ' · month in progress') : ''}</div>);
  }
  return (
    <div className={cx('at-tip', left && 'is-left')} role="status" style={Object.assign({ top: top + 'px' }, pos)}>
      <div className="at-tip-title">{cap1(monthYear(c.month, c.year, locale))}</div>
      {rows}
      <div className="at-tip-note">{selectMode ? (c.key === pinned ? 'Mes seleccionado' : viaKey ? 'Enter para elegir este mes' : 'Haga clic para elegir este mes') : c.key === pinned ? (fr ? 'Fijado · Esc para quitar' : 'Pinned · Esc to clear') : viaKey ? (fr ? 'Enter para fijar' : 'Enter to pin') : (fr ? 'Haga clic para fijar' : 'Click to pin')}</div>
    </div>
  );
}

/* ───────────── ZoneMap : la zone en cases de 0,5°, colorées comme le calendrier ───────────── */
// Fond de carte 920 × 332, projection plate : x = 150 + (lon + 79) × 41,85 ; y = 70 + (51,5 − lat) × 62.
const MAP = { W: 920, H: 332, x0: 150, lon0: -79, kx: 272 / 6.5, y0: 70, lat0: 51.5, ky: 62 };
const mx = (lon) => MAP.x0 + (lon - MAP.lon0) * MAP.kx;
const my = (lat) => MAP.y0 + (MAP.lat0 - lat) * MAP.ky;
const DEMO_ZONE = { s: 49.5, n: 51.5, w: -79, e: -72.5, cities: [['Chibougamau', 49.913, -74.371]] };
export function ZoneMap({ src, data, cell, mode = 'harmonized', zone, tiles, preview = false, locale = 'en', palette = 'inferno', place, coords, attribution = 'Basemap: svg-maps (CC BY 4.0)', state }) {
  const d = useMemo(() => data || illustrativeData(), [data]);
  const fr = true /* i18n */;
  const Z = zone || (d.zone ? Object.assign({ cities: d.zone.cities }, d.zone.bbox) : DEMO_ZONE);
  const cols = Math.round((Z.e - Z.w) / 0.5), rows = Math.round((Z.n - Z.s) / 0.5);
  const box = { x: mx(Z.w), y: my(Z.n), w: mx(Z.e) - mx(Z.w), h: my(Z.s) - my(Z.n) };
  const target = cell || { season: true };
  const total = target.season ? d.season.value : mode === 'raw' ? target.raw : target.harmonized;
  const key = target.season ? 'season-' + d.season.year : target.key;
  const field = useMemo(() => tiles || (d.tiles ? zoneTiles(d, target, mode) : zoneField(total, key, cols, rows)), [tiles, d, key, mode, total, cols, rows]);
  const byIJ = {};
  (field || []).forEach((f) => (byIJ[f.i + '-' + f.j] = f.value));
  const cw = box.w / cols, ch = box.h / rows;
  const placeText = place || (d.zone ? (fr ? d.zone.name.fr : d.zone.name.en) : (fr ? 'Québec boréal (zone de démo)' : 'Boreal Québec (demo zone)'));
  const coordsText = coords || (d.zone ? (fr ? d.zone.coords : d.zone.coordsEn) : (fr ? '49,5–51,5° N · 79–72,5° O' : '49.5–51.5° N · 79–72.5° W'));
  // Cadrage : la zone reste entière et centrée quel que soit le format du cadre.
  const viewRef = useRef(null);
  const [size, setSize] = useState({ w: 660, h: 300 });
  useEffect(() => {
    const el = viewRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((es) => { const r = es[0].contentRect; if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const aspect = size.w / size.h;
  const pad = box.w > 400 ? 1.16 : 1.7;
  const needW = box.w * pad, needH = box.h * (box.h > 200 ? 1.12 : 1.75);
  const vbW = aspect >= needW / needH ? needH * aspect : needW;
  const vbH = vbW / aspect;
  const cxz = box.x + box.w / 2, cyz = box.y + box.h / 2;
  let vbX = cxz - vbW / 2;
  if (vbW <= MAP.W) vbX = Math.min(Math.max(vbX, 0), MAP.W - vbW);
  const viewBox = [vbX, cyz - vbH / 2, vbW, vbH].map((x) => x.toFixed(1)).join(' ');
  const k = vbW / size.w; // unités de carte par pixel : les libellés gardent 12 px à l'écran
  const uid = useMemo(() => 'atmap' + Math.random().toString(36).slice(2, 8), []);
  const grid = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) grid.push([i, j]);
  const label = zoneLabel(target, d, locale, mode);
  return (
    <figure className={cx('at-map', state && 'is-' + state)} aria-label={(fr ? 'Carte de la zone : ' : 'Zone map: ') + label}>
      <figcaption className="at-map-head"><b>{placeText}</b><span className="at-mono">{coordsText}</span><span>{fr ? 'tuiles de 0,5°' : '0.5° tiles'}</span></figcaption>
      <div className="at-map-view" ref={viewRef}>
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="at-map-svg" aria-hidden="true">
          <defs>
            <linearGradient id={uid + 'l'} x1="0" x2="1" y1="0" y2="0"><stop offset="0" className="at-map-fade" /><stop offset="1" className="at-map-fade" stopOpacity="0" /></linearGradient>
            <linearGradient id={uid + 'r'} x1="1" x2="0" y1="0" y2="0"><stop offset="0" className="at-map-fade" /><stop offset="1" className="at-map-fade" stopOpacity="0" /></linearGradient>
          </defs>
          {src && <image href={src} x="0" y="0" width={MAP.W} height={MAP.H} preserveAspectRatio="none" />}
          <rect x="0" y="-40" width="40" height="412" fill={'url(#' + uid + 'l)'} />
          <rect x={MAP.W - 40} y="-40" width="40" height="412" fill={'url(#' + uid + 'r)'} />
          {mx(-80.4) - 72 * k > vbX && my(52.15) - 14 * k > cyz - vbH / 2 && <g className="at-map-labels" style={{ fontSize: 12 * k + 'px' }}><text x={mx(-80.4)} y={my(52.15)} textAnchor="end" className="is-water">{fr ? 'Baie James' : 'James Bay'}</text></g>}
          {!state && (
            <g>
              {grid.map(([i, j]) => {
                const val = byIJ[i + '-' + j];
                const k = val != null && val >= 0.5 ? countClass(val, 'log') : null;
                return <rect key={i + '-' + j} x={box.x + i * cw + 0.6} y={box.y + j * ch + 0.6} width={cw - 1.2} height={ch - 1.2} rx="1.5"
                  className={k == null ? 'at-map-empty' : 'at-map-cell'} style={k == null ? null : { fill: paletteVar(palette, Math.max(0, k)) }} />;
              })}
            </g>
          )}
          <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="3" className="at-map-zone" />
          {!state && (Z.cities || []).map(([name, lat, lon]) => (
            <g key={name} className="at-map-city" style={{ fontSize: 12 * k + 'px' }}><circle cx={mx(lon)} cy={my(lat)} r={3 * k} style={{ strokeWidth: 1.5 * k }} /><text x={mx(lon) + 6 * k} y={my(lat) + 4 * k} style={{ strokeWidth: 3 * k }}>{name}</text></g>
          ))}
        </svg>
        {state && <div className="at-map-state" role="status">{state === 'loading' ? (fr ? 'Chargement des tuiles…' : 'Loading tiles…') : state === 'error' ? (fr ? 'Tuiles indisponibles. Le calendrier reste juste.' : 'Tiles unavailable. The calendar is still correct.') : (fr ? 'Aucune détection dans la zone pour cette période.' : 'No detection in the zone for this period.')}</div>}
      </div>
      <div className="at-map-foot"><span className="at-map-period" aria-live="polite">{state ? (state === 'loading' ? (fr ? 'Chargement' : 'Loading') : state === 'error' ? (fr ? 'Erreur' : 'Error') : (fr ? 'Vide' : 'Empty')) : (preview ? (fr ? 'Aperçu · ' : 'Preview · ') : '') + label}</span><span className="at-map-attr"><span>{fr ? 'Mêmes couleurs que le calendrier' : 'Same colours as the calendar'}</span>{d.tiles ? <> · <span>{fr ? 'tuiles d’au moins 2 cellules-jours' : 'tiles with 2+ cell-days'}</span></> : null} · <span>{attribution}</span></span></div>
    </figure>
  );
}

/* ───────────── RecoveryChart : erreur en laissant une année de côté ───────────── */
// Synthétique : un ratio caché est-il retrouvé ? Réel : le ratio prédit-il chaque année du recouvrement ?
export function RecoveryChart({ data, validation, locale = 'en', planted, synthetic }) {
  const d = useMemo(() => (validation ? null : data || illustrativeData()), [data, validation]);
  const fr = true /* i18n */;
  const val = validation || d.validation;
  const syn = synthetic != null ? synthetic : val.synthetic != null ? val.synthetic : d ? d.illustrative !== false : true;
  const pl = planted != null ? planted : val.planted;
  const rows = val.loo;
  const W = 640, H = 200, x0 = 60, x1 = W - 12, y0 = 18, y1 = H - 28;
  const maxAbs = Math.max(0, ...rows.map((r) => Math.abs(r.error)));
  const lim = maxAbs <= 0.2 ? 0.2 : maxAbs <= 0.5 ? 0.5 : 1;
  const sx = (i) => x0 + (i + 0.5) * (x1 - x0) / rows.length;
  const sy = (e) => y0 + (1 - (Math.max(-lim, Math.min(lim, e)) + lim) / (2 * lim)) * (y1 - y0);
  const pctf = (e, sign) => (sign && e > 0 ? '+' : '') + formatDecimal(e * 100, 0, locale) + (fr ? ' %' : '%');
  const f2 = (x) => formatDecimal(x, 2, locale);
  const last = rows.length - 1;
  const bias = val.bias;
  const gap = pl ? Math.abs(val.ratio - pl) / pl : null;
  const pooled = val.method === 'pooled';
  const gapText = gap == null ? '' : (fr ? ' Ratio retrouvé ' + f2(val.ratio) + ' pour ' + f2(pl) + ' caché (' + formatDecimal(gap * 100, 1, locale) + ' % d’écart).' : ' Recovered ' + f2(val.ratio) + ' for a hidden ' + f2(pl) + ' (' + formatDecimal(gap * 100, 1, locale) + '% gap).');
  const biasText = (fr ? 'Biais net : ' + pctf(bias, true) + (Math.abs(bias) < 0.05 ? ', dans le bruit.' : '.') : 'Net bias: ' + pctf(bias, true) + (Math.abs(bias) < 0.05 ? ', within the noise.' : '.')) + gapText;
  const ticks = [-lim, -lim / 2, 0, lim / 2, lim];
  const every = rows.length > 14 ? 2 : 1;
  const excluded = !syn && val.overlap ? val.overlap.filter((r) => !rows.some((x) => x.year === r.year)).map((r) => r.year) : [];
  const caption = syn
    ? (fr ? 'Chaque point : une année laissée de côté, prédite avec le ratio des autres années. ' : 'Each dot: one year left out, predicted with the ratio of the other years. ') + biasText + (fr ? ' Données synthétiques : ce test montre que la méthode retrouve le ratio caché ; il ne valide pas les vraies données.' : ' Synthetic data: this shows the method recovers the hidden ratio; it does not validate the real data.')
    : (fr ? 'Données FIRMS réelles. Chaque point : une année du recouvrement ' + val.years[0] + '–' + val.years[1] + ' où MODIS voit au moins ' + val.minModis + ' cellules-jours, prédite par MODIS × le ratio des autres années, comparée à VIIRS. ' : 'Real FIRMS data. Each dot: one overlap year (' + val.years[0] + '–' + val.years[1] + ') where MODIS sees at least ' + val.minModis + ' cell-days, predicted as MODIS × the ratio of the other years, compared with VIIRS. ') + biasText
      + (excluded.length ? (fr ? ' Années exclues (trop peu de détections MODIS) : ' + excluded.join(', ') + '.' : ' Years left out (too few MODIS detections): ' + excluded.join(', ') + '.') : '');
  return (
    <figure className="at-recovery">
      <div className="at-recovery-head">
        {pl != null && <div><span className="at-recovery-k">{fr ? 'Ratio caché' : 'Hidden ratio'}</span><b>{f2(pl)}</b><span className="at-recovery-ci">{fr ? 'mis dans les données' : 'put into the data'}</span></div>}
        <div><span className="at-recovery-k">{pl != null ? (fr ? 'Ratio retrouvé' : 'Recovered ratio') : (fr ? 'Ratio VIIRS ÷ MODIS' : 'VIIRS ÷ MODIS ratio')}</span><b>{f2(val.ratio)}</b><span className="at-recovery-ci">{(pooled ? (fr ? 'en retirant une année : ' : 'leaving one year out: ') : (fr ? 'moitié des années : ' : 'half the years: ')) + f2(val.ratioLo) + '–' + f2(val.ratioHi)}</span></div>
        <div><span className="at-recovery-k">{fr ? 'Erreur médiane' : 'Median error'}</span><b>{pctf(val.medianAbsError)}</b><span className="at-recovery-ci">max {pctf(val.maxAbsError)}</span></div>
      </div>
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={fr ? 'Erreur de prédiction de chaque année laissée de côté, ' + val.years[0] + ' à ' + val.years[1] : 'Prediction error for each year left out, ' + val.years[0] + ' to ' + val.years[1]}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className={t === 0 ? 'at-rc-zero' : 'at-rc-grid'} />
            <text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{pctf(t, true)}</text>
          </g>
        ))}
        {rows.map((r, i) => (
          <g key={r.year}>
            <line x1={sx(i)} x2={sx(i)} y1={sy(0)} y2={sy(r.error)} className="at-rc-stem" />
            <circle cx={sx(i)} cy={sy(r.error)} r="4" className="at-rc-dot"><title>{r.year + ' : ' + pctf(r.error, true)}</title></circle>
            {(i % every === 0 && !(every === 2 && i === last - 1)) || i === last ? <text x={sx(i)} y={H - 8} textAnchor="middle" className="at-rc-tick">{every === 1 && rows.length > 10 ? '’' + String(r.year).slice(2) : r.year}</text> : null}
          </g>
        ))}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/* ───────────── ProvenanceLine : la source sous chaque visuel ───────────── */
// Statut en toutes lettres (jamais par la couleur) : Réel, Synthétique ou Calculé.
const STATUS = { real: ['Real', 'Real'], synthetic: ['Sintético', 'Synthetic'], computed: ['Calculado', 'Computed'] };
export function ProvenanceLine({ source, products = [], period, status = 'real', locale = 'en', children }) {
  const fr = true /* i18n */;
  const st = STATUS[status] || STATUS.real;
  return (
    <p className="at-prov">
      <span className={cx('at-prov-status', 'is-' + status)}>{fr ? st[0] : st[1]}</span>
      <span className="at-prov-k">{fr ? 'Fuente' : 'Source'}</span>
      <span>{source}</span>
      {products.map((p) => <span key={p} className="at-mono">{p}</span>)}
      {period && <span>{period}</span>}
      {children}
    </p>
  );
}

/* ───────────── SensorFrieze : la chaîne des capteurs, 2000 → 2030 ───────────── */
// MODIS en barre creuse, VIIRS en barre pleine, mission prévue en pointillé : la forme dit le capteur, pas la couleur.
export const SENSOR_CHAIN = [
  { id: 'terra', label: 'Terra MODIS', fam: 'modis', start: 2000.85, res: '1 km' },
  { id: 'aqua', label: 'Aqua MODIS', fam: 'modis', start: 2002.5, res: '1 km' },
  { id: 'snpp', label: 'S-NPP VIIRS', fam: 'viirs', start: 2012.0, end: 2026.84, res: '375 m' },
  { id: 'noaa20', label: 'NOAA-20 VIIRS', fam: 'viirs', start: 2018.25, res: '375 m' },
  { id: 'noaa21', label: 'NOAA-21 VIIRS', fam: 'viirs', start: 2023.17, res: '375 m' },
  { id: 'wfs', label: 'WildFireSat', fam: 'planned', start: 2029, res: '' },
];
export function SensorFrieze({ locale = 'en', from = 2000, to = 2034, now = 2026.87, covered = [2001, 2025], compact = false }) {
  const fr = true /* i18n */;
  const X = (t) => ((t - from) / (to - from)) * 100 + '%';
  const marks = [
    { t: 2012, k: compact ? '2012' : 'MODIS → VIIRS', s: fr ? 'empalme corregido aquí' : 'seam corrected here', a: 'mid', row: 0 },
    { t: 2026.84, k: compact ? (fr ? 'fin S-NPP' : 'S-NPP end') : (fr ? 'Fin de S-NPP' : 'S-NPP ends'), s: fr ? '2 nov. 2026 · próximo empalme' : 'Nov 2, 2026 · next seam', a: 'end', row: compact ? 1 : 0 },
    { t: 2029, k: 'WildFireSat', s: fr ? 'lanzamiento previsto (CSA)' : 'target launch (CSA)', a: compact ? 'end' : 'start', row: 0 },
  ];
  const ticks = compact ? [2000, 2010, 2020, 2030] : [2000, 2005, 2010, 2015, 2020, 2025, 2030];
  return (
    <figure className={cx('at-frieze', compact && 'is-compact')} aria-label={fr ? 'Cadena de sensores de fuego, de 2000 a 2030' : 'Fire sensor chain, 2000 to 2030'}>
      <div className="at-fz-row at-fz-marks" aria-hidden="true">
        <div className="at-fz-label" />
        <div className="at-fz-track">
          <span className="at-fz-covered" style={{ left: X(covered[0]), width: 'calc(' + X(covered[1] + 1) + ' - ' + X(covered[0]) + ')' }}>{fr ? 'FireBridge: ' + covered[0] + '–' + covered[1] : 'FireBridge: ' + covered[0] + '–' + covered[1]}</span>
          {marks.map((m) => <span key={m.t} className={cx('at-fz-mark', 'is-' + m.a, 'row-' + m.row)} style={{ left: X(m.t) }}><b>{m.k}</b>{!compact && <em>{m.s}</em>}</span>)}
        </div>
      </div>
      {SENSOR_CHAIN.map((s) => {
        const open = !s.end && s.fam !== 'planned';
        const end = s.end || (s.fam === 'planned' ? to : now + 1.6);
        return (
          <div key={s.id} className="at-fz-row">
            <div className="at-fz-label">{s.label}{s.res && !compact ? <span className="at-mono">{s.res}</span> : null}</div>
            <div className="at-fz-track">
              {marks.map((m) => <i key={m.t} className="at-fz-rule" style={{ left: X(m.t) }} aria-hidden="true" />)}
              <i className={cx('at-fz-bar', 'is-' + s.fam, s.end && 'has-end', open && 'is-open')} style={{ left: X(s.start), width: 'calc(' + X(end) + ' - ' + X(s.start) + ')' }} />
              <span className="at-sr">{s.label + ': ' + (s.fam === 'planned' ? (fr ? 'lanzamiento previsto en ' : 'target launch ') + s.start : (fr ? 'desde ' : 'since ') + Math.floor(s.start) + (s.end ? (fr ? ', fin el 2 de noviembre de 2026' : ', ended November 2, 2026') : ''))}</span>
            </div>
          </div>
        );
      })}
      <div className="at-fz-row at-fz-axis" aria-hidden="true">
        <div className="at-fz-label" />
        <div className="at-fz-track">{ticks.map((t) => <span key={t} style={{ left: X(t) }}>{t}</span>)}<span className="is-now" style={{ left: X(now) }}>{fr ? 'hoy' : 'now'}</span></div>
      </div>
      <figcaption className="at-fz-key">
        <span><i className="at-fz-bar is-modis" />{fr ? 'MODIS, 1 km' : 'MODIS, 1 km'}</span>
        <span><i className="at-fz-bar is-viirs" />{fr ? 'VIIRS, 375 m' : 'VIIRS, 375 m'}</span>
        <span><i className="at-fz-bar is-planned" />{fr ? 'misión prevista' : 'planned mission'}</span>
      </figcaption>
    </figure>
  );
}

/* ───────────── DateStepper : mois par mois, au clavier comme au doigt ───────────── */
// Flèches à la CWFIS ; cibles de 40 px sur téléphone. Vide = la saison.
export function DateStepper({ data, value, onChange, locale = 'en', size = 'md', emptyLabel }) {
  const d = data;
  const fr = true /* i18n */;
  const keys = d.cells.filter((c) => c.status !== 'future').map((c) => c.key);
  const i = value ? keys.indexOf(value) : -1;
  const go = (k) => onChange && onChange(k);
  const label = value && d.byKey[value] ? cap1(monthYear(d.byKey[value].month, d.byKey[value].year, locale)) : emptyLabel || (fr ? 'Saison ' + d.season.year : d.season.year + ' season');
  const stepTo = (delta) => {
    if (i < 0) return go(d.season.year + '-10'); // depuis la saison : son dernier mois
    const j = Math.max(0, Math.min(keys.length - 1, i + delta));
    go(keys[j]);
  };
  const Btn = ({ delta, path, title, disabled }) => (
    <button type="button" className="at-btn at-btn-icon" title={title} aria-label={title} disabled={disabled} onClick={() => stepTo(delta)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>
    </button>
  );
  return (
    <div className={cx('at-stepper', size === 'lg' && 'is-lg')} role="group" aria-label={fr ? 'Parcourir les mois' : 'Step through months'}>
      <Btn delta={-12} path="M11 17l-5-5 5-5M18 17l-5-5 5-5" title={fr ? 'Année précédente' : 'Previous year'} disabled={i === 0 || (i > -1 && i < 12)} />
      <Btn delta={-1} path="M15 18l-6-6 6-6" title={fr ? 'Mois précédent' : 'Previous month'} disabled={i === 0} />
      <span className="at-stepper-label" aria-live="polite">{label}</span>
      <Btn delta={1} path="M9 6l6 6-6 6" title={fr ? 'Mois suivant' : 'Next month'} disabled={i === keys.length - 1 || i < 0} />
      <Btn delta={12} path="M13 7l5 5-5 5M6 7l5 5-5 5" title={fr ? 'Année suivante' : 'Next year'} disabled={i < 0 || i > keys.length - 13} />
    </div>
  );
}

/* ───────────── OverlapChart : MODIS × ratio contre VIIRS, année par année ───────────── */
export function OverlapChart({ data, locale = 'en' }) {
  const d = data;
  const fr = true /* i18n */;
  const v = d.validation;
  const rows = v.overlap;
  const W = 640, H = 220, x0 = 48, x1 = W - 12, y0 = 14, y1 = H - 30;
  const vals = rows.flatMap((r) => [r.viirs, r.modis * v.ratio]).filter((x) => x > 0);
  const lo = Math.pow(10, Math.floor(Math.log10(Math.max(1, Math.min(...vals))))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...vals))));
  const sy = (x) => y1 - (Math.log10(Math.max(lo, x)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * (y1 - y0);
  const sx = (i) => x0 + (i + 0.5) * (x1 - x0) / rows.length;
  const ticks = [];
  for (let t = lo; t <= hi; t *= 10) ticks.push(t);
  return (
    <figure className="at-overlap">
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={fr ? 'Superposición ' + v.years[0] + '–' + v.years[1] + ': VIIRS medido y MODIS multiplicado por la razón, por año, escala log' : 'Overlap ' + v.years[0] + '–' + v.years[1] + ': measured VIIRS and MODIS times the ratio, per year, log scale'}>
        {ticks.map((t) => (
          <g key={t}><line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className="at-rc-grid" /><text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{formatShort(t, locale)}</text></g>
        ))}
        {rows.map((r, i) => {
          const pred = r.modis * v.ratio;
          return (
            <g key={r.year}>
              <line x1={sx(i)} x2={sx(i)} y1={sy(r.viirs)} y2={sy(pred)} className="at-ov-gap" />
              <circle cx={sx(i)} cy={sy(pred)} r="6" className="at-ov-modis"><title>{r.year + ' MODIS × ' + formatDecimal(v.ratio, 2, locale) + ' : ' + formatNumber(pred, locale)}</title></circle>
              <circle cx={sx(i)} cy={sy(r.viirs)} r="3" className="at-ov-viirs"><title>{r.year + ' VIIRS : ' + formatNumber(r.viirs, locale)}</title></circle>
              {((i % 2 === 0 && i !== rows.length - 2) || i === rows.length - 1) && <text x={sx(i)} y={H - 10} textAnchor="middle" className="at-rc-tick">{r.year}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="at-ov-key">
        <span><i className="at-ov-dot is-viirs" />{fr ? 'VIIRS medido' : 'VIIRS measured'}</span>
        <span><i className="at-ov-dot is-modis" />{fr ? 'MODIS × ' : 'MODIS × '}{formatDecimal(v.ratio, 2, locale)}</span>
        <span>{fr ? 'celdas-día por año, escala log' : 'cell-days per year, log scale'}</span>
      </figcaption>
    </figure>
  );
}

/* ───────────── StepCompare : la hausse après 2012 selon quatre séries ───────────── */
export function StepCompare({ data, locale = 'en' }) {
  const s = data.step;
  const fr = true /* i18n */;
  const rows = [
    { k: 'raw', label: fr ? 'Brut (MODIS puis VIIRS)' : 'Raw (MODIS then VIIRS)', v: s.raw, cls: 'is-raw' },
    { k: 'harmonized', label: fr ? 'Harmonisé (FireBridge)' : 'Harmonized (FireBridge)', v: s.harmonized, cls: 'is-harm' },
    { k: 'aqua', label: fr ? 'Témoin : Aqua seul' : 'Control: Aqua only', v: s.aqua, cls: 'is-ctrl' },
  ];
  const max = Math.max(...rows.map((r) => r.v), 1) * 1.08;
  return (
    <figure className="at-stepcmp">
      {rows.map((r) => (
        <div key={r.k} className={cx('at-sc-row', r.cls)}>
          <span className="at-sc-label">{r.label}</span>
          <span className="at-sc-track"><i style={{ width: (r.v / max) * 100 + '%' }} /><b>{formatStep(r.v, locale)}</b></span>
        </div>
      ))}
      <figcaption>{fr
        ? 'Année moyenne ' + s.after[0] + '–' + s.after[1] + ' ÷ ' + s.before[0] + '–' + s.before[1] + '. Aqua seul ne change pas de capteur en ' + s.year + ' : pas de faux saut. C’est un témoin partiel (Aqua fait partie de MODIS). Avec un ratio estimé sur ' + s.after[0] + '–' + s.after[1] + ', l’harmonisé égale par construction la hausse de MODIS seul' + (s.modisOnly != null ? ' (' + formatStep(s.modisOnly, locale) + ')' : '') + ' : ce n’est pas une validation ; le test est d’enlever une année à la fois. La coche ✓ du témoin apparaît quand l’harmonisé est à moins de 10 % de lui.'
        : 'Mean year ' + s.after[0] + '–' + s.after[1] + ' ÷ ' + s.before[0] + '–' + s.before[1] + '. Aqua alone does not change sensor in ' + s.year + ': no false jump. It is a partial consistency check (Aqua is part of MODIS). With a ratio estimated on ' + s.after[0] + '–' + s.after[1] + ', harmonized equals the MODIS-only rise by construction' + (s.modisOnly != null ? ' (' + formatStep(s.modisOnly, locale) + ')' : '') + ': that is not a validation; the test is leave-one-year-out. The consistency check’s ✓ shows when harmonized is within 10% of it.'}</figcaption>
    </figure>
  );
}

export { illustrativeData, ILLUSTRATIVE_NOTE, zoneField, realData, zoneTiles, recoveryTest, poolRatio, FIRMS_META, FIRMS_ZONES, SENSORS, verdict, modeLine, unitLine, stepTexts, zoneLabel, recordLine, medianPhrase, ratioText, monthRank, bigYears };
export * as scale from './scale.js';
