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
