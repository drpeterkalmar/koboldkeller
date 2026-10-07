/* config.js — Konstanten, Spezies, Biome, Gegner, Schwierigkeitskurve, Ebenen, Bosse, Aussehen (MIT) */
import { mixHex } from "./util.js";
export const VERSION = (typeof window !== "undefined" && window.KK_VER) || 1;
export const TITLE = "🍄 Koboldkeller 2";

export const SAVE_KEY = "koboldkeller2_save";
export const OLD_SAVE_KEY = "koboldkeller_save_v1";
export const HALL_KEY = "koboldkeller_hall_v1";
export const SETTINGS_KEY = "koboldkeller2_settings";

export const MAX_DEPTH = 20;
export const MEGA = { speed: 2, dmg: 10 };
export const SAVE_V = 3;                 // v1 = Koboldkeller 2 bis v3, v2 = v4 (Munition, Talente, Spezial, Aussehen), v3 = v5 (besiegte Bosse)

// ---------- v4: Obergrenzen, Munition, Magnet, Heim-Portal ----------
// hp = höchstens so viele Lebenspunkte (Max-❤️), potions = Tränke, ammo = Grund-Munitionsplatz (+ Talent 🫧)
export const CAP = { hp: 60, potions: 5, ammoBase: 20, ammoMax: 60 };
// Munition: 1 Schuss = 1 Munition (egal wie viele Blasen der Zauberstab wirft); Gewinn pro besiegtem Gegner
export const AMMO = { start: 15, kill: 2, elite: 4, boss: 12, king: 20, mini: 8, minion: 1, dummy: 1, revive: 8 };
export const CAP_GOLD = { potion: 10, heart: 2, ammo: 1, hp: 8, shroom: 5 };   // Gold für Überzähliges
// v10 (Peter 30.09.): Oma Pilzhut gibt beim Vorbeigehen einen Tipp als Sprechblase — beim Näherkommen auf < near Kacheln,
// wieder scharf erst nach > far Kacheln Abstand, höchstens alle cd s (Spielzeit); Blase steht je nach Textlänge show..showMax s.
export const OMA = { near: 3.0, far: 4.5, cd: 20, show: 5, showMax: 9 };
export const MAGNET = { coin: 3.5, item: 2.5 };                 // Kacheln (+ Talent 🧲)
export const HOME_PORTAL_HIDE_S = 20;                           // 🏠-Portal nach Betreten einer Ebene so lange weg
export const SPECIAL = { perShroom: 1 / 3, radius: 5.5 };       // 3 Glitzerpilze = volle Spezial-Leiste

// ---------- v4: Talente (Skillpunkte) ----------
export const SKILL_MAX = 10, SKILL_PER_LEVEL = 2;
export const SKILLS = [
  { id: "kraft", icon: "💪", name: "Kraft", per: 0.5, what: "+0,5 Schwert-Schaden" },
  { id: "leben", icon: "❤️", name: "Leben", per: 2, what: "+2 Max-❤️" },
  { id: "tempo", icon: "👟", name: "Tempo", per: 0.05, what: "+5 % schneller laufen" },
  { id: "blasen", icon: "🫧", name: "Blasen", per: 4, what: "+4 Munition-Platz · +10 % Blasen-Kraft" },
  { id: "magnet", icon: "🧲", name: "Magnet", per: 0.35, what: "Münzen & Sachen fliegen von weiter her" },
];

// Spieler-Grundwerte (aus v20 übernommen / kinderfreundlich)
// v8: Grundtempo 3,6 → 4,7 Kacheln/s (+31 %, Peter: „derzeit krachen die Finger“); Lauf-Animation + Kamera skalieren mit (game.js/render.js)
export const PLAYER = {
  hp: 6, speed: 4.7, speed0: 3.6, atk: 4, atkCd: 0.6, atkRadius: 3.0,   // v6: Schlag-Pause 0,25 → 0,6 s (Peter: „wie eine Kreissäge“)
  bubbleCd: 0.7, dashCd: 0.9, dashTime: 0.3, dashDist: 4.4, dashInvul: 0.5,
  hurtInvul: 1.0, potions: 3,
};

// 8 Kobold-Looks (2 Reihen à 4 am Handy)
export const SPECIES = [
  { id: "kobold", name: "Kobold", skin: "#86dc5c", outfit: "#ff6f91", hair: "#6b4430", ears: "pointy", eye: "#3b2a6b", style: "locke", earsN: ["Spitz", "Lang"] },
  { id: "baer", name: "Bär", skin: "#cf9460", outfit: "#5f86e0", hair: "#8a5a33", ears: "round", eye: "#3a2413", style: "wuschel", earsN: ["Rund", "Klein"] },
  { id: "hase", name: "Hase", skin: "#f6eee0", outfit: "#ffcf4a", hair: "#ffc2d4", ears: "bunny", eye: "#6b2f5a", style: "pony", earsN: ["Hoch", "Schlapp"] },
  { id: "tintenfisch", name: "Tintenfisch", skin: "#b98ff0", outfit: "#4fc3f7", hair: "#8a5fc0", ears: "octo", eye: "#2c1b5e", style: "ringel", earsN: ["Punkte", "Glatt"] },
  { id: "panda", name: "Roter Panda", skin: "#ea7a4c", outfit: "#86dc5c", hair: "#7a3b22", ears: "panda", eye: "#3a1a10", style: "ohne", earsN: ["Groß", "Klein"] },
  { id: "katze", name: "Katze", skin: "#f3aa62", outfit: "#ff7fb0", hair: "#b06a2c", ears: "cat", eye: "#2e5a2a", style: "ohne", earsN: ["Spitz", "Rund"] },
  { id: "fuchs", name: "Fuchs", skin: "#ff9a42", outfit: "#9b7bff", hair: "#c75f1a", ears: "fox", eye: "#4a2a10", style: "ohne", earsN: ["Groß", "Klein"] },
  { id: "drache", name: "Drache", skin: "#6fd8c4", outfit: "#ffb35e", hair: "#3aa893", ears: "dragon", eye: "#1f3b5e", style: "ohne", earsN: ["Hörner", "Kringel"] },
];
// ---------- v4: Charakter-Editor ----------
export const HAIR_STYLES = [
  { id: "wuschel", name: "Wuschel" }, { id: "locke", name: "Locke" }, { id: "pony", name: "Pony" }, { id: "zoepfe", name: "Zöpfchen" },
  { id: "dutt", name: "Dutt" }, { id: "irokese", name: "Irokese" }, { id: "schopf", name: "Blatt-Schopf" }, { id: "seite", name: "Scheitel" },
  { id: "ringel", name: "Ringel" }, { id: "ohne", name: "Ohne" },
];
export const ACCESSORIES = [
  { id: "none", name: "Nichts", emoji: "🙂" }, { id: "brille", name: "Brille", emoji: "👓" }, { id: "blume", name: "Blume", emoji: "🌸" },
  { id: "schleife", name: "Schleife", emoji: "🎀" }, { id: "sommersprossen", name: "Sommer\u00adsprossen", emoji: "✨" }, { id: "stern", name: "Sternspange", emoji: "⭐" },
];
export const PAL = {
  fur: ["#86dc5c", "#cf9460", "#f6eee0", "#b98ff0", "#ea7a4c", "#f3aa62", "#ff9a42", "#6fd8c4", "#9a7058", "#ffc6dc", "#9fc8ff", "#fff0a0", "#c8c8d4", "#6a5a7a"],
  outfit: ["#ff6f91", "#5f86e0", "#ffcf4a", "#4fc3f7", "#86dc5c", "#ff7fb0", "#9b7bff", "#ffb35e", "#e8434f", "#40c0a0", "#f4f4f4", "#46467a"],
  eye: ["#3b2a6b", "#3a2413", "#6b2f5a", "#2c1b5e", "#2e5a2a", "#1f3b5e", "#0a7a8a", "#a0306a", "#c07a10"],
  hair: ["#6b4430", "#8a5a33", "#ffc2d4", "#8a5fc0", "#7a3b22", "#c75f1a", "#3aa893", "#2a1a2a", "#ffe070", "#ff6fae", "#6fb8ff", "#f4f4f4"],
};
/** Aussehen normalisieren (Spielstand/Editor → Zeichen-Objekt für art.js) */
export function makeLook(o = {}) {
  const sp = SPECIES.find(x => x.id === o.species) || SPECIES[0];
  const col = (v, list, d) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d;
  const L = {
    species: sp.id, skin: col(o.skin, PAL.fur, sp.skin), outfit: col(o.outfit, PAL.outfit, sp.outfit), eye: col(o.eye, PAL.eye, sp.eye),
    hair: col(o.hair, PAL.hair, sp.hair), style: HAIR_STYLES.some(h => h.id === o.style) ? o.style : sp.style,
    earsV: o.earsV === 1 ? 1 : 0, acc: ACCESSORIES.some(a => a.id === o.acc) ? o.acc : "none", ears: sp.ears,
    myth: MYTH_BY_ID[o.myth] ? o.myth : "", mhat: !!o.mhat && !!MYTH_BY_ID[o.myth],   // v9: Kostüm (Sagenwesen) + „🎩 Hut statt Kopfteil“
  };
  // v9: Kostüm gehört in den Sprite-Schlüssel (Körper, Kopf, Porträts); ohne Kostüm bleibt der Schlüssel wie bis v8
  L.id = [L.species, L.skin, L.hair, L.eye, L.style, L.earsV, L.acc].join("|") + (L.myth ? "|" + L.myth + (L.mhat ? "+h" : "") : "");
  return L;
}
/** Spielstand-Look: myth/mhat nur, wenn gesetzt (alte Spielstände bleiben Feld für Feld gleich) */
export const lookSave = L => Object.assign({ species: L.species, skin: L.skin, outfit: L.outfit, eye: L.eye, hair: L.hair, style: L.style, earsV: L.earsV, acc: L.acc },
  L.myth ? { myth: L.myth } : null, L.myth && L.mhat ? { mhat: true } : null);
