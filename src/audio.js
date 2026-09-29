/* audio.js — Audio-Engine: Vor-Rendern (OfflineAudioContext), Busse + Mastering, Hall, Stimmen-Verwaltung,
   räumliche Effekte, Ambience, Musik-Uhr, SFX-API (MIT)
   Laufzeit-Regel (Lehre aus v13): pro Effekt nur AudioBufferSource + Gain (+ Panner) — nie Live-Synthese. */
import { SFX_DEFS, INST_DEFS, AMB_DEFS, kit, rng, mkBuf, mtof } from "./sfxlib.js";
import { createMusic, LOOP, S16 } from "./music.js";
import { PF } from "./platform.js";

export const AUDIO = {
  ctx: null, musicOn: true, sfxOn: true, track: "", where: "none", biome: 0, suspended: false, ready: false, recOk: false, recFail: false,
  pre: { ms: 0, maxJob: 0, jobs: 0, bytes: 0, done: false, recMs: 0, errors: 0 },
};
const LIB = { sfx: {}, inst: {}, amb: {}, rec: null };
let E = null, M = null, PRE = null, RECP = null, timer = 0, cpu = 0;   // cpu = Main-Thread-ms der Audio-Engine (Beleg)

// ---------- Mischpult ----------
const LVL = { music: 0.8, sfx: 0.66, amb: 0.4, trim: 0.71 };   // per tools/audiorender.mjs eingemessen (Ziel: Gesamtmix ≈ −16 LUFS)
const MAX_SFX = 24, MAX_MUS = 48, MAX_AMB = 6, LOOK = 0.3;
// vol = Pegel, max = Stimmen pro Typ, gap = Mindestabstand (sonst leicht versetzt), cents = Tonhöhen-Streuung, prio = Vorrang beim Stehlen
const MIX = {
  click: { vol: 0.32, max: 2, gap: 0.03, dry: 1, cents: 30 },
  swing: { vol: 0.42, max: 2, gap: 0.05, cents: 70 },
  hitL: { vol: 0.5, max: 3, gap: 0.02, cents: 90 },
  hitM: { vol: 0.66, max: 3, gap: 0.022, cents: 70, prio: 1 },
  hitH: { vol: 0.78, max: 2, gap: 0.03, cents: 60, prio: 1 },
  crit: { vol: 0.5, max: 1, gap: 0.08, cents: 0, prio: 1 },
  poof: { vol: 0.58, max: 3, gap: 0.04, cents: 25, prio: 1 },
  bossPoof: { vol: 0.9, max: 1, cents: 0, prio: 3 },
  coin: { vol: 0.3, max: 4, gap: 0.055, cents: 0 },
  bubble: { vol: 0.42, max: 2, gap: 0.05, cents: 50 },
  pop: { vol: 0.36, max: 3, gap: 0.03, cents: 40 },
  dodge: { vol: 0.48, max: 1, gap: 0.1, cents: 60 },
  hurt: { vol: 0.72, max: 1, gap: 0.1, cents: 50, prio: 2 },
  potion: { vol: 0.5, max: 1, cents: 0, prio: 2 },
  heal: { vol: 0.45, max: 1, gap: 0.2, cents: 0, prio: 1 },
  pickup: { vol: 0.46, max: 2, gap: 0.06, cents: 0, prio: 1 },
  chest: { vol: 0.55, max: 1, cents: 0, prio: 2 },
  pot: { vol: 0.5, max: 2, gap: 0.04, cents: 80 },
  stairs: { vol: 0.45, max: 1, cents: 30, prio: 2 },
  portal: { vol: 0.45, max: 1, cents: 0, prio: 2 },
  bossWake: { vol: 0.8, max: 1, cents: 0, prio: 3 },
  tele: { vol: 0.45, max: 2, gap: 0.12, cents: 0, prio: 2 },
  slam: { vol: 0.82, max: 2, gap: 0.05, cents: 50, prio: 2 },
  shoot: { vol: 0.32, max: 3, gap: 0.05, cents: 80 },
  fire: { vol: 0.36, max: 3, gap: 0.03, cents: 80 },
  spark: { vol: 0.32, max: 2, cents: 0, prio: 2 },
  diePoof: { vol: 0.55, max: 1, cents: 0, prio: 3 },
  arrive: { vol: 0.38, max: 1, cents: 0, prio: 1 },
  empty: { vol: 0.4, max: 1, gap: 0.15, cents: 20, dry: 1 },
  special: { vol: 0.85, max: 1, cents: 0, prio: 3 },
  reveal: { vol: 0.34, max: 1, cents: 0, prio: 1 },
  phase: { vol: 0.8, max: 1, cents: 0, prio: 3 },
  trap: { vol: 0.34, max: 2, gap: 0.08, cents: 60 },
  wallWarn: { vol: 0.4, max: 2, gap: 0.1, cents: 40 },
  impact: { vol: 0.5, max: 3, gap: 0.05, cents: 40, prio: 1 },
};
const AMBMIX = { bird: 0.35, drip: 0.5, chime: 0.3, fizz: 0.35, tink: 0.3, blub: 0.45, crackle: 0.3 };
// Ort → Hall (Länge s, Helligkeit Hz) + Sends; Ambience-Bett
const PLACE = {
  town: { ir: [0.8, 7000], sfx: 0.1, amb: 0.15, mus: 0 },
  1: { ir: [1.9, 4500], sfx: 0.22, amb: 0.5, mus: 0.12 }, 2: { ir: [2.6, 7500], sfx: 0.3, amb: 0.55, mus: 0.16 },
  3: { ir: [1.6, 5000], sfx: 0.2, amb: 0.45, mus: 0.1 }, 4: { ir: [2.3, 6500], sfx: 0.26, amb: 0.5, mus: 0.14 },
  5: { ir: [1.5, 3500], sfx: 0.2, amb: 0.45, mus: 0.1 },
};
const AMBCFG = {
  town: { loop: "murmur", lv: 0.22, ev: [["bird", 0.3, 0.5]] },
  1: { loop: "wind", lv: 0.3, ev: [["drip", 0.45, 0.6]] },
  2: { loop: "wind", lv: 0.25, ev: [["drip", 0.3, 0.5], ["chime", 0.1, 0.35]] },
  3: { loop: "wind", lv: 0.2, ev: [["fizz", 0.25, 0.4], ["drip", 0.2, 0.45]] },
  4: { loop: "wind", lv: 0.42, ev: [["tink", 0.25, 0.35]] },
  5: { loop: "wind", lv: 0.25, ev: [["blub", 0.3, 0.55], ["crackle", 0.3, 0.3]] },
};

