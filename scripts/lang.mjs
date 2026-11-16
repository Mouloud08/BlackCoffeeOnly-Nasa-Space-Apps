// FireBridge language variants (no i18n framework): each language is a full COPY of src/ in i18n/<lang>/src/ whose
// string literals translators rewrite in place. The verified English src/ is never touched.
//   node scripts/lang.mjs fork  <fr|es> [--force]          copy src/ → i18n/<lang>/src/, set LANG, write l10n.js + meta.json
//   node scripts/lang.mjs fork-ds <fr|es> [--force]       copy ds/ → i18n/<lang>/ds/ with the components in the target language (src/ untouched)
//   node scripts/lang.mjs build <fr|es> [--out=path] [--keep]  build dist/firebridge.<lang>.html (build.mjs untouched)
//   node scripts/lang.mjs check <fr|es> [--html=path] [--max-english=N] [--skip-layout]  quality gate (exit 1 on failure)
//   node scripts/lang.mjs shots <fr|es> [--html=path]      screenshots → shots/i18n/<lang>/
// A throwaway code (xx) is accepted only with --test (an untranslated copy used to test this script).
// Run from anywhere; paths are resolved from the repo root. See i18n/README.md.
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash } from 'crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fwd = (p) => p.split(path.sep).join('/');
const argv = process.argv.slice(2);
const opt = (k) => { const a = argv.find((x) => x === '--' + k || x.startsWith('--' + k + '=')); return a == null ? null : a.includes('=') ? a.slice(a.indexOf('=') + 1) : true; };
const [cmd, lang] = argv.filter((x) => !x.startsWith('--'));
const TEST = !!opt('test');
const die = (m) => { console.error('ERROR: ' + m); process.exit(1); };
const LANGS = ['fr', 'es'];
if (!cmd || !lang) die('usage: node scripts/lang.mjs <fork|build|check|shots> <fr|es> [options]');
if (!LANGS.includes(lang) && !(TEST && /^[a-z]{2}$/.test(lang) && lang !== 'en')) die('language must be fr or es (a throwaway code such as xx needs --test)');
const I18N = path.join(root, 'i18n', lang), LSRC = path.join(I18N, 'src'), META = path.join(I18N, 'meta.json');
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const CHROME = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const DEFAULT_OUT = path.join(root, 'dist', 'firebridge.' + lang + '.html');
const EN_HTML = path.join(root, 'dist', 'firebridge.html');

// ───────── strings that live in build.mjs (static HTML around the app) ─────────
// Each entry: [key, regex on build-win.mjs capturing the English text, (text) => exact pattern in the built HTML, (value) => replacement].
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SHELL = [
  ['htmlLang', /<html lang="([^"]+)"/, (t) => '<html lang="' + t + '"', (v) => '<html lang="' + esc(v) + '"'],
  ['title', /<title>([^<]+)<\/title>/, (t) => '<title>' + t + '</title>', (v) => '<title>' + esc(v) + '</title>'],
  ['description', /<meta name="description" content="([^"]+)">/, (t) => '<meta name="description" content="' + t + '">', (v) => '<meta name="description" content="' + esc(v) + '">'],
  ['noscript', /<noscript>([^<]+)<\/noscript>/, (t) => '<noscript>' + t + '</noscript>', (v) => '<noscript>' + esc(v) + '</noscript>'],
  ['kicker', /<p class="fb-kicker">([^<]+)<\/p>/, (t) => '<p class="fb-kicker">' + t + '</p>', (v) => '<p class="fb-kicker">' + esc(v) + '</p>'],
];
function shellOriginals() {
  const b = path.join(root, 'build-win.mjs');
  if (!fs.existsSync(b)) die('build-win.mjs is missing: run  node scripts/winport.mjs  first');
  const s = fs.readFileSync(b, 'utf8'), out = {};
  for (const [k, re] of SHELL) { const m = s.match(re); if (!m) die('build-win.mjs: no ' + k + ' found (' + re + '); update SHELL in scripts/lang.mjs'); out[k] = m[1]; }
  // Any other visible text in the static first-paint shell (between <div id="root"> and its data blocks) must be listed above.
  const shell = (s.match(/<div id="root">([\s\S]*?)\n<script type="application\/json"/) || [])[1] || '';
  const texts = [...shell.replace(/\$\{[^}]*\}/g, '').matchAll(/>([^<>]*[A-Za-z][^<>]*)</g)].map((m) => m[1].trim()).filter((t) => t && t !== 'FireBridge' && t !== out.kicker);
  if (texts.length) die('build-win.mjs: untracked shell text ' + JSON.stringify(texts) + '; add it to SHELL in scripts/lang.mjs');
  return out;
}

