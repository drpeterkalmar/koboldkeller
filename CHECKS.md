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

## V7 — Würfel-Look, Haptik dezent, Weg-Pfeil (automatisch, `tools/checks_v7.mjs`, Screenshots in `shots/neubau/v7/`)
| # | Check | Ziel |
|---|---|---|
| V18 | 🎲 20× würfeln (`?seed=7`): Name + Look ändern sich, ≥ 15 verschiedene Looks, keine direkte Wiederholung, alle Harmonie-Regeln, Name ≤ 12 Zeichen, Namensfeld editierbar, gleicher Seed = gleiche Folge | ja |
| V18b | 300 Würfe im Modul: 0 Harmonie-Verstöße, 0 Wiederholungen, Extra ≤ 60 %, alle 8 Tierarten; `NAMES` ≥ 150 ohne Duplikate, alle Namen + Baukasten ≤ 12 Zeichen, die 30 v6-Namen erhalten, Sperrliste (Beleidigendes/Zweideutiges; optional `KK_BLOCK_NAMES`) 0 Treffer | ja |
| V18c | Spiegel: „🎲 Zufallslook“ ändert nur das Aussehen, Name bleibt, wird übernommen | ja |
| V19 | Haptik-Stub (`navigator.vibrate` protokolliert), je 60 s Kampf vorher (`?hap=alt`) / nachher: v7 nur große Ereignisse, keine Pulse < 25 ms, Abstand ≥ 400 ms, ≤ 350 ms/s; „Vibration aus“ → 0 Aufrufe; „📳 Vibration testen“ vibriert + Hinweis | ja |
| V19b | iPhone-Muster (`?haptouch=1`): Switch nur in DOM-Knöpfen, deckt ≥ 75 % des Knopfs, nie über dem Canvas, nicht auf ⚔️; echter Tipp auf 🧪 wirkt + schaltet; Tap-to-move + Joystick ungestört; aus → Switches weg | ja |
| V20 | Weg-Pfeil nach 2,0 s Stillstand (nicht früher), Winkelfehler zum Pfad-Wegpunkt < 20° (Stadt, E1, Frost, Glut, versiegelt, „um die Ecke“ mit Luftlinie > 90° daneben), nie in eine Wand, bei Bewegung sofort weg, erneut erst nach 2 s | ja |
| V20b | Ziel-Regel (Stadt → Portal, Keller → Treppe, versiegelt → Arena bzw. Boss), kein Pfeil während Titelkarte und im Bosskampf, Einstellung greift, `findPath` nur beim Einblenden | ja |
| V21 | Save v6 → v7: Spielstand-Datei (v3) unverändert, alle Felder gleich, Einstellungen bleiben + 🧭 neu an, Weiterspielen stellt alles her | ja |
| Bot | `tools/bot.mjs 8731 20 6 --out=v7`: Normal durchspielbar | 0 Tode |

## V8 — Spielgefühl: Tempo, Boss-Leben, Ebenen-Wahl, Wandfallen (automatisch, `tools/checks_v8.mjs`, Screenshots in `shots/neubau/v8/`)
| # | Check | Ziel |
|---|---|---|
| V22 | Tempo auf gerader Strecke ≈ 4,7 (×1,25 … 1,36 ggü. v7), Schrittweite < 2,3 (Animation skaliert), Kamera läuft vorn mit; Finger 2,5 s **still** halten (echtes Touch) → > 7 Kacheln und läuft noch, Loslassen stoppt; ein Tipp 5 Kacheln weit → kommt an; 400 Sprünge/Stöße gegen Wände bei dt 0,05 s → 0 Frames in der Wand. Mit `--ref`: dieselben Messungen am alten Stand | ja |
| V23 | Alle 10 Bosse (Level 10): Leben = (Grund + proLevel·10) × `BOSS_HP_MUL` (1,25 … 1,35), Phasen bei 66/33 % (Mini 50 %) wie vorher, 30 erzwungene Wellen E20 → Deckel hält | ja |
| V24 | 20 Portale (1 … 20, je Welttor 4, 2 Pfosten), Abstand ≥ 2, Brunnen → jedes Portal ≤ 6 s (Pfadlänge / Tempo), offen = 1 … tiefste, 👑/⚡/🌀/🔒 + Namen, Weg-Pfeil → tiefstes Portal; echter Tipp auf Portal 9 → Ebene 9, `runFrom` 9; gesperrtes Portal → Hinweis, kein Wechsel; Pfad mitten über ein Portal → kein Betreten, Stehenbleiben → hinein; Tutorial-Schritt „Portal“ schließt ab; Spielstand v3 ohne neue Felder. Screenshots aller Tore hoch + quer | ja |
| V25 | 200 Ebenen (5 Seeds × Normal/MEGA): Anzahl = Tabelle, keine vor Ebene 3, keine Bahn im Eingangsraum/< 6 Kacheln vom Eingang/in Arenen, Bahnen ≥ 4 auseinander; Vorwarnung 0,8 … 1,1 s; Treffer = Pieks-Schaden, mit 💨 0; Haptik nur beim Treffer („hurt“); Schüsse derselben Falle ≥ 2,5 s auseinander; FPS (4×, E19, alle Fallen aktiv + 12 Gegner) ≥ 45. Screenshots je Welt Vorwarnung + Schuss, hoch + quer | ja |
| Bot | `tools/bot.mjs 8731 20 6 --out=v8`: Normal durchspielbar, Tipps nur auf Sichtbares, Stadt zu Fuß; Tabelle mit Lauf-Sekunden, Tipps, Wandfallen-Treffern, Bosskampf-Dauer | 0 Tode, 0 Hänger |

