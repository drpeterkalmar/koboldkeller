/* config.js — Konstanten, Spezies, Biome, Gegner (MIT) */
export const VERSION = (typeof window !== "undefined" && window.KK_VER) || 1;
export const TITLE = "🍄 Koboldkeller 2";

export const SAVE_KEY = "koboldkeller2_save";
export const OLD_SAVE_KEY = "koboldkeller_save_v1";
export const HALL_KEY = "koboldkeller_hall_v1";
export const SETTINGS_KEY = "koboldkeller2_settings";

export const MAX_DEPTH = 20;
export const MEGA = { speed: 2, dmg: 10 };

// Spieler-Grundwerte (aus v20 übernommen / kinderfreundlich)
export const PLAYER = {
  hp: 6, speed: 3.6, atk: 4, atkCd: 0.25, atkRadius: 3.0,
  bubbleCd: 0.7, dashCd: 0.9, dashTime: 0.3, dashDist: 4.4, dashInvul: 0.5,
  hurtInvul: 1.0, potions: 3,
};

// 8 Kobold-Looks (2 Reihen à 4 am Handy)
export const SPECIES = [
  { id: "kobold", name: "Kobold", skin: "#86dc5c", outfit: "#ff6f91", hair: "#6b4430", ears: "pointy", eye: "#3b2a6b" },
  { id: "baer", name: "Bär", skin: "#cf9460", outfit: "#5f86e0", hair: "#8a5a33", ears: "round", eye: "#3a2413" },
  { id: "hase", name: "Hase", skin: "#f6eee0", outfit: "#ffcf4a", hair: "#ffc2d4", ears: "bunny", eye: "#6b2f5a" },
  { id: "tintenfisch", name: "Tintenfisch", skin: "#b98ff0", outfit: "#4fc3f7", hair: "#8a5fc0", ears: "octo", eye: "#2c1b5e" },
  { id: "panda", name: "Roter Panda", skin: "#ea7a4c", outfit: "#86dc5c", hair: "#7a3b22", ears: "panda", eye: "#3a1a10" },
  { id: "katze", name: "Katze", skin: "#f3aa62", outfit: "#ff7fb0", hair: "#b06a2c", ears: "cat", eye: "#2e5a2a" },
  { id: "fuchs", name: "Fuchs", skin: "#ff9a42", outfit: "#9b7bff", hair: "#c75f1a", ears: "fox", eye: "#4a2a10" },
  { id: "drache", name: "Drache", skin: "#6fd8c4", outfit: "#ffb35e", hair: "#3aa893", ears: "dragon", eye: "#1f3b5e" },
];
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
