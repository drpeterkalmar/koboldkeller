/* render.js — Iso-Renderer: Boden, Wände, Deko, Figuren (MIT) */
"use strict";
var R = (function () {
  const Rr = {};
  const TW = W.TW, TH = W.TH;
  const isoX = W.isoX, isoY = W.isoY;

  // Paletten (putzig-hell)
  const PALS = [
    { name: "Wiese (Stadt)", floor: "#79c258", fA: "#72b957", fB: "#7fc75f", wall: "#3f7d46", wallT: "#4f9455", fog: "rgba(90,140,90,COMMA)" },
    { name: "Keller",        floor: "#544377", fA: "#4c3c6e", fB: "#57467c", wall: "#3a2d59", wallT: "#4d3c74", fog: "rgba(24,15,46,COMMA)" },
    { name: "Mooskeller",    floor: "#446353", fA: "#3d5a4b", fB: "#48695a", wall: "#2f483c", wallT: "#3d5a4b", fog: "rgba(12,26,20,COMMA)" },
    { name: "Blaufels-Grotte", floor: "#4d5570", fA: "#454d66", fB: "#50597a", wall: "#38405c", wallT: "#454d66", fog: "rgba(14,18,36,COMMA)" },
    { name: "Zucker-Höhle",  floor: "#74517d", fA: "#6a4973", fB: "#7b5885", wall: "#5c3f66", wallT: "#6a4973", fog: "rgba(38,16,44,COMMA)" },
  ];
  Rr.PALS = PALS;

  function tileFloor(ctx, sx, sy, a, pal) {
    ctx.fillStyle = a ? pal.fA : pal.fB;
    ctx.beginPath();
    ctx.moveTo(sx, sy - TH / 2);
    ctx.lineTo(sx + TW / 2, sy);
    ctx.lineTo(sx, sy + TH / 2);
    ctx.lineTo(sx - TW / 2, sy);
    ctx.closePath(); ctx.fill();
  }

  function wallBlock(ctx, sx, sy, pal) {
    const hh = 26;
    // rechte Seitenfläche
    ctx.fillStyle = pal.wall;
    ctx.beginPath();
    ctx.moveTo(sx, sy + TH / 2); ctx.lineTo(sx + TW / 2, sy);
    ctx.lineTo(sx + TW / 2, sy - hh); ctx.lineTo(sx, sy + TH / 2 - hh);
    ctx.closePath(); ctx.fill();
    // linke Seitenfläche
    ctx.fillStyle = pal.wall;
    ctx.beginPath();
    ctx.moveTo(sx, sy + TH / 2); ctx.lineTo(sx - TW / 2, sy);
    ctx.lineTo(sx - TW / 2, sy - hh); ctx.lineTo(sx, sy + TH / 2 - hh);
    ctx.closePath(); ctx.fill();
    // Deckel
    ctx.fillStyle = pal.wallT;
    ctx.beginPath();
    ctx.moveTo(sx, sy - TH / 2 - hh); ctx.lineTo(sx + TW / 2, sy - hh);
    ctx.lineTo(sx, sy + TH / 2 - hh); ctx.lineTo(sx - TW / 2, sy - hh);
    ctx.closePath(); ctx.fill();
  }

  function drawDeco(ctx, kind, sx, sy, t, rndOff) {
    const jig = Math.sin(t * 2 + rndOff) * 1.5;
    if (kind === 1) { // Blume rot
      ctx.strokeStyle = "#3f7d46"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 8 + jig * 0.3); ctx.stroke();
      Rr.ell(ctx, sx, sy - 10 + jig * 0.3, 4, 4, "#ff8ba0");
      Rr.ell(ctx, sx, sy - 10 + jig * 0.3, 1.8, 1.8, "#ffd75e");
    } else if (kind === 2) { // Blume gelb
      ctx.strokeStyle = "#3f7d46"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 1, sy - 7 + jig * 0.3); ctx.stroke();
      Rr.ell(ctx, sx + 1, sy - 9 + jig * 0.3, 3.6, 3.6, "#ffd75e");
      Rr.ell(ctx, sx + 1, sy - 10 + jig * 0.3, 1.6, 1.6, "#ff8ba0");
    } else if (kind === 3) { // Pilz
      Rr.ell(ctx, sx, sy - 3, 2.5, 3, "#f5efe2");
      Rr.ell(ctx, sx, sy - 6, 4.5, 3, "#ff5d73");
    } else if (kind === 4) { // Steinchen
      Rr.ell(ctx, sx, sy - 2, 3.4, 2.4, "#7a6f96");
    }
  }

  function drawHouse(ctx, sx, sy, t) {
    // putzig Puppenhaus
    const w = 64, h = 66;
    ctx.fillStyle = "#8a5a33";
    ctx.fillRect(sx - w / 2, sy - h, w, h);
    ctx.fillStyle = "#a86b3c";
    ctx.fillRect(sx - w / 2, sy - h, w, 10);
    // Dach
    ctx.fillStyle = "#e0526e";
    ctx.beginPath();
    ctx.moveTo(sx - w / 2 - 10, sy - h); ctx.lineTo(sx, sy - h - 34); ctx.lineTo(sx + w / 2 + 10, sy - h);
    ctx.closePath(); ctx.fill();
    // Fenster + Tür
    ctx.fillStyle = "#ffe9a8";
    ctx.fillRect(sx - w / 2 + 8, sy - h + 22, 14, 14);
    ctx.fillRect(sx + w / 2 - 22, sy - h + 22, 14, 14);
    ctx.fillStyle = "#5a3a1f";
    ctx.fillRect(sx - 8, sy - 26, 16, 26);
    // Schornstein + Rauch
    ctx.fillStyle = "#c9bfa8";
    ctx.fillRect(sx + w / 4, sy - h - 26, 10, 18);
    for (let i = 0; i < 3; i++) {
      const tt = (t * 0.6 + i * 0.33) % 1;
      ctx.globalAlpha = 0.5 * (1 - tt);
      Rr.ell(ctx, sx + w / 4 + 5 + Math.sin(t + i * 2) * 4, sy - h - 32 - tt * 30, 5 + tt * 6, 5 + tt * 6, "#d8cfe8");
    }
    ctx.globalAlpha = 1;
  }

  function drawFountain(ctx, sx, sy, t) {
    Rr.ell(ctx, sx, sy, 30, 15, "#6e7ca8");
    Rr.ell(ctx, sx, sy, 24, 12, "#8fb8e8");
    Rr.ell(ctx, sx, sy, 8, 5, "#a86b3c");
    // Wasser-Sprudel
    for (let i = 0; i < 6; i++) {
      const ph = (t * 1.3 + i / 6) % 1;
      ctx.globalAlpha = 1 - ph;
      Rr.ell(ctx, sx + Math.sin(i * 2.5 + t) * 6, sy - 8 - ph * 18, 3, 4.5, "#bfe3ff");
    }
    ctx.globalAlpha = 1;
  }

  function drawTorch(ctx, sx, sy, t) {
    ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 26); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const ph = (t * 5 + i * 0.4) % 1;
      ctx.globalAlpha = 0.85 - ph * 0.6;
      Rr.ell(ctx, sx + Math.sin(t * 8 + i) * 2, sy - 30 - ph * 10, 5 - ph * 2.5, 7 - ph * 3, i === 0 ? "#ffd75e" : "#ff8c42");
    }
    ctx.globalAlpha = 1;
  }

  function shadow(ctx, sx, sy, rx) {
    ctx.globalAlpha = 0.25;
    Rr.ell(ctx, sx, sy, rx, rx * 0.45, "#000");
    ctx.globalAlpha = 1;
  }

  // Haupt-Draw
  // st: { map, info, depth, px, py, ents, cam:{x,y}, now, vis (Float32[][]|null), look }
  Rr.drawScene = function (ctx, st) {
    const { map, info } = st;
    const now = st.now;
    const pal = info.kind === "town" ? PALS[0] : PALS[1 + ((st.depth - 1) % (PALS.length - 1))];
    const camX = st.cam.x, camY = st.cam.y;
    const vis = st.vis;

    ctx.fillStyle = pal.fog.replace("COMMA", "1");
    ctx.fillRect(0, 0, st.vw, st.vh);

    ctx.save();
    ctx.translate(-camX, -camY);

    // sichtbarer Fenster in Weltkoords
    const TL = W.unproj(0, 0, camX, camY), BR = W.unproj(st.vw, st.vh, camX, camY);
    const x0 = Math.max(0, Math.floor(Math.min(TL.x, BR.x) - 2));
    const x1 = Math.min(map.w - 1, Math.ceil(Math.max(TL.x, BR.x) + 2));
    const y0 = Math.max(0, Math.floor(Math.min(TL.y, BR.y) - 2));
    const y1 = Math.min(map.h - 1, Math.ceil(Math.max(TL.y, BR.y) + 2));

    // Boden + Deko + Schatten, sortiert nach Reihen
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = map.rows[y][x];
        const sx = isoX(x, y), sy = isoY(x, y);
        if (c.blocked) continue;
        tileFloor(ctx, sx, sy, (x + y) % 2 === 0, pal);
        const v = vis ? vis[y][x] : 1;
        if (v > 0.12) {
          if (c.deco) drawDeco(ctx, c.deco, sx, sy - 2, now, (x * 7 + y * 13) % 10);
        }
      }
    }

    // Objekte + Wandblöcke gemeinsam tiefensortiert
    const objs = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = map.rows[y][x];
        if (!c.blocked) continue;
        objs.push({ d: x + y, kind: "wall", x, y });
      }
    }
    for (const hs of info.houses || []) objs.push({ d: hs.x + hs.y, kind: "house", x: hs.x, y: hs.y });
    if (info.fountain) objs.push({ d: info.fountain.x + info.fountain.y, kind: "fountain", x: info.fountain.x, y: info.fountain.y });
    for (const t of info.torches || []) objs.push({ d: t.x + t.y, kind: "torch", x: t.x, y: t.y });
    if (info.portal) objs.push({ d: info.portal.x + info.portal.y, kind: "portal", x: info.portal.x, y: info.portal.y });
    if (info.stairs) objs.push({ d: info.stairs.x + info.stairs.y, kind: "stairs", x: info.stairs.x, y: info.stairs.y });
    for (const e of st.ents) objs.push({ d: e.x + e.y, kind: "ent", e, x: e.x, y: e.y });
    objs.push({ d: st.px + st.py, kind: "player", x: st.px, y: st.py });
    for (const it of st.items) objs.push({ d: it.x + it.y, kind: "item", it, x: it.x, y: it.y });
    for (const pr of st.projectiles || []) objs.push({ d: pr.x + pr.y, kind: "proj", x: pr.x, y: pr.y, pr });
    objs.sort((a, b) => a.d - b.d);

    for (const o of objs) {
      const sx = isoX(o.x, o.y), sy = isoY(o.x, o.y);
      const v = vis ? (map.rows[Math.floor(o.y)] && map.rows[Math.floor(o.y)][Math.floor(o.x)] ? vis[Math.floor(o.y)][Math.floor(o.x)] : 0) : 1;
      if (o.kind !== "player" && o.kind !== "ent" && v <= 0.12 && st.vis) continue;
      if (o.kind === "wall") wallBlock(ctx, sx, sy, pal);
      else if (o.kind === "house") { shadow(ctx, sx, sy + 4, 40); drawHouse(ctx, sx, sy, now); }
      else if (o.kind === "fountain") drawFountain(ctx, sx, sy, now);
      else if (o.kind === "torch") drawTorch(ctx, sx, sy, now);
      else if (o.kind === "portal") drawPortal(ctx, sx, sy, now);
      else if (o.kind === "stairs") drawStairs(ctx, sx, sy);
      else if (o.kind === "item") drawItem(ctx, o.it, sx, sy, now);
      else if (o.kind === "proj") drawProj(ctx, o.pr, sx, sy, now);
      else if (o.kind === "ent") drawEnt(ctx, o.e, sx, sy, now);
      else drawPlayer(ctx, st, sx, sy, now);
    }

    Particles.draw(ctx, camX, camY);
    ctx.restore();

    // Fog of War: Vignette
    ctx.fillStyle = "rgba(10,6,22,0.22)";
    ctx.fillRect(0, 0, st.vw, st.vh);
  };

  function drawPortal(ctx, sx, sy, t) {
    const pul = 1 + Math.sin(t * 3) * 0.08;
    ctx.globalAlpha = 0.35;
    Rr.ell(ctx, sx, sy, 34 * pul, 17 * pul, "#b57bff");
    ctx.globalAlpha = 0.6;
    Rr.ell(ctx, sx, sy, 24 * pul, 12 * pul, "#d9b3ff");
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const a = t * 2 + i * 1.256;
      Rr.ell(ctx, sx + Math.cos(a) * 22 * pul, sy + Math.sin(a) * 10 * pul - 6, 3, 3, "#efe0ff");
    }
  }
  function drawStairs(ctx, sx, sy) {
    Rr.ell(ctx, sx, sy, 22, 11, "#120b26");
    ctx.strokeStyle = "#5a4a80"; ctx.lineWidth = 2.5; ctx.stroke();
    Rr.ell(ctx, sx, sy - 2, 14, 7, "#241741");
  }
  function drawItem(ctx, it, sx, sy, t) {
    const bounce = Math.sin(t * 4 + (it.seed || 0)) * 3;
    shadow(ctx, sx, sy, 10);
    const lift = it.flyingT > 0 ? 10 : 0;  // fliegende Goodies schweben höher
    if (it.kind === "coin") Art.drawCoin(ctx, sx, sy - 8 - lift + bounce, 26);
    else if (it.kind === "mushroom") Art.drawMushroom(ctx, sx, sy - 6 - lift + bounce, 30);
    else if (it.kind === "sword") { // Scharfes Schwert (aufsteigender Glanz)
      const s = 30 + Math.sin(t * 5 + (it.seed || 0)) * 2;
      Rr.glow(ctx, sx, sy - 10, 16, "rgba(255,215,94,.5)");
      Art.drawSword(ctx, sx, sy - 10 - lift + bounce, s);
    }
    else if (it.kind === "wand") {
      Rr.glow(ctx, sx, sy - 10, 16, "rgba(155,225,255,.6)");
      Art.drawWand(ctx, sx, sy - 10 - lift + bounce, 30, t);
    }
    else if (it.kind === "gem") {
      const pulse = Math.sin(t * 6 + (it.seed || 0)) * 0.12 + 1;
      Rr.glow(ctx, sx, sy - 10, 17, "rgba(200,150,255,.65)");
      Art.drawGem(ctx, sx, sy - 10 - lift + bounce, 26 * pulse);
    }
    else Art.drawPotion(ctx, sx, sy - 6 - lift + bounce, 30);
  }

  function drawProj(ctx, pr, sx, sy, t) {
    const wob = Math.sin(t * 14 + pr.x) * 1.5;
    Rr.ell(ctx, sx, sy - 18, 7, 9, "rgba(200,240,255,.85)");
    Rr.ell(ctx, sx - 2, sy - 12, 2.2, 2.6, "rgba(255,255,255,.95)");
    // Glitzer-Schweif
    ctx.globalAlpha = 0.5;
    Rr.ell(ctx, sx - pr.face * 6, sy - 8, 4, 6, "rgba(150,210,255,.5)");
    ctx.globalAlpha = 1;
  }

  function drawEnt(ctx, e, sx, sy, t) {
    const sc = e.scale || 1;
    shadow(ctx, sx, sy, 13 * sc);
    const o = { walk: e.walkT, hurt: e.hurtT, face: e.face, atk: e.atkT };
    if (e.type === "wichtel") Art.drawWichtel(ctx, sx, sy - 4 * sc, 42 * sc, o);
    else if (e.type === "slime") Art.drawSlime(ctx, sx, sy - 2 * sc, 40 * sc, o);
    else if (e.type === "bat") Art.drawBat(ctx, sx, sy - 14 * sc + Math.sin(t * 3 + (e.seed || 0)) * 4, 40 * sc, o);
    else if (e.type === "wisp") Art.drawWisp(ctx, sx, sy - 12 * sc + Math.sin(t * 2 + (e.seed || 0)) * 5, 42 * sc, o);
    else if (e.type === "boss") Art.drawBoss(ctx, sx, sy - 4 * sc, 92 * sc, { walk: e.walkT, hurt: e.hurtT, face: e.face, atk: e.atkT, red: !!e.red });
  }

  function drawPlayer(ctx, st, sx, sy, t) {
    const p = st.p;
    if (st.p.invulT > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(st.p.invulT * 16));
    shadow(ctx, sx, sy, 14);
    Art.drawChibi(ctx, sx, sy - 4, 46, {
      walk: p.walkT, atk: p.atkT, hurt: p.hurtT, face: p.face,
      skin: p.skin, outfit: p.outfit, hair: p.hair, species: p.species,
      blink: p.blinkT > 0, crown: st.depth >= 9,
    });
    ctx.globalAlpha = 1;
    // Rundumschlag-Blitz (weißer Ring, kurz sichtbar)
    if (st.p && st.p.atk360 > 0) {
      const a = (st.p.atk360 / 0.35);
      ctx.globalAlpha = 0.55 * a;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3 + 3 * a;
      ctx.beginPath();
      // Ellipse passt zur echten Trefferzone (Radius 3.0 Kacheln ≈ 102px Iso-x), Shockwave expandiert
      ctx.ellipse(sx, sy - 8, 76 + (1 - a) * 26, 38 + (1 - a) * 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  Rr.ell = function (ctx, x, y, rx, ry, col) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
  };

  Rr.glow = function (ctx, x, y, r, col) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };

  return Rr;
})();