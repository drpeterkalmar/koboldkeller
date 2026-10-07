/* deko.js — v13: Details und Eye Candy (MIT). Alles Statische wird einmal gebacken (Boden-Chunks, Wand-Sprites),
   pro Frame laufen nur wenige additive Sprites im vorhandenen Glow-Pass und Lichter in der ¼-Lightmap.
   Eigener Zufall (Hash je Kachel / eigener PRNG) → die Zufallsfolge des Spiels (Math.random) bleibt unberührt.
   Aus mit ?deko=0 (Aussehen wie v12). Qualitätsstufe (Auto-Drosselung): q 0 alles · q 1 ohne Pfützen-Glanz · q 2 ohne Lichtstrahlen, Glüh-Puls und Funken,
   halbe Schwebeteilchen · q 3 nur Gebackenes + kurze Lichtblitze (kostet dort praktisch nichts). */
import * as A from "./art.js";
import { DEKO, CALM } from "./config.js";
import { TAU, shade, rgba, mixHex, mulberry32 } from "./util.js";

export const DK = { on: DEKO, calm: CALM, skip: 0 };   // skip: Bitmaske nur für Messungen (1 Strahlen · 2 Glüh-Puls · 4 Glanz · 8 Teilchen · 16 Treppe/Portal · 32 Beute/Truhe · 64 Lichter)
/** Hash je Kachel → 0 … 1 (stabil, unabhängig von Math.random) */
export function h01(x, y, s) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const ol = (c, path, fill, stroke, lw = 1.4) => { c.beginPath(); path(c); if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); } c.fillStyle = fill; c.fill(); };
const el = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };

