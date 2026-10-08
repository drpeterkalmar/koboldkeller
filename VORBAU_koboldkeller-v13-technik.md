# Vorbau-Übergabe `koboldkeller-v13-technik` (Leicht-Spur, 08.10.2026)

Branch `vorbau/koboldkeller-v13-technik`, abgezweigt von `origin/main` = `31cb2df` („v13: Deko fertig“). `main` ist unberührt.
Alles ist ohne Browser gebaut und mit Node geprüft: **`node --test tests/node/*.test.mjs` → 47 Tests grün (≈ 5 s)**.
Gemessen, im Browser angesehen oder live geprüft ist noch **nichts**. Das macht der Heavy-Job.

## Kurzüberblick

| Etappe | Stand | Regler (A/B) | Standard | Node-Tests |
|---|---|---|---|---|
| E0 Mess-Gate | `tools/perf_gate.mjs` geschrieben, **nicht ausgeführt** | – | – | nur `node --check` |
| E1 Automatik rauf/runter | fertig: `src/automatik.js` + `main.js` | `?auto=0` | an | `automatik.test.mjs` (9) |
| E1 Audio | fertig: Rückfall-mp3 neu, `dungeon.*` entfernt, `tools/audio_diaet.py` | – | – | Messung (SNR) |
| E1 Partikel bündeln | fertig: `src/buendel.js` + `render.js` | `?pbuendel=0` | an | `buendel.test.mjs` (4) + Rauchtest |
| E2 Fester Takt | fertig: `src/takt.js` + `main.js` | `?takt=0` | an | `takt.test.mjs` (9), u. a. gleiche Simulation bei 30/60/90/120/144 Hz |
| E3 Kino-Look 2D | fertig: `src/post.js` + `render.js`/`main.js` | `?post=0`, `?pvign=1` | an (Vignette 2D) | `post.test.mjs` (7) + Rauchtest mit WebGL-Attrappe |
| E4 Backen im Worker | Boden-Chunks + Fels-Muster: `src/backwerk.js`, `src/chunkbacken.js` | `?worker=0` | an | `backwerk.test.mjs` (7) + Rauchtest mit Worker-Attrappe |
| E5 Normal-Licht | **nicht angefangen**, Plan unten | – | – | – |
| E6 Messung/Bericht/Version | **nicht meine Aufgabe** | – | – | – |

Rauchtest `tests/node/rauch_main.mjs` (+ `rauch.test.mjs`, 11 Fälle): bootet das ganze `main.js` mit einem Attrappen-DOM,
startet ein Spiel, kämpft, wechselt Ebenen (auch über die Blende) und zeichnet ≈ 650 Bilder bei 60/120/30 Hz. Das läuft mit
jedem Regler und ohne WebGL2. Er findet Lade-, Reihenfolge- und Laufzeitfehler, prüft aber **nicht, wie es aussieht**.

Neue Debug-Zugänge: `KK.auto()`, `KK.takt()`, `KK.post()` (`KK.post(false)` schaltet zur Laufzeit auf 2D), `KK.worker()`.
`KK.perf()` liefert zusätzlich `workMed/workP95/workMax`, also die Arbeitszeit je Bild für Logik, Zeichnen und Audio.

## Vorab: drei Dinge, die anders sind als im Brief

1. **Versionsnummer:** v13 ist schon vergeben. Der Deko-Job hat `KK_VER = 13` und `?v=13.3` gesetzt. Der Heavy-Job muss
   entscheiden, ob dieser Stand v14 oder 13.4 heißt. Die neuen Module stehen mit `?v=13.3` in der Importmap
   (`index.html`), Check A6 ist damit erfüllt. Das Hochzählen macht der Heavy-Job.
