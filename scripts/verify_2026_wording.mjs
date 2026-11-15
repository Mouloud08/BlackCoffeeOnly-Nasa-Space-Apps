// Second pass of the step-3 controls: partial-year wording (calendar notes, Method tab, series CSV), NOAA-20 rescaled
// months, provisional wording, and before/after screenshots of the Detections layer.
// Usage: node scripts/verify_2026_wording.mjs <new.html> <backup.html>
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.length < 4) { console.error('Usage: node scripts/verify_2026_wording.mjs <new.html> <backup.html>'); process.exit(2); }
const NEW = path.resolve(process.argv[2]), OLD = path.resolve(process.argv[3]);
const shots = path.join(root, 'shots', 'verify-2026'); fs.mkdirSync(shots, { recursive: true });
const chrome = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const open = async (file, hash) => { const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.goto(pathToFileURL(file).href + '#' + hash, { waitUntil: 'load' }); await p.waitForFunction(() => window.__fb && window.__fb.pending === false, { timeout: 30000 }).catch(() => {}); await sleep(2200); return p; };
const all = (p, re) => p.evaluate((src) => [...new Set((document.getElementById('root').textContent.match(new RegExp(src, 'g')) || []))].slice(0, 8), re);
const readout = (p) => p.evaluate(() => { const c = [...document.querySelectorAll('.fb-calpanel p, .fb-calpanel div')].map((e) => e.innerText || '').filter((t) => /^\w+ 20\d\d: /.test(t.trim()) && t.length < 400); return c.length ? c[c.length - 1].replace(/\s+/g, ' ').trim() : null; });

for (const c of ['canada', 'argentina']) {
  let p = await open(NEW, `tab=dash&z=${c}&anim=0`);
  console.log(`\n== ${c}: calendar notes (DOM): partial ->`, JSON.stringify(await all(p, '20\\d\\d: partial year[^.]*\\.')), '| outage ->', JSON.stringify(await all(p, 'S-NPP outage months use NOAA-20[^.]*\\.')));
  await p.close();
  for (const m of ['2026-03', '2026-04', '2026-06', '2026-07', '2026-08', '2026-09']) {
    p = await open(NEW, `tab=dash&z=${c}&m=${m}&anim=0`);
    console.log(`  ${m}:`, await readout(p));
    if (m === '2026-07') await p.screenshot({ path: path.join(shots, `dash-${c}-m2026-07.png`) });
    await p.close();
  }
  p = await open(NEW, `tab=evidence&z=${c}&m=2026-07&anim=0`);
  console.log('  Evidence (m=2026-07): computed/rescaled ->', JSON.stringify(await all(p, '[^.]*NOAA-20 rescaled[^.]*\\.?')), '| provisional ->', JSON.stringify(await all(p, '[^.>]*[Pp]rovisional[^.<]*\\.?')));
  await p.close();
  p = await open(NEW, `tab=method&z=${c}&anim=0`);
  console.log('  Method: partial ->', JSON.stringify(await all(p, '\\(20\\d\\d: partial year[^)]*\\)')), '| S-NPP end ->', JSON.stringify((await all(p, 'S-NPP VIIRS data production ended[^.]*\\.[^.]*\\.[^.]*\\.')).map((s) => s.slice(0, 330))));
  await p.close();
  // Detections layer, before and after.
  for (const [tag, f] of [['after', NEW], ['before', OLD]]) {
    p = await open(f, `tab=dash&z=${c}&l=det&anim=0`);
    const el = await p.$('.fb-mappanel');
    await el.screenshot({ path: path.join(shots, `det-${c}-${tag}.png`) });
    const sentence = await p.evaluate(() => { const e = document.querySelector('.fb-mappanel'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 260) : null; });
    console.log(`  Detections ${tag}:`, sentence);
    await p.close();
  }
}
// Overview, bare URL.
{ const p = await open(NEW, 'anim=0'); await p.screenshot({ path: path.join(shots, 'overview.png') }); console.log('\n== Overview text:', (await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))).slice(0, 700)); await p.close(); }
// Series CSV downloaded earlier by hsdl.mjs.
const dl = path.join(root, '.scratch', 'dl-verify');
if (fs.existsSync(dl)) for (const f of fs.readdirSync(dl).filter((x) => /^firebridge_all/.test(x))) {
  const t = fs.readFileSync(path.join(dl, f), 'utf8').split(/\r?\n/);
  console.log('\n== series CSV', f, '|', t.length, 'lines'); for (const l of t.filter((x) => x.startsWith('#')).slice(0, 12)) console.log('   ', l.slice(0, 330));
  const head = t.find((x) => !x.startsWith('#')); console.log('    header:', head);
  for (const l of t.filter((x) => /^2026-/.test(x) || /^2025-12/.test(x))) console.log('   ', l.slice(0, 220));
}
await b.close();