// =====================================================================
// Boden-Details je Welt (in die Boden-Chunks gebacken → 0 Kosten pro Frame)
// =====================================================================
// Gewichte je Welt: [Art, Gewicht]. Glühende Arten melden sich zusätzlich für Licht/Puls (glowKinds).
const FLOOR_SET = [
  [["pebbles", 3], ["clover", 3], ["daisy", 2]],
  [["moss", 5], ["tuft", 4], ["shrooms", 3], ["puddle", 2], ["pebbles", 3], ["leaves", 2], ["crack", 2]],
  [["shards", 4], ["glowcrack", 3], ["puddle", 2], ["pebbles", 3], ["starshards", 2], ["crack", 2]],
  [["bonbon", 4], ["syrup", 3], ["crumbs", 3], ["sugarcube", 2], ["heartcandy", 2], ["crack", 1]],
  [["icepatch", 4], ["drift", 4], ["frozenpuddle", 2], ["snowpebbles", 3], ["froststar", 2]],
  [["lavacrack", 4], ["ash", 3], ["bone", 2], ["obsidian", 3], ["embers", 3], ["lavapool", 1]],
];
const FLAT = { puddle: 1, syrup: 1, icepatch: 1, frozenpuddle: 1, lavapool: 1, glowcrack: 1, lavacrack: 1, crack: 1, moss: 1, ash: 1, drift: 1 };
export const GLOW_KINDS = { glowcrack: 1, shards: 1, lavacrack: 1, lavapool: 1, embers: 1, starshards: 1 };
export const SHINE_KINDS = { puddle: 1, syrup: 1, icepatch: 1, frozenpuddle: 1 };
const RATE = [0.12, 0.32, 0.32, 0.3, 0.32, 0.32];
/** Art der Bodendeko für Kachel (x, y) oder null. Nur auf freien Kacheln ohne eigene Deko/Arena-Mosaik. */
export function floorKind(bi, x, y, seed, deco) {
  if (deco >= 1 && (bi === 0 || deco >= 2)) return null;
  const r = h01(x, y, seed);
  if (r > RATE[bi]) return null;
  const set = FLOOR_SET[bi], tot = set.reduce((s, e) => s + e[1], 0);
  let k = h01(y, x, seed + 7) * tot;
  for (const [nm, w] of set) { k -= w; if (k <= 0) return nm; }
  return set[0][0];
}
/** zeichnet die Deko-Art auf eine Bodenkachel; (sx, sy) = obere Kachel-Ecke in Design-Px; bleibt innerhalb der Raute */
export function drawFloorDeco(c, sx, sy, B, bi, kind, rs) {
  const r = mulberry32(rs);
  let cx = sx + (r() - 0.5) * 12, cy = sy + 16 + (r() - 0.5) * 5;
  const fl = B.floor ? B.floor[0] : "#93d86c";
  c.save();
  if (!FLAT[kind]) { c.translate(cx, cy); c.scale(1.35, 1.35); c.translate(-cx, -cy); }   // kleine Dinge etwas größer (bleiben in der Raute)
  switch (kind) {
    // ---- Stadt ----
    case "pebbles": case "snowpebbles": {
      const base = bi === 0 ? "#cfc6b4" : bi === 4 ? "#7f9ab8" : shade(fl, -0.25);
      for (let k = 0; k < 3; k++) {
        const x = cx + (k - 1) * 7 + (r() - 0.5) * 3, y = cy + (r() - 0.5) * 4, s = 2.2 + r() * 1.8;
        ol(c, c => c.ellipse(x, y, s * 1.3, s, 0, 0, TAU), base, "rgba(20,10,30,.45)", 1);
        el(c, x - s * 0.35, y - s * 0.4, s * 0.5, s * 0.3); c.fillStyle = kind === "snowpebbles" ? "#f6fbff" : "rgba(255,255,255,.45)"; c.fill();
      }
      break;
    }
    case "clover": case "leaves": {
      const cols = kind === "clover" ? ["#5fae4a", "#6fc25a"] : ["#b8a04a", "#c0784a", "#8aa04a"];
      for (let k = 0; k < 3; k++) {
        const x = cx + (r() - 0.5) * 18, y = cy + (r() - 0.5) * 6, a = r() * TAU, col = cols[(r() * cols.length) | 0];
        c.save(); c.translate(x, y); c.scale(1, 0.55); c.rotate(a);
        if (kind === "clover") for (let j = 0; j < 3; j++) { c.rotate(TAU / 3); el(c, 0, -2.6, 2.4, 2.8); c.fillStyle = col; c.fill(); }
        else { c.beginPath(); c.moveTo(-4.5, 0); c.quadraticCurveTo(0, -3.2, 4.5, 0); c.quadraticCurveTo(0, 3.2, -4.5, 0); c.fillStyle = col; c.fill(); c.strokeStyle = "rgba(60,30,10,.45)"; c.lineWidth = 0.7; c.stroke(); c.beginPath(); c.moveTo(-5.5, 0); c.lineTo(3.5, 0); c.stroke(); }
        c.restore();
      }
      break;
    }
    case "daisy":
      for (let k = 0; k < 2; k++) {
        const x = cx + (k - 0.5) * 10, y = cy + (r() - 0.5) * 4;
        c.fillStyle = "#ffffff"; for (let p = 0; p < 6; p++) { el(c, x + Math.cos(p * 1.047) * 2.4, y + Math.sin(p * 1.047) * 1.3, 1.6, 1.1); c.fill(); }
        el(c, x, y, 1.3, 1); c.fillStyle = "#ffcf3a"; c.fill();
      }
      break;
    // ---- Moos ----
    case "moss":
      for (let k = 0; k < 3; k++) {
        const x = cx + (r() - 0.5) * 16, y = cy + (r() - 0.5) * 5, rx = 6 + r() * 5;
        el(c, x, y, rx, rx * 0.48); c.fillStyle = k ? "rgba(140,210,100,.6)" : "rgba(70,130,64,.6)"; c.fill();
      }
      c.fillStyle = "rgba(200,255,150,.6)"; for (let k = 0; k < 5; k++) { el(c, cx + (r() - 0.5) * 18, cy + (r() - 0.5) * 6, 1, 0.7); c.fill(); }
      break;
    case "tuft": {
      const g = bi === 1 ? "#7fd46a" : "#9ad06a";
      c.lineWidth = 1.5; c.strokeStyle = shade(g, -0.35);
      for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(cx + k * 1.6, cy + 1); c.quadraticCurveTo(cx + k * 2.6, cy - 5, cx + k * 3.6 + (r() - 0.5) * 2, cy - 8 - r() * 3); c.stroke(); }
      c.lineWidth = 0.9; c.strokeStyle = g;
      for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(cx + k * 1.6, cy); c.quadraticCurveTo(cx + k * 2.4, cy - 4, cx + k * 3.2, cy - 7); c.stroke(); }
      break;
    }
    case "shrooms": {
      const cap = r() < 0.5 ? "#ff6a5a" : "#ffa04a";
      for (let k = 0; k < 3; k++) {
        const s = k === 1 ? 1.15 : 0.7 + r() * 0.2, x = cx + (k - 1) * 6.5, y = cy + (k === 1 ? 1 : -1) + (r() - 0.5) * 2;
        el(c, x, y + 0.5, 3.4 * s, 1.3 * s); c.fillStyle = "rgba(20,30,20,.3)"; c.fill();
        ol(c, c => c.roundRect(x - 1.3 * s, y - 5 * s, 2.6 * s, 5 * s, 1.2), "#fff1dc", "#6a4a3a", 1);
        ol(c, c => { c.moveTo(x - 5 * s, y - 4.2 * s); c.quadraticCurveTo(x, y - 11.5 * s, x + 5 * s, y - 4.2 * s); c.closePath(); }, cap, shade(cap, -0.55), 1.1);
        c.fillStyle = "#fff"; el(c, x - 1.6 * s, y - 6.6 * s, 1, 0.8); c.fill(); el(c, x + 1.8 * s, y - 5.6 * s, 0.8, 0.6); c.fill();
      }
      break;
    }
    case "crack":
      c.strokeStyle = "rgba(10,0,20,.32)"; c.lineWidth = 1.3; c.beginPath();
      c.moveTo(cx - 9, cy - 2); c.lineTo(cx - 3, cy + 1); c.lineTo(cx + 2, cy - 1.5); c.lineTo(cx + 9, cy + 2); c.moveTo(cx + 2, cy - 1.5); c.lineTo(cx + 4, cy - 4.5); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx - 9, cy - 1); c.lineTo(cx - 3, cy + 2); c.stroke();
      break;
    // ---- Pfützen mit Spiegelung (Wasser, Sirup, Eis) ----
    case "puddle": case "syrup": case "frozenpuddle": case "icepatch": {
      const col = kind === "syrup" ? "#e05aa0" : kind === "puddle" ? (bi === 2 ? "#5a58b8" : "#2f6a64") : "#bfe6ff";
      const rx = (kind === "icepatch" ? 15 : 12) + r() * 3, ry = rx * 0.46, x = sx + (r() - 0.5) * 6, y = sy + 16 + (r() - 0.5) * 3;
      el(c, x, y + 0.8, rx + 1.2, ry + 1); c.fillStyle = "rgba(10,0,20,.25)"; c.fill();
      c.save(); el(c, x, y, rx, ry); c.clip();
      const g = c.createLinearGradient(x, y - ry, x, y + ry);         // Spiegelbild: oben hell (Raumlicht), unten tief
      g.addColorStop(0, mixHex(col, "#ffffff", kind === "icepatch" ? 0.55 : 0.45)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.35));
      c.fillStyle = g; c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
      if (kind === "puddle") { c.fillStyle = "rgba(255,255,255,.8)"; for (let k = 0; k < 3; k++) { el(c, x + (r() - 0.3) * rx, y + (r() - 0.5) * ry, 0.8, 0.5); c.fill(); } }   // gespiegelte Funkel-Punkte
      c.globalAlpha = kind === "icepatch" ? 0.75 : 0.55; c.fillStyle = "#ffffff";   // gespiegelte Wandkante + Lichtstreifen
      c.beginPath(); c.moveTo(x - rx * 0.7, y - ry * 0.1); c.lineTo(x - rx * 0.2, y - ry * 0.75); c.lineTo(x - rx * 0.02, y - ry * 0.75); c.lineTo(x - rx * 0.5, y - ry * 0.1); c.fill();
      c.globalAlpha = 0.35; c.beginPath(); c.moveTo(x + rx * 0.05, y + ry * 0.2); c.lineTo(x + rx * 0.4, y - ry * 0.5); c.lineTo(x + rx * 0.5, y - ry * 0.5); c.lineTo(x + rx * 0.15, y + ry * 0.2); c.fill();
      c.restore();
      el(c, x, y, rx, ry); c.strokeStyle = kind === "icepatch" || kind === "frozenpuddle" ? "rgba(255,255,255,.75)" : rgba(shade(col, -0.5), 0.8); c.lineWidth = 1.1; c.stroke();
      if (kind === "frozenpuddle") { c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - rx * 0.5, y + ry * 0.3); c.lineTo(x, y - ry * 0.1); c.lineTo(x + rx * 0.6, y + ry * 0.2); c.moveTo(x, y - ry * 0.1); c.lineTo(x + rx * 0.1, y - ry * 0.7); c.stroke(); }
      if (kind === "syrup") { el(c, x + rx * 0.75, y + ry * 0.6, 2.6, 1.4); c.fillStyle = col; c.fill(); }
      break;
    }
    // ---- Kristall ----
    case "shards": {
      const col = r() < 0.5 ? "#9ff0ff" : "#c8b8ff";
      for (let k = 0; k < 3; k++) {
        const x = cx + (k - 1) * 5.5, y = cy + (r() - 0.5) * 2, h = 5 + r() * 6 + (k === 1 ? 3 : 0), w = 2.1, tilt = (k - 1) * 1.6;
        ol(c, c => { c.moveTo(x - w, y); c.lineTo(x + tilt - w * 0.6, y - h * 0.75); c.lineTo(x + tilt, y - h); c.lineTo(x + tilt + w * 0.6, y - h * 0.75); c.lineTo(x + w, y); c.closePath(); }, col, shade(col, -0.55), 1);
        c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(x + tilt * 0.5 - w * 0.4, y - h * 0.7, w * 0.4, h * 0.45);
      }
      break;
    }
    case "glowcrack": case "lavacrack": {
      const hot = kind === "lavacrack", pts = [[cx - 12, cy - 1], [cx - 5, cy + 2], [cx, cy - 1.5], [cx + 6, cy + 1.5], [cx + 12, cy - 0.5]];
      const path = () => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.moveTo(cx, cy - 1.5); c.lineTo(cx + 2, cy - 5); };
      path(); c.strokeStyle = "rgba(14,4,10,.85)"; c.lineWidth = 3.4; c.stroke();
      path(); c.strokeStyle = hot ? "#ff7a2a" : "#7fe3ff"; c.lineWidth = 1.8; c.stroke();
      path(); c.strokeStyle = hot ? "#fff0a0" : "#e8fbff"; c.lineWidth = 0.7; c.stroke();
      break;
    }
    case "starshards": {                                       // Kristallstern: liegende Splitter strahlenförmig um einen Funkel-Kern
      const col = r() < 0.5 ? "#c8b8ff" : "#9ff0ff";
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * TAU + r() * 0.4, l = 6 + r() * 3, ex = cx + Math.cos(a) * l, ey = cy + Math.sin(a) * l * 0.5, nx = -Math.sin(a) * 1.6, ny = Math.cos(a) * 0.8;
        ol(c, c => { c.moveTo(cx + nx, cy + ny); c.lineTo(ex, ey); c.lineTo(cx - nx, cy - ny); c.closePath(); }, col, shade(col, -0.55), 0.8);
      }
      el(c, cx, cy, 2, 1.2); c.fillStyle = "#ffffff"; c.fill();
      break;
    }
    // ---- Zucker ----
    case "bonbon": {
      const col = ["#ff6fae", "#7fd8ff", "#ffe36e", "#9cf09a"][(r() * 4) | 0], x = cx, y = cy - 1, a = (r() - 0.5) * 0.8;
      c.translate(x, y); c.rotate(a);
      for (const k of [-1, 1]) ol(c, c => { c.moveTo(k * 3.6, 0); c.lineTo(k * 8, -3); c.lineTo(k * 8, 3); c.closePath(); }, shade(col, -0.1), shade(col, -0.55), 1);
      ol(c, c => c.ellipse(0, 0, 4.2, 3.2, 0, 0, TAU), col, shade(col, -0.55), 1.1);
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 2, 3.6, 5.6); c.stroke();
      break;
    }
    case "crumbs":
      for (let k = 0; k < 5; k++) { const x = cx + (r() - 0.5) * 18, y = cy + (r() - 0.5) * 6, s = 1.2 + r() * 1.6; ol(c, c => c.ellipse(x, y, s * 1.3, s, r(), 0, TAU), "#d8a060", "#7a4a2a", 0.8); }
      ol(c, c => c.ellipse(cx + 3, cy - 1, 5, 3, 0.2, 0, TAU), "#e0aa66", "#7a4a2a", 1);
      c.fillStyle = "#6a3a1a"; for (let k = 0; k < 3; k++) { el(c, cx + 1 + k * 2, cy - 1.5 + (k % 2), 0.8, 0.6); c.fill(); }
      break;
    case "sugarcube":
      for (let k = 0; k < 2; k++) {
        const x = cx + (k - 0.5) * 9, y = cy + k;
        ol(c, c => { c.moveTo(x, y - 6); c.lineTo(x + 4, y - 4); c.lineTo(x, y - 2); c.lineTo(x - 4, y - 4); c.closePath(); }, "#ffffff", "#c89ab0", 0.9);
        ol(c, c => { c.moveTo(x - 4, y - 4); c.lineTo(x, y - 2); c.lineTo(x, y + 2); c.lineTo(x - 4, y); c.closePath(); }, "#f0e0ea", "#c89ab0", 0.9);
        ol(c, c => { c.moveTo(x, y - 2); c.lineTo(x + 4, y - 4); c.lineTo(x + 4, y); c.lineTo(x, y + 2); c.closePath(); }, "#e0c8d8", "#c89ab0", 0.9);
      }
      break;
    case "heartcandy": {
      const col = r() < 0.5 ? "#ff8fb8" : "#c79bff";
      c.translate(cx, cy - 2); c.scale(1, 0.62);
      ol(c, c => { c.moveTo(0, 4); c.bezierCurveTo(-7, -1, -3.5, -6, 0, -2.5); c.bezierCurveTo(3.5, -6, 7, -1, 0, 4); }, col, shade(col, -0.55), 1.2);
      el(c, -2, -2.4, 1.4, 0.9); c.fillStyle = "rgba(255,255,255,.8)"; c.fill();
      break;
    }
    // ---- Frost ----
    case "drift":
      ol(c, c => { c.moveTo(cx - 13, cy + 2); c.quadraticCurveTo(cx - 7, cy - 6, cx, cy - 4); c.quadraticCurveTo(cx + 7, cy - 7, cx + 13, cy + 2); c.closePath(); }, "#ffffff", "#a8c8e0", 1.1);
      c.fillStyle = "rgba(170,210,240,.5)"; c.beginPath(); c.moveTo(cx - 10, cy + 2); c.quadraticCurveTo(cx, cy - 1, cx + 10, cy + 2); c.fill();
      break;
    case "froststar":
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1; c.save(); c.translate(cx, cy); c.scale(1, 0.5);
      for (let k = 0; k < 6; k++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -9); c.moveTo(0, -5); c.lineTo(-2.4, -7); c.moveTo(0, -5); c.lineTo(2.4, -7); c.stroke(); }
      c.restore();
      break;
    // ---- Glut ----
    case "ash":
      for (let k = 0; k < 3; k++) { el(c, cx + (r() - 0.5) * 14, cy + (r() - 0.5) * 4, 6 + r() * 4, 2.6 + r() * 1.5); c.fillStyle = k ? "rgba(150,140,140,.32)" : "rgba(90,80,80,.4)"; c.fill(); }
      break;
    case "bone": {
      const a = (r() - 0.5) * 0.9;
      c.translate(cx, cy - 1); c.scale(1, 0.62); c.rotate(a);
      const bone = c => { c.rect(-6, -1.4, 12, 2.8); for (const sx of [-6, 6]) for (const sy of [-1.6, 1.6]) { c.moveTo(sx + 2.2, sy); c.arc(sx, sy, 2.2, 0, TAU); } };
      ol(c, bone, "#f6ecd8", "#6a5040", 1.2);
      break;
    }
    case "obsidian":
      for (let k = 0; k < 3; k++) {
        const x = cx + (k - 1) * 6, y = cy + (r() - 0.5) * 3, s = 2.6 + r() * 2;
        ol(c, c => { c.moveTo(x - s, y); c.lineTo(x - s * 0.3, y - s * 1.3); c.lineTo(x + s, y - s * 0.4); c.lineTo(x + s * 0.4, y + s * 0.5); c.closePath(); }, "#2a1a2a", "#0a0008", 0.9);
        c.strokeStyle = "rgba(255,170,120,.55)"; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.3); c.lineTo(x - s * 0.15, y - s * 1); c.stroke();
      }
      break;
    case "embers":
      for (let k = 0; k < 4; k++) {
        const x = cx + (r() - 0.5) * 16, y = cy + (r() - 0.5) * 5, s = 1.5 + r() * 1.5;
        ol(c, c => c.ellipse(x, y, s * 1.3, s, 0, 0, TAU), "#4a2a28", "#1a0a0a", 0.8);
        el(c, x, y - s * 0.2, s * 0.6, s * 0.45); c.fillStyle = k % 2 ? "#ff8a3a" : "#ffc060"; c.fill();
      }
      break;
    case "lavapool": {
      const rx = 10 + r() * 3, ry = rx * 0.46, x = sx + (r() - 0.5) * 6, y = sy + 16;
      el(c, x, y, rx + 2, ry + 1.4); c.fillStyle = "#2a1414"; c.fill();
      const g = c.createRadialGradient(x, y, 1, x, y, rx);
      g.addColorStop(0, "#fff0a0"); g.addColorStop(0.45, "#ffa040"); g.addColorStop(1, "#c8401a");
      el(c, x, y, rx, ry); c.fillStyle = g; c.fill();
      c.fillStyle = "rgba(90,30,20,.6)"; el(c, x - rx * 0.4, y + ry * 0.1, rx * 0.25, ry * 0.25); c.fill(); el(c, x + rx * 0.45, y - ry * 0.2, rx * 0.18, ry * 0.2); c.fill();
      break;
    }
  }
  c.restore();
}
/** Wandfuß: Kiesel/Moos/Schnee entlang der Wandkante (ao: Bit1 Wand im Norden, Bit2 Wand im Westen) */
export function drawWallFoot(c, sx, sy, B, bi, ao, rs) {
  const r = mulberry32(rs), col = bi === 1 ? "#6fae5a" : bi === 4 ? "#f4fbff" : bi === 3 ? "#ffe0f0" : bi === 5 ? "#3a2424" : bi === 2 ? "#6a62a8" : null;
  if (!col) return;
  c.save();
  for (const [bit, x0, y0, x1, y1] of [[1, sx + 4, sy + 3, sx + 28, sy + 15], [2, sx - 4, sy + 3, sx - 28, sy + 15]]) {
    if (!(ao & bit)) continue;
    for (let k = 0; k < 3; k++) {
      const t = (k + 0.3 + r() * 0.4) / 3, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + 1.5, s = 1.6 + r() * 1.8;
      el(c, x, y, s * 1.5, s * 0.9); c.fillStyle = col; c.globalAlpha = bi === 5 ? 0.7 : 0.6; c.fill();
      if (bi === 5 && r() < 0.4) { el(c, x, y - 0.4, s * 0.5, s * 0.35); c.fillStyle = "#ff8a3a"; c.globalAlpha = 0.9; c.fill(); }
    }
  }
  c.restore();
}