// =====================================================================
// Vor-Rendern: jedes Rezept einmal per OfflineAudioContext → AudioBuffer (in Leerlauf-Häppchen)
// =====================================================================
const SR = 32000;   // Handy-Lautsprecher: 16 kHz Bandbreite reicht, spart ~30 % Speicher
function OAC(ch, len, sr) {
  const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  try { return new C(ch, len, sr); } catch (e) { return new C(ch, Math.ceil(len * 44100 / sr), 44100); }
}
function renderCtx(oac) {
  return new Promise((res, rej) => { oac.oncomplete = e => res(e.renderedBuffer); const p = oac.startRendering(); if (p && p.then) p.then(res, rej); });
}
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const idle = () => new Promise(r => window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 60 }) : setTimeout(r, 8));

async function renderSet(kind, name) {
  const def = (kind === "sfx" ? SFX_DEFS : kind === "inst" ? INST_DEFS : AMB_DEFS)[name];
  let t0 = performance.now();
  const n = def.refs ? def.refs.length : (def.n || 1), len = def.loop ? def.loop + 1 : def.len, ch = def.ch || 1;
  const slot = len + 0.05, oac = OAC(ch, Math.ceil(slot * n * (def.sr || SR)), def.sr || SR), sr = oac.sampleRate;
  const out = oac.createGain(); out.connect(oac.destination);
  const K = kit(oac, out), seed = hash(name);
  for (let v = 0; v < n; v++) { const r = rng(seed + v * 977), t = v * slot; if (def.refs) def.fn(K, t, mtof(def.refs[v]), v, r); else def.fn(K, t, v, r); }
  const s1 = performance.now() - t0;
  const big = await renderCtx(oac);
  t0 = performance.now();
  const L = Math.round(len * sr), parts = [];
  let peak = 0;
  for (let v = 0; v < n; v++) {
    const st = Math.round(v * slot * sr), ps = [];
    for (let c = 0; c < ch; c++) ps.push(big.getChannelData(c).subarray(st, st + L));
    let pk = 0; for (const p of ps) for (let i = 0; i < L; i++) { const a = p[i] < 0 ? -p[i] : p[i]; if (a > pk) pk = a; }
    if (pk > peak) peak = pk;
    let end = L;
    if (!def.loop) { end = 0; const th = pk * 2e-3; for (const p of ps) for (let i = L - 1; i > end; i--) if (Math.abs(p[i]) > th) { end = i; break; } end = Math.min(L, end + 128); }   // Ausklang bis −54 dB
    parts.push({ ps, end });
  }
  const g = peak > 1e-6 ? (def.loop ? 0.5 : kind === "inst" ? 0.8 : 0.89) / peak : 1;
  const bufs = [];
  let bytes = 0;
  for (const { ps, end } of parts) {
    if (def.loop) {                                  // nahtlose Schleife: die Extra-Sekunde über den Anfang blenden
      const LL = Math.round(def.loop * sr), X = L - LL, b = mkBuf(ch, LL, sr);
      for (let c = 0; c < ch; c++) { const s = ps[c], d = b.getChannelData(c); for (let i = 0; i < LL; i++) { let x = s[i]; if (i < X) { const a = i / X * Math.PI / 2; x = s[i] * Math.sin(a) + s[i + LL] * Math.cos(a); } d[i] = x * g; } }
      bufs.push(b); bytes += LL * ch * 4;
    } else {
      const b = mkBuf(ch, end, sr), F = Math.min(128, end);
      for (let c = 0; c < ch; c++) { const d = b.getChannelData(c), s = ps[c]; for (let i = 0; i < end; i++) d[i] = s[i] * g; for (let i = 0; i < F; i++) d[end - 1 - i] *= i / F; }
      bufs.push(b); bytes += end * ch * 4;
    }
  }
  AUDIO.pre.sizes = AUDIO.pre.sizes || {}; AUDIO.pre.sizes[name] = bytes;
  LIB[kind][name] = kind === "inst" ? { bufs: bufs.map((b, i) => ({ ref: def.refs[i], buf: b })) } : { bufs, last: -1 };
  return { sync: Math.max(s1, performance.now() - t0), bytes };
}
const FIRST = ["click", "swing", "hitM", "hitL", "poof", "coin", "pop", "bubble", "dodge", "hurt", "pickup", "arrive", "stairs", "portal", "empty"];
const FIRST_INST = ["harp", "bell", "pizz", "shaker", "knock", "snap", "padWarm", "kalimba", "crash", "lead", "brass", "timp"];
function jobList() {
  const J = [];
  for (const k of FIRST) J.push(["sfx", k]);
  for (const k of ["murmur", "bird"]) J.push(["amb", k]);
  for (const k of FIRST_INST) J.push(["inst", k]);
  for (const k in SFX_DEFS) if (!FIRST.includes(k)) J.push(["sfx", k]);
  for (const k in INST_DEFS) if (!FIRST_INST.includes(k)) J.push(["inst", k]);
  for (const k in AMB_DEFS) if (k !== "murmur" && k !== "bird") J.push(["amb", k]);
  return J;
}
function trackUrl() {
  const a = document.createElement("audio");
  const m4a = a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"');
  return m4a ? "audio/town.m4a" : "audio/town.mp3";
}
function decode(ctx, ab) { return new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }); }
/** Stadtmelodie laden, auf die Takt-Eins schneiden und als exakt 28-Takt-Schleife (24 kHz) ablegen */
async function loadRec() {
  const T0 = performance.now(), url = AUDIO.track = trackUrl();
  try {
    const ab = await (await fetch(url)).arrayBuffer();
    const dec = await decode(OAC(2, 1, 24000), ab);   // >12 kHz liegt nur −57 dB Energie in der Aufnahme
    const sr = dec.sampleRate, d0 = dec.getChannelData(0);
    let i = 0; while (i < d0.length && Math.abs(d0[i]) < 0.01) i++;
    const off = Math.max(0, i / sr - 0.0016);                   // erster Anschlag = Takt-Eins (gemessen: 1,6 ms Attack)
    const len = Math.round(LOOP * sr), oac = OAC(2, len, sr);
    const s = oac.createBufferSource(); s.buffer = dec; s.connect(oac.destination); s.start(0, off);
    const buf = await renderCtx(oac);
    const endSrc = Math.min(len, Math.floor((dec.duration - off) * buf.sampleRate)), F = Math.floor(0.02 * buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let j = 0; j < F; j++) { const k = endSrc - F + j; if (k >= 0 && k < d.length) d[k] *= 1 - j / F; } }
    LIB.rec = buf; AUDIO.recOk = true;
  } catch (e) { AUDIO.recFail = true; }
  AUDIO.pre.recMs = Math.round(performance.now() - T0);
}
/** beim Boot (ohne Geste!) aufrufen: rendert alles vor, ohne das Menü zu blockieren */
export function initAudio() {
  if (PRE) return PRE;
  if (!(window.OfflineAudioContext || window.webkitOfflineAudioContext)) { AUDIO.recFail = true; return (PRE = Promise.resolve()); }
  RECP = loadRec();
  PRE = (async () => {
    const T0 = AUDIO.pre.t0 = performance.now(), fly = new Set();
    for (const [kind, name] of jobList()) {        // bis zu 3 Offline-Renders gleichzeitig (laufen im Audio-Thread)
      await idle();
      const p = renderSet(kind, name).then(r => { AUDIO.pre.maxJob = Math.max(AUDIO.pre.maxJob, +r.sync.toFixed(2)); AUDIO.pre.bytes += r.bytes; AUDIO.pre.jobs++; }, () => { AUDIO.pre.errors++; }).finally(() => fly.delete(p));
      fly.add(p); if (fly.size >= 3) await Promise.race(fly);
    }
    await Promise.all(fly);
    AUDIO.pre.t1 = performance.now(); AUDIO.pre.ms = Math.round(AUDIO.pre.t1 - T0); AUDIO.pre.done = true; AUDIO.ready = true;
  })();
  return PRE;
}
export async function audioReady() { initAudio(); await PRE; await RECP; return AUDIO.pre; }

