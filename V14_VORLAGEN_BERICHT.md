# Koboldkeller v14 – Mechaniken nach Vorlagen (13.10.2026, Abnahme 17.10.2026)

Stand: Version 14 (Cache-Buster `?v=14.8`), live auf https://drpeterkalmar.github.io/koboldkeller/ ·
Datenblatt im Repo: [VORLAGEN.md](VORLAGEN.md) · Regeln ohne Grafik: `src/vorlage.js` · alle Werte: `VORLAGE` / `GEHEIM` in `src/config.js`

## In einfachen Worten

- **Es fällt, was gerade fehlt.** Hat der Kobold ganz wenig Herzen, lassen Gegner doppelt so oft ein ❤️ fallen, und ab und zu
  schwebt ein **Glühwürmchen-Heiler** heran (+50 % ❤️). Fehlen Seifenblasen, kommt Blasen-Nachschub, fehlen Tränke, ein Trank.
  Was schon voll ist (5 Tränke, volles Herz), fällt nicht mehr — dafür eine Münze.
- **Kein Pech mehr bei Waffen.** Wer zwei Ebenen lang kein ⚔️/🪄/💎 bekommen hat, findet sicher eins in der nächsten Truhe.
- **Level-Aufstiege kommen bis zum Schluss.** Früher blieb man ab Ebene 14 lange auf demselben Level (zuletzt fast drei Ebenen auf
  Level 15). Jetzt gibt es auf jeder Ebene etwa ein Level, am Ende ist man Level 20 statt 16. Wer tiefer geht, als sein Level ist,
  holt mit Extra-Erfahrung auf.
- **Kämpfe haben mehr Takt.** Holt ein Gegner zum Angriff aus (Warnung) und man trifft ihn genau dann, **zuckt** er zusammen 💫
  und der Angriff fällt aus. Fällt ein Wichtel, ein Schleim oder eine Fledermaus, laufen die gleichen kurz weg — „😳 Huch!“.
  Seifenblasen fliegen jetzt zu dem Gegner, zu dem man läuft (nicht mehr zum nächsten hinter einem).
- **Der Keller hat Abkürzungen** zwischen Räumen, die vorher nur über lange Umwege verbunden waren, und die **Truhen stehen lieber
  abseits** vom Weg zur Treppe — Erkunden lohnt sich.
- **📖 Sammelalbum im Rucksack:** jede Gegnerart als Silhouette, nach dem ersten Sieg mit Bild, nach 10 Siegen erzählt Oma etwas
  Lustiges, nach 30 gibt es einen goldenen Rahmen. Das Album gehört dem Gerät (wie die Kostüme).
- **✨ Glänzende Waffen:** Manche neue Waffe kann etwas Besonderes (schneller laufen, Sachen weiter anziehen, eine Blase mehr,
  Funken sprühen).
- **Geheimräume:** Ab Ebene 5 hat manchmal eine Wand einen goldenen Riss und glitzert. Zweimal mit ⚔️ draufhauen — dahinter steht
  eine Schatztruhe.
- Oma Pilzhut erklärt jede Neuheit in einem Satz (ihre Tipps beginnen jetzt mit den Neuheiten). Alte Spielstände bleiben erhalten.

## Etappen (je ein Release, je ein Commit, gepusht und live geprüft)

| Etappe | Version | Commit | Was | Regler (0/alt = v13) |
|---|---|---|---|---|
| E0 | – | `98c82f4` | `VORLAGEN.md`, Bot misst Level-Zeitstempel, Vorher-Lauf v13.8 | – |
| E1 | 14.1 | `25561a4` | Bedarfs-Beute (Wunsch-Platz, Glühwürmchen-Heiler, Herz × 2, nichts Nutzloses) + Upgrade-Zähler mit Truhen-Garantie | `?bedarf=0`, `?beutetakt=0` |
| E2 | 14.2 | `9f8808d` | XP-Kurve als Polynom, Aufhol-Bonus, Spielstand-Migration Datei v3 → v4 | `?xpkurve=alt`, `?aufhol=0` |
| E3 | 14.3 | `e5834b6` | Zucken im Warnmoment, Schreck-Flucht „Huch!“, Ziel-Kegel für Blasen | `?zucken=0`, `?schreck=0`, `?kegel=0` |
| E4 | 14.4 | `7a8691c` | Abkürzungs-Schleifen nach Wegersparnis, Truhen abseits; Back-Worker wartet auf alle sichtbaren Boden-Stücke | `?schleifen=0`, `?truhen=zufall` |
| E5 | 14.5 | `7b6ed49` | Gegner-Sammelalbum im 🎒 | `?album=0` |
| E5b | 14.6 | `f3aad8e` | Glanz-Eigenschaften (Zeile 14, im Datenblatt „Phase 2“) | `?glanz=0` |
| E5c | 14.7 | `b172293` | Geheimräume hinter der Wackelwand (Zeile 13, im Datenblatt „Phase 2“) | `?geheim=0` |
| E6 | 14.8 | (dieser Commit) | Abnahme: Feinabstimmung nach Bot-Messung (s. u.), Bericht, README | – |

