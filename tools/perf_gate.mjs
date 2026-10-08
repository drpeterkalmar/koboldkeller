// Koboldkeller 2 — Technik E0: Mess-Gate „Arbeitszeit je Bild“ statt FPS (Grafik-Audit #9).
// (Vorbau 08.10. geschrieben; Heavy-Job 08.10.: Messgröße „haupt“ ergänzt, im Browser ausgeführt, Vorher-Tabelle tests/perf/perf_vorher_*.md)
//
// Was gemessen wird (je Ziel × Format × Stufe × Szene, gleiche Drosselung, ein Browser, nacheinander):
//   • haupt = GATE: Hauptthread-Zeit je Bild vom ersten requestAnimationFrame-Rückruf bis nach dem Malen dieses Bildes
//             (MessageChannel-Nachricht läuft als nächste Aufgabe nach Stil/Layout/Malen). Im Profil „sw“ rastert Chrome
//             das 2D-Canvas erst beim Abschluss des Bildes, AUSSERHALB der rAF-Rückrufe — ohne diesen Teil wären z. B. im
//             Ebenenwechsel nur ≈ 4 ms statt ≈ 90 ms zu sehen (im Browser gemessen). p50/p95/max.
//   • work  = nur die rAF-Rückrufe (JS) — Hülle um requestAnimationFrame, die VOR dem Spiel geladen wird → gleich für alte
//             und neue Stände.
//   • frame = Bildabstand (rAF) p50/p95 — nur zur Info (headless läuft rAF lastunabhängig gedrosselt, ≈ 10–25 Hz).
//   • draw/work aus KK.perf(), wenn der Stand es kann (v12: drawMed/drawP95, Technik: workMed/workP95/workMax).
//   • Ladegröße: alle Antworten von localhost (Bytes roh + gzip-9 je Datei), nach Art (js/audio/andere); Gate-Wert =
//     „bis spielbereit“ (Back-Worker-Module, die erst beim ersten Treppenwechsel kommen, zählen getrennt).
// Profil „Mittelklasse-Android“: CPU ×4 (CDP), DPR 2, 412×915 hoch bzw. 915×412 quer, Touch.
// Vsync bleibt AN (60 Hz): ohne Bildraten-Deckel würde der feste Takt (E2) die Logik auf viele Bilder verteilen und die
// Arbeit je Bild künstlich klein aussehen lassen.
// Szenen: stadt (Ebene 0, Kobold läuft), kampf (Ebene 9, 8 Gegner, Schläge + Blasen = viele Partikel), boss (Ebene 8,
// Arena, Boss wach), wechsel (alle 3 s Ebenenwechsel 3 → 4 → 5 … mit Blende wie über die Treppe: Backen → Spitzen; max zählt).
// Stufen: ?auto=0 + KK.quality(q) je Lauf (Automatik aus, damit „je Stufe“ vergleichbar ist).
//
// Aufruf (Server selbst starten, z. B. python3 tools/serve.py 8731; für „vorher“ einen Worktree von main bedienen:
//   git worktree add ../kk_vorher origin/main && (cd ../kk_vorher && python3 tools/serve.py 8732)):
//   node tools/perf_gate.mjs --ziele=vorher@8732,nachher@8731 [--q-nachher=post=0] [--fmt=hoch,quer] [--qs=0,1,2,3]
//        [--szenen=stadt,kampf,boss,wechsel] [--secs=10] [--reps=2] [--throttle=4] [--profil=sw|gpu] [--tag=vorher]
//   Ein Ziel allein: --ziele=nachher@8731
// Ergebnis: tests/perf/perf_<tag>.json + tests/perf/perf_<tag>.md (Tabelle) + Konsole.
// Profile: „sw“ (Standard, Canvas im Software-Raster → Pixelarbeit zählt im gedrosselten Hauptthread, Stellvertreter für
// die Füllrate eines Handys) und „gpu“ (Canvas im GPU-Prozess; misst nur, was der Hauptthread aufzeichnet). WebGL (E3)
// läuft in beiden auf der echten GPU des Mac — dessen GPU-Zeit sieht das Gate nicht (im Bericht genannt).
// Gate (Brief): p95 „haupt“ nachher ≤ vorher je Stufe und Szene (Toleranz --tol=5 %), Ladegröße bis spielbereit nachher < vorher.
import { loadPlaywright } from "./pw.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const ZIELE = arg("ziele", "nachher@8731").split(",").map((s) => { const [name, port] = s.split("@"); return { name, port: +port, q: arg("q-" + name, "") }; });
const FMTS = arg("fmt", "hoch,quer").split(","), QS = arg("qs", "0,1,2,3").split(",").map(Number);
const SZENEN = arg("szenen", "stadt,kampf,boss,wechsel").split(","), SECS = +arg("secs", 10), REPS = +arg("reps", 2), TH = +arg("throttle", 4);
const PROFIL = arg("profil", "sw"), TAG = arg("tag", "messung"), TOL = +arg("tol", 5), TOLMS = +arg("tolms", 0.5);   // Toleranz: 5 % + 0,5 ms (Rauschen bei kleinen Werten im Profil gpu ±1 ms)
const DIR = "tests/perf/"; mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GPU-Raster über Metal (Mac) — wie checks_v9 GPU_FLAGS, aber OHNE --disable-gpu-vsync/--disable-frame-rate-limit (s. oben)
const GPU = [process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required", "--mute-audio"];
// Profil „sw“ (Standard wie deko_perf): Canvas im Software-Raster → Pixelarbeit landet im gedrosselten Hauptthread und zählt.
// Profil „gpu“: GPU-Raster (Canvas-Rasterkosten trägt der GPU-Prozess, WebGL-Endbild aus E3 läuft echt auf der GPU).
const ARGS = PROFIL === "gpu" ? GPU : ["--disable-accelerated-2d-canvas", ...GPU];
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chromium", args: ARGS });
const fehler = [];

// vor dem Spiel geladen: Hülle um requestAnimationFrame → Arbeitszeit je Bild (alle Rückrufe mit gleichem Zeitstempel)
function huelle() {
  const orig = window.requestAnimationFrame.bind(window);
  const W = (window.__pg = { on: false, work: [], haupt: [], frame: [], cur: -1, acc: 0, last: 0, t0: 0, offen: false });
  // „haupt“ = Hauptthread-Zeit je Bild: vom ersten rAF-Rückruf bis NACH dem Malen dieses Bildes (Nachricht über einen
  // MessageChannel läuft als nächste Aufgabe nach Stil/Layout/Malen/Canvas-Flush). Im Profil „sw“ rastert Chrome das
  // 2D-Canvas erst beim Abschluss des Bildes, außerhalb der rAF-Rückrufe → „work“ allein unterschätzt dort die Last.
  const mc = new MessageChannel();
  mc.port1.onmessage = () => { if (W.offen && W.on) W.haupt.push(performance.now() - W.t0); W.offen = false; };
  window.requestAnimationFrame = (cb) => orig((t) => {
    if (t !== W.cur) {
      if (W.cur >= 0 && W.on) { W.work.push(W.acc); if (W.last) W.frame.push(W.cur - W.last); }
      W.last = W.cur; W.cur = t; W.acc = 0;
      W.t0 = performance.now(); W.offen = true; mc.port2.postMessage(0);
    }
    const s = performance.now();
    try { cb(t); } finally { W.acc += performance.now() - s; }
  });
  // gleicher Spiel-Zufall in allen Ständen (Gegner/Beute vergleichbar)
  let s = 777; Math.random = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
}

async function oeffnen(Z, fmt) {
  const [w, h] = fmt === "quer" ? [915, 412] : [412, 915];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
  await ctx.addInitScript(huelle);
  const page = await ctx.newPage();
  const last = { bytes: 0, gz: 0, n: 0, ext: 0, art: {} };
  page.on("response", async (r) => {
    try {
      const u = r.url(); if (!u.startsWith("http://localhost")) { last.ext++; return; }
      const b = await r.body(), gz = /\.(m4a|mp3|ogg|opus|png|webp|jpg)(\?|$)/.test(u) ? b.length : gzipSync(b, { level: 9 }).length;
      const art = /\.m?js(\?|$)/.test(u) ? "js" : /\.(m4a|mp3|ogg|opus)(\?|$)/.test(u) ? "audio" : "andere";
      last.n++; last.bytes += b.length; last.gz += gz;
      const a = (last.art[art] = last.art[art] || { n: 0, bytes: 0, gz: 0 }); a.n++; a.bytes += b.length; a.gz += gz;
    } catch (e) { }
  });
  page.on("pageerror", (e) => fehler.push(Z.name + " " + e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(Z.name + " " + m.text()); });
  const q = ["auto=0", Z.q].filter(Boolean).join("&");
  await page.goto(`http://localhost:${Z.port}/index.html?${q}`);
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
  await page.waitForFunction(() => KK.audio().pre && KK.audio().pre.done, null, { timeout: 90000 }).catch(() => { });
  await sleep(1500);
  const start = JSON.parse(JSON.stringify(last));                // Ladegröße bis spielbereit (danach: Nachgeladenes, z. B. Back-Worker)
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => { setInterval(() => KK.perf(true), 1000); KK.start({ name: "Perf" }); KK.god(true); });   // perf(true) hält auch alte Automatik fest
  return { Z, ctx, page, cdp, last, start };
}

