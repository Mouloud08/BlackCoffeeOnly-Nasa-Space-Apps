// FireBridge — every generated sentence, from the numbers. Pure (no DOM) so tools/copycheck.mjs can test all zones.
// Spanish copy (i18n/es). Same conditions, thresholds, branches and figures as the English src/copy.js; only the words
// and the grammar change. Terms follow i18n/GLOSSARY.md.
import { dec, PS } from './l10n.js';
import { formatDecimal } from '../ds/components/src/scale.js';
import { GRADE_RULES, BORROW, MIN_MODIS, LOW, SW, LAST, STATS_FROM } from './metrics.js';

// Display layer (i18n/README.md, step 1): the shared helpers delegate to ./l10n.js (decimal comma, "55 %", "octubre").
export { X, num as NUM, pct as PCT, spct as SPCT, monthLong, ord as ORD } from './l10n.js';
import { X, num as NUM, pct as PCT, ord as ORD } from './l10n.js';
export const F2 = (r) => dec(r, 2);
export const r1 = (x) => Math.round(x * 10) / 10;
const fold = (r) => dec(r, 1); // "se multiplicaron por 1,6"

const latTxt = (v) => dec(Math.abs(v), v % 1 ? 1 : 0) + '°';
const ns = (v) => (v >= 0 ? 'N' : 'S'), ew = (v) => (v >= 0 ? 'E' : 'O');
// "47,5°–52,5° N · 80°–68° O"; southern/western boxes read from the equator outwards: "31,5°–26,5° S" as in the spec.
export function boxText(b) {
  const lat = b.s >= 0 ? latTxt(b.s) + '–' + latTxt(b.n) + ' ' + 'N' : b.n <= 0 ? latTxt(b.s) + '–' + latTxt(b.n) + ' S' : latTxt(b.s) + ' S – ' + latTxt(b.n) + ' N';
  const lon = b.e <= 0 ? latTxt(b.w) + '–' + latTxt(b.e) + ' O' : b.w >= 0 ? latTxt(b.w) + '–' + latTxt(b.e) + ' E' : latTxt(b.w) + ' O – ' + latTxt(b.e) + ' E';
  return lat + ' · ' + lon;
}
// The English form, for exports.js only (exported files stay English and identical in every language).
const latEn = (v) => formatDecimal(Math.abs(v), v % 1 ? 1 : 0, 'en') + '°';
export function boxTextEn(b) {
  const lat = b.s >= 0 ? latEn(b.s) + '–' + latEn(b.n) + ' ' + 'N' : b.n <= 0 ? latEn(b.s) + '–' + latEn(b.n) + ' S' : latEn(b.s) + ' S – ' + latEn(b.n) + ' N';
  const lon = b.e <= 0 ? latEn(b.w) + '–' + latEn(b.e) + ' W' : b.w >= 0 ? latEn(b.w) + '–' + latEn(b.e) + ' E' : latEn(b.w) + ' W – ' + latEn(b.e) + ' E';
  return lat + ' · ' + lon;
}
export const boxSize = (b) => {
  const dl = b.n - b.s, dw = b.e - b.w;
  const t = Math.round(dl * 2) * Math.round(dw * 2);
  return dec(dl, dl % 1 ? 1 : 0) + '° × ' + dec(dw, dw % 1 ? 1 : 0) + '° · ' + NUM(t) + (t === 1 ? ' celda' : ' celdas');
};

/* ───────── fractions in words ───────── */
function nearestWords(x, list, tol) {
  let best = null;
  list.forEach(([v, w]) => { if (Math.abs(x - v) <= tol && (!best || Math.abs(x - v) < Math.abs(x - best[0]))) best = [v, w]; });
  return best ? best[1] : null;
}
// Share of the apparent rise that came from the sensor change.
export function shareWords(s) {
  if (s >= 0.9) return 'casi todo';
  const L = [[1 / 4, 'un cuarto'], [1 / 3, 'un tercio'], [1 / 2, 'la mitad'], [2 / 3, 'dos tercios'], [3 / 4, 'tres cuartos']];
  const near = nearestWords(s, L, 0.035);
  if (near) return 'alrededor de ' + near;
  if (s < 0.25) return 'menos de un cuarto';
  let below = L[0][1];
  L.forEach(([v, w]) => { if (v < s) below = w; });
  return 'más de ' + below;
}
// "casi todo el aumento aparente" / "alrededor de la mitad del aumento aparente".
const shareOf = (w, noun) => (w === 'casi todo' ? 'casi todo el ' + noun : w + ' del ' + noun);
// The verb agrees with the fraction: "dos tercios … se debieron", "la mitad … se debió".
const cameFrom = (w) => (/tercios|cuartos/.test(w) ? ' se debieron' : ' se debió');
// "alrededor de un cuarto", "alrededor de un 45 %".
export function fallWords(h) {
  const d = 1 - h;
  const L = [[0.1, 'un décimo'], [0.2, 'un quinto'], [0.25, 'un cuarto'], [1 / 3, 'un tercio'], [0.5, 'la mitad'], [2 / 3, 'dos tercios'], [0.75, 'tres cuartos']];
  const near = nearestWords(d, L, 0.03);
  return 'alrededor de ' + (near || 'un ' + Math.round(d * 20) * 5 + PS);
}

