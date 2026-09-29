// Koboldkeller 2 — v9-Checks (Mythos-Kostüme): V26 Darstellung aller Kostüme × 8 Tierarten (Gesicht frei), V27 Freischalten + Anziehen +
// Speichern, V28 Migration echter v3-Spielstände, V29 Würfel, V30 Editor (Tab, Silhouetten, Zähler, Hut-Schalter, ?kostueme=alle),
// V31 Leistung (Kellerkönig-Kampf mit Phönix/Sternendrache, Cache-Wachstum). Screenshots → shots/neubau/v9/.
// Wird von tools/check.mjs aufgerufen (Teil 2); einzeln: node tools/checks_v9.mjs [--port=8731] [--only=V26,V30]
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const GPU_FLAGS = ["--use-angle=metal", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"];
const V9 = "shots/neubau/v9/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SAVE = { v: 3, bossDone: [], name: "Mythi", species: "hase", look: { species: "hase", skin: "#f6eee0", outfit: "#ffcf4a", eye: "#6b2f5a", hair: "#ffc2d4", style: "zoepfe", earsV: 0, acc: "blume" },
  lvl: 9, xp: 5, xpNext: 80, maxHp: 20, hp: 18, atk: 7, projN: 2, magic: 3, gold: 777, potions: 4, ammo: 18, spec: 0.67, sk: { kraft: 2, leben: 3, tempo: 1, blasen: 1, magnet: 1 }, skPts: 3,
  hats: ["pilz"], hat: "pilz", deepest: 7, depth: 3, mega: false, tut: true, runSecs: 50, won: false, seed: 4321, migrated: false, kills: 99, capNote: 0, giftNote: 0 };

