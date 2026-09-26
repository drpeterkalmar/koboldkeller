/* art.js — prozedurale Chibi-Grafik, alles in Offscreen-Caches (MIT)
   Design-Einheit: 1 px bei Kachelbreite U = 64. K = Pixel pro Design-Einheit. */
import { shade, rgba, hexRgb, TAU, mulberry32 } from "./util.js";

let K = 1;
const cache = new Map();
export const artScale = () => K;
export function setArtScale(k) {
  k = Math.round(k * 100) / 100;
  if (k !== K) { K = k; cache.clear(); }
}
export function clearArt() { cache.clear(); }
export function artCount() { return cache.size; }

/** Sprite holen oder erzeugen. w,h,ax,ay in Design-Einheiten. */
export function spr(key, w, h, ax, ay, fn) {
  key += "@" + K;
  let s = cache.get(key);
  if (s) return s;
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w * K)); cv.height = Math.max(1, Math.ceil(h * K));
  const c = cv.getContext("2d");
  c.scale(K, K); c.lineJoin = "round"; c.lineCap = "round";
  fn(c, w, h);
  s = { cv, w, h, ax, ay };
  cache.set(key, s);
  return s;
}
function derive(s, fill, op) {
  const cv = document.createElement("canvas");
  cv.width = s.cv.width; cv.height = s.cv.height;
  const c = cv.getContext("2d");
  c.drawImage(s.cv, 0, 0);
  c.globalCompositeOperation = op;
  c.fillStyle = fill; c.fillRect(0, 0, cv.width, cv.height);
  return { cv, w: s.w, h: s.h, ax: s.ax, ay: s.ay };
}
/** Weiße Silhouette (Treffer-Blitz) — am Sprite selbst gecacht */
export function flashOf(s) { return s.flash || (s.flash = derive(s, "#fff", "source-atop")); }
/** Farbige Variante eines (weißen) Sprites */
export function tinted(s, color) {
  const t = s.tints || (s.tints = {});
  return t[color] || (t[color] = derive(s, color, "source-atop"));
}
/** Farbe multiplizieren (Einfärben mit Schattierung erhalten) */
export function multiplied(s, color) {
  const t = s.mults || (s.mults = {});
  if (t[color]) return t[color];
  const d = derive(s, color, "multiply");
  const c = d.cv.getContext("2d"); c.globalCompositeOperation = "destination-in"; c.drawImage(s.cv, 0, 0);
  return (t[color] = d);
}

// ---------- Zeichen-Helfer ----------
function ol(c, path, fill, stroke, lw = 3) {
  c.beginPath(); path(c);
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
  c.fillStyle = fill; c.fill();
}
/** weiche Licht-/Schattenschicht innerhalb eines Pfads */
function shadeIn(c, path, x, y, r, hi = 0.38, lo = 0.22) {
  c.save(); c.beginPath(); path(c); c.clip();
  let g = c.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.05, x - r * 0.2, y - r * 0.3, r * 1.1);
  g.addColorStop(0, "rgba(255,255,255," + hi + ")"); g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(40,10,60," + lo + ")");
  c.fillStyle = g; c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  c.restore();
}
function ell(x, y, rx, ry, rot = 0) { return (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function star4(c, x, y, r, col) {
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.fillStyle = col; c.fill();
}
function star5(c, x, y, r, r2, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? r2 : r;
    i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
function heartPath(c, x, y, s) {
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.4);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
}
export { heartPath, star5 };

// =====================================================================
// XXL-Glitzeraugen
// =====================================================================
function eyeOpen(c, x, y, col, s = 1, look = 0, side = 0) {
  c.beginPath(); c.ellipse(x, y, 9.4 * s, 11.8 * s, 0, 0, TAU); c.fillStyle = "#1b1030"; c.fill();
  const g = c.createLinearGradient(x, y - 11 * s, x, y + 11 * s);
  g.addColorStop(0, "#150b26"); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, 0.6));
  c.beginPath(); c.ellipse(x + look, y + 0.6 * s, 7.8 * s, 10.2 * s, 0, 0, TAU); c.fillStyle = g; c.fill();
  c.beginPath(); c.ellipse(x + look, y + 1.2 * s, 3.8 * s, 5 * s, 0, 0, TAU); c.fillStyle = "rgba(12,6,24,.7)"; c.fill();
  // Glitzer
  c.fillStyle = "#fff";
  c.beginPath(); c.ellipse(x - 3.1 * s + look, y - 4.4 * s, 3.5 * s, 4.4 * s, -0.3, 0, TAU); c.fill();
  c.beginPath(); c.arc(x + 3.4 * s + look, y + 5 * s, 1.8 * s, 0, TAU); c.fill();
  c.globalAlpha = 0.85; star4(c, x + 3.8 * s + look, y - 5.6 * s, 2.6 * s, "#fff"); c.globalAlpha = 1;
  c.beginPath(); c.arc(x - 4.6 * s + look, y + 4.2 * s, 1 * s, 0, TAU); c.fillStyle = "rgba(255,255,255,.7)"; c.fill();
  // Wimpern-Schwung außen
  c.strokeStyle = "#1b1030"; c.lineWidth = 1.8 * s;
  const sx = side || (x < 60 ? -1 : 1);
  c.beginPath(); c.moveTo(x + sx * 7.5 * s, y - 8 * s); c.lineTo(x + sx * 11.2 * s, y - 10.5 * s); c.stroke();
}
function eyeClosed(c, x, y, s = 1) {
  c.strokeStyle = "#1b1030"; c.lineWidth = 2.6 * s;
  c.beginPath(); c.arc(x, y + 2 * s, 7 * s, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
}
function eyeHurt(c, x, y, s = 1, side = 0) {
  c.strokeStyle = "#1b1030"; c.lineWidth = 2.8 * s;
  const d = side ? -side : (x < 60 ? 1 : -1);
  c.beginPath(); c.moveTo(x - d * 6 * s, y - 5 * s); c.lineTo(x + d * 5 * s, y); c.lineTo(x - d * 6 * s, y + 5 * s); c.stroke();
}

// =====================================================================
// Köpfe (Box 120×132, Kopfmitte 60/80, Hals-Anker 60/112)
// =====================================================================
const HX = 60, HY = 80, HR = 34;
export function head(look, mood = "open") {
  const key = "head:" + look.id + ":" + look.skin + ":" + mood;
  return spr(key, 120, 132, 60, 112, (c) => drawHead(c, look, mood));
}
function drawHead(c, o, mood) {
  const skin = o.skin, line = shade(skin, -0.55), inner = "#ffb3c7";
  const dk = shade(skin, -0.18);
  // --- Ohren hinten ---
  const ear = (path, fillIn) => { ol(c, path, skin, line, 3.2); if (fillIn) { c.beginPath(); fillIn(c); c.fillStyle = inner; c.fill(); } };
  switch (o.ears) {
    case "pointy":
      for (const s of [-1, 1]) ear((c) => { c.moveTo(HX + s * 24, HY - 16); c.quadraticCurveTo(HX + s * 58, HY - 34, HX + s * 60, HY - 42); c.quadraticCurveTo(HX + s * 48, HY - 12, HX + s * 28, HY + 4); c.closePath(); },
        (c) => { c.moveTo(HX + s * 30, HY - 12); c.quadraticCurveTo(HX + s * 50, HY - 28, HX + s * 54, HY - 36); c.quadraticCurveTo(HX + s * 44, HY - 14, HX + s * 32, HY - 2); c.closePath(); });
      break;
    case "round":
      for (const s of [-1, 1]) ear(ell(HX + s * 24, HY - 28, 12, 12), ell(HX + s * 24, HY - 27, 6.5, 6.5));
      break;
    case "bunny":
      for (const s of [-1, 1]) ear(ell(HX + s * 15, HY - 52, 10, 27, s * 0.18), ell(HX + s * 15, HY - 50, 5, 20, s * 0.18));
      break;
    case "panda":
      for (const s of [-1, 1]) {
        ol(c, (c) => { c.moveTo(HX + s * 12, HY - 28); c.quadraticCurveTo(HX + s * 34, HY - 58, HX + s * 36, HY - 22); c.closePath(); }, "#fff6ee", line, 3.2);
        c.beginPath(); c.moveTo(HX + s * 16, HY - 28); c.quadraticCurveTo(HX + s * 32, HY - 50, HX + s * 33, HY - 24); c.closePath(); c.fillStyle = skin; c.fill();
      }
      break;
    case "cat":
      for (const s of [-1, 1]) ear((c) => { c.moveTo(HX + s * 10, HY - 28); c.quadraticCurveTo(HX + s * 30, HY - 64, HX + s * 34, HY - 18); c.closePath(); },
        (c) => { c.moveTo(HX + s * 16, HY - 27); c.quadraticCurveTo(HX + s * 29, HY - 52, HX + s * 30, HY - 22); c.closePath(); });
      break;
    case "fox":
      for (const s of [-1, 1]) {
        ear((c) => { c.moveTo(HX + s * 6, HY - 26); c.quadraticCurveTo(HX + s * 34, HY - 78, HX + s * 38, HY - 14); c.closePath(); },
          (c) => { c.moveTo(HX + s * 13, HY - 26); c.quadraticCurveTo(HX + s * 32, HY - 62, HX + s * 33, HY - 20); c.closePath(); });
        c.save(); c.beginPath(); c.moveTo(HX + s * 6, HY - 26); c.quadraticCurveTo(HX + s * 34, HY - 78, HX + s * 38, HY - 14); c.closePath(); c.clip();
        c.fillStyle = "#4a2a1a"; c.fillRect(HX + (s < 0 ? -44 : 14), HY - 80, 30, 24); c.restore();
      }
      break;
    case "dragon":
      for (const s of [-1, 1]) {
        ol(c, (c) => { c.moveTo(HX + s * 34, HY + 2); c.lineTo(HX + s * 52, HY - 8); c.lineTo(HX + s * 46, HY + 6); c.lineTo(HX + s * 54, HY + 12); c.lineTo(HX + s * 34, HY + 14); c.closePath(); }, o.hair, shade(o.hair, -0.5), 2.6);
      }
      break;
  }
  // --- Kopf ---
  const hp = ell(HX, HY, HR + 2, HR - 0.5);
  ol(c, hp, skin, line, 3.4);
  shadeIn(c, hp, HX, HY, HR, 0.42, 0.2);
  // Gesichtszeichnungen
  c.save(); c.beginPath(); hp(c); c.clip();
  if (o.ears === "panda") {
    c.fillStyle = "#fff6ee";
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(HX + s * 20, HY + 16, 13, 10, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(HX + s * 12, HY - 12, 5, 3.5, s * 0.3, 0, TAU); c.fill(); }
    c.beginPath(); c.ellipse(HX, HY + 20, 12, 9, 0, 0, TAU); c.fill();
  } else if (o.ears === "fox") {
    c.fillStyle = "#fff4e6";
    c.beginPath(); c.moveTo(HX - 36, HY + 6); c.quadraticCurveTo(HX, HY - 2, HX + 36, HY + 6); c.lineTo(HX + 36, HY + 40); c.lineTo(HX - 36, HY + 40); c.fill();
  } else if (o.ears === "octo") {
    c.fillStyle = shade(skin, 0.35);
    for (const [dx, dy, r] of [[-20, -18, 4], [-11, -25, 3], [19, -20, 3.6], [26, -9, 2.4]]) { c.beginPath(); c.arc(HX + dx, HY + dy, r, 0, TAU); c.fill(); }
  } else if (o.ears === "bunny" || o.ears === "cat") {
    c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(HX, HY + 20, 14, 9, 0, 0, TAU); c.fill();
  }
  c.restore();
  // Haar-Locke / Hörner
  if (o.ears === "pointy" || o.ears === "round") {
    ol(c, (c) => { c.moveTo(HX - 10, HY - 30); c.quadraticCurveTo(HX - 6, HY - 50, HX + 8, HY - 46); c.quadraticCurveTo(HX - 2, HY - 42, HX + 4, HY - 30); c.closePath(); }, o.hair, shade(o.hair, -0.5), 2.6);
  } else if (o.ears === "octo") {
    c.strokeStyle = line; c.lineWidth = 5.5; c.beginPath(); c.moveTo(HX, HY - 32); c.quadraticCurveTo(HX + 2, HY - 48, HX + 12, HY - 46); c.stroke();
    c.strokeStyle = skin; c.lineWidth = 3; c.stroke();
  } else if (o.ears === "dragon") {
    for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(HX + s * 10, HY - 30); c.quadraticCurveTo(HX + s * 18, HY - 52, HX + s * 24, HY - 50); c.quadraticCurveTo(HX + s * 20, HY - 40, HX + s * 22, HY - 26); c.closePath(); }, "#fff2c9", "#8a6a2a", 2.6);
  }
  // Wangen
  c.fillStyle = "rgba(255,105,150,.42)";
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(HX + s * 23, HY + 15, 7, 4.5, 0, 0, TAU); c.fill(); }
  // Augen
  const ey = HY + 4, ex = 14.5;
  if (mood === "blink") { eyeClosed(c, HX - ex, ey); eyeClosed(c, HX + ex, ey); }
  else if (mood === "hurt") { eyeHurt(c, HX - ex, ey); eyeHurt(c, HX + ex, ey); }
  else { eyeOpen(c, HX - ex, ey, o.eye); eyeOpen(c, HX + ex, ey, o.eye); }
  if (mood === "angry") {
    c.strokeStyle = "#2a1020"; c.lineWidth = 4.2;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(HX + s * 24, HY - 13); c.lineTo(HX + s * 7, HY - 7); c.stroke(); }
  }
  // Mund
  c.strokeStyle = "#3a1622"; c.lineWidth = 2.2;
  if (mood === "hurt") { c.beginPath(); c.ellipse(HX, HY + 21, 3.4, 4, 0, 0, TAU); c.fillStyle = "#7a2a3a"; c.fill(); }
  else if (o.ears === "cat" || o.ears === "fox" || o.ears === "panda" || o.ears === "bunny") {
    c.beginPath(); c.arc(HX - 3.2, HY + 18, 3.3, 0.1, Math.PI - 0.2); c.stroke();
    c.beginPath(); c.arc(HX + 3.2, HY + 18, 3.3, 0.2, Math.PI - 0.1); c.stroke();
    c.fillStyle = "#6b2a3a"; c.beginPath(); c.ellipse(HX, HY + 14.5, 2.4, 1.6, 0, 0, TAU); c.fill();
  } else if (mood === "angry") {
    c.beginPath(); c.moveTo(HX - 6, HY + 22); c.quadraticCurveTo(HX, HY + 17, HX + 6, HY + 22); c.stroke();
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(HX - 5, HY + 20.5); c.lineTo(HX - 3, HY + 25); c.lineTo(HX - 1, HY + 19.5); c.fill();
  } else {
    c.beginPath(); c.moveTo(HX - 5, HY + 18); c.quadraticCurveTo(HX, HY + 24, HX + 5, HY + 18); c.stroke();
  }
  if (o.ears === "cat") {
    c.strokeStyle = "rgba(60,30,20,.55)"; c.lineWidth = 1.4;
    for (const s of [-1, 1]) for (const d of [-3, 3]) { c.beginPath(); c.moveTo(HX + s * 28, HY + 14 + d * 0.6); c.lineTo(HX + s * 42, HY + 12 + d); c.stroke(); }
  }
}

