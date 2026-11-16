// Version 6 landing tab: the problem, the answer and the real data in one screen; one primary action (Open the dashboard).
// Every figure comes from the metrics of the whole selected country (the same Z the Dashboard uses for that preset).
import { memo, useEffect, useRef, useState } from 'react';
import { LAST, FIRST, SW, STATS_FROM } from './metrics.js';
import { X, F2, NUM, xr, bootRange, overviewHeadline, ratioWords } from './copy.js';
import { endLabelL, tm, PS } from './l10n.js';
import { cx, Icon, IC, reduced } from './util.jsx';

const NAME = { canada: 'Canadá', argentina: 'Argentina' };
const ALL = { canada: 'All of Canada', argentina: 'All of Argentina' }; // metrics.js preset labels, translated by tm()
// Axis ticks (was formatShort(t, 'en')): 1000 → '1k', 2500 → '2,5k' (decimal comma).
const formatShort = (v) => (v >= 1000 ? String(v / 1000).replace('.', ',') + 'k' : String(v));
const R90 = 'rango del 90' + PS;

// Annual bars 2001..LAST on a linear scale (the gap between the raw and harmonized 2003–2011 levels is a factor of
// ~2: a log scale would compress it). Harmonized solid; raw as a hollow outline where it differs (MODIS years, before
// 2012); from 2012 both records are the same VIIRS measurement. Raw view: raw solid, harmonized outline.
function OverviewChart({ Z, raw, country, animate, phone }) {
  const years = []; for (let y = FIRST; y <= LAST; y++) years.push(y);
  const vH = years.map((y) => Z.annHarm(y)), vR = years.map((y) => Z.annRaw(y));
  const top = Math.max(...vH, ...vR) * 1.08;
  const step = Math.pow(10, Math.floor(Math.log10(top / 4))), nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => top / s <= 5) || step * 10;
  const ticks = []; for (let t = 0; t <= top; t += nice) ticks.push(t);
  const P = (v) => (v / top) * 100;
  const n = years.length, col = (i) => (i / n) * 100, cw = 100 / n;
  const L = Z.levels, solid = raw ? 'raw' : 'harmonized';
  const seamX = col(SW - FIRST);
  const label = NAME[country] + ', actividad de fuego por año, ' + STATS_FROM + '–' + LAST + ' (celdas-día con focos de calor detectados). Media por año 2003–2011: ' + NUM(L.harmonized.before) + ' armonizada, ' + NUM(L.raw.before) + ' cruda; 2012–' + LAST + ': ' + NUM(L.harmonized.after) + '. Cambio: armonizado ' + X(Z.riseH) + ', crudo ' + X(Z.riseRaw) + '; la razón entre sensores es ' + F2(Z.ratio) + '.';
  return (
    <figure className={cx('fb-ov-chart', animate && 'is-anim', raw && 'is-raw')} role="img" aria-label={label}>
      <div className="fb-ov-plot">
        <div className="fb-ov-y" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ bottom: P(t) + '%' }}>{t ? formatShort(t) : '0'}</span>)}</div>
        <div className="fb-ov-area" aria-hidden="true">
          {ticks.map((t) => <i key={t} className="fb-ov-grid" style={{ bottom: P(t) + '%' }} />)}
          {years.map((y, i) => {
            const s = raw ? vR[i] : vH[i], o = raw ? vH[i] : vR[i];
            const differs = y < SW || (y === SW);
            return (
              <span key={y} className={cx('fb-ov-col', y < STATS_FROM && 'is-era', y >= SW && 'is-viirs')} style={{ left: col(i) + '%', width: cw + '%' }}>
                <i className="fb-ov-bar" style={{ height: P(s) + '%', animationDelay: (i * 8) + 'ms' }} />
                {differs && Math.abs(o - s) / Math.max(1, s) > 0.02 && <i className="fb-ov-ghost" style={{ height: P(o) + '%' }} />}
              </span>
            );
          })}
          <i className="fb-ov-seam" style={{ left: seamX + '%' }}><em>cambio de satélite</em></i>
          <i className="fb-ov-level is-before" style={{ left: col(STATS_FROM - FIRST) + '%', width: (seamX - col(STATS_FROM - FIRST)) + '%', bottom: P(L[solid].before) + '%' }}><em>{NUM(L[solid].before)}</em></i>
          <i className="fb-ov-level is-ghost" style={{ left: col(STATS_FROM - FIRST) + '%', width: (seamX - col(STATS_FROM - FIRST)) + '%', bottom: P(L[raw ? 'harmonized' : 'raw'].before) + '%' }}><em>{raw ? 'armonizado ' : 'crudo '}{NUM(L[raw ? 'harmonized' : 'raw'].before)}</em></i>
          <i className="fb-ov-level is-after" style={{ left: seamX + '%', width: (100 - seamX) + '%', bottom: P(L[solid].after) + '%' }}><em>{NUM(L[solid].after)}</em></i>
        </div>
      </div>
      <div className="fb-ov-x" aria-hidden="true"><span />{(phone ? [FIRST, SW, LAST] : [FIRST, 2005, SW, 2018, LAST]).map((y) => <span key={y} style={{ left: (col(y - FIRST) + cw / 2) + '%' }}>{y}</span>)}</div>
    </figure>
  );
}

