// Koboldkeller 2 — v11-Check V33: Der Boss wächst erst aus dem Boden, wenn der Kobold wirklich in der Arena steht (Peter 05.10.2026).
// Je Boss-Art (Haupt E4, Mini E2, Flug-Mini E6, Kellerkönig E20):
//  · vorher: Boss nicht in G.ents (nicht gezeichnet, nicht treffbar), kein Bosskampf, Pfeil-Ziel = Arena
//  · Kobold im Torbogen und 1 Kachel hinter der Torlinie → nichts passiert; Seifenblasen durchs Tor treffen nichts
//  · Kobold 2 Kacheln drin → Tore zu, Auftritt startet (Beben → Aufbruch → Herauswachsen → Landung), Kobold unverwundbar,
//    danach Boss da + wach (Titelkarte), kein Überlappen mit dem Kobold, Krater bleibt liegen
// V33b: besiegte Ebene → Tore bleiben offen, gleicher Auslöser; Hinauslaufen während des Bebens → Auftritt läuft zu Ende
// V33c: Frame-Zeit p95 während des Auftritts (Kellerkönig) bei CPU-Drosselung 4×, hoch + quer (Ziel ≥ 45 fps)
// Bildfolge (leer → Beben → Aufbruch → halb heraus → ganz da → Kampf) hoch + quer → shots/neubau/v11/.
// Einzeln: node tools/checks_v11.mjs [--port=8731] [--throttle=4]
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GPU_FLAGS } from "./checks_v9.mjs";

const V11 = "shots/neubau/v11/";
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Helfer im Browser: Warten in Spielzeit (headless taktet rAF unregelmäßig — G.t ist maßgeblich), Tor + Richtung in die Arena */
const PAGE_HELPERS = () => {
  window.__w = ms => new Promise(r => setTimeout(r, ms));
  window.__untilT = async (dt, maxMs = 15000) => { const G = KK.G, t0 = G.t, r0 = performance.now(); while (G.t - t0 < dt && performance.now() - r0 < maxMs) await window.__w(16); return +(G.t - t0).toFixed(2); };
  window.__until = async (fn, maxMs = 15000) => { const r0 = performance.now(); while (!fn() && performance.now() - r0 < maxMs) await window.__w(16); return !!fn(); };
  window.__gate = () => {
    const A = KK.G.L.arena, g = A.gates[0];
    const ix = g.x < A.x ? 1 : g.x > A.x + A.w ? -1 : 0, iy = g.y < A.y ? 1 : g.y > A.y + A.h ? -1 : 0;
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    /** Punkt k Kacheln hinter dem Tor (seitlich ≥ 2 Kacheln von der Arena-Wand, damit nur die Tiefe zählt) */
    const at = k => ({ x: ix ? g.x + ix * k : cl(g.x, A.x + 2, A.x + A.w - 2), y: iy ? g.y + iy * k : cl(g.y, A.y + 2, A.y + A.h - 2) });
    return { x: g.x, y: g.y, ix, iy, at };
  };
};

