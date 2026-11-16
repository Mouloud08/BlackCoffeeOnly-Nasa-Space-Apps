// Client-side exports: harmonized series CSV with provenance, calendar SVG and PNG (same drawing), hotspot request text.
import { MONTHS, RATIO_NAMES, RATIO_STEPS, COUNT_STEPS, countClass, ratioClass } from '../ds/components/src/scale.js';
import { FIRST, SW, NM, LOW, LAST, VJ, isMODISMonth, END_KEY, PARTIAL, STATS_FROM, CELL, partialLabel, monthKey, monthIndex, monthLayer, cellKey } from './metrics.js';
// Exports stay English and byte-identical in every language: the English twin of boxText (decimal point, W for west),
// and the zone name the page passes is mapped back to its English form.
import { boxTextEn as boxText } from './copy.js';
import { METRICS_TEXT } from './l10n.js';
import { cssColor, downloadBlob } from './util.jsx';

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EN_OF = Object.fromEntries(Object.entries(METRICS_TEXT).filter(([k, v]) => v && !/\d/.test(k)).map(([k, v]) => [v, k]));
const zoneEn = (s) => (s == null ? s : EN_OF[s] || String(s).replace(/^Zona personalizada/, 'Custom zone').replace(/Canadá/g, 'Canada'));
export const fileStem = (zoneName, from, to) => 'firebridge_' + slugify(zoneEn(zoneName)) + '_' + from + '_' + to;

