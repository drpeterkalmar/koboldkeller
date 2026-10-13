// v14 E4: Abkürzungs-Schleifen + Truhen abseits (Vorlage E) — 200 Seeds × 20 Ebenen, v13-Weg (Regler 0) gegen v14.
// Aufruf: node --test tests/node/   ·   Messwerte: node tests/node/dungeon.test.mjs --zeigen
import { test } from "node:test";
import assert from "node:assert/strict";
import { VORLAGE, ARENA, diffOf, biomeOf, bossKindOf } from "../../src/config.js";
import { buildDungeon, wegInfo } from "../../src/world.js";

const ZEIGEN = process.argv.includes("--zeigen");
const ALT = { ...VORLAGE, schleifen: 0, truhen: "zufall" }, NEU = { ...VORLAGE };
const SEEDS = 200;

function erreichbar(m, from) {
  const { w, h, block } = m, d = new Int32Array(w * h).fill(-1), q = new Int32Array(w * h); let qh = 0, qt = 0;
  const s = Math.floor(from.y) * w + Math.floor(from.x); d[s] = 0; q[qt++] = s;
  while (qh < qt) { const c = q[qh++], x = c % w, y = (c / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ni = ny * w + nx; if (nx < 0 || ny < 0 || nx >= w || ny >= h || d[ni] >= 0 || block[ni]) continue; d[ni] = d[c] + 1; q[qt++] = ni; } }
  return d;
}
const bau = (seed, d, opt) => buildDungeon(seed, d, biomeOf(d), diffOf(d).room, bossKindOf(d) ? ARENA[d] : null, opt);

function messen() {
  const r = { n: 0, mitSchleife: 0, schleifen: 0, spart: [], ratio: [], inBand: 0, truhen: { alt: 0, altAb: 0, neu: 0, neuAb: 0, neuEbeneAb: 0, ebenen: 0 }, unerreichbar: 0, ms: [], arenaGaenge: { alt: 0, neu: 0 }, stairsOk: 0 };
  for (let s = 0; s < SEEDS; s++) for (let d = 1; d <= 20; d++) {
    const seed = 9000 + s * 131;
    const A = bau(seed, d, ALT);
    const t0 = performance.now(); const B = bau(seed, d, NEU); r.ms.push(performance.now() - t0);
    r.n++;
    const ok = B.schleifen.filter(l => l.spart >= NEU.schleifen);
    if (ok.length) r.mitSchleife++;
    if (B.schleifen.length) r.mitIrgend = (r.mitIrgend || 0) + 1;
    r.schleifen += B.schleifen.length; r.spart.push(...B.schleifen.map(l => l.spart));
    const wA = wegInfo(A.map, A.rooms, A.entry, A.stairs), wB = B.weg;
    const q = wB.laenge / wA.laenge; r.ratio.push(q); if (Math.abs(q - 1) <= 0.15) r.inBand++;
    const dB = erreichbar(B.map, B.entry);
    if (dB[Math.floor(B.stairs.y) * B.map.w + Math.floor(B.stairs.x)] >= 0 || B.isBoss) r.stairsOk++;
    const raum = (L, c) => L.map.room[Math.floor(c.y) * L.map.w + Math.floor(c.x)];
    for (const c of A.props.filter(p => p.kind === "chest")) { r.truhen.alt++; if (!wA.raeume.includes(raum(A, c))) r.truhen.altAb++; }
    const chB = B.props.filter(p => p.kind === "chest");
    let ab = 0;
    for (const c of chB) { r.truhen.neu++; if (!wB.raeume.includes(raum(B, c))) { r.truhen.neuAb++; ab++; } if (dB[Math.floor(c.y) * B.map.w + Math.floor(c.x)] < 0) r.unerreichbar++; }
    if (chB.length) { r.truhen.ebenen++; if (ab) r.truhen.neuEbeneAb++; }
    if (A.arena) { r.arenaGaenge.alt += A.arena.gates.length; r.arenaGaenge.neu += B.arena.gates.length; }
  }
  return r;
}
let M = null;
const m = () => M || (M = messen());

test("Regler aus (?schleifen=0&truhen=zufall): Ebene Kachel für Kachel wie v13 (gleicher Zufall, 2 Zufalls-Gänge)", () => {
  // v13-Generator ohne opt-Parameter = Standardwerte {} → alter Weg
  for (const d of [1, 4, 7, 10, 20]) {
    const a = bau(4711, d, ALT), b = buildDungeon(4711, d, biomeOf(d), diffOf(d).room, bossKindOf(d) ? ARENA[d] : null);
    assert.deepEqual([...a.map.block], [...b.map.block]);
    assert.deepEqual(a.props.map(p => p.kind + p.x + "," + p.y), b.props.map(p => p.kind + p.x + "," + p.y));
    assert.equal(a.schleifen.length, 0);
  }
});

