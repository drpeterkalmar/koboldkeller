// v14: reine Regeln der Vorlagen-Mechaniken (src/vorlage.js) — Monte-Carlo mit festem Seed, Messgrößen aus VORLAGEN.md.
// Aufruf: node --test tests/node/   ·   Messwerte zusätzlich als Tabelle: node tests/node/vorlage.test.mjs --zeigen
import { test } from "node:test";
import assert from "node:assert/strict";
import { VORLAGE, CAP, diffOf, POOLS, bossKindOf } from "../../src/config.js";
import { mulberry32 } from "../../src/util.js";
import * as VL from "../../src/vorlage.js";

const ZEIGEN = process.argv.includes("--zeigen");
const AUS = { ...VORLAGE, bedarf: false, beutetakt: false };       // v13-Verhalten (Regler 0)
const AN = { ...VORLAGE, bedarf: true, beutetakt: true };
const zeig = (...a) => { if (ZEIGEN) console.log(...a); };

// Zustände wie im Datenblatt: ❤️ voll / ≤ 50 % / ≤ 25 %, 🫧 leer, 🧪 voll
const Z = {
  voll: { hp: 40, maxHp: 40, ammo: 20, potions: 3, spec: 0.33 },
  halb: { hp: 18, maxHp: 40, ammo: 20, potions: 3, spec: 0.33 },
  wenig: { hp: 9, maxHp: 40, ammo: 20, potions: 3, spec: 0.33 },
  blasenLeer: { hp: 40, maxHp: 40, ammo: 0, potions: 3, spec: 0.33 },
  traenkeVoll: { hp: 40, maxHp: 40, ammo: 20, potions: CAP.potions, spec: 1 },
};
const HEIL = new Set(["heart", "firefly"]);
function mc(z, V, n = 10000, elite = false, seed = 4242) {
  const rnd = mulberry32(seed), cnt = {}; let items = 0, heil = 0, heilMind1 = 0, nutzlos = 0;
  for (let i = 0; i < n; i++) {
    const l = VL.beuteKill(elite, z, rnd, V);
    let h = 0;
    for (const k of l) { cnt[k] = (cnt[k] || 0) + 1; if (k === "coin") continue; items++; if (HEIL.has(k)) h++; if (VL.nutzlos(k, z)) nutzlos++; }
    heil += h; if (h) heilMind1++;
  }
  return { cnt, heilJeKill: heil / n, heilMind1: heilMind1 / n, nutzlosAnteil: items ? nutzlos / items : 0, items };
}

test("Wunsch-Platz: Rangfolge ❤️ ≤ 25 % → Heiler, ≤ 50 % → Herz, 🫧 < 6 → Blasen, 🧪 leer → Trank, sonst Münze", () => {
  assert.equal(VL.wunschVon({ hp: 10, maxHp: 40, ammo: 0, potions: 0 }), "firefly");
  assert.equal(VL.wunschVon({ hp: 1, maxHp: 6, ammo: 20, potions: 5 }), "firefly");
  assert.equal(VL.wunschVon({ hp: 20, maxHp: 40, ammo: 0, potions: 0 }), "heart");
  assert.equal(VL.wunschVon({ hp: 21, maxHp: 40, ammo: 5, potions: 0 }), "ammo");
  assert.equal(VL.wunschVon({ hp: 40, maxHp: 40, ammo: 6, potions: 0 }), "potion");
  assert.equal(VL.wunschVon({ hp: 40, maxHp: 40, ammo: 6, potions: 1 }), "coin");
});

