// Zone picker (SPEC §6): Natural Earth outlines + our 0.5° detection grid in neutral grays, drag/keyboard box, presets, typed box.
import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Segmented } from '../ds/components/src/components.jsx';
import { countClass, formatNumber, formatDecimal } from '../ds/components/src/scale.js';
import { PRESETS, sameBox, LAST } from './metrics.js';
import { boxText, boxSize } from './copy.js';
import { dec } from './l10n.js';
import { outlines, makeProj, ringsPath } from './geo.js';
import { PLACES } from './places.js';
import { cx, cssColor } from './util.jsx';

const COUNTRIES = { canada: 'Canadá', argentina: 'Argentina' };
const snapDown = (v) => Math.floor(v * 2 + 1e-9) / 2, snapUp = (v) => Math.ceil(v * 2 - 1e-9) / 2;
const deg = (v, pos, neg) => dec(Math.abs(v), v % 1 ? 1 : 0) + '° ' + (v >= 0 ? pos : neg);

function MapView({ C, country, box, onBox, theme, phone }) {
  const wrap = useRef(null), cvs = useRef(null), svgRef = useRef(null);
  const [size, setSize] = useState({ w: 700, h: 380 });
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const ro = new ResizeObserver((es) => { const r = es[0].contentRect; if (r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const bb = C.bbox;
  // Whole country visible: frame = tile bbox + 1° margin (outlines reach slightly past the tiles); extra bottom room for the key.
  const P = useMemo(() => makeProj({ s: bb.s - 1, n: bb.n + 1, w: bb.w - 1, e: bb.e + 1 }, size.w, size.h, phone ? 8 : 12, phone ? 34 : 40), [bb, size.w, size.h, phone]);
  const paths = useMemo(() => {
    const o = outlines()[country];
    if (!o) return null;
    return { self: new Path2D(ringsPath(o.self, o.q, P)), others: new Path2D(ringsPath(o.others, o.q, P)) };
  }, [country, P]);
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size.w, size.h);
    const land = cssColor('--map-land'), border = cssColor('--map-border');
    if (paths) { g.fillStyle = land; g.fill(paths.others); g.fill(paths.self); }
    const ramp = Array.from({ length: 9 }, (_, k) => cssColor('--gray-' + k));
    const cw = 0.5 * P.k * P.sc, ch = 0.5 * P.sc;
    for (const t of C.tiles) {
      const k = countClass(t.mean, 'log');
      if (k < 0) continue;
      g.fillStyle = ramp[k];
      g.fillRect(P.x(t.lon), P.y(t.lat + 0.5), Math.max(0.8, cw - (cw > 4 ? 0.5 : 0)), Math.max(0.8, ch - (ch > 4 ? 0.5 : 0)));
    }
    if (paths) { g.lineWidth = 0.8; g.strokeStyle = border; g.stroke(paths.others); g.lineWidth = 1; g.stroke(paths.self); }
  }, [C, P, paths, theme, size.w, size.h]);

  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const pt = (e) => { const r = wrap.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const clampBox = (b) => ({ s: Math.max(bb.s, b.s), n: Math.min(bb.n, b.n), w: Math.max(bb.w, b.w), e: Math.min(bb.e, b.e) });
  const toBox = (a, b) => {
    const la = [P.lat(a.y), P.lat(b.y)], lo = [P.lon(a.x), P.lon(b.x)];
    const r = clampBox({ s: snapDown(Math.min(...la)), n: snapUp(Math.max(...la)), w: snapDown(Math.min(...lo)), e: snapUp(Math.max(...lo)) });
    if (r.n - r.s < 0.5) r.n = Math.min(bb.n, r.s + 0.5), r.s = r.n - 0.5;
    if (r.e - r.w < 0.5) r.e = Math.min(bb.e, r.w + 0.5), r.w = r.e - 0.5;
    return r;
  };
  const onDown = (e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); const p = pt(e); setDrag({ a: p, b: p }); setHover(null); };
  const onMove = (e) => {
    const p = pt(e);
    if (drag) { setDrag({ a: drag.a, b: p }); return; }
    const t = C.tileMap.get(Math.floor(P.lat(p.y) * 2) + ',' + Math.floor(P.lon(p.x) * 2));
    setHover(t ? { t, x: p.x, y: p.y } : null);
  };
  const onUp = () => {
    if (!drag) return;
    const { a, b } = drag; setDrag(null);
    if (Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 4) return; // a click is not a box
    onBox(toBox(a, b));
  };
  const onKey = (e) => {
    const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!d) return;
    e.preventDefault();
    const st = 0.5;
    let nb;
    if (e.shiftKey) {
      nb = { s: box.s, w: box.w, n: box.n + d[1] * st, e: box.e + d[0] * st };
      if (nb.n - nb.s < 0.5 || nb.e - nb.w < 0.5 || nb.n > bb.n || nb.e > bb.e) return;
    } else {
      nb = { s: box.s + d[1] * st, n: box.n + d[1] * st, w: box.w + d[0] * st, e: box.e + d[0] * st };
      if (nb.s < bb.s || nb.n > bb.n || nb.w < bb.w || nb.e > bb.e) return;
    }
    onBox(nb);
  };
  const live = drag && Math.abs(drag.a.x - drag.b.x) + Math.abs(drag.a.y - drag.b.y) >= 4 ? toBox(drag.a, drag.b) : null;
  const shown = live || box;
  const R = { x: P.x(shown.w), y: P.y(shown.n), w: Math.max(2, P.x(shown.e) - P.x(shown.w)), h: Math.max(2, P.y(shown.s) - P.y(shown.n)) };
  const labelAbove = R.y > 26;
  const label = live ? boxText(live) + ' · ' + boxSize(live) : boxSize(box);
  const labelLeft = Math.min(Math.max(4, R.x), size.w - 8 - Math.min(size.w - 12, label.length * 7.2));
  // Place labels: greedy, in list order; a label is dropped rather than overlap another label, the selection's edges,
  // its size label or the map key. Dots stay at the true coordinates.
  const places = (() => {
    const taken = [], out = [], cw = 6.6, lh = 14;
    const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const selTop = labelAbove ? R.y - 24 : R.y + R.h + 6;
    const avoid = [
      { x: labelLeft - 2, y: selTop - 2, w: Math.min(size.w - 12, label.length * 7.2) + 20, h: 26 },
      { x: 0, y: size.h - (phone ? 40 : 44), w: phone ? 230 : 250, h: 44 },
      { x: R.x - 5, y: R.y - 5, w: R.w + 10, h: 10 }, { x: R.x - 5, y: R.y + R.h - 5, w: R.w + 10, h: 10 },
      { x: R.x - 5, y: R.y - 5, w: 10, h: R.h + 10 }, { x: R.x + R.w - 5, y: R.y - 5, w: 10, h: R.h + 10 },
    ];
    for (const [name, lat, lon] of PLACES[country] || []) {
      const x = P.x(lon), y = P.y(lat), w = name.length * cw + 2;
      if (x < 4 || x > size.w - 4 || y < 4 || y > size.h - 4) continue;
      const dot = { x: x - 3, y: y - 3, w: 6, h: 6 };
      if (avoid.slice(2).some((a) => hit(dot, a))) continue;
      const cands = [{ x: x + 5, y: y - lh / 2, a: 'start' }, { x: x - 5 - w, y: y - lh / 2, a: 'end' }, { x: x - w / 2, y: y - 4 - lh, a: 'middle' }, { x: x - w / 2, y: y + 4, a: 'middle' }];
      const c = cands.find((q) => { const r = { x: q.x, y: q.y, w, h: lh }; return r.x >= 2 && r.x + w <= size.w - 2 && r.y >= 2 && r.y + lh <= size.h - 2 && !taken.some((t) => hit(r, t)) && !avoid.some((t) => hit(r, t)); });
      if (!c) continue;
      taken.push({ x: c.x - 2, y: c.y - 1, w: w + 4, h: lh + 2 }, dot);
      out.push({ name, x, y, tx: c.a === 'start' ? c.x : c.a === 'end' ? c.x + w : c.x + w / 2, ty: c.y + 11, a: c.a });
    }
    return out;
  })();
  return (
    <div className="fb-map">
      <div className={cx('fb-map-view', drag && 'is-drag')} ref={wrap} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)} onPointerLeave={() => setHover(null)}>
        <canvas ref={cvs} style={{ width: size.w + 'px', height: size.h + 'px' }} aria-hidden="true" />
        <svg ref={svgRef} className="fb-map-svg" width={size.w} height={size.h} tabIndex={0} role="img" onKeyDown={onKey}
          aria-label={'Map of ' + COUNTRIES[country] + '. Selected box ' + boxText(box) + ', ' + boxSize(box) + '. Drag to draw a box. With the map focused, arrow keys move the box by 0.5°, Shift with arrows resizes it.'}>
          <g className="fb-places" aria-hidden="true">
            {places.map((q) => <g key={q.name}><circle cx={q.x} cy={q.y} r="2.2" /><text x={q.tx} y={q.ty} textAnchor={q.a}>{q.name}</text></g>)}
          </g>
          <rect x={R.x} y={R.y} width={R.w} height={R.h} rx="1.5" className={cx('fb-sel', live && 'is-live')} />
        </svg>
        <span className={cx('fb-sel-label', live && 'is-live')} style={{ left: labelLeft + 'px', top: (labelAbove ? R.y - 24 : R.y + R.h + 6) + 'px' }} aria-hidden="true">{label}</span>
        {hover && !drag && (
          <div className={cx('fb-maptip', hover.x > size.w * 0.62 && 'is-left', hover.y > size.h * 0.7 && 'is-up')} style={{ left: hover.x + 'px', top: hover.y + 'px' }} aria-hidden="true">
            <div className="fb-maptip-t at-mono">{boxText({ s: hover.t.lat, n: hover.t.lat + 0.5, w: hover.t.lon, e: hover.t.lon + 0.5 })}</div>
            <div className="fb-maptip-v">{formatNumber(hover.t.total, 'en')} <span>fire detections, VIIRS 2012–{LAST}</span></div>
            <div className="fb-maptip-m">about {formatNumber(hover.t.mean, 'en')} a year</div>
          </div>
        )}
        <div className="fb-map-key" aria-hidden="true"><span>fewer</span>{[0, 2, 4, 6, 8].map((k) => <i key={k} style={{ background: 'var(--gray-' + k + ')' }} />)}<span>more detections</span></div>
      </div>
      <p className="fb-map-cap">Map: Natural Earth outlines; shading from the detection grid (<span className="at-mono">0.5°</span>)</p>
    </div>
  );
}

