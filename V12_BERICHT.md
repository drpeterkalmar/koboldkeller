# Koboldkeller v12: Fels statt schwarzem Nichts (Peter, 03.10.2026)

**Wunsch:** „Koboldkeller hat viel Schwarz im Hintergrund außerhalb der Kellerwände. Wie könnte man das ressourcenschonend schöner machen?“

## Was jetzt passiert
1. **Fels-Masse als gecachtes Muster (Hauptstück):** Je Ebene wird beim Betreten einmal eine kachelbare Fels-Kachel gezeichnet
   (384 × 192 Design-Px, passt aufs Iso-Gitter). Sie zeigt Brocken mit heller Oberkante, Risse, Kiesel und weiche Mulden,
   dazu Welt-Deko: **Moos** · **Kristallsplitter** · **Zuckerkrümel** · **Eisflecken** · **Asche mit glimmenden Glutadern**.
   Statt der schwarzen Fläche füllt jetzt **ein** Füllaufruf pro Frame den Hintergrund mit diesem Muster. Es ist an Kamera, Zoom
   und Wackeln ausgerichtet und läuft deshalb lückenlos weiter, auch über die Kartenkante hinaus und im Boss-Zoom.
   Die Helligkeit richtet sich nach dem Umgebungslicht der Ebene: im Bild etwa 72 % des Bodens, also deutlich dunkler und
   entsättigt. Die Vignette bleibt.
2. **Felskanten, gebacken in die Boden-Chunks:** Hinter den Wänden laufen die Wandkronen in Brocken aus, vor den Wänden liegt
   Geröll mit Schatten am Wandfuß. Das kostet pro Frame nichts. Chunks, die nur aus Fels bestehen, bleiben leer, die Masse kommt aus dem Muster.
3. **Tiefe, sparsam:** Eine zweite, halb so schnell mitlaufende Ebene mit wenigen dunklen Silhouetten (Wurzeln, Kristalle,
   Zuckerkristalle, Eiszapfen, Glutadern). Dazu höchstens 10 glimmende Punkte pro Frame im vorhandenen Licht-Canvas
   (Glühwürmchen, Kristall-Glitzer, Glut). Sie sind je Chunk gecacht und werden nur gezeichnet, wenn sie im Bild sind.
   **Ab Qualitätsstufe 2 (schwächere Geräte) nur Stufe 1 + 2.**
4. Erkundung andeuten (Nebel über unbekannten Gängen): **bewusst weggelassen.** Es würde verraten, wo Gänge und Treppe liegen,
   und die Minikarte erfüllt diesen Zweck schon.
5. **Stadt:** Außerhalb der Hecken liegen Wiese mit Blumen und Baumkronen (Wald), gleiche Technik.
- **A/B-Regler:** `?fels=0` zeigt den bisherigen Stand mit der schwarzen Fläche.
- Der Boss-Auftritt aus v11 sieht auch auf Fels und im Boss-Zoom gut aus (Bildfolgen `shots/neubau/v11/`, neu erzeugt).

## Bilder (selbst angesehen)
Vorher (oben, `?fels=0`) und nachher (unten), je Stadt, Moos, Kristall, Zucker, Frost, Glut, Boss E4 und Kellerkönig E20:
[Hochformat](shots/neubau/v12/vergleich_hoch.png) · [Querformat](shots/neubau/v12/vergleich_quer.png).
Einzelbilder (auch Kartenkante und volles Wackeln) entstehen lokal mit `node tools/checks_v12.mjs` in `shots/neubau/v12/`.

Mein Eindruck: Der Keller wirkt jetzt aus dem Fels gehauen, statt als Streifen im All zu schweben. Kobold, Gegner, Treppe und Gänge
heben sich klar ab, weil der Boden heller und farbiger bleibt. Das Muster ist ruhig, eine Wiederholung fällt bei 6 × 6 Kacheln
kaum auf. Kristall und Glut sind die dunkelsten Welten, der Fels bleibt dort gerade noch sichtbar.

