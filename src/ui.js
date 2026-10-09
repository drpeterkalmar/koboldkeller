/* ui.js — Menüs, Charakter-Editor, HUD, Toasts, Rucksack (Talente), Ehrenhall, Tutorial, Boss-Karte (MIT) */
import { G, startGame, attack, bubbles, dodge, potion, special, wearHat, goTown, reviveInTown, finishTut, save, setLook, skillUp, skillReset, skillFull, specialDmg, SPECIAL_STYLE, lookForSave } from "./game.js";
import { SPECIES, NAMES, randomName, rollLook, lookKey, URLQ, HATS, weaponOf, VERSION, PLAYER, CAP, SKILLS, SKILL_MAX, HAIR_STYLES, ACCESSORIES, PAL, SAVE_V, makeLook, lookSave, levelName, BIOMES, MAGNET, AMMO, MYTHS, MYTH_BY_ID, MYTH_TIERS, mythHint, OMA } from "./config.js";
import { portrait, previewRig } from "./art.js";
import { loadSave, loadHall, loadSettings, saveSettings, sanitize } from "./save.js";
import { esc, pick, mulberry32 } from "./util.js";
import { SFX, setMusic, setSfx } from "./audio.js";
import { toggleFullscreen, canFullscreen, PF, hapticProbe, hapticButtons } from "./platform.js";
import { IN, resetInput } from "./input.js";
import { drawMini } from "./render.js";

const $ = id => document.getElementById(id);
export const UI = { settings: loadSettings(), back: "scrMenu", selLook: 0, miniT: 0, last: {}, ed: null, diceN: 0 };
// Würfel-Zufall: ?seed=N → reproduzierbar (Tests), sonst echter Zufall
const _seed = parseInt(URLQ.get("seed"), 10);
UI.rnd = isFinite(_seed) ? mulberry32(_seed) : Math.random;
const SCREENS = ["scrMenu", "scrCreate", "scrConfirm", "scrPause", "scrSet", "scrBag", "scrHall", "scrDead", "scrWin"];

export function show(id) {
  for (const s of SCREENS) $(s).classList.toggle("hidden", s !== id);
  const inGame = ["play", "pause", "bag", "dead", "win", "edit"].includes(G.screen);
  $("hud").classList.toggle("hidden", !(G.p && !G.demo && inGame));
}
export function hideScreens() { for (const s of SCREENS) $(s).classList.add("hidden"); $("hud").classList.toggle("hidden", !(G.p && !G.demo)); stopPreview(); }

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
export function banner(title, sub, kind = "", lvl = false) {
  const b = $("banner");
  $("bannerT").textContent = title; $("bannerS").textContent = sub || "";
  const k = (kind || "") + (lvl ? " lvl" : "");
  b.className = k; void b.offsetWidth; b.className = "show " + k;
  clearTimeout(UI._bn); UI._bn = setTimeout(() => b.className = "hidden", 2700);
  G.cardUntil = performance.now() + 2700;
}
/** große Boss-Titelkarte beim Erwachen */
export function bossIntro(e) {
  const c = $("bossCard");
  $("bcSmall").textContent = e.isMini ? "⚡ MINI-BOSS ⚡" : "⚠️ BOSS ⚠️";
  $("bcName").textContent = (e.isKing ? "👑🔥 " : e.isMini ? "⚡ " : "👑 ") + e.name;
  $("bcEpi").textContent = e.epi || "";
  c.className = ""; void c.offsetWidth; c.className = "show" + (e.isKing ? " king" : e.isMini ? " mini" : "");
  clearTimeout(UI._bc); UI._bc = setTimeout(() => c.className = "hidden", 2600);
  G.cardUntil = performance.now() + 2600;
}

// ---------- Blende ----------
/** warte (Technik E4): liefert optional ein Promise — die Blende bleibt zu, bis es erfüllt ist (Back-Worker, höchstens ~1,2 s) */
export function fade(cb, after, warte) {
  const f = $("fade");
  f.classList.add("on");
  setTimeout(() => {
    let w = null;
    try { cb(); after && after(); w = warte ? warte() : null; } finally {
      const auf = () => requestAnimationFrame(() => f.classList.remove("on"));
      if (w && w.then) w.then(auf, auf); else auf();
    }
  }, 230);
}

