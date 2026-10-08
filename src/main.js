/* main.js — Boot, Game-Loop, Verdrahtung, Debug-API window.KK (MIT) */
import { VERSION, SPECIES, PLAYER, MAX_DEPTH, levelName, makeLook, MYTHS, URLQ } from "./config.js";
import { artCount } from "./art.js";
import { G, startGame, enterLevel, update, tutUpdate, save, attack, bubbles, dodge, potion, special, killEnt, winGame, makeEnt, makeElite, gainXp, finishTut, recalc, skillUp, skillReset, setLook, magnetOf, unlockMyth, lookForSave } from "./game.js";
import { R, initRender, resize, setLevel, snapCamera, prewarm, draw, setQuality, toScreen, chunksBereit, workerZustand } from "./render.js";
import { FX, updateFx } from "./fx.js";
import { DK } from "./deko.js";
import { AUDIO, unlockAudio, suspendAudio, initAudio, audioFrame, audioStats } from "./audio.js";
import { hardenTouch, wakeLock, watchVisibility, PF } from "./platform.js";
import { GD, guideUpdate, guideInput, guideTarget, guideAim } from "./guide.js";
import { findPath } from "./world.js";
import { sanitize } from "./save.js";
import { IN, initInput, resetInput, inputFrame } from "./input.js";
import * as UI from "./ui.js";
import { forceAttack, bossHit, spawnWave, minionCount, arenaCap, bossFight } from "./boss.js";
import { pick } from "./util.js";
import { Takt, spielDt, Zwischenbild } from "./takt.js";
import { Automatik2D } from "./automatik.js";
import { POST, postInit, postBild, postAus, postZustand } from "./post.js";

const cv = document.getElementById("cv");
const ft = new Float32Array(240); let fi = 0, fn = 0, perfFrames = 0, perfTime = 0;
let last = performance.now();
let jsU = 0, jsD = 0, jsN = 0;
const drawT = new Float32Array(600); let di = 0, dn = 0;
hardenTouch();
// Technik E3: WebGL2-Endbild über dem 2D-Zeichner (src/post.js). ?post=0, kein WebGL2 oder Kontextverlust → reines 2D wie v13
postInit(cv, { an: URLQ.get("post") !== "0", aus: () => resize() });
initRender(cv);
// Technik E2: fester Simulationstakt 60 Hz (src/takt.js) + Zwischenbild beim Zeichnen. ?takt=0 = bisherige Schleife (dt je Bild).
const TAKT = URLQ.get("takt") !== "0";
const TK = new Takt(), ZB = new Zwischenbild();
const workT = new Float32Array(600); let wi = 0, wn = 0;
// Technik E1: Qualitäts-Automatik (src/automatik.js) — misst Arbeitszeit statt nur Bildabstand, geht mit Hysterese auch
// wieder rauf, merkt sich die Stufe je Gerät. ?auto=0 = aus (Stufe bleibt bei 0 bzw. KK.quality()).
const AUTO_KEY = "koboldkeller2_auto", AUTO_ON = URLQ.get("auto") !== "0";
const fxBudget = (q) => { FX.budget = q >= 2 ? 0.6 : 1; };
const AUTO = new Automatik2D({ stufen: R.qScales.length, start: R.q, aktiv: AUTO_ON,
  setzen: (q) => { setQuality(q); fxBudget(q); try { localStorage.setItem(AUTO_KEY, JSON.stringify({ q, t: Date.now() })); } catch (e) { } } });
if (AUTO_ON) {                                              // letzte Stufe dieses Geräts (höchstens 30 Tage alt) als Start
  try { const s = JSON.parse(localStorage.getItem(AUTO_KEY) || "null"); if (s && s.q > 0 && Date.now() - s.t < 30 * 864e5) { setQuality(s.q); fxBudget(R.q); AUTO.festsetzen(R.q); } } catch (e) { }
}

// Effekte/Instrumente/Stadtmelodie schon im Menü vor-rendern (OfflineAudioContext braucht keine Geste)
setTimeout(initAudio, 250);