Alle Regler zusammen = Spielregeln wie v13:
`?bedarf=0&beutetakt=0&xpkurve=alt&aufhol=0&zucken=0&schreck=0&kegel=0&schleifen=0&truhen=zufall&album=0&glanz=0&geheim=0`.
Die Karten sind damit Kachel für Kachel gleich wie in v13 (V43: 20/20 Ebenen gegen den v13.8-Server verglichen).

Bewusst **weggelassen** (Datenblatt „weglassen“): Sammel-Ruf (macht Gegner stärker, Räume hektischer), Magie-Chance nach
Gegner-Level, Gold-Plan, Wirbel-Aufladen. **Bestätigt, unverändert:** Treffer-Schutz 1,0 s und Rückstoß ≈ 0,2 s / 0,6 Kacheln
(entsprechen den Vorlagen).

## Messtabelle „Vorlage-Ziel / vorher / nachher“

Vorher = v13.8 (Commit `480dc12`, eigener Server aus einem Worktree), nachher = v14.8. Bot = `tools/bot.mjs` (Kind mit etwas
Übung: tippt nur Sichtbares, läuft zur Treppe, öffnet Truhen nur, wenn sie am Weg liegen), Tempo ×6, Ebene 1 → 20.

| # | Messgröße | Vorlage-Ziel | vorher (v13.8) | nachher (v14.8) | |
|---|---|---|---|---|---|
| 1 | Kills je Level, gleich starke Normalgegner (Datenblatt-Näherung „Gegner-XP ≈ 4 + 2·Lv“) | Lv 10: 9–13 · Lv 15: 13–18 · Lv 20: 17–24 | 16,3 · 63,0 · 262,8 | **10,0 · 14,4 · 18,9** | ✅ |
| 1b | dto. mit den echten Gegner-Pools der Ebene (inkl. Elite-Anteil) | – | 11,5 · 39,0 · 137,7 | 10,9 · 14,0 · 15,1 | |
| 2 | Level bei Ankunft je Ebene (Bot) | ≥ +0,7 Level je Ebene, kein Stillstand > 2 Ebenen, Ende 20–23 | 1 3 4 5 7 7 9 9 10 11 12 12 13 13 14 14 **15 15 15** 16, Ende **16** | 1 2 3 4 6 6 8 9 10 10 11 12 13 14 15 16 17 17 19 19, Ende **20** (+0,95 je Ebene, längster Gleichstand 2 Ebenen) | ✅ |
| 3 | Abstand zwischen zwei Level-Ups (Bot, Median) | 30–70 s über das ganze Spiel | Lv 2–10: 30 s · Lv 11–15: **78 s** · Lv 16+: **129 s** (längster 129 s) | Lv 2–10: 34 s · Lv 11–15: 37 s · Lv 16+: 61 s (längster 73 s) | ✅ |
| 4 | Heil-Beute je Kill bei ❤️ ≤ 25 % | ≥ 25 % | 9,9 % | **26,6 %** (Node, 10 000 Kills; Browser 24,2–24,4 % bei 2000) — davon 6 % Glühwürmchen-Heiler | ✅ |
| 5 | Nutzlose Drops (Trank bei 5/5, Herz bei vollem ❤️, Pilz bei voller Leiste) | ≤ 2 % | 31,8 % (❤️ voll) · 78,5 % (alles voll) | **0 %** (Kills, Truhen, Töpfe) | ✅ |
| 6 | Upgrades aus Beute (Gegner + Truhen + Bosse) je Ebene / längste Lücke (200 Seeds × 20 Ebenen) | 1,0–1,5 / ≤ 2 Ebenen | 2,47 / 2 Ebenen | 2,51 / **1 Ebene** (Truhen-Garantie 68× ausgelöst) | ⚠️ s. u. |
| 7 | Schaden je Durchgang (Bot, normal, Σ 20 Ebenen) | −10 bis −25 %, Tode weiter 0 | 481 · 435 (Mittel 458), 0 Tode | 356 (14.3) · 323 (14.4) · 367 · 416 (14.8), Mittel 366 = **−20 %**, 0 Tode | ✅ |
| 8 | Ausholen-Abbruch-Quote (getroffene, überlebende Ausholer) | 30–50 % | 0 % | 32 % · 43 % · 44 % · **35 %** (vier Bot-Läufe) | ✅ |
| 9 | Schleifen | jede Ebene ≥ 1 Schleife mit ≥ 20 Kacheln Ersparnis, Weg Eingang → Treppe ± 15 % | 2 Zufalls-Gänge | 95,7 % der Ebenen mit Schleife ≥ 20 (Rückfall ≥ 10: 99,8 %), Ersparnis Median 28 Kacheln; Weg im Mittel **+4 %**, Median ±0 | ✅ (s. u.) |
| 10 | Truhen abseits / erreichbar | ≥ 60 % / 100 % | 54,2 % / 100 % | **86,1 %** / 100 % (Ebenen mit ≥ 1 Truhe abseits: 99,9 %) | ✅ |
| 11 | Blasen treffen das „gemeinte“ Ziel (vorn, hinten einer näher) | ≥ 90 % | 0 % | **100 %** (Node 2000 Würfe mit ± 48° Daumen-Streuung; Browser 24/24) | ✅ |
| 12 | Leistung (Mess-Gate, p95 je Stufe) | ≤ +5 % + 0,5 ms | 79,9 · 58,5 · 40,5 · 29,7 ms (Stufe 0–3) | 79,6 · 59,3 · 39,8 · 29,8 ms (−0,3 · +1,4 · −1,7 · +0,6 %), Ausreißer per Gegenprobe als Rauschen bestätigt | ✅ |
| 13 | Spielstand-Migration | alter Stand Lv 15 lädt mit Lv 15, `xp < xpNext`, Talente gleich | Datei v3 | Datei v4: Lv 15, 1234/2143 (57,6 %) → 282/490 (57,6 %), Talente/Gold/Hüte/Bosse/Look gleich (Node + „💾 Weiterspielen“ im Browser) | ✅ |

