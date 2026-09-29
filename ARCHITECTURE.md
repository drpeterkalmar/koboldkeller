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
| `src/art.js` | Prozedurale Sprites (Kobolde, Gegner, Bosse, Items, Kacheln, Wände, Props, FX) + Cache (v9: LRU für Aussehen-Sprites) |
| `src/myth.js` | v9: Mythos-Kostüme — Körper-Überzug, Kopfteil (Kapuze/Helm in zwei Lagen oder Hut), Rückenteil (Flügel/Umhang/Schwänze, per Transform animiert) |
| `src/render.js` | Kamera, Iso-Projektion, Chunk-Cache, sortiertes Zeichnen, Licht, Post-FX |
| `src/fx.js` | Partikel-Pool, Screenshake (Trauma), Hit-Stop, Schadenszahlen, Blitze |
| `src/game.js` | Zustand, Spieler (Talente, Munition, Spezial), Gegner-KI (Elite, neue Muster), Kampf, Loot + Obergrenzen, Magnet, Fallen, Level-Aufbau, Heim-Portal, Sieg |
| `src/guide.js` | v7: Weg-Pfeil — Stillstand-Timer, Ziel-Regel, Richtung entlang des Pfades (`findPath` nur beim Einblenden) |
| `src/boss.js` | Bosse: Intro, 3 Phasen, Signatur-Angriffe je Welt (Warnkreise/-linien/-ringe), Arena-Effekte, Sieg-Spektakel; v5: Mini-Bosse (2 Phasen), Arena-Logik (Wecken, Tore, Handlanger-Wellen, Despawn, Entsiegeln) |
| `src/input.js` | Tap-to-Move, Halten-Folgen, virtueller Joystick, Tastatur |
| `src/ui.js` | Menüs, Charakter-Editor (Live-Vorschau), HUD (Munition, Spezial, Talentpunkte), Toasts, Rucksack mit Talenten, Ehrenhall, Tutorial, Boss-Karte |
| `src/audio.js` | Audio-Engine: Vor-Rendern, Busse/Mastering, Hall, Stimmen-Verwaltung, Ambience, SFX-API, Unlock, Mute |
| `src/sfxlib.js` | Klang-Rezepte (Effekte, Instrumente, Ambience) für das einmalige Offline-Rendern |
| `src/music.js` | Adaptive Musik: Abschnitts-Scheduler mit Tempo je Abschnitt, Welt-Songs (Tonart/Akkorde/Melodien A/B), Leitmotiv-Zwischenspiele, Stadt Tag/Abend, Kampf-/Boss-Schichten, Stinger in laufender Tonart |
| `src/save.js` | Save/Load, v20-Migration, Ehrenhall (`koboldkeller_hall_v1` weitergenutzt) |
| `src/platform.js` | Vollbild, Wake-Lock, Vibration, Sichtbarkeit, Kontextmenü-Sperre |
| `tools/check.mjs` | Playwright-Testlauf (Flow, Screenshots, FPS, Fehler); `--v7=skip|only` teilt den Lauf |
| `tools/checks_v7.mjs` | v7-Checks V18–V21 (Würfel/Namen, Haptik-Stub, Weg-Pfeil, Save v6 → v7), auch einzeln lauffähig |
| `tools/checks_v9.mjs` | v9-Checks V26–V31 (Kostüme × Tierarten + Gesicht frei, Freischalten, Migration, Würfel, Editor, Leistung/Cache) |
| `tools/mythsheet.mjs` | Kontaktbogen aller Kostüme × 8 Tierarten |
| `tools/checks_v8.mjs` | v8-Checks V22–V25 (Tempo/Steuerung, Boss-Leben, Ebenen-Wahl/Welttore, Wandfallen), `--ref=PORT` = Vergleich mit altem Stand |
| `tools/serve.py` | Statischer Testserver mit großem Backlog (der Standard-`http.server` ließ Modul-Anfragen hängen) |
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

