/* world.js — Iso-Mathe, Karten, Weltgen (MIT) */
"use strict";
var W = (function () {
  const W = {};

  // ---------- Iso-Mathe ----------
  const TW = 48, TH = 24;
  const isoX = (wx, wy) => (wx - wy) * (TW / 2);
  const isoY = (wx, wy) => (wx + wy) * (TH / 2);
  const unproj = (sx, sy, camX, camY) => {
    const px = sx + camX, py = sy + camY;
    const wx = (px / (TW / 2) + py / (TH / 2)) / 2;
    const wy = (py / (TH / 2) - px / (TW / 2)) / 2;
    return { x: wx, y: wy };
  };
  W.isoX = isoX; W.isoY = isoY; W.unproj = unproj; W.TW = TW; W.TH = TH;

  // ---------- Deterministischer Zufall ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  W.rng = mulberry32;

  // ---------- Karte ----------
  W.makeMap = function (w, h) {
    const rows = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) row.push({ blocked: true, deco: 0, deco2: 0, lit: 0 });
      rows.push(row);
    }
    return { w, h, rows };
  };

  // ---------- Stadt ----------
  W.buildTown = function (map, rnd) {
    const { w, h, rows } = map;
    for (let y = 3; y < h - 3; y++)
      for (let x = 3; x < w - 3; x++) rows[y][x].blocked = false;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (x < 6 || y < 6 || x > w - 7 || y > h - 7) rows[y][x].blocked = true;
    // Häuser oben
    const houses = [];
    for (let i = 0; i < 3; i++) {
      const hx = 9 + i * 9, hy = 8;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++)
        rows[hy + dy][hx + dx].blocked = true;
      houses.push({ x: hx + 1.5, y: hy + 2.4 });
    }
    // Brunnen
    const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      rows[cy + dy][cx + dx].blocked = true;
    // Blumen
    for (let i = 0; i < 90; i++) {
      const x = 6 + Math.floor(rnd() * (w - 12)), y = 6 + Math.floor(rnd() * (h - 12));
      if (!rows[y][x].blocked) rows[y][x].deco = 1 + Math.floor(rnd() * 3);
    }
    return {
      kind: "town", houses, fountain: { x: cx, y: cy },
      portal: { x: cx, y: h - 9 }, stairs: null, torches: [], entry: { x: cx, y: h - 11 },
    };
  };

  // ---------- Dungeon ----------
  W.buildDungeon = function (map, rnd, depth) {
    const { w, h, rows } = map;
    const rooms = [];
    const n = 8 + Math.min(3, depth);
    for (let i = 0; i < n; i++) {
      const rw = 4 + Math.floor(rnd() * 5), rh = 4 + Math.floor(rnd() * 5);
      const rx = 2 + Math.floor(rnd() * Math.max(1, w - rw - 4));
      const ry = 2 + Math.floor(rnd() * Math.max(1, h - rh - 4));
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + rw / 2, cy: ry + rh / 2 });
      for (let y = ry; y < ry + rh; y++)
        for (let x = rx; x < rx + rw; x++) rows[y][x].blocked = false;
    }
    // Korridore
    for (let i = 0; i < rooms.length - 1; i++) {
      const a = rooms[i], b = rooms[i + 1];
      const x1 = Math.round(a.cx), y1 = Math.round(a.cy);
      const x2 = Math.round(b.cx), y2 = Math.round(b.cy);
      if (rnd() < 0.5) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) rows[y1][x].blocked = false;
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) rows[y][x2].blocked = false;
      } else {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) rows[y][x1].blocked = false;
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) rows[y2][x].blocked = false;
      }
    }
    const first = rooms[0], last = rooms[rooms.length - 1];
    let entry = { x: first.x + 1.5, y: first.y + 1.5 };
    let stairs = { x: last.x + last.w / 2, y: last.y + last.h / 2 };
    // Treppe/Start auf FREIE Kacheln bannen (sonst Ping-Pong zwischen Rettung und Betreten)
    const freeNear = (pt) => {
      for (let r = 0; r < 4; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const cx = Math.floor(pt.x + dx), cy = Math.floor(pt.y + dy);
            if (cx > 0 && cy > 0 && cx < w - 1 && cy < h - 1 && !rows[cy][cx].blocked)
              return { x: cx + 0.5, y: cy + 0.5 };
          }
        }
      }
      return pt;
    };
    stairs = freeNear(stairs);
    entry = freeNear(entry);
    // Fackeln
    const torches = [];
    for (const r of rooms) if (rnd() < 0.7) torches.push({ x: r.x + 0.5, y: r.y + 0.5 });
    // Pilze / Steinchen
    for (let i = 0; i < 110; i++) {
      const x = 1 + Math.floor(rnd() * (w - 2)), y = 1 + Math.floor(rnd() * (h - 2));
      if (!rows[y][x].blocked) rows[y][x].deco = 3 + Math.floor(rnd() * 2);
    }
    return { kind: "dungeon", rooms, entry, stairs, portal: null, torches, houses: [] };
  };

  // ---------- Sichtbarkeit (Sichtkreis, weich) ----------
  W.visField = function (map, px, py, radius) {
    const { w, h, rows } = map;
    const vis = [];
    for (let y = 0; y < h; y++) vis.push(new Float32Array(w));
    const x0 = Math.max(0, Math.floor(px - radius)), x1 = Math.min(w - 1, Math.ceil(px + radius));
    const y0 = Math.max(0, Math.floor(py - radius)), y1 = Math.min(h - 1, Math.ceil(py + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (rows[y][x].blocked) continue;
        const d = Math.hypot(x - px, y - py);
        if (d > radius) continue;
        // simpler Sichtcheck: Linie zum Spieler
        let visible = true;
        const steps = Math.ceil(d * 2.5);
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const sx = Math.round(px + (x - px) * t), sy = Math.round(py + (y - py) * t);
          if (rows[sy][sx].blocked) { visible = false; break; }
        }
        vis[y][x] = visible ? Math.max(0.25, 1 - d / (radius * 1.35)) : 0.12;
      }
    }
    return vis;
  };

  return W;
})();