// =====================================================================
// Körper (Box 90×72, Anker Füße-Mitte 45/66)
// =====================================================================
const BX = 45, BY = 66;
export function body(look, outfit, cape) {
  const key = "body:" + look.id + ":" + outfit + ":" + (cape || "");
  return spr(key, 90, 72, BX, BY, (c) => drawBody(c, look, outfit, cape));
}
function drawBody(c, o, outfit, cape) {
  const skin = o.skin, line = shade(skin, -0.55), oline = shade(outfit, -0.55);
  // Umhang (Bosse)
  if (cape) {
    ol(c, (c) => { c.moveTo(BX - 16, BY - 44); c.quadraticCurveTo(BX - 34, BY - 10, BX - 30, BY - 2); c.lineTo(BX + 30, BY - 2); c.quadraticCurveTo(BX + 34, BY - 10, BX + 16, BY - 44); c.closePath(); }, cape, shade(cape, -0.55), 3);
  }
  // Schwanz / Flügel hinten
  switch (o.ears) {
    case "fox":
      ol(c, (c) => { c.moveTo(BX + 10, BY - 14); c.quadraticCurveTo(BX + 44, BY - 18, BX + 40, BY - 44); c.quadraticCurveTo(BX + 30, BY - 22, BX + 8, BY - 24); c.closePath(); }, skin, line, 3);
      c.beginPath(); c.ellipse(BX + 39, BY - 41, 5, 6, 0.4, 0, TAU); c.fillStyle = "#fff4e6"; c.fill();
      break;
    case "cat": case "panda":
      c.strokeStyle = line; c.lineWidth = 10; c.beginPath(); c.moveTo(BX + 12, BY - 14); c.quadraticCurveTo(BX + 36, BY - 16, BX + 34, BY - 38); c.stroke();
      c.strokeStyle = skin; c.lineWidth = 6.5; c.stroke();
      if (o.ears === "panda") { c.strokeStyle = "#7a3b22"; c.lineWidth = 6.5; c.setLineDash([4, 5]); c.stroke(); c.setLineDash([]); }
      break;
    case "bunny": case "round":
      ol(c, ell(BX + 16, BY - 14, 7, 7), o.ears === "bunny" ? "#fff" : skin, line, 2.6); break;
    case "dragon":
      for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(BX + s * 10, BY - 38); c.quadraticCurveTo(BX + s * 34, BY - 58, BX + s * 36, BY - 34); c.quadraticCurveTo(BX + s * 26, BY - 36, BX + s * 22, BY - 26); c.closePath(); }, shade(skin, -0.1), line, 2.8);
      ol(c, (c) => { c.moveTo(BX + 10, BY - 10); c.quadraticCurveTo(BX + 34, BY - 4, BX + 38, BY - 18); c.lineTo(BX + 30, BY - 14); c.quadraticCurveTo(BX + 22, BY - 12, BX + 8, BY - 20); c.closePath(); }, skin, line, 2.8);
      break;
  }
  // Arme (Stummel)
  for (const s of [-1, 1]) ol(c, ell(BX + s * 20, BY - 26, 6.5, 9, s * -0.5), skin, line, 2.8);
  // Rumpf (Birne)
  const torso = (c) => {
    c.moveTo(BX - 13, BY - 44);
    c.bezierCurveTo(BX - 22, BY - 34, BX - 24, BY - 10, BX - 18, BY - 6);
    c.quadraticCurveTo(BX, BY + 1, BX + 18, BY - 6);
    c.bezierCurveTo(BX + 24, BY - 10, BX + 22, BY - 34, BX + 13, BY - 44);
    c.quadraticCurveTo(BX, BY - 48, BX - 13, BY - 44); c.closePath();
  };
  if (o.ears === "octo") {
    // Tentakel-Rock
    for (let i = -2; i <= 2; i++) ol(c, ell(BX + i * 8, BY - 8, 5.5, 9, i * 0.25), skin, line, 2.6);
  }
  ol(c, torso, outfit, oline, 3);
  shadeIn(c, torso, BX, BY - 24, 22, 0.35, 0.3);
  // Kragen + Herz-Knopf
  c.save(); c.beginPath(); torso(c); c.clip();
  c.fillStyle = shade(outfit, 0.45); c.beginPath(); c.ellipse(BX, BY - 44, 16, 6, 0, 0, TAU); c.fill();
  c.fillStyle = shade(outfit, -0.22); c.fillRect(BX - 30, BY - 18, 60, 5);
  c.restore();
  c.beginPath(); heartPath(c, BX, BY - 30, 4.6); c.fillStyle = "#fff4f8"; c.fill();
}
/** Fuß (Box 18×12, Anker Mitte) */
export function foot(col) {
  return spr("foot:" + col, 18, 12, 9, 6, (c) => {
    ol(c, ell(9, 6, 7, 4.6), col, shade(col, -0.55), 2.4);
    c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(7, 4.4, 3, 1.4, 0, 0, TAU); c.fill();
  });
}

