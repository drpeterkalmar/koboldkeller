/* input.js — Tap-to-Move, Halten-Folgen, schwebender Joystick, Tastatur (MIT) */
import { R, toWorld, toScreen } from "./render.js";
import { G, tapWorld, holdWorld, releaseHold, setJoy, attack, bubbles, dodge, potion } from "./game.js";

export const IN = { joyOn: true, joy: null, hold: null, keys: {}, attackHeld: false, cb: {} };
let base, knob;

/** Bildschirm-Richtung → Welt-Richtung (Iso) */
export function screenDirToWorld(jx, jy) {
  const wx = (jx / 32 + jy / 16) / 2, wy = (jy / 16 - jx / 32) / 2;
  const l = Math.hypot(wx, wy) || 1;
  return [wx / l, wy / l];
}
function inJoyZone(x, y) {
  const W = window.innerWidth, H = window.innerHeight;
  return W > H ? (x < W * 0.34 && y > H * 0.35) : (x < W * 0.5 && y > H * 0.62);
}
/** Gegner unter dem Finger (großzügig) */
function pickEnt(sx, sy) {
  let best = null, bd = 1e9;
  for (const e of G.ents) {
    const [ex, ey] = toScreen(e.x, e.y, e.z + (e.fly ? 28 : 0));
    const sc = (e.scale || 1) * R.Z, h = (e.isBoss ? 110 : 60) * sc;
    const cx = ex, cy = ey - h * 0.5;
    const dx = Math.abs(sx - cx), dy = Math.abs(sy - cy);
    if (dx < 34 * sc + 14 && dy < h * 0.5 + 22) { const d = dx + dy; if (d < bd) { bd = d; best = e; } }
  }
  return best;
}
export function initInput(cv, cb) {
  IN.cb = cb;
  base = document.getElementById("joyBase"); knob = document.getElementById("joyKnob");
  cv.addEventListener("pointerdown", down, { passive: false });
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up, { passive: false });
  window.addEventListener("pointercancel", up, { passive: false });
  window.addEventListener("keydown", key);
  window.addEventListener("keyup", e => { IN.keys[e.code] = false; if (e.code === "Space" || e.code === "Digit1" || e.code === "KeyJ") IN.attackHeld = false; keyMove(); });
  window.addEventListener("blur", () => { IN.keys = {}; IN.attackHeld = false; setJoy(0, 0, 0); releaseHold(); hideJoy(); });
}
function down(e) {
  e.preventDefault();
  IN.cb.gesture && IN.cb.gesture();
  if (G.screen !== "play") return;
  const x = e.clientX, y = e.clientY;
  if (IN.joyOn && !IN.joy && inJoyZone(x, y)) {
    IN.joy = { id: e.pointerId, x0: x, y0: y, t0: performance.now(), active: false };
    showJoy(x, y);
    return;
  }
  const w = toWorld(x, y);
  tapWorld(w.x, w.y, pickEnt(x, y));
  IN.hold = { id: e.pointerId, t0: performance.now(), x, y };
}
function move(e) {
  const j = IN.joy;
  if (j && e.pointerId === j.id) {
    e.preventDefault();
    const dx = e.clientX - j.x0, dy = e.clientY - j.y0, l = Math.hypot(dx, dy);
    if (l > 12) j.active = true;
    if (j.active) {
      const max = 52, k = Math.min(1, l / max);
      const [wx, wy] = screenDirToWorld(dx, dy);
      setJoy(wx, wy, k);
      knob.style.transform = "translate(" + (dx / (l || 1) * Math.min(l, max)) + "px," + (dy / (l || 1) * Math.min(l, max)) + "px)";
    }
    return;
  }
  const h = IN.hold;
  if (h && e.pointerId === h.id && G.screen === "play") {
    h.x = e.clientX; h.y = e.clientY;
    if (performance.now() - h.t0 > 170) { const w = toWorld(h.x, h.y); holdWorld(w.x, w.y); }
  }
}
function up(e) {
  const j = IN.joy;
  if (j && e.pointerId === j.id) {
    if (!j.active && performance.now() - j.t0 < 350 && G.screen === "play") {
      const w = toWorld(j.x0, j.y0); tapWorld(w.x, w.y, pickEnt(j.x0, j.y0));
    }
    IN.joy = null; setJoy(0, 0, 0); hideJoy();
    return;
  }
  if (IN.hold && e.pointerId === IN.hold.id) {
    if (G.hold && G.p) { G.p.path = null; }
    IN.hold = null; releaseHold();
  }
}
function showJoy(x, y) { base.style.left = x + "px"; base.style.top = y + "px"; base.classList.add("on"); knob.style.transform = "translate(0,0)"; }
function hideJoy() { base.classList.remove("on"); }

function key(e) {
  if (e.target instanceof HTMLInputElement) return;
  const c = e.code;
  IN.keys[c] = true;
  IN.cb.gesture && IN.cb.gesture();
  if (c === "Escape" || c === "KeyP") { IN.cb.pause && IN.cb.pause(); return; }
  if (c === "KeyI" || c === "KeyB") { IN.cb.bag && IN.cb.bag(); return; }
  if (G.screen !== "play") return;
  if (c === "Space" || c === "Digit1" || c === "KeyJ") { IN.attackHeld = true; attack(); e.preventDefault(); }
  else if (c === "Digit2" || c === "KeyK") bubbles();
  else if (c === "Digit3" || c === "ShiftLeft" || c === "ShiftRight" || c === "KeyL") dodge();
  else if (c === "KeyR" || c === "KeyQ" || c === "Digit4") potion();
  keyMove();
}
function keyMove() {
  const k = IN.keys;
  let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  let y = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if (IN.joy) return;
  if (!x && !y) { if (IN._kb) { setJoy(0, 0, 0); IN._kb = false; } return; }
  const [wx, wy] = screenDirToWorld(x * 2, y);
  IN._kb = true;
  setJoy(wx, wy, 1);
}
export function resetInput() { IN.joy = null; IN.hold = null; IN.attackHeld = false; setJoy(0, 0, 0); releaseHold(); hideJoy(); }
