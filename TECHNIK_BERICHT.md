# Koboldkeller – Technik-Nacht „Kino-Look 2D und flüssig auf jedem Handy“ (08.10.2026)

Stand: Version 13 (Cache-Buster `?v=13.7`), live auf https://drpeterkalmar.github.io/koboldkeller/

## In einfachen Worten (auch für die Kinder)

- **Das Bild sieht mehr nach Kino aus.** Über das Spielbild kommt jetzt eine zweite, schnelle Grafik-Schicht. Sie macht
  Fackeln, Kristalle und Zaubersachen weich leuchtend, färbt den Glutkeller wärmer und die Eis- und Kristallhöhlen kühler,
  und im Glutkeller flimmert die heiße Luft ganz leicht.
- **Und trotzdem rechnet das Handy weniger.** Das Spielbild wird ein Stück kleiner gemalt und dann von der Grafikkarte
  wieder groß und scharf gemacht (wie ein guter Fernseher, der ein kleines Bild hochrechnet). Das spart mehr, als die
  Leucht-Schicht kostet: auf der besten Stufe fast ein Drittel weniger Arbeit je Bild.
- **Das Spiel läuft auf jedem Handy gleich schnell.** Früher rechnete das Spiel einmal pro Bild. Ein 120-Hz-Handy rechnete
  dadurch doppelt so oft wie nötig. Jetzt rechnet es immer genau 60-mal pro Sekunde, egal wie schnell der Bildschirm ist.
  Zwischen zwei Rechenschritten werden die Figuren weich „dazwischen“ gezeichnet. Treffer, Tempo und Beute sind gleich.
- **Das Spiel merkt, wie stark das Handy ist – in beide Richtungen.** Wird es zu langsam, schaltet es eine Grafikstufe
  herunter (wie bisher). Neu: Hat es wieder 8 Sekunden lang Luft, schaltet es auch wieder hinauf. Und ein Handy im
  Stromsparmodus (30 Bilder je Sekunde) wird nicht mehr fälschlich für „zu langsam“ gehalten.
- **Kein Ruckeln mehr beim Treppensteigen.** Den Boden der neuen Ebene malt jetzt ein Helfer im Hintergrund, während die
  Blende zu ist. Der Hauptrechner muss nicht mehr anhalten.
- **Funken und Sterne werden schneller gemalt** (jede Sorte einmal in 8 Drehungen vorbereitet statt jedes Mal neu gedreht).
- **Die Musikdatei ist kleiner** (743 statt 902 KB) und klingt mindestens so gut. Das Spiel lädt bis zum Start **102 KB
  weniger** als vorher, obwohl neue Programmteile dazugekommen sind.

Was gleich bleibt: Spielregeln, Schaden, Beute, Spielstände, Ruhmeshalle, alle Deko aus v12/v13 (Fackel-Licht, Partikel,
Boss-Licht, Vignette).

## Was neu ist (technisch)

| Etappe | Was | Datei(en) | Regler |
|---|---|---|---|
| E0 | Mess-Gate: Hauptthread-Zeit je Bild bis fertig gemalt, p95 je Stufe und Szene, hoch + quer, CPU ×4, DPR 2, Ladegröße | `tools/perf_gate.mjs` | – |
| E1 | Qualitäts-Automatik misst Arbeitszeit, geht mit 8 s Hysterese auch wieder hoch, erkennt 30-Hz-Stromsparen | `src/automatik.js` | `?auto=0` |
| E1 | Stadtmusik 24 kHz / 80 kbit/s; mp3-Rückfall neu aus derselben Vorlage; ungenutzte `dungeon.*` entfernt | `audio/`, `tools/audio_diaet.py` | – |
| E1 | Partikel gebündelt: 8 vorgedrehte Bilder je Sorte/Farbe (Funken 16), kein `save/rotate/restore` je Partikel | `src/buendel.js`, `src/render.js` | `?pbuendel=0` |
| E2 | Fester Spieltakt 60 Hz + Zwischenbild, Hitstop/Zeitlupe je Schritt | `src/takt.js`, `src/main.js` | `?takt=0` |
| E3 | WebGL2-Endbild: Hochskalieren + Nachschärfen (CAS), Schein aus der Glow-Ebene (halbe Auflösung, Weichzeichnen in Viertel-Auflösung), Farbstimmung je Welt, Wärmeflimmern im Glutkeller, Dither | `src/post.js` | `?post=0`, `?pvign=1`, `?pszene=` |
| E4 | Back-Worker: Boden-Chunks und Fels-Muster beim Ebenenwechsel im OffscreenCanvas-Worker, Hauptthread bekommt `ImageBitmap` | `src/backwerk.js`, `src/chunkbacken.js` | `?worker=0` |
| E5 | Normal-Licht für Wände/Boden: **nicht gebaut**, Plan unten | – | – |

