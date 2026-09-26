/* main.js — Boot, Game-Loop, Verdrahtung, Debug-API window.KK (MIT) */
import { VERSION, SPECIES, PLAYER, MAX_DEPTH } from "./config.js";
import { G, startGame, enterLevel, update, tutUpdate, save, attack, bubbles, dodge, potion, killEnt, winGame, makeEnt, gainXp, finishTut } from "./game.js";
import { R, initRender, resize, setLevel, snapCamera, prewarm, draw, setQuality } from "./render.js";
import { FX, updateFx } from "./fx.js";
import { AUDIO, unlockAudio, suspendAudio, initAudio, audioFrame, audioStats } from "./audio.js";
import { hardenTouch, wakeLock, watchVisibility } from "./platform.js";
import { sanitize } from "./save.js";
import { IN, initInput, resetInput } from "./input.js";
import * as UI from "./ui.js";
import { pick } from "./util.js";

const cv = document.getElementById("cv");
const ft = new Float32Array(240); let fi = 0, fn = 0, qT = 0, perfFrames = 0, perfTime = 0;
let last = performance.now();
let jsU = 0, jsD = 0, jsN = 0;
hardenTouch();
initRender(cv);
// Effekte/Instrumente/Stadtmelodie schon im Menü vor-rendern (OfflineAudioContext braucht keine Geste)
setTimeout(initAudio, 250);

// ---------- Hooks game → UI/Render ----------
G.hooks = {
  toast: (m) => { if (!G.demo) UI.toast(m); },
  banner: (t, s, k) => { if (!G.demo) UI.banner(t, s, k); },
  level: () => {
    setLevel(G.L, G.biome);
    snapCamera(G.p.x, G.p.y);
    prewarm(G);
    UI.showBoss(null);
    if (!G.demo) UI.showTut(G.depth === 0 && G.tutStep >= 0 ? G.tutStep : -1);
    if (!G.demo && G.depth === 1 && G.deepest <= 1) setTimeout(() => UI.toast("🔎 Finde die Treppe ⬇️ — tipp auf Gegner zum Angreifen!"), 1400);
    perfReset();
  },
  fade: (cb) => UI.fade(() => { UI.clearToasts(); cb(); }),
  boss: (e) => UI.showBoss(e),
  win: (rec, hall) => UI.showWin(rec, hall),
  dead: () => UI.showDead(),
  tut: (s) => UI.showTut(s),
  saved: () => UI.flashSaved(),
};

// ---------- Erste Geste: Audio + Wake-Lock ----------
function gesture() {
  unlockAudio();
  if (G.screen === "play" && !G.demo) wakeLock(true);
}
UI.initUI(gesture);
initInput(cv, { gesture, pause: () => UI.openPause(), bag: () => UI.openBag() });
// Touch: „pointerdown" zählt am Handy NICHT als Nutzer-Aktivierung (erst pointerup/touchend/click) —
// Audio-Entsperren & Vibration brauchen aber genau diese Aktivierung.
for (const ev of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) document.addEventListener(ev, gesture, { passive: true, capture: true });

// ---------- Hintergrund-Stadt fürs Menü ----------
function demoWorld() {
  G.demo = true;
  const prof = sanitize({ name: "Kobold", species: pick(SPECIES).id, tut: true, seed: 4242 });
  startGame(prof);
  G.p.x += 0.4; G.p.y -= 1.6; snapCamera(G.p.x, G.p.y);
  G.screen = "menu";
}
demoWorld();
UI.showMenu();

// ---------- App-Wechsel ----------
watchVisibility(() => {
  if (G.screen === "play" && !G.demo) UI.openPause();
  if (G.p && !G.demo) save();
  suspendAudio(true); wakeLock(false);
  G.hidden = true;
}, () => {
  suspendAudio(false); G.hidden = false;
  if (G.screen !== "menu" && !G.demo) wakeLock(true);
  last = performance.now();
});
window.addEventListener("resize", () => resize());
window.addEventListener("orientationchange", () => setTimeout(resize, 120));

// ---------- Perf / adaptive Qualität ----------
function perfReset() { fi = 0; fn = 0; qT = -2.5; perfFrames = 0; perfTime = 0; jsU = jsD = jsN = 0; }
function perfTrack(ms) {
  ft[fi] = ms; fi = (fi + 1) % ft.length; fn = Math.min(ft.length, fn + 1);
  perfFrames++; perfTime += ms;
}
function perfStats() {
  if (!fn) return { fps: 0, p5: 0, frames: 0, scale: R.RS, q: R.q };
  const a = Array.from(ft.slice(0, fn)).sort((x, y) => x - y);
  const avg = a.reduce((s, v) => s + v, 0) / fn;
  return {
    fps: Math.round(10000 / avg) / 10, p5: Math.round(10000 / a[Math.floor(fn * 0.95)]) / 10,
    frames: perfFrames, jsUpdate: jsN ? +(jsU / jsN).toFixed(2) : 0, jsDraw: jsN ? +(jsD / jsN).toFixed(2) : 0, avgAll: perfTime ? Math.round(perfFrames / perfTime * 10000) / 10 : 0, scale: R.RS, q: R.q, budget: FX.budget,
  };
}
function adapt(dt) {
  if (G.screen !== "play" || G.demo) return;
  qT += dt;
  if (qT < 2 || fn < 60) return;
  qT = 0;
  const s = perfStats();
  if (s.fps < 47 && R.q < R.qScales.length - 1) { setQuality(R.q + 1); FX.budget = R.q >= 2 ? 0.6 : 1; fi = 0; fn = 0; qT = -1; }
}

