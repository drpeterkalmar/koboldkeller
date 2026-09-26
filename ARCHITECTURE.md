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
| `src/config.js` | Konstanten, Version, Spezies, Biome, Gegner-Tabellen, Namen |
| `src/rng.js` | mulberry32, Hilfsfunktionen |
| `src/world.js` | Stadt- und Dungeon-Generator, Kollision, BFS + Pfadglättung, freie Plätze |
| `src/art.js` | Prozedurale Sprites (Kobolde, Gegner, Bosse, Items, Kacheln, Wände, Props, FX) + Cache |
| `src/render.js` | Kamera, Iso-Projektion, Chunk-Cache, sortiertes Zeichnen, Licht, Post-FX |
| `src/fx.js` | Partikel-Pool, Screenshake (Trauma), Hit-Stop, Schadenszahlen, Blitze |
| `src/game.js` | Zustand, Spieler, Gegner-KI, Kampf, Loot, Level-Aufbau, Fortschritt, Sieg |
| `src/input.js` | Tap-to-Move, Halten-Folgen, virtueller Joystick, Tastatur |
| `src/ui.js` | Menüs, Charakterwahl, HUD, Toasts, Rucksack, Ehrenhall, Tutorial-Blasen |
| `src/audio.js` | Audio-Engine: Vor-Rendern, Busse/Mastering, Hall, Stimmen-Verwaltung, Ambience, SFX-API, Unlock, Mute |
| `src/sfxlib.js` | Klang-Rezepte (Effekte, Instrumente, Ambience) für das einmalige Offline-Rendern |
| `src/music.js` | Adaptive Musik: Look-ahead-Scheduler, Akkordkarte der Stadtmelodie, Biom-/Kampf-/Boss-Schichten, Stinger |
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
`G.hooks` (toast, banner, level, boss, win, dead, tut, fade, saved) — verdrahtet in `main.js`.

Juice-Bausteine: Hit-Stop (`FX.hitstop`, Welt steht, Kamera/Shake laufen), Zeitlupe beim Boss-Kill,
Trauma-Screenshake, Zoom-Punch, Squash & Stretch per Feder, Treffer-Blitz (weiße Silhouette aus dem
Sprite-Cache), Schadenszahlen, Münz-Explosion mit Bogenflug + Magnet, Dodge-Nachbilder, Warnkreise
der Bosse (bekommen eigenes Licht, Rand über den Figuren), Titelkarten für Welten/Bosse.

## Spielzustand (Auszug)
`G = { screen, depth, biome, map, ents[], items[], shots[], props[], p (Spieler), gold, run, … }`
Screens: `menu → create → play ⇄ pause/bag/hall → dead → play`, `win`.

## Save-Format (`koboldkeller2_save`)
`{ v:1, name, species, lvl, xp, xpNext, maxHp, hp, atk, projN, magic, gold, potions, shrooms,
hats[], hat, deepest, depth, mega, tut, runSecs, won, seed }` — Position wird **nicht** gespeichert.
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

## Audio (v3)
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

### Musik-Scheduler (`src/music.js`)
- Uhr = `AudioContext.currentTime`. `setInterval(50 ms)` weckt nur; geplant wird 300 ms voraus, 16tel-genau.
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