// ───────── design-system copy (i18n/<lang>/ds/) ─────────
// The shared ds/ components speak English for locale 'en' (and French for 'fr'); the translated sources pass 'en'.
// Each language gets a copy of ds/ in which the components ALWAYS speak the target language, whatever locale they are
// given, and scale.js formats numbers the l10n.js way (decimal comma, "2,0×" without a space, fr U+202F / es point
// thousands). Exported names, props, class names and behaviour are unchanged: text only. MONTHS.en / MONTHS_LONG.en
// stay English (src/exports.js writes them into the exported files). Each patch: [file, exact text, replacement];
// the text must occur at least once (all occurrences are replaced), or fork-ds fails.
const DSC = 'components/src/components.jsx', DSD = 'components/src/describe.js', DSS = 'components/src/scale.js';
const SEP = { fr: "(int) => int.replace(/,/g, '\\u202F')", es: "(int) => (int.replace(/,/g, '').length <= 4 ? int.replace(/,/g, '') : int.replace(/,/g, '.'))" };
const swapCode = (l) => "const loc = () => 'en-US'; // i18n (" + l + "): digits from en-US (same rounding as English), separators swapped by SW\n" +
  "const SW = (s) => { const neg = s[0] === '-', b = neg ? s.slice(1) : s, [i, f] = b.split('.'); return (neg ? '\\u2212' : '') + (" + SEP[l] + ")(i) + (f != null ? ',' + f : ''); };";
