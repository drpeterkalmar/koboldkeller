/* myth.js — v9 Mythos-Kostüme: prozedurale Chibi-Grafik (Körper-Überzug, Kopfteil, bewegtes Rückenteil) für alle 8 Tierarten (MIT)
   Aufbau je Kostüm (config.MYTHS): body (Überzug im Körper-Sprite) · head (Kapuze/Helm in zwei Lagen um das freie Gesicht, oder Hut
   oben drauf) · back (Flügel/Umhang/Schwänze als EIGENE Ebene, per Transform animiert — Sprites bleiben gecacht).
   Ohren-Regel (Kapuzen/Helme): die Ohren der Tierart schauen durch (werden über der Kapuze gezeichnet), Kapuzen-eigene Ohren nur bei
   Tierarten ohne hohe Ohren. Extras: Brille/Sommersprossen bleiben im Gesicht, Blume/Schleife/Sternspange rücken an den Kapuzen-/Hutrand. */
import { spr, ol, shadeIn, ell, star4, star5, heartPath, drawEars, drawSpeciesHorns, drawAcc, HX, HY, HR } from "./art.js";
import { MYTH_BY_ID, LOOK_RULES, colDist } from "./config.js";
import { shade, rgba, TAU, mulberry32, mixHex } from "./util.js";

// Aussehen-abhängige Sprites (Körper, Köpfe, Kostümteile) laufen über eine LRU (art.js spr) — höchstens max Stück
export const MYTH_LRU = { max: 160, test: k => /^(body|head|mh|mb|mf):/.test(k) };
const RAINBOW = ["#ff7a9a", "#ffc56e", "#fff38a", "#8ff08a", "#8fd8ff", "#c79bff"];
const OL = "#2a1830";

/** Akzentfarbe: Outfit-Farbe, wenn sie sich vom Kostüm abhebt (LOOK_RULES.mythAccent), sonst der eigene Akzent */
export function mythAccent(M, outfit) { return outfit && colDist(outfit, M.col.main) >= LOOK_RULES.mythAccent && colDist(outfit, M.col.dark) >= 60 ? outfit : M.col.acc; }
export function mythFoot(look) { const M = MYTH_BY_ID[look.myth]; return M ? shade(M.col.main === "#fdf8ff" || M.col.main === "#f6faff" || M.col.main === "#fff6ee" ? M.col.dark : M.col.main, -0.3) : null; }