// =====================================================================
// Wand-Deko: Ranken, Banner, Spinnweben, Kristalle, Eiszapfen, Zuckerguss, Glutnaht … (eigene Wand-Sprites → 1 drawImage wie bisher)
// =====================================================================
const WALL_SET = [null,
  [["web", 2], ["banner", 1.2], ["vines", 3.5], ["fungus", 2]],
  [["web", 2], ["banner", 1.2], ["crystal", 3], ["veins", 2]],
  [["web", 1], ["banner", 1.4], ["icing", 3], ["gumdrops", 2.5]],
  [["web", 1.5], ["banner", 1.2], ["icicles", 3.5], ["frostfern", 2]],
  [["web", 1.5], ["banner", 1.2], ["lavaseam", 3], ["chain", 2]],
];
const BANNER = [null, ["#d8574a", "#ffd75e"], ["#6a5ae0", "#bfefff"], ["#ff6fae", "#fff3a0"], ["#3f7ad0", "#ffffff"], ["#a8262a", "#ffc060"]];
/** Deko-Art und sichtbare Seite (1 = linke Seite zeigt nach +y, 2 = rechte nach +x) oder null */
export function wallKind(bi, x, y, seed, freeL, freeR) {
  if (!bi || !(freeL || freeR)) return null;
  if (h01(x, y, seed + 31) > 0.3) return null;
  const set = WALL_SET[bi], tot = set.reduce((s, e) => s + e[1], 0);
  let k = h01(y + 5, x, seed + 41) * tot, kind = set[0][0];
  for (const [nm, w] of set) { k -= w; if (k <= 0) { kind = nm; break; } }
  const side = freeL && freeR ? (h01(x, y, seed + 53) < 0.5 ? 1 : 2) : freeL ? 1 : 2;
  return { kind, side };
}
/** Wand mit Deko (gecacht je Welt-Ebene × Variante × Art × Seite) */
export function wallDecoSprite(B, bi, v, kind, side) {
  const H = A.WALL_H, base = A.wallSprite(B, bi, v % 2);
  return A.spr("wallD:" + (B.key || bi) + ":" + (v % 2) + ":" + kind + ":" + side, 64, 32 + H + 14, 32, 16 + H + 14, (c) => {
    c.drawImage(base.cv, 0, 0, base.w, base.h);
    c.translate(0, 14);
    c.save();
    if (side === 1) c.transform(1, 0.5, 0, 1, 0, 16); else c.transform(1, -0.5, 0, 1, 32, 32);   // Seitenfläche: (u 0…32, v 0…H)
    drawWallDeco(c, kind, B, bi, side, H, mulberry32(v * 977 + side * 13 + kind.length * 101));
    c.restore();
  });
}
function drawWallDeco(c, kind, B, bi, side, H, r) {
  switch (kind) {
    case "web": {                                              // Spinnennetz in der oberen Ecke (weg von der Kante zur Nachbarwand)
      const ox = side === 1 ? 1 : 31, dir = side === 1 ? 1 : -1;
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 0.7;
      const rays = [0.1, 0.45, 0.8, 1.2].map(a => [Math.cos(a) * 17 * dir, Math.sin(a) * 17]);
      c.beginPath(); for (const [x, y] of rays) { c.moveTo(ox, 1); c.lineTo(ox + x, 1 + y); } c.stroke();
      for (const f of [0.35, 0.62, 0.9]) { c.beginPath(); rays.forEach(([x, y], i) => { const px = ox + x * f, py = 1 + y * f; if (i) c.quadraticCurveTo(ox + (x + rays[i - 1][0]) * f * 0.42, 1 + (y + rays[i - 1][1]) * f * 0.42, px, py); else c.moveTo(px, py); }); c.stroke(); }
      c.fillStyle = "#2a1a2a"; c.beginPath(); c.arc(ox + 9 * dir, 12, 1.6, 0, TAU); c.fill();   // kleine Spinne
      c.strokeStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.moveTo(ox + 9 * dir, 1); c.lineTo(ox + 9 * dir, 10.5); c.stroke();
      break;
    }
    case "banner": {
      const [col, acc] = BANNER[bi], x0 = 7, x1 = 25, top = 3, bot = H - 4;
      c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(x0 + 1.5, top + 2, x1 - x0, bot - top - 2);
      ol(c, c => { c.moveTo(x0, top + 1); c.lineTo(x1, top + 1); c.lineTo(x1, bot); c.lineTo((x0 + x1) / 2, bot - 5); c.lineTo(x0, bot); c.closePath(); }, col, shade(col, -0.55), 1.1);
      const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.22)");
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, top + 1); c.lineTo(x1, top + 1); c.lineTo(x1, bot); c.lineTo((x0 + x1) / 2, bot - 5); c.lineTo(x0, bot); c.closePath(); c.fill();
      c.strokeStyle = acc; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 1.5, top + 4); c.lineTo(x1 - 1.5, top + 4); c.moveTo(x0 + 1.5, bot - 3.5); c.lineTo((x0 + x1) / 2, bot - 8); c.lineTo(x1 - 1.5, bot - 3.5); c.stroke();
      const ex = (x0 + x1) / 2, ey = top + 13;                // Wappen: Pilz
      ol(c, c => c.roundRect(ex - 1.2, ey - 1, 2.4, 4.5, 1), "#fff1dc", null);
      ol(c, c => { c.moveTo(ex - 4.6, ey); c.quadraticCurveTo(ex, ey - 7.5, ex + 4.6, ey); c.closePath(); }, acc, null);
      c.fillStyle = col; c.beginPath(); c.arc(ex - 1.3, ey - 2.4, 0.8, 0, TAU); c.arc(ex + 1.5, ey - 1.6, 0.7, 0, TAU); c.fill();
      ol(c, c => c.roundRect(x0 - 2, top - 0.5, x1 - x0 + 4, 2.4, 1.2), "#8a5a3a", "#3a2216", 0.8);   // Stange
      break;
    }
    case "vines": case "veins": case "frostfern": {
      const n = 3 + ((r() * 2) | 0);
      for (let k = 0; k < n; k++) {
        const u = 4 + (k + r() * 0.6) * (24 / n), len = kind === "vines" ? 12 + r() * (H - 14) : 10 + r() * 16;
        const col = kind === "vines" ? "#4f9a3e" : kind === "veins" ? "#9ff0ff" : "#ffffff";
        c.strokeStyle = kind === "vines" ? "#2f5a26" : kind === "veins" ? "rgba(40,30,90,.7)" : "rgba(120,170,210,.6)"; c.lineWidth = kind === "vines" ? 2.4 : 1.8;
        const path = () => { c.beginPath(); c.moveTo(u, 0); for (let v = 4; v <= len; v += 4) c.lineTo(u + Math.sin(v * 0.5 + k) * (kind === "veins" ? 2.6 : 1.6), v); };
        path(); c.stroke(); c.strokeStyle = col; c.lineWidth = kind === "vines" ? 1.2 : 0.9; path(); c.stroke();
        if (kind === "vines") for (let v = 5; v < len; v += 5 + r() * 3) {
          const x = u + Math.sin(v * 0.5 + k) * 1.6, s = r() < 0.5 ? -1 : 1;
          el(c, x + s * 2.4, v, 2.6, 1.4, s * 0.5); c.fillStyle = r() < 0.15 ? "#ff8fb8" : "#6fc25a"; c.fill();
        }
        if (kind === "frostfern") for (let v = 4; v < len; v += 3) { c.beginPath(); c.moveTo(u, v); c.lineTo(u - 2.5, v - 2); c.moveTo(u, v); c.lineTo(u + 2.5, v - 2); c.stroke(); }
      }
      break;
    }
    case "fungus":
      for (let k = 0; k < 3; k++) {
        const u = 8 + k * 7 + (r() - 0.5) * 3, v = 12 + (k % 2) * 7 + r() * 4, w = 5 + r() * 2.5, col = k === 1 ? "#e8a050" : "#d88a40";
        ol(c, c => { c.moveTo(u - w, v); c.quadraticCurveTo(u, v - w * 1.1, u + w, v); c.quadraticCurveTo(u, v + 1.6, u - w, v); c.closePath(); }, col, "#5a3a20", 1);
        c.strokeStyle = "rgba(255,240,200,.6)"; c.lineWidth = 0.7; c.beginPath(); c.moveTo(u - w * 0.6, v - 1.2); c.quadraticCurveTo(u, v - w * 0.7, u + w * 0.6, v - 1.2); c.stroke();
      }
      break;
    case "crystal": {
      const col = r() < 0.5 ? "#9ff0ff" : "#c8b8ff", u0 = 10 + r() * 10, v0 = H - 4;
      for (let k = 0; k < 4; k++) {
        const u = u0 + (k - 1.5) * 4, h = 8 + r() * 10 + (k === 1 || k === 2 ? 6 : 0), w = 2.4, tilt = (k - 1.5) * 1.8;
        ol(c, c => { c.moveTo(u - w, v0); c.lineTo(u + tilt - w * 0.6, v0 - h * 0.78); c.lineTo(u + tilt, v0 - h); c.lineTo(u + tilt + w * 0.6, v0 - h * 0.78); c.lineTo(u + w, v0); c.closePath(); }, col, shade(col, -0.55), 1);
        c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(u + tilt * 0.5 - 0.9, v0 - h * 0.72, 0.9, h * 0.5);
      }
      break;
    }
    case "icing": {
      c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(0, 0); c.lineTo(32, 0);
      for (let u = 32; u >= 0; u -= 4) { const d = 3 + r() * (u % 8 ? 4 : 11); c.lineTo(u, d); c.arc(u - 2, d, 2, 0, Math.PI); }
      c.closePath(); c.fill(); c.strokeStyle = "rgba(200,120,170,.6)"; c.lineWidth = 0.8; c.stroke();
      const cs = ["#ff6fae", "#7fd8ff", "#ffe36e", "#9cf09a"];
      for (let k = 0; k < 6; k++) { c.fillStyle = cs[k % 4]; c.save(); c.translate(3 + r() * 26, 1.5 + r() * 3); c.rotate(r() * 3); c.fillRect(-1.5, -0.5, 3, 1); c.restore(); }
      break;
    }
    case "gumdrops":
      for (let k = 0; k < 3; k++) {
        const u = 8 + k * 8 + (r() - 0.5) * 3, v = 14 + (k % 2) * 8, col = ["#ff6fae", "#9cf09a", "#ffe36e"][k];
        ol(c, c => { c.moveTo(u - 3.6, v + 2.6); c.quadraticCurveTo(u - 3.6, v - 4, u, v - 4.2); c.quadraticCurveTo(u + 3.6, v - 4, u + 3.6, v + 2.6); c.closePath(); }, col, shade(col, -0.55), 1);
        c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.arc(u - 1.3, v - 1.6, 0.9, 0, TAU); c.fill();
      }
      break;
    case "icicles":
      for (let u = 2 + r() * 2; u < 31; u += 3 + r() * 2.5) {
        const len = 5 + r() * 16;
        ol(c, c => { c.moveTo(u - 1.8, 0); c.lineTo(u, len); c.lineTo(u + 1.8, 0); c.closePath(); }, "#eaf8ff", "#8ab8dc", 0.8);
        c.fillStyle = "rgba(255,255,255,.9)"; c.fillRect(u - 0.8, 0.5, 0.6, len * 0.5);
      }
      break;
    case "lavaseam": {
      const u0 = 10 + r() * 12, pts = [[u0, 0], [u0 + 3, 7], [u0 - 1, 14], [u0 + 2.5, 22], [u0 - 0.5, H]];
      const path = () => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
      path(); c.strokeStyle = "rgba(20,4,4,.85)"; c.lineWidth = 4; c.stroke();
      path(); c.strokeStyle = "#ff7a2a"; c.lineWidth = 2.2; c.stroke();
      path(); c.strokeStyle = "#fff0a0"; c.lineWidth = 0.8; c.stroke();
      break;
    }
    case "chain": {
      const u = 10 + r() * 12, n = 5;
      c.lineWidth = 1.3;
      for (let k = 0; k < n; k++) { c.strokeStyle = k % 2 ? "#5a5a66" : "#8a8a96"; c.beginPath(); c.ellipse(u, 2 + k * 4.2, k % 2 ? 0.9 : 1.9, 2.6, 0, 0, TAU); c.stroke(); }
      ol(c, c => c.roundRect(u - 3, 2 + n * 4.2, 6, 3.4, 1.2), "#6a6a76", "#2a2a33", 0.9);
      break;
    }
  }
}

