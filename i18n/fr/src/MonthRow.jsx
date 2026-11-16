// "Every <month> since 2001" (SPEC §7): the selected month against the same month of 25 years.
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { formatShort } from '../ds/components/src/scale.js';
import { FIRST, LAST, CAL_LAST, CAL_YEARS, SW, NM, YEARS, LOW, monthReading, lastComparable, recordMonth, endLabel } from './metrics.js';
import { NUM, F2, PCT, ORD, monthLong, anomalyWords, rankWords, payoff } from './copy.js';
import { cx } from './util.jsx';
import { monthYear, endLabelL, cap } from './l10n.js';
// "de juillet" / "d’août"; a month and its year at the start of a sentence: "Juillet 2019".
const deM = (m) => (/^[aeiouyéèêh]/i.test(m || '') ? 'd’' : 'de ') + m;
const fx = (v, d) => v.toFixed(d).replace('.', ',');


function Strip({ Z, p, onSelect, raw, phone }) {
  const mName = monthLong(p.m);
  const vals = p.all.map((x) => x.v);
  const top = Math.max(10, ...vals);
  const hi = Math.pow(10, Math.ceil(Math.log10(top * 1.15) * 2) / 2), lo = 1;
  const frac = (x) => (x <= 0 ? 0 : Math.max(0.025, Math.min(1, (Math.log10(Math.max(x, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)))));
  const grid = [10, 100, 1000, 10000, 100000].filter((t) => t < hi);
  const typ = !raw && p.typ > 0 ? frac(p.typ) : null;
  const n = CAL_YEARS.length, col = (y) => ((y - FIRST + 0.5) / n) * 100;
  const TICKS = [2001, 2006, 2012, 2018, CAL_LAST];
  const lastY = p.all[p.all.length - 1].year;
  const selY = p.y;
  return (
    <figure className="fb-strip">
      <div className="fb-strip-plot">
        <div className="fb-strip-gutter" aria-hidden="true">{grid.map((t) => <span key={t} style={{ bottom: frac(t) * 100 + '%' }}>{formatShort(t, 'en')}</span>)}</div>
        <div className="fb-strip-area">
          {grid.map((t) => <i key={t} className="fb-strip-grid" style={{ bottom: frac(t) * 100 + '%' }} aria-hidden="true" />)}
          <i className="fb-strip-seam" style={{ left: ((SW - FIRST) / n) * 100 + '%' }} aria-hidden="true" />
          {typ != null && <i className="fb-strip-typ" style={{ bottom: typ * 100 + '%' }} aria-hidden="true"><em>{mName} typique</em></i>}
          <div className="fb-strip-marks" style={{ gridTemplateColumns: 'repeat(' + n + ', minmax(0, 1fr))' }} role={phone ? 'img' : 'group'} aria-label={'Tous les mois ' + deM(mName) + ', de 2001 à ' + lastY + ', échelle logarithmique.' + (phone ? ' Sélection\u202F: ' + selY + '. Choisissez les mois dans le calendrier.' : ' Les flèches passent d’une année à l’autre.')}>
            {p.all.map((x) => {
              const on = x.year === selY;
              const lab = cap(monthYear(p.m, x.year)) + '\u202F: ' + NUM(x.v) + ' détections de feux' + (x.computed ? (raw ? ', MODIS brut' : ', calculé à partir de MODIS') : x.cont ? ', calculé\u202F: NOAA-20 (satellite VIIRS jumeau), ajusté à S-NPP' : ', VIIRS') + (x.partial ? ', avant 2003\u202F: non utilisé dans les statistiques' : '');
              if (phone) return <span key={x.year} style={{ gridColumn: x.year - FIRST + 1 }} className={cx('fb-mk', x.computed ? 'is-modis' : 'is-viirs', on && 'is-on', x.v === 0 && 'is-zero', x.partial && 'is-era')} title={lab}><i style={{ height: (frac(x.v) * 100).toFixed(2) + '%' }} /></span>;
              return (
                <button key={x.year} type="button" style={{ gridColumn: x.year - FIRST + 1 }} className={cx('fb-mk', x.computed ? 'is-modis' : 'is-viirs', on && 'is-on', x.v === 0 && 'is-zero', x.partial && 'is-era')} aria-pressed={on}
                  aria-label={lab} tabIndex={on ? 0 : -1}
                  onKeyDown={(e) => {
                    // One tab stop: arrows move along the years (V5 audit F25).
                    const ys = p.all.map((q) => q.year), i = ys.indexOf(x.year);
                    const j = e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowRight' ? i + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ys.length - 1 : null;
                    if (j == null || j < 0 || j >= ys.length) return;
                    e.preventDefault(); const fig = e.currentTarget.closest('.fb-strip-marks');
                    onSelect((ys[j] - FIRST) * 12 + p.m);
                    requestAnimationFrame(() => { const el = fig && fig.querySelector('.fb-mk.is-on'); el && el.focus(); });
                  }}
                  onClick={() => onSelect((x.year - FIRST) * 12 + p.m)}>
                  <i style={{ height: (frac(x.v) * 100).toFixed(2) + '%' }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="fb-strip-axis" aria-hidden="true">
        <span className="fb-strip-gutter" />
        <div className="fb-strip-ticks">
          {TICKS.filter((t) => Math.abs(t - selY) > (phone ? 3 : 2)).map((t) => <span key={t} className={cx(t === SW && 'is-seam', (t === 2006 || t === 2018) && 'is-minor')} style={{ left: col(t) + '%' }}>{t === SW && !phone ? '2012 · VIIRS' : t}</span>)}
          <span className="is-sel" style={{ left: col(selY) + '%' }}><b className="fb-caret">▲</b>{selY}</span>
        </div>
      </div>
      <figcaption className="fb-strip-key">
        <span><i className="fb-k is-modis" aria-hidden="true" />{raw ? 'MODIS, brut' : 'calculé à partir de MODIS'}</span>
        <span><i className="fb-k is-modis is-era" aria-hidden="true" />2001–02{'\u202F: partiel, non utilisé'}</span>
        <span><i className="fb-k is-viirs" aria-hidden="true" />VIIRS, mesuré{p.all.some((x) => x.cont) ? '\u202F; à partir de ' + p.all.find((x) => x.cont).year + ', NOAA-20 (satellite VIIRS jumeau), ajusté à S-NPP' : ''}</span>
        {typ != null && <span><i className="fb-k is-typ" aria-hidden="true" />{mName} typique (médiane, 2003–{LAST})</span>}
        <span className="fb-k-log">détections de feux, échelle log</span>
      </figcaption>
    </figure>
  );
}

export function MonthRow({ Z, sel, onSelect, phone, fellBack, from = '2001-01', to = null, cls }) {
  if (!Z) return <section className="fb-card fb-month is-skel" aria-hidden="true"><div className="fb-skel-line" /><div className="fb-skel-strip" /></section>;
  const yr0 = +from.slice(0, 4), yr1 = to ? +to.slice(0, 4) : CAL_LAST, narrowed = yr0 > 2003 || yr1 < CAL_LAST;
  const p = monthReading(Z, sel, yr0, yr1);
  const mName = monthLong(p.m), title = cap(monthYear(p.m, p.y)) + '\u202F: inhabituel\u202F?', titleSub = 'Comparé à tous les mois ' + deM(mName) + (narrowed ? ', ' + Math.max(2003, p.all[0].year) + '–' + p.all[p.all.length - 1].year : ' depuis 2003');
  const latest = NM - 1, rec = recordMonth(Z);
  const label = (i) => monthYear(i % 12, FIRST + Math.floor(i / 12)), Label = (i) => cap(label(i));
  let reading;
  if (Z.empty) reading = <p className="fb-mread">Aucune détection dans cette zone.</p>;
  else if (!Z.harmOK) {
    reading = (
      <>
        <p className="fb-mhead">{Label(sel)}{'\u202F: '}{NUM(p.raw)} détections de feux, brut ({p.computed ? 'MODIS' : 'VIIRS'}).</p>
        <p className="fb-mread">{'Brut seulement\u202F: non comparable de part et d’autre de 2012, donc pas de mois ' + deM(mName) + ' typique ni de rang ici.'}</p>
      </>
    );
  } else {
    let q = p, alt = null;
    if (p.low) { const j = lastComparable(Z, sel); alt = j; q = j != null ? monthReading(Z, j, yr0, yr1) : null; }
    const qName = q ? monthLong(q.m) : '';
    const counts = q && q.anomaly != null && q.anomaly > 20;
    reading = (
      <>
        {p.low ? (
          <>
            <p className="fb-mhead fb-lowline"><i className="at-cell at-cell-low fb-lowdot" aria-hidden="true" />{'Trop peu de détections dans un mois ' + deM(mName) + ' typique pour comparer.'}</p>
            <p className="fb-mread">{Label(sel)}{'\u202F: '}{NUM(p.v)} détections de feux{'\u202F; un mois ' + deM(mName) + ' typique en compte '}{NUM(p.typ)}.</p>
            {q ? (
              <p className="fb-mread">{'Mois comparable le plus récent\u202F: '}<b>{label(alt)}</b>, {anomalyWords(q.anomaly, qName)}, {ORD(q.rank)} sur {q.of}. <button type="button" className="at-link" onClick={() => onSelect(alt)}>Le sélectionner</button></p>
            ) : <p className="fb-mread">Aucun mois de l’année n’atteint ici une valeur typique de {LOW} détections de feux ou plus{'\u202F: '}aucun mois ne peut être classé.</p>}
          </>
        ) : counts ? (
          <>
            <p className="fb-mhead">{Label(sel)}{'\u202F: '}{NUM(q.v)} détections de feux.</p>
            <p className="fb-mread">{'Typique\u202F: '}{NUM(q.typ)}{'\u202F; '}{anomalyWords(q.anomaly, mName)}. {rankWords(q.rank, q.of, mName)}.</p>
          </>
        ) : (
          <>
            <p className="fb-mhead">{Label(sel)}{'\u202F: '}{anomalyWords(q.anomaly, mName)}.</p>
            <p className="fb-mread">{NUM(q.v)} détections de feux{'\u202F; typique\u202F: '}{NUM(q.typ)}. {rankWords(q.rank, q.of, mName)}.</p>
          </>
        )}
        {q && <p className="fb-payoff">{payoff(q, p.low ? label(alt) : null)}</p>}
        {q && q.depends && <p className="fb-caveat">Ce rang dépend d’années calculées (±{PCT(Z.medErr)}).</p>}
        {q && q.computed && Z.harmOK && Z.byMonth && Z.byMonth[q.m] && Z.byMonth[q.m].active && Z.byMonth[q.m].resid != null && (Z.byMonth[q.m].resid > 1.3 || Z.byMonth[q.m].resid < 1 / 1.3) && <p className="fb-caveat">{'Mois hors saison\u202F: le facteur de correction unique convient mal à ' + monthLong(q.m) + ' (' + monthLong(q.m) + ' seul donne '}{F2(Z.byMonth[q.m].ratio)}, {Z.byMonth[q.m].resid > 1 ? 'au-dessus' : 'en dessous'} du {F2(Z.ratio)} utilisé pour tous les mois, de plus de 1,3×).</p>}
        {Z.contSet && Z.contSet.has(sel) && <p className="fb-caveat">{'Calculé\u202F: NOAA-20 (jumeau VIIRS) ramené à S-NPP (÷ '}{fx(Z.contFactor, 2)}, {Z.contFactorFrom === 'box' ? 'cette zone' : 'à l’échelle du pays'}){'\u202F; S-NPP absent ce mois-ci, ou bien sous NOAA-20 dans le pays.'}</p>}
        {Z.provSet && Z.provSet.has(sel) && <p className="fb-caveat">{'Provisoire\u202F: quasi temps réel, sources de chaleur autres que les feux non filtrées.'}</p>}
      </>
    );
  }
  return (
    <section className={cx('fb-card fb-month', cls)} id="month" aria-labelledby="fb-month-t">
      <div className="fb-month-text">
        <h2 id="fb-month-t" className="fb-card-title" title={titleSub}>{title}</h2>
        <div className="fb-chips" role="group" aria-label="Aller à un mois">
          <button type="button" className={cx('fb-chip', sel === latest && 'is-on')} aria-pressed={sel === latest} onClick={() => onSelect(latest)}>{'Dernier\u202F: '}{endLabelL()}</button>
          <button type="button" className={cx('fb-chip', sel === rec && sel !== latest && 'is-on')} aria-pressed={sel === rec && sel !== latest} onClick={() => onSelect(rec)}>Mois record</button>
        </div>
        <div className="fb-month-read">
          {Z.harmOK && !Z.empty && fellBack && Z.typical[latest % 12] < LOW && <p className="fb-mlatest">Dernier mois disponible, {endLabelL()}{'\u202F: trop peu de détections pour comparer.'}</p>}
          {reading}
        </div>
      </div>
      <div className="fb-month-chart">
        <Strip Z={Z} p={p} onSelect={onSelect} raw={!Z.harmOK} phone={phone} />
        {narrowed && <p className="fb-caveat">Période {from} à {to}{'\u202F: rangs parmi ces années seulement\u202F; le mois typique et le ratio utilisent toute la période.'}</p>}
        <ProvenanceLine status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'tous les mois ' + deM(mName) + ', 2003–' + p.all[p.all.length - 1].year}>
          {Z.harmOK ? <span>2003–2011 calculé (MODIS × {fx(Z.ratio, 2)})</span> : <span>brut, non comparable de part et d’autre de 2012</span>}
          {p.all.some((x) => x.cont) && <span>{p.all.filter((x) => x.cont).map((x) => x.year).join(', ')}{'\u202F: NOAA-20 (satellite VIIRS jumeau), ajusté à S-NPP'}</span>}
        </ProvenanceLine>
      </div>
    </section>
  );
}
