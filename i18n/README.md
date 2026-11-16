# FireBridge in French and Spanish

## Approach
No i18n framework. Each language is a full copy of `src/` in `i18n/<lang>/src/`. Translators rewrite the string
literals in place in that copy. The English `src/` is never touched by translation. `src/lang.js` holds
`export const LANG = 'en'`. In each copy it says `'fr'` or `'es'`, and the app uses it for the language switch.
The text that `build.mjs` writes around the app (`<html lang>`, `<title>`, the description, `<noscript>` and the
boot-screen kicker) is in `i18n/<lang>/meta.json`. The script replaces it after the build.

Every term follows **`i18n/GLOSSARY.md`**. Read it before you start. The three translators of a language work in
parallel, so the glossary is the only thing that keeps them consistent.

## Commands (run from the repo root)
```sh
node scripts/winport.mjs                       # once, if build-win.mjs / tools-win/ are missing or stale
node build-win.mjs                             # the English reference dist/firebridge.html (check (d) compares with it)
node scripts/lang.mjs fork fr                  # src/ → i18n/fr/src/ (refuses if it exists; --force REPLACES it and loses translations)
node scripts/lang.mjs build fr                 # → dist/firebridge.fr.html  (--out=path to write elsewhere)
node scripts/lang.mjs check fr                 # quality gate, exit 1 on failure (≈ 5–8 min; --skip-layout for the fast part only)
node scripts/lang.mjs check fr --max-english=40   # also fail if more than 40 fragments still look English
node scripts/lang.mjs shots fr                 # screenshots → shots/i18n/fr/
```
- `build` does not change `build.mjs`, `build-win.mjs` or `src/`. It assembles `.scratch/lang-<lang>/` from a copy
  of `build-win.mjs`, the language's `src/`, `docs/logo/` and directory junctions to `ds/ data/ vendor/ node_modules/
  tools-win/`. It runs the build, then removes the junctions before it deletes the temp folder.
- `build` refuses to run unless `i18n/<lang>/src/metrics.js` is byte-identical to `src/metrics.js`. It also fails if
  any data block (`fb-record`, `fb-canada`, `fb-argentina`, `fb-outlines`, `fb-official`, `fb-hotspots`) differs from
  `dist/firebridge.html`.
- `build` fails loudly if a `meta.json` pattern is not found exactly once in the built HTML.
- `check` runs four groups:
  - (a) `tools-win/stripfit`, `calhead`, `measure` and `scripts/check_margin.mjs` against the variant. These catch
    longer labels that clip the fixed-height verdict strip or the calendar header.
  - (b) Every tab, How it works steps 1–4, and the ⋯ and Download menus, for `canada`, `argentina` and `larioja`,
    at 1440×900 and 390×844. Any page error or console error fails.
  - (c) A leftover-English report. The full list is in `shots/i18n/<lang>/leftover-english.txt`, sorted by how many
    screens show each fragment.
  - (d) `__fb.hero` and `__fb.ratio` must equal English for Canada and Argentina in both views. `2,0×` counts as
    equal to `2.0×`.

## The design-system copy (`i18n/<lang>/ds/`)
The shared components in `ds/components/src/` (BurnCalendar, ColorLegend, ProvenanceLine, SensorFrieze, OverlapChart,
Segmented) and `scale.js` speak English for the `locale="en"` that the sources pass. Each language therefore has a
generated copy, `i18n/<lang>/ds/`, in which the components always speak the target language. `build` uses that copy
when it exists. `fork` creates it, and for an existing fork you run `node scripts/lang.mjs fork-ds <lang>` (it never
touches `src/`; add `--force` to regenerate it).
- **Do not edit `i18n/<lang>/ds/` by hand.** It is produced from `ds/` by the patch tables in `scripts/lang.mjs`
  (`dsCommon`, `DS_TEXT`, `dsGeneric`). To change a DS text, edit the table and re-run `fork-ds <lang> --force`.
  `fork-ds` fails if a patched text is no longer found in `ds/`.
- **`scale.js` formats numbers in the target language even when it is called with `'en'`.** So
  `formatDecimal(x, 1, 'en')` left in a translated file already gives `2,0` and `formatStep` gives `2,0×` (no
  space). Using `l10n.js` is still the rule. `MONTHS.en` and `MONTHS_LONG.en` stay English, because `exports.js`
  writes them into the exported files.

## Rules for translators
**Translate:** string literals that a person sees. This includes JSX text, `title`, `aria-label` (screen-reader text
is user-visible), `placeholder`, the sentences built in `copy.js`, and menu labels.

**Never change:**
- Logic, conditions, numbers, thresholds, rounding, or the order of operations.
- `src/metrics.js`. It must be byte-identical. To restore it: `cp src/metrics.js i18n/<lang>/src/metrics.js`.
- Keys and ids, such as `tab` ids (`overview`, `dash`, `evidence`, `how`, `method`), layer ids (`det`, `ratio`,
  `record`, `month`) and view ids (`raw`, `harmonized`).
- URL hash parameters (`z c b v m l f t tab step panel anim …`), CSS class names, element `id`s and `data-*`
  attributes.
- Comparisons on strings, such as `=== 'raw'`.
- `exports.js` content. CSV headers and rows, SVG/PNG text and file names stay English, so the exported files are
  identical in every language. Only the menu labels that offer them are translated.
- `state.js` logic. `guard.js` reason texts may be translated only where they are displayed.
- Tests in `tools/` match some English labels. They run only against English, so this is not your problem, but do
  not rename classes to "fix" them.

**Keep:** the honesty wording. An uncertain trend is called uncertain. "by construction" and "not a validation" stay
explicit. A translation never makes a claim stronger.

**Length:** in fixed-size places (verdict strip, pills, tab bar, chips, legends, calendar header, menu titles),
stay within about +15 % of the English length. If a label does not fit, use the short alternates in the glossary,
and run `check` to confirm.

**Who edits what:** each file in `i18n/<lang>/src/` has ONE translator. `l10n.js` is written by `fork`, and its
functions are final. Only the `copy.js` translator fills the `METRICS_TEXT` / `METRICS_PREFIX` tables at its end.
Nobody else edits `l10n.js`.

## Numbers and months: the display layer (same recipe in every file)
`fork` writes **`i18n/<lang>/src/l10n.js`**. It reads `LANG` and exports the formatting functions below. In English
each one returns exactly what the English helper returns. **Do not use `Intl`, `toLocaleString` or the `ds/` scale
helpers with a locale.** `ds/components/src/scale.js` is shared by every language and knows no Spanish. Its French
also puts a space before `×`, which the glossary forbids.

| Where it is today (English) | Replace with (from `./l10n.js`) | Output fr / es |
|---|---|---|
| `formatNumber(v, 'en')`, `v.toLocaleString('en')`, `toLocaleString('en-US')`, `'2,000'` literals | `num(v)` | `81 333` (U+202F) / `81.333`, `1947` |
| `formatDecimal(v, d, 'en')` | `dec(v, d)` | `2,01` / `2,01` |
| `formatStep(r, 'en')` (copy.js `X`) | `X(r)` | `2,0×` (no space) |
| copy.js `PCT(e)`, `SPCT(e)`, `'%'` after a number | `pct(e)`, `spct(e)`, `PS` | `55 %` (U+202F) / `55 %` (U+00A0) |
| `ordinal(n, 'en')` (copy.js `ORD`) | `ord(n)` | `1er`, `2e` / `1.º` |
| `MONTHS_LONG.en[m0]` (copy.js `monthLong`) | `monthLong(m0)` | `octobre` / `octubre` |
| `MON`/`MON3` arrays `['Jan', …]` (CalPanel.jsx, App.jsx) | `MONTHS_SHORT_L` or `monthShort(m0)` | `oct.` / `oct.` |
| `monthLong(m) + ' ' + y` | `monthYear(m0, y)` · short: `monthYearShort(m0, y)` | `octobre 2026` / `octubre de 2026` · `oct. 2026` |
| `endLabel()` from metrics.js (`'December 2025'`) | `endLabelL()` | `décembre 2025` / `diciembre de 2025` |
| `partialLabel()` from metrics.js (`'2026: partial year, to March'`) | `partialLabelL()` | `2026 : année partielle, jusqu’en mars` / `2026: año parcial, hasta marzo` |
| other English text from metrics.js: `PRESETS[i].label`, `monthReading(...).notes`, provenance strings, verdict `override.label` | `tm(text)` | via `METRICS_TEXT` (copy.js translator fills it), else month names translated |
| a month name inside any other metrics.js string | `trMonthsIn(s)` | |
| capitalise the first letter (French and Spanish months are lowercase) | `cap(s)` | `Octobre 2026` |

Steps:
1. **`copy.js` translator, first, about 5 minutes.** Redefine the copy.js helpers so that they delegate:
   `export { X, num as NUM, pct as PCT, spct as SPCT, monthLong, ord as ORD } from './l10n.js';`
   Delete the old definitions. `F2 = (r) => dec(r, 2)`. Replace every `formatDecimal(…, 'en')` inside copy.js with
   `dec(…)`. Every file that imports `X`, `NUM`, `PCT` or `monthLong` from `./copy.js` is then localised without
   being touched.
2. **Every other file.** Import what you need from `./l10n.js` and replace the calls from the table in your own file
   only. Files that need this: `MapCard.jsx`, `MapPanel.jsx`, `Method.jsx`, `Picker.jsx`, `Verdict.jsx` (format
   calls with `'en'`), `App.jsx`, `Evidence.jsx` (`toLocaleString`), `CalPanel.jsx` (`MON`, `endLabel()`,
   `partialLabel()`, `monthReading` + `monthLong`), `App.jsx` (`MON3`, `endLabel()` in the data line),
   `MonthRow.jsx`, `Overview.jsx` and `Calendar.jsx` (`endLabel`, `partialLabel`). Find them with:
   `grep -n "'en'\|toLocaleString\|endLabel()\|partialLabel()\|MON\b\|MON3\|PRESETS\|\.label\b" i18n/<lang>/src/*.jsx`
3. **`exports.js` keeps `MONTHS.en` and its English text.** Do not localise it.
4. **`window.__fb.hero` in App.jsx stays built with `X(...)`.** Check (d) normalises the decimal comma. Do not
   replace it with a hand-written string.

Coordinates use `dec`: `47,5°–52,5° N · 80°–68° O`. West is `O` in both languages, and N, S and E stay the same.
Years are never grouped, so write them as `${y}`, never `num(y)`.

## When English changes after the fork
Only `src/metrics.js` is checked automatically. Re-copy it if it changed. For any other English fix made after the
fork, apply the same fix by hand to both copies: `diff -r src i18n/fr/src` shows what changed. Never re-fork over a
translated copy (`--force` replaces it).
