// Technik E4: Back-Worker ohne Browser — die echte Worker-Logik (backwerk.js) mit einer Aufzeichnungs-Leinwand statt
// OffscreenCanvas. Prüft: gleiche Zeichenbefehle wie der synchrone Weg (render.js chunk → backeChunk), Reihenfolge,
// leere Chunks, veraltete Ebenen, Fels-Muster, Fehler → Meldung.
import { test } from "node:test";
import assert from "node:assert/strict";

// ---- Browser-Ersatz für game.js (nur um echte Ebenen zu bauen) ----
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem() { }, removeItem() { } };
globalThis.document = { createElement: () => ({ getContext: () => null, canPlayType: () => "", style: {} }), addEventListener() { } };
const { G, startGame, enterLevel } = await import("../../src/game.js");
const { sanitize } = await import("../../src/save.js");
const A = await import("../../src/art.js"), D = await import("../../src/deko.js"), CB = await import("../../src/chunkbacken.js");
const { starteBackwerk } = await import("../../src/backwerk.js");

// Aufzeichnungs-Kontext: jeder Aufruf/Zuweisung landet im Protokoll (Zahlen gerundet)
const rd = (v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : typeof v === "object" ? "obj" : v);
function rekorder(log) {
  const t = {};
  return new Proxy(t, {
    get(_, k) {
      if (k in t) return t[k];
      if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return (...a) => { log.push([k, ...a.map(rd)]); return { addColorStop: (...b) => log.push(["stop", ...b.map(rd)]) }; };
      return (...a) => { log.push([String(k), ...a.map(rd)]); };
    },
    set(_, k, v) { log.push(["=" + String(k), rd(v)]); t[k] = v; return true; },
  });
}
class Leinwand {
  constructor(w, h) { this.width = w; this.height = h; this.log = []; }
  getContext() { return rekorder(this.log); }
  transferToImageBitmap() { return { width: this.width, height: this.height, log: this.log, close() { } }; }
}
function ebeneDaten(depth) {
  startGame(sanitize({ name: "Back", species: "kobold", tut: false, seed: 777, depth: 0 }));
  enterLevel(depth, true);
  const m = G.L.map, fr = CB.felsRing(m), B = G.B, bi = G.biome;
  const dkSeed = (m.w * 131 + m.h * 17 + (B.depth || 0) * 997 + bi * 7) | 0;   // wie deko.js setupLevel
  return { map: { w: m.w, h: m.h, solid: m.solid, v: m.v, deco: m.deco }, ring: fr.ring, edgeFront: fr.front, B, biome: bi, fels: true, dk: true, dkSeed };
}
function bereich(mods = { A, D, CB }) {
  const raus = [];
  const scope = { postMessage: (m) => raus.push(m) };
  starteBackwerk(scope, mods, Leinwand);
  const senden = (m) => scope.onmessage({ data: m });
  const fertig = async (n = 400) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
  return { raus, senden, fertig };
}

test("Worker backt dieselben Zeichenbefehle wie der Hauptthread, in Auftragsreihenfolge", async () => {
  const d = ebeneDaten(6), K = 2.1;
  const { raus, senden, fertig } = bereich();
  const liste = CB.backListe(d.map.w, d.map.h, 20, 20, 10).map(([cx, cy]) => [cx, cy]);
  senden({ typ: "ebene", id: 1, K, d });
  senden({ typ: "chunks", id: 1, liste });
  await fertig();
  assert.equal(raus.length, liste.length);
  let voll = 0;
  for (const [i, m] of raus.entries()) {
    const [cx, cy] = liste[i];
    assert.equal(m.typ, "chunk"); assert.equal(m.key, cy * 64 + cx); assert.equal(m.id, 1);
    assert.equal(m.leer, CB.chunkLeer(d, cx, cy));
    if (m.leer) continue;
    voll++;
    const ms = CB.chunkMasse(cx, cy);
    assert.equal(m.bild.width, Math.ceil(ms.W * K)); assert.equal(m.bild.height, Math.ceil(ms.H * K));
    assert.deepEqual([m.ox, m.oy, m.W, m.H, m.K], [ms.ox, ms.oy, ms.W, ms.H, K]);
    // synchroner Weg (render.js chunk): Leinwand, scale(K), backeChunk
    const log = [], g = rekorder(log); g.scale(K, K); CB.backeChunk(g, d, cx, cy, A, D);
    assert.ok(log.length > 50, "Chunk zeichnet etwas: " + log.length);
    assert.deepEqual(m.bild.log, log);
  }
  assert.ok(voll >= 3, "volle Chunks: " + voll);
});

