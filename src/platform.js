/* platform.js — Vollbild, Wake-Lock, Vibration, App-Wechsel, Touch-Härtung (MIT) */
export const PF = { vibrate: true, wake: null, onHide: null, onShow: null, hapDelay: 0, hapCount: 0 };

export function hardenTouch() {
  const stop = e => e.preventDefault();
  document.addEventListener("contextmenu", stop, { passive: false });
  document.addEventListener("gesturestart", stop, { passive: false });
  document.addEventListener("dblclick", stop, { passive: false });
  // Mehrfinger-Zoom verhindern (iOS/ältere Android)
  document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("selectstart", e => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); });
}
// ---------- Vibration (v7) ----------
// Befund v6 → v7 (Belege: V7_BERICHT.md):
// • iPhone: navigator.vibrate gibt es nicht. Der Ersatz — ein unsichtbarer <input type=checkbox switch> per label.click()
//   umschalten (Safari ≥ 17.4 gibt dabei einen System-Tick) — wurde mit iOS 26.5 abgestellt: programmatische Klicks lösen
//   keine Haptik mehr aus, nur noch die echte Berührung eines Switches. Darum: bis iOS 26.4 bleibt der Tick bei großen
//   Ereignissen, ab 26.5 gibt es Ticks nur beim direkten Antippen von Knöpfen (hapticButtons, Muster wie ios-haptics 3.x).
// • Android/Chrome: navigator.vibrate(ms) → Vibrator.vibrate() ohne Nutzungsart (USAGE_UNKNOWN). Android ignoriert das im
//   Lautlos-Modus (Chrome selbst), im Energiesparmodus und wenn „Vibration & Haptik“ bzw. die Medien-Vibration aus ist.
//   Außerdem waren die v6-Pulse (5–14 ms) für viele Handy-Motoren zu kurz, um überhaupt anzulaufen, und kamen so oft,
//   dass jeder neue Aufruf den laufenden abbrach. v7: wenige, spürbare Impulse ≥ 30 ms, nur bei großen Ereignissen.
let hapLabel = null;
function iosTick() {
  if (!hapLabel) {
    const id = "kkHap";
    const inp = document.createElement("input"); inp.type = "checkbox"; inp.id = id; inp.setAttribute("switch", "");
    hapLabel = document.createElement("label"); hapLabel.htmlFor = id;
    for (const el of [inp, hapLabel]) { el.setAttribute("aria-hidden", "true"); el.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(el); }
  }
  hapLabel.click();
}
export function vibrate(pattern) {
  if (!PF.vibrate) return;
  PF.vibLog && PF.vibLog.push([performance.now(), pattern]);
  try {
    if (typeof navigator.vibrate === "function") { navigator.vibrate(pattern); return; }
    iosTick();                                       // wirkt nur noch bis iOS 26.4
    if (Array.isArray(pattern)) for (let i = 2, t = 0; i < pattern.length && i < 5; i += 2) { t += pattern[i - 2] + pattern[i - 1]; setTimeout(iosTick, t); }
  } catch (e) { }
}
// ---------- Haptik-Muster (ms: an, aus, an …) ----------
// v7 „dezent": nur große Ereignisse, jeder Impuls ≥ 30 ms (kürzere spüren viele Motoren nicht), Mindestabstand HAP_GAP.
// Alles, was hier fehlt (Schlag, Treffer, Münze, Pickup, Ausweichen, Spezial, Stampfer, Phasenwechsel …), vibriert nicht.
// prio: stärkere Muster werden nicht von schwächeren unterbrochen; prio ≥ 2 wird bei zu kurzem Abstand nachgeholt statt verworfen.
export const HAP_V7 = {
  hurt: { p: 40, prio: 2 },                          // eigener Treffer
  chest: { p: [35, 60, 35], prio: 1 },               // Truhe
  stairs: { p: 45, prio: 1 },                        // Treppe / Portal
  levelup: { p: [35, 70, 50], prio: 2 },
  boss: { p: [60, 80, 90], prio: 3 },                // Boss-Auftritt
  bossKill: { p: [70, 60, 110], prio: 3 },           // Boss-Sieg
  die: { p: [80, 90, 120], prio: 3 },
  win: { p: [40, 70, 40, 70, 120], prio: 3 },
  probe: { p: [50, 90, 50], prio: 3 },               // „📳 Vibration testen"
};
// v6 (zum A/B-Vergleich per ?hap=alt): viele sehr kurze Impulse bei fast jedem Treffer, jeder Münze, jedem Pickup.
export const HAP_V6 = {
  ui: { p: 8, prio: 0 }, hitL: { p: 7, prio: 0 }, hit: { p: 14, prio: 0 }, heavy: { p: 22, prio: 1 }, crit: { p: [18, 35, 12], prio: 1 },
  kill: { p: 20, prio: 1 }, pickup: { p: 10, prio: 0, gap: 250 }, coin: { p: 5, prio: 0, gap: 900 }, dodge: { p: 10, prio: 0 },
  hurt: { p: 38, prio: 2 }, chest: { p: [12, 30, 20], prio: 1 }, stairs: { p: [10, 40, 10], prio: 1 }, slam: { p: [45, 25, 25], prio: 2 },
  boss: { p: [40, 60, 70], prio: 3 }, phase: { p: [40, 60, 70], prio: 3 }, special: { p: [25, 30, 70], prio: 2 }, bossKill: { p: [60, 40, 90], prio: 3 }, levelup: { p: [15, 40, 15, 40, 35], prio: 2 },
  die: { p: [60, 80, 40, 80, 120], prio: 3 }, win: { p: [20, 50, 20, 50, 20, 50, 80], prio: 3 }, probe: { p: [30, 60, 30], prio: 3 },
};
const HAP_ALT = typeof location !== "undefined" && new URLSearchParams(location.search).get("hap") === "alt";
const HAP = HAP_ALT ? HAP_V6 : HAP_V7;
export const HAP_GAP = HAP_ALT ? 0 : 400;           // ms Mindestabstand zwischen zwei Vibrationen (v6: nur 70 ms für leichte)
export const HAP_BUDGET = 350;                      // ms Vibration pro Sekunde (gleitend)
PF.hapMode = HAP_ALT ? "alt" : "v7";
PF.hapStats = { calls: {}, fired: {} };             // Zähler je Ereignis-Art (für check.mjs)
let hBusy = 0, hPrio = -1, hLastLight = 0, hLastAny = -1e9, hPend = null;
const hLast = {}, hWin = [];
export function haptic(kind) {
  const st = PF.hapStats; st.calls[kind] = (st.calls[kind] || 0) + 1;
  return fire(kind);
}
function fire(kind) {
  const st = PF.hapStats, h = HAP[kind];
  if (!h || !PF.vibrate) return false;
  const now = performance.now();
  if (now < hBusy && h.prio <= hPrio) return false;                     // stärkeres Muster läuft noch
  if (now - (hLast[kind] || -1e9) < (h.gap || 0)) return false;
  if (h.prio === 0 && now - hLastLight < 70) return false;
  if (now - hLastAny < HAP_GAP) {                                      // zu kurz nach der letzten Vibration
    if (h.prio >= 2 && (!hPend || HAP[hPend].prio < h.prio)) {        // Wichtiges nachholen (z. B. Tod direkt nach Treffer)
      hPend = kind; clearTimeout(PF._hapT);
      PF._hapT = setTimeout(() => { const k = hPend; hPend = null; if (k) fire(k); }, HAP_GAP - (now - hLastAny) + 5);
    }
    return false;
  }
  while (hWin.length && now - hWin[0][0] > 1000) hWin.shift();
  const pat = Array.isArray(h.p) ? h.p : [h.p];
  let on = 0, total = 0; pat.forEach((v, i) => { total += v; if (!(i % 2)) on += v; });
  if ((h.prio < 2 || !HAP_ALT) && hWin.reduce((s, x) => s + x[1], 0) + on > HAP_BUDGET) return false;
  hWin.push([now, on]); hLast[kind] = now; hLastAny = now; if (h.prio === 0) hLastLight = now;
  hBusy = now + total; hPrio = h.prio; PF.hapCount++; st.fired[kind] = (st.fired[kind] || 0) + 1;
  const go = () => vibrate(h.p);
  // Schall kommt mit Ausgabe-Latenz aus dem Lautsprecher → Vibration um dieselbe Zeit versetzen (Transient-synchron)
  if (PF.hapDelay > 3) setTimeout(go, PF.hapDelay); else go();
  return true;
}
/** Vibration testen (Einstellungen): starkes Probe-Muster, unabhängig von Abstand/Budget */
export function hapticProbe() { vibrate(HAP.probe.p); return typeof navigator.vibrate === "function"; }