2. **Audio-Entdopplung −3,6 MB stimmt so nicht.** `audio.js` lädt schon heute nur **eine** Datei: `town.m4a`, wenn der
   Browser AAC kann, sonst `town.mp3`. Einen Service Worker gibt es im Projekt nicht (also auch keinen Precache).
   Die −3,6 MB im Audit waren `town.mp3` plus `dungeon.mp3`, also Repo- und Pages-Größe, nicht das, was ein Spieler lädt.
   Was ich gemacht habe, steht unter E1 Audio.
3. **„Ladegröße kleiner“ ist ohne Hörprobe nicht sicher erreichbar.** Neue Module beim Start: +41,5 KB roh / +16,8 KB gzip
   (takt, automatik, buendel, post, chunkbacken). Der Worker lädt erst beim ersten Ebenenwechsel mit Blende
   ≈ 90 KB roh / 27 KB gzip nach. Kleiner würde es nur mit einer neu kodierten `town.m4a`; die Optionen stehen unter
   E1 Audio, die Entscheidung trifft Peter nach Gehör.

## E0 Mess-Gate: `tools/perf_gate.mjs` (nicht ausgeführt)

- **Was es misst:**
  - Arbeitszeit je Bild. Eine Hülle um `requestAnimationFrame` wird vor dem Spiel geladen. Damit misst es alte und neue
    Stände gleich, ohne dass das Spiel etwas dafür können muss.
  - Dazu Bildabstand, `KK.perf()` (sofern vorhanden) und Ladegröße nach Art (js/audio/andere).
  - Profil Mittelklasse: CPU ×4, DPR 2, 412×915 hoch bzw. 915×412 quer.
  - Stufen 0–3 mit `?auto=0` + `KK.quality(q)`.
  - Szenen `stadt`, `kampf` (8 Gegner, Schläge, Blasen), `boss` (Ebene 8, Arena), `wechsel` (alle 3 s Ebene 3→7 über
    `G.hooks.fade`, wie die Treppe).
  - Ausgabe `tests/perf/perf_<tag>.json` + `.md` mit Gate-Urteil (p95 nachher ≤ vorher + 5 %, Ladegröße kleiner).
- **Vsync bleibt an**, ohne `--disable-frame-rate-limit`. Mit unbegrenzter Bildrate würde der feste Takt die Logik auf
  viele Bilder verteilen und die Arbeit je Bild künstlich klein aussehen lassen.
- **Vorher-Messung auf main:**
  ```
  git worktree add ../kk_vorher origin/main
  (cd ../kk_vorher && python3 tools/serve.py 8732 &)
  python3 tools/serve.py 8731 &
  node tools/perf_gate.mjs --ziele=vorher@8732 --tag=vorher
  ```
  Das Skript läuft vom Branch aus, der Server bedient den Worktree. Später vergleicht
  `--ziele=vorher@8732,nachher@8731 --tag=technik` beide Stände; zusätzlich `--q-nachher=post=0` usw. für A/B je Regler.
  Ein Browser, Kontexte nacheinander, also 8-GB-tauglich.
- **Abnehmen:**
  - Läuft es durch (Laufzeit grob 4 Szenen × 4 Stufen × 2 Formate × 2 Wiederholungen × ≈ 14 s ≈ 30 min je Ziel;
    mit `--qs=0,2` und `--reps=1` deutlich kürzer)?
  - Kommen die Zahlen plausibel heraus?
  - Profil `sw` (Software-Canvas, Standard wie `deko_perf`) oder `gpu`? Für das WebGL-Endbild ist `--profil=gpu` realistischer.
- **Risiko:** Ob die CDP-CPU-Drosselung auch den Worker drosselt, weiß ich nicht. Wenn nicht, sieht die Szene `wechsel`
  mit Worker zu gut aus. Das im Bericht erwähnen.

## E1 Automatik (Audit #4): `src/automatik.js`, Anschluss in `src/main.js`

