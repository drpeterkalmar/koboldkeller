/* game.js — Zustand, Spieler, Kampf, Gegner-KI, Loot, Ebenen, Sieg (MIT)
   v4: Munition aus Kills, Obergrenzen (❤️/🧪/🫧) mit Gold-Umtausch, großer Magnet, Talente, Spezialangriff über
   Glitzerpilze, Heim-Portal 20 s unsichtbar, Ebenen-Paletten, Schwierigkeitskurve (Elite, Fallen, neue Muster).
   v5: Boss auf jeder 2. Ebene (Mini-Bosse), Treppe/20. Portal versiegelt bis zum Sieg (bossDone), Handlanger-Beute klein.
   v8: schneller laufen (Animation/Wegpunkte/Teilschritte), 20 Stadt-Portale (je Ebene eins, Welttore) mit Ziel-/Verweil-Regel,
   Treppe/Portal per Tipp „scharf“, Wand-Schützen (Wandfallen) mit Vorwarnung.
   v9: Mythos-Kostüme — Sammlung je Gerät (G.myth), Kostüm-Paket beim ersten Boss-Sieg, Glanz-Partikel, Spezial-Welle in Kostümfarbe. */
import {
  PLAYER, ENEMIES, POOLS, BIOMES, BOSS_HAT, HATS, MEGA, MAX_DEPTH, biomeOf, weaponOf, CAP, AMMO, CAP_GOLD, MAGNET,
  HOME_PORTAL_HIDE_S, SPECIAL, SKILLS, SKILL_MAX, SKILL_PER_LEVEL, makeLook, lookSave, levelBiome, levelName, diffOf,
  ARENA, MINIS, BOSSES, bossKindOf, WALLTRAP, WALLTRAP_LOOK, MYTHS, MYTH_BY_ID, MYTH_FX, mythOfBoss, URLQ,
} from "./config.js";
import { buildTown, buildDungeon, findPath, moveEnt, canStand, nearestFree, lineFree, isBlocked, placeWallTraps, TOWN_WORLD_COL } from "./world.js";
import { FX, P, part, burst, ring, text, shake, hitstop, slowmo, flash, resetFx } from "./fx.js";
import { SFX, playMusic } from "./audio.js";
import { haptic } from "./platform.js";
import { writeSave, addHall, initMyths, saveMyths } from "./save.js";
import { mythFoot } from "./myth.js";
import { rand, randi, pick, weighted, TAU, shade, clamp } from "./util.js";
import { initBoss, bossAI, bossHit, bossKilled, wakeBoss, arenaTick, bossFight } from "./boss.js";

export const G = {
  screen: "menu", depth: 0, biome: 0, B: BIOMES[0], L: null, p: null, prof: null,
  ents: [], items: [], shots: [], teles: [], spawns: [], bossDone: [],
  gold: 0, mega: false, runSecs: 0, runFrom: 1, t: 0, boss: null, deepest: 1,
  god: false, winQueued: false, darkness: 0, joy: { x: 0, y: 0, m: 0 }, hold: null,
  flow: null, flowT: 0, seenT: 0, saveT: 0, portalCd: 0, lockToastT: 0, tutStep: -1, tutFlags: {},
  homeHideT: 0, emptyT: 0, emptyToastT: 0, specToastT: 0, capToastT: 0, camFocus: null, later: [], specFx: null, mirrorArmed: true,
  hooks: { toast() { }, banner() { }, hud() { }, boss() { }, bossIntro() { }, win() { }, dead() { }, level() { }, tut() { }, fade(cb) { cb(); }, editor() { } },
  stats: { kills: 0, dmgTaken: 0, potionsUsed: 0, specials: 0, wallHits: 0 },
};
export const H = () => G.hooks;
// ---------- v9: Kostüm-Sammlung ----------
// ?kostueme=alle: nur zum Anschauen alle frei — nichts wird gespeichert (weder Sammlung noch getragenes Kostüm)
G.myth = (() => { const m = initMyths(), view = URLQ.get("kostueme") === "alle"; return { have: view ? MYTHS.map(x => x.id) : m.have, real: m.have, note: m.note, view }; })();
export const mythHave = id => G.myth.have.includes(id);
export const mythReal = id => G.myth.real.includes(id);
/** Kostüm freischalten (Sammlung des Geräts) — true, wenn es neu war */
export function unlockMyth(id) {
  if (!MYTH_BY_ID[id] || mythReal(id)) return false;
  G.myth.real.push(id);
  if (!G.myth.have.includes(id)) G.myth.have.push(id);
  if (!G.myth.view && !G.demo) saveMyths(G.myth.real, G.myth.note);
  return true;
}
/** Look für den Spielstand: in der Nur-Ansehen-Ansicht (?kostueme=alle) nie ein nicht verdientes Kostüm speichern */
export function lookForSave(L) { const o = lookSave(L); if (o.myth && !mythReal(o.myth)) { delete o.myth; delete o.mhat; } return o; }
/** Ereignis nach sec Spielzeit (steht in Pause/Hit-Stop still). tag = "boss": wird beim Boss-Sieg abgebrochen */
export function later(sec, fn, tag) { G.later.push({ t: sec, fn, tag }); }

// =====================================================================
// Spieler
// =====================================================================
export function makePlayer(prof) {
  const look = makeLook(prof.look || { species: prof.species });
  const p = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, r: 0.3, face: 1, moving: false, walkPh: 0, t: 0, sq: 0, sqv: 0,
    hp: prof.hp, maxHp: prof.maxHp, hpBase: prof.maxHp, lvl: prof.lvl, xp: prof.xp, xpNext: prof.xpNext,
    atk: prof.atk, atkBase: prof.atk, projN: prof.projN, magic: prof.magic, potions: prof.potions,
    ammo: prof.ammo ?? AMMO.start, ammoMax: CAP.ammoBase, spec: prof.spec || 0, sk: { ...prof.sk }, skPts: prof.skPts || 0,
    hats: prof.hats.slice(), hat: prof.hat, name: prof.name, species: look.species, look,
    atkCd: 0, bubCd: 0, dashCd: 0, spinT: 0, dashT: 0, dashDx: 0, dashDy: 0, hurtT: 0, flashT: 0, invulT: 0, castT: 0, specT: 0,
    path: null, foe: null, lastMx: 1, lastMy: 0, stepT: 0, trailT: 0, pendingSwing: -1, stuckT: 0,
    spdMul: 1, bubMul: 1, magBonus: 0, rig: null,
  };
  for (const s of SKILLS) p.sk[s.id] = p.sk[s.id] | 0;
  recalc(p);
  p.rig = {
    look, outfit: look.outfit, footCol: mythFoot(look) || shade(look.outfit, -0.35), cape: null, hat: p.hat, hatRed: false,
    mood: "open", scale: 0.86, face: 1, t: 0, sq: 0, moving: false, walkPh: 0, spin: -1, wpn: "stick", wand: 1,
    flash: false, alpha: 1, tilt: 0, cast: 0,
  };
  return p;
}
/** abgeleitete Werte aus Grundwerten + Talenten (mit Obergrenzen) */
export function recalc(p) {
  const sk = p.sk;
  p.maxHp = Math.min(CAP.hp, p.hpBase + sk.leben * 2);
  p.atk = p.atkBase + sk.kraft * 0.5;
  p.spdMul = 1 + sk.tempo * 0.05;
  p.ammoMax = Math.min(CAP.ammoMax, CAP.ammoBase + sk.blasen * 4);
  p.bubMul = 1 + sk.blasen * 0.1;
  p.magBonus = sk.magnet * 0.35;
  p.hp = Math.min(p.hp, p.maxHp); p.ammo = Math.min(p.ammo, p.ammoMax);
}
/** neues Aussehen (Editor) übernehmen */
export function setLook(o) {
  const p = G.p; if (!p) return;
  p.look = makeLook(o); p.species = p.look.species;
  Object.assign(p.rig, { look: p.look, outfit: p.look.outfit, footCol: mythFoot(p.look) || shade(p.look.outfit, -0.35) });
  save();
}
export function profileFromGame() {
  const p = G.p, pr = G.prof;
  Object.assign(pr, {
    name: p.name, species: p.species, look: lookForSave(p.look), lvl: p.lvl, xp: p.xp, xpNext: p.xpNext, maxHp: p.hpBase, hp: Math.max(1, Math.ceil(p.hp)),
    atk: p.atkBase, projN: p.projN, magic: p.magic, gold: G.gold, potions: p.potions, ammo: p.ammo, spec: p.spec, sk: { ...p.sk }, skPts: p.skPts,
    hats: p.hats.slice(), hat: p.hat, deepest: G.deepest, depth: G.depth, mega: G.mega, runSecs: G.runSecs,
    kills: G.stats.kills, bossDone: G.bossDone.slice(),
  });
  return pr;
}
export function save() {
  if (!G.p || !G.prof || G.demo) return;
  writeSave(profileFromGame());
  H().saved && H().saved();
}

// =====================================================================
// Talente (Skillpunkte)
// =====================================================================
/** kann der Punkt noch etwas bewirken? (sonst „voll") */
export function skillFull(id) {
  const p = G.p; if (!p) return true;
  if (p.sk[id] >= SKILL_MAX) return true;
  if (id === "leben" && p.hpBase + p.sk.leben * 2 >= CAP.hp) return true;
  if (id === "blasen" && CAP.ammoBase + p.sk.blasen * 4 >= CAP.ammoMax) return true;
  return false;
}
export function skillUp(id) {
  const p = G.p;
  if (!p || p.skPts <= 0 || !SKILLS.some(s => s.id === id) || skillFull(id)) return false;
  const hp0 = p.maxHp;
  p.sk[id]++; p.skPts--;
  recalc(p);
  if (p.maxHp > hp0) p.hp += p.maxHp - hp0;
  SFX.pickup(); P.sparkle(p.x, p.y, "#fff38a", 8, 60);
  save();
  return true;
}
/** Umverteilen: kostenlos, aber nur in der Stadt */
export function skillReset() {
  const p = G.p;
  if (!p || G.depth !== 0) return 0;
  let n = 0;
  for (const s of SKILLS) { n += p.sk[s.id]; p.sk[s.id] = 0; }
  p.skPts += n; recalc(p); save();
  return n;
}

