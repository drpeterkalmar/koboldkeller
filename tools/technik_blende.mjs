// Koboldkeller 2 — Technik E4: Ebenenwechsel über die Blende (wie Treppe) — wie lange bleibt die Blende zu, wie lang ist das
// längste Bild rund um den Wechsel (Ruckler), wie lang die längste Hauptthread-Aufgabe? v13 (alter Stand) gegen Worker/synchron.
// node tools/technik_blende.mjs [--alt=8732] [--neu=8731] [--throttle=4] [--profil=sw|gpu] [--n=6]
// → tests/perf/blende_<profil>.json + Tabelle auf der Konsole
import { loadPlaywright } from "./pw.mjs";
import { writeFileSync } from "node:fs";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const ALT = +arg("alt", 8732), NEU = +arg("neu", 8731), TH = +arg("throttle", 4), PROFIL = arg("profil", "sw"), N = +arg("n", 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { chromium } = loadPlaywright();
const b = await chromium.launch({ channel: "chromium", args: ["--use-angle=metal", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio",
  "--disable-background-timer-throttling", ...(PROFIL === "sw" ? ["--disable-accelerated-2d-canvas"] : [])] });
const ZIELE = [["v13", `http://localhost:${ALT}/index.html?auto=0`], ["worker", `http://localhost:${NEU}/index.html?auto=0`],
  ["synchron", `http://localhost:${NEU}/index.html?auto=0&worker=0`]];
const out = { profil: PROFIL, throttle: TH, ergebnisse: {} };
for (const [nm, url] of ZIELE) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(), errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(url); await p.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await sleep(1500);
  const cdp = await ctx.newCDPSession(p);
  await p.evaluate(() => { KK.start({ name: "Blende" }); KK.god(true); KK.goto(2); });
  await sleep(1500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: TH });
  const r = await p.evaluate(async (N) => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), G = KK.G, out = [];
    // längste Hauptthread-Aufgabe (Long Tasks API) und längster Bildabstand rund um jeden Wechsel
    let lt = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) lt = Math.max(lt, e.duration); }).observe({ entryTypes: ["longtask"] }); } catch (e) { }
    const tiefen = [3, 7, 11, 15, 18, 5, 9, 13];
    for (let i = 0; i < N; i++) {
      const d = tiefen[i % tiefen.length], fade = document.getElementById("fade"), t0 = performance.now();
      let maxGap = 0, last = performance.now(), on = true; lt = 0;
      const loop = () => { const n = performance.now(); maxGap = Math.max(maxGap, n - last); last = n; if (on) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      await new Promise((res) => G.hooks.fade(() => { KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9; res(); }));
      while (fade.classList.contains("on") && performance.now() - t0 < 5000) await w(5);
      const blende = performance.now() - t0;
      await w(1800); on = false;                                   // nach dem Aufblenden: Kobold steht, Chunks rundherum
      out.push({ d, blende: Math.round(blende), bildMax: Math.round(maxGap), aufgabeMax: Math.round(lt) });
    }
    return out;
  }, N);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const med = (k) => { const a = r.map((x) => x[k]).sort((x, y) => x - y); return a[a.length >> 1]; };
  out.ergebnisse[nm] = { einzel: r, blendeMed: med("blende"), bildMaxMed: med("bildMax"), aufgabeMaxMed: med("aufgabeMax"), fehler: errs };
  console.log(`${nm.padEnd(9)} Blende Median ${med("blende")} ms · längstes Bild Median ${med("bildMax")} ms · längste Aufgabe Median ${med("aufgabeMax")} ms · ${JSON.stringify(r.map((x) => [x.blende, x.bildMax, x.aufgabeMax]))}${errs.length ? " · Fehler " + errs[0] : ""}`);
  await ctx.close();
}
await b.close();
writeFileSync(`tests/perf/blende_${PROFIL}.json`, JSON.stringify(out, null, 1));
