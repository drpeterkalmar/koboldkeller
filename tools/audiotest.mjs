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
  window.__osc = 0;   // Live-Oszillatoren zählen: müssen 0 bleiben (alles vor-gerendert)
  const AC = window.AudioContext;
  const o = AC.prototype.createOscillator;
  AC.prototype.createOscillator = function () { window.__osc++; return o.call(this); };
});
const page = await ctx.newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message));
await page.goto(URL); await page.waitForTimeout(1500);
const st = () => page.evaluate(() => {
  const a = [...document.querySelectorAll("audio")];
  const au = window.KK ? KK.audio() : {};
  return { ctx: window.KK && KK.state().audio, screen: window.KK && KK.state().screen, act: navigator.userActivation && navigator.userActivation.hasBeenActive, osc: window.__osc, vib: window.__vib.length, started: au.started || 0, voices: au.voices || 0, music: au.music && au.music.song + "/" + au.music.where, rec: au.rec, pre: au.pre && au.pre.done };
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
const fin = await st();
console.log("nach Taps  ", JSON.stringify(fin));
console.log("errors", errs);
const ok = fin.ctx === "running" && fin.started > 0 && fin.osc === 0 && errs.length === 0;
console.log(ok ? "AUDIOTEST PASS: AudioContext läuft nach Tap, Effekte ausgelöst (" + fin.started + " Stimmen), 0 Live-Oszillatoren, 0 Fehler" : "AUDIOTEST FAIL");
if (!ok) process.exitCode = 1;
await browser.close();
