/* world.js — Karten, Stadt- & Dungeon-Generator, Kollision, Wegfindung (MIT) */
import { mulberry32 } from "./util.js";

export function makeMap(w, h) {
  const n = w * h;
  return {
    w, h,
    solid: new Uint8Array(n).fill(1),   // 1 = Fels/Wand (wird als Block gezeichnet wenn Nachbar Boden)
    block: new Uint8Array(n).fill(1),   // 1 = nicht begehbar (Fels + Props)
    v: new Uint8Array(n),               // Zufallsvariante pro Kachel
    deco: new Uint8Array(n),            // Boden-Deko (0 = keine, 1 = Weg, 2.. biomspezifisch)
    room: new Int16Array(n).fill(-1),   // Raum-Index
    seen: new Uint8Array(n),            // für Minikarte
  };
}
export const idx = (m, x, y) => y * m.w + x;
export function isBlocked(m, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  return m.block[y * m.w + x] === 1;
}
export function isSolid(m, x, y) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  return m.solid[y * m.w + x] === 1;
}
function carve(m, x, y) {
  if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) return;
  const i = y * m.w + x; m.solid[i] = 0; m.block[i] = 0;
}
function setBlock(m, x, y, b) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.block[y * m.w + x] = b; }

/** Kreis-Kollider (quadratisch angenähert) */
export function canStand(m, x, y, r) {
  return !isBlocked(m, x - r, y - r) && !isBlocked(m, x + r, y - r) &&
    !isBlocked(m, x - r, y + r) && !isBlocked(m, x + r, y + r);
}
/** bewegt e um (dx,dy) mit Achsen-Trennung; gibt true zurück, wenn blockiert wurde */
export function moveEnt(m, e, dx, dy, r) {
  let hit = false;
  if (dx) { if (canStand(m, e.x + dx, e.y, r)) e.x += dx; else hit = true; }
  if (dy) { if (canStand(m, e.x, e.y + dy, r)) e.y += dy; else hit = true; }
  return hit;
}
/** nächste freie Kachelmitte (Auto-Befreiung) */
export function nearestFree(m, x, y, r = 0.3) {
  if (canStand(m, x, y, r)) return { x, y };
  const cx = Math.floor(x), cy = Math.floor(y);
  for (let rad = 0; rad < 12; rad++) {
    let best = null, bd = 1e9;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      const px = cx + dx + 0.5, py = cy + dy + 0.5;
      if (!canStand(m, px, py, r)) continue;
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
    if (best) return best;
  }
  return { x, y };
}
/** Sichtlinie (für KI, Fernkampf, Pfadglättung) */
export function lineFree(m, x0, y0, x1, y1, r = 0) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(d * 4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (r ? !canStand(m, x, y, r) : isBlocked(m, x, y)) return false;
  }
  return true;
}

/** BFS 8-Richtungen ohne Ecken-Anschneiden, danach Pfad glätten. null = kein Weg. */
export function findPath(m, sx, sy, tx, ty, r = 0.3) {
  const { w, h, block } = m;
  let scx = Math.floor(sx), scy = Math.floor(sy);
  let tcx = Math.max(0, Math.min(w - 1, Math.floor(tx))), tcy = Math.max(0, Math.min(h - 1, Math.floor(ty)));
  if (block[tcy * w + tcx]) {
    // Ziel in der Wand → nächste begehbare Kachel am Ziel
    const f = nearestFree(m, tx, ty, 0.01);
    tcx = Math.floor(f.x); tcy = Math.floor(f.y); tx = f.x; ty = f.y;
  }
  if (scx === tcx && scy === tcy) return [{ x: tx, y: ty }];
  const prev = new Int32Array(w * h).fill(-1);
  const start = scy * w + scx, goal = tcy * w + tcx;
  const q = new Int32Array(w * h); let qh = 0, qt = 0;
  q[qt++] = start; prev[start] = start;
  let found = false;
  while (qh < qt) {
    const cur = q[qh++];
    if (cur === goal) { found = true; break; }
    const cx = cur % w, cy = (cur / w) | 0;
    for (let k = 0; k < 8; k++) {
      const dx = DX[k], dy = DY[k];
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (prev[ni] !== -1 || block[ni]) continue;
      if (dx && dy && (block[cy * w + nx] || block[ny * w + cx])) continue;
      prev[ni] = cur; q[qt++] = ni;
    }
  }
  if (!found) return null;
  const raw = [];
  let cur = goal;
  while (cur !== start) { raw.push({ x: (cur % w) + 0.5, y: ((cur / w) | 0) + 0.5 }); cur = prev[cur]; }
  raw.reverse();
  raw[raw.length - 1] = { x: tx, y: ty };
  // Glätten: so weit wie möglich geradeaus
  const out = [];
  let ax = sx, ay = sy, i = 0;
  while (i < raw.length) {
    let j = raw.length - 1;
    while (j > i && !lineFree(m, ax, ay, raw[j].x, raw[j].y, r)) j--;
    out.push(raw[j]); ax = raw[j].x; ay = raw[j].y; i = j + 1;
  }
  return out;
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];

