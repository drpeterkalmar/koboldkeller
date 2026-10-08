// Technik E1: Qualitäts-Automatik (2D) mit künstlichen Geräten — ohne Browser.
// Gerätemodell: je Stufe CPU-Arbeit (sieht die Automatik) und GPU-Arbeit (sieht sie nicht, wie bei Canvas 2D);
// der Bildabstand ist die Summe, aufgerundet auf das Vsync-Raster (bzw. auf ein festes Raster im Stromsparmodus).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Automatik2D } from "../../src/automatik.js";

const lcg = (s) => () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
/** geraet(t, stufe) → { cpu, gpu, vsync, deckel } in ms; liefert Verlauf der Stufen */
function lauf(geraet, sek, opts = {}) {
  const r = lcg(opts.seed || 3), wechsel = [];
  const a = new Automatik2D({ stufen: 4, start: opts.start ?? 0, setzen: (s, ri) => wechsel.push({ t: +t.toFixed(1), s, ri }) });
  let t = 0;
  while (t < sek) {
    const g = geraet(t, a.stufe);
    const zitter = 1 + (r() * 2 - 1) * (g.zittern ?? 0.05);
    const arbeit = (g.cpu + g.gpu) * zitter;
    const raster = g.deckel || g.vsync || 1000 / 60;
    const ms = Math.max(raster, Math.ceil(arbeit / raster - 0.02) * raster);
    t += ms / 1000;
    a.bild(ms / 1000, g.cpu * zitter);
  }
  return { a, wechsel };
}

test("starkes Gerät bleibt auf Stufe 0", () => {
  const { a, wechsel } = lauf(() => ({ cpu: 5, gpu: 3 }), 120);
  assert.equal(a.stufe, 0); assert.equal(wechsel.length, 0);
});

test("30-Hz-Stromsparmodus: wenig Arbeit, ruhige 30 fps → nicht abstufen (bisher: Stufe 3)", () => {
  const { a, wechsel } = lauf(() => ({ cpu: 5, gpu: 3, deckel: 1000 / 30, zittern: 0.02 }), 15);
  assert.equal(a.stufe, 0, JSON.stringify(wechsel));
  assert.ok(a.zustand().gedeckelt);
});

test("30-Hz-Stromsparmodus lange: Probe-Schritt bringt nichts → zurück, nächste Probe erst viel später", () => {
  const { a, wechsel } = lauf(() => ({ cpu: 5, gpu: 3, deckel: 1000 / 30, zittern: 0.02 }), 600);
  assert.equal(a.stufe, 0);
  const proben = wechsel.filter((w) => w.ri < 0).length;
  assert.ok(proben >= 1 && proben <= 5, "Proben in 10 min: " + proben + " " + JSON.stringify(wechsel));
  // Abstände zwischen den Proben wachsen
  const zeiten = wechsel.filter((w) => w.ri < 0).map((w) => w.t);
  for (let i = 2; i < zeiten.length; i++) assert.ok(zeiten[i] - zeiten[i - 1] > zeiten[i - 1] - zeiten[i - 2]);
});

test("Grafikkarte schafft gleichmäßig nur 30 fps (sieht aus wie gedeckelt) → Probe hilft, landet auf der besten passenden Stufe", () => {
  const gpu = [24, 17, 10, 7];
  const { a, wechsel } = lauf((t, s) => ({ cpu: 4, gpu: gpu[s], zittern: 0.01 }), 150);
  assert.equal(a.stufe, 2, JSON.stringify(wechsel));
  assert.ok(a.zustand().gpuGebunden);
  assert.ok(wechsel.length <= 6, JSON.stringify(wechsel));
});

test("schwaches Gerät: stuft ab, bis es passt, und pendelt nicht", () => {
  const cost = [30, 22, 15, 10];
  const { a, wechsel } = lauf((t, s) => ({ cpu: cost[s] * 0.6, gpu: cost[s] * 0.4 }), 180);
  assert.ok(a.stufe >= 2, "Stufe " + a.stufe);
  assert.ok(wechsel.length <= 7, "Wechsel: " + JSON.stringify(wechsel));
});

test("Last weg → nach 8 s stabil eine Stufe besser, nicht früher", () => {
  const { a, wechsel } = lauf((t, s) => (t < 20 ? { cpu: 26, gpu: 4 } : { cpu: 4, gpu: 2 }), 80);
  assert.equal(a.stufe, 0, JSON.stringify(wechsel));
  const rauf = wechsel.filter((w) => w.ri > 0);
  assert.ok(rauf.length >= 1);
  assert.ok(rauf[0].t >= 20 + 8, "erstes Rauf bei " + rauf[0].t);
  for (let i = 1; i < rauf.length; i++) assert.ok(rauf[i].t - rauf[i - 1].t >= 8, "Rauf-Abstand " + (rauf[i].t - rauf[i - 1].t));
});

test("Grenzgerät (Stufe 0 zu teuer, Stufe 1 locker): Sperre nach Fehlversuch, wenige Wechsel", () => {
  const cost = [19, 8, 6, 5];
  const { a, wechsel } = lauf((t, s) => ({ cpu: cost[s] * 0.7, gpu: cost[s] * 0.3 }), 300);
  assert.equal(a.stufe, 1);
  assert.ok(wechsel.length <= 10, wechsel.length + " Wechsel: " + JSON.stringify(wechsel));
  const rauf = wechsel.filter((w) => w.ri > 0).map((w) => w.t);
  for (let i = 2; i < rauf.length; i++) assert.ok(rauf[i] - rauf[i - 1] >= rauf[i - 1] - rauf[i - 2] - 1, "Sperre wächst: " + rauf.join(","));
});

test("120-Hz-Bildschirm mit 70 fps: kein Abstufen (Ziel ist 60, nicht 120)", () => {
  const { a } = lauf(() => ({ cpu: 9, gpu: 4, vsync: 1000 / 120 }), 60);
  assert.equal(a.stufe, 0);
});

test("aus (?auto=0): misst, ändert aber nichts", () => {
  const a = new Automatik2D({ aktiv: false });
  for (let i = 0; i < 3000; i++) a.bild(0.05, 40);
  assert.equal(a.stufe, 0);
  assert.ok(a.zustand().fps < 25);
});
