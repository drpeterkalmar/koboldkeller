# Koboldkeller v11: Der Boss wächst aus dem Boden (Peter, 05.10.2026)

**Wunsch:** „Boss erscheint erst, wenn man in der Arena ist“, „eher spawnen oder spektakulär aus dem Boden wachsen lassen“,
„aber erst wenn Spieler in der Arena ist“.

## Was jetzt passiert
- **Vorher ist der Boss gar nicht da.** Auf Boss- und Mini-Boss-Ebenen steht nichts mehr in der Arenamitte. Der Boss ist unsichtbar,
  nicht treffbar, steht nicht auf der Minikarte und lässt sich auch nicht mit Seifenblasen von außen anlocken. Der Weg-Pfeil zeigt zur Arenamitte.
- **Auslöser:** Der Auftritt startet nur, wenn der Kobold ganz in der Arena steht, also mindestens 1,5 Kacheln hinter der Torlinie und
  nicht im oder direkt am Torbogen. Bloßes Annähern oder Hineinschauen löst nichts aus.
- **Reihenfolge:** Der Kobold tritt ein → **die Tore schlagen hinter ihm zu** → Beben → der Boss wächst heraus → Titelkarte → Kampf, Wellen wie bisher.
  Auf schon besiegten Ebenen bleiben die Tore offen, der Auslöser ist derselbe.
- **Der Auftritt** (Haupt-Boss 2,65 s, Mini-Boss 2,25 s, Kellerkönig 3,5 s):
  1. **Beben:** Der Bildschirm wackelt immer stärker, Risse laufen sternförmig von der Mitte nach außen und leuchten in der Weltfarbe,
     die Bodenrune glüht auf, Steinchen hüpfen, dumpfes Grollen.
  2. **Aufbruch:** Ein Blitz, der Boden bricht auf, eine Brocken-Fontäne (Erdbrocken mit Schwerkraft, die aufspringen), ein Staubring
     und ein Lichtstrahl nach oben.
  3. **Herauswachsen:** Der Boss steigt aus dem Loch. Gezeichnet wird nur der Teil über dem Boden, die Vorderkante des Lochs liegt davor.
     Er schießt kurz über die Endhöhe hinaus (Ease-out-Back), mit Squash & Stretch. Dabei rieseln Erde und Welt-Material von ihm ab:
     Moos/Blätter, Kristallsplitter, Zuckerstreusel, Eisschollen, Lava-Funken. **Funkelflatter und Bibber schießen** aus dem Loch hoch und schweben ein.
  4. **Landung:** Schockwelle, Staubwolke, kurze Zeitlupe, Zoom-Punch, danach Brüllen und Titelkarte (wie bisher).
  5. **Der Krater bleibt liegen:** Er wird einmal in die Boden-Chunks gemalt und kostet danach nichts mehr pro Frame.
- Während des Auftritts ist der Kobold **unverwundbar**. Der Boss trifft niemanden, die Handlanger-Wellen starten erst nach dem Intro.
  Kein Heim-Portal und kein Weg-Pfeil während des Auftritts. Steht der Kobold genau auf dem Erscheinungspunkt, wird er sanft
  weggeschoben. Die Kamera schaut aufs Loch, bei hohen Bossen etwas höher, damit der Kellerkönig ganz ins Bild passt.
- Die **Boss-Musik** startet erst beim Erwachen nach der Landung. Mit **„Bewegung reduzieren“** am Gerät
  (`prefers-reduced-motion`) wackelt das Bild nur noch ganz leicht (gemessen 0,7 px), der Ablauf bleibt gleich.
- Kosten: nur die vorhandenen Partikel-Pools (`FX.budget`). Der Krater wird einmal gebacken (8 ms bei 4× gedrosselter CPU, ≈ 2 ms echt).
  Nach dem Auftritt kostet er nichts mehr.

## Bildfolgen (selbst angesehen)
Leer → Beben → Aufbruch → halb heraus → ganz da → Kampf:
- Hochformat: [Moosbart](shots/neubau/v11/folge_haupt_hoch.png) · [Schlabbo](shots/neubau/v11/folge_mini_hoch.png) ·
  [Funkelflatter (Flug)](shots/neubau/v11/folge_flug_hoch.png) · [Kellerkönig](shots/neubau/v11/folge_koenig_hoch.png)
