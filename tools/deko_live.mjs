// Koboldkeller 2 — v13: Live-Prüfung (GitHub Pages): HTTP 200, Version, Boot + Spielstart + Welten, 0 Fehler, Bild hoch + quer.
// node tools/deko_live.mjs [--url=https://drpeterkalmar.github.io/koboldkeller/] [--tag=live_e1]
import { loadPlaywright } from "./pw.mjs";
import { GPU_FLAGS } from "./checks_v9.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.slice(k.length + 3) : d; };
const URL0 = arg("url", "https://drpeterkalmar.github.io/koboldkeller/"), TAG = arg("tag", "live");
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: "chromium", args: GPU_FLAGS });
const out = [];
for (const [w, h] of [[412, 915], [915, 412]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "de-AT" });
  const page = await ctx.newPage(); const errors = [], bad = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("response", r => { if (r.status() >= 400) bad.push(r.status() + " " + r.url()); });
  const resp = await page.goto(URL0 + "?nc=" + Date.now());
  await page.waitForFunction(() => window.KK && KK.G && KK.G.L, null, { timeout: 45000 });
  const menu = await page.evaluate(() => ({ ver: window.KK_VER, kk: KK.version, txt: (document.body.innerText.match(/Koboldkeller 2 · v\d+/) || [""])[0] }));
  const st = await page.evaluate(async () => { const wt = ms => new Promise(r => setTimeout(r, ms)); KK.start({ name: "Live" }); KK.god(true); const r = [];
    for (const d of [1, 5, 9, 13, 17]) { KK.goto(d); await wt(700); r.push(KK.deko().walls); } KK.goto(17); await wt(2600); return { walls: r, deko: KK.deko() }; });
  await page.screenshot({ path: `tests/shots/deko/${TAG}_${w > h ? "quer" : "hoch"}.png` });
  out.push({ fmt: w > h ? "quer" : "hoch", http: resp.status(), ...menu, wallsDeko: st.walls, shafts: st.deko.shafts, errors, bad });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out));
