/* music.js — adaptive Musik + Stinger. Look-ahead-Scheduler: plant Noten 16tel-genau auf
   AudioContext.currentTime (setInterval weckt nur auf, bestimmt nie das Timing) (MIT)
   Die CC0-Stadtmelodie wurde vermessen: Es-Dur, 90 BPM, 4/4, exakt 28 Takte → alle Schichten laufen
   sample-genau zur Aufnahme und nutzen pro Halbtakt nur Töne, die dort auch in der Aufnahme klingen. */
export const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4, S16 = BEAT / 4, LOOP_BARS = 28, LOOP = LOOP_BARS * BAR;

// Akkord-Karte der Aufnahme, pro Halbtakt: Basston + klingende Tonklassen (C=0, Es=3, B=10)
const ROOTS = [3, 10, 0, 7, 3, 10, 0, 7, 3, 3, 8, 7, 7, 7, 3, 10, 3, 10, 8, 7, 3, 7, 3, 10, 3, 3, 0, 7,
  3, 3, 0, 7, 3, 3, 8, 7, 7, 7, 3, 10, 3, 10, 8, 7, 3, 7, 3, 10, 3, 3, 0, 7, 3, 10, 0, 7];
const TONES = [[3, 7, 10], [10, 5, 3], [0, 3, 10], [7, 0, 2], [3, 7, 10], [10, 5, 3], [3, 0, 7], [7, 0, 2], [3, 7, 10], [3, 10, 5], [7, 8, 0], [7, 5, 8], [7, 3, 5], [7, 8, 10],
  [10, 7, 3], [10, 5, 7], [3, 7, 10], [10, 0, 3], [8, 0, 3], [2, 3, 7], [3, 7, 5], [7, 10, 5], [10, 7, 3], [10, 5, 7], [3, 7, 10], [3, 10, 5], [0, 3, 7], [7, 0, 2],
  [3, 7, 10], [3, 10, 5], [3, 0, 7], [7, 2, 0], [3, 7, 10], [3, 10, 5], [8, 7, 0], [7, 5, 8], [7, 3, 5], [7, 10, 5], [10, 7, 3], [10, 5, 7], [3, 7, 10], [10, 0, 5],
  [8, 0, 3], [2, 3, 7], [7, 3, 5], [7, 10, 5], [10, 7, 3], [10, 5, 7], [3, 7, 10], [3, 10, 5], [0, 3, 10], [7, 0, 2], [7, 3, 10], [10, 5, 3], [3, 0, 7], [7, 0, 2]];
// Boss-Thema: c-Moll (Paralleltonart), 8 Takte; Melodie zitiert das Stadt-Motiv „C-Es-C-D-G" (Takt 2 der Aufnahme)
const BOSSC = [[0, [0, 3, 7]], [8, [8, 0, 3]], [3, [3, 7, 10]], [10, [10, 2, 5]], [0, [0, 3, 7]], [8, [8, 0, 3]], [5, [5, 8, 0]], [7, [7, 11, 2]]];
const BOSSMEL = [[72, 75, 72, 74, 67, "-", "-", "-"], [68, 72, 68, 70, 75, "-", "-", "-"], [75, 79, 75, 77, 70, "-", "-", "-"], [74, 77, 74, 75, 77, "-", "-", "-"],
  [72, 75, 72, 74, 79, "-", "-", "-"], [80, 79, 77, 75, 72, "-", "-", "-"], [77, 80, 79, 77, 75, "-", 74, "-"], [74, "-", "-", "-", 71, "-", "-", "-"]];
// Biome: Pad-Klang, Tiefpass der Aufnahme (Höhlenklang), Ornament-Muster
const BIO = [null,
  { pad: "padWarm", lp: 2400, orn: "moos" }, { pad: "padGlass", lp: 3200, orn: "kristall" }, { pad: "padSweet", lp: 2800, orn: "zucker" },
  { pad: "padAir", lp: 2600, orn: "frost" }, { pad: "padEmber", lp: 2000, orn: "glut" }];
// Pegel der Schichten (linear, vor dem Musik-Bus)
const LV = { recTown: 0.95, recDun: 0.6, pad: 0.2, orn: 0.3, comb: 0.42, drum: 0.5, boss: 0.34 };