// =====================================================================
// Je Ebene: Lichtstrahlen von oben, glühende/glänzende Boden-Deko je Chunk, Truhen-Zustand
// =====================================================================
const SHAFT_COL = [null, "#e8ffd0", "#d8f4ff", "#fff0f8", "#f0faff", "#ffd8a8"];
/** einmal beim Betreten: Lichtstrahlen (≤ 1 je Raum, höchstens 7), Deko-Listen je Chunk (für Licht/Puls/Glanz) */
export function setupLevel(L, R, CH) {
  const m = L.map, bi = R.biome, seed = R.dkSeed = (m.w * 131 + m.h * 17 + (R.B.depth || 0) * 997 + bi * 7) | 0;
  R.dkShafts = []; R.dkChests = []; R.dkGlow = new Map(); R.dkShine = new Map(); R.dkGlowVis = []; R.dkShineVis = [];
  R.dkFloorN = 0;
  if (!DK.on) return;
  A.dropArt("wallD:", "wallD:" + (R.B.key || bi) + ":");          // Wand-Deko-Sprites nur der aktuellen Ebene behalten (Speicher)
  R.dkChests = (L.props || []).filter(pr => pr.kind === "chest");
  for (const pr of R.dkChests) pr._dkWas = pr.open;
  if (!bi) return;
  const rooms = L.rooms || [];
  rooms.forEach((r, i) => {
    if (R.dkShafts.length >= 7 || h01(i, r.x, seed + 3) > (r.arena ? 1 : 0.5)) return;
    const x = r.x + 1 + Math.floor(h01(r.y, i, seed + 5) * Math.max(1, r.w - 2)), y = r.y + 1 + Math.floor(h01(i, r.y, seed + 9) * Math.max(1, r.h - 2));
    if (m.solid[y * m.w + x]) return;
    R.dkShafts.push({ x: r.arena ? r.x + r.w / 2 : x + 0.5, y: r.arena ? r.y + r.h / 2 : y + 0.5, w: r.arena ? 1.25 : 1, ph: h01(x, y, seed) * TAU, col: SHAFT_COL[bi] });
  });
  R.dkFloorN = 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x; if (m.solid[i]) continue;
    const k = floorKind(bi, x, y, seed, m.deco[i]); if (!k) continue;
    R.dkFloorN++;
    const map = GLOW_KINDS[k] ? R.dkGlow : SHINE_KINDS[k] ? R.dkShine : null; if (!map) continue;
    const key = Math.floor(y / CH) * 64 + Math.floor(x / CH);
    let list = map.get(key); if (!list) map.set(key, list = []);
    list.push({ x: x + 0.5, y: y + 0.5, k, ph: h01(x, y, seed + 77) * TAU, c: k === "glowcrack" || k === "geode" || k === "shards" ? (bi === 2 ? "#8fe9ff" : "#ffb3e6") : "#ff8a3a" });
  }
}

