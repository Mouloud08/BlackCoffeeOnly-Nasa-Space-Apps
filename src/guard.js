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
export const GUARD = { minBefore: 50, maxSpan: 10, maxRatio: 4, minMonths: 6, maxMonthlyErr: 0.5 };
export function guardReason(Z) {
  if (!Z || Z.empty || !Z.harmOK) return null;
  const b = Z.levels && Z.levels.harmonized ? Z.levels.harmonized.before : null, T = Z.trend;
  if (Z.riseH == null || !isFinite(Z.riseH) || b == null || b <= 0) return 'no detections before 2012 to compare with';
  if (b < GUARD.minBefore) return 'only ' + Math.round(b) + ' fire detections a year before 2012, too few for a baseline (' + GUARD.minBefore + ' needed)';
  if (Z.riseAqua != null && isFinite(Z.riseAqua) && Z.riseAqua > 0 && (Z.riseAqua - 1) * (Z.riseH - 1) < 0) return 'Aqua alone reads ' + Z.riseAqua.toFixed(1) + '× and the harmonized record ' + Z.riseH.toFixed(1) + '×: the two MODIS-family readings disagree';
  if (T && T.lo != null && T.hi != null && (T.lo <= 0 || T.hi / T.lo > GUARD.maxSpan)) return 'the 90% range (' + (T.lo <= 0 ? '0' : T.lo.toFixed(T.lo < 1 ? 2 : 1)) + '–' + T.hi.toFixed(1) + ') spans more than ×' + GUARD.maxSpan;
  return null;
}
// The zone as the page shows it: a guarded zone reads as "trend uncertain" everywhere (verdict, cards, ladder, Evidence,
// How it works, calendar annotation), with the reason attached.
export function guarded(Z) {
  if (Z && !Z.empty && Z.harmOK && Z.ratio > GUARD.maxRatio) {
    // G4: shown like any zone that cannot be harmonized (raw only), with its reason.
    return Object.assign({}, Z, { harmOK: false, notHarm: 'ratio ' + Z.ratio.toFixed(2) + '×' + (Z.gradeWhy && Z.gradeWhy.startsWith('borrowed') ? ' (borrowed)' : '') + ' is above the ' + GUARD.maxRatio + '× limit for harmonizing' });
  }
  const r = guardReason(Z);
  if (!r) {
    const M = Z && Z.monthly;
    if (Z && Z.harmOK && Z.trend && Z.trend.status === 'robust' && (!M || M.n < GUARD.minMonths || M.medErr > GUARD.maxMonthlyErr)) {
      // G6: no success chip.
      return Object.assign({}, Z, { g6: !M ? 'no month-by-month check' : 'the month-by-month check has ' + M.n + ' months, median error ' + Math.round(M.medErr * 100) + '%', trend: Object.assign({}, Z.trend, { status: 'uncertain' }) });
    }
    return Z;
  }
  const b = Z.levels && Z.levels.harmonized ? Z.levels.harmonized.before : null;
  const g5 = r.startsWith('Aqua'), g2 = r.startsWith('the 90%');
  const short = r.startsWith('no detections') ? 'no detections before 2012' : r.startsWith('only') ? 'too little fire before 2012 (' + Math.round(b) + ' detections a year)' : g5 ? 'the two MODIS-family readings disagree' : 'its 90% range is wider than ×' + GUARD.maxSpan;
  return Object.assign({}, Z, { guard: r, guardShort: short, guardPill: g5 ? 'No trend: the two MODIS-family readings disagree' : g2 ? 'No trend: too variable' : 'No trend: too little data', guardCheck: g5 ? 'MODIS-family readings disagree' : g2 ? 'Years vary too much for a trend' : 'Too little data for a trend', trend: Object.assign({ bigYear: Z.trend ? Z.trend.bigYear : null }, Z.trend || {}, { status: 'uncertain' }) });
}