- **Fertig:** Eine 2D-Variante des Stuntbahn-Autopiloten für die 4 festen Stufen (Skalen 1/0,8/0,65/0,5 bzw. mit Endbild
  siehe E3).
  - Misst je Halbsekunde die Arbeitszeit (Logik + Zeichnen + Audio) und den Bildabstand.
  - **Runter:** 3 schlechte Fenster in Folge (fps < 50 oder Arbeit > 85 % von 16,7 ms).
  - **Rauf:** 8 s am Stück Luft (fps ≥ 57 und Arbeit < 55 %).
  - Fällt es binnen 6 s nach einem „rauf“ wieder, wird „rauf“ gesperrt (60 s, dann 120 … 600 s).
  - **30-Hz-Stromsparmodus:** ruhige 30 fps bei wenig Arbeit gelten als „gedeckelt“, es wird nicht abgestuft.
  - Weil Canvas 2D die GPU-Zeit nicht sieht, gibt es nach 20 s „gedeckelt“ eine Probe: kurz auf Stufe 3. Wird es schneller,
    war es die Grafik, und die Automatik arbeitet sich wieder hoch. Sonst geht sie zurück, und die nächste Probe kommt
    nach 2, 4, 8 … 16 min.
  - Schonzeit nach Start, Ebenenwechsel und jeder Stufenänderung.
  - Partikel-Budget wie bisher: ab Stufe 2 → 0,6.
  - Die Stufe wird je Gerät gemerkt (`localStorage koboldkeller2_auto`, 30 Tage) und als Start genommen.
  - `KK.perf(true)` hält die Automatik weiter fest (wie bisher). Alte Mess-Skripte (`deko_perf`, Checks) funktionieren
    also unverändert. `KK.quality(q)` setzt die Stufe auch in der Automatik.
- **Geprüft:** `automatik.test.mjs` mit künstlichen Geräten (CPU-Zeit sichtbar, GPU-Zeit unsichtbar, Vsync-Raster):
  - starkes Gerät bleibt auf 0
  - 30-Hz-Stromsparen bleibt auf 0, auch über 10 min, mit wachsendem Abstand der Proben
  - GPU-Engpass bei ruhigen 30 fps landet auf der besten passenden Stufe
  - schwaches Gerät pendelt nicht
  - nach Lastende geht es frühestens nach 8 s je Stufe wieder rauf
  - Grenzgerät: Sperre wächst
  - 120-Hz-Bildschirm mit 70 fps wird nicht abgestuft
  - `?auto=0` ändert nichts
- **Browser-Abnahme:**
  1. Gedrosselt (CPU ×6) eine Kampfszene: stuft ab, `KK.auto().log`.
  2. Drosselung weg: nach ≥ 8 s eine Stufe rauf.
  3. 30-fps-Deckel simulieren (rAF künstlich auf 33 ms) bei wenig Arbeit: bleibt auf 0, `gedeckelt: true`.
  4. Kein sichtbares Pendeln.
- **Risiko:** Jede Stufenänderung baut die Art-Caches neu (`setArtScale`), das gibt eine kurze Spitze. Deshalb die langen
  Sperren. Die Schwellen sind Startwerte.

## E1 Audio: `tools/audio_diaet.py`, `audio/`

- **Fertig:**
  - `audio/town.mp3` (der Rückfall für Browser ohne AAC) ist neu aus der echten Vorlage `town.m4a` erzeugt: 32 kHz,
    96 kbit/s, **0,90 statt 2,99 MB**. Die alte mp3 war ein anderer, älterer Mix: leiser, andere Bässe (Spektren gemessen).
    Der Rückfall klang also anders als die Hauptdatei; jetzt klingt er gleich.
  - `audio/dungeon.m4a` + `.mp3` entfernt (−1,14 MB). Sie wurden nirgends geladen, die Kellermusik ist prozedural.
  - Repo/Pages: −3,2 MB. Was ein Spieler lädt, ändert sich dadurch nicht.
