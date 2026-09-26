# 🍄 Koboldkeller 2

Ein liebevolles Mobile-Action-RPG für Kinder (7–11): Chibi-Kobolde mit XXL-Glitzeraugen, Hades-Kampfgefühl
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
| 🫧 | 2 / K | Seifenblasen (zielen selbst, Flächenschaden) — **1 Schuss = 1 Munition**, jeder besiegte Gegner gibt neue |
| ✨ | 5 / E | Spezialangriff (leuchtet, wenn 3 🍄 Glitzerpilze die Spezial-Leiste gefüllt haben) — je Tierart eigener Look |
| 💨 | 3 / Shift / L | Ausweichsprung weg vom nächsten Gegner (kurz unverwundbar) |
| 🧪 | R / Q / 4 | Trank (+50 % ❤️) |
| ⭐ / 🎒 / ⏸️ | I / Esc | Talente verteilen (⭐ tippen) · Rucksack (Talente, Hüte, 🪞 Aussehen in der Stadt) · Pause |

## Welt
- **Koboldstadt** (Hub): Brunnen heilt & füllt Tränke auf, Oma Pilzhut erklärt alles (Tutorial, überspringbar),
  Strohwichtel zum Üben, **🪞 Friseur-Spiegel** (Charakter-Editor), Portalplatz mit Checkpoints Ebene 1 / 5 / 9 / 13 / 17.
- **Jede Ebene** hat einen eigenen Namen (z. B. „Die Flüsternden Moosgärten", „Der Bonbonbach") und eine eigene Farbnuance.
  Das 🏠-Heim-Portal neben dem Eingang taucht erst nach 20 s Spielzeit auf (kein versehentliches Zurücklaufen).
- **Moosgrotte (1–4) · Kristallhöhle (5–8) · Zuckerkeller (9–12) · Frostkeller (13–16) · Glutkeller (17–20)** —
  jede Welt mit eigener Palette, Deko, Licht, Ambient-Partikeln und Gegnern
  (Fledermaus, Schleim, Wichtel, Irrlicht, Kristallkäfer, Pilzling, Gespenstchen, Flämmchen).
- **Bosse** auf 4 / 8 / 12 / 16 (Moosbart, Glitzerzahn, Zuckerschnute, Frostnase): Intro-Titelkarte, große Lebensleiste,
  **3 Phasen** (ab 66 % neue Angriffe, ab 33 % Wut-Phase), je Welt eigene Signatur-Angriffe mit Warnkreisen/-linien
  (Sporen, Ranken, Kristallregen, Prisma-Strahlen, Bonbon-Bomben, Zuckerrausch, Eiszapfen, Schneebälle, Meteore, Flammenkreuz),
  Sieg mit Zeitlupe, Konfetti und Münzregen, Hut-Beute.
  **Ebene 20:** der riesige, knallrote Kellerkönig mit roter Krone und Flammen-Aura (+ Feuerring).
  Sieg per Boss-Kill **oder** durch das 20. Portal → Siegesbildschirm + **Ehrenhall** (Top 5 Münzen / Zeit).
- Loot mit sichtbarer Änderung: Waffenstufen (Knüppel → Holz- → Kristall- → Sternen- → Regenbogenschwert),
  Zauberstab (mehr Blasen), Glitzersteine (Blasenkraft), Boss-Hüte (+2 ❤️), ❤️-Herzen, Truhen, Töpfe, Glitzerpilze (laden ✨).
- **Obergrenzen:** Max-❤️ 60, 🧪 5 Tränke, 🫧 20 Munition (+4 je Blasen-Talent). Überzähliges wird zu 🪙 (Anzeige „voll").
- **Talente:** pro Level-Aufstieg 2 Punkte für 💪 Kraft, ❤️ Leben, 👟 Tempo, 🫧 Blasen, 🧲 Magnet (je max. 10), kostenlos
  neu verteilen in der Stadt. **Magnet:** Münzen 3,5 / Sachen 2,5 Kacheln (+ 🧲).
- **Charakter-Editor** (beim Erstellen und am Spiegel): 8 Tierarten, Fell-, Augen-, Outfit-, Haarfarbe, 10 Frisuren, 2 Ohrenformen,
  Extras (Brille, Blume, Schleife, Sommersprossen, Sternspange), große Live-Vorschau.
- **Schwierigkeitskurve:** Tabelle `DIFF` in `src/config.js` — mehr/zähere/schnellere Gegner je Ebene, Elite-Gegner mit Krone,
  Pieks-Platten-Fallen, engere Räume, neue Muster (Schleime teilen sich, 3er-Fächer, blinzelnde Gespenster, Doppel-Sturm).
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
`KK.state()` (inkl. Munition, Spezial, Talente, Aussehen, Heim-Portal, Ebenen-Name, Boss-Phase), `KK.start({name,species,mega})`, `KK.goto(d)`, `KK.descend()`, `KK.teleport(x,y | 'stairs'|'boss'|'fountain'|'portal')`,
`KK.kill('all'|'boss'|'near')`, `KK.win('boss'|'portal')`, `KK.god(on)`, `KK.heal()`, `KK.give(kind,n)`,
`KK.attack()/bubbles()/dodge()/potion()/special()`, `KK.skill(id)/respec()/look(o)/magnet(kind)/item(kind,dx,dy)`,
`KK.bossAtk(name)/bossHit()`, `KK.spawn(type,dx,dy,elite)`, `KK.perf(reset)`, `KK.quality(q)`, `KK.save()`, `KK.pause()/resume()`.

### Testen
```bash
python3 -m http.server 8731          # freien Port wählen
node tools/check.mjs --port=8731 --throttle=4   # Flow hoch+quer, FPS, Saves → shots/neubau/
node tools/icons.mjs 8731            # PWA-Icons aus eigenem Art-Code neu erzeugen
node tools/audiotest.mjs http://localhost:8731/   # Handy-Regeln (ohne Autoplay-Flag): Tap → Audio läuft
node tools/audiorender.mjs --port=8731            # Effekte + Musikzustände → shots/audio/*.wav + Messtabelle
node tools/bot.mjs 8731 20 6 [--mega]             # Autoplay 1→20, Schwierigkeitskurve → shots/neubau/bot_normal|mega.md
node tools/bot.mjs 8731 20 4 --secs=120 --audio   # 2 min Kampf-Bot + Knoten-Leck-Test
```
`check.mjs` misst im Profil „gpu" (Chromium new-headless mit GPU-Raster, ungedrosselter Frame-Takt) und
zusätzlich im reinen Software-Raster (Worst Case). Playwright wird global gesucht (`npm root -g`, nvm).

## Credits
- Musik: „Town Theme 1" (Geomancer) — CC0 / Public Domain via OpenGameArt.org, bleibt das **Leitmotiv** (Stadt, und alle zwei
  Durchgänge als Zwischenspiel im Keller). Jede Welt hat eigene, selbst komponierte und synthetisierte Musik (Tonart, Tempo,
  Akkorde, Melodien A/B, Instrumente), dazu Stadt-Abendvariante, Kampf-Schichten, Boss-Themen je Welt und Stinger — alles
  eigener Code. `audio/dungeon.*` ist ebenfalls CC0 (ungenutzt).
- Alle Effekte, Instrumente, Ambience und die Hall-Impulsantworten werden im Browser aus eigenem Code erzeugt (keine Samples).
- Alles andere: eigener Code, MIT.