// =====================================================================
// Hüte (Box 90×70, Anker 45/58 = Kopf-Oberkante)
// =====================================================================
export function hat(id, red) {
  return spr("hat:" + id + (red ? ":r" : ""), 90, 70, 45, 58, (c) => {
    const X = 45, Y = 58;
    switch (id) {
      case "pilz": {
        const cap = (c) => { c.moveTo(X - 34, Y); c.quadraticCurveTo(X - 34, Y - 40, X, Y - 42); c.quadraticCurveTo(X + 34, Y - 40, X + 34, Y); c.quadraticCurveTo(X, Y + 6, X - 34, Y); };
        ol(c, cap, "#ff4f6d", "#8a1a2e", 3);
        shadeIn(c, cap, X, Y - 20, 30);
        c.fillStyle = "#fff"; for (const [dx, dy, r] of [[-16, -18, 6], [8, -28, 5], [20, -12, 4.5], [-2, -10, 3.5]]) { c.beginPath(); c.arc(X + dx, Y + dy, r, 0, TAU); c.fill(); }
        break;
      }
      case "diadem": {
        ol(c, (c) => { c.moveTo(X - 28, Y + 2); c.quadraticCurveTo(X, Y - 10, X + 28, Y + 2); c.lineTo(X + 26, Y - 4); c.quadraticCurveTo(X, Y - 16, X - 26, Y - 4); c.closePath(); }, "#ffd75e", "#8a6212", 2.6);
        ol(c, (c) => { c.moveTo(X, Y - 30); c.lineTo(X + 8, Y - 16); c.lineTo(X, Y - 6); c.lineTo(X - 8, Y - 16); c.closePath(); }, "#7fe3ff", "#1f5f8a", 2.6);
        c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.moveTo(X - 2, Y - 24); c.lineTo(X + 2, Y - 17); c.lineTo(X - 3, Y - 15); c.fill();
        break;
      }
      case "schleife": {
        for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(X, Y - 18); c.bezierCurveTo(X + s * 14, Y - 44, X + s * 40, Y - 34, X + s * 30, Y - 14); c.bezierCurveTo(X + s * 24, Y - 4, X + s * 10, Y - 10, X, Y - 18); }, "#ff7fc0", "#9a1f5e", 3);
        ol(c, ell(X, Y - 18, 8, 7), "#ff4fa0", "#9a1f5e", 3);
        break;
      }
      case "pudel": {
        ol(c, (c) => { c.moveTo(X - 33, Y + 2); c.quadraticCurveTo(X - 32, Y - 38, X, Y - 38); c.quadraticCurveTo(X + 32, Y - 38, X + 33, Y + 2); c.closePath(); }, "#5fa8ff", "#1f4f8a", 3);
        c.save(); c.clip(); c.fillStyle = "#fff"; for (let i = 0; i < 3; i++) c.fillRect(X - 40, Y - 28 + i * 11, 80, 4); c.restore();
        ol(c, (c) => c.roundRect(X - 35, Y - 6, 70, 11, 5), "#e8f4ff", "#1f4f8a", 3);
        ol(c, ell(X, Y - 42, 9, 9), "#fff", "#8aa6c8", 2.6);
        break;
      }
      case "krone": case "bosskrone": {
        const gold = red ? "#ff3b3b" : "#ffd75e", gl = red ? "#7a0a0a" : "#8a6212";
        const crown = (c) => { c.moveTo(X - 28, Y); c.lineTo(X - 30, Y - 28); c.lineTo(X - 15, Y - 14); c.lineTo(X, Y - 36); c.lineTo(X + 15, Y - 14); c.lineTo(X + 30, Y - 28); c.lineTo(X + 28, Y); c.closePath(); };
        ol(c, crown, gold, gl, 3);
        shadeIn(c, crown, X, Y - 16, 26, 0.45, 0.25);
        const gem = red ? "#ffd75e" : "#ff4f6d";
        for (const [dx, dy] of [[-15, -6], [0, -8], [15, -6]]) { c.beginPath(); c.arc(X + dx, Y + dy, 3.8, 0, TAU); c.fillStyle = gem; c.fill(); }
        for (const [dx, dy] of [[-30, -28], [0, -36], [30, -28]]) { c.beginPath(); c.arc(X + dx, Y + dy, 3.4, 0, TAU); c.fillStyle = "#fff6c0"; c.fill(); }
        break;
      }
      case "veteran": {
        ol(c, (c) => { c.moveTo(X - 32, Y + 2); c.quadraticCurveTo(X - 30, Y - 34, X, Y - 34); c.quadraticCurveTo(X + 30, Y - 34, X + 32, Y + 2); c.closePath(); }, "#8a5cff", "#3a1f8a", 3);
        ol(c, (c) => c.ellipse(X + 16, Y + 1, 22, 6, 0, 0, TAU), "#6a3cdf", "#3a1f8a", 3);
        c.beginPath(); star5(c, X - 2, Y - 17, 10, 4.5); c.fillStyle = "#ffd75e"; c.fill(); c.strokeStyle = "#8a6212"; c.lineWidth = 2; c.stroke();
        break;
      }
      case "zipfel": {
        ol(c, (c) => { c.moveTo(X - 30, Y + 2); c.quadraticCurveTo(X - 10, Y - 30, X + 30, Y - 56); c.quadraticCurveTo(X + 20, Y - 20, X + 30, Y + 2); c.closePath(); }, red ? "#ff4f4f" : "#ff6f91", "#7a1a2e", 3);
        ol(c, ell(X + 30, Y - 56, 6, 6), "#fff", "#aaa", 2);
        break;
      }
    }
  });
}

// =====================================================================
// Waffen (Box 80×26, Anker Griff 10/13, zeigt nach rechts)
// =====================================================================
export function weapon(key) {
  return spr("wpn:" + key, 80, 26, 10, 13, (c) => {
    const Y = 13;
    const grip = () => { ol(c, (c) => c.roundRect(2, Y - 3.5, 16, 7, 3), "#8a5a33", "#3a2010", 2.4); ol(c, (c) => c.roundRect(16, Y - 9, 5, 18, 2.5), "#ffd75e", "#8a6212", 2.2); };
    switch (key) {
      case "stick":
        ol(c, (c) => { c.moveTo(4, Y - 4); c.lineTo(50, Y - 8); c.quadraticCurveTo(64, Y, 50, Y + 8); c.lineTo(4, Y + 4); c.closePath(); }, "#e3b36a", "#6a4418", 2.6);
        c.strokeStyle = "rgba(120,70,20,.5)"; c.lineWidth = 1.4;
        for (let x = 22; x < 56; x += 7) { c.beginPath(); c.moveTo(x, Y - 7); c.lineTo(x + 5, Y + 7); c.stroke(); c.beginPath(); c.moveTo(x + 5, Y - 7); c.lineTo(x, Y + 7); c.stroke(); }
        break;
      default: {
        const col = { wood: ["#e8c38a", "#7a5020"], crystal: ["#8ff0ff", "#1f6f9a"], star: ["#fff08a", "#9a7a12"], rainbow: ["#ffb3f0", "#8a2a7a"] }[key];
        const blade = (c) => { c.moveTo(20, Y - 5.5); c.lineTo(66, Y - 5); c.lineTo(78, Y); c.lineTo(66, Y + 5); c.lineTo(20, Y + 5.5); c.closePath(); };
        ol(c, blade, col[0], col[1], 2.6);
        if (key === "rainbow") {
          c.save(); c.beginPath(); blade(c); c.clip();
          const g = c.createLinearGradient(20, 0, 78, 0);
          ["#ff7a9a", "#ffc56e", "#fff38a", "#8ff08a", "#8fd8ff", "#c79bff"].forEach((h, i) => g.addColorStop(i / 5, h));
          c.fillStyle = g; c.fillRect(18, 0, 64, 26); c.restore();
        }
        c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.moveTo(22, Y - 3); c.lineTo(66, Y - 3); c.lineTo(74, Y); c.lineTo(22, Y - 1); c.fill();
        if (key === "star") { c.beginPath(); star5(c, 64, Y, 8, 3.6); c.fillStyle = "#fff"; c.fill(); }
        grip();
      }
    }
  });
}
/** Seifenblasen-Stab (Box 60×30, Anker 8/15) */
export function wand(n) {
  const tier = Math.min(3, Math.floor((n - 1) / 2));
  return spr("wand:" + tier, 60, 30, 8, 15, (c) => {
    ol(c, (c) => c.roundRect(4, 12, 38, 6, 3), "#c79bff", "#4a2a8a", 2.4);
    const col = ["#9be1ff", "#b3ffcf", "#ffd1f0", "#fff38a"][tier];
    ol(c, (c) => c.arc(48, 15, 9 + tier, 0, TAU), "rgba(255,255,255,.2)", col, 3.4);
    c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(45, 11, 2.2, 0, TAU); c.fill();
  });
}

// =====================================================================
// Portrait (für Menü) — zeichnet den Kobold in ein eigenes Canvas
// =====================================================================
export const RIG = { neck: -36, footX: 9, footY: -2 };
export function portrait(cv, look, hatId, px = 96) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(px * dpr); cv.height = Math.round(px * dpr);
  const c = cv.getContext("2d");
  const kSave = K; K = Math.round(px * dpr / 172 * 100) / 100;
  const put = (s, x, y) => c.drawImage(s.cv, (x - s.ax) * K, (y - s.ay) * K);
  const fl = foot(shade(look.outfit, -0.35));
  const gx = 86, gy = 166;
  put(fl, gx - RIG.footX, gy + RIG.footY); put(fl, gx + RIG.footX, gy + RIG.footY);
  put(body(look, look.outfit), gx, gy);
  put(head(look, "open"), gx, gy + RIG.neck);
  if (hatId) put(hat(hatId), gx, gy + RIG.neck - 32 - 26);
  K = kSave;
}

