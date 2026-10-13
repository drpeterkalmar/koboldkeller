// Koboldkeller 2 — v14-Checks (Vorlagen, VORLAGEN.md). Jede Etappe ein Check, Bilder → shots/neubau/v14/
// V40 (E1): Bedarfs-Beute — bei ❤️ ≤ 25 % Heil-Beute ≥ 25 % je Kill + Glühwürmchen-Heiler fliegt zum Kobold und heilt +50 %;
//           🫧 leer → Blasen-Nachschub; volle Sachen fallen nicht (0 „voll → Gold“); Upgrade-Zähler ≥ 60 → Truhe mit Upgrade;
//           Zähler steht im Spielstand; ?bedarf=0&beutetakt=0 = v13 (kein Heiler, Herz 10 %, nutzlose Drops fallen)
// Einzeln: node tools/checks_v14.mjs [--port=8731] [--only=V40]
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

export async function runV14({ browser, BASE, R, errors, only = null }) {
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
  const out = await runV14({ browser, BASE, R, errors, only: arg("only", null) });
  await browser.close();
  mkdirSync(DIR, { recursive: true });
  writeFileSync(DIR + "checks_v14" + (arg("only", "") ? "_" + arg("only", "").replace(/,/g, "_") : "") + ".json", JSON.stringify({ date: new Date().toISOString(), rows, errors, out }, null, 2));
  console.log(errors.length ? "Fehler:\n" + errors.join("\n") : "Fehler: 0");
  if (rows.some(r => !r.ok) || errors.length) process.exitCode = 1;
}
