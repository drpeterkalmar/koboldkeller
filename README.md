# 🍄 Koboldkeller 2

Ein liebevolles Mobile-Action-RPG für Kinder (7–11): Chibi-Kobolde mit XXL-Glitzeraugen, Hades-Kampfgefühl
in Kawaii-Optik — warmes Licht, flackernde Fackeln, Hit-Stop, Screenshake, Partikel, „Puff + Glitzer".
20 Ebenen in 5 Welten, **jede 2. Ebene ein Boss** (Mini-Bosse auf 2/6/10/14/18, Hauptbosse auf 4/8/12/16), ganz unten der **Kellerkönig**.
100 % eigener Code (MIT), prozedurale Grafik, keine externen Requests, kein Build.

**▶ Spielen:** https://drpeterkalmar.github.io/koboldkeller/ (nach Deploy durch den Auftraggeber)

## Steuerung
| Handy | Tastatur | Aktion |
|---|---|---|
| Tipp auf den Boden | Klick | Laufen (Wegfindung um Wände, auch weit bis an den Bildschirmrand) — Finger halten = weiterlaufen, solange er liegt (v8) |
| Daumen links unten ziehen | WASD / Pfeile | Virtueller Joystick (abschaltbar) |
| Tipp auf Gegner | — | hinlaufen & angreifen |
| ⚔️ (halten = Dauerfeuer) | 1 / Leertaste / J | Rundumschlag 360°, Radius 3 Kacheln |
| 🫧 | 2 / K | Seifenblasen (zielen selbst, Flächenschaden) — **1 Schuss = 1 Munition**, jeder besiegte Gegner gibt neue |
| ✨ | 5 / E | Spezialangriff (leuchtet, wenn 3 🍄 Glitzerpilze die Spezial-Leiste gefüllt haben) — je Tierart eigener Look |
| 💨 | 3 / Shift / L | Ausweichsprung weg vom nächsten Gegner (kurz unverwundbar) |
| 🧪 | R / Q / 4 | Trank (+50 % ❤️) |
| ⭐ / 🎒 / ⏸️ | I / Esc | Talente verteilen (⭐ tippen) · Rucksack (Talente, Hüte, 🪞 Aussehen in der Stadt) · Pause |

**🧭 Weg-Pfeil (v7):** Bleibt der Kobold 2 s stehen (keine Bewegung, keine Eingabe), leuchtet kurz ein kleiner Funkel-Pfeil in
Weltfarbe neben ihm am Boden auf — entlang des Weges (Wegfindung, nicht durch Wände) zur Treppe bzw. zum 20. Portal, bei
versiegelter Treppe zum Boss, in der Stadt zum Portal der tiefsten freigeschalteten Ebene. Nicht im Bosskampf, im Oma-Dialog oder
während einer Titelkarte. Abschaltbar in ⏸️ „🧭 Weg-Pfeil“. Zeiten per URL, z. B. `?arrowIdle=1&arrowShow=3`.

**⚡ Tempo (v8, [V8_BERICHT.md](V8_BERICHT.md)):** Der Kobold läuft 4,7 statt 3,6 Kacheln/s (+31 %); Schritte und Kamera laufen mit.

## Welt
- **Koboldstadt** (Hub): Brunnen heilt & füllt Tränke auf, Oma Pilzhut erklärt alles (Tutorial, überspringbar),
  Strohwichtel zum Üben, **🪞 Friseur-Spiegel** (Charakter-Editor).
  **v8: Vom Brunnen führt je Welt ein eigener bunter Weg** (🌿 Moos links → 💎 Kristall → 🍭 Zucker unten → ❄️ Frost → 🔥 Glut rechts)
  zu einem **Welttor** (zwei Pfosten, Wimpel-Girlande, Welt-Schild) mit **einem Portal je Ebene** (1–4, 5–8, …). Jede Ebene bis zur
  tiefsten erreichten ist wählbar; Boss-Ebenen tragen 👑, Mini-Boss-Ebenen ⚡, noch nicht erreichte 🔒 (mit Hinweis). Steht man am Tor,
  zeigt ein Schild Ebene + Namen des nächsten Portals. Brunnen → jedes Portal ≤ 2,5 s. Ein Portal startet sofort, wenn man es antippt;
  wer nur darüberläuft, löst nichts aus (erst nach kurzem Stehenbleiben).
