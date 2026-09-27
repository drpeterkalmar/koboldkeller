/* music.js — adaptive Musik v4 + Stinger. Look-ahead-Scheduler: plant Noten 16tel-genau auf AudioContext.currentTime
   (setInterval weckt nur auf, bestimmt nie das Timing). Tempo darf je Abschnitt wechseln (nur an Abschnittsgrenzen). (MIT)

   Aufbau (Kinderwunsch: die Stadtmelodie bleibt das Leitmotiv, aber jede Welt klingt anders, nie dröhnend):
   • Stadt: CC0-Stadtmelodie (Es-Dur, 90 BPM, 28 Takte) im Wechsel mit einem eigenen Zwischenspiel über das Stadt-Motiv.
     Abends (18–7 Uhr Ortszeit) sanfter: Aufnahme gedämpft + Pad + Spieluhr, „Abendlied" als Zwischenspiel.
   • Jede Welt: eigene Tonart, eigenes Tempo, eigene Akkordfolgen, Melodien A/B, eigene Instrumente.
     Form je Durchgang: [Intro] A · A' · B · A'' (mit Leitmotiv-Zitat) · Pause — jeder 2. Durchgang zusätzlich 8 Takte
     Stadtmelodie im „Höhlenklang" (Leitmotiv). Varianten (Oktave, Verdopplung, Gegenstimme) wechseln je Durchgang.
   • Kampf: Schichten (Bass + Shaker, dann Trommeln + Läufe) je Welt mit eigenem Füll-Instrument.
   • Boss: Thema zitiert das Stadt-Motiv „C-Es-C-D-G" in der Moll-Tonart der Welt, eigenes Tempo + Lead je Welt,
     A/B-Teil, Wut-Phase mit zusätzlicher Rhythmus-Schicht. Tiefster Ton ≈ 117 Hz (kein Dröhnen). */
export const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4, LOOP_BARS = 28, LOOP = LOOP_BARS * BAR;

// ---------- Akkordkarte der Stadtmelodie (pro Halbtakt: Basston + klingende Tonklassen, per FFT vermessen) ----------
const ROOTS = [3, 10, 0, 7, 3, 10, 0, 7, 3, 3, 8, 7, 7, 7, 3, 10, 3, 10, 8, 7, 3, 7, 3, 10, 3, 3, 0, 7,
  3, 3, 0, 7, 3, 3, 8, 7, 7, 7, 3, 10, 3, 10, 8, 7, 3, 7, 3, 10, 3, 3, 0, 7, 3, 10, 0, 7];
const TONES = [[3, 7, 10], [10, 5, 3], [0, 3, 10], [7, 0, 2], [3, 7, 10], [10, 5, 3], [3, 0, 7], [7, 0, 2], [3, 7, 10], [3, 10, 5], [7, 8, 0], [7, 5, 8], [7, 3, 5], [7, 8, 10],
  [10, 7, 3], [10, 5, 7], [3, 7, 10], [10, 0, 3], [8, 0, 3], [2, 3, 7], [3, 7, 5], [7, 10, 5], [10, 7, 3], [10, 5, 7], [3, 7, 10], [3, 10, 5], [0, 3, 7], [7, 0, 2],
  [3, 7, 10], [3, 10, 5], [3, 0, 7], [7, 2, 0], [3, 7, 10], [3, 10, 5], [8, 7, 0], [7, 5, 8], [7, 3, 5], [7, 10, 5], [10, 7, 3], [10, 5, 7], [3, 7, 10], [10, 0, 5],
  [8, 0, 3], [2, 3, 7], [7, 3, 5], [7, 10, 5], [10, 7, 3], [10, 5, 7], [3, 7, 10], [3, 10, 5], [0, 3, 10], [7, 0, 2], [7, 3, 10], [10, 5, 3], [3, 0, 7], [7, 0, 2]];

