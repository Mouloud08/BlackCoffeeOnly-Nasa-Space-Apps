// Agency check for Argentina (run from the repo root: node scripts/check_argentina_national.mjs).
// Compares the national total of area affected by fires reported by the provinces and compiled by the Programa
// Nacional de Estadística Forestal (data/official/argentina_national_reports.json, originals in
// data/official/raw/argentina_national/) with FireBridge's raw and harmonized detection series for "All of Argentina",
// with the same method as scripts/check_argentina_official.mjs (mean 2012–Y ÷ mean 2003–2011, Spearman on common
// years) — but on the AVAILABLE years only: 2007 and 2008 are missing from the agency series, so every series is
// averaged over exactly the same years. Nothing in src/ is modified; tiles load like tools-win/selfcheck.mjs.
import fs from 'fs';
import zlib from 'zlib';
import { decodeCountry, computeZone, PRESETS, setRecordEnd, LAST } from '../src/metrics.js';
import { spearman } from '../src/official.js';
import { loadTiles } from '../tools-win/tiles.mjs';

const here = new URL('..', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '');
const LT = loadTiles(here); setRecordEnd(LT.end);
const AR = decodeCountry(LT.tiles.argentina);
const P = PRESETS.find((q) => q.id === 'argentina');
const Z = computeZone(AR, P.box);
const D = JSON.parse(fs.readFileSync(here + 'data/official/argentina_national_reports.json', 'utf8'));
const G = JSON.parse(fs.readFileSync(here + 'data/official/argentina_area_burned.json', 'utf8')).total;
const f = (x, d = 2) => (x == null || Number.isNaN(x) ? '—' : x.toFixed(d));
const fi = (x) => (x == null ? '—' : Math.round(x).toLocaleString('en-US'));
const yrs = (a, b) => { const o = []; for (let y = a; y <= b; y++) o.push(y); return o; };
const mean = (ys, g) => ys.reduce((s, y) => s + g(y), 0) / ys.length;

