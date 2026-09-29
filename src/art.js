/* art.js — prozedurale Chibi-Grafik, alles in Offscreen-Caches (MIT)
   Design-Einheit: 1 px bei Kachelbreite U = 64. K = Pixel pro Design-Einheit. */
import { shade, rgba, hexRgb, TAU, mulberry32, mixHex } from "./util.js";
import { MYTH_BY_ID } from "./config.js";
import { drawMythBody, mythHead, drawMythBack, mythFoot, MYTH_LRU } from "./myth.js";

let K = 1;
const cache = new Map();
export const artScale = () => K;
export function setArtScale(k) {
  k = Math.round(k * 100) / 100;
  if (k !== K) { K = k; cache.clear(); }
}
export function clearArt() { cache.clear(); }
export function artCount() { return cache.size; }
// v9: Aussehen-abhängige Sprites (Körper/Kopf/Kostümteile je Look) in einer LRU halten — Kostümwechsel lassen den Cache nicht unbegrenzt wachsen
const lru = new Map();

/** Sprite holen oder erzeugen. w,h,ax,ay in Design-Einheiten. */
export function spr(key, w, h, ax, ay, fn) {
  key += "@" + K;
  let s = cache.get(key);
  const lk = MYTH_LRU.test(key);
  if (s) { if (lk) { lru.delete(key); lru.set(key, 1); } return s; }
  if (lk) { lru.set(key, 1); if (lru.size > MYTH_LRU.max) { const old = lru.keys().next().value; lru.delete(old); cache.delete(old); } }
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
export { heartPath, star5, star4, ol, shadeIn, ell };
export { mythHead, drawMythBack, mythFoot } from "./myth.js";
export const artK = () => K;

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
  const key = "head:" + (look.id || look.species) + ":" + look.skin + ":" + mood;
  return spr(key, 120, 132, 60, 112, (c) => drawHead(c, look, mood));
}
function drawHead(c, o, mood) {
  const skin = o.skin, line = shade(skin, -0.55);
  const v = o.earsV || 0;
  drawEars(c, o);
  drawHeadFace(c, o, mood, skin, line, v);
}
/** Ohren (hinter dem Kopf) — v9 auch für Kostüm-Kapuzen: Ohren schauen durch */
export function drawEars(c, o) {
  const skin = o.skin, line = shade(skin, -0.55), inner = "#ffb3c7", v = o.earsV || 0;
  const ear = (path, fillIn) => { ol(c, path, skin, line, 3.2); if (fillIn) { c.beginPath(); fillIn(c); c.fillStyle = inner; c.fill(); } };
  switch (o.ears) {
    case "pointy": {
      const tx = v ? 66 : 60, ty = v ? 52 : 42;
      for (const s of [-1, 1]) ear((c) => { c.moveTo(HX + s * 24, HY - 16); c.quadraticCurveTo(HX + s * (tx - 2), HY - ty + 8, HX + s * tx, HY - ty); c.quadraticCurveTo(HX + s * 48, HY - 12, HX + s * 28, HY + 4); c.closePath(); },
        (c) => { c.moveTo(HX + s * 30, HY - 12); c.quadraticCurveTo(HX + s * (tx - 10), HY - ty + 14, HX + s * (tx - 6), HY - ty + 6); c.quadraticCurveTo(HX + s * 44, HY - 14, HX + s * 32, HY - 2); c.closePath(); });
      break;
    }
    case "round": {
      const r = v ? 8.5 : 12, ox = v ? 26 : 24, oy = v ? 29 : 28;
      for (const s of [-1, 1]) ear(ell(HX + s * ox, HY - oy, r, r), ell(HX + s * ox, HY - oy + 1, r * 0.54, r * 0.54));
      break;
    }
    case "bunny":
      for (const s of [-1, 1]) {
        if (v && s > 0) ear(ell(HX + 34, HY - 30, 9.5, 25, 1.05), ell(HX + 34, HY - 29, 4.8, 18, 1.05));   // Schlappohr
        else ear(ell(HX + s * 15, HY - 52, 10, 27, s * 0.18), ell(HX + s * 15, HY - 50, 5, 20, s * 0.18));
      }
      break;
    case "panda": {
      const k = v ? 0.78 : 1;
      for (const s of [-1, 1]) {
        ol(c, (c) => { c.moveTo(HX + s * 12, HY - 28); c.quadraticCurveTo(HX + s * (12 + 22 * k), HY - 28 - 30 * k, HX + s * (12 + 24 * k), HY - 22); c.closePath(); }, "#fff6ee", line, 3.2);
        c.beginPath(); c.moveTo(HX + s * 16, HY - 28); c.quadraticCurveTo(HX + s * (14 + 18 * k), HY - 28 - 22 * k, HX + s * (13 + 20 * k), HY - 24); c.closePath(); c.fillStyle = skin; c.fill();
      }
      break;
    }
    case "cat": {
      const h = v ? 54 : 64;
      for (const s of [-1, 1]) ear((c) => { c.moveTo(HX + s * 10, HY - 28); c.quadraticCurveTo(HX + s * (v ? 26 : 30), HY - h, HX + s * 34, HY - 18); c.closePath(); },
        (c) => { c.moveTo(HX + s * 16, HY - 27); c.quadraticCurveTo(HX + s * (v ? 26 : 29), HY - h + 12, HX + s * 30, HY - 22); c.closePath(); });
      break;
    }
    case "fox": {
      const k = v ? 0.78 : 1;
      for (const s of [-1, 1]) {
        const outer = (c) => { c.moveTo(HX + s * 6, HY - 26); c.quadraticCurveTo(HX + s * (6 + 28 * k), HY - 26 - 52 * k, HX + s * (6 + 32 * k), HY - 14); c.closePath(); };
        ear(outer, (c) => { c.moveTo(HX + s * 13, HY - 26); c.quadraticCurveTo(HX + s * (8 + 24 * k), HY - 26 - 36 * k, HX + s * (6 + 27 * k), HY - 20); c.closePath(); });
        c.save(); c.beginPath(); outer(c); c.clip();
        c.fillStyle = "#4a2a1a"; c.fillRect(HX + (s < 0 ? -44 : 14), HY - 80, 30, 24 + (1 - k) * 26); c.restore();
      }
      break;
    }
    case "dragon":
      for (const s of [-1, 1]) {
        ol(c, (c) => { c.moveTo(HX + s * 34, HY + 2); c.lineTo(HX + s * 52, HY - 8); c.lineTo(HX + s * 46, HY + 6); c.lineTo(HX + s * 54, HY + 12); c.lineTo(HX + s * 34, HY + 14); c.closePath(); }, o.hair, shade(o.hair, -0.5), 2.6);
      }
      break;
  }
}
function drawHeadFace(c, o, mood, skin, line, v) {
  const M = o.myth && !o.mhat ? MYTH_BY_ID[o.myth] : null;
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
    if (!v) { c.fillStyle = shade(skin, 0.35); for (const [dx, dy, r] of [[-20, -18, 4], [-11, -25, 3], [19, -20, 3.6], [26, -9, 2.4]]) { c.beginPath(); c.arc(HX + dx, HY + dy, r, 0, TAU); c.fill(); } }
  } else if (o.ears === "bunny" || o.ears === "cat") {
    c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(HX, HY + 20, 14, 9, 0, 0, TAU); c.fill();
  }
  c.restore();
  // Frisur (v9: unter Kapuzen/Helmen verborgen — sonst schauen Haarspitzen oben heraus)
  if (!(M && M.head.startsWith("hood"))) drawHair(c, o, hp);
  // Hörner (Drache)
  drawSpeciesHorns(c, o);
  // Wangen
  c.fillStyle = "rgba(255,105,150,.42)";
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(HX + s * 23, HY + 15, 7, 4.5, 0, 0, TAU); c.fill(); }
  if (o.acc === "sommersprossen") { c.fillStyle = shade(skin, -0.35); for (const s of [-1, 1]) for (const [dx, dy] of [[19, 11], [24, 14], [28, 10], [22, 18]]) { c.beginPath(); c.arc(HX + s * dx, HY + dy, 1.5, 0, TAU); c.fill(); } }
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
  drawAcc(c, o, mood, M ? "face" : "all");
}
/** Hörner der Tierart Drache (v9: schauen auch durch Kostüm-Kapuzen) */
export function drawSpeciesHorns(c, o) {
  if (o.ears !== "dragon") return;
  const v = o.earsV || 0;
  if (!v) for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(HX + s * 10, HY - 30); c.quadraticCurveTo(HX + s * 18, HY - 52, HX + s * 24, HY - 50); c.quadraticCurveTo(HX + s * 20, HY - 40, HX + s * 22, HY - 26); c.closePath(); }, "#fff2c9", "#8a6a2a", 2.6);
  else for (const s of [-1, 1]) { c.lineCap = "round"; c.strokeStyle = "#8a6a2a"; c.lineWidth = 9; c.beginPath(); c.moveTo(HX + s * 16, HY - 28); c.bezierCurveTo(HX + s * 22, HY - 50, HX + s * 44, HY - 44, HX + s * 36, HY - 30); c.stroke(); c.strokeStyle = "#fff2c9"; c.lineWidth = 5.5; c.stroke(); }
}
export { HX, HY, HR };
/** Frisuren — alle Tierarten können jede wählen */
function drawHair(c, o, hp) {
  const h = o.hair, hl = shade(h, -0.5), hi = shade(h, 0.4);
  switch (o.style) {
    case "wuschel": {   // weiche Wuschel-Wolke oben auf dem Kopf
      const puffs = [[44, 49, 8.5], [76, 49, 8.5], [52, 44, 10], [68, 44, 10], [60, 41, 11]];
      for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y, r + 1.6, 0, TAU); c.fillStyle = hl; c.fill(); }
      for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = h; c.fill(); }
      c.fillStyle = hi; for (const [x, y, r] of [[56, 37, 3.4], [47, 45, 2.6], [70, 40, 2.4]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      break;
    }
    case "locke": {     // echte Ringellocke statt Wurst
      const curl = (c) => { c.moveTo(57, 50); c.bezierCurveTo(52, 38, 58, 28, 67, 31); c.bezierCurveTo(75, 34, 73, 45, 65, 44); c.bezierCurveTo(59, 43, 61, 36, 66, 37); };
      c.lineCap = "round"; c.beginPath(); curl(c); c.strokeStyle = hl; c.lineWidth = 9; c.stroke();
      c.beginPath(); curl(c); c.strokeStyle = h; c.lineWidth = 5.6; c.stroke();
      c.beginPath(); c.moveTo(56, 42); c.bezierCurveTo(56, 36, 60, 32, 64, 32); c.strokeStyle = hi; c.lineWidth = 1.6; c.stroke();
      break;
    }
    case "ringel": {    // dünnes Ringel-Schwänzchen
      c.lineCap = "round";
      const r = (c) => { c.moveTo(HX, HY - 32); c.quadraticCurveTo(HX + 2, HY - 48, HX + 12, HY - 46); c.quadraticCurveTo(HX + 18, HY - 40, HX + 10, HY - 38); };
      c.beginPath(); r(c); c.strokeStyle = shade(o.skin, -0.55); c.lineWidth = 6; c.stroke();
      c.beginPath(); r(c); c.strokeStyle = o.ears === "octo" ? o.skin : h; c.lineWidth = 3.4; c.stroke();
      break;
    }
    case "pony": case "seite": {   // Pony / Seitenscheitel: folgt der Kopfform
      c.save(); c.beginPath(); hp(c); c.clip();
      const path = o.style === "pony"
        ? (c) => { c.moveTo(18, 40); c.lineTo(102, 40); c.lineTo(102, 70); for (let i = 0; i < 5; i++) { const x1 = 96 - i * 15.6, x0 = x1 - 15.6; c.quadraticCurveTo((x0 + x1) / 2, 72 - (i % 2) * 4, x0, 62 + (i === 4 ? 8 : 0)); } c.closePath(); }
        : (c) => { c.moveTo(18, 70); c.quadraticCurveTo(22, 38, 60, 42); c.quadraticCurveTo(96, 44, 102, 66); c.quadraticCurveTo(82, 52, 64, 56); c.quadraticCurveTo(40, 60, 18, 70); c.closePath(); };
      c.beginPath(); path(c); c.fillStyle = h; c.fill(); c.strokeStyle = hl; c.lineWidth = 2.6; c.stroke();
      c.strokeStyle = hi; c.lineWidth = 2; c.beginPath(); c.moveTo(40, 52); c.quadraticCurveTo(50, 46, 62, 47); c.stroke();
      c.restore();
      c.beginPath(); hp(c); c.strokeStyle = shade(o.skin, -0.55); c.lineWidth = 3.4; c.stroke();
      break;
    }
    case "zoepfe": {    // zwei Zöpfchen-Knödel + Haarkappe
      for (const s of [-1, 1]) {
        ol(c, ell(HX + s * 36, HY - 16, 10, 10), h, hl, 2.6);
        c.fillStyle = hi; c.beginPath(); c.arc(HX + s * 34, HY - 20, 2.6, 0, TAU); c.fill();
        ol(c, ell(HX + s * 29, HY - 12, 3.6, 3.6), "#ff6fae", "#9a1f5e", 1.8);
      }
      c.save(); c.beginPath(); hp(c); c.clip();
      c.beginPath(); c.moveTo(18, 30); c.lineTo(102, 30); c.lineTo(102, 58); c.quadraticCurveTo(80, 50, 60, 56); c.quadraticCurveTo(40, 50, 18, 58); c.closePath();
      c.fillStyle = h; c.fill(); c.strokeStyle = hl; c.lineWidth = 2.4; c.stroke();
      c.strokeStyle = hl; c.lineWidth = 1.6; c.beginPath(); c.moveTo(60, 44); c.lineTo(60, 55); c.stroke();
      c.restore();
      c.beginPath(); hp(c); c.strokeStyle = shade(o.skin, -0.55); c.lineWidth = 3.4; c.stroke();
      break;
    }
    case "dutt": {
      c.save(); c.beginPath(); hp(c); c.clip();
      c.beginPath(); c.moveTo(18, 30); c.lineTo(102, 30); c.lineTo(102, 54); c.quadraticCurveTo(60, 44, 18, 54); c.closePath(); c.fillStyle = h; c.fill(); c.strokeStyle = hl; c.lineWidth = 2.4; c.stroke();
      c.restore();
      ol(c, ell(HX, HY - 40, 12, 11), h, hl, 2.8);
      c.fillStyle = hi; c.beginPath(); c.arc(HX - 4, HY - 44, 3, 0, TAU); c.fill();
      ol(c, (c) => c.roundRect(HX - 9, HY - 32, 18, 5, 2.5), "#ffd75e", "#8a6212", 1.8);
      break;
    }
    case "irokese": {
      for (const [x, h0, tip] of [[48, 44, 30], [60, 40, 22], [72, 44, 30]]) {
        ol(c, (c) => { c.moveTo(x - 8, h0 + 6); c.quadraticCurveTo(x - 4, tip + 4, x + 1, tip); c.quadraticCurveTo(x + 6, tip + 6, x + 8, h0 + 6); c.closePath(); }, h, hl, 2.6);
      }
      c.fillStyle = hi; c.beginPath(); c.arc(59, 30, 2.4, 0, TAU); c.fill();
      break;
    }
    case "schopf": {    // Blatt-Schopf (wie ein Keimling)
      ol(c, (c) => { c.moveTo(60, 48); c.quadraticCurveTo(52, 30, 66, 20); c.quadraticCurveTo(76, 34, 60, 48); c.closePath(); }, h, hl, 2.6);
      ol(c, (c) => { c.moveTo(59, 47); c.quadraticCurveTo(46, 40, 44, 30); c.quadraticCurveTo(56, 32, 59, 47); c.closePath(); }, shade(h, 0.15), hl, 2.4);
      c.strokeStyle = hl; c.lineWidth = 1.4; c.beginPath(); c.moveTo(61, 44); c.quadraticCurveTo(62, 32, 66, 24); c.stroke();
      break;
    }
  }
}
/** Accessoires (Spieler) + Boss-Merkmale. v9 part: "all" · "face" (nur Gesicht: Brille/Sommersprossen/Boss) · "top" (nur Kopf-Extras
 *  Blume/Schleife/Sternspange — mit Kostüm-Kopfteil werden sie versetzt: dx/dy verschieben sie an den Rand der Kapuze bzw. des Huts) */