// =====================================================================
// Spielstart / Ebenen
// =====================================================================
export function startGame(prof) {
  G.prof = prof;
  G.p = makePlayer(prof);
  G.gold = prof.gold; G.mega = prof.mega; G.deepest = prof.deepest; G.runSecs = prof.runSecs || 0;
  G.bossDone = Array.isArray(prof.bossDone) ? prof.bossDone.slice() : [];
  G.stats.kills = prof.kills || 0;
  G.winQueued = false;
  G.tutStep = prof.tut ? -1 : 0; G.tutFlags = {};
  enterLevel(prof.depth || 0, true);
  // v9: einmaliger Hinweis nach der Kostüm-Migration (Sammlung des Geräts)
  if (!G.demo && G.myth.note > 0 && !G.myth.view) {
    const n = G.myth.note; G.myth.note = 0; saveMyths(G.myth.real, 0);
    setTimeout(() => H().toast("🦄 Du hast " + n + (n === 1 ? " Kostüm" : " Kostüme") + " verdient! Schau am 🪞 Spiegel in der Stadt."), 2400);
  }
  // einmalige Umzugs-Hinweise (v3 → v4)
  if (!G.demo && (prof.capNote || prof.giftNote)) {
    const cg = prof.capNote, gp = prof.giftNote;
    prof.capNote = 0; prof.giftNote = 0; save();
    setTimeout(() => {
      if (cg) H().toast("🎒 Dein Rucksack war zu voll — dafür gibt's +" + cg + " 🪙!");
      if (gp) setTimeout(() => H().toast("⭐ Willkommen in v4: " + gp + " Talentpunkte geschenkt — schau in den 🎒 Rucksack!"), cg ? 1600 : 0);
    }, 1900);
  }
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
  G.depth = depth; G.biome = biomeOf(depth); G.B = levelBiome(depth);
  const seed = G.prof.seed;
  const bk = bossKindOf(depth);
  const L = depth === 0 ? buildTown(seed) : buildDungeon(seed, depth, G.biome, diffOf(depth).room, bk ? ARENA[depth] : null);
  G.L = L;
  G.ents = []; G.items = []; G.shots = []; G.teles = []; G.spawns = []; G.boss = null; G.later = []; G.specFx = null; G.camFocus = null;
  if (L.stairs) {
    // v5: Auf Boss-Ebenen ist die Treppe (Ebene 20: das 20. Portal) versiegelt, solange der Boss dieser Ebene nicht besiegt ist
    L.bossKind = bk; L.stairs.sealed = !!bk && !G.bossDone.includes(depth); L.stairs.armed = true;
    if (L.arena) L.arena.optional = !L.stairs.sealed;           // schon besiegt: Tore bleiben offen, Kampf freiwillig
  }
  resetFx();
  const p = G.p;
  p.x = L.entry.x; p.y = L.entry.y; p.vx = p.vy = 0; p.path = null; p.foe = null; p.goal = null; p.dashT = 0; p.z = 0; p.specT = 0;
  p.invulT = 1.2;
  G.hold = null; G.portalCd = 1.0; G.flow = null; G.flowT = 0; G.darkness = 0; G.mirrorArmed = false;
  L.homeArmed = false; L.traps = L.traps || []; L.wallTraps = L.wallTraps || [];
  if (depth === 0) {
    for (const d of L.dummies) G.ents.push(makeEnt("dummy", d.x, d.y));
    // v8: jede erreichte Ebene einzeln wählbar (bis G.deepest) — Boss-Ebenen 👑, Mini-Boss-Ebenen ⚡, noch nicht erreichte 🔒
    for (const po of L.portals) {
      po.locked = po.depth > G.deepest;
      po.col = BIOME_PORTAL[biomeOf(po.depth)];
      po.icon = po.locked ? "🔒" : portalIcon(po.depth);
      po.label = po.icon + " " + po.depth;
      po.name = levelName(po.depth); po.dwell = 0;
    }
    L.lights = L.lights || [];
    G.runSecs = 0; G.homeHideT = 0;
    playMusic("town", 0);
  } else {
    Object.assign(L.homePortal, { col: "#7fffd4", small: true, label: "🏠 Stadt", home: true, hidden: true, appearT: 0 });
    G.homeHideT = HOME_PORTAL_HIDE_S;          // nach jedem Betreten 20 s komplett weg (kein Versehen-Zurücklaufen)
    populate(L, depth);
    playMusic("dungeon", G.biome);
  }
  SFX.arrive();
  const B = BIOMES[G.biome], nm = levelName(depth);
  if (depth === 0) H().banner("Koboldstadt", "🏠 Willkommen zu Hause!");
  else if (depth === 20) { H().banner(nm, "Ebene 20 · 👑 Der Kellerkönig wartet …", "", true); H().toast(L.stairs.sealed ? "Besiege den Kellerkönig — dann öffnet sich das ✨ 20. Portal!" : "Das ✨ 20. Portal ist offen — oder fordere den Kellerkönig noch einmal heraus!"); }
  else if (bk === "main") H().banner(nm, "Ebene " + depth + " · " + B.name + " · 👑 " + BOSSES[G.biome].name + " wartet in der Arena!", "", true);
  else if (bk === "mini") H().banner(nm, "Ebene " + depth + " · " + B.name + " · ⚡ Mini-Boss " + MINIS[depth].name + " lauert!", "", true);
  else if ((depth - 1) % 4 === 0) H().banner(nm, "✨ Neue Welt: " + B.name + " · Ebene " + depth, "", true);
  else H().banner(nm, "Ebene " + depth + " · " + B.name, "", true);
  if (depth > 0) { G.deepest = Math.max(G.deepest, depth); save(); }
  else save();
}
const BIOME_PORTAL = ["#7fffd4", "#8fff8a", "#8fe9ff", "#ff9ae0", "#dff6ff", "#ffae5a"];
export const portalIcon = d => { const k = bossKindOf(d); return k === "main" ? "👑" : k === "mini" ? "⚡" : "🌀"; };
export const PORTAL_DWELL = 0.45;          // v8: Stadt-Portal ohne Tipp-Ziel erst nach so langem Stehen (Vorbeilaufen löst nichts aus)

function populate(L, depth) {
  const b = G.biome, D = diffOf(depth);
  const spots = L.spots.slice();
  const take = (minDist = 7) => {
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      if (Math.hypot(s.x - L.entry.x, s.y - L.entry.y) >= minDist && (!L.arena || s.room !== 0)) { spots.splice(i, 1); return s; }
    }
    return null;
  };
  const pool = POOLS[b];
  for (let i = 0; i < D.n; i++) {
    const s = take(); if (!s) break;
    const e = makeEnt(depth <= 1 ? weighted([["bat", 40], ["slime", 35], ["wichtel", 25]], L.rnd) : weighted(pool, L.rnd), s.x, s.y);
    if (L.rnd() < D.elite) makeElite(e);
    G.ents.push(e);
  }
  // Boss
  if (L.isBoss) {
    const a = L.arena;
    const boss = makeEnt(depth >= 20 ? "king" : L.bossKind === "mini" ? "mini" : "boss", a.cx, a.cy);
    G.ents.push(boss); G.boss = boss;
  }
  // Fallen (Pieks-Platten): nicht am Eingang, nicht in der Boss-Arena
  L.traps = [];
  for (let i = 0; i < D.traps; i++) {
    const s = take(5); if (!s) break;
    L.traps.push({ x: s.x, y: s.y, ph: L.rnd() * TRAP.period, st: 0, hitT: 0 });
  }
  // v8: Wand-Schützen — nicht im Eingangsraum, nicht in der Arena, nie zwei auf demselben Gang (world.js placeWallTraps)
  const nW = D.wall + (G.mega && D.wall ? WALLTRAP.megaPlus : 0);
  L.wallTraps = nW ? placeWallTraps(L, nW, WALLTRAP) : [];
  L.wallTraps.forEach((w, i) => { w.st = 0; w.t = 0; w.next = 1.2 + i * WALLTRAP.period / L.wallTraps.length + L.rnd() * WALLTRAP.jit; w.look = WALLTRAP_LOOK[G.biome] || WALLTRAP_LOOK[1]; w.fired = 0; });
  // Items
  const put = (kind, v) => { const s = take(3); if (s) G.items.push(makeItem(kind, s.x, s.y, v)); };
  for (let i = 0; i < 7 + depth * 2; i++) put("coin");
  for (let i = 0; i < 3; i++) put("mushroom");
  put("potion"); put("heart");
  const nUp = 1 + ((L.rnd() * 2) | 0);
  for (let i = 0; i < nUp; i++) put(pick(["sword", "wand", "gem"], L.rnd));
}
const TRAP = { period: 3.4, warn: 2.2, up: 3.0 };
export { TRAP };

// =====================================================================
// Gegner
// =====================================================================
export function makeEnt(type, x, y) {
  const d = G.depth, Lv = (G.p && G.p.lvl) || 1, def = ENEMIES[type], D = d > 0 ? diffOf(d) : null;
  const mega = G.mega && type !== "dummy";
  const hp = Math.round((def.hp[0] + def.hp[1] * d + def.hp[2] * Lv) * (D ? D.hp : 1));
  const e = {
    type, x, y, z: 0, r: def.r, hp, maxHp: hp, xp: Math.round(def.xp[0] + def.xp[1] * d + def.xp[2] * Lv),
    speed: def.speed * (D ? D.spd : 1) * (mega ? MEGA.speed : 1), fly: !!def.fly, ranged: !!def.ranged,
    dmg: (D ? D.dmg : 1) + Math.floor(Lv / 10), cdMul: D ? D.cd : 1,
    face: 1, t: Math.random() * 10, sq: 0, sqv: 0, flashT: 0, hurtT: 0, kx: 0, ky: 0,
    state: "idle", st: rand(0.5, 2), atkCd: rand(0.5, 1.5), tele: 0, moving: false,
    homeX: x, homeY: y, tx: x, ty: y, tint: null, alpha: 1, scale: 1, awake: false, wob: 0, invulT: 0, blinkCd: rand(2, 5),
  };
  if (mega) e.dmg *= MEGA.dmg;
  if (D && D.tame) e.tame = true;
  const b = G.biome;
  if (type === "slime") e.tint = G.B.slime || BIOMES[b].slime || "#7be07a";
  if (type === "bat") e.tint = ["#8a5cd6", "#8a5cd6", "#6f7fe0", "#c75ca8", "#7fa8d8", "#a04a4a"][b];
  if (type === "wisp") e.tint = ["#8fe9ff", "#b6ff8a", "#8fe9ff", "#ffb3f0", "#dff6ff", "#ffc06a"][b];
  if (type === "kaefer") e.tint = ["#6fb8ff", "#6fb8ff", "#7fd8ff", "#ff9ad8", "#bfe9ff", "#ff8a5a"][b];
  if (type === "pilzling") e.tint = ["#ff6fae", "#ff9a6a", "#b48cff", "#ff6fae", "#8fb8ff", "#ff7a4a"][b];
  if (type === "wichtel") e.tint = ["#e8434f", "#e8434f", "#5f86e0", "#ff6fae", "#4fb0e0", "#ff7a2a"][b];
  if (type === "boss" || type === "king" || type === "mini") initBoss(e, Lv);
  if (type === "dummy") { e.speed = 0; e.state = "dummy"; }
  return e;
}
/** Elite: 2,2× Leben, +1 Schaden, größer, goldene Krone, mehr Beute */
export function makeElite(e) {
  if (e.isBoss || e.type === "dummy" || e.elite) return e;
  e.elite = true;
  e.hp = e.maxHp = Math.round(e.maxHp * 2.2);
  e.dmg += G.mega ? MEGA.dmg : 1;
  e.scale = 1.3; e.r *= 1.18; e.speed *= 1.08; e.xp = Math.round(e.xp * 2.5);
  return e;
}