- **Jede Ebene** hat einen eigenen Namen (z. B. „Die Flüsternden Moosgärten", „Der Bonbonbach") und eine eigene Farbnuance.
  Das 🏠-Heim-Portal neben dem Eingang taucht erst nach 20 s Spielzeit auf (kein versehentliches Zurücklaufen).
- **Moosgrotte (1–4) · Kristallhöhle (5–8) · Zuckerkeller (9–12) · Frostkeller (13–16) · Glutkeller (17–20)** —
  jede Welt mit eigener Palette, Deko, Licht, Ambient-Partikeln und Gegnern
  (Fledermaus, Schleim, Wichtel, Irrlicht, Kristallkäfer, Pilzling, Gespenstchen, Flämmchen).
- **Mini-Bosse** (v5) auf 2 / 6 / 10 / 14 / 18 — jeder ein eigenes Wesen mit zwei eigenen, angekündigten Angriffen und 2 Phasen:
  Schlabbo (Riesen-Moosschleim: Glibber-Spucke, Bauchplatscher) · Funkelflatter (Kristall-Fledermaus: Kristall-Echo, Schallring) ·
  Lolli-Lutz (Zuckerpilz-Riese: Streusel-Hüpfkästchen, Brause-Puff) · Bibber (Schneegespenst: Frost-Atem, Buh-Blinzeln) ·
  Glutpanzer Gustav (Lava-Käfer: Lava-Kleckse mit Glut-Pfützen, Hornstoß). Kleinere Titelkarte/Leiste, eigene Musikvariante.
- **Boss-Arenen** (v5): jede Boss-Ebene hat eine große Arena (14 → 24 Kacheln, mit der Tiefe wachsend) mit Säulen als Deckung,
  Boden-Mosaik und Welt-Licht. Sobald man drin ist, schließen sich die Tore (Ranken, Kristall-Gitter,
  Zuckerstangen, Eiszapfen, Lava-Steine); **Handlanger** erscheinen laufend in Wellen am Rand (0,8 s vorher ein Spawn-Kreis),
  Anzahl/Takt steigen mit Tiefe und Phase (höchstens 3–9 gleichzeitig). Beim Sieg verschwinden **alle** Handlanger mit Glitzer.
- **Boss-Auftritt (v11, [V11_BERICHT.md](V11_BERICHT.md)):** Vor dem Kampf ist der Boss **gar nicht da** (nicht sichtbar, nicht
  treffbar, nicht mit Seifenblasen von außen anlockbar). Erst wenn der Kobold ganz in der Arena steht (≥ 1,5 Kacheln hinter der
  Torlinie, nicht im Torbogen), schlagen die Tore zu und der Boss **wächst aus dem Boden**: Beben mit sternförmig leuchtenden Rissen →
  Boden bricht auf (Blitz, Brocken-Fontäne, Lichtstrahl) → der Boss steigt aus dem Loch, Welt-Material rieselt ab (Moos, Kristall,
  Streusel, Eis, Glut) → Landung mit Schockwelle, kurzer Zeitlupe und Titelkarte. Flug-Minis schießen aus dem Loch und schweben ein.
  Dauer ≈ 2,3–2,7 s (Kellerkönig 3,5 s), der Kobold ist währenddessen unverwundbar. Der Krater bleibt liegen.
- **Treppe auf Boss-Ebenen versiegelt** (v5-Bugfix): solange der Boss lebt, ist die Treppe (Ebene 20: das 20. Portal) eine
  versiegelte Platte — nicht betretbar, kein Licht, nicht auf der Minikarte. Nach dem Sieg zerbricht das Siegel sichtbar.
  Besiegte Bosse werden gespeichert: dort bleibt die Treppe offen und der Kampf ist freiwillig.
