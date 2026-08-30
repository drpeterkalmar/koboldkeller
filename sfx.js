/* sfx.js v2 — Blob-Audio-Architektur (iOS-Silent-Switch-Sicher!)
   Töne werden OFFLINE gerendert (OfflineAudioContext) und als WAV-Blob über
   <audio>-Elemente abgespielt. Der Medien-Pfad tönt am iPhone auch bei
   Klingelschalter-aus (gleiche Ausnahme wie YouTube-Videos). (MIT) */
"use strict";
var SFX = (function () {
  let muted = false;
  const blobCache = {};   // name -> objectURL
  const SR = 22050;       // Mono reicht für Chiptune, spart Daten

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

  // ---------- Offline-Renderer ----------
  function renderOffline(build, seconds) {
    const oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(SR * seconds), SR);
    build(oc, oc.destination);
    return oc.startRendering();
  }
  // Ein "Grain": Oszillator mit Hüllkurve (wie früher tone())
  function grain(c, dest, freq, type, a, d, peak, slide, t0) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + a + d);
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

  // ---------- Effekt-Rezepte (name -> buildFn) ----------
  const FX = {
    coin: (c,d) => { grain(c,d,880,"square",0.01,0.08,0.5,1,0); grain(c,d,1320,"square",0.01,0.12,0.5,1,0.07); },
    swing: (c,d) => grain(c,d,320,"triangle",0.01,0.12,0.45,0.5,0),
    hit: (c,d) => { noiseGrain(c,d,0.10,0.5,900,0); grain(c,d,180,"square",0.005,0.08,0.35,0.6,0); },
    hurt: (c,d) => grain(c,d,220,"sawtooth",0.01,0.18,0.45,0.55,0),
    potion: (c,d) => { grain(c,d,520,"sine",0.02,0.18,0.45,1.6,0); grain(c,d,780,"sine",0.02,0.15,0.35,1.4,0.1); },
    levelup: (c,d) => [523,659,784,1047].forEach((f,i) => grain(c,d,f,"triangle",0.02,0.24,0.5,1,i*0.11)),
    loot: (c,d) => grain(c,d,700,"sine",0.01,0.22,0.45,1.5,0),
    die: (c,d) => [400,330,260,180].forEach((f,i) => grain(c,d,f,"sawtooth",0.02,0.26,0.4,1,i*0.14)),
    boss: (c,d) => { [0,0.45].forEach(t => grain(c,d,110,"sawtooth",0.03,0.55,0.6,0.8,t)); noiseGrain(c,d,0.6,0.3,300,0); },
    portal: (c,d) => { grain(c,d,300,"sine",0.05,0.5,0.4,2.5,0); noiseGrain(c,d,0.4,0.2,1200,0); },
    stairs: (c,d) => grain(c,d,260,"triangle",0.02,0.2,0.4,0.7,0),
    down: (c,d) => [300,260,220,180].forEach((f,i) => grain(c,d,f,"sine",0.02,0.26,0.4,1,i*0.12)),
    step: (c,d) => noiseGrain(c,d,0.09,0.12,500,0),
    hurtB: null,
  };

  function getBlob(name) {
    if (blobCache[name]) return blobCache[name];
    const fx = FX[name]; if (!fx) return null;
    // maximale Länge grob schätzen: 1.4 s reicht für alle Effekte
    const oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(SR * 1.4), SR);
    fx(oc, oc.destination);
    // synchron geht nicht — async Pfad: wir erzeugen URL nach dem Rendern
    const url = { pending: true };
    oc.startRendering().then(buffer => {
      const ch = buffer.getChannelData(0);
      const smp = new Float32Array(ch.length);
      for (let i = 0; i < ch.length; i++) smp[i] = ch[i];
      const u = URL.createObjectURL(wavFromSamples(smp));
      blobCache[name] = u;
      // laufende Warteschlangen bedienen
      for (const w of waiters[name] || []) w();
      waiters[name] = [];
    }).catch(() => {});
    blobCache[name] = null; // Platzhalter bis fertig
    return null;
  }
  const waiters = {};
  function play(name) {
    if (muted) return;
    let url = blobCache[name];
    if (url === undefined) { url = getBlob(name); } // stößt Rendering an
    if (!url) return; // noch im Rendern — nächster Aufruf läuft
    try {
      const a = new Audio(url);
      a.volume = 1.0;
      const pr = a.play();
      if (pr && pr.catch) pr.catch(() => {});
    } catch (e) {}
  }

  // ---------- Musik: 8-s-Loop offline gerendert, als loopendes <audio> ----------
  let musicEl = null, musicMode = "town";
  function musicBlobUrl(mode) {
    const key = "music_" + mode;
    if (blobCache[key]) return blobCache[key];
    const TOWNS = [[262,330,392,494],[220,277,330,415],[349,440,523,440],[294,370,440,370]];
    const DUNGEON = [[196,233,294,233],[175,220,262,220],[165,208,247,208],[147,185,220,185]];
    const seqs = mode === "town" ? TOWNS : DUNGEON;
    const base = mode === "town" ? 0.34 : 0.26;
    const STEP = 0.25, N = 32; // 8.0 s Loop
    const oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(SR * STEP * N), SR);
    for (let s = 0; s < N; s++) {
      const bar = Math.floor(s / 8) % seqs.length;
      const chord = seqs[bar], i = s % 8;
      const t0 = s * STEP;
      grain(oc, oc.destination, chord[i % 4], "triangle", 0.03, 0.5, base, 1, t0);
      if (i % 2 === 1) grain(oc, oc.destination, chord[(i + 2) % 4] * 2, "sine", 0.04, 0.45, base * 0.6, 1, t0);
      if (i % 4 === 2) grain(oc, oc.destination, chord[(i + 1) % 4] * 2 * 2, "sine", 0.04, 0.4, base * 0.4, 1, t0);
      if (i === 0) grain(oc, oc.destination, chord[0] / 2, "sine", 0.03, 0.9, base * 1.1, 1, t0);
    }
    blobCache[key] = null;
    oc.startRendering().then(buffer => {
      const ch = buffer.getChannelData(0);
      // Letzten 40 ms weich ausblenden für nahtlosen Loop
      const fade = Math.floor(SR * 0.04);
      for (let i = 0; i < fade; i++) ch[ch.length - 1 - i] *= i / fade;
      const u = URL.createObjectURL(wavFromSamples(ch));
      blobCache[key] = u;
      if (musicEl && musicEl.dataset.mode === mode) { musicEl.src = u; musicEl.loop = true; const p = musicEl.play(); if (p && p.catch) p.catch(()=>{}); }
      for (const w of waiters[key] || []) w();
      waiters[key] = [];
    }).catch(() => {});
    return null;
  }
  function music(mode) {
    if (mode) musicMode = mode;
    if (muted) return;
    const key = "music_" + musicMode;
    let url = blobCache[key];
    if (url === undefined) url = musicBlobUrl(musicMode);
    if (!musicEl) { musicEl = new Audio(); musicEl.loop = true; musicEl.volume = 1.0; }
    if (url) {
      if (musicEl.src !== url) { musicEl.src = url; }
      const p = musicEl.play(); if (p && p.catch) p.catch(() => {});
    }
    // Noch nicht gerendert: das erste musicEl.play() mit silence unlockt das Element,
    // sobald der Blob da ist (im .then) greift der src-Tausch oben.
    else if (musicEl.paused) {
      // Stummer 60-ms-WAV direkt erzeugt (sync!) zum Unlock
      try {
        const silent = wavFromSamples(new Float32Array(SR * 0.04));
        musicEl.src = URL.createObjectURL(silent);
        const p = musicEl.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    }
  }
  function stopMusic() { if (musicEl) { try { musicEl.pause(); } catch (e) {} } }
  function unlock() {
    // Media-Element-Unlock: leiser Stumm-Blip in der Geste
    try {
      const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
      a.volume = 0.01; const p = a.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  return {
    setMuted(m) { muted = m; if (m) stopMusic(); },
    isMuted() { return muted; },
    resume() { unlock(); },
    audioOk() { return musicEl ? !musicEl.paused || true : !!blobCache["music_town"]; },
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
  };
})();