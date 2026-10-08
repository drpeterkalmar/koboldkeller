// Koboldkeller 2 — Technik: Live-Prüfung nach dem Push (GitHub Pages). Wartet, bis die Seite die erwartete ?v= ausliefert,
// lädt sie in Chromium (GPU, stumm), startet ein Spiel, wechselt die Ebene über die Blende und meldet Endbild/Takt/Worker/Fehler.
// node tools/technik_live.mjs --v=13.4 [--url=https://drpeterkalmar.github.io/koboldkeller/] [--warte=300]
import { loadPlaywright } from "./pw.mjs";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const URL0 = arg("url", "https://drpeterkalmar.github.io/koboldkeller/"), V = arg("v", ""), WARTE = +arg("warte", 300);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let html = "", t0 = Date.now();
while (Date.now() - t0 < WARTE * 1000) {
  html = await (await fetch(URL0 + "index.html?nocache=" + Date.now(), { cache: "no-store" })).text().catch(() => "");
  if (!V || html.includes("?v=" + V + '"')) break;
  await sleep(10000);
}
const vOk = !V || html.includes("?v=" + V + '"');
console.log(`Live-HTML ${vOk ? "hat" : "hat NICHT"} ?v=${V} (nach ${Math.round((Date.now() - t0) / 1000)} s)`);
const { chromium } = loadPlaywright();
const b = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"] });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
const page = await ctx.newPage(), fehler = [];
page.on("pageerror", (e) => fehler.push(e.message));
page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
await page.goto(URL0 + "?nocache=" + Date.now());
await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 60000 });
await sleep(1500);
const r = await page.evaluate(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms)), G = KK.G;
  KK.start({ name: "Live" }); KK.god(true); await w(1500);
  await new Promise((res) => G.hooks.fade(() => { KK.goto(3); res(); }));
  await w(2500);
  const imports = [...document.querySelectorAll('script[type="importmap"]')].map((s) => JSON.parse(s.textContent).imports["./src/main.js"]);
  return { main: imports[0], post: KK.post ? KK.post().an : null, grund: KK.post ? KK.post().grund : null, takt: KK.takt ? KK.takt().an : null,
    worker: KK.worker ? { an: KK.worker().an, geliefert: KK.worker().geliefert, fehler: KK.worker().fehler } : null, tiefe: G.depth, bilder: KK.perf().frames,
    musik: KK.audio().track };
});
await page.screenshot({ path: "shots/technik/live_" + (V || "x") + ".png" });
await b.close();
console.log(JSON.stringify(r), "· Fehler:", fehler.length, fehler.slice(0, 3).join(" | "));
process.exit(vOk && !fehler.length && r.tiefe === 3 ? 0 : 1);
