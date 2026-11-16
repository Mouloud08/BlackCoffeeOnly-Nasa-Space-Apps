// ONE command: re-capture the footage from a given build of the app, check every caption number against the
// captured screens, render the video with Remotion, finalise it for the web, verify it, extract one frame per shot,
// and rebuild the slide deck.
//
// Usage: node video/render.mjs [C:/path/to/firebridge.html] [--skip-capture] [--skip-slides] [--force]
//   --skip-capture  reuse video/public/captures (e.g. after editing captions.json only)
//   --force         render even if a caption number is not found on the captured screen (do not use for the final)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const HTML = resolve(args.find((a) => !a.startsWith('--')) ?? join(ROOT, 'dist', 'firebridge.html'));
const OUT = join(HERE, 'out');
const TMP = join(HERE, 'tmp');
const FINAL = join(OUT, 'firebridge-demo.mp4');
mkdirSync(OUT, { recursive: true }); mkdirSync(TMP, { recursive: true });
const t0 = Date.now();
const step = (s) => console.log(`\n[${Math.round((Date.now() - t0) / 1000)} s] ${s}`);
const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { stdio: 'inherit', cwd: HERE, ...opts });

if (!existsSync(join(HERE, 'node_modules', '@remotion', 'cli'))) {
  step('Installing Remotion (npm install in video/)');
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--no-audit', '--no-fund'], { shell: process.platform === 'win32' });
}

// 1. Capture
if (!flag('--skip-capture')) {
  if (!existsSync(HTML)) throw new Error(`App not found: ${HTML}`);
  step(`Capturing the footage from ${HTML}`);
  run(process.execPath, [join(HERE, 'capture.mjs'), HTML]);
}

// 2. Honesty check: every number in a caption must be on the screen captured for its shot
step('Checking the captions against the captured screens');
const plan = JSON.parse(readFileSync(join(HERE, 'captions.json'), 'utf8'));
const facts = JSON.parse(readFileSync(join(HERE, 'public', 'captures', 'facts.json'), 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').replace(/[\u2009\u202f\u00a0]/g, ' ');
const NUM = /±?\d+(?:[.,]\d+)?\s?[×%]|\d+ of \d+/g;
const problems = [], warnings = [];
for (const c of plan.captions) {
  const screen = norm(facts[c.shot]?.text ?? '');
  if (!screen) { problems.push(`${c.shot}: no captured text`); continue; }
  const plain = c.text.replace(/\*/g, '');
  for (const n of plain.match(NUM) ?? []) if (!screen.includes(n)) problems.push(`${c.shot}: "${n}" (caption "${plain}") is not on the screen`);
  for (const s of c.check ?? []) if (!screen.toLowerCase().includes(s.toLowerCase())) warnings.push(`${c.shot}: "${s}" not found on the screen (label renamed?)`);
  console.log(`  ok  ${c.shot.padEnd(10)} ${plain}`);
}
const allText = norm(Object.values(facts).map((f) => f?.text ?? '').join('\n'));
for (const s of plan.endCard.check ?? []) if (!allText.includes(s)) warnings.push(`end card: "${s}" not found in the app text`);
warnings.forEach((w) => console.log(`  WARNING ${w}`));
if (problems.length) {
  problems.forEach((p) => console.log(`  MISMATCH ${p}`));
  if (!flag('--force')) throw new Error('A caption number is not on the app screen: fix captions.json (or the capture) and re-run.');
}

// 3. Render with Remotion (high quality intermediate)
step('Rendering with Remotion');
const mid = join(TMP, 'remotion.mp4');
run(process.execPath, [join(HERE, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', 'src/index.jsx', 'Demo', mid,
  `--browser-executable=${CHROME}`, '--codec=h264', '--crf=12', '--concurrency=8', '--log=warn']);

// 4. Finalise: H.264 High, yuv420p (TV range, BT.709), 30 fps, +faststart; audio kept if a voice track was added
step('Finalising (H.264 yuv420p, faststart)');
const tmpFinal = join(TMP, 'final.mp4');
const hasAudio = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', mid], { encoding: 'utf8' }).trim() !== '';
run('ffmpeg', ['-y', '-v', 'error', '-i', mid, '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-profile:v', 'high',
  '-preset', 'slow', '-crf', '19', '-r', String(plan.fps), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '160k'] : ['-an']), '-movflags', '+faststart', tmpFinal]);
rmSync(FINAL, { force: true });
renameSync(tmpFinal, FINAL);

// 5. Verify
step('Verifying');
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,pix_fmt,r_frame_rate', '-of', 'json', FINAL], { encoding: 'utf8' }));
const v = probe.streams.find((s) => s.codec_type === 'video');
const dur = Number(probe.format.duration), mb = Number(probe.format.size) / 1e6;
// faststart: the moov atom must come before the media data
const head = readFileSync(FINAL).subarray(0, 4e6).toString('latin1');
const faststart = head.indexOf('moov') !== -1 && (head.indexOf('mdat') === -1 || head.indexOf('moov') < head.indexOf('mdat'));
const ok = dur <= 28.6 && v.width === 1920 && v.height === 1080 && v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.r_frame_rate === `${plan.fps}/1` && mb < 15 && faststart;
console.log(`  ${FINAL}\n  duration ${dur.toFixed(2)} s · ${v.width}×${v.height} · ${v.codec_name} ${v.pix_fmt} · ${v.r_frame_rate} fps · ${mb.toFixed(2)} MB · faststart: ${faststart ? 'yes' : 'NO'} · audio: ${hasAudio ? 'yes' : 'none'}`);
if (!ok) throw new Error('The video fails a requirement (≤ 28.6 s, 1920×1080, H.264 yuv420p, 30 fps, < 15 MB, faststart).');
// a voice track in public/ must reach the MP4 as exactly one AAC stream
const voiceFile = ['mp3', 'wav', 'm4a', 'aac'].map((x) => join(HERE, 'public', `voice.${x}`)).find((p) => existsSync(p));
const audio = probe.streams.filter((s) => s.codec_type === 'audio');
if (voiceFile && (audio.length !== 1 || audio[0].codec_name !== 'aac')) throw new Error(`${voiceFile} is present but the MP4 has ${audio.length} audio stream(s) (${audio.map((s) => s.codec_name).join(', ') || 'none'}), expected one AAC stream.`);
if (voiceFile) console.log(`  voice: ${voiceFile} → 1 AAC stream`);

// 6. One frame per shot, in its final state (0.4 s before its last caption ends; end card: 0.5 s before the end)
step('Extracting one frame per shot → out/frames/');
const FR = join(OUT, 'frames');
rmSync(FR, { recursive: true, force: true }); mkdirSync(FR, { recursive: true });
plan.shots.forEach((s, i) => {
  const caps = plan.captions.filter((c) => c.shot === s.id);
  const t = caps.length ? caps.at(-1).end - 0.4 : s.end - 0.5;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(2), '-i', FINAL, '-frames:v', '1', join(FR, `shot-${i + 1}-${s.id}.png`)]);
});

// 7. Slides
if (!flag('--skip-slides')) {
  step('Building the slide deck');
  run(process.execPath, [join(HERE, 'slides.mjs'), HTML]);
}

console.log(`\nDone in ${Math.round((Date.now() - t0) / 1000)} s. FINAL DURATION: ${dur.toFixed(2)} s (${mb.toFixed(2)} MB) → ${FINAL}`);
