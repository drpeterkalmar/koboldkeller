/* ui.js — Menüs, Charakterwahl, HUD, Toasts, Rucksack, Ehrenhall, Tutorial (MIT) */
import { G, startGame, attack, bubbles, dodge, potion, eatShroom, wearHat, goTown, reviveInTown, finishTut, save } from "./game.js";
import { SPECIES, NAMES, HATS, BIOMES, weaponOf, VERSION, PLAYER } from "./config.js";
import { portrait } from "./art.js";
import { loadSave, loadHall, loadSettings, saveSettings, sanitize } from "./save.js";
import { esc, pick } from "./util.js";
import { SFX, setMusic, setSfx } from "./audio.js";
import { toggleFullscreen, canFullscreen, PF, vibrate } from "./platform.js";
import { IN, resetInput } from "./input.js";
import { drawMini } from "./render.js";

const $ = id => document.getElementById(id);
export const UI = { settings: loadSettings(), back: "scrMenu", selLook: 0, miniT: 0, last: {} };
const SCREENS = ["scrMenu", "scrCreate", "scrConfirm", "scrPause", "scrSet", "scrBag", "scrHall", "scrDead", "scrWin"];

export function show(id) {
  for (const s of SCREENS) $(s).classList.toggle("hidden", s !== id);
  const inGame = ["play", "pause", "bag", "dead", "win"].includes(G.screen);
  $("hud").classList.toggle("hidden", !(G.p && !G.demo && inGame));
}
export function hideScreens() { for (const s of SCREENS) $(s).classList.add("hidden"); $("hud").classList.toggle("hidden", !(G.p && !G.demo)); }

// ---------- Toasts ----------
const toasts = [];
export function toast(msg) {
  const box = $("toasts");
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg;
  box.appendChild(el); toasts.push(el);
  while (toasts.length > 3) toasts.shift().remove();
  setTimeout(() => { el.classList.add("out"); setTimeout(() => { el.remove(); const i = toasts.indexOf(el); if (i >= 0) toasts.splice(i, 1); }, 380); }, 2800);
}
export function clearToasts() { for (const t of toasts) t.remove(); toasts.length = 0; }

// ---------- Titelkarte ----------
export function banner(title, sub, kind = "") {
  const b = $("banner");
  $("bannerT").textContent = title; $("bannerS").textContent = sub || "";
  b.className = kind; void b.offsetWidth; b.className = "show " + kind;
  clearTimeout(UI._bn); UI._bn = setTimeout(() => b.className = "hidden", 2700);
}

// ---------- Blende ----------
export function fade(cb, after) {
  const f = $("fade");
  f.classList.add("on");
  setTimeout(() => { try { cb(); after && after(); } finally { requestAnimationFrame(() => f.classList.remove("on")); } }, 230);
}

// ---------- Einstellungen ----------
function settingsHtml(box) {
  const s = UI.settings;
  const rows = [["music", "🎵 Musik"], ["sfx", "🔔 Töne"], ["vibrate", "📳 Vibration"], ["joystick", "🕹️ Daumen-Joystick (links unten)"]];
  box.innerHTML = rows.map(([k, t]) => '<div class="set" data-k="' + k + '"><span>' + t + '</span><span class="sw' + (s[k] ? " on" : "") + '"></span></div>').join("");
  box.querySelectorAll(".set").forEach(el => el.addEventListener("click", () => {
    const k = el.dataset.k; s[k] = !s[k];
    el.querySelector(".sw").classList.toggle("on", s[k]);
    applySettings(); saveSettings(s); SFX.click();
    if (k === "vibrate" && s[k]) vibrate([30, 60, 30]);   // sofort fühlbare Rückmeldung
  }));
}
export function applySettings() {
  const s = UI.settings;
  setMusic(s.music); setSfx(s.sfx); PF.vibrate = s.vibrate; IN.joyOn = s.joystick;
}

