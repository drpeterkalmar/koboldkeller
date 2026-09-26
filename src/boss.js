/* boss.js — Bosse v4: Intro-Titelkarte, 3 Phasen (ab 66 % neue Muster, ab 33 % Wut-Phase), Signatur-Angriffe je Welt
   mit gut lesbaren Warnkreisen/-linien, Arena-Effekte, Phasenwechsel mit Kamera-Kick, Sieg mit Zeitlupe + Konfetti + Beute-Regen (MIT)
   Fairness für Kinder: jede Gefahr wird ≥ 0,8 s vorher angezeigt (MEGASCHWER ×0,75), Phasenwechsel räumen alle Warnungen ab. */
import { BOSSES, BOSS_PHASES, POOLS, MEGA } from "./config.js";
import { G, H, later, playerHurt, makeEnt, steer, walk, faceTo, flyItem, rainItem, winGame, segDist } from "./game.js";
import { canStand, nearestFree } from "./world.js";
import { FX, P, part, burst, ring, text, shake, hitstop, slowmo, flash } from "./fx.js";
import { SFX } from "./audio.js";
import { haptic } from "./platform.js";
import { rand, randi, pick, weighted, TAU, clamp } from "./util.js";

// ---------- Aufbau ----------
export function initBoss(e, lvl) {
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
const pace = e => (G.mega ? 0.75 : 1) * (e.phase >= 3 ? 0.8 : 1);
const dmgOf = e => e.dmg;

// ---------- Intro ----------
export function wakeBoss(e) {
  if (e.awake) return;
  const p = G.p;
  e.awake = true; e.state = "intro"; e.st = 1.9; e.invulT = 1.9; e.sq = 0.3;
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
  if (e.phase === 1 && frac <= BOSS_PHASES[0]) startPhase(e, 2);
  else if (e.phase === 2 && frac <= BOSS_PHASES[1]) startPhase(e, 3);
}
function startPhase(e, n) {
  const p = G.p, D = e.def;
  e.phase = n; e.state = "phase"; e.st = 1.5; e.invulT = 1.5; e.cur = null; e.z = 0; e.spin = -1; e.tele = 0;
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
  H().banner(n === 2 ? "PHASE 2!" : "WUT-PHASE! 🔥", n === 2 ? D.name + " wird ernst — neue Angriffe!" : D.name + " ist richtig sauer — schneller & wilder!", "boss");
  H().boss(e);
  G.darkness = n === 3 ? 0.16 : 0.08;
  if (n === 3) later(1.2, () => { if (G.ents.includes(e)) summon(e, e.isKing ? 3 : 2); });
}

// ---------- KI ----------
export function bossAI(e, dt) {
  const p = G.p;
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  arenaFx(e, dt);
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
      if (d > 1.6) { const [dx, dy] = steer(e); walk(e, dx, dy, sp, dt); } else e.moving = false;
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
      const nx = e.x + c.dx * 17 * dt, ny = e.y + c.dy * 17 * dt;
      c.left -= 17 * dt;
      if (Math.random() < 0.7) part({ x: e.x, y: e.y, z: 10, kind: "star5", col: pick(["#ff9ae0", "#fff6a0", "#8fe9ff"]), s0: 12, s1: 0, life: 0.5, g: 0 });
      if (c.left <= 0 || !canStand(G.L.map, nx, ny, e.r * 0.6)) { e.state = "atk"; shake(0.25); SFX.slam({ x: e.x, y: e.y }); }
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
  if (d < RS - 0.4) list.push(["spin", 5]);
  list.push(["slam", ph >= 2 ? 2 : 3]);
  list.push([D.sig[0], 4]);
  if (ph >= 2) { list.push([D.sig[1], 4]); if (G.ents.filter(o => o.minion).length < 3) list.push(["summon", 1.5]); }
  if (D.sig[2] && ph >= 2) list.push([D.sig[2], 3]);
  if (ph >= 3) list.push([D.sig[0], 2]);
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
const FXC = { spore: ["#b6ff8a", "#ffd0f0"], vine: ["#7fd46a", "#d0ff9a"], crystal: ["#9ff0ff", "#ffffff"], beam: ["#e0f8ff", "#b8a8ff"], candy: ["#ff8fd0", "#fff38a"], ice: ["#ffffff", "#bfe9ff"], fire: ["#ff9a3a", "#ffd060"], slam: ["#fff0d0", "#ffffff"] };
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
function summon(e, n) {
  const m = G.L.map, pool = e.isKing ? [["flamme", 1]] : POOLS[G.biome];
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, f = nearestFree(m, e.x + Math.cos(a) * 1.9, e.y + Math.sin(a) * 1.9, 0.3);
    const mi = makeEnt(weighted(pool), f.x, f.y); mi.minion = true; mi.state = "chase"; mi.xp = Math.ceil(mi.xp / 2);
    G.ents.push(mi); P.poof(f.x, f.y, "#c9a0ff");
  }
  SFX.poof({ x: e.x, y: e.y });
}

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
      const p = G.p, f = pace(e), RJ = e.isKing ? 2.6 : 2.0;
      c.n = e.phase >= 3 ? 2 : 1; c.i = 0; c.wind = 0.4 * f; c.jump = 0.7; c.dur = c.n * (c.wind + c.jump) + 0.1; c.rec = 1.0;
      nextJump(e, c, p.x, p.y, RJ);
    },
    tick(e, c, dt) {
      const seg = c.wind + c.jump, i = Math.min(c.n - 1, Math.floor(c.t / seg)), lt = c.t - i * seg;
      if (i !== c.i) { c.i = i; const p = G.p; nextJump(e, c, p.x, p.y, e.isKing ? 2.6 : 2.0); }
      if (lt < c.wind) { e.sq = 0.2; e.z = 0; return; }
      const k = Math.min(1, (lt - c.wind) / c.jump);
      const nx = c.sx + (c.jx - c.sx) * k, ny = c.sy + (c.jy - c.sy) * k;
      if (canStand(G.L.map, nx, ny, e.r * 0.6)) { e.x = nx; e.y = ny; }
      e.z = Math.sin(Math.PI * k) * (e.isKing ? 160 : 125);
      if (k >= 1 && !c.landed[i]) {
        c.landed[i] = true; e.z = 0; e.sq = 0.35;
        SFX.slam({ x: e.x, y: e.y }); shake(0.6); haptic("slam"); FX.zoomPunch = 0.8;
        burst(e.x, e.y, 18, { kind: "puff", col: "#ffffff", add: false, s0: 26, s1: 6, sp0: 1.5, sp1: 4, z: 6, vz0: 10, vz1: 60, g: 0, drag: 3, l0: 0.4, l1: 0.8, fade: 0.8 });
        if (!canStand(G.L.map, e.x, e.y, e.r * 0.6)) { const f = nearestFree(G.L.map, e.x, e.y, e.r * 0.6); e.x = f.x; e.y = f.y; }
      }
    },
  },
  summon: {
    start(e, c) { c.dur = 0.7; c.rec = 0.6; c.done = false; },
    tick(e, c) { e.sq = 0.2 * Math.sin(e.t * 20); if (c.t > 0.6 && !c.done) { c.done = true; summon(e, e.phase >= 3 ? 3 : 2); } },
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
        later(dl, () => G.shots.push({ kind: "lob", x0: e.x, y0: e.y, x: e.x, y: e.y, tx: t.x, ty: t.y, z: 40, h: 200, t: 0, dur, life: dur + 0.2, col: pick(["#ff8fd0", "#8fe9ff", "#fff38a", "#b3ff9a"]), dmg: 0 }));
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
        line(e.x, e.y, a, len, 1.4, 0, 0.95 * f, e, "candy", { onEnd: (t) => { impact(t); if (G.ents.includes(e) && e.cur === c && e.state === "atk") { e.state = "dash"; e.cur = c; c.dx = Math.cos(a); c.dy = Math.sin(a); c.left = len; } } });
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
};
function nextJump(e, c, px, py, RJ) {
  c.sx = e.x; c.sy = e.y; c.jx = px; c.jy = py; c.landed = c.landed || [];
  G.teles.push({ kind: "circle", x: px, y: py, r: RJ, t: 0, max: c.wind + c.jump, dmg: dmgOf(e), fx: "slam", onEnd: impact });
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

// ---------- Sieg ----------
export function bossKilled(e) {
  const p = G.p;
  G.boss = null; H().boss(null);
  G.teles.length = 0; G.darkness = 0;
  for (let i = G.shots.length - 1; i >= 0; i--) if (G.shots[i].kind !== "bubble") G.shots.splice(i, 1);
  slowmo(1.5, 0.22); FX.zoomPunch = 1; flash("#fff6c0", 0.7); shake(1);
  G.camFocus = { x: e.x, y: e.y, t: 1.4 };
  // Konfetti in Wellen + Beute-Regen
  const cols = ["#ff8fd0", "#8fe9ff", "#fff38a", "#b3ff9a", "#c79bff", "#ffb35e"];
  for (let w = 0; w < 4; w++) later(w * 0.22, () => {
    burst(e.x, e.y, 26, { kind: "conf", col: pick(cols), add: false, s0: 12, s1: 9, sp0: 2, sp1: 6.5, z: 80, vz0: 220, vz1: 480, g: -420, l0: 1.2, l1: 2.2, drag: 1.2, fade: 0.3 });
    burst(e.x, e.y, 12, { kind: "star5", col: pick(cols), s0: 16, s1: 0, sp0: 1, sp1: 4, z: 80, vz0: 200, vz1: 420, g: -380, l0: 0.8, l1: 1.4 });
    ring(e.x, e.y, 2.5 + w, pick(cols), 0.5, 1.4);
  });
  const nRain = e.isKing ? 30 : 18;
  for (let k = 0; k < nRain; k++) later(0.3 + k * 0.05, () => { const a = rand(0, TAU), r = rand(0.5, 3.2), f = nearestFree(G.L.map, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 0.1); G.items.push(rainItem("coin", f.x, f.y)); });
  if (e.isKing) {
    H().banner("GESCHAFFT!", "👑 Der Kellerkönig ist besiegt!", "win");
    SFX.bossWin();
    later(2.4, () => winGame("boss"));
  } else {
    H().banner(e.name.toUpperCase() + " BESIEGT!", "👑 Super gemacht! Die Treppe ist frei …", "win");
    SFX.bossWin();
  }
  // restliche Helfer der Arena verpuffen freundlich
  for (const o of G.ents.slice()) if (o.minion) { P.poof(o.x, o.y); const j = G.ents.indexOf(o); if (j >= 0) G.ents.splice(j, 1); }
}