**Zu 6:** Das Datenblatt ist hier in sich widersprüchlich („Zufalls-Upgrade je Kill 7 → 5 %, *damit die Summe gleich bleibt*“ vs. Ziel
1,0–1,5 je Ebene). Umgesetzt ist „Summe bleibt gleich, Lücken verschwinden“. Mit dem Startwert 5 % kam der Bot (läuft zur Treppe,
öffnet seit E4 weniger Truhen, weil sie jetzt abseits stehen) in einem Lauf mit ⚔️ 15 statt 19–20 zum Kellerkönig und brauchte
9 Versuche (8 Tode). Darum bleibt die Kill-Chance bei den v13-üblichen **7 %**; der Upgrade-Zähler kommt obendrauf (+0,04 je Ebene).

**Zu 9:** Der Weg Eingang → Treppe ist im Mittel nur 4 % länger als in v13 (Median gleich); je Ebene liegen 59 % im Band ±15 %,
weil schon die v13-Zufallsgänge den Hauptweg mal stark abkürzten, mal gar nicht. Die neuen Schleifen dürfen den Hauptweg nicht
unter 75 % des Baum-Wegs drücken (sonst wäre die Treppe zu nah).

### Bot-Läufe im Einzelnen (Ebene 1 → 20, normal)

| Stand | Ende Level | Tode | Σ Schaden | Spielzeit s | Level-Abstand Median (gesamt · 2–10 · 11–15 · 16+ · längster) | Abbruch-Quote | Fluchten |
|---|---|---|---|---|---|---|---|
| v13.8 (Lauf A) | 16 | 0 | 481 | 899 | – | – | – |
| v13.8 (Lauf B) | 16 | 0 | 435 | 806 | 37,5 · 30,2 · 77,6 · 128,7 · 128,7 | – | – |
| 14.2 (XP) | 20 | 0 | 424 | 869 | 44,5 · 28,1 · 34,6 · 62,0 · 84,6 | – | – |
| 14.3 (Kampf) | 20 | 0 | 356 | 869 | 46,8 · 27,2 · 37,9 · 69,7 · 83,8 | 32 % | 25 |
| 14.4 (Dungeon) | 19 | 0 | 323 | 821 | 40,5 · 28,8 · 41,5 · 66,6 · 81,6 | 43 % | 35 |
| 14.7 (vor Feinabstimmung) | 21 | **8** (alle am Kellerkönig, ⚔️ 15) | 1289 | 1434 | 45,5 · 36,5 · 44 · 80,3 · 276 | 33 % | 20 |
| 14.8, c = 2 | 19 | 0 | 367 | 902 | 41,5 · 37,5 · 40,1 · 67,8 · 78,9 | 44 % | 17 |
| **14.8 (Endstand, c = 1,8)** | **20** | **0** | **416** | **828** | **38,5 · 34,0 · 36,6 · 61,2 · 72,9** | **35 %** | **20** |

