// The flip outline (SPEC_V3.1 §4): dark pixels on the map canvas before, 100 ms after and 800 ms after Raw ↔ Harmonized.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 });
await p.goto('file://' + (process.env.FB_HTML || '/home/claude/v62/dist/firebridge.html') + '#z=argentina', { waitUntil: 'load' }); await new Promise(r=>setTimeout(r,2500));
const sig = () => p.evaluate(() => { const c = document.querySelector('.fb-mapcard canvas'); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let k=0; for (let i=0;i<d.length;i+=4) if (d[i]<60&&d[i+1]<60&&d[i+2]<70) k++; return k; });
const s0 = await sig();
await p.evaluate(() => document.querySelectorAll('.fb-mc-head .at-seg')[1].querySelector('.at-seg-item').click());
await new Promise(r=>setTimeout(r,100)); const s1 = await sig();
await p.screenshot({ path: '/home/claude/v62/shots/v4-flip-outline-argentina-100ms.png', clip: await p.$eval('.fb-mapcard', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
await new Promise(r=>setTimeout(r,700)); const s2 = await sig();
console.log('dark pixels harmonized', s0, '| 100 ms after flip to raw', s1, '| 800 ms after', s2);
await b.close();