const MON3 = "['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']";
const dsCommon = (l) => [
  [DSS, "const loc = (locale) => (locale === 'fr' ? 'fr-CA' : 'en-CA');", swapCode(l)],
  [DSS, 'return nf(locale, null).format(Math.round(v));', 'return SW(nf(locale, null).format(Math.round(v)));'],
  [DSS, 'return nf(locale, d).format(v);', 'return SW(nf(locale, d).format(v));'],
  [DSS, "return locale === 'fr' ? s + NNBSP + '×' : s + '×';", "return s + '×'; // i18n: no space before ×"],
  [DSD, "const isFr = (l) => l === 'fr';", "const isFr = () => true; // i18n: this copy always speaks the target language"],
];
const dsGeneric = [[DSC, "locale === 'fr'", 'true /* i18n */'], [DSS, "locale === 'fr'", 'true /* i18n */']];
const DS_TEXT = {
  fr: [
    [DSD, "'plus de 100' + NB + '×'", "'plus de 100×'"],
    [DSC, "'raccord corrigé ici'", "'jointure corrigée ici'"],
    [DSC, "'2 nov. 2026 · prochain raccord'", "'2 nov. 2026 · prochaine jointure'"],
    [DSC, "'Selected month'", "'Mois sélectionné'"],
    [DSC, "'Enter to select this month'", "'Entrée pour choisir ce mois'"],
    [DSC, "'Click to select this month'", "'Cliquez pour choisir ce mois'"],
    [DSC, '(d.note || ILLUSTRATIVE_NOTE)', "(({ 'Real NASA FIRMS tiles, MCD14ML and VNP14IMGT': 'Tuiles NASA FIRMS réelles, MCD14ML et VNP14IMGT' })[d.note] || d.note || ILLUSTRATIVE_NOTE)"],
    [DSC, '{a.partialNote || (', "{(a.partialNote && a.partialNote.replace(/^to (\\w{3})$/, (_, m) => 'jusqu’en ' + MONTHS.fr[" + MON3 + ".indexOf(m)])) || ("],
  ],
  es: [
    [DSS, "if (locale === 'fr') return n + (n === 1 ? (fem ? 're' : 'er') : 'e');", "return n + '.º'; // i18n (es)"],
    [DSS, "fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],", "fr: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'], // i18n: Spanish under the key fr"],
    [DSS, "fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],", "fr: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], // i18n: Spanish under the key fr"],
    [DSS, "return (locale === 'fr' ? name : name) + ' ' + y;", "return name + (long ? ' de ' : ' ') + y; // i18n (es): 'octubre de 2026', short 'oct. 2026'"],
    // describe.js (texts used by the calendar: medianPhrase, ratioText, stepTexts)
    [DSD, "return 'la médiane des mois ' + (/^[aeiouyéèh]/i.test(n) ? \"d'\" : 'de ') + n;", "return 'la mediana de ' + n;"],
    [DSD, "'plus de 100' + NB + '×'", "'más de 100×'"],
    [DSD, "'baisse'", "'baja'"], [DSD, "'variation'", "'variación'"], [DSD, "'hausse'", "'alza'"],
    [DSD, "', brut'", "', crudo'"], [DSD, "', harmonisé'", "', armonizado'"],
    [DSD, "'année moyenne '", "'año medio '"], [DSD, "'année médiane après ÷ avant'", "'año mediano después ÷ antes'"],
    [DSD, "'moyenne avant / après '", "'media antes / después de '"], [DSD, "', tirée par '", "', impulsada por '"], [DSD, "join(' et ')", "join(' y ')"],
    [DSD, "'année médiane avant / après '", "'año mediano antes / después de '"],
    [DSD, "' après correction'", "' después de la corrección'"], [DSD, "' avant correction'", "' antes de la corrección'"],
    [DSD, "'témoin Aqua '", "'control Aqua '"],
    // components.jsx: BurnCalendar, its tooltip, ColorLegend, CalendarStates, ProvenanceLine, SensorFrieze, OverlapChart, Segmented
    [DSC, "' : à venir'", "': aún no'"], [DSC, "' : aucune observation'", "': sin observación'"], [DSC, "(fr ? ' : ' : ': ')", "(fr ? ': ' : ': ')"],
    [DSC, "', trop peu pour comparer'", "', muy pocas para comparar'"], [DSC, "' (mois en cours)'", "' (mes en curso)'"], [DSC, "', épinglé'", "', fijado'"],
    [DSC, "'Total annuel, échelle log'", "'Total anual, escala log'"], [DSC, "'Aqua seul, indice (témoin)'", "'Solo Aqua, índice (control)'"],
    [DSC, "'Total annuel'", "'Total anual'"], [DSC, "'moins de 10'", "'menos de 10'"], [DSC, "'en cours'", "'en curso'"],
    [DSC, "'Calendrier des feux, mois par année, '", "'Calendario de quemas, mes por año, '"],
    [DSC, "'Totaux annuels en échelle log'", "'Totales anuales en escala log'"], [DSC, "'année médiane avant / après 2012'", "'año mediano antes / después de 2012'"],
    [DSC, "'Épinglé · Échap pour retirer'", "'Fijado · Esc para quitar'"], [DSC, "'Aucune observation'", "'Sin observación'"],
    [DSC, "'Trop peu de détections pour comparer'", "'Muy pocas detecciones para comparar'"], [DSC, "'médiane : '", "'mediana: '"],
    [DSC, "'MODIS brut, non corrigé'", "'MODIS crudo, sin corregir'"], [DSC, "'MODIS brut '", "'MODIS crudo '"], [DSC, "'VIIRS, la référence'", "'VIIRS, la referencia'"],
    [DSC, "' · mois en cours'", "' · mes en curso'"],
    [DSC, "'Selected month'", "'Mes seleccionado'"], [DSC, "'Enter to select this month'", "'Enter para elegir este mes'"], [DSC, "'Click to select this month'", "'Haga clic para elegir este mes'"],
    [DSC, "'Entrée pour épingler'", "'Enter para fijar'"], [DSC, "'Cliquez pour épingler'", "'Haga clic para fijar'"],
    [DSC, "real: ['Réel', 'Real'], synthetic: ['Synthétique', 'Synthetic'], computed: ['Calculé', 'Computed']", "real: ['Real', 'Real'], synthetic: ['Sintético', 'Synthetic'], computed: ['Calculado', 'Computed']"],
    [DSC, "{fr ? 'Source' : 'Source'}", "{fr ? 'Fuente' : 'Source'}"],
    [DSC, "'raccord corrigé ici'", "'empalme corregido aquí'"], [DSC, "'2 nov. 2026 · prochain raccord'", "'2 nov. 2026 · próximo empalme'"],
    [DSC, "'lancement visé (ASC)'", "'lanzamiento previsto (CSA)'"], [DSC, "'Chaîne des capteurs de feux, de 2000 à 2030'", "'Cadena de sensores de fuego, de 2000 a 2030'"],
    [DSC, "'FireBridge : '", "'FireBridge: '"], [DSC, "s.label + ' : ' +", "s.label + ': ' +"], [DSC, "'lancement visé en '", "'lanzamiento previsto en '"], [DSC, "'depuis '", "'desde '"],
    [DSC, "', fin le 2 novembre 2026'", "', fin el 2 de noviembre de 2026'"], [DSC, "'auj.'", "'hoy'"], [DSC, "'mission prévue'", "'misión prevista'"],
    [DSC, "'Recouvrement '", "'Superposición '"], [DSC, "' : VIIRS mesuré et MODIS multiplié par le ratio, par année, échelle log'", "': VIIRS medido y MODIS multiplicado por la razón, por año, escala log'"],
    [DSC, "'VIIRS mesuré'", "'VIIRS medido'"], [DSC, "'cellules-jours par an, échelle log'", "'celdas-día por año, escala log'"],
    [DSC, "'Légende : cellules-jours par mois, de '", "'Leyenda: celdas-día por mes, de '"], [DSC, "' à plus de '", "' a más de '"], [DSC, "', échelle logarithmique'", "', escala logarítmica'"],
    [DSC, "'Légende : rapport à la médiane du même mois, de moins d’un quart à plus de quatre fois'", "'Leyenda: razón con la mediana del mismo mes, de menos de un cuarto a más de cuatro veces'"],
    [DSC, "'cellules-jours par mois'", "'celdas-día por mes'"], [DSC, "'× la médiane du même mois'", "'× la mediana del mismo mes'"],
    [DSC, "'aucune détection'", "'sin detección'"], [DSC, "'aucune observation'", "'sin observación'"], [DSC, "'mois en cours'", "'mes en curso'"], [DSC, "'trop peu pour comparer'", "'muy pocas para comparar'"],
    [DSC, "' cellules-jours'", "' celdas-día'"], [DSC, "'cellules-jours'", "'celdas-día'"],
    [DSC, "ariaLabel = 'Options'", "ariaLabel = 'Opciones'"],
    [DSC, '(d.note || ILLUSTRATIVE_NOTE)', "(({ 'Real NASA FIRMS tiles, MCD14ML and VNP14IMGT': 'Teselas reales de NASA FIRMS, MCD14ML y VNP14IMGT' })[d.note] || d.note || ILLUSTRATIVE_NOTE)"],
    [DSC, '{a.partialNote || (', "{(a.partialNote && a.partialNote.replace(/^to (\\w{3})$/, (_, m) => 'hasta ' + MONTHS.fr[" + MON3 + ".indexOf(m)])) || ("],
  ],
};
const LDS = path.join(I18N, 'ds');
function forkDs() {
  if (fs.existsSync(LDS)) {
    if (!opt('force')) die(fwd(path.relative(root, LDS)) + ' exists (use --force to rebuild it from ds/; it is generated, nothing hand-made is lost)');
    if (isLink(LDS)) die(LDS + ' is a link; remove it by hand');
    fs.rmSync(LDS, { recursive: true });
  }
  const tmp = LDS; // copied then patched in place (a rename can fail on Windows while an indexer holds the folder)
  fs.cpSync(path.join(root, 'ds'), tmp, { recursive: true });
  const patches = [...dsCommon(LANGS.includes(lang) ? lang : 'fr'), ...(DS_TEXT[lang] || []), ...dsGeneric];
  const files = {}, counts = [];
  const read = (f) => (files[f] ??= fs.readFileSync(path.join(tmp, f), 'utf8'));
  for (const [f, from, to] of patches) {
    const s = read(f), n = s.split(from).length - 1;
    if (!n) { fs.rmSync(tmp, { recursive: true }); die('fork-ds: ' + JSON.stringify(from) + ' not found in ds/' + f + ' (ds/ changed? update DS_TEXT in scripts/lang.mjs)'); }
    files[f] = s.split(from).join(to); counts.push(n);
  }
  for (const f of Object.keys(files)) fs.writeFileSync(path.join(tmp, f), files[f]);
  console.log('fork-ds: ds/ → ' + fwd(path.relative(root, LDS)) + ' · ' + patches.length + ' patches (' + counts.reduce((a, b) => a + b, 0) + ' replacements) in ' + Object.keys(files).join(', '));
}

