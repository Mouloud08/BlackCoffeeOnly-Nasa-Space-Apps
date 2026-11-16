// Textes calculés (verdict, légendes, repère 2012), en anglais et en français. Aucun chiffre n'est saisi à la main.
import { formatNumber, formatRatio, formatStep, formatDecimal, ordinal, MONTHS, MONTHS_LONG, monthYear, cap1 } from './scale.js';

const NB = ' ';
const isFr = () => true; // i18n: this copy always speaks the target language
const monthName = (m, l) => (isFr(l) ? MONTHS_LONG.fr : MONTHS_LONG.en)[m - 1];
// « un mois de juin type », « un mois d'avril type »
const typicalMonthFr = (m) => { const n = MONTHS_LONG.fr[m - 1]; return 'un mois ' + (/^[aeiouyéèh]/i.test(n) ? "d'" : 'de ') + n + ' type'; };
const typicalMonth = (m, l) => (isFr(l) ? typicalMonthFr(m) : 'a typical ' + MONTHS_LONG.en[m - 1]);
const asOf = (cur, l) => (isFr(l) ? 'au ' + cur.day + NB + MONTHS.fr[cur.month - 1] : 'as of ' + MONTHS.en[cur.month - 1] + ' ' + cur.day);

// « la médiane des mois de juin », « the June median » : la référence est toujours écrite.
export function medianPhrase(m, l) {
  if (!isFr(l)) return 'the ' + MONTHS_LONG.en[m - 1] + ' median';
  const n = MONTHS_LONG.fr[m - 1];
  return 'la mediana de ' + n;
}
// Rapport à la médiane, plafonné à l'affichage : au-delà de 100, « plus de 100 × ».
export function ratioText(r, l) {
  if (r == null) return '';
  if (r >= 100) return isFr(l) ? 'más de 100×' : 'over 100×';
  return formatRatio(r, l);
}
// Rang d'un mois parmi tous les mois, par compte harmonisé (1 = le plus actif).
export function monthRank(d, c) {
  if (!c || c.harmonized == null) return null;
  return 1 + d.cells.filter((x) => x.harmonized != null && x.harmonized > c.harmonized).length;
}
const rankPhrase = (rank, d, l) => {
  if (rank == null || rank > 10) return '';
  if (isFr(l)) return rank === 1 ? 'le mois le plus actif depuis ' + d.years[0] : ordinal(rank, 'fr') + ' mois le plus actif depuis ' + d.years[0];
  return rank === 1 ? 'the most active month since ' + d.years[0] : 'the ' + ordinal(rank, 'en') + ' most active month since ' + d.years[0];
};
// Les deux plus grandes années : elles tirent les moyennes et le ratio.
export function bigYears(d) {
  const inMeans = (a) => !d.step || (a.year >= d.step.before[0] && a.year <= d.step.after[1]); // only years inside the two means' periods
  return d.annual.filter((a) => !a.partial && !a.preStats && inMeans(a)).slice().sort((x, y) => y.harmonized - x.harmonized).slice(0, 2).map((a) => a.year).sort((x, y) => x - y);
}

export function recordLine(d, l) {
  const r = d.cells.filter((c) => c.status === 'ok' && c.harmonized != null).sort((a, b) => b.harmonized - a.harmonized)[0];
  if (!r) return '';
  const tag = d.illustrative ? (isFr(l) ? 'Record (synthétique)' : 'Record (synthetic)') : 'Record';
  return tag + (isFr(l) ? NB + ': ' : ': ') + monthYear(r.month, r.year, l) + ', ' + formatNumber(r.harmonized, l) + (isFr(l) ? ' cellules-jours' : ' cell-days');
}
const recordCell = (d) => d.cells.filter((c) => c.status === 'ok' && c.harmonized != null).sort((a, b) => b.harmonized - a.harmonized)[0];

