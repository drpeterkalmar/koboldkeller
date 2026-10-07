/* render.js — Iso-Renderer: Kamera, Boden-Chunks, Tiefensortierung, Licht, Glow (MIT) */
import * as A from "./art.js";
import { FX } from "./fx.js";
import { BIOMES, weaponOf, HATS, PLAYER, WALLTRAP, levelName, MYTH_BY_ID, MYTH_FX, URLQ } from "./config.js";
import { clamp, TAU, rgba, mixHex, shade, mulberry32 } from "./util.js";
import * as D from "./deko.js";
const DK = D.DK;

export const R = {
  cv: null, ctx: null, VW: 0, VH: 0, RS: 1, U: 64, Z: 1, Z0: 1, cz: 1, q: 0, qScales: [1, 0.8, 0.65, 0.5],
  camX: 0, camY: 0, camDX: 0, camDY: 0, shx: 0, shy: 0, zp: 1,
  lcv: null, lctx: null, LS: 4, lw: 0, lh: 0, vign: null,
  chunks: new Map(), chunkOrder: [], walls: [], wallTorch: new Map(), L: null, biome: 0, B: BIOMES[0], t: 0,
  lightSpr: new Map(), drawn: 0, focusY: 0.5,
};
const CH = 8, CH_MAX = 28;
// v12: Chunk-Rand oben (Design-Px) — Platz für die Felskanten auf Wandkronen-Höhe; CHH = Chunk-Höhe
const CHT = 40, CHH = CH * 32 + 30 + (CHT - 24);
// v12: Fels-Hintergrund (A/B: ?fels=0 = bisher, schwarze Fläche)
R.fels = URLQ.get("fels") !== "0"; R.glowVis = [];

export function initRender(cv) {
  R.cv = cv;
  R.ctx = cv.getContext("2d", { alpha: false });
  R.lcv = document.createElement("canvas");
  R.lctx = R.lcv.getContext("2d");
  resize();
}
export function setQuality(q) { q = clamp(q, 0, R.qScales.length - 1); if (q !== R.q) { R.q = q; FX.dq = q; resize(); } }
export function resize() {
  const VW = Math.max(200, window.innerWidth), VH = Math.max(200, window.innerHeight);
  R.VW = VW; R.VH = VH;
  // Grund-Zoom (Art-Caches werden in dieser Größe gerendert); R.Z/R.U = Grund-Zoom × Kamera-Zoom (Bosskampf zoomt heraus)
  const U0 = clamp(VW <= VH ? VW / 6.4 : Math.min(VW / 6.4, VH / 7.4), 50, 84);
  R.Z0 = U0 / 64; R.Z = R.Z0 * R.cz; R.U = 64 * R.Z;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  R.RS = Math.max(1, dpr * R.qScales[R.q]);
  R.cv.width = Math.round(VW * R.RS); R.cv.height = Math.round(VH * R.RS);
  R.cv.style.width = VW + "px"; R.cv.style.height = VH + "px";
  A.setArtScale(R.Z0 * R.RS);
  R.lw = Math.ceil(VW / R.LS); R.lh = Math.ceil(VH / R.LS);
  R.lcv.width = R.lw; R.lcv.height = R.lh;
  R.vign = makeVignette(R.lw, R.lh, R.vignCol);
  R.focusY = VH > VW ? 0.46 : 0.52;
  R.chunks.clear(); R.chunkOrder.length = 0;
}
function makeVignette(w, h, col) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, "#fff"); if (col) g.addColorStop(0.55, "#f4f0f6"); g.addColorStop(1, col || "#6a5a7a");   // v13: Ränder in Weltfarbe
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  return c;
}
/** Licht-Sprite (radial, farbig) — unabhängig von der Art-Skalierung */
function lightSprite(col) {
  let s = R.lightSpr.get(col);
  if (s) return s;
  s = document.createElement("canvas"); s.width = s.height = 64;
  const x = s.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.4, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  R.lightSpr.set(col, s);
  return s;
}

// ---------- Level-Setup ----------
export function setLevel(L, biome, B) {
  R.L = L; R.biome = biome; R.B = B || BIOMES[biome];
  R.chunks.clear(); R.chunkOrder.length = 0;
  const m = L.map; R.walls = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!m.solid[y * m.w + x]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && !m.solid[ny * m.w + nx]) { near = true; break; }
    }
    if (near) {
      const w = { x, y, v: m.v[y * m.w + x], d: x + y + 1, a: 1, dk: null };
      if (DK.on) w.dk = D.wallKind(biome, x, y, (m.w * 131 + m.h * 17 + ((B || BIOMES[biome]).depth || 0) * 997 + biome * 7) | 0,
        y + 1 < m.h && !m.solid[(y + 1) * m.w + x], x + 1 < m.w && !m.solid[y * m.w + x + 1]);   // v13: Wand-Deko auf einer sichtbaren Seite
      R.walls.push(w);
    }
  }
  R.wallTorch.clear();
  for (const t of L.torches || []) R.wallTorch.set(t.wy * m.w + t.wx, t);
  R.wallTrapAt = new Map();                                   // v8: Wand-Schützen sitzen auf ihrer Wand-Kachel
  for (const t of L.wallTraps || []) R.wallTrapAt.set(t.wy * m.w + t.wx, t);
  for (const w of R.walls) if (w.dk && (R.wallTorch.has(w.y * m.w + w.x) || R.wallTrapAt.has(w.y * m.w + w.x))) w.dk = null;   // Fackel/Steingesicht bleiben frei
  setRock(L);
  D.setupLevel(L, R, CH);                                      // v13: Lichtstrahlen, glühende/glänzende Boden-Deko je Chunk
  const vc = DK.on ? D.VIGN[biome] || null : null;
  if (vc !== (R.vignCol || null)) { R.vignCol = vc; R.vign = makeVignette(R.lw, R.lh, vc); }
}
export function snapCamera(x, y) { R.camX = x; R.camY = y; }

// ---------- v12: Fels-Masse statt schwarzem Nichts ----------
const GLOW_COL = [null, ["#c8ff8a", "#fff27a"], ["#9ff0ff", "#c8b8ff"], ["#ffb3e6", "#fff38a"], ["#dff6ff", "#a8e6ff"], ["#ff8a3a", "#ffc060"]];
/** je Ebene einmal: Kachel-Klassen (Boden/Wand/Felskante/Masse), Muster-Kacheln, Glimmpunkte im Fels (nach Chunks sortiert) */
function setRock(L) {
  const m = L.map, n = m.w * m.h, ring = R.ring = new Uint8Array(n).fill(3), front = R.edgeFront = new Uint8Array(n);
  const at = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h ? ring[y * m.w + x] : 3;
  for (let i = 0; i < n; i++) if (!m.solid[i]) ring[i] = 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x; if (ring[i] !== 3) continue;
    for (let dy = -1; dy <= 1 && ring[i] === 3; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === 0) { ring[i] = 1; break; }
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x; if (ring[i] !== 3) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === 1) { near = true; break; }
    if (!near) continue;
    ring[i] = 2;
    // vor einer Wand (Wand liegt dahinter, Richtung −x/−y) und nicht zugleich hinter einer → Geröll am Wandfuß statt Kronen-Brocken
    const behind = at(x + 1, y) === 1 || at(x, y + 1) === 1 || at(x + 1, y + 1) === 1;
    front[i] = !behind && (at(x - 1, y) === 1 || at(x, y - 1) === 1 || at(x - 1, y - 1) === 1) ? 1 : 0;
  }
  R.rock = null;                                                // Muster entsteht beim ersten Zeichnen (Art-Maßstab bekannt)
  // Glimmpunkte: Glühwürmchen, Kristall-Glitzer, Zucker-Funkeln, Eis-Glitzern, Glutadern — nur tief in der Masse, gecacht je Chunk
  R.glowAt = null;
  if (!R.biome) return;
  const rnd = mulberry32(m.w * 31 + m.h * 7 + R.biome * 101 + (R.B.depth || 0)), cols = GLOW_COL[R.biome];
  R.glowAt = new Map();
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (ring[y * m.w + x] !== 3 || rnd() > 0.015) continue;
    const key = Math.floor(y / CH) * 64 + Math.floor(x / CH);
    let list = R.glowAt.get(key); if (!list) R.glowAt.set(key, list = []);
    list.push({ x: x + 0.2 + rnd() * 0.6, y: y + 0.2 + rnd() * 0.6, c: cols[(rnd() * 2) | 0], ph: rnd() * TAU, f: 0.8 + rnd() * 1.6 });
  }
}
/** Muster-Kacheln bauen (einmal je Ebene bzw. nach Größenänderung; Masse 384 × 192, Tiefe 256 × 128 Design-Px × Art-Maßstab) */
function buildRock() {
  const K = A.artScale(), mk = (fn, W, H) => {
    const cv = document.createElement("canvas"); cv.width = Math.round(W * K); cv.height = Math.round(H * K);
    const g = cv.getContext("2d"); g.scale(cv.width / W, cv.height / H); fn(g, R.B, R.biome);
    return cv;
  };
  const t0 = performance.now();
  const mass = mk(A.drawRockMass, A.ROCK_W, A.ROCK_H), deep = mk(A.drawRockDeep, A.DEEP_W, A.DEEP_H);
  R.rock = { K, mass, deep, pm: R.ctx.createPattern(mass, "repeat"), pd: R.ctx.createPattern(deep, "repeat"), m: new DOMMatrix(), ms: +(performance.now() - t0).toFixed(1),
    bytes: (mass.width * mass.height + deep.width * deep.height) * 4 };
}
/** Hintergrund: 1 Füllaufruf mit dem an der Kamera ausgerichteten Muster (+ ab Qualität < 2 die langsamere Tiefen-Ebene) */
function fillRock(ctx) {
  if (!R.rock || R.rock.K !== A.artScale()) buildRock();
  const rk = R.rock, Z = R.Z, mx = rk.m, s = Z * A.ROCK_W / rk.mass.width, sd = Z * A.DEEP_W / rk.deep.width;
  const ox = R.VW / 2 + R.shx, oy = R.VH * R.focusY + R.shy;
  if (R.q < 2) {                                                // Tiefen-Ebene zuerst: Faktor 0,5 zur Kamera → wirkt weiter weg
    mx.a = mx.d = sd; mx.b = mx.c = 0; mx.e = ox - R.camDX * Z * 0.5; mx.f = oy - R.camDY * Z * 0.5;
    rk.pd.setTransform(mx);
  }
  mx.a = mx.d = s; mx.b = mx.c = 0; mx.e = ox - R.camDX * Z; mx.f = oy - R.camDY * Z;
  rk.pm.setTransform(mx);
  ctx.fillStyle = rk.pm; ctx.fillRect(-20, -20, R.VW + 40, R.VH + 40);
  if (R.q < 2) { ctx.fillStyle = rk.pd; ctx.fillRect(-20, -20, R.VW + 40, R.VH + 40); }
}

