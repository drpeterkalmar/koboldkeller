// Koboldkeller 2 — Technik-Etappe E3/E6: A/B-Bilder für das WebGL-Endbild (Kino-Look 2D), hoch + quer.
// node tools/technik_shots.mjs [--port=8731] [--tag=post] [--q=post=0] [--only=stadt,glut] [--qs=0] [--fmt=hoch,quer] [--engine=webkit]
// → shots/technik/<tag>_<szene>_q<stufe>_<hoch|quer>.png (+ <tag>.json mit Zustand von KK.post()/takt()/worker() und Fehlern)
// Szenen wie deko_shots (Stadt, Moos, Kristall, Frost, Glut, Boss), gleicher Zufall, Spielzeit vor dem Foto angehalten.
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const PORT = +arg("port", 8731), TAG = arg("tag", "post"), Q = arg("q", ""), ONLY = arg("only", ""), DIR = "shots/technik/";
const QS = arg("qs", "0").split(",").map(Number), FMTS = arg("fmt", "hoch,quer").split(",");
mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// WebKit kennt kein --mute-audio: Medien-Elemente (Musik/Töne laufen über <audio>) und WebAudio stumm schalten
const STUMM = () => {
  const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return p.call(this); };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const g = Object.getOwnPropertyDescriptor(AC.prototype.__proto__ || AC.prototype, "destination"); if (g && g.get) Object.defineProperty(AC.prototype, "destination", { get() { const d = g.get.call(this); if (!this.__stumm) { this.__stumm = this.createGain(); this.__stumm.gain.value = 0; this.__stumm.connect(d); } return this.__stumm; } }); }
};
// [Name, Ebene, Art]
const SCENES = [["stadt", 0, "walk"], ["moos", 1, "fight"], ["kristall", 5, "fight"], ["frost", 13, "fight"], ["glut", 17, "fight"], ["boss", 4, "boss"]]
  .filter((s) => !ONLY || ONLY.split(",").includes(s[0]));
const { chromium } = loadPlaywright();
// GPU über Metal (WebGL2 echt), stumm
const ARGS = [process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required", "--mute-audio"];
const ENGINE = arg("engine", "chromium");
const browser = ENGINE === "webkit" ? await loadPlaywright().webkit.launch() : await chromium.launch({ channel: "chromium", args: ARGS });
const out = { tag: TAG, q: Q, shots: [] }, errors = [];
for (const fmt of FMTS) {
  const [w, h] = fmt === "quer" ? [915, 412] : [412, 915];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: ENGINE === "webkit" ? undefined : true, locale: "de-AT" });
  await ctx.addInitScript(() => { Math.random = (() => { let s = 12345; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); })(); });
  if (ENGINE === "webkit") await ctx.addInitScript(STUMM);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(fmt + " " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(fmt + " " + m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html?auto=0${Q ? "&" + Q : ""}`);
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await sleep(1200);
  await page.evaluate(() => { KK.start({ name: "Technik" }); KK.god(true); });
  for (const q of QS) for (const [nm, d, kind] of SCENES) {
    await page.evaluate(async ([d, kind, q]) => {
      const w = (ms) => new Promise((r) => setTimeout(r, ms)), G = KK.G;
      { let s = 4242 + d; Math.random = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }
      KK.freeze(false);
      G.bossDone = []; G.winQueued = false; KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9; KK.quality(q);
      if (d === 0) { KK.teleport("fountain"); G.p.x += 2.5; G.p.y += 1.5; }
      if (kind === "boss") {
        const A = G.L.arena; KK.teleport(A.cx - 3, A.cy - 3);
        const t0 = performance.now(); while (!(G.boss && G.boss.awake && G.ents.includes(G.boss)) && performance.now() - t0 < 12000) await w(50);
      }
      await w(2700);
      if (kind === "fight") { for (const [dx, dy] of [[1.6, 0.4], [-1.2, 1.4], [0.6, -1.7]]) KK.spawn(["slime", "bat", "wisp"][(dx > 0) + (dy > 0)], dx, dy); await w(500); KK.attack(); await w(160); }
      if (kind === "walk") { G.p.path = [{ x: G.p.x + 2, y: G.p.y + 0.5 }]; await w(450); }
      if (kind === "boss") { G.p.x = G.boss.x - 2; G.p.y = G.boss.y - 2; await w(600); KK.attack(); await w(140); }
      KK.freeze(true); await w(250);
    }, [d, kind, q]);
    const file = `${DIR}${TAG}_${nm}_q${q}_${fmt}.png`;
    await page.screenshot({ path: file });
    const st = await page.evaluate(() => ({ post: KK.post ? KK.post() : null, takt: KK.takt ? KK.takt() : null, worker: KK.worker ? KK.worker() : null, rs: KK.R.RS, q: KK.R.q }));
    out.shots.push({ nm, fmt, q, file, depth: d, ...st });
    await page.evaluate(() => KK.freeze(false));
  }
  await ctx.close();
}
await browser.close();
out.errors = errors;
writeFileSync(DIR + TAG + ".json", JSON.stringify(out, null, 1));
const p0 = out.shots[0] && out.shots[0].post;
console.log("Bilder:", out.shots.length, "· Endbild:", p0 ? `${p0.an} (${p0.grund}${p0.fehler ? ": " + p0.fehler : ""})` : "–", "· RS", out.shots[0] && out.shots[0].rs, "· Fehler:", errors.length, errors.slice(0, 3).join(" | "));
