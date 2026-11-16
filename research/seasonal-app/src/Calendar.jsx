// The calendar card (SPEC §5): DS BurnCalendar on a log bar scale, view switch, date range, legend, quiet exports.
import { useRef, useEffect, useState } from 'react';
import { BurnCalendar, ColorLegend, Segmented, ProvenanceLine } from '../ds/components/src/components.jsx';
import { FIRST, LAST, SW, NM, END_KEY, monthKey, monthIndex, partialLabel } from './metrics.js';
import { F2, PCT, monthLong } from './copy.js';
import { cx, Icon, IC, copyText } from './util.jsx';

const monthKeys = () => Array.from({ length: NM }, (_, i) => monthKey(i));

export function SkeletonCal({ phone }) {
  return (
    <div className={cx('fb-skel-cal', phone && 'is-phone')} aria-hidden="true">
      <div className="fb-skel-barsrow"><span /><i /></div>
      {Array.from({ length: 12 }, (_, m) => <div key={m} className="fb-skel-row"><span /><div>{Array.from({ length: 25 }, (_, y) => <i key={y} className="at-cell at-cell-zero" />)}</div></div>)}
    </div>
  );
}

export function RangeSelects({ from, to, onChange }) {
  return (
    <div className="fb-range" role="group" aria-label="Date range">
      <label><span className="at-sr">From</span>
        <select className="at-select fb-ym" value={from} onChange={(e) => onChange(e.target.value, e.target.value > to ? e.target.value : to)}>
          {monthKeys().map((k) => <option key={k} value={k}>{k}</option>)}
        </select></label>
      <span className="fb-range-arrow" aria-hidden="true">→</span>
      <label><span className="at-sr">To</span>
        <select className="at-select fb-ym" value={to} onChange={(e) => onChange(e.target.value < from ? e.target.value : from, e.target.value)}>
          {monthKeys().map((k) => <option key={k} value={k}>{k}</option>)}
        </select></label>
    </div>
  );
}