// ---------- Game-Loop ----------
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - last; last = now;
  if (G.hidden) return;
  if (raw > 0 && raw < 250) perfTrack(raw);
  const rd = Math.min(0.05, Math.max(0, raw / 1000));
  let dt = rd;
  if (FX.hitstop > 0) { FX.hitstop -= rd; dt = 0; }
  if (FX.slowT > 0) { FX.slowT -= rd; dt *= FX.slowF; }
  if (G.screen === "pause" || G.screen === "bag") dt = 0;
  if (IN.attackHeld && G.screen === "play") attack();
  const t0 = performance.now();
  for (let k = 0; k < (G.dbgSpeed || 1); k++) { update(dt, rd); updateFx(dt, rd); }
  tutUpdate();
  const t1 = performance.now();
  UI.hud(rd);
  draw(G, rd);
  audioFrame(G, rd);
  const t2 = performance.now();
  jsU += t1 - t0; jsD += t2 - t1; jsN++;
  adapt(rd);
}
requestAnimationFrame(frame);

// ---------- Debug-API ----------
const near = () => { let b = null, bd = 1e9; for (const e of G.ents) { const d = Math.hypot(e.x - G.p.x, e.y - G.p.y); if (d < bd && e.type !== "dummy") { bd = d; b = e; } } return b; };
window.KK = {
  version: VERSION,
  state: () => ({
    screen: G.screen, depth: G.depth, biome: G.biome, hp: G.p && Math.ceil(G.p.hp), maxHp: G.p && G.p.maxHp, lvl: G.p && G.p.lvl,
    gold: G.gold, ents: G.ents.filter(e => e.type !== "dummy").length, boss: G.boss ? { name: G.boss.name, hp: G.boss.hp, king: !!G.boss.isKing, scale: G.boss.scale, skin: G.boss.rig.look.skin } : null,
    mega: G.mega, secs: Math.round(G.runSecs), won: !!(G.prof && G.prof.won), demo: !!G.demo, deepest: G.deepest,
    x: G.p && +G.p.x.toFixed(2), y: G.p && +G.p.y.toFixed(2), tut: G.tutStep, potions: G.p && G.p.potions, atk: G.p && G.p.atk,
    name: G.p && G.p.name, species: G.p && G.p.species, hat: G.p && G.p.hat, audio: AUDIO.ctx ? AUDIO.ctx.state : "none", track: AUDIO.track, where: AUDIO.where,
  }),
  start: (o = {}) => {
    const prof = sanitize({ name: o.name || "Testi", species: o.species || "kobold", mega: !!o.mega, tut: o.tut !== false, seed: o.seed || 777, depth: 0 });
    G.demo = false; resetInput(); startGame(prof); UI.hideScreens(); G.screen = "play";
    return window.KK.state();
  },
  goto: (d) => { G.portalCd = 1; enterLevel(Math.max(0, Math.min(MAX_DEPTH, d | 0)), true); if (d > 0) G.deepest = Math.max(G.deepest, d); return window.KK.state(); },
  descend: () => { if (G.depth >= MAX_DEPTH) { winGame("portal"); return window.KK.state(); } return window.KK.goto(G.depth + 1); },
  teleport: (x, y) => {
    const L = G.L; let t = null;
    if (typeof x === "string") t = x === "stairs" ? L.stairs : x === "fountain" ? L.fountain : x === "portal" ? (L.portals ? L.portals[0] : L.homePortal) : x === "boss" ? G.boss : null;
    else t = { x, y };
    if (!t) return false;
    G.p.x = t.x; G.p.y = t.y; G.p.path = null; snapCamera(G.p.x, G.p.y); return true;
  },
  kill: (what = "near") => {
    const list = what === "all" ? G.ents.filter(e => e.type !== "dummy") : what === "boss" ? (G.boss ? [G.boss] : []) : [near()].filter(Boolean);
    for (const e of list) { e.hp = 0; killEnt(e); }
    return list.length;
  },
  win: (how = "boss") => { winGame(how); return true; },
  god: (on = true) => { G.god = !!on; return G.god; },
  heal: () => { G.p.hp = G.p.maxHp; },
  give: (kind, n = 1) => { const p = G.p; for (let i = 0; i < n; i++) { if (kind === "gold") G.gold++; else if (kind === "xp") gainXp(1); else if (kind === "sword") p.atk++; else if (kind === "wand") p.projN++; else if (kind === "gem") p.magic++; else if (kind === "potion") p.potions++; else if (kind === "hat") { p.hats.push(n); p.hat = n; break; } } return window.KK.state(); },
  attack, bubbles, dodge, potion,
  spawn: (type, dx = 1.5, dy = 0) => { const e = makeEnt(type, G.p.x + dx, G.p.y + dy); G.ents.push(e); return e.hp; },
  audio: () => audioStats(),
  perf: (reset) => { if (reset) perfReset(); return perfStats(); },
  speed: (k = 1) => { G.dbgSpeed = Math.max(1, Math.min(8, k | 0)); return G.dbgSpeed; },
  quality: (q) => { if (q !== undefined) setQuality(q); return R.q; },
  save: () => { save(); return true; },
  pause: () => UI.openPause(), resume: () => UI.resume(),
  finishTut,
  G, R,
};
console.log("Koboldkeller 2 v" + VERSION);
