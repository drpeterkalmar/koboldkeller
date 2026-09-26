/* game.js — Zustand, Spieler, Kampf, Gegner-KI, Loot, Ebenen, Sieg (MIT) */
import { PLAYER, SPECIES, ENEMIES, POOLS, BIOMES, BOSS_NAMES, BOSS_HAT, HATS, MEGA, MAX_DEPTH, biomeOf, weaponOf } from "./config.js";
import { buildTown, buildDungeon, findPath, moveEnt, canStand, nearestFree, lineFree, isBlocked } from "./world.js";
import { FX, P, part, burst, ring, text, shake, hitstop, slowmo, flash, resetFx } from "./fx.js";
import { SFX, playMusic } from "./audio.js";
import { vibrate } from "./platform.js";
import { writeSave, addHall } from "./save.js";
import { rand, randi, pick, weighted, TAU, shade, clamp } from "./util.js";

export const G = {
  screen: "menu", depth: 0, biome: 0, L: null, p: null, prof: null,
  ents: [], items: [], shots: [], teles: [],
  gold: 0, mega: false, runSecs: 0, runFrom: 1, t: 0, boss: null, deepest: 1,
  god: false, winQueued: false, darkness: 0, joy: { x: 0, y: 0, m: 0 }, hold: null,
  flow: null, flowT: 0, seenT: 0, saveT: 0, portalCd: 0, lockToastT: 0, tutStep: -1, tutFlags: {},
  hooks: { toast() { }, banner() { }, hud() { }, boss() { }, win() { }, dead() { }, level() { }, tut() { }, fade(cb) { cb(); } },
  stats: { kills: 0 },
};
const H = () => G.hooks;

// =====================================================================
// Spieler
// =====================================================================
function lookOf(id) { return SPECIES.find(s => s.id === id) || SPECIES[0]; }
export function makePlayer(prof) {
  const look = lookOf(prof.species);
  const p = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, r: 0.3, face: 1, moving: false, walkPh: 0, t: 0, sq: 0, sqv: 0,
    hp: prof.hp, maxHp: prof.maxHp, lvl: prof.lvl, xp: prof.xp, xpNext: prof.xpNext,
    atk: prof.atk, projN: prof.projN, magic: prof.magic, potions: prof.potions, shrooms: prof.shrooms,
    hats: prof.hats.slice(), hat: prof.hat, name: prof.name, species: look.id,
    atkCd: 0, bubCd: 0, dashCd: 0, spinT: 0, dashT: 0, dashDx: 0, dashDy: 0, hurtT: 0, flashT: 0, invulT: 0, castT: 0,
    path: null, foe: null, lastMx: 1, lastMy: 0, stepT: 0, trailT: 0, pendingSwing: -1, stuckT: 0,
    rig: null,
  };
  p.rig = {
    look, outfit: look.outfit, footCol: shade(look.outfit, -0.35), cape: null, hat: p.hat, hatRed: false,
    mood: "open", scale: 0.86, face: 1, t: 0, sq: 0, moving: false, walkPh: 0, spin: -1, wpn: "stick", wand: 1,
    flash: false, alpha: 1, tilt: 0, cast: 0,
  };
  return p;
}
export function profileFromGame() {
  const p = G.p, pr = G.prof;
  Object.assign(pr, {
    name: p.name, species: p.species, lvl: p.lvl, xp: p.xp, xpNext: p.xpNext, maxHp: p.maxHp, hp: Math.max(1, Math.ceil(p.hp)),
    atk: p.atk, projN: p.projN, magic: p.magic, gold: G.gold, potions: p.potions, shrooms: p.shrooms,
    hats: p.hats.slice(), hat: p.hat, deepest: G.deepest, depth: G.depth, mega: G.mega, runSecs: G.runSecs,
    kills: G.stats.kills,
  });
  return pr;
}
export function save() {
  if (!G.p || !G.prof || G.demo) return;
  writeSave(profileFromGame());
  H().saved && H().saved();
}

// =====================================================================
// Spielstart / Ebenen
// =====================================================================
export function startGame(prof) {
  G.prof = prof;
  G.p = makePlayer(prof);
  G.gold = prof.gold; G.mega = prof.mega; G.deepest = prof.deepest; G.runSecs = prof.runSecs || 0;
  G.stats.kills = prof.kills || 0;
  G.winQueued = false;
  G.tutStep = prof.tut ? -1 : 0; G.tutFlags = {};
  enterLevel(prof.depth || 0, true);
}
export function enterLevel(depth, instant = false) {
  const go = () => {
    buildLevel(depth);
    G.screen = "play";
    H().level();
  };
  if (instant) go(); else H().fade(go);
}
export function buildLevel(depth) {
  depth = clamp(depth | 0, 0, MAX_DEPTH);
  G.depth = depth; G.biome = biomeOf(depth);
  const seed = G.prof.seed;
  const L = depth === 0 ? buildTown(seed) : buildDungeon(seed, depth, G.biome);
  G.L = L;
  G.ents = []; G.items = []; G.shots = []; G.teles = []; G.boss = null;
  resetFx();
  const p = G.p;
  p.x = L.entry.x; p.y = L.entry.y; p.vx = p.vy = 0; p.path = null; p.foe = null; p.dashT = 0; p.z = 0;
  p.invulT = 1.2;
  G.hold = null; G.portalCd = 1.0; G.flow = null; G.flowT = 0; G.darkness = 0;
  L.homeArmed = false;
  if (depth === 0) {
    for (const d of L.dummies) G.ents.push(makeEnt("dummy", d.x, d.y));
    for (const po of L.portals) {
      po.locked = po.depth > G.deepest;
      po.col = BIOME_PORTAL[biomeOf(po.depth)];
      po.label = (po.locked ? "🔒 " : "🌀 ") + "Ebene " + po.depth;
    }
    L.lights = L.lights || [];
    G.runSecs = 0;
    playMusic("town");
  } else {
    L.homePortal.col = "#7fffd4"; L.homePortal.small = true; L.homePortal.label = "🏠 Stadt"; L.homePortal.home = true;
    populate(L, depth);
    playMusic("dungeon");
  }
  SFX.stairs();
  const B = BIOMES[G.biome];
  if (depth === 0) H().banner("Koboldstadt", "🏠 Willkommen zu Hause!");
  else if (depth === 20) { H().banner("Ebene 20", "👑 Der Kellerkönig wartet …"); H().toast("Besiege den Kellerkönig — oder erreiche das ✨ 20. Portal!"); }
  else if (depth % 4 === 0) H().banner("Ebene " + depth, B.name + " · ein Boss wartet!");
  else if ((depth - 1) % 4 === 0) H().banner(B.name, "✨ Neue Welt · Ebene " + depth);
  else H().banner("Ebene " + depth, B.name);
  if (depth > 0) { G.deepest = Math.max(G.deepest, depth); save(); }
  else save();
}
const BIOME_PORTAL = ["#7fffd4", "#8fff8a", "#8fe9ff", "#ff9ae0", "#dff6ff", "#ffae5a"];

function populate(L, depth) {
  const b = G.biome, lv = G.p.lvl;
  const spots = L.spots.slice();
  const take = (minDist = 7) => {
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      if (Math.hypot(s.x - L.entry.x, s.y - L.entry.y) >= minDist && (!L.arena || s.room !== 0)) { spots.splice(i, 1); return s; }
    }
    return null;
  };
  const n = 6 + Math.min(12, depth);
  const pool = POOLS[b];
  for (let i = 0; i < n; i++) {
    const s = take(); if (!s) break;
    G.ents.push(makeEnt(depth <= 1 ? weighted([["bat", 40], ["slime", 35], ["wichtel", 25]], L.rnd) : weighted(pool, L.rnd), s.x, s.y));
  }
  // Boss
  if (L.isBoss) {
    const a = L.arena;
    const bx = a.x + a.w / 2, by = a.y + a.h / 2;
    const boss = makeEnt(depth >= 20 ? "king" : "boss", bx, by);
    G.ents.push(boss); G.boss = boss;
  }
  // Items
  const put = (kind, v) => { const s = take(3); if (s) G.items.push(makeItem(kind, s.x, s.y, v)); };
  for (let i = 0; i < 7 + depth * 2; i++) put("coin");
  for (let i = 0; i < 3; i++) put("mushroom");
  put("potion");
  const nUp = 1 + ((L.rnd() * 2) | 0);
  for (let i = 0; i < nUp; i++) put(pick(["sword", "wand", "gem"], L.rnd));
}