async function szene(P, nm, q) {
  const { page, cdp } = P;
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.evaluate(async ([nm, q]) => {
    const w = (ms) => new Promise((r) => setTimeout(r, ms)), G = KK.G;
    { let s = 777; Math.random = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); }
    clearInterval(window.__walk); clearInterval(window.__fight); clearInterval(window.__wechsel);
    G.bossDone = []; G.winQueued = false;
    const d = nm === "stadt" ? 0 : nm === "kampf" ? 9 : nm === "boss" ? 8 : 3;
    KK.goto(d); G.portalCd = 1e9; G.homeHideT = 1e9; KK.quality(q);
    if (nm === "boss") {
      const A = G.L.arena; KK.teleport(A.cx - 3, A.cy - 3);
      const t0 = performance.now(); while (!(G.boss && G.boss.awake && G.ents.includes(G.boss)) && performance.now() - t0 < 12000) await w(50);
      await w(2600);
    } else await w(1800);
    if (nm === "kampf") for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; KK.spawn(["slime", "bat", "wisp", "pilzling"][k % 4], Math.cos(a) * 2.2, Math.sin(a) * 2.2); }
    const zaeh = () => { for (const e of G.ents) if (e.type !== "dummy" && !e.isBoss && !e.isMini) e.hp = e.maxHp = 1e7; if (G.boss) G.boss.hp = G.boss.maxHp = 1e8; };
    zaeh();
    // Kobold pendelt (Kamera, Chunks, Staub); Ebenenwechsel: um den Eingang der jeweils neuen Ebene
    let k = 0; const x0 = G.p.x, y0 = G.p.y;
    window.__walk = setInterval(() => { k++; const bx = nm === "wechsel" ? G.L.entry.x : x0, by = nm === "wechsel" ? G.L.entry.y : y0, tx = bx + (k % 2 ? 2.5 : -2.5), ty = by + (k % 2 ? 1 : -1); const pth = KK.path(tx, ty); if (pth && pth.length) G.p.path = pth; }, 1300);
    if (nm === "kampf" || nm === "boss") window.__fight = setInterval(() => { KK.attack(); if (Math.random() < 0.4) KK.bubbles(); }, 650);
    // Ebenenwechsel wie über die Treppe: mit Blende (G.hooks.fade) — nur dann backt ab Technik-E4 der Worker; v13 hat denselben Weg
    if (nm === "wechsel") { let e = 3; window.__wechsel = setInterval(() => { e = e >= 7 ? 3 : e + 1; G.hooks.fade(() => { KK.goto(e); G.portalCd = 1e9; G.homeHideT = 1e9; zaeh(); }); }, 3000); }
  }, [nm, q]);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: TH });
  await sleep(1500);
  await page.evaluate(() => { const W = window.__pg; W.work.length = 0; W.haupt.length = 0; W.frame.length = 0; W.on = true; KK.perf(true); });
  await sleep(SECS * 1000);
  const r = await page.evaluate(() => {
    const W = window.__pg; W.on = false;
    clearInterval(window.__walk); clearInterval(window.__fight); clearInterval(window.__wechsel);
    const st = (v) => { const a = v.slice().sort((x, y) => x - y), n = a.length; const q = (f) => +a[Math.min(n - 1, Math.floor(n * f))].toFixed(2); return n ? { n, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +a[n - 1].toFixed(2) } : { n: 0 }; };
    const pf = KK.perf();
    return { work: st(W.work), haupt: st(W.haupt), frame: st(W.frame), fps: W.frame.length ? +(1000 / (W.frame.reduce((s, x) => s + x, 0) / W.frame.length)).toFixed(1) : 0,
      kk: { drawMed: pf.drawMed, drawP95: pf.drawP95, workMed: pf.workMed, workP95: pf.workP95, workMax: pf.workMax, jsUpdate: pf.jsUpdate, jsDraw: pf.jsDraw },
      q: KK.R.q, rs: KK.R.RS, parts: KK.FX.parts.length, post: KK.post ? KK.post() : null, takt: KK.takt ? KK.takt() : null, worker: KK.worker ? KK.worker() : null,
      allWork: W.work.map((v) => +v.toFixed(2)), allHaupt: W.haupt.map((v) => +v.toFixed(2)) };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return r;
}

const res = [], lasten = {}, gesamtLast = {};
for (const fmt of FMTS) for (let rep = 0; rep < REPS; rep++) {
  const reihe = rep % 2 ? ZIELE.slice().reverse() : ZIELE;   // abwechselnde Reihenfolge gegen Wärme-/Takt-Drift
  for (const Z of reihe) {
    const P = await oeffnen(Z, fmt);
    for (const q of QS) for (const nm of SZENEN) {
      const r = await szene(P, nm, q);
      res.push({ ziel: Z.name, fmt, rep, q, nm, ...r });
      console.log(`${Z.name.padEnd(8)} ${fmt} q${q} ${nm.padEnd(7)} rep${rep}: haupt p50 ${r.haupt.p50} · p95 ${r.haupt.p95} · max ${r.haupt.max} ms | js p95 ${r.work.p95} | Bild p95 ${r.frame.p95} ms · ${r.fps} fps`);
    }
    if (!lasten[Z.name]) lasten[Z.name] = P.start, gesamtLast[Z.name] = P.last;
    await P.ctx.close();                                     // nur ein Kontext gleichzeitig (8-GB-Mac)
  }
}
await browser.close();

// gepoolt über Wiederholungen (p95 eines einzelnen Fensters ist verrauscht)
const pool = (rs, k = "allHaupt") => { const v = rs.flatMap((r) => r[k]).sort((x, y) => x - y), n = v.length; return n ? { n, p50: +v[n >> 1].toFixed(2), p95: +v[Math.floor(n * 0.95)].toFixed(2), max: +v[n - 1].toFixed(2) } : { n: 0 }; };
const tab = [];
for (const fmt of FMTS) for (const q of QS) for (const nm of SZENEN) {
  const z = {}; for (const Z of ZIELE) { const rs = res.filter((r) => r.ziel === Z.name && r.fmt === fmt && r.q === q && r.nm === nm); z[Z.name] = pool(rs); z[Z.name].js = pool(rs, "allWork"); }
  tab.push({ fmt, q, nm, ...z });
}
let gate = null;
if (ZIELE.length >= 2) {
  const [A, B] = ZIELE.map((Z) => Z.name);
  const verletzt = tab.filter((t) => t[A].n && t[B].n && t[B].p95 > t[A].p95 * (1 + TOL / 100) + TOLMS);
  const ladeOk = lasten[B] && lasten[A] ? lasten[B].bytes < lasten[A].bytes : null;
  gate = { vergleich: A + " → " + B, tol: TOL, ok: verletzt.length === 0 && ladeOk !== false, verletzt: verletzt.map((t) => `${t.fmt} q${t.q} ${t.nm}: ${t[A].p95} → ${t[B].p95} ms`), ladeOk };
}
for (const r of res) { delete r.allWork; delete r.allHaupt; }
const out = { tag: TAG, profil: PROFIL, throttle: TH, secs: SECS, reps: REPS, dpr: 2, ziele: ZIELE, lasten, gesamtLast, tab, gate, res, fehler };
writeFileSync(`${DIR}perf_${TAG}.json`, JSON.stringify(out, null, 1));

const kb = (b) => (b / 1024).toFixed(0) + " KB";
let md = `# Mess-Gate ${TAG}\n\nProfil ${PROFIL}, CPU ×${TH}, DPR 2, ${SECS} s × ${REPS} Wiederholungen. Wert = Hauptthread-Zeit je Bild bis fertig gemalt (ms): **p95** (p50 / max) · JS-Anteil p95.\n\n`;
md += "| Format | Stufe | Szene | " + ZIELE.map((Z) => Z.name).join(" | ") + " |\n|---|---|---|" + ZIELE.map(() => "---|").join("") + "\n";
for (const t of tab) md += `| ${t.fmt} | ${t.q} | ${t.nm} | ` + ZIELE.map((Z) => t[Z.name].n ? `**${t[Z.name].p95}** (${t[Z.name].p50} / ${t[Z.name].max}) · ${t[Z.name].js.p95}` : "–").join(" | ") + " |\n";
md += "\n| Ladegröße | " + ZIELE.map((Z) => Z.name).join(" | ") + " |\n|---|" + ZIELE.map(() => "---|").join("") + "\n";
for (const art of ["js", "audio", "andere"]) md += `| ${art} (roh / gzip) | ` + ZIELE.map((Z) => { const a = lasten[Z.name] && lasten[Z.name].art[art]; return a ? `${kb(a.bytes)} / ${kb(a.gz)}` : "–"; }).join(" | ") + " |\n";
md += "| **bis spielbereit** (roh / gzip) | " + ZIELE.map((Z) => lasten[Z.name] ? `**${kb(lasten[Z.name].bytes)} / ${kb(lasten[Z.name].gz)}**` : "–").join(" | ") + " |\n";
md += "| inkl. später Nachgeladenem (roh / gzip) | " + ZIELE.map((Z) => gesamtLast[Z.name] ? `${kb(gesamtLast[Z.name].bytes)} / ${kb(gesamtLast[Z.name].gz)}` : "–").join(" | ") + " |\n";
if (gate) md += `\n**Gate ${gate.vergleich}: ${gate.ok ? "bestanden" : "NICHT bestanden"}** (Toleranz ${TOL} % + ${TOLMS} ms). ${gate.verletzt.length ? "Verletzt: " + gate.verletzt.join("; ") : ""} Ladegröße kleiner: ${gate.ladeOk}\n`;
md += `\nFehler im Browser: ${fehler.length}${fehler.length ? " — " + fehler.slice(0, 3).join(" | ") : ""}\n`;
writeFileSync(`${DIR}perf_${TAG}.md`, md);
console.log("\n" + md);
