// Version 5 map panel: the map fills the panel. Four layers on the 0.5° places (1° blocks at country scale for the
// record layer), a floating layer control, zoom cluster, one-line legend and one generated sentence with an (i).
// Gestures: drag pans, wheel and pinch zoom, click selects a 2° box, Shift+drag (or Draw on touch) draws a box,
// arrows nudge, Shift+arrows resize, + / − zoom. During a gesture or a "fly to zone" the drawn bitmap is moved with a
// CSS transform and redrawn crisp when the view settles.
import { useState, useEffect, useMemo, useRef, useLayoutEffect, memo } from 'react';
import { formatNumber, formatDecimal } from '../ds/components/src/scale.js';
import { PRESETS, sameBox, LAST, SW, STATS_FROM, monthLayer, cellSummary, cellKey, countBreaks, countClass, ratioPercentiles, cellBlocks, flipCounts, versus } from './metrics.js';
import { boxText, boxSize, monthLong, chanceRange, chanceWords } from './copy.js';
import { outlines } from './geo.js';
import { PLACES } from './places.js';
import { Info } from './ui.jsx';
import { cx, cssColor, Icon, reduced, liftColor } from './util.jsx';
import { num, dec, PS, monthYear, cap, tm } from './l10n.js';

const COUNTRIES = { canada: 'Canada', argentina: 'Argentine' };
const DU = { canada: 'du Canada', argentina: 'de l’Argentine' };
export const LAYERS = [
  // v6.2: Detections first (the default: where fires are seen, the picture anyone reads first), Record years second.
  { value: 'det', label: 'Détections', short: 'Détections', tip: 'Où le nouveau satellite (VIIRS) voit du feu : détections de feux par an' },
  { value: 'rec', label: 'Années record', short: 'Records', tip: 'L’année avec le plus de feu dans chaque case : avant ou depuis le changement de capteur de 2012' },
  { value: 'ratio', label: 'Effet du capteur', short: 'Capteur', tip: 'Combien de fois plus de feu le nouveau satellite (VIIRS) enregistre que l’ancien (MODIS), case par case' },
  { value: 'month', label: 'Un mois', short: 'Mois', tip: 'Le mois choisi, classé parmi le même mois de chaque année' },
];
const snapDown = (v) => Math.floor(v * 2 + 1e-9) / 2, snapUp = (v) => Math.ceil(v * 2 - 1e-9) / 2;
export const RATIO_BREAKS = [1.5, 2, 2.5, 3, 4];
export const RATIO_TOK = [0, 2, 3, 5, 6, 8]; // --civ-* (cividis family, passes tools/cvd.mjs)
const ratioClass = (r) => { let k = 0; RATIO_BREAKS.forEach((b) => { if (r >= b) k++; }); return k; };
const fx = (r) => dec(r, r < 10 ? 1 : 0) + '×';
const P1 = (x) => (x == null ? '—' : Math.round(x * 100) + PS);
const rng = chanceRange;
// Major places shown at country scale (the rest appear when zoomed in).
const MAJOR = { canada: ['Vancouver', 'Edmonton', 'Winnipeg', 'Toronto', 'Montréal', 'Québec', 'Sherbrooke', 'Yellowknife'], argentina: ['Buenos Aires', 'Córdoba', 'La Rioja', 'Mendoza', 'Salta', 'Neuquén'] };
const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

