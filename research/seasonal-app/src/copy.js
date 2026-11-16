// FireBridge — every generated sentence, from the numbers. Pure (no DOM) so tools/copycheck.mjs can test all zones.
import { formatDecimal, formatStep, formatNumber, ordinal, MONTHS_LONG } from '../ds/components/src/scale.js';
import { GRADE_RULES, BORROW, MIN_MODIS, LOW, SW, LAST, STATS_FROM } from './metrics.js';

export const X = (r) => formatStep(r, 'en'); // rises: always one decimal, "1.6×"
export const F2 = (r) => formatDecimal(r, 2, 'en');
// v6 (judge C5): an error under half a percent reads "<1%", never "0%" or "−0%".
export const PCT = (e) => (e > 0 && e < 0.005 ? '<1%' : formatDecimal(e * 100, 0, 'en') + '%');
export const SPCT = (e) => (Math.abs(e) < 0.005 ? '<1%' : (e > 0 ? '+' : '−') + Math.round(Math.abs(e) * 100) + '%');
export const NUM = (v) => formatNumber(v, 'en');
export const r1 = (x) => Math.round(x * 10) / 10;
const fold = (r) => formatDecimal(r, 1, 'en') + '-fold';
export const monthLong = (m0) => MONTHS_LONG.en[m0];
// SEASONAL PREVIEW: the factor used for calendar month m0: its own (shrunk) factor when its weight is ≥ 0.5, else the
// pooled ratio (the validated wording). short: "4.10 in Mar"; long: "4.10 in March".
export const mfac = (Z, m0, short) => { const b = Z && Z.byMonth && Z.byMonth[m0]; return b && b.corrected && Z.factors ? F2(Z.factors[m0]) + ' in ' + (short ? MONTHS_LONG.en[m0].slice(0, 3) : MONTHS_LONG.en[m0]) : F2(Z.ratio); };
// SEASONAL PREVIEW: MODIS alone vs the harmonized before/after figure, computed for the zone shown (no longer equal by
// construction once each month has its own factor).
// Returns null when no before/after figure may be printed (guarded or uncertain trend): the caller says so instead.
export function modisAloneLine(Z) {
  if (!Z || !Z.harmOK || Z.guard || !Z.trend || Z.trend.status !== 'robust') return null;
  if (Z.riseModis == null || Z.riseH == null || !isFinite(Z.riseModis) || !(Z.riseModis > 0)) return null;
  const d = Z.riseH / Z.riseModis - 1, a = Math.abs(d);
  const dd = a < 0.0005 ? 'the same figure to 0.05%' : (a < 0.01 ? (a * 100).toFixed(1) : Math.round(a * 100)) + '% ' + (d > 0 ? 'below' : 'above') + ' the harmonized ' + F2(Z.riseH) + '×';
  return 'With month factors (experimental), MODIS alone gives ' + F2(Z.riseModis) + '× for this before/after figure, ' + dd + ': no longer equal by construction, close where the month mix of fires barely changed, further apart in small zones.';
}
export const MODIS_ALONE_UNCERTAIN = 'With month factors (experimental), MODIS alone no longer equals the harmonized record by construction; no before/after figure is printed here (trend uncertain).';
export const ORD = (n) => ordinal(n, 'en');

const latTxt = (v) => formatDecimal(Math.abs(v), v % 1 ? 1 : 0, 'en') + '°';
const ns = (v) => (v >= 0 ? 'N' : 'S'), ew = (v) => (v >= 0 ? 'E' : 'W');
// "47.5°–52.5° N · 80°–68° W"; southern/western boxes read from the equator outwards: "31.5°–26.5° S" as in the spec.
export function boxText(b) {
  const lat = b.s >= 0 ? latTxt(b.s) + '–' + latTxt(b.n) + ' ' + 'N' : b.n <= 0 ? latTxt(b.s) + '–' + latTxt(b.n) + ' S' : latTxt(b.s) + ' S – ' + latTxt(b.n) + ' N';
  const lon = b.e <= 0 ? latTxt(b.w) + '–' + latTxt(b.e) + ' W' : b.w >= 0 ? latTxt(b.w) + '–' + latTxt(b.e) + ' E' : latTxt(b.w) + ' W – ' + latTxt(b.e) + ' E';
  return lat + ' · ' + lon;
}
export const boxSize = (b) => {
  const dl = b.n - b.s, dw = b.e - b.w;
  const t = Math.round(dl * 2) * Math.round(dw * 2);
  return formatDecimal(dl, dl % 1 ? 1 : 0, 'en') + '° × ' + formatDecimal(dw, dw % 1 ? 1 : 0, 'en') + '° · ' + NUM(t) + (t === 1 ? ' place' : ' places');
};

