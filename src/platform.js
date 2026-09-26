/* platform.js — Vollbild, Wake-Lock, Vibration, App-Wechsel, Touch-Härtung (MIT) */
export const PF = { vibrate: true, wake: null, onHide: null, onShow: null };

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
