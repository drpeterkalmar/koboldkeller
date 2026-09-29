# Koboldkeller 2 · v9 — Mythos-Kostüme (Bericht)

Stand: 30.09.2026 · Startmenü zeigt „v9" · Cache-Buster `?v=9`, `KK_VER = 9` · Spielstand-Datei `v:3` (ohne Kostüm Feld für Feld wie vorher)
Basis: die Werte aus v8 (Tempo 4,7, Boss-Leben × 1,3). Kostüme sind **nur Optik** — keine Kampfwerte, Balance und Bot-Tests bleiben gültig.

## Kostüme und Freischaltung (alle 14 umgesetzt, für alle 8 Tierarten)
| Kostüm | Stufe | Freischaltung | Kopfteil | Rückenteil (bewegt sich) | Körper | Glanz |
|---|---|---|---|---|---|---|
| 🐉 Drachenkind | selten | von Anfang an | Kapuze mit Hörnchen + Zacken | Stummelflügel + Zackenschwanz | Schuppen, heller Bauch | Funken |
| 🦄 Einhorn | selten | von Anfang an | Kapuze mit goldenem Horn, Regenbogenmähne | Regenbogen-Schweif | Kuschelanzug mit Regenbogenstreifen | Regenbogenspur |
| 🧙 Sternenzauberer | selten | von Anfang an | Spitzhut mit Sternen | Sternenumhang (weht) | Zaubermantel mit Mond + Sternen | Sternchen |
| 🧚 Waldfee | episch | Schlabbo (E2) | Blütenkranz | Libellenflügel (flattern schnell) | Blätterkleid | Blätter + Glitzer |
| 🦌 Waldhüter | episch | Moosbart (E4) | Ast-Geweih mit Blättern | Moosumhang mit Blätterrand | Moos-Wams | Blätter |
| 🦅 Greif | episch | Funkelflatter (E6) | Adler-Kapuze mit Schnabel | Federflügel | Federkleid + Federkragen | Federn |
| 💎 Kristallritter | episch | Glitzerzahn (E8) | Kristallhelm mit Federbusch | kurzer Kristallumhang | Kristallrüstung | Glitzerblitze |
| 🦊 Kitsune | episch | Lolli-Lutz (E10) | Fuchskapuze mit Zeichen | drei flauschige Schwänze | Kimono mit Obi + Glöckchen | Fuchsfeuer |
| 🧜 Bonbon-Nixe | episch | Zuckerschnute (E12) | Muschelkrone mit Perle + Seestern | Fischschwanz mit Flosse | Schuppen-Top + Flossenrock | Bläschen |
| ❄️ Yeti | episch | Bibber (E14) | flauschige Kapuze mit Hörnchen | Puschelschwanz | Kuschelfell | Schneeflocken |
| 🐺 Frostwolf | episch | Frostnase (E16) | Wolfskapuze mit Nordlicht-Stein | Fellumhang | Fellweste | Nordlicht-Funkeln |
| 🌋 Vulkan-Golem | episch | Glutpanzer Gustav (E18) | Steinhelm mit Glutrissen | schwebende Glutbrocken | Steinrüstung mit glühenden Adern | Glut |
| 🔥 **Phönix** | **mythisch** | Kellerkönig (E20) | goldene Federkrone | Flammenflügel + Flammenschweif | Flammenfedern | Flammen + Aura |
| 🌌 **Sternendrache** | **mythisch** | Sieg auf 🔥 MEGASCHWER | Nachthimmel-Kapuze, leuchtende Hörner | Sternenflügel mit Regenbogenrand + Sternenschwanz | Nachtschuppen mit Sternen | Sternenregen + Regenbogen-Aura |

Keine Film- oder Markenfiguren, nichts Gruseliges. Die Sagen-Paare aus dem Vorschlag sind unverändert geblieben (keine Tausche nötig).