// =====================================================================
// Engine (auch für OfflineAudioContext nutzbar → tools/audiorender.mjs rendert denselben Mix)
// =====================================================================
function clipCurve() {   // Soft-Clip, Decke −1,5 dBFS (Sicherheitsnetz hinter dem Limiter)
  const n = 4096, c = new Float32Array(n), k = 0.7, cap = 0.841;
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a <= k ? a : k + (cap - k) * Math.tanh((a - k) / (cap - k))); }
  return c;
}
function makeIR(ac, secs, bright) {   // selbst generierte Impulsantwort: Rauschen, exponentiell abklingend, wird dunkler
  const sr = ac.sampleRate, n = Math.max(2, Math.floor(secs * sr)), b = ac.createBuffer(2, n, sr), r = rng(Math.round(secs * 1000 + bright));
  const p0 = Math.floor(0.012 * sr), dec = Math.exp(-6.9 / (secs * sr));
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0, a = 1;
    for (let i = p0; i < n; i++) {
      const tt = (i - p0) / (n - p0), fc = 250 + bright * (1 - tt) * (1 - tt);
      lp += (1 - Math.exp(-6.2832 * fc / sr)) * ((r() * 2 - 1) - lp);
      d[i] = lp * a; a *= dec;
    }
    for (let j = 0; j < 7; j++) { const i = p0 + Math.floor((0.003 + r() * 0.045) * sr); if (i < n) d[i] += (r() * 2 - 1) * 0.35; }
  }
  return b;
}
function createEngine(ac) {
  const E = { ac, voices: [], st: { started: 0, ended: 0, stolen: 0, dropped: 0 }, n: { sfx: 0, mus: 0, amb: 0 }, last: {}, lx: 0, ly: 0,
    musicOn: AUDIO.musicOn, sfxOn: AUDIO.sfxOn, rec: LIB.rec, el: null, loops: {}, next: {}, irs: {}, ambKey: null, hasListener: false, fountain: null, torch: null };
  const G = (v, to) => { const g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const F = (type, f, q, to) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; };
  // Master: Hochpass 2×85 Hz (kein „Dieselmotor") → Glue-Kompressor → Limiter → Trim → Soft-Clip → Ausgang
  const clip = ac.createWaveShaper(); clip.curve = clipCurve(); clip.oversample = "4x"; clip.connect(ac.destination);
  E.trim = G(LVL.trim, clip);
  const lim = ac.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12; lim.connect(E.trim);
  const glue = ac.createDynamicsCompressor(); glue.threshold.value = -14; glue.knee.value = 8; glue.ratio.value = 2; glue.attack.value = 0.012; glue.release.value = 0.25; glue.connect(lim);
  E.pre = G(1, F("highpass", 85, 0.707, F("highpass", 85, 0.707, glue)));
  E.lim = lim; E.glue = glue;
  // Hall
  E.conv = ac.createConvolver(); E.conv.connect(G(1, E.pre)); E.revIn = G(1, E.conv);
  // Musik: Schichten → musicIn → Ducking → „Leben" (Tod blendet aus) → Pause-Dämpfung → Musik-Pegel
  E.musicOut = G(E.musicOn ? LVL.music : 0, E.pre);
  E.muffle = F("lowpass", 20000, 0.5, E.musicOut);
  E.life = G(1, E.muffle);
  E.musicSend = G(0, E.revIn); E.life.connect(E.musicSend);
  E.duckG = G(1, E.life);
  E.musicIn = G(1, E.duckG);
  // SFX: nass (mit Hall-Send) + trocken (UI); Stinger laufen über den nassen SFX-Weg
  E.sfxLvl = G(E.sfxOn ? LVL.sfx : 0, E.pre); E.sfxSend = G(0.15, E.revIn); E.sfxLvl.connect(E.sfxSend);
  E.sfxWet = G(1, E.sfxLvl); E.sfxDry = G(E.sfxOn ? LVL.sfx : 0, E.pre);
  E.stingBus = G(0.85, E.sfxWet);
  // Ambience
  E.ambLvl = G(E.sfxOn ? LVL.amb : 0, E.pre); E.ambSend = G(0.4, E.revIn); E.ambLvl.connect(E.ambSend); E.ambWet = G(1, E.ambLvl);

  E.spat = (x, y) => {   // Stereo nach Bildschirm-x (Iso: x−y), leichte Dämpfung mit Abstand
    const dx = x - E.lx, dy = y - E.ly, d = Math.hypot(dx, dy);
    return { pan: Math.max(-0.8, Math.min(0.8, (dx - dy) * 0.5 / 3.2)), gain: d < 2.5 ? 1 : 1 / (1 + (d - 2.5) * 0.12) };
  };
  E.voice = (buf, o) => {
    const t = Math.max(ac.currentTime, o.when || 0), rate = o.rate || 1;
    const src = ac.createBufferSource(); src.buffer = buf; if (rate !== 1) src.playbackRate.value = rate;
    const g = ac.createGain(); src.connect(g);
    let tail = g;
    if (o.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = o.pan; g.connect(p); tail = p; }
    tail.connect(o.to);
    let end = t + buf.duration / rate;
    if (o.hold !== undefined) {
      g.gain.setValueAtTime(o.gain, t); g.gain.setValueAtTime(o.gain, t + o.hold); g.gain.linearRampToValueAtTime(0, t + o.hold + o.rel);
      end = Math.min(end, t + o.hold + o.rel + 0.01);
    } else g.gain.value = o.gain;
    const v = { src, g, type: o.type, cat: o.cat, t, end, prio: o.prio || 0, stolen: false };
    src.onended = () => {
      if (v.done) return; v.done = true;          // manche Browser melden „ended" nach zweitem stop() doppelt
      try { g.disconnect(); if (tail !== g) tail.disconnect(); } catch (e) { }
      const i = E.voices.indexOf(v); if (i >= 0) E.voices.splice(i, 1);
      E.n[v.cat]--; E.st.ended++;
    };
    src.start(t); if (o.hold !== undefined) src.stop(end);
    E.voices.push(v); E.n[v.cat]++; E.st.started++;
    return v;
  };
  const steal = (v, at) => {
    if (v.stolen) return; v.stolen = true; E.st.stolen++;
    const t = Math.max(ac.currentTime, at);
    v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.012);
    try { v.src.stop(t + 0.06); } catch (e) { }
  };
  E.sfxPlay = (name, o = {}) => {
    const S = LIB.sfx[name], mx = MIX[name]; if (!S || !mx) return null;
    const now = ac.currentTime; let when = Math.max(now, o.when || 0), gm = 1;
    const last = E.last[name] ?? -9, gap = mx.gap || 0.03;
    if (when - last < gap) { when = last + gap; gm = 0.72; if (when - Math.max(now, o.when || 0) > 0.15) { E.st.dropped++; return null; } }
    let same = 0, oldest = null, act = 0, low = null;
    for (const v of E.voices) {
      if (v.stolen || v.end <= when || v.t > when + 0.001) continue;
      if (v.type === name) { same++; if (!oldest || v.t < oldest.t) oldest = v; }
      if (v.cat === "sfx") { act++; if (!low || v.prio < low.prio || (v.prio === low.prio && v.t < low.t)) low = v; }
    }
    if (same >= (mx.max || 3)) { steal(oldest, when); act--; }
    if (act >= MAX_SFX) { if (low.prio > (mx.prio || 0)) { E.st.dropped++; return null; } steal(low, when); }
    E.last[name] = when;
    const nb = S.bufs.length, i = o.v !== undefined ? o.v % nb : nb > 1 ? (S.last + 1 + Math.floor(Math.random() * (nb - 1))) % nb : 0; S.last = i;   // Round-Robin, nie zweimal dieselbe
    const rate = (o.rate || 1) * Math.pow(2, (Math.random() * 2 - 1) * (mx.cents ?? 35) / 1200);
    let gain = mx.vol * (o.vol ?? 1) * gm * Math.pow(10, (Math.random() * 2 - 1) * 1.2 / 20), pan = o.pan || 0;
    if (o.x !== undefined && o.x !== null) { const s = E.spat(o.x, o.y); pan = s.pan; gain *= s.gain; }
    return E.voice(S.bufs[i], { when, rate, gain, pan, to: mx.dry ? E.sfxDry : E.sfxWet, type: name, cat: "sfx", prio: mx.prio || 0 });
  };
  E.busy = (cat, t) => { let n = 0; for (const v of E.voices) if (v.cat === cat && !v.stolen && v.t <= t + 0.001 && v.end > t) n++; return n; };   // klingende Stimmen zum Zeitpunkt t
  E.note = (name, midi, t, vel, o = {}) => {
    const I = LIB.inst[name]; if (!I) return null;
    if (E.busy("mus", t) >= MAX_MUS) { E.st.dropped++; return null; }
    let best = null, bd = 1e9;
    for (const b of I.bufs) { const d = Math.abs(midi - b.ref) + Math.random() * 0.01; if (d < bd) { bd = d; best = b; } }
    const rate = Math.pow(2, (midi - best.ref) / 12 + (Math.random() - 0.5) * (o.cents ?? 6) / 1200);
    const opt = { when: t, rate, gain: vel, pan: o.pan || 0, to: o.to, type: name, cat: "mus" };
    if (o.dur) { opt.hold = o.dur; opt.rel = o.rel ?? 0.3; }
    return E.voice(best.buf, opt);
  };
  E.duck = (db, t, hold, rel) => { const p = E.duckG.gain; p.cancelScheduledValues(t); p.setTargetAtTime(Math.pow(10, db / 20), t, 0.05); p.setTargetAtTime(1, t + hold, rel / 3); };
  E.ambPlay = (name, o) => {
    const S = LIB.amb[name]; if (!S || E.busy("amb", o.when) >= MAX_AMB) return null;
    const nb = S.bufs.length, i = nb > 1 ? (S.last + 1 + Math.floor(Math.random() * (nb - 1))) % nb : 0; S.last = i;
    const s = E.spat(o.x, o.y);
    return E.voice(S.bufs[i], { when: o.when, rate: Math.pow(2, (Math.random() * 2 - 1) * (name === "chime" ? 0 : 80) / 1200), gain: (AMBMIX[name] || 0.3) * (o.vol || 1) * s.gain, pan: s.pan, to: E.ambWet, type: name, cat: "amb" });
  };
  E.place = (where, biome) => {
    const key = where === "town" ? "town" : where === "dungeon" ? (PLACE[biome] ? biome : 1) : null;
    E.ambKey = key; E.next = {};
    const P = PLACE[key] || PLACE.town, t = ac.currentTime, irk = P.ir.join();
    if (E.irKey !== irk) { E.irKey = irk; E.conv.buffer = E.irs[irk] || (E.irs[irk] = makeIR(ac, P.ir[0], P.ir[1])); }
    E.sfxSend.gain.setTargetAtTime(E.sfxOn ? P.sfx : 0, t, 0.1);
    E.ambSend.gain.setTargetAtTime(E.sfxOn ? P.amb : 0, t, 0.1);
    E.musicSend.gain.setTargetAtTime(E.musicOn ? P.mus : 0, t, 0.3);
  };
  E.place("town", 0);
  return E;
}

