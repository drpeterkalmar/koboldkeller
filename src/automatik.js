/* automatik.js — Technik-Etappe E1: Qualitäts-Automatik, 2D-Variante des Grafik-Autopiloten (MIT)
   (Logik nach ~/dev/stuntbahn/src/gfx/kern/autopilot.js, ohne WebGL/GPU-Zeit, für die 4 festen Stufen des Canvas-Zeichners)

   Bisher (v13): alle 2 s Bildrate gemittelt, unter 47 fps eine Stufe schlechter — nur abwärts, nie zurück, und ein Handy im
   30-Hz-Stromsparmodus landete grundlos auf der schlechtesten Stufe.
   Neu:
     • misst je Bild die ARBEITSZEIT (Spiel-Logik + Zeichnen, ms) und den Bildabstand. Wenig Arbeit, aber ruhig niedrige
       Bildrate (30 Hz-Stromsparen, 50-Hz-Bildschirm) = „gedeckelt“ → nicht abstufen.
     • runter: 3 schlechte Halbsekunden-Fenster in Folge (Bildrate < 50 oder Arbeit > 85 % des 60-Hz-Takts).
     • rauf: 8 s am Stück Luft (Bildrate ≥ 57 und Arbeit < 55 % des Takts) → eine Stufe besser.
     • kein Pendeln: fällt es binnen 6 s nach einem Schritt nach oben wieder, wird „rauf“ gesperrt (60 s, dann 120 … 600 s).
     • „gedeckelt“ kann auch eine Grafikkarte sein, die gleichmäßig nur 30 Bilder schafft (die GPU-Zeit sieht Canvas 2D nicht).
       Darum nach 20 s „gedeckelt“ EINE Probe: kurz auf die sparsamste Stufe. Wird es nicht schneller → zurück, nächste Probe
       erst nach 2, 4, 8 … min. Wird es schneller → es war die Grafik: ab jetzt zählt niedrige Bildrate wieder als „zu langsam“,
       und die Automatik arbeitet sich in 8-s-Schritten nach oben, bis es nicht mehr passt.
     • Schonzeit nach Start, Ebenenwechsel und jeder Stufenänderung (Art-Caches werden neu gebacken → Ladespitzen zählen nicht).
   Rein (Zeit nur aus den übergebenen Abständen) → in Node mit künstlichen Geräten testbar (tests/node/automatik.test.mjs).
   ?auto=0 schaltet die Automatik ab (Stufe bleibt, wo sie ist). */

export const AUTO_STANDARD = {
  takt: 1000 / 60,      // ms: Ziel-Bildzeit (60 fps; 90/120-Hz-Bildschirme müssen nicht voll bedient werden)
  fenster: 0.5,         // s je Messfenster
  trim: 0.1,            // obere 10 % je Fenster verwerfen (Einzelhänger)
  fpsRunter: 50,
  arbeitRunter: 0.85,   // Arbeit > 85 % des Takts → zu langsam
  arbeitDeckel: 0.45,   // Bildrate niedrig, Arbeit < 45 % des Takts und Abstände ruhig → von außen gedeckelt
  ruhig: 0.12,          // Streuung der Bildabstände (σ/Mittel) darunter = ruhig (Stromsparmodus tickt exakt)
  runterNach: 3,        // schlechte Fenster in Folge
  fpsLuft: 57,
  arbeitLuft: 0.55,
  raufNach: 16,         // gute Fenster in Folge (16 × 0,5 s = 8 s)
  ruhe: 2,              // Fenster nach jeder Änderung, die nicht zählen
  schonStart: 2.5,      // s
  probeZeit: 6,         // s: fällt es so kurz nach „rauf“ wieder, war der Schritt zu viel
  sperreBasis: 60, sperreMax: 600,
  deckelProbe: 20,      // s „gedeckelt“ am Stück, bis einmal probiert wird, ob eine Stufe weniger hilft
  probeDauer: 4.5,      // s nach dem Probe-Schritt bis zur Auswertung (inkl. Schonzeit)
  deckelPause: 120, deckelPauseMax: 960,   // s bis zur nächsten Probe (verdoppelt sich nach jeder erfolglosen)
};