- **Messung der Kandidaten für eine kleinere `town.m4a`** (`python3 tools/audio_diaet.py messen`, Dateien landen in
  `tests/perf/audio_kandidaten/`, per `.gitignore` nicht im Repo):
  - Die heutige `town.m4a` hat 96 kHz Abtastrate. Das Spiel rechnet beim Laden ohnehin auf 24 kHz herunter.
  - Kandidaten mit AAC 24 kHz: 64 kbit/s = 0,61 MB (SNR 18,8 dB), 80 kbit/s = 0,76 MB (23,0 dB), 96 kbit/s = 0,91 MB (26,8 dB).
  - Der Wellenform-Abstand (SNR) sagt wenig darüber, ob man einen Unterschied **hört**. **Offen:** Peter soll
    `town_24k_80.m4a` gegen `town.m4a` anhören. Klingt sie gleich, eine Zeile in `audio.js` (`trackUrl`) bzw. die Datei
    ersetzen: −164 KB Ladegröße. Damit wäre der Stand trotz der neuen Module kleiner.
- **Abnehmen:** Musik in Chrome und Safari unverändert. Den Rückfall kurz mit `canPlayType` → `""` erzwingen: Die Schleife
  muss sauber auf die Takt-Eins schneiden; `loadRec` erkennt den ersten Anschlag, der Versatz zur m4a ist 0 Samples.

## E1 Partikel bündeln (Audit #8): `src/buendel.js`, `drawParticles` in `src/render.js`

- **Fertig:**
  - Drehbare Partikel (Sterne, 5er-Sterne, Konfetti, Brocken) haben je Sorte und Farbe **8 vorgedrehte Bilder** über die
    Symmetrie-Periode, Funken 16 (sie zeigen in Flugrichtung).
  - Ein `drawImage` je Partikel statt `save/translate/rotate/restore`.
  - Projektion ohne neue Arrays, also kein Müll für den Garbage Collector (`toScreen` legte je Partikel ein Array an).
  - Additive Partikel werden nach Bild sortiert; bei „lighter“ ist die Reihenfolge egal.
  - Die Bilder hängen am eingefärbten Sprite und fallen mit dem Art-Cache weg.
  - `?pbuendel=0` = genau der v13-Weg (`drawParticlesV13`).
- **Geprüft:** `buendel.test.mjs`: Winkel → Bild, größter Winkelfehler = halber Schritt (Stern 5,6°, Funke 11,25°),
  Quadratgröße fasst das Sprite in jedem Winkel, Sortierung. Der Rauchtest bestätigt, dass der neue Weg läuft.
- **Browser-Abnahme:** A/B-Bild Kampf mit vielen Sternen `?pbuendel=0` gegen Standard. Sterne dürfen nicht sichtbar
  „ruckend drehen“ und nicht unscharf sein. Größte Zeichengrößen `DREH` (16/16/12/16/26 Design-px); größere werden
  hochskaliert. Dazu die Arbeitszeit im Kampf.
- **Risiko:** Speicher ≈ 110 KB je Sorte und Farbe bei Art-Maßstab 2,6 (8 × ≈ 59 px²). Bei vielen Farben einige MB.
  Bei Bedarf `DREH`-Größen senken.

## E2 Fester Simulationstakt (Audit #5): `src/takt.js`, Schleife in `src/main.js`