export const OLD_SPECIES_MAP = { kobold: "kobold", baer: "baer", hase: "hase", tintenfisch: "tintenfisch", panda: "panda", katze: "katze" };

// Zufallsnamen (v7: ≥ 150). Regeln (geprüft in check.mjs V18): höchstens 12 Zeichen (Namensfeld), keine Duplikate,
// nichts Beleidigendes/Zweideutiges, keine echten Vornamen (neue Namen sind nur Tiere, Naschzeug, Natur, Glitzer).
export const NAME_MAX = 12;
export const NAMES = ["Knuffel", "Wichtelwilly", "Glitzer-Emma", "Pupsi", "Krümel", "Flauschi", "Kobbi",
  "Zuckerkäfer", "Mopsi", "Wackel", "Brummi", "Schmusebacke", "Pünktchen", "Knorpf", "Tapsi", "Blubber",
  "Sternchen", "Muffin", "Kicher-Kiki", "Plüschi", "Funkel", "Wuschel", "Hüpfi", "Zimtschnecke", "Glöckchen",
  "Keksi", "Schnuffel", "Mausi-Maus", "Purzel", "Bommel",
  // v7
  "Knuddel", "Schnuppi", "Wuselchen", "Flitzi", "Piepsi", "Hoppel", "Kuschel", "Schnuckel", "Murmel", "Zwirbel",
  "Fussel", "Knöpfchen", "Tröpfchen", "Flöckchen", "Stupsi", "Tüpfel", "Kringel", "Klecks", "Schnipsel", "Brösel",
  "Mümmel", "Pilzchen", "Pilzhütchen", "Tautropfen", "Funkelstein", "Glitzerkeks", "Wolkenhüpfer", "Mondkeks", "Honigtopf", "Honigbär",
  "Himbeerchen", "Erdbeerchen", "Blaubeerchen", "Kirschkern", "Apfelmus", "Pfannkuchen", "Waffel", "Kakaobohne", "Vanille", "Zimtstern",
  "Lebkuchen", "Marzipan", "Karamell", "Gummibärchen", "Bonbon", "Törtchen", "Plätzchen", "Schoki", "Schokokeks", "Knusper",
  "Streusel", "Puderzucker", "Zuckerwatte", "Kekskrümel", "Butterkeks", "Pudding", "Knödel", "Buchtel", "Spätzchen", "Mäuschen",
  "Igelchen", "Eichhörnchen", "Maulwurf", "Glühwürmchen", "Marienkäfer", "Hummelchen", "Brummel", "Summsi", "Räupchen", "Flauschohr",
  "Schlappohr", "Kuschelbär", "Tätzchen", "Pfötchen", "Samtpfote", "Schnurri", "Maunzi", "Wuffi", "Quietschi", "Quaki",
  "Purzelbaum", "Kicherfee", "Glitzerfee", "Moosfee", "Zauberpilz", "Waldwichtel", "Wurzelchen", "Knirps", "Wichtelchen", "Sternenstaub",
  "Blinki", "Glimmer", "Regenbogen", "Wölkchen", "Mondschein", "Morgentau", "Schneeflocke", "Nordlicht", "Kometchen", "Pummelchen",
  "Mampfi", "Naschkatze", "Leckermaul", "Zottel", "Strubbel", "Wuschelkopf", "Lockenkopf", "Wirbelwind", "Flummi", "Hopsi",
  "Grashüpfer", "Klimper", "Bimmel", "Kulleraugen", "Knopfauge", "Stupsnase", "Naseweis", "Tollpatsch", "Schlafmütze", "Frechdachs",
  "Kichererbse", "Radieschen", "Möhrchen", "Kürbischen", "Glückspilz", "Kleeblatt", "Pusteblume", "Butterblume", "Löwenzahn", "Veilchen",
  "Rosinchen", "Haselnuss", "Kastanie", "Tannenzapfen", "Kiesel", "Seestern", "Perlchen", "Knallerbse", "Kreisel", "Murmeltier",
  "Pinguin", "Eulchen", "Zaunkönig", "Libelle", "Grille", "Dachsi", "Otterchen"];
