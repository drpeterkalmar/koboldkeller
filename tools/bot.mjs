// Autoplay-Bot: spielt wie ein Kind (Tap auf Gegner, Tap zur Treppe) durch alle Ebenen.
// node tools/bot.mjs [port] [bisEbene] [speed]
import { loadPlaywright } from "./pw.mjs";
const port = process.argv[2] || 8731, maxD = +(process.argv[3] || 20), speed = +(process.argv[4] || 4);
const { chromium } = loadPlaywright();
const flags = ["--disable-gpu-vsync", "--disable-frame-rate-limit", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"];
const b = await chromium.launch({ channel: "chromium", args: flags });
const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.KK && KK.G.L);
await page.evaluate((sp) => {
  KK.start({ tut: false, name: "Bot" }); KK.speed(sp);
  const G = KK.G;
  window.__bot = { log: [], deaths: 0, t0: G.t, lvT: G.t, lastD: 0, stuck: 0, lastPos: null, kills: 0 };
  const B = window.__bot;
  setInterval(() => {
    const p = G.p, L = G.L;
    if (G.screen === "dead") { B.deaths++; document.getElementById("btnRevive").click(); return; }
    if (G.screen !== "play") return;
    if (G.depth === 0) { const po = L.portals.filter(x => !x.locked).pop(); if (!p.path) p.path = [{ x: po.x, y: po.y }]; KK.G.p.path = null; KK.G.p.x = po.x; KK.G.p.y = po.y; return; }
    if (G.depth !== B.lastD) { B.log.push({ d: B.lastD, secs: +(G.t - B.lvT).toFixed(1), hp: Math.ceil(p.hp) + "/" + p.maxHp, lvl: p.lvl, atk: p.atk }); B.lastD = G.depth; B.lvT = G.t; }
    if (p.hp < p.maxHp * 0.35 && p.potions > 0) KK.potion();
    let best = null, bd = 5;
    for (const e of G.ents) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
    if (best) { if (p.foe !== best) { p.foe = best; p.path = null; } if (bd < 2.6) KK.attack(); if (Math.random() < 0.2) KK.bubbles(); return; }
    if (G.boss && G.depth < 20 && G.boss.awake === false) { /* weiter zur Treppe, Boss erwacht unterwegs */ }
    if (!p.path || !p.path.length) {
      const s = L.stairs;
      const { x, y } = s; p.foe = null;
      // wie ein Tap auf die Treppe
      const ev = KK.G; ev.p.path = null;
      window.__tap(x, y);
    }
    // Stuck-Erkennung
    const pos = Math.round(p.x * 10) + "," + Math.round(p.y * 10);
    if (pos === B.lastPos) B.stuck++; else B.stuck = 0;
    B.lastPos = pos;
    if (B.stuck > 40) { B.log.push({ d: G.depth, stuckAt: pos }); B.stuck = 0; p.path = null; }
  }, 100);
}, speed);
await page.evaluate(async () => { const m = await import("./src/game.js"); window.__tap = (x, y) => m.tapWorld(x, y, null); });
const start = Date.now();
let last = "";
while (Date.now() - start < 30 * 60 * 1000) {
  await page.waitForTimeout(3000);
  const s = await page.evaluate(() => ({ st: KK.state(), bot: window.__bot }));
  const line = `E${s.st.depth} Lv${s.st.lvl} HP${s.st.hp}/${s.st.maxHp} Gold${s.st.gold} Tode${s.bot.deaths} screen=${s.st.screen}`;
  if (line !== last) { console.log(((Date.now() - start) / 1000).toFixed(0) + "s " + line); last = line; }
  if (s.st.screen === "win" || s.st.depth > maxD || (maxD < 20 && s.st.depth >= maxD)) break;
}
const r = await page.evaluate(() => window.__bot);
console.log(JSON.stringify(r.log));
console.log("Tode:", r.deaths, "Fehler:", errs.length ? errs.join(" | ") : 0);
await page.screenshot({ path: "shots/neubau/_bot_end.png" });
await b.close();