// ---------- Einstellungen ----------
function settingsHtml(box) {
  const s = UI.settings;
  const rows = [["music", "🎵 Musik"], ["sfx", "🔔 Töne"], ["vibrate", "📳 Vibration"], ["arrow", "🧭 Weg-Pfeil"], ["joystick", "🕹️ Daumen-Joystick (links unten)"]];
  box.innerHTML = rows.map(([k, t]) => '<div class="set" data-k="' + k + '"><span>' + t + '</span><span class="sw' + (s[k] ? " on" : "") + '"></span></div>').join("") +
    '<button class="btn ghost hapTest" id="btnHapTest">📳 Vibration testen</button><p class="hint hapHint hidden">Nichts gespürt? In den Handy-Einstellungen Vibration/Berührungsfeedback einschalten ' +
    '(und Lautlos-/Energiesparmodus aus). Am iPhone gibt es Vibration nur beim Antippen von Knöpfen.</p>';
  box.querySelectorAll(".set").forEach(el => el.addEventListener("click", () => {
    const k = el.dataset.k; s[k] = !s[k];
    el.querySelector(".sw").classList.toggle("on", s[k]);
    applySettings(); saveSettings(s); SFX.click();
    if (k === "vibrate" && s[k]) hapticProbe();          // sofort fühlbare Rückmeldung
  }));
  const ht = box.querySelector("#btnHapTest");
  ht.addEventListener("click", () => {
    SFX.click();
    if (!s.vibrate) { s.vibrate = true; saveSettings(s); applySettings(); const sw = box.querySelector('[data-k="vibrate"] .sw'); if (sw) sw.classList.add("on"); }
    hapticProbe(); UI.hapTests = (UI.hapTests || 0) + 1;
    box.querySelector(".hapHint").classList.remove("hidden");   // Hinweis, falls nichts zu spüren war
  });
  hapticButtons(box);
}
export function applySettings() {
  const s = UI.settings;
  setMusic(s.music); setSfx(s.sfx); PF.vibrate = s.vibrate; IN.joyOn = s.joystick; G.arrowOn = s.arrow;
  document.body.classList.toggle("noHap", !s.vibrate);
}

