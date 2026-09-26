// Audio/Vibration-Realitätstest: OHNE --autoplay-policy-Flag (echte Handy-Regeln).
// node tools/audiotest.mjs [url]
import { loadPlaywright } from "./pw.mjs";
const URL = process.argv[2] || "http://localhost:8731/";
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: [] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
await ctx.addInitScript(() => {
  window.__vib = [];
  const orig = navigator.vibrate ? navigator.vibrate.bind(navigator) : null;
  navigator.vibrate = (p) => { window.__vib.push(JSON.stringify(p)); return orig ? orig(p) : true; };
  window.__osc = 0;
  const AC = window.AudioContext;
  const o = AC.prototype.createOscillator;
  AC.prototype.createOscillator = function () { window.__osc++; return o.call(this); };
});
const page = await ctx.newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message));
await page.goto(URL); await page.waitForTimeout(1500);
const st = () => page.evaluate(() => {
  const a = [...document.querySelectorAll("audio")];
  return { ctx: window.KK && KK.state().audio, screen: window.KK && KK.state().screen, act: navigator.userActivation && navigator.userActivation.hasBeenActive, osc: window.__osc, vib: window.__vib.length, elPaused: window.__kkEl ? window.__kkEl.paused : "?" };
});
console.log("start      ", JSON.stringify(await st()));
// Peters Weg: erster Tap irgendwo auf den Schirm (Menü), dann Buttons
await page.touchscreen.tap(200, 300); await page.waitForTimeout(400);
console.log("tap canvas ", JSON.stringify(await st()));
const btn = await page.$("#btnCont:visible") ? "#btnCont" : "#btnNew";
await page.locator(btn).tap(); await page.waitForTimeout(600);
if (btn === "#btnNew") { await page.locator("#btnGo").tap(); await page.waitForTimeout(800); }
console.log("im Spiel   ", JSON.stringify(await st()));
// ein paar Angriffe per Tap
for (let i = 0; i < 6; i++) { await page.touchscreen.tap(300, 600); await page.waitForTimeout(250); }
console.log("nach Taps  ", JSON.stringify(await st()));
console.log("errors", errs);
await browser.close();