// ---------- Ambience ----------
const expo = rate => -Math.log(1 - Math.random()) / rate;
function ambLoops(E, now) {
  const cfg = AMBCFG[E.ambKey], want = {};
  if (E.sfxOn && cfg) want[cfg.loop] = cfg.lv;
  if (E.sfxOn && E.fountain) { const d = Math.hypot(E.fountain.x - E.lx, E.fountain.y - E.ly); want.water = 0.75 / (1 + Math.max(0, d - 1.5) * 0.45); }
  for (const k of new Set([...Object.keys(want), ...Object.keys(E.loops)])) {
    let L = E.loops[k]; const v = want[k] || 0;
    if (!L) {
      if (!v || !LIB.amb[k]) continue;
      const src = E.ac.createBufferSource(); src.buffer = LIB.amb[k].bufs[0]; src.loop = true;
      const g = E.ac.createGain(); g.gain.value = 0; src.connect(g);
      let p = null; if (k === "water" && E.ac.createStereoPanner) { p = E.ac.createStereoPanner(); g.connect(p); p.connect(E.ambWet); } else g.connect(E.ambWet);
      src.start(now, Math.random() * src.buffer.duration); L = E.loops[k] = { src, g, p, off: 0 };
    }
    L.g.gain.setTargetAtTime(v, now, 0.5);
    if (L.p && E.fountain) L.p.pan.setTargetAtTime(E.spat(E.fountain.x, E.fountain.y).pan, now, 0.2);
    if (v) L.off = 0;
    else if (!L.off) L.off = now;
    else if (now - L.off > 3) { try { L.src.stop(); } catch (e) { } L.src.disconnect(); L.g.disconnect(); if (L.p) L.p.disconnect(); delete E.loops[k]; }
  }
}
function ambEvents(E, now, hz) {
  const cfg = AMBCFG[E.ambKey]; if (!cfg || !E.sfxOn || !E.hasListener) return;
  const ev = cfg.ev.slice();
  if (E.torch && E.torch.d < 4.5 && E.ambKey !== "town") ev.push(["crackle", 2.2 * (1 - E.torch.d / 4.5), 0.3, E.torch]);
  for (const [name, rate, vol, at] of ev) {
    const key = name + (at ? "@" : "");
    if (!E.next[key] || E.next[key] < now - 1) E.next[key] = now + expo(rate);
    while (E.next[key] < hz) {
      const t = E.next[key]; E.next[key] += expo(rate);
      let x, y; if (at) { x = at.x; y = at.y; } else { const a = Math.random() * 6.2832, r = 2.5 + Math.random() * 6; x = E.lx + Math.cos(a) * r; y = E.ly + Math.sin(a) * r; }
      E.ambPlay(name, { when: t, x, y, vol });
    }
  }
}