// =====================================================================
// Gegner — alle niedlich-frech. Anker = Bodenmitte (Flieger schweben per z)
// =====================================================================
function brows(c, x, y, d, s = 1) {
  c.strokeStyle = "#2a1020"; c.lineWidth = 2.6 * s;
  for (const k of [-1, 1]) { c.beginPath(); c.moveTo(x + k * (d + 7 * s), y - 3 * s); c.lineTo(x + k * (d - 3 * s), y + 1.5 * s); c.stroke(); }
}
function twoEyes(c, x, y, d, col, s, mood) {
  if (mood === "hurt") { eyeHurt(c, x - d, y, s, -1); eyeHurt(c, x + d, y, s, 1); }
  else { eyeOpen(c, x - d, y, col, s, 0, -1); eyeOpen(c, x + d, y, col, s, 0, 1); }
}
function blush(c, x, y, d, s = 1) {
  c.fillStyle = "rgba(255,105,150,.45)";
  for (const k of [-1, 1]) { c.beginPath(); c.ellipse(x + k * d, y, 5 * s, 3 * s, 0, 0, TAU); c.fill(); }
}
export function enemySprite(type, tint, mood = "open") {
  const key = "en:" + type + ":" + tint + ":" + mood;
  switch (type) {
    case "bat": return spr(key, 64, 52, 32, 48, (c) => {
      const col = tint || "#8a5cd6", line = shade(col, -0.6);
      for (const k of [-1, 1]) ol(c, (c) => { c.moveTo(32 + k * 8, 18); c.lineTo(32 + k * 12, 2); c.lineTo(32 + k * 17, 16); c.closePath(); }, col, line, 2.6);
      const b = ell(32, 28, 19, 18); ol(c, b, col, line, 3); shadeIn(c, b, 32, 28, 18);
      c.fillStyle = shade(col, 0.45); c.beginPath(); c.ellipse(32, 36, 10, 7, 0, 0, TAU); c.fill();
      twoEyes(c, 32, 24, 8, "#ff5d9a", 0.62, mood); if (mood !== "hurt") brows(c, 32, 14, 8, 0.7);
      c.fillStyle = "#fff"; for (const k of [-1, 1]) { c.beginPath(); c.moveTo(32 + k * 2, 33); c.lineTo(32 + k * 4.5, 38); c.lineTo(32 + k * 6.5, 33); c.fill(); }
    });
    case "wing": return spr(key, 44, 34, 40, 14, (c) => {
      const col = tint || "#8a5cd6";
      ol(c, (c) => { c.moveTo(40, 12); c.quadraticCurveTo(22, -2, 3, 6); c.quadraticCurveTo(10, 12, 6, 20); c.quadraticCurveTo(14, 18, 16, 26); c.quadraticCurveTo(24, 18, 28, 26); c.quadraticCurveTo(32, 18, 40, 18); c.closePath(); }, shade(col, -0.15), shade(col, -0.6), 2.6);
    });
    case "slime": return spr(key, 70, 56, 35, 52, (c) => {
      const col = tint || "#7be07a", line = shade(col, -0.55);
      const b = (c) => { c.moveTo(5, 50); c.bezierCurveTo(2, 20, 20, 6, 35, 6); c.bezierCurveTo(50, 6, 68, 20, 65, 50); c.quadraticCurveTo(35, 56, 5, 50); c.closePath(); };
      c.globalAlpha = 0.92; ol(c, b, col, line, 3); c.globalAlpha = 1;
      shadeIn(c, b, 35, 30, 28, 0.5, 0.25);
      c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.ellipse(20, 18, 7, 4, -0.6, 0, TAU); c.fill();
      c.beginPath(); c.arc(29, 13, 2.2, 0, TAU); c.fill();
      twoEyes(c, 35, 32, 10, shade(col, -0.7), 0.66, mood); blush(c, 35, 42, 18, 0.9);
      c.strokeStyle = line; c.lineWidth = 2; c.beginPath(); c.arc(35, 42, 3, 0.2, Math.PI - 0.2); c.stroke();
    });
    case "wichtel": return spr(key, 64, 84, 32, 80, (c) => {
      const skin = "#ffc9a8", line = "#6a2a1a", cap = tint || "#e8434f";
      ol(c, ell(32, 66, 14, 13), "#6a8fd8", "#23336a", 2.8);
      for (const k of [-1, 1]) ol(c, ell(32 + k * 7, 78, 6, 4), "#5a3a2a", "#2a1a10", 2.4);
      const h = ell(32, 44, 17, 16); ol(c, h, skin, line, 3); shadeIn(c, h, 32, 44, 16);
      ol(c, (c) => { c.moveTo(16, 50); c.quadraticCurveTo(32, 76, 48, 50); c.quadraticCurveTo(32, 58, 16, 50); }, "#fff", "#b8b0c8", 2.4);
      ol(c, (c) => { c.moveTo(12, 38); c.quadraticCurveTo(26, 2, 50, 4); c.quadraticCurveTo(40, 14, 52, 38); c.quadraticCurveTo(32, 32, 12, 38); c.closePath(); }, cap, shade(cap, -0.6), 3);
      c.fillStyle = "#fff"; c.beginPath(); c.arc(50, 5, 4, 0, TAU); c.fill();
      twoEyes(c, 32, 44, 7, "#3a2a6b", 0.55, mood); if (mood !== "hurt") brows(c, 32, 36, 7, 0.6);
      c.fillStyle = "#ff9a8a"; c.beginPath(); c.arc(32, 50, 3, 0, TAU); c.fill();
    });
    case "wisp": return spr(key, 56, 64, 28, 58, (c) => {
      const col = tint || "#8fe9ff";
      const t = (c) => { c.moveTo(28, 58); c.bezierCurveTo(8, 48, 6, 22, 28, 14); c.bezierCurveTo(22, 4, 30, 0, 32, 2); c.bezierCurveTo(50, 12, 52, 46, 28, 58); c.closePath(); };
      const g = c.createRadialGradient(28, 38, 2, 28, 36, 24);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.35));
      ol(c, t, g, shade(col, -0.6), 2.6);
      twoEyes(c, 28, 38, 7, "#1f3b6e", 0.55, mood); blush(c, 28, 46, 12, 0.7);
    });
    case "kaefer": return spr(key, 76, 58, 38, 54, (c) => {
      const col = tint || "#6fb8ff", line = shade(col, -0.6);
      c.strokeStyle = "#2a2a4a"; c.lineWidth = 3;
      for (const k of [-1, 1]) for (const d of [-8, 2, 12]) { c.beginPath(); c.moveTo(38 + k * 18, 44 + d * 0.3); c.lineTo(38 + k * 30, 50 + d * 0.3); c.stroke(); }
      const sh = (c) => { c.moveTo(10, 44); c.bezierCurveTo(8, 16, 26, 10, 38, 10); c.bezierCurveTo(50, 10, 68, 16, 66, 44); c.quadraticCurveTo(38, 52, 10, 44); c.closePath(); };
      ol(c, sh, col, line, 3); shadeIn(c, sh, 38, 30, 26, 0.5, 0.3);
      c.strokeStyle = line; c.lineWidth = 2; c.beginPath(); c.moveTo(38, 12); c.lineTo(38, 46); c.stroke();
      for (const [x, y, h] of [[24, 18, 14], [38, 12, 18], [52, 18, 14], [30, 26, 10], [46, 26, 10]]) ol(c, (c) => { c.moveTo(x - 4, y + 4); c.lineTo(x, y - h); c.lineTo(x + 4, y + 4); c.closePath(); }, shade(col, 0.55), line, 2);
      ol(c, ell(38, 44, 13, 9), "#2c2c50", "#15152a", 2.4);
      twoEyes(c, 38, 44, 6, "#9fdcff", 0.42, mood);
    });
    case "pilzling": return spr(key, 70, 76, 35, 72, (c) => {
      const cap = tint || "#ff6fae";
      for (const k of [-1, 1]) ol(c, ell(35 + k * 8, 69, 6, 4), "#6a4a3a", "#2a1a10", 2.2);
      const st = ell(35, 52, 14, 17); ol(c, st, "#fff1dc", "#8a6a4a", 2.8); shadeIn(c, st, 35, 52, 16);
      twoEyes(c, 35, 52, 6.5, "#5a2a4a", 0.5, mood); blush(c, 35, 60, 10, 0.7);
      const cp = (c) => { c.moveTo(4, 38); c.bezierCurveTo(2, 8, 20, 2, 35, 2); c.bezierCurveTo(50, 2, 68, 8, 66, 38); c.quadraticCurveTo(35, 30, 4, 38); c.closePath(); };
      ol(c, cp, cap, shade(cap, -0.6), 3); shadeIn(c, cp, 35, 20, 28);
      c.fillStyle = "#fff"; for (const [x, y, r] of [[18, 18, 5], [36, 10, 4.5], [52, 20, 5.5], [30, 26, 3]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    });
    case "geist": return spr(key, 60, 70, 30, 66, (c) => {
      const col = tint || "#f4f6ff";
      const b = (c) => { c.moveTo(6, 60); c.bezierCurveTo(2, 20, 16, 6, 30, 6); c.bezierCurveTo(44, 6, 58, 20, 54, 60); c.quadraticCurveTo(48, 54, 42, 62); c.quadraticCurveTo(36, 54, 30, 62); c.quadraticCurveTo(24, 54, 18, 62); c.quadraticCurveTo(12, 54, 6, 60); c.closePath(); };
      c.globalAlpha = 0.9; ol(c, b, col, "#8a94c8", 2.8); c.globalAlpha = 1;
      shadeIn(c, b, 30, 30, 26, 0.5, 0.2);
      twoEyes(c, 30, 30, 8, "#3a3a7a", 0.55, mood); blush(c, 30, 40, 14, 0.8);
      c.fillStyle = "#3a2a5a"; c.beginPath(); c.ellipse(30, 42, 3.2, 4, 0, 0, TAU); c.fill();
    });
    case "flamme": return spr(key, 56, 70, 28, 66, (c) => {
      const f = (c) => { c.moveTo(28, 66); c.bezierCurveTo(4, 62, 4, 34, 18, 24); c.quadraticCurveTo(18, 36, 24, 34); c.quadraticCurveTo(20, 14, 32, 2); c.quadraticCurveTo(32, 18, 40, 22); c.quadraticCurveTo(40, 12, 44, 12); c.bezierCurveTo(56, 34, 54, 62, 28, 66); c.closePath(); };
      const g = c.createLinearGradient(0, 66, 0, 4);
      g.addColorStop(0, "#fff6b0"); g.addColorStop(0.45, "#ffb040"); g.addColorStop(1, "#ff5a3a");
      ol(c, f, g, "#8a2a10", 2.8);
      twoEyes(c, 28, 46, 7, "#6a1a0a", 0.52, mood); blush(c, 28, 55, 12, 0.7);
      c.strokeStyle = "#6a1a0a"; c.lineWidth = 2; c.beginPath(); c.arc(28, 56, 3, 0.2, Math.PI - 0.2); c.stroke();
    });
    case "dummy": return spr(key, 56, 90, 28, 86, (c) => {
      ol(c, (c) => c.roundRect(25, 40, 6, 46, 2), "#a0703a", "#4a2a10", 2.4);
      ol(c, (c) => c.roundRect(4, 44, 48, 8, 4), "#c8a050", "#6a4a18", 2.4);
      const b = ell(28, 50, 15, 18); ol(c, b, "#f2cf6a", "#8a6a18", 2.8);
      for (const [r, col] of [[11, "#ff5d73"], [7.5, "#fff"], [4, "#ff5d73"]]) { c.beginPath(); c.arc(28, 52, r, 0, TAU); c.fillStyle = col; c.fill(); }
      const h = ell(28, 22, 14, 13); ol(c, h, "#f2cf6a", "#8a6a18", 2.8);
      c.strokeStyle = "#5a3a10"; c.lineWidth = 2.4;
      for (const k of [-1, 1]) { c.beginPath(); c.moveTo(28 + k * 3, 19); c.lineTo(28 + k * 8, 24); c.moveTo(28 + k * 8, 19); c.lineTo(28 + k * 3, 24); c.stroke(); }
      c.beginPath(); c.arc(28, 28, 3, 0.2, Math.PI - 0.2); c.stroke();
      ol(c, (c) => { c.moveTo(12, 16); c.quadraticCurveTo(28, -6, 44, 16); c.closePath(); }, "#6a8fd8", "#23336a", 2.4);
    });
  }
  return null;
}
/** Oma Pilzhut — freundliche Tutorial-Figur (Box 100×130, Anker 50/124) */
export function npcSprite(mood = "open") {
  return spr("npc:oma:" + mood, 100, 130, 50, 124, (c) => {
    const X = 50;
    ol(c, (c) => { c.moveTo(X - 22, 122); c.quadraticCurveTo(X - 24, 84, X, 80); c.quadraticCurveTo(X + 24, 84, X + 22, 122); c.closePath(); }, "#b58cff", "#4a2a8a", 3);
    c.fillStyle = "#fff"; c.beginPath(); c.ellipse(X, 106, 12, 14, 0, 0, TAU); c.fill();
    ol(c, (c) => c.roundRect(X + 20, 70, 4, 54, 2), "#a0703a", "#4a2a10", 2);
    const h = ell(X, 70, 22, 20); ol(c, h, "#ffe0c8", "#8a5a3a", 3); shadeIn(c, h, X, 70, 20);
    ol(c, (c) => { c.moveTo(X - 18, 76); c.quadraticCurveTo(X - 28, 62, X - 20, 56); c.lineTo(X + 20, 56); c.quadraticCurveTo(X + 28, 62, X + 18, 76); c.quadraticCurveTo(X, 64, X - 18, 76); }, "#f4f4f4", "#aaa", 2);
    c.strokeStyle = "#5a3a2a"; c.lineWidth = 2;
    for (const k of [-1, 1]) { c.beginPath(); c.arc(X + k * 8, 70, 6, 0, TAU); c.stroke(); }
    c.beginPath(); c.moveTo(X - 2, 70); c.lineTo(X + 2, 70); c.stroke();
    if (mood === "blink") { for (const k of [-1, 1]) { c.beginPath(); c.arc(X + k * 8, 71, 3, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
    else { c.fillStyle = "#2a1a3a"; for (const k of [-1, 1]) { c.beginPath(); c.arc(X + k * 8, 70, 3, 0, TAU); c.fill(); } c.fillStyle = "#fff"; for (const k of [-1, 1]) { c.beginPath(); c.arc(X + k * 8 - 1, 69, 1.1, 0, TAU); c.fill(); } }
    blush(c, X, 78, 13, 0.9);
    c.beginPath(); c.arc(X, 80, 4, 0.2, Math.PI - 0.2); c.stroke();
    const cp = (c) => { c.moveTo(X - 46, 58); c.bezierCurveTo(X - 44, 16, X - 18, 8, X, 8); c.bezierCurveTo(X + 18, 8, X + 44, 16, X + 46, 58); c.quadraticCurveTo(X, 46, X - 46, 58); c.closePath(); };
    ol(c, cp, "#ff5d73", "#8a1a2e", 3); shadeIn(c, cp, X, 30, 40);
    c.fillStyle = "#fff"; for (const [x, y, r] of [[-26, 34, 7], [0, 20, 6], [24, 32, 8], [-8, 40, 4], [36, 48, 4]]) { c.beginPath(); c.arc(X + x, y, r, 0, TAU); c.fill(); }
  });
}

// =====================================================================
// Items
// =====================================================================
export function itemSprite(kind, v = "") {
  const key = "it:" + kind + ":" + v;
  switch (kind) {
    case "coin": return spr(key, 26, 26, 13, 13, (c) => {
      const g = c.createLinearGradient(0, 2, 0, 24); g.addColorStop(0, "#fff3a0"); g.addColorStop(0.5, "#ffd23a"); g.addColorStop(1, "#e89a10");
      ol(c, ell(13, 13, 10.5, 10.5), g, "#8a5a08", 2.4);
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.4; c.beginPath(); c.arc(13, 13, 7, 0, TAU); c.stroke();
      c.beginPath(); star5(c, 13, 13.5, 5, 2.3); c.fillStyle = "#fff7c8"; c.fill();
    });
    case "potion": return spr(key, 34, 40, 17, 38, (c) => {
      ol(c, (c) => c.roundRect(12, 3, 10, 8, 3), "#c8905a", "#5a3a1a", 2.2);
      const b = (c) => { c.moveTo(13, 10); c.lineTo(13, 15); c.bezierCurveTo(2, 18, 2, 38, 17, 38); c.bezierCurveTo(32, 38, 32, 18, 21, 15); c.lineTo(21, 10); c.closePath(); };
      ol(c, b, "rgba(230,240,255,.9)", "#5a4a8a", 2.4);
      c.save(); c.beginPath(); b(c); c.clip();
      const g = c.createLinearGradient(0, 18, 0, 38); g.addColorStop(0, "#ff8fb8"); g.addColorStop(1, "#e8306a");
      c.fillStyle = g; c.fillRect(0, 21, 34, 20); c.restore();
      c.beginPath(); heartPath(c, 17, 29, 4); c.fillStyle = "#fff"; c.fill();
      c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(11, 24, 2, 4, 0.3, 0, TAU); c.fill();
    });
    case "mushroom": return spr(key, 34, 34, 17, 31, (c) => {
      ol(c, (c) => c.roundRect(12, 16, 10, 15, 4), "#fff1dc", "#8a6a4a", 2.2);
      const cp = (c) => { c.moveTo(3, 19); c.bezierCurveTo(2, 4, 12, 2, 17, 2); c.bezierCurveTo(22, 2, 32, 4, 31, 19); c.quadraticCurveTo(17, 15, 3, 19); c.closePath(); };
      ol(c, cp, "#ff7fd0", "#8a1a5e", 2.4); shadeIn(c, cp, 17, 10, 14, 0.5);
      c.fillStyle = "#fff"; for (const [x, y, r] of [[10, 10, 2.6], [19, 6, 2.2], [25, 12, 2.4]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      star4(c, 28, 4, 4, "#fff9c0");
    });
    case "sword": return spr(key, 42, 42, 21, 38, (c) => {
      c.translate(21, 22); c.rotate(-Math.PI / 4); c.translate(-30, -13);
      const w = weapon(v || "wood");
      c.setTransform(K, 0, 0, K, 0, 0); c.translate(21, 22); c.rotate(-Math.PI / 4); c.scale(0.62, 0.62);
      c.drawImage(w.cv, -40, -13, 80, 26);
    });
    case "wand": return spr(key, 42, 42, 21, 38, (c) => {
      c.translate(21, 22); c.rotate(-Math.PI / 4); c.scale(0.8, 0.8);
      c.drawImage(wand(3).cv, -30, -15, 60, 30);
    });
    case "gem": return spr(key, 40, 40, 20, 36, (c) => {
      const g = (c) => { c.moveTo(20, 34); c.lineTo(6, 16); c.lineTo(12, 6); c.lineTo(28, 6); c.lineTo(34, 16); c.closePath(); };
      ol(c, g, "#c79bff", "#4a1f8a", 2.4);
      c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.moveTo(12, 6); c.lineTo(20, 16); c.lineTo(6, 16); c.closePath(); c.fill();
      c.fillStyle = "rgba(90,30,160,.35)"; c.beginPath(); c.moveTo(34, 16); c.lineTo(20, 16); c.lineTo(20, 34); c.closePath(); c.fill();
      star4(c, 27, 10, 4, "#fff");
    });
    case "hat": return spr(key, 50, 42, 25, 38, (c) => {
      c.scale(0.55, 0.55); c.drawImage(hat(v).cv, 0, 0, 90, 70);
    });
  }
  return null;
}

// =====================================================================
// Props
// =====================================================================
export function chestSprite(open) {
  return spr("chest:" + (open ? 1 : 0), 64, 58, 32, 52, (c) => {
    const wood = "#c07a3a", line = "#4a2410";
    ol(c, (c) => c.roundRect(8, 26, 48, 26, 5), wood, line, 3);
    c.fillStyle = "#a0602a"; c.fillRect(10, 36, 44, 3);
    if (open) {
      const g = c.createRadialGradient(32, 26, 2, 32, 26, 22); g.addColorStop(0, "#fff6b0"); g.addColorStop(1, "rgba(255,200,60,0)");
      c.fillStyle = g; c.fillRect(0, 0, 64, 40);
      ol(c, (c) => { c.moveTo(10, 24); c.lineTo(16, 6); c.lineTo(48, 6); c.lineTo(54, 24); c.closePath(); }, "#d08a4a", line, 3);
    } else {
      ol(c, (c) => { c.moveTo(8, 28); c.quadraticCurveTo(8, 10, 32, 10); c.quadraticCurveTo(56, 10, 56, 28); c.closePath(); }, "#d08a4a", line, 3);
      ol(c, (c) => c.roundRect(27, 22, 10, 12, 3), "#ffd75e", "#8a6212", 2.4);
    }
    for (const x of [14, 46]) ol(c, (c) => c.rect(x - 2.5, open ? 26 : 12, 5, open ? 26 : 40), "#ffd75e", "#8a6212", 2);
  });
}
export function potSprite(col) {
  return spr("pot:" + col, 40, 46, 20, 42, (c) => {
    const b = (c) => { c.moveTo(12, 8); c.lineTo(28, 8); c.lineTo(26, 13); c.bezierCurveTo(40, 18, 38, 40, 20, 42); c.bezierCurveTo(2, 40, 0, 18, 14, 13); c.closePath(); };
    ol(c, b, col, shade(col, -0.6), 2.6); shadeIn(c, b, 20, 26, 16, 0.4, 0.3);
    ol(c, ell(20, 8, 9, 3.2), shade(col, 0.2), shade(col, -0.6), 2.2);
    c.strokeStyle = shade(col, 0.4); c.lineWidth = 2; c.beginPath(); c.moveTo(8, 26); c.quadraticCurveTo(20, 30, 32, 26); c.stroke();
  });
}
export function stairsSprite(b) {
  const B = BIOME_COLS[b] || BIOME_COLS[1];
  return spr("stairs:" + b, 72, 44, 36, 20, (c) => {
    const d = (c, i) => { c.moveTo(36, 4 + i); c.lineTo(66 - i * 1.8, 20); c.lineTo(36, 36 - i); c.lineTo(6 + i * 1.8, 20); c.closePath(); };
    ol(c, (c) => d(c, 0), B.rim, shade(B.rim, -0.6), 2.4);
    const g = c.createRadialGradient(36, 24, 1, 36, 20, 26); g.addColorStop(0, "#07030c"); g.addColorStop(1, shade(B.rim, -0.5));
    c.beginPath(); d(c, 4); c.fillStyle = g; c.fill();
    c.strokeStyle = shade(B.rim, 0.1); c.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) { const y = 12 + i * 4.5, w = 18 - i * 3; c.beginPath(); c.moveTo(36 - w, y + w * 0.3); c.lineTo(36 + w * 0.2, y + w * 0.3 + 5); c.stroke(); }
  });
}
const BIOME_COLS = [
  { rim: "#b8a58a" }, { rim: "#8aa88a" }, { rim: "#9a98d0" }, { rim: "#e8a8c8" }, { rim: "#cfe6f5" }, { rim: "#a86a5a" },
];
export function portalRing(locked) {
  return spr("pring:" + (locked ? 1 : 0), 100, 56, 50, 28, (c) => {
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(50, 30, 44, 22, 0, 0, TAU); c.fill();
    ol(c, ell(50, 28, 42, 21), locked ? "#8f8a9a" : "#c9bfae", "#4a4050", 3);
    c.beginPath(); c.ellipse(50, 28, 32, 15, 0, 0, TAU); c.fillStyle = locked ? "#5a5566" : "#3a2f4a"; c.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.arc(50 + Math.cos(a) * 37, 28 + Math.sin(a) * 18.5, 2.4, 0, TAU); c.fillStyle = locked ? "#6a6575" : "#ffd75e"; c.fill(); }
  });
}
/** Wirbel (weiß-farbig, additiv, wird rotiert und gestaucht gezeichnet) */
export function swirlSprite(col) {
  return spr("swirl:" + col, 96, 96, 48, 48, (c) => {
    const g = c.createRadialGradient(48, 48, 2, 48, 48, 46); g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, col); g.addColorStop(1, rgba(col.length === 7 ? col : "#ffffff", 0));
    c.fillStyle = g; c.beginPath(); c.arc(48, 48, 46, 0, TAU); c.fill();
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 3.2;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      for (let t = 0; t < 1; t += 0.02) { const a = k * TAU / 3 + t * 5, r = 6 + t * 38; const x = 48 + Math.cos(a) * r, y = 48 + Math.sin(a) * r; t ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
  });
}
export function fountainSprite() {
  return spr("fountain", 210, 190, 105, 132, (c) => {
    const X = 105, Y = 132;
    c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(X, Y + 6, 98, 50, 0, 0, TAU); c.fill();
    // Becken außen (Stein)
    ol(c, (c) => { c.ellipse(X, Y - 6, 92, 46, 0, 0, TAU); }, "#d8cdbd", "#6a5a4a", 3);
    ol(c, (c) => { c.ellipse(X, Y + 4, 92, 46, 0, 0, Math.PI); c.lineTo(X - 92, Y - 6); c.ellipse(X, Y - 6, 92, 46, 0, Math.PI, 0, true); c.closePath(); }, "#bfb2a0", "#6a5a4a", 3);
    c.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 9; i++) { const a = 0.25 + i * 0.3; c.fillRect(X + Math.cos(a) * 90 - 1, Y - 2 + Math.sin(a) * 45, 2, 10); }
    // Wasser
    const wg = c.createLinearGradient(0, Y - 40, 0, Y + 30); wg.addColorStop(0, "#9fe6ff"); wg.addColorStop(1, "#3aa0e0");
    c.beginPath(); c.ellipse(X, Y - 8, 78, 37, 0, 0, TAU); c.fillStyle = wg; c.fill();
    c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2;
    for (const [dx, dy, r] of [[-40, -10, 12], [30, 4, 16], [5, -22, 10]]) { c.beginPath(); c.ellipse(X + dx, Y + dy, r, r * 0.45, 0, 0, TAU); c.stroke(); }
    // Säule + Schale
    ol(c, (c) => c.roundRect(X - 10, Y - 78, 20, 72, 8), "#e6dccb", "#6a5a4a", 3);
    ol(c, (c) => { c.ellipse(X, Y - 78, 36, 14, 0, 0, Math.PI); c.closePath(); }, "#d8cdbd", "#6a5a4a", 3);
    ol(c, ell(X, Y - 80, 36, 12), "#bfe9ff", "#6a5a4a", 3);
    // Pilz-Statue obenauf
    ol(c, (c) => c.roundRect(X - 6, Y - 104, 12, 22, 4), "#fff1dc", "#6a5a4a", 2.6);
    ol(c, (c) => { c.moveTo(X - 24, Y - 100); c.bezierCurveTo(X - 22, Y - 126, X + 22, Y - 126, X + 24, Y - 100); c.quadraticCurveTo(X, Y - 106, X - 24, Y - 100); }, "#ff6f91", "#8a1a2e", 3);
    c.fillStyle = "#fff"; for (const [dx, dy] of [[-10, -112], [8, -116], [14, -106]]) { c.beginPath(); c.arc(X + dx, Y + dy, 3.4, 0, TAU); c.fill(); }
  });
}
export function houseSprite(v) {
  const pal = [["#fff1d6", "#ff7a7a", "#c94a5a"], ["#e6f7ff", "#6fa8ff", "#3f6fd0"], ["#f7e6ff", "#b48cff", "#7a4ad0"]][v % 3];
  return spr("house:" + v, 210, 260, 105, 196, (c) => {
    const X = 105, Y = 196, hw = 90, hh = 45, WH = 70;
    const wall = pal[0], roof = pal[1], roofD = pal[2], line = "#5a3a3a";
    c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.moveTo(X - hw - 6, Y); c.lineTo(X, Y + hh + 6); c.lineTo(X + hw + 6, Y); c.lineTo(X, Y - hh); c.closePath(); c.fill();
    // Wände (links/rechts)
    ol(c, (c) => { c.moveTo(X - hw, Y - WH); c.lineTo(X, Y + hh - WH); c.lineTo(X, Y + hh); c.lineTo(X - hw, Y); c.closePath(); }, wall, line, 3);
    ol(c, (c) => { c.moveTo(X, Y + hh - WH); c.lineTo(X + hw, Y - WH); c.lineTo(X + hw, Y); c.lineTo(X, Y + hh); c.closePath(); }, shade(wall, -0.12), line, 3);
    // Fachwerk-Balken
    c.strokeStyle = "#a0704a"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(X - hw, Y - WH * 0.45); c.lineTo(X, Y + hh - WH * 0.45); c.lineTo(X + hw, Y - WH * 0.45); c.stroke();
    // Tür (linke Wand)
    const dx = X - 42, dy = Y + 21;
    ol(c, (c) => { c.moveTo(dx - 12, dy - 6); c.lineTo(dx - 12, dy - 38); c.quadraticCurveTo(dx, dy - 50, dx + 12, dy - 26); c.lineTo(dx + 12, dy + 6); c.closePath(); }, "#a0603a", "#4a2410", 3);
    c.fillStyle = "#ffd75e"; c.beginPath(); c.arc(dx + 7, dy - 12, 2.4, 0, TAU); c.fill();
    // Fenster (leuchtend)
    const win = (x, y, s) => {
      ol(c, (c) => { c.moveTo(x - 11, y - 9 * s); c.lineTo(x + 11, y + 9 * s - 11 * s * 0); c.lineTo(x + 11, y + 9 * s + 20); c.lineTo(x - 11, y - 9 * s + 20); c.closePath(); }, "#ffe28a", line, 2.8);
      c.strokeStyle = "#c98a3a"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 20); c.stroke();
    };
    win(X - 72, Y - 42, 0.5); win(X + 30, Y - 20, -0.5); win(X + 64, Y - 38, -0.5);
    // Dach (Walmdach)
    const ry = Y - WH, ov = 12, apex = ry - 88;
    ol(c, (c) => { c.moveTo(X - hw - ov, ry + 4); c.lineTo(X, ry + hh + ov); c.lineTo(X, apex + 30); c.lineTo(X - 30, apex); c.closePath(); }, roof, shade(roof, -0.6), 3);
    ol(c, (c) => { c.moveTo(X, ry + hh + ov); c.lineTo(X + hw + ov, ry + 4); c.lineTo(X + 30, apex); c.lineTo(X, apex + 30); c.closePath(); }, roofD, shade(roof, -0.6), 3);
    ol(c, (c) => { c.moveTo(X - 30, apex); c.lineTo(X, apex + 30); c.lineTo(X + 30, apex); c.lineTo(X, apex - 14); c.closePath(); }, shade(roof, 0.2), shade(roof, -0.6), 3);
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 2;
    for (let i = 1; i < 5; i++) { const t = i / 5; c.beginPath(); c.moveTo(X - hw - ov + (X - 30 - (X - hw - ov)) * t, ry + 4 + (apex - ry - 4) * t); c.lineTo(X, ry + hh + ov + (apex + 30 - ry - hh - ov) * t); c.lineTo(X + hw + ov - (hw + ov - 30) * t, ry + 4 + (apex - ry - 4) * t); c.stroke(); }
    // Schornstein
    ol(c, (c) => c.rect(X + 34, apex + 6, 16, 30), "#c98a6a", "#5a3020", 3);
    ol(c, (c) => c.rect(X + 31, apex + 2, 22, 7), "#a86a4a", "#5a3020", 3);
  });
}
export function treeSprite(v) {
  const pal = [["#6fcf5f", "#3f9a3f"], ["#ffb3d1", "#e67aa8"], ["#ffb35e", "#e0782a"]][v % 3];
  return spr("tree:" + v, 120, 160, 60, 150, (c) => {
    c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(60, 150, 34, 14, 0, 0, TAU); c.fill();
    ol(c, (c) => { c.moveTo(52, 150); c.quadraticCurveTo(56, 110, 50, 90); c.lineTo(70, 90); c.quadraticCurveTo(64, 110, 68, 150); c.closePath(); }, "#a0704a", "#4a2a10", 3);
    const blobs = [[60, 56, 38], [34, 78, 26], [86, 78, 26], [60, 88, 28], [44, 40, 22], [78, 42, 22]];
    for (const [x, y, r] of blobs) { c.beginPath(); c.arc(x, y, r + 3, 0, TAU); c.fillStyle = shade(pal[1], -0.5); c.fill(); }
    for (const [x, y, r] of blobs) {
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 2, x, y, r);
      g.addColorStop(0, shade(pal[0], 0.35)); g.addColorStop(0.6, pal[0]); g.addColorStop(1, pal[1]);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = g; c.fill();
    }
    if (v % 3 !== 2) { c.fillStyle = v % 3 === 1 ? "#fff" : "#ff6f91"; for (const [x, y] of [[40, 60], [72, 50], [58, 86], [86, 80], [30, 84], [62, 30]]) { c.beginPath(); c.arc(x, y, 3.2, 0, TAU); c.fill(); } }
  });
}
export function lanternSprite() {
  return spr("lantern", 34, 100, 17, 96, (c) => {
    ol(c, (c) => c.roundRect(14, 30, 6, 66, 2), "#4a3a5a", "#1a1020", 2.2);
    ol(c, (c) => c.roundRect(9, 92, 16, 6, 2), "#4a3a5a", "#1a1020", 2);
    ol(c, (c) => { c.moveTo(6, 12); c.lineTo(28, 12); c.lineTo(24, 34); c.lineTo(10, 34); c.closePath(); }, "#ffe9a0", "#1a1020", 2.4);
    ol(c, (c) => { c.moveTo(4, 12); c.lineTo(17, 2); c.lineTo(30, 12); c.closePath(); }, "#4a3a5a", "#1a1020", 2.4);
  });
}
export function torchSprite() {
  return spr("torch", 24, 40, 12, 36, (c) => {
    ol(c, (c) => { c.moveTo(9, 14); c.lineTo(15, 14); c.lineTo(13, 34); c.lineTo(11, 34); c.closePath(); }, "#8a5a33", "#3a2010", 2);
    ol(c, (c) => c.roundRect(6, 10, 12, 6, 2), "#6a6a7a", "#2a2a3a", 2);
  });
}

