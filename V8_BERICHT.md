# Koboldkeller 2 · v8 — Spielgefühl: schneller laufen, stärkere Bosse, Ebenen-Wahl, Wandfallen (Bericht)

Stand: 29.09.2026 · Startmenü zeigt „v8" · Cache-Buster `?v=8`, `KK_VER = 8` · Spielstand-Datei unverändert `v:3` (keine neuen Felder)

## Änderungen
**1 · Schneller laufen („krachen die Finger")**
- Grundtempo 3,6 → **4,7 Kacheln/s (+31 %)** (`PLAYER.speed`, Talent 👟 wirkt weiter obendrauf). Gegnertempo unverändert.
- Lauf-Animation skaliert mit: Schrittfrequenz 11,8 → 14,3 rad/s, Schrittweite fast gleich (1,92 → 2,06) → keine rutschenden Füße.
  Staubwölkchen im Schritt-Takt. Kamera: Nachführung wächst mit dem Tempo, der Blick liegt vorn (0,88 statt 0,53 Kacheln voraus).
- **Halten reißt nicht mehr ab:** Wer den Finger liegen lässt, läuft weiter, solange er liegt (der Zielpunkt unter dem Finger wandert mit der
  Kamera mit). Vorher blieb der Kobold nach ~3 Kacheln stehen und man musste neu tippen. Loslassen stoppt sofort.
- Auf einem Weg bremst der Kobold nur noch am Ziel, nicht an jeder Ecke. Ein Tipp auf eine ferne sichtbare Stelle führt den ganzen Weg.
- Tipp auf die (offene) Treppe oder das 🏠-Portal zählt sofort — auch wenn man beim Entsiegeln schon draufstand (vorher: erst herunter
  und wieder drauf; der Bot blieb daran einmal hängen).
- Wand bleibt dicht: Bewegung in Teilschritten ≤ 0,2 Kacheln (auch bei Ruckler-Frames, Ausweichsprung, Rückstoß).
- Keine Auto-Lauf-Funktion.

**2 · Bosse etwas mehr Leben** — `BOSS_HP_MUL = 1,3` einheitlich für alle 5 Mini-Bosse, 4 Hauptbosse und den Kellerkönig
(Moosbart Level 10: 380 → 494 ❤️, Kellerkönig 1800 → 2340). Phasen bleiben bei 66/33 % (Mini-Bosse 50 %).
Befund: Die Typ-Werte `boss/mini/king` in `ENEMIES` wirken nicht (werden von `initBoss` überschrieben) — im Code vermerkt.
Handlanger: Der Deckel (3–9 gleichzeitig) hält auch in langen Kämpfen; gesamt 4–12 je Kampf → kein Ausufern, keine weitere Drosselung nötig.

**3 · Jede geschaffte Ebene einzeln anwählbar** (Peters Idee)
- Vom Brunnen führt **je Welt ein eigener bunter Weg** zu einem **Welttor**: 🌿 Moos (links) · 💎 Kristall · 🍭 Zucker (unten) · ❄️ Frost ·
  🔥 Glut (rechts). Jedes Tor: zwei Pfosten, Wimpel-Girlande, Welt-Schild, darüber „Moosgrotte · 1–4". Dahinter ein kleiner Platz mit
  **4 Portalen, eins je Ebene**.
- Beschriftung über jedem Portal: 🌀 Ebene, **👑** Boss-Ebene, **⚡** Mini-Boss-Ebene, **🔒** noch nicht erreicht. Am Tor zeigt ein Schild
  „Ebene 10 · ⚡ Mini-Boss — Der Bonbonbach" für das nächste Portal (fest oben am Bildschirm, verdeckt keine Nummern).
- Freigeschaltet ist alles bis zur tiefsten erreichten Ebene (`deepest`, kein neues Spielstand-Feld). Gesperrt: Hinweis mit Ebenen-Namen.
- Kurze Wege: Brunnen → weitestes Portal 11,7 Kacheln = **2,5 s**, Eingang → weitestes 4,2 s (Ziel ≤ 6 s). Stadt 34×36 → 38×36.
- Kein Versehen: Portale ≥ 2,1 Kacheln auseinander; ein Portal startet sofort, wenn man es **antippt**; wer nur darüberläuft, löst
  nichts aus — erst nach kurzem Stehenbleiben (0,45 s, für Joystick-Spieler).
- Unverändert: Weg-Pfeil (zeigt zum Portal der tiefsten Ebene), Tutorial-Schritt „Portal" (Oma: „Folge dem grünen Weg …"), Ehrenhall
  (Start-Ebene als `from`), Heim-Portal, Spielstand. Minikarte zeigt in der Stadt alle Portale.

