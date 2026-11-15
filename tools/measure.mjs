// V5 layout measurements (SPEC_V5 §10): document height == viewport on Dashboard, Evidence and How it works at four
// desktop sizes; no horizontal overflow at any size down to 320; panels that clip or scroll inside; map and calendar
// boxes; the share of the viewport that is empty (ground showing between and around panels).
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';
const here = new URL('..', import.meta.url).pathname;
const url = pathToFileURL(process.env.FB_HTML || here + 'dist/firebridge.html').href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const SIZES = [[1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [1280, 720], [768, 1024], [390, 844], [320, 640]];
let bad = 0;
for (const [w, h] of SIZES) for (const tab of ['dash', 'evidence', 'how', 'method']) for (const z of ['canada', 'chilecito']) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('fb-peek-hint', '1'); } catch (e) { /* */ } });
  await p.goto(url + '#z=' + z + '&anim=0' + (tab === 'dash' ? '' : '&tab=' + tab), { waitUntil: 'load' });
  await sleep(1800);
  const r = await p.evaluate(() => {
    const de = document.documentElement, W = innerWidth, H = innerHeight;
    const box = (s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; };
    // Elements that hide content: overflow hidden/auto with content larger than the box (ignores the Method document and the phone dashboard, which scroll by design).
    const clipped = [...document.querySelectorAll('.fb-panel, .fb-verdict2, .fb-step2, .fb-evpanel, .fb-calbody')].filter((e) => e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2).map((e) => e.className.split(' ').slice(0, 2).join('.') + ' ' + e.scrollHeight + '>' + e.clientHeight);
    // Empty share: sample a grid of points; a point is "empty" when the top element is the app ground (not inside a panel, bar or control).
    let empty = 0, n = 0;
    for (let y = 4; y < H; y += 16) for (let x = 4; x < W; x += 16) { n++; const e = document.elementFromPoint(x, y); if (!e || e === document.body || e === de || e.matches('.fb-app, .fb-tabarea, .fb-main, .fb-dashb, .fb-evgrid, .fb-evtab, .fb-howtab, .fb-how-top, .fb-how-nav')) empty++; }
    const cells = document.querySelector('.fb-calpanel .at-cal-cells .at-cell');
    return { docH: de.scrollHeight, docW: de.scrollWidth, H, W, layout: (document.querySelector('.fb-app') || {}).className, map: box('.fb-mappanel .fb-map-view'), cal: box('.fb-calpanel .at-cal'), verdict: box('.fb-verdict2'), cell: cells ? [Math.round(cells.getBoundingClientRect().width), Math.round(cells.getBoundingClientRect().height)] : null, emptyPct: Math.round((empty / n) * 100), clipped };
  });
  const oneScreen = w >= 1280 && h >= 720 && tab !== 'method';
  const okH = !oneScreen || r.docH === r.H, okW = r.docW <= r.W;
  if (!okH || !okW) bad++;
  console.log(`${w}x${h} ${tab.padEnd(8)} ${z.padEnd(9)} docH ${r.docH}${oneScreen ? (okH ? ' =vh' : ' != ' + r.H + ' FAIL') : ''} docW ${r.docW}${okW ? '' : ' OVERFLOW FAIL'} empty ${r.emptyPct}%` + (tab === 'dash' ? ` map ${JSON.stringify(r.map)} cal ${JSON.stringify(r.cal)} cell ${JSON.stringify(r.cell)} verdict ${JSON.stringify(r.verdict)}` : '') + (r.clipped.length ? ' CLIP ' + r.clipped.join(', ') : ''));
  await p.close();
}
console.log(bad ? 'FAILURES ' + bad : 'ALL HEIGHT/WIDTH CHECKS PASS');
await b.close();