// ───────── fork ─────────
function fork() {
  if (fs.existsSync(LSRC)) {
    if (!opt('force')) die(fwd(path.relative(root, LSRC)) + ' exists (use --force to replace it; translations in it would be LOST)');
    if (fs.lstatSync(LSRC).isSymbolicLink()) die(LSRC + ' is a link; remove it by hand');
    fs.rmSync(LSRC, { recursive: true });
  }
  fs.mkdirSync(I18N, { recursive: true });
  fs.cpSync(path.join(root, 'src'), LSRC, { recursive: true });
  const lj = path.join(LSRC, 'lang.js');
  if (fs.existsSync(lj)) {
    const s = fs.readFileSync(lj, 'utf8'), re = /export const LANG = '[a-z]{2}';/;
    if ((s.match(new RegExp(re.source, 'g')) || []).length !== 1) die('lang.js: "export const LANG = \'en\';" not found exactly once');
    fs.writeFileSync(lj, s.replace(re, "export const LANG = '" + lang + "';"));
    console.log('lang.js: LANG = \'' + lang + '\'');
  } else {
    fs.writeFileSync(lj, "// The language of this build (written by scripts/lang.mjs: src/lang.js did not exist when this copy was made).\nexport const LANG = '" + lang + "';\n");
    console.log('NOTE: src/lang.js does not exist yet; wrote a minimal i18n/' + lang + '/src/lang.js (re-fork with --force once it exists)');
  }
  fs.writeFileSync(path.join(LSRC, 'l10n.js'), L10N);
  console.log('l10n.js: display-layer number and month formatting for ' + lang + ' (see i18n/README.md)');
  if (!fs.existsSync(META)) {
    const en = shellOriginals();
    const meta = { _help: 'Translate the values of the top-level keys. _en holds the English originals: they are the exact patterns replaced in the built HTML; do not edit _en.' };
    for (const k of Object.keys(en)) meta[k] = k === 'htmlLang' ? lang : en[k];
    meta._en = en;
    fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');
    console.log('wrote', fwd(path.relative(root, META)), '(' + Object.keys(en).join(', ') + ')');
  } else console.log('kept existing', fwd(path.relative(root, META)));
  if (!fs.existsSync(LDS)) forkDs(); else console.log('kept existing', fwd(path.relative(root, LDS)), '(rebuild with: node scripts/lang.mjs fork-ds ' + lang + ' --force)');
  const n = fs.readdirSync(LSRC).length;
  console.log('forked src/ → ' + fwd(path.relative(root, LSRC)) + ' (' + n + ' files); metrics.js sha256 ' + sha(path.join(LSRC, 'metrics.js')).slice(0, 12));
}

// ───────── build ─────────
const isLink = (p) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };
function unlinkJunction(p) {
  if (!isLink(p)) return;
  try { fs.unlinkSync(p); } catch { fs.rmdirSync(p); }
  if (isLink(p) || fs.existsSync(p)) throw new Error('could not remove junction ' + p);
}
const LINKS = ['ds', 'data', 'vendor', 'node_modules', 'tools-win'];
// Removes a temp build root: junctions first (never a recursive delete through a link), then checks that no link is
// left anywhere inside before deleting the rest.
function cleanRoot(R) {
  if (!fs.existsSync(R)) return;
  for (const l of LINKS) unlinkJunction(path.join(R, l));
  const walk = (d) => { for (const e of fs.readdirSync(d)) { const p = path.join(d, e); if (isLink(p)) throw new Error('link left inside ' + R + ': ' + p + ' (remove it by hand, NOT recursively)'); if (fs.statSync(p).isDirectory()) walk(p); } };
  walk(R);
  fs.rmSync(R, { recursive: true });
}
const dataBlocks = (html) => Object.fromEntries([...html.matchAll(/<script type="application\/json" id="(fb-[a-z]+)">([\s\S]*?)<\/script>/g)].map((m) => [m[1], m[2]]));