// =====================================================================
// Gegner
// =====================================================================
export function makeEnt(type, x, y) {
  const d = G.depth, L = (G.p && G.p.lvl) || 1, def = ENEMIES[type];
  const dmgUp = Math.floor(d / 6) + Math.floor(L / 7);
  const mega = G.mega && type !== "dummy";
  const hp = Math.round(def.hp[0] + def.hp[1] * d + def.hp[2] * L);
  const e = {
    type, x, y, z: 0, r: def.r, hp, maxHp: hp, xp: Math.round(def.xp[0] + def.xp[1] * d + def.xp[2] * L),
    speed: def.speed * (mega ? MEGA.speed : 1), fly: !!def.fly, ranged: !!def.ranged,
    dmg: (type === "king" ? 3 : type === "boss" ? 2 : 1) + dmgUp,
    face: 1, t: Math.random() * 10, sq: 0, sqv: 0, flashT: 0, hurtT: 0, kx: 0, ky: 0,
    state: "idle", st: rand(0.5, 2), atkCd: rand(0.5, 1.5), tele: 0, moving: false,
    homeX: x, homeY: y, tx: x, ty: y, tint: null, alpha: 1, scale: 1, awake: false, wob: 0,
  };
  if (mega) e.dmg *= MEGA.dmg;
  if (G.depth <= 2) e.tame = true;
  const b = G.biome;
  if (type === "slime") e.tint = BIOMES[b].slime || "#7be07a";
  if (type === "bat") e.tint = ["#8a5cd6", "#8a5cd6", "#6f7fe0", "#c75ca8", "#7fa8d8", "#a04a4a"][b];
  if (type === "wisp") e.tint = ["#8fe9ff", "#b6ff8a", "#8fe9ff", "#ffb3f0", "#dff6ff", "#ffc06a"][b];
  if (type === "kaefer") e.tint = ["#6fb8ff", "#6fb8ff", "#7fd8ff", "#ff9ad8", "#bfe9ff", "#ff8a5a"][b];
  if (type === "pilzling") e.tint = ["#ff6fae", "#ff9a6a", "#b48cff", "#ff6fae", "#8fb8ff", "#ff7a4a"][b];
  if (type === "wichtel") e.tint = ["#e8434f", "#e8434f", "#5f86e0", "#ff6fae", "#4fb0e0", "#ff7a2a"][b];
  if (type === "boss" || type === "king") {
    e.isBoss = true; e.scale = type === "king" ? 2.9 : 1.75; e.r = type === "king" ? 1.1 : 0.65;
    e.isKing = type === "king";
    e.name = type === "king" ? "Kellerkönig" : BOSS_NAMES[b] + " der Boss-Kobold";
    const skins = ["#86dc5c", "#86dc5c", "#7f8cf0", "#ff8fc8", "#9fd8ff", "#ff2a2a"];
    const look = { id: "boss" + b, skin: e.isKing ? "#ff2a2a" : skins[b], ears: "pointy", hair: e.isKing ? "#6a0010" : "#4a2a1a", eye: e.isKing ? "#ffcf3a" : "#c0103a" };
    const outfit = e.isKing ? "#a0102a" : ["#6a3cdf", "#6a3cdf", "#3f4fb0", "#b0306a", "#3f7fb0", "#8a2a1a"][b];
    e.rig = {
      look, outfit, footCol: "#3a1a2a", cape: e.isKing ? "#ffb020" : "#c0203a", hat: "krone", hatRed: e.isKing,
      mood: "angry", scale: e.scale * 0.86, face: -1, t: 0, sq: 0, moving: false, walkPh: 0, spin: -1,
      wpn: e.isKing ? "rainbow" : "wood", wand: 0, flash: false, alpha: 1, tilt: 0, cast: 0,
    };
    e.cycle = 0; e.state = "sleep";
  }
  if (type === "dummy") { e.speed = 0; e.state = "dummy"; }
  return e;
}

export function hurtEnt(e, dmg, kx = 0, ky = 0, crit = false) {
  if (e.hp <= 0) return;
  e.hp -= dmg; e.flashT = 0.09; e.hurtT = 0.28; e.sq = -0.22; e.sqv = 0;
  if (e.type === "dummy") e.wob = 1;
  const kb = e.isBoss ? 0.15 : 1;
  e.kx += kx * 5.5 * kb; e.ky += ky * 5.5 * kb;
  P.hit(e.x, e.y, crit ? "#ffe36e" : "#fff3b0");
  text(e.x, e.y, (crit ? "💥" : "") + fmt(dmg), crit ? "#ffe36e" : "#ffffff", crit ? 26 : 19, 60 * (e.scale || 1) + (e.fly ? 30 : 0));
  SFX.hit();
  if (e.isBoss && !e.awake) wakeBoss(e);
  if (e.state === "idle") { e.state = "chase"; e.st = 0; }
  if (e.hp <= 0) killEnt(e);
}
const fmt = n => (Math.round(n * 10) / 10).toString().replace(".", ",");

export function killEnt(e) {
  const i = G.ents.indexOf(e);
  if (i >= 0) G.ents.splice(i, 1);
  const p = G.p;
  if (p.foe === e) p.foe = null;
  if (e.type === "dummy") {
    P.poof(e.x, e.y, "#ffe9a0"); SFX.poof();
    G.tutFlags.dummy = true;
    setTimeout(() => { if (G.depth === 0 && G.L && G.L.dummies) { const d = makeEnt("dummy", e.homeX, e.homeY); G.ents.push(d); P.sparkle(d.x, d.y, "#fff", 8); } }, 1500);
    return;
  }
  G.stats.kills++;
  P.poof(e.x, e.y, e.tint || "#ffd0e8", e.isBoss);
  SFX.poof();
  hitstop(e.isBoss ? 160 : 55);
  shake(e.isBoss ? 0.7 : 0.22);
  vibrate(e.isBoss ? [60, 40, 90] : 25);
  // Münz-Explosion
  const nC = e.isKing ? 40 : e.isBoss ? 16 : randi(1, 3);
  for (let k = 0; k < nC; k++) G.items.push(flyItem("coin", e.x, e.y));
  if (e.isBoss || Math.random() < 0.1) G.items.push(flyItem("potion", e.x, e.y));
  if (e.isBoss) { G.items.push(flyItem("mushroom", e.x, e.y)); G.items.push(flyItem("mushroom", e.x, e.y)); }
  else if (Math.random() < 0.06) G.items.push(flyItem("mushroom", e.x, e.y));
  const up = e.isBoss ? 1 : 0.07;
  if (Math.random() < up) G.items.push(flyItem(pick(["sword", "wand", "gem"]), e.x, e.y));
  if (e.isBoss) {
    const h = BOSS_HAT[G.biome];
    if (h && !p.hats.includes(h)) G.items.push(flyItem("hat", e.x, e.y, h));
  }
  gainXp(e.xp);
  if (e.isBoss) {
    G.boss = null; H().boss(null);
    slowmo(0.9, 0.25); FX.zoomPunch = 1;
    flash("#fff6c0", 0.6);
    if (e.isKing) {
      H().banner("GESCHAFFT!", "👑 Der Kellerkönig ist besiegt!", "win");
      SFX.victory();
      setTimeout(() => winGame("boss"), 1500);
    } else {
      H().toast("👑 " + e.name + " ist besiegt! Die Treppe wartet …");
      SFX.levelup();
    }
    // restliche Gegner der Arena verpuffen freundlich
    for (const o of G.ents.slice()) if (o.minion) { P.poof(o.x, o.y); const j = G.ents.indexOf(o); if (j >= 0) G.ents.splice(j, 1); }
  }
}

