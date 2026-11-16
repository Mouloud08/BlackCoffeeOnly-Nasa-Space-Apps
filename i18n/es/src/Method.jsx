import { useRef, useState, useEffect } from 'react';
// Method, checks and limits (SPEC §9.2) and the data sources.
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { RatioStrip } from './Strips.jsx';
import { GRADE_RULES, BORROW, MIN_MODIS, CELL, STATS_FROM, ratioPercentiles, flipCounts, versus, SW, LAST, CAL_LAST, END_KEY, PARTIAL, partialLabel, endLabel } from './metrics.js';
import { F2, PCT, SPCT, NUM, X, gradeRule, boxText, quietYears, bootRange, corrFactor, chanceRange } from './copy.js';
import { num, dec, PS, cap, tm, MONTHS_SHORT_L, endLabelL, partialLabelL } from './l10n.js';
import { cx, Icon, IC } from './util.jsx';

// Country name for display (App passes the English key name; the comparisons below keep using it).
const ctyEs = (n) => (n === 'Canada' ? 'Canadá' : n);

export function LooChart({ Z }) {
  const rows = Z.loo;
  const W = 640, H = 260, x0 = 52, x1 = W - 14, y0 = 30, y1 = H - 30;
  const vals = rows.flatMap((r) => [r.viirs, r.predicted]).filter((x) => x > 0);
  const lo = Math.pow(10, Math.floor(Math.log10(Math.max(1, Math.min(...vals))))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...vals) * 1.02)));
  const sy = (x) => y1 - ((Math.log10(Math.max(lo, x)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (y1 - y0);
  const sx = (i) => x0 + ((i + 0.5) * (x1 - x0)) / rows.length;
  const ticks = []; for (let t = lo; t <= hi; t *= 10) ticks.push(t);
  const sgn = (e) => SPCT(e);
  return (
    <figure className="fb-loo">
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Cada año de superposición utilizable, predicho a partir de los demás años (círculo vacío), frente al valor VIIRS medido (punto relleno), escala logarítmica. Error mediano ' + PCT(Z.medErr) + '.'}>
        {ticks.map((t) => <g key={t}><line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className="at-rc-grid" /><text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{t >= 1000 ? num(t / 1000) + 'k' : num(t)}</text></g>)}
        {rows.map((r, i) => (
          <g key={r.year}>
            <line x1={sx(i)} x2={sx(i)} y1={sy(r.viirs)} y2={sy(r.predicted)} className="fb-loo-gap" />
            <circle cx={sx(i)} cy={sy(r.predicted)} r="6" className="fb-loo-pred"><title>{r.year + ', predicho: ' + NUM(r.predicted) + ' (MODIS ' + NUM(r.modis) + ' × ' + F2(r.ratio) + ')'}</title></circle>
            <circle cx={sx(i)} cy={sy(r.viirs)} r="3.5" className="fb-loo-meas"><title>{r.year + ', VIIRS medido: ' + NUM(r.viirs)}</title></circle>
            <text x={sx(i)} y={Math.min(sy(r.viirs), sy(r.predicted)) - 11} textAnchor="middle" className="at-rc-tick fb-loo-err">{sgn(r.signed)}</text>
            {(rows.length <= 10 || i % 2 === 0 || i === rows.length - 1) && <text x={sx(i)} y={H - 8} textAnchor="middle" className="at-rc-tick">{rows.length > 10 ? '’' + String(r.year).slice(2) : r.year}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="fb-loo-key">
        <span><i className="fb-dot is-pred" />predicho: MODIS × la razón de los demás años</span>
        <span><i className="fb-dot is-meas" />VIIRS medido</span>
        <span>celdas-día por año, escala logarítmica; etiqueta: error de la predicción</span>
      </figcaption>
    </figure>
  );
}

// Official area burned and our cell-days, each indexed to its own 2003–2011 mean (dimensionless, one log axis).
export function IndexChart({ off }) {
  const W = 640, H = 250, x0 = 46, x1 = W - 14, y0 = 16, y1 = H - 30;
  const ys = off.years, n = ys.length;
  const mb = (k) => ys.filter((r) => r.year <= 2011).reduce((s, r) => s + r[k], 0) / 9;
  const S = { area: mb('area'), raw: mb('raw'), harm: mb('harm') };
  const v = (r, k) => r[k] / S[k];
  const all = ys.flatMap((r) => [v(r, 'area'), v(r, 'raw'), v(r, 'harm')]).filter((x) => x > 0);
  const lo = Math.pow(10, Math.floor(Math.log10(Math.min(...all)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...all))));
  const sy = (x) => y1 - ((Math.log10(Math.max(lo, x)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (y1 - y0);
  const sx = (i) => x0 + ((i + 0.5) * (x1 - x0)) / n;
  const line = (k) => ys.map((r, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v(r, k)).toFixed(1)).join('');
  const ticks = []; for (let t = lo; t <= hi * 1.001; t *= 10) ticks.push(t);
  const seam = sx(ys.findIndex((r) => r.year === 2012)) - (x1 - x0) / n / 2;
  return (
    <figure className="fb-loo">
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Canadá, 2003–' + off.after[1] + ': área quemada oficial y nuestras celdas-día, cada serie dividida por su media de 2003–2011, escala logarítmica. Después de 2012 la serie armonizada sigue a la oficial; la serie cruda queda alrededor del doble más arriba.'}>
        {ticks.map((t) => <g key={t}><line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className="at-rc-grid" /><text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{t >= 1 ? dec(t, 0) : dec(t, 1)}×</text></g>)}
        <line x1={seam} x2={seam} y1={y0} y2={y1} className="fb-ix-seam" />
        <path d={line('raw')} className="fb-ix-raw" />
        <path d={line('harm')} className="fb-ix-harm" />
        <path d={line('area')} className="fb-ix-area" />
        {ys.map((r, i) => <circle key={r.year} cx={sx(i)} cy={sy(v(r, 'area'))} r="3.5" className="fb-ix-dot"><title>{r.year + ': ' + NUM(r.area) + ' km² quemados'}</title></circle>)}
        {ys.map((r, i) => ((i % 3 === 0 || i === n - 1) ? <text key={r.year} x={sx(i)} y={H - 8} textAnchor="middle" className="at-rc-tick">{r.year}</text> : null))}
      </svg>
      <figcaption className="fb-loo-key">
        <span><i className="fb-ix-k is-area" />área quemada oficial (NFD)</span>
        <span><i className="fb-ix-k is-harm" />celdas-día, armonizadas</span>
        <span><i className="fb-ix-k is-raw" />celdas-día, crudas</span>
        <span>cada serie ÷ su propia media de 2003–2011, escala logarítmica</span>
        {off.rho && <span className="fb-ix-rho" title={'Correlación de rangos de Spearman con el área quemada oficial, ' + off.rho.from + '–' + off.rho.to + ', n = ' + off.rho.n}>¿Los años quedan en el mismo orden que en el área quemada oficial? Armonizado {dec(off.rho.harm, 2)}, crudo {dec(off.rho.raw, 2)}, en una escala donde 1 es perfecto ({off.rho.from}–{off.rho.to}, {off.rho.n} años). Mide el orden de los años, no su nivel.</span>}
      </figcaption>
    </figure>
  );
}

const TOC = [['m-how', 'Cómo se calcula'], ['m-robust', 'Lo que es robusto'], ['m-limits', 'Límites'], ['m-bymonth', 'La razón por mes'], ['m-map', 'Lo que muestra el mapa'], ['m-faq', 'Preguntas que hará un experto'], ['m-data', 'Datos'], ['m-refs', 'Referencias'], ['m-about', 'Acerca de y créditos']];
export function Method({ cells, floors, country, phone, Z, zoneName, reference, showOverlap, cdValidation, official, wholeZ, countryName, ratioRange, onEvidence }) {
  const G = GRADE_RULES;
  const docRef = useRef(null);
  const [cur, setCur] = useState(TOC[0][0]);
  useEffect(() => {
    const doc = docRef.current; if (!doc) return undefined;
    const sc = doc.closest('.fb-tabarea') || window;
    const on = () => {
      const top = (sc === window ? 0 : sc.getBoundingClientRect().top) + 80;
      let id = TOC[0][0];
      for (const [k] of TOC) { const el = document.getElementById(k); if (el && el.getBoundingClientRect().top <= top) id = k; }
      setCur(id);
    };
    sc.addEventListener('scroll', on, { passive: true }); on();
    return () => sc.removeEventListener('scroll', on);
  }, []);
  const borrowed = Z && Z.gradeWhy === 'borrowed';
  const q = Z ? quietYears(Z) : null;
  const T = Z && Z.trend;
  const cty = ctyEs(countryName);
  const grades = [
    { g: 'A', rule: 'razón propia; ' + G.A.years + '+ años de superposición utilizables; error mediano ≤ ' + PCT(G.A.err) + '; rango de la razón dejando un año fuera ≤ ' + PCT(G.A.spread) + ' de la razón.' },
    { g: 'B', rule: 'razón propia con ' + G.B.years + '+ años utilizables, error ≤ ' + PCT(G.B.err) + ', rango ≤ ' + PCT(G.B.spread) + '; o una razón prestada de un área más amplia que cumple A o B.' },
    { g: 'C', rule: 'en los demás casos. No se muestra ningún número armonizado; solo crudo.' },
  ];
  const r1220 = wholeZ ? (() => { let v = 0, m = 0; wholeZ.own.overlap.filter((o) => o.year <= 2020).forEach((o) => { v += o.viirs; m += o.modis; }); return m > 0 ? v / m : null; })() : null;
  const gaps = wholeZ ? wholeZ.gaps : [];
  // Scroll-spy: the section list highlights the section at the top of the reading area.
  return (
    <article className="fb-doc" aria-labelledby="fb-method-t" ref={docRef}>
      <nav className="fb-doc-toc" aria-label="Secciones del método">
        <h1 className="fb-doc-title" id="fb-method-t">Método</h1>
        <ol>{TOC.map(([id, t]) => <li key={id}><a href={'#' + id} className={cx(cur === id && 'is-cur')} aria-current={cur === id ? 'location' : undefined} onClick={(e) => { e.preventDefault(); const el = document.getElementById(id); el && el.scrollIntoView({ block: 'start' }); }}>{t}</a></li>)}</ol>
      </nav>
      <div className="fb-doc-body">
        <section className="fb-doc-sec" id="m-how" aria-labelledby="m-how-h">
          <h2 className="fb-doc-h" id="m-how-h">Cómo se calcula</h2>

          <ol className="fb-steps-list">
            <li>Contamos <b>celdas-día</b>: una celda de ~1 km con al menos una detección de fuego de vegetación en un día dado, sumadas por mes sobre las teselas de 0,5° que quedan dentro de la zona.</li>
            <li>En los {LAST - SW + 1} años de superposición ({SW}–{LAST}) calculamos una razón agregada: <span className="at-mono">razón = ΣVIIRS ÷ ΣMODIS</span>.</li>
            <li>Multiplicamos por esa razón cada mes MODIS anterior a 2012; los meses VIIRS quedan tal como se midieron. El cambio compara el año promedio de 2012–{LAST} con el de 2003–2011{PARTIAL ? ' (' + partialLabelL() + ': se muestra, pero no entra en las estadísticas anuales)' : ''}.</li>
            <li>Ponemos a prueba la corrección: cada año utilizable se deja fuera y se predice a partir de los demás; una razón estimada con 2012–2018 predice 2019–{LAST}; y se comparan los meses uno por uno.</li>
          </ol>

          {Z && Z.harmOK && (
            <div className="fb-method-ov">
              <h3 className="fb-h3">Ambos sensores en la superposición · razón agregada {F2(Z.ratio)}</h3>
              <RatioStrip Z={Z} />
            </div>
          )}
        </section>
        <section className="fb-doc-sec" id="m-robust" aria-labelledby="m-robust-h">
          <h2 className="fb-doc-h" id="m-robust-h">Lo que es robusto</h2>

          {Z && Z.harmOK && T ? (
            <ul className="fb-limits fb-robust">
              <li><b>Robusto: el factor de corrección.</b> Los datos crudos inflan cualquier comparación entre antes y después de 2012 en un factor igual a la propia razón: {corrFactor(Z)} aquí ({F2(Z.rMin)}–{F2(Z.rMax)} dejando un año fuera){borrowed ? ', tomada del área más amplia' : ''}.</li>
              {Z.guard ? <li><b>Ningún aumento para esta zona.</b> {Z.guard}.</li> :
              <li><b>{T.status === 'robust' ? 'Aquí la tendencia se mantiene.' : 'Aquí la tendencia es incierta.'}</b> {zoneName}: {X(T.rise)} en el registro armonizado, {X(T.without)} sin {T.bigYear} (su año máximo), rango del 90&nbsp;% {bootRange(T)} al remuestrear los años ({Math.round(T.pUp * 100)}{PS} de los remuestreos por encima de 1×). Ambos períodos son cortos (9 años antes de 2012, {LAST - 2011} después), así que cada media depende de su año máximo: {(() => { let b = 2003; for (let y = 2003; y <= 2011; y++) if (Z.annHarm(y) > Z.annHarm(b)) b = y; return b; })()} antes de 2012 y {(() => { let b = 2012; for (let y = 2012; y <= LAST; y++) if (Z.annHarm(y) > Z.annHarm(b)) b = y; return b; })()} después.</li>}
            </ul>
          ) : <p className="fb-note">Ninguna tendencia armonizada para esta zona.</p>}

          <h3 className="fb-h3">Cada año utilizable, predicho a partir de los demás{borrowed ? ' (área más amplia)' : ''}</h3>
          {Z && Z.loo.length ? (
            <>
              <p className="fb-note">El gráfico del error año por año está en Evidencia, panel 2. {onEvidence && <button type="button" className="at-link" onClick={onEvidence}>Abrirlo <Icon d={IC.arrow} /></button>}</p>
              <p className="fb-note">Dejando un año fuera: error mediano {PCT(Z.medErr)}{Z.holdout ? ' · razón estimada con 2012–2018 y aplicada a 2019–' + LAST + ': ' + PCT(Z.holdout.medErr) : ''}{Z.monthly ? ' · mes a mes (ambos sensores ≥ 30 celdas-día, ' + Z.monthly.n + ' meses): ' + PCT(Z.monthly.medErr) : ''}.</p>
              <ProvenanceLine status="computed" source="NASA FIRMS" products={['MCD14ML', 'VNP14IMGT']} period={SW + '–' + LAST}>
                <span>{borrowed ? <>área más amplia <span className="at-mono">{boxText(Z.borrowed.box)}</span></> : zoneName}</span>
              </ProvenanceLine>
            </>
          ) : <p className="fb-step-empty"><i className="at-cell at-cell-low" aria-hidden="true" />{Z ? 'Hay muy pocos años de superposición utilizables aquí para hacer la prueba.' : ''}</p>}

          <div className="fb-method-block" id="independent">
            <h3 className="fb-h3">Verificación independiente: área quemada oficial</h3>
            {official ? (
              <>
                <p className="fb-note">Canadá, National Forestry Database (Base Nacional de Datos Forestales), independiente de ambos sensores. Año promedio de 2012–{official.after[1]} ÷ el de 2003–2011: <b>área quemada oficial {X(official.rise)}</b>; nuestras celdas-día en los mismos años: crudas {X(official.raw)}, armonizadas {X(official.harm)}. Celdas-día por km² quemado: antes de 2012, {dec(official.perKm2.rawBefore, 1)} crudas y {dec(official.perKm2.harmBefore, 1)} armonizadas; después de 2012, {dec(official.perKm2.after, 1)}.</p>
                <IndexChart off={official} />
                <ProvenanceLine status="real" source="Consejo Canadiense de Ministros Forestales, National Forestry Database, vía ECCC" period={'2003–' + official.after[1]}><span>consultado el {official.retrieved}</span><span>km²; sin incluir Nunavut</span></ProvenanceLine>
              </>
            ) : <p className="fb-note">Disponible solo para “{tm('All of Canada')}” (totales oficiales nacionales). {countryName === 'Argentina' ? 'Todavía no se verificó ninguna serie independiente de área quemada para Argentina.' : 'Las series provinciales no se verificaron en esta versión.'}</p>}
          </div>

          <div className="fb-method-rel">
            <h3 className="fb-h3">Calidad de la armonización</h3>
            <ul className="fb-grades">
              {grades.map((x) => (
                <li key={x.g} className={cx(Z && Z.grade === x.g && !Z.empty && 'is-on')}>
                  <span className={cx('fb-grade', 'is-' + x.g)}>{x.g}</span>
                  <span>{x.rule}{Z && Z.grade === x.g && !Z.empty && <b className="fb-grade-here"> Esta zona: {gradeRule(Z).replace(/^[ABC]: /, '')}</b>}</span>
                </li>
              ))}
            </ul>
            <p className="fb-note">Califica la corrección, no la tendencia. Un año de superposición es utilizable para la prueba cuando MODIS tiene al menos {MIN_MODIS} celdas-día en él.{reference ? ' Esta zona es una de las tres zonas de referencia de Quebec cuyos conteos por tesela se volvieron a verificar con conteos hechos directamente a partir de los focos de calor de FIRMS.' : ' Solo en las tres zonas de referencia de Quebec se volvieron a verificar los conteos por tesela con conteos hechos directamente a partir de los focos de calor de FIRMS.'}</p>
          </div>
        </section>
        <section className="fb-doc-sec" id="m-limits" aria-labelledby="m-limits-h">
          <h2 className="fb-doc-h" id="m-limits-h">Límites</h2>

          <ul className="fb-limits">
            <li>Los años de mucho fuego arrastran la razón; {q ? q + ' (' + zoneName + (borrowed ? ', área más amplia' : '') + ')' : 'los años tranquilos pueden quedar sobrestimados o subestimados'}.</li>
            <li><b>Umbral de detección.</b> Por debajo de unas 10 celdas-día en un mes típico, VIIRS ve fuegos que MODIS no podía ver; ninguna razón los recupera, por eso esos meses no se comparan.</li>
            <li>Antes de 2003 la cobertura es parcial (solo Terra hasta julio de 2002): 2001–2002 se muestran atenuados y no se usan en las estadísticas.</li>
            <li>Los meses de interrupción de S-NPP se reemplazan por NOAA-20{gaps.length ? ' (' + cty + ': ' + gaps.map((g) => g.key).join(', ') + ')' : ''}: meses en los que, a nivel país, NOAA-20/S-NPP supera 1,25 con al menos 200 celdas-día cada uno. La NASA documenta una interrupción de S-NPP VIIRS el 24 de julio de 2024 (05:28–18:22 UTC); eso por sí solo no explica todo el déficit mensual.</li>
            <li><b>Resguardo de zonas pequeñas.</b> No se muestra ningún aumento antes/después (veredicto, tarjetas, escalera de medidas, Evidencia, Cómo funciona) cuando la media armonizada anterior a 2012 es inferior a 50 celdas-día por año, o cuando el rango del 90&nbsp;% obtenido al remuestrear los años abarca más de un factor 10. Solo se muestra el factor de corrección, con el motivo. Desde la v6.2, además: una zona cuya razón (propia o prestada) supera 4× no se armoniza en absoluto, igual que en el mapa; cuando solo Aqua y el registro armonizado quedan en lados opuestos de 1×, no se muestra ningún aumento (solo Aqua apunta en sentido contrario); cuando falta la verificación mes a mes, o tiene menos de 6 meses, o su error mediano supera el 50&nbsp;%, la tendencia se muestra como incierta (sin etiqueta de éxito). Estos umbrales son una elección nuestra, no están calibrados.</li>
            <li>Los umbrales de los grados de calidad son heurísticos, calibrados en Quebec; califican la armonización, no la tendencia.</li>
            <li>Las zonas pequeñas (menos de {BORROW.below} años utilizables) toman prestada la razón de un área más amplia, que se agranda en anillos de 0,5° hasta reunir {BORROW.need} años utilizables.</li>
            <li>Los conteos son detecciones (celdas-día), no incendios ni área quemada. Los archivos por país se detienen en las fronteras.</li>
          </ul>

          <div className="fb-method-block" id="next-seam">
            <h3 className="fb-h3">El próximo empalme</h3>
            <p className="fb-note">La producción de datos de S-NPP VIIRS terminó el 2 de noviembre de 2026; el registro continúa con NOAA-20. Medido en todos los meses con ambos satélites desde abril de 2018 (excluidos los meses de interrupción), {cty}: NOAA-20 ÷ S-NPP = {wholeZ && wholeZ.n20 ? F2(wholeZ.n20.factor) + ' (por año, ' + F2(wholeZ.n20.lo) + '–' + F2(wholeZ.n20.hi) + ')' : '—'}{Z && Z.n20 && Z !== wholeZ ? '; esta zona, ' + F2(Z.n20.factor) : ''}{Z && Z.cont && Z.cont.length ? '. Desde ' + Z.cont[0].key + ' (' + Z.cont.length + (Z.cont.length === 1 ? ' mes' : ' meses') + ' en ' + cty + '), los meses sin S-NPP usan NOAA-20 ÷ ' + F2(Z.contFactor) + (Z.contFactorFrom === 'box' ? ' (esta zona)' : ' (todo el país)') + ' y se muestran como calculados.' : CAL_LAST > 2025 ? '. Todavía no hay ningún mes sin S-NPP en esta versión (datos hasta ' + endLabelL() + ').' : '. 2026 no está en esta versión: los datos terminan en ' + endLabelL() + '.'}{Z && Z.provSet && Z.provSet.size ? ' ' + Z.provSet.size + (Z.provSet.size === 1 ? ' mes proviene de archivos casi en tiempo real: provisional, sin filtrar las fuentes de calor que no son fuego.' : ' meses provienen de archivos casi en tiempo real: provisionales, sin filtrar las fuentes de calor que no son fuego.') : ''}</p>
          </div>

        </section>
        <section className="fb-doc-sec" id="m-bymonth" aria-labelledby="m-bymonth-h">
          <h2 className="fb-doc-h" id="m-bymonth-h">La razón por mes{Z && Z.harmOK ? ' · ' + zoneName : ''}</h2>

          {Z && Z.harmOK ? (
            <>
              <p className="fb-note">Se agrega una sola razón sobre años completos. Los valores armonizados son exactos en los totales anuales por construcción de la razón agregada; los meses fuera de la temporada de incendios pueden desviarse en el factor indicado. Σ VIIRS ÷ Σ MODIS de cada mes del calendario, de febrero de 2012 a {LAST}{Z.gradeWhy === 'borrowed' ? ' (esta zona; la razón usada se toma prestada del área más amplia)' : ''}; residuo = ese valor ÷ la razón agregada {F2(Z.ratio)}. Gris: muy pocas detecciones en ese mes para afirmar algo.</p>
              <div className="fb-bymonth" role="table" tabIndex={0} aria-label="Razón y residuo por mes del calendario">
                <div role="row" className="fb-bm-row is-head"><span role="columnheader">Mes</span>{Z.byMonth.map((x) => <span role="columnheader" key={x.m}>{MONTHS_SHORT_L[x.m]}</span>)}</div>
                <div role="row" className="fb-bm-row"><span role="rowheader">Razón</span>{Z.byMonth.map((x) => <span role="cell" key={x.m} className={cx(!x.active && 'is-quiet')}>{x.ratio == null ? '—' : F2(x.ratio)}</span>)}</div>
                <div role="row" className="fb-bm-row"><span role="rowheader">Resid. ×</span>{Z.byMonth.map((x) => <span role="cell" key={x.m} className={cx(!x.active && 'is-quiet', x.active && x.resid != null && (x.resid > 1.3 || x.resid < 1 / 1.3) && 'is-off')}>{x.resid == null ? '—' : F2(x.resid)}</span>)}</div>
              </div>
              <p className="fb-note">El método no se modifica en este prototipo: una razón estacional requeriría más años por mes de los que tienen las zonas pequeñas.</p>
            </>
          ) : <p className="fb-note">No hay razón para esta zona.</p>}

        </section>
        <section className="fb-doc-sec" id="m-map" aria-labelledby="m-map-h">
          <h2 className="fb-doc-h" id="m-map-h">Lo que muestra el mapa</h2>

          {cells ? (() => {
            const P = (x) => Math.round(x * 100) + PS, rg = chanceRange, ca = cells.canada, ar = cells.argentina, sc = ca.summary, sa = ar.summary, pa = ratioPercentiles(ca), pr = ratioPercentiles(ar);
            const hi = (S) => S.cells.filter((c) => c.high).length;
            const f1 = (x) => { const v = Math.round(x * 1000) / 10; return dec(v, Number.isInteger(v) ? 0 : 1) + PS; };
            return (
              <ul className="fb-limits">
                <li><b>Celdas.</b> Las teselas de 0,5°. Para cada una, una <b>razón local</b>: VIIRS ÷ MODIS agregada sobre {SW}–{LAST} en la celda y sus ocho vecinas; sobre 5 × 5 celdas cuando alguno de los dos sensores tiene allí menos de {CELL.need} celdas-día; si no, la razón del país. Canadá: {P(sc.cases.own3)} 3 × 3, {P(sc.cases.own5)} 5 × 5, {P(sc.cases.country)} razón del país; Argentina: {P(sa.cases.own3)}, {P(sa.cases.own5)}, {P(sa.cases.country)}. El 90&nbsp;% central de las razones locales: {F2(pa.p5)}–{F2(pa.p95)} (Canadá), {F2(pr.p5)}–{F2(pr.p95)} (Argentina).</li>
                <li><b>Año récord.</b> Totales anuales por celda, {STATS_FROM}–{LAST}: crudo (MODIS hasta enero de 2012, VIIRS después), armonizado (MODIS × la razón local hasta enero de 2012) y solo MODIS (sin corrección, todos los años). El récord es el año con el mayor total. Se cuentan las celdas que tienen al menos {CELL.eligible} celdas-día armonizadas y una razón local de 4× o menos: {num(sc.n)} en Canadá, {num(sa.n)} en Argentina.</li>
                <li><b>Rango del azar, no un punto de referencia.</b> Una gran temporada de incendios fija récords en muchas celdas vecinas a la vez, así que las celdas no son independientes y “{ca.since} de {ca.period} años” no es la vara de medir adecuada. Permutamos las etiquetas de año {num(ca.perms.length)} veces (con semilla fija), de la misma manera para todas las celdas, y tomamos el rango del percentil 5–95 de la proporción de récords desde 2012. Canadá: crudo {P(sc.sinceRaw)} (azar {rg(sc.chanceRaw)}), armonizado {P(sc.sinceHarm)} ({rg(sc.chanceHarm)}), solo MODIS {P(sc.sinceModis)} ({rg(sc.chanceModis)}). Argentina: crudo {P(sa.sinceRaw)} ({rg(sa.chanceRaw)}), armonizado {P(sa.sinceHarm)} ({rg(sa.chanceHarm)}), solo MODIS {P(sa.sinceModis)} ({rg(sa.chanceModis)}). {(() => { const out = []; const W2 = { above: 'por encima de', below: 'por debajo de' }; [['Canadá', sc], ['Argentina', sa]].forEach(([nm, x]) => [['cruda', x.sinceRaw, x.chanceRaw], ['armonizada', x.sinceHarm, x.chanceHarm], ['de solo MODIS', x.sinceModis, x.chanceModis]].forEach(([k, v, c]) => { const w = versus(v, c); if (w !== 'inside') out.push('la proporción ' + k + ' de ' + nm + ' queda ' + (W2[w] || w) + ' su rango del azar'); })); return out.length ? cap(out.join('; ')) + '; todas las demás proporciones quedan dentro del suyo. ' : 'Todas las proporciones quedan dentro de su rango del azar. '; })()}{sc.topHarm[0].year} reúne el {P(sc.topHarm[0].share)} de los récords armonizados de Canadá; {sa.topHarm[0].year}, el {P(sa.topHarm[0].share)} de los de Argentina.</li>
                <li><b>En el mapa.</b> Récord antes de 2012 y récord desde 2012 usan los dos extremos de la familia cividis, apta para el daltonismo, ajustados para cada tema (la leyenda muestra ambos); a propósito no es la rampa violeta–naranja del calendario (verificado para daltonismo y escala de grises con tools/cvd.mjs). Cuando una celda de 0,5° mediría menos de unos 5 px, las celdas se agrupan en bloques de 1° que muestran la era mayoritaria; un empate exacto se divide mitad y mitad. Los contadores siempre usan las celdas de 0,5°. Armonizar pasa {flipCounts(ca).toBefore} celdas en Canadá y {flipCounts(ar).toBefore} en Argentina de “desde 2012” a “antes de 2012”; {flipCounts(ca).toSince + flipCounts(ar).toSince} pasan en sentido contrario.</li>
                <li><b>Sensibilidad.</b> El récord se recalcula con la razón local × 0,85 y × 1,15; una celda cuya era cambia se dibuja atenuada (“depende de la razón”): {P(sc.depends)} en Canadá, {P(sa.depends)} en Argentina.</li>
                <li><b>Un récord es un año, no una tendencia.</b> El mapa no dice si la actividad de fuego aumentó en una celda; eso lo hacen, para una zona, el veredicto y su prueba de robustez.</li>
                <li><b>Lo que una razón no puede recuperar.</b> {floors ? 'El ' + f1(floors.canada) + ' (Canadá) y el ' + f1(floors.argentina) + ' (Argentina)' : 'Un pequeño porcentaje'} de las celdas-día VIIRS de {SW}–{LAST} caen en celdas-mes en las que MODIS no registró nada. Una razón no repone nada allí, así que en las celdas con fuegos mayormente pequeños los años armonizados anteriores a 2012 son, en todo caso, demasiado bajos, lo que favorece un récord después de 2012. No hemos medido el efecto neto sobre las proporciones.</li>
                <li><b>Razón mayor que 4×: no armonizado.</b> {hi(ca)} celdas en Canadá y {hi(ar)} en Argentina tienen una razón local VIIRS ÷ MODIS mayor que 4×, algo inusual para fuegos de vegetación; posibles fuentes de calor que no son fuego, sin verificar. Se dibujan en gris, no se armonizan y no se cuentan (con ellas: Canadá, crudo {P(ca.summaryAll.sinceRaw)}, armonizado {P(ca.summaryAll.sinceHarm)}; Argentina, {P(ar.summaryAll.sinceRaw)}, {P(ar.summaryAll.sinceHarm)}). Figuran en el CSV del mapa.</li>
              </ul>
            );
          })() : <p className="fb-note">Leyendo las teselas.</p>}

        </section>
        <section className="fb-doc-sec" id="m-faq" aria-labelledby="m-faq-h">
          <h2 className="fb-doc-h" id="m-faq-h">Preguntas que hará un experto</h2>

          <ul className="fb-limits fb-faq">
            <li><b>¿Tamaño del fuego y bioma?</b> La razón se estima dentro de cada zona; entre las zonas predefinidas va {ratioRange ? 'de ' + F2(ratioRange[0]) + ' a ' + F2(ratioRange[1]) : '—'}. Una zona personalizada puede ir mucho más allá: las razones locales de las celdas de 0,5° van {cells && cells.canada ? 'de ' + F2(ratioPercentiles(cells.canada).p5) + ' a ' + F2(ratioPercentiles(cells.canada).p95) : '—'} (percentil 5–95, Canadá) y {cells && cells.argentina ? 'de ' + F2(ratioPercentiles(cells.argentina).p5) + ' a ' + F2(ratioPercentiles(cells.argentina).p95) : '—'} (Argentina), con algunas por encima de 4×; una celda o una zona por encima de 4× no se armoniza.</li>
            <li><b>¿Hora de paso?</b> La razón absorbe la diferencia media de muestreo entre los sensores, no la diferencia de un día en particular.</li>
            <li><b>¿Ángulo de barrido y nubes?</b> Sumas mensuales sobre muchos pasos del satélite; no se comparan escenas individuales.</li>
            <li><b>¿Deriva de la órbita de MODIS?</b> {cty}: razón {r1220 ? F2(r1220) : '—'} en 2012–2020, frente a {wholeZ && wholeZ.ratio ? F2(wholeZ.ratio) : '—'} en todos los años de superposición.</li>
            <li><b>¿Conteos o área quemada?</b> Conteos. Vea la verificación independiente con el área quemada oficial.</li>
          </ul>
        </section>
        <section className="fb-doc-sec" id="m-data" aria-labelledby="m-data-h"><h2 className="fb-doc-h" id="m-data-h">Datos</h2>

        <p>Productos de fuego activo de NASA FIRMS: MODIS Collection 6.1 (<span className="at-mono">MCD14ML</span>), VIIRS S-NPP 375 m (<span className="at-mono">VNP14IMGT</span>), VIIRS NOAA-20 375 m (<span className="at-mono">VJ114IMGT</span>, usado en los meses de interrupción de S-NPP y para el factor del próximo empalme). Archivos anuales por país, 2000–2025: 96 archivos y 19,2 millones de focos de calor FIRMS leídos, agregados en teselas mensuales de 0,5°.{CAL_LAST > 2025 ? ' 2026, hasta ' + endLabelL() + ': API por área de FIRMS (archivos estándar donde están disponibles; si no, casi en tiempo real), misma regla de celda-día, detecciones dentro de países vecinos eliminadas (Natural Earth 1:50m).' : ''} Solo se conservan las detecciones de tipo 0 (presunto fuego de vegetación). Sumar las teselas dentro de una zona difiere de contar los focos directamente en entre −0,2&nbsp;% y −0,5&nbsp;% (verificado en las tres zonas de Quebec). Área quemada oficial: Consejo Canadiense de Ministros Forestales (CCFM), National Forestry Database, a través de Medio Ambiente y Cambio Climático Canadá (ECCC).</p>
        </section><section className="fb-doc-sec" id="m-refs" aria-labelledby="m-refs-h"><h2 className="fb-doc-h" id="m-refs-h">Referencias</h2>
        <ul className="fb-refs">
          <li>NASA Earthdata, “Transitioning from Suomi NPP VIIRS &amp; OMPS: What FIRMS Users Need to Know” — earthdata.nasa.gov/news/blog/transitioning-from-s-npp-viirs-omps-what-nasa-firms-users-need-know</li>
          <li>NASA Earthdata, “Suomi NPP VIIRS Data Product Anomaly - July 2024” — earthdata.nasa.gov/data/alerts-outages/suomi-npp-viirs-data-product-anomaly-july-2024</li>
          <li>Chen, Y. et al. (2026), “Tracking recent extremes and interannual variability of global fire emissions using a near-real-time extension to the Global Fire Emissions Database”, Earth System Science Data 18, 7535–7555 — essd.copernicus.org/articles/18/7535/2026/</li>
          <li>Environment and Climate Change Canada, “Forest management and disturbances” indicator; data: CCFM National Forestry Database, “Area burned by forest fires by region, Canada, 1990 to 2024” — canada.ca/en/environment-climate-change/services/environmental-indicators/forest-management-disturbances.html</li>
        </ul>
</section>
        <section className="fb-doc-sec" id="m-about" aria-labelledby="m-about-h">
          <h2 className="fb-doc-h" id="m-about-h">Acerca de y créditos</h2>
          <p>FireBridge — NASA Space Apps Challenge 2026, desafío “Harmonization of MODIS and VIIRS Hot Spots” (armonización de los focos de calor de MODIS y VIIRS).</p>
          <p>Equipo BlackCoffeeOnly: Yasmine Lounaci y Mouloud Serir.</p>
          <p>Datos: NASA FIRMS. Contornos: Natural Earth. Sin afiliación con la NASA: no es un producto de la NASA ni cuenta con su aval.</p>
          <p>El código, el procesamiento de los datos y el análisis se produjeron con amplia asistencia de inteligencia artificial (IA), bajo la dirección y la revisión del equipo.</p>
          <p className="fb-muted">Prototipo — cada cifra se calcula en su navegador a partir de teselas mensuales de 0,5°.</p>
        </section>
      </div>
    </article>
  );
}
