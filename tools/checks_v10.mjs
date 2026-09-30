// Koboldkeller 2 — v10-Check V32: Oma Pilzhut gibt beim Vorbeigehen Tipps (Peter 30.09.2026).
// Prüft: Tipp als Sprechblase beim Näherkommen, nicht erneut beim Stehenbleiben, 20-s-Sperre, neuer Tipp nach Weggehen +
// Wiederkommen, passender Tipp (Talentpunkte frei), kein Tipp während des Tutorials, Antippen zeigt ebenfalls die Blase,
// Screenshots hoch + quer (Blase im Bild). Screenshots → shots/neubau/v10/.
// Wird von tools/check.mjs aufgerufen; einzeln: node tools/checks_v10.mjs [--port=8731]
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GPU_FLAGS } from "./checks_v9.mjs";

const V10 = "shots/neubau/v10/";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function runV10({ browser, BASE, R, errors }) {
  mkdirSync(V10, { recursive: true });
  for (const [w, h] of [[412, 915], [915, 412]]) {
    const tag = w > h ? "quer" : "hoch";
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push("v10 " + tag + " pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error") errors.push("v10 " + tag + " console: " + m.text()); });
    await page.goto(BASE + "index.html");
    await page.waitForFunction(() => window.KK && window.KK.G && window.KK.G.L, null, { timeout: 30000 });
    await sleep(300);
    const res = await page.evaluate(async () => {
      const G = KK.G, w = ms => new Promise(r => setTimeout(r, ms));
      const at = (dx, dy) => { const n = G.L.npc; KK.teleport(n.x + dx, n.y + dy); };
      const out = {};
      // Tutorial läuft (Profil tut:false = Tutorial noch nicht gesehen): Oma schweigt im Vorbeigehen (das Tutorial-Fenster spricht)
      KK.start({ tut: false, name: "Omatest" });
      out.tutStep1 = G.tutStep;
      at(6, 0); await w(250); at(1.2, 0.6); await w(400);
      out.tutQuiet = G.tutStep >= 0 && !G.omaSay;
      // Tutorial schon gesehen (Standard)
      KK.start({ name: "Omatest" });
      out.tutStep2 = G.tutStep;
      at(6, 0); await w(300);
      out.farQuiet = G.tutStep === -1 && !G.omaSay;
      at(1.2, 0.6); await w(400);
      out.first = G.omaSay ? G.omaSay.text : null;
      const t1 = G.omaTipT;
      await w(600); out.stayNoNew = G.omaTipT === t1;                      // Stehenbleiben: kein neuer Tipp
      at(6, 0); await w(300); at(1.2, 0.6); await w(400);
      out.cooldown = G.omaTipT === t1;                                     // < 20 s: keine neue Blase
      KK.speed(8); G.omaSay = null; at(6, 0);
      const tWait = G.t, r0 = Date.now(); while (G.t - tWait < 21 && Date.now() - r0 < 20000) await w(100);   // 20 s Spielzeit vergehen lassen
      KK.speed(1);
      G.p.skPts = 2;
      at(1.2, 0.6); await w(400);
      out.second = G.omaSay ? G.omaSay.text : null;
      out.secondNew = G.omaTipT !== t1;
      out.talent = !!out.second && out.second.includes("Talentpunkt");
      out.lines = G.omaSay && G.omaSay.lines ? G.omaSay.lines.length : 0;
      out.boxW = G.omaSay ? Math.round(G.omaSay.w) : 0;
      out.inView = G.omaSay ? G.omaSay.w <= window.innerWidth - 16 : false;
      KK.teleport(G.L.npc.x + 2.0, G.L.npc.y - 1.6);                        // fürs Foto neben die Oma (sonst verdeckt der Kobold sie)
      return out;
    });
    await sleep(200);
    await page.screenshot({ path: V10 + "oma_tipp_" + tag + ".png" });
    // Antippen der Oma zeigt ebenfalls die Blase (statt Toast) — echter Touch auf ihre Bildschirmposition
    const tap = await page.evaluate(async () => {
      const G = KK.G, w = ms => new Promise(r => setTimeout(r, ms));
      G.omaSay = null; G.omaTipT = -1e9;
      const n = G.L.npc; KK.teleport(n.x + 2.2, n.y + 0.4); await w(300);
      return { toastsBefore: document.querySelectorAll(".toast").length };
    });
    const pos = await page.evaluate(() => { const n = KK.G.L.npc; const c = document.querySelector("canvas"); const r = c.getBoundingClientRect();
      return window.KK.screenOf ? window.KK.screenOf(n.x, n.y) : null; });
    let tapped = null;
    if (pos) { await page.touchscreen.tap(pos[0], pos[1] - 4); await sleep(300); tapped = await page.evaluate(() => !!KK.G.omaSay); }
    R("V32" + (tag === "hoch" ? "" : "q"), "Oma Pilzhut gibt beim Vorbeigehen Tipps (" + tag + "): Sprechblase beim Näherkommen, nicht im Tutorial, " +
      "nicht beim Stehenbleiben, 20-s-Sperre, passender Tipp (Talentpunkte), Blase im Bild" + (pos ? ", Antippen" : ""),
      res.tutQuiet && res.farQuiet && !!res.first && res.stayNoNew && res.cooldown && res.secondNew && res.talent && res.inView && (tapped === null || tapped === true),
      `Tutorial still ${res.tutQuiet} (Schritt ${res.tutStep1}) · weit weg still ${res.farQuiet} (Schritt ${res.tutStep2}) · 1. „${(res.first || "–").slice(0, 40)}…“ · Stehen ${res.stayNoNew} · Sperre ${res.cooldown} · ` +
      `2. „${(res.second || "–").slice(0, 40)}…“ · ${res.lines} Zeilen, ${res.boxW} px · Antippen ${tapped === null ? "nicht geprüft" : tapped} · Toasts vorher ${tap.toastsBefore}`);
    await ctx.close();
  }
}

// ---------- einzeln ausführen ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k)); return a ? a.split("=")[1] : d; };
  const BASE = `http://localhost:${arg("port", 8731)}/`;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
  const results = [], errors = [];
  const R = (id, name, pass, value = "") => { results.push({ id, pass: !!pass }); console.log((pass ? "PASS " : "FAIL ") + id.padEnd(5) + " " + name + (value !== "" ? "  → " + value : "")); };
  try { await runV10({ browser, BASE, R, errors }); }
  finally { await browser.close(); }
  console.log("Fehler: " + (errors.length ? errors.join(" | ") : 0));
  const pass = results.filter(r => r.pass).length;
  console.log(`${pass}/${results.length} PASS`);
  process.exit(pass === results.length && !errors.length ? 0 : 1);
}