// ---------- Sprites (einmal, weiß → eingefärbt) ----------
function shaftSprite() {
  return A.spr("dk:shaft", 96, 300, 48, 290, (c) => {           // schräger Lichtschacht: oben breit und leise, unten auf dem Boden heller
    const g = c.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.35, "rgba(255,255,255,.35)"); g.addColorStop(0.9, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(4, 0); c.lineTo(62, 0); c.lineTo(80, 292); c.lineTo(30, 292); c.closePath(); c.fill();
    c.globalCompositeOperation = "destination-out";                 // weiche Seitenkanten
    for (const [x0, x1, k] of [[4, 30, 1], [62, 80, -1]]) {
      const e = c.createLinearGradient(x0, 0, x0 + 14 * k, 0); e.addColorStop(0, "rgba(0,0,0,1)"); e.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = e; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + 16 * k, 0); c.lineTo(x1 + 16 * k, 292); c.lineTo(x1, 292); c.closePath(); c.fill();
    }
  });
}
function beamSprite() {
  return A.spr("dk:beam", 40, 200, 20, 196, (c) => {
    const g = c.createLinearGradient(0, 200, 0, 0);
    g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.25, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(8, 0, 24, 200);
    c.globalCompositeOperation = "destination-in";
    const e = c.createLinearGradient(0, 0, 40, 0); e.addColorStop(0, "rgba(0,0,0,0)"); e.addColorStop(0.5, "rgba(0,0,0,1)"); e.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = e; c.fillRect(0, 0, 40, 200);
  });
}
function raysSprite() {
  return A.spr("dk:rays", 128, 128, 64, 64, (c) => {
    c.translate(64, 64);
    for (let k = 0; k < 10; k++) {
      c.rotate(TAU / 10);
      const g = c.createLinearGradient(0, 0, 0, -62); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(-2, 0); c.lineTo(-(k % 2 ? 5 : 8), -62); c.lineTo(k % 2 ? 5 : 8, -62); c.lineTo(2, 0); c.closePath(); c.fill();
    }
  });
}
export function warmSprites() { if (!DK.on) return; shaftSprite(); beamSprite(); raysSprite(); A.fx("glow"); A.fx("star"); A.fx("dot"); }

