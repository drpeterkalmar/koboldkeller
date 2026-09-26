/* audio.js — weiche WebAudio-SFX + CC0-Glockenspiel-Melodie überall (MIT) */
export const AUDIO = { ctx: null, musicOn: true, sfxOn: true, track: "", where: "none", suspended: false };
let master, sfxBus, musicBus, lp, el = null, elSrc = null, noiseBuf = null, lastCoin = 0, coinStep = 0;

function trackUrl() {
  const a = document.createElement("audio");
  const m4a = a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"');
  return m4a ? "audio/town.m4a" : "audio/town.mp3";
}
/** nur aus einer Nutzer-Geste aufrufen */
export function unlockAudio() {
  try {
    if (!AUDIO.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = new AC();
      AUDIO.ctx = ac;
      master = ac.createGain(); master.gain.value = 0.9;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = AUDIO.sfxOn ? 0.55 : 0; sfxBus.connect(master);
      musicBus = ac.createGain(); musicBus.gain.value = AUDIO.musicOn ? 0.34 : 0;
      lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 20000; lp.Q.value = 0.4;
      lp.connect(musicBus); musicBus.connect(master);
      const n = ac.sampleRate * 1; noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      el = new Audio(); el.loop = true; el.preload = "auto"; el.src = AUDIO.track = trackUrl();
      try { elSrc = ac.createMediaElementSource(el); elSrc.connect(lp); } catch (e) { elSrc = null; el.volume = 0.34; }
    }
    if (AUDIO.ctx.state === "suspended" && !AUDIO.suspended) AUDIO.ctx.resume();
    if (AUDIO.where !== "none") playMusic(AUDIO.where);
  } catch (e) { /* still scheitern */ }
}
/** dieselbe Melodie in Stadt & Keller — im Keller nur ein Hauch „Höhlenklang" */
export function playMusic(where) {
  AUDIO.where = where;
  if (!AUDIO.ctx || !el) return;
  const t = AUDIO.ctx.currentTime;
  lp.frequency.cancelScheduledValues(t);
  lp.frequency.setTargetAtTime(where === "dungeon" ? 3200 : 20000, t, 0.4);
  if (where === "none") { el.pause(); return; }
  if (AUDIO.musicOn && !AUDIO.suspended && el.paused) el.play().catch(() => { });
}
export function setMusic(on) {
  AUDIO.musicOn = on;
  if (musicBus) musicBus.gain.value = on ? 0.34 : 0;
  if (!elSrc && el) el.volume = on ? 0.34 : 0;
  if (on) playMusic(AUDIO.where); else if (el) el.pause();
}
export function setSfx(on) { AUDIO.sfxOn = on; if (sfxBus) sfxBus.gain.value = on ? 0.55 : 0; }
export function suspendAudio(s) {
  AUDIO.suspended = s;
  if (!AUDIO.ctx) return;
  if (s) { AUDIO.ctx.suspend(); if (el) el.pause(); }
  else { AUDIO.ctx.resume(); playMusic(AUDIO.where); }
}