// =====================================================================
// Live-Kontext: Entsperren, Uhr, Schalter
// =====================================================================
function pump() {
  const ac = AUDIO.ctx; if (!ac || !E || ac.state !== "running" || AUDIO.suspended) return;
  const T = performance.now(), now = ac.currentTime;
  if (!M.running && (LIB.rec || AUDIO.recFail)) {            // Musik-Uhr startet, sobald die Aufnahme bereit ist
    E.rec = LIB.rec;
    if (!LIB.rec && !E.el) { try { E.el = new Audio(AUDIO.track); E.el.loop = true; E.ac.createMediaElementSource(E.el).connect(M.L.recLP); } catch (e) { } }
    M.start(now + 0.1);
  }
  M.tick(now, now + LOOK);
  ambLoops(E, now);
  ambEvents(E, now, now + LOOK);
  cpu += performance.now() - T;
}
/** nur aus einer Nutzer-Geste aufrufen (pointerup/touchend/click/keydown) */
export function unlockAudio() {
  try {
    initAudio();
    if (!AUDIO.ctx) {
      // iPhone: ohne „playback" schaltet der Lautlos-Schalter WebAudio (und damit alles) stumm
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      let ac; try { ac = new AC({ latencyHint: "interactive" }); } catch (e) { ac = new AC(); }
      AUDIO.ctx = ac;
      E = createEngine(ac); M = createMusic(E);
      PF.hapDelay = Math.max(0, Math.min(50, ((ac.outputLatency || 0) + (ac.baseLatency || 0)) * 1000 - 12));   // Vibration ≈ Schall-Transient
      timer = setInterval(pump, 50);
    }
    if (AUDIO.ctx.state !== "running" && !AUDIO.suspended) {
      AUDIO.ctx.resume().catch(() => { });
      // stiller 1-Sample-Puffer IN der Geste: entsperrt Safari/ältere Android-WebViews zuverlässig
      try { const b = AUDIO.ctx.createBufferSource(); b.buffer = AUDIO.ctx.createBuffer(1, 1, 22050); b.connect(AUDIO.ctx.destination); b.start(0); } catch (e) { }
    }
    if (AUDIO.where !== "none") playMusic(AUDIO.where, AUDIO.biome);
  } catch (e) { /* still scheitern */ }
}
/** Ort wechseln: Stadt = Aufnahme pur; Keller = Aufnahme gedämpft + Biom-Schichten (Wechsel taktgenau) */
/** Abend in der Stadt (18–7 Uhr Ortszeit): sanftere Stadtmusik. AUDIO.eveForce (true/false) überschreibt für Tests */
export function isEvening() { if (AUDIO.eveForce !== undefined && AUDIO.eveForce !== null) return !!AUDIO.eveForce; const h = new Date().getHours(); return h >= 18 || h < 7; }
export function playMusic(where, biome = 0) {
  AUDIO.where = where; AUDIO.biome = biome;
  if (!E) return;
  M.want.where = where; M.want.biome = biome; M.want.eve = where === "town" && isEvening();
  E.place(where, biome);
}
export function setMusic(on) {
  AUDIO.musicOn = on;
  if (!E) return;
  E.musicOn = on;
  const t = AUDIO.ctx.currentTime;
  E.musicOut.gain.setTargetAtTime(on ? LVL.music : 0, t, 0.05);
  E.place(AUDIO.where, AUDIO.biome);
  if (on) M.resume(); else M.stopRec();
}
export function setSfx(on) {
  AUDIO.sfxOn = on;
  if (!E) return;
  E.sfxOn = on;
  const t = AUDIO.ctx.currentTime;
  for (const [n, v] of [[E.sfxLvl, LVL.sfx], [E.sfxDry, LVL.sfx], [E.ambLvl, LVL.amb]]) n.gain.setTargetAtTime(on ? v : 0, t, 0.03);
  E.place(AUDIO.where, AUDIO.biome);
}
export function suspendAudio(s) {
  AUDIO.suspended = s;
  if (!AUDIO.ctx) return;
  if (s) { AUDIO.ctx.suspend(); if (E && E.el) E.el.pause(); }
  else { AUDIO.ctx.resume(); if (E && E.el && E.musicOn) E.el.play().catch(() => { }); }
}
/** pro Frame aus der Spielschleife: Hörer-Position, Bedrohung → Kampf-Intensität, Boss, Tod, Pause */
let fT = 0, tT = 0;
export function audioFrame(G, dt) {
  if (!E) return;
  const T = performance.now();
  try { frameWork(G, dt); } finally { cpu += performance.now() - T; }
}
function frameWork(G, dt) {
  const p = G.p;
  E.hasListener = !!p;
  if (p) { E.lx = p.x; E.ly = p.y; }
  fT += dt; if (fT < 0.1) return;
  const fdt = fT; fT = 0;
  let n = 0;
  if (G.screen === "play" && p && G.depth > 0) for (const e of G.ents) {
    if (e.type === "dummy" || e.state === "idle" || e.state === "sleep") continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < 8) n += e.isBoss ? 2 : 1;
  }
  if (n && p && p.hp < p.maxHp * 0.3) n += 1;
  const target = Math.min(1, n / 3);
  M.inten += (target - M.inten) * (1 - Math.exp(-fdt / (target > M.inten ? 0.35 : 3.5)));
  M.want.boss = G.boss && G.boss.awake && G.boss.hp > 0 && G.screen !== "win" ? (G.boss.isKing ? 2 : G.boss.isMini ? 3 : 1) : 0;
  M.want.phase = G.boss ? G.boss.phase || 1 : 1;
  M.setDead(G.screen === "dead");
  const muff = G.screen === "pause" || G.screen === "bag";
  if (muff !== E.muffled) { E.muffled = muff; E.muffle.frequency.setTargetAtTime(muff ? 700 : 20000, AUDIO.ctx.currentTime, 0.15); }
  E.fountain = G.L && G.depth === 0 ? G.L.fountain : null;
  tT += fdt;
  if (tT > 0.3 && G.L && p) {
    tT = 0; let best = null, bd = 1e9;
    for (const t of G.L.torches || []) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = t; } }
    E.torch = best ? { x: best.x, y: best.y, d: bd } : null;
  }
}
export function audioStats() {
  if (!E) return { state: "none", pre: AUDIO.pre, rec: !!LIB.rec };
  const c = { sfx: 0, mus: 0, amb: 0 }; for (const v of E.voices) c[v.cat]++;
  return {
    state: AUDIO.ctx.state, voices: E.voices.length, byCat: c, loops: Object.keys(E.loops).length,
    started: E.st.started, ended: E.st.ended, stolen: E.st.stolen, dropped: E.st.dropped,
    music: M.info(), pre: { ...AUDIO.pre, sizes: undefined }, rec: !!LIB.rec, cpuMs: +cpu.toFixed(2), sr: AUDIO.ctx.sampleRate, hapDelay: PF.hapDelay,
  };
}