// Two labels in one grid cell (only the one for the current state visible): the key keeps its width when the view
// changes, so a click on the raw button never re-wraps the row under the chart.
const Two = ({ on, a, b }) => <span className="fb-ov-holdlab is-l"><span className={cx(!on && 'is-on')}>{a}</span><span className={cx(on && 'is-on')}>{b}</span></span>;

// The raw-record button behaves like the top-bar Raw/Harmonized switch: a short press (click, tap, Enter or Space)
// switches the record shown everywhere; a press held 260 ms or more from the harmonized record only peeks at the raw
// one while held (mouse, pen, keyboard; touch toggles). Both labels sit in one grid cell, so the width never changes.
function RawButton({ raw, peek, phone, onPeek, onToggleView }) {
  const viewRaw = raw && !peek; // the raw record chosen (not a peek)
  const down = useRef(false), t0 = useRef(0); // t0: start of a press that peeks (0: a press that does not peek)
  const start = (canPeek) => { down.current = true; t0.current = 0; if (canPeek && !viewRaw) { t0.current = performance.now(); onPeek(true); } };
  const finish = (cancel) => {
    if (!down.current) return;
    down.current = false;
    const t = t0.current; t0.current = 0;
    if (t) { if (!cancel && performance.now() - t < 260) onToggleView(); onPeek(false); } // same order as the top-bar switch
    else if (!cancel) onToggleView();
  };
  useEffect(() => { const b = () => finish(true); window.addEventListener('blur', b); return () => window.removeEventListener('blur', b); });
  // Short desktop labels: a longer button pushed the chart key onto a second row in one state only (a layout shift).
  const labels = phone ? ['Toque para ver el registro crudo', 'Toque para volver al armonizado'] : ['Ver el registro crudo', 'Volver al armonizado'];
  return (
    <button type="button" className="fb-ov-holdbtn" aria-pressed={raw} title={phone ? undefined : viewRaw ? 'Haga clic para volver al registro armonizado (o presione H)' : 'Haga clic para pasar al registro crudo; manténgalo presionado para verlo un momento (o mantenga R)'}
      onPointerDown={(e) => { if (e.button !== 0) return; if (e.pointerType !== 'touch') e.currentTarget.setPointerCapture(e.pointerId); start(e.pointerType !== 'touch'); }}
      onPointerUp={() => finish(false)} onPointerCancel={() => finish(true)} onLostPointerCapture={() => finish(true)}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(true); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); finish(false); } }}>
      <Icon d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <span className="fb-ov-holdlab">{labels.map((l, i) => <span key={i} className={cx((i === 1) === viewRaw && 'is-on')}>{l}</span>)}</span>
    </button>
  );
}

