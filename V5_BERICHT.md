# Koboldkeller 2 · v5 — Boss-Runde (Bericht)

Stand: 27.09.2026 · Startmenü zeigt „v5" · Cache-Buster `?v=5`, `KK_VER = 5` · Spielstand-Datei `v:3`

## 1 · Bug: „beim 1. Boss ins Levelende gefallen"
**Ursache (bestätigt):** Auf Boss-Ebenen lag die Treppe in der Ecke der (damals kleinen, 12×12) Arena. `game.js` löste die Treppe
immer aus, sobald man < 0,6 Kacheln entfernt war — ohne zu prüfen, ob der Boss noch lebt. Beim Ausweichen, Hinterherlaufen oder
durch den Rückstoß der Boss-Schockwelle landete man leicht darauf → nächste Ebene, Moosbart unbesiegt. Dasselbe galt für das
20. Portal (Sieg ohne Kellerkönig). Der Siegestext „Die Treppe ist frei …" war also nie richtig.

**Fix:**
- Auf **jeder** Boss-Ebene (Haupt- und Mini-Bosse) ist die Treppe bzw. das 20. Portal **versiegelt**, solange der Boss lebt: nicht
  auslösbar, kein Einrasten beim Antippen, statt Treppe eine Steinplatte mit Schloss-Rune und Bändern in Weltfarbe (Label „🔒 versiegelt",
  nur in der Nähe), kein Treppenlicht, nicht auf der Minikarte. Wer draufsteht, bekommt den Hinweis „🔒 Versiegelt! Besiege zuerst …".