export function hurtEnt(e, dmg, kx = 0, ky = 0, crit = false, src = "sword") {
  if (e.hp <= 0) return;
  if (e.invulT > 0) {                                    // Boss-Intro / Phasenwechsel: kurz unverwundbar
    if ((e.shieldTxtT || 0) <= G.t) { e.shieldTxtT = G.t + 0.5; text(e.x, e.y, "🛡️", "#ffffff", 20, 70 * (e.scale || 1)); }
    return;
  }
  e.hp -= dmg; e.flashT = 0.09; e.hurtT = 0.28; e.sq = -0.22; e.sqv = 0;
  if (e.type === "dummy") e.wob = 1;
  const kb = e.isBoss ? 0.15 : e.elite ? 0.6 : 1;
  e.kx += kx * 5.5 * kb; e.ky += ky * 5.5 * kb;
  P.hit(e.x, e.y, crit ? "#ffe36e" : "#fff3b0");
  text(e.x, e.y, (crit ? "💥" : "") + fmt(dmg), crit ? "#ffe36e" : "#ffffff", crit ? 26 : 19, 60 * (e.scale || 1) + (e.fly ? 30 : 0));
  SFX.hit({ x: e.x, y: e.y, dmg, crit, boss: e.isBoss, src });
  if (e.isBoss) { if (!e.awake) wakeBoss(e); if (e.hp > 0) bossHit(e, crit); }
  if (e.state === "idle") { e.state = "chase"; e.st = 0; }
  if (e.hp <= 0) killEnt(e);
}
export const fmt = n => (Math.round(n * 10) / 10).toString().replace(".", ",");

export function killEnt(e) {
  const i = G.ents.indexOf(e);
  if (i >= 0) G.ents.splice(i, 1);
  const p = G.p;
  if (p.foe === e) p.foe = null;
  if (e.type === "dummy") {
    P.poof(e.x, e.y, "#ffe9a0"); SFX.poof({ x: e.x, y: e.y });
    G.tutFlags.dummy = true;
    gainAmmo(AMMO.dummy, e.x, e.y);
    setTimeout(() => { if (G.depth === 0 && G.L && G.L.dummies) { const d = makeEnt("dummy", e.homeX, e.homeY); G.ents.push(d); P.sparkle(d.x, d.y, "#fff", 8); } }, 1500);
    return;
  }
  G.stats.kills++;
  P.poof(e.x, e.y, e.tint || "#ffd0e8", e.isBoss || e.elite);
  SFX.poof({ x: e.x, y: e.y, boss: e.isBoss });
  hitstop(e.isBoss ? 200 : e.elite ? 90 : 55);
  shake(e.isBoss ? 0.8 : e.elite ? 0.35 : 0.22);
  if (e.isBoss) haptic("bossKill");
  // Munition: jeder besiegte Gegner füllt die Seifenblasen auf
  gainAmmo(e.isKing ? AMMO.king : e.isMini ? AMMO.mini : e.isBoss ? AMMO.boss : e.elite ? AMMO.elite : e.minion ? AMMO.minion : AMMO.kill, e.x, e.y);
  if (e.minion) {                                          // Handlanger: wenig Beute (kein Farmen)
    if (Math.random() < 0.4) G.items.push(flyItem("coin", e.x, e.y));
    if (Math.random() < 0.05) G.items.push(flyItem("heart", e.x, e.y));
  } else if (e.isMini) {                                   // Mini-Boss: ordentlich, aber weniger als ein Hauptboss
    for (let k = 0; k < 8; k++) G.items.push(flyItem("coin", e.x, e.y));
    G.items.push(flyItem("mushroom", e.x, e.y)); G.items.push(flyItem("heart", e.x, e.y));
    if (Math.random() < 0.5) G.items.push(flyItem("potion", e.x, e.y));
    if (Math.random() < 0.5) G.items.push(flyItem(pick(["sword", "wand", "gem"]), e.x, e.y));
  } else {
  // Münz-Explosion
  const nC = e.isKing ? 40 : e.isBoss ? 16 : e.elite ? randi(4, 7) : randi(1, 3);
  for (let k = 0; k < nC; k++) G.items.push(flyItem("coin", e.x, e.y));
  if (e.isBoss || Math.random() < (e.elite ? 0.35 : 0.08)) G.items.push(flyItem("potion", e.x, e.y));
  if (!e.isBoss && Math.random() < (e.elite ? 0.4 : 0.1)) G.items.push(flyItem("heart", e.x, e.y));
  if (e.isBoss) { G.items.push(flyItem("mushroom", e.x, e.y)); G.items.push(flyItem("mushroom", e.x, e.y)); }
  else if (Math.random() < (e.elite ? 0.3 : 0.06)) G.items.push(flyItem("mushroom", e.x, e.y));
  const up = e.isBoss ? 1 : e.elite ? 0.25 : 0.07;
  if (Math.random() < up) G.items.push(flyItem(pick(["sword", "wand", "gem"]), e.x, e.y));
  }
  if (e.isBoss && !e.isMini) {
    const h = BOSS_HAT[G.biome];
    if (h && !p.hats.includes(h)) G.items.push(flyItem("hat", e.x, e.y, h));
  }
  // v9: Kostüm-Paket beim ersten Sieg über diesen Boss (Mini, Haupt, König; König auf MEGASCHWER: zusätzlich der Sternendrache)
  if (e.isBoss && !G.demo) {
    const drops = [mythOfBoss(G.depth)];
    if (e.isKing && G.mega) drops.push(MYTH_BY_ID.sternendrache);
    for (const M of drops) if (M && !mythReal(M.id) && !G.items.some(it => it.kind === "myth" && it.v === M.id)) { const it = flyItem("myth", e.x, e.y, M.id); it.vz = 320; it.flyT = 0.9; G.items.push(it); }
  }
  // Schleime teilen sich ab Tiefe 6 in zwei kleine
  const D = G.depth > 0 ? diffOf(G.depth) : null;
  if (D && D.split && e.type === "slime" && !e.mini && !e.minion) {
    for (const s of [-1, 1]) {
      const f = nearestFree(G.L.map, e.x + s * 0.5, e.y - s * 0.3, 0.25);
      const m = makeEnt("slime", f.x, f.y);
      Object.assign(m, { mini: true, scale: 0.62, r: m.r * 0.7, hp: Math.max(1, Math.round(e.maxHp * 0.35)), xp: Math.ceil(e.xp / 3), speed: m.speed * 1.2, state: "chase", tint: e.tint });
      m.maxHp = m.hp; m.kx = s * 3; m.ky = -s * 2; m.sq = 0.3;
      G.ents.push(m);
    }
  }
  gainXp(e.xp);
  if (e.isBoss) bossKilled(e);
}

// =====================================================================
// XP / Level / Munition
// =====================================================================
export function gainXp(n) {
  const p = G.p;
  p.xp += n;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.lvl++; p.xpNext = Math.floor(p.xpNext * 1.4) + 4;
    p.hpBase = Math.min(CAP.hp, p.hpBase + 1); p.skPts += SKILL_PER_LEVEL;
    recalc(p); p.hp = p.maxHp;
    const bub = p.lvl % 3 === 0;
    if (bub) p.projN++;
    H().toast("⭐ Level " + p.lvl + "! +" + SKILL_PER_LEVEL + " Talentpunkte — tipp auf ⭐" + (bub ? " · 🫧+1 Blase" : ""));
    text(p.x, p.y, "⭐ LEVEL " + p.lvl + "!", "#fff38a", 30, 110);
    SFX.levelup(); P.levelUp(p.x, p.y);
    haptic("levelup");
  }
}
export function gainAmmo(n, x, y) {
  const p = G.p;
  if (!p || !n) return;
  if (p.ammo >= p.ammoMax) {                              // voll → kleines Gold statt stillem Verfall
    G.gold += CAP_GOLD.ammo;
    if (G.capToastT <= G.t) { G.capToastT = G.t + 2.5; text(x, y, "🫧 voll → +" + CAP_GOLD.ammo + " 🪙", "#ffe36e", 15, 95); }
    return;
  }
  p.ammo = Math.min(p.ammoMax, p.ammo + n);
  text(x, y, "+" + n + " 🫧", "#bfefff", 16, 95);
}

