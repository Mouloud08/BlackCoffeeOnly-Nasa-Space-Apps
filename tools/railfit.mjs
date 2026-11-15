// The verdict never scrolls (v5.1, user requirement): widths 1700 / 1920 / 2560, heights 600–1500 px in 50 px steps,
// both themes, five states. Checks scrollHeight == clientHeight on the verdict (rail or strip) and reports which blocks
// dropped (data-drop: 1 ladder, 2 + coordinates, 3 + sentence).
import puppeteer from 'puppeteer-core';
const url = 'file://' + (process.env.FB_HTML || new URL('..', import.meta.url).pathname + 'dist/firebridge.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STATES = { robust: 'z=canada', uncertain: 'z=boreal', borrowed: 'z=chilecito', notharmonized: 'c=argentina&b=-55,-53,-68.5,-65.5', outside: 'c=canada&b=59,60,-88,-87' };
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
let bad = 0, n = 0; const table = {};
for (const W of [1700, 1920, 2560]) for (const theme of ['light', 'dark']) for (const [st, h0] of Object.entries(STATES)) {
  const p = await b.newPage(); await p.setViewport({ width: W, height: 1000 });
  await p.goto(url + '#' + h0 + '&anim=0' + (theme === 'dark' ? '&theme=dark' : ''), { waitUntil: 'load' }); await sleep(1800);
  for (let H = 600; H <= 1500; H += 50) {
    await p.setViewport({ width: W, height: H }); await sleep(160);
    const r = await p.evaluate(() => { const e = document.querySelector('.fb-verdict2'); return e ? { layout: e.classList.contains('is-rail') ? 'rail' : 'strip', sh: e.scrollHeight, ch: e.clientHeight, drop: e.dataset.drop || '0', doc: document.documentElement.scrollHeight - innerHeight } : null; });
    n++; const ok = r && r.sh <= r.ch && r.doc <= 0; if (!ok) bad++;
    const key = W + ' ' + H; table[key] = table[key] || {};
    table[key][theme + '/' + st] = (ok ? '' : 'FAIL ') + r.layout + (r.layout === 'rail' ? ' d' + r.drop : '') + (ok ? '' : ' ' + r.sh + '>' + r.ch + ' doc+' + r.doc);
  }
  await p.close();
}
for (const [k, v] of Object.entries(table)) { const vals = Object.values(v); const uniq = [...new Set(vals)]; console.log(k.padEnd(10), uniq.length === 1 ? 'all 10: ' + uniq[0] : Object.entries(v).map(([s, x]) => s + ' ' + x).join(' | ')); }
console.log(n + ' checks, ' + bad + ' failed');
await b.close();