// ---------- Startmenü ----------
export function showMenu() {
  G.screen = "menu";
  stopPreview();
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

// =====================================================================
// Charakter-Editor (beim Erstellen UND später am Spiegel in der Stadt)
// =====================================================================
const TABS = [
  ["tier", "🐾 Tier"], ["myth", "🦄 Kostüme"], ["fell", "🎨 Fell"], ["frisur", "💇 Frisur"], ["augen", "👀 Augen"], ["outfit", "👕 Outfit"], ["ohren", "👂 Ohren"], ["extra", "🎀 Extras"],
];
function openEditor(mode) {
  const cur = mode === "edit" && G.p ? lookSave(G.p.look) : lookSave(makeLook({ species: SPECIES[UI.selLook].id }));
  UI.ed = { mode, look: cur, tab: "tier", t: 0 };
  $("editTitle").textContent = mode === "edit" ? "🪞 Spiegel & Friseur" : "Wähle deinen Kobold";
  $("createOnly").classList.toggle("hidden", mode === "edit");
  $("btnEditOk").classList.toggle("hidden", mode !== "edit");
  $("btnLookDice").classList.toggle("hidden", mode !== "edit");
  $("btnDice").setAttribute("aria-label", mode === "edit" ? "Zufallsname" : "Zufallsname und Zufallslook");
  $("nameInput").value = mode === "edit" && G.p ? G.p.name : randomName(UI.rnd);
  if (mode !== "edit") $("megaNew").checked = false;
  renderTabs(); renderEditBody();
  show("scrCreate");
  startPreview();
}
function edLook() { return makeLook(UI.ed.look); }
/** 🎲 Würfeln: neuer hübscher Look (Harmonie-Tabelle, nie direkt derselbe) + bei withName auch ein neuer Name */
function rollDice(withName) {
  const ed = UI.ed; if (!ed) return;
  ed.look = rollLook(UI.rnd, lookKey(makeLook(ed.look)), G.myth.have);          // v9: ≈ 30 % mit einem freigeschalteten Kostüm
  if (withName) $("nameInput").value = randomName(UI.rnd);
  UI.selLook = Math.max(0, SPECIES.findIndex(s => s.id === ed.look.species));
  ed.dice = ed.t; UI.diceN++;
  SFX.pickup();
  renderEditBody();
}
function renderTabs() {
  const box = $("editTabs");
  box.innerHTML = TABS.map(([k, t]) => '<button class="tab' + (UI.ed.tab === k ? " on" : "") + '" data-t="' + k + '">' + t + "</button>").join("");
  box.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => { UI.ed.tab = b.dataset.t; SFX.click(); renderTabs(); renderEditBody(); }));
}
function swatches(list, cur, key, extra) {
  const all = extra && !list.includes(extra) ? [extra, ...list] : list;
  return '<div class="sws">' + all.map(c => '<button class="swc' + (c === cur ? " on" : "") + '" data-k="' + key + '" data-v="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>').join("") + "</div>";
}
function optGrid(items) {   // items: [{key, val, label, look}]
  return '<div class="opts">' + items.map((it, i) => '<button class="opt' + (it.on ? " on" : "") + '" data-k="' + it.key + '" data-v="' + it.val + '" data-i="' + i + '"><canvas></canvas><span>' + esc(it.label) + "</span></button>").join("") + "</div>";
}
function renderEditBody() {
  const ed = UI.ed, L = edLook(), sp = SPECIES.find(s => s.id === L.species);
  const looks = $("looks"), opts = $("editOpts");
  looks.classList.toggle("hidden", ed.tab !== "tier");
  if (ed.tab === "tier") {
    if (!looks.children.length) {
      SPECIES.forEach((s, i) => {
        const d = document.createElement("div");
        d.className = "look";
        const cv = document.createElement("canvas");
        portrait(cv, makeLook({ species: s.id }), null, 84);
        d.appendChild(cv);
        const n = document.createElement("div"); n.className = "nm"; n.textContent = s.name; d.appendChild(n);
        d.addEventListener("click", () => {
          UI.selLook = i; SFX.click();
          const acc = UI.ed.look.acc;
          UI.ed.look = lookSave(makeLook({ species: s.id, acc }));
          [...looks.children].forEach((c, j) => { c.classList.toggle("sel", j === i); });
          d.classList.remove("sel"); void d.offsetWidth; d.classList.add("sel");
        });
        looks.appendChild(d);
      });
    }
    const si = SPECIES.findIndex(s => s.id === L.species);
    [...looks.children].forEach((c, j) => c.classList.toggle("sel", j === si));
    opts.innerHTML = "";
    return;
  }
  let h = "", items = null;
  switch (ed.tab) {
    case "fell": h = "<p class='hint'>Fellfarbe</p>" + swatches(PAL.fur, L.skin, "skin", sp.skin); break;
    case "augen": h = "<p class='hint'>Augenfarbe</p>" + swatches(PAL.eye, L.eye, "eye", sp.eye); break;
    case "outfit": h = "<p class='hint'>Outfit-Farbe</p>" + swatches(PAL.outfit, L.outfit, "outfit", sp.outfit); break;
    case "frisur":
      items = HAIR_STYLES.map(hs => ({ key: "style", val: hs.id, label: hs.name, on: L.style === hs.id, look: makeLook({ ...ed.look, style: hs.id }) }));
      h = optGrid(items) + "<p class='hint'>Haarfarbe</p>" + swatches(PAL.hair, L.hair, "hair", sp.hair);
      break;
    case "ohren":
      items = [0, 1].map(v => ({ key: "earsV", val: v, label: sp.earsN[v], on: L.earsV === v, look: makeLook({ ...ed.look, earsV: v }) }));
      h = optGrid(items); break;
    case "extra":
      items = ACCESSORIES.map(a => ({ key: "acc", val: a.id, label: a.name, on: L.acc === a.id, look: makeLook({ ...ed.look, acc: a.id }) }));
      h = optGrid(items); break;
    case "myth": {   // v9: Kostüm-Raster (Porträts, Stufen-Rahmen, gesperrte als Silhouette mit Hinweis), Zähler, „🎩 Hut statt Kopfteil“
      const have = G.myth.have, got = MYTHS.filter(m => G.myth.real.includes(m.id)).length;
      items = [{ key: "myth", val: "", label: "Ohne Kostüm", on: !L.myth, look: makeLook({ ...ed.look, myth: "" }) },
        ...MYTHS.map(M => ({ key: "myth", val: M.id, label: M.name, on: L.myth === M.id, look: makeLook({ ...ed.look, myth: M.id, mhat: false }), locked: !have.includes(M.id), tier: M.tier, hint: mythHint(M), emoji: M.emoji }))];
      const hatId = ed.mode === "edit" && G.p ? G.p.hat : null;
      h = '<p class="mythCount" id="mythCount">🦄 <b>' + got + " / " + MYTHS.length + "</b> gesammelt" + (G.myth.view ? ' <span class="mythView">Ansicht: alle Kostüme (wird nicht gespeichert)</span>' : "") + "</p>" +
        '<div class="opts mythGrid">' + items.map((it, i) => '<button class="opt myth' + (it.on ? " on" : "") + (it.tier ? " tier-" + it.tier : "") + (it.locked ? " locked" : "") + '" data-k="myth" data-v="' + it.val + '" data-i="' + i + '"' + (it.locked ? ' data-lock="1"' : "") + '><canvas></canvas>' +
          (it.tier ? '<i class="tierTag">' + MYTH_TIERS[it.tier].name + "</i>" : "") + (it.locked ? '<i class="lockTag">🔒</i>' : "") +
          "<span>" + shy(esc(it.locked ? it.hint : it.label)) + "</span></button>").join("") + "</div>" +
        (L.myth ? '<div class="set mhatRow' + (hatId ? "" : " off") + '" id="mhatRow"><span>🎩 Hut statt Kopfteil' + (hatId ? "" : " <small>(noch kein Hut)</small>") + '</span><span class="sw' + (L.mhat ? " on" : "") + '"></span></div>' : "");
      opts.innerHTML = h;
      opts.querySelectorAll(".opt canvas").forEach((cv, i) => { portrait(cv, items[i].look, null, 64); if (items[i].locked) silhouette(cv); });
      opts.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => {
        if (b.dataset.lock) { SFX.empty(); toast("🔒 " + items[+b.dataset.i].hint + " — dann gehört dir " + items[+b.dataset.i].label + "!"); return; }
        UI.ed.look = lookSave(makeLook({ ...UI.ed.look, myth: b.dataset.v, mhat: false }));
        SFX.click(); renderEditBody();
      }));
      const mr = $("mhatRow");
      if (mr) mr.addEventListener("click", () => { if (!hatId) { SFX.empty(); toast("🎩 Bosse lassen Hüte fallen — dann kannst du hier umschalten."); return; } UI.ed.look = lookSave(makeLook({ ...UI.ed.look, mhat: !L.mhat })); SFX.click(); renderEditBody(); });
      return;
    }
  }
  opts.innerHTML = h;
  if (items) opts.querySelectorAll(".opt canvas").forEach((cv, i) => portrait(cv, items[i].look, null, 64));
  opts.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.k, v = k === "earsV" ? +b.dataset.v : b.dataset.v;
    UI.ed.look = lookSave(makeLook({ ...UI.ed.look, [k]: v }));
    SFX.click(); renderEditBody();
  }));
}
/** weiche Trennstellen für lange Wörter in den kleinen Kostüm-Feldern (statt „Sternenzaub|erer“) */
const SHY = [["Sternenzauberer", "Sternen\u00adzauberer"], ["Kristallritter", "Kristall\u00adritter"], ["Zuckerschnute", "Zucker\u00adschnute"], ["Funkelflatter", "Funkel\u00adflatter"],
  ["MEGASCHWER", "MEGA\u00adSCHWER"], ["Glutpanzer", "Glut\u00adpanzer"], ["Kellerkönig", "Keller\u00adkönig"], ["Vulkan-Golem", "Vulkan-\u200bGolem"], ["Bonbon-Nixe", "Bonbon-\u200bNixe"]];