Alle Regler schalten auf genau den v13-Weg zurück. `?post=0&takt=0&worker=0&pbuendel=0&auto=0` = v13-Technik.
Rückfall ohne Regler: kein WebGL2, Shader-Fehler oder Kontextverlust → reines 2D (im Browser geprüft: Kontextverlust
mitten im Spiel, das Spiel läuft weiter); kein OffscreenCanvas/Worker → synchron backen.

## Messung vorher/nachher (E0/E6)

Werkzeug `tools/perf_gate.mjs`, ein Chromium (Metal), Kontexte nacheinander, v13 (Worktree von `31cb2df`, Port 8732) und
Technik (Port 8731) **im Wechsel** im selben Browser, gleicher Zufall, `?auto=0` + `KK.quality(q)` je Stufe, 8 s je Szene,
2 Wiederholungen (gepoolt), Profil Mittelklasse 412×915 bzw. 915×412, DPR 2, CPU ×4. Szenen: Stadt (Kobold läuft),
Kampf (Ebene 9, 8 Gegner, Schläge + Blasen), Bosskampf (Ebene 8, Arena), Ebenenwechsel (alle 3 s über die Blende wie die
Treppe). Rohdaten: `tests/perf/perf_vorher_*.{json,md}` (E0, vor dem Merge), `perf_technik_sw/gpu.*` (E6),
Zwischenmessungen `perf_e3_*`, `perf_e2_takt_sw.*`, `perf_e6_q3_*`.

**Profil Software-Raster (Haupt-Gate)**, CPU ×4, DPR 2, Hauptthread-Zeit je Bild bis fertig gemalt, **p95** in ms (vorher → nachher, Änderung); in Klammern das längste Bild.

| Stufe | Format | Stadt | Kampf | Boss | Ebenenwechsel |
|---|---|---|---|---|---|
| 0 | hoch | 109,2 → **76,4** (−30 %) | 105,4 → **76,5** (−27 %) | 111,1 → **78,0** (−30 %) | 94,4 → **65,4** (−31 %) [120 → 72] |
| 0 | quer | 107,7 → **76,0** (−29 %) | 107,3 → **79,3** (−26 %) | 117,7 → **84,8** (−28 %) | 100,3 → **67,9** (−32 %) [109 → 81] |
| 1 | hoch | 75,2 → **55,4** (−26 %) | 71,6 → **55,8** (−22 %) | 73,7 → **57,9** (−21 %) | 62,1 → **47,7** (−23 %) [78 → 51] |
| 1 | quer | 72,9 → **56,0** (−23 %) | 72,0 → **57,9** (−20 %) | 78,7 → **65,1** (−17 %) | 65,2 → **50,8** (−22 %) [80 → 67] |
| 2 | hoch | 45,8 → **39,4** (−14 %) | 42,8 → **39,4** (−8 %) | 44,3 → **41,0** (−7 %) | 35,0 → **32,4** (−7 %) [49 → 36] |
| 2 | quer | 46,0 → **40,1** (−13 %) | 43,7 → **40,9** (−6 %) | 49,9 → **46,5** (−7 %) | 39,6 → **35,7** (−10 %) [53 → 44] |
| 3 | hoch | 30,8 → **31,4** (+2 %) | 29,0 → **28,4** (−2 %) | 29,5 → **30,0** (+2 %) | 22,2 → **24,3** (+9 %) [32 → 26] |
| 3 | quer | 29,5 → **29,4** (−0 %) | 29,1 → **29,3** (+1 %) | 32,9 → **34,3** (+4 %) | 25,9 → **25,8** (−0 %) [144 → 29] |

