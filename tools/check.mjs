// Koboldkeller 2 — Akzeptanz-Check (CHECKS.md)
// node tools/check.mjs [--port=8731] [--throttle=4] [--no-perf] [--profile=gpu|software] [--v7=all|skip|only] [--hapsecs=60] [--ref=8732]
// v7-Checks (V18–V21) in tools/checks_v7.mjs, v8 (V22–V25) in tools/checks_v8.mjs, v9-Kostüme (V26–V31) in tools/checks_v9.mjs,
// v10 Oma (V32) in tools/checks_v10.mjs, v11 Boss-Auftritt (V33) in tools/checks_v11.mjs,
// v12 Fels-Hintergrund (V34) in tools/checks_v12.mjs, v13 Deko (V35) in tools/checks_v13.mjs (alle einzeln lauffähig).
// Langer Lauf in Teilen: --v7=skip (A/B/C/V1–V17), dann --v7=only (V18–V31). --ref=PORT: v7-Vergleichsserver für Vorher/Nachher in V22.
// Profil „gpu" (Standard): Chromium new-headless mit GPU-Raster (wie Canvas2D am Handy) und
// ungedrosseltem Frame-Takt (--disable-gpu-vsync/--disable-frame-rate-limit), weil headless-rAF
// sonst lastunabhängig auf ~10–25 Hz gedrosselt wird. FPS = gemessener Frame-Durchsatz.
// Zusätzlich wird das reine Software-Raster-Profil (ohne GPU) als Info gemessen.
// Android-Profil 412×915 @DPR2, hasTouch, isMobile; Querformat 915×412. Screenshots → shots/neubau/
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { runV7, GPU_FLAGS } from "./checks_v7.mjs";
import { runV8 } from "./checks_v8.mjs";
import { runV9 } from "./checks_v9.mjs";
import { runV10 } from "./checks_v10.mjs";
import { runV11 } from "./checks_v11.mjs";
import { runV12 } from "./checks_v12.mjs";
import { runV13 } from "./checks_v13.mjs";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k)); if (!a) return d; const v = a.split("=")[1]; return v === undefined ? true : v; };
const PORT = +arg("port", 8731), THROTTLE = +arg("throttle", 4), PERF = !arg("no-perf", false), PROFILE = arg("profile", "gpu");
const V7MODE = arg("v7", "all"), HAPSECS = +arg("hapsecs", 60), REF = arg("ref", null) ? `http://localhost:${arg("ref")}/` : null;
const FLAGS = [...(PROFILE === "gpu" ? GPU_FLAGS.slice(0, 3) : []), "--disable-gpu-vsync", "--disable-frame-rate-limit", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required", "--mute-audio"];
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
  await page.waitForFunction(() => window.KK && window.KK.G && window.KK.G.L, null, { timeout: 30000 });
  await sleep(500);
  return { ctx, page };
}
const S = (page) => page.evaluate(() => KK.state());
const shot = (page, name) => page.screenshot({ path: SHOTS + name + ".png" });
const tapEl = async (page, sel) => { const b = await page.locator(sel).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
async function waitFor(page, fn, arg, ms = 4000) { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } }

async function measureFps(page, label, secs = 5, warm = 1500) {
  await page.evaluate(() => {
    KK.god(true); KK.goto(3); KK.G.p.potions = 5; KK.G.portalCd = 1e9;
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

let fpsN = null, fpsT = null, swInfo = null;
if (V7MODE !== "only") {
// =====================================================================
// 1) Hochformat: kompletter Flow
// =====================================================================
const { ctx, page } = await newPage(412, 915, `window.__rafT = []; (function f(t) { window.__rafT.push(t); requestAnimationFrame(f); })(0);`);
const st0 = await S(page);
R("A10", "Audio erst nach Geste (vor Tap kein AudioContext)", st0.audio === "none", st0.audio);
{ // Vor-Rendern im Menü: Dauer, längster Main-Thread-Happen, Frame-Zeiten des Menüs WÄHRENDDESSEN
  await page.waitForFunction(() => KK.audio().pre.done, null, { timeout: 30000 });
  const pre = await page.evaluate(() => {
    const p = KK.audio().pre, ts = window.__rafT.filter(t => t >= p.t0 && t <= p.t1);
    let worst = 0; for (let i = 1; i < ts.length; i++) worst = Math.max(worst, ts[i] - ts[i - 1]);
    const before = window.__rafT.filter(t => t < p.t0); let wb = 0; for (let i = 1; i < before.length; i++) wb = Math.max(wb, before[i] - before[i - 1]);
    return { ...p, frames: ts.length, fps: +(ts.length / ((p.t1 - p.t0) / 1000)).toFixed(1), worst: +worst.toFixed(1), worstBoot: +wb.toFixed(1) };
  });
  R("A16", "Vor-Rendern im Menü blockiert nicht (längster Happen < 16 ms, kein Frame > 50 ms, fertig < 12 s)", pre.done && pre.errors === 0 && pre.maxJob < 16 && pre.worst < 50 && pre.ms < 12000, `${pre.ms} ms, ${pre.jobs} Sätze, ${(pre.bytes / 1e6).toFixed(1)} MB, max. Happen ${pre.maxJob} ms, Menü währenddessen ${pre.fps} fps (längster Frame ${pre.worst} ms; Boot davor ${pre.worstBoot} ms), Aufnahme ${pre.recMs} ms`);
}
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
R("B16", "Stadtmelodie bleibt Leitmotiv (Stadt-Aufnahme geladen, Keller spielt Welt-Musik)", st.track.includes("town") && st.where === "dungeon", st.track + " @ " + st.where);
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
  out.atkCd = 0.6;
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
fpsN = null; fpsT = null;
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

// Audio-Performance: Effekt-Dauerfeuer vs. Effekte aus (A/B/A/B, gleiche Kampfszene, CPU-Throttle)
if (PERF) {
  const cdp = await ctx.newCDPSession(page);
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await page.evaluate(async () => {
    const A = await import("./src/audio.js"); window.__A = A;
    // Dauerfeuer: 30 Effekt-Aufrufe/s (≈ 5× mehr als echtes Spiel) über alle Kampf-Effekte, räumlich verteilt
    window.__spam = (on) => { clearInterval(window.__spT); A.setSfx(!!on); if (on) window.__spT = setInterval(() => { const p = KK.G.p, n = ["hit", "poof", "coin", "pop", "swing", "slam", "shoot", "pot", "tele"]; for (let i = 0; i < 3; i++) { const k = n[(Math.random() * n.length) | 0]; A.SFX[k]({ x: p.x + Math.random() * 6 - 3, y: p.y + Math.random() * 6 - 3, dmg: 1 + Math.random() * 8, crit: Math.random() < 0.2 }); } }, 100); };
  });
  const ab = { on: [], off: [] }, cpuOn = [];
  for (const mode of ["off", "on", "on", "off", "off", "on", "on", "off", "off", "on"]) {
    await page.evaluate((m) => window.__spam(m === "on"), mode);
    const c0 = await page.evaluate(() => KK.audio().cpuMs), w0 = Date.now();
    const f = await measureFps(page, "Audio " + mode + (THROTTLE > 1 ? " @" + THROTTLE + "×" : ""), 4, 1000);
    const c1 = await page.evaluate(() => KK.audio().cpuMs);
    ab[mode].push(f.fps); if (mode === "on") cpuOn.push((c1 - c0) / ((Date.now() - w0) / 1000));
  }
  await page.evaluate(() => window.__spam(false));
  await page.evaluate(() => window.__A.setSfx(true));
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], fOn = med(ab.on), fOff = med(ab.off), diff = (fOff - fOn) / fOff * 100;
  const as = await page.evaluate(() => KK.audio()), cpuMs = med(cpuOn);
  R("A15", "Effekt-Dauerfeuer (30 Aufrufe/s) vs. aus: Audio-Engine < 3 % Main-Thread, FPS mit Effekten ≥ 45" + (THROTTLE > 1 ? " (Throttle " + THROTTLE + "×)" : ""), cpuMs < 30 && Math.min(...ab.on) >= 45, `Main-Thread ${cpuMs.toFixed(1)} ms/s = ${(cpuMs / 10).toFixed(2)} % · FPS-Median aus ${fOff.toFixed(1)} / an ${fOn.toFixed(1)} (${diff.toFixed(1)} %, Einzelwerte aus ${ab.off.join("/")}, an ${ab.on.join("/")} — headless-FPS schwankt ±20 % auch ohne Änderung) · Stimmen jetzt ${as.voices}, gestartet ${as.started}, gestohlen ${as.stolen}`);
  await page.evaluate(() => KK.quality(0));
}

// Boss Ebene 4
await page.evaluate(() => { KK.god(true); KK.goto(4); KK.teleport("boss"); KK.G.p.x -= 3; KK.G.p.y -= 3; });
// v11: der Boss wächst erst aus dem Boden (Auftritt ≈ 2,7 s), dann ist er wach
await waitFor(page, () => KK.G.boss && KK.G.boss.awake && KK.G.ents.includes(KK.G.boss), null, 9000);
await sleep(500);
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
await waitFor(page, () => KK.G.boss && KK.G.boss.awake && KK.G.ents.includes(KK.G.boss), null, 10000);   // v11: Auftritt ≈ 3,5 s
await sleep(800);
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
await page.waitForFunction(() => window.KK && KK.G.L, null, { timeout: 30000 });
await sleep(600);
const info = await page.textContent("#contInfo");
await shot(page, "20_menue_weiterspielen");
await tapEl(page, "#btnCont");
await waitFor(page, () => KK.state().screen === "play" && !KK.state().demo);
await sleep(700);
st = await S(page);
const entry = await page.evaluate(() => KK.G.L.entry);
R("B4", "Weiterspielen: Level/Gold/Tiefe zurück, Spawn am Eingang", st.depth === saved.depth && st.gold === saved.gold && st.lvl === saved.lvl && Math.hypot(st.x - entry.x, st.y - entry.y) < 0.6, `Tiefe ${st.depth}, Gold ${st.gold}, Lv ${st.lvl} (gespeichert: ${saved.depth}/${saved.gold}/${saved.lvl}), Abstand Eingang ${Math.hypot(st.x - entry.x, st.y - entry.y).toFixed(2)} | ${info}`);
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

// =====================================================================
// 4) v4 — die 8 Wünsche (Munition, Bosse, Musik, Kurve + Caps, Magnet, Editor/Talente/Spezial, Ebenen, Heim-Portal)
// =====================================================================
const V4 = "shots/neubau/v4/";
mkdirSync(V4, { recursive: true });
{
  const { ctx: c7, page: p7 } = await newPage();
  await p7.touchscreen.tap(200, 300);   // Audio entsperren (Musik-Checks)
  await p7.evaluate(() => KK.start({ tut: false, name: "Vier" }));
  await sleep(400);
  const W = (ms) => `await new Promise(r => setTimeout(r, ${ms}))`;
  // --- V1 Munition ---
  const am = await p7.evaluate(async () => {
    const G = KK.G, p = G.p, out = {}, w = ms => new Promise(r => setTimeout(r, ms));
    KK.goto(3); await w(50); G.portalCd = 1e9; KK.god(true); G.ents.length = 0; G.items.length = 0;
    p.projN = 3; p.ammo = 5; p.bubCd = 0;
    KK.bubbles(); out.afterShot = p.ammo; out.bubbles = G.shots.filter(s => s.kind === "bubble").length;
    KK.spawn("slime", 1.2, 0); let a0 = p.ammo; KK.kill("near"); out.killGain = p.ammo - a0;
    KK.spawn("slime", 1.2, 0, true); a0 = p.ammo; KK.kill("near"); out.eliteGain = p.ammo - a0;
    p.ammo = p.ammoMax; const g0 = G.gold; KK.spawn("slime", 1.2, 0); KK.kill("near"); out.capAmmo = p.ammo === p.ammoMax; out.capGold = G.gold - g0;
    await w(120); out.hudFull = document.getElementById("ammoTxt").textContent;
    p.ammo = 0; p.bubCd = 0; const n0 = G.shots.length; const r = KK.bubbles(); out.emptyNoShot = !r && G.shots.length === n0;
    await w(150); out.btnEmpty = document.getElementById("bBub").classList.contains("empty");
    out.toast = [...document.querySelectorAll(".toast")].some(t => t.textContent.includes("Keine Blasen"));
    p.bubCd = 0; KK.bubbles(); p.bubCd = 0; KK.bubbles(); await w(80);
    out.toasts = [...document.querySelectorAll(".toast")].filter(t => t.textContent.includes("Keine Blasen")).length;
    p.atkCd = 0; out.swordOk = KK.attack();
    KK.goto(4); await w(50); p.ammo = 0; KK.kill("boss"); out.bossGain = p.ammo;
    return out;
  });
  R("V1", "Munition: 1 Schuss = 1 🫧 (egal wie viele Blasen), Kill/Elite/Boss geben 🫧, Cap → Gold + „VOLL“, leer = grau + 1 Hinweis, Schwert unbegrenzt",
    am.afterShot === 4 && am.bubbles === 3 && am.killGain === 2 && am.eliteGain === 4 && am.bossGain === 12 && am.capAmmo && am.capGold === 1 && /VOLL/.test(am.hudFull) && am.emptyNoShot && am.btnEmpty && am.toast && am.toasts === 1 && am.swordOk, JSON.stringify(am));
  await p7.evaluate(() => { KK.goto(5); KK.god(true); const p = KK.G.p; p.ammo = 7; p.spec = 0.67; KK.G.ents.length = 0; });
  await sleep(900);
  await shot(p7, "v4/hud_hoch"); await shot(p7, "29_v4_hud_hoch");
  // --- V2 Obergrenzen ---
  const cp = await p7.evaluate(async () => {
    const G = KK.G, p = G.p, out = {}, w = ms => new Promise(r => setTimeout(r, ms));
    KK.goto(0); await w(60); G.ents.length = 0; G.portalCd = 1e9;
    p.potions = 5; let g0 = G.gold; KK.item("potion", 0.1, 0); await w(250); out.potCap = p.potions; out.potGold = G.gold - g0;
    p.hp = p.maxHp; g0 = G.gold; KK.item("heart", 0.1, 0); await w(250); out.heartGold = G.gold - g0;
    p.hp = 1; KK.item("heart", 0.1, 0); await w(250); out.heartHeal = p.hp > 1;
    p.hpBase = 59; KK.give("xp", Math.ceil(p.xpNext - p.xp) + 1); out.hpAfter1 = p.hpBase; KK.give("xp", Math.ceil(p.xpNext - p.xp) + 1); out.hpAfter2 = p.hpBase; out.maxHp = p.maxHp;
    out.lebenBlocked = !KK.skill("leben");
    return out;
  });
  R("V2", "Obergrenzen: 🧪 max 5 (Extra → +10 🪙), ❤️ bei voll → +2 🪙, Max-❤️ max 60, Leben-Talent sperrt bei voll",
    cp.potCap === 5 && cp.potGold === 10 && cp.heartGold === 2 && cp.heartHeal && cp.hpAfter1 === 60 && cp.hpAfter2 === 60 && cp.maxHp <= 60 && cp.lebenBlocked, JSON.stringify(cp));
  // --- V3 Magnet ---
  const mg = await p7.evaluate(async () => {
    const G = KK.G, p = G.p, out = {}, w = ms => new Promise(r => setTimeout(r, ms));
    KK.goto(0); await w(60); G.ents.length = 0; G.items.length = 0; G.portalCd = 1e9; p.sk.magnet = 0;
    KK.G.p.x = 17.5; KK.G.p.y = 22.5; p.vx = p.vy = 0;
    out.rCoin = KK.magnet("coin"); out.rItem = KK.magnet("potion");
    const mk = (kind, dx, dy) => { KK.item(kind, dx, dy); return G.items[G.items.length - 1]; };
    const c1 = mk("coin", 0, -3.3), c2 = mk("coin", 0, 4.3), i1 = mk("gem", 2.3, 0), i2 = mk("gem", -3.1, 0);
    const d = it => Math.hypot(it.x - p.x, it.y - p.y), d0 = [c1, c2, i1, i2].map(d);
    await w(160);
    out.coin33 = d(c1) < d0[0] - 0.2 || !G.items.includes(c1); out.coin43 = Math.abs(d(c2) - d0[1]) < 0.01; out.item23 = d(i1) < d0[2] - 0.2 || !G.items.includes(i1); out.item31 = Math.abs(d(i2) - d0[3]) < 0.01;
    p.sk.magnet = 5; KK.G.p.magBonus = 5 * 0.35; out.withSkill = KK.magnet("coin");
    p.sk.magnet = 0; KK.G.p.magBonus = 0;
    return out;
  });
  R("V3", "Magnet: Münzen 3,5 / Sachen 2,5 Kacheln (Münze bei 3,3 kommt, bei 4,3 nicht; Stein bei 2,3 kommt, bei 3,1 nicht), 🧲-Talent vergrößert",
    mg.rCoin === 3.5 && mg.rItem === 2.5 && mg.coin33 && mg.coin43 && mg.item23 && mg.item31 && mg.withSkill > 5, JSON.stringify(mg));
  // --- V5 Talente ---
  const sk = await p7.evaluate(async () => {
    const G = KK.G, p = G.p, out = {}, w = ms => new Promise(r => setTimeout(r, ms));
    KK.goto(0); await w(60);
    p.hpBase = 20; p.sk = { kraft: 0, leben: 0, tempo: 0, blasen: 0, magnet: 0 }; KK.respec(); p.skPts = 4;
    const a0 = p.atk, h0 = p.maxHp, am0 = p.ammoMax, s0 = p.spdMul;
    out.k = KK.skill("kraft"); out.l = KK.skill("leben"); out.b = KK.skill("blasen"); out.t = KK.skill("tempo");
    out.atk = +(p.atk - a0).toFixed(2); out.hp = p.maxHp - h0; out.ammo = p.ammoMax - am0; out.spd = +(p.spdMul - s0).toFixed(2); out.left = p.skPts; out.noMore = !KK.skill("kraft");
    KK.G.screen = "play"; document.getElementById("btnBag").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await w(250);
    out.bagPlus = document.querySelectorAll(".skPlus").length; out.bagPts = /Talente/.test(document.getElementById("bagBody").textContent);
    document.getElementById("btnBagClose").click(); await w(100);
    KK.goto(3); await w(50); out.respecDungeon = KK.respec();
    KK.goto(0); await w(50); out.respecTown = KK.respec(); out.after = { pts: p.skPts, atk: +(p.atk - a0).toFixed(2), hp: p.maxHp - h0 };
    return out;
  });
  R("V5", "Talente: Punkte verteilen wirken (💪 +0,5 ⚔️, ❤️ +2, 🫧 +4 Platz, 👟 +5 %), Rucksack zeigt „+“, Umverteilen nur in der Stadt (kostenlos)",
    sk.k && sk.l && sk.b && sk.t && sk.atk === 0.5 && sk.hp === 2 && sk.ammo === 4 && sk.spd === 0.05 && sk.left === 0 && sk.noMore && sk.bagPlus === 5 && sk.respecDungeon === 0 && sk.respecTown === 4 && sk.after.pts === 4 && sk.after.atk === 0 && sk.after.hp === 0, JSON.stringify(sk));
  // --- V6 Spezialangriff über Pilze, Pilze heilen nicht ---
  const sp = await p7.evaluate(async () => {
    const G = KK.G, p = G.p, out = {}, w = ms => new Promise(r => setTimeout(r, ms));
    KK.goto(2); await w(60); G.portalCd = 1e9; KK.god(true); G.ents.length = 0; G.items.length = 0;
    p.spec = 0; p.hp = 2; p.maxHp = Math.max(p.maxHp, 6);
    for (let i = 0; i < 3; i++) { KK.item("mushroom", 0.1, 0); await w(120); }
    out.spec = p.spec; out.hpUnchanged = p.hp === 2; await w(80);
    out.btnFull = document.getElementById("bSpec").classList.contains("full");
    const es = []; for (const [dx, dy] of [[2, 0], [0, 3], [-3.5, 0], [8, 8]]) { KK.spawn("slime", dx, dy); const e = G.ents[G.ents.length - 1]; e.hp = e.maxHp = 999; es.push(e); }
    out.fired = KK.special(); await w(1400);
    out.hitNear = es.slice(0, 3).map(e => 999 - e.hp); out.farUntouched = es[3].hp === 999; out.specAfter = p.spec;
    out.again = KK.special();
    return out;
  });
  R("V6", "Spezial: 3 Glitzerpilze füllen die Leiste (❤️ bleibt gleich), ✨-Knopf leuchtet, Flächenangriff trifft rundum (nicht in 11 Kacheln Ferne), danach leer",
    sp.spec === 1 && sp.hpUnchanged && sp.btnFull && sp.fired && sp.hitNear.every(x => x > 10) && sp.farUntouched && sp.specAfter === 0 && !sp.again, JSON.stringify(sp));
  // --- V7 Ebenen: Namen + Farbnuancen, Screenshot jeder Ebene ---
  const names = [], floors = [];
  for (let d = 1; d <= 20; d++) {
    await p7.evaluate((d) => { KK.goto(d); KK.god(true); KK.G.portalCd = 1e9; KK.heal(); }, d);
    await sleep(d % 4 === 0 ? 700 : 450);
    const info = await p7.evaluate(() => ({ n: KK.state().levelName, b: document.getElementById("bannerT").textContent, f: KK.R.B.floor[0], t: KK.R.B.top, amb: KK.R.B.amb.join(","), map: document.getElementById("mapName").textContent }));
    names.push(info); floors.push(info.f + "|" + info.t + "|" + info.amb);
    await shot(p7, "v4/ebene_" + String(d).padStart(2, "0"));
  }
  const uniqN = new Set(names.map(x => x.n)).size, uniqF = new Set(floors).size, bannerOk = names.every(x => x.b === x.n), mapOk = names.every(x => x.map === x.n);
  R("V7", "20 Ebenen: 20 eindeutige Namen (Titelkarte + unter der Karte), 20 verschiedene Farbnuancen", uniqN === 20 && uniqF === 20 && bannerOk && mapOk, `${uniqN} Namen, ${uniqF} Paletten, Titelkarte ok ${bannerOk}, HUD ok ${mapOk} · z. B. „${names[0].n}“, „${names[9].n}“, „${names[19].n}“`);
  // --- V8 Boss-Phasen + Signatur-Angriffe (Screenshot jeder Boss in jeder Phase) ---
  const bossRes = [];
  for (const [d, sigs] of [[4, ["spores", "vines"]], [8, ["crystals", "prism"]], [12, ["candy", "rush"]], [16, ["icicles", "snowball"]], [20, ["meteors", "flameCross"]]]) {
    await p7.evaluate((d) => { KK.goto(d); KK.god(true); KK.G.portalCd = 1e9; KK.teleport("boss"); KK.G.p.x -= 3.2; KK.G.p.y -= 3.2; }, d);
    await waitFor(p7, () => KK.G.boss && KK.G.boss.awake && KK.G.ents.includes(KK.G.boss), null, 10000);   // v11: erst der Auftritt
    await sleep(2000);
    const r = { d, phases: [], teles: [] };
    for (let ph = 1; ph <= 3; ph++) {
      if (ph > 1) { await p7.evaluate((ph) => { const b = KK.G.boss; b.hp = b.maxHp * (ph === 2 ? 0.6 : 0.3); KK.bossHit(); }, ph); await sleep(1800); }
      const k = sigs[(ph - 1) % 2];
      const tl = await p7.evaluate((k) => { KK.bossAtk(k); return new Promise(res => setTimeout(() => res(KK.G.teles.filter(t => t.t >= 0).map(t => t.kind)), 450)); }, k);
      r.teles.push(k + ":" + tl.length + (tl.includes("line") ? "L" : "") + (tl.includes("circle") ? "C" : ""));
      r.phases.push(await p7.evaluate(() => KK.G.boss.phase));
      await shot(p7, "v4/boss_e" + d + "_phase" + ph);
      await sleep(1300);
    }
    r.name = await p7.evaluate(() => KK.G.boss.name); r.hpMax = await p7.evaluate(() => KK.G.boss.maxHp);
    bossRes.push(r);
  }
  const bossOk = bossRes.every(r => r.phases.join() === "1,2,3" && r.teles.every(t => +t.split(":")[1].replace(/\D.*/, "") > 0));
  R("V8", "Bosse: 3 Phasen (66 % / 33 %), je Welt eigene Signatur-Angriffe mit Warnkreisen/-linien, deutlich mehr ❤️", bossOk && bossRes[0].hpMax >= 260, bossRes.map(r => r.name + " ❤️" + r.hpMax + " " + r.phases.join("→") + " [" + r.teles.join(" ") + "]").join(" · "));
  // --- D5 Musik je Welt ---
  const mus = [];
  for (const d of [0, 1, 5, 9, 13, 17]) {
    await p7.evaluate((d) => { KK.goto(d); KK.god(true); KK.G.ents.length = 0; KK.G.portalCd = 1e9; }, d);
    await sleep(3600);
    mus.push(await p7.evaluate(() => { const m = KK.audio().music; return { sec: m.sec, bpm: m.bpm, key: m.key.root + (m.key.minor ? "m" : ""), q: m.queue.join("") }; }));
  }
  const worldsDistinct = new Set(mus.slice(1).map(m => m.key + "@" + m.bpm)).size === 5;
  R("D5", "Musik: Stadt = Leitmotiv-Aufnahme, jede Welt eigene Tonart + Tempo + Abschnitte (A/B/Pause, Leitmotiv kehrt wieder)", mus[0].sec === "rec" && worldsDistinct && mus.slice(1).every(m => ["intro", "A0", "A1", "B"].includes(m.sec)), mus.map(m => m.sec + " " + m.key + " " + m.bpm + "bpm").join(" | "));
  // --- V10 Heim-Portal 20 s weg ---
  const hp = await p7.evaluate(async () => {
    const G = KK.G, p = G.p, out = {}, w = ms => new Promise(r => setTimeout(r, ms));
    KK.goto(2); await w(80); KK.god(true); G.ents.length = 0; G.portalCd = 0;
    const hpo = G.L.homePortal; out.hidden0 = hpo.hidden;
    p.x = hpo.x; p.y = hpo.y; p.path = null; await w(900); out.depthOnPortal = G.depth; out.stillHidden = hpo.hidden;
    out.minimap = true; out.inPortals = (G._portals || []).includes(hpo);
    KK.pause(); const tp = G.homeHideT; await w(1500); out.pausedFrozen = Math.abs(G.homeHideT - tp) < 0.01; KK.resume();
    KK.speed(8); const t0 = performance.now();
    while (G.homeHideT > 0 && performance.now() - t0 < 20000) await w(100);
    KK.speed(1); out.visibleAfter = !hpo.hidden; out.stillHere = G.depth === 2;
    await w(400); out.stillHere2 = G.depth === 2;
    const { nearestFree, findPath } = await import("./src/world.js");
    let f = null;
    for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2.5, 2.5], [-2.5, -2.5]]) { const c = nearestFree(G.L.map, hpo.x + dx, hpo.y + dy, 0.35); if (Math.hypot(c.x - hpo.x, c.y - hpo.y) > 1.9) { f = c; break; } }
    p.path = findPath(G.L.map, p.x, p.y, f.x, f.y, p.r); const t2 = performance.now();
    while (Math.hypot(p.x - f.x, p.y - f.y) > 0.4 && performance.now() - t2 < 3000) await w(100);
    out.armed = G.L.homeArmed;
    p.path = findPath(G.L.map, p.x, p.y, hpo.x, hpo.y, p.r); const t1 = performance.now();
    while (G.depth !== 0 && performance.now() - t1 < 4000) await w(100);
    out.town = G.depth === 0;
    return out;
  });
  R("V10", "Heim-Portal: nach Betreten 20 s weg (nicht gezeichnet, nicht auslösbar, Pause zählt nicht), dann sichtbar; erst nach Weggehen/Zurückkommen → Stadt",
    hp.hidden0 && hp.depthOnPortal === 2 && !hp.inPortals && hp.pausedFrozen && hp.visibleAfter && hp.stillHere2 && hp.town, JSON.stringify(hp));
  await c7.close();
}
// --- V4 Editor: Frisuren je Tierart, Spiegel in der Stadt, gespeichert ---
{
  const { ctx: c8, page: p8 } = await newPage();
  await tapEl(p8, "#btnNew"); await sleep(500);
  const hairs = [];
  for (let i = 0; i < 8; i++) {
    await p8.evaluate((i) => { document.querySelector("[data-t=tier]").click(); document.querySelectorAll("#looks .look")[i].click(); document.querySelector("[data-t=frisur]").click(); }, i);
    await sleep(350);
    await shot(p8, "v4/editor_frisuren_" + i);
    hairs.push(await p8.evaluate(() => document.querySelectorAll(".opt").length));
  }
  // Bär: Frisur wechseln → Vorschau ändert sich sichtbar
  const hashPrev = () => p8.evaluate(() => { const c = document.getElementById("editPrev"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; });
  await p8.evaluate(() => { document.querySelector("[data-t=tier]").click(); document.querySelectorAll("#looks .look")[1].click(); document.querySelector("[data-t=frisur]").click(); });
  await sleep(200);
  const before = await p8.evaluate(() => KK.G.screen);
  await p8.evaluate(() => { document.querySelector('.opt[data-v="wuschel"]').click(); });
  await sleep(120); const h1 = await p8.evaluate(() => { const c = document.getElementById("editPrev"); return c.width; });
  // Preview-Hash zu gleicher Animationszeit vergleichen: Zeit anhalten
  const cmp = await p8.evaluate(async () => {
    const { previewRig } = await import("./src/art.js"); const { makeLook } = await import("./src/config.js");
    const cv = document.createElement("canvas"); cv.width = 300; cv.height = 340;
    const hash = () => { const d = cv.getContext("2d").getImageData(0, 0, 300, 340).data; let h = 0, n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; for (let i = 0; i < d.length; i += 53) h = (h * 31 + d[i]) >>> 0; return [h, n]; };
    previewRig(cv, makeLook({ species: "baer", style: "wuschel" }), null, 0.5); const a = hash();
    previewRig(cv, makeLook({ species: "baer", style: "irokese" }), null, 0.5); const b = hash();
    return { a, b, differ: a[0] !== b[0] };
  });
  await p8.evaluate(() => { document.querySelector('.opt[data-v="irokese"]').click(); document.getElementById("nameInput").value = "Frisurtest"; });
  await sleep(200);
  await shot(p8, "v4/editor_baer_irokese");
  await p8.locator("#btnGo").tap();
  await waitFor(p8, () => KK.state().screen === "play" && !KK.state().demo);
  await sleep(700);
  const inGame = await p8.evaluate(() => ({ style: KK.state().look.style, sp: KK.state().species }));
  // Spiegel in der Stadt öffnet den Editor, Änderung wird übernommen + gespeichert
  await p8.evaluate(() => { KK.finishTut(); const m = KK.G.L.mirror; KK.G.p.x = m.x + 2.5; KK.G.p.y = m.y; KK.G.p.path = [{ x: m.x + 0.9, y: m.y }]; });
  await waitFor(p8, () => KK.G.screen === "edit", null, 4000);
  const opened = await p8.evaluate(() => KK.G.screen);
  await sleep(300);
  await shot(p8, "v4/spiegel_editor");
  await p8.evaluate(() => { document.querySelector("[data-t=frisur]").click(); });
  await sleep(150);
  await p8.evaluate(() => { document.querySelector('.opt[data-v="zoepfe"]').click(); document.querySelector("[data-t=extra]").click(); });
  await sleep(150);
  await p8.evaluate(() => { document.querySelector('.opt[data-v="brille"]').click(); });
  await sleep(150);
  await p8.locator("#btnEditOk").tap(); await sleep(500);
  const after = await p8.evaluate(() => ({ screen: KK.G.screen, style: KK.G.p.look.style, acc: KK.G.p.look.acc, rig: KK.G.p.rig.look.style }));
  await shot(p8, "v4/spiegel_danach");
  await p8.reload(); await p8.waitForFunction(() => window.KK && KK.G.L); await sleep(500);
  const persisted = await p8.evaluate(async () => { const { loadSave } = await import("./src/save.js"); const s = loadSave(); return s && s.look; });
  R("V4", "Charakter-Editor: 10 Frisuren je Tierart (alle 8), Frisurwechsel sichtbar, Spiegel in der Stadt, Aussehen im Spiel + gespeichert",
    hairs.every(n => n === 10) && cmp.differ && inGame.style === "irokese" && inGame.sp === "baer" && opened === "edit" && after.screen === "play" && after.style === "zoepfe" && after.acc === "brille" && after.rig === "zoepfe" && persisted && persisted.style === "zoepfe" && persisted.acc === "brille",
    JSON.stringify({ frisuren: hairs.join(","), vorschauUnterschied: cmp.differ, start: inGame, spiegel: opened, danach: after, gespeichert: persisted && persisted.style + "+" + persisted.acc }));
  await c8.close();
}
// --- V9 Save-Migration v3 → v4 ---
{
  const v3 = { v: 1, name: "Mia3", species: "baer", lvl: 12, xp: 3, xpNext: 90, maxHp: 80, hp: 70, atk: 9, projN: 3, magic: 2, gold: 100, potions: 9, shrooms: 5, hats: ["pilz"], hat: "pilz", deepest: 9, depth: 6, mega: false, tut: true, runSecs: 100, won: false, seed: 1234, kills: 55 };
  const { ctx: c9, page: p9 } = await newPage(412, 915, `localStorage.setItem("koboldkeller2_save", ${JSON.stringify(JSON.stringify(v3))});`);
  const inf = await p9.textContent("#contInfo");
  await tapEl(p9, "#btnCont");
  await waitFor(p9, () => KK.state().screen === "play" && !KK.state().demo);
  await sleep(2600);
  const s9 = await p9.evaluate(() => ({ ...KK.state(), toasts: [...document.querySelectorAll(".toast")].map(t => t.textContent).join(" | ") }));
  const raw = await p9.evaluate(() => JSON.parse(localStorage.getItem("koboldkeller2_save")));
  await shot(p9, "v4/migration_v3");
  R("V9", "Save-Migration v3 → v4 (→ v5): nichts verloren (Level, Gold, Tiefe, Hut), Überzähliges → Gold + Hinweis, Pilze → Spezial, Talentpunkte geschenkt, Datei v3 gespeichert",
    s9.name === "Mia3" && s9.lvl === 12 && s9.depth === 6 && s9.hat === "pilz" && s9.gold >= 310 && s9.potions === 5 && s9.maxHp === 60 && s9.spec === 1 && s9.skPts === 11 && s9.look.style === "wuschel" && /Rucksack war zu voll/.test(s9.toasts) && raw.v === 3 && raw.capNote === 0,
    `${inf} → Gold ${s9.gold} (+${s9.gold - 100}), 🧪 ${s9.potions}, Max-❤️ ${s9.maxHp}, Spezial ${s9.spec}, Punkte ${s9.skPts}, Frisur ${s9.look.style}, Datei v${raw.v}`);
  await c9.close();
}
// --- HUD quer + Boss-Kampf-FPS mit allen Effekten ---
{
  const { ctx: c10, page: p10 } = await newPage(915, 412);
  await p10.evaluate(() => { KK.start({ tut: false }); KK.goto(9); KK.god(true); const p = KK.G.p; p.ammo = 11; p.spec = 1; KK.G.portalCd = 1e9; });
  await sleep(1200);
  await shot(p10, "v4/hud_quer"); await shot(p10, "30_v4_hud_quer");
  const layQ = await p10.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const a = r("hudTL"), b = r("skills"), s = r("bSpec"); return { hudBottom: Math.round(a.bottom), specIn: s.top >= 0 && s.right <= innerWidth, ov: !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top) }; });
  R("A14b", "Querformat: Munition + Spezial-Leiste sichtbar, ✨-Knopf im Bild, kein Überlappen", layQ.specIn && !layQ.ov, JSON.stringify(layQ));
  await c10.close();
}
if (PERF) {
  const { ctx: c11, page: p11 } = await newPage();
  await p11.evaluate(() => { KK.start({ tut: false }); });
  const cdp = await c11.newCDPSession(p11);
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await p11.evaluate(() => {
    KK.god(true); KK.goto(20); KK.G.portalCd = 1e9; KK.teleport("boss"); KK.G.p.x -= 2.5; KK.G.p.y -= 2.5;
    setTimeout(() => { const b = KK.G.boss; b.hp = b.maxHp * 0.3; KK.bossHit(); }, 4200);   // v11: nach dem Auftritt (≈ 3,5 s)
    let i = 0; const atk = ["meteors", "flameCross", "fireRing", "meteors", "slam"];
    window.__bf = setInterval(() => { const b = KK.G.boss; if (!b || KK.G.rise) return; b.hp = Math.max(b.hp, b.maxHp * 0.2); if (b.state !== "phase" && b.state !== "intro" && (b.state !== "atk" || Math.random() < 0.3)) KK.bossAtk(atk[i++ % atk.length]); KK.attack(); if (Math.random() < 0.3) { KK.G.p.ammo = 20; KK.bubbles(); } if (Math.random() < 0.08) { KK.G.p.spec = 1; KK.special(); } for (const e of KK.G.ents) if (e.minion && e.hp < 3) e.hp = 30; KK.wave(9); window.__maxMin = Math.max(window.__maxMin || 0, KK.arena().count); window.__maxCh = Math.max(window.__maxCh || 0, KK.R.chunksVis || 0); }, 300);
  });
  await sleep(6000);                                      // v11: Auftritt (3,5 s) + Wut-Phasenwechsel abwarten
  await p11.evaluate(() => KK.perf(true));
  await sleep(6000);
  const fb = await p11.evaluate(() => { clearInterval(window.__bf); return { ...KK.perf(), teles: KK.G.teles.length, minions: window.__maxMin, cap: KK.arena().cap, zoom: KK.state().zoom, chunks: window.__maxCh }; });
  await shot(p11, "v4/boss_kampf_perf");
  if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  R("A3b", "Größter Boss-Kampf (Kellerkönig, Arena 24, Wut-Phase, alle Effekte, volle Handlanger-Zahl) mit CPU-Throttle " + THROTTLE + "× ≥ 45 FPS", fb.fps >= 45 && fb.minions >= fb.cap && fb.chunks < 28, fb.fps + " fps (p5 " + fb.p5 + ", Scale " + fb.scale + ", q" + fb.q + ") · Handlanger max " + fb.minions + "/" + fb.cap + " · Zoom " + fb.zoom + " · sichtbare Boden-Chunks max " + fb.chunks + " (< 28)");
  await c11.close();
}