function build() {
  if (!fs.existsSync(LSRC)) die('no ' + fwd(path.relative(root, LSRC)) + ': run  node scripts/lang.mjs fork ' + lang + (TEST ? ' --test' : ''));
  if (!fs.existsSync(META)) die('no ' + fwd(path.relative(root, META)));
  if (sha(path.join(LSRC, 'metrics.js')) !== sha(path.join(root, 'src', 'metrics.js'))) die('i18n/' + lang + '/src/metrics.js differs from src/metrics.js: it must be byte-identical (the numbers are the same in every language). Restore it with:  cp src/metrics.js i18n/' + lang + '/src/metrics.js');
  for (const f of ['guard.js', 'state.js']) if (fs.existsSync(path.join(LSRC, f)) && fs.existsSync(path.join(root, 'src', f)) && sha(path.join(LSRC, f)) !== sha(path.join(root, 'src', f))) console.log('note: i18n/' + lang + '/src/' + f + ' differs from src/' + f + ' (allowed for strings; logic must not change)');
  const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
  const en = shellOriginals();
  for (const k of Object.keys(en)) { if (meta._en && meta._en[k] !== en[k]) die('meta.json _en.' + k + ' no longer matches build.mjs (' + JSON.stringify(en[k]) + '): update _en and re-check the translation'); if (typeof meta[k] !== 'string' || !meta[k].trim()) die('meta.json: ' + k + ' is missing or empty'); }
  const OUT = path.resolve(opt('out') && opt('out') !== true ? opt('out') : DEFAULT_OUT);
  const R = path.join(root, '.scratch', 'lang-' + lang);
  cleanRoot(R);
  fs.mkdirSync(R, { recursive: true });
  let res;
  try {
    for (const f of ['build-win.mjs', 'package.json']) fs.copyFileSync(path.join(root, f), path.join(R, f));
    fs.cpSync(LSRC, path.join(R, 'src'), { recursive: true });
    fs.mkdirSync(path.join(R, 'docs'), { recursive: true });
    fs.cpSync(path.join(root, 'docs', 'logo'), path.join(R, 'docs', 'logo'), { recursive: true });
    // ds: the language's own copy (i18n/<lang>/ds, see fork-ds) when it exists, else the shared ds/.
    const target = (l) => (l === 'ds' && fs.existsSync(LDS) ? LDS : path.join(root, l));
    for (const l of LINKS) fs.symlinkSync(target(l), path.join(R, l), 'junction'); // a directory junction on Windows (no admin needed)
    console.log('design system: ' + fwd(path.relative(root, target('ds'))));
    const tmp = path.join(R, 'out.html');
    res = spawnSync(process.execPath, ['build-win.mjs'], { cwd: R, env: { ...process.env, FB_OUT: tmp }, encoding: 'utf8' });
    if (res.status !== 0) { process.stdout.write(res.stdout || ''); process.stderr.write(res.stderr || ''); throw new Error('build-win.mjs failed (exit ' + res.status + ')'); }
    let html = fs.readFileSync(tmp, 'utf8');
    for (const [k, , pat, rep] of SHELL) {
      const p = pat(en[k]), n = html.split(p).length - 1;
      if (n !== 1) throw new Error('post-process: ' + JSON.stringify(p) + ' found ' + n + ' times in the built HTML (expected exactly 1)');
      html = html.replace(p, () => rep(meta[k]));
      if (html.split(rep(meta[k])).length - 1 < 1) throw new Error('post-process: replacement for ' + k + ' not present after replace');
    }
    // The numbers must be the same in every language: the data blocks equal the English build's.
    if (fs.existsSync(EN_HTML)) {
      const a = dataBlocks(html), b = dataBlocks(fs.readFileSync(EN_HTML, 'utf8'));
      const ka = Object.keys(a), diff = ka.filter((k) => a[k] !== b[k]);
      if (!ka.length || diff.length || ka.length !== Object.keys(b).length) throw new Error('data blocks differ from dist/firebridge.html: ' + (diff.join(', ') || 'block set') + ' (rebuild English first:  node build-win.mjs)');
      console.log('data blocks identical to dist/firebridge.html (' + ka.length + ': ' + ka.join(', ') + ')');
    } else console.log('warning: dist/firebridge.html missing: data blocks not compared');
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, html);
    const line = (res.stdout || '').trim().split('\n').pop();
    console.log('build-win.mjs: ' + line.replace(/^\S+ /, ''));
    console.log('wrote ' + fwd(OUT) + ' · ' + (fs.statSync(OUT).size / 1e6).toFixed(2) + ' MB · ' + (line.match(/record ends \S+/) || ['record ends ?'])[0] + ' · <html lang="' + meta.htmlLang + '">');
  } catch (e) {
    console.error('ERROR: ' + e.message);
    process.exitCode = 1;
  } finally {
    if (opt('keep')) { for (const l of LINKS) unlinkJunction(path.join(R, l)); console.log('kept', fwd(R), '(junctions removed)'); } else cleanRoot(R);
  }
}

