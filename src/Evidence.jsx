// Version 5 Evidence tab: four panels, each headed by a one-line takeaway generated from the numbers.
import { memo, useState } from 'react';
import { Info } from './ui.jsx';
import { ProvenanceLine } from '../ds/components/src/components.jsx';
import { LAST, SW, STATS_FROM, cellSummary, versus } from './metrics.js';
import { X, F2, PCT, xr, bootRange, proofHeading, looHeading, recordsHeading, chanceShort, baseRate } from './copy.js';
import { RiseBars } from './Verdict.jsx';
import { IndexChart } from './Method.jsx';
import { ErrorStrip } from './Strips.jsx';
import { MonthRow } from './MonthRow.jsx';
import { cx } from './util.jsx';

const P1 = (x) => (x == null ? '—' : Math.round(x * 100) + '%');

// Shares of places with a record since 2012 against their chance ranges (one row per series).
export function ChanceChart({ s, label }) {
  if (!s || !s.n) return <p className="fb-note">Too few places to read records here.</p>;
  const rows = [['Raw', s.sinceRaw, s.chanceRaw], ['Harmonized', s.sinceHarm, s.chanceHarm], ['MODIS alone', s.sinceModis, s.chanceModis]];
  return (
    <div className="fb-chance"><div className="fb-chance-plot" role="img" aria-label={label + ': share of places whose record year is 2012 or later, against the range chance alone gives. ' + rows.map(([k, v, c]) => k + ' ' + P1(v) + ', chance ' + P1(c.lo) + ' to ' + P1(c.hi) + ' (' + (versus(v, c) === 'inside' ? 'within' : versus(v, c)) + ')').join('; ') + '.'}>
      <div className="fb-chance-axis" aria-hidden="true"><span /><span className="fb-chance-ticks">{[0, 25, 50, 75, 100].map((t) => <i key={t} style={{ left: t + '%' }}>{t}%</i>)}</span><span /></div>
      {rows.map(([k, v, c]) => {
        const w = versus(v, c);
        return (
          <div key={k} className="fb-chance-row">
            <span className="fb-chance-k">{k}</span>
            <span className="fb-chance-track">
              <i className="fb-chance-rng" style={{ left: c.lo * 100 + '%', width: (c.hi - c.lo) * 100 + '%' }} />
              <i className={cx('fb-chance-pt', k === 'Raw' && 'is-raw')} style={{ left: v * 100 + '%' }} />
            </span>
            <span className="fb-chance-v"><b>{P1(v)}</b> {chanceShort(v, c)}</span>
          </div>
        );
      })}
      </div>
      <p className="fb-note">Band: what chance alone gives (5th–95th percentile of {'2,000'} reshuffles of the year labels, the same for every place). {baseRate(s)} {s.n.toLocaleString('en')} places; {s.excludedHigh} not harmonized (local correction factor above 4×). A record is one year, not a trend.</p>
    </div>
  );
}