// =====================================================================
// 5) v5 — Boss-Runde: Treppen-Bug, Mini-Bosse, große Arenen, Handlanger (Screenshots in shots/neubau/v5/)
// =====================================================================
const V5 = "shots/neubau/v5/";
mkdirSync(V5, { recursive: true });
{
  const { ctx: c12, page: p12 } = await newPage();
  await p12.touchscreen.tap(200, 300);   // Audio entsperren (Mini-Boss-Musik)
  await p12.evaluate(() => KK.start({ tut: false, name: "Fünf" }));
  await sleep(300);
  // --- V11 Bug-Regression: Treppe/20. Portal versiegelt, solange der Boss lebt (Draufstellen, Dodge, Rückstoß) ---
  const bug = [];
  for (const d of [4, 2, 8, 20]) {
    const r = await p12.evaluate(async (d) => {
      const G = KK.G, w = ms => new Promise(r => setTimeout(r, ms)), r = { d };
      KK.start({ tut: false, name: "Fünf" }); KK.god(true); KK.goto(d); await w(80);
      G.portalCd = 0; G.homeHideT = 999;
      const st = G.L.stairs, p = G.p, A = G.L.arena;
      r.sealed0 = st.sealed; r.bossAlive = !!G.boss;
      // 1) direkt auf die Treppe / das Portal stellen
      p.x = st.x; p.y = st.y; p.path = null; await w(900);
      r.stand = G.depth === d && G.screen === "play";
      r.drawnPortal = (G._portals || []).some(po => po.exit);
      await w(1600);                                         // Boss-Intro abwarten
      // 2) Dodge, der genau auf der Treppe landet, und Dodge quer darüber
      const dash = async (fx, fy) => { p.x = st.x - fx; p.y = st.y - fy; p.vx = p.vy = 0; p.dashCd = 0; p.dashT = 0.3; p.dashDx = Math.SQRT1_2; p.dashDy = Math.SQRT1_2; p.invulT = 1; await w(700); };
      await dash(3.1, 3.1); r.dodgeOn = G.depth === d && G.screen === "play";
      await dash(1.6, 1.6); r.dodgeOver = G.depth === d && G.screen === "play";
      // 3) Rückstoß (wie Boss-Schockwelle) über die Treppe
      p.x = st.x - 0.7; p.y = st.y - 0.7; p.vx = 9; p.vy = 9; await w(700); r.knock = G.depth === d && G.screen === "play";
      r.sealedStill = st.sealed;
      // Heimportal weit weg von der Arena
      const hp = G.L.homePortal, dx = Math.max(A.x - hp.x, 0, hp.x - (A.x + A.w)), dy = Math.max(A.y - hp.y, 0, hp.y - (A.y + A.h));
      r.homeDist = +Math.hypot(dx, dy).toFixed(1);
      // 4) Boss besiegen → Treppe öffnet sich sichtbar
      const t0 = G.t; KK.kill("boss");
      const tw = performance.now(); while (st.sealed && performance.now() - tw < 8000) await w(50);
      r.opened = !st.sealed; r.openAfter = +(G.t - t0).toFixed(2); r.bossDone = G.bossDone.includes(d);
      r.portalShown = d === 20 ? (G._portals || []).some(po => po.exit) : true;
      if (d === 20) { const t1 = performance.now(); while (G.screen !== "win" && performance.now() - t1 < 8000) await w(50); r.after = G.screen === "win"; await w(1600); document.getElementById("btnWinTown").click(); await w(300); return r; }
      // 5) erst jetzt: Treppe betreten → Ebene +1
      p.x = st.x - 1.6; p.y = st.y - 1.6; await w(300); p.path = [{ x: st.x, y: st.y }];
      const t2 = performance.now(); while (G.depth === d && performance.now() - t2 < 5000) await w(50);
      r.after = G.depth === d + 1;
      return r;
    }, d);
    bug.push(r);
  }
  R("V11", "Bug-Regression: Boss lebt → Treppe/20. Portal versiegelt (Draufstellen, Dodge drauf/drüber, Rückstoß: kein Wechsel/Sieg); Sieg → öffnet sichtbar → Betreten = Ebene +1 (E20: Sieg); Heimportal ≥ 4 Kacheln von der Arena",
    bug.every(r => r.sealed0 && r.bossAlive && r.stand && !r.drawnPortal && r.dodgeOn && r.dodgeOver && r.knock && r.sealedStill && r.opened && r.bossDone && r.portalShown && r.after && r.homeDist >= 4),
    bug.map(r => `E${r.d}: versiegelt ${r.sealed0 && r.sealedStill}, stehen/dodge/dodge-drüber/rückstoß ${[r.stand, r.dodgeOn, r.dodgeOver, r.knock].map(x => x ? "✓" : "✗").join("")}, offen nach ${r.openAfter} s, danach ${r.after ? "✓" : "✗"}, Heimportal ${r.homeDist} Kacheln weg`).join(" · "));
  // --- Wiedereinstieg: besiegter Boss → offen, unbesiegter → versiegelt (auch nach Reload/Weiterspielen) ---
  const re = await p12.evaluate(async () => {
    const G = KK.G, w = ms => new Promise(r => setTimeout(r, ms)), r = {};
    KK.start({ tut: false, name: "Fünf" }); KK.god(true);
    KK.goto(4); await w(50); KK.kill("boss"); await w(100);
    KK.goto(4); await w(50); r.e4Open = !G.L.stairs.sealed; r.e4Optional = G.L.arena.optional; r.e4BossBack = !!G.boss;
    KK.goto(8); await w(50); r.e8Sealed = G.L.stairs.sealed;
    KK.save(); r.saved = JSON.parse(localStorage.getItem("koboldkeller2_save")).bossDone;
    return r;
  });
  R("V12", "Wiedereinstieg: besiegter Boss → Treppe offen + Tore bleiben offen (Kampf freiwillig), unbesiegter → versiegelt; Zustand im Spielstand (bossDone)",
    re.e4Open && re.e4Optional && re.e8Sealed && Array.isArray(re.saved) && re.saved.includes(4) && !re.saved.includes(8), JSON.stringify(re));
  // --- V13 Mini-Bosse auf 2/6/10/14/18 (alle verschieden), keiner auf ungeraden Ebenen, Signatur-Angriffe mit Warnungen ---
  const lv = await p12.evaluate(async () => {
    const out = [];
    KK.start({ tut: false, name: "Fünf" }); KK.god(true);
    const A = await import("./src/art.js"), C = await import("./src/config.js");
    for (let d = 1; d <= 20; d++) {
      KK.goto(d); const b = KK.G.boss;
      out.push({ d, boss: b ? { name: b.name, epi: b.epi, mini: !!b.isMini, kind: b.kind || "rig", sig: b.def.sig.join("+"), h: b.isMini ? Math.round(A.miniSprite(b.kind).ay * b.scale) : Math.round((Math.abs(A.RIG.neck) + 112 + 40) * b.scale * 0.86), hp: b.maxHp, dmg: b.dmg } : null });
    }
    return out;
  });
  const minis = lv.filter(x => x.boss && x.boss.mini), mains = lv.filter(x => x.boss && !x.boss.mini), odd = lv.filter(x => x.d % 2 === 1 && x.boss);
  const uniq = k => new Set(minis.map(x => x.boss[k])).size;
  const miniSig = [];
  for (const m of minis) {
    await p12.evaluate((d) => { KK.goto(d); KK.god(true); KK.G.portalCd = 1e9; const A = KK.G.L.arena; KK.teleport(A.cx + 0.8, A.cy + 3.4); }, m.d);
    await sleep(2600);
    for (const k of m.boss.sig.split("+")) {
      const tl = await p12.evaluate((k) => { const b = KK.G.boss; b.speed = 0; KK.bossAtk(k); return new Promise(res => setTimeout(() => res(KK.G.teles.length + KK.G.shots.filter(s => s.kind !== "bubble").length), 500)); }, k);
      miniSig.push(m.d + ":" + k + "=" + tl);
      await shot(p12, "v5/mini_e" + m.d + "_" + k);
      await sleep(1700);
    }
    const mus = await p12.evaluate(() => KK.audio().music || {});
    m.music = mus.song + "/" + mus.boss + "@" + mus.bpm;
  }
  R("V13", "Mini-Bosse auf Ebene 2/6/10/14/18 (5 verschiedene Namen/Wesen/Angriffe), Hauptbosse auf 4/8/12/16/20, keiner auf ungeraden Ebenen, jeder Signatur-Angriff zeigt Warnungen, Mini klar kleiner + schwächer als Hauptboss, eigene Mini-Boss-Musik",
    minis.map(x => x.d).join() === "2,6,10,14,18" && mains.map(x => x.d).join() === "4,8,12,16,20" && odd.length === 0 && uniq("name") === 5 && uniq("kind") === 5 && uniq("sig") === 5 &&
    miniSig.every(x => +x.split("=")[1] > 0) && minis.every(x => x.boss.h < 0.8 * Math.min(...mains.map(m => m.boss.h)) && x.boss.hp < lv[x.d + 1].boss.hp) && minis.every(m => /^boss\/3@\d+/.test(m.music)),
    minis.map(x => `E${x.d} ${x.boss.name} „${x.boss.epi}“ [${x.boss.sig}] ❤️${x.boss.hp} ⚔️${x.boss.dmg} Höhe ${x.boss.h} ♪${x.music}`).join(" · ") + " | Hauptboss-Höhe ≥ " + Math.min(...mains.map(m => m.boss.h)) + " | Angriffe: " + miniSig.join(" "));
  // --- V14 Arenen: Größe je Boss-Ebene ≥ Tabelle und steigend, Säulen/Tore/Spawn-Punkte, Kamera zoomt heraus (Chunks < Cache) ---
  const ar = [];
  for (const d of [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
    const r = await p12.evaluate(async (d) => {
      const C = await import("./src/config.js"), w = ms => new Promise(r => setTimeout(r, ms));
      KK.start({ tut: false, name: "Fünf" }); KK.god(true); KK.goto(d); KK.G.portalCd = 1e9; await w(50);
      const a = KK.arena(), A = KK.G.L.arena;
      KK.teleport(A.cx - 3, A.cy - 3);
      return { d, size: a.size, want: C.ARENA[d].size, pillars: a.pillars, gates: a.gates, spawns: a.spawns };
    }, d);
    await sleep(2800);
    Object.assign(r, await p12.evaluate(() => ({ zoom: KK.state().zoom, chunks: KK.R.chunksVis, closed: KK.arena().closed, blocked: KK.arena().gateBlocked })));
    await shot(p12, "v5/arena_e" + d + "_hoch");
    ar.push(r);
  }
  const incr = ar.every((r, i) => i === 0 || r.size > ar[i - 1].size);
  R("V14", "Große Arena je Boss-Ebene: Größe ≥ Tabelle (config.ARENA) und mit der Tiefe steigend (v4: 12), Säulen + Tore + Spawn-Punkte, Tore zu sobald man drin ist, Kamera zoomt heraus (sichtbare Chunks < 28)",
    ar.every(r => r.size >= r.want && r.pillars >= 3 && r.gates > 0 && r.spawns >= 3 && r.closed && r.blocked === r.gates && r.zoom < 0.9 && r.chunks < 28) && incr,
    ar.map(r => `E${r.d} ${r.size}×${r.size} (${r.pillars} Säulen, ${r.gates} Tor-Kacheln, ${r.spawns} Spawn-Punkte, Zoom ${r.zoom}, Chunks ${r.chunks})`).join(" · "));
  // --- V15 Handlanger: spawnen im Kampf mit Spawn-Kreis, Deckel eingehalten, wenig Beute, nach Sieg alle weg + 10 s später immer noch 0 ---
  const mn = [];
  for (const d of [12, 2]) {
    const r = await p12.evaluate(async (d) => {
      const G = KK.G, w = ms => new Promise(r => setTimeout(r, ms)), r = { d };
      KK.start({ tut: false, name: "Fünf" }); KK.god(true); KK.goto(d); G.portalCd = 1e9; await w(50);
      const A = G.L.arena; r.closedBefore = KK.arena().closed;
      KK.teleport(A.cx - 3, A.cy - 3); G.boss.speed = 0;
      KK.speed(4);
      let maxC = 0, sawSpawn = false, sawMin = false, t0 = G.t;
      while (G.t - t0 < 14) { const a = KK.arena(); maxC = Math.max(maxC, a.count); if (a.spawning) sawSpawn = true; if (a.minions) sawMin = true; G.boss.hp = G.boss.maxHp; await w(40); }
      KK.speed(1);
      r.cap = KK.arena().cap; r.maxNatural = maxC; r.sawSpawn = sawSpawn; r.sawMin = sawMin; r.secs = +(G.t - t0).toFixed(1);
      KK.wave(30); r.afterForce = KK.arena().count;
      // Beute eines Handlangers (wenig Munition/XP, kein Farmen)
      await w(1000);
      const mi = G.ents.find(e => e.minion);
      if (mi) { const gm = await import("./src/game.js"); const ref = gm.makeEnt(mi.type, 0, 0); G.p.ammo = 0; gm.killEnt(mi); r.minionAmmo = G.p.ammo; r.xpRatio = +(mi.xp / ref.xp).toFixed(2); }
      return r;
    }, d);
    await shot(p12, "v5/handlanger_e" + d);
    // Spawn-Effekt fotografieren
    await p12.evaluate(() => { for (const e of KK.G.ents.slice()) if (e.minion) KK.G.ents.splice(KK.G.ents.indexOf(e), 1); KK.wave(9); });
    await sleep(350);
    await shot(p12, "v5/spawn_kreis_e" + r.d);
    const after = await p12.evaluate(async () => {
      const G = KK.G, w = ms => new Promise(r => setTimeout(r, ms)), r = {};
      await w(200);
      r.before = KK.arena().count; r.laterBoss = G.later.filter(l => l.tag === "boss").length;
      KK.kill("boss");
      r.minions0 = KK.arena().minions; r.spawning0 = KK.arena().spawning; r.laterBoss0 = G.later.filter(l => l.tag === "boss").length; r.enemyShots0 = G.shots.filter(s => s.kind !== "bubble").length;
      KK.speed(4); const t0 = G.t; let mx = 0;
      while (G.t - t0 < 10.5) { mx = Math.max(mx, KK.arena().count); await w(40); }
      KK.speed(1);
      r.max10s = mx; r.secs = +(G.t - t0).toFixed(1); r.gatesOpen = KK.arena().gateBlocked === 0;
      return r;
    });
    Object.assign(r, after);
    mn.push(r);
  }
  R("V15", "Handlanger: spawnen laufend im Kampf (mit 0,8-s-Spawn-Kreis), Deckel nie überschritten (auch bei erzwungenen Wellen), wenig Beute (🫧 +1, ≤ ⅓ XP); Sieg → sofort 0 Handlanger/Spawn-Kreise/Timer, 10 s später immer noch 0, Tore offen",
    mn.every(r => !r.closedBefore && r.sawSpawn && r.sawMin && r.maxNatural <= r.cap && r.afterForce <= r.cap && r.cap <= 9 && r.minionAmmo === 1 && r.xpRatio <= 0.4 && r.before > 0 && r.minions0 === 0 && r.spawning0 === 0 && r.laterBoss0 === 0 && r.enemyShots0 === 0 && r.max10s === 0 && r.secs >= 10 && r.gatesOpen),
    mn.map(r => `E${r.d}: in ${r.secs} s max ${r.maxNatural}/${r.cap} (erzwungen ${r.afterForce}), Spawn-Kreis ${r.sawSpawn ? "✓" : "✗"}, Handlanger-Beute 🫧+${r.minionAmmo} XP×${r.xpRatio} · vor Sieg ${r.before} → nach Sieg ${r.minions0}+${r.spawning0} (Timer ${r.laterBoss0}), 10 s später max ${r.max10s}, Tore offen ${r.gatesOpen}`).join(" · "));
  await c12.close();
}
// --- Querformat: Arenen (Haupt + Mini) ---
{
  const { ctx: c13, page: p13 } = await newPage(915, 412);
  await p13.evaluate(() => KK.start({ tut: false, name: "Quer" }));
  const q = [];
  for (const d of [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
    await p13.evaluate((d) => { KK.start({ tut: false, name: "Quer" }); KK.god(true); KK.goto(d); KK.G.portalCd = 1e9; const A = KK.G.L.arena; KK.teleport(A.cx - 3, A.cy - 3); }, d);
    await sleep(2700);
    q.push(await p13.evaluate(() => ({ d: KK.state().depth, zoom: KK.state().zoom, chunks: KK.R.chunksVis, boss: (() => { const b = KK.G.boss; const [sx, sy] = [0, 0]; return !!b; })() })));
    await shot(p13, "v5/arena_e" + q[q.length - 1].d + "_quer");
  }
  R("V16", "Querformat: jede Arena mit herausgezoomter Kamera (Boss + Warnungen im Bild), sichtbare Chunks < 28", q.every(r => r.zoom < 0.95 && r.chunks < 28), q.map(r => `E${r.d} Zoom ${r.zoom} Chunks ${r.chunks}`).join(" · "));
  await c13.close();
}
// --- V17 Save-Migration v4 → v5 ---
{
  const v4 = { v: 2, name: "Vier4", species: "hase", look: { species: "hase", skin: "#f6eee0", outfit: "#ffcf4a", eye: "#6b2f5a", hair: "#ffc2d4", style: "zoepfe", earsV: 1, acc: "brille" }, lvl: 9, xp: 5, xpNext: 80, maxHp: 20, hp: 18, atk: 7, projN: 2, magic: 3, gold: 777, potions: 4, ammo: 18, spec: 0.67, sk: { kraft: 2, leben: 3, tempo: 1, blasen: 1, magnet: 1 }, skPts: 3, hats: ["pilz", "diadem"], hat: "diadem", deepest: 9, depth: 6, mega: false, tut: true, runSecs: 50, won: false, seed: 4321, kills: 99, capNote: 0, giftNote: 0 };
  const { ctx: c14, page: p14 } = await newPage(412, 915, `localStorage.setItem("koboldkeller2_save", ${JSON.stringify(JSON.stringify(v4))});`);
  const inf = await p14.textContent("#contInfo");
  await tapEl(p14, "#btnCont");
  await waitFor(p14, () => KK.state().screen === "play" && !KK.state().demo);
  await sleep(1200);
  const s = await p14.evaluate(() => ({ ...KK.state(), raw: JSON.parse(localStorage.getItem("koboldkeller2_save")), toasts: [...document.querySelectorAll(".toast")].map(t => t.textContent).join(" | ") }));
  await shot(p14, "v5/migration_v4");
  const e4 = await p14.evaluate(() => { KK.goto(8); const a = KK.G.L.stairs.sealed; KK.goto(10); const b = KK.G.L.stairs.sealed; return { e8: a, e10: b }; });
  R("V17", "Save-Migration v4 → v5: nichts verloren (Level, Gold, Talente, Punkte, Spezial, Munition, Hüte, Aussehen, Tiefe), keine doppelten Geschenke, schon passierte Boss-Ebenen offen (bossDone), tiefere versiegelt, Datei v3",
    s.name === "Vier4" && s.lvl === 9 && s.gold === 777 && s.skPts === 3 && s.sk.kraft === 2 && s.sk.leben === 3 && s.spec === 0.67 && s.ammo === 18 && s.hat === "diadem" && s.look.style === "zoepfe" && s.depth === 6 && s.bossDone.join() === "2,4,6,8" && !s.stairsSealed && !e4.e8 && e4.e10 && s.raw.v === 3 && s.raw.bossDone.join() === "2,4,6,8" && !/Willkommen in v4|zu voll/.test(s.toasts),
    `${inf} → Lv ${s.lvl}, 🪙 ${s.gold}, Punkte ${s.skPts}, Talente ${JSON.stringify(s.sk)}, Spezial ${s.spec}, 🫧 ${s.ammo}, Hut ${s.hat}, Frisur ${s.look.style}, Ebene ${s.depth} (Treppe ${s.stairsSealed ? "zu" : "offen"}), bossDone ${s.bossDone.join(",")}, E8 ${e4.e8 ? "zu" : "offen"}, E10 ${e4.e10 ? "zu" : "offen"}, Datei v${s.raw.v}`);
  await c14.close();
}
// Info: reines Software-Raster (kein GPU) — Worst Case, adaptive Qualität darf greifen
swInfo = null;
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
}
// =====================================================================
// 6) v7 — Würfel-Look + Namen, Haptik dezent, Weg-Pfeil, Save v6 → v7 (tools/checks_v7.mjs, Screenshots in shots/neubau/v7/)
// =====================================================================
if (V7MODE !== "skip") await runV7({ browser, BASE, R, errors, secs: HAPSECS });
if (V7MODE !== "skip") await runV8({ browser, BASE, R, errors, REF });
if (V7MODE !== "skip") await runV9({ browser, BASE, R, errors });
if (V7MODE !== "skip") await runV10({ browser, BASE, R, errors });
if (V7MODE !== "skip") await runV11({ browser, BASE, R, errors, throttle: THROTTLE });
if (V7MODE !== "skip") await runV12({ browser, BASE, R, errors, throttle: THROTTLE });
if (V7MODE !== "skip") await runV13({ browser, BASE, R, errors });   // v13 Deko (V35–V35d; Kosten V35e einzeln: node tools/checks_v13.mjs)
R("A1", "Keine pageerrors/console.errors (hoch + quer)", errors.length === 0, errors.length ? errors.slice(0, 5).join(" | ") : "0");
R("A5", "Keine externen Requests", foreign.length === 0, foreign.length ? foreign.slice(0, 3).join(", ") : "0");
await browser.close();
const pass = results.filter(r => r.pass).length;
console.log(`\n${pass}/${results.length} PASS`);
writeFileSync(SHOTS + (V7MODE === "all" ? "check-results.json" : "check-results-v7" + V7MODE + ".json"), JSON.stringify({ date: new Date().toISOString(), profile: PROFILE, throttle: THROTTLE, fpsNormal: fpsN, fpsThrottled: fpsT, software: swInfo, results, errors }, null, 2));
process.exit(pass === results.length ? 0 : 1);