const shy = t => SHY.reduce((a, [w, r]) => a.split(w).join(r), t);
/** gesperrtes Kostüm: dunkle Silhouette (Form erkennbar, Farben nicht) */
function silhouette(cv) {
  const c = cv.getContext("2d"); c.save(); c.globalCompositeOperation = "source-atop"; c.fillStyle = "rgba(24,12,40,.9)"; c.fillRect(0, 0, cv.width, cv.height); c.restore();
}
// ---------- v9: Fund-Moment (Kostüm-Paket aufgehoben) — Toast mit „Anziehen“, Spiel läuft weiter, oben (verdeckt keine Steuerung) ----------
export function mythFound(id, auto) {
  const M = MYTH_BY_ID[id]; if (!M) return;
  const box = $("toasts"), el = document.createElement("div");
  el.className = "toast mythToast tier-" + M.tier;
  el.innerHTML = '<span class="mtE">' + M.emoji + '</span><span class="mtT">Neues Kostüm: <b>' + esc(M.name) + "</b>!<small>" + MYTH_TIERS[M.tier].name + (M.tier === "mythisch" ? " ✨" : "") + '</small></span><button class="mtBtn" type="button">Anziehen</button>';
  el.querySelector(".mtBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (G.p) setLook({ ...lookForSave(G.p.look), myth: id, mhat: false });
    SFX.pickup(); el.remove(); toast("✨ " + M.name + " angezogen! Ändern kannst du es am 🪞 Spiegel.");
  });
  box.appendChild(el); UI.mythToasts = (UI.mythToasts || 0) + 1;
  hapticButtons(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 380); }, auto ? 9000 : 7000);
}
function startPreview() {
  stopPreview();
  const cv = $("editPrev");
  const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
  cv.width = Math.round((r.width || 160) * dpr); cv.height = Math.round((r.height || 170) * dpr);
  let last = performance.now();
  const loop = (now) => {
    if (!UI.ed) return;
    const ed = UI.ed;
    ed.t += Math.min(0.05, (now - last) / 1000); last = now;
    const dk = ed.dice !== undefined ? (ed.t - ed.dice) / 0.62 : 9;      // Würfel-Animation: Hüpfer + Doppeldreher + Funkeln
    previewRig(cv, edLook(), ed.mode === "edit" && G.p ? G.p.hat : null, ed.t, dk < 1 ? dk : -1);
    if (dk < 1.4) diceSparkle(cv, dk);
    UI._pv = requestAnimationFrame(loop);
  };
  UI._pv = requestAnimationFrame(loop);
}
function diceSparkle(cv, k) {
  const c = cv.getContext("2d"), W = cv.width, H = cv.height, a = Math.max(0, 1 - Math.max(0, k - 0.4) / 1.0);
  c.save(); c.globalAlpha = a;
  for (let i = 0; i < 9; i++) {
    const ang = i / 9 * Math.PI * 2 + k * 2.2, r = (0.18 + 0.2 * Math.min(1, k * 1.6)) * H, x = W / 2 + Math.cos(ang) * r * 1.15, y = H * 0.55 + Math.sin(ang) * r * 0.8;
    const s = H * (0.028 + 0.014 * Math.sin(k * 14 + i));
    c.fillStyle = i % 3 ? "#fff6b0" : "#ffffff";
    c.beginPath(); c.moveTo(x, y - s * 2); c.quadraticCurveTo(x, y, x + s * 2, y); c.quadraticCurveTo(x, y, x, y + s * 2); c.quadraticCurveTo(x, y, x - s * 2, y); c.quadraticCurveTo(x, y, x, y - s * 2); c.fill();
  }
  c.restore();
}
function stopPreview() { if (UI._pv) cancelAnimationFrame(UI._pv); UI._pv = 0; }
export function openMirror() {
  if (G.screen !== "play" || G.demo) return;
  G.screen = "edit"; resetInput();
  openEditor("edit"); SFX.pickup();
}
function closeMirror(apply) {
  if (apply && UI.ed) {
    setLook(UI.ed.look);
    const nm = ($("nameInput").value || "").trim().slice(0, 12);
    if (nm && G.p) G.p.name = nm;
    save();
    toast("🪞 Schick! So siehst du jetzt aus.");
  }
  UI.ed = null; stopPreview();
  G.screen = "play"; hideScreens();
}
function newProfile() {
  const name = ($("nameInput").value || "").trim().slice(0, 12) || randomName(UI.rnd);
  const look = UI.ed ? UI.ed.look : lookSave(makeLook({ species: SPECIES[UI.selLook].id }));
  return sanitize({
    v: SAVE_V, name, species: look.species, look, lvl: 1, xp: 0, xpNext: 10, maxHp: PLAYER.hp, hp: PLAYER.hp,
    atk: PLAYER.atk, projN: 1, magic: 1, gold: 0, potions: PLAYER.potions, ammo: AMMO.start, spec: 0, hats: [], hat: null,
    deepest: 1, depth: 0, mega: $("megaNew").checked, tut: false, seed: (Math.random() * 2 ** 31) | 0,
  });
}
function begin(prof) {
  G.demo = false;
  UI.ed = null; stopPreview();
  resetInput();
  fade(() => { startGame(prof); hideScreens(); G.screen = "play"; });
}

