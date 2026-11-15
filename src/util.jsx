// Small hooks and browser helpers shared by the app.
import { useState, useEffect, useRef } from 'react';

export const cx = (...a) => a.filter(Boolean).join(' ');
// `anim=0` in the URL hash: every chart is drawn in its final state at once (screenshots, video). Read once at load.
export const NOANIM = (() => { try { return /(^#|&)anim=0(&|$)/.test(window.location.hash); } catch (e) { return false; } })();
export const reduced = () => NOANIM || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function useWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => { const on = () => setW(window.innerWidth); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return w;
}
export function useHeight() {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => { const on = () => setH(window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return h;
}
// Light/dark: light unless the visitor chose dark (localStorage "fb-theme"; memory if storage is unavailable). Never in
// the URL. v6.3 (owner): the first open is light whatever the system preference, and a system change never switches it;
// the boot script in build.mjs applies the same rule before the first paint (no dark flash).
let memTheme = null;
const readStored = () => { try { const v = window.localStorage.getItem('fb-theme'); return v === 'light' || v === 'dark' ? v : memTheme; } catch (e) { return memTheme; } };
const writeStored = (v) => { memTheme = v; try { window.localStorage.setItem('fb-theme', v); } catch (e) { /* memory only */ } };
export function useTheme() {
  const [t, setT] = useState(() => readStored() || document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => { document.documentElement.setAttribute('data-theme', t); }, [t]);
  // Set the attribute synchronously so canvases redrawing in child effects read the new token colours.
  const toggle = () => { const v = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; writeStored(v); document.documentElement.setAttribute('data-theme', v); setT(v); };
  return [t, toggle];
}
// Element size through ResizeObserver.
export function useSize(ref, init = { w: 600, h: 400 }) {
  const [s, setS] = useState(init);
  useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((es) => { const r = es[0].contentRect; if (r.width > 0) setS({ w: r.width, h: r.height }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return s;
}
// Once seen, stays drawn. Reduced motion: drawn from the start.
export function useSeen(threshold = 0.3) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => reduced() || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}
// A number that eases from its previous value when `animate` is true (DS easing, cubic out).
export function useCount(target, ms, animate) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (target == null) { cur.current = null; setV(null); return undefined; }
    const a = cur.current;
    if (!animate || reduced() || a == null || a === target) { cur.current = target; setV(target); return undefined; }
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3), x = a + (target - a) * e;
      cur.current = x; setV(x);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);
  return v;
}
export function copyText(text) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta); return ok;
  };
  try { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => fallback()); } catch (e) { /* fallback */ }
  return Promise.resolve(fallback());
}
export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
export const IC = {
  down: 'M6 9l6 6 6-6', dl: 'M12 4v11M7 10l5 5 5-5M5 20h14', copy: 'M9 9h10v10H9zM5 15V5h10', x: 'M6 6l12 12M18 6L6 18',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z', check: 'M5 12l5 5 9-10', edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
};
// Resolve a CSS colour variable to rgb() (canvas and exports cannot read var()).
const colorCache = {};
export function cssColor(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const key = raw;
  if (colorCache[key]) return colorCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillStyle = raw || '#000'; g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return (colorCache[key] = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')');
}

// Contrast floor for map classes (v5.1): if a colour is under `min`:1 against the land, mix it toward the ink colour
// (away from the land) in small steps until it reaches `min`. Order between classes is preserved for monotonic ramps.
const relL = (s) => { const m = s.match(/\d+/g).map(Number); const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
export const contrastOf = (a, b) => { const x = [relL(a), relL(b)].sort((p, q) => q - p); return (x[0] + 0.05) / (x[1] + 0.05); };
export function liftColor(col, land, ink, min = 3) {
  if (contrastOf(col, land) >= min) return col;
  const a = col.match(/\d+/g).map(Number), b = ink.match(/\d+/g).map(Number);
  for (let t = 0.05; t <= 1; t += 0.05) { const c = 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; if (contrastOf(c, land) >= min) return c; }
  return ink;
}
