/* vorlage.js — v14: reine Regeln der Vorlagen-Mechaniken (VORLAGEN.md), ohne Grafik/DOM, in Node getestet (MIT).
   Werte kommen aus der Parametergruppe VORLAGE (config.js); jede Funktion nimmt sie als letzten Parameter (Tests). */
import { VORLAGE, CAP } from "./config.js";

const ri = (rnd, a, b) => Math.floor(a + rnd() * (b - a + 1));

// =====================================================================
// E1: Bedarfs-Beute und Upgrade-Zähler
// =====================================================================
/** Wunsch-Platz: was dem Kobold gerade am meisten fehlt. z = { hp, maxHp, ammo, potions } */
export function wunschVon(z, V = VORLAGE) {
  const f = z.hp / Math.max(1, z.maxHp);
  if (f <= V.heilerAb) return "firefly";
  if (f <= V.herzAb) return "heart";
  if (z.ammo < V.blasenUnter) return "ammo";
  if (z.potions <= 0) return "potion";
  return "coin";
}
/** nutzlos = würde beim Aufheben nur zu Gold (Trank bei vollem Rucksack, Herz bei vollem ❤️, Pilz bei voller ✨-Leiste) */
export function nutzlos(kind, z) {
  return (kind === "potion" && z.potions >= CAP.potions) || (kind === "heart" && z.hp >= z.maxHp) || (kind === "mushroom" && z.spec >= 1);
}
/** Herz-Faktor: bei wenig ❤️ fallen Herzen öfter */
export const herzFaktor = (z, V = VORLAGE) => V.bedarf && z.hp / Math.max(1, z.maxHp) <= V.herzX2Ab ? V.herzX2 : 1;
/** mit Bedarfs-Beute fällt nichts Nutzloses mehr — stattdessen eine Münze */
export const nuetzlich = (list, z, V = VORLAGE) => V.bedarf ? list.map(k => nutzlos(k, z) ? "coin" : k) : list;

/** Beute eines normalen Gegners (auch Elite; nicht Boss, Mini-Boss, Handlanger). Liste von Arten, "up" = Upgrade
    (⚔️/🪄/💎 wählt der Aufrufer). Ohne bedarf/beutetakt genau die v13-Wahrscheinlichkeiten. */
export function beuteKill(elite, z, rnd, V = VORLAGE) {
  const out = [];
  const nC = elite ? ri(rnd, 4, 7) : ri(rnd, 1, 3);
  for (let k = 0; k < nC; k++) out.push("coin");
  if (rnd() < (elite ? 0.35 : 0.08)) out.push("potion");
  if (rnd() < (elite ? 0.4 : 0.1) * herzFaktor(z, V)) out.push("heart");
  if (rnd() < (elite ? 0.3 : 0.06)) out.push("mushroom");
  if (rnd() < (elite ? 0.25 : V.beutetakt ? V.upKill : 0.07)) out.push("up");
  if (V.bedarf && rnd() < (elite ? V.wunschElite : V.wunsch)) out.push(wunschVon(z, V));
  return nuetzlich(out, z, V);
}
/** Truhen-Beute. sicher = Upgrade-Zähler hat die Schwelle erreicht → sicher ein Upgrade */
export function beuteTruhe(z, rnd, sicher = false, V = VORLAGE) {
  const out = [];
  const n = ri(rnd, 8, 14);
  for (let k = 0; k < n; k++) out.push("coin");
  if (rnd() < 0.45) out.push("potion");
  if (rnd() < Math.min(1, 0.4 * herzFaktor(z, V))) out.push("heart");
  if (rnd() < 0.35 || (V.beutetakt && sicher)) out.push("up");
  if (rnd() < 0.5) out.push("mushroom");
  return nuetzlich(out, z, V);
}
/** Topf-Beute */
export function beuteTopf(z, rnd, V = VORLAGE) {
  const out = [];
  const n = rnd() < 0.6 ? ri(rnd, 1, 3) : 0;
  for (let k = 0; k < n; k++) out.push("coin");
  if (rnd() < 0.1) out.push("mushroom");
  else if (rnd() < Math.min(1, 0.12 * herzFaktor(z, V))) out.push("heart");
  return nuetzlich(out, z, V);
}
/** Upgrade-Zähler: neue Ebene betreten */
export const taktEbene = (m, V = VORLAGE) => V.beutetakt ? m + V.taktEbene : m;
/** Upgrade-Zähler: n Upgrades aus Beute gefunden */
export const taktFund = (m, n = 1, V = VORLAGE) => V.beutetakt ? Math.max(V.taktMin, m - V.taktFund * n) : m;
/** ist die nächste Truhe ein sicheres Upgrade? */
export const taktSicher = (m, V = VORLAGE) => V.beutetakt && m >= V.taktSicher;

// =====================================================================
// E2: XP-Kurve und Aufhol-Bonus
// =====================================================================
/** v13-Kurve: Start 10, dann ×1,4 + 4 (exponentiell) */
export function xpAlt(L) { let n = 10; for (let i = 1; i < L; i++) n = Math.floor(n * 1.4) + 4; return n; }
/** XP-Bedarf von Level L zu L+1 */
export const xpBedarf = (L, V = VORLAGE) => V.xpkurve === "alt" ? xpAlt(L) : Math.round(V.xpA + V.xpB * L + V.xpC * L * L);
/** nächster Bedarf nach einem Level-Aufstieg (alt: wie v13 aus dem bisherigen Bedarf) */
export const xpNaechster = (lvlNeu, xpNextAlt, V = VORLAGE) => V.xpkurve === "alt" ? Math.floor(xpNextAlt * 1.4) + 4 : xpBedarf(lvlNeu, V);
/** Aufhol-Faktor: Soll-Level = Ebene + 1; wer drunter liegt, bekommt mehr, wer drüber liegt, weniger (nie unter 60 %) */
export function aufholFaktor(lvl, ebene, V = VORLAGE) {
  if (!V.aufhol || ebene <= 0) return 1;
  return Math.min(V.aufholMax, Math.max(V.aufholMin, 1 + (ebene + 1 - lvl) * V.aufhol));
}
/** Grund-XP eines Gegners (ohne Elite/Faktor): a + b·Tiefe (+ c·Level nur ohne Aufhol-Bonus, wie v13) */
export const gegnerXp = (def, d, lvl, V = VORLAGE) => Math.round(def.xp[0] + def.xp[1] * d + (V.aufhol ? 0 : def.xp[2] * lvl));
/** XP, die ein Sieg wirklich bringt */
export const xpGewinn = (xp, lvl, ebene, V = VORLAGE) => xp > 0 ? Math.max(1, Math.round(xp * aufholFaktor(lvl, ebene, V))) : 0;
/** Spielstand: Bedarf aus dem Level neu rechnen, Fortschritt im Level anteilig übernehmen (Level bleibt, nichts geht verloren) */
export function xpMigrieren(lvl, xp, xpNextAlt, V = VORLAGE) {
  if (V.xpkurve === "alt") return { xp, xpNext: xpNextAlt };
  const n = xpBedarf(lvl, V);
  if (xpNextAlt === n) return { xp: Math.min(xp, n - 1), xpNext: n };
  const f = Math.min(1, Math.max(0, xp / Math.max(1, xpNextAlt)));
  return { xp: Math.min(n - 1, Math.floor(f * n)), xpNext: n };
}