// =====================================================================
// Körper-Überzug (im Körper-Sprite, Box 90×72, Anker Füße 45/66)
// =====================================================================
export function drawMythBody(c, o, M, outfit, BX, BY) {
  const C = M.col, dk = C.dark, acc = mythAccent(M, outfit), sleeve = M.body === "leaf" || M.body === "fin" ? o.skin : M.body === "kimono" ? C.main : C.main;
  const torso = (c) => {
    c.moveTo(BX - 13, BY - 44);
    c.bezierCurveTo(BX - 22, BY - 34, BX - 24, BY - 10, BX - 18, BY - 6);
    c.quadraticCurveTo(BX, BY + 1, BX + 18, BY - 6);
    c.bezierCurveTo(BX + 24, BY - 10, BX + 22, BY - 34, BX + 13, BY - 44);
    c.quadraticCurveTo(BX, BY - 48, BX - 13, BY - 44); c.closePath();
  };
  // Arme (Ärmel des Anzugs bzw. Haut bei Kleidern) + heller Bündchen-Rand
  for (const s of [-1, 1]) {
    ol(c, ell(BX + s * 20, BY - 26, 6.5, 9, s * -0.5), sleeve, sleeve === o.skin ? shade(o.skin, -0.55) : dk, 2.8);
    if (sleeve !== o.skin) { c.fillStyle = C.light; c.beginPath(); c.ellipse(BX + s * 22.5, BY - 20.5, 4.4, 2.6, s * -0.5, 0, TAU); c.fill(); }
  }
  const clip = (fn) => { c.save(); c.beginPath(); torso(c); c.clip(); fn(); c.restore(); };
  const r = mulberry32(7);
  switch (M.body) {
    case "robe": {   // Zaubermantel: unten glockig weit
      const robe = (c) => { c.moveTo(BX - 13, BY - 44); c.bezierCurveTo(BX - 22, BY - 34, BX - 30, BY - 8, BX - 27, BY - 2); c.quadraticCurveTo(BX, BY + 4, BX + 27, BY - 2); c.bezierCurveTo(BX + 30, BY - 8, BX + 22, BY - 34, BX + 13, BY - 44); c.quadraticCurveTo(BX, BY - 48, BX - 13, BY - 44); c.closePath(); };
      ol(c, robe, C.main, dk, 3); shadeIn(c, robe, BX, BY - 24, 24, 0.3, 0.35);
      c.save(); c.beginPath(); robe(c); c.clip();
      c.fillStyle = C.light; c.fillRect(BX - 3, BY - 44, 6, 48);                                   // Knopfleiste
      for (const [x, y, s] of [[-16, -14, 4], [14, -30, 3.2], [-10, -34, 2.6], [18, -10, 3.6], [-20, -26, 2.4]]) { c.beginPath(); star5(c, BX + x, BY + y, s, s * 0.45); c.fillStyle = C.acc; c.fill(); }
      c.beginPath(); c.arc(BX + 9, BY - 20, 4.5, 0.6, 5.2); c.arc(BX + 11, BY - 21, 3.6, 5.2, 0.6, true); c.fillStyle = "#fff6c0"; c.fill();
      c.restore();
      ol(c, (c) => c.roundRect(BX - 20, BY - 20, 40, 5, 2.5), acc, shade(acc, -0.55), 2);
      break;
    }
    case "leaf": {   // Blätterkleid: Blätter-Saum, Mieder
      ol(c, torso, C.light, dk, 3);
      for (let i = -3; i <= 3; i++) {
        const x = BX + i * 7.2, lf = (c) => { c.moveTo(x - 5, BY - 22); c.quadraticCurveTo(x - 8, BY - 6, x, BY + 3 - Math.abs(i)); c.quadraticCurveTo(x + 8, BY - 6, x + 5, BY - 22); c.closePath(); };
        ol(c, lf, i % 2 ? C.main : shade(C.main, -0.12), dk, 2.2);
        c.strokeStyle = rgba(C.dark, 0.6); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, BY - 20); c.lineTo(x, BY - 2 - Math.abs(i)); c.stroke();
      }
      clip(() => { c.fillStyle = shade(C.main, 0.1); c.fillRect(BX - 30, BY - 46, 60, 22); });
      c.beginPath(); torso(c); c.strokeStyle = dk; c.lineWidth = 2.6; c.save(); c.clip(); c.stroke(); c.restore();
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ol(c, ell(BX + Math.cos(a) * 3.6, BY - 32 + Math.sin(a) * 3.6, 3.2, 3.2), acc, shade(acc, -0.5), 1.4); }
      ol(c, ell(BX, BY - 32, 2.4, 2.4), "#ffe36e", "#8a6212", 1.2);
      return;
    }
    case "fin": {    // Nixen-Oberteil (Schuppen) + Flossenrock
      ol(c, torso, C.main, dk, 3);
      clip(() => {
        c.strokeStyle = rgba(C.light, 0.8); c.lineWidth = 1.5;
        for (let y = BY - 40; y < BY - 14; y += 5) for (let x = BX - 24 + ((y / 5) % 2) * 3; x < BX + 24; x += 6) { c.beginPath(); c.arc(x, y, 3, 0.1, Math.PI - 0.1); c.stroke(); }
        shadeIn(c, torso, BX, BY - 24, 22, 0.3, 0.3);
      });
      for (const s of [-1, 0, 1]) {
        const fin = (c) => { c.moveTo(BX + s * 10 - 7, BY - 16); c.quadraticCurveTo(BX + s * 16 - 12, BY + 2, BX + s * 22, BY + 4); c.quadraticCurveTo(BX + s * 12 + 6, BY - 4, BX + s * 10 + 7, BY - 16); c.closePath(); };
        ol(c, fin, s ? C.acc : shade(C.acc, 0.2), shade(C.acc, -0.55), 2.2);
        c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(BX + s * 10 + k * 3, BY - 14); c.lineTo(BX + s * 17 + k * 4, BY); c.stroke(); }
      }
      ol(c, (c) => c.roundRect(BX - 19, BY - 20, 38, 5, 2.5), "#fff4f8", shade(C.dark, -0.2), 1.8);
      for (const x of [-9, 0, 9]) ol(c, ell(BX + x, BY - 17.5, 2.6, 2.6), x ? "#ffd1e8" : acc, "#8a4a6a", 1.2);
      return;
    }
    default: {
      ol(c, torso, C.main, dk, 3);
      shadeIn(c, torso, BX, BY - 24, 22, 0.35, 0.3);
    }
  }
  clip(() => {
    switch (M.body) {
      case "scales": case "night": {
        const belly = M.body === "night" ? C.light : C.light;
        c.fillStyle = belly; c.beginPath(); c.ellipse(BX, BY - 18, 12, 17, 0, 0, TAU); c.fill();
        c.strokeStyle = rgba(M.body === "night" ? "#ffffff" : C.dark, 0.35); c.lineWidth = 1.4;
        for (let y = BY - 30; y < BY - 2; y += 5.5) { c.beginPath(); c.moveTo(BX - 10, y); c.quadraticCurveTo(BX, y + 2.5, BX + 10, y); c.stroke(); }
        c.strokeStyle = rgba(C.dark, 0.55); c.lineWidth = 1.6;
        for (const s of [-1, 1]) for (let y = BY - 38; y < BY - 8; y += 6) { c.beginPath(); c.arc(BX + s * 17, y, 3, 0.2, Math.PI - 0.2); c.stroke(); }
        if (M.body === "night") { for (let i = 0; i < 9; i++) { const x = BX + (r() - 0.5) * 42, y = BY - 44 + r() * 40; if (Math.abs(x - BX) < 11 && y > BY - 34) continue; star4(c, x, y, 1.4 + r() * 2.2, i % 3 ? "#fff6c0" : "#bff4ff"); } }
        break;
      }
      case "fluffy": {
        c.fillStyle = C.light; c.beginPath(); c.ellipse(BX, BY - 18, 12, 16, 0, 0, TAU); c.fill();
        RAINBOW.forEach((h, i) => { c.fillStyle = rgba(h, 0.85); c.fillRect(BX - 30, BY - 46 + i * 2.2, 60, 2.2); });
        c.fillStyle = C.main; for (let x = BX - 24; x <= BX + 24; x += 7) { c.beginPath(); c.arc(x, BY - 3, 5, 0, TAU); c.fill(); }
        break;
      }
      case "moss": {
        for (let i = 0; i < 14; i++) { c.fillStyle = rgba(i % 2 ? C.light : shade(C.main, -0.18), 0.7); c.beginPath(); c.ellipse(BX + (r() - 0.5) * 44, BY - 44 + r() * 42, 3 + r() * 3, 2 + r() * 2, r() * 3, 0, TAU); c.fill(); }
        c.fillStyle = shade(C.acc, -0.1); c.fillRect(BX - 30, BY - 19, 60, 4.5);
        break;
      }
      case "feathers": {
        c.fillStyle = C.light; c.beginPath(); c.ellipse(BX, BY - 14, 13, 16, 0, 0, TAU); c.fill();
        c.strokeStyle = rgba(C.dark, 0.45); c.lineWidth = 1.5;
        for (let y = BY - 34; y < BY - 2; y += 5) for (let x = BX - 22 + ((y / 5) % 2) * 3.5; x < BX + 24; x += 7) { c.beginPath(); c.arc(x, y, 3.4, 0.15, Math.PI - 0.15); c.stroke(); }
        break;
      }
      case "armor": {
        const g = c.createLinearGradient(BX - 20, BY - 44, BX + 20, BY); g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, C.main); g.addColorStop(1, shade(C.main, -0.25));
        c.fillStyle = g; c.fillRect(BX - 30, BY - 48, 60, 50);
        c.strokeStyle = rgba(C.dark, 0.55); c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(BX, BY - 44); c.lineTo(BX, BY - 4); c.moveTo(BX - 20, BY - 30); c.lineTo(BX, BY - 22); c.lineTo(BX + 20, BY - 30); c.moveTo(BX - 20, BY - 14); c.lineTo(BX, BY - 8); c.lineTo(BX + 20, BY - 14); c.stroke();
        c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.moveTo(BX - 14, BY - 40); c.lineTo(BX - 6, BY - 40); c.lineTo(BX - 12, BY - 28); c.closePath(); c.fill();
        break;
      }
      case "kimono": {
        c.strokeStyle = acc; c.lineWidth = 3.4; c.beginPath(); c.moveTo(BX - 12, BY - 44); c.lineTo(BX + 4, BY - 20); c.moveTo(BX + 12, BY - 44); c.lineTo(BX - 2, BY - 24); c.stroke();
        c.fillStyle = C.dark; c.fillRect(BX - 30, BY - 22, 60, 7);
        c.fillStyle = shade(C.dark, 0.35); c.fillRect(BX - 30, BY - 20, 60, 2);
        c.fillStyle = rgba(C.dark, 0.18); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(BX - 14 + i * 9, BY - 8 + (i % 2) * 3, 2.4, 0, TAU); c.fill(); }
        break;
      }
      case "fur": {
        c.fillStyle = rgba(C.acc, 0.35); c.beginPath(); c.ellipse(BX, BY - 18, 11, 15, 0, 0, TAU); c.fill();
        c.strokeStyle = rgba(C.dark, 0.4); c.lineWidth = 1.5;
        for (let i = 0; i < 16; i++) { const x = BX + (r() - 0.5) * 40, y = BY - 42 + r() * 36; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y + 3, x + 1, y + 6); c.stroke(); }
        break;
      }
      case "furvest": {
        c.fillStyle = C.light; c.fillRect(BX - 7, BY - 46, 14, 48);
        c.strokeStyle = rgba(C.dark, 0.45); c.lineWidth = 1.4;
        for (let i = 0; i < 12; i++) { const s = i % 2 ? -1 : 1, x = BX + s * (10 + r() * 12), y = BY - 42 + r() * 34; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s * 2, y + 3, x + s, y + 6); c.stroke(); }
        break;
      }
      case "rock": {
        c.fillStyle = shade(C.main, -0.18);
        for (const [x, y, w, h] of [[-22, -44, 18, 16], [4, -46, 20, 18], [-24, -24, 16, 20], [8, -24, 18, 20], [-8, -32, 14, 14]]) { c.beginPath(); c.roundRect(BX + x, BY + y, w, h, 4); c.fill(); c.strokeStyle = rgba(C.dark, 0.6); c.lineWidth = 1.4; c.stroke(); }
        c.strokeStyle = C.acc; c.lineWidth = 2; c.shadowColor = C.acc; c.shadowBlur = 4;
        c.beginPath(); c.moveTo(BX - 18, BY - 30); c.lineTo(BX - 8, BY - 24); c.lineTo(BX - 2, BY - 30); c.lineTo(BX + 6, BY - 20); c.lineTo(BX + 14, BY - 26); c.moveTo(BX - 6, BY - 10); c.lineTo(BX + 2, BY - 14); c.lineTo(BX + 10, BY - 8); c.stroke();
        c.shadowBlur = 0;
        break;
      }
      case "flame": {
        const g = c.createLinearGradient(0, BY - 46, 0, BY); g.addColorStop(0, C.light); g.addColorStop(0.45, C.main); g.addColorStop(1, C.dark);
        c.fillStyle = g; c.fillRect(BX - 30, BY - 48, 60, 50);
        for (let i = -3; i <= 3; i++) { const x = BX + i * 7; c.fillStyle = i % 2 ? C.light : "#ffb040"; c.beginPath(); c.moveTo(x - 4, BY - 36 + Math.abs(i) * 2); c.quadraticCurveTo(x, BY - 24, x, BY - 16 + Math.abs(i)); c.quadraticCurveTo(x + 1, BY - 26, x + 4, BY - 36 + Math.abs(i) * 2); c.fill(); }
        break;
      }
    }
  });
  // Kragen / Glöckchen / Herz-Knopf in Akzentfarbe
  switch (M.body) {
    case "feathers": for (let i = -3; i <= 3; i++) ol(c, ell(BX + i * 5.5, BY - 44 + Math.abs(i) * 1.2, 4.2, 6, i * 0.2), C.light, dk, 1.8); break;
    case "furvest": case "fur": for (let i = -3; i <= 3; i++) ol(c, ell(BX + i * 5.5, BY - 44 + Math.abs(i) * 1.1, 4.4, 4.2), M.body === "fur" ? C.main : C.light, rgba(C.dark, 0.8), 1.6); break;
    case "kimono": ol(c, ell(BX, BY - 38, 4.6, 4.6), "#ffd75e", "#8a6212", 2); c.fillStyle = "#8a6212"; c.fillRect(BX - 0.8, BY - 37, 1.6, 3); c.beginPath(); c.arc(BX, BY - 38.5, 1.2, 0, TAU); c.fill(); break;
    case "armor": ol(c, (c) => { c.moveTo(BX, BY - 38); c.lineTo(BX + 5, BY - 32); c.lineTo(BX, BY - 26); c.lineTo(BX - 5, BY - 32); c.closePath(); }, acc, shade(acc, -0.55), 1.8); break;
    case "flame": case "night": ol(c, ell(BX, BY - 30, 4.4, 4.4), acc, shade(acc, -0.55), 1.8); c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(BX - 1.4, BY - 31.4, 1.4, 0, TAU); c.fill(); break;
    case "scales": case "fluffy": case "moss": case "rock": c.beginPath(); heartPath(c, BX, BY - 30, 4.4); c.fillStyle = acc; c.fill(); c.strokeStyle = shade(acc, -0.55); c.lineWidth = 1.4; c.stroke(); break;
  }
}

