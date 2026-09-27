/* boss.js — Bosse v4/v5: Intro-Titelkarte, 3 Phasen (ab 66 % neue Muster, ab 33 % Wut-Phase), Signatur-Angriffe je Welt
   mit gut lesbaren Warnkreisen/-linien, Arena-Effekte, Phasenwechsel mit Kamera-Kick, Sieg mit Zeitlupe + Konfetti + Beute-Regen (MIT)
   v5: Mini-Bosse (Ebene 2/6/10/14/18, 2 Phasen, eigene Wesen + Angriffe), große Arena mit Toren, Handlanger-Wellen mit
   Spawn-Kreis, beim Sieg verschwinden alle Handlanger + Treppe/Portal entsiegelt sich.
   Fairness für Kinder: jede Gefahr wird ≥ 0,8 s vorher angezeigt (MEGASCHWER ×0,75), Phasenwechsel räumen alle Warnungen ab. */
import { BOSSES, BOSS_PHASES, MEGA, MINIS, MINI_PHASE, ARENA, MINION, MINION_CAP, MAX_DEPTH } from "./config.js";
import { G, H, later, playerHurt, makeEnt, steer, walk, faceTo, flyItem, rainItem, winGame, segDist, save } from "./game.js";
import { canStand, nearestFree } from "./world.js";
import { FX, P, part, burst, ring, text, shake, hitstop, slowmo, flash } from "./fx.js";
import { SFX } from "./audio.js";
import { haptic } from "./platform.js";
import { rand, randi, pick, weighted, TAU, clamp } from "./util.js";

// ---------- Aufbau ----------
export function initBoss(e, lvl) {
  if (e.type === "mini") return initMini(e, lvl);
  const b = G.biome, D = BOSSES[b] || BOSSES[1], king = e.type === "king";
  e.isBoss = true; e.isKing = king; e.def = D; e.bi = b;
  e.scale = king ? 2.9 : 1.9; e.r = king ? 1.1 : 0.7;
  e.hp = e.maxHp = Math.round(D.hp[0] + D.hp[1] * lvl);
  e.dmg = D.dmg * (G.mega ? MEGA.dmg : 1);
  e.speed = D.speed * (G.mega ? MEGA.speed : 1);
  e.name = D.name; e.epi = D.epi; e.phase = 1; e.cycle = 0; e.state = "sleep"; e.lastAtk = ""; e.invulT = 0; e.aura = D.aura;
  const skins = ["#86dc5c", "#7fc85a", "#7f8cf0", "#ff8fc8", "#9fd8ff", "#ff2a2a"];
  const look = {
    id: "boss" + b, species: "kobold", skin: king ? "#ff2a2a" : skins[b], ears: "pointy", earsV: b === 4 ? 1 : 0,
    hair: king ? "#6a0010" : ["#4a2a1a", "#3f6a2a", "#e8f4ff", "#ffe070", "#e8f4ff", "#6a0010"][b], eye: king ? "#ffcf3a" : "#c0103a",
    style: ["ohne", "wuschel", "irokese", "zoepfe", "wuschel", "ohne"][b] || "ohne", acc: D.acc,
  };
  look.id = "boss:" + b + ":" + look.style + ":" + look.acc;
  const outfit = king ? "#a0102a" : ["#6a3cdf", "#4a7a3a", "#3f4fb0", "#b0306a", "#3f7fb0", "#8a2a1a"][b];
  e.rig = {
    look, outfit, footCol: "#3a1a2a", cape: king ? "#ffb020" : ["#c0203a", "#3a8a3a", "#6a4ae0", "#ff5aa0", "#5aa8e0", "#c0203a"][b], hat: "krone", hatRed: king,
    mood: "angry", scale: e.scale * 0.86, face: -1, t: 0, sq: 0, moving: false, walkPh: 0, spin: -1,
    wpn: king ? "rainbow" : ["wood", "wood", "crystal", "star", "crystal", "rainbow"][b], wand: 0, flash: false, alpha: 1, tilt: 0, cast: 0,
  };
}
/** Mini-Boss: eigenes Wesen (Sprite aus art.js), 2 Phasen */
function initMini(e, lvl) {
  const M = MINIS[G.depth] || MINIS[2];
  e.isBoss = true; e.isMini = true; e.def = M; e.bi = G.biome; e.kind = M.id;
  e.scale = M.scale; e.r = M.r; e.fly = !!M.fly;
  e.hp = e.maxHp = Math.round(M.hp[0] + M.hp[1] * lvl);
  e.dmg = M.dmg * (G.mega ? MEGA.dmg : 1);
  e.speed = M.speed * (G.mega ? MEGA.speed : 1);
  e.name = M.name; e.epi = M.epi; e.phase = 1; e.cycle = 0; e.state = "sleep"; e.lastAtk = ""; e.invulT = 0; e.aura = M.aura; e.tint = M.col;
  e.rig = { cast: 0, look: { skin: M.col } };
}
const pace = e => (G.mega ? 0.75 : 1) * (e.phase >= 3 || (e.isMini && e.phase >= 2) ? 0.85 : 1) * (e.phase >= 3 ? 0.94 : 1);
const dmgOf = e => e.dmg;

// ---------- Intro ----------
export function wakeBoss(e) {
  if (e.awake) return;
  const p = G.p;
  e.awake = true; e.state = "intro"; e.st = 1.9; e.invulT = 1.9; e.sq = 0.3; e.wokeT = G.t;
  p.invulT = Math.max(p.invulT, 2.1);
  G.camFocus = { x: e.x, y: e.y, t: 1.5 };
  SFX.boss({ x: e.x, y: e.y }); shake(0.5); haptic("boss");
  ring(e.x, e.y, 3.5, e.aura, 0.8, 2.2); ring(e.x, e.y, 2.2, "#ffffff", 0.6, 1.4);
  text(e.x, e.y, "❗", "#ff5d73", 34, 200 * e.scale / 1.75);
  H().bossIntro(e);
  H().boss(e);
}

