// Small-box guard (v6, judge C1). Page layer: metrics.js is unchanged. A before/after rise is not printed as a figure
// when its baseline or its range cannot carry it; the zone is then shown like the "uncertain" case (the correction factor
// only, with the reason). Thresholds:
//   G1  harmonized mean before 2012 under 50 cell-days a year (too little fire to be a baseline);
//   G2  the 90% year-resampling range spans more than a factor 10 (hi ÷ lo > 10, or lo = 0);
//   G3  no rise at all (no detections before 2012).
//   G4  (v6.2) the zone's ratio (own or borrowed) above 4× → not harmonized at all (the map's and Method's rule for places).
//   G5  (v6.2) Aqua alone and the harmonized record on opposite sides of 1× → no rise printed (the two MODIS-family
//       readings disagree).
//   G6  (v6.2) month-by-month check missing, on fewer than 6 months, or its median error above 50 % → no success chip
//       (the trend is shown as uncertain).
import { PS } from './l10n.js';
// French display of a number with toFixed's own rounding (values unchanged, only the decimal comma).
const fx = (v, d) => v.toFixed(d).replace('.', ',');
export const GUARD = { minBefore: 50, maxSpan: 10, maxRatio: 4, minMonths: 6, maxMonthlyErr: 0.5 };
export function guardReason(Z) {
  if (!Z || Z.empty || !Z.harmOK) return null;
  const b = Z.levels && Z.levels.harmonized ? Z.levels.harmonized.before : null, T = Z.trend;
  if (Z.riseH == null || !isFinite(Z.riseH) || b == null || b <= 0) return 'no detections before 2012 to compare with';
  if (b < GUARD.minBefore) return 'only ' + Math.round(b) + ' fire detections a year before 2012, too few for a baseline (' + GUARD.minBefore + ' needed)';
  if (Z.riseAqua != null && isFinite(Z.riseAqua) && Z.riseAqua > 0 && (Z.riseAqua - 1) * (Z.riseH - 1) < 0) return 'Aqua alone reads ' + Z.riseAqua.toFixed(1) + '× and the harmonized record ' + Z.riseH.toFixed(1) + '×: they point opposite ways';
  if (T && T.lo != null && T.hi != null && (T.lo <= 0 || T.hi / T.lo > GUARD.maxSpan)) return 'the 90% range (' + (T.lo <= 0 ? '0' : T.lo.toFixed(T.lo < 1 ? 2 : 1)) + '–' + T.hi.toFixed(1) + ') spans more than ×' + GUARD.maxSpan;
  return null;
}
// The reason (Z.guard) stays English in the zone object, because code compares it (startsWith here and in copy.js, exact
// matches in Method.jsx). guardFr() translates it where it is PRINTED (glossary §7: G1, G2, G3, G5; same wording as
// Method's trGuard). Same digits as the English (toFixed), decimal comma only. Unknown text is returned unchanged.
const dc = (s) => String(s).replace('.', ',').replace(/^-/, '−');
export function guardFr(s) {
  if (!s || typeof s !== 'string') return s;
  if (s === 'no detections before 2012 to compare with') return 'aucune détection avant 2012 pour comparer';
  let m = s.match(/^only (\d+) fire detections a year before 2012, too few for a baseline \((\d+) needed\)$/);
  if (m) return 'seulement ' + m[1] + ' détections de feux par an avant 2012, trop peu pour une référence (' + m[2] + ' nécessaires)';
  m = s.match(/^Aqua alone reads ([-\d.]+)× and the harmonized record ([-\d.]+)×: they point opposite ways$/);
  if (m) return 'Aqua seul donne ' + dc(m[1]) + '× et la série harmonisée ' + dc(m[2]) + '× : ils vont en sens opposés';
  m = s.match(/^the 90% range \(([-\d.]+)–([-\d.]+)\) spans more than ×(\d+)$/);
  if (m) return 'la plage à 90' + PS + ' (' + dc(m[1]) + '–' + dc(m[2]) + ') dépasse ×' + m[3];
  return s;
}
// The zone as the page shows it: a guarded zone reads as "trend uncertain" everywhere (verdict, cards, ladder, Evidence,
// How it works, calendar annotation), with the reason attached.
export function guarded(Z) {
  if (Z && !Z.empty && Z.harmOK && Z.ratio > GUARD.maxRatio) {
    // G4: shown like any zone that cannot be harmonized (raw only), with its reason.
    return Object.assign({}, Z, { harmOK: false, notHarm: 'le ratio ' + fx(Z.ratio, 2) + '×' + (Z.gradeWhy && Z.gradeWhy.startsWith('borrowed') ? ' (emprunté)' : '') + ' dépasse la limite de ' + GUARD.maxRatio + '× pour l’harmonisation' });
  }
  const r = guardReason(Z);
  if (!r) {
    const M = Z && Z.monthly;
    if (Z && Z.harmOK && Z.trend && Z.trend.status === 'robust' && (!M || M.n < GUARD.minMonths || M.medErr > GUARD.maxMonthlyErr)) {
      // G6: no success chip.
      return Object.assign({}, Z, { g6: !M ? 'pas de vérification mois par mois' : 'la vérification mois par mois compte ' + M.n + ' mois, erreur médiane ' + Math.round(M.medErr * 100) + PS, trend: Object.assign({}, Z.trend, { status: 'uncertain' }) });
    }
    return Z;
  }
  const b = Z.levels && Z.levels.harmonized ? Z.levels.harmonized.before : null;
  const g5 = r.startsWith('Aqua'), g2 = r.startsWith('the 90%');
  const short = r.startsWith('no detections') ? 'aucune détection avant 2012' : r.startsWith('only') ? 'trop peu de feux avant 2012 (' + Math.round(b) + ' détections par an)' : g5 ? 'Aqua seul va dans l’autre sens' : 'sa plage à 90' + PS + ' dépasse ×' + GUARD.maxSpan;
  return Object.assign({}, Z, { guard: r, guardShort: short, guardPill: g5 ? 'Pas de tendance : Aqua diverge' : g2 ? 'Pas de tendance : trop variable' : 'Pas de tendance : peu de feux', guardCheck: g5 ? 'Aqua seul va dans l’autre sens' : g2 ? 'Trop de variation entre années' : 'Trop peu de données pour une tendance', trend: Object.assign({ bigYear: Z.trend ? Z.trend.bigYear : null }, Z.trend || {}, { status: 'uncertain' }) });
}
