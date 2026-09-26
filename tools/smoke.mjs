// Schneller Rauchtest: lädt, startet, macht Screenshots. node tools/smoke.mjs [port] [steps…]
import { loadPlaywright } from "./pw.mjs";
const { chromium } = loadPlaywright();
const port = process.argv[2] || 8731;
const steps = process.argv.slice(3);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/neubau/_smoke_menu.png" });
for (const s of steps) {
  const i = s.indexOf("="), cmd = s.slice(0, i), arg = s.slice(i + 1);
  if (cmd === "eval") { try { console.log(JSON.stringify(await page.evaluate(arg))); } catch (e) { console.log("EVAL FAIL", e.message.split("\n")[0]); console.log(errs.join("\n")); } }
  else if (cmd === "wait") await page.waitForTimeout(+arg);
  else if (cmd === "shot") await page.screenshot({ path: `shots/neubau/_smoke_${arg}.png` });
  else if (cmd === "tap") { const [x, y] = arg.split(",").map(Number); await page.touchscreen.tap(x, y); }
}
console.log(errs.length ? errs.join("\n") : "no errors");
await browser.close();
