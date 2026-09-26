# 🍄 Koboldkeller 2

Ein liebevolles Mobile-Action-RPG für Kinder (8–13): Chibi-Kobolde mit XXL-Glitzeraugen, Hades-Kampfgefühl
in Kawaii-Optik — warmes Licht, flackernde Fackeln, Hit-Stop, Screenshake, Partikel, „Puff + Glitzer".
20 Ebenen in 5 Welten, alle 4 Ebenen ein Boss, ganz unten der **Kellerkönig**.
100 % eigener Code (MIT), prozedurale Grafik, keine externen Requests, kein Build.

**▶ Spielen:** https://drpeterkalmar.github.io/koboldkeller/ (nach Deploy durch den Auftraggeber)

## Steuerung
| Handy | Tastatur | Aktion |
|---|---|---|
| Tipp auf den Boden | Klick | Laufen (Wegfindung um Wände) — Finger halten = folgen |
| Daumen links unten ziehen | WASD / Pfeile | Virtueller Joystick (abschaltbar) |
| Tipp auf Gegner | — | hinlaufen & angreifen |
| ⚔️ (halten = Dauerfeuer) | 1 / Leertaste / J | Rundumschlag 360°, Radius 3 Kacheln |
| 🫧 | 2 / K | Seifenblasen (zielen selbst, Flächenschaden) |
| 💨 | 3 / Shift / L | Ausweichsprung weg vom nächsten Gegner (kurz unverwundbar) |
| 🧪 | R / Q / 4 | Trank (+50 % ❤️) |
| 🎒 / ⏸️ | I / Esc | Rucksack (Hüte wählen, Pilze essen) / Pause |

## Welt
- **Koboldstadt** (Hub): Brunnen heilt & füllt Tränke auf, Oma Pilzhut erklärt alles (Tutorial, überspringbar),
  Strohwichtel zum Üben, Portalplatz mit Checkpoints Ebene 1 / 5 / 9 / 13 / 17 (öffnen sich beim Erreichen).
- **Moosgrotte (1–4) · Kristallhöhle (5–8) · Zuckerkeller (9–12) · Frostkeller (13–16) · Glutkeller (17–20)** —
  jede Welt mit eigener Palette, Deko, Licht, Ambient-Partikeln und Gegnern
  (Fledermaus, Schleim, Wichtel, Irrlicht, Kristallkäfer, Pilzling, Gespenstchen, Flämmchen).
- **Bosse** auf 4 / 8 / 12 / 16 mit Warnkreisen (Rundumschlag, Sprung-Stampfer, Helfer rufen) und Hut-Beute.
  **Ebene 20:** der riesige, knallrote Kellerkönig mit roter Krone und Flammen-Aura (+ Feuerring).
  Sieg per Boss-Kill **oder** durch das 20. Portal → Siegesbildschirm + **Ehrenhall** (Top 5 Münzen / Zeit).
- Loot mit sichtbarer Änderung: Waffenstufen (Knüppel → Holz- → Kristall- → Sternen- → Regenbogenschwert),
  Zauberstab (mehr Blasen), Glitzersteine (Blasenkraft), Boss-Hüte (+2 ❤️), Truhen, Töpfe, Glitzerpilze.
- **MEGASCHWER** (🔥): Gegner 2× schnell, 10× Schaden. Speichern pro Gerät, „💾 Weiterspielen" (Respawn am Ebenen-Eingang).
  Alte v20-Spielstände werden übernommen (Name, Look, Level, Gold, Waffen + 🎖️ Ehrenmütze), die Ehrenhall ebenso.

