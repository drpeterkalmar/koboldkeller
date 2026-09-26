/* sfxlib.js — Klang-Rezepte (Effekte, Instrumente, Ambience). Werden EINMAL per OfflineAudioContext
   zu AudioBuffern gerendert; zur Laufzeit spielt audio.js nur noch Puffer ab (MIT) */
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export function rng(seed) {
  let s = seed | 0;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Es-Dur-Pentatonik (= c-Moll-Pentatonik): passt zur Stadtmelodie UND zum Boss-Thema
export const PENTA = [3, 5, 7, 10, 0];
const pentHigh = [87, 89, 91, 94, 96, 99, 101, 103];

// ---------- Rauschen (einmal pro Samplerate) ----------
const NB = {};
export function mkBuf(ch, len, sr) {
  try { return new AudioBuffer({ numberOfChannels: ch, length: len, sampleRate: sr }); }
  catch (e) { const C = window.OfflineAudioContext || window.webkitOfflineAudioContext; return new C(1, 1, sr).createBuffer(ch, len, sr); }
}
function noiseBuf(sr, pink) {
  const k = sr + (pink ? "p" : "w");
  if (NB[k]) return NB[k];
  const n = sr * 3, b = mkBuf(1, n, sr), d = b.getChannelData(0), r = rng(sr + (pink ? 7 : 3));
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    if (!pink) { d[i] = w; continue; }
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  return (NB[k] = b);
}

// ---------- Baukasten für einen (Offline-)Kontext ----------
function env(p, t, a, peak, d, hold = 0) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  if (hold) p.setValueAtTime(peak, t + a + hold);
  p.setTargetAtTime(0, t + a + hold, Math.max(0.0008, d / 4.6));
}
export function kit(ac, dest) {
  const sr = ac.sampleRate;
  const K = {
    ac, dest, sr,
    gain(v = 1, to = dest) { const n = ac.createGain(); n.gain.value = v; n.connect(to); return n; },
    filter(type, f, q = 0.707, to = dest) { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; n.connect(to); return n; },
    pan(p, to = dest) { if (!ac.createStereoPanner || ac.destination.channelCount < 2) return to; const n = ac.createStereoPanner(); n.pan.value = p; n.connect(to); return n; },
    osc(type, f, t, d, vol, o = {}) {
      const a = o.a ?? 0.002, os = ac.createOscillator(), g = ac.createGain();
      os.type = type; os.frequency.setValueAtTime(f, t);
      if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + (o.g || d));
      if (o.det) os.detune.value = o.det;
      if (o.vib) {
        const l = ac.createOscillator(), lg = ac.createGain();
        l.frequency.value = o.vib[0];
        lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * (Math.pow(2, o.vib[1] / 1200) - 1), t + (o.vib[2] || 0.2));
        l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + a + (o.hold || 0) + d + 0.1);
      }
      g.gain.value = 0; env(g.gain, t, a, vol, d, o.hold || 0);
      os.connect(g); g.connect(o.to || dest);
      os.start(t); os.stop(t + a + (o.hold || 0) + d + 0.05);
      return { os, g };
    },
    noise(t, d, vol, o = {}) {
      const s = ac.createBufferSource(); s.buffer = noiseBuf(sr, o.pink); s.loop = true;
      let node = s, fl = null;
      if (o.type) {
        fl = ac.createBiquadFilter(); fl.type = o.type; fl.Q.value = o.q ?? 0.8;
        fl.frequency.setValueAtTime(o.f, t); if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + (o.g || d));
        s.connect(fl); node = fl;
      }
      const a = o.a ?? 0.002, g = ac.createGain(); g.gain.value = 0; env(g.gain, t, a, vol, d, o.hold || 0);
      node.connect(g); g.connect(o.to || dest);
      s.start(t, (o.off ?? Math.random()) * 2.5); s.stop(t + a + (o.hold || 0) + d + 0.05);
      return { s, fl, g };
    },
    bell(f, t, d, vol, o = {}) {
      const P = o.p || [[1, 1, 1], [2, 0.3, 0.55], [3, 0.1, 0.3], [4.2, 0.06, 0.18], [5.4, 0.035, 0.1]];
      for (const [r, a, dd] of P) if (f * r < sr * 0.45) K.osc("sine", f * r, t, d * dd, vol * a, { a: o.a ?? 0.0015, to: o.to, det: o.det });
    },
  };
  return K;
}
const J = (r, a) => 1 + (r() - 0.5) * a;   // Streuung ±a/2