**Profil GPU-Raster**, CPU ×4, DPR 2, Hauptthread-Zeit je Bild bis fertig gemalt, **p95** in ms (vorher → nachher, Änderung); in Klammern das längste Bild.

| Stufe | Format | Stadt | Kampf | Boss | Ebenenwechsel |
|---|---|---|---|---|---|
| 0 | hoch | 4,2 → **4,0** (−5 %) | 7,0 → **7,7** (+10 %) | 7,5 → **7,2** (−4 %) | 6,1 → **3,9** (−36 %) [14 → 10] |
| 0 | quer | 5,9 → **4,2** (−29 %) | 9,4 → **7,8** (−17 %) | 7,5 → **7,6** (+1 %) | 6,1 → **4,1** (−33 %) [8 → 6] |
| 1 | hoch | 4,0 → **3,6** (−10 %) | 6,3 → **6,6** (+5 %) | 7,6 → **6,8** (−11 %) | 5,9 → **4,1** (−31 %) [46 → 7] |
| 1 | quer | 5,9 → **4,6** (−22 %) | 7,2 → **7,1** (−1 %) | 7,2 → **6,4** (−11 %) | 6,2 → **5,7** (−8 %) [10 → 7] |
| 2 | hoch | 4,7 → **3,9** (−17 %) | 6,4 → **6,2** (−3 %) | 7,2 → **6,7** (−7 %) | 5,1 → **3,9** (−24 %) [7 → 8] |
| 2 | quer | 6,8 → **5,6** (−18 %) | 6,5 → **6,7** (+3 %) | 6,7 → **6,6** (−1 %) | 6,0 → **4,5** (−25 %) [9 → 7] |
| 3 | hoch | 7,9 → **4,2** (−47 %) | 6,1 → **6,3** (+3 %) | 6,6 → **7,0** (+6 %) | 3,7 → **5,8** (+57 %) [8 → 6] |
| 3 | quer | 12,0 → **9,9** (−17 %) | 6,7 → **6,7** (+0 %) | 7,3 → **8,2** (+12 %) | 3,9 → **4,9** (+26 %) [10 → 6] |

**Ergebnis Gate (p95 nachher ≤ vorher + 5 % + 0,5 ms je Stufe und Szene):**
- Software-Raster: **bestanden** bis auf einen Einzelwert (hoch, Stufe 3, Ebenenwechsel +9 %). Nachgemessen mit 3
  Wiederholungen: 23,2 → 24,4 ms (+5 %, innerhalb der Toleranz); ohne Worker (`?worker=0`) hatte derselbe Lauf ein
  längstes Bild von 183 ms, mit Worker 58 ms (`perf_e6_q3_wechsel.md`).
- GPU-Raster: Werte von 4–9 ms, Einzellauf; drei Stufe-3-Werte lagen 1–2 ms höher. Nachgemessen mit 3 Wiederholungen:
  **bestanden** (`perf_e6_q3_gpu.md`). Stufe 3 läuft exakt den v13-Zeichenweg; die Streuung ist Rauschen.
- Spürbar ist der Gewinn auf den Stufen 0–2: **−27…32 % (Stufe 0), −17…26 % (Stufe 1), −6…14 % (Stufe 2)**.
  Das ist die Gegenfinanzierung durch die kleinere 2D-Szene (Skala 0,8 / 0,66 / 0,56 × DPR statt 1 / 0,8 / 0,65).
- Längstes Bild beim Ebenenwechsel (separat, `tools/technik_blende.mjs`, 6 Wechsel, Median): Software-Raster
  **371 → 157 ms**, Blende 0,76 → 0,59 s; GPU-Raster 139 → 130 ms, Blende 0,33 → 0,41 s (`tests/perf/blende_*.json`).

**Ladegröße bis spielbereit** (alle Dateien, die der Browser bis zum Start holt): **1641 → 1539 KB roh, 1169 → 1032 KB
gzip (−102 KB / −137 KB)**. JS +58 KB roh (+23 KB gzip, neue Module), Musik −159 KB. Der Back-Worker fordert beim ersten
Treppenwechsel 8 Module an (gezählt 374 KB roh / 104 KB gzip). `art/deko/chunkbacken` haben dieselbe URL wie auf der
Seite und kommen aus dem Browser-Cache; neu übers Netz gehen nur `backwerk.js` und `util/config/myth` ohne `?v=`,
≈ 91 KB roh / ≈ 27 KB gzip.