// ---------- Treffer / Phasen ----------
export function bossHit(e, crit) {
  hitstop(crit ? 80 : 35);
  const frac = e.hp / e.maxHp;
  if (e.isMini) { if (e.phase === 1 && frac <= MINI_PHASE) startPhase(e, 2); return; }
  if (e.phase === 1 && frac <= BOSS_PHASES[0]) startPhase(e, 2);
  else if (e.phase === 2 && frac <= BOSS_PHASES[1]) startPhase(e, 3);
}
function startPhase(e, n) {
  const p = G.p, D = e.def;
  e.phase = n; e.state = "phase"; e.st = 1.5; e.invulT = 1.5; e.cur = null; e.z = 0; e.spin = -1; e.tele = 0; e.alpha = 1;
  // alle offenen Warnungen des Bosses verschwinden (fair: kein Treffer während der Verwandlung)
  G.teles.length = 0;
  for (let i = G.shots.length - 1; i >= 0; i--) if (G.shots[i].kind !== "bubble") G.shots.splice(i, 1);
  // Schockwelle schiebt den Kobold weg (ohne Schaden)
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (d < 5) { p.vx += dx / d * 9; p.vy += dy / d * 9; }
  p.invulT = Math.max(p.invulT, 1.2);
  ring(e.x, e.y, 5, n === 3 ? "#ff5a5a" : e.aura, 0.7, 2.6); ring(e.x, e.y, 3, "#ffffff", 0.5, 1.6);
  burst(e.x, e.y, 30, { kind: "star5", col: n === 3 ? "#ff7a5a" : e.aura, s0: 16, s1: 0, sp0: 2, sp1: 6, z: 60, vz0: 100, vz1: 300, g: -300, l0: 0.6, l1: 1.2 });
  part({ x: e.x, y: e.y, z: 60, kind: "glow", col: n === 3 ? "#ff4a3a" : e.aura, s0: 380, s1: 60, life: 0.7 });
  flash(n === 3 ? "#ffb0a0" : "#ffffff", 0.55); shake(0.8); FX.zoomPunch = 1; hitstop(180); slowmo(0.7, 0.35); haptic("boss");
  G.camFocus = { x: e.x, y: e.y, t: 0.9 };
  SFX.phase({ x: e.x, y: e.y, rage: n === 3 });
  if (e.isMini) H().banner("PHASE 2! ⚡", D.name + " wird wild — neue Angriffe!", "boss");
  else H().banner(n === 2 ? "PHASE 2!" : "WUT-PHASE! 🔥", n === 2 ? D.name + " wird ernst — neue Angriffe!" : D.name + " ist richtig sauer — schneller & wilder!", "boss");
  H().boss(e);
  G.darkness = n === 3 ? 0.16 : e.isMini ? 0.05 : 0.08;
  // neue Phase → gleich eine Handlanger-Welle (mit Spawn-Kreisen), danach im schnelleren Takt der Phase
  const A = G.L.arena;
  if (A) A.waveT = Math.min(A.waveT, 1.6);
}

// ---------- KI ----------
export function bossAI(e, dt) {
  const p = G.p;
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  arenaFx(e, dt);
  if (e.fly && e.state !== "atk" && e.state !== "dash") e.z += (0 - e.z) * Math.min(1, dt * 6);
  if (e.state === "sleep") { e.moving = false; if (d < 7.5) wakeBoss(e); return; }
  if (e.state !== "dash") faceTo(e, p.x, p.y);
  const RS = e.isKing ? 3.2 : 2.5;
  switch (e.state) {
    case "intro":
      e.st -= dt; e.moving = false; e.sq = 0.12 * Math.sin(e.t * 18) * Math.min(1, e.st);
      if (Math.random() < dt * 8) ring(e.x, e.y, rand(1.5, 3), e.aura, 0.4, 0.8);
      if (e.st <= 0) { e.state = "chase"; e.st = 0.6; }
      break;
    case "phase":
      e.st -= dt; e.moving = false; e.sq = 0.2 * Math.sin(e.t * 22);
      if (Math.random() < dt * 20) part({ x: e.x + rand(-1, 1), y: e.y + rand(-1, 1), z: rand(20, 120), vz: rand(60, 140), kind: "star", col: e.phase === 3 ? "#ff7a5a" : e.aura, s0: 12, s1: 0, life: 0.6, g: 0 });
      if (e.st <= 0) { e.state = "chase"; e.st = 0.4; }
      break;
    case "chase": {
      e.st -= dt;
      const sp = e.speed * (e.phase >= 3 ? 1.25 : e.phase === 2 ? 1.1 : 1);
      if (d > (e.isMini ? 2.2 : 1.6)) { const [dx, dy] = steer(e); walk(e, dx, dy, sp, dt); } else e.moving = false;
      if (e.st <= 0) { e.moving = false; chooseAttack(e, d, RS); }
      break;
    }
    case "atk": {
      const c = e.cur;
      c.t += dt;
      ATK[c.k].tick && ATK[c.k].tick(e, c, dt);
      if (c.t >= c.dur) { e.cur = null; e.state = "recover"; e.st = (c.rec ?? 0.8) * (e.phase >= 3 ? 0.6 : 1); e.spin = -1; e.cast = 0; e.rig.cast = 0; }
      break;
    }
    case "dash": {
      const c = e.cur;
      const v = c.v || 17, nx = e.x + c.dx * v * dt, ny = e.y + c.dy * v * dt;
      c.left -= v * dt;
      if (Math.random() < 0.7) part({ x: e.x, y: e.y, z: 10, kind: c.pk || "star5", col: pick(c.pc || ["#ff9ae0", "#fff6a0", "#8fe9ff"]), s0: 12, s1: 0, life: 0.5, g: 0 });
      if (c.left <= 0 || !canStand(G.L.map, nx, ny, e.r * 0.6)) { e.state = "atk"; shake(0.25); SFX.slam({ x: e.x, y: e.y }); if (c.onStop) c.onStop(e, c); }
      else { e.x = nx; e.y = ny; e.moving = true; }
      break;
    }
    case "recover":
      e.st -= dt; e.moving = false; e.tele = Math.max(0, e.tele - dt * 3);
      if (e.st <= 0) { e.state = "chase"; e.st = rand(0.8, 1.4) * pace(e); }
      break;
  }
}
function chooseAttack(e, d, RS) {
  const D = e.def, ph = e.phase, list = [];
  if (e.isMini) {                                          // Mini-Boss: nur seine zwei eigenen Signatur-Angriffe
    list.push([D.sig[0], 4], [D.sig[1], ph >= 2 ? 4 : 1.5]);
  } else {
  if (d < RS - 0.4) list.push(["spin", 5]);
  list.push(["slam", ph >= 2 ? 2 : 3]);
  list.push([D.sig[0], 4]);
  if (ph >= 2) { list.push([D.sig[1], 4]); if (minionCount() < arenaCap()) list.push(["summon", 1.2]); }
  if (D.sig[2] && ph >= 2) list.push([D.sig[2], 3]);
  if (ph >= 3) list.push([D.sig[0], 2]);
  }
  const pool = list.filter(([k]) => k !== e.lastAtk);
  const k = weighted(pool.length ? pool : list);
  e.lastAtk = k; e.cycle++;
  e.state = "atk"; e.cur = { k, t: 0, dur: 1, rec: 0.8 };
  ATK[k].start(e, e.cur);
}