**4 · Wandfallen (neu)**
- Freundliche Steingesichter in geraden Wänden (Welt-Farben), ab Ebene 3: 1 · 1 · 2 · 2 · 2 · 2 · 3 … 5 · 5 · 5 · 4 je Ebene
  (MEGASCHWER +1). Sie holen **0,9 s** Luft (Gesicht bläht sich auf, Maul glüht, Licht, Ton räumlich, **Bodenlinie** der Flugbahn in
  Weltfarbe mit gestricheltem Rand — der Rand bleibt auch hinter Wänden sichtbar) und pusten dann **ein** Geschoss quer durch den Gang bis
  zur nächsten Wand: 🌿 Moos-Sporen · 💎 Kristallsplitter · 🍭 Bonbonkugeln · ❄️ Schneebälle · 🔥 Glutkugeln.
- Schaden wie die Pieks-Platten (`max(1, Ebenen-Schaden − 1)`), 💨 Ausweichen macht unverwundbar. Takt 4,8 ± 0,9 s, versetzt, nur wenn
  der Kobold in der Nähe ist.
- Fair: nie im Eingangsraum (≥ 6 Kacheln Abstand), nie in/an Boss-Arenen, nie über Treppe/Heim-Portal, zwei Bahnen immer ≥ 4 Kacheln
  auseinander (nie derselbe Gang doppelt), keine Bahn direkt hinter einer vorderen Wand (sonst verdeckt).