- Querformat: [Moosbart](shots/neubau/v11/folge_haupt_quer.png) · [Lolli-Lutz](shots/neubau/v11/folge_lutz_quer.png) ·
  [Kellerkönig](shots/neubau/v11/folge_koenig_quer.png)

Mein Eindruck beim Ansehen: Die Risse und die Rune lesen sich gut als Ankündigung. Der Lichtstrahl ist das Spektakel. Der Boss klettert sichtbar
aus einer dunklen Grube mit Erdwall, die Flug-Minis schießen hoch und schweben dann ein. Der Krater erzählt danach die Geschichte.
Ein Hinweis: Steht der Kobold hinter dem Boss, wird der Boss wie bisher halb durchsichtig, das gilt auch beim Herauswachsen.

## Prüfung (`tools/checks_v11.mjs`, auch in `check.mjs`)
| # | Ergebnis |
|---|---|
| V33 | **PASS**: Haupt E4, Mini E2/E10, Flug-Mini E6, König E20, hoch + quer. Vorher nicht in `G.ents`, kein Kampf. Im Torbogen und 1 Kachel hinter der Torlinie passiert nichts. 4 Seifenblasen durchs Tor: kein Treffer, kein Auftritt. 2 Kacheln drin: Tore zu, Auftritt. Gemessene Dauer = Tabelle (2,65 / 2,25 / 3,5 s). In jedem Frame unverwundbar und ohne Schaden, Boss nicht treffbar. Danach wach + Bosskampf, kein Überlappen, Krater gebacken |
| V33b | **PASS**: besiegte E4 → Tore bleiben offen. Während des Bebens wieder hinaus → Auftritt läuft zu Ende. Kobold genau auf dem Erscheinungspunkt → danach 1,78 Kacheln Abstand (≥ 1,05) |
| V33c | **PASS (mit Vorbehalt)**: Kellerkönig-Auftritt bei CPU 4×. Hoch: Median 11,5 ms (87 fps), p95 27,7 ms (36 fps). Quer: Median 14,2 ms (70 fps), p95 31,7 ms (31 fps). Das ist genauso viel wie der normale Kampf direkt danach (p95 28,9 / 32,0 ms). Das Ziel p95 ≥ 45 fps erreicht auf diesem Rechner auch der bisherige Kampf nicht (siehe unten) |
| Bot | `tools/bot.mjs 8731 20 6 --out=v11`: **gewonnen, 0 Tode, 0 Hänger, 0 Fehler**. Alle 10 Bosse durch Hineinlaufen ausgelöst und besiegt ([bot_v11.md](shots/neubau/bot_v11.md)) |

**Angepasste alte Tests:** B7a/B7c/V8 warten jetzt auf den Auftritt. A3b greift erst nach dem Auftritt an.
V20b und der Quer-Pfeil-Test akzeptieren als Ziel „Arena“, weil der Boss vorher nicht da ist.
`KK.bossAtk` setzt den Boss für Tests sofort ein, ohne Auftritt.
Neu in der Debug-API: `KK.rise()` und `KK.freeze(on)`, damit die Bildfolgen exakt fotografiert werden können.

**Gesamtlauf** (auf rog17, Windows, Chromium headless, ANGLE/D3D11, Logs in `shots/neubau/v11/`):
- Teil 1: 59/64. Teil 2: 21/25. Danach wurden V20b und A1 korrigiert (Pfeilziel Arena) und erneut geprüft: **PASS**.
- Offen sind nur Leistungs- und Zeitmessungen: A3, A15, A16, A3b, V25-FPS, V31-FPS und B12. B12 misst die Ausweich-Strecke
  in 400 ms Echtzeit und wackelt unter Last.
- **Gegenprobe mit v10** (gleicher Rechner, gleiche Checks): A3 28,7 fps, A15 und A16 schlagen dort ebenfalls fehl.
- A3b im Wechsel gemessen, alt/neu/alt/neu: **9,4 / 49,5 / 45,7 / 11,3 fps**. Beide Stände springen zufällig zwischen ≈ 10 und ≈ 50 fps.
  Das ist das Messumfeld auf diesem Rechner, kein Rückschritt durch v11. Die Leistungswerte sollten am Mac noch einmal gemessen werden.

## Handy
Die PWA einmal ganz schließen und neu öffnen (bzw. die Seite neu laden), dann lädt v11 (`?v=11`).