test("Regler aus (?bedarf=0&beutetakt=0): genau die v13-Wahrscheinlichkeiten, kein Wunsch-Platz", () => {
  const r = mc(Z.wenig, AUS, 40000);
  const p = k => (r.cnt[k] || 0) / 40000;
  assert.ok(Math.abs(p("potion") - 0.08) < 0.006, "Trank " + p("potion"));
  assert.ok(Math.abs(p("heart") - 0.10) < 0.006, "Herz " + p("heart"));
  assert.ok(Math.abs(p("mushroom") - 0.06) < 0.006, "Pilz " + p("mushroom"));
  assert.ok(Math.abs(p("up") - 0.07) < 0.006, "Upgrade " + p("up"));
  assert.equal(r.cnt.firefly || 0, 0); assert.equal(r.cnt.ammo || 0, 0);
  // auch Truhe/Topf unverändert: volle Sachen fallen weiter (werden beim Aufheben Gold)
  const rnd = mulberry32(7); let pot = 0;
  for (let i = 0; i < 20000; i++) pot += VL.beuteTruhe(Z.traenkeVoll, rnd, false, AUS).filter(k => k === "potion").length;
  assert.ok(Math.abs(pot / 20000 - 0.45) < 0.015, "Truhen-Trank bei 5/5 " + pot / 20000);
});

test("Messgröße 4: Heil-Beute je Kill bei ❤️ ≤ 25 % ≥ 25 % (vorher 10 %)", () => {
  const vor = mc(Z.wenig, AUS), nach = mc(Z.wenig, AN);
  zeig(`M4 ❤️ ≤ 25 %: Heil-Sachen je Kill vorher ${(vor.heilJeKill * 100).toFixed(1)} % → nachher ${(nach.heilJeKill * 100).toFixed(1)} % (mind. eine: ${(vor.heilMind1 * 100).toFixed(1)} → ${(nach.heilMind1 * 100).toFixed(1)} %), davon Glühwürmchen ${((nach.cnt.firefly || 0) / 100).toFixed(1)} %`);
  assert.ok(vor.heilJeKill > 0.09 && vor.heilJeKill < 0.11);
  assert.ok(nach.heilJeKill >= 0.25, "nachher " + nach.heilJeKill);
  assert.ok((nach.cnt.firefly || 0) / 10000 > 0.05, "Glühwürmchen-Heiler ≈ 6 %");
  // ❤️ ≤ 50 %: Wunsch-Platz = Herz (keine Verdopplung)
  const halb = mc(Z.halb, AN);
  assert.ok(halb.heilJeKill > 0.14 && halb.heilJeKill < 0.18, "❤️ ≤ 50 %: " + halb.heilJeKill);
  assert.equal(halb.cnt.firefly || 0, 0);
});

test("Wunsch-Platz bei leerer 🫧: +4 Blasen in ≈ 6 % (Elite 20 %) der Kills", () => {
  const r = mc(Z.blasenLeer, AN), e = mc(Z.blasenLeer, AN, 10000, true);
  zeig(`🫧 leer: Blasen-Nachschub normal ${((r.cnt.ammo || 0) / 100).toFixed(1)} %, Elite ${((e.cnt.ammo || 0) / 100).toFixed(1)} %`);
  assert.ok(Math.abs((r.cnt.ammo || 0) / 10000 - 0.06) < 0.008);
  assert.ok(Math.abs((e.cnt.ammo || 0) / 10000 - 0.2) < 0.015);
});

test("Messgröße 5: nutzlose Drops (Trank bei 5/5, Herz bei vollem ❤️, Pilz bei voller Leiste) ≤ 2 %", () => {
  for (const [nm, z] of [["🧪 voll + ❤️ voll + ✨ voll", Z.traenkeVoll], ["❤️ voll", Z.voll]]) {
    const vor = mc(z, AUS), nach = mc(z, AN);
    const eV = mc(z, AUS, 10000, true), eN = mc(z, AN, 10000, true);
    zeig(`M5 ${nm}: nutzlos vorher ${(vor.nutzlosAnteil * 100).toFixed(1)} % (Elite ${(eV.nutzlosAnteil * 100).toFixed(1)} %) → nachher ${(nach.nutzlosAnteil * 100).toFixed(1)} % (Elite ${(eN.nutzlosAnteil * 100).toFixed(1)} %)`);
    assert.ok(vor.nutzlosAnteil > 0.3, "vorher fiel viel Nutzloses: " + vor.nutzlosAnteil);
    assert.ok(nach.nutzlosAnteil <= 0.02 && eN.nutzlosAnteil <= 0.02, nm + ": " + nach.nutzlosAnteil);
  }
  // Truhe + Topf ebenso
  const rnd = mulberry32(11); let n = 0, nutz = 0;
  for (let i = 0; i < 5000; i++) for (const k of [...VL.beuteTruhe(Z.traenkeVoll, rnd, false, AN), ...VL.beuteTopf(Z.traenkeVoll, rnd, AN)]) if (k !== "coin") { n++; if (VL.nutzlos(k, Z.traenkeVoll)) nutz++; }
  assert.equal(nutz, 0, "Truhe/Topf: " + nutz + " von " + n);
});

