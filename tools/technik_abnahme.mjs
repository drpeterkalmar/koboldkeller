// Koboldkeller 2 — Technik: Browser-Abnahme der Vorbau-Etappen (ein Browser, nacheinander, stumm).
// node tools/technik_abnahme.mjs [--port=8731] [--nur=post,worker,takt,auto,pixel] [--engine=chromium|webkit]
// → tests/perf/abnahme_<engine>.json + Konsole (PASS/FAIL je Punkt)
//   post   : Endbild an (WebGL2), Kontextverlust (WEBGL_lose_context) → Spiel läuft in 2D weiter, keine Fehler
//   worker : Ebenenwechsel über die Blende (wie Treppe) → Worker liefert Chunks + Fels, kein Fehler, Blende < 0,4 s länger
//   takt   : ungedrosselter Bildtakt → Logik ≈ 60 Schritte/s; Spielzeit läuft mit echter Zeit
//   auto   : CPU ×6 im Kampf → Automatik stuft ab; Drosselung weg → nach ≥ 8 s eine Stufe rauf (Profil --sw=1 --frei=1:
//            Software-Raster, freier Bildtakt → Pixelarbeit bremst wie ein schwaches Handy)
//   rauf   : starkes Gerät (GPU-Raster, --frei=1): Stufe 2 → 1 → 0, je frühestens nach 8 s Luft
//   deckel : 30-Hz-Deckel bei wenig Arbeit (Stromsparmodus) → Stufe bleibt 0 (--frei=1, GPU-Raster)
//   pixel  : Boden/Felskanten vom Worker = synchron gebacken (gleiche Ebene, Spielzeit angehalten, Bildvergleich)
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const PORT = +arg("port", 8731), NUR = arg("nur", "post,worker,takt,pixel").split(","), ENGINE = arg("engine", "chromium");
mkdirSync("tests/perf", { recursive: true }); mkdirSync("shots/technik", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// WebKit kennt kein --mute-audio: Medien-Elemente (Musik/Töne laufen über <audio>) und WebAudio stumm schalten
const STUMM = () => {
  const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return p.call(this); };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const g = Object.getOwnPropertyDescriptor(AC.prototype.__proto__ || AC.prototype, "destination"); if (g && g.get) Object.defineProperty(AC.prototype, "destination", { get() { const d = g.get.call(this); if (!this.__stumm) { this.__stumm = this.createGain(); this.__stumm.gain.value = 0; this.__stumm.connect(d); } return this.__stumm; } }); }
};
const PW = loadPlaywright();
const GPU = [process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required", "--mute-audio"];
const browser = ENGINE === "webkit" ? await PW.webkit.launch() : await PW.chromium.launch({ channel: "chromium", args: [...GPU, ...(arg("frei", "") ? ["--disable-gpu-vsync", "--disable-frame-rate-limit"] : []), ...(arg("sw", "") ? ["--disable-accelerated-2d-canvas"] : [])] });
const res = [], fehler = [];
const R = (id, name, ok, wert) => { res.push({ id, name, ok: !!ok, wert }); console.log((ok ? "PASS " : "FAIL ") + id.padEnd(8) + name + "  → " + JSON.stringify(wert)); };

async function seite(q = "", vp = [412, 915]) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: ENGINE !== "webkit" ? true : undefined, locale: "de-AT" });
  if (ENGINE === "webkit") await ctx.addInitScript(STUMM);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fehler.push(q + " " + e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(q + " " + m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html?${q}`);
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await sleep(1200);
  await page.evaluate(() => { KK.start({ name: "Abnahme" }); KK.god(true); });
  await sleep(600);
  return { ctx, page, cdp: ENGINE === "chromium" ? await ctx.newCDPSession(page) : null };
}
const nf = () => fehler.length;

if (NUR.includes("post")) {
  const { ctx, page } = await seite("auto=0");
  const f0 = nf();
  const a = await page.evaluate(() => ({ ...KK.post(), rs: KK.R.RS }));
  R("P1", "Endbild an (WebGL2)", a.an, { grund: a.grund, fehler: a.fehler, masse: a.masse && [a.masse.sw, a.masse.sh, a.masse.ow, a.masse.oh], rs: a.rs });
  const b = await page.evaluate(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    KK.goto(17); await w(1500);
    const cv = document.getElementById("post"), gl = cv && cv.getContext("webgl2"), ext = gl && gl.getExtension("WEBGL_lose_context");
    if (!ext) return { ext: false };
    const b0 = KK.perf().frames; ext.loseContext(); await w(1500);
    const st = KK.post(), b1 = KK.perf().frames;
    KK.attack(); await w(800);
    return { ext: true, an: st.an, grund: st.grund, rs: KK.R.RS, sichtbar2d: getComputedStyle(document.getElementById("cv")).opacity, postSichtbar: cv.style.display, bilderWeiter: KK.perf().frames > b1 };
  });
  await page.screenshot({ path: `shots/technik/abnahme_kontextverlust_${ENGINE}.png` });
  R("P2", "Kontextverlust → 2D läuft weiter", b.ext && !b.an && b.rs === 2 && b.sichtbar2d === "1" && b.bilderWeiter && nf() === f0, b);
  await ctx.close();
  const { ctx: c2, page: p2 } = await seite("auto=0&post=0");
  const c = await p2.evaluate(() => ({ post: KK.post(), rs: KK.R.RS, gcv: !!KK.R.gcv, el: !!document.getElementById("post") }));
  R("P3", "?post=0 = reines 2D (RS 2, keine Glow-Leinwand, kein #post)", !c.post.an && c.rs === 2 && !c.gcv && !c.el, c);
  await c2.close();
}

if (NUR.includes("worker")) {
  const { ctx, page } = await seite("auto=0");
  const f0 = nf();
  const r = await page.evaluate(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), G = KK.G, out = [];
    KK.goto(2); await w(1200);
    for (const d of [3, 7, 11, 15, 18]) {
      const t0 = performance.now(); let tAuf = 0, sync0 = KK.worker().sync;
      const fade = document.getElementById("fade");
      await new Promise((res) => G.hooks.fade(() => { KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9; res(); }));
      while (fade.classList.contains("on") && performance.now() - t0 < 4000) await w(10);
      tAuf = performance.now() - t0;
      await w(900);
      const st = KK.worker();
      out.push({ d, blendeMs: Math.round(tAuf), geliefert: st.geliefert, sync: st.sync - sync0, fels: st.felsWorker, fehler: st.fehler, laeuft: st.laeuft });
    }
    return { out, st: KK.worker() };
  });
  const ok = r.st.laeuft && !r.st.fehler && r.st.geliefert > 20 && r.out.every((o) => o.fels) && nf() === f0;
  R("W1", "Back-Worker liefert beim Ebenenwechsel (Chunks + Fels)", ok, r.st);
  const bl = r.out.map((o) => o.blendeMs), sy = r.out.map((o) => o.sync);
  R("W2", "Blende-Dauer je Wechsel (ms; v13 ≈ 230 + Backen) / synchron nachgebacken", Math.max(...bl) < 230 + 400, { blendeMs: bl, sync: sy });
  await ctx.close();
}

if (NUR.includes("pixel")) {
  // gleiche Ebene einmal mit Worker (über die Blende), einmal synchron (?worker=0); Spielzeit angehalten; nur Bodenbild (Spieler/Gegner weg)
  const bild = async (q, viaBlende) => {
    const { ctx, page } = await seite("auto=0&post=0&deko=1&" + q);
    await page.evaluate(async (viaBlende) => {
      const w = (ms) => new Promise((r) => setTimeout(r, ms)), G = KK.G;
      KK.goto(1); await w(600);
      if (viaBlende) await new Promise((res) => G.hooks.fade(() => { KK.goto(6); res(); }));
      else KK.goto(6);
      G.portalCd = 1e9; G.homeHideT = 1e9;
      await w(1800);
      G.ents.length = 0; G.items.length = 0; KK.FX.parts.length = 0;
      KK.freeze(true); await w(400);
    }, viaBlende);
    const png = await page.screenshot();
    const st = await page.evaluate(() => KK.worker());
    await ctx.close();
    return { png, st };
  };
  const A = await bild("", true), B = await bild("worker=0", true);
  writeFileSync("shots/technik/abnahme_pixel_worker.png", A.png); writeFileSync("shots/technik/abnahme_pixel_sync.png", B.png);
  R("X1", "Worker-Bild gespeichert (Vergleich per Python)", A.st.geliefert > 0 && B.st.geliefert === 0, { worker: A.st.geliefert, sync: B.st.sync });
}

if (NUR.includes("takt")) {
  const { ctx, page } = await seite("auto=0");
  const r = await page.evaluate(async () => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    KK.goto(1); await w(1500);
    const a = KK.takt(), t0 = performance.now(), s0 = a.schritte, f0 = KK.perf().frames;
    await w(3000);
    const b = KK.takt(), dt = (performance.now() - t0) / 1000;
    return { hz: b.hz, vsync: b.vsync, schritteProS: +((b.schritte - s0) / dt).toFixed(1), bilderProS: +((KK.perf().frames - f0) / dt).toFixed(1), verworfen: b.verworfen };
  });
  // Headless-rAF läuft gedrosselt (10–25 Hz) → bis zu 3 Schritte je Bild; Logik muss trotzdem ≈ 60/s schaffen, solange Bild ≥ 20/s
  R("T1", "fester Takt: Schritte je Sekunde ≈ 60 (Bildtakt beliebig)", r.bilderProS < 20 || Math.abs(r.schritteProS - 60) < 4, r);
  await ctx.close();
}

if (NUR.includes("auto") && ENGINE === "chromium") {
  const { ctx, page, cdp } = await seite("");
  await page.evaluate(() => { localStorage.removeItem("koboldkeller2_auto"); KK.quality(0); });
  const kampf = () => page.evaluate(() => {
    const G = KK.G; KK.goto(9); G.portalCd = 1e9; G.homeHideT = 1e9;
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; KK.spawn(["slime", "bat", "wisp", "pilzling"][k % 4], Math.cos(a) * 2.2, Math.sin(a) * 2.2); }
    for (const e of G.ents) e.hp = e.maxHp = 1e7;
    clearInterval(window.__f); window.__f = setInterval(() => { KK.attack(); if (Math.random() < 0.4) KK.bubbles(); }, 650);
  });
  await kampf();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  let t0 = Date.now(), runter = null;
  while (Date.now() - t0 < 40000) { await sleep(1000); const a = await page.evaluate(() => KK.auto()); if (a.stufe > 0) { runter = { s: (Date.now() - t0) / 1000, ...a }; break; } }
  R("A1", "CPU ×6 → Automatik stuft ab", !!runter, runter && { nachS: runter.s, stufe: runter.stufe, fps: runter.fps, arbeit: runter.arbeit, log: runter.log.slice(-2) });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  // „wieder rauf“ prüft A2 (--nur=rauf): im Software-Raster bleibt die Arbeit auch ohne Drosselung über 55 % des Takts (richtig: keine Luft)
  await ctx.close();
}

if (NUR.includes("rauf") && ENGINE === "chromium") {
  // GPU-Raster + freier Bildtakt = starkes Gerät: von Stufe 2 aus frühestens nach 8 s Luft je eine Stufe rauf
  const { ctx, page } = await seite("");
  await page.evaluate(() => { localStorage.removeItem("koboldkeller2_auto"); const G = KK.G; KK.goto(9); G.portalCd = 1e9; G.homeHideT = 1e9; KK.quality(2); });
  const t0 = Date.now(), wann = [];
  let z = null;
  while (Date.now() - t0 < 30000) { await sleep(500); z = await page.evaluate(() => KK.auto()); if (z.stufe < 2 - wann.length) wann.push(+((Date.now() - t0) / 1000).toFixed(1)); if (z.stufe === 0) break; }
  R("A2", "starkes Gerät: Stufe 2 → 1 → 0, je frühestens nach 8 s", z.stufe === 0 && wann[0] >= 8 && wann[1] - wann[0] >= 8, { raufNachS: wann, fps: z.fps, arbeit: z.arbeit, log: z.log.slice(-2) });
  await ctx.close();
}

if (NUR.includes("deckel") && ENGINE === "chromium") {
  const { ctx, page } = await seite("");
  // 30-Hz-Deckel wie ein Stromsparmodus: alle rAF-Rückrufe auf das nächste 33,3-ms-Raster (alle Nutzer im selben Bild)
  await page.evaluate(() => {
    localStorage.removeItem("koboldkeller2_auto"); KK.quality(0); KK.goto(1); KK.G.portalCd = 1e9; KK.G.homeHideT = 1e9;
    const orig = window.requestAnimationFrame.bind(window), P = 1000 / 30;
    // Headless liefert Bilder nur, solange sich etwas ändert → ein 1-px-Canvas ändert sich in jedem echten Bild (hält den Takt hoch)
    const k = document.createElement("canvas"); k.width = k.height = 1; k.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01";
    document.body.appendChild(k); const kc = k.getContext("2d"); let z = 0; const halte = () => { kc.fillStyle = (z ^= 1) ? "#000" : "#fff"; kc.fillRect(0, 0, 1, 1); orig(halte); }; orig(halte);
    window.requestAnimationFrame = (cb) => { const ziel = (Math.floor(performance.now() / P) + 1) * P; const go = (t) => (t >= ziel ? cb(t) : orig(go)); return orig(go); };
  });
  const verlauf = [];
  for (let i = 0; i < 16; i++) { await sleep(1000); const z = await page.evaluate(() => KK.auto()); verlauf.push([z.stufe, z.fps, z.streu, z.gedeckelt ? 1 : 0]); }
  console.log("   Verlauf [stufe, fps, streu, gedeckelt]:", JSON.stringify(verlauf));
  const d = await page.evaluate(() => KK.auto());
  R("A3", "30-Hz-Deckel (wenig Arbeit) → Stufe bleibt 0", d.stufe === 0, { stufe: d.stufe, fps: d.fps, arbeit: d.arbeit, streu: d.streu, gedeckelt: d.gedeckelt, log: d.log.slice(-2) });
  await ctx.close();
}

await browser.close();
const out = { engine: ENGINE, res, fehler };
writeFileSync(`tests/perf/abnahme_${ENGINE}.json`, JSON.stringify(out, null, 1));
console.log(`\n${res.filter((r) => r.ok).length}/${res.length} PASS · Fehler im Browser: ${fehler.length}${fehler.length ? " — " + fehler.slice(0, 3).join(" | ") : ""}`);
