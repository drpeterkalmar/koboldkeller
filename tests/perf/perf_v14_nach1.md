# Mess-Gate v14_nach1

Profil sw, CPU ×4, DPR 2, 8 s × 4 Wiederholungen. Wert = Hauptthread-Zeit je Bild bis fertig gemalt (ms): **p95** (p50 / max) · JS-Anteil p95.

| Format | Stufe | Szene | vorher | nachher |
|---|---|---|---|---|
| hoch | 0 | stadt | **83.6** (74.1 / 94.1) · 80.5 | **96** (79.5 / 173.7) · 90.9 |
| hoch | 0 | wechsel | **76.7** (60 / 195.1) · 71.3 | **69.1** (59.7 / 119.2) · 66.5 |
| hoch | 1 | stadt | **58.3** (50.9 / 68.9) · 55.6 | **58.1** (50.8 / 66.3) · 55.3 |
| hoch | 1 | wechsel | **48.5** (40.5 / 88) · 45.7 | **47.9** (41 / 96.5) · 45.7 |

| Ladegröße | vorher | nachher |
|---|---|---|
| js (roh / gzip) | 704 KB / 226 KB | 750 KB / 243 KB |
| audio (roh / gzip) | 743 KB / 743 KB | 743 KB / 743 KB |
| andere (roh / gzip) | 93 KB / 63 KB | 94 KB / 64 KB |
| **bis spielbereit** (roh / gzip) | **1539 KB / 1032 KB** | **1587 KB / 1049 KB** |
| inkl. später Nachgeladenem (roh / gzip) | 1905 KB / 1134 KB | 1966 KB / 1156 KB |

**Gate vorher → nachher: NICHT bestanden** (Toleranz 5 % + 0.5 ms). Verletzt: hoch q0 stadt: 83.6 → 96 ms Ladegröße kleiner: false

Fehler im Browser: 0
