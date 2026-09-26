// Koboldkeller 2 — Akzeptanz-Check (CHECKS.md)
// node tools/check.mjs [--port=8731] [--throttle=4] [--no-perf] [--profile=gpu|software]
// Profil „gpu" (Standard): Chromium new-headless mit GPU-Raster (wie Canvas2D am Handy) und
// ungedrosseltem Frame-Takt (--disable-gpu-vsync/--disable-frame-rate-limit), weil headless-rAF
// sonst lastunabhängig auf ~10–25 Hz gedrosselt wird. FPS = gemessener Frame-Durchsatz.
// Zusätzlich wird das reine Software-Raster-Profil (ohne GPU) als Info gemessen.
// Android-Profil 412×915 @DPR2, hasTouch, isMobile; Querformat 915×412. Screenshots → shots/neubau/
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k)); if (!a) return d; const v = a.split("=")[1]; return v === undefined ? true : v; };
const PORT = +arg("port", 8731), THROTTLE = +arg("throttle", 4), PERF = !arg("no-perf", false), PROFILE = arg("profile", "gpu");
const FLAGS = ["--disable-gpu-vsync", "--disable-frame-rate-limit", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"];
const LAUNCH = PROFILE === "gpu" ? { channel: "chromium", args: FLAGS } : { args: FLAGS };
const BASE = `http://localhost:${PORT}/`;
const SHOTS = "shots/neubau/";
mkdirSync(SHOTS, { recursive: true });
const { chromium } = loadPlaywright();

const results = [];
const R = (id, name, pass, value = "") => { results.push({ id, name, pass: !!pass, value: String(value) }); console.log((pass ? "PASS " : "FAIL ") + id.padEnd(4) + " " + name + (value !== "" ? "  → " + value : "")); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Server prüfen ----------
{
  const r = await fetch(BASE + "index.html").catch(() => null);
  const t = r && await r.text();
  if (!t || !t.includes("Koboldkeller 2")) { console.error("Server auf Port " + PORT + " liefert nicht dieses Projekt!"); process.exit(2); }
}

const browser = await chromium.launch(LAUNCH);
console.log("Profil: " + PROFILE + " · Throttle-Test: " + THROTTLE + "×");
const errors = [], foreign = [];
async function newPage(w = 412, h = 915, init) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const tag = w > h ? "quer" : "hoch";
  page.on("pageerror", e => errors.push(tag + " pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(tag + " console: " + m.text()); });
  page.on("request", rq => { const u = rq.url(); if (!u.startsWith(BASE) && !u.startsWith("data:") && !u.startsWith("blob:")) foreign.push(u); });
  await page.goto(BASE + "index.html");
  await page.waitForFunction(() => window.KK && window.KK.G && window.KK.G.L, null, { timeout: 10000 });
  await sleep(500);
  return { ctx, page };
}
const S = (page) => page.evaluate(() => KK.state());
const shot = (page, name) => page.screenshot({ path: SHOTS + name + ".png" });
const tapEl = async (page, sel) => { const b = await page.locator(sel).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
async function waitFor(page, fn, arg, ms = 4000) { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } }

async function measureFps(page, label, secs = 5, warm = 1500) {
  await page.evaluate(() => {
    KK.god(true); KK.goto(3); KK.G.p.potions = 99; KK.G.portalCd = 1e9;
    const types = ["bat", "slime", "wichtel", "wisp", "kaefer", "pilzling"];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; KK.spawn(types[i % types.length], Math.cos(a) * 3.2, Math.sin(a) * 3.2); }
    window.__fpsT = setInterval(() => { KK.attack(); if (Math.random() < 0.3) KK.bubbles(); for (const e of KK.G.ents) if (e.hp < 3) e.hp = 30; }, 280);
  });
  await sleep(warm);
  await page.evaluate(() => KK.perf(true));
  await sleep(secs * 1000);
  const p = await page.evaluate(() => { clearInterval(window.__fpsT); return KK.perf(); });
  console.log("   FPS " + label + ": " + JSON.stringify(p));
  return p;
}

// =====================================================================
// 1) Hochformat: kompletter Flow
// =====================================================================
const { ctx, page } = await newPage();
const st0 = await S(page);
R("A10", "Audio erst nach Geste (vor Tap kein AudioContext)", st0.audio === "none", st0.audio);
const ver = await page.textContent("#verLabel");
const kver = await page.evaluate(() => window.KK_VER);
R("B1", "Versionslabel im Startmenü", /Koboldkeller 2 · v\d+/.test(ver) && ver.endsWith("v" + kver), ver);
await shot(page, "01_menu_hoch");

await tapEl(page, "#btnNew");
await sleep(500);
const rows = await page.evaluate(() => { const tops = {}; for (const el of document.querySelectorAll("#looks .look")) { const t = Math.round(el.getBoundingClientRect().top); tops[t] = (tops[t] || 0) + 1; } return Object.values(tops); });
R("B2", "Charakterwahl ≤ 4 Porträts pro Reihe (412 px)", rows.length >= 2 && Math.max(...rows) <= 4, "Reihen: " + rows.join("+"));
const nm = await page.inputValue("#nameInput");
R("B3", "Namensfeld mit Zufallsnamen vorbelegt", nm.trim().length > 0, nm);
await shot(page, "02_charakterwahl");
await page.fill("#nameInput", "<b>Zoe</b>");
await page.locator("#looks .look").nth(2).tap();
await tapEl(page, "#btnGo");
await waitFor(page, () => KK.state().screen === "play" && !KK.state().demo);
await sleep(900);
let st = await S(page);
R("A10b", "AudioContext läuft nach erster Geste", st.audio === "running", st.audio);
await shot(page, "03_stadt_tutorial");

// Tap-to-Move in der Stadt
const before = { x: st.x, y: st.y };
await page.touchscreen.tap(206, 300);
await sleep(1300);
st = await S(page);
R("B14a", "Tap-to-Move bewegt den Kobold", Math.hypot(st.x - before.x, st.y - before.y) > 1, `(${before.x},${before.y}) → (${st.x},${st.y})`);
// Virtueller Joystick (Touch-Drag links unten)
{
  const cdp = await ctx.newCDPSession(page);
  const p0 = await S(page);
  const tp = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 7 }] });
  await tp("touchStart", 90, 800); await sleep(60);
  for (let i = 1; i <= 6; i++) { await tp("touchMove", 90 + i * 8, 800 - i * 6); await sleep(30); }
  await sleep(700);
  await shot(page, "03b_joystick");
  await tp("touchEnd"); await sleep(200);
  const p1 = await S(page);
  R("B18", "Virtueller Joystick bewegt den Kobold", Math.hypot(p1.x - p0.x, p1.y - p0.y) > 1, `(${p0.x},${p0.y}) → (${p1.x},${p1.y})`);
}
// Tutorial: Schlag, Blase, Sprung
await page.evaluate(() => { KK.teleport(KK.G.L.dummies[0].x + 1, KK.G.L.dummies[0].y); });
for (let i = 0; i < 5; i++) { await tapEl(page, "#bAtk"); await sleep(320); }
await tapEl(page, "#bBub"); await sleep(400); await tapEl(page, "#bDash"); await sleep(600);
st = await S(page);
R("B12t", "Tutorial führt durch Laufen/Schlag/Blase/Sprung", st.tut === 4 || st.tut === -1, "Schritt " + st.tut);
await shot(page, "04_stadt_tutorial_ende");
// Brunnen heilt
await page.evaluate(() => { KK.G.p.hp = 2; const f = KK.G.L.fountain; KK.teleport(f.x + 2.2, f.y + 0.5); KK.G.portalCd = 0; });
await sleep(700);
st = await S(page);
R("B5", "Brunnen heilt", st.hp === st.maxHp, st.hp + "/" + st.maxHp);
await shot(page, "05_brunnen");
// Portal betreten (Ebene 1)
await page.evaluate(() => { const p = KK.G.L.portals[0]; KK.teleport(p.x - 1.2, p.y); KK.G.portalCd = 0; });
await sleep(300);
const pp = await page.evaluate(() => { const p = KK.G.L.portals[0]; return { x: p.x, y: p.y }; });
await page.evaluate((p) => { KK.G.p.path = [{ x: p.x, y: p.y }]; }, pp);
await waitFor(page, () => KK.state().depth === 1, null, 5000);
await sleep(700);
st = await S(page);
R("B6", "Portal triggert beim Draufsteigen (Stadt → Ebene 1)", st.depth === 1, "Tiefe " + st.depth);
R("B16", "Dieselbe Melodie in Stadt & Keller", st.track.includes("town") && st.where === "dungeon", st.track + " @ " + st.where);
await shot(page, "06_ebene1");