// ---------- Projektion ----------
export function toScreen(x, y, z = 0) {
  return [((x - y) * 32 - R.camDX) * R.Z + R.VW / 2 + R.shx, ((x + y) * 16 - z - R.camDY) * R.Z + R.VH * R.focusY + R.shy];
}
export function toWorld(sx, sy) {
  const dx = (sx - R.VW / 2 - R.shx) / R.Z + R.camDX, dy = (sy - R.VH * R.focusY - R.shy) / R.Z + R.camDY;
  const a = dx / 32, b = dy / 16;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

// ---------- Boden-Chunks ----------
function chunk(cx, cy) {
  const key = cy * 64 + cx;
  let c = R.chunks.get(key);
  if (c !== undefined) return c;
  const L = R.L, m = L.map, B = R.B;
  const x0 = cx * CH, y0 = cy * CH;
  let any = false;
  const ring = R.ring;                                         // v12: 0 Boden · 1 Wand · 2 Felskante · 3 Masse
  for (let y = y0; y < y0 + CH && !any; y++) for (let x = x0; x < x0 + CH; x++) if (x < m.w && y < m.h && (R.fels ? ring[y * m.w + x] < 3 : !m.solid[y * m.w + x])) { any = true; break; }
  if (!any) { R.chunks.set(key, null); return null; }
  const ox = (x0 - y0 - CH) * 32 - 4, oy = (x0 + y0) * 16 - CHT;
  const W = CH * 64 + 8, H = CHH;
  const K = A.artScale();
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(W * K); cv.height = Math.ceil(H * K);
  const g = cv.getContext("2d");
  g.scale(K, K); g.lineJoin = "round"; g.lineCap = "round";
  for (let s = x0 + y0; s <= x0 + y0 + 2 * (CH - 1); s++) {
    for (let x = x0; x < x0 + CH; x++) {
      const y = s - x;
      if (y < y0 || y >= y0 + CH || x >= m.w || y >= m.h) continue;
      const i = y * m.w + x;
      if (m.solid[i]) continue;
      const ao = (y > 0 && m.solid[i - m.w] ? 1 : 0) | (x > 0 && m.solid[i - 1] ? 2 : 0);
      A.drawFloorTile(g, (x - y) * 32 - ox, (x + y) * 16 - oy, B, R.biome, m.v[i], m.deco[i], ao);
      if (DK.on) {                                              // v13: Boden-Details je Welt + Wandfuß (gebacken, 0 Kosten pro Frame)
        const tx = (x - y) * 32 - ox, ty = (x + y) * 16 - oy, kd = D.floorKind(R.biome, x, y, R.dkSeed, m.deco[i]);
        if (ao && R.biome && D.h01(x, y, R.dkSeed + 19) < 0.55) D.drawWallFoot(g, tx, ty, B, R.biome, ao, (x * 7919 + y * 104729 + R.dkSeed) | 0);
        if (kd) D.drawFloorDeco(g, tx, ty, B, R.biome, kd, (x * 31337 + y * 7331 + R.dkSeed) | 0);
      }
    }
  }
  if (R.fels && R.biome) for (let s = x0 + y0; s <= x0 + y0 + 2 * (CH - 1); s++) for (let x = x0; x < x0 + CH; x++) {   // v12: Felskanten (gebacken)
    const y = s - x;
    if (y < y0 || y >= y0 + CH || x >= m.w || y >= m.h || ring[y * m.w + x] !== 2) continue;
    A.drawRockEdge(g, (x - y) * 32 - ox, (x + y) * 16 - oy, B, R.biome, m.v[y * m.w + x] + x * 7 + y * 13, R.edgeFront[y * m.w + x] === 1);
  }
  c = { cv, ox, oy, W, H, K };
  R.chunkBuilds = (R.chunkBuilds || 0) + 1;
  const cr = L.arena && L.arena.crater;
  if (cr && cr.baked) paintCraterOn(c, cx, cy, cr);            // v11: Krater gehört ab jetzt zum Boden (gecacht)
  R.chunks.set(key, c);
  R.chunkOrder.push(key);
  if (R.chunkOrder.length > CH_MAX) { const old = R.chunkOrder.shift(); R.chunks.delete(old); }
  return c;
}
/** alle Chunks vorab bauen (beim Levelwechsel, versteckt hinter Blende) */
export function prewarm(G) {
  const m = R.L.map;
  const px = G.p.x, py = G.p.y;
  const list = [];
  for (let cy = 0; cy * CH < m.h; cy++) for (let cx = 0; cx * CH < m.w; cx++) list.push([cx, cy, Math.hypot(cx * CH + 4 - px, cy * CH + 4 - py)]);
  list.sort((a, b) => a[2] - b[2]);
  for (const [cx, cy] of list.slice(0, CH_MAX - 4)) chunk(cx, cy);
  // Sprites vorwärmen (sonst Mini-Ruckler beim ersten Auftauchen)
  const B = R.B;
  for (let v = 0; v < 4; v++) A.wallSprite(B, R.biome, v);
  for (const w of R.walls) if (w.dk) D.wallDecoSprite(B, R.biome, w.v, w.dk.kind, w.dk.side);   // v13
  D.warmSprites();
  for (const k of ["heart", "coin"]) A.itemSprite(k);
  if (R.L.traps && R.L.traps.length) { A.trapPlate(B.left); A.trapSpikes(B.top); }
  A.fx("rock");
  for (const e of G.boss && !G.ents.includes(G.boss) ? [...G.ents, G.boss] : G.ents) {      // v11: Boss steckt noch im Boden
    if (e.isMini) { for (const m of ["open", "hurt"]) A.flashOf(A.miniSprite(e.kind, m)); if (e.kind === "funkelflatter") A.flashOf(A.enemySprite("wing", "#8a6ae0")); continue; }
    if (e.isBoss) { A.flashOf(A.body(e.rig.look, e.rig.outfit, e.rig.cape)); for (const m of ["angry", "hurt"]) A.flashOf(A.head(e.rig.look, m)); A.hat("krone", e.rig.hatRed); A.weapon(e.rig.wpn); continue; }
    for (const m of ["open", "hurt"]) A.flashOf(A.enemySprite(e.type, e.tint, m));
    if (e.type === "bat") A.flashOf(A.enemySprite("wing", e.tint));
  }
  for (const k of ["coin", "potion", "mushroom", "sword", "wand", "gem"]) A.itemSprite(k);
  for (const k of ["glow", "dot", "star", "star5", "puff", "heart", "ring", "slash", "shadow", "flame", "conf"]) A.fx(k);
  A.hat("krone", false);
  const lk = G.p.rig.look;
  for (const m of ["open", "blink", "hurt"]) A.flashOf(A.head(lk, m));
  A.flashOf(A.body(lk, G.p.rig.outfit)); A.potSprite(POT_COL[R.biome]); A.chestSprite(false); A.chestSprite(true);
  if (R.L.arena) {
    for (let v = 0; v < 3; v++) A.pillarSprite(R.biome, v);
    A.gateSprite(R.biome); A.sealSprite(R.biome); A.stairsSprite(R.biome);
    const mins = G.boss && G.boss.def && G.boss.def.minions;
    if (mins) for (const [t] of mins) for (const m of ["open", "hurt"]) A.flashOf(A.enemySprite(t, null, m));
  }
}

// ---------- Mini-Transform-Helfer ----------
function base(ctx) {
  const k = R.RS * R.zp;
  ctx.setTransform(k, 0, 0, k, R.RS * (1 - R.zp) * R.VW / 2, R.RS * (1 - R.zp) * R.VH / 2);
}
/** Sprite an Bildschirmposition (Anker), Skalierung s relativ zum Zoom */
function blit(ctx, s, x, y, sc = 1) {
  const Z = R.Z * sc;
  ctx.drawImage(s.cv, x - s.ax * Z, y - s.ay * Z, s.w * Z, s.h * Z);
}
/** in Design-Einheiten (ctx bereits skaliert) */
function put(ctx, s, x, y) { ctx.drawImage(s.cv, x - s.ax, y - s.ay, s.w, s.h); }
export { blit, put, base };

// =====================================================================
// Kobold-Rig (Spieler, Bosse, Kellerkönig)
// =====================================================================
const put2 = (s, x, y) => R.ctx.drawImage(s.cv, x - s.ax, y - s.ay, s.w, s.h);
function drawRig(ctx, X, Y, o) {
  const k = o.scale * R.Z;
  const spinning = o.spin >= 0;
  const spinA = spinning ? o.spin * TAU : 0;
  const fx = spinning ? (Math.cos(spinA) >= 0 ? 1 : -1) * Math.max(0.25, Math.abs(Math.cos(spinA))) * o.face : o.face;
  const bob = o.moving ? Math.abs(Math.sin(o.walkPh)) * 4.5 : Math.sin(o.t * 2.6) * 1.1;
  const sqx = 1 + o.sq, sqy = 1 - o.sq;
  ctx.save();
  ctx.translate(X, Y);
  if (o.alpha < 1) ctx.globalAlpha = o.alpha;
  ctx.rotate(o.tilt || 0);
  ctx.scale(k * sqx, k * sqy);
  const fl = o.flash;
  const S = (s) => fl ? A.flashOf(s) : s;
  // Füße
  const ft = A.foot(o.footCol);
  const ph = o.walkPh, sw = o.moving ? Math.sin(ph) * 5 : 0;
  put(ctx, S(ft), -A.RIG.footX * 0.9 + sw, A.RIG.footY - (o.moving ? Math.max(0, Math.cos(ph)) * 4 : 0));
  put(ctx, S(ft), A.RIG.footX * 0.9 - sw, A.RIG.footY - (o.moving ? Math.max(0, -Math.cos(ph)) * 4 : 0));
  ctx.translate(0, -bob);
  // Waffe: Position (unflipped Raum)
  let wx = 18 * o.face, wy = -26, wr = o.face > 0 ? -1.0 + Math.sin(o.t * 2) * 0.05 : Math.PI + 1.0, wBehind = false;
  if (spinning) { const a = spinA * (o.face > 0 ? 1 : -1) - 0.3; wx = Math.cos(a) * 26; wy = -24 + Math.sin(a) * 11; wr = a; wBehind = Math.sin(a) < 0; }
  else if (o.cast > 0) { wr = o.face > 0 ? -0.2 : Math.PI + 0.2; wx = 22 * o.face; }
  const wsp = o.wpn ? S(A.weapon(o.wpn)) : null;
  const drawW = () => {
    if (!wsp) return;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(wr); if (o.face < 0 && !spinning) ctx.scale(1, -1);
    put(ctx, wsp, 0, 0); ctx.restore();
  };
  if (wBehind) drawW();
  ctx.save();
  ctx.scale(fx, 1);
  if (o.look.myth) A.drawMythBack(ctx, o.look, o.t, o.walkPh, o.moving, put2, S);   // v9: Rückenteil (Flügel/Umhang/Schwänze) bewegt sich
  if (o.wand) { ctx.save(); ctx.translate(-14, -30); ctx.rotate(-2.2); put(ctx, S(A.wand(o.wand)), 0, 0); ctx.restore(); }
  put(ctx, S(A.body(o.look, o.outfit, o.cape)), 0, 0);
  ctx.translate(0, A.RIG.neck);
  ctx.rotate(o.moving ? Math.sin(o.walkPh) * 0.06 : Math.sin(o.t * 1.3) * 0.03);
  const hb = o.look.myth ? A.mythHead(o.look, "back") : null, hf = o.look.myth ? A.mythHead(o.look, "front") : null;
  if (hb) put(ctx, S(hb), 0, 0);
  put(ctx, S(A.head(o.look, o.mood)), 0, 0);
  if (hf) put(ctx, S(hf), 0, 0);                        // v9: Kopfteil ersetzt den Hut nur optisch („🎩 Hut statt Kopfteil“ → mhat)
  else if (o.hat) put(ctx, S(A.hat(o.hat, o.hatRed)), 0, -58);
  ctx.restore();
  if (!wBehind) drawW();
  ctx.restore();
}
export { drawRig };

// =====================================================================
// Hauptzeichnung
// =====================================================================
const list = [], order = [];
let ln = 0;
function add(d, k, o, sx, sy) {
  let e = list[ln];
  if (!e) e = list[ln] = { d: 0, k: 0, o: null, sx: 0, sy: 0 };
  e.d = d; e.k = k; e.o = o; e.sx = sx; e.sy = sy; ln++;
}
const onScreen = (sx, sy, m = 140) => sx > -m && sx < R.VW + m && sy > -m * 1.2 && sy < R.VH + m;

export function draw(G, dt) {
  const ctx = R.ctx, L = R.L, p = G.p;
  R.G = G;
  if (!L || !p) return;
  R.t += dt;
  const B = R.B;
  // v5: Bosskampf in der großen Arena → Kamera zoomt heraus und schaut zwischen Kobold und Boss (Boss + Warnungen im Bild)
  const bz = bossZoom(G);
  const rz = D.riseZoom(G);                                     // v13: beim Beben rückt die Kamera kurz näher
  R.cz += ((rz || (bz ? (R.VW > R.VH ? 0.84 : 0.8) : 1)) - R.cz) * Math.min(1, dt * 2.2);
  if (Math.abs(R.cz - 1) < 0.002) R.cz = 1;
  R.Z = R.Z0 * R.cz; R.U = 64 * R.Z;
  // Kamera (Boss-Intro/Phasenwechsel/Sieg: kurz zum Boss schwenken)
  const cf = G.camFocus;
  // (v11: cf.w = Gewicht zum Ziel, cf.up = Ziel um so viele Design-Pixel nach oben schieben — hohe Bosse beim Auftritt ganz im Bild)
  const cw = cf ? cf.w ?? 0.7 : 0, cu = cf && cf.up ? cf.up / 32 : 0;
  let tx = cf ? p.x + (cf.x - cu - p.x) * cw : p.x + (p.vx || 0) * 0.3, ty = cf ? p.y + (cf.y - cu - p.y) * cw : p.y + (p.vy || 0) * 0.3;
  if (!cf && bz) { const b = G.boss, d = Math.hypot(b.x - p.x, b.y - p.y), k = d > 0.1 ? Math.min(d, 7) * 0.4 / d : 0; tx += (b.x - p.x) * k; ty += (b.y - p.y) * k; }
  // v8: Nachführung skaliert mit dem Tempo — Abstand Kamera↔Kobold in Kacheln bleibt wie bei 3,6 (nichts hinkt hinterher)
  const f = Math.min(1, dt * 6 * clamp(Math.hypot(p.vx || 0, p.vy || 0) / PLAYER.speed0, 1, 1.5));
  R.camX += (tx - R.camX) * f; R.camY += (ty - R.camY) * f;
  R.camDX = (R.camX - R.camY) * 32; R.camDY = (R.camX + R.camY) * 16 - 44;
  const amp = FX.trauma * FX.trauma * 16 * (DK.calm ? 0.35 : 1);   // v13: „Bewegung reduzieren“ → wenig Wackeln
  R.shx = amp * Math.sin(R.t * 47.3) * Math.cos(R.t * 13.1);
  R.shy = amp * Math.cos(R.t * 53.7) * Math.sin(R.t * 11.9);
  R.zp = 1 + FX.zoomPunch * 0.04;
  const Z = R.Z;
  base(ctx);
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  if (R.fels) fillRock(ctx); else { ctx.fillStyle = B.void; ctx.fillRect(-20, -20, R.VW + 40, R.VH + 40); }

  // --- Boden-Chunks --- (R.chunksVis: sichtbare Chunks, muss unter CH_MAX bleiben, sonst würde der Cache flattern)
  const m = L.map;
  let nCh = 0;
  R.glowVis.length = 0; R.dkGlowVis.length = 0; R.dkShineVis.length = 0;
  for (let cy = 0; cy * CH < m.h; cy++) for (let cx = 0; cx * CH < m.w; cx++) {
    const ox = (cx * CH - cy * CH - CH) * 32 - 4, oy = (cx * CH + cy * CH) * 16 - CHT;
    const sx = (ox - R.camDX) * Z + R.VW / 2 + R.shx, sy = (oy - R.camDY) * Z + R.VH * R.focusY + R.shy;
    if (sx > R.VW || sy > R.VH || sx + (CH * 64 + 8) * Z < 0 || sy + CHH * Z < 0) continue;
    if (R.glowAt) { const gl = R.glowAt.get(cy * 64 + cx); if (gl) R.glowVis.push(gl); }   // v12: Glimmpunkte nur in sichtbaren Chunks
    if (DK.on) { const a = R.dkGlow.get(cy * 64 + cx), b = R.dkShine.get(cy * 64 + cx); if (a) R.dkGlowVis.push(a); if (b) R.dkShineVis.push(b); }
    const c = chunk(cx, cy);
    if (c) { ctx.drawImage(c.cv, sx, sy, c.W * Z, c.H * Z); nCh++; }
  }
  R.chunksVis = nCh;
  // v11: Boss-Auftritt am Boden (Risse, aufbrechendes Loch); danach bleibt der Krater als Teil der Boden-Chunks liegen
  const crt = L.arena && L.arena.crater;
  if (crt && !crt.baked) bakeCrater(crt);
  const RS = G.rise;
  if (RS) { const [sx, sy] = toScreen(RS.x, RS.y); drawCrater(ctx, sx, sy, Z, RS, RS.ph === "quake" ? RS.u : 1, RS.ph === "quake" ? 0 : RS.open, RS.ph === "grow" ? "back" : "all", 0.9); }

  // --- Boden-Ebene: Treppe, Portal-Ringe, Warnkreise, Schockwellen, Schatten ---
  if (L.stairs) {
    const st = L.stairs, [sx, sy] = toScreen(st.x, st.y);
    if (st.sealed) blit(ctx, A.sealSprite(R.biome), sx, sy);        // versiegelt: keine Treppe/kein Portal sichtbar
    else if (G.depth < 20) {
      blit(ctx, A.stairsSprite(R.biome), sx, sy);
      const ot = st.openT !== undefined ? G.t - st.openT : 9;      // Siegel zerbricht: Platte blendet aus
      if (ot < 0.6) { ctx.globalAlpha = 1 - ot / 0.6; blit(ctx, A.sealSprite(R.biome), sx, sy - ot * 30 * R.Z); ctx.globalAlpha = 1; }
    }
  }
  const portals = allPortals(G);
  for (const po of portals) { const [sx, sy] = toScreen(po.x, po.y); if (onScreen(sx, sy)) blit(ctx, A.portalRing(po.locked), sx, sy, portalScale(po) * appear(po)); }
  // Fallen (Pieks-Platten)
  if (L.traps) for (const tr of L.traps) {
    const [sx, sy] = toScreen(tr.x, tr.y);
    if (!onScreen(sx, sy)) continue;
    blit(ctx, A.trapPlate(B.left), sx, sy);
    if (tr.st > 0) {
      const ph = ((G.t + tr.ph) % 3.4), k = tr.st === 2 ? 1 : 0.18 + 0.12 * Math.sin(R.t * 30);
      if (tr.st === 1) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(R.t * 16); ctx.fillStyle = "#ff5a7a"; ctx.beginPath(); ctx.ellipse(sx, sy, 0.5 * R.U * 0.707, 0.25 * R.U * 0.707, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      const sp = A.trapSpikes(B.top);
      ctx.save(); ctx.translate(sx, sy); ctx.scale(R.Z, R.Z * k); put(ctx, sp, 0, 0); ctx.restore();
    }
  }
  // v8: Wand-Schützen — Vorwarnung als Bodenlinie der Flugbahn (Weltfarbe, füllt sich von der Wand aus, weiß gestrichelter Rand)
  if (L.wallTraps) for (const w of L.wallTraps) {
    if (w.st !== 1 && !(w.st === 2 && w.t < 0.3)) continue;
    const k = w.st === 1 ? Math.min(1, w.t / WALLTRAP.warn) : 1, fade = w.st === 2 ? 1 - w.t / 0.3 : 1;
    const t = { x: w.x0, y: w.y0, x2: w.x1, y2: w.y1, w: 0.62 };
    ctx.globalAlpha = (0.3 + 0.2 * Math.sin(R.t * 16)) * fade; telePoly(ctx, t, 1, w.look.glow);
    ctx.globalAlpha = 0.5 * fade; telePoly(ctx, t, k, w.look.glow);
    ctx.globalAlpha = 0.9 * fade; ctx.setLineDash([8 * R.Z, 6 * R.Z]); ctx.lineDashOffset = -R.t * 50;
    ctx.beginPath(); telePath(ctx, t, 1); ctx.strokeStyle = "rgba(40,16,50,.8)"; ctx.lineWidth = 4 * R.Z; ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.8 * R.Z; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  // Handlanger-Spawn-Kreise (lila/Welt-Farbe, nicht rot: kein Schaden, „gleich kommt einer")
  for (const s of G.spawns) {
    const [sx, sy] = toScreen(s.x, s.y), k = Math.min(1, s.t / s.max), rx = 0.707 * 0.9 * R.U;
    ctx.globalAlpha = 0.25 + 0.35 * k; ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx * (0.4 + 0.6 * k), rx * 0.5 * (0.4 + 0.6 * k), 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5 * R.Z; ctx.setLineDash([6 * R.Z, 5 * R.Z]); ctx.lineDashOffset = R.t * 30;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.5, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  for (const t of G.teles) {
    if (t.t < 0) continue;
    const k = Math.min(1, t.t / t.max), pulse = 0.24 + 0.1 * Math.sin(R.t * 18);
    if (t.kind === "line") { telePoly(ctx, t, 1, "rgba(255,60,90," + pulse + ")"); telePoly(ctx, t, k, "rgba(255,40,70,.42)"); continue; }
    if (t.burn) {   // Glut-Pfütze
      const [sx, sy] = toScreen(t.x, t.y), rx = 0.707 * t.r * R.U, f = 1 - Math.max(0, (t.t - t.max + 0.4) / 0.4);
      ctx.globalAlpha = f * (0.45 + 0.15 * Math.sin(R.t * 12 + t.x)); ctx.fillStyle = "#ff7a2a";
      ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.5, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = f * 0.6; ctx.fillStyle = "#ffd060"; ctx.beginPath(); ctx.ellipse(sx, sy, rx * 0.55, rx * 0.27, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; continue;
    }
    if (t.kind === "ring") {   // Schallring: Ring mit Loch (innen + außen sicher)
      const [sx, sy] = toScreen(t.x, t.y), ro = 0.707 * t.r * R.U, ri = 0.707 * t.r0 * R.U, rm = ri + (ro - ri) * k;
      ctx.fillStyle = "rgba(255,60,90," + pulse + ")";
      ctx.beginPath(); ctx.ellipse(sx, sy, ro, ro * 0.5, 0, 0, TAU); ctx.ellipse(sx, sy, ri, ri * 0.5, 0, TAU, 0, true); ctx.fill();
      ctx.fillStyle = "rgba(255,40,70,.42)";
      ctx.beginPath(); ctx.ellipse(sx, sy, rm, rm * 0.5, 0, 0, TAU); ctx.ellipse(sx, sy, ri, ri * 0.5, 0, TAU, 0, true); ctx.fill();
      continue;
    }
    const [sx, sy] = toScreen(t.x, t.y);
    const rx = 0.707 * t.r * R.U, ry = rx * 0.5;
    ctx.fillStyle = "rgba(255,60,90," + pulse + ")";
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,40,70,.42)";
    ctx.beginPath(); ctx.ellipse(sx, sy, rx * k, ry * k, 0, 0, TAU); ctx.fill();
  }
  const shadow = A.fx("shadow");
  const shadowAt = (x, y, r, a = 1) => {
    const [sx, sy] = toScreen(x, y);
    if (!onScreen(sx, sy)) return;
    ctx.globalAlpha = a; ctx.drawImage(shadow.cv, sx - r * 32 * Z, sy - r * 16 * Z, r * 64 * Z, r * 32 * Z);
  };
  // gerichteter Schatten weg vom nächsten Licht
  const dirShadow = (x, y, r, h) => {
    let best = null, bd = 4.5;
    for (const t of L.torches) { const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t; } }
    if (!best) return;
    const [sx, sy] = toScreen(x, y), [lx, ly] = toScreen(best.x, best.y);
    const ang = Math.atan2(sy - ly, sx - lx), len = (1.2 + (4.5 - bd) * 0.25) * h;
    ctx.save(); ctx.globalAlpha = 0.32 * (1 - bd / 4.5) + 0.08;
    ctx.translate(sx, sy); ctx.rotate(ang);
    ctx.drawImage(shadow.cv, 0, -r * 12 * Z, len * 40 * Z, r * 24 * Z);
    ctx.restore();
  };
  shadowAt(p.x, p.y, 0.8, 1); dirShadow(p.x, p.y, 0.8, 1.2);
  for (const e of G.ents) {
    const r = (e.scale || 1) * (e.isMini ? 0.75 : e.isBoss ? 1.1 : 0.7);
    shadowAt(e.x, e.y, r, e.fly ? 0.55 : 1);
    if (!e.fly && e.type !== "dummy") dirShadow(e.x, e.y, r, e.isBoss ? 2 : 0.8);
  }
  for (const it of G.items) shadowAt(it.x, it.y, 0.32, 0.8);
  for (const s of G.shots) shadowAt(s.x, s.y, 0.3, 0.5);
  if (RS && (RS.ph === "grow" || RS.ph === "land")) { const b = RS.b; shadowAt(RS.x, RS.y, b.scale * (b.isMini ? 0.75 : 1.1) * Math.min(1, RS.lift), b.fly ? 0.55 : 0.9); }
  ctx.globalAlpha = 1;
  for (const r of FX.rings) {
    const [sx, sy] = toScreen(r.x, r.y), k = 1 - r.life / r.max;
    const rx = 0.707 * r.r * R.U * (0.35 + 0.65 * Math.sqrt(k));
    ctx.globalAlpha = (r.life / r.max) * 0.9; ctx.strokeStyle = r.col; ctx.lineWidth = (3 + 5 * (1 - k)) * r.w * Z;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.5, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  drawGuide(ctx, G, "ground");

  // --- Sortierte Ebene ---
  ln = 0;
  const pd = p.x + p.y;
  for (const w of R.walls) {
    const [sx, sy] = toScreen(w.x + 0.5, w.y + 0.5);
    if (!onScreen(sx, sy, 90)) continue;
    // Wand vor dem Spieler → durchsichtig
    let a = 1;
    const dd = w.d - pd;
    if (dd > 0 && dd < 4.2) { const lat = Math.abs((w.x - w.y) - (p.x - p.y)); if (lat < 2.2) a = 0.32 + 0.68 * Math.min(1, (lat - 0.6) / 1.6 + (dd > 3 ? (dd - 3) : 0)); }
    w.a += (Math.max(0.3, a) - w.a) * Math.min(1, dt * 10);
    add(w.d, 1, w, sx, sy);
  }
  for (const pr of L.props) { const [sx, sy] = toScreen(pr.x, pr.y); if (onScreen(sx, sy, pr.kind === "house" ? 260 : 160)) add(pr.x + pr.y + (pr.kind === "house" ? 0 : 0), 2, pr, sx, sy); }
  for (const po of portals) { const [sx, sy] = toScreen(po.x, po.y); if (onScreen(sx, sy, 160) && !po.locked) add(po.x + po.y, 8, po, sx, sy); }
  if (L.npc) { const [sx, sy] = toScreen(L.npc.x, L.npc.y); add(L.npc.x + L.npc.y, 7, L.npc, sx, sy); }
  for (const e of G.ents) { const [sx, sy] = toScreen(e.x, e.y); if (onScreen(sx, sy, e.isBoss ? 300 : 140)) add(e.x + e.y, 3, e, sx, sy); }
  if (RS && (RS.ph === "grow" || RS.ph === "land")) { const [sx, sy] = toScreen(RS.x, RS.y); add(RS.x + RS.y, 9, RS, sx, sy); }
  { const [sx, sy] = toScreen(p.x, p.y); add(pd + 0.01, 4, p, sx, sy); }
  for (const it of G.items) { const [sx, sy] = toScreen(it.x, it.y); if (onScreen(sx, sy)) add(it.x + it.y, 5, it, sx, sy); }
  for (const s of G.shots) { const [sx, sy] = toScreen(s.x, s.y); if (onScreen(sx, sy)) add(s.x + s.y, 6, s, sx, sy); }
  order.length = ln;
  for (let i = 0; i < ln; i++) order[i] = list[i];
  order.sort((a, b) => a.d - b.d);
  R.drawn = ln;
  for (let i = 0; i < ln; i++) {
    const e = order[i];
    switch (e.k) {
      case 1: {
        const w = e.o;
        ctx.globalAlpha = w.a;
        blit(ctx, w.dk ? D.wallDecoSprite(B, R.biome, w.v, w.dk.kind, w.dk.side) : A.wallSprite(B, R.biome, w.v), e.sx, e.sy);
        const t = R.wallTorch.get(w.y * m.w + w.x);
        if (t) blit(ctx, A.torchSprite(), e.sx + (t.face === "L" ? -16 : 16) * Z, e.sy - 8 * Z);
        const wt = R.wallTrapAt && R.wallTrapAt.get(w.y * m.w + w.x);
        if (wt) drawWallFace(ctx, wt, e.sx, e.sy);
        ctx.globalAlpha = 1;
        break;
      }
      case 2: drawProp(ctx, e.o, e.sx, e.sy, G); break;
      case 3: drawEnemy(ctx, e.o, e.sx, e.sy); break;
      case 4: drawPlayer(ctx, e.o, e.sx, e.sy, G); break;
      case 5: drawItem(ctx, e.o, e.sx, e.sy); break;
      case 6: drawShot(ctx, e.o, e.sx, e.sy); break;
      case 7: {
        const n = e.o; const bl = (R.t % 4) < 0.15;
        ctx.save(); ctx.translate(e.sx, e.sy); ctx.scale(Z * 0.8, Z * 0.8 * (1 + Math.sin(R.t * 2) * 0.02)); put(ctx, A.npcSprite(bl ? "blink" : "open"), 0, 0); ctx.restore();
        break;
      }
      case 8: {
        const po = e.o, sc = portalScale(po) * appear(po);
        ctx.save(); ctx.translate(e.sx, e.sy - 52 * Z * sc);
        ctx.scale(Z * sc * 0.62, Z * sc); ctx.rotate(R.t * 2.2);
        ctx.globalAlpha = 0.95; put(ctx, A.swirlSprite(po.col), 0, 0);
        ctx.restore();
        break;
      }
      case 9: drawRise(ctx, e.o, e.sx, e.sy); break;
    }
  }
  ctx.globalAlpha = 1;
  // Warnkreis-Rand über den Figuren (bleibt auch hinter Bossen sichtbar)
  for (const t of G.teles) {
    if (t.t < 0 || t.burn) continue;
    ctx.setLineDash([10 * R.Z, 7 * R.Z]); ctx.lineDashOffset = -R.t * 40;
    ctx.beginPath();
    if (t.kind === "line") telePath(ctx, t, 1);
    else if (t.kind === "ring") { const [sx, sy] = toScreen(t.x, t.y), ro = 0.707 * t.r * R.U, ri = 0.707 * t.r0 * R.U; ctx.ellipse(sx, sy, ro, ro * 0.5, 0, 0, TAU); ctx.moveTo(sx + ri, sy); ctx.ellipse(sx, sy, ri, ri * 0.5, 0, 0, TAU); }
    else { const [sx, sy] = toScreen(t.x, t.y), rx = 0.707 * t.r * R.U; ctx.ellipse(sx, sy, rx, rx * 0.5, 0, 0, TAU); }
    ctx.strokeStyle = "rgba(255,90,120,.9)"; ctx.lineWidth = 5 * R.Z; ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,245,.95)"; ctx.lineWidth = 2 * R.Z; ctx.stroke();
    ctx.setLineDash([]);
  }
  // v8: Rand der Wandfallen-Bahn auch über Wänden/Figuren (Vorwarnung bleibt sichtbar, wie Boss-Warnungen)
  if (L.wallTraps) for (const w of L.wallTraps) {
    if (w.st !== 1) continue;
    const t = { x: w.x0, y: w.y0, x2: w.x1, y2: w.y1, w: 0.62 };
    ctx.globalAlpha = 0.75; ctx.setLineDash([8 * R.Z, 6 * R.Z]); ctx.lineDashOffset = -R.t * 50;
    ctx.beginPath(); telePath(ctx, t, 1); ctx.strokeStyle = w.look.glow; ctx.lineWidth = 3.2 * R.Z; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  drawGuide(ctx, G, "over");                             // Weg-Pfeil scheint durch Wände/Laternen (nicht über den Kobold)
  // normale Partikel
  drawParticles(ctx, false);

  // --- Licht ---
  lighting(G, B, portals);
  base(ctx);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(R.lcv, -2, -2, R.VW + 4, R.VH + 4);
  // --- Glow (additiv) ---
  ctx.globalCompositeOperation = "lighter";
  glowPass(ctx, G, B, portals);
  drawParticles(ctx, true);
  ctx.globalCompositeOperation = "source-over";
  // --- Texte ---
  textPass(ctx, G, portals);
  // --- Blitze ---
  if (FX.flashA > 0.01) { ctx.globalAlpha = FX.flashA; ctx.fillStyle = FX.flashCol; ctx.fillRect(-20, -20, R.VW + 40, R.VH + 40); ctx.globalAlpha = 1; }
  const low = p.hp > 0 && p.hp <= Math.max(1, p.maxHp * 0.25) ? 0.25 + 0.15 * Math.sin(R.t * 5) : 0;
  const ha = Math.max(FX.hurtA, low);
  if (ha > 0.01) {
    const g = ctx.createRadialGradient(R.VW / 2, R.VH / 2, Math.min(R.VW, R.VH) * 0.3, R.VW / 2, R.VH / 2, Math.hypot(R.VW, R.VH) * 0.6);
    g.addColorStop(0, "rgba(255,40,80,0)"); g.addColorStop(1, "rgba(255,40,80," + ha + ")");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, R.VW + 40, R.VH + 40);
  }
}

// ---------- v7: Weg-Pfeil (liegt als Funkel-Pfeil in Weltfarbe auf dem Boden neben der Figur) ----------
export const guideCol = G => G.depth === 0 ? "#ffcc33" : (G.B.dust || G.B.torch || "#ffcc33");
/** Pfeil-Umriss in Welt-Koordinaten (Iso-Projektion über toScreen → liegt korrekt „flach" auf dem Boden) */
function guidePoly(ctx, p, ux, uy, r0, r1, w) {
  const vx = -uy, vy = ux, hb = r1 - 0.42;
  const P = [[r0, w * 0.5], [hb, w * 0.5], [hb, w * 1.55], [r1, 0], [hb, -w * 1.55], [hb, -w * 0.5], [r0, -w * 0.5]];
  ctx.beginPath();
  P.forEach(([a, b], i) => { const [sx, sy] = toScreen(p.x + ux * a + vx * b, p.y + uy * a + vy * b); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
  ctx.closePath();
}
function drawGuide(ctx, G, mode) {
  const GD = G.guide;
  if (!GD || GD.t < 0 || GD.a <= 0.01) return;
  const p = G.p, col = guideCol(G), a = GD.a, T = R.t;
  const pulse = 1 + 0.07 * Math.sin(T * 7), push = 0.1 * Math.max(0, Math.sin(T * 4.2));
  const r0 = 0.58 + push, r1 = r0 + 1.15 * pulse, w = 0.27;
  if (mode === "glow") {   // additiver Schein + Funkel-Spur (bleibt auf dunklen Paletten hell)
    ctx.globalAlpha = (0.5 + 0.15 * Math.sin(T * 7)) * a; ctx.fillStyle = col; guidePoly(ctx, p, GD.ux, GD.uy, r0, r1, w); ctx.fill();
    const gl = A.fx("glow");
    for (let i = 0; i < 3; i++) {
      const k = ((T * 1.4 + i / 3) % 1), d = r0 - 0.1 + k * (r1 - r0 + 0.3);
      const [sx, sy] = toScreen(p.x + GD.ux * d, p.y + GD.uy * d), s = (16 + 10 * Math.sin(k * Math.PI)) * R.Z;
      ctx.globalAlpha = a * 0.7 * Math.sin(k * Math.PI); ctx.drawImage(A.tinted(gl, col).cv, sx - s / 2, sy - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    return;
  }
  ctx.save(); ctx.lineJoin = "round";
  if (mode === "over") {                                  // Figur aussparen, Rest mit halber Deckkraft
    const [px, py] = toScreen(p.x, p.y), Z = R.Z;
    ctx.beginPath(); ctx.rect(-20, -20, R.VW + 40, R.VH + 40); ctx.rect(px - 30 * Z, py - 96 * Z, 60 * Z, 102 * Z); ctx.clip("evenodd");
    ctx.globalAlpha = 0.5 * a; ctx.fillStyle = mixHex(col, "#ffffff", 0.4); guidePoly(ctx, p, GD.ux, GD.uy, r0, r1, w); ctx.fill();
    ctx.restore(); return;
  }
  ctx.globalAlpha = 0.7 * a; ctx.strokeStyle = "rgba(24,10,40,.9)"; ctx.lineWidth = 7 * R.Z; guidePoly(ctx, p, GD.ux, GD.uy, r0, r1, w); ctx.stroke();
  ctx.globalAlpha = a; ctx.fillStyle = mixHex(col, "#ffffff", 0.4); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.6 * R.Z; ctx.stroke();
  ctx.restore();
}

/** Warnlinie als Iso-Rechteck (k = Füllstand von der Quelle aus) */
function telePath(ctx, t, k) {
  const dx = t.x2 - t.x, dy = t.y2 - t.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l * t.w / 2, ny = dx / l * t.w / 2;
  const ex = t.x + dx * k, ey = t.y + dy * k;
  const a = toScreen(t.x + nx, t.y + ny), b = toScreen(ex + nx, ey + ny), c = toScreen(ex - nx, ey - ny), d = toScreen(t.x - nx, t.y - ny);
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
}
function telePoly(ctx, t, k, col) { ctx.fillStyle = col; ctx.beginPath(); telePath(ctx, t, k); ctx.fill(); }
const portalScale = po => po.small ? 0.7 : po.world ? 0.8 : 1;     // v8: Stadt-Portale etwas kleiner (20 Stück)
/** Heim-Portal blendet nach dem Verstecken weich ein */
const appear = po => po.appearT === undefined ? 1 : Math.max(0.05, 1 - Math.pow(1 - po.appearT, 3));

function allPortals(G) {
  const L = R.L, out = G._portals || (G._portals = []);
  out.length = 0;
  if (L.portals) for (const po of L.portals) out.push(po);
  if (L.homePortal && !L.homePortal.hidden) out.push(L.homePortal);
  if (G.depth === 20 && L.stairs && !L.stairs.sealed) out.push(L.exitPortal || (L.exitPortal = { x: L.stairs.x, y: L.stairs.y, col: "#ffd75e", label: "✨ 20. Portal", exit: true }));
  return out;
}
/** Bosskampf in der Arena (Kobold in/nahe der Arena, Boss wach) → Kamera zoomt heraus */
function bossZoom(G) {
  const b = G.boss, A = R.L && R.L.arena, p = G.p;
  if (!b || !A || !(b.awake || G.rise) || b.hp <= 0 || G.depth === 0) return false;
  return p.x > A.x - 3 && p.y > A.y - 3 && p.x < A.x + A.w + 3 && p.y < A.y + A.h + 3;
}

// ---------- v11: Boss-Auftritt — Risse, Loch, Krater ----------
/** Krater/Risse zeichnen. (X, Y) = Mitte in Pixeln des Ziel-Kontexts, S = Design → Pixel, k = Risslänge 0…1, open = Loch 0…1,
 *  part = "all" | "back" | "front" (Vorderkante liegt über der aufsteigenden Figur), glow = Deckkraft der leuchtenden Risslinie.
 *  Wird während des Auftritts pro Frame gezeichnet und danach einmal in die Boden-Chunks gebacken (gleiche Zufallsfolge → deckungsgleich). */
function drawCrater(c, X, Y, S, cr, k, open, part, glow) {
  const iso = (dx, dy) => [X + (dx - dy) * 32 * S, Y + (dx + dy) * 16 * S];
  c.lineCap = "round"; c.lineJoin = "round";
  if (part !== "front" && k > 0) {
    c.beginPath();
    for (const pts of cr.cracks) {
      const n = pts.length - 1, upto = k * n;
      for (let i = 0; i <= n && i <= upto + 1; i++) {
        let [px, py] = pts[i];
        if (i > upto) { const f = upto - (i - 1), [qx, qy] = pts[i - 1]; px = qx + (px - qx) * f; py = qy + (py - qy) * f; }
        const [sx, sy] = iso(px, py);
        if (i) c.lineTo(sx, sy); else c.moveTo(sx, sy);
      }
    }
    c.strokeStyle = "rgba(16,6,20,.78)"; c.lineWidth = 5.5 * S; c.stroke();
    c.globalAlpha = glow; c.strokeStyle = cr.col; c.lineWidth = 1.9 * S; c.stroke(); c.globalAlpha = 1;
  }
  if (open <= 0) return;
  const r = cr.hole * (0.3 + 0.7 * open), rx = 0.707 * r * 64 * S, ry = rx * 0.5, rnd = mulberry32(cr.seed);
  if (part !== "front") {
    c.fillStyle = shade(cr.earth, -0.3); c.beginPath(); c.ellipse(X, Y, rx * 1.2, ry * 1.24, 0, 0, TAU); c.fill();      // aufgeworfener Erdwall
    c.fillStyle = shade(cr.earth, -0.55); c.beginPath(); c.ellipse(X, Y, rx, ry, 0, 0, TAU); c.fill();                    // Rückwand der Grube
    c.fillStyle = "#07030b"; c.beginPath(); c.ellipse(X, Y + ry * 0.2, rx * 0.86, ry * 0.76, 0, 0, TAU); c.fill();         // Tiefe
    c.globalAlpha = 0.16 * glow; c.fillStyle = cr.col; c.beginPath(); c.ellipse(X, Y + ry * 0.3, rx * 0.4, ry * 0.3, 0, 0, TAU); c.fill(); c.globalAlpha = 1;   // Glimmen tief unten
  }
  // Brocken rund um den Rand (hinten: unter der Figur, vorne: als Vorderkante darüber)
  const N = Math.round(9 + cr.hole * 5);
  for (let i = 0; i < N; i++) {
    const a = (i + rnd() * 0.6) / N * TAU, rr = r * (1.02 + rnd() * 0.25), sz = (5 + rnd() * 6) * S * (0.5 + 0.5 * open), v = rnd();
    const front = Math.cos(a) + Math.sin(a) > 0;
    if ((part === "back" && front) || (part === "front" && !front)) continue;
    const [px, py] = iso(Math.cos(a) * rr, Math.sin(a) * rr);
    c.beginPath();
    for (let j = 0; j < 6; j++) { const b = j / 6 * TAU, q = sz * (0.75 + 0.35 * ((v * 7 + j * 3.7) % 1)); const qx = px + Math.cos(b) * q, qy = py + Math.sin(b) * q * 0.7; if (j) c.lineTo(qx, qy); else c.moveTo(qx, qy); }
    c.closePath(); c.fillStyle = shade(cr.earth, 0.05 + v * 0.22); c.fill();
    c.strokeStyle = "rgba(20,8,24,.7)"; c.lineWidth = 1.4 * S; c.stroke();
  }
  if (part === "front") {                                       // Vorderkante: Erdlippe vor der Grube
    c.strokeStyle = shade(cr.earth, -0.2); c.lineWidth = 5 * S;
    c.beginPath(); c.ellipse(X, Y, rx * 1.02, ry * 1.05, 0, 0.12, Math.PI - 0.12); c.stroke();
  }
}
/** aufsteigender Boss: nur der Teil über dem Boden (Clip-Kante = Lochmitte), danach Vorderkante des Lochs darüber */
function drawRise(ctx, RS, sx, sy) {
  const b = RS.b, Z = R.Z, H = (b.isMini ? 95 : 150) * b.scale * Z;
  const off = RS.fly ? 0 : (1 - RS.lift) * H, clip = RS.ph === "grow";
  if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, R.VW + 40, sy + 20 + 1.5 * Z); ctx.clip(); }
  drawEnemy(ctx, b, sx, sy + off);
  if (clip) { ctx.restore(); drawCrater(ctx, sx, sy, Z, RS, 1, 1, "front", 0.9); }
}
/** Leuchten im Glow-Pass: Bodenrune lädt sich auf, Risse glühen, beim Aufbruch Lichtstrahl nach oben */
function riseGlow(ctx, RS, g) {
  const Z = R.Z, T = R.t, big = RS.b.isKing ? 1.4 : RS.b.isMini ? 0.85 : 1, [sx, sy] = toScreen(RS.x, RS.y);
  const k = RS.ph === "quake" ? RS.u : 1;
  const ga = RS.ph === "quake" ? 0.2 + 0.5 * k : RS.ph === "burst" ? 0.8 : RS.ph === "grow" ? 0.3 * (1 - RS.u) : 0;   // Rune lädt sich auf, verglimmt beim Herauswachsen
  if (ga > 0) g(RS.x, RS.y, 4, (110 + 150 * k) * big, RS.col, ga * (0.85 + 0.15 * Math.sin(T * 31)));
  if (RS.ph === "quake" || RS.ph === "burst") {                  // Risse glühen additiv nach
    ctx.globalAlpha = 0.45 * k; ctx.strokeStyle = RS.col; ctx.lineWidth = 4 * Z; ctx.lineCap = "round"; ctx.beginPath();
    for (const pts of RS.cracks) { const n = pts.length - 1, upto = k * n; pts.forEach(([px, py], i) => { if (i > upto) return; const x = sx + (px - py) * 32 * Z, y = sy + (px + py) * 16 * Z; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); }
    ctx.stroke();
  }
  const beam = RS.ph === "burst" ? Math.min(1, RS.u * 3) : RS.ph === "grow" ? Math.max(0, 1 - RS.u / 0.4) : 0;
  if (beam > 0) {                                               // Licht-/Glutstrahl aus dem Loch
    const s = A.tinted(A.fx("glow"), RS.col), w = 170 * Z * big, h = 760 * Z * big;
    ctx.globalAlpha = 0.85 * beam; ctx.drawImage(s.cv, sx - w / 2, sy - h * 0.92, w, h);
    ctx.globalAlpha = 0.7 * beam; ctx.drawImage(A.fx("glow").cv, sx - w * 0.17, sy - h * 0.8, w * 0.34, h * 0.8);
  }
  ctx.globalAlpha = 1;
}
/** Krater einmal in alle vorhandenen Boden-Chunks malen (neue Chunks bekommen ihn in chunk()) — keine Kosten pro Frame */
function bakeCrater(cr) {
  const t0 = performance.now();
  cr.baked = true;
  cr.ext = Math.max(cr.hole * 1.4, ...cr.cracks.map(p => Math.max(...p.map(([x, y]) => Math.hypot(x, y))))) + 0.6;
  for (const [key, c] of R.chunks) if (c) paintCraterOn(c, key % 64, Math.floor(key / 64), cr);
  R.bakeMs = +(performance.now() - t0).toFixed(2);
}
function paintCraterOn(c, cx, cy, cr) {
  const x0 = cx * CH, y0 = cy * CH, e = cr.ext || 6, m = R.L.map;
  if (cr.x + e < x0 || cr.x - e > x0 + CH || cr.y + e < y0 || cr.y - e > y0 + CH) return;
  const g = c.cv.getContext("2d");
  g.save(); g.setTransform(c.K, 0, 0, c.K, 0, 0);
  g.beginPath();                                                // nur auf den eigenen Bodenkacheln (keine doppelten Ränder an Chunk-Grenzen)
  for (let y = y0; y < Math.min(m.h, y0 + CH); y++) for (let x = x0; x < Math.min(m.w, x0 + CH); x++) {
    if (m.solid[y * m.w + x]) continue;
    const sx = (x - y) * 32 - c.ox, sy = (x + y) * 16 - c.oy;
    g.moveTo(sx, sy); g.lineTo(sx + 32, sy + 16); g.lineTo(sx, sy + 32); g.lineTo(sx - 32, sy + 16); g.closePath();
  }
  g.clip();
  drawCrater(g, (cr.x - cr.y) * 32 - c.ox, (cr.x + cr.y) * 16 - c.oy, 1, cr, 1, 1, "all", 0.5);
  g.restore();
}

function drawPlayer(ctx, p, sx, sy, G) {
  // Nachbilder beim Dodge
  for (const tr of FX.trails) {
    const [tx, ty] = toScreen(tr.x, tr.y);
    drawRig(ctx, tx, ty, { ...p.rig, alpha: (tr.life / tr.max) * 0.45, flash: true, spin: -1, moving: false });
  }
  const o = p.rig;
  o.alpha = p.blinkT > 0 && Math.floor(R.t * 16) % 2 ? 0.5 : 1;
  drawRig(ctx, sx, sy - p.z * R.Z, o);
}

function drawEnemy(ctx, e, sx, sy) {
  const Z = R.Z;
  if (e.isMini) return drawMiniBoss(ctx, e, sx, sy);
  if (e.isBoss) {
    const o = e.rig;
    o.flash = e.flashT > 0; o.mood = e.hurtT > 0 ? "hurt" : "angry"; o.t = e.t; o.sq = e.sq; o.face = e.face;
    o.moving = e.moving; o.walkPh = e.t * 7; o.spin = e.spin ?? -1;
    // Kobold hinter dem Boss? → Boss durchscheinend
    const p = R.G && R.G.p;
    let a = 1;
    if (p && p.x + p.y < e.x + e.y) {
      const [px, py] = toScreen(p.x, p.y), w = 60 * e.scale * Z, h = 150 * e.scale * Z;
      if (Math.abs(px - sx) < w && py < sy + 10 && py > sy - e.z * Z - h) a = 0.5;
    }
    e.fadeA = (e.fadeA ?? 1) + (a - (e.fadeA ?? 1)) * 0.2;
    o.alpha = e.fadeA;
    drawRig(ctx, sx, sy - e.z * Z, o);
    return;
  }
  const t = e.t;
  let s = A.enemySprite(e.type, e.tint, e.hurtT > 0 ? "hurt" : "open");
  if (e.flashT > 0) s = A.flashOf(s);
  let z = e.z, rot = 0, sqx = 1 + e.sq, sqy = 1 - e.sq, alpha = e.alpha ?? 1;
  const sc = (e.scale || 1) * Z;
  switch (e.type) {
    case "bat": z += 26 + Math.sin(t * 6) * 5; break;
    case "wisp": z += 18 + Math.sin(t * 3) * 4; break;
    case "geist": z += 14 + Math.sin(t * 2.4) * 5; break;
    case "flamme": sqx += Math.sin(t * 22) * 0.04; sqy += Math.cos(t * 19) * 0.05; break;
    case "dummy": rot = (e.wob || 0) * Math.sin(t * 28) * 0.25; break;
    default: if (e.moving) rot = Math.sin(t * 11) * 0.08;
  }
  ctx.save();
  ctx.translate(sx, sy - z * Z);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.rotate(rot);
  ctx.scale(sc * sqx * e.face, sc * sqy);
  if (e.type === "bat") {
    const w = A.enemySprite("wing", e.tint), fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 16));
    for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 12, -26); ctx.scale(k, fl); put(ctx, e.flashT > 0 ? A.flashOf(w) : w, 0, 0); ctx.restore(); }
  }
  put(ctx, s, 0, 0);
  ctx.restore();
  if (e.elite) {   // Elite: kleine goldene Krone über dem Kopf
    const hh = (e.type === "wichtel" || e.type === "pilzling" || e.type === "geist" || e.type === "flamme" ? 80 : 58) * sc + z * Z + Math.sin(t * 3) * 3 * Z;
    ctx.save(); ctx.translate(sx, sy - hh); ctx.scale(Z * 0.42, Z * 0.42); ctx.rotate(Math.sin(t * 2) * 0.12); put(ctx, A.hat("krone", false), 0, 0); ctx.restore();
  }
  if (e.hp < e.maxHp && e.type !== "dummy" && e.hp > 0) {
    const h = (e.type === "wichtel" || e.type === "pilzling" || e.type === "geist" || e.type === "flamme" ? 78 : 60) * (e.scale || 1) + z + (e.elite ? 26 : 0);
    const w = 34 * Z * (e.elite ? 1.3 : 1), x = sx - w / 2, y = sy - h * Z - 6;
    ctx.fillStyle = "rgba(30,10,40,.7)"; ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, 8, 4); ctx.fill();
    ctx.fillStyle = e.elite ? "#ffd75e" : e.hp / e.maxHp > 0.4 ? "#7cf29a" : "#ffb35e"; ctx.beginPath(); ctx.roundRect(x, y, Math.max(2, w * e.hp / e.maxHp), 4, 2); ctx.fill();
  }
}

/** Mini-Boss: eigenes Wesen aus art.js (Squash, Treffer-Blitz, Schweben, Flügel) */
function drawMiniBoss(ctx, e, sx, sy) {
  const Z = R.Z, t = e.t;
  let s = A.miniSprite(e.kind, e.hurtT > 0 ? "hurt" : "open");
  if (e.flashT > 0) s = A.flashOf(s);
  let z = e.z || 0, rot = 0, jig = 0;
  const sc = e.scale * Z;
  if (e.kind === "funkelflatter") z += 34 + Math.sin(t * 5) * 6;
  else if (e.kind === "bibber") z += 20 + Math.sin(t * 2.2) * 6;
  else if (e.kind === "schlabbo") jig = Math.sin(t * 3.2) * 0.05;          // wabbelt ständig
  else if (e.moving) rot = Math.sin(t * 9) * 0.06;
  const sqx = 1 + e.sq + jig, sqy = 1 - e.sq - jig;
  // Kobold hinter dem Mini-Boss → durchscheinend
  const p = R.G && R.G.p;
  let a = e.alpha ?? 1;
  if (p && p.x + p.y < e.x + e.y) { const [px, py] = toScreen(p.x, p.y); if (Math.abs(px - sx) < 50 * sc && py < sy + 10 && py > sy - z * Z - 90 * sc) a *= 0.55; }
  ctx.save();
  ctx.translate(sx, sy - z * Z);
  if (a < 1) ctx.globalAlpha = a;
  ctx.rotate(rot);
  ctx.scale(sc * sqx * e.face, sc * sqy);
  if (e.kind === "funkelflatter") {
    const w = A.enemySprite("wing", "#8a6ae0"), fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 9));
    for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * 18, -50); ctx.scale(-k * 1.6, fl * 1.5); put(ctx, e.flashT > 0 ? A.flashOf(w) : w, 0, 0); ctx.restore(); }
  }
  put(ctx, s, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

const POT_COL = ["#d9a06a", "#9fd08a", "#9a9ae0", "#ffb3d8", "#bfe6ff", "#c98a6a"];
function drawProp(ctx, pr, sx, sy, G) {
  const Z = R.Z;
  switch (pr.kind) {
    case "pot": {
      const sh = pr.shakeT > 0 ? Math.sin(R.t * 60) * 2 * Z : 0;
      blit(ctx, A.potSprite(POT_COL[R.biome]), sx + sh, sy);
      break;
    }
    case "chest": blit(ctx, A.chestSprite(pr.open), sx, sy); break;
    case "house": blit(ctx, A.houseSprite(pr.var), sx, sy); break;
    case "tree": {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(R.t * 1.2 + pr.x) * 0.015);
      blit(ctx, A.treeSprite(pr.var), 0, 0); ctx.restore(); break;
    }
    case "lantern": blit(ctx, A.lanternSprite(), sx, sy); break;
    case "wpost": {   // v8: Welttor-Pfosten; der vordere zeichnet die Girlande mit Welt-Schild zum hinteren
      blit(ctx, A.gatePostSprite(pr.w), sx, sy);
      if (pr.front) drawGateGarland(ctx, pr.gate);
      break;
    }
    case "fountain": blit(ctx, A.fountainSprite(), sx, sy); break;
    case "mirror": blit(ctx, A.mirrorSprite(), sx, sy, 0.8); break;
    case "pillar": {   // Säule vor dem Kobold → weich durchsichtig (wie Wände)
      const p = G.p, dd = pr.x + pr.y - (p.x + p.y), lat = Math.abs((pr.x - pr.y) - (p.x - p.y));
      const want = dd > 0 && dd < 4.5 && lat < 2.4 ? 0.38 : 1;
      pr.a = (pr.a ?? 1) + (want - (pr.a ?? 1)) * 0.2;
      ctx.globalAlpha = pr.a; blit(ctx, A.pillarSprite(pr.bi, pr.var), sx, sy); ctx.globalAlpha = 1;
      break;
    }
    case "gate": {   // Arena-Tor: wächst hoch, wenn es sich schließt; sinkt nach dem Sieg wieder ein
      if (pr.k < 0.02) break;
      const sp = A.gateSprite(pr.bi);
      ctx.save(); ctx.translate(sx, sy); ctx.scale(Z, Z * pr.k); put(ctx, sp, 0, 0); ctx.restore();
      break;
    }
  }
}
/** v8: Wand-Schütze (Steingesicht) auf die sichtbare Wandseite geschert; Vorwarnung = pulsierend aufblähen */
function drawWallFace(ctx, w, sx, sy) {
  const Z = R.Z, mood = w.st === 1 ? "warn" : w.st === 2 ? "shoot" : "idle";
  const k = w.st === 1 ? Math.min(1, w.t / WALLTRAP.warn) : 0;
  const sc = 0.8 * (1 + (w.st === 1 ? 0.08 + 0.1 * k + 0.05 * Math.sin(R.t * 26) : w.st === 2 ? 0.06 : 0));
  ctx.save();
  ctx.translate(sx + (w.face === "L" ? -16 : 16) * Z, sy - 9 * Z);
  ctx.transform(1, w.face === "L" ? 0.5 : -0.5, 0, 1, 0, 0);
  ctx.scale(Z * sc, Z * sc);
  put(ctx, A.wallFaceSprite(R.B, mood, w.look.glow), 0, 0);
  ctx.restore();
}
/** v8: Girlande mit Wimpeln zwischen den Pfosten-Köpfen + rundes Schild mit Welt-Symbol (hängt in der Mitte) */
function drawGateGarland(ctx, g) {
  const Z = R.Z, [a, b] = g.posts, col = A.ROAD_COL[g.w];
  const [ax, ay] = toScreen(a.x, a.y, 112), [bx, by] = toScreen(b.x, b.y, 112);
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + 26 * Z;
  ctx.save(); ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(60,30,50,.85)"; ctx.lineWidth = 4 * Z;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my + 12 * Z, bx, by); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 2 * Z; ctx.stroke();
  for (let i = 1; i < 8; i++) {                               // Wimpel entlang der Kurve
    const t = i / 8, x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx, y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * (my + 12 * Z) + t * t * by;
    if (Math.abs(t - 0.5) < 0.1) continue;
    const sw = Math.sin(R.t * 3 + i) * 1.5 * Z;
    ctx.beginPath(); ctx.moveTo(x - 5 * Z, y); ctx.lineTo(x + 5 * Z, y); ctx.lineTo(x + sw, y + 11 * Z); ctx.closePath();
    ctx.fillStyle = i % 2 ? col : "#ffffff"; ctx.fill(); ctx.strokeStyle = "rgba(60,30,50,.7)"; ctx.lineWidth = 1.4 * Z; ctx.stroke();
  }
  const sx = mx, sy = my + 4 * Z + Math.sin(R.t * 1.7 + g.w) * 1.5 * Z, r = 15 * Z;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fillStyle = "#fff8ec"; ctx.fill();
  ctx.lineWidth = 3.2 * Z; ctx.strokeStyle = "rgba(60,30,50,.9)"; ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy, r - 3.2 * Z, 0, TAU); ctx.strokeStyle = col; ctx.lineWidth = 2.4 * Z; ctx.stroke();
  ctx.font = Math.round(17 * Z) + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#000"; ctx.fillText(A.WORLD_EMOJI[g.w], sx, sy + 1 * Z);
  ctx.restore();
}
function drawItem(ctx, it, sx, sy) {
  const Z = R.Z, t = R.t + it.seed;
  const z = it.z + (it.z <= 0.01 ? 5 + Math.sin(t * 3) * 3 : 0);
  let s;
  if (it.kind === "coin") {
    s = A.itemSprite("coin");
    const w = Math.max(0.2, Math.abs(Math.cos(t * 4)));
    ctx.save(); ctx.translate(sx, sy - z * Z); ctx.scale(Z * w, Z); put(ctx, s, 0, 0); ctx.restore();
    return;
  }
  s = A.itemSprite(it.kind, it.v || "");
  if (!s) return;
  blit(ctx, s, sx, sy - z * Z, it.kind === "hat" ? 1.1 : 1);
}
function drawShot(ctx, s, sx, sy) {
  const Z = R.Z;
  if (s.kind === "bubble") {
    const w = 1 + Math.sin(s.t * 14) * 0.08, sp = A.bubbleSprite(s.tier);
    ctx.save(); ctx.translate(sx, sy - s.z * Z); ctx.scale(Z * w * s.size, Z / w * s.size); put(ctx, sp, 0, 0); ctx.restore();
  } else if (s.kind === "snow") {
    const sp = A.bubbleSprite(0);
    ctx.save(); ctx.translate(sx, sy - s.z * Z); ctx.rotate(s.rot || 0);
    ctx.fillStyle = "#f8fcff"; ctx.strokeStyle = "#8ab8dc"; ctx.lineWidth = 3 * Z;
    ctx.beginPath(); ctx.arc(0, 0, 20 * Z, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#dcefff"; ctx.beginPath(); ctx.arc(6 * Z, 5 * Z, 6 * Z, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-7 * Z, -4 * Z, 4 * Z, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (s.kind === "wall") {             // v8: Geschoss der Wand-Schützen (Welt-Look)
    const sp = A.wallShotSprite(s.look);
    let rot = s.rot || 0;
    if (s.look === "shard") rot = Math.atan2((s.vx + s.vy) * 16, (s.vx - s.vy) * 32) + Math.PI / 2;
    ctx.save(); ctx.translate(sx, sy - s.z * Z); ctx.rotate(rot); ctx.scale(Z * 1.05, Z * 1.05); put(ctx, sp, 0, 0); ctx.restore();
  } else if (s.kind === "lob" && s.glob) {   // Glibber-Klumpen (Schlabbo)
    const bw = 12 * Z, w = 1 + Math.sin(s.t * 18) * 0.12;
    ctx.save(); ctx.translate(sx, sy - s.z * Z);
    ctx.fillStyle = s.col; ctx.strokeStyle = "rgba(30,80,30,.75)"; ctx.lineWidth = 2 * Z;
    ctx.beginPath(); ctx.ellipse(0, 0, bw * w, bw / w, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.beginPath(); ctx.arc(-bw * 0.35, -bw * 0.35, bw * 0.28, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (s.kind === "lob") {
    const bw = 13 * Z;
    ctx.save(); ctx.translate(sx, sy - s.z * Z); ctx.rotate(s.t * 8);
    ctx.fillStyle = s.col; ctx.strokeStyle = "rgba(80,20,60,.7)"; ctx.lineWidth = 2 * Z;
    ctx.beginPath(); ctx.ellipse(0, 0, bw, bw * 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * bw, 0); ctx.lineTo(k * bw * 1.6, -bw * 0.5); ctx.lineTo(k * bw * 1.6, bw * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(-bw * 0.35, -bw * 0.3, bw * 0.25, 0, TAU); ctx.fill();
    ctx.restore();
  } else {
    blit(ctx, A.orbSprite(s.col), sx, sy - s.z * Z, s.kind === "fire" ? 1.3 : 1);
  }
}

function drawParticles(ctx, additive) {
  const Z = R.Z;
  for (const p of FX.parts) {
    if (p.add !== additive) continue;
    const [sx, sy] = toScreen(p.x, p.y, p.z);
    if (sx < -40 || sy < -40 || sx > R.VW + 40 || sy > R.VH + 40) continue;
    const k = p.life / p.max;
    const size = (p.s1 + (p.s0 - p.s1) * k) * Z;
    if (size <= 0.3) continue;
    const base = A.fx(p.kind);
    const s = p.kind === "rock" ? A.multiplied(base, p.col) : p.col === "#fff" || p.col === "#ffffff" ? base : A.tinted(base, p.col);
    ctx.globalAlpha = Math.min(1, k * (1 + (1 - p.fade) * 4));
    const w = size, h = size * s.h / s.w;
    if (p.kind === "star" || p.kind === "star5" || p.kind === "conf" || p.kind === "rock" || p.kind === "streak") {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot); ctx.drawImage(s.cv, -w / 2, -h / 2, w, h); ctx.restore();
    } else ctx.drawImage(s.cv, sx - w / 2, sy - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

// ---------- Licht ----------
function lighting(G, B, portals) {
  const l = R.lctx, L = R.L, p = G.p, LS = R.LS;
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = "source-over";
  const a = B.amb;
  const dark = Math.max(G.darkness || 0, D.riseDim(G));       // v13: Boss-Auftritt dunkelt die Welt ab
  l.fillStyle = "rgb(" + Math.round(a[0] * 255 * (1 - dark)) + "," + Math.round(a[1] * 255 * (1 - dark)) + "," + Math.round(a[2] * 255 * (1 - dark)) + ")";
  l.fillRect(0, 0, R.lw, R.lh);
  l.globalCompositeOperation = "lighter";
  const light = (x, y, r, col, al, zOff = 0) => {
    const [sx, sy] = toScreen(x, y, zOff);
    const rx = 0.707 * r * R.U * R.zp;
    if (sx + rx < 0 || sx - rx > R.VW || sy + rx < 0 || sy - rx > R.VH) return false;
    l.globalAlpha = Math.min(1, al);
    const ry = rx * 0.62;
    l.drawImage(lightSprite(col), (sx - rx) / LS, (sy - ry) / LS - 6, rx * 2 / LS, ry * 2 / LS);
    return true;
  };
  const T = R.t;
  { const M = p.look && p.look.myth && MYTH_BY_ID[p.look.myth]; if (M && M.aura) light(p.x, p.y, 2.2, M.aura[0], 0.35); }
  if (R.biome) light(p.x, p.y, 5.6, "#fff1d6", 0.95);
  else light(p.x, p.y, 3.5, "#fff6e0", 0.25);
  for (const t of L.torches) { const fl = 0.82 + 0.1 * Math.sin(T * 9 + t.x * 3) + 0.08 * Math.sin(T * 23 + t.y); light(t.x, t.y, 4.4 * (0.95 + fl * 0.05), B.torch, fl); }
  for (const li of L.lights) light(li.x, li.y, li.r, li.c, li.a * (1 - li.flick + li.flick * Math.sin(T * 7 + li.x)));
  for (const po of portals) if (!po.locked) light(po.x, po.y, po.small ? 2.4 : po.world ? 2.2 : 3.4, po.col, po.world ? 0.45 : 0.8);
  if (L.wallTraps) for (const w of L.wallTraps) if (w.st === 1) light(w.x0, w.y0, 1.6 + 1.4 * Math.min(1, w.t / WALLTRAP.warn), w.look.glow, 0.7);
  if (L.stairs && G.depth < 20 && !L.stairs.sealed) light(L.stairs.x, L.stairs.y, 2.6, "#ffe9a8", 0.55);
  for (const s of G.spawns) light(s.x, s.y, 2.2, s.col, 0.5 + 0.4 * s.t / s.max);
  for (const s of G.shots) if (s.kind !== "lob") light(s.x, s.y, s.kind === "bubble" ? 1.6 : 2.0, s.kind === "bubble" ? "#bfefff" : s.col, 0.7);
  for (const e of G.ents) {
    if (e.type === "wisp") light(e.x, e.y, 2.6, e.tint || "#8fe9ff", 0.8);
    else if (e.type === "flamme") light(e.x, e.y, 2.6, "#ff9a4a", 0.85);
    else if (e.isKing) light(e.x, e.y, 7, "#ff5a3a", 1);
    else if (e.isBoss) light(e.x, e.y, e.awake ? 4 + e.phase * 0.8 : 3.2, e.phase >= 3 ? "#ff8a7a" : e.aura || "#ffd0a0", e.awake ? 0.6 + 0.1 * Math.sin(T * 5) : 0.45);
    else if (e.elite) light(e.x, e.y, 2.2, "#ffe08a", 0.55);
  }
  if (G.specFx) { const f = G.specFx, k = f.t / f.max; light(f.x, f.y, f.r * (0.6 + k * 0.8), f.c1, 1 - k); }
  for (const it of G.items) if (it.kind !== "coin") light(it.x, it.y, 1.3, "#fff0c0", 0.45);
  if (p.spinT > 0) light(p.x, p.y, 3.4, "#fff8e0", p.spinT / 0.28 * 0.7);
  for (const t of G.teles) { if (t.t < 0) continue; if (t.burn) { light(t.x, t.y, t.r * 1.6, "#ff8a3a", 0.8); continue; } if (t.kind === "ring") { light(t.x, t.y, t.r * 1.2, "#ffe0e6", 0.8); continue; } if (t.kind === "line") light((t.x + t.x2) / 2, (t.y + t.y2) / 2, Math.hypot(t.x2 - t.x, t.y2 - t.y) * 0.55, "#ffe0e6", 0.6); else light(t.x, t.y, t.r * 1.5, "#ffe0e6", 0.95); }
  if (L.traps) for (const tr of L.traps) if (tr.st === 1) light(tr.x, tr.y, 1.4, "#ff9ab0", 0.6);
  if (R.fels && R.q < 2) {                                      // v12: Glimmen im Fels — wenige, nur in Sicht (höchstens 10 je Frame)
    let n = 0;
    for (const gl of R.glowVis) { for (const gp of gl) if (light(gp.x, gp.y, 1.5, gp.c, 0.4 + 0.25 * Math.sin(T * gp.f + gp.ph)) && ++n >= 10) break; if (n >= 10) break; }
  }
  if (DK.on) D.lights(light, G, R, FX.lights, T);             // v13: Fackel-Lichtkegel, Lichtstrahl-Pfützen, glühende Deko, Lichtblitze
  if (G.rise) { const RS = G.rise, kk = RS.ph === "quake" ? RS.u : RS.ph === "burst" ? 1 : RS.ph === "grow" ? 1 - 0.4 * RS.u : 0.6 * (1 - RS.u); light(RS.x, RS.y, (2.4 + 3.2 * kk) * (RS.b.isKing ? 1.4 : 1), RS.col, 0.4 + 0.5 * kk); }
  l.globalAlpha = 1;
  l.globalCompositeOperation = "multiply";
  l.drawImage(R.vign, 0, 0);
  l.globalCompositeOperation = "source-over";
}

function glowPass(ctx, G, B, portals) {
  const Z = R.Z, L = R.L, p = G.p, T = R.t;
  const glow = A.fx("glow");
  const g = (x, y, z, size, col, al) => {
    const [sx, sy] = toScreen(x, y, z);
    if (sx < -size * Z || sx > R.VW + size * Z || sy < -size * Z || sy > R.VH + size * Z) return;
    ctx.globalAlpha = al;
    const s = A.tinted(glow, col), w = size * Z;
    ctx.drawImage(s.cv, sx - w / 2, sy - w / 2, w, w);
  };
  // Fackel-Flammen
  const flame = A.fx("flame");
  for (const t of L.torches) {
    const [sx, sy] = toScreen(t.x, t.y);
    if (!onScreen(sx, sy)) continue;
    const [wx, wy] = toScreen(t.wx + 0.5, t.wy + 0.5);
    const px = wx + (t.face === "L" ? -16 : 16) * Z, py = wy - 38 * Z;
    const fl = 1 + Math.sin(T * 17 + t.x) * 0.12 + Math.sin(T * 29) * 0.06;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(A.tinted(flame, B.torch).cv, px - 9 * Z, py - 24 * Z * fl, 18 * Z, 26 * Z * fl);
    ctx.drawImage(flame.cv, px - 5 * Z, py - 14 * Z * fl, 10 * Z, 15 * Z * fl);
    ctx.globalAlpha = 0.5; const s = A.tinted(glow, B.torch), w = 70 * Z * fl; ctx.drawImage(s.cv, px - w / 2, py - 8 * Z - w / 2, w, w);
    if (Math.random() < 0.04) G.emberAt = t;
  }
  if (L.props) for (const pr of L.props) {
    if (pr.kind === "lantern") { const [sx, sy] = toScreen(pr.x, pr.y); ctx.globalAlpha = 0.55 + Math.sin(T * 5 + pr.x) * 0.08; const s = A.tinted(glow, "#ffd27a"), w = 60 * Z; ctx.drawImage(s.cv, sx - w / 2, sy - 76 * Z - w / 2, w, w); }
    else if (pr.kind === "house") { const [sx, sy] = toScreen(pr.x, pr.y); ctx.globalAlpha = 0.35; const s = A.tinted(glow, "#ffc56e"); for (const [dx, dy] of [[-72, -32], [30, -10], [64, -28]]) { const w = 46 * Z; ctx.drawImage(s.cv, sx + dx * Z - w / 2, sy + dy * Z - w / 2, w, w); } }
    else if (pr.kind === "chest" && !pr.open) g(pr.x, pr.y, 20, 50, "#ffd75e", 0.25 + Math.sin(T * 3) * 0.1);
  }
  for (const po of portals) if (!po.locked) g(po.x, po.y, 52 * (po.small ? 0.7 : 1), po.small ? 90 : po.world ? 96 : 130, po.col, (po.world ? 0.3 : 0.4) + Math.sin(T * 3) * 0.08);
  if (L.wallTraps) for (const w of L.wallTraps) if (w.st === 1) { const k = Math.min(1, w.t / WALLTRAP.warn); g(w.x0, w.y0, 18, 40 + 50 * k, w.look.glow, 0.35 + 0.35 * k + 0.1 * Math.sin(T * 26)); }
  for (const s of G.shots) if (s.kind === "wall") g(s.x, s.y, s.z, 56, s.col, s.look === "ember" ? 0.55 : 0.3);
  drawGuide(ctx, G, "glow");
  if (DK.on) D.glow(ctx, G, R, g, toScreen, T);                // v13: Lichtstrahlen, Schwebeteilchen, Glanz, Treppe/Portal/Beute
  if (G.rise) riseGlow(ctx, G.rise, g);
  // v9: „mythisch“ glänzt — weiche Aura unter dem Kobold (klein und leise, Warnkreise der Bosse bleiben lesbar)
  { const M = p.look && p.look.myth && MYTH_BY_ID[p.look.myth]; if (M && M.aura) { const n = M.aura.length, k = (T * 0.6) % n, c1 = M.aura[Math.floor(k)], w = 1 + 0.08 * Math.sin(T * 3);
    g(p.x, p.y, 16, 150 * MYTH_FX.auraR * w, c1, 0.26); g(p.x, p.y, 60, 90 * w, M.aura[(Math.floor(k) + 1) % n], 0.14); } }
  if (L.stairs && G.depth < 20 && !L.stairs.sealed) g(L.stairs.x, L.stairs.y, 4, 70, "#ffe9a8", 0.3 + Math.sin(T * 2.5) * 0.1);
  for (const s of G.spawns) g(s.x, s.y, 20, 80 * (0.5 + s.t / s.max), s.col, 0.35);
  for (const s of G.shots) g(s.x, s.y, s.z, s.kind === "bubble" ? 34 * s.size : s.kind === "snow" ? 70 : 44, s.kind === "bubble" ? "#bfefff" : s.col, s.kind === "lob" ? 0.3 : 0.45);
  for (const e of G.ents) {
    if (e.type === "wisp") g(e.x, e.y, 36 + Math.sin(e.t * 3) * 4, 60, e.tint || "#8fe9ff", 0.55);
    else if (e.type === "flamme") g(e.x, e.y, 30, 64, "#ff9a4a", 0.5);
    else if (e.isKing) {
      g(e.x, e.y, 90, 330, "#ff4a2a", 0.3 + Math.sin(T * 4) * 0.06); g(e.x, e.y, 170, 120, "#ffd060", 0.25);
      // Flammen-Aura: tanzende Flammenzungen rund um den König
      const fl = A.fx("flame"), fr = A.tinted(fl, "#ff7a2a");
      const [kx, ky] = toScreen(e.x, e.y, e.z);
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * TAU + T * 0.8, rx = Math.cos(a) * 1.25 * R.U, ry = Math.sin(a) * 0.62 * R.U;
        const front = Math.sin(a) > 0;
        const h = (1 + 0.35 * Math.sin(T * 9 + k * 1.7)) * (front ? 50 : 72) * R.Z, w = h * 0.62;
        ctx.globalAlpha = (front ? 0.45 : 0.8) + 0.2 * Math.sin(T * 7 + k);
        ctx.drawImage((k % 2 ? fl : fr).cv, kx + rx - w / 2, ky + ry - h * 0.92, w, h);
      }
    }
    else if (e.isBoss && e.awake) {
      const col = e.phase >= 3 ? "#ff5a4a" : e.aura, pul = 0.5 + 0.5 * Math.sin(T * (e.phase >= 3 ? 9 : 4));
      g(e.x, e.y, 60 * e.scale / 1.9, (150 + e.phase * 30) * e.scale / 1.9, col, 0.16 + 0.08 * e.phase * pul);
      if (e.state === "phase") g(e.x, e.y, 70, 320, col, 0.35 + 0.2 * Math.sin(T * 20));
    }
    else if (e.elite) g(e.x, e.y, 34, 70, "#ffd75e", 0.22 + Math.sin(T * 4 + e.t) * 0.08);
    if (e.tele > 0) g(e.x, e.y, 40 * (e.scale || 1), 90 * (e.scale || 1), "#ff5a7a", e.tele * 0.6);
  }
  if (G.specFx) {   // Spezialangriff: große Licht-Welle
    const f = G.specFx, k = f.t / f.max, [sx, sy] = toScreen(f.x, f.y);
    const rx = 0.707 * f.r * R.U * (0.3 + k * 0.9);
    ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = f.c1; ctx.lineWidth = (26 - 18 * k) * Z;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.5, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = f.c2; ctx.lineWidth = 10 * Z;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx * 0.7, rx * 0.35, 0, 0, TAU); ctx.stroke();
    g(f.x, f.y, 30, 420 * (0.5 + k), f.c1, (1 - k) * 0.45);
  }
  for (const it of G.items) {
    const z = it.z + 5 + Math.sin((R.t + it.seed) * 3) * 3;
    if (it.kind === "coin") g(it.x, it.y, z, 22, "#ffd75e", 0.3);
    else g(it.x, it.y, z + 12, 54, it.kind === "potion" || it.kind === "heart" ? "#ff8fb8" : it.kind === "mushroom" ? "#ff9ae0" : "#fff3a0", 0.45 + Math.sin(T * 4 + it.seed) * 0.12);
  }
  // Rundumschlag-Sichel
  if (p.spinT > 0) {
    const k = p.spinT / 0.28, [sx, sy] = toScreen(p.x, p.y, 26);
    const sl = A.tinted(A.fx("slash"), weaponOf(p.atk).trail);
    const r = 0.707 * 2.9 * R.U;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.5); ctx.rotate((1 - k) * TAU * 1.1 * (p.face > 0 ? 1 : -1));
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.drawImage(sl.cv, -r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
    ctx.restore();
  }
  if (FX.flashA > 0) g(p.x, p.y, 40, 200, "#fff6c0", FX.flashA * 0.4);
  ctx.globalAlpha = 1;
}

function textPass(ctx, G, portals) {
  const Z = R.Z;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  // v8: Stadt-Portale: kurze Beschriftung (🌀/⚡/👑/🔒 + Ebene); das nächste Portal zeigt zusätzlich seinen Namen (Schild)
  let near = null, nd = 3.2;
  for (const po of portals) if (po.world) { const d = Math.hypot(po.x - G.p.x, po.y - G.p.y); if (d < nd) { nd = d; near = po; } }
  for (const po of portals) {
    const [sx, sy] = toScreen(po.x, po.y, (po.small ? 100 : po.world ? 104 : 135));
    if (!onScreen(sx, sy)) continue;
    const txt = po.label || "";
    ctx.font = "800 " + Math.round((po.world ? 14 : 13) * Math.max(1, Z)) + "px system-ui, sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(40,10,50,.85)"; ctx.strokeText(txt, sx, sy + Math.sin(R.t * 2 + po.x) * 3);
    ctx.fillStyle = po.locked ? "#c8c0d8" : "#fff8e0"; ctx.fillText(txt, sx, sy + Math.sin(R.t * 2 + po.x) * 3);
  }
  if (near) {   // Schild an fester Stelle (hoch: unter der Anzeige, quer: oben Mitte zwischen ❤️-Leiste und ⏸️) — verdeckt keine Portal-Nummern
    const sx = R.VW / 2, sy = R.VH > R.VW ? Math.max(210, R.VH * 0.27) : 34;
    const t1 = "Ebene " + near.depth + (near.icon === "👑" ? " · 👑 Boss" : near.icon === "⚡" ? " · ⚡ Mini-Boss" : ""), t2 = near.name;
    ctx.font = "800 " + Math.round(14 * Math.max(1, Z)) + "px system-ui, sans-serif";
    const w = Math.max(ctx.measureText(t2).width, ctx.measureText(t1).width) + 22, h = 44;
    const x = Math.max(6 + w / 2, Math.min(R.VW - 6 - w / 2, sx));
    ctx.globalAlpha = 0.9; ctx.fillStyle = near.locked ? "rgba(50,40,70,.92)" : "rgba(40,16,60,.9)";
    ctx.beginPath(); ctx.roundRect(x - w / 2, sy - h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = near.col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = near.locked ? "#c8c0d8" : "#ffe9a8"; ctx.font = "800 " + Math.round(12 * Math.max(1, Z)) + "px system-ui, sans-serif"; ctx.fillText((near.locked ? "🔒 " : "") + t1, x, sy - 10);
    ctx.fillStyle = near.locked ? "#d8d0e8" : "#ffffff"; ctx.font = "800 " + Math.round(14 * Math.max(1, Z)) + "px system-ui, sans-serif"; ctx.fillText(t2, x, sy + 9);
  }
  if (R.L.gates) for (const g of R.L.gates) {                 // Welttor-Name über der Girlande (blendet am Torplatz aus → Portal-Schild)
    const [sx, sy] = toScreen(g.x, g.y, 150), dp = Math.hypot(G.p.x - g.cx, G.p.y - g.cy), [px, py] = toScreen(G.p.x, G.p.y, 50);
    if (!onScreen(sx, sy) || dp < 2.6) continue;
    ctx.globalAlpha = Math.min(1, (dp - 2.6) / 1.2) * (Math.abs(sx - px) < 120 * Z && Math.abs(sy - py) < 70 * Z ? 0.3 : 1);   // nicht über dem Kobold
    const t = A.WORLD_EMOJI[g.w] + " " + BIOMES[g.w].name + " · " + g.depths[0] + "–" + g.depths[1];
    ctx.font = "900 " + Math.round(13 * Math.max(1, Z)) + "px system-ui, sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(40,10,50,.85)"; ctx.strokeText(t, sx, sy); ctx.fillStyle = A.ROAD_COL[g.w]; ctx.fillText(t, sx, sy);
    ctx.globalAlpha = 1;
  }
  if (R.L.mirror) {
    const [sx, sy] = toScreen(R.L.mirror.x, R.L.mirror.y, 128);
    if (onScreen(sx, sy)) {
      ctx.font = "800 " + Math.round(13 * Math.max(1, Z)) + "px system-ui, sans-serif";
      const t = "🪞 Spiegel", yy = sy + Math.sin(R.t * 2 + 1) * 3;
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(40,10,50,.85)"; ctx.strokeText(t, sx, yy); ctx.fillStyle = "#ffe0f0"; ctx.fillText(t, sx, yy);
    }
  }
  if (R.L.stairs && (G.depth < 20 || R.L.stairs.sealed)) {
    const st = R.L.stairs, [sx, sy] = toScreen(st.x, st.y, 58);
    if (onScreen(sx, sy) && (!st.sealed || Math.hypot(G.p.x - st.x, G.p.y - st.y) < 4)) {
      ctx.font = "800 " + Math.round(13 * Math.max(1, Z)) + "px system-ui, sans-serif";
      const t = st.sealed ? "🔒 versiegelt" : "⬇️ Ebene " + (G.depth + 1);
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(40,10,50,.85)"; ctx.strokeText(t, sx, sy + Math.sin(R.t * 2) * 3);
      ctx.fillStyle = "#fff8e0"; ctx.fillText(t, sx, sy + Math.sin(R.t * 2) * 3);
    }
  }
  for (const t of FX.texts) {
    const [sx, sy] = toScreen(t.x, t.y, t.z);
    const k = t.t / t.life, pop = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.6);
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    ctx.font = "900 " + Math.round(t.size * pop * Math.max(0.9, Z)) + "px system-ui, sans-serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,10,50,.9)"; ctx.strokeText(t.str, sx, sy);
    ctx.fillStyle = t.col; ctx.fillText(t.str, sx, sy);
  }
  ctx.globalAlpha = 1;
  omaBubble(ctx, G);
}

// v10: Sprechblase über Oma Pilzhut (Tipps im Vorbeigehen) — in Bildschirmgröße, Schwanz zeigt auf Omas Kopf,
// bleibt am Bildrand im Bild; blendet am Ende aus. Text wird einmal umbrochen und an G.omaSay gemerkt.
function omaBubble(ctx, G) {
  const say = G.omaSay, n = R.L && R.L.npc;
  if (!say || !n || G.depth !== 0) return;
  const age = G.t - say.t0;
  if (age < 0 || age > say.dur) { if (age > say.dur) G.omaSay = null; return; }
  const [hx, hy] = toScreen(n.x, n.y, 118 * 0.8);           // Omas Kopf (Sprite 130 hoch, Anker unten, Maßstab 0.8)
  const fs = Math.round(clamp(13 * Math.max(1, R.Z), 13, 17)), lh = Math.round(fs * 1.28), pad = 10;
  ctx.font = "800 " + fs + "px system-ui, sans-serif";
  const maxW = Math.min(R.VW - 24, 20 * fs);
  if (!say.lines || say.fs !== fs || say.maxW !== maxW) {
    const words = ("🍄 " + say.text).split(" "), lines = [];
    let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (cur && ctx.measureText(t).width > maxW - 2 * pad) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    say.lines = lines; say.fs = fs; say.maxW = maxW;
    say.w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + 2 * pad);
  }
  const w = say.w, h = say.lines.length * lh + 2 * pad - 4, tail = 12;
  const bx = clamp(hx - w / 2, 8, R.VW - 8 - w), by = clamp(hy - tail - h, 8, R.VH - 8 - h);
  const tx = clamp(hx, bx + 16, bx + w - 16), below = by + h + 2 < hy;
  const pop = age < 0.18 ? 0.85 + age / 0.18 * 0.15 : 1, fade = say.dur - age < 0.4 ? (say.dur - age) / 0.4 : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(tx, by + h); ctx.scale(pop, pop); ctx.translate(-tx, -(by + h));
  ctx.fillStyle = "rgba(255,250,236,.97)"; ctx.strokeStyle = "#7a4a9c"; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.roundRect(bx, by, w, h, 14);
  if (below) { ctx.moveTo(tx - 9, by + h - 1); ctx.lineTo(tx, Math.min(hy - 4, by + h + tail)); ctx.lineTo(tx + 9, by + h - 1); }
  ctx.fill(); ctx.stroke();
  if (below) { ctx.fillStyle = "rgba(255,250,236,.97)"; ctx.fillRect(tx - 7.5, by + h - 3, 15, 3); }
  ctx.fillStyle = "#3a1d4e"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  say.lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad - 1 + i * lh));
  ctx.restore();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
}

// ---------- Minikarte ----------
export function drawMini(cv, G) {
  const L = R.L; if (!L || !G.p) return;
  const m = L.map, c = cv.getContext("2d");
  const W = cv.width, H = cv.height, s = W / 44;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2); c.scale(1, 0.5); c.rotate(Math.PI / 4);
  const ox = G.p.x, oy = G.p.y;
  c.fillStyle = "rgba(255,240,220,.75)";
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x;
    if (!m.seen[i] || m.solid[i]) continue;
    c.fillRect((x - ox) * s * 1.4, (y - oy) * s * 1.4, s * 1.45, s * 1.45);
  }
  const dot = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc((x - ox) * s * 1.4, (y - oy) * s * 1.4, r, 0, TAU); c.fill(); };
  if (L.stairs && !L.stairs.sealed && m.seen[Math.floor(L.stairs.y) * m.w + Math.floor(L.stairs.x)]) dot(L.stairs.x, L.stairs.y, "#ffd75e", s * 2.4);
  if (L.homePortal && !L.homePortal.hidden) dot(L.homePortal.x, L.homePortal.y, "#7fffd4", s * 2);
  if (L.portals) for (const po of L.portals) dot(po.x, po.y, po.locked ? "#8a8298" : po.col, s * (po.depth === G.deepest ? 2.2 : 1.4));   // v8: Stadt-Portale
  for (const e of G.ents) if (e.isBoss && m.seen[Math.floor(e.y) * m.w + Math.floor(e.x)]) dot(e.x, e.y, "#ff4a5a", s * 2.6);
  dot(ox, oy, "#ff6fae", s * 2.2);
  c.restore();
}
