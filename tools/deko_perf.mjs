// Koboldkeller 2 — v13 Deko: Leistung vorher/nachher im Wechsel messen (gleicher Browser, gleiche Drosselung).
// Profil „Mittelklasse-Handy": 412 × 915 (und quer), DPR 2,6 (Spiel deckelt auf 2), CPU-Drosselung per CDP.
// Frame-Zeit = Abstand der requestAnimationFrame-Aufrufe (Frame-Takt ungedrosselt, GPU-Flags) → p50/p95 über SECS Sekunden.
// Die Auto-Qualität wird festgehalten (KK.perf(true) jede Sekunde setzt ihren Zähler zurück), Stufe je Lauf fest.
// node tools/deko_perf.mjs --a=8732 --b=8731 [--qa=] [--qb=] [--secs=12] [--throttle=4] [--reps=2] [--qs=0,3] [--tag=final]
// → tests/shots/deko/perf_<tag>.json + Tabelle auf der Konsole
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { GPU_FLAGS } from "./checks_v9.mjs";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const A = { port: +arg("a", 8732), q: arg("qa", ""), name: arg("na", "vorher") }, B = { port: +arg("b", 8731), q: arg("qb", ""), name: arg("nb", "nachher") };
const SECS = +arg("secs", 12), TH = +arg("throttle", 4), REPS = +arg("reps", 2), QS = arg("qs", "0,3").split(",").map(Number), TAG = arg("tag", "messung");
const SCENES = arg("scenes", "moos,kampf,boss").split(","), FMT = arg("fmt", "hoch");
const DIR = "tests/shots/deko/"; mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { chromium } = loadPlaywright();
// Profil „sw" (Standard): Canvas im Software-Raster → die Pixelarbeit landet im (gedrosselten) Haupt-Thread und zählt in der Frame-Zeit.
// Profil „gpu": GPU-Raster, Haupt-Thread zeichnet nur auf; die Rasterkosten trägt dann der GPU-Prozess (in der Frame-Zeit kaum sichtbar).
const PROFILE = arg("profile", "sw");
const browser = await chromium.launch({ channel: "chromium", args: PROFILE === "gpu" ? GPU_FLAGS : ["--disable-gpu", "--disable-accelerated-2d-canvas", ...GPU_FLAGS.slice(3)] });
const errors = [];
const [VW, VH] = FMT === "quer" ? [915, 412] : [412, 915];

