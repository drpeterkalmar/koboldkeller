/* fx.js — Partikel-Pool, Screenshake, Hit-Stop, Zeitlupe, schwebende Texte (MIT) */
import { rand, TAU, mulberry32 } from "./util.js";
import { DEKO, CALM } from "./config.js";

export const FX = {
  parts: [], texts: [], rings: [], trails: [], lights: [],   // v13: lights = kurze Lichtblitze (Treffer, Puff, Beute) in der Lightmap
  trauma: 0, hitstop: 0, slowT: 0, slowF: 1,
  flashA: 0, flashCol: "#fff", hurtA: 0,
  budget: 1, // 1 = volle Qualität, 0.5 = sparsam
  dq: 0,     // v13: Qualitätsstufe des Renderers (0 … 3) — Deko-Funken nur bis Stufe 1
  zoomPunch: 0,
};
const MAX = 700;
let alive = 0;

export function resetFx() {
  FX.parts.length = 0; FX.texts.length = 0; FX.rings.length = 0; FX.trails.length = 0; FX.lights.length = 0;
  FX.trauma = 0; FX.hitstop = 0; FX.slowT = 0; FX.flashA = 0; FX.hurtA = 0; alive = 0;
}

/** Ein Partikel. Welt-Koordinaten in Kacheln, z/vz/g in Design-Pixeln. */
export function part(o) {
  if (FX.parts.length >= MAX * FX.budget) return null;
  const p = {
    x: o.x, y: o.y, z: o.z || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
    g: o.g ?? 0, drag: o.drag ?? 1.5, life: o.life || 0.6, max: o.life || 0.6,
    s0: o.s0 ?? o.size ?? 10, s1: o.s1 ?? 0, col: o.col || "#fff", kind: o.kind || "dot",
    add: o.add ?? true, rot: o.rot ?? Math.random() * TAU, vr: o.vr ?? 0, ground: !!o.ground,
    fade: o.fade ?? 1, bounce: o.bounce || 0,
  };
  FX.parts.push(p);
  return p;
}
export function burst(x, y, n, o) {
  n = Math.max(1, Math.round(n * (FX.budget < 1 ? 0.55 : 1)));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = rand(o.sp0 ?? 0.5, o.sp1 ?? 2.5);
    part({ ...o, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(o.vz0 ?? 20, o.vz1 ?? 120), life: rand(o.l0 ?? 0.35, o.l1 ?? 0.8), rot: Math.random() * TAU, vr: rand(-6, 6) });
  }
}
export function ring(x, y, r, col, life = 0.35, w = 1) { FX.rings.push({ x, y, r, col, life, max: life, w }); }
export function text(x, y, str, col = "#fff", size = 20, z = 60) {
  if (FX.texts.length > 40) FX.texts.shift();
  FX.texts.push({ x, y, z, str, col, size, t: 0, life: 1.0, vx: rand(-0.4, 0.4) });
}
export function shake(a) { FX.trauma = Math.min(1, FX.trauma + a); }
export function hitstop(ms) { FX.hitstop = Math.max(FX.hitstop, ms / 1000); }
export function slowmo(t, f = 0.3) { FX.slowT = t; FX.slowF = f; }
export function flash(col, a) { FX.flashCol = col; FX.flashA = Math.max(FX.flashA, a); }

/** v13: kurzer Lichtblitz in der Lightmap (Welt-Koordinaten, r in Kacheln) — höchstens 12 gleichzeitig */
export function lightFlash(x, y, r, col, life = 0.25, a = 0.9) {
  if (!DEKO) return;
  if (FX.lights.length >= 12) FX.lights.shift();
  FX.lights.push({ x, y, r, col, life, max: life, a });
}
// v13: eigener Zufall für reine Optik-Partikel — die Zufallsfolge des Spiels (Math.random, z. B. Beute) bleibt gleich wie mit ?deko=0
const dr = mulberry32(20261005), drr = (a, b) => a + dr() * (b - a);
const dk = () => DEKO && FX.budget >= 1 && FX.dq < 2 && !CALM;
/** Treffer-Funken: Strahlen fliegen sternförmig auseinander (zeigen in Flugrichtung) */
function streaks(x, y, n, col, sp, z = 30) {
  for (let i = 0; i < n; i++) {
    const a = (i + dr() * 0.6) / n * TAU, v = drr(sp * 0.6, sp), vx = Math.cos(a) * v, vy = Math.sin(a) * v;
    part({ x, y, z: z + drr(-6, 6), vx, vy, vz: drr(-20, 60), kind: "streak", col, s0: drr(18, 26), s1: 4, life: drr(0.14, 0.24), g: 0, drag: 5, rot: Math.atan2((vx + vy) * 16, (vx - vy) * 32), vr: 0 });
  }
}