/* ───────── the verdict (§4) ───────── */
// One case for the whole page, so the clause, the sentence and the story headlines can never disagree.
//  rise-smaller : harmonized rise, smaller than raw      (Boreal Québec)
//  rise-false   : raw rise, harmonized flat or down       (La Rioja)
//  agree        : raw and harmonized within 0.2
//  hidden-decline: raw flat, harmonized down              (Córdoba)
//  steeper      : raw down, harmonized further down
//  other        : anything else (e.g. harmonized above raw): state the two numbers only
export function verdictCase(Z) {
  const R = r1(Z.riseRaw), H = r1(Z.riseH);
  if (H >= 1.15 && R - H > 0.2) return 'rise-smaller';
  if (R >= 1.15 && H < 1.15 && R - H > 0.2) return 'rise-false';
  if (Math.abs(R - H) <= 0.2 + 1e-9) return 'agree';
  if (R >= 0.9 && R < 1.15 && H <= 0.9) return 'hidden-decline';
  if (R < 1 && R - H > 0.2) return 'steeper';
  return 'other';
}
export function clause(Z) {
  const R = X(Z.riseRaw);
  switch (verdictCase(Z)) {
    case 'rise-smaller': return 'no ' + R + ' como sugieren los datos crudos';
    case 'rise-false': return 'los datos crudos dicen ' + R + ' — un aumento que no existe';
    case 'agree': return 'crudo y armonizado coinciden';
    case 'hidden-decline': return 'un descenso que los datos crudos ocultan (' + R + ')';
    case 'steeper': return 'un descenso mayor que el de los datos crudos (' + R + ')';
    default: return 'los datos crudos dicen ' + R;
  }
}
export function sentence(Z) {
  const R = Z.riseRaw, H = Z.riseH, Hr = r1(H);
  const change = Hr >= 1.15 ? 'se multiplicaron por ' + fold(H) : Hr <= 0.9 ? 'bajaron ' + fallWords(H) : 'apenas cambiaron';
  switch (verdictCase(Z)) {
    case 'rise-smaller': {
      const s = R > 1 && H >= 1 ? (R - H) / (R - 1) : null;
      return 'Las detecciones se multiplicaron por ' + fold(H) + ', no por ' + fold(R) + (s != null ? ': ' + shareOf(shareWords(s), 'aumento aparente') + cameFrom(shareWords(s)) + ' al cambio de sensor.' : '.');
    }
    case 'rise-false': return 'Las detecciones ' + change + '; el registro crudo muestra un aumento creado por el cambio de sensor.';
    case 'agree': return cat(Hr) === 'flat' && cat(r1(R)) === 'flat' ? 'Las detecciones apenas cambiaron.' : 'Las detecciones ' + change + (cat(Hr) === cat(r1(R)) ? '; los datos crudos dan casi lo mismo (' + X(R) + ').' : '; los datos crudos dicen ' + X(R) + '.');
    case 'hidden-decline': return 'Las detecciones bajaron ' + fallWords(H) + '; el registro crudo casi no muestra cambios porque el cambio de sensor ocultó el descenso.';
    case 'steeper': return 'Las detecciones bajaron ' + fallWords(H) + ', más de lo que muestra el registro crudo (' + X(R) + ').';
    default: return 'Armonizadas, las detecciones cambiaron ' + X(H) + '; los datos crudos dicen ' + X(R) + '.';
  }
}

