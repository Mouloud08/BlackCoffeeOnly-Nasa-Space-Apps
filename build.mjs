// Builds ONE self-contained HTML: React, DS components, fonts, CSS, tiles and Natural Earth outlines inlined. CSP connect-src 'none'.
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { outlines } from './tools/outlines.mjs';
import { loadTiles } from './tools/tiles.mjs';
import { scaleCss } from './tools/cssscale.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const nm = here + '/node_modules';
const ds = here + '/ds';
const r = await esbuild.build({
  entryPoints: [here + '/src/main.jsx'], bundle: true, format: 'iife', minify: true, write: false, target: ['es2019'],
  jsxFactory: 'window.React.createElement', jsxFragment: 'window.React.Fragment',
  loader: { '.jsx': 'jsx', '.js': 'jsx' }, define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'none', nodePaths: [nm],
});
let js = r.outputFiles[0].text;
if (/<\/script/i.test(js)) js = js.replace(/<\/script/gi, '<\\/script');
const b64 = (p) => fs.readFileSync(p).toString('base64');
const fv = nm + '/@fontsource-variable/radio-canada/files/';
const fonts = `
@font-face { font-family: 'Radio Canada'; font-style: normal; font-display: swap; font-weight: 300 700; src: url(data:font/woff2;base64,${b64(fv + 'radio-canada-latin-wght-normal.woff2')}) format('woff2-variations'); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD; }
@font-face { font-family: 'Radio Canada'; font-style: normal; font-display: swap; font-weight: 300 700; src: url(data:font/woff2;base64,${b64(fv + 'radio-canada-latin-ext-wght-normal.woff2')}) format('woff2-variations'); unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF; }
@font-face { font-family: 'Atelier Texte'; font-style: normal; font-display: swap; font-weight: 200 800; src: url(data:font/woff2;base64,${b64(ds + '/fonts/atelier-texte.woff2')}) format('woff2'); }
@font-face { font-family: 'DM Mono'; font-style: normal; font-display: swap; font-weight: 400; src: url(data:font/woff2;base64,${b64(ds + '/fonts/dm-mono-400.woff2')}) format('woff2'); }
@font-face { font-family: 'DM Mono'; font-style: normal; font-display: swap; font-weight: 500; src: url(data:font/woff2;base64,${b64(ds + '/fonts/dm-mono-500.woff2')}) format('woff2'); }
`;
const strip = (css) => css.replace(/@import[^;]+;\s*/g, '').replace(/@font-face\s*{[^}]*}\s*/g, '');
const tokens = strip(fs.readFileSync(ds + '/tokens.css', 'utf8'));
const comps = strip(fs.readFileSync(ds + '/components/bundle.css', 'utf8')).replace(/^body \{[^}]*\}\s*/m, '');
const css = fonts + scaleCss(tokens + '\n' + comps + '\n' + fs.readFileSync(here + '/src/app.css', 'utf8') + '\n' + fs.readFileSync(here + '/src/v5.css', 'utf8'));
// Tiles: the three series the metrics use (modis, aqua, snpp) and the country totals (NOAA-20 totals flag July 2024).
// 2026: data/2026/<country>.json (tools/build_2026_tiles.mjs) is merged when present; the record then ends at the last
// complete month common to both countries. Without it the record ends in December 2025.
const OUT = process.env.FB_OUT || here + '/dist/firebridge.html';
const { tiles: TILES, end: END } = loadTiles(here + '/');
const tile = (c) => {
  const D = TILES[c];
  const out = { v: D.v, country: D.country, i0: D.i0, j0: D.j0, rows: D.rows, cols: D.cols, bbox: D.bbox, coverage: D.coverage, series: { modis: D.series.modis, aqua: D.series.aqua, snpp: D.series.snpp, n20: D.series.n20 }, totals: D.totals };
  if (D.provisional && D.provisional.length) out.provisional = D.provisional;
  return JSON.stringify(out).replace(/</g, '\\u003c');
};
const record = JSON.stringify({ end: END });
const geo = JSON.stringify(outlines()).replace(/</g, '\\u003c');
// Optional real hotspot extracts (data/hotspots/<name>.csv, from scripts/fetch_firms_2026.mjs): offered as downloads.
const hsDir = here + '/data/hotspots';
const hotspots = {};
if (fs.existsSync(hsDir)) for (const f of fs.readdirSync(hsDir)) if (f.endsWith('.csv')) hotspots[f.replace(/\.csv$/, '')] = fs.readFileSync(hsDir + '/' + f, 'utf8');
const official = fs.readFileSync(here + '/data/official/canada_area_burned.json', 'utf8').replace(/</g, '\\u003c');
const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>FireBridge · Is the rise in fire activity real, or is it the satellite?</title>
<meta name="description" content="FireBridge joins NASA MODIS and VIIRS fire detections on one scale, 2001–2025, for any box in Canada or Argentina. Every figure is computed in the browser from NASA FIRMS 0.5° monthly tiles. Offline prototype.">
<script>(function(){var t=null;try{t=localStorage.getItem('fb-theme')}catch(e){}if(t!=='light'&&t!=='dark'){try{t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){t='dark'}}document.documentElement.setAttribute('data-theme',t)})()</script>
<style>${css}</style>
</head>
<body>
<noscript>FireBridge needs JavaScript.</noscript>
<div id="root"><div class="fb-app fb-boot" aria-busy="true"><header class="fb-top2"><div class="fb-brand"><span class="product-name">FireBridge</span></div></header><main class="fb-tabarea"><div class="fb-dashb is-strip"><section class="fb-verdict2 is-strip"><p class="fb-kicker">Is the rise real — or the satellite?</p></section><section class="fb-panel fb-mappanel"></section><section class="fb-panel fb-calpanel"></section></div></main></div></div>
<script type="application/json" id="fb-record">${record}</script>
<script type="application/json" id="fb-canada">${tile('canada')}</script>
<script type="application/json" id="fb-argentina">${tile('argentina')}</script>
<script type="application/json" id="fb-outlines">${geo}</script>
<script type="application/json" id="fb-official">${official}</script>
<script type="application/json" id="fb-hotspots">${JSON.stringify(hotspots).replace(/</g, "\\u003c")}</script>
<!-- The app runs as a module: after the document (and its inline data) is parsed; the static shell above paints first. -->
<script type="module">${js}</script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(path.relative(here, OUT), 'record ends', END, '| html bytes', html.length, 'js', js.length, 'css', css.length, 'outlines', geo.length);