/** Test-/Debug-Hilfe: bestimmten Angriff sofort starten */
export function forceAttack(e, k) {
  if (!e || !ATK[k]) return false;
  if (!e.awake) { e.awake = true; H().boss(e); }
  e.invulT = 0; e.state = "atk"; e.lastAtk = k; e.cur = { k, t: 0, dur: 1, rec: 0.8 };
  ATK[k].start(e, e.cur);
  return true;
}

// ---------- Warnungen ----------
function circle(x, y, r, delay, max, e, fx, extra) {
  const m = G.L.map, f = canStand(m, x, y, 0.1) ? { x, y } : nearestFree(m, x, y, 0.1);
  const t = { kind: "circle", x: f.x, y: f.y, r, t: -delay, max, dmg: dmgOf(e), fx, onEnd: impact, ...extra };
  G.teles.push(t); return t;
}
function line(x, y, ang, len, w, delay, max, e, fx, extra) {
  const t = { kind: "line", x, y, x2: x + Math.cos(ang) * len, y2: y + Math.sin(ang) * len, w, t: -delay, max, dmg: dmgOf(e), fx, onEnd: impact, ...extra };
  G.teles.push(t); return t;
}
const FXC = { slime: ["#9aff7a", "#e8ffd8"], spore: ["#b6ff8a", "#ffd0f0"], vine: ["#7fd46a", "#d0ff9a"], crystal: ["#9ff0ff", "#ffffff"], beam: ["#e0f8ff", "#b8a8ff"], candy: ["#ff8fd0", "#fff38a"], ice: ["#ffffff", "#bfe9ff"], fire: ["#ff9a3a", "#ffd060"], slam: ["#fff0d0", "#ffffff"] };
let impN = 0;
/** Einschlag-Effekt am Ende einer Warnung */
function impact(t) {
  const [c1, c2] = FXC[t.fx] || FXC.slam;
  if (t.kind === "line") {
    const n = Math.max(3, Math.round(Math.hypot(t.x2 - t.x, t.y2 - t.y) / 1.2));
    for (let i = 0; i <= n; i++) { const k = i / n; P.sparkle(t.x + (t.x2 - t.x) * k, t.y + (t.y2 - t.y) * k, i % 2 ? c1 : c2, 2, 20); }
    ring((t.x + t.x2) / 2, (t.y + t.y2) / 2, 1.2, c1, 0.25, 0.6);
  } else {
    ring(t.x, t.y, t.r, c1, 0.3, 1.1);
    burst(t.x, t.y, t.r > 1.5 ? 12 : 7, { kind: t.fx === "spore" || t.fx === "candy" || t.fx === "ice" ? "puff" : "star", col: c1, add: t.fx === "crystal" || t.fx === "fire", s0: 16, s1: 2, sp0: 0.6, sp1: 2.4, z: 10, vz0: 40, vz1: 160, g: -300, l0: 0.3, l1: 0.6, drag: 2 });
    if (t.fx === "fire") for (let k = 0; k < 4; k++) P.ember(t.x, t.y, c2);
  }
  shake(t.r > 1.5 ? 0.22 : 0.1);
  if ((impN++ & 1) === 0) SFX.impact({ x: t.x, y: t.y, kind: t.fx });
}
/** Einschlag eines Schallrings: Glitzer rundherum */
function impactRing(t) {
  const [c1, c2] = FXC[t.fx] || FXC.beam, rr = (t.r + t.r0) / 2, n = Math.round(rr * 5);
  for (let i = 0; i < n; i++) { const a = i / n * TAU; P.sparkle(t.x + Math.cos(a) * rr, t.y + Math.sin(a) * rr, i % 2 ? c1 : c2, 1, 20); }
  ring(t.x, t.y, t.r, c1, 0.35, 1.2); shake(0.15);
  if ((impN++ & 1) === 0) SFX.impact({ x: t.x, y: t.y, kind: t.fx });
}
/** Boss ruft Handlanger: zusätzliche Welle (mit Spawn-Kreisen, Deckel beachtet) */
function summon(e, n) { spawnWave(e, n); }

