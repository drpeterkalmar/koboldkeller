# Koboldkeller 2 — Architektur

## Engine-Entscheidung: Canvas 2D + Offscreen-Caches + Lightmap
- **Warum nicht WebGL:** Auf Android verliert WebGL beim App-Wechsel gern den Kontext
  (Context-Loss → komplettes Neu-Hochladen), und der Mehrwert (per-Pixel-Licht) ist bei
  weichem Chibi-Look klein. Canvas 2D ist in Chrome/Android GPU-beschleunigt; teuer sind dort
  nur Pfad-Rasterung und Gradienten — genau die cachen wir weg.
- **Prinzip:** Alles Vektorielle (Figuren, Kacheln, Wände, Props, Partikel-Formen) wird **einmal**
  prozedural in Offscreen-Canvases gezeichnet (Auflösung = Zoom × Render-Scale). Pro Frame
  laufen nur `drawImage` mit Transform (Squash & Stretch, Drehung, Flip) — ~150–300 Aufrufe.
- **Licht:** eigene Lightmap in ¼-Auflösung: Umgebungsfarbe füllen → Licht-Sprites additiv
  (`lighter`) → Vignette multiplizieren → per `multiply` über die Szene. Danach additive
  Glow-Sprites (Fackeln, Blasen, Portale, Augen-Glitzer). Schatten: Kontakt-Blob + gerichteter
  Schlagschatten weg vom nächsten starken Licht.
- **Adaptive Qualität:** Render-Scale startet bei `min(DPR,2)`; fällt der gleitende FPS-Schnitt
  unter 50, sinkt die Scale stufenweise (2 → 1.6 → 1.3 → 1) und Partikel-Budget halbiert sich.

## Messmethodik (FPS)
Headless-Chromium taktet `requestAnimationFrame` lastunabhängig herunter (leerer Vollbild-`fillRect`
nur 9–25 Hz) — so ist keine sinnvolle FPS-Messung möglich. `tools/check.mjs` misst deshalb:
- **Profil „gpu" (maßgeblich):** Chromium new-headless mit GPU-Raster (ANGLE/Metal — Canvas 2D läuft auf
  Android-Chrome ebenfalls auf der GPU) und ungedrosseltem Frame-Takt (`--disable-gpu-vsync`,
  `--disable-frame-rate-limit`). Gemessen wird der Frame-Durchsatz (Frames/s) in einer Kampfszene mit
  12 Gegnern, Rundumschlag + Blasen im Dauerfeuer — normal und mit CDP-CPU-Throttle 4×.
- **Profil „software" (Info/Worst Case):** reines Software-Raster ohne GPU; hier greift die adaptive Qualität.
- `KK.perf()` liefert zusätzlich die reine JS-Zeit pro Frame (`jsUpdate`, `jsDraw`).

## Welt / Koordinaten
- Welt in Kachel-Einheiten (float). Isometrie 2:1: `sx = (x−y)·U/2`, `sy = (x+y)·U/4 − z·U`.
- `U` (Kachelbreite in CSS-px) hängt vom Viewport ab: `clamp(min(VW,VH)/6.4, 52, 84)`.
- Tiefensortierung nach `x+y` (Wände: Kachelmitte), Figuren stehen auf dem Boden (z für Sprünge/Münzen).
- Boden wird in **Chunks à 8×8 Kacheln** vorgerendert (LRU, max. 28), Wände einzeln aus
  gecachten Block-Sprites sortiert gezeichnet (nur Wände mit Nachbarboden). Wände vor dem
  Spieler werden weich transparent.

## Module (ES-Module, keine Build-Tools)
Versionierung: `index.html` enthält eine **Import-Map** — jeder Modulpfad zeigt auf `…js?v=N`.
Nur dort (und in `KK_VER`) wird die Version erhöht.

