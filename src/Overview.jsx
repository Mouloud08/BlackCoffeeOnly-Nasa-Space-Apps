// Version 6 landing tab: the problem, the answer and the real data in one screen; one primary action (Open the dashboard).
// Every figure comes from the metrics of the whole selected country (the same Z the Dashboard uses for that preset).
import { memo, useEffect, useRef, useState } from 'react';
import { LAST, FIRST, SW, STATS_FROM, endLabel } from './metrics.js';
import { X, F2, NUM, xr, bootRange, overviewHeadline, ratioWords } from './copy.js';
import { formatShort } from '../ds/components/src/scale.js';
import { cx, Icon, IC, reduced } from './util.jsx';

const NAME = { canada: 'Canada', argentina: 'Argentina' };

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
  const label = NAME[country] + ', fire activity per year ' + STATS_FROM + '–' + LAST + ' (detected hot-spot cell-days). Mean per year 2003–2011: ' + NUM(L.harmonized.before) + ' harmonized, ' + NUM(L.raw.before) + ' raw; 2012–' + LAST + ': ' + NUM(L.harmonized.after) + '. Change: harmonized ' + X(Z.riseH) + ', raw ' + X(Z.riseRaw) + '; the sensor ratio is ' + F2(Z.ratio) + '.';
  return (
    <figure className={cx('fb-ov-chart', animate && 'is-anim', raw && 'is-raw')} role="img" aria-label={label}>
      <div className="fb-ov-plot">
        <div className="fb-ov-y" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ bottom: P(t) + '%' }}>{t ? formatShort(t, 'en') : '0'}</span>)}</div>
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
          <i className="fb-ov-seam" style={{ left: seamX + '%' }}><em>sensor change</em></i>
          <i className="fb-ov-level is-before" style={{ left: col(STATS_FROM - FIRST) + '%', width: (seamX - col(STATS_FROM - FIRST)) + '%', bottom: P(L[solid].before) + '%' }}><em>{NUM(L[solid].before)}</em></i>
          <i className="fb-ov-level is-ghost" style={{ left: col(STATS_FROM - FIRST) + '%', width: (seamX - col(STATS_FROM - FIRST)) + '%', bottom: P(L[raw ? 'harmonized' : 'raw'].before) + '%' }}><em>{raw ? 'harmonized ' : 'raw '}{NUM(L[raw ? 'harmonized' : 'raw'].before)}</em></i>
          <i className="fb-ov-level is-after" style={{ left: seamX + '%', width: (100 - seamX) + '%', bottom: P(L[solid].after) + '%' }}><em>{NUM(L[solid].after)}</em></i>
        </div>
      </div>
      <div className="fb-ov-x" aria-hidden="true"><span />{(phone ? [FIRST, SW, LAST] : [FIRST, 2005, SW, 2018, LAST]).map((y) => <span key={y} style={{ left: (col(y - FIRST) + cw / 2) + '%' }}>{y}</span>)}</div>
    </figure>
  );
}