// =====================================================================
// Items
// =====================================================================
function makeItem(kind, x, y, v) { return { kind, x, y, z: 0, vx: 0, vy: 0, vz: 0, seed: Math.random() * 7, v: v || "", flyT: 0 }; }
export function flyItem(kind, x, y, v) {
  const it = makeItem(kind, x, y, v), a = Math.random() * TAU, sp = rand(0.8, kind === "coin" ? 2.6 : 1.6);
  it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp; it.vz = rand(160, 280); it.z = 20; it.flyT = 0.7;
  return it;
}
/** Beute-Regen: Münzen fallen vom Himmel (Boss-Sieg) */
export function rainItem(kind, x, y) {
  const it = makeItem(kind, x, y); it.z = rand(220, 420); it.vz = rand(-40, 0); it.flyT = 0.4;
  return it;
}
function capGold(n, x, y, msg) {
  G.gold += n; SFX.coin(); P.coinPick(x, y);
  text(x, y, msg + " → +" + n + " 🪙", "#ffe36e", 16, 95);
}
function pickup(it) {
  const p = G.p;
  switch (it.kind) {
    case "coin": G.gold++; SFX.coin(); haptic("coin"); P.coinPick(it.x, it.y); return true;
    case "potion":
      if (p.potions >= CAP.potions) { capGold(CAP_GOLD.potion, it.x, it.y, "🧪 voll"); return true; }
      p.potions++; SFX.pickup(); haptic("pickup"); H().toast("🧪 Trank eingesackt! (" + p.potions + "/" + CAP.potions + ")"); P.sparkle(it.x, it.y, "#ff8fb8", 6); return true;
    case "heart":
      if (p.hp >= p.maxHp) { capGold(CAP_GOLD.heart, it.x, it.y, "❤️ voll"); return true; }
      { const h = Math.max(2, Math.ceil(p.maxHp * 0.12)); p.hp = Math.min(p.maxHp, p.hp + h); P.heal(p.x, p.y); SFX.heal(); text(p.x, p.y, "+" + h + " ❤️", "#ff8fb8", 20, 90); }
      return true;
    case "mushroom":                                       // Glitzerpilze heilen NICHT — sie laden den Spezialangriff
      if (p.spec >= 1) { capGold(CAP_GOLD.shroom, it.x, it.y, "🍄 voll"); return true; }
      p.spec = Math.min(1, p.spec + SPECIAL.perShroom);
      if (p.spec > 0.999) p.spec = 1;
      SFX.pickup(); haptic("pickup"); P.sparkle(it.x, it.y, "#ff9ae0", 10, 40);
      if (p.spec >= 1) { H().toast("✨ Spezialangriff bereit! Drück den ✨-Knopf!"); text(p.x, p.y, "✨ SPEZIAL BEREIT!", "#fff38a", 22, 110); }
      else text(p.x, p.y, "🍄 +" + Math.round(SPECIAL.perShroom * 100) + " %", "#ff9ae0", 17, 95);
      return true;
    case "sword": {
      const before = weaponOf(p.atk).name;
      p.atkBase += 1; recalc(p); SFX.pickup(); haptic("pickup"); P.sparkle(it.x, it.y, "#ffd75e", 14, 40);
      const w = weaponOf(p.atk);
      H().toast(w.name !== before ? "⚔️ NEUE WAFFE: " + w.name + "! (Schaden " + fmt(p.atk) + ")" : "⚔️ Schärfer! Schaden +1 (jetzt " + fmt(p.atk) + ")");
      save(); return true;
    }
    case "wand": p.projN++; SFX.pickup(); haptic("pickup"); P.sparkle(it.x, it.y, "#9be1ff", 14, 40); H().toast("🪄 Zauberstab! " + p.projN + " Seifenblasen pro Schuss (kostet trotzdem nur 1 🫧)!"); save(); return true;
    case "gem": p.magic++; SFX.pickup(); haptic("pickup"); P.sparkle(it.x, it.y, "#d9b3ff", 14, 40); H().toast("✨ Glitzerstein! Blasen-Schaden +1"); save(); return true;
    case "myth": {                                          // v9: Kostüm-Paket — Jubel, Toast mit „Anziehen“, Spiel läuft weiter
      const M = MYTH_BY_ID[it.v];
      if (!M) return true;
      const fresh = unlockMyth(M.id);
      P.levelUp(p.x, p.y); P.sparkle(p.x, p.y, M.tier === "mythisch" ? "#ffd75e" : "#ffffff", 16, 70);
      burst(p.x, p.y, 16, { kind: "star5", col: M.col.fx[0], s0: 14, s1: 0, sp0: 1, sp1: 3.2, z: 50, vz0: 120, vz1: 260, g: -260, l0: 0.6, l1: 1.1 });
      SFX.levelup(); haptic("levelup");
      if (fresh || G.myth.view) H().mythFound && H().mythFound(M.id);
      return true;
    }
    case "hat": {
      const h = it.v;
      let full = false;
      if (!p.hats.includes(h)) { p.hats.push(h); full = p.hpBase >= CAP.hp; p.hpBase = Math.min(CAP.hp, p.hpBase + 2); recalc(p); p.hp = p.maxHp; }
      p.hat = h; SFX.levelup(); P.levelUp(p.x, p.y); haptic("levelup");
      H().toast(HATS[h].emoji + " " + HATS[h].name + "! Sieht super aus" + (full ? " · ❤️ schon voll" : " · ❤️+2")); save(); return true;
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
  if (!playing() || p.atkCd > 0 || p.specT > 0) return false;
  p.atkCd = PLAYER.atkCd; p.spinT = 0.28; p.pendingSwing = 0.07;
  p.sq = 0.12; SFX.swing({ tier: ["stick", "wood", "crystal", "star", "rainbow"].indexOf(weaponOf(p.atk).key) });
  G.tutFlags.attack = true;
  return true;
}
function doSwing() {
  const p = G.p;
  const R = PLAYER.atkRadius + (p.atk > 6 ? 0.6 : 0);
  ring(p.x, p.y, R, "#fff6d0", 0.32, 1.1);
  let hits = 0, kills = 0, crits = 0, heavy = false;
  for (const e of G.ents.slice()) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < R + e.r * 0.5) {
      const crit = Math.random() < 0.12;
      const dx = (e.x - p.x) / (d || 1), dy = (e.y - p.y) / (d || 1);
      const before = G.ents.length;
      hurtEnt(e, p.atk * (crit ? 2 : 1), dx, dy, crit);
      hits++; if (G.ents.length < before) kills++; if (crit) crits++; if (p.atk * (crit ? 2 : 1) >= 6) heavy = true;
    }
  }
  for (const pr of G.L.props) if (pr.kind === "pot" && !pr.broken && Math.hypot(pr.x - p.x, pr.y - p.y) < R) breakPot(pr);
  if (hits) {
    hitstop(kills ? 70 : 45); shake(0.14 + Math.min(0.2, hits * 0.04));
    haptic(crits ? "crit" : kills ? "kill" : heavy ? "heavy" : "hit");
    FX.zoomPunch = Math.max(FX.zoomPunch, 0.35);
  }
}
function breakPot(pr) {
  pr.broken = true;
  const i = G.L.props.indexOf(pr); if (i >= 0) G.L.props.splice(i, 1);
  P.poof(pr.x, pr.y, "#e8c090"); SFX.pot({ x: pr.x, y: pr.y });
  burst(pr.x, pr.y, 8, { kind: "dot", col: "#c98a5a", add: false, s0: 7, s1: 3, sp0: 1, sp1: 3, z: 14, vz0: 80, vz1: 200, g: -500, l0: 0.4, l1: 0.7, bounce: 0.3 });
  const n = Math.random() < 0.6 ? randi(1, 3) : 0;
  for (let k = 0; k < n; k++) G.items.push(flyItem("coin", pr.x, pr.y));
  if (Math.random() < 0.1) G.items.push(flyItem("mushroom", pr.x, pr.y));
  else if (Math.random() < 0.12) G.items.push(flyItem("heart", pr.x, pr.y));
}
export function bubbles() {
  const p = G.p;
  if (!playing() || p.bubCd > 0 || p.specT > 0) return false;
  if (p.ammo <= 0) { ammoEmpty(); return false; }
  p.ammo--;                                               // 1 Schuss = 1 Munition, egal wie viele Blasen
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
  const share = 1 / (1 + 0.25 * (N - 1));                 // mehr Blasen = breiter + insgesamt stärker, aber jede einzelne etwas schwächer
  for (let k = 0; k < N; k++) {
    const a = ang + (N > 1 ? (k - (N - 1) / 2) * 0.36 : 0);
    G.shots.push({ kind: "bubble", x: p.x + Math.cos(a) * 0.3, y: p.y + Math.sin(a) * 0.3, z: 34, vx: Math.cos(a) * 6.2, vy: Math.sin(a) * 6.2, life: 1.3, t: 0, tier, lock: best, size: 1 + Math.min(0.5, p.magic * 0.04), dmg: (1 + p.magic + p.atk * 0.25) * p.bubMul * share });
  }
  return true;
}
/** leere Munition: Knopf grau + sanfter Hinweis-Ton, Toast höchstens alle 6 s (kein Frust-Spam) */
function ammoEmpty() {
  const p = G.p;
  p.bubCd = 0.4; G.emptyT = 0.45;
  SFX.empty();
  if (G.emptyToastT <= G.t) { G.emptyToastT = G.t + 6; H().toast("🫧 Keine Blasen mehr — besiege Gegner mit ⚔️, jeder gibt dir neue!"); }
}
export function dodge() {
  const p = G.p;
  if (!playing() || p.dashCd > 0 || p.dashT > 0 || p.specT > 0) return false;
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
  p.dashT = PLAYER.dashTime; p.dashDx = dx; p.dashDy = dy; p.dashCd = PLAYER.dashCd / p.spdMul;
  p.invulT = Math.max(p.invulT, PLAYER.dashInvul);
  p.path = null; p.foe = null; p.sq = -0.25;
  SFX.dodge(); haptic("dodge");
  for (let k = 0; k < 6; k++) P.dust(p.x, p.y, "#f0e6ff");
  G.tutFlags.dodge = true;
  return true;
}
export function potion() {
  const p = G.p;
  if (!playing()) return false;
  if (p.potions <= 0) { H().toast("🧪 Keine Tränke mehr — ❤️ Herzen & der Brunnen helfen!"); return false; }
  if (p.hp >= p.maxHp) { H().toast("💪 Du bist schon topfit!"); return false; }
  p.potions--; G.stats.potionsUsed++;
  const heal = Math.max(3, Math.ceil(p.maxHp * 0.5));
  p.hp = Math.min(p.maxHp, p.hp + heal);
  SFX.potion(); P.heal(p.x, p.y); text(p.x, p.y, "+" + heal + " ❤️", "#ff8fb8", 22, 100);
  return true;
}

