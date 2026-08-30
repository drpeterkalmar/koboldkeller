/* sfx.js — WebAudio-Sounds, alle prozedural (MIT) */
"use strict";
var SFX = (function () {
  let ctx = null;
  let muted = false;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(freq, type, a, d, peak, slide) {
    if (muted) return;
    try {
      const c = ac(), t0 = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + a + d);
      env(g, t0, a, d, peak); o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + a + d + 0.05);
    } catch (e) { /* Audio darf nie crashen */ }
  }
  function noise(dur, peak, freq) {
    if (muted) return;
    try {
      const c = ac(), t0 = c.currentTime;
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 800;
      const g = c.createGain(); env(g, t0, 0.005, dur, peak);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(t0);
    } catch (e) { }
  }
  return {
    setMuted(m) { muted = m; },
    isMuted() { return muted; },
    resume() { try { ac(); } catch (e) { } },
    step() { noise(0.07, 0.05, 500); },
    swing() { tone(320, "triangle", 0.01, 0.12, 0.12, 0.5); },
    hit() { noise(0.10, 0.18, 900); tone(180, "square", 0.005, 0.08, 0.10, 0.6); },
    hurt() { tone(220, "sawtooth", 0.01, 0.18, 0.14, 0.55); },
    coin() { tone(880, "square", 0.01, 0.06, 0.10); setTimeout(() => tone(1320, "square", 0.01, 0.10, 0.10), 60); },
    potion() { tone(520, "sine", 0.02, 0.18, 0.12, 1.6); setTimeout(() => tone(780, "sine", 0.02, 0.15, 0.10, 1.4), 90); },
    levelup() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, "triangle", 0.02, 0.22, 0.14), i * 110)); },
    loot() { tone(700, "sine", 0.01, 0.20, 0.12, 1.5); },
    die() { [400, 330, 260, 180].forEach((f, i) => setTimeout(() => tone(f, "sawtooth", 0.02, 0.25, 0.12), i * 140)); },
    boss() { [110, 110].forEach((f, i) => setTimeout(() => tone(f, "sawtooth", 0.03, 0.5, 0.20, 0.8), i * 400)); noise(0.6, 0.1, 300); },
    portal() { tone(300, "sine", 0.05, 0.5, 0.12, 2.5); noise(0.4, 0.06, 1200); },
    stairs() { tone(260, "triangle", 0.02, 0.2, 0.12, 0.7); },
    down() { [300, 260, 220, 180].forEach((f, i) => setTimeout(() => tone(f, "sine", 0.02, 0.25, 0.12), i * 120)); },
  };
})();