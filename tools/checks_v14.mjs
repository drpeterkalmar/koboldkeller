// Koboldkeller 2 — v14-Checks (Vorlagen, VORLAGEN.md). Jede Etappe ein Check, Bilder → shots/neubau/v14/
// V40 (E1): Bedarfs-Beute — bei ❤️ ≤ 25 % Heil-Beute ≥ 25 % je Kill + Glühwürmchen-Heiler fliegt zum Kobold und heilt +50 %;
//           🫧 leer → Blasen-Nachschub; volle Sachen fallen nicht (0 „voll → Gold“); Upgrade-Zähler ≥ 60 → Truhe mit Upgrade;
//           Zähler steht im Spielstand; ?bedarf=0&beutetakt=0 = v13 (kein Heiler, Herz 10 %, nutzlose Drops fallen)
// V41 (E2): alter Spielstand (Datei v3, Lv 15) → Weiterspielen: Lv 15, Talente gleich, Fortschritt anteilig, XP ohne Level-Anteil × Aufhol-Faktor
// V42 (E3): Zucken im Warnmoment, Schreck-Flucht mit Bildfolge, Ziel-Kegel (Joystick-Würfe)
// V43 (E4): Schleifen + Truhen abseits über 20 Ebenen, Karten-Bild; mit --ref=8732 (v13-Server): ?schleifen=0&truhen=zufall = gleiche Karten
// V44 (E5): Sammelalbum im 🎒 (Stufen 1/10/30, gehört dem Gerät), Bilder hoch + quer
// V45 (E5b): Glanz-Eigenschaften (Boss-Schwert immer, Wirkung je Eigenschaft, Spielstand)
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

  // ===================================================================
  // V43 — E4 Dungeon: Schleifen + Truhen abseits im Spiel; ?schleifen=0&truhen=zufall = Karte wie v13 (Vergleich mit --ref-Server)
  // ===================================================================
  if (want("V43")) {
    const karten = async (page) => page.evaluate(() => {
      KK.start({ name: "Karte", seed: 4711 }); KK.god(true);
      const out = [];
      for (let d = 1; d <= 20; d++) {
        KK.goto(d); const L = KK.G.L, m = L.map;
        let h = 0; for (let i = 0; i < m.block.length; i++) h = (h * 31 + m.block[i] * 7 + (i & 3)) >>> 0;
        out.push({ d, h, schleifen: (L.schleifen || []).map(s => s.spart), truhen: L.props.filter(p => p.kind === "chest").map(c => m.room[Math.floor(c.y) * m.w + Math.floor(c.x)]), weg: L.weg ? L.weg.raeume : null });
      }
      return out;
    });
    const A = await page0(browser, BASE, errors, "", { seed: false }), B = await page0(browser, BASE, errors, "schleifen=0&truhen=zufall", { seed: false });
    const ka = await karten(A.page), kb = await karten(B.page);
    let kref = null;
    if (REF) { const C = await page0(browser, REF, errors, "", { seed: false }); kref = await karten(C.page); await C.ctx.close(); }
    // Karten-Bild einer Ebene: Räume, Weg Eingang → Treppe (gelb), Schleifen (türkis = neu gegrabene Kacheln), Truhen (gold)
    await A.page.evaluate(async () => {
      KK.goto(7); const L = KK.G.L, m = L.map, S = 9, c = document.createElement("canvas");
      c.width = m.w * S; c.height = m.h * S; c.id = "karte"; const g = c.getContext("2d");
      const W = await import("./src/world.js"), C = await import("./src/config.js");
      g.fillStyle = "#1a1424"; g.fillRect(0, 0, c.width, c.height);
      const weg = new Set(L.weg.pfad);
      for (let i = 0; i < m.block.length; i++) {
        if (m.solid[i]) continue;
        const x = i % m.w, y = (i / m.w) | 0;
        g.fillStyle = weg.has(i) ? "#ffd75e" : m.room[i] >= 0 ? "#7a8ac0" : "#4a5a80";
        g.fillRect(x * S, y * S, S - 1, S - 1);
      }
      // neue Abkürzungen (türkis) = offen in dieser Karte, aber Fels im reinen Baum (gleicher Seed, ohne Schleifen)
      const baum = W.buildDungeon(KK.G.prof.seed, 7, C.biomeOf(7), C.diffOf(7).room, null, { ...C.VORLAGE, schleifen: 999, schleifenNot: 0, truhen: "zufall" });
      for (let i = 0; i < m.block.length; i++) if (!m.solid[i] && baum.map.solid[i]) { const x = i % m.w, y = (i / m.w) | 0; g.fillStyle = "#4fe0d0"; g.fillRect(x * S, y * S, S - 1, S - 1); }
      for (const p of L.props.filter(p => p.kind === "chest")) { g.fillStyle = "#ffb000"; g.beginPath(); g.arc(p.x * S, p.y * S, S * 0.9, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); }
      g.fillStyle = "#8fff8a"; g.fillRect(L.entry.x * S - S, L.entry.y * S - S, S * 2, S * 2);
      g.fillStyle = "#ff6fae"; g.fillRect(L.stairs.x * S - S, L.stairs.y * S - S, S * 2, S * 2);
      g.font = "bold 14px system-ui"; g.fillStyle = "#fff"; g.fillText("Ebene 7 · gelb = Weg Eingang→Treppe · türkis = Abkürzung · gold = Truhe", 6, 16);
      Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 99999, width: "412px" }); document.body.appendChild(c);
    });
    await sleep(100); await A.page.locator("#karte").screenshot({ path: DIR + "v43_karte_ebene7.png" });
    await A.ctx.close(); await B.ctx.close();
    out.V43 = { ka, kb, kref };
    const mitS = ka.filter(k => k.schleifen.some(s => s >= 20)).length, trAb = ka.reduce((a, k) => a + k.truhen.filter(r => !k.weg.includes(r)).length, 0), trN = ka.reduce((a, k) => a + k.truhen.length, 0);
    const gleichRef = kref ? kb.every((k, i) => k.h === kref[i].h) : null;
    const ok = mitS >= 18 && trAb / trN >= 0.6 && kb.every(k => !k.schleifen.length) && (gleichRef !== false);
    R("V43", "E4 Dungeon im Spiel (Seed 4711, Ebene 1–20): Schleifen ≥ 20 Kacheln Ersparnis, Truhen abseits; ?schleifen=0&truhen=zufall = Karte wie v13" + (REF ? " (Vergleich mit Server " + REF + ")" : ""), ok,
      `Ebenen mit Schleife ≥ 20: ${mitS}/20 (Ersparnis ${ka.map(k => k.schleifen.join("+") || "–").join(" ")}) · Truhen abseits ${trAb}/${trN} · Regler aus: ${kb.filter(k => k.schleifen.length).length} Schleifen` + (kref ? ` · Karten wie v13: ${kb.filter((k, i) => k.h === kref[i].h).length}/20` : " · (kein --ref-Server)"));
  }
  // ===================================================================
  // V44 — E5 Gegner-Sammelalbum im 🎒: Silhouette → Bild (1) → Oma-Satz (10) → goldener Rahmen + Lebenswert (30), gehört dem Gerät
  // ===================================================================
  if (want("V44")) {
    const run = async (q, w, h, name) => {
      const P = await page0(browser, BASE, errors, q, { w, h });
      const r = await P.page.evaluate(async () => {
        const G = KK.G; KK.start({ name: "Album" }); KK.god(true); KK.goto(5);
        for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
        // Hinweise am Haken zählen (die Toast-Leiste zeigt nur die letzten drei); der letzte Text bleibt sichtbar
        const toasts = [], orig = G.hooks.album; G.hooks.album = (t, st) => { toasts.push(t + ":" + st); orig(t, st); };
        const kill = (t, n) => { for (let i = 0; i < n; i++) { KK.spawn(t, 2, 0); KK.kill("all"); G.items.length = 0; } };
        kill("wichtel", 1); kill("geist", 10); kill("flamme", 30);
        await new Promise(r => setTimeout(r, 300));
        const album = G.album ? { ...G.album.k } : null, saved = localStorage.getItem("koboldkeller2_album");
        // neues Spiel: Album bleibt (gehört dem Gerät)
        KK.start({ name: "Neu" }); const nach = G.album ? { ...G.album.k } : null;
        KK.goto(5); for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
        return { album, saved: saved && JSON.parse(saved), nach, toasts: toasts.join(" | "), letzter: document.getElementById("toasts").textContent };
      });
      await P.page.evaluate(() => { KK.G.screen = "play"; document.getElementById("btnBag").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
      await sleep(400);
      const sec = await P.page.evaluate(() => { const a = document.querySelector(".album"); if (a) a.scrollIntoView({ block: "center" }); return a ? [...a.querySelectorAll(".alb")].map(b => b.className.replace("alb ", "") + ":" + b.querySelector(".an").textContent.replace(/\u00ad/g, "")) : null; });
      let info = [];
      if (sec) {
        for (const id of ["flamme", "geist", "wichtel", "bat"]) { await P.page.click('.alb[data-a="' + id + '"]'); await sleep(120); info.push(await P.page.evaluate(() => document.getElementById("albInfo").textContent)); }
        await P.page.click('.alb[data-a="flamme"]'); await sleep(150);
        await shot(P.page, "v44_album_" + name);
      }
      await P.ctx.close();
      return { ...r, sec, info };
    };
    const hoch = await run("", 412, 915, "hoch"), quer = await run("", 915, 412, "quer"), aus = await run("album=0", 412, 915, "aus");
    out.V44 = { hoch, quer, aus };
    const k = hoch.album;
    const ok = k && k.wichtel === 1 && k.geist === 10 && k.flamme === 30 && k.bat === 0 && hoch.saved && hoch.saved.k.flamme === 30 && hoch.nach.flamme === 30 &&
      hoch.sec && hoch.sec.length === 8 && hoch.sec.some(x => x.startsWith("s3") && x.includes("Flämmchen")) && hoch.sec.some(x => x.startsWith("s0") && x.includes("???")) &&
      /Lebenswert/.test(hoch.info[0]) && /Oma|„/.test(hoch.info[1]) && /Noch 9/.test(hoch.info[2]) && /noch nicht besiegt/.test(hoch.info[3]) &&
      hoch.toasts === "wichtel:1 | geist:1 | geist:2 | flamme:1 | flamme:2 | flamme:3" && /Goldener Rahmen im Album: Flämmchen/.test(hoch.letzter) &&
      quer.sec && quer.sec.length === 8 && !aus.sec && !aus.album && !aus.saved;
    R("V44", "E5 Sammelalbum im 🎒: 1 Sieg → Bild, 10 → Oma-Satz, 30 → goldener Rahmen + Lebenswert, Hinweise beim Erreichen, gehört dem Gerät (neues Spiel behält es), hoch + quer; ?album=0 = kein Album", ok,
      `Zähler ${JSON.stringify(k)} · Seiten ${hoch.sec ? hoch.sec.join(", ") : "–"} · Infos: ${hoch.info.map(t => t.slice(0, 60)).join(" / ")} · nach neuem Spiel Flämmchen ${hoch.nach && hoch.nach.flamme} · quer ${quer.sec ? quer.sec.length : 0} Seiten · aus: Album ${aus.sec ? "da" : "weg"}, Speicher ${aus.saved ? "da" : "leer"}`);
  }
  // ===================================================================
  // V45 — E5b Glanz-Eigenschaften: Boss-Schwert mit neuer Waffenstufe glänzt immer, je Eigenschaft die Wirkung, Spielstand, ?glanz=0
  // ===================================================================
  if (want("V45")) {
    const glanz = async (page) => page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G, GM = await import("./src/game.js"), C = await import("./src/config.js"), r = {};
      const toasts = []; const box = document.getElementById("toasts"); new MutationObserver(() => toasts.push(box.textContent)).observe(box, { childList: true, subtree: true });
      KK.start({ name: "Glanz" }); KK.god(true); KK.goto(3); for (const e of G.ents.slice()) G.ents.splice(G.ents.indexOf(e), 1);
      const p = G.p; p.atkBase = 5; GM.recalc(p);
      // Boss-Schwert über die Stufengrenze 6 (Holzschwert)
      KK.item("sword", 0.3, 0); G.items[G.items.length - 1].boss = true; await w(500);
      r.boss = { glanz: p.glanz, atk: p.atk, toast: toasts.join(" ").includes("glänzt") };
      // normales Schwert ohne neue Stufe: Glanz bleibt
      const g0 = p.glanz; KK.item("sword", 0.3, 0); await w(500); r.bleibt = p.glanz === g0;
      // Wirkung je Eigenschaft
      const eff = {};
      for (const id of ["", "flink", "magnet", "blase", "funken"]) {
        p.glanz = id; GM.recalc(p);
        G.shots.length = 0; p.bubCd = 0; p.ammo = 10; KK.spawn("slime", 2.5, 0); G.ents[G.ents.length - 1].hp = G.ents[G.ents.length - 1].maxHp = 1e6; KK.bubbles();
        eff[id || "ohne"] = { spd: +p.spdMul.toFixed(3), mag: +KK.magnet("coin").toFixed(2), blasen: G.shots.filter(s => s.kind === "bubble").length };
        G.ents.length = 0; G.shots.length = 0;
      }
      p.glanz = "funken"; GM.recalc(p); C.VORLAGE.funken = 1; G.stats.funken = 0;
      KK.spawn("slime", 1.2, 0); G.ents[0].hp = G.ents[0].maxHp = 1e6; G.ents[0].state = "idle"; p.atkCd = 0; KK.attack(); await w(300);
      r.funken = G.stats.funken; C.VORLAGE.funken = 0.1; G.ents.length = 0;
      KK.save(); r.saved = JSON.parse(localStorage.getItem("koboldkeller2_save")).glanz;
      r.eff = eff; return r;
    });
    const A = await page0(browser, BASE, errors, ""), B = await page0(browser, BASE, errors, "glanz=0");
    const ga = await glanz(A.page);
    await A.page.evaluate(() => { KK.G.p.glanz = "funken"; document.getElementById("btnBag").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
    await sleep(400); await shot(A.page, "v45_glanz_rucksack");
    const gb = await glanz(B.page);
    await A.ctx.close(); await B.ctx.close();
    out.V45 = { ga, gb };
    const e = ga.eff;
    const ok = !!ga.boss.glanz && ga.boss.toast && ga.bleibt && !gb.boss.glanz &&
      Math.abs(e.flink.spd / e.ohne.spd - 1.1) < 0.001 && Math.abs(e.magnet.mag - e.ohne.mag - 1) < 0.001 && e.blase.blasen === e.ohne.blasen + 1 && ga.funken >= 1 && ga.saved === "funken";
    R("V45", "E5b Glanz: Boss-Schwert mit neuer Waffenstufe glänzt immer (Hinweis), ohne neue Stufe bleibt der Glanz; 👟 +10 % Tempo, 🧲 +1 Kachel, 🫧 +1 Blase, ✨ Funken; im Spielstand; ?glanz=0 = nie", ok,
      `Boss-Schwert: ${ga.boss.glanz || "–"} (Hinweis ${ga.boss.toast}), bleibt ${ga.bleibt} · Tempo ×${(e.flink.spd / e.ohne.spd).toFixed(2)}, Magnet ${e.ohne.mag} → ${e.magnet.mag}, Blasen ${e.ohne.blasen} → ${e.blase.blasen}, Funken ${ga.funken}× · Spielstand „${ga.saved}“ · aus: ${gb.boss.glanz || "kein Glanz"}`);
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