## Save-Format (`koboldkeller2_save`, v5 = `v:3`)
`{ v:3, bossDone[] (Boss-Ebenen, deren Boss besiegt ist), name, species, look{species,skin,outfit,eye,hair,style,earsV,acc}, lvl, xp, xpNext, maxHp (Grundwert ohne Talente), hp,
atk (Grundwert), projN, magic, gold, potions, ammo, spec (0…1), sk{kraft,leben,tempo,blasen,magnet}, skPts,
hats[], hat, deepest, depth, mega, tut, runSecs, won, seed, kills, capNote, giftNote }` — Position wird **nicht** gespeichert.
**Migration v3 → v4** (`sanitize`, alles mit `v < 2`, also auch v20-Umzüge): Pilze → Spezial-Ladung (3 = voll), Überzähliges über
den Obergrenzen (Max-❤️ > 60, Tränke > 5, Pilze über voller Leiste) → Gold (`capNote`, einmaliger Toast „Dein Rucksack war zu voll …"),
bisherige Level → Talentpunkte als Willkommensgeschenk (`giftNote`). Nichts, was sichtbar war, geht verloren.
**Migration v4 → v5** (`v < 3`): `bossDone` = alle Boss-Ebenen (2, 4, …) unterhalb der tiefsten erreichten Ebene (+ 20, wenn schon gewonnen) —
die Kinder waren dort schon vorbei, nichts wird nachträglich gesperrt. Sonst ändert sich nichts (keine erneuten Geschenke).
**v7:** Spielstand-Datei unverändert (`v:3`, geprüft in V21). Einstellungen (`koboldkeller2_settings`) bekommen `arrow` (🧭, fehlt → an).
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
| `KK.arena()` / `KK.wave(n)` | Arena-Zustand (Größe, Säulen, Tore zu?, Handlanger lebend/erscheinend, Deckel, Treppe versiegelt?) / Welle erzwingen (Deckel gilt) |
| `KK.guide()` / `KK.guideAim()` / `KK.path(x,y)` | v7: Weg-Pfeil-Zustand (a = Deckkraft, idle, ux/uy, Wegpunkt, Ziel, Zähler shows/calcs) / Richtung jetzt berechnen / Pfad vom Kobold |
| `KK.hap()` / `KK.editor()` | v7: Haptik-Zähler (Aufrufe + ausgelöst je Art, Modus v7/alt) / Editor-Zustand (Look, Name, Würfe) |

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
  bei 66 %/33 % (räumt Warnungen ab, Schockwelle schiebt weg, Banner, Stinger). Angriffe legen Warnungen (`G.teles`: Kreis, Linie oder
  Ring mit Loch, mit Verzögerung) an; Schaden entsteht erst am Ende einer Warnung (Ausnahme: Glut-Pfütze `burn` brennt nach ihrer
  angekündigten Warnung noch 1,6 s, max. 1 Treffer/s).

## v5: Boss-Ebenen, Arena, Handlanger
- **Boss-Ebenen:** `bossKindOf(d)` → `"main"` (4/8/12/16/20) · `"mini"` (2/6/10/14/18). Tabellen in `config.js`: `BOSSES` (+ `minions`),
  `MINIS` (Mini-Bosse), `ARENA` (Größe, Säulen, Wellen-Takt/-Größe je Phase, Deckel), `MINION_CAP = 9`, `MINION` (Spawn-Kreis 0,8 s,
  erste Welle 3 s nach dem Intro, Leben ×0,75, XP ×⅓).
- **Generator (`world.js` → `buildArena`):** Arena = Raum 0 in der unteren Ecke, Karte wächst um `size − 12`. Säulen (4 bzw. 8) sind
  blockierte, aber nicht massive Kacheln + Prop `pillar` (werden durchsichtig, wenn der Kobold dahinter steht). Tore = Gang-Kacheln
  direkt vor der Arena (Prop `gate`, zu = `block`). Spawn-Punkte an Ecken/Kantenmitten (nicht an Treppe/Toren). Boden-Deko ≥ 5 =
  Arena-Mosaik (Ring, Emblem, Spawn-Rune).
- **Treppe:** hinterste Arena-Ecke. `L.stairs.sealed` (= Boss-Ebene und Ebene nicht in `G.bossDone`) → kein Auslösen, kein Tap-Einrasten,
  statt Treppe eine versiegelte Platte, kein Licht/Glow, nicht auf der Minikarte, Ebene 20 ohne Portal. Sieg → `bossDone` + Speichern,
  nach 1,3 s `unsealStairs()` (Effekt, Ton, Kamera-Schwenk). `armed`: wer gerade draufsteht, muss einmal herunter.
- **`arenaTick` (jeder Frame):** Boss wacht auf, wenn der Kobold ≥ 1,5 Kacheln in der Arena steht; Tore schließen, wenn Kobold und Boss
  drin sind und der Kobold ≥ 1,7 von jedem Tor entfernt ist (bereits besiegte Bosse: Tore bleiben offen). Wellen im Takt der Phase,
  Spawn-Kreise (`G.spawns`) werden nach 0,8 s zu Handlangern (`minion`). Heimportal ist im Bosskampf aus.
- **Sieg:** `despawnMinions()` entfernt alle Handlanger + Spawn-Kreise + feindliche Geschosse/Warnungen + alle `later(…, "boss")`-Timer;
  `A.done` verhindert neue Wellen, Tore öffnen sich.
- **Kamera:** `R.Z0` = Grund-Zoom (Art-Caches), `R.cz` = Kamera-Zoom (Bosskampf in der Arena: hoch 0,8 · quer 0,84), `R.Z = R.Z0·R.cz`.
  Blick liegt dann bis 2,8 Kacheln in Richtung Boss. `R.chunksVis` (sichtbare Boden-Chunks) bleibt < 28 (Cache-Größe).
- **Musik:** `want.boss` 1 = Boss · 2 = König · 3 = Mini-Boss (Boss-Material der Welt −8 BPM, Melodie auf dem Welt-Instrument, leichtere Besetzung).

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

### Haptik (`haptic(kind)` in `src/platform.js`, v7 „dezent")
- Tabelle `HAP_V7`: nur hurt, chest, stairs (Treppe/Portal), levelup, boss (Auftritt), bossKill, die, win (+ probe für „📳 Vibration testen").
  Alle anderen Aufrufe im Spielcode (hit, coin, pickup, dodge, slam, special, phase …) bleiben stehen, vibrieren aber nicht.
  Jeder Impuls ≥ 35 ms, Mindestabstand `HAP_GAP` = 400 ms (Wichtiges mit prio ≥ 2 wird nachgeholt statt verworfen),
  Budget ≤ 350 ms/s, Vorrang wie bisher, Versatz um die Audio-Ausgabelatenz. `?hap=alt` = alte v6-Tabelle `HAP_V6` (A/B).
- `PF.hapStats` zählt Aufrufe und Auslösungen je Art (Stub-Test V19).
- iPhone: `navigator.vibrate` fehlt. Programmatischer Switch-Tick (`iosTick`) wirkt nur bis iOS 26.4. Ab 26.5: `hapticButtons()` legt in
  ausgewählte DOM-Knöpfe (✨, 🧪, ⏸️, 🎒, `.btn`, 🎲, Einstellungs-Zeilen) einen unsichtbaren `<input type=checkbox switch>` (`.kkHapSw`),
  den die echte Berührung umschaltet → System-Tick; der Klick blubbert normal zum Knopf. Nie über dem Canvas, nicht auf ⚔️.
  Nur auf iPhone/iPad aktiv (oder `?haptouch=1` im Test); „Vibration aus" → `body.noHap` blendet die Switches aus.

## v7: Würfel-Look, Weg-Pfeil
- **Würfel:** `rollLook(r, prevKey)` in `config.js` würfelt Tierart → Fell aus `LOOK_RULES.fur[art]` → Haar (natürlich je Art oder mit 30 %
  bewusst bunt) → Frisur → Augen (dunkles Fell: nur helle Augen) → Outfit (nur Farben mit Kontrast zu Fell und Haar) → Ohren → Extra (50 %).
  `lookHarmony(L)` prüft dieselben Regeln (leere Liste = hübsch), `lookKey(L)` inkl. Outfit verhindert direkte Wiederholung.
  Zufallsquelle `UI.rnd` = `mulberry32(?seed=)` oder `Math.random`. Namen: `NAMES` (177) + `NAME_KIT` (Vorsilbe × Nachsilbe ≤ 12 Zeichen),
  `randomName(r)` 60/40. Vorschau-Animation: `previewRig(…, dice)` (Hüpfer + zwei Dreher) + Funkeln in `ui.js`.
- **Weg-Pfeil (`guide.js`):** `guideUpdate(dt)` pro Frame: Bewegung/Joystick/Halten/Pfad/Gegner-Ziel/Dash/Spezial oder jede Eingabe
  (`gesture()` → `guideInput()`) setzen den Stillstand auf 0 und blenden sofort aus. Nach `ARROW.idle` s (2,0) wird **einmal** `findPath`
  zum Ziel gerechnet; Richtung = Punkt `ARROW.ahead` (3,5) Kacheln voraus auf dem Pfad, liegt der hinter einer Ecke, rückwärts bis sichtbar.
  Einblenden 0,35 s, 2 s pulsieren, 0,45 s aus; bleibt man stehen, nach `ARROW.repeat` (6 s) erneut. Gesperrt: Einstellung aus, nicht
  `play`, Bosskampf (`bossFight()`), Tutorial-Dialog, Titelkarte (`G.cardUntil`, gesetzt von `banner`/`bossIntro`).
  Zeichnen (`render.js drawGuide`): Pfeil-Polygon in Welt-Koordinaten über `toScreen` projiziert (liegt iso-korrekt am Boden, 0,6–1,7
  Kacheln neben der Figur) — Bodenebene (dunkler Rand, helle Füllung in Weltfarbe `dust`), halbtransparent über Wänden/Laternen
  (Figur ausgespart) und additiver Schein + 3 wandernde Funkel. Stadt: Gold.

## v8: Spielgefühl — Tempo, Boss-Leben, Ebenen-Wahl, Wandfallen
- **Tempo:** `PLAYER.speed` 4,7 (vorher 3,6 = `PLAYER.speed0`). `updatePlayer` bewegt in Teilschritten ≤ 0,2 Kacheln (`moveEnt` je Achse) →
  auch bei dt 0,05 s, Ausweichsprung (14,7 Kacheln/s) und Rückstoß kein Tunneln (V22: 400 Versuche, 0 Frames in der Wand). Auf einem
  Pfad wird nur am Ziel abgebremst (vorher an jedem Wegpunkt). Schrittphase `walkPh += dt·(4 + 2,2·v)` (Schrittweite ≈ gleich),
  Staubwölkchen-Takt ∝ 1/v. Kamera: Vorlauf 0,3 s·v, Nachführ-Rate × v/3,6 (max. 1,5) → Abstand Kamera↔Kobold in Kacheln wie vorher.
- **Halten-Folgen (`input.js`):** `IN.hold` wird „live“ beim Ziehen (> 12 px) oder nach 250 ms Stillhalten (nicht, wenn der Tipp auf
  einem Gegner/Portal/Treppe eingerastet ist). `inputFrame()` (jeder Frame aus `main.js`) rechnet den Zielpunkt unter dem Finger neu
  (Kamera wandert mit) → der Kobold läuft weiter, solange der Finger liegt; Loslassen stoppt. `tapWorld` liefert `"enemy" | "snap" | "ground"`.
- **Tipp-Absicht:** Rastet ein Tipp auf der (offenen) Treppe oder dem Heim-Portal ein, sind sie sofort „scharf“ (`stairs.armed`/`homeArmed`),
  auch wenn man beim Entsiegeln schon draufstand. Versiegelte Treppen rasten weiterhin nicht ein.
- **Boss-Leben:** `BOSS_HP_MUL` (1,3) in `initBoss`/`initMini` für Haupt-, Mini-Bosse und König. `ENEMIES.boss/mini/king.hp` werden von
  `initBoss` überschrieben (wirken nicht). Phasen-Schwellen bleiben Anteile. `A.spawned` zählt Handlanger je Kampf (Bot-Protokoll);
  der Deckel `min(MINION_CAP, ARENA.cap)` gilt unverändert.
- **Stadt (`world.js buildTown`, 38×36):** Brunnen-Mitte F = (19,5 | 16,5). Je Welt w eine Karten-Richtung `TOWN_DIRS[w]`
  ((−1,1), (0,1), (1,1), (1,0), (1,−1) → am Bildschirm links, links unten, unten, rechts unten, rechts). `TOWN_GATE`: Weg ab 2,6 bis 11,3
  Kacheln (Boden-Deko 8 … 12 = Pflaster in Weltfarbe `art.ROAD_COL`, 13 … 17 = Platz-Rand), Welttor bei 9,3 (`L.gates[w]`: zwei
  Pfosten-Props `wpost`, blockieren je eine Kachel; der vordere zeichnet Girlande + Welt-Schild), vier Portale auf einem Bogen (Radius
  2,75, ±22,5°/±67,5°) um den Torplatz bei 11,3 → Abstand 2,1. Reihenfolge: liegt der Bogen am Bildschirm eher waagrecht, links → rechts,
  sonst oben → unten. Häuser, Spiegel, Oma, Strohwichtel und Eingang (16,5 | 13,5) liegen oben (Bildschirm), Bäume halten Abstand zu Wegen/Toren.
- **Stadt-Portale (`game.js`):** `po.locked = depth > G.deepest`, `po.icon` 👑/⚡/🌀/🔒, `po.label` kurz, `po.name = levelName(depth)`.
  Auslösen sofort, wenn das Portal das Tipp-Ziel ist (`p.goal`) oder der gehaltene Finger darauf liegt; sonst erst nach `PORTAL_DWELL`
  (0,45 s) Stehen innerhalb 0,6 Kacheln (Vorbeilaufen: max. 0,26 s drin, zählt halb). Gesperrt → Hinweis mit Ebenen-Namen.
  `G.runFrom = depth` (Ehrenhall), `tutFlags.portal`, Weg-Pfeil (Ziel = Portal der tiefsten Ebene) und Spielstand (kein neues Feld) wie bisher.
  Anzeige (`render.js textPass`): kurze Beschriftung über jedem Portal, Welttor-Name über der Girlande (blendet am Torplatz und über dem
  Kobold aus), Schild mit Ebene + Name des nächsten Portals an fester Bildschirmstelle (hoch unter der Anzeige, quer oben Mitte).
  Minikarte zeigt in der Stadt alle Portale.
- **Wandfallen (`world.js placeWallTraps`, `game.js updateWallTraps`):** Anzahl `DIFF.wall` (0,0,1,1,2,…,5,5,5,4; MEGASCHWER +1).
  Kandidaten = gerade Rückwand-Kachel (sichtbare Seite: schießt +y von einer Nord-, +x von einer Westwand), Bahn über Boden bis zur
  nächsten Wand (3 … 11 Kacheln), Bahn nicht im Eingangsraum, ≥ 6 Kacheln vom Eingang, nicht in/an der Arena, nicht über Treppe/Heim-Portal,
  Wand direkt davor höchstens 30 % (sonst verdeckt), zwei Bahnen ≥ 4 Kacheln auseinander (`lineDist`). Takt: Ruhe (`next`, startet versetzt,
  nur wenn der Kobold ≤ 9 Kacheln + halbe Bahn nah ist) → Vorwarnung `WALLTRAP.warn` 0,9 s (Gesicht bläht sich auf, Glühen + Licht,
  Bodenlinie in Weltfarbe mit gestricheltem Rand — der Rand auch über Wänden —, `SFX.wallWarn` räumlich) → ein Geschoss `G.shots`
  kind `"wall"` (5,2 Kacheln/s, r 0,36, Schaden = Pieks-Platten `max(1, dmg−1)`, bei 💨 kein Treffer) → Pause (Takt 4,8 ± 0,9 s).
  Zeichnen: `art.wallFaceSprite` (Steingesicht, per `transform` auf die Wandseite geschert), `art.wallShotSprite` je Welt.
  Treffer vibrieren über `playerHurt` („hurt“), der Schuss selbst nicht. `G.stats.wallHits` zählt Treffer (Bot).

## v9: Mythos-Kostüme
- **Katalog `MYTHS` (config.js):** `{ id, name, emoji, tier (selten|episch|mythisch), unlock ("start" | Boss-Ebene | "mega"), col {main, dark, light, acc, fx[]},
  head, back, body, fx, aura? }`. `mythOfBoss(d)`, `mythHint(M)`, `MYTH_START`, `MYTH_FX` (Glanz-Budget: 6/s laufend, 1,6/s stehend, × 1,7 mythisch,
  höchstens 14 gleichzeitig; Aura-Radius), `MYTH_TIERS`. Nur Optik: keine Kampfwerte.
- **Look:** `makeLook` kennt `myth` (Kostüm-ID) und `mhat` („🎩 Hut statt Kopfteil“). `L.id` (Sprite-Schlüssel von Körper/Kopf/Porträt) hängt
  `|myth(+h)` an; ohne Kostüm bleibt der Schlüssel wie bis v8. `lookSave` schreibt `myth`/`mhat` nur, wenn gesetzt → alte Spielstände bleiben
  Feld für Feld gleich. `lookKey` enthält das Kostüm (Würfel: nie zweimal derselbe). `rollLook(r, prev, myths)`: in `LOOK_RULES.mythChance` (30 %)
  der Würfe ein Kostüm aus der übergebenen Sammlung. Die Outfit-Farbe erscheint am Kostüm als Akzent (Gürtel/Herz/Edelstein), wenn sie sich um
  ≥ `LOOK_RULES.mythAccent` vom Kostüm abhebt, sonst der Kostüm-Akzent.
- **Zeichnen (`myth.js`):** Körper-Sprite: Kostüm ersetzt Rumpf + Ärmel (Muster je `body`), Tierart-Schwänze/-Flügel entfallen (Tintenfisch-Beine bleiben).
  Kopfteil = zwei gecachte Sprites (Box 150×190, Anker = Hals des Kopf-Sprites): „back“ (Kapuzen-Schale + Kragen über den Schultern, bei
  Kapuzen/Helmen) hinter dem Kopf, „front“ (Kapuzen-Stirn oberhalb einer Stirnlinie, die über den Augen flach verläuft und seitlich tief
  herunterzieht, weicher Rand, Hörner/Horn/Schnabel/Federbusch/Krone) davor. Regeln: Haare unter Kapuzen ausgeblendet; die Ohren der Tierart
  (und Drachenhörner) werden über der Kapuze erneut gezeichnet („schauen durch“, hohe Ohren mit Kapuzen-Loch); kapuzen-eigene Ohren nur bei
  Tierarten ohne hohe/runde Ohren. Extras: Brille/Sommersprossen bleiben im Gesicht, Blume/Schleife/Sternspange rücken an den Kapuzen-/Hutrand.
  Rückenteil (`drawMythBack`, Anker in Körper-Koordinaten): Flügel an den Schultern (Drehung = Flattern, schneller beim Laufen), Umhang
  (Scherung = Wehen), Schwänze (Drehung = Wedeln), Golem-Brocken (Schweben). Pro Frame nur Transform + `drawImage`, Sprites bleiben gecacht.
  Reihenfolge `drawRig`: Füße → Rückenteil → Körper → Kopf-„back“ → Kopf → Kopf-„front“ bzw. Hut. Porträt + Editor-Vorschau nutzen dieselbe
  Reihenfolge (`drawKobold`). Aussehen-Sprites (`body|head|mh|mb|mf`) liegen in einer LRU (160) → Cache wächst bei Kostümwechseln nicht unbegrenzt.
- **Glanz:** `game.js mythGlow` (Partikel je `fx`, Budget `MYTH_FX`); mythisch zusätzlich weiche Aura im Glow-Pass (unter HUD/Warnungen, klein) +
  Licht. Spezialangriff: Stil der Tierart, Farben aus `col.fx` (`specStyle`).
- **Sammlung (`save.js`):** `koboldkeller2_myths = { v: 1, have: [ids], note }` — gehört dem Gerät. `initMyths()` beim ersten Laden ohne Key:
  `have` = Start-Kostüme + `mythsEarned(Spielstand, Ehrenhall)` (bossDone → Boss-Kostüme, `won` → Phönix, `won && mega` oder 🔥-Eintrag in der
  Ehrenhall → Sternendrache + Phönix), `note` = Anzahl → einmaliger Toast „Du hast N Kostüme verdient!“ beim nächsten Spielstart. Der Spielstand
  wird dabei nicht verändert. `?kostueme=alle`: `G.myth.have` = alle (nur im Speicher), `G.myth.real` = echte Sammlung; es wird weder die
  Sammlung geschrieben noch ein nicht verdientes Kostüm im Spielstand gespeichert (`lookForSave`).
- **Freischalten (`game.js`):** `killEnt` → erster Sieg über einen Boss (Mini, Haupt, König; König auf MEGASCHWER zusätzlich Sternendrache) wirft
  ein Kostüm-Paket (Item `myth`, Stufenfarbe), das nach 0,9 s zum Kobold fliegt (kein Verpassen). Aufheben → `unlockMyth`, Jubel (Funken,
  `SFX.levelup`, Haptik „levelup“) und Hook `mythFound` → Toast oben mit Knopf „Anziehen“ (≥ 48 px, Spiel läuft weiter). `winGame` sichert
  Phönix/Sternendrache nach, falls das Paket vor dem Siegesbild nicht mehr aufgehoben wurde.
- **Editor (`ui.js`):** eigener Tab „🦄 Kostüme“ (zweiter Tab, damit man ihn sofort findet): „Ohne Kostüm“ + 14 Felder (4 je Reihe), Rahmen je
  Stufe, gesperrte als dunkle Silhouette mit 🔒 und „Besiege …“, Zähler „N / 14 gesammelt“, Schalter „🎩 Hut statt Kopfteil“. Tabs ≥ 48 px.
