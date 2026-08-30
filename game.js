/* game.js Teil 1 — Setup, Zustand, Save, Entities, Kampf, Level */
"use strict";
(function () {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  let VW = 0, VH = 0;
  function resize() { VW = window.innerWidth; VH = window.innerHeight; cv.width = VW; cv.height = VH; }
  window.addEventListener("resize", resize); resize();

  const SKINS = ["#7ed957", "#ffb37b", "#7bd0ff", "#ff8ba0", "#c9a0ff", "#ffd75e"];
  const OUTFITS = ["#ff6f91", "#4fc3f7", "#ffd75e", "#8be9a0", "#c9a0ff", "#ff8c42"];
  const SAVE_KEY = "koboldkeller_save_v1";
  const $ = id => document.getElementById(id);

  const S = {
    screen: "menu", map: null, info: null, depth: 0, seed: 12345,
    p: null, ents: [], items: [], cam: { x: 0, y: 0 },
    now: 0, vis: null, toasts: [], bag: [], gold: 0,
    gotoStairs: false, enterPortal: false, pointerHold: false, saveT: 0,
  };
  window.__game = S;

  // ---------------- Spieler ----------------
  function makePlayer(look) {
    return {
      x: 0, y: 0, hp: 6, maxHp: 6, xp: 0, lvl: 1, xpNext: 10,
      speed: 3.4, face: 1, walkT: 0, atkT: 0, hurtT: 0, invulT: 0,
      skin: look.skin, outfit: look.outfit, hair: look.hair,
      name: look.name, blinkT: 0, target: null, foe: null,
      atkCd: 0, potionCount: 3, dashT: 0, dashDx: 0, dashDy: 0,
      spellT: 0, stairHover: 0,
    };
  }

  // ---------------- Save/Load ----------------
  function save() {
    try {
      const p = S.p;
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        look: S.look, depth: S.depth, hp: p.hp, maxHp: p.maxHp,
        xp: p.xp, lvl: p.lvl, xpNext: p.xpNext,
        gold: S.gold, bag: S.bag, potionCount: p.potionCount, seed: S.seed,
      }));
      const n = $("saveNote");
      if (n) { n.style.opacity = "1"; setTimeout(() => { n.style.opacity = "0.45"; }, 900); }
    } catch (e) { }
  }
  function loadSave() {
    try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

  // ---------------- Toasts ----------------
  function toast(msg) { S.toasts.push({ msg }); if (S.toasts.length > 3) S.toasts.shift(); renderToasts(); }
  function renderToasts() {
    $("toasts").innerHTML = S.toasts.map(t => '<div class="toast">' + t.msg + "</div>").join("");
    if (S.toasts.length) setTimeout(() => { S.toasts.shift(); renderToasts(); }, 2600);
  }

  // ---------------- Entities ----------------
  function makeEnt(type, x, y, depth) {
    const base = {
      wichtel: { hp: 2 + Math.floor(depth * 0.6), dmg: 1, speed: 1.5, xp: 3, scale: 1 },
      slime: { hp: 3 + Math.floor(depth * 0.8), dmg: 1, speed: 1.1, xp: 4, scale: 1 },
      bat: { hp: 2 + Math.floor(depth * 0.5), dmg: 1, speed: 2.2, xp: 4, scale: 1 },
      wisp: { hp: 4 + Math.floor(depth * 0.6), dmg: 1, speed: 1.3, xp: 6, scale: 1 },
      boss: { hp: 18 + depth * 4, dmg: 2, speed: 1.4, xp: 30, scale: 1.5 },
    }[type];
    return {
      type, x, y, hp: base.hp, maxHp: base.hp, dmg: base.dmg, speed: base.speed,
      xp: base.xp, scale: base.scale, walkT: Math.random() * 6, face: 1,
      hurtT: 0, atkT: 0, atkCd: 0, seed: Math.random() * 7,
      homeX: x, homeY: y, tx: x, ty: y, tState: Math.random() * 2,
    };
  }

  // ---------------- XP / Level ----------------
  function gainXp(n) {
    const p = S.p;
    p.xp += n;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.lvl++; p.xpNext = Math.floor(p.xpNext * 1.4) + 4;
      p.maxHp++; p.hp = p.maxHp;
      toast("⭐ Level " + p.lvl + "! ❤️+1");
      SFX.levelup();
      Particles.spawn(p.x, p.y, "#8be9a0", 22, 0.6, 1.5);
    }
  }

  // ---------------- Loot ----------------
  function dropLoot(x, y, isBoss) {
    let n = isBoss ? 6 : (Math.random() < 0.5 ? 2 : Math.random() < 0.75 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      S.items.push({ kind: "coin", x: x + (Math.random() - 0.5) * 0.8, y: y + (Math.random() - 0.5) * 0.8, seed: Math.random() * 7 });
    }
    if (isBoss || Math.random() < 0.08) {
      S.items.push({ kind: "potion", x: x + (Math.random() - 0.5) * 0.6, y: y + (Math.random() - 0.5) * 0.6, seed: Math.random() * 7 });
    }
    if (isBoss) { S.items.push({ kind: "mushroom", x: x + 0.4, y: y + 0.4, seed: 1 }); S.items.push({ kind: "mushroom", x: x - 0.4, y: y - 0.4, seed: 2 }); }
    if (Math.random() < 0.05) {
      S.items.push({ kind: "mushroom", x: x + (Math.random() - 0.5) * 0.6, y: y + (Math.random() - 0.5) * 0.6, seed: Math.random() * 7 });
    }
  }

  // ---------------- Kampf ----------------
  function playerAttack() {
    const p = S.p;
    if (!p || S.screen !== "play" || p.atkCd > 0) return;
    p.atkT = 0.001; p.atkCd = 0.45;
    SFX.swing();
    setTimeout(() => {
      if (S.screen !== "play") return;
      for (const e of [...S.ents]) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        const aim = (e.x - p.x) * (p.face || 1);
        if (d < 1.5 && aim > -0.4) {
          hurtEnt(e, 1 + Math.floor(p.lvl / 3));
        }
      }
    }, 130);
  }
  function castBubbles() {
    const p = S.p;
    if (!p || S.screen !== "play" || p.atkCd > 0) return;
    p.atkT = 0.001; p.atkCd = 0.7;
    SFX.portal();
    Particles.spawn(p.x, p.y, "#7bd0ff", 14, 0.8, 0.8);
    setTimeout(() => {
      if (S.screen !== "play") return;
      for (const e of [...S.ents]) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 2.4) {
          hurtEnt(e, 2 + Math.floor(p.lvl / 3));
          Particles.spawn(e.x, e.y, "#7bd0ff", 8, 0.5, 0.6);
        }
      }
      SFX.hit();
    }, 180);
  }
  function castDash() {
    const p = S.p;
    if (!p || S.screen !== "play" || p.dashT > 0) return;
    p.dashT = 0.22; p.dashDx = p.face; p.dashDy = 0;
    SFX.portal();
    Particles.spawn(p.x, p.y, "#e6d5ff", 10, 0.4, 0.4);
  }
  function hurtEnt(e, dmg) {
    e.hp -= dmg; e.hurtT = 0.35;
    SFX.hit();
    Particles.spawn(e.x, e.y, "#fff3b0", 8, 0.4, 0.8);
    if (e.hp <= 0) killEnt(e);
  }
  function killEnt(e) {
    const i = S.ents.indexOf(e);
    if (i >= 0) S.ents.splice(i, 1);
    Particles.spawn(e.x, e.y, e.type === "boss" ? "#c9a0ff" : "#ffd0d8", e.type === "boss" ? 34 : 14, 0.6, 1.2);
    dropLoot(e.x, e.y, e.type === "boss");
    gainXp(e.xp);
    if (e.type === "boss") { toast("👑 Boss besiegt!"); SFX.levelup(); }
    const p = S.p;
    if (p && p.foe === e) p.foe = null;
  }
  function playerHurt(dmg) {
    const p = S.p;
    if (!p || p.invulT > 0 || S.screen !== "play") return;
    p.hp -= dmg; p.hurtT = 0.4; p.invulT = 1.0;
    SFX.hurt();
    Particles.spawn(p.x, p.y, "#ff5d73", 10, 0.4, 1);
    if (p.hp <= 0) {
      SFX.die();
      toast("💀 Oh nein! Aber Kobolde sind zäh …");
      setTimeout(() => {
        p.hp = p.maxHp; p.potionCount = Math.max(1, p.potionCount);
        buildLevel(0); S.screen = "play";
        toast("🏠 Zurück in der Stadt!");
        save();
      }, 1100);
      S.screen = "dead";
    }
  }
  function usePotion() {
    const p = S.p;
    if (!p || S.screen !== "play" || p.potionCount <= 0 || p.hp >= p.maxHp) return;
    p.potionCount--;
    p.hp = Math.min(p.maxHp, p.hp + 2);
    SFX.potion();
    Particles.spawn(p.x, p.y, "#ff8ba0", 12, 0.5, 1);
    toast("🧪 Glücklich!");
  }

  // ---------------- Levelbau ----------------
  function freeSpot(map, rnd) {
    for (let i = 0; i < 140; i++) {
      const x = 2 + Math.floor(rnd() * (map.w - 4));
      const y = 2 + Math.floor(rnd() * (map.h - 4));
      if (!map.rows[y][x].blocked) return { x: x + 0.5, y: y + 0.5 };
    }
    return null;
  }
  function buildLevel(depth) {
    S.depth = depth;
    S.toasts = []; renderToasts();
    const rnd = W.rng((S.seed | 0) + depth * 7717);
    const map = W.makeMap(40, 40);
    const info = depth === 0 ? W.buildTown(map, rnd) : W.buildDungeon(map, rnd, depth);
    S.map = map; S.info = info;
    S.ents = []; S.items = [];
    if (depth > 0) {
      const count = 6 + Math.min(12, depth);
      for (let i = 0; i < count; i++) {
        const spot = freeSpot(map, rnd);
        if (!spot) break;
        const r = rnd();
        const type = r < 0.4 ? "wichtel" : r < 0.62 ? "slime" : r < 0.84 ? "bat" : "wisp";
        S.ents.push(makeEnt(type, spot.x, spot.y, depth));
      }
      // Pilze als Bodenloot
      for (let i = 0; i < 5; i++) {
        const spot = freeSpot(map, rnd);
        if (spot) S.items.push({ kind: "mushroom", x: spot.x, y: spot.y, seed: Math.random() * 7 });
      }
    }
    for (let i = 0; i < 7 + depth * 2; i++) {
      const spot = freeSpot(map, rnd);
      if (spot) S.items.push({ kind: "coin", x: spot.x, y: spot.y, seed: Math.random() * 7 });
    }
    if (info.fountain) {
      const f = info.fountain; // Brunnenzone freihalten
      S.ents = S.ents.filter(e => Math.hypot(e.x - f.x, e.y - f.y) > 2.5);
    }
    const p = S.p;
    p.x = info.entry.x; p.y = info.entry.y;
    p.target = null; p.foe = null;
    SFX.stairs();
    toast(depth === 0 ? "🏠 Willkommen zu Hause!" : "🕳️ Ebene " + depth + (depth >= 4 && depth % 4 === 0 ? " — der Boss-Kobold wartet!" : ""));
  }
  function descend() { if (S.depth < 20) { buildLevel(S.depth + 1); save(); } }
  function goTown() { buildLevel(0); save(); }  // ---------------- Eingabe ----------------
  const keys = {};
  window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (e.code === "KeyI") toggleBag();
    if (e.code === "KeyR") usePotion();
    if (e.code === "Digit1") playerAttack();
    if (e.code === "Digit2") castBubbles();
    if (e.code === "Digit3") castDash();
    if (e.code === "Escape") {
      if (S.screen === "play") { S.screen = "pause"; $("pauseMenu").classList.remove("hidden"); }
      else if (S.screen === "pause") { S.screen = "play"; $("pauseMenu").classList.add("hidden"); }
    }
  });
  window.addEventListener("keyup", e => { keys[e.code] = false; });

  let aim = { x: 0, y: 0 };
  cv.addEventListener("pointermove", e => { aim.x = e.clientX; aim.y = e.clientY; });
  cv.addEventListener("pointerdown", e => {
    SFX.resume(); aim.x = e.clientX; aim.y = e.clientY;
    handleTap(e.clientX, e.clientY);
  });
  cv.addEventListener("pointerup", e => { S.pointerHold = false; });

  function handleTap(sx, sy) {
    if (S.screen !== "play") return;
    const w = W.unproj(sx, sy, S.cam.x, S.cam.y);
    let best = null, bestD = 1.1;
    for (const e of S.ents) {
      const d = Math.hypot(e.x - w.x, e.y - w.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    const p = S.p;
    if (best) { p.foe = best; p.target = { x: best.x, y: best.y }; return; }
    if (S.info.stairs && Math.hypot(S.info.stairs.x - w.x, S.info.stairs.y - w.y) < 1.4) {
      p.target = { x: S.info.stairs.x, y: S.info.stairs.y }; S.gotoStairs = true; return;
    }
    if (S.info.portal && Math.hypot(S.info.portal.x - w.x, S.info.portal.y - w.y) < 1.4) {
      p.target = { x: S.info.portal.x, y: S.info.portal.y }; S.enterPortal = true; return;
    }
    p.foe = null; S.gotoStairs = false; S.enterPortal = false;
    let tx = w.x, ty = w.y;
    // Ziel in Wand? → aufs nächste freie Feld daneben umbiegen
    const tcx = Math.max(0, Math.min(S.map.w - 1, Math.floor(tx)));
    const tcy = Math.max(0, Math.min(S.map.h - 1, Math.floor(ty)));
    if (S.map.rows[tcy][tcx].blocked) {
      const spot = nearestFreeSpot(tx, ty);
      if (spot) { tx = spot.x; ty = spot.y; }
    }
    p.target = { x: tx, y: ty };
  }

  // ---------------- Menüs ----------------
  function toggleBag() {
    const b = $("bag");
    if (b.classList.contains("hidden")) {
      if (S.screen !== "play") return;
      S.screen = "bag";
      const p = S.p;
      let html = "🧪 Tränke: " + p.potionCount + "/3<br><br>";
      if (S.gold) html += "🪙 " + S.gold + " Glitzermünzen<br>";
      const shroom = S.bag.filter(i => i.kind === "mushroom").length;
      if (shroom) html += "🍄 Glitzerpilze: " + shroom + "<br>";
      html += "<br><i>Kleine Pilze heilen sofort beim Aufsammeln!</i>";
      $("bagList").innerHTML = html;
      b.classList.remove("hidden");
    } else { b.classList.add("hidden"); S.screen = "play"; }
  }

  let selLook = 0;
  function initMenu() {
    const looks = $("looks");
    looks.innerHTML = "";
    SKINS.forEach((sk, i) => {
      const div = document.createElement("div");
      div.className = "look" + (i === 0 ? " sel" : "");
      div.dataset.i = i;
      const c = document.createElement("canvas");
      c.width = 70; c.height = 74;
      const cc = c.getContext("2d");
      Art.drawChibi(cc, 35, 68, 40, { skin: sk, outfit: OUTFITS[i], hair: "#5b3a29" });
      div.appendChild(c);
      looks.appendChild(div);
    });
    looks.addEventListener("click", e => {
      const div = e.target.closest(".look");
      if (!div) return;
      looks.children[selLook].classList.remove("sel");
      div.classList.add("sel");
      selLook = +div.dataset.i;
      SFX.coin();
    });
    $("btnNew").addEventListener("click", () => {
      clearSave();
      const name = ($("nameInput").value || "Kobold").trim().slice(0, 12);
      S.look = { skin: SKINS[selLook], outfit: OUTFITS[selLook], hair: "#5b3a29", name: name };
      S.p = makePlayer(S.look);
      S.gold = 0; S.bag = [];
      S.seed = (Math.random() * 1e9) | 0;
      buildLevel(0);
      S.screen = "play";
      $("startMenu").classList.add("hidden");
      SFX.resume(); SFX.coin();
    });
    const sv = loadSave();
    if (sv && sv.look && sv.look.skin) {
      $("btnCont").classList.remove("hidden");
      $("btnCont").addEventListener("click", () => {
        S.look = sv.look;
        S.p = makePlayer(sv.look);
        S.p.hp = sv.hp; S.p.maxHp = sv.maxHp || 6;
        S.p.xp = sv.xp || 0; S.p.lvl = sv.lvl || 1; S.p.xpNext = sv.xpNext || 10;
        S.p.potionCount = (sv.potionCount === undefined) ? 3 : sv.potionCount;
        S.gold = sv.gold || 0; S.bag = sv.bag || []; S.seed = sv.seed || 12345;
        buildLevel(sv.depth || 0);
        S.screen = "play";
        $("startMenu").classList.add("hidden");
        SFX.resume();
      });
    }
    $("btnResume").addEventListener("click", () => { S.screen = "play"; $("pauseMenu").classList.add("hidden"); });
    $("btnTown").addEventListener("click", () => { $("pauseMenu").classList.add("hidden"); goTown(); S.screen = "play"; });
    $("btnBagClose").addEventListener("click", toggleBag);
    $("muteBtn").addEventListener("click", () => {
      SFX.setMuted(!SFX.isMuted());
      $("muteBtn").textContent = SFX.isMuted() ? "🔇" : "🔊";
    });
    $("pauseBtn").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); });
    $("pauseBtn").addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      if (S.screen === "play") { S.screen = "pause"; $("pauseMenu").classList.remove("hidden"); }
      else if (S.screen === "pause") { S.screen = "play"; $("pauseMenu").classList.add("hidden"); }
    });
  }

  // ---------------- Skillbar (Touch) ----------------
  function buildSkillbar() {
    const el = $("skills");
    const defs = [
      { a: "atk", icon: "⚔️", key: "1" },
      { a: "bub", icon: "🫧", key: "2" },
      { a: "dash", icon: "💨", key: "3" },
      { a: "pot", icon: "🧪", key: "R" },
      { a: "bag", icon: "🎒", key: "I" },
    ];
    el.innerHTML = defs.map(d =>
      '<div class="skillBtn" data-a="' + d.a + '">' + d.icon +
      '<span class="key">' + d.key + "</span><div class='cool'></div></div>").join("");
    el.addEventListener("pointerdown", e => {
      const btn = e.target.closest(".skillBtn");
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      SFX.resume();
      const a = btn.dataset.a;
      if (a === "atk") playerAttack();
      else if (a === "bub") castBubbles();
      else if (a === "dash") castDash();
      else if (a === "pot") usePotion();
      else if (a === "bag") toggleBag();
    });
  }
  function updateSkillbar() {
    const p = S.p;
    if (!p) return;
    const btns = $("skills").children;
    for (const b of btns) {
      const cool = b.querySelector(".cool");
      if (!cool) continue;
      let frac = 0;
      if (b.dataset.a === "atk" || b.dataset.a === "bub") frac = Math.max(0, p.atkCd / 0.7);
      if (b.dataset.a === "pot") frac = p.potionCount > 0 ? 0 : 1;
      cool.style.height = (frac * 100) + "%";
 b.classList.toggle("cd", frac >= 0.99);
    }
  }

  // ---------------- Haupt-Loop ----------------
  function cellFree(x, y) {
    const cx = Math.max(0, Math.min(S.map.w - 1, Math.floor(x)));
    const cy = Math.max(0, Math.min(S.map.h - 1, Math.floor(y)));
    return !S.map.rows[cy][cx].blocked;
  }
  function nearestFreeSpot(x, y) {
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (cellFree(x + dx, y + dy)) return { x: x + dx + 0.5, y: y + dy + 0.5 };
        }
      }
    }
    return null;
  }
  let stepAcc = 0;
  function step(dt) {
    S.now += dt;
    const p = S.p;
    if (!p || S.screen !== "play") return;

    // --- Auto-Befreiung: Wer in einer Wand steckt, wird sanft aufs freie Feld geschoben ---
    if (!cellFree(p.x, p.y)) {
      const spot = nearestFreeSpot(p.x, p.y);
      if (spot) {
        p.x = spot.x; p.y = spot.y;
        p.target = null; p.foe = null;
        Particles.spawn(p.x, p.y, "#e6d5ff", 10, 0.5, 1);
      }
    }

    // --- Bewegungsziel ---
    let mvx = 0, mvy = 0;
    if (keys.KeyW || keys.ArrowUp) mvy -= 1;
    if (keys.KeyS || keys.ArrowDown) mvy += 1;
    if (keys.KeyA || keys.ArrowLeft) mvx -= 1;
    if (keys.KeyD || keys.ArrowRight) mvx += 1;

    if (p.dashT > 0) {
      p.dashT -= dt;
      mvx = p.dashDx * 3.2; mvy = p.dashDy * 3.2;
    } else if (mvx || mvy) {
      p.target = null; p.foe = null; S.gotoStairs = false;
      const l = Math.hypot(mvx, mvy);
      mvx /= l; mvy /= l;
    } else if (p.foe) {
      const d = Math.hypot(p.foe.x - p.x, p.foe.y - p.y);
      if (d < 1.15) {
        mvx = mvy = 0;
        if (p.atkCd <= 0) {
          p.face = p.foe.x >= p.x ? 1 : -1;
          playerAttack();
        }
      } else { mvx = (p.foe.x - p.x) / d; mvy = (p.foe.y - p.y) / d; }
    } else if (p.target) {
      const d = Math.hypot(p.target.x - p.x, p.target.y - p.y);
      if (d < 0.12) p.target = null;
      else { mvx = (p.target.x - p.x) / d; mvy = (p.target.y - p.y) / d; }
    }

    // --- Kollision & Move ---
    if (mvx || mvy) {
      const nx = p.x + mvx * p.speed * dt;
      const ny = p.y + mvy * p.speed * dt;
      // Kollisions-Prüfung pro Achse: X-Schritt prüft X-Ziel, Y-Schritt prüft Y-Ziel
      const canX = mvy !== 0 ? false : cellFree(nx, p.y);
      const canY = mvx !== 0 ? false : cellFree(p.x, ny);
      const cellFreeBoth = cellFree(nx, ny);
      if (mvy !== 0 && mvx !== 0) {
        // Diagonal: beide Achsen einzeln frei?
        if (cellFree(nx, p.y)) p.x = nx;
        if (cellFree(p.x, ny)) p.y = ny;
      } else if (cellFreeBoth) {
        p.x = nx; p.y = ny;
      } else {
        if (mvy === 0 && canX) p.x = nx;
        if (mvx === 0 && canY) p.y = ny;
      }
      if (mvx) p.face = mvx > 0 ? 1 : -1;
      p.walkT += dt * 2.6;
      if (Math.random() < dt * 2.2) SFX.step();
    } else p.walkT = 0;

    p.atkCd = Math.max(0, p.atkCd - dt);
    p.atkT = p.atkT > 0 ? (p.atkT + dt / 0.3 >= 1 ? 0 : p.atkT + dt / 0.3) : 0;
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.invulT = Math.max(0, p.invulT - dt);
    p.blinkT -= dt;
    if (p.blinkT < -3 && Math.random() < dt * 0.4) p.blinkT = 0.15;
    if (p.blinkT > 0) p.blinkT -= 0;
    let bl = p.blinkT;
    p.blinkShow = bl > 0;

    // --- Stairs/Portal-Check beim Ankommen ---
    if (S.gotoStairs && p.target && S.info.stairs) {
      if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 0.5 || Math.hypot(S.info.stairs.x - p.x, S.info.stairs.y - p.y) < 0.6) {
        S.gotoStairs = false; p.target = null;
        descend();
      }
    }
    if (S.enterPortal && p.target && S.info.portal) {
      if (Math.hypot(S.info.portal.x - p.x, S.info.portal.y - p.y) < 0.7) {
        S.enterPortal = false; p.target = null;
        $("pauseMenu").classList.remove("hidden");
        S.screen = "pause";
        toast("🕳️ Wähle: Keller oder Stadt!");
      }
    }

    // --- Items einsammeln ---
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i];
      if (Math.hypot(it.x - p.x, it.y - p.y) < 0.55) {
        if (it.kind === "coin") { S.gold++; SFX.coin(); Particles.spawn(it.x, it.y, "#ffd75e", 6, 0.3, 0.8); }
        else if (it.kind === "mushroom") {
          if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + 1); toast("🍄 +1 ❤️"); }
          else { S.bag.push(it); toast("🍄 Glitzerpilz eingesackt!"); }
          SFX.loot();
        }
        else if (it.kind === "potion") { p.potionCount = Math.min(3, p.potionCount + 1); SFX.loot(); toast("🧪 Trank gefunden!"); }
        S.items.splice(i, 1);
      }
    }

    // --- Gegner-KI ---
    for (const e of S.ents) {
      e.walkT += dt * 2;
      e.hurtT = Math.max(0, e.hurtT - dt);
      e.atkCd = Math.max(0, e.atkCd - dt);
      const pd = Math.hypot(p.x - e.x, p.y - e.y);
      if (pd < 4.2 && S.depth > 0) {
        // verfolgen
        if (pd > 0.9) {
          const nx = e.x + (p.x - e.x) / pd * e.speed * dt;
          const ny = e.y + (p.y - e.y) / pd * e.speed * dt;
          const cell = S.map.rows[Math.max(0, Math.min(S.map.h - 1, Math.floor(ny)))][Math.max(0, Math.min(S.map.w - 1, Math.floor(nx)))];
          if (!cell.blocked) { e.x = nx; e.y = ny; }
          e.face = p.x >= e.x ? 1 : -1;
        } else if (e.atkCd <= 0) {
          e.atkT = 0.001; e.atkCd = 1.1;
          setTimeout(() => { if (S.ents.includes(e)) playerHurt(e.dmg); }, 260);
        }
      } else {
        // umherwandern
        e.tState -= dt;
        if (e.tState <= 0) {
          e.tState = 1.5 + Math.random() * 2.5;
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * 1.8;
          e.tx = e.homeX + Math.cos(ang) * dist;
          e.ty = e.homeY + Math.sin(ang) * dist;
        }
        const td = Math.hypot(e.tx - e.x, e.ty - e.y);
        if (td > 0.1) {
          const nx = e.x + (e.tx - e.x) / td * e.speed * 0.55 * dt;
          const ny = e.y + (e.ty - e.y) / td * e.speed * 0.55 * dt;
          const cell = S.map.rows[Math.max(0, Math.min(S.map.h - 1, Math.floor(ny)))][Math.max(0, Math.min(S.map.w - 1, Math.floor(nx)))];
          if (!cell.blocked) { e.x = nx; e.y = ny; }
          e.face = e.tx >= e.x ? 1 : -1;
        }
      }
      e.atkT = e.atkT > 0 ? (e.atkT + dt / 0.3 >= 1 ? 0 : e.atkT + dt / 0.3) : 0;
    }

    // --- Boss-Spawn ---
    if (S.depth >= 4 && S.depth % 4 === 0 && !S.bossSpawned) {
      const spot = S.info.stairs || freeSpot(S.map, W.rng(99));
      if (spot) {
        const boss = makeEnt("boss", spot.x + 0.8, spot.y + 0.8, S.depth);
        S.ents.push(boss);
        toast("👑 Der Boss-Kobold knurrt!");
        SFX.boss();
      }
      S.bossSpawned = true;
    }

    Particles.step(dt);
    autosave(dt);
  }

  function autosave(dt) {
    S.saveT -= dt;
    if (S.saveT <= 0) { S.saveT = 10; save(); }
  }

  // ---------------- Kamera & Render ----------------
  function render() {
    const p = S.p;
    if (!p) { ctx.fillStyle = "#1a1030"; ctx.fillRect(0, 0, VW, VH); return; }
    const tx = W.isoX(p.x, p.y) - VW / 2;
    const ty = W.isoY(p.x, p.y) - VH / 2;
    S.cam.x += (tx - S.cam.x) * 0.12;
    S.cam.y += (ty - S.cam.y) * 0.12;
    // Sichtfeld aktualisieren
    S.visT -= 1;
    if (S.visT <= 0) { S.visT = 6; S.vis = W.visField(S.map, p.x, p.y, S.depth === 0 ? 9 : 6.5); }
    R.drawScene(ctx, {
      map: S.map, info: S.info, depth: S.depth, px: p.x, py: p.y,
      ents: S.ents, items: S.items, cam: S.cam, now: S.now, vis: S.vis,
      vw: VW, vh: VH, p,
    });
    if (S.screen === "play") { drawHud(); updateSkillbar(); }
  }
  function drawHud() {
    const p = S.p;
    const hearts = [];
    for (let i = 0; i < p.maxHp; i++) hearts.push('<span class="' + (i < p.hp ? "" : "empty") + '">❤️</span>');
    $("hearts").innerHTML = hearts.join("");
    $("xpFill").style.width = Math.min(100, p.xp / p.xpNext * 100) + "%";
    $("lvlBadge").textContent = "⭐ Lv " + p.lvl;
    $("goldBadge").textContent = "🪙 " + S.gold;
    $("depthBadge").textContent = S.depth === 0 ? "🏠 Stadt" : "🕳️ Ebene " + S.depth;
  }

  // ---------------- rAF ----------------
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    window.__frames++;
    step(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------------- Boot ----------------
  initMenu();
  buildSkillbar();
  window.KK = {
    start: (skinIdx) => { $("btnNew").click(); },
    attack: playerAttack, bubbles: castBubbles, dash: castDash, potion: usePotion,
    descend: () => descend(),
    state: () => ({ depth: S.depth, hp: S.p && S.p.hp, ents: S.ents.length, gold: S.gold, screen: S.screen }),
    errors: () => window.__errors,
  };
  requestAnimationFrame(frame);
})();