// ---------- Startmenü ----------
export function showMenu() {
  G.screen = "menu";
  const sv = loadSave();
  $("verLabel").textContent = "🍄 Koboldkeller 2 · v" + VERSION;
  if (sv) {
    $("contBox").classList.remove("hidden");
    $("contInfo").textContent = sv.name + " · ⭐ " + sv.lvl + " · 🪙 " + sv.gold + " · " + (sv.depth > 0 ? "Ebene " + sv.depth : "in der Stadt") + (sv.migrated ? " · aus v20 umgezogen 🎖️" : "");
    $("megaCont").checked = !!sv.mega;
  } else $("contBox").classList.add("hidden");
  $("btnFull1").classList.toggle("hidden", !canFullscreen());
  show("scrMenu");
}
function showCreate() {
  G.screen = "create";
  const box = $("looks");
  if (!box.children.length) {
    SPECIES.forEach((sp, i) => {
      const d = document.createElement("div");
      d.className = "look" + (i === UI.selLook ? " sel" : "");
      const cv = document.createElement("canvas");
      portrait(cv, sp, null, 84);
      d.appendChild(cv);
      const n = document.createElement("div"); n.className = "nm"; n.textContent = sp.name; d.appendChild(n);
      d.addEventListener("click", () => {
        box.children[UI.selLook].classList.remove("sel");
        UI.selLook = i; d.classList.remove("sel"); void d.offsetWidth; d.classList.add("sel"); SFX.click();
      });
      box.appendChild(d);
    });
  }
  $("nameInput").value = pick(NAMES);
  $("megaNew").checked = false;
  show("scrCreate");
}
function newProfile() {
  const name = ($("nameInput").value || "").trim().slice(0, 12) || pick(NAMES);
  return sanitize({
    name, species: SPECIES[UI.selLook].id, lvl: 1, xp: 0, xpNext: 10, maxHp: PLAYER.hp, hp: PLAYER.hp,
    atk: PLAYER.atk, projN: 1, magic: 1, gold: 0, potions: PLAYER.potions, shrooms: 0, hats: [], hat: null,
    deepest: 1, depth: 0, mega: $("megaNew").checked, tut: false, seed: (Math.random() * 2 ** 31) | 0,
  });
}
function begin(prof) {
  G.demo = false;
  resetInput();
  fade(() => { startGame(prof); hideScreens(); G.screen = "play"; });
}