async function open(S) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2.6, hasTouch: true, isMobile: true, locale: "de-AT" });
  // gleicher Zufall in beiden Ständen (v13 verbraucht für Optik keinen Spiel-Zufall, siehe V35b) → Gegner/Beute laufen vergleichbar
  await ctx.addInitScript(() => { Math.random = (() => { let s = 777; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); })(); });
  const page = await ctx.newPage();
  const load = { bytes: 0, gz: 0, n: 0, ext: 0 };
  page.on("response", async r => { try { const u = r.url(); if (!u.startsWith("http://localhost")) { load.ext++; return; } const b = await r.body(); load.n++; load.bytes += b.length; load.gz += gzipSync(b, { level: 9 }).length; } catch (e) { } });
  page.on("pageerror", e => errors.push(S.name + " " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(S.name + " " + m.text()); });
  await page.goto(`http://localhost:${S.port}/index.html${S.q ? "?" + S.q : ""}`);
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await page.waitForFunction(() => KK.audio().pre && KK.audio().pre.done, null, { timeout: 90000 }).catch(() => { });
  await sleep(1500);
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => {
    // Frame-Abstände sammeln (eigener rAF-Zähler, in beiden Ständen gleich)
    window.__ft = []; let last = 0;
    const tick = t => { if (last && window.__on) window.__ft.push(t - last); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setInterval(() => KK.perf(true), 1000);                 // Auto-Qualität festhalten
    KK.start({ name: "Perf" }); KK.god(true);
  });
  return { S, ctx, page, cdp, load };
}
async function scene(P, nm, q) {
  const { page, cdp } = P;
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.evaluate(async ([nm, q]) => {
    const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G;
    { let s = 777; Math.random = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }   // je Szene gleicher Startpunkt
    clearInterval(window.__walk); clearInterval(window.__fight);
    G.bossDone = []; G.winQueued = false;
    const d = nm === "moos" ? 1 : nm === "kampf" ? 9 : 8;
    KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9; KK.quality(q);
    if (nm === "boss") {
      const A = G.L.arena; KK.teleport(A.cx - 3, A.cy - 3);
      const t0 = performance.now(); while (!(G.boss && G.boss.awake && G.ents.includes(G.boss)) && performance.now() - t0 < 12000) await w(50);
      await w(2600);
    } else await w(1800);
    for (const e of G.ents) if (e.type !== "dummy") e.hp = e.maxHp = 1e7;
    if (nm === "kampf") for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; KK.spawn(["slime", "bat", "wisp", "pilzling"][k % 4], Math.cos(a) * 2.2, Math.sin(a) * 2.2); }
    for (const e of G.ents) if (e.type !== "dummy" && !e.isBoss && !e.isMini) e.hp = e.maxHp = 1e7;
    if (G.boss) G.boss.hp = G.boss.maxHp = 1e8;
    // Kobold pendelt zwischen zwei Punkten (Kamera, Chunks, Schritte, Staub) — im Kampf/Boss mit Schlägen und Blasen
    const x0 = G.p.x, y0 = G.p.y; let k = 0;
    window.__walk = setInterval(() => { k++; const tx = x0 + (k % 2 ? 2.5 : -2.5), ty = y0 + (k % 2 ? 1 : -1); const pth = KK.path(tx, ty); if (pth && pth.length) G.p.path = pth; }, 1300);
    if (nm !== "moos") window.__fight = setInterval(() => { KK.attack(); if (Math.random() < 0.4) KK.bubbles(); }, 650);
  }, [nm, q]);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: TH });
  await sleep(1500);
  await page.evaluate(() => { window.__ft.length = 0; window.__on = true; });
  await sleep(SECS * 1000);
  const r = await page.evaluate(() => { window.__on = false; const a = window.__ft.slice().sort((x, y) => x - y), n = a.length; const q = f => +a[Math.min(n - 1, Math.floor(n * f))].toFixed(2);
    return { n, p50: q(0.5), p95: q(0.95), p99: q(0.99), fps: +(1000 / (a.reduce((s, v) => s + v, 0) / n)).toFixed(1), q: KK.R.q, chunks: KK.R.chunksVis, all: window.__ft.map(v => +v.toFixed(2)) }; });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return r;
}
const PA = await open(A), PB = await open(B);
const res = [];
for (const q of QS) for (const nm of SCENES) for (let rep = 0; rep < REPS; rep++) for (const P of rep % 2 ? [PB, PA] : [PA, PB]) {
  // nur eine Seite rechnet zur Zeit: die andere pausiert (Seite unsichtbar schalten geht headless nicht → Spiel anhalten)
  const other = P === PA ? PB : PA;
  await other.page.evaluate(() => { KK.G.hidden = true; });
  await P.page.evaluate(() => { KK.G.hidden = false; });
  const r = await scene(P, nm, q);
  res.push({ who: P.S.name, q, nm, rep, ...r });
  console.log(`${P.S.name.padEnd(8)} q${q} ${nm.padEnd(6)} rep${rep}: p50 ${r.p50} ms · p95 ${r.p95} ms · fps ${r.fps} · n ${r.n} · Stufe ${r.q}`);
}
const med = a => { const v = a.slice().sort((x, y) => x - y); return +((v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2).toFixed(2); };
const agg = [];
for (const q of QS) for (const nm of SCENES) {
  const a = res.filter(r => r.who === A.name && r.q === q && r.nm === nm), b = res.filter(r => r.who === B.name && r.q === q && r.nm === nm);
  // gepoolt: alle Frames aller Wiederholungen zusammen (p95 eines einzelnen Fensters ist nur der drittgrößte Wert → verrauscht)
  const pool = rs => { const v = rs.flatMap(r => r.all).sort((x, y) => x - y); return { p50: +v[v.length >> 1].toFixed(2), p95: +v[Math.floor(v.length * 0.95)].toFixed(2), n: v.length, fps: +(1000 / (v.reduce((s, x) => s + x, 0) / v.length)).toFixed(1) }; };
  const pa = pool(a), pb = pool(b);
  agg.push({ q, nm, aP50: pa.p50, bP50: pb.p50, aP95: pa.p95, bP95: pb.p95, aFps: pa.fps, bFps: pb.fps, aN: pa.n, bN: pb.n, aP95med: med(a.map(r => r.p95)), bP95med: med(b.map(r => r.p95)) });
}
for (const g of agg) { g.dP95 = +((g.bP95 / g.aP95 - 1) * 100).toFixed(1); g.dP50 = +((g.bP50 / g.aP50 - 1) * 100).toFixed(1); }
for (const r of res) delete r.all;
const out = { tag: TAG, profile: PROFILE, fmt: FMT, throttle: TH, secs: SECS, reps: REPS, A, B, loadA: PA.load, loadB: PB.load, agg, res, errors };
await browser.close();
writeFileSync(`${DIR}perf_${TAG}.json`, JSON.stringify(out, null, 2));
console.log("\nStufe Szene | p50 " + A.name + " → " + B.name + " | p95 " + A.name + " → " + B.name + " (Δ) | fps");
for (const g of agg) console.log(`q${g.q} ${g.nm.padEnd(6)} | ${g.aP50} → ${g.bP50} ms (${g.dP50 > 0 ? "+" : ""}${g.dP50} %) | ${g.aP95} → ${g.bP95} ms (${g.dP95 > 0 ? "+" : ""}${g.dP95} %) | ${g.aFps} → ${g.bFps}`);
console.log(`Ladegröße ${A.name}: ${(PA.load.gz / 1024).toFixed(1)} KB gzip (${PA.load.n} Dateien, extern ${PA.load.ext}) · ${B.name}: ${(PB.load.gz / 1024).toFixed(1)} KB gzip (${PB.load.n} Dateien, extern ${PB.load.ext})`);
console.log("Fehler:", errors.length, errors.slice(0, 3).join(" | "));
