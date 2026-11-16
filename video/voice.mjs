// English voice-over for the demo: one ElevenLabs text-to-speech clip per caption slot, each trimmed of its
// leading/trailing silence, placed at its caption's start time, mixed into ONE track (video/public/voice.mp3,
// <= 28.5 s, about -16 LUFS), which render.mjs lays under the whole video.
//
// Usage (the API key is read at run time from an env file you name; it is never printed or written anywhere):
//   node video/voice.mjs --env-file=<path to .env with ELEVENLABS_API_KEY> --list
//   node video/voice.mjs --env-file=<path> --voice=<voice_id> [--model=eleven_multilingual_v2] [--only=1,6]
//   node video/voice.mjs --assemble        # re-mix public/voice.mp3 from the saved clips (no network, no key)
// The env file path may also come from the environment variable FB_VOICE_ENV_FILE.
// Only ONE variable is read from that file: ELEVENLABS_API_KEY. Network: api.elevenlabs.io only.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIPS = join(HERE, 'voice', 'clips');
const OUTFILE = join(HERE, 'public', 'voice.mp3');
const RECORD = join(HERE, 'voice.json');
const API = 'https://api.elevenlabs.io';
const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name) => args.includes(`--${name}`);
const plan = JSON.parse(readFileSync(join(HERE, 'captions.json'), 'utf8'));

// The narration: same words and numbers as the captions ("×" read "times", "±10%" read "within ten percent").
// `caption` = index in captions.json (the clip starts at that caption's start); the end card line starts at `start`.
const SEGMENTS = [
  // digits here: the model reads "1.4 times since 2012" faster than the spelled-out words, and the slot is 2.85 s
  { caption: 0, text: 'Argentina’s fires seem to rise 1.4 times since 2012.' },
  { caption: 1, text: 'On one scale, they fell: zero point seven times. The rise was the satellite.' },
  { caption: 2, text: 'Canada: doubled, not quadrupled. Official burned area agrees: one point nine times.' },
  { caption: 3, text: 'A harmonized burning calendar, month by month, two thousand one to October twenty twenty-six.' },
  { caption: 4, text: 'Pick any place. Compare any month with its historical median.' },
  { caption: 5, text: 'Checked year by year: within ten percent in thirteen of fourteen years.' },
  { endCard: true, start: 26.35, text: 'FireBridge, on NASA FIRMS data.' },
];
const SETTINGS = { stability: 0.6, similarity_boost: 0.75, style: 0, use_speaker_boost: true }; // neutral, stable
const MAX_PAUSE = 0.2;     // longest pause kept inside a clip (s)
const AIR = 0.15;          // silence required between two clips (s)
const LAST_END = 28.3;     // the last sound must end before this (s)
const TRACK = 28.4;        // length of the mixed track (s), <= plan.duration
const startOf = (s) => (s.endCard ? s.start : plan.captions[s.caption].start);
const textOf = (n, s) => opt(`text${n}`) ?? s.text; // --text1="..." tries another wording for one segment
const limitOf = (i) => (SEGMENTS[i + 1] ? startOf(SEGMENTS[i + 1]) - AIR : LAST_END);

const run = (cmd, a) => execFileSync(cmd, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const duration = (file) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());

function readKey() {
  const file = opt('env-file') ?? process.env.FB_VOICE_ENV_FILE;
  if (!file) throw new Error('Pass --env-file=<path> (or set FB_VOICE_ENV_FILE) naming the env file that holds ELEVENLABS_API_KEY.');
  if (!existsSync(file)) throw new Error('The env file given with --env-file does not exist.');
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find((l) => /^\s*(export\s+)?ELEVENLABS_API_KEY\s*=/.test(l));
  if (!line) throw new Error('ELEVENLABS_API_KEY is not set in the env file given.');
  const key = line.replace(/^\s*(export\s+)?ELEVENLABS_API_KEY\s*=\s*/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
  if (!key) throw new Error('ELEVENLABS_API_KEY is empty in the env file given.');
  return key;
}

async function api(key, path, init = {}) {
  const res = await fetch(API + path, { ...init, headers: { 'xi-api-key': key, ...(init.headers ?? {}) } });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400).replaceAll(key, '<key>');
    throw new Error(`ElevenLabs ${init.method ?? 'GET'} ${path.split('?')[0]} -> HTTP ${res.status}: ${body}`);
  }
  return res;
}

async function list(key) {
  const user = await (await api(key, '/v1/user/subscription')).json().catch(() => null);
  if (user) console.log(`Subscription: tier ${user.tier}, characters ${user.character_count} / ${user.character_limit}`);
  const { voices } = await (await api(key, '/v1/voices')).json();
  console.log(`\n${voices.length} voices (name · category · labels · id):`);
  for (const v of voices) console.log(`  ${v.name} · ${v.category} · ${JSON.stringify(v.labels ?? {})} · ${v.voice_id}`);
  const models = await (await api(key, '/v1/models')).json();
  console.log('\nText-to-speech models:');
  for (const m of models.filter((x) => x.can_do_text_to_speech)) console.log(`  ${m.model_id} · ${m.name}`);
}

