// Échelles et formats purs, sans DOM : réutilisables tels quels dans l'app React.
export const COUNT_STEPS = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000]; // 9 classes, une par demi-décade
export const RATIO_STEPS = [0.25, 0.5, 0.8, 1.25, 2, 4]; // 7 classes de part et d'autre d'un mois type
export const RATIO_NAMES = ['div-m3', 'div-m2', 'div-m1', 'div-0', 'div-p1', 'div-p2', 'div-p3'];
const NNBSP = ' ';
export function countClass(v, scale, max, steps) {
  if (v == null) return null;
  if (v <= 0) return -1; // zéro observé
  if (scale === 'linear') {
    const m = Math.max(1, max || 1);
    return Math.min(8, Math.floor((v / m) * 9));
  }
  const st = steps || COUNT_STEPS; // FireBridge patch: optional zone-adaptive class breaks (same number of classes)
  let k = 0;
  for (let i = 0; i < st.length; i++) if (v >= st[i]) k = i;
  return k;
}
export function ratioClass(r) {
  if (r == null) return 3; // pas de mois type : neutre (et marqué « peu de détections »)
  let k = 0;
  while (k < RATIO_STEPS.length && r >= RATIO_STEPS[k]) k++;
  return k; // 0..6
}
export function paletteVar(palette, k) {
  const p = palette === 'cividis' ? 'civ' : palette === 'gray' ? 'gray' : 'seq';
  return 'var(--' + p + '-' + k + ')';
}
const loc = (locale) => (locale === 'fr' ? 'fr-CA' : 'en-CA');
// FireBridge patch: one Intl.NumberFormat per locale and digit count (building one per call cost ~⅓ of a flip).
const NF = new Map();
const nf = (locale, d) => { const k = loc(locale) + '|' + d; let f = NF.get(k); if (!f) { f = d == null ? new Intl.NumberFormat(loc(locale)) : new Intl.NumberFormat(loc(locale), { minimumFractionDigits: d, maximumFractionDigits: d }); NF.set(k, f); } return f; };
export function formatNumber(v, locale) {
  if (v == null) return '';
  return nf(locale, null).format(Math.round(v));
}
export function formatDecimal(v, d, locale) {
  return nf(locale, d).format(v);
}
// Rapport à un mois type : « 25× » / « 25 × » ; entier dès 10, une décimale de 0,1 à 10, deux en dessous. Seule règle d'arrondi.
export function formatRatio(r, locale) {
  if (r == null) return '';
  if (!isFinite(r)) return '—';
  const s = formatDecimal(r, r >= 10 ? 0 : r < 0.095 ? 2 : 1, locale);
  return locale === 'fr' ? s + NNBSP + '×' : s + '×';
}
// Saut multiplicatif : toujours une décimale, même convention que les rapports (« 2.2× » / « 2,2 × »).
export function formatStep(r, locale) {
  if (r == null || !isFinite(r)) return '—';
  const s = formatDecimal(r, 1, locale);
  return locale === 'fr' ? s + NNBSP + '×' : s + '×';
}
export function ordinal(n, locale, fem) {
  if (locale === 'fr') return n + (n === 1 ? (fem ? 're' : 'er') : 'e');
  const t = n % 100, u = n % 10;
  return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th');
}
export function formatShort(v, locale) { // 1k, 10k (légende)
  if (v >= 1000) return (v / 1000) + (locale === 'fr' ? NNBSP + 'k' : 'k');
  return String(v);
}
export const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
};
export const MONTHS_LONG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
};
export function monthYear(m, y, locale, long = true) {
  const name = (long ? MONTHS_LONG : MONTHS)[locale === 'fr' ? 'fr' : 'en'][m - 1];
  return (locale === 'fr' ? name : name) + ' ' + y;
}
export const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
