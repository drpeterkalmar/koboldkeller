// Koboldkeller 2 — v7-Checks (Würfel-Look + Namen, Haptik dezent, Weg-Pfeil, Save v6 → v7). Screenshots → shots/neubau/v7/
// Wird von tools/check.mjs aufgerufen; einzeln: node tools/checks_v7.mjs [--port=8731] [--only=V18,V20] [--secs=60]
// Optional: KK_BLOCK_NAMES="a,b" (Umgebungsvariable, nicht im Repo) — diese Namen dürfen nirgends in den Zufallsnamen vorkommen.
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const GPU_FLAGS = [(process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default"), "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"];
const V7 = "shots/neubau/v7/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const deg = r => Math.round(r * 180 / Math.PI * 10) / 10;

// v6-Namensliste (die 30 bestehenden bleiben; „Wichtel-Willy" war 13 Zeichen → wurde im Feld abgeschnitten → „Wichtelwilly")
const V6_NAMES = ["Knuffel", "Wichtelwilly", "Glitzer-Emma", "Pupsi", "Krümel", "Flauschi", "Kobbi", "Zuckerkäfer", "Mopsi", "Wackel", "Brummi",
  "Schmusebacke", "Pünktchen", "Knorpf", "Tapsi", "Blubber", "Sternchen", "Muffin", "Kicher-Kiki", "Plüschi", "Funkel", "Wuschel", "Hüpfi",
  "Zimtschnecke", "Glöckchen", "Keksi", "Schnuffel", "Mausi-Maus", "Purzel", "Bommel"];
// grobe Sperrliste (Teilwörter) gegen Beleidigendes/Zweideutiges
const BAD = ["arsch", "kack", "doof", "dumm", "blöd", "idiot", "hure", "nutte", "titt", "möse", "muschi", "pimmel", "penis", "sex", "geil", "nazi",
  "hitler", "scheiß", "scheiss", "fick", "pisse", "busen", "möps", "zipfel", "eichel", "pflaume", "schwanz", "bums", "popo", "pipi", "kotz", "stink",
  "fett", "hässlich", "blut", "tot", "mörder", "pistole", "gewehr", "teufel", "hölle", "sau", "schwein", "trottel", "depp", "lutsch", "nackt"];

export async function runV7({ browser, BASE, R, errors, only = null, secs = 60 }) {
  mkdirSync(V7, { recursive: true });
  const want = id => !only || only.includes(id);
  async function np(path = "index.html", w = 412, h = 915, init) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    const tag = "v7 " + (w > h ? "quer" : "hoch");
    page.on("pageerror", e => errors.push(tag + " pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(tag + " console: " + m.text()); });
    await page.goto(BASE + path);
    await page.waitForFunction(() => window.KK && window.KK.G && window.KK.G.L, null, { timeout: 30000 });
    await sleep(300);
    return { ctx, page };
  }
  const tapEl = async (page, sel) => { const b = await page.locator(sel).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const G = page => page.evaluate(() => KK.guide());
  /** wartet, bis der Pfeil voll sichtbar ist (oder Timeout) */
  const waitArrow = async (page, ms = 7000) => { try { await page.waitForFunction(() => KK.guide().a > 0.9, null, { timeout: ms, polling: 50 }); return true; } catch (e) { return false; } };
  const poke = page => page.evaluate(async () => (await import("./src/guide.js?v=" + window.KK_VER)).guideInput());

  // ===================================================================
  // V18 — Würfel würfelt Name + Look, Harmonie, keine Wiederholung, ?seed= reproduzierbar, Namensliste
  // ===================================================================
  if (want("V18")) {
    const { ctx, page } = await np("index.html?seed=7");
    await tapEl(page, "#btnNew"); await sleep(400);
    const e0 = await page.evaluate(() => KK.editor());
    const lookBtnHiddenCreate = await page.locator("#btnLookDice").isHidden();
    const seq = [];
    for (let i = 0; i < 20; i++) {
      await tapEl(page, "#btnDice");
      if (i === 0) { await sleep(230); await page.screenshot({ path: V7 + "wuerfel_animation_hoch.png" }); await sleep(470); }
      else await sleep(i < 6 ? 700 : 160);
      seq.push(await page.evaluate(() => KK.editor()));
      if (i < 6) await page.screenshot({ path: V7 + `wuerfel_${i + 1}_hoch.png` });
    }
    const chk = await page.evaluate(async (seq) => {
      const C = await import("./src/config.js?v=" + window.KK_VER);
      return seq.map(e => { const L = C.makeLook(e.look); return { key: C.lookKey(L), bad: C.lookHarmony(L), name: e.name }; });
    }, [e0, ...seq]);
    const keys = chk.map(c => c.key), names = chk.slice(1).map(c => c.name);
    const distinct = new Set(keys.slice(1)).size;
    let repeats = 0; for (let i = 1; i < keys.length; i++) if (keys[i] === keys[i - 1]) repeats++;
    const bad = chk.slice(1).filter(c => c.bad.length);
    const nameOk = names.every(n => n && n.length <= 12), nameChanged = names.filter((n, i) => n !== (i ? names[i - 1] : e0.name)).length;
    const diceCount = seq[seq.length - 1].dice;
    // Namensfeld bleibt editierbar
    await page.fill("#nameInput", "Mein Kobold");
    const typed = await page.inputValue("#nameInput");
    const ro = await page.evaluate(() => { const i = document.getElementById("nameInput"); return i.readOnly || i.disabled; });
    await ctx.close();
    // Reproduzierbar: gleicher Seed → gleiche Folge
    const { ctx: c2, page: p2 } = await np("index.html?seed=7");
    await tapEl(p2, "#btnNew"); await sleep(300);
    const seq2 = [];
    for (let i = 0; i < 5; i++) { await tapEl(p2, "#btnDice"); await sleep(120); seq2.push(await p2.evaluate(() => KK.editor())); }
    const same = seq2.every((e, i) => JSON.stringify(e.look) === JSON.stringify(seq[i].look) && e.name === seq[i].name);
    // Großer Wurf-Test im Modul (300×) + Namenslisten
    const stat = await p2.evaluate(async (args) => {
      const [V6, BAD, BLOCK] = args;
      const C = await import("./src/config.js?v=" + window.KK_VER), U = await import("./src/util.js?v=" + window.KK_VER);
      const r = U.mulberry32(99); let prev = "", acc = 0, bad = 0, rep = 0; const ks = new Set(), sp = {};
      for (let i = 0; i < 300; i++) { const L = C.makeLook(C.rollLook(r, prev)), k = C.lookKey(L); if (k === prev) rep++; prev = k; ks.add(k); if (L.acc !== "none") acc++; if (C.lookHarmony(L).length) bad++; sp[L.species] = (sp[L.species] || 0) + 1; }
      const all = [...C.NAMES, ...C.NAME_KIT];
      const lower = all.map(n => n.toLowerCase());
      const badHits = all.filter((n, i) => BAD.some(b => lower[i].includes(b)));
      const blockHits = all.filter((n, i) => BLOCK.some(b => b && lower[i].includes(b.toLowerCase())));
      return { n: 300, acc: acc / 300, bad, rep, distinct: ks.size, species: Object.keys(sp).length, names: C.NAMES.length, uniq: new Set(C.NAMES).size,
        maxLen: Math.max(...all.map(n => n.length)), kit: C.NAME_KIT.length, kitUniq: new Set(all).size === all.length, v6kept: V6.every(n => C.NAMES.includes(n)),
        badHits, blockHits, blocked: BLOCK.length };
    }, [V6_NAMES, BAD, (process.env.KK_BLOCK_NAMES || "").split(",").map(s => s.trim()).filter(Boolean)]);
    await c2.close();
    R("V18", "🎲 Würfel würfelt Name + kompletten Look: 20× → ≥ 15 verschiedene Looks, keine direkte Wiederholung, alle Harmonie-Regeln, Name ≤ 12 Zeichen, Namensfeld editierbar, ?seed= reproduzierbar",
      distinct >= 15 && repeats === 0 && !bad.length && nameOk && nameChanged >= 15 && diceCount === 20 && typed === "Mein Kobold" && !ro && same && lookBtnHiddenCreate,
      `${distinct}/20 Looks verschieden, ${repeats} Wiederholungen, ${bad.length} Harmonie-Verstöße, Namen ${nameChanged}/20 neu (max. ${Math.max(...names.map(n => n.length))} Zeichen, z. B. ${names.slice(0, 4).join(", ")}), editierbar ${typed === "Mein Kobold" && !ro}, Seed reproduzierbar ${same}`);
    R("V18b", "Harmonie im Großtest (300 Würfe): 0 Verstöße, 0 Wiederholungen, Extra ≤ 60 %, alle 8 Tierarten; Namen ≥ 150 ohne Duplikate, alle ≤ 12 Zeichen, die 30 bisherigen bleiben, Sperrliste 0 Treffer",
      stat.bad === 0 && stat.rep === 0 && stat.acc <= 0.6 && stat.species === 8 && stat.names >= 150 && stat.uniq === stat.names && stat.maxLen <= 12 && stat.kitUniq && stat.v6kept && !stat.badHits.length && !stat.blockHits.length,
      `${stat.distinct}/300 verschieden, Extra ${Math.round(stat.acc * 100)} %, Tierarten ${stat.species}; Liste ${stat.names} (eindeutig ${stat.uniq}) + Baukasten ${stat.kit} = ${stat.names + stat.kit} Namen, max. ${stat.maxLen} Zeichen, v6-Namen erhalten ${stat.v6kept}, Sperrliste ${stat.badHits.length ? stat.badHits.join("/") : 0}, Familien-Sperrliste ${stat.blocked ? stat.blockHits.length + " Treffer (" + stat.blocked + " Namen geprüft)" : "nicht gesetzt"}`);
    // Querformat: Würfel-Folge
    const { ctx: c3, page: p3 } = await np("index.html?seed=11", 915, 412);
    await tapEl(p3, "#btnNew"); await sleep(400);
    for (let i = 0; i < 6; i++) { await tapEl(p3, "#btnDice"); await sleep(700); await p3.screenshot({ path: V7 + `wuerfel_${i + 1}_quer.png` }); }
    await c3.close();
    // Spiegel: 🎲 Zufallslook (nur Aussehen, Name bleibt)
    const { ctx: c4, page: p4 } = await np("index.html?seed=5");
    await p4.evaluate(() => { KK.start({ name: "Spiegeli" }); });
    await sleep(600);
    await p4.evaluate(() => KK.G.hooks.editor());
    await sleep(500);
    const vis = await p4.locator("#btnLookDice").isVisible();
    const m0 = await p4.evaluate(() => KK.editor());
    const ms = [];
    for (let i = 0; i < 3; i++) { await tapEl(p4, "#btnLookDice"); await sleep(700); ms.push(await p4.evaluate(() => KK.editor())); }
    await p4.screenshot({ path: V7 + "spiegel_zufallslook_hoch.png" });
    await tapEl(p4, "#btnEditOk"); await sleep(500);
    const after = await p4.evaluate(() => KK.state());
    const mk = [m0, ...ms].map(e => JSON.stringify(e.look));
    const pick8 = L => JSON.stringify(["species", "skin", "outfit", "eye", "hair", "style", "earsV", "acc"].map(k => L[k]));
    const taken = pick8(after.look) === pick8(ms[2].look);
    const mChanged = mk.slice(1).every((k, i) => k !== mk[i]);
    const mOk = vis && m0.mode === "edit" && ms.every(e => e.name === "Spiegeli") && mChanged && after.name === "Spiegeli" && taken;
    await c4.close();
    R("V18c", "Spiegel/Friseur: „🎲 Zufallslook“ ändert nur das Aussehen (Name bleibt), wird übernommen; beim Erstellen würfelt 🎲 Name + Look",
      mOk, `Knopf sichtbar ${vis} (beim Erstellen versteckt ${lookBtnHiddenCreate}), 3× neu ${mChanged}, Name bleibt „${after.name}“, übernommen ${taken}`);
  }

  // ===================================================================
  // V19 — Haptik: Stub zählt Aufrufe je Ereignis-Art in 60 s Kampf (v6 „alt" vs. v7), Pulse ≥ 25 ms, Abstand ≥ 400 ms, Budget, „aus"
  // ===================================================================
  if (want("V19")) {
    const STUB = `(() => { window.__vib = []; const f = function (p) { window.__vib.push([performance.now(), p]); return true; };
      try { Object.defineProperty(Navigator.prototype, "vibrate", { value: f, configurable: true, writable: true }); } catch (e) { navigator.vibrate = f; } })();`;
    // gleicher Ablauf für beide Tabellen: Kampf auf Ebene 3, Münzen/Pickups/Level-Up, nach 35 % Treppe → Ebene 4, Boss erwacht, Boss-Sieg
    const fight = (page, S) => page.evaluate(async (S) => {
      KK.start({ name: "Brumm" }); KK.goto(3); KK.G.portalCd = 0; KK.G.p.potions = 5; KK.G.homeHideT = 999;
      const G = KK.G, types = ["bat", "slime", "wichtel", "pilzling"];
      const t0 = performance.now(); let i = 0, ev = { stairs: 0, boss: 0, bossKill: 0, lvl: 0 };
      await new Promise(done => {
        const iv = setInterval(() => {
          const el = (performance.now() - t0) / 1000, p = G.p; i++;
          if (el > S) { clearInterval(iv); done(); return; }
          if (G.screen === "dead") { document.getElementById("btnRevive").click(); return; }
          if (G.screen !== "play") return;
          if (!ev.stairs && el > S * 0.35) { ev.stairs = 1; G.portalCd = 0; KK.teleport("stairs"); return; }
          if (G.depth === 4 && !ev.boss && el > S * 0.7) { ev.boss = 1; KK.teleport("boss"); G.p.x += 1.6; return; }
          if (G.depth === 4 && ev.boss && !ev.bossKill && el > S * 0.9) { ev.bossKill = 1; KK.kill("boss"); return; }
          if (G.ents.filter(e => e.type !== "dummy" && !e.isBoss).length < 6) for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28; KK.spawn(types[(i + k) % 4], Math.cos(a) * 2.4, Math.sin(a) * 2.4); }
          KK.attack(); if (i % 3 === 0) KK.bubbles(); if (i % 11 === 0) KK.dodge();
          if (i % 5 === 0) KK.item("coin", 0.25, 0.1); if (i % 23 === 0) KK.item("potion", 0.25, 0); if (i % 29 === 0) KK.item("gem", 0.25, 0);
          if (i % 60 === 0) { p.xp = p.xpNext - 0.5; KK.give("xp", 1); ev.lvl++; }
          if (p.hp < p.maxHp * 0.5) p.hp = p.maxHp;
          p.ammo = Math.max(p.ammo, 5);
        }, 250);
      });
      return { ev, depth: G.depth };
    }, S);
    const analyse = async (page) => page.evaluate(() => {
      const v = window.__vib, on = [], starts = v.map(x => x[0]);
      for (const [, p] of v) (Array.isArray(p) ? p : [p]).forEach((ms, i) => { if (!(i % 2)) on.push(ms); });
      let minGap = 1e9; for (let i = 1; i < starts.length; i++) minGap = Math.min(minGap, starts[i] - starts[i - 1]);
      let maxWin = 0; for (let i = 0; i < v.length; i++) { let s = 0; for (let j = i; j < v.length && v[j][0] - v[i][0] < 1000; j++) (Array.isArray(v[j][1]) ? v[j][1] : [v[j][1]]).forEach((ms, k) => { if (!(k % 2)) s += ms; }); maxWin = Math.max(maxWin, s); }
      return { n: v.length, minPulse: on.length ? Math.min(...on) : 0, short: on.filter(x => x < 25).length, minGap: Math.round(minGap), maxWin, hap: KK.hap() };
    });
    const runs = {};
    for (const mode of ["alt", "v7"]) {
      const { ctx, page } = await np("index.html" + (mode === "alt" ? "?hap=alt" : ""), 412, 915, STUB);
      await page.touchscreen.tap(200, 200); await sleep(200);           // Nutzer-Aktivierung (Chrome verlangt sie für vibrate)
      const f = await fight(page, secs);
      runs[mode] = { ...(await analyse(page)), f };
      if (mode === "v7") {
        // „Vibration aus" (Einstellungen im Pause-Menü) → keine Aufrufe mehr
        await page.evaluate(() => { KK.heal(); KK.G.p.hp = 2; });
        await page.evaluate(() => KK.pause()); await sleep(300);
        await page.locator('#setBox .set[data-k="vibrate"]').click(); await sleep(150);
        const offSetting = await page.evaluate(() => KK.hap().vibrate);
        await page.evaluate(() => KK.resume());
        const n0 = await page.evaluate(() => window.__vib.length);
        await page.evaluate(async () => { const t0 = performance.now(); await new Promise(d => { const iv = setInterval(() => { if (performance.now() - t0 > 6000) { clearInterval(iv); d(); } if (KK.G.screen !== "play") return; KK.attack(); KK.spawn("bat", 1.2, 0); KK.item("coin", 0.2, 0); const p = KK.G.p; p.xp = p.xpNext - 0.5; KK.give("xp", 1); if (p.hp < 3) p.hp = p.maxHp; }, 300); }); });
        const n1 = await page.evaluate(() => window.__vib.length);
        runs.off = { setting: offSetting, before: n0, after: n1 };
        // „📳 Vibration testen" schaltet ein und vibriert sofort + Hinweis
        await page.evaluate(() => KK.pause()); await sleep(250);
        await page.locator("#setBox #btnHapTest").click(); await sleep(150);
        runs.probe = await page.evaluate(() => ({ n: window.__vib.length, last: window.__vib[window.__vib.length - 1], on: KK.hap().vibrate, hint: !document.querySelector("#setBox .hapHint").classList.contains("hidden"), txt: document.querySelector("#setBox .hapHint").textContent }));
        await page.screenshot({ path: V7 + "einstellungen_vibration_hoch.png" });
      }
      await ctx.close();
    }
    const fmt = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ");
    const A = runs.alt, B = runs.v7, allowed = ["hurt", "chest", "stairs", "levelup", "boss", "bossKill", "die", "win", "probe"];
    const onlyBig = Object.keys(B.hap.fired).every(k => allowed.includes(k));
    console.log("   Haptik v6 (?hap=alt) Aufrufe: " + fmt(A.hap.calls) + "\n     → vibriert: " + fmt(A.hap.fired) + " = " + A.n + " Vibrationen, kürzester Impuls " + A.minPulse + " ms, " + A.short + " Impulse < 25 ms, kleinster Abstand " + A.minGap + " ms");
    console.log("   Haptik v7 Aufrufe: " + fmt(B.hap.calls) + "\n     → vibriert: " + fmt(B.hap.fired) + " = " + B.n + " Vibrationen, kürzester Impuls " + B.minPulse + " ms, kleinster Abstand " + B.minGap + " ms, max. " + B.maxWin + " ms/s");
    R("V19", `Haptik dezent (Stub, je ${secs} s Kampf): v7 nur große Ereignisse, keine Pulse < 25 ms, Abstand ≥ 400 ms, Budget ≤ 350 ms/s; „Vibration aus“ → 0 Aufrufe; „📳 Vibration testen“ vibriert + Hinweis`,
      onlyBig && B.n > 0 && B.minPulse >= 25 && B.short === 0 && B.minGap >= 400 && B.maxWin <= 350 && runs.off.setting === false && runs.off.after === runs.off.before && runs.probe.on && runs.probe.hint && runs.probe.n === runs.off.after + 1 && B.f.ev.bossKill && B.hap.fired.stairs && B.hap.fired.boss,
      `vorher (v6) ${A.n} Vibrationen (${A.short} < 25 ms, kürzester ${A.minPulse} ms, Abstand ≥ ${A.minGap} ms) · nachher (v7) ${B.n} Vibrationen [${fmt(B.hap.fired)}], kürzester ${B.minPulse} ms, Abstand ≥ ${B.minGap} ms, max. ${B.maxWin} ms/s · aus: ${runs.off.after - runs.off.before} Aufrufe · Test-Knopf: ${JSON.stringify(runs.probe.last && runs.probe.last[1])}, Hinweis ${runs.probe.hint}`);
    runs.alt.calls = A.hap.calls; runs.v7.calls = B.hap.calls;
    // iPhone-Muster (?haptouch=1 erzwingt es im Test): Switch nur in Knöpfen, nie über dem Canvas; Knöpfe/Joystick/Tap-to-move gehen weiter
    {
      const { ctx, page } = await np("index.html?haptouch=1");
      await page.evaluate(() => { KK.start({}); }); await sleep(3200);
      const dom = await page.evaluate(() => {
        const sws = [...document.querySelectorAll(".kkHapSw")];
        const inside = sws.every(s => { const a = s.getBoundingClientRect(), b = s.parentElement.getBoundingClientRect(); if (!b.width) return true;   // versteckte Menüs
          return a.left >= b.left - 0.5 && a.top >= b.top - 0.5 && a.right <= b.right + 0.5 && a.bottom <= b.bottom + 0.5 && a.width * a.height >= 0.75 * b.width * b.height; });
        const W = innerWidth, H = innerHeight; let canvasHits = 0, swOnCanvas = 0, n = 0;
        for (let y = H * 0.25; y < H * 0.75; y += 40) for (let x = 20; x < W - 20; x += 40) { const el = document.elementFromPoint(x, y); n++; if (el && el.id === "cv") canvasHits++; if (el && el.classList.contains("kkHapSw") && !el.closest(".skill,.round,.btn")) swOnCanvas++; }
        return { n: sws.length, inside, parents: [...new Set(sws.map(s => s.parentElement.id || s.parentElement.className.split(" ")[0]))].slice(0, 12), canvasHits, samples: n, swOnCanvas,
          spec: !!document.querySelector("#bSpec > .kkHapSw"), pot: !!document.querySelector("#bPot > .kkHapSw"), atk: !!document.querySelector("#bAtk > .kkHapSw") };
      });
      // Trank-Knopf antippen: Trank wirkt UND Switch schaltet (echter Tipp → Tick)
      await page.evaluate(() => { KK.G.p.hp = 1; });
      const pot0 = await page.evaluate(() => ({ p: KK.G.p.potions, t: KK.hap().touchTicks }));
      await tapEl(page, "#bPot"); await sleep(300);
      const pot1 = await page.evaluate(() => ({ p: KK.G.p.potions, t: KK.hap().touchTicks }));
      // Tap-to-move
      const s0 = await page.evaluate(() => KK.state());
      await page.touchscreen.tap(300, 330); await sleep(1100);
      const s1 = await page.evaluate(() => KK.state());
      // Joystick
      const cdp = await ctx.newCDPSession(page);
      const tp = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 9 }] });
      await tp("touchStart", 90, 800); await sleep(60);
      for (let i = 1; i <= 6; i++) { await tp("touchMove", 90 + i * 8, 800 - i * 6); await sleep(30); }
      await sleep(600); await tp("touchEnd"); await sleep(200);
      const s2 = await page.evaluate(() => KK.state());
      // Vibration aus → Switches weg, Knopf funktioniert weiter
      await page.evaluate(() => { document.body.classList.add("noHap"); KK.G.p.hp = 1; });
      const pp = await page.evaluate(() => KK.G.p.potions);
      await tapEl(page, "#bPot"); await sleep(300);
      const pp2 = await page.evaluate(() => ({ p: KK.G.p.potions, t: KK.hap().touchTicks, disp: getComputedStyle(document.querySelector("#bPot > .kkHapSw")).display }));
      await ctx.close();
      const moved = Math.hypot(s1.x - s0.x, s1.y - s0.y), joy = Math.hypot(s2.x - s1.x, s2.y - s1.y);
      R("V19b", "iPhone ab iOS 26.5: Haptik-Switch nur in DOM-Knöpfen (✨, 🧪, ⏸️, 🎒, Menü) — nie über dem Canvas; echter Tipp auf 🧪 wirkt + tickt; Tap-to-move + Joystick ungestört; „aus“ blendet die Switches aus",
        dom.n >= 10 && dom.inside && dom.spec && dom.pot && !dom.atk && dom.swOnCanvas === 0 && dom.canvasHits > dom.samples * 0.5 && pot1.p === pot0.p - 1 && pot1.t === pot0.t + 1 && moved > 0.8 && joy > 0.5 && pp2.p === pp - 1 && pp2.t === pot1.t && pp2.disp === "none",
        `${dom.n} Switches (${dom.parents.join(", ")}), deckungsgleich ${dom.inside}, Canvas-Stichproben ${dom.canvasHits}/${dom.samples} frei, ⚔️ ohne Switch ${!dom.atk}; 🧪: Trank ${pot0.p}→${pot1.p}, Ticks ${pot0.t}→${pot1.t}; Tap-to-move ${moved.toFixed(2)} Kacheln, Joystick ${joy.toFixed(2)}; aus: Trank ${pp}→${pp2.p}, Ticks ${pp2.t}, Switch ${pp2.disp}`);
    }
  }

  // ===================================================================
  // V20 — Weg-Pfeil: nach 2 s Stillstand, Richtung = Pfad-Wegpunkt (< 20°), weg bei Bewegung, nicht im Bosskampf/Titelkarte
  // ===================================================================
  if (want("V20")) {
    const { ctx, page } = await np("index.html");
    await page.evaluate(() => { KK.start({ name: "Pfeili" }); });
    await sleep(3000);                                               // Titelkarte „Koboldstadt" vorbei
    // Zeitpunkt: ab letzter Eingabe
    const timing = await page.evaluate(async () => {
      const m = await import("./src/guide.js?v=" + window.KK_VER);
      m.guideInput(); const t0 = performance.now(); let tFirst = null, idleFirst = null, a19 = 0;
      await new Promise(done => { const f = () => { const g = KK.guide(), el = performance.now() - t0; if (el < 1850) a19 = Math.max(a19, g.a); if (g.t >= 0 && tFirst === null) { tFirst = el; idleFirst = g.idle; } if (el > 3200) return done(); requestAnimationFrame(f); }; f(); });
      return { tFirst: Math.round(tFirst), idleFirst, a19, g: KK.guide() };
    });
    const angErr = async () => page.evaluate(async () => {
      const W = await import("./src/world.js?v=" + window.KK_VER), g = KK.guide(), p = KK.G.p, tg = g.target;
      const path = W.findPath(KK.G.L.map, p.x, p.y, tg.x, tg.y, p.r);          // frischer Pfad (unabhängig vom Pfeil berechnet)
      // Wegpunkt ~3,5 Kacheln voraus entlang des Pfades; liegt er hinter einer Ecke: der letzte davon sichtbare Pfadpunkt
      const pts = [{ x: p.x, y: p.y }, ...path], cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      const at = s => { for (let i = 1; i < pts.length; i++) if (cum[i] >= s) { const k = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k }; } return pts[pts.length - 1]; };
      let s = Math.min(3.5, cum[cum.length - 1]), wp = at(s);
      while (s > cum[1] && !W.lineFree(KK.G.L.map, p.x, p.y, wp.x, wp.y, 0)) { s -= 0.1; wp = at(Math.max(cum[1], s)); }
      const ref = Math.atan2(wp.y - p.y, wp.x - p.x), got = Math.atan2(g.uy, g.ux);
      let e = Math.abs(ref - got); if (e > Math.PI) e = 2 * Math.PI - e;
      const first = Math.atan2(path[0].y - p.y, path[0].x - p.x); let e1 = Math.abs(first - got); if (e1 > Math.PI) e1 = 2 * Math.PI - e1;
      const air = Math.atan2(tg.y - p.y, tg.x - p.x); let ea = Math.abs(air - got); if (ea > Math.PI) ea = 2 * Math.PI - ea;
      const noWall = W.lineFree(KK.G.L.map, p.x, p.y, p.x + g.ux * 1.5, p.y + g.uy * 1.5, 0);
      return { err: e, errFirst: e1, errAir: ea, noWall, kind: tg.kind, a: g.a };
    });
    const town = await angErr();
    await page.screenshot({ path: V7 + "pfeil_stadt_hoch.png" });
    // Bewegung → sofort weg; erst nach erneut 2 s Stillstand wieder
    const pl = await page.evaluate(() => KK.state());
    await page.touchscreen.tap(206, 560);
    await sleep(120);
    const gone = await G(page);
    await page.waitForFunction(() => !KK.G.p.moving && !KK.G.p.path, null, { timeout: 6000 }).catch(() => { });
    const again = await page.evaluate(async () => { const t0 = performance.now(); let first = null; await new Promise(d => { const f = () => { const g = KK.guide(); if (g.t >= 0 && first === null) first = g.idle; if (performance.now() - t0 > 2600) return d(); requestAnimationFrame(f); }; f(); }); return first; });
    // Keller Ebene 1: Titelkarte → kein Pfeil; danach Pfeil zur Treppe
    await page.evaluate(() => KK.goto(1));
    await sleep(2300);
    const duringCard = await G(page);
    const ok1 = await waitArrow(page, 5000);
    const e1 = await angErr();
    await page.screenshot({ path: V7 + "pfeil_ebene1_hoch.png" });
    // Pfad statt Luftlinie: Stelle suchen, an der die Luftlinie zur Treppe durch eine Wand geht und der Weg anders abbiegt
    const around = await page.evaluate(async () => {
      const W = await import("./src/world.js?v=" + window.KK_VER), G = KK.G, m = G.L.map, st = G.L.stairs;
      let best = null;
      for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
        if (m.block[y * m.w + x] || !W.canStand(m, x + 0.5, y + 0.5, 0.3)) continue;
        const d = Math.hypot(st.x - x - 0.5, st.y - y - 0.5); if (d < 4 || d > 14 || W.lineFree(m, x + 0.5, y + 0.5, st.x, st.y, 0)) continue;
        const path = W.findPath(m, x + 0.5, y + 0.5, st.x, st.y, 0.3); if (!path) continue;
        const a1 = Math.atan2(path[0].y - y - 0.5, path[0].x - x - 0.5), a2 = Math.atan2(st.y - y - 0.5, st.x - x - 0.5);
        let e = Math.abs(a1 - a2); if (e > Math.PI) e = 2 * Math.PI - e;
        if (!best || e > best.e) best = { x: x + 0.5, y: y + 0.5, e };
      }
      if (best) { KK.teleport(best.x, best.y); (await import("./src/guide.js?v=" + window.KK_VER)).guideInput(); }
      return best;
    });
    let eWall = null;
    if (around) { await waitArrow(page, 4000); eWall = await angErr(); await page.screenshot({ path: V7 + "pfeil_um_die_ecke_hoch.png" }); }
    // Frost + Glut
    const pal = {};
    for (const [d, nm] of [[13, "frost"], [17, "glut"]]) {
      await page.evaluate(d => KK.goto(d), d);
      pal[nm] = await waitArrow(page, 7000) && await angErr();
      await page.screenshot({ path: V7 + `pfeil_${nm}_e${d}_hoch.png` });
    }
    // versiegelte Treppe (Boss lebt) → Pfeil zum Boss
    await page.evaluate(() => { KK.G.bossDone = []; KK.goto(4); });
    const okB = await waitArrow(page, 7000);
    const sealed = await angErr();
    const sealedSt = await page.evaluate(() => KK.state().stairsSealed);
    await page.screenshot({ path: V7 + "pfeil_versiegelt_zum_boss_hoch.png" });
    // Bosskampf: kein Pfeil, auch nach 4 s Stillstand
    await page.evaluate(() => { KK.god(true); KK.teleport("boss"); KK.G.p.x += 2.2; });
    await page.waitForFunction(() => KK.arena() && KK.arena().fight, null, { timeout: 8000 }).catch(() => { });
    await poke(page);
    const bf = await page.evaluate(async () => { const s0 = KK.guide().shows, t0 = performance.now(); let maxA = 0, fight = true; await new Promise(d => { const f = () => { maxA = Math.max(maxA, KK.guide().a); fight = fight && KK.arena().fight; if (performance.now() - t0 > 4500) return d(); requestAnimationFrame(f); }; f(); }); return { maxA, shows: KK.guide().shows - s0, fight }; });
    await page.evaluate(() => { KK.kill("boss"); KK.god(false); });
    // Einstellung aus → kein Pfeil
    await page.evaluate(() => KK.goto(1)); await sleep(3000);
    await page.evaluate(() => KK.pause()); await sleep(250);
    await page.locator('#setBox .set[data-k="arrow"]').click(); await sleep(100);
    const offSet = await page.evaluate(() => KK.guide().on);
    await page.evaluate(() => KK.resume());
    await poke(page);
    const sOff0 = (await G(page)).shows; await sleep(3500); const sOff1 = (await G(page)).shows;
    // Pfad nur beim Einblenden: 12 s Stillstand → Berechnungen == Einblendungen
    await page.evaluate(() => KK.pause()); await sleep(200);
    await page.locator('#setBox .set[data-k="arrow"]').click(); await sleep(100);
    await page.evaluate(() => KK.resume()); await poke(page);
    const c0 = await G(page); await sleep(12000); const c1 = await G(page);
    await ctx.close();
    const allErr = [town, e1, pal.frost, pal.glut, sealed, eWall].filter(Boolean);
    const maxErr = Math.max(...allErr.map(x => deg(x.err)));
    R("V20", "Weg-Pfeil: erscheint nach 2,0 s Stillstand (nicht früher), zeigt zum Pfad-Wegpunkt (Winkelfehler < 20°, nie in eine Wand), weg bei Bewegung und erst nach erneut 2 s wieder",
      timing.a19 === 0 && timing.idleFirst >= 1.99 && timing.idleFirst < 2.2 && timing.tFirst >= 1950 && maxErr < 20 && allErr.every(x => x.noWall) && gone.a === 0 && gone.t === -1 && again >= 1.99 && again < 2.3 && town.kind === "portal" && e1.kind === "stairs" && ok1,
      `erst nach ${timing.tFirst} ms (Stillstand ${timing.idleFirst.toFixed(2)} s, davor a=${timing.a19}), Winkelfehler Stadt ${deg(town.err)}° · E1 ${deg(e1.err)}° · Frost ${pal.frost ? deg(pal.frost.err) : "–"}° · Glut ${pal.glut ? deg(pal.glut.err) : "–"}° · versiegelt ${deg(sealed.err)}°${eWall ? ` · um die Ecke ${deg(eWall.err)}° (Luftlinie wäre ${deg(eWall.errAir)}° daneben)` : ""}, max. ${maxErr}°; nach Tipp a=${gone.a}, wieder nach ${again && again.toFixed(2)} s`);
    R("V20b", "Weg-Pfeil: Ziel-Regel (Stadt → Portal, Keller → Treppe, versiegelt → Arena bzw. Boss), kein Pfeil während Titelkarte und im Bosskampf, Einstellung „🧭 Weg-Pfeil“ greift, Pfad nur beim Einblenden",
      duringCard.a === 0 && sealedSt && (sealed.kind === "boss" || sealed.kind === "arena") && okB && bf.fight && bf.maxA === 0 && bf.shows === 0 && offSet === false && sOff1 === sOff0 && (c1.calcs - c0.calcs) <= (c1.shows - c0.shows) + 1 && (c1.shows - c0.shows) >= 1 && pal.frost && pal.glut,
      `Titelkarte a=${duringCard.a}; E4 versiegelt ${sealedSt} → Ziel ${sealed.kind}; Bosskampf ${bf.fight}: max a=${bf.maxA}, Einblendungen ${bf.shows}; aus: ${sOff1 - sOff0} Einblendungen; 12 s Stillstand: ${c1.shows - c0.shows} Einblendungen, ${c1.calcs - c0.calcs} Pfad-Berechnungen`);
    // Querformat-Screenshots
    const { ctx: cq, page: pq } = await np("index.html", 915, 412);
    await pq.evaluate(() => { KK.start({ name: "Pfeili" }); }); await sleep(300);
    await waitArrow(pq, 7000); await pq.screenshot({ path: V7 + "pfeil_stadt_quer.png" });
    for (const [d, nm] of [[1, "ebene1"], [13, "frost_e13"], [17, "glut_e17"]]) { await pq.evaluate(d => KK.goto(d), d); await waitArrow(pq, 7000); await pq.screenshot({ path: V7 + `pfeil_${nm}_quer.png` }); }
    await pq.evaluate(() => { KK.G.bossDone = []; KK.goto(2); }); await waitArrow(pq, 7000);
    const q2 = await pq.evaluate(() => KK.guide().target.kind);
    await pq.screenshot({ path: V7 + "pfeil_versiegelt_zum_boss_quer.png" });
    await cq.close();
    if (q2 !== "boss" && q2 !== "arena") errors.push("v7 quer: Pfeil auf E2 zeigt nicht zum Boss bzw. zur Arena (" + q2 + ")");   // v11: Boss steckt noch im Boden → Arenamitte
  }

  // ===================================================================
  // V21 — Save v6 → v7 ohne Verlust (Spielstand-Datei bleibt v3; Einstellungen bekommen 🧭, der Rest bleibt)
  // ===================================================================
  if (want("V21")) {
    const V6SAVE = { v: 3, bossDone: [2, 4], name: "Sechsi", species: "fuchs", look: { species: "fuchs", skin: "#ff9a42", outfit: "#9b7bff", eye: "#4a2a10", hair: "#c75f1a", style: "zoepfe", earsV: 1, acc: "blume" },
      lvl: 7, xp: 12, xpNext: 40, maxHp: 14, hp: 10, atk: 6.5, projN: 2, magic: 3, gold: 4321, potions: 4, ammo: 22, spec: 0.67, sk: { kraft: 2, leben: 1, tempo: 0, blasen: 1, magnet: 1 }, skPts: 1,
      hats: ["pilz"], hat: "pilz", deepest: 5, depth: 3, mega: false, tut: true, runSecs: 321, won: false, seed: 12345, migrated: false, kills: 99, capNote: 0, giftNote: 0 };
    const V6SET = { music: true, sfx: false, vibrate: false, joystick: false };
    const init = `try { if (!sessionStorage.getItem("kk6")) { sessionStorage.setItem("kk6", "1"); localStorage.setItem("koboldkeller2_save", ${JSON.stringify(JSON.stringify(V6SAVE))}); localStorage.setItem("koboldkeller2_settings", ${JSON.stringify(JSON.stringify(V6SET))}); } } catch (e) { }`;
    const { ctx, page } = await np("index.html", 412, 915, init);
    const r = await page.evaluate(async () => {
      const S = await import("./src/save.js?v=" + window.KK_VER);
      return { sv: S.loadSave(), set: S.loadSettings(), info: document.getElementById("contInfo").textContent };
    });
    const diff = Object.keys(V6SAVE).filter(k => JSON.stringify(r.sv[k]) !== JSON.stringify(V6SAVE[k]));
    await tapEl(page, "#btnCont");
    await page.waitForFunction(() => KK.state().screen === "play" && !KK.state().demo, null, { timeout: 8000 });
    await sleep(600);
    const s = await page.evaluate(() => ({ ...KK.state(), arrowOn: KK.guide().on, vib: KK.hap().vibrate }));
    await page.evaluate(() => KK.save());
    const raw = await page.evaluate(() => JSON.parse(localStorage.getItem("koboldkeller2_save")));
    const rawDiff = Object.keys(V6SAVE).filter(k => !["runSecs", "hp"].includes(k) && JSON.stringify(raw[k]) !== JSON.stringify(V6SAVE[k]));
    await ctx.close();
    R("V21", "Save-Migration v6 → v7: Spielstand unverändert übernommen (alle Felder, Datei v3), Einstellungen bleiben (📳 aus, 🕹️ aus, 🔔 aus) + 🧭 Weg-Pfeil neu an; Weiterspielen stellt alles her",
      diff.length === 0 && rawDiff.length === 0 && raw.v === 3 && r.set.arrow === true && r.set.vibrate === false && r.set.joystick === false && r.set.sfx === false && s.lvl === 7 && s.gold === 4321 && s.depth === 3 && s.name === "Sechsi" && s.look.style === "zoepfe" && s.sk.kraft === 2 && s.bossDone.join() === "2,4" && s.arrowOn === true && s.vib === false,
      `geladen: ${diff.length ? "Abweichung " + diff.join(",") : "alle " + Object.keys(V6SAVE).length + " Felder gleich"}; gespeichert: ${rawDiff.length ? "Abweichung " + rawDiff.join(",") : "gleich"}, Datei v${raw.v}; Einstellungen ${JSON.stringify(r.set)}; im Spiel Lv ${s.lvl}, 🪙 ${s.gold}, Ebene ${s.depth}, ${s.name}, bossDone ${s.bossDone.join(",")}`);
  }
}

// ---------- einzeln ausführen ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k)); return a ? a.split("=")[1] : d; };
  const BASE = `http://localhost:${arg("port", 8731)}/`;
  const only = arg("only", null) ? arg("only").split(",") : null;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
  const results = [], errors = [];
  const R = (id, name, pass, value = "") => { results.push({ id, pass: !!pass }); console.log((pass ? "PASS " : "FAIL ") + id.padEnd(5) + " " + name + (value !== "" ? "  → " + value : "")); };
  try { await runV7({ browser, BASE, R, errors, only, secs: +arg("secs", 60) }); }
  finally { await browser.close(); }
  console.log("Fehler: " + (errors.length ? errors.join(" | ") : 0));
  const pass = results.filter(r => r.pass).length;
  console.log(`${pass}/${results.length} PASS`);
  process.exit(pass === results.length && !errors.length ? 0 : 1);
}