// ───────── browser helpers ─────────
const htmlArg = () => path.resolve(opt('html') && opt('html') !== true ? opt('html') : DEFAULT_OUT);
async function browser() {
  const { default: puppeteer } = await import('puppeteer-core');
  return puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ZONES = ['canada', 'argentina', 'larioja'];
const SCREENS = (z) => [['overview', 'tab=overview'], ['dash', 'tab=dash'], ['evidence', 'tab=evidence'], ['how-1', 'tab=how&step=1'], ['how-2', 'tab=how&step=2'], ['how-3', 'tab=how&step=3'], ['how-4', 'tab=how&step=4'], ['method', 'tab=method']].map(([n, h]) => [z + '/' + n, h + '&z=' + z + '&anim=0']);
async function open(b, file, hash, [w, h], errors) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('fb-theme', 'light'); } catch (e) {} });
  if (errors) {
    p.on('pageerror', (e) => errors.push(hash + ' @' + w + ': pageerror ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(hash + ' @' + w + ': console.error ' + m.text()); });
  }
  await p.goto(pathToFileURL(file).href + '#' + hash, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__fb && window.__fb.pending === false, { timeout: 30000 }).catch(() => errors && errors.push(hash + ' @' + w + ': app not ready in 30 s'));
  await sleep(400);
  return p;
}
// The two menus: ⋯ (More) and Download (where shown). Returns [[name, opened?]].
const MENUS = [['more', '.fb-morebtn'], ['download', 'button[aria-controls="fb-dl"]']];
async function openMenu(p, sel) {
  const el = await p.$(sel); if (!el) return false;
  await el.click(); await sleep(300); return true;
}
const visibleText = (p) => p.evaluate(() => {
  const out = [];
  const t = document.body.innerText || '';
  t.split(/\n+/).forEach((s) => { s = s.trim(); if (s) out.push(s); });
  document.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach((e) => ['title', 'aria-label', 'placeholder', 'alt'].forEach((a) => { const v = e.getAttribute(a); if (v && v.trim()) out.push(v.trim()); }));
  out.push(document.title);
  return out;
});

// Leftover-English heuristic. Words that are also French or Spanish (a, an, on, or, no, zone, ratio, local, chance,
// record, series, satellite, correction, image, places, …) are left out on purpose.
const EN_WORDS = new Set(('the and of with without to in is are was were be been has have this that these those than then from by for at it its ' +
  'which where when what how why who will can could should would not only each every all any more most less some other ' +
  'fire fires detection detections hotspot hotspots activity month months year years harmonized harmonised harmonizing harmonize raw ' +
  'records click download downloads shows show showing see shown select pick choose enter draw drawn reset copy link theme light dark ' +
  'export map calendar evidence method overview typical uncertain reliable fair borrowed trend trends rise rises rose fell doubled tripled ' +
  'quadrupled still up down reverses matches holds flips sensor factor range box boxes burned area official about between after before since until ' +
  'here there layer layers counts anomaly provisional computed real cell-days days day place nearest data larger try back zoom fit ' +
  'help close open more less menu guide step next previous works seen times twice half third quarter almost none every per a\u00A0year yearly ' +
  'monthly weather season seasonal summer winter spring autumn fall country whole same one two three four five against reading readings ' +
  'january february march april may june july august september october november december jan feb mar apr jun jul aug sep sept oct nov dec').split(/\s+/));
const IGNORE = /\b(FireBridge|NASA|FIRMS|MODIS|VIIRS|S-NPP|NOAA-20|NOAA|Aqua|Terra|CONAE|CSV|SVG|PNG|JSON|URL|Canada|Argentina|Argentine|Québec|Quebec|La Rioja|Rioja|Córdoba|Cordoba|Chilecito|Boreal|Natural Earth|NFD|CWFIS|React|English|Français|Español|Esc|Ctrl|Cmd|Shift)\b/g;
const englishHits = (s) => s.replace(IGNORE, ' ').toLowerCase().split(/[^a-z\u00C0-\u024F'-]+/).filter((w) => EN_WORDS.has(w) || EN_WORDS.has(w.replace(/'s$/, '')));

// ───────── check ─────────
function runTool(label, args, env) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const c = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env } });
    let out = '';
    c.stdout.on('data', (d) => (out += d)); c.stderr.on('data', (d) => (out += d));
    c.on('close', (code) => resolve({ label, code, out, s: Math.round((Date.now() - t0) / 1000) }));
  });
}
function summarise({ label, code, out, s }) {
  const L = out.split(/\r?\n/);
  let pass = 0, fail = 0;
  if (/stripfit|calhead/.test(label)) { const m = out.match(/(\d+) checks, (\d+) failed/); if (m) { fail = +m[2]; pass = +m[1] - fail; } }
  else if (/measure/.test(label)) { const rows = L.filter((l) => /^\d+x\d+ /.test(l)); fail = rows.filter((l) => /FAIL/.test(l)).length; pass = rows.length - fail; }
  else { pass = L.filter((l) => /^PASS\b/.test(l)).length; fail = L.filter((l) => /^FAIL\b/.test(l)).length; }
  const ok = code === 0 && fail === 0 && pass > 0;
  return { ok, line: (ok ? 'PASS ' : 'FAIL ') + label.padEnd(22) + ' ' + pass + ' pass, ' + fail + ' fail, exit ' + code + ' (' + s + ' s)', fails: L.filter((l) => /FAIL|Error|error/.test(l)).slice(0, 12) };
}
const norm = (v) => (v == null ? v : String(v).replace(/[\s\u00A0\u202F]/g, '').replace(/,/g, '.'));

