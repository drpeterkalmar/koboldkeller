/* sfx.js v4 — Blob-Audio (Medienpfad = iOS-Silent-Switch-sicher) mit
   sauberen Pegeln (kein Clipping!), moderater Lautstärke und
   Auto-Stopp beim Tab/App-Wechsel. (MIT)
   v4 (Spielstand v13): Wiedergabe über wiederverwendbare Element-Pools
   (max 3 pro Sound) statt new Audio() pro Play — iOS-Ruckel-Fix.
   Alle Effekte werden nach dem ersten Tap vorgerendert. */
"use strict";
var SFX = (function () {
  let muted = false;
  const blobCache = {};
  const waiters = {};
  const SR = 22050;
  const FX_VOL = 0.35;   // Effekt-Lautstärke (Element-Wert)
  const MUS_VOL = 0.30;  // Musik-Lautstärke (Element-Wert)
  let hiddenBlock = false;

  // ---------- WAV-Encoder (PCM16) ----------
  function wavFromSamples(smp) {
    const n = smp.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const wstr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    wstr(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); wstr(8, "WAVE");
    wstr(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    wstr(36, "data"); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, smp[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: "audio/wav" });
  }

  // ---------- Offline-Renderer-Grains ----------
  function grain(c, dest, freq, type, a, d, peak, slide, t0) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide && slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + a + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + a + d + 0.05);
  }
  function noiseGrain(c, dest, dur, peak, freq, t0) {
    const len = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, len, c.sampleRate), dd = b.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = b;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t0);
  }

  // ---------- Effekt-Rezepte (Pegel so, dass Summe < 1 bleibt) ----------
  const FX = {
    coin: (c,d) => { grain(c,d,880,"square",0.01,0.09,0.30,1,0); grain(c,d,1320,"square",0.01,0.14,0.30,1,0.08); },
    swing: (c,d) => grain(c,d,320,"triangle",0.01,0.12,0.28,0.5,0),
    hit: (c,d) => { noiseGrain(c,d,0.10,0.30,900,0); grain(c,d,180,"square",0.005,0.09,0.22,0.6,0); },
    hurt: (c,d) => grain(c,d,220,"sawtooth",0.01,0.18,0.28,0.55,0),
    potion: (c,d) => { grain(c,d,520,"sine",0.02,0.18,0.28,1.6,0); grain(c,d,780,"sine",0.02,0.15,0.22,1.4,0.1); },
    levelup: (c,d) => [523,659,784,1047].forEach((f,i) => grain(c,d,f,"triangle",0.02,0.24,0.30,1,i*0.11)),
    loot: (c,d) => grain(c,d,700,"sine",0.01,0.22,0.28,1.5,0),
    die: (c,d) => [400,330,260,180].forEach((f,i) => grain(c,d,f,"sawtooth",0.02,0.26,0.26,1,i*0.14)),
    boss: (c,d) => { [0,0.45].forEach(t => grain(c,d,110,"sawtooth",0.03,0.55,0.36,0.8,t)); noiseGrain(c,d,0.6,0.18,300,0); },
    portal: (c,d) => { grain(c,d,300,"sine",0.05,0.5,0.26,2.5,0); noiseGrain(c,d,0.4,0.12,1200,0); },
    stairs: (c,d) => grain(c,d,260,"triangle",0.02,0.2,0.26,0.7,0),
    down: (c,d) => [300,260,220,180].forEach((f,i) => grain(c,d,f,"sine",0.02,0.26,0.26,1,i*0.12)),
    step: (c,d) => noiseGrain(c,d,0.09,0.08,500,0),
  };

  function getBlob(name) {
    if (blobCache[name]) return blobCache[name];
    const fx = FX[name]; if (!fx) return null;
    const oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(SR * 1.4), SR);
    fx(oc, oc.destination);
    blobCache[name] = null; // Platzhalter bis fertig
    oc.startRendering().then(buffer => {
      blobCache[name] = URL.createObjectURL(wavFromSamples(buffer.getChannelData(0)));
      for (const w of waiters[name] || []) w();
      waiters[name] = [];
    }).catch(() => {});
    return null;
  }
  // ---------- v13: Wiederverwendbare Element-Pools (Ruckel-Fix) ----------
  // Vorher: JEDES play() baute ein new Audio() -> hunderte Medienkontexte
  // auf iOS -> Ruckeln. Jetzt: max 3 Elemente pro Sound, rotierend.
  const POOL_SIZE = 3;
  const elPool = {};
  const elRR = {};
  function pooledEl(name, url) {
    let pool = elPool[name];
    if (!pool) pool = elPool[name] = [];
    for (const el of pool) if (el.paused) return el;
    if (pool.length < POOL_SIZE) { const a = new Audio(url); pool.push(a); return a; }
    elRR[name] = ((elRR[name] || 0) + 1) % POOL_SIZE;
    return pool[elRR[name]];
  }
  function play(name) {
    if (muted || document.hidden) return;
    let url = blobCache[name];
    if (url === undefined) url = getBlob(name);
    if (!url) return;
    try {
      const a = pooledEl(name, url);
      a.currentTime = 0;
      a.volume = FX_VOL;
      const pr = a.play();
      if (pr && pr.catch) pr.catch(() => {});
    } catch (e) {}
  }

  // ---------- Musik: echte CC0-Stuecke (audio/*.m4a), Medienpfad ----------
  // Musik: "Town Theme 1" by Geomancer (CC0, via OpenGameArt/Creazilla)
  //        "Stepping Down Into the Dungeon" (CC0, via OpenGameArt/Creazilla)
  let musicEl = null, musicMode = "town", musicWanted = false;
  function musicUrl(mode) {
    return (mode === "town" ? "audio/town.m4a" : "audio/dungeon.m4a") + "?v=11";
  }
  function ensureEl() {
    if (!musicEl) { musicEl = new Audio(); musicEl.loop = true; musicEl.volume = 0.55; musicEl.preload = "auto"; }
    return musicEl;
  }
  function music(mode) {
    if (mode) musicMode = mode;
    if (muted) return;
    musicWanted = true;
    const el = ensureEl();
    const url = musicUrl(musicMode);
    if (!el.src || el.src.indexOf(url.replace("?v=11","")) === -1) { el.src = url; }
    const p = el.play(); if (p && p.catch) p.catch(() => {});
  }
  function stopMusic() { musicWanted = false; if (musicEl) { try { musicEl.pause(); } catch (e) {} } }
  // App-/Tab-Wechsel: Musik PAUSIERT, beim Zurückkehern weiter — nur wenn gewünscht
  document.addEventListener("visibilitychange", () => {
    if (!musicEl) return;
    if (document.hidden) { try { musicEl.pause(); } catch (e) {} }
    else if (musicWanted && !muted && musicEl.src) { const p = musicEl.play(); if (p && p.catch) p.catch(() => {}); }
  });
  function unlock() {
    try {
      const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
      a.volume = 0.01; const p = a.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  let unlocked = false;
  return {
    setMuted(m) { muted = m; if (m) stopMusic(); },
    isMuted() { return muted; },
    resume() {
      if (!unlocked) {
        unlocked = true;      // Unlock nur EINMAL statt je Tap
        unlock();
        // Alle Effekte vorrendern (Lazy-Render mitten im Kampf = Ruckel-Beitrag)
        setTimeout(() => { Object.keys(FX).forEach(n => getBlob(n)); }, 50);
      }
    },
    audioOk() { return !!musicEl && !musicEl.paused; },
    music(mode) { if (mode) musicMode = mode; music(musicMode); },
    stopMusic() { stopMusic(); },
    step() { play("step"); },
    swing() { play("swing"); },
    hit() { play("hit"); },
    hurt() { play("hurt"); },
    coin() { play("coin"); },
    potion() { play("potion"); },
    levelup() { play("levelup"); },
    loot() { play("loot"); },
    die() { play("die"); },
    boss() { play("boss"); },
    portal() { play("portal"); },
    stairs() { play("stairs"); },
    down() { play("down"); },
    poolInfo() {
      const total = Object.keys(elPool).reduce((s, k) => s + elPool[k].length, 0);
      const busy = Object.values(elPool).flat().filter(e => !e.paused).length;
      return { elements: total, busy, unlocked };
    },
  };
})();