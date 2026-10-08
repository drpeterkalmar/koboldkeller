// Technik-Vorbau: Rauchtest main.js (Attrappen-DOM, siehe rauch_main.mjs) mit allen Reglern — ohne Browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SKRIPT = fileURLToPath(new URL("./rauch_main.mjs", import.meta.url));
for (const q of ["", "takt=0", "auto=0", "post=0", "worker=0", "pbuendel=0", "takt=0&auto=0&post=0&worker=0&pbuendel=0"]) {
  test("main.js bootet und spielt ohne Ausnahme" + (q ? " mit ?" + q : ""), () => {
    let txt;
    try { txt = execFileSync(process.execPath, [SKRIPT, q], { encoding: "utf8", timeout: 60000, env: { ...process.env, RAUCH_GL: "1" } }); } catch (e) { txt = String(e.stdout || e); }
    const r = JSON.parse(txt.trim().split("\n").pop());
    assert.ok(r.ok, JSON.stringify(r.fehler || r));
    assert.equal(r.depth, 2);
    if (!q.includes("takt=0")) assert.equal(r.takt.schritte, 500 + 150);
    if (q.includes("pbuendel=0")) assert.equal(r.dreh, 0); else assert.ok(r.dreh > 0, "vorgedrehte Partikel-Bilder: " + r.dreh);
    if (q.includes("post=0")) { assert.equal(r.post.an, false); assert.equal(r.glZuege, 0); assert.equal(r.rs, 2); assert.equal(r.glow, false); }
    else { assert.equal(r.post.an, true, JSON.stringify(r.post)); assert.ok(r.post.bilder > 300 && r.glZuege === r.post.bilder * 3, r.glZuege + " Züge"); assert.equal(r.rs, 1.6); assert.ok(r.glow); }
  });
}

test("ohne WebGL2: Rückfall auf reines 2D, Auflösung wie v13", () => {
  const txt = execFileSync(process.execPath, [SKRIPT, ""], { encoding: "utf8", timeout: 60000, env: { ...process.env, RAUCH_GL: "0" } });
  const r = JSON.parse(txt.trim().split("\n").pop());
  assert.ok(r.ok, JSON.stringify(r.fehler));
  assert.equal(r.post.an, false); assert.equal(r.post.grund, "kein WebGL2"); assert.equal(r.rs, 2); assert.equal(r.glow, false);
});

for (const q of ["", "worker=0"]) test("Back-Worker (Attrappe mit echter backwerk.js)" + (q ? " mit ?" + q : ""), () => {
  const txt = execFileSync(process.execPath, [SKRIPT, q], { encoding: "utf8", timeout: 90000, env: { ...process.env, RAUCH_GL: "1", RAUCH_WORKER: "1" } });
  const r = JSON.parse(txt.trim().split("\n").pop());
  assert.ok(r.ok, JSON.stringify(r.fehler));
  assert.equal(r.blende, false, "Blende wieder offen");
  if (q) { assert.equal(r.worker.an, false); assert.equal(r.worker.geliefert, 0); return; }
  assert.equal(r.worker.an, true, JSON.stringify(r.worker));
  const sync = r.worker.sync - r.vorBlende.sync, verw = r.worker.verworfen - r.vorBlende.verworfen, gel = r.worker.geliefert - r.vorBlende.geliefert;
  assert.ok(gel >= 10 && sync <= 2 && verw <= 2, "Ebenenwechsel: " + JSON.stringify({ gel, sync, verw }));
  assert.equal(r.worker.fehler, null);
  assert.ok(r.worker.felsWorker, "Fels-Muster vom Worker");
});