/* ───────── fractions in words ───────── */
function nearestWords(x, list, tol) {
  let best = null;
  list.forEach(([v, w]) => { if (Math.abs(x - v) <= tol && (!best || Math.abs(x - v) < Math.abs(x - best[0]))) best = [v, w]; });
  return best ? best[1] : null;
}
// Share of the apparent rise that came from the sensor change.
export function shareWords(s) {
  if (s >= 0.9) return 'almost all';
  const L = [[1 / 4, 'a quarter'], [1 / 3, 'a third'], [1 / 2, 'half'], [2 / 3, 'two thirds'], [3 / 4, 'three quarters']];
  const near = nearestWords(s, L, 0.035);
  if (near) return 'about ' + near;
  if (s < 0.25) return 'less than a quarter';
  let below = L[0][1];
  L.forEach(([v, w]) => { if (v < s) below = w; });
  return 'over ' + below;
}
// "by about a quarter", "by about 45%".
export function fallWords(h) {
  const d = 1 - h;
  const L = [[0.1, 'a tenth'], [0.2, 'a fifth'], [0.25, 'a quarter'], [1 / 3, 'a third'], [0.5, 'half'], [2 / 3, 'two thirds'], [0.75, 'three quarters']];
  const near = nearestWords(d, L, 0.03);
  return 'by about ' + (near || Math.round(d * 20) * 5 + '%');
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
    case 'rise-smaller': return 'not ' + R + ' as raw data suggest';
    case 'rise-false': return 'raw data say ' + R + ' — a rise that is not there';
    case 'agree': return 'raw and harmonized agree';
    case 'hidden-decline': return 'a decline that raw data hide (' + R + ')';
    case 'steeper': return 'a steeper decline than raw data show (' + R + ')';
    default: return 'raw data say ' + R;
  }
}
export function sentence(Z) {
  const R = Z.riseRaw, H = Z.riseH, Hr = r1(H);
  const change = Hr >= 1.15 ? 'rose ' + fold(H) : Hr <= 0.9 ? 'fell ' + fallWords(H) : 'barely changed';
  switch (verdictCase(Z)) {
    case 'rise-smaller': {
      const s = R > 1 && H >= 1 ? (R - H) / (R - 1) : null;
      return 'Detections rose ' + fold(H) + ', not ' + fold(R) + (s != null ? ': ' + shareWords(s) + ' of the apparent rise came from the sensor change.' : '.');
    }
    case 'rise-false': return 'Detections ' + change + '; the raw record shows a rise that the sensor change created.';
    case 'agree': return cat(Hr) === 'flat' && cat(r1(R)) === 'flat' ? 'Detections barely changed.' : 'Detections ' + change + (cat(Hr) === cat(r1(R)) ? '; raw data give much the same (' + X(R) + ').' : '; raw data say ' + X(R) + '.');
    case 'hidden-decline': return 'Detections fell ' + fallWords(H) + '; the raw record shows almost no change because the sensor change hid the decline.';
    case 'steeper': return 'Detections fell ' + fallWords(H) + ', more than the raw record shows (' + X(R) + ').';
    default: return 'Harmonized, detections changed ' + X(H) + '; raw data say ' + X(R) + '.';
  }
}