export const Evidence = memo(function Evidence({ Z, S, official, country, zoneName, reference, sel, onSelect, from, to, fellBack, phone, whole, box }) {
  const [p4r, setP4] = useState('chance');
  if (!Z || Z.empty) return <div className="fb-emptystate is-tab"><p>No evidence to show for this box: it holds no detections.</p></div>;
  const borrowed = Z.gradeWhy === 'borrowed';
  const s = S ? (whole ? S.summary : cellSummary(S.cells, S, box)) : null;
  const sCountry = S ? S.summary : null;
  const useBox = !whole && s && s.n >= 30;
  const recS = useBox ? s : sCountry;
  // Fourth panel (v6, judge C5): Records, Official (Canada) and By month (both countries, when harmonized).
  const opts4 = [['chance', 'Records']].concat(official ? [['official', 'Official']] : [], Z.harmOK && Z.byMonth ? [['month', 'Monthly']] : []);
  const alt4 = opts4.length > 1;
  const p4 = opts4.some((o) => o[0] === p4r) ? p4r : 'chance';
  return (
    <div className="fb-evgrid">
      <section className="fb-panel fb-evpanel" aria-labelledby="ev1">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev1">{proofHeading(Z, official)}</h2>
          <Info id="fb-ev1-i" label="About these bars">
            <p>Fire detections after 2012 ÷ before (mean year 2012–{LAST} ÷ 2003–2011), one log scale around 1×{official ? '; the official series is independent of both sensors' : ''}.</p>
            {Z.harmOK && Z.guard && <p>No rise is given for this zone: {Z.guard}.</p>}
            {Z.harmOK && Z.trend && !Z.guard && <p>{Z.trend.status === 'robust' ? 'The change holds when years are resampled (90% range ' + bootRange(Z.trend) + ') and without ' + Z.trend.bigYear + ' (' + xr(Z.trend.without) + ').' : 'The trend is uncertain: ' + xr(Z.trend.without) + ' without ' + Z.trend.bigYear + ', 90% range ' + bootRange(Z.trend) + '. The correction factor (' + F2(Z.ratio) + ') itself is robust.'}</p>}
            <p>Aqua alone does not change sensor in 2012: a consistency check, not a validation.</p>
          </Info></div>
        <div className="fb-evfill"><RiseBars Z={Z} official={official} big={!phone} /></div>
        {Z.harmOK && Z.guard && <p className="fb-evnote">No rise is given for this zone: {Z.guard}.</p>}
        {Z.harmOK && Z.trend && !Z.guard && <p className="fb-evnote">{Z.trend.status === 'robust' ? 'Without ' + Z.trend.bigYear + ', its largest year: ' + xr(Z.trend.without) + '.' : 'Trend uncertain: ' + xr(Z.trend.without) + ' without ' + Z.trend.bigYear + ', 90% range ' + bootRange(Z.trend) + '; the correction factor itself is robust.'}</p>}
        <ProvenanceLine status={Z.harmOK ? 'computed' : 'real'} source="NASA FIRMS" period={'2003–' + LAST}>
          {!reference && <span>counts not re-checked against the original FIRMS points here (done for the three Québec reference zones)</span>}
        </ProvenanceLine>
      </section>
      <section className="fb-panel fb-evpanel" aria-labelledby="ev2">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev2">{looHeading(Z)}</h2>
          <Info id="fb-ev2-i" label="About this test"><p>Each usable overlap year is left out and predicted from the others: MODIS of that year × the correction factor of the other years, against what VIIRS measured{borrowed ? ' (wider area: the factor is borrowed)' : ''}. Cell-days per year, log scale; the label is the error of the prediction.</p></Info></div>
        <div className="fb-evfill"><ErrorStrip Z={Z} /></div>
        {Z.loo && Z.loo.length > 0 && <p className="fb-evnote">Median error {PCT(Z.medErr)}{Z.holdout ? ' · factor from 2012–2018 tested on 2019–' + LAST + ': ' + PCT(Z.holdout.medErr) : ''}{Z.monthly ? ' · month by month (' + Z.monthly.n + ' months, each with 30 or more fire detections in both records): ' + PCT(Z.monthly.medErr) : ''}.</p>}
        <ProvenanceLine status="computed" source="NASA FIRMS" period={SW + '–' + LAST} />
      </section>
      <MonthRow cls="fb-panel fb-evpanel fb-evmonth" phone={phone} fellBack={fellBack} Z={Z} sel={sel} onSelect={onSelect} from={from} to={to} />
      <section className="fb-panel fb-evpanel" aria-labelledby="ev4">
        <div className="fb-evtop"><h2 className="fb-evh" id="ev4">{p4 === 'chance' ? recordsHeading(recS, versus) : p4 === 'official' ? 'Year by year against official area burned' : 'The correction factor by month'}</h2>
          {alt4 && <div className="fb-seg2 is-sm" role="radiogroup" aria-label="Fourth panel">{opts4.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={p4 === v} className={cx('fb-seg2-i', p4 === v && 'is-on')} onClick={() => setP4(v)}>{l}</button>)}</div>}
        </div>
        {p4 === 'chance' ? (
          <>
            <p className="fb-evsub">Places whose record year is 2012 or later, {useBox ? 'in this box (' + recS.n + ' places)' : (country === 'canada' ? 'Canada' : 'Argentina') + (whole || !s ? '' : ' (this box has ' + (s ? s.n : 0) + ' places: too few)')}, {STATS_FROM}–{LAST}.</p>
            <div className="fb-evfill"><ChanceChart s={recS} label={useBox ? zoneName : country} /></div>
          </>
        ) : p4 === 'official' ? (
          <div className="fb-evfill"><IndexChart off={official} /></div>
        ) : (
          <div className="fb-evfill">
            <p className="fb-evsub">VIIRS ÷ MODIS for each calendar month, against the single factor {F2(Z.ratio)} used for all months.</p>
            <div className="fb-bmstrip" role="img" aria-label={'VIIRS ÷ MODIS by calendar month: ' + Z.byMonth.map((x) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.m] + ' ' + (x.ratio == null ? 'no data' : F2(x.ratio))).join(', ')}>
              {Z.byMonth.map((x) => <span key={x.m} className={cx(!x.active && 'is-quiet', x.active && x.resid != null && (x.resid > 1.3 || x.resid < 1 / 1.3) && 'is-off')}><b>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][x.m]}</b>{x.ratio == null ? '—' : F2(x.ratio)}</span>)}
            </div>
            <p className="fb-note">Exact in annual totals by construction; outlined months are off the single factor by more than 1.3×. Grey: too few detections.</p>
          </div>
        )}
      </section>
    </div>
  );
});
