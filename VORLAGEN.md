# Koboldkeller – Vorlagen (v14)

Stand 13.10.2026. Dieses Blatt beschreibt, welche bewährten Spielmechaniken Koboldkeller ab v14 übernimmt, mit welchen
Startwerten und mit welchem URL-Regler sie sich abschalten lassen. Grundlage ist ein Datenblatt, das **nur Abläufe,
Verhältnisse und Größenordnungen in eigenen Worten** enthält. Es wurde **kein Code, keine Tabelle, keine Grafik, kein
Name und keine Figur** aus den Vorlagen übernommen. Alle Startwerte sind eigene, meist abweichende Werte.

Die Vorlagen heißen hier nur nach ihrer Art:

| Kürzel | Art | Was Koboldkeller davon lernt |
|---|---|---|
| A | Action-Rollenspiel mit Draufsicht (Klassiker) | Beute-Verhältnisse, XP-Ausgleich nach Level-Abstand, Treffer bricht Ausholen ab, kleine Gegner erschrecken, Gegner-Lexikon |
| B | 3D-Action-Abenteuer | Beute „nach Bedarf“ (es fällt, was gerade fehlt), Ziel-Aufschaltung im Blick-Kegel |
| C | 2D-Action-Abenteuer (Draufsicht) | Bedarfs-Zuschläge auf Drop-Tabellen, nichts Nutzloses mehr, Rückstoß-/Schutz-Takt |
| D | Sammel-Rollenspiel | XP-Kurve als Polynom statt exponentiell |
| E | Roguelike | Abkürzungs-Schleifen im Dungeon, Beute hinter Umwegen, „gemessene“ Beute mit Garantie |

## 1) Koboldkeller heute (v13.8, vor v14)

| Größe | Heute |
|---|---|
| XP-Kurve | Start 10, dann `xpNext · 1,4 + 4`: Lv 5 = 65, Lv 10 = 391, Lv 15 = 2143, Lv 20 = 11 565 (exponentiell) |
| XP je Gegner | a + b·Tiefe + c·Spieler-Level (z. B. Fledermaus 4 + 1·Tiefe + 1·Lv), Elite × 2,5 |
| Kills je Level (Gegner-XP ≈ 4 + 2·Lv) | Lv 5: 4,6 · Lv 10: 16 · Lv 15: 63 · Lv 16: 83 · Lv 20: 263 |
| Drop normal / Elite | Münzen 1–3 / 4–7, Trank 8 / 35 %, Herz 10 / 40 %, Glitzerpilz 6 / 30 %, Upgrade 7 / 25 % – egal, wie es dem Kind geht |
| Volle Sachen | Trank bei 5/5, Herz bei vollem ❤️, Pilz bei voller Leiste fallen trotzdem und werden beim Aufheben zu Gold |
| Truhe | 8–14 Münzen, Trank 45 %, Herz 40 %, Upgrade 35 %, Pilz 50 %; 2 je Ebene in zufälligen Räumen (≠ Eingang/Treppe) |
| Kampf-Takt | Schlag-Pause 0,6 s, Krit 12 % × 2, Ausweichen 0,3 s / 4,4 Kacheln / 0,5 s unverwundbar, Treffer-Schutz 1,0 s |
| Rückstoß | Gegner 5,5 Kacheln/s × (Boss 0,15 / Elite 0,6), klingt mit 9/s ab (≈ 0,6 Kacheln, ≈ 0,2 s) |
| Gegner-KI | Ausholen 0,38–0,8 s mit Warnung; **Treffer unterbrechen das Ausholen nie** |
| Blasen-Ziel | nächster Gegner ≤ 6,5 Kacheln, egal in welcher Richtung |
| Dungeon | 8–12 Räume, Baum aus kürzesten Verbindungen + **2 zufällige** Extra-Gänge |
| Bot 1→20 (v13.8) | gewinnt ohne Tod, **Level 16** am Ende, Stillstand auf Level 15 von Ebene 17 bis 19 |

## 2) Was v14 übernimmt (Arbeitsliste)

Jede Mechanik hat einen URL-Regler; **0 bzw. `alt` stellt genau das v13-Verhalten her**. Alle Werte stehen in einer
Parametergruppe: `VORLAGE` in `src/config.js`; die reinen Regeln (ohne Grafik) stehen in `src/vorlage.js`.

