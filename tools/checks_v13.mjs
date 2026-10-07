// Koboldkeller 2 — v13-Checks (Deko: mehr Details und Eye Candy, ressourcenschonend; Peter 05.10.2026)
// V35:  Deko an (Standard): Boden-Deko, Wand-Deko, Lichtstrahlen, Weltfarben-Vignette je Welt vorhanden · ?deko=0: nichts davon (Aussehen wie v12)
// V35b: Spielmechanik unberührt: gleiche Zufallsfolge → gleiche Beute/Gegner/Gold mit und ohne Deko (Optik nutzt eigenen Zufall)
// V35c: „Bewegung reduzieren“ (prefers-reduced-motion): erkannt, Wackeln ≤ 35 % · Tab versteckt → kein Zeichnen
// V35d: Speicher/Laden: Sprite-Cache nach allen Welten höchstens +40 Einträge ggü. ?deko=0 (Wand-Deko nur der aktuellen Ebene), Ladegröße gzip ≤ +1 MB ggü. v12 (1112 KB), keine externen Requests
// V35e: (nur einzeln, Software-Raster + CPU 4×) Effekte pro Frame an/aus im Wechsel, gleiche Seite: Δp50 ≤ 10 % auf Stufe 0, ≤ 3 % auf Stufe 3
// Wird von tools/check.mjs (Teil 2) aufgerufen; einzeln: node tools/checks_v13.mjs [--port=8731] [--perf=1]
import { loadPlaywright } from "./pw.mjs";
import { gzipSync } from "node:zlib";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GPU_FLAGS } from "./checks_v9.mjs";

const DIR = "tests/shots/deko/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SEED = () => { Math.random = (() => { let s = 4242; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); })(); };

