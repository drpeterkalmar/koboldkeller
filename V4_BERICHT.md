# Koboldkeller 2 · v4 — Spieltiefe-Runde (Bericht)

Stand: 26.09.2026 · Startmenü zeigt „v4" · Cache-Buster `?v=4`, `KK_VER = 4`

## Die 8 Wünsche — was umgesetzt wurde

**1 · Blasenwerfer braucht Munition aus Kills**
- 1 Schuss = 1 🫧, egal wie viele Blasen der Zauberstab wirft. Jeder besiegte Gegner gibt 🫧 (normal +2, Elite +4, Boss +12,
  Kellerkönig +20, Strohwichtel +1). Das Schwert bleibt unbegrenzt.
- HUD: blaue 🫧-Leiste „15 / 20" oben links + Zahl auf dem 🫧-Knopf. Leer: Knopf grau, sanftes „Plopp", Knopf wackelt,
  Hinweis-Toast höchstens alle 6 s („besiege Gegner mit ⚔️, jeder gibt dir neue!"). Voll: „VOLL", Überschuss → +1 🪙.
- Neustart mit 15 🫧; nach dem Umfallen mindestens 8. Tutorial und Oma-Tipps erklären das Prinzip.

**2 · Bosse viel stärker + mehr Effekte** (neues Modul `src/boss.js`)
- ~1,7–3× mehr Leben als v3 (Moosbart ~320 … Kellerkönig ~1950 bei Level 15), 3 Phasen: ab 66 % neue Angriffe, ab 33 %
  **Wut-Phase** (schneller, mehr Warnungen, Helfer, roter Dampf).
- Signatur-Angriffe je Welt, immer ≥ 0,8 s vorher angezeigt (rote Kreise/Streifen): Moosbart = Sporen + Ranken ·
  Glitzerzahn = Kristallregen + Prisma-Kreuz · Zuckerschnute = Bonbon-Bomben (fliegen sichtbar) + Zuckerrausch-Sturm ·
  Frostnase = Eiszapfen-Reihen + rollende Schneebälle · Kellerkönig = Feuerring + Meteore + Flammenkreuz. Dazu Rundumschlag,
  Sprung-Stampfer (in Wut doppelt), Helfer rufen. Phasenwechsel räumen alle Warnungen ab (fair).
- Spektakel: Boss-Titelkarte mit Namen + Beiname, Kamera schwenkt zum Boss, große Lebensleiste mit Phasen-Markierungen,
  weißer „Nachlauf"-Balken, Phasen-Banner mit Kamera-Kick, Hit-Stop, Schockwelle, Aura-Licht, Arena-Partikel je Welt
  (Blätter, Glitzer, Konfetti, Schnee, Glut). Sieg: Zeitlupe, 4 Konfetti-Wellen, Münzregen vom Himmel.
- Boss-Accessoires: Moosbart trägt einen Moosbart, Glitzerzahn einen Funkelzahn, Frostnase eine Eisnase usw.
- Audio: Boss-Thema je Welt (eigene Tonart, Tempo, Lead), A/B-Teil, Wut-Schicht; Phasen-Stinger.

**3 · Musik abwechslungsreicher** (`src/music.js` neu)
- Stadtmelodie bleibt Leitmotiv: Stadt spielt die Aufnahme, abwechselnd mit einem eigenen Zwischenspiel über ihr Motiv;
  abends (18–7 Uhr) eine sanftere Variante (gedämpft + Pad + Spieluhr, „Abendlied").
- Jede Welt hat eigenes Material: Moos F-Dur 84 BPM (Flöte, Celesta, Kalimba) · Kristall a-Moll 96 (Celesta, Glas) ·
  Zucker C-Dur 108 (Flöte, Spieluhr) · Frost D-Dur 76 (Glocken, Harfe) · Glut g-Moll 92 (Flöte, Marimba).
  Form je Durchgang: Intro · A · A' (Oktave/Verdopplung) · B · A'' (mit Motiv-Zitat + Harfen-Gegenstimme) · Pause;
  jeder 2. Durchgang bringt 8 Takte der Stadtmelodie im „Höhlenklang" (wechselnde Stelle). Kampf-Schichten mit eigenem
  Schlagzeug/Füll-Instrument je Welt. Alles vor-gerendert/geplant, 0 Live-Oszillatoren, tiefster Ton ≈ 117 Hz.

**4 · Jedes Level schwerer + Obergrenzen**
- Tabelle `DIFF` in `src/config.js` (dokumentiert): Gegnerzahl 7 → 18, Leben ×1,0 → ×3,1, Schaden 1 → 7, Tempo 0,94 → 1,3,
  kürzere Angriffspausen, Elite-Chance 0 → 30 % (Krone, 2,2× Leben), Pieks-Platten-Fallen ab Ebene 5, engere Räume;
  neue Muster: Schleime teilen sich (ab 6), 3er-Fächer (ab 10), Gespenster blinzeln hinter dich (ab 13), Doppel-Sturm (ab 15).
  Ebene 1–2 bleiben zahm. MEGASCHWER liegt unverändert obendrauf (2× Tempo, 10× Schaden).
- Obergrenzen: Max-❤️ 60, 🧪 5, 🫧 20 (+4 je Blasen-Talent). Anzeige „voll"; Überzähliges wird zu 🪙
  (Trank +10, Herz +2, Munition +1, Pilz +5). Neuer ❤️-Herz-Pickup (Gegner, Töpfe, Truhen).
- Alte Spielstände: siehe Migration unten — nichts geht verloren, Überschuss wird Gold + Toast „Dein Rucksack war zu voll …".

**5 · Magnetfeld vergrößert** — Münzen 3,5 Kacheln (v3: 2,0), sonstige Sachen 2,5 (v3: 1,2), weicher Zug am Rand, flott in
der Nähe, gleitet an Wänden entlang. Talent 🧲 +0,35 Kacheln pro Punkt.

**6 · Charakter-Editor + Talente + Spezialangriff**
- Editor beim Erstellen **und** am 🪞 Friseur-Spiegel in der Stadt (auch per Rucksack in der Stadt): 8 Tierarten, Fell-,
  Augen-, Outfit-, Haarfarbe, **10 Frisuren für jede Tierart** (Wuschel, Locke, Pony, Zöpfchen, Dutt, Irokese, Blatt-Schopf,
  Scheitel, Ringel, Ohne), 2 Ohrenformen je Tier (z. B. Hase „Schlapp", Drache „Kringel"), Extras (Brille, Blume, Schleife,
  Sommersprossen, Sternspange). Große Live-Vorschau (wiegt, blinzelt, dreht sich). Der Bär hat jetzt standardmäßig die
  Wuschel-Frisur statt der „Wurst"; die alte Locke ist als echte Ringellocke neu gezeichnet.
- Talente: pro Level-Aufstieg 2 Punkte (⭐-Knopf mit „+2" tippen → Rucksack). 💪 Kraft +0,5 ⚔️ · ❤️ Leben +2 · 👟 Tempo +5 % ·
  🫧 Blasen +4 Platz & +10 % · 🧲 Magnet; je max. 10, Vorschau „jetzt / nächster Punkt", in der Stadt kostenlos umverteilen.
- Spezialangriff: 🍄 Glitzerpilze füllen die Leiste (3 = voll), dann leuchtet der ✨-Knopf. Aufladen in Zeitlupe, dann
  Welle (Radius 5,5, Schaden 4·⚔️+6), löst feindliche Geschosse auf; je Tierart eigener Name/Look/Klang (Pilz-Wirbel,
  Bären-Brüller, Hoppel-Beben, Tinten-Strudel, Blätter-Sturm, Miau-Blitz, Fuchsfeuer, Drachen-Atem).
  **Pilze heilen nicht mehr** (Essen entfernt); Heilung über Tränke, Brunnen, Herzen. Oma schenkt im Tutorial 3 Pilze.

**7 · Eigene Farbnuance + mythischer Name je Ebene** — 20 Namen (z. B. „Die Flüsternden Moosgärten", „Der Mondsteinpfad",
„Der Bonbonbach", „Das Eiszapfen-Orchester", „Der Thronsaal des Kellerkönigs"), angezeigt auf der Titelkarte, unter der
Minikarte und im Pause-Menü. Boden, Wände, Nebel, Licht, Fackeln und Schwebeteilchen je Ebene eingefärbt (Welt bleibt erkennbar).

**8 · Heim-Portal 20 s unsichtbar** — nach jedem Betreten einer Ebene (auch Weiterspielen/Respawn) 20 s Spielzeit komplett weg
(kein Ring, Licht, Label, Minikarten-Punkt, nicht auslösbar, kein Tap-Einrasten); Pause/Rucksack/Editor zählen nicht.
Danach glimmt es auf (leiser Klang, „🏠 Heim-Portal") und ist nach dem bisherigen Weggeh-Prinzip benutzbar.
Konstante `HOME_PORTAL_HIDE_S = 20`.

## Spielstand-Migration
Save-Format v2 (`koboldkeller2_save`). v3-Stände (und über die bestehende Kette v20-Stände) laden ohne Verlust: Level, Gold,
Tiefe, Hüte, Waffenwerte bleiben; Pilze → Spezial-Ladung; Max-❤️ > 60 (8 🪙 je Punkt), Tränke > 5 (10 🪙), Pilze über
voller Leiste (5 🪙) → Gold + Toast; bisherige Level → Talentpunkte als Willkommensgeschenk. Beleg V9: v3-Stand mit 80 Max-❤️,
9 Tränken, 5 Pilzen, 100 Gold → 60 ❤️, 5 🧪, Spezial voll, 310 Gold, 11 Talentpunkte, Datei v2.

## Tests
| Test | Ergebnis |
|---|---|
| `node tools/check.mjs --port=8731 --throttle=4` | **57/57 PASS** (inkl. neu V1–V10, D5, A3b, A14b) |
| A3 Kampf 12 Gegner, 4× Throttle | 214 fps (p5 109) |
| A3b Boss-Kampf Kellerkönig, Wut-Phase, alle Effekte, 4× Throttle | 212 fps (p5 121) |
| A16 Vor-Rendern im Menü | 66 Sätze, 24,4 MB, längster Happen 10 ms |
| `node tools/audiotest.mjs` (ohne Autoplay-Flag) | PASS: läuft nach Tap, 0 Live-Oszillatoren, 0 Fehler |
| Leck-Test `bot.mjs … --secs=120 --audio` | PASS: 5005 Stimmen gestartet, max. 63 → 43, offen == aktiv |
| Live-URL headless nach Deploy | „v4" im Menü, Editor → Bär mit Zöpfchen, AudioContext „running", Stadt = Aufnahme, Moosbart-Boss-Thema 100 BPM, Heim-Portal versteckt, 66/66 Klang-Sätze vor-gerendert, **0 Fehler, 0 fremde Requests** |

Hinweis A15: Der FPS-A/B-Vergleich „Effekte an/aus" ist headless nicht aussagekräftig (identische Einstellungen streuen
303–433 fps). A15 prüft deshalb jetzt den stabilen Wert: Audio-Engine **1,15 % Main-Thread** bei 30 Effekt-Aufrufen/s, FPS
mit Effekten ≥ 45. Die FPS-Mediane stehen weiter als Info im Ergebnis.

## Musik-Messwerte (`node tools/audiorender.mjs`, 60 s je Zustand)
| Zustand | LUFS (I) | True-Peak | < 80 Hz |
|---|---|---|---|
| Stadt Tag / Abend | −19,1 / −20,9 | −4,6 / −6,2 dBTP | −50,5 / −46,6 dB |
| Welt Moos / Kristall / Zucker / Frost / Glut | −20,7 / −22,1 / −18,9 / −21,3 / −20,2 | −7,9 … −9,0 dBTP | −35,7 … −39,1 dB |
| Kampf je Welt 1–5 | −18,5 / −19,4 / −17,5 / −19,9 / −18,0 | −4,0 … −4,5 dBTP | −30,5 … −35,5 dB |
| Boss Welt 1–4 · Wut 1 | −17,1 / −17,4 / −17,2 / −17,3 · −16,9 | −4,0 … −4,4 dBTP | −30,5 … −37,2 dB |
| Kellerkönig / Wut | −17,2 / −17,0 | −4,0 dBTP | −31,3 / −31,1 dB |
| **Gesamtmix Kampf** (Musik + Effekte + Ambience) | **−15,7** | **−3,7 dBTP** | −30,1 dB |
Alle Ziele (≈ −16 LUFS Gesamtmix, True-Peak < −1 dBTP, < 80 Hz ≤ −30 dB) erfüllt. 91 Effekt-Varianten, höchster Peak −1 dBFS.

## Schwierigkeitskurve (Autoplay-Bot, `node tools/bot.mjs 8731 20 6 [--mega]`)
Der Bot spielt wie ein geübtes Kind: hält ⚔️, Blasen solange Munition da ist, Spezial bei Gruppen/Boss, bemerkt ~70 % der
Warnungen und springt dann raus, Trank bei < 35 % ❤️, verteilt Talentpunkte. Spielzeit = Spielsekunden.

**Normal — durchgespielt, 0 Tode** (Level 15 am Ende, 11× Spezial):
| Ebene | 1 | 2 | 3 | 4 👑 | 5 | 6 | 7 | 8 👑 | 9 | 10 | 11 | 12 👑 | 13 | 14 | 15 | 16 👑 | 17 | 18 | 19 | 20 👑 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Zeit s | 15 | 14 | 14 | 41 | 17 | 19 | 14 | 45 | 22 | 21 | 27 | 44 | 25 | 23 | 26 | 34 | 31 | 25 | 32 | 42 |
| Schaden | 0 | 0 | 0 | 4 | 0 | 6 | 3 | 15 | 4 | 9 | 5 | 12 | 0 | 7 | 19 | 10 | 14 | 37 | 34 | 34 |
| Tränke | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |

Vorher (v4-Stand ohne Kurve, gleicher Bot) wurden die Bosse in 21–31 s mit 0–6 Schaden besiegt; jetzt steigt der Schaden
über die Welten deutlich an und die Bosskämpfe dauern 34–45 s (ein Kind braucht erfahrungsgemäß ein Mehrfaches).

**MEGASCHWER — nicht durchspielbar für den Bot (gewollt „obendrauf")**: in 25 min bis Ebene 11 (Level 24), 221 Tode;
Ebene 1–5 gehen, ab 6 fallen 10×-Treffer (z. B. 30 ❤️ bei 47 Max-❤️) sehr schnell. Tabelle: `shots/neubau/bot_mega.md`.

## Visuelle Selbstprüfung (Screenshots in `shots/neubau/v4/`)
Editor mit allen Frisuren je Tierart (8 Bilder), jede der 20 Ebenen, jeder Boss in jeder Phase (15), HUD hoch + quer,
Spiegel vorher/nachher, Migration. Gefunden und behoben: zu hohes HUD (Munition + Spezial jetzt nebeneinander), Boss-Leiste
unter die Minikarte verschoben, „Fertig"/„Los geht's"-Knöpfe klebten außerhalb des Bildes (jetzt immer sichtbar),
ungleich breite Editor-Kacheln, Vorschau-Drehung wirkte „platt" (jetzt Wiegen + kurzer Dreher). Außerdem behoben:
seltener Absturz, wenn eine Blase einen Boss in die nächste Phase/zum Sieg bringt (Schleifen robust gemacht).

## Offene Punkte
- Nur per Messung/Bot geprüft, **nicht mit echten Kinderhänden/-ohren**: Balance (v. a. Bosse für 7-Jährige), Klang der neuen
  Welt-Musiken (Kristallhöhle ist ~2 dB leiser als Zucker), Lesbarkeit der Warnlinien am kleinen Handy.
- MEGASCHWER ist mit v4-Kurve extrem hart (10× Schaden); ggf. Faktor senken, falls die Kinder frustriert sind (`MEGA` in config.js).
- 🫧 (Seifenblasen-Emoji) fehlt auf sehr alten Android-Versionen (< 12) als Zeichen; Funktion bleibt.
- Headless-FPS schwanken stark; echter Beleg am Mittelklasse-Handy steht aus.

## Was die Kinder am Handy ausprobieren sollen
1. **Neues Abenteuer:** im Editor Tier wählen, Frisur (Bär: Wuschel, Zöpfchen …), Farben, Brille/Blume — Vorschau dreht sich.
2. **Tutorial:** Strohwichtel hauen → 🫧-Leiste füllt sich; 🫧 schießen; Oma schenkt Pilze → ✨ drücken (jedes Tier hat einen eigenen Spezial!).
3. **Stadt:** 🪞 Spiegel vor dem linken Haus → Aussehen ändern. ⭐ mit „+2" antippen → Talente verteilen.
4. **Keller:** Titelkarte mit dem Ebenen-Namen lesen; Munition leer schießen und über Kills nachladen; Münzen fliegen von weit her;
   das 🏠-Portal erscheint erst nach 20 s.
5. **Moosbart (Ebene 4):** Titelkarte, rote Kreise/Streifen ausweichen, bei 2/3 und 1/3 Leben Phasenwechsel, am Ende Konfetti + Münzregen.
6. **Musik:** Stadt (tagsüber / abends), dann Moosgrotte, später Zuckerkeller — klingt jede Welt anders? Kehrt die Stadtmelodie im Keller ab und zu wieder?
