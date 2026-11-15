// The 30-second demo: real captured clips of the app (public/captures/<shot>.mp4) in a quiet window, captions in a
// band under it (never over the app, so no figure is hidden), an end card. All text comes from ../captions.json.
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, continueRender, delayRender, getStaticFiles, interpolate, staticFile, useCurrentFrame } from 'remotion';
import plan from '../captions.json';

const FPS = plan.fps;
const f = (s) => Math.round(s * FPS);

// The app's light-theme tokens (ds/tokens.css)
const C = {
  stage: 'oklch(0.925 0.007 250)',
  ground: 'oklch(0.968 0.005 250)',
  surface: 'oklch(0.997 0.0015 250)',
  ink: 'oklch(0.21 0.011 250)',
  ink2: 'oklch(0.48 0.012 250)',
  line: 'oklch(0.88 0.007 250)',
  accent: 'oklch(0.49 0.11 250)',
};
const SANS = "'Radio Canada', 'Segoe UI', system-ui, sans-serif";
const DISPLAY = "'Atelier Texte', 'Radio Canada', 'Segoe UI', system-ui, sans-serif";

// Fonts of the app (copied from ds/fonts and @fontsource-variable/radio-canada)
const fontHandle = delayRender('fonts');
Promise.all([
  new FontFace('Atelier Texte', `url(${staticFile('fonts/atelier-texte.woff2')})`, { weight: '100 900' }).load(),
  new FontFace('Radio Canada', `url(${staticFile('fonts/radio-canada-latin-wght-normal.woff2')})`, { weight: '300 700' }).load(),
]).then((fs) => { fs.forEach((x) => document.fonts.add(x)); continueRender(fontHandle); }, () => continueRender(fontHandle));

// Window geometry: the 1920×1080 capture scaled into a framed window, the caption band below it.
const S = 0.86;
const WIN = { w: Math.round(1920 * S), h: Math.round(1080 * S) };
WIN.x = Math.round((1920 - WIN.w) / 2);
WIN.y = 20;
const BAND_TOP = WIN.y + WIN.h;
const XFADE = 6; // frames of cross-fade between shots

// Optional slow camera moves inside the window, per shot: zoom z around a fixed source point (ox, oy), from t0 to t1 (s)
const CAMERA = {
  // none at the moment: any push into the 1920-wide captures cuts the panels' text at the window edge
  // e.g. evidence: { ox: 1340, oy: 150, z: 1.06, t0: 0, t1: 3.4 },
};

function Clip({ id, len }) {
  const frame = useCurrentFrame();
  const cam = CAMERA[id];
  const z = cam ? interpolate(frame, [f(cam.t0), f(cam.t1)], [1, cam.z], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 1;
  const fadeIn = interpolate(frame, [0, XFADE], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: id === plan.shots[0].id ? 1 : fadeIn }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${S})`, transformOrigin: '0 0' }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${z})`, transformOrigin: cam ? `${cam.ox}px ${cam.oy}px` : '0 0' }}>
          <OffthreadVideo src={staticFile(`captures/${id}.mp4`)} muted style={{ width: 1920, height: 1080, display: 'block' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** "*x*" in caption text = emphasis */
function Rich({ text }) {
  return text.split(/(\*[^*]+\*)/).map((p, i) => (p.startsWith('*') && p.endsWith('*')
    ? <span key={i} style={{ color: C.accent, fontWeight: 650 }}>{p.slice(1, -1)}</span>
    : <span key={i}>{p}</span>));
}

function Caption({ text, len }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 5, len - 5, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, 7], [10, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: BAND_TOP, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: o, transform: `translateY(${y}px)`, background: C.surface, border: `1.5px solid ${C.line}`, borderRadius: 18,
        padding: '13px 34px 15px', boxShadow: '0 6px 18px -10px rgba(20,30,45,0.35)', maxWidth: WIN.w,
        fontFamily: SANS, fontSize: 46, lineHeight: 1.2, fontWeight: 520, letterSpacing: '-0.01em', color: C.ink, whiteSpace: 'nowrap' }}>
        <Rich text={text} />
      </div>
    </div>
  );
}

function Mark({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ color: C.ink, display: 'block' }}>
      <rect x="2.5" y="10" width="6.5" height="10.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="15" y="5" width="6.5" height="15.5" rx="1.5" fill="currentColor" />
      <path d="M5.75 7.5 Q12 1.5 18.25 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const rise = (d) => ({
    opacity: interpolate(frame, [d, d + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    transform: `translateY(${interpolate(frame, [d, d + 10], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })}px)`,
  });
  const e = plan.endCard;
  return (
    <AbsoluteFill style={{ background: C.ground, opacity: o, alignItems: 'center', justifyContent: 'center', fontFamily: SANS, color: C.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, ...rise(3) }}>
        <Mark size={104} />
        <div style={{ fontFamily: DISPLAY, fontSize: 124, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{e.title}</div>
      </div>
      <div style={{ marginTop: 44, fontSize: 44, fontWeight: 480, color: C.ink, ...rise(8) }}>{e.lines[0]}</div>
      <div style={{ marginTop: 14, fontSize: 40, fontWeight: 440, color: C.ink2, ...rise(11) }}>{e.lines[1]}</div>
      <div style={{ marginTop: 52, fontSize: 42, fontWeight: 560, color: C.accent, background: C.surface, border: `1.5px solid ${C.line}`,
        borderRadius: 999, padding: '14px 40px 16px', ...rise(15) }}>{e.url}</div>
    </AbsoluteFill>
  );
}

export function Demo() {
  const voice = getStaticFiles().find((x) => /^voice\.(mp3|wav|m4a|aac)$/i.test(x.name));
  const clips = plan.shots.filter((s) => s.id !== 'end');
  const end = plan.shots.find((s) => s.id === 'end');
  return (
    <AbsoluteFill style={{ background: C.stage }}>
      {/* window frame */}
      <div style={{ position: 'absolute', left: WIN.x - 1.5, top: WIN.y - 1.5, width: WIN.w + 3, height: WIN.h + 3, borderRadius: 15,
        background: C.line, boxShadow: '0 18px 40px -22px rgba(20,30,45,0.45)' }} />
      <div style={{ position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 14, overflow: 'hidden', background: C.ground }}>
        {clips.map((s) => {
          const len = f(s.end - s.start) + XFADE + 2;
          return (
            <Sequence key={s.id} from={f(s.start)} durationInFrames={len} layout="none">
              <Clip id={s.id} len={len} />
            </Sequence>
          );
        })}
      </div>
      {plan.captions.map((c, i) => (
        <Sequence key={i} from={f(c.start)} durationInFrames={f(c.end) - f(c.start)} layout="none">
          <Caption text={c.text} len={f(c.end) - f(c.start)} />
        </Sequence>
      ))}
      {end && (
        <Sequence from={f(end.start)} durationInFrames={f(end.end) - f(end.start)}>
          <EndCard />
        </Sequence>
      )}
      {voice && <Audio src={voice.src} />}
    </AbsoluteFill>
  );
}
