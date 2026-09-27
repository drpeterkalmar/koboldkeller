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
| A15 | Effekt-Dauerfeuer vs. Effekte aus (Kampfszene, Throttle 4×, 5 A/B-Paare) | Main-Thread-Anteil der Audio-Engine (stabil); FPS-Median nur Info — headless-FPS schwankt bei identischen Einstellungen ±20 % (Messreihe v4: 303–433 fps) | < 3 %, FPS ≥ 45 |
| A3b | Boss-Kampf Kellerkönig in Wut-Phase mit allen Effekten, CPU-Throttle 4× | wie A2 | ≥ 45 |
| A14b | Querformat: Munition + Spezial-Leiste + ✨-Knopf sichtbar, kein Überlappen | Bounding-Boxen | ja |
| A16 | Vor-Rendern im Menü | Dauer, längster Main-Thread-Happen, längster Menü-Frame währenddessen | Happen < 16 ms, Frame < 50 ms, < 12 s |

## D — Audio (Skripte)
| # | Check | Messung | Ziel |
|---|---|---|---|
| D1 | Handy-Regeln ohne Autoplay-Flag (`tools/audiotest.mjs`) | Tap → `running`, Effekte gestartet, Live-Oszillatoren, Fehler | läuft, > 0, 0, 0 |
| D2 | Pegel (`tools/audiorender.mjs`, ffmpeg ebur128) | Gesamtmix Kampf LUFS integriert, True-Peak je Zustand | ≈ −16 LUFS, < −1 dBTP |
| D3 | Kein Dröhn-Bass | Anteil < 80 Hz je Musikzustand (RMS relativ) | ≤ −30 dB |
| D4 | Knoten-Leck (`tools/bot.mjs … --secs=120 --audio`) | aktive Stimmen über 2 min, offen == aktiv | kein Wachstum |

| D5 | Musik je Welt (`check.mjs`) | Stadt = Leitmotiv-Aufnahme, 5 Welten mit verschiedener Tonart + Tempo | ja |

## V — v4-Wünsche (automatisch, `check.mjs`, Screenshots in `shots/neubau/v4/`)
| # | Check | Ziel |
|---|---|---|
| V1 | Munition: 1 Schuss = 1 🫧 bei 3 Blasen, Kill +2 / Elite +4 / Boss +12, voll → +1 🪙 + „VOLL", leer = Knopf grau + genau 1 Hinweis, Schwert unbegrenzt | ja |
| V2 | Obergrenzen: 🧪 5 (Extra → +10 🪙), ❤️-Pickup bei voll → +2 🪙, Max-❤️ 60, Leben-Talent sperrt | ja |
| V3 | Magnet: Münze 3,5 / Sachen 2,5 Kacheln (innen wird angezogen, außen nicht), 🧲 vergrößert | ja |
| V4 | Editor: 10 Frisuren für alle 8 Tierarten, Frisurwechsel ändert die Vorschau, Spiegel öffnet Editor, Aussehen im Spiel + gespeichert | ja |
| V5 | Talente wirken (💪 +0,5, ❤️ +2, 🫧 +4, 👟 +5 %), Rucksack-„+", Umverteilen nur in der Stadt | ja |
| V6 | 3 Pilze → Spezial voll, Pilze heilen nicht, ✨ leuchtet, Flächenangriff trifft nah, nicht fern | ja |
| V7 | 20 eindeutige Ebenen-Namen (Titelkarte + HUD), 20 verschiedene Paletten, Screenshot jeder Ebene | ja |
| V8 | Jeder Boss: Phasen 1→2→3, Signatur-Angriffe erzeugen Warnkreise/-linien, Screenshot je Phase | ja |
| V9 | v3-Spielstand → v4 (→ v5): nichts verloren, Überzähliges → Gold + Hinweis, Pilze → Spezial, Talentpunkte, Datei v3 | ja |
| V10 | Heim-Portal 20 s weg (nicht auslösbar, Pause friert Timer), danach sichtbar, erst nach Weggehen/Zurück → Stadt | ja |
| Bot | `tools/bot.mjs … [--mega]`: Schwierigkeitskurve pro Ebene (Zeit, Schaden, Tode), Normal durchspielbar | Tabelle im Bericht |