// =====================================================================
// Kopfteil (zwei Lagen um den Kopf-Sprite: "back" hinter dem Kopf = Kapuzen-Schale + Umhang-Kragen, "front" davor = Stirn-Rand,
// Hörner/Horn/Schnabel/Krone, durchschauende Ohren, versetzte Kopf-Extras). Box 150×190, Anker 75/170 (= Hals des Kopf-Sprites).
// =====================================================================
const OX = 15, OY = 58;
const isHood = M => M.head.startsWith("hood");
/** Stirn-Linie der Kapuze: mittig über den Augen flach, an den Seiten tief herunter (Gesicht bleibt frei) */
const brow = (x) => { const d = Math.max(0, (Math.abs(x - HX) - 20) / 23); return HY - 16 + 30 * d * d; };
const hoodOuter = (c, k = 1) => c.ellipse(HX, HY - 2, (HR + 9) * k, (HR + 7) * k, 0, 0, TAU);
const TALL = ["bunny", "cat", "fox", "panda"];
export function mythHead(look, layer) {
  const M = MYTH_BY_ID[look.myth];
  if (!M || look.mhat) return null;
  if (layer === "back" && !isHood(M) && M.head !== "hatWreath") return null;
  const key = "mh:" + M.id + ":" + layer + ":" + look.species + ":" + look.earsV + ":" + look.skin + ":" + look.hair + ":" + look.acc;
  return spr(key, 150, 190, 75, 170, (c) => { c.translate(OX, OY); layer === "back" ? drawHeadBack(c, M, look) : drawHeadFront(c, M, look); });
}
function hoodCols(M) {
  switch (M.head) {
    case "hoodKnight": return { fill: M.col.main, rim: "#eafcff", line: M.col.dark };
    case "hoodRock": return { fill: M.col.main, rim: M.col.light, line: M.col.dark };
    case "hoodFox": return { fill: M.col.main, rim: "#ffd9c0", line: M.col.dark };
    case "hoodYeti": return { fill: M.col.main, rim: "#ffffff", line: M.col.dark };
    case "hoodEagle": return { fill: M.col.main, rim: M.col.light, line: M.col.dark };
    case "hoodUnicorn": return { fill: M.col.main, rim: "#ffc8e8", line: M.col.dark };
    default: return { fill: M.col.main, rim: M.col.light, line: M.col.dark };
  }
}
function drawHeadBack(c, M, o) {
  const H = hoodCols(M);
  if (M.head === "hatWreath") {           // Kranz: hintere Blätter
    for (let i = 0; i < 7; i++) { const a = Math.PI + 0.2 + i / 6 * (Math.PI - 0.4); leaf(c, HX + Math.cos(a) * 36, HY - 18 + Math.sin(a) * 18, a + Math.PI / 2, 8, shade(M.col.main, -0.15), M.col.dark); }
    return;
  }
  // Umhang-Kragen über den Schultern (liegt auf dem Körper)
  const drape = (c) => { c.moveTo(HX - 30, HY + 14); c.quadraticCurveTo(HX - 40, HY + 38, HX - 30, HY + 46); c.quadraticCurveTo(HX, HY + 52, HX + 30, HY + 46); c.quadraticCurveTo(HX + 40, HY + 38, HX + 30, HY + 14); c.closePath(); };
  if (M.head !== "hoodKnight" && M.head !== "hoodRock") { ol(c, drape, shade(H.fill, -0.08), H.line, 3); }
  if (M.head === "hoodUnicorn") {         // Regenbogen-Mähne hinten
    RAINBOW.forEach((h, i) => { c.lineCap = "round"; c.strokeStyle = shade(h, -0.35); c.lineWidth = 9; c.beginPath(); c.moveTo(HX + 4 + i * 3, HY - 40 + i * 3); c.bezierCurveTo(HX + 34 + i * 3, HY - 36 + i * 4, HX + 44 + i * 2, HY + 2 + i * 3, HX + 36 + i * 2, HY + 30 + i * 2); c.stroke(); c.strokeStyle = h; c.lineWidth = 6; c.stroke(); });
  }
  if (M.head === "hoodYeti") scallop(c, HX, HY - 2, HR + 11, HR + 9, 18, H.fill, H.line);
  else { ol(c, (c) => hoodOuter(c), H.fill, H.line, 3.4); shadeIn(c, (c) => hoodOuter(c), HX, HY - 4, HR + 6, 0.3, 0.35); }
  if (M.head === "hoodStar") starDots(c, (c) => hoodOuter(c), 12, 91);
  if (M.head === "hoodRock") rockCracks(c, (c) => hoodOuter(c), M.col.acc);
}
function drawHeadFront(c, M, o) {
  const H = hoodCols(M), C = M.col;
  let accAt = [8, 12];                    // Versatz der Kopf-Extras (Blume/Schleife/Stern) an den Rand
  if (isHood(M)) {
    // Kapuzen-Vorderteil: Kapuzen-Umriss oberhalb der Stirn-Linie
    const front = (c) => { c.moveTo(HX - 60, HY - 70); c.lineTo(HX + 60, HY - 70); for (let x = HX + 60; x >= HX - 60; x -= 3) c.lineTo(x, brow(x)); c.closePath(); };
    c.save(); c.beginPath(); if (M.head === "hoodYeti") scallopPath(c, HX, HY - 2, HR + 11, HR + 9, 18); else hoodOuter(c); c.clip();
    c.beginPath(); front(c); c.fillStyle = H.fill; c.fill();
    shadeIn(c, front, HX, HY - 30, HR + 8, 0.35, 0.2);
    if (M.head === "hoodStar") starDots(c, front, 10, 17);
    if (M.head === "hoodRock") rockCracks(c, front, C.acc);
    if (M.head === "hoodKnight") { c.strokeStyle = rgba(C.dark, 0.5); c.lineWidth = 1.6; c.beginPath(); c.moveTo(HX, HY - 44); c.lineTo(HX, HY - 18); c.moveTo(HX - 26, HY - 34); c.lineTo(HX - 8, HY - 24); c.moveTo(HX + 26, HY - 34); c.lineTo(HX + 8, HY - 24); c.stroke(); c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.moveTo(HX - 18, HY - 40); c.lineTo(HX - 8, HY - 42); c.lineTo(HX - 16, HY - 28); c.closePath(); c.fill(); }
    if (M.head === "hoodFox") { c.fillStyle = C.acc; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(HX + s * 9, HY - 22, 2.4, 5.5, s * 0.5, 0, TAU); c.fill(); } }
    if (M.head === "hoodEagle") { c.fillStyle = C.light; for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(HX + i * 9, brow(HX + i * 9) - 3, 6, 5, 0, 0, TAU); c.fill(); } }
    c.restore();
    // Rand der Gesichtsöffnung (weich, heller)
    const rimPath = (c) => { let first = true; for (let x = HX - 42; x <= HX + 42; x += 3) { const y = brow(x); if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); } };
    c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); rimPath(c); c.strokeStyle = H.line; c.lineWidth = 9.5; c.stroke();
    c.beginPath(); rimPath(c); c.strokeStyle = H.rim; c.lineWidth = 6; c.stroke();
    if (M.head === "hoodYeti") { c.fillStyle = H.rim; for (let x = HX - 36; x <= HX + 36; x += 8) { c.beginPath(); c.arc(x, brow(x) + 1, 4.2, 0, TAU); c.fill(); } }
    // Umriss (über der Stirn) nachziehen
    c.save(); c.beginPath(); c.rect(0, 0, 150, brow(HX) + 2); c.rect(0, 0, HX - 34, 200); c.rect(HX + 34, 0, 200, 200); c.clip();
    c.beginPath(); if (M.head === "hoodYeti") scallopPath(c, HX, HY - 2, HR + 11, HR + 9, 18); else hoodOuter(c); c.strokeStyle = H.line; c.lineWidth = 3.4; c.stroke();
    c.restore();
    hoodFeatures(c, M, o);
    // Ohren der Tierart schauen durch (mit kleinem Kapuzen-Loch-Ring)
    if (o.ears !== "octo") {
      drawEars(c, o);
      if (TALL.includes(o.ears)) { c.fillStyle = H.line; for (const s of [-1, 1]) { if (o.ears === "bunny" && o.earsV && s > 0) continue; c.beginPath(); c.ellipse(HX + s * (o.ears === "bunny" ? 15 : 20), HY - 30, 8, 3.2, 0, 0, TAU); c.fill(); } }
    }
    drawSpeciesHorns(c, o);
    accAt = [10, 10];
  } else hatFeatures(c, M, o);
  if (M.head === "hatWizard") accAt = [-2, -8];
  if (M.head === "hatShell" || M.head === "hatPhoenix") accAt = [8, 10];
  drawAcc(c, o, "open", "top", accAt[0], accAt[1]);
}
function hoodFeatures(c, M, o) {
  const C = M.col, ownEars = !TALL.includes(o.ears) && o.ears !== "round";
  switch (M.head) {
    case "hoodDragon": case "hoodStar": {
      const star = M.head === "hoodStar";
      for (const s of [-1, 1]) {
        const horn = (c) => { c.moveTo(HX + s * 12, HY - 34); c.quadraticCurveTo(HX + s * 20, HY - 60, HX + s * 30, HY - 62); c.quadraticCurveTo(HX + s * 24, HY - 50, HX + s * 26, HY - 30); c.closePath(); };
        if (star) { const g = c.createLinearGradient(0, HY - 62, 0, HY - 30); g.addColorStop(0, "#fff6c0"); g.addColorStop(1, C.light); ol(c, horn, g, C.dark, 2.6); }
        else ol(c, horn, "#fff2c9", "#8a6a2a", 2.6);
      }
      for (let i = -1; i <= 1; i++) ol(c, (c) => { c.moveTo(HX + i * 9 - 5, HY - 40 + Math.abs(i) * 2); c.lineTo(HX + i * 9, HY - 52 + Math.abs(i) * 3); c.lineTo(HX + i * 9 + 5, HY - 40 + Math.abs(i) * 2); c.closePath(); }, star ? "#bff4ff" : C.acc, star ? C.dark : shade(C.acc, -0.55), 2);
      if (star) { star4(c, HX + 24, HY - 62, 4, "#ffffff"); star4(c, HX - 30, HY - 58, 3, "#fff6c0"); }
      break;
    }
    case "hoodUnicorn": {
      if (ownEars) for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(HX + s * 22, HY - 32); c.quadraticCurveTo(HX + s * 32, HY - 52, HX + s * 34, HY - 50); c.quadraticCurveTo(HX + s * 36, HY - 36, HX + s * 32, HY - 26); c.closePath(); }, C.main, C.dark, 2.4);
      const horn = (c) => { c.moveTo(HX - 7, HY - 36); c.lineTo(HX, HY - 74); c.lineTo(HX + 7, HY - 36); c.closePath(); };
      const g = c.createLinearGradient(HX - 6, 0, HX + 6, 0); g.addColorStop(0, "#fff6c0"); g.addColorStop(1, "#ffcf4a");
      ol(c, horn, g, "#a07a1a", 2.6);
      c.save(); c.beginPath(); horn(c); c.clip(); c.strokeStyle = "#c8962a"; c.lineWidth = 1.8; for (let y = HY - 70; y < HY - 36; y += 7) { c.beginPath(); c.moveTo(HX - 8, y + 4); c.lineTo(HX + 8, y); c.stroke(); } c.restore();
      star4(c, HX + 6, HY - 70, 4, "#ffffff");
      break;
    }
    case "hoodEagle": {
      if (ownEars) for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(HX + s * 24, HY - 34); c.quadraticCurveTo(HX + s * 40, HY - 52, HX + s * 44, HY - 44); c.quadraticCurveTo(HX + s * 36, HY - 36, HX + s * 34, HY - 24); c.closePath(); }, C.light, C.dark, 2.2);
      const beak = (c) => { c.moveTo(HX - 11, HY - 34); c.quadraticCurveTo(HX, HY - 42, HX + 11, HY - 34); c.quadraticCurveTo(HX + 8, HY - 22, HX, HY - 17); c.quadraticCurveTo(HX - 8, HY - 22, HX - 11, HY - 34); c.closePath(); };
      ol(c, beak, C.acc, "#8a5a0a", 2.6); c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.ellipse(HX - 4, HY - 33, 3, 1.8, -0.3, 0, TAU); c.fill();
      for (const s of [-1, 1]) { c.fillStyle = OL; c.beginPath(); c.arc(HX + s * 16, HY - 38, 3, 0, TAU); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(HX + s * 16 - 1, HY - 39, 1.1, 0, TAU); c.fill(); }
      break;
    }
    case "hoodKnight": {   // Federbusch
      const plume = (c) => { c.moveTo(HX - 4, HY - 42); c.bezierCurveTo(HX - 10, HY - 72, HX + 26, HY - 80, HX + 40, HY - 60); c.bezierCurveTo(HX + 24, HY - 66, HX + 8, HY - 60, HX + 5, HY - 42); c.closePath(); };
      ol(c, plume, C.acc, shade(C.acc, -0.55), 2.6);
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(HX, HY - 46); c.bezierCurveTo(HX, HY - 66, HX + 20, HY - 72, HX + 34, HY - 62); c.stroke();
      ol(c, (c) => c.roundRect(HX - 7, HY - 46, 14, 7, 3), C.light, C.dark, 2);
      break;
    }
    case "hoodFox": {
      if (!TALL.includes(o.ears)) for (const s of [-1, 1]) {
        const ear = (c) => { c.moveTo(HX + s * 8, HY - 36); c.quadraticCurveTo(HX + s * 28, HY - 82, HX + s * 36, HY - 30); c.closePath(); };
        ol(c, ear, C.main, C.dark, 2.6);
        c.save(); c.beginPath(); ear(c); c.clip(); c.fillStyle = "#ff9a42"; c.fillRect(HX + (s < 0 ? -40 : 14), HY - 90, 28, 28); c.fillStyle = "#ffc8d8"; c.beginPath(); c.ellipse(HX + s * 22, HY - 44, 4, 9, s * -0.3, 0, TAU); c.fill(); c.restore();
      }
      break;
    }
    case "hoodYeti": {
      if (ownEars) for (const s of [-1, 1]) { ol(c, ell(HX + s * 34, HY - 30, 8, 7), C.main, C.dark, 2.4); c.fillStyle = C.acc; c.beginPath(); c.ellipse(HX + s * 34, HY - 30, 4, 3.4, 0, 0, TAU); c.fill(); }
      for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(HX + s * 14, HY - 40); c.quadraticCurveTo(HX + s * 16, HY - 54, HX + s * 24, HY - 56); c.quadraticCurveTo(HX + s * 20, HY - 48, HX + s * 22, HY - 38); c.closePath(); }, "#dfe8f4", C.dark, 2.2);
      break;
    }
    case "hoodWolf": {
      if (ownEars) for (const s of [-1, 1]) {
        const ear = (c) => { c.moveTo(HX + s * 10, HY - 38); c.lineTo(HX + s * 26, HY - 72); c.lineTo(HX + s * 36, HY - 30); c.closePath(); };
        ol(c, ear, C.main, C.dark, 2.6); c.fillStyle = C.light; c.beginPath(); c.moveTo(HX + s * 16, HY - 38); c.lineTo(HX + s * 25, HY - 62); c.lineTo(HX + s * 31, HY - 36); c.closePath(); c.fill();
      }
      c.fillStyle = C.light; for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(HX + i * 9, brow(HX + i * 9) - 2, 5.5, 4, 0, 0, TAU); c.fill(); }
      ol(c, (c) => { c.moveTo(HX, HY - 36); c.lineTo(HX + 5, HY - 30); c.lineTo(HX, HY - 24); c.lineTo(HX - 5, HY - 30); c.closePath(); }, C.acc, shade(C.acc, -0.55), 1.8);
      star4(c, HX + 3, HY - 33, 2.4, "#ffffff");
      break;
    }
    case "hoodRock": {
      for (const s of [-1, 1]) ol(c, (c) => { c.moveTo(HX + s * 14, HY - 38); c.lineTo(HX + s * 22, HY - 56); c.lineTo(HX + s * 28, HY - 34); c.closePath(); }, C.light, C.dark, 2.4);
      c.fillStyle = C.acc; c.shadowColor = C.acc; c.shadowBlur = 5; c.beginPath(); c.ellipse(HX, HY - 30, 4, 3, 0, 0, TAU); c.fill(); c.shadowBlur = 0;
      break;
    }
  }
}
function hatFeatures(c, M, o) {
  const C = M.col, top = HY - 34;
  switch (M.head) {
    case "hatWizard": {
      const hat = (c) => { c.moveTo(HX - 30, top + 2); c.quadraticCurveTo(HX - 14, top - 30, HX - 2, top - 62); c.quadraticCurveTo(HX + 6, top - 78, HX + 28, top - 70); c.quadraticCurveTo(HX + 12, top - 62, HX + 10, top - 48); c.quadraticCurveTo(HX + 20, top - 20, HX + 30, top + 2); c.closePath(); };
      ol(c, hat, C.main, C.dark, 3); shadeIn(c, hat, HX, top - 30, 30, 0.3, 0.3);
      c.save(); c.beginPath(); hat(c); c.clip();
      c.fillStyle = C.acc; c.fillRect(HX - 40, top - 10, 80, 7);
      for (const [x, y, s] of [[-8, -30, 5], [8, -44, 3.6], [-12, -12, 3], [14, -18, 3.4]]) { c.beginPath(); star5(c, HX + x, top + y, s, s * 0.45); c.fillStyle = "#fff6c0"; c.fill(); }
      c.restore();
      ol(c, ell(HX, top + 3, 40, 9), shade(C.main, -0.1), C.dark, 3);
      c.fillStyle = rgba("#ffffff", 0.25); c.beginPath(); c.ellipse(HX - 10, top + 1, 18, 3, 0, 0, TAU); c.fill();
      c.beginPath(); star5(c, HX + 28, top - 70, 7, 3); c.fillStyle = "#ffe36e"; c.fill(); c.strokeStyle = "#8a6212"; c.lineWidth = 1.6; c.stroke();
      break;
    }
    case "hatWreath": {
      for (let i = 0; i < 9; i++) { const a = Math.PI * 0.08 + i / 8 * Math.PI * 0.84, x = HX - Math.cos(a) * 36, y = HY - 22 - Math.sin(a) * 16; leaf(c, x, y, -a + Math.PI / 2, 8, i % 2 ? C.main : shade(C.main, 0.12), C.dark); }
      for (const [k, col] of [[0.18, C.acc], [0.5, "#ffffff"], [0.82, C.acc], [0.34, "#fff38a"], [0.66, "#ffd1e8"]]) {
        const a = Math.PI * 0.08 + k * Math.PI * 0.84, x = HX - Math.cos(a) * 36, y = HY - 24 - Math.sin(a) * 16;
        for (let p = 0; p < 5; p++) { const b = p / 5 * TAU; ol(c, ell(x + Math.cos(b) * 3.6, y + Math.sin(b) * 3.6, 3.2, 3.2), col, shade(col, -0.45), 1.2); }
        ol(c, ell(x, y, 2.2, 2.2), "#ffd75e", "#8a6212", 1);
      }
      break;
    }
    case "hatAntlers": {
      ol(c, (c) => { c.moveTo(HX - 34, top + 8); c.quadraticCurveTo(HX, top - 6, HX + 34, top + 8); c.lineTo(HX + 32, top + 14); c.quadraticCurveTo(HX, top + 2, HX - 32, top + 14); c.closePath(); }, C.acc, shade(C.acc, -0.55), 2.2);
      for (const s of [-1, 1]) {
        c.lineCap = "round"; c.lineJoin = "round";
        const br = (c) => { c.moveTo(HX + s * 22, top + 4); c.quadraticCurveTo(HX + s * 30, top - 22, HX + s * 26, top - 44); c.moveTo(HX + s * 27, top - 18); c.quadraticCurveTo(HX + s * 42, top - 24, HX + s * 46, top - 38); c.moveTo(HX + s * 28, top - 32); c.lineTo(HX + s * 16, top - 44); };
        c.beginPath(); br(c); c.strokeStyle = shade(C.acc, -0.55); c.lineWidth = 8; c.stroke(); c.strokeStyle = C.acc; c.lineWidth = 4.8; c.stroke();
        leaf(c, HX + s * 46, top - 40, s * 0.8, 7, C.main, C.dark); leaf(c, HX + s * 16, top - 46, -s * 0.6, 6, C.light, C.dark); leaf(c, HX + s * 26, top - 46, 0, 6, C.main, C.dark);
      }
      break;
    }
    case "hatShell": {
      ol(c, (c) => { c.moveTo(HX - 30, top + 8); c.quadraticCurveTo(HX, top - 2, HX + 30, top + 8); c.lineTo(HX + 28, top + 13); c.quadraticCurveTo(HX, top + 5, HX - 28, top + 13); c.closePath(); }, "#ffe0f0", "#a05a7a", 2);
      for (const [x, s, col] of [[-20, 0.8, "#ffd1e8"], [20, 0.8, "#ffd1e8"], [0, 1.15, C.acc]]) {
        const y = top + 4 - s * 4, sh = (c) => { c.moveTo(HX + x - 13 * s, y); c.quadraticCurveTo(HX + x - 14 * s, y - 20 * s, HX + x, y - 24 * s); c.quadraticCurveTo(HX + x + 14 * s, y - 20 * s, HX + x + 13 * s, y); c.closePath(); };
        ol(c, sh, col, shade(col, -0.5), 2.2);
        c.strokeStyle = shade(col, -0.25); c.lineWidth = 1.4; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(HX + x, y - 2); c.lineTo(HX + x + k * 5 * s, y - 19 * s); c.stroke(); }
      }
      ol(c, ell(HX, top - 22, 4.4, 4.4), "#ffffff", "#8aa6c8", 1.6);
      c.beginPath(); star5(c, HX + 30, top + 4, 6, 2.8); c.fillStyle = "#ffb35e"; c.fill(); c.strokeStyle = "#8a4a12"; c.lineWidth = 1.4; c.stroke();
      break;
    }
    case "hatPhoenix": {   // goldene Federkrone (Flammenfedern)
      for (let i = -2; i <= 2; i++) {
        const a = i * 0.34, L = 44 - Math.abs(i) * 7, bx = HX + i * 10, by = top + 4;
        const f = (c) => { c.moveTo(bx - 6, by); c.quadraticCurveTo(bx - 10 + Math.sin(a) * L * 0.5, by - L * 0.6, bx + Math.sin(a) * L, by - Math.cos(a) * L); c.quadraticCurveTo(bx + 10 + Math.sin(a) * L * 0.5, by - L * 0.6, bx + 6, by); c.closePath(); };
        const g = c.createLinearGradient(bx, by, bx + Math.sin(a) * L, by - Math.cos(a) * L); g.addColorStop(0, C.dark); g.addColorStop(0.5, C.main); g.addColorStop(1, C.light);
        ol(c, f, g, "#7a2008", 2.4);
        c.fillStyle = "rgba(255,255,220,.7)"; c.beginPath(); c.ellipse(bx + Math.sin(a) * L * 0.6, by - Math.cos(a) * L * 0.6, 2, 5, a, 0, TAU); c.fill();
      }
      ol(c, (c) => { c.moveTo(HX - 28, top + 10); c.quadraticCurveTo(HX, top + 2, HX + 28, top + 10); c.lineTo(HX + 26, top + 16); c.quadraticCurveTo(HX, top + 8, HX - 26, top + 16); c.closePath(); }, "#ffd75e", "#8a6212", 2.2);
      ol(c, ell(HX, top + 8, 4.6, 4.6), "#ff4f6d", "#7a0a2a", 1.8); star4(c, HX - 1.5, top + 6.5, 2.2, "#ffffff");
      break;
    }
  }
}
function leaf(c, x, y, a, s, fill, line) {
  c.save(); c.translate(x, y); c.rotate(a);
  ol(c, (c) => { c.moveTo(0, -s); c.quadraticCurveTo(s * 0.8, 0, 0, s); c.quadraticCurveTo(-s * 0.8, 0, 0, -s); c.closePath(); }, fill, line, 1.6);
  c.strokeStyle = rgba("#ffffff", 0.45); c.lineWidth = 1; c.beginPath(); c.moveTo(0, -s * 0.7); c.lineTo(0, s * 0.7); c.stroke();
  c.restore();
}
function scallopPath(c, x, y, rx, ry, n) { for (let i = 0; i <= n; i++) { const a = i / n * TAU, px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry; if (!i) c.moveTo(px, py); else { const m = (i - 0.5) / n * TAU; c.quadraticCurveTo(x + Math.cos(m) * rx * 1.12, y + Math.sin(m) * ry * 1.12, px, py); } } c.closePath(); }
function scallop(c, x, y, rx, ry, n, fill, line) { ol(c, (c) => scallopPath(c, x, y, rx, ry, n), fill, line, 3.2); shadeIn(c, (c) => scallopPath(c, x, y, rx, ry, n), x, y, rx, 0.25, 0.3); }
function starDots(c, path, n, seed) { const r = mulberry32(seed); c.save(); c.beginPath(); path(c); c.clip(); for (let i = 0; i < n; i++) star4(c, HX + (r() - 0.5) * 90, HY - 50 + r() * 60, 1.4 + r() * 2.4, i % 3 ? "#fff6c0" : "#bff4ff"); c.restore(); }
function rockCracks(c, path, glow) {
  c.save(); c.beginPath(); path(c); c.clip();
  c.fillStyle = "rgba(0,0,0,.14)"; for (const [x, y, w, h] of [[-36, -40, 22, 16], [0, -46, 26, 14], [16, -26, 22, 18], [-30, -18, 18, 16]]) { c.beginPath(); c.roundRect(HX + x, HY + y, w, h, 5); c.fill(); }
  c.strokeStyle = glow; c.lineWidth = 2; c.shadowColor = glow; c.shadowBlur = 5;
  c.beginPath(); c.moveTo(HX - 30, HY - 30); c.lineTo(HX - 18, HY - 24); c.lineTo(HX - 10, HY - 34); c.moveTo(HX + 12, HY - 42); c.lineTo(HX + 20, HY - 30); c.lineTo(HX + 32, HY - 28); c.stroke();
  c.restore();
}