**MEGASCHWER** (10× Schaden, je 560 s Echtzeit): v13.8 erreicht Ebene 12 mit 101 Toden, v14.8 Ebene 11 mit 90 Toden — für den Bot
weiterhin nicht zu schaffen, gleiche Größenordnung (Dateien `shots/neubau/bot_v14vorher_mega.*`, `bot_v14mega.*`).

### Feinabstimmung nach Messung (E6)

| Wert | Datenblatt-Startwert | jetzt | Grund (Messung) |
|---|---|---|---|
| XP-Kurve c | 2 („unsicher“) | **1,8** | Bot endete mit c = 2 auf Level 19–20, Abstände ab Lv 16 ≈ 68 s; mit 1,8: Level 20, 61 s |
| Zufalls-Upgrade je Kill | 5 % | **7 %** (wie v13) | Truhen stehen jetzt abseits → wer zur Treppe läuft, bekam zu wenig Waffen (s. o.) |
| Gegner-Schaden-Zuschlag je 10 Spieler-Level | (unverändert +1 je 10 Lv) | **höchstens +1** mit Aufhol-Bonus | Mit der neuen Kurve erreicht man Level 20 schon auf Ebene 19/20; ein Level-Aufstieg soll den Endkampf nicht härter machen |
| Hauptweg-Schutz der Schleifen | – | ≥ 75 % des Baum-Wegs | mit 85 %: nur 87 % der Ebenen mit Schleife und Weg +15 %; mit 75 %: 96 % und Weg +4 % |
| Schleifen-Rückfall | – | ≥ 10 Kacheln, wenn die Raumlage keine 20 hergibt (Höhlen-Wert der Vorlage) | 4,3 % der Ebenen hätten sonst keine Schleife |
| Abbruch-Schwelle Zucken | 25 % / Elite 40 % | unverändert | Quote 32–44 % liegt im Ziel |

### Leistung (Mess-Gate)

`tools/perf_gate.mjs --ziele=vorher@8732,nachher@8731 --tag=v14 --secs=8` (Software-Raster, CPU ×4, DPR 2, hoch + quer,
Stufen 0–3, Szenen Stadt/Kampf/Boss/Ebenenwechsel). Rohdaten: `tests/perf/perf_v14.{json,md}`.

p95 „Hauptthread-Zeit je Bild“, Mittel über 8 Messpunkte je Stufe (Stadt/Kampf/Boss/Ebenenwechsel × hoch/quer), 17.10.2026:

| Stufe | vorher (v13.8) | nachher (v14.8) | Änderung (Mittel / Median der Punkte) |
|---|---|---|---|
| 0 | 79,9 ms | 79,6 ms | −0,3 % / −1,5 % |
| 1 | 58,5 ms | 59,3 ms | +1,4 % / −0,2 % |
| 2 | 40,5 ms | 39,8 ms | −1,7 % / −1,8 % |
| 3 | 29,7 ms | 29,8 ms | +0,6 % / +1,0 % |