// Kampf
const combat = await page.evaluate(async () => {
  const G = KK.G, p = G.p;
  const out = {};
  // Fledermaus Ebene 1: zahm
  KK.spawn("bat", 30, 30); const b = G.ents[G.ents.length - 1];
  out.batDmg = b.dmg; out.batTame = !!b.tame; out.hitsToKill = Math.ceil(p.maxHp / b.dmg);
  G.ents.splice(G.ents.indexOf(b), 1);
  // Rundumschlag trifft hinten
  p.face = 1; p.atkCd = 0;
  KK.spawn("slime", -2.4, 0.4); const back = G.ents[G.ents.length - 1]; back.hp = back.maxHp = 99;
  KK.spawn("wichtel", 2.6, 0.2); const front = G.ents[G.ents.length - 1]; front.hp = front.maxHp = 99;
  KK.spawn("bat", 3.6, 3.6); const far = G.ents[G.ents.length - 1]; far.hp = far.maxHp = 99;
  KK.attack();
  await new Promise(r => setTimeout(r, 250));
  out.backHit = back.hp < 99; out.frontHit = front.hp < 99; out.farHit = far.hp < 99;
  out.atkCd = 0.25;
  return out;
});
R("B13", "Fledermaus Ebene 1 zahm: ≥ 4 Treffer bis K.O.", combat.batTame && combat.hitsToKill >= 4, `Schaden ${combat.batDmg}, ${combat.hitsToKill} Treffer nötig`);
R("B11", "Rundumschlag 360° Radius 3 (trifft hinten, nicht >3)", combat.backHit && combat.frontHit && !combat.farHit, JSON.stringify({ hinten: combat.backHit, vorne: combat.frontHit, weit: combat.farHit }));
await sleep(80);
await tapEl(page, "#bAtk"); await sleep(110);
await shot(page, "07_kampf_schlag");
await tapEl(page, "#bBub"); await sleep(260);
await shot(page, "08_kampf_blasen");
const skills = await page.evaluate(async () => {
  const G = KK.G, p = G.p, out = {};
  G.portalCd = 1e9;
  p.bubCd = 0; KK.bubbles();
  out.shots = G.shots.filter(s => s.kind === "bubble").length;
  // Dodge weg vom nächsten Gegner
  for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
  KK.spawn("slime", 1.5, 0); const e = G.ents[G.ents.length - 1];
  const d0 = Math.hypot(e.x - p.x, e.y - p.y); p.dashCd = 0;
  KK.dodge(); out.invul = p.invulT > 0;
  out.dodgeAway = ((p.x - e.x) * p.dashDx + (p.y - e.y) * p.dashDy) / (d0 || 1) > 0.95;
  await new Promise(r => setTimeout(r, 450));
  // ohne Gegner: letzte Bewegungsrichtung
  G.ents.length = 0; p.lastMx = 0; p.lastMy = 1; p.dashCd = 0; const y0 = p.y, x0 = p.x;
  KK.dodge(); await new Promise(r => setTimeout(r, 400));
  out.dodgeDir = (p.y - y0) > 0.5 || Math.hypot(p.x - x0, p.y - y0) > 0.5;
  // Trank
  p.hp = 1; const pot0 = p.potions; KK.potion(); out.potion = p.hp > 1 && p.potions === pot0 - 1;
  G.portalCd = 0;
  return out;
});
R("B12", "Seifenblasen / Dodge weg (+Unverwundbar) / Trank", skills.shots > 0 && skills.invul && skills.dodgeAway && skills.dodgeDir && skills.potion, JSON.stringify(skills));
await tapEl(page, "#btnBag"); await sleep(400);
const bagOpen = (await S(page)).screen === "bag";
await shot(page, "09_rucksack");
await tapEl(page, "#btnBagClose"); await sleep(300);
R("B12b", "Rucksack öffnet & schließt", bagOpen && (await S(page)).screen === "play");
// BFS um Wand + Auto-Befreiung
const bfs = await page.evaluate(async () => {
  const G = KK.G, m = G.L.map, p = G.p;
  // Wand-Kachel finden, die an Boden grenzt, Spieler hineinsetzen
  let wx = -1, wy = -1;
  for (let y = 2; y < m.h - 2 && wx < 0; y++) for (let x = 2; x < m.w - 2; x++) if (m.block[y * m.w + x] && !m.block[y * m.w + x + 1]) { wx = x; wy = y; break; }
  p.x = wx + 0.5; p.y = wy + 0.5;
  await new Promise(r => setTimeout(r, 200));
  const freed = !m.block[Math.floor(p.y) * m.w + Math.floor(p.x)];
  // Pfad zur Treppe
  p.x = G.L.entry.x; p.y = G.L.entry.y;
  return { freed, wall: wx + "," + wy };
});
const reach = await page.evaluate(async () => {
  const G = KK.G, s = G.L.stairs;
  KK.G.ents.length = 0;
  const { findPath } = await import("./src/world.js");
  const path = findPath(G.L.map, G.p.x, G.p.y, s.x, s.y, 0.3);
  return { ok: !!path, n: path ? path.length : 0, direct: Math.hypot(s.x - G.p.x, s.y - G.p.y).toFixed(1) };
});
R("B14", "Auto-Befreiung aus Wand + BFS-Weg zur Treppe", bfs.freed && reach.ok, JSON.stringify({ ...bfs, ...reach }));