async function check() {
  const file = htmlArg();
  if (!fs.existsSync(file)) die('no ' + fwd(file) + ': run  node scripts/lang.mjs build ' + lang + (TEST ? ' --test' : ''));
  if (!fs.existsSync(EN_HTML)) die('no dist/firebridge.html (the English reference): run  node build-win.mjs');
  let failed = 0;
  const maxEn = +(opt('max-english') || 0);
  // (a) label-independent layout checks, in parallel with the browser checks below.
  const FB = fwd(file);
  const layout = opt('skip-layout') ? Promise.resolve([]) : Promise.all([
    runTool('tools-win/stripfit', ['tools-win/stripfit.mjs'], { FB_HTML: FB }),
    runTool('tools-win/calhead', ['tools-win/calhead.mjs'], { FB_HTML: FB }),
    runTool('tools-win/measure', ['tools-win/measure.mjs'], { FB_HTML: FB }),
    runTool('scripts/check_margin', ['scripts/check_margin.mjs', FB, 'i18n-' + lang], {}),
  ]);
  const b = await browser();
  const errors = [], texts = new Map(); // fragment → Set(screen)
  const add = (screen, list) => list.forEach((s) => { if (!texts.has(s)) texts.set(s, new Set()); texts.get(s).add(screen); });
  let screens = 0;
  try {
    // (b) every tab, How steps, both menus, two sizes; (c) visible text collected on the way.
    for (const vp of [[1440, 900], [390, 844]]) for (const z of ZONES) for (const [name, hash] of SCREENS(z)) {
      const p = await open(b, file, hash, vp, errors); screens++;
      add(name + '@' + vp[0], await visibleText(p));
      if (name.endsWith('/dash') || name.endsWith('/overview')) for (const [mn, sel] of MENUS) {
        if (await openMenu(p, sel)) { add(name + '+' + mn + '@' + vp[0], await visibleText(p)); await p.keyboard.press('Escape'); await sleep(150); }
      }
      await p.close();
    }
    // Download menu lives on the Calendar/Dashboard at ≥ 1024; the panel=cal hash covers phones.
    for (const vp of [[1440, 900], [390, 844]]) { const p = await open(b, file, 'tab=dash&z=canada&panel=cal&anim=0', vp, errors); screens++; for (const [mn, sel] of MENUS) if (await openMenu(p, sel)) { add('canada/cal+' + mn + '@' + vp[0], await visibleText(p)); await p.keyboard.press('Escape'); await sleep(150); } await p.close(); }
    // (d) the figures equal English, both views.
    const fig = [];
    for (const z of ['canada', 'argentina']) for (const v of ['raw', 'harmonized']) {
      const hash = 'tab=dash&z=' + z + '&v=' + v + '&anim=0', got = {};
      for (const [k, f] of [['en', EN_HTML], [lang, file]]) { const p = await open(b, f, hash, [1440, 900], k === 'en' ? null : errors); got[k] = await p.evaluate(() => ({ hero: window.__fb && window.__fb.hero, ratio: window.__fb && window.__fb.ratio, view: window.__fb && window.__fb.series })); await p.close(); }
      const ok = got.en.hero != null && norm(got.en.hero) === norm(got[lang].hero) && norm(got.en.ratio) === norm(got[lang].ratio) && got.en.view === got[lang].view;
      fig.push((ok ? 'PASS ' : 'FAIL ') + (z + ' ' + v).padEnd(21) + ' en hero ' + JSON.stringify(got.en.hero) + ' ratio ' + got.en.ratio + ' | ' + lang + ' hero ' + JSON.stringify(got[lang].hero) + ' ratio ' + got[lang].ratio);
      if (!ok) failed++;
    }
    console.log('\n(b) page and console errors: ' + screens + ' screens loaded (3 zones × 8 screens × 2 sizes + menus)');
    if (errors.length) { failed++; [...new Set(errors)].slice(0, 30).forEach((e) => console.log('  FAIL ' + e)); } else console.log('  PASS no page error, no console error');
    console.log('\n(d) figures equal English (hero, ratio; decimal separators normalised):'); fig.forEach((l) => console.log('  ' + l));
  } finally { await b.close(); }
  // (c) leftover English
  const rows = [];
  for (const [s, set] of texts) { const h = englishHits(s); if (h.length) rows.push({ s, n: set.size, h: [...new Set(h)], screens: [...set] }); }
  rows.sort((a, b) => b.n - a.n || b.h.length - a.h.length || a.s.localeCompare(b.s));
  const dir = path.join(root, 'shots', 'i18n', lang); fs.mkdirSync(dir, { recursive: true });
  const rep = path.join(dir, 'leftover-english.txt');
  fs.writeFileSync(rep, '# Leftover English in ' + fwd(file) + ' (' + new Date().toISOString() + '): ' + rows.length + ' fragments\n# count = screens it appears on · [English words matched] · fragment · first screens\n' +
    rows.map((r) => String(r.n).padStart(3) + '  [' + r.h.join(' ') + ']  ' + r.s.replace(/\s+/g, ' ').slice(0, 300) + '   (' + r.screens.slice(0, 4).join(', ') + (r.screens.length > 4 ? ', …' : '') + ')').join('\n') + '\n');
  console.log('\n(c) leftover English: ' + rows.length + ' fragments (threshold ' + (maxEn || 'none: report only') + ') → ' + fwd(rep));
  rows.slice(0, 25).forEach((r) => console.log('  ' + String(r.n).padStart(3) + '× ' + r.s.replace(/\s+/g, ' ').slice(0, 110)));
  if (maxEn && rows.length > maxEn) { console.log('  FAIL more than ' + maxEn + ' fragments still look English'); failed++; }
  // (a) results
  console.log('\n(a) layout checks against ' + FB + ':');
  for (const r of await layout) { const s = summarise(r); console.log('  ' + s.line); if (!s.ok) { failed++; s.fails.forEach((l) => console.log('      ' + l.slice(0, 200))); } }
  if (opt('skip-layout')) console.log('  (skipped: --skip-layout)');
  console.log('\n' + (failed ? 'CHECK FAILED (' + failed + ' group' + (failed > 1 ? 's' : '') + ')' : 'CHECK PASSED') + ' · ' + lang + ' · ' + fwd(file));
  process.exitCode = failed ? 1 : 0;
}