// Verdict : surtitre, nombre, une phrase, une action.
// Données réelles, rien d'épinglé : la réponse du produit (hausse après 2012, brute → corrigée).
// Une case épinglée : son compte, son rang, puis son rapport à la médiane du même mois.
export function verdict(d, opts) {
  const l = (opts && opts.locale) || 'en';
  const pinned = opts && opts.pinned;
  const fr = isFr(l);
  const rec = recordCell(d);
  const toRecord = rec ? { actionLabel: recordLine(d, l), actionCta: fr ? 'Voir' : 'Show', actionKey: rec.key, actionDir: 'forward' } : {};
  const lead = (opts && opts.lead) || (d.illustrative === false ? 'step' : 'season');
  const back = { actionLabel: fr ? 'Épinglé sur le calendrier' : 'Pinned on the calendar', actionCta: lead === 'step' ? (fr ? 'Retour à la hausse' : 'Back to the rise') : (fr ? 'Retour à la saison' : 'Back to the season'), actionKey: '', actionDir: 'back' };
  const c = pinned && d.byKey[pinned];
  if (c && c.status !== 'future') {
    const kickerBase = cap1(monthYear(c.month, c.year, l));
    if (c.status === 'nodata') {
      return Object.assign({ kicker: kickerBase, value: '—', sentence: fr ? 'Aucune observation ce mois-là.' : 'No observation this month.' }, back);
    }
    const partial = c.status === 'partial' ? ' · ' + asOf(d.current, l) : '';
    const rawModis = opts && opts.mode === 'raw' && c.sensor === 'modis';
    const rank = rawModis ? '' : rankPhrase(monthRank(d, c), d, l);
    const unit = rawModis ? (fr ? 'cellules-jours MODIS, non corrigées' : 'raw MODIS cell-days, not corrected') : (fr ? 'cellules-jours' : 'cell-days');
    let cmp;
    if (c.low || c.ratio == null) cmp = fr ? 'Trop peu de détections en ' + MONTHS_LONG.fr[c.month - 1] + ' d’habitude pour comparer (médiane ' + formatNumber(c.median, l) + ').' : 'Too few detections in a usual ' + MONTHS_LONG.en[c.month - 1] + ' to compare (median ' + formatNumber(c.median, l) + ').';
    else if (rawModis && d.validation) cmp = (fr ? 'Corrigé' + NB + ': ' : 'Corrected: ') + formatNumber(c.harmonized, l) + ' (× ' + formatDecimal(d.validation.ratio, 2, l) + '), ' + (fr ? 'soit ' : 'or ') + ratioText(c.ratio, l) + ' ' + medianPhrase(c.month, l) + ' (' + formatNumber(c.median, l) + ').';
    else cmp = cap1(ratioText(c.ratio, l)) + ' ' + medianPhrase(c.month, l) + ' (' + formatNumber(c.median, l) + ').';
    return Object.assign({
      kicker: kickerBase + partial,
      value: formatNumber(rawModis ? c.raw : c.harmonized, l),
      sentence: unit + (rank ? ', ' + rank : '') + '. ' + cmp,
    }, back);
  }
  if (lead === 'step' && d.step) {
    const s = d.step;
    return Object.assign({
      kicker: fr ? 'Hausse des détections après ' + s.year + ' · année moyenne' : 'Rise in detections after ' + s.year + ' · mean year',
      valueFrom: formatStep(s.raw, l),
      value: formatStep(s.harmonized, l),
      sentence: fr ? 'après correction, au lieu de ' + formatStep(s.raw, l) + ' en brut. Témoin Aqua seul' + NB + ': ' + formatStep(s.aqua, l) + '.' : 'after correction, instead of ' + formatStep(s.raw, l) + ' raw. Aqua-only consistency check: ' + formatStep(s.aqua, l) + '.',
    }, toRecord);
  }
  const cur = d.current;
  if (cur.offSeason && d.season.ratio != null) {
    const r = d.season.ratio, se = d.season;
    const qual = r > 1.15 ? (fr ? 'plus active que d’habitude' : 'busier than usual') : r < 0.87 ? (fr ? 'plus calme que d’habitude' : 'quieter than usual') : (fr ? 'proche de l’habitude' : 'close to usual');
    let rank = fr ? ordinal(se.rank, 'fr', true) + ' saison sur ' + se.of : ordinal(se.rank, 'en') + ' of ' + se.of + ' seasons';
    if (se.rank === se.of) rank = fr ? 'la plus calme des ' + se.of + ' saisons' : 'the quietest of ' + se.of + ' seasons';
    if (se.rank === 1) rank = fr ? 'la plus active des ' + se.of + ' saisons' : 'the busiest of ' + se.of + ' seasons';
    const extreme = se.rank === 1 || se.rank === se.of;
    return Object.assign({
      kicker: fr ? 'Saison ' + se.year + ' · avr.–oct.' : se.year + ' season · Apr–Oct',
      value: ratioText(r, l),
      sentence: extreme ? (fr ? 'la saison médiane. ' + se.year + ' a été ' + rank + '.' : 'the median season. ' + se.year + ' was ' + rank + '.')
        : (fr ? 'la saison médiane. ' + se.year + ' a été ' + qual + ' : ' + rank + '.' : 'the median season. ' + se.year + ' was ' + qual + ': ' + rank + '.'),
    }, toRecord);
  }
  const cc = cur.cell;
  return Object.assign({
    kicker: cap1(monthYear(cc.month, cc.year, l)) + ' · ' + asOf(cur, l),
    value: ratioText(cc.ratio, l),
    sentence: medianPhrase(cc.month, l) + (fr ? ', à date.' : ', to date.'),
  }, toRecord);
}

