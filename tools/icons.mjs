// Erzeugt icons/icon-192.png + icon-512.png aus dem eigenen Art-Code (kein Download)
import { loadPlaywright } from "./pw.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const port = process.argv[2] || 8731;
const { chromium } = loadPlaywright();
const b = await chromium.launch({ args: ["--mute-audio"] });
const page = await b.newPage();
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(() => window.KK && KK.G.L);
mkdirSync("icons", { recursive: true });
for (const size of [192, 512]) {
  const data = await page.evaluate(async (size) => {
    const A = await import("./src/art.js");
    const { SPECIES } = await import("./src/config.js");
    const cv = document.createElement("canvas"); cv.width = cv.height = size;
    const c = cv.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, size); g.addColorStop(0, "#6a3cb0"); g.addColorStop(1, "#ff6f91");
    c.fillStyle = g; c.fillRect(0, 0, size, size);
    const r = c.createRadialGradient(size / 2, size * 0.42, 0, size / 2, size * 0.45, size * 0.5);
    r.addColorStop(0, "rgba(255,240,180,.7)"); r.addColorStop(1, "rgba(255,240,180,0)");
    c.fillStyle = r; c.fillRect(0, 0, size, size);
    const p = document.createElement("canvas");
    const dpr = window.devicePixelRatio; A.portrait(p, SPECIES[0], "krone", size * 1.3 / Math.min(2, dpr));
    c.drawImage(p, -size * 0.15, -size * 0.02, size * 1.3, size * 1.3);
    c.fillStyle = "#fff";
    for (const [x, y, s] of [[0.14, 0.16, 0.05], [0.84, 0.2, 0.04], [0.82, 0.78, 0.035], [0.18, 0.8, 0.03]]) {
      c.save(); c.translate(x * size, y * size); c.beginPath(); const R = s * size;
      c.moveTo(0, -R); c.quadraticCurveTo(0, 0, R, 0); c.quadraticCurveTo(0, 0, 0, R); c.quadraticCurveTo(0, 0, -R, 0); c.quadraticCurveTo(0, 0, 0, -R); c.fill(); c.restore();
    }
    return cv.toDataURL("image/png");
  }, size);
  writeFileSync(`icons/icon-${size}.png`, Buffer.from(data.split(",")[1], "base64"));
  console.log("icons/icon-" + size + ".png");
}
await b.close();
