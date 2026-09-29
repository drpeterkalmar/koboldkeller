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
// v8: Aus dem Brunnen-Platz führt je Welt ein eigener Weg (in Weltfarbe) zu einem kleinen Welttor mit einem Portal je Ebene
// (1–4, 5–8, …). Fächer nach unten (Bildschirm): Moos links → Kristall → Zucker (unten) → Frost → Glut rechts. Kurze Wege:
// Welttor-Mitte ≈ 11 Kacheln vom Brunnen (≈ 2,5 s mit Tempo 4,7), Portale ≥ 2 Kacheln auseinander.
export const TOWN_GATE = { road0: 2.6, gate: 9.3, plaza: 11.3, ring: 2.75, ang: [-67.5, -22.5, 22.5, 67.5] };
export const TOWN_DIRS = [null, [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]];    // Karten-Richtung je Welt (1 … 5)
export function buildTown(seed) {
  const rnd = mulberry32(seed ^ 0x51ab);
  const W = 38, H = 36;
  const m = makeMap(W, H);
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) carve(m, x, y);
  for (let i = 0; i < m.v.length; i++) m.v[i] = (rnd() * 256) | 0;
  const cx = 19, cy = 16, F = { x: cx + 0.5, y: cy + 0.5 };
  const props = [], lights = [], portals = [], gates = [];
  const free = (x, y) => x >= 3 && y >= 3 && x < W - 3 && y < H - 3;
  const paint = (x, y, d) => { x = Math.floor(x); y = Math.floor(y); if (free(x, y) && !m.block[y * W + x]) m.deco[y * W + x] = d; };
  const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - ax - dx * k, py - ay - dy * k); };
  // Brunnen 3×3
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) setBlock(m, cx + dx, cy + dy, 1);
  props.push({ kind: "fountain", x: F.x, y: F.y });
  lights.push({ x: F.x, y: F.y, r: 4.5, c: "#bfe9ff", a: 0.55, flick: 0.05 });
  // Häuser oben (Bildschirm) — Grundfläche 3×3, Fenster leuchten
  const houses = [[5, 4], [12, 3], [4, 11]];
  houses.forEach(([hx, hy], i) => {
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) setBlock(m, hx + dx, hy + dy, 1);
    props.push({ kind: "house", x: hx + 1.5, y: hy + 1.5, var: i });
    lights.push({ x: hx + 1.5, y: hy + 3.4, r: 3.2, c: "#ffc56e", a: 0.7, flick: 0.08 });
  });
  // Pflaster: Brunnenplatz + Wege zu den Häusern/zum Spiegel
  for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) if (Math.hypot(x + 0.5 - F.x, y + 0.5 - F.y) < 3.4) paint(x, y, 1);
  const mirror = { x: 10.5, y: 9.5 };
  const lane = (ax, ay, bx, by, d = 1, w = 0.75) => {
    for (let y = Math.floor(Math.min(ay, by) - 2); y <= Math.max(ay, by) + 2; y++) for (let x = Math.floor(Math.min(ax, bx) - 2); x <= Math.max(ax, bx) + 2; x++)
      if (segD(x + 0.5, y + 0.5, ax, ay, bx, by) < w) paint(x, y, d);
  };
  for (const [hx, hy] of houses) lane(F.x, F.y, hx + 1.5, hy + 3.2);
  lane(F.x, F.y, mirror.x, mirror.y + 0.8);
  // Welt-Wege + Welttore mit je 4 Portalen (Ebene 4·(w−1)+1 … 4·w)
  const G0 = TOWN_GATE;
  for (let w = 1; w <= 5; w++) {
    const [dx, dy] = TOWN_DIRS[w], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, vx = -uy, vy = ux;
    const a = { x: F.x + ux * G0.road0, y: F.y + uy * G0.road0 }, g = { x: F.x + ux * G0.gate, y: F.y + uy * G0.gate }, c = { x: F.x + ux * G0.plaza, y: F.y + uy * G0.plaza };
    lane(a.x, a.y, c.x, c.y, 7 + w, 1.05);                         // Weg in Weltfarbe (deco 8 … 12)
    for (let y = Math.floor(c.y - 4); y <= c.y + 4; y++) for (let x = Math.floor(c.x - 4); x <= c.x + 4; x++) { const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y); if (d < 3.4) paint(x, y, d < 2.1 ? 7 + w : 12 + w); }   // Torplatz (Rand = 13 … 17)
    const ps = G0.ang.map(an => { const r = an * Math.PI / 180; return { x: c.x + G0.ring * (Math.cos(r) * ux + Math.sin(r) * vx), y: c.y + G0.ring * (Math.cos(r) * uy + Math.sin(r) * vy) }; });
    // Reihenfolge entlang des Bogens: liegt er eher waagrecht am Bildschirm → links nach rechts, sonst oben nach unten
    const scr = q => [q.x - q.y, (q.x + q.y) / 2], [ax, ay] = scr(ps[0]), [bx, by] = scr(ps[3]);
    if (Math.abs(bx - ax) >= Math.abs(by - ay) ? bx < ax : by < ay) ps.reverse();
    ps.forEach((pt, i) => portals.push({ x: pt.x, y: pt.y, depth: (w - 1) * 4 + i + 1, world: w }));
    // Welttor: zwei Pfosten links/rechts vom Weg (blockieren je eine Kachel) + Girlande/Schild dazwischen (render.js)
    const gate = { x: g.x, y: g.y, w, ux, uy, vx, vy, cx: c.x, cy: c.y, depths: [(w - 1) * 4 + 1, w * 4] };
    gate.posts = [1, -1].map(k => ({ kind: "wpost", x: Math.floor(g.x + vx * 1.6 * k) + 0.5, y: Math.floor(g.y + vy * 1.6 * k) + 0.5, w, gate }));
    gate.posts.sort((a, b) => (a.x + a.y) - (b.x + b.y)); gate.posts[1].front = true;   // vorderer Pfosten zeichnet die Girlande
    gates.push(gate);
    for (const pt of gate.posts) { setBlock(m, Math.floor(pt.x), Math.floor(pt.y), 1); props.push(pt); }
    lights.push({ x: c.x, y: c.y, r: 3.6, c: TOWN_WORLD_COL[w], a: 0.5, flick: 0.05 });
  }
  // Laternen am Brunnenplatz (oben, nicht auf den Welt-Wegen)
  for (const [lx, ly] of [[cx - 4, cy - 1], [cx - 1, cy - 4], [cx + 3, cy - 3]]) {
    props.push({ kind: "lantern", x: lx + 0.5, y: ly + 0.5 });
    lights.push({ x: lx + 0.5, y: ly + 0.5, r: 2.6, c: "#ffd27a", a: 0.6, flick: 0.1 });
  }
  // Friseur-Spiegel (Charakter-Editor) vor dem linken Haus
  setBlock(m, 10, 9, 1);
  props.push({ kind: "mirror", x: mirror.x, y: mirror.y });
  lights.push({ x: mirror.x, y: mirror.y + 0.6, r: 2.2, c: "#ffe9f4", a: 0.45, flick: 0.04 });
  // Übungspuppen + Oma (oben, weg von den Welt-Wegen), Eingang nordwestlich vom Brunnen
  const entry = { x: 16.5, y: 13.5 };
  const dummies = [{ x: 12.5, y: 13.5 }, { x: 19.5, y: 10.5 }];
  const npc = { x: 14.1, y: 16.3 };
  const keep = [entry, npc, mirror, ...dummies];
  // Bäume: nur wo sie keinen Weg, kein Tor, kein Haus und niemanden stören
  const nearRoad = (x, y) => { for (let w = 1; w <= 5; w++) { const [dx, dy] = TOWN_DIRS[w], l = Math.hypot(dx, dy); if (segD(x, y, F.x, F.y, F.x + dx / l * G0.plaza, F.y + dy / l * G0.plaza) < 2.9 || Math.hypot(x - F.x - dx / l * G0.plaza, y - F.y - dy / l * G0.plaza) < 5.2) return true; } return false; };
  const trees = [];
  for (let t = 0; t < 400 && trees.length < 22; t++) {
    const x = 3 + ((rnd() * (W - 6)) | 0), y = 3 + ((rnd() * (H - 6)) | 0), px = x + 0.5, py = y + 0.5;
    if (m.block[y * W + x] || m.deco[y * W + x] === 1 || nearRoad(px, py) || Math.hypot(px - F.x, py - F.y) < 5) continue;
    if (keep.some(k => Math.hypot(k.x - px, k.y - py) < 2.6) || houses.some(([hx, hy]) => px > hx - 1.5 && px < hx + 4.5 && py > hy - 1.5 && py < hy + 5)) continue;
    if (trees.some(q => Math.hypot(q.x - px, q.y - py) < 2.2)) continue;
    trees.push({ x: px, y: py });
    setBlock(m, x, y, 1); props.push({ kind: "tree", x: px, y: py, var: (rnd() * 3) | 0 });
  }
  // Blumen & Gras-Deko
  for (let i = 0; i < 160; i++) {
    const x = 3 + ((rnd() * (W - 6)) | 0), y = 3 + ((rnd() * (H - 6)) | 0), k = y * W + x;
    if (!m.block[k] && !m.deco[k]) m.deco[k] = 2 + ((rnd() * 4) | 0);
  }
  m.seen.fill(1);                                                  // kleine Stadt: Minikarte zeigt alles
  return {
    kind: "town", map: m, props, lights, portals, gates, dummies, npc, mirror,
    fountain: F, entry, stairs: null, homePortal: null, torches: [], rooms: [],
  };
}
export const TOWN_WORLD_COL = [null, "#8fff8a", "#8fe9ff", "#ff9ae0", "#dff6ff", "#ffae5a"];

