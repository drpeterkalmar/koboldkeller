# Mess-Gate v14_nach2

Profil sw, CPU ×4, DPR 2, 8 s × 4 Wiederholungen. Wert = Hauptthread-Zeit je Bild bis fertig gemalt (ms): **p95** (p50 / max) · JS-Anteil p95.

| Format | Stufe | Szene | vorher | nachher |
|---|---|---|---|---|
| hoch | 0 | stadt | **79.4** (72.7 / 88.1) · 77.6 | **84** (73.9 / 91.5) · 81.8 |

| Ladegröße | vorher | nachher |
|---|---|---|
| js (roh / gzip) | 704 KB / 226 KB | 750 KB / 243 KB |
| audio (roh / gzip) | 743 KB / 743 KB | 743 KB / 743 KB |
| andere (roh / gzip) | 93 KB / 63 KB | 94 KB / 64 KB |
| **bis spielbereit** (roh / gzip) | **1539 KB / 1032 KB** | **1587 KB / 1049 KB** |
| inkl. später Nachgeladenem (roh / gzip) | 1539 KB / 1032 KB | 1587 KB / 1049 KB |

**Gate vorher → nachher: NICHT bestanden** (Toleranz 5 % + 0.5 ms). Verletzt: hoch q0 stadt: 79.4 → 84 ms Ladegröße kleiner: false

Fehler im Browser: 0