/** BFS-Distanzfeld von einem Punkt (für Raum-Auswahl) */
function distField(m, sx, sy) {
  const { w, h, block } = m;
  const d = new Int32Array(w * h).fill(-1);
  const q = new Int32Array(w * h); let qh = 0, qt = 0;
  const s = Math.floor(sy) * w + Math.floor(sx);
  d[s] = 0; q[qt++] = s;
  while (qh < qt) {
    const cur = q[qh++], cx = cur % w, cy = (cur / w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = cx + DX[k], ny = cy + DY[k], ni = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || d[ni] !== -1 || block[ni]) continue;
      d[ni] = d[cur] + 1; q[qt++] = ni;
    }
  }
  return d;
}

// ================= STADT =================
export function buildTown(seed) {
  const rnd = mulberry32(seed ^ 0x51ab);
  const W = 34, H = 36;
  const m = makeMap(W, H);
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) carve(m, x, y);
  for (let i = 0; i < m.v.length; i++) m.v[i] = (rnd() * 256) | 0;
  const cx = 17, cy = 15;
  const props = [], lights = [];
  // Brunnen 3×3
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) setBlock(m, cx + dx, cy + dy, 1);
  props.push({ kind: "fountain", x: cx + 0.5, y: cy + 0.5 });
  lights.push({ x: cx + 0.5, y: cy + 0.5, r: 4.5, c: "#bfe9ff", a: 0.55, flick: 0.05 });
  // Häuser im Norden (Grundfläche 3×3), Fenster leuchten
  const houseXs = [6, 13, 22];
  houseXs.forEach((hx, i) => {
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) setBlock(m, hx + dx, 5 + dy, 1);
    props.push({ kind: "house", x: hx + 1.5, y: 6.5, var: i });
    lights.push({ x: hx + 1.5, y: 8.4, r: 3.2, c: "#ffc56e", a: 0.7, flick: 0.08 });
  });
  // Wege (Kopfsteinpflaster): Brunnen-Kreuz + zum Portalplatz
  const path = (x, y) => { if (!m.solid[y * W + x]) m.deco[y * W + x] = 1; };
  for (let y = 8; y <= 29; y++) { path(cx, y); path(cx + 1, y); }
  for (let x = 5; x <= 29; x++) { path(x, cy + 3); path(x, cy + 4); }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) path(cx + dx, cy + dy);
  for (const hx of houseXs) for (let y = 8; y <= cy + 3; y++) path(hx + 1, y);
  for (let y = 27; y <= 30; y++) for (let x = 7; x <= 28; x++) path(x, y);
  // Portalplatz: Checkpoints 1, 5, 9, 13, 17
  const portals = [1, 5, 9, 13, 17].map((d, i) => ({ x: 8.5 + i * 4.5, y: 29.2, depth: d }));
  // Bäume
  const trees = [[4, 12], [4, 20], [29, 11], [29, 21], [9, 22], [26, 23], [11, 12], [24, 12], [5, 26], [29, 27], [7, 16], [28, 16]];
  for (const [tx, ty] of trees) { setBlock(m, tx, ty, 1); props.push({ kind: "tree", x: tx + 0.5, y: ty + 0.5, var: (rnd() * 3) | 0 }); }
  // Laternen am Weg
  for (const [lx, ly] of [[cx - 1, 11], [cx + 2, 11], [cx - 1, 23], [cx + 2, 23], [10, cy + 2], [24, cy + 2]]) {
    props.push({ kind: "lantern", x: lx + 0.5, y: ly + 0.5 });
    lights.push({ x: lx + 0.5, y: ly + 0.5, r: 2.6, c: "#ffd27a", a: 0.6, flick: 0.1 });
  }
  // Blumen & Gras-Deko
  for (let i = 0; i < 140; i++) {
    const x = 3 + ((rnd() * (W - 6)) | 0), y = 3 + ((rnd() * (H - 6)) | 0), k = y * W + x;
    if (!m.block[k] && !m.deco[k]) m.deco[k] = 2 + ((rnd() * 4) | 0);
  }
  // Übungspuppen + Oma
  const dummies = [{ x: cx - 4.5, y: cy + 6.5 }, { x: cx + 5.5, y: cy + 6.5 }];
  const npc = { x: cx + 2.6, y: cy + 5.2 };
  return {
    kind: "town", map: m, props, lights, portals, dummies, npc,
    fountain: { x: cx + 0.5, y: cy + 0.5 }, entry: { x: cx + 0.5, y: cy + 5.5 },
    stairs: null, homePortal: null, torches: [], rooms: [],
  };
}

