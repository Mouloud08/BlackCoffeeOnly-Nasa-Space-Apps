// Renders the exported PNG (as the app builds it) to shots/v5-export-calendar.png, plus the SVG width check.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 });
await p.goto('file://' + (process.env.FB_HTML || '/home/claude/v62/dist/firebridge.html') + '#z=canada', { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 2500));
await p.evaluate(() => { window.__b = []; const O = URL.createObjectURL; URL.createObjectURL = (bl) => { window.__b.push(bl); return O(bl); }; HTMLAnchorElement.prototype.click = function () {}; });
await p.click('.fb-morebtn'); await new Promise((r) => setTimeout(r, 200)); await p.evaluate(() => [...document.querySelectorAll('#fb-more button')].find((e) => e.textContent.startsWith('Calendar image (PNG)')).click()); await new Promise((r) => setTimeout(r, 4000));
const png = await p.evaluate(async () => { const x = window.__b.find((q) => q.type === 'image/png'); if (!x) return null; const a = new Uint8Array(await x.arrayBuffer()); let s = ''; for (const c of a) s += String.fromCharCode(c); return btoa(s); });
const svg = await p.evaluate(async () => { const x = window.__b.find((q) => q.type === 'image/svg+xml'); return x ? (await x.text()).slice(0, 200) : null; });
if (png) fs.writeFileSync('/home/claude/v62/shots/v5-export-calendar.png', Buffer.from(png, 'base64'));
console.log('png', !!png, 'svg head', svg);
await b.close();