// =====================================================================
// XP / Level
// =====================================================================
export function gainXp(n) {
  const p = G.p;
  p.xp += n;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.lvl++; p.xpNext = Math.floor(p.xpNext * 1.4) + 4;
    p.maxHp += 2; p.hp = p.maxHp;
    p.atk += 0.5;
    const bub = p.lvl % 3 === 0;
    if (bub) p.projN++;
    H().toast("⭐ Level " + p.lvl + "! ❤️+2 · ⚔️+0,5" + (bub ? " · 🫧+1 Blase" : ""));
    text(p.x, p.y, "⭐ LEVEL " + p.lvl + "!", "#fff38a", 30, 110);
    SFX.levelup(); P.levelUp(p.x, p.y);
    vibrate([20, 30, 20]);
  }
}

// =====================================================================
// Items
// =====================================================================
function makeItem(kind, x, y, v) { return { kind, x, y, z: 0, vx: 0, vy: 0, vz: 0, seed: Math.random() * 7, v: v || "", flyT: 0 }; }
function flyItem(kind, x, y, v) {
  const it = makeItem(kind, x, y, v), a = Math.random() * TAU, sp = rand(0.8, kind === "coin" ? 2.6 : 1.6);
  it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp; it.vz = rand(160, 280); it.z = 20; it.flyT = 0.7;
  return it;
}
function pickup(it) {
  const p = G.p;
  switch (it.kind) {
    case "coin": G.gold++; SFX.coin(); P.coinPick(it.x, it.y); return true;
    case "potion": p.potions++; SFX.pickup(); H().toast("🧪 Trank eingesackt! (" + p.potions + ")"); P.sparkle(it.x, it.y, "#ff8fb8", 6); return true;
    case "mushroom":
      if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + 2); P.heal(p.x, p.y); SFX.heal(); text(p.x, p.y, "+2 ❤️", "#ff8fb8", 20, 90); }
      else { p.shrooms++; SFX.pickup(); H().toast("🍄 Glitzerpilz in den Rucksack! (" + p.shrooms + ")"); }
      return true;
    case "sword": {
      const before = weaponOf(p.atk).name;
      p.atk += 1; SFX.pickup(); P.sparkle(it.x, it.y, "#ffd75e", 14, 40);
      const w = weaponOf(p.atk);
      H().toast(w.name !== before ? "⚔️ NEUE WAFFE: " + w.name + "! (Schaden " + fmt(p.atk) + ")" : "⚔️ Schärfer! Schaden +1 (jetzt " + fmt(p.atk) + ")");
      save(); return true;
    }
    case "wand": p.projN++; SFX.pickup(); P.sparkle(it.x, it.y, "#9be1ff", 14, 40); H().toast("🪄 Zauberstab! " + p.projN + " Seifenblasen auf einmal!"); save(); return true;
    case "gem": p.magic++; SFX.pickup(); P.sparkle(it.x, it.y, "#d9b3ff", 14, 40); H().toast("✨ Glitzerstein! Blasen-Schaden +1"); save(); return true;
    case "hat": {
      const h = it.v;
      if (!p.hats.includes(h)) { p.hats.push(h); p.maxHp += 2; p.hp = p.maxHp; }
      p.hat = h; SFX.levelup(); P.levelUp(p.x, p.y);
      H().toast(HATS[h].emoji + " " + HATS[h].name + "! Sieht super aus · ❤️+2"); save(); return true;
    }
  }
  return true;
}

// =====================================================================
// Aktionen
// =====================================================================
const playing = () => G.screen === "play" && G.p;
export function attack() {
  const p = G.p;
  if (!playing() || p.atkCd > 0) return false;
  p.atkCd = PLAYER.atkCd; p.spinT = 0.28; p.pendingSwing = 0.07;
  p.sq = 0.12; SFX.swing();
  G.tutFlags.attack = true;
  return true;
}
function doSwing() {
  const p = G.p;
  const R = PLAYER.atkRadius + (p.atk > 6 ? 0.6 : 0);
  ring(p.x, p.y, R, "#fff6d0", 0.32, 1.1);
  let hits = 0, kills = 0;
  for (const e of G.ents.slice()) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < R + e.r * 0.5) {
      const crit = Math.random() < 0.12;
      const dx = (e.x - p.x) / (d || 1), dy = (e.y - p.y) / (d || 1);
      const before = G.ents.length;
      hurtEnt(e, p.atk * (crit ? 2 : 1), dx, dy, crit);
      hits++; if (G.ents.length < before) kills++;
    }
  }
  for (const pr of G.L.props) if (pr.kind === "pot" && !pr.broken && Math.hypot(pr.x - p.x, pr.y - p.y) < R) breakPot(pr);
  if (hits) {
    hitstop(kills ? 70 : 45); shake(0.14 + Math.min(0.2, hits * 0.04)); vibrate(15);
    FX.zoomPunch = Math.max(FX.zoomPunch, 0.35);
  }
}
function breakPot(pr) {
  pr.broken = true;
  const i = G.L.props.indexOf(pr); if (i >= 0) G.L.props.splice(i, 1);
  P.poof(pr.x, pr.y, "#e8c090"); SFX.pot();
  burst(pr.x, pr.y, 8, { kind: "dot", col: "#c98a5a", add: false, s0: 7, s1: 3, sp0: 1, sp1: 3, z: 14, vz0: 80, vz1: 200, g: -500, l0: 0.4, l1: 0.7, bounce: 0.3 });
  const n = Math.random() < 0.6 ? randi(1, 3) : 0;
  for (let k = 0; k < n; k++) G.items.push(flyItem("coin", pr.x, pr.y));
  if (Math.random() < 0.1) G.items.push(flyItem("mushroom", pr.x, pr.y));
}
export function bubbles() {
  const p = G.p;
  if (!playing() || p.bubCd > 0) return false;
  p.bubCd = PLAYER.bubbleCd; p.castT = 0.25; p.sq = -0.1;
  SFX.bubble();
  G.tutFlags.bubble = true;
  let best = null, bd = 6.5;
  for (const e of G.ents) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd && (e.type !== "dummy" || G.depth === 0)) { bd = d; best = e; } }
  let ang;
  if (best) ang = Math.atan2(best.y - p.y, best.x - p.x);
  else { const lm = Math.hypot(p.lastMx, p.lastMy) || 1; ang = Math.atan2(p.lastMy / lm, p.lastMx / lm); }
  const N = p.projN;
  const tier = Math.min(3, Math.floor((p.magic - 1) / 2));
  for (let k = 0; k < N; k++) {
    const a = ang + (N > 1 ? (k - (N - 1) / 2) * 0.36 : 0);
    G.shots.push({ kind: "bubble", x: p.x + Math.cos(a) * 0.3, y: p.y + Math.sin(a) * 0.3, z: 34, vx: Math.cos(a) * 6.2, vy: Math.sin(a) * 6.2, life: 1.3, t: 0, tier, lock: best, size: 1 + Math.min(0.5, p.magic * 0.04), dmg: 1 + p.magic + p.atk * 0.25 });
  }
  return true;
}
export function dodge() {
  const p = G.p;
  if (!playing() || p.dashCd > 0 || p.dashT > 0) return false;
  let near = null, nd = 6;
  for (const e of G.ents) { if (e.type === "dummy") continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nd) { nd = d; near = e; } }
  let dx, dy;
  if (near) {
    dx = p.x - near.x; dy = p.y - near.y; const l = Math.hypot(dx, dy);
    if (l < 0.05) { const a = Math.random() * TAU; dx = Math.cos(a); dy = Math.sin(a); } else { dx /= l; dy /= l; }
  } else {
    const lm = Math.hypot(p.lastMx, p.lastMy);
    if (lm > 0.01) { dx = p.lastMx / lm; dy = p.lastMy / lm; } else { dx = p.face; dy = -p.face; const l = Math.SQRT2; dx /= l; dy /= l; }
  }
  p.dashT = PLAYER.dashTime; p.dashDx = dx; p.dashDy = dy; p.dashCd = PLAYER.dashCd;
  p.invulT = Math.max(p.invulT, PLAYER.dashInvul);
  p.path = null; p.foe = null; p.sq = -0.25;
  SFX.dodge(); vibrate(10);
  for (let k = 0; k < 6; k++) P.dust(p.x, p.y, "#f0e6ff");
  G.tutFlags.dodge = true;
  return true;
}
export function potion() {
  const p = G.p;
  if (!playing()) return false;
  if (p.potions <= 0) { H().toast("🧪 Keine Tränke mehr — Pilze & Brunnen helfen!"); return false; }
  if (p.hp >= p.maxHp) { H().toast("💪 Du bist schon topfit!"); return false; }
  p.potions--;
  const heal = Math.max(3, Math.ceil(p.maxHp * 0.5));
  p.hp = Math.min(p.maxHp, p.hp + heal);
  SFX.potion(); P.heal(p.x, p.y); text(p.x, p.y, "+" + heal + " ❤️", "#ff8fb8", 22, 100);
  return true;
}
export function eatShroom() {
  const p = G.p;
  if (!p || p.shrooms <= 0) return false;
  if (p.hp >= p.maxHp) { H().toast("💪 Du bist schon topfit!"); return false; }
  p.shrooms--; p.hp = Math.min(p.maxHp, p.hp + 2); SFX.heal(); P.heal(p.x, p.y);
  return true;
}
export function wearHat(h) { const p = G.p; if (!p) return; p.hat = p.hats.includes(h) ? h : null; save(); }