/* ───────── reliability ───────── */
export function gradeRule(Z) {
  const G = GRADE_RULES;
  if (Z.empty) return 'No hay detecciones en esta zona.';
  if (Z.gradeWhy === 'borrowed') {
    const b = Z.borrowed.stats;
    return 'B: esta zona tiene ' + Z.own.usable.length + ' ' + (Z.own.usable.length === 1 ? 'año bien observado' : 'años bien observados') + ' por ambos satélites (menos de ' + BORROW.below + '), así que el factor se toma prestado del área más amplia, que cumple ' + Z.borrowed.grade + ': factor medido en ' + b.usable.length + ' años de ese tipo; un año típico dejado fuera se predice con un margen de ' + PCT(b.medErr) + '; dejando un año fuera cada vez, el factor varía ' + PCT(b.spread) + '.';
  }
  // v6.2: plain words for the quality rule; "a typical year" names the median error, "varies by" the leave-one-out range.
  const own = (g, R) => g + ': factor medido en esta zona en ' + Z.usable.length + ' años bien observados por ambos satélites (se necesitan ' + R.years + ' o más); un año típico dejado fuera se predice con un margen de ' + PCT(Z.medErr) + ' (≤ ' + PCT(R.err) + ' permitido); dejando un año fuera cada vez, el factor varía ' + PCT(Z.spread) + ' (≤ ' + PCT(R.spread) + ').';
  if (Z.grade === 'A') return own('A', G.A);
  if (Z.grade === 'B') return own('B', G.B);
  return 'C: ' + whyC(Z);
}
// Plain reason for grade C, with the real counts.
export function whyC(Z) {
  if (Z.notHarm) return Z.notHarm;
  const n = Z.own.usable.length;
  const yrs = n + ' ' + (n === 1 ? 'año de superposición utilizable' : 'años de superposición utilizables');
  if (Z.gradeWhy === 'own') {
    const why = [];
    if (Z.own.medErr != null && Z.own.medErr > GRADE_RULES.B.err) why.push('error mediano ' + PCT(Z.own.medErr) + ' (más de ' + PCT(GRADE_RULES.B.err) + ')');
    if (Z.own.spread != null && Z.own.spread > GRADE_RULES.B.spread) why.push('variación de la razón ' + PCT(Z.own.spread) + ' (más de ' + PCT(GRADE_RULES.B.spread) + ')');
    return yrs + ', pero ' + (why.join(' y ') || 'la prueba falla') + '.';
  }
  if (Z.gradeWhy === 'borrowed-weak') {
    const b = Z.borrowed.stats;
    return yrs + ' aquí (MODIS ≥ ' + MIN_MODIS + ' celdas-día); el área más amplia ' + boxText(Z.borrowed.box) + ' tiene ' + b.usable.length + ' pero no pasa la prueba (error mediano ' + PCT(b.medErr) + ', variación de la razón ' + PCT(b.spread) + ').';
  }
  return yrs + ' aquí (MODIS ≥ ' + MIN_MODIS + ' celdas-día; se necesitan ' + BORROW.below + '), y ninguna área más amplia, hasta ' + String(BORROW.rings * 0.5).replace('.', ',') + '° alrededor, llega a ' + BORROW.need + '.';
}