// =====================================================================
// FX-Sprites (weiß → werden eingefärbt)
// =====================================================================
export function fx(kind) {
  switch (kind) {
    case "glow": return spr("fx:glow", 64, 64, 32, 32, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    });
    case "dot": return spr("fx:dot", 16, 16, 8, 8, (c) => {
      const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, 16, 16);
    });
    case "star": return spr("fx:star", 32, 32, 16, 16, (c) => { star4(c, 16, 16, 15, "#fff"); c.beginPath(); c.arc(16, 16, 3, 0, TAU); c.fill(); });
    case "star5": return spr("fx:star5", 32, 32, 16, 16, (c) => { c.beginPath(); star5(c, 16, 17, 15, 6.5); c.fillStyle = "#fff"; c.fill(); });
    case "puff": return spr("fx:puff", 48, 40, 24, 20, (c) => {
      c.fillStyle = "#fff";
      for (const [x, y, r] of [[16, 22, 12], [28, 16, 13], [34, 25, 10], [22, 28, 9]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    });
    case "heart": return spr("fx:heart", 28, 26, 14, 13, (c) => { c.beginPath(); heartPath(c, 14, 13, 9); c.fillStyle = "#fff"; c.fill(); });
    case "ring": return spr("fx:ring", 128, 128, 64, 64, (c) => {
      c.strokeStyle = "#fff"; c.lineWidth = 7; c.beginPath(); c.arc(64, 64, 58, 0, TAU); c.stroke();
      c.globalAlpha = 0.4; c.lineWidth = 14; c.beginPath(); c.arc(64, 64, 52, 0, TAU); c.stroke();
    });
    case "slash": return spr("fx:slash", 160, 160, 80, 80, (c) => {
      // Sichel (weiß, Verlauf) — für den Rundumschlag
      for (let i = 0; i < 26; i++) {
        const a0 = -Math.PI * 0.95 + i * 0.075, a1 = a0 + 0.1;
        c.strokeStyle = "rgba(255,255,255," + (0.04 + i / 26 * 0.9) + ")";
        c.lineWidth = 3 + i * 0.55;
        c.beginPath(); c.arc(80, 80, 66, a0, a1); c.stroke();
      }
    });
    case "shadow": return spr("fx:shadow", 64, 32, 32, 16, (c) => {
      const g = c.createRadialGradient(32, 16, 0, 32, 16, 32);
      g.addColorStop(0, "rgba(20,8,30,.55)"); g.addColorStop(0.6, "rgba(20,8,30,.3)"); g.addColorStop(1, "rgba(20,8,30,0)");
      c.setTransform(K, 0, 0, K * 0.5, 0, 0); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    });
    case "flame": return spr("fx:flame", 32, 44, 16, 40, (c) => {
      const g = c.createRadialGradient(16, 30, 1, 16, 26, 18);
      g.addColorStop(0, "#fffbe0"); g.addColorStop(0.4, "#ffd060"); g.addColorStop(1, "rgba(255,90,30,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(16, 2); c.bezierCurveTo(30, 20, 30, 40, 16, 40); c.bezierCurveTo(2, 40, 2, 20, 16, 2); c.fill();
    });
  }
  return null;
}
/** Seifenblase (bunt) */
export function bubbleSprite(tier) {
  const cols = [["#9be1ff", "#ff9bd8"], ["#b3ffcf", "#9be1ff"], ["#ffd1f0", "#c79bff"], ["#fff38a", "#ff9bd8"]][Math.min(3, tier)];
  return spr("bubble:" + tier, 40, 40, 20, 20, (c) => {
    const g = c.createRadialGradient(20, 20, 6, 20, 20, 17);
    g.addColorStop(0, "rgba(255,255,255,.08)"); g.addColorStop(0.75, rgba(cols[0], 0.35)); g.addColorStop(1, rgba(cols[1], 0.9));
    c.fillStyle = g; c.beginPath(); c.arc(20, 20, 17, 0, TAU); c.fill();
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.6; c.beginPath(); c.arc(20, 20, 17, 0, TAU); c.stroke();
    c.fillStyle = "#fff"; c.beginPath(); c.ellipse(13, 12, 4.5, 2.6, -0.7, 0, TAU); c.fill();
    c.beginPath(); c.arc(27, 27, 1.8, 0, TAU); c.fill();
  });
}
export function orbSprite(col) {
  return spr("orb:" + col, 36, 36, 18, 18, (c) => {
    const g = c.createRadialGradient(18, 18, 0, 18, 18, 17);
    g.addColorStop(0, "#fff"); g.addColorStop(0.4, col); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(18, 18, 17, 0, TAU); c.fill();
  });
}

// =====================================================================
// Boden & Wände (Iso 2:1, Kachel 64×32 Design-Einheiten)
// =====================================================================
export const WALL_H = 34;
const TOWN = { grass: ["#93d86c", "#8ad064", "#9ddf76"], path: ["#ecd9b4", "#e2cda4", "#f2e2c2"], edge: "#6fae4f" };
function diamondPath(c, sx, sy, i = 0) {
  c.moveTo(sx, sy + i); c.lineTo(sx + 32 - i * 2, sy + 16); c.lineTo(sx, sy + 32 - i); c.lineTo(sx - 32 + i * 2, sy + 16); c.closePath();
}
/** zeichnet eine Bodenkachel; (sx,sy) = obere Ecke. ao: Bit1 = Wand im Norden, Bit2 = Wand im Westen */
export function drawFloorTile(c, sx, sy, B, bi, v, deco, ao) {
  const r = mulberry32(v * 7919 + 13);
  if (bi === 0) {
    const isPath = deco === 1;
    const col = isPath ? TOWN.path[v % 3] : TOWN.grass[v % 3];
    c.beginPath(); diamondPath(c, sx, sy, -0.6); c.fillStyle = col; c.fill();
    if (isPath) {
      for (let k = 0; k < 4; k++) {
        const x = sx + (r() - 0.5) * 34, y = sy + 16 + (r() - 0.5) * 14;
        c.beginPath(); c.ellipse(x, y, 7 + r() * 4, 4 + r() * 2, 0, 0, TAU);
        c.fillStyle = shade(TOWN.path[(v + k) % 3], -0.06 - r() * 0.06); c.fill();
        c.strokeStyle = "rgba(150,120,80,.35)"; c.lineWidth = 1.2; c.stroke();
      }
    } else {
      c.strokeStyle = "rgba(70,140,60,.55)"; c.lineWidth = 1.4;
      for (let k = 0; k < 5; k++) {
        const x = sx + (r() - 0.5) * 36, y = sy + 16 + (r() - 0.5) * 14;
        c.beginPath(); c.moveTo(x - 2, y + 2); c.lineTo(x - 3, y - 3); c.moveTo(x + 1, y + 2); c.lineTo(x + 2, y - 4); c.stroke();
      }
      if (deco >= 2) {
        const fc = ["#ff7fb0", "#fff", "#ffd75e", "#b48cff"][deco - 2];
        for (let k = 0; k < 3; k++) {
          const x = sx + (r() - 0.5) * 26, y = sy + 16 + (r() - 0.5) * 10;
          c.fillStyle = fc; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.256) * 2.6, y + Math.sin(p * 1.256) * 1.6, 1.9, 0, TAU); c.fill(); }
          c.fillStyle = "#ffcf3a"; c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill();
        }
      }
    }
    if (ao) aoEdges(c, sx, sy, ao, 0.28);
    return;
  }
  // --- Keller: weiche Steinplatten ---
  const base = B.floor[v % 3];
  c.beginPath(); diamondPath(c, sx, sy, -0.6); c.fillStyle = B.floorEdge; c.fill();
  c.beginPath(); diamondPath(c, sx, sy, 1.6); c.fillStyle = base; c.fill();
  c.save(); c.beginPath(); diamondPath(c, sx, sy, 1.6); c.clip();
  const g = c.createLinearGradient(sx - 16, sy + 4, sx + 16, sy + 30);
  g.addColorStop(0, "rgba(255,255,255,.16)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.14)");
  c.fillStyle = g; c.fillRect(sx - 34, sy, 68, 34);
  // Muster pro Biom
  switch (B.id) {
    case "moos":
      if (v % 3 === 0) { c.fillStyle = "rgba(140,220,110,.35)"; c.beginPath(); c.ellipse(sx + (r() - 0.5) * 20, sy + 16 + (r() - 0.5) * 8, 10, 5, 0, 0, TAU); c.fill(); }
      break;
    case "kristall":
      for (let k = 0; k < 3; k++) { c.fillStyle = "rgba(190,230,255," + (0.3 + r() * 0.5) + ")"; c.fillRect(sx + (r() - 0.5) * 36, sy + 16 + (r() - 0.5) * 14, 1.6, 1.6); }
      break;
    case "zucker": {
      const cs = ["#fff", "#ffe36e", "#8fe9ff", "#b3ff9a"];
      for (let k = 0; k < 4; k++) { c.fillStyle = cs[(r() * 4) | 0]; c.save(); c.translate(sx + (r() - 0.5) * 34, sy + 16 + (r() - 0.5) * 12); c.rotate(r() * 3); c.fillRect(-2.5, -0.9, 5, 1.8); c.restore(); }
      break;
    }
    case "frost":
      c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sx - 14, sy + 14); c.lineTo(sx - 4, sy + 10); c.stroke();
      break;
    case "glut":
      if (v % 4 === 0) { c.strokeStyle = "rgba(255,140,50,.75)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sx - 10, sy + 12); c.lineTo(sx - 2, sy + 18); c.lineTo(sx + 8, sy + 15); c.stroke(); }
      break;
  }
  if (v % 11 === 0) { c.strokeStyle = "rgba(0,0,0,.22)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx - 6, sy + 10); c.lineTo(sx, sy + 16); c.lineTo(sx - 3, sy + 22); c.stroke(); }
  c.restore();
  if (ao) aoEdges(c, sx, sy, ao, 0.42);
  if (deco >= 2) drawDeco(c, sx, sy + 16, B, deco, r);
}
function aoEdges(c, sx, sy, ao, a) {
  c.save(); c.beginPath(); diamondPath(c, sx, sy, -0.6); c.clip();
  if (ao & 1) { // Norden: Kante oben→rechts
    const g = c.createLinearGradient(sx + 16, sy + 8, sx + 8, sy + 24);
    g.addColorStop(0, "rgba(10,0,20," + a + ")"); g.addColorStop(1, "rgba(10,0,20,0)");
    c.fillStyle = g; c.fillRect(sx - 34, sy - 2, 68, 36);
  }
  if (ao & 2) { // Westen: Kante links→oben
    const g = c.createLinearGradient(sx - 16, sy + 8, sx - 8, sy + 24);
    g.addColorStop(0, "rgba(10,0,20," + a + ")"); g.addColorStop(1, "rgba(10,0,20,0)");
    c.fillStyle = g; c.fillRect(sx - 34, sy - 2, 68, 36);
  }
  c.restore();
}
function drawDeco(c, x, y, B, d, r) {
  x += (r() - 0.5) * 16; y += (r() - 0.5) * 6;
  switch (B.id) {
    case "moos":
      if (d === 3) { c.strokeStyle = "#7fd46a"; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * 2.5, y); c.quadraticCurveTo(x + k * 4, y - 6, x + k * 5, y - 9); c.stroke(); } }
      else for (let k = 0; k < (d === 4 ? 1 : 3); k++) {
        const s = d === 4 ? 1.5 : 0.8 + r() * 0.4, px = x + (k - 1) * 7, col = d === 4 ? "#8fffcf" : "#ff9a6a";
        ol(c, (c) => c.roundRect(px - 2 * s, y - 7 * s, 4 * s, 7 * s, 2), "#fff1dc", "#6a4a3a", 1.4);
        ol(c, (c) => { c.moveTo(px - 7 * s, y - 6 * s); c.quadraticCurveTo(px, y - 16 * s, px + 7 * s, y - 6 * s); c.closePath(); }, col, shade(col, -0.6), 1.6);
      }
      break;
    case "kristall": crystals(c, x, y, d === 4 ? "#9ff0ff" : "#b8a8ff", d === 4 ? 1.5 : 1, r); break;
    case "zucker":
      if (d === 3) { ol(c, (c) => c.rect(x - 1, y - 16, 2.4, 16), "#fff", "#aa8899", 1); ol(c, ell(x, y - 18, 6, 6), "#ff6fae", "#8a1a5e", 1.8); c.strokeStyle = "#fff"; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y - 18, 3, 0, 5); c.stroke(); }
      else if (d === 4) crystals(c, x, y, "#ffb3e6", 1.3, r);
      else { for (let k = 0; k < 3; k++) ol(c, ell(x + (k - 1) * 7, y - 3, 4, 3), ["#ff8fd0", "#8fe9ff", "#ffe36e"][k], "rgba(80,20,60,.6)", 1.4); }
      break;
    case "frost":
      if (d === 2) ol(c, (c) => { c.moveTo(x - 12, y + 2); c.quadraticCurveTo(x - 6, y - 8, x, y - 6); c.quadraticCurveTo(x + 8, y - 10, x + 12, y + 2); c.closePath(); }, "#ffffff", "#9fc0dc", 1.6);
      else crystals(c, x, y, "#dff6ff", d === 4 ? 1.4 : 1, r);
      break;
    case "glut":
      if (d === 4) { const g = c.createRadialGradient(x, y, 1, x, y, 12); g.addColorStop(0, "#fff0a0"); g.addColorStop(0.5, "#ff8a2a"); g.addColorStop(1, "rgba(200,40,10,0)"); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 14, 7, 0, 0, TAU); c.fill(); }
      else for (let k = 0; k < 2; k++) ol(c, ell(x + (k - 0.5) * 9, y - 3, 5 + r() * 2, 4), "#5a3a38", "#2a1616", 1.6);
      break;
  }
}
function crystals(c, x, y, col, s, r) {
  for (let k = 0; k < 3; k++) {
    const px = x + (k - 1) * 6 * s, h = (8 + r() * 8) * s, w = 3 * s;
    ol(c, (c) => { c.moveTo(px - w, y); c.lineTo(px - w * 0.7, y - h * 0.7); c.lineTo(px, y - h); c.lineTo(px + w * 0.7, y - h * 0.7); c.lineTo(px + w, y); c.closePath(); }, col, shade(col, -0.55), 1.5);
    c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(px - w * 0.4, y - h * 0.75, w * 0.35, h * 0.55);
  }
}
/** Wandblock: Box 64 × (32+WALL_H), Anker = Kachel-Bodenmitte */
export function wallSprite(B, bi, v) {
  return spr("wall:" + bi + ":" + (v % 4), 64, 32 + WALL_H + 14, 32, 16 + WALL_H + 14, (c) => {
    c.translate(0, 14);
    const H = WALL_H;
    const top = (c) => diamondPath(c, 32, 0, 0);
    const left = (c) => { c.moveTo(0, 16); c.lineTo(32, 32); c.lineTo(32, 32 + H); c.lineTo(0, 16 + H); c.closePath(); };
    const right = (c) => { c.moveTo(32, 32); c.lineTo(64, 16); c.lineTo(64, 16 + H); c.lineTo(32, 32 + H); c.closePath(); };
    if (bi === 0) { // Hecke
      ol(c, left, "#4f9a45", "#2a5a2a", 1.5); ol(c, right, "#3f8238", "#2a5a2a", 1.5);
      ol(c, top, "#76c65e", "#2a5a2a", 1.5);
      const r = mulberry32(v * 31 + 7);
      for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(8 + r() * 48, 8 + r() * 16 + (k > 3 ? 20 : 0), 6 + r() * 4, 0, TAU); c.fillStyle = k > 3 ? "rgba(40,100,40,.35)" : "rgba(160,230,120,.45)"; c.fill(); }
      if (v % 3 === 0) { c.fillStyle = ["#ff7fb0", "#fff", "#ffd75e"][v % 3]; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(14 + r() * 36, 6 + r() * 20, 2.2, 0, TAU); c.fill(); } }
      return;
    }
    ol(c, left, B.left, shade(B.left, -0.5), 1.5);
    ol(c, right, B.right, shade(B.right, -0.5), 1.5);
    // Steinfugen
    c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 1.4;
    for (const f of [0.5]) {
      c.beginPath(); c.moveTo(0, 16 + H * f); c.lineTo(32, 32 + H * f); c.lineTo(64, 16 + H * f); c.stroke();
    }
    const o = (v % 2) * 10;
    c.beginPath(); c.moveTo(12 + o, 22 + o * 0.5); c.lineTo(12 + o, 22 + o * 0.5 + H * 0.5); c.moveTo(46 - o, 23 + o * 0.5 + H * 0.5); c.lineTo(46 - o, 23 + o * 0.5 + H); c.stroke();
    // Licht-/Schatten-Verlauf auf den Seiten
    c.save(); c.beginPath(); left(c); right(c); c.clip();
    const g = c.createLinearGradient(0, 16, 0, 32 + H); g.addColorStop(0, "rgba(255,255,255,.12)"); g.addColorStop(1, "rgba(0,0,0,.25)");
    c.fillStyle = g; c.fillRect(0, 0, 64, 32 + H); c.restore();
    ol(c, top, B.top, shade(B.top, -0.45), 1.5);
    c.save(); c.beginPath(); top(c); c.clip();
    const tg = c.createLinearGradient(16, 2, 48, 30); tg.addColorStop(0, "rgba(255,255,255,.25)"); tg.addColorStop(1, "rgba(0,0,0,.12)");
    c.fillStyle = tg; c.fillRect(0, 0, 64, 32); c.restore();
    const r = mulberry32(v * 97 + 3);
    switch (B.id) {
      case "moos":
        c.fillStyle = "#86c46a";
        for (const [x0, y0, x1, y1] of [[0, 16, 32, 32], [32, 32, 64, 16]]) for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4 + (r() - 0.5) * 0.1; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; c.beginPath(); c.ellipse(x, y + 2, 4, 3 + r() * 6, 0, 0, TAU); c.fill(); }
        break;
      case "kristall": if (v % 2 === 0) crystals(c, 30 + r() * 6, 20, "#9ff0ff", 1.1, r); break;
      case "zucker":
        c.fillStyle = "#fff";
        for (const [x0, y0, x1, y1] of [[0, 16, 32, 32], [32, 32, 64, 16]]) for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; c.beginPath(); c.ellipse(x, y + 1, 5.5, 3 + r() * 5, 0, 0, TAU); c.fill(); }
        c.save(); c.beginPath(); left(c); c.clip(); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 5; for (let k = -2; k < 5; k++) { c.beginPath(); c.moveTo(k * 14, 60); c.lineTo(k * 14 + 30, 0); c.stroke(); } c.restore();
        break;
      case "frost":
        c.fillStyle = "#ffffff";
        for (const [x0, y0, x1, y1] of [[0, 16, 32, 32], [32, 32, 64, 16]]) for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x, y + 6 + r() * 7); c.lineTo(x + 3, y); c.fill(); }
        break;
      case "glut":
        c.strokeStyle = "rgba(255,130,40,.8)"; c.lineWidth = 1.8;
        c.beginPath(); c.moveTo(8 + o, 22 + H * 0.2); c.lineTo(14 + o, 24 + H * 0.5); c.lineTo(10 + o, 22 + H * 0.8); c.stroke();
        c.beginPath(); c.moveTo(52 - o, 22 + H * 0.3); c.lineTo(46 - o, 26 + H * 0.6); c.stroke();
        break;
    }
  });
}