function playerHurt(dmg, fromX, fromY) {
  const p = G.p;
  if (!p || p.invulT > 0 || G.screen !== "play" || G.god) return;
  p.hp -= dmg; p.hurtT = 0.35; p.flashT = 0.1; p.invulT = PLAYER.hurtInvul; p.blinkT = PLAYER.hurtInvul; p.sq = 0.25;
  FX.hurtA = 0.55; shake(0.38); hitstop(60); vibrate(45);
  SFX.hurt();
  text(p.x, p.y, "-" + fmt(dmg), "#ff6f8a", 22, 100);
  burst(p.x, p.y, 8, { kind: "heart", col: "#ff5d73", add: false, s0: 10, s1: 2, sp0: 1, sp1: 2.5, z: 40, vz0: 60, vz1: 160, g: -400, l0: 0.4, l1: 0.7 });
  if (fromX !== undefined) { const d = Math.hypot(p.x - fromX, p.y - fromY) || 1; p.vx += (p.x - fromX) / d * 5; p.vy += (p.y - fromY) / d * 5; }
  if (p.hp <= 0) die();
}
function die() {
  const p = G.p;
  p.hp = 0; G.screen = "dead";
  SFX.die(); P.poof(p.x, p.y, "#ff9ab8", true); vibrate([80, 60, 80]);
  H().dead();
}
export function reviveInTown() {
  const p = G.p;
  p.hp = p.maxHp; p.potions = Math.max(1, p.potions);
  enterLevel(0);
}
export function goTown() { if (G.depth > 0) enterLevel(0); }

export function winGame(how) {
  if (G.winQueued) return;
  G.winQueued = true;
  const p = G.p;
  const rec = {
    name: p.name, species: p.species, gold: G.gold, lvl: p.lvl, mega: G.mega, secs: Math.round(G.runSecs),
    ts: Date.now(), how: how === "portal" ? "portal" : "boss", from: G.runFrom,
  };
  const hall = addHall(rec);
  G.prof.won = true;
  save();
  G.screen = "win";
  SFX.victory(); flash("#fff6c0", 0.8);
  for (let k = 0; k < 4; k++) setTimeout(() => P.levelUp(p.x + rand(-2, 2), p.y + rand(-2, 2)), k * 250);
  H().win(rec, hall);
}

// =====================================================================
// Eingabe-API (von input.js)
// =====================================================================
export function tapWorld(wx, wy, hitEnt) {
  const p = G.p;
  if (!playing()) return;
  if (hitEnt && G.ents.includes(hitEnt)) {
    p.foe = hitEnt;
    const d = Math.hypot(hitEnt.x - p.x, hitEnt.y - p.y);
    if (d < PLAYER.atkRadius - 0.3) { attack(); p.path = null; }
    else p.path = findPath(G.L.map, p.x, p.y, hitEnt.x, hitEnt.y, p.r);
    return;
  }
  p.foe = null;
  const L = G.L;
  if (L.npc && Math.hypot(L.npc.x - wx, L.npc.y - wy) < 1.2) { H().tut("tap"); }
  let tx = wx, ty = wy;
  const snap = (pt, r) => { if (pt && Math.hypot(pt.x - wx, pt.y - wy) < r) { tx = pt.x; ty = pt.y; } };
  snap(L.stairs, 1.5); snap(L.homePortal, 1.3);
  if (L.portals) for (const po of L.portals) snap(po, 1.4);
  const path = findPath(L.map, p.x, p.y, tx, ty, p.r);
  p.path = path || [{ x: tx, y: ty }];
  ring(tx, ty, 0.5, "#ffffff", 0.35, 0.5);
}
export function holdWorld(wx, wy) {
  if (!playing()) return;
  G.hold = { x: wx, y: wy };
}
export function releaseHold() { G.hold = null; }
export function setJoy(x, y, m) { G.joy.x = x; G.joy.y = y; G.joy.m = m; if (m > 0.1 && G.p) { G.p.path = null; G.p.foe = null; } }