// ───────── shots ─────────
async function shots() {
  const file = htmlArg();
  if (!fs.existsSync(file)) die('no ' + fwd(file));
  const dir = path.join(root, 'shots', 'i18n', lang); fs.mkdirSync(dir, { recursive: true });
  const b = await browser(); let n = 0;
  try {
    for (const z of ['canada', 'argentina']) for (const [name, hash] of SCREENS(z)) {
      const p = await open(b, file, hash, [1440, 900], null);
      await p.screenshot({ path: path.join(dir, name.replace('/', '-') + '.png') }); n++;
      if (name.endsWith('/dash')) for (const [mn, sel] of MENUS) if (await openMenu(p, sel)) { await p.screenshot({ path: path.join(dir, name.replace('/', '-') + '-menu-' + mn + '.png') }); n++; await p.keyboard.press('Escape'); await sleep(150); }
      await p.close();
    }
  } finally { await b.close(); }
  console.log(n + ' screenshots → ' + fwd(dir));
}

// ───────── l10n.js, written into each language copy by fork ─────────
const L10N = `// Display-layer formatting for this language (written by scripts/lang.mjs fork; see i18n/README.md and i18n/GLOSSARY.md).
// metrics.js must stay byte-identical to English, so its English month names (endLabel, partialLabel, monthReading notes)
// are translated HERE, at display time. The values never change: only separators, month names and units do.
// In English (LANG 'en') every function returns exactly what the English helpers return.
import { LANG } from './lang.js';
import { endLabel, partialLabel } from './metrics.js';
const L = LANG === 'fr' || LANG === 'es' ? LANG : 'en';
const NNBSP = '\\u202F', NBSP = '\\u00A0';
const EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LONG = {
  en: EN_LONG,
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};
const SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'],
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
export const endLabelL = () => { const s = endLabel(), m = s.match(/^([A-Z][a-z]+) (\\d{4})$/); return m && EN_LONG.includes(m[1]) ? monthYear(EN_LONG.indexOf(m[1]), m[2]) : s; };
// partialLabel() is null or '2026: partial year, to March'.
const PARTIAL_TXT = { en: (y, m) => y + ': partial year, to ' + m, fr: (y, m) => y + NNBSP + ': année partielle, jusqu’en ' + m, es: (y, m) => y + ': año parcial, hasta ' + m };
export const partialLabelL = () => { const s = partialLabel(); if (!s) return s; const m = s.match(/^(\\d{4}): partial year, to ([A-Z][a-z]+)$/); return m ? PARTIAL_TXT[L](m[1], trMonth(m[2])) : s; };
// Any other English text from metrics.js that contains month names (monthReading notes, annual partialNote 'to Mar'):
// replaces whole English month names (and 3-letter abbreviations after 'to ') in a string. Translate the surrounding words
// at the call site.
export const trMonthsIn = (s) => (L === 'en' || !s ? s : s.replace(/\\b(January|February|March|April|May|June|July|August|September|October|November|December)\\b/g, (n) => trMonth(n)).replace(/\\bto (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\b/g, (_, a) => (L === 'fr' ? 'jusqu’en ' : 'hasta ') + SHORT[L][SHORT.en.indexOf(a)]));

// Other English text produced by metrics.js (preset labels, provenance notes, verdict overrides). ONE owner per language
// fills this table: the translator of copy.js. Others only CALL tm(text) where such a text is displayed.
// A missing or null entry falls back to the English text (the leftover-English report will list it).
export const METRICS_TEXT = {
  'All of Canada': null, 'All of Argentina': null, 'Boreal Québec': null, 'La Rioja': null,
  'this box': null, 'too high': null, 'sensor effect; trend uncertain': null,
  'Raw only: not comparable across 2012': null,
  'Real NASA FIRMS tiles, MCD14ML and VNP14IMGT': null,
  'Provisional, not filtered for non-fire sources (near-real-time data).': null,
  'NOAA-20 used: S-NPP outage this month (S-NPP far below NOAA-20 country-wide).': null,
  'Before 2003: partial MODIS coverage (Terra only until July 2002). Not used in statistics.': null,
  'Computed: S-NPP record starts 20 Jan 2012; this month is MODIS': null,
};
// Texts that metrics.js builds from a fixed English start plus a number: [English start, translated start].
export const METRICS_PREFIX = [
  ['Computed: NOAA-20 rescaled to S-NPP (÷ ', null],
  ['VIIRS ÷ MODIS over the overlap years: raw data after 2012 count ', null],
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
`;

if (cmd === 'fork') fork();
else if (cmd === 'fork-ds') forkDs();
else if (cmd === 'build') build();
else if (cmd === 'check') await check();
else if (cmd === 'shots') await shots();
else die('unknown command ' + cmd);
