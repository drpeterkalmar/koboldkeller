// Koboldkeller 2 — v13 Deko: Kosten der Effekte pro Frame in DERSELBEN Seite messen (KK.deko(an/aus) im Wechsel, gleiche Szene).
// Gebackenes (Boden-/Wand-Deko) ist in beiden Hälften gleich → misst nur Licht/Glow/Partikel. Software-Raster, CPU-Drosselung.
// node tools/deko_ab.mjs [--port=8731] [--scene=kampf|moos|boss] [--q=3] [--pairs=6] [--secs=3] [--throttle=4] [--profile=sw|gpu]
import { loadPlaywright } from "./pw.mjs";
import { GPU_FLAGS } from "./checks_v9.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const AA = arg("aa", "") === "1", SKIP = +arg("skip", 0), PORT = +arg("port", 8731), SC = arg("scene", "kampf"), Q = +arg("q", 3), PAIRS = +arg("pairs", 6), SECS = +arg("secs", 3), TH = +arg("throttle", 4), PROFILE = arg("profile", "sw");
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chromium", args: PROFILE === "gpu" ? GPU_FLAGS : ["--disable-gpu", "--disable-accelerated-2d-canvas", ...GPU_FLAGS.slice(3)] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 30000 });
await page.waitForFunction(() => KK.audio().pre && KK.audio().pre.done, null, { timeout: 90000 }).catch(() => { });
await page.evaluate(async ([nm, q]) => {
  const w = ms => new Promise(r => setTimeout(r, ms)), G = KK.G;
  window.__ft = []; let last = 0; const tick = t => { if (last && window.__on) window.__ft.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  setInterval(() => KK.perf(true), 1000);
  KK.start({ name: "AB" }); KK.god(true); G.bossDone = [];
  KK.goto(nm === "moos" ? 1 : nm === "kampf" ? 9 : 8); G.portalCd = 1e9; G.homeHideT = 1e9; KK.quality(q);
  if (nm === "boss") { const A = G.L.arena; KK.teleport(A.cx - 3, A.cy - 3); const t0 = performance.now(); while (!(G.boss && G.boss.awake && G.ents.includes(G.boss)) && performance.now() - t0 < 12000) await w(50); await w(2600); } else await w(1800);
  if (nm === "kampf") for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; KK.spawn(["slime", "bat", "wisp", "pilzling"][k % 4], Math.cos(a) * 2.2, Math.sin(a) * 2.2); }
  for (const e of G.ents) e.hp = e.maxHp = 1e7; if (G.boss) G.boss.hp = G.boss.maxHp = 1e8;
  const x0 = G.p.x, y0 = G.p.y; let k = 0;
  setInterval(() => { k++; const p = KK.path(x0 + (k % 2 ? 2.5 : -2.5), y0 + (k % 2 ? 1 : -1)); if (p && p.length) G.p.path = p; }, 1300);
  if (nm !== "moos") setInterval(() => { KK.attack(); }, 650);
}, [SC, Q]);
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: TH });
const res = { on: [], off: [] };
for (let i = 0; i < PAIRS; i++) for (const on of i % 2 ? [false, true] : [true, false]) {
  await page.evaluate(([on, sk]) => { KK.deko(on || window.__aa); KK.R && (window.__dk = window.__dk || null); window.__ft.length = 0; KK.dekoSkip && KK.dekoSkip(sk); }, [on, SKIP]);
  if (AA) await page.evaluate(() => { window.__aa = true; KK.deko(true); });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => { window.__ft.length = 0; window.__on = true; });
  await new Promise(r => setTimeout(r, SECS * 1000));
  const r = await page.evaluate(() => { window.__on = false; const a = window.__ft.slice().sort((x, y) => x - y), n = a.length; return { p50: a[n >> 1], p95: a[Math.floor(n * 0.95)], n, all: window.__ft.slice() }; });
  res[on ? "on" : "off"].push(r);
}
await browser.close();
const med = a => { const v = a.slice().sort((x, y) => x - y); return +((v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2).toFixed(2); };
const s = k => ({ p50: med(res[k].map(r => r.p50)), p95: med(res[k].map(r => r.p95)) });
// Frames aller Fenster zusammen (p95 aus einem Fenster mit ~60 Frames ist nur der drittgrößte Wert → stark verrauscht)
const pool = k => { const a = res[k].flatMap(r => r.all).sort((x, y) => x - y); return { p50: +a[a.length >> 1].toFixed(2), p95: +a[Math.floor(a.length * 0.95)].toFixed(2), n: a.length }; };
const on = pool("on"), off = pool("off");
console.log(`${SC} q${Q} ${PROFILE} ${TH}×: aus p50 ${off.p50} p95 ${off.p95} · an p50 ${on.p50} p95 ${on.p95} · Δp50 ${(on.p50 / off.p50 * 100 - 100).toFixed(1)} % Δp95 ${(on.p95 / off.p95 * 100 - 100).toFixed(1)} % · Fehler ${errors.length}`);