export function BoxFields({ country, box, bbox, onBox, done }) {
  const [f, setF] = useState(() => ({ n: String(box.n), s: String(box.s), w: String(box.w), e: String(box.e) }));
  const [msg, setMsg] = useState('');
  useEffect(() => { setF({ n: String(box.n), s: String(box.s), w: String(box.w), e: String(box.e) }); setMsg(''); }, [box.s, box.n, box.w, box.e]);
  const commit = (vals) => {
    const nums = {}; let rounded = false;
    for (const k of ['n', 's', 'w', 'e']) {
      const x = Number(String(vals[k]).replace(',', '.'));
      if (String(vals[k]).trim() === '' || !isFinite(x)) { setMsg('Ingrese un número para ' + { n: 'el norte', s: 'el sur', w: 'el oeste', e: 'el este' }[k] + '.'); return; }
      const sn = Math.round(x * 2) / 2; if (sn !== x) rounded = true; nums[k] = sn;
    }
    if (nums.n <= nums.s) { setMsg('El norte debe estar por encima del sur.'); return; }
    if (nums.e <= nums.w) { setMsg('El este debe quedar al este del oeste (las longitudes oeste son negativas).'); return; }
    if (nums.s < bbox.s || nums.n > bbox.n || nums.w < bbox.w || nums.e > bbox.e) { setMsg('Mantenga la zona dentro de ' + COUNTRIES[country] + ': ' + deg(bbox.s, 'N', 'S') + ' a ' + deg(bbox.n, 'N', 'S') + ', ' + deg(bbox.w, 'E', 'O') + ' a ' + deg(bbox.e, 'E', 'O') + '.'); return; }
    onBox(nums);
    setMsg(rounded ? 'Redondeado a la cuadrícula de 0,5°.' : '');
  };
  const F = [['n', 'N', 'Latitud norte'], ['s', 'S', 'Latitud sur'], ['w', 'O', 'Longitud oeste'], ['e', 'E', 'Longitud este']];
  return (
    <div className="fb-fields-wrap">
      <div className="fb-fields" role="group" aria-label="Zona en grados decimales, paso de 0,5 (el sur y el oeste son negativos)">
        {F.map(([k, short, long]) => (
          <label key={k} className="fb-field">
            <span className="fb-field-k" aria-hidden="true">{short}</span>
            <input type="number" step="0.5" inputMode="decimal" aria-label={long} aria-describedby="fb-field-msg" className="at-mono" value={f[k]}
              onChange={(e) => setF(Object.assign({}, f, { [k]: e.target.value }))}
              onBlur={() => commit(f)} onKeyDown={(e) => { if (e.key === 'Enter') commit(Object.assign({}, f, { [k]: e.currentTarget.value })); }} />
          </label>
        ))}
      </div>
      <div className="fb-field-foot">
        <p className={cx('fb-field-msg', msg && msg.indexOf('Redondeado') < 0 && 'is-err')} id="fb-field-msg" role="status">{msg || 'El sur y el oeste son negativos. Enter para aplicar.'}</p>
        {done}
      </div>
    </div>
  );
}