export const TOP_ACC = ["blume", "schleife", "stern"];
export function drawAcc(c, o, mood, part = "all", dx = 0, dy = 0) {
  const ey = HY + 4, ex = 14.5;
  const top = TOP_ACC.includes(o.acc);
  if ((part === "face" && top) || (part === "top" && !top)) return;
  if (dx || dy) { c.save(); c.translate(dx, dy); }
  drawAccInner(c, o, mood, ey, ex);
  if (dx || dy) c.restore();
}
function drawAccInner(c, o, mood, ey, ex) {
  switch (o.acc) {
    case "brille":
      c.strokeStyle = "#3a2a4a"; c.lineWidth = 2.6;
      for (const s of [-1, 1]) { c.beginPath(); c.arc(HX + s * ex, ey, 12.5, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(HX - 3, ey - 2); c.quadraticCurveTo(HX, ey - 5, HX + 3, ey - 2); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.arc(HX + s * ex, ey, 9, -2.4, -1.7); c.stroke(); }
      break;
    case "blume": {
      const x = HX + 28, y = HY - 24;
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ol(c, ell(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 5), "#ffb3d8", "#c0407a", 1.6); }
      ol(c, ell(x, y, 4, 4), "#ffd75e", "#8a6212", 1.4);
      break;
    }
    case "schleife": {
      const x = HX + 26, y = HY - 26;
      for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(x, y); c.bezierCurveTo(x + s * 6, y - 12, x + s * 18, y - 8, x + s * 14, y + 2); c.bezierCurveTo(x + s * 10, y + 8, x + s * 4, y + 4, x, y); }, "#ff6fae", "#9a1f5e", 2.2);
      ol(c, ell(x, y, 4, 3.6), "#ff4f9a", "#9a1f5e", 2);
      break;
    }
    case "stern": { c.beginPath(); star5(c, HX + 27, HY - 24, 9, 4); c.fillStyle = "#ffe36e"; c.fill(); c.strokeStyle = "#8a6212"; c.lineWidth = 1.8; c.stroke(); break; }
    // --- Bosse ---
    case "bart": {
      ol(c, (c) => { c.moveTo(HX - 24, HY + 16); c.quadraticCurveTo(HX - 28, HY + 42, HX - 10, HY + 46); c.quadraticCurveTo(HX - 4, HY + 56, HX, HY + 48); c.quadraticCurveTo(HX + 4, HY + 56, HX + 10, HY + 46); c.quadraticCurveTo(HX + 28, HY + 42, HX + 24, HY + 16); c.quadraticCurveTo(HX + 12, HY + 26, HX, HY + 25); c.quadraticCurveTo(HX - 12, HY + 26, HX - 24, HY + 16); c.closePath(); }, "#6fbf4a", "#2f5a2a", 2.8);
      c.fillStyle = "#a8e878"; for (const [dx, dy] of [[-14, 32], [8, 36], [-2, 42], [16, 26]]) { c.beginPath(); c.arc(HX + dx, HY + dy, 2.6, 0, TAU); c.fill(); }
      c.fillStyle = "#ff9ae0"; c.beginPath(); c.arc(HX - 16, HY + 24, 2.6, 0, TAU); c.fill();
      break;
    }
    case "zahn": {
      ol(c, (c) => c.roundRect(HX + 3, HY + 19, 8, 11, 3), "#ffffff", "#6a7aa0", 2);
      c.globalAlpha = 0.9; star4(c, HX + 12, HY + 20, 5, "#bff4ff"); c.globalAlpha = 1;
      break;
    }
    case "schnute": {
      ol(c, ell(HX, HY + 21, 7, 4.6), "#ff5aa0", "#8a1a4e", 2);
      c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.ellipse(HX - 2, HY + 19.5, 2.4, 1.2, 0, 0, TAU); c.fill();
      break;
    }
    case "frostnase": {
      ol(c, ell(HX, HY + 13, 6.5, 5.5), "#bfe9ff", "#3a6a9a", 2.2);
      c.fillStyle = "#fff"; c.beginPath(); c.arc(HX - 2, HY + 11, 1.8, 0, TAU); c.fill();
      break;
    }
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
  const M = o.myth ? MYTH_BY_ID[o.myth] : null;
  if (M) { if (o.ears === "octo") for (let i = -2; i <= 2; i++) ol(c, ell(BX + i * 8, BY - 8, 5.5, 9, i * 0.25), skin, line, 2.6); drawMythBody(c, o, M, outfit, BX, BY); return; }   // v9: Kostüm
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
  c.save(); c.scale(K, K);
  const my = look.myth ? 18 : 0;                         // v9: Kostüme brauchen oben etwas Platz (Hörner, Hüte)
  drawKobold(c, look, hatId, 86, 166 - (my ? 4 : 0), 0, 0, false, "open", my ? 0.9 : 1);
  c.restore();
  K = kSave;
}
/** v9: ganze Figur in Design-Einheiten zeichnen (Menü-Porträt, Editor-Vorschau): Füße, Rückenteil, Körper, Kopfteil, Kopf, Hut */
function drawKobold(c, look, hatId, gx, gy, t, bob, turn, mood, sc = 1, fxD = 1, fb = 0) {
  const put = (s, x, y) => c.drawImage(s.cv, x - s.ax, y - s.ay, s.w, s.h);
  c.save(); c.translate(gx, gy); c.scale(sc, sc);
  const fl = foot(mythFoot(look) || shade(look.outfit, -0.35));
  put(fl, -RIG.footX, RIG.footY - fb); put(fl, RIG.footX, RIG.footY - fb);
  c.translate(0, -bob); c.scale(fxD, 1);
  if (look.myth) drawMythBack(c, look, t, t * 7, false, put);
  put(body(look, look.outfit), 0, 0);
  c.translate(0, RIG.neck); c.rotate(turn || 0);
  const hb = mythHead(look, "back"), hf = mythHead(look, "front");
  if (hb) put(hb, 0, 0);
  put(head(look, mood), 0, 0);
  if (hf) put(hf, 0, 0); else if (hatId) put(hat(hatId), 0, -58);
  c.restore();
}
/** Live-Vorschau im Charakter-Editor: dreht sich langsam, wippt, blinzelt (Sprites in eigener Auflösung gecacht) */
export function previewRig(cv, look, hatId, t, dice = -1) {
  const c = cv.getContext("2d"), W = cv.width, Hh = cv.height;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, Hh);
  const kSave = K; K = Math.round(Hh / 175 * 100) / 100;
  // sanftes Wiegen, alle 4 s ein schneller Dreher zur anderen Seite
  const per = Math.floor(t / 4), u = t - per * 4, dir = per % 2 ? -1 : 1;
  const fx = u > 3.7 ? dir * Math.cos((u - 3.7) / 0.3 * Math.PI) : dir * (0.93 + 0.07 * Math.cos(t * 1.6)), turn = fx;
  let bob = Math.abs(Math.sin(t * 2.4)) * 3, mood = (t % 3.2) < 0.14 ? "blink" : "open", fxD = fx;
  if (dice >= 0) {                                   // v7 Würfel: Hüpfer (ease-out) + zwei schnelle Dreher, fröhliches Gesicht
    bob = Math.sin(Math.min(1, dice) * Math.PI) * 26; fxD = Math.cos(dice * Math.PI * 4); mood = dice > 0.2 && dice < 0.8 ? "blink" : "open";
    if (Math.abs(fxD) < 0.12) fxD = fxD < 0 ? -0.12 : 0.12;
  }
  const gx = W / 2 / K, gy = Hh / K - 16;
  c.save(); c.scale(K, K);
  // Bodenschatten
  const shK = 1 - bob / 60;
  c.fillStyle = "rgba(20,8,30,.28)"; c.beginPath(); c.ellipse(gx, gy + 2, 34 * Math.max(0.6, Math.abs(dice >= 0 ? fxD : turn)) * shK, 9 * shK, 0, 0, TAU); c.fill();
  const fb = dice >= 0 ? bob : 0, sc = look.myth ? 0.9 : 1;
  drawKobold(c, look, hatId, gx, gy, t, bob, Math.sin(t * 1.3) * 0.05, mood, sc, fxD, fb);
  c.restore();
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
    case "heart": return spr(key, 32, 32, 16, 29, (c) => {
      c.beginPath(); heartPath(c, 16, 17, 11); c.fillStyle = "#e8305f"; c.fill(); c.lineWidth = 2.4; c.strokeStyle = "#7a1030"; c.stroke();
      c.beginPath(); heartPath(c, 16, 16, 8.5); c.fillStyle = "#ff5d86"; c.fill();
      c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(11.5, 11.5, 3, 2, -0.6, 0, TAU); c.fill();
      star4(c, 24, 7, 3.5, "#fff6c0");
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
    case "myth": return spr(key, 44, 46, 22, 40, (c) => {   // v9: Kostüm-Paket (Geschenk in Stufenfarbe + Symbol)
      const M = MYTH_BY_ID[v] || { tier: "selten", emoji: "🎁" }, col = { selten: "#7fc8ff", episch: "#c48cff", mythisch: "#ffd75e" }[M.tier];
      const box = (c) => c.roundRect(6, 16, 32, 24, 5);
      ol(c, box, col, shade(col, -0.6), 2.6); shadeIn(c, box, 22, 28, 18, 0.45, 0.25);
      ol(c, (c) => c.roundRect(4, 12, 36, 8, 3), shade(col, 0.25), shade(col, -0.6), 2.4);
      c.fillStyle = "#ff5a8a"; c.fillRect(19, 12, 6, 28);
      for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(22, 12); c.bezierCurveTo(22 + s * 6, 0, 22 + s * 16, 4, 22 + s * 10, 12); c.closePath(); }, "#ff7aa8", "#8a1a4e", 2);
      c.font = "15px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(M.emoji, 22, 31);
      star4(c, 36, 8, 4, "#ffffff");
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

/** Pieks-Platte (Falle): Platte mit Löchern; Stacheln separat (werden hochgeschoben) */
export function trapPlate(col) {
  return spr("trap:p:" + col, 64, 36, 32, 18, (c) => {
    const d = (c, i) => { c.moveTo(32, 3 + i); c.lineTo(58 - i * 2, 18); c.lineTo(32, 33 - i); c.lineTo(6 + i * 2, 18); c.closePath(); };
    ol(c, (c) => d(c, 0), shade(col, -0.25), shade(col, -0.6), 2.2);
    c.beginPath(); d(c, 3); c.fillStyle = shade(col, -0.05); c.fill();
    c.fillStyle = shade(col, -0.65);
    for (const [x, y] of [[32, 11], [22, 18], [42, 18], [32, 25], [32, 18]]) { c.beginPath(); c.ellipse(x, y, 3.2, 1.8, 0, 0, TAU); c.fill(); }
  });
}
export function trapSpikes(col) {
  return spr("trap:s:" + col, 64, 50, 32, 42, (c) => {
    for (const [x, y] of [[32, 29], [22, 36], [42, 36], [32, 43], [32, 36]]) {
      ol(c, (c) => { c.moveTo(x - 5, y); c.quadraticCurveTo(x - 3, y - 14, x, y - 20); c.quadraticCurveTo(x + 3, y - 14, x + 5, y); c.closePath(); }, col, shade(col, -0.6), 1.8);
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y - 18, 2.2, 0, TAU); c.fill();
    }
  });
}
/** Friseur-Spiegel in der Stadt (Charakter-Editor) */
export function mirrorSprite() {
  return spr("mirror", 90, 160, 45, 148, (c) => {
    const X = 45;
    c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(X, 148, 30, 10, 0, 0, TAU); c.fill();
    ol(c, (c) => { c.moveTo(X - 22, 148); c.lineTo(X - 10, 118); c.lineTo(X + 10, 118); c.lineTo(X + 22, 148); c.closePath(); }, "#c07a3a", "#4a2410", 3);
    const fr = ell(X, 70, 34, 50);
    ol(c, fr, "#ffd75e", "#8a6212", 3.4);
    const g = c.createLinearGradient(X - 26, 30, X + 26, 110); g.addColorStop(0, "#e8f8ff"); g.addColorStop(0.5, "#9fd8f0"); g.addColorStop(1, "#6fa8d8");
    c.beginPath(); c.ellipse(X, 70, 26, 41, 0, 0, TAU); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 4; c.beginPath(); c.moveTo(X - 14, 44); c.lineTo(X - 2, 34); c.stroke(); c.beginPath(); c.moveTo(X - 16, 60); c.lineTo(X + 6, 40); c.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.arc(X + Math.cos(a) * 30, 70 + Math.sin(a) * 45.5, 2.6, 0, TAU); c.fillStyle = "#ff8fb8"; c.fill(); }
    ol(c, (c) => { c.moveTo(X - 18, 18); c.quadraticCurveTo(X, 2, X + 18, 18); c.quadraticCurveTo(X, 12, X - 18, 18); }, "#ff6f91", "#8a1a2e", 2.6);
    star4(c, X + 14, 50, 6, "#ffffff");
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
    case "conf": return spr("fx:conf", 16, 16, 8, 8, (c) => { c.fillStyle = "#fff"; c.beginPath(); c.roundRect(2, 5, 12, 6, 2); c.fill(); });
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
// v8: Welt-Wege in der Stadt (deco 8 … 12 = Weg/Torplatz, 13 … 17 = Platz-Rand) — Pflaster in Weltfarbe
export const ROAD_COL = [null, "#b9eb95", "#b4e4f6", "#ffc6e3", "#e6f3ff", "#ffcc94"];
export const WORLD_EMOJI = [null, "🌿", "💎", "🍭", "❄️", "🔥"];
function diamondPath(c, sx, sy, i = 0) {
  c.moveTo(sx, sy + i); c.lineTo(sx + 32 - i * 2, sy + 16); c.lineTo(sx, sy + 32 - i); c.lineTo(sx - 32 + i * 2, sy + 16); c.closePath();
}
/** zeichnet eine Bodenkachel; (sx,sy) = obere Ecke. ao: Bit1 = Wand im Norden, Bit2 = Wand im Westen */
export function drawFloorTile(c, sx, sy, B, bi, v, deco, ao) {
  const r = mulberry32(v * 7919 + 13);
  if (bi === 0) {
    if (deco >= 8) {                                        // v8: Welt-Weg (Pflaster in Weltfarbe), Platz-Rand heller + Gras-Fugen
      const w = deco >= 13 ? deco - 12 : deco - 7, edge = deco >= 13, base = ROAD_COL[w] || TOWN.path[0];
      c.beginPath(); diamondPath(c, sx, sy, -0.6); c.fillStyle = edge ? TOWN.grass[v % 3] : shade(base, -0.1); c.fill();
      for (let k = 0; k < (edge ? 2 : 4); k++) {
        const x = sx + (r() - 0.5) * 32, y = sy + 16 + (r() - 0.5) * 13;
        c.beginPath(); c.ellipse(x, y, 7 + r() * 4, 4 + r() * 2, 0, 0, TAU);
        c.fillStyle = shade(base, 0.08 - r() * 0.14); c.fill();
        c.strokeStyle = shade(base, -0.45); c.globalAlpha = 0.35; c.lineWidth = 1.2; c.stroke(); c.globalAlpha = 1;
      }
      if (!edge && v % 7 === 0) star4(c, sx + (r() - 0.5) * 20, sy + 14 + (r() - 0.5) * 8, 3.2, "rgba(255,255,255,.7)");
      if (ao) aoEdges(c, sx, sy, ao, 0.28);
      return;
    }
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
  if (deco >= 5) { arenaTile(c, sx, sy, B, deco); return; }
  if (deco >= 2) drawDeco(c, sx, sy + 16, B, deco, r);
}
/** v5: Boss-Arena-Mosaik — 5 = Ring-Platten, 6 = Mittel-Emblem, 7 = Spawn-Rune der Handlanger */
function arenaTile(c, sx, sy, B, deco) {
  const hi = B.top || "#ffffff";
  if (deco !== 7) {
    c.beginPath(); diamondPath(c, sx, sy, 5); c.fillStyle = rgba(hi, deco === 6 ? 0.34 : 0.26); c.fill();
    c.strokeStyle = rgba(hi, 0.6); c.lineWidth = 1.4; c.stroke();
    c.beginPath(); diamondPath(c, sx, sy, 10); c.strokeStyle = rgba("#ffffff", 0.18); c.lineWidth = 1; c.stroke();
  }
  if (deco === 6) {
    c.strokeStyle = rgba("#fff3c0", 0.55); c.lineWidth = 1.6; c.beginPath(); c.ellipse(sx, sy + 16, 13, 6.5, 0, 0, TAU); c.stroke();
    c.save(); c.translate(sx, sy + 16); c.scale(1, 0.5); c.beginPath(); star5(c, 0, 0, 9, 4); c.fillStyle = rgba("#fff3c0", 0.45); c.fill(); c.restore();
  } else if (deco === 7) {
    c.save(); c.setLineDash([3, 3]); c.strokeStyle = "rgba(210,170,255,.6)"; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(sx, sy + 16, 16, 8, 0, 0, TAU); c.stroke(); c.restore();
    c.fillStyle = "rgba(210,170,255,.55)";
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; c.beginPath(); c.arc(sx + Math.cos(a) * 11, sy + 16 + Math.sin(a) * 5.5, 1.6, 0, TAU); c.fill(); }
  }
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
  return spr("wall:" + (B.key || bi) + ":" + (v % 4), 64, 32 + WALL_H + 14, 32, 16 + WALL_H + 14, (c) => {
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

// =====================================================================
// v8: Welttor-Pfosten (Stadt) — Steinsäule mit Kappe + Wimpel in Weltfarbe (Anker = Bodenmitte)
// =====================================================================
export function gatePostSprite(w) {
  const col = ROAD_COL[w] || "#ffffff", dk = shade(col, -0.55);
  return spr("wpost:" + w, 44, 128, 22, 120, (c) => {
    c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(22, 120, 18, 8, 0, 0, TAU); c.fill();
    const col1 = (c) => c.roundRect(12, 34, 20, 86, 6);
    ol(c, col1, "#efe6d6", "#6a5a4a", 3); shadeIn(c, col1, 22, 70, 30, 0.35, 0.3);
    c.strokeStyle = "rgba(106,90,74,.35)"; c.lineWidth = 1.6; for (const y of [58, 84, 106]) { c.beginPath(); c.moveTo(13, y); c.lineTo(31, y + 3); c.stroke(); }
    ol(c, (c) => c.roundRect(7, 110, 30, 10, 3), "#d8cdbd", "#6a5a4a", 2.6);
    ol(c, (c) => c.roundRect(6, 26, 32, 12, 4), shade(col, -0.1), dk, 2.8);   // Kappe
    ol(c, ell(22, 18, 12, 12), col, dk, 2.8);                                  // Kugel obenauf
    c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.ellipse(18, 13, 4, 3, -0.5, 0, TAU); c.fill();
    star4(c, 27, 12, 3.5, "#ffffff");
  });
}

// =====================================================================
// v8: Wand-Schütze — freundliches Steingesicht in der Wand (vorne gezeichnet, render.js schert es auf die Wandseite)
// mood: "idle" (Mäulchen zu) · "warn" (Backen aufgebläht, Maul glüht) · "shoot" (Maul weit offen). Anker = Mitte.
// =====================================================================
const FACE_STONE = { moos: "#cfdcae", kristall: "#dcd6ff", zucker: "#fff1dc", frost: "#8fb8da", glut: "#e8b890" };
export function wallFaceSprite(B, mood, glow) {
  const stone = FACE_STONE[B.id] || "#d8d0c4", dk = "#2a1830";
  return spr("wface:" + (B.id || "x") + ":" + mood + ":" + glow, 40, 40, 20, 20, (c) => {
    const puff = mood === "warn" ? 1.12 : 1;
    const face = ell(20, 21, 15.5 * puff, 15 * puff);
    ol(c, face, stone, dk, 3.2); shadeIn(c, face, 20, 21, 16, 0.45, 0.3);
    ol(c, ell(20, 21, 12.5 * puff, 12 * puff), "rgba(0,0,0,0)", rgba(glow, 0.55), 1.8);   // Ring in Weltfarbe
    // Augen (klein, glitzernd) + Bäckchen
    for (const x of [14, 26]) {
      c.beginPath(); c.ellipse(x, 15, 2.8, 3.4, 0, 0, TAU); c.fillStyle = "#1b1030"; c.fill();
      c.beginPath(); c.arc(x - 0.9, 13.8, 1.1, 0, TAU); c.fillStyle = "#fff"; c.fill();
    }
    c.fillStyle = mood === "warn" ? "rgba(255,110,140,.75)" : "rgba(255,140,170,.45)";
    for (const x of [9.5, 30.5]) { c.beginPath(); c.ellipse(x, 21, 3.6 * puff, 2.4 * puff, 0, 0, TAU); c.fill(); }
    if (mood === "idle") { c.beginPath(); c.ellipse(20, 25, 3.2, 2.4, 0, 0, TAU); c.fillStyle = "#2a1830"; c.fill(); }
    else {
      const rr = mood === "shoot" ? 6.5 : 4.8;
      const g = c.createRadialGradient(20, 25, 0, 20, 25, rr);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, glow); g.addColorStop(1, shade(glow, -0.5));
      c.beginPath(); c.ellipse(20, 25, rr, rr * 0.9, 0, 0, TAU); c.fillStyle = g; c.fill();
      c.strokeStyle = "#2a1830"; c.lineWidth = 2; c.stroke();
    }
  });
}
/** v8: Geschoss der Wand-Schützen je Welt (Anker = Mitte) */
export function wallShotSprite(id) {
  return spr("wshot:" + id, 40, 40, 20, 20, (c) => {
    switch (id) {
      case "spore": {           // Moos-Spore: flauschige grüne Kugel mit Pünktchen
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.beginPath(); c.arc(20 + Math.cos(a) * 11, 20 + Math.sin(a) * 11, 4.2, 0, TAU); c.fillStyle = "#8fdc6a"; c.fill(); }
        ol(c, ell(20, 20, 11.5, 11.5), "#b6ff8a", "#3f7a2a", 2.2);
        c.fillStyle = "#ffe36e"; for (const [x, y] of [[16, 17], [24, 19], [19, 25], [26, 25]]) { c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill(); }
        c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(15, 14, 3.5, 2.2, -0.6, 0, TAU); c.fill();
        break;
      }
      case "shard": {           // Kristallsplitter: spitzer Doppelkeil
        const d = (c) => { c.moveTo(20, 3); c.lineTo(28, 20); c.lineTo(20, 37); c.lineTo(12, 20); c.closePath(); };
        ol(c, d, "#9ff0ff", "#3a5a9a", 2.4);
        c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.moveTo(20, 6); c.lineTo(24, 20); c.lineTo(20, 20); c.closePath(); c.fill();
        c.fillStyle = "rgba(90,120,220,.35)"; c.beginPath(); c.moveTo(20, 20); c.lineTo(12, 20); c.lineTo(20, 34); c.closePath(); c.fill();
        break;
      }
      case "candy": {           // Bonbonkugel mit Streifen
        c.save(); c.beginPath(); c.arc(20, 20, 12.5, 0, TAU); c.clip();
        c.fillStyle = "#ffffff"; c.fillRect(0, 0, 40, 40);
        c.fillStyle = "#ff6fae"; for (let k = -3; k < 4; k++) { c.beginPath(); c.moveTo(k * 9, 40); c.lineTo(k * 9 + 5, 40); c.lineTo(k * 9 + 25, 0); c.lineTo(k * 9 + 20, 0); c.closePath(); c.fill(); }
        c.restore();
        ol(c, ell(20, 20, 12.5, 12.5), "rgba(0,0,0,0)", "#8a1a4e", 2.4);
        c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.ellipse(15, 14, 4, 2.5, -0.6, 0, TAU); c.fill();
        break;
      }
      case "snow": {            // Schneeball
        ol(c, ell(20, 20, 12.5, 12.5), "#f8fcff", "#7aa8cc", 2.4);
        c.fillStyle = "#dcefff"; c.beginPath(); c.arc(24, 24, 4.5, 0, TAU); c.fill(); c.beginPath(); c.arc(15, 17, 3, 0, TAU); c.fill();
        star4(c, 16, 13, 3.4, "#ffffff");
        break;
      }
      default: {                // Glutkugel
        const g = c.createRadialGradient(18, 17, 1, 20, 20, 13);
        g.addColorStop(0, "#fffbe0"); g.addColorStop(0.45, "#ffc050"); g.addColorStop(1, "#e0501a");
        c.beginPath(); c.arc(20, 20, 12.5, 0, TAU); c.fillStyle = g; c.fill();
        c.strokeStyle = "#7a2008"; c.lineWidth = 2.2; c.stroke();
        c.strokeStyle = "rgba(255,240,180,.8)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(13, 22); c.lineTo(18, 25); c.lineTo(22, 21); c.stroke();
      }
    }
  });
}

// =====================================================================
// v5: Mini-Bosse — jeder ein eigenes Wesen (Anker = Bodenmitte), deutlich kleiner als ein Hauptboss
// =====================================================================
export function miniSprite(id, mood = "open") {
  const key = "mini:" + id + ":" + mood;
  switch (id) {
    // Schlabbo, der Riesen-Moosschleim: Moos-Schopf mit Blümchen, Blätterkrone, Tropfen
    case "schlabbo": return spr(key, 112, 100, 56, 94, (c) => {
      const col = "#7be07a", line = shade(col, -0.58);
      const b = (c) => { c.moveTo(8, 90); c.bezierCurveTo(2, 44, 28, 20, 56, 20); c.bezierCurveTo(84, 20, 110, 44, 104, 90); c.quadraticCurveTo(56, 100, 8, 90); c.closePath(); };
      c.globalAlpha = 0.94; ol(c, b, col, line, 3.4); c.globalAlpha = 1;
      shadeIn(c, b, 56, 56, 46, 0.5, 0.28);
      for (const [x, y] of [[18, 84], [92, 82], [70, 92]]) ol(c, ell(x, y, 6, 8), col, line, 2.2);
      // Moos-Schopf
      c.fillStyle = "#4f9a45"; for (const [x, y, r] of [[36, 26, 10], [50, 20, 12], [66, 21, 11], [79, 28, 9]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      c.fillStyle = "#86c46a"; for (const [x, y, r] of [[40, 22, 6], [58, 16, 7], [73, 22, 5]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      for (const [x, y, fc] of [[34, 20, "#ff7fb0"], [62, 12, "#ffffff"], [80, 22, "#ffd75e"]]) { c.fillStyle = fc; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.256) * 3, y + Math.sin(k * 1.256) * 3, 2.4, 0, TAU); c.fill(); } c.fillStyle = "#ffcf3a"; c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill(); }
      // Blätterkrone
      for (const k of [-1, 0, 1]) ol(c, (c) => { c.moveTo(56 + k * 12, 14); c.quadraticCurveTo(56 + k * 16 - 6, -2, 56 + k * 18, -2 + Math.abs(k) * 4); c.quadraticCurveTo(56 + k * 16 + 6, 6, 56 + k * 12, 14); c.closePath(); }, "#9be07a", "#2f6a2a", 2.2);
      c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.ellipse(26, 46, 9, 5, -0.7, 0, TAU); c.fill(); c.beginPath(); c.arc(36, 38, 3, 0, TAU); c.fill();
      twoEyes(c, 56, 56, 15, "#1f5a2a", 0.95, mood); blush(c, 56, 70, 28, 1.2);
      if (mood !== "hurt") brows(c, 56, 42, 15, 1.1);
      ol(c, (c) => { c.moveTo(44, 72); c.quadraticCurveTo(56, 86, 68, 72); c.quadraticCurveTo(56, 76, 44, 72); c.closePath(); }, "#5a1a3a", line, 2.2);
      c.fillStyle = "#fff"; c.beginPath(); c.moveTo(50, 73); c.lineTo(53, 78); c.lineTo(56, 74); c.fill();
    });
    // Funkelflatter, die Kristall-Fledermaus: Kristall-Ohren, Kristall-Krönchen, Edelstein am Bauch (Flügel extra, flattern)
    case "funkelflatter": return spr(key, 96, 84, 48, 78, (c) => {
      const col = "#8a6ae0", line = shade(col, -0.62), cr = "#9ff0ff";
      for (const k of [-1, 1]) ol(c, (c) => { c.moveTo(48 + k * 12, 30); c.lineTo(48 + k * 20, 4); c.lineTo(48 + k * 28, 28); c.closePath(); }, cr, "#2e5a8a", 2.4);
      for (const k of [-1, 1]) { c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.moveTo(48 + k * 18, 12); c.lineTo(48 + k * 20, 6); c.lineTo(48 + k * 22, 16); c.fill(); }
      const b = ell(48, 48, 30, 28); ol(c, b, col, line, 3.2); shadeIn(c, b, 48, 48, 28);
      c.fillStyle = shade(col, 0.45); c.beginPath(); c.ellipse(48, 60, 15, 11, 0, 0, TAU); c.fill();
      // Edelstein am Bauch
      ol(c, (c) => { c.moveTo(48, 70); c.lineTo(41, 61); c.lineTo(44, 55); c.lineTo(52, 55); c.lineTo(55, 61); c.closePath(); }, "#ff9ae0", "#7a1a5a", 2);
      star4(c, 51, 57, 3, "#fff");
      // Kristall-Krönchen
      for (const [x, h] of [[38, 10], [48, 15], [58, 10]]) ol(c, (c) => { c.moveTo(x - 4, 24); c.lineTo(x, 24 - h); c.lineTo(x + 4, 24); c.closePath(); }, "#c8b8ff", "#4a2a8a", 1.8);
      twoEyes(c, 48, 42, 11, "#ff5d9a", 0.78, mood); if (mood !== "hurt") brows(c, 48, 30, 11, 0.85);
      c.fillStyle = "#fff"; for (const k of [-1, 1]) { c.beginPath(); c.moveTo(48 + k * 3, 52); c.lineTo(48 + k * 5.5, 58); c.lineTo(48 + k * 8, 52); c.fill(); }
      blush(c, 48, 52, 20, 1);
    });
    // Lolli-Lutz, der Zuckerpilz-Riese: Lolli-Spiralhut mit Streuseln, Ärmchen mit Lutscher
    case "lutz": return spr(key, 116, 124, 58, 118, (c) => {
      for (const k of [-1, 1]) ol(c, ell(58 + k * 13, 113, 10, 6), "#6a4a3a", "#2a1a10", 2.4);
      const st = ell(58, 86, 24, 28); ol(c, st, "#fff1dc", "#8a6a4a", 3); shadeIn(c, st, 58, 86, 26);
      // Ärmchen + Lutscher
      ol(c, ell(30, 92, 7, 5, 0.5), "#fff1dc", "#8a6a4a", 2.2);
      ol(c, (c) => c.roundRect(84, 64, 4, 34, 2), "#ffffff", "#aa8899", 1.6);
      ol(c, ell(86, 60, 12, 12), "#8fe9ff", "#2a6a8a", 2.4);
      c.strokeStyle = "#ffffff"; c.lineWidth = 3; c.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = 1 + a * 0.85; const x = 86 + Math.cos(a) * r, y = 60 + Math.sin(a) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      ol(c, ell(84, 92, 7, 5, -0.5), "#fff1dc", "#8a6a4a", 2.2);
      twoEyes(c, 58, 84, 10, "#5a2a4a", 0.8, mood); blush(c, 58, 97, 17, 1);
      if (mood !== "hurt") brows(c, 58, 73, 10, 0.8);
      c.strokeStyle = "#8a4a5a"; c.lineWidth = 2.4; c.beginPath(); c.arc(58, 99, 4, 0.2, Math.PI - 0.2); c.stroke();
      // Hut: Lolli-Spirale
      const cp = (c) => { c.moveTo(4, 62); c.bezierCurveTo(2, 14, 30, 4, 58, 4); c.bezierCurveTo(86, 4, 114, 14, 112, 62); c.quadraticCurveTo(58, 50, 4, 62); c.closePath(); };
      ol(c, cp, "#ff6fae", "#8a1a5e", 3.2);
      c.save(); c.beginPath(); cp(c); c.clip();
      c.strokeStyle = "#ffffff"; c.lineWidth = 7;
      c.beginPath(); for (let a = 0; a < 16; a += 0.2) { const r = 2 + a * 3.6; const x = 58 + Math.cos(a) * r, y = 36 + Math.sin(a) * r * 0.62; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      c.restore();
      shadeIn(c, cp, 58, 34, 50, 0.35, 0.22);
      const cs = ["#fff38a", "#8fe9ff", "#b3ff9a", "#c79bff"];
      for (let k = 0; k < 10; k++) { const x = 18 + (k * 37) % 80, y = 14 + (k * 23) % 34; c.save(); c.translate(x, y); c.rotate(k * 0.9); c.fillStyle = cs[k % 4]; c.fillRect(-3, -1.2, 6, 2.4); c.restore(); }
    });
    // Bibber, das Schneegespenst: Eiszapfen-Krone, gestreifter Schal, Schneeflocke auf der Backe
    case "bibber": return spr(key, 100, 112, 50, 106, (c) => {
      const col = "#eaf6ff";
      const b = (c) => { c.moveTo(10, 98); c.bezierCurveTo(4, 36, 26, 16, 50, 16); c.bezierCurveTo(74, 16, 96, 36, 90, 98); c.quadraticCurveTo(82, 88, 74, 100); c.quadraticCurveTo(66, 88, 58, 100); c.quadraticCurveTo(50, 88, 42, 100); c.quadraticCurveTo(34, 88, 26, 100); c.quadraticCurveTo(18, 88, 10, 98); c.closePath(); };
      c.globalAlpha = 0.93; ol(c, b, col, "#7a94c8", 3); c.globalAlpha = 1;
      shadeIn(c, b, 50, 50, 42, 0.5, 0.2);
      // Eiszapfen-Krone
      for (const [x, h] of [[34, 12], [42, 18], [50, 24], [58, 18], [66, 12]]) ol(c, (c) => { c.moveTo(x - 4, 22); c.lineTo(x, 22 - h); c.lineTo(x + 4, 22); c.closePath(); }, "#bfe9ff", "#4a7aa8", 1.8);
      twoEyes(c, 50, 50, 13, "#2a4a8a", 0.85, mood); blush(c, 50, 62, 22, 1.1);
      c.fillStyle = "#3a2a5a"; c.beginPath(); c.ellipse(50, 64, 5, 6.5, 0, 0, TAU); c.fill();
      // Schal
      const sc = (c) => { c.moveTo(16, 74); c.quadraticCurveTo(50, 86, 84, 74); c.lineTo(86, 82); c.quadraticCurveTo(50, 95, 14, 82); c.closePath(); };
      ol(c, sc, "#e8434f", "#7a1a2a", 2.4);
      c.save(); c.beginPath(); sc(c); c.clip(); c.fillStyle = "#ffffff"; for (let x = 10; x < 90; x += 12) c.fillRect(x, 70, 5, 30); c.restore();
      ol(c, (c) => c.roundRect(68, 80, 9, 20, 3), "#e8434f", "#7a1a2a", 2.2);
      // Schneeflocke
      c.strokeStyle = "#9fd8ff"; c.lineWidth = 1.8;
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; c.beginPath(); c.moveTo(78 + Math.cos(a) * 5, 44 + Math.sin(a) * 5); c.lineTo(78 - Math.cos(a) * 5, 44 - Math.sin(a) * 5); c.stroke(); }
    });
    // Glutpanzer Gustav, der Lava-Käfer: dunkler Panzer mit glühenden Rissen, großes Horn
    case "gustav": return spr(key, 124, 100, 62, 94, (c) => {
      const col = "#8a3a2a", line = "#2a0e08";
      c.strokeStyle = "#2a1a1a"; c.lineWidth = 3.6;
      for (const k of [-1, 1]) for (const d of [-10, 2, 14]) { c.beginPath(); c.moveTo(62 + k * 34 + k * d * 0.4, 78); c.quadraticCurveTo(62 + k * 52 + k * d * 0.3, 80 + d * 0.2, 62 + k * 58 + k * d * 0.1, 92 + d * 0.15); c.stroke(); }
      const sh = (c) => { c.moveTo(12, 78); c.bezierCurveTo(8, 30, 36, 18, 62, 18); c.bezierCurveTo(88, 18, 116, 30, 112, 78); c.quadraticCurveTo(62, 90, 12, 78); c.closePath(); };
      ol(c, sh, col, line, 3.4); shadeIn(c, sh, 62, 50, 46, 0.35, 0.35);
      // Lava-Risse
      c.save(); c.beginPath(); sh(c); c.clip();
      c.strokeStyle = "#ffb040"; c.lineWidth = 3; c.shadowColor = "#ff7a2a"; c.shadowBlur = 6;
      for (const pts of [[[30, 34], [40, 46], [34, 60]], [[62, 22], [60, 40], [66, 56], [62, 76]], [[92, 34], [84, 48], [92, 62]], [[46, 66], [54, 58]], [[78, 70], [72, 60]]]) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
      c.restore();
      for (const [x, y] of [[40, 30], [84, 30], [62, 34]]) { c.fillStyle = "rgba(255,210,120,.5)"; c.beginPath(); c.ellipse(x, y, 5, 3, 0, 0, TAU); c.fill(); }
      // Kopf + Horn
      ol(c, ell(62, 78, 24, 14), "#3a1a14", "#150605", 2.6);
      ol(c, (c) => { c.moveTo(54, 70); c.quadraticCurveTo(52, 44, 62, 34); c.quadraticCurveTo(64, 50, 70, 70); c.closePath(); }, "#ffd060", "#8a4a10", 2.4);
      c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.moveTo(58, 62); c.quadraticCurveTo(58, 48, 62, 40); c.lineTo(61, 56); c.fill();
      twoEyes(c, 62, 80, 12, "#ffb040", 0.62, mood);
      if (mood !== "hurt") brows(c, 62, 72, 12, 0.7);
    });
  }
  return null;
}
// Säulen der Boss-Arena (Deckung) je Welt: Wurzel-Stumpf · Kristall-Säule · Zuckerstangen-Säule · Eis-Säule · Lava-Obelisk
const PILLAR = [null,
  { a: "#8a5a33", b: "#6a4428", top: "#86c46a", glow: "#b6ff8a" }, { a: "#8a7fe0", b: "#5a4ab0", top: "#bfefff", glow: "#9ff0ff" },
  { a: "#ffffff", b: "#ff6fae", top: "#ffd1e6", glow: "#ffc2e8" }, { a: "#bfe9ff", b: "#8ac4e8", top: "#ffffff", glow: "#dff6ff" },
  { a: "#4a2a28", b: "#2e1818", top: "#ff8a3a", glow: "#ffb040" },
];
export function pillarSprite(bi, v = 0) {
  const P = PILLAR[bi] || PILLAR[1];
  return spr("pillar:" + bi + ":" + v, 64, 124, 32, 108, (c) => {
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(32, 108, 24, 11, 0, 0, TAU); c.fill();
    const body = (c) => { c.moveTo(12, 104); c.lineTo(14, 34); c.quadraticCurveTo(32, 24, 50, 34); c.lineTo(52, 104); c.quadraticCurveTo(32, 114, 12, 104); c.closePath(); };
    if (bi === 2) {   // Kristall-Säule: mehrere Prismen
      for (const [x, w, h, cl] of [[20, 9, 70, "#6a5ac8"], [44, 9, 62, "#7a6ad8"], [32, 12, 92, P.a]]) {
        ol(c, (c) => { c.moveTo(x - w, 106); c.lineTo(x - w, 106 - h * 0.8); c.lineTo(x, 106 - h); c.lineTo(x + w, 106 - h * 0.8); c.lineTo(x + w, 106); c.closePath(); }, cl, "#2a1a6a", 2.2);
        c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(x - w * 0.5, 106 - h * 0.78, w * 0.35, h * 0.6);
      }
      star4(c, 36, 20, 5, "#ffffff");
      return;
    }
    ol(c, body, P.a, shade(P.a, -0.6), 2.6);
    c.save(); c.beginPath(); body(c); c.clip();
    if (bi === 3) { c.strokeStyle = P.b; c.lineWidth = 8; for (let k = -4; k < 8; k++) { c.beginPath(); c.moveTo(0, 40 + k * 16); c.lineTo(64, 20 + k * 16); c.stroke(); } }
    if (bi === 1) { c.strokeStyle = P.b; c.lineWidth = 2; for (const x of [20, 30, 40, 46]) { c.beginPath(); c.moveTo(x, 36); c.quadraticCurveTo(x + 3, 70, x - 2, 106); c.stroke(); } }
    if (bi === 4) { c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(18, 36, 6, 64); c.fillRect(30, 40, 3, 56); }
    if (bi === 5) { c.strokeStyle = "#ffa040"; c.lineWidth = 2.6; c.shadowColor = "#ff7a2a"; c.shadowBlur = 5; for (const pts of [[[20, 44], [28, 60], [22, 76], [30, 96]], [[44, 40], [38, 58], [44, 80]]]) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); } }
    const g = c.createLinearGradient(12, 0, 52, 0); g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(0.6, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.28)");
    c.fillStyle = g; c.fillRect(0, 0, 64, 124);
    c.restore();
    // Kappe
    const cap = ell(32, 33, 19, 8);
    if (bi === 1) { ol(c, cap, "#c8905a", "#4a2a10", 2.2); c.strokeStyle = "#8a5a33"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(32, 33, 11, 4.5, 0, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(32, 33, 5, 2, 0, 0, TAU); c.stroke();
      c.fillStyle = P.top; for (const [x, y, r] of [[18, 30, 6], [26, 26, 5], [44, 29, 6]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      for (const [x, y] of [[44, 58], [16, 80]]) { ol(c, (c) => c.roundRect(x - 1.5, y - 5, 3, 5, 1), "#fff1dc", "#6a4a3a", 1); ol(c, (c) => { c.moveTo(x - 6, y - 4); c.quadraticCurveTo(x, y - 12, x + 6, y - 4); c.closePath(); }, v % 2 ? "#ff9a6a" : "#8fffcf", "#5a2a1a", 1.2); } }
    else if (bi === 3) { ol(c, (c) => { c.moveTo(12, 36); c.quadraticCurveTo(14, 12, 32, 10); c.quadraticCurveTo(50, 12, 52, 36); c.quadraticCurveTo(32, 42, 12, 36); c.closePath(); }, "#b3ff9a", "#3a7a2a", 2.4); c.fillStyle = "#fff"; for (const [x, y] of [[24, 22], [36, 18], [42, 28]]) { c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); } }
    else if (bi === 4) { ol(c, (c) => { c.moveTo(10, 36); c.quadraticCurveTo(16, 22, 32, 22); c.quadraticCurveTo(48, 22, 54, 36); c.quadraticCurveTo(32, 44, 10, 36); c.closePath(); }, "#ffffff", "#8ab0d0", 2.2);
      for (const x of [16, 26, 40, 48]) ol(c, (c) => { c.moveTo(x - 3, 38); c.lineTo(x, 50 + (x % 3) * 4); c.lineTo(x + 3, 38); c.closePath(); }, "#dff6ff", "#6a9ac0", 1.4); }
    else { ol(c, cap, shade(P.a, 0.2), shade(P.a, -0.6), 2.2); const gg = c.createRadialGradient(32, 32, 1, 32, 32, 14); gg.addColorStop(0, "#fff0a0"); gg.addColorStop(0.5, "#ff8a2a"); gg.addColorStop(1, "rgba(200,40,10,0)"); c.fillStyle = gg; c.beginPath(); c.ellipse(32, 32, 16, 7, 0, 0, TAU); c.fill(); }
  });
}
/** Arena-Tor (steht auf einer Gang-Kachel): Ranken · Kristall-Gitter · Zuckerstangen · Eiszapfen · Lava-Steine */
export function gateSprite(bi) {
  return spr("gate:" + bi, 64, 76, 32, 58, (c) => {
    c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(32, 58, 26, 12, 0, 0, TAU); c.fill();
    const xs = [[12, 52, 44], [32, 60, 56], [52, 52, 44]];
    for (const [x, y, h] of xs) {
      if (bi === 1) {
        c.strokeStyle = "#2f6a2a"; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 8, y - h * 0.3, x + 8, y - h * 0.6, x, y - h); c.stroke();
        c.strokeStyle = "#7fd46a"; c.lineWidth = 4; c.stroke();
        for (let k = 1; k < 4; k++) { const yy = y - h * k / 4, xx = x + (k % 2 ? 5 : -5); ol(c, ell(xx, yy, 5, 3, k % 2 ? 0.6 : -0.6), "#9be07a", "#2f6a2a", 1.4); }
        c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(x - 2, y - h * 0.5); c.lineTo(x - 7, y - h * 0.52); c.lineTo(x - 2, y - h * 0.44); c.fill();
      } else if (bi === 2) {
        ol(c, (c) => { c.moveTo(x - 6, y); c.lineTo(x - 5, y - h * 0.75); c.lineTo(x, y - h); c.lineTo(x + 5, y - h * 0.75); c.lineTo(x + 6, y); c.closePath(); }, "#9a8aff", "#2a1a6a", 2);
        c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x - 3, y - h * 0.72, 2.4, h * 0.6);
      } else if (bi === 3) {
        ol(c, (c) => c.roundRect(x - 4, y - h + 8, 8, h - 8, 3), "#ffffff", "#aa6688", 1.8);
        c.save(); c.beginPath(); c.roundRect(x - 4, y - h + 8, 8, h - 8, 3); c.clip(); c.strokeStyle = "#ff5a9a"; c.lineWidth = 3; for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(x - 6, y - k * 7); c.lineTo(x + 6, y - k * 7 - 6); c.stroke(); } c.restore();
        c.strokeStyle = "#ff5a9a"; c.lineWidth = 8; c.beginPath(); c.arc(x + 5, y - h + 8, 5, Math.PI, 0); c.stroke(); c.strokeStyle = "#ffffff"; c.lineWidth = 4; c.stroke();
      } else if (bi === 4) {
        ol(c, (c) => { c.moveTo(x - 7, y); c.quadraticCurveTo(x - 3, y - h * 0.6, x, y - h); c.quadraticCurveTo(x + 3, y - h * 0.6, x + 7, y); c.closePath(); }, "#dff6ff", "#5a8ab8", 2);
        c.fillStyle = "rgba(255,255,255,.75)"; c.fillRect(x - 3, y - h * 0.7, 2, h * 0.55);
      } else {
        ol(c, (c) => { c.moveTo(x - 8, y); c.lineTo(x - 4, y - h * 0.7); c.lineTo(x + 1, y - h); c.lineTo(x + 6, y - h * 0.6); c.lineTo(x + 8, y); c.closePath(); }, "#4a2a28", "#150808", 2.2);
        c.strokeStyle = "#ffa040"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 2, y - 4); c.lineTo(x + 1, y - h * 0.5); c.lineTo(x - 1, y - h * 0.8); c.stroke();
      }
    }
  });
}
/** Versiegelte Treppe: Steinplatte mit Schloss-Rune und Bändern in Welt-Farbe (keine Treppe sichtbar) */
export function sealSprite(bi) {
  const B = BIOME_COLS[bi] || BIOME_COLS[1], band = ["#c8a050", "#5fae4f", "#8a7fe0", "#ff6fae", "#8ac4e8", "#ff8a3a"][bi] || "#c8a050";
  return spr("seal:" + bi, 72, 50, 36, 20, (c) => {
    const d = (c, i) => { c.moveTo(36, 4 + i); c.lineTo(66 - i * 1.8, 20); c.lineTo(36, 36 - i); c.lineTo(6 + i * 1.8, 20); c.closePath(); };
    ol(c, (c) => d(c, 0), shade(B.rim, -0.15), shade(B.rim, -0.6), 2.4);
    c.beginPath(); d(c, 3); c.fillStyle = shade(B.rim, 0.12); c.fill();
    c.strokeStyle = band; c.lineWidth = 4;
    c.beginPath(); c.moveTo(14, 14); c.lineTo(58, 26); c.moveTo(58, 14); c.lineTo(14, 26); c.stroke();
    c.strokeStyle = shade(band, -0.5); c.lineWidth = 1.2; c.stroke();
    // Schloss-Rune
    ol(c, ell(36, 20, 9, 5), "#ffd75e", "#8a6212", 2);
    c.fillStyle = "#5a3a10"; c.beginPath(); c.arc(36, 18.5, 1.8, 0, TAU); c.fill(); c.fillRect(35.2, 19, 1.6, 3);
  });
}
