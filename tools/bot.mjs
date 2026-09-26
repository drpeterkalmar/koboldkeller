// Autoplay-Bot: spielt wie ein Kind mit etwas Übung (Tap auf Gegner/Treppe, Blasen solange Munition da ist,
// Spezial bei Gruppen/Boss, 💨 aus roten Warnkreisen/-linien, Tränke bei wenig ❤️, Talentpunkte verteilen).
// node tools/bot.mjs [port] [bisEbene] [speed] [--secs=1800] [--mega] [--audio] [--out=name]
// Ergebnis: Schwierigkeitskurve pro Ebene (Spielzeit, erlittener Schaden, Tode, Tränke, Level) → shots/neubau/bot_<name>.json/.md
// --audio: Audio entsperren und alle 10 s Stimmen-Zähler protokollieren → Knoten-Leck-Test
import { loadPlaywright } from "./pw.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const pos = process.argv.slice(2).filter(a => !a.startsWith("--")), flag = k => process.argv.find(a => a.startsWith("--" + k));
const port = pos[0] || 8731, maxD = +(pos[1] || 20), speed = +(pos[2] || 4);
const SECS = flag("secs") ? +flag("secs").split("=")[1] : 30 * 60, AUD = !!flag("audio"), MEGA = !!flag("mega");
const OUT = flag("out") ? flag("out").split("=")[1] : (MEGA ? "mega" : "normal");
const { chromium } = loadPlaywright();
const flags = ["--disable-gpu-vsync", "--disable-frame-rate-limit", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", ...(AUD ? ["--autoplay-policy=no-user-gesture-required"] : [])];
const b = await chromium.launch({ channel: "chromium", args: flags });
const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on("pageerror", e => errs.push((e.stack || e.message).split("\n").slice(0, 4).join(" ← ")));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.KK && KK.G.L);
if (AUD) { await page.touchscreen.tap(200, 300); await page.waitForFunction(() => KK.audio().pre.done && KK.audio().state === "running", null, { timeout: 30000 }); }
await page.evaluate(async () => { const m = await import("./src/game.js"); window.__tap = (x, y) => m.tapWorld(x, y, null); window.__seg = m.segDist; });
await page.evaluate(([sp, mega]) => {
  KK.start({ tut: false, name: "Bot", mega }); KK.speed(sp);
  const G = KK.G;
  window.__bot = { lv: {}, deaths: 0, cur: 0, stuck: 0, lastPos: null, log: [], specials: 0, dodges: 0 };
  const B = window.__bot, order = ["leben", "kraft", "leben", "blasen", "kraft", "tempo", "leben", "kraft", "magnet"];
  let oi = 0;
  const L = (d) => B.lv[d] || (B.lv[d] = { d, secs: 0, dmg: 0, deaths: 0, pots: 0, tries: 0, arriveLvl: 0, arriveHp: "", done: false });
  setInterval(() => {
    const p = G.p, Lv = G.L;
    if (G.screen === "dead") { if (!B.rev) { B.rev = true; B.deaths++; if (B.cur) L(B.cur).deaths++; document.getElementById("btnRevive").click(); } return; }
    B.rev = false;
    if (G.screen === "win") { if (B.cur) L(B.cur).done = true; B.won = true; return; }
    if (G.screen !== "play") return;
    // Talentpunkte verteilen (wie ein Kind im Rucksack)
    for (let k = 0; k < 9 && p.skPts > 0; k++) { if (KK.skill(order[oi % order.length])) {} oi++; }
    // Buchhaltung pro Ebene (Spielzeit + Schaden)
    if (G.depth !== B.cur) {
      if (B.cur && G.depth === B.cur + 1) L(B.cur).done = true;
      B.cur = G.depth; B.t = G.t; B.dmg0 = G.stats.dmgTaken; B.pot0 = G.stats.potionsUsed;
      if (G.depth > 0) { const r = L(G.depth); r.tries++; if (!r.arriveLvl) { r.arriveLvl = p.lvl; r.arriveHp = Math.ceil(p.hp) + "/" + p.maxHp; } }
    }
    if (G.depth > 0) { const r = L(G.depth); r.secs += G.t - B.t; r.dmg += G.stats.dmgTaken - B.dmg0; r.pots += G.stats.potionsUsed - B.pot0; B.t = G.t; B.dmg0 = G.stats.dmgTaken; B.pot0 = G.stats.potionsUsed; }
    if (G.depth === 0) { const po = Lv.portals.filter(x => !x.locked).pop(); p.path = null; p.x = po.x; p.y = po.y; return; }
    // aus Warnkreisen/-linien raus
    for (const t of G.teles) if (t.seen === undefined) t.seen = Math.random() < 0.7;   // Kind bemerkt ~70 % der Warnungen
    const inTele = G.teles.some(t => t.seen && t.t >= 0 && t.dmg && t.t / t.max > 0.35 && (t.kind === "line" ? window.__seg(p.x, p.y, t.x, t.y, t.x2, t.y2) < t.w / 2 + 0.3 : Math.hypot(p.x - t.x, p.y - t.y) < t.r + 0.3));
    if (inTele && p.dashCd <= 0) { if (KK.dodge()) B.dodges++; return; }
    if (p.hp < p.maxHp * 0.35 && p.potions > 0) KK.potion();
    let best = null, bd = 5, near = 0;
    for (const e of G.ents) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 5.5) near++; if (d < bd) { bd = d; best = e; } }
    if (p.spec >= 1 && (near >= 3 || (G.boss && G.boss.awake && Math.hypot(G.boss.x - p.x, G.boss.y - p.y) < 5))) { if (KK.special()) B.specials++; }
    if (best) { if (p.foe !== best) { p.foe = best; p.path = null; } if (bd < 2.6) KK.attack(); if (p.ammo > 0 && Math.random() < 0.25) KK.bubbles(); return; }
    if (!p.path || !p.path.length) { p.foe = null; window.__tap(Lv.stairs.x, Lv.stairs.y); }
    const ps = Math.round(p.x * 10) + "," + Math.round(p.y * 10);
    if (ps === B.lastPos) B.stuck++; else B.stuck = 0;
    B.lastPos = ps;
    if (B.stuck > 40) { B.log.push({ d: G.depth, stuckAt: ps }); B.stuck = 0; p.path = null; }
  }, 100);
}, [speed, MEGA]);
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
  const s = await page.evaluate(() => ({ st: KK.state(), bot: { deaths: window.__bot.deaths, won: window.__bot.won } }));
  const line = `E${s.st.depth} Lv${s.st.lvl} HP${s.st.hp}/${s.st.maxHp} 🫧${s.st.ammo} Gold${s.st.gold} Tode${s.bot.deaths} screen=${s.st.screen}`;
  if (line !== last) { console.log(((Date.now() - start) / 1000).toFixed(0) + "s " + line); last = line; }
  if (s.bot.won || s.st.screen === "win" || (maxD < 20 && s.st.depth >= maxD)) break;
}
const r = await page.evaluate(() => ({ ...window.__bot, st: KK.state(), stats: KK.G.stats }));
const rows = Object.values(r.lv).sort((a, b) => a.d - b.d);
const md = ["| Ebene | Versuche | Spielzeit s | Schaden | Tode | Tränke | Level bei Ankunft | ❤️ bei Ankunft |", "|---|---|---|---|---|---|---|---|",
  ...rows.map(x => `| ${x.d} | ${x.tries} | ${x.secs.toFixed(0)} | ${Math.round(x.dmg)} | ${x.deaths} | ${x.pots} | ${x.arriveLvl} | ${x.arriveHp} |`)].join("\n");