// =====================================================================
// EFFEKTE — n Varianten, len Sekunden, ch Kanäle. fn(K, t0, v, r)
// Schichten: Transient (Klick) + Körper + Nachklang. Tonale Teile in Es-Pentatonik.
// =====================================================================
export const SFX_DEFS = {
  click: { n: 3, len: 0.24, fn(K, t, v, r) {
    const f = 1500 + v * 160;
    K.osc("sine", f * 1.35, t, 0.03, 0.55, { f1: f, g: 0.012 });
    K.noise(t, 0.01, 0.3, { type: "highpass", f: 3500 });
    K.bell(mtof([96, 94, 99][v]), t + 0.004, 0.18, 0.14);
  } },
  swing: { n: 5, len: 0.34, fn(K, t, v, r) {
    const T = 0.2 + r() * 0.06, pk = 0.06 + r() * 0.035;
    const w = K.noise(t, T - pk, 0.9, { type: "bandpass", q: 1.1, f: 380 * J(r, 0.4), a: pk, pink: true });
    w.fl.frequency.cancelScheduledValues(t); w.fl.frequency.setValueAtTime(380 * J(r, 0.4), t);
    w.fl.frequency.exponentialRampToValueAtTime(1700 * J(r, 0.5), t + pk); w.fl.frequency.exponentialRampToValueAtTime(650 * J(r, 0.3), t + T);
    K.noise(t + 0.01, T * 0.7, 0.16, { type: "highpass", f: 4200, a: pk });                         // Luft
    K.noise(t, T * 0.8, 0.28, { type: "bandpass", f: 260 * J(r, 0.3), q: 1.4, a: pk * 0.8, pink: true }); // Zug
  } },
  hitL: { n: 4, len: 0.3, fn(K, t, v, r) {
    const p = J(r, 0.2);
    K.noise(t, 0.008, 0.35, { type: "highpass", f: 3000 * p });
    K.osc("sine", 320 * p, t, 0.1, 0.6, { f1: 175 * p, g: 0.06 });
    K.noise(t + 0.002, 0.05, 0.35, { type: "bandpass", f: 1600 * p, q: 1.3, pink: true });
    K.osc("sine", 480 * p, t + 0.012, 0.06, 0.18, { f1: 900 * p, g: 0.04 });                           // „blupp"
  } },
  hitM: { n: 4, len: 0.36, fn(K, t, v, r) {
    const p = J(r, 0.16), q = J(r, 0.3);
    K.noise(t, 0.011, 0.5, { type: "highpass", f: 2600 * q });                                          // Klick
    K.osc("sine", 235 * p, t, 0.15, 0.95, { f1: 118 * p, g: 0.07 });                                  // Körper „pomf"
    K.osc("triangle", 470 * p, t, 0.06, 0.28, { f1: 240 * p, g: 0.05 });
    K.noise(t + 0.002, 0.075, 0.5, { type: "bandpass", f: 1100 * q, q: 1.1, pink: true });              // Klatsch
    K.osc("sine", 700 * p, t + 0.022, 0.05, 0.08, { f1: 1150 * p, g: 0.03 });                          // niedliches „bip"
  } },
  hitH: { n: 3, len: 0.5, fn(K, t, v, r) {
    const p = J(r, 0.14);
    K.noise(t, 0.012, 0.55, { type: "highpass", f: 2200 });
    K.osc("sine", 185 * p, t, 0.22, 1.0, { f1: 96 * p, g: 0.1 });
    K.osc("triangle", 370 * p, t, 0.08, 0.32, { f1: 180 * p, g: 0.06 });
    K.noise(t + 0.002, 0.12, 0.6, { type: "lowpass", f: 2600, f1: 600, g: 0.1, pink: true });           // Knirschen
    for (const [f, a] of [[1230, 0.1], [2890, 0.07], [4120, 0.05]]) K.osc("sine", f * p, t + 0.004, 0.16, a); // kurzes „Kling"
  } },
  crit: { n: 3, len: 0.75, ch: 2, fn(K, t, v, r) {
    const s = K.noise(t, 0.09, 0.35, { type: "bandpass", f: 2500, f1: 7500, g: 0.08, q: 1.2 });
    K.osc("sine", 540, t, 0.11, 0.45, { f1: 180, g: 0.08 });                                           // „Pow"
    const nn = [[94, 99], [91, 96], [96, 101]][v];
    K.bell(mtof(nn[0]), t + 0.012, 0.55, 0.32, { to: K.pan(-0.3) });
    K.bell(mtof(nn[1]), t + 0.055, 0.6, 0.3, { to: K.pan(0.3) });
  } },
  poof: { n: 4, len: 0.9, ch: 2, fn(K, t, v, r) {
    const p = J(r, 0.15);
    K.osc("sine", 420 * p, t, 0.05, 0.35, { f1: 900 * p, g: 0.035 });                                 // „plopp"
    K.noise(t + 0.01, 0.34, 0.85, { type: "lowpass", f: 2600 * p, f1: 420, g: 0.3, q: 0.5, a: 0.012, pink: true }); // Puff
    K.noise(t + 0.01, 0.2, 0.3, { type: "bandpass", f: 700 * p, q: 0.9, pink: true });
    const sets = [[91, 94, 99], [87, 91, 96], [89, 94, 101], [94, 96, 103]][v];
    sets.forEach((m, i) => K.bell(mtof(m), t + 0.07 + i * 0.05, 0.5, 0.2, { to: K.pan((i - 1) * 0.45) }));   // Glitzer
  } },
  bossPoof: { n: 1, len: 2.6, ch: 2, fn(K, t, v, r) {
    K.osc("sine", 300, t, 0.08, 0.4, { f1: 700, g: 0.06 });
    K.noise(t + 0.01, 0.9, 1.0, { type: "lowpass", f: 3200, f1: 300, g: 0.8, q: 0.5, a: 0.02, pink: true });
    K.osc("sine", 170, t, 0.55, 0.55, { f1: 98, g: 0.4 });                                             // „Fwumm"
    const cas = [79, 82, 84, 87, 89, 91, 94, 96, 99, 101, 103, 106];
    cas.forEach((m, i) => K.bell(mtof(m), t + 0.12 + i * 0.055, 0.9, 0.16, { to: K.pan(i % 2 ? 0.55 : -0.55) }));
    K.noise(t + 0.15, 1.2, 0.08, { type: "highpass", f: 7000, a: 0.4 });
  } },
  coin: { n: 3, len: 0.62, fn(K, t, v, r) {                  // Referenz C6; Tonhöhe setzt die Laufzeit (Skala)
    const f = mtof(84), br = [1, 0.8, 1.25][v];
    K.noise(t, 0.004, 0.22, { type: "highpass", f: 6000 });
    K.bell(f, t, 0.13, 0.55, { p: [[1, 1, 1], [2, 0.25 * br, 0.6], [3, 0.1 * br, 0.4]] });
    K.bell(f * 4 / 3, t + 0.065, 0.52, 0.7, { p: [[1, 1, 1], [2, 0.3 * br, 0.6], [3, 0.12 * br, 0.4], [4.2, 0.05 * br, 0.2]] });
  } },
  bubble: { n: 3, len: 0.5, fn(K, t, v, r) {
    for (let i = 0; i < 3; i++) { const f0 = 250 + r() * 170, ti = t + i * (0.055 + r() * 0.025); K.osc("sine", f0, ti, 0.075, 0.5, { f1: f0 * 2.7, g: 0.05, a: 0.004 }); }
    K.noise(t, 0.25, 0.07, { type: "bandpass", f: 2600, q: 2, a: 0.05 });
    K.bell(mtof(pentHigh[(r() * 5) | 0]), t + 0.18, 0.25, 0.08);
  } },
  pop: { n: 4, len: 0.3, fn(K, t, v, r) {
    const p = J(r, 0.3);
    K.osc("sine", 650 * p, t, 0.05, 0.7, { f1: 1500 * p, g: 0.025, a: 0.001 });
    K.noise(t, 0.008, 0.35, { type: "highpass", f: 3000 });
    K.noise(t + 0.004, 0.06, 0.2, { type: "bandpass", f: 2200 * p, q: 3 });
    K.bell(mtof(pentHigh[v + 2]), t + 0.02, 0.22, 0.1);
  } },
  dodge: { n: 3, len: 0.36, fn(K, t, v, r) {
    const p = J(r, 0.2);
    K.noise(t, 0.2, 0.75, { type: "bandpass", f: 700 * p, f1: 3800 * p, g: 0.14, q: 0.9, a: 0.05, pink: true });
    K.osc("sine", 480 * p, t, 0.09, 0.2, { f1: 1150 * p, g: 0.08 });
    K.noise(t, 0.18, 0.2, { type: "highpass", f: 5000, a: 0.05 });
  } },
  hurt: { n: 3, len: 0.6, fn(K, t, v, r) {
    const p = J(r, 0.15);
    K.osc("sine", 215 * p, t, 0.11, 0.8, { f1: 120, g: 0.08 });                                         // Kissen-Plumps
    K.noise(t, 0.06, 0.4, { type: "lowpass", f: 800, pink: true });
    const fo = K.gain(0.9), f1 = K.filter("bandpass", 650, 5, fo), f2 = K.filter("bandpass", 1080, 6, fo); // „Uff" (Vokal o)
    const s = K.osc("sawtooth", 300 * p, t + 0.01, 0.2, 1, { f1: 205 * p, g: 0.2, a: 0.02, to: f1 }); s.g.connect(f2);
    K.osc("triangle", 560 * p, t + 0.03, 0.28, 0.22, { f1: 330 * p, g: 0.25, vib: [14, 40, 0.01] });   // „Boing" abwärts
  } },
  potion: { n: 2, len: 1.35, ch: 2, fn(K, t, v, r) {
    for (const ti of [t, t + 0.17]) { K.osc("sine", 190, ti, 0.1, 0.6, { f1: 430, g: 0.08, a: 0.01 }); K.noise(ti, 0.08, 0.15, { type: "bandpass", f: 600, q: 3 }); }
    const arp = [[79, 84, 87, 91], [82, 87, 91, 94]][v];
    arp.forEach((m, i) => K.bell(mtof(m), t + 0.34 + i * 0.07, 0.7, 0.3, { to: K.pan(-0.45 + i * 0.3) }));
    K.noise(t + 0.3, 0.7, 0.12, { type: "bandpass", f: 1500, f1: 7000, q: 1.5, a: 0.3 });
  } },
  heal: { n: 2, len: 1.45, ch: 2, fn(K, t, v, r) {
    for (const [m, d] of [[75, -6], [79, 5], [82, -4]]) K.osc("sine", mtof(m), t, 0.8, 0.16, { a: 0.18, hold: 0.2, det: d });
    const arp = [[82, 84, 87, 91], [84, 87, 91, 96]][v];
    arp.forEach((m, i) => K.bell(mtof(m), t + 0.05 + i * 0.06, 0.7, 0.22, { to: K.pan(0.45 - i * 0.3) }));
    K.noise(t, 0.5, 0.06, { type: "highpass", f: 6000, a: 0.4 });
  } },
  pickup: { n: 2, len: 0.9, ch: 2, fn(K, t, v, r) {
    const arp = [[82, 87, 91], [79, 87, 94]][v];
    arp.forEach((m, i) => K.bell(mtof(m), t + i * 0.055, 0.6, 0.35, { to: K.pan(-0.3 + i * 0.3) }));
    K.noise(t, 0.15, 0.1, { type: "highpass", f: 7000 });
    K.bell(mtof(99), t + 0.2, 0.4, 0.1, { to: K.pan(0.5) });
  } },
  chest: { n: 2, len: 1.9, ch: 2, fn(K, t, v, r) {
    const cr = K.filter("bandpass", 900 * J(r, 0.2), 3);
    K.osc("square", 32, t, 0.25, 0.35, { f1: 58, g: 0.25, a: 0.03, hold: 0.12, to: cr });            // Knarzen
    K.osc("sine", 190, t + 0.3, 0.1, 0.6, { f1: 130, g: 0.06 });                                        // Deckel „klonk"
    K.noise(t + 0.3, 0.06, 0.35, { type: "bandpass", f: 500, q: 1 });
    const arp = [[79, 82, 87, 91, 94, 99], [82, 84, 87, 91, 96, 99]][v];
    arp.forEach((m, i) => K.bell(mtof(m), t + 0.36 + i * 0.045, 0.8, 0.28, { to: K.pan(-0.5 + i * 0.2) }));
    K.noise(t + 0.36, 0.9, 0.08, { type: "highpass", f: 6500, a: 0.2 });
  } },
  pot: { n: 4, len: 0.5, fn(K, t, v, r) {
    K.osc("sine", 230, t, 0.05, 0.4, { f1: 160 });
    K.noise(t, 0.12, 0.6, { type: "bandpass", f: 3200 * J(r, 0.3), q: 1.3 });
    for (let i = 0; i < 6; i++) K.osc("sine", 1700 + r() * 3600, t + r() * 0.02, 0.06 + r() * 0.12, 0.12);     // Scherben
    for (let i = 0; i < 4; i++) K.noise(t + 0.05 + r() * 0.2, 0.006, 0.15, { type: "bandpass", f: 4000 + r() * 2000, q: 2 });
  } },
  stairs: { n: 2, len: 0.9, fn(K, t, v, r) {
    for (let i = 0; i < 3; i++) { const ti = t + i * 0.14, p = J(r, 0.1); K.osc("sine", (430 - i * 40) * p, ti, 0.05, 0.5, { f1: (300 - i * 30) * p, g: 0.03 }); K.noise(ti, 0.035, 0.3, { type: "bandpass", f: 1400 - i * 150, q: 1.4, pink: true }); }
    K.noise(t + 0.2, 0.4, 0.25, { type: "bandpass", f: 2500, f1: 500, g: 0.5, q: 0.8, a: 0.2 });
  } },
  portal: { n: 2, len: 1.9, ch: 2, fn(K, t, v, r) {
    const sw = K.noise(t, 1.0, 0.4, { type: "bandpass", f: 350, f1: 3500, g: 1.1, q: 4, a: 0.3, pink: true });
    const l = K.ac.createOscillator(), lg = K.ac.createGain(); l.frequency.value = 7; lg.gain.value = 300; l.connect(lg); lg.connect(sw.fl.frequency); l.start(t); l.stop(t + 1.5);
    K.osc("sine", 330, t, 1.0, 0.18, { f1: 1320, g: 0.9, a: 0.2, vib: [6, 25, 0.1] });
    [87, 91, 94, 99].forEach((m, i) => { K.bell(mtof(m), t + 0.45 + i * 0.03, 1.1, 0.22, { to: K.pan(-0.5 + i * 0.33) }); K.bell(mtof(m), t + 0.47 + i * 0.03, 1.0, 0.12, { det: v ? 8 : -8, to: K.pan(0.5 - i * 0.33) }); });
  } },
  bossWake: { n: 1, len: 2.5, ch: 2, fn(K, t, v, r) {
    // „Da-DAA!" — Blech + Pauke, freundlich-dramatisch (tiefster Ton 131 Hz)
    [[t, [48, 55, 60]], [t + 0.34, [55, 60, 67]]].forEach(([ti, notes], k) => {
      const fl = K.filter("lowpass", 400, 0.9); fl.frequency.setValueAtTime(400, ti); fl.frequency.linearRampToValueAtTime(2600, ti + 0.04); fl.frequency.setTargetAtTime(800, ti + 0.05, 0.15);
      for (const m of notes) for (const d of [-8, 8]) K.osc("sawtooth", mtof(m), ti, 0.4, 0.13 + k * 0.03, { a: 0.02, hold: 0.16 + k * 0.2, det: d, to: fl });
      K.osc("sine", 131, ti, 0.6, 0.7, { f1: 127, g: 0.3 }); K.osc("sine", 196, ti, 0.25, 0.2);
      K.noise(ti, 0.04, 0.3, { type: "lowpass", f: 1500 });
    });
    K.noise(t + 0.34, 1.4, 0.2, { type: "highpass", f: 5000, a: 0.005, to: K.pan(0.3) });
    K.noise(t + 0.34, 1.0, 0.1, { type: "bandpass", f: 9000, q: 1.5, to: K.pan(-0.3) });
  } },
  tele: { n: 3, len: 0.8, fn(K, t, v, r) {
    const pr = [[79, 84], [82, 87], [79, 86]][v];
    K.bell(mtof(pr[0]), t, 0.35, 0.4); K.bell(mtof(pr[1]), t + 0.12, 0.45, 0.42);
    K.noise(t, 0.12, 0.15, { type: "bandpass", f: 800, f1: 3500, g: 0.6, q: 3, a: 0.5 });
  } },
  slam: { n: 3, len: 0.8, fn(K, t, v, r) {
    const p = J(r, 0.14);
    K.osc("sine", 165 * p, t, 0.32, 1.0, { f1: 90, g: 0.18, a: 0.003 });
    K.osc("triangle", 330 * p, t, 0.08, 0.3, { f1: 150, g: 0.05 });
    K.noise(t, 0.28, 0.7, { type: "lowpass", f: 1600, f1: 350, g: 0.25, pink: true });
    for (let i = 0; i < 8; i++) K.noise(t + 0.04 + r() * 0.36, 0.02, 0.12, { type: "bandpass", f: 1500 + r() * 2500, q: 2 });
  } },
  shoot: { n: 3, len: 0.35, fn(K, t, v, r) {
    const p = J(r, 0.2);
    K.osc("sine", 950 * p, t, 0.12, 0.5, { f1: 420 * p, g: 0.1, a: 0.004 });
    K.osc("triangle", 1900 * p, t, 0.05, 0.12, { f1: 840 * p });
    K.noise(t, 0.12, 0.15, { type: "bandpass", f: 1800, q: 1.5, a: 0.02 });
  } },
  fire: { n: 2, len: 0.5, fn(K, t, v, r) {
    K.noise(t, 0.35, 0.6, { type: "bandpass", f: 700, f1: 1400, g: 0.3, q: 0.7, a: 0.05, pink: true });
    for (let i = 0; i < 7; i++) K.noise(t + r() * 0.35, 0.008, 0.25, { type: "highpass", f: 2500 });
  } },
  spark: { n: 2, len: 1.7, ch: 2, fn(K, t, v, r) {
    for (let i = 0; i < 14; i++) K.bell(mtof(pentHigh[(r() * 8) | 0]), t + i * 0.05 + r() * 0.02, 0.6, 0.18, { to: K.pan(r() * 1.4 - 0.7) });
    K.noise(t, 0.9, 0.06, { type: "highpass", f: 6000, a: 0.3 });
  } },
  diePoof: { n: 1, len: 1.1, ch: 2, fn(K, t, v, r) {
    K.noise(t, 0.55, 0.7, { type: "lowpass", f: 1800, f1: 300, g: 0.5, q: 0.5, a: 0.03, pink: true });
    K.osc("sine", 700, t + 0.05, 0.5, 0.18, { f1: 300, g: 0.5, a: 0.05, vib: [6, 30, 0.1] });
  } },
  // ---------- v4 ----------
  empty: { n: 2, len: 0.35, fn(K, t, v, r) {          // Munition leer: sanftes hohles „plopp", nie nervig
    const p = [1, 0.9][v];
    K.osc("sine", 420 * p, t, 0.12, 0.55, { f1: 250 * p, g: 0.09, a: 0.004 });
    K.noise(t, 0.05, 0.18, { type: "bandpass", f: 900 * p, q: 2.2, pink: true });
    K.osc("triangle", 840 * p, t + 0.01, 0.05, 0.08, { f1: 520 * p });
  } },
  special: { n: 4, len: 1.7, ch: 2, fn(K, t, v, r) {   // Spezialangriff, 4 Klangfarben (Glitzer / Brüller / Strudel / Feuer)
    if (v === 0) {
      K.noise(t, 0.6, 0.45, { type: "bandpass", f: 600, f1: 5000, g: 0.45, q: 1.2, a: 0.25, pink: true });
      [75, 79, 82, 87, 91, 94, 99].forEach((m, i) => K.bell(mtof(m), t + 0.05 + i * 0.05, 0.9, 0.22, { to: K.pan(-0.6 + i * 0.2) }));
      K.osc("sine", 180, t + 0.42, 0.5, 0.7, { f1: 120, g: 0.3 });
    } else if (v === 1) {
      const fo = K.gain(0.9), f1 = K.filter("bandpass", 520, 4, fo), f2 = K.filter("bandpass", 900, 5, fo);
      const s = K.osc("sawtooth", 150, t, 0.45, 0.9, { f1: 240, g: 0.35, a: 0.06, hold: 0.15, to: f1, vib: [9, 60, 0.05] }); s.g.connect(f2);
      K.noise(t + 0.3, 0.6, 0.6, { type: "lowpass", f: 2400, f1: 400, g: 0.5, pink: true });
      K.osc("sine", 170, t + 0.42, 0.55, 0.8, { f1: 110, g: 0.35 });
      [79, 84, 87].forEach((m, i) => K.bell(mtof(m), t + 0.5 + i * 0.06, 0.7, 0.16, { to: K.pan(-0.4 + i * 0.4) }));
    } else if (v === 2) {
      for (let i = 0; i < 9; i++) { const f0 = 300 + r() * 300, ti = t + i * 0.045; K.osc("sine", f0, ti, 0.09, 0.4, { f1: f0 * 2.6, g: 0.06 }); }
      const sw = K.noise(t, 0.9, 0.5, { type: "bandpass", f: 400, f1: 2600, g: 0.5, q: 5, a: 0.2, pink: true });
      K.osc("sine", 200, t + 0.42, 0.5, 0.65, { f1: 120, g: 0.3 });
      [82, 87, 91, 94].forEach((m, i) => K.bell(mtof(m), t + 0.45 + i * 0.05, 0.8, 0.18, { to: K.pan(0.5 - i * 0.33) }));
    } else {
      K.noise(t, 0.7, 0.8, { type: "bandpass", f: 500, f1: 2200, g: 0.45, q: 0.8, a: 0.15, pink: true });
      for (let i = 0; i < 12; i++) K.noise(t + 0.3 + r() * 0.6, 0.01, 0.22, { type: "highpass", f: 2600 });
      K.osc("sine", 190, t + 0.42, 0.55, 0.8, { f1: 115, g: 0.35 });
      [79, 82, 87, 91].forEach((m, i) => K.bell(mtof(m), t + 0.46 + i * 0.05, 0.7, 0.16, { to: K.pan(-0.5 + i * 0.33) }));
    }
    K.noise(t + 0.42, 0.9, 0.08, { type: "highpass", f: 6500, a: 0.1 });
  } },
  reveal: { n: 1, len: 1.3, ch: 2, fn(K, t, v, r) {    // Heim-Portal glimmt wieder auf (leise)
    K.noise(t, 0.6, 0.25, { type: "bandpass", f: 1200, f1: 5200, g: 0.6, q: 2, a: 0.25 });
    [87, 91, 94].forEach((m, i) => K.bell(mtof(m), t + 0.15 + i * 0.09, 0.9, 0.2, { to: K.pan(-0.3 + i * 0.3) }));
  } },
  phase: { n: 2, len: 2.0, ch: 2, fn(K, t, v, r) {     // Boss-Phasenwechsel: „Da-da-DAA" + Pauke (v1 = Wut)
    const chords = v ? [[48, 51, 55], [50, 53, 56], [55, 59, 62]] : [[51, 55, 58], [53, 56, 60], [58, 62, 65]];
    chords.forEach((notes, k) => {
      const ti = t + k * 0.17, fl = K.filter("lowpass", 500, 0.9);
      fl.frequency.setValueAtTime(500, ti); fl.frequency.linearRampToValueAtTime(3000, ti + 0.04); fl.frequency.setTargetAtTime(900, ti + 0.05, 0.12);
      for (const m of notes) for (const d of [-7, 7]) K.osc("sawtooth", mtof(m), ti, k === 2 ? 0.7 : 0.14, 0.12, { a: 0.015, hold: k === 2 ? 0.35 : 0.06, det: d, to: fl });
    });
    K.osc("sine", 131, t + 0.34, 0.8, 0.8, { f1: 123, g: 0.4 });
    K.noise(t + 0.34, 1.4, 0.22, { type: "highpass", f: 4500, a: 0.004, to: K.pan(0.3) });
    K.noise(t + 0.34, 0.4, 0.3, { type: "lowpass", f: 1400, pink: true });
  } },
  trap: { n: 3, len: 0.4, fn(K, t, v, r) {             // Pieks-Platte schnappt hoch
    const p = J(r, 0.2);
    K.noise(t, 0.02, 0.4, { type: "highpass", f: 3000 });
    K.osc("triangle", 900 * p, t, 0.08, 0.3, { f1: 1500 * p, g: 0.02 });
    K.osc("sine", 2600 * p, t + 0.01, 0.25, 0.08);
    K.noise(t + 0.005, 0.06, 0.25, { type: "bandpass", f: 1800 * p, q: 3 });
  } },
  impact: { n: 3, len: 0.5, fn(K, t, v, r) {           // Einschlag einer Boss-Warnung (weich)
    const p = J(r, 0.2);
    K.osc("sine", 210 * p, t, 0.22, 0.8, { f1: 115, g: 0.12, a: 0.003 });
    K.noise(t, 0.2, 0.5, { type: "lowpass", f: 2200, f1: 400, g: 0.2, pink: true });
    K.bell(mtof(pentHigh[(r() * 5) | 0] - 12), t + 0.02, 0.3, 0.08);
  } },
  arrive: { n: 2, len: 1.0, ch: 2, fn(K, t, v, r) {
    K.noise(t, 0.45, 0.35, { type: "bandpass", f: 500, f1: 2400, g: 0.4, q: 0.9, a: 0.12, pink: true });
    [[82, 87, 91], [84, 87, 94]][v].forEach((m, i) => K.bell(mtof(m), t + 0.12 + i * 0.07, 0.6, 0.18, { to: K.pan(-0.3 + i * 0.3) }));
  } },
};