// ---------- Presets ----------
export const P = {
  hit(x, y, col = "#fff3b0") {
    burst(x, y, 7, { kind: "star", col, s0: 12, s1: 2, sp0: 1.5, sp1: 4, z: 30, vz0: 30, vz1: 140, g: -380, l0: 0.2, l1: 0.45 });
    part({ x, y, z: 30, kind: "glow", col: "#fff", s0: 46, s1: 10, life: 0.14 });
    if (DEKO) { lightFlash(x, y, 1.6, col, 0.16, 0.8); if (dk()) { streaks(x, y, 4, col, 5); ring(x, y, 0.7, "#ffffff", 0.16, 0.5); } }
  },
  poof(x, y, col = "#ffd0e8", big = false) {
    const k = big ? 2 : 1;
    burst(x, y, 9 * k, { kind: "puff", col: "#ffffff", add: false, s0: 26 * k, s1: 4, sp0: 0.6, sp1: 2.2 * k, z: 20, vz0: 10, vz1: 60, g: 0, drag: 3, l0: 0.45, l1: 0.8, fade: 0.9 });
    burst(x, y, 12 * k, { kind: "star", col, s0: 14, s1: 0, sp0: 1, sp1: 3.5 * k, z: 30, vz0: 60, vz1: 200, g: -300, l0: 0.5, l1: 1.0 });
    burst(x, y, 6 * k, { kind: "star5", col: "#fff6a0", s0: 12, s1: 0, sp0: 0.5, sp1: 2, z: 36, vz0: 80, vz1: 180, g: -200, l0: 0.6, l1: 1.1 });
    part({ x, y, z: 30, kind: "glow", col, s0: 80 * k, s1: 20, life: 0.25 });
    if (DEKO) {                                                // v13: Licht-Puff, Bodenring, ein Seelchen-Funkeln steigt auf
      lightFlash(x, y, 2.4 * k, col, 0.35, 1);
      if (FX.dq < 3) ring(x, y, 1.1 * k, col, 0.32, 0.7);
      if (dk()) for (let i = 0; i < 2 * k; i++) part({ x: x + drr(-0.15, 0.15), y: y + drr(-0.15, 0.15), z: 34, vz: drr(70, 110), vx: drr(-0.25, 0.25), kind: "star5", col: "#ffffff", s0: 4, s1: 15, life: drr(0.9, 1.3), g: 0, drag: 0.6, fade: 0.25, vr: drr(-3, 3) });
    }
  },
  sparkle(x, y, col = "#fff6a0", n = 3, z = 30) {
    burst(x, y, n, { kind: "star", col, s0: 10, s1: 0, sp0: 0.1, sp1: 0.8, z, vz0: 10, vz1: 60, g: 0, l0: 0.4, l1: 0.9 });
  },
  heal(x, y) {
    for (let i = 0; i < 6; i++) part({ x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: rand(20, 60), vz: rand(40, 80), kind: "heart", col: "#ff6f91", s0: 14, s1: 6, life: rand(0.7, 1.1), add: false, drag: 1, g: 0, rot: 0 });
  },
  levelUp(x, y) {
    ring(x, y, 3.5, "#fff38a", 0.6, 1.4); ring(x, y, 2.2, "#8be9a0", 0.5, 1);
    burst(x, y, 30, { kind: "star5", col: "#fff38a", s0: 14, s1: 0, sp0: 1, sp1: 4.5, z: 40, vz0: 150, vz1: 380, g: -420, l0: 0.8, l1: 1.4 });
    burst(x, y, 20, { kind: "star", col: "#8be9ff", s0: 12, s1: 0, sp0: 0.5, sp1: 2.5, z: 20, vz0: 200, vz1: 420, g: -200, l0: 0.8, l1: 1.3 });
    flash("#fff6c0", 0.35);
  },
  dust(x, y, col = "#ffffff") {
    part({ x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: 2, vz: rand(8, 20), kind: "puff", col, add: false, s0: 8, s1: 16, life: 0.4, fade: 0.35, g: 0 });
  },
  coinPick(x, y) { burst(x, y, 5, { kind: "star", col: "#ffe36e", s0: 10, s1: 0, sp0: 0.5, sp1: 1.5, z: 24, vz0: 40, vz1: 120, g: -260, l0: 0.25, l1: 0.5 }); },
  bubblePop(x, y) {
    burst(x, y, 8, { kind: "dot", col: "#bfefff", s0: 8, s1: 0, sp0: 1, sp1: 3, z: 26, vz0: 0, vz1: 60, g: -100, l0: 0.2, l1: 0.45 });
    ring(x, y, 0.8, "#dff6ff", 0.22, 0.6);
  },
  ember(x, y, col = "#ffb060") {
    part({ x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), z: rand(10, 40), vz: rand(30, 70), vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), kind: "dot", col, s0: 7, s1: 0, life: rand(0.6, 1.2), g: 0, drag: 0.5 });
  },
};

/** Physik-Update (dt = Spielzeit) */
export function updateFx(dt, realDt) {
  const ps = FX.parts;
  let w = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    const dr = Math.max(0, 1 - p.drag * dt);
    p.vx *= dr; p.vy *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vz += p.g * dt; p.z += p.vz * dt;
    if (p.z < 0) { p.z = 0; p.vz = p.bounce ? -p.vz * p.bounce : 0; }
    p.rot += p.vr * dt;
    ps[w++] = p;
  }
  ps.length = w;
  alive = w;
  const ts = FX.texts; w = 0;
  for (let i = 0; i < ts.length; i++) { const t = ts[i]; t.t += realDt; t.z += 38 * realDt; t.x += t.vx * realDt; if (t.t < t.life) ts[w++] = t; }
  ts.length = w;
  const rs = FX.rings; w = 0;
  for (let i = 0; i < rs.length; i++) { const r = rs[i]; r.life -= dt; if (r.life > 0) rs[w++] = r; }
  rs.length = w;
  const ls = FX.lights; w = 0;
  for (let i = 0; i < ls.length; i++) { const l = ls[i]; l.life -= realDt; if (l.life > 0) ls[w++] = l; }
  ls.length = w;
  const tr = FX.trails; w = 0;
  for (let i = 0; i < tr.length; i++) { const r = tr[i]; r.life -= dt; if (r.life > 0) tr[w++] = r; }
  tr.length = w;
  FX.trauma = Math.max(0, FX.trauma - realDt * 1.6);
  FX.flashA = Math.max(0, FX.flashA - realDt * 2.2);
  FX.hurtA = Math.max(0, FX.hurtA - realDt * 1.8);
  FX.zoomPunch = Math.max(0, FX.zoomPunch - realDt * 3);
}
export const fxCount = () => alive;