**Was das Gate nicht sieht:** die GPU-Zeit des Endbilds (WebGL läuft auf der GPU des Mac) und echte Handy-Thermik.
Die Automatik sieht beides indirekt über die Bildabstände und stuft notfalls ab; Stufe 3 hat kein Endbild.

## Abnahme im Browser

Alle Abnahme-Skripte laufen mit einem Browser nacheinander und stumm. Ergebnisse in `tests/perf/abnahme_*.json`,
Bilder in `shots/technik/`.

| Prüfung | Chromium (Metal) | WebKit (Safari-Engine) |
|---|---|---|
| P1 Endbild an (WebGL2), Szene 659×1464 → Endbild 824×1830 | ✔ | ✔ |
| P2 Kontextverlust mitten im Spiel → reines 2D, Spiel läuft weiter, keine Fehler | ✔ | ✔ |
| P3 `?post=0` = v13 (Auflösung 2, keine Glow-Leinwand) | ✔ | ✔ |
| P4 Stufe 3: Endbild ruht, 2D sichtbar; zurück auf Stufe 0: läuft wieder | ✔ | ✔ |
| W1 Back-Worker liefert Chunks + Fels-Muster beim Ebenenwechsel (≈ 100 Chunks über 5 Wechsel, 0 Fehler) | ✔ | ✔ |
| W2 Blende-Dauer, synchron nachgebackene Chunks je Wechsel (0–4) | ✔ (0,46–0,55 s ungedrosselt im Headless-Takt) | ✔ (0,30–0,35 s) |
| X1 Bodenbild Worker = synchron (nur animierte Dinge unterscheiden sich, `abnahme_pixel_diff.jpg`) | ✔ | – |
| T1 fester Takt: 60 Schritte/s bei ≈ 600 Bildern/s (Chromium frei) bzw. 60 Hz (WebKit) | ✔ | ✔ |
| T2 Lauftempo bei 30/60/120 Hz gleich (4,2–4,6 Kacheln/s), 60 Schritte je Spielsekunde; bei 120 Hz 58 statt 102 Logik-Durchläufe/s | ✔ | – |
| A1 CPU ×6 im Kampf → Automatik stuft nach 4 s ab | ✔ | – |
| A2 starkes Gerät: Stufe 2 → 1 → 0 nach 10 und 21 s (je ≥ 8 s) | ✔ | – |
| A3 30-Hz-Stromsparmodus (wenig Arbeit) → bleibt Stufe 0, „gedeckelt“ erkannt | ✔ | – |
| AU Stadtmusik m4a und mp3-Rückfall laden und werden zur Schleife | ✔ | ✔ |
| Partikel-Stresstest 650 drehbare Partikel: gleiches Bild (`partikel_ab.jpg`), `draw()` p95 5,8 → 3,9 ms (GPU-Profil) | ✔ | – |
| Live nach jedem Push (`tools/technik_live.mjs`): richtige `?v=`, Endbild/Takt/Worker an, Ebenenwechsel, 0 Fehler | ✔ 13.4–13.7 | – |

**Bestehende Prüf-Suiten** (`check.mjs`, Teil 1 und 2 inkl. v10–v13-Checks): mit dem finalen Code
**Teil 1 64/64 PASS, Teil 2 31/31 PASS** (`shots/neubau/check-results-v7skip.json`, `-v7only.json`). Zum Vergleich der alte
Stand v13 mit denselben (reparierten) Skripten: 29/31 in Teil 2 (V34b, V35c rot). Node-Tests: 48/48
(`node --test tests/node/*.test.mjs`, u. a. **gleiche Simulation bei 30/60/90/120/144 Hz** mit echter Spiel-Logik).