// =====================================================================
// INSTRUMENTE für die Musik — Einzelnoten auf Referenztönen (Tonhöhe per playbackRate)
// =====================================================================
function pad(kind) {
  return { refs: [54, 66], len: 5, sr: 16000, fn(K, t, f) {
    const A = 0.35, H = 3.4, D = 1.0;
    if (kind === "warm") { const lp = K.filter("lowpass", 1400, 0.6); for (const d of [-7, 0, 7]) K.osc("triangle", f, t, D, 0.3, { a: A, hold: H, det: d, to: lp }); K.osc("sine", f * 2, t, D, 0.06, { a: A, hold: H }); }
    if (kind === "glass") { const tr = K.gain(1), l = K.ac.createOscillator(), lg = K.ac.createGain(); l.frequency.value = 4.5; lg.gain.value = 0.25; l.connect(lg); lg.connect(tr.gain); l.start(t); l.stop(t + 5); for (const [r, a, d] of [[1, 0.4, 0], [1, 0.25, 5], [2, 0.12, 0], [3, 0.05, 0]]) K.osc("sine", f * r, t, D, a, { a: A, hold: H, det: d, to: tr }); }
    if (kind === "sweet") { const lp = K.filter("lowpass", 1600, 1), l = K.ac.createOscillator(), lg = K.ac.createGain(); l.frequency.value = 0.5; lg.gain.value = 400; l.connect(lg); lg.connect(lp.frequency); l.start(t); l.stop(t + 5); for (const d of [-5, 5]) K.osc("square", f, t, D, 0.12, { a: A, hold: H, det: d, to: lp, vib: [5, 8, 0.6] }); }
    if (kind === "air") { K.noise(t, D, 1.4, { type: "bandpass", f, q: 28, a: A, hold: H, pink: true }); K.noise(t, D, 0.7, { type: "bandpass", f: f * 2, q: 28, a: A, hold: H, pink: true }); K.osc("sine", f, t, D, 0.16, { a: A, hold: H }); }
    if (kind === "ember") { const lp = K.filter("lowpass", 900, 0.7); for (const d of [-6, 6]) K.osc("sawtooth", f, t, D, 0.16, { a: A, hold: H, det: d, to: lp }); K.osc("triangle", f, t, D, 0.2, { a: A, hold: H }); }
  } };
}
export const INST_DEFS = {
  bell: { refs: [84], len: 2.2, fn(K, t, f) { K.noise(t, 0.003, 0.15, { type: "highpass", f: 5000 }); K.bell(f, t, 2.0, 0.6, { p: [[1, 1, 1], [2, 0.28, 0.5], [3, 0.1, 0.3], [4.16, 0.07, 0.16], [5.43, 0.04, 0.1]] }); } },
  kalimba: { refs: [72, 84], len: 1.4, fn(K, t, f) { K.noise(t, 0.004, 0.2, { type: "bandpass", f: f * 4, q: 2 }); K.osc("sine", f, t, 1.2, 0.7); K.osc("sine", f * 3.1, t, 0.15, 0.12); K.osc("sine", f * 5.9, t, 0.06, 0.06); K.osc("triangle", f, t, 0.12, 0.12); } },
  musicbox: { refs: [84], len: 1.4, fn(K, t, f) { K.noise(t, 0.002, 0.2, { type: "highpass", f: 6000 }); K.bell(f, t, 1.3, 0.6, { p: [[1, 1, 1], [2, 0.35, 0.5], [3, 0.18, 0.3], [4, 0.1, 0.18], [6.1, 0.05, 0.08]] }); } },
  crystal: { refs: [84, 96], len: 2.8, fn(K, t, f) { const p = [[1, 1, 1], [2.32, 0.35, 0.6], [4.25, 0.18, 0.35], [6.63, 0.08, 0.2]]; K.bell(f, t, 2.6, 0.45, { p }); K.bell(f, t, 2.4, 0.2, { p, det: 7 }); } },
  marimba: { refs: [60, 72], len: 1.0, fn(K, t, f) { K.osc("sine", f, t, 0.7, 0.8); K.osc("sine", f * 4, t, 0.09, 0.25); K.osc("sine", f * 9.9, t, 0.02, 0.05); K.noise(t, 0.008, 0.15, { type: "bandpass", f: f * 3, q: 1.5 }); } },
  harp: { refs: [60, 72], len: 1.6, fn(K, t, f) { const fl = K.filter("lowpass", f * 6, 1); fl.frequency.setTargetAtTime(f * 1.6, t + 0.01, 0.15); K.osc("sawtooth", f, t, 1.4, 0.3, { to: fl }); K.osc("triangle", f, t, 1.4, 0.35); K.osc("sine", f * 2, t, 0.5, 0.12); } },
  pizz: { refs: [48, 55], len: 0.7, fn(K, t, f) { const fl = K.filter("lowpass", f * 5, 1); fl.frequency.setTargetAtTime(f * 2, t + 0.005, 0.06); K.osc("sawtooth", f, t, 0.45, 0.4, { to: fl }); K.osc("triangle", f, t, 0.5, 0.6); K.osc("sine", f * 2, t, 0.2, 0.2); K.noise(t, 0.01, 0.15, { type: "bandpass", f: 1200 }); } },
  lead: { refs: [69, 79], len: 3.0, fn(K, t, f) { const o = { a: 0.04, hold: 2.2, vib: [5.5, 12, 0.3] }; K.osc("sine", f, t, 0.5, 0.55, o); K.osc("sine", f * 2, t, 0.5, 0.07, o); K.osc("triangle", f, t, 0.5, 0.12, o); K.noise(t, 0.5, 0.05, { type: "bandpass", f: f * 2, q: 5, a: 0.04, hold: 2.2 }); } },
  brass: { refs: [55, 67], len: 1.4, fn(K, t, f) { const fl = K.filter("lowpass", f * 1.5, 0.8); fl.frequency.setValueAtTime(f * 1.5, t); fl.frequency.linearRampToValueAtTime(f * 7, t + 0.05); fl.frequency.setTargetAtTime(f * 3, t + 0.06, 0.2); for (const d of [-8, 0, 8]) K.osc("sawtooth", f, t, 0.35, 0.22, { a: 0.03, hold: 0.9, det: d, to: fl }); K.osc("sine", f, t, 0.35, 0.2, { a: 0.03, hold: 0.9 }); } },
  padWarm: pad("warm"), padGlass: pad("glass"), padSweet: pad("sweet"), padAir: pad("air"), padEmber: pad("ember"),
  knock: { refs: [60], len: 0.45, fn(K, t) { K.osc("sine", 205, t, 0.28, 0.9, { f1: 142, g: 0.05 }); K.osc("triangle", 410, t, 0.05, 0.2, { f1: 250 }); K.noise(t, 0.01, 0.3, { type: "bandpass", f: 2500, q: 1 }); } },
  snap: { refs: [60], len: 0.3, fn(K, t) { K.noise(t, 0.14, 0.6, { type: "bandpass", f: 1900, q: 0.8 }); K.noise(t, 0.05, 0.3, { type: "highpass", f: 5000 }); K.osc("sine", 240, t, 0.06, 0.3, { f1: 180 }); } },
  shaker: { refs: [60, 60], len: 0.14, fn(K, t, f, v) { K.noise(t, 0.07, 0.5, { type: "highpass", f: v ? 5200 : 6400, a: 0.012 }); K.noise(t, 0.05, 0.2, { type: "bandpass", f: 9000, q: 2, a: 0.01 }); } },
  tamb: { refs: [60], len: 0.3, fn(K, t) { K.noise(t, 0.2, 0.4, { type: "highpass", f: 7000 }); for (const f of [5200, 6900, 8300]) K.osc("sine", f, t, 0.15, 0.08); } },
  timp: { refs: [48], len: 1.2, fn(K, t, f) { K.osc("sine", f, t, 1.0, 0.8, { f1: f * 0.98, g: 0.4 }); K.osc("sine", f * 1.5, t, 0.35, 0.25); K.osc("sine", f * 1.99, t, 0.25, 0.15); K.noise(t, 0.05, 0.3, { type: "lowpass", f: 1500 }); } },
  crash: { refs: [60], len: 1.6, sr: 32000, fn(K, t) { K.noise(t, 1.4, 0.5, { type: "highpass", f: 3500, a: 0.004 }); K.noise(t, 1.0, 0.3, { type: "bandpass", f: 7000, q: 1.5 }); for (const f of [3100, 4700, 6300]) K.osc("sine", f, t, 0.8, 0.05); } },
};