- **Fertig:**
  - Die Logik läuft in festen 1/60-s-Schritten (`Takt`): 30 Hz → 2 Schritte je Bild, 60 → 1, 90 → 1,1,0, 120 → 1,0.
    Bei 120 Hz ist die Logik-Last damit halbiert.
  - Vsync-Erkennung aus dem Median der Bildabstände. Abstände rasten auf Vielfache ein, damit Zittern der Zeitstempel kein
    0/2-Ruckeln erzeugt. Der Rundungsrest wird nachgeholt, die Spielzeit bleibt also bei der echten Zeit.
  - Höchstens 3 Schritte je Bild (wie früher dt ≤ 50 ms), Hänger > 250 ms werden verworfen.
  - Hitstop, Zeitlupe und Pause gelten je Schritt (`spielDt`), mit gleicher Spielzeit bei jeder Bildrate.
  - Zwischenbild (`Zwischenbild`): Spieler, Gegner, Beute, Geschosse und Partikel werden zwischen vorletztem und letztem
    Schritt überblendet gezeichnet und danach exakt zurückgesetzt (`try/finally`). Sprünge > 1,5 Kacheln (Teleport,
    Ebenenwechsel) werden nicht überblendet.
  - Die Fackel-Glut wurde in `render.js` mit `Math.random()` je Bild gewürfelt, das hätte die Zufallsfolge des Spiels von
    der Bildrate abhängig gemacht. Jetzt hat sie eigenen Zufall, je Sekunde gleich oft (`render.js` `embR`,
    `game.js` `emb`). Das ist nur Optik.
  - `?takt=0` = die v13-Schleife unverändert.
- **Geprüft:** `takt.test.mjs`:
  - **Echte Spiel-Logik** (game.js + fx.js, 20 s Kampf mit Treffern, Beute und Zufall) ergibt bei 30, 60, 90, 120 und
    144 Hz **denselben Endstand** (Position, HP, XP, Gold, Kills, alle Gegner, Partikel, Anzahl Zufallsaufrufe).
  - Gegenprobe: die alte Schleife läuft bei 60 gegen 120 Hz auseinander.
  - Einrasten, 60 Hz mit Zittern = immer genau 1 Schritt, 120 Hz = 1/0 im Wechsel, krumme 61/59,94 Hz.
  - Hitstop und Zeitlupe bei jeder Bildrate gleich lang, Zwischenbild.
- **Browser-Abnahme:**
  - Bewegung bei 60 Hz flüssig, kein Mikroruckeln. Mit `--disable-frame-rate-limit` bzw. 120-Hz-Gerät `KK.takt()` →
    `vsync`, Schritte ≈ 60/s.
  - Das Bild läuft konstant ≈ 0,7 Schritte (≈ 12 ms) hinter der Logik; Eingabe-Gefühl prüfen.
  - Hitstop und Zeitlupe fühlen sich an wie vorher.
  - Alle Suiten (`check.mjs` + `checks_v7…v13`) mit Standard **und** `?takt=0`.
- **Annahme:** Audio (`audioFrame`), Musik-Ambiente und die Seite selbst verbrauchen weiter `Math.random` je Bild, wie in
  v13. Im Browser ist die Simulation also tempo-gleich, aber nicht bit-gleich. Das war vorher auch nicht so; bit-gleich
  ist sie im Node-Test ohne Audio.

## E3 Kino-Look 2D (Audit #2): `src/post.js`, Anschluss in `render.js` (`resize`, `draw`, `lighting`, `glowPass`) und `main.js`

