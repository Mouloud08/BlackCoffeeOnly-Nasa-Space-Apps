// Version 5 Evidence tab: four panels, each headed by a one-line takeaway generated from the numbers.
import { memo, useState } from 'react';
import { Info } from './ui.jsx';
import { LAST, SW, STATS_FROM, cellSummary, versus } from './metrics.js';
import { X, F2, PCT, xr, bootRange, proofHeading, looHeading, recordsHeading, chanceShort, baseRate } from './copy.js';
import { num, PS, MONTHS_SHORT_L } from './l10n.js';
import { RiseBars } from './Verdict.jsx';
import { IndexChart } from './Method.jsx';
import { ErrorStrip } from './Strips.jsx';
import { MonthRow } from './MonthRow.jsx';
import { cx } from './util.jsx';

const P1 = (x) => (x == null ? '—' : Math.round(x * 100) + PS);
const R90 = 'rango del 90' + PS;
const VS = { inside: 'dentro', above: 'por encima', below: 'por debajo' };
// The design-system ProvenanceLine writes its labels in English only; same markup, Spanish labels.
const PROV = { real: 'Real', synthetic: 'Sintético', computed: 'Calculado' };
export function ProvenanceLine({ source, products = [], period, status = 'real', children }) {
  return (
    <p className="at-prov">
      <span className={cx('at-prov-status', 'is-' + status)}>{PROV[status] || PROV.real}</span>
      <span className="at-prov-k">Fuente</span>
      <span>{source}</span>
      {products.map((p) => <span key={p} className="at-mono">{p}</span>)}
      {period && <span>{period}</span>}
      {children}
    </p>
  );
}

// Shares of places with a record since 2012 against their chance ranges (one row per series).
export function ChanceChart({ s, label }) {
  if (!s || !s.n) return <p className="fb-note">Muy pocas celdas para leer récords aquí.</p>;
  const rows = [['Crudo', s.sinceRaw, s.chanceRaw], ['Armonizado', s.sinceHarm, s.chanceHarm], ['Solo MODIS', s.sinceModis, s.chanceModis]];
  return (
    <div className="fb-chance"><div className="fb-chance-plot" role="img" aria-label={label + ': proporción de celdas cuyo año récord es 2012 o posterior, frente al rango que da el azar por sí solo. ' + rows.map(([k, v, c]) => k + ' ' + P1(v) + ', azar ' + P1(c.lo) + ' a ' + P1(c.hi) + ' (' + (VS[versus(v, c)] || versus(v, c)) + ')').join('; ') + '.'}>
      <div className="fb-chance-axis" aria-hidden="true"><span /><span className="fb-chance-ticks">{[0, 25, 50, 75, 100].map((t) => <i key={t} style={{ left: t + '%' }}>{t}{PS}</i>)}</span><span /></div>
      {rows.map(([k, v, c]) => {
        const w = versus(v, c);
        return (
          <div key={k} className="fb-chance-row">
            <span className="fb-chance-k">{k}</span>
            <span className="fb-chance-track">
              <i className="fb-chance-rng" style={{ left: c.lo * 100 + '%', width: (c.hi - c.lo) * 100 + '%' }} />
              <i className={cx('fb-chance-pt', k === 'Crudo' && 'is-raw')} style={{ left: v * 100 + '%' }} />
            </span>
            <span className="fb-chance-v"><b>{P1(v)}</b> {chanceShort(v, c)}</span>
          </div>
        );
      })}
      </div>
      <p className="fb-note">Banda: el azar por sí solo (percentil 5–95, {num(2000)} permutaciones de los años, iguales en cada celda). {baseRate(s)} {num(s.n)} celdas; {s.excludedHigh} no armonizadas (razón local mayor que 4×). Un récord es un año, no una tendencia.</p>
    </div>
  );
}