// =====================================================================
// Update
// =====================================================================
export function update(dt, realDt) {
  if (!G.p || !G.L) return;
  G.t += dt;
  const p = G.p, L = G.L, m = L.map;
  if (G.screen === "play" && G.depth > 0) G.runSecs += dt;
  // Timer
  p.atkCd = Math.max(0, p.atkCd - dt); p.bubCd = Math.max(0, p.bubCd - dt); p.dashCd = Math.max(0, p.dashCd - dt);
  p.spinT = Math.max(0, p.spinT - dt); p.hurtT = Math.max(0, p.hurtT - dt); p.flashT = Math.max(0, p.flashT - dt);
  p.invulT = Math.max(0, p.invulT - dt); p.castT = Math.max(0, p.castT - dt); p.blinkT = Math.max(0, (p.blinkT || 0) - dt);
  G.portalCd = Math.max(0, G.portalCd - dt); G.lockToastT = Math.max(0, G.lockToastT - dt);
  if (p.pendingSwing >= 0) { p.pendingSwing -= dt; if (p.pendingSwing < 0) doSwing(); }
  p.t += dt;
  if (G.screen === "play") updatePlayer(dt);
  // Squash-Feder
  spring(p, dt);
  updateItems(dt);
  updateShots(dt);
  updateEnts(dt);
  updateTeles(dt);
  // Sichtbarkeit (Minikarte)
  G.seenT -= dt;
  if (G.seenT <= 0) {
    G.seenT = 0.2;
    const r = 7, cx = Math.floor(p.x), cy = Math.floor(p.y);
    for (let y = Math.max(0, cy - r); y <= Math.min(m.h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(m.w - 1, cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) m.seen[y * m.w + x] = 1;
  }
  // Ambient-Partikel
  ambient(dt);
  // Rig-Daten
  const rg = p.rig;
  rg.face = p.face; rg.t = p.t; rg.sq = p.sq; rg.moving = p.moving; rg.walkPh = p.walkPh;
  rg.spin = p.spinT > 0 ? 1 - p.spinT / 0.28 : -1; rg.flash = p.flashT > 0;
  rg.mood = p.hurtT > 0 ? "hurt" : (p.t % 3.4 < 0.13 ? "blink" : "open");
  rg.wpn = weaponOf(p.atk).key; rg.wand = p.projN; rg.hat = p.hat; rg.cast = p.castT;
  rg.tilt = p.dashT > 0 ? p.face * 0.25 : 0;
  // Autosave
  G.saveT += realDt;
  if (G.saveT > 10 && G.screen === "play") { G.saveT = 0; save(); }
}
function spring(o, dt) {
  // gedämpfte Feder für Squash & Stretch
  const k = 180, d = 12;
  o.sqv += (-k * o.sq - d * o.sqv) * dt;
  o.sq += o.sqv * dt;
  if (Math.abs(o.sq) < 0.001 && Math.abs(o.sqv) < 0.01) { o.sq = 0; o.sqv = 0; }
}

function updatePlayer(dt) {
  const p = G.p, L = G.L, m = L.map;
  let tvx = 0, tvy = 0;
  const spd = PLAYER.speed;
  if (p.dashT > 0) {
    p.dashT -= dt;
    const v = PLAYER.dashDist / PLAYER.dashTime;
    tvx = p.dashDx * v; tvy = p.dashDy * v;
    p.vx = tvx; p.vy = tvy;
    p.trailT -= dt;
    if (p.trailT <= 0) { p.trailT = 0.045; FX.trails.push({ x: p.x, y: p.y, life: 0.25, max: 0.25 }); }
  } else {
    const j = G.joy;
    if (j.m > 0.12) { const s = spd * Math.min(1, 0.35 + j.m); tvx = j.x * s; tvy = j.y * s; }
    else if (G.hold) {
      const d = Math.hypot(G.hold.x - p.x, G.hold.y - p.y);
      if (d > 0.35) {
        if (lineFree(m, p.x, p.y, G.hold.x, G.hold.y, p.r * 0.9)) { tvx = (G.hold.x - p.x) / d * spd; tvy = (G.hold.y - p.y) / d * spd; p.path = null; }
        else if (!p.path || G.t % 0.25 < dt) p.path = findPath(m, p.x, p.y, G.hold.x, G.hold.y, p.r);
      }
    }
    if (p.foe) {
      if (!G.ents.includes(p.foe)) p.foe = null;
      else {
        const d = Math.hypot(p.foe.x - p.x, p.foe.y - p.y);
        if (d < PLAYER.atkRadius - 0.4) { p.path = null; if (p.atkCd <= 0) attack(); }
        else if (!p.path || G.t % 0.4 < dt) p.path = findPath(m, p.x, p.y, p.foe.x, p.foe.y, p.r);
      }
    }
    if (tvx === 0 && tvy === 0 && p.path && p.path.length) {
      const wp = p.path[0];
      const d = Math.hypot(wp.x - p.x, wp.y - p.y);
      if (d < 0.14) p.path.shift();
      else { const s = Math.min(spd, d * 8 + 0.8); tvx = (wp.x - p.x) / d * s; tvy = (wp.y - p.y) / d * s; }
      if (!p.path.length) p.path = null;
    }
    const a = Math.min(1, dt * 16);
    p.vx += (tvx - p.vx) * a; p.vy += (tvy - p.vy) * a;
  }
  const blocked = moveEnt(m, p, p.vx * dt, p.vy * dt, p.r);
  if (blocked && p.path && p.dashT <= 0) { p.stuckT += dt; if (p.stuckT > 0.5) { p.path = findPath(m, p.x, p.y, p.path[p.path.length - 1].x, p.path[p.path.length - 1].y, p.r); p.stuckT = 0; } }
  else p.stuckT = 0;
  // Auto-Befreiung
  if (!canStand(m, p.x, p.y, p.r)) { const f = nearestFree(m, p.x, p.y, p.r); p.x = f.x; p.y = f.y; }
  const sp = Math.hypot(p.vx, p.vy);
  p.moving = sp > 0.4;
  if (p.moving) {
    p.walkPh += dt * (6 + sp * 1.6);
    const sdx = p.vx - p.vy; if (Math.abs(sdx) > 0.15) p.face = sdx > 0 ? 1 : -1;
    p.lastMx = p.vx; p.lastMy = p.vy;
    p.stepT -= dt;
    if (p.stepT <= 0) { p.stepT = 0.28; P.dust(p.x, p.y, G.biome === 0 ? "#e8f6d0" : "#e6dcf0"); }
    G.tutFlags.walked = (G.tutFlags.walked || 0) + sp * dt;
  }
  triggers(dt);
}

function triggers(dt) {
  const p = G.p, L = G.L;
  if (G.portalCd > 0 || p.dashT > 0) return;
  // Brunnen heilt
  if (L.fountain && Math.hypot(L.fountain.x - p.x, L.fountain.y - p.y) < 2.4) {
    if (p.hp < p.maxHp || p.potions < 3) {
      p.hp = p.maxHp; p.potions = Math.max(3, p.potions);
      P.heal(p.x, p.y); SFX.heal(); text(p.x, p.y, "💧 Geheilt!", "#bfefff", 20, 100);
      H().toast("💧 Der Brunnen heilt dich und füllt deine Tränke auf!");
    }
  }
  // Stadt-Portale
  if (L.portals) for (const po of L.portals) {
    if (Math.hypot(po.x - p.x, po.y - p.y) < 0.75) {
      if (po.locked) { if (G.lockToastT <= 0) { H().toast("🔒 Dieses Portal öffnet sich, wenn du Ebene " + po.depth + " erreicht hast!"); G.lockToastT = 3; } }
      else { G.portalCd = 2; G.runFrom = po.depth; G.runSecs = 0; SFX.portal(); P.levelUp(po.x, po.y); enterLevel(po.depth); G.tutFlags.portal = true; if (G.tutStep >= 0) finishTut(); return; }
    }
  }
  // Heimportal (erst nach Verlassen scharf)
  if (L.homePortal) {
    const d = Math.hypot(L.homePortal.x - p.x, L.homePortal.y - p.y);
    if (d > 1.6) L.homeArmed = true;
    if (L.homeArmed && d < 0.6) { G.portalCd = 2; SFX.portal(); enterLevel(0); return; }
  }
  // Treppe / 20. Portal
  if (L.stairs && Math.hypot(L.stairs.x - p.x, L.stairs.y - p.y) < 0.6) {
    G.portalCd = 2;
    if (G.depth >= MAX_DEPTH) { SFX.portal(); winGame("portal"); }
    else { SFX.stairs(); enterLevel(G.depth + 1); }
  }
  // Truhen
  for (const pr of L.props) if (pr.kind === "chest" && !pr.open && Math.hypot(pr.x - p.x, pr.y - p.y) < 0.95) openChest(pr);
}
function openChest(pr) {
  pr.open = true;
  SFX.chest(); shake(0.2); vibrate(20);
  P.sparkle(pr.x, pr.y, "#ffe36e", 14, 30); part({ x: pr.x, y: pr.y, z: 20, kind: "glow", col: "#ffd75e", s0: 120, s1: 30, life: 0.5 });
  const n = randi(8, 14);
  for (let k = 0; k < n; k++) G.items.push(flyItem("coin", pr.x, pr.y));
  if (Math.random() < 0.45) G.items.push(flyItem("potion", pr.x, pr.y));
  if (Math.random() < 0.35) G.items.push(flyItem(pick(["sword", "wand", "gem"]), pr.x, pr.y));
  if (Math.random() < 0.5) G.items.push(flyItem("mushroom", pr.x, pr.y));
}

function updateItems(dt) {
  const p = G.p, m = G.L.map;
  for (let i = G.items.length - 1; i >= 0; i--) {
    const it = G.items[i];
    if (it.flyT > 0 || it.z > 0) {
      it.flyT -= dt;
      it.vz -= 900 * dt; it.z += it.vz * dt;
      const nx = it.x + it.vx * dt, ny = it.y + it.vy * dt;
      if (!isBlocked(m, nx, it.y)) it.x = nx; else it.vx *= -0.5;
      if (!isBlocked(m, it.x, ny)) it.y = ny; else it.vy *= -0.5;
      if (it.z <= 0) { it.z = 0; if (it.vz < -60) { it.vz = -it.vz * 0.38; } else it.vz = 0; it.vx *= 0.6; it.vy *= 0.6; }
      if (it.flyT > 0.3) continue;
    }
    const d = Math.hypot(p.x - it.x, p.y - it.y);
    const mag = it.kind === "coin" ? 2.0 : 1.2;
    if (d < mag && G.screen === "play") {
      const s = (mag - d) * 9 + 2;
      it.x += (p.x - it.x) / (d || 1) * s * dt; it.y += (p.y - it.y) / (d || 1) * s * dt;
    }
    if (d < 0.5 && G.screen === "play") { if (pickup(it)) G.items.splice(i, 1); }
  }
}

function updateShots(dt) {
  const p = G.p, m = G.L.map;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.t += dt; s.life -= dt;
    let pop = s.life <= 0;
    if (s.kind === "bubble") {
      if (s.lock && G.ents.includes(s.lock)) {
        const a = Math.atan2(s.lock.y - s.y, s.lock.x - s.x), sp = Math.hypot(s.vx, s.vy);
        const cur = Math.atan2(s.vy, s.vx); let da = a - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const na = cur + clamp(da, -dt * 5, dt * 5);
        s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.z = 30 + Math.sin(s.t * 6) * 4;
      if (isBlocked(m, s.x, s.y)) pop = true;
      for (const e of G.ents) if (Math.hypot(e.x - s.x, e.y - s.y) < 0.45 + e.r * 0.6) { pop = true; break; }
      if (!pop && Math.random() < 0.3) part({ x: s.x, y: s.y, z: s.z, kind: "dot", col: "#dff6ff", s0: 5, s1: 0, life: 0.3, g: 0 });
      if (pop) {
        P.bubblePop(s.x, s.y); SFX.pop();
        const R = 1.25 * s.size;
        let hit = false;
        for (const e of G.ents.slice()) {
          const d = Math.hypot(e.x - s.x, e.y - s.y);
          if (d < R + e.r * 0.5) { hurtEnt(e, s.dmg, (e.x - s.x) / (d || 1) * 0.5, (e.y - s.y) / (d || 1) * 0.5); hit = true; }
        }
        for (const pr of G.L.props) if (pr.kind === "pot" && Math.hypot(pr.x - s.x, pr.y - s.y) < R) { breakPot(pr); break; }
        if (hit) { hitstop(30); shake(0.08); }
        G.shots.splice(i, 1);
      }
    } else {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (isBlocked(m, s.x, s.y)) pop = true;
      if (Math.random() < 0.5) part({ x: s.x, y: s.y, z: s.z, kind: "dot", col: s.col, s0: 9, s1: 0, life: 0.3, g: 0 });
      if (Math.hypot(p.x - s.x, p.y - s.y) < 0.42 && p.dashT <= 0) { playerHurt(s.dmg, s.x, s.y); pop = true; }
      if (pop) { burst(s.x, s.y, 6, { kind: "dot", col: s.col, s0: 8, s1: 0, sp0: 0.5, sp1: 2, z: s.z, vz0: 0, vz1: 50, g: 0, l0: 0.2, l1: 0.4 }); G.shots.splice(i, 1); }
    }
  }
}

// =====================================================================
// Gegner-KI
// =====================================================================
function computeFlow() {
  const m = G.L.map, p = G.p, w = m.w, h = m.h;
  if (!G.flow || G.flow.length !== w * h) G.flow = new Int16Array(w * h);
  const f = G.flow; f.fill(-1);
  const q = G._fq || (G._fq = new Int32Array(w * h));
  let qh = 0, qt = 0;
  const s = Math.floor(p.y) * w + Math.floor(p.x);
  if (s < 0 || s >= w * h) return;
  f[s] = 0; q[qt++] = s;
  while (qh < qt) {
    const c = q[qh++], cx = c % w, cy = (c / w) | 0, dc = f[c];
    if (dc > 30) continue;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (f[ni] !== -1 || m.block[ni]) continue;
      f[ni] = dc + 1; q[qt++] = ni;
    }
  }
}
/** Richtung zum Spieler: direkt bei Sichtlinie, sonst Flow-Field */
function steer(e) {
  const p = G.p, m = G.L.map;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (d < 1.2 || lineFree(m, e.x, e.y, p.x, p.y, e.r * 0.8)) return [dx / d, dy / d];
  const f = G.flow; if (!f) return [dx / d, dy / d];
  const w = m.w, cx = Math.floor(e.x), cy = Math.floor(e.y);
  let best = f[cy * w + cx], bx = 0, by = 0;
  if (best < 0) best = 9999;
  for (let k = 0; k < 8; k++) {
    const ox = [1, -1, 0, 0, 1, 1, -1, -1][k], oy = [0, 0, 1, -1, 1, -1, 1, -1][k];
    const nx = cx + ox, ny = cy + oy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= m.h) continue;
    const v = f[ny * w + nx];
    if (v >= 0 && v < best && (!ox || !oy || (!m.block[cy * w + nx] && !m.block[ny * w + cx]))) { best = v; bx = nx + 0.5 - e.x; by = ny + 0.5 - e.y; }
  }
  const l = Math.hypot(bx, by);
  return l > 0.01 ? [bx / l, by / l] : [dx / d, dy / d];
}
function faceTo(e, x, y) { const sdx = (x - e.x) - (y - e.y); if (Math.abs(sdx) > 0.05) e.face = sdx > 0 ? 1 : -1; }
function walk(e, dx, dy, sp, dt) {
  const m = G.L.map;
  moveEnt(m, e, dx * sp * dt, dy * sp * dt, e.r * 0.8);
  e.moving = sp > 0.1;
  if (Math.abs(dx - dy) > 0.1) e.face = (dx - dy) > 0 ? 1 : -1;
}
function updateEnts(dt) {
  const p = G.p, m = G.L.map;
  G.flowT -= dt;
  if (G.flowT <= 0 && G.depth > 0) { G.flowT = 0.25; computeFlow(); }
  const act = G.screen === "play";
  for (const e of G.ents) {
    e.t += dt;
    e.flashT = Math.max(0, e.flashT - dt); e.hurtT = Math.max(0, e.hurtT - dt); e.atkCd -= dt;
    e.wob = Math.max(0, e.wob - dt * 2);
    spring(e, dt);
    if (e.kx || e.ky) {
      moveEnt(m, e, e.kx * dt, e.ky * dt, e.r * 0.8);
      const k = Math.max(0, 1 - dt * 9); e.kx *= k; e.ky *= k;
      if (Math.abs(e.kx) + Math.abs(e.ky) < 0.05) e.kx = e.ky = 0;
    }
    if (e.type === "dummy" || !act) { e.moving = false; continue; }
    if (e.type === "geist") e.alpha = 0.62 + 0.3 * Math.sin(e.t * 1.7);
    if (e.isBoss) { bossAI(e, dt); continue; }
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    const aggro = e.tame ? 4.6 : 6;
    let sp = e.speed;
    if (e.type === "slime") { const h = Math.sin(e.t * 4.2); sp *= Math.max(0, h) * 2.1; if (h > 0.95 && e.sqv === 0) e.sq = 0.18; }
    switch (e.state) {
      case "idle": {
        e.st -= dt;
        if (e.st <= 0) { e.st = rand(1.5, 3.5); const a = Math.random() * TAU, r = Math.random() * 1.8; e.tx = e.homeX + Math.cos(a) * r; e.ty = e.homeY + Math.sin(a) * r; }
        const tdx = e.tx - e.x, tdy = e.ty - e.y, td = Math.hypot(tdx, tdy);
        if (td > 0.15) walk(e, tdx / td, tdy / td, sp * 0.5, dt); else e.moving = false;
        if (d < aggro && lineFree(m, e.x, e.y, p.x, p.y)) { e.state = "chase"; e.sq = 0.2; text(e.x, e.y, "❗", "#ffe36e", 18, 70 + (e.fly ? 30 : 0)); }
        break;
      }
      case "chase": {
        if (d > 12) { e.state = "idle"; e.homeX = e.x; e.homeY = e.y; break; }
        let [dx, dy] = steer(e);
        if (e.type === "bat") { const s = Math.sin(e.t * 5) * 0.7; const ndx = dx - dy * s, ndy = dy + dx * s; const l = Math.hypot(ndx, ndy); dx = ndx / l; dy = ndy / l; }
        if (e.ranged) {
          const los = lineFree(m, e.x, e.y, p.x, p.y);
          if (d < 2.6 && los) walk(e, -dx, -dy, sp * 0.8, dt);
          else if (d > 4.2 || !los) walk(e, dx, dy, sp, dt);
          else { walk(e, -dy, dx, sp * 0.5 * Math.sin(e.t), dt); faceTo(e, p.x, p.y); }
          if (e.atkCd <= 0 && los && d < 7.5) windup(e, e.tame ? 0.8 : 0.6, "shoot");
        } else if (e.type === "kaefer" && d < 4.8 && d > 1.4 && e.atkCd <= 0 && lineFree(m, e.x, e.y, p.x, p.y, e.r)) {
          windup(e, 0.65, "charge"); e.cdx = dx; e.cdy = dy;
        } else if (e.type === "pilzling" && d < 1.8 && e.atkCd <= 0) {
          windup(e, 0.75, "puff");
        } else if (d < 1.2 + e.r * 0.4 && e.atkCd <= 0) {
          windup(e, e.tame ? 0.55 : 0.38, "lunge");
        } else if (d > 1.05 + e.r * 0.4) walk(e, dx, dy, sp, dt);
        else { e.moving = false; faceTo(e, p.x, p.y); }
        break;
      }
      case "windup": {
        e.st -= dt; e.tele = 1 - e.st / e.stMax; e.moving = false;
        faceTo(e, p.x, p.y);
        if (e.act === "charge") { const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy) || 1; e.cdx = dx / l; e.cdy = dy / l; }
        if (e.st <= 0) strike(e);
        break;
      }
      case "lunge": {
        e.st -= dt;
        walk(e, e.cdx, e.cdy, 4.2, dt);
        if (e.st <= 0) {
          if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 0.85) playerHurt(e.dmg, e.x, e.y);
          recover(e);
        }
        break;
      }
      case "charge": {
        e.st -= dt;
        const hit = moveEnt(m, e, e.cdx * 6 * dt, e.cdy * 6 * dt, e.r * 0.8);
        e.moving = true;
        if (Math.random() < 0.4) P.dust(e.x, e.y);
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 0.45) { playerHurt(e.dmg, e.x, e.y); recover(e); }
        else if (hit) { e.state = "stun"; e.st = 1.0; shake(0.1); P.sparkle(e.x, e.y, "#fff38a", 5, 60); e.sq = -0.3; }
        else if (e.st <= 0) recover(e);
        break;
      }
      case "stun": case "recover": {
        e.st -= dt; e.moving = false;
        if (e.st <= 0) e.state = "chase";
        break;
      }
    }
    if (e.state !== "windup") e.tele = Math.max(0, e.tele - dt * 4);
  }
  // Abstand halten (keine Klumpen, nicht in den Kobold hinein)
  const es = G.ents;
  for (const e of es) {
    if (e.isBoss || e.type === "dummy" || e.state === "lunge" || e.state === "charge") continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), md = 0.75 + e.r * 0.4;
    if (d < md && d > 0.001) moveEnt(m, e, dx / d * (md - d) * 0.3, dy / d * (md - d) * 0.3, e.r * 0.8);
  }
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = (a.r + b.r) * 0.9;
    if (d < md && d > 0.001) {
      const push = (md - d) * 0.5, nx = dx / d * push, ny = dy / d * push;
      if (!a.isBoss && a.type !== "dummy") moveEnt(m, a, -nx, -ny, a.r * 0.8);
      if (!b.isBoss && b.type !== "dummy") moveEnt(m, b, nx, ny, b.r * 0.8);
    }
  }
}
function windup(e, t, act) {
  if (G.mega) t *= 0.75;
  e.state = "windup"; e.st = e.stMax = t; e.act = act; e.sq = 0.15;
}
function recover(e) { e.state = "recover"; e.st = 0.35; e.atkCd = e.tame ? 1.6 : 1.1; }
function strike(e) {
  const p = G.p;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.tele = 0;
  switch (e.act) {
    case "lunge": e.state = "lunge"; e.st = 0.16; e.cdx = dx / d; e.cdy = dy / d; e.sq = -0.25; break;
    case "charge": e.state = "charge"; e.st = 0.75; e.sq = -0.3; break;
    case "puff": {
      e.sq = -0.35;
      burst(e.x, e.y, 16, { kind: "puff", col: "#ffb3e6", add: false, s0: 22, s1: 6, sp0: 1, sp1: 3.2, z: 20, vz0: 10, vz1: 50, g: 0, drag: 3, l0: 0.4, l1: 0.7, fade: 0.8 });
      ring(e.x, e.y, 1.8, "#ffb3e6", 0.3, 0.8);
      if (d < 1.8) playerHurt(e.dmg, e.x, e.y);
      recover(e); break;
    }
    case "shoot": {
      const fire = e.type === "flamme";
      const sp = fire ? 3.8 : 3.2;
      G.shots.push({ kind: fire ? "fire" : "orb", x: e.x, y: e.y, z: 34, vx: dx / d * sp, vy: dy / d * sp, life: 3, t: 0, col: fire ? "#ff9a3a" : (e.tint || "#8fe9ff"), dmg: e.dmg });
      SFX.shoot(); e.sq = -0.2; e.state = "recover"; e.st = 0.3; e.atkCd = (e.tame ? 3 : 2.2) + Math.random();
      break;
    }
  }
}

