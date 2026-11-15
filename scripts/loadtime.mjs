// Load cost of a built file: time from navigation start to the first computed verdict (window.__fb.hero), median of 5,
// plus the size on disk and gzipped. Usage: node scripts/loadtime.mjs a.html b.html ...
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { pathToFileURL } from 'url';
const chrome = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
for (const f of process.argv.slice(2)) {
  const buf = fs.readFileSync(f), t = [], heap = [];
  for (let i = 0; i < 5; i++) {
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(pathToFileURL(path.resolve(f)).href + '#tab=dash&z=canada&anim=0', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__fb && window.__fb.pending === false && window.__fb.hero, { timeout: 60000 });
    t.push(await p.evaluate(() => Math.round(performance.now())));
    const m = await p.metrics(); heap.push(Math.round(m.JSHeapUsedSize / 1e6));
    await p.close();
  }
  t.sort((a, c) => a - c); heap.sort((a, c) => a - c);
  console.log(path.basename(f).padEnd(26), '| disk', (buf.length / 1e6).toFixed(1), 'MB | gzip', (zlib.gzipSync(buf, { level: 6 }).length / 1e6).toFixed(1), 'MB | brotli', (zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }).length / 1e6).toFixed(1), 'MB | ready ms (5 runs)', t.join(' '), '| JS heap MB', heap[2]);
}
await b.close();
