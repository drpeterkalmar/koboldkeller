/* chunkbacken.js — Technik-Etappe E4: Boden-Chunk backen, gemeinsamer Code für Hauptthread (render.js) und Worker (backwerk.js)
   (MIT). Vorher stand das in render.js chunk(); jetzt rufen beide Wege genau diese Funktion auf → gleiche Pixel.
   A = art.js, D = deko.js werden übergeben (im Worker mit Versions-Abfrage geladen). Kein DOM, kein R. */

export const CH = 8, CH_MAX = 28;
// v12: Chunk-Rand oben (Design-Px) — Platz für die Felskanten auf Wandkronen-Höhe; CHH = Chunk-Höhe
export const CHT = 40, CHH = CH * 32 + 30 + (CHT - 24);

/** v12: Ring um die begehbare Fläche: 0 Boden · 1 Wand · 2 Felskante · 3 Masse; front = Felskante vor einer Wand
    (Geröll am Wandfuß statt Kronen-Brocken). Vorher in render.js setRock. */
export function felsRing(m) {
  const n = m.w * m.h, ring = new Uint8Array(n).fill(3), front = new Uint8Array(n);
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
    const behind = at(x + 1, y) === 1 || at(x, y + 1) === 1 || at(x + 1, y + 1) === 1;
    front[i] = !behind && (at(x - 1, y) === 1 || at(x, y - 1) === 1 || at(x - 1, y - 1) === 1) ? 1 : 0;
  }
  return { ring, front };
}

/** Lage und Größe eines Chunks in Design-Pixeln */
export function chunkMasse(cx, cy) {
  const x0 = cx * CH, y0 = cy * CH;
  return { x0, y0, ox: (x0 - y0 - CH) * 32 - 4, oy: (x0 + y0) * 16 - CHT, W: CH * 64 + 8, H: CHH };
}

/** true, wenn im Chunk nichts zu zeichnen ist (nur Fels-Masse bzw. ohne Fels: nur Wand) */
export function chunkLeer(d, cx, cy) {
  const m = d.map, ring = d.ring, x0 = cx * CH, y0 = cy * CH;
  for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) if (x < m.w && y < m.h && (d.fels ? ring[y * m.w + x] < 3 : !m.solid[y * m.w + x])) return false;
  return true;
}

/** Chunk (cx, cy) auf g zeichnen (g ist schon mit dem Art-Maßstab skaliert). d = { map:{w,h,solid,v,deco}, ring, edgeFront,
    B, biome, fels, dk, dkSeed } — dieselben Daten, die render.js aus R nimmt. */
export function backeChunk(g, d, cx, cy, A, D) {
  const m = d.map, B = d.B, bi = d.biome, ring = d.ring;
  const { x0, y0, ox, oy } = chunkMasse(cx, cy);
  g.lineJoin = "round"; g.lineCap = "round";
  for (let s = x0 + y0; s <= x0 + y0 + 2 * (CH - 1); s++) {
    for (let x = x0; x < x0 + CH; x++) {
      const y = s - x;
      if (y < y0 || y >= y0 + CH || x >= m.w || y >= m.h) continue;
      const i = y * m.w + x;
      if (m.solid[i]) continue;
      const ao = (y > 0 && m.solid[i - m.w] ? 1 : 0) | (x > 0 && m.solid[i - 1] ? 2 : 0);
      A.drawFloorTile(g, (x - y) * 32 - ox, (x + y) * 16 - oy, B, bi, m.v[i], m.deco[i], ao);
      if (d.dk) {                                               // v13: Boden-Details je Welt + Wandfuß (gebacken, 0 Kosten pro Frame)
        const tx = (x - y) * 32 - ox, ty = (x + y) * 16 - oy, kd = D.floorKind(bi, x, y, d.dkSeed, m.deco[i]);
        if (ao && bi && D.h01(x, y, d.dkSeed + 19) < 0.55) D.drawWallFoot(g, tx, ty, B, bi, ao, (x * 7919 + y * 104729 + d.dkSeed) | 0);
        if (kd) D.drawFloorDeco(g, tx, ty, B, bi, kd, (x * 31337 + y * 7331 + d.dkSeed) | 0);
      }
    }
  }
  if (d.fels && bi) for (let s = x0 + y0; s <= x0 + y0 + 2 * (CH - 1); s++) for (let x = x0; x < x0 + CH; x++) {   // v12: Felskanten (gebacken)
    const y = s - x;
    if (y < y0 || y >= y0 + CH || x >= m.w || y >= m.h || ring[y * m.w + x] !== 2) continue;
    A.drawRockEdge(g, (x - y) * 32 - ox, (x + y) * 16 - oy, B, bi, m.v[y * m.w + x] + x * 7 + y * 13, d.edgeFront[y * m.w + x] === 1);
  }
}

/** Reihenfolge fürs Vorbacken: nach Abstand zum Kobold (sichtbare zuerst), höchstens n */
export function backListe(mw, mh, px, py, n = CH_MAX - 4) {
  const list = [];
  for (let cy = 0; cy * CH < mh; cy++) for (let cx = 0; cx * CH < mw; cx++) list.push([cx, cy, Math.hypot(cx * CH + 4 - px, cy * CH + 4 - py)]);
  list.sort((a, b) => a[2] - b[2]);
  return list.slice(0, n);
}

/** Verdrängen mit Worker: den am längsten nicht gezeichneten Chunk (statt des ältesten) — sichtbare bleiben im Speicher */
export function aeltesterUngenutzt(chunks, order) {
  let bi = 0, bz = Infinity;
  for (let i = 0; i < order.length; i++) { const c = chunks.get(order[i]); const z = c ? c.zuletzt || 0 : -1; if (z < bz) { bz = z; bi = i; } }
  return bi;
}