async function page0(browser, BASE, errors, q = "", opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT", ...opt });
  if (opt.seed) await ctx.addInitScript(SEED);
  const page = await ctx.newPage();
  const ext = [];
  page.on("pageerror", e => errors.push("v13 " + q + " pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("v13 " + q + " console: " + m.text()); });
  page.on("request", r => { if (!r.url().startsWith(BASE)) ext.push(r.url()); });
  await page.goto(BASE + "index.html" + (q ? "?" + q : ""));
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  return { ctx, page, ext };
}
/** alle Welten besuchen, Deko-Zustand je Welt */
const TOUR = async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  KK.start({ name: "Deko" }); KK.god(true);
  for (const d of [0, 1, 4, 5, 9, 13, 17, 20]) { KK.goto(d); await w(500); out.push({ d, ...KK.deko() }); }
  return out;
};
/** Spiel-Zufall: synchron (ohne Frames dazwischen) Ebene bauen, alle Gegner besiegen, Beute + Gold festhalten */
const LOOT = () => {
  KK.start({ name: "Zufall", seed: 99 }); KK.god(true);
  const out = [];
  for (const d of [3, 7, 11]) {
    KK.goto(d);
    const ents = KK.G.ents.filter(e => e.type !== "dummy").map(e => e.type + "@" + e.x.toFixed(2) + "," + e.y.toFixed(2));
    KK.kill("all");
    out.push({ d, ents, items: KK.G.items.map(i => i.kind + "@" + i.x.toFixed(2) + "," + i.y.toFixed(2)).join(" "), gold: KK.G.gold, r: Math.random() });
  }
  return out;
};

export async function runV13({ browser, BASE, R, errors, perf = false, perfBrowser = null }) {
  mkdirSync(DIR, { recursive: true });
  const res = {};
  // V35 — Deko an / aus
  {
    const A = await page0(browser, BASE, errors, ""), B = await page0(browser, BASE, errors, "deko=0");
    const on = await A.page.evaluate(TOUR), off = await B.page.evaluate(TOUR);
    // Lichtblitz bei Treffer nur mit Deko
    const fl = async p => p.evaluate(async () => { KK.goto(1); KK.spawn("slime", 1, 0); for (const e of KK.G.ents) e.hp = e.maxHp = 1e6; await new Promise(r => setTimeout(r, 300)); KK.attack(); let mx = 0; const t0 = performance.now(); while (performance.now() - t0 < 700) { mx = Math.max(mx, KK.FX.lights.length); await new Promise(r => requestAnimationFrame(r)); } return mx; });
    const flOn = await fl(A.page), flOff = await fl(B.page);
    res.on = on; res.off = off; res.art = { on: on[on.length - 1].art, off: off[off.length - 1].art }; res.ext = [...A.ext, ...B.ext];
    const dun = on.filter(s => s.d > 0);
    const okOn = dun.every(s => s.walls > 0 && s.floor > 20 && s.vign) && dun.filter(s => s.shafts > 0).length >= 5 && on.find(s => s.d === 17).glow > 0 && flOn > 0;
    const okOff = off.every(s => s.walls === 0 && s.shafts === 0 && s.floor === 0 && !s.vign && s.glow === 0) && flOff === 0;
    R("V35", "Deko an: Boden-Deko, Wand-Deko, Lichtstrahlen, Weltfarben-Vignette, Lichtblitz je Welt · ?deko=0: nichts davon (wie v12)", okOn && okOff,
      "an: " + dun.map(s => `E${s.d} Wand ${s.walls}/${s.wallsAll}, Boden ${s.floor}, Strahlen ${s.shafts}, Glühen ${s.glow}, Glanz ${s.shine}`).join(" · ") + ` · Lichtblitze ${flOn} | aus: Wand ${off.map(s => s.walls).join("/")}, Strahlen ${off.map(s => s.shafts).join("/")}, Lichtblitze ${flOff}`);
    await A.ctx.close(); await B.ctx.close();
  }
  // V35b — gleiche Zufallsfolge → gleiche Beute (Optik nutzt eigenen Zufall)
  {
    const A = await page0(browser, BASE, errors, "", { seed: true }), B = await page0(browser, BASE, errors, "deko=0", { seed: true });
    // Menü-Hintergrund verbraucht pro Frame Zufall → Zufall direkt vor dem Test im selben Takt neu setzen
    const run = p => p.evaluate(`(${SEED.toString()})(); (${LOOT.toString()})()`);
    const a = await run(A.page), b = await run(B.page);
    const same = JSON.stringify(a) === JSON.stringify(b);
    R("V35b", "Spielmechanik unberührt: gleiche Zufallsfolge → gleiche Gegner, Beute, Gold, Folge-Zufall (mit und ohne Deko)", same,
      a.map((x, i) => `E${x.d}: ${x.ents.length} Gegner, ${x.items.split(" ").length} Beute, 🪙 ${x.gold} ${JSON.stringify(x) === JSON.stringify(b[i]) ? "gleich" : "VERSCHIEDEN"}`).join(" · "));
    await A.ctx.close(); await B.ctx.close();
  }
  // V35c — Bewegung reduzieren + Tab versteckt
  {
    const amp = async opt => { const P = await page0(browser, BASE, errors, "", opt); const r = await P.page.evaluate(async () => {
      KK.start({ name: "Ruhe" }); KK.god(true); KK.goto(2); await new Promise(r => setTimeout(r, 600));
      let mx = 0; for (let i = 0; i < 40; i++) { KK.FX.trauma = 1; await new Promise(r => requestAnimationFrame(r)); mx = Math.max(mx, Math.hypot(KK.R.shx, KK.R.shy)); }
      const calm = KK.deko().calm;
      KK.G.hidden = true; const t0 = KK.R.t; await new Promise(r => setTimeout(r, 400)); const t1 = KK.R.t; KK.G.hidden = false;
      return { mx: +mx.toFixed(2), calm, frozen: t1 === t0 }; }); await P.ctx.close(); return r; };
    const n = await amp({}), c = await amp({ reducedMotion: "reduce" });
    R("V35c", "„Bewegung reduzieren“: erkannt, Wackeln ≤ 35 % · versteckter Tab zeichnet nichts", c.calm && !n.calm && c.mx <= n.mx * 0.4 + 0.2 && n.frozen && c.frozen,
      `normal: Wackeln max ${n.mx} px · reduziert: ${c.mx} px (calm ${c.calm}) · versteckt: Zeichnen angehalten ${n.frozen && c.frozen}`);
    res.calm = { n, c };
  }
  // V35d — Speicher + Ladegröße + externe Requests
  {
    const html = readFileSync("index.html", "utf8"), files = ["index.html", "style.css", "manifest.webmanifest", ...[...html.matchAll(/"\.\/(src\/[a-z0-9]+\.js)\?v=\d+"/g)].map(m => m[1])];
    const uniq = [...new Set(files)];
    let gz = 0; for (const f of uniq) gz += gzipSync(readFileSync(f), { level: 9 }).length;
    let gzDeko = gzipSync(readFileSync("src/deko.js"), { level: 9 }).length;
    res.load = { files: uniq.length, codeGz: gz, dekoGz: gzDeko };
    const dArt = res.art.on - res.art.off;
    R("V35d", "Speicher + Laden: Sprite-Cache nach allen Welten ≤ +40 ggü. ?deko=0 · Code gzip ≤ +1 MB ggü. v12 · 0 externe Requests", dArt <= 40 && gzDeko < 1048576 && res.ext.length === 0,
      `Sprites ${res.art.on} vs. ${res.art.off} (Δ ${dArt}) · Code+HTML+CSS gzip ${(gz / 1024).toFixed(1)} KB, davon deko.js ${(gzDeko / 1024).toFixed(1)} KB (Audio/Icons unverändert) · extern ${res.ext.length}`);
  }
  // V35e — Kosten pro Frame (nur mit eigenem Software-Raster-Browser)
  if (perf && perfBrowser) {
    const ctx = await perfBrowser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push("v13 perf pageerror: " + e.message));
    await page.goto(BASE + "index.html");
    await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
    await page.waitForFunction(() => KK.audio().pre && KK.audio().pre.done, null, { timeout: 90000 }).catch(() => { });
    const cdp = await ctx.newCDPSession(page);
    const out = {};
    for (const q of [0, 3]) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      await page.evaluate(async q => {
        const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G;
        clearInterval(window.__iv1); clearInterval(window.__iv2); clearInterval(window.__iv3);
        if (!window.__ft) { window.__ft = []; let last = 0; const tick = t => { if (last && window.__on) window.__ft.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
        window.__iv1 = setInterval(() => KK.perf(true), 1000);
        KK.start({ name: "Perf" }); KK.god(true); KK.goto(9); G.portalCd = 1e9; G.homeHideT = 1e9; KK.quality(q); await w(1800);
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; KK.spawn(["slime", "bat", "wisp", "pilzling"][k % 4], Math.cos(a) * 2.2, Math.sin(a) * 2.2); }
        for (const e of G.ents) e.hp = e.maxHp = 1e7;
        const x0 = G.p.x, y0 = G.p.y; let k = 0;
        window.__iv2 = setInterval(() => { k++; const p = KK.path(x0 + (k % 2 ? 2.5 : -2.5), y0 + (k % 2 ? 1 : -1)); if (p && p.length) G.p.path = p; }, 1300);
        window.__iv3 = setInterval(() => KK.attack(), 650);
      }, q);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const all = { on: [], off: [] };
      for (let i = 0; i < 6; i++) for (const on of i % 2 ? [false, true] : [true, false]) {
        await page.evaluate(on => KK.deko(on), on); await sleep(400);
        await page.evaluate(() => { window.__ft.length = 0; window.__on = true; }); await sleep(3000);
        all[on ? "on" : "off"].push(...await page.evaluate(() => { window.__on = false; return window.__ft.slice(); }));
      }
      const st = a => { a.sort((x, y) => x - y); return { p50: +a[a.length >> 1].toFixed(2), p95: +a[Math.floor(a.length * 0.95)].toFixed(2), n: a.length }; };
      out[q] = { on: st(all.on), off: st(all.off) };
      out[q].d50 = +((out[q].on.p50 / out[q].off.p50 - 1) * 100).toFixed(1); out[q].d95 = +((out[q].on.p95 / out[q].off.p95 - 1) * 100).toFixed(1);
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await ctx.close();
    res.perf = out;
    R("V35e", "Kosten pro Frame (Kampf, Software-Raster, CPU 4×, an/aus im Wechsel): Δp50 ≤ 10 % auf Stufe 0, ≤ 3 % auf Stufe 3", out[0].d50 <= 10 && out[3].d50 <= 3,
      [0, 3].map(q => `Stufe ${q}: p50 ${out[q].off.p50} → ${out[q].on.p50} ms (${out[q].d50 > 0 ? "+" : ""}${out[q].d50} %), p95 ${out[q].off.p95} → ${out[q].on.p95} ms (${out[q].d95 > 0 ? "+" : ""}${out[q].d95} %)`).join(" · "));
  }
  writeFileSync(DIR + "v13.json", JSON.stringify(res, null, 2));
  return res;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=")[1] : d; };
  const PORT = +arg("port", 8731), PERF = arg("perf", "1") === "1", BASE = `http://localhost:${PORT}/`;
  const { chromium } = loadPlaywright();
  // einzeln: ein einziger Browser im Software-Raster (für V35e nötig, die übrigen Checks laufen darin genauso)
  const browser = await chromium.launch({ channel: "chromium", args: ["--disable-gpu", "--disable-accelerated-2d-canvas", ...GPU_FLAGS.slice(3)] });
  const errors = [], res = [];
  const R = (id, name, pass, value = "") => { res.push({ id, name, pass: !!pass, value }); console.log((pass ? "PASS " : "FAIL ") + id.padEnd(5) + name + (value !== "" ? "  → " + value : "")); };
  await runV13({ browser, BASE, R, errors, perf: PERF, perfBrowser: browser });
  R("A1v13", "Keine Laufzeitfehler (V35)", errors.length === 0, errors.length ? errors.slice(0, 5).join(" | ") : "0");
  await browser.close();
  process.exit(res.every(r => r.pass) ? 0 : 1);
}