// ---------- Pause / Rucksack ----------
export function openPause() {
  if (G.screen !== "play") { if (G.screen === "pause") resume(); else if (G.screen === "bag") closeBag(); return; }
  G.screen = "pause"; resetInput();
  $("btnTown").classList.toggle("hidden", G.depth === 0);
  $("btnFull2").classList.toggle("hidden", !canFullscreen());
  settingsHtml($("setBox"));
  show("scrPause"); SFX.click();
}
export function resume() { G.screen = "play"; hideScreens(); save(); }
export function openBag() {
  if (G.screen === "bag") { closeBag(); return; }
  if (G.screen !== "play") return;
  G.screen = "bag"; resetInput();
  renderBag(); show("scrBag"); SFX.click();
}
function closeBag() { G.screen = "play"; hideScreens(); }
function renderBag() {
  const p = G.p, w = weaponOf(p.atk);
  const f = n => (Math.round(n * 10) / 10).toString().replace(".", ",");
  let h = '<div class="bagGrid">' +
    '<div class="stat">⭐ Level<b>' + p.lvl + '</b></div>' +
    '<div class="stat">❤️ Herzen<b>' + Math.ceil(p.hp) + " / " + p.maxHp + '</b></div>' +
    '<div class="stat">⚔️ ' + esc(w.name) + '<b>Schaden ' + f(p.atk) + '</b></div>' +
    '<div class="stat">🫧 Seifenblasen<b>' + p.projN + "× · Kraft " + f(1 + p.magic + p.atk * 0.25) + '</b></div>' +
    '<div class="stat">🪙 Glitzermünzen<b>' + G.gold + '</b></div>' +
    '<div class="stat">🪜 Tiefste Ebene<b>' + G.deepest + '</b></div>' +
    '<div class="stat">🧪 Tränke<b>' + p.potions + '</b></div>' +
    '<div class="stat">🍄 Glitzerpilze<b>' + p.shrooms + '</b></div></div>';
  if (p.shrooms > 0) h += '<button class="btn pink" id="btnEat">🍄 Pilz essen (+2 ❤️)</button>';
  h += "<h2 style='font-size:17px;margin:10px 0 4px'>🎩 Hüte</h2>";
  if (!p.hats.length) h += "<p style='opacity:.75;font-size:14px'>Noch keine Hüte — Bosse lassen welche fallen!</p>";
  else {
    h += '<div class="hats"><button class="hatBtn' + (!p.hat ? " on" : "") + '" data-h=""><span class="e">🙂</span>Ohne</button>';
    for (const k of p.hats) h += '<button class="hatBtn' + (p.hat === k ? " on" : "") + '" data-h="' + k + '"><span class="e">' + HATS[k].emoji + "</span>" + esc(HATS[k].name) + "</button>";
    h += "</div>";
  }
  h += "<p style='font-size:13px;opacity:.7'>Besiegte Gegner: " + G.stats.kills + "</p>";
  $("bagBody").innerHTML = h;
  const eat = $("btnEat"); if (eat) eat.addEventListener("click", () => { eatShroom(); renderBag(); });
  $("bagBody").querySelectorAll(".hatBtn").forEach(b => b.addEventListener("click", () => { wearHat(b.dataset.h || null); SFX.click(); renderBag(); }));
}

// ---------- Ehrenhall ----------
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + " Min"; }
export function hallHtml(h) {
  const medal = ["🥇", "🥈", "🥉", "4.", "5."];
  const rows = (arr, val) => {
    if (!arr.length) return '<tr><td class="empty" colspan="3">— noch keine Einträge —</td></tr>';
    return arr.map((r, i) => {
      const d = new Date(r.ts);
      return '<tr><td class="m">' + medal[i] + '</td><td class="n"><b>' + esc(r.name) + '</b><br><span class="d">' + WD[d.getDay()] + " " +
        esc(d.toLocaleDateString("de-AT")) + (r.mega ? " 🔥" : "") + (r.from > 1 ? " · ab Ebene " + r.from : "") + "</span></td><td class=\"v\">" + val(r) + "</td></tr>";
    }).join("");
  };
  return '<div class="hallBox"><h3>🪙 Meiste Münzen</h3><table><tbody>' + rows(h.gold, r => r.gold + " 🪙") + "</tbody></table></div>" +
    '<div class="hallBox"><h3>⏱️ Schnellster Durchlauf</h3><table><tbody>' + rows(h.time, r => fmtTime(r.secs)) + "</tbody></table></div>";
}
function showHall(back) { UI.back = back; G.screen = "hall"; $("hallBody").innerHTML = hallHtml(loadHall()); show("scrHall"); }

// ---------- Tod / Sieg ----------
export function showDead() { setTimeout(() => { if (G.screen === "dead") show("scrDead"); }, 900); }
export function showWin(rec, hall) {
  setTimeout(() => {
    const when = new Date(rec.ts).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" });
    $("winStats").innerHTML = "<b>" + esc(rec.name) + "</b> hat den Koboldkeller bezwungen" + (rec.how === "portal" ? " (durchs 20. Portal)" : " (Kellerkönig besiegt)") + "!<br>" +
      "⭐ Level " + rec.lvl + " · 🪙 " + rec.gold + " · ⏱️ " + fmtTime(rec.secs) + (rec.mega ? " · 🔥 MEGASCHWER" : "") + "<br><span style='opacity:.8'>Geschafft am " + esc(when) + "</span>";
    $("winHall").innerHTML = hallHtml(hall);
    show("scrWin");
  }, 1200);
}