// =====================================================================
// Pro Frame: Lichter in die ¼-Lightmap (Fackel-Lichtkegel, Strahl-Pfützen, glühende Deko, Lichtblitze)
// =====================================================================
export function lights(light, G, R, FXL, T) {
  const L = R.L;
  if (DK.skip & 64) return;
  if (R.q >= 3) { for (const f of FXL) light(f.x, f.y, f.r * (0.7 + 0.3 * f.life / f.max), f.col, f.a * f.life / f.max); return; }   // niedrigste Stufe: nur kurze Lichtblitze
  for (const t of L.torches) {                                   // Fackel: Lichtfleck an der Wand über der Flamme + Lichtkegel in den Raum
    const fl = 0.78 + 0.1 * Math.sin(T * 9.3 + t.x * 3) + 0.07 * Math.sin(T * 23.1 + t.y) + 0.05 * Math.sin(T * 41 + t.x * 7);
    light(t.wx + 0.5, t.wy + 0.5, 1.7, R.B.torch, 0.55 * fl, 46);
    light(t.face === "L" ? t.x : t.x + 1.3, t.face === "L" ? t.y + 1.3 : t.y, 3.3, mixHex(R.B.torch || "#ffb45e", "#ffffff", 0.25), 0.42 * fl);
  }
  if (R.biome) for (const s of R.dkShafts) light(s.x, s.y, 1.9 * s.w, s.col, 0.42 + 0.08 * Math.sin(T * 0.9 + s.ph));
  let n = 0;
  for (const gl of R.dkGlowVis) { for (const d of gl) { if (light(d.x, d.y, d.k === "lavapool" ? 2.2 : 1.6, d.c, (d.k === "lavapool" ? 0.6 : 0.42) + 0.14 * Math.sin(T * 2.3 + d.ph)) && ++n >= 12) break; } if (n >= 12) break; }
  for (const f of FXL) light(f.x, f.y, f.r * (0.7 + 0.3 * f.life / f.max), f.col, f.a * f.life / f.max);
}
/** Boss-Auftritt: Welt wird dunkler, während der Boden aufbricht (Loch und Risse leuchten dadurch stärker) */
export function riseDim(G) {
  const RS = G.rise; if (!DK.on || !RS) return 0;
  return 0.32 * (RS.ph === "quake" ? RS.u : RS.ph === "burst" ? 1 : RS.ph === "grow" ? 1 - RS.u : 0);
}
/** Boss-Auftritt: Kamera rückt beim Beben näher heran (danach zoomt der Bosskampf wie bisher heraus) */
export function riseZoom(G) {
  const RS = G.rise; if (!DK.on || DK.calm || !RS) return 0;
  return RS.ph === "quake" ? 1 + 0.12 * Math.min(1, RS.u * 1.5) : RS.ph === "burst" ? 1.1 : 0;
}

