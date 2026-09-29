# Koboldkeller 2 · v7 — Würfel-Look, Vibration, Weg-Pfeil (Bericht)

Stand: 29.09.2026 · Startmenü zeigt „v7" · Cache-Buster `?v=7`, `KK_VER = 7` · Spielstand-Datei unverändert `v:3`

## 1 · 🎲 Würfel = Name + Aussehen
- Ein Tipp auf 🎲 bei „Wähle deinen Kobold" würfelt **Name und kompletten Look** (Tier, Fell, Frisur, Haarfarbe, Augen, Outfit,
  Ohren-Variante, Extra). Die Vorschau hüpft, dreht sich zweimal und funkelt, dazu ein Klick + Pling. Das Namensfeld bleibt editierbar.
- **Regeln statt Zufall** — Harmonie-Tabelle `LOOK_RULES` in `src/config.js`, geprüft von `lookHarmony()`:
  Fell passend zur Tierart (z. B. Bär braun/creme/grau, Drache türkis/grün/lila), Haar passend zur Art oder mit 30 % bewusst bunt,
  Kontrast Fell↔Outfit ≥ 130 und Haar↔Outfit ≥ 60 (Farbabstand „redmean"), Fell↔Haar ≥ 90, auf dunklem Fell nur helle Augen
  (Türkis, Beere, Bernstein), Extra in 50 % der Würfe. Der letzte Look wiederholt sich nie direkt. `?seed=N` macht die Folge reproduzierbar.
- Am 🪞 Spiegel/Friseur zusätzlich **„🎲 Zufallslook"** (nur Aussehen, der Name bleibt).
- **Namen:** 177 in der Liste (die 30 bisherigen + 147 neue: Tiere, Naschzeug, Natur, Glitzer, z. B. „Kichererbse", „Pfötchen",
  „Sternenstaub") + Baukasten Vorsilbe × Nachsilbe (z. B. „Knuddel" + „keks") mit 359 weiteren = **536 Namen**, alle ≤ 12 Zeichen.
  Keine neuen Menschen-Vornamen. Kleine Korrektur: „Wichtel-Willy" hatte 13 Zeichen und wurde im Feld abgeschnitten → „Wichtelwilly".

## 2 · Vibration — Befund und Fix
**Ursache iPhone (Primärquelle geprüft):** Safari hat kein `navigator.vibrate`. Das Spiel nutzte seit v2 den Trick, einen unsichtbaren
`<input type=checkbox switch>` per `label.click()` umzuschalten. Apple hat das mit **iOS 26.5** abgestellt: Programmatische Klicks geben
keine Haptik mehr, nur die echte Berührung eines Switches. Beleg: README-Änderung der Bibliothek ios-haptics
([Commit f5272ef9](https://github.com/tijnjh/ios-haptics/commit/f5272ef9), 29.04.2026: „apple patched the bug … in ios 26.5 … haptic feedback
still works when the user directly clicks the checkbox switch themselves, but it can no longer be done programmatically"), dazu
[Issue #8](https://github.com/tijnjh/ios-haptics/issues/8). Die Version 3.x kann darum nur noch `hapticTrigger(element)`: ein Switch über dem Knopf.
→ Auf aktuellen iPhones hat das Spiel bei Ereignissen **nie** vibriert.

**Ursache Android (Quellcode geprüft):**
- Chrome ruft `Vibrator.vibrate(ms)` **ohne** Nutzungsart auf und überspringt die Vibration im **Lautlos-Modus**
  (Chromium `services/device/vibration/android/…/VibrationManagerAndroid.java`: `getRingerMode() != RINGER_MODE_SILENT`).
- Android behandelt so eine Vibration als `USAGE_UNKNOWN`: im **Energiesparmodus** wird sie ignoriert (nicht auf der Ausnahmeliste),
  bei ausgeschaltetem Hauptschalter **„Vibration & Haptik"** ebenso, und ihre Stärke folgt der Einstellung **„Medien-Vibration"** —
  steht die auf aus, vibriert nichts (AOSP `services/core/java/com/android/server/vibrator/VibrationSettings.java`,
  `BATTERY_SAVER_USAGE_ALLOWLIST`, `VIBRATE_ON`, `USAGE_UNKNOWN → mediaIntensity`).
- Chrome vibriert erst nach einem Tipp auf die Seite (Nutzer-Aktivierung) — im Spiel immer gegeben.
- v6-Impulse waren 5–14 ms kurz. Klassische Unwucht-Motoren (ERM) brauchen 40–100 ms zum Anlaufen
  ([Power Electronic Tips](https://www.powerelectronictips.com/haptics-components-pt-1-lra-erm-and-piezo-actuators/),
  [US-Patent 8791799](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8791799)) → kaum spürbar. Außerdem brach jeder neue
  Aufruf (Münze, Treffer …) den laufenden ab, sodass auch die langen Muster kaputtgingen.

**Umsetzung „dezent":**
- Neue Tabelle `HAP_V7` (`src/platform.js`, alte Werte als `HAP_V6` daneben, A/B per `?hap=alt`): nur **Level-Up, Truhe, Treppe/Portal,
  eigener Treffer, Boss-Auftritt, Boss-Sieg, Tod, Sieg**. Impulse 35–120 ms, Mindestabstand **400 ms** (Wichtiges wird nachgeholt statt
  verworfen), Budget ≤ 350 ms/s. Kein Vibrieren mehr bei Schlag, Treffer, Münze, Pickup, Ausweichen, Phasenwechsel.
- iPhone ab 26.5: ehrliche Grenze. In ✨, 🧪, ⏸️, 🎒, den Menü-Knöpfen, 🎲 und den Einstellungs-Zeilen liegt ein unsichtbarer Switch
  (eigener Code nach dem ios-haptics-3.x-Muster). Die echte Berührung schaltet ihn → kleiner System-Tick. Nie über dem Spiel-Canvas,
  nicht auf ⚔️; Joystick und Tap-to-move sind unberührt. Bis iOS 26.4 bleibt zusätzlich der alte Tick bei den großen Ereignissen.
- ⏸️/⚙️: **„📳 Vibration testen"** (schaltet Vibration ein, Muster 50-90-50 ms) + Hinweis: „Nichts gespürt? In den Handy-Einstellungen
  Vibration/Berührungsfeedback einschalten (und Lautlos-/Energiesparmodus aus). Am iPhone gibt es Vibration nur beim Antippen von Knöpfen."

## 3 · 🧭 Weg-Pfeil
- Steht der Kobold **2,0 s** still (keine Bewegung, keine Eingabe), blendet neben ihm am Boden ein kleiner Funkel-Pfeil in Weltfarbe weich
  ein, pulsiert 2 s und verschwindet. Bei jeder Bewegung/Eingabe sofort weg, wieder erst nach 2 s Stillstand; bleibt man stehen, alle ~9 s.
- **Ziel:** Keller → Treppe (Ebene 20: 20. Portal); versiegelt → Boss bzw. Arena; Stadt → Portal der tiefsten freigeschalteten Ebene.
  Kein Pfeil im Bosskampf, im Oma-Dialog und während Titelkarten.
- **Richtung folgt dem Weg:** `findPath` einmal beim Einblenden, Punkt 3,5 Kacheln voraus auf dem Pfad; liegt er hinter einer Ecke,
  rückwärts bis er sichtbar ist. So zeigt der Pfeil nie durch Wände.
- Darstellung: Iso-korrektes Polygon am Boden (dunkler Rand + helle Füllung + additiver Schein + wandernde Funkel), halbtransparent auch
  über Wänden/Laternen, die Figur bleibt frei. Gut lesbar in Moos, Kristall, Zucker, Frost (weiß mit dunklem Rand) und Glut.
- Einstellung **„🧭 Weg-Pfeil"** (Standard an), Konstanten `ARROW_IDLE`/`ARROW` in `config.js`, per URL änderbar (`?arrowIdle=1&arrowShow=3`).

## Messwerte
| Test | Ergebnis |
|---|---|
| `check.mjs --throttle=4 --v7=skip` (bisherige Checks) | **64/64 PASS** · A2 409,2 fps · A3 (4×) 223,8 fps (p5 119) · A3b größter Bosskampf 172,6 fps (p5 92,6) · 0 Fehler |
| `check.mjs --throttle=4 --v7=only` (neu V18–V21) | **10/10 PASS**, 0 Fehler, 0 fremde Requests |
| V18 Würfel 20× (`?seed=7`) | 20/20 Looks verschieden, 0 Wiederholungen, 0 Harmonie-Verstöße, Namen ≤ 11 Zeichen, Seed reproduzierbar |
| V18b 300 Würfe / Namen | 0 Verstöße, Extra 47 %, alle 8 Tierarten · 177 + 359 = 536 Namen, alle ≤ 12, keine Duplikate, Sperrliste 0 |
| V19 Haptik-Stub, je 60 s Kampf | **vorher (v6) 98 Vibrationen**, 101 Impulse < 25 ms, kürzester 5 ms, Abstand ab 46 ms · **nachher (v7) 9**: Level-Up 3, Treffer 2, Treppe 1, Boss 1, Boss-Sieg 1, Truhe 1; kürzester Impuls 35 ms, Abstand ≥ 538 ms, max. 180 ms/s · „aus" → 0 |
| V19b iPhone-Muster | 26 Switches nur in Knöpfen, Canvas frei (120/120 Stichproben), 🧪 wirkt + schaltet, Tap-to-move/Joystick ungestört |
| V20 Weg-Pfeil | erscheint nach 2,00 s (vorher 0), um die Ecke 5,1° zum Pfad-Wegpunkt (Luftlinie wäre 124,7° daneben), nie in eine Wand, nach Tipp sofort weg |
| V20b | Titelkarte/Bosskampf/aus: kein Pfeil · versiegelte Treppe → Ziel Boss · 12 s Stillstand: 2 Einblendungen = 2 Pfad-Berechnungen |
| V21 Save v6 → v7 | alle 32 Felder gleich, Datei v3, Einstellungen erhalten, 🧭 neu an |
| Live-URL headless nach Deploy (Pages ~70 s) | Menü „v7", `KK_VER = 7`, Boot 1,1 s, 🎲 → „Kicherkeks" (Tintenfisch), Ebene 1: Pfeil zur Treppe, Haptik-Modus v7, AudioContext „running", **0 Fehler, 0 fremde Requests** |
| Bot Normal (`bot.mjs 8731 20 6 --out=v7`) | **durchgespielt, 0 Tode**, 0 Hänger, 0 Fehler, Level 16 am Ende (`shots/neubau/bot_v7.md`) |

A3 und A3b liegen mit 224 bzw. 173 fps im Rahmen der Vorversionen (v5: 210/210, Vorlauf v7: 294/151) und weit über 45; im Bosskampf
wird kein Pfeil gezeichnet. Headless-FPS schwanken auf diesem Mac stark (A15 zeigt ±20 % bei identischen Einstellungen). Die Winkelfehler 0° entstehen, weil der Test den Wegpunkt aus
einem frisch berechneten Pfad auf dieselbe Art bestimmt; aussagekräftig ist der Fall „um die Ecke".
Testserver: `python3 -m http.server` ließ vereinzelt Modul-Anfragen > 30 s hängen (Backlog 5) → neu `tools/serve.py` (Backlog 256).

Screenshots (`shots/neubau/v7/`, alle selbst angesehen): Würfel-Folge 6 Looks hoch + quer, Würfel-Animation, Spiegel-Zufallslook,
Pfeil Stadt / Ebene 1 / Frost (E13) / Glut (E17) / versiegelt → Boss (hoch + quer), Pfeil um die Ecke, Einstellungen mit Vibrations-Hinweis.
Gefunden und behoben: Pfeil anfangs zu blass und von Laterne/Wand verdeckt (jetzt größer, kräftiger, scheint durch).

## Handy-Hinweise für Peter
- **Android:** Wenn es nicht vibriert, in den Handy-Einstellungen „Vibration & Haptik" (bzw. „Töne und Vibration") einschalten, dort
  **Medien-Vibration/Berührungsfeedback** nicht auf 0; **Lautlos-Modus** und **Energiesparmodus** aus. Dann ⏸️ → „📳 Vibration testen".
  Spürbar sind jetzt nur noch große Momente: Level-Up, Truhe, Treppe, eigener Treffer, Boss kommt/besiegt, Umfallen, Sieg.
- **iPhone (iOS 26.5 und neuer):** Webseiten können das iPhone nicht mehr selbst vibrieren lassen — das ist eine Apple-Grenze, kein Fehler
  im Spiel. Es gibt nur einen leisen Tick beim Antippen von ✨, 🧪, ⏸️, 🎒 und den Menü-Knöpfen (Schalter „Systemhaptik" muss an sein).
- **Ausprobieren:** 🎲 ein paarmal tippen (jeder Wurf ein neuer, hübscher Kobold mit Namen) · im Keller einfach 2 s stehen bleiben →
  kleiner Pfeil zeigt den Weg; auf Boss-Ebenen zum Boss. Wer den Pfeil nicht mag: ⏸️ → „🧭 Weg-Pfeil" aus.

## Offen
- Echte Haptik nur per Stub gemessen, nicht an einem echten Android-Handy oder iPhone. Ob der iPhone-Tick beim Knopf-Antippen in
  iOS 26.5+ tatsächlich kommt, stützt sich auf ios-haptics 3.x (Issue #8: „new version … works!").
- Der Pfeil zeigt in der Stadt immer zum tiefsten Portal, auch wenn das Kind lieber zum Brunnen oder Spiegel will (so gewünscht).
