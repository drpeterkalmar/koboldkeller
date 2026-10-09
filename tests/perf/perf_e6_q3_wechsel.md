# Mess-Gate e6_q3_wechsel

Profil sw, CPU ×4, DPR 2, 10 s × 3 Wiederholungen. Wert = Hauptthread-Zeit je Bild bis fertig gemalt (ms): **p95** (p50 / max) · JS-Anteil p95.

| Format | Stufe | Szene | vorher | nachher | ohneworker |
|---|---|---|---|---|---|
| hoch | 3 | wechsel | **23.2** (18.3 / 53.5) · 4.1 | **24.4** (18.9 / 57.8) · 3.9 | **24.9** (18.9 / 183.1) · 5.1 |

| Ladegröße | vorher | nachher | ohneworker |
|---|---|---|---|
| js (roh / gzip) | 646 KB / 203 KB | 704 KB / 226 KB | 704 KB / 226 KB |
| audio (roh / gzip) | 902 KB / 902 KB | 743 KB / 743 KB | 743 KB / 743 KB |
| andere (roh / gzip) | 92 KB / 63 KB | 93 KB / 63 KB | 93 KB / 63 KB |
| **bis spielbereit** (roh / gzip) | **1641 KB / 1169 KB** | **1539 KB / 1032 KB** | **1539 KB / 1032 KB** |
| inkl. später Nachgeladenem (roh / gzip) | 1641 KB / 1169 KB | 1904 KB / 1133 KB | 1539 KB / 1032 KB |

**Gate vorher → nachher: bestanden** (Toleranz 5 % + 0.5 ms).  Ladegröße kleiner: true

Fehler im Browser: 0