- **Bosse** auf 4 / 8 / 12 / 16 (Moosbart, Glitzerzahn, Zuckerschnute, Frostnase): Intro-Titelkarte, große Lebensleiste,
  **3 Phasen** (ab 66 % neue Angriffe, ab 33 % Wut-Phase), je Welt eigene Signatur-Angriffe mit Warnkreisen/-linien
  (Sporen, Ranken, Kristallregen, Prisma-Strahlen, Bonbon-Bomben, Zuckerrausch, Eiszapfen, Schneebälle, Meteore, Flammenkreuz),
  Sieg mit Zeitlupe, Konfetti und Münzregen, Hut-Beute.
  **Ebene 20:** der riesige, knallrote Kellerkönig mit roter Krone und Flammen-Aura (+ Feuerring).
  Sieg per Boss-Kill → Siegesbildschirm + **Ehrenhall** (Top 5 Münzen / Zeit). Das 20. Portal öffnet sich erst, wenn der
  Kellerkönig einmal besiegt ist (danach auch als zweiter Siegesweg bei weiteren Durchläufen).
- Loot mit sichtbarer Änderung: Waffenstufen (Knüppel → Holz- → Kristall- → Sternen- → Regenbogenschwert),
  Zauberstab (mehr Blasen), Glitzersteine (Blasenkraft), Boss-Hüte (+2 ❤️), ❤️-Herzen, Truhen, Töpfe, Glitzerpilze (laden ✨).
