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
export const SAVE_V = 2;                 // v1 = Koboldkeller 2 bis v3, v2 = v4 (Munition, Talente, Spezial, Aussehen)

// ---------- v4: Obergrenzen, Munition, Magnet, Heim-Portal ----------
// hp = höchstens so viele Lebenspunkte (Max-❤️), potions = Tränke, ammo = Grund-Munitionsplatz (+ Talent 🫧)
export const CAP = { hp: 60, potions: 5, ammoBase: 20, ammoMax: 60 };
// Munition: 1 Schuss = 1 Munition (egal wie viele Blasen der Zauberstab wirft); Gewinn pro besiegtem Gegner
export const AMMO = { start: 15, kill: 2, elite: 4, boss: 12, king: 20, minion: 1, dummy: 1, revive: 8 };
export const CAP_GOLD = { potion: 10, heart: 2, ammo: 1, hp: 8, shroom: 5 };   // Gold für Überzähliges
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
export const PLAYER = {
  hp: 6, speed: 3.6, atk: 4, atkCd: 0.25, atkRadius: 3.0,
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
  };
  L.id = [L.species, L.skin, L.hair, L.eye, L.style, L.earsV, L.acc].join("|");
  return L;
}
export const lookSave = L => ({ species: L.species, skin: L.skin, outfit: L.outfit, eye: L.eye, hair: L.hair, style: L.style, earsV: L.earsV, acc: L.acc });
export const OLD_SPECIES_MAP = { kobold: "kobold", baer: "baer", hase: "hase", tintenfisch: "tintenfisch", panda: "panda", katze: "katze" };

export const NAMES = ["Knuffel", "Wichtel-Willy", "Glitzer-Emma", "Pupsi", "Krümel", "Flauschi", "Kobbi",
  "Zuckerkäfer", "Mopsi", "Wackel", "Brummi", "Schmusebacke", "Pünktchen", "Knorpf", "Tapsi", "Blubber",
  "Sternchen", "Muffin", "Kicher-Kiki", "Plüschi", "Funkel", "Wuschel", "Hüpfi", "Zimtschnecke", "Glöckchen",
  "Keksi", "Schnuffel", "Mausi-Maus", "Purzel", "Bommel"];

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
  rmin:  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  rmax:  [10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7],
};
export const DIFF = Array.from({ length: MAX_DEPTH + 1 }, (_, d) => d === 0 ? null : {
  n: DT.n[d], hp: DT.hp[d], dmg: DT.dmg[d], spd: DT.spd[d], cd: DT.cd[d], elite: DT.elite[d], traps: DT.traps[d], room: [DT.rmin[d], DT.rmax[d]],
  split: d >= 6, fan: d >= 10, blink: d >= 13, double: d >= 15, tame: d <= 2,
});
export const diffOf = d => DIFF[Math.max(1, Math.min(MAX_DEPTH, d | 0))];

// ---------- v4: Bosse — eigene Signatur-Angriffe je Welt, 3 Phasen (ab 66 % / 33 % neue Muster, Wut-Phase) ----------
// hp = Grund + proLevel·Spielerlevel · dmg = Schaden pro Treffer · sig = Signatur-Angriffe (Phase 1 / ab Phase 2)
export const BOSSES = [null,
  { name: "Moosbart", epi: "Hüter der Moosgärten", hp: [260, 12], dmg: 2, speed: 1.35, sig: ["spores", "vines"], acc: "bart", aura: "#9aff6a", arena: "leaf" },
  { name: "Glitzerzahn", epi: "Herr der Funkelkristalle", hp: [480, 16], dmg: 3, speed: 1.4, sig: ["crystals", "prism"], acc: "zahn", aura: "#8fe9ff", arena: "crystal" },
  { name: "Zuckerschnute", epi: "Königin der Naschereien", hp: [700, 20], dmg: 4, speed: 1.45, sig: ["candy", "rush"], acc: "schnute", aura: "#ff9ae0", arena: "candy" },
  { name: "Frostnase", epi: "Wächter des Gletschers", hp: [950, 24], dmg: 5, speed: 1.4, sig: ["icicles", "snowball"], acc: "frostnase", aura: "#bfe9ff", arena: "snow" },
  { name: "Kellerkönig", epi: "Herrscher des Koboldkellers", hp: [1500, 30], dmg: 7, speed: 1.25, sig: ["fireRing", "meteors", "flameCross"], acc: "none", aura: "#ff5a3a", arena: "ember" },
];
export const BOSS_PHASES = [0.66, 0.33];

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

// Waffenstufen nach Schaden
export const WEAPONS = [
  { min: 0, name: "Waffelholz-Knüppel", key: "stick", trail: "#ffe7a8" },
  { min: 6, name: "Holzschwert", key: "wood", trail: "#ffd27a" },
  { min: 9, name: "Kristallschwert", key: "crystal", trail: "#9ff0ff" },
  { min: 13, name: "Sternenschwert", key: "star", trail: "#fff38a" },
  { min: 18, name: "Regenbogenschwert", key: "rainbow", trail: "#ffb3f0" },
];
export const weaponOf = atk => { let w = WEAPONS[0]; for (const x of WEAPONS) if (atk >= x.min) w = x; return w; };
