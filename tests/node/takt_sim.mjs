// Technik E2: echte Spiel-Logik (game.js, fx.js) ohne Browser mit einer Bildrate „abspielen“ und den Endstand als JSON ausgeben.
// Aufruf: node tests/node/takt_sim.mjs --hz 120 --modus takt|alt [--sek 20] [--zittern 0.0004] [--ebene 2]
//   takt = neue Schleife (feste 1/60-s-Schritte, wie main.js mit Takt), alt = bisherige Schleife (dt = Bildabstand)
// Eingaben (Angriff, Gegner antippen, Ausweichen) kommen nach SPIELZEIT-Schritten, nicht nach Bildern — so wie ein Mensch,
// der zur selben Zeit tippt. Jede Variante läuft in einem eigenen Prozess (game.js hält globalen Zustand).
import { Takt, spielDt } from "../../src/takt.js";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const HZ = +arg("hz", 60), MODUS = arg("modus", "takt"), SEK = +arg("sek", 20), ZITTERN = +arg("zittern", 0.0004), EBENE = +arg("ebene", 2);

// ---- Browser-Ersatz (nur was game.js beim Laden/Spielen anfasst) ----
globalThis.window = globalThis;
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { createElement: () => ({ getContext: () => null, canPlayType: () => "", style: {}, setAttribute() { } }), addEventListener() { }, body: { appendChild() { } } };
globalThis.setTimeout = () => 0;   // Hinweis-Toasts u. ä. nicht nachlaufen lassen

// ---- Spiel-Zufall fest gesät, Zähler für Aufrufe ----
let rs = 12345, rn = 0;
Math.random = () => { rn++; rs |= 0; rs = rs + 0x6D2B79F5 | 0; let t = Math.imul(rs ^ rs >>> 15, 1 | rs); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// Zittern der Bildzeitstempel mit eigenem Zufall (darf den Spiel-Zufall nicht verschieben)
let js = 777; const jr = () => { js = (js * 1103515245 + 12345) & 0x7fffffff; return js / 0x7fffffff; };

const { G, startGame, enterLevel, update, attack, tapWorld, dodge, makeEnt } = await import("../../src/game.js");
const { FX, updateFx } = await import("../../src/fx.js");
const { sanitize } = await import("../../src/save.js");

G.demo = false;
startGame(sanitize({ name: "Testi", species: "kobold", tut: false, seed: 777, depth: 0 }));
G.screen = "play";
enterLevel(EBENE, true);
G.deepest = EBENE;
// ein paar Gegner direkt neben den Kobold (Kampf mit Partikeln, Treffern, Beute)
const typen = [...new Set(G.ents.filter((e) => !e.isBoss && e.type !== "dummy").map((e) => e.type))].slice(0, 3);
for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; G.ents.push(makeEnt(typen[i % typen.length] || "slime", G.p.x + Math.cos(a) * 1.6, G.p.y + Math.sin(a) * 1.6)); }
G.p.maxHp = G.p.hp = 400;   // nicht umfallen (Tod würde den Ablauf beenden)

// Eingabe nach Spielschritt (60 Hz-Schritte = feste Spielzeit)
function eingabe(k) {
  if (k % 20 === 0) attack();
  if (k % 90 === 45) { const e = G.ents.find((x) => x.type !== "dummy"); if (e) tapWorld(e.x, e.y, e); }
  if (k % 240 === 200) dodge();
}

const H = 1 / 60;
let frames = 0, schritte = 0, zeit = 0;
if (MODUS === "takt") {
  const takt = new Takt();
  const N = Math.round(SEK * 60);          // gleich viele Spielschritte, egal wie viele Bilder dafür nötig sind
  while (schritte < N) {
    const ts = (frames + 1) / HZ + (jr() * 2 - 1) * ZITTERN, raw = ts - zeit;   // Stempel zittern ums Vsync-Raster
    zeit = ts; frames++;
    const n = takt.schritte(raw);
    for (let i = 0; i < n && schritte < N; i++) {
      eingabe(schritte++);
      const dt = spielDt(FX, takt.h, false);
      update(dt, takt.h); updateFx(dt, takt.h);
    }
  }
} else {
  // bisherige Schleife aus main.js (v13): dt = Bildabstand, Hitstop/Zeitlupe je Bild
  let naechste = 0;
  while (zeit < SEK) {
    const ts = (frames + 1) / HZ + (jr() * 2 - 1) * ZITTERN, raw = ts - zeit;
    zeit = ts; frames++;
    while (naechste * H <= zeit) eingabe(naechste++);   // Eingabe zur selben echten Zeit
    const rd = Math.min(0.05, raw);
    let dt = rd;
    if (FX.hitstop > 0) { FX.hitstop -= rd; dt = 0; }
    if (FX.slowT > 0) { FX.slowT -= rd; dt *= FX.slowF; }
    update(dt, rd); updateFx(dt, rd);
    schritte++;
  }
}
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const ents = G.ents.filter((e) => e.type !== "dummy").map((e) => [e.type, r4(e.x), r4(e.y), r4(e.hp)]).sort();
console.log(JSON.stringify({
  modus: MODUS, hz: HZ, frames, schritte, echtzeit: r4(zeit),
  stand: { t: r4(G.t), x: r4(G.p.x), y: r4(G.p.y), hp: r4(G.p.hp), xp: G.p.xp, lvl: G.p.lvl, gold: G.gold, kills: G.stats.kills,
    ents, items: G.items.length, shots: G.shots.length, parts: FX.parts.length, zufall: rn },
}));