Im ersten vollen Lauf lagen 3 von 32 Punkten über der Toleranz (5 % + 0,5 ms): hoch q0 Ebenenwechsel 69,7 → 78,6, hoch q1 Stadt
58,3 → 68,8, quer q3 Kampf 29,3 → 31,3 ms. **Gegenprobe mit 4 statt 2 Wiederholungen** (`tests/perf/perf_v14_nach1…3.md`):
hoch q0 Ebenenwechsel 76,7 → 69,1 (besser), hoch q1 Stadt 58,3 → 58,1 (gleich), quer q3 Kampf 32,1 → 31,2 (besser). Dafür
schwankte dort hoch q0 Stadt (1. Lauf 81,1 → 79,6; Gegenproben 83,6 → 96 mit Ausreißern bis 174 ms und 79,4 → 84,0 bei p50
+1,6 %); dieselbe Szene quer: 80,1 → 79,5. In der Stadt rechnet v14 pro Bild nichts Neues (neue Zeichen-Fälle gibt es nur für
Glühwürmchen und Wackelwände im Keller) — gewertet als Messrauschen des Mac mini unter Last (Hermes-Dienste laufen mit).
**Gate: bestanden** nach Gegenprobe. Ladegröße bis spielbereit 1032 → 1049 KB gzip (+17 KB, neue Regeln in `vorlage.js`,
Album, Geheimräume); das Datenblatt-Gate verlangt nur Bildzeit, „kleiner als vorher“ stammt aus dem Technik-Auftrag. Fehler im
Browser: 0.

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `node --test tests/node/*.test.mjs` (Takt, Automatik, Endbild, Bündel, Back-Worker, Rauchtest, **Spielstand v3 → v4**, **Vorlagen-Regeln**, **Dungeon 200 Seeds × 20 Ebenen**) | **72/72** (17.10.) |
| `check.mjs --v7=skip` (Teil 1: Flow hoch + quer, FPS, Saves, V1–V17, A/B/C) | **64/64**, 0 Browser-Fehler (13.10., Stand 14.8) |
| `check.mjs --v7=only` (Teil 2: V18–V35 inkl. `checks_v13.mjs`) | 27/31 im Gesamtlauf; die 4 Ausfälle waren Prüf-Annahmen, die v14 bewusst ändert, Skripte angepasst und einzeln neu geprüft → **31/31** (s. u.) |
| `checks_v14.mjs` V40–V46 (Beute, XP/Spielstand, Kampf-Takt, Dungeon gegen v13-Server, Album, Glanz, Geheimraum) | **7/7**, 0 Browser-Fehler |
| Mess-Gate `perf_gate.mjs` (s. o.) | bestanden nach Gegenprobe |
| Bot 1 → 20 normal + MEGASCHWER | 0 Tode normal, Level 20 (s. o.) |

Angepasste Prüfungen in Teil 2 (17.10. einzeln wiederholt, alle PASS):
- **V20** Weg-Pfeil (`checks_v7.mjs`): Prüfung unverändert, nur die Teilbedingungen stehen jetzt in der Ausgabe; im Gesamtlauf
  einmal FAIL (Winkel 17,5° < 20°, Bedingung unklar), einzeln 2× PASS (max. 2,7°).
- **V22** „Finger halten = weiterlaufen“ (`checks_v8.mjs`): die Teststrecke lag durch die neuen Abkürzungen auf einer Ebene
  neben der Treppe — dort rastet ein Tipp auf die Treppe ein. Strecke meidet jetzt Treppe/Heim-Portal (11,7 Kacheln in 2,5 s).
- **V25** Wandfallen / 💨-Schutz: Ausweichen jetzt seitlich aus der Schussbahn statt in Kartenrichtung (vorher hing es an der
  Kartenlage, ob die Kugel einen nach dem Schutz noch einholt); mit 💨 −0 ❤️.
- **V28** Kostüm-Migration echter v3-Spielstände: Felder `v`, `xp`, `xpNext` ändern sich mit Datei v4 bewusst (Level bleibt;
  eigener Test in `save.test.mjs`).

## Handy-Testhinweise (für Peter / die Kinder)

