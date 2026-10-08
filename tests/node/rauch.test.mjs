// Technik-Vorbau: Rauchtest main.js (Attrappen-DOM, siehe rauch_main.mjs) mit allen Reglern — ohne Browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SKRIPT = fileURLToPath(new URL("./rauch_main.mjs", import.meta.url));
for (const q of ["", "takt=0", "auto=0", "post=0", "worker=0", "pbuendel=0", "takt=0&auto=0&post=0&worker=0&pbuendel=0"]) {
  test("main.js bootet und spielt ohne Ausnahme" + (q ? " mit ?" + q : ""), () => {
    let txt;
    try { txt = execFileSync(process.execPath, [SKRIPT, q], { encoding: "utf8", timeout: 60000 }); } catch (e) { txt = String(e.stdout || e); }
    const r = JSON.parse(txt.trim().split("\n").pop());
    assert.ok(r.ok, JSON.stringify(r.fehler || r));
    assert.equal(r.depth, 2);
    if (!q.includes("takt=0")) assert.equal(r.takt.schritte, 500);
    if (q.includes("pbuendel=0")) assert.equal(r.dreh, 0); else assert.ok(r.dreh > 0, "vorgedrehte Partikel-Bilder: " + r.dreh);
  });
}