export function gestutztesMittel(werte, n, trim = 0.1, tmp) {
  if (!n) return NaN;
  const a = tmp ? tmp.subarray(0, n) : new Float64Array(n);
  for (let i = 0; i < n; i++) a[i] = werte[i];
  a.sort();
  const m = Math.max(1, Math.ceil(n * (1 - trim)));
  let s = 0;
  for (let i = 0; i < m; i++) s += a[i];
  return s / m;
}

export class Automatik2D {
  /** opts.stufen = Anzahl Stufen (0 = beste), opts.start, opts.setzen(stufe, richtung), opts.aktiv, opts.einstellungen */
  constructor(opts = {}) {
    this.o = { ...AUTO_STANDARD, ...(opts.einstellungen || {}) };
    this.max = (opts.stufen ?? 4) - 1;
    this.stufe = Math.max(0, Math.min(this.max, opts.start ?? 0));
    this.setzen = opts.setzen || null;
    this.aktiv = opts.aktiv !== false;
    this.t = 0; this.schonBis = this.o.schonStart;
    const N = 512;
    this.ab = new Float64Array(N); this.ar = new Float64Array(N); this.n = 0; this.zeit = 0; this.tmp = new Float64Array(N);
    this.schlecht = 0; this.gut = 0; this.ruheRest = 0;
    this.letzterRauf = -1e9; this.sperreBis = 0; this.sperreDauer = this.o.sperreBasis; this.letzteSperre = -1e9;
    this.fps = 60; this.arbeit = 0; this.streu = 0; this.gedeckelt = false;
    this.gpuGebunden = false;   // Probe hat gezeigt: niedrige Bildrate kommt von der Grafik, nicht vom Stromsparen
    this.deckelSeit = null; this.probe = null; this.naechsteProbe = 0; this.deckelPause = this.o.deckelPause;
    this.log = []; this.aenderungen = 0;
  }
  schonen(sek = 1.5) { this.schonBis = Math.max(this.schonBis, this.t + sek); this.n = 0; this.zeit = 0; this.schlecht = this.gut = 0; }
  /** von außen gesetzte Stufe (Debug/Test) übernehmen, ohne Schritt-Logik */
  festsetzen(stufe) { this.stufe = Math.max(0, Math.min(this.max, stufe)); this.schonen(1); }