export const Evidence = memo(function Evidence({ Z, S, official, country, zoneName, reference, sel, onSelect, from, to, fellBack, phone, whole, box }) {
  const [p4r, setP4] = useState('chance');
  if (!Z || Z.empty) return <div className="fb-emptystate is-tab"><p>No hay evidencia para mostrar en esta zona: no tiene detecciones.</p></div>;
  const borrowed = Z.gradeWhy === 'borrowed';
  const s = S ? (whole ? S.summary : cellSummary(S.cells, S, box)) : null;
  const sCountry = S ? S.summary : null;
  const useBox = !whole && s && s.n >= 30;
  const recS = useBox ? s : sCountry;
  // Fourth panel (v6, judge C5): Records, Official (Canada) and By month (both countries, when harmonized).
  const opts4 = [['chance', 'Récords']].concat(official ? [['official', 'Oficial']] : [], Z.harmOK && Z.byMonth ? [['month', 'Mensual']] : []);
  const alt4 = opts4.length > 1;
  const p4 = opts4.some((o) => o[0] === p4r) ? p4r : 'chance';
  return (
    <div className="fb-evgrid">
      <section className="fb-panel fb-evpanel" aria-labelledby="ev1">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev1">{proofHeading(Z, official)}</h2>
          <Info id="fb-ev1-i" label="Acerca de estas barras">
            <p>Detecciones de fuego después de 2012 ÷ antes (año medio 2012–{LAST} ÷ 2003–2011), en una escala logarítmica en torno a 1×{official ? '; la serie oficial es independiente de ambos sensores' : ''}.</p>
            {Z.harmOK && Z.guard && <p>No se da ningún aumento para esta zona: {Z.guard}.</p>}
            {Z.harmOK && Z.trend && !Z.guard && <p>{Z.trend.status === 'robust' ? 'El cambio se mantiene al remuestrear los años (' + R90 + ' ' + bootRange(Z.trend) + ') y sin ' + Z.trend.bigYear + ' (' + xr(Z.trend.without) + ').' : 'La tendencia es incierta: ' + xr(Z.trend.without) + ' sin ' + Z.trend.bigYear + ', ' + R90 + ' ' + bootRange(Z.trend) + '. El factor de corrección (' + F2(Z.ratio) + ') en sí es robusto.'}</p>}
            <p>Aqua, por sí solo, no cambia de sensor en 2012: es una verificación de coherencia, no es una validación.</p>
          </Info></div>
        <div className="fb-evfill"><RiseBars Z={Z} official={official} big={!phone} /></div>
        {Z.harmOK && Z.guard && <p className="fb-evnote">No se da ningún aumento para esta zona: {Z.guard}.</p>}
        {Z.harmOK && Z.trend && !Z.guard && <p className="fb-evnote">{Z.trend.status === 'robust' ? 'Sin ' + Z.trend.bigYear + ', su año récord: ' + xr(Z.trend.without) + '.' : 'Tendencia incierta: ' + xr(Z.trend.without) + ' sin ' + Z.trend.bigYear + ', ' + R90 + ' ' + bootRange(Z.trend) + '; el factor de corrección en sí es robusto.'}</p>}
        <ProvenanceLine status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'2003–' + LAST}>
          {!reference && <span>conteos no verificados aquí contra los focos de calor FIRMS originales (sí en las tres zonas de referencia de Quebec)</span>}
        </ProvenanceLine>
      </section>
      <section className="fb-panel fb-evpanel" aria-labelledby="ev2">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev2">{looHeading(Z)}</h2>
          <Info id="fb-ev2-i" label="Acerca de esta prueba"><p>Cada año de superposición utilizable se deja fuera y se predice con los demás: MODIS de ese año × el factor de corrección de los otros años, frente a lo que midió VIIRS{borrowed ? ' (área más amplia: el factor es prestado)' : ''}. Celdas-día por año, escala logarítmica; la etiqueta es el error de la predicción.</p></Info></div>
        <div className="fb-evfill"><ErrorStrip Z={Z} /></div>
        {Z.loo && Z.loo.length > 0 && <p className="fb-evnote">Error mediano {PCT(Z.medErr)}{Z.holdout ? ' · factor de 2012–2018 probado en 2019–' + LAST + ': ' + PCT(Z.holdout.medErr) : ''}{Z.monthly ? ' · mes a mes (' + Z.monthly.n + ' meses, cada uno con 30 o más detecciones de fuego en ambos registros): ' + PCT(Z.monthly.medErr) : ''}.</p>}
        <ProvenanceLine status="computed" source="NASA FIRMS" period={SW + '–' + LAST} />
      </section>
      <MonthRow cls="fb-panel fb-evpanel fb-evmonth" phone={phone} fellBack={fellBack} Z={Z} sel={sel} onSelect={onSelect} from={from} to={to} />
      <section className="fb-panel fb-evpanel" aria-labelledby="ev4">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev4">{p4 === 'chance' ? recordsHeading(recS, versus) : p4 === 'official' ? 'Año por año frente al área quemada oficial' : 'El factor de corrección por mes'}</h2>
          {alt4 && <div className="fb-seg2 is-sm" role="radiogroup" aria-label="Cuarto panel">{opts4.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={p4 === v} className={cx('fb-seg2-i', p4 === v && 'is-on')} onClick={() => setP4(v)}>{l}</button>)}</div>}
        </div>
        {p4 === 'chance' ? (
          <>
            <p className="fb-evsub">Celdas cuyo año récord es 2012 o posterior, {useBox ? 'en esta zona (' + recS.n + ' celdas)' : (country === 'canada' ? 'Canadá' : 'Argentina') + (whole || !s ? '' : ' (esta zona tiene ' + (s ? s.n : 0) + ' celdas: muy pocas)')}, {STATS_FROM}–{LAST}.</p>
            <div className="fb-evfill"><ChanceChart s={recS} label={useBox ? zoneName : (country === 'canada' ? 'Canadá' : 'Argentina')} /></div>
          </>
        ) : p4 === 'official' ? (
          <div className="fb-evfill"><IndexChart off={official} /></div>
        ) : (
          <div className="fb-evfill">
            <p className="fb-evsub">VIIRS ÷ MODIS para cada mes del año, frente al factor único {F2(Z.ratio)} usado para todos los meses.</p>
            <div className="fb-bmstrip" role="img" aria-label={'VIIRS ÷ MODIS por mes del año: ' + Z.byMonth.map((x) => MONTHS_SHORT_L[x.m] + ' ' + (x.ratio == null ? 'sin datos' : F2(x.ratio))).join('; ')}>
              {Z.byMonth.map((x) => <span key={x.m} className={cx(!x.active && 'is-quiet', x.active && x.resid != null && (x.resid > 1.3 || x.resid < 1 / 1.3) && 'is-off')}><b>{['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][x.m]}</b>{x.ratio == null ? '—' : F2(x.ratio)}</span>)}
            </div>
            <p className="fb-note">Exacto en los totales anuales por construcción; los meses contorneados se apartan del factor único en más de 1,3×. Gris: muy pocas detecciones.</p>
          </div>
        )}
      </section>
    </div>
  );
});