| # | Mechanik (Vorlage) | Koboldkeller-Fassung | Startwert | Regler | Etappe |
|---|---|---|---|---|---|
| 1 | XP-Kurve als Polynom (D) | Bedarf(L) = 10 + 5·L + 2·L² → Lv 5: 85, 10: 260, 15: 535, 20: 910 | a 10, b 5, c 2 | `?xpkurve=quad` (Std.) / `alt` | E2 |
| 2 | XP nach Level-Abstand (A) | Aufhol-Bonus: XP × (1 + (Soll-Level − Lv) / 10), Soll-Level = Ebene + 1, gekappt 0,6 … 1,5; dafür fällt der Spieler-Level-Anteil der Gegner-XP weg | 0,1 je Level | `?aufhol=0.1` (0 = aus) | E2 |
| 3 | Bedarfs-Beute (B + C) | 6 % jedes normalen Kills (Elite 20 %) sind ein **Wunsch-Platz**: ❤️ ≤ 25 % → **Glühwürmchen-Heiler** (+50 % ❤️, schwebt zum Kobold) · ❤️ ≤ 50 % → Herz · 🫧 < 6 → +4 Blasen · 🧪 leer → Trank · sonst Münze. Herz-Chance × 2 bei ❤️ ≤ 25 %. Was voll ist, fällt nicht mehr (wird gleich zur Münze) | 6 % / 20 %, × 2 | `?bedarf=1` (0 = aus) | E1 |
| 4 | Gemessene Beute mit Garantie (E) | Upgrade-Zähler +30 je Ebene, −50 je Upgrade aus Beute; ab 60 enthält die nächste Truhe sicher ein Upgrade. Zufalls-Upgrade je Kill 7 % → 5 % | 60 / +30 / −50 | `?beutetakt=1` (0 = aus) | E1 |
| 5 | Treffer bricht Ausholen ab (A) | Schaden ≥ 25 % der Max-❤️ des Gegners **oder** Krit → Ausholen bricht ab, 0,25 s Zucken (Sternchen), Angriffspause startet neu. Elite ab 40 %, Bosse nie | 0,25 / 0,4 | `?zucken=0.25` (0 = aus) | E3 |
| 6 | Schreck-Flucht kleiner Gegner (A) | geht ein Wichtel/Schleim/eine Fledermaus „Puff“, laufen gleichartige im Umkreis 4 Kacheln 1,2 s lang 2–3 Kacheln weg („Huch!“ 😳). Nicht bei Elite, Handlangern, Bossen | r 4, 1,2 s | `?schreck=1` (0 = aus) | E3 |
| 8 | Ziel-Kegel für Blasen (B) | Ziel = nächster Gegner im ±60°-Kegel der Lauf-/Joystick-Richtung, sonst der nächste insgesamt; ein angetippter Gegner bleibt Ziel bis 6,5 × 1,5 ≈ 9,8 Kacheln | 60° / 6,5 / × 1,5 | `?kegel=60` (0 = alt) | E3 |
| 9 | Treffer-Schutz (B) | **bleibt** – heute 1,0 s, entspricht der Vorlage | – | – | – |
| 10 | Rückstoß-Takt (C) | **bleibt** – ≈ 0,2 s / 0,6 Kacheln passt | – | – | – |
| 11 | Abkürzungs-Schleifen (E) | statt 2 Zufalls-Gängen: Gang nur dort, wo er den Laufweg zwischen zwei Räumen um ≥ 20 Kacheln kürzt, höchstens 3 je Ebene, nie in die Boss-Arena | 20 / 3 | `?schleifen=20` (0 = alt) | E4 |
| 12 | Beute hinter Umwegen (E) | Truhen bevorzugt in Räumen abseits des Wegs Eingang → Treppe (Gewicht 5 + 10 je Raumwechsel), mindestens eine abseits | 2 Truhen, ≥ 1 abseits | `?truhen=abseits` / `zufall` | E4 |
| 15 | Gegner-Sammelalbum (A) | im 🎒 je Gegnerart: Silhouette → Bild nach 1 Sieg, Oma-Satz nach 10, goldener Rahmen + Lebenswert nach 30; gehört dem Gerät | 1 / 10 / 30 | `?album=1` (0 = aus) | E5 |
| 13 | Geheimräume (E) | Phase 2 (Folgejob laut Datenblatt) | – | – | – |
| 14 | Glanz-Eigenschaften auf Waffen (A) | Phase 2 (Folgejob laut Datenblatt) | – | – | – |
| 7, 16 | Sammel-Ruf, Magie-Chance nach Gegner-Level, Gold-Plan, Aufladen | **weggelassen** (macht Räume hektischer bzw. zu viel Regelwerk für 7–11) | – | – | – |

