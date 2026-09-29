// Koboldkeller 2 — v8-Checks (Spielgefühl): V22 Tempo + Steuerung, V23 Boss-Leben, V24 Ebenen-Wahl (Welttore), V25 Wandfallen.
// Screenshots → shots/neubau/v8/. Wird von tools/check.mjs aufgerufen (Teil 2, --v7=only); einzeln:
//   node tools/checks_v8.mjs [--port=8731] [--ref=8732] [--only=V22,V24]
// --ref=PORT: Vergleichsserver mit dem alten Stand (v7, z. B. `git archive 74c0543 | tar -x -C …` + tools/serve.py) → Vorher/Nachher-Werte.
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const GPU_FLAGS = ["--use-angle=metal", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"];
const V8 = "shots/neubau/v8/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r2 = v => Math.round(v * 100) / 100;

export async function runV8({ browser, BASE, R, errors, only = null, REF = null }) {
  mkdirSync(V8, { recursive: true });
  const want = id => !only || only.includes(id);
  async function np(path = "index.html", w = 412, h = 915, base = BASE, tag0 = "v8") {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
    const page = await ctx.newPage();
    const tag = tag0 + " " + (w > h ? "quer" : "hoch");
    if (base === BASE) {
      page.on("pageerror", e => errors.push(tag + " pageerror: " + e.message));
      page.on("console", m => { if (m.type() === "error") errors.push(tag + " console: " + m.text()); });
    }
    await page.goto(base + path);
    await page.waitForFunction(() => window.KK && window.KK.G && window.KK.G.L, null, { timeout: 30000 });
    await sleep(300);
    return { ctx, page };
  }
  const shot = (page, name) => page.screenshot({ path: V8 + name + ".png" });

  // ===================================================================
  // V22 — schneller laufen: Tempo, Schrittfrequenz, Kamera, Halten-Folgen, weiter Tipp, Wand dicht
  // ===================================================================
  if (want("V22")) {
    /** misst in beiden Ständen gleich: Laufen auf gerader Strecke, Kamera, Halten (Finger still), Tipp weit */
    const measure = async (base, label) => {
      const { ctx, page } = await np("index.html", 412, 915, base, label);
      await page.evaluate(() => KK.start({ name: "Flitzi", seed: 777 }));
      // gerade freie Strecke ≥ 12 Kacheln in +x (Bildschirm rechts unten) suchen, Ebene für Ebene
      const setup = await page.evaluate(async () => {
        const W = await import("./src/world.js?v=" + window.KK_VER), G = KK.G;
        for (let d = 1; d <= 12; d++) {
          KK.goto(d); const m = G.L.map;
          for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 14; x++) {
            let ok = true; for (let k = 0; k <= 12 && ok; k++) ok = W.canStand(m, x + 0.5 + k, y + 0.5, 0.4) && !G.L.traps.some(t => Math.abs(t.y - y - 0.5) < 1 && t.x > x && t.x < x + 13);
            if (ok) return { d, x: x + 0.5, y: y + 0.5 };
          }
        }
        return null;
      });
      const prep = async () => page.evaluate((s) => {
        const G = KK.G, p = G.p; KK.god(true); G.ents.length = 0; G.items.length = 0; G.portalCd = 1e9; G.homeHideT = 1e9;
        if (G.L.wallTraps) G.L.wallTraps.length = 0;
        p.x = s.x; p.y = s.y; p.vx = p.vy = 0; p.path = null; p.foe = null; KK.teleport(s.x, s.y);
        return true;
      }, setup);
      await page.evaluate((d) => KK.goto(d), setup.d); await sleep(2600);          // Titelkarte abwarten
      await prep(); await sleep(300);
      // 1) Tempo + Schrittfrequenz + Kamera auf gerader Strecke (Spielzeit G.t)
      const walk = await page.evaluate(async (s) => {
        const G = KK.G, p = G.p, R = KK.R, fr = () => new Promise(r => requestAnimationFrame(r));
        p.path = [{ x: s.x + 12, y: s.y }];
        const t0 = G.t; while (G.t - t0 < 0.35) await fr();
        const x1 = p.x, t1 = G.t, ph1 = p.walkPh; let camLead = 0, n = 0;
        while (G.t - t1 < 1.2) { await fr(); camLead += R.camX - p.x; n++; }
        const v = (p.x - x1) / (G.t - t1), ph = (p.walkPh - ph1) / (G.t - t1);
        return { v: +v.toFixed(3), phRate: +ph.toFixed(2), stride: +(v / (ph / (2 * Math.PI))).toFixed(3), camLead: +(camLead / n).toFixed(3) };
      }, setup);
      // 2) Finger 2,5 s STILL halten, 3 Kacheln voraus (echtes Touch-Ereignis) → läuft der Kobold weiter?
      await prep(); await sleep(400);
      const cdp = await ctx.newCDPSession(page);
      const tp = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 3 }] });
      const hp = await page.evaluate(async () => { const r = await import("./src/render.js?v=" + window.KK_VER); const p = KK.G.p; return r.toScreen(p.x + 3, p.y); });
      const h0 = await page.evaluate(() => ({ x: KK.G.p.x, t: KK.G.t }));
      await tp("touchStart", hp[0], hp[1]); await sleep(2500);
      const h1 = await page.evaluate(() => ({ x: KK.G.p.x, t: KK.G.t, moving: KK.G.p.moving }));
      await tp("touchEnd"); await sleep(400);
      const h2 = await page.evaluate(() => ({ x: KK.G.p.x, moving: KK.G.p.moving }));
      // 3) EIN Tipp auf eine weit entfernte sichtbare Stelle (5 Kacheln) → kommt an? Spielzeit bis dort
      await prep(); await sleep(400);
      const tapPt = await page.evaluate(async () => { const r = await import("./src/render.js?v=" + window.KK_VER); const p = KK.G.p; return r.toScreen(p.x + 5, p.y); });
      const g0 = await page.evaluate(() => KK.G.t);
      await page.touchscreen.tap(tapPt[0], tapPt[1]);
      const tap = await page.evaluate(async ({ s, g0 }) => { const G = KK.G, t0 = performance.now(); while (Math.hypot(G.p.x - s.x - 5, G.p.y - s.y) > 0.3 && performance.now() - t0 < 5000) await new Promise(r => requestAnimationFrame(r)); return { arrived: Math.hypot(G.p.x - s.x - 5, G.p.y - s.y) <= 0.3, secs: +(G.t - g0).toFixed(2) }; }, { s: setup, g0 });
      await ctx.close();
      return { setup, walk, hold: { secs: r2(h1.t - h0.t), dist: r2(h1.x - h0.x), stillMoving: h1.moving, stopAfter: !h2.moving }, tap };
    };
    const now = await measure(BASE, "v8");
    const old = REF ? await measure(REF, "v7").catch(e => ({ err: e.message })) : null;
    // 4) Wand bleibt dicht: 400 Versuche mit Ausweichsprung + Rückstoß gegen Wände, dt = 0,05 s (Frame-Einbruch), Spielmodul direkt
    const { ctx, page } = await np();
    await page.evaluate(() => KK.start({ name: "Wand", seed: 4242 }));
    const wall = await page.evaluate(async () => {
      const v = "?v=" + window.KK_VER, g = await import("./src/game.js" + v), W = await import("./src/world.js" + v), C = await import("./src/config.js" + v), G = KK.G, p = G.p;
      let tries = 0, bad = 0, freed = 0, worst = 0;
      for (const d of [3, 9, 14, 19]) {
        KK.goto(d); KK.god(true); G.ents.length = 0; G.portalCd = 1e9; G.L.wallTraps.length = 0;
        const m = G.L.map, cells = [];
        for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (!m.block[y * m.w + x] && W.canStand(m, x + 0.5, y + 0.5, 0.3)) cells.push([x, y]);
        for (let i = 0; i < 100; i++) {
          const [cx, cy] = cells[(Math.random() * cells.length) | 0], a = Math.random() * Math.PI * 2;
          p.x = cx + 0.5; p.y = cy + 0.5; p.path = null; p.foe = null; p.specT = 0;
          if (i % 2) { p.dashT = C.PLAYER.dashTime; p.dashDx = Math.cos(a); p.dashDy = Math.sin(a); }
          else { p.dashT = 0; p.vx = Math.cos(a) * 14; p.vy = Math.sin(a) * 14; }            // Rückstoß + Tempo
          G.screen = "play"; tries++;
          for (let k = 0; k < 12; k++) {
            g.update(0.05, 0.05);
            const inWall = m.block[Math.floor(p.y) * m.w + Math.floor(p.x)] === 1;
            if (inWall) bad++;
            if (!W.canStand(m, p.x, p.y, p.r)) { freed++; }
          }
        }
      }
      p.dashT = 0; p.vx = p.vy = 0;
      return { tries, bad, freed };
    });
    await ctx.close();
    const ratio = now.walk.v / (old && old.walk ? old.walk.v : 3.6);
    const ok = now.walk.v > 4.45 && now.walk.v < 4.95 && ratio > 1.25 && ratio < 1.36 && now.walk.stride < 2.3 && now.walk.camLead > 0 &&
      now.hold.dist > 7 && now.hold.stillMoving && now.hold.stopAfter && now.tap.arrived && wall.bad === 0 && (!old || !old.walk || old.hold.dist < now.hold.dist);
    R("V22", "Schneller laufen: Tempo ≈ 4,7 (+31 %), Schritt-Animation skaliert (Schrittweite ≈ gleich), Kamera läuft vorn mit, Finger still halten = weiterlaufen, ein Tipp weit = ganzer Weg, Wand dicht bei dt 0,05 s",
      ok, `Tempo ${now.walk.v} Kacheln/s${old && old.walk ? " (v7 " + old.walk.v + ", ×" + ratio.toFixed(3) + ")" : ""} · Schritt ${now.walk.phRate} rad/s, Schrittweite ${now.walk.stride}${old && old.walk ? " (v7 " + old.walk.phRate + " rad/s, " + old.walk.stride + ")" : ""} · Kamera ${now.walk.camLead} Kacheln voraus${old && old.walk ? " (v7 " + old.walk.camLead + ")" : ""} · Finger 2,5 s still: ${now.hold.dist} Kacheln, läuft noch ${now.hold.stillMoving}, stoppt beim Loslassen ${now.hold.stopAfter}${old && old.hold ? " (v7: " + old.hold.dist + " Kacheln, läuft noch " + old.hold.stillMoving + ")" : ""} · Tipp 5 Kacheln: ${now.tap.arrived ? "an in " + now.tap.secs + " s" : "NICHT angekommen"}${old && old.tap ? " (v7 " + old.tap.secs + " s)" : ""} · Wand: ${wall.tries} Sprünge/Stöße, ${wall.bad} Frames in der Wand`);
    globalThis.__v8measure = { now, old, wall };
  }

  // ===================================================================
  // V23 — Bosse etwas mehr Leben (BOSS_HP_MUL), Phasen prozentual, Handlanger-Deckel
  // ===================================================================
  if (want("V23")) {
    const { ctx, page } = await np();
    const res = await page.evaluate(async () => {
      const C = await import("./src/config.js?v=" + window.KK_VER), G = KK.G, out = [];
      KK.start({ name: "Boss", seed: 99 }); G.p.lvl = 10;
      for (let d = 2; d <= 20; d += 2) {
        KK.goto(d); KK.god(true); G.portalCd = 1e9;
        const b = G.boss, def = b.isMini ? C.MINIS[d] : C.BOSSES[C.biomeOf(d)];
        const base = def.hp[0] + def.hp[1] * 10, exp = Math.round(base * C.BOSS_HP_MUL);
        // Phasen: knapp über / unter der Schwelle
        const th = b.isMini ? [C.MINI_PHASE] : C.BOSS_PHASES, ph = [];
        for (const t of th) { b.invulT = 0; b.hp = b.maxHp * (t + 0.01); KK.bossHit(); ph.push(b.phase); b.invulT = 0; b.hp = b.maxHp * (t - 0.01); KK.bossHit(); ph.push(b.phase); b.state = "chase"; }
        out.push({ d, name: b.name, mini: !!b.isMini, king: !!b.isKing, maxHp: b.maxHp, exp, v7: Math.round(base), ph: ph.join("") });
      }
      // Handlanger-Deckel in einem langen Kampf (E20): 30 erzwungene Wellen
      KK.goto(20); KK.god(true); KK.G.portalCd = 1e9; KK.teleport("boss"); KK.G.p.x -= 3; await new Promise(r => setTimeout(r, 400));
      let maxN = 0; const { minionCount, arenaCap } = await import("./src/boss.js?v=" + window.KK_VER);
      for (let i = 0; i < 30; i++) { KK.wave(9); maxN = Math.max(maxN, minionCount()); await new Promise(r => setTimeout(r, 60)); }
      return { rows: out, mul: C.BOSS_HP_MUL, cap: arenaCap(), maxN };
    });
    await ctx.close();
    const ok = res.rows.every(r => r.maxHp === r.exp && (r.mini ? r.ph === "12" : r.ph === "1223")) && res.mul >= 1.25 && res.mul <= 1.35 && res.maxN <= res.cap;
    R("V23", "Bosse etwas mehr Leben: Haupt-, Mini-Bosse und Kellerkönig einheitlich × BOSS_HP_MUL (Richtwert +25–35 %), Phasen-Schwellen bleiben prozentual, Handlanger-Deckel hält",
      ok, `Faktor ${res.mul} · Level 10: ` + res.rows.map(r => `${r.name} ${r.v7}→${r.maxHp}${r.maxHp === r.exp ? "" : "≠" + r.exp} [${r.ph}]`).join(" · ") + ` · 30 erzwungene Wellen E20: max. ${res.maxN} Handlanger (Deckel ${res.cap})`);
  }

  // ===================================================================
  // V24 — jede geschaffte Ebene einzeln wählbar: 5 Welt-Wege, Welttore, 20 Portale
  // ===================================================================
  if (want("V24")) {
    const { ctx, page } = await np();
    await page.evaluate(() => { KK.start({ name: "Tori", seed: 777 }); KK.G.deepest = 9; KK.goto(0); });
    await sleep(2800);
    const lay = await page.evaluate(async () => {
      const v = "?v=" + window.KK_VER, W = await import("./src/world.js" + v), C = await import("./src/config.js" + v), G = KK.G, L = G.L, m = L.map;
      const po = L.portals, F = L.fountain, sp = C.PLAYER.speed;
      const depths = po.map(p => p.depth).sort((a, b) => a - b).join(",");
      let minD = 99; for (let i = 0; i < po.length; i++) for (let j = i + 1; j < po.length; j++) minD = Math.min(minD, Math.hypot(po[i].x - po[j].x, po[i].y - po[j].y));
      const plen = (a, b) => { const p = W.findPath(m, a.x, a.y, b.x, b.y, 0.3); if (!p) return 999; let l = 0, c = a; for (const q of p) { l += Math.hypot(q.x - c.x, q.y - c.y); c = q; } return l; };
      // Brunnen: Startpunkte rund um den Brunnen (Rand des Heil-Bereichs) → längster Weg zu irgendeinem Portal
      let worstF = 0, worstE = 0, worstFd = 0;
      for (const p of po) {
        let best = 1e9; for (let a = 0; a < 8; a++) { const s = W.nearestFree(m, F.x + Math.cos(a * Math.PI / 4) * 2.2, F.y + Math.sin(a * Math.PI / 4) * 2.2, 0.3); best = Math.min(best, plen(s, p)); }
        if (best > worstF) { worstF = best; worstFd = p.depth; }
        worstE = Math.max(worstE, plen(L.entry, p));
      }
      const locked = po.filter(p => p.locked).map(p => p.depth), open = po.filter(p => !p.locked).map(p => p.depth);
      const labels = po.map(p => ({ d: p.depth, label: p.label, name: p.name, lvName: C.levelName(p.depth), icon: p.icon }));
      const iconOk = labels.every(l => l.name === l.lvName && (l.d > 9 ? l.icon === "🔒" : C.bossKindOf(l.d) === "main" ? l.icon === "👑" : C.bossKindOf(l.d) === "mini" ? l.icon === "⚡" : l.icon === "🌀") && l.label.includes(String(l.d)));
      const gates = (L.gates || []).map(g => ({ w: g.w, posts: g.posts.length, ports: po.filter(p => p.world === g.w).map(p => p.depth).join("") }));
      const guide = KK.guideAim() ? KK.guide().cur : null;
      return { n: po.length, depths, minD: +minD.toFixed(2), worstF: +worstF.toFixed(1), worstFd, worstE: +worstE.toFixed(1), secsF: +(worstF / sp).toFixed(2), secsE: +(worstE / sp).toFixed(2),
        locked: locked.join(","), open: open.join(","), iconOk, gates, guide, map: [m.w, m.h] };
    });
    await shot(page, "stadt_eingang_hoch");
    // Weg-Pfeil in der Stadt: nach 2 s Stillstand → Portal der tiefsten erreichten Ebene
    await page.evaluate(async () => (await import("./src/guide.js?v=" + window.KK_VER)).guideInput());
    await page.waitForFunction(() => KK.guide().a > 0.9, null, { timeout: 6000 }).catch(() => { });
    const gd = await page.evaluate(() => { const g = KK.guide(); return { a: g.a, kind: g.target && g.target.kind, depth: g.target && g.target.depth }; });
    await shot(page, "stadt_pfeil_zu_ebene9_hoch");
    // Echtes Antippen eines freigeschalteten Portals (Ebene 9, Zucker-Tor): läuft hin + betritt, runFrom = 9, Spielzeit
    await page.evaluate(() => { const po = KK.G.L.portals.find(p => p.depth === 9); KK.teleport(po.x - 2.4, po.y - 2.4); KK.G.portalCd = 0; });
    await sleep(700);
    await shot(page, "stadt_zucker_tor_hoch");
    const tapPo = async (d) => page.evaluate(async (d) => { const r = await import("./src/render.js?v=" + window.KK_VER); const po = KK.G.L.portals.find(p => p.depth === d); return r.toScreen(po.x, po.y); }, d);
    // Spielstand-Format: dieselben Felder wie v7 (Datei v3) — Liste aus save.js/v7 (V21), keine neuen Felder
    const save0 = "bossDone,capNote,depth,giftNote,gold,hat,hats,hp,kills,look,lvl,magic,maxHp,mega,name,potions,projN,runSecs,seed,sk,skPts,spec,species,tut,v,won,xp,xpNext,ammo,atk,deepest,migrated".split(",").sort().join(",");
    let pt = await tapPo(9); const t9 = await page.evaluate(() => KK.G.t);
    await page.touchscreen.tap(pt[0], pt[1]);
    await page.waitForFunction(() => KK.state().depth === 9, null, { timeout: 6000 }).catch(() => { });
    const in9 = await page.evaluate((t9) => ({ depth: KK.G.depth, runFrom: KK.G.runFrom, secs: +(KK.G.t - t9).toFixed(2) }), t9);
    const save1 = await page.evaluate(() => { KK.save(); const s = JSON.parse(localStorage.getItem("koboldkeller2_save")); return { keys: Object.keys(s).sort().join(","), v: s.v, deepest: s.deepest }; });
    // Gesperrtes Portal (Ebene 12) antippen: läuft hin, Hinweis, kein Wechsel
    await page.evaluate(() => { KK.goto(0); }); await sleep(2600);
    await page.evaluate(() => { const po = KK.G.L.portals.find(p => p.depth === 12); KK.teleport(po.x - 1.6, po.y - 1.6); KK.G.portalCd = 0; });
    await sleep(500);
    pt = await tapPo(12);
    await page.evaluate(() => { window.__toasts = []; const el = document.getElementById("toasts") || document.body; window.__mo = new MutationObserver(() => window.__toasts.push(el.textContent)); window.__mo.observe(el, { childList: true, subtree: true, characterData: true }); });
    await page.touchscreen.tap(pt[0], pt[1]); await sleep(1600);
    const lockRes = await page.evaluate(() => ({ depth: KK.G.depth, toast: (window.__toasts || []).join(" ").includes("Ebene 12") }));
    await shot(page, "stadt_gesperrt_hinweis_hoch");
    // Vorbeilaufen: Pfad führt mitten über Portal 5 (ohne es anzutippen) → kein Betreten; danach draufstellen → nach kurzem Verweilen hinein
    await page.evaluate(() => { KK.goto(0); }); await sleep(2600);
    const pass = await page.evaluate(async () => {
      const G = KK.G, p = G.p, po = G.L.portals.find(q => q.depth === 5), c = G.L.gates.find(g => g.w === 2);
      const W = await import("./src/world.js?v=" + window.KK_VER), ux = (po.x - c.cx) / Math.hypot(po.x - c.cx, po.y - c.cy), uy = (po.y - c.cy) / Math.hypot(po.x - c.cx, po.y - c.cy);
      p.x = po.x - ux * 2.2; p.y = po.y - uy * 2.2; G.portalCd = 0; p.goal = null;
      const far = W.nearestFree(G.L.map, po.x + ux * 1.8, po.y + uy * 1.8, 0.3);
      p.path = [{ x: po.x, y: po.y }, far];
      const t0 = performance.now(); let minD = 9;
      while (performance.now() - t0 < 1500) { await new Promise(r => requestAnimationFrame(r)); minD = Math.min(minD, Math.hypot(p.x - po.x, p.y - po.y)); if (G.depth) break; }
      const passed = { depth: G.depth, minD: +minD.toFixed(2) };
      // jetzt drauf stehen bleiben (kein Tipp-Ziel): nach ≈ 0,45 s hinein
      p.path = [{ x: po.x, y: po.y }]; const t1 = G.t;
      while (G.depth === 0 && G.t - t1 < 3) await new Promise(r => requestAnimationFrame(r));
      return { passed, dwellDepth: G.depth, dwellSecs: +(G.t - t1).toFixed(2) };
    });
    // Tutorial-Schritt „Portal“: neues Spiel mit Tutorial bei Schritt 5 → Portal 1 antippen → Tutorial fertig
    await page.evaluate(() => { KK.start({ name: "Tuti", seed: 777, tut: false }); KK.G.tutStep = 5; });
    await sleep(2800);
    await page.evaluate(async () => { const g = await import("./src/game.js?v=" + window.KK_VER), po = KK.G.L.portals.find(p => p.depth === 1); KK.teleport(po.x + 1.6, po.y - 1.6); KK.G.portalCd = 0; g.tapWorld(po.x + 0.3, po.y - 0.2, null); });
    await page.waitForFunction(() => KK.state().depth === 1, null, { timeout: 6000 }).catch(() => { });
    const tut = await page.evaluate(() => ({ depth: KK.G.depth, flag: !!KK.G.tutFlags.portal, step: KK.G.tutStep, prof: !!KK.G.prof.tut, from: KK.G.runFrom }));
    await ctx.close();
    // Screenshots: jedes Welttor + Portal-Schild, hoch und quer
    for (const [w, h, tag] of [[412, 915, "hoch"], [915, 412, "quer"]]) {
      const { ctx: c2, page: p2 } = await np("index.html", w, h);
      await p2.evaluate(() => { KK.start({ name: "Tori", seed: 777 }); KK.G.deepest = 14; KK.goto(0); });
      await sleep(2800);
      await p2.evaluate(() => KK.teleport(KK.G.L.fountain.x + 2.2, KK.G.L.fountain.y + 2.2)); await sleep(700);
      await p2.screenshot({ path: V8 + `stadt_uebersicht_${tag}.png` });
      for (const g of [1, 2, 3, 4, 5]) {
        await p2.evaluate((g) => { const G = KK.G, t = G.L.gates.find(x => x.w === g); const po = G.L.portals.find(p => p.depth === (g - 1) * 4 + 2); KK.teleport(t.cx + (t.x - t.cx) * 0.25, t.cy + (t.y - t.cy) * 0.25); G.p.x = po.x + (t.cx - po.x) * 0.45; G.p.y = po.y + (t.cy - po.y) * 0.45; }, g);
        await sleep(650);
        await p2.screenshot({ path: V8 + `welttor_${g}_${tag}.png` });
      }
      await c2.close();
    }
    const gatesOk = lay.gates.length === 5 && lay.gates.every(g => g.posts === 2 && g.ports.length >= 4);
    const ok = lay.n === 20 && lay.depths === Array.from({ length: 20 }, (_, i) => i + 1).join(",") && lay.minD >= 2 && lay.secsF <= 6 && lay.secsE <= 6 && lay.open === "1,2,3,4,5,6,7,8,9" &&
      lay.iconOk && gatesOk && gd.kind === "portal" && gd.depth === 9 && in9.depth === 9 && in9.runFrom === 9 && save1.keys.split(",").every(k => save0.split(",").includes(k)) && save1.v === 3 &&
      lockRes.depth === 0 && lockRes.toast && pass.passed.depth === 0 && pass.passed.minD < 0.3 && pass.dwellDepth === 5 && tut.depth === 1 && tut.flag && tut.step === -1 && tut.prof;
    R("V24", "Ebenen-Wahl: 5 Welt-Wege mit Welttor, 20 Portale (je Ebene eins, Name + 👑/⚡/🔒), offen bis „tiefste“, gesperrte zeigen Hinweis, Abstand ≥ 2, Brunnen → jedes Portal ≤ 6 s, Vorbeilaufen löst nichts aus, Pfeil/Tutorial/Ehrenhall/Spielstand unverändert",
      ok, `${lay.n} Portale (Karte ${lay.map.join("×")}), Tore ${lay.gates.map(g => g.w + ":" + g.posts + "P").join(" ")}, min. Abstand ${lay.minD} · Brunnen → weitestes Portal (E${lay.worstFd}) ${lay.worstF} Kacheln = ${lay.secsF} s, Eingang → weitestes ${lay.secsE} s · offen ${lay.open} / gesperrt ${lay.locked.split(",").length} · Symbole+Namen ${lay.iconOk} · Pfeil → ${gd.kind} ${gd.depth} · Tipp auf 9: Ebene ${in9.depth} nach ${in9.secs} s, from ${in9.runFrom} · gesperrt 12: bleibt ${lockRes.depth}, Hinweis ${lockRes.toast} · drüberlaufen (${pass.passed.minD} Kacheln nah): Ebene ${pass.passed.depth}, stehen: Ebene ${pass.dwellDepth} nach ${pass.dwellSecs} s · Tutorial: ${JSON.stringify(tut)} · Spielstand v${save1.v}, Felder ${save1.keys.split(",").every(k => save0.split(",").includes(k)) ? "wie v7 (" + save1.keys.split(",").length + ")" : "NEU: " + save1.keys.split(",").filter(k => !save0.split(",").includes(k)).join(",")}`);
  }

  // ===================================================================
  // V25 — Wandfallen: Platzierung fair, Vorwarnung ≥ 0,8 s, Treffer = Pieks-Schaden, 💨 schützt, Haptik nur beim Treffer, FPS
  // ===================================================================
  if (want("V25")) {
    const { ctx, page } = await np();
    await page.evaluate(() => KK.start({ name: "Wandi", seed: 777 }));
    const place = await page.evaluate(async () => {
      const v = "?v=" + window.KK_VER, W = await import("./src/world.js" + v), C = await import("./src/config.js" + v), G = KK.G;
      const res = { counts: [], bad: [], minGap: 99, minEntry: 99, levels: 0 };
      for (const seed of [777, 1234, 99, 4242, 31337]) {
        for (const mega of [false, true]) {
          G.prof.seed = seed; G.mega = mega;
          for (let d = 1; d <= 20; d++) {
            KK.goto(d); res.levels++;
            const L = G.L, m = L.map, T = L.wallTraps, want = C.diffOf(d).wall + (mega && C.diffOf(d).wall ? C.WALLTRAP.megaPlus : 0);
            if (seed === 777) res.counts.push((mega ? "M" : "") + d + ":" + T.length);
            if (T.length !== want) res.bad.push("anzahl " + seed + "/" + d + (mega ? "M" : "") + " " + T.length + "≠" + want);
            const er = L.rooms.find(r => r.entry), A = L.arena;
            for (const t of T) {
              for (let k = 0; k <= t.len; k++) {
                const x = t.x0 + (t.x1 - t.x0) * k / t.len, y = t.y0 + (t.y1 - t.y0) * k / t.len;
                res.minEntry = Math.min(res.minEntry, Math.hypot(x - L.entry.x, y - L.entry.y));
                if (er && x > er.x && y > er.y && x < er.x + er.w && y < er.y + er.h) res.bad.push("eingang " + d);
                if (A && x > A.x - 1 && y > A.y - 1 && x < A.x + A.w + 1 && y < A.y + A.h + 1) res.bad.push("arena " + d);
              }
              if (!m.solid[t.wy * m.w + t.wx]) res.bad.push("keine wand " + d);
            }
            for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) res.minGap = Math.min(res.minGap, W.lineDist(T[i], T[j]));
            if (d <= 2 && T.length) res.bad.push("zu früh " + d);
          }
        }
      }
      G.mega = false; G.prof.seed = 777;
      return res;
    });
    // Ablauf an einer echten Falle: Vorwarnung → Schuss, Treffer = Pieks-Schaden, 💨 schützt, Haptik
    const flow = await page.evaluate(async () => {
      const v = "?v=" + window.KK_VER, g = await import("./src/game.js" + v), C = await import("./src/config.js" + v), P = await import("./src/platform.js" + v), G = KK.G, p = G.p, fr = () => new Promise(r => requestAnimationFrame(r));
      KK.goto(9); await new Promise(r => setTimeout(r, 2600));
      G.ents.length = 0; G.items.length = 0; G.portalCd = 1e9; G.homeHideT = 1e9; G.god = false; p.hp = p.maxHp = 60;
      const w = G.L.wallTraps[0]; for (const o of G.L.wallTraps) if (o !== w) { o.st = 0; o.next = 1e9; }
      const onLane = () => { p.x = w.x0 + w.dx * 2.5; p.y = w.y0 + w.dy * 2.5; p.vx = p.vy = 0; p.path = null; p.invulT = 0; };
      const cycle = async (dodge) => {
        onLane(); w.st = 0; w.next = 0.05; const hp0 = p.hp, hap0 = { ...P.PF.hapStats.calls };
        let warnT = null, fireT = null;
        while (fireT === null) { await fr(); onLane(); p.invulT = 0; if (w.st === 1 && warnT === null) warnT = G.t; if (w.st === 2) fireT = G.t; }
        const hapFire = Object.keys(P.PF.hapStats.calls).filter(k => (P.PF.hapStats.calls[k] || 0) !== (hap0[k] || 0));
        const t0 = G.t;
        while (G.t - t0 < 1.2) { await fr(); p.vx = p.vy = 0; p.path = null; if (dodge) { const s = G.shots.find(s => s.kind === "wall"); if (s && Math.hypot(s.x - p.x, s.y - p.y) < 1.3 && p.dashT <= 0 && !dodge.done) { p.dashCd = 0; dodge.done = true; g.dodge(); } } }
        return { warn: +(fireT - warnT).toFixed(2), dmg: +(hp0 - p.hp).toFixed(1), hapAtFire: hapFire, hapAfter: Object.keys(P.PF.hapStats.calls).filter(k => (P.PF.hapStats.calls[k] || 0) !== (hap0[k] || 0)) };
      };
      const hit = await cycle(null);
      await new Promise(r => setTimeout(r, 1100));
      const dash = await cycle({});
      // Takt mit Lücke: zwei Schüsse derselben Falle nie näher als period − jit
      w.st = 0; w.next = 0; p.x = w.mx; p.y = w.my; G.god = true; const shots = []; const t0 = G.t;
      while (G.t - t0 < 12) { await fr(); if (w.st === 2 && (!shots.length || G.t - shots[shots.length - 1] > 0.5)) shots.push(G.t); }
      let gap = 99; for (let i = 1; i < shots.length; i++) gap = Math.min(gap, shots[i] - shots[i - 1]);
      return { hit, dash, expDmg: g.wallTrapDmg(), gap: +gap.toFixed(2), n: shots.length, look: w.look.id };
    });
    await ctx.close();
    // Screenshots je Welt: Vorwarnung + Schuss, hoch + quer
    const shots = [];
    for (const [w, h, tag] of [[412, 915, "hoch"], [915, 412, "quer"]]) {
      const { ctx: c2, page: p2 } = await np("index.html", w, h);
      await p2.evaluate(() => KK.start({ name: "Wandi", seed: 777 }));
      for (const d of [3, 7, 11, 15, 19]) {
        await p2.evaluate((d) => { KK.goto(d); }, d); await sleep(2700);
        const ok = await p2.evaluate(() => {
          const G = KK.G, w = G.L.wallTraps[0]; if (!w) return false;
          KK.god(true); G.ents.length = 0; G.portalCd = 1e9;
          for (const o of G.L.wallTraps) { o.st = 0; o.next = 1e9; }
          KK.teleport(w.x0 + w.dx * 2.6 - w.dy * 1.3, w.y0 + w.dy * 2.6 - w.dx * 1.3); w.next = 0.01;
          return true;
        });
        if (!ok) continue;
        await p2.waitForFunction(() => KK.G.L.wallTraps[0].st === 1 && KK.G.L.wallTraps[0].t > 0.55, null, { timeout: 4000 }).catch(() => { });
        await p2.screenshot({ path: V8 + `wandfalle_e${d}_warnung_${tag}.png` });
        await p2.waitForFunction(() => { const s = KK.G.shots.find(s => s.kind === "wall"); return s && s.t > 0.28; }, null, { timeout: 3000, polling: 16 }).catch(() => { });
        await p2.screenshot({ path: V8 + `wandfalle_e${d}_schuss_${tag}.png` });
        shots.push(d + tag);
      }
      await c2.close();
    }
    // FPS: Glutkeller (5 Schützen) mit allen Fallen im Dauertakt + 12 Gegner, CPU-Throttle 4×
    const { ctx: c3, page: p3 } = await np();
    await p3.evaluate(() => KK.start({ name: "Fps", seed: 777 }));
    await p3.evaluate(() => { KK.goto(19); }); await sleep(2700);
    await p3.evaluate(() => {
      const G = KK.G; KK.god(true); G.portalCd = 1e9; const w = G.L.wallTraps[0]; KK.teleport(w.mx - w.dy * 1.2, w.my - w.dx * 1.2);
      for (const o of G.L.wallTraps) { o.next = 0; }
      const types = ["flamme", "geist", "wisp", "wichtel"];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; KK.spawn(types[i % 4], Math.cos(a) * 3.2, Math.sin(a) * 3.2); }
      window.__fpsT = setInterval(() => { KK.attack(); for (const e of G.ents) if (e.hp < 3) e.hp = 30; for (const o of G.L.wallTraps) if (o.st === 0) o.next = Math.min(o.next, 0.3); }, 280);
    });
    const cdp = await c3.newCDPSession(p3);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await sleep(1500); await p3.evaluate(() => KK.perf(true)); await sleep(5000);
    const fps = await p3.evaluate(() => { clearInterval(window.__fpsT); return { ...KK.perf(), shots: KK.G.shots.filter(s => s.kind === "wall").length }; });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await c3.close();
    const ok = place.bad.length === 0 && place.minGap >= 4 && place.minEntry >= 5.9 && flow.hit.warn >= 0.8 && flow.hit.warn <= 1.1 && flow.hit.dmg === flow.expDmg && flow.dash.dmg === 0 &&
      flow.hit.hapAtFire.length === 0 && flow.hit.hapAfter.includes("hurt") && flow.gap >= 2.5 && fps.fps >= 45;
    R("V25", "Wandfallen: ab Ebene 3 wenige Schützen (1–2 → 3–5, MEGASCHWER +1), nie am Eingang/in Arenen, nie zwei auf demselben Gang, Vorwarnung ≥ 0,8 s, Treffer = Pieks-Schaden, 💨 schützt, nur der Treffer vibriert, Takt mit Lücke, FPS ≥ 45 (4×)",
      ok, `${place.levels} Ebenen geprüft (5 Seeds × Normal/MEGA), Fehler ${place.bad.length ? place.bad.slice(0, 5).join(";") : 0}, Anzahl ${place.counts.filter(c => !c.startsWith("M")).map(c => c.split(":")[1]).join("")} (MEGA ${place.counts.filter(c => c.startsWith("M")).map(c => c.split(":")[1]).join("")}) · min. Abstand zweier Bahnen ${place.minGap.toFixed(1)} · min. Abstand zum Eingang ${place.minEntry.toFixed(1)} · Vorwarnung ${flow.hit.warn} s · Treffer −${flow.hit.dmg} ❤️ (Pieks ${flow.expDmg}) · mit 💨 −${flow.dash.dmg} · Haptik beim Schuss [${flow.hit.hapAtFire.join(",")}], beim Treffer [${flow.hit.hapAfter.join(",")}] · kürzester Abstand zweier Schüsse ${flow.gap} s (${flow.n} in 12 s) · FPS 4× ${fps.fps} (p5 ${fps.p5}, ${fps.shots} Geschosse) · Screenshots ${shots.length}`);
  }
}

// ---------- einzeln ausführen ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k)); return a ? a.split("=")[1] : d; };
  const BASE = `http://localhost:${arg("port", 8731)}/`;
  const REF = arg("ref", null) ? `http://localhost:${arg("ref")}/` : null;
  const only = arg("only", null) ? arg("only").split(",") : null;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
  const results = [], errors = [];
  const R = (id, name, pass, value = "") => { results.push({ id, pass: !!pass }); console.log((pass ? "PASS " : "FAIL ") + id.padEnd(5) + " " + name + (value !== "" ? "  → " + value : "")); };
  try { await runV8({ browser, BASE, R, errors, only, REF }); }
  finally { await browser.close(); }
  console.log("Fehler: " + (errors.length ? errors.join(" | ") : 0));
  const pass = results.filter(r => r.pass).length;
  console.log(`${pass}/${results.length} PASS`);
  process.exit(pass === results.length && !errors.length ? 0 : 1);
}
