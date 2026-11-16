// Display-layer formatting for this language (written by scripts/lang.mjs fork; see i18n/README.md and i18n/GLOSSARY.md).
// metrics.js must stay byte-identical to English, so its English month names (endLabel, partialLabel, monthReading notes)
// are translated HERE, at display time. The values never change: only separators, month names and units do.
// In English (LANG 'en') every function returns exactly what the English helpers return.
import { LANG } from './lang.js';
import { endLabel, partialLabel } from './metrics.js';
const L = LANG === 'fr' || LANG === 'es' ? LANG : 'en';
const NNBSP = '\u202F', NBSP = '\u00A0';
const EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LONG = {
  en: EN_LONG,
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};
const SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'],
};
export const MONTHS_LONG_L = LONG[L];   // index 0 = January
export const MONTHS_SHORT_L = SHORT[L];
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const monthLong = (m0) => LONG[L][m0];              // 'octobre' / 'octubre' / 'October'
export const monthShort = (m0) => SHORT[L][m0];            // 'oct.' / 'oct.' / 'Oct'
export const monthYear = (m0, y) => LONG[L][m0] + (L === 'es' ? ' de ' : ' ') + y;  // 'octobre 2026' / 'octubre de 2026'
export const monthYearShort = (m0, y) => SHORT[L][m0] + ' ' + y;                    // 'oct. 2026'
// English month name (as written by metrics.js) → this language, long form.
export const trMonth = (name) => { const i = EN_LONG.indexOf(name); return i < 0 ? name : LONG[L][i]; };
// endLabel() from metrics.js is 'December 2025' → 'décembre 2025' / 'diciembre de 2025'.
export const endLabelL = () => { const s = endLabel(), m = s.match(/^([A-Z][a-z]+) (\d{4})$/); return m && EN_LONG.includes(m[1]) ? monthYear(EN_LONG.indexOf(m[1]), m[2]) : s; };
// partialLabel() is null or '2026: partial year, to March'.
const PARTIAL_TXT = { en: (y, m) => y + ': partial year, to ' + m, fr: (y, m) => y + NNBSP + ': année partielle, jusqu’en ' + m, es: (y, m) => y + ': año parcial, hasta ' + m };
export const partialLabelL = () => { const s = partialLabel(); if (!s) return s; const m = s.match(/^(\d{4}): partial year, to ([A-Z][a-z]+)$/); return m ? PARTIAL_TXT[L](m[1], trMonth(m[2])) : s; };
// Any other English text from metrics.js that contains month names (monthReading notes, annual partialNote 'to Mar'):
// replaces whole English month names (and 3-letter abbreviations after 'to ') in a string. Translate the surrounding words
// at the call site.
export const trMonthsIn = (s) => (L === 'en' || !s ? s : s.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, (n) => trMonth(n)).replace(/\bto (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (_, a) => (L === 'fr' ? 'jusqu’en ' : 'hasta ') + SHORT[L][SHORT.en.indexOf(a)]));