| Datei | Aufgabe |
|---|---|
| `index.html` | DOM-Overlays (Menüs, HUD, Buttons), CSS, Import-Map, `window.KK_VER` |
| `src/main.js` | Boot, Game-Loop (rAF, dt-Clamp, Hit-Stop/Zeitlupe), Screen-Wechsel |
| `src/config.js` | Konstanten, Version, Spezies + Editor-Optionen, Biome, **Ebenen-Namen/-Farben (`LEVELS`)**, **Schwierigkeitskurve (`DIFF`)**, Bosse, Obergrenzen (`CAP`), Munition, Talente, Gegner-Tabellen |
| `src/rng.js` | mulberry32, Hilfsfunktionen |
| `src/world.js` | Stadt- und Dungeon-Generator, Kollision, BFS + Pfadglättung, freie Plätze |
| `src/art.js` | Prozedurale Sprites (Kobolde, Gegner, Bosse, Items, Kacheln, Wände, Props, FX) + Cache |
| `src/render.js` | Kamera, Iso-Projektion, Chunk-Cache, sortiertes Zeichnen, Licht, Post-FX |
| `src/fx.js` | Partikel-Pool, Screenshake (Trauma), Hit-Stop, Schadenszahlen, Blitze |
| `src/game.js` | Zustand, Spieler (Talente, Munition, Spezial), Gegner-KI (Elite, neue Muster), Kampf, Loot + Obergrenzen, Magnet, Fallen, Level-Aufbau, Heim-Portal, Sieg |
| `src/boss.js` | Bosse: Intro, 3 Phasen, Signatur-Angriffe je Welt (Warnkreise/-linien), Arena-Effekte, Sieg-Spektakel |
| `src/input.js` | Tap-to-Move, Halten-Folgen, virtueller Joystick, Tastatur |
| `src/ui.js` | Menüs, Charakter-Editor (Live-Vorschau), HUD (Munition, Spezial, Talentpunkte), Toasts, Rucksack mit Talenten, Ehrenhall, Tutorial, Boss-Karte |
| `src/audio.js` | Audio-Engine: Vor-Rendern, Busse/Mastering, Hall, Stimmen-Verwaltung, Ambience, SFX-API, Unlock, Mute |
| `src/sfxlib.js` | Klang-Rezepte (Effekte, Instrumente, Ambience) für das einmalige Offline-Rendern |
| `src/music.js` | Adaptive Musik: Abschnitts-Scheduler mit Tempo je Abschnitt, Welt-Songs (Tonart/Akkorde/Melodien A/B), Leitmotiv-Zwischenspiele, Stadt Tag/Abend, Kampf-/Boss-Schichten, Stinger in laufender Tonart |
| `src/save.js` | Save/Load, v20-Migration, Ehrenhall (`koboldkeller_hall_v1` weitergenutzt) |
| `src/platform.js` | Vollbild, Wake-Lock, Vibration, Sichtbarkeit, Kontextmenü-Sperre |
| `tools/check.mjs` | Playwright-Testlauf (Flow, Screenshots, FPS, Fehler) |
| `tools/icons.mjs` | Erzeugt `icons/icon-192/512.png` aus dem eigenen Art-Code |
| `tools/bot.mjs` | Autoplay-Bot: spielt Ebene 1→20 wie ein Kind (Tap auf Gegner/Treppe), meldet Hänger/Tode |
| `tools/smoke.mjs` | Schnelltest mit frei wählbaren Schritten (`eval=…`, `wait=…`, `shot=…`) |
| `tools/audiorender.mjs` | Rendert alle Effekt-Varianten + 60 s je Musikzustand offline nach WAV und misst mit ffmpeg (LUFS, True-Peak, < 80 Hz, Spektrogramm) |
| `tools/audiotest.mjs` | Handy-Realitätstest ohne Autoplay-Flag: Tap → AudioContext läuft, Effekte, 0 Live-Oszillatoren |

Datenfluss: `input` → Befehle an `game` → `game.update(dt)` → `fx` → `render.draw(state)`;
`ui` liest den Zustand (HUD nur bei Änderung neu schreiben). `game` kennt UI/Render nur über
`G.hooks` (toast, banner, level, boss, bossIntro, editor, win, dead, tut, fade, saved) — verdrahtet in `main.js`.
Zeitversetzte Spiel-Ereignisse (Konfetti-Wellen, Münzregen, Boss-Helfer) laufen über `later(sec, fn)` in Spielzeit
(stehen in Pause/Hit-Stop still).

Juice-Bausteine: Hit-Stop (`FX.hitstop`, Welt steht, Kamera/Shake laufen), Zeitlupe beim Boss-Kill,
Trauma-Screenshake, Zoom-Punch, Squash & Stretch per Feder, Treffer-Blitz (weiße Silhouette aus dem
Sprite-Cache), Schadenszahlen, Münz-Explosion mit Bogenflug + Magnet, Dodge-Nachbilder, Warnkreise
der Bosse (bekommen eigenes Licht, Rand über den Figuren), Titelkarten für Welten/Bosse.

## Spielzustand (Auszug)
`G = { screen, depth, biome, map, ents[], items[], shots[], props[], p (Spieler), gold, run, … }`
Screens: `menu → create → play ⇄ pause/bag/hall → dead → play`, `win`.