// ---------- Tonleitern / Notenschrift ----------
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
/** Takt-Notation: "Stufe:Länge" in 16teln, ' = Oktave hoch, , = tiefer, r = Pause. z. B. "3:4 5:4 1':8" */
function parseBar(str) {
  const out = []; let pos = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [d, l] = tok.split(":"), len = +l;
    if (d !== "r") { const deg = +d[0], oct = (d.match(/'/g) || []).length - (d.match(/,/g) || []).length; out.push({ pos, len, deg, oct }); }
    pos += len;
  }
  return out;
}
const parse = bars => bars.map(parseBar);
// Leitmotiv „C-Es-C-D-G" (Takt 2 der Stadtmelodie) als Stufen: Dur = 6-1'-6-7-3', Moll = 1-3-1-2-5
const MOTIF = { maj: "6:2 1':2 6:2 7:2 3':8", min: "1':2 3':2 1':2 2':2 5':8" };

// ---------- Welten: Tonart, Tempo, Akkorde, Melodien, Instrumente ----------
// root = Tonika (Tonklasse), minor, bpm, tonic = MIDI der Melodie-Tonika, chA/chB = Stufen je Takt ("5M" = Dur-Dominante in Moll)
const WORLDS = [null,
  { name: "Moosgrotte", root: 5, minor: false, bpm: 84, tonic: 65, pad: "padWarm", lp: 2400, orn: "moos",
    melA: "flute", melB: "celesta", dbl: "kalimba", bassPat: { 0: 0, 6: 7, 8: 0, 14: 7 }, perc: "moos", fill: "kalimba",
    chA: ["1", "6", "4", "5", "1", "3", "4", "5"], chB: ["6", "3", "4", "1", "2", "5", "1", "5"],
    A: parse(["3:4 5:4 6:2 5:2 3:4", "1':6 6:2 5:8", "4:4 6:4 1':2 6:2 4:4", "5:6 4:2 3:4 2:4", "3:4 5:4 6:2 5:2 3:4", "3:4 5:4 7:8", "6:4 4:4 1':4 6:4", "7:4 2':4 1':8"]),
    B: parse(["6:6 5:2 6:4 1':4", "7:6 6:2 5:8", "4:4 5:4 6:4 4:4", "3:12 r:4", "2:4 4:4 6:4 5:4", "5:4 7:4 2':8", "1':4 6:4 5:4 3:4", "2:8 5:8"]) },
  { name: "Kristallhöhle", root: 9, minor: true, bpm: 96, tonic: 69, pad: "padGlass", lp: 3200, orn: "kristall",
    melA: "celesta", melB: "lead", dbl: "crystal", bassPat: { 0: 0, 8: 0, 12: 7 }, perc: "kristall", fill: "crystal",
    chA: ["1", "6", "3", "7", "1", "6", "4", "5M"], chB: ["6", "7", "5", "1", "4", "7", "3", "5M"],
    A: parse(["5:4 1':4 7:2 1':2 5:4", "6:6 5:2 3:8", "3:4 5:4 1':4 7:4", "7:8 5:4 2:4", "5:4 1':4 3':4 2':4", "1':6 7:2 6:8", "4:4 6:4 1':4 6:4", "5:8 2:8"]),
    B: parse(["1':4 3':4 1':4 6:4", "2':6 7:2 5:8", "5:4 7:4 2':4 7:4", "1':12 r:4", "6:4 4:4 1':4 6:4", "7:4 2':4 4':4 2':4", "3':4 1':4 5:4 3:4", "2':8 5:8"]) },
  { name: "Zuckerkeller", root: 0, minor: false, bpm: 108, tonic: 72, pad: "padSweet", lp: 2800, orn: "zucker",
    melA: "flute", melB: "musicbox", dbl: "celesta", bassPat: { 0: 0, 4: 7, 8: 0, 10: 7, 12: 12 }, perc: "zucker", fill: "musicbox",
    chA: ["1", "6", "4", "5", "1", "6", "2", "5"], chB: ["4", "5", "3", "6", "4", "5", "1", "1"],
    A: parse(["1':2 5:2 3:2 5:2 1':4 5:4", "6:2 1':2 3':4 1':4 6:4", "4:2 6:2 1':4 6:2 4:2 6:4", "5:4 7:4 2':4 r:4", "3':2 2':2 1':2 7:2 1':8", "6:2 5:2 6:2 1':2 3':8", "2':4 1':2 6:2 4:4 6:4", "5:4 2':4 7:8"]),
    B: parse(["6:4 1':4 4':4 1':4", "7:4 2':4 5':8", "3':4 5:4 7:4 5:4", "6:8 1':8", "4':2 3':2 1':4 6:4 1':4", "2':6 7:2 5:8", "1':4 3':4 5':4 3':4", "1':8 r:8"]) },
  { name: "Frostkeller", root: 2, minor: false, bpm: 76, tonic: 74, pad: "padAir", lp: 2600, orn: "frost",
    melA: "bell", melB: "flute", dbl: "celesta", bassPat: { 0: 0, 8: 7 }, perc: "frost", fill: "bell",
    chA: ["1", "6", "4", "5", "1", "3", "4", "5"], chB: ["2", "4", "1", "5", "6", "4", "1", "5"],
    A: parse(["5:8 3:4 5:4", "6:8 1':8", "1':4 7:4 6:4 4:4", "5:12 r:4", "3:4 5:4 1':4 3':4", "3':8 2':4 7:4", "1':4 6:4 4:4 6:4", "5:8 2:8"]),
    B: parse(["2:4 4:4 6:4 4:4", "1':8 6:8", "3:4 5:4 1':8", "7:8 5:8", "6:4 1':4 3':8", "2':4 1':4 6:8", "5:4 3:4 1:8", "2:8 r:8"]) },
  { name: "Glutkeller", root: 7, minor: true, bpm: 92, tonic: 67, pad: "padEmber", lp: 2000, orn: "glut",
    melA: "flute", melB: "lead", dbl: "marimba", bassPat: { 0: 0, 3: 0, 6: 7, 8: 0, 11: 0, 14: 7 }, perc: "glut", fill: "marimba",
    chA: ["1", "6", "3", "7", "1", "6", "4", "5M"], chB: ["4", "1", "6", "3", "4", "1", "5M", "5M"],
    A: parse(["1':4 5:4 3:4 5:4", "6:6 5:2 3:8", "3:4 5:4 1':4 7:4", "7:8 2':4 7:4", "1':4 3':4 2':4 1':4", "6:4 1':4 3':8", "4:4 6:4 1':4 6:4", "5:8 2:8"]),
    B: parse(["1':4 6:4 4:4 6:4", "5:6 3:2 1:8", "3:4 5:4 6:4 1':4", "5:12 r:4", "4:4 5:4 6:4 1':4", "3':6 2':2 1':8", "2':4 5:4 2':4 5:4", "5:8 r:8"]) },
];
// Stadt-Zwischenspiele über das Motiv (Es-Dur): Tag = Harfe + Glocke, Abend = Spieluhr, langsamer
const TOWN_I = {
  root: 3, minor: false, tonic: 63, chA: ["1", "6", "4", "5", "1", "3", "4", "5"],
  A: parse(["6:2 1':2 6:2 7:2 3':8", "1':4 6:4 3:8", "4:4 6:4 1':8", "2':8 7:4 5:4", "6:2 1':2 6:2 7:2 5':8", "3':6 2':2 7:8", "1':4 6:4 4:4 1':4", "7:8 5:8"]),
};
// Boss-Thema (c-Moll-Vorlage, 8tel-Raster), wird in die Moll-Tonart der Welt transponiert
const BOSSC = [[0, [0, 3, 7]], [8, [8, 0, 3]], [3, [3, 7, 10]], [10, [10, 2, 5]], [0, [0, 3, 7]], [8, [8, 0, 3]], [5, [5, 8, 0]], [7, [7, 11, 2]]];
const BOSSC_B = [[8, [8, 0, 3]], [10, [10, 2, 5]], [0, [0, 3, 7]], [0, [0, 3, 7]], [5, [5, 8, 0]], [7, [7, 11, 2]], [0, [0, 3, 7]], [7, [7, 11, 2]]];
const BOSSMEL = [[72, 75, 72, 74, 67, "-", "-", "-"], [68, 72, 68, 70, 75, "-", "-", "-"], [75, 79, 75, 77, 70, "-", "-", "-"], [74, 77, 74, 75, 77, "-", "-", "-"],
  [72, 75, 72, 74, 79, "-", "-", "-"], [80, 79, 77, 75, 72, "-", "-", "-"], [77, 80, 79, 77, 75, "-", 74, "-"], [74, "-", "-", "-", 71, "-", "-", "-"]];
const BOSSMEL_B = [[75, 77, 79, "-", 80, "-", 79, 77], [74, "-", 70, "-", 74, 77, 75, 74], [72, "-", "-", 75, 79, "-", 84, "-"], [82, 80, 79, "-", 75, "-", "-", "-"],
  [77, 80, 84, "-", 82, 80, 77, "-"], [79, "-", 74, "-", 71, 74, 79, "-"], [84, 82, 79, 75, 72, "-", 75, "-"], [74, "-", "-", "-", 67, 71, 74, 79]];
// Boss je Welt: Transposition gegenüber c-Moll, Tempo, Lead-Instrument, Verdopplung
const BOSSW = [null,
  { tr: 2, bpm: 100, lead: "lead", dbl: "kalimba" }, { tr: -3, bpm: 108, lead: "lead", dbl: "crystal" }, { tr: -3, bpm: 114, lead: "flute", dbl: "musicbox" },
  { tr: -1, bpm: 96, lead: "lead", dbl: "bell" }, { tr: -5, bpm: 104, lead: "flute", dbl: "marimba" },
];
const BOSS_KING = { tr: 0, bpm: 104, lead: "lead", dbl: "bell" };
/** v5: Mini-Boss — dasselbe Boss-Material der Welt, abgewandelt: etwas langsamer, Melodie auf dem Welt-Instrument,
    weniger Blech/Pauke, leichteres Schlagzeug (sanft wie bisher) */
const MINIB = [];
function miniBoss(b) { const bw = BOSSW[b] || BOSSW[1], W = WORLDS[b] || WORLDS[1]; return MINIB[b] || (MINIB[b] = { tr: bw.tr, bpm: bw.bpm - 8, lead: W.melA, dbl: W.dbl || bw.dbl, mini: true }); }
// Biom-Klangfarbe im Leitmotiv-Abschnitt (Aufnahme im Höhlenklang)
const BIO = [null,
  { pad: "padWarm", lp: 2400, orn: "moos" }, { pad: "padGlass", lp: 3200, orn: "kristall" }, { pad: "padSweet", lp: 2800, orn: "zucker" },
  { pad: "padAir", lp: 2600, orn: "frost" }, { pad: "padEmber", lp: 2000, orn: "glut" }];
// Pegel der Schichten (linear, vor dem Musik-Bus) — per tools/audiorender.mjs eingemessen
const LV = { recTown: 0.95, recEve: 0.72, recDun: 0.6, pad: 0.2, orn: 0.28, mel: 0.3, bass: 0.34, comb: 0.42, drum: 0.5, boss: 0.34 };

const near = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;           // tiefster Ton ≥ lo mit Tonklasse pc
const safe = (root, t) => t.filter(pc => { const iv = (pc - root + 12) % 12; return iv !== 1 && iv !== 6; });
const up = (tones, lo) => tones.map(pc => near(pc, lo)).sort((a, b) => a - b);
/** Akkord einer Stufe (Dreiklang aus der Tonleiter) → { root, tones } als Tonklassen */
function chordOf(K, tok) {
  const sc = K.minor ? MIN : MAJ, d = parseInt(tok, 10) - 1;
  const pcs = [sc[d % 7], sc[(d + 2) % 7], sc[(d + 4) % 7]].map(x => (x + K.root) % 12);
  if (tok.includes("M") && K.minor) pcs[1] = (pcs[1] + 1) % 12;       // Dur-Dominante in Moll
  return { root: pcs[0], tones: pcs };
}
const degMidi = (K, deg, oct) => K.tonic + (K.minor ? MIN : MAJ)[deg - 1] + 12 * oct;

export function createMusic(E) {
  const ac = E.ac;
  const mk = v => { const g = ac.createGain(); g.gain.value = v; g.connect(E.musicIn); return g; };
  const L = { rec: mk(0), pad: mk(0), orn: mk(0), mel: mk(0), bass: mk(0), comb: mk(0), drum: mk(0), boss: mk(0) };
  L.recLP = ac.createBiquadFilter(); L.recLP.type = "lowpass"; L.recLP.frequency.value = 20000; L.recLP.Q.value = 0.5; L.recLP.connect(L.rec);
  const M = {
    L, t: 0, sd: S16, sec: null, si: 0, running: false, src: null, inten: 0, dead: false, cycle: 0, queue: [], nSec: 0,
    want: { where: "none", biome: 0, boss: 0, phase: 1, eve: false },
    cur: { where: "none", biome: 0, song: "main", comb: 0, boss: 0, phase: 1, key: { root: 3, minor: false } },
  };
  const ramp = (g, v, t, tau) => { const p = g.gain || g; p.cancelScheduledValues(t); p.setTargetAtTime(v, t, Math.max(0.005, tau / 3)); };
  const N = (inst, m, t, vel, to, o = {}) => E.note(inst, m, t, vel, { ...o, to });

  // ---------- Aufnahme (Leitmotiv) sample-genau ----------
  function recStart(t, off, dur) {
    recStop(t);
    if (!E.musicOn) return;
    if (E.rec) {
      const s = ac.createBufferSource(); s.buffer = E.rec; s.loop = !dur; s.connect(L.recLP);
      if (dur) s.start(t, off, dur + 0.05); else s.start(t, off % LOOP);
      M.src = s; M.srcT = t; M.srcOff = off;
    } else if (E.el) { E.el.play().catch(() => { }); }
  }
  function recStop(t) {
    if (M.src) { const s = M.src; M.src = null; try { s.stop(Math.max(ac.currentTime, t ?? 0) + 0.02); } catch (e) { } setTimeout(() => { try { s.disconnect(); } catch (e) { } }, 2000); }
    if (E.el && !t) E.el.pause();
  }
  M.stopRec = () => recStop();
  M.startRec = (t) => { if (M.sec && M.sec.rec !== undefined) recStart(t, M.sec.rec + (t - M.sec.t0), M.sec.recDur ? Math.max(0.05, M.sec.recDur - (t - M.sec.t0)) : 0); };
  M.resume = () => { if (M.running) M.startRec(ac.currentTime + 0.05); };

  // ---------- Abschnitte ----------
  /** nächste Abschnitte für den aktuellen Ort planen */
  function planSongs(first) {
    const c = M.cur, q = M.queue; q.length = 0;
    if (c.song === "boss") { q.push(...(c.boss === 3 ? ["bossA", "bossB", "bossA", "bossA"] : ["bossA", "bossA", "bossB", "bossA", "bossB", "bossB"])); return; }
    if (c.where === "town") { q.push("rec", "town"); return; }
    if (c.where !== "dungeon") { q.push("silent"); return; }
    const cy = M.cycle;
    if (first) q.push("intro");
    q.push(...(cy % 2 ? ["A0", "B", "A1", "B", "A2", "BR"] : ["A0", "A1", "B", "A2", "BR"]));
    if (cy % 2 === 1 && E.rec) q.push("LM");
  }
  function makeSection(kind, t) {
    const c = M.cur, W = WORLDS[c.biome] || WORLDS[1];
    const sec = { kind, t0: t, bars: 8, bpm: W.bpm, K: W, v: M.cycle };
    switch (kind) {
      case "silent": sec.bars = 1; sec.bpm = 90; sec.K = TOWN_I; break;
      case "rec": sec.bars = LOOP_BARS; sec.bpm = BPM; sec.K = TOWN_I; sec.rec = 0; sec.recDur = LOOP; break;
      case "town": sec.bars = 8; sec.bpm = c.eve ? 80 : 90; sec.K = TOWN_I; break;
      case "intro": sec.bars = 2; break;
      case "BR": sec.bars = 4; break;
      case "LM": { sec.bars = 8; sec.bpm = BPM; sec.lmBar = [0, 8, 16, 20][(M.cycle >> 1) % 4]; sec.rec = sec.lmBar * BAR; sec.recDur = 8 * BAR; break; }
      case "bossA": case "bossB": {
        const bw = c.boss === 2 ? BOSS_KING : c.boss === 3 ? miniBoss(c.biome) : (BOSSW[c.biome] || BOSSW[1]);
        sec.bw = bw; sec.bpm = Math.round(bw.bpm * (c.phase >= 3 ? 1.08 : 1)); sec.K = { root: (bw.tr + 12) % 12, minor: true, tonic: 72 + bw.tr }; break;
      }
    }
    sec.sd = 60 / sec.bpm / 4;
    return sec;
  }
  /** Abschnitt beginnen: Schicht-Pegel setzen, Aufnahme starten/stoppen */
  function enter(sec, t) {
    const c = M.cur, eve = c.eve;
    M.sec = sec; M.si = 0; M.sd = sec.sd; M.nSec++;
    c.key = { root: sec.K.root, minor: sec.K.minor };
    const f = 0.25;
    if (sec.kind === "rec") {
      ramp(L.rec, eve ? LV.recEve : LV.recTown, t, 0.05); L.recLP.frequency.setTargetAtTime(eve ? 2800 : 20000, t, 0.2);
      for (const k of ["mel", "bass", "comb", "drum", "boss"]) ramp(L[k], 0, t, f);
      ramp(L.pad, eve ? LV.pad * 0.8 : 0, t, 1); ramp(L.orn, eve ? LV.orn * 0.8 : 0, t, 1);
      recStart(t, 0, 0);
    } else if (sec.kind === "LM") {
      const B = BIO[c.biome] || BIO[1];
      ramp(L.rec, LV.recDun, t, 0.08); L.recLP.frequency.setTargetAtTime(B.lp + c.comb * 900, t, 0.2);
      ramp(L.mel, 0, t, f); ramp(L.bass, 0, t, f); ramp(L.pad, LV.pad, t, f); ramp(L.orn, LV.orn, t, f); ramp(L.boss, 0, t, f);
      recStart(t, sec.rec, sec.recDur);
      L.rec.gain.setTargetAtTime(0, t + sec.recDur - 0.35, 0.12);
    } else {
      if (M.src) { recStop(t); ramp(L.rec, 0, t, 0.3); } else ramp(L.rec, 0, t, 0.1);
      if (E.el && !E.rec) E.el.pause();
      if (sec.kind === "bossA" || sec.kind === "bossB") {
        for (const k of ["mel", "bass", "pad", "orn", "comb", "drum"]) ramp(L[k], 0, t, BEAT * 0.5);
        ramp(L.boss, LV.boss, t, 0.03);
      } else if (sec.kind !== "silent") {
        ramp(L.boss, 0, t, BEAT); ramp(L.pad, LV.pad, t, f); ramp(L.orn, LV.orn, t, f); ramp(L.mel, LV.mel, t, f); ramp(L.bass, sec.kind === "town" ? LV.bass * 0.6 : LV.bass, t, f);
        if (c.where === "dungeon") setComb(c.comb, t, true);
      }
    }
  }
  function nextSection(t) {
    if (!M.queue.length) { M.cycle++; planSongs(false); }
    enter(makeSection(M.queue.shift(), t), t);
  }
  /** Ortswechsel / Boss: sofort (an einer Taktgrenze) neu planen */
  function restart(t, first) {
    M.queue.length = 0; planSongs(first);
    enter(makeSection(M.queue.shift(), t), t);
  }
  function setComb(lv, t, quiet) {
    const c = M.cur; c.comb = lv;
    ramp(L.comb, lv >= 1 ? LV.comb : 0, t, lv >= 1 ? 0.06 : BEAT * 1.5);
    ramp(L.drum, lv >= 2 ? LV.drum : 0, t, lv >= 2 ? 0.06 : BEAT * 1.5);
    if (M.sec && M.sec.kind === "LM") L.recLP.frequency.setTargetAtTime((BIO[c.biome] || BIO[1]).lp + lv * 900, t, 0.4);
  }
  /** an Takt-/Halbtaktgrenzen: Ort, Boss, Kampf-Stufe */
  function decide(s, t) {
    const w = M.want, c = M.cur;
    if (s === 0) {
      const wb = w.where === "dungeon" ? w.boss : 0;
      if (w.where !== c.where || w.biome !== c.biome || w.eve !== c.eve) {
        c.where = w.where; c.biome = w.biome; c.eve = w.eve; c.song = wb ? "boss" : "main"; c.boss = wb; M.cycle = 0; c.comb = 0;
        restart(t, true); return true;
      }
      if (wb && c.song !== "boss") {                    // Boss-Thema startet auf der Eins mit Becken
        c.song = "boss"; c.boss = wb; c.phase = w.phase; c.comb = 0;
        restart(t); N("crash", 60, t, 0.5, L.boss); return true;
      }
      if (!wb && c.song === "boss") { c.song = "main"; c.comb = 0; M.cycle = 1; restart(t); return true; }
      if (wb && w.phase !== c.phase) { c.phase = w.phase; N("crash", 60, t, 0.42, L.boss); }
    }
    if (c.song === "main" && c.where === "dungeon") {   // Kampf-Stufe mit Hysterese
      const x = M.inten; let lv = c.comb;
      if (x > 0.62) lv = 2; else if (x > 0.22 && lv < 1) lv = 1;
      if (x < 0.08) lv = 0; else if (x < 0.4 && lv === 2) lv = 1;
      if (lv !== c.comb) setComb(lv, t);
    }
    return false;
  }

  // ---------- Muster ----------
  const ORN = {
    moos(s, t, bar, root, tones) {
      const A = bar % 2 ? { 0: 2, 4: 1, 8: 0, 11: 2, 14: 1 } : { 0: 0, 3: 1, 6: 2, 10: 1, 12: 0 }, k = A[s];
      if (k !== undefined) N("kalimba", up(tones, 72)[k % tones.length], t, s === 0 ? 0.6 : 0.45, L.orn, { pan: (k - 1) * 0.3 });
    },
    kristall(s, t, bar, root, tones) {
      const u = up(tones, 84);
      if (bar % 2 === 0 && s < 8 && s % 2 === 0) { const i = s / 2; N("crystal", u[i % u.length] + (i >= u.length ? 12 : 0), t, 0.42 - i * 0.05, L.orn, { pan: i % 2 ? 0.45 : -0.45 }); }
      else if (s === 12 || (bar % 2 && s === 4)) N("crystal", u[(bar + s) % u.length] + 7 > 100 ? u[0] : u[(bar + s) % u.length], t, 0.24, L.orn, { pan: 0.2 });
    },
    zucker(s, t, bar, root, tones) {
      if (s % 2) return;
      const u = up(tones, 79), n = u.length, seq = [u[0], u[1 % n], u[2 % n], u[0] + 12, u[2 % n], u[1 % n], u[0], u[1 % n]];
      N("musicbox", seq[s / 2], t, s === 0 ? 0.42 : 0.3, L.orn, { pan: (s / 2) % 2 ? 0.25 : -0.25 });
    },
    frost(s, t, bar, root, tones) {
      const u = up(tones, 84);
      if (s === 0) N("bell", u[0], t, 0.34, L.orn, { pan: -0.3 });
      else if (s === 6) N("bell", u[1 % u.length] + 7 < 100 ? u[1 % u.length] : u[0], t, 0.2, L.orn, { pan: 0.4 });
      else if (s === 10 && bar % 2) N("bell", u[2 % u.length], t, 0.22, L.orn, { pan: 0.1 });
    },
    glut(s, t, bar, root, tones) {
      if (s % 2) return;
      const R = near(root, 55), seq = [0, 7, 12, 7, 0, 7, 12, 7];
      N("marimba", R + seq[s / 2], t, s === 0 || s === 6 ? 0.5 : 0.34, L.orn, { pan: (s / 2) % 2 ? 0.2 : -0.2 });
    },
  };
  function padChord(inst, root, tones, t, dur, vel = 1) {
    N(inst, near(root, 48), t, 0.5 * vel, L.pad, { dur: dur + 0.12, rel: 0.7 });
    for (const m of up(tones, 60)) N(inst, m, t, 0.36 * vel, L.pad, { dur: dur + 0.12, rel: 0.7, pan: (m % 3 - 1) * 0.35 });
  }
  function comb1(s, t, bar, root) {
    const R = near(root, 46), pat = { 0: [0, 0.62], 3: [0, 0.42], 6: [0, 0.5], 8: [0, 0.56], 11: [0, 0.4], 14: [7, 0.45] }, p = pat[s];
    if (p) { let m = R + p[0]; if (m > 60) m -= 12; N("pizz", m, t, p[1], L.comb); }
    if (s % 4 === 2) N("shaker", 60, t, 0.3, L.comb, { pan: 0.25 }); else if (s % 4 === 0) N("shaker", 60, t, 0.14, L.comb, { pan: 0.25 });
  }
  function comb2(s, t, bar, root, tones, perc, fill) {
    // eigene Trommelmuster je Welt (alle sanft, keine Bass-Trommel unter 140 Hz)
    if (perc === "kristall") { if (s === 0 || s === 10) N("knock", 60, t, 0.55, L.drum); if (s === 4 || s === 12) N("snap", 60, t, 0.55, L.drum, { pan: -0.1 }); if (s % 4 === 2) N("snap", 60, t, 0.16, L.drum, { pan: 0.3 }); }
    else if (perc === "zucker") { if (s === 0 || s === 8) N("knock", 60, t, 0.6, L.drum); if (s === 4 || s === 12) N("snap", 60, t, 0.45, L.drum); if (s % 2 === 0) N("tamb", 60, t, s % 4 ? 0.12 : 0.22, L.drum, { pan: 0.3 }); }
    else if (perc === "frost") { if (s === 0) N("knock", 60, t, 0.5, L.drum); if (s === 8) N("snap", 60, t, 0.35, L.drum); if (s === 12) N("tamb", 60, t, 0.18, L.drum, { pan: 0.3 }); }
    else if (perc === "glut") { if (s === 0 || s === 6 || s === 8) N("knock", 60, t, s ? 0.5 : 0.72, L.drum); if (s === 4 || s === 12) N("snap", 60, t, 0.5, L.drum); if (s === 14) N("knock", 60, t, 0.3, L.drum); }
    else { if (s === 0 || s === 8) N("knock", 60, t, 0.7, L.drum); else if (s === 11) N("knock", 60, t, 0.3, L.drum); if (s === 4 || s === 12) N("snap", 60, t, 0.5, L.drum, { pan: -0.1 }); }
    if (s % 2 === 1) N("shaker", 60, t, 0.1, L.drum, { pan: -0.25 });
    if (bar % 4 === 3 && s >= 12) { const u = up(tones, 67); N(fill || "harp", u[(s - 12) % u.length] + (s === 15 ? 12 : 0), t, 0.3, L.drum, { pan: 0.2 }); }
  }
  /** Welt-Abschnitt (A/B/Intro/Pause) */
  function worldStep(sec, s, bar, t) {
    const W = sec.K, c = M.cur, kind = sec.kind;
    const isB = kind === "B", chs = isB ? W.chB : W.chA, ch = chordOf(W, chs[bar % 8]), tones = safe(ch.root, ch.tones);
    // Pad: jeder Takt ein Akkord (Pause: weicher)
    if (s === 0) padChord(W.pad, ch.root, ch.tones, t, 16 * sec.sd, kind === "BR" ? 0.8 : 1);
    // Ornament der Welt: in A0 nur jeden 2. Takt, sonst durchgehend, im Intro/Pause sparsam
    const ornOn = kind === "A1" || kind === "A2" || kind === "B" || (kind === "A0" && bar % 2 === 1) || ((kind === "intro" || kind === "BR") && s < 8);
    if (ornOn) ORN[W.orn](s, t, bar, ch.root, tones);
    // Bass
    if (kind !== "intro" && kind !== "BR") { const b = W.bassPat[s]; if (b !== undefined) { let m = near(ch.root, 46) + b; if (m > 62) m -= 12; N("pizz", m, t, s === 0 ? 0.5 : 0.36, L.bass); } }
    else if (kind === "BR" && s === 0 && bar % 2 === 0) N("pizz", near(ch.root, 46), t, 0.3, L.bass);
    // Melodie
    if (kind === "A0" || kind === "A1" || kind === "A2" || kind === "B") {
      let notes = (isB ? W.B : W.A)[bar % 8];
      if (kind === "A2" && bar === 4) notes = parseBar(W.minor ? MOTIF.min : MOTIF.maj);   // Leitmotiv-Zitat
      const inst = isB ? W.melB : W.melA, v = sec.v;
      for (const n of notes) if (n.pos === s) {
        let m = degMidi(W, n.deg, n.oct) + ((kind === "A1" && v % 2) ? 12 : 0);
        if (m > 96) m -= 12;
        const dur = n.len * sec.sd;
        N(inst, m, t, 0.5, L.mel, { dur: dur - 0.03, rel: 0.18, pan: -0.08 });
        if (kind === "A1" || (kind === "B" && v % 2)) N(W.dbl, m + 12 > 98 ? m : m + 12, t, 0.22, L.mel, { pan: 0.3 });
      }
      // Gegenstimme (A''): Harfe auf den Achtel-Nachschlägen
      if (kind === "A2" && s % 4 === 2) { const u = up(ch.tones, 62); N("harp", u[(s / 2 + bar) % u.length], t, 0.24, L.mel, { pan: 0.35 }); }
    }
    if (c.comb >= 1) comb1(s, t, bar, ch.root);
    if (c.comb >= 2) comb2(s, t, bar, ch.root, tones, W.perc, W.fill);
  }
  /** Stadt-Zwischenspiel (Tag: Harfe + Glocke; Abend: Spieluhr + Harfe) */
  function townStep(sec, s, bar, t) {
    const W = TOWN_I, eve = M.cur.eve, ch = chordOf(W, W.chA[bar % 8]);
    if (s === 0) padChord("padWarm", ch.root, ch.tones, t, 16 * sec.sd, 0.8);
    if (s === 0 || s === 8) N("pizz", near(ch.root, 46) + (s ? 7 : 0), t, 0.3, L.bass);
    if (s % 4 === 2) { const u = up(ch.tones, 67); N("harp", u[(s >> 2) % u.length], t, 0.22, L.orn, { pan: 0.3 }); }
    for (const n of W.A[bar % 8]) if (n.pos === s) {
      const m = degMidi(W, n.deg, n.oct) + 12, dur = n.len * sec.sd;
      N(eve ? "musicbox" : "celesta", m, t, 0.46, L.mel, { dur: dur - 0.02, rel: 0.2 });
      if (!eve) N("bell", m + 12 > 98 ? m : m + 12, t, 0.14, L.mel, { pan: 0.3 });
    }
  }
  /** Aufnahme läuft (Stadt): abends Pad + Spieluhr über die Akkordkarte */
  function recLayer(sec, s, bar, t) {
    if (!M.cur.eve) return;
    const h = (bar % LOOP_BARS) * 2 + (s >= 8 ? 1 : 0), root = ROOTS[h], tones = safe(root, TONES[h]);
    if (s === 0 || s === 8) padChord("padWarm", root, TONES[h], t, 8 * sec.sd, 0.7);
    if (bar % 2 === 0) ORN.zucker(s, t, bar, root, tones);
  }
  /** Leitmotiv-Abschnitt: Aufnahme im Höhlenklang + Welt-Ornament über die Akkordkarte */
  function lmStep(sec, s, bar, t) {
    const c = M.cur, B = BIO[c.biome] || BIO[1], hb = sec.lmBar + bar;
    const h = (hb % LOOP_BARS) * 2 + (s >= 8 ? 1 : 0), root = ROOTS[h], tones = safe(root, TONES[h]);
    if (s === 0 || s === 8) padChord(B.pad, root, TONES[h], t, 8 * sec.sd);
    ORN[B.orn](s, t, hb, root, tones);
    if (c.comb >= 1) comb1(s, t, bar, root);
    if (c.comb >= 2) comb2(s, t, bar, root, tones, (WORLDS[c.biome] || WORLDS[1]).perc, (WORLDS[c.biome] || WORLDS[1]).fill);
  }
  function bossStep(sec, s, bar, t) {
    const bw = sec.bw, tr = bw.tr, B = sec.kind === "bossB", C = B ? BOSSC_B : BOSSC, MEL = B ? BOSSMEL_B : BOSSMEL;
    const bb = bar % 8, [cr0, ct0] = C[bb], cr = (cr0 + tr + 12) % 12, ct = ct0.map(x => (x + tr + 12) % 12);
    const R = near(cr, 46), king = M.cur.boss === 2, rage = M.cur.phase >= 3, to = L.boss;
    if (bw.mini) {                                       // Mini-Boss: leichter besetzt
      if (s % 4 === 0) N("pizz", R + [0, 7, 0, 12][s / 4], t, s === 0 ? 0.62 : 0.44, to);
      if (s === 0) for (const m of up(ct, 60)) N("brass", m, t, 0.2, to, { dur: 0.26, rel: 0.12, pan: (m % 3 - 1) * 0.3 });
      if (s === 0 && bb % 2 === 0) N("timp", near(cr, 46), t, 0.5, to);
      if (s === 0 || s === 8) N("knock", 60, t, s ? 0.34 : 0.5, to);
      if (s === 4 || s === 12) N("snap", 60, t, 0.36, to, { pan: -0.1 });
      if (s % 4 === 2) N("shaker", 60, t, 0.18, to, { pan: 0.25 });
      if (M.cur.phase >= 2 && s % 2 === 1) N("shaker", 60, t, 0.1, to, { pan: -0.25 });
    } else {
    if (s % 2 === 0) N("pizz", R + [0, 0, 7, 0, 0, 7, 12, 7][s / 2], t, s === 0 ? 0.75 : 0.52, to);
    if (s === 0 || s === 6 || (s === 12 && bb % 2 === 1)) for (const m of up(ct, 60)) N("brass", m, t, s === 0 ? 0.3 : 0.24, to, { dur: s === 0 ? 0.3 : 0.18, rel: 0.12, pan: (m % 3 - 1) * 0.3 });
    if (s === 0 || s === 8) N("timp", near(cr, 46), t, s ? 0.5 : 0.75, to);
    if (bb === 7 && s >= 12) N("timp", near((7 + tr + 12) % 12, 46), t, 0.25 + (s - 12) * 0.1, to);
    if (s === 0 || s === 3 || s === 8 || s === 11) N("knock", 60, t, s % 8 ? 0.38 : 0.65, to);
    if (s === 4 || s === 12) N("snap", 60, t, 0.5, to, { pan: -0.1 });
    N("shaker", 60, t, s % 4 === 2 ? 0.26 : 0.12, to, { pan: 0.25 });
    if (king && s % 4 === 0) N("tamb", 60, t, 0.22, to, { pan: -0.3 });
    if (rage) {                                          // Wut-Phase: Rhythmus-Schicht + Blech-Stöße
      if (s % 2 === 1) N("snap", 60, t, 0.16, to, { pan: 0.35 });
      if (s === 2 || s === 10) N("knock", 60, t, 0.42, to);
      if (s === 14) for (const m of up(ct, 62)) N("brass", m, t, 0.2, to, { dur: 0.12, rel: 0.1 });
    }
    }
    if (s % 2 === 0) {
      const row = MEL[bb], v = row[s / 2];
      if (typeof v === "number") {
        let k = s / 2 + 1, n = 1; while (k < 8 && row[k] === "-") { n++; k++; }
        const m = v + tr;
        N(bw.lead, m, t, 0.5, to, { dur: n * 2 * sec.sd - 0.05, rel: 0.14 });
        N(bw.dbl, m + 12 > 98 ? m : m + 12, t, king ? 0.16 : 0.14, to, { pan: 0.35 });
      }
    }
  }
  function step(t, audible) {
    const sec = M.sec, si = M.si, s = si % 16, bar = Math.floor(si / 16);
    if (s % 8 === 0 && decide(s, t)) return step(t, audible);   // neuer Abschnitt beginnt genau hier
    if (audible && E.musicOn && !M.dead) {
      const k = M.sec.kind;
      if (k === "bossA" || k === "bossB") bossStep(M.sec, s, bar, t);
      else if (k === "rec") recLayer(M.sec, s, bar, t);
      else if (k === "town") townStep(M.sec, s, bar, t);
      else if (k === "LM") lmStep(M.sec, s, bar, t);
      else if (k !== "silent") worldStep(M.sec, s, bar, t);
    }
    M.si++;
    if (M.si >= M.sec.bars * 16) nextSection(t + M.sd);
  }
  M.start = (t) => { M.t = t; M.running = true; M.cycle = 0; M.cur.where = "none"; restart(t, true); };
  /** plant alle 16tel im Fenster [scheduled, horizon) — einzige Zeitquelle ist ac.currentTime */
  M.tick = (now, horizon) => {
    if (!M.running) return;
    if (now - M.t > 1) { M.t = now + 0.05; M.cur.where = "none"; }   // nach langer Blockade nicht nachholen: sauber neu ansetzen
    let guard = 0;
    while (M.t < horizon && guard++ < 400) { const t = M.t, sd = M.sd; step(t, t >= now - 0.005); M.t = t + sd; }
  };
  M.setDead = (on) => {
    if (on === M.dead) return;
    M.dead = on; E.life.gain.setTargetAtTime(on ? 0 : 1, ac.currentTime, on ? 0.3 : 0.5);
  };
  M.info = () => ({ song: M.cur.song, boss: M.cur.boss, where: M.cur.where, biome: M.cur.biome, comb: M.cur.comb, inten: +M.inten.toFixed(2), sec: M.sec && M.sec.kind, bpm: M.sec && M.sec.bpm, key: M.cur.key, cycle: M.cycle, sections: M.nSec, queue: M.queue.slice(), phase: M.cur.phase, eve: M.cur.eve, running: M.running, bar: Math.floor(M.si / 16) });

  // ---------- Stinger: in der Tonart der laufenden Musik, auf das nächste 16tel quantisiert ----------
  M.stinger = (kind, at) => {
    const now = at ?? ac.currentTime;
    let t = now + 0.02;
    if (M.running && M.t > now) t = M.t + Math.max(0, Math.ceil((now + 0.03 - M.t) / M.sd)) * M.sd;
    const key = M.cur.key || { root: 3, minor: false }, minor = key.minor || M.cur.song === "boss";
    // Vorlagen: Dur in Es (3), Moll in c (0) → in die laufende Tonart schieben (kleinster Weg)
    let tr = (key.root - (minor ? 0 : 3) + 12) % 12; if (tr > 6) tr -= 12;
    const to = E.stingBus, o = { cat: "sfx" };
    const S = (inst, m, k, vel, x = {}) => E.note(inst, m + tr, t + k * S16, vel, { ...o, ...x, to });
    switch (kind) {
      case "levelup": {
        const mot = minor ? [72, 75, 72, 74, 79] : [75, 79, 75, 77, 82];
        mot.forEach((m, i) => { S("harp", m, i, 0.55, { pan: -0.2 + i * 0.1 }); S("bell", m + 12, i, 0.2, { pan: 0.3 }); });
        (minor ? [84, 87, 91] : [87, 91, 94]).forEach((m, i) => S("bell", m, 5 + i * 0.12, 0.34, { pan: -0.4 + i * 0.4 }));
        E.duck(-6, t, 1.3, 0.9); break;
      }
      case "stairs": (minor ? [79, 77, 75, 74, 72, 70, 68, 67, 63] : [82, 79, 77, 75, 72, 70, 67, 65, 63]).forEach((m, i) => S("harp", m, i * 0.5, 0.42 - i * 0.025, { pan: 0.4 - i * 0.1 })); break;
      case "portal":
        (minor ? [60, 62, 63, 67, 68, 72, 74, 75, 79] : [63, 65, 67, 70, 72, 75, 77, 79, 82]).forEach((m, i) => S("harp", m, i * 0.5, 0.3 + i * 0.02, { pan: -0.4 + i * 0.1 }));
        (minor ? [84, 87, 91] : [87, 91, 94]).forEach((m, i) => S("bell", m, 4.6 + i * 0.1, 0.3, { pan: -0.3 + i * 0.3 })); break;
      case "special":
        (minor ? [72, 75, 79, 84, 87] : [75, 79, 82, 87, 91]).forEach((m, i) => S("harp", m, i * 0.35, 0.42, { pan: -0.4 + i * 0.2 }));
        (minor ? [84, 87, 91] : [87, 91, 94]).forEach((m) => S("bell", m, 2.2, 0.26, { pan: (m % 3 - 1) * 0.3 }));
        break;
      case "phase": case "rage": {
        const ch = kind === "rage" ? [60, 63, 66] : [60, 63, 67];
        for (const k of [0, 2, 4]) for (const m of ch) S("brass", m + (k === 4 ? 7 : 0), k, 0.3, { dur: k === 4 ? 0.7 : 0.15, rel: 0.25, pan: (m % 3 - 1) * 0.3 });
        S("timp", 48, 0, 0.7); S("timp", 55, 4, 0.8); S("crash", 60, 4, 0.36);
        break;
      }
      case "victory": {
        [[0, 75, 1.5], [2, 75, 1], [3, 75, 1], [4, 79, 2], [6, 82, 2], [8, 87, 10]].forEach(([k, m, d]) => { S("lead", m, k, 0.5, { dur: d * S16 - 0.04, rel: 0.2 }); S("bell", m + 12, k, 0.2, { pan: 0.3 }); });
        for (const k of [0, 8]) for (const m of [63, 67, 70]) S("brass", m, k, 0.28, { dur: k ? 1.6 : 0.25, rel: 0.4, pan: (m % 3 - 1) * 0.3 });
        S("timp", 51, 0, 0.7); S("timp", 51, 8, 0.8); S("crash", 60, 8, 0.4);
        E.duck(-10, t, 3.0, 1.5); break;
      }
      case "bossWin":
        for (const m of [63, 67, 70]) S("brass", m, 0, 0.3, { dur: 0.9, rel: 0.4 });
        S("crash", 60, 0, 0.4);
        [63, 67, 70, 75, 79, 82].forEach((m, i) => S("harp", m, 1 + i * 0.5, 0.4, { pan: -0.4 + i * 0.16 }));
        [87, 91, 94, 99].forEach((m, i) => S("bell", m, 5 + i * 0.5, 0.3, { pan: -0.3 + i * 0.2 }));
        E.duck(-8, t, 2.2, 1.2); break;
      case "die":
        [[0, 79, 2], [3, 77, 2], [6, 75, 3], [10, 72, 8]].forEach(([k, m, d]) => S("lead", m, k, 0.36, { dur: d * S16, rel: 0.4 }));
        for (const m of [56, 60, 63]) S("padWarm", m, 0, 0.3, { dur: 1.3, rel: 0.6 });
        for (const m of [55, 60, 63]) S("padWarm", m, 10, 0.3, { dur: 1.6, rel: 1.0 });
        break;
    }
  };
  return M;
}
