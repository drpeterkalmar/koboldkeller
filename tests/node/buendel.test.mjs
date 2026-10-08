// Technik E1: Partikel bündeln — reine Teile (Winkel → vorgedrehtes Bild, Maße, Sortierung)
import { test } from "node:test";
import assert from "node:assert/strict";
import { DREH, drehIndex, drehMasse, sortiereNachBild } from "../../src/buendel.js";

const TAU = Math.PI * 2;
test("Winkel → nächstes vorgedrehtes Bild, auch negativ und über eine Periode hinaus", () => {
  const per = TAU / 4, n = 8;
  assert.equal(drehIndex(0, per, n), 0);
  assert.equal(drehIndex(per / 8, per, n), 1);
  assert.equal(drehIndex(per * 0.99, per, n), 0);          // fast eine Periode = wieder Bild 0
  assert.equal(drehIndex(-per / 8, per, n), 7);
  assert.equal(drehIndex(per * 5 + per / 4, per, n), 2);
  for (let r = -20; r < 20; r += 0.013) { const i = drehIndex(r, per, n); assert.ok(i >= 0 && i < n && Number.isInteger(i)); }
});

test("größter Winkelfehler = halber Schritt (Stern 4-zackig: 5,6°, Funke: 11,25°)", () => {
  for (const [kind, [n, per]] of Object.entries(DREH)) {
    let maxF = 0;
    for (let r = 0; r < TAU * 2; r += 0.001) {
      const i = drehIndex(r, per, n), a = i * per / n;
      let d = Math.abs(((r - a) % per + per) % per); d = Math.min(d, per - d);
      maxF = Math.max(maxF, d);
    }
    assert.ok(maxF <= per / n / 2 + 1e-3, kind + ": " + (maxF * 180 / Math.PI).toFixed(2) + "°");
  }
});

test("vorgedrehtes Quadrat fasst das Sprite in jedem Winkel", () => {
  const { d, faktor } = drehMasse(32, 8, 26);              // Funke 4:1
  assert.ok(Math.abs(d - 26 * Math.hypot(1, 0.25)) < 1e-9);
  assert.ok(faktor > 1 && faktor < 1.1);
  const q = drehMasse(32, 32, 16); assert.ok(Math.abs(q.faktor - Math.SQRT2) < 1e-9);
  for (let a = 0; a < TAU; a += 0.1) {                    // Ecken des gedrehten 16×16-Sprites liegen im Quadrat der Seite d
    for (const [x, y] of [[8, 8], [-8, 8]]) { const rx = x * Math.cos(a) - y * Math.sin(a); assert.ok(Math.abs(rx) <= q.d / 2 + 1e-9); }
  }
});

test("Sortierung nach Bild: gleiche Bilder hintereinander, alle Partikel genau einmal", () => {
  const n = 700, kennung = new Float64Array(1024), ord = new Uint16Array(1024);
  for (let i = 0; i < n; i++) kennung[i] = (i * 7919) % 13;
  const o = sortiereNachBild(ord, kennung, n);
  assert.equal(o.length, n);
  assert.equal(new Set(o).size, n);
  let wechsel = 0; for (let j = 1; j < n; j++) { assert.ok(kennung[o[j]] >= kennung[o[j - 1]]); if (kennung[o[j]] !== kennung[o[j - 1]]) wechsel++; }
  assert.equal(wechsel, 12);
});
