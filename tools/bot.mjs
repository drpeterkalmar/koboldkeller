// Autoplay-Bot: spielt wie ein Kind (Tap auf Gegner, Tap zur Treppe) durch alle Ebenen.
// node tools/bot.mjs [port] [bisEbene] [speed] [--secs=120] [--audio]
// --audio: Audio entsperren (Tap) und alle 10 s die Stimmen-Zähler (KK.audio()) protokollieren → Knoten-Leck-Test
import { loadPlaywright } from "./pw.mjs";
const pos = process.argv.slice(2).filter(a => !a.startsWith("--")), flag = k => process.argv.find(a => a.startsWith("--" + k));
const port = pos[0] || 8731, maxD = +(pos[1] || 20), speed = +(pos[2] || 4);
const SECS = flag("secs") ? +flag("secs").split("=")[1] : 30 * 60, AUD = !!flag("audio");
const { chromium } = loadPlaywright();
const flags = ["--disable-gpu-vsync", "--disable-frame-rate-limit", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", ...(AUD ? ["--autoplay-policy=no-user-gesture-required"] : [])];
const b = await chromium.launch({ channel: "chromium", args: flags });
const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.KK && KK.G.L);
if (AUD) { await page.touchscreen.tap(200, 300); await page.waitForFunction(() => KK.audio().pre.done && KK.audio().state === "running", null, { timeout: 30000 }); }
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
let last = "", nextA = 10;
const samples = [];
while (Date.now() - start < SECS * 1000) {
  await page.waitForTimeout(AUD ? 1000 : 3000);
  if (AUD && (Date.now() - start) / 1000 >= nextA) {
    nextA += 10;
    const a = await page.evaluate(() => KK.audio());
    samples.push({ t: Math.round((Date.now() - start) / 1000), voices: a.voices, loops: a.loops, open: a.started - a.ended, started: a.started, stolen: a.stolen, song: a.music.song, comb: a.music.comb });
    console.log("  Audio t=" + samples.at(-1).t + "s Stimmen " + a.voices + " (sfx " + a.byCat.sfx + ", mus " + a.byCat.mus + ", amb " + a.byCat.amb + ") Schleifen " + a.loops + " offen " + (a.started - a.ended) + " gestartet " + a.started + " Musik " + a.music.song + "/" + a.music.comb);
  }
  const s = await page.evaluate(() => ({ st: KK.state(), bot: window.__bot }));
  const line = `E${s.st.depth} Lv${s.st.lvl} HP${s.st.hp}/${s.st.maxHp} Gold${s.st.gold} Tode${s.bot.deaths} screen=${s.st.screen}`;
  if (line !== last) { console.log(((Date.now() - start) / 1000).toFixed(0) + "s " + line); last = line; }
  if (s.st.screen === "win" || s.st.depth > maxD || (maxD < 20 && s.st.depth >= maxD)) break;
}
const r = await page.evaluate(() => window.__bot);
console.log(JSON.stringify(r.log));
console.log("Tode:", r.deaths, "Fehler:", errs.length ? errs.join(" | ") : 0);
if (AUD && samples.length >= 4) {
  const h = Math.floor(samples.length / 2), mx = a => Math.max(...a.map(x => x.voices)), first = mx(samples.slice(0, h)), second = mx(samples.slice(h));
  const leak = samples.some(x => x.open !== x.voices) || second > Math.max(first * 1.5, first + 12);
  console.log(`LECKTEST ${leak ? "FAIL" : "PASS"}: max. Stimmen 1. Hälfte ${first}, 2. Hälfte ${second}, offen==aktiv: ${samples.every(x => x.open === x.voices)}, gestartet gesamt ${samples.at(-1).started}`);
  if (leak) process.exitCode = 1;
}
await page.screenshot({ path: "shots/neubau/_bot_end.png" });
await b.close();