const near = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;           // tiefster Ton ≥ lo mit Tonklasse pc
const safe = (root, t) => t.filter(pc => { const iv = (pc - root + 12) % 12; return iv !== 1 && iv !== 6; });
const up = (tones, lo) => tones.map(pc => near(pc, lo)).sort((a, b) => a - b);

export function createMusic(E) {
  const ac = E.ac;
  const mk = v => { const g = ac.createGain(); g.gain.value = v; g.connect(E.musicIn); return g; };
  const L = { rec: mk(0), pad: mk(0), orn: mk(0), comb: mk(0), drum: mk(0), boss: mk(0) };
  L.recLP = ac.createBiquadFilter(); L.recLP.type = "lowpass"; L.recLP.frequency.value = 20000; L.recLP.Q.value = 0.5; L.recLP.connect(L.rec);
  const M = {
    L, t0: 0, step: 0, running: false, src: null, inten: 0, dead: false, bossBar: 0,
    want: { where: "none", biome: 0, boss: 0 },
    cur: { where: "none", biome: 0, song: "main", comb: 0, boss: 0 },
  };
  const ramp = (g, v, t, tau) => { const p = g.gain || g; p.cancelScheduledValues(t); p.setTargetAtTime(v, t, Math.max(0.005, tau / 3)); };
  const N = (inst, m, t, vel, to, o = {}) => E.note(inst, m, t, vel, { ...o, to });

  // ---------- Aufnahme (Leitmotiv) sample-genau an der Uhr ----------
  M.startRec = (t) => {
    M.stopRec();
    if (!E.musicOn) return;
    if (E.rec) {
      const s = ac.createBufferSource(); s.buffer = E.rec; s.loop = true; s.connect(L.recLP);
      s.start(t, ((t - M.t0) % LOOP + LOOP) % LOOP); M.src = s;
    } else if (E.el) { E.el.play().catch(() => { }); }
  };
  M.stopRec = () => {
    if (M.src) { try { M.src.stop(); } catch (e) { } M.src.disconnect(); M.src = null; }
    if (E.el) E.el.pause();
  };
  M.start = (t) => { M.t0 = t; M.step = 0; M.running = true; M.startRec(t); };
  M.resume = () => { if (M.running) M.startRec(ac.currentTime + 0.05); };

  // ---------- Übergänge: nur an Halbtakt-/Taktgrenzen ----------
  function applyPlace(t, fade = 0.6) {
    const c = M.cur;
    if (c.song === "boss") return;
    if (c.where === "dungeon") {
      const B = BIO[c.biome] || BIO[1];
      ramp(L.rec, LV.recDun, t, fade); L.recLP.frequency.setTargetAtTime(B.lp + c.comb * 900, t, 0.3);
      ramp(L.pad, LV.pad, t, fade); ramp(L.orn, LV.orn, t, fade);
    } else {
      ramp(L.rec, c.where === "town" ? LV.recTown : 0, t, fade); L.recLP.frequency.setTargetAtTime(20000, t, 0.3);
      for (const k of ["pad", "orn", "comb", "drum"]) ramp(L[k], 0, t, fade);
      c.comb = 0;
    }
  }
  function decide(bar, s, t) {
    const w = M.want, c = M.cur;
    if (w.where !== c.where || w.biome !== c.biome) { c.where = w.where; c.biome = w.biome; applyPlace(t); }
    if (s === 0) {
      const wb = c.where === "dungeon" ? w.boss : 0;
      if (wb && c.song !== "boss") {                     // Boss-Thema startet auf der Eins, Aufnahme blendet in 1/2 Schlag aus
        c.song = "boss"; c.boss = wb; c.comb = 0; M.bossBar = bar;
        ramp(L.rec, 0, t, BEAT * 0.5); ramp(L.pad, 0, t, BEAT); ramp(L.orn, 0, t, BEAT); ramp(L.comb, 0, t, BEAT * 0.5); ramp(L.drum, 0, t, BEAT * 0.5);
        ramp(L.boss, LV.boss, t, 0.03);
        N("crash", 60, t, 0.5, L.boss);
      } else if (!wb && c.song === "boss") {             // zurück: Aufnahme blendet über 2 Schläge wieder ein
        c.song = "main"; ramp(L.boss, 0, t, BEAT); applyPlace(t, BEAT * 2);
      } else if (wb) c.boss = wb;
    }
    if (c.song === "main" && c.where === "dungeon") {   // Kampf-Stufe mit Hysterese
      const x = M.inten; let lv = c.comb;
      if (x > 0.62) lv = 2; else if (x > 0.22 && lv < 1) lv = 1;
      if (x < 0.08) lv = 0; else if (x < 0.4 && lv === 2) lv = 1;
      if (lv !== c.comb) {
        c.comb = lv;
        ramp(L.comb, lv >= 1 ? LV.comb : 0, t, lv >= 1 ? 0.06 : BEAT * 1.5);
        ramp(L.drum, lv >= 2 ? LV.drum : 0, t, lv >= 2 ? 0.06 : BEAT * 1.5);
        L.recLP.frequency.setTargetAtTime((BIO[c.biome] || BIO[1]).lp + lv * 900, t, 0.4);
      }
    }
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
  function padStep(h, s, t, root, tones) {
    const same = (a, b) => ROOTS[a] === ROOTS[b] && TONES[a].join() === TONES[b].join();
    if (s === 8 && same(h, h - 1)) return;               // gleicher Akkord → Pad klingt weiter
    const dur = s === 0 && same(h, h + 1) ? BAR : BAR / 2;
    const inst = (BIO[M.cur.biome] || BIO[1]).pad;
    N(inst, near(root, 48), t, 0.5, L.pad, { dur: dur + 0.12, rel: 0.7 });
    for (const m of up(tones, 60)) N(inst, m, t, 0.36, L.pad, { dur: dur + 0.12, rel: 0.7, pan: (m % 3 - 1) * 0.35 });
  }
  function comb1(s, t, bar, root) {
    const R = near(root, 46), pat = { 0: [0, 0.62], 3: [0, 0.42], 6: [0, 0.5], 8: [0, 0.56], 11: [0, 0.4], 14: [7, 0.45] }, p = pat[s];
    if (p) { let m = R + p[0]; if (m > 60) m -= 12; N("pizz", m, t, p[1], L.comb); }
    if (s % 4 === 2) N("shaker", 60, t, 0.3, L.comb, { pan: 0.25 }); else if (s % 4 === 0) N("shaker", 60, t, 0.14, L.comb, { pan: 0.25 });
  }
  function comb2(s, t, bar, root, tones) {
    if (s === 0 || s === 8) N("knock", 60, t, 0.7, L.drum); else if (s === 11) N("knock", 60, t, 0.3, L.drum);
    if (s === 4 || s === 12) N("snap", 60, t, 0.5, L.drum, { pan: -0.1 });
    if (s % 2 === 1) N("shaker", 60, t, 0.1, L.drum, { pan: -0.25 });
    if ((M.cur.biome === 3 || M.cur.biome === 4) && s === 12) N("tamb", 60, t, 0.2, L.drum, { pan: 0.3 });
    if (bar % 4 === 3 && s >= 12) { const u = up(tones, 67); N("harp", u[(s - 12) % u.length] + (s === 15 ? 12 : 0), t, 0.32, L.drum, { pan: 0.2 }); }
  }
  function bossStep(bar, s, t) {
    const bb = ((bar - M.bossBar) % 8 + 8) % 8, [cr, ct] = BOSSC[bb], R = near(cr, 46), king = M.cur.boss === 2, to = L.boss;
    if (s % 2 === 0) N("pizz", R + [0, 0, 7, 0, 0, 7, 12, 7][s / 2], t, s === 0 ? 0.75 : 0.52, to);
    if (s === 0 || s === 6 || (s === 12 && bb % 2 === 1)) for (const m of up(ct, 60)) N("brass", m, t, s === 0 ? 0.3 : 0.24, to, { dur: s === 0 ? 0.3 : 0.18, rel: 0.12, pan: (m % 3 - 1) * 0.3 });
    if (s === 0 || s === 8) N("timp", near(cr, 46), t, s ? 0.5 : 0.75, to);
    if (bb === 7 && s >= 12) N("timp", near(7, 46), t, 0.25 + (s - 12) * 0.1, to);
    if (s === 0 || s === 3 || s === 8 || s === 11) N("knock", 60, t, s % 8 ? 0.38 : 0.65, to);
    if (s === 4 || s === 12) N("snap", 60, t, 0.5, to, { pan: -0.1 });
    N("shaker", 60, t, s % 4 === 2 ? 0.26 : 0.12, to, { pan: 0.25 });
    if (king && s % 4 === 0) N("tamb", 60, t, 0.22, to, { pan: -0.3 });
    if (s % 2 === 0) {
      const row = BOSSMEL[bb], v = row[s / 2];
      if (typeof v === "number") {
        let k = s / 2 + 1, n = 1; while (k < 8 && row[k] === "-") { n++; k++; }
        N("lead", v, t, 0.5, to, { dur: n * 2 * S16 - 0.05, rel: 0.14 });
        if (king) N("bell", v + 12, t, 0.16, to, { pan: 0.35 });
      }
    }
  }
  function step(i, t, audible) {
    const s = i % 16, bar = Math.floor(i / 16);
    if (s % 8 === 0) decide(bar, s, t);
    if (!audible || !E.musicOn || M.dead) return;
    const c = M.cur;
    if (c.song === "boss") return bossStep(bar, s, t);
    if (c.where !== "dungeon") return;
    const h = (bar % LOOP_BARS) * 2 + (s >= 8 ? 1 : 0), root = ROOTS[h], tones = safe(root, TONES[h]);
    if (s === 0 || s === 8) padStep(h, s, t, root, tones);
    ORN[(BIO[c.biome] || BIO[1]).orn](s, t, bar, root, tones);
    if (c.comb >= 1) comb1(s, t, bar, root);
    if (c.comb >= 2) comb2(s, t, bar, root, tones);
  }
  /** plant alle 16tel im Fenster [scheduled, horizon) — einzige Zeitquelle ist ac.currentTime */
  M.tick = (now, horizon) => {
    if (!M.running) return;
    const lag = now - (M.t0 + M.step * S16);
    if (lag > 1) M.step += Math.floor(lag / S16);        // nach langer Blockade nicht nachholen
    while (M.t0 + M.step * S16 < horizon) { const t = M.t0 + M.step * S16; step(M.step, t, t >= now - 0.005); M.step++; }
  };
  M.setDead = (on) => {
    if (on === M.dead) return;
    M.dead = on; E.life.gain.setTargetAtTime(on ? 0 : 1, ac.currentTime, on ? 0.3 : 0.5);
  };
  M.info = () => ({ song: M.cur.song, where: M.cur.where, biome: M.cur.biome, comb: M.cur.comb, inten: +M.inten.toFixed(2), bar: Math.floor(M.step / 16) % LOOP_BARS, running: M.running });

  // ---------- Stinger: in der Tonart der laufenden Musik, auf das nächste 16tel quantisiert ----------
  M.stinger = (kind, at) => {
    const now = at ?? ac.currentTime;
    let t = now + 0.02;
    if (M.running) t = M.t0 + Math.ceil((now + 0.03 - M.t0) / S16) * S16;
    const boss = M.cur.song === "boss", to = E.stingBus, o = { cat: "sfx" };
    const S = (inst, m, k, vel, x = {}) => E.note(inst, m, t + k * S16, vel, { ...o, ...x, to });
    switch (kind) {
      case "levelup": {
        const mot = boss ? [72, 75, 72, 74, 79] : [75, 79, 75, 77, 82];
        mot.forEach((m, i) => { S("harp", m, i, 0.55, { pan: -0.2 + i * 0.1 }); S("bell", m + 12, i, 0.2, { pan: 0.3 }); });
        (boss ? [84, 87, 91] : [87, 91, 94]).forEach((m, i) => S("bell", m, 5 + i * 0.12, 0.34, { pan: -0.4 + i * 0.4 }));
        E.duck(-6, t, 1.3, 0.9); break;
      }
      case "stairs": [82, 79, 77, 75, 72, 70, 67, 65, 63].forEach((m, i) => S("harp", m, i * 0.5, 0.42 - i * 0.025, { pan: 0.4 - i * 0.1 })); break;
      case "portal":
        [63, 65, 67, 70, 72, 75, 77, 79, 82].forEach((m, i) => S("harp", m, i * 0.5, 0.3 + i * 0.02, { pan: -0.4 + i * 0.1 }));
        [87, 91, 94].forEach((m, i) => S("bell", m, 4.6 + i * 0.1, 0.3, { pan: -0.3 + i * 0.3 })); break;
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
