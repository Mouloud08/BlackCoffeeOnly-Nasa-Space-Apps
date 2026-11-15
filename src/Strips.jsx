// v5.1 charts drawn in HTML (text from the type scale, never scaled with a viewBox; audit-v5 E3, E5).
import { F2, PCT, SPCT } from './copy.js';
import { formatShort } from '../ds/components/src/scale.js';
import { useRef, useLayoutEffect, useState } from 'react';
import { outlines } from './geo.js';
import { ringsPathP } from './MapPanel.jsx';
import { cssColor } from './util.jsx';

const sgn = (e) => SPCT(e);
const yl = (y, n) => (n > 10 ? '’' + String(y).slice(2) : String(y));

// Leave-one-out test as an error strip: each usable overlap year predicted from the others, error around 0 %,
// with the ±10 % band shaded. This chart is shown once, in Evidence (How it works and Method point to it).
export function ErrorStrip({ Z }) {
  const rows = (Z.loo || []).filter((r) => r.signed != null);
  if (!rows.length) return <p className="fb-note">Too few usable overlap years here to run the test.</p>;
  const m = Math.max(0.15, ...rows.map((r) => Math.abs(r.signed))) * 1.12;
  const Y = (e) => 50 - (e / m) * 50; // % from top
  const ticks = [-0.2, -0.1, 0, 0.1, 0.2].filter((t) => Math.abs(t) <= m);
  const n = rows.length;
  return (
    <div className="fb-err" role="img" aria-label={'Error of the prediction for each usable overlap year, ' + rows.map((r) => r.year + ' ' + sgn(r.signed)).join(', ') + '. Median error ' + PCT(Z.medErr) + '.'}>
      <div className="fb-err-plot">
        <div className="fb-err-axis" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ top: Y(t) + '%' }}>{t === 0 ? '0' : sgn(t)}</span>)}</div>
        <div className="fb-err-area">
          <i className="fb-err-band" style={{ top: Y(0.1) + '%', bottom: (100 - Y(-0.1)) + '%' }}><em>±10%</em></i>
          <i className="fb-err-zero" style={{ top: '50%' }} />
          {rows.map((r, i) => (
            <span key={r.year} className="fb-err-pt" style={{ left: ((i + 0.5) / n) * 100 + '%', top: Y(r.signed) + '%' }} title={r.year + ': predicted ' + formatShort(r.predicted, 'en') + ', measured ' + formatShort(r.viirs, 'en') + ' (' + sgn(r.signed) + ')'}>
              <i /><b className={Y(r.signed) > 78 ? 'is-side' : r.signed >= 0 ? 'is-up' : 'is-down'}>{sgn(r.signed)}</b>
            </span>
          ))}
        </div>
      </div>
      <div className="fb-err-years" aria-hidden="true"><span /><div>{rows.map((r, i) => <span key={r.year} style={{ left: ((i + 0.5) / n) * 100 + '%' }}>{(n <= 10 || i % 2 === 0 || i === n - 1) ? yl(r.year, n) : ''}</span>)}</div></div>
      <p className="fb-err-key">Each dot: one year left out and predicted from the others (MODIS × the ratio of the other years) against what VIIRS measured. Band: ±10%.</p>
    </div>
  );
}