// Namens-Baukasten: Vorsilbe × Nachsilbe (z. B. „Knuddel“ + „keks“ = „Knuddelkeks“), nur Kombinationen ≤ 12 Zeichen
export const NAME_PRE = ["Knuddel", "Glitzer", "Kuschel", "Funkel", "Zucker", "Moos", "Wusel", "Honig", "Pilz", "Flausch",
  "Kicher", "Wolken", "Zimt", "Schoko", "Mond", "Tau", "Hüpf", "Plüsch", "Stern", "Keks"];
export const NAME_POST = ["keks", "bär", "maus", "pilz", "stern", "flocke", "fee", "knopf", "tatze", "ohr",
  "wicht", "krümel", "nase", "bohne", "tropfen", "purzel", "bommel", "hase", "zwerg", "herz"];
export const NAME_KIT = NAME_PRE.flatMap(a => NAME_POST.filter(b => !a.toLowerCase().startsWith(b)).map(b => a + b)).filter(n => n.length <= NAME_MAX && !NAMES.includes(n));
/** Zufallsname: 60 % aus der Liste, 40 % aus dem Baukasten (r = Zufallsquelle 0…1) */
export function randomName(r = Math.random) {
  const list = r() < 0.6 ? NAMES : NAME_KIT;
  return list[Math.floor(r() * list.length)];
}

// ---------- v7: Würfel-Look — Harmonie-Tabelle (Regeln statt reinem Zufall) ----------
// fur/hair: passende Fell- und Haarfarben je Tierart; bunt = bewusst bunte Haarfarben (mit buntChance statt der natürlichen).
// Kontrast (Farbabstand „redmean“, 0…765): Fell↔Outfit ≥ furOutfit, Fell↔Haar ≥ furHair (außer Frisur „ohne“), Haar↔Outfit ≥ hairOutfit.
// Dunkles Fell (Helligkeit < darkFur): nur helle Augenfarben (brightEyes) — dunkle Augen hätten dort keinen Rand mehr.
export const LOOK_RULES = {
  fur: {
    kobold: ["#86dc5c", "#6fd8c4", "#b98ff0", "#9fc8ff", "#c8c8d4", "#ffc6dc"],
    baer: ["#cf9460", "#9a7058", "#f6eee0", "#c8c8d4", "#f3aa62", "#6a5a7a"],
    hase: ["#f6eee0", "#c8c8d4", "#ffc6dc", "#fff0a0", "#9a7058", "#cf9460"],
    tintenfisch: ["#b98ff0", "#ffc6dc", "#9fc8ff", "#6fd8c4", "#ea7a4c", "#6a5a7a"],
    panda: ["#ea7a4c", "#ff9a42", "#cf9460", "#9a7058"],
    katze: ["#f3aa62", "#c8c8d4", "#f6eee0", "#9a7058", "#6a5a7a", "#fff0a0", "#ff9a42"],
    fuchs: ["#ff9a42", "#ea7a4c", "#f3aa62", "#c8c8d4", "#f6eee0"],
    drache: ["#6fd8c4", "#86dc5c", "#b98ff0", "#9fc8ff", "#ffc6dc", "#fff0a0", "#ea7a4c"],
  },
  hair: {
    kobold: ["#6b4430", "#8a5a33", "#3aa893", "#2a1a2a", "#ffe070", "#7a3b22"],
    baer: ["#8a5a33", "#6b4430", "#7a3b22", "#2a1a2a", "#f4f4f4"],
    hase: ["#ffc2d4", "#f4f4f4", "#ffe070", "#8a5a33"],
    tintenfisch: ["#8a5fc0", "#ff6fae", "#6fb8ff", "#ffc2d4", "#3aa893"],
    panda: ["#7a3b22", "#c75f1a", "#6b4430", "#2a1a2a"],
    katze: ["#c75f1a", "#8a5a33", "#6b4430", "#2a1a2a", "#f4f4f4", "#ffe070"],
    fuchs: ["#c75f1a", "#7a3b22", "#f4f4f4", "#6b4430"],
    drache: ["#3aa893", "#8a5fc0", "#6fb8ff", "#ff6fae", "#ffe070"],
  },
  bunt: ["#ffc2d4", "#8a5fc0", "#ff6fae", "#6fb8ff", "#ffe070", "#3aa893", "#f4f4f4"], buntChance: 0.3,
  furOutfit: 130, furHair: 90, hairOutfit: 60, darkFur: 0.25, brightEyes: ["#0a7a8a", "#a0306a", "#c07a10"],
  accChance: 0.5,                           // Extra (Brille, Blume …) in höchstens 50 % der Würfe (Vorgabe ≤ 60 %)
  // v9: Kostüme — in ≈ 30 % der Würfe ein freigeschaltetes Kostüm. Die Outfit-Farbe wird am Kostüm nur als Akzent (Gürtel/Knopf)
  // gezeigt, wenn sie sich vom Kostüm abhebt (Farbabstand ≥ mythAccent), sonst nimmt das Kostüm seinen eigenen Akzent.
  mythChance: 0.3, mythAccent: 110,
};
const _rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export function colDist(a, b) {
  const [r1, g1, b1] = _rgb(a), [r2, g2, b2] = _rgb(b), rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}
