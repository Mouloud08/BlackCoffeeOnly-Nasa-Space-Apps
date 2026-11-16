// FireBridge — every generated sentence, from the numbers. Pure (no DOM) so tools/copycheck.mjs can test all zones.
import { dec, num as NUM_L, pct, spct, PS, X as X_L, ord, monthLong as monthLong_L, cap as cap_L } from './l10n.js';
import { GRADE_RULES, BORROW, MIN_MODIS, LOW, SW, LAST, STATS_FROM } from './metrics.js';
import { guardFr } from './guard.js'; // Z.guard stays English (compared in code); translated where printed

// Display helpers delegate to ./l10n.js (i18n/README.md, step 1): every file importing them from copy.js is localised.
export { X, num as NUM, pct as PCT, spct as SPCT, monthLong, ord as ORD } from './l10n.js';
const X = X_L, NUM = NUM_L, PCT = pct, ORD = ord;
export const F2 = (r) => dec(r, 2);
export const r1 = (x) => Math.round(x * 10) / 10;
const fold = (r) => dec(r, 1); // "multipliées par 1,6"
const NB = ' '; // narrow no-break space before : ; ? ! (glossary §11)

const latTxt = (v) => dec(Math.abs(v), v % 1 ? 1 : 0) + '°';
const ns = (v) => (v >= 0 ? 'N' : 'S'), ew = (v) => (v >= 0 ? 'E' : 'O');
// "47,5°–52,5° N · 80°–68° O"; southern/western boxes read from the equator outwards: "31,5°–26,5° S" as in the spec.
export function boxText(b) {
  const lat = b.s >= 0 ? latTxt(b.s) + '–' + latTxt(b.n) + ' ' + 'N' : b.n <= 0 ? latTxt(b.s) + '–' + latTxt(b.n) + ' S' : latTxt(b.s) + ' S – ' + latTxt(b.n) + ' N';
  const lon = b.e <= 0 ? latTxt(b.w) + '–' + latTxt(b.e) + ' O' : b.w >= 0 ? latTxt(b.w) + '–' + latTxt(b.e) + ' E' : latTxt(b.w) + ' O – ' + latTxt(b.e) + ' E';
  return lat + ' · ' + lon;
}
// English twin for exports.js: exported files are identical in every language (original English behaviour: "47.5°–52.5° N · 80°–68° W").
// Self-contained (the French ds/ copy localises formatDecimal): the original English formatDecimal(v, d, 'en'), en-CA.
const NF_EN = new Map();
const decEn = (v, d) => { let f = NF_EN.get(d); if (!f) { f = new Intl.NumberFormat('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d }); NF_EN.set(d, f); } return f.format(v); };
const latTxtEn = (v) => decEn(Math.abs(v), v % 1 ? 1 : 0) + '°';
export function boxTextEn(b) {
  const lat = b.s >= 0 ? latTxtEn(b.s) + '–' + latTxtEn(b.n) + ' ' + 'N' : b.n <= 0 ? latTxtEn(b.s) + '–' + latTxtEn(b.n) + ' S' : latTxtEn(b.s) + ' S – ' + latTxtEn(b.n) + ' N';
  const lon = b.e <= 0 ? latTxtEn(b.w) + '–' + latTxtEn(b.e) + ' W' : b.w >= 0 ? latTxtEn(b.w) + '–' + latTxtEn(b.e) + ' E' : latTxtEn(b.w) + ' W – ' + latTxtEn(b.e) + ' E';
  return lat + ' · ' + lon;
}
export const boxSize = (b) => {
  const dl = b.n - b.s, dw = b.e - b.w;
  const t = Math.round(dl * 2) * Math.round(dw * 2);
  return dec(dl, dl % 1 ? 1 : 0) + '° × ' + dec(dw, dw % 1 ? 1 : 0) + '° · ' + NUM(t) + (t === 1 ? ' case' : ' cases');
};

/* ───────── fractions in words ───────── */
function nearestWords(x, list, tol) {
  let best = null;
  list.forEach(([v, w]) => { if (Math.abs(x - v) <= tol && (!best || Math.abs(x - v) < Math.abs(x - best[0]))) best = [v, w]; });
  return best ? best[1] : null;
}
// Share of the apparent rise that came from the sensor change ("environ la moitié", "presque tout").
const OVER = { 'un quart': 'plus d’un quart', 'un tiers': 'plus d’un tiers', 'la moitié': 'plus de la moitié', 'deux tiers': 'plus des deux tiers', 'trois quarts': 'plus des trois quarts' };
export function shareWords(s) {
  if (s >= 0.9) return 'presque tout';
  const L = [[1 / 4, 'un quart'], [1 / 3, 'un tiers'], [1 / 2, 'la moitié'], [2 / 3, 'deux tiers'], [3 / 4, 'trois quarts']];
  const near = nearestWords(s, L, 0.035);
  if (near) return 'environ ' + near;
  if (s < 0.25) return 'moins d’un quart';
  let below = L[0][1];
  L.forEach(([v, w]) => { if (v < s) below = w; });
  return OVER[below];
}
// "environ la moitié de la hausse apparente", "presque toute la hausse apparente".
const shareRise = (s) => { const w = shareWords(s); return w === 'presque tout' ? 'presque toute la hausse apparente' : w + ' de la hausse apparente'; };
// "d’environ un quart", "d’environ 45 %".
export function fallWords(h) {
  const d = 1 - h;
  const L = [[0.1, 'un dixième'], [0.2, 'un cinquième'], [0.25, 'un quart'], [1 / 3, 'un tiers'], [0.5, 'la moitié'], [2 / 3, 'deux tiers'], [0.75, 'trois quarts']];
  const near = nearestWords(d, L, 0.03);
  return 'd’environ ' + (near || Math.round(d * 20) * 5 + PS);
}
// French place phrase: "au Canada", "en Argentine", "à La Rioja".
const IN = (p) => (p === 'Canada' ? 'au Canada' : p === 'Argentine' || p === 'Argentina' ? 'en Argentine' : 'à ' + p);

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
    case 'rise-smaller': return 'et non ' + R + ' comme le suggère le brut';
    case 'rise-false': return 'le brut dit ' + R + ' — une hausse qui n’existe pas';
    case 'agree': return 'brut et harmonisé concordent';
    case 'hidden-decline': return 'une baisse que le brut cache (' + R + ')';
    case 'steeper': return 'une baisse plus forte que ne le montre le brut (' + R + ')';
    default: return 'le brut dit ' + R;
  }
}
export function sentence(Z) {
  const R = Z.riseRaw, H = Z.riseH, Hr = r1(H);
  const change = Hr >= 1.15 ? 'ont été multipliées par ' + fold(H) : Hr <= 0.9 ? 'ont baissé ' + fallWords(H) : 'ont à peine changé';
  switch (verdictCase(Z)) {
    case 'rise-smaller': {
      const s = R > 1 && H >= 1 ? (R - H) / (R - 1) : null;
      return 'Les détections ont été multipliées par ' + fold(H) + ' et non par ' + fold(R) + (s != null ? ' : le changement de capteur explique ' + shareRise(s) + '.' : '.');
    }
    case 'rise-false': return 'Les détections ' + change + ' ; la série brute montre une hausse créée par le changement de capteur.';
    case 'agree': return cat(Hr) === 'flat' && cat(r1(R)) === 'flat' ? 'Les détections ont à peine changé.' : 'Les détections ' + change + (cat(Hr) === cat(r1(R)) ? ' ; les données brutes donnent à peu près la même chose (' + X(R) + ').' : ' ; les données brutes disent ' + X(R) + '.');
    case 'hidden-decline': return 'Les détections ont baissé ' + fallWords(H) + ' ; la série brute ne montre presque aucun changement, car le changement de capteur a masqué la baisse.';
    case 'steeper': return 'Les détections ont baissé ' + fallWords(H) + ', plus que ne le montre la série brute (' + X(R) + ').';
    default: return 'Harmonisées, les détections donnent ' + X(H) + ' ; les données brutes, ' + X(R) + '.';
  }
}

/* ───────── reliability ───────── */
const yearsSeen = (n) => n + ' ' + (n < 2 ? 'année bien vue' : 'années bien vues') + ' par les deux satellites';
export function gradeRule(Z) {
  const G = GRADE_RULES;
  if (Z.empty) return 'Aucune détection dans cette zone.';
  if (Z.gradeWhy === 'borrowed') {
    const b = Z.borrowed.stats;
    return 'B : cette zone compte ' + yearsSeen(Z.own.usable.length) + ' (moins de ' + BORROW.below + '), donc le facteur est emprunté à la zone plus large, qui atteint ' + Z.borrowed.grade + ' : facteur mesuré sur ' + b.usable.length + ' années de ce type ; une année typique retirée est prédite à ' + PCT(b.medErr) + ' près ; en retirant les années une à une, le facteur varie de ' + PCT(b.spread) + '.';
  }
  // v6.2: plain words for the quality rule; "a typical year" names the median error, "varies by" the leave-one-out range.
  const own = (g, R) => g + ' : facteur mesuré dans cette zone sur ' + Z.usable.length + ' années bien vues par les deux satellites (' + R.years + ' au minimum) ; une année typique retirée est prédite à ' + PCT(Z.medErr) + ' près (≤ ' + PCT(R.err) + ' permis) ; en retirant les années une à une, le facteur varie de ' + PCT(Z.spread) + ' (≤ ' + PCT(R.spread) + ').';
  if (Z.grade === 'A') return own('A', G.A);
  if (Z.grade === 'B') return own('B', G.B);
  return 'C : ' + whyC(Z);
}
// Plain reason for grade C, with the real counts.
export function whyC(Z) {
  if (Z.notHarm) return Z.notHarm;
  const n = Z.own.usable.length;
  const yrs = n + ' ' + (n < 2 ? 'année de chevauchement utilisable' : 'années de chevauchement utilisables');
  if (Z.gradeWhy === 'own') {
    const why = [];
    if (Z.own.medErr != null && Z.own.medErr > GRADE_RULES.B.err) why.push('erreur médiane ' + PCT(Z.own.medErr) + ' (au-delà de ' + PCT(GRADE_RULES.B.err) + ')');
    if (Z.own.spread != null && Z.own.spread > GRADE_RULES.B.spread) why.push('plage du ratio ' + PCT(Z.own.spread) + ' de sa valeur (au-delà de ' + PCT(GRADE_RULES.B.spread) + ')');
    return yrs + ', mais ' + (why.join(' et ') || 'le test échoue') + '.';
  }
  if (Z.gradeWhy === 'borrowed-weak') {
    const b = Z.borrowed.stats;
    return yrs + ' ici (MODIS ≥ ' + MIN_MODIS + ' cellules-jours) ; la zone plus large ' + boxText(Z.borrowed.box) + ' en compte ' + b.usable.length + ', mais échoue au test (erreur médiane ' + PCT(b.medErr) + ', plage du ratio ' + PCT(b.spread) + ').';
  }
  return yrs + ' ici (MODIS ≥ ' + MIN_MODIS + ' cellules-jours ; ' + BORROW.below + ' nécessaires), et aucune zone plus large, jusqu’à ' + String(BORROW.rings * 0.5).replace('.', ',') + '° autour, n’en atteint ' + BORROW.need + '.';
}

/* ───────── how it works (§8) ───────── */
// v6.2: the question takes its verb from changeVerb (the one verb table), as a past participle for « L’activité … a-t-elle … ? »
// (feminine singular subject): "doublé", "triplé", "quadruplé", "été multipliée par 2,5", "augmenté de 30 %".
const BASE = { doubled: 'doublé', tripled: 'triplé', quadrupled: 'quadruplé' };
const askVerb = (v) => { const w = verbKey(v); if (BASE[w]) return BASE[w]; return /^rose by\b/.test(w) ? 'augmenté de ' + Math.round((v - 1) * 100) + PS : /^rose\b/.test(w) ? 'été multipliée par ' + dec(v, 1) : /^fell\b/.test(w) ? 'baissé de ' + Math.round((1 - v) * 100) + PS : 'changé'; };
// Category of one rise value, the same thresholds as the verdict (1 decimal).
const cat = (x) => (x >= 1.15 ? 'up' : x <= 0.9 ? 'down' : 'flat');
export function story(Z, place) {
  const R = Z.riseRaw, H = Z.riseH;
  if (R == null) return Z.empty ? { q: 'Aucune détection à comparer dans cette zone.', a: 'Choisissez une zone où il y a des feux.', p: 'Rien à harmoniser ici.' } : { q: 'Aucune détection ici avant 2012 : aucun changement ne peut être mesuré.', a: 'Trop peu de détections ici pour harmoniser les deux capteurs de façon fiable.', p: 'Aucune comparaison avant/après possible.' };
  const Rr = r1(R), Hr = H == null ? null : r1(H);
  const C = !Z.harmOK;
  const vc = C ? null : verdictCase(Z);
  let q, a;
  // 1. The question the raw record asks (from the raw rise only; same thresholds as the clause).
  if (Rr >= 1.15) q = 'L’activité des feux' + (place ? ' ' + IN(place) : '') + ' a-t-elle ' + askVerb(R) + ' après 2012 ?';
  else if (Rr > 0.9) q = 'Selon les données brutes, les détections de feux' + (place ? ' ' + IN(place) : '') + ' ont à peine changé.';
  else q = 'Selon les données brutes, les détections de feux' + (place ? ' ' + IN(place) : '') + ' ont baissé après 2012.';
  // 2. The answer, from the verdict case so it never contradicts the clause.
  const asked = Rr >= 1.15;
  if (C) a = asked ? 'Impossible à dire : trop peu de détections ici pour harmoniser les deux capteurs.' : 'Trop peu de détections ici pour harmoniser les deux capteurs de façon fiable.';
  else if (Z.trend && Z.trend.status === 'uncertain') a = asked ? 'Pas comme le disent les données brutes : elles la surestiment de ' + corrFactor(Z) + '. On ne sait même pas si elle a augmenté.' : 'Le facteur de correction est de ' + corrFactor(Z) + ' ; la tendance harmonisée elle-même est incertaine.';
  else if (vc === 'rise-smaller') { const sh = R > 1 && H >= 1 ? (R - H) / (R - 1) : null; a = 'En partie. Le satellite a changé, ce qui en explique ' + (sh != null ? shareWords(sh) : 'une partie') + '.'; }
  else if (vc === 'rise-false') a = Hr <= 0.9 ? 'Non : une fois harmonisées, les détections ont baissé.' : 'Non : une fois harmonisées, les détections ont à peine bougé.';
  else if (vc === 'hidden-decline') a = 'Les données brutes cachent une baisse.';
  else if (vc === 'steeper') a = 'La baisse est plus forte une fois harmonisée.';
  else if (vc === 'agree') a = asked ? (cat(Hr) === 'up' ? 'Oui. La hausse tient une fois les capteurs harmonisés.' : 'À peine. Harmonisé : ' + X(H) + '.') : (cat(Hr) === cat(Rr) ? 'Une fois harmonisé, le constat tient.' : 'Harmonisé : ' + X(H) + ', proche du chiffre brut.');
  else a = Hr > Rr ? (asked ? 'Elle était plus forte : harmonisée, ' + X(H) + '.' : 'Les données brutes cachent une hausse.') : 'Harmonisé : ' + X(H) + '.';
  // 3. The proof headline.
  let p;
  if (C) p = 'Brut ' + X(R) + ', et aucune harmonisation fiable.';
  else if (Z.guard) p = 'Aucune hausse n’est donnée ici : ' + guardFr(Z.guard) + '.';
  else if (Z.trend && Z.trend.status === 'uncertain') p = 'Le brut (' + X(R) + ') lit ' + corrFactor(Z) + ' trop haut ; une fois corrigé, la tendance est incertaine.';
  else {
    const base = X(R) + ' devient ' + X(H);
    if (vc === 'rise-smaller') p = base + '.';
    else if (vc === 'rise-false') p = base + (Hr <= 0.9 ? ' : la hausse n’était pas réelle.' : ' : aucun changement réel.');
    else if (vc === 'hidden-decline') p = base + ' : une baisse que la série brute cachait.';
    else if (vc === 'steeper') p = base + ' : une baisse plus forte.';
    else if (vc === 'agree') p = cat(Rr) === cat(Hr) ? (cat(Hr) === 'up' ? X(R) + ' reste ' + X(H) + ' : la hausse tient.' : cat(Hr) === 'down' ? X(R) + ' reste ' + X(H) + ' : la baisse tient.' : base + ' : aucun changement réel.') : base + ' : brut et harmonisé concordent.';
    else p = base + '.';
  }
  return { q, a, p };
}

/* ───────── the month row (§7) ───────── */
// "un mois de juillet typique", "un mois d’août typique" (glossary: a typical June → un mois de juin typique).
const deM = (m) => (/^[aeiouyéèêh]/i.test(m || '') ? 'd’' : 'de ') + m;
const typM = (m) => 'un mois ' + deM(m) + ' typique';
// v6.2 (P2, P6): plain words: "3,9 fois un mois de juillet typique", "à peu près comme un mois de juillet typique".
export function anomalyWords(a, mName) {
  if (a == null) return '';
  if (a >= 100) return 'plus de 100 fois ' + typM(mName);
  if (a >= 1.05) return dec(a, a >= 10 ? 0 : 1) + ' fois ' + typM(mName);
  if (a >= 0.95) return 'à peu près comme ' + typM(mName);
  if (a >= 0.45 && a <= 0.55) return 'environ la moitié d’' + typM(mName);
  return Math.round(a * 100) + PS + ' d’' + typM(mName);
}
export function rankWords(rank, of, mName) {
  return (rank === 1 ? cap(mName) + ' le plus actif' : ORD(rank) + ' ' + mName + ' le plus actif') + ' sur ' + of;
}
export function payoff(p, name) {
  const k = p.rankV != null ? p.rankV : p.rankM, of = p.rankV != null ? p.ofV : p.ofM, who = p.rankV != null ? 'VIIRS' : 'MODIS';
  const head = (name ? cap(name) + ', ' : '') + who + ' seul : ' + ORD(k) + ' sur seulement ' + of + ' ans. ';
  if (k === p.rank) return head + 'Harmonisé : toujours ' + ORD(p.rank) + ', sur ' + p.of + ' ans et non ' + of + '.';
  return head + 'Harmonisé : ' + ORD(p.rank) + ' sur ' + p.of + '.';
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
  if (b > 0.05) return 'les années calmes sont surestimées ici, d’environ ' + PCT(Math.round(b * 20) / 20) + ' en moyenne';
  if (b < -0.05) return 'les années calmes sont sous-estimées ici, d’environ ' + PCT(Math.round(-b * 20) / 20) + ' en moyenne';
  return 'les années calmes sont prédites à peu près aussi bien que les grandes ici';
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
  if (Z.guard) return 'Aucune hausse n’est donnée pour cette zone : ' + guardFr(Z.guard) + '. Seul le facteur de correction (' + corrFactor(Z) + ') est affiché.';
  const T = Z.trend;
  return 'La tendance elle-même est incertaine ici : ' + X(T.rise) + ' dans la série harmonisée, ' + xr(T.without) + ' sans ' + T.bigYear + ' (plage à 90' + PS + ' : ' + bootRange(T) + ').';
}
export function withoutLine(Z) {
  const T = Z.trend;
  return 'Sans ' + T.bigYear + ', l’année la plus forte : ' + xr(T.without) + '.';
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
  if (x > c.hi) return 'plus que le hasard ne le permet';
  if (x < c.lo) return 'moins que le hasard n’en donnerait';
  if (c.hi - x <= 0.02) return 'à la limite haute de ce que donne le hasard seul';
  if (x - c.lo <= 0.02) return 'à la limite basse de ce que donne le hasard seul';
  return 'dans ce que donne le hasard seul';
}
export const chanceShort = (x, c) => (!c ? '' : x > c.hi ? 'au-dessus du hasard' : x < c.lo ? 'sous le hasard' : c.hi - x <= 0.02 ? 'haut de la plage' : x - c.lo <= 0.02 ? 'bas de la plage' : 'dans la plage');
// v6.2: the base rate in words, from the record period: "Avec 14 des 23 années en 2012 ou après, et une grande saison
// qui établit beaucoup de records d’un coup, le hasard seul donne 45–74 %." (the harmonized chance range, as everywhere).
export const baseRate = (s) => (s && s.chanceHarm ? 'Avec ' + (LAST - SW + 1) + ' années sur ' + (LAST - STATS_FROM + 1) + ' dès 2012, et des saisons qui font beaucoup de records d’un coup, le hasard seul donne ' + chanceRange(s.chanceHarm) + '.' : '');
// One phrase per series, from versus() and the same 2-point edge rule as recordsHeading.
const recWords = (x, c, versus) => { const v = versus(x, c); return v === 'above' ? 'plus de records après 2012 que le hasard n’en donne' : v === 'below' ? 'moins de records après 2012 que le hasard n’en donne' : c.hi - x <= 0.02 ? 'dans la plage du hasard, à sa limite haute' : x - c.lo <= 0.02 ? 'dans la plage du hasard, à sa limite basse' : 'dans la plage du hasard'; };
export function recordSentence(s, versus) {
  if (!s || !s.n) return null;
  const parts = [['brut', s.sinceRaw, s.chanceRaw], ['harmonisé', s.sinceHarm, s.chanceHarm], ['MODIS seul', s.sinceModis, s.chanceModis]];
  const head = 'Cases dont l’année la plus active est 2012 ou après : ' + parts.map(([k, x]) => k + ' ' + P0(x)).join(', ') + '.';
  const ch = s.chanceHarm;
  // "Brut : plus de records après 2012 que le hasard n’en donne. Harmonisé et MODIS seul : dans la plage du hasard, à sa limite haute."
  const groups = [];
  parts.forEach(([k, x, c]) => { const w = recWords(x, c, versus), g = groups.find((q) => q.w === w); if (g) g.k.push(k); else groups.push({ w, k: [k] }); });
  const list = (a) => (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]);
  const verdict = groups.map((g) => cap(list(g.k)) + ' : ' + g.w + '.').join(' ');
  return { head, base: baseRate(s), chance: 'Le hasard seul donne ' + chanceRange(ch) + ' pour la série harmonisée (brute ' + chanceRange(s.chanceRaw) + ', MODIS seul ' + chanceRange(s.chanceModis) + ') : une grande saison de feux établit beaucoup de records d’un coup', verdict };
}