// =====================================================================
// SFX-API (Spiel ruft nur diese Namen)
// =====================================================================
const ok = () => E && AUDIO.sfxOn && !AUDIO.suspended && AUDIO.ctx.state === "running";
const P = (name, o) => { if (!ok()) return null; const T = performance.now(), v = E.sfxPlay(name, o); cpu += performance.now() - T; return v; };
const ST = (kind) => { if (!ok()) return; const T = performance.now(); M.stinger(kind); cpu += performance.now() - T; };
const COIN = [79, 82, 84, 87, 89, 91, 94, 96, 99];   // Münz-Serie steigt die Es-Pentatonik hinauf (G5 … Es7)
let coinStep = 0, coinLast = -9;
export const SFX = {
  swing(o = {}) { P("swing", { x: o.x, y: o.y, rate: (o.big ? 0.8 : 1) * (1 + (o.tier || 0) * 0.035), vol: o.big ? 1.2 : 1 }); },
  hit(o = {}) {
    const d = o.dmg || 1;
    P(o.src === "bubble" || d < 1.6 ? "hitL" : d >= 6 ? "hitH" : "hitM", { x: o.x, y: o.y, rate: o.boss ? 0.82 : 1 });
    if (o.crit) P("crit", { x: o.x, y: o.y });
  },
  poof(o = {}) { P(o.boss ? "bossPoof" : "poof", { x: o.x, y: o.y }); },
  coin() {
    if (!ok()) return;
    const now = AUDIO.ctx.currentTime;
    coinStep = now - coinLast < 0.6 ? Math.min(coinStep + 1, COIN.length - 1) : 0; coinLast = now;
    P("coin", { rate: Math.pow(2, (COIN[coinStep] - 84) / 12) });
  },
  bubble() { P("bubble"); },
  pop(o = {}) { P("pop", { x: o.x, y: o.y }); },
  dodge() { P("dodge"); },
  hurt() { P("hurt"); if (ok()) E.duck(-3, AUDIO.ctx.currentTime, 0.15, 0.4); },
  potion() { P("potion"); },
  heal() { P("heal"); },
  levelup() { P("spark"); ST("levelup"); },
  pickup() { P("pickup"); },
  chest(o = {}) { P("chest", { x: o.x, y: o.y }); },
  pot(o = {}) { P("pot", { x: o.x, y: o.y }); },
  stairs() { P("stairs"); ST("stairs"); },
  portal() { P("portal"); ST("portal"); },
  arrive() { P("arrive"); },
  boss(o = {}) { P("bossWake", { x: o.x, y: o.y, vol: 1 }); if (ok()) E.duck(-7, AUDIO.ctx.currentTime, 1.4, 1.0); },
  bossWin() { P("spark"); ST("bossWin"); },
  tele(o = {}) { P("tele", { x: o.x, y: o.y }); },
  slam(o = {}) { P("slam", { x: o.x, y: o.y }); },
  shoot(o = {}) { P(o.fire ? "fire" : "shoot", { x: o.x, y: o.y }); },
  click() { P("click"); },
  victory() { P("spark"); ST("victory"); },
  die() { P("diePoof"); ST("die"); },
  empty() { P("empty"); },
  special(o = {}) { P("special", { v: o.v || 0 }); ST("special"); if (ok()) E.duck(-5, AUDIO.ctx.currentTime, 0.9, 0.8); },
  reveal(o = {}) { P("reveal", { x: o.x, y: o.y }); },
  phase(o = {}) { P("phase", { x: o.x, y: o.y, v: o.rage ? 1 : 0 }); ST(o.rage ? "rage" : "phase"); if (ok()) E.duck(-7, AUDIO.ctx.currentTime, 1.2, 1.0); },
  trap(o = {}) { P("trap", { x: o.x, y: o.y }); },
  wallWarn(o = {}) { P("wallWarn", { x: o.x, y: o.y }); },     // v8: Wand-Schütze holt Luft (räumlich)
  impact(o = {}) { P("impact", { x: o.x, y: o.y }); },
};