## Handy / PWA
Hoch- und Querformat, `100dvh` + Safe-Area, kein Doppeltipp-Zoom, kein Long-Press-Menü, Vibration (abschaltbar),
Wake-Lock beim Spielen, Pause + Stummschalten beim App-Wechsel, Vollbild-Knopf, Manifest + Icons
(„Zum Startbildschirm hinzufügen"). Canvas-Backbuffer max. DPR 2, adaptive Render-Auflösung.

## Technik
Vanilla-JS-ES-Module + Canvas 2D (Begründung: [ARCHITECTURE.md](ARCHITECTURE.md)). Alles Vektorielle wird einmal
in Offscreen-Caches gezeichnet; Boden in 8×8-Chunks; Licht über eine ¼-Auflösungs-Lightmap (multiply) plus
additive Glows. Akzeptanzkriterien: [CHECKS.md](CHECKS.md).

| Datei | Inhalt |
|---|---|
| `src/art.js` | prozedurale Chibi-Grafik (Figuren, Gegner, Bosse, Items, Kacheln, Props) |
| `src/render.js` | Iso-Renderer, Kamera, Chunk-Cache, Tiefensortierung, Licht, Glow, Minikarte |
| `src/game.js` | Spiellogik, Kampf, KI, Bosse, Loot, Ebenen, Sieg |
| `src/world.js` | Stadt-/Dungeon-Generator, Kollision, BFS-Wegfindung |
| `src/ui.js` · `src/input.js` | Menüs/HUD · Touch/Joystick/Tastatur |
| `src/audio.js` · `src/music.js` · `src/sfxlib.js` | Audio-Engine (vor-gerenderte Effekte, Busse, Hall, Limiter) · adaptive Musik · Klang-Rezepte |
| `src/fx.js` | Partikel, Shake, Hit-Stop |
| `src/save.js` · `src/platform.js` | Speichern/Migration/Ehrenhall · Vollbild, Wake-Lock, Vibration |

**Version erhöhen:** in `index.html` alle `?v=N` (Import-Map, CSS, Manifest) und `window.KK_VER` anpassen.
Das Startmenü zeigt „🍄 Koboldkeller 2 · vN".

### Debug-API (`window.KK`, für Tests)
`KK.state()`, `KK.start({name,species,mega})`, `KK.goto(d)`, `KK.descend()`, `KK.teleport(x,y | 'stairs'|'boss'|'fountain'|'portal')`,
`KK.kill('all'|'boss'|'near')`, `KK.win('boss'|'portal')`, `KK.god(on)`, `KK.heal()`, `KK.give(kind,n)`,
`KK.attack()/bubbles()/dodge()/potion()`, `KK.spawn(type,dx,dy)`, `KK.perf(reset)`, `KK.quality(q)`, `KK.save()`, `KK.pause()/resume()`.

### Testen
```bash
python3 -m http.server 8731          # freien Port wählen
node tools/check.mjs --port=8731 --throttle=4   # Flow hoch+quer, FPS, Saves → shots/neubau/
node tools/icons.mjs 8731            # PWA-Icons aus eigenem Art-Code neu erzeugen
node tools/audiotest.mjs http://localhost:8731/   # Handy-Regeln (ohne Autoplay-Flag): Tap → Audio läuft
node tools/audiorender.mjs --port=8731            # Effekte + Musikzustände → shots/audio/*.wav + Messtabelle
node tools/bot.mjs 8731 20 4 --secs=120 --audio   # 2 min Kampf-Bot + Knoten-Leck-Test
```
`check.mjs` misst im Profil „gpu" (Chromium new-headless mit GPU-Raster, ungedrosselter Frame-Takt) und
zusätzlich im reinen Software-Raster (Worst Case). Playwright wird global gesucht (`npm root -g`, nvm).

## Credits
- Musik: „Town Theme 1" (Geomancer) — CC0 / Public Domain via OpenGameArt.org. Läuft in Stadt **und** Keller als Leitmotiv
  (Kinderwunsch: dieselbe entspannte Melodie). Darüber adaptive, selbst synthetisierte Schichten je Welt, Kampf-Schicht,
  eigenes Boss-Thema (zitiert das Motiv) und Stinger — alles eigener Code. `audio/dungeon.*` ist ebenfalls CC0 (ungenutzt).
- Alle Effekte, Instrumente, Ambience und die Hall-Impulsantworten werden im Browser aus eigenem Code erzeugt (keine Samples).
- Alles andere: eigener Code, MIT.