async function generate(key) {
  const voiceId = opt('voice');
  if (!voiceId) throw new Error('Pass --voice=<voice_id> (see --list).');
  const model = opt('model') ?? 'eleven_multilingual_v2';
  const only = opt('only')?.split(',').map(Number);
  const format = opt('format') ?? 'mp3_44100_128';
  const speedAll = Number(opt('speed') ?? 1.0);    // ElevenLabs speaking rate (keep <= 1.12)
  const speeds = JSON.parse(opt('speeds') ?? '{}'); // per segment, e.g. --speeds={"1":1.08}
  const tries = Number(opt('tries') ?? 3);
  const { voices } = await (await api(key, '/v1/voices')).json();
  const voice = voices.find((v) => v.voice_id === voiceId);
  if (!voice) throw new Error(`Voice ${voiceId} is not in this account.`);
  const trial = flag('trial'); // write to voice/trial/<voice>/ and leave voice.json alone (to compare voices)
  const dir = trial ? join(HERE, 'voice', 'trial', `${voice.name.split(' ')[0]}-${model}`) : CLIPS;
  mkdirSync(dir, { recursive: true });
  const prev = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, 'utf8')) : null;
  const record = { voice: { name: voice.name, id: voiceId, category: voice.category, labels: voice.labels }, model, format, settings: SETTINGS, maxPause: MAX_PAUSE, segments: [] };
  for (const [i, s] of SEGMENTS.entries()) {
    const n = i + 1;
    if (only && !only.includes(n)) { record.segments.push(prev?.segments?.[i] ?? null); continue; }
    const speed = speeds[n] ?? speedAll;
    const room = limitOf(i) - startOf(s);
    // TTS takes vary in length: keep the first take that fits its slot, else the shortest of `tries` takes
    let best = null;
    for (let k = 1; k <= tries; k++) {
      const body = { text: textOf(n, s), model_id: model, voice_settings: { ...SETTINGS, speed } };
      const res = await api(key, `/v1/text-to-speech/${voiceId}?output_format=${format}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body) });
      const raw = join(dir, `seg${n}-take${k}-raw.mp3`);
      writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
      const clip = join(dir, `seg${n}-take${k}.wav`);
      tighten(raw, clip);
      const d = duration(clip);
      console.log(`  seg${n} take ${k}: raw ${duration(raw).toFixed(2)} s -> ${d.toFixed(2)} s  (room ${room.toFixed(2)} s, speed ${speed})  ${textOf(n, s)}`);
      if (!best || d < best.d) best = { k, d, raw, clip };
      if (d <= room) break;
    }
    copyFileSync(best.raw, join(dir, `seg${n}-raw.mp3`));
    copyFileSync(best.clip, join(dir, `seg${n}.wav`));
    record.segments.push({ n, text: textOf(n, s), caption: s.endCard ? 'end card' : plan.captions[s.caption].text, speed, start: startOf(s), duration: +best.d.toFixed(3) });
  }
  if (!trial) writeFileSync(RECORD, JSON.stringify(record, null, 2) + '\n');
}

// Cut the leading/trailing silence and shorten any pause longer than MAX_PAUSE to MAX_PAUSE (cuts fall in silence).
function tighten(raw, out) {
  const len = duration(raw);
  const err = ffmpegStderr(['-hide_banner', '-nostats', '-i', raw, '-af', 'silencedetect=n=-45dB:d=0.04', '-f', 'null', '-']);
  const sil = [];
  for (const m of err.matchAll(/silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) sil.push([Math.max(0, Number(m[1])), Number(m[2])]);
  let a = 0, b = len;
  if (sil.length && sil[0][0] <= 0.01) a = Math.max(0, sil[0][1] - 0.02);
  if (sil.length && sil.at(-1)[1] >= len - 0.01) b = Math.min(len, sil.at(-1)[0] + 0.05);
  const keep = [];
  let cur = a;
  for (const [s, e] of sil) {
    if (s <= a + 1e-6 || e >= b - 1e-6) continue;
    if (e - s > MAX_PAUSE) { keep.push([cur, s + MAX_PAUSE / 2]); cur = e - MAX_PAUSE / 2; }
  }
  keep.push([cur, b]);
  const parts = keep.map(([x, y], i) => `[0:a]atrim=${x.toFixed(4)}:${y.toFixed(4)},asetpts=PTS-STARTPTS[p${i}]`);
  const fc = `${parts.join(';')};${keep.map((_, i) => `[p${i}]`).join('')}concat=n=${keep.length}:v=0:a=1,afade=t=in:d=0.01[o]`;
  run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-filter_complex', fc, '-map', '[o]', '-ar', '44100', '-ac', '1', out]);
}

function check() {
  const rec = JSON.parse(readFileSync(RECORD, 'utf8'));
  let ok = true;
  console.log('\nseg  start   end     limit   caption window   text');
  rec.segments.forEach((s, i) => {
    const seg = SEGMENTS[i];
    const start = startOf(seg);
    const d = duration(join(CLIPS, `seg${i + 1}.wav`));
    const end = start + d;
    const next = SEGMENTS[i + 1];
    const limit = next ? startOf(next) - AIR : LAST_END;
    const cap = seg.endCard ? `end card ${plan.shots.at(-1).start}–${plan.duration}` : `${plan.captions[seg.caption].start.toFixed(2)}–${plan.captions[seg.caption].end.toFixed(2)}`;
    const good = end <= limit + 1e-9;
    if (!good) ok = false;
    s.start = start; s.duration = +d.toFixed(3); s.end = +end.toFixed(3);
    console.log(`${String(i + 1).padStart(3)}  ${start.toFixed(2).padStart(5)}  ${end.toFixed(2).padStart(6)}  ${limit.toFixed(2).padStart(6)}  ${cap.padEnd(16)} ${good ? 'ok  ' : 'LONG'} ${seg.text}`);
  });
  writeFileSync(RECORD, JSON.stringify(rec, null, 2) + '\n');
  return ok;
}

function assemble() {
  if (!check()) throw new Error('A clip runs into the next one (or past 28.3 s): shorten its text or raise its speed, then regenerate it.');
  const inputs = [], parts = [];
  SEGMENTS.forEach((s, i) => {
    inputs.push('-i', join(CLIPS, `seg${i + 1}.wav`));
    const ms = Math.round(startOf(s) * 1000);
    parts.push(`[${i}:a]adelay=${ms}:all=1[d${i}]`);
  });
  const mix = `${parts.join(';')};${SEGMENTS.map((_, i) => `[d${i}]`).join('')}amix=inputs=${SEGMENTS.length}:normalize=0:dropout_transition=0,apad=whole_dur=${TRACK},atrim=0:${TRACK}`;
  const mixed = join(CLIPS, 'mix.wav');
  run('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', `${mix}[m]`, '-map', '[m]', '-ar', '44100', '-ac', '1', mixed]);
  // two-pass EBU R128 loudness normalisation to -16 LUFS, true peak <= -1.5 dBTP (loudnorm switches to its dynamic
  // mode when a plain gain would push the peaks past -1.5 dBTP, which is the case for this speech)
  const m = measure(mixed);
  const ln = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
  const normed = join(CLIPS, 'mix-norm.wav');
  run('ffmpeg', ['-y', '-v', 'error', '-i', mixed, '-af', `${ln},aresample=44100,atrim=0:${TRACK}`, '-ar', '44100', '-ac', '1', normed]);
  // loudnorm lands ~1.5 LU low on a track that is half silence: add the missing gain, but keep true peak <= -0.8 dBTP
  const n2 = measure(normed);
  const gain = Math.max(0, Math.min(-16 - Number(n2.input_i), -0.8 - Number(n2.input_tp))).toFixed(2);
  run('ffmpeg', ['-y', '-v', 'error', '-i', normed, '-af', `volume=${gain}dB`, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '192k', OUTFILE]);
  const after = measure(OUTFILE);
  const peak = volumePeak(OUTFILE);
  console.log(`\n${OUTFILE}\n  length ${duration(OUTFILE).toFixed(3)} s · integrated ${after.input_i} LUFS · true peak ${after.input_tp} dBTP · sample peak ${peak} dB`);
  const rec = JSON.parse(readFileSync(RECORD, 'utf8'));
  rec.track = { file: 'public/voice.mp3', length: +duration(OUTFILE).toFixed(3), lufs: Number(after.input_i), truePeak: Number(after.input_tp), samplePeak: peak };
  writeFileSync(RECORD, JSON.stringify(rec, null, 2) + '\n');
}

// ffmpeg writes its analysis (loudnorm JSON, volumedetect) to stderr
const ffmpegStderr = (a) => String(spawnSync('ffmpeg', a, { encoding: 'utf8' }).stderr ?? '');

function measure(file) {
  const err = ffmpegStderr(['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
  return JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
}

function volumePeak(file) {
  const err = ffmpegStderr(['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  return Number(/max_volume:\s*(-?[\d.]+) dB/.exec(err)?.[1]);
}

if (flag('assemble')) {
  assemble();
} else {
  const key = readKey();
  if (flag('list')) await list(key);
  else { await generate(key); if (!flag('no-assemble')) assemble(); }
}