export function seriesCsv(Z, st, zoneName, reference) {
  zoneName = zoneEn(zoneName);
  const i0 = monthIndex(st.from), i1 = monthIndex(st.to);
  const b = Z.box, own = Z.gradeWhy === 'own';
  const L = [
    '# FireBridge harmonized monthly series (prototype), generated ' + new Date().toISOString().slice(0, 10) + ' in the browser',
    '# Zone: ' + zoneName + '; box S ' + b.s + ', N ' + b.n + ', W ' + b.w + ', E ' + b.e + ' (decimal degrees; 0.5 degree tiles, by cell centre)',
    '# Dates: ' + st.from + ' to ' + st.to + ' (last month available: ' + END_KEY + (PARTIAL ? '; ' + partialLabel() + ', in the rows but not in annual statistics' : '') + ')',
    '# Sources: NASA FIRMS country yearly files; MODIS Collection 6.1 MCD14ML (Terra+Aqua; Aqua only), VIIRS S-NPP 375 m VNP14IMGT; type 0 detections' + (LAST > 2025 || PARTIAL ? '; 2026 from the FIRMS area API (standard or near-real-time files)' : ''),
    '# Unit: cell-days (a ~1 km cell with >= 1 detection on a day); not fires, not burned area',
  ];
  if (Z.harmOK) {
    L.push('# Ratio VIIRS/MODIS: ' + Z.ratio.toFixed(4) + ' (' + (own ? 'own ratio of this box' : 'BORROWED from the wider area S ' + Z.borrowed.box.s + ', N ' + Z.borrowed.box.n + ', W ' + Z.borrowed.box.w + ', E ' + Z.borrowed.box.e + ' because this box has ' + Z.own.usable.length + ' usable overlap years') + '); pooled over all overlap years 2012-2025');
    L.push('# Leave-one-year-out ratio range ' + Z.rMin.toFixed(4) + ' to ' + Z.rMax.toFixed(4) + '; median error ' + (Z.medErr * 100).toFixed(1) + '% over ' + Z.usable.length + ' usable years (MODIS >= 50 cell-days)' + (own ? '' : ' of the wider area'));
  } else {
    L.push('# Ratio: not applied. Reliability C: too few detections here to bridge the two sensors reliably. Harmonized columns are empty.');
  }
  L.push('# Bridge quality ' + Z.grade + ' (grades the sensor bridge, not the trend; heuristic thresholds calibrated on Quebec only); ' + (reference ? 'Quebec reference zone (checked against direct counts)' : 'tile counts not re-checked against the FIRMS points for this box (done for the Quebec reference zones)'));
  if (Z.trend) L.push('# Trend (annual totals, 2012-' + LAST + ' vs 2003-2011): ' + Z.trend.rise.toFixed(3) + ', without ' + Z.trend.bigYear + ' ' + Z.trend.without.toFixed(3) + ', year-resampling 90% range ' + Z.trend.lo.toFixed(3) + '-' + Z.trend.hi.toFixed(3) + ' (2000 draws), status ' + Z.trend.status);
  L.push('# The ratio is always estimated on the full overlap 2012-' + LAST + ', whatever the date range');
  if (Z.cont && Z.cont.length) L.push('# Months without S-NPP (' + Z.cont.map((g) => g.key).join(', ') + '): viirs_snpp = NOAA-20 / ' + Z.contFactor.toFixed(4) + ' (' + (Z.contFactorFrom === 'box' ? 'this box' : 'country-wide') + ' NOAA-20/S-NPP, 2018-04 onwards); Computed: NOAA-20 rescaled to S-NPP');
  if (Z.breaks) L.push('# Calendar colour classes (lower bounds, cell-days per month; fitted to this zone, same for raw and harmonized): ' + Z.breaks.join(', '));
  L.push('# computed = yes when the harmonized value is MODIS x ratio (before 2012); no when it is measured VIIRS');
  if (Z.harmOK) L.push('# harmonized_ratio_min / _max = MODIS x the lowest / highest leave-one-year-out ratio: the spread of the RATIO only, not an interval on the month. Month-by-month error of the bridge: ' + (Z.monthly ? 'median ' + (Z.monthly.medErr * 100).toFixed(0) + '% over ' + Z.monthly.n + ' overlap months with both sensors >= 30 cell-days' : 'not measurable here (too few overlap months with both sensors >= 30 cell-days)') + '; months outside the fire season can be off more (see the ratio by month in Method)');
  L.push('# 2012-01 is computed (MODIS): the S-NPP record starts on 20 January 2012');
  L.push('month,sensor,modis,aqua_only,viirs_snpp,raw,harmonized,harmonized_ratio_min,harmonized_ratio_max,typical_month,anomaly,computed,note');
  for (let i = i0; i <= i1; i++) {
    const y = FIRST + Math.floor(i / 12), pre = isMODISMonth(i), typ = Z.typical[i % 12];
    const h = Z.harmOK ? Z.harm[i] : null;
    L.push([monthKey(i), pre ? 'MODIS' : Z.contSet && Z.contSet.has(i) ? 'NOAA-20 rescaled' : 'VIIRS', Z.S.modis[i], Z.S.aqua[i], pre && i !== VJ ? '' : Z.S.snpp[i], Z.raw[i],
      h == null ? '' : h.toFixed(1), Z.harmOK ? Z.lo[i].toFixed(1) : '', Z.harmOK ? Z.hi[i].toFixed(1) : '',
      Z.harmOK ? typ.toFixed(1) : '', Z.harmOK && typ >= LOW ? (h / typ).toFixed(3) : '', pre && Z.harmOK ? 'yes' : 'no', [y < 2003 ? 'before 2003: partial MODIS, not used in statistics' : '', i === VJ ? 'Computed: S-NPP record starts 20 Jan 2012' : '', Z.gapSet && Z.gapSet.has(i) ? 'NOAA-20 used: S-NPP outage' : '', Z.contSet && Z.contSet.has(i) ? 'Computed: NOAA-20 rescaled to S-NPP' : '', Z.provSet && Z.provSet.has(i) ? 'provisional, not filtered for non-fire sources' : '', PARTIAL && y === PARTIAL.year ? 'partial year, not in annual statistics' : ''].filter(Boolean).join('; ')].map((x) => (/[",]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : x)).join(','));
  }
  return L.join('\n') + '\n';
}

// The calendar as a standalone SVG, colours resolved from the current theme.
// Page fonts as @font-face rules (data URLs), so the PNG renders with them.
function pageFontCss() {
  let out = '';
  try { for (const sh of document.styleSheets) for (const r of sh.cssRules) if (r.type === 5 && /Radio Canada/.test(r.cssText)) out += r.cssText; } catch (e) { /* no access */ }
  return out;
}
export function calendarSvg(cd, view, zoneName, Z, selKey, embedFonts = false) {
  zoneName = zoneEn(zoneName);
  const v = (n) => cssColor('--' + n);
  // Canvas fitted to the columns shown (a short date range no longer leaves most of it blank); at least 1000 px wide
  // so the title, the legend and the provenance line fit.
  const ys = cd.years, gx = 56, gy = 84, gap = 3;
  const cw = Math.min(40, Math.floor((1280 - gx - 32) / ys.length) - gap), chh = 22;
  const W = Math.max(1000, Math.min(1280, gx + ys.length * (cw + gap) + 32));
  const H = gy + 12 * (chh + gap) + 104;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const mode = view === 'raw' ? 'raw' : 'harmonized';
  const font = "'Radio Canada', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + font + '">';
  s += embedFonts ? '<style>' + pageFontCss() + '</style>' : '<!-- Fonts are not embedded: text uses Radio Canada if installed, otherwise a sans-serif fallback. -->';
  s += '<defs><pattern id="era" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" fill="' + v('surface') + '" fill-opacity="0.55"/></pattern></defs>';
  s += '<rect width="100%" height="100%" fill="' + v('surface') + '"/>';
  s += '<text x="' + gx + '" y="32" font-size="18" font-weight="600" fill="' + v('ink') + '">' + esc('Burning calendar · ' + zoneName + ' · ' + (view === 'anomaly' ? 'anomaly vs a typical month' : mode + ' cell-days per month')) + '</text>';
  s += '<text x="' + gx + '" y="56" font-size="13" fill="' + v('ink-2') + '">' + esc(boxText(Z.box) + ' · ' + ys[0] + '–' + ys[ys.length - 1] + (Z.harmOK && view !== 'raw' ? ' · MODIS × ' + Z.ratio.toFixed(2) + ' to Jan 2012 (computed), VIIRS from Feb 2012 (real)' : ' · MODIS to Jan 2012, VIIRS from Feb 2012, not corrected') + ' · bridge quality ' + Z.grade) + '</text>';
  for (let m = 1; m <= 12; m++) {
    const y = gy + (m - 1) * (chh + gap);
    s += '<text x="' + (gx - 8) + '" y="' + (y + chh - 4) + '" font-size="12" text-anchor="end" fill="' + v('ink-3') + '">' + MONTHS.en[m - 1] + '</text>';
    ys.forEach((yr, k) => {
      const c = cd.byKey[yr + '-' + String(m).padStart(2, '0')];
      const x = gx + k * (cw + gap);
      let fill = v('sunken'), dot = false;
      if (c.status === 'future') { s += '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + chh + '" rx="3" fill="none" stroke="' + v('rule') + '"><title>' + c.key + ': not yet available</title></rect>'; return; }
      if (view === 'anomaly') { if (c.low || c.ratio == null) dot = true; else fill = v(RATIO_NAMES[ratioClass(c.ratio)]); }
      else { const kk = countClass(mode === 'raw' ? c.raw : c.harmonized, 'log', null, cd.breaks); if (kk >= 0) fill = v('seq-' + kk); }
      s += '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + chh + '" rx="3" fill="' + fill + '"' + (c.key === selKey ? ' stroke="' + v('ink') + '" stroke-width="2"' : '') + '><title>' + c.key + ': ' + Math.round(mode === 'raw' ? c.raw : c.harmonized) + ' cell-days' + (yr < SW && mode !== 'raw' ? ' (computed)' : '') + '</title></rect>';
      if (dot) s += '<circle cx="' + (x + cw / 2) + '" cy="' + (y + chh / 2) + '" r="1.6" fill="' + v('ink-3') + '"/>';
      if (yr < 2003) s += '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + chh + '" rx="3" fill="url(#era)"/>';
    });
  }
  const sx = ys.indexOf(SW);
  if (sx > 0) { const x = gx + sx * (cw + gap) - 1; s += '<line x1="' + x + '" x2="' + x + '" y1="' + (gy - 10) + '" y2="' + (gy + 12 * (chh + gap)) + '" stroke="' + v('ink-3') + '" stroke-width="1.5" stroke-dasharray="3 3"/><text x="' + (x + 5) + '" y="' + (gy - 12) + '" font-size="12" font-weight="600" fill="' + v('ink') + '">2012 · MODIS → VIIRS</text>'; }
  ys.forEach((yr, k) => { if (yr % 5 === 0 || k === 0 || k === ys.length - 1) s += '<text x="' + (gx + k * (cw + gap) + cw / 2) + '" y="' + (gy + 12 * (chh + gap) + 14) + '" font-size="12" text-anchor="middle" fill="' + v('ink-3') + '">' + yr + '</text>'; });
  const ly = gy + 12 * (chh + gap) + 34;
  if (view === 'anomaly') {
    RATIO_NAMES.forEach((nm, k) => { s += '<rect x="' + (gx + k * 30) + '" y="' + ly + '" width="28" height="10" rx="2" fill="' + v(nm) + '"/>'; });
    RATIO_STEPS.forEach((t, k) => { s += '<text x="' + (gx + (k + 1) * 30 - 1) + '" y="' + (ly + 24) + '" font-size="12" text-anchor="middle" fill="' + v('ink-3') + '">' + t + '</text>'; });
    s += '<text x="' + (gx + 7 * 30 + 12) + '" y="' + (ly + 9) + '" font-size="12" fill="' + v('ink-2') + '">× a typical month (median of the same month, 2003–' + LAST + '); dot: too few to compare</text>';
  } else {
    for (let k = 0; k < 9; k++) s += '<rect x="' + (gx + k * 44) + '" y="' + ly + '" width="42" height="10" rx="2" fill="' + v('seq-' + k) + '"/>';
    (cd.breaks || COUNT_STEPS).forEach((t, k) => { s += '<text x="' + (gx + k * 44 + (k ? -1 : 0)) + '" y="' + (ly + 24) + '" font-size="12" text-anchor="' + (k ? 'middle' : 'start') + '" fill="' + v('ink-3') + '">' + (t >= 1000 ? t / 1000 + 'k' : t) + '</text>'; });
    s += '<text x="' + (gx + 9 * 44 + 12) + '" y="' + (ly + 9) + '" font-size="12" fill="' + v('ink-2') + '">cell-days per month, log scale, classes fitted to this zone</text>';
    s += '<text x="' + gx + '" y="' + (ly + 42) + '" font-size="12" fill="' + v('ink-2') + '">Hatched: before 2003, partial MODIS coverage, not used in statistics. January 2012 is MODIS: the S-NPP record starts on 20 January 2012.</text>';
  }
  s += '<text x="' + gx + '" y="' + (H - 12) + '" font-size="12" fill="' + v('ink-3') + '">' + esc((view === 'raw' ? 'Real' : 'Computed') + ' · Source: NASA FIRMS · MCD14ML · VNP14IMGT · FireBridge prototype, generated ' + new Date().toISOString().slice(0, 10)) + '</text>';
  return { svg: s + '</svg>', W, H };
}
export function downloadSvg(name, svg) { downloadBlob(name, new Blob([svg], { type: 'image/svg+xml' })); }
// PNG: the same SVG rendered to a 2× canvas.
export function downloadPng(name, { svg, W, H }) {
  return new Promise((res) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
      const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob((b) => { if (b) downloadBlob(name, b); res(!!b); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(false); };
    img.src = url;
  });
}
export function hotspotText(box, from, to) {
  const y = +to.slice(0, 4), m = +to.slice(5, 7);
  const last = to + '-' + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0');
  return 'Area (west,south,east,north): ' + [box.w, box.s, box.e, box.n].join(',') + '\nDates: ' + from + '-01 to ' + last + '\nProducts: MODIS Collection 6.1 (MCD14ML, Terra + Aqua); VIIRS S-NPP 375 m (VNP14IMGT); VIIRS NOAA-20 375 m (VJ114IMGT)\nSource: NASA FIRMS archive download (firms.modaps.eosdis.nasa.gov)';
}
export { NM };

// Map layer CSV (SPEC_V3 §5): one row per 0.5° place with detections, every layer's value, with a provenance header.
export function mapCsv(S, st, view, selKey, C) {
  const ML = C ? monthLayer(C, S, monthIndex(selKey)) : null, s = S.summary;
  const L = [
    '# FireBridge map, ' + (st.country === 'canada' ? 'Canada' : 'Argentina') + ' (prototype), generated ' + new Date().toISOString().slice(0, 10) + ' in the browser',
    '# Source: NASA FIRMS country yearly files; MODIS C6.1 MCD14ML, VIIRS S-NPP VNP14IMGT (S-NPP outage months on NOAA-20); type 0 detections; unit cell-days',
    '# Places: 0.5 degree cells (lat, lon = south-west corner); period ' + STATS_FROM + '-' + LAST + ' (complete years)',
    '# Local ratio: pooled VIIRS / MODIS over ' + SW + '-' + LAST + ' in the 3x3 cells around (own3); 5x5 if either sensor has < ' + CELL.need + ' cell-days (own5); else the country ratio ' + S.countryRatio.toFixed(4) + ' (country)',
    '# Eligible: >= ' + CELL.eligible + ' harmonized cell-days over the period; record year = year with the largest annual total (ties: earliest); era since = 2012 or later',
    '# depends_on_ratio = the harmonized era changes when the local ratio is multiplied by 0.85 or 1.15',
    '# not_bridged = local ratio above 4x (unusual for vegetation fire; possible non-fire heat sources, not verified): not counted',
    '# Counters (eligible places with ratio <= 4x): ' + s.n + ' (' + s.excludedHigh + ' not bridged); record since 2012 raw ' + (s.sinceRaw * 100).toFixed(1) + '%, harmonized ' + (s.sinceHarm * 100).toFixed(1) + '%, MODIS alone ' + (s.sinceModis * 100).toFixed(1) + '%; depends on the ratio ' + (s.depends * 100).toFixed(1) + '%',
    '# Chance ranges (5th-95th percentile, ' + S.perms.length + ' seeded permutations of the year labels, the same for every place): raw ' + (s.chanceRaw.lo * 100).toFixed(1) + '-' + (s.chanceRaw.hi * 100).toFixed(1) + '%, harmonized ' + (s.chanceHarm.lo * 100).toFixed(1) + '-' + (s.chanceHarm.hi * 100).toFixed(1) + '%, MODIS alone ' + (s.chanceModis.lo * 100).toFixed(1) + '-' + (s.chanceModis.hi * 100).toFixed(1) + '%',
    '# January 2012 counts as a MODIS month (the S-NPP record starts on 20 January 2012)',
    '# A record is one year, not a trend. this_month = rank of ' + selKey + ' among the same month of ' + STATS_FROM + '-' + LAST + ' (harmonized): record, top3, active, none',
    '# Map view when exported: layer ' + st.layer + ', ' + (view === 'raw' ? 'raw' : 'harmonized'),
    'lat_south,lon_west,eligible,not_bridged,cumulative_harmonized,record_year_raw,record_year_harmonized,record_year_modis_alone,era_raw,era_harmonized,depends_on_ratio,local_ratio,ratio_case,mean_viirs_per_year_2012_' + LAST + ',this_month_' + selKey,
  ];
  for (const c of S.cells) {
    L.push([c.lat, c.lon, c.eligible ? 'yes' : 'no', c.high ? 'yes' : 'no', c.cum.toFixed(1), c.eligible ? c.recRaw : '', c.eligible ? c.recHarm : '', c.eligible ? c.recModis : '', c.eligible ? c.eraRaw : '', c.eligible ? c.eraHarm : '', c.eligible ? (c.depends ? 'yes' : 'no') : '', c.ratio.toFixed(3), c.rcase, c.det.toFixed(1), ML && c.claim ? ML.cls.get(cellKey(c.i, c.j)) || '' : ''].join(','));
  }
  return L.join('\n') + '\n';
}