## V9 — Mythos-Kostüme (automatisch, `tools/checks_v9.mjs`, Screenshots in `shots/neubau/v9/`)
| # | Check | Ziel |
|---|---|---|
| V26 | 14 Kostüme × 8 Tierarten: Spielfigur (laufend), Porträt, Editor-Vorschau ohne Fehler, hoch + quer; Gesicht frei: Pixelvergleich Kopf mit/ohne Kopfteil im Gesichtsfeld (Augen, Wangen, Mund; auch mit Brille/Blume) < 3 % verändert, Gegenprobe Stirn unter Kapuzen > 30 %; Kontaktbogen; Laufen in allen 5 Welten | ja |
| V27 | Erster Sieg Mini-Boss (E2 → Waldfee), Hauptboss (E4 → Waldhüter), König (E20 → Phönix), König auf MEGASCHWER (→ Sternendrache): genau ein Paket, fliegt zum Kobold, Toast + echter Tipp „Anziehen“ (Knopf ≥ 44 px); zweiter Sieg → kein Paket; Speichern + Neu laden + Weiterspielen → Kostüm + Sammlung da; neues Spiel behält die Sammlung | ja |
| V28 | Migration echter v3-Spielstände (Format `save.js`): bossDone [2,4,6] → genau Waldfee, Waldhüter, Greif · won → Phönix · MEGA-Sieg (Spielstand) und 🔥 in der Ehrenhall → Sternendrache; Hinweis „Du hast N Kostüme verdient!“ genau einmal; alle anderen Felder gleich, Datei v3 | ja |
| V29 | 300 Würfe im Modul (Sammlung von 5): nur freigeschaltete, Anteil 20–40 %, 0 Harmonie-Verstöße, 0 Wiederholungen, Seed reproduzierbar; Editor-Würfel (20×) nur Kostüme der Sammlung | ja |
| V30 | Tab „🦄 Kostüme“ hoch + quer: 8 Tabs ≥ 48 px, 15 Felder ≥ 48 px, ≤ 4 je Reihe, gesperrte = dunkle Silhouette + „Besiege …“, Stufen-Rahmen, Zähler „6 / 14“, Tipp auf Gesperrtes ändert nichts, „🎩 Hut statt Kopfteil“ wirkt im Spiel; `?kostueme=alle`: alles frei + Hinweis, Sammlung und Spielstand unverändert | ja |
| V31 | Kellerkönig-Kampf (Wut-Phase, 9 Handlanger, Warnungen) mit Phönix bzw. Sternendrache, CPU 4× ≥ 45 FPS (hoch + quer); 400 Kostümwechsel → Sprite-Cache begrenzt (LRU) | ja |
| Bot | `tools/bot.mjs 8731 20 6 --out=v9 --myth=phoenix`: Normal mit Phönix durchspielbar | 0 Tode |

## V11 — Boss-Auftritt (automatisch, `tools/checks_v11.mjs`, Bildfolgen in `shots/neubau/v11/`)
| # | Check | Ziel |
|---|---|---|
| V33 | Haupt (E4), Mini (E2, E10), Flug-Mini (E6), König (E20), hoch + quer: vorher Boss nicht in `G.ents`, kein Kampf, Pfeil → Arena; Kobold im Torbogen / 1 Kachel hinter der Torlinie → nichts; 4 Seifenblasen durchs Tor → kein Treffer, kein Auftritt; 2 Kacheln drin → Tore zu + Auftritt; je Frame unverwundbar, kein Schaden, Boss nicht in `G.ents`; danach wach + Bosskampf, Dauer = Tabelle, kein Überlappen, Krater gebacken | ja |
| V33b | Besiegte Ebene: Tore bleiben offen, gleicher Auslöser; während des Bebens hinaus → Auftritt läuft zu Ende; Kobold genau auf dem Erscheinungspunkt → weggeschoben | ja |
| V33c | Frame-Zeit p95 während des Kellerkönig-Auftritts, CPU 4×, hoch + quer | ≥ 45 fps oder nicht schlechter als der Kampf danach |

## V12 — Fels statt schwarzem Nichts (automatisch, `tools/checks_v12.mjs`, Bilder in `shots/neubau/v12/`)
| # | Check | Ziel |
|---|---|---|
| V34 | Anteil Schwarz-Pixel (Helligkeit < 4 %, nur Canvas) je Welt (Stadt + 5 Welten), hoch + quer, Boss-Zoom E4/E20, Kartenkante, volles Wackeln; Vergleich `?fels=0` | < 10 % |
| V34b | Muster-Erzeugung je Welt, Zusatzspeicher, sichtbare Chunks, draw()-Median Fels an − aus (gleiche Szene im Wechsel, Median der Läufe), Desktop + CPU 4× | < 30 ms, ≤ 2 MB, < 28, ≤ 0,3 ms (4×: ≤ 0,5 ms wegen Messstreuung) |

Hinweis: Der ganze Lauf dauert ~27 min. In zwei Teilen: `--v7=skip` (A/B/C/V1–V17, ~9 min) und `--v7=only` (V18–V31, ~18 min).
Testserver: `python3 tools/serve.py 8731` (großer Backlog; der Standard-`http.server` ließ vereinzelt Modul-Anfragen > 30 s hängen).

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
