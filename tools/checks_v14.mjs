// Koboldkeller 2 — v14-Checks (Vorlagen, VORLAGEN.md). Jede Etappe ein Check, Bilder → shots/neubau/v14/
// V40 (E1): Bedarfs-Beute — bei ❤️ ≤ 25 % Heil-Beute ≥ 25 % je Kill + Glühwürmchen-Heiler fliegt zum Kobold und heilt +50 %;
//           🫧 leer → Blasen-Nachschub; volle Sachen fallen nicht (0 „voll → Gold“); Upgrade-Zähler ≥ 60 → Truhe mit Upgrade;
//           Zähler steht im Spielstand; ?bedarf=0&beutetakt=0 = v13 (kein Heiler, Herz 10 %, nutzlose Drops fallen)
// V41 (E2): alter Spielstand (Datei v3, Lv 15) → Weiterspielen: Lv 15, Talente gleich, Fortschritt anteilig, XP ohne Level-Anteil × Aufhol-Faktor
// V42 (E3): Zucken im Warnmoment, Schreck-Flucht mit Bildfolge, Ziel-Kegel (Joystick-Würfe)
// Einzeln: node tools/checks_v14.mjs [--port=8731] [--only=V40,V42] [--ref=8732]
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIR = "shots/neubau/v14/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const GPU = [process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"];
const SEED = () => { Math.random = (() => { let s = 4242; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); })(); };

export async function page0(browser, BASE, errors, q = "", opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: opt.w || 412, height: opt.h || 915 }, deviceScaleFactor: opt.dpr || 2, hasTouch: true, isMobile: true, locale: "de-AT" });
  if (opt.seed !== false) await ctx.addInitScript(SEED);
  if (opt.init) await ctx.addInitScript(opt.init);
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push("v14 " + q + " pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("v14 " + q + " console: " + m.text()); });
  await page.goto(BASE + "index.html" + (q ? "?" + q : ""));
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: DIR + name + ".png" });

/** Beute-Statistik: n normale Gegner auf Ebene d im Zustand st besiegen (synchron, ohne Aufheben), Beute zählen */
const LOOT = async ({ d, st, n }) => {
  KK.start({ name: "Beute" }); KK.god(true); KK.goto(d);
  const G = KK.G, p = G.p;
  for (const e of G.ents.slice()) { e.hp = 0; G.ents.splice(G.ents.indexOf(e), 1); }
  const cnt = {}; let items = 0;
  for (let i = 0; i < n; i++) {
    Object.assign(p, st.hpFrac !== undefined ? { hp: Math.max(1, Math.floor(p.maxHp * st.hpFrac)) } : { hp: p.maxHp }, st.ammo !== undefined ? { ammo: st.ammo } : {}, st.potions !== undefined ? { potions: st.potions } : {}, st.spec !== undefined ? { spec: st.spec } : {});
    G.items.length = 0;
    KK.spawn("bat", 2, 0); KK.kill("all");
    for (const it of G.items) { cnt[it.kind] = (cnt[it.kind] || 0) + 1; if (it.kind !== "coin") items++; }
  }
  G.items.length = 0;
  return { cnt, items, n, heil: ((cnt.heart || 0) + (cnt.firefly || 0)) / n };
};

