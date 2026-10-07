# Koboldkeller v13: Mehr Details und Eye Candy, ohne dass das Handy mehr arbeiten muss (Peter, 05.10.2026)

**Wunsch:** „Jedes Spiel mit Opus max ressourcenschonend verschönern … also mehr Details und Eye Candy.“
Es geht nur um die Optik. Spielmechanik, Balance, Steuerung, Spielstände, Kostüme (v9), der Boss-Auftritt (v11) und der Fels (v12)
bleiben, wie sie waren.

**Spielen:** https://drpeterkalmar.github.io/koboldkeller/ (Menü zeigt „v13“)
**A/B-Vergleich:** https://drpeterkalmar.github.io/koboldkeller/?deko=0 zeigt das alte Aussehen (wie v12).

## Was ist neu (Alltagssprache)
1. **Der Boden lebt.** In jeder Welt liegt Kleinkram auf dem Boden, passend zur Welt:
   Moos: Mooskissen, Grasbüschel, kleine Pilze, Blätter, Wasserpfützen. Kristall: Kristallsplitter, leuchtende Risse,
   Kristallsterne, spiegelnde Pfützen. Zucker: Bonbons, Sirup-Pfützen, Kekskrümel, Zuckerwürfel, Herzbonbons.
   Frost: glänzende Eisflächen, Schneewehen, zugefrorene Pfützen, Frost-Sterne. Glut: glühende Lavarisse, kleine Lavatümpel,
   Asche, Knochen, Obsidian, Glutkiesel. Am Fuß der Wände liegen Kiesel, Moos oder Schnee. In der Stadt: Gänseblümchen, Klee, Kiesel.
   Die Pfützen spiegeln das Raumlicht und blitzen ab und zu auf.
2. **Die Wände erzählen etwas.** Etwa jede sechste Wand trägt Schmuck auf ihrer sichtbaren Seite: Banner in Weltfarbe mit Pilz-Wappen,
   Spinnweben mit kleiner Spinne, Ranken mit Blüten, Baumpilze, Kristalle, leuchtende Adern, Zuckerguss, Gummibärchen-Drops,
   lange Eiszapfen, Frostfarn, glühende Lavanähte, Ketten. Fackeln und die Steingesichter (Wandfallen) bleiben frei.
3. **Licht wie in einer echten Höhle.** Fackeln werfen einen Lichtkegel in den Raum und einen hellen Fleck an die Wand, beides flackert.
   In vielen Räumen fällt ein **schräger Lichtstrahl von oben** mit tanzendem Staub; in der Boss-Arena steht er genau über der Mitte.
   Lava, Glutrisse und Kristalle leuchten im Dunkeln und pulsieren leise. Die Bildränder sind in der Weltfarbe abgedunkelt
   (grünlich, violett, rosa, eisblau, glutrot) statt grau.
4. **Glühteilchen in der Luft.** Ruhig schwebende Funken in der Weltfarbe (in der Stadt wie Pollen).
5. **Schönere Rückmeldung:** Treffer sprühen Funkenstrahlen und blitzen kurz hell auf. Besiegte Gegner hinterlassen einen Lichtpuff,
   einen Ring am Boden und ein aufsteigendes Sternchen. Fallengelassene Beute steht kurz in einer **Lichtsäule**, seltene Sachen
   (Schwert, Zauberstab, Glitzerstein, Hut, Kostüm) leuchten leise weiter. Münzen blinken ab und zu. Eine aufgehende Truhe
   öffnet einen goldenen Strahlenkranz.
6. **Treppe und Portale locken:** Über der Treppe steht eine goldene Lichtsäule mit aufsteigenden Funken und einem pulsierenden Ring.
   Aus den Portalen steigen Funken in Portalfarbe.
7. **Boss-Auftritt mit Licht und Kamera:** Während der Boden bebt, wird die Welt dunkler, und die Kamera rückt näher heran.
   Dadurch leuchten Risse und Loch stärker. Danach zoomt der Bosskampf wie bisher heraus. Der Ablauf aus v11 bleibt gleich.
8. **„Bewegung reduzieren“** am Handy (Bedienungshilfen) wird beachtet: Das Bild wackelt nur noch etwa ein Drittel so stark,
   es gibt weniger Schwebeteilchen und keine Funkenstrahlen.