test("Fels-Muster kommt zuerst und hat die Größe wie buildRock", async () => {
  const d = ebeneDaten(9), K = 1.6;
  const { raus, senden, fertig } = bereich();
  senden({ typ: "ebene", id: 5, K, d });
  senden({ typ: "chunks", id: 5, liste: [[1, 1], [2, 1]] });
  senden({ typ: "fels", id: 5 });
  await fertig();
  assert.equal(raus[0].typ, "fels");
  assert.equal(raus[0].mass.width, Math.round(A.ROCK_W * K)); assert.equal(raus[0].deep.height, Math.round(A.DEEP_H * K));
  assert.ok(raus[0].mass.log.length > 20);
  assert.equal(raus.filter((m) => m.typ === "chunk").length, 2);
});

test("neue Ebene verwirft die alte Warteschlange; fremde ids werden ignoriert", async () => {
  const d1 = ebeneDaten(3), d2 = ebeneDaten(4);
  const { raus, senden, fertig } = bereich();
  senden({ typ: "ebene", id: 1, K: 1, d: d1 });
  senden({ typ: "chunks", id: 1, liste: CB.backListe(d1.map.w, d1.map.h, 10, 10, 20).map(([x, y]) => [x, y]) });
  senden({ typ: "ebene", id: 2, K: 1, d: d2 });
  senden({ typ: "chunks", id: 1, liste: [[0, 0]] });         // veraltet → ignoriert
  senden({ typ: "chunks", id: 2, liste: [[1, 1], [2, 2]] });
  await fertig();
  assert.equal(raus.filter((m) => m.id === 1).length, 0);
  assert.deepEqual(raus.map((m) => m.key), [65, 130]);
});

test("Fehler beim Zeichnen → Meldung „fehler“, Warteschlange leer (Hauptthread schaltet auf synchron)", async () => {
  const d = ebeneDaten(2);
  const kaputt = { A: { ...A, drawFloorTile: () => { throw new Error("kaputt"); } }, D, CB };
  const { raus, senden, fertig } = bereich(kaputt);
  const voll = CB.backListe(d.map.w, d.map.h, 20, 20, 30).filter(([x, y]) => !CB.chunkLeer(d, x, y)).map(([x, y]) => [x, y]);
  senden({ typ: "ebene", id: 1, K: 1, d });
  senden({ typ: "chunks", id: 1, liste: voll.slice(0, 5) });
  await fertig();
  assert.equal(raus.length, 1); assert.equal(raus[0].typ, "fehler"); assert.match(raus[0].text, /kaputt/);
});

test("Verdrängen mit Worker: der am längsten nicht gezeichnete Chunk, nicht der älteste", () => {
  const chunks = new Map([[1, { zuletzt: 50 }], [2, { zuletzt: 10 }], [3, { zuletzt: 99 }], [4, null]]);
  assert.equal(CB.aeltesterUngenutzt(chunks, [1, 2, 3]), 1);
  assert.equal(CB.aeltesterUngenutzt(chunks, [1, 3, 4]), 2);  // fehlender/leerer zuerst
});

test("Fels-Ring: Boden 0, Wand 1, Kante 2, Masse 3", () => {
  const w = 7, h = 7, solid = new Uint8Array(w * h).fill(1);
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) solid[y * w + x] = 0;
  const { ring } = CB.felsRing({ w, h, solid });
  assert.equal(ring[3 * w + 3], 0); assert.equal(ring[1 * w + 1], 1); assert.equal(ring[0], 2); assert.equal(ring[3 * w + 1], 1);
});