- **Fertig:**
  - Das 2D-Canvas bleibt Zeichner und Eingabefläche (`opacity: 0`).
  - Darüber liegt ein WebGL2-Canvas `#post` (`pointer-events: none`). Je Bild:
    - Szene und Glow-Ebene werden als Texturen hochgeladen, die Glow-Ebene vormultipliziert.
    - Die Glow-Ebene wird in 2 Blur-Pässen in Viertel-Auflösung weichgezeichnet (17-Tap-Gauß über 4 lineare Abrufe).
    - Endbild: CAS-Nachschärfen beim Hochskalieren, Glow + Schein, Farbkorrektur je Welt (Lift/Gamma/Gain, Sättigung,
      Kontrast; in ≈ 1 s überblendet), Wärmeflimmern im Glutkeller, Dither.
  - Die 2D-Szene rendert mit `POST_STUFEN` = 0,8 / 0,72 / 0,65 / 0,5 × DPR (bei DPR ≈ 1 nie unter 1). Das Endbild läuft
    mit 1 / 1 / 0,85 / 0,72 × DPR.
  - `glowPass` zeichnet bei aktivem Endbild in eine Leinwand halber Szenen-Auflösung. **Scharf in der Szene bleiben:**
    Fackel- und Königsflammen, Rundumschlag-Sichel, Spezial-Ring, additive Partikel.
  - **Vignette:** standardmäßig wie v13 in der Lightmap. Grund (Review-Fund): eine Shader-Vignette würde auch Schilder,
    Zahlen, den Treffer-Blitz und die rote Rand-Warnung abdunkeln. `?pvign=1` = Vignette im Shader (gleiche Form und
    Weltfarbe, mit Dither) zum Vergleich.
  - **Rückfall automatisch:** kein WebGL2, Shader-, Link- oder Framebuffer-Fehler, Fehler in `postBild`, Kontextverlust →
    `POST.an = false`, 2D-Canvas wieder sichtbar, `resize()` setzt Auflösung, Glow und Vignette wie v13.
    `KK.post()` nennt den Grund und den Fehlertext.
- **Geprüft:**
  - `post.test.mjs`: Maße je Stufe (Handy kleiner, Desktop nicht unschärfer), Blur-Kern = diskreter 17-Tap-Gauß
    (bis 1e-9), Farbtabellen (Glut warm, Kristall/Frost kühl, nur Glut flimmert), Vignetten-Stopps wie v13, Shader-Text
    (Version, Klammern, jede Uniform gesetzt und deklariert).
  - Rauchtest mit WebGL-Attrappe: 3 Draw-Calls je Bild, RS 1,6, Glow-Leinwand da; `?post=0` und „kein WebGL2“ → RS 2,
    keine Glow-Leinwand.
  - Ein Prüf-Agent hat die WebGL-Aufrufe gelesen: keine Feedback-Schleife, Flip/Vormultiplikation, Uniform-Typen und
    GLSL ES 3.00 in Ordnung.
  - **Übersetzt hat die Shader noch kein Browser.** Bei einem Fehler greift der Rückfall, `KK.post().fehler` zeigt das Log.
- **Browser-Abnahme (wichtig):**
  1. `KK.post()` → `an: true` in Chrome (Metal-Flags) und, wenn möglich, Safari.
  2. A/B-Collage Stadt, Kerker (Moos/Kristall/Frost) und Glut, hoch und quer, mit `?post=0` und Standard; zusätzlich
     `?pvign=1`. Selbst ansehen: scharf genug bei Szene 0,8? Bloom nicht zu stark? Farben?
  3. Kontextverlust testen: `WEBGL_lose_context` → Spiel läuft in 2D weiter.
  4. Arbeitszeit/Bildzeit mit `--profil=gpu` messen.
  5. Bildschirmfotos der Checks: das Endbild ist ein eigenes Canvas, Playwright-Screenshots der Seite enthalten es.
     Kein bestehender Check liest Pixel aus `#cv` (geprüft).
- **TODO (nur am Bild abstimmbar), alles Startwerte:** `GRADE` (je Welt), `POST_STUFEN`, `SCHAERFE` (0,55 / 0,2),
  Blur-Breite (`1.5` Texel in `postBild`), Hitze-Amplituden im Shader.
- **Risiken:**
  - Stufe 2/3 rendern die Szene genauso groß wie v13 (1,3 / 1,0 × DPR). Dort gibt es nur Zusatzkosten, keine Ersparnis;
    eventuell senken.
  - Das Hochladen des 2D-Canvas als Textur kostet je Gerät unterschiedlich.
  - Weiche Dinge in halber Auflösung: Weg-Pfeil-Glow, Risse beim Boss-Auftritt, Lichtstrahlen.