/* ───────── version 5: the one sentence beside the number (never a restatement of it) ───────── */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// v6.2 (P2, P6): "environ 2 fois", "1,6 fois": plain multipliers for the surface sentences.
export function times(v) {
  const n = Math.round(v);
  if (n >= 2 && Math.abs(v - n) / n <= 0.05) return 'environ ' + n + ' fois';
  return dec(v, 1) + ' fois';
}
// "de 2,4 fois" / "d’environ 2 fois".
const deTimes = (v) => { const t = times(v); return (t.startsWith('environ') ? 'd’' : 'de ') + t; };
const SELON = 'Selon les deux séries satellitaires simplement mises bout à bout, elles ';
// Verdict strip (fixed size): the same idea, shorter (« les deux séries » are the two satellite records named just before).
const TWO = 'bout à bout, les deux séries', SELON_S = 'Selon ' + TWO + ', elles ';
// The one plain sentence beside the number (v6.2): generated from the same verdict case as everything else.
export function plainSentence(Z) {
  if (!Z || Z.empty) return 'Aucun feu vu dans cette zone.';
  if (!Z.harmOK) return Z.notHarm ? 'Les deux satellites diffèrent trop ici (' + times(Z.ratio) + ') pour être mis sur une même échelle.' : 'Trop peu de feux ici pour mettre les deux satellites sur une même échelle.';
  // v6.2: the guarded sentences carry the correction factor too (the clause of the uncertain case), then the reason.
  const over = cap(TWO) + ' surestiment ici les feux ' + deTimes(Z.ratio) + ' ; ';
  if (Z.guard) {
    const g = Z.guard;
    // guard.js reasons stay English in Z.guard (compared here); they are translated with guardFr() where printed.
    if (g.startsWith('no detections')) return 'Aucun feu vu ici avant 2012 : aucun changement ne peut être mesuré.';
    if (g.startsWith('only')) return over + 'trop peu de feux avant 2012 pour dire s’ils ont augmenté.';
    if (g.startsWith('Aqua')) return over + 'les anciens satellites se contredisent sur une hausse.';
    return over + 'les années varient trop pour dire s’ils ont augmenté.';
  }
  const R = Z.riseRaw, H = Z.riseH;
  // A named verb (doubled, tripled, quadrupled) only inside changeVerb's bands, the same rule as the Overview headline
  // ("à peu près" for the harmonized figure, plain for the raw one); otherwise the multiplier.
  const named = (v) => /^(doubled|tripled|quadrupled)$/.test(verbKey(v));
  if (Z.trend && Z.trend.status === 'uncertain') return over + 'on ne sait pas s’ils ont vraiment augmenté.';
  switch (verdictCase(Z)) {
    case 'rise-smaller': return (named(H) ? 'Les détections de feux ' + changeVerb(H, true) + '.' : 'Les détections de feux ont vraiment augmenté, ' + times(H) + '.') + ' ' + (named(R) ? cap(TWO) + ' ' + changeVerb(R) : cap(TWO) + ' montrent ' + times(R)) + ' : l’écart vient du changement de satellite.';
    case 'rise-false': return (H <= 0.95 ? 'Les détections de feux ont baissé.' : 'Les détections de feux ont à peine changé.') + ' ' + cap(TWO) + ' montrent une hausse due au changement de satellite de 2012.';
    case 'agree': return 'Le changement de satellite de 2012 compte peu ici : les détections de feux ' + (H > 1.05 ? (named(H) ? changeVerb(H, true) : 'ont augmenté, ' + times(H) + ',') : H < 0.95 ? 'ont baissé' : 'ont à peine changé') + ' dans les deux cas.';
    case 'hidden-decline': return 'Les détections de feux ont baissé. ' + cap(TWO) + ' varient à peine : le changement de satellite de 2012 a masqué la baisse.';
    case 'steeper': return 'Les détections de feux ont baissé plus que ne le montrent les deux séries mises bout à bout.';
    default: return cap(TWO) + ' montrent ' + times(R) + ' le niveau d’avant 2012.';
  }
}
export function shortSentence(Z) {
  if (!Z || Z.empty) return '';
  if (!Z.harmOK) return 'Non harmonisé : ' + whyC(Z);
  if (Z.trend && Z.trend.status === 'uncertain') return uncertainSentence(Z);
  const R = Z.riseRaw, H = Z.riseH, Rr = r1(R);
  switch (verdictCase(Z)) {
    case 'rise-smaller': { const s = R > 1 && H >= 1 ? (R - H) / (R - 1) : null; return s != null ? 'Le changement de capteur explique ' + shareRise(s) + '.' : 'Le changement de capteur explique une partie de la hausse apparente.'; }
    case 'rise-false': return 'La série brute montre une hausse créée par le changement de capteur.';
    case 'agree': return cat(r1(H)) === cat(Rr) ? 'Les données brutes donnent à peu près la même chose : le changement de capteur ne change pas le tableau ici.' : 'Les données brutes disent ' + X(R) + ' ; le changement de capteur ne le modifie que légèrement.';
    case 'hidden-decline': return 'La série brute ne montre presque aucun changement, car le changement de capteur a masqué la baisse.';
    case 'steeper': return 'La baisse est plus forte que ne le montre la série brute.';
    default: return 'Les données brutes disent ' + X(R) + '.';
  }
}
// The uncertain state shows the sensor effect, not a rise: "÷ 2,1" with "le brut lit 2,1× trop haut".
export const factorClause = (Z) => 'le brut lit ' + corrFactor(Z) + ' trop haut';

