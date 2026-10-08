# Mess-Gate e2_takt_sw

Profil sw, CPU ×4, DPR 2, 6 s × 2 Wiederholungen. Wert = Hauptthread-Zeit je Bild bis fertig gemalt (ms): **p95** (p50 / max) · JS-Anteil p95.

| Format | Stufe | Szene | vorher | ohne | ohnetakt |
|---|---|---|---|---|---|
| hoch | 0 | stadt | **116.1** (105.7 / 128.2) · 70 | **110.4** (103.9 / 130.6) · 67.4 | **109.8** (104.1 / 113.7) · 68.3 |
| hoch | 0 | kampf | **105** (98.3 / 108.6) · 65.1 | **105.7** (96.6 / 116.2) · 65.9 | **104.2** (95.4 / 116.4) · 64.9 |
| hoch | 0 | boss | **110.6** (104.8 / 114.1) · 61.2 | **119.1** (105.1 / 142.3) · 65 | **111.3** (103.5 / 117.2) · 61.5 |

| Ladegröße | vorher | ohne | ohnetakt |
|---|---|---|---|
| js (roh / gzip) | 646 KB / 203 KB | 702 KB / 225 KB | 702 KB / 225 KB |
| audio (roh / gzip) | 902 KB / 902 KB | 743 KB / 743 KB | 743 KB / 743 KB |
| andere (roh / gzip) | 92 KB / 63 KB | 93 KB / 63 KB | 93 KB / 63 KB |
| **bis spielbereit** (roh / gzip) | **1641 KB / 1169 KB** | **1537 KB / 1031 KB** | **1537 KB / 1031 KB** |
| inkl. später Nachgeladenem (roh / gzip) | 1641 KB / 1169 KB | 1537 KB / 1031 KB | 1537 KB / 1031 KB |

**Gate vorher → ohne: NICHT bestanden** (Toleranz 5 %). Verletzt: hoch q0 boss: 110.6 → 119.1 ms Ladegröße kleiner: true

Fehler im Browser: 0
