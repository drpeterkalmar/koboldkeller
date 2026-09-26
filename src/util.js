/* util.js — kleine Helfer (MIT) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const TAU = Math.PI * 2;
export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
/** gewichtete Auswahl: [[wert, gewicht], …] */
export function weighted(list, r = Math.random) {
  let sum = 0; for (const [, w] of list) sum += w;
  let x = r() * sum;
  for (const [v, w] of list) { x -= w; if (x <= 0) return v; }
  return list[list.length - 1][0];
}
/** Farbe hex → [r,g,b] */
export function hexRgb(h) {
  if (h[0] !== "#") { const m = h.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Farbe aufhellen (t>0) / abdunkeln (t<0) */
export function shade(h, t) {
  const [r, g, b] = hexRgb(h);
  const f = c => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
  return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
}
export function rgba(h, a) {
  const [r, g, b] = hexRgb(h);
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}
export const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
