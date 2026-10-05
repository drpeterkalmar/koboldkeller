// Autoplay-Bot: spielt wie ein Kind mit etwas Übung (Tap auf Gegner/Treppe, Blasen solange Munition da ist,
// Spezial bei Gruppen/Boss, 💨 aus roten Warnkreisen/-linien, Tränke bei wenig ❤️, Talentpunkte verteilen).
// v8: Finger-Arbeit wie ein Kind — Lauf-Tipps nur auf eine SICHTBARE Stelle des Weges (Bildschirm, ohne HUD/Knöpfe),
// Tipp auf Gegner zählt ebenfalls; gemessen: Tipps + Lauf-Sekunden je Ebene (Näherung für „Finger halten“),
// Stadt: läuft per Tipp vom Brunnen zum Portal der tiefsten Ebene (kein Teleport) und misst die Zeit.
// node tools/bot.mjs [port] [bisEbene] [speed] [--secs=1800] [--mega] [--audio] [--out=name]
// Ergebnis: Schwierigkeitskurve pro Ebene (Spielzeit, erlittener Schaden, Tode, Tränke, Level) → shots/neubau/bot_<name>.json/.md
// --audio: Audio entsperren und alle 10 s Stimmen-Zähler protokollieren → Knoten-Leck-Test
import { loadPlaywright } from "./pw.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const pos = process.argv.slice(2).filter(a => !a.startsWith("--")), flag = k => process.argv.find(a => a.startsWith("--" + k));
const port = pos[0] || 8731, maxD = +(pos[1] || 20), speed = +(pos[2] || 4);
const SECS = flag("secs") ? +flag("secs").split("=")[1] : 30 * 60, AUD = !!flag("audio"), MEGA = !!flag("mega");
const OUT = flag("out") ? flag("out").split("=")[1] : (MEGA ? "mega" : "normal");
const MYTH = flag("myth") ? flag("myth").split("=")[1] : "";          // v9: Kostüm anziehen (z. B. --myth=phoenix) — nur Optik
const { chromium } = loadPlaywright();
const flags = [(process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default"), "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", ...(AUD ? ["--autoplay-policy=no-user-gesture-required"] : [])];
const b = await chromium.launch({ channel: "chromium", args: flags });
const page = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on("pageerror", e => errs.push((e.stack || e.message).split("\n").slice(0, 4).join(" ← ")));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.KK && KK.G.L);
if (AUD) { await page.touchscreen.tap(200, 300); await page.waitForFunction(() => KK.audio().pre.done && KK.audio().state === "running", null, { timeout: 30000 }); }
await page.evaluate(async () => {
  const v = "?v=" + window.KK_VER, m = await import("./src/game.js" + v), r = await import("./src/render.js" + v);
  window.__tap = (x, y) => m.tapWorld(x, y, null); window.__seg = m.segDist;
  // sichtbarer Bildschirmbereich ohne HUD oben und Knöpfe unten (Kind tippt nur, was es sieht)
  window.__vis = (x, y) => { const [sx, sy] = r.toScreen(x, y); return sx > 30 && sx < r.R.VW - 30 && sy > 140 && sy < r.R.VH - 230; };
});
await page.evaluate(([sp, mega]) => {
  KK.start({ tut: false, name: "Bot", mega }); KK.speed(sp);
  const G = KK.G;
  window.__bot = { lv: {}, deaths: 0, cur: 0, stuck: 0, lastPos: null, log: [], specials: 0, dodges: 0, fights: [], fight: null, maxMinions: 0, town: [], taps: 0, tapsEnemy: 0, walk: 0 };
  const B = window.__bot, order = ["leben", "kraft", "leben", "blasen", "kraft", "tempo", "leben", "kraft", "magnet"];
  let oi = 0;
  const L = (d) => B.lv[d] || (B.lv[d] = { d, secs: 0, dmg: 0, deaths: 0, pots: 0, tries: 0, arriveLvl: 0, arriveHp: "", done: false, taps: 0, tapsEnemy: 0, walk: 0 });
  const tap = (x, y) => { window.__tap(x, y); B.taps++; if (G.depth > 0) L(G.depth).taps++; };
  /** Kind-Tipp: weitester SICHTBARER Punkt auf dem Weg zum Ziel (nicht das Ziel hinter dem Bildschirmrand) */
  const tapToward = (x, y) => {
    if (window.__vis(x, y)) return tap(x, y);
    const path = KK.path(x, y); if (!path || !path.length) return tap(x, y);
    let best = null, ax = G.p.x, ay = G.p.y;
    walk: for (const q of path) { const l = Math.hypot(q.x - ax, q.y - ay), n = Math.max(1, Math.ceil(l / 0.4)); for (let i = 1; i <= n; i++) { const px = ax + (q.x - ax) * i / n, py = ay + (q.y - ay) * i / n; if (window.__vis(px, py)) best = { x: px, y: py }; else if (best) break walk; } ax = q.x; ay = q.y; }
    tap(best ? best.x : path[0].x, best ? best.y : path[0].y);
  };
  let lastT = G.t;
  setInterval(() => {
    const p = G.p, Lv = G.L;
    if (G.screen === "dead") { if (!B.rev) { B.rev = true; B.deaths++; if (B.cur) L(B.cur).deaths++; document.getElementById("btnRevive").click(); } return; }
    B.rev = false;
    if (G.screen === "win") { if (B.cur) L(B.cur).done = true; B.won = true; return; }
    if (G.screen !== "play") return;
    { const dt = G.t - lastT; lastT = G.t; if (p.moving && dt > 0 && dt < 3) { B.walk += dt; if (G.depth > 0) L(G.depth).walk += dt; } }
    // Talentpunkte verteilen (wie ein Kind im Rucksack)
    for (let k = 0; k < 9 && p.skPts > 0; k++) { if (KK.skill(order[oi % order.length])) {} oi++; }
    // Buchhaltung pro Ebene (Spielzeit + Schaden)
    if (G.depth !== B.cur) {
      if (B.cur && G.depth === B.cur + 1) L(B.cur).done = true;
      B.cur = G.depth; B.t = G.t; B.dmg0 = G.stats.dmgTaken; B.pot0 = G.stats.potionsUsed; B.wh0 = G.stats.wallHits || 0;
      if (G.depth > 0) { const r = L(G.depth); r.tries++; if (!r.arriveLvl) { r.arriveLvl = p.lvl; r.arriveHp = Math.ceil(p.hp) + "/" + p.maxHp; } }
    }
    if (G.depth > 0) { const r = L(G.depth); r.secs += G.t - B.t; r.dmg += G.stats.dmgTaken - B.dmg0; r.pots += G.stats.potionsUsed - B.pot0; r.wallHits = (r.wallHits || 0) + (G.stats.wallHits || 0) - B.wh0; B.t = G.t; B.dmg0 = G.stats.dmgTaken; B.pot0 = G.stats.potionsUsed; B.wh0 = G.stats.wallHits || 0; }
    // Bosskampf-Protokoll (v5): Dauer (Spielzeit ab Erwachen) + erlittener Schaden je Boss, Handlanger-Höchststand
    const bo = G.boss && G.ents.includes(G.boss) ? G.boss : null;
    if (bo && bo.awake && !B.fight) B.fight = { d: G.depth, name: bo.name, mini: !!bo.isMini, t0: G.t, dmg0: G.stats.dmgTaken, maxMin: 0, hp: bo.maxHp };
    if (B.fight) {
      const nm = G.ents.filter(e => e.minion).length + G.spawns.length; B.fight.maxMin = Math.max(B.fight.maxMin, nm); B.maxMinions = Math.max(B.maxMinions, nm);
      if (!bo || G.depth !== B.fight.d) { B.fights.push({ d: B.fight.d, name: B.fight.name, mini: B.fight.mini, secs: +(G.t - B.fight.t0).toFixed(1), dmg: Math.round(G.stats.dmgTaken - B.fight.dmg0), won: G.bossDone.includes(B.fight.d), maxMin: B.fight.maxMin, spawned: (Lv.arena && Lv.arena.spawned) || 0, hp: B.fight.hp }); B.fight = null; }
    }
    if (G.depth === 0) {                                   // Stadt: zu Fuß (Tipps) zum Portal der tiefsten erreichten Ebene
      const po = Lv.portals.filter(x => !x.locked).sort((a, b) => a.depth - b.depth).pop();
      if (!B.tw) B.tw = { t0: G.t, taps0: B.taps, depth: po.depth, from: { x: p.x, y: p.y } };
      if (!p.path || !p.path.length) tapToward(po.x, po.y);
      if (G.t - B.tw.t0 > 60) { B.log.push({ d: 0, stuckAt: "Stadt" }); p.x = po.x; p.y = po.y; }
      return;
    }
    if (B.tw) { B.town.push({ to: B.tw.depth, secs: +(G.t - B.tw.t0).toFixed(2), taps: B.taps - B.tw.taps0 }); B.tw = null; }
    // aus Warnkreisen/-linien raus
    for (const t of G.teles) if (t.seen === undefined) t.seen = Math.random() < 0.7;   // Kind bemerkt ~70 % der Warnungen
    const inTele = G.teles.some(t => t.seen && t.t >= 0 && t.dmg && t.t / t.max > 0.35 && (t.kind === "line" ? window.__seg(p.x, p.y, t.x, t.y, t.x2, t.y2) < t.w / 2 + 0.3 : Math.hypot(p.x - t.x, p.y - t.y) < t.r + 0.3));
    if (inTele && p.dashCd <= 0) { if (KK.dodge()) B.dodges++; return; }
    // v8: Wandfallen — Vorwarnung (Glühen + Bodenlinie) bemerkt ein Kind meist (70 %): zur Seite treten; fliegt das Geschoss schon
    // knapp heran: 💨. Zählt Treffer durch Wandfallen je Ebene.
    for (const w of (Lv.wallTraps || [])) {
      if (w.st !== 1) { w.seen = undefined; continue; }
      if (w.seen === undefined) w.seen = Math.random() < 0.7;
      const onLane = window.__seg(p.x, p.y, w.x0, w.y0, w.x1, w.y1) < 0.8;
      if (w.seen && onLane && !B.aside) {
        for (const k of [1.7, -1.7]) { const tx = p.x + w.dy * k, ty = p.y + w.dx * k; const pa = KK.path(tx, ty); if (pa && pa.length <= 2) { tap(tx, ty); p.foe = null; B.aside = G.t + 0.9; B.asides = (B.asides || 0) + 1; break; } }
      }
    }
    if (B.aside && G.t > B.aside) B.aside = 0;
    if (B.aside) return;
    for (const s of G.shots) if (s.kind === "wall" && p.dashCd <= 0) {
      const d = Math.hypot(s.x - p.x, s.y - p.y), toward = (p.x - s.x) * s.vx + (p.y - s.y) * s.vy > 0;
      if (d < 1.6 && toward && window.__seg(p.x, p.y, s.x, s.y, s.x + s.vx, s.y + s.vy) < 0.6 && Math.random() < 0.5) { if (KK.dodge()) B.dodges++; return; }
    }
    if (p.hp < p.maxHp * 0.35 && p.potions > 0) KK.potion();
    let best = null, bd = 5, near = 0;
    for (const e of G.ents) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 5.5) near++; if (d < bd) { bd = d; best = e; } }
    // wacher Boss: auf ihn gehen, außer ein Handlanger steht direkt daneben
    if (bo && bo.awake && (!best || bd > 2.2)) { best = bo; bd = Math.hypot(bo.x - p.x, bo.y - p.y); }
    if (p.spec >= 1 && (near >= 3 || (G.boss && G.boss.awake && Math.hypot(G.boss.x - p.x, G.boss.y - p.y) < 5))) { if (KK.special()) B.specials++; }
    if (best) { if (p.foe !== best) { p.foe = best; p.path = null; B.tapsEnemy++; L(G.depth).tapsEnemy++; } if (bd < 2.6) KK.attack(); if (p.ammo > 0 && Math.random() < 0.25) KK.bubbles(); return; }
    const st = Lv.stairs;
    if (!st.sealed && !st.armed && Math.hypot(st.x - p.x, st.y - p.y) < 1.3) {   // stand beim Entsiegeln drauf: einmal runter
      if (!p.path || !p.path.length) { p.foe = null; const f = KK.path(st.x + 2.2, st.y - 2.2) ? { x: st.x + 2.2, y: st.y - 2.2 } : { x: st.x - 2.2, y: st.y - 2.2 }; tap(f.x, f.y); }
    } else if (!p.path || !p.path.length) { p.foe = null; const tg = st.sealed && G.boss ? G.boss : st; tapToward(tg.x, tg.y); }   // v11: versiegelt → zur Arenamitte (dort wächst der Boss heraus)
    const ps = Math.round(p.x * 10) + "," + Math.round(p.y * 10);
    if (ps === B.lastPos) B.stuck++; else B.stuck = 0;
    B.lastPos = ps;
    if (B.stuck > 40) {                                     // Hänger: 4 s ohne Bewegung, obwohl kein Gegner nah ist → Zustand protokollieren
      const ne = G.ents.reduce((a, e) => Math.min(a, Math.hypot(e.x - p.x, e.y - p.y)), 99);
      B.log.push({ d: G.depth, stuckAt: ps, path: p.path ? p.path.map(q => q.x.toFixed(1) + "," + q.y.toFixed(1)).join(" ") : null, foe: p.foe ? p.foe.type : null, near: +ne.toFixed(1), aside: B.aside, stairs: [Lv.stairs.x, Lv.stairs.y], sealed: !!Lv.stairs.sealed, armed: !!Lv.stairs.armed, v: +Math.hypot(p.vx, p.vy).toFixed(2) });
      B.stuck = 0; p.path = null;
    }
  }, 100);
}, [speed, MEGA]);
if (MYTH) console.log("Kostüm:", await page.evaluate((id) => { KK.unlock(id); return KK.wear(id); }, MYTH));
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
const md = ["| Ebene | Versuche | Spielzeit s | Lauf s | Lauf-Tipps | Gegner-Tipps | Schaden | Wandfallen-Treffer | Tode | Tränke | Level bei Ankunft | ❤️ bei Ankunft |", "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map(x => `| ${x.d} | ${x.tries} | ${x.secs.toFixed(0)} | ${(x.walk || 0).toFixed(0)} | ${x.taps || 0} | ${x.tapsEnemy || 0} | ${Math.round(x.dmg)} | ${x.wallHits || 0} | ${x.deaths} | ${x.pots} | ${x.arriveLvl} | ${x.arriveHp} |`),
  `| **Σ** | | ${rows.reduce((a, x) => a + x.secs, 0).toFixed(0)} | ${rows.reduce((a, x) => a + (x.walk || 0), 0).toFixed(0)} | ${rows.reduce((a, x) => a + (x.taps || 0), 0)} | ${rows.reduce((a, x) => a + (x.tapsEnemy || 0), 0)} | ${Math.round(rows.reduce((a, x) => a + x.dmg, 0))} | ${rows.reduce((a, x) => a + (x.wallHits || 0), 0)} | ${rows.reduce((a, x) => a + x.deaths, 0)} | | | |`,
  "", "Stadt → Portal (zu Fuß, Spielzeit s / Tipps): " + (r.town.map(t => `E${t.to} ${t.secs} s/${t.taps}`).join(" · ") || "–"),
  "", "| Boss-Ebene | Boss | Art | ❤️ | Kampfdauer s | Schaden | besiegt | max. Handlanger | Handlanger gesamt |", "|---|---|---|---|---|---|---|---|---|",
  ...r.fights.map(f => `| ${f.d} | ${f.name} | ${f.mini ? "Mini" : "Haupt"} | ${f.hp ?? "–"} | ${f.secs} | ${f.dmg} | ${f.won ? "ja" : "nein"} | ${f.maxMin} | ${f.spawned ?? "–"} |`)].join("\n");
mkdirSync("shots/neubau", { recursive: true });
writeFileSync(`shots/neubau/bot_${OUT}.json`, JSON.stringify({ date: new Date().toISOString(), ver: await page.evaluate(() => window.KK_VER), myth: await page.evaluate(() => KK.myths().wearing), mega: MEGA, speed, won: !!r.won, deaths: r.deaths, specials: r.specials, dodges: r.dodges, final: r.st, rows, fights: r.fights, maxMinions: r.maxMinions, town: r.town, taps: r.taps, tapsEnemy: r.tapsEnemy, walk: r.walk, stuck: r.log, errors: errs }, null, 2));
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