// ---------- Hooks game → UI/Render ----------
G.hooks = {
  toast: (m) => { if (!G.demo) UI.toast(m); },
  banner: (t, s, k, lvl) => { if (!G.demo) UI.banner(t, s, k, lvl); },
  bossIntro: (e) => { if (!G.demo) UI.bossIntro(e); },
  editor: () => { if (!G.demo) UI.openMirror(); },
  level: () => {
    setLevel(G.L, G.biome, G.B);
    snapCamera(G.p.x, G.p.y);
    prewarm(G);
    UI.showBoss(null);
    if (!G.demo) UI.showTut(G.depth === 0 && G.tutStep >= 0 ? G.tutStep : -1);
    if (!G.demo && G.depth === 1 && G.deepest <= 1) setTimeout(() => UI.toast("🔎 Finde die Treppe ⬇️ — tipp auf Gegner zum Angreifen!"), 1400);
    perfReset();
    TK.zuruecksetzen(); ZB.vergiss(); AUTO.schonen(2);    // Technik: neue Ebene → nichts überblenden, Ladespitze nicht werten
    // fester Takt: das erste Bild nach dem Wechsel rechnet evtl. noch keinen Schritt → den Weg-Pfeil der alten Ebene sofort
    // löschen (die alte Schleife tat das im ersten Bild über die Titelkarte; sonst stünde er ein Bild lang falsch da)
    if (TAKT) guideInput();
  },
  // Technik E4: hinter der Blende backt der Worker die neue Ebene; die Blende bleibt zu, bis die nächsten Chunks da sind
  fade: (cb) => UI.fade(() => { UI.clearToasts(); R.blende = true; cb(); }, null, () => { const w = chunksBereit(); if (!w) { R.blende = false; return null; } return w.finally(() => { R.blende = false; }); }),
  boss: (e) => UI.showBoss(e),
  win: (rec, hall) => UI.showWin(rec, hall),
  dead: () => UI.showDead(),
  tut: (s) => UI.showTut(s),
  saved: () => UI.flashSaved(),
  mythFound: (id, auto) => { if (!G.demo) UI.mythFound(id, auto); },
};