// ================= DUNGEON =================
export function buildDungeon(seed, depth, biome) {
  const rnd = mulberry32((seed | 0) + depth * 7717);
  const isBoss = depth % 4 === 0;
  const S = 44 + Math.min(6, depth >> 2);
  const m = makeMap(S, S);
  for (let i = 0; i < m.v.length; i++) m.v[i] = (rnd() * 256) | 0;
  const rooms = [];
  const fits = (r) => {
    if (r.x < 2 || r.y < 2 || r.x + r.w > S - 2 || r.y + r.h > S - 2) return false;
    for (const o of rooms) if (r.x < o.x + o.w + 2 && r.x + r.w + 2 > o.x && r.y < o.y + o.h + 2 && r.y + r.h + 2 > o.y) return false;
    return true;
  };
  if (isBoss) {
    const aw = 12, ah = 12;
    rooms.push({ x: S - aw - 3, y: S - ah - 3, w: aw, h: ah, arena: true });
  }
  const want = 8 + Math.min(4, Math.floor(depth / 3));
  for (let t = 0; t < 400 && rooms.length < want; t++) {
    const w = 5 + ((rnd() * 6) | 0), h = 5 + ((rnd() * 6) | 0);
    const r = { x: 2 + ((rnd() * (S - w - 4)) | 0), y: 2 + ((rnd() * (S - h - 4)) | 0), w, h };
    if (fits(r)) rooms.push(r);
  }
  rooms.forEach((r, i) => {
    r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { carve(m, x, y); m.room[y * S + x] = i; }
  });
  // Verbindungen: Prim-MST + 2 Extra-Schleifen
  const conn = [], inT = [0];
  const d2 = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
  while (inT.length < rooms.length) {
    let best = null, bd = 1e9;
    for (const i of inT) for (let j = 0; j < rooms.length; j++) {
      if (inT.includes(j)) continue;
      const d = d2(rooms[i], rooms[j]); if (d < bd) { bd = d; best = [i, j]; }
    }
    conn.push(best); inT.push(best[1]);
  }
  for (let k = 0; k < 2; k++) {
    const i = (rnd() * rooms.length) | 0, j = (rnd() * rooms.length) | 0;
    if (i !== j) conn.push([i, j]);
  }
  for (const [i, j] of conn) corridor(m, rooms[i], rooms[j], rnd);
  // Eingangsraum = am weitesten von Arena / Raum 0; Treppenraum = am weitesten vom Eingang
  let entryRoom, stairRoom;
  if (isBoss) {
    stairRoom = 0;
    const df = distField(m, rooms[0].cx, rooms[0].cy);
    entryRoom = farthest(rooms, df, S, 0);
  } else {
    const df0 = distField(m, rooms[0].cx, rooms[0].cy);
    entryRoom = farthest(rooms, df0, S, -1);
    const df1 = distField(m, rooms[entryRoom].cx, rooms[entryRoom].cy);
    stairRoom = farthest(rooms, df1, S, entryRoom);
  }
  const er = rooms[entryRoom], sr = rooms[stairRoom];
  er.entry = true; sr.stairs = true;
  const entry = { x: Math.floor(er.cx) + 0.5, y: Math.floor(er.cy) + 0.5 };
  const stairs = isBoss ? { x: sr.x + sr.w - 2.5, y: sr.y + sr.h - 2.5 } : { x: Math.floor(sr.cx) + 0.5, y: Math.floor(sr.cy) + 0.5 };
  let homePortal = { x: entry.x - 2, y: entry.y };
  for (const [dx, dy] of [[-2, 0], [0, -2], [2, 0], [0, 2], [-1, -1]]) {
    const hx = entry.x + dx, hy = entry.y + dy;
    if (canStand(m, hx, hy, 0.45)) { homePortal = { x: hx, y: hy }; break; }
  }
  // Fackeln an Rückwänden (oben = y-1, links = x-1)
  const torches = [], lights = [];
  rooms.forEach((r, i) => {
    const n = r.arena ? 4 : (rnd() < 0.85 ? 1 + ((rnd() * 2) | 0) : 0);
    for (let k = 0; k < n; k++) {
      if (rnd() < 0.5) {
        const x = r.x + 1 + ((rnd() * (r.w - 2)) | 0);
        if (isSolid(m, x, r.y - 1)) torches.push({ x: x + 0.5, y: r.y + 0.05, face: "L", wx: x, wy: r.y - 1 });
      } else {
        const y = r.y + 1 + ((rnd() * (r.h - 2)) | 0);
        if (isSolid(m, r.x - 1, y)) torches.push({ x: r.x + 0.05, y: y + 0.5, face: "R", wx: r.x - 1, wy: y });
      }
    }
  });
  // Props: Töpfe, Truhen, Deko
  const props = [];
  const occupied = new Set();
  const freeIn = (r, pad = 1) => {
    for (let t = 0; t < 30; t++) {
      const x = r.x + pad + ((rnd() * (r.w - pad * 2)) | 0), y = r.y + pad + ((rnd() * (r.h - pad * 2)) | 0);
      const k = y * S + x;
      if (!m.block[k] && !occupied.has(k) && Math.hypot(x + 0.5 - entry.x, y + 0.5 - entry.y) > 2.2 &&
        Math.hypot(x + 0.5 - stairs.x, y + 0.5 - stairs.y) > 1.8) { occupied.add(k); return { x: x + 0.5, y: y + 0.5 }; }
    }
    return null;
  };
  rooms.forEach((r, i) => {
    // Töpfe in Ecken
    const nPots = r.arena ? 0 : (rnd() * 3.2) | 0;
    for (let k = 0; k < nPots; k++) {
      const corner = [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]][(rnd() * 4) | 0];
      const kk = corner[1] * S + corner[0];
      if (!occupied.has(kk)) { occupied.add(kk); props.push({ kind: "pot", x: corner[0] + 0.5, y: corner[1] + 0.5, hp: 1, var: (rnd() * 3) | 0 }); }
    }
    // Biom-Deko (nicht blockierend) — leuchtet teilweise
    const nDeco = 2 + ((rnd() * 4) | 0);
    for (let k = 0; k < nDeco; k++) {
      const x = r.x + ((rnd() * r.w) | 0), y = r.y + ((rnd() * r.h) | 0);
      m.deco[y * S + x] = 2 + ((rnd() * 3) | 0);
    }
  });
  // Truhe(n)
  const chestRooms = rooms.map((r, i) => i).filter(i => i !== entryRoom && i !== stairRoom);
  for (let k = 0; k < Math.min(2, chestRooms.length); k++) {
    const r = rooms[chestRooms[(rnd() * chestRooms.length) | 0]];
    const p = freeIn(r, 1);
    if (p) props.push({ kind: "chest", x: p.x, y: p.y, open: false });
  }
  // Leuchtende Biom-Kristalle/Lava als Lichter
  for (let i = 0; i < m.deco.length; i++) {
    if (m.deco[i] === 4 && (biome === 2 || biome === 5 || biome === 3) && rnd() < 0.5) {
      lights.push({ x: (i % S) + 0.5, y: ((i / S) | 0) + 0.5, r: 2.2, c: biome === 2 ? "#7fe3ff" : biome === 5 ? "#ff7a3a" : "#ff9ae0", a: 0.45, flick: 0.12 });
    }
  }
  // Spawnpunkte für Gegner/Items
  const spots = [];
  rooms.forEach((r, i) => { if (i !== entryRoom) for (let t = 0; t < 12; t++) { const p = freeIn(r, 0); if (p) spots.push({ ...p, room: i }); } });
  for (let i = spots.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
  return { kind: "dungeon", map: m, rooms, entry, stairs, homePortal, torches, lights, props, spots, isBoss, arena: isBoss ? rooms[0] : null, rnd };
}
function farthest(rooms, df, S, skip) {
  let best = 0, bd = -1;
  rooms.forEach((r, i) => {
    if (i === skip) return;
    const d = df[Math.floor(r.cy) * S + Math.floor(r.cx)];
    if (d > bd) { bd = d; best = i; }
  });
  return best;
}
function corridor(m, a, b, rnd) {
  const x1 = Math.floor(a.cx), y1 = Math.floor(a.cy), x2 = Math.floor(b.cx), y2 = Math.floor(b.cy);
  const hline = (xa, xb, y) => { for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) { carve(m, x, y); carve(m, x, y + 1); } };
  const vline = (ya, yb, x) => { for (let y = Math.min(ya, yb); y <= Math.max(ya, yb) + 1; y++) { carve(m, x, y); carve(m, x + 1, y); } };
  if (rnd() < 0.5) { hline(x1, x2, y1); vline(y1, y2, x2); }
  else { vline(y1, y2, x1); hline(x1, x2, y2); }
}