// ---------- iPhone ab iOS 26.5: Haptik nur beim echten Antippen (Muster wie ios-haptics 3.x, eigener Code) ----------
// In ausgewählte DOM-Knöpfe kommt ein unsichtbarer <input type=checkbox switch>, der den Knopf genau abdeckt. Die echte
// Berührung schaltet ihn um → Safari gibt einen System-Tick; der Klick blubbert normal zum Knopf weiter. Nie über dem
// Spiel-Canvas (Joystick/Tap-to-move bleiben unberührt). „Vibration aus" blendet die Schalter aus (body.noHap).
export const IOS_TOUCH_HAP = typeof navigator !== "undefined" && typeof location !== "undefined" &&
  (new URLSearchParams(location.search).get("haptouch") === "1" ||
    (typeof navigator.vibrate !== "function" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))));
export function hapticButton(el) {
  if (!IOS_TOUCH_HAP || !el || el.querySelector(":scope > .kkHapSw")) return;
  const n = document.createElement("input");
  n.type = "checkbox"; n.setAttribute("switch", ""); n.className = "kkHapSw"; n.tabIndex = -1; n.setAttribute("aria-hidden", "true");
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  let y0 = 0, moved = false;                         // Wischen (Scrollen in Menüs) soll nicht umschalten
  n.addEventListener("pointerdown", e => { y0 = e.clientY; moved = false; }, { passive: true });
  n.addEventListener("pointermove", e => { if (Math.abs(e.clientY - y0) > 10) { moved = true; n.checked = false; } }, { passive: true });
  n.addEventListener("pointercancel", () => { moved = false; n.checked = false; }, { passive: true });
  n.addEventListener("change", () => { if (!moved) PF.touchTicks++; });
  el.appendChild(n);
}
export function hapticButtons(root = document) {
  if (!IOS_TOUCH_HAP) return 0;
  const list = root.querySelectorAll("#bSpec, #bPot, #btnPause, #btnBag, .btn, .dice, .set, #btnHapTest");
  list.forEach(hapticButton);
  return list.length;
}
PF.touchTicks = 0; PF.iosTouch = IOS_TOUCH_HAP;
export function canFullscreen() {
  const d = document.documentElement;
  return !!(d.requestFullscreen || d.webkitRequestFullscreen);
}
export function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
export async function toggleFullscreen() {
  try {
    if (isFullscreen()) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const d = document.documentElement;
    await (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: "hide" });
  } catch (e) { /* still scheitern */ }
}
export async function wakeLock(on) {
  try {
    if (on) {
      if (PF.wake || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      PF.wake = await navigator.wakeLock.request("screen");
      PF.wake.addEventListener && PF.wake.addEventListener("release", () => { PF.wake = null; });
    } else if (PF.wake) { const w = PF.wake; PF.wake = null; await w.release(); }
  } catch (e) { PF.wake = null; }
}
export function watchVisibility(onHide, onShow) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide(); else onShow();
  });
  window.addEventListener("pagehide", onHide);
}