// FPS normal
let fpsN = null, fpsT = null;
if (PERF) {
  fpsN = await measureFps(page, "normal (hoch)");
  R("A2", "FPS normal ≥ 55 (Kampf, 12 Gegner)", fpsN.fps >= 55, fpsN.fps + " fps (p5 " + fpsN.p5 + ", Scale " + fpsN.scale + ")");
  await shot(page, "10_perf_szene");
  if (THROTTLE > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
    fpsT = await measureFps(page, "throttle " + THROTTLE + "×", 6);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    R("A3", "FPS mit CPU-Throttle " + THROTTLE + "× ≥ 45", fpsT.fps >= 45, fpsT.fps + " fps (p5 " + fpsT.p5 + ", Scale " + fpsT.scale + ", q" + fpsT.q + ")");
    await page.evaluate(() => KK.quality(0));
  }
}

// Boss Ebene 4
await page.evaluate(() => { KK.god(true); KK.goto(4); KK.teleport("boss"); KK.G.p.x -= 3; KK.G.p.y -= 3; });
await sleep(2200);
st = await S(page);
R("B7a", "Ebene 4: Boss vorhanden & erwacht", !!st.boss && !!(await page.evaluate(() => KK.G.boss && KK.G.boss.awake)), st.boss && st.boss.name);
await shot(page, "11_boss_ebene4");
await page.evaluate(() => { KK.G.p.x = KK.G.boss.x - 1.2; KK.G.p.y = KK.G.boss.y - 1.2; });
await waitFor(page, () => KK.G.teles.length > 0 && KK.G.teles[0].t > 0.3, null, 8000);
await shot(page, "11b_boss_warnkreis");
await page.evaluate(() => KK.kill("boss"));
await sleep(1600);
await shot(page, "12_boss_besiegt");
const bossLv = await page.evaluate(async () => { const out = []; for (const d of [8, 12, 16, 20]) { KK.goto(d); out.push(!!KK.G.boss); } return out; });
R("B7b", "Bosse auf 8/12/16/20", bossLv.every(Boolean), bossLv.join(","));
// Biome
for (const [d, n] of [[5, "13_ebene5_kristall"], [9, "14_ebene9_zucker"], [13, "15_ebene13_frost"], [17, "16_ebene17_glut"]]) {
  await page.evaluate((d) => KK.goto(d), d); await sleep(900); await shot(page, n);
}
// Ebene 20 Kellerkönig
await page.evaluate(() => { KK.goto(20); KK.teleport("boss"); KK.G.p.x -= 4.5; KK.G.p.y -= 4.5; });
await sleep(2500);
st = await S(page);
R("B7c", "Ebene 20: Kellerkönig riesig & knallrot mit Krone", st.boss && st.boss.king && st.boss.scale >= 2.5 && st.boss.skin === "#ff2a2a", JSON.stringify(st.boss));
await shot(page, "17_kellerkoenig");
await page.evaluate(() => KK.kill("boss"));
await waitFor(page, () => KK.state().screen === "win", null, 5000);
await sleep(1600);
st = await S(page);
const hallHtml = await page.innerHTML("#winHall");
const hallTxt = await page.textContent("#winHall");
R("B8a", "Sieg per Boss-Kill → Siegesbildschirm + Ehrenhall", st.screen === "win" && /🥇/.test(hallTxt), st.screen);
R("B9", "Namen in Ehrenhall HTML-escaped", hallHtml.includes("&lt;b&gt;Zoe&lt;/b&gt;") && hallTxt.includes("<b>Zoe</b>"), hallTxt.slice(0, 60));
R("B8c", "Datum de-AT + Medaillen", /\d{1,2}\.\d{1,2}\.\d{4}/.test(hallTxt) && hallTxt.includes("🥇"), (hallTxt.match(/\d{1,2}\.\d{1,2}\.\d{4}/) || [""])[0]);
await shot(page, "18_sieg_boss");
await tapEl(page, "#btnWinTown"); await sleep(900);
await page.evaluate(() => { KK.goto(20); KK.teleport("stairs"); KK.G.p.x -= 1; KK.G.portalCd = 0; });
await sleep(200);
await page.evaluate(() => { const s = KK.G.L.stairs; KK.G.p.path = [{ x: s.x, y: s.y }]; });
await waitFor(page, () => KK.state().screen === "win", null, 5000);
await sleep(1500);
st = await S(page);
const n2 = await page.evaluate(() => document.querySelectorAll("#winHall .hallBox:first-child tr").length);
R("B8b", "Sieg per 20. Portal", st.screen === "win" && n2 >= 2, "Einträge: " + n2);
await shot(page, "19_sieg_portal");
await tapEl(page, "#btnWinTown"); await sleep(900);
// Weiterspielen nach Reload
await page.evaluate(() => { KK.goto(7); KK.G.gold = 1234; KK.save(); });
await sleep(300);
const saved = await S(page);
await page.reload();
await page.waitForFunction(() => window.KK && KK.G.L, null, { timeout: 10000 });
await sleep(600);
const info = await page.textContent("#contInfo");
await shot(page, "20_menue_weiterspielen");
await tapEl(page, "#btnCont");
await waitFor(page, () => KK.state().screen === "play" && !KK.state().demo);
await sleep(700);
st = await S(page);
const entry = await page.evaluate(() => KK.G.L.entry);
R("B4", "Weiterspielen: Level/Gold/Tiefe zurück, Spawn am Eingang", st.depth === saved.depth && st.gold === saved.gold && st.lvl === saved.lvl && Math.hypot(st.x - entry.x, st.y - entry.y) < 0.6, `Tiefe ${st.depth}, Gold ${st.gold}, Lv ${st.lvl} | ${info}`);
// App-Wechsel
await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
await sleep(300);
const hid = await page.evaluate(() => ({ screen: KK.state().screen, audio: KK.state().audio }));
await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
R("A9", "App-Wechsel pausiert Spiel + Musik", hid.screen === "pause" && hid.audio !== "running", JSON.stringify(hid));
await shot(page, "21_pause");
const pauseVisible = await page.evaluate(() => { const r = document.getElementById("btnPause").getBoundingClientRect(); return r.width > 0; });
await tapEl(page, "#btnResume"); await sleep(300);
const pbox = await page.locator("#btnPause").boundingBox();
R("B15", "⏸️ im Spiel sichtbar & jedes Menü hat Rückweg", pauseVisible && pbox && pbox.y >= 0 && (await page.evaluate(() => ["btnBack1", "btnBack2", "btnBack3", "btnNo", "btnResume", "btnBagClose", "btnRevive", "btnWinTown"].every(id => document.getElementById(id)))), "btnPause @" + (pbox && Math.round(pbox.x) + "," + Math.round(pbox.y)));
// Tod → Stadt
await page.evaluate(() => { KK.god(false); KK.G.p.invulT = 0; KK.G.p.hp = 1; KK.spawn("wichtel", 0.6, 0); const e = KK.G.ents[KK.G.ents.length - 1]; e.dmg = 5; e.atkCd = 0; });
await waitFor(page, () => KK.state().screen === "dead", null, 6000);
await sleep(1200);
await shot(page, "22_umgefallen");
const deadOk = (await S(page)).screen === "dead";
await tapEl(page, "#btnRevive"); await sleep(1000);
st = await S(page);
R("B15b", "Umfallen → zurück in die Stadt (volle HP)", deadOk && st.depth === 0 && st.hp === st.maxHp, "Tiefe " + st.depth);
// Technik-Checks
const tech = await page.evaluate(() => {
  const cv = document.getElementById("cv");
  const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  cv.dispatchEvent(ev);
  return { ratio: cv.width / cv.clientWidth, touch: getComputedStyle(cv).touchAction, ctx: ev.defaultPrevented, vp: document.querySelector('meta[name=viewport]').content, ver: window.KK_VER, full: !!document.getElementById("btnFull1") };
});
R("A4", "Canvas-Backbuffer ≤ 2× CSS", tech.ratio <= 2.001, tech.ratio.toFixed(2));
R("A7", "Touch-Härtung (touch-action, Kontextmenü, kein Zoom)", tech.touch === "none" && tech.ctx && /user-scalable=no/.test(tech.vp), JSON.stringify({ touch: tech.touch, ctx: tech.ctx }));
const html = readFileSync("index.html", "utf8"), css = readFileSync("style.css", "utf8");
const tags = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m => m[1]);
const im = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const allV = tags.every(u => u.includes("?v=" + tech.ver)) && Object.values(im).every(u => u.includes("?v=" + tech.ver));
const srcFiles = (await import("node:fs")).readdirSync("src").filter(f => f.endsWith(".js"));
const allMapped = srcFiles.every(f => im["./src/" + f]);
R("A6", "Cache-Buster ?v=N überall + KK_VER", allV && allMapped, `v${tech.ver}, ${tags.length} Tags, ${Object.keys(im).length} Module`);
R("A8", "100dvh + safe-area-insets im CSS", css.includes("100dvh") && css.includes("safe-area-inset-bottom") && css.includes("safe-area-inset-top"));
const man = await fetch(BASE + "manifest.webmanifest").then(r => r.ok ? r.json() : null).catch(() => null);
const i192 = await fetch(BASE + "icons/icon-192.png").then(r => r.ok).catch(() => false), i512 = await fetch(BASE + "icons/icon-512.png").then(r => r.ok).catch(() => false);
const plat = readFileSync("src/platform.js", "utf8");
R("A11", "PWA-Manifest + Icons, Vollbild-Button, Wake-Lock abgesichert", man && man.icons.length >= 2 && i192 && i512 && tech.full && /"wakeLock" in navigator/.test(plat), JSON.stringify({ manifest: !!man, i192, i512 }));
// MEGASCHWER
const mega = await page.evaluate(() => {
  KK.start({ mega: false }); KK.goto(1); KK.spawn("bat", 30, 30); const n = KK.G.ents[KK.G.ents.length - 1];
  KK.start({ mega: true }); KK.goto(1); KK.spawn("bat", 30, 30); const m = KK.G.ents[KK.G.ents.length - 1];
  return { speed: m.speed / n.speed, dmg: m.dmg / n.dmg };
});
await sleep(300);
mega.badge = await page.evaluate(() => !document.getElementById("megaChip").classList.contains("hidden"));
await shot(page, "23_megaschwer");
R("B10", "MEGASCHWER: 2× Tempo, 10× Schaden, 🔥-Badge", mega.speed === 2 && mega.dmg === 10 && mega.badge, JSON.stringify(mega));
await ctx.close();