export const Overview = memo(function Overview({ Z, country, official, raw, peek, onCountry, onPeek, onToggleView, onOpen, onHow, onMethod, phone }) {
  // Load animation: once per mount, never under reduced motion or anim=0.
  const [anim, setAnim] = useState(() => !reduced());
  useEffect(() => { const t = setTimeout(() => setAnim(false), 900); return () => clearTimeout(t); }, []);
  const name = NAME[country];
  if (!Z) return <div className="fb-ov is-skel" aria-hidden="true"><div className="fb-ov-chart" /></div>;
  const head = overviewHeadline(name, Z.riseH, Z.riseRaw);
  const T = Z.trend;
  return (
    <div className="fb-ov">
      <div className="fb-ov-top">
        <p className="fb-ov-eyebrow">Satélites de fuego de la NASA · el cambio de 2012</p>
        <div className="fb-seg2 fb-ov-country" role="radiogroup" aria-label="País">
          {['canada', 'argentina'].map((c) => <button key={c} type="button" role="radio" aria-checked={country === c} className={cx('fb-seg2-i', country === c && 'is-on')} onClick={() => onCountry(c)}>{tm(ALL[c])}</button>)}
        </div>
      </div>
      {/* v6.1: on the phone the figures and the primary button come before the chart (visible without scrolling at
          390×844 and 360×740); the lede and the honest line follow the chart. Desktop order unchanged. */}
      {phone ? <>
      <div className="fb-ov-head">
        <div>
          <h1 className="fb-ov-h">{head.text}</h1>
          <p className="fb-ov-sub">Año promedio 2012–{LAST} vs. 2003–2011, contando cuadrados de 1 km con fuego, día por día.</p>
        </div>
      </div>
      <div className="fb-ov-figs" key={'f-' + country}>
        <dl className="fb-ov-pair">
          <div><dt>armonizado <span className="fb-ov-gl">(ambos en la misma escala)</span></dt><dd className="fb-ov-v">{X(Z.riseH)}</dd><dd className="fb-ov-s" title={T && T.lo != null ? 'Rango del 90' + PS + ': dónde cae el resultado cuando los años se remuestrean al azar; cuanto más amplio, menos seguro.' : undefined}>{T && T.lo != null ? R90 + ' ' + bootRange(T) + ' · ' + xr(T.without) + ' sin ' + T.bigYear + (phone ? '' : ', su año récord') : ''}</dd></div>
          <div><dt>crudo</dt><dd className="fb-ov-v is-raw">{X(Z.riseRaw)}</dd><dd className="fb-ov-s">los dos registros simplemente unidos</dd></div>
        </dl>
        <p className="fb-ov-check">{official
          ? <><b>Verificación independiente</b> · área quemada oficial {official.after[0]}–{official.after[1]}: <b>{X(official.rise)}</b> (nuestro cálculo en los mismos años: {X(official.harm)}) · otra magnitud</>
          : <>No hay una serie oficial independiente para {name}: este resultado se apoya solo en el registro MODIS.</>}</p>
      </div>
      <div className="fb-ov-act">
        <button type="button" className="fb-ov-open" onClick={onOpen}>Abrir el calendario y el mapa<Icon d={IC.arrow} /></button>
        <button type="button" className="at-link" onClick={onHow}>Cómo funciona</button>
        <button type="button" className="at-link" onClick={onMethod}>Método</button>
      </div>
      {/* keyed by country (v6, CLS): a country change replaces the bars and figures instead of moving them */}
      <OverviewChart key={'c-' + country} Z={Z} raw={raw} country={country} animate={anim} phone={phone} />
      <div className="fb-ov-hold">
        <RawButton raw={raw} peek={peek} phone={phone} onPeek={onPeek} onToggleView={onToggleView} />
        {phone ? <span className="fb-muted" /> : <span className="fb-muted fb-ov-holdlab"><span className={cx(!(raw && !peek) && 'is-on')}>o mantenga R</span><span className={cx(raw && !peek && 'is-on')}>o presione H</span></span>}
        <div className="fb-ov-key" aria-hidden="true">
      <span><i className="fb-ov-k is-solid" /><Two on={raw} a="registro armonizado" b="registro crudo (visible)" /></span>
      <span><i className="fb-ov-k is-ghost" /><Two on={raw} a="crudo, antes de 2012" b="armonizado, antes de 2012" /></span>
      <span title="Enero de 2012 es un mes parcial de VIIRS: el registro armonizado lo calcula con MODIS, por eso su media después de 2012 difiere un poco de la del registro crudo."><i className="fb-ov-k is-level" />media por año</span>
      {phone && <span><i className="fb-ov-k is-level is-dash" /><Two on={raw} a="media cruda, antes de 2012" b="media armonizada, antes de 2012" /></span>}
      <span className="fb-muted">detecciones de fuego por año</span>
        </div>
      </div>
      <div className="fb-ov-head is-lede">
        <div>
          <p className="fb-ov-lede">Desde 2012, la NASA observa los fuegos con un segundo sensor, más nítido: VIIRS, que ve {ratioWords(Z.ratio)} detecciones de fuego que MODIS. Los dos vuelan juntos desde entonces, así que FireBridge mide la diferencia y la corrige.</p>
          <p className="fb-ov-honest">La corrección importa mes a mes (calendario, posiciones) y cuando MODIS deje de volar. Para esta cifra de antes y después, solo MODIS da la misma respuesta, por construcción.</p>
        </div>
      </div>
      <div className="fb-ov-act is-foot">
        <p className="fb-ov-foot fb-def">Actividad de fuego = celdas-día con focos de calor detectados (celdas de 1 km con fuego, por día), no área quemada · NASA FIRMS MODIS C6.1 y VIIRS 375 m, de 2001 a {endLabelL()} · Funciona sin conexión: ningún dato sale de esta página · BlackCoffeeOnly · NASA Space Apps Challenge 2026</p>
      </div>
      </> : <>
      <div className="fb-ov-head">
        <div>
          <h1 className="fb-ov-h">{head.text}</h1>
          <p className="fb-ov-sub">Año promedio 2012–{LAST} vs. 2003–2011, contando cuadrados de 1 km con fuego, día por día.</p>
        </div>
        <div>
          <p className="fb-ov-lede">Desde 2012, la NASA observa los fuegos con un segundo sensor, más nítido: VIIRS, que ve {ratioWords(Z.ratio)} detecciones de fuego que MODIS. Los dos vuelan juntos desde entonces, así que FireBridge mide la diferencia y la corrige.</p>
          <p className="fb-ov-honest">La corrección importa mes a mes (calendario, posiciones) y cuando MODIS deje de volar. Para esta cifra de antes y después, solo MODIS da la misma respuesta, por construcción.</p>
        </div>
      </div>
      {/* keyed by country (v6, CLS): a country change replaces the bars and figures instead of moving them */}
      <OverviewChart key={'c-' + country} Z={Z} raw={raw} country={country} animate={anim} phone={phone} />
      <div className="fb-ov-hold">
        <RawButton raw={raw} peek={peek} phone={phone} onPeek={onPeek} onToggleView={onToggleView} />
        {phone ? <span className="fb-muted" /> : <span className="fb-muted fb-ov-holdlab"><span className={cx(!(raw && !peek) && 'is-on')}>o mantenga R</span><span className={cx(raw && !peek && 'is-on')}>o presione H</span></span>}
        <div className="fb-ov-key" aria-hidden="true">
      <span><i className="fb-ov-k is-solid" /><Two on={raw} a="registro armonizado" b="registro crudo (visible)" /></span>
      <span><i className="fb-ov-k is-ghost" /><Two on={raw} a="crudo, antes de 2012" b="armonizado, antes de 2012" /></span>
      <span title="Enero de 2012 es un mes parcial de VIIRS: el registro armonizado lo calcula con MODIS, por eso su media después de 2012 difiere un poco de la del registro crudo."><i className="fb-ov-k is-level" />media por año</span>
      {phone && <span><i className="fb-ov-k is-level is-dash" /><Two on={raw} a="media cruda, antes de 2012" b="media armonizada, antes de 2012" /></span>}
      <span className="fb-muted">detecciones de fuego por año</span>
        </div>
      </div>
      <div className="fb-ov-figs" key={'f-' + country}>
        <dl className="fb-ov-pair">
          <div><dt>armonizado <span className="fb-ov-gl">(ambos en la misma escala)</span></dt><dd className="fb-ov-v">{X(Z.riseH)}</dd><dd className="fb-ov-s" title={T && T.lo != null ? 'Rango del 90' + PS + ': dónde cae el resultado cuando los años se remuestrean al azar; cuanto más amplio, menos seguro.' : undefined}>{T && T.lo != null ? R90 + ' ' + bootRange(T) + ' · ' + xr(T.without) + ' sin ' + T.bigYear + (phone ? '' : ', su año récord') : ''}</dd></div>
          <div><dt>crudo</dt><dd className="fb-ov-v is-raw">{X(Z.riseRaw)}</dd><dd className="fb-ov-s">los dos registros simplemente unidos</dd></div>
        </dl>
        <p className="fb-ov-check">{official
          ? <><b>Verificación independiente</b> · área quemada oficial {official.after[0]}–{official.after[1]}: <b>{X(official.rise)}</b> (nuestro cálculo en los mismos años: {X(official.harm)}) · otra magnitud</>
          : <>No hay una serie oficial independiente para {name}: este resultado se apoya solo en el registro MODIS.</>}</p>
      </div>
      <div className="fb-ov-act">
        <button type="button" className="fb-ov-open" onClick={onOpen}>Abrir el calendario y el mapa<Icon d={IC.arrow} /></button>
        <button type="button" className="at-link" onClick={onHow}>Cómo funciona</button>
        <button type="button" className="at-link" onClick={onMethod}>Método</button>
        <p className="fb-ov-foot fb-def">Actividad de fuego = celdas-día con focos de calor detectados (celdas de 1 km con fuego, por día), no área quemada · NASA FIRMS MODIS C6.1 y VIIRS 375 m, de 2001 a {endLabelL()} · Funciona sin conexión: ningún dato sale de esta página · BlackCoffeeOnly · NASA Space Apps Challenge 2026</p>
      </div>
      </>}
    </div>
  );
});