// ---------- Spezialangriff (Glitzerpilze laden die Leiste) ----------
export const SPECIAL_STYLE = {
  kobold: { name: "Pilz-Wirbel", c1: "#8fff8a", c2: "#ff9ae0", kind: "star5", snd: 0 },
  baer: { name: "Bären-Brüller", c1: "#ffd27a", c2: "#ff9a4a", kind: "puff", snd: 1 },
  hase: { name: "Hoppel-Beben", c1: "#ffc2d4", c2: "#fff6a0", kind: "heart", snd: 0 },
  tintenfisch: { name: "Tinten-Strudel", c1: "#c7a0ff", c2: "#4fc3f7", kind: "dot", snd: 2 },
  panda: { name: "Blätter-Sturm", c1: "#9aff7a", c2: "#ffb35e", kind: "star", snd: 1 },
  katze: { name: "Miau-Blitz", c1: "#fff38a", c2: "#ff7fb0", kind: "star", snd: 0 },
  fuchs: { name: "Fuchsfeuer", c1: "#b39bff", c2: "#8fe9ff", kind: "flame", snd: 3 },
  drache: { name: "Drachen-Atem", c1: "#ffc05e", c2: "#ff6a3a", kind: "flame", snd: 3 },
};
export const specialDmg = p => 4 * p.atk + 6;
export function special() {
  const p = G.p;
  if (!playing() || p.specT > 0) return false;
  if (p.spec < 1) {
    if (G.specToastT <= G.t) { G.specToastT = G.t + 4; H().toast("🍄 Sammle Glitzerpilze, bis die Spezial-Leiste voll ist!"); }
    SFX.empty();
    return false;
  }
  const S = specStyle(p);
  p.spec = 0; p.specT = 0.42; p.invulT = Math.max(p.invulT, 1.1); p.path = null; p.foe = null; p.sq = 0.3;
  slowmo(0.42, 0.45); G.stats.specials++;
  SFX.special({ v: S.snd }); haptic("special");
  ring(p.x, p.y, 2.4, S.c1, 0.42, 1.2);
  for (let k = 0; k < 14; k++) {                          // Energie strömt zum Kobold
    const a = k / 14 * TAU, r = 2.6;
    part({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: 30, vx: -Math.cos(a) * r / 0.4, vy: -Math.sin(a) * r / 0.4, kind: "star", col: k % 2 ? S.c1 : S.c2, s0: 12, s1: 4, life: 0.4, drag: 0, g: 0 });
  }
  text(p.x, p.y, "✨ " + S.name + "!", "#fff38a", 24, 120);
  G.tutFlags.special = true;
  return true;
}
/** v9: Spezial-Stil der Tierart, Farben vom Kostüm (falls getragen) */
export function specStyle(p) {
  const S = SPECIAL_STYLE[p.species] || SPECIAL_STYLE.kobold, M = MYTH_BY_ID[p.look.myth];
  return M ? { ...S, c1: M.col.fx[0], c2: M.col.fx[1] || M.col.acc } : S;
}
function doSpecial() {
  const p = G.p, S = specStyle(p), R = SPECIAL.radius, dmg = specialDmg(p);
  ring(p.x, p.y, R, S.c1, 0.7, 2.6); ring(p.x, p.y, R * 0.66, S.c2, 0.55, 2); ring(p.x, p.y, R * 1.15, "#ffffff", 0.8, 1.2);
  burst(p.x, p.y, 34, { kind: S.kind, col: S.c1, s0: 18, s1: 0, sp0: 3, sp1: 8, z: 30, vz0: 80, vz1: 260, g: -300, l0: 0.5, l1: 1.0, add: S.kind !== "puff" && S.kind !== "heart" });
  burst(p.x, p.y, 26, { kind: "star5", col: S.c2, s0: 14, s1: 0, sp0: 2, sp1: 6, z: 40, vz0: 120, vz1: 320, g: -380, l0: 0.6, l1: 1.2 });
  part({ x: p.x, y: p.y, z: 30, kind: "glow", col: S.c1, s0: 420, s1: 80, life: 0.5 });
  flash(S.c1, 0.5); shake(0.85); FX.zoomPunch = 1; hitstop(110); haptic("slam");
  G.specFx = { x: p.x, y: p.y, t: 0, max: 0.8, c1: S.c1, c2: S.c2, r: R };
  for (const e of G.ents.slice()) {
    if (e.type === "dummy" && G.depth > 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < R + e.r * 0.5) hurtEnt(e, dmg, (e.x - p.x) / (d || 1) * 1.8, (e.y - p.y) / (d || 1) * 1.8, true, "special");
  }
  // feindliche Geschosse in der Nähe lösen sich in Glitzer auf
  for (let i = G.shots.length - 1; i >= 0; i--) { const s = G.shots[i]; if (s.kind !== "bubble" && Math.hypot(s.x - p.x, s.y - p.y) < R) { P.sparkle(s.x, s.y, S.c2, 3, s.z); G.shots.splice(i, 1); } }
  for (const pr of G.L.props.slice()) if (pr.kind === "pot" && Math.hypot(pr.x - p.x, pr.y - p.y) < R) breakPot(pr);
}
export function wearHat(h) { const p = G.p; if (!p) return; p.hat = p.hats.includes(h) ? h : null; save(); }

export function playerHurt(dmg, fromX, fromY) {
  const p = G.p;
  if (!p || p.invulT > 0 || G.screen !== "play" || G.god) return false;
  p.hp -= dmg; p.hurtT = 0.35; p.flashT = 0.1; p.invulT = PLAYER.hurtInvul; p.blinkT = PLAYER.hurtInvul; p.sq = 0.25;
  G.stats.dmgTaken += dmg;
  FX.hurtA = 0.55; shake(0.38); hitstop(60); haptic("hurt");
  SFX.hurt();
  text(p.x, p.y, "-" + fmt(dmg), "#ff6f8a", 22, 100);
  burst(p.x, p.y, 8, { kind: "heart", col: "#ff5d73", add: false, s0: 10, s1: 2, sp0: 1, sp1: 2.5, z: 40, vz0: 60, vz1: 160, g: -400, l0: 0.4, l1: 0.7 });
  if (fromX !== undefined) { const d = Math.hypot(p.x - fromX, p.y - fromY) || 1; p.vx += (p.x - fromX) / d * 5; p.vy += (p.y - fromY) / d * 5; }
  if (p.hp <= 0) die();
  return true;
}
function die() {
  const p = G.p;
  p.hp = 0; G.screen = "dead";
  SFX.die(); P.poof(p.x, p.y, "#ff9ab8", true); haptic("die");
  H().dead();
}
export function reviveInTown() {
  const p = G.p;
  p.hp = p.maxHp; p.potions = Math.max(1, p.potions); p.ammo = Math.max(p.ammo, Math.min(p.ammoMax, AMMO.revive));
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
  // v9: Kostüme des Sieges sicherstellen (falls das Paket vor dem Siegesbild nicht mehr aufgehoben wurde)
  if (!G.demo) for (const id of G.mega ? ["phoenix", "sternendrache"] : ["phoenix"]) if (unlockMyth(id)) setTimeout(() => H().mythFound && H().mythFound(id, true), 900);
  save();
  G.screen = "win";
  SFX.victory(); flash("#fff6c0", 0.8); haptic("win");
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
    p.foe = hitEnt; p.goal = null;
    const d = Math.hypot(hitEnt.x - p.x, hitEnt.y - p.y);
    if (d < PLAYER.atkRadius - 0.3) { attack(); p.path = null; }
    else p.path = findPath(G.L.map, p.x, p.y, hitEnt.x, hitEnt.y, p.r);
    return "enemy";
  }
  p.foe = null;
  const L = G.L;
  if (L.npc && Math.hypot(L.npc.x - wx, L.npc.y - wy) < 1.2) { H().tut("tap"); }
  if (L.mirror && Math.hypot(L.mirror.x - wx, L.mirror.y - wy) < 1.1) G.mirrorArmed = true;
  let tx = wx, ty = wy, goal = null, bd = 1e9;
  // Einrasten auf Treppe/Portale (nächstes gewinnt — die Stadt-Portale stehen ≥ 2 Kacheln auseinander)
  const snap = (pt, r) => { if (!pt || pt.hidden || pt.sealed) return; const d = Math.hypot(pt.x - wx, pt.y - wy); if (d < r && d < bd) { bd = d; tx = pt.x; ty = pt.y; goal = pt; } };
  snap(L.stairs, 1.5); snap(L.homePortal, 1.3);
  if (L.portals) for (const po of L.portals) snap(po, 1.3);
  // v8: Tipp auf Treppe/Heim-Portal = klare Absicht → sofort „scharf“ (auch wenn man beim Öffnen schon draufstand)
  if (goal && goal === L.stairs) L.stairs.armed = true;
  if (goal && goal === L.homePortal) L.homeArmed = true;
  p.goal = goal;
  const path = findPath(L.map, p.x, p.y, tx, ty, p.r);
  p.path = path || [{ x: tx, y: ty }];
  ring(tx, ty, 0.5, "#ffffff", 0.35, 0.5);
  return goal ? "snap" : "ground";
}
export function holdWorld(wx, wy) {
  if (!playing()) return;
  G.hold = { x: wx, y: wy };
  if (G.p) G.p.goal = null;
}
export function releaseHold() { G.hold = null; }
export function setJoy(x, y, m) { G.joy.x = x; G.joy.y = y; G.joy.m = m; if (m > 0.1 && G.p) { G.p.path = null; G.p.foe = null; G.p.goal = null; } }

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
  G.portalCd = Math.max(0, G.portalCd - dt); G.lockToastT = Math.max(0, G.lockToastT - dt); G.emptyT = Math.max(0, G.emptyT - realDt);
  if (p.pendingSwing >= 0) { p.pendingSwing -= dt; if (p.pendingSwing < 0) doSwing(); }
  if (p.specT > 0) {
    p.specT -= dt; p.z = Math.sin(Math.min(1, 1 - p.specT / 0.42) * Math.PI * 0.5) * 34;
    if (p.specT <= 0) { p.specT = 0; p.z = 0; doSpecial(); }
  }
  if (G.specFx) { G.specFx.t += dt; if (G.specFx.t > G.specFx.max) G.specFx = null; }
  // Heim-Portal: erst nach 20 s echter Spielzeit (Pause zählt nicht) wieder da
  if (G.homeHideT > 0 && G.screen === "play") { G.homeHideT -= dt; if (G.homeHideT <= 0) revealHome(); }
  if (L.homePortal && L.homePortal.appearT < 1 && !L.homePortal.hidden) L.homePortal.appearT = Math.min(1, L.homePortal.appearT + dt * 1.6);
  if (G.camFocus) { G.camFocus.t -= realDt; if (G.camFocus.t <= 0) G.camFocus = null; }
  for (let i = G.later.length - 1; i >= 0; i--) { const l = G.later[i]; if (!l) continue; l.t -= dt; if (l.t <= 0) { const j = G.later.indexOf(l); if (j >= 0) G.later.splice(j, 1); l.fn(); } }
  p.t += dt;
  if (G.screen === "play") updatePlayer(dt);
  // Squash-Feder
  spring(p, dt);
  updateItems(dt);
  updateShots(dt);
  updateEnts(dt);
  updateTeles(dt);
  updateTraps(dt);
  updateWallTraps(dt);
  if (L.arena) arenaTick(dt);
  // Sichtbarkeit (Minikarte)
  G.seenT -= dt;
  if (G.seenT <= 0) {
    G.seenT = 0.2;
    const r = 7, cx = Math.floor(p.x), cy = Math.floor(p.y);
    for (let y = Math.max(0, cy - r); y <= Math.min(m.h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(m.w - 1, cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) m.seen[y * m.w + x] = 1;
  }
  // Ambient-Partikel
  ambient(dt);
  if (G.screen === "play") mythGlow(dt);
  // Rig-Daten
  const rg = p.rig;
  rg.face = p.face; rg.t = p.t; rg.sq = p.sq; rg.moving = p.moving; rg.walkPh = p.walkPh;
  rg.spin = p.spinT > 0 ? 1 - p.spinT / 0.28 : p.specT > 0 ? (1 - p.specT / 0.42) * 2 % 1 : -1; rg.flash = p.flashT > 0;
  rg.mood = p.hurtT > 0 ? "hurt" : (p.t % 3.4 < 0.13 ? "blink" : "open");
  rg.wpn = weaponOf(p.atk).key; rg.wand = p.projN; rg.hat = p.hat; rg.cast = p.castT;
  rg.tilt = p.dashT > 0 ? p.face * 0.25 : 0;
  // Autosave
  G.saveT += realDt;
  if (G.saveT > 10 && G.screen === "play") { G.saveT = 0; save(); }
}
function revealHome() {
  const hp = G.L.homePortal;
  if (!hp) return;
  hp.hidden = false; hp.appearT = 0;
  G.L.homeArmed = false;                                 // erst scharf, wenn man sich (wieder) entfernt hat
  ring(hp.x, hp.y, 1.6, "#7fffd4", 0.6, 1.2);
  P.sparkle(hp.x, hp.y, "#bfffe8", 12, 30);
  part({ x: hp.x, y: hp.y, z: 30, kind: "glow", col: "#7fffd4", s0: 160, s1: 40, life: 0.6 });
  SFX.reveal({ x: hp.x, y: hp.y });
  text(hp.x, hp.y, "🏠 Heim-Portal", "#bfffe8", 16, 90);
}
export function spring(o, dt) {
  // gedämpfte Feder für Squash & Stretch
  const k = 180, d = 12;
  o.sqv += (-k * o.sq - d * o.sqv) * dt;
  o.sq += o.sqv * dt;
  if (Math.abs(o.sq) < 0.001 && Math.abs(o.sqv) < 0.01) { o.sq = 0; o.sqv = 0; }
}

function updatePlayer(dt) {
  const p = G.p, L = G.L, m = L.map;
  let tvx = 0, tvy = 0;
  const spd = PLAYER.speed * p.spdMul;
  if (p.specT > 0) { p.vx *= 0.8; p.vy *= 0.8; }
  else if (p.dashT > 0) {
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
      const wp = p.path[0], last = p.path.length === 1;
      const d = Math.hypot(wp.x - p.x, wp.y - p.y);
      if (d < (last ? 0.14 : 0.3)) p.path.shift();
      else { const s = last ? Math.min(spd, d * 8 + 0.8) : spd; tvx = (wp.x - p.x) / d * s; tvy = (wp.y - p.y) / d * s; }   // v8: nur am Ziel abbremsen, nicht an jeder Ecke
      if (!p.path.length) p.path = null;
    }
    const a = Math.min(1, dt * 16);
    p.vx += (tvx - p.vx) * a; p.vy += (tvy - p.vy) * a;
  }
  // v8: in Teilschritten ≤ 0,2 Kacheln bewegen — Wand bleibt dicht, auch bei Frame-Einbrüchen (dt bis 0,05 s) und Rückstoß
  const mvx = p.vx * dt, mvy = p.vy * dt, nSub = Math.max(1, Math.ceil(Math.max(Math.abs(mvx), Math.abs(mvy)) / 0.2));
  let blocked = false;
  for (let k = 0; k < nSub; k++) blocked = moveEnt(m, p, mvx / nSub, mvy / nSub, p.r) || blocked;
  if (blocked && p.path && p.dashT <= 0) { p.stuckT += dt; if (p.stuckT > 0.5) { p.path = findPath(m, p.x, p.y, p.path[p.path.length - 1].x, p.path[p.path.length - 1].y, p.r); p.stuckT = 0; } }
  else p.stuckT = 0;
  // Auto-Befreiung
  if (!canStand(m, p.x, p.y, p.r)) { const f = nearestFree(m, p.x, p.y, p.r); p.x = f.x; p.y = f.y; }
  const sp = Math.hypot(p.vx, p.vy);
  p.moving = sp > 0.4;
  if (p.moving) {
    // v8: Schrittfrequenz wächst mit dem Tempo (bei 3,6 wie bisher 11,8 rad/s, bei 4,7 ≈ 14,3) — Füße rutschen nicht
    p.walkPh += dt * (4 + sp * 2.2);
    const sdx = p.vx - p.vy; if (Math.abs(sdx) > 0.15) p.face = sdx > 0 ? 1 : -1;
    p.lastMx = p.vx; p.lastMy = p.vy;
    p.stepT -= dt;
    if (p.stepT <= 0) { p.stepT = 0.28 * PLAYER.speed0 / Math.max(PLAYER.speed0, sp); P.dust(p.x, p.y, G.biome === 0 ? "#e8f6d0" : "#e6dcf0"); }
    G.tutFlags.walked = (G.tutFlags.walked || 0) + sp * dt;
  }
  triggers(dt);
}