Kindgerecht heißt hier: nur positive Eigenschaften, keine Strafe unter 60 % XP für leichte Ebenen, Flucht als „Huch!“
statt Angst, kein Grusel, kein Blut; Gegner verschwinden weiter mit „Puff + Glitzer“.

## 3) Messgrößen und Ziele

| # | Messgröße | Heute | Ziel | Messung |
|---|---|---|---|---|
| 1 | Kills je Level (gleich starke Normalgegner) | Lv 10: 16 · Lv 15: 63 · Lv 20: 263 | Lv 10: 9–13 · Lv 15: 13–18 · Lv 20: 17–24 | Node (`tests/node/vorlage.test.mjs`) |
| 2 | Level bei Ankunft je Ebene (Bot) | Ende 16, Stillstand Ebene 17–19 | jede Ebene ≥ +0,7 Level im Mittel, kein Stillstand über 2 Ebenen, Ende 20–23 | `tools/bot.mjs` |
| 3 | Zeit zwischen zwei Level-Ups (Bot, Median) | wächst auf > 150 s ab Lv 14 | 30–70 s über das ganze Spiel | `tools/bot.mjs` (Level-Zeitstempel) |
| 4 | Herz-Drop je Kill bei ❤️ ≤ 25 % | 10 % | ≥ 25 % (Herz + Wunsch-Platz) | Monte-Carlo, Node |
| 5 | Nutzlose Drops (Trank bei 5/5, Herz bei vollem ❤️, Pilz bei voller Leiste) | fallen, werden Gold | ≤ 2 % aller Drops | Monte-Carlo, Node |
| 6 | Upgrades aus Beute (Gegner + Truhen) je Ebene / längste Lücke | ≈ 1,5 zufällig, Lücke unbegrenzt | 1,0–1,5 im Mittel, Lücke ≤ 2 Ebenen in 200 Seeds | Node-Simulation |
| 7 | Schaden je Ebene (Bot, normal) | Σ ≈ 480 über 20 Ebenen | −10 bis −25 % durch Abbruch + Schreck, Tode weiter 0 | `tools/bot.mjs` |
| 8 | Ausholen-Abbruch-Quote | 0 % | 30–50 % der Ausholer, die im Warnmoment getroffen werden | Zähler im Spiel, Bot + Browser-Check |
| 9 | Schleifen | 2 zufällige Gänge | jede Ebene ≥ 1 Schleife, die ≥ 20 Kacheln spart; Weg Eingang → Treppe ± 15 % zu heute | 200 Seeds × 20 Ebenen, Node |
| 10 | Truhen abseits | zufällig | ≥ 60 % nicht auf dem kürzesten Weg Eingang → Treppe, 100 % erreichbar | dto. |
| 11 | Blasen treffen das „gemeinte“ Ziel | – | Ziel im ±60°-Kegel in ≥ 90 % der Joystick-Würfe (Szene: ein Gegner vorn, einer hinten näher) | Browser-Check |
| 12 | Leistung | v13.8 | p95 je Stufe ≤ +5 % + 0,5 ms | `tools/perf_gate.mjs` |
| 13 | Spielstand-Migration | – | alter Spielstand Lv 15 lädt mit Lv 15, `xp < xpNext`, Talente gleich | Node-Test `save.js` |

Die Ergebnisse vorher/nachher stehen in `V14_VORLAGEN_BERICHT.md`.

## 4) Recht

Übernommen wird nur Designwissen in eigenen Worten. Keine Quelltexte, Tabellen, Bezeichner, Grafiken, Töne, Namen von
Spielen, Figuren, Orten, Gegenständen oder Firmen. Eigene Begriffe: Glühwürmchen-Heiler, Wunsch-Platz, Upgrade-Zähler,
Aufhol-Bonus, Zucken, „Huch!“, Ziel-Kegel, Abkürzungs-Schleife, Sammelalbum.
