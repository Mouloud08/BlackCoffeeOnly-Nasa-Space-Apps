// Builds the EXPERIMENTAL seasonal preview: research/seasonal-app/src → dist/firebridge.seasonal-preview.html.
// Same approach as scripts/lang.mjs build: a temp build root (inside research/seasonal-app/) with a copy of build-win.mjs,
// package.json, the preview's src/ and docs/logo, plus directory junctions to ds, data, vendor, node_modules and tools-win.
// The junctions are removed (never deleted through) before the temp root is deleted. Nothing outside
// research/seasonal-app/ is written except the output file. The validated src/metrics.js must still be the validated one.
//   node research/seasonal-app/build.mjs [--keep]
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(HERE, '..', '..');
const fwd = (p) => p.split(path.sep).join('/');
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const keep = process.argv.includes('--keep');
const OUT = path.join(root, 'dist', 'firebridge.seasonal-preview.html');
const EN_HTML = path.join(root, 'dist', 'firebridge.html');
const SRC = path.join(HERE, 'src');
const R = path.join(HERE, '.tmp-build');
const LINKS = ['ds', 'data', 'vendor', 'node_modules', 'tools-win'];

if (!sha(path.join(root, 'src', 'metrics.js')).startsWith('779e3785')) { console.error('ERROR: src/metrics.js is not the validated module (sha256 779e3785…); refusing to build'); process.exit(1); }

const isLink = (p) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };
function unlinkJunction(p) {
  if (!isLink(p)) return;
  try { fs.unlinkSync(p); } catch { fs.rmdirSync(p); }
  if (isLink(p) || fs.existsSync(p)) throw new Error('could not remove junction ' + p);
}
function cleanRoot(dir) {
  if (!fs.existsSync(dir)) return;
  for (const l of LINKS) unlinkJunction(path.join(dir, l));
  const walk = (d) => { for (const e of fs.readdirSync(d)) { const p = path.join(d, e); if (isLink(p)) throw new Error('link left inside ' + dir + ': ' + p + ' (remove it by hand, NOT recursively)'); if (fs.statSync(p).isDirectory()) walk(p); } };
  walk(dir);
  fs.rmSync(dir, { recursive: true });
}
const dataBlocks = (html) => Object.fromEntries([...html.matchAll(/<script type="application\/json" id="(fb-[a-z]+)">([\s\S]*?)<\/script>/g)].map((m) => [m[1], m[2]]));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Static shell texts replaced in the built HTML (each must occur exactly once).
const SHELL = [
  ['<title>FireBridge · Is the rise in fire activity real, or is it the satellite?</title>', '<title>' + esc('FireBridge (seasonal preview) · experimental, not the validated figures') + '</title>'],
  [/<meta name="description" content="[^"]+">/, '<meta name="description" content="' + esc('EXPERIMENTAL preview of FireBridge with a seasonal correction (one VIIRS ÷ MODIS ratio per calendar month, shrunk toward the single ratio). Not the validated figures: see firebridge.html.') + '">'],
];

cleanRoot(R);
fs.mkdirSync(R, { recursive: true });
let failed = false;
try {
  for (const f of ['build-win.mjs', 'package.json']) fs.copyFileSync(path.join(root, f), path.join(R, f));
  fs.cpSync(SRC, path.join(R, 'src'), { recursive: true });
  fs.mkdirSync(path.join(R, 'docs'), { recursive: true });
  fs.cpSync(path.join(root, 'docs', 'logo'), path.join(R, 'docs', 'logo'), { recursive: true });
  for (const l of LINKS) fs.symlinkSync(path.join(root, l), path.join(R, l), 'junction');
  const tmp = path.join(R, 'out.html');
  const res = spawnSync(process.execPath, ['build-win.mjs'], { cwd: R, env: { ...process.env, FB_OUT: tmp }, encoding: 'utf8' });
  if (res.status !== 0) { process.stdout.write(res.stdout || ''); process.stderr.write(res.stderr || ''); throw new Error('build-win.mjs failed (exit ' + res.status + ')'); }
  let html = fs.readFileSync(tmp, 'utf8');
  for (const [pat, rep] of SHELL) {
    const n = typeof pat === 'string' ? html.split(pat).length - 1 : (html.match(new RegExp(pat.source, 'g')) || []).length;
    if (n !== 1) throw new Error('post-process: ' + pat + ' found ' + n + ' times (expected 1)');
    html = html.replace(pat, () => rep);
  }
  // The data must be the validated app's: the six embedded data blocks equal dist/firebridge.html's.
  if (!fs.existsSync(EN_HTML)) throw new Error('dist/firebridge.html missing: cannot compare the data blocks');
  const a = dataBlocks(html), b = dataBlocks(fs.readFileSync(EN_HTML, 'utf8'));
  const ka = Object.keys(a), diff = ka.filter((k) => a[k] !== b[k]);
  if (ka.length !== 6 || diff.length || ka.length !== Object.keys(b).length) throw new Error('data blocks differ from dist/firebridge.html: ' + (diff.join(', ') || 'block set (' + ka.length + ')'));
  console.log('data blocks identical to dist/firebridge.html (' + ka.length + ': ' + ka.join(', ') + ')');
  fs.writeFileSync(OUT, html);
  const line = (res.stdout || '').trim().split('\n').pop();
  console.log('build-win.mjs: ' + line);
  console.log('wrote ' + fwd(OUT) + ' · ' + (fs.statSync(OUT).size / 1e6).toFixed(2) + ' MB · preview metrics.js sha256 ' + sha(path.join(SRC, 'metrics.js')).slice(0, 12) + ' · validated src/metrics.js ' + sha(path.join(root, 'src', 'metrics.js')).slice(0, 12) + ' (untouched)');
} catch (e) {
  console.error('ERROR: ' + e.message);
  failed = true;
} finally {
  if (keep) { for (const l of LINKS) unlinkJunction(path.join(R, l)); console.log('kept ' + fwd(R) + ' (junctions removed)'); } else cleanRoot(R);
}
process.exitCode = failed ? 1 : 0;
