// Windows port WITHOUT touching tools/ or build.mjs: generates patched copies
//   tools-win/*.mjs   (from tools/*.mjs)   and   build-win.mjs   (from build.mjs)
// The copies are functionally identical; only platform plumbing changes (each patch is a no-op on Linux), plus two
// test expectations that follow the record end instead of assuming December 2025 (identical for that record), and
// perf.mjs writing its JSON next to itself (tools-win/) so that tools/ stays untouched, and (patches 11–13) three test
// expectations that follow the 15 November UI (guide hidden by default, "One month" layer label, "× more seen" legend).
// Re-run after tools/ or build.mjs are replaced (e.g. version 6.2.1):  node scripts/winport.mjs
// Then use:  node build-win.mjs   and   node tools-win/<check>.mjs   (FB_HTML=C:/path/file.html to target a file).
// A patch that matches nothing, or Linux-only plumbing left in a generated file, is reported (the latter: exit 1).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'tools'), dst = path.join(root, 'tools-win');
const CHROME = "process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome')";
const HERE = "new URL('..', import.meta.url).pathname.replace(/^\\/(?=[A-Za-z]:)/, '')";
const PATCHES = [
  // 1. file URL pathname is "/C:/..." on Windows: drop the slash before the drive letter.
  ['drive-letter', "new URL('..', import.meta.url).pathname", HERE],
  // 2. file URLs need three slashes before a drive letter.
  ['file-url', "'file://' + (", "(process.platform === 'win32' ? 'file:///' : 'file://') + ("],
  // 3. Chrome location (CHROME environment variable wins).
  ['chrome', "executablePath: '/usr/bin/google-chrome'", 'executablePath: ' + CHROME],
  // 4. A dynamic import needs a file URL, not a drive path.
  ['import-url', "import(here + 'vendor/node_modules/topojson-client/src/index.js')", "import(new URL('../vendor/node_modules/topojson-client/src/index.js', import.meta.url).href)"],
  // 5. Chrome wants a native download folder.
  ['download-dir', 'downloadPath: dl }', "downloadPath: process.platform === 'win32' ? dl.split('/').join('\\\\') : dl }"],
  // 6. Test expectation tied to a record ending in 2025 ("Last 5 years" = 2021): follow the record end instead.
  ['last5-expectation', "ok((await hash(p)).includes('f=2021-01') && /2021/.test(await txt(p, '.fb-rangebtn')), 'range: \"Last 5 years\" preset', await txt(p, '.fb-rangebtn'));",
    "const y5 = String((await p.evaluate(() => +JSON.parse(document.getElementById('fb-record').textContent).end.slice(0, 4))) - 4); ok((await hash(p)).includes('f=' + y5 + '-01') && (await txt(p, '.fb-rangebtn')).includes(y5), 'range: \"Last 5 years\" preset', await txt(p, '.fb-rangebtn'));"],
  // 7. Test expectation tied to a record ending in December 2025 (To year 2025, no month disabled): with a record
  //    ending in another month it would pass without testing anything. Use the record's last year and month.
  ['record-end-months-a', 'await setSel(3, 2025); await sleep(150);',
    "const [recY, recM] = await p.evaluate(() => JSON.parse(document.getElementById('fb-record').textContent).end.split('-').map(Number)); await setSel(3, recY); await sleep(150);"],
  ['record-end-months-b', "ok(await p.evaluate(() => [...document.querySelectorAll('.fb-range2 select')[2].options].every((x) => x.disabled === (+x.value > 12))), 'range: months after the record end disabled in its last year (record ends Dec)');",
    "ok(await p.evaluate((recM) => [...document.querySelectorAll('.fb-range2 select')[2].options].every((x) => x.disabled === (+x.value > recM)), recM), 'range: months after the record end disabled in its last year (record ends month ' + recM + ')');"],
  // 8. Defaults and outputs under the original work tree /home/claude/v62/ (barcheck, exportshot, flash): the repo
  //    root on Windows. Must come after patch 1 (its replacement contains patch 1's pattern).
  ['v62-paths', "'/home/claude/v62/", "(process.platform === 'win32' ? " + HERE + " : '/home/claude/v62/') + '"],
  // 9. perf.mjs writes tools/perf.<n>x.json: the copy writes tools-win/ (tools/ stays untouched).
  ['perf-output', "here + 'tools/perf.'", "here + 'tools-win/perf.'"],
  // 10. scdiff.sh runs the self-check: run the Windows copy.
  ['scdiff-selfcheck', 'node tools/selfcheck.mjs', 'node tools-win/selfcheck.mjs'],
  // 11–13. Test expectations tied to the 15 November UI (labels and defaults changed in src/, not in tools/):
  // 11. the first-visit guide is hidden by default since 6.3: the page that tests it opens with guide=1 from the start
  //     (a fresh page). Setting location.hash on the live page and reloading does not work: the app answers the
  //     hashchange by rewriting its canonical hash (guide is not part of the state), so guide=1 is gone before the reload.
  ['guide-default-hidden', "page('z=canada');\n  ok(!!(await p.$('.fb-guide')), 'guide shown on the dashboard (no anim=0)');",
    "page('z=canada&guide=1');\n  ok(!!(await p.$('.fb-guide')), 'guide shown on the dashboard with guide=1 (hidden by default since 6.3)');"],
  // 12. map layer "This month" is labelled "One month" (id l=month unchanged).
  ['layer-label-one-month', "=== 'This month' &&", "=== 'One month' &&"],
  // 13. the Sensor effect legend ends "× more seen" (was "× too high"): coherence matches the legend to the layer by it.
  ['coherence-ratio-legend', "ratio: 'too high'", "ratio: 'more seen'"],
];
// Linux-only plumbing that must not survive in a generated file (a pattern above stopped matching in that file).
const LEFT = [
  ['Chrome path', (l) => (l.match(/\/usr\/bin\/google-chrome/g) || []).length > l.split(CHROME).length - 1],
  ['file:// + drive path', (l) => (l.match(/file:\/\/['"`]/g) || []).length > l.split("(process.platform === 'win32' ? 'file:///' : 'file://')").length - 1],
  ['URL pathname with a drive slash', (l) => (l.match(/\.pathname/g) || []).length > l.split(HERE).length - 1],
  ['dynamic import of a path', (l) => /import\(here\b/.test(l)],
  ['download folder', (l) => /downloadPath: dl\b/.test(l)],
  ['/home/claude path', (l) => (l.match(/\/home\/claude\//g) || []).length > l.split(" : '/home/claude/v62/') + '").length - 1],
  ['record-2025 expectation', (l) => l.includes("'f=2021-01'") || l.includes('setSel(3, 2025)')],
  ['write into tools/', (l) => l.includes("here + 'tools/")],
  ['runs tools/ selfcheck', (l) => l.includes('node tools/selfcheck.mjs')],
  ['old UI label in a test', (l) => l.includes("=== 'This month'") || l.includes("ratio: 'too high'") || l.includes("'guide shown on the dashboard (no anim=0)'")],
];
fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(dst, { recursive: true });
const counts = Object.fromEntries(PATCHES.map((p) => [p[0], 0]));
const left = [];
let files = 0;
for (const f of fs.readdirSync(src)) {
  const p = path.join(src, f);
  if (!fs.statSync(p).isFile()) continue;
  if (!f.endsWith('.mjs') && !f.endsWith('.sh')) { fs.copyFileSync(p, path.join(dst, f)); continue; }
  let s = fs.readFileSync(p, 'utf8');
  for (const [k, a, b] of PATCHES) { const n = s.split(a).length - 1; if (n) { s = s.split(a).join(b); counts[k] += n; } }
  s.split('\n').forEach((l, i) => { for (const [what, bad] of LEFT) if (bad(l)) left.push(f + ':' + (i + 1) + ' ' + what); });
  fs.writeFileSync(path.join(dst, f), s); files++;
}
let b = fs.readFileSync(path.join(root, 'build.mjs'), 'utf8');
const nb = b.split("'./tools/").length - 1;
b = b.split("'./tools/").join("'./tools-win/");
fs.writeFileSync(path.join(root, 'build-win.mjs'), '// GENERATED by scripts/winport.mjs from build.mjs (imports redirected to tools-win/). Do not edit.\n' + b);
console.log('tools-win:', files, 'scripts | patches applied:', JSON.stringify(counts), '| build-win.mjs: imports redirected', nb);
for (const [k, n] of Object.entries(counts)) if (!n) console.log('  WARNING: patch "' + k + '" matched nothing (the tools changed: check this pattern)');
if (!nb) console.log('  WARNING: build.mjs imports nothing from ./tools/ (build-win.mjs is a plain copy: check it)');
if (left.length) { console.log('  ERROR: Linux-only plumbing left in generated files (a pattern stopped matching there):'); for (const x of left) console.log('    ' + x); process.exitCode = 1; }