// ---------- Erste Geste: Audio + Wake-Lock ----------
function gesture() {
  unlockAudio();
  guideInput();                                          // v7: jede Eingabe blendet den Weg-Pfeil aus
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
// KK.perf(true) hält wie bisher die Automatik fest (Mess-Skripte rufen es jede Sekunde auf → Stufe bleibt während der Messung)
function perfReset() { fi = 0; fn = 0; perfFrames = 0; perfTime = 0; jsU = jsD = jsN = 0; di = dn = 0; wi = wn = 0; AUTO.schonen(1.2); }
/** v12: draw()-Zeit je Frame (ms): Median + 95 %; Technik: dazu Arbeitszeit je Bild (Logik + Zeichnen + Audio) */
function drawStats() {
  if (!dn) return { drawMed: 0, drawP95: 0 };
  const a = Array.from(drawT.slice(0, dn)).sort((x, y) => x - y), w = Array.from(workT.slice(0, wn)).sort((x, y) => x - y);
  return { drawMed: +a[dn >> 1].toFixed(3), drawP95: +a[Math.floor(dn * 0.95)].toFixed(3), drawN: dn,
    workMed: wn ? +w[wn >> 1].toFixed(3) : 0, workP95: wn ? +w[Math.floor(wn * 0.95)].toFixed(3) : 0, workMax: wn ? +w[wn - 1].toFixed(3) : 0 };
}
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
    takt: TAKT, schritte: TK.schritteGesamt,
  };
}
// ---------- Game-Loop ----------
const sammle = (f) => { f(G.p); for (const e of G.ents) f(e); for (const it of G.items) f(it); for (const s of G.shots) f(s); for (const q of FX.parts) f(q); };
// R.blende (Technik E4): die Blende des Ebenenwechsels wartet auf den Back-Worker → Spielzeit steht (wie früher, als das
// synchrone Backen den Hauptthread blockierte; sonst liefe z. B. der Schutz nach dem Betreten unsichtbar ab)
const paused = () => G.screen === "pause" || G.screen === "bag" || G.screen === "edit" || G.dbgFreeze || R.blende;
/** ein fester Spielschritt der Länge h (s) — Hitstop/Zeitlupe/Pause wie bisher je Bild, jetzt je Schritt */
function schritt(h) {
  const dt = spielDt(FX, h, paused());
  if (IN.attackHeld && G.screen === "play") attack();
  for (let k = 0; k < (G.dbgSpeed || 1); k++) { update(dt, h); updateFx(dt, h); }
  tutUpdate();
  if (IN.attackHeld || IN.joy || IN.hold) guideInput();
  guideUpdate(dt * (G.dbgSpeed || 1));
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - last; last = now;
  if (G.hidden) return;
  const tA = performance.now();
  if (raw > 0 && raw < 250) perfTrack(raw);
  const rd = Math.min(0.05, Math.max(0, raw / 1000));
  const t0 = performance.now();
  if (TAKT) {
    inputFrame();                                         // v8: Halten-Folgen läuft weiter, solange der Finger hält
    const n = TK.schritte(raw / 1000);
    for (let i = 0; i < n; i++) { if (i === n - 1) ZB.merke(sammle); schritt(TK.h); }
  } else {
    let dt = rd;
    if (FX.hitstop > 0) { FX.hitstop -= rd; dt = 0; }
    if (FX.slowT > 0) { FX.slowT -= rd; dt *= FX.slowF; }
    if (paused()) dt = 0;
    if (IN.attackHeld && G.screen === "play") attack();
    inputFrame();
    for (let k = 0; k < (G.dbgSpeed || 1); k++) { update(dt, rd); updateFx(dt, rd); }
    tutUpdate();
    if (IN.attackHeld || IN.joy || IN.hold) guideInput();
    guideUpdate(dt * (G.dbgSpeed || 1));
  }
  const t1 = performance.now();
  UI.hud(rd);
  const tdr = performance.now();
  if (TAKT) ZB.setze(TK.alpha);                          // Zeichenposition zwischen vorletztem und letztem Schritt
  try { draw(G, rd); } finally { if (TAKT) ZB.zurueck(); }   // Spiel-Logik sieht nie eine Zwischenposition
  if (POST.an && R.gcv) { try { postBild(R.cv, R.gcv, R.biome, R.vignCol || null, R.VW, R.VH, rd); } catch (e) { POST.fehler = String(e && e.message || e); postAus("Fehler"); } }
  drawT[di] = performance.now() - tdr; di = (di + 1) % drawT.length; dn = Math.min(drawT.length, dn + 1);   // v12: reine draw()-Zeit
  audioFrame(G, rd);
  const t2 = performance.now();
  jsU += t1 - t0; jsD += t2 - t1; jsN++;
  const work = t2 - tA;
  workT[wi] = work; wi = (wi + 1) % workT.length; wn = Math.min(workT.length, wn + 1);
  if (G.screen === "play" && !G.demo) AUTO.bild(raw / 1000, work);
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
    ammo: G.p && G.p.ammo, ammoMax: G.p && G.p.ammoMax, spec: G.p && +G.p.spec.toFixed(3), skPts: G.p && G.p.skPts, sk: G.p && { ...G.p.sk },
    look: G.p && { ...G.p.look }, homeHidden: !!(G.L && G.L.homePortal && G.L.homePortal.hidden), homeHideT: +(G.homeHideT || 0).toFixed(2),
    levelName: levelName(G.depth), phase: G.boss ? G.boss.phase : 0,
    stairsSealed: !!(G.L && G.L.stairs && G.L.stairs.sealed), mini: !!(G.boss && G.boss.isMini), bossDone: G.bossDone.slice(),
    minions: G.ents.filter(e => e.minion).length, spawning: G.spawns.length, zoom: +R.cz.toFixed(3),
  }),
  /** Arena-Zustand (v5): Größe, Tore, Handlanger, Deckel */
  arena: () => {
    const A = G.L && G.L.arena; if (!A) return null;
    return { size: A.size, x: A.x, y: A.y, closed: !!A.closed, optional: !!A.optional, done: !!A.done, gates: A.gates.length, pillars: A.pillars.length, spawns: A.spawns.length,
      minions: G.ents.filter(e => e.minion).length, spawning: G.spawns.length, count: minionCount(), cap: arenaCap(), waveT: A.waveT === undefined ? null : +A.waveT.toFixed(2), fight: bossFight(),
      gateBlocked: A.gates.filter(g => G.L.map.block[g.ty * G.L.map.w + g.tx]).length, stairs: G.L.stairs && { x: G.L.stairs.x, y: G.L.stairs.y, sealed: !!G.L.stairs.sealed, armed: !!G.L.stairs.armed } };
  },
  wave: (n = 9) => (G.boss ? spawnWave(G.boss, n) : 0),
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
  give: (kind, n = 1) => { const p = G.p; for (let i = 0; i < n; i++) { if (kind === "gold") G.gold++; else if (kind === "xp") gainXp(1); else if (kind === "sword") { p.atkBase++; recalc(p); } else if (kind === "wand") p.projN++; else if (kind === "gem") p.magic++; else if (kind === "potion") p.potions++; else if (kind === "ammo") p.ammo = Math.min(p.ammoMax, p.ammo + 1); else if (kind === "spec") p.spec = 1; else if (kind === "skpt") p.skPts++; else if (kind === "hat") { p.hats.push(n); p.hat = n; break; } } return window.KK.state(); },
  attack, bubbles, dodge, potion, special,
  skill: (id) => skillUp(id), respec: () => skillReset(), look: (o) => { setLook(o); return G.p.look; }, magnet: (k) => magnetOf(k),
  item: (kind, dx = 1, dy = 0, v) => { G.items.push({ kind, x: G.p.x + dx, y: G.p.y + dy, z: 0, vx: 0, vy: 0, vz: 0, seed: 0, v: v || "", flyT: 0 }); return G.items.length; },
  spawn: (type, dx = 1.5, dy = 0, elite = false) => { const e = makeEnt(type, G.p.x + dx, G.p.y + dy); if (elite) makeElite(e); G.ents.push(e); return e.hp; },
  audio: () => audioStats(),
  perf: (reset) => { if (reset) perfReset(); return { ...perfStats(), ...drawStats() }; },
  /** v13: Deko-Zustand (Lichtstrahlen, Wand-Deko, glühende/glänzende Boden-Deko, Lichtblitze); deko(false) schaltet nur die Effekte pro Frame aus (Messung) */
  deko: (on) => { if (on !== undefined) DK.on = FX.deko = !!on; return { on: DK.on, calm: DK.calm, shafts: (R.dkShafts || []).length, walls: R.walls.filter(w => w.dk).length, wallsAll: R.walls.length,
    glow: [...(R.dkGlow || new Map()).values()].reduce((s, a) => s + a.length, 0), shine: [...(R.dkShine || new Map()).values()].reduce((s, a) => s + a.length, 0), lights: FX.lights.length, vign: R.vignCol || null, art: artCount(), floor: R.dkFloorN || 0 }; },
  dekoSkip: (m) => (DK.skip = m | 0),
  rock: () => R.rock ? { ms: R.rock.ms, bytes: R.rock.bytes, w: R.rock.mass.width, h: R.rock.mass.height, fels: R.fels, chunks: R.chunks.size, vis: R.chunksVis } : { fels: R.fels },
  bossAtk: (k) => forceAttack(G.boss, k), bossHit: () => { if (G.boss) bossHit(G.boss, false); return G.boss && G.boss.phase; },
  speed: (k = 1) => { G.dbgSpeed = Math.max(1, Math.min(8, k | 0)); return G.dbgSpeed; },
  freeze: (on = true) => { G.dbgFreeze = !!on; return G.dbgFreeze; },   // v11: Spielzeit anhalten (Bildfolgen exakt fotografieren)
  rise: () => G.rise ? { ph: G.rise.ph, u: +G.rise.u.toFixed(2), t: +G.rise.t.toFixed(2), dur: G.rise.dur } : null,
  quality: (q) => { if (q !== undefined) { setQuality(q); fxBudget(R.q); AUTO.festsetzen(R.q); } return R.q; },
  /** Technik E1/E2: Automatik-Zustand (Stufe, fps, Arbeitszeit, gedeckelt, Sperre, letzte Wechsel) und Takt */
  auto: () => AUTO.zustand(),
  /** Technik E3: Endbild-Zustand (an/aus + Grund, Maße, Welt-Farbkorrektur); post(false) schaltet zur Laufzeit auf reines 2D */
  post: (an) => { if (an === false) postAus("KK.post(false)"); return postZustand(); },
  /** Technik E4: Back-Worker (an/aus + Grund, gelieferte/verworfene Chunks, synchron nachgebackene, ms je Chunk im Worker) */
  worker: () => workerZustand(),
  takt: () => ({ an: TAKT, hz: TK.hz, alpha: +TK.alpha.toFixed(3), vsync: TK.vs ? Math.round(1 / TK.vs) : 0, schritte: TK.schritteGesamt, verworfen: +TK.verworfen.toFixed(2), zwischen: ZB.gesetzt }),
  screenOf: (x, y, z = 0) => toScreen(x, y, z),          // v10-Check: Weltpunkt → Bildschirm (CSS-px), z. B. zum Antippen der Oma
  save: () => { save(); return true; },
  pause: () => UI.openPause(), resume: () => UI.resume(),
  /** v7: Weg-Pfeil-Zustand (Richtung in Welt + Bildschirm, Wegpunkt, Ziel) */
  guide: () => {
    const ang = Math.atan2((GD.ux + GD.uy) * 16, (GD.ux - GD.uy) * 32);
    return { a: +GD.a.toFixed(3), t: +GD.t.toFixed(2), idle: +GD.idle.toFixed(2), shows: GD.shows, calcs: GD.calcs, ux: GD.ux, uy: GD.uy, screenAng: ang,
      wp: GD.wp, target: GD.target, cur: guideTarget(), on: !!G.arrowOn };
  },
  editor: () => UI.UI.ed ? { mode: UI.UI.ed.mode, look: { ...UI.UI.ed.look }, name: document.getElementById("nameInput").value, dice: UI.UI.diceN, tab: UI.UI.ed.tab } : null,
  guideAim: () => { const tg = guideTarget(); return tg ? guideAim(G.p, tg) : null; },
  path: (x, y) => findPath(G.L.map, G.p.x, G.p.y, x, y, G.p.r),
  hap: () => ({ mode: PF.hapMode, vibrate: PF.vibrate, calls: { ...PF.hapStats.calls }, fired: { ...PF.hapStats.fired }, count: PF.hapCount, iosTouch: PF.iosTouch, touchTicks: PF.touchTicks }),
  finishTut,
  /** v9: Kostüme — Zustand, Freischalten (id | 'all'), Anziehen (id | '' = ohne) */
  myths: () => ({ have: G.myth.have.slice(), real: G.myth.real.slice(), view: G.myth.view, count: G.myth.real.length, total: MYTHS.length, wearing: G.p ? G.p.look.myth : "", mhat: G.p ? G.p.look.mhat : false, art: artCount(), toasts: UI.UI.mythToasts || 0 }),
  unlock: (id) => { const ids = id === "all" ? MYTHS.map(m => m.id) : [id]; let n = 0; for (const i of ids) if (unlockMyth(i)) n++; return n; },
  wear: (id, mhat = false) => { if (!G.p) return null; setLook({ ...lookForSave(G.p.look), myth: id || "", mhat }); return G.p.look.myth; },
  G, R, FX,
};
console.log("Koboldkeller 2 v" + VERSION);