// =====================================================================
// Offline-Rendern für Messungen (tools/audiorender.mjs) — exakt derselbe Mix-Graph
// =====================================================================
export function sfxBuffers() { return Object.fromEntries(Object.entries(LIB.sfx).map(([k, v]) => [k, v.bufs])); }
export async function renderScene({ secs = 60, sr = 48000, where = "town", biome = 0, inten = 0, boss = 0, phase = 1, eve = false, sfx = null, amb = false, music = true } = {}) {
  await audioReady();
  const oac = OAC(2, Math.ceil(secs * sr), sr), e = createEngine(oac), m = createMusic(e);
  e.musicOn = music; e.rec = LIB.rec; e.place(where, biome); e.hasListener = true;
  if (!music) e.musicOut.gain.value = 0;
  m.want.where = where; m.want.biome = biome; m.want.boss = boss; m.want.phase = phase; m.want.eve = eve; m.inten = inten;
  m.start(0.05); m.tick(0, secs);
  if (sfx) for (const [t, name, o = {}] of sfx) {
    if (name.startsWith("sting:")) m.stinger(name.slice(6), t);
    else e.sfxPlay(name, { ...o, when: t });
  }
  if (amb) { for (let t = 0; t < secs; t += 0.25) ambEvents(e, t, t + 0.25); ambLoops(e, 0); }
  return renderCtx(oac);
}