// ================= DUNGEON =================
/** ad = Arena-Eintrag aus config.ARENA (nur Boss-Ebenen: Hauptboss 4/8/…, Mini-Boss 2/6/…) */
export function buildDungeon(seed, depth, biome, room = [5, 10], ad = null) {
  const rnd = mulberry32((seed | 0) + depth * 7717);
  const isBoss = !!ad;
  const aw = isBoss ? ad.size : 0;
  // Boss-Ebenen werden um die größere Arena erweitert, damit die übrigen Räume Platz behalten
  const S = 44 + Math.min(6, depth >> 2) + (isBoss ? Math.max(0, aw - 12) : 0);
  const m = makeMap(S, S);
  for (let i = 0; i < m.v.length; i++) m.v[i] = (rnd() * 256) | 0;
  const rooms = [];
  const fits = (r) => {
    if (r.x < 2 || r.y < 2 || r.x + r.w > S - 2 || r.y + r.h > S - 2) return false;
    for (const o of rooms) if (r.x < o.x + o.w + 2 && r.x + r.w + 2 > o.x && r.y < o.y + o.h + 2 && r.y + r.h + 2 > o.y) return false;
    return true;
  };
  if (isBoss) rooms.push({ x: S - aw - 3, y: S - aw - 3, w: aw, h: aw, arena: true });
  const want = 8 + Math.min(4, Math.floor(depth / 3));
  for (let t = 0; t < 400 && rooms.length < want; t++) {
    const span = room[1] - room[0] + 1, w = room[0] + ((rnd() * span) | 0), h = room[0] + ((rnd() * span) | 0);
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
  // Boss-Ebene: Treppe in der hintersten Arena-Ecke (weit weg von Eingängen und Kampfmitte), versiegelt bis zum Sieg
  const stairs = isBoss ? { x: sr.x + sr.w - 2.5, y: sr.y + sr.h - 2.5 } : { x: Math.floor(sr.cx) + 0.5, y: Math.floor(sr.cy) + 0.5 };
  const props = [];
  const arena = isBoss ? buildArena(m, rooms[0], ad, biome, stairs, props, rnd) : null;
  let homePortal = { x: entry.x - 2, y: entry.y };
  for (const [dx, dy] of [[-2, 0], [0, -2], [2, 0], [0, 2], [-1, -1]]) {
    const hx = entry.x + dx, hy = entry.y + dy;
    if (canStand(m, hx, hy, 0.45)) { homePortal = { x: hx, y: hy }; break; }
  }
  // Fackeln an Rückwänden (oben = y-1, links = x-1)
  const torches = [], lights = [];
  if (arena) lights.push(...arena.lights);
  rooms.forEach((r, i) => {
    const n = r.arena ? Math.round(r.w / 2) : (rnd() < 0.85 ? 1 + ((rnd() * 2) | 0) : 0);
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
    // Biom-Deko (nicht blockierend) — leuchtet teilweise; Arena-Mosaik (≥ 5) bleibt frei
    const nDeco = 2 + ((rnd() * 4) | 0);
    for (let k = 0; k < nDeco; k++) {
      const x = r.x + ((rnd() * r.w) | 0), y = r.y + ((rnd() * r.h) | 0);
      if (m.deco[y * S + x] < 5) m.deco[y * S + x] = 2 + ((rnd() * 3) | 0);
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
  return { kind: "dungeon", map: m, rooms, entry, stairs, homePortal, torches, lights, props, spots, isBoss, arena, rnd };
}

// ================= WAND-SCHÜTZEN (v8) =================
/** Wand-Schützen platzieren: Steingesicht in einer geraden Rückwand (sichtbare Seite, schießt +x oder +y), Schusslinie über Boden bis
 *  zur nächsten Wand (C.len[0] … C.len[1] Kacheln). Fair: keine Linie im Eingangsraum oder näher als C.entry am Eingang, nicht in/an der
 *  Boss-Arena, nicht über Treppe/Heim-Portal; zwei Linien immer ≥ C.gap Kacheln auseinander (nie derselbe Gang doppelt). */
export function placeWallTraps(L, n, C) {
  const m = L.map, S = m.w, rnd = L.rnd || Math.random, out = [];
  if (!n) return out;
  const entryRoom = L.rooms.findIndex(r => r.entry), arenaRoom = L.rooms.findIndex(r => r.arena), A = L.arena;
  const inArena = (x, y) => A && x > A.x - 2 && y > A.y - 2 && x < A.x + A.w + 2 && y < A.y + A.h + 2;
  const segD = (px, py, t) => { const dx = t.x1 - t.x0, dy = t.y1 - t.y0, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((px - t.x0) * dx + (py - t.y0) * dy) / l2)); return Math.hypot(px - t.x0 - dx * k, py - t.y0 - dy * k); };
  const lineD = (a, b) => { let d = 1e9; for (let i = 0; i <= 8; i++) { const k = i / 8; d = Math.min(d, segD(a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k, b), segD(b.x0 + (b.x1 - b.x0) * k, b.y0 + (b.y1 - b.y0) * k, a)); } return d; };
  const cand = [];
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < S - 1; x++) {
    if (!m.solid[y * S + x]) continue;
    for (const [dx, dy, face] of [[0, 1, "L"], [1, 0, "R"]]) {
      if (m.block[(y + dy) * S + x + dx]) continue;                                   // davor muss Boden sein
      if (!m.solid[(y - dx) * S + x - dy] || !m.solid[(y + dx) * S + x + dy]) continue;   // gerade Wand (keine Ecke, kein Durchgang)
      let len = 0, tx = x + dx, ty = y + dy, ok = true, hug = 0;
      while (tx < S && ty < m.h && !m.block[ty * S + tx]) {
        const r = m.room[ty * S + tx];
        if (r === entryRoom || (arenaRoom >= 0 && r === arenaRoom) || inArena(tx, ty)) { ok = false; break; }
        if (m.solid[(ty + dx) * S + tx + dy]) hug++;                                     // Wand direkt davor (Bildschirm) verdeckt die Bahn
        len++; tx += dx; ty += dy;
      }
      if (!ok || len < C.len[0] || len > C.len[1]) continue;
      if (m.solid[(y + dy + dx) * S + x + dx + dy] || hug > len * 0.3) continue;          // Gesicht + Bahn gut sichtbar
      const t = { wx: x, wy: y, dx, dy, face, len, x0: x + 0.5 + dx * 0.5, y0: y + 0.5 + dy * 0.5, x1: x + 0.5 + dx * (len + 0.5), y1: y + 0.5 + dy * (len + 0.5) };
      if (segD(L.entry.x, L.entry.y, t) < C.entry) continue;
      if (L.stairs && segD(L.stairs.x, L.stairs.y, t) < 1.6) continue;
      if (L.homePortal && segD(L.homePortal.x, L.homePortal.y, t) < 2.2) continue;
      cand.push(t);
    }
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
  for (const t of cand) {
    if (out.length >= n) break;
    if (out.some(o => lineD(o, t) < C.gap)) continue;
    t.mx = (t.x0 + t.x1) / 2; t.my = (t.y0 + t.y1) / 2;
    out.push(t);
  }
  return out;
}
export function lineDist(a, b) { const segD = (px, py, t) => { const dx = t.x1 - t.x0, dy = t.y1 - t.y0, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((px - t.x0) * dx + (py - t.y0) * dy) / l2)); return Math.hypot(px - t.x0 - dx * k, py - t.y0 - dy * k); }; let d = 1e9; for (let i = 0; i <= 16; i++) { const k = i / 16; d = Math.min(d, segD(a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k, b), segD(b.x0 + (b.x1 - b.x0) * k, b.y0 + (b.y1 - b.y0) * k, a)); } return d; }