/* ───────── reliability ───────── */
export function gradeRule(Z) {
  const G = GRADE_RULES;
  if (Z.empty) return 'No detections in this box.';
  if (Z.gradeWhy === 'borrowed') {
    const b = Z.borrowed.stats;
    return 'B: this zone has ' + Z.own.usable.length + ' ' + (Z.own.usable.length === 1 ? 'year' : 'years') + ' seen well by both satellites (fewer than ' + BORROW.below + '), so the factor is borrowed from the wider area, which meets ' + Z.borrowed.grade + ': factor measured on ' + b.usable.length + ' such years; a typical year left out is predicted within ' + PCT(b.medErr) + '; leaving years out one at a time, the factor varies by ' + PCT(b.spread) + '.';
  }
  // v6.2: plain words for the quality rule; "a typical year" names the median error, "varies by" the leave-one-out range.
  const own = (g, R) => g + ': factor measured in this zone on ' + Z.usable.length + ' years seen well by both satellites (' + R.years + '+ needed); a typical year left out is predicted within ' + PCT(Z.medErr) + ' (≤ ' + PCT(R.err) + ' allowed); leaving years out one at a time, the factor varies by ' + PCT(Z.spread) + ' (≤ ' + PCT(R.spread) + ').';
  if (Z.grade === 'A') return own('A', G.A);
  if (Z.grade === 'B') return own('B', G.B);
  return 'C: ' + whyC(Z);
}
// Plain reason for grade C, with the real counts.
export function whyC(Z) {
  if (Z.notHarm) return Z.notHarm;
  const n = Z.own.usable.length;
  const yrs = n + ' usable overlap ' + (n === 1 ? 'year' : 'years');
  if (Z.gradeWhy === 'own') {
    const why = [];
    if (Z.own.medErr != null && Z.own.medErr > GRADE_RULES.B.err) why.push('median error ' + PCT(Z.own.medErr) + ' (over ' + PCT(GRADE_RULES.B.err) + ')');
    if (Z.own.spread != null && Z.own.spread > GRADE_RULES.B.spread) why.push('ratio range ' + PCT(Z.own.spread) + ' of the ratio (over ' + PCT(GRADE_RULES.B.spread) + ')');
    return yrs + ', but ' + (why.join(' and ') || 'the test fails') + '.';
  }
  if (Z.gradeWhy === 'borrowed-weak') {
    const b = Z.borrowed.stats;
    return yrs + ' here (MODIS ≥ ' + MIN_MODIS + ' cell-days); the wider area ' + boxText(Z.borrowed.box) + ' has ' + b.usable.length + ' but fails the test (median error ' + PCT(b.medErr) + ', ratio range ' + PCT(b.spread) + ').';
  }
  return yrs + ' here (MODIS ≥ ' + MIN_MODIS + ' cell-days; ' + BORROW.below + ' needed), and no wider area up to ' + BORROW.rings * 0.5 + '° around it reaches ' + BORROW.need + '.';
}

