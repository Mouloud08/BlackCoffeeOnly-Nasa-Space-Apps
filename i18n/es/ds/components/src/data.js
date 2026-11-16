// Données ILLUSTRATIVES, générées par graine : jamais des données FIRMS.
// Unité : cellules-jours par mois (une cellule d'environ 1 km avec au moins une détection un jour donné),
// en équivalent S-NPP VIIRS, pour une région de démonstration.
export const ILLUSTRATIVE_NOTE = 'Illustrative data — synthetic, not FIRMS';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rnd) {
  const u = Math.max(rnd(), 1e-9), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const SEASON = [0.0008, 0.001, 0.006, 0.05, 0.2, 0.33, 0.27, 0.1, 0.03, 0.007, 0.0015, 0.0008];
const SEASON_2023 = [0.001, 0.002, 0.004, 0.02, 0.17, 0.52, 0.2, 0.06, 0.015, 0.005, 0.002, 0.001];
export const FIRE_SEASON = [4, 5, 6, 7, 8, 9, 10]; // avril à octobre
function median(xs) {
  const s = xs.slice().sort((a, b) => a - b), n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
// Tirage d'un compte entier autour d'une espérance : petites espérances en Poisson simple.
function draw(rnd, expct, noise) {
  if (expct <= 0) return 0;
  if (expct < 3) { let k = 0, p = Math.exp(-expct), s = p; const u = rnd(); while (u > s && k < 10) { k++; p *= expct / k; s += p; } return k; }
  return Math.max(0, Math.round(expct * (1 + noise * gauss(rnd))));
}

// Capteurs : dates réelles des archives (à vérifier dans FIRMS), comptes synthétiques.
export const SENSORS = [
  { id: 'terra', family: 'modis', label: 'Terra MODIS', start: '2000-11', end: null },
  { id: 'aqua', family: 'modis', label: 'Aqua MODIS', start: '2002-07', end: null },
  { id: 'snpp', family: 'viirs', label: 'S-NPP VIIRS', start: '2012-01', end: '2026-11', endNote: 'New data ended Nov 2, 2026; NOAA-20 and NOAA-21 continue the VIIRS record' },
  { id: 'noaa20', family: 'viirs', label: 'NOAA-20 VIIRS', start: '2018-04', end: null },
  { id: 'noaa21', family: 'viirs', label: 'NOAA-21 VIIRS', start: '2023-03', end: null },
];

export function illustrativeData(opts) {
  const o = Object.assign({
    seed: 2194, start: 2001, end: 2026, current: { year: 2026, month: 11, day: 11 },
    modisRatio: 2.2, switchYear: 2012, noData: ['2001-06'], lowMedian: 10, offSeasonMedian: 20,
  }, opts || {});
  const rnd = mulberry32(o.seed);
  const rndAqua = mulberry32(o.seed + 7);
  const rndOverlap = mulberry32(o.seed + 13);
  const years = [];
  for (let y = o.start; y <= o.end; y++) years.push(y);
  const annualBase = {};
  years.forEach((y) => {
    let base = Math.round(900 * Math.exp(Math.max(-1.1, Math.min(0.85, 0.5 * gauss(rnd)))) / 10) * 10;
    if (y === 2023) base = 14000;
    annualBase[y] = base;
  });

  // 1. Comptes : le brut est tiré d'abord, l'harmonisé en découle (zéro reste zéro).
  const cells = [];
  const expected = {}; // activité « vraie » attendue, en équivalent S-NPP
  years.forEach((y) => {
    for (let m = 1; m <= 12; m++) {
      const key = y + '-' + String(m).padStart(2, '0');
      const isFuture = y > o.current.year || (y === o.current.year && m > o.current.month);
      const isPartial = y === o.current.year && m === o.current.month;
      const w = y === 2023 ? SEASON_2023[m - 1] : SEASON[m - 1] * Math.exp(0.12 * gauss(rnd));
      let exp = annualBase[y] * w;
      if (isPartial) exp *= o.current.day / 30;
      expected[key] = isFuture ? 0 : exp;
      const sensor = y < o.switchYear ? 'modis' : 'viirs';
      let raw, harmonized;
      if (sensor === 'modis') {
        raw = draw(rnd, exp / o.modisRatio, 0.05);
        harmonized = null; // fixé après l'estimation du ratio sur le recouvrement
      } else {
        harmonized = draw(rnd, exp, 0.05);
        raw = harmonized; // S-NPP est la référence : rien à corriger
      }
      const status = isFuture ? 'future' : o.noData.indexOf(key) >= 0 ? 'nodata' : isPartial ? 'partial' : 'ok';
      const off = status === 'nodata' || isFuture;
      cells.push({ key, year: y, month: m, sensor, status, raw: off ? null : raw, harmonized: off ? null : harmonized });
    }
  });

  // 2. Recouvrement 2012–(année courante − 1) : MODIS et VIIRS mesurent tous deux. Sert à estimer le ratio et à le valider.
  const overlapYears = years.filter((y) => y >= o.switchYear && y < o.current.year);
  const overlap = overlapYears.map((y) => {
    const viirs = cells.filter((c) => c.year === y && c.harmonized != null).reduce((s, c) => s + c.harmonized, 0);
    const modis = Math.round((viirs / o.modisRatio) * (1 + 0.06 * gauss(rndOverlap)));
    return { year: y, viirs, modis };
  });
  // Ratio = médiane des rapports annuels VIIRS / MODIS ; plage = moitié centrale des années (25e–75e centile).
  const q = (xs, f) => { const a = xs.slice().sort((x, y) => x - y); const i = (a.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
  const yearly = overlap.map((r) => r.viirs / Math.max(1, r.modis));
  const ratio = median(yearly);
  const loo = overlap.map((r, i) => {
    const rr = median(yearly.filter((_, j) => j !== i));
    const predicted = r.modis * rr;
    return { year: r.year, ratio: rr, predicted, error: (predicted - r.viirs) / Math.max(1, r.viirs) };
  });
  const absErr = loo.map((l) => Math.abs(l.error)).sort((a, b) => a - b);
  const validation = {
    years: [overlapYears[0], overlapYears[overlapYears.length - 1]],
    planted: o.modisRatio, ratio, ratioLo: q(yearly, 0.25), ratioHi: q(yearly, 0.75),
    medianAbsError: median(absErr), maxAbsError: absErr[absErr.length - 1], bias: mean(loo.map((l) => l.error)), overlap, loo,
  };
  // Harmonisation : années MODIS = brut × ratio estimé ; intervalle = brut × bornes du ratio. VIIRS reste la référence.
  cells.forEach((c) => {
    if (c.raw == null) { c.harmonized = c.lo = c.hi = null; return; }
    if (c.sensor === 'modis') {
      c.harmonized = Math.round(c.raw * validation.ratio);
      c.lo = Math.round(c.raw * validation.ratioLo); c.hi = Math.round(c.raw * validation.ratioHi);
    } else { c.lo = c.hi = c.harmonized; }
  });

  // 3. Médianes mensuelles sur les années complètes, rapports, faibles comptes.
  const medians = {};
  for (let m = 1; m <= 12; m++) {
    medians[m] = median(cells.filter((c) => c.month === m && c.year < o.current.year && c.status === 'ok').map((c) => c.harmonized));
  }
  cells.forEach((c) => {
    c.median = medians[c.month];
    if (c.harmonized == null) { c.ratio = null; c.low = false; return; }
    const ref = c.status === 'partial' ? c.median * (o.current.day / 30) : c.median;
    c.ref = ref;
    c.ratio = ref > 0 ? c.harmonized / ref : null; // médiane nulle : pas de rapport, on donne les comptes
    c.low = ref < o.lowMedian; // rapport indicatif seulement
  });

  // 4. Totaux annuels, intervalle, témoin Aqua indépendant (même capteur 2003 → aujourd'hui).
  const annual = years.map((y) => {
    const cs = cells.filter((c) => c.year === y && c.harmonized != null);
    const harmonized = cs.reduce((s, c) => s + c.harmonized, 0);
    const raw = cs.reduce((s, c) => s + c.raw, 0);
    const lo = cs.reduce((s, c) => s + c.lo, 0), hi = cs.reduce((s, c) => s + c.hi, 0);
    const exp = cells.filter((c) => c.year === y).reduce((s, c) => s + expected[c.key], 0);
    const aquaRaw = y < 2003 ? null : Math.round((exp / 2.6) * (1 + 0.07 * gauss(rndAqua)));
    return { year: y, harmonized, raw, lo, hi, aquaRaw, sensor: y < o.switchYear ? 'modis' : 'viirs', partial: y === o.current.year };
  });
  // Indice Aqua : remis à l'échelle de la série harmonisée sur le recouvrement (sa forme ne doit rien à l'harmonisation).
  const ov = annual.filter((a) => a.year >= o.switchYear && !a.partial && a.aquaRaw != null);
  const aquaScale = median(ov.map((a) => a.harmonized)) / Math.max(1, median(ov.map((a) => a.aquaRaw)));
  annual.forEach((a) => { a.aqua = a.aquaRaw == null || a.partial ? null : Math.round(a.aquaRaw * aquaScale); });

  // 5. Saut de 2012 : médiane des totaux annuels après (2012 → année passée) / avant (2003–2011, depuis Aqua), brut et harmonisé.
  const before = annual.filter((a) => a.year >= 2003 && a.year < o.switchYear);
  const after = annual.filter((a) => a.year >= o.switchYear && !a.partial);
  const rel = (k) => median(after.map((a) => a[k])) / Math.max(1, median(before.map((a) => a[k])));
  const level = (rows, k) => median(rows.map((a) => a[k]));
  const step = {
    year: o.switchYear, raw: rel('raw'), harmonized: rel('harmonized'), aqua: rel('aqua'), before: [2003, o.switchYear - 1], after: [o.switchYear, o.current.year - 1],
    levels: { raw: { before: level(before, 'raw'), after: level(after, 'raw') }, harmonized: { before: level(before, 'harmonized'), after: level(after, 'harmonized') } },
  };

  // 6. Saison des feux (avril–octobre) : année courante à date contre la saison médiane.
  const seasonSum = (y) => cells.filter((c) => c.year === y && FIRE_SEASON.indexOf(c.month) >= 0 && c.harmonized != null).reduce((s, c) => s + c.harmonized, 0);
  const seasonMedian = median(years.filter((y) => y < o.current.year).map(seasonSum));
  const season = { year: o.current.year, value: seasonSum(o.current.year), median: seasonMedian, of: years.length };
  season.ratio = seasonMedian > 0 ? season.value / seasonMedian : null;
  season.rank = 1 + years.filter((y) => seasonSum(y) > season.value).length;

  // 7. Mois courant, record, classement.
  const byKey = {};
  cells.forEach((c) => (byKey[c.key] = c));
  const currentCell = byKey[o.current.year + '-' + String(o.current.month).padStart(2, '0')];
  const scored = cells.filter((c) => c.status === 'ok' && c.ratio != null && !c.low);
  const ranking = scored.slice().sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  const current = Object.assign({}, o.current, { key: currentCell.key, cell: currentCell, offSeason: medians[o.current.month] < o.offSeasonMedian });

  return {
    years, cells, byKey, annual, medians, sensors: SENSORS, current, seed: o.seed,
    validation, step, season, record: ranking[0], ranking, switchYear: o.switchYear, lowMedian: o.lowMedian,
    illustrative: true, unit: 'cell-days, S-NPP equivalent', note: ILLUSTRATIVE_NOTE,
  };
}

// Répartition d'un total mensuel sur les cases de 0,5° de la zone (13 × 4) : champ lisse, déterministe par clé. Illustratif.
export function zoneField(total, seedKey, cols = 13, rows = 4) {
  let h = 2166136261;
  for (let i = 0; i < seedKey.length; i++) h = Math.imul(h ^ seedKey.charCodeAt(i), 16777619);
  const rnd = mulberry32(h >>> 0);
  const k = 2 + Math.floor(rnd() * 3);
  const blobs = Array.from({ length: k }, () => ({ x: rnd() * cols, y: rnd() * rows, s: 0.9 + rnd() * 2.1, w: 0.4 + rnd() }));
  const cells = [];
  let sum = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let w = 0.015;
    blobs.forEach((b) => { const dx = i + 0.5 - b.x, dy = j + 0.5 - b.y; w += b.w * Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s)); });
    cells.push({ i, j, w }); sum += w;
  }
  return cells.map((c) => ({ i: c.i, j: c.j, value: (total || 0) * c.w / sum }));
}

/* ───────────── Données FIRMS réelles ───────────── */
// Même forme que illustrativeData : les composants lisent l'une ou l'autre sans le savoir.
import { FIRMS_ZONES, FIRMS_META } from './firms-data.js';
export { FIRMS_ZONES, FIRMS_META };
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const qtl = (xs, f) => { const a = xs.slice().sort((x, y) => x - y); if (!a.length) return 0; const i = (a.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };

// Ratio poolé ΣVIIRS ÷ ΣMODIS sur le recouvrement, validé en laissant chaque année de côté.
// minModis : une année n'entre dans le test que si MODIS y voit assez de cellules-jours.
export function poolRatio(rows, minModis = 50) {
  const V = sum(rows.map((r) => r.viirs)), M = sum(rows.map((r) => r.modis));
  const ratio = M > 0 ? V / M : null;
  const tested = rows.filter((r) => r.modis >= minModis);
  const loo = tested.map((r) => {
    const rr = (V - r.viirs) / Math.max(1, M - r.modis);
    const predicted = r.modis * rr;
    return { year: r.year, ratio: rr, own: r.viirs / Math.max(1, r.modis), predicted, viirs: r.viirs, modis: r.modis, error: (predicted - r.viirs) / Math.max(1, r.viirs) };
  });
  const absErr = loo.map((l) => Math.abs(l.error)).sort((a, b) => a - b);
  const looRatios = loo.map((l) => l.ratio);
  const own = loo.map((l) => l.own);
  return {
    ratio, ratioLo: looRatios.length ? Math.min(...looRatios) : ratio, ratioHi: looRatios.length ? Math.max(...looRatios) : ratio,
    yearlyLo: own.length ? Math.min(...own) : null, yearlyHi: own.length ? Math.max(...own) : null, yearlyMedian: own.length ? median(own) : null,
    medianAbsError: median(absErr), maxAbsError: absErr[absErr.length - 1] || 0, bias: mean(loo.map((l) => l.error)),
    overlap: rows, loo, years: [rows[0].year, rows[rows.length - 1].year], minModis,
  };
}

export function realData(zoneId = 'boreal', opts) {
  const o = Object.assign({ lowMedian: 10, stat: 'mean' }, opts || {});
  const Z = FIRMS_ZONES[zoneId];
  if (!Z) throw new Error('Zone inconnue : ' + zoneId);
  const parse = (s) => s.split(',').map(Number);
  const S = { modis: parse(Z.modis), aqua: parse(Z.aqua), viirs: parse(Z.viirs) };
  const start = FIRMS_META.first, end = FIRMS_META.last, sw = FIRMS_META.switchYear;
  const years = [];
  for (let y = start; y <= end; y++) years.push(y);
  const idx = (y, m) => (y - start) * 12 + (m - 1);
  const yearSum = (k, y) => sum(S[k].slice(idx(y, 1), idx(y, 1) + 12));

  // 1. Ratio sur le recouvrement 2012–2025 (MODIS et S-NPP VIIRS voient tous deux la zone).
  const overlapRows = years.filter((y) => y >= sw).map((y) => ({ year: y, viirs: yearSum('viirs', y), modis: yearSum('modis', y) }));
  const pr = poolRatio(overlapRows);
  const validation = Object.assign({ planted: null, method: 'pooled' }, pr);

  // 2. Cases : brut = capteur de l'époque ; harmonisé = MODIS × ratio, VIIRS inchangé.
  const cells = [];
  years.forEach((y) => {
    for (let m = 1; m <= 12; m++) {
      const key = y + '-' + String(m).padStart(2, '0');
      const sensor = y < sw ? 'modis' : 'viirs';
      const raw = S[sensor][idx(y, m)];
      const c = { key, year: y, month: m, sensor, status: 'ok', raw, modis: S.modis[idx(y, m)], aqua: S.aqua[idx(y, m)], viirs: y >= sw ? S.viirs[idx(y, m)] : null };
      if (sensor === 'modis') { c.harmonized = Math.round(raw * pr.ratio); c.lo = Math.round(raw * pr.ratioLo); c.hi = Math.round(raw * pr.ratioHi); }
      else { c.harmonized = c.lo = c.hi = raw; }
      cells.push(c);
    }
  });
  const medians = {};
  for (let m = 1; m <= 12; m++) medians[m] = median(cells.filter((c) => c.month === m).map((c) => c.harmonized));
  cells.forEach((c) => {
    c.median = medians[c.month]; c.ref = c.median;
    c.ratio = c.median > 0 ? c.harmonized / c.median : null;
    c.low = c.median < o.lowMedian;
  });
  const byKey = {};
  cells.forEach((c) => (byKey[c.key] = c));

  // 3. Totaux annuels et témoin Aqua (Aqua seul, même capteur de 2003 à 2025, remis à l'échelle sur le recouvrement).
  const annual = years.map((y) => {
    const cs = cells.filter((c) => c.year === y);
    return { year: y, harmonized: sum(cs.map((c) => c.harmonized)), raw: sum(cs.map((c) => c.raw)), lo: sum(cs.map((c) => c.lo)), hi: sum(cs.map((c) => c.hi)),
      modis: yearSum('modis', y), viirs: y >= sw ? yearSum('viirs', y) : null, aquaRaw: y < 2003 ? null : yearSum('aqua', y), sensor: y < sw ? 'modis' : 'viirs', partial: false };
  });
  const ov = annual.filter((a) => a.year >= sw);
  const aquaScale = sum(ov.map((a) => a.harmonized)) / Math.max(1, sum(ov.map((a) => a.aquaRaw)));
  annual.forEach((a) => { a.aqua = a.aquaRaw == null ? null : Math.round(a.aquaRaw * aquaScale); });

  // 4. Saut de 2012 : année moyenne après (2012–2025) ÷ avant (2003–2011). La moyenne garde le poids des grandes années.
  const before = annual.filter((a) => a.year >= 2003 && a.year < sw);
  const after = annual.filter((a) => a.year >= sw);
  const agg = o.stat === 'median' ? median : mean;
  const rel = (k) => agg(after.map((a) => a[k])) / Math.max(1, agg(before.map((a) => a[k])));
  const level = (rows, k) => agg(rows.map((a) => a[k]));
  const step = {
    year: sw, stat: o.stat, raw: rel('raw'), harmonized: rel('harmonized'), aqua: rel('aqua'), modisOnly: rel('modis'), before: [2003, sw - 1], after: [sw, end],
    levels: { raw: { before: level(before, 'raw'), after: level(after, 'raw') }, harmonized: { before: level(before, 'harmonized'), after: level(after, 'harmonized') } },
  };

  // 5. Saison (avril–octobre) de la dernière année complète, contre la saison médiane des autres années.
  const seasonSum = (y) => sum(cells.filter((c) => c.year === y && FIRE_SEASON.indexOf(c.month) >= 0).map((c) => c.harmonized));
  const seasonMedian = median(years.filter((y) => y !== end).map(seasonSum));
  const season = { year: end, value: seasonSum(end), median: seasonMedian, of: years.length };
  season.ratio = seasonMedian > 0 ? season.value / seasonMedian : null;
  season.rank = 1 + years.filter((y) => seasonSum(y) > season.value).length;
  const seasons = years.map((y) => ({ year: y, value: seasonSum(y) }));

  const scored = cells.filter((c) => c.ratio != null && !c.low);
  const ranking = scored.slice().sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  const lastKey = end + '-12';
  const current = { year: end, month: 12, day: 31, complete: true, key: lastKey, cell: byKey[lastKey], offSeason: true };

  return {
    years, cells, byKey, annual, medians, sensors: SENSORS, current, seed: null,
    validation, step, season, seasons, record: ranking[0], ranking, switchYear: sw, lowMedian: o.lowMedian,
    illustrative: false, source: 'firms', zoneId, zone: Z, tiles: decodeTiles(Z), meta: FIRMS_META,
    unit: 'cell-days, S-NPP equivalent', note: 'NASA FIRMS · ' + FIRMS_META.modisProduct + ' + ' + FIRMS_META.viirsProduct,
  };
}

// Tuiles 0,5° : « mi.i.j.n » → { mi: [{ i, j, n }] } (MODIS avant 2012, VIIRS ensuite).
function decodeTiles(Z) {
  const out = {};
  [Z.tM, Z.tV].forEach((s) => (s || '').split(' ').forEach((t) => {
    if (!t) return;
    const [mi, i, j, n] = t.split('.').map(Number);
    (out[mi] || (out[mi] = [])).push({ i, j, n });
  }));
  return out;
}
// Tuiles d'une cible (mois épinglé ou saison) dans la série affichée.
export function zoneTiles(d, target, mode = 'harmonized') {
  if (!d.tiles) return null;
  const months = target && !target.season ? [[target.year, target.month]] : FIRE_SEASON.map((m) => [d.season.year, m]);
  const acc = {};
  months.forEach(([y, m]) => {
    const mi = (y - d.years[0]) * 12 + (m - 1);
    const f = y < d.switchYear && mode !== 'raw' ? d.validation.ratio : 1;
    (d.tiles[mi] || []).forEach((t) => { const k = t.i + '-' + t.j; acc[k] = acc[k] || { i: t.i, j: t.j, value: 0 }; acc[k].value += t.n * f; });
  });
  return Object.values(acc);
}

/* ───────────── Test de récupération (synthétique) ───────────── */
// On cache un ratio connu dans des données simulées à partir des vrais comptes MODIS, puis on le retrouve.
export function recoveryTest(opts) {
  const o = Object.assign({ hidden: 2.1, seed: 7, zoneId: 'boreal', spread: 0.12 }, opts || {});
  const Z = FIRMS_ZONES[o.zoneId];
  const rnd = mulberry32(o.seed);
  const modis = Z.modis.split(',').map(Number);
  const rows = [];
  for (let y = FIRMS_META.switchYear; y <= FIRMS_META.last; y++) {
    const yearFactor = Math.exp(o.spread * gauss(rnd)); // le ratio varie d'une année à l'autre
    let M = 0, V = 0;
    for (let m = 0; m < 12; m++) {
      const mm = modis[(y - FIRMS_META.first) * 12 + m];
      M += mm;
      V += draw(rnd, mm * o.hidden * yearFactor, 0.1);
    }
    rows.push({ year: y, modis: M, viirs: V });
  }
  return Object.assign({ planted: o.hidden, method: 'pooled', seed: o.seed, synthetic: true }, poolRatio(rows));
}