## Wie es sparsam bleibt
- Boden- und Wand-Deko werden einmal je Ebene **in die vorhandenen Boden-Chunks und Wand-Bilder eingebacken**. Pro Bild kostet das
  nichts, es sind gleich viele Zeichenaufrufe wie vorher. Die Wand-Bilder werden beim Ebenenwechsel aufgeräumt
  (Speicher: höchstens ≈ 1,5 MB für eine Ebene).
- Lichter laufen über die vorhandene Licht-Karte in ¼-Auflösung. Leuchten und Strahlen sind einfache, einmal vorgezeichnete Sprites.
  Es gibt keinen Vollbild-Effekt, keinen neuen Zeichen-Takt und keine neuen Dateien zum Laden (+14 KB gzip Code).
- **An die Auto-Qualität gekoppelt** (das Spiel schaltet bei Ruckeln selbst herunter):
  Stufe 0: alles. Stufe 1: höchstens ein Lichtstrahl, kein Pfützen-Glanz. Stufe 2: keine Lichtstrahlen, kein Glüh-Puls, keine Funkenstrahlen,
  weniger Schwebeteilchen. **Stufe 3 (niedrigste): nur die eingebackene Deko und kurze Lichtblitze.**
- Die Optik nutzt einen eigenen Zufall. Beute, Gegner und Gold fallen deshalb exakt gleich wie mit `?deko=0` (Check V35b).
- Ist der Tab versteckt, wird nichts gezeichnet (wie bisher).

## Messwerte vorher/nachher
Profil „Mittelklasse-Handy“: 412 × 915, DPR 2,6 (das Spiel deckelt auf 2), **CPU 4× gedrosselt** (CDP), je Szene 10–12 s,
v12 und v13 **im Wechsel im selben Browser**, gleicher Zufall in beiden, p50/p95 über alle Frames aller Durchgänge.
Szenen: *Moos* = Ebene 1, Kobold läuft hin und her · *Kampf* = Ebene 9, 8 Gegner, Schlag alle 0,65 s · *Boss* = Ebene 8, Kampf in der Arena.

**Software-Raster** (das Zeichnen läuft im gedrosselten Haupt-Thread, deshalb zählen hier auch die Pixelkosten, strengste Messung):

| Stufe | Szene | p50 v12 → v13 | p95 v12 → v13 |
|---|---|---|---|
| 3 (niedrigste) | Moos | 17,7 → 17,9 ms (+1 %) | 20,8 → 20,9 ms (+0,5 %) |
| 3 | Kampf | 23,6 → 22,7 ms (−4 %) | 33,9 → 35,5 ms (+5 %) |
| 3 | Boss | 33,4 → 33,5 ms (+0,3 %) | 51,4 → 42,2 ms (−18 %) |
| 0 (volle Auflösung) | Moos | 80,1 → 82,9 ms (+3,5 %) | 116,7 → 114,5 ms (−2 %) |
| 0 | Kampf | 94,1 → 95,6 ms (+1,6 %) | 105,4 → 112,8 ms (+7 %) |
| 0 | Boss | 101,4 → 104,7 ms (+3,3 %) | 130,5 → 110,6 ms (−15 %) |

**GPU-Raster** (wie Chrome am Handy; der Haupt-Thread zeichnet nur auf, deshalb sind die Zeiten klein):

| Stufe | Szene | p50 v12 → v13 | p95 v12 → v13 |
|---|---|---|---|
| 0 | Moos | 0,3 → 0,4 ms | 3,5 → 3,6 ms (+3 %) |
| 0 | Kampf | 2,6 → 2,9 ms | 6,1 → 6,3 ms (+3 %) |
| 0 | Boss | 3,0 → 3,4 ms | 6,5 → 6,4 ms (−1,5 %) |

**Kosten pro Frame in derselben Seite** (Effekte an/aus im Wechsel, Software-Raster, 4×, `tools/deko_ab.mjs`, Check V35e):
Stufe 0: Moos +0,9 %, Kampf −2,5 … +2,4 %, Boss −0,8 % (p50) · Stufe 3: Kampf +0,4 … +0,9 % (p50), +0,3 … +1,8 % (p95).

| Weitere Messung | v12 | v13 |
|---|---|---|
| Ladegröße (alles, was die Seite lädt, gzip) | 1 112 KB | 1 126 KB (**+14 KB**, erlaubt +1 MB) |
| Externe Requests | 0 | 0 |
| Sprite-Cache nach allen Welten | 175 | 194 (Wand-Deko nur der aktuellen Ebene) |