  /** Ein Bild: abstand = rAF-Abstand (s), arbeitMs = Arbeitszeit dieses Bildes (ms). true = Stufe geändert */
  bild(abstand, arbeitMs) {
    if (!(abstand > 0) || abstand > 0.5) return false;   // Hintergrund, Haltepunkt
    this.t += abstand;
    if (this.t < this.schonBis) return false;
    if (this.n < this.ab.length) { this.ab[this.n] = abstand * 1000; this.ar[this.n] = arbeitMs > 0 ? arbeitMs : 0; this.n++; }
    this.zeit += abstand;
    if (this.zeit < this.o.fenster) return false;
    const r = this.auswerten();
    this.n = 0; this.zeit = 0;
    return r;
  }
  auswerten() {
    const o = this.o, n = this.n;
    const ab = gestutztesMittel(this.ab, n, o.trim, this.tmp);
    this.arbeit = gestutztesMittel(this.ar, n, o.trim, this.tmp);
    this.fps = 1000 / ab;
    let v = 0; for (let i = 0; i < n; i++) { const d = this.ab[i] - ab; v += d * d; }
    this.streu = Math.sqrt(v / n) / ab;
    if (!this.aktiv) return false;
    if (this.ruheRest > 0) { this.ruheRest--; return false; }
    const takt = o.takt;
    // kurz nach einem Schritt nach oben zählt niedrige Bildrate immer als „zu langsam“ (der Schritt war zu viel)
    const kurzNachRauf = this.t - this.letzterRauf < o.probeZeit;
    this.gedeckelt = !this.gpuGebunden && !kurzNachRauf && this.fps < o.fpsRunter && this.arbeit < takt * o.arbeitDeckel && this.streu < o.ruhig;
    const zuLangsam = !this.gedeckelt && (this.fps < o.fpsRunter || this.arbeit > takt * o.arbeitRunter);
    const luft = !zuLangsam && this.fps >= o.fpsLuft && this.arbeit < takt * o.arbeitLuft;
    if (this.probe) {                                          // Probe-Schritt auswerten
      if (this.t < this.probe.bis) return false;
      const p = this.probe; this.probe = null;
      if (this.fps < o.fpsRunter) {                            // nicht schneller → war wirklich gedeckelt: zurück
        this.naechsteProbe = this.t + this.deckelPause;
        this.deckelPause = Math.min(o.deckelPauseMax, this.deckelPause * 2);
        return this.wechsel(p.von, +1, "probe-zurück");
      }
      this.deckelSeit = null; this.gpuGebunden = true;         // schneller → die Grafik war's: Stufe bleibt, rauf in 8-s-Schritten
      return false;
    }
    if (this.gedeckelt) {
      if (this.deckelSeit == null) this.deckelSeit = this.t;
      if (this.t - this.deckelSeit >= o.deckelProbe && this.t >= this.naechsteProbe && this.stufe < this.max) {
        this.deckelSeit = null;
        const von = this.stufe, r = this.wechsel(this.max, -1, "probe");
        this.probe = { von, bis: this.t + o.probeDauer };
        return r;
      }
    } else this.deckelSeit = null;
    if (zuLangsam) { this.schlecht++; this.gut = 0; } else if (luft) { this.gut++; this.schlecht = 0; } else { this.schlecht = 0; this.gut = 0; }
    if (this.schlecht >= o.runterNach) {
      this.schlecht = 0;
      if (this.t - this.letzterRauf < o.probeZeit) {          // Schritt nach oben war zu viel → rauf sperren, doppelt so lange
        this.sperreDauer = this.t - this.letzteSperre < o.sperreMax * 2 ? Math.min(o.sperreMax, this.sperreDauer * 2) : o.sperreBasis;
        this.sperreBis = this.t + this.sperreDauer; this.letzteSperre = this.t; this.letzterRauf = -1e9;
      }
      if (this.stufe < this.max) return this.wechsel(this.stufe + 1, -1, "runter");
      return false;
    }
    if (this.gut >= o.raufNach) {
      this.gut = 0;
      if (this.stufe > 0 && this.t >= this.sperreBis) { this.letzterRauf = this.t; return this.wechsel(this.stufe - 1, +1, "rauf"); }
    }
    return false;
  }
  wechsel(stufe, richtung, grund) {
    this.stufe = stufe;
    this.aenderungen++;
    this.ruheRest = this.o.ruhe;
    this.schlecht = this.gut = 0;
    const e = { t: +this.t.toFixed(1), stufe, richtung, grund, fps: +this.fps.toFixed(1), arbeit: +this.arbeit.toFixed(2), streu: +this.streu.toFixed(3) };
    this.log.push(e); if (this.log.length > 30) this.log.shift();
    if (this.setzen) this.setzen(stufe, richtung);
    this.schonen(1.5);                                        // Art-Caches backen neu → Ladespitze nicht mitzählen
    return true;
  }
  zustand() {
    return { stufe: this.stufe, aktiv: this.aktiv, fps: +this.fps.toFixed(1), arbeit: +this.arbeit.toFixed(2), streu: +this.streu.toFixed(3),
      gedeckelt: this.gedeckelt, gpuGebunden: this.gpuGebunden, probe: !!this.probe, gesperrt: this.sperreBis > this.t ? +(this.sperreBis - this.t).toFixed(1) : 0, aenderungen: this.aenderungen,
      t: +this.t.toFixed(1), log: this.log.slice(-8) };
  }
}