// ---------- Bausteine ----------
function ok() { return AUDIO.ctx && AUDIO.sfxOn && !AUDIO.suspended && AUDIO.ctx.state === "running"; }
function tone(f0, f1, dur, type = "sine", vol = 0.2, delay = 0, attack = 0.005) {
  const ac = AUDIO.ctx, t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function bell(f, dur = 0.6, vol = 0.14, delay = 0) {
  tone(f, f, dur, "sine", vol, delay, 0.003);
  tone(f * 2.76, f * 2.76, dur * 0.4, "sine", vol * 0.28, delay, 0.002);
  tone(f * 5.4, f * 5.4, dur * 0.18, "sine", vol * 0.1, delay, 0.001);
}
function noise(dur, f0, f1, vol = 0.15, type = "bandpass", q = 1.2, delay = 0) {
  const ac = AUDIO.ctx, t = ac.currentTime + delay;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(fl); fl.connect(g); g.connect(sfxBus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const rnd = (a) => 1 + (Math.random() - 0.5) * a;

// ---------- Sounds ----------
export const SFX = {
  swing() { if (!ok()) return; noise(0.16, 500 * rnd(0.2), 2200, 0.16, "bandpass", 0.8); },
  hit() { if (!ok()) return; const r = rnd(0.25); tone(260 * r, 120 * r, 0.12, "sine", 0.3); noise(0.06, 1400, 600, 0.12, "lowpass", 0.7); },
  poof() { if (!ok()) return; noise(0.28, 1800, 400, 0.14, "lowpass", 0.6); bell(988 * rnd(0.05), 0.35, 0.08, 0.02); bell(1319, 0.3, 0.06, 0.07); },
  coin() {
    if (!ok()) return;
    const now = AUDIO.ctx.currentTime;
    coinStep = now - lastCoin < 0.35 ? Math.min(coinStep + 1, 10) : 0; lastCoin = now;
    const f = 1320 * Math.pow(2, coinStep / 12);
    bell(f, 0.28, 0.09); bell(f * 1.5, 0.22, 0.05, 0.04);
  },
  bubble() { if (!ok()) return; tone(380, 900, 0.14, "sine", 0.16); tone(600, 1200, 0.1, "sine", 0.08, 0.05); },
  pop() { if (!ok()) return; tone(900 * rnd(0.2), 1500, 0.05, "sine", 0.12); },
  dodge() { if (!ok()) return; noise(0.2, 300, 2400, 0.14, "bandpass", 0.7); tone(500, 900, 0.12, "sine", 0.06); },
  hurt() { if (!ok()) return; tone(340, 190, 0.22, "triangle", 0.22); tone(300, 170, 0.2, "sine", 0.1, 0.03); },
  potion() { if (!ok()) return; tone(300, 520, 0.12, "sine", 0.16); tone(340, 600, 0.12, "sine", 0.14, 0.13); bell(1047, 0.4, 0.07, 0.25); },
  heal() { if (!ok()) return; bell(784, 0.5, 0.08); bell(1175, 0.5, 0.06, 0.08); },
  levelup() { if (!ok()) return; [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, 0.6, 0.12, i * 0.07)); },
  pickup() { if (!ok()) return; [784, 988, 1319].forEach((f, i) => bell(f, 0.45, 0.1, i * 0.06)); },
  chest() { if (!ok()) return; noise(0.12, 800, 300, 0.1, "lowpass"); [659, 831, 988, 1319, 1661].forEach((f, i) => bell(f, 0.5, 0.08, 0.05 + i * 0.05)); },
  pot() { if (!ok()) return; noise(0.12, 2600, 900, 0.18, "bandpass", 2); tone(700, 300, 0.06, "triangle", 0.08); },
  stairs() { if (!ok()) return; noise(0.5, 300, 1800, 0.1, "bandpass", 0.6); [392, 523, 659].forEach((f, i) => bell(f, 0.8, 0.08, 0.1 + i * 0.09)); },
  portal() { if (!ok()) return; noise(0.6, 2400, 300, 0.1, "bandpass", 0.8); [659, 784, 988, 1319].forEach((f, i) => bell(f, 0.7, 0.07, i * 0.06)); },
  boss() { if (!ok()) return; tone(130, 90, 0.7, "triangle", 0.25); tone(196, 150, 0.6, "sine", 0.1, 0.05); bell(311, 0.9, 0.07, 0.1); },
  tele() { if (!ok()) return; tone(660, 660, 0.09, "triangle", 0.07); tone(550, 550, 0.09, "triangle", 0.07, 0.1); },
  slam() { if (!ok()) return; tone(110, 50, 0.3, "sine", 0.35); noise(0.25, 600, 120, 0.16, "lowpass"); },
  shoot() { if (!ok()) return; tone(700, 400, 0.12, "triangle", 0.06); },
  click() { if (!ok()) return; bell(1568, 0.15, 0.06); },
  victory() { if (!ok()) return; const n = [523, 659, 784, 1047, 784, 1047, 1319, 1568]; n.forEach((f, i) => bell(f, 0.9, 0.12, i * 0.14)); },
  die() { if (!ok()) return; [523, 440, 392, 330].forEach((f, i) => bell(f, 0.5, 0.08, i * 0.12)); },
};
