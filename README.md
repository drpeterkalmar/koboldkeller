# 🍄 Koboldkeller

Ein putziges Iso-Action-RPG im Browser — Diablo-Steuerung (Click-to-Move, feste 2:1-Isometrie),
Chibi-Kobolde, Wichtel, Schleime und ein Boss-Kobold mit Krone. 100 % eigener Code, prozedurale
Grafik (keine Assets), prozedurale Sounds. Lädt sofort, kein Build, kein Server.

**▶ Spielen:** https://drpeterkalmar.github.io/koboldkeller/

## Steuerung
| Eingabe | Aktion |
|---|---|
| Klick / Tipp | Laufen (auf Wichtel tippen = angreifen) |
| 1 / ⚔️ | Schlag mit der Waffelholz-Knüppel |
| 2 / 🫧 | Seifenblasen-Zauber (Flächenschaden) |
| 3 / 💨 | Blitz-Dash |
| R / 🧪 | Trank trinken |
| I / 🎒 | Rucksack |
| Esc | Pause |

## Features
- Prozedural generierte Dungeons (Räume + Korridore) mit 4 Farbwelten
- Stadt als Hub (Brunnen heilt), Treppe in die nächste Ebene
- 4 Gegner-Typen + Boss alle 4 Ebenen
- Loot: Glitzermünzen, Tränke, Glitzerpilze (+1 ❤️)
- XP/Level mit Herz-Fortschritt, Autosave (localStorage), Fortsetzen-Button
- Touch-Steuerung mit Skill-Buttons (kein Wischen nötig)
- 6 Kobold-Looks im Startmenü

## Technik
Vanilla JS + Canvas 2D, 5 kleine Module (`art.js` prozedurale Chibi-Grafik,
`sfx.js` WebAudio, `particles.js`, `world.js` Weltgen, `render.js` Iso-Renderer,
`game.js` Loop). Deterministisches RNG pro Ebene. MIT-Lizenz.

## Credits

- Musik: „Town Theme 1“ (Geomancer) & „Stepping Down Into the Dungeon“ — CC0 / Public Domain via OpenGameArt.org (gespiegelt auf creazilla.com)

## Entwickeln
Lokal testen: `python3 -m http.server 8471` im Projektordner, dann http://localhost:8471