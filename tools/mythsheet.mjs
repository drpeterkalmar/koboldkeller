// v9: Kontaktbogen — alle Kostüme × 8 Tierarten als große Porträts (+ Zeile „ohne Kostüm“). node tools/mythsheet.mjs [port] [px] [out] [ids]
import { loadPlaywright } from "./pw.mjs";
const port = process.argv[2] || 8731, px = +(process.argv[3] || 120), out = process.argv[4] || "shots/neubau/v9/kontaktbogen.png", only = process.argv[5] ? process.argv[5].split(",") : null;
const { chromium } = loadPlaywright();
const b = await chromium.launch({ channel: "chromium", args: [(process.platform === "darwin" ? "--use-angle=metal" : "--use-angle=default"), "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"] });
const page = await (await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.KK && KK.G && KK.G.L);
const size = await page.evaluate(async ({ px, only }) => {
  const v = "", A = await import("./src/art.js" + v), C = await import("./src/config.js" + v);
  const rows = [{ id: "", name: "ohne Kostüm", emoji: "🙂", tier: "" }, ...C.MYTHS].filter(m => !only || only.includes(m.id) || (!m.id && only.includes("none")));
  const W = 150 + C.SPECIES.length * px, H = 30 + rows.length * px;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
  c.fillStyle = "#2a2440"; c.fillRect(0, 0, W, H);
  c.font = "bold 13px system-ui"; c.fillStyle = "#fff"; c.textBaseline = "middle";
  C.SPECIES.forEach((s, i) => { c.textAlign = "center"; c.fillText(s.name, 150 + i * px + px / 2, 15); });
  const tmp = document.createElement("canvas");
  rows.forEach((m, r) => {
    const y = 30 + r * px;
    c.fillStyle = r % 2 ? "#3a3258" : "#322a4c"; c.fillRect(0, y, W, px);
    c.textAlign = "left"; c.fillStyle = m.tier === "mythisch" ? "#ffd75e" : m.tier === "episch" ? "#d8b4ff" : "#dff0ff";
    c.fillText(m.emoji + " " + m.name, 8, y + px / 2 - 8); c.font = "11px system-ui"; c.fillStyle = "#bbb"; c.fillText(m.tier || "", 8, y + px / 2 + 10); c.font = "bold 13px system-ui";
    C.SPECIES.forEach((s, i) => {
      const L = C.makeLook({ species: s.id, myth: m.id, acc: i === 2 ? "blume" : i === 5 ? "brille" : i === 3 ? "schleife" : "none" });
      A.portrait(tmp, L, null, px / (window.devicePixelRatio || 1));
      c.drawImage(tmp, 150 + i * px, y, px, px);
    });
  });
  document.body.innerHTML = ""; document.body.style.background = "#222"; cv.id = "sheet"; cv.style.display = "block"; document.body.appendChild(cv);
  return [W, H];
}, { px, only });
await page.setViewportSize({ width: size[0], height: size[1] });
await page.locator("#sheet").screenshot({ path: out });
console.log(out, size.join("×"), "Fehler:", errs.length ? errs.join(" | ") : 0);
await b.close();