/* ───────── Evidence takeaways, generated from the numbers ───────── */
// v6.2 (P2): each Evidence title is a plain question with its short answer, generated from the metrics.
export function proofHeading(Z, official) {
  if (!Z || !Z.harmOK) return 'La hausse est-elle réelle ? Cette zone ne peut pas être mise sur une même échelle : pas de réponse ici';
  if (Z.guard) return 'La hausse est-elle réelle ? Incertain : ' + factorClause(Z) + ' et aucune tendance n’est donnée ici';
  if (official) {
    const d = Math.abs(official.harm - official.rise) / official.rise;
    return d <= 0.1 ? 'Est-ce conforme aux chiffres officiels ? Oui : ' + X(official.harm) + ' vs ' + X(official.rise) : 'Est-ce conforme aux chiffres officiels ? Pas de très près : le nôtre ' + X(official.harm) + ', l’officiel ' + X(official.rise);
  }
  // v6.2: a yes/no answer from the states the verdict already has: uncertain → Unclear (the factor, no rise);
  // rise-smaller → Partly; otherwise Yes when the harmonized figure is a rise (same 1.15 threshold), No when it is not.
  if (Z.trend && Z.trend.status === 'uncertain') return 'La hausse est-elle réelle ? Incertain : ' + factorClause(Z) + ' et la tendance est incertaine';
  const yn = verdictCase(Z) === 'rise-smaller' ? 'En partie' : cat(r1(Z.riseH)) === 'up' ? 'Oui' : 'Non';
  return 'La hausse est-elle réelle ? ' + yn + ' : sur une même échelle, ' + X(Z.riseH) + ' (séries simplement mises bout à bout : ' + X(Z.riseRaw) + ')';
}
export const looCount = (Z) => { const r = (Z.loo || []).filter((x) => x.signed != null); return { k: r.filter((x) => Math.round(Math.abs(x.signed) * 100) <= 10).length, n: r.length }; };
export function looHeading(Z) {
  if (!Z || !Z.loo || !Z.loo.length) return 'La correction fonctionne-t-elle année par année ? Trop peu d’années ici pour la tester';
  const { k, n } = looCount(Z);
  return 'La correction fonctionne-t-elle année par année ? À ±10' + PS + ' près pour ' + k + ' années sur ' + n;
}
export function recordsHeading(s, versus) {
  if (!s || !s.n) return 'Le satellite a-t-il créé de faux records ? Trop peu de cases ici pour le dire';
  const vr = versus(s.sinceRaw, s.chanceRaw), vh = versus(s.sinceHarm, s.chanceHarm);
  const edge = vh === 'inside' && (s.chanceHarm.hi - s.sinceHarm <= 0.02 || s.sinceHarm - s.chanceHarm.lo <= 0.02);
  const h = vh === 'inside' ? (edge ? 'dans la plage du hasard, à sa limite' : 'dans la plage du hasard') : vh === 'below' ? 'moins que le hasard (années récentes plus calmes)' : 'toujours au-dessus du hasard';
  return 'Faux records dus au satellite ? Brut : ' + (vr === 'above' ? 'oui' : 'non, dans la plage du hasard') + '. Harmonisé : ' + h;
}