// ---------- Bosse ----------
function wakeBoss(e) {
  if (e.awake) return;
  e.awake = true; e.state = "chase"; e.st = 1.4;
  SFX.boss(); shake(0.45); vibrate([50, 40, 50]);
  text(e.x, e.y, "❗", "#ff5d73", 34, 200 * e.scale / 1.75);
  H().banner(e.isKing ? "KELLERKÖNIG" : BOSS_NAMES[G.biome].toUpperCase(), e.isKing ? "👑🔥 Herrscher des Koboldkellers" : "👑 der Boss-Kobold ist erwacht!", "boss");
  H().boss(e);
}
function bossAI(e, dt) {
  const p = G.p, m = G.L.map;
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  const fast = G.mega ? 0.7 : 1;
  if (e.isKing && Math.random() < dt * 30) P.ember(e.x + rand(-0.9, 0.9), e.y + rand(-0.9, 0.9), Math.random() < 0.5 ? "#ff7a2a" : "#ffd060");
  if (e.state === "sleep") { e.moving = false; if (d < 7.5) wakeBoss(e); return; }
  faceTo(e, p.x, p.y);
  const RS = e.isKing ? 3.2 : 2.4, RJ = e.isKing ? 2.5 : 1.9;
  switch (e.state) {
    case "chase": {
      e.st -= dt;
      if (d > 1.4) { const [dx, dy] = steer(e); walk(e, dx, dy, e.speed, dt); } else e.moving = false;
      if (e.st <= 0) {
        e.cycle++; e.moving = false;
        const minions = G.ents.filter(o => o.minion).length;
        if (d < RS - 0.4) { e.state = "spinWind"; e.st = e.stMax = 0.85 * fast; G.teles.push({ x: e.x, y: e.y, r: RS, t: 0, max: e.st, follow: e }); SFX.tele(); }
        else if (e.cycle % 4 === 3 && minions < 4) { e.state = "summon"; e.st = 0.6; }
        else if (e.isKing && e.cycle % 2 === 1) { e.state = "fireWind"; e.st = e.stMax = 0.9 * fast; SFX.tele(); }
        else { e.state = "slamWind"; e.st = 0.35 * fast; e.jx = p.x; e.jy = p.y; e.jt = 0; G.teles.push({ x: p.x, y: p.y, r: RJ, t: 0, max: 0.35 * fast + 0.7 }); SFX.tele(); }
      }
      break;
    }
    case "spinWind":
      e.st -= dt; e.tele = 1 - e.st / e.stMax; e.sq = 0.1 * e.tele;
      if (e.st <= 0) {
        e.state = "spin"; e.st = 0.5; e.tele = 0; SFX.swing(); SFX.slam(); shake(0.3);
        ring(e.x, e.y, RS, "#ffd0e0", 0.4, 1.6);
        if (Math.hypot(p.x - e.x, p.y - e.y) < RS + 0.2) playerHurt(e.dmg, e.x, e.y);
      }
      break;
    case "spin":
      e.st -= dt; e.spin = 1 - e.st / 0.5;
      if (e.st <= 0) { e.spin = -1; e.state = "recover"; e.st = 0.9; }
      break;
    case "slamWind":
      e.st -= dt; e.sq = 0.2;
      if (e.st <= 0) { e.state = "jump"; e.st = 0.7; e.sx0 = e.x; e.sy0 = e.y; e.sq = -0.3; }
      break;
    case "jump": {
      e.st -= dt; const k = 1 - e.st / 0.7;
      const nx = e.sx0 + (e.jx - e.sx0) * k, ny = e.sy0 + (e.jy - e.sy0) * k;
      if (canStand(m, nx, ny, e.r * 0.6)) { e.x = nx; e.y = ny; }
      e.z = Math.sin(Math.PI * k) * (e.isKing ? 160 : 120);
      if (e.st <= 0) {
        e.z = 0; e.state = "recover"; e.st = 1.0; e.sq = 0.35;
        SFX.slam(); shake(0.6); vibrate(40); FX.zoomPunch = 0.8;
        ring(e.x, e.y, RJ, "#fff0d0", 0.45, 1.8);
        burst(e.x, e.y, 18, { kind: "puff", col: "#ffffff", add: false, s0: 26, s1: 6, sp0: 1.5, sp1: 4, z: 6, vz0: 10, vz1: 60, g: 0, drag: 3, l0: 0.4, l1: 0.8, fade: 0.8 });
        if (Math.hypot(p.x - e.x, p.y - e.y) < RJ + 0.2) playerHurt(e.dmg, e.x, e.y);
        if (!canStand(m, e.x, e.y, e.r * 0.6)) { const f = nearestFree(m, e.x, e.y, e.r * 0.6); e.x = f.x; e.y = f.y; }
      }
      break;
    }
    case "fireWind":
      e.st -= dt; e.tele = 1 - e.st / e.stMax;
      if (e.st <= 0) {
        e.tele = 0; const n = G.mega ? 16 : 12, off = Math.random() * TAU;
        for (let k = 0; k < n; k++) { const a = off + k * TAU / n; G.shots.push({ kind: "fire", x: e.x, y: e.y, z: 60, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, life: 3.2, t: 0, col: "#ff8a3a", dmg: Math.max(1, e.dmg - 1) }); }
        SFX.shoot(); SFX.slam(); shake(0.3); e.state = "recover"; e.st = 1.0;
      }
      break;
    case "summon": {
      e.st -= dt; e.sq = 0.2 * Math.sin(e.t * 20);
      if (e.st <= 0) {
        const pool = e.isKing ? [["flamme", 1]] : POOLS[G.biome];
        for (let k = 0; k < 2; k++) {
          const a = Math.random() * TAU, sx = e.x + Math.cos(a) * 1.8, sy = e.y + Math.sin(a) * 1.8;
          const f = nearestFree(m, sx, sy, 0.3);
          const mi = makeEnt(weighted(pool), f.x, f.y); mi.minion = true; mi.state = "chase"; mi.xp = Math.ceil(mi.xp / 2);
          G.ents.push(mi); P.poof(f.x, f.y, "#c9a0ff");
        }
        SFX.poof(); e.state = "recover"; e.st = 0.6;
      }
      break;
    }
    case "recover":
      e.st -= dt; e.moving = false; e.tele = Math.max(0, e.tele - dt * 3);
      if (e.st <= 0) { e.state = "chase"; e.st = rand(1.0, 1.8) * fast; }
      break;
  }
}
function updateTeles(dt) {
  for (let i = G.teles.length - 1; i >= 0; i--) {
    const t = G.teles[i];
    t.t += dt;
    if (t.follow) { t.x = t.follow.x; t.y = t.follow.y; if (!G.ents.includes(t.follow)) t.t = t.max; }
    if (t.t >= t.max) G.teles.splice(i, 1);
  }
}