// =====================================================================
// Pro Frame im additiven Glow-Pass
// =====================================================================
let motes = null;
export function glow(ctx, G, R, g, toScreen, T) {
  const Z = R.Z, L = R.L, q = R.q;
  if (q >= 3) return;                                            // niedrigste Stufe: keine additiven Zusatz-Sprites
  // Lichtstrahlen von oben (schräg, langsam atmend) mit Staubkörnchen
  const sk = DK.skip;
  if (q < 2 && R.dkShafts.length && !(sk & 1)) {
    const sp = shaftSprite(); let ns = 0;
    for (const s of R.dkShafts) {
      const [sx, sy] = toScreen(s.x, s.y);
      const w = sp.w * Z * s.w, h = sp.h * Z * (s.w > 1 ? 1.15 : 1);
      if (sx + w < 0 || sx - w > R.VW || sy - h > R.VH || sy < -20) continue;
      if (++ns > (q ? 1 : 2)) break;                             // höchstens 2 Strahlen im Bild (Stufe 1: einer) — Füllrate
      ctx.globalAlpha = 0.2 + 0.06 * Math.sin(T * 0.9 + s.ph);
      ctx.drawImage(A.tinted(sp, s.col).cv, sx - w * 0.6, sy - h * 0.97, w, h);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) {                              // Staub im Strahl: steigt langsam, tanzt seitlich
        const k = (T * 0.07 + i / 4 + s.ph) % 1, zz = 20 + k * 200;
        const ox = (Math.sin(T * 0.8 + i * 2.1 + s.ph) * 0.25 - 0.35 * k) * s.w, oy = Math.cos(T * 0.6 + i) * 0.15;
        g(s.x + ox, s.y + oy, zz, 9, "#ffffff", 0.55 * Math.sin(k * Math.PI));
      }
    }
  }
  // glühende Boden-Deko pulsiert (Lava, Glutrisse, Kristalle)
  if (q < 2 && !(sk & 2)) { let n = 0; for (const list of R.dkGlowVis) { for (const d of list) { g(d.x, d.y, 2, d.k === "lavapool" ? 56 : 30, d.c, (d.k === "lavapool" ? 0.34 : 0.22) + 0.12 * Math.sin(T * 2.3 + d.ph)); if (++n >= 10) break; } if (n >= 10) break; } }
  // Pfützen/Eis: kurzes Aufblitzen der Spiegelung
  if (q < 1 && !(sk & 4)) { const st = A.fx("star"); let n = 0; for (const list of R.dkShineVis) { for (const d of list) {
    const k = Math.pow(0.5 + 0.5 * Math.sin(T * 1.3 + d.ph * 3), 8); if (k < 0.05) continue;
    const [sx, sy] = toScreen(d.x - 0.08, d.y - 0.08), s = 14 * Z * (0.6 + 0.4 * k);
    ctx.globalAlpha = 0.8 * k; ctx.drawImage(st.cv, sx - s / 2, sy - s / 2, s, s); if (++n >= 8) break; } if (n >= 8) break; } ctx.globalAlpha = 1; }
  // Schwebeteilchen in der Luft (an die Welt geheftet, wandern mit; kein Pool, keine Neuanlage)
  const nM = DK.calm ? 6 : q === 0 ? 16 : q === 1 ? 10 : 6;
  if (nM && !(sk & 8)) {
    if (!motes) { const r = mulberry32(99); motes = Array.from({ length: 16 }, () => ({ bx: r() * 14, by: r() * 14, vx: (r() - 0.5) * 0.25, vy: (r() - 0.5) * 0.25, z: 20 + r() * 90, ph: r() * TAU, s: 7 + r() * 8, f: 0.6 + r() * 1.4 })); }
    const col = R.biome ? (R.B.dust || "#ffffff") : "#fff6c0", S = 14, cx = R.camX - S / 2, cy = R.camY - S / 2, sp = DK.calm ? 0.4 : 1;
    for (let i = 0; i < nM; i++) {
      const o = motes[i];
      const x = cx + (((o.bx + T * o.vx * sp - cx) % S) + S) % S, y = cy + (((o.by + T * o.vy * sp - cy) % S) + S) % S;
      const tw = 0.5 + 0.5 * Math.sin(T * o.f + o.ph);
      g(x, y, o.z + Math.sin(T * 0.7 + o.ph) * 10, o.s, col, (R.biome ? 0.5 : 0.35) * tw * tw);
    }
  }
  // Treppe: Lichtsäule, aufsteigende Funken, Bodenring
  const st = L.stairs;
  if (st && !st.sealed && G.depth < 20 && !(sk & 16)) {
    const [sx, sy] = toScreen(st.x, st.y);
    if (sx > -100 && sx < R.VW + 100 && sy > -50 && sy < R.VH + 250) {
      const bm = A.tinted(beamSprite(), "#ffe9a8"), w = 64 * Z, h = 150 * Z;
      ctx.globalAlpha = 0.3 + 0.08 * Math.sin(T * 2); ctx.drawImage(bm.cv, sx - w / 2, sy - h + 4 * Z, w, h);
      for (let i = 0; i < 5; i++) { const k = (T * 0.45 + i / 5) % 1; g(st.x + Math.sin(i * 2.4 + T) * 0.25, st.y + Math.cos(i * 1.7) * 0.25, 6 + k * 110, 12, "#fff3b0", 0.8 * Math.sin(k * Math.PI)); }
      const pr = (T * 0.6) % 1;
      ctx.globalAlpha = 0.5 * (1 - pr); ctx.strokeStyle = "#ffe9a8"; ctx.lineWidth = 2.5 * Z;
      ctx.beginPath(); ctx.ellipse(sx, sy, (16 + 22 * pr) * Z, (8 + 11 * pr) * Z, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // Portale: aufsteigende Funken in Portalfarbe (nur nahe/sichtbare, in der Stadt höchstens 6)
  if (q < 2 && !(sk & 16)) { let n = 0; for (const po of G._portals || []) {
    if (po.locked) continue; const [sx, sy] = toScreen(po.x, po.y); if (sx < -60 || sx > R.VW + 60 || sy < -40 || sy > R.VH + 140) continue;
    for (let i = 0; i < 3; i++) { const k = (T * 0.5 + i / 3 + po.x * 0.13) % 1; g(po.x + Math.sin(i * 2.1 + T * 1.3) * 0.3, po.y + Math.cos(i * 2.1 + T) * 0.3, 10 + k * 100, 11, po.col, 0.7 * Math.sin(k * Math.PI)); }
    if (++n >= 6) break; } }
  // Beute: Lichtsäule beim Herausfallen, seltene Dinge leuchten leise weiter; Münzen blinken ab und zu
  const bmS = beamSprite(), stS = A.fx("star");
  if (!(sk & 32)) for (const it of G.items) {
    const [sx, sy] = toScreen(it.x, it.y);
    if (sx < -40 || sx > R.VW + 40 || sy < -40 || sy > R.VH + 200) continue;
    if (it.kind === "coin") {
      const k = ((T * 0.55 + it.seed) % 2.2); if (k > 0.3) continue;
      const a = Math.sin(k / 0.3 * Math.PI), z = it.z + 5 + Math.sin((T + it.seed) * 3) * 3, s = 16 * Z * a;
      const [px, py] = toScreen(it.x, it.y, z + 8);
      ctx.globalAlpha = 0.9 * a; ctx.drawImage(stS.cv, px - s / 2 + 3 * Z, py - s / 2 - 3 * Z, s, s); ctx.globalAlpha = 1;
      continue;
    }
    if (it._dk0 === undefined) { it._dk0 = T; it._dkDrop = it.flyT > 0; }
    const age = T - it._dk0, rare = it.kind === "sword" || it.kind === "wand" || it.kind === "gem" || it.kind === "hat" || it.kind === "myth";
    const a = (it._dkDrop ? Math.max(0, 1 - age / 1.8) * 0.6 : 0) + (rare ? 0.2 + 0.06 * Math.sin(T * 3 + it.seed) : 0);
    if (a < 0.02) continue;
    const col = LOOT_COL[it.kind] || "#fff3a0", w = (rare ? 46 : 38) * Z, h = (rare ? 170 : 120) * Z;
    ctx.globalAlpha = a; ctx.drawImage(A.tinted(bmS, col).cv, sx - w / 2, sy - h + 4 * Z, w, h); ctx.globalAlpha = 1;
  }
  // Truhe geht auf: Strahlenkranz
  for (const pr of R.dkChests) {
    if (pr.open && !pr._dkWas) { pr._dkWas = true; pr._dkT = T; }
    if (pr._dkT === undefined || T - pr._dkT > 1.4) continue;
    const k = (T - pr._dkT) / 1.4, [sx, sy] = toScreen(pr.x, pr.y, 26), s = (90 + 70 * k) * Z, rs = A.tinted(raysSprite(), "#ffd75e");
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(k * 1.2); ctx.globalAlpha = 0.85 * (1 - k) * Math.min(1, k * 8); ctx.drawImage(rs.cv, -s / 2, -s / 2, s, s); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
const LOOT_COL = { potion: "#ff8fb8", heart: "#ff8fb8", mushroom: "#ff9ae0", sword: "#ffd75e", wand: "#9be1ff", gem: "#d9b3ff", hat: "#ffd75e", myth: "#fff3a0" };
/** Vignette der Lightmap: Ränder in Weltfarbe statt Grau (Farbstimmung ohne Zusatzkosten) */
export const VIGN = [null, "#3c5a52", "#3e3672", "#6a3a5e", "#3e5a7a", "#6a3424"];
