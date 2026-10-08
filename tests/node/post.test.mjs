// Technik E3: Endbild — reine Teile ohne Browser (Maße je Stufe, Blur-Kern, Farbkorrektur, Vignette, Shader-Text).
// Ob die Shader im Browser übersetzen und wie es aussieht, prüft der Heavy-Job (KK.post() meldet Fehler + Rückfall).
import { test } from "node:test";
import assert from "node:assert/strict";
import { POST_STUFEN, postMasse, blurKern, GRADE, kopiereGrade, mischeGrade, vignStopps, SHADER } from "../../src/post.js";

test("Maße: Handy (DPR 2) rendert die Szene kleiner, das Endbild in voller Schärfe", () => {
  const m = postMasse(412, 915, 2.625, 0);
  assert.equal(m.RS, 1.6); assert.equal(m.sw, 659); assert.equal(m.ow, 824); assert.equal(m.oh, 1830);
  assert.ok(Math.abs(m.skala - 0.8) < 1e-9);
  assert.equal(m.gw, Math.ceil(m.sw / 2)); assert.equal(m.bw, Math.ceil(m.gw / 2));
  const q3 = postMasse(412, 915, 2, 3);
  assert.equal(q3.RS, 1); assert.ok(q3.ow < 824 && q3.ow >= 412);
  // Szene-Pixel je Stufe immer kleiner als v13 (1 / 0,8 / 0,65 / 0,5 × DPR, mindestens 1) oder gleich
  const v13 = [1, 0.8, 0.65, 0.5];
  for (let q = 0; q < 4; q++) assert.ok(postMasse(412, 915, 2, q).RS <= Math.max(1, 2 * v13[q]) + 1e-9, "Stufe " + q);
});

test("Maße: Desktop (DPR 1) wird nicht unschärfer als heute", () => {
  for (let q = 0; q < 4; q++) { const m = postMasse(1280, 800, 1, q); assert.equal(m.RS, 1); assert.equal(m.ow, 1280); assert.equal(m.skala, 1); }
});

test("Blur-Kern: Summe 1, lineares Sampling = diskreter 17-Tap-Gauß", () => {
  const k = blurKern(3.2, 8);
  assert.ok(Math.abs(k.w0 + 2 * k.wt.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  for (let i = 1; i < 4; i++) assert.ok(k.off[i] > k.off[i - 1]);
  // Signal falten: diskret vs. linear interpoliert
  const N = 64, sig = Array.from({ length: N }, (_, i) => Math.sin(i * 0.7) + (i % 5 === 0 ? 2 : 0));
  const at = (x) => { const i = Math.floor(x), f = x - i, a = sig[Math.max(0, Math.min(N - 1, i))], b = sig[Math.max(0, Math.min(N - 1, i + 1))]; return a + (b - a) * f; };
  const g = []; let s = 0; for (let i = 0; i <= 8; i++) { const v = Math.exp(-(i * i) / (2 * 3.2 * 3.2)); g.push(v); s += i ? 2 * v : v; }
  for (let x = 10; x < 54; x++) {
    let d = sig[x] * g[0] / s; for (let i = 1; i <= 8; i++) d += (sig[x + i] + sig[x - i]) * g[i] / s;
    let l = sig[x] * k.w0; for (let i = 0; i < 4; i++) l += (at(x + k.off[i]) + at(x - k.off[i])) * k.wt[i];
    assert.ok(Math.abs(d - l) < 1e-9, x + ": " + d + " vs " + l);
  }
});

test("Farbkorrektur: eine Zeile je Welt, nahe neutral, nur der Glutkeller flimmert", () => {
  assert.equal(GRADE.length, 6);
  for (const [i, g] of GRADE.entries()) {
    for (const k of ["lift", "gamma", "gain"]) assert.equal(g[k].length, 3);
    for (const v of g.gain) assert.ok(v > 0.9 && v < 1.1, "gain Welt " + i);
    for (const v of g.lift) assert.ok(v >= 0 && v < 0.03, "lift Welt " + i);
    assert.ok(g.sat > 0.9 && g.sat < 1.15 && g.kon > 0.95 && g.kon < 1.12);
    assert.equal(g.heat, i === 5 ? 1 : 0);
  }
  assert.ok(GRADE[5].gain[0] > GRADE[5].gain[2], "Glut warm");
  for (const i of [2, 4]) assert.ok(GRADE[i].gain[2] > GRADE[i].gain[0], "Kristall/Frost kühl");
  const a = kopiereGrade(GRADE[0]);
  for (let i = 0; i < 200; i++) mischeGrade(a, GRADE[5], 0.05);
  assert.ok(Math.abs(a.heat - 1) < 1e-3 && Math.abs(a.gain[2] - GRADE[5].gain[2]) < 1e-3);
  assert.equal(GRADE[0].gain[0], 1, "Tabelle selbst bleibt unverändert");
});

test("Vignette: gleiche Stopps wie v13", () => {
  const s = vignStopps(null);
  const e = [0x6a / 255, 0x5a / 255, 0x7a / 255];
  for (let i = 0; i < 3; i++) { assert.ok(Math.abs(s.rand[i] - e[i]) < 1e-9); assert.ok(Math.abs(s.mitte[i] - (1 + (e[i] - 1) * 0.55)) < 1e-9); }
  const w = vignStopps("#6a3424");
  assert.ok(Math.abs(w.mitte[0] - 0xf4 / 255) < 1e-9 && Math.abs(w.rand[0] - 0x6a / 255) < 1e-9);
});

test("Shader-Text: GLSL ES 3.00, Klammern stimmen, jede abgefragte Uniform ist deklariert", () => {
  const uni = { FS_BLUR: ["tex", "dir", "w0", "off", "wt"], FS_END: ["szene", "glow", "bloom", "szPx", "scharf", "lift", "gam", "gain", "sat", "kon", "glowK", "bloomK", "vMitte", "vRand", "vignK", "res", "heat", "zeit"] };
  for (const [name, src] of Object.entries(SHADER)) {
    assert.ok(src.startsWith("#version 300 es\n"), name);
    for (const [a, b] of [["{", "}"], ["(", ")"], ["[", "]"]]) assert.equal(src.split(a).length, src.split(b).length, name + " " + a + b);
    if (name !== "VS") { assert.match(src, /precision highp float;/); assert.match(src, /out vec4 o;/); }
    for (const u of uni[name] || []) assert.match(src, new RegExp("uniform \\w+ " + u + ";"), name + ": " + u);
  }
  // keine Uniform deklariert, die post.js nicht abfragt (sonst setzt sie niemand)
  for (const [name, list] of Object.entries(uni)) for (const m of SHADER[name].matchAll(/uniform \w+ (\w+);/g)) assert.ok(list.includes(m[1]), name + ": " + m[1] + " wird nicht gesetzt");
});

test("Stufen-Tabelle: Szene 0,8 → 0,5, Endbild nie kleiner als die Szene", () => {
  assert.equal(POST_STUFEN.length, 4);
  for (let i = 1; i < 4; i++) assert.ok(POST_STUFEN[i].szene <= POST_STUFEN[i - 1].szene && POST_STUFEN[i].aus <= POST_STUFEN[i - 1].aus);
  for (const s of POST_STUFEN) assert.ok(s.aus >= s.szene);
});