## V5 — Boss-Runde (automatisch, `check.mjs`, Screenshots in `shots/neubau/v5/`)
| # | Check | Ziel |
|---|---|---|
| V11 | Bug-Regression Ebene 4/2/8/20: Boss lebt → Draufstellen, Dodge drauf, Dodge drüber, Rückstoß ⇒ kein Ebenenwechsel/Sieg; Boss töten ⇒ Treppe öffnet sichtbar ⇒ Betreten = Ebene +1 (E20: Sieg); Heimportal ≥ 4 Kacheln von der Arena | ja |
| V12 | Wiedereinstieg: besiegter Boss → Treppe offen, Tore bleiben offen; unbesiegter → versiegelt; `bossDone` im Spielstand | ja |
| V13 | Mini-Bosse nur auf 2/6/10/14/18 (5 verschiedene Namen/Wesen/Angriffe), Hauptbosse 4/8/…/20, keiner auf ungeraden Ebenen, jeder Angriff mit Warnungen, Mini < 80 % Hauptboss-Höhe und weniger ❤️, Mini-Boss-Musik | ja |
| V14 | Arena je Boss-Ebene ≥ `ARENA`-Tabelle und mit der Tiefe steigend, Säulen/Tore/Spawn-Punkte, Tore zu sobald man drin ist, Kamera-Zoom < 0,9, sichtbare Chunks < 28 | ja |
| V15 | Handlanger spawnen im Kampf (Spawn-Kreis gesehen), Deckel nie überschritten (auch erzwungen), Beute 🫧 +1 / ≤ ⅓ XP; nach Sieg sofort 0 Handlanger/Spawn-Kreise/Boss-Timer und 10 s Spielzeit später immer noch 0, Tore offen | ja |
| V16 | Querformat: jede Arena herausgezoomt, Chunks < 28 (Screenshots jeder Arena hoch + quer) | ja |
| V17 | Save-Migration v4 → v5: nichts verloren, keine doppelten Geschenke, passierte Boss-Ebenen offen, tiefere versiegelt, Datei v3 | ja |
| A3b | Größter Bosskampf (Kellerkönig, Arena 24, Wut-Phase, 9 Handlanger), CPU-Throttle 4× | ≥ 45 FPS |

## B — Kids-UX (automatisch + Screenshot)
| # | Check | Ziel |
|---|---|---|
| B1 | Versionslabel im Startmenü „🍄 Koboldkeller 2 · vN" | sichtbar |
| B2 | Charakterwahl: ≤ 4 Porträts pro Reihe bei 412 px | Zeilen-Zählung per Bounding-Box |
| B3 | Namensfeld mit Zufallsnamen vorbelegt, änderbar, 🎲 | nicht leer |
| B4 | Weiterspielen stellt Level/Gold/Tiefe her, Spawn am Ebenen-Eingang | Werte gleich nach Reload |
| B5 | Stadt: Brunnen heilt | HP steigt auf Max |
| B6 | Portal/Treppe triggern beim Draufsteigen (kein Menü) | Tiefe ändert sich |
| B7 | 20 Ebenen, Boss auf 4/8/12/16/20 (+ Mini-Bosse 2/6/…/18, siehe V13); Ebene 20 = Kellerkönig (riesig, rot, Krone, Flammen-Aura) | Boss vorhanden + Screenshot |
| B8 | Sieg per Boss-Kill UND (nach besiegtem König) per 20. Portal → Siegesbildschirm + Ehrenhall (Top-5 Münzen / Zeit, Medaillen, de-AT-Datum) | beide Wege |
| B9 | Namen in Ehrenhall HTML-escaped | Name `<b>X</b>` erscheint als Text |
| B10 | MEGASCHWER: Gegner 2× Tempo, 10× Schaden, 🔥-Badge | Werte + Badge |
| B11 | Rundumschlag 360°, Radius 3, Cooldown 0.6 s, trifft auch hinten | Gegner hinter Spieler nimmt Schaden |
| B12 | Seifenblasen, Dodge weg vom Gegner (+ Unverwundbarkeit), Trank, Rucksack | funktionieren |
| B13 | Erste Gegner zahm: Fledermaus Ebene 1 braucht ≥ 4 Treffer auf volle HP | ja |
| B14 | Tap-Laufen mit BFS um Wände; Auto-Befreiung aus Wand | Ziel erreicht / befreit |
| B15 | ⏸️ immer erreichbar, jedes Menü hat einen Rückweg | ja |
| B16 | Musik: Stadtmelodie bleibt Leitmotiv (Stadt + Zwischenspiel im Keller), Welten mit eigener Musik | Quelle + D5 |
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