**Ehrlich zur Streuung:** Auf diesem Mac laufen parallel andere Jobs. Zwei *gleiche* v12-Stände gegeneinander gemessen streuen
p95 um −18 % bis +25 % (`perf_vorher_sw.json`), p50 um etwa ±5 %. Einzelne Läufe zeigten deshalb auch Ausreißer
(einmal Boss Stufe 0 p95 +63 %, in der Wiederholung −15 %; V35e einmal Stufe 0 p95 +20 %, die gepoolte Messung davor −13 %).
Verlässlich ist p50. Dort liegt v13 bei **0 bis +3,5 % auf Stufe 0** und **−4 bis +1 % auf Stufe 3**, also im Budget
(p95 ≤ +10 %, niedrigste Stufe gleich). Rohdaten: `tests/shots/deko/perf_*.json`.

## Bilder (selbst angesehen)
Oben vorher (v12), unten nachher (v13), je Menü, Stadt, Moos (Kampf), Kristall (Kampf), Zucker, Frost (Kampf), Glut, Boss, Boss besiegt, Sieg:
- Hochformat: [vergleich_hoch_1.jpg](tests/shots/deko/vergleich_hoch_1.jpg) · [vergleich_hoch_2.jpg](tests/shots/deko/vergleich_hoch_2.jpg)
- Querformat: [vergleich_quer_1.jpg](tests/shots/deko/vergleich_quer_1.jpg) · [vergleich_quer_2.jpg](tests/shots/deko/vergleich_quer_2.jpg)

Mein Eindruck: In voller Größe wirkt der Keller deutlich liebevoller. Am Boden liegt überall etwas, an den Wänden hängen Banner,
Ranken und Eiszapfen, die Lichtstrahlen geben Tiefe, und Lava und Kristalle leuchten. Am stärksten wirkt es in Glut, Frost und in der
Boss-Arena (Lichtstrahl über dem Boss). In der kleinen Collage ist der Unterschied ruhiger, als er am Handy wirkt. Das ist Absicht:
Die Deko ist gedämpfter als Kobold, Gegner und Warnkreise, damit das Spiel lesbar bleibt. Menü und Siegesbild sind fast gleich, weil
dort die Tafeln das Bild verdecken. Die Kristallwelt bleibt die dunkelste Welt. Ihr Grundlicht habe ich nicht angefasst,
sie wirkt nur durch die Glühsterne lebendiger.

## Tests
- `node tools/check.mjs --throttle=4 --v7=skip`: **64/64 PASS** (v12 hatte hier 60/64 wegen FPS-Messungen).
- `node tools/check.mjs --throttle=4 --v7=only`: **31/31 PASS**, darunter V26–V31 (Kostüme), V33 (Boss-Auftritt), V34 (Fels) und die neuen V35–V35d.
- Neu: `tools/checks_v13.mjs` (einzeln mit Kostenmessung V35e): **6/6 PASS**.
  V35 Deko an/aus · V35b gleiche Beute mit/ohne Deko · V35c „Bewegung reduzieren“ + versteckter Tab · V35d Speicher/Laden · V35e Kosten pro Frame.
- 0 Fehler im Browser, auch live (hoch + quer, HTTP 200, Menü „v13“).
- Werkzeuge: `tools/deko_shots.mjs` (Rundgang-Bilder), `tools/deko_collage.py` (Collagen), `tools/deko_perf.mjs` (vorher/nachher im Wechsel),
  `tools/deko_ab.mjs` (Effekte an/aus in einer Seite), `tools/deko_live.mjs` (Live-Prüfung). Debug: `KK.deko()`, `KK.deko(false)`.

## Worauf du am Handy achten kannst
1. Die PWA einmal ganz schließen und neu öffnen bzw. die Seite neu laden, dann kommt v13.
2. Gleiche Ebene einmal normal und einmal mit `?deko=0` ansehen: Boden, Wände, Fackelschein, Lichtstrahlen.
3. Wird das Handy wärmer oder ruckelt es? Falls ja, schaltet die Auto-Qualität herunter, und die teureren Effekte gehen von selbst aus.
   Sag Bescheid, wenn es trotzdem ruckelt.
4. Gefällt die Menge? Die Dichte der Boden-Deko (gut 30 % der Kacheln) und der Wand-Deko (jede sechste Wand) sind je eine Zahl in
   `src/deko.js` (`RATE`, `wallKind`) und lassen sich schnell ändern.
5. Boss-Auftritt (Ebene 2/4): Gefallen dir das Abdunkeln und das Heranrücken der Kamera beim Beben?
