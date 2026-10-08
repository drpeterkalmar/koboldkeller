# Mess-Gate e3_gpu

Profil gpu, CPU ×4, DPR 2, 6 s × 2 Wiederholungen. Wert = Hauptthread-Zeit je Bild bis fertig gemalt (ms): **p95** (p50 / max) · JS-Anteil p95.

| Format | Stufe | Szene | vorher | mit |
|---|---|---|---|---|
| hoch | 0 | stadt | **6.4** (2.6 / 10.7) · 3.6 | **5.9** (2.5 / 10) · 5.8 |
| hoch | 0 | kampf | **7.7** (3.5 / 11) · 5.9 | **8** (3.6 / 10.8) · 7.3 |
| hoch | 0 | boss | **7.7** (4.1 / 12) · 5.9 | **6.7** (3.2 / 9.9) · 5.8 |
| hoch | 1 | stadt | **4** (2.6 / 5.8) · 3.6 | **3.9** (2.5 / 11.7) · 3.7 |
| hoch | 1 | kampf | **7.1** (3.5 / 12.6) · 4 | **7.4** (3.3 / 8) · 6.3 |
| hoch | 1 | boss | **7.1** (3.4 / 9) · 4.1 | **6.9** (3.5 / 7.7) · 6.1 |
| hoch | 2 | stadt | **4.2** (2.5 / 6.6) · 2.7 | **4.4** (2.7 / 6) · 3.7 |
| hoch | 2 | kampf | **6.7** (3.2 / 7.5) · 3.8 | **6.4** (3.3 / 7.6) · 5 |
| hoch | 2 | boss | **6.5** (3.2 / 7.9) · 3.9 | **6.7** (3.3 / 10.4) · 6.1 |
| hoch | 3 | stadt | **7.4** (2.4 / 10.5) · 3.5 | **7.3** (2.5 / 9.6) · 3.5 |
| hoch | 3 | kampf | **6.4** (3 / 6.7) · 3.9 | **6.1** (3 / 7.6) · 3.8 |
| hoch | 3 | boss | **6.7** (3.1 / 7.8) · 4 | **7.3** (3 / 9.7) · 3.7 |

| Ladegröße | vorher | mit |
|---|---|---|
| js (roh / gzip) | 646 KB / 203 KB | 704 KB / 226 KB |
| audio (roh / gzip) | 902 KB / 902 KB | 743 KB / 743 KB |
| andere (roh / gzip) | 92 KB / 63 KB | 93 KB / 63 KB |
| **bis spielbereit** (roh / gzip) | **1641 KB / 1169 KB** | **1539 KB / 1032 KB** |
| inkl. später Nachgeladenem (roh / gzip) | 1641 KB / 1169 KB | 1539 KB / 1032 KB |

**Gate vorher → mit: NICHT bestanden** (Toleranz 5 %). Verletzt: hoch q3 boss: 6.7 → 7.3 ms Ladegröße kleiner: true

Fehler im Browser: 0
