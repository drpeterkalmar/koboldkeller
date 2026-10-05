// Koboldkeller 2 — v12 Fels-Hintergrund: Kosten messen. Gleiche Szene, Fels an/aus im Wechsel (gleiche Seite, Chunks neu),
// alle Qualitätsstufen, Desktop + CPU-Drosselung. Misst draw()-Zeit (Median/95 %), Frames/s, sichtbare Chunks, Muster-Erzeugung, Speicher.
// node tools/fels_perf.mjs [--port=8731] [--secs=3] [--depth=9] [--w=412 --h=915]  → shots/neubau/v12/perf_<w>x<h>.json
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { GPU_FLAGS } from "./checks_v9.mjs";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const PORT = +arg("port", 8731), SECS = +arg("secs", 3), DEPTH = +arg("depth", 9), W = +arg("w", 412), H = +arg("h", 915);
mkdirSync("shots/neubau/v12/", { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
await page.waitForFunction(() => KK.audio().pre && KK.audio().pre.done, null, { timeout: 90000 }).catch(() => { });
const cdp = await ctx.newCDPSession(page);
// Weltwechsel: Muster-Erzeugung + Speicher je Welt
const build = await page.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  KK.start({ name: "Perf" }); KK.god(true);
  for (const d of [0, 1, 5, 9, 13, 17, 20]) { KK.goto(d); await w(400); out.push({ d, ...KK.rock() }); }
  return out;
});
await page.evaluate(async (d) => {
  KK.goto(d); KK.G.portalCd = 1e9; KK.G.homeHideT = 1e9;
  for (const e of KK.G.ents.slice()) if (e.type !== "dummy") e.hp = 1e6;
  // Kobold läuft im Kreis (Joystick), Kamera wandert mit → Chunks/Muster in Bewegung
  let a = 0; window.__walk = setInterval(() => { a += 0.35; KK.G.joy.x = Math.cos(a); KK.G.joy.y = Math.sin(a); KK.G.joy.m = 1; }, 120);
}, DEPTH);
const set = (fels, q) => page.evaluate(([fels, q]) => { const R = KK.R; R.fels = fels; R.chunks.clear(); R.chunkOrder.length = 0; KK.quality(q); KK.R.chunks.clear(); KK.R.chunkOrder.length = 0; }, [fels, q]);
const res = [];
for (const th of [1, 4]) {
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: th });
  for (let q = 0; q <= 3; q++) for (let rep = 0; rep < 4; rep++) for (const fels of rep % 2 ? [false, true] : [true, false]) {
    await set(fels, q);
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => KK.perf(true));
    await new Promise(r => setTimeout(r, SECS * 1000));
    const p = await page.evaluate(() => ({ ...KK.perf(), vis: KK.R.chunksVis, chunks: KK.R.chunks.size }));
    res.push({ th, q, fels, rep, drawMed: p.drawMed, drawP95: p.drawP95, fps: p.fps, vis: p.vis, chunks: p.chunks });
  }
}
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await browser.close();
// Auswertung: je Drosselung × Stufe Mittel über die Wiederholungen
const agg = [];
for (const th of [1, 4]) for (let q = 0; q <= 3; q++) {
  const pick = f => res.filter(r => r.th === th && r.q === q && r.fels === f), avg = (a, k) => { const v = a.map(r => r[k]).sort((x, y) => x - y); return +((v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2).toFixed(3); };   // Median der Läufe
  const on = pick(true), off = pick(false);
  agg.push({ th, q, onMed: avg(on, "drawMed"), offMed: avg(off, "drawMed"), dMed: +(avg(on, "drawMed") - avg(off, "drawMed")).toFixed(3), onP95: avg(on, "drawP95"), offP95: avg(off, "drawP95"), onFps: avg(on, "fps"), offFps: avg(off, "fps"), visOn: Math.max(...on.map(r => r.vis)), visOff: Math.max(...off.map(r => r.vis)) });
}
const out = { W, H, depth: DEPTH, secs: SECS, build, agg, res, errors };
writeFileSync(`shots/neubau/v12/perf_${W}x${H}.json`, JSON.stringify(out, null, 2));
console.log("Muster je Welt:", build.map(b => `E${b.d} ${b.ms} ms ${(b.bytes / 1048576).toFixed(2)} MB`).join(" · "));
for (const a of agg) console.log(`CPU ${a.th}× q${a.q}: draw Median an ${a.onMed} / aus ${a.offMed} ms (Δ ${a.dMed}) · p95 an ${a.onP95} / aus ${a.offP95} · fps an ${a.onFps} / aus ${a.offFps} · Chunks sichtbar ${a.visOn}/${a.visOff}`);
console.log("Fehler:", errors.length);