export function ZonePicker({ data, country, box, onPick, onDone, facts, theme, phone }) {
  const C = data ? data[country] : null;
  // Map column sized to the country's frame (bbox + small margin), so the map is not mostly ocean.
  const bb = C ? C.bbox : (country === 'argentina' ? { s: -55, n: -21.5, w: -73.5, e: -53.5 } : { s: 41.5, n: 83, w: -141.5, e: -52.5 });
  const aspect = ((bb.e - bb.w) * Math.cos(((bb.s + bb.n) / 2) * Math.PI / 180)) / (bb.n - bb.s);
  const mapPct = Math.max(44, Math.min(62, Math.round(((405 * aspect + 36) / 1216) * 100)));
  const setCountry = (c) => { if (c === country) return; const p = PRESETS.find((q) => q.country === c); onPick(c, p.box); };
  return (
    <section className="fb-picker" id="fb-picker" aria-label="Choose a zone" style={{ '--mapw': mapPct + '%' }}>
      <div className="fb-picker-map">
        {C ? <MapView C={C} country={country} box={box} onBox={(b) => onPick(country, b)} theme={theme} phone={phone} /> : <div className="fb-map-wait" aria-hidden="true" />}
      </div>
      <div className="fb-picker-side">
        <div className="fb-side-row">
          <span className="fb-side-k" id="fb-country-k">Country</span>
          <Segmented size="sm" ariaLabel="Country" value={country} onChange={setCountry} options={[{ value: 'canada', label: 'Canada' }, { value: 'argentina', label: 'Argentina' }]} />
        </div>
        <div className="fb-side-block">
          <span className="fb-side-k">Presets</span>
          <ul className="fb-presets">
            {PRESETS.map((p, i) => {
              const on = p.country === country && sameBox(p.box, box);
              const sep = i > 0 && PRESETS[i - 1].country !== p.country;
              return (
                <li key={p.id} className={cx(sep && 'is-sep')}>
                  <button type="button" className={cx('fb-preset', on && 'is-on')} aria-pressed={on} onClick={() => onPick(p.country, p.box)}>
                    <span className="fb-preset-name">{p.label}{p.reference ? <span className="fb-preset-ref"> · reference</span> : null}</span>
                    <span className="fb-preset-fact">{facts ? facts[p.id] : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="fb-side-block">
          <span className="fb-side-k">Or type a box</span>
          {C && <BoxFields country={country} box={box} bbox={C.bbox} onBox={(b) => onPick(country, b)} done={<button type="button" className="at-btn at-btn-primary" onClick={onDone}>Done</button>} />}
          {!C && <button type="button" className="at-btn at-btn-primary" onClick={onDone}>Done</button>}
        </div>
      </div>
    </section>
  );
}