/* ───────── how it works (§8) ───────── */
// v6.2: the question takes its verb from the one verb table (verbOf), in the singular: "se cuadruplicó".
const askVerb = (v) => verbOf(v, true);
// Category of one rise value, the same thresholds as the verdict (1 decimal).
const cat = (x) => (x >= 1.15 ? 'up' : x <= 0.9 ? 'down' : 'flat');
export function story(Z, place) {
  const R = Z.riseRaw, H = Z.riseH;
  if (R == null) return Z.empty ? { q: 'No hay detecciones para comparar en esta zona.', a: 'Elija una zona con actividad de fuego.', p: 'Nada que armonizar aquí.' } : { q: 'No hay detecciones aquí antes de 2012, así que no se puede medir ningún cambio.', a: 'Muy pocas detecciones aquí para armonizar los dos sensores de forma confiable.', p: 'No es posible comparar antes y después.' };
  const Rr = r1(R), Hr = H == null ? null : r1(H);
  const C = !Z.harmOK;
  const vc = C ? null : verdictCase(Z);
  let q, a;
  // 1. The question the raw record asks (from the raw rise only; same thresholds as the clause).
  // Spanish: a preset label read inside the sentence starts lowercase ("en todo Canadá", "en toda la Argentina").
  const at = place ? ' en ' + place.replace(/^Tod([oa]) /, 'tod$1 ') : '';
  if (Rr >= 1.15) q = '¿La actividad de fuego' + at + ' ' + askVerb(R) + ' después de 2012?';
  else if (Rr > 0.9) q = 'Los datos crudos dicen que las detecciones de fuego' + at + ' apenas cambiaron.';
  else q = 'Los datos crudos dicen que las detecciones de fuego' + at + ' bajaron después de 2012.';
  // 2. The answer, from the verdict case so it never contradicts the clause.
  const asked = Rr >= 1.15;
  if (C) a = asked ? 'No se puede saber: hay muy pocas detecciones aquí para armonizar los dos sensores.' : 'Muy pocas detecciones aquí para armonizar los dos sensores de forma confiable.';
  else if (Z.trend && Z.trend.status === 'uncertain') a = asked ? 'No como dicen los datos crudos: lo sobrestiman ' + corrFactor(Z) + '. Ni siquiera es seguro que haya subido.' : 'El factor de corrección es ' + corrFactor(Z) + '; la tendencia armonizada en sí es incierta.';
  else if (vc === 'rise-smaller') { const sh = R > 1 && H >= 1 ? (R - H) / (R - 1) : null; a = 'En parte. El satélite cambió, y eso explica ' + (sh != null ? shareOf(shareWords(sh), 'aumento') : 'una parte del aumento') + '.'; }
  else if (vc === 'rise-false') a = Hr <= 0.9 ? 'No: una vez armonizadas, las detecciones bajaron.' : 'No: una vez armonizadas, las detecciones apenas se movieron.';
  else if (vc === 'hidden-decline') a = 'Los datos crudos ocultan un descenso.';
  else if (vc === 'steeper') a = 'El descenso es más marcado una vez armonizado.';
  else if (vc === 'agree') a = asked ? (cat(Hr) === 'up' ? 'Sí. El aumento se mantiene una vez armonizados los sensores.' : 'Apenas. Armonizado, ' + X(H) + '.') : (cat(Hr) === cat(Rr) ? 'Armonizado, el panorama se mantiene.' : 'Armonizado, ' + X(H) + ': cerca de la cifra cruda.');
  else a = Hr > Rr ? (asked ? 'Fue mayor: armonizado, ' + X(H) + '.' : 'Los datos crudos ocultan un aumento.') : 'Armonizado, ' + X(H) + '.';
  // 3. The proof headline.
  let p;
  if (C) p = 'Crudo ' + X(R) + ', y ninguna armonización confiable.';
  else if (Z.guard) p = 'Aquí no se da ningún aumento: ' + Z.guard + '.';
  else if (Z.trend && Z.trend.status === 'uncertain') p = 'El crudo (' + X(R) + ') marca ' + corrFactor(Z) + ' de más; una vez corregido, la tendencia es incierta.';
  else {
    const base = X(R) + ' pasa a ' + X(H);
    if (vc === 'rise-smaller') p = base + '.';
    else if (vc === 'rise-false') p = base + (Hr <= 0.9 ? ': el aumento no era real.' : ': ningún cambio real.');
    else if (vc === 'hidden-decline') p = base + ': un descenso que el registro crudo ocultaba.';
    else if (vc === 'steeper') p = base + ': un descenso más marcado.';
    else if (vc === 'agree') p = cat(Rr) === cat(Hr) ? (cat(Hr) === 'up' ? X(R) + ' queda en ' + X(H) + ': el aumento se mantiene.' : cat(Hr) === 'down' ? X(R) + ' queda en ' + X(H) + ': el descenso se mantiene.' : base + ': ningún cambio real.') : base + ': crudo y armonizado coinciden.';
    else p = base + '.';
  }
  return { q, a, p };
}

/* ───────── the month row (§7) ───────── */
// v6.2 (P2, P6): plain words: "3,9 veces un julio típico", "similar a un julio típico", "alrededor de la mitad de un julio típico".
export function anomalyWords(a, mName) {
  if (a == null) return '';
  if (a >= 100) return 'más de 100 veces un ' + mName + ' típico';
  if (a >= 1.05) return dec(a, a >= 10 ? 0 : 1) + ' veces un ' + mName + ' típico';
  if (a >= 0.95) return 'similar a un ' + mName + ' típico';
  if (a >= 0.45 && a <= 0.55) return 'alrededor de la mitad de un ' + mName + ' típico';
  return Math.round(a * 100) + PS + ' de un ' + mName + ' típico';
}
export function rankWords(rank, of, mName) {
  return (rank === 1 ? 'El ' : 'El ' + ORD(rank) + ' ') + mName + ' más activo de los ' + of;
}
export function payoff(p, name) {
  const k = p.rankV != null ? p.rankV : p.rankM, of = p.rankV != null ? p.ofV : p.ofM, who = p.rankV != null ? 'VIIRS' : 'MODIS';
  // Spanish avoids the ordinal here (glossary §11): "ocupa el puesto 3 de apenas 15 años".
  const head = 'Solo con ' + who + ', ' + (name || 'este mes') + ' ocupa el puesto ' + k + ' de apenas ' + of + ' años. ';
  if (k === p.rank) return head + 'Armonizado: sigue en el puesto ' + p.rank + ', pero de ' + p.of + ' años en lugar de ' + of + ': un registro más largo para juzgarlo.';
  return head + 'En el registro armonizado: puesto ' + p.rank + ' de ' + p.of + '.';
}
export { LOW };

