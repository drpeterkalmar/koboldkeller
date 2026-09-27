// Koboldkeller 2 — Audio offline rendern + messen.
// node tools/audiorender.mjs [--port=8731] [--secs=60] [--no-sfx]
// (a) alle Effekt-Varianten als WAV, (b) 60 s je Musikzustand + Gesamtmix (Kampf + Effekte + Ambience)
// per OfflineAudioContext im Browser — exakt derselbe Mix-Graph wie im Spiel (Busse, Hall, Limiter).
// Messung mit ffmpeg: ebur128 (LUFS integriert, True-Peak), volumedetect, Anteil < 80 Hz, Spektrogramm.
// Ausgabe: shots/audio/ (nicht versioniert), Tabelle → shots/audio/messung.md + .json
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k)); if (!a) return d; const v = a.split("=")[1]; return v === undefined ? true : v; };
const PORT = +arg("port", 8731), SECS = +arg("secs", 60), SFX = !arg("no-sfx", false);
const OUT = "shots/audio/";
mkdirSync(OUT + "sfx", { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message));
await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForFunction(() => window.KK && KK.G && KK.G.L);
const pre = await page.evaluate(async () => { const A = await import("./src/audio.js"); window.__A = A; return await A.audioReady(); });
console.log(`Vor-Rendern: ${pre.ms} ms, ${pre.jobs} Sätze, ${(pre.bytes / 1e6).toFixed(1)} MB, längster Main-Thread-Happen ${pre.maxJob} ms, Aufnahme ${pre.recMs} ms`);