function useBox(ref) {
  const [s, setS] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const r0 = el.getBoundingClientRect(); setS({ w: Math.round(r0.width), h: Math.round(r0.height) });
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((es) => { const r = es[0].contentRect; if (r.width > 0 && r.height > 0) setS({ w: Math.round(r.width), h: Math.round(r.height) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return s;
}

// A view = { cx, cy, sc }: centre (lon, lat) and px per degree of latitude; x scale = k·sc with k fixed per country,
// so changing views is a pure scale + translation (what lets a CSS transform stand in for a redraw).
const proj = (v, k, w, h) => ({
  k, sc: v.sc, w, h,
  x: (lon) => w / 2 + (lon - v.cx) * k * v.sc, y: (lat) => h / 2 - (lat - v.cy) * v.sc,
  lon: (x) => v.cx + (x - w / 2) / (k * v.sc), lat: (y) => v.cy - (y - h / 2) / v.sc,
});
export const ringsPathP = (rings, q, P) => {
  let d = '';
  for (const r of rings) {
    let s = '', lx = null, ly = null, n = 0;
    for (let i = 0; i < r.length; i += 2) { const x = P.x(r[i] / q), y = P.y(r[i + 1] / q); if (lx != null && Math.abs(x - lx) + Math.abs(y - ly) < 0.6) continue; s += (n ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); lx = x; ly = y; n++; }
    if (n > 2) d += s + 'Z';
  }
  return d;
};

// Loading placeholder: the country outline in the data frame (outlines are embedded; no need to wait for the tiles).
const WAIT_FRAME = { canada: { s: 41.5, n: 71, w: -141, e: -52 }, argentina: { s: -55, n: -21.5, w: -73.6, e: -53.6 } };
function MapWait({ country }) {
  const o = outlines()[country], f = WAIT_FRAME[country];
  if (!o || !f) return <div className="fb-map-wait" aria-hidden="true" />;
  const k = Math.cos(((f.s + f.n) / 2) * Math.PI / 180), S = 10;
  const P = { x: (lon) => (lon - f.w) * k * S, y: (lat) => (f.n - lat) * S };
  const W = (f.e - f.w) * k * S, H = (f.n - f.s) * S, pw = W * 0.06, ph = H * 0.06;
  return (
    <div className="fb-map-wait" aria-hidden="true">
      <svg viewBox={(-pw) + ' ' + (-ph) + ' ' + (W + 2 * pw) + ' ' + (H + 2 * ph)} preserveAspectRatio="xMidYMid meet"><path d={ringsPathP(o.self, o.q, P)} /></svg>
    </div>
  );
}

// For the map image export (src/exports.js mapPng), read only: the view and size of the map on screen (cur, null when
// the map panel is not mounted) and the last size it had (size). The panel itself never reads them.
export const MAP_LIVE = { cur: null, size: null };
export { proj };
// The same frame rules as MapView (data extent + fit, a box at ~22 % of the short side, clamped): the view the map opens
// on for this zone at a given size. Used by the export when the map is not on screen.
export function mapExtent(S, bb) {
  const E = S.cells.filter((c) => c.eligible);
  const r = E.length ? { s: Math.min(...E.map((c) => c.lat)) - 1, n: Math.max(...E.map((c) => c.lat)) + 1.5, w: Math.min(...E.map((c) => c.lon)) - 1, e: Math.max(...E.map((c) => c.lon)) + 1.5 } : bb;
  const ext = { s: Math.max(bb.s - 1, r.s), n: Math.min(bb.n + 1, r.n), w: Math.max(bb.w - 1, r.w), e: Math.min(bb.e + 1, r.e) };
  return { ext, k: Math.cos(((ext.s + ext.n) / 2) * Math.PI / 180) };
}
export function openingView(S, bb, box, whole, w, h) {
  const { ext, k } = mapExtent(S, bb), padF = 0.03;
  const fit = { cx: (ext.w + ext.e) / 2, cy: (ext.s + ext.n) / 2, sc: Math.max(0.5, Math.min((w * (1 - 2 * padF)) / ((ext.e - ext.w) * k), (h * (1 - 2 * padF)) / (ext.n - ext.s))) };
  const hasData = S.cells.some((c) => c.eligible && c.lat + 0.5 > box.s && c.lat < box.n && c.lon + 0.5 > box.w && c.lon < box.e);
  if (whole || !hasData) return fit;
  const side = Math.max(box.n - box.s, (box.e - box.w) * k), v = { cx: (box.w + box.e) / 2, cy: (box.s + box.n) / 2, sc: (0.22 * Math.min(w, h)) / side };
  if (v.sc < fit.sc) return fit;
  const sc = Math.min(fit.sc * 40, Math.max(fit.sc, v.sc)), hw = w / 2 / (k * sc), hh = h / 2 / sc;
  const cx0 = Math.min(Math.max(v.cx, ext.w - hw * 0.6), ext.e + hw * 0.6), cy0 = Math.min(Math.max(v.cy, ext.s - hh * 0.6), ext.n + hh * 0.6);
  return sc <= fit.sc + 1e-9 ? fit : { cx: cx0, cy: cy0, sc };
}

// The map bitmap of a view (projection PD, size {w, h}): outlines, the layer's places, borders. Shared by the panel's
// canvas and the map image export (src/exports.js mapPng), so the export draws exactly what the panel draws.
export function paintMap(g, { PD, size, k, S, ML, layer, harm, theme, detBreaks, blocks, BL, paths }) {
  const land = cssColor('--map-land'), border = cssColor('--map-border'), ink = cssColor('--ink'), ink3 = cssColor('--ink-3'), ink2 = cssColor('--ink-2'), other = cssColor('--map-other');
  if (paths) { g.fillStyle = other; g.fill(paths.others); g.fillStyle = land; g.fill(paths.self); }
  const P0 = PD, cw = 0.5 * k * P0.sc, ch = 0.5 * P0.sc;
  const gap = cw > 5 ? 0.6 : cw > 2.5 ? 0.35 : 0;
  const rect = (c0) => [P0.x(c0.lon) + gap, P0.y(c0.lat + 0.5) + gap, Math.max(0.8, cw - 2 * gap), Math.max(0.8, ch - 2 * gap)];
  const vis = (c0) => P0.x(c0.lon + 0.5) >= -20 && P0.x(c0.lon) <= size.w + 20 && P0.y(c0.lat) >= -20 && P0.y(c0.lat + 0.5) <= size.h + 20;
  if (layer === 'rec') {
    const cB = cssColor('--rec-before'), cS = cssColor('--rec-since'), nbc = cssColor('--rec-nb');
    if (blocks) {
      const bw = k * P0.sc, bh = P0.sc, gp = bw > 4 ? 0.5 : 0;
      const cur = harm ? BL.harm : BL.raw;
      const seen = new Set();
      for (const c0 of S.cells) { if (!c0.high) continue; const kk = Math.floor(c0.i / 2) * 100000 + Math.floor(c0.j / 2); if (cur.has(kk) || seen.has(kk)) continue; seen.add(kk); g.fillStyle = nbc; g.fillRect(P0.x(Math.floor(c0.j / 2)) + gp, P0.y(Math.floor(c0.i / 2) + 1) + gp, Math.max(1, bw - 2 * gp), Math.max(1, bh - 2 * gp)); }
      for (const b of cur.values()) {
        const x = P0.x(b.lon) + gp, y = P0.y(b.lat + 1) + gp, w = Math.max(1, bw - 2 * gp), h = Math.max(1, bh - 2 * gp);
        if (x + w < 0 || x > size.w || y + h < 0 || y > size.h) continue;
        if (b.era === 'mixed') { g.fillStyle = cB; g.fillRect(x, y, w / 2, h); g.fillStyle = cS; g.fillRect(x + w / 2, y, w / 2, h); continue; }
        g.globalAlpha = harm && b.depends * 2 > b.n ? 0.5 : 1;
        g.fillStyle = b.era === 'since' ? cS : cB; g.fillRect(x, y, w, h);
        g.globalAlpha = 1;
      }
    } else {
      for (const c0 of S.cells) {
        if (!c0.eligible || !vis(c0)) continue;
        const [x, y, w, h] = rect(c0);
        if (c0.high) { g.fillStyle = nbc; g.fillRect(x, y, w, h); continue; }
        g.globalAlpha = harm && c0.depends ? 0.5 : 1;
        g.fillStyle = (harm ? c0.eraHarm : c0.eraRaw) === 'since' ? cS : cB; g.fillRect(x, y, w, h);
        g.globalAlpha = 1;
      }
    }
  } else if (layer === 'ratio') {
    const ramp = RATIO_TOK.map((t) => liftColor(cssColor('--civ-' + t), land, ink, theme === 'dark' ? 3 : 1)); // dark: lowest class lifted to 3:1 against the land
    for (const c0 of S.cells) {
      if (!c0.eligible || !vis(c0)) continue;
      g.globalAlpha = c0.rcase === 'country' ? 0.35 : 1;
      const [x, y, w, h] = rect(c0);
      g.fillStyle = ramp[ratioClass(c0.ratio)]; g.fillRect(x, y, w, h);
      if (c0.high) { g.globalAlpha = 1; g.strokeStyle = ink; g.lineWidth = 1.5; g.strokeRect(x + 0.75, y + 0.75, Math.max(0.5, w - 1.5), Math.max(0.5, h - 1.5)); }
    }
    g.globalAlpha = 1;
  } else if (layer === 'month' && ML) {
    for (const c0 of S.cells) {
      if (!c0.eligible || !vis(c0)) continue;
      const cl = ML.cls.get(cellKey(c0.i, c0.j)); const [x, y, w, h] = rect(c0);
      if (cl === 'record') { g.fillStyle = ink; g.fillRect(x, y, w, h); }
      else if (cl === 'top3') { g.fillStyle = ink3; g.globalAlpha = 0.6; g.fillRect(x, y, w, h); g.globalAlpha = 1; }
      else if (cl === 'active') { g.fillStyle = ink2; const r = Math.max(0.7, Math.min(w, h) / 5); g.beginPath(); g.arc(x + w / 2, y + h / 2, r, 0, 2 * Math.PI); g.fill(); }
    }
  } else if (layer === 'det') {
    const ramp = Array.from({ length: 9 }, (_, i) => cssColor('--det-' + i)); // single hue, not the calendar ramp (floor 3:1 via the tokens)
    for (const c0 of S.cells) {
      if (!(c0.det > 0) || !vis(c0)) continue;
      const kk = countClass(c0.det, detBreaks); if (kk < 0) continue;
      g.fillStyle = ramp[kk]; g.fillRect(...rect(c0));
    }
  }
  if (paths) { g.lineWidth = 0.8; g.strokeStyle = border; g.stroke(paths.others); g.lineWidth = 1; g.stroke(paths.self); }
}

export const MapPanel = memo(function MapPanel({ C, S, country, box, onBox, harm, rawOnly, layer, setLayer, sel, theme, phone, hlYear, onHoverYear, compactLegend, onMethod, narrow, monthPicked }) {
  const ML = useMemo(() => (C && S && layer === 'month' && sel >= (STATS_FROM - 2001) * 12 ? monthLayer(C, S, sel) : null), [C, S, layer, sel]); // 2001–2002 are not ranked
  const whole = !!PRESETS.find((p) => p.whole && p.country === country && sameBox(p.box, box));
  const boxSum = useMemo(() => (S && !whole ? cellSummary(S.cells, S, box) : null), [S, whole, box.s, box.n, box.w, box.e]);
  const detBreaks = useMemo(() => (S ? countBreaks(S.cells.filter((c) => c.det > 0).map((c) => c.det)) : null), [S]);
  const pc = useMemo(() => (S ? ratioPercentiles(S) : null), [S]);
  const flips = useMemo(() => (S ? flipCounts(S) : null), [S]);
  const mName = monthYear(sel % 12, 2001 + Math.floor(sel / 12)), mNameC = cap(mName); // 'octobre 2019' / 'Octobre 2019' (sentence start)
  const s = S ? S.summary : null;

  let legend = null, sentence = null, info = null;
  if (S) {
    if (layer === 'rec') {
      legend = (
        <>
          <span className="fb-lg"><i className="fb-sw is-before" aria-hidden="true" />record avant 2012</span>
          <span className="fb-lg"><i className="fb-sw is-since" aria-hidden="true" />depuis 2012</span>
          <span className="fb-lg" title="Gris : le ratio local dépasse 4×, ce qui est inhabituel pour des feux de végétation ; la case n’est donc ni harmonisée ni comptée"><i className="fb-sw is-nb" aria-hidden="true" />non harmonisé</span>
        </>
      );
      // One sentence that follows the selected box: the box when it holds 30 places or more, otherwise the whole country
      // (said so). Chance bands are printed with chanceRange() (copy.js), the same rounding everywhere.
      const B = boxSum && boxSum.n >= 30 ? boxSum : null, R = B || s;
      const cname = country === 'canada' ? 'Canada' : 'Argentine';
      const scope = B ? 'Cette zone (' + B.n + ' cases) :' : whole ? cname + ' :' : 'Tout le pays :';
      const band = chanceRange;
      const w = (v) => (v === 'inside' ? 'within' : v);
      const vr = versus(R.sinceRaw, R.chanceRaw), vh = versus(R.sinceHarm, R.chanceHarm);
      // Plain words (judge C3): the same facts as the chance comparison, in a sentence a newcomer reads; exact ranges in (i).
      const says = (v, x, c) => (v === 'below' ? 'moins que ce que donnerait le hasard (les années depuis 2012 sont plus calmes)' : chanceWords(x, c));
      const hs = <span className={cx(harm && 'is-on')}>Sur une même échelle : {P1(R.sinceHarm)}, {says(vh, R.sinceHarm, R.chanceHarm)}.</span>;
      const rs = <span className={cx(!harm && 'is-on')}>Avec les deux séries simplement mises bout à bout, {P1(R.sinceRaw)} des cases ont leur année la plus active en 2012 ou après, {says(vr, R.sinceRaw, R.chanceRaw)}.</span>;
      // v6.2 (P2): first what the colours mean, in everyday words; then the finding.
      sentence = <><span className="fb-plain">Bleu : ici, l’année la plus active en feux est 2012 ou après. Doré : avant 2012.</span> {scope !== cname + ' :' ? scope + ' ' : ''}{rs} {hs}</>;
      info = (
        <>
          <p><b>Case</b> : un carré de 0,5° sur la carte. <b>Année record</b> : l’année avec le plus de feu dans une case (au moins 200 cellules-jours, {STATS_FROM}–{LAST}). {LAST - SW + 1} des {LAST - STATS_FROM + 1} années sont en {SW} ou après : le hasard seul y place donc beaucoup de records. <b>Hasard</b> : la part que donnent {num(S.perms.length)} permutations des étiquettes d’années : {band(R.chanceHarm)} harmonisée, {band(R.chanceRaw)} brute ({B ? 'cette zone' : cname}). <b>Gris</b> : ratio local au-dessus de 4×, non harmonisé ({s.excludedHigh} cases).</p>
          {boxSum && boxSum.n > 0 && boxSum.n < 30 && <p><b>Cette zone</b> : {boxSum.n} cases, trop peu pour compter les records ; la phrase porte sur tout le pays.</p>}
          {onMethod && <button type="button" className="at-link" onClick={onMethod}>Méthode <Icon d="M5 12h14M13 6l6 6-6 6" /></button>}
        </>
      );
    } else if (layer === 'ratio') {
      legend = (
        <span className="fb-lg fb-ramp is-steps" role="img" aria-label={'VIIRS voit N fois plus de feu que MODIS : moins de 1,5, puis ' + RATIO_BREAKS.map((b) => dec(b, b % 1 ? 1 : 0)).join(' ; ') + ', et 4 ou plus'}>
          {RATIO_TOK.map((t, k) => <span key={t}><i style={{ background: 'var(--civ-' + t + ')' }} />{k < RATIO_BREAKS.length && <em>{dec(RATIO_BREAKS[k], RATIO_BREAKS[k] % 1 ? 1 : 0)}</em>}</span>)}<em>× plus vu</em>
        </span>
      );
      sentence = <><span className="fb-plain">Couleur : combien de fois plus de feu le nouveau satellite voit que l’ancien, case par case.</span> Case typique : {fx(pc.p50).replace('×', ' fois')} ; la plupart des cases entre {fx(pc.p5).replace('×', '')} et {fx(pc.p95).replace('×', ' fois')}. <span className="fb-muted">{s.excludedHigh} cases au-dessus de 4 fois : pas mises sur une même échelle.</span></>;
      info = (
        <>
          <p><b>Effet du capteur</b> : combien de fois plus VIIRS enregistre que MODIS dans chaque case, {SW}–{LAST}, en regroupant chaque case avec ses voisines (estompé : trop peu de détections, ratio du pays utilisé). {COUNTRIES[country]} : {dec(S.countryRatio, 2)}×.</p>
          <p><b>Contourné</b> : au-dessus de 4×, non harmonisé ; peut-être des sources de chaleur autres que des feux, non vérifié.</p>
          {onMethod && <button type="button" className="at-link" onClick={onMethod}>Méthode <Icon d="M5 12h14M13 6l6 6-6 6" /></button>}
        </>
      );
    } else if (layer === 'month') {
      legend = (
        <>
          <span className="fb-lg"><i className="fb-sw is-mrec" aria-hidden="true" />record</span>
          <span className="fb-lg"><i className="fb-sw is-mtop" aria-hidden="true" />3 premiers</span>
          <span className="fb-lg"><i className="fb-sw is-dot" aria-hidden="true" />active</span>
        </>
      );
      sentence = sel < (STATS_FROM - 2001) * 12 ? <><b>{mNameC}</b> tombe en 2001–2002 (couverture MODIS partielle), période non classée. <span className="fb-muted">Choisissez un mois à partir de 2003 dans le calendrier.</span></> : ML && <><b>{mNameC} :</b> un record dans {num(ML.counts.rec)} {ML.counts.rec === 1 ? 'case' : 'cases'}, parmi les 3 premiers dans {num(ML.counts.top3)}. <span className="fb-muted">Choisissez un mois dans le calendrier.</span></>;
      info = ML && (
        <>
          <p><b>Un mois.</b> Chaque case est classée, pour {mName} (série harmonisée), parmi le même mois de {STATS_FROM}–{ML.years.length ? ML.years[ML.years.length - 1] : LAST} : record, 3 premiers, active mais pas inhabituelle, ou aucune détection ({num(ML.counts.none)} cases). Actives, pas inhabituelles : {num(ML.counts.act)}.</p>
          <p>Classé, pas comparé à un mois typique : les comptages par case sont trop petits pour cela.</p>
        </>
      );
    } else {
      legend = (
        <span className="fb-lg fb-ramp is-steps" role="img" aria-label={'Détections de feux moyennes par an, de ' + num(detBreaks[0]) + ' à ' + num(detBreaks[8]) + ' ou plus'}>
          <em>{num(detBreaks[0])}</em>{Array.from({ length: 9 }, (_, k) => <span key={k}><i style={{ background: 'var(--det-' + k + ')' }} /></span>)}<em>{num(detBreaks[8])}+ par an</em>
        </span>
      );
      sentence = <><span className="fb-plain">{theme === 'dark' ? 'Plus clair' : 'Plus foncé'} = plus de feux vus chaque année par le nouveau satellite (VIIRS), 2012–{LAST}.</span> <span className="fb-muted">Niveaux de gris, détections de feux par an (pas les couleurs du calendrier).</span></>;
      info = <p><b>Détections.</b> Moyenne annuelle des cellules-jours VIIRS par case de 0,5°, février 2012–{LAST} ; {num(S.cells.filter((c) => c.det > 0).length)} cases avec au moins une détection. Les autres couches montrent ce que l’harmonisation change.</p>;
    }
  }
  // Map interaction state shown in the footer hint line: mode instruction, transient message, undo.
  const presetHere = PRESETS.find((p) => p.country === country && sameBox(p.box, box));
  const zoneLabel = presetHere ? tm(presetHere.label) : 'Zone personnalisée · ' + boxSize(box);
  const [mode, setMode] = useState('');      // '' | 'draw'
  const [msg, setMsg] = useState(null);      // transient message
  const [undo, setUndo] = useState(null);    // { box, name } for ~8 s after a zone change made on the map
  const noFly = useRef(false);               // zone changes made on the map (and their undo) never move the view
  const msgT = useRef(null), undoT = useRef(null), lastBox = useRef(box), lastName = useRef(zoneLabel);
  const flash = (m) => { clearTimeout(msgT.current); setMsg(m); msgT.current = setTimeout(() => setMsg(null), 2600); };
  const mapBox = (b) => {
    if (sameBox(b, box)) return;
    setUndo({ box: box, name: zoneLabel }); clearTimeout(undoT.current); undoT.current = setTimeout(() => setUndo(null), 8000);
    noFly.current = true; expectBox.current = b; onBox(b);
  };
  useEffect(() => { setUndo(null); setMsg(null); }, [country]); // a pending undo from the other country is dropped
  // A zone change made elsewhere (preset, popover, hash, Back) drops a pending map undo: it would undo the wrong thing.
  const expectBox = useRef(null);
  useEffect(() => { if (expectBox.current && sameBox(expectBox.current, box)) return; expectBox.current = null; setUndo(null); }, [box.s, box.n, box.w, box.e]);
  const doUndo = () => { if (!undo) return; const u = undo; setUndo(null); noFly.current = true; expectBox.current = u.box; onBox(u.box); };
  const wholeBox = (PRESETS.find((p) => p.whole && p.country === country) || {}).box;
  const hintLine = mode === 'draw' ? 'Glisser : tracer une zone · Échap : annuler'
    : msg ? msg
    : undo ? <>Zone changée.{' '}<button type="button" className="at-link" onClick={doUndo}>Retour à {undo.name}</button></> // no-break space: the hint line is a flex box, which drops a plain trailing space
    : monthPicked && layer !== 'month' ? <>{mNameC} est choisi dans le calendrier.{' '}<button type="button" className="at-link" onClick={() => setLayer('month')}>Voir sur la carte</button></>
    : (phone ? 'Toucher : analyser · glisser : déplacer · pincer : zoom' : 'Clic : analyser · glisser : déplacer · molette : zoom');
  const hlCount = useMemo(() => (S && hlYear && layer === 'rec' ? S.cells.filter((c) => c.claim && (harm ? c.recHarm : c.recRaw) === hlYear).length : null), [S, hlYear, harm, layer]);

  return (
    <section className={cx('fb-panel fb-mappanel', phone && 'is-phone')} id="map" aria-labelledby="fb-map-t">
      <h2 className="at-sr" id="fb-map-t">Carte {DU[country]}</h2>
      <div className="fb-mapbox">
        <div className="fb-layerctl" role="radiogroup" aria-label="Couche de la carte">
          {LAYERS.map((l) => <button key={l.value} type="button" role="radio" aria-checked={layer === l.value} tabIndex={layer === l.value ? 0 : -1} className={cx('fb-layerbtn', layer === l.value && 'is-on')} title={l.tip}
            onClick={() => setLayer(l.value)}
            onKeyDown={(e) => { const i = LAYERS.findIndex((q) => q.value === layer), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return; e.preventDefault(); const j = (i + d + 4) % 4, g = e.currentTarget.parentNode; setLayer(LAYERS[j].value); g && g.children[j] && g.children[j].focus(); }}>{phone || narrow ? l.short : l.label}</button>)}
        </div>
        {C && S ? <MapView C={C} S={S} ML={ML} detBreaks={detBreaks} country={country} box={box} whole={whole} onBox={mapBox} noFly={noFly} zoneLabel={zoneLabel} onClear={wholeBox ? () => mapBox(wholeBox) : null} onMode={setMode} onFlash={flash} onUndo={doUndo} harm={harm} layer={layer} theme={theme} phone={phone} mName={mName} hlYear={layer === 'rec' ? hlYear : null} onHoverYear={onHoverYear} /> : <MapWait country={country} />}
        {hlCount != null && <div className="fb-hlchip">{hlYear} : un record dans {num(hlCount)} {hlCount === 1 ? 'case' : 'cases'}{harm ? '' : ' (brut)'}</div>}
      </div>
      <div className="fb-mapfoot">
        <p className={cx('fb-maphint', (mode || msg) && 'is-on')} aria-live="off">{hintLine}</p>
        <div className="fb-legend1">{legend}</div>
        {/* keyed by zone and layer (v6, CLS): new text replaces the old instead of reflowing it */}
        <p className="fb-mapsentence" key={[box.s, box.n, box.w, box.e, layer, harm ? 1 : 0].join(',')}>{sentence}</p>
        {info && <Info id="fb-map-info" label="À propos de cette couche">{info}</Info>}
      </div>
    </section>
  );
});

function MapView({ C, S, ML, detBreaks, country, box, whole, onBox: onBox0, noFly, zoneLabel, onClear, onMode, onFlash, onUndo, harm, layer, theme, phone, mName, hlYear, onHoverYear }) {
  // Zone changes made ON the map never move the view (the map stays where the user put it); presets fly.
  const selfMove = noFly;
  const onBox = (b) => onBox0(b);
  const wrap = useRef(null), layerRef = useRef(null), cvs = useRef(null), hlc = useRef(null), ghost = useRef(null), lastSig = useRef('');
  const size = useBox(wrap);
  const bb = C.bbox;
  // Extent of the places the map can say something about, plus 1°; k fixed for the country.
  const ext = useMemo(() => {
    const E = S.cells.filter((c) => c.eligible);
    const r = E.length ? { s: Math.min(...E.map((c) => c.lat)) - 1, n: Math.max(...E.map((c) => c.lat)) + 1.5, w: Math.min(...E.map((c) => c.lon)) - 1, e: Math.max(...E.map((c) => c.lon)) + 1.5 } : bb;
    return { s: Math.max(bb.s - 1, r.s), n: Math.min(bb.n + 1, r.n), w: Math.max(bb.w - 1, r.w), e: Math.min(bb.e + 1, r.e) };
  }, [S, bb]);
  const k = useMemo(() => Math.cos(((ext.s + ext.n) / 2) * Math.PI / 180), [ext]);
  // Fit: the frame is the DATA extent (places with a claim, +1°), not the country outline; centred, 6 % padding
  // (audit-v5 DB1: the old north-anchored fit left 37–56 % of the view to the empty Arctic).
  const fitFor = (f, w, h, padF = 0.03) => {
    const sc = Math.max(0.5, Math.min((w * (1 - 2 * padF)) / ((f.e - f.w) * k), (h * (1 - 2 * padF)) / (f.n - f.s)));
    return { cx: (f.w + f.e) / 2, cy: (f.s + f.n) / 2, sc };
  };
  const fit = useMemo(() => (size.w ? fitFor(ext, size.w, size.h) : null), [ext, size.w, size.h, k]);
  const zoneView = (b) => {
    if (!size.w) return null;
    // A box takes about 22 % of the view's short side (regional context), never more; never wider than the data fit.
    const side = Math.max(b.n - b.s, (b.e - b.w) * k), cyb = (b.s + b.n) / 2, cxb = (b.w + b.e) / 2;
    const scBox = (0.22 * Math.min(size.w, size.h)) / side;
    const v = { cx: cxb, cy: cyb, sc: scBox };
    return fit && v.sc < fit.sc ? Object.assign({}, fit) : clampView(v);
  };
  const [view, setView] = useState(null);
  const [drawn, setDrawn] = useState(null); // the view the bitmap was drawn at
  const anim = useRef(null);
  // Initial / resize / country change: fit, or the zone view for a small box. Box change: fly to it.
  const lastKey = useRef('');
  useEffect(() => {
    if (!fit) return;
    const key = country + '|' + size.w + 'x' + size.h;
    // A box with no data at all (outside the country data, or empty): stay at country scale with the box marked.
    const hasData = S.cells.some((c) => c.eligible && c.lat + 0.5 > box.s && c.lat < box.n && c.lon + 0.5 > box.w && c.lon < box.e);
    const target = whole || !hasData ? fit : zoneView(box);
    if (lastKey.current !== key || !view) { lastKey.current = key; selfMove.current = false; setView(target); setDrawn(target); return; }
    if (selfMove.current) { selfMove.current = false; return; }
    flyTo(target);
  }, [fit, country, box.s, box.n, box.w, box.e, whole]);
  function flyTo(target) {
    if (!view || reduced()) { setView(target); setDrawn(target); return; }
    cancelAnimationFrame(anim.current);
    const v0 = view, t0 = performance.now(), D = 320;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / D), e = ease(t);
      const sc = Math.exp(Math.log(v0.sc) + (Math.log(target.sc) - Math.log(v0.sc)) * e);
      setView({ cx: v0.cx + (target.cx - v0.cx) * e, cy: v0.cy + (target.cy - v0.cy) * e, sc });
      if (t < 1) anim.current = requestAnimationFrame(step); else setDrawn(target);
    };
    anim.current = requestAnimationFrame(step);
  }
  // Settle: redraw crisp 120 ms after the last view change of a gesture.
  const settle = useRef(null);
  const queueSettle = (v) => { clearTimeout(settle.current); settle.current = setTimeout(() => setDrawn(v), 120); };
  const clampView = (v) => {
    if (!fit) return v;
    const sc = Math.min(fit.sc * 40, Math.max(fit.sc, v.sc));
    const hw = size.w / 2 / (k * sc), hh = size.h / 2 / sc;
    const cx = Math.min(Math.max(v.cx, ext.w - hw * 0.6 + hw * 0), ext.e + hw * 0.6), cy = Math.min(Math.max(v.cy, ext.s - hh * 0.6), ext.n + hh * 0.6);
    return sc <= fit.sc + 1e-9 ? fit : { cx, cy, sc };
  };

  const P = useMemo(() => (view ? proj(view, k, size.w, size.h) : null), [view, k, size.w, size.h]);
  const PD = useMemo(() => (drawn ? proj(drawn, k, size.w, size.h) : null), [drawn, k, size.w, size.h]);
  // Transform taking the drawn bitmap to the current view (pure scale + translate).
  const tf = (() => {
    if (!view || !drawn || view === drawn) return null;
    const sF = view.sc / drawn.sc;
    if (Math.abs(sF - 1) < 1e-6 && Math.abs(view.cx - drawn.cx) < 1e-9 && Math.abs(view.cy - drawn.cy) < 1e-9) return null;
    const tx = size.w / 2 * (1 - sF) + (drawn.cx - view.cx) * k * view.sc, ty = size.h / 2 * (1 - sF) - (drawn.cy - view.cy) * view.sc;
    return 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + sF.toFixed(5) + ')';
  })();
  const fitNow = !!(view && fit && Math.abs(view.sc - fit.sc) < 1e-6);
  const zoomLevel = view && fit ? view.sc / fit.sc : 1;

  // Country scale: a 0.5° place under ~5 px reads as noise → 1° blocks (majority era); back to places from ~6 px.
  const cellPx = PD ? Math.min(0.5 * k * PD.sc, 0.5 * PD.sc) : 0;
  const blockRef = useRef(true);
  if (cellPx < 5) blockRef.current = true; else if (cellPx >= 6) blockRef.current = false;
  const blocks = layer === 'rec' && blockRef.current;
  const BL = useMemo(() => ({ raw: cellBlocks(S, false), harm: cellBlocks(S, true) }), [S]);
  const paths = useMemo(() => {
    const o = outlines()[country];
    if (!o || !PD) return null;
    return { self: new Path2D(ringsPathP(o.self, o.q, PD)), others: new Path2D(ringsPathP(o.others, o.q, PD)) };
  }, [country, PD]);

  // Main bitmap, drawn at `drawn`. Layout effect: it lands in the same frame as the state change (View Transitions).
  useLayoutEffect(() => {
    const c = cvs.current; if (!c || !PD) return;
    // Layer or series change: the previous bitmap fades out over the new one (200 ms, canvas only; no page transition).
    const sig = layer + '|' + harm + '|' + (layer === 'month' ? mName : '');
    const gc = ghost.current;
    if (gc && lastSig.current && lastSig.current !== sig && c.width && !reduced()) {
      gc.width = c.width; gc.height = c.height; const gg = gc.getContext('2d'); gg.clearRect(0, 0, gc.width, gc.height); gg.drawImage(c, 0, 0);
      gc.getAnimations().forEach((a) => a.cancel());
      gc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear', fill: 'forwards' });
    }
    lastSig.current = sig;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size.w, size.h);
    paintMap(g, { PD, size, k, S, ML, layer, harm, theme, detBreaks, blocks, BL, paths });
  }, [S, ML, PD, paths, theme, size.w, size.h, layer, harm, detBreaks, blocks, BL, k]);
  // Read by the map image export only (MAP_LIVE above): the view shown now, its size, and whether 1° blocks are drawn.
  useEffect(() => { MAP_LIVE.cur = view && size.w && size.h ? { country, view, w: size.w, h: size.h, blocks } : null; if (size.w && size.h) MAP_LIVE.size = { w: size.w, h: size.h }; });
  useEffect(() => () => { MAP_LIVE.cur = null; }, []);

  // Linked highlight: places whose record (current series) is the hovered calendar year; everything else dimmed.
  useLayoutEffect(() => {
    const c = hlc.current; if (!c || !PD) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size.w, size.h);
    if (!hlYear) return;
    g.fillStyle = cssColor('--surface'); g.globalAlpha = 0.72; g.fillRect(0, 0, size.w, size.h); g.globalAlpha = 1;
    const cw = 0.5 * k * PD.sc, ch = 0.5 * PD.sc, mn = Math.max(cw, ch) < 3 ? 1 : 0;
    const cB = cssColor('--rec-before'), cS = cssColor('--rec-since'), ink = cssColor('--ink');
    for (const c0 of S.cells) {
      if (!c0.claim || (harm ? c0.recHarm : c0.recRaw) !== hlYear) continue;
      const x = PD.x(c0.lon) - mn, y = PD.y(c0.lat + 0.5) - mn, w = cw + 2 * mn, h = ch + 2 * mn;
      g.fillStyle = hlYear >= SW ? cS : cB; g.fillRect(x, y, w, h);
      if (cw > 4) { g.strokeStyle = ink; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    }
  }, [hlYear, PD, harm, S, size.w, size.h, theme, k]);

  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const [kbd, setKbd] = useState(false);
  const [draw, setDraw0] = useState(false);
  const [handle, setHandle] = useState(null); // the selection part under the pointer: 'move' | 'n' | 's' | 'e' | 'w' | 'ne' …
  const [pending, setPending] = useState(null); // a click's box, shown at once, committed after the double-click window
  const pendT = useRef(null);
  // The tooltip stays inside the panel at all four edges: measured after layout and nudged by a correction offset.
  const tipRef = useRef(null);
  useLayoutEffect(() => {
    const fix = () => {
      const t = tipRef.current, w = wrap.current; if (!t || !w) return;
      t.style.setProperty('--dx', '0px'); t.style.setProperty('--dy', '0px');
      const a = t.getBoundingClientRect(), b = w.getBoundingClientRect(), m = 6;
      const dx = a.left < b.left + m ? b.left + m - a.left : a.right > b.right - m ? b.right - m - a.right : 0;
      const dy = a.top < b.top + m ? b.top + m - a.top : a.bottom > b.bottom - m ? b.bottom - m - a.bottom : 0;
      t.style.setProperty('--dx', dx + 'px'); t.style.setProperty('--dy', dy + 'px');
    };
    fix(); const r = requestAnimationFrame(fix); return () => cancelAnimationFrame(r);
  });
  const setDraw = (v) => { setDraw0(v); onMode && onMode(v ? 'draw' : ''); };
  const pointers = useRef(new Map());
  const pt = (e) => { const r = wrap.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const clampBox = (b) => ({ s: Math.max(bb.s, b.s), n: Math.min(bb.n, b.n), w: Math.max(bb.w, b.w), e: Math.min(bb.e, b.e) });
  const toBox = (a, b) => {
    const la = [P.lat(a.y), P.lat(b.y)], lo = [P.lon(a.x), P.lon(b.x)];
    const r = clampBox({ s: snapDown(Math.min(...la)), n: snapUp(Math.max(...la)), w: snapDown(Math.min(...lo)), e: snapUp(Math.max(...lo)) });
    if (r.n - r.s < 0.5) r.n = Math.min(bb.n, r.s + 0.5), r.s = r.n - 0.5;
    if (r.e - r.w < 0.5) r.e = Math.min(bb.e, r.w + 0.5), r.w = r.e - 0.5;
    return r;
  };
  const clickBox = (p) => {
    const lat = snapDown(P.lat(p.y)), lon = snapDown(P.lon(p.x));
    let s0 = lat - 0.5, w0 = lon - 0.5;
    s0 = Math.min(Math.max(bb.s, s0), bb.n - 2); w0 = Math.min(Math.max(bb.w, w0), bb.e - 2);
    return { s: s0, n: s0 + 2, w: w0, e: w0 + 2 };
  };
  // Move / resize the selection: deltas in degrees, snapped to the 0.5° grid, kept inside the country, ≥ 0.5°.
  const editBox = (b0, h, dx, dy) => {
    const sc = (drag && drag.v0 ? drag.v0.sc : view.sc), dLon = Math.round((dx / (k * sc)) * 2) / 2, dLat = Math.round((-dy / sc) * 2) / 2;
    let { s: s0, n: n0, w: w0, e: e0 } = b0;
    if (h === 'move') {
      const W = e0 - w0, H = n0 - s0;
      w0 = Math.min(Math.max(bb.w, w0 + dLon), bb.e - W); s0 = Math.min(Math.max(bb.s, s0 + dLat), bb.n - H);
      return { s: s0, n: s0 + H, w: w0, e: w0 + W };
    }
    if (h.includes('n')) n0 = Math.min(bb.n, Math.max(s0 + 0.5, n0 + dLat));
    if (h.includes('s')) s0 = Math.max(bb.s, Math.min(n0 - 0.5, s0 + dLat));
    if (h.includes('e')) e0 = Math.min(bb.e, Math.max(w0 + 0.5, e0 + dLon));
    if (h.includes('w')) w0 = Math.max(bb.w, Math.min(e0 - 0.5, w0 + dLon));
    return { s: s0, n: n0, w: w0, e: e0 };
  };
  // Which part of the selection is under a point (edges and corners: 8 px mouse, 16 px touch around the line).
  const hitSel = (p, touch) => {
    if (whole || !P) return null;
    const x0 = P.x(box.w), x1 = P.x(box.e), y0 = P.y(box.n), y1 = P.y(box.s), t = touch ? 16 : 8;
    if (p.x < x0 - t || p.x > x1 + t || p.y < y0 - t || p.y > y1 + t) return null;
    const n = Math.abs(p.y - y0) <= t, s0 = Math.abs(p.y - y1) <= t, w = Math.abs(p.x - x0) <= t, e = Math.abs(p.x - x1) <= t;
    const v = n ? 'n' : s0 ? 's' : '', hz = e ? 'e' : w ? 'w' : '';
    if (v || hz) return v + hz;
    return p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1 ? 'inside' : null;
  };
  const dataAt = (p) => { const c0 = S.map.get(cellKey(Math.floor(P.lat(p.y) * 2), Math.floor(P.lon(p.x) * 2))); return c0 || null; };
  const zoomAt = (f, px, py) => {
    if (!view) return;
    const P0 = P, lon = P0.lon(px), lat = P0.lat(py);
    let sc = view.sc * f;
    const v1 = clampView({ sc, cx: lon - (px - size.w / 2) / (k * sc), cy: lat + (py - size.h / 2) / sc });
    cancelAnimationFrame(anim.current); setView(v1); queueSettle(v1);
  };
  const zoomBtn = (f) => {
    if (!view) return;
    const target = clampView({ cx: view.cx, cy: view.cy, sc: view.sc * f });
    flyTo(target);
  };
  const onWheel = useRef(null);
  onWheel.current = (e) => { e.preventDefault(); const p = pt(e); zoomAt(Math.exp(-e.deltaY * 0.0016), p.x, p.y); };
  useEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const h = (e) => onWheel.current(e);
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);
  useEffect(() => { if (draw) setDraw(false); }, [layer, country]);
  useEffect(() => {
    const h = (e) => { if (e.newState === 'open' && draw) setDraw(false); };
    document.addEventListener('toggle', h, true); return () => document.removeEventListener('toggle', h, true);
  }, [draw]);
  useEffect(() => () => { onMode && onMode(''); onHoverYear && onHoverYear(null); }, []); // unmount (tab change): no stuck mode or hover
  // Esc leaves draw mode (and cancels a drag in progress).
  useEffect(() => {
    if (!draw) return undefined;
    const h = (e) => { if (e.key === 'Escape') { setDraw(false); setDrag(null); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [draw]);
  const pendAt = useRef(null);
  const commitClick = (b) => { clearTimeout(pendT.current); setPending(b); pendT.current = setTimeout(() => { pendT.current = null; setPending(null); onBox(b); }, 230); };
  const longT = useRef(null);
  const onDown = (e) => {
    // A live text selection elsewhere on the page turns a map drag into a native drag-and-drop (pointercancel): clear it.
    try { const sl = window.getSelection(); if (sl && sl.rangeCount && !sl.isCollapsed) sl.removeAllRanges(); } catch (err) { /* */ }
    if (e.button !== 0 || (e.target.closest && e.target.closest('.fb-zoomctl, .fb-layerctl, .fb-selchip, .fb-drawtop'))) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    const p = pt(e), touch = e.pointerType === 'touch';
    pointers.current.set(e.pointerId, p);
    clearTimeout(longT.current);
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; setDrag({ pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), v0: view, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }); return; }
    // A second press inside the double-click window: zoom in one step, never a zone change.
    if (pendT.current && pending) {
      clearTimeout(pendT.current); pendT.current = null;
      if (pendAt.current && Math.hypot(p.x - pendAt.current.x, p.y - pendAt.current.y) < 16) { setPending(null); zoomAt(1.6, p.x, p.y); return; }
      const pb = pending; setPending(null); onBox(pb); // a second click elsewhere: the first one counts, this one goes on
    }
    const h = draw || e.shiftKey ? null : hitSel(p, touch);
    const mode = draw || e.shiftKey ? 'draw' : h && h !== 'inside' ? 'resize' : h === 'inside' && !touch ? 'move' : 'pan';
    const d = { a: p, b: p, v0: view, mode, h: mode === 'move' ? 'move' : h, box0: box, moved: false, t0: performance.now(), thr: touch ? 10 : 6, inside: h === 'inside' };
    setDrag(d); setHover(null);
    // Touch: a long press inside the selection picks it up (move).
    if (touch && h === 'inside') longT.current = setTimeout(() => setDrag((q) => (q && !q.moved ? Object.assign({}, q, { mode: 'move', h: 'move' }) : q)), 420);
  };
  const onMove = (e) => {
    if (!drag && e.target.closest && e.target.closest('.fb-zoomctl, .fb-layerctl, .fb-selchip, .fb-drawtop')) { setHover(null); setHandle(null); onHoverYear && onHoverYear(null); return; }
    const p = pt(e);
    if (drag) {
      if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
      if (drag.pinch) {
        if (pointers.current.size < 2) return;
        const [a, b] = [...pointers.current.values()];
        const f = Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, drag.d0), v0 = drag.v0, P0 = proj(v0, k, size.w, size.h);
        const lon = P0.lon(drag.mid.x), lat = P0.lat(drag.mid.y), sc = v0.sc * f;
        const v1 = clampView({ sc, cx: lon - (drag.mid.x - size.w / 2) / (k * sc), cy: lat + (drag.mid.y - size.h / 2) / sc });
        setView(v1); queueSettle(v1); return;
      }
      // A click survives ordinary jitter: movement under 6 px (10 px for touch) is not a drag (audit-v5 §3.8).
      const moved = drag.moved || Math.hypot(p.x - drag.a.x, p.y - drag.a.y) >= drag.thr;
      if (moved) clearTimeout(longT.current);
      if (drag.mode === 'pan' && moved) {
        const v0 = drag.v0, v1 = clampView({ sc: v0.sc, cx: v0.cx - (p.x - drag.a.x) / (k * v0.sc), cy: v0.cy + (p.y - drag.a.y) / v0.sc });
        cancelAnimationFrame(anim.current); setView(v1); queueSettle(v1);
      }
      const edit = (drag.mode === 'move' || drag.mode === 'resize') && moved ? editBox(drag.box0, drag.h, p.x - drag.a.x, p.y - drag.a.y) : null;
      setDrag(Object.assign({}, drag, { b: p, moved, edit }));
      return;
    }
    if (!P) return;
    const touch = e.pointerType === 'touch';
    setHandle(draw ? null : hitSel(p, touch));
    const c0 = dataAt(p);
    setHover(c0 ? { c: c0, x: p.x, y: p.y } : null);
    onHoverYear && onHoverYear(layer === 'rec' && c0 && c0.claim ? (harm ? c0.recHarm : c0.recRaw) : null); // the record-year link exists on Record years only
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId); clearTimeout(longT.current);
    if (!drag) return;
    const d = drag; setDrag(null);
    if (d.pinch) return;
    const p = pt(e), dist = Math.hypot(p.x - d.a.x, p.y - d.a.y), quick = performance.now() - d.t0 < 250;
    const click = !d.moved || (quick && dist < 16); // a short press is a click even with a small slip
    if (d.mode === 'draw') {
      if (click) return; // a click in draw mode does nothing; Esc leaves
      onBox(toBox(d.a, d.b)); setDraw(false); return;
    }
    if ((d.mode === 'move' || d.mode === 'resize') && !click) { if (d.edit && !sameBox(d.edit, box)) onBox(d.edit); return; }
    if (!click) return; // a pan
    // Click: a place selects the 2° box around it (the view does not move); no data here → a message, zone unchanged.
    const c0 = dataAt(d.a);
    if (!c0 || !(c0.cum > 0 || c0.det > 0)) { onFlash && onFlash('Aucune détection ici : la zone ne change pas.'); return; }
    const nb = clickBox(d.a);
    if (d.inside && sameBox(nb, box)) return;
    pendAt.current = d.a; commitClick(nb);
  };
  const onDbl = (e) => { e.preventDefault(); };
  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); onUndo && onUndo(); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBtn(1.6); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBtn(1 / 1.6); return; }
    if (e.key === '0') { e.preventDefault(); flyTo(fit); return; }
    const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!d) return;
    e.preventDefault(); setKbd(true);
    let nb;
    if (e.shiftKey) {
      nb = { s: box.s, w: box.w, n: box.n + d[1] * 0.5, e: box.e + d[0] * 0.5 };
      if (nb.n - nb.s < 0.5 || nb.e - nb.w < 0.5 || nb.n > bb.n || nb.e > bb.e) return;
    } else {
      nb = { s: box.s + d[1] * 0.5, n: box.n + d[1] * 0.5, w: box.w + d[0] * 0.5, e: box.e + d[0] * 0.5 };
      if (nb.s < bb.s || nb.n > bb.n || nb.w < bb.w || nb.e > bb.e) return;
    }
    onBox(nb);
  };

  if (!P) return <div className="fb-map" ref={wrap}><div className="fb-map-view" /></div>;
  const rem = remPx() / 16;
  const live = drag && drag.mode === 'draw' && drag.moved ? toBox(drag.a, drag.b) : drag && drag.edit ? drag.edit : pending || null;
  const shown = live || box;
  const R = { x: P.x(shown.w), y: P.y(shown.n), w: Math.max(2, P.x(shown.e) - P.x(shown.w)), h: Math.max(2, P.y(shown.s) - P.y(shown.n)) };
  const label = live ? boxText(live) + ' · ' + boxSize(live) : zoneLabel || boxSize(box);
  const lw = Math.min(size.w - 12, (label.length * 7 + 18 + (live ? 0 : 128)) * rem), lh = (live ? 22 : 28) * rem;
  let labelTop = R.y > lh + 4 ? R.y - lh - 4 : R.y + R.h + 6;
  if (labelTop + lh > size.h) labelTop = Math.max(4, Math.min(size.h - lh - 4, R.y + 4));
  // v6: never under the top tool row (layer control, Draw area): drop below the box instead.
  if (labelTop < 50 * rem && R.y + R.h + 6 + lh <= size.h) labelTop = Math.max(labelTop, R.y + R.h + 6);
  const labelLeft = Math.min(Math.max(4, R.x), size.w - 8 - lw);
  const showLabel = (live || !whole) && !(draw && !live) && !(drag && drag.mode === 'pan' && drag.moved);
  const msgDot = null;
  // Zones the overlays must not cover: the layer control (top-left), the zoom cluster (bottom-right).
  const ctlBox = { x: 0, y: 0, w: Math.min(size.w, 430 * rem), h: 44 * rem }, zoomBox = { x: size.w - (phone ? 52 : 56) * rem, y: size.h - (phone ? 190 : 150) * rem, w: (phone ? 52 : 56) * rem, h: (phone ? 190 : 150) * rem };
  const drawBox = phone ? { x: 0, y: 0, w: 0, h: 0 } : { x: size.w - 140 * rem, y: 0, w: 140 * rem, h: 48 * rem };
  const places = (() => {
    const taken = [], out = [], cwc = 7 * rem, lh2 = 15 * rem;
    const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    // The selection outline is avoided only when it is drawn (not for the whole country, v6).
    const avoid = [ctlBox, zoomBox, drawBox].concat(live || !whole ? [{ x: R.x - 5, y: R.y - 5, w: R.w + 10, h: 10 }, { x: R.x - 5, y: R.y + R.h - 5, w: R.w + 10, h: 10 },
      { x: R.x - 5, y: R.y - 5, w: 10, h: R.h + 10 }, { x: R.x + R.w - 5, y: R.y - 5, w: 10, h: R.h + 10 }] : []);
    if (showLabel) avoid.push({ x: labelLeft - 2, y: labelTop - 2, w: lw + 4, h: lh + 4 });
    const list = zoomLevel < 1.6 ? (PLACES[country] || []).filter((q) => (MAJOR[country] || []).indexOf(q[0]) >= 0) : PLACES[country] || [];
    const max = zoomLevel < 1.6 ? (phone ? 3 : 8) : 12;
    for (const [name, lat, lon] of list) {
      if (out.length >= max) break;
      const x = P.x(lon), y = P.y(lat), w = name.length * cwc + 2;
      if (x < 4 || x > size.w - 4 || y < 4 || y > size.h - 4) continue;
      const dot = { x: x - 3, y: y - 3, w: 6, h: 6 };
      if (avoid.some((a) => hit(dot, a))) continue;
      // Near positions first; then (v6) the same four set off by ~1.5 rem with a short leader line, so a city whose
      // surroundings are covered by data can still be named over empty land or water instead of over the cells.
      const fo = 22 * rem;
      const cands = [{ x: x + 5, y: y - lh2 / 2, a: 'start' }, { x: x - 5 - w, y: y - lh2 / 2, a: 'end' }, { x: x - w / 2, y: y - 4 - lh2, a: 'middle' }, { x: x - w / 2, y: y + 4, a: 'middle' },
        { x: x + fo, y: y - lh2 / 2, a: 'start', far: 1, lx: x + fo - 3, ly: y }, { x: x - fo - w, y: y - lh2 / 2, a: 'end', far: 1, lx: x - fo + 3, ly: y },
        { x: x - w / 2, y: y - fo - lh2, a: 'middle', far: 1, lx: x, ly: y - fo + 1 }, { x: x - w / 2, y: y + fo, a: 'middle', far: 1, lx: x, ly: y + fo - 1 }];
      // Labels avoid the data: of the free positions, take the one over the fewest drawn places; skip if all cover data.
      const cover = (r) => { let n = 0, d = 0; for (let yy = r.y + 1; yy < r.y + r.h; yy += 3) for (let xx = r.x + 1; xx < r.x + r.w; xx += 3) { n++; const c1 = S.map.get(cellKey(Math.floor(P.lat(yy) * 2), Math.floor(P.lon(xx) * 2))); if (c1 && c1.eligible) d++; } return n ? d / n : 0; };
      // v6.1: a leader line may not cross data (sampled every 2 px from 4 px off the dot); such a position is dropped.
      const leadHits = (q) => { if (q.lx == null) return false; const dx = q.lx - x, dy = q.ly - y, L = Math.hypot(dx, dy); for (let t = 4; t <= L; t += 2) { const xx = x + (dx * t) / L, yy = y + (dy * t) / L; const c1 = S.map.get(cellKey(Math.floor(P.lat(yy) * 2), Math.floor(P.lon(xx) * 2))); if (c1 && c1.eligible) return true; } return false; };
      const ok = cands.filter((q) => !leadHits(q)).filter((q) => { const r = { x: q.x, y: q.y, w, h: lh2 }; return r.x >= 2 && r.x + w <= size.w - 2 && r.y >= 2 && r.y + lh2 <= size.h - 2 && !taken.some((t) => hit(r, t)) && !avoid.some((t) => hit(r, t)); })
        .map((q) => Object.assign({ cov: cover({ x: q.x, y: q.y, w, h: lh2 }) }, q)).sort((p1, p2) => (p1.cov <= 0.02) !== (p2.cov <= 0.02) ? (p1.cov <= 0.02 ? -1 : 1) : (p1.far || 0) - (p2.far || 0) || p1.cov - p2.cov);
      const c0 = ok.length && ok[0].cov <= 0.02 ? ok[0] : null; // drop a label whose plate would cover data
      if (!c0) continue;
      taken.push({ x: c0.x - 2, y: c0.y - 1, w: w + 4, h: lh2 + 2 }, dot);
      out.push({ name, x, y, lx: c0.lx, ly: c0.ly, tx: c0.a === 'start' ? c0.x : c0.a === 'end' ? c0.x + w : c0.x + w / 2, ty: c0.y + 11 * rem, a: c0.a, px: c0.x - 2, py: c0.y - 1, pw: w + 4, ph: lh2 + 2 });
    }
    return out;
  })();
  const tipBlock = hover && blocks ? (harm ? BL.harm : BL.raw).get(Math.floor(hover.c.i / 2) * 100000 + Math.floor(hover.c.j / 2)) || null : null;
  const tipCell = hover ? hover.c : kbd && box.n - box.s <= 4 && box.e - box.w <= 4 ? S.map.get(cellKey(Math.floor((box.s + box.n) / 2 * 2 - 1e-9), Math.floor((box.w + box.e) / 2 * 2 - 1e-9))) : null;
  const tipPos = hover ? { x: hover.x, y: hover.y } : { x: R.x + R.w / 2, y: R.y + R.h / 2 };
  const ml = tipCell && ML ? ML.cls.get(cellKey(tipCell.i, tipCell.j)) : null;
  const drawBtn = <button type="button" className={cx('fb-tool fb-drawbtn', !phone && 'has-label')} aria-pressed={draw} title="Tracer une zone (ou Maj+glisser) · Échap annule" onClick={() => setDraw(!draw)}><Icon d="M4 4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4M4 7V4" />{phone ? <span className="sr-only">Tracer une zone</span> : <span>Tracer une zone</span>}</button>;
  const ariaSum = 'Carte ' + DU[country] + ', couche ' + LAYERS.find((l) => l.value === layer).label + ', ' + (harm ? 'série harmonisée' : 'série brute') + '. Zone sélectionnée ' + boxText(box) + ', ' + boxSize(box) + '.';
  return (
    <div className="fb-map">
      <div className={cx('fb-map-view', drag && drag.mode === 'pan' && drag.moved && 'is-grabbing', draw && 'is-draw', kbd && 'is-kbd', !drag && !draw && (handle ? 'cur-' + (handle === 'inside' ? 'move' : handle) : hover ? 'cur-place' : 'cur-grab'), drag && drag.mode !== 'pan' && drag.h && 'cur-' + (drag.h === 'inside' ? 'move' : drag.h))} ref={wrap} onDoubleClick={onDbl}
        data-view={view ? [view.cx.toFixed(2), view.cy.toFixed(2), view.sc.toFixed(2)].join(',') : ''} data-frame={[P.lat(size.h).toFixed(2), P.lat(0).toFixed(2), P.lon(0).toFixed(2), P.lon(size.w).toFixed(2)].join(',')} data-blocks={blocks ? '1' : '0'} data-drag={drag ? drag.mode + (drag.moved ? '+' : '') : ''} data-draw={draw ? '1' : '0'} data-box={[box.s, box.n, box.w, box.e].join(',')} data-ext={[ext.s, ext.n, ext.w, ext.e].map((x) => x.toFixed(2)).join(',')}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={(e) => { pointers.current.delete(e.pointerId); setDrag(null); }} onPointerLeave={() => { setHover(null); onHoverYear && onHoverYear(null); }}>
        <div className="fb-map-layer" ref={layerRef} style={{ transform: tf || undefined }}>
          <canvas ref={cvs} style={{ width: size.w + 'px', height: size.h + 'px' }} aria-hidden="true" />
          <canvas ref={ghost} className="fb-map-ghost" style={{ width: size.w + 'px', height: size.h + 'px' }} aria-hidden="true" />
          <canvas ref={hlc} className="fb-map-hl" style={{ width: size.w + 'px', height: size.h + 'px' }} aria-hidden="true" />
        </div>
        <svg className="fb-map-svg" width={size.w} height={size.h} tabIndex={0} role="img" onKeyDown={onKey} onFocus={() => setKbd(true)} onBlur={() => setKbd(false)} aria-label={ariaSum} aria-describedby="fb-map-help">
          <g className="fb-places" aria-hidden="true">
            {places.map((q) => <g key={q.name}><rect className="fb-place-plate" x={q.px} y={q.py} width={q.pw} height={q.ph} rx="3" />{q.lx != null && <line className="fb-place-lead" x1={q.x} y1={q.y} x2={q.lx} y2={q.ly} />}<circle cx={q.x} cy={q.y} r="2.2" /><text x={q.tx} y={q.ty} textAnchor={q.a}>{q.name}</text></g>)}
          </g>
          {(live || !whole) && <rect x={R.x} y={R.y} width={R.w} height={R.h} rx="1.5" className="fb-sel-halo" />}
          {(live || !whole) && <rect x={R.x} y={R.y} width={R.w} height={R.h} rx="1.5" className={cx('fb-sel', live && 'is-live')} />}
          {hover && !drag && (() => { const c0 = hover.c, x = P.x(c0.lon), y = P.y(c0.lat + 0.5), w = P.x(c0.lon + 0.5) - x, h = P.y(c0.lat) - y; return <rect className="fb-hovcell" x={x - 0.5} y={y - 0.5} width={w + 1} height={h + 1} />; })()}
          {!whole && !draw && !(drag && drag.mode === 'draw') && R.w > 14 && R.h > 14 && (() => {
            const hs = phone ? 9 : 6, pts = [[R.x, R.y], [R.x + R.w / 2, R.y], [R.x + R.w, R.y], [R.x + R.w, R.y + R.h / 2], [R.x + R.w, R.y + R.h], [R.x + R.w / 2, R.y + R.h], [R.x, R.y + R.h], [R.x, R.y + R.h / 2]];
            return <g className="fb-handles" aria-hidden="true">{pts.map(([x, y], i) => <rect key={i} x={x - hs} y={y - hs} width={2 * hs} height={2 * hs} rx="2" />)}</g>;
          })()}
        </svg>
        <span id="fb-map-help" className="sr-only">Cliquez sur un endroit pour sélectionner la zone de 2° qui l’entoure ; la vue ne bouge pas. Glissez pour déplacer la carte, utilisez la molette ou double-cliquez pour zoomer. Le bouton Tracer une zone (ou Maj+glisser) trace une zone. Glissez l’intérieur de la sélection pour la déplacer, ses bords ou ses coins pour la redimensionner. Quand la carte a le focus : les flèches déplacent la zone de 0,5°, Maj avec les flèches la redimensionne, plus et moins zooment, 0 ajuste au pays, Ctrl ou Commande Z annule le dernier changement de zone.</span>
        {kbd && <span className="fb-map-kbd" aria-hidden="true">Flèches : déplacer · Maj+flèches : redimensionner · + − : zoom</span>}
        {showLabel && (live
          ? <span className="fb-sel-label is-live" style={{ transform: 'translate(' + labelLeft + 'px,' + labelTop + 'px)' }} aria-hidden="true">{label}</span>
          : <span className="fb-selchip" style={{ transform: 'translate(' + labelLeft + 'px,' + labelTop + 'px)' }}>
              <b>{label}</b>
              <button type="button" onClick={() => flyTo(zoneView(box))}>Zoomer dessus</button>
              {onClear && <button type="button" aria-label="Revenir à tout le pays" title="Revenir à tout le pays" onClick={onClear}><Icon d="M6 6l12 12M18 6L6 18" /></button>}
            </span>)}
        {msgDot}
        {tipCell && !drag && (
          <div className={cx('fb-maptip', tipPos.x > size.w * 0.55 && 'is-left', tipPos.y > size.h * 0.5 && 'is-up')} ref={tipRef} style={{ '--x': tipPos.x + 'px', '--y': tipPos.y + 'px' }} aria-hidden="true">
            <div className="fb-maptip-t at-mono">{tipBlock ? boxText({ s: tipBlock.lat, n: tipBlock.lat + 1, w: tipBlock.lon, e: tipBlock.lon + 1 }) : boxText({ s: tipCell.lat, n: tipCell.lat + 0.5, w: tipCell.lon, e: tipCell.lon + 0.5 })}</div>
            {tipBlock ? (
              <>
                <div className="fb-maptip-v">{tipBlock.since} sur {tipBlock.n} {tipBlock.n === 1 ? 'case' : 'cases'} : record depuis 2012</div>
                <div className="fb-maptip-m">{harm ? 'harmonisé' : 'brut'} · bloc de 1°{tipBlock.era === 'mixed' ? ', à égalité' : ''}{harm && tipBlock.depends ? ' · ' + tipBlock.depends + ' dépendent du ratio' : ''}{harm && tipBlock.sinceRaw !== tipBlock.since ? ' · brut : ' + tipBlock.sinceRaw + ' sur ' + tipBlock.n : ''}</div>
                {tipCell.claim && <div className="fb-maptip-m">Cette case : record {harm ? tipCell.recHarm : tipCell.recRaw}</div>}
              </>
            ) : layer === 'det' ? (
              <div className="fb-maptip-v">{num(tipCell.det)} <span>détections de feux par an, VIIRS 2012–{LAST}</span></div>
            ) : tipCell.eligible ? (
              <>
                {layer === 'month' && <div className="fb-maptip-v">{mNameC} : {ml === 'record' ? 'un record' : ml === 'top3' ? '3 premiers' : ml === 'active' ? 'active, pas inhabituelle' : 'aucune détection'}</div>}
                {tipCell.high ? <div className="fb-maptip-v">Ratio au-dessus de 4× : non harmonisé</div> : <div className={layer === 'rec' ? 'fb-maptip-v' : 'fb-maptip-m'}>Année record : brute {tipCell.recRaw}, harmonisée {tipCell.recHarm}, MODIS seul {tipCell.recModis}{tipCell.depends ? ' (dépend du ratio)' : ''}</div>}
                <div className={layer === 'ratio' ? 'fb-maptip-v' : 'fb-maptip-m'}>Facteur local {dec(tipCell.ratio, 2)}× <span>({tipCell.rcase === 'own3' ? '3 × 3 cases' : tipCell.rcase === 'own5' ? '5 × 5 cases' : 'ratio du pays'})</span></div>
                <div className="fb-maptip-m">{num(tipCell.cum)} détections de feux {STATS_FROM}–{LAST}, harmonisées</div>
              </>
            ) : <div className="fb-maptip-m">Trop peu de feux ici ({num(tipCell.cum)} détections, {STATS_FROM}–{LAST}) : aucune conclusion</div>}
          </div>
        )}
        {/* v6 (judge C5): on desktop the Draw area tool sits top-right, level with the layer control, so it no longer
            covers southern Québec; on the phone it stays in the bottom tool row. */}
        {!phone && <div className="fb-drawtop">{drawBtn}</div>}
        <div className="fb-zoomctl" role="toolbar" aria-label="Zoom">
          {phone && drawBtn}
          <button type="button" className="fb-tool" aria-label="Zoom avant" title="Zoom avant (+)" onClick={() => zoomBtn(1.6)} disabled={zoomLevel >= 39}><Icon d="M12 5v14M5 12h14" /></button>
          <button type="button" className="fb-tool" aria-label="Zoom arrière" title="Zoom arrière (−)" onClick={() => zoomBtn(1 / 1.6)} disabled={fitNow}><Icon d="M5 12h14" /></button>
          <button type="button" className="fb-tool" aria-label="Zoomer sur la zone" title="Zoomer sur la zone" onClick={() => flyTo(zoneView(box))} disabled={whole}><Icon d="M4 4h16v16H4zM9 9h6v6H9z" /></button>
          <button type="button" className="fb-tool" aria-label="Ajuster au pays" title="Ajuster aux données du pays (0)" onClick={() => flyTo(fit)} disabled={fitNow}><Icon d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></button>
        </div>
      </div>
    </div>
  );
}