// =====================================================================
// AMBIENCE — Einzelereignisse + nahtlose Schleifen
// =====================================================================
export const AMB_DEFS = {
  bird: { n: 5, len: 0.9, fn(K, t, v, r) {
    const syl = 2 + ((r() * 4) | 0), base = 2500 + r() * 1500;
    for (let i = 0; i < syl; i++) {
      const ti = t + i * (0.09 + r() * 0.06), f = base * J(r, 0.3), up = r() < 0.5;
      const o = K.osc("sine", up ? f * 0.8 : f * 1.25, ti, 0.07, 0.3, { f1: up ? f * 1.3 : f * 0.75, g: 0.05 + r() * 0.03, a: 0.006 });
      const fm = K.ac.createOscillator(), fg = K.ac.createGain(); fm.frequency.value = 35 + r() * 30; fg.gain.value = 250; fm.connect(fg); fg.connect(o.os.frequency); fm.start(ti); fm.stop(ti + 0.15);
    }
  } },
  drip: { n: 4, len: 0.6, fn(K, t, v, r) {
    const f = 800 + r() * 700;
    K.osc("sine", f, t, 0.09, 0.6, { f1: f * 1.8, g: 0.02, a: 0.001 });
    K.osc("sine", f * 2.3, t + 0.004, 0.04, 0.12, { f1: f * 3.4, g: 0.02 });
    K.noise(t, 0.004, 0.15, { type: "bandpass", f: 3000, q: 1 });
  } },
  chime: { n: 3, len: 2.6, fn(K, t, v, r) {
    for (let i = 0; i < 2 + v % 2; i++) K.bell(mtof(pentHigh[2 + ((r() * 6) | 0)]), t + i * (0.15 + r() * 0.2), 2.0, 0.28, { p: [[1, 1, 1], [2.76, 0.3, 0.5], [5.4, 0.12, 0.25]] });
  } },
  fizz: { n: 3, len: 0.8, fn(K, t, v, r) {
    for (let i = 0; i < 11; i++) { const f = 1500 + r() * 2500; K.osc("sine", f, t + r() * 0.6, 0.012, 0.15 + r() * 0.15, { f1: f * 1.6, g: 0.008, a: 0.001 }); }
  } },
  tink: { n: 3, len: 1.1, fn(K, t, v, r) {
    const f = 3000 + r() * 2000;
    K.bell(f, t, 0.9, 0.3, { p: [[1, 1, 1], [2.4, 0.3, 0.4], [3.9, 0.1, 0.2]] });
    K.noise(t, 0.02, 0.2, { type: "bandpass", f: 3000, q: 2 });
  } },
  blub: { n: 3, len: 0.8, fn(K, t, v, r) {
    K.osc("sine", 125 + r() * 30, t, 0.13, 0.6, { f1: 270 + r() * 60, g: 0.12, a: 0.01 });
    K.noise(t, 0.1, 0.15, { type: "lowpass", f: 400, pink: true });
    K.osc("sine", 180 + r() * 40, t + 0.2 + r() * 0.15, 0.09, 0.35, { f1: 380, g: 0.08, a: 0.008 });
  } },
  crackle: { n: 4, len: 0.4, fn(K, t, v, r) {
    const k = 3 + ((r() * 5) | 0);
    for (let i = 0; i < k; i++) K.noise(t + r() * 0.3, 0.005 + r() * 0.01, 0.2 + r() * 0.25, { type: "bandpass", f: 1500 + r() * 3500, q: 1 });
    K.noise(t, 0.1, 0.08, { type: "lowpass", f: 1200, pink: true });
  } },
  wind: { loop: 8, ch: 2, sr: 16000, fn(K, t, v, r) {
    for (let c = 0; c < 2; c++) {
      const out = K.pan(c ? 0.8 : -0.8), am = K.gain(0.6, out);
      const bp = K.filter("bandpass", 420, 0.8, am);
      const l = K.ac.createOscillator(), lg = K.ac.createGain(); l.frequency.value = 0.09 + c * 0.04; lg.gain.value = 200; l.connect(lg); lg.connect(bp.frequency); l.start(t); l.stop(t + 10);
      const l2 = K.ac.createOscillator(), lg2 = K.ac.createGain(); l2.frequency.value = 0.13 + c * 0.05; lg2.gain.value = 0.3; l2.connect(lg2); lg2.connect(am.gain); l2.start(t); l2.stop(t + 10);
      K.noise(t, 0.5, 1.0, { hold: 9.5, pink: true, to: bp, off: c * 0.4 });
    }
  } },
  murmur: { loop: 6, ch: 2, sr: 16000, fn(K, t, v, r) {
    for (let c = 0; c < 2; c++) {
      const out = K.pan(c ? 0.6 : -0.6), am = K.gain(0.5, out), lp = K.filter("lowpass", 900, 0.6, am);
      const l = K.ac.createOscillator(), lg = K.ac.createGain(); l.frequency.value = 0.31 + c * 0.16; lg.gain.value = 0.25; l.connect(lg); lg.connect(am.gain); l.start(t); l.stop(t + 8);
      K.noise(t, 0.5, 0.8, { type: "bandpass", f: 420, q: 0.5, hold: 7.5, pink: true, to: lp, off: c * 0.5 });
    }
  } },
  water: { loop: 3, ch: 2, sr: 32000, fn(K, t, v, r) {
    const L = K.pan(-0.5), R = K.pan(0.5);
    K.noise(t, 0.5, 0.25, { type: "bandpass", f: 1400, q: 0.5, hold: 4, to: L, off: 0.1 });
    K.noise(t, 0.5, 0.25, { type: "bandpass", f: 1600, q: 0.5, hold: 4, to: R, off: 0.7 });
    for (let i = 0; i < 200; i++) { const f = 700 + r() * 2300; K.osc("sine", f, t + r() * 4, 0.025 + r() * 0.03, 0.05 + r() * 0.08, { f1: f * (1.3 + r() * 0.6), g: 0.02, a: 0.002, to: r() < 0.5 ? L : R }); }
  } },
};