// =====================================================================
// Rückenteil — eigene Sprites, jeden Frame per Transform bewegt (Flügel flattern, Umhang weht, Schwänze wedeln)
// Anker in Körper-Koordinaten (Füße = 0/0): Flügel an den Schultern (±7, −38), Umhang (0, −44), Schwanz (10, −14).
// =====================================================================
const BACK = {
  wingsBat: { at: [7, -38], amp: 0.16, w: 3.2, ww: 9 }, wingsStar: { at: [7, -38], amp: 0.16, w: 3, ww: 8 },
  wingsFeather: { at: [7, -38], amp: 0.14, w: 2.6, ww: 7 }, wingsFlame: { at: [7, -40], amp: 0.2, w: 2.8, ww: 8 },
  wingsFairy: { at: [6, -36], amp: 0.34, w: 16, ww: 22 },
};
export function drawMythBack(ctx, look, t, walkPh, moving, put, S = (s) => s) {
  const M = MYTH_BY_ID[look.myth]; if (!M) return;
  for (const part of M.back.split("+")) {
    const B = BACK[part];
    if (B) {                                           // Flügelpaar
      const sp = mb(M, part), f = Math.sin(t * (moving ? B.ww : B.w)) * B.amp;
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * B.at[0], B.at[1]); ctx.scale(s, 1); ctx.rotate(-f - (moving ? 0.06 : 0)); put(S(sp), 0, 0); ctx.restore(); }
    } else if (part.startsWith("cape")) {
      const sp = mb(M, part), sw = Math.sin(walkPh) * (moving ? 0.1 : 0.03) + Math.sin(t * 1.7) * 0.03;
      ctx.save(); ctx.translate(0, -44); ctx.transform(1, 0, sw + (moving ? 0.1 : 0), 1, 0, 0); ctx.scale(1, 1 + Math.sin(t * 2.1) * 0.02); put(S(sp), 0, 0); ctx.restore();
    } else if (part === "tails3") {
      const sp = mb(M, "tailFox");
      for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(8, -14); ctx.rotate(-0.55 + i * 0.5 + Math.sin(t * (moving ? 7 : 2.4) + i * 1.3) * 0.12); put(S(sp), 0, 0); ctx.restore(); }
    } else if (part === "boulders") {
      const sp = mb(M, "boulder");
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 35, -30 + Math.sin(t * 2.2 + s) * 2.5); ctx.scale(s * 1.15, 1.15); put(S(sp), 0, 0); ctx.restore(); }
    } else {                                           // Schwanz
      const sp = mb(M, part), w = part === "tailFish" ? 2.2 : part === "tailPuff" ? 5 : 3.6;
      ctx.save(); ctx.translate(10, -14); ctx.rotate(Math.sin(t * (moving ? w * 2.2 : w)) * (part === "tailPuff" ? 0.08 : 0.16)); put(S(sp), 0, 0); ctx.restore();
    }
  }
}
/** Rückenteil-Sprite (rechter Flügel / Umhang / Schwanz), gecacht */
function mb(M, part) {
  const C = M.col;
  switch (part) {
    case "wingsBat": case "wingsStar": return spr("mb:" + M.id + ":" + part, 64, 60, 4, 50, (c) => {
      const star = part === "wingsStar";
      const w = (c) => { c.moveTo(4, 50); c.quadraticCurveTo(20, 10, 56, 4); c.quadraticCurveTo(52, 20, 58, 26); c.quadraticCurveTo(46, 26, 48, 38); c.quadraticCurveTo(36, 34, 34, 46); c.quadraticCurveTo(22, 40, 4, 50); c.closePath(); };
      if (star) { const g = c.createLinearGradient(4, 50, 58, 4); g.addColorStop(0, C.dark); g.addColorStop(1, C.light); ol(c, w, g, OL, 2.6); }
      else ol(c, w, shade(C.main, 0.25), C.dark, 2.6);
      c.strokeStyle = star ? rgba("#ffffff", 0.5) : C.dark; c.lineWidth = 2.2; c.lineCap = "round";
      for (const [x, y] of [[56, 4], [58, 26], [48, 38]]) { c.beginPath(); c.moveTo(6, 48); c.quadraticCurveTo((x + 6) / 2, (y + 48) / 2 - 8, x, y); c.stroke(); }
      if (star) {
        const r = mulberry32(5); c.save(); c.beginPath(); w(c); c.clip(); for (let i = 0; i < 8; i++) star4(c, 12 + r() * 40, 8 + r() * 36, 1.6 + r() * 2, "#fff6c0"); c.restore();
        const g = c.createLinearGradient(4, 50, 58, 4); RAINBOW.forEach((h, i) => g.addColorStop(i / 5, h));   // mythisch: Regenbogen-Rand
        c.beginPath(); w(c); c.strokeStyle = g; c.lineWidth = 1.8; c.stroke();
      }
      else { c.fillStyle = C.acc; c.beginPath(); c.arc(56, 4, 3, 0, TAU); c.fill(); }
    });
    case "wingsFeather": return spr("mb:" + M.id + ":" + part, 66, 58, 4, 48, (c) => {
      const w = (c) => { c.moveTo(4, 48); c.quadraticCurveTo(14, 8, 58, 4); c.quadraticCurveTo(64, 14, 56, 22); c.quadraticCurveTo(60, 30, 50, 34); c.quadraticCurveTo(52, 42, 40, 44); c.quadraticCurveTo(30, 50, 4, 48); c.closePath(); };
      ol(c, w, C.main, C.dark, 2.6); shadeIn(c, w, 30, 26, 30, 0.35, 0.25);
      c.save(); c.beginPath(); w(c); c.clip();
      for (const [x, y, s] of [[52, 12, 7], [48, 26, 7], [40, 38, 7], [28, 44, 6]]) { c.fillStyle = C.light; c.beginPath(); c.ellipse(x, y, s, s * 0.55, -0.6, 0, TAU); c.fill(); }
      c.strokeStyle = rgba(C.dark, 0.5); c.lineWidth = 1.4; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(10 + i * 4, 44 - i * 6); c.quadraticCurveTo(30, 30 - i * 5, 56 - i * 4, 10 + i * 10); c.stroke(); }
      c.restore();
    });
    case "wingsFlame": return spr("mb:" + M.id + ":" + part, 72, 70, 4, 58, (c) => {
      for (let i = 0; i < 4; i++) {
        const a = -0.2 - i * 0.28, L = 62 - i * 9, f = (c) => { c.moveTo(4, 58); c.quadraticCurveTo(4 + Math.cos(a) * L * 0.4 - 8, 58 + Math.sin(a) * L * 0.5 - 6, 4 + Math.cos(a) * L, 58 + Math.sin(a) * L * 1.05 - 6); c.quadraticCurveTo(4 + Math.cos(a) * L * 0.6 + 6, 58 + Math.sin(a) * L * 0.4 + 6, 4, 58); c.closePath(); };
        const g = c.createLinearGradient(4, 58, 4 + Math.cos(a) * L, 58 + Math.sin(a) * L); g.addColorStop(0, C.dark); g.addColorStop(0.45, C.main); g.addColorStop(1, C.light);
        ol(c, f, g, "#7a2008", 2.2);
      }
      c.fillStyle = "rgba(255,250,210,.7)"; c.beginPath(); c.ellipse(40, 22, 4, 2, -0.8, 0, TAU); c.fill();
    });
    case "wingsFairy": return spr("mb:" + M.id + ":" + part, 60, 56, 4, 34, (c) => {
      for (const [a, L, W] of [[-0.55, 50, 13], [0.35, 40, 10]]) {
        c.save(); c.translate(4, 34); c.rotate(a);
        const w = (c) => c.ellipse(L / 2, 0, L / 2, W, 0, 0, TAU);
        const g = c.createLinearGradient(0, 0, L, 0); g.addColorStop(0, rgba("#dfffe8", 0.85)); g.addColorStop(1, rgba("#9fe8ff", 0.6));
        ol(c, w, g, rgba("#3f8a6a", 0.9), 2);
        c.strokeStyle = rgba("#ffffff", 0.8); c.lineWidth = 1; c.beginPath(); c.moveTo(2, 0); c.lineTo(L - 2, 0); c.moveTo(L * 0.3, 0); c.lineTo(L * 0.5, -W * 0.7); c.moveTo(L * 0.55, 0); c.lineTo(L * 0.75, W * 0.6); c.stroke();
        star4(c, L * 0.7, -W * 0.3, 2.6, "#ffffff");
        c.restore();
      }
    });
    case "capeStars": case "capeMoss": case "capeCrystal": case "capeFur": return spr("mb:" + M.id + ":" + part, 96, 56, 48, 4, (c) => {
      // weit ausgestellt: die Ränder schauen links/rechts am Körper vorbei (Silhouette), innen ein hellerer Futterstreifen
      const cape = (c) => { c.moveTo(32, 4); c.quadraticCurveTo(8, 24, 4, 50); c.quadraticCurveTo(48, 58, 92, 50); c.quadraticCurveTo(88, 24, 64, 4); c.closePath(); };
      const fill = part === "capeStars" ? "#5a2a9a" : part === "capeMoss" ? C.main : part === "capeCrystal" ? rgba(C.main, 0.85) : C.main;
      ol(c, cape, fill, part === "capeCrystal" ? C.dark : shade(fill, -0.55), 2.8);
      c.save(); c.beginPath(); cape(c); c.clip(); c.strokeStyle = part === "capeStars" ? "#c8a8ff" : C.light; c.lineWidth = 5; c.beginPath(); c.moveTo(10, 50); c.quadraticCurveTo(14, 24, 34, 6); c.moveTo(86, 50); c.quadraticCurveTo(82, 24, 62, 6); c.stroke(); c.restore();
      c.save(); c.beginPath(); cape(c); c.clip();
      if (part === "capeStars") { const r = mulberry32(3); for (let i = 0; i < 14; i++) star4(c, 8 + r() * 80, 10 + r() * 40, 1.8 + r() * 2.4, i % 3 ? "#fff6c0" : "#bff4ff"); c.fillStyle = C.acc; c.fillRect(0, 49, 96, 6); }
      if (part === "capeMoss") { const r = mulberry32(4); for (let i = 0; i < 12; i++) { c.fillStyle = rgba(i % 2 ? C.light : C.dark, 0.5); c.beginPath(); c.ellipse(8 + r() * 80, 10 + r() * 38, 4, 2.6, r() * 3, 0, TAU); c.fill(); } }
      if (part === "capeCrystal") { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(26, 10); c.lineTo(14, 48); c.moveTo(70, 10); c.lineTo(82, 48); c.moveTo(48, 8); c.lineTo(48, 52); c.stroke(); }
      if (part === "capeFur") { c.fillStyle = C.light; for (let x = 4; x <= 92; x += 7) { c.beginPath(); c.arc(x, 51, 4.4, 0, TAU); c.fill(); } }
      c.restore();
      if (part === "capeMoss") for (let x = 8; x <= 88; x += 11) leaf(c, x, 51, (x % 3) * 0.3 - 0.3, 5.5, C.light, C.dark);
      if (part === "capeCrystal") for (let x = 10; x <= 86; x += 12) ol(c, (c) => { c.moveTo(x - 4, 49); c.lineTo(x, 56); c.lineTo(x + 4, 49); c.closePath(); }, "#eafcff", C.dark, 1.4);
    });
    case "tailDragon": case "tailStar": return spr("mb:" + M.id + ":" + part, 50, 40, 4, 30, (c) => {
      const tl = (c) => { c.moveTo(4, 26); c.quadraticCurveTo(26, 36, 40, 20); c.lineTo(46, 10); c.lineTo(36, 14); c.quadraticCurveTo(24, 26, 4, 34); c.closePath(); };
      ol(c, tl, part === "tailStar" ? C.main : C.main, C.dark, 2.6);
      if (part === "tailStar") { c.beginPath(); star5(c, 44, 9, 7, 3); c.fillStyle = "#fff6c0"; c.fill(); c.strokeStyle = "#8a6212"; c.lineWidth = 1.4; c.stroke(); }
      else for (const [x, y] of [[16, 30], [26, 27], [34, 21]]) ol(c, (c) => { c.moveTo(x - 4, y); c.lineTo(x + 1, y - 8); c.lineTo(x + 5, y - 1); c.closePath(); }, C.acc, shade(C.acc, -0.55), 1.6);
    });
    case "tailRainbow": return spr("mb:" + M.id + ":" + part, 44, 44, 4, 12, (c) => {
      RAINBOW.forEach((h, i) => { c.lineCap = "round"; c.strokeStyle = shade(h, -0.35); c.lineWidth = 7; c.beginPath(); c.moveTo(4, 12); c.bezierCurveTo(20, 8 + i, 34, 16 + i * 2, 30 + i, 38 - i); c.stroke(); c.strokeStyle = h; c.lineWidth = 4.4; c.stroke(); });
    });
    case "tailFlame": return spr("mb:" + M.id + ":" + part, 52, 44, 4, 30, (c) => {
      for (let i = 0; i < 3; i++) {
        const a = -0.5 + i * 0.35, L = 44 - i * 5, f = (c) => { c.moveTo(4, 30); c.quadraticCurveTo(4 + Math.cos(a) * L * 0.5, 30 + Math.sin(a) * L * 0.5 - 8, 4 + Math.cos(a) * L, 30 + Math.sin(a) * L); c.quadraticCurveTo(4 + Math.cos(a) * L * 0.5 + 4, 30 + Math.sin(a) * L * 0.5 + 6, 4, 30); c.closePath(); };
        const g = c.createLinearGradient(4, 30, 4 + Math.cos(a) * L, 30 + Math.sin(a) * L); g.addColorStop(0, C.dark); g.addColorStop(1, C.light);
        ol(c, f, g, "#7a2008", 2);
      }
    });
    case "tailFish": return spr("mb:" + M.id + ":" + part, 50, 50, 4, 26, (c) => {
      const tl = (c) => { c.moveTo(4, 20); c.quadraticCurveTo(26, 14, 32, 30); c.lineTo(34, 34); c.quadraticCurveTo(22, 30, 4, 30); c.closePath(); };
      ol(c, tl, C.main, C.dark, 2.4);
      const fin = (c) => { c.moveTo(30, 30); c.quadraticCurveTo(38, 14, 48, 16); c.quadraticCurveTo(42, 30, 46, 46); c.quadraticCurveTo(36, 40, 30, 34); c.closePath(); };
      ol(c, fin, C.acc, shade(C.acc, -0.55), 2.2);
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1.2; for (const [x, y] of [[44, 20], [44, 30], [43, 40]]) { c.beginPath(); c.moveTo(32, 31); c.lineTo(x, y); c.stroke(); }
    });
    case "tailPuff": return spr("mb:" + M.id + ":" + part, 30, 30, 6, 16, (c) => { scallop(c, 16, 15, 10, 10, 9, C.main, C.dark); });
    case "tailFox": return spr("mb:" + M.id + ":" + part, 50, 40, 4, 22, (c) => {
      const tl = (c) => { c.moveTo(4, 22); c.quadraticCurveTo(18, 4, 40, 8); c.quadraticCurveTo(50, 14, 44, 24); c.quadraticCurveTo(28, 36, 4, 26); c.closePath(); };
      ol(c, tl, C.main, C.dark, 2.4);
      c.save(); c.beginPath(); tl(c); c.clip(); c.fillStyle = "#ffb070"; c.beginPath(); c.ellipse(44, 16, 11, 12, 0, 0, TAU); c.fill(); c.fillStyle = C.acc; c.beginPath(); c.ellipse(48, 16, 6, 9, 0, 0, TAU); c.fill(); c.restore();
      c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.ellipse(20, 12, 6, 2.4, -0.3, 0, TAU); c.fill();
    });
    case "boulder": return spr("mb:" + M.id + ":" + part, 30, 28, 15, 14, (c) => {
      const b = (c) => { c.moveTo(3, 15); c.lineTo(9, 3); c.lineTo(23, 2); c.lineTo(29, 13); c.lineTo(23, 26); c.lineTo(7, 26); c.closePath(); };
      ol(c, b, C.main, C.dark, 2.4);
      c.strokeStyle = C.acc; c.lineWidth = 1.8; c.shadowColor = C.acc; c.shadowBlur = 4; c.beginPath(); c.moveTo(8, 14); c.lineTo(15, 11); c.lineTo(22, 17); c.stroke(); c.shadowBlur = 0;
    });
  }
  return null;
}