- **Nach dem Sieg** zerbricht das Siegel sichtbar (Ring, Sterne, Lichtblitz, Klang, Kamera schwenkt kurz hin, „⬇️ Die Treppe ist offen!").
  Erst dann greift der Übergang; wer beim Sieg zufällig daraufsteht, muss einmal herunter und wieder drauf (kein Versehen).
- **Zustand im Spielstand:** `bossDone` (besiegte Boss-Ebenen). Wiedereinstieg/Weiterspielen/Respawn: besiegt → Treppe offen und
  Arena-Tore bleiben offen (Boss ist wieder da, Kampf freiwillig); unbesiegt → versiegelt.
- **Platzierung:** Die Treppe liegt in der hintersten Arena-Ecke (weit weg von Eingängen und der Kampfmitte, wo der Boss schläft);
  Begründung: dort kämpft man am wenigsten, und durch das Siegel ist ein Versehen ohnehin ausgeschlossen. Keine Säule direkt daneben.
- **Weitere Wege geprüft:** Heimportal ist im Bosskampf aus (und liegt ≥ 13 Kacheln von jeder Arena weg); Rückstoß/Dodge können keine
  Wand durchtunneln (max. 0,73 Kacheln pro Frame bei ≥ 1,6 nötig); Dodge auf/über die versiegelte Treppe löst nichts aus — alles in V11 abgedeckt.

## 2 · Mini-Bosse auf Ebene 2, 6, 10, 14, 18 (jede 2. Ebene hat jetzt einen Boss)
| Ebene | Mini-Boss | Welt | Angriff 1 (Phase 1) | Angriff 2 (ab Phase 2 häufig) | ❤️ (Grund + je Level) | Schaden |
|---|---|---|---|---|---|---|
| 2 | **Schlabbo**, der Riesen-Moosschleim | Moosgrotte | Glibber-Spucke: Klumpen fliegen sichtbar in Warnkreise | Bauchplatscher: großer Sprung, Warnkreis r 2,2 | 90 + 8 | 1 |
| 6 | **Funkelflatter**, die Kristall-Fledermaus | Kristallhöhle | Kristall-Echo: Kreise laufen in einer Reihe auf dich zu | Schallring: Ringe mit Loch breiten sich aus (ganz nah oder weit weg = sicher) | 200 + 11 | 2 |
| 10 | **Lolli-Lutz**, der Zuckerpilz-Riese | Zuckerkeller | Streusel-Regen: Hüpfkästchen, zwei Wellen im Wechsel | Brause-Puff: Kreis um ihn, dann langsame Bonbons rundherum | 330 + 14 | 3 |
| 14 | **Bibber**, das Schneegespenst | Frostkeller | Frost-Atem: kurzer Fächer aus Eis-Streifen | Buh-Blinzeln: verschwindet, taucht am markierten Kreis hinter dir auf | 470 + 17 | 4 |
| 18 | **Glutpanzer Gustav**, der Lava-Käfer | Glutkeller | Lava-Kleckse: Warnkreise, danach 1,6 s Glut-Pfütze | Hornstoß: angekündigte Bahn, ab Phase 2 zweimal | 640 + 21 | 5 |

- Eigene prozedurale Wesen in `art.js` (Galerie: `shots/neubau/v5/mini_galerie.png`), deutlich kleiner als die Hauptboss-Kobolde
  (Höhe 125–201 statt ≥ 307 Design-Einheiten). 2 Phasen (ab 50 % „wild": mehr Warnungen, schneller). Alles ≥ 0,8 s angekündigt,
  Phasenwechsel räumen alle Warnungen ab. MEGASCHWER gilt auch hier (2× Tempo, 10× Schaden, Warnzeit × 0,75).
- Stärke zwischen Elite und Hauptboss: Leben ≈ 35–50 % des nächsten Hauptbosses, Schaden = Hauptboss der Welt − 1 (Tabellen `MINIS`
  und `DIFF.boss` in `config.js`).
- Kleinere Titelkarte „⚡ MINI-BOSS ⚡" in Türkis/Blau, schmalere lila Boss-Leiste mit einer Phasen-Marke (50 %), „Phase 1 / 2".
- Musik: Boss-Material der Welt abgewandelt (−8 BPM, Melodie auf dem Welt-Instrument, weniger Blech/Pauke, leichteres Schlagzeug),
  −18 … −19,5 LUFS, True-Peak ≤ −4,1 dBTP, < 80 Hz ≤ −35,9 dB.
- Sieg: Zeitlupe, 2 Konfetti-Wellen, 8 Münzen Regen + 8 Münzen, 🍄, ❤️, 50 % 🧪, 50 % Waffen-/Zauber-Upgrade, 🫧 +8 (Hauptboss: 16 + 18 Münzen,
  🧪, 2 🍄, Upgrade, Hut, 🫧 +12).
- Ebenen-Banner: „Ebene 2 · Moosgrotte · ⚡ Mini-Boss Schlabbo lauert!" bzw. „… · 👑 Moosbart wartet in der Arena!".

## 3 · Große Arenen + Handlanger
| Ebene | Boss | Arena | Säulen | Wellen-Takt s (Ph 1 → 2 → 3) | Handlanger je Welle | max. gleichzeitig | Handlanger-Typen |
|---|---|---|---|---|---|---|---|
| 2 | Schlabbo | 14×14 | 4 | 9 → 7 | 1 → 2 | 3 | Schleim, Fledermaus |
| 4 | Moosbart | 16×16 | 4 | 8 → 6,5 → 5 | 2 → 2 → 3 | 5 | Schleim, Wichtel, Fledermaus |
| 6 | Funkelflatter | 17×17 | 4 | 8,5 → 6,5 | 1 → 2 | 4 | Fledermaus, Irrlicht |
| 8 | Glitzerzahn | 18×18 | 8 | 7,5 → 6 → 5 | 2 → 3 → 3 | 6 | Irrlicht, Kristallkäfer, Fledermaus |
| 10 | Lolli-Lutz | 19×19 | 8 | 8 → 6 | 2 → 2 | 4 | Pilzling, Schleim |
| 12 | Zuckerschnute | 20×20 | 8 | 7 → 5,5 → 4,5 | 2 → 3 → 4 | 7 | Pilzling, Schleim, Wichtel |
| 14 | Bibber | 21×21 | 8 | 7,5 → 6 | 2 → 3 | 5 | Gespenstchen, Fledermaus |
| 16 | Frostnase | 22×22 | 8 | 6,5 → 5 → 4 | 3 → 3 → 4 | 8 | Gespenstchen, Kristallkäfer, Fledermaus |
| 18 | Gustav | 23×23 | 8 | 7 → 5,5 | 2 → 3 | 5 | Flämmchen, Wichtel |
| 20 | Kellerkönig | 24×24 | 8 | 6 → 5 → 4 | 3 → 4 → 4 | 9 | Flämmchen, Gespenstchen, Wichtel |

- v4: 12×12 für alle. Die Karte wächst mit der Arena (bis 61×61), die übrigen Räume behalten Platz. Tabelle `ARENA` in `config.js`.
- **Gestaltung je Welt:** Säulen als Deckung (Wurzelstumpf mit Moos + Pilzen · Kristall-Prismen · Zuckerstangen mit Gummidrops ·
  Eissäulen mit Zapfen · Lava-Obelisken mit Glutrissen; durchsichtig, wenn der Kobold dahinter steht), Boden-Mosaik (Ring,
  Mittel-Emblem, lila Spawn-Runen), mehr Fackeln, Säulen- und Mittellicht in Weltfarbe.
- **Tore:** Sobald Kobold und Boss in der Arena sind und der Kobold ≥ 1,7 Kacheln vom Eingang weg ist, wachsen Ranken /
  Kristall-Gitter / Zuckerstangen / Eiszapfen / Lava-Steine aus dem Boden (Ton + Staub; Hinweis erst nach der Titelkarte). Nach dem Sieg
  versinken sie mit Glitzer. Bereits besiegte Bosse: Tore bleiben offen.
- **Kamera:** im Bosskampf zoomt sie weich heraus (hoch 0,8 · quer 0,84) und blickt bis 2,8 Kacheln in Richtung Boss — Boss und
  Warnungen bleiben im Bild, kein schwarzer Rand (Screenshots jeder Arena hoch + quer). Sichtbare Boden-Chunks max. 23 (< Cache 28).
- **Handlanger:** laufend in Wellen ab 3 s nach dem Intro (nicht erst ab Phase 2), an Rand-Punkten, nie direkt neben dem Kobold;
  0,8 s vorher lila/weltfarbener Spawn-Kreis mit Rauch und Licht. Phasenwechsel bringen sofort eine Welle, Hauptbosse können
  zusätzlich „rufen". Leben × 0,75, Beute klein (🫧 +1, XP × ⅓, 40 % eine Münze, 5 % Herz) → kein Farmen. Performance-Deckel 9.
- **Sieg:** alle Handlanger (auch die im Spawn-Kreis) verpuffen mit Glitzer, alle feindlichen Geschosse/Warnungen und alle
  Boss-Timer (`later(…, "boss")`) werden abgebrochen, keine neue Welle mehr. Zeitlupe, Titelkarte, Kamera-Kick, Phasen bleiben.

## Spielstand-Migration
Datei `v:3`. v4-Stände (`v:2`) laden unverändert (keine erneuten Geschenke); `bossDone` = alle Boss-Ebenen unterhalb der tiefsten
erreichten Ebene (+ 20, falls schon gewonnen) — die Kinder waren dort schon vorbei, nichts wird nachträglich gesperrt. v3- und
v20-Stände laufen über die bestehende Kette. Beleg V17: v4-Stand (Lv 9, 777 🪙, 3 Punkte, Talente, Spezial 0,67, 18 🫧, Diadem,
Zöpfe + Brille, Ebene 6, tiefste 9) → alles gleich, `bossDone` 2,4,6,8, Ebene 6/8 offen, Ebene 10 versiegelt, Datei v3.

## Tests (Belege)
| Test | Ergebnis |
|---|---|
| `node tools/check.mjs --port=8731 --throttle=4` | **64/64 PASS** (v4: 57; neu V11–V17, A3b erweitert) |
| V11 Bug-Regression E4/E2/E8/E20 | Draufstellen, Dodge drauf, Dodge drüber, Rückstoß: kein Wechsel/Sieg; Sieg → offen nach 1,3 s → Betreten = Ebene +1 bzw. Sieg |
| V13 Mini-Bosse | 5 verschiedene Namen/Wesen/Angriffe, nur auf 2/6/10/14/18, keiner auf ungeraden Ebenen, alle 10 Angriffe mit Warnungen, Musik `boss/3` |
| V14/V16 Arenen | 14 → 24 streng steigend, Tore zu sobald drin, Zoom 0,8 / 0,84, Chunks ≤ 23 |
| V15 Handlanger | in 10,6 s Spielzeit E12: max 4/7, erzwungen 7/7; E2: max 1/3, erzwungen 3/3; Spawn-Kreis gesehen; Handlanger-Beute 🫧 +1, XP × 0,29–0,31; nach Sieg 0 + 0 Spawns + 0 Timer, **10,5 s Spielzeit später weiter 0**, Tore offen |
| A3 Kampf 12 Gegner, 4× Throttle | 209,6 fps (p5 120,5) |
| A3b größter Bosskampf (König, Arena 24, Wut-Phase, **9 Handlanger**, alle Effekte), 4× Throttle | 209,7 fps (p5 131,6), Zoom 0,8, Chunks 21 |
| Leck-Test `bot.mjs 8731 20 4 --secs=120 --audio` | PASS: 4970 Stimmen gestartet, max. 40 → 47, offen == aktiv |
| `audiorender.mjs --only=boss` | Mini-Boss −18,0 / −19,5 / −18,1 / −18,6 / −18,1 LUFS (Welt 1–5), TP ≤ −4,1 dBTP |

## Schwierigkeitskurve (Autoplay-Bot Normal, `node tools/bot.mjs 8731 20 6`) — durchgespielt, 0 Tode, 0 Fehler
| Boss-Ebene | Boss | Art | Kampfdauer s | Schaden | max. Handlanger |
|---|---|---|---|---|---|
| 2 | Schlabbo | Mini | 7,3 | 2 | 2 |
| 4 | Moosbart | Haupt | 16,7 | 4 | 5 |
| 6 | Funkelflatter | Mini | 16,5 | 6 | 2 |
| 8 | Glitzerzahn | Haupt | 23,5 | 6 | 6 |
| 10 | Lolli-Lutz | Mini | 11,0 | 3 | 4 |
| 12 | Zuckerschnute | Haupt | 21,5 | 4 | 7 |
| 14 | Bibber | Mini | 13,8 | 4 | 5 |
| 16 | Frostnase | Haupt | 18,9 | 15 | 8 |
| 18 | Glutpanzer Gustav | Mini | 18,5 | 28 | 5 |
| 20 | Kellerkönig | Haupt | 22,2 | 35 | 9 |

Ebenen-Zeiten 13–57 s, Level 16 am Ende, 4 Tränke. Der Bot ist geübt (hält ⚔️, bemerkt ~70 % der Warnungen); Kinder brauchen
erfahrungsgemäß ein Mehrfaches. Volle Tabelle: `shots/neubau/bot_normal.md`. MEGASCHWER wurde in v5 nicht erneut per Bot gemessen.

## Visuelle Selbstprüfung (`shots/neubau/v5/`)
Jede Arena hoch + quer, jeder Mini-Boss mit beiden Angriffen, Titelkarten Mini/Haupt, Tore zu (Moos/Zucker/Frost), Treppe versiegelt →
öffnet → offen (E2/E14) und 20. Portal, Handlanger-Spawn-Kreise, Migration. Gefunden und behoben: Flügel der Kristall-Fledermaus lagen
hinter dem Körper, Käferbeine unter dem Panzer, Säulen verdeckten den Kobold (jetzt durchsichtig), „Tore sind zu"-Hinweis überlagerte
die Boss-Titelkarte (jetzt danach), Mini-Boss-Musik in Kristall/Frost 3–5 dB zu leise (angeglichen), verspätete Sieges-Karte konnte
nach schnellem Weiterspielen erneut aufgehen (abgesichert).

## Offene Punkte
- Nur per Messung/Bot geprüft, **nicht mit echten Kinderhänden**: Mini-Boss-Stärke für 7-Jährige (Schlabbo sollte leicht sein),
  Gustavs Glut-Pfützen (höchster Mini-Schaden), Lesbarkeit der etwas kleineren Figuren im herausgezoomten Bosskampf am kleinen Handy.
- Das 20. Portal ist jetzt kein „Abkürzungs-Sieg" mehr: es öffnet sich erst nach dem ersten Sieg über den Kellerkönig (gewünscht).
- Besiegte Bosse erscheinen beim Wiederkommen erneut (freiwilliger Kampf, Tore bleiben offen, Hut nur einmal).
- Wo ein Gang direkt an der Arena entlangläuft (z. B. Ebene 20), steht beim Schließen eine ganze Zaunreihe statt eines schmalen Tors.
- Headless-FPS schwanken; echter Beleg am Mittelklasse-Handy steht weiter aus. MEGASCHWER-Kurve nicht neu vermessen.

## Was die Kinder am Handy ausprobieren sollen
1. **Ebene 2 — Schlabbo:** Arena betreten → Tore wachsen zu, Titelkarte „⚡ MINI-BOSS". Grüne Klumpen fliegen in rote Kreise — rausgehen!
   Lila Kreise am Rand = gleich kommt ein Handlanger.
2. **Treppe testen:** Während der Boss lebt, auf die versiegelte Platte in der Ecke laufen → nichts passiert, nur „🔒 Versiegelt". Nach
   dem Sieg: alle Handlanger verpuffen, das Siegel zerbricht mit Glitzer — erst dann geht's runter.
3. **Ebene 4 — Moosbart:** große Arena mit Baumstümpfen als Deckung; hinter einem Stumpf verstecken, wenn Ranken kommen.
4. **Ebene 6 — Funkelflatter:** Schallringe — ganz nah an die Fledermaus oder weit weg!
5. **Weiterspielen:** Nach einem Boss-Sieg die App schließen, „💾 Weiterspielen" → die Treppe dieser Ebene bleibt offen.
6. **Musik:** Klingt der Mini-Boss wie eine sanftere Version des großen Bosses?