## So funktioniert es
- **Fund-Moment:** Beim ersten Sieg über einen Boss fliegt ein Kostüm-Paket (Geschenk in Stufenfarbe) heraus und von selbst zum Kobold.
  Beim Aufheben: Funken, Level-Up-Klang, dezente Haptik (wie „levelup“) und oben ein Toast „🧚 Neues Kostüm: Waldfee!“ mit Knopf
  **„Anziehen“** (48 px). Das Spiel pausiert nicht, der Toast liegt oben (nicht über der Steuerung). Später geht es am 🪞 Spiegel.
- **Sammlung gehört dem Gerät** (`koboldkeller2_myths`, wie die Ehrenhall): Ein neues Spiel verliert nichts.
- **Migration:** Beim ersten Laden von v9 schaltet sich frei, was schon verdient ist — besiegte Bosse aus `bossDone`, `won` → Phönix,
  MEGASCHWER-Sieg (Spielstand oder 🔥 in der Ehrenhall) → Sternendrache. Einmal: „🦄 Du hast N Kostüme verdient!“. Nichts wird gesperrt,
  der Spielstand bleibt unverändert.
- **Glanz:** jede Figur hinterlässt beim Laufen/Stehen eine kleine Spur (Budget `MYTH_FX`: höchstens 14 Partikel), „mythisch“ ×1,7 plus
  weiche Aura am Boden. Die Aura ist klein und leise — Warnkreise der Bosse bleiben gut lesbar (Screenshot Phönix/Sternendrache im Kellerkönig-Kampf).
  Der ✨ Spezialangriff behält den Stil der Tierart, nimmt aber die Kostümfarben an.
- **Hut und Kopfteil:** Das Kopfteil ersetzt den Hut nur optisch, die ❤️ der Hüte bleiben. Schalter **„🎩 Hut statt Kopfteil“** im Kostüm-Tab.

## Entscheidungen
- **Eigener Tab „🦄 Kostüme“** direkt nach „🐾 Tier": Kinder finden ihn sofort, und 15 Porträts + Zähler + Schalter hätten den Outfit-Tab
  (Farbfelder) überladen. Raster mit 4 Porträts je Reihe (auch quer), Rahmen je Stufe (selten blau, episch lila, mythisch gold und
  pulsierend), gesperrte Kostüme als dunkle Silhouette mit 🔒 und „Besiege Funkelflatter“, Zähler „7 / 14 gesammelt“. Alle Tabs ≥ 48 px.
- **Farben:** Jedes Kostüm hat eine feste Palette. Die gewählte Outfit-Farbe erscheint als Akzent (Gürtel, Herz-Knopf, Edelstein), aber nur,
  wenn sie sich deutlich vom Kostüm abhebt (`LOOK_RULES.mythAccent` = Farbabstand ≥ 110) — sonst nimmt das Kostüm seinen eigenen Akzent.
  🎲 Würfel: in ≈ 30 % der Würfe ein freigeschaltetes Kostüm (`LOOK_RULES.mythChance`), nie ein gesperrtes.
- **Kopfteile, Ohren und Extras (feste Regeln):** Kapuzen und Helme lassen das Gesicht frei (Stirnlinie über den Augen, seitlich tief herunter).
  Haare liegen unter der Kapuze. Die Ohren der Tierart schauen immer durch (Hasen-, Katzen-, Fuchs-, Panda-, Bärenohren, Kobold-Spitzohren,
  Drachenhörner); Kapuzen-eigene Ohren gibt es nur, wenn die Tierart keine hohen/runden Ohren hat. Brille und Sommersprossen bleiben im
  Gesicht; Blume, Schleife und Sternspange rücken an den Kapuzen- bzw. Hutrand.
- **Tierart-Schwänze/-Flügel** werden vom Rückenteil des Kostüms ersetzt (sonst doppelte Flügel); die Tintenfisch-Beinchen bleiben.
- **Technik:** Rückenteil als eigene Sprites, pro Frame nur ein Transform (Flattern/Wehen/Wedeln). Kostüm-ID im Sprite-Schlüssel; Aussehen-
  Sprites in einer LRU (160), damit Kostümwechsel den Cache nicht wachsen lassen. `?kostueme=alle` zeigt alles, speichert aber weder die
  Sammlung noch ein nicht verdientes Kostüm im Spielstand.

