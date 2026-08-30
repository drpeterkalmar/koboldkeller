/* art.js — prozedurale Chibi-Grafik für Koboldkeller (MIT) */
"use strict";
(function () {
  const ART = {};

  // ---------- Helfer ----------
  function ell(ctx, x, y, rx, ry, col, stroke, lw) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (col) { ctx.fillStyle = col; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function rrect(ctx, x, y, w, h, r, col, stroke, lw) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (col) { ctx.fillStyle = col; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * f)) | 0,
      g = Math.max(0, Math.min(255, ((n >> 8) & 255) * f)) | 0,
      b = Math.max(0, Math.min(255, (n & 255) * f)) | 0;
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // ---------- Chibi-Kobold (Spieler) ----------
  // Größe ~ scale (Pixel Gesamthöhe), Anker = Fuß-Mitte (0,0)
  // walk: 0..1 Laufphase | atk: 0..1 Schlagphase | face: 1=rechts, -1=links
  ART.drawChibi = function (ctx, x, y, scale, o) {
    o = o || {};
    const skin = o.skin || "#7ed957";
    const skinD = shade(skin, 0.78), skinL = shade(skin, 1.18);
    const walk = o.walk || 0, atk = o.atk, hurt = o.hurt || 0, face = o.face || 1;
    const blink = o.blink || false;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(face, 1);
    if (hurt > 0) { ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 20)); }

    const bob = Math.sin(walk * Math.PI * 2) * scale * 0.035;
    const headR = scale * 0.33;
    const bodyH = scale * 0.30, bodyW = scale * 0.30;
    const legH = scale * 0.16;
    const legSwing = Math.sin(walk * Math.PI * 2) * scale * 0.05;
    const cy = -legH - bodyH - headR - bob; // Kopfmittelhöhe

    // Beine (kleine Stummel)
    ell(ctx, -scale * 0.09, -legH / 2 + Math.max(0, legSwing), scale * 0.075, legH / 2 + Math.abs(legSwing) * 0.3, skinD);
    ell(ctx, scale * 0.09, -legH / 2 + Math.max(0, -legSwing), scale * 0.075, legH / 2 + Math.abs(legSwing) * 0.3, skinD);

    // Körper (Bohne) mit Latzhose-Look
    ell(ctx, 0, -legH - bodyH / 2, bodyW / 2, bodyH / 2, skin);
    rrect(ctx, -bodyW * 0.42, -legH - bodyH * 0.78, bodyW * 0.84, bodyH * 0.55, bodyW * 0.2, o.outfit || "#ff6f91");

    // Arme
    const armY = -legH - bodyH * 0.62;
    if (atk !== undefined && atk > 0) {
      // Schlagarm rotiert über Kopf
      const ang = -2.2 + atk * 3.1;
      ctx.save();
      ctx.translate(scale * 0.10, armY);
      ctx.rotate(ang);
      ell(ctx, scale * 0.11, 0, scale * 0.065, scale * 0.05, skin);
      // Waffelholz
      rrect(ctx, scale * 0.12, -scale * 0.03, scale * 0.30, scale * 0.06, scale * 0.03, "#a86b3c");
      ell(ctx, scale * 0.46, 0, scale * 0.10, scale * 0.10, "#ffd75e", "#b8801f", 2);
      ctx.restore();
    } else {
      ell(ctx, -scale * 0.19, armY + legSwing * 0.5, scale * 0.06, scale * 0.05, skinD);
      ell(ctx, scale * 0.19, armY - legSwing * 0.5, scale * 0.06, scale * 0.05, skin);
    }

    // Kopf
    ell(ctx, 0, cy, headR, headR * 0.95, skin, shade(skin, 0.6), 2);
    // Kobold-Ohren (spitz nach außen)
    ctx.beginPath();
    ctx.moveTo(-headR * 0.9, cy - headR * 0.1);
    ctx.lineTo(-headR * 1.55, cy - headR * 0.55);
    ctx.lineTo(-headR * 0.85, cy + headR * 0.28);
    ctx.closePath(); ctx.fillStyle = skinD; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headR * 0.9, cy - headR * 0.1);
    ctx.lineTo(headR * 1.55, cy - headR * 0.55);
    ctx.lineTo(headR * 0.85, cy + headR * 0.28);
    ctx.closePath(); ctx.fillStyle = skin; ctx.fill();

    // Haarbüschel (flauschig, 2 Tuffs)
    ctx.beginPath();
    ctx.moveTo(-headR * 0.55, cy - headR * 0.78);
    ctx.quadraticCurveTo(-headR * 0.25, cy - headR * 1.55, headR * 0.05, cy - headR * 0.95);
    ctx.quadraticCurveTo(headR * 0.3, cy - headR * 1.5, headR * 0.55, cy - headR * 0.78);
    ctx.quadraticCurveTo(0, cy - headR * 1.05, -headR * 0.55, cy - headR * 0.78);
    ctx.closePath(); ctx.fillStyle = o.hair || "#5b3a29"; ctx.fill();

    // Augen (XXL-Kuller-Augen, zwei Glanzpunkte)
    const eyeY = cy + headR * 0.08, eyeDX = headR * 0.36, eyeR = headR * 0.22;
    for (const s of [-1, 1]) {
      if (blink) {
        ctx.strokeStyle = "#2b2340"; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(s * eyeDX, eyeY, eyeR * 0.9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      } else {
        ell(ctx, s * eyeDX, eyeY, eyeR, eyeR * 1.18, "#ffffff", "#2b2340", 1.8);
        // Iris (dunkles Pflaumen-Ton) fast füllend
        ell(ctx, s * eyeDX, eyeY + eyeR * 0.1, eyeR * 0.72, eyeR * 0.88, "#3b2d5e");
        // innerer Farbreflex
        ell(ctx, s * eyeDX, eyeY + eyeR * 0.3, eyeR * 0.5, eyeR * 0.55, "#5a4390");
        // großer Glanzpunkt oben-links
        ell(ctx, s * eyeDX - eyeR * 0.28, eyeY - eyeR * 0.38, eyeR * 0.30, eyeR * 0.24, "#ffffff");
        // Mini-Glanz unten-rechts
        ell(ctx, s * eyeDX + eyeR * 0.26, eyeY + eyeR * 0.48, eyeR * 0.13, eyeR * 0.11, "rgba(255,255,255,.85)");
      }
    }
    // Wangen (rot) + Mund
    ell(ctx, -headR * 0.62, cy + headR * 0.38, headR * 0.16, headR * 0.10, "rgba(255,110,130,.5)");
    ell(ctx, headR * 0.62, cy + headR * 0.38, headR * 0.16, headR * 0.10, "rgba(255,110,130,.5)");
    ctx.strokeStyle = "#2b2340"; ctx.lineWidth = 2.2; ctx.beginPath();
    ctx.arc(0, cy + headR * 0.28, headR * 0.20, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();

    ctx.restore();
    // Krone (nicht gespiegelt, sitzt mittig)
    if (o.crown) {
      const r = headR, cx = 0, ty = cy - r * 1.0;
      ctx.save(); ctx.translate(x, y); ctx.translate(0, ty - r * 0.32 + bob);
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, 0); ctx.lineTo(-r * 0.5, -r * 0.35); ctx.lineTo(-r * 0.22, -r * 0.12);
      ctx.lineTo(0, -r * 0.45); ctx.lineTo(r * 0.22, -r * 0.12); ctx.lineTo(r * 0.5, -r * 0.35);
      ctx.lineTo(r * 0.5, 0); ctx.closePath();
      ctx.fillStyle = "#ffd75e"; ctx.fill(); ctx.strokeStyle = "#b8801f"; ctx.lineWidth = 2; ctx.stroke();
      ell(ctx, 0, -r * 0.02, r * 0.08, r * 0.08, "#ff5d73");
      ctx.restore();
    }
  };

  // ---------- Gegner ----------
  // Wichtel: rotes Zipfelmützchen, weißer Bart-Bauch (putzig, nicht gruselig)
  ART.drawWichtel = function (ctx, x, y, scale, o) {
    o = o || {};
    const walk = o.walk || 0, hurt = o.hurt || 0, face = o.face || 1;
    const bob = Math.sin(walk * Math.PI * 2) * scale * 0.03;
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 20));
    const R = scale * 0.26;
    // Füße
    const ls = Math.sin(walk * Math.PI * 2) * scale * 0.04;
    ell(ctx, -scale * 0.08, -scale * 0.04 + Math.max(0, ls), scale * 0.06, scale * 0.05, "#8a5a33");
    ell(ctx, scale * 0.08, -scale * 0.04 + Math.max(0, -ls), scale * 0.06, scale * 0.05, "#8a5a33");
    // Körper (rosa-runde Nase direkt drunter)
    ell(ctx, 0, -R - scale * 0.02 + bob, R * 0.85, R * 0.8, "#e8834f", "#a85326", 2);
    // Bart-Halbmond
    ell(ctx, 0, -R * 1.02 + bob, R * 0.66, R * 0.48, "#f5efe2");
    // Nase
    ell(ctx, 0, -R * 1.02 + bob, R * 0.17, R * 0.2, "#ffb37b", "#c97b4a", 1.5);
    // Augen über dem Bart (Glitzer-Kuller)
    for (const s of [-1, 1]) {
      ell(ctx, s * R * 0.34, -R * 1.22 + bob, R * 0.13, R * 0.15, "#ffffff", "#2b2340", 1.4);
      ell(ctx, s * R * 0.34, -R * 1.20 + bob, R * 0.09, R * 0.11, "#3b2d5e");
      ell(ctx, s * R * 0.34 - R * 0.04, -R * 1.27 + bob, R * 0.045, R * 0.035, "#ffffff");
    }
    // Zipfelmütze
    ctx.beginPath();
    ctx.moveTo(-R * 0.72, -R * 1.32 + bob);
    ctx.quadraticCurveTo(0, -R * 2.5 - bob * 0.4, R * 0.62, -R * 1.3 + bob);
    ctx.quadraticCurveTo(0, -R * 1.55, -R * 0.72, -R * 1.32 + bob);
    ctx.closePath(); ctx.fillStyle = "#e0526e"; ctx.fill(); ctx.strokeStyle = "#a03048"; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, R * 0.62, -R * 1.3 + bob, R * 0.10, R * 0.10, "#fff");
    ctx.restore();
  };

  // Schleim: wabbeliger Pudding mit Kulleraugen
  ART.drawSlime = function (ctx, x, y, scale, o) {
    o = o || {};
    const w = o.walk || 0, hurt = o.hurt || 0;
    ctx.save(); ctx.translate(x, y);
    if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 20));
    const sq = 1 + Math.sin(w * Math.PI * 2) * 0.12, R = scale * 0.30;
    const bodyY = -R * sq * 0.75;
    ell(ctx, 0, bodyY, R / sq, R * sq, "#66d9e8", "#2fa3b8", 2);
    ell(ctx, -R * 0.25, bodyY - R * 0.35, R * 0.3, R * 0.18, "rgba(255,255,255,.5)");
    // Kulleraugen mit Glitzer
    for (const s of [-1, 1]) {
      ell(ctx, s * R * 0.34, bodyY + R * 0.05, R * 0.16, R * 0.19, "#ffffff", "#2b2340", 1.5);
      ell(ctx, s * R * 0.34 + R * 0.02, bodyY + R * 0.08, R * 0.11, R * 0.13, "#3b2d5e");
      ell(ctx, s * R * 0.34 - R * 0.04, bodyY - R * 0.02, R * 0.05, R * 0.04, "#ffffff");
      ell(ctx, s * R * 0.34 + R * 0.07, bodyY + R * 0.14, R * 0.025, R * 0.02, "rgba(255,255,255,.8)");
    }
    // Mund: kleines "o"
    ell(ctx, 0, bodyY + R * 0.45, R * 0.09, R * 0.11, "#1d7a8c");
    ctx.restore();
  };

  // Fledermaus: flauschige Kugel mit Fläügeln
  ART.drawBat = function (ctx, x, y, scale, o) {
    o = o || {};
    const t = o.walk || 0, hurt = o.hurt || 0, face = o.face || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 20));
    const R = scale * 0.24, flap = Math.sin(t * Math.PI * 4) * 0.5;
    // Flügel
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * R * 0.75, -R * 1.1 - R * 0.5);
      ctx.rotate(s * flap); // — symmetrisch
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * R * 1.5, -R * 0.8, s * R * 1.9, R * 0.25);
      ctx.quadraticCurveTo(s * R * 1.1, R * 0.1, 0, R * 0.45);
      ctx.closePath(); ctx.fillStyle = "#9b6bd6"; ctx.fill(); ctx.strokeStyle = "#6a3da0"; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    // Körper
    ell(ctx, 0, -R * 1.5, R, R * 0.9, "#b58ae8", "#7d55b5", 2);
    // Ohren
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * R * 0.35, -R * 2.15); ctx.lineTo(s * R * 0.55, -R * 2.75); ctx.lineTo(s * R * 0.75, -R * 2.05);
      ctx.closePath(); ctx.fillStyle = "#b58ae8"; ctx.fill(); ctx.strokeStyle = "#7d55b5"; ctx.stroke();
    }
    // Kulleraugen mit Glitzer
    for (const s of [-1, 1]) {
      ell(ctx, s * R * 0.32, -R * 1.55, R * 0.17, R * 0.20, "#ffffff", "#2b2340", 1.5);
      ell(ctx, s * R * 0.32 + R * 0.02, -R * 1.52, R * 0.11, R * 0.13, "#3b2d5e");
      ell(ctx, s * R * 0.32 - R * 0.05, -R * 1.62, R * 0.05, R * 0.04, "#ffffff");
    }
    // Zährchen
    ell(ctx, 0, -R * 1.15, R * 0.08, R * 0.06, "#2b2340");
    ctx.restore();
  };

  // Wisper: niedlicher Wolken-Geist
  ART.drawWisp = function (ctx, x, y, scale, o) {
    o = o || {};
    const t = o.walk || 0, hurt = o.hurt || 0, face = o.face || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 20));
    const R = scale * 0.28, fl = Math.sin(t * Math.PI * 2) * scale * 0.03;
    const cy = -R * 1.5 + fl;
    // Körper: Halbkreis mit Wellensaum
    ctx.beginPath();
    ctx.arc(0, cy, R, Math.PI, 0);
    const ys = cy;
    ctx.lineTo(R, ys + R * 0.55);
    ctx.quadraticCurveTo(R * 0.6, ys + R * 0.3, R * 0.35, ys + R * 0.6);
    ctx.quadraticCurveTo(0, ys + R * 0.32, -R * 0.35, ys + R * 0.6);
    ctx.quadraticCurveTo(-R * 0.6, ys + R * 0.3, -R, ys + R * 0.55);
    ctx.closePath();
    ctx.fillStyle = "rgba(240,238,255,.94)"; ctx.fill();
    ctx.strokeStyle = "#b0a8e0"; ctx.lineWidth = 2; ctx.stroke();
    // Augen + Mund
    ell(ctx, -R * 0.3, cy, R * 0.12, R * 0.16, "#3a2f55");
    ell(ctx, R * 0.3, cy, R * 0.12, R * 0.16, "#3a2f55");
    ell(ctx, -R * 0.26, cy - R * 0.05, R * 0.04, R * 0.04, "#fff");
    ell(ctx, R * 0.34, cy - R * 0.05, R * 0.04, R * 0.04, "#fff");
    ctx.strokeStyle = "#3a2f55"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, cy + R * 0.3, R * 0.14, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.restore();
  };

  // Boss-Kobold: riesig, mit Krone und Knüppel
  ART.drawBoss = function (ctx, x, y, scale, o) {
    o = o || {};
    const walk = o.walk || 0, hurt = o.hurt || 0, face = o.face || 1, atk = o.atk;
    const bob = Math.sin(walk * Math.PI * 2) * scale * 0.02;
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 20));
    const R = scale * 0.30;
    // Füße
    ell(ctx, -scale * 0.12, -scale * 0.05, scale * 0.09, scale * 0.06, "#7a4a2b");
    ell(ctx, scale * 0.12, -scale * 0.05, scale * 0.09, scale * 0.06, "#7a4a2b");
    // Körper
    ell(ctx, 0, -R - scale * 0.04 + bob, R * 1.05, R * 0.95, "#8a5fbf", "#5a3a8a", 2.5);
    // Bauchplatte
    ell(ctx, 0, -R + bob, R * 0.62, R * 0.55, "#c9aef0");
    // Arme
    const armY = -R * 1.15 + bob;
    if (atk !== undefined && atk > 0) {
      const ang = -2.0 + atk * 2.9;
      ctx.save(); ctx.translate(-scale * 0.16, armY); ctx.rotate(-ang);
      ell(ctx, -scale * 0.12, 0, scale * 0.07, scale * 0.06, "#8a5fbf");
      rrect(ctx, -scale * 0.42, -scale * 0.035, scale * 0.30, scale * 0.07, scale * 0.03, "#8a5a33");
      ell(ctx, -scale * 0.47, 0, scale * 0.11, scale * 0.11, "#9b7bd6", "#5a3a8a", 2);
      ctx.restore();
      ell(ctx, scale * 0.18, armY, scale * 0.07, scale * 0.06, "#7a51ad");
    } else {
      ell(ctx, -scale * 0.22, armY, scale * 0.07, scale * 0.06, "#7a51ad");
      ell(ctx, scale * 0.22, armY, scale * 0.07, scale * 0.06, "#7a51ad");
    }
    // Kopf
    ell(ctx, 0, -R * 2.35 + bob, R * 0.72, R * 0.68, "#9b76d6", "#5a3a8a", 2.5);
    // Hörnchen
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * R * 0.45, -R * 2.85 + bob); ctx.lineTo(s * R * 0.68, -R * 3.25 + bob); ctx.lineTo(s * R * 0.75, -R * 2.7 + bob);
      ctx.closePath(); ctx.fillStyle = "#f5efe2"; ctx.fill(); ctx.strokeStyle = "#5a3a8a"; ctx.stroke();
    }
    // Kulleraugen (wütend-süß, mit Glitzer)
    for (const s of [-1, 1]) {
      ell(ctx, s * R * 0.26, -R * 2.4 + bob, R * 0.15, R * 0.17, "#ffffff", "#2b2340", 1.5);
      ell(ctx, s * R * 0.26, -R * 2.38 + bob, R * 0.10, R * 0.12, "#3b2d5e");
      ell(ctx, s * R * 0.26 - R * 0.05, -R * 2.46 + bob, R * 0.05, R * 0.04, "#ffffff");
    }
    // dicker Braunstrich (wütend, aber niedlich)
    ctx.strokeStyle = "#3a2f55"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-R * 0.42, -R * 2.62 + bob); ctx.lineTo(-R * 0.1, -R * 2.52 + bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R * 0.42, -R * 2.62 + bob); ctx.lineTo(R * 0.1, -R * 2.52 + bob); ctx.stroke();
    // Zahn Mund
    ctx.strokeStyle = "#3a2f55"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -R * 2.1 + bob, R * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
    // Krone mittig
    const r = R * 0.72;
    ctx.save(); ctx.translate(x, y - R * 3.15 + bob);
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0); ctx.lineTo(-r * 0.5, -r * 0.4); ctx.lineTo(-r * 0.2, -r * 0.14);
    ctx.lineTo(0, -r * 0.5); ctx.lineTo(r * 0.2, -r * 0.14); ctx.lineTo(r * 0.5, -r * 0.4);
    ctx.lineTo(r * 0.5, 0); ctx.closePath();
    ctx.fillStyle = "#ffd75e"; ctx.fill(); ctx.strokeStyle = "#b8801f"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  };

  // ---------- Items ----------
  ART.drawCoin = function (ctx, x, y, s) {
    ell(ctx, x, y, s * 0.35, s * 0.35, "#ffd75e", "#b8801f", 2);
    ell(ctx, x - s * 0.1, y - s * 0.12, s * 0.10, s * 0.08, "rgba(255,255,255,.8)");
  };
  ART.drawMushroom = function (ctx, x, y, s) {
    ell(ctx, x, y - s * 0.12, s * 0.13, s * 0.14, "#f5efe2", "#c9bfa8", 1.5);
    ctx.beginPath(); ctx.arc(x, y - s * 0.18, s * 0.30, Math.PI, 0);
    ctx.closePath(); ctx.fillStyle = "#ff5d73"; ctx.fill(); ctx.strokeStyle = "#c23a4e"; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, x - s * 0.12, y - s * 0.30, s * 0.06, s * 0.05, "#fff");
    ell(ctx, x + s * 0.12, y - s * 0.28, s * 0.05, s * 0.04, "#fff");
  };
  ART.drawPotion = function (ctx, x, y, s) {
    rrect(ctx, x - s * 0.10, y - s * 0.34, s * 0.20, s * 0.10, s * 0.03, "#a86b3c");
    ell(ctx, x, y - s * 0.10, s * 0.16, s * 0.18, "#ff5d73", "#c23a4e", 2);
    ell(ctx, x - s * 0.05, y - s * 0.16, s * 0.05, s * 0.05, "rgba(255,255,255,.7)");
  };

  // Treppe (Loch mit Brett)
  ART.drawStairs = function (ctx, x, y, s) {
    ell(ctx, x, y, s * 0.9, s * 0.45, "#120b26");
    ctx.strokeStyle = "#5a4a80"; ctx.lineWidth = 3; ctx.stroke();
    ell(ctx, x, y - s * 0.06, s * 0.62, s * 0.28, "#241741");
    rrect(ctx, x - s * 0.75, y - s * 0.30, s * 1.5, s * 0.16, s * 0.05, "#8a5a33", "#5a3a1f", 2);
  };
  // Portal
  ART.drawPortal = function (ctx, x, y, s, t) {
    const pul = 1 + Math.sin(t * 3) * 0.08;
    ell(ctx, x, y, s * 0.85, s * 0.55 * pul, "rgba(150,80,255,.28)");
    ell(ctx, x, y, s * 0.6, s * 0.4 * pul, "rgba(200,140,255,.5)", "#c9a0ff", 2.5);
    for (let i = 0; i < 5; i++) {
      const a = t * 2 + i * 1.256;
      ell(ctx, x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.22 - s * 0.1, s * 0.06, s * 0.06, "#e6d5ff");
    }
  };

  // Mini-Icon (für Rucksack-Liste)
  ART.drawIcon = function (ctx, kind, x, y, s) {
    if (kind === "coin") ART.drawCoin(ctx, x, y, s);
    else if (kind === "mushroom") ART.drawMushroom(ctx, x, y, s);
    else ART.drawPotion(ctx, x, y, s);
  };

  window.Art = ART;
  window.ART = ART;
})();