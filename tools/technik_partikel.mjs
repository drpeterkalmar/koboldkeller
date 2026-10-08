// Koboldkeller 2 — Technik E1: Partikel gebündelt (?pbuendel=0 = v13) — Bild- und Zeitvergleich mit vielen drehbaren Partikeln.
// node tools/technik_partikel.mjs [--port=8731] [--n=600] [--throttle=4] [--profil=sw|gpu]
// → shots/technik/partikel_<pb0|pb1>.png + Konsole: draw()-Zeit (Median/p95) je Variante bei stehender Partikelwolke
import { loadPlaywright } from "./pw.mjs";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const PORT = +arg("port", 8731), N = +arg("n", 600), TH = +arg("throttle", 4), PROFIL = arg("profil", "sw");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { chromium } = loadPlaywright();
const ARGS = ["--use-angle=metal", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio", "--disable-gpu-vsync", "--disable-frame-rate-limit",
  ...(PROFIL === "sw" ? ["--disable-accelerated-2d-canvas"] : [])];
const browser = await chromium.launch({ channel: "chromium", args: ARGS });
const out = {};
for (const [nm, q] of [["pb0", "pbuendel=0"], ["pb1", ""], ["pb0", "pbuendel=0"], ["pb1", ""]]) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html?auto=0&post=0&${q}`);
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await sleep(1000);
  await page.evaluate(async (N) => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), G = KK.G, F = await import("./src/fx.js");
    KK.start({ name: "Partikel" }); KK.god(true); KK.goto(1); G.portalCd = 1e9; G.homeHideT = 1e9; await w(2800);
    G.ents.length = 0; KK.freeze(true); F.FX.budget = 1;
    const kinds = ["star", "star5", "conf", "rock", "streak"], cols = ["#ffd84a", "#7ad7ff", "#ff7ab8", "#9cff6a", "#fff"];
    let s = 99; const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let i = 0; i < N; i++) {
      const k = kinds[i % 5], a = r() * 6.283, d = 0.4 + r() * 3.2;
      F.part({ x: G.p.x + Math.cos(a) * d, y: G.p.y + Math.sin(a) * d, z: 10 + r() * 60, kind: k, col: cols[(i * 7) % 5], s0: 8 + r() * 10, s1: 8, life: 1e6, add: i % 3 !== 0, rot: r() * 6.283, vr: 0, drag: 0 });
    }
    await w(300); KK.perf(true);
  }, N);
  await sleep(500);
  if (!out[nm]) await page.screenshot({ path: `shots/technik/partikel_${nm}.png` });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: TH });
  await page.evaluate(() => KK.perf(true)); await sleep(4000);
  const p = await page.evaluate(() => ({ ...KK.perf(), parts: KK.FX.parts.length }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  (out[nm] = out[nm] || []).push({ drawMed: p.drawMed, drawP95: p.drawP95, n: p.drawN, parts: p.parts });
  await ctx.close();
}
await browser.close();
for (const k of Object.keys(out)) console.log(k, JSON.stringify(out[k]));