// 1. The spreadsheet values (2018–2024) must equal the downloaded original. Minimal .xlsx reader (zip + XML).
function xlsxSheets(file) {
  const b = fs.readFileSync(file), out = {};
  let e = b.length - 22; while (b.readUInt32LE(e) !== 0x06054b50) e--;
  let p = b.readUInt32LE(e + 16); const n = b.readUInt16LE(e + 10);
  for (let i = 0; i < n; i++) {
    const meth = b.readUInt16LE(p + 10), csz = b.readUInt32LE(p + 20), nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42);
    const name = b.toString('utf8', p + 46, p + 46 + nl);
    const ds = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28), raw = b.subarray(ds, ds + csz);
    out[name] = (meth === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
    p += 46 + nl + xl + cl;
  }
  return out;
}
function sheetRows(Z0, sheetName) {
  const strs = [...(Z0['xl/sharedStrings.xml'] || '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
  const rid = new RegExp('<sheet name="' + sheetName + '"[^>]*r:id="(rId\\d+)"').exec(Z0['xl/workbook.xml'])[1];
  const target = new RegExp('Id="' + rid + '"[^>]*Target="([^"]+)"').exec(Z0['xl/_rels/workbook.xml.rels'])[1];
  const x = Z0['xl/' + target.replace(/^\/?xl\//, '')], rows = [];
  for (const r of x.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {};
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] || ''); if (!v) continue;
      row[c[1]] = /t="s"/.test(c[2]) ? strs[+v[1]] : v[1];
    }
    rows.push(row);
  }
  return rows;
}
const XL = xlsxSheets(here + 'data/official/raw/argentina_national/cap_iv_incendios_2024_ed2025.xlsx');
const fig = sheetRows(XL, 'Figura 35').filter((r) => /^20\d\d$/.test(r.A));
const tot = sheetRows(XL, '4.2.1_Total pais');
const T = D.total, issues = [];
for (const r of fig) if (+r.A !== 2024 && Math.abs(+r.C - T[r.A]) > 1e-6) issues.push(r.A + ': xlsx ' + r.C + ' vs json ' + T[r.A]);
const t24 = tot.find((r) => r.A === 'Total');
if (Math.abs(+t24.C - T[2024]) > 1e-6) issues.push('2024 total row: xlsx ' + t24.C + ' vs json ' + T[2024]);
const zero24 = tot.filter((r) => r.A && r.B === '0' && r.C === '0').map((r) => r.A);
console.log('Record ends', LT.end, '| last complete year', LAST, '| zone', P.label, '| ratio', f(Z.ratio), '| grade', Z.grade, '| harmOK', Z.harmOK);
console.log('JSON vs raw spreadsheet (2018–2024):', fig.length, 'figure rows + 2024 total row,', issues.length ? 'MISMATCH ' + issues.join('; ') : 'identical');
console.log('2024 jurisdictions with 0 fires and 0 ha in the spreadsheet (not reported):', zero24.join(', '));
console.log('App headline (computeZone, 2012–' + LAST + ' ÷ 2003–2011): raw', f(Z.riseRaw), '| harmonized', f(Z.riseH));
console.log('\nSource:', D.publisher);
console.log('Units:', D.units, '| retrieved', D.retrieved, '| raw files in', D.rawDir);

// 2. Ratios on the available years only.
const has = (S, y) => S[y] != null && !Number.isNaN(S[y]);
function ratio(S, B, A) { return mean(A, (y) => S[y]) / mean(B, (y) => S[y]); }
const R = {}, H = {};
for (const y of yrs(2002, LAST)) { R[y] = Z.annRaw(y); H[y] = Z.annHarm(y); }
function check(label, a0, a1, b0 = 2003, b1 = 2011) {
  const B = yrs(b0, b1).filter((y) => has(T, y)), A = yrs(a0, a1).filter((y) => has(T, y)), all = B.concat(A);
  const lo = { ag: [], raw: [], harm: [], gwis: [] };
  for (const d of all) {
    const b = B.filter((y) => y !== d), a = A.filter((y) => y !== d);
    lo.ag.push(ratio(T, b, a)); lo.raw.push(ratio(R, b, a)); lo.harm.push(ratio(H, b, a));
    if (b.every((y) => has(G, y)) && a.every((y) => has(G, y))) lo.gwis.push(ratio(G, b, a));
  }
  const rg = (v) => (v.length ? f(Math.min(...v)) + '–' + f(Math.max(...v)) : '—');
  const gOK = all.every((y) => has(G, y));
  console.log('\n## ' + label);
  console.log('Before years (' + B.length + '):', B.join(' '), '| after years (' + A.length + '):', A.join(' '));
  console.log('Rise after ÷ before: agency', f(ratio(T, B, A)), '| raw', f(ratio(R, B, A)), '| harmonized', f(ratio(H, B, A)), '| GWIS burned area', gOK ? f(ratio(G, B, A)) : '—');
  console.log('Leave-one-year-out range: agency', rg(lo.ag), '| raw', rg(lo.raw), '| harmonized', rg(lo.harm), '| GWIS', gOK ? rg(lo.gwis) : '—');
  const cy = all.filter((y) => has(G, y));
  console.log('Spearman rho over the ' + all.length + ' years: agency vs harmonized', f(spearman(all.map((y) => T[y]), all.map((y) => H[y]))), '| agency vs raw', f(spearman(all.map((y) => T[y]), all.map((y) => R[y]))));
  console.log('Spearman rho over the ' + cy.length + ' years also in GWIS: agency vs GWIS', f(spearman(cy.map((y) => T[y]), cy.map((y) => G[y]))), '| GWIS vs harmonized', f(spearman(cy.map((y) => G[y]), cy.map((y) => H[y]))), '| GWIS vs raw', f(spearman(cy.map((y) => G[y]), cy.map((y) => R[y]))));
  return { B, A };
}

console.log('\n| year | agency area (ha) | source | GWIS burned area (ha) | raw cell-days | harmonized cell-days |');
console.log('|---|---|---|---|---|---|');
for (const y of yrs(2002, 2024)) console.log('| ' + [y, fi(T[y]), D.years[y].source || 'not found', fi(G[y]), fi(R[y]), fi(H[y])].join(' | ') + ' |');

const M = check('Main: 2012–2024 ÷ 2003–2011, available years (2007, 2008 missing)', 2012, 2024);
// Sensitivities: the dominant year, and the one publication that spans the 2012 switch with a jurisdiction table.
const no03 = { ...T }; delete no03[2003];
const B2 = M.B.filter((y) => y !== 2003);
console.log('\nWithout 2003: agency', f(ratio(no03, B2, M.A)), '| raw', f(ratio(R, B2, M.A)), '| harmonized', f(ratio(H, B2, M.A)), '| GWIS', f(ratio(G, B2, M.A)));
console.log('2003 alone is', f(T[2003] / M.B.reduce((s, y) => s + T[y], 0) * 100, 1) + ' % of the before-period agency total');
check('Single publication series (Series 2009-2015 + 2010-2016 tables): 2012–2016 ÷ 2009–2011', 2012, 2016, 2009, 2011);

// 3. Same reports, second national compilation (Servicio Nacional de Manejo del Fuego, CIAM dt_id 416, downloaded
// earlier tonight into data/official/raw/): how much two agency totals of the same years differ.
const dt = fs.readFileSync(here + 'data/official/raw/argentina_ciam_dt416_superficie_afectada_incendios_reportados_por_jurisdiccion.csv', 'utf8').trim().split(/\r?\n/).map((l) => l.split(';').map((s) => s.replace(/^﻿/, '').replace(/"/g, '').trim()));
const hdr = dt[0], trow = dt.find((r) => r[0] === 'Total');
if (!trow) throw new Error('dt416: no Total row; first cells: ' + dt.slice(0, 3).map((r) => JSON.stringify(r[0])).join(' '));
console.log('\n## Two agency compilations of the same years (PNEF yearbooks vs SNMF open data, dt_id 416)');
console.log('| year | PNEF (this series) | SNMF dt416 | PNEF ÷ SNMF | dt416 jurisdictions s/d |');
console.log('|---|---|---|---|---|');
for (let i = 1; i < hdr.length; i++) {
  const y = +(/\d{4}/.exec(hdr[i]) || [])[0]; if (!y || y > 2024) continue;
  const sd = dt.slice(1).filter((r) => r[0] !== 'Total' && r[i] === 's/d').map((r) => r[0]);
  console.log('| ' + [y, fi(T[y]), fi(+trow[i]), f(T[y] / +trow[i]), sd.join(', ') || '—'].join(' | ') + ' |');
}
console.log('\nspearman([1,2,3,4],[1,3,2,4]) =', f(spearman([1, 2, 3, 4], [1, 3, 2, 4]), 3), '(expected 0.800)');