## Messwerte
| Test | Ergebnis |
|---|---|
| `check.mjs --throttle=4 --v7=skip` | **64/64 PASS** · A2 351 fps · A3 (4×) 260 fps · A3b größter Bosskampf 164 fps · 0 Fehler |
| `check.mjs --throttle=4 --v7=only --ref=8732` (V18–V31) | **20/20 PASS**, 0 Fehler, 0 fremde Requests |
| V26 Darstellung | 14 × 8 = 112 Figuren, Porträts, Vorschauen je hoch + quer ohne Fehler; Gesichtsfeld 0 % verdeckt (Gegenprobe: Stirn unter Kapuzen ≥ 56 % bedeckt) |
| V27 Freischalten | E2 → Waldfee, E4 → Waldhüter, E20 → Phönix, MEGA-König → Sternendrache, je genau 1 Paket; zweiter Sieg 0; echter Tipp „Anziehen“ wirkt; Neu laden stellt Kostüm + Sammlung her; neues Spiel behält 7/14 |
| V28 Migration (echte v3-Stände) | bossDone [2,4,6] → genau Waldfee, Waldhüter, Greif · won → Phönix · MEGA-Sieg (Spielstand / 🔥 Ehrenhall) → Phönix + Sternendrache; Hinweis genau einmal; alle Felder gleich, Datei v3 |
| V29 Würfel | 300 Würfe: Kostüm-Anteil 29,7 %, nur freigeschaltete, 0 Verstöße, 0 Wiederholungen, Seed reproduzierbar |
| V30 Editor | 8 Tabs ≥ 48 px, 15 Felder ≥ 85 px, 4 je Reihe (hoch + quer), 8 Silhouetten mit Hinweis, „6 / 14 gesammelt“, Hut-Schalter wirkt im Spiel; `?kostueme=alle` speichert nichts |
| V31 Leistung (CPU 4×, Kellerkönig Wut-Phase, 9 Handlanger) | Phönix 175 / 173 fps, Sternendrache 228 / 218 fps (hoch / quer); Sprite-Cache nach 50…400 Kostümwechseln konstant 237 |
| Bot `--out=v9 --myth=phoenix` | **durchgespielt, 0 Tode, 0 Hänger, 0 Fehler**, Level 16, 848 s Spielzeit (v8: 818–836 s) |

Screenshots (`shots/neubau/v9/`, alle selbst angesehen): `kontaktbogen.png` (alle Kostüme × 8 Tierarten), Kostüm-Tab mit Silhouetten
(hoch + quer), Phönix mit Hut-Schalter, Fund-Moment, Migrations-Hinweis, `?kostueme=alle`, Laufen in allen 5 Welten (Waldfee/Moos,
Kristallritter/Kristall, Nixe/Zucker, Yeti/Frost, Golem/Glut — auch auf hellem Eis und dunkler Glut lesbar), Phönix und Sternendrache im
Kellerkönig-Kampf mit Warnkreisen. Nachgebessert: Umhänge waren hinter dem Körper verschwunden (jetzt weiter ausgestellt mit hellem
Futter), Golem-Brocken hinter dem Kopf (jetzt seitlich), Haarspitzen schauten aus Kapuzen (jetzt darunter), Golem etwas heller,
Sternendrachen-Flügel mit Regenbogenrand (glänzt sichtbar mehr als die epischen), lange Namen trennen sauber („Sternen-zauberer“).

## Handy-Hinweise für Peter
- App **einmal ganz schließen und neu öffnen** (dann „v9" im Startmenü).
- Schon verdiente Kostüme sind sofort da (Hinweis beim Weiterspielen). Anziehen am **🪞 Spiegel** in der Stadt → Tab **„🦄 Kostüme"**.
- Alle Kostüme nur anschauen (ohne etwas zu speichern): **https://drpeterkalmar.github.io/koboldkeller/?kostueme=alle** — dann am Spiegel stöbern.

## Offen
- Ob die Kinder ein Kostüm-Paket im Kampfgetümmel wahrnehmen: es fliegt von selbst zum Kobold und der Toast bleibt 7 s — am echten Handy
  noch nicht beobachtet.