// =====================================================================
// 2) Alte v20-Saves + kaputte Saves
// =====================================================================
{
  const old = { look: { skin: "#f3ead9", outfit: "#ffd75e", hair: "#e8d9c0", species: "hase", name: "Oldie" }, depth: 9, hp: 12, maxHp: 20, xp: 5, lvl: 7, xpNext: 60, gold: 321, bag: [{ kind: "mushroom" }], potionCount: 2, seed: 99, atk: 8, projN: 3, magic: 2, deepest: 13, mega: false };
  const hall = { gold: [{ name: "<i>Alt</i>", gold: 500, secs: 900, ts: 1735000000000, lvl: 12, mega: true }], time: [{ name: "<i>Alt</i>", gold: 500, secs: 900, ts: 1735000000000 }] };
  const { ctx: c2, page: p2 } = await newPage(412, 915, `localStorage.setItem("koboldkeller_save_v1", ${JSON.stringify(JSON.stringify(old))}); localStorage.setItem("koboldkeller_hall_v1", ${JSON.stringify(JSON.stringify(hall))});`);
  const inf = await p2.textContent("#contInfo");
  await shot(p2, "24_migration_menue");
  await tapEl(p2, "#btnCont");
  await waitFor(p2, () => KK.state().screen === "play" && !KK.state().demo);
  await sleep(600);
  const s2 = await S(p2);
  await tapEl(p2, "#btnPause"); await sleep(200); await tapEl(p2, "#btnMenu"); await sleep(300);
  await tapEl(p2, "#btnHall"); await sleep(400);
  const ht = await p2.textContent("#hallBody");
  await shot(p2, "25_ehrenhall");
  R("A12", "v20-Save migriert (Name/Look/Level/Gold + Ehrenmütze), Ehrenhall übernommen", s2.name === "Oldie" && s2.species === "hase" && s2.lvl === 7 && s2.gold === 321 && s2.hat === "veteran" && ht.includes("<i>Alt</i>"), `${inf} | Hut ${s2.hat}`);
  await c2.close();
  const { ctx: c3, page: p3 } = await newPage(412, 915, `localStorage.setItem("koboldkeller2_save", "{kaputt"); localStorage.setItem("koboldkeller_hall_v1", "[1,2"); localStorage.setItem("koboldkeller2_settings", "null"); localStorage.setItem("koboldkeller_save_v1", '{"look":7}');`);
  const vis = await p3.isVisible("#scrMenu");
  await tapEl(p3, "#btnHall"); await sleep(300);
  const e3 = errors.filter(e => e.startsWith("hoch")).length;
  R("A13", "Kaputte Saves → kein Absturz, Menü erscheint", vis && (await p3.isVisible("#scrHall")), "Menü sichtbar: " + vis);
  await c3.close();
}

