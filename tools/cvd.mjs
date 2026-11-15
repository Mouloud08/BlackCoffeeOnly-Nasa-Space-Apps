// Colour-vision check (SPEC_V3 §6c): simulate deuteranopia, protanopia and tritanopia (Machado et al. 2009, severity 1)
// on the DS ramps as resolved in each theme, and check that adjacent classes stay apart in lightness (CIELAB L*) and
// in colour (ΔE76). Prints a table; exits 1 if a ramp fails. Thresholds: ΔL* ≥ 4 between adjacent classes, monotonic.
import fs from 'fs';
const here = new URL('..', import.meta.url).pathname;
const css = fs.readFileSync(here + 'ds/tokens.css', 'utf8') + '\n' + fs.readFileSync(here + 'src/app.css', 'utf8') + '\n' + fs.readFileSync(here + 'src/v5.css', 'utf8');
const block = (sel) => { const out = {}; const re = new RegExp(sel.replace(/[[\]"]/g, (m) => '\\' + m) + '\\s*{([^}]*)}', 'g'); let m; while ((m = re.exec(css))) for (const d of m[1].split(';')) { const k = d.match(/^\s*(--[\w-]+)\s*:\s*(#[0-9a-f]{6}|var\(--[\w-]+\))\s*$/i); if (k) out[k[1]] = k[2]; } return out; };
const themes = { dark: block(':root, [data-theme="dark"]'), light: block('[data-theme="light"]') };
// Resolve var(--x) references (the V5 record tokens point at DS tokens).
for (const t of Object.values(themes)) for (const k of Object.keys(t)) { let v = t[k], n = 0; while (/^var\(/.test(v) && n++ < 5) v = t[v.slice(4, -1)]; t[k] = v; }
const M = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const hex = (h) => [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
const lab = ([r, g, b]) => {
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X / 0.95047), fy = f(Y), fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
const sim = (rgb, m) => m.map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
const ramps = (process.argv[2] || 'seq,civ,gray').split(',');
let fail = 0;
for (const th of ['light', 'dark']) for (const r of ramps) {
  const cols = Array.from({ length: 9 }, (_, k) => themes[th]['--' + r + '-' + k]);
  if (cols.some((c) => !c)) continue;
  for (const [name, m] of Object.entries(M)) {
    const L = cols.map((c) => lab(sim(hex(c), m)));
    const dL = L.slice(1).map((x, k) => x[0] - L[k][0]);
    const dE = L.slice(1).map((x, k) => Math.hypot(x[0] - L[k][0], x[1] - L[k][1], x[2] - L[k][2]));
    const mono = dL.every((d) => d > 0) || dL.every((d) => d < 0);
    const minL = Math.min(...dL.map(Math.abs)), minE = Math.min(...dE);
    const ok = mono && minL >= 4;
    if (!ok) fail++;
    console.log(th.padEnd(5), r.padEnd(4), name.padEnd(12), ok ? 'PASS' : 'FAIL', 'monotonic', mono, 'min ΔL*', minL.toFixed(1), 'min ΔE', minE.toFixed(1), 'L*', L.map((x) => x[0].toFixed(0)).join(' '));
  }
}
// Pairs used on the map (SPEC_V5 §2: record-years colours not reusing the calendar hues): record before / since 2012,
// each theme, resolved from --rec-before / --rec-since in src/v5.css; must differ by ≥ 25 L* under every simulation.
const PAIRS = { light: ['--rec-before', '--rec-since'], dark: ['--rec-before', '--rec-since'] };
for (const th of ['light', 'dark']) console.log(th, 'record pair', PAIRS[th].map((t) => t + ' = ' + themes[th][t]).join(', '));
for (const th of ['light', 'dark']) for (const [name, m] of Object.entries(M)) {
  const [a, b] = PAIRS[th].map((t) => lab(sim(hex(themes[th][t]), m)));
  const dL = Math.abs(a[0] - b[0]), dE = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), ok = dL >= 25;
  if (!ok) fail++;
  console.log(th.padEnd(5), 'record before/since', PAIRS[th].join(' / '), name.padEnd(12), ok ? 'PASS' : 'FAIL', 'ΔL*', dL.toFixed(1), 'ΔE', dE.toFixed(1), '(grayscale = ΔL*)');
}
// Each record colour against the map land it sits on (≥ 15 L* in normal vision, so it reads in grayscale too).
for (const th of ['light', 'dark']) { const land = themes[th]['--map-land']; if (!land) continue; for (const t of PAIRS[th]) { const d = Math.abs(lab(hex(themes[th][t]))[0] - lab(hex(land))[0]); const ok = d >= 15; if (!ok) fail++; console.log(th.padEnd(5), t, 'vs --map-land', land, ok ? 'PASS' : 'FAIL', 'ΔL*', d.toFixed(1)); } }
// Status trio (V5 verdict pills): AA (4.5:1) text on tint in each theme; success vs warning tints compared under each
// simulation (informative: the icon and the words carry the meaning, so a small hue-only difference is allowed).
const Ylum = (h) => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [Ylum(a), Ylum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
for (const th of ['light', 'dark']) {
  for (const tone of ['success', 'warning', 'neutral']) {
    const ink = themes[th]['--st-' + tone + '-ink'], bg = themes[th]['--st-' + tone + '-bg'];
    if (!ink || !bg) { console.log(th, tone, 'MISSING'); fail++; continue; }
    const c = ratio(ink, bg), ok = c >= 4.5; if (!ok) fail++;
    console.log(th.padEnd(5), 'status', tone.padEnd(8), 'ink', ink, 'on', bg, ok ? 'PASS' : 'FAIL', 'contrast', c.toFixed(2));
  }
  for (const [name, m] of Object.entries(M)) {
    const [a, b] = ['--st-success-edge', '--st-warning-edge'].map((t) => lab(sim(hex(themes[th][t]), m)));
    console.log(th.padEnd(5), 'status success/warning edges', name.padEnd(12), 'ΔL*', Math.abs(a[0] - b[0]).toFixed(1), 'ΔE', Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]).toFixed(1), '(icon + words carry the meaning)');
  }
}
process.exit(fail ? 1 : 0);