/* ───────── Overview (v6): headline rule table, generated from the metrics; tested in tools/copycheck.mjs ───────── */
// A multiplier rounded to the one decimal shown everywhere (2.0×, 4.2×), then named only inside these bands; never
// rounded into a verb outside them. verbKey is the English rule table (the logic, unchanged); changeVerb renders it in
// French for a plural subject (les détections de feux): "ont doublé", "ont à peu près doublé", "ont baissé de 20 %".
function verbKey(v) {
  const r = Math.round(v * 10) / 10;
  if (r >= 1.8 && r <= 2.3) return 'doubled';
  if (r >= 2.7 && r <= 3.3) return 'tripled';
  if (r >= 3.7 && r <= 4.4) return 'quadrupled';
  if (r >= 2) return 'rose ' + X(v);
  if (r > 1) return 'rose by ' + Math.round((v - 1) * 100) + '%';
  if (r < 1) return 'fell by ' + Math.round((1 - v) * 100) + '%';
  return 'did not change';
}
const NAMED_FR = { doubled: 'doublé', tripled: 'triplé', quadrupled: 'quadruplé' };
export function changeVerb(v, rough) {
  const w = verbKey(v);
  if (NAMED_FR[w]) return 'ont ' + (rough ? 'à peu près ' : '') + NAMED_FR[w];
  if (/^rose by\b/.test(w)) return 'ont augmenté de ' + Math.round((v - 1) * 100) + PS;
  if (/^rose\b/.test(w)) return 'ont été multipliées par ' + dec(v, 1);
  if (/^fell by\b/.test(w)) return 'ont baissé de ' + Math.round((1 - v) * 100) + PS;
  return 'n’ont pas changé';
}
// Rule table:
//  A  harmonized ≥ 1.05 and raw ÷ harmonized ≥ 1.3  → "Les détections de feux au X {verb(H)}. Selon les deux séries … bout à bout, elles {verb(R)}."
//  B  harmonized < 0.95 and raw > 1.05              → "Les détections de feux au X ont baissé. Selon les deux séries … bout à bout, elles ont augmenté."
//  C  otherwise                                     → "Le capteur satellitaire a changé en 2012. Au X, cela change la réponse {R÷H} fois."
// Values are compared as displayed (one decimal), so the sentence never contradicts the figures under it.
export function overviewHeadline(country, H, R) {
  const h = Math.round(H * 10) / 10, rr = Math.round(R * 10) / 10;
  // v6.2: a rounded verb for the harmonized figure (doubled, tripled, quadrupled) gets "roughly" (its range is wide).
  const vH = verbKey(H), rough = /^(doubled|tripled|quadrupled)$/.test(vH);
  if (h >= 1.05 && R / H >= 1.3) return { rule: 'A', text: 'Les détections de feux ' + IN(country) + ' ' + changeVerb(H, rough) + '. ' + SELON + changeVerb(R) + '.' };
  if (h < 0.95 && rr > 1.05) return { rule: 'B', text: 'Les détections de feux ' + IN(country) + ' ont baissé. ' + SELON + 'ont augmenté.' };
  // v6.1: rule C wording; within 0.95–1.05 the factor is not printed.
  const f = R / H;
  if (f >= 0.95 && f <= 1.05) return { rule: 'C', text: 'Le capteur satellitaire a changé en 2012. ' + cap(IN(country)) + ', cela change à peine la réponse.' };
  return { rule: 'C', text: 'Le capteur satellitaire a changé en 2012. ' + cap(IN(country)) + ', les deux séries simplement mises bout à bout donnent ' + dec(f, 1) + ' fois le chiffre corrigé.' };
}
// "environ deux fois plus" only when the ratio rounds into 1.8–2.3; otherwise the figure ("2,6 fois plus").
export function ratioWords(ratio) {
  const r = Math.round(ratio * 10) / 10;
  return r >= 1.8 && r <= 2.3 ? 'environ deux fois plus' : dec(ratio, 1) + ' fois plus';
}