export function CalendarCard({ cover, Z, cd, C, country, view, setView, from, to, setRange, sel, onSelect, onExport, phone, short, zoneLabel, hotOpen }) {
  const [active, setActive] = useState(null);
  const scroller = useRef(null);
  const harm = Z && Z.harmOK;
  const v = harm ? view : 'raw';
  const y0 = +from.slice(0, 4), y1 = +to.slice(0, 4);
  const selKey = monthKey(sel);
  const gapKey = Z && Z.gapSet ? [active && active.key, selKey].find((k) => k && Z.gapSet.has(monthIndex(k))) : null;
  const jul = !!gapKey;
  const [flash, setFlash] = useState(false);
  const prevView = useRef(v);
  useEffect(() => { if (prevView.current !== v && (prevView.current === 'raw' || v === 'raw')) { setFlash(true); const t = setTimeout(() => setFlash(false), 450); prevView.current = v; return () => clearTimeout(t); } prevView.current = v; return undefined; }, [v]);
  const narrowed = from !== '2001-01' || to !== END_KEY;
  const opts = harm ? [{ value: 'raw', label: 'Raw' }, { value: 'harmonized', label: 'Harmonized' }, { value: 'anomaly', label: 'Anomaly' }] : [{ value: 'raw', label: 'Raw' }];
  const sub = !Z ? 'Reading the detection tiles' : Z.empty ? '\u00a0' : !harm ? 'MODIS to January 2012, then VIIRS · raw only: not comparable across 2012' : v === 'raw' ? 'MODIS to January 2012, then VIIRS (S-NPP from 20 Jan 2012), not corrected · cell-days per month' : v === 'harmonized' ? 'MODIS × month factor (' + F2(Z.ratio) + ' over a year) to January 2012, VIIRS from February 2012 · cell-days per month' : 'Each month ÷ a typical month (the median of the same month, 2003–' + LAST + ')';
  const status = jul ? (() => { const i = monthIndex(gapKey), g = (Z.gaps || []).find((x) => x.i === i); return monthLong(i % 12) + ' ' + (FIRST + Math.floor(i / 12)) + ': NOAA-20 used, S-NPP outage (S-NPP ' + Math.round((1 - 1 / g.ratio) * 100) + '% below NOAA-20 country-wide).'; })() : '';
  return (
    <section className={cx('fb-card fb-cal', short && 'is-short')} id="calendar" aria-labelledby="fb-cal-t">
      <div className="fb-cal-head">
        <h2 id="fb-cal-t" className="fb-card-title">Burning calendar</h2>
        <Segmented ariaLabel="Calendar view" value={v} onChange={setView} options={opts} />
        <RangeSelects from={from} to={to} onChange={setRange} />
      </div>
      <p className="fb-cal-sub">{sub}</p>
      <p className="fb-cal-sub fb-cal-sub2"><span>{cd && harm && v !== 'anomaly' && !Z.empty ? 'Harmonized changes the colour class of ' + cd.changed + ' of ' + cd.preMonths + ' months before 2012.' : '\u00a0'}</span>{partialLabel() ? <span title="Shown in the calendar and the month row; not used in annual statistics (rise, ratio, typical month).">{partialLabel()}</span> : null}</p>
      <div className={cx('fb-cal-body', phone && 'is-phone', flash && 'is-flash')} ref={scroller} tabIndex={phone ? 0 : undefined} role={phone ? 'region' : undefined} aria-label={phone ? 'Calendar, scrolls sideways' : undefined}>
        <div className="fb-cal-min">
          {Z && (Z.empty || (cover && cover.inside === 0)) ? <p className="fb-cal-empty">{cover && cover.inside === 0 ? 'Outside the country data: no tiles here.' : 'No detections in this box, 2001–' + LAST + '.'}</p> : cd ? (
            <BurnCalendar data={cd} mode={v === 'raw' ? 'raw' : 'harmonized'} view={v === 'anomaly' ? 'anomaly' : 'counts'} locale="en" barScale="log"
              annotate={harm && y0 <= 2011 && y1 >= SW} selectMode pinned={FIRST + Math.floor(sel / 12) >= y0 && FIRST + Math.floor(sel / 12) <= y1 ? selKey : null}
              onPin={(k) => k && onSelect(monthIndex(k))} onActive={setActive} cellHeight={phone ? 14 : short ? 14 : 16} barHeight={phone ? 84 : short ? 56 : 80} keyInFootAt={99999} compact={phone} />
          ) : <SkeletonCal phone={phone} />}
        </div>
      </div>
      <div className="fb-cal-foot">
        {!(Z && Z.empty) && <div className="fb-legend-row">
          <ColorLegend view={v === 'anomaly' ? 'anomaly' : 'counts'} compact locale="en" steps={cd ? cd.breaks : undefined} unit={v === 'anomaly' ? '× a typical month' : 'cell-days per month'} />
          <p className={cx('fb-status', jul && 'is-flag')} aria-live="polite">{status || (() => {
            const notes = [];
            if (Z && Z.harmOK && Z.seamWarn && v !== 'raw') notes.push('Months outside the fire season are less well bridged — see Method.');
            if (Z && Z.emptyNote) notes.push('Empty months before 2012 can be fires too small for MODIS, not an absence of fire.');
            return notes.length ? 'Hatched: before 2003. ' + notes.join(' ') : short ? 'Hatched: before 2003, not in statistics. Colour-blind safe (simulated).' : 'Hatched: before 2003, partial MODIS, not in statistics. Classes stay distinct in simulated colour blindness.';
          })()}</p>
        </div>}
        <div className="fb-quiet" role="group" aria-label={'Exports for ' + zoneLabel}>
          <button type="button" className="at-btn at-btn-ghost" disabled={!Z || Z.empty} onClick={() => onExport('csv')}><Icon d={IC.dl} />Series CSV</button>
          <button type="button" className="at-btn at-btn-ghost" disabled={!Z || Z.empty} onClick={() => onExport('png')}><Icon d={IC.dl} />Calendar image</button>
          <button type="button" className="at-btn at-btn-ghost" disabled={!Z || Z.empty} onClick={() => onExport('hot')} aria-expanded={!!hotOpen}>Raw hotspots…</button>
        </div>
        <div className="fb-cal-actions">
          <ProvenanceLine status={v === 'raw' || !harm ? 'real' : 'computed'} source="NASA FIRMS" period={y0 + '–' + y1}>
            {v !== 'raw' && harm && <span>before 2012 computed</span>}
          </ProvenanceLine>
        </div>
      </div>
    </section>
  );
}

export function HotPanel({ text, box, from, to, onClose, phone }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); }, []);
  return (
    <section className="fb-card fb-hot" id="fb-hot" aria-labelledby="fb-hot-t" tabIndex={-1} ref={ref}>
      <div className="fb-hot-body">
        <h2 id="fb-hot-t" className="fb-card-title">Raw hotspots for this box and period come from NASA FIRMS</h2>
        <p className="fb-hot-note">This prototype holds monthly 0.5° counts, not individual detections, so it does not make that file. Request the points from FIRMS with these values:</p>
        <pre className="fb-hot-pre at-mono">{text}</pre>
      </div>
      <div className="fb-hot-actions">
        <button type="button" className="at-btn" onClick={() => copyText(text).then((ok) => { setCopied(ok); setTimeout(() => setCopied(false), 2000); })}><Icon d={copied ? IC.check : IC.copy} />{copied ? 'Copied' : 'Copy request'}</button>
        <button type="button" className="at-btn at-btn-ghost at-btn-icon" aria-label="Close the hotspot panel" onClick={onClose}><Icon d={IC.x} /></button>
      </div>
    </section>
  );
}