// =====================================================================
// 3) Querformat 915×412
// =====================================================================
{
  const { ctx: c4, page: p4 } = await newPage(915, 412);
  await shot(p4, "26_menu_quer");
  await p4.evaluate(() => { KK.start({ tut: false }); });
  await sleep(800);
  await shot(p4, "27_stadt_quer");
  await p4.evaluate(() => { KK.god(true); KK.goto(6); for (let i = 0; i < 5; i++) KK.spawn(["bat", "wisp", "kaefer"][i % 3], Math.cos(i) * 2.6, Math.sin(i) * 2.6); });
  await sleep(900);
  await tapEl(p4, "#bAtk"); await sleep(120);
  await shot(p4, "28_kampf_quer");
  const lay = await p4.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const a = r("hudTL"), b = r("skills"), c = r("hudTR");
    const inView = x => x.left >= 0 && x.top >= 0 && x.right <= innerWidth + 1 && x.bottom <= innerHeight + 1;
    const ov = (x, y) => !(x.right < y.left || y.right < x.left || x.bottom < y.top || y.bottom < x.top);
    const btns = [...document.querySelectorAll(".skill")].map(e => { const q = e.getBoundingClientRect(); return Math.round(Math.min(q.width, q.height)); });
    return { skillsIn: inView(b), hudIn: inView(a), overlap: ov(a, b) || ov(c, b), btns };
  });
  R("A14", "Querformat: Buttons sichtbar (≥56 px), kein Überlappen", lay.skillsIn && lay.hudIn && !lay.overlap && Math.min(...lay.btns) >= 56, JSON.stringify(lay));
  if (PERF) {
    const f = await measureFps(p4, "normal (quer)");
    R("A2q", "FPS normal Querformat ≥ 55", f.fps >= 55, f.fps + " fps (p5 " + f.p5 + ")");
  }
  await c4.close();
}
// Buttongrößen (Hochformat)
{
  const { ctx: c5, page: p5 } = await newPage();
  await p5.evaluate(() => KK.start({ tut: false }));
  await sleep(400);
  const sz = await p5.evaluate(() => [...document.querySelectorAll(".skill")].map(e => { const q = e.getBoundingClientRect(); return { id: e.id, s: Math.round(Math.min(q.width, q.height)), right: Math.round(innerWidth - q.right), bottom: Math.round(innerHeight - q.bottom) }; }));
  R("C7", "Skill-Buttons ≥ 56 px im Daumenbereich rechts unten", sz.every(b => b.s >= 56 && b.right < 200 && b.bottom < 220), sz.map(b => b.id + ":" + b.s).join(" "));
  await c5.close();
}

