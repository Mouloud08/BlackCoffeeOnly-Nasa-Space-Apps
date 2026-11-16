// "Every <month> since 2001" (SPEC §7): the selected month against the same month of 25 years.
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { formatShort } from '../ds/components/src/scale.js';
import { FIRST, LAST, CAL_LAST, CAL_YEARS, SW, NM, YEARS, LOW, monthReading, lastComparable, recordMonth, endLabel } from './metrics.js';
import { NUM, F2, PCT, ORD, monthLong, anomalyWords, rankWords, payoff, mfac } from './copy.js';
import { cx } from './util.jsx';


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
          {typ != null && <i className="fb-strip-typ" style={{ bottom: typ * 100 + '%' }} aria-hidden="true"><em>typical {mName}</em></i>}
          <div className="fb-strip-marks" style={{ gridTemplateColumns: 'repeat(' + n + ', minmax(0, 1fr))' }} role={phone ? 'img' : 'group'} aria-label={'Every ' + mName + ', 2001 to ' + lastY + ', log scale.' + (phone ? ' Selected: ' + selY + '. Select months in the calendar.' : ' Arrow keys move between years.')}>
            {p.all.map((x) => {
              const on = x.year === selY;
              const lab = mName + ' ' + x.year + ': ' + NUM(x.v) + ' fire detections' + (x.computed ? (raw ? ', raw MODIS' : ', computed from MODIS') : x.cont ? ', computed: NOAA-20 (twin VIIRS satellite), adjusted to S-NPP' : ', VIIRS') + (x.partial ? ', before 2003: not used in statistics' : '');
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
        <span><i className="fb-k is-modis" aria-hidden="true" />{raw ? 'MODIS, raw' : 'computed from MODIS'}</span>
        <span><i className="fb-k is-modis is-era" aria-hidden="true" />2001–02: partial, not used</span>
        <span><i className="fb-k is-viirs" aria-hidden="true" />VIIRS, measured{p.all.some((x) => x.cont) ? '; from ' + p.all.find((x) => x.cont).year + ', NOAA-20 (twin VIIRS satellite), adjusted to S-NPP' : ''}</span>
        {typ != null && <span><i className="fb-k is-typ" aria-hidden="true" />typical {mName} (median, 2003–{LAST})</span>}
        <span className="fb-k-log">fire detections, log</span>
      </figcaption>
    </figure>
  );
}

export function MonthRow({ Z, sel, onSelect, phone, fellBack, from = '2001-01', to = null, cls }) {
  if (!Z) return <section className="fb-card fb-month is-skel" aria-hidden="true"><div className="fb-skel-line" /><div className="fb-skel-strip" /></section>;
  const yr0 = +from.slice(0, 4), yr1 = to ? +to.slice(0, 4) : CAL_LAST, narrowed = yr0 > 2003 || yr1 < CAL_LAST;
  const p = monthReading(Z, sel, yr0, yr1);
  const mName = monthLong(p.m), title = 'How unusual was ' + mName + ' ' + p.y + '?', titleSub = 'Against every ' + mName + (narrowed ? ', ' + Math.max(2003, p.all[0].year) + '–' + p.all[p.all.length - 1].year : ' since 2003');
  const latest = NM - 1, rec = recordMonth(Z);
  const label = (i) => monthLong(i % 12) + ' ' + (FIRST + Math.floor(i / 12));
  let reading;
  if (Z.empty) reading = <p className="fb-mread">No detections in this box.</p>;
  else if (!Z.harmOK) {
    reading = (
      <>
        <p className="fb-mhead">{label(sel)}: {NUM(p.raw)} fire detections, raw ({p.computed ? 'MODIS' : 'VIIRS'}).</p>
        <p className="fb-mread">Raw only: not comparable across 2012, so there is no typical {mName} and no rank here.</p>
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
            <p className="fb-mhead fb-lowline"><i className="at-cell at-cell-low fb-lowdot" aria-hidden="true" />Too few detections in a typical {mName} to compare.</p>
            <p className="fb-mread">{label(sel)}: {NUM(p.v)} fire detections; a typical {mName} has {NUM(p.typ)}.</p>
            {q ? (
              <p className="fb-mread">Most recent comparable month: <b>{label(alt)}</b>, {anomalyWords(q.anomaly, qName)}, {ORD(q.rank)} of {q.of}. <button type="button" className="at-link" onClick={() => onSelect(alt)}>Select it</button></p>
            ) : <p className="fb-mread">No month of the year has a typical value of {LOW} fire detections or more here, so no month can be ranked.</p>}
          </>
        ) : counts ? (
          <>
            <p className="fb-mhead">{label(sel)}: {NUM(q.v)} fire detections.</p>
            <p className="fb-mread">A typical {mName} has {NUM(q.typ)}: {anomalyWords(q.anomaly, mName)}. {rankWords(q.rank, q.of, mName)}.</p>
          </>
        ) : (
          <>
            <p className="fb-mhead">{label(sel)}: {anomalyWords(q.anomaly, mName)}.</p>
            <p className="fb-mread">{NUM(q.v)} fire detections; a typical {mName} has {NUM(q.typ)}. {rankWords(q.rank, q.of, mName)}.</p>
          </>
        )}
        {q && <p className="fb-payoff">{payoff(q, p.low ? label(alt) : null)}</p>}
        {q && q.depends && <p className="fb-caveat">This rank depends on computed years (±{PCT(Z.medErr)}).</p>}
        {q && q.computed && Z.harmOK && Z.byMonth && Z.byMonth[q.m] && Z.byMonth[q.m].active && Z.byMonth[q.m].residS != null && (Z.byMonth[q.m].residS > 1.3 || Z.byMonth[q.m].residS < 1 / 1.3) && <p className="fb-caveat">The factor used for {monthLong(q.m)} ({F2(Z.byMonth[q.m].factor)}{Z.byMonth[q.m].corrected ? '' : ', the yearly ratio: too few years for its own'}) is still off by more than 1.3× out of sample (VIIRS {Z.byMonth[q.m].residS > 1 ? 'above' : 'below'} the prediction).</p>}
        {Z.contSet && Z.contSet.has(sel) && <p className="fb-caveat">Computed: NOAA-20 (twin VIIRS satellite), adjusted to S-NPP (÷ {Z.contFactor.toFixed(2)}, {Z.contFactorFrom === 'box' ? 'this box' : 'country-wide'}); S-NPP data are missing this month, or well below NOAA-20 country-wide.</p>}
        {Z.provSet && Z.provSet.has(sel) && <p className="fb-caveat">Provisional: near-real-time data, not filtered for non-fire sources.</p>}
      </>
    );
  }
  return (
    <section className={cx('fb-card fb-month', cls)} id="month" aria-labelledby="fb-month-t">
      <div className="fb-month-text">
        <h2 id="fb-month-t" className="fb-card-title" title={titleSub}>{title}</h2>
        <div className="fb-chips" role="group" aria-label="Jump to a month">
          <button type="button" className={cx('fb-chip', sel === latest && 'is-on')} aria-pressed={sel === latest} onClick={() => onSelect(latest)}>Latest: {endLabel()}</button>
          <button type="button" className={cx('fb-chip', sel === rec && sel !== latest && 'is-on')} aria-pressed={sel === rec && sel !== latest} onClick={() => onSelect(rec)}>Record month</button>
        </div>
        <div className="fb-month-read">
          {Z.harmOK && !Z.empty && fellBack && Z.typical[latest % 12] < LOW && <p className="fb-mlatest">Last month available, {endLabel()}: too few detections to compare.</p>}
          {reading}
        </div>
      </div>
      <div className="fb-month-chart">
        <Strip Z={Z} p={p} onSelect={onSelect} raw={!Z.harmOK} phone={phone} />
        {narrowed && <p className="fb-caveat">Date range {from} to {to}: ranks among these years only; the typical month and the ratio use the full period.</p>}
        <ProvenanceLine status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'every ' + mName + ', 2003–' + p.all[p.all.length - 1].year}>
          {Z.harmOK ? <span>2003–2011 computed (MODIS × {mfac(Z, p.m, false)}; experimental month factor)</span> : <span>raw, not comparable across 2012</span>}
          {p.all.some((x) => x.cont) && <span>{p.all.filter((x) => x.cont).map((x) => x.year).join(', ')}: NOAA-20 (twin VIIRS satellite), adjusted to S-NPP</span>}
        </ProvenanceLine>
      </div>
    </section>
  );
}
