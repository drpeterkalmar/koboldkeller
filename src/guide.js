/* guide.js — v7 Weg-Pfeil: steht der Kobold ARROW.idle Sekunden still, zeigt kurz ein Pfeil am Boden in Richtung Ziel —
   entlang des Weges (findPath), nicht durch Wände. Pfad nur beim Einblenden, nicht pro Frame. (MIT)
   Ziel: Stadt → Portal der tiefsten freigeschalteten Ebene · Keller → Treppe (Ebene 20: das 20. Portal) ·
   versiegelte Treppe → Boss bzw. Arena. Kein Pfeil im Bosskampf, im Tutorial-Dialog und während einer Titelkarte. */
import { G } from "./game.js";
import { bossFight } from "./boss.js";
import { findPath, lineFree } from "./world.js";
import { ARROW } from "./config.js";

export const GD = { idle: 0, next: ARROW.idle, t: -1, a: 0, ux: 0, uy: 0, wp: null, path: null, target: null, shows: 0, calcs: 0 };
G.guide = GD;
const TOTAL = () => ARROW.fadeIn + ARROW.show + ARROW.fadeOut;

/** jede Eingabe (Tipp, Knopf, Taste, Joystick) → Pfeil sofort weg, Stillstand zählt neu */
export function guideInput() { GD.idle = 0; GD.next = ARROW.idle; GD.t = -1; GD.a = 0; }

export function guideTarget() {
  const L = G.L; if (!L) return null;
  if (G.depth === 0) {
    let best = null;
    for (const po of L.portals || []) if (!po.locked && (!best || po.depth > best.depth)) best = po;
    return best && { x: best.x, y: best.y, kind: "portal", depth: best.depth };
  }
  const st = L.stairs; if (!st) return null;
  if (!st.sealed) return { x: st.x, y: st.y, kind: G.depth >= 20 ? "portal20" : "stairs" };
  const b = G.boss;
  if (b && b.hp > 0 && G.ents.includes(b)) return { x: b.x, y: b.y, kind: "boss" };
  if (L.arena) return { x: L.arena.cx, y: L.arena.cy, kind: "arena" };
  return null;
}
/** Situationen ohne Pfeil */
export function guideBlocked() {
  return !G.arrowOn || G.screen !== "play" || G.demo || !G.p || G.p.hp <= 0 || bossFight() || !!G.rise ||G.tutStep >= 0 ||
    performance.now() < (G.cardUntil || 0) || G.winQueued;
}
/** Zielrichtung: Punkt ARROW.ahead Kacheln voraus auf dem Pfad; liegt er hinter einer Ecke, rückwärts bis er sichtbar ist */
export function guideAim(p, tg) {
  const m = G.L.map;
  const path = findPath(m, p.x, p.y, tg.x, tg.y, p.r);
  GD.calcs++;
  if (!path || !path.length) return null;
  const pts = [{ x: p.x, y: p.y }, ...path], cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const len = cum[cum.length - 1];
  if (len < 1.2) return null;                                  // schon (fast) am Ziel
  const at = s => {
    for (let i = 1; i < pts.length; i++) if (cum[i] >= s) { const k = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k }; }
    return pts[pts.length - 1];
  };
  const s0 = Math.min(cum[1], len);                            // erster Wegpunkt ist immer sichtbar (geglätteter Pfad)
  let s = Math.min(ARROW.ahead, len), wp = at(s);
  while (s > s0 && !lineFree(m, p.x, p.y, wp.x, wp.y, 0)) { s = Math.max(s0, s - 0.25); wp = at(s); }
  const dx = wp.x - p.x, dy = wp.y - p.y, d = Math.hypot(dx, dy);
  if (d < 0.3) return null;
  return { ux: dx / d, uy: dy / d, wp, path, len };
}

export function guideUpdate(dt) {
  const p = G.p;
  if (!p || !G.L) return;
  const busy = p.moving || G.joy.m > 0.05 || G.hold || (p.path && p.path.length) || p.foe || p.dashT > 0 || p.specT > 0;
  if (busy || guideBlocked()) { guideInput(); return; }
  GD.idle += dt;
  if (GD.t < 0) {
    if (GD.idle < GD.next) return;
    const tg = guideTarget(), aim = tg && guideAim(p, tg);
    if (!aim) { GD.next = GD.idle + 1; return; }                // kein Ziel/Weg: später noch einmal schauen
    Object.assign(GD, { t: 0, ux: aim.ux, uy: aim.uy, wp: aim.wp, path: aim.path, target: tg, len: aim.len, px: p.x, py: p.y });
    GD.shows++; GD.next = GD.idle + TOTAL() + ARROW.repeat;
  }
  GD.t += dt;
  const T = TOTAL();
  if (GD.t >= T) { GD.t = -1; GD.a = 0; return; }
  GD.a = GD.t < ARROW.fadeIn ? GD.t / ARROW.fadeIn : GD.t > T - ARROW.fadeOut ? (T - GD.t) / ARROW.fadeOut : 1;
  GD.a = GD.a * GD.a * (3 - 2 * GD.a);                          // weich
}