**Collagen** (selbst angesehen): `shots/technik/final_{hoch,quer}_q{0,2}_{a,b}.jpg` – oben v13, unten Technik.
Ehrliche Bewertung: Der Unterschied ist **sichtbar, aber zurückhaltend**. Glutkeller deutlich wärmer und satter,
Frost/Kristall kühler, Fackeln, Kristalle und Treffer bekommen einen weichen Schein; die Stadt ist absichtlich fast
unverändert. Schärfe: im 2×-Lupenvergleich (`lupe_*`) auf Stufe 0–2 gleichwertig zu v13, feinste Linien minimal weicher.
Das Wärmeflimmern ist auf Standbildern nicht zu sehen (±0,6 px), in Bewegung als leichtes Wabern. Kein Effekt verdeckt
Text oder Bedienelemente (HUD ist DOM über dem Bild).

## Entscheidungen und Abweichungen vom Auftrag

1. **Messgröße.** Der Auftrag nennt `drawMed/drawP95` (reine `draw()`-Zeit). Im Software-Raster-Profil malt Chrome das
   2D-Canvas aber erst *nach* dem JavaScript fertig – beim Ebenenwechsel zeigte `draw()` 0,5 ms, das Bild kostete in
   Wahrheit 80–90 ms. Das Gate misst deshalb die **Hauptthread-Zeit vom ersten rAF-Rückruf bis nach dem Malen**
   (MessageChannel-Nachricht als nächste Aufgabe), p95 gepoolt über die Wiederholungen. Zwei Profile: „sw“ (Canvas im
   Software-Raster → Pixelarbeit zählt, Stellvertreter für die Füllrate eines Handys; das Haupt-Gate) und „gpu“
   (Canvas auf der GPU → misst nur, was der Hauptthread aufzeichnet). Toleranz 5 % + 0,5 ms (bei 7-ms-Werten im
   gpu-Profil streut p95 sonst schon durch Rauschen über 5 %). Streuung zwischen zwei Läufen desselben Stands: ±5–8 %.
2. **GPU-Zeit des Endbilds sieht das Gate nicht.** WebGL läuft auf der GPU des Mac mini; wie viel die drei Durchgänge
   (2× Weichzeichnen in Viertel-Auflösung, 1× Endbild mit 7 Texturabrufen je Pixel) auf einer Mali-/Adreno-GPU kosten,
   ist hier nicht messbar. Grobe Schätzung: 1–2 ms bei 1,5 Mpx. Deshalb ruht das Endbild auf der Sparstufe 3, und die
   Automatik misst Bildabstände mit (sieht also auch GPU-Engpässe).
3. **Stufe 3 ohne Endbild.** Dort rendert die Szene schon mit 1 CSS-px je Pixel, es gibt nichts zu sparen; mit Endbild
   war p95 +5 … 23 % schlechter. Jetzt ist Stufe 3 exakt der v13-Weg.
4. **Szenen-Skalen kleiner als im Vorbau** (Stufe 1: 0,66 statt 0,72; Stufe 2: 0,56 statt 0,65 × DPR). Mit 0,65 rechnete
   Stufe 2 genauso viele Pixel wie v13 und zahlte das Endbild obendrauf. Im 2×-Lupenvergleich (`shots/technik/lupe_*`)
   sind die kleineren Skalen mit Nachschärfen so scharf wie v13. Stufe 0 bleibt bei 0,8.
5. **Vignette bleibt in der 2D-Lightmap** (der Auftrag sagt: „ersetzt die 2D-Vignette, wenn aktiv“). Grund: Schadenszahlen,
   Schilder, der weiße Treffer-Blitz und die rote Rand-Warnung werden im selben Canvas gezeichnet; eine Shader-Vignette
   würde sie mit abdunkeln. Die Lightmap-Vignette kostet nichts extra (sie steckt in der ohnehin gezeichneten Lightmap).
   `?pvign=1` = Vignette im Shader zum Vergleich.