export const Overview = memo(function Overview({ Z, country, official, raw, peek, onCountry, onPeek, onToggleView, onOpen, onHow, onMethod, phone }) {
  // Load animation: once per mount, never under reduced motion or anim=0.
  const [anim, setAnim] = useState(() => !reduced());
  useEffect(() => { const t = setTimeout(() => setAnim(false), 900); return () => clearTimeout(t); }, []);
  const held = useRef(false);
  const end = () => { if (held.current) { held.current = false; onPeek(false); } };
  useEffect(() => { window.addEventListener('blur', end); return () => window.removeEventListener('blur', end); });
  const name = NAME[country];
  if (!Z) return <div className="fb-ov is-skel" aria-hidden="true"><div className="fb-ov-chart" /></div>;
  const head = overviewHeadline(name, Z.riseH, Z.riseRaw);
  const T = Z.trend;
  return (
    <div className="fb-ov">
      <div className="fb-ov-top">
        <p className="fb-ov-eyebrow">MODIS → VIIRS · the 2012 sensor change</p>
        <div className="fb-seg2 fb-ov-country" role="radiogroup" aria-label="Country">
          {['canada', 'argentina'].map((c) => <button key={c} type="button" role="radio" aria-checked={country === c} className={cx('fb-seg2-i', country === c && 'is-on')} onClick={() => onCountry(c)}>All of {NAME[c]}</button>)}
        </div>
      </div>
      {/* v6.1: on the phone the figures and the primary button come before the chart (visible without scrolling at
          390×844 and 360×740); the lede and the honest line follow the chart. Desktop order unchanged. */}
      {phone ? <>
      <div className="fb-ov-head">
        <div>
          <h1 className="fb-ov-h">{head.text}</h1>
          <p className="fb-ov-sub">Mean year 2012–{LAST} vs 2003–2011, in detected fire activity (1 km cells with fire, per day).</p>
        </div>
      </div>
      <div className="fb-ov-figs" key={'f-' + country}>
        <dl className="fb-ov-pair">
          <div><dt>harmonized <span className="fb-ov-gl">(both on the same scale)</span></dt><dd className="fb-ov-v">{X(Z.riseH)}</dd><dd className="fb-ov-s">{T && T.lo != null ? '90% range ' + bootRange(T) + ' · ' + xr(T.without) + ' without ' + T.bigYear : ''}</dd></div>
          <div><dt>raw</dt><dd className="fb-ov-v is-raw">{X(Z.riseRaw)}</dd><dd className="fb-ov-s">the two records simply joined</dd></div>
        </dl>
        <p className="fb-ov-check">{official
          ? <><b>Independent check</b> · official area burned {official.after[0]}–{official.after[1]}: <b>{X(official.rise)}</b> (ours on the same years: {X(official.harm)}) · a different quantity</>
          : <>No independent official series for {name}: this result rests on the MODIS record alone.</>}</p>
      </div>
      <div className="fb-ov-act">
        <button type="button" className="fb-ov-open" onClick={onOpen}>Open the calendar and map<Icon d={IC.arrow} /></button>
        <button type="button" className="at-link" onClick={onHow}>How it works</button>
        <button type="button" className="at-link" onClick={onMethod}>Method</button>
      </div>
      {/* keyed by country (v6, CLS): a country change replaces the bars and figures instead of moving them */}
      <OverviewChart key={'c-' + country} Z={Z} raw={raw} country={country} animate={anim} phone={phone} />
      <div className="fb-ov-hold">
        <button type="button" className="fb-ov-holdbtn" aria-pressed={raw}
          onPointerDown={(e) => { if (e.pointerType === 'touch') return; e.currentTarget.setPointerCapture(e.pointerId); held.current = true; onPeek(true); }}
          onPointerUp={(e) => { if (e.pointerType === 'touch') { onToggleView(); return; } end(); }} onPointerCancel={end} onLostPointerCapture={end}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); held.current = true; onPeek(true); } }}
          onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }}>
          <Icon d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />{phone ? (raw ? 'Showing the raw record · tap for harmonized' : 'Tap to see the raw record') : raw && !peek ? 'Raw record shown (top-bar switch) · hold to compare' : 'Hold to see the raw record'}
        </button>
        <span className="fb-muted">{phone ? '' : 'or hold R'}</span>
        <div className="fb-ov-key" aria-hidden="true">
      <span><i className="fb-ov-k is-solid" />{raw ? 'raw record (shown)' : 'harmonized record'}</span>
      <span><i className="fb-ov-k is-ghost" />{raw ? 'harmonized' : 'raw'}, before 2012</span>
      <span><i className="fb-ov-k is-level" />mean per year</span>
      {phone && <span><i className="fb-ov-k is-level is-dash" />{raw ? 'harmonized' : 'raw'} mean, before 2012</span>}
      <span className="fb-muted">fire detections a year</span>
      <span className="fb-muted" title="January 2012 is a partial VIIRS month: the harmonized record computes it from MODIS, so its mean after 2012 differs slightly from the raw one.">Jan 2012 estimated from MODIS</span>
        </div>
      </div>
      <div className="fb-ov-head is-lede">
        <div>
          <p className="fb-ov-lede">In 2012 a sharper satellite sensor (VIIRS) took over from MODIS and sees {ratioWords(Z.ratio)} fire detections. FireBridge puts both records on one scale, so a trend is a trend.</p>
          <p className="fb-ov-honest">For a single before/after number, harmonizing equals reading MODIS alone. The bridge matters for the calendar, the monthly ranks and the years after MODIS ends.</p>
        </div>
      </div>
      <div className="fb-ov-act is-foot">
        <p className="fb-ov-foot fb-def">Fire activity = detected hot-spot cell-days (1 km cells with fire, per day), not area burned · NASA FIRMS MODIS C6.1 and VIIRS 375 m, 2001 to {endLabel()} · Runs offline: no data leaves this page · BlackCoffeeOnly · NASA Space Apps Challenge 2026</p>
      </div>
      </> : <>
      <div className="fb-ov-head">
        <div>
          <h1 className="fb-ov-h">{head.text}</h1>
          <p className="fb-ov-sub">Mean year 2012–{LAST} vs 2003–2011, in detected fire activity (1 km cells with fire, per day).</p>
        </div>
        <div>
          <p className="fb-ov-lede">In 2012 a sharper satellite sensor (VIIRS) took over from MODIS and sees {ratioWords(Z.ratio)} fire detections. FireBridge puts both records on one scale, so a trend is a trend.</p>
          <p className="fb-ov-honest">For a single before/after number, harmonizing equals reading MODIS alone. The bridge matters for the calendar, the monthly ranks and the years after MODIS ends.</p>
        </div>
      </div>
      {/* keyed by country (v6, CLS): a country change replaces the bars and figures instead of moving them */}
      <OverviewChart key={'c-' + country} Z={Z} raw={raw} country={country} animate={anim} phone={phone} />
      <div className="fb-ov-hold">
        <button type="button" className="fb-ov-holdbtn" aria-pressed={raw}
          onPointerDown={(e) => { if (e.pointerType === 'touch') return; e.currentTarget.setPointerCapture(e.pointerId); held.current = true; onPeek(true); }}
          onPointerUp={(e) => { if (e.pointerType === 'touch') { onToggleView(); return; } end(); }} onPointerCancel={end} onLostPointerCapture={end}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); held.current = true; onPeek(true); } }}
          onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }}>
          <Icon d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />{phone ? (raw ? 'Showing the raw record · tap for harmonized' : 'Tap to see the raw record') : raw && !peek ? 'Raw record shown (top-bar switch) · hold to compare' : 'Hold to see the raw record'}
        </button>
        <span className="fb-muted">{phone ? '' : 'or hold R'}</span>
        <div className="fb-ov-key" aria-hidden="true">
      <span><i className="fb-ov-k is-solid" />{raw ? 'raw record (shown)' : 'harmonized record'}</span>
      <span><i className="fb-ov-k is-ghost" />{raw ? 'harmonized' : 'raw'}, before 2012</span>
      <span><i className="fb-ov-k is-level" />mean per year</span>
      {phone && <span><i className="fb-ov-k is-level is-dash" />{raw ? 'harmonized' : 'raw'} mean, before 2012</span>}
      <span className="fb-muted">fire detections a year</span>
      <span className="fb-muted" title="January 2012 is a partial VIIRS month: the harmonized record computes it from MODIS, so its mean after 2012 differs slightly from the raw one.">Jan 2012 estimated from MODIS</span>
        </div>
      </div>
      <div className="fb-ov-figs" key={'f-' + country}>
        <dl className="fb-ov-pair">
          <div><dt>harmonized <span className="fb-ov-gl">(both on the same scale)</span></dt><dd className="fb-ov-v">{X(Z.riseH)}</dd><dd className="fb-ov-s">{T && T.lo != null ? '90% range ' + bootRange(T) + ' · ' + xr(T.without) + ' without ' + T.bigYear : ''}</dd></div>
          <div><dt>raw</dt><dd className="fb-ov-v is-raw">{X(Z.riseRaw)}</dd><dd className="fb-ov-s">the two records simply joined</dd></div>
        </dl>
        <p className="fb-ov-check">{official
          ? <><b>Independent check</b> · official area burned {official.after[0]}–{official.after[1]}: <b>{X(official.rise)}</b> (ours on the same years: {X(official.harm)}) · a different quantity</>
          : <>No independent official series for {name}: this result rests on the MODIS record alone.</>}</p>
      </div>
      <div className="fb-ov-act">
        <button type="button" className="fb-ov-open" onClick={onOpen}>Open the calendar and map<Icon d={IC.arrow} /></button>
        <button type="button" className="at-link" onClick={onHow}>How it works</button>
        <button type="button" className="at-link" onClick={onMethod}>Method</button>
        <p className="fb-ov-foot fb-def">Fire activity = detected hot-spot cell-days (1 km cells with fire, per day), not area burned · NASA FIRMS MODIS C6.1 and VIIRS 375 m, 2001 to {endLabel()} · Runs offline: no data leaves this page · BlackCoffeeOnly · NASA Space Apps Challenge 2026</p>
      </div>
      </>}
    </div>
  );
});