// ================= BOSS-ARENA (v5) =================
const ARENA_LIGHT = [null, "#b6ff8a", "#bfefff", "#ffc2e8", "#dff6ff", "#ffa04a"];
/** Säulen (Deckung), Tor-Kacheln an den Eingängen, Spawn-Punkte für Handlanger am Rand, Boden-Mosaik, Licht */
function buildArena(m, a, ad, biome, stairs, props, rnd) {
  const S = m.w, N = a.w;
  const ctx = a.x + Math.floor(N / 2), cty = a.y + Math.floor(N / 2);   // Mittel-Kachel (Boss schläft hier)
  const cx = a.x + N / 2, cy = a.y + N / 2;
  const q = Math.round(N * 0.27), q2 = Math.round(N * 0.3);
  const offs = [[q, q], [-q, q], [q, -q], [-q, -q]];
  if (ad.pillars >= 8) offs.push([q2, 0], [-q2, 0], [0, q2], [0, -q2]);
  const pillars = [], lights = [];
  const stTx = Math.floor(stairs.x), stTy = Math.floor(stairs.y);
  for (const [ox, oy] of offs) {
    const tx = ctx + ox, ty = cty + oy;
    if (Math.abs(tx - stTx) + Math.abs(ty - stTy) < 2) continue;           // nie direkt an der Treppe
    const i = ty * S + tx;
    m.block[i] = 1; m.deco[i] = 0;
    const pr = { kind: "pillar", x: tx + 0.5, y: ty + 0.5, var: (rnd() * 3) | 0, bi: biome };
    props.push(pr); pillars.push(pr);
    lights.push({ x: tx + 0.5, y: ty + 0.5, r: 2.6, c: ARENA_LIGHT[biome] || "#ffe9a8", a: 0.5, flick: 0.08 });
  }
  // Tore: Boden-Kacheln direkt außerhalb der Arena, die an die Arena grenzen (Gang-Eingänge)
  const inA = (x, y) => x >= a.x && y >= a.y && x < a.x + N && y < a.y + N;
  const gates = [];
  for (let y = a.y - 1; y <= a.y + N; y++) for (let x = a.x - 1; x <= a.x + N; x++) {
    if (inA(x, y) || x < 0 || y < 0 || x >= S || y >= S || m.block[y * S + x]) continue;
    if (inA(x + 1, y) || inA(x - 1, y) || inA(x, y + 1) || inA(x, y - 1)) {
      const g = { kind: "gate", x: x + 0.5, y: y + 0.5, tx: x, ty: y, k: 0, bi: biome };
      gates.push(g); props.push(g);
    }
  }
  // Spawn-Punkte der Handlanger: Ecken + Kantenmitten (1,5 Kacheln innen), nicht an Treppe/Toren/Säulen
  const cand = [[1.5, 1.5], [N - 1.5, 1.5], [1.5, N - 1.5], [N - 1.5, N - 1.5], [N / 2, 1.5], [N / 2, N - 1.5], [1.5, N / 2], [N - 1.5, N / 2]];
  let spawns = cand.map(([ox, oy]) => ({ x: Math.floor(a.x + ox) + 0.5, y: Math.floor(a.y + oy) + 0.5 }))
    .filter(s => !m.block[Math.floor(s.y) * S + Math.floor(s.x)] && Math.hypot(s.x - stairs.x, s.y - stairs.y) > 3 && gates.every(g => Math.hypot(g.x - s.x, g.y - s.y) > 2.2));
  if (spawns.length < 3) spawns = cand.slice(0, 4).map(([ox, oy]) => ({ x: Math.floor(a.x + ox) + 0.5, y: Math.floor(a.y + oy) + 0.5 })).filter(s => Math.hypot(s.x - stairs.x, s.y - stairs.y) > 2);
  // Boden-Mosaik: Ring um die Mitte (5), Mittel-Emblem (6), Spawn-Runen (7)
  const ringR = N * 0.22;
  for (let y = a.y; y < a.y + N; y++) for (let x = a.x; x < a.x + N; x++) {
    const i = y * S + x;
    if (m.block[i]) continue;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d < 1.3) m.deco[i] = 6; else if (Math.abs(d - ringR) < 0.55) m.deco[i] = 5; else if (m.deco[i] >= 2 && rnd() < 0.5) m.deco[i] = 0;
  }
  for (const s of spawns) m.deco[Math.floor(s.y) * S + Math.floor(s.x)] = 7;
  lights.push({ x: cx, y: cy, r: 4.5, c: ARENA_LIGHT[biome] || "#ffe9a8", a: 0.35, flick: 0.04 });
  return Object.assign(a, { cx, cy, size: N, pillars, gates, spawns, lights, closed: false });
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