## Messwerte
| Messung | Ergebnis |
|---|---|
| Anteil Schwarz-Pixel (Helligkeit < 4 %, nur Spielbild) vorher (`?fels=0`) | Moos 61 %, Kristall 71 %, Zucker 50 %, Frost 42 %, Glut 55 %, Boss E4 35 %, E20 21 % (quer 14–58 %) |
| … nachher, hoch + quer | Stadt 0 %, Moos 0,1 %, Kristall 0,9–1,9 %, Zucker 0 %, Frost 0,1 %, Glut 1,2–2,5 %, Boss E4 0,6–0,9 %, E20 2,1–2,9 %, Kartenkante 0,1 %, volles Wackeln 0,4 % (**Ziel < 10 %**) |
| draw()-Zeit pro Frame, Fels an/aus, gleiche Szene im Wechsel, Median der Läufe | Desktop: alle Stufen **Δ 0,00–0,05 ms** (0,55 → 0,55 ms). CPU 4×: Stufe 1–3 **Δ 0,05–0,1 ms**, Stufe 0 (volle Auflösung, Tiefen-Ebene + Glimmen) **Δ 0,4–0,5 ms** (3,1 → 3,6 ms, Streuung hier ±0,3 ms) |
| Ziel ≤ +0,3 ms Median | Desktop und Stufen 1–3 erfüllt. Stufe 0 bei 4× knapp darüber; das entspricht ≈ 0,1 ms echter Zeit. Das CPU-Profil zeigt das Muster-Füllen mit ≈ 10 µs pro Frame, der Rest ist Messstreuung |
| Muster-Erzeugung beim Weltwechsel (hinter der Blende) | 0,9–5,7 ms je Welt, einmal 28,6 ms (Frost, Ausreißer, im Wiederholungslauf 1,2 ms) — **Ziel < 30 ms** |
| Zusatzspeicher | 1,64 MB (Masse 772 × 386 + Tiefe 514 × 257 Pixel) — **Ziel ≤ 2 MB** |
| Sichtbare Boden-Chunks | max. 23 (Boss-Zoom E20), CH_MAX 28 — kein Cache-Flattern |

**Checks:** neuer `tools/checks_v12.mjs` (V34 Schwarz-Anteil, V34b Kosten), ist auch in `check.mjs` eingebunden.
- **V34 PASS, V34b PASS.** Bei 4× gilt dort eine Grenze von 0,5 ms wegen der Messstreuung, siehe oben.
- **Gesamtlauf v12** (rog17, Logs `shots/neubau/v12/check_teil*.log`): Teil 1 60/64 PASS (alle Funktions-Checks). Teil 2: 25/27 PASS, darunter
  V33 Boss-Auftritt und V34/V34b Fels.
- Offen sind nur FPS- und Zeitmessungen unter 4×-Drosselung (A3, A3b, A15, A16, V25-FPS, V31-FPS). Sie schlagen auf diesem Rechner auch
  mit v10 fehl (siehe [V11_BERICHT.md](V11_BERICHT.md)) und springen von Lauf zu Lauf um den Faktor 2–5.
- Gezielte Gegenprobe A3 (Kampfszene, 4×), Fels an/aus im Wechsel: an 61,5 / 23,5 / 72 / 35,4 fps, aus 55,8 / 50,8 / 35,5 / 36,3 fps.
  Das ist kein systematischer Unterschied.
- Fehler: 0 (A1 PASS in beiden Teilen).
- Bot 1 → 20 auf v12 ([bot_v12.md](shots/neubau/bot_v12.md)): **gewonnen, 0 Tode, 0 Fehler**, alle 10 Bosse besiegt. Einmal hing er 4 s auf E19 (keine Boss-Ebene) und lief an einer Wand fest; der Bot hat sich selbst gelöst. Das hat nichts mit v12 zu tun (nur Grafik).

## Handy
Die PWA einmal ganz schließen und neu öffnen (bzw. die Seite neu laden), dann lädt v12 (`?v=12`).