## E4 Backen im Worker (Audit #6): `src/backwerk.js`, `src/chunkbacken.js`, Teil in `render.js`, `ui.js` `fade()`, `main.js` `hooks.fade`

- **Fertig:**
  - `chunkbacken.js` hat den Back-Code für Boden-Chunks (`backeChunk`, `felsRing`, `chunkLeer`, `backListe`).
    `render.js` `chunk()` und der Worker rufen **denselben Code** auf.
  - **Worker (`backwerk.js`):** Modul-Worker mit OffscreenCanvas → `transferToImageBitmap`.
    - Warteschlange: nächste Chunks zuerst; das Fels-Muster vor allem anderen.
    - Veraltete Ebenen verfallen (`id`), `stopp` bei Resize.
    - Fehler → Meldung → Hauptthread schaltet auf synchron.
  - **Eingesetzt wird er nur beim Ebenenwechsel mit Blende** (Treppe/Portal über `G.hooks.fade`):
    - Die Blende bleibt zu, bis die 12 nächsten Chunks und das Fels-Muster da sind (höchstens 1,2 s,
      `ui.js fade(cb, after, warte)`).
    - Solange steht die Spielzeit (`paused()` mit `R.blende`). So war es auch, als das synchrone Backen den Hauptthread
      blockierte; sonst liefe der Schutz nach dem Betreten unsichtbar ab.
  - **Ohne Blende** (Spielstart, `KK.goto`): synchron wie v13, damit nicht doppelt gebacken wird.
  - Fehlt beim Zeichnen ein Chunk, backt der Hauptthread ihn selbst wie v13. Es gibt also nie Löcher.
  - **Verdrängen (`CH_MAX` 28):** mit Worker der am längsten nicht gezeichnete Chunk statt des ältesten.
  - Krater-Chunks werden von ImageBitmap zu Canvas umgewandelt, bevor darauf gemalt wird.
  - Der Worker startet erst beim ersten Ebenenwechsel mit Blende. Kosten: siehe „Ladegröße“ oben, Cache-Busting:
    util/config/myth werden im Worker ohne `?v=` geladen, weil Module Worker die Importmap nicht kennen.
  - Ohne Worker, OffscreenCanvas oder 2D-Kontext in OffscreenCanvas (älteres Safari < 16.4) → synchron.
    `KK.worker()` zeigt: geliefert, verworfen, synchron, ms je Chunk.
- **Geprüft:**
  - `backwerk.test.mjs`: echte Ebenen aus `game.js`, Aufzeichnungs-Leinwand.
    - **Der Worker erzeugt Befehl für Befehl dieselben Zeichenaufrufe wie der synchrone Weg.**
    - Reihenfolge, Größen, leere Chunks, Fels-Muster zuerst, veraltete Ebene, `stopp`, Fehler → Meldung,
      Verdrängen, Fels-Ring.
  - Rauchtest mit Worker-Attrappe (echte `backwerk.js` im selben Prozess, asynchron): Ebenenwechsel über die Blende →
    ≥ 10 Chunks + Fels vom Worker, höchstens 2 synchron nachgebacken, Blende wieder offen. Mit `?worker=0` nichts.
- **Browser-Abnahme:**
  1. `KK.worker()` nach Treppe: `laeuft: true`, `geliefert` > 0, `fehler: null`.
  2. Boden und Felskanten pixelgleich zu `?worker=0`: Bildvergleich, gleiche Ebene, `KK.freeze()`.
  3. `perf_gate --szenen=wechsel`: p95/max gegen v13 und `?worker=0`.
  4. Blende nicht spürbar länger (Ziel < 0,4 s).
  5. Safari (Modul-Worker ab 15, OffscreenCanvas-2D ab 16.4/17).
  6. Boss-Krater auf Worker-Chunks korrekt.
