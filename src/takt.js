/* takt.js — Technik-Etappe E2: fester Simulationstakt (60 Hz) + Zwischenbild für die Zeichenposition (MIT)

   Warum: Bisher lief die Spiel-Logik einmal je Bild mit dem echten Bildabstand (dt). Auf einem 120-Hz-Handy rechnete
   sie also doppelt so oft wie nötig, auf 30 Hz in großen Sprüngen. Jetzt rechnet sie immer in festen 1/60-s-Schritten:
     • 30 Hz  → 2 Schritte je Bild, 60 Hz → 1, 90 Hz → 1,1,0 …, 120 Hz → 1,0,1,0 (Logik-Last halbiert).
     • gleiches Spieltempo und gleiche Treffer bei jeder Bildrate (Node-Test tests/node/takt.test.mjs).
     • gezeichnet wird zwischen dem vorletzten und dem letzten Schritt überblendet (alpha), damit sich Figuren bei 90/120 Hz
       trotzdem flüssig bewegen.
   Hitstop/Zeitlupe laufen je Schritt (spielDt) — genau wie früher je Bild, nur in festen Stücken.
   Rein (ohne DOM) → in Node testbar. ?takt=0 = alte Schleife (main.js). */

export const TAKT_HZ = 60;

// übliche Bildwiederholraten. rAF-Zeitstempel zittern um ±0,1 … 0,4 ms; ohne Einrasten käme bei 60 Hz mal 0, mal 2 Schritte
// heraus (sichtbares Ruckeln). Deshalb: Bildrate aus dem Median der letzten 15 Abstände erkennen (nur wenn er nahe einer
// üblichen Rate liegt) und jeden Abstand auf ein Vielfaches davon einrasten. Der Rundungsfehler wird gesammelt und
// nachgeholt, damit die Spielzeit der echten Zeit folgt (59,94-Hz-Bildschirm: alle ~8 s ein Bild ohne Schritt).
const RATEN = [20, 24, 30, 40, 45, 48, 50, 60, 72, 75, 80, 90, 100, 120, 144, 165, 240];

/** Median-Abstand (s) → Vsync-Abstand einer üblichen Bildrate (±4 %), sonst 0 */
export function erkenneVsync(median) {
  let best = 0, bd = 0.04;
  for (const hz of RATEN) { const d = Math.abs(median * hz - 1); if (d < bd) { bd = d; best = 1 / hz; } }
  return best;
}
/** Abstand s auf k·vs (k = 1…4) einrasten, wenn er höchstens min(1,2 ms; 15 % von vs) daneben liegt, sonst unverändert */
export function rasteAbstand(s, vs) {
  if (!(vs > 0)) return s;
  const k = Math.round(s / vs);
  if (k < 1 || k > 4) return s;
  return Math.abs(s - k * vs) <= Math.min(0.0012, vs * 0.15) ? k * vs : s;
}

export class Takt {
  /** opts.hz = Simulationstakt, opts.maxSchritte = höchstens so viele Schritte je Bild (wie früher dt ≤ 50 ms) */
  constructor(opts = {}) {
    this.hz = opts.hz || TAKT_HZ;
    this.h = 1 / this.hz;
    this.maxSchritte = opts.maxSchritte || 3;
    this.acc = 0.3 / this.hz;   // noch nicht gerechnete Zeit (s), 0 … h. Start bei 0,3·h: Abstand zu den Schrittgrenzen bei 60 und 120 Hz
    this.rest = 0;       // Fehler aus dem Einrasten (s) — wird nachgeholt, damit Spielzeit = echte Zeit bleibt
    this.alpha = 0;      // Überblendung fürs Zeichnen: 0 = Stand vor dem letzten Schritt, 1 = Stand danach
    this.vs = 0;         // erkannter Vsync-Abstand (s), 0 = unbekannt
    this.hist = new Float64Array(15); this.hn = 0; this.hi = 0; this.sort = new Float64Array(15);
    this.schritteGesamt = 0;
    this.verworfen = 0;  // s, die nach Hängern verworfen wurden (Tab im Hintergrund, Ladespitze)
  }
  _lerne(s) {
    this.hist[this.hi] = s; this.hi = (this.hi + 1) % this.hist.length; if (this.hn < this.hist.length) this.hn++;
    if (this.hn < 5) return;
    const a = this.sort.subarray(0, this.hn); a.set(this.hist.subarray(0, this.hn)); a.sort();
    this.vs = erkenneVsync(a[this.hn >> 1]);
  }
  /** Ein Bild mit echtem Abstand `s` (Sekunden) → Anzahl fester Schritte, die jetzt gerechnet werden sollen */
  schritte(s) {
    if (!(s > 0)) { this.alpha = Math.min(1, this.acc / this.h); return 0; }
    if (s > 0.25) { this.verworfen += s - this.h; s = this.h; this.rest = 0; }   // Hänger/Hintergrund: wie früher nicht nachholen
    else this._lerne(s);
    const r = rasteAbstand(s, this.vs);
    this.rest += s - r;
    let add = r;
    if (Math.abs(this.rest) > this.h * 0.5) { add += this.rest; this.rest = 0; }   // Abweichung echte Zeit ↔ Raster nachholen
    this.acc += add;
    let n = Math.floor((this.acc + 1e-7) / this.h);
    if (n > this.maxSchritte) { const weg = (n - this.maxSchritte) * this.h; this.verworfen += weg; this.acc -= weg; n = this.maxSchritte; }
    this.acc -= n * this.h;
    if (this.acc < 0) this.acc = 0;
    if (this.acc >= this.h) this.acc = this.h * 0.999;
    this.alpha = this.acc / this.h;
    this.schritteGesamt += n;
    return n;
  }
  /** nach Ebenenwechsel/Teleport: nichts überblenden, Rest verwerfen */
  zuruecksetzen() { this.acc = 0.3 * this.h; this.rest = 0; this.alpha = 0; }
}