6. **Audio.** Die Annahme „town.mp3 und town.m4a werden beide geladen (−3,6 MB)“ stimmte nicht: `audio.js` lädt seit
   jeher nur eine Datei (m4a, sonst mp3). Einen Service Worker gibt es im Projekt nicht; ich habe keinen eingeführt
   (Gefahr veralteter Dateien nach Updates, besonders auf iOS – das Projekt setzt auf `?v=`-Cache-Buster). Stattdessen:
   `town.m4a` neu mit 24 kHz/80 kbit/s (das Spiel dekodiert ohnehin auf 24 kHz). Maßstab ist der Generationsverlust:
   die alte Datei mit ihren eigenen Einstellungen neu kodiert weicht 16,1 dB vom Original ab (Apple-AAC 48 kHz: 20,4 dB),
   die neue Datei nur 23,1 dB – sie ist also mindestens so originalgetreu. Takt-Eins der Schleife unverändert (51,21 ms).
   Repo/Pages: −3,4 MB (alte mp3 3,0 → 0,9 MB, `dungeon.*` −1,1 MB, m4a −0,16 MB).
7. **Back-Worker bleibt an**, obwohl die Blende im GPU-Profil 0,08 s länger zu ist (0,33 → 0,41 s): auf CPU-schwachen
   Geräten (Software-Profil, CPU ×4) halbiert er den Ruckler beim Ebenenwechsel (längstes Bild 371 → 157 ms) und die
   Blende wird sogar kürzer (0,76 → 0,59 s). Art-Caches (Sprites) backt weiter der Hauptthread hinter der Blende
   (Umbau von `art.js` auf OffscreenCanvas wäre groß und nur mit Pixelabgleich prüfbar). Eine „Lightmap je Ebene“ gibt
   es nicht – sie wird je Bild in ¼-Auflösung gezeichnet, es gab nichts zu verlagern.
8. **Fester Takt bei sehr langsamen Bildern.** Unter 20 Bildern/s rechnet der Takt bis zu 3 Schritte je Bild (die alte
   Schleife 1 Schritt mit 50 ms). Gemessen kostet die Logik auch dann ≤ 0,3 ms je Bild – kein Budgetproblem.
9. **Version.** v13 war schon vergeben (Deko-Nacht, `?v=13.3`). Die Spielversion bleibt 13, der Cache-Buster zählt je Push
   hoch (13.4 … 13.7), damit kein Browser alte und neue Module mischt.
10. **Worker und Cache-Buster.** Module-Worker kennen die Importmap nicht; `util/config/myth` lädt der Worker ohne `?v=`.
    Nach einem Update kann er bis zu 10 min (GitHub-Pages-Cache) eine alte `config.js` sehen. Fällt er dadurch aus,
    backt der Hauptthread synchron; schlimmstenfalls hat ein Boden-Chunk kurz alte Farben. Geringes Risiko, notiert.

## E5 Normal-Licht: Plan statt halber Bau

Der Auftrag erlaubt E5 nur, wenn E1–E4 im Budget sind, und sagt „falls zu groß: als Plan, nicht halb bauen“. E1–E4
sind im Budget, aber die Reserve ist ungleich verteilt: Stufe 0 hat ≈ 25 % Luft, Stufe 1 ≈ 20 %, Stufe 2 ≈ 10 %, Stufe 3
keine. Plastisch werden vor allem **Wände und Fels** – das sind keine Boden-Chunks, sondern einzeln gezeichnete Sprites
(`wallSprite`, Fels-Muster). Ein Normal-Licht nur für den Boden brächte wenig. Mit Wänden wird es ein großer Umbau.
Deshalb: Plan.

1. **Relief-Ebene backen.** `backeChunk` (läuft schon im Worker) bekommt einen zweiten Durchgang „Höhe“ in Graustufen
   (Steinoberkanten hell, Fugen dunkel; dieselben Kachelformen wie `drawFloorTile`/`drawRockEdge`), als zweite
   `ImageBitmap` je Chunk. `wallSprite` und das Fels-Muster bekommen je eine Höhen-Variante (Krone hell, Fuß dunkel,
   Steinfugen) im Art-Cache.
2. **Relief-Leinwand je Bild in halber Szenen-Auflösung**, gezeichnet wie Boden/Wände/Fels (nur diese, keine Figuren, kein
   Text). Kosten im Software-Profil geschätzt +5–8 % je Bild (¼ der Pixel, nur Boden + Wände) plus ein Upload in
   Viertel-Größe – passt in Stufe 0/1, nicht in Stufe 2.