/* ───────── how it works (§8) ───────── */
// v6.2: the question takes its verb from changeVerb (the one verb table), in the base form: "quadrupled" → "quadruple".
const BASE = { doubled: 'double', tripled: 'triple', quadrupled: 'quadruple' };
const askVerb = (v) => { const w = changeVerb(v); return BASE[w] || w.replace(/^rose\b/, 'rise').replace(/^fell\b/, 'fall'); };
// Category of one rise value, the same thresholds as the verdict (1 decimal).
const cat = (x) => (x >= 1.15 ? 'up' : x <= 0.9 ? 'down' : 'flat');
export function story(Z, place) {
  const R = Z.riseRaw, H = Z.riseH;
  if (R == null) return Z.empty ? { q: 'No detections to compare in this box.', a: 'Choose a zone with fire activity.', p: 'Nothing to harmonize here.' } : { q: 'No detections here before 2012, so no change can be measured.', a: 'Too few detections here to harmonize the two sensors reliably.', p: 'No before/after comparison possible.' };
  const Rr = r1(R), Hr = H == null ? null : r1(H);
  const C = !Z.harmOK;
  const vc = C ? null : verdictCase(Z);
  let q, a;
  // 1. The question the raw record asks (from the raw rise only; same thresholds as the clause).
  if (Rr >= 1.15) q = 'Did fire activity' + (place ? ' in ' + place : '') + ' ' + askVerb(R) + ' after 2012?';
  else if (Rr > 0.9) q = 'Raw data say fire detections' + (place ? ' in ' + place : '') + ' barely changed.';
  else q = 'Raw data say fire detections' + (place ? ' in ' + place : '') + ' fell after 2012.';
  // 2. The answer, from the verdict case so it never contradicts the clause.
  const asked = Rr >= 1.15;
  if (C) a = asked ? 'We cannot tell: too few detections here to harmonize the two sensors.' : 'Too few detections here to harmonize the two sensors reliably.';
  else if (Z.trend && Z.trend.status === 'uncertain') a = asked ? 'Not as raw data say: they overstate it ' + corrFactor(Z) + '. Whether it rose at all is uncertain.' : 'The correction factor is ' + corrFactor(Z) + '; the harmonized trend itself is uncertain.';
  else if (vc === 'rise-smaller') { const sh = R > 1 && H >= 1 ? (R - H) / (R - 1) : null; a = 'Partly. The satellite changed, and that explains ' + (sh != null ? shareWords(sh) : 'part') + ' of it.'; }
  else if (vc === 'rise-false') a = Hr <= 0.9 ? 'No: once harmonized, detections fell.' : 'No: once harmonized, detections barely moved.';
  else if (vc === 'hidden-decline') a = 'They hide a decline.';
  else if (vc === 'steeper') a = 'The decline is steeper once harmonized.';
  else if (vc === 'agree') a = asked ? (cat(Hr) === 'up' ? 'Yes. The rise holds once the sensors are harmonized.' : 'Hardly. Harmonized, ' + X(H) + '.') : (cat(Hr) === cat(Rr) ? 'Harmonized, the picture holds.' : 'Harmonized, ' + X(H) + ': close to the raw figure.');
  else a = Hr > Rr ? (asked ? 'It was larger: harmonized, ' + X(H) + '.' : 'They hide a rise.') : 'Harmonized, ' + X(H) + '.';
  // 3. The proof headline.
  let p;
  if (C) p = 'Raw ' + X(R) + ', and no reliable harmonization.';
  else if (Z.guard) p = 'No rise is given here: ' + Z.guard + '.';
  else if (Z.trend && Z.trend.status === 'uncertain') p = 'Raw ' + X(R) + ' reads ' + corrFactor(Z) + ' too high; once corrected, the trend is uncertain.';
  else {
    const base = X(R) + ' becomes ' + X(H);
    if (vc === 'rise-smaller') p = base + '.';
    else if (vc === 'rise-false') p = base + (Hr <= 0.9 ? ': the rise was not real.' : ': no real change.');
    else if (vc === 'hidden-decline') p = base + ': a decline the raw record hid.';
    else if (vc === 'steeper') p = base + ': a steeper decline.';
    else if (vc === 'agree') p = cat(Rr) === cat(Hr) ? (cat(Hr) === 'up' ? X(R) + ' stays ' + X(H) + ': the rise holds.' : cat(Hr) === 'down' ? X(R) + ' stays ' + X(H) + ': the decline holds.' : base + ': no real change.') : base + ': raw and harmonized agree.';
    else p = base + '.';
  }
  return { q, a, p };
}

