/* buendel.js — Technik-Etappe E1: Partikel gebündelt zeichnen (MIT)
   Bisher: jedes drehbare Partikel (Sterne, Konfetti, Brocken, Funken) mit save → translate → rotate → drawImage → restore.
   Bei 300–700 Partikeln im Kampf sind das ebenso viele Zustandswechsel im Canvas.
   Neu: je Sorte und Farbe 8 vorgedrehte Bilder (Funken 16, weil sie in Flugrichtung zeigen) → ein einfaches drawImage je
   Partikel. Additive Partikel werden zusätzlich nach Bild sortiert (bei „lighter“ ist die Reihenfolge egal: Summen mit
   Deckel bei 1 hängen nicht von der Reihenfolge ab) → gleiche Bilder liegen hintereinander.
   Hier nur die reinen Teile (Node-Tests: tests/node/buendel.test.mjs); das Zeichnen steht in render.js. */

// Sorte → [Anzahl Winkel, Symmetrie-Periode (rad), größte Zeichengröße in Design-Pixeln (s0/s1 im Code)]
// Die Winkel decken nur eine Symmetrie-Periode ab: ein 4-zackiger Stern sieht nach 90° gleich aus → 8 Bilder = 11,25°-Schritte.
const TAU = Math.PI * 2;
export const DREH = {
  star: [8, TAU / 4, 16],
  star5: [8, TAU / 5, 16],
  conf: [8, TAU / 2, 12],
  rock: [8, TAU, 16],
  streak: [16, TAU, 26],
};

/** Winkel → Index des nächsten vorgedrehten Bildes (0 … n−1) */
export function drehIndex(rot, per, n) {
  let a = rot % per;
  if (a < 0) a += per;
  const i = Math.round(a / per * n);
  return i >= n ? 0 : i;
}

/** Maße eines vorgedrehten Bildes: Seitenlänge (Design-Px) eines Quadrats, in das das Sprite (Breite smax, Seitenverhältnis
    h/w) in jedem Winkel passt, und Faktor „Quadratseite je Sprite-Breite“ fürs Zeichnen */
export function drehMasse(w, h, smax) {
  const d = smax * Math.hypot(1, h / w);
  return { d, faktor: d / smax };
}

/** Reihenfolge nach Bild-Kennung sortieren (ord = Indizes 0…n−1, kennung[i] = Zahl je Bild); stabil genug für „lighter“ */
export function sortiereNachBild(ord, kennung, n) {
  for (let i = 0; i < n; i++) ord[i] = i;
  const sub = ord.subarray(0, n);
  sub.sort((a, b) => kennung[a] - kennung[b]);
  return sub;
}