// How the single ratio treats quiet years, measured on this zone's leave-one-out test (never assumed).
export function quietYears(Z) {
  const loo = (Z.loo || []).filter((l) => l.signed != null);
  if (loo.length < 4) return null;
  const ms = loo.map((l) => l.modis).sort((a, b) => a - b), mid = ms[Math.floor(ms.length / 2)];
  const q = loo.filter((l) => l.modis < mid);
  if (!q.length) return null;
  const b = q.reduce((s, l) => s + l.signed, 0) / q.length;
  if (b > 0.05) return 'aquí los años tranquilos se sobrestiman, en promedio alrededor de un ' + PCT(Math.round(b * 20) / 20);
  if (b < -0.05) return 'aquí los años tranquilos se subestiman, en promedio alrededor de un ' + PCT(Math.round(-b * 20) / 20);
  return 'aquí los años tranquilos se predicen más o menos igual de bien que los grandes';
}

/* ───────── trend robustness (SPEC_V2 §1, §3) ───────── */
const fr = (x) => dec(x, x < 0.995 ? 2 : 1);
// Printed range always contains the printed value.
export function bootRange(T) {
  const lo = Math.min(T.lo, T.rise), hi = Math.max(T.hi, T.rise);
  return fr(lo) + '–' + fr(hi);
}
export const xr = (r) => dec(r, r < 0.095 ? 2 : 1) + '×';
export const corrFactor = (Z) => dec(Z.ratio, 1) + '×';
export function uncertainSentence(Z) {
  if (Z.guard) return 'No se da ningún aumento para esta zona: ' + Z.guard + '. Solo se muestra el factor de corrección (' + corrFactor(Z) + ').';
  const T = Z.trend;
  return 'La tendencia en sí es incierta aquí: ' + X(T.rise) + ' en el registro armonizado, ' + xr(T.without) + ' sin ' + T.bigYear + ' (rango del 90' + PS + ': ' + bootRange(T) + ').';
}
export function withoutLine(Z) {
  const T = Z.trend;
  return 'Sin ' + T.bigYear + ', su año más activo: ' + xr(T.without) + '.';
}

/* ───────── record years vs chance (SPEC_V3 round 4, A2) ───────── */
// Head, chance and verdict for How step 4; every range comes from chanceRange() (one rounding rule for every print).
//  harmonized and MODIS alone are inside." Each share is judged against its own chance range; the range quoted is the
//  harmonized one (the three ranges differ by a few points; all are in the Method section and the self-check).
const P0 = (x) => Math.round(x * 100) + PS;
// v6.2: the one way a chance range is printed (rounded ends), so a sentence and a caption can never disagree.
export const chanceRange = (c) => (c ? Math.round(c.lo * 100) + '–' + Math.round(c.hi * 100) + PS : '—');
// v6.2: wording from the distance to the chance bounds (within 2 points of a bound = "at the edge").
export function chanceWords(x, c) {
  if (x == null || !c) return '';
  if (x > c.hi) return 'más de lo que permite el azar';
  if (x < c.lo) return 'menos de lo que daría el azar';
  if (c.hi - x <= 0.02) return 'en el límite superior de lo que da solo el azar';
  if (x - c.lo <= 0.02) return 'en el límite inferior de lo que da solo el azar';
  return 'dentro de lo que da solo el azar';
}
export const chanceShort = (x, c) => (!c ? '' : x > c.hi ? 'por encima del azar' : x < c.lo ? 'por debajo del azar' : c.hi - x <= 0.02 ? 'en el tope del azar' : x - c.lo <= 0.02 ? 'en el piso del azar' : 'dentro del azar');
// v6.2: the base rate in words, from the record period: "Con 14 de los 23 años en 2012 o después, y una gran temporada
// que fija muchos récords a la vez, solo el azar da 45–74 %." (the harmonized chance range, as everywhere).
export const baseRate = (s) => (s && s.chanceHarm ? 'Con ' + (LAST - SW + 1) + ' de los ' + (LAST - STATS_FROM + 1) + ' años desde 2012 y una gran temporada que fija muchos récords a la vez, solo el azar da ' + chanceRange(s.chanceHarm) + '.' : '');
// One phrase per series, from versus() and the same 2-point edge rule as recordsHeading.
const recWords = (x, c, versus) => { const v = versus(x, c); return v === 'above' ? 'más récords después de 2012 de lo que da el azar' : v === 'below' ? 'menos récords después de 2012 de lo que da el azar' : c.hi - x <= 0.02 ? 'dentro del azar, en su límite superior' : x - c.lo <= 0.02 ? 'dentro del azar, en su límite inferior' : 'dentro del azar'; };
export function recordSentence(s, versus) {
  if (!s || !s.n) return null;
  const parts = [['crudo', s.sinceRaw, s.chanceRaw], ['armonizado', s.sinceHarm, s.chanceHarm], ['solo MODIS', s.sinceModis, s.chanceModis]];
  const head = 'Celdas cuyo año más activo es 2012 o posterior: ' + parts.map(([k, x]) => k + ' ' + P0(x)).join(', ') + '.';
  const ch = s.chanceHarm;
  // "Crudo: más récords después de 2012 de lo que da el azar. Armonizado y solo MODIS: dentro del azar, en su límite superior."
  const groups = [];
  parts.forEach(([k, x, c]) => { const w = recWords(x, c, versus), g = groups.find((q) => q.w === w); if (g) g.k.push(k); else groups.push({ w, k: [k] }); });
  const list = (a) => (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]);
  const verdict = groups.map((g) => cap(list(g.k)) + ': ' + g.w + '.').join(' ');
  return { head, base: baseRate(s), chance: 'Solo el azar da ' + chanceRange(ch) + ' para el registro armonizado (crudo ' + chanceRange(s.chanceRaw) + ', solo MODIS ' + chanceRange(s.chanceModis) + '): una gran temporada de incendios fija muchos récords a la vez', verdict };
}