function triggers(dt) {
  const p = G.p, L = G.L;
  // Spiegel (Friseur) in der Stadt: öffnet den Charakter-Editor, erneut erst nach Weggehen
  if (L.mirror) {
    const d = Math.hypot(L.mirror.x - p.x, L.mirror.y - p.y);
    if (d > 2.0) G.mirrorArmed = true;
    if (G.mirrorArmed && d < 1.3 && p.dashT <= 0) { G.mirrorArmed = false; p.path = null; p.vx = p.vy = 0; H().editor(); return; }
  }
  if (G.portalCd > 0 || p.dashT > 0) return;
  // Brunnen heilt
  if (L.fountain && Math.hypot(L.fountain.x - p.x, L.fountain.y - p.y) < 2.4) {
    if (p.hp < p.maxHp || p.potions < 3) {
      p.hp = p.maxHp; p.potions = Math.max(3, p.potions);
      P.heal(p.x, p.y); SFX.heal(); text(p.x, p.y, "💧 Geheilt!", "#bfefff", 20, 100);
      H().toast("💧 Der Brunnen heilt dich und füllt deine Tränke auf!");
    }
  }
  // Stadt-Portale (v8: 20 Stück, je Ebene eins). Sofort nur, wenn dieses Portal das Ziel ist (Tipp rastet ein / Finger hält darauf),
  // sonst erst nach kurzem Stehen darauf — so löst Vorbeilaufen nichts aus.
  if (L.portals) for (const po of L.portals) {
    const d = Math.hypot(po.x - p.x, po.y - p.y);
    po.dwell = d < 0.6 && !p.moving ? (po.dwell || 0) + dt : d < 0.6 ? (po.dwell || 0) + dt * 0.5 : 0;
    if (d >= 0.75) continue;
    const aimed = p.goal === po || (G.hold && Math.hypot(G.hold.x - po.x, G.hold.y - po.y) < 0.9);
    if (!aimed && po.dwell < PORTAL_DWELL) continue;
    if (po.locked) { if (G.lockToastT <= 0) { H().toast("🔒 Ebene " + po.depth + " („" + po.name + "“) öffnet sich, wenn du sie im Keller erreicht hast!"); G.lockToastT = 3; } }
    else { G.portalCd = 2; G.runFrom = po.depth; G.runSecs = 0; p.goal = null; SFX.portal(); haptic("stairs"); P.levelUp(po.x, po.y); enterLevel(po.depth); G.tutFlags.portal = true; if (G.tutStep >= 0) finishTut(); return; }
  }
  // Heimportal: unsichtbar/unbenutzbar, solange versteckt; danach erst nach Verlassen scharf
  const hp = L.homePortal;
  if (hp && !hp.hidden && !bossFight()) {                 // v5: kein Heimportal mitten im Bosskampf
    const d = Math.hypot(hp.x - p.x, hp.y - p.y);
    if (d > 1.6) L.homeArmed = true;
    if (L.homeArmed && d < 0.6) { G.portalCd = 2; SFX.portal(); haptic("stairs"); enterLevel(0); return; }
  }
  // Treppe / 20. Portal — auf Boss-Ebenen erst nach dem Sieg (versiegelt), nach dem Öffnen erst scharf, wenn man einmal weg war
  const st = L.stairs;
  if (st) {
    const d = Math.hypot(st.x - p.x, st.y - p.y);
    if (st.sealed) {
      if (d < 0.9 && G.lockToastT <= 0) { G.lockToastT = 3; H().toast("🔒 Versiegelt! Besiege zuerst " + (G.boss ? G.boss.name : "den Boss") + " — dann öffnet sich " + (G.depth >= MAX_DEPTH ? "das Portal." : "die Treppe.")); }
    } else {
      if (d > 1.2) st.armed = true;
      if (st.armed && d < 0.6) {
        G.portalCd = 2;
        if (G.depth >= MAX_DEPTH) { SFX.portal(); winGame("portal"); }
        else { SFX.stairs(); haptic("stairs"); enterLevel(G.depth + 1); }
      }
    }
  }
  // Truhen
  for (const pr of L.props) if (pr.kind === "chest" && !pr.open && Math.hypot(pr.x - p.x, pr.y - p.y) < 0.95) openChest(pr);
}
function openChest(pr) {
  pr.open = true;
  SFX.chest({ x: pr.x, y: pr.y }); shake(0.2); haptic("chest");
  P.sparkle(pr.x, pr.y, "#ffe36e", 14, 30); part({ x: pr.x, y: pr.y, z: 20, kind: "glow", col: "#ffd75e", s0: 120, s1: 30, life: 0.5 });
  const n = randi(8, 14);
  for (let k = 0; k < n; k++) G.items.push(flyItem("coin", pr.x, pr.y));
  if (Math.random() < 0.45) G.items.push(flyItem("potion", pr.x, pr.y));
  if (Math.random() < 0.4) G.items.push(flyItem("heart", pr.x, pr.y));
  if (Math.random() < 0.35) G.items.push(flyItem(pick(["sword", "wand", "gem"]), pr.x, pr.y));
  if (Math.random() < 0.5) G.items.push(flyItem("mushroom", pr.x, pr.y));
}

