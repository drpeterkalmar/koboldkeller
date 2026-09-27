/* save.js — Spielstand, v20-Migration, Ehrenhall, Einstellungen (MIT) */
import { SAVE_KEY, OLD_SAVE_KEY, HALL_KEY, SETTINGS_KEY, SPECIES, OLD_SPECIES_MAP, MAX_DEPTH, HATS, SAVE_V, CAP, CAP_GOLD, AMMO, SKILLS, SKILL_MAX, SPECIAL, makeLook, lookSave, bossKindOf } from "./config.js";

const num = (v, d, lo = -Infinity, hi = Infinity) => (typeof v === "number" && isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;
const str = (v, d, max = 14) => typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d;
function readJson(key) {
  try { const r = localStorage.getItem(key); if (!r) return null; const o = JSON.parse(r); return o && typeof o === "object" ? o : null; }
  catch (e) { return null; }
}
function writeJson(key, o) { try { localStorage.setItem(key, JSON.stringify(o)); return true; } catch (e) { return false; } }

/** normalisiert einen Spielstand — alles Unbekannte wird sicher ersetzt.
    Spielstände vor v4 (v < 2, auch aus der v20-Migration) werden umgerechnet: Pilze → Spezial-Ladung,
    Überzähliges über den Obergrenzen → Gold (capNote), bisherige Level → Talentpunkte als Willkommensgeschenk.
    v5 (Datei v3): bossDone = Boss-Ebenen, deren Boss schon besiegt ist (Treppe dort offen). Ältere Stände: jede Boss-Ebene
    oberhalb der tiefsten erreichten Ebene gilt als geschafft (war schon passiert) — nichts wird nachträglich gesperrt. */
export function sanitize(s) {
  if (!s || typeof s !== "object") return null;
  const fileV = num(s.v, 1) | 0;
  const old = fileV < 2;                                   // vor v4: Munition/Talente/Spezial umrechnen
  const species = SPECIES.some(x => x.id === s.species) ? s.species : "kobold";
  const lvl = Math.round(num(s.lvl, 1, 1, 99));
  const hats = Array.isArray(s.hats) ? s.hats.filter(h => typeof h === "string" && HATS[h]).slice(0, 12) : [];
  let gold = Math.round(num(s.gold, 0, 0, 1e9)), capGold = 0;
  // Max-❤️ (Grundwert ohne Talente)
  let maxHp = Math.round(num(s.maxHp, 6 + (lvl - 1), 1, 400));
  if (maxHp > CAP.hp) { capGold += (maxHp - CAP.hp) * CAP_GOLD.hp; maxHp = CAP.hp; }
  let potions = Math.round(num(s.potions, 3, 0, 99));
  if (potions > CAP.potions) { capGold += (potions - CAP.potions) * CAP_GOLD.potion; potions = CAP.potions; }
  // Talente
  const sk = {}; let spent = 0;
  for (const k of SKILLS) { sk[k.id] = Math.round(num(s.sk && s.sk[k.id], 0, 0, SKILL_MAX)); spent += sk[k.id]; }
  let skPts = Math.round(num(s.skPts, 0, 0, 999));
  // Spezial-Leiste (0 … 1); alte Pilze laden sie auf
  let spec = num(s.spec, 0, 0, 1);
  const shrooms = Math.round(num(s.shrooms, 0, 0, 99));
  let gift = 0;
  if (old) {
    const need = Math.ceil((1 - spec) / SPECIAL.perShroom - 1e-6), use = Math.min(shrooms, need);
    spec = Math.min(1, spec + use * SPECIAL.perShroom);
    capGold += (shrooms - use) * CAP_GOLD.shroom;
    gift = Math.max(0, lvl - 1); skPts += gift;
  }
  gold += capGold;
  const lk = makeLook({ species, ...(s.look && typeof s.look === "object" ? s.look : {}) });
  const deepest = Math.round(num(s.deepest, 1, 1, MAX_DEPTH)), won = !!s.won;
  let bossDone = Array.isArray(s.bossDone) ? s.bossDone.map(d => d | 0).filter(d => bossKindOf(d)) : [];
  if (fileV < 3) {                                         // v4 und älter → v5: schon passierte Boss-Ebenen gelten als geschafft
    for (let d = 2; d < deepest; d += 2) bossDone.push(d);
    if (won) bossDone.push(MAX_DEPTH);
  }
  bossDone = [...new Set(bossDone)].sort((a, b) => a - b);
  const ammoMax = Math.min(CAP.ammoMax, CAP.ammoBase + sk.blasen * 4);
  return {
    v: SAVE_V, name: str(s.name, "Kobold"), species, look: lookSave(lk), lvl,
    xp: num(s.xp, 0, 0, 1e9), xpNext: num(s.xpNext, 10, 1, 1e9),
    maxHp, hp: Math.round(num(s.hp, maxHp, 1, CAP.hp)),
    atk: num(s.atk, 4, 1, 500), projN: Math.round(num(s.projN, 1, 1, 12)), magic: num(s.magic, 1, 0.5, 500),
    gold, potions, ammo: Math.round(num(s.ammo, AMMO.start, 0, ammoMax)), spec, sk, skPts,
    hats, hat: hats.includes(s.hat) ? s.hat : null,
    deepest, depth: Math.round(num(s.depth, 0, 0, MAX_DEPTH)), bossDone,
    mega: !!s.mega, tut: !!s.tut, runSecs: num(s.runSecs, 0, 0, 1e7), won,
    seed: Math.round(num(s.seed, (Math.random() * 1e9) | 0, 0, 2 ** 31)), migrated: !!s.migrated,
    kills: Math.round(num(s.kills, 0, 0, 1e9)),
    // einmalige Hinweise nach dem Umzug (werden beim ersten Spielstart als Toast gezeigt und dann gelöscht)
    capNote: Math.round(num(s.capNote, 0, 0, 1e9)) + capGold, giftNote: Math.round(num(s.giftNote, 0, 0, 999)) + gift,
  };
}
export function loadSave() {
  const s = readJson(SAVE_KEY);
  if (s) return sanitize(s);
  return migrateOld();
}
export function writeSave(s) { return writeJson(SAVE_KEY, s); }
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

/** v20 → Koboldkeller 2: Name, Look, Level, Gold, Waffenwerte + Geschenk (Ehrenmütze) */
export function migrateOld() {
  const o = readJson(OLD_SAVE_KEY);
  if (!o || !o.look || typeof o.look !== "object") return null;
  try {
    const sp = OLD_SPECIES_MAP[o.look.species] || "kobold";
    const s = sanitize({
      name: o.look.name, species: sp, lvl: o.lvl, xp: o.xp, xpNext: o.xpNext, maxHp: o.maxHp, hp: o.maxHp,
      atk: o.atk, projN: o.projN, magic: o.magic, gold: o.gold, potions: o.potionCount,
      shrooms: Array.isArray(o.bag) ? o.bag.filter(i => i && i.kind === "mushroom").length : 0,
      deepest: o.deepest || o.depth, depth: 0, mega: o.mega, tut: true, seed: o.seed,
      hats: ["veteran"], hat: "veteran", migrated: true,
    });
    if (s) { s.maxHp = Math.min(CAP.hp, s.maxHp + 2); s.hp = s.maxHp; }
    return s;
  } catch (e) { return null; }
}

// ---------- Ehrenhall (kompatibel zu v20) ----------
function cleanRows(a) {
  if (!Array.isArray(a)) return [];
  return a.filter(r => r && typeof r === "object").map(r => ({
    name: str(r.name, "Kobold", 16), gold: Math.round(num(r.gold, 0, 0, 1e9)), secs: Math.round(num(r.secs, 0, 0, 1e8)),
    lvl: Math.round(num(r.lvl, 1, 1, 99)), ts: num(r.ts, Date.now(), 0, 1e14), mega: !!r.mega,
    how: r.how === "portal" ? "portal" : "boss", from: Math.round(num(r.from, 1, 1, MAX_DEPTH)), species: typeof r.species === "string" ? r.species : (r.look && r.look.species) || "kobold",
  })).slice(0, 5);
}
export function loadHall() {
  const h = readJson(HALL_KEY) || {};
  return { gold: cleanRows(h.gold), time: cleanRows(h.time) };
}
export function addHall(rec) {
  const h = loadHall();
  h.gold.push(rec); h.time.push(rec);
  h.gold.sort((a, b) => b.gold - a.gold); h.gold = h.gold.slice(0, 5);
  h.time.sort((a, b) => a.secs - b.secs); h.time = h.time.slice(0, 5);
  writeJson(HALL_KEY, h);
  return h;
}

// ---------- Einstellungen ----------
export function loadSettings() {
  const s = readJson(SETTINGS_KEY) || {};
  return { music: s.music !== false, sfx: s.sfx !== false, vibrate: s.vibrate !== false, joystick: s.joystick !== false };
}
export function saveSettings(s) { writeJson(SETTINGS_KEY, s); }