// The ratio year by year (VIIRS ÷ MODIS on each usable overlap year) around the pooled ratio: the "bridge" itself.
export function RatioStrip({ Z }) {
  const rows = (Z.usable || []).filter((r) => r.modis > 0);
  if (!rows.length) return <p className="fb-note">Too few usable overlap years here.</p>;
  const rs = rows.map((r) => r.viirs / r.modis);
  const lo = Math.min(Z.ratio, ...rs) * 0.85, hi = Math.max(Z.ratio, ...rs) * 1.1;
  const Y = (v) => 100 - ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * 100;
  const n = rows.length;
  const ticks = [1, 1.5, 2, 2.5, 3, 4, 5].filter((t) => t > lo && t < hi);
  return (
    <div className="fb-err fb-ratio" role="img" aria-label={'VIIRS ÷ MODIS for each usable overlap year: ' + rows.map((r, i) => r.year + ' ' + F2(rs[i])).join(', ') + '. Pooled ratio ' + F2(Z.ratio) + '.'}>
      <div className="fb-err-plot">
        <div className="fb-err-axis" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ top: Y(t) + '%' }}>{t}×</span>)}</div>
        <div className="fb-err-area">
          <i className="fb-err-zero is-ratio" style={{ top: Y(Z.ratio) + '%' }} />{/* its value is in the key below: a label on the line overlapped the dots' labels */}
          {rows.map((r, i) => (
            <span key={r.year} className="fb-err-pt" style={{ left: ((i + 0.5) / n) * 100 + '%', top: Y(rs[i]) + '%' }} title={r.year + ': VIIRS ' + formatShort(r.viirs, 'en') + ' ÷ MODIS ' + formatShort(r.modis, 'en') + ' = ' + F2(rs[i])}>
              <i /><b>{F2(rs[i])}</b>
            </span>
          ))}
        </div>
      </div>
      <div className="fb-err-years" aria-hidden="true"><span /><div>{rows.map((r, i) => <span key={r.year} style={{ left: ((i + 0.5) / n) * 100 + '%' }}>{(n <= 10 || i % 2 === 0 || i === n - 1) ? yl(r.year, n) : ''}</span>)}</div></div>
      <p className="fb-err-key">Each dot: how many times more fire the newer satellite saw than the older one, in one year when both flew. Line: the factor from all years together ({F2(Z.ratio)}×), used for the correction.</p>
    </div>
  );
}

// Record years, raw or harmonized, as a small static map (How it works, step 4): 0.5° places on the country outline.
export function RecordMini({ S, country, harm, label, count }) {
  const ref = useRef(null), box = useRef(null);
  const [sz, setSz] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current; if (!el) return undefined;
    const ro = new ResizeObserver((es) => { const r = es[0].contentRect; setSz({ w: Math.floor(r.width), h: Math.floor(r.height) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const c = ref.current; if (!c || !sz.w || !S) return;
    const E = S.cells.filter((q) => q.eligible);
    const f = { s: Math.min(...E.map((q) => q.lat)) - 0.5, n: Math.max(...E.map((q) => q.lat)) + 1, w: Math.min(...E.map((q) => q.lon)) - 0.5, e: Math.max(...E.map((q) => q.lon)) + 1 };
    const k = Math.cos(((f.s + f.n) / 2) * Math.PI / 180), pad = 0.04;
    const sc = Math.min((sz.w * (1 - 2 * pad)) / ((f.e - f.w) * k), (sz.h * (1 - 2 * pad)) / (f.n - f.s));
    const cx = (f.w + f.e) / 2, cy = (f.s + f.n) / 2;
    const P = { x: (lon) => sz.w / 2 + (lon - cx) * k * sc, y: (lat) => sz.h / 2 - (lat - cy) * sc };
    const dpr = window.devicePixelRatio || 1;
    c.width = sz.w * dpr; c.height = sz.h * dpr;
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, sz.w, sz.h);
    const o = outlines()[country];
    if (o) { g.fillStyle = cssColor('--map-land'); g.fill(new Path2D(ringsPathP(o.self, o.q, P))); }
    const cB = cssColor('--rec-before'), cS = cssColor('--rec-since'), cN = cssColor('--rec-nb');
    const w = Math.max(1, 0.5 * k * sc - 0.4), h = Math.max(1, 0.5 * sc - 0.4);
    for (const q of E) { g.fillStyle = q.high ? cN : (harm ? q.eraHarm : q.eraRaw) === 'since' ? cS : cB; g.fillRect(P.x(q.lon), P.y(q.lat + 0.5), w, h); }
  }, [S, country, harm, sz.w, sz.h]);
  return (
    <figure className="fb-recmini">
      <figcaption><b>{label}</b> · record since 2012 in {count}</figcaption>
      <div className="fb-recmini-c" ref={box}><canvas ref={ref} style={{ width: sz.w + 'px', height: sz.h + 'px' }} aria-hidden="true" /></div>
    </figure>
  );
}