// Info: reines Software-Raster (kein GPU) — Worst Case, adaptive Qualität darf greifen
let swInfo = null;
if (PERF && PROFILE === "gpu") {
  const b2 = await chromium.launch({ args: FLAGS });
  const c6 = await b2.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p6 = await c6.newPage();
  await p6.goto(BASE + "index.html"); await p6.waitForFunction(() => window.KK && KK.G.L);
  await p6.evaluate(() => KK.start({ tut: false }));
  const n = await measureFps(p6, "software normal");
  const cdp = await c6.newCDPSession(p6); await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  const t = await measureFps(p6, "software throttle " + THROTTLE + "× (adaptiv)", 5, 12000);
  swInfo = { normal: n, throttled: t };
  console.log("INFO Software-Raster: normal " + n.fps + " fps (Scale " + n.scale + "), " + THROTTLE + "× " + t.fps + " fps (Scale " + t.scale + ")");
  await b2.close();
}
R("A1", "Keine pageerrors/console.errors (hoch + quer)", errors.length === 0, errors.length ? errors.slice(0, 5).join(" | ") : "0");
R("A5", "Keine externen Requests", foreign.length === 0, foreign.length ? foreign.slice(0, 3).join(", ") : "0");
await browser.close();
const pass = results.filter(r => r.pass).length;
console.log(`\n${pass}/${results.length} PASS`);
writeFileSync(SHOTS + "check-results.json", JSON.stringify({ date: new Date().toISOString(), profile: PROFILE, throttle: THROTTLE, fpsNormal: fpsN, fpsThrottled: fpsT, software: swInfo, results, errors }, null, 2));
process.exit(pass === results.length ? 0 : 1);