// ---------- Puffer aus dem Browser holen (Float32, in Stücken als base64) ----------
await page.evaluate(() => {
  window.__chunk = (key, ch, from, n) => new Promise(res => {
    const d = window.__bufs[key].getChannelData(ch).subarray(from, from + n);
    const fr = new FileReader(); fr.onload = () => res(fr.result.split(",")[1]); fr.readAsDataURL(new Blob([d.slice().buffer]));
  });
});
async function fetchBuf(key) {
  const info = await page.evaluate(k => { const b = window.__bufs[k]; return { ch: b.numberOfChannels, len: b.length, sr: b.sampleRate }; }, key);
  const chans = [];
  for (let c = 0; c < info.ch; c++) {
    const parts = [];
    for (let i = 0; i < info.len; i += 1 << 20) parts.push(Buffer.from(await page.evaluate(([k, c, i]) => window.__chunk(k, c, i, 1 << 20), [key, c, i]), "base64"));
    const b = Buffer.concat(parts); chans.push(new Float32Array(b.buffer, b.byteOffset, info.len));
  }
  return { ...info, chans };
}
function writeWav(path, { ch, len, sr, chans }) {
  const data = Buffer.alloc(len * ch * 4);
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) data.writeFloatLE(chans[c][i], (i * ch + c) * 4);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * ch * 4, 28); h.writeUInt16LE(ch * 4, 32); h.writeUInt16LE(32, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}
const run = (args) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 << 20 }); return r.stderr + r.stdout; };
function measure(path) {
  const e = run(["-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const sum = e.slice(e.lastIndexOf("Summary:"));
  const I = +(sum.match(/I:\s+(-?[\d.]+|-inf) LUFS/) || [0, NaN])[1];
  const TP = +(sum.match(/True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS/) || [0, NaN])[1];
  const v = run(["-i", path, "-af", "volumedetect", "-f", "null", "-"]);
  const mean = +(v.match(/mean_volume: (-?[\d.]+) dB/) || [0, NaN])[1], max = +(v.match(/max_volume: (-?[\d.]+) dB/) || [0, NaN])[1];
  const rms = (af) => { const o = run(["-i", path, "-af", af + "astats=measure_perchannel=none:measure_overall=RMS_level", "-f", "null", "-"]); return +(o.match(/RMS level dB: (-?[\d.]+|-inf)/) || [0, NaN])[1]; };
  const full = rms(""), low = rms("lowpass=f=80:p=2,lowpass=f=80:p=2,lowpass=f=80:p=2,");
  return { I, TP, mean, max, low80: +(low - full).toFixed(1) };
}

// ---------- (a) Effekt-Varianten ----------
const sfxRows = [];
if (SFX) {
  const names = await page.evaluate(() => { const S = __A.sfxBuffers(); window.__bufs = {}; for (const [k, bs] of Object.entries(S)) bs.forEach((b, i) => { window.__bufs[k + "_" + i] = b; }); return Object.keys(window.__bufs); });
  for (const k of names) {
    const b = await fetchBuf(k); const p = OUT + "sfx/" + k + ".wav"; writeWav(p, b);
    const v = run(["-i", p, "-af", "volumedetect", "-f", "null", "-"]);
    sfxRows.push({ k, dur: +(b.len / b.sr).toFixed(2), ch: b.ch, max: +(v.match(/max_volume: (-?[\d.]+) dB/) || [0, NaN])[1] });
  }
  console.log(`Effekte: ${names.length} Varianten → ${OUT}sfx/`);
}

// ---------- (b) Musikzustände + Gesamtmix ----------
function combatScript(secs) {   // realistische Kampf-Sekunde für den Gesamtmix (Hörer bei 0,0)
  const S = [], rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const pos = (r0, r1) => { const a = rnd() * 6.28, r = r0 + rnd() * (r1 - r0); return { x: Math.cos(a) * r, y: Math.sin(a) * r }; };
  for (let t = 0.5; t < secs - 1; t += 0.3 + rnd() * 0.15) {
    S.push([t, "swing", {}]);
    if (rnd() < 0.7) { const n = 1 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const p = pos(1, 3); S.push([t + 0.07, rnd() < 0.2 ? "hitL" : "hitM", p]); if (rnd() < 0.12) S.push([t + 0.07, "crit", p]); } }
  }
  for (let t = 2; t < secs - 2; t += 1.6 + rnd() * 1.2) { const p = pos(1, 3); S.push([t, "poof", p]); const n = 1 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) S.push([t + 0.8 + i * 0.12, "coin", { rate: Math.pow(2, ([79, 82, 84, 87, 89][i] - 84) / 12) }]); }
  for (let t = 1.2; t < secs - 1; t += 1.3 + rnd()) { S.push([t, "bubble", {}]); S.push([t + 0.45, "pop", pos(2, 5)]); }
  for (let t = 4; t < secs - 1; t += 5 + rnd() * 3) S.push([t, "hurt", {}]);
  for (let t = 3; t < secs - 1; t += 2.5 + rnd() * 2) S.push([t, rnd() < 0.5 ? "shoot" : "fire", pos(3, 7)]);
  for (let t = 7; t < secs - 1; t += 9) S.push([t, "dodge", {}]);
  S.push([20, "pot", pos(1, 2)], [30, "spark", {}], [30, "sting:levelup", {}], [45, "chest", pos(1, 2)]);
  return S.sort((a, b) => a[0] - b[0]);
}
const STATES = [
  ["musik_stadt_tag", { where: "town", eve: false }],
  ["musik_stadt_abend", { where: "town", eve: true }],
  ["musik_keller1_moos", { where: "dungeon", biome: 1 }],
  ["musik_keller2_kristall", { where: "dungeon", biome: 2 }],
  ["musik_keller3_zucker", { where: "dungeon", biome: 3 }],
  ["musik_keller4_frost", { where: "dungeon", biome: 4 }],
  ["musik_keller5_glut", { where: "dungeon", biome: 5 }],
  ["musik_kampf_keller1", { where: "dungeon", biome: 1, inten: 1 }],
  ["musik_kampf_keller2", { where: "dungeon", biome: 2, inten: 1 }],
  ["musik_kampf_keller3", { where: "dungeon", biome: 3, inten: 1 }],
  ["musik_kampf_keller4", { where: "dungeon", biome: 4, inten: 1 }],
  ["musik_kampf_keller5", { where: "dungeon", biome: 5, inten: 1 }],
  ["musik_boss_keller1", { where: "dungeon", biome: 1, boss: 1 }],
  ["musik_boss_keller2", { where: "dungeon", biome: 2, boss: 1 }],
  ["musik_boss_keller3", { where: "dungeon", biome: 3, boss: 1 }],
  ["musik_boss_keller4", { where: "dungeon", biome: 4, boss: 1 }],
  ["musik_boss_keller1_wut", { where: "dungeon", biome: 1, boss: 1, phase: 3 }],
  ["musik_miniboss_keller1", { where: "dungeon", biome: 1, boss: 3 }],
  ["musik_miniboss_keller2", { where: "dungeon", biome: 2, boss: 3 }],
  ["musik_miniboss_keller3", { where: "dungeon", biome: 3, boss: 3 }],
  ["musik_miniboss_keller4", { where: "dungeon", biome: 4, boss: 3 }],
  ["musik_miniboss_keller5", { where: "dungeon", biome: 5, boss: 3 }],
  ["musik_miniboss_keller1_wild", { where: "dungeon", biome: 1, boss: 3, phase: 2 }],
  ["musik_boss_koenig", { where: "dungeon", biome: 5, boss: 2 }],
  ["musik_boss_koenig_wut", { where: "dungeon", biome: 5, boss: 2, phase: 3 }],
  ["ambience_stadt", { where: "town", amb: true, music: false }],
  ["ambience_keller2_kristall", { where: "dungeon", biome: 2, amb: true, music: false }],
  ["mix_stadt_ambience", { where: "town", amb: true }],
  ["mix_kampf_gesamt", { where: "dungeon", biome: 1, inten: 1, amb: true, sfx: combatScript(SECS) }],
];
const ONLY = arg("only", "");
const rows = [];
for (const [name, o] of STATES.filter(([n]) => !ONLY || ONLY.split(",").some(k => n.includes(k)))) {
  const t0 = Date.now();
  await page.evaluate(async ([n, o, secs]) => { window.__bufs = { [n]: await __A.renderScene({ ...o, secs }) }; }, [name, o, SECS]);
  const ms = Date.now() - t0;
  const b = await fetchBuf(name); const p = OUT + name + ".wav"; writeWav(p, b);
  const m = measure(p);
  run(["-y", "-i", p, "-lavfi", "showspectrumpic=s=1024x384:legend=1:scale=log:fscale=lin:stop=12000", OUT + name + "_spektrum.png"]);
  rows.push({ name, ...m, renderMs: ms });
  console.log(`${name.padEnd(24)} I ${m.I} LUFS  TP ${m.TP} dBTP  max ${m.max} dB  mean ${m.mean} dB  <80 Hz ${m.low80} dB  (render ${ms} ms)`);
}
const md = ["| Zustand | LUFS (I) | True-Peak dBTP | max dBFS | mean dBFS | Anteil < 80 Hz |", "|---|---|---|---|---|---|",
  ...rows.map(r => `| ${r.name} | ${r.I} | ${r.TP} | ${r.max} | ${r.mean} | ${r.low80} dB |`)].join("\n");
writeFileSync(OUT + "messung.md", md + "\n");
writeFileSync(OUT + "messung.json", JSON.stringify({ date: new Date().toISOString(), pre, rows, sfx: sfxRows, errors: errs }, null, 2));
console.log("\n" + md);
if (sfxRows.length) { const worst = sfxRows.reduce((a, b) => a.max > b.max ? a : b); console.log(`Effekt-Varianten: ${sfxRows.length}, höchster Sample-Peak ${worst.max} dB (${worst.k})`); }
console.log("Fehler:", errs.length ? errs.join(" | ") : 0);
await browser.close();
