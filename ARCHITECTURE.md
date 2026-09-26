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
| `src/audio.js` | WebAudio-SFX (weich), Musik (CC0-Stadtmelodie überall), Unlock, Mute |
| `src/save.js` | Save/Load, v20-Migration, Ehrenhall (`koboldkeller_hall_v1` weitergenutzt) |
| `src/platform.js` | Vollbild, Wake-Lock, Vibration, Sichtbarkeit, Kontextmenü-Sperre |
| `tools/check.mjs` | Playwright-Testlauf (Flow, Screenshots, FPS, Fehler) |
| `tools/icons.mjs` | Erzeugt `icons/icon-192/512.png` aus dem eigenen Art-Code |
| `tools/bot.mjs` | Autoplay-Bot: spielt Ebene 1→20 wie ein Kind (Tap auf Gegner/Treppe), meldet Hänger/Tode |
| `tools/smoke.mjs` | Schnelltest mit frei wählbaren Schritten (`eval=…`, `wait=…`, `shot=…`) |

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
| `KK.save()` / `KK.pause()` / `KK.resume()` | Speichern / Pause |
| `KK.speed(k)` | Zeitraffer (k Update-Schritte pro Frame, nur für Bot/Tests) |
| `KK.quality(q)` | Render-Qualitätsstufe 0–3 setzen (Scale 1 · 0.8 · 0.65 · 0.5 × DPR) |
