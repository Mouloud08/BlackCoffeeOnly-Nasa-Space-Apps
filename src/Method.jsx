import { useRef, useState, useEffect } from 'react';
// Method, checks and limits (SPEC §9.2) and the data sources.
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { RatioStrip } from './Strips.jsx';
import { formatShort } from '../ds/components/src/scale.js';
import { GRADE_RULES, BORROW, MIN_MODIS, CELL, STATS_FROM, ratioPercentiles, flipCounts, versus, SW, LAST, CAL_LAST, END_KEY, PARTIAL, partialLabel, endLabel } from './metrics.js';
import { F2, PCT, SPCT, NUM, X, gradeRule, boxText, quietYears, bootRange, corrFactor, chanceRange } from './copy.js';
import { formatDecimal } from '../ds/components/src/scale.js';
import { cx, Icon, IC } from './util.jsx';

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
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Each usable overlap year predicted from the other years (hollow) against the measured VIIRS value (filled), log scale. Median error ' + PCT(Z.medErr) + '.'}>
        {ticks.map((t) => <g key={t}><line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className="at-rc-grid" /><text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{formatShort(t, 'en')}</text></g>)}
        {rows.map((r, i) => (
          <g key={r.year}>
            <line x1={sx(i)} x2={sx(i)} y1={sy(r.viirs)} y2={sy(r.predicted)} className="fb-loo-gap" />
            <circle cx={sx(i)} cy={sy(r.predicted)} r="6" className="fb-loo-pred"><title>{r.year + ' predicted: ' + NUM(r.predicted) + ' (MODIS ' + NUM(r.modis) + ' × ' + F2(r.ratio) + ')'}</title></circle>
            <circle cx={sx(i)} cy={sy(r.viirs)} r="3.5" className="fb-loo-meas"><title>{r.year + ' measured VIIRS: ' + NUM(r.viirs)}</title></circle>
            <text x={sx(i)} y={Math.min(sy(r.viirs), sy(r.predicted)) - 11} textAnchor="middle" className="at-rc-tick fb-loo-err">{sgn(r.signed)}</text>
            {(rows.length <= 10 || i % 2 === 0 || i === rows.length - 1) && <text x={sx(i)} y={H - 8} textAnchor="middle" className="at-rc-tick">{rows.length > 10 ? '’' + String(r.year).slice(2) : r.year}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="fb-loo-key">
        <span><i className="fb-dot is-pred" />predicted: MODIS × the ratio of the other years</span>
        <span><i className="fb-dot is-meas" />measured VIIRS</span>
        <span>cell-days per year, log scale; label: error of the prediction</span>
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
      <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={'Canada, 2003–' + off.after[1] + ': official area burned and our cell-days, each divided by its 2003–2011 mean, log scale. After 2012 the harmonized series follows the official one; the raw series sits about twice higher.'}>
        {ticks.map((t) => <g key={t}><line x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} className="at-rc-grid" /><text x={x0 - 8} y={sy(t) + 4} textAnchor="end" className="at-rc-tick">{t >= 1 ? formatDecimal(t, 0, 'en') : formatDecimal(t, 1, 'en')}×</text></g>)}
        <line x1={seam} x2={seam} y1={y0} y2={y1} className="fb-ix-seam" />
        <path d={line('raw')} className="fb-ix-raw" />
        <path d={line('harm')} className="fb-ix-harm" />
        <path d={line('area')} className="fb-ix-area" />
        {ys.map((r, i) => <circle key={r.year} cx={sx(i)} cy={sy(v(r, 'area'))} r="3.5" className="fb-ix-dot"><title>{r.year + ': ' + NUM(r.area) + ' km² burned'}</title></circle>)}
        {ys.map((r, i) => ((i % 3 === 0 || i === n - 1) ? <text key={r.year} x={sx(i)} y={H - 8} textAnchor="middle" className="at-rc-tick">{r.year}</text> : null))}
      </svg>
      <figcaption className="fb-loo-key">
        <span><i className="fb-ix-k is-area" />official area burned (NFD)</span>
        <span><i className="fb-ix-k is-harm" />cell-days, harmonized</span>
        <span><i className="fb-ix-k is-raw" />cell-days, raw</span>
        <span>each ÷ its own 2003–2011 mean, log scale</span>
        {off.rho && <span className="fb-ix-rho" title={'Spearman rank correlation with official area burned, ' + off.rho.from + '–' + off.rho.to + ', n = ' + off.rho.n}>Do the years rank in the same order as official area burned? Harmonized {off.rho.harm.toFixed(2)}, raw {off.rho.raw.toFixed(2)}, on a scale where 1 is perfect ({off.rho.from}–{off.rho.to}, {off.rho.n} years). It tests the order of years, not the level.</span>}
      </figcaption>
    </figure>
  );
}

const TOC = [['m-how', 'How it is computed'], ['m-robust', 'What is robust'], ['m-limits', 'Limits'], ['m-bymonth', 'The ratio by month'], ['m-map', 'What the map shows'], ['m-faq', 'Questions an expert will ask'], ['m-data', 'Data'], ['m-refs', 'References'], ['m-about', 'About and credits']];
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
  const grades = [
    { g: 'A', rule: 'own ratio; ' + G.A.years + '+ usable overlap years; median error ≤ ' + PCT(G.A.err) + '; leave-one-out ratio range ≤ ' + PCT(G.A.spread) + ' of the ratio.' },
    { g: 'B', rule: 'own ratio with ' + G.B.years + '+ usable years, error ≤ ' + PCT(G.B.err) + ', range ≤ ' + PCT(G.B.spread) + '; or a ratio borrowed from a wider area that meets A or B.' },
    { g: 'C', rule: 'otherwise. No harmonized number is shown; raw only.' },
  ];
  const r1220 = wholeZ ? (() => { let v = 0, m = 0; wholeZ.own.overlap.filter((o) => o.year <= 2020).forEach((o) => { v += o.viirs; m += o.modis; }); return m > 0 ? v / m : null; })() : null;
  const gaps = wholeZ ? wholeZ.gaps : [];
  // Scroll-spy: the section list highlights the section at the top of the reading area.
  return (
    <article className="fb-doc" aria-labelledby="fb-method-t" ref={docRef}>
      <nav className="fb-doc-toc" aria-label="Method sections">
        <h1 className="fb-doc-title" id="fb-method-t">Method</h1>
        <ol>{TOC.map(([id, t]) => <li key={id}><a href={'#' + id} className={cx(cur === id && 'is-cur')} aria-current={cur === id ? 'location' : undefined} onClick={(e) => { e.preventDefault(); const el = document.getElementById(id); el && el.scrollIntoView({ block: 'start' }); }}>{t}</a></li>)}</ol>
      </nav>
      <div className="fb-doc-body">
        <section className="fb-doc-sec" id="m-how" aria-labelledby="m-how-h">
          <h2 className="fb-doc-h" id="m-how-h">How it is computed</h2>

          <ol className="fb-steps-list">
            <li>We count <b>cell-days</b>: a ~1 km cell with at least one vegetation-fire detection on a given day, summed per month over the 0.5° tiles inside the box.</li>
            <li>On the {LAST - SW + 1} overlap years ({SW}–{LAST}) we pool <span className="at-mono">ratio = ΣVIIRS ÷ ΣMODIS</span>.</li>
            <li>We multiply every MODIS month before 2012 by that ratio; VIIRS months stay as measured. The change compares the mean year 2012–{LAST} with 2003–2011{PARTIAL ? ' (' + partialLabel() + ': shown, not in annual statistics)' : ''}.</li>
            <li>We test the bridge: each usable year is left out and predicted from the others; a ratio trained on 2012–2018 predicts 2019–{LAST}; and months are compared one by one.</li>
          </ol>

          {Z && Z.harmOK && (
            <div className="fb-method-ov">
              <h3 className="fb-h3">Both sensors on the overlap · pooled ratio {F2(Z.ratio)}</h3>
              <RatioStrip Z={Z} />
            </div>
          )}
        </section>
        <section className="fb-doc-sec" id="m-robust" aria-labelledby="m-robust-h">
          <h2 className="fb-doc-h" id="m-robust-h">What is robust</h2>

          {Z && Z.harmOK && T ? (
            <ul className="fb-limits fb-robust">
              <li><b>Robust: the correction factor.</b> Raw data overstate any before/after-2012 comparison by the ratio itself, {corrFactor(Z)} here ({F2(Z.rMin)}–{F2(Z.rMax)} leaving one year out){borrowed ? ', from the wider area' : ''}.</li>
              {Z.guard ? <li><b>No rise for this zone.</b> {Z.guard}.</li> :
              <li><b>{T.status === 'robust' ? 'Holds here: the trend.' : 'Uncertain here: the trend.'}</b> {zoneName}: {X(T.rise)} on the harmonized record, {X(T.without)} without {T.bigYear} (its largest year), 90% range {bootRange(T)} when years are resampled ({Math.round(T.pUp * 100)}% of resamples above 1×). Both periods are short (9 years before 2012, {LAST - 2011} after), so each mean leans on its biggest year: {(() => { let b = 2003; for (let y = 2003; y <= 2011; y++) if (Z.annHarm(y) > Z.annHarm(b)) b = y; return b; })()} before 2012 and {(() => { let b = 2012; for (let y = 2012; y <= LAST; y++) if (Z.annHarm(y) > Z.annHarm(b)) b = y; return b; })()} after.</li>}
            </ul>
          ) : <p className="fb-note">No harmonized trend for this zone.</p>}

          <h3 className="fb-h3">Every usable year, predicted without itself{borrowed ? ' (wider area)' : ''}</h3>
          {Z && Z.loo.length ? (
            <>
              <p className="fb-note">The year-by-year error chart is in Evidence, panel 2. {onEvidence && <button type="button" className="at-link" onClick={onEvidence}>Open it <Icon d={IC.arrow} /></button>}</p>
              <p className="fb-note">Leaving one year out: median error {PCT(Z.medErr)}{Z.holdout ? ' · trained on 2012–2018, predicting 2019–' + LAST + ': ' + PCT(Z.holdout.medErr) : ''}{Z.monthly ? ' · month by month (both sensors ≥ 30 cell-days, ' + Z.monthly.n + ' months): ' + PCT(Z.monthly.medErr) : ''}.</p>
              <ProvenanceLine status="computed" source="NASA FIRMS" products={['MCD14ML', 'VNP14IMGT']} period={SW + '–' + LAST}>
                <span>{borrowed ? <>wider area <span className="at-mono">{boxText(Z.borrowed.box)}</span></> : zoneName}</span>
              </ProvenanceLine>
            </>
          ) : <p className="fb-step-empty"><i className="at-cell at-cell-low" aria-hidden="true" />{Z ? 'Too few usable overlap years here to run the test.' : ''}</p>}

          <div className="fb-method-block" id="independent">
            <h3 className="fb-h3">Independent check: official area burned</h3>
            {official ? (
              <>
                <p className="fb-note">Canada, National Forestry Database, independent of both sensors. Mean year 2012–{official.after[1]} ÷ 2003–2011: <b>official area burned {X(official.rise)}</b>; our cell-days over the same years: raw {X(official.raw)}, harmonized {X(official.harm)}. Cell-days per km² burned: before 2012 {formatDecimal(official.perKm2.rawBefore, 1, 'en')} raw, {formatDecimal(official.perKm2.harmBefore, 1, 'en')} harmonized; after 2012 {formatDecimal(official.perKm2.after, 1, 'en')}.</p>
                <IndexChart off={official} />
                <ProvenanceLine status="real" source="Canadian Council of Forest Ministers, National Forestry Database, via ECCC" period={'2003–' + official.after[1]}><span>retrieved {official.retrieved}</span><span>km²; Nunavut not included</span></ProvenanceLine>
              </>
            ) : <p className="fb-note">Available for “All of Canada” only (national official totals). {countryName === 'Argentina' ? 'No independent area-burned series checked yet for Argentina.' : 'Provincial series were not checked in this build.'}</p>}
          </div>

          <div className="fb-method-rel">
            <h3 className="fb-h3">Harmonization quality</h3>
            <ul className="fb-grades">
              {grades.map((x) => (
                <li key={x.g} className={cx(Z && Z.grade === x.g && !Z.empty && 'is-on')}>
                  <span className={cx('fb-grade', 'is-' + x.g)}>{x.g}</span>
                  <span>{x.rule}{Z && Z.grade === x.g && !Z.empty && <b className="fb-grade-here"> This zone: {gradeRule(Z).replace(/^[ABC]: /, '')}</b>}</span>
                </li>
              ))}
            </ul>
            <p className="fb-note">It grades the sensor bridge, not the trend. An overlap year is usable for the test when MODIS has at least {MIN_MODIS} cell-days in it.{reference ? ' This zone is one of the three Québec reference zones whose tile counts were re-checked against counts made directly from the FIRMS points.' : ' Only the three Québec reference zones had their tile counts re-checked against counts made directly from the FIRMS points.'}</p>
          </div>
        </section>
        <section className="fb-doc-sec" id="m-limits" aria-labelledby="m-limits-h">
          <h2 className="fb-doc-h" id="m-limits-h">Limits</h2>

          <ul className="fb-limits">
            <li>The ratio is pulled by big fire years; {q ? q + ' (' + zoneName + (borrowed ? ', wider area' : '') + ')' : 'quiet years can be over- or underestimated'}.</li>
            <li><b>Detection floor.</b> Below about 10 cell-days in a typical month, VIIRS sees fires MODIS could not; no ratio recovers them, so those months are not compared.</li>
            <li>Before 2003 coverage is partial (Terra only until July 2002): 2001–2002 are shown faded and not used in statistics.</li>
            <li>S-NPP outage months are replaced by NOAA-20{gaps.length ? ' (' + countryName + ': ' + gaps.map((g) => g.key).join(', ') + ')' : ''}: country-level NOAA-20/S-NPP above 1.25 with at least 200 cell-days each. NASA documents an S-NPP VIIRS outage on 24 July 2024 (05:28–18:22 UTC); that alone does not explain the whole monthly deficit.</li>
            <li><b>Small-box guard.</b> No before/after rise is printed (verdict, cards, ladder, Evidence, How it works) when the harmonized mean before 2012 is under 50 cell-days a year, or when the 90% year-resampling range spans more than a factor 10. Only the sensor factor is shown, with the reason. Since v6.2 also: a zone whose ratio (own or borrowed) is above 4× is not harmonized at all, as on the map; when Aqua alone and the harmonized record fall on opposite sides of 1×, no rise is printed (the two MODIS-family readings disagree); when the month-by-month check is missing, has fewer than 6 months or a median error above 50%, the trend is shown as uncertain (no success chip). These thresholds are our choice, not calibrated.</li>
            <li>Quality grade thresholds are heuristics, calibrated on Québec; they grade the harmonization, not the trend.</li>
            <li>Small boxes (fewer than {BORROW.below} usable years) borrow the ratio of their wider area, grown by 0.5° rings until {BORROW.need} usable years.</li>
            <li>Counts are detections (cell-days), not fires or burned area. Country files stop at borders.</li>
          </ul>

          <div className="fb-method-block" id="next-seam">
            <h3 className="fb-h3">The next seam</h3>
            <p className="fb-note">S-NPP VIIRS data production ended on 2 November 2026; the record continues on NOAA-20. Measured on every month with both satellites from April 2018 (outage months excluded), {countryName} NOAA-20 ÷ S-NPP = {wholeZ && wholeZ.n20 ? F2(wholeZ.n20.factor) + ' (yearly ' + F2(wholeZ.n20.lo) + '–' + F2(wholeZ.n20.hi) + ')' : '—'}{Z && Z.n20 && Z !== wholeZ ? '; this zone ' + F2(Z.n20.factor) : ''}{Z && Z.cont && Z.cont.length ? '. From ' + Z.cont[0].key + ' (' + Z.cont.length + (Z.cont.length === 1 ? ' month' : ' months') + ' in ' + countryName + '), months without S-NPP use NOAA-20 ÷ ' + F2(Z.contFactor) + (Z.contFactorFrom === 'box' ? ' (this zone)' : ' (country-wide)') + ', shown as computed.' : CAL_LAST > 2025 ? '. No month without S-NPP yet in this build (data to ' + endLabel() + ').' : '. 2026 is not in this build: data stop in ' + endLabel() + '.'}{Z && Z.provSet && Z.provSet.size ? ' ' + Z.provSet.size + (Z.provSet.size === 1 ? ' month comes' : ' months come') + ' from near-real-time files: provisional, not filtered for non-fire sources.' : ''}</p>
          </div>

        </section>
        <section className="fb-doc-sec" id="m-bymonth" aria-labelledby="m-bymonth-h">
          <h2 className="fb-doc-h" id="m-bymonth-h">The ratio by month{Z && Z.harmOK ? ' · ' + zoneName : ''}</h2>

          {Z && Z.harmOK ? (
            <>
              <p className="fb-note">One ratio is pooled over whole years. Harmonized values are exact in annual totals by construction of the pooled ratio; individual months off the fire season can be off by the factor shown. Σ VIIRS ÷ Σ MODIS of each calendar month, February 2012–{LAST}{Z.gradeWhy === 'borrowed' ? ' (this box; the ratio used is borrowed from the wider area)' : ''}; residual = that ÷ the pooled {F2(Z.ratio)}. Grey: too few detections in that month to say.</p>
              <div className="fb-bymonth" role="table" tabIndex={0} aria-label="Ratio and residual by calendar month">
                <div role="row" className="fb-bm-row is-head"><span role="columnheader">Month</span>{Z.byMonth.map((x) => <span role="columnheader" key={x.m}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.m]}</span>)}</div>
                <div role="row" className="fb-bm-row"><span role="rowheader">Ratio</span>{Z.byMonth.map((x) => <span role="cell" key={x.m} className={cx(!x.active && 'is-quiet')}>{x.ratio == null ? '—' : F2(x.ratio)}</span>)}</div>
                <div role="row" className="fb-bm-row"><span role="rowheader">Resid. ×</span>{Z.byMonth.map((x) => <span role="cell" key={x.m} className={cx(!x.active && 'is-quiet', x.active && x.resid != null && (x.resid > 1.3 || x.resid < 1 / 1.3) && 'is-off')}>{x.resid == null ? '—' : F2(x.resid)}</span>)}</div>
              </div>
              <p className="fb-note">The method is not changed in this prototype: a seasonal ratio would need more years per month than small zones have.</p>
            </>
          ) : <p className="fb-note">No ratio for this zone.</p>}

        </section>
        <section className="fb-doc-sec" id="m-map" aria-labelledby="m-map-h">
          <h2 className="fb-doc-h" id="m-map-h">What the map shows</h2>

          {cells ? (() => {
            const P = (x) => Math.round(x * 100) + '%', rg = chanceRange, ca = cells.canada, ar = cells.argentina, sc = ca.summary, sa = ar.summary, pa = ratioPercentiles(ca), pr = ratioPercentiles(ar);
            const hi = (S) => S.cells.filter((c) => c.high).length;
            return (
              <ul className="fb-limits">
                <li><b>Places.</b> The 0.5° tiles. For each, a <b>local ratio</b>: VIIRS ÷ MODIS pooled over {SW}–{LAST} in the place and its eight neighbours; over 5 × 5 places when either sensor has fewer than {CELL.need} cell-days there; otherwise the country ratio. Canada: {P(sc.cases.own3)} 3 × 3, {P(sc.cases.own5)} 5 × 5, {P(sc.cases.country)} country ratio; Argentina: {P(sa.cases.own3)}, {P(sa.cases.own5)}, {P(sa.cases.country)}. Middle 90% of local ratios: {F2(pa.p5)}–{F2(pa.p95)} (Canada), {F2(pr.p5)}–{F2(pr.p95)} (Argentina).</li>
                <li><b>Record year.</b> Annual totals per place, {STATS_FROM}–{LAST}: raw (MODIS to January 2012, VIIRS after), harmonized (MODIS × the local ratio to January 2012) and MODIS alone (no bridge, all years). The record is the year with the largest total. Places are counted when they have at least {CELL.eligible} harmonized cell-days and a local ratio of 4× or less: {sc.n.toLocaleString('en')} in Canada, {sa.n.toLocaleString('en')} in Argentina.</li>
                <li><b>Chance range, not a benchmark.</b> One big fire season sets records in many neighbouring places at once, so places are not independent and “{ca.since} of {ca.period} years” is not the right yardstick. We reshuffle the year labels {ca.perms.length.toLocaleString('en')} times (seeded), the same way for every place, and take the 5th–95th percentile of the share of records since 2012. Canada: raw {P(sc.sinceRaw)} (chance {rg(sc.chanceRaw)}), harmonized {P(sc.sinceHarm)} ({rg(sc.chanceHarm)}), MODIS alone {P(sc.sinceModis)} ({rg(sc.chanceModis)}). Argentina: raw {P(sa.sinceRaw)} ({rg(sa.chanceRaw)}), harmonized {P(sa.sinceHarm)} ({rg(sa.chanceHarm)}), MODIS alone {P(sa.sinceModis)} ({rg(sa.chanceModis)}). {(() => { const out = []; [['Canada', sc], ['Argentina', sa]].forEach(([nm, x]) => [['raw', x.sinceRaw, x.chanceRaw], ['harmonized', x.sinceHarm, x.chanceHarm], ['MODIS alone', x.sinceModis, x.chanceModis]].forEach(([k, v, c]) => { const w = versus(v, c); if (w !== 'inside') out.push(nm + ' ' + k + ' is ' + w + ' its chance range'); })); return out.length ? out.join('; ') + '; every other share is inside it. ' : 'Every share is inside its chance range. '; })()}{sc.topHarm[0].year} holds {P(sc.topHarm[0].share)} of Canada’s harmonized records, {sa.topHarm[0].year} {P(sa.topHarm[0].share)} of Argentina’s.</li>
                <li><b>On the map.</b> Record before 2012 in a light sand tone, since 2012 in a deep blue, the same in both themes: two ends of the colour-blind-safe cividis family, deliberately not the calendar’s purple–orange ramp (checked for colour blindness and grayscale with tools/cvd.mjs). When a 0.5° place would be under about 5 px, places are grouped in 1° blocks showing the majority era; an exact tie is split half and half. Counters always use the 0.5° places. Harmonizing moves {flipCounts(ca).toBefore} places in Canada and {flipCounts(ar).toBefore} in Argentina from “since 2012” to “before 2012”; {flipCounts(ca).toSince + flipCounts(ar).toSince} move the other way.</li>
                <li><b>Sensitivity.</b> The record is recomputed with the local ratio × 0.85 and × 1.15; a place whose era changes is drawn faded (“depends on the ratio”): {P(sc.depends)} in Canada, {P(sa.depends)} in Argentina.</li>
                <li><b>A record is one year, not a trend.</b> The map does not say whether fire activity rose in a place; the verdict and its robustness test do that for a box.</li>
                <li><b>What a ratio cannot recover.</b> {floors ? (Math.round(floors.canada * 1000) / 10) + '% (Canada) and ' + (Math.round(floors.argentina * 1000) / 10) + '% (Argentina)' : 'A few percent'} of VIIRS cell-days {SW}–{LAST} fall in place-months where MODIS recorded nothing. A ratio puts nothing back there, so in places with mostly small fires the harmonized years before 2012 are, if anything, too low, which favours a record after 2012. We have not measured the net effect on the shares.</li>
                <li><b>Ratio above 4×: not harmonized.</b> {hi(ca)} places in Canada and {hi(ar)} in Argentina have a local VIIRS ÷ MODIS above 4×, unusual for vegetation fire; possible non-fire heat sources, not verified. They are drawn in gray, not bridged and not counted (with them: Canada raw {P(ca.summaryAll.sinceRaw)}, harmonized {P(ca.summaryAll.sinceHarm)}; Argentina {P(ar.summaryAll.sinceRaw)}, {P(ar.summaryAll.sinceHarm)}). Listed in the map CSV.</li>
              </ul>
            );
          })() : <p className="fb-note">Reading the tiles.</p>}

        </section>
        <section className="fb-doc-sec" id="m-faq" aria-labelledby="m-faq-h">
          <h2 className="fb-doc-h" id="m-faq-h">Questions an expert will ask</h2>

          <ul className="fb-limits fb-faq">
            <li><b>Fire size and biome?</b> The ratio is estimated inside each box; across the presets it ranges {ratioRange ? F2(ratioRange[0]) + '–' + F2(ratioRange[1]) : '—'}. A custom box can reach much further: local ratios of the 0.5° places run from {cells && cells.canada ? F2(ratioPercentiles(cells.canada).p5) + ' to ' + F2(ratioPercentiles(cells.canada).p95) : '—'} (5th–95th percentile, Canada) and {cells && cells.argentina ? F2(ratioPercentiles(cells.argentina).p5) + ' to ' + F2(ratioPercentiles(cells.argentina).p95) : '—'} (Argentina), with some above 4×; a place or a box above 4× is not harmonized.</li>
            <li><b>Overpass time?</b> The ratio absorbs the average sampling difference between the sensors, not the difference on any single day.</li>
            <li><b>Scan angle and cloud?</b> Monthly sums over many overpasses; single scenes are not compared.</li>
            <li><b>MODIS orbit drift?</b> {countryName}: ratio {r1220 ? F2(r1220) : '—'} on 2012–2020 against {wholeZ && wholeZ.ratio ? F2(wholeZ.ratio) : '—'} on all overlap years.</li>
            <li><b>Counts or burned area?</b> Counts. See the independent check against official area burned.</li>
          </ul>
        </section>
        <section className="fb-doc-sec" id="m-data" aria-labelledby="m-data-h"><h2 className="fb-doc-h" id="m-data-h">Data</h2>
        
        <p>NASA FIRMS active fire products: MODIS Collection 6.1 (<span className="at-mono">MCD14ML</span>), VIIRS S-NPP 375 m (<span className="at-mono">VNP14IMGT</span>), VIIRS NOAA-20 375 m (<span className="at-mono">VJ114IMGT</span>, used in S-NPP outage months and for the next-seam factor). Country yearly files, 2000–2025, 96 files, 19.2 million detections read; aggregated to 0.5° monthly tiles.{CAL_LAST > 2025 ? ' 2026, to ' + endLabel() + ': FIRMS area API (standard files where available, near-real-time otherwise), same cell-day rule, detections inside neighbouring countries removed (Natural Earth 1:50m).' : ''} Only type 0 detections (presumed vegetation fire) are kept. Summing tiles inside a box differs from counting points directly by −0.2 to −0.5% (checked on the three Québec zones). Official area burned: Canadian Council of Forest Ministers, National Forestry Database, through Environment and Climate Change Canada.</p>
        </section><section className="fb-doc-sec" id="m-refs" aria-labelledby="m-refs-h"><h2 className="fb-doc-h" id="m-refs-h">References</h2>
        <ul className="fb-refs">
          <li>NASA Earthdata, “Transitioning from Suomi NPP VIIRS &amp; OMPS: What FIRMS Users Need to Know” — earthdata.nasa.gov/news/blog/transitioning-from-s-npp-viirs-omps-what-nasa-firms-users-need-know</li>
          <li>NASA Earthdata, “Suomi NPP VIIRS Data Product Anomaly - July 2024” — earthdata.nasa.gov/data/alerts-outages/suomi-npp-viirs-data-product-anomaly-july-2024</li>
          <li>Chen, Y. et al. (2026), “Tracking recent extremes and interannual variability of global fire emissions using a near-real-time extension to the Global Fire Emissions Database”, Earth System Science Data 18, 7535–7555 — essd.copernicus.org/articles/18/7535/2026/</li>
          <li>Environment and Climate Change Canada, “Forest management and disturbances” indicator; data: CCFM National Forestry Database, “Area burned by forest fires by region, Canada, 1990 to 2024” — canada.ca/en/environment-climate-change/services/environmental-indicators/forest-management-disturbances.html</li>
        </ul>
</section>
        <section className="fb-doc-sec" id="m-about" aria-labelledby="m-about-h">
          <h2 className="fb-doc-h" id="m-about-h">About and credits</h2>
          <p>FireBridge — NASA Space Apps Challenge 2026, challenge ‘Harmonization of MODIS and VIIRS Hot Spots’.</p>
          <p>Data: NASA FIRMS. Outlines: Natural Earth. Not affiliated with or endorsed by NASA.</p>
          <p>Code, data processing and analysis were produced with extensive AI assistance, directed and reviewed by the team.</p>
          <p className="fb-muted">Prototype — every figure is computed in your browser from 0.5° monthly tiles.</p>
        </section>
      </div>
    </article>
  );
}
