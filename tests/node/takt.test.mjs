// Technik E2: fester Simulationstakt — reine Logik (Takt, Zwischenbild, Hitstop) + echte Spiel-Logik bei 30/60/90/120/144 Hz.
// Aufruf: node --test tests/node/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Takt, rasteAbstand, erkenneVsync, spielDt, Zwischenbild } from "../../src/takt.js";

// einfacher, fester Zufall für das Zittern der Bildzeitstempel. Wie im Browser zittern die ZEITSTEMPEL um das Vsync-Raster
// (Abstand = Differenz zweier Stempel), die Fehler summieren sich also nicht auf.
const lcg = (s) => () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
function abspielen(hz, sek, zittern = 0, seed = 1) {
  const t = new Takt(), r = lcg(seed), je = [];
  let zeit = 0, i = 0, alt = 0;
  while (zeit < sek) { i++; const ts = i / hz + (r() * 2 - 1) * zittern; const s = ts - alt; alt = ts; zeit = ts; je.push(t.schritte(s)); }
  return { je, gesamt: je.reduce((a, b) => a + b, 0), zeit, takt: t };
}

test("Einrasten: Bildrate erkennen, Abstände auf Vielfache einrasten", () => {
  assert.equal(erkenneVsync(0.0168), 1 / 60);
  assert.equal(erkenneVsync(0.0083), 1 / 120);
  assert.equal(erkenneVsync(0.0071), 1 / 144);
  assert.equal(erkenneVsync(0.0235), 0);                    // ruckelndes Gerät, kein Raster
  assert.equal(rasteAbstand(0.0168, 1 / 60), 1 / 60);
  assert.equal(rasteAbstand(0.0335, 1 / 60), 2 / 60);       // ausgelassenes Bild
  assert.equal(rasteAbstand(0.0075, 1 / 120), 1 / 120);
  assert.equal(rasteAbstand(0.0215, 1 / 60), 0.0215);       // weit daneben → echter Wert
  assert.equal(rasteAbstand(0.0168, 0), 0.0168);
});

test("60 Hz mit Zittern: jedes Bild genau ein Schritt (kein 0/2-Ruckeln)", () => {
  const { je } = abspielen(60, 30, 0.0004);
  assert.ok(je.every((n) => n === 1), "Schritte je Bild: " + [...new Set(je)].join(","));
});

test("120 Hz: abwechselnd 1 und 0 Schritte → Logik-Last halbiert", () => {
  const { je, gesamt } = abspielen(120, 10, 0.0004);
  assert.ok(je.every((n) => n <= 1));
  assert.ok(Math.abs(gesamt - 600) <= 1, "gesamt " + gesamt);
  for (let i = 2; i < je.length; i++) assert.ok(je[i] + je[i - 1] === 1, "Bild " + i + ": " + je[i - 1] + "," + je[i]);
});

test("30/90/144 Hz und krumme 61 Hz: Spielzeit folgt der echten Zeit", () => {
  for (const hz of [30, 90, 144, 61, 59.94]) {
    const { gesamt, zeit } = abspielen(hz, 10, 0.0003, hz | 0);
    assert.ok(Math.abs(gesamt - zeit * 60) <= 1.5, hz + " Hz: " + gesamt + " Schritte in " + zeit.toFixed(3) + " s");
  }
  assert.ok(abspielen(30, 5, 0.0004).je.every((n) => n === 2));
});

test("Hänger: höchstens 3 Schritte je Bild, kein Nachholen-Sturm, alpha in [0,1)", () => {
  const t = new Takt();
  assert.equal(t.schritte(0.3), 1);                         // Tab im Hintergrund: verworfen (wie früher dt ≤ 50 ms)
  assert.equal(t.schritte(0.12), 3);                        // 7 fällige Schritte → 3
  assert.ok(t.verworfen > 0.2);
  for (let i = 0; i < 500; i++) { t.schritte(0.001 + (i % 17) * 0.004); assert.ok(t.alpha >= 0 && t.alpha < 1, "alpha " + t.alpha); }
  assert.equal(t.schritte(0), 0);
  assert.equal(t.schritte(NaN), 0);
});