// ---------- Tutorial ----------
const TUT = [
  n => "Hallo " + esc(n) + "! Ich bin Oma Pilzhut. 👆 Tipp irgendwo auf den Boden, um zu laufen — oder schieb links unten mit dem Daumen!",
  () => "Super! Jetzt hau die Strohwichtel mit ⚔️ — dein Rundumschlag trifft ALLES rund um dich!",
  () => "Klasse! Drück 🫧 — die Seifenblasen fliegen von selbst zum nächsten Gegner!",
  () => "Mit 💨 springst du blitzschnell weg vom Gegner. Probier's aus!",
  () => "Perfekt! 💧 Der Brunnen heilt dich. Das 🌀 Portal unten bringt dich in den Koboldkeller. Viel Glück!",
];
const TIPS = [
  "Halte ⚔️ gedrückt — dann schlägst du immer weiter!",
  "Rote Kreise am Boden? Schnell mit 💨 rausspringen!",
  "Truhen gehen auf, wenn du drüberläufst. ✨",
  "Töpfe zerbrechen beim Rundumschlag — manchmal mit Münzen!",
  "Mein Brunnen füllt deine Tränke wieder auf 3 auf. 💧",
  "Bosse lassen schicke Hüte fallen. Schau in den 🎒 Rucksack!",
  "Die Portale hier bringen dich zu jeder Welt, die du schon erreicht hast.",
];
export function showTut(step) {
  if (step === "tap") {
    if (G.tutStep >= 0) { $("tut").classList.remove("hidden"); return; }
    UI.tip = ((UI.tip ?? -1) + 1) % TIPS.length;
    toast("🍄 Oma Pilzhut: " + TIPS[UI.tip]); SFX.click(); return;
  }
  if (step < 0) { $("tut").classList.add("hidden"); document.body.classList.remove("tutOn"); return; }
  document.body.classList.add("tutOn");
  $("tutText").innerHTML = TUT[step](G.p.name);
  const t = $("tut"); t.classList.add("hidden"); void t.offsetWidth; t.classList.remove("hidden");
}

// ---------- Boss ----------
export function showBoss(e) {
  UI.boss = e;
  $("bossBar").classList.toggle("hidden", !e);
  document.body.classList.toggle("bossOn", !!e);
  if (e) { $("bossName").textContent = (e.isKing ? "👑🔥 " : "👑 ") + e.name; $("tut").classList.add("hidden"); document.body.classList.remove("tutOn"); }
}

