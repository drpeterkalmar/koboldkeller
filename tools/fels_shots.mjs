// Koboldkeller 2 — v12 Fels-Hintergrund: Screenshots je Welt (Stadt + 5 Welten, hoch + quer, Boss-Zoom) und Anteil reiner
// Schwarz-Pixel (Helligkeit < 4 %). node tools/fels_shots.mjs [--port=8731] [--tag=nachher] [--q=fels=0]
// → shots/neubau/v12/<tag>_<name>_<hoch|quer>.png + <tag>.json
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { GPU_FLAGS } from "./checks_v9.mjs";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const PORT = +arg("port", 8731), TAG = arg("tag", "nachher"), Q = arg("q", ""), DIR = "shots/neubau/v12/";
mkdirSync(DIR, { recursive: true });
const SCENES = [["stadt", 0], ["moos", 1], ["kristall", 5], ["zucker", 9], ["frost", 13], ["glut", 17], ["boss_e4", 4], ["boss_e20", 20]];
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
const out = { tag: TAG, q: Q, shots: [] }, errors = [];
for (const [w, h] of [[412, 915], [915, 412]]) {
  const tag = w > h ? "quer" : "hoch";
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(tag + " " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(tag + " " + m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html${Q ? "?" + Q : ""}`);
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await page.evaluate(() => { KK.start({ name: "Fels" }); KK.god(true); });
  for (const [nm, d] of SCENES) {
    await page.evaluate(async (d) => {
      const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G;
      G.bossDone = []; KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9;
      if (d === 4 || d === 20) { const A = G.L.arena; KK.teleport(A.cx - 3, A.cy - 3); const t0 = performance.now(); while (!(G.boss && G.boss.awake && G.ents.includes(G.boss)) && performance.now() - t0 < 12000) await w(50); }
      await w(2900);                                           // Titelkarte ausblenden lassen
    }, d);
    const file = `${DIR}${TAG}_${nm}_${tag}.png`, raw = `${DIR}_spiel_${TAG}_${nm}_${tag}.png`;
    await page.screenshot({ path: file });
    // Messung nur am Spielbild (Canvas): HUD/Knöpfe kurz ausblenden
    await page.evaluate(() => { for (const el of document.body.children) if (el.id !== "cv") { el.dataset.v = el.style.visibility; el.style.visibility = "hidden"; } });
    await page.screenshot({ path: raw });
    await page.evaluate(() => { for (const el of document.body.children) if (el.id !== "cv") el.style.visibility = el.dataset.v || ""; });
    out.shots.push({ nm, tag, file, raw });
  }
  await ctx.close();
}
await browser.close();
// Anteil Schwarz-Pixel (Python/PIL)
const py = process.platform === "win32" ? "py" : "python3";
const res = JSON.parse(execFileSync(py, ["-c", `
import json,sys
from PIL import Image
r={}
for f in sys.argv[1:]:
  im=Image.open(f).convert("RGB"); px=im.getdata(); n=0
  for (a,b,c) in px:
    if 0.2126*a+0.7152*b+0.0722*c < 0.04*255: n+=1
  r[f]=round(100*n/len(px),1)
print(json.dumps(r))`, ...out.shots.map(s => s.raw)], { encoding: "utf8", maxBuffer: 1 << 24 }));
for (const s of out.shots) s.black = res[s.raw];
out.errors = errors;
writeFileSync(DIR + TAG + ".json", JSON.stringify(out, null, 2));
console.log(out.shots.map(s => `${s.nm}/${s.tag}: ${s.black} %`).join(" · "));
console.log("Fehler:", errors.length, errors.slice(0, 3).join(" | "));
