// Bar column share of the row (phone rule: >= 45%) and horizontal overflow, at several widths.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
for (const w of [320, 390, 1280]) for (const z of ['boreal', 'chilecito']) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: 800 });
  await p.goto('file://' + (process.env.FB_HTML || '/home/claude/v62/dist/firebridge.html') + '#z=' + z, { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 1800));
  console.log(w, z, JSON.stringify(await p.evaluate(() => { const r = document.querySelector('.fb-proofcard .fb-bar-row'), t = r.querySelector('.fb-track'), lab = r.querySelector('.fb-bar-label span'); return { track: Math.round(t.getBoundingClientRect().width / r.getBoundingClientRect().width * 100) + '%', subLines: Math.round(lab.getBoundingClientRect().height / 16), over: document.documentElement.scrollWidth > innerWidth, freeAboveFoot: Math.round(document.querySelector('.fb-proofcard .fb-vfoot .at-prov').getBoundingClientRect().top - document.querySelector('.fb-proofcard .fb-proof').getBoundingClientRect().bottom) }; })));
  await p.close();
}
await b.close();