// ---------- Ambiente ----------
function ambient(dt) {
  const p = G.p, b = G.biome, B = BIOMES[b];
  const rate = 7 * FX.budget;
  if (Math.random() < rate * dt) {
    const x = p.x + rand(-7, 7), y = p.y + rand(-7, 7);
    if (isBlocked(G.L.map, x, y)) return;
    switch (b) {
      case 0: part({ x, y, z: rand(30, 90), vx: rand(0.2, 0.6), vy: rand(-0.3, 0), vz: rand(-8, 4), kind: "heart", col: pick(["#ffb3d1", "#fff", "#ffe36e"]), add: false, s0: 7, s1: 5, life: rand(2.5, 4), drag: 0, g: 0, fade: 0.3, vr: 1 }); break;
      case 1: part({ x, y, z: rand(0, 20), vz: rand(10, 25), vx: rand(-0.1, 0.1), kind: "dot", col: B.dust, s0: 5, s1: 2, life: rand(2, 3.5), drag: 0, g: 0, fade: 0.4 }); break;
      case 2: part({ x, y, z: rand(10, 70), kind: "star", col: B.dust, s0: 0, s1: 11, life: rand(0.6, 1.2), g: 0, fade: 0.2, vr: 2 }); break;
      case 3: part({ x, y, z: rand(10, 70), vz: rand(-5, 5), kind: "star5", col: pick(["#ffe0f4", "#fff6a0", "#bfefff"]), s0: 8, s1: 0, life: rand(1, 2), g: 0, fade: 0.4, vr: 2 }); break;
      case 4: part({ x, y, z: rand(90, 140), vz: rand(-30, -20), vx: rand(0.1, 0.4), kind: "dot", col: "#ffffff", add: false, s0: 6, s1: 5, life: rand(3, 4.5), drag: 0, g: 0, fade: 0.2 }); break;
      case 5: P.ember(x, y, pick(["#ffb060", "#ff7a2a"])); break;
    }
  }
  if (G.emberAt) { const t = G.emberAt; G.emberAt = null; part({ x: t.x, y: t.y, z: 44, vz: rand(30, 60), vx: rand(-0.2, 0.2), kind: "dot", col: B.torch || "#ffb060", s0: 5, s1: 0, life: rand(0.6, 1), g: 0 }); }
  // Brunnen-Glitzer
  if (G.L.fountain && Math.random() < dt * 6) { const f = G.L.fountain; part({ x: f.x + rand(-0.3, 0.3), y: f.y + rand(-0.3, 0.3), z: 110, vz: rand(40, 90), vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), g: -260, kind: "dot", col: "#bfefff", s0: 6, s1: 3, life: 0.8, drag: 0.3 }); }
}

// ---------- Tutorial ----------
export function tutUpdate() {
  if (G.tutStep < 0 || G.depth !== 0 || G.screen !== "play") return;
  const f = G.tutFlags, s = G.tutStep;
  const next = (s === 0 && f.walked > 3) || (s === 1 && f.dummy) || (s === 2 && f.bubble) || (s === 3 && f.dodge) || (s === 4 && f.portal);
  if (next) {
    G.tutStep++;
    SFX.pickup(); P.sparkle(G.p.x, G.p.y, "#fff6a0", 8, 80);
    if (G.tutStep > 4) finishTut();
    else H().tut(G.tutStep);
  }
}
export function finishTut() { G.tutStep = -1; if (G.prof) G.prof.tut = true; H().tut(-1); save(); }