/** Ebene betreten, Vorbedingungen + Tor/1-Kachel/Seifenblasen prüfen (Kobold bleibt 1 Kachel hinter der Torlinie stehen) */
const BEFORE = async (d) => {
  const G = KK.G, r = { d };
  G.bossDone = d < 0 ? [-d] : []; d = Math.abs(d);
  KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9;
  await __untilT(0.3);
  const b = G.boss, A = G.L.arena, gt = __gate();
  r.name = b.name; r.kind = b.isKing ? "König" : b.isMini ? (b.fly ? "Flug-Mini" : "Mini") : "Haupt"; r.optional = !!A.optional;
  r.start = { inEnts: G.ents.includes(b), awake: !!b.awake, fight: KK.arena().fight, target: (KK.guide().cur || {}).kind };
  KK.teleport(gt.x, gt.y); await __untilT(0.6);                                      // im Torbogen
  r.gate = { rise: !!G.rise, inEnts: G.ents.includes(b), closed: KK.arena().closed };
  G.p.lastMx = A.cx - G.p.x; G.p.lastMy = A.cy - G.p.y; G.p.ammo = 20;               // Seifenblasen durchs Tor auf die Mitte
  const hp0 = b.hp; let shots = 0;
  for (let i = 0; i < 4; i++) { G.p.bubCd = 0; if (KK.bubbles()) shots++; await __untilT(0.3); }
  await __untilT(1.0);
  r.bubbles = { shots, hpSame: b.hp === hp0, inEnts: G.ents.includes(b), rise: !!G.rise, awake: !!b.awake };
  { const q = gt.at(1.5); KK.teleport(q.x, q.y); } await __untilT(0.6);                 // 1 Kachel hinter der Torlinie
  r.oneIn = { rise: !!G.rise, inEnts: G.ents.includes(b), closed: KK.arena().closed };
  return r;
};
/** 2 Kacheln hinein → Auftritt muss starten */
const ENTER = async (d) => {
  const G = KK.G, b = G.boss, gt = __gate(), r = {};
  { const q = gt.at(2.5); KK.teleport(q.x, q.y); }
  r.started = await __until(() => !!G.rise, 3000);
  r.closed = KK.arena().closed; r.blocked = KK.arena().gateBlocked; r.inEnts = G.ents.includes(b);
  r.dur = G.rise ? +G.rise.dur.toFixed(2) : 0; r.invul = +G.p.invulT.toFixed(2); r.guideBlocked = !!G.rise && KK.guide().a === 0;
  window.__riseT0 = G.t;
  // Wächter je Frame: während des ganzen Auftritts unverwundbar, kein Schaden, Boss nicht treffbar (nicht in G.ents)
  const W = window.__watch = { invulOk: true, hpOk: true, hidden: true, frames: 0, hp0: G.p.hp };
  (function f() { if (!G.rise) return; W.frames++; W.invulOk = W.invulOk && G.p.invulT > 0; W.hpOk = W.hpOk && G.p.hp >= W.hp0; W.hidden = W.hidden && !G.ents.includes(b); requestAnimationFrame(f); })();
  return r;
};
/** bis zum Ende des Auftritts: unverwundbar, kein Schaden, danach Boss da + wach, kein Überlappen, Krater */
const FINISH = async () => {
  const G = KK.G, b = G.boss, r = {}, A = G.L.arena;
  await __until(() => !G.rise, 15000);
  r.riseSecs = A.rose && A.rose.t1 ? +(A.rose.t1 - A.rose.t0).toFixed(2) : -1;            // Spielzeit Beginn → Boss da
  await __until(() => G.ents.includes(b) && b.awake, 3000);
  r.inEnts = G.ents.includes(b); r.awake = !!b.awake; r.fight = KK.arena().fight; r.closed = KK.arena().closed;
  const W = window.__watch; r.invulOk = W.invulOk; r.hpOk = W.hpOk; r.hidden = W.hidden; r.frames = W.frames; r.card = performance.now() < (G.cardUntil || 0);
  r.dist = +Math.hypot(G.p.x - b.x, G.p.y - b.y).toFixed(2); r.minDist = +(b.r + G.p.r).toFixed(2);
  r.crater = !!G.L.arena.crater; r.baked = !!(G.L.arena.crater && G.L.arena.crater.baked);
  return r;
};

