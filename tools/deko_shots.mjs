// Koboldkeller 2 — v13 Deko: Rundgang-Bilder (Menü, Stadt, 5 Welten mit Kampf, Boss, Boss besiegt, Sieg), hoch + quer.
// node tools/deko_shots.mjs [--port=8731] [--tag=nachher] [--q=deko=0] [--only=moos,boss]
// → tests/shots/deko/<tag>_<szene>_<hoch|quer>.png (+ <tag>.json mit Fehlern)
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { GPU_FLAGS } from "./checks_v9.mjs";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const PORT = +arg("port", 8731), TAG = arg("tag", "nachher"), Q = arg("q", ""), ONLY = arg("only", ""), DIR = "tests/shots/deko/";
mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// [Name, Ebene, Art]  Art: "walk" = Kobold läuft kurz, "fight" = Gegner in der Nähe + Schlag, "boss", "bossdown", "win"
const SCENES = [["stadt", 0, "walk"], ["moos", 1, "fight"], ["kristall", 5, "fight"], ["zucker", 9, "walk"], ["frost", 13, "fight"], ["glut", 17, "walk"],
  ["boss", 4, "boss"], ["bossdown", 8, "bossdown"], ["sieg", 20, "win"]].filter(s => !ONLY || ONLY.split(",").includes(s[0]));
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
const out = { tag: TAG, q: Q, shots: [] }, errors = [];
for (const [w, h] of [[412, 915], [915, 412]]) {
  const tag = w > h ? "quer" : "hoch";
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
  await ctx.addInitScript(() => { Math.random = (() => { let s = 12345; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); })(); });   // gleiche Zufallsfolge vorher/nachher
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(tag + " " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(tag + " " + m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html${Q ? "?" + Q : ""}`);
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await sleep(1500);
  if (!ONLY || ONLY.includes("menu")) { const f = `${DIR}${TAG}_menu_${tag}.png`; await page.screenshot({ path: f }); out.shots.push({ nm: "menu", tag, file: f }); }
  await page.evaluate(() => { KK.start({ name: "Deko" }); KK.god(true); });
  for (const [nm, d, kind] of SCENES) {
    await page.evaluate(async ([d, kind]) => {
      const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G;
      G.bossDone = []; G.winQueued = false; KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9;
      if (d === 0) { KK.teleport("fountain"); G.p.x += 2.5; G.p.y += 1.5; }
      if (kind === "boss" || kind === "bossdown" || kind === "win") {
        const A = G.L.arena; KK.teleport(A.cx - 3, A.cy - 3);
        const t0 = performance.now(); while (!(G.boss && G.boss.awake && G.ents.includes(G.boss)) && performance.now() - t0 < 12000) await w(50);
      }
      await w(2700);                                          // Titelkarte/Banner ausblenden lassen
      if (kind === "fight") { for (const [dx, dy] of [[1.6, 0.4], [-1.2, 1.4], [0.6, -1.7]]) KK.spawn(G.B.id === "moos" ? "slime" : G.B.id === "kristall" ? "bat" : "wisp", dx, dy); await w(500); KK.attack(); await w(130); }
      if (kind === "walk") { G.p.path = [{ x: G.p.x + 2, y: G.p.y + 0.5 }]; await w(450); }
      if (kind === "boss") { G.p.x = G.boss.x - 2; G.p.y = G.boss.y - 2; await w(600); KK.attack(); await w(120); }
      if (kind === "bossdown") { KK.kill("boss"); await w(1100); }
      if (kind === "win") { KK.kill("boss"); const t0 = performance.now(); while (KK.state().screen !== "win" && performance.now() - t0 < 6000) await w(50); await w(1500); }
    }, [d, kind]);
    const file = `${DIR}${TAG}_${nm}_${tag}.png`;
    await page.screenshot({ path: file });
    out.shots.push({ nm, tag, file, depth: d });
    if (kind === "win") await page.evaluate(() => { const b = document.getElementById("btnWinTown"); if (b) b.click(); });
    await sleep(300);
  }
  await ctx.close();
}
await browser.close();
out.errors = errors;
writeFileSync(DIR + TAG + ".json", JSON.stringify(out, null, 2));
console.log("Bilder:", out.shots.length, "· Fehler:", errors.length, errors.slice(0, 3).join(" | "));
