# Koboldkeller 2 · v3 — Klang & Haptik (Bericht)

Stand: 26.09.2026 · Live: https://drpeterkalmar.github.io/koboldkeller/ (Startmenü zeigt „v3")

## Was ist neu
**Musik (adaptiv, Leitmotiv bleibt)**
- Die Stadtmelodie (CC0-Glockenspiel) wurde vermessen: **Es-Dur, 90 BPM, 4/4, exakt 28 Takte**. Sie läuft jetzt
  sample-genau an einer Musik-Uhr (`AudioContext.currentTime`, Look-ahead-Scheduler) — in der Stadt pur wie bisher.
- **Keller:** dieselbe Melodie leiser und „höhlig" gefiltert, darüber eine eigene Schicht je Welt, die nur Töne spielt,
  die in diesem Halbtakt auch in der Aufnahme klingen (Akkordkarte per Frequenzanalyse):
  Moosgrotte Kalimba · Kristallhöhle Glas-Arpeggien · Zuckerkeller Spieluhr · Frostkeller Glocken · Glutkeller Marimba.
- **Kampf:** sind Gegner nahe, blendet taktgenau eine rhythmische Schicht ein (Stufe 1 Pizzicato-Bass + Shaker,
  Stufe 2 + Trommeln/Harfen-Läufe), langsam wieder aus, wenn es ruhig wird.
- **Boss:** eigenes Thema in c-Moll (Paralleltonart) mit Pauke, Blech-Stößen und einer Melodie, die das Stadt-Motiv
  „C-Es-C-D-G" zitiert; Einsatz auf der Takt-Eins mit Becken. Kellerkönig: zusätzlich Tamburin + Glocken.
- **Stinger** in der Tonart der laufenden Musik, auf das nächste 16tel quantisiert: Level-Up (Stadt-Motiv als Harfe +
  Glocken), Treppe (Harfe abwärts), Portal (aufwärts + Glockenakkord), Boss besiegt, Sieg-Fanfare, Umfallen (sanft).
- Musik duckt kurz bei Level-Up, Boss, Sieg; beim Umfallen blendet sie aus; im Pause-Menü klingt sie gedämpft.
- Kein Dröhn-Bass: Hochpass 4. Ordnung bei 85 Hz im Master, tiefster Musikton ≈ 117 Hz.

**Effekte (alle 23 Aufrufe neu + 2 neue: „Ankommen", „Boss besiegt")**
- Geschichtet (Klick/Transient + Körper + Nachklang/Glitzer), 1–5 Varianten je Effekt, nie zweimal dieselbe,
  leichte Tonhöhen-/Pegel-Streuung. Treffer abgestuft: leicht (Blasen), normal, schwer (starke Waffe), **Kritisch**
  mit hellem „Pling" obendrauf. Mehrfachtreffer eines Rundumschlags klingen wie eine kleine Salve.