export async function runV11({ browser, BASE, R, errors, throttle = 4 }) {
  mkdirSync(V11, { recursive: true });
  const out = { cases: [], optional: [], perf: [] };
  for (const [w, h] of [[412, 915], [915, 412]]) {
    const tag = w > h ? "quer" : "hoch";
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push("v11 " + tag + " pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error") errors.push("v11 " + tag + " console: " + m.text()); });
    await page.goto(BASE + "index.html");
    await page.waitForFunction(() => window.KK && window.KK.G && window.KK.G.L, null, { timeout: 30000 });
    await page.waitForFunction(() => KK.audio().pre && KK.audio().pre.done, null, { timeout: 90000 }).catch(() => { });   // Vor-Rendern fertig (sonst misst V33c es mit)
    await page.evaluate(PAGE_HELPERS);
    await page.evaluate(() => { KK.start({ name: "Auftritt" }); KK.god(true); });
    const cases = tag === "hoch" ? [[4, "haupt"], [2, "mini"], [6, "flug"], [20, "koenig"]] : [[4, "haupt"], [10, "lutz"], [20, "koenig"]];
    for (const [d, nm] of cases) {
      const pre = await page.evaluate(BEFORE, d);
      await page.screenshot({ path: V11 + `${nm}_0_leer_${tag}.png` });
      const seq = await page.evaluate(ENTER, d);
      const T = await page.evaluate(() => KK.G.rise ? KK.G.rise.T : null) || { quake: 0.7, burst: 0.3, grow: 1.2, land: 0.4 };
      const marks = [["1_beben", T.quake * 0.8], ["2_aufbruch", T.quake + T.burst * 0.55], ["3_halb", T.quake + T.burst + T.grow * 0.45], ["4_da", T.quake + T.burst + T.grow + T.land * 0.5]];
      for (const [mk, at] of marks) {           // Spielzeit an der Marke anhalten → Foto → weiter (sonst kommt das Bild zu spät)
        await page.evaluate(async (at) => { const G = KK.G, r0 = performance.now(); while (G.rise && G.t - window.__riseT0 < at && performance.now() - r0 < 8000) await new Promise(r => requestAnimationFrame(r)); KK.freeze(true); }, at);
        await sleep(60);
        await page.screenshot({ path: V11 + `${nm}_${mk}_${tag}.png` });
        await page.evaluate(() => KK.freeze(false));
      }
      const fin = await page.evaluate(FINISH);
      await sleep(300);
      await page.screenshot({ path: V11 + `${nm}_5_kampf_${tag}.png` });
      await page.evaluate(() => KK.kill("boss"));
      await sleep(300);
      out.cases.push({ tag, nm, pre, seq, fin });
    }
    // V33b: besiegte Ebene (E4): Tore bleiben offen; während des Bebens wieder hinaus → Auftritt läuft zu Ende
    if (tag === "hoch") {
      const pre = await page.evaluate(BEFORE, -4);
      const seq = await page.evaluate(ENTER, 4);
      const leave = await page.evaluate(async () => {
        const G = KK.G, gt = __gate(); await __untilT(0.25);
        KK.teleport(gt.x - gt.ix * 2, gt.y - gt.iy * 2);                                // zurück in den Gang
        await __untilT(0.2); return { outside: true, rise: !!G.rise, phase: G.rise && G.rise.ph };
      });
      const fin = await page.evaluate(FINISH);
      out.optional.push({ tag, pre, seq, leave, fin });
      await page.evaluate(() => KK.kill("boss"));
      // Kobold steht genau auf dem Erscheinungspunkt (KK.teleport("boss")) → wird sanft weggeschoben, kein Überlappen
      out.onSpot = await page.evaluate(async () => {
        const G = KK.G; G.bossDone = []; KK.goto(2); G.portalCd = 1e9; await __untilT(0.3);
        KK.teleport("boss"); const started = await __until(() => !!G.rise, 3000);
        window.__watch = { invulOk: true, hpOk: true, hidden: true, frames: 0 }; window.__riseT0 = G.t;
        const f = await (async () => { await __until(() => !G.rise, 15000); await __until(() => G.ents.includes(G.boss) && G.boss.awake, 3000); const b = G.boss; return { dist: +Math.hypot(G.p.x - b.x, G.p.y - b.y).toFixed(2), minDist: +(b.r + G.p.r).toFixed(2), awake: !!b.awake }; })();
        KK.kill("boss");
        return { started, ...f };
      });
    }
    // V33c: Frame-Zeit während des Auftritts (Kellerkönig = größter Auftritt), CPU-Drosselung
    {
      const cdp = await ctx.newCDPSession(page);
      await page.evaluate(BEFORE, 20);
      await page.evaluate(() => KK.quality(0));
      if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
      await sleep(800);
      const pf = await page.evaluate(async () => {
        const G = KK.G, gt = __gate(), ft = [];
        let last = performance.now(), on = true;
        (function f(t) { if (!on) return; ft.push(t - last); last = t; requestAnimationFrame(f); })(performance.now());
        { const q = gt.at(2.5); KK.teleport(q.x, q.y); }
        await __until(() => !!G.rise, 3000); ft.length = 0;
        const r0 = performance.now();
        while (G.rise && performance.now() - r0 < 20000) await __w(20);
        const rise = ft.slice(2); ft.length = 0;
        await __w(1500); ft.length = 0; await __w(3000);                  // Vergleich: derselbe Kampf danach (gleicher Zoom, ohne Auftritt)
        on = false;
        const st = (x) => { const a = x.slice().sort((p, q) => p - q), p95 = a[Math.floor(a.length * 0.95)] || 0, med = a[a.length >> 1] || 0; return { frames: a.length, medMs: +med.toFixed(1), p95Ms: +p95.toFixed(1), fpsMed: +(1000 / med).toFixed(1), fpsP95: +(1000 / p95).toFixed(1) }; };
        return { ...st(rise), fight: st(ft), q: KK.quality() };
      });
      if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      out.perf.push({ tag, throttle, ...pf });
    }
    await ctx.close();
  }
  writeFileSync(V11 + "v11.json", JSON.stringify(out, null, 2));
  // ---------- Auswertung ----------
  const pre = c => c.pre.start.inEnts === false && !c.pre.start.awake && !c.pre.start.fight && (c.pre.optional ? c.pre.start.target === "stairs" : c.pre.start.target === "arena")
    && !c.pre.gate.rise && !c.pre.gate.inEnts && !c.pre.gate.closed && c.pre.bubbles.shots >= 3 && c.pre.bubbles.hpSame && !c.pre.bubbles.inEnts && !c.pre.bubbles.rise && !c.pre.bubbles.awake
    && !c.pre.oneIn.rise && !c.pre.oneIn.inEnts && !c.pre.oneIn.closed;
  const enter = c => c.seq.started && c.seq.closed && !c.seq.inEnts && c.seq.invul >= c.seq.dur;
  const done = c => c.fin.inEnts && c.fin.awake && c.fin.fight && c.fin.invulOk && c.fin.hpOk && c.fin.hidden && c.fin.dist >= c.fin.minDist && c.fin.crater && c.fin.baked && c.fin.riseSecs > 0 && c.fin.riseSecs <= c.seq.dur + 0.1;
  const okA = out.cases.every(c => pre(c) && enter(c) && done(c));
  R("V33", "Boss-Auftritt: vorher nicht da (Tor/1 Kachel/Seifenblasen → nichts), 2 Kacheln drin → Tore zu + Boss wächst aus dem Boden, unverwundbar, danach wach + Krater",
    okA, out.cases.map(c => `${c.tag} E${c.pre.d} ${c.pre.kind}: vorher ${pre(c) ? "leer" : "FEHLER " + JSON.stringify(c.pre)} · Auftritt ${c.seq.dur} s (gemessen ${c.fin.riseSecs} s), Tore ${c.seq.closed ? "zu" : "offen"} · danach ${c.fin.awake ? "wach" : "schläft"}, Abstand ${c.fin.dist} ≥ ${c.fin.minDist}, Krater ${c.fin.baked ? "ja" : "nein"}${enter(c) && done(c) ? "" : " FEHLER " + JSON.stringify({ seq: c.seq, fin: c.fin })}`).join(" | "));
  const o = out.optional[0];
  const s = out.onSpot;
  const okB = !!o && o.pre.optional && pre(o) && o.seq.started && !o.seq.closed && o.seq.blocked === 0 && o.leave.rise && o.fin.inEnts && o.fin.awake && !o.fin.closed
    && !!s && s.started && s.awake && s.dist >= s.minDist;
  R("V33b", "Besiegte Ebene: Tore bleiben offen, gleicher Auslöser; Hinauslaufen während des Bebens → Auftritt läuft zu Ende; Kobold auf dem Erscheinungspunkt → weggeschoben", okB,
    (o ? `optional ${o.pre.optional}, Tore ${o.seq.closed ? "zu" : "offen"} (blockiert ${o.seq.blocked}), hinaus: Auftritt läuft (${o.leave.phase}), danach Boss ${o.fin.awake ? "wach" : "schläft"}` : "–") +
    (s ? ` · auf dem Punkt: Abstand danach ${s.dist} ≥ ${s.minDist}` : ""));
  const okC = out.perf.every(p => p.fpsP95 >= 45 || p.p95Ms <= p.fight.p95Ms * 1.1);
  R("V33c", `Frame-Zeit während des Kellerkönig-Auftritts, CPU ${throttle}× (p95 ≥ 45 fps oder nicht schlechter als der Kampf danach)`, okC,
    out.perf.map(p => `${p.tag}: Auftritt Median ${p.medMs} ms (${p.fpsMed} fps), p95 ${p.p95Ms} ms (${p.fpsP95} fps), ${p.frames} Frames · Kampf danach p95 ${p.fight.p95Ms} ms (${p.fight.fpsP95} fps)`).join(" · "));
  return out;
}

// ---------- einzeln ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=")[1] : d; };
  const PORT = +arg("port", 8731), TH = +arg("throttle", 4), BASE = `http://localhost:${PORT}/`;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
  const errors = [], res = [];
  const R = (id, name, pass, value = "") => { res.push({ id, name, pass: !!pass, value }); console.log((pass ? "PASS " : "FAIL ") + id.padEnd(5) + name + (value !== "" ? "  → " + value : "")); };
  await runV11({ browser, BASE, R, errors, throttle: TH });
  R("A1v11", "Keine Laufzeitfehler (V33)", errors.length === 0, errors.length ? errors.slice(0, 5).join(" | ") : "0");
  await browser.close();
  process.exit(res.every(r => r.pass) ? 0 : 1);
}