/* ───────── the month row (§7) ───────── */
// v6.2 (P2, P6): plain words: "3.9 times a typical July", "about a typical July", "about half a typical July".
export function anomalyWords(a, mName) {
  if (a == null) return '';
  if (a >= 100) return 'over 100 times a typical ' + mName;
  if (a >= 1.05) return formatDecimal(a, a >= 10 ? 0 : 1, 'en') + ' times a typical ' + mName;
  if (a >= 0.95) return 'about a typical ' + mName;
  if (a >= 0.45 && a <= 0.55) return 'about half a typical ' + mName;
  return Math.round(a * 100) + '% of a typical ' + mName;
}
export function rankWords(rank, of, mName) {
  return (rank === 1 ? 'Most active ' : ORD(rank) + ' most active ') + mName + ' of ' + of;
}
export function payoff(p, name) {
  const k = p.rankV != null ? p.rankV : p.rankM, of = p.rankV != null ? p.ofV : p.ofM, who = p.rankV != null ? 'VIIRS' : 'MODIS';
  const head = 'On ' + who + ' alone, ' + (name || 'this month') + ' ranks ' + ORD(k) + ' of only ' + of + ' years. ';
  if (k === p.rank) return head + 'Harmonized: still ' + ORD(p.rank) + ', but of ' + p.of + ' years instead of ' + of + ', a longer record to judge it by.';
  return head + 'On the harmonized record: ' + ORD(p.rank) + ' of ' + p.of + '.';
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
  if (b > 0.05) return 'quiet years are overestimated here, by about ' + PCT(Math.round(b * 20) / 20) + ' on average';
  if (b < -0.05) return 'quiet years are underestimated here, by about ' + PCT(Math.round(-b * 20) / 20) + ' on average';
  return 'quiet years are predicted about as well as big ones here';
}

/* ───────── trend robustness (SPEC_V2 §1, §3) ───────── */
const fr = (x) => formatDecimal(x, x < 0.995 ? 2 : 1, 'en');
// Printed range always contains the printed value.
export function bootRange(T) {
  const lo = Math.min(T.lo, T.rise), hi = Math.max(T.hi, T.rise);
  return fr(lo) + '–' + fr(hi);
}
export const xr = (r) => formatDecimal(r, r < 0.095 ? 2 : 1, 'en') + '×';
export const corrFactor = (Z) => formatDecimal(Z.ratio, 1, 'en') + '×';
export function uncertainSentence(Z) {
  if (Z.guard) return 'No rise is given for this zone: ' + Z.guard + '. Only the correction factor (' + corrFactor(Z) + ') is shown.';
  const T = Z.trend;
  return 'The trend itself is uncertain here: ' + X(T.rise) + ' on the harmonized record, ' + xr(T.without) + ' without ' + T.bigYear + ' (90% range ' + bootRange(T) + ').';
}
export function withoutLine(Z) {
  const T = Z.trend;
  return 'Without ' + T.bigYear + ', the largest year: ' + xr(T.without) + '.';
}