/* ───────── version 5: the one sentence beside the number (never a restatement of it) ───────── */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// v6.2 (P2, P6): "unas 2 veces", "1,6 veces": plain multipliers for the surface sentences.
export function times(v) {
  const n = Math.round(v);
  if (n >= 2 && Math.abs(v - n) / n <= 0.05) return 'unas ' + n + ' veces';
  return dec(v, 1) + ' veces';
}
// The guard reasons (guard.js) are Spanish; these tests pick the same branches as the English startsWith tests.
const G3 = /^ninguna detección/, G1 = /^solo \d/, G5 = /^solo Aqua/;
// The one plain sentence beside the number (v6.2): generated from the same verdict case as everything else.
// Spanish: in the verdict strip (fixed height, the sentence is clamped to two lines) the explanation after the colon says
// "el cambio de 2012" (glossary §7, "the 2012 change") and "Simply joining the two satellite records" is rendered
// "Unir los dos registros sin corregir" / "Sin corregir," so that every case fits two lines at 1280–2560 px.
export function plainSentence(Z) {
  if (!Z || Z.empty) return 'No se observan incendios en esta zona.';
  if (!Z.harmOK) return Z.notHarm ? 'Aquí los dos satélites difieren demasiado (' + times(Z.ratio) + ') para ponerlos en una misma escala.' : 'Muy pocos incendios aquí para poner los dos satélites en una misma escala.';
  // v6.2: the guarded sentences carry the correction factor too (the clause of the uncertain case), then the reason.
  const over = 'Unir los dos registros sin corregir exagera aquí el fuego ' + times(Z.ratio) + '; ';
  if (Z.guard) {
    const g = Z.guard;
    if (G3.test(g)) return 'No se observan incendios aquí antes de 2012, así que no se puede medir ningún cambio.';
    if (G1.test(g)) return over + 'muy pocos incendios antes de 2012 para saber si subió.';
    if (G5.test(g)) return over + 'los satélites anteriores no coinciden en si subió.';
    return over + 'los años varían demasiado para saber si subió.';
  }
  const R = Z.riseRaw, H = Z.riseH;
  // A named verb (se duplicaron, se triplicaron, se cuadruplicaron) only inside changeVerb's bands, the same rule as the
  // Overview headline ("aproximadamente" for the harmonized figure, plain for the raw one); otherwise the multiplier.
  // Spanish: the rise-smaller branch says "Las detecciones" (no "de fuego") to keep the strip within +15 % of English.
  const named = (v) => NAMED.test(changeVerb(v));
  if (Z.trend && Z.trend.status === 'uncertain') return over + 'no es seguro que realmente haya subido.';
  switch (verdictCase(Z)) {
    case 'rise-smaller': return (named(H) ? 'Las detecciones ' + roughly(H) + '.' : 'Las detecciones realmente subieron, ' + times(H) + '.') + ' Sin corregir, ' + (named(R) ? changeVerb(R) : 'subieron ' + times(R)) + ': la diferencia es el cambio de 2012.';
    case 'rise-false': return (H <= 0.95 ? 'Las detecciones de fuego bajaron.' : 'Las detecciones de fuego apenas cambiaron.') + ' Unir los dos registros sin corregir muestra un aumento: se debe al cambio de 2012.';
    case 'agree': return 'El cambio de satélite de 2012 casi no importa aquí: las detecciones de fuego ' + (H > 1.05 ? (named(H) ? roughly(H) : 'subieron ' + times(H)) : H < 0.95 ? 'bajaron' : 'apenas cambiaron') + ' en ambos casos.';
    case 'hidden-decline': return 'Las detecciones de fuego bajaron. Sin corregir, casi no cambian: el cambio de 2012 ocultó el descenso.';
    case 'steeper': return 'Las detecciones de fuego bajaron más de lo que muestran los dos registros sin corregir.';
    default: return 'Unir los dos registros sin corregir muestra ' + times(R) + '.';
  }
}
export function shortSentence(Z) {
  if (!Z || Z.empty) return '';
  if (!Z.harmOK) return 'No armonizado: ' + whyC(Z);
  if (Z.trend && Z.trend.status === 'uncertain') return uncertainSentence(Z);
  const R = Z.riseRaw, H = Z.riseH, Rr = r1(R);
  switch (verdictCase(Z)) {
    case 'rise-smaller': { const s = R > 1 && H >= 1 ? (R - H) / (R - 1) : null; return s != null ? cap(shareOf(shareWords(s), 'aumento aparente')) + cameFrom(shareWords(s)) + ' al cambio de sensor.' : 'Parte del aumento aparente se debió al cambio de sensor.'; }
    case 'rise-false': return 'El registro crudo muestra un aumento creado por el cambio de sensor.';
    case 'agree': return cat(r1(H)) === cat(Rr) ? 'Los datos crudos dan casi lo mismo: el cambio de sensor no altera el panorama aquí.' : 'Los datos crudos dicen ' + X(R) + '; el cambio de sensor lo modifica apenas un poco.';
    case 'hidden-decline': return 'El registro crudo casi no muestra cambios porque el cambio de sensor ocultó el descenso.';
    case 'steeper': return 'El descenso es más marcado de lo que muestra el registro crudo.';
    default: return 'Los datos crudos dicen ' + X(R) + '.';
  }
}
// The uncertain state shows the sensor effect, not a rise: "÷ 2,1" with "el crudo marca 2,1× demasiado alto".
export const factorClause = (Z) => 'el crudo marca ' + corrFactor(Z) + ' de más';

