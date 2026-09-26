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
// iPhone kennt navigator.vibrate nicht — Safari ≥ 17.4 gibt aber beim Umschalten eines
// <input type=checkbox switch> einen System-Haptik-Tick ab. Den nutzen wir als Ersatz.
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
  try {
    if (typeof navigator.vibrate === "function") { navigator.vibrate(pattern); return; }
    iosTick();
    // Muster → bis zu 2 weitere Ticks für „starke" Ereignisse (Boss, Tod)
    if (Array.isArray(pattern)) for (let i = 2, t = 0; i < pattern.length && i < 5; i += 2) { t += pattern[i - 2] + pattern[i - 1]; setTimeout(iosTick, t); }
  } catch (e) { }
}
// ---------- Haptik-Muster (ms: an, aus, an …) ----------
// prio 0 = leicht (max. ~14/s), 1 = mittel, 2 = stark, 3 = Ereignis (unterbricht alles Schwächere).
// Budget: leichte/mittlere Impulse zusammen höchstens 35 % Vibrationszeit pro Sekunde — angenehm für Kinderhände.
const HAP = {
  ui: { p: 8, prio: 0 }, hitL: { p: 7, prio: 0 }, hit: { p: 14, prio: 0 }, heavy: { p: 22, prio: 1 }, crit: { p: [18, 35, 12], prio: 1 },
  kill: { p: 20, prio: 1 }, pickup: { p: 10, prio: 0, gap: 250 }, coin: { p: 5, prio: 0, gap: 900 }, dodge: { p: 10, prio: 0 },
  hurt: { p: 38, prio: 2 }, chest: { p: [12, 30, 20], prio: 1 }, stairs: { p: [10, 40, 10], prio: 1 }, slam: { p: [45, 25, 25], prio: 2 },
  boss: { p: [40, 60, 70], prio: 3 }, bossKill: { p: [60, 40, 90], prio: 3 }, levelup: { p: [15, 40, 15, 40, 35], prio: 2 },
  die: { p: [60, 80, 40, 80, 120], prio: 3 }, win: { p: [20, 50, 20, 50, 20, 50, 80], prio: 3 }, probe: { p: [30, 60, 30], prio: 3 },
};
let hBusy = 0, hPrio = -1, hLastLight = 0;
const hLast = {}, hWin = [];
export function haptic(kind) {
  const h = HAP[kind];
  if (!h || !PF.vibrate) return false;
  const now = performance.now();
  if (now < hBusy && h.prio <= hPrio) return false;                     // stärkeres Muster läuft noch
  if (now - (hLast[kind] || -1e9) < (h.gap || 0)) return false;
  if (h.prio === 0 && now - hLastLight < 70) return false;
  while (hWin.length && now - hWin[0][0] > 1000) hWin.shift();
  const pat = Array.isArray(h.p) ? h.p : [h.p];
  let on = 0, total = 0; pat.forEach((v, i) => { total += v; if (!(i % 2)) on += v; });
  if (h.prio < 2 && hWin.reduce((s, x) => s + x[1], 0) + on > 350) return false;
  hWin.push([now, on]); hLast[kind] = now; if (h.prio === 0) hLastLight = now;
  hBusy = now + total; hPrio = h.prio; PF.hapCount++;
  const go = () => vibrate(Array.isArray(h.p) ? h.p : h.p);
  // Schall kommt mit Ausgabe-Latenz aus dem Lautsprecher → Vibration um dieselbe Zeit versetzen (Transient-synchron)
  if (PF.hapDelay > 3) setTimeout(go, PF.hapDelay); else go();
  return true;
}
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
