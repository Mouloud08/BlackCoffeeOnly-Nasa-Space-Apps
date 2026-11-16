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
import { dec, PS } from './l10n.js';
export const GUARD = { minBefore: 50, maxSpan: 10, maxRatio: 4, minMonths: 6, maxMonthlyErr: 0.5 };
export function guardReason(Z) {
  if (!Z || Z.empty || !Z.harmOK) return null;
  const b = Z.levels && Z.levels.harmonized ? Z.levels.harmonized.before : null, T = Z.trend;
  if (Z.riseH == null || !isFinite(Z.riseH) || b == null || b <= 0) return 'ninguna detección antes de 2012 para comparar';
  if (b < GUARD.minBefore) return 'solo ' + Math.round(b) + ' detecciones de fuego por año antes de 2012, muy pocas para una línea de base (se necesitan ' + GUARD.minBefore + ')';
  if (Z.riseAqua != null && isFinite(Z.riseAqua) && Z.riseAqua > 0 && (Z.riseAqua - 1) * (Z.riseH - 1) < 0) return 'solo Aqua da ' + dec(Z.riseAqua, 1) + '× y el registro armonizado ' + dec(Z.riseH, 1) + '×: van en sentidos opuestos';
  if (T && T.lo != null && T.hi != null && (T.lo <= 0 || T.hi / T.lo > GUARD.maxSpan)) return 'el rango del 90' + PS + ' (' + (T.lo <= 0 ? '0' : dec(T.lo, T.lo < 1 ? 2 : 1)) + '–' + dec(T.hi, 1) + ') supera ×' + GUARD.maxSpan;
  return null;
}
// The zone as the page shows it: a guarded zone reads as "trend uncertain" everywhere (verdict, cards, ladder, Evidence,
// How it works, calendar annotation), with the reason attached.
export function guarded(Z) {
  if (Z && !Z.empty && Z.harmOK && Z.ratio > GUARD.maxRatio) {
    // G4: shown like any zone that cannot be harmonized (raw only), with its reason.
    return Object.assign({}, Z, { harmOK: false, notHarm: 'la razón ' + dec(Z.ratio, 2) + '×' + (Z.gradeWhy && Z.gradeWhy.startsWith('borrowed') ? ' (prestada)' : '') + ' supera el límite de ' + GUARD.maxRatio + '× para armonizar' });
  }
  const r = guardReason(Z);
  if (!r) {
    const M = Z && Z.monthly;
    if (Z && Z.harmOK && Z.trend && Z.trend.status === 'robust' && (!M || M.n < GUARD.minMonths || M.medErr > GUARD.maxMonthlyErr)) {
      // G6: no success chip.
      return Object.assign({}, Z, { g6: !M ? 'sin verificación mes a mes' : 'la verificación mes a mes tiene ' + M.n + ' meses, error mediano ' + Math.round(M.medErr * 100) + PS, trend: Object.assign({}, Z.trend, { status: 'uncertain' }) });
    }
    return Z;
  }
  const b = Z.levels && Z.levels.harmonized ? Z.levels.harmonized.before : null;
  // Spanish reasons: G3 'ninguna detección…', G1 'solo <n> …', G5 'solo Aqua …', G2 'el rango del 90 % …' (same branches as English).
  const g5 = r.startsWith('solo Aqua'), g2 = r.startsWith('el rango del 90');
  const short = r.startsWith('ninguna detección') ? 'ninguna detección antes de 2012' : /^solo \d/.test(r) ? 'muy poco fuego antes de 2012 (' + Math.round(b) + ' detecciones por año)' : g5 ? 'solo Aqua apunta en sentido contrario' : 'su rango del 90' + PS + ' supera ×' + GUARD.maxSpan;
  return Object.assign({}, Z, { guard: r, guardShort: short, guardPill: g5 ? 'Sin tendencia: Aqua no coincide' : g2 ? 'Sin tendencia: muy variable' : 'Sin tendencia: pocos datos', guardCheck: g5 ? 'Solo Aqua apunta al revés' : g2 ? 'Años demasiado variables' : 'Muy pocos datos para una tendencia', trend: Object.assign({ bigYear: Z.trend ? Z.trend.bigYear : null }, Z.trend || {}, { status: 'uncertain' }) });
}