export function colLum(h) {
  const [r, g, b] = _rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Vollständiger Schlüssel eines Looks (inkl. Outfit) — „nicht zweimal derselbe" */
export const lookKey = L => [L.species, L.skin, L.outfit, L.hair, L.eye, L.style, L.earsV, L.acc, L.myth || ""].join("|");   // v9: inkl. Kostüm
/** Harmonie-Prüfung eines gewürfelten Looks: [] = hübsch, sonst Liste der verletzten Regeln */
export function lookHarmony(L) {
  const R = LOOK_RULES, bad = [];
  if (!(R.fur[L.species] || []).includes(L.skin)) bad.push("fell-art");
  if (!(R.hair[L.species] || []).includes(L.hair) && !R.bunt.includes(L.hair)) bad.push("haar-art");
  if (colDist(L.skin, L.outfit) < R.furOutfit) bad.push("kontrast-fell-outfit");
  if (L.style !== "ohne" && colDist(L.skin, L.hair) < R.furHair) bad.push("kontrast-fell-haar");
  if (colDist(L.hair, L.outfit) < R.hairOutfit) bad.push("kontrast-haar-outfit");
  if (colLum(L.skin) < R.darkFur && !R.brightEyes.includes(L.eye)) bad.push("augen-dunkles-fell");
  if (!PAL.eye.includes(L.eye) || !PAL.outfit.includes(L.outfit)) bad.push("palette");
  if (L.myth && !MYTH_BY_ID[L.myth]) bad.push("kostuem-unbekannt");
  return bad;
}
/** Würfelt einen hübschen Look (Harmonie-Tabelle), nie direkt denselben wie prevKey. r = Zufallsquelle (?seed= → reproduzierbar)
 *  v9: myths = freigeschaltete Kostüme → in ≈ 30 % der Würfe kommt eines davon dazu (nie ein gesperrtes) */
export function rollLook(r = Math.random, prevKey = "", myths = []) {
  const R = LOOK_RULES, pk = (a) => a[Math.floor(r() * a.length)];
  let L = null;
  for (let n = 0; n < 60; n++) {
    const sp = pk(SPECIES).id, skin = pk(R.fur[sp]);
    const hair = r() < R.buntChance ? pk(R.bunt) : pk(R.hair[sp]);
    const style = pk(HAIR_STYLES).id;
    const eyes = colLum(skin) < R.darkFur ? R.brightEyes : PAL.eye;
    const outs = PAL.outfit.filter(o => colDist(skin, o) >= R.furOutfit && colDist(hair, o) >= R.hairOutfit);
    if (!outs.length) continue;
    const o = { species: sp, skin, hair, style, eye: pk(eyes), outfit: pk(outs), earsV: r() < 0.5 ? 0 : 1,
      acc: r() < R.accChance ? pk(ACCESSORIES.slice(1)).id : "none" };
    if (myths.length && r() < R.mythChance) o.myth = pk(myths);
    L = makeLook(o);
    if (!lookHarmony(L).length && lookKey(L) !== prevKey) break;
  }
  return lookSave(L);
}

// ---------- v7: Weg-Pfeil (nach Stillstand kurz in Richtung Ziel) — URL-Override z. B. ?arrowIdle=1&arrowShow=3 ----------
const _q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams("");
const _qn = (k, d) => { const v = parseFloat(_q.get(k)); return isFinite(v) && v >= 0 ? v : d; };
export const ARROW_IDLE = _qn("arrowIdle", 2.0);      // s ohne Bewegung/Eingabe, bis der Pfeil erscheint
export const ARROW = {
  idle: ARROW_IDLE, fadeIn: _qn("arrowFadeIn", 0.35), show: _qn("arrowShow", 2.0), fadeOut: _qn("arrowFadeOut", 0.45),
  repeat: _qn("arrowRepeat", 6),              // steht man danach weiter still: erneut nach so vielen s
  ahead: _qn("arrowAhead", 3.5),              // Wegpunkt so viele Kacheln voraus auf dem Pfad (nicht Luftlinie)
  r0: 0.62, r1: 1.5,                          // Pfeil liegt 0,62 … 1,5 Kacheln neben der Figur auf dem Boden
};
export const URLQ = _q;
// v13: Deko (Boden-/Wand-Details, Licht, Partikel, Rückmeldung) — A/B: ?deko=0 = Aussehen wie v12
export const DEKO = _q.get("deko") !== "0";
// v13: „Bewegung reduzieren“ des Geräts → weniger Wackeln, weniger Partikelregen
export const CALM = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Biome: Block à 4 Ebenen. amb = Umgebungslicht (0..1 pro Kanal)
export const BIOMES = [
  { id: "stadt", name: "Koboldstadt", amb: [1.0, 0.94, 0.86], void: "#20361f", mood: "day" },
  { id: "moos", name: "Moosgrotte", amb: [0.34, 0.40, 0.40],
    floor: ["#5d7f6a", "#557762", "#628a6f"], floorEdge: "#3f5a4a", top: "#6f9a5c", left: "#3d5f45", right: "#2f4b37", deco: "moss",
    void: "#0e1614", torch: "#ffb45e", dust: "#b6ff8a", slime: "#7be07a" },
  { id: "kristall", name: "Kristallhöhle", amb: [0.28, 0.28, 0.46],
    floor: ["#4f4f86", "#4a4a7e", "#57568f"], floorEdge: "#343462", top: "#7a78c0", left: "#3e3b78", right: "#2e2b60", deco: "crystal",
    void: "#0c0b1c", torch: "#8fe9ff", dust: "#bfefff", slime: "#6fc7ff" },
  { id: "zucker", name: "Zuckerkeller", amb: [0.44, 0.33, 0.44],
    floor: ["#b77fa0", "#ad7597", "#c08aa9"], floorEdge: "#7e4f6c", top: "#ffd1e6", left: "#c9669b", right: "#a64f80", deco: "candy",
    void: "#1d0e18", torch: "#ffc2e8", dust: "#ffe0f4", slime: "#ff8fd0" },
  { id: "frost", name: "Frostkeller", amb: [0.36, 0.43, 0.54],
    floor: ["#8fb6cf", "#86adc6", "#9bc0d8"], floorEdge: "#5f84a0", top: "#f4fbff", left: "#6d9cc0", right: "#557f9f", deco: "ice",
    void: "#0b1520", torch: "#bfe9ff", dust: "#ffffff", slime: "#a8e6ff" },
  { id: "glut", name: "Glutkeller", amb: [0.40, 0.25, 0.23],
    floor: ["#6a4a48", "#634442", "#735250"], floorEdge: "#44292a", top: "#a5584a", left: "#5a2f2c", right: "#462320", deco: "lava",
    void: "#160808", torch: "#ffa04a", dust: "#ffb060", slime: "#ff9a5a" },
];
export const biomeOf = depth => depth <= 0 ? 0 : Math.min(5, 1 + Math.floor((depth - 1) / 4));

// ---------- v4: Jede Ebene hat einen eigenen Namen + eine eigene Farbnuance ----------
// tint = Farbe, in die Boden/Wände/Nebel gemischt werden (k = Stärke), amb = Licht-Multiplikator (R,G,B),
// dust = Farbe der Schwebeteilchen, torch = Fackellicht. Die Welt bleibt erkennbar, jede Ebene fühlt sich anders an.
export const LEVELS = [null,
  { name: "Die Flüsternden Moosgärten", tint: "#7fd08a", k: 0.0, amb: [1, 1, 1], dust: "#b6ff8a", torch: "#ffb45e" },
  { name: "Das Tautropfen-Gewölbe", tint: "#5fb8c0", k: 0.3, amb: [0.9, 1.02, 1.14], dust: "#bff4ff", torch: "#9fe8ff" },
  { name: "Der Glühwürmchen-Hain", tint: "#d8c060", k: 0.26, amb: [1.12, 1.06, 0.84], dust: "#fff27a", torch: "#ffd060" },
  { name: "Moosbarts Wurzelthron", tint: "#5a8a3a", k: 0.32, amb: [0.92, 1.04, 0.86], dust: "#d0ff6a", torch: "#ffa04a" },
  { name: "Die Singenden Kristallgrotten", tint: "#8a7fe0", k: 0.0, amb: [1, 1, 1], dust: "#bfefff", torch: "#8fe9ff" },
  { name: "Der Mondsteinpfad", tint: "#b8c8e8", k: 0.34, amb: [1.06, 1.08, 1.12], dust: "#ffffff", torch: "#dfe8ff" },
  { name: "Das Regenbogen-Labyrinth", tint: "#d08ae0", k: 0.3, amb: [1.14, 0.96, 1.06], dust: "#ffc0f0", torch: "#ffb0e8" },
  { name: "Glitzerzahns Funkelsaal", tint: "#4a4ab0", k: 0.34, amb: [0.9, 0.92, 1.12], dust: "#ffe68a", torch: "#ffe08a" },
  { name: "Die Zuckerwatte-Wolkengänge", tint: "#ffb3d8", k: 0.0, amb: [1, 1, 1], dust: "#ffe0f4", torch: "#ffc2e8" },
  { name: "Der Bonbonbach", tint: "#7ad8c8", k: 0.34, amb: [0.9, 1.1, 1.08], dust: "#c0fff0", torch: "#a8fff0" },
  { name: "Das Lebkuchen-Gewölbe", tint: "#c08050", k: 0.36, amb: [1.14, 0.98, 0.8], dust: "#ffe0a0", torch: "#ffc070" },
  { name: "Zuckerschnutes Naschpalast", tint: "#a060c0", k: 0.3, amb: [1.04, 0.9, 1.12], dust: "#fff3a0", torch: "#ff9ae0" },
  { name: "Die Schneeflocken-Hallen", tint: "#e8f4ff", k: 0.0, amb: [1, 1, 1], dust: "#ffffff", torch: "#bfe9ff" },
  { name: "Der Nordlicht-Pfad", tint: "#60d0a8", k: 0.34, amb: [0.9, 1.12, 1.0], dust: "#a0ffd8", torch: "#8affc8" },
  { name: "Das Eiszapfen-Orchester", tint: "#b8a0e8", k: 0.3, amb: [1.04, 0.96, 1.12], dust: "#e8d8ff", torch: "#d8c0ff" },
  { name: "Frostnases Glitzergletscher", tint: "#50a8e0", k: 0.34, amb: [0.88, 1.0, 1.18], dust: "#dff6ff", torch: "#8fe0ff" },
  { name: "Die Glimmenden Glutgärten", tint: "#e08a4a", k: 0.0, amb: [1, 1, 1], dust: "#ffb060", torch: "#ffa04a" },
  { name: "Der Funkenfluss", tint: "#ffb040", k: 0.3, amb: [1.12, 1.04, 0.84], dust: "#ffe070", torch: "#ffc050" },
  { name: "Das Drachenschlaf-Gewölbe", tint: "#9a4a8a", k: 0.32, amb: [1.04, 0.86, 1.08], dust: "#ff9ad0", torch: "#ff8ac0" },
  { name: "Der Thronsaal des Kellerkönigs", tint: "#c02a2a", k: 0.3, amb: [1.14, 0.84, 0.82], dust: "#ffd060", torch: "#ff7a3a" },
];
export const levelName = d => d <= 0 ? "Koboldstadt" : (LEVELS[Math.min(MAX_DEPTH, d)] || LEVELS[1]).name;
const _lvCache = {};
/** Farbpalette der Ebene: Welt-Palette, in die Farbe der Ebene gemischt (gecacht, key für Sprite-Caches) */
export function levelBiome(depth) {
  const b = biomeOf(depth), B = BIOMES[b];
  if (depth <= 0) return B;
  if (_lvCache[depth]) return _lvCache[depth];
  const V = LEVELS[depth], k = V.k, m = c => mixHex(c, V.tint, k);
  const out = {
    ...B, key: "d" + depth, depth,
    floor: B.floor.map(m), floorEdge: m(B.floorEdge), top: m(B.top), left: m(B.left), right: m(B.right),
    void: mixHex(B.void, V.tint, k * 0.25), torch: V.torch, dust: V.dust, slime: mixHex(B.slime, V.tint, k * 0.5),
    amb: B.amb.map((a, i) => Math.min(0.62, a * V.amb[i])), tint: V.tint,
  };
  return (_lvCache[depth] = out);
}

// ---------- v4: Schwierigkeitskurve (Tiefe 1 … 20) ----------
// Jede Ebene merklich schwerer. Spalten (Index = Tiefe):
//  n     Anzahl normaler Gegner          hp   Leben-Faktor          dmg  Grundschaden pro Treffer
//  spd   Tempo-Faktor                    cd   Angriffspause-Faktor  elite Chance auf Elite-Gegner (2,2× Leben, +1 Schaden, Krone)
//  traps Pieks-Platten (Fallen)          room kleinste/größte Raumgröße (engere Räume)
//  wall  v8: Wand-Schützen (schießen hin und wieder quer durch den Gang; MEGASCHWER +1)
//  Neue Angriffsmuster ab Tiefe: 6 Schleime teilen sich · 10 Irrlichter/Flämmchen schießen 3er-Fächer ·
//  13 Gespenstchen blinzeln hinter dich · 15 Kristallkäfer stürmen zweimal
// MEGASCHWER kommt obendrauf (Gegner 2× Tempo, 10× Schaden). Tiefe 1–2 bleiben „zahm" (Einstieg).
const DT = {
  n:     [0, 7, 8, 9, 7, 10, 11, 12, 9, 12, 13, 14, 10, 14, 15, 16, 11, 16, 17, 18, 12],
  hp:    [1, 1.0, 1.06, 1.14, 1.2, 1.3, 1.4, 1.5, 1.55, 1.7, 1.8, 1.9, 2.0, 2.15, 2.3, 2.45, 2.55, 2.7, 2.85, 3.0, 3.1],
  dmg:   [1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7],
  spd:   [1, 0.94, 0.98, 1.0, 1.02, 1.05, 1.07, 1.09, 1.1, 1.12, 1.14, 1.16, 1.17, 1.19, 1.21, 1.23, 1.24, 1.26, 1.28, 1.3, 1.3],
  cd:    [1, 1.3, 1.22, 1.12, 1.1, 1.05, 1.0, 0.98, 0.96, 0.94, 0.92, 0.9, 0.9, 0.88, 0.86, 0.84, 0.84, 0.82, 0.8, 0.78, 0.78],
  elite: [0, 0, 0, 0.03, 0.04, 0.06, 0.08, 0.1, 0.1, 0.12, 0.14, 0.16, 0.16, 0.18, 0.2, 0.22, 0.22, 0.24, 0.26, 0.28, 0.3],
  traps: [0, 0, 0, 0, 0, 2, 3, 4, 2, 4, 5, 6, 3, 5, 6, 7, 4, 6, 7, 8, 4],
  wall:  [0, 0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 4],   // v8: Wand-Schützen („hin und wieder“)
  rmin:  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  rmax:  [10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7],
};
// v5: boss = "main" (Hauptboss 4/8/12/16/20) · "mini" (Mini-Boss 2/6/10/14/18, jede 2. Ebene hat damit einen Boss) · null
export const bossKindOf = d => d > 0 && d <= MAX_DEPTH && d % 2 === 0 ? (d % 4 === 0 ? "main" : "mini") : null;
export const DIFF = Array.from({ length: MAX_DEPTH + 1 }, (_, d) => d === 0 ? null : {
  n: DT.n[d], hp: DT.hp[d], dmg: DT.dmg[d], spd: DT.spd[d], cd: DT.cd[d], elite: DT.elite[d], traps: DT.traps[d], wall: DT.wall[d], room: [DT.rmin[d], DT.rmax[d]],
  split: d >= 6, fan: d >= 10, blink: d >= 13, double: d >= 15, tame: d <= 2, boss: bossKindOf(d),
});
export const diffOf = d => DIFF[Math.max(1, Math.min(MAX_DEPTH, d | 0))];

// ---------- v4: Bosse — eigene Signatur-Angriffe je Welt, 3 Phasen (ab 66 % / 33 % neue Muster, Wut-Phase) ----------
// hp = Grund + proLevel·Spielerlevel · dmg = Schaden pro Treffer · sig = Signatur-Angriffe (Phase 1 / ab Phase 2)
// minions = Handlanger der Welt (Typ, Gewicht) — erscheinen in Wellen während des Kampfes (v5)
export const BOSSES = [null,
  { name: "Moosbart", epi: "Hüter der Moosgärten", hp: [260, 12], dmg: 2, speed: 1.35, sig: ["spores", "vines"], acc: "bart", aura: "#9aff6a", arena: "leaf", minions: [["slime", 2], ["wichtel", 2], ["bat", 1]] },
  { name: "Glitzerzahn", epi: "Herr der Funkelkristalle", hp: [480, 16], dmg: 3, speed: 1.4, sig: ["crystals", "prism"], acc: "zahn", aura: "#8fe9ff", arena: "crystal", minions: [["wisp", 2], ["kaefer", 2], ["bat", 1]] },
  { name: "Zuckerschnute", epi: "Königin der Naschereien", hp: [700, 20], dmg: 4, speed: 1.45, sig: ["candy", "rush"], acc: "schnute", aura: "#ff9ae0", arena: "candy", minions: [["pilzling", 2], ["slime", 2], ["wichtel", 1]] },
  { name: "Frostnase", epi: "Wächter des Gletschers", hp: [950, 24], dmg: 5, speed: 1.4, sig: ["icicles", "snowball"], acc: "frostnase", aura: "#bfe9ff", arena: "snow", minions: [["geist", 2], ["kaefer", 1], ["bat", 2]] },
  { name: "Kellerkönig", epi: "Herrscher des Koboldkellers", hp: [1500, 30], dmg: 7, speed: 1.25, sig: ["fireRing", "meteors", "flameCross"], acc: "none", aura: "#ff5a3a", arena: "ember", minions: [["flamme", 3], ["geist", 1], ["wichtel", 1]] },
];
export const BOSS_PHASES = [0.66, 0.33];
// v8: Bosse etwas mehr Leben (Peter: „Bossen etwas mehr Hitpoints geben“) — gilt einheitlich für Hauptbosse, Mini-Bosse und den
// Kellerkönig (boss.js initBoss/initMini). Fängt das schnellere Laufen (v8) mit ab. Phasen-Schwellen bleiben prozentual.
// Hinweis: ENEMIES.boss/mini/king.hp unten wirken NICHT — initBoss() überschreibt Leben mit BOSSES/MINIS.hp × BOSS_HP_MUL.
export const BOSS_HP_MUL = 1.3;

// ---------- v5: Mini-Bosse (Ebene 2/6/10/14/18) — jeder ein anderes Wesen, 2 Phasen (ab 50 % wild) ----------
// Stärke zwischen Elite-Gegner und Hauptboss: Leben ≈ 35–50 % des nächsten Hauptbosses, Schaden = Hauptboss der Welt − 1.
// hp = Grund + proLevel·Spielerlevel · sig = [Angriff Phase 1, ab Phase 2 dazu] · scale = Zeichengröße (Hauptboss-Kobold 1,9 ≈ doppelt so hoch)
export const MINIS = {
  2: { id: "schlabbo", name: "Schlabbo", epi: "der Riesen-Moosschleim", hp: [90, 8], dmg: 1, speed: 1.15, sig: ["glibber", "platsch"], aura: "#9aff6a", arena: "leaf", scale: 1.75, r: 0.75, col: "#7be07a", minions: [["slime", 2], ["bat", 1]] },
  6: { id: "funkelflatter", name: "Funkelflatter", epi: "die Kristall-Fledermaus", hp: [200, 11], dmg: 2, speed: 1.55, sig: ["echo", "schall"], aura: "#c8b8ff", arena: "crystal", scale: 1.6, r: 0.7, col: "#8a6ae0", fly: true, minions: [["bat", 2], ["wisp", 1]] },
  10: { id: "lutz", name: "Lolli-Lutz", epi: "der Zuckerpilz-Riese", hp: [330, 14], dmg: 3, speed: 1.2, sig: ["streusel", "brause"], aura: "#ff9ae0", arena: "candy", scale: 1.7, r: 0.75, col: "#ff6fae", minions: [["pilzling", 2], ["slime", 1]] },
  14: { id: "bibber", name: "Bibber", epi: "das Schneegespenst", hp: [470, 17], dmg: 4, speed: 1.35, sig: ["frostatem", "blinzel"], aura: "#bfe9ff", arena: "snow", scale: 1.7, r: 0.72, col: "#eaf6ff", fly: true, minions: [["geist", 1], ["bat", 1]] },
  18: { id: "gustav", name: "Glutpanzer Gustav", epi: "der Lava-Käfer", hp: [640, 21], dmg: 5, speed: 1.3, sig: ["lava", "horn"], aura: "#ff8a3a", arena: "ember", scale: 1.65, r: 0.8, col: "#d8502a", minions: [["flamme", 2], ["wichtel", 1]] },
};
export const MINI_PHASE = 0.5;

// ---------- v5: Boss-Arenen + Handlanger ----------
// Je Boss-Ebene: size = Kantenlänge der Arena in Kacheln (v4: 12 für alle, jetzt mit der Tiefe steigend), pillars = Säulen als Deckung (4 oder 8),
// wave = Sekunden zwischen Handlanger-Wellen je Boss-Phase, n = Handlanger pro Welle je Phase,
// cap = höchstens so viele Handlanger gleichzeitig (lebend + gerade erscheinend). Mini-Bosse: weniger, 2 Phasen.
//            Ebene  size pillars wave (Ph1, Ph2, Ph3)   n (Ph1, Ph2, Ph3)  cap
const AT = {
  2: [14, 4, [9, 7], [1, 2], 3],
  4: [16, 4, [8, 6.5, 5], [2, 2, 3], 5],
  6: [17, 4, [8.5, 6.5], [1, 2], 4],
  8: [18, 8, [7.5, 6, 5], [2, 3, 3], 6],
  10: [19, 8, [8, 6], [2, 2], 4],
  12: [20, 8, [7, 5.5, 4.5], [2, 3, 4], 7],
  14: [21, 8, [7.5, 6], [2, 3], 5],
  16: [22, 8, [6.5, 5, 4], [3, 3, 4], 8],
  18: [23, 8, [7, 5.5], [2, 3], 5],
  20: [24, 8, [6, 5, 4], [3, 4, 4], 9],
};
export const ARENA = Object.fromEntries(Object.entries(AT).map(([d, a]) => [d, { size: a[0], pillars: a[1], wave: a[2], n: a[3], cap: a[4] }]));
export const MINION_CAP = 9;                 // Performance-Deckel: nie mehr Handlanger gleichzeitig (auch MEGASCHWER)
export const MINION = { spawnT: 0.8, first: 3, hp: 0.75, xp: 1 / 3 };   // Spawn-Kreis 0,8 s vorher, erste Welle 3 s nach dem Intro
// v11: Boss-Auftritt (Sekunden je Abschnitt): Beben → Aufbruch → Herauswachsen → Landung; hole = Loch-Radius,
// crack = Risslänge (Kacheln), n = Anzahl Risse. Haupt-Boss ≈ 2,65 s, Mini ≈ 2,25 s, Kellerkönig ≈ 3,5 s.
export const RISE = {
  main: { quake: 0.7, burst: 0.3, grow: 1.25, land: 0.4, hole: 1.7, crack: 3.4, n: 8 },
  mini: { quake: 0.6, burst: 0.3, grow: 1.0, land: 0.35, hole: 1.8, crack: 3.0, n: 7 },
  king: { quake: 1.0, burst: 0.4, grow: 1.6, land: 0.5, hole: 2.5, crack: 5.0, n: 11 },
};

// ---------- v8: Wand-Schützen (Wandfallen) ----------
// Ein Steingesicht in der Wand bläht sich warn s lang auf (Glühen + Bodenlinie + Ton), dann fliegt EIN Geschoss geradeaus quer durch
// den Gang bis zur nächsten Wand (speed Kacheln/s). Danach Pause: Takt = period (± jit) s, erst wenn der Kobold näher als near ist.
// Schaden wie die Pieks-Platten (max(1, Ebenen-Schaden − 1)); 💨 Ausweichen macht unverwundbar.
// Fair: nicht im Eingangsraum (entry Kacheln Abstand), nicht in Boss-Arenen, Linien zweier Schützen ≥ gap Kacheln auseinander
// (nie derselbe Gang doppelt), Takt versetzt; Linienlänge len[0]…len[1] Kacheln.
export const WALLTRAP = { warn: 0.9, period: 4.8, jit: 0.9, speed: 5.2, near: 9, entry: 6, gap: 4, len: [3, 11], megaPlus: 1, r: 0.36 };
// Aussehen je Welt (Geschoss): Moos-Sporen, Kristallsplitter, Bonbonkugeln, Schneebälle, Glutkugeln
export const WALLTRAP_LOOK = [null,
  { id: "spore", name: "Moos-Sporen", col: "#b6ff8a", glow: "#9aff6a" },
  { id: "shard", name: "Kristallsplitter", col: "#9ff0ff", glow: "#8fe9ff" },
  { id: "candy", name: "Bonbonkugel", col: "#ff8fd0", glow: "#ff9ae0" },
  { id: "snow", name: "Schneeball", col: "#f8fcff", glow: "#bfe9ff" },
  { id: "ember", name: "Glutkugel", col: "#ffb060", glow: "#ff7a2a" },
];

// Gegner: hp/xp = a + b·Tiefe + c·Level
export const ENEMIES = {
  bat:     { name: "Fledermaus",   hp: [2, 0.5, 0.4], xp: [4, 1, 1], speed: 1.7, r: 0.32, fly: true },
  slime:   { name: "Schleim",      hp: [3, 1.1, 0.6], xp: [4, 1, 1], speed: 1.1, r: 0.36 },
  wichtel: { name: "Wichtel",      hp: [2, 0.9, 0.5], xp: [3, 1, 1], speed: 1.5, r: 0.32 },
  wisp:    { name: "Irrlicht",     hp: [4, 0.9, 0.5], xp: [6, 2, 1], speed: 1.3, r: 0.3, fly: true, ranged: true },
  kaefer:  { name: "Kristallkäfer", hp: [5, 1.0, 0.5], xp: [6, 2, 1], speed: 1.2, r: 0.38 },
  pilzling:{ name: "Pilzling",     hp: [4, 1.0, 0.5], xp: [5, 2, 1], speed: 1.2, r: 0.34 },
  geist:   { name: "Gespenstchen", hp: [3, 0.9, 0.5], xp: [6, 2, 1], speed: 1.4, r: 0.32, fly: true },
  flamme:  { name: "Flämmchen",    hp: [4, 1.0, 0.6], xp: [7, 2, 1], speed: 1.6, r: 0.3, ranged: true },
  boss:    { name: "Boss-Kobold",  hp: [18, 5, 3], xp: [30, 8, 5], speed: 1.4, r: 0.7 },
  mini:    { name: "Mini-Boss",    hp: [12, 3, 2], xp: [16, 4, 3], speed: 1.2, r: 0.75 },
  king:    { name: "Kellerkönig",  hp: [36, 10, 6], xp: [200, 0, 0], speed: 1.25, r: 1.2 },
  dummy:   { name: "Strohwichtel", hp: [6, 0, 0], xp: [0, 0, 0], speed: 0, r: 0.35 },
};
export const POOLS = [
  null,
  [["bat", 35], ["slime", 30], ["wichtel", 35]],
  [["bat", 20], ["slime", 18], ["wichtel", 20], ["wisp", 20], ["kaefer", 22]],
  [["pilzling", 30], ["slime", 25], ["wichtel", 20], ["wisp", 25]],
  [["geist", 30], ["bat", 22], ["slime", 20], ["kaefer", 28]],
  [["flamme", 35], ["geist", 20], ["wisp", 20], ["wichtel", 25]],
];
export const BOSS_NAMES = ["", "Moosbart", "Glitzerzahn", "Zuckerschnute", "Frostnase", "Kellerkönig"];
// Welt-Vorlage für Gegner-Tints, Töpfe usw. bleibt BIOMES; Ebenen-Palette = levelBiome(depth)

// Hüte: sichtbar am Kobold, jeder neue Hut gibt +2 Max-❤️
export const HATS = {
  pilz:    { name: "Pilzhut", emoji: "🍄" },
  diadem:  { name: "Kristalldiadem", emoji: "💎" },
  schleife:{ name: "Zuckerschleife", emoji: "🎀" },
  pudel:   { name: "Pudelmütze", emoji: "🧶" },
  krone:   { name: "Königskrone", emoji: "👑" },
  veteran: { name: "Ehrenmütze", emoji: "🎖️" },
};
export const BOSS_HAT = ["", "pilz", "diadem", "schleife", "pudel", "krone"];

// ---------- v9: Mythos-Kostüme (nur Optik, keine Kampfwerte) ----------
// tier: selten (Start) · episch (Weltbosse) · mythisch (Kellerkönig, MEGASCHWER-Sieg). unlock: "start" | Boss-Ebene (2 … 20) | "mega".
// col: main (Grundfarbe), dark (Schatten/Kontur), light (Bauch/Rand), acc (eigener Akzent), fx (Glanz-Farben).
// head: Kopfteil — hood* = Kapuze/Helm um das Gesicht (Ohren „tall“/„side“ schauen durch), sonst Hut-Typ oben auf dem Kopf.
// back: Rückenteil (eigene Ebene, bewegt sich: Flügel flattern, Umhang weht, Schwänze wedeln). body: Körper-Überzug. fx: Signatur-Partikel.
export const MYTH_TIERS = {
  selten: { name: "selten", col: "#7fc8ff", rank: 1 },
  episch: { name: "episch", col: "#c48cff", rank: 2 },
  mythisch: { name: "mythisch", col: "#ffd75e", rank: 3 },
};
export const MYTHS = [
  { id: "drache", name: "Drachenkind", emoji: "🐉", tier: "selten", unlock: "start",
    col: { main: "#6fcf6a", dark: "#2f7a3a", light: "#fff0a8", acc: "#ffb35e", fx: ["#ffb35e", "#fff38a"] }, head: "hoodDragon", back: "wingsBat+tailDragon", body: "scales", fx: "ember" },
  { id: "einhorn", name: "Einhorn", emoji: "🦄", tier: "selten", unlock: "start",
    col: { main: "#fdf8ff", dark: "#a88ad8", light: "#ffe8f6", acc: "#ffd75e", fx: ["#ff9ad0", "#8fe9ff", "#fff38a", "#b3ff9a"] }, head: "hoodUnicorn", back: "tailRainbow", body: "fluffy", fx: "rainbow" },
  { id: "zauberer", name: "Sternenzauberer", emoji: "🧙", tier: "selten", unlock: "start",
    col: { main: "#4f4fc4", dark: "#23236e", light: "#8a8aff", acc: "#ffe36e", fx: ["#fff38a", "#ffffff"] }, head: "hatWizard", back: "capeStars", body: "robe", fx: "stars" },
  { id: "fee", name: "Waldfee", emoji: "🧚", tier: "episch", unlock: 2,
    col: { main: "#8ee07a", dark: "#3f8a3a", light: "#d8ffc0", acc: "#ff9ad0", fx: ["#b6ff8a", "#ffc2e0", "#fff6a0"] }, head: "hatWreath", back: "wingsFairy", body: "leaf", fx: "fairy" },
  { id: "waldhueter", name: "Waldhüter", emoji: "🦌", tier: "episch", unlock: 4,
    col: { main: "#6fa048", dark: "#35531f", light: "#b8e08a", acc: "#8a5a33", fx: ["#9ad86a", "#c8a060"] }, head: "hatAntlers", back: "capeMoss", body: "moss", fx: "leaves" },
  { id: "greif", name: "Greif", emoji: "🦅", tier: "episch", unlock: 6,
    col: { main: "#c98f3e", dark: "#6a4418", light: "#fff4e0", acc: "#ffcf4a", fx: ["#fff4e0", "#e8b870"] }, head: "hoodEagle", back: "wingsFeather", body: "feathers", fx: "feathers" },
  { id: "kristallritter", name: "Kristallritter", emoji: "💎", tier: "episch", unlock: 8,
    col: { main: "#a8f0ff", dark: "#3a64b0", light: "#eafcff", acc: "#ff6fae", fx: ["#bff4ff", "#ffffff"] }, head: "hoodKnight", back: "capeCrystal", body: "armor", fx: "glints" },
  { id: "kitsune", name: "Kitsune", emoji: "🦊", tier: "episch", unlock: 10,
    col: { main: "#fff6ee", dark: "#c8703a", light: "#ffffff", acc: "#ff5a6a", fx: ["#9fd8ff", "#c8a8ff"] }, head: "hoodFox", back: "tails3", body: "kimono", fx: "foxfire" },
  { id: "nixe", name: "Bonbon-Nixe", emoji: "🧜", tier: "episch", unlock: 12,
    col: { main: "#4fd6c8", dark: "#1f7a7a", light: "#c8fff4", acc: "#ff8fd0", fx: ["#dff6ff", "#ffc2e8"] }, head: "hatShell", back: "tailFish", body: "fin", fx: "bubbles" },
  { id: "yeti", name: "Yeti", emoji: "❄️", tier: "episch", unlock: 14,
    col: { main: "#f6faff", dark: "#8aa8c8", light: "#ffffff", acc: "#7fb8ff", fx: ["#ffffff", "#dff6ff"] }, head: "hoodYeti", back: "tailPuff", body: "fur", fx: "snow" },
  { id: "frostwolf", name: "Frostwolf", emoji: "🐺", tier: "episch", unlock: 16,
    col: { main: "#b4c4dc", dark: "#48587a", light: "#eef4ff", acc: "#8affc8", fx: ["#8affc8", "#8fe9ff", "#c8a0ff"] }, head: "hoodWolf", back: "capeFur", body: "furvest", fx: "aurora" },
  { id: "golem", name: "Vulkan-Golem", emoji: "🌋", tier: "episch", unlock: 18,
    col: { main: "#846660", dark: "#2e1c1c", light: "#b0908a", acc: "#ff8a3a", fx: ["#ffb060", "#ff7a2a"] }, head: "hoodRock", back: "boulders", body: "rock", fx: "embers" },
  { id: "phoenix", name: "Phönix", emoji: "🔥", tier: "mythisch", unlock: 20,
    col: { main: "#ff7a2a", dark: "#b0301a", light: "#ffd75e", acc: "#ffd75e", fx: ["#ffd75e", "#ff9a3a", "#ff5a3a"] }, head: "hatPhoenix", back: "wingsFlame+tailFlame", body: "flame", fx: "flame", aura: ["#ffb040", "#ff5a2a"] },
  { id: "sternendrache", name: "Sternendrache", emoji: "🌌", tier: "mythisch", unlock: "mega",
    col: { main: "#3a3a9a", dark: "#16164a", light: "#8a7aff", acc: "#fff38a", fx: ["#fff6c0", "#8fe9ff", "#ff9ae0"] }, head: "hoodStar", back: "wingsStar+tailStar", body: "night", fx: "starfall", aura: ["#ff9ae0", "#8fe9ff", "#fff38a", "#b3ff9a"] },
];
export const MYTH_BY_ID = Object.fromEntries(MYTHS.map(m => [m.id, m]));
export const MYTH_START = MYTHS.filter(m => m.unlock === "start").map(m => m.id);
/** Kostüm, das der Boss dieser Ebene beim ersten Sieg fallen lässt */
export const mythOfBoss = d => (MYTHS.find(m => m.unlock === d) || null);
/** Freischalt-Hinweis für gesperrte Kostüme im Editor */
export function mythHint(m) {
  if (m.unlock === "start") return "von Anfang an";
  if (m.unlock === "mega") return "Gewinne auf 🔥 MEGASCHWER";
  const d = m.unlock;
  return "Besiege " + (bossKindOf(d) === "mini" ? MINIS[d].name : d >= MAX_DEPTH ? "den Kellerkönig" : BOSSES[biomeOf(d)].name);
}
// Glanz (Signatur-Partikel): Partikel pro Sekunde beim Laufen/Stehen, höchstens max gleichzeitig; „mythisch“ × myth (+ Aura)
export const MYTH_FX = { walk: 6, idle: 1.6, myth: 1.7, max: 14, auraR: 0.9 };
export const MYTH_KEY = "koboldkeller2_myths";                          // Sammlung gehört dem Gerät (wie die Ehrenhall)

// Waffenstufen nach Schaden
export const WEAPONS = [
  { min: 0, name: "Waffelholz-Knüppel", key: "stick", trail: "#ffe7a8" },
  { min: 6, name: "Holzschwert", key: "wood", trail: "#ffd27a" },
  { min: 9, name: "Kristallschwert", key: "crystal", trail: "#9ff0ff" },
  { min: 13, name: "Sternenschwert", key: "star", trail: "#fff38a" },
  { min: 18, name: "Regenbogenschwert", key: "rainbow", trail: "#ffb3f0" },
];
export const weaponOf = atk => { let w = WEAPONS[0]; for (const x of WEAPONS) if (atk >= x.min) w = x; return w; };