export async function runV9({ browser, BASE, R, errors, only = null }) {
  mkdirSync(V9, { recursive: true });
  const want = id => !only || only.includes(id);
  async function np(path = "index.html", w = 412, h = 915, init = null, tag0 = "v9") {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    const tag = tag0 + " " + (w > h ? "quer" : "hoch");
    page.on("pageerror", e => errors.push(tag + " pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(tag + " console: " + m.text()); });
    await page.goto(BASE + path);
    await page.waitForFunction(() => window.KK && window.KK.G && window.KK.G.L, null, { timeout: 30000 });
    await sleep(300);
    return { ctx, page };
  }
  const tapEl = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  /** Spielstand/Sammlung/Ehrenhall vor dem Laden setzen (nur beim ersten Laden der Seite) */
  const initStore = (o) => `try { if (!sessionStorage.getItem("kk9i")) { sessionStorage.setItem("kk9i", "1"); localStorage.clear();` +
    (o.save ? `localStorage.setItem("koboldkeller2_save", ${JSON.stringify(JSON.stringify(o.save))});` : "") +
    (o.hall ? `localStorage.setItem("koboldkeller_hall_v1", ${JSON.stringify(JSON.stringify(o.hall))});` : "") +
    (o.myths ? `localStorage.setItem("koboldkeller2_myths", ${JSON.stringify(JSON.stringify(o.myths))});` : "") + ` } } catch (e) { }`;

  // ===================================================================
  // V26 — alle Kostüme × 8 Tierarten: Spiel-Rig, Porträt, Vorschau (hoch + quer) ohne Fehler; Gesicht frei (Pixelvergleich)
  // ===================================================================
  if (want("V26")) {
    const res = [];
    for (const [w, h, tag] of [[412, 915, "hoch"], [915, 412, "quer"]]) {
      const e0 = errors.length;
      const { ctx, page } = await np("index.html?kostueme=alle", w, h);
      const r = await page.evaluate(async () => {
        const v = "?v=" + window.KK_VER, A = await import("./src/art.js" + v), C = await import("./src/config.js" + v), G = KK.G;
        KK.start({ name: "Kontakt", seed: 777 }); KK.goto(1); KK.god(true); G.ents.length = 0; G.portalCd = 1e9;
        const fr = () => new Promise(r => requestAnimationFrame(r));
        let rigs = 0, ports = 0, prevs = 0, faceWorst = 0, faceAt = "", browMin = 1;
        const cv = document.createElement("canvas"), pv = document.createElement("canvas"); pv.width = 320; pv.height = 340;
        for (const M of C.MYTHS) for (const s of C.SPECIES) {
          for (const acc of ["none", "brille", "blume"]) {
            const L = C.makeLook({ species: s.id, myth: M.id, acc });
            if (acc === "none") {
              KK.look({ ...C.lookSave(L) }); G.p.moving = true; await fr(); G.p.moving = false; rigs++;
              A.portrait(cv, L, null, 64); ports++; A.previewRig(pv, L, null, 1.3); prevs++;
            }
            // Gesicht frei: Kopf-Sprite mit/ohne Kopfteil-Vorderlage im Gesichtsfeld (Augen, Wangen, Mund) vergleichen
            const hd = A.head(L, "open"), hf = A.mythHead(L, "front");
            if (!hf) continue;
            const k = hd.cv.width / hd.w, c1 = document.createElement("canvas"); c1.width = Math.round(160 * k); c1.height = Math.round(200 * k);
            const x = c1.getContext("2d", { willReadFrequently: true });
            const box = [Math.round((75 - 22) * k), Math.round((138 - 6) * k), Math.round(44 * k), Math.round(32 * k)];   // HX±22, HY−6 … HY+26 (Anker-Versatz 15/58)
            x.drawImage(hd.cv, (75 - hd.ax) * k, (170 - hd.ay) * k); const a = x.getImageData(...box).data;
            x.drawImage(hf.cv, (75 - hf.ax) * k, (170 - hf.ay) * k); const b = x.getImageData(...box).data;
            let diff = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 40) diff++;
            const f = diff / (a.length / 4); if (f > faceWorst) { faceWorst = f; faceAt = M.id + "/" + s.id + "/" + acc; }
            // Gegenprobe: die Stirn (HY−34 … HY−20) muss bei Kapuzen/Helmen deutlich bedeckt sein — sonst misst der Test nichts
            if (M.head.startsWith("hood") && acc === "none") {
              x.clearRect(0, 0, c1.width, c1.height); const fb = [Math.round((75 - 18) * k), Math.round((138 - 34) * k), Math.round(36 * k), Math.round(14 * k)];
              x.drawImage(hd.cv, (75 - hd.ax) * k, (170 - hd.ay) * k); const a2 = x.getImageData(...fb).data; x.drawImage(hf.cv, (75 - hf.ax) * k, (170 - hf.ay) * k); const b2 = x.getImageData(...fb).data;
              let d2 = 0; for (let i = 0; i < a2.length; i += 4) if (Math.abs(a2[i] - b2[i]) + Math.abs(a2[i + 1] - b2[i + 1]) + Math.abs(a2[i + 2] - b2[i + 2]) > 40) d2++;
              browMin = Math.min(browMin, d2 / (a2.length / 4));
            }
          }
        }
        KK.wear("");
        return { rigs, ports, prevs, faceWorst: +(faceWorst * 100).toFixed(2), faceAt, browMin: +(browMin * 100).toFixed(1), art: A.artCount() };
      });
      await page.evaluate(() => { KK.wear("phoenix"); }); await sleep(400);
      await page.screenshot({ path: V9 + `phoenix_ebene1_${tag}.png` });
      // Laufen in allen 5 Welten (Lesbarkeit auf dunklem/hellem Boden) — bewusst schwierige Paare (Yeti im Frost, Golem in der Glut)
      for (const [d, id] of [[1, "fee"], [5, "kristallritter"], [9, "nixe"], [13, "yeti"], [17, "golem"]]) {
        await page.evaluate(({ d, id }) => { KK.goto(d); KK.wear(id); KK.god(true); KK.G.ents.length = 0; KK.G.portalCd = 1e9; }, { d, id });
        await sleep(2700);
        await page.evaluate(async () => { const W = await import("./src/world.js?v=" + window.KK_VER), G = KK.G, p = G.p, m = G.L.map; for (const [dx, dy] of [[4, 0], [0, 4], [-4, 0], [0, -4], [3, 3]]) if (W.lineFree(m, p.x, p.y, p.x + dx, p.y + dy, 0.35)) { p.path = [{ x: p.x + dx, y: p.y + dy }]; break; } });
        await sleep(450);
        await page.screenshot({ path: V9 + `laufen_e${d}_${id}_${tag}.png` });
      }
      await ctx.close();
      res.push({ tag, ...r, errs: errors.length - e0 });
    }
    // Kontaktbogen (alle Kostüme × 8 Tierarten)
    const { ctx, page } = await np("index.html", 1300, 900);
    const size = await page.evaluate(async () => {
      const v = "?v=" + window.KK_VER, A = await import("./src/art.js" + v), C = await import("./src/config.js" + v), px = 128;
      const rows = [{ id: "", name: "ohne Kostüm", emoji: "🙂", tier: "" }, ...C.MYTHS];
      const W = 170 + C.SPECIES.length * px, H = 34 + rows.length * px, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
      c.fillStyle = "#2a2440"; c.fillRect(0, 0, W, H); c.font = "bold 14px system-ui"; c.fillStyle = "#fff"; c.textBaseline = "middle"; c.textAlign = "center";
      C.SPECIES.forEach((s, i) => c.fillText(s.name, 170 + i * px + px / 2, 17));
      const tmp = document.createElement("canvas");
      rows.forEach((m, r) => {
        const y = 34 + r * px; c.fillStyle = r % 2 ? "#3a3258" : "#322a4c"; c.fillRect(0, y, W, px);
        c.textAlign = "left"; c.fillStyle = m.tier === "mythisch" ? "#ffd75e" : m.tier === "episch" ? "#d8b4ff" : "#dff0ff"; c.fillText(m.emoji + " " + m.name, 8, y + px / 2 - 8);
        c.font = "12px system-ui"; c.fillStyle = "#bbb"; c.fillText(m.tier ? m.tier + (m.unlock === "start" ? " · Start" : m.unlock === "mega" ? " · MEGA-Sieg" : " · " + C.mythHint(m)) : "", 8, y + px / 2 + 10); c.font = "bold 14px system-ui";
        C.SPECIES.forEach((s, i) => { A.portrait(tmp, C.makeLook({ species: s.id, myth: m.id, acc: i === 2 ? "blume" : i === 5 ? "brille" : i === 3 ? "schleife" : "none" }), null, px / (window.devicePixelRatio || 1)); c.drawImage(tmp, 170 + i * px, y, px, px); });
      });
      document.body.innerHTML = ""; document.body.style.margin = "0"; cv.id = "sheet"; cv.style.display = "block"; cv.style.width = W / 2 + "px"; cv.style.height = H / 2 + "px"; document.body.appendChild(cv);
      return [W, H];
    });
    await page.setViewportSize({ width: Math.ceil(size[0] / 2), height: Math.ceil(size[1] / 2) });
    await page.locator("#sheet").screenshot({ path: V9 + "kontaktbogen.png" });
    await ctx.close();
    const ok = res.every(r => r.errs === 0 && r.rigs === 14 * 8 && r.ports === 14 * 8 && r.prevs === 14 * 8 && r.faceWorst < 3 && r.browMin > 30);
    R("V26", "Alle 14 Kostüme × 8 Tierarten zeichnen fehlerfrei (Spielfigur laufend, Porträt, Editor-Vorschau; hoch + quer), Gesicht bleibt frei (Kopfteil verdeckt < 3 % des Gesichtsfelds, auch mit Brille/Blume)",
      ok, res.map(r => `${r.tag}: ${r.rigs} Figuren, ${r.ports} Porträts, ${r.prevs} Vorschauen, Fehler ${r.errs}, Gesicht verdeckt max. ${r.faceWorst} %${r.faceAt ? " (" + r.faceAt + ")" : ""} (Gegenprobe Stirn unter Kapuzen ≥ ${r.browMin} %), Sprites ${r.art}`).join(" · ") + ` · Kontaktbogen ${size.join("×")}`);
  }

  // ===================================================================
  // V27 — Freischalten per Boss-Sieg (Mini, Haupt, König, MEGASCHWER), Paket nur einmal, Anziehen (echter Tipp), Speichern/Neu laden, neues Spiel behält
  // ===================================================================
  if (want("V27")) {
    const { ctx, page } = await np("index.html", 412, 915, initStore({ myths: { v: 1, have: ["drache", "einhorn", "zauberer"], note: 0 } }));
    await page.evaluate(() => KK.start({ name: "Finder", seed: 777 }));
    const killAt = async (d, mega = false) => page.evaluate(async ({ d, mega }) => {
      const G = KK.G; G.mega = mega; KK.goto(d); KK.god(true); G.portalCd = 1e9; await new Promise(r => setTimeout(r, 300));
      KK.teleport("boss"); G.p.x -= 2; const b = G.boss; b.awake = true;
      const t0 = KK.myths().count; KK.kill("boss");
      const drops = G.items.filter(i => i.kind === "myth").map(i => i.v);
      const w0 = performance.now(); while (G.items.some(i => i.kind === "myth") && performance.now() - w0 < 4000) await new Promise(r => setTimeout(r, 50));
      return { d, drops, got: KK.myths().count - t0, left: G.items.filter(i => i.kind === "myth").length, toasts: KK.myths().toasts };
    }, { d, mega });
    const k2 = await killAt(2);
    await sleep(250); await page.screenshot({ path: V9 + "fund_moment_hoch.png" });
    // Toast-Knopf „Anziehen“ echt antippen
    const btn = await page.locator(".mythToast .mtBtn").first().boundingBox().catch(() => null);
    let worn = null;
    if (btn) { await page.touchscreen.tap(btn.x + btn.width / 2, btn.y + btn.height / 2); await sleep(300); worn = await page.evaluate(() => KK.myths().wearing); }
    const btnSize = btn ? Math.round(Math.min(btn.width, btn.height)) : 0;
    const k4 = await killAt(4);
    const again = await killAt(2);                                        // derselbe Boss noch einmal → kein zweites Paket
    await sleep(3000);
    const k20 = await killAt(20);
    await sleep(3200);                                                    // Siegesbild
    const kMega = await page.evaluate(async () => { KK.G.winQueued = false; KK.G.screen = "play"; return true; });
    const km = await killAt(20, true);
    await sleep(3200);
    // Speichern + Neu laden → Kostüm (Waldfee) + Sammlung wieder da; neues Spiel behält die Sammlung
    await page.evaluate(() => { KK.G.winQueued = false; KK.G.screen = "play"; KK.G.mega = false; KK.goto(0); KK.wear("fee"); KK.save(); });
    const raw = await page.evaluate(() => JSON.parse(localStorage.getItem("koboldkeller2_save")).look);
    await page.reload(); await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 }); await sleep(400);
    await tapEl(page, "#btnCont"); await page.waitForFunction(() => KK.state().screen === "play" && !KK.state().demo, null, { timeout: 8000 }); await sleep(500);
    const after = await page.evaluate(() => ({ wearing: KK.myths().wearing, count: KK.myths().count }));
    await page.screenshot({ path: V9 + "waldfee_nach_neuladen_hoch.png" });
    await page.evaluate(() => KK.start({ name: "Neu", seed: 5 }));
    const fresh = await page.evaluate(() => ({ count: KK.myths().count, wearing: KK.myths().wearing }));
    await ctx.close();
    const ok = k2.drops.join() === "fee" && k2.got === 1 && k2.left === 0 && k2.toasts >= 1 && worn === "fee" && btnSize >= 44 &&
      k4.drops.join() === "waldhueter" && again.drops.length === 0 && k20.drops.join() === "phoenix" && km.drops.join() === "sternendrache" &&
      raw.myth === "fee" && after.wearing === "fee" && after.count === 7 && fresh.count === 7 && fresh.wearing === "";
    R("V27", "Freischalten: erster Sieg über Mini-Boss/Hauptboss/König (MEGASCHWER: Sternendrache) wirft genau ein Kostüm-Paket, es fliegt zum Kobold, Toast mit „Anziehen“ (echter Tipp), zweiter Sieg → kein Paket; Speichern/Neu laden stellt Kostüm + Sammlung her, neues Spiel behält die Sammlung",
      ok, `E2 ${k2.drops.join()} (+${k2.got}, Toasts ${k2.toasts}) · Knopf ${btnSize} px → angezogen ${worn} · E4 ${k4.drops.join()} · E2 nochmal: ${again.drops.length} Pakete · E20 ${k20.drops.join()} · MEGA-König ${km.drops.join()} · gespeichert look.myth=${raw.myth} → neu geladen ${after.wearing}, Sammlung ${after.count} · neues Spiel: Sammlung ${fresh.count}, trägt „${fresh.wearing}“`);
  }

  // ===================================================================
  // V28 — Migration echter v3-Spielstände (Format save.js): bossDone [2,4,6] / won / MEGA-Sieg (Save + 🔥 Ehrenhall); Spielstand sonst unverändert
  // ===================================================================
  if (want("V28")) {
    const cases = [
      { name: "bossDone 2,4,6", save: { ...SAVE, bossDone: [2, 4, 6] }, want: ["fee", "waldhueter", "greif"] },
      { name: "won", save: { ...SAVE, won: true }, want: ["phoenix"] },
      { name: "MEGA-Sieg (Spielstand)", save: { ...SAVE, won: true, mega: true }, want: ["phoenix", "sternendrache"] },
      { name: "🔥 in der Ehrenhall", save: { ...SAVE }, hall: { gold: [{ name: "Alt", gold: 900, secs: 999, lvl: 20, ts: 1, mega: true, how: "boss", from: 1, species: "fuchs" }], time: [] }, want: ["phoenix", "sternendrache"] },
    ];
    const out = [];
    for (const cs of cases) {
      const { ctx, page } = await np("index.html", 412, 915, initStore({ save: cs.save, hall: cs.hall }));
      const r = await page.evaluate(() => ({ have: KK.myths().real, key: JSON.parse(localStorage.getItem("koboldkeller2_myths")) }));
      await page.evaluate(() => { window.__t = []; new MutationObserver(() => window.__t.push(document.getElementById("toasts").textContent)).observe(document.getElementById("toasts"), { childList: true, subtree: true }); });
      await tapEl(page, "#btnCont"); await page.waitForFunction(() => KK.state().screen === "play" && !KK.state().demo, null, { timeout: 8000 }); await sleep(3200);
      const toast = await page.evaluate(() => window.__t.join(" | "));
      await page.evaluate(() => KK.save());
      const raw = await page.evaluate(() => JSON.parse(localStorage.getItem("koboldkeller2_save")));
      const diff = Object.keys(cs.save).filter(k => !["runSecs", "hp"].includes(k) && JSON.stringify(raw[k]) !== JSON.stringify(cs.save[k]));
      // zweites Laden: kein erneuter Hinweis
      await page.reload(); await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
      await page.evaluate(() => { window.__t = []; new MutationObserver(() => window.__t.push(document.getElementById("toasts").textContent)).observe(document.getElementById("toasts"), { childList: true, subtree: true }); });
      await tapEl(page, "#btnCont"); await page.waitForFunction(() => KK.state().screen === "play" && !KK.state().demo, null, { timeout: 8000 }); await sleep(3000);
      const toast2 = await page.evaluate(() => window.__t.join(" | "));
      if (cs.name === "bossDone 2,4,6") await page.screenshot({ path: V9 + "migration_hinweis_hoch.png" });
      await ctx.close();
      const extra = r.have.filter(id => !["drache", "einhorn", "zauberer"].includes(id));
      out.push({ name: cs.name, extra, ok: extra.slice().sort().join() === cs.want.slice().sort().join() && diff.length === 0 && raw.v === 3 && toast.includes("Du hast " + cs.want.length) && !toast2.includes("Kostüm"), diff, toast: toast.includes("Du hast " + cs.want.length), toast2: toast2.includes("Kostüm") });
    }
    R("V28", "Migration echter v3-Spielstände: bossDone [2,4,6] → genau Waldfee, Waldhüter, Greif · won → Phönix · MEGA-Sieg (Spielstand oder 🔥 Ehrenhall) → Sternendrache; einmal „Du hast N Kostüme verdient!“, alle anderen Felder gleich (Datei v3)",
      out.every(o => o.ok), out.map(o => `${o.name}: +${o.extra.join(",") || "–"}, Hinweis ${o.toast ? "ja" : "NEIN"}, 2. Laden ${o.toast2 ? "NOCHMAL" : "kein Hinweis"}, Felder ${o.diff.length ? "ANDERS " + o.diff.join(",") : "gleich"}`).join(" · "));
  }

  // ===================================================================
  // V29 — Würfel: 300 Würfe im Modul mit Sammlung → nur freigeschaltete Kostüme, Anteil 20–40 %, 0 Harmonie-Verstöße, 0 Wiederholungen; ?seed reproduzierbar
  // ===================================================================
  if (want("V29")) {
    const { ctx, page } = await np("index.html?seed=11");
    const r = await page.evaluate(async () => {
      const C = await import("./src/config.js?v=" + window.KK_VER), U = await import("./src/util.js?v=" + window.KK_VER);
      const have = ["drache", "einhorn", "zauberer", "greif", "phoenix"], rnd = U.mulberry32(99);
      let prev = "", rep = 0, bad = 0, withM = 0, locked = 0; const seen = {};
      for (let i = 0; i < 300; i++) {
        const o = C.rollLook(rnd, prev, have), L = C.makeLook(o), k = C.lookKey(L);
        if (k === prev) rep++; prev = k; if (C.lookHarmony(L).length) bad++;
        if (L.myth) { withM++; seen[L.myth] = (seen[L.myth] || 0) + 1; if (!have.includes(L.myth)) locked++; }
      }
      const a = C.rollLook(U.mulberry32(5), "", have), b = C.rollLook(U.mulberry32(5), "", have);
      return { rep, bad, share: withM / 300, locked, seen, same: JSON.stringify(a) === JSON.stringify(b) };
    });
    // im Editor mit ?seed=11: 20 Würfe, nur freigeschaltete Kostüme der Sammlung (Start: 3)
    await tapEl(page, "#btnNew"); await sleep(400);
    const ui = [];
    for (let i = 0; i < 20; i++) { await tapEl(page, "#btnDice"); await sleep(90); ui.push(await page.evaluate(() => KK.editor().look.myth || "")); }
    const uiBad = ui.filter(m => m && !["drache", "einhorn", "zauberer"].includes(m));
    await ctx.close();
    R("V29", "Würfel mit Kostümen: 300 Würfe → nur freigeschaltete, Anteil 20–40 %, 0 Harmonie-Verstöße, 0 direkte Wiederholungen, gleicher Seed = gleicher Wurf; Editor-Würfel nimmt nur Kostüme der Sammlung",
      r.rep === 0 && r.bad === 0 && r.locked === 0 && r.share >= 0.2 && r.share <= 0.4 && r.same && uiBad.length === 0,
      `Anteil ${(r.share * 100).toFixed(1)} % (${JSON.stringify(r.seen)}), gesperrt ${r.locked}, Verstöße ${r.bad}, Wiederholungen ${r.rep}, Seed gleich ${r.same} · Editor 20 Würfe: ${ui.filter(Boolean).length} mit Kostüm, fremde ${uiBad.length}`);
  }

  // ===================================================================
  // V30 — Editor: Tab „🦄 Kostüme“ (≤ 4 je Reihe, Touch ≥ 48 px, alle Tabs erreichbar), gesperrte Silhouetten + Hinweis, Zähler, Hut-Schalter,
  //        ?kostueme=alle speichert nichts
  // ===================================================================
  if (want("V30")) {
    const res = {};
    for (const [w, h, tag] of [[412, 915, "hoch"], [915, 412, "quer"]]) {
      const { ctx, page } = await np("index.html", w, h, initStore({ save: { ...SAVE }, myths: { v: 1, have: ["drache", "einhorn", "zauberer", "fee", "greif", "phoenix"], note: 0 } }));
      await tapEl(page, "#btnCont"); await page.waitForFunction(() => KK.state().screen === "play" && !KK.state().demo, null, { timeout: 8000 }); await sleep(2800);
      await page.evaluate(() => { KK.goto(0); }); await sleep(2600);
      await page.evaluate(() => { const m = KK.G.L.mirror; KK.G.mirrorArmed = true; KK.G.p.x = m.x; KK.G.p.y = m.y + 1.1; }); await sleep(900);
      const openOk = await page.evaluate(() => KK.G.screen === "edit");
      await page.locator('[data-t="myth"]').click(); await sleep(500);
      const lay = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll("#editTabs .tab")].map(b => { const r = b.getBoundingClientRect(); return { h: r.height, vis: r.bottom <= innerHeight + 400 && r.width > 0 }; });
        const opts = [...document.querySelectorAll(".mythGrid .opt")], rows = {};
        opts.forEach(o => { const t = Math.round(o.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; });
        const locked = opts.filter(o => o.dataset.lock), dark = locked.map(o => { const c = o.querySelector("canvas"), x = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0, s = 0; for (let i = 0; i < x.length; i += 4) if (x[i + 3] > 200) { n++; s += x[i] + x[i + 1] + x[i + 2]; } return n ? s / n / 3 : 0; });
        return { tabs: tabs.length, tabMinH: Math.min(...tabs.map(t => t.h)), opts: opts.length, perRow: Math.max(...Object.values(rows)), minOpt: Math.min(...opts.map(o => Math.min(o.getBoundingClientRect().width, o.getBoundingClientRect().height))),
          locked: locked.length, lockHint: locked.every(o => /Besiege|Gewinne/.test(o.textContent)), darkMax: Math.round(Math.max(...dark)), count: document.getElementById("mythCount").textContent,
          tiers: ["selten", "episch", "mythisch"].map(t => document.querySelectorAll(".mythGrid .tier-" + t).length).join("/") };
      });
      await page.screenshot({ path: V9 + `kostuem_tab_${tag}.png` });
      // gesperrtes antippen → nichts ändert sich; Phönix wählen → Vorschau trägt Phönix; Hut-Schalter
      const lookBefore = await page.evaluate(() => KK.editor().look.myth || "");
      await page.locator(".mythGrid .opt[data-lock]").first().click(); await sleep(200);
      const lookLocked = await page.evaluate(() => KK.editor().look.myth || "");
      await page.locator('.mythGrid .opt[data-v="phoenix"]').click(); await sleep(250);
      const pick = await page.evaluate(() => KK.editor().look.myth);
      await page.locator("#mhatRow").click(); await sleep(250);
      const mhat = await page.evaluate(() => KK.editor().look.mhat);
      if (tag === "hoch") await page.screenshot({ path: V9 + "kostuem_tab_phoenix_hut_hoch.png" });
      await page.locator("#btnEditOk").click(); await sleep(500);
      const inGame = await page.evaluate(() => ({ myth: KK.G.p.look.myth, mhat: KK.G.p.look.mhat, hat: KK.G.p.hat }));
      await page.screenshot({ path: V9 + `phoenix_mit_hut_${tag}.png` });
      await ctx.close();
      res[tag] = { openOk, ...lay, lookBefore, lookLocked, pick, mhat, inGame };
    }
    // ?kostueme=alle: alles frei zur Ansicht, NICHTS wird gespeichert (Sammlung + getragenes Kostüm)
    const { ctx, page } = await np("index.html?kostueme=alle", 412, 915, initStore({ save: { ...SAVE }, myths: { v: 1, have: ["drache", "einhorn", "zauberer"], note: 0 } }));
    const k0 = await page.evaluate(() => localStorage.getItem("koboldkeller2_myths"));
    await tapEl(page, "#btnCont"); await page.waitForFunction(() => KK.state().screen === "play" && !KK.state().demo, null, { timeout: 8000 }); await sleep(2500);
    await page.evaluate(() => { KK.goto(0); }); await sleep(2600);
    await page.evaluate(() => { const m = KK.G.L.mirror; KK.G.mirrorArmed = true; KK.G.p.x = m.x; KK.G.p.y = m.y + 1.1; }); await sleep(900);
    await page.locator('[data-t="myth"]').click(); await sleep(400);
    const view = await page.evaluate(() => ({ locked: document.querySelectorAll(".mythGrid .opt[data-lock]").length, hint: !!document.querySelector(".mythView") }));
    await page.screenshot({ path: V9 + "kostueme_alle_ansicht_hoch.png" });
    await page.locator('.mythGrid .opt[data-v="sternendrache"]').click(); await sleep(200);
    await page.locator("#btnEditOk").click(); await sleep(400);
    await page.evaluate(() => KK.save());
    const saved = await page.evaluate(() => ({ look: JSON.parse(localStorage.getItem("koboldkeller2_save")).look, key: localStorage.getItem("koboldkeller2_myths"), wearing: KK.myths().wearing }));
    await ctx.close();
    const H = res.hoch, Q = res.quer;
    const ok = [H, Q].every(r => r.openOk && r.tabs === 8 && r.tabMinH >= 48 && r.opts === 15 && r.perRow <= 4 && r.minOpt >= 48 && r.locked === 8 && r.lockHint && r.darkMax < 70 && /6 \/ 14/.test(r.count) &&
      r.lookLocked === r.lookBefore && r.pick === "phoenix" && r.mhat === true && r.inGame.myth === "phoenix" && r.inGame.mhat === true && r.inGame.hat === "pilz") &&
      view.locked === 0 && view.hint && saved.key === k0 && !saved.look.myth && saved.wearing === "sternendrache";
    R("V30", "Editor-Tab „🦄 Kostüme“: 15 Felder (Ohne + 14), ≤ 4 je Reihe, Touch ≥ 48 px, 8 Tabs ≥ 48 px, gesperrte = dunkle Silhouette + 🔒 + „Besiege …“, Stufen-Rahmen, Zähler „6 / 14“, Gesperrtes tippen ändert nichts, „🎩 Hut statt Kopfteil“ wirkt im Spiel; ?kostueme=alle: alles frei + Hinweis, speichert nichts",
      ok, ["hoch", "quer"].map(t => { const r = res[t]; return `${t}: Tabs ${r.tabs} (min ${Math.round(r.tabMinH)} px), Felder ${r.opts}, max ${r.perRow}/Reihe, min ${Math.round(r.minOpt)} px, gesperrt ${r.locked} (Helligkeit max ${r.darkMax}, Hinweis ${r.lockHint}), Stufen ${r.tiers}, „${r.count.trim()}“, Tipp gesperrt → ${r.lookLocked === r.lookBefore ? "unverändert" : "GEÄNDERT"}, gewählt ${r.pick}, Hut-Schalter ${r.mhat} → im Spiel ${JSON.stringify(r.inGame)}`; }).join(" · ") +
      ` · ?kostueme=alle: gesperrt ${view.locked}, Hinweis ${view.hint}, Sammlung ${saved.key === k0 ? "unverändert" : "GEÄNDERT"}, Spielstand-Look ${saved.look.myth ? "MIT " + saved.look.myth : "ohne Kostüm"} (getragen: ${saved.wearing})`);
  }

  // ===================================================================
  // V31 — Leistung: Kellerkönig-Kampf (Wut-Phase, 9 Handlanger) mit Phönix bzw. Sternendrache, CPU 4× ≥ 45 FPS; Sprite-Cache wächst bei Kostümwechseln nicht unbegrenzt
  // ===================================================================
  if (want("V31")) {
    const fps = {};
    for (const [w, h, tag] of [[412, 915, "hoch"], [915, 412, "quer"]]) for (const id of ["phoenix", "sternendrache"]) {
      const { ctx, page } = await np("index.html?kostueme=alle", w, h);
      await page.evaluate((id) => { KK.start({ name: "Perf", seed: 777 }); KK.wear(id); KK.goto(20); KK.god(true); KK.G.portalCd = 1e9; }, id);
      await sleep(2700);
      await page.evaluate(() => { KK.teleport("boss"); KK.G.p.x -= 3; KK.G.boss.awake = true; });
      await sleep(2600);
      await page.evaluate(() => { const b = KK.G.boss; b.hp = b.maxHp * 0.3; KK.bossHit(); window.__pf = setInterval(() => { KK.attack(); if (Math.random() < 0.3) KK.bubbles(); KK.wave(9); if (KK.G.boss && KK.G.boss.hp < KK.G.boss.maxHp * 0.1) KK.G.boss.hp = KK.G.boss.maxHp * 0.3; if (Math.random() < 0.2) KK.bossAtk(["fireRing", "meteors", "flameCross"][Math.floor(Math.random() * 3)]); }, 300); });
      const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await sleep(2000); await page.evaluate(() => KK.perf(true)); await sleep(5000);
      const p = await page.evaluate(() => { clearInterval(window.__pf); return { ...KK.perf(), minions: KK.arena().minions, teles: KK.G.teles.length }; });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      if (tag === "hoch" || id === "phoenix") await page.screenshot({ path: V9 + `${id}_bosskampf_${tag}.png` });
      await ctx.close();
      fps[tag + ":" + id] = p;
    }
    // Cache: „10 min“ Kostümwechsel im Zeitraffer (400 Wechsel über Kostüme/Tierarten/Extras + Laufen)
    const { ctx, page } = await np("index.html?kostueme=alle");
    const cache = await page.evaluate(async () => {
      const C = await import("./src/config.js?v=" + window.KK_VER), fr = () => new Promise(r => requestAnimationFrame(r));
      KK.start({ name: "Cache", seed: 777 }); KK.goto(3); KK.god(true); KK.G.portalCd = 1e9; KK.speed(4);
      const samples = [];
      for (let i = 0; i < 400; i++) {
        const M = C.MYTHS[i % C.MYTHS.length], s = C.SPECIES[(i * 7) % C.SPECIES.length];
        KK.look({ species: s.id, myth: M.id, acc: ["none", "blume", "brille"][i % 3], skin: C.LOOK_RULES.fur[s.id][i % C.LOOK_RULES.fur[s.id].length] });
        KK.G.p.moving = true; await fr(); await fr();
        if (i % 50 === 49) samples.push(KK.myths().art);
      }
      KK.speed(1);
      return samples;
    });
    await ctx.close();
    const growth = cache[cache.length - 1] - cache[Math.floor(cache.length / 2)];
    const ok = Object.values(fps).every(p => p.fps >= 45) && cache[cache.length - 1] < 900 && growth < 60;
    R("V31", "Leistung mit Kostüm: Kellerkönig-Kampf (Wut-Phase, 9 Handlanger, Warnungen) mit Phönix/Sternendrache, CPU 4× ≥ 45 FPS (hoch + quer); Sprite-Cache bei 400 Kostümwechseln begrenzt (LRU)",
      ok, Object.entries(fps).map(([k, p]) => `${k} ${p.fps} fps (p5 ${p.p5}, Handlanger ${p.minions}, Warnungen ${p.teles})`).join(" · ") + ` · Cache nach 50…400 Wechseln: ${cache.join(" → ")} (zweite Hälfte +${growth})`);
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
  try { await runV9({ browser, BASE, R, errors, only }); }
  finally { await browser.close(); }
  console.log("Fehler: " + (errors.length ? errors.join(" | ") : 0));
  const pass = results.filter(r => r.pass).length;
  console.log(`${pass}/${results.length} PASS`);
  process.exit(pass === results.length && !errors.length ? 0 : 1);
}