let REF = null;
export async function runV14({ browser, BASE, R, errors, only = null, ref = null }) {
  REF = ref;
  mkdirSync(DIR, { recursive: true });
  const want = id => !only || only.split(",").includes(id);
  const out = {};

  // ===================================================================
  // V40 — E1 Bedarfs-Beute + Upgrade-Zähler
  // ===================================================================
  if (want("V40")) {
    // echter Zufall (der einfache Test-Zufall korreliert über die feste Zahl Zufallszüge je Kill), große Stichprobe
    const A = await page0(browser, BASE, errors, "", { seed: false }), B = await page0(browser, BASE, errors, "bedarf=0&beutetakt=0", { seed: false });
    const wenigA = await A.page.evaluate(LOOT, { d: 5, st: { hpFrac: 0.2 }, n: 2000 });
    const wenigB = await B.page.evaluate(LOOT, { d: 5, st: { hpFrac: 0.2 }, n: 2000 });
    const leerA = await A.page.evaluate(LOOT, { d: 5, st: { ammo: 0 }, n: 2000 });
    const vollA = await A.page.evaluate(LOOT, { d: 5, st: { potions: 5, spec: 1 }, n: 300 });
    const vollB = await B.page.evaluate(LOOT, { d: 5, st: { potions: 5, spec: 1 }, n: 300 });
    // nutzlose Drops wirklich aufheben: „voll → Gold“-Zähler (G.stats.nutzlos) nach 60 Kills mit vollem Rucksack
    const pick = async (page) => page.evaluate(async () => {
      KK.start({ name: "Voll" }); KK.god(true); KK.goto(5);
      const G = KK.G, p = G.p; for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
      G.stats.nutzlos = 0;
      for (let i = 0; i < 60; i++) { p.hp = p.maxHp; p.potions = 5; p.spec = 1; KK.spawn("bat", 0.6, 0); KK.kill("all"); await new Promise(r => setTimeout(r, 60)); }
      await new Promise(r => setTimeout(r, 2500));
      return { nutzlos: G.stats.nutzlos, left: G.items.length };
    });
    const pkA = await pick(A.page), pkB = await pick(B.page);
    // Glühwürmchen-Heiler: fliegt (schwebt) zum Kobold und heilt +50 % — Bildfolge
    const ff = await A.page.evaluate(async () => {
      KK.start({ name: "Heiler" }); KK.goto(5); KK.god(false);
      const G = KK.G, p = G.p; for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
      p.hp = Math.max(1, Math.floor(p.maxHp * 0.2)); const hp0 = p.hp;
      KK.item("firefly", 4.6, 0.4); const it = G.items[G.items.length - 1]; it.z = 30; it.flyT = 0;
      const d0 = Math.hypot(it.x - p.x, it.y - p.y);
      return { hp0, maxHp: p.maxHp, d0 };
    });
    const frames = [];
    for (let k = 0; k < 3; k++) {
      await sleep(220);
      frames.push(await A.page.evaluate(() => { const G = KK.G, it = G.items.find(i => i.kind === "firefly"); return it ? { d: +Math.hypot(it.x - G.p.x, it.y - G.p.y).toFixed(2), z: +it.z.toFixed(1) } : null; }));
      await shot(A.page, "v40_heiler_" + (k + 1));
    }
    await sleep(1200);
    const ffEnd = await A.page.evaluate(() => ({ hp: KK.G.p.hp, left: KK.G.items.filter(i => i.kind === "firefly").length }));
    await shot(A.page, "v40_heiler_4_geheilt");
    // Blasen-Nachschub-Bild + Upgrade-Zähler/Truhe
    const tr = await A.page.evaluate(async () => {
      KK.start({ name: "Truhe" }); KK.god(true); KK.goto(3);
      const G = KK.G, L = G.L, ch = L.props.filter(p => p.kind === "chest");
      const m0 = G.upM; G.upM = 60;
      const c = ch[0]; G.items.length = 0; G.portalCd = 0;
      KK.teleport(c.x, c.y); await new Promise(r => setTimeout(r, 200));
      const kinds = G.items.map(i => i.kind);
      const upAfter = G.upM;
      KK.save(); const raw = JSON.parse(localStorage.getItem("koboldkeller2_save"));
      return { m0, chests: ch.length, opened: c.open, kinds, upAfter, saved: raw.upM, v: raw.v, upSicher: G.stats.upSicher };
    });
    await A.page.evaluate(() => { const p = KK.G.p; KK.G.items.length = 0; p.ammo = 0; KK.item("ammo", 1.6, 0.4); KK.item("firefly", -1.8, 0.6); KK.item("heart", 0.4, 1.6); const it = KK.G.items[1]; it.z = 30; KK.freeze(true); });
    await sleep(250); await shot(A.page, "v40_beute_neu"); await A.page.evaluate(() => KK.freeze(false));
    await A.ctx.close(); await B.ctx.close();
    const fl = (r) => ((r.cnt.firefly || 0) / r.n * 100).toFixed(1);
    out.V40 = { wenigA, wenigB, leerA, vollA, vollB, pkA, pkB, ff, frames, ffEnd, tr };
    const ok = wenigA.heil >= 0.22 && wenigB.heil < 0.16 && (wenigA.cnt.firefly || 0) > 0 && !(wenigB.cnt.firefly) && (leerA.cnt.ammo || 0) > 0 &&
      !(vollA.cnt.potion) && !(vollA.cnt.mushroom) && (vollB.cnt.potion || 0) > 0 && pkA.nutzlos === 0 && pkB.nutzlos > 0 &&
      frames.every(f => f && f.z > 15) && frames[2].d < frames[0].d && ffEnd.left === 0 && ffEnd.hp >= ff.hp0 + Math.ceil(ff.maxHp * 0.5) - 0.01 &&
      tr.opened && tr.kinds.some(k => ["sword", "wand", "gem"].includes(k)) && tr.upAfter === 10 && tr.saved === 10 && tr.v === 4;
    R("V40", "E1 Bedarfs-Beute: ❤️ ≤ 25 % → Heil-Beute ≥ 25 %/Kill, Glühwürmchen-Heiler schwebt zum Kobold (+50 % ❤️), 🫧 leer → Nachschub, volle Sachen fallen nicht; Upgrade-Zähler ≥ 60 → Truhe mit Upgrade, Zähler im Spielstand; ?bedarf=0&beutetakt=0 = v13", ok,
      `❤️ 20 %: Heil-Beute ${(wenigA.heil * 100).toFixed(1)} % je Kill (Glühwürmchen ${fl(wenigA)} %) · Regler aus ${(wenigB.heil * 100).toFixed(1)} % (Glühwürmchen ${fl(wenigB)} %) · ` +
      `🫧 leer: Nachschub ${((leerA.cnt.ammo || 0) / leerA.n * 100).toFixed(1)} % · 🧪 5/5 + ✨ voll: Trank/Pilz fallen ${(vollA.cnt.potion || 0) + (vollA.cnt.mushroom || 0)}× (aus: ${(vollB.cnt.potion || 0) + (vollB.cnt.mushroom || 0)}×), „voll → Gold“ beim Aufheben ${pkA.nutzlos} (aus: ${pkB.nutzlos}) · ` +
      `Heiler: Abstand ${ff.d0.toFixed(2)} → ${frames.map(f => f && f.d).join(" → ")}, schwebt z ${frames.map(f => f && f.z).join("/")}, ❤️ ${ff.hp0} → ${Math.round(ffEnd.hp)}/${ff.maxHp} · ` +
      `Truhe bei Zähler 60: ${tr.kinds.filter(k => k !== "coin").join(",")} → Zähler ${tr.upAfter}, Spielstand upM ${tr.saved} (Datei v${tr.v})`);
  }
  // ===================================================================
  // V41 — E2 XP-Kurve + Aufhol-Bonus + Spielstand-Migration (Datei v3 → v4) über „💾 Weiterspielen“
  // ===================================================================
  if (want("V41")) {
    const V13 = { v: 3, name: "Glitzerkeks", species: "drache", look: { species: "drache", skin: "#6fd8c4", outfit: "#ffb35e", eye: "#1f3b5e", hair: "#3aa893", style: "ohne", earsV: 0, acc: "stern" },
      lvl: 15, xp: 1234, xpNext: 2143, maxHp: 20, hp: 33, atk: 11, projN: 5, magic: 4, gold: 1830, potions: 4, ammo: 31, spec: 0.67,
      sk: { kraft: 6, leben: 8, tempo: 4, blasen: 6, magnet: 4 }, skPts: 0, hats: ["pilz", "diadem", "schleife"], hat: "diadem",
      deepest: 16, depth: 14, mega: false, tut: true, runSecs: 1234, won: false, seed: 123456, migrated: false, kills: 512, bossDone: [2, 4, 6, 8, 10, 12, 14, 16], capNote: 0, giftNote: 0 };
    const init = `try { if (!sessionStorage.getItem("kk14")) { sessionStorage.setItem("kk14", "1"); localStorage.setItem("koboldkeller2_save", ${JSON.stringify(JSON.stringify(V13))}); } } catch (e) { }`;
    const run = async (q) => {
      const P = await page0(browser, BASE, errors, q, { init });
      const info = await P.page.evaluate(() => document.getElementById("contInfo").textContent);
      await P.page.evaluate(() => document.getElementById("btnCont").click());
      await P.page.waitForFunction(() => KK.state().screen === "play" && !KK.state().demo, null, { timeout: 8000 });
      await sleep(900);
      const s = await P.page.evaluate(() => { const p = KK.G.p; return { lvl: p.lvl, xp: p.xp, xpNext: p.xpNext, sk: { ...p.sk }, gold: KK.G.gold, depth: KK.G.depth, fill: document.getElementById("xpFill").style.width || getComputedStyle(document.getElementById("xpFill")).width }; });
      if (!q) await shot(P.page, "v41_weiterspielen_lv15");
      // Kill auf Ebene 14 (Soll-Level 15 = Level → Faktor 1) und auf Ebene 19 (Soll 20 → × 1,5)
      const k = await P.page.evaluate(() => {
        const G = KK.G, p = G.p, r = {};
        for (const d of [14, 19]) { KK.goto(d); for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1); const lv0 = p.lvl, xp0 = p.xp; KK.spawn("bat", 2, 0); const e = G.ents[G.ents.length - 1], ex = e.xp; KK.kill("all"); r[d] = { ex, gain: p.lvl === lv0 ? +(p.xp - xp0).toFixed(1) : null }; }
        KK.save(); const raw = JSON.parse(localStorage.getItem("koboldkeller2_save"));
        return { ...r, raw: { v: raw.v, lvl: raw.lvl, xp: raw.xp, xpNext: raw.xpNext } };
      });
      await P.ctx.close();
      return { info, s, k };
    };
    const neu = await run(""), alt = await run("xpkurve=alt&aufhol=0");
    out.V41 = { neu, alt };
    const ok = neu.s.lvl === 15 && neu.s.xpNext === 535 && neu.s.xp < 535 && Math.abs(neu.s.xp / 535 - 1234 / 2143) < 0.01 && JSON.stringify(neu.s.sk) === JSON.stringify(V13.sk) && neu.s.gold === 1830 && neu.s.depth === 14 &&
      neu.k[14].ex === 4 + 14 && neu.k[14].gain === 18 && neu.k[19].gain === Math.round((4 + 19) * 1.5) && neu.k.raw.v === 4 && neu.k.raw.lvl === 15 && neu.k.raw.xpNext === 535 &&
      alt.s.lvl === 15 && alt.s.xpNext === 2143 && alt.s.xp === 1234 && alt.k[14].ex === 4 + 14 + 15 && alt.k[14].gain === 33 && alt.k[19].gain === 4 + 19 + 15;
    R("V41", "E2 XP-Kurve + Aufhol-Bonus: alter Spielstand (Datei v3, Lv 15) lädt über „💾 Weiterspielen“ mit Lv 15, Talente/Gold/Ebene gleich, Fortschritt im Level anteilig, xp < xpNext; Fledermaus-XP ohne Level-Anteil, × 1,5 fünf Ebenen zu tief; ?xpkurve=alt&aufhol=0 = v13", ok,
      `neu: Lv ${neu.s.lvl}, XP ${neu.s.xp}/${neu.s.xpNext} (vorher 1234/2143 = ${(1234 / 2143 * 100).toFixed(1)} %, jetzt ${(neu.s.xp / neu.s.xpNext * 100).toFixed(1)} %), Talente ${JSON.stringify(neu.s.sk)}, 🪙 ${neu.s.gold}, Ebene ${neu.s.depth}; ` +
      `Fledermaus E14: ${neu.k[14].ex} XP → +${neu.k[14].gain}, E19: +${neu.k[19].gain}; gespeichert v${neu.k.raw.v} Lv ${neu.k.raw.lvl} ${neu.k.raw.xp}/${neu.k.raw.xpNext} · ` +
      `alt: ${alt.s.xp}/${alt.s.xpNext}, Fledermaus E14 +${alt.k[14].gain}, E19 +${alt.k[19].gain}`);
  }
  // ===================================================================
  // V42 — E3 Kampf-Takt: Zucken (Abbruch im Warnmoment), Schreck-Flucht („Huch!“), Ziel-Kegel für Blasen
  // ===================================================================
  if (want("V42")) {
    const kampf = async (page) => page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G, r = {};
      KK.start({ name: "Kampf" }); KK.god(true);
      // (a) Zucken: Gegner der Ebene holt aus → ⚔️-Schlag im Warnmoment. Je Tiefe 12 Versuche, Waffenwert wie beim Bot bei Ankunft.
      // Das Ausholen wird für den Test auf 1,5 s gestreckt (sonst entscheidet die Bildrate des Prüf-Browsers, ob der Schlag noch hineinfällt).
      const GM = await import("./src/game.js");
      r.zuck = [];
      for (const [d, atk, typ] of [[3, 4.5, "wichtel"], [9, 10.5, "pilzling"], [15, 16.5, "kaefer"]]) {
        KK.goto(d); for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
        G.p.atkBase = atk; G.p.sk.kraft = 0; GM.recalc(G.p); G.stats.windHit = G.stats.windAbort = G.stats.windKill = 0;
        let tries = 0, abort = 0, imWarn = 0;
        for (let k = 0; k < 12; k++) {
          KK.spawn(typ, 1.0, 0.3); const e = G.ents[G.ents.length - 1]; e.state = "chase"; e.atkCd = 9;
          GM.windup(e, 1.5, "lunge");
          const a0 = G.stats.windAbort; tries++; G.p.atkCd = 0; KK.attack(); await w(400);
          if (G.stats.windAbort > a0) abort++; if (e.hp <= 0) imWarn++;
          if (G.ents.includes(e)) G.ents.splice(G.ents.indexOf(e), 1);
          await w(50);
        }
        r.zuck.push({ d, atk: G.p.atk, typ, tries, abort, kill: imWarn, windHit: G.stats.windHit, windAbort: G.stats.windAbort });
      }
      // (b) Schreck: 4 Wichtel um einen fünften, der fällt → die anderen laufen weg
      KK.goto(5); for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1); KK.god(true);
      const R0 = G.L.rooms.filter(q => !q.arena).sort((a, b) => b.w * b.h - a.w * a.h)[0];          // größter Raum (Wichtel nicht in die Wand setzen)
      KK.teleport(Math.floor(R0.cx) + 0.5 - 2.4, Math.floor(R0.cy) + 0.5 - 0.4);
      const p = G.p, cx = p.x + 2.4, cy = p.y + 0.4;
      KK.spawn("wichtel", 2.4, 0.4); const opfer = G.ents[G.ents.length - 1];
      for (const [dx, dy] of [[1.3, 0], [-1.2, 0.4], [0.3, 1.4], [0.2, -1.3]]) { KK.spawn("wichtel", 2.4 + dx, 0.4 + dy); }
      const andere = G.ents.filter(e => e !== opfer);
      for (const e of G.ents) { e.state = "chase"; e.atkCd = 5; }
      await w(100);
      const d0 = andere.map(e => Math.hypot(e.x - cx, e.y - cy));
      opfer.hp = 0; G.stats.schreck = 0; const before = G.ents.length; (await import("./src/game.js")).killEnt(opfer);
      r.schreck = { n: G.stats.schreck, flee: andere.filter(e => e.state === "flee").length, d0 };
      return r;
    });
    const A = await page0(browser, BASE, errors, "", { seed: false }), B = await page0(browser, BASE, errors, "zucken=0&schreck=0&kegel=0", { seed: false });
    const ka = await kampf(A.page);
    // Schreck-Bildfolge (A): 0,15 s / 0,6 s / 1,1 s nach dem Puff, danach wieder jagen
    const seq = [];
    for (const t of [150, 450, 500]) { await sleep(t); seq.push(await A.page.evaluate((cx) => KK.G.ents.map(e => ({ s: e.state, d: +Math.hypot(e.x - KK.G.p.x - 2.4, e.y - KK.G.p.y - 0.4).toFixed(2) })), 0)); await shot(A.page, "v42_huch_" + seq.length); }
    await sleep(900);
    const nach = await A.page.evaluate(() => KK.G.ents.map(e => e.state));
    const kb = await kampf(B.page);
    // (c) Ziel-Kegel: zwei Gegner — einer vorn (in Joystick-Richtung), einer hinten näher; 24 Würfe mit Richtungs-Streuung
    const kegel = async (page) => page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G;
      KK.goto(3); KK.god(true); for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
      let vorn = 0, n = 0;
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * Math.PI * 2, jit = ((k * 7) % 9 - 4) / 4 * 0.7;     // ± 40° Streuung des Daumens
        const p = G.p; G.ents.length = 0; G.shots.length = 0;
        KK.spawn("slime", Math.cos(a) * 4, Math.sin(a) * 4); const f = G.ents[0];
        KK.spawn("slime", -Math.cos(a) * 2.2, -Math.sin(a) * 2.2);
        for (const e of G.ents) { e.state = "idle"; e.speed = 0; }
        G.joy.x = Math.cos(a + jit); G.joy.y = Math.sin(a + jit); G.joy.m = 1; p.bubCd = 0; p.ammo = 20; p.foe = null;
        if (KK.bubbles()) { n++; if (G.shots[G.shots.length - 1].lock === f) vorn++; }
        G.joy.m = 0; G.joy.x = G.joy.y = 0; p.x -= 0; await w(20);
      }
      G.ents.length = 0; G.shots.length = 0;
      return { vorn, n };
    });
    const ga = await kegel(A.page), gb = await kegel(B.page);
    await A.ctx.close(); await B.ctx.close();
    out.V42 = { ka, kb, seq, nach, ga, gb };
    const zA = ka.zuck.reduce((a, z) => a + z.abort, 0), tA = ka.zuck.reduce((a, z) => a + z.tries - z.kill, 0), zB = kb.zuck.reduce((a, z) => a + z.abort, 0);
    const wegLauf = seq[2].length === 4 && seq[2].every((e, i) => e.d > ka.schreck.d0[i] + 1.2) && seq[0].every(e => e.s === "flee");
    const ok = zA > 0 && zB === 0 && ka.schreck.n === 4 && ka.schreck.flee === 4 && kb.schreck.n === 0 && kb.schreck.flee === 0 && wegLauf && nach.every(s => s !== "flee") &&
      ga.vorn / ga.n >= 0.9 && gb.vorn === 0;
    R("V42", "E3 Kampf-Takt: Schlag im Warnmoment lässt Gegner zucken (💫, Angriff abgebrochen); fällt ein Wichtel, laufen die anderen 1,2 s weg („😳 Huch!“) und jagen danach weiter; Blasen fliegen zum Gegner in Joystick-Richtung (≥ 90 %); ?zucken=0&schreck=0&kegel=0 = v13", ok,
      `Zucken (Abbruch/überlebende Ausholer): ` + ka.zuck.map(z => `E${z.d} ${z.typ} ⚔️${z.atk} ${z.abort}/${z.tries - z.kill}` + (z.kill ? ` (+${z.kill} besiegt)` : "")).join(" · ") + ` = ${tA ? Math.round(zA / tA * 100) : 0} % · aus: ${zB} · ` +
      `Schreck: ${ka.schreck.flee}/4 fliehen, Abstand ${ka.schreck.d0.map(d => d.toFixed(1)).join("/")} → ${seq[2].map(e => e.d).join("/")} Kacheln, danach ${[...new Set(nach)].join(",")} · aus: ${kb.schreck.flee} · ` +
      `Kegel: ${ga.vorn}/${ga.n} Würfe zum Gegner vorn (v13: ${gb.vorn}/${gb.n})`);
  }

  return out;
}

// ---------- einzeln ausführen ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
  const BASE = `http://localhost:${arg("port", 8731)}/`;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: "chromium", args: GPU });
  const errors = [], rows = [];
  const R = (id, what, ok, info) => { rows.push({ id, what, ok, info }); console.log((ok ? "✅ " : "❌ ") + id + " " + what + "\n   " + info); };
  const out = await runV14({ browser, BASE, R, errors, only: arg("only", null), ref: arg("ref", null) ? `http://localhost:${arg("ref")}/` : null });
  await browser.close();
  mkdirSync(DIR, { recursive: true });
  writeFileSync(DIR + "checks_v14" + (arg("only", "") ? "_" + arg("only", "").replace(/,/g, "_") : "") + ".json", JSON.stringify({ date: new Date().toISOString(), rows, errors, out }, null, 2));
  console.log(errors.length ? "Fehler:\n" + errors.join("\n") : "Fehler: 0");
  if (rows.some(r => !r.ok) || errors.length) process.exitCode = 1;
}
