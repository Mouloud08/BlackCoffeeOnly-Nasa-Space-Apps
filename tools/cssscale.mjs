// Build-time CSS pass (SPEC_V5 §1, §8; audit F21–F22): one fluid root size, everything else in rem.
// - font-size: px values snap to the 7-step type scale (+ hero sizes kept as rem);
// - padding / margin / gap / inset spacing: px snap to the spacing scale (2 4 8 12 16 24 32 48 64), in rem;
// - other lengths ≥ 2.5 px become rem (÷16); hairlines (< 2.5 px: borders, outlines, strokes) stay px;
// - media and container query conditions are left in px.
const FS = [[12.9, 'var(--fs-1)'], [13.9, 'var(--fs-2)'], [15.9, 'var(--fs-3)'], [19.9, 'var(--fs-4)'], [25, 'var(--fs-5)'], [40, 'var(--fs-6)']];
const SP = [2, 4, 8, 12, 16, 24, 32, 48, 64];
const SPACING = /^(padding|margin|gap|row-gap|column-gap|padding-(top|right|bottom|left|inline|block)|margin-(top|right|bottom|left|inline|block)|inset)$/;
const rem = (px) => +(px / 16).toFixed(4) + 'rem';
const snap = (px) => { const a = Math.abs(px); let best = SP[0]; for (const v of SP) if (Math.abs(v - a) < Math.abs(best - a) || (Math.abs(v - a) === Math.abs(best - a) && v < best)) best = v; return (px < 0 ? -1 : 1) * best; };
export function scaleCss(css) {
  let out = '', i = 0;
  // Walk declarations outside @media/@container preludes: split on ';', '{', '}' and keep the separators.
  const parts = css.split(/([{};])/);
  for (const p of parts) {
    if (p === '{' || p === '}' || p === ';') { out += p; continue; }
    const t = p.trim();
    if (/^@(media|container|supports)/.test(t) || /^@(font-face|keyframes)/.test(t)) { out += p; continue; }
    const m = p.match(/^(\s*)([a-z-]+)(\s*:\s*)([\s\S]*)$/i);
    if (!m || /^--/.test(m[2]) && !/px/.test(m[4])) { out += p; continue; }
    const prop = m[2].toLowerCase(), val = m[4];
    if (!/px/.test(val) || /url\(/.test(val)) { out += p; continue; }
    let nv;
    if (prop === 'font-size' && /v[wh]/.test(val)) { out += p; continue; } // the one fluid root size
    if (prop === 'font-size') {
      nv = val.replace(/(-?\d*\.?\d+)px/g, (s, n) => { const x = +n; if (x >= 41) return rem(x); for (const [lim, tok] of FS) if (x <= lim) return tok; return rem(x); });
    } else if (SPACING.test(prop)) {
      nv = val.replace(/(-?\d*\.?\d+)px/g, (s, n) => { const x = +n; if (Math.abs(x) < 1.5) return s; return rem(snap(x)); });
    } else {
      nv = val.replace(/(-?\d*\.?\d+)px/g, (s, n) => { const x = +n; if (Math.abs(x) < 2.5) return s; return rem(x); });
    }
    out += m[1] + m[2] + m[3] + nv;
  }
  return out;
}