- Haptik nach v7-Regeln: nur der Treffer vibriert („hurt"), das Schießen nicht. Oma-Tipp erklärt die Steingesichter.

## Messwerte vorher (v7) / nachher (v8)
| Messung | vorher | nachher |
|---|---|---|
| Tempo gerade Strecke (V22) | 3,60 Kacheln/s | **4,70** (×1,306) |
| Finger 2,5 s still halten (echtes Touch) | 3,05 Kacheln, dann Stillstand | **11,6 Kacheln, läuft weiter** |
| Ein Tipp 5 Kacheln weit | 1,37 s | 1,06 s |
| 400 Sprünge/Stöße gegen Wände bei 0,05 s-Frames | – | 0 Frames in der Wand |
| Stadt → Portal Ebene 1 zu Fuß (Bot) | 6,6 s / 7 Tipps | 6,0 s / 6 Tipps |

**Bot Normal** (`tools/bot.mjs 8731 20 6`, je 2 Läufe gemittelt; vorher = v7-Code mit demselben Bot; `shots/neubau/bot_v8_vorher*.md`,
`bot_v8.md`, `bot_v8_2.md`). Der Bot tippt wie ein Kind nur auf Stellen, die er sieht; „Lauf s" = Sekunden, in denen der Kobold läuft
(Näherung für Finger-Halten), Tipps = Lauf-Tipps + Tipps auf Gegner.

| Ebene | Zeit s | Lauf s | Lauf-Tipps | Gegner-Tipps |
|---|---|---|---|---|
| 1 | 19 → 16 | 11 → 8 | 15,0 → 16,5 | 5,0 → 4,5 |
| 2 ⚡ | 33 → 33 | 20 → 14 | 10,0 → 8,0 | 6,5 → 5,5 |
| 3 | 19 → 17 | 11 → 8 | 15,5 → 13,5 | 4,0 → 4,5 |
| 4 👑 | 52 → 59 | 26 → 23 | 17,5 → 16,0 | 11,0 → 16,5 |
| 5 | 21 → 18 | 12 → 10 | 15,0 → 14,0 | 5,0 → 5,0 |
| 6 ⚡ | 51 → 55 | 29 → 25 | 21,0 → 15,5 | 15,0 → 19,0 |
| 7 | 16 → 15 | 9 → 7 | 12,0 → 11,5 | 3,5 → 4,5 |
| 8 👑 | 56 → 58 | 23 → 24 | 12,5 → 11,5 | 17,0 → 18,0 |
| 9 | 24 → 20 | 14 → 11 | 13,5 → 10,0 | 8,0 → 6,5 |
| 10 ⚡ | 61 → 61 | 35 → 29 | 24,5 → 19,0 | 18,0 → 22,0 |
| 11 | 30 → 29 | 17 → 15 | 13,0 → 14,0 | 12,0 → 13,5 |
| 12 👑 | 68 → 72 | 33 → 30 | 23,5 → 23,0 | 16,0 → 21,5 |
| 13 | 30 → 29 | 15 → 12 | 15,5 → 13,5 | 12,5 → 13,5 |
| 14 ⚡ | 57 → 58 | 33 → 27 | 24,0 → 22,5 | 18,5 → 20,0 |
| 15 | 26 → 26 | 13 → 12 | 12,5 → 11,5 | 10,5 → 13,5 |
| 16 👑 | 47 → 53 | 24 → 20 | 11,0 → 11,0 | 9,0 → 7,5 |
| 17 | 38 → 35 | 22 → 19 | 17,5 → 18,0 | 11,0 → 10,5 |
| 18 ⚡ | 72 → 72 | 41 → 36 | 25,0 → 24,5 | 18,0 → 21,0 |
| 19 | 37 → 32 | 26 → 22 | 16,0 → 16,5 | 8,5 → 8,5 |
| 20 👑 | 66 → 69 | 33 → 28 | 13,0 → 13,5 | 14,5 → 13,0 |
| **Σ** | **822 → 827** | **448 → 380 (−15 %)** | **327,5 → 303,5 (−7 %)** | 223,5 → 248,5 |

- Ebenen ohne Boss: 260 → 238 s (−8 %). Die Gesamtzeit bleibt gleich, weil die Bosskämpfe (gewollt) länger dauern.
- Lauf-Sekunden −15 % statt −23 %: Der Bot reagiert nur alle 0,6 s Spielzeit (Tempo 6) und steht dazwischen kurz — die reine Laufzeit
  je Strecke sinkt um 23 % (V22). Lauf-Tipps sinken nur leicht, weil ein Tipp so weit reicht, wie man sieht; die große Entlastung ist das
  Halten (V22: ein Finger statt Dauer-Tippen).
- **Tode 0 → 0, Hänger 0 → 0** (4 Läufe), Wandfallen-Treffer 0 bzw. 1 je Durchlauf. Erlittener Schaden gesamt 343 → 429
  (Ebenen ohne Boss 81 → 127, Bosse siehe unten).

| Boss (Bot-Level) | ❤️ | Kampfdauer s | Änderung | Schaden |
|---|---|---|---|---|
| E2 Schlabbo | ≈114 → 148 | 15,1 → 18,1 | +20 % | 2 → 3 |
| E4 Moosbart | ≈320 → 416 | 25,8 → 37,4 | +45 % | 3 → 7 |
| E6 Funkelflatter | ≈288 → 374 | 18,4 → 26,6 | +45 % | 6 → 10 |
| E8 Glitzerzahn | ≈624 → 811 | 31,4 → 38,7 | +23 % | 10 → 29 |
| E10 Lolli-Lutz | ≈484 → 629 | 15,4 → 24,2 | +57 % | 4 → 6 |
| E12 Zuckerschnute | ≈940 → 1222 | 28,1 → 39,6 | +41 % | 10 → 8 |
| E14 Bibber | ≈691 → 898 | 17,6 → 22,4 | +27 % | 6 → 9 |
| E16 Frostnase | ≈1286 → 1672 | 25,3 → 36,8 | +45 % | 12 → 25 |
| E18 Glutpanzer Gustav | ≈955 → 1242 | 22,0 → 25,7 | +17 % | 30 → 30 |
| E20 Kellerkönig | ≈1980 → 2574 | 36,8 → 44,0 | +19 % | 78 → 78 |
| **Σ** | | **235,9 → 313,3** | **+33 %** (Ziel 25–40 %) | |

## Entscheidungen
- **Boss-Faktor 1,3 statt 1,35:** Drei Bot-Läufe mit 1,35 ergaben +29/+45/+47 % (Mittel +40 %, oberer Rand). Peter wünschte „etwas mehr",
  also die Mitte des Richtwerts; 1,3 ergibt +33 % und 0 Tode. **Gegnerwerte unverändert:** Durch das Tempo werden Kämpfe nicht leichter —
  im Gegenteil, der Kobold läuft schneller in Gruppen hinein (Schaden in Ebenen ohne Boss 81 → 127, weiter 0 Tode).
- **Stern statt Reihe:** Fünf Wege im Fächer rund um den Brunnen (unterer Bildschirmrand), damit jede Welt ihren eigenen Weg hat und alle
  Tore gleich nah sind (≤ 2,5 s). Im Hochformat liegen Moos (links) und Glut (rechts) quer zum Bildschirm — dorthin braucht man ein paar
  Tipps mehr oder hält den Finger (reicht jetzt durch).
- **Kein Versehen:** Antippen = sofort (klare Absicht), Darüberlaufen = nichts, Stehenbleiben 0,45 s = hinein (für Joystick).
- **Wandfallen nur auf sichtbaren Rückwänden:** Die Gesichter sitzen auf Nord-/Westwänden (die man sieht) und schießen in den Raum hinein;
  Bahnen, die hinter einer vorderen Wand verschwinden würden, werden nicht gewählt.
- **Eigener Warnton** `wallWarn` (vor-gerendert wie alle Effekte, räumlich), Schuss nutzt den vorhandenen `shoot`/`fire`-Klang.

## Tests
| Test | Ergebnis |
|---|---|
| `check.mjs --throttle=4 --v7=skip` | **64/64 PASS** · A2 361 fps · A3 (4×) 271 fps · A3b größter Bosskampf 235 fps · 0 Fehler |
| `check.mjs --throttle=4 --v7=only --ref=8732` (V18–V25) | **14/14 PASS**, 0 Fehler, 0 fremde Requests |
| V22–V25 | siehe [CHECKS.md](CHECKS.md) — Werte oben; V25: 200 Ebenen (5 Seeds × Normal/MEGA) ohne Regelverstoß, Vorwarnung 0,90 s, Treffer −2 = Pieks, mit 💨 0, Haptik nur „hurt", FPS 4× mit allen Fallen 297 |
| Bot Normal `--out=v8` | **durchgespielt, 0 Tode, 0 Hänger**, Level 16 am Ende |
| Live-URL headless nach Deploy (Pages ~75 s) | Menü „v8", `KK_VER = 8`, Boot 1,1 s, Stadt 20 Portale (6 offen bei tiefster Ebene 6), Ebene 3 mit Wandfalle, AudioContext „running", **0 Fehler, 0 fremde Requests** |

Screenshots (`shots/neubau/v8/`, selbst angesehen, hoch + quer): Stadt-Übersicht, alle 5 Welttore mit Portal-Schild, Pfeil zum tiefsten
Portal, gesperrtes Portal mit Hinweis, Wandfalle je Welt (Vorwarnung + Schuss). Gefunden und behoben: Bahn hinter vorderen Wänden
verdeckt (Regel + Rand über Wänden), Steingesicht im Zuckerkeller rosa auf rosa (eigene Steinfarbe je Welt), Namensschild verdeckte
Nachbar-Nummern (jetzt feste Stelle), Laternen/Bäume standen zu dicht an den Toren.

## Handy-Hinweise für Peter
- App einmal ganz schließen und neu öffnen (dann steht „v8" im Startmenü).
- In der Stadt: den bunten Wegen folgen; am Tor das Portal der gewünschten Ebene **antippen**. 👑 = Boss, ⚡ = Mini-Boss.
- Laufen: Finger einfach liegen lassen — der Kobold läuft, bis man loslässt.