/* ───────── record years vs chance (SPEC_V3 round 4, A2) ───────── */
// Head, chance and verdict for How step 4; every range comes from chanceRange() (one rounding rule for every print).
//  harmonized and MODIS alone are inside." Each share is judged against its own chance range; the range quoted is the
//  harmonized one (the three ranges differ by a few points; all are in the Method section and the self-check).
const P0 = (x) => Math.round(x * 100) + '%';
// v6.2: the one way a chance range is printed (rounded ends), so a sentence and a caption can never disagree.
export const chanceRange = (c) => (c ? Math.round(c.lo * 100) + '–' + Math.round(c.hi * 100) + '%' : '—');
// v6.2: wording from the distance to the chance bounds (within 2 points of a bound = "at the edge").
export function chanceWords(x, c) {
  if (x == null || !c) return '';
  if (x > c.hi) return 'more than chance allows';
  if (x < c.lo) return 'fewer than chance would give';
  if (c.hi - x <= 0.02) return 'at the top edge of what chance alone gives';
  if (x - c.lo <= 0.02) return 'at the bottom edge of what chance alone gives';
  return 'within what chance alone gives';
}
export const chanceShort = (x, c) => (!c ? '' : x > c.hi ? 'above chance' : x < c.lo ? 'below chance' : c.hi - x <= 0.02 ? 'at the top of chance' : x - c.lo <= 0.02 ? 'at the bottom of chance' : 'within chance');
// v6.2: the base rate in words, from the record period: "With 14 of the 23 years in 2012 or later, and one big season
// setting many records at once, chance alone gives 45–74%." (the harmonized chance range, as everywhere).
export const baseRate = (s) => (s && s.chanceHarm ? 'With ' + (LAST - SW + 1) + ' of the ' + (LAST - STATS_FROM + 1) + ' years in 2012 or later, and one big season setting many records at once, chance alone gives ' + chanceRange(s.chanceHarm) + '.' : '');
// One phrase per series, from versus() and the same 2-point edge rule as recordsHeading.
const recWords = (x, c, versus) => { const v = versus(x, c); return v === 'above' ? 'more records after 2012 than chance gives' : v === 'below' ? 'fewer records after 2012 than chance gives' : c.hi - x <= 0.02 ? 'within chance, at its top edge' : x - c.lo <= 0.02 ? 'within chance, at its bottom edge' : 'within chance'; };
export function recordSentence(s, versus) {
  if (!s || !s.n) return null;
  const parts = [['raw', s.sinceRaw, s.chanceRaw], ['harmonized', s.sinceHarm, s.chanceHarm], ['MODIS alone', s.sinceModis, s.chanceModis]];
  const head = 'Places whose busiest year is 2012 or later: ' + parts.map(([k, x]) => k + ' ' + P0(x)).join(', ') + '.';
  const ch = s.chanceHarm;
  // "Raw: more records after 2012 than chance gives. Harmonized and MODIS alone: within chance, at its top edge."
  const groups = [];
  parts.forEach(([k, x, c]) => { const w = recWords(x, c, versus), g = groups.find((q) => q.w === w); if (g) g.k.push(k); else groups.push({ w, k: [k] }); });
  const list = (a) => (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const verdict = groups.map((g) => cap(list(g.k)) + ': ' + g.w + '.').join(' ');
  return { head, base: baseRate(s), chance: 'Chance alone gives ' + chanceRange(ch) + ' for the harmonized record (raw ' + chanceRange(s.chanceRaw) + ', MODIS alone ' + chanceRange(s.chanceModis) + '): one big fire season sets many records at once', verdict };
}

/* ───────── version 5: the one sentence beside the number (never a restatement of it) ───────── */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// v6.2 (P2, P6): "about 2 times", "1.6 times": plain multipliers for the surface sentences.
export function times(v) {
  const n = Math.round(v);
  if (n >= 2 && Math.abs(v - n) / n <= 0.05) return 'about ' + n + ' times';
  return formatDecimal(v, 1, 'en') + ' times';
}
// The one plain sentence beside the number (v6.2): generated from the same verdict case as everything else.
export function plainSentence(Z) {
  if (!Z || Z.empty) return 'No fires seen in this area.';
  if (!Z.harmOK) return Z.notHarm ? 'The two satellites differ too much here (' + times(Z.ratio) + ') to be put on one scale.' : 'Too few fires here to put the two satellites on one scale.';
  // v6.2: the guarded sentences carry the correction factor too (the clause of the uncertain case), then the reason.
  const over = 'Simply joining the two satellite records overstates fire here ' + times(Z.ratio) + '; ';
  if (Z.guard) {
    const g = Z.guard;
    if (g.startsWith('no detections')) return 'No fires seen here before 2012, so no change can be measured.';
    if (g.startsWith('only')) return over + 'too few fires before 2012 to tell whether it rose.';
    if (g.startsWith('Aqua')) return over + 'the older satellites disagree on whether it rose.';
    return over + 'years vary too much to tell whether it rose.';
  }
  const R = Z.riseRaw, H = Z.riseH;
  // A named verb (doubled, tripled, quadrupled) only inside changeVerb's bands, the same rule as the Overview headline
  // ("roughly" for the harmonized figure, plain for the raw one); otherwise the multiplier.
  const named = (v) => /^(doubled|tripled|quadrupled)$/.test(changeVerb(v));
  if (Z.trend && Z.trend.status === 'uncertain') return over + 'whether it really rose is uncertain.';
  switch (verdictCase(Z)) {
    case 'rise-smaller': return (named(H) ? 'Fire detections roughly ' + changeVerb(H) + '.' : 'Fire detections really rose, ' + times(H) + '.') + ' Simply joining the two satellite records ' + (named(R) ? 'says they ' + changeVerb(R) : 'shows ' + times(R)) + ': the difference is the 2012 satellite change.';
    case 'rise-false': return (H <= 0.95 ? 'Fire detections fell.' : 'Fire detections barely changed.') + ' Simply joining the two satellite records shows a rise: that rise is the 2012 satellite change.';
    case 'agree': return 'The 2012 satellite change hardly matters here: fire detections ' + (H > 1.05 ? (named(H) ? 'roughly ' + changeVerb(H) : 'rose ' + times(H)) : H < 0.95 ? 'fell' : 'barely changed') + ' either way.';
    case 'hidden-decline': return 'Fire detections fell. Simply joining the two satellite records shows almost no change: the 2012 satellite change hid the decline.';
    case 'steeper': return 'Fire detections fell more than simply joining the two satellite records shows.';
    default: return 'Simply joining the two satellite records shows ' + times(R) + '.';
  }
}
export function shortSentence(Z) {
  if (!Z || Z.empty) return '';
  if (!Z.harmOK) return 'Not harmonized: ' + whyC(Z);
  if (Z.trend && Z.trend.status === 'uncertain') return uncertainSentence(Z);
  const R = Z.riseRaw, H = Z.riseH, Rr = r1(R);
  switch (verdictCase(Z)) {
    case 'rise-smaller': { const s = R > 1 && H >= 1 ? (R - H) / (R - 1) : null; return s != null ? cap(shareWords(s)) + ' of the apparent rise came from the sensor change.' : 'Part of the apparent rise came from the sensor change.'; }
    case 'rise-false': return 'The raw record shows a rise that the sensor change created.';
    case 'agree': return cat(r1(H)) === cat(Rr) ? 'Raw data give much the same: the sensor change does not alter the picture here.' : 'Raw data say ' + X(R) + '; the sensor change shifts it only slightly.';
    case 'hidden-decline': return 'The raw record shows almost no change because the sensor change hid the decline.';
    case 'steeper': return 'The decline is steeper than the raw record shows.';
    default: return 'Raw data say ' + X(R) + '.';
  }
}
// The uncertain state shows the sensor effect, not a rise: "÷ 2.1" with "raw reads 2.1× too high".
export const factorClause = (Z) => 'raw reads ' + corrFactor(Z) + ' too high';

/* ───────── Evidence takeaways, generated from the numbers ───────── */
// v6.2 (P2): each Evidence title is a plain question with its short answer, generated from the metrics.
export function proofHeading(Z, official) {
  if (!Z || !Z.harmOK) return 'Is the rise real? This area cannot be put on one scale, so there is no answer here';
  if (Z.guard) return 'Is the rise real? Unclear: ' + factorClause(Z) + ' and no trend is given here';
  if (official) {
    const d = Math.abs(official.harm - official.rise) / official.rise;
    return d <= 0.1 ? 'Does it match official figures? Yes: ' + X(official.harm) + ' vs ' + X(official.rise) : 'Does it match official figures? Not closely: ours ' + X(official.harm) + ', official ' + X(official.rise);
  }
  // v6.2: a yes/no answer from the states the verdict already has: uncertain → Unclear (the factor, no rise);
  // rise-smaller → Partly; otherwise Yes when the harmonized figure is a rise (same 1.15 threshold), No when it is not.
  if (Z.trend && Z.trend.status === 'uncertain') return 'Is the rise real? Unclear: ' + factorClause(Z) + ' and the trend is uncertain';
  const yn = verdictCase(Z) === 'rise-smaller' ? 'Partly' : cat(r1(Z.riseH)) === 'up' ? 'Yes' : 'No';
  return 'Is the rise real? ' + yn + ': once on one scale, ' + X(Z.riseH) + ' (records simply joined: ' + X(Z.riseRaw) + ')';
}
export const looCount = (Z) => { const r = (Z.loo || []).filter((x) => x.signed != null); return { k: r.filter((x) => Math.round(Math.abs(x.signed) * 100) <= 10).length, n: r.length }; };
export function looHeading(Z) {
  if (!Z || !Z.loo || !Z.loo.length) return 'Does the correction work year by year? Too few years here to test it';
  const { k, n } = looCount(Z);
  return 'Does the correction work year by year? Within ±10% in ' + k + ' of ' + n + ' years';
}
export function recordsHeading(s, versus) {
  if (!s || !s.n) return 'Did the satellite create false records? Too few places here to tell';
  const vr = versus(s.sinceRaw, s.chanceRaw), vh = versus(s.sinceHarm, s.chanceHarm);
  const edge = vh === 'inside' && (s.chanceHarm.hi - s.sinceHarm <= 0.02 || s.sinceHarm - s.chanceHarm.lo <= 0.02);
  const h = vh === 'inside' ? (edge ? 'within chance, at its edge' : 'within chance') : vh === 'below' ? 'fewer than chance (recent years quieter)' : 'still above chance';
  return 'Did the satellite create false records? Raw: ' + (vr === 'above' ? 'yes' : 'no, within chance') + '. Harmonized: ' + h;
}

/* ───────── Overview (v6): headline rule table, generated from the metrics; tested in tools/copycheck.mjs ───────── */
// A multiplier rounded to the one decimal shown everywhere (2.0×, 4.2×), then named only inside these bands; never
// rounded into a verb outside them.
export function changeVerb(v) {
  const r = Math.round(v * 10) / 10;
  if (r >= 1.8 && r <= 2.3) return 'doubled';
  if (r >= 2.7 && r <= 3.3) return 'tripled';
  if (r >= 3.7 && r <= 4.4) return 'quadrupled';
  if (r >= 2) return 'rose ' + X(v);
  if (r > 1) return 'rose by ' + Math.round((v - 1) * 100) + '%';
  if (r < 1) return 'fell by ' + Math.round((1 - v) * 100) + '%';
  return 'did not change';
}
// Rule table:
//  A  harmonized ≥ 1.05 and raw ÷ harmonized ≥ 1.3  → "Fire detections in X {verb(H)}. Simply joining the two satellite records says they {verb(R)}."
//  B  harmonized < 0.95 and raw > 1.05              → "Fire detections in X fell. Simply joining the two satellite records says they rose."
//  C  otherwise                                     → "The satellite sensor changed in 2012. In X, that changes the answer {R÷H}×."
// Values are compared as displayed (one decimal), so the sentence never contradicts the figures under it.
export function overviewHeadline(country, H, R) {
  const h = Math.round(H * 10) / 10, rr = Math.round(R * 10) / 10;
  // v6.2: a rounded verb for the harmonized figure (doubled, tripled, quadrupled) gets "roughly" (its range is wide).
  const vH = changeVerb(H), rough = /^(doubled|tripled|quadrupled)$/.test(vH);
  if (h >= 1.05 && R / H >= 1.3) return { rule: 'A', text: 'Fire detections in ' + country + ' ' + (rough ? 'roughly ' : '') + vH + '. Simply joining the two satellite records says they ' + changeVerb(R) + '.' };
  if (h < 0.95 && rr > 1.05) return { rule: 'B', text: 'Fire detections in ' + country + ' fell. Simply joining the two satellite records says they rose.' };
  // v6.1: rule C wording; within 0.95–1.05 the factor is not printed.
  const f = R / H;
  if (f >= 0.95 && f <= 1.05) return { rule: 'C', text: 'The satellite sensor changed in 2012. In ' + country + ', it barely changes the answer.' };
  return { rule: 'C', text: 'The satellite sensor changed in 2012. In ' + country + ', the two records simply joined give ' + formatDecimal(f, 1, 'en') + ' times the corrected figure.' };
}
// "about twice" only when the ratio rounds into 1.8–2.3; otherwise the figure.
export function ratioWords(ratio) {
  const r = Math.round(ratio * 10) / 10;
  return r >= 1.8 && r <= 2.3 ? 'about twice as many' : formatDecimal(ratio, 1, 'en') + '× as many';
}
