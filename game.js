/* game.js Teil 1 — Setup, Zustand, Save, Entities, Kampf, Level */
"use strict";
(function () {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  let VW = 0, VH = 0;
  function resize() { VW = window.innerWidth; VH = window.innerHeight; cv.width = VW; cv.height = VH; }
  window.addEventListener("resize", resize); resize();

  // 6 putzige Tier-Figuren (2 Reihen à 3 im Menü)
  const PETS = [
    { id: "kobold", name: "Kobold", skin: "#7ed957", outfit: "#ff6f91", hair: "#5b3a29" },
    { id: "baer", name: "Bär", skin: "#c98d5a", outfit: "#5f7fd9", hair: "#8a5a33" },
    { id: "hase", name: "Hase", skin: "#f3ead9", outfit: "#ffd75e", hair: "#e8d9c0" },
    { id: "tintenfisch", name: "Tintenfisch", skin: "#b48be8", outfit: "#4fc3f7", hair: "#8a5fc0" },
    { id: "panda", name: "Roter Panda", skin: "#e8734a", outfit: "#7ed957", hair: "#7a3b22" },
    { id: "katze", name: "Katze", skin: "#f0a35e", outfit: "#ff6f91", hair: "#b06a2c" },
  ];
  const NAMES = ["Knuffel", "Wichtel-Willy", "Glitzer-Emma", "Pupsi", "Krümel", "Flauschi", "Kobbi", "Zuckerkaefer", "Mopsi", "Wackel", "Brummi", "Schmusebacke", "Pünktchen", "Knorpf", "Tapsi", "Blubber"];
  const SAVE_KEY = "koboldkeller_save_v1";
  const KK_HH_KEY = "koboldkeller_hall_v1";  // Ehrenhall: Bestlisten aller Siege
  // MEGASCHWER-Modus: alle Gegner doppelt so schnell UND 10× Schaden
  const MEGA_MULT = { speed: 2, dmg: 10 };
  const $ = id => document.getElementById(id);

  const S = {
    screen: "menu", map: null, info: null, depth: 0, seed: 12345,
    p: null, ents: [], items: [], projectiles: [], cam: { x: 0, y: 0 },
    now: 0, vis: null, toasts: [], bag: [], gold: 0,
    gotoStairs: false, enterPortal: false, pointerHold: false, saveT: 0,
    runSecs: 0, winQueued: false,
  };
  window.__game = S;

  // ---------------- Spieler ----------------
  function makePlayer(look) {
    return {
      x: 0, y: 0, hp: 6, maxHp: 6, xp: 0, lvl: 1, xpNext: 10,
      speed: 3.4, face: 1, walkT: 0, atkT: 0, hurtT: 0, invulT: 0,
      skin: look.skin, outfit: look.outfit, hair: look.hair,
      species: look.species || "kobold",
      name: look.name, blinkT: 0, target: null, foe: null,
      atkCd: 0, potionCount: 3, dashT: 0, dashDx: 0, dashDy: 0,
      spellT: 0, stairHover: 0,
      atk: 2,        // Melee-Schaden (Grundstärke verdoppelt — Kinder-Wunsch)
      projN: 1,      // Anzahl Seifenblasen (wächst durch Stab-Upgrades), feuern in Fächer
      magic: 1,      // Projektil-Schaden (wächst durch Zauber-Upgrades)
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
        atk: p.atk, projN: p.projN, magic: p.magic,      // Waffen-Upgrades bleiben erhalten
        deepest: S.deepest || 1,                          // tiefste erreichte Ebene (für Schnell-Einstieg)
        mega: !!S.mega,                                   // MEGASCHWER-Modus bleibt gewählt
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
  function toast(msg) {
    S.toasts.push({ msg });
    if (S.toasts.length > 3) S.toasts.shift();
    renderToasts();
    setTimeout(() => {
      const i = S.toasts.findIndex(t => t.msg === msg);
      if (i >= 0) { S.toasts.splice(i, 1); renderToasts(); }
    }, 2600);
  }
  function renderToasts() {
    $("toasts").innerHTML = S.toasts.map(t => '<div class="toast">' + t.msg + "</div>").join("");
  }

  // ---------------- Entities ----------------
  function makeEnt(type, x, y, depth) {
    // Skalierung: Tiefe + Spieler-Level (der Kobold wird stärker, die Keller auch)
    const L = (S.p && S.p.lvl) || 1;
    const dmgUp = Math.floor(depth / 6) + Math.floor(L / 7);  // +1 Schaden pro 6 Ebenen ODER 6 Level
    const mega = !!S.mega;  // MEGASCHWER: Gegner 2× schnell, 10× Schaden
    const base = {
      wichtel: { hp: 2 + Math.floor(depth * 0.9) + Math.floor(L * 0.5), dmg: 1 + dmgUp, speed: 1.5, xp: 3 + depth + L, scale: 1 },
      slime: { hp: 3 + Math.floor(depth * 1.1) + Math.floor(L * 0.6), dmg: 1 + dmgUp, speed: 1.1, xp: 4 + depth + L, scale: 1 },
      bat: { hp: 2 + Math.floor(depth * 0.5) + Math.floor(L * 0.4), dmg: 1 + dmgUp, speed: 1.7, xp: 4 + depth + L, scale: 1 },
      wisp: { hp: 4 + Math.floor(depth * 0.9) + Math.floor(L * 0.5), dmg: 1 + dmgUp, speed: 1.3, xp: 6 + depth * 2 + L, scale: 1 },
      boss: { hp: 18 + depth * 5 + L * 3, dmg: 2 + dmgUp, speed: 1.4, xp: 30 + depth * 8 + L * 5, scale: 1.5 },
    }[type];
    // Ebene 20: der KELLERKÖNIG — RIESIG (2×) und knallrot (SIEG-Boss)
    const isFinal = type === "boss" && depth >= 20;
    const scale = base.scale * (isFinal ? 2.0 : 1);
    const ent = {
      type, x, y, hp: base.hp, maxHp: base.hp,
      dmg: base.dmg * (mega ? MEGA_MULT.dmg : 1),
      speed: base.speed * (mega ? MEGA_MULT.speed : 1),
      xp: base.xp, scale, walkT: Math.random() * 6, face: 1,
      hurtT: 0, atkT: 0, atkCd: 0, seed: Math.random() * 7,
      homeX: x, homeY: y, tx: x, ty: y, tState: Math.random() * 2,
    };
    if (isFinal) { ent.red = true; ent.final = true; ent.name = "Kellerkönig"; }
    return ent;
  }

  // ---------------- XP / Level ----------------
  function gainXp(n) {
    const p = S.p;
    p.xp += n;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.lvl++; p.xpNext = Math.floor(p.xpNext * 1.4) + 4;
      p.maxHp += 2; p.hp = p.maxHp;
      p.atk = (p.atk || 1) + 0.5;   // Schaden pro Schlag wächst
      if (p.lvl % 3 === 0) p.projN = (p.projN || 1) + 1;
      toast("⭐ Level " + p.lvl + "! ❤️+2, ⚔️+0.5" + (p.lvl % 3 === 0 ? ", 🫧+1 Projektil" : ""));
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
    p.atk360 = 0.35; // Rundumschlag-Anzeige (Sichtbarkeit fürs Auge)
    SFX.swing();
    setTimeout(() => {
      if (S.screen !== "play") return;
      for (const e of [...S.ents]) {
        // RUNDUM: jeder Gegner im Umkreis wird getroffen (Radius verdoppelt: 1.5 → 3.0)
        if (Math.hypot(e.x - p.x, e.y - p.y) < (3.0 + (p.atk > 6 ? 0.6 : 0))) {
          hurtEnt(e, p.atk);
        }
      }
    }, 130);
  }
  function castBubbles() {
    const p = S.p;
    if (!p || S.screen !== "play" || p.atkCd > 0) return;
    p.atkT = 0.001; p.atkCd = 0.7;
    SFX.swing();
    // Auto-Aim: nächster Gegner im Radius 6 — sonst fliegt die Seifenblase nach vorn
    let best = null, bestD = 5.5;
    for (const e of S.ents) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    const tx = best ? best.x : p.x + p.face * 4;
    const ty = best ? best.y : p.y;
    const ang = Math.atan2(ty - p.y, tx - p.x);
    // Fächer: mehrere Seifenblasen in mehrere Richtungen (projN, Abstand 0.38 rad)
    const N = p.projN || 1;
    for (let k = 0; k < N; k++) {
      const a = ang + (N > 1 ? (k - (N - 1) / 2) * 0.38 : 0);
      S.projectiles.push({
        x: p.x, y: p.y, vx: Math.cos(a) * 6.5, vy: Math.sin(a) * 6.5,
        life: 1.4, face: p.face, lock: best || null, dmg: p.magic,
      });
    }
  }
  function castDash() {
    const p = S.p;
    if (!p || S.screen !== "play" || p.dashT > 0) return;
    // Dodge: WEG vom nächsten Gegner springen — sonst in Blickrichtung
    let near = null, nd = 6;
    for (const e of S.ents) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nd) { near = e; nd = d; }
    }
    let dx, dy;
    if (near) {
      dx = p.x - near.x; dy = p.y - near.y;
      const l = Math.hypot(dx, dy);
      if (l < 0.05) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); }
      else { dx /= l; dy /= l; }
    } else { dx = p.face; dy = 0; }
    p.dashT = 0.32; p.dashDx = dx; p.dashDy = dy;   // längerer Sprung: ~4.6 Kacheln statt ~2.4
    p.invulT = Math.max(p.invulT, 0.45);            // kurze Unverwundbarkeit während des Ausweichens
    SFX.portal();
    Particles.spawn(p.x, p.y, "#e6d5ff", 14, 0.4, 0.4);
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
    // Goodie-Explosion: Münzen FLIEGEN auseinander und werden vom Magnet eingesammelt
    const nCoins = e.type === "boss" ? 8 : 1 + Math.floor(Math.random() * 3);
    for (let i2 = 0; i2 < nCoins; i2++) {
      const ang = Math.random() * Math.PI * 2;
      const fly = 0.8 + Math.random() * 1.6;
      S.items.push({
        kind: "coin", x: e.x, y: e.y, seed: Math.random() * 7,
        vx: Math.cos(ang) * fly, vy: Math.sin(ang) * fly, flyingT: 0.55,
      });
    }
    if (e.type === "boss" || Math.random() < 0.10) {
      S.items.push({ kind: "potion", x: e.x, y: e.y, seed: Math.random() * 7, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), flyingT: 0.5 });
    }
    if (e.type === "boss") {
      S.items.push({ kind: "mushroom", x: e.x, y: e.y, seed: 1, vx: 1, vy: 0.5, flyingT: 0.6 });
      S.items.push({ kind: "mushroom", x: e.x, y: e.y, seed: 2, vx: -1, vy: -0.5, flyingT: 0.6 });
    } else if (Math.random() < 0.06) {
      S.items.push({ kind: "mushroom", x: e.x, y: e.y, seed: Math.random() * 7, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), flyingT: 0.4 });
    }
    // Waffen-Upgrades: seltene Glitzerbeute — Boss lässt GARANTIERT eins fallen
    const upChance = e.type === "boss" ? 1 : 0.07;
    if (Math.random() < upChance) {
      const r = Math.random();
      const kind = r < 0.38 ? "sword" : r < 0.76 ? "wand" : "gem";
      S.items.push({ kind, x: e.x, y: e.y, seed: Math.random() * 7, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, flyingT: 0.6 });
    }
    gainXp(e.xp);
    if (e.type === "boss") {
      if (e.final) { toast("👑 Der Kellerkönig ist besiegt!"); SFX.boss(); setTimeout(() => winGame("boss"), 1400); }
      else { toast("👑 Boss besiegt!"); SFX.levelup(); }
    }
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
    S.ents = []; S.items = []; S.projectiles = [];
    S.bossSpawned = false;  // Fix: Flag pro Ebene zurücksetzen (sonst nur EIN Boss auf Ebene 4, nie wieder)
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
      // Waffen-Upgrades liegen hin und wieder im Dungeon herum (Ebene 2+)
      const nUp = 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < nUp; i++) {
        const spot = freeSpot(map, rnd);
        if (spot) {
          const r = rnd();
          S.items.push({ kind: r < 0.38 ? "sword" : r < 0.76 ? "wand" : "gem", x: spot.x, y: spot.y, seed: Math.random() * 7 });
        }
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
    SFX.music(depth === 0 ? "town" : "dungeon");
    toast(depth === 0 ? "🏠 Willkommen zu Hause!"
      : depth === 20 ? "🕳️ Ebene 20 — 👑 DER KELLERKÖNIG wartet! Besiege ihn oder fliehe durchs Portal!"
        : "🕳️ Ebene " + depth + (depth >= 4 && depth % 4 === 0 ? " — der Boss-Kobold wartet!" : ""));
    if (depth === 0) S.runSecs = 0;  // Timer läuft nur pro Keller-Lauf
  }
  function descend() {
    if (S.depth < 20) {
      buildLevel(S.depth + 1);
      S.deepest = Math.max(S.deepest || 1, S.depth);
      save();
    } else {
      // Ebene 20 war die Tiefste — durch das 20. Portal = SIEG! 🎉
      winGame("portal");
    }
  }
  // ---------------- Sieges-Bildschirm (2 Bestenlisten nebeneinander) ----------------
  const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  function fmtTime(secs) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return m + ":" + String(s).padStart(2, "0") + " Min";
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function renderWin() {
    const hh = hhLoad();
    const medal = ["🥇", "🥈", "🥉", " 4.", " 5."];
    const rowsOf = function (arr, pick) {
      if (!arr || !arr.length) return "<tr><td colspan='3' style='opacity:.6;padding:6px 0'>— noch keine Einträge —</td></tr>";
      let out = "";
      arr.slice(0, 5).forEach((r, i) => {
        const d = new Date(r.ts || Date.now());
        out += "<tr><td style='text-align:right;padding-right:7px;white-space:nowrap;opacity:.85'>" + medal[i] +
          "</td><td style='text-align:left'><b>" + esc(r.name) + "</b>" +
          "<br><span style='opacity:.55;font-size:11px'>" + WEEKDAYS[d.getDay()] + " " +
          d.toLocaleDateString("de-AT") + (r.mega ? " 🔥" : "") + "</span></td>" +
          "<td style='text-align:right;white-space:nowrap'><b style='font-size:16px'>" + pick(r) + "</b></td></tr>";
      });
      return out;
    };
    const tbl = (title, rows) =>
      '<div style="flex:1;min-width:190px;background:rgba(0,0,0,.28);border:2px solid rgba(255,215,94,.35);' +
      'border-radius:16px;padding:10px 12px;text-align:center">' +
      '<div style="font-size:15px;font-weight:800;margin-bottom:6px">' + title + "</div>" +
      '<table style="width:100%;border-collapse:collapse;font-size:14px;color:#f3ecff"><tbody>' + rows + "</tbody></table></div>";
    const when = new Date().toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" });
    const p = S.p;
    const stats =
      "<p style='margin-top:6px'>" + esc((S.look && S.look.name) || "Kobold") +
      " bezwang den Kellerkönig · ⭐ Level " + (p ? p.lvl : 1) +
      " · 🪙 " + S.gold + " · ⏱️ " + fmtTime(Math.round(S.runSecs)) +
      (S.mega ? " · 🔥 MEGASCHWER" : "") + "</p>" +
      "<p style='font-size:14px;opacity:.8;margin-top:2px'>Besiegt am " + when + "</p>";
    const winMenu = $("winMenu");
    if (!winMenu) return;
    $("winStats").innerHTML = stats;
    $("hhGold").innerHTML = tbl("🪙 Meiste Münzen", rowsOf(hh.gold, r => r.gold + " 🪙"));
    $("hhTime").innerHTML = tbl("⏱️ Schnellster Durchlauf", rowsOf(hh.time, r => fmtTime(r.secs)));
    winMenu.classList.remove("hidden");
  }
  // ---------------- SIEG! 🏆 ----------------
  function hhLoad() {
    try { return JSON.parse(localStorage.getItem(KK_HH_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function hhSave(hh) {
    try { localStorage.setItem(KK_HH_KEY, JSON.stringify(hh)); } catch (e) { }
  }
  function winGame(how) {
    if (S.winQueued) return;
    S.winQueued = true;
    S.screen = "win";
    const p = S.p;
    const rec = {
      name: (S.look && S.look.name) || "Kobold",
      look: S.look, gold: S.gold, lvl: p ? p.lvl : 1,
      mega: !!S.mega, secs: Math.round(S.runSecs),
      ts: Date.now(), how: how === "portal" ? "portal" : "boss",
    };
    const hh = hhLoad();
    hh.gold = hh.gold || []; hh.time = hh.time || [];
    hh.gold.push(rec); hh.time.push(rec);
    hh.gold.sort((a, b) => b.gold - a.gold); hh.gold = hh.gold.slice(0, 5);
    hh.time.sort((a, b) => a.secs - b.secs); hh.time = hh.time.slice(0, 5);
    try { hhSave(hh); } catch (e) { }
    // Der Sieg bleibt erhalten — Spielstand wandert in den Ehrenhall
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) { const sv = JSON.parse(raw); sv.won = true; localStorage.setItem(KK_HH_KEY, JSON.stringify(hh)); localStorage.setItem(SAVE_KEY, JSON.stringify(sv)); }
    } catch (e) { }
    renderWin();
    try { SFX.stopMusic(); } catch (e) { }
    try { SFX.victory(); } catch (e) { }
    Particles.spawn(p ? p.x : 10, p ? p.y : 10, "#ffd75e", 40, 1.2, 2);
  }
  window.KK_winGame = winGame;  // Test-Hook
  function goTown() { buildLevel(0); save(); }
  // ---------------- Keller-Tiefe wählen (Diablo-Ärger-Heiler) ----------------
  function openAscendMenu() {
    S.screen = "depth";
    const box = $("depthBtns");
    const deepest = S.deepest || 1;
    const btns = [];
    // Ebene 1 immer; dazu max. 5 Stufenraster bis deepest (1, 4, 7, 10, 13 …)
    const picks = [];
    for (let d = 1; d <= deepest; d += 3) picks.push(d);
    if (picks[picks.length - 1] !== deepest) picks.push(deepest);
    for (const d of picks) {
      btns.push('<button class="bigBtn" data-depth="' + d + '">' +
        (d === 1 ? "🪜 Von oben (Ebene 1)" : "🕳️ Ebene " + d) +
        (d % 4 === 0 ? " 👑" : "") + '</button>');
    }
    box.innerHTML = btns.join("");
    box.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        const d = parseInt(b.getAttribute("data-depth"), 10);
        $("depthMenu").classList.add("hidden");
        S.screen = "play";
        buildLevel(d);
        S.deepest = Math.max(deepest, d);
        save();
      });
    });
    $("depthMenu").classList.remove("hidden");
    S.screen = "depth";
  }

  // ---------------- Wegfindung (BFS durch die Gänge) ----------------
  function findPath(sx, sy, tx, ty) {
    const { w, h, rows } = S.map;
    const clamp = v => Math.max(0, Math.min(w - 1, v));
    const scx = Math.max(0, Math.min(w - 1, Math.floor(sx)));
    const scy = Math.max(0, Math.min(h - 1, Math.floor(sy)));
    const tcx = Math.max(0, Math.min(w - 1, Math.floor(tx)));
    const tcy = Math.max(0, Math.min(h - 1, Math.floor(ty)));
    if (scx === tcx && scy === tcy) return [];
    const prev = new Int32Array(w * h).fill(-1);
    const seen = new Uint8Array(w * h);
    const start = scy * w + scx, goal = tcy * w + tcx;
    const q = [start]; seen[start] = 1;
    let found = start === goal;
    while (q.length && !found) {
      const cur = q.shift();
      const cx = cur % w, cy = (cur / w) | 0;
      if (cx === tcx && cy === tcy) { found = true; break; }
      const nbrs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],  // DIAGONAL
      ];
      for (const d of nbrs) {
        const nx2 = cx + d[0], ny2 = cy + d[1];
        if (nx2 < 0 || ny2 < 0 || nx2 >= w || ny2 >= h) continue;
        const idx = ny2 * w + nx2;
        if (seen[idx] || rows[ny2][nx2].blocked) continue;
        // Diagonal nur ohne Ecken-Anschneiden (beide orthogonalen Nachbarn frei)
        if (d[0] !== 0 && d[1] !== 0 && (rows[cy][cx + d[0]].blocked || rows[cy + d[1]][cx].blocked)) continue;
        seen[idx] = 1; prev[idx] = cur; q.push(idx);
      }
    }
    if (!found) return null;  // kein Weg → Geradeaus-Fallback
    const path = [];
    let cur = goal;
    while (cur !== start && cur >= 0) {
      const cx = cur % w, cy = (cur / w) | 0;
      path.push({ x: cx + 0.5, y: cy + 0.5 });
      cur = prev[cur];
    }
    path.reverse();
    return path;
  }

  // ---------------- Eingabe ----------------
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
    // Treppe/Portal: Ziel PER BFS-WEG erreichen (direkter set = Geradeauslauf
    // → hängen an der ersten Wand → "Spieler friert ein")
    if (S.info.stairs && Math.hypot(S.info.stairs.x - w.x, S.info.stairs.y - w.y) < 1.4) {
      p.foe = null; S.enterPortal = false; S.gotoStairs = true;
      p.path = findPath(p.x, p.y, S.info.stairs.x, S.info.stairs.y);
      p.target = { x: S.info.stairs.x, y: S.info.stairs.y }; return;
    }
    if (S.info.portal && Math.hypot(S.info.portal.x - w.x, S.info.portal.y - w.y) < 1.4) {
      p.foe = null; S.gotoStairs = false; S.enterPortal = true;
      p.path = findPath(p.x, p.y, S.info.portal.x, S.info.portal.y);
      p.target = { x: S.info.portal.x, y: S.info.portal.y }; return;
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
    p.path = findPath(p.x, p.y, tx, ty);   // BFS-Route durch die Gänge
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
    // Vorbefüllter Zufallsname
    $("nameInput").value = NAMES[Math.floor(Math.random() * NAMES.length)];
    const sv0 = loadSave();
    if (sv0 && sv0.mega) $("megaChk").checked = true;
    const looks = $("looks");
    looks.innerHTML = "";
    PETS.forEach((pet, i) => {
      const div = document.createElement("div");
      div.className = "look" + (i === 0 ? " sel" : "");
      div.dataset.i = i;
      div.title = pet.name;
      const c = document.createElement("canvas");
      c.width = 58; c.height = 66;
      const cc = c.getContext("2d");
      Art.drawChibi(cc, 29, 60, 36, { skin: pet.skin, outfit: pet.outfit, hair: pet.hair, species: pet.id });
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
      S.look = { skin: PETS[selLook].skin, outfit: PETS[selLook].outfit, hair: PETS[selLook].hair, species: PETS[selLook].id, name: name };
      S.mega = $("megaChk").checked;
      S.p = makePlayer(S.look);
      S.gold = 0; S.bag = [];
      S.seed = (Math.random() * 1e9) | 0;
      buildLevel(0);
      S.screen = "play";
      $("startMenu").classList.add("hidden");
      SFX.resume(); SFX.music("town"); SFX.coin();
      if (S.mega) toast("🔥 MEGASCHWER! Gegner 2× schnell, 10× Schaden. Viel Glück!");
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
        S.p.atk = sv.atk || 1; S.p.projN = sv.projN || 1; S.p.magic = sv.magic || 1;
        S.gold = sv.gold || 0; S.bag = sv.bag || []; S.seed = sv.seed || 12345;
        S.mega = !!sv.mega;
        S.deepest = sv.deepest || Math.max(1, sv.depth || 1);
        buildLevel(sv.depth || 0);
        S.screen = "play";
        $("startMenu").classList.add("hidden");
        SFX.resume(); SFX.music(sv.depth ? "dungeon" : "town");
      });
    }
    $("btnResume").addEventListener("click", () => { S.screen = "play"; $("pauseMenu").classList.add("hidden"); });
    $("btnTown").addEventListener("click", () => { $("pauseMenu").classList.add("hidden"); goTown(); S.screen = "play"; });
    $("btnBagClose").addEventListener("click", toggleBag);
    $("muteBtn").addEventListener("click", () => {
      SFX.setMuted(!SFX.isMuted());
      $("muteBtn").textContent = SFX.isMuted() ? "🔇" : "🔊";
      if (SFX.isMuted()) SFX.stopMusic();
      else if (S.screen === "play") SFX.music(S.depth === 0 ? "town" : "dungeon");
      // Probe-Klingel: hörbarer Beweis, dass WebAudio durchkommt
      SFX.coin();
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
    if (S.depth > 0) S.runSecs += dt;  // Spieltimer: nur im Keller läuft die Uhr

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
      mvx = p.dashDx * 4.2; mvy = p.dashDy * 4.2;   // Dodge: weiter springen
    } else if (mvx || mvy) {
      p.target = null; p.foe = null; S.gotoStairs = false;
      const l = Math.hypot(mvx, mvy);
      mvx /= l; mvy /= l;
    } else if (p.foe) {
      const d = Math.hypot(p.foe.x - p.x, p.foe.y - p.y);
      if (d < 1.15) {
        mvx = mvy = 0;
        if (p.atkCd <= 0) { p.face = p.foe.x >= p.x ? 1 : -1; playerAttack(); }
      } else { mvx = (p.foe.x - p.x) / d; mvy = (p.foe.y - p.y) / d; }
    } else if (p.target) {
      // BFS-Pfad abarbeiten, falls vorhanden
      if (p.path && p.path.length) {
        const wp = p.path[0];
        const wd = Math.hypot(wp.x - p.x, wp.y - p.y);
        if (wd < 0.25) { p.path.shift(); }
        else { mvx = (wp.x - p.x) / wd; mvy = (wp.y - p.y) / wd; }
      }
      if (!mvx && !mvy) {
        const d = Math.hypot(p.target.x - p.x, p.target.y - p.y);
        if (d < 0.12) { p.target = null; p.path = null; }
        else { mvx = (p.target.x - p.x) / d; mvy = (p.target.y - p.y) / d; }
      } else {
        // Zwischen-Punkten folgen; letzter Punkt exakt anlaufen
        if (!p.path || !p.path.length) {
          const d = Math.hypot(p.target.x - p.x, p.target.y - p.y);
          if (d < 0.12) { p.target = null; p.path = null; }
        }
      }
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
    p.atk360 = Math.max(0, (p.atk360 || 0) - dt);
    p.atkT = p.atkT > 0 ? (p.atkT + dt / 0.3 >= 1 ? 0 : p.atkT + dt / 0.3) : 0;
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.invulT = Math.max(0, p.invulT - dt);
    p.blinkT -= dt;
    if (p.blinkT < -3 && Math.random() < dt * 0.4) p.blinkT = 0.15;
    if (p.blinkT > 0) p.blinkT -= 0;
    let bl = p.blinkT;
    p.blinkShow = bl > 0;

    // --- Stairs/Portal: direkter Betreten-Check (draufsteigen statt vorbeilaufen) ---
    if (S.info.stairs && Math.hypot(S.info.stairs.x - p.x, S.info.stairs.y - p.y) < 0.45) {
      p.target = null;
      descend();
      return;
    }
    if (S.info.portal && Math.hypot(S.info.portal.x - p.x, S.info.portal.y - p.y) < 0.45) {
      p.target = null;
      openAscendMenu();
      return;
    }

    // --- Fliegende Goodies (Physik) ---
    for (const it of S.items) {
      if (it.flyingT > 0) {
        it.flyingT -= dt;
        it.x += it.vx * dt; it.y += it.vy * dt;
        it.vx *= 0.93; it.vy *= 0.93;
        if (!cellFree(it.x, it.y)) { it.x -= it.vx * dt; it.y -= it.vy * dt; it.vx *= -0.5; it.vy *= -0.5; }
      }
    }

    // --- Items: 3-Felder-Magnet ---
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i];
      const dx = p.x - it.x, dy = p.y - it.y;
      const d = Math.hypot(dx, dy);
      if (d < 3.2 && d > 0.3) {
        // Ansaugen (fliegt auf den Kobold zu)
        const pull = 7.5 * dt * (1.4 - d / 3.2);
        it.x += dx / d * pull; it.y += dy / d * pull;
        it.flying = true;
      }
      if (d < 0.55) {
        if (it.kind === "coin") { S.gold++; SFX.coin(); Particles.spawn(it.x, it.y, "#ffd75e", 6, 0.3, 0.8); }
        else if (it.kind === "mushroom") {
          if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + 1); toast("🍄 +1 ❤️"); }
          else { S.bag.push(it); toast("🍄 Glitzerpilz eingesackt!"); }
          SFX.loot();
        }
        else if (it.kind === "potion") { p.potionCount = Math.min(3, p.potionCount + 1); SFX.loot(); toast("🧪 Trank gefunden!"); }
        else if (it.kind === "sword") { p.atk += 1; SFX.levelup(); toast("⚔️ SCHARFES SCHWERT! Schaden +1 (jetzt " + p.atk + ")"); Particles.spawn(it.x, it.y, "#ffd75e", 20, 0.6, 1.2); }
        else if (it.kind === "wand") { p.projN += 1; SFX.levelup(); toast("🪄 ZAUBERWANDEL! +" + (p.projN - 1) + " extra Seifenblase (" + p.projN + "×)"); Particles.spawn(it.x, it.y, "#9be1ff", 20, 0.6, 1.2); }
        else if (it.kind === "gem") { p.magic += 1; SFX.levelup(); toast("✨ GLITZERSTEIN! Seifenblasen-Schaden +1 (jetzt " + p.magic + ")"); Particles.spawn(it.x, it.y, "#d9b3ff", 20, 0.6, 1.2); }
        S.items.splice(i, 1);
      }
    }

    // --- Projektile (Auto-Aim-Seifenblasen) ---
    for (let i = S.projectiles.length - 1; i >= 0; i--) {
      const pr = S.projectiles[i];
      pr.life -= dt;
      // leichtes Nachziehen aufs Ziel (Homing)
      if (pr.lock && pr.lock.hp > 0 && S.ents.includes(pr.lock)) {
        const ang = Math.atan2(pr.lock.y - pr.y, pr.lock.x - pr.x);
        const sp = Math.hypot(pr.vx, pr.vy);
        pr.vx = pr.vx * 0.85 + Math.cos(ang) * sp * 0.15;
        pr.vy = pr.vy * 0.85 + Math.sin(ang) * sp * 0.15;
      } else pr.lock = null;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      let pop = pr.life <= 0 || !cellFree(pr.x, pr.y);
      if (!pop) {
        for (const e of S.ents) {
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < 0.6) {
            hurtEnt(e, pr.dmg);
            Particles.spawn(e.x, e.y, "#7bd0ff", 10, 0.4, 0.7);
            pop = true; break;
          }
        }
      }
      if (pop) { Particles.spawn(pr.x, pr.y, "#bfe3ff", 8, 0.3, 0.6); S.projectiles.splice(i, 1); }
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
      ents: S.ents, items: S.items, projectiles: S.projectiles, cam: S.cam, now: S.now, vis: S.vis,
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
    $("depthBadge").textContent = (S.depth === 0 ? "🏠 Stadt" : "🕳️ Ebene " + S.depth) + (S.mega ? " 🔥" : "");
    const wb = $("weaponBadge");
    if (wb) wb.textContent = "⚔️" + p.atk + " 🫧" + (p.projN || 1) + "×" + (p.magic || 1);
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
  const verL = $("verLabel");
  if (verL) verL.textContent = "🍄 Koboldkeller v19 — Riesiger Rundumschlag + Dodge-Sprung";
  window.KK = {
    start: (skinIdx) => { $("btnNew").click(); },
    attack: playerAttack, bubbles: castBubbles, dash: castDash, potion: usePotion,
    descend: () => descend(),
    state: () => ({ depth: S.depth, hp: S.p && S.p.hp, ents: S.ents.length, gold: S.gold, screen: S.screen, mega: !!S.mega, secs: Math.round(S.runSecs), winQueued: !!S.winQueued }),
    errors: () => window.__errors,
    // Test-Hooks (v7-Suite)
    gain: (n) => gainXp(n),
    ascend: () => openAscendMenu(),
    goDepth: (d) => { buildLevel(d); },
    save: () => save(),
    load: () => loadSave(),
    win: (how) => winGame(how || "boss"),  // v17: Sieges-Screen direkt testen
    hall: () => { try { return JSON.parse(localStorage.getItem(KK_HH_KEY)) || {}; } catch (e) { return {}; } },
  };
  // Sieges-Screen: Buttons verdrahten (einmalig beim Boot)
  try {
    $("btnWinTown").addEventListener("click", () => { $("winMenu").classList.add("hidden"); S.winQueued = false; goTown(); S.screen = "play"; });
    $("btnWinAgain").addEventListener("click", () => { $("winMenu").classList.add("hidden"); S.winQueued = false; S.runSecs = 0; goTown(); descend(); S.screen = "play"; });
  } catch (e) { }
  // iOS-Audio-Wächter: erster Touch/Klick weckt suspendierten AudioContext
  const audioWake = () => {
    try {
      SFX.resume();
      if (S.screen === "play" && !SFX.isMuted()) SFX.music(S.depth === 0 ? "town" : "dungeon");
      const badge = $("audioHint");
      if (badge) badge.style.display = SFX.audioOk() ? "none" : "block";
    } catch (e) { }
  };
  window.addEventListener("pointerdown", audioWake, { passive: true });
  window.addEventListener("keydown", audioWake, { passive: true });
  requestAnimationFrame(frame);
})();