test("Upgrade-Zähler: +30 je Ebene, −50 je Fund (nicht unter 0), ab 60 sichere Truhe; Regler aus = kein Zähler", () => {
  let m = 0;
  m = VL.taktEbene(m, AN); assert.equal(m, 30); assert.equal(VL.taktSicher(m, AN), false);
  m = VL.taktEbene(m, AN); assert.equal(m, 60); assert.equal(VL.taktSicher(m, AN), true);
  m = VL.taktFund(m, 1, AN); assert.equal(m, 10);
  m = VL.taktFund(m, 3, AN); assert.equal(m, 0);
  assert.equal(VL.taktEbene(0, AUS), 0); assert.equal(VL.taktSicher(999, AUS), false);
  const rnd = mulberry32(3); let up = 0;
  for (let i = 0; i < 2000; i++) if (VL.beuteTruhe(Z.voll, rnd, true, AN).includes("up")) up++;
  assert.equal(up, 2000, "sichere Truhe hat immer ein Upgrade");
  const r = mc(Z.voll, AN, 40000);
  assert.ok(Math.abs((r.cnt.up || 0) / 40000 - 0.05) < 0.005, "Zufalls-Upgrade je Kill 5 %");
});

/** Ebene für Ebene: Kills (normal, Elite, geteilte Schleime), Boss, 2 Truhen in zufälliger Reihenfolge → Upgrades aus Beute */
export function simUpgrades(V, seeds = 200, nLv = 20) {
  const per = [], gaps = []; let lueckeMax = 0, sicherN = 0;
  for (let s = 0; s < seeds; s++) {
    const rnd = mulberry32(1000 + s);
    let m = 0, luecke = 0;
    for (let d = 1; d <= nLv; d++) {
      m = VL.taktEbene(m, V);
      const D = diffOf(d), ev = [];
      for (let i = 0; i < D.n; i++) {
        const el = rnd() < D.elite;
        ev.push(el ? "elite" : "kill");
        const pool = d <= 1 ? [["bat", 40], ["slime", 35], ["wichtel", 25]] : POOLS[Math.ceil(d / 4)], sum = pool.reduce((a, x) => a + x[1], 0);
        const slime = (pool.find(x => x[0] === "slime") || [0, 0])[1] / sum;
        if (D.split && rnd() < slime) ev.push("kill", "kill");
      }
      ev.push("chest", "chest");
      for (let i = ev.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [ev[i], ev[j]] = [ev[j], ev[i]]; }
      let ups = 0;
      const bk = bossKindOf(d);
      if (bk === "main" || d === 20) ups++; else if (bk === "mini" && rnd() < 0.5) ups++;
      for (let i = 0; i < ups; i++) m = VL.taktFund(m, 1, V);
      for (const e of ev) {
        let l;
        if (e === "chest") { const si = VL.taktSicher(m, V); l = VL.beuteTruhe(Z.voll, rnd, si, V); if (si && l.includes("up")) sicherN++; }
        else l = VL.beuteKill(e === "elite", Z.voll, rnd, V);
        const n = l.filter(k => k === "up").length;
        ups += n; for (let i = 0; i < n; i++) m = VL.taktFund(m, 1, V);
      }
      per.push(ups);
      luecke = ups ? 0 : luecke + 1; lueckeMax = Math.max(lueckeMax, luecke);
      gaps.push(luecke);
    }
  }
  return { mittel: per.reduce((a, b) => a + b, 0) / per.length, lueckeMax, ohne: per.filter(x => !x).length / per.length, sicherN };
}

test("Messgröße 6: Upgrades aus Beute je Ebene ~ gleich, längste Lücke ≤ 2 Ebenen (200 Seeds × 20 Ebenen)", () => {
  const vor = simUpgrades(AUS), nach = simUpgrades(AN);
  zeig(`M6 Upgrades aus Beute (Gegner + Truhen + Bosse) je Ebene: vorher ${vor.mittel.toFixed(2)} (Ebenen ohne: ${(vor.ohne * 100).toFixed(1)} %, längste Lücke ${vor.lueckeMax}) → nachher ${nach.mittel.toFixed(2)} (ohne: ${(nach.ohne * 100).toFixed(1)} %, längste Lücke ${nach.lueckeMax}, sichere Truhen ${nach.sicherN})`);
  assert.ok(nach.lueckeMax <= 2, "Lücke " + nach.lueckeMax);
  assert.ok(Math.abs(nach.mittel - vor.mittel) / vor.mittel < 0.15, "Summe bleibt etwa gleich: " + vor.mittel + " → " + nach.mittel);
});

if (ZEIGEN) process.on("exit", () => { });

// ---------------------------------------------------------------------
// E2: XP-Kurve + Aufhol-Bonus
// ---------------------------------------------------------------------
import { ENEMIES, biomeOf } from "../../src/config.js";
const ALT = { ...VORLAGE, xpkurve: "alt", aufhol: 0 }, NEU = { ...VORLAGE, xpkurve: "quad", aufhol: 0.1 };
/** mittlere Grund-XP eines normalen Gegners auf Ebene d (Gewichte des Gegner-Pools, Elite-Anteil × 2,5) beim Level lvl */
function mittelXp(d, lvl, V, elite = true) {
  d = Math.max(1, Math.min(20, d));
  const pool = d <= 1 ? [["bat", 40], ["slime", 35], ["wichtel", 25]] : POOLS[biomeOf(d)], sum = pool.reduce((a, x) => a + x[1], 0);
  const xp = pool.reduce((a, [t, w]) => a + w / sum * VL.gegnerXp(ENEMIES[t], d, lvl, V), 0);
  return xp * (elite ? 1 + diffOf(d).elite * 1.5 : 1);
}
export function killsJeLevel(V) {
  const out = [];
  for (let L = 1; L <= 25; L++) {
    const d = L - 1;                                             // „gleich stark“: Ebene = Soll-Ebene für dieses Level (Soll-Level = Ebene + 1)
    const blatt = 4 + 2 * L;                                     // Datenblatt-Näherung „Gegner-XP ≈ 4 + 2·Lv“ (v13-Formel mit Level-Anteil)
    const real = VL.xpGewinn(mittelXp(d, L, V), L, Math.max(1, d), V);
    out.push({ L, bedarf: VL.xpBedarf(L, V), blatt: VL.xpBedarf(L, V) / blatt, real: VL.xpBedarf(L, V) / real });
  }
  return out;
}

test("E2 Kurve: Bedarf(L) = 10 + 5L + 2L² (Lv 5: 85, 10: 260, 15: 535, 20: 910); alt = v13 (65, 391, 2143, 11565)", () => {
  assert.deepEqual([5, 10, 15, 20].map(L => VL.xpBedarf(L, NEU)), [85, 260, 535, 910]);
  assert.deepEqual([1, 5, 10, 15, 20].map(L => VL.xpBedarf(L, ALT)), [10, 65, 391, 2143, 11565]);
  // Level-Aufstieg: alt rechnet wie v13 aus dem bisherigen Bedarf weiter
  assert.equal(VL.xpNaechster(6, 65, ALT), 95); assert.equal(VL.xpNaechster(6, 65, NEU), VL.xpBedarf(6, NEU));
});