1. **Weiterspielen** mit dem alten Spielstand: Level, Talente, Hüte und Ebene müssen gleich sein; der gelbe Balken unter ⭐ steht
   etwa gleich weit wie vorher (er wird auf die neue Kurve umgerechnet).
2. Auf einer Ebene absichtlich **wenig ❤️** behalten und Gegner besiegen: Es fallen spürbar öfter Herzen, manchmal schwebt ein
   gelb leuchtendes **Glühwürmchen** mit Herz-Bauch heran.
3. Einen Gegner treffen, **während er ausholt** (er wackelt und leuchtet vorher): kleine 💫 über dem Kopf, sein Angriff fällt aus.
4. In einer Gruppe Wichtel/Schleime/Fledermäuse einen besiegen: die anderen laufen mit „😳 Huch!“ kurz weg.
5. Mit dem Joystick auf einen Gegner zulaufen und 🫧 drücken, während ein anderer hinter dem Kobold steht: Die Blasen fliegen nach vorn.
6. **🎒 Rucksack → 📖 Sammelalbum** (ganz unten): Bilder antippen; hoch und quer prüfen (vier Spalten, Namen lesbar).
7. Ab Ebene 5 nach einer **Wand mit goldenem Riss** suchen (Hinweis-Toast, wenn man nah ist): zweimal ⚔️ → Geheimraum mit Truhe.
8. Oma in der Stadt mehrmals besuchen: Die ersten Tipps erklären die Neuheiten.
9. Wenn etwas komisch wirkt: dieselbe Stelle mit dem passenden Regler vergleichen, z. B. `…/koboldkeller/?zucken=0`.

## Recht (Clean-Room)

Gearbeitet wurde nur mit dem Datenblatt (Mechaniken, Verhältnisse, Größenordnungen in eigenen Worten). Keine Vorbild-Quelle wurde
geöffnet; kein Code, keine Tabelle, kein Bezeichner, keine Grafik und kein Ton wurde übernommen. In Spiel, Oma-Texten, Commits,
README und Berichten stehen keine Namen von Vorbild-Spielen, -Figuren, -Gegenständen oder Firmen — die Vorlagen heißen nur
„Vorlage A–E“ (Art der Vorlage in `VORLAGEN.md`). Eigene Begriffe: Glühwürmchen-Heiler, Wunsch-Platz, Upgrade-Zähler, Aufhol-Bonus,
Zucken, „Huch!“, Ziel-Kegel, Abkürzungs-Schleife, Sammelalbum, Glanz, Wackelwand. Kinderschutz: nur positive Eigenschaften, keine
Flüche oder Strafen (XP-Abzug für zu leichte Ebenen höchstens auf 60 %), Flucht als niedliches Erschrecken, Geheimräume nie leer
und immer angedeutet, kein Grusel, kein Blut.

## Bilder

`shots/neubau/v14/`: `v40_heiler_1…4` (Glühwürmchen-Heiler schwebt heran und heilt), `v40_beute_neu` (Heiler, Blasen-Nachschub,
Herz), `v41_weiterspielen_lv15` (alter Spielstand), `v42_huch_1…3` (Schreck-Flucht), `v43_karte_ebene7` (Karte: Hauptweg gelb,
Abkürzungen türkis, Truhen gold), `v44_album_hoch/quer`, `v45_glanz_rucksack`, `v46_wackelwand(_nah)`, `v46_wackel_1_schlag`,
`v46_geheim_offen`, `v46_schatztruhe`. Bot-Protokolle: `shots/neubau/bot_v14*.{md,json}`.

## Grenzen / offen

- Der Bot öffnet Truhen nur zufällig am Weg und haut nie auf Wackelwände — für erkundende Kinder gibt es mehr Upgrades als im Bot.
- Messgröße 6 (Ziel 1,0–1,5 Upgrades je Ebene) ist bewusst nicht erreicht (Begründung oben); die Lücken-Garantie (≤ 2 Ebenen) schon.
- Die Abbruch-Quote hängt stark von der Tiefe ab: auf frühen Ebenen bricht fast jeder Treffer ab, ab Ebene 15 meist nur Krits
  und Spezial — im Mittel 35 %.
- MEGASCHWER wurde nicht neu abgestimmt (Bot schafft ihn wie vorher nicht).