## Save-Format (`koboldkeller2_save`, v4 = `v:2`)
`{ v:2, name, species, look{species,skin,outfit,eye,hair,style,earsV,acc}, lvl, xp, xpNext, maxHp (Grundwert ohne Talente), hp,
atk (Grundwert), projN, magic, gold, potions, ammo, spec (0…1), sk{kraft,leben,tempo,blasen,magnet}, skPts,
hats[], hat, deepest, depth, mega, tut, runSecs, won, seed, kills, capNote, giftNote }` — Position wird **nicht** gespeichert.
**Migration v3 → v4** (`sanitize`, alles mit `v < 2`, also auch v20-Umzüge): Pilze → Spezial-Ladung (3 = voll), Überzähliges über
den Obergrenzen (Max-❤️ > 60, Tränke > 5, Pilze über voller Leiste) → Gold (`capNote`, einmaliger Toast „Dein Rucksack war zu voll …"),
bisherige Level → Talentpunkte als Willkommensgeschenk (`giftNote`). Nichts, was sichtbar war, geht verloren.
Migration: existiert nur `koboldkeller_save_v1` (v20), werden Name, Look (Spezies), Level, Gold,
Waffenwerte, tiefste Ebene übernommen + Geschenk (Veteranen-Hut). Der alte Key bleibt unangetastet.
Ehrenhall: `koboldkeller_hall_v1` `{gold:[…5], time:[…5]}` (validiert, kompatibel mit v20).

## Debug-API `window.KK`
| Aufruf | Wirkung |
|---|---|
| `KK.state()` | Kurzzustand `{screen, depth, hp, maxHp, lvl, gold, ents, boss, mega, secs, fps, x, y}` |
| `KK.start(opts)` | Neues Spiel ohne Menü (`{name, species, mega}`) |
| `KK.goto(d)` / `KK.descend()` | Ebene d betreten / eine tiefer (bei 20 → Sieg per Portal) |
| `KK.teleport(x,y)` oder `KK.teleport('stairs'|'boss'|'fountain'|'portal')` | Spieler versetzen |
| `KK.kill('all'|'boss'|'near')` | Gegner besiegen (mit normalem Loot/Sieg-Logik) |
| `KK.win('boss'|'portal')` | Sieg auslösen |
| `KK.god(on)` / `KK.heal()` / `KK.give(kind, n)` | Testhilfen |
| `KK.attack()` / `KK.bubbles()` / `KK.dodge()` / `KK.potion()` | Aktionen |
| `KK.spawn(type, dx, dy)` | Gegner relativ zum Spieler erzeugen |
| `KK.perf(reset)` | `{fps, p5, frames, scale}` gleitend gemessen |
| `KK.audio()` | Audio-Zähler: aktive Stimmen je Bus, gestartet/beendet/gestohlen, Musikzustand, Vor-Render-Werte, Main-Thread-ms |
| `KK.save()` / `KK.pause()` / `KK.resume()` | Speichern / Pause |
| `KK.speed(k)` | Zeitraffer (k Update-Schritte pro Frame, nur für Bot/Tests) |
| `KK.quality(q)` | Render-Qualitätsstufe 0–3 setzen (Scale 1 · 0.8 · 0.65 · 0.5 × DPR) |

## Spielregeln v4 (Überblick)
- **Munition:** `bubbles()` kostet 1 🫧 pro Schuss (egal wie viele Blasen); `gainAmmo` bei jedem Kill (normal 2, Elite 4, Boss 12,
  König 20, Strohwichtel 1). Voll → +1 🪙 statt Verfall. Leer → Knopf grau, sanfter „plopp", Hinweis-Toast höchstens alle 6 s.
- **Obergrenzen (`CAP`)**: Max-❤️ 60 (Level, Hüte, Talent), 🧪 5, 🫧 20 + 4 je Blasen-Talent (max. 60). Pickups über der Grenze → 🪙.
- **Spezial:** 🍄 lädt ⅓ der Leiste. `special()` → 0,42 s Aufladen (Zeitlupe, unverwundbar) → Welle Radius 5,5, Schaden 4·⚔️+6,
  löst feindliche Geschosse auf. Stil je Tierart (`SPECIAL_STYLE`), Klang je Stil (`special`-Varianten).
- **Magnet:** Münzen 3,5, Sachen 2,5 Kacheln (+0,35 je 🧲), Zug weich am Rand, schnell in der Nähe, gleitet an Wänden entlang.
- **Heim-Portal:** `G.homeHideT = 20` nach jedem Betreten; nur in echter Spielzeit (Pause/Rucksack/Editor zählen nicht). Versteckt =
  nicht gezeichnet, kein Licht/Label/Minikarte, kein Auslösen, kein Tap-Einrasten. Danach Einblenden + leiser Klang; scharf erst nach
  Entfernen (> 1,6 Kacheln).
- **Schwierigkeit:** `DIFF[tiefe]` (Anzahl, Leben, Schaden, Tempo, Angriffspause, Elite-Chance, Fallen, Raumgröße, neue Muster).
- **Bosse (`boss.js`):** Zustände sleep → intro (Kamera-Schwenk, Titelkarte, 1,9 s unverwundbar) → chase ⇄ atk/recover; Phasenwechsel
  bei 66 %/33 % (räumt Warnungen ab, Schockwelle schiebt weg, Banner, Stinger). Angriffe legen Warnungen (`G.teles`: Kreis oder Linie,
  mit Verzögerung) an; Schaden entsteht erst am Ende einer Warnung.

## Audio (v3/v4)
**Grundregel (Lehre aus v13):** Zur Laufzeit wird **nichts** synthetisiert. Jeder Effekt = `AudioBufferSourceNode` → `GainNode`
(→ `StereoPannerNode`). Alle Klänge entstehen einmalig per **OfflineAudioContext** aus Rezepten in `src/sfxlib.js`.

### Vor-Rendern
- Start 250 ms nach dem Boot, **ohne Nutzer-Geste** (Offline-Kontexte brauchen keine) — im Menü, bevor das Kind tippt.
- 58 Sätze (28 Effekte mit 1–5 Varianten, 22 Instrumente auf Referenztönen, 10 Ambience-Klänge/-Schleifen), je Satz ein
  Offline-Kontext, bis zu 3 gleichzeitig; zwischen den Sätzen `requestIdleCallback`. Main-Thread-Happen ≤ ~11 ms.
- Nachbearbeitung: Stille ab −54 dB kappen, Varianten gemeinsam auf Peak normieren, 128-Sample-Ausblende,
  Schleifen nahtlos (1 s Überblendung). 32 kHz (Pads/Wind 16 kHz), zusammen ~20 MB.
- Stadtmelodie (`audio/town.m4a`, CC0): wird dekodiert, auf die Takt-Eins geschnitten (erster Anschlag − 1,6 ms) und als
  exakt 28-Takt-Schleife (24 kHz, ~14 MB; > 12 kHz liegt nur −57 dB Energie) abgelegt.

### Bus-Struktur
```
Musik-Schichten ─► musicIn ─► Duck ─► Life(Tod) ─► Pause-Tiefpass ─► musicOut ─┐
                                        └─► musicSend ─► Hall ──────────────────┤
SFX (nass) ─► sfxLvl ─► (sfxSend ─► Hall) ──────────────────────────────────────┤
SFX (trocken: UI) ─► sfxDry ────────────────────────────────────────────────────┤
Stinger ─► stingBus ─► SFX nass                                                   │
Ambience ─► ambLvl ─► (ambSend ─► Hall) ────────────────────────────────────────┤
                                                                                   ▼
   pre ─► Hochpass 2× 85 Hz (4. Ordnung) ─► Glue-Kompressor (−14 dB, 2:1) ─► Limiter (−3 dB, 20:1, 1 ms)
       ─► Trim ─► Soft-Clip (WaveShaper 4× Oversampling, Decke −1,5 dBFS) ─► Ausgang
```
- **Hall:** ein `ConvolverNode`, Impulsantwort **selbst generiert** (abklingendes, zunehmend dunkleres Rauschen + frühe
  Reflexionen): Stadt 0,8 s hell, Keller 1,5–2,6 s je Biom. Sends je Ort (Stadt trocken, Kristallhöhle am nassesten).
- **Ducking:** Level-Up −6 dB, Boss-Erwachen −7 dB, Boss besiegt −8 dB, Sieg −10 dB, Treffer am Kobold −3 dB kurz; Tod
  blendet die Musik über „Life" aus. Pause/Rucksack: Musik gedämpft (Tiefpass 700 Hz).
- **Pegel** per `tools/audiorender.mjs` eingemessen: Musik allein −17,5 … −21 LUFS, Gesamtmix Kampf ≈ −16 LUFS,
  True-Peak < −3 dBTP, Anteil < 80 Hz ≤ −32 dB.

### Stimmen-Verwaltung
- Pro Effekt-Typ `max` Stimmen (sonst wird die älteste in 12 ms ausgeblendet = „gestohlen"), global 24 SFX / 48 Musik /
  6 Ambience. Gezählt wird zeitbasiert (klingt zum Startzeitpunkt) — gilt live wie offline.
- Gleicher Typ kurz hintereinander → um `gap` versetzt und −3 dB (Mehrfachtreffer klingen wie eine Salve, kein Kammfilter).
- Varianten: Round-Robin mit Zufall (nie zweimal dieselbe), ±Cent-Streuung (tonale Effekte 0 Cent = bleiben in der Tonart),
  ±1,2 dB Pegel-Streuung. Räumlich: Panorama nach Bildschirm-x (Iso `x−y`), leichte Dämpfung ab 2,5 Kacheln Abstand.
- Knoten werden in `ended` getrennt und aus der Liste entfernt (idempotent). Beleg: `node tools/bot.mjs 8731 20 4 --secs=120 --audio`.

### Musik-Scheduler (`src/music.js`, v4)
- Uhr = `AudioContext.currentTime`. `setInterval(50 ms)` weckt nur; geplant wird 300 ms voraus, 16tel-genau. Die Musik besteht aus
  **Abschnitten** mit eigenem Tempo (`sec.bpm`), Tempowechsel nur an Abschnittsgrenzen; Orts-/Boss-Wechsel an der nächsten Takt-Eins.
- **Welten** (`WORLDS`): Moos F-Dur 84 BPM (Flöte/Celesta/Kalimba) · Kristall a-Moll 96 (Celesta/Lead/Kristall) · Zucker C-Dur 108
  (Flöte/Spieluhr) · Frost D-Dur 76 (Glocke/Flöte/Harfe) · Glut g-Moll 92 (Flöte/Lead/Marimba). Form: Intro · A · A' · B · A'' (Takt 5 =
  Stadt-Motiv) · Pause, jeder 2. Durchgang + 8 Takte Stadtaufnahme im Höhlenklang (wechselnde Stelle). Noten als Stufen-Notation.
- **Stadt:** Aufnahme (28 Takte) ⇄ Zwischenspiel über das Motiv; 18–7 Uhr „Abend": Aufnahme gedämpft + Pad + Spieluhr.
- **Boss:** Vorlage in c-Moll, je Welt transponiert (Tempo/Lead/Verdopplung eigen), A/B-Teil, Wut-Phase +8 % Tempo + Rhythmus-Schicht.
- Die folgenden v3-Punkte gelten weiter:
- Vermessene Stadtmelodie: **Es-Dur, 90 BPM, 4/4, 28 Takte**. Pro Halbtakt sind Basston und die tatsächlich klingenden
  Tonklassen hinterlegt (FFT-Chroma-Analyse); Schichten spielen nur diese Töne (ohne kleine None/Tritonus zum Bass).
- **Stadt:** Aufnahme pur. **Keller:** Aufnahme leiser + Tiefpass („Höhlenklang") + Biom-Pad + Biom-Ornament
  (Moos: Kalimba · Kristall: Glas-Arpeggien · Zucker: Spieluhr · Frost: Glocken · Glut: Marimba-Ostinato).
- **Kampf:** Bedrohung (wache Gegner < 8 Kacheln, Boss doppelt, wenig ❤️ +1) → Intensität (schnell hoch, langsam runter);
  Stufe 1 Pizzicato-Bass + Shaker, Stufe 2 + Trommeln/Harfen-Fill. Wechsel nur an Halbtakt-Grenzen, mit Hysterese.
- **Boss:** eigenes Thema in c-Moll (Paralleltonart), 8 Takte, zitiert das Stadt-Motiv „C-Es-C-D-G"; Einsatz auf der
  Takt-Eins mit Becken, Aufnahme blendet in ½ Schlag aus; Kellerkönig + Tamburin/Glocken-Verdopplung.
- **Stinger** (Level-Up, Treppe, Portal, Boss besiegt, Sieg, Tod) auf das nächste 16tel quantisiert, in der Tonart der
  laufenden Musik (Es-Dur bzw. c-Moll). Münz-Serien steigen die Es-Pentatonik hinauf (G5 … Es7).
- Ambience: Stadt (Treiben-Schleife, Vögel, Brunnen räumlich), Keller je Biom (Wind + Tropfen/Kristall/Sprudeln/Eis/Lava),
  Fackel-Knistern nahe der nächsten Fackel. Alles am „🔔 Töne"-Schalter.

### Haptik (`haptic(kind)` in `src/platform.js`)
Muster nach Stärke (leicht 5–14 ms … Ereignis-Muster für Boss/Level-Up/Tod/Sieg), Vorrang (schwache Impulse unterbrechen
keine starken), leichte Impulse ≥ 70 ms Abstand, Münzen ≤ 1/s, Budget ≤ 350 ms Vibration pro Sekunde. Um die gemessene
Ausgabe-Latenz des AudioContext versetzt, damit Vibration und Schall-Transient zusammenfallen. iPhone: Switch-Tick wie v2.