// Other English text produced by metrics.js (preset labels, provenance notes, verdict overrides). ONE owner per language
// fills this table: the translator of copy.js. Others only CALL tm(text) where such a text is displayed.
// A missing or null entry falls back to the English text (the leftover-English report will list it).
export const METRICS_TEXT = {
  'All of Canada': 'Todo Canadá', 'All of Argentina': 'Toda la Argentina', 'Boreal Québec': 'Quebec boreal', 'La Rioja': null,
  'Chibougamau': null, 'Côte-Nord': null, 'Córdoba': null, 'Tucumán': null, 'Chilecito': null,
  'this box': 'esta zona', 'country-wide': 'todo el país', 'too high': 'de más', 'sensor effect; trend uncertain': 'efecto del sensor; tendencia incierta',
  'Raw only: not comparable across 2012': 'Solo crudo: no comparable antes y después de 2012',
  'Real NASA FIRMS tiles, MCD14ML and VNP14IMGT': 'Mosaicos reales de NASA FIRMS, MCD14ML y VNP14IMGT',
  'Provisional, not filtered for non-fire sources (near-real-time data).': 'Provisional, sin filtrar fuentes de calor que no son fuego (datos casi en tiempo real).',
  'NOAA-20 used: S-NPP outage this month (S-NPP far below NOAA-20 country-wide).': 'Se usó NOAA-20: S-NPP tuvo una interrupción este mes (S-NPP muy por debajo de NOAA-20 en todo el país).',
  'Before 2003: partial MODIS coverage (Terra only until July 2002). Not used in statistics.': 'Antes de 2003: cobertura parcial de MODIS (solo Terra hasta julio de 2002). No se usa en las estadísticas.',
  'Computed: S-NPP record starts 20 Jan 2012; this month is MODIS': 'Calculado: el registro de S-NPP empieza el 20 de enero de 2012; este mes es MODIS',
  'Computed: S-NPP record starts 20 Jan 2012; this month is MODIS.': 'Calculado: el registro de S-NPP empieza el 20 de enero de 2012; este mes es MODIS.',
};
// Cell note of a partial year (metrics.js: y + ': partial year, to <Month>; not in annual statistics.'), years 2026–2030.
for (let y = 2026; y <= 2030; y++) EN_LONG.forEach((m, i) => { if (L === 'es') METRICS_TEXT[y + ': partial year, to ' + m + '; not in annual statistics.'] = y + ': año parcial, hasta ' + LONG.es[i] + '; no entra en las estadísticas anuales.'; });
// Texts that metrics.js builds from a fixed English start plus a number: [English start, translated start].
// (The tail after the start, e.g. "2.10× what MODIS would", is only passed through trMonthsIn: callers that show
// override.def should build their own sentence from override.value.)
export const METRICS_PREFIX = [
  ['Computed: NOAA-20 rescaled to S-NPP (÷ ', 'Calculado: NOAA-20 reescalado a S-NPP (÷ '],
  ['VIIRS ÷ MODIS over the overlap years: raw data after 2012 count ', 'VIIRS ÷ MODIS en los años de superposición: después de 2012, los datos crudos cuentan '],
  ['Computed: S-NPP record starts 20 Jan 2012; this month is MODIS', 'Calculado: el registro de S-NPP empieza el 20 de enero de 2012; este mes es MODIS'],
];
export const tm = (s) => {
  if (L === 'en' || s == null || typeof s !== 'string') return s;
  if (METRICS_TEXT[s] != null) return METRICS_TEXT[s];
  for (const [en, tr] of METRICS_PREFIX) if (tr != null && s.startsWith(en)) return tr + trMonthsIn(s.slice(en.length));
  return trMonthsIn(s);
};

// Numbers. Digits come from Intl en-US (so rounding is exactly the English one), then the separators are swapped.
const NF = new Map();
const nf = (d) => { const k = d == null ? 'i' : d; let f = NF.get(k); if (!f) { f = d == null ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }) : new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); NF.set(k, f); } return f; };
const EN = new Map();
const enf = (d) => { const k = d == null ? 'i' : d; let f = EN.get(k); if (!f) { f = d == null ? new Intl.NumberFormat('en-CA') : new Intl.NumberFormat('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d }); EN.set(k, f); } return f; };
function swap(s) {
  if (L === 'en') return s;
  const neg = s[0] === '-', body = neg ? s.slice(1) : s, [int, frac] = body.split('.');
  const digits = int.replace(/,/g, '');
  // fr: narrow no-break space from 4 digits ('1 947', '81 333'); es: point from 5 digits ('1947', '81.333', RAE).
  const grouped = L === 'es' && digits.length <= 4 ? digits : int.replace(/,/g, L === 'fr' ? NNBSP : '.');
  return (neg ? '−' : '') + grouped + (frac != null ? ',' + frac : '');
}
export const num = (v) => (v == null ? '' : L === 'en' ? enf(null).format(Math.round(v)) : swap(nf(null).format(Math.round(v))));  // English: formatNumber(v, 'en')
export const dec = (v, d) => (L === 'en' ? enf(d).format(v) : swap(nf(d).format(v)));            // English: formatDecimal(v, d, 'en')
export const X = (r) => (r == null || !isFinite(r) ? '—' : dec(r, 1) + '×');                     // English: formatStep(r, 'en'): '2.0×' → '2,0×'
export const PS = L === 'fr' ? NNBSP + '%' : L === 'es' ? NBSP + '%' : '%';                      // percent sign with its space
export const pct = (e) => (e > 0 && e < 0.005 ? '<1' + PS : dec(e * 100, 0) + PS);                // English: PCT(e) in copy.js
export const spct = (e) => (Math.abs(e) < 0.005 ? '<1' + PS : (e > 0 ? '+' : '−') + Math.round(Math.abs(e) * 100) + PS); // English: SPCT(e)
export const ord = (n) => (L === 'fr' ? n + (n === 1 ? 'er' : 'e') : L === 'es' ? n + '.º' : ordinal(n));
function ordinal(n) { const t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