// ---------- Angriffe ----------
// start(e,c): Warnungen anlegen, c.dur = Dauer des Angriffs · tick(e,c,dt): Animation/Folgeaktionen
const ATK = {
  spin: {
    start(e, c) {
      const f = pace(e), RS = e.isKing ? 3.2 : 2.5;
      c.wind = 0.85 * f; c.dur = c.wind + 0.5; c.rec = 0.9;
      G.teles.push({ kind: "circle", x: e.x, y: e.y, r: RS, t: 0, max: c.wind, follow: e, dmg: dmgOf(e), fx: "slam", onEnd: () => { SFX.swing({ x: e.x, y: e.y, big: true }); SFX.slam({ x: e.x, y: e.y }); shake(0.3); haptic("slam"); ring(e.x, e.y, RS, "#ffd0e0", 0.4, 1.6); } });
      SFX.tele({ x: e.x, y: e.y });
    },
    tick(e, c) { if (c.t < c.wind) { e.tele = c.t / c.wind; e.sq = 0.1 * e.tele; } else { e.tele = 0; e.spin = Math.min(1, (c.t - c.wind) / 0.5); } },
  },
  slam: {
    start(e, c) {
      const p = G.p, f = pace(e);
      c.RJ = c.RJ || (e.isKing ? 2.6 : 2.0);
      c.n = c.n || (e.phase >= 3 ? 2 : 1); c.i = 0; c.wind = 0.4 * f; c.jump = 0.7; c.dur = c.n * (c.wind + c.jump) + 0.1; c.rec = 1.0;
      nextJump(e, c, p.x, p.y, c.RJ);
    },
    tick(e, c, dt) {
      const seg = c.wind + c.jump, i = Math.min(c.n - 1, Math.floor(c.t / seg)), lt = c.t - i * seg;
      if (i !== c.i) { c.i = i; const p = G.p; nextJump(e, c, p.x, p.y, c.RJ); }
      if (lt < c.wind) { e.sq = 0.2; e.z = 0; return; }
      const k = Math.min(1, (lt - c.wind) / c.jump);
      const nx = c.sx + (c.jx - c.sx) * k, ny = c.sy + (c.jy - c.sy) * k;
      if (canStand(G.L.map, nx, ny, e.r * 0.6)) { e.x = nx; e.y = ny; }
      e.z = Math.sin(Math.PI * k) * (e.isKing ? 160 : e.isMini ? 105 : 125);
      if (k >= 1 && !c.landed[i]) {
        c.landed[i] = true; e.z = 0; e.sq = 0.35;
        SFX.slam({ x: e.x, y: e.y }); shake(0.6); haptic("slam"); FX.zoomPunch = 0.8;
        burst(e.x, e.y, 18, { kind: "puff", col: c.col || "#ffffff", add: false, s0: 26, s1: 6, sp0: 1.5, sp1: 4, z: 6, vz0: 10, vz1: 60, g: 0, drag: 3, l0: 0.4, l1: 0.8, fade: 0.8 });
        if (!canStand(G.L.map, e.x, e.y, e.r * 0.6)) { const f = nearestFree(G.L.map, e.x, e.y, e.r * 0.6); e.x = f.x; e.y = f.y; }
      }
    },
  },
  summon: {
    start(e, c) { c.dur = 0.7; c.rec = 0.6; c.done = false; },
    tick(e, c) { e.sq = 0.2 * Math.sin(e.t * 20); if (c.t > 0.6 && !c.done) { c.done = true; summon(e, e.phase >= 3 ? 2 : 1); } },
  },
  // --- Moosbart ---
  spores: {
    start(e, c) {
      const p = G.p, f = pace(e), n = [0, 4, 6, 8][e.phase];
      circle(p.x, p.y, 1.15, 0, 1.0 * f, e, "spore");
      for (let k = 1; k < n; k++) { const a = rand(0, TAU), r = rand(1.4, 3.8); circle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.05, k * 0.09, 1.0 * f, e, "spore"); }
      c.dur = 1.0 * f + n * 0.09 + 0.1; c.rec = 0.7; e.rig.cast = 1;
      SFX.tele({ x: e.x, y: e.y });
      burst(e.x, e.y, 10, { kind: "puff", col: "#c8ffb0", add: false, s0: 16, s1: 4, sp0: 0.5, sp1: 2, z: 80, vz0: 40, vz1: 120, g: 0, drag: 2, l0: 0.5, l1: 0.9 });
    },
  },
  vines: {
    start(e, c) {
      const p = G.p, f = pace(e), n = e.phase >= 3 ? 5 : 3, a0 = Math.atan2(p.y - e.y, p.x - e.x);
      for (let k = 0; k < n; k++) line(e.x, e.y, a0 + (k - (n - 1) / 2) * 0.34, 9, 0.9, k * 0.06, 0.95 * f, e, "vine");
      c.dur = 0.95 * f + n * 0.06 + 0.15; c.rec = 0.8; e.rig.cast = 1;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  // --- Glitzerzahn ---
  crystals: {
    start(e, c) {
      const p = G.p, f = pace(e), n = [0, 8, 11, 14][e.phase];
      circle(p.x, p.y, 0.95, 0.1, 0.9 * f, e, "crystal");
      for (let k = 1; k < n; k++) { const a = rand(0, TAU), r = rand(1, 4.2); circle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0.85, k * 0.07, 0.9 * f, e, "crystal"); }
      c.dur = 0.9 * f + n * 0.07 + 0.1; c.rec = 0.7; e.rig.cast = 1;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  prism: {
    start(e, c) {
      const f = pace(e), a0 = Math.random() < 0.5 ? 0 : Math.PI / 4;
      for (let k = 0; k < 4; k++) line(e.x, e.y, a0 + k * Math.PI / 2, 10, 1.0, 0, 1.0 * f, e, "beam");
      c.dur = 1.0 * f + 0.1; c.rec = 0.8;
      if (e.phase >= 3) { for (let k = 0; k < 4; k++) line(e.x, e.y, a0 + Math.PI / 4 + k * Math.PI / 2, 10, 1.0, 0.75 * f, 1.0 * f, e, "beam"); c.dur += 0.75 * f; }
      e.rig.cast = 1; SFX.tele({ x: e.x, y: e.y });
    },
    tick(e, c) { e.spin = (c.t * 0.8) % 1; },
  },
  // --- Zuckerschnute ---
  candy: {
    start(e, c) {
      const p = G.p, f = pace(e), n = [0, 3, 4, 6][e.phase], dur = 1.1 * f;
      for (let k = 0; k < n; k++) {
        const a = rand(0, TAU), r = k === 0 ? 0 : rand(1.2, 3.4), tx = p.x + Math.cos(a) * r, ty = p.y + Math.sin(a) * r, dl = k * 0.12;
        const t = circle(tx, ty, 1.3, dl, dur, e, "candy");
        later(dl, () => G.shots.push({ kind: "lob", x0: e.x, y0: e.y, x: e.x, y: e.y, tx: t.x, ty: t.y, z: 40, h: 200, t: 0, dur, life: dur + 0.2, col: pick(["#ff8fd0", "#8fe9ff", "#fff38a", "#b3ff9a"]), dmg: 0 }), "boss");
      }
      c.dur = dur + n * 0.12 + 0.1; c.rec = 0.7; e.rig.cast = 1;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  rush: {
    start(e, c) { c.n = e.phase >= 3 ? 3 : 1; c.i = -1; c.seg = 0.95 * pace(e) + 0.45; c.dur = c.n * c.seg; c.rec = 0.9; },
    tick(e, c) {
      const i = Math.floor(c.t / c.seg);
      if (i !== c.i && i < c.n) {
        c.i = i; const p = G.p, a = Math.atan2(p.y - e.y, p.x - e.x), len = Math.hypot(p.x - e.x, p.y - e.y) + 3, f = pace(e);
        line(e.x, e.y, a, len, c.w || 1.4, 0, 0.95 * f, e, c.fx || "candy", { onEnd: (t) => { impact(t); if (G.ents.includes(e) && e.cur === c && e.state === "atk") { e.state = "dash"; e.cur = c; c.dx = Math.cos(a); c.dy = Math.sin(a); c.left = len; } } });
        SFX.tele({ x: e.x, y: e.y }); e.sq = 0.25;
      }
    },
  },
  // --- Frostnase ---
  icicles: {
    start(e, c) {
      const p = G.p, f = pace(e), n = [0, 3, 4, 5][e.phase], a = Math.atan2(p.y - e.y, p.x - e.x), nx = -Math.sin(a), ny = Math.cos(a);
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * 1.7, sx = e.x + nx * off - Math.cos(a) * 1.5, sy = e.y + ny * off - Math.sin(a) * 1.5;
        line(sx, sy, a, 11, 0.8, k * 0.15, 1.0 * f, e, "ice");
      }
      c.dur = 1.0 * f + n * 0.15 + 0.1; c.rec = 0.8; e.rig.cast = 1;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  snowball: {
    start(e, c) {
      const p = G.p, f = pace(e), n = [0, 1, 2, 3][e.phase], a0 = Math.atan2(p.y - e.y, p.x - e.x);
      for (let k = 0; k < n; k++) {
        const a = a0 + (k - (n - 1) / 2) * 0.28;
        line(e.x, e.y, a, 10, 1.3, 0, 0.8 * f, e, "ice", { dmg: 0, onEnd: () => { if (!G.ents.includes(e)) return; G.shots.push({ kind: "snow", x: e.x + Math.cos(a) * 0.8, y: e.y + Math.sin(a) * 0.8, z: 22, vx: Math.cos(a) * 4.6, vy: Math.sin(a) * 4.6, life: 3, t: 0, r: 0.7, col: "#ffffff", dmg: dmgOf(e) }); } });
      }
      c.dur = 0.8 * f + 0.4; c.rec = 0.9; e.sq = 0.3;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  // --- Kellerkönig ---
  fireRing: {
    start(e, c) { c.wind = 0.9 * pace(e); c.dur = c.wind + (e.phase >= 3 ? 0.7 : 0.1); c.rec = 1.0; c.fired = 0; SFX.tele({ x: e.x, y: e.y }); },
    tick(e, c) {
      e.tele = Math.min(1, c.t / c.wind);
      const want = c.t >= c.wind ? (e.phase >= 3 && c.t >= c.wind + 0.6 ? 2 : 1) : 0;
      while (c.fired < want) {
        const n = (G.mega ? 16 : 12) + (e.phase - 1) * 2, off = Math.random() * TAU;
        for (let k = 0; k < n; k++) { const a = off + k * TAU / n; G.shots.push({ kind: "fire", x: e.x, y: e.y, z: 60, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, life: 3.2, t: 0, col: "#ff8a3a", dmg: Math.max(1, dmgOf(e) - 1) }); }
        SFX.shoot({ x: e.x, y: e.y, fire: true }); SFX.slam({ x: e.x, y: e.y }); shake(0.3); haptic("slam");
        c.fired++; e.tele = 0;
      }
    },
  },
  meteors: {
    start(e, c) {
      const p = G.p, f = pace(e), n = [0, 5, 7, 10][e.phase];
      circle(p.x, p.y, 1.25, 0.05, 1.0 * f, e, "fire");
      for (let k = 1; k < n; k++) { const a = rand(0, TAU), r = rand(1.3, 4); circle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.2, k * 0.1, 1.0 * f, e, "fire"); }
      c.dur = 1.0 * f + n * 0.1 + 0.1; c.rec = 0.8; e.rig.cast = 1;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  flameCross: {
    start(e, c) {
      const f = pace(e);
      for (let k = 0; k < 4; k++) line(e.x, e.y, k * Math.PI / 2, 11, 1.1, 0, 1.0 * f, e, "fire");
      c.dur = 1.0 * f + 0.1; c.rec = 0.8;
      if (e.phase >= 3) { for (let k = 0; k < 4; k++) line(e.x, e.y, Math.PI / 4 + k * Math.PI / 2, 11, 1.1, 0.7 * f, 1.0 * f, e, "fire"); c.dur += 0.7 * f; }
      SFX.tele({ x: e.x, y: e.y });
    },
    tick(e, c) { e.spin = (c.t * 0.6) % 1; },
  },
  // ================= v5: Mini-Bosse =================
  // --- Schlabbo (Ebene 2): Glibber-Spucke (Klumpen fliegen sichtbar in Warnkreise) + Bauchplatscher (großer Sprung) ---
  glibber: {
    start(e, c) {
      const p = G.p, f = pace(e), n = e.phase >= 2 ? 5 : 3, dur = 1.1 * f;
      for (let k = 0; k < n; k++) {
        const a = rand(0, TAU), r = k === 0 ? 0 : rand(1.3, 3.2), dl = k * 0.14;
        const t = circle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.1, dl, dur, e, "slime");
        later(dl, () => { if (G.ents.includes(e)) G.shots.push({ kind: "lob", x0: e.x, y0: e.y, x: e.x, y: e.y, tx: t.x, ty: t.y, z: 40, h: 170, t: 0, dur, life: dur + 0.2, col: pick(["#8fe07a", "#b6ff8a", "#6fc86a"]), dmg: 0, glob: true }); }, "boss");
      }
      c.dur = dur + n * 0.14 + 0.1; c.rec = 0.8; e.sq = -0.25;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  platsch: {
    start(e, c) { c.RJ = 2.2; c.n = e.phase >= 2 ? 2 : 1; c.col = "#b6ff8a"; c.fx = "slime"; ATK.slam.start(e, c); c.rec = 1.1; },
    tick(e, c, dt) { ATK.slam.tick(e, c, dt); },
  },
  // --- Funkelflatter (Ebene 6): Kristall-Echo (Kreise laufen auf den Kobold zu) + Schallring (Ringe breiten sich aus) ---
  echo: {
    start(e, c) {
      const p = G.p, f = pace(e), n = e.phase >= 2 ? 7 : 5, a = Math.atan2(p.y - e.y, p.x - e.x), dist = Math.hypot(p.x - e.x, p.y - e.y);
      const step = Math.max(1.2, (dist + 2) / n);
      for (let k = 1; k <= n; k++) circle(e.x + Math.cos(a) * step * k, e.y + Math.sin(a) * step * k, 1.0, k * 0.12, 0.9 * f, e, "crystal");
      if (e.phase >= 2) { const b = a + (Math.random() < 0.5 ? 0.62 : -0.62); for (let k = 1; k <= n - 2; k++) circle(e.x + Math.cos(b) * step * k, e.y + Math.sin(b) * step * k, 0.9, 0.5 + k * 0.12, 0.9 * f, e, "crystal"); }
      c.dur = 0.9 * f + n * 0.12 + (e.phase >= 2 ? 0.6 : 0.1); c.rec = 0.8; e.sq = 0.2;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  schall: {
    start(e, c) {
      const f = pace(e), rings = e.phase >= 2 ? [[1.3, 2.9], [2.9, 4.5], [4.5, 6.1]] : [[1.3, 2.9], [2.9, 4.5]];
      rings.forEach(([r0, r], k) => G.teles.push({ kind: "ring", x: e.x, y: e.y, r0, r, t: -k * 0.55, max: 1.0 * f, dmg: dmgOf(e), fx: "beam", onEnd: impactRing }));
      c.dur = 1.0 * f + rings.length * 0.55 + 0.1; c.rec = 0.9;
      SFX.tele({ x: e.x, y: e.y });
    },
    tick(e, c) { e.z = 26 + Math.sin(c.t * 8) * 6; e.sq = 0.1 * Math.sin(c.t * 20); if (Math.random() < 0.3) part({ x: e.x, y: e.y, z: 60, kind: "star", col: "#c8b8ff", s0: 0, s1: 12, life: 0.4, g: 0 }); },
  },
  // --- Lolli-Lutz (Ebene 10): Streusel-Regen (Hüpfkästchen, zwei Wellen im Wechsel) + Brause-Puff (Kreis um ihn, dann Bonbons rundherum) ---
  streusel: {
    start(e, c) {
      const p = G.p, f = pace(e), N = e.phase >= 2 ? 4 : 3, sp = 1.7, o = (N - 1) / 2;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const w = (i + j) % 2;
        if (N === 3 && w === 1 && Math.random() < 0.3) continue;
        circle(p.x + (i - o) * sp, p.y + (j - o) * sp, 0.8, w * 0.75 * f, 0.9 * f, e, "candy");
      }
      c.dur = 0.9 * f + 0.75 * f + 0.2; c.rec = 0.8; e.sq = 0.2;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  brause: {
    start(e, c) {
      const f = pace(e); c.wind = 0.95 * f; c.dur = c.wind + 0.35; c.rec = 1.0; c.fired = false;
      G.teles.push({ kind: "circle", x: e.x, y: e.y, r: 2.6, t: 0, max: c.wind, follow: e, dmg: dmgOf(e), fx: "candy", onEnd: impact });
      SFX.tele({ x: e.x, y: e.y });
    },
    tick(e, c) {
      if (c.t < c.wind) { e.tele = c.t / c.wind; e.sq = 0.15 * e.tele; return; }
      if (c.fired) return;
      c.fired = true; e.tele = 0; e.sq = -0.3;
      const n = e.phase >= 2 ? 10 : 6, off = Math.random() * TAU;
      for (let k = 0; k < n; k++) { const a = off + k * TAU / n; G.shots.push({ kind: "orb", x: e.x, y: e.y, z: 40, vx: Math.cos(a) * 2.8, vy: Math.sin(a) * 2.8, life: 3, t: 0, col: pick(["#ff8fd0", "#8fe9ff", "#fff38a", "#b3ff9a"]), dmg: Math.max(1, dmgOf(e) - 1) }); }
      burst(e.x, e.y, 16, { kind: "puff", col: "#ffd0f0", add: false, s0: 22, s1: 6, sp0: 1, sp1: 3.5, z: 30, vz0: 20, vz1: 80, g: 0, drag: 3, l0: 0.4, l1: 0.8, fade: 0.8 });
      SFX.shoot({ x: e.x, y: e.y }); shake(0.25);
    },
  },
  // --- Bibber (Ebene 14): Frost-Atem (kurzer Eis-Fächer) + Buh-Blinzeln (taucht an der markierten Stelle hinter dem Kobold auf) ---
  frostatem: {
    start(e, c) {
      const p = G.p, f = pace(e), n = e.phase >= 2 ? 5 : 3, a0 = Math.atan2(p.y - e.y, p.x - e.x);
      for (let k = 0; k < n; k++) line(e.x, e.y, a0 + (k - (n - 1) / 2) * 0.42, 6.5, 1.0, k * 0.05, 0.95 * f, e, "ice");
      c.dur = 0.95 * f + n * 0.05 + 0.15; c.rec = 0.8; c.a = a0;
      SFX.tele({ x: e.x, y: e.y });
    },
    tick(e, c) { if (Math.random() < 0.5) part({ x: e.x + Math.cos(c.a) * 0.6, y: e.y + Math.sin(c.a) * 0.6, z: 60, vx: Math.cos(c.a) * 2, vy: Math.sin(c.a) * 2, kind: "puff", col: "#eaf6ff", add: false, s0: 8, s1: 16, life: 0.5, g: 0, fade: 0.5 }); },
  },
  blinzel: {
    start(e, c) {
      const p = G.p, f = pace(e), m = G.L.map, lm = Math.hypot(p.lastMx, p.lastMy) || 1;
      const fr = nearestFree(m, p.x - p.lastMx / lm * 1.1, p.y - p.lastMy / lm * 1.1, e.r * 0.8);
      c.wind = 1.0 * f; c.dur = c.wind + 0.45; c.rec = 0.9; c.tx = fr.x; c.ty = fr.y; c.done = false;
      circle(fr.x, fr.y, 1.6, 0, c.wind, e, "ice");
      if (e.phase >= 2) for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; circle(fr.x + Math.cos(a) * 2.6, fr.y + Math.sin(a) * 2.6, 0.9, c.wind * 0.9, 0.9 * f, e, "ice"); }
      P.poof(e.x, e.y, "#e8f4ff"); SFX.tele({ x: e.x, y: e.y });
    },
    tick(e, c) {
      e.alpha = c.t < c.wind ? Math.max(0.12, 1 - c.t * 4) : Math.min(1, 0.12 + (c.t - c.wind) * 5);
      if (!c.done && c.t >= c.wind) {
        c.done = true; e.x = c.tx; e.y = c.ty; e.sq = 0.35;
        P.poof(e.x, e.y, "#e8f4ff"); text(e.x, e.y, "Buh! 👻", "#eaf6ff", 22, 120); shake(0.3);
      }
    },
  },
  // --- Glutpanzer Gustav (Ebene 18): Lava-Kleckse (Glut bleibt kurz liegen) + Hornstoß (angekündigte Bahn, ab Phase 2 zweimal) ---
  lava: {
    start(e, c) {
      const p = G.p, f = pace(e), n = e.phase >= 2 ? 7 : 4;
      for (let k = 0; k < n; k++) {
        const a = rand(0, TAU), r = k === 0 ? 0 : rand(1.4, 3.8);
        circle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.15, k * 0.1, 1.0 * f, e, "fire", {
          onEnd: (t) => { impact(t); G.teles.push({ kind: "circle", x: t.x, y: t.y, r: t.r * 0.85, t: 0, max: 1.6, dmg: Math.max(1, dmgOf(e) - 1), fx: "fire", burn: true }); },
        });
      }
      c.dur = 1.0 * f + n * 0.1 + 0.1; c.rec = 0.8; e.sq = -0.2;
      SFX.tele({ x: e.x, y: e.y });
    },
  },
  horn: {
    start(e, c) { c.n = e.phase >= 2 ? 2 : 1; c.i = -1; c.seg = 0.95 * pace(e) + 0.55; c.dur = c.n * c.seg; c.rec = 1.0; c.v = 13; c.w = 1.6; c.fx = "fire"; c.pk = "puff"; c.pc = ["#ffb060", "#ff7a2a", "#8a5a48"]; },
    tick(e, c) { ATK.rush.tick(e, c); },
  },
};
function nextJump(e, c, px, py, RJ) {
  c.sx = e.x; c.sy = e.y; c.jx = px; c.jy = py; c.landed = c.landed || [];
  G.teles.push({ kind: "circle", x: px, y: py, r: RJ, t: 0, max: c.wind + c.jump, dmg: dmgOf(e), fx: c.fx || "slam", onEnd: impact });
  SFX.tele({ x: e.x, y: e.y });
}

// ---------- Arena-Effekte ----------
function arenaFx(e, dt) {
  const b = G.biome, p = G.p;
  if (e.isKing && Math.random() < dt * 30) P.ember(e.x + rand(-0.9, 0.9), e.y + rand(-0.9, 0.9), Math.random() < 0.5 ? "#ff7a2a" : "#ffd060");
  if (!e.awake) return;
  // Wut-Aura: Dampfwölkchen
  if (e.phase >= 3 && Math.random() < dt * 10) part({ x: e.x + rand(-0.6, 0.6), y: e.y + rand(-0.6, 0.6), z: 90 * e.scale / 1.9, vz: rand(40, 90), kind: "puff", col: "#ffd0d0", add: false, s0: 10, s1: 22, life: 0.8, fade: 0.4, g: 0 });
  const rate = (e.phase === 1 ? 5 : e.phase === 2 ? 9 : 15) * FX.budget;
  if (Math.random() > rate * dt) return;
  const x = p.x + rand(-6, 6), y = p.y + rand(-6, 6);
  switch (e.def.arena) {
    case "leaf": part({ x, y, z: rand(120, 180), vz: rand(-40, -25), vx: rand(-0.3, 0.3), kind: "heart", col: pick(["#8fdc6a", "#c8f09a", "#b08a4a"]), add: false, s0: 9, s1: 7, life: rand(3, 4), drag: 0, g: 0, fade: 0.2, vr: 3 }); break;
    case "crystal": part({ x, y, z: rand(20, 120), kind: "star", col: pick(["#9ff0ff", "#ffffff", "#c8b8ff"]), s0: 0, s1: 14, life: rand(0.5, 1), g: 0, fade: 0.2, vr: 3 }); break;
    case "candy": part({ x, y, z: rand(140, 200), vz: rand(-60, -30), vx: rand(-0.3, 0.3), kind: "conf", col: pick(["#ff8fd0", "#8fe9ff", "#fff38a", "#b3ff9a", "#c79bff"]), add: false, s0: 9, s1: 8, life: rand(2.5, 3.5), drag: 0, g: 0, fade: 0.2, vr: 6 }); break;
    case "snow": part({ x, y, z: rand(140, 200), vz: rand(-45, -30), vx: rand(0.2, 0.6), kind: "dot", col: "#ffffff", add: false, s0: 7, s1: 6, life: rand(3, 4), drag: 0, g: 0, fade: 0.2 }); break;
    case "ember": P.ember(x, y, pick(["#ffb060", "#ff7a2a", "#ffd060"])); break;
  }
}

// ---------- v5: Arena (Wecken, Tore, Handlanger-Wellen) ----------
const inArena = (A, x, y, pad = 0) => x > A.x + pad && y > A.y + pad && x < A.x + A.w - pad && y < A.y + A.h - pad;
/** läuft gerade ein Bosskampf? (Boss wach und am Leben) */
export function bossFight() { const b = G.boss; return !!(b && b.awake && b.hp > 0 && G.ents.includes(b)); }
/** Handlanger jetzt (lebend + gerade im Spawn-Kreis) */
export function minionCount() { let n = G.spawns.length; for (const e of G.ents) if (e.minion) n++; return n; }
const arenaDef = () => ARENA[G.depth] || ARENA[4];
export function arenaCap() { return Math.min(MINION_CAP, arenaDef().cap); }

export function arenaTick(dt) {
  const A = G.L.arena, b = G.boss, p = G.p;
  // Tor-Animation (hochwachsen / einsinken)
  for (const g of A.gates) g.k += ((A.closed ? 1 : 0) - g.k) * Math.min(1, dt * 7);
  // Handlanger im Spawn-Kreis: 0,8 s sichtbar (Kreis + Rauch), dann erscheinen sie
  for (let i = G.spawns.length - 1; i >= 0; i--) {
    const s = G.spawns[i]; s.t += dt;
    if (Math.random() < dt * 16 * FX.budget) part({ x: s.x + rand(-0.5, 0.5), y: s.y + rand(-0.5, 0.5), z: rand(0, 10), vz: rand(30, 70), kind: "puff", col: s.col, add: false, s0: 8, s1: 18, life: 0.6, g: 0, fade: 0.5 });
    if (s.t >= s.max) { G.spawns.splice(i, 1); materialize(s); }
  }
  if (G.screen !== "play" || !b || b.hp <= 0 || !G.ents.includes(b)) return;
  // Boss wacht auf, sobald der Kobold wirklich in der (großen) Arena steht
  if (!b.awake && inArena(A, p.x, p.y, 1.5)) wakeBoss(b);
  if (!b.awake) return;
  // Tore schließen sich hinter dem Kobold — fair: erst wenn er drin und weg vom Eingang ist; nach dem Sieg wieder auf
  if (!A.closed && !A.optional && !A.done && inArena(A, p.x, p.y, 1.2) && inArena(A, b.x, b.y, 0.5) && A.gates.every(g => Math.hypot(g.x - p.x, g.y - p.y) > 1.7)) closeGates(A, b);
  if (b.state === "intro") return;
  if (A.waveT === undefined) A.waveT = MINION.first;
  A.waveT -= dt;
  if (A.waveT <= 0) {
    const ad = arenaDef(), ph = Math.min(b.phase, ad.wave.length) - 1;
    A.waveT = ad.wave[ph];
    spawnWave(b, ad.n[ph]);
  }
}
/** Welle: Spawn-Kreise an den Rand-Punkten der Arena (nicht direkt neben dem Kobold), Deckel beachtet */
export function spawnWave(b, n) {
  const A = G.L.arena, p = G.p;
  if (!A || !b) return 0;
  n = Math.min(n, arenaCap() - minionCount());
  if (n <= 0) return 0;
  const pool = (b.def && b.def.minions) || [["slime", 1]];
  const free = A.spawns.filter(s => Math.hypot(s.x - p.x, s.y - p.y) > 3.5 && !G.spawns.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 0.9));
  const list = (free.length ? free : A.spawns).slice().sort(() => Math.random() - 0.5);
  for (let k = 0; k < n; k++) {
    const s = list[k % list.length], j = k >= list.length ? 0.8 : 0;
    const f = nearestFree(G.L.map, s.x + rand(-j, j), s.y + rand(-j, j), 0.3);
    G.spawns.push({ x: f.x, y: f.y, t: 0, max: MINION.spawnT, type: weighted(pool), col: b.aura || "#c9a0ff" });
  }
  SFX.reveal({ x: list[0].x, y: list[0].y });
  return n;
}
function materialize(s) {
  const mi = makeEnt(s.type, s.x, s.y);
  mi.minion = true; mi.state = "chase"; mi.atkCd = rand(0.8, 1.4);           // kurze Schonfrist nach dem Erscheinen
  mi.hp = mi.maxHp = Math.max(1, Math.round(mi.maxHp * MINION.hp)); mi.xp = Math.max(1, Math.round(mi.xp * MINION.xp));
  mi.sq = 0.35;
  G.ents.push(mi);
  P.poof(s.x, s.y, s.col); ring(s.x, s.y, 1.1, s.col, 0.4, 1); SFX.poof({ x: s.x, y: s.y });
}
function closeGates(A, b) {
  const m = G.L.map;
  A.closed = true;
  for (const g of A.gates) {
    m.block[g.ty * m.w + g.tx] = 1;
    for (const e of G.ents) if (Math.floor(e.x) === g.tx && Math.floor(e.y) === g.ty) { const f = nearestFree(m, e.x, e.y, e.r * 0.8); e.x = f.x; e.y = f.y; }
    burst(g.x, g.y, 5, { kind: "puff", col: "#e8dcc8", add: false, s0: 14, s1: 4, sp0: 0.5, sp1: 1.5, z: 6, vz0: 20, vz1: 60, g: 0, drag: 3, l0: 0.4, l1: 0.7, fade: 0.8 });
  }
  G.flowT = 0;
  SFX.slam({ x: G.p.x, y: G.p.y }); shake(0.3); haptic("slam");
  // Hinweis erst nach der Boss-Titelkarte (sonst überdecken sie sich)
  const wait = Math.max(0, 2.7 - (G.t - (b.wokeT ?? G.t)));
  later(wait, () => { if (A.closed && G.boss === b) H().toast("🚪 Die Tore sind zu — besiege " + b.name + ", dann gehen sie wieder auf!"); }, "boss");
}
function openGates(A) {
  if (!A.closed) return;
  const m = G.L.map;
  A.closed = false;
  for (const g of A.gates) { m.block[g.ty * m.w + g.tx] = 0; P.sparkle(g.x, g.y, "#fff6c0", 4, 30); }
  G.flowT = 0;
}
/** Beim Sieg: ALLE Handlanger verschwinden freundlich (auch die im Spawn-Kreis), keine Nachzügler aus Timern */
export function despawnMinions() {
  for (const o of G.ents.slice()) if (o.minion) {
    P.poof(o.x, o.y, "#fff6c0"); P.sparkle(o.x, o.y, "#fff38a", 6, 40);
    const j = G.ents.indexOf(o); if (j >= 0) G.ents.splice(j, 1);
    if (G.p.foe === o) G.p.foe = null;
  }
  for (const s of G.spawns) { P.sparkle(s.x, s.y, "#fff38a", 5, 20); ring(s.x, s.y, 0.9, "#fff6c0", 0.3, 0.8); }
  G.spawns.length = 0;
  for (let i = G.later.length - 1; i >= 0; i--) if (G.later[i] && G.later[i].tag === "boss") G.later.splice(i, 1);
  for (let i = G.shots.length - 1; i >= 0; i--) if (G.shots[i].kind !== "bubble") G.shots.splice(i, 1);
  G.teles.length = 0;
}
/** Treppe (Ebene 20: Portal) öffnet sich sichtbar nach dem Sieg */
function unsealStairs() {
  const st = G.L && G.L.stairs, p = G.p;
  if (!st || !st.sealed) return;
  st.sealed = false; st.openT = G.t;
  st.armed = Math.hypot(p.x - st.x, p.y - st.y) > 1.2;   // wer gerade draufsteht, muss einmal runter und wieder drauf
  ring(st.x, st.y, 2.4, "#ffe9a8", 0.7, 1.8); ring(st.x, st.y, 1.2, "#ffffff", 0.5, 1.2);
  burst(st.x, st.y, 22, { kind: "star5", col: "#ffe36e", s0: 16, s1: 0, sp0: 1, sp1: 4, z: 20, vz0: 120, vz1: 320, g: -300, l0: 0.6, l1: 1.2 });
  part({ x: st.x, y: st.y, z: 20, kind: "glow", col: "#ffe9a8", s0: 300, s1: 60, life: 0.9 });
  text(st.x, st.y, G.depth >= MAX_DEPTH ? "✨ Das 20. Portal ist offen!" : "⬇️ Die Treppe ist offen!", "#fff6c0", 20, 110);
  SFX.reveal({ x: st.x, y: st.y }); SFX.chest({ x: st.x, y: st.y }); haptic("chest");
  G.camFocus = { x: st.x, y: st.y, t: 1.1 };
}

// ---------- Sieg ----------
export function bossKilled(e) {
  const p = G.p, mini = !!e.isMini, A = G.L.arena;
  G.boss = null; H().boss(null);
  // Sieg merken: die Treppe dieser Ebene bleibt offen (auch nach Weiterspielen / Wiederkommen)
  if (!G.bossDone.includes(G.depth)) { G.bossDone.push(G.depth); G.bossDone.sort((a, b) => a - b); }
  despawnMinions(); G.darkness = 0;
  if (A) { A.done = true; A.waveT = Infinity; openGates(A); }
  slowmo(mini ? 1.0 : 1.5, mini ? 0.3 : 0.22); FX.zoomPunch = 1; flash("#fff6c0", mini ? 0.5 : 0.7); shake(mini ? 0.7 : 1);
  G.camFocus = { x: e.x, y: e.y, t: 1.2 };
  // Konfetti in Wellen + Beute-Regen
  const cols = ["#ff8fd0", "#8fe9ff", "#fff38a", "#b3ff9a", "#c79bff", "#ffb35e"];
  for (let w = 0; w < (mini ? 2 : 4); w++) later(w * 0.22, () => {
    burst(e.x, e.y, 26, { kind: "conf", col: pick(cols), add: false, s0: 12, s1: 9, sp0: 2, sp1: 6.5, z: 80, vz0: 220, vz1: 480, g: -420, l0: 1.2, l1: 2.2, drag: 1.2, fade: 0.3 });
    burst(e.x, e.y, 12, { kind: "star5", col: pick(cols), s0: 16, s1: 0, sp0: 1, sp1: 4, z: 80, vz0: 200, vz1: 420, g: -380, l0: 0.8, l1: 1.4 });
    ring(e.x, e.y, 2.5 + w, pick(cols), 0.5, 1.4);
  });
  const nRain = e.isKing ? 30 : mini ? 8 : 18;
  for (let k = 0; k < nRain; k++) later(0.3 + k * 0.05, () => { const a = rand(0, TAU), r = rand(0.5, 3.2), f = nearestFree(G.L.map, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 0.1); G.items.push(rainItem("coin", f.x, f.y)); });
  later(1.3, unsealStairs);
  if (e.isKing) {
    H().banner("GESCHAFFT!", "👑 Der Kellerkönig ist besiegt!", "win");
    SFX.bossWin();
    later(2.4, () => winGame("boss"));
  } else {
    H().banner(e.name.toUpperCase() + " BESIEGT!", mini ? "⭐ Klasse! Gleich öffnet sich die Treppe …" : "👑 Super gemacht! Gleich öffnet sich die Treppe …", "win");
    SFX.bossWin();
  }
  save();
}