- **Nicht angefangen (bewusst):**
  - **Art-Caches im Worker.** `prewarm` backt die Sprites (Gegner, Items, Wände, Deko) weiter synchron hinter der Blende.
    Dafür müsste `art.js` `spr()` im Worker OffscreenCanvas statt `document` nutzen, und die Sprites müssten per
    Funktionsname und Argumenten bestellt werden. Das ist ein großer Umbau mit Pixel-Abgleich, nur im Browser prüfbar.
    Ein Teil der Spitze beim Ebenenwechsel bleibt also.
  - **„Lightmap beim Ebenenwechsel“:** Es gibt keine je Ebene gebackene Lightmap. Sie wird je Bild in ¼-Auflösung
    gezeichnet, es gibt also nichts zu verlagern.
  - **Vorbacken beim Laufen** (Chunks in Laufrichtung) wäre der nächste Schritt gegen Ruckler innerhalb einer Ebene.
    Wegen `CH_MAX` und Speicher (≈ 2–3 MB je Chunk) nicht ohne Messung.

## E5 Normal-Licht für Sprites (Audit #3): nur Plan

Ohne die Messung von E1–E4 ist nicht entscheidbar, ob das Budget reicht. Der Brief sagt: falls zu groß, als Plan.

- **Plan:**
  1. `backeChunk` bekommt einen zweiten Durchgang „Höhe“: dieselben Kachelformen in Graustufen (Fels-Relief aus
     `drawRockEdge`/`drawFloorTile`: Steinoberkanten hell, Fugen dunkel). Im Worker als zweite Bitmap je Chunk.
  2. Wände: `wallSprite` bekommt eine Höhen-Variante (Krone hell, Fuß dunkel, Steinfugen).
  3. Eine 2D-Ebene „Höhe“ in Szenen-Auflösung, gezeichnet wie Boden/Wände (nur diese).
  4. In `post.js` ein Pass: Normalen per Sobel aus der Höhe, Fackeln als Uniform-Array (Bildschirmposition, Farbe,
     Radius; max. 16 sichtbare aus `L.torches`), Lambert + leichter Glanz, nur auf Stufe ≤ 1.
- **Kosten:** eine zusätzliche Leinwand + Upload je Bild und ≈ 16 Lichtschleifen je Pixel. Deshalb nur, wenn E3 messbar
  Luft hat.
- **Aufwand:** groß, und ohne Bildabstimmung sinnlos. Darum nicht vorgebaut.

## Empfohlene Reihenfolge für den Heavy-Job

1. Auf `main` (Worktree, s. E0) **vorher** messen. Das muss vor dem Merge dieses Branches passieren.
2. Branch übernehmen und `node --test tests/node/*.test.mjs` laufen lassen.
3. `check.mjs` + `checks_v7…v13` mit Standard, dann mit `?post=0&takt=0&worker=0&pbuendel=0` als Gegenprobe; das muss
   v13 entsprechen.
4. E3 im Bild abstimmen (Collagen), danach erst messen.
5. `perf_gate` nachher bzw. A/B je Regler. Bei Budget-Riss den betreffenden Regler-Standard auf aus stellen statt
   zurückbauen. Alles ist umschaltbar.
6. Hörprobe `town_24k_80.m4a` mit Peter klären (Ladegröße).
7. Version, Cache-Busting und Bericht `TECHNIK_BERICHT.md`.

## Dateien

- **Neu:** `src/takt.js`, `src/automatik.js`, `src/buendel.js`, `src/post.js`, `src/chunkbacken.js`, `src/backwerk.js`,
  `tools/perf_gate.mjs`, `tools/audio_diaet.py`, `tests/node/*.mjs`, `tests/perf/audio_kandidaten/messung.json`
- **Geändert:** `src/main.js`, `src/render.js`, `src/game.js` (nur Glut-Zufall), `src/ui.js` (`fade`), `index.html`
  (Importmap), `.gitignore`, `audio/town.mp3`
- **Gelöscht:** `audio/dungeon.m4a`, `audio/dungeon.mp3`