test("Messgröße 9: Schleifen sparen ≥ 20 Kacheln, nie in die Arena; Weg Eingang → Treppe ± 15 % zu v13", () => {
  const r = m();
  const mittel = a => a.reduce((x, y) => x + y, 0) / a.length;
  const sorted = r.ratio.slice().sort((a, b) => a - b);
  if (ZEIGEN) console.log(`M9 Ebenen mit ≥ 1 Schleife (≥ 20 Kacheln Ersparnis): ${(r.mitSchleife / r.n * 100).toFixed(1)} % (mit Rückfall ≥ 10: ${(r.mitIrgend / r.n * 100).toFixed(1)} %) · Schleifen je Ebene ${(r.schleifen / r.n).toFixed(2)} · Ersparnis Median ${r.spart.slice().sort((a, b) => a - b)[r.spart.length >> 1]} Kacheln · ` +
    `Weg Eingang→Treppe neu/alt: Mittel ${mittel(r.ratio).toFixed(3)}, Median ${sorted[sorted.length >> 1].toFixed(3)}, im Band ±15 %: ${(r.inBand / r.n * 100).toFixed(1)} % · Arena-Eingänge alt ${r.arenaGaenge.alt} / neu ${r.arenaGaenge.neu} · Bauzeit Mittel ${mittel(r.ms).toFixed(2)} ms, max ${Math.max(...r.ms).toFixed(1)} ms`);
  assert.ok(r.spart.every(s => s >= NEU.schleifenNot));
  assert.ok(r.mitSchleife / r.n >= 0.9, "Ebenen mit Schleife ≥ 20 " + r.mitSchleife / r.n);
  assert.ok(r.mitIrgend / r.n >= 0.98, "Ebenen mit Schleife (Rückfall ≥ 10) " + r.mitIrgend / r.n);
  assert.ok(Math.abs(mittel(r.ratio) - 1) <= 0.15, "Weg im Mittel ±15 %: " + mittel(r.ratio));
  assert.equal(r.stairsOk, r.n);
  assert.ok(r.arenaGaenge.neu <= r.arenaGaenge.alt, "keine zusätzlichen Arena-Eingänge");
});

test("Messgröße 10: ≥ 60 % der Truhen abseits des Wegs Eingang → Treppe, 100 % erreichbar", () => {
  const r = m(), t = r.truhen;
  if (ZEIGEN) console.log(`M10 Truhen abseits (Raum nicht auf dem kürzesten Weg): v13 ${(t.altAb / t.alt * 100).toFixed(1)} % (${t.alt}) → v14 ${(t.neuAb / t.neu * 100).toFixed(1)} % (${t.neu}) · Ebenen mit ≥ 1 Truhe abseits ${(t.neuEbeneAb / t.ebenen * 100).toFixed(1)} % · unerreichbar ${r.unerreichbar}`);
  assert.ok(t.neuAb / t.neu >= 0.6);
  assert.equal(r.unerreichbar, 0);
});

test("Weg-Info: Raumwechsel 0 auf dem Weg, > 0 abseits", () => {
  const L = bau(123, 3, NEU);
  for (const i of L.weg.raeume) assert.equal(L.weg.raumWechsel[i], 0);
  assert.ok(L.weg.raumWechsel.some(k => k > 0));
  assert.ok(L.weg.laenge > 10);
});

// ---------------------------------------------------------------------
// E5c: Geheimräume hinter einer Wackelwand
// ---------------------------------------------------------------------
import { GEHEIM, geheimChance } from "../../src/config.js";
test("Geheimraum: Chance wächst ab Ebene 5 bis 50 % (Ebene 20), immer mit Truhe, erst nach dem Öffnen erreichbar, nie an Eingang/Treppe/Arena", () => {
  assert.equal(geheimChance(4), 0); assert.ok(geheimChance(5) > 0); assert.equal(geheimChance(20), GEHEIM.max);
  let n = 0, mit = 0, erwartet = 0;
  for (let s = 0; s < 150; s++) for (let d = 1; d <= 20; d++) {
    const opt = { ...NEU, geheim: geheimChance(d), geheimGroesse: GEHEIM.groesse };
    const L = bau(5000 + s * 37, d, opt);
    n++; erwartet += geheimChance(d);
    if (!L.geheim) { assert.ok(!L.props.some(p => p.kind === "wackel")); continue; }
    mit++;
    const g = L.geheim, m = L.map, S = m.w, w = L.props.find(p => p.kind === "wackel"), ch = L.props.find(p => p.kind === "chest" && p.geheim);
    assert.ok(d >= GEHEIM.ab && w && ch);
    assert.equal(m.block[g.door.y * S + g.door.x], 1);
    const r = L.rooms[g.room];
    assert.ok(!r.entry && !r.stairs && !r.arena);
    const vor = erreichbar(m, L.entry);
    assert.equal(vor[Math.floor(ch.y) * S + Math.floor(ch.x)], -1, "vor dem Öffnen unerreichbar");
    m.block[g.door.y * S + g.door.x] = 0;
    const nach = erreichbar(m, L.entry);
    assert.ok(nach[Math.floor(ch.y) * S + Math.floor(ch.x)] > 0, "nach dem Öffnen erreichbar");
    assert.ok(nach[Math.floor(L.stairs.y) * S + Math.floor(L.stairs.x)] >= 0 || L.isBoss);
  }
  if (ZEIGEN) console.log(`E5c Geheimräume: ${mit}/${n} Ebenen (${(mit / n * 100).toFixed(1)} %, erwartet ${(erwartet / n * 100).toFixed(1)} %)`);
  assert.ok(Math.abs(mit - erwartet) / erwartet < 0.15);
  // ohne Geheimraum-Chance: Karte genau wie vorher (Zufall wird nicht angefasst)
  const a = bau(4711, 12, { ...NEU, geheim: 0 }), b = bau(4711, 12, NEU);
  assert.deepEqual([...a.map.block], [...b.map.block]); assert.equal(a.props.length, b.props.length);
});