// ---------- Pause / Rucksack ----------
export function openPause() {
  if (G.screen !== "play") { if (G.screen === "pause") resume(); else if (G.screen === "bag") closeBag(); return; }
  G.screen = "pause"; resetInput();
  $("btnTown").classList.toggle("hidden", G.depth === 0);
  $("btnFull2").classList.toggle("hidden", !canFullscreen());
  $("pauseWhere").textContent = G.depth === 0 ? "🏠 Koboldstadt" : "🪜 Ebene " + G.depth + " · " + levelName(G.depth);
  settingsHtml($("setBox"));
  show("scrPause"); SFX.click();
}
export function resume() { G.screen = "play"; hideScreens(); save(); }
export function openBag(focus) {
  if (G.screen === "bag") { closeBag(); return; }
  if (G.screen !== "play") return;
  G.screen = "bag"; resetInput();
  renderBag(); show("scrBag"); SFX.click();
  if (focus === "skills") { const el = $("skillBox"); if (el) el.scrollIntoView({ block: "start" }); }
}
function closeBag() { G.screen = "play"; hideScreens(); }
const f1 = n => (Math.round(n * 10) / 10).toString().replace(".", ",");
function skillNow(id, p) {
  switch (id) {
    case "kraft": return "⚔️ " + f1(p.atk);
    case "leben": return "❤️ " + p.maxHp + (p.maxHp >= CAP.hp ? " (voll)" : "");
    case "tempo": return "👟 " + Math.round(p.spdMul * 100) + " %";
    case "blasen": return "🫧 " + p.ammoMax + " Platz";
    case "magnet": return "🧲 " + f1(MAGNET.coin + p.magBonus) + " Kacheln";
  }
  return "";
}
function renderBag() {
  const p = G.p, w = weaponOf(p.atk);
  const town = G.depth === 0;
  let h = '<div class="bagGrid">' +
    '<div class="stat">⭐ Level<b>' + p.lvl + '</b></div>' +
    '<div class="stat">❤️ Herzen<b>' + Math.ceil(p.hp) + " / " + p.maxHp + (p.maxHp >= CAP.hp ? " <small>voll</small>" : "") + '</b></div>' +
    '<div class="stat">⚔️ ' + esc(w.name) + '<b>Schaden ' + f1(p.atk) + '</b></div>' +
    '<div class="stat">🫧 Seifenblasen<b>' + p.projN + "× · Kraft " + f1((1 + p.magic + p.atk * 0.25) * p.bubMul) + '</b></div>' +
    '<div class="stat">🫧 Munition<b>' + p.ammo + " / " + p.ammoMax + (p.ammo >= p.ammoMax ? " <small>voll</small>" : "") + '</b></div>' +
    '<div class="stat">🧪 Tränke<b>' + p.potions + " / " + CAP.potions + (p.potions >= CAP.potions ? " <small>voll</small>" : "") + '</b></div>' +
    '<div class="stat">✨ Spezial (' + esc((SPECIAL_STYLE[p.species] || SPECIAL_STYLE.kobold).name) + ')<b>' + (p.spec >= 1 ? "BEREIT!" : Math.round(p.spec * 3) + " / 3 🍄") + '</b></div>' +
    '<div class="stat">🪙 Glitzermünzen<b>' + G.gold + '</b></div></div>';
  const stats = h; h = "";
  // Talente (stehen oben, solange Punkte frei sind)
  h += '<div id="skillBox"><h2 class="sub">⭐ Talente ' + (p.skPts > 0 ? '<span class="pts">' + p.skPts + " Punkt" + (p.skPts === 1 ? "" : "e") + " frei!</span>" : "") + "</h2>";
  for (const s of SKILLS) {
    const n = p.sk[s.id], full = skillFull(s.id), can = p.skPts > 0 && !full;
    h += '<div class="skRow"><div class="skIc">' + s.icon + '</div><div class="skMid"><div class="skName">' + esc(s.name) + ' <span class="skNow">' + skillNow(s.id, p) + '</span></div>' +
      '<div class="pips">' + Array.from({ length: SKILL_MAX }, (_, i) => '<i class="' + (i < n ? "on" : "") + '"></i>').join("") + '</div>' +
      '<div class="skWhat">' + (full ? "✅ voll ausgebaut" : "Nächster Punkt: " + esc(s.what)) + '</div></div>' +
      '<button class="skPlus" data-s="' + s.id + '"' + (can ? "" : " disabled") + ' aria-label="' + esc(s.name) + ' erhöhen">+</button></div>';
  }
  const spent = SKILLS.reduce((a, s) => a + p.sk[s.id], 0);
  if (spent > 0) h += town ? '<button class="btn ghost" id="btnRespec">↩️ Punkte neu verteilen (kostenlos)</button>' : "<p class='hint'>↩️ Neu verteilen kannst du in der Stadt.</p>";
  h += "</div>";
  h = p.skPts > 0 ? h + stats : stats + h;
  if (town) h += '<button class="btn pink" id="btnMirror">🪞 Aussehen ändern</button>';
  h += "<h2 class='sub'>🎩 Hüte</h2>";
  if (!p.hats.length) h += "<p style='opacity:.75;font-size:14px'>Noch keine Hüte — Bosse lassen welche fallen!</p>";
  else {
    h += '<div class="hats"><button class="hatBtn' + (!p.hat ? " on" : "") + '" data-h=""><span class="e">🙂</span>Ohne</button>';
    for (const k of p.hats) h += '<button class="hatBtn' + (p.hat === k ? " on" : "") + '" data-h="' + k + '"><span class="e">' + HATS[k].emoji + "</span>" + esc(HATS[k].name) + "</button>";
    h += "</div>";
  }
  h += "<p style='font-size:13px;opacity:.7'>🍄 Glitzerpilze laden den ✨ Spezialangriff (" + f1(specialDmg(p)) + " Schaden rundherum) · Besiegte Gegner: " + G.stats.kills + "</p>";
  $("bagBody").innerHTML = h;
  $("bagBody").querySelectorAll(".skPlus").forEach(b => b.addEventListener("click", () => { if (skillUp(b.dataset.s)) { renderBag(); } else SFX.click(); }));
  const rs = $("btnRespec"); if (rs) rs.addEventListener("click", () => { const n = skillReset(); SFX.pickup(); toast("↩️ " + n + " Punkte zurück — verteil sie neu!"); renderBag(); });
  const mi = $("btnMirror"); if (mi) mi.addEventListener("click", () => { SFX.click(); G.screen = "play"; openMirror(); });
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
    if (G.screen !== "win") return;                      // schon weitergespielt → Karte nicht nachträglich zeigen
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
  () => "Super! Jetzt hau die Strohwichtel mit ⚔️ — dein Rundumschlag trifft ALLES rund um dich! Jeder besiegte Gegner gibt dir 🫧-Blasen.",
  () => "Klasse! Drück 🫧 — die Seifenblasen fliegen von selbst zum Gegner. Jeder Schuss kostet 1 🫧 — oben links siehst du, wie viele du noch hast!",
  () => "Mit 💨 springst du blitzschnell weg vom Gegner. Probier's aus!",
  () => "Hier, 3 Glitzerpilze von mir! 🍄 Pilze füllen deine Spezial-Leiste. Ist sie voll, leuchtet ✨ — drück drauf!",
  () => "Perfekt! 💧 Der Brunnen heilt dich. Beim Level-Aufstieg gibt's ⭐ Talentpunkte — tipp dann oben links auf dein ⭐ (oder oben rechts auf den 🎒 Rucksack) und verteil sie. Folge dem 🌿 grünen Weg zum Welttor — das 🌀 Portal 1 bringt dich in den Keller. Viel Glück!",
];
const TIPS = [
  "Halte ⚔️ gedrückt — dann schlägst du immer weiter!",
  "Keine 🫧 mehr? Hau Gegner mit ⚔️ — jeder gibt dir neue Blasen!",
  "🍄 Glitzerpilze heilen nicht — sie laden deinen ✨ Spezialangriff!",
  "Rote Kreise und Streifen am Boden? Schnell mit 💨 raus!",
  "Beim Level-Aufstieg gibt's ⭐ Talentpunkte — tipp oben links auf dein ⭐ oder oben rechts auf 🎒, dann stehen die Talente ganz oben!",
  "Im 🪞 Spiegel vor dem Haus kannst du dein Aussehen ändern.",
  "❤️ Herzen und 🧪 Tränke heilen dich. Mehr als " + CAP.potions + " Tränke passen nicht in den Rucksack.",
  "Truhen gehen auf, wenn du drüberläufst. ✨",
  "Mein Brunnen füllt deine Tränke wieder auf 3 auf. 💧",
  "Bosse lassen schicke Hüte fallen — und werden wütend, wenn sie wenig ❤️ haben!",
  "Jeder bunte Weg führt zu einem Welttor. Dort wartet für jede Ebene, die du schon erreicht hast, ein eigenes 🌀 Portal!",
  "👑 auf einem Portal heißt: Dort wohnt ein Boss. ⚡ heißt: ein Mini-Boss.",
  "Steingesichter in der Wand pusten ab und zu etwas quer durch den Gang. Leuchten sie, schnell zur Seite — oder mit 💨 durch!",
  "Das 🏠-Portal im Keller taucht erst nach ein paar Sekunden auf.",
  "Jede zweite Ebene hat einen Boss! Die Treppe dort ist versiegelt 🔒, bis du ihn besiegt hast.",
  "In der Boss-Arena kommen Handlanger — lila Kreise am Boden zeigen, wo gleich einer auftaucht.",
];
// v10: Was sagt Oma? Zuerst, was gerade wirklich hilft (je Anlass höchstens alle 90 s), sonst der nächste allgemeine Tipp.
function omaTip() {
  const p = G.p, S = (G.omaSeen = G.omaSeen || {});
  const now = [
    ["talent", p.skPts > 0, () => "Du hast " + p.skPts + " ⭐ Talentpunkt" + (p.skPts === 1 ? "" : "e") + " frei! Tipp oben links auf dein ⭐ (da, wo das rosa +" + p.skPts + " blinkt) oder oben rechts auf 🎒 — die Talente stehen ganz oben. Tipp ein Talent an, schon ist der Punkt verteilt!"],
    ["heal", p.hp < p.maxHp * 0.6, () => "Du bist ja verletzt! Mein 💧 Brunnen heilt dich."],
    ["potion", p.potions < 3, () => "Nur noch " + p.potions + " 🧪? Mein 💧 Brunnen füllt deine Tränke wieder auf 3 auf."],
    ["ammo", p.ammo < 5, () => "Kaum noch 🫧? Hau Gegner mit ⚔️ — jeder gibt dir neue Blasen!"],
  ];
  for (const [k, on, txt] of now) if (on && G.t - (S[k] ?? -1e9) >= 90) { S[k] = G.t; return txt(); }
  UI.tip = ((UI.tip ?? -1) + 1) % TIPS.length;
  return TIPS[UI.tip];
}
export function showTut(step) {
  if (step === "tap" || step === "near") {                 // Oma angetippt bzw. v10: im Vorbeigehen
    if (G.tutStep >= 0) { if (step === "tap") $("tut").classList.remove("hidden"); return; }
    const text = omaTip();
    G.omaSay = { text, t0: G.t, dur: Math.min(OMA.showMax, Math.max(OMA.show, 2.5 + text.length / 20)) };
    G.omaTipT = G.t;                                        // Antippen zählt mit: beim Hinlaufen nicht gleich den nächsten Tipp
    SFX.click(); return;
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
  if (e) {
    const mini = !!e.isMini;
    $("bossName").textContent = (e.isKing ? "👑🔥 " : mini ? "⚡ Mini-Boss " : "👑 ") + e.name;
    $("bossPhase").textContent = mini ? (e.phase >= 2 ? "⚡ WILD · 2 / 2" : "Phase 1 / 2") : e.phase >= 3 ? "🔥 WUT-PHASE · 3 / 3" : "Phase " + e.phase + " / 3";
    $("bossBar").classList.toggle("rage", e.phase >= 3);
    $("bossBar").classList.toggle("mini", mini);
    $("bossTick1").style.left = mini ? "50%" : "33%"; $("bossTick2").classList.toggle("hidden", mini);
    $("tut").classList.add("hidden"); document.body.classList.remove("tutOn");
  }
}

// ---------- HUD (nur bei Änderung schreiben) ----------
function setTxt(id, v) { if (UI.last[id] !== v) { UI.last[id] = v; $(id).textContent = v; return true; } return false; }
function setW(id, v) { v = Math.round(v * 1000) / 10; if (UI.last[id] !== v) { UI.last[id] = v; $(id).style.width = v + "%"; } }
function setCd(el, key, v) { v = Math.round(v * 50) / 50; if (UI.last[key] !== v) { if (v === 0 && UI.last[key] > 0) { el.classList.remove("ready"); void el.offsetWidth; el.classList.add("ready"); } UI.last[key] = v; el.style.setProperty("--cd", v); } }
function setCls(el, key, cls, on) { if (UI.last[key] !== on) { UI.last[key] = on; el.classList.toggle(cls, on); } }
export function hud(dt) {
  const p = G.p;
  if (!p || G.demo) return;
  const hp = Math.max(0, Math.ceil(p.hp));
  if (UI.last.hpv !== undefined && hp < UI.last.hpv) { const h = $("hpHeart"); h.classList.remove("beat"); void h.offsetWidth; h.classList.add("beat"); }
  UI.last.hpv = hp;
  setW("hpFill", Math.max(0, p.hp) / p.maxHp);
  setTxt("hpTxt", hp + " / " + p.maxHp + (p.maxHp >= CAP.hp && hp >= p.maxHp ? " · voll" : ""));
  setW("xpFill", p.xp / p.xpNext);
  setTxt("lvlBadge", "⭐ " + p.lvl);
  setCls($("skPill"), "skp", "hidden", !(p.skPts > 0));
  if (p.skPts > 0) setTxt("skPill", "+" + p.skPts);
  // Munition
  setW("ammoFill", p.ammo / p.ammoMax);
  setTxt("ammoTxt", p.ammo >= p.ammoMax ? p.ammo + " · VOLL" : p.ammo + " / " + p.ammoMax);
  if (setTxt("ammoCnt", String(p.ammo)) && UI.last.ammoPrev !== undefined && p.ammo > UI.last.ammoPrev) { const c = $("ammoRow"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
  UI.last.ammoPrev = p.ammo;
  setCls($("bBub"), "bEmpty", "empty", p.ammo <= 0);
  setCls($("ammoRow"), "aEmpty", "empty", p.ammo <= 0);
  setCls($("bBub"), "bShake", "shake", G.emptyT > 0);
  // Spezial
  setW("specFill", p.spec);
  const full = p.spec >= 1;
  setTxt("specTxt", full ? "✨ BEREIT!" : Math.round(p.spec * 3) + " / 3");
  setCls($("bSpec"), "sFull", "full", full);
  setCls($("specRow"), "sRow", "full", full);
  const sf = Math.round(p.spec * 50) / 50; if (UI.last.sf !== sf) { UI.last.sf = sf; $("bSpec").style.setProperty("--fill", sf); }
  if (setTxt("goldChip", "🪙 " + G.gold)) { const c = $("goldChip"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
  setTxt("depthChip", G.depth === 0 ? "🏠 Stadt" : "🪜 Ebene " + G.depth);
  setTxt("mapName", levelName(G.depth));
  if (UI.last.mega !== G.mega) { UI.last.mega = G.mega; $("megaChip").classList.toggle("hidden", !G.mega); }
  setTxt("potCnt", String(p.potions));
  setCd($("bAtk"), "cdA", p.atkCd / PLAYER.atkCd);
  setCd($("bBub"), "cdB", p.ammo > 0 ? p.bubCd / PLAYER.bubbleCd : 0);
  setCd($("bDash"), "cdD", p.dashCd / (PLAYER.dashCd / p.spdMul));
  if (UI.boss) {
    const f = Math.max(0, UI.boss.hp) / UI.boss.maxHp;
    setW("bossFill", f);
    UI.ghost = UI.ghost === undefined || UI.ghost < f ? f : Math.max(f, UI.ghost - dt * 0.25);
    setW("bossGhost", UI.ghost);
    if (UI.last.bph !== UI.boss.phase) { UI.last.bph = UI.boss.phase; showBoss(UI.boss); }
  }
  UI.miniT -= dt;
  if (UI.miniT <= 0) { UI.miniT = 0.25; drawMini($("mini"), G); }
}
export function flashSaved() { const c = $("saveChip"); c.classList.add("on"); clearTimeout(UI._sv); UI._sv = setTimeout(() => c.classList.remove("on"), 900); }

// ---------- Verdrahtung ----------
export function initUI(onGesture) {
  applySettings();
  const tap = (id, fn) => $(id).addEventListener("click", e => { onGesture(); SFX.click(); fn(e); });
  tap("btnCont", () => { const sv = loadSave(); if (!sv) return showMenu(); sv.mega = $("megaCont").checked; begin(sv); });
  tap("btnNew", () => { const sv = loadSave(); if (sv) { $("confirmText").textContent = "Dein Kobold „" + sv.name + "“ (⭐ " + sv.lvl + ", 🪙 " + sv.gold + ") wird ersetzt. Die Ehrenhall bleibt!"; show("scrConfirm"); } else { G.screen = "create"; openEditor("create"); } });
  tap("btnYes", () => { G.screen = "create"; openEditor("create"); });
  tap("btnNo", () => showMenu());
  tap("btnDice", () => { if (UI.ed && UI.ed.mode !== "edit") rollDice(true); else $("nameInput").value = randomName(UI.rnd); });
  tap("btnLookDice", () => rollDice(false));
  tap("btnGo", () => begin(newProfile()));
  tap("btnEditOk", () => closeMirror(true));
  tap("btnBack1", () => { if (UI.ed && UI.ed.mode === "edit") closeMirror(false); else { UI.ed = null; showMenu(); } });
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
  $("lvlBadge").addEventListener("pointerdown", e => { e.preventDefault(); onGesture(); openBag("skills"); });
  const skill = (id, fn, hold) => {
    const el = $(id);
    el.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); onGesture(); el.classList.add("down"); if (hold) IN.attackHeld = true; fn(); });
    const upH = () => { el.classList.remove("down"); if (hold) IN.attackHeld = false; };
    el.addEventListener("pointerup", upH); el.addEventListener("pointercancel", upH); el.addEventListener("pointerleave", upH);
  };
  skill("bAtk", attack, true); skill("bBub", bubbles); skill("bDash", dodge); skill("bPot", potion); skill("bSpec", special);
  $("nameInput").addEventListener("keydown", e => { if (e.key === "Enter") { e.target.blur(); } });
  hapticButtons(document);                                 // iPhone ab iOS 26.5: Haptik nur beim echten Antippen von Knöpfen
}