/* ───────── Evidence takeaways, generated from the numbers ───────── */
// v6.2 (P2): each Evidence title is a plain question with its short answer, generated from the metrics.
export function proofHeading(Z, official) {
  if (!Z || !Z.harmOK) return '¿El aumento es real? Esta zona no se puede poner en una misma escala, así que aquí no hay respuesta';
  if (Z.guard) return '¿El aumento es real? No está claro: ' + factorClause(Z) + ' y aquí no se da ninguna tendencia';
  if (official) {
    const d = Math.abs(official.harm - official.rise) / official.rise;
    return d <= 0.1 ? '¿Coincide con las cifras oficiales? Sí: ' + X(official.harm) + ' vs. ' + X(official.rise) : '¿Coincide con las cifras oficiales? No del todo: la nuestra ' + X(official.harm) + ', la oficial ' + X(official.rise);
  }
  // v6.2: a yes/no answer from the states the verdict already has: uncertain → Unclear (the factor, no rise);
  // rise-smaller → Partly; otherwise Yes when the harmonized figure is a rise (same 1.15 threshold), No when it is not.
  if (Z.trend && Z.trend.status === 'uncertain') return '¿El aumento es real? No está claro: ' + factorClause(Z) + ' y la tendencia es incierta';
  const yn = verdictCase(Z) === 'rise-smaller' ? 'En parte' : cat(r1(Z.riseH)) === 'up' ? 'Sí' : 'No';
  return '¿El aumento es real? ' + yn + ': en una misma escala, ' + X(Z.riseH) + ' (registros simplemente unidos: ' + X(Z.riseRaw) + ')';
}
export const looCount = (Z) => { const r = (Z.loo || []).filter((x) => x.signed != null); return { k: r.filter((x) => Math.round(Math.abs(x.signed) * 100) <= 10).length, n: r.length }; };
export function looHeading(Z) {
  if (!Z || !Z.loo || !Z.loo.length) return '¿La corrección funciona año por año? Muy pocos años aquí para probarla';
  const { k, n } = looCount(Z);
  return '¿La corrección funciona año por año? Dentro de ±10' + PS + ' en ' + k + ' de ' + n + ' años';
}
export function recordsHeading(s, versus) {
  if (!s || !s.n) return '¿El satélite creó récords falsos? Muy pocas celdas aquí para saberlo';
  const vr = versus(s.sinceRaw, s.chanceRaw), vh = versus(s.sinceHarm, s.chanceHarm);
  const edge = vh === 'inside' && (s.chanceHarm.hi - s.sinceHarm <= 0.02 || s.sinceHarm - s.chanceHarm.lo <= 0.02);
  const h = vh === 'inside' ? (edge ? 'dentro del azar, en su límite' : 'dentro del azar') : vh === 'below' ? 'menos que el azar (años recientes más calmos)' : 'todavía por encima del azar';
  return '¿El satélite creó récords falsos? Crudo: ' + (vr === 'above' ? 'sí' : 'no, dentro del azar') + '. Armonizado: ' + h;
}