- **Obergrenzen:** Max-❤️ 60, 🧪 5 Tränke, 🫧 20 Munition (+4 je Blasen-Talent). Überzähliges wird zu 🪙 (Anzeige „voll").
- **Talente:** pro Level-Aufstieg 2 Punkte für 💪 Kraft, ❤️ Leben, 👟 Tempo, 🫧 Blasen, 🧲 Magnet (je max. 10), kostenlos
  neu verteilen in der Stadt. **Magnet:** Münzen 3,5 / Sachen 2,5 Kacheln (+ 🧲).
- **Charakter-Editor** (beim Erstellen und am Spiegel): 8 Tierarten, Fell-, Augen-, Outfit-, Haarfarbe, 10 Frisuren, 2 Ohrenformen,
  Extras (Brille, Blume, Schleife, Sommersprossen, Sternspange), große Live-Vorschau.
  **🎲 Würfel (v7):** würfelt Name **und** kompletten Look (Hüpfer + Doppeldreher + Funkeln in der Vorschau). Nur hübsche
  Kombinationen über die Harmonie-Tabelle `LOOK_RULES` in `src/config.js` (Fell passend zur Tierart, Kontrast Fell↔Outfit,
  Haar passend oder bewusst bunt, keine dunklen Augen auf dunklem Fell, Extra in ≈ 50 %), nie zweimal direkt derselbe Look.
  Am Spiegel zusätzlich „🎲 Zufallslook“ (nur Aussehen). 177 Namen + Baukasten (z. B. „Knuddel“ + „keks“) = 536 Namen, alle ≤ 12 Zeichen.
  `?seed=N` macht die Würfe reproduzierbar (Tests).
- **🦄 Mythos-Kostüme (v9, [V9_BERICHT.md](V9_BERICHT.md)):** 14 Kostüme nach Sagenwesen, die den ganzen Kobold verwandeln (Kapuze/Helm oder
  Hut, Körper-Überzug, bewegtes Rückenteil: Flügel flattern, Umhänge wehen, Schwänze wedeln) — für alle 8 Tierarten, Gesicht bleibt frei.
  Stufen: **selten** (Drachenkind, Einhorn, Sternenzauberer — von Anfang an), **episch** (je Mini-/Hauptboss beim ersten Sieg ein Kostüm-Paket:
  Waldfee, Waldhüter, Greif, Kristallritter, Kitsune, Bonbon-Nixe, Yeti, Frostwolf, Vulkan-Golem), **mythisch** (Phönix = Kellerkönig,
  Sternendrache = Sieg auf 🔥 MEGASCHWER; mit Aura). Nur Optik, keine Kampfwerte. Jedes Kostüm hat eine Glanz-Spur (Funken, Regenbogen,
  Schneeflocken, Bläschen …), der Spezialangriff nimmt die Kostümfarbe an. Die Sammlung gehört dem Gerät (Key `koboldkeller2_myths`) —
  ein neues Spiel behält sie; schon verdiente Kostüme schalten sich beim ersten Laden von selbst frei. Anziehen: im Fund-Toast
  („Anziehen“) oder am 🪞 Spiegel, Tab „🦄 Kostüme“ (gesperrte als Silhouette mit Hinweis, Zähler, Schalter „🎩 Hut statt Kopfteil“).
  🎲 Würfel bringt in ≈ 30 % ein freigeschaltetes Kostüm. **Nur anschauen:** `?kostueme=alle` (alles frei, nichts wird gespeichert).
- **Schwierigkeitskurve:** Tabelle `DIFF` in `src/config.js` — mehr/zähere/schnellere Gegner je Ebene, Elite-Gegner mit Krone,
  Pieks-Platten-Fallen, engere Räume, neue Muster (Schleime teilen sich, 3er-Fächer, blinzelnde Gespenster, Doppel-Sturm).
- **Wandfallen (v8):** Ab Ebene 3 sitzen wenige freundliche Steingesichter in den Wänden (1 → 5 je Ebene, MEGASCHWER +1). Ab und zu
  blähen sie sich 0,9 s auf (Glühen, Ton, gestrichelte Bodenlinie) und pusten dann etwas quer durch den Gang bis zur nächsten Wand:
  Moos-Sporen, Kristallsplitter, Bonbonkugeln, Schneebälle, Glutkugeln. Schaden wie die Pieks-Platten, 💨 macht unverwundbar.
  Nie im Eingangsraum, nie in Boss-Arenen, nie zwei auf demselben Gang.
- **Bosse (v8):** alle Haupt-, Mini-Bosse und der Kellerkönig haben 30 % mehr Leben (`BOSS_HP_MUL` in `src/config.js`).
- **MEGASCHWER** (🔥): Gegner 2× schnell, 10× Schaden. Speichern pro Gerät, „💾 Weiterspielen" (Respawn am Ebenen-Eingang).
  Alte v20-Spielstände werden übernommen (Name, Look, Level, Gold, Waffen + 🎖️ Ehrenmütze), die Ehrenhall ebenso.

## Handy / PWA
Hoch- und Querformat, `100dvh` + Safe-Area, kein Doppeltipp-Zoom, kein Long-Press-Menü, Vibration (dezent, abschaltbar, v7 siehe unten),
Wake-Lock beim Spielen, Pause + Stummschalten beim App-Wechsel, Vollbild-Knopf, Manifest + Icons
(„Zum Startbildschirm hinzufügen"). Canvas-Backbuffer max. DPR 2, adaptive Render-Auflösung.

**Vibration (v7, [V7_BERICHT.md](V7_BERICHT.md)):** nur noch bei großen Ereignissen (Level-Up, Truhe, Treppe/Portal, eigener Treffer,
Boss-Auftritt/-Sieg, Tod, Sieg), jeder Impuls ≥ 35 ms, ≥ 400 ms Abstand. **Android:** braucht eingeschaltete Vibration/
Berührungsfeedback (bzw. Medien-Vibration), kein Lautlos- und kein Energiesparmodus. **iPhone:** Safari kann Webseiten seit iOS 26.5
nicht mehr per Programm vibrieren lassen — es gibt nur noch einen kleinen Tick beim direkten Antippen von Knöpfen (✨, 🧪, ⏸️, 🎒, Menü).
In ⏸️: „📳 Vibration testen“ mit Hinweis, falls nichts zu spüren ist. A/B-Vergleich mit der alten Tabelle: `?hap=alt`.

## Technik
Vanilla-JS-ES-Module + Canvas 2D (Begründung: [ARCHITECTURE.md](ARCHITECTURE.md)). Alles Vektorielle wird einmal
in Offscreen-Caches gezeichnet; Boden in 8×8-Chunks; Licht über eine ¼-Auflösungs-Lightmap (multiply) plus
additive Glows. Akzeptanzkriterien: [CHECKS.md](CHECKS.md).

| Datei | Inhalt |
|---|---|
| `src/art.js` | prozedurale Chibi-Grafik (Figuren, Gegner, Bosse, Items, Kacheln, Props) |
| `src/myth.js` | v9: Mythos-Kostüme (Körper-Überzug, Kopfteil in zwei Lagen, animiertes Rückenteil) |
| `src/render.js` | Iso-Renderer, Kamera, Chunk-Cache, Tiefensortierung, Licht, Glow, Minikarte |
| `src/game.js` | Spiellogik, Kampf, KI, Loot, Ebenen, Treppen-Siegel, Sieg |
| `src/guide.js` | v7: Weg-Pfeil (Ziel-Regel, Stillstand-Timer, Richtung entlang `findPath`) |
| `src/boss.js` | Haupt- und Mini-Bosse, Arena (Tore, Handlanger-Wellen), Sieg/Entsiegeln |
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
`KK.bossAtk(name)/bossHit()`, `KK.spawn(type,dx,dy,elite)`, `KK.perf(reset)`, `KK.quality(q)`, `KK.save()`, `KK.pause()/resume()`,
`KK.arena()` (Größe, Tore, Handlanger, Deckel, Treppen-Siegel), `KK.wave(n)` (Handlanger-Welle erzwingen),
v7: `KK.guide()` (Weg-Pfeil: Deckkraft, Stillstand, Richtung, Wegpunkt, Ziel), `KK.guideAim()`, `KK.path(x,y)`, `KK.hap()` (Haptik-Zähler je Ereignis-Art),
`KK.editor()` (Editor-Look, Name, Würfe). v11: `KK.rise()` (Boss-Auftritt: Abschnitt, Fortschritt), `KK.freeze(on)` (Spielzeit anhalten für Fotos). v9: `KK.myths()` (Sammlung, getragen, Sprite-Zahl), `KK.unlock(id|'all')`, `KK.wear(id)`. v8: `KK.G.L.portals` / `KK.G.L.gates` (Stadt), `KK.G.L.wallTraps` (Wand-Schützen: Linie, Takt, Zustand).

### Testen
```bash
python3 tools/serve.py 8731          # Testserver (wie http.server, aber großer Backlog — sonst hängen Modul-Anfragen)
node tools/check.mjs --port=8731 --throttle=4   # Flow hoch+quer, FPS, Saves, v7 → shots/neubau/ (~14 min)
node tools/check.mjs --port=8731 --throttle=4 --v7=skip   # Teil 1 (~9 min) …
node tools/check.mjs --port=8731 --throttle=4 --v7=only   # … Teil 2: V18–V31 (~18 min), einzeln: node tools/checks_v7.mjs --only=V20
node tools/checks_v8.mjs --port=8731 --ref=8732          # v8-Checks V22–V25 einzeln; --ref = Server mit altem Stand (Vorher/Nachher)
node tools/checks_v9.mjs --port=8731 --only=V26          # v9-Kostüm-Checks V26–V31 einzeln
node tools/checks_v11.mjs --port=8731 --throttle=4     # v11: Boss-Auftritt (V33), Bildfolgen → shots/neubau/v11/
node tools/mythsheet.mjs 8731 130 out.png                # Kontaktbogen aller Kostüme × 8 Tierarten
node tools/bot.mjs 8731 20 6 --out=v9 --myth=phoenix     # Bot mit angezogenem Kostüm
node tools/icons.mjs 8731            # PWA-Icons aus eigenem Art-Code neu erzeugen
node tools/audiotest.mjs http://localhost:8731/   # Handy-Regeln (ohne Autoplay-Flag): Tap → Audio läuft
node tools/audiorender.mjs --port=8731            # Effekte + Musikzustände → shots/audio/*.wav + Messtabelle
node tools/bot.mjs 8731 20 6 [--mega] [--out=v8]  # Autoplay 1→20 (Tipps nur auf Sichtbares, Stadt zu Fuß) → shots/neubau/bot_<name>.md
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