export function modeLine(mode, l, d) {
  if (mode === 'raw') return isFr(l) ? 'Brut' + NB + ': MODIS jusqu’en 2011, puis VIIRS, sans correction.' : 'Raw: MODIS to 2011, then VIIRS, nothing corrected.';
  if (d && d.validation) {
    const v = d.validation, f = (x) => formatDecimal(x, 2, l);
    if (v.method === 'pooled') {
      const pct = formatDecimal(v.medianAbsError * 100, 0, l) + (isFr(l) ? NB + '%' : '%');
      const n = v.loo.length;
      const err = n < 6 ? (isFr(l) ? n + ' années testées : trop peu pour une erreur fiable' : n + ' years tested: too few for a reliable error')
        : (isFr(l) ? 'erreur médiane ' + pct + ' sur ' + n + ' années testées' : 'median error ' + pct + ' over ' + n + ' years tested');
      return isFr(l) ? 'Harmonisé' + NB + ': années MODIS × ' + f(v.ratio) + ' pour rejoindre VIIRS. Selon l’année, ce rapport va de ' + f(v.yearlyLo) + ' à ' + f(v.yearlyHi) + ' (' + err + ').'
        : 'Harmonized: MODIS years × ' + f(v.ratio) + ' to match VIIRS. Year by year this ratio runs ' + f(v.yearlyLo) + '–' + f(v.yearlyHi) + ' (' + err + ').';
    }
    return isFr(l) ? 'Harmonisé' + NB + ': années MODIS × ' + f(v.ratio) + ' (' + f(v.ratioLo) + '–' + f(v.ratioHi) + ') pour rejoindre VIIRS.' : 'Harmonized: MODIS years × ' + f(v.ratio) + ' (' + f(v.ratioLo) + '–' + f(v.ratioHi) + ') to match VIIRS.';
  }
  return isFr(l) ? 'Harmonisé' + NB + ': années MODIS remises à l’échelle de VIIRS.' : 'Harmonized: MODIS years rescaled to match VIIRS.';
}
export function unitLine(l) {
  return isFr(l) ? 'Cellule-jour' + NB + ': un carré d’environ 1 km avec au moins un point chaud, un jour donné.' : 'Cell-day: a ~1 km square with at least one hotspot on a given day.';
}
export function stepTexts(d, mode, l) {
  const fr = isFr(l);
  const s = d.step;
  const meanStat = s.stat === 'mean';
  return {
    kicker: s.year + ' · ',
    value: mode === 'raw' ? s.raw : s.harmonized,
    label: (() => { const v = mode === 'raw' ? s.raw : s.harmonized; const w = v < 0.95 ? (fr ? 'baja' : 'change') : v < 1.05 ? (fr ? 'variación' : 'change') : (fr ? 'alza' : 'rise'); return w + (mode === 'raw' ? (fr ? ', crudo' : ', raw') : (fr ? ', armonizado' : ', harmonized')); })(),
    def: meanStat ? (fr ? 'año medio ' + s.after[0] + '–' + s.after[1] + ' ÷ ' + s.before[0] + '–' + s.before[1] : 'mean year ' + s.after[0] + '–' + s.after[1] + ' ÷ ' + s.before[0] + '–' + s.before[1])
      : (fr ? 'año mediano después ÷ antes' : 'median year after ÷ before'),
    levelKey: meanStat ? (fr ? 'media antes / después de ' + s.year + ', impulsada por ' + bigYears(d).join(' y ') : 'mean before / after ' + s.year + ', driven by ' + bigYears(d).join(' and ')) : (fr ? 'año mediano antes / después de ' + s.year : 'median year before / after ' + s.year),
    other: mode === 'raw' ? formatStep(s.harmonized, l) + (fr ? ' después de la corrección' : ' after correction') : formatStep(s.raw, l) + (fr ? ' antes de la corrección' : ' before correction'),
    witness: (fr ? 'control Aqua ' : 'Aqua consistency check ') + formatStep(s.aqua, l),
    match: mode !== 'raw' && Math.abs(s.harmonized - s.aqua) / Math.max(0.01, s.aqua) < 0.1,
  };
}
export function zoneLabel(cellOrSeason, d, l, mode = 'harmonized') {
  const fr = isFr(l);
  if (!cellOrSeason) return '';
  const tail = mode === 'raw' ? (fr ? ', crudo' : ', raw') : '';
  if (cellOrSeason.season) return (fr ? 'Saison ' + d.season.year + ' (avr.–oct.) · ' : d.season.year + ' season (Apr–Oct) · ') + formatNumber(d.season.value, l) + (fr ? ' cellules-jours' : ' cell-days');
  const c = cellOrSeason;
  if (c.status === 'nodata') return cap1(monthYear(c.month, c.year, l)) + (fr ? ' · aucune observation' : ' · no observation');
  return cap1(monthYear(c.month, c.year, l)) + ' · ' + formatNumber(mode === 'raw' ? c.raw : c.harmonized, l) + (fr ? ' cellules-jours' : ' cell-days') + tail;
}
export { monthName };