/* ───────── Overview (v6): headline rule table, generated from the metrics; tested in tools/copycheck.mjs ───────── */
// A multiplier rounded to the one decimal shown everywhere (2,0×, 4,2×), then named only inside these bands; never
// rounded into a verb outside them. `one` = singular subject ("la actividad de fuego se duplicó"); otherwise plural
// ("las detecciones de fuego se duplicaron").
function verbOf(v, one) {
  const r = Math.round(v * 10) / 10;
  if (r >= 1.8 && r <= 2.3) return one ? 'se duplicó' : 'se duplicaron';
  if (r >= 2.7 && r <= 3.3) return one ? 'se triplicó' : 'se triplicaron';
  if (r >= 3.7 && r <= 4.4) return one ? 'se cuadruplicó' : 'se cuadruplicaron';
  if (r >= 2) return (one ? 'se multiplicó' : 'se multiplicaron') + ' por ' + dec(v, 1);
  if (r > 1) return (one ? 'subió' : 'subieron') + ' un ' + Math.round((v - 1) * 100) + PS;
  if (r < 1) return (one ? 'bajó' : 'bajaron') + ' un ' + Math.round((1 - v) * 100) + PS;
  return one ? 'no cambió' : 'no cambiaron';
}
export function changeVerb(v) { return verbOf(v, false); }
// The named verbs (English: doubled | tripled | quadrupled).
const NAMED = /^(se duplicaron|se triplicaron|se cuadruplicaron)$/;
// English "roughly doubled" → "se duplicaron aproximadamente" (about double: 2,01× is not "casi", almost).
const roughly = (v) => changeVerb(v) + ' aproximadamente';
// Rule table:
//  A  harmonized ≥ 1.05 and raw ÷ harmonized ≥ 1.3  → "Las detecciones de fuego en X {verb(H)}. Unir simplemente los dos registros satelitales indica que {verb(R)}."
//  B  harmonized < 0.95 and raw > 1.05              → "Las detecciones de fuego en X bajaron. Unir simplemente … indica que subieron."
//  C  otherwise                                     → "El sensor satelital cambió en 2012. En X, … {R÷H} veces la cifra corregida."
// Values are compared as displayed (one decimal), so the sentence never contradicts the figures under it.
export function overviewHeadline(country, H, R) {
  const h = Math.round(H * 10) / 10, rr = Math.round(R * 10) / 10;
  // v6.2: a rounded verb for the harmonized figure (se duplicaron, se triplicaron, se cuadruplicaron) gets
  // "aproximadamente" (English "roughly"; its range is wide).
  const vH = changeVerb(H), rough = NAMED.test(vH);
  if (h >= 1.05 && R / H >= 1.3) return { rule: 'A', text: 'Las detecciones de fuego en ' + country + ' ' + (rough ? roughly(H) : vH) + '. Unir simplemente los dos registros satelitales indica que ' + changeVerb(R) + '.' };
  if (h < 0.95 && rr > 1.05) return { rule: 'B', text: 'Las detecciones de fuego en ' + country + ' bajaron. Unir simplemente los dos registros satelitales indica que subieron.' };
  // v6.1: rule C wording; within 0.95–1.05 the factor is not printed.
  const f = R / H;
  if (f >= 0.95 && f <= 1.05) return { rule: 'C', text: 'El sensor satelital cambió en 2012. En ' + country + ', eso casi no cambia la respuesta.' };
  return { rule: 'C', text: 'El sensor satelital cambió en 2012. En ' + country + ', los dos registros simplemente unidos dan ' + dec(f, 1) + ' veces la cifra corregida.' };
}
// "alrededor del doble de" only when the ratio rounds into 1.8–2.3; otherwise the figure ("2,5 veces más").
// Both read before a noun: "ve {ratioWords} detecciones de fuego que MODIS".
export function ratioWords(ratio) {
  const r = Math.round(ratio * 10) / 10;
  return r >= 1.8 && r <= 2.3 ? 'alrededor del doble de' : dec(ratio, 1) + ' veces más';
}