// ---------- HUD (nur bei Änderung schreiben) ----------
function setTxt(id, v) { if (UI.last[id] !== v) { UI.last[id] = v; $(id).textContent = v; return true; } return false; }
function setW(id, v) { v = Math.round(v * 1000) / 10; if (UI.last[id] !== v) { UI.last[id] = v; $(id).style.width = v + "%"; } }
function setCd(el, key, v) { v = Math.round(v * 50) / 50; if (UI.last[key] !== v) { if (v === 0 && UI.last[key] > 0) { el.classList.remove("ready"); void el.offsetWidth; el.classList.add("ready"); } UI.last[key] = v; el.style.setProperty("--cd", v); } }
export function hud(dt) {
  const p = G.p;
  if (!p || G.demo) return;
  const hp = Math.max(0, Math.ceil(p.hp));
  if (UI.last.hpv !== undefined && hp < UI.last.hpv) { const h = $("hpHeart"); h.classList.remove("beat"); void h.offsetWidth; h.classList.add("beat"); }
  UI.last.hpv = hp;
  setW("hpFill", Math.max(0, p.hp) / p.maxHp);
  setTxt("hpTxt", hp + " / " + p.maxHp);
  setW("xpFill", p.xp / p.xpNext);
  setTxt("lvlBadge", "⭐ " + p.lvl);
  if (setTxt("goldChip", "🪙 " + G.gold)) { const c = $("goldChip"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
  setTxt("depthChip", G.depth === 0 ? "🏠 Stadt" : "🪜 Ebene " + G.depth);
  if (UI.last.mega !== G.mega) { UI.last.mega = G.mega; $("megaChip").classList.toggle("hidden", !G.mega); }
  setTxt("potCnt", String(p.potions));
  setCd($("bAtk"), "cdA", p.atkCd / PLAYER.atkCd);
  setCd($("bBub"), "cdB", p.bubCd / PLAYER.bubbleCd);
  setCd($("bDash"), "cdD", p.dashCd / PLAYER.dashCd);
  if (UI.boss) setW("bossFill", Math.max(0, UI.boss.hp) / UI.boss.maxHp);
  UI.miniT -= dt;
  if (UI.miniT <= 0) { UI.miniT = 0.25; drawMini($("mini"), G); }
}
export function flashSaved() { const c = $("saveChip"); c.classList.add("on"); clearTimeout(UI._sv); UI._sv = setTimeout(() => c.classList.remove("on"), 900); }

// ---------- Verdrahtung ----------
export function initUI(onGesture) {
  applySettings();
  const tap = (id, fn) => $(id).addEventListener("click", e => { onGesture(); SFX.click(); fn(e); });
  tap("btnCont", () => { const sv = loadSave(); if (!sv) return showMenu(); sv.mega = $("megaCont").checked; begin(sv); });
  tap("btnNew", () => { const sv = loadSave(); if (sv) { $("confirmText").textContent = "Dein Kobold „" + sv.name + "“ (⭐ " + sv.lvl + ", 🪙 " + sv.gold + ") wird ersetzt. Die Ehrenhall bleibt!"; show("scrConfirm"); } else showCreate(); });
  tap("btnYes", () => showCreate());
  tap("btnNo", () => showMenu());
  tap("btnDice", () => { $("nameInput").value = pick(NAMES); });
  tap("btnGo", () => begin(newProfile()));
  tap("btnBack1", () => showMenu());
  tap("btnHall", () => showHall("menu"));
  tap("btnBack2", () => { if (UI.back === "menu") showMenu(); else show("scrWin"); });
  tap("btnSet", () => { G.screen = "set"; settingsHtml($("setBox2")); show("scrSet"); });
  tap("btnBack3", () => showMenu());
  tap("btnFull1", () => toggleFullscreen());
  tap("btnFull2", () => toggleFullscreen());
  tap("btnResume", () => resume());
  tap("btnTown", () => { resume(); goTown(); });
  tap("btnMenu", () => { save(); showMenu(); });
  tap("btnBagClose", () => closeBag());
  tap("btnRevive", () => { hideScreens(); reviveInTown(); });
  tap("btnWinTown", () => { hideScreens(); G.winQueued = false; G.screen = "play"; if (G.depth !== 0) goTown(); });
  tap("btnWinMenu", () => { G.winQueued = false; showMenu(); });
  $("tutSkip").addEventListener("click", () => { finishTut(); SFX.click(); });
  $("btnPause").addEventListener("pointerdown", e => { e.preventDefault(); onGesture(); openPause(); });
  $("btnBag").addEventListener("pointerdown", e => { e.preventDefault(); onGesture(); openBag(); });
  const skill = (id, fn, hold) => {
    const el = $(id);
    el.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); onGesture(); el.classList.add("down"); if (hold) IN.attackHeld = true; fn(); });
    const upH = () => { el.classList.remove("down"); if (hold) IN.attackHeld = false; };
    el.addEventListener("pointerup", upH); el.addEventListener("pointercancel", upH); el.addEventListener("pointerleave", upH);
  };
  skill("bAtk", attack, true); skill("bBub", bubbles); skill("bDash", dodge); skill("bPot", potion);
  $("nameInput").addEventListener("keydown", e => { if (e.key === "Enter") { e.target.blur(); } });
}