test("Messgröße 1: Kills je Level (gleich starke Normalgegner) Lv 10: 9–13 · 15: 13–18 · 20: 17–24", () => {
  const vor = killsJeLevel(ALT), nach = killsJeLevel(NEU);
  zeig("M1 Kills je Level (Datenblatt-Näherung 4+2·Lv | echte Gegner-Pools inkl. Elite-Anteil, Aufhol-Faktor 1):");
  for (const L of [1, 5, 10, 14, 15, 16, 20, 25]) { const a = vor[L - 1], b = nach[L - 1]; zeig(`  Lv ${L}: Bedarf ${a.bedarf} → ${b.bedarf} · Näherung ${a.blatt.toFixed(1)} → ${b.blatt.toFixed(1)} · echt ${a.real.toFixed(1)} → ${b.real.toFixed(1)}`); }
  const r = L => nach[L - 1];
  assert.ok(r(10).blatt >= 9 && r(10).blatt <= 13 && r(15).blatt >= 13 && r(15).blatt <= 18 && r(20).blatt >= 17 && r(20).blatt <= 24);
  assert.ok(r(10).real >= 9 && r(10).real <= 13, "echt Lv 10 " + r(10).real);
  assert.ok(r(15).real >= 13 && r(15).real <= 18, "echt Lv 15 " + r(15).real);
  assert.ok(r(20).real >= 13 && r(20).real <= 24, "echt Lv 20 " + r(20).real);
  // kein Wachstum mehr wie vorher (×16 von Lv 10 → 20): höchstens × 2,5
  assert.ok(r(20).real / r(10).real < 2.5 && vor[19].real / vor[9].real > 10);
});

test("Aufhol-Bonus: Soll-Level = Ebene + 1, ±10 % je Level, gekappt 0,6 … 1,5; aus = 1 und Level-Anteil zurück", () => {
  assert.equal(VL.aufholFaktor(11, 10, NEU), 1);
  assert.ok(Math.abs(VL.aufholFaktor(8, 10, NEU) - 1.3) < 1e-9);
  assert.equal(VL.aufholFaktor(1, 20, NEU), 1.5);
  assert.equal(VL.aufholFaktor(30, 5, NEU), 0.6);
  assert.equal(VL.aufholFaktor(30, 0, NEU), 1);                // Stadt
  assert.equal(VL.aufholFaktor(1, 20, ALT), 1);
  assert.equal(VL.gegnerXp(ENEMIES.bat, 10, 15, ALT), 4 + 10 + 15);
  assert.equal(VL.gegnerXp(ENEMIES.bat, 10, 15, NEU), 4 + 10);
  assert.equal(VL.xpGewinn(14, 15, 10, NEU), Math.round(14 * 0.6));
  assert.equal(VL.xpGewinn(0, 1, 5, NEU), 0);
});

test("Migration: Bedarf neu aus dem Level, Fortschritt anteilig, xp < xpNext; alt = unverändert", () => {
  assert.deepEqual(VL.xpMigrieren(15, 1000, 2143, NEU), { xp: Math.floor(1000 / 2143 * 535), xpNext: 535 });
  assert.deepEqual(VL.xpMigrieren(15, 3000, 2143, NEU), { xp: 534, xpNext: 535 });          // kaputter Stand: xp ≥ Bedarf → knapp darunter
  assert.deepEqual(VL.xpMigrieren(4, 7, 59, NEU), { xp: VL.xpMigrieren(4, 7, 59, NEU).xp, xpNext: 62 });
  assert.deepEqual(VL.xpMigrieren(15, 200, 535, NEU), { xp: 200, xpNext: 535 });            // schon v4: bleibt gleich
  assert.deepEqual(VL.xpMigrieren(15, 1000, 2143, ALT), { xp: 1000, xpNext: 2143 });
});