/** Magnet: Münzen ~3,5, sonstige Sachen ~2,5 Kacheln (+ Talent 🧲), weich am Rand, flott in der Nähe */
export function magnetOf(kind) { return (kind === "coin" ? MAGNET.coin : MAGNET.item) + (G.p ? G.p.magBonus : 0); }
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
    const mag = it.kind === "myth" ? 99 : magnetOf(it.kind);     // v9: Kostüm-Paket fliegt immer zum Kobold (kein Suchen, kein Verpassen)
    if (d < mag && d > 0.01 && G.screen === "play") {
      const k = 1 - d / mag, s = 3.2 + k * k * 11;
      const ux = (p.x - it.x) / d, uy = (p.y - it.y) / d;
      moveEnt(m, it, ux * s * dt, uy * s * dt, 0.08);
      it.pulled = true;
    }
    if (d < 0.5 && G.screen === "play") { if (pickup(it)) G.items.splice(i, 1); }
  }
}

function updateShots(dt) {
  const p = G.p, m = G.L.map;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    if (!s) continue;                                     // Boss-Phase/-Sieg kann Geschosse mitten in der Schleife entfernen
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
        P.bubblePop(s.x, s.y); SFX.pop({ x: s.x, y: s.y });
        const R = 1.25 * s.size;
        let hit = false;
        for (const e of G.ents.slice()) {
          const d = Math.hypot(e.x - s.x, e.y - s.y);
          if (d < R + e.r * 0.5) { hurtEnt(e, s.dmg, (e.x - s.x) / (d || 1) * 0.5, (e.y - s.y) / (d || 1) * 0.5, false, "bubble"); hit = true; }
        }
        for (const pr of G.L.props) if (pr.kind === "pot" && Math.hypot(pr.x - s.x, pr.y - s.y) < R) { breakPot(pr); break; }
        if (hit) { hitstop(30); shake(0.08); haptic("hitL"); }
        const j = G.shots.indexOf(s); if (j >= 0) G.shots.splice(j, 1);
      }
    } else if (s.kind === "lob") {                         // Bonbon-Bombe: reine Flugkurve, Treffer über den Warnkreis
      const k = Math.min(1, s.t / s.dur);
      s.x = s.x0 + (s.tx - s.x0) * k; s.y = s.y0 + (s.ty - s.y0) * k; s.z = 40 + Math.sin(Math.PI * k) * s.h;
      if (k >= 1) { const j = G.shots.indexOf(s); if (j >= 0) G.shots.splice(j, 1); }
    } else {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.kind === "snow" || (s.kind === "wall" && s.look === "snow")) { s.rot = (s.rot || 0) + dt * 6; if (Math.random() < 0.5) P.dust(s.x, s.y, "#ffffff"); }
      else if (s.kind === "wall") s.rot = (s.rot || 0) + dt * (s.look === "shard" ? 9 : 5);
      if (isBlocked(m, s.x, s.y)) pop = true;
      if (Math.random() < 0.5) part({ x: s.x, y: s.y, z: s.z, kind: "dot", col: s.col, s0: 9, s1: 0, life: 0.3, g: 0 });
      const hr = s.r || 0.42;
      if (Math.hypot(p.x - s.x, p.y - s.y) < hr && p.dashT <= 0) { if (playerHurt(s.dmg, s.x, s.y) && s.kind === "wall") G.stats.wallHits++; pop = true; }
      if (pop) {
        const soft = s.kind === "snow" || s.kind === "wall";
        burst(s.x, s.y, soft ? 12 : 6, { kind: soft ? "puff" : "dot", col: s.col, add: !soft, s0: soft ? 16 : 8, s1: 0, sp0: 0.5, sp1: 2, z: s.z, vz0: 0, vz1: 50, g: 0, l0: 0.2, l1: 0.5 });
        if (s.kind === "wall") P.sparkle(s.x, s.y, s.col, 4, s.z);
        if (s.kind === "snow") SFX.slam({ x: s.x, y: s.y });
        const j = G.shots.indexOf(s); if (j >= 0) G.shots.splice(j, 1);
      }
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
export function steer(e) {
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
export function faceTo(e, x, y) { const sdx = (x - e.x) - (y - e.y); if (Math.abs(sdx) > 0.05) e.face = sdx > 0 ? 1 : -1; }
export function walk(e, dx, dy, sp, dt) {
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
  const D = G.depth > 0 ? diffOf(G.depth) : null;
  for (const e of G.ents) {
    e.t += dt;
    e.flashT = Math.max(0, e.flashT - dt); e.hurtT = Math.max(0, e.hurtT - dt); e.atkCd -= dt; e.invulT = Math.max(0, (e.invulT || 0) - dt);
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
    const aggro = e.tame ? 4.6 : e.elite ? 7 : 6;
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
        e.blinkCd -= dt;
        if (e.type === "geist" && D && D.blink && e.blinkCd <= 0 && d > 2.6 && d < 8) { blinkBehind(e); break; }
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
        else if (hit) { e.state = "stun"; e.st = 1.0; shake(0.1); P.sparkle(e.x, e.y, "#fff38a", 5, 60); e.sq = -0.3; e.second = false; }
        else if (e.st <= 0) {
          // ab Tiefe 15 stürmt der Kristallkäfer gleich noch einmal
          if (D && D.double && !e.second) { e.second = true; windup(e, 0.45, "charge"); }
          else { e.second = false; recover(e); }
        }
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
/** Gespenstchen (ab Tiefe 13): blinzelt hinter den Kobold und holt Schwung */
function blinkBehind(e) {
  const p = G.p, m = G.L.map;
  const lm = Math.hypot(p.lastMx, p.lastMy) || 1, bx = p.x - p.lastMx / lm * 1.7, by = p.y - p.lastMy / lm * 1.7;
  e.blinkCd = rand(5, 7.5);
  if (!canStand(m, bx, by, e.r * 0.8)) return;
  P.poof(e.x, e.y, "#e8ecff");
  e.x = bx; e.y = by; e.alpha = 0.3; e.sq = 0.3;
  P.sparkle(bx, by, "#e8ecff", 6, 40);
  text(e.x, e.y, "👻", "#ffffff", 16, 70);
  windup(e, 0.6, "lunge");
}
export function windup(e, t, act) {
  if (G.mega) t *= 0.75;
  e.state = "windup"; e.st = e.stMax = t; e.act = act; e.sq = 0.15;
}
function recover(e) { e.state = "recover"; e.st = 0.35; e.atkCd = (e.tame ? 1.6 : 1.1) * e.cdMul; }
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
      const sp = fire ? 3.8 : 3.2, D = G.depth > 0 ? diffOf(G.depth) : null;
      const n = D && D.fan && !e.tame ? 3 : 1, a0 = Math.atan2(dy, dx);
      for (let k = 0; k < n; k++) {
        const a = a0 + (n > 1 ? (k - 1) * 0.3 : 0);
        G.shots.push({ kind: fire ? "fire" : "orb", x: e.x, y: e.y, z: 34, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3, t: 0, col: fire ? "#ff9a3a" : (e.tint || "#8fe9ff"), dmg: e.dmg });
      }
      SFX.shoot({ x: e.x, y: e.y, fire }); e.sq = -0.2; e.state = "recover"; e.st = 0.3; e.atkCd = ((e.tame ? 3 : 2.2) + Math.random()) * e.cdMul * (n > 1 ? 1.25 : 1);
      break;
    }
  }
}

// ---------- Warnkreise / Warnlinien (Bosse) ----------
/** Abstand Punkt → Strecke */
export function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const k = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * k), py - (y1 + dy * k));
}
function updateTeles(dt) {
  const p = G.p;
  for (let i = G.teles.length - 1; i >= 0; i--) {
    const t = G.teles[i];
    if (!t) continue;
    t.t += dt;
    if (t.follow) { t.x = t.follow.x; t.y = t.follow.y; if (!G.ents.includes(t.follow)) { G.teles.splice(i, 1); continue; } }
    // Glut-Pfütze (nach einer angekündigten Warnung): brennt kurz weiter, solange man drinsteht
    if (t.burn && t.t >= 0 && t.dmg && G.screen === "play" && p.z < 20 && p.dashT <= 0 && Math.hypot(p.x - t.x, p.y - t.y) < t.r) playerHurt(t.dmg, t.x, t.y);
    if (t.t >= t.max) {
      const j = G.teles.indexOf(t); if (j >= 0) G.teles.splice(j, 1);
      if (t.dmg && !t.burn && G.screen === "play" && p.z < 20) {
        const dc = Math.hypot(p.x - t.x, p.y - t.y);
        const hit = t.kind === "line" ? segDist(p.x, p.y, t.x, t.y, t.x2, t.y2) < t.w / 2 + 0.18 : t.kind === "ring" ? dc < t.r + 0.2 && dc > t.r0 - 0.2 : dc < t.r + 0.2;
        if (hit) playerHurt(t.dmg, t.kind === "line" ? p.x - (t.x2 - t.x) * 0.01 : t.x, t.kind === "line" ? p.y - (t.y2 - t.y) * 0.01 : t.y);
      }
      if (t.onEnd) t.onEnd(t);
    }
  }
}
// ---------- Fallen (Pieks-Platten) ----------
function updateTraps(dt) {
  const L = G.L, p = G.p;
  if (!L.traps || !L.traps.length || G.screen !== "play") return;
  const D = diffOf(G.depth), dmg = Math.max(1, D.dmg - 1) * (G.mega ? MEGA.dmg : 1);
  for (const tr of L.traps) {
    const ph = (G.t + tr.ph) % TRAP.period, st = ph < TRAP.warn ? 0 : ph < TRAP.up ? 1 : 2;
    if (st === 2 && tr.st !== 2 && Math.hypot(p.x - tr.x, p.y - tr.y) < 7) SFX.trap({ x: tr.x, y: tr.y });
    tr.st = st;
    if (st === 2 && p.dashT <= 0 && p.z < 10 && Math.hypot(p.x - tr.x, p.y - tr.y) < 0.5) playerHurt(dmg, tr.x, tr.y);
  }
}