3. **Licht im Endbild** (`post.js`): Normalen per Sobel aus der Relief-Textur, die nächsten ≤ 12 Fackeln als
   Uniform-Array (Bildschirmposition, Farbe, Radius aus `R.wallTorch`/`FX.lights`), Lambert + leichter Glanz, mit der
   Lightmap multipliziert. Nur Stufe 0–1 (Auftrag: „Stufe ≥ 1“ im Sinne von „ab der besseren Hälfte“).
4. **Abnahme:** Collage Fels/Mauer mit und ohne, Gate Stufe 0/1, Kontextverlust.
Aufwand: ein eigener Job (Relief-Varianten aller Wand-Sprites je Welt sind die Hauptarbeit).

## Vorbau (Leicht-Spur) und was der Heavy-Job daran geändert hat

Die Leicht-Spur (`koboldkeller-v13-vorbau`) hat E1–E4 ohne Browser vorgebaut (47 Node-Tests, Rauchtest mit
Attrappen-DOM). Übernommen per `git merge --no-ff origin/vorbau/koboldkeller-v13-technik`, **ohne Konflikte**; die
Vorher-Messung lief vorher auf `main` (Worktree `../kk_vorher`). Im Browser abgenommen und dabei geändert:

| Fund im Browser | Änderung |
|---|---|
| `perf_gate` maß im Software-Profil nur JavaScript (Ebenenwechsel 4 ms statt 90 ms) | Messgröße „haupt“ (bis nach dem Malen), Ladegröße „bis spielbereit“, Toleranz + 0,5 ms |
| Automatik hielt 30-Hz-Stromsparen mit einzelnen Hängern für „zu langsam“ und stufte ab | Streuung aus Quartilen, Mittel beidseitig gestutzt; neuer Node-Test, Browser A1–A3 grün |
| Fester Takt: erstes Bild nach dem Ebenenwechsel rechnet evtl. keinen Schritt → Weg-Pfeil der alten Ebene stand einen Moment falsch (V20/V20b rot) | Pfeil beim Ebenenwechsel sofort zurücksetzen |
| Endbild auf Stufe 2/3 teurer als v13 | Stufe 3 ohne Endbild, Stufe 1/2 kleinere Szene |
| Stadtmusik: Entscheidung „nach Gehör“ offen | 24 kHz/80 kbit/s eingesetzt (Begründung oben) |
| Vibrations-Abstand einmal 396 statt ≥ 400 ms (Timer-Versatz) | Mindestabstand am echten `vibrate()`-Aufruf gesichert |
| Prüfskripte luden Spielmodule mit `?v=13` statt `?v=13.3` → zweite, unbenutzte Modul-Kopie; V20/V22/V24/V25/V26 waren deshalb schon im alten Stand rot | Import über die Importmap (`import("./src/x.js")`); jetzt 31/31 bzw. 64/64 grün |
| Test-Browser waren nicht stumm | `--mute-audio` in allen Skripten, WebKit per Init-Skript stumm |

Die Übergabe-Datei `VORBAU_koboldkeller-v13-technik.md` ist in diesen Bericht eingearbeitet und aus dem Repo entfernt,
der Branch `vorbau/koboldkeller-v13-technik` gelöscht.

## Offen / für Peter

- **Echtes Handy:** Alle Zahlen stammen aus Chromium/WebKit auf dem Mac mini mit CPU-Drosselung ×4. Die GPU-Kosten des
  Endbilds auf einem Mittelklasse-Android sind geschätzt, nicht gemessen. Bitte einmal auf dem Kinder-Handy spielen:
  `KK.post()` und `KK.auto()` in der Konsole (Remote-Debugging) zeigen, ob das Endbild läuft und welche Stufe die
  Automatik wählt. Wenn es dort ruckelt: `?post=0` vergleichen.
- **Hörprobe:** Stadtmusik kurz anhören. Klingt sie anders: alte Datei aus Git zurück:
  `git show b4ebe14~1:audio/town.m4a > audio/town.m4a` (eine Datei, Commit vor „Technik E1 abgenommen“).
- **iPhone (echtes Safari):** WebKit-Engine ist abgenommen (Endbild, Kontextverlust, Worker, Takt 60/s, Musik), ein
  echtes iPhone nicht.
- **E5 Normal-Licht** als eigener Job (Plan oben).
