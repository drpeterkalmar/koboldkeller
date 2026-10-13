// v14: Spielstand-Migration Datei v3 (v13) → v4 — ein alter Spielstand der Kinder verliert nichts (Messgröße 13).
// Aufruf: node --test tests/node/
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitize } from "../../src/save.js";
import { SAVE_V } from "../../src/config.js";

// typischer v13-Spielstand (Datei v3) auf Level 15, ein Stück ins Level hinein
const V13 = { v: 3, name: "Glitzerkeks", species: "drache", look: { species: "drache", skin: "#6fd8c4", outfit: "#ffb35e", eye: "#1f3b5e", hair: "#3aa893", style: "ohne", earsV: 0, acc: "stern", myth: "einhorn" },
  lvl: 15, xp: 1234, xpNext: 2143, maxHp: 20, hp: 33, atk: 11, projN: 5, magic: 4, gold: 1830, potions: 4, ammo: 31, spec: 0.67,
  sk: { kraft: 6, leben: 8, tempo: 4, blasen: 6, magnet: 4 }, skPts: 0, hats: ["pilz", "diadem", "schleife"], hat: "diadem",
  deepest: 16, depth: 14, mega: false, tut: true, runSecs: 1234, won: false, seed: 123456, migrated: false, kills: 512,
  bossDone: [2, 4, 6, 8, 10, 12, 14, 16], capNote: 0, giftNote: 0 };

test("Datei v3 → v4: Level, Talente, Ausrüstung, Fortschritt bleiben; xp < xpNext; Upgrade-Zähler startet bei 0", () => {
  assert.equal(SAVE_V, 4);
  const s = sanitize(structuredClone(V13));
  assert.equal(s.v, 4);
  assert.equal(s.lvl, 15);
  assert.deepEqual(s.sk, V13.sk); assert.equal(s.skPts, 0);
  for (const k of ["name", "species", "atk", "projN", "magic", "gold", "potions", "ammo", "spec", "hat", "deepest", "depth", "mega", "tut", "seed", "kills", "maxHp", "hp"])
    assert.deepEqual(s[k], V13[k], k);
  assert.deepEqual(s.hats, V13.hats); assert.deepEqual(s.bossDone, V13.bossDone); assert.deepEqual(s.look, V13.look);
  assert.equal(s.xpNext, 535);
  assert.ok(s.xp < s.xpNext && s.xp >= 0);
  assert.ok(Math.abs(s.xp / s.xpNext - V13.xp / V13.xpNext) < 0.01, "Fortschritt im Level anteilig: " + s.xp + "/" + s.xpNext);
  assert.equal(s.upM, 0);
  // noch einmal laden (v4 → v4): nichts ändert sich
  const s2 = sanitize(structuredClone(s));
  assert.deepEqual(s2, { ...s, capNote: 0, giftNote: 0 });
});

test("ganz alter Stand (v1) und neuer Spieler: Bedarf aus der neuen Kurve", () => {
  const n = sanitize({ v: 4, name: "Neu", lvl: 1, xp: 0, xpNext: 10 });
  assert.equal(n.xpNext, 17); assert.equal(n.xp, 0);
  const o = sanitize({ v: 1, name: "Alt", lvl: 7, xp: 30, xpNext: 60 });
  assert.equal(o.lvl, 7); assert.equal(o.xpNext, 10 + 35 + 98); assert.ok(o.xp < o.xpNext);
});