test("Hitstop und Zeitlupe: gleiche Spielzeit bei jeder Bildrate", () => {
  for (const hz of [30, 60, 120, 144]) {
    const FX = { hitstop: 0.1, slowT: 0.5, slowF: 0.3 }, t = new Takt();
    let spiel = 0, echt = 0;
    while (echt < 1) { const s = 1 / hz; echt += s; const n = t.schritte(s); for (let i = 0; i < n; i++) spiel += spielDt(FX, t.h, false); }
    // 0,1 s Hitstop (dabei läuft auch die Zeitlupen-Uhr), danach 0,4 s × 0,3, Rest 1:1 → 0,12 + 0,5 = 0,62 s Spielzeit
    assert.ok(Math.abs(spiel - 0.62) < 1 / 60 + 1e-9, hz + " Hz: Spielzeit " + spiel.toFixed(4));
  }
  const FX = { hitstop: 0, slowT: 0, slowF: 1 };
  assert.equal(spielDt(FX, 1 / 60, true), 0);              // Pause steht
});

test("Zwischenbild: überblendet, stellt wieder her, springt bei Teleport", () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 5, y: 5 }, c = { x: 1, y: 1, z: 10 };
  const zb = new Zwischenbild();
  zb.merke((f) => { f(a); f(b); f(c); f(null); });
  a.x = 1; a.y = 0.5; a.z = 20; b.x = 50; c.z = 30;           // Schritt: a läuft, b teleportiert, c hüpft
  zb.setze(0.25);
  assert.deepEqual([a.x, a.y, a.z], [0.25, 0.125, 5]);
  assert.equal(b.x, 50);                                    // Sprung → echter Stand
  assert.equal(c.z, 15);
  zb.zurueck();
  assert.deepEqual([a.x, a.y, a.z, b.x, c.z], [1, 0.5, 20, 50, 30]);
  zb.setze(1); zb.setze(0.5); zb.zurueck();                 // doppeltes setze ohne zurueck darf nichts verschieben
  assert.deepEqual([a.x, a.y, a.z], [1, 0.5, 20]);
  const viele = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: 0 }));
  zb.merke((f) => viele.forEach(f));
  for (const o of viele) o.y = 1;
  zb.setze(0.5); assert.equal(viele[999].y, 0.5); zb.zurueck(); assert.equal(viele[999].y, 1);
});

// ---- echte Spiel-Logik: jede Variante in eigenem Prozess (game.js hält globalen Zustand) ----
const SIM = fileURLToPath(new URL("./takt_sim.mjs", import.meta.url));
const sim = (hz, modus) => JSON.parse(execFileSync(process.execPath, [SIM, "--hz", String(hz), "--modus", modus, "--sek", "20"], { encoding: "utf8", timeout: 60000 }));

test("gleiche Simulation bei 30, 60, 90, 120, 144 Hz (fester Takt)", () => {
  const ref = sim(60, "takt");
  assert.ok(ref.stand.kills > 0 && ref.stand.zufall > 1000, "Szene hat Kampf und Zufall: " + JSON.stringify(ref.stand).slice(0, 200));
  for (const hz of [30, 90, 120, 144]) {
    const r = sim(hz, "takt");
    assert.equal(r.schritte, ref.schritte);
    assert.deepEqual(r.stand, ref.stand, hz + " Hz weicht ab");
  }
});

test("Gegenprobe: die alte Schleife (dt = Bildabstand) läuft bei 60 vs. 120 Hz auseinander", () => {
  const a = sim(60, "alt"), b = sim(120, "alt");
  assert.notDeepEqual(a.stand, b.stand);
  assert.ok(b.schritte > a.schritte * 1.9);
});