/** Spielzeit für einen festen Schritt der Länge h: Hitstop hält an, Zeitlupe dehnt, Pause steht (wie bisher je Bild) */
export function spielDt(FX, h, pause) {
  let dt = h;
  if (FX.hitstop > 0) { FX.hitstop -= h; dt = 0; }
  if (FX.slowT > 0) { FX.slowT -= h; dt *= FX.slowF; }
  if (pause) dt = 0;
  return dt;
}

/** Zwischenbild: merkt die Positionen VOR dem letzten Schritt eines Bildes, setzt fürs Zeichnen die überblendete Position
    und stellt danach den echten Stand wieder her (die Spiel-Logik sieht nie eine Zwischenposition).
    Sprünge > maxSprung Kacheln (Teleport, Ebenenwechsel, Ausweichsprung-Ende) werden nicht überblendet. */
export class Zwischenbild {
  constructor(opts = {}) {
    this.maxSprung = opts.maxSprung ?? 1.5;
    this.n = 0; this.o = [];
    this.px = new Float64Array(256); this.py = new Float64Array(256); this.pz = new Float64Array(256);
    this.cx = new Float64Array(256); this.cy = new Float64Array(256); this.cz = new Float64Array(256);
    this.gesetzt = 0;
    this.aktiv = false;
    this._f = (o) => this._merke1(o);
  }
  _platz(n) {
    if (n <= this.px.length) return;
    let m = this.px.length; while (m < n) m *= 2;
    for (const k of ["px", "py", "pz", "cx", "cy", "cz"]) { const a = new Float64Array(m); a.set(this[k]); this[k] = a; }
  }
  _merke1(o) {
    if (!o) return;
    const i = this.n++;
    this._platz(this.n);
    this.o[i] = o; this.px[i] = o.x; this.py[i] = o.y; this.pz[i] = typeof o.z === "number" ? o.z : NaN;
  }
  /** sammle(f) ruft f(obj) für jedes bewegte Objekt auf (Spieler, Gegner, Beute, Geschosse, Partikel) */
  merke(sammle) {
    this.n = 0;
    sammle(this._f);
    for (let i = this.n; i < this.o.length && this.o[i] !== undefined; i++) this.o[i] = undefined;   // keine alten Verweise halten
  }
  vergiss() { this.merke(() => { }); }
  /** Zeichenposition setzen (alpha 0…1); muss mit zurueck() abgeschlossen werden */
  setze(alpha) {
    if (this.aktiv) this.zurueck();
    const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha, M = this.maxSprung;
    let g = 0;
    for (let i = 0; i < this.n; i++) {
      const o = this.o[i];
      const x = o.x, y = o.y, z = o.z;
      this.cx[i] = x; this.cy[i] = y; this.cz[i] = typeof z === "number" ? z : NaN;
      const px = this.px[i], py = this.py[i];
      if (!(Math.abs(x - px) <= M && Math.abs(y - py) <= M)) { this.cx[i] = NaN; continue; }   // Sprung → echter Stand
      o.x = px + (x - px) * a; o.y = py + (y - py) * a;
      const pz = this.pz[i];
      if (pz === pz && this.cz[i] === this.cz[i]) o.z = pz + (z - pz) * a;
      g++;
    }
    this.gesetzt = g;
    this.aktiv = true;
  }
  zurueck() {
    if (!this.aktiv) return;
    for (let i = 0; i < this.n; i++) {
      const cx = this.cx[i];
      if (cx !== cx) continue;
      const o = this.o[i];
      o.x = cx; o.y = this.cy[i];
      const cz = this.cz[i];
      if (cz === cz) o.z = cz;
    }
    this.aktiv = false;
  }
}
