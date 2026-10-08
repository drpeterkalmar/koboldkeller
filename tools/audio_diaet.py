#!/usr/bin/env python3
"""Technik E1: Audio-Diät für die Stadtmelodie (braucht ffmpeg, afconvert (macOS) und numpy; < 30 s CPU).

Befund (Vorbau 08.10.): Der Browser lädt schon heute nur EINE Datei — audio.js nimmt town.m4a, wenn der Browser AAC kann
(Chrome, Safari, Firefox, Android), sonst town.mp3. Die Annahme „beide werden geladen“ aus dem Grafik-Audit stimmt also nicht.
Aber:
  • town.mp3 (3,0 MB, 320 kbit/s) ist ein ANDERER, älterer Mix als town.m4a (leiser, andere Bässe) → der Rückfall klang anders.
  • dungeon.m4a/.mp3 (1,1 MB) werden nirgends geladen (seit v12 ist die Kellermusik prozedural).
  • town.m4a ist mit 96 kHz Abtastrate kodiert, das Spiel rechnet sie beim Laden ohnehin auf 24 kHz herunter (audio.js loadRec).

Aufruf:
  python3 tools/audio_diaet.py rueckfall    → audio/town.mp3 neu aus town.m4a (32 kHz, 96 kbit/s, ≈ 0,9 MB statt 3,0 MB)
  python3 tools/audio_diaet.py messen       → AAC-Kandidaten mit 24 kHz (64/80/96 kbit/s) nach tests/perf/audio_kandidaten/,
                                               Größe + Wellenform-Abstand (SNR) zur heutigen town.m4a. Nur Messung — ob man
                                               einen Unterschied HÖRT, muss ein Mensch entscheiden (Peter).
"""
import os, subprocess, sys, json
import numpy as np

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(WURZEL, "audio")
VORLAGE = os.path.join(AUDIO, "town.m4a")


def dekodiere(pfad, sr=24000):
    roh = subprocess.run(["ffmpeg", "-v", "error", "-i", pfad, "-ar", str(sr), "-ac", "2", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(roh, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def tiefpass(x, fc=11000, sr=24000):
    X = np.fft.rfft(x, axis=0)
    X[np.fft.rfftfreq(len(x), 1 / sr) > fc] = 0
    return np.fft.irfft(X, n=len(x), axis=0)


def versatz(a, b, sr=24000):
    n = min(len(a), len(b), sr * 8)
    c = np.fft.irfft(np.fft.rfft(a[:n, 0], 2 * n) * np.conj(np.fft.rfft(b[:n, 0], 2 * n)))
    k = int(np.argmax(c))
    return k if k < n else k - 2 * n


def snr(ref, kand):
    """Wellenform-Abstand im hörbaren Band des Spiels (≤ 11 kHz), nach Ausrichten und Pegelangleich"""
    a, b = tiefpass(ref), tiefpass(kand)
    k = versatz(a, b)
    a, b = (a[k:], b) if k > 0 else (a, b[-k:])
    n = min(len(a), len(b)); a, b = a[:n], b[:n]
    g = (a * b).sum() / (b * b).sum()
    e = a - g * b
    return round(10 * np.log10((a * a).sum() / (e * e).sum()), 1), k


def rueckfall():
    ziel = os.path.join(AUDIO, "town.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", VORLAGE, "-ar", "32000", "-c:a", "libmp3lame", "-b:a", "96k", ziel], check=True)
    s, k = snr(dekodiere(VORLAGE), dekodiere(ziel))
    print(json.dumps({"datei": "audio/town.mp3", "bytes": os.path.getsize(ziel), "snr_db": s, "versatz_samples": k}))


def messen():
    ordner = os.path.join(WURZEL, "tests", "perf", "audio_kandidaten")
    os.makedirs(ordner, exist_ok=True)
    ref = dekodiere(VORLAGE)
    zeilen = [{"datei": "town.m4a (heute)", "bytes": os.path.getsize(VORLAGE), "snr_db": None}]
    for br in (64000, 80000, 96000):
        ziel = os.path.join(ordner, f"town_24k_{br // 1000}.m4a")
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac@24000", "-b", str(br), "-q", "127", "-s", "0", VORLAGE, ziel], check=True)
        s, k = snr(ref, dekodiere(ziel))
        zeilen.append({"datei": os.path.relpath(ziel, WURZEL), "bytes": os.path.getsize(ziel), "snr_db": s, "versatz_samples": k})
    with open(os.path.join(ordner, "messung.json"), "w") as f:
        json.dump(zeilen, f, indent=1, ensure_ascii=False)
    for z in zeilen:
        print(f"{z['datei']:42s} {z['bytes'] / 1e6:5.2f} MB  SNR {z['snr_db']} dB")


if __name__ == "__main__":
    was = sys.argv[1] if len(sys.argv) > 1 else ""
    if was == "rueckfall": rueckfall()
    elif was == "messen": messen()
    else: print(__doc__)