mkdirSync("shots/neubau", { recursive: true });
writeFileSync(`shots/neubau/bot_${OUT}.json`, JSON.stringify({ date: new Date().toISOString(), mega: MEGA, speed, won: !!r.won, deaths: r.deaths, specials: r.specials, dodges: r.dodges, final: r.st, rows, stuck: r.log, errors: errs }, null, 2));
writeFileSync(`shots/neubau/bot_${OUT}.md`, md + "\n");
console.log(md);
console.log(`Ergebnis: ${r.won ? "GEWONNEN" : "nicht gewonnen"} · Tode ${r.deaths} · Spezial ${r.specials}× · Ausweichen ${r.dodges}× · Hänger ${r.log.length} · Fehler: ${errs.length ? errs.join(" | ") : 0}`);
if (AUD && samples.length >= 4) {
  const h = Math.floor(samples.length / 2), mx = a => Math.max(...a.map(x => x.voices)), first = mx(samples.slice(0, h)), second = mx(samples.slice(h));
  const leak = samples.some(x => x.open !== x.voices) || second > Math.max(first * 1.5, first + 12);
  console.log(`LECKTEST ${leak ? "FAIL" : "PASS"}: max. Stimmen 1. Hälfte ${first}, 2. Hälfte ${second}, offen==aktiv: ${samples.every(x => x.open === x.voices)}, gestartet gesamt ${samples.at(-1).started}`);
  if (leak) process.exitCode = 1;
}
await page.screenshot({ path: "shots/neubau/_bot_end.png" });
await b.close();