// ---------- v8: Wand-Schützen (Wandfallen) ----------
// st 0 = Ruhe (next zählt herunter, feuert aber nur, wenn der Kobold nah ist) · 1 = Vorwarnung (Glühen, Aufblähen, Bodenlinie, Ton)
// · 2 = Schuss (Maul offen, kurz). Schaden wie Pieks-Platten. Geschoss = G.shots, kind "wall" (💨 Ausweichen → unverwundbar).
export const wallTrapDmg = () => Math.max(1, diffOf(G.depth).dmg - 1) * (G.mega ? MEGA.dmg : 1);
function updateWallTraps(dt) {
  const L = G.L, p = G.p;
  if (!L.wallTraps || !L.wallTraps.length || G.screen !== "play" || G.depth <= 0) return;
  for (const w of L.wallTraps) {
    w.t += dt;
    if (w.st === 0) {
      w.next -= dt;
      if (w.next <= 0 && Math.hypot(p.x - w.mx, p.y - w.my) < WALLTRAP.near + w.len / 2) {
        w.st = 1; w.t = 0; w.warnAt = G.t;
        SFX.wallWarn({ x: w.x0, y: w.y0 });
      }
    } else if (w.st === 1) {
      if (Math.random() < dt * 14) part({ x: w.x0 + w.dx * 0.15, y: w.y0 + w.dy * 0.15, z: 18, vx: w.dx * 0.4 + rand(-0.3, 0.3), vy: w.dy * 0.4 + rand(-0.3, 0.3), vz: rand(10, 40), kind: "dot", col: w.look.glow, s0: 7, s1: 0, life: 0.4, g: 0 });
      if (w.t >= WALLTRAP.warn) {
        w.st = 2; w.t = 0; w.fired++; w.fireAt = G.t;
        const sp = WALLTRAP.speed;
        G.shots.push({ kind: "wall", look: w.look.id, x: w.x0 + w.dx * 0.12, y: w.y0 + w.dy * 0.12, z: 18, vx: w.dx * sp, vy: w.dy * sp, life: (w.len + 0.6) / sp, t: 0, col: w.look.col, dmg: wallTrapDmg(), r: WALLTRAP.r, trap: w });
        burst(w.x0, w.y0, 6, { kind: "puff", col: w.look.col, add: false, s0: 12, s1: 3, sp0: 0.4, sp1: 1.4, z: 18, vz0: 10, vz1: 40, g: 0, drag: 3, l0: 0.3, l1: 0.5, fade: 0.7 });
        SFX.shoot({ x: w.x0, y: w.y0, fire: G.biome === 5 });
      }
    } else if (w.t >= 0.4) { w.st = 0; w.next = WALLTRAP.period - WALLTRAP.warn - 0.4 + rand(-1, 1) * WALLTRAP.jit; }
  }
}

// ---------- v9: Glanz — Signatur-Partikel je Kostüm (Budget MYTH_FX; „mythisch“ glänzt stärker + Aura in render.js) ----------
function mythGlow(dt) {
  const p = G.p, M = MYTH_BY_ID[p.look.myth];
  if (!M) return;
  const myth = M.tier === "mythisch", now = G.t;
  const live = G.mythLive || (G.mythLive = []);
  while (live.length && live[0] <= now) live.shift();
  if (live.length >= MYTH_FX.max * (myth ? 1.4 : 1) * FX.budget) return;
  const rate = (p.moving ? MYTH_FX.walk : MYTH_FX.idle) * (myth ? MYTH_FX.myth : 1) * FX.budget;
  if (Math.random() > rate * dt) return;
  const cols = M.col.fx, col = cols[(Math.random() * cols.length) | 0], x = p.x + rand(-0.35, 0.35), y = p.y + rand(-0.35, 0.35);
  let o;
  switch (M.fx) {
    case "ember": case "embers": o = { kind: "dot", z: rand(20, 50), vz: rand(30, 60), vx: rand(-0.2, 0.2), s0: 6, s1: 0, life: rand(0.6, 1) }; break;
    case "rainbow": o = { kind: "star", z: 6, s0: 9, s1: 0, life: 0.7, x: p.x - (p.lastMx || 0) * 0.08, y: p.y - (p.lastMy || 0) * 0.08, col: ["#ff7a9a", "#ffc56e", "#fff38a", "#8ff08a", "#8fd8ff", "#c79bff"][Math.floor(now * 8) % 6] }; break;
    case "stars": case "starfall": o = { kind: "star5", z: rand(60, 110), vz: rand(-20, 10), s0: rand(8, 12), s1: 0, life: rand(0.7, 1.1), vr: 2 }; break;
    case "fairy": o = Math.random() < 0.5 ? { kind: "star", z: rand(40, 80), s0: 9, s1: 0, life: 0.6 } : { kind: "heart", add: false, z: rand(70, 100), vz: -18, vx: rand(-0.3, 0.3), s0: 7, s1: 5, life: 1.2, vr: 3, fade: 0.3 }; break;
    case "leaves": o = { kind: "heart", add: false, z: rand(60, 100), vz: -22, vx: rand(-0.4, 0.4), s0: 8, s1: 6, life: 1.4, vr: 3, fade: 0.3 }; break;
    case "feathers": o = { kind: "conf", add: false, z: rand(60, 90), vz: -16, vx: rand(-0.4, 0.4), s0: 9, s1: 7, life: 1.4, vr: 2, fade: 0.3 }; break;
    case "glints": o = { kind: "star", z: rand(20, 80), s0: 0, s1: 11, life: 0.45, vr: 3 }; break;
    case "foxfire": o = { kind: "dot", z: rand(30, 70), vz: rand(10, 30), vx: rand(-0.3, 0.3), s0: 10, s1: 2, life: rand(0.8, 1.2) }; break;
    case "bubbles": o = { kind: "ring", add: false, z: rand(20, 50), vz: rand(30, 50), vx: rand(-0.2, 0.2), s0: 5, s1: 8, life: 1, fade: 0.4 }; break;
    case "snow": o = { kind: "dot", add: false, z: rand(80, 110), vz: -25, vx: rand(-0.3, 0.3), s0: 5, s1: 4, life: 1.3, fade: 0.3 }; break;
    case "aurora": o = { kind: "star", z: rand(40, 90), vz: rand(5, 20), s0: 10, s1: 0, life: 0.9, vr: 2 }; break;
    case "flame": o = Math.random() < 0.5 ? { kind: "flame", z: rand(10, 30), vz: rand(40, 70), s0: 14, s1: 4, life: 0.5 } : { kind: "dot", z: rand(30, 60), vz: rand(40, 80), vx: rand(-0.3, 0.3), s0: 6, s1: 0, life: 0.8 }; break;
    default: o = { kind: "star", z: 40, s0: 8, s1: 0, life: 0.6 };
  }
  const q = part({ x, y, g: 0, drag: 0.5, col, ...o });
  if (q) live.push(now + q.life);
}

// ---------- Ambiente ----------
function ambient(dt) {
  const p = G.p, b = G.biome, B = G.B;
  const rate = 7 * FX.budget;
  if (Math.random() < rate * dt) {
    const x = p.x + rand(-7, 7), y = p.y + rand(-7, 7);
    if (isBlocked(G.L.map, x, y)) return;
    switch (b) {
      case 0: part({ x, y, z: rand(30, 90), vx: rand(0.2, 0.6), vy: rand(-0.3, 0), vz: rand(-8, 4), kind: "heart", col: pick(["#ffb3d1", "#fff", "#ffe36e"]), add: false, s0: 7, s1: 5, life: rand(2.5, 4), drag: 0, g: 0, fade: 0.3, vr: 1 }); break;
      case 1: part({ x, y, z: rand(0, 20), vz: rand(10, 25), vx: rand(-0.1, 0.1), kind: "dot", col: B.dust, s0: 5, s1: 2, life: rand(2, 3.5), drag: 0, g: 0, fade: 0.4 }); break;
      case 2: part({ x, y, z: rand(10, 70), kind: "star", col: B.dust, s0: 0, s1: 11, life: rand(0.6, 1.2), g: 0, fade: 0.2, vr: 2 }); break;
      case 3: part({ x, y, z: rand(10, 70), vz: rand(-5, 5), kind: "star5", col: pick([B.dust, "#fff6a0", "#bfefff"]), s0: 8, s1: 0, life: rand(1, 2), g: 0, fade: 0.4, vr: 2 }); break;
      case 4: part({ x, y, z: rand(90, 140), vz: rand(-30, -20), vx: rand(0.1, 0.4), kind: "dot", col: B.dust, add: false, s0: 6, s1: 5, life: rand(3, 4.5), drag: 0, g: 0, fade: 0.2 }); break;
      case 5: P.ember(x, y, pick([B.dust, "#ff7a2a"])); break;
    }
  }
  if (G.emberAt) { const t = G.emberAt; G.emberAt = null; part({ x: t.x, y: t.y, z: 44, vz: rand(30, 60), vx: rand(-0.2, 0.2), kind: "dot", col: B.torch || "#ffb060", s0: 5, s1: 0, life: rand(0.6, 1), g: 0 }); }
  // Brunnen-Glitzer
  if (G.L.fountain && Math.random() < dt * 6) { const f = G.L.fountain; part({ x: f.x + rand(-0.3, 0.3), y: f.y + rand(-0.3, 0.3), z: 110, vz: rand(40, 90), vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), g: -260, kind: "dot", col: "#bfefff", s0: 6, s1: 3, life: 0.8, drag: 0.3 }); }
}

// ---------- Tutorial ----------
// 0 Laufen · 1 Strohwichtel hauen · 2 Blasen (Munition) · 3 Sprung · 4 Spezialangriff (Oma schenkt Pilze) · 5 Portal
export function tutUpdate() {
  if (G.tutStep < 0 || G.depth !== 0 || G.screen !== "play") return;
  const f = G.tutFlags, s = G.tutStep;
  const next = (s === 0 && f.walked > 3) || (s === 1 && f.dummy) || (s === 2 && f.bubble) || (s === 3 && f.dodge) || (s === 4 && f.special) || (s === 5 && f.portal);
  if (next) {
    G.tutStep++;
    SFX.pickup(); P.sparkle(G.p.x, G.p.y, "#fff6a0", 8, 80);
    if (G.tutStep === 4 && G.p.spec < 1) { G.p.spec = 1; P.levelUp(G.p.x, G.p.y); }   // Oma schenkt 3 Glitzerpilze
    if (G.tutStep > 5) finishTut();
    else H().tut(G.tutStep);
  }
}
export function finishTut() { G.tutStep = -1; if (G.prof) G.prof.tut = true; H().tut(-1); save(); }
