# Koboldkeller 2 — Akzeptanz-Checks (messbar)

Geprüft durch `node tools/check.mjs` (Playwright, Chromium, Android-Profil 412×915 @DPR 2,
`hasTouch`, `isMobile`) + Vision-Loop (Screenshots in `shots/neubau/` selbst ansehen).
Jeder Punkt: **PASS/FAIL + Messwert** im Abschlussbericht.

## A — Technik / Plattform (automatisch)
| # | Check | Messung | Ziel |
|---|---|---|---|
| A1 | Keine Laufzeitfehler im ganzen Flow (hoch + quer) | `pageerror` + `console.error` zählen | 0 |
| A2 | FPS normal (Kampfszene, 5 s) | rAF-Frames / s im Spiel (`KK.perf()`) | ≥ 55 |
| A3 | FPS mit CPU-Throttle 4× (`--throttle=4`) | wie A2 | ≥ 45 |
| A4 | Canvas-Backbuffer ≤ 2× CSS-Größe | `cv.width / cv.clientWidth` | ≤ 2 |
| A5 | Keine externen Requests | alle Requests same-origin | 0 fremde |
| A6 | Cache-Buster | alle `<script>`/`<link>`/Import-Map-Ziele tragen `?v=N`, `window.KK_VER === N` | ja |
| A7 | Touch-Härtung | Canvas `touch-action:none`, `contextmenu` unterdrückt, Viewport `user-scalable=no` | ja |
| A8 | Layout | `100dvh`, `env(safe-area-inset-*)` im CSS | ja |
| A9 | App-Wechsel | `visibilitychange→hidden` ⇒ Spiel pausiert, Musik stumm | ja |
| A10 | Audio erst nach Geste | vor 1. Tap kein laufender AudioContext | ja |
| A11 | PWA | `manifest.webmanifest` + Icons 192/512 erreichbar, Vollbild-Button vorhanden, Wake-Lock abgesichert | ja |
| A12 | Alte v20-Saves | injiziertes `koboldkeller_save_v1` ⇒ kein Absturz, Name/Level/Gold übernommen | ja |
| A13 | Kaputte Saves | Müll in allen `koboldkeller*`-Keys ⇒ kein Absturz, Menü erscheint | ja |
| A14 | Querformat 915×412 | Flow läuft, Buttons sichtbar, kein Überlappen HUD/Buttons | ja |

## B — Kids-UX (automatisch + Screenshot)
| # | Check | Ziel |
|---|---|---|
| B1 | Versionslabel im Startmenü „🍄 Koboldkeller 2 · vN" | sichtbar |
| B2 | Charakterwahl: ≤ 4 Porträts pro Reihe bei 412 px | Zeilen-Zählung per Bounding-Box |
| B3 | Namensfeld mit Zufallsnamen vorbelegt, änderbar, 🎲 | nicht leer |
| B4 | Weiterspielen stellt Level/Gold/Tiefe her, Spawn am Ebenen-Eingang | Werte gleich nach Reload |
| B5 | Stadt: Brunnen heilt | HP steigt auf Max |
| B6 | Portal/Treppe triggern beim Draufsteigen (kein Menü) | Tiefe ändert sich |
| B7 | 20 Ebenen, Boss auf 4/8/12/16/20; Ebene 20 = Kellerkönig (riesig, rot, Krone, Flammen-Aura) | Boss vorhanden + Screenshot |
| B8 | Sieg per Boss-Kill UND per 20. Portal → Siegesbildschirm + Ehrenhall (Top-5 Münzen / Zeit, Medaillen, de-AT-Datum) | beide Wege |
| B9 | Namen in Ehrenhall HTML-escaped | Name `<b>X</b>` erscheint als Text |
| B10 | MEGASCHWER: Gegner 2× Tempo, 10× Schaden, 🔥-Badge | Werte + Badge |
| B11 | Rundumschlag 360°, Radius 3, Cooldown 0.25 s, trifft auch hinten | Gegner hinter Spieler nimmt Schaden |
| B12 | Seifenblasen, Dodge weg vom Gegner (+ Unverwundbarkeit), Trank, Rucksack | funktionieren |
| B13 | Erste Gegner zahm: Fledermaus Ebene 1 braucht ≥ 4 Treffer auf volle HP | ja |
| B14 | Tap-Laufen mit BFS um Wände; Auto-Befreiung aus Wand | Ziel erreicht / befreit |
| B15 | ⏸️ immer erreichbar, jedes Menü hat einen Rückweg | ja |
| B16 | Musik: dieselbe Glockenspiel-Melodie in Stadt und Keller | gleiche Quelle |
| B17 | UI komplett Deutsch | Sichtprüfung |

## C — Look & Juice (Vision-Loop, Screenshots)
| # | Check |
|---|---|
| C1 | Stadt: gemütlich, warmes Licht, Brunnen, Häuser, Portale, Tutorial-Hinweis |
| C2 | 5 Biome sichtbar unterschiedlich (Moos, Kristall, Zucker, Frost, Glut) |
| C3 | Chibi-Kobolde mit XXL-Glitzeraugen, weiche Formen, lesbar auf dunklem Boden |
| C4 | Kampf-Screenshot zeigt Partikel, Schadenszahlen, Schlag-Ring, Licht |
| C5 | Dynamisches Licht: Fackeln flackern, Spieler-Licht, leuchtende Projektile |
| C6 | Ausrüstung sichtbar am Kobold (Waffen-Stufe, Hut) |
| C7 | Skill-Buttons ≥ 56 px, im Daumenbereich, mit Cooldown-Ring |
| C8 | Keine Gewaltdarstellung über „Puff + Glitzer" hinaus |
