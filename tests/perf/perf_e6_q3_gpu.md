# Mess-Gate e6_q3_gpu

Profil gpu, CPU ×4, DPR 2, 8 s × 3 Wiederholungen. Wert = Hauptthread-Zeit je Bild bis fertig gemalt (ms): **p95** (p50 / max) · JS-Anteil p95.

| Format | Stufe | Szene | vorher | nachher |
|---|---|---|---|---|
| hoch | 3 | boss | **9.7** (3.3 / 13.4) · 5.7 | **9.9** (3.4 / 14.9) · 5.8 |
| hoch | 3 | wechsel | **5.7** (0.9 / 43.6) · 3.5 | **4.2** (2.5 / 7) · 3.5 |
| quer | 3 | boss | **7.8** (3.3 / 11.3) · 5.7 | **8.4** (3.4 / 14.8) · 4.6 |
| quer | 3 | wechsel | **3.8** (0.6 / 10.2) · 3.3 | **4.1** (2.3 / 7.5) · 3.5 |

| Ladegröße | vorher | nachher |
|---|---|---|
| js (roh / gzip) | 646 KB / 203 KB | 704 KB / 226 KB |
| audio (roh / gzip) | 902 KB / 902 KB | 743 KB / 743 KB |
| andere (roh / gzip) | 92 KB / 63 KB | 93 KB / 63 KB |
| **bis spielbereit** (roh / gzip) | **1641 KB / 1169 KB** | **1539 KB / 1032 KB** |
| inkl. später Nachgeladenem (roh / gzip) | 1641 KB / 1169 KB | 1904 KB / 1133 KB |

**Gate vorher → nachher: bestanden** (Toleranz 5 % + 0.5 ms).  Ladegröße kleiner: true

Fehler im Browser: 0