- Gegner-„Puff" mit Glitzer-Tönen, Münz-Serien steigen die Es-Pentatonik hinauf (G5 … Es7), Boss-Puff als Kaskade.
- **Räumlich:** Panorama nach Bildschirmposition, leise Dämpfung mit Abstand (Treffer, Puff, Töpfe, Boss, Geschosse …).
- **Hall:** selbst erzeugte Impulsantworten — Stadt kurz/trocken (0,8 s), Keller 1,5–2,6 s je Welt.
- **Ambience** (sehr leise, am „🔔 Töne"-Schalter): Stadt Treiben + Vögel + Brunnen (räumlich); Keller Wind +
  Tropfen / Kristallklingen / Sprudeln / Eisknistern / Lava-Blubbern, Fackel-Knistern in Fackelnähe.

**Haptik**: Muster nach Stärke (leichter Treffer 7 ms … Boss/Level-Up/Tod/Sieg als kleine Muster), synchron zum
Schall-Transienten (Ausgabe-Latenz), leichte Impulse höchstens alle 70 ms, Münzen höchstens 1×/s, max. 35 %
Vibrationszeit pro Sekunde, starke Muster werden nicht von schwachen unterbrochen. iPhone-Ersatz wie in v2.

**Technik / Performance**: Kein einziger Oszillator zur Laufzeit. Alle Klänge werden beim Start **im Menü** per
OfflineAudioContext vor-gerendert (58 Sätze, ~20 MB + Stadtmelodie 14 MB). Pro Effekt nur Puffer + Gain (+ Panner),
Stimmen-Limits je Typ/global mit weichem Stehlen, Knoten werden nach `ended` getrennt.
v2-Handy-Fixes bleiben: Entsperren auf pointerdown/pointerup/touchend/click/keydown + stiller Puffer,
`audioSession = "playback"`, Pause/Fortsetzen beim App-Wechsel, Schalter wirken sofort.

## Messwerte (`node tools/audiorender.mjs`, 60 s je Zustand, ffmpeg ebur128/volumedetect)
| Zustand | LUFS (I) | True-Peak | Anteil < 80 Hz |
|---|---|---|---|
| Musik Stadt | −19,1 | −4,6 dBTP | −50,5 dB |
| Musik Keller 1 Moosgrotte | −20,5 | −7,4 dBTP | −43,2 dB |
| Musik Keller 2 Kristallhöhle | −20,8 | −5,7 dBTP | −42,2 dB |
| Musik Keller 3 Zuckerkeller | −19,1 | −7,3 dBTP | −40,8 dB |
| Musik Keller 4 Frostkeller | −19,1 | −6,7 dBTP | −39,4 dB |
| Musik Keller 5 Glutkeller | −20,7 | −5,9 dBTP | −44,6 dB |
| Musik Kampf (Keller 1) | −18,9 | −4,6 dBTP | −33,9 dB |
| Musik Boss (Keller 1) | −17,5 | −4,1 dBTP | −31,8 dB |
| Musik Kellerkönig | −17,5 | −4,1 dBTP | −31,8 dB |
| Ambience allein Stadt / Kristallhöhle | −35,3 / −34,4 | −20,0 / −18,8 dBTP | — |
| **Gesamtmix Kampf** (Musik + Effekte + Ambience) | **−15,9** | **−3,7 dBTP** | −32,4 dB |

Ziel ≈ −16 LUFS / < −1 dBTP erreicht, kein Clipping (Soft-Clip-Decke −1,5 dBFS als Sicherheitsnetz). Musik ist ~3 dB
leiser als v2 relativ zu den Effekten. Spektrogramme + WAVs: `shots/audio/` (nicht versioniert).

## Tests
| Test | Ergebnis |
|---|---|
| `node tools/check.mjs --port=8731 --throttle=4` | **44/44 PASS** (inkl. neu A15 + A16; B12 in allen Läufen stabil) |
| A15 Effekt-Dauerfeuer (30 Aufrufe/s) vs. Effekte aus, 4× Throttle, Median aus 3 Paaren | Differenz −8 … +2 % (Rauschen dominiert), Audio-Engine kostet **~1 % Main-Thread** (9,9 ms/s) · A3 bei 4×: 373–410 fps |
| A16 Vor-Rendern im Menü | 0,4 s (GPU-Profil) bzw. 4,9 s (Software-Headless), längster Main-Thread-Happen 11 ms, längster Menü-Frame währenddessen 14 ms |
| `node tools/audiotest.mjs` (ohne Autoplay-Flag) | PASS: nach Tap „running", Effekte gespielt, 0 Live-Oszillatoren, 0 Fehler |
| Leck-Test `node tools/bot.mjs 8731 20 4 --secs=120 --audio` | PASS: 3640 Stimmen gestartet, aktive Stimmen 11–49 ohne Wachstum (2. Hälfte max. 29), offen == aktiv |
| Live-URL headless (nach Deploy) | v3 im Menü, AudioContext „running", Stadtmelodie geladen, 58/58 Sätze vor-gerendert (7,1 s Software-Headless), Kampfmusik schaltet auf Stufe 2, **0 Fehler** |
| Haptik (Browser-Test mit Stub) | leichte Impulse ≥ 70 ms Abstand, Münzen ≤ 1/s, Budget ≤ 350 ms/s, Vorrang + „Vibration aus" greifen |

## Offene Punkte
- Klang nur per Messung/Spektrum geprüft — **nicht mit Ohren**. Balance der Welt-Schichten und Lautstärke der
  Effekte bitte am Handy anhören; alle Pegel stehen zentral in `src/audio.js` (`LVL`, `MIX`) und `src/music.js` (`LV`).
- Headless-FPS-Messungen schwanken stark (±20 %); der A/B-Unterschied liegt darunter. Echter Beleg am Handy wäre schön.
- Speicher: ~34 MB Audio-Puffer. Auf sehr alten Handys ggf. `SR` in `src/audio.js` auf 24000 senken.
- Musikwechsel sind taktgenau: Kampf-/Boss-Musik setzt bis zu ~1,3 s (Halbtakt) bzw. ~2,7 s (Takt) verzögert ein — gewollt.
- iPhone-Haptik bleibt auf einen Tick pro Ereignis (+ max. 2 bei Mustern) beschränkt (Plattform-Grenze).

## Was Peter am Handy anhören sollte
1. **Stadt:** Menü antippen → dieselbe Melodie wie bisher, dazu leise Vögel/Treiben; zum Brunnen laufen (Plätschern
   wandert von links nach rechts); Strohwichtel hauen (Treffer, Puff mit Glitzer).
2. **Keller:** Portal Ebene 1 (Harfe + Glocken) → Melodie wird „höhlig", Kalimba + Tropfen kommen dazu. Später
   Kristallhöhle (Ebene 5) und Glutkeller (Ebene 17) vergleichen — jede Welt klingt anders.
3. **Kampf:** in eine Gruppe laufen → nach spätestens einem Takt setzen Bass/Trommeln ein; Münzen einsammeln (Tonleiter
   steigt), kritische Treffer „pling"; wird es ruhig, blendet die Kampfschicht sanft aus.
4. **Boss (Ebene 4):** „Da-DAA" beim Erwachen, auf der nächsten Takt-Eins Becken + Boss-Thema; nach dem Sieg Fanfare
   und zurück zur Keller-Melodie. Level-Up und Umfallen (sanft) einmal hören.
5. Vibration: leichte Treffer kaum spürbar, Kritisch/Boss/Level-Up deutlicher — angenehm, nicht dauerhaft brummend?
