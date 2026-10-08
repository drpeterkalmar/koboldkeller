// Technik-Vorbau: Rauchtest ohne Browser — main.js mit einem Attrappen-DOM (jede Eigenschaft/Funktion ist eine Attrappe)
// booten, ein Spiel starten und Bilder mit 60/120/30 Hz „zeichnen“. Findet Lade-/Reihenfolge-Fehler (z. B. Variable vor
// ihrer Deklaration benutzt), Ausnahmen in Schleife, Takt, Zwischenbild und Automatik. Prüft NICHT, wie es aussieht.
// Aufruf: node tests/node/rauch_main.mjs [query]   (z. B. "takt=0")
const query = process.argv[2] || "";

const attrappe = (name = "a") => {
  const f = function () { };
  return new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return (hint) => (hint === "string" ? "" : 0);
      if (k === "then") return undefined;
      if (k === "length") return 0;
      if (k === Symbol.iterator) return function* () { };
      if (k in t) return t[k];
      return (t[k] = attrappe(name + "." + String(k)));
    },
    apply() { return attrappe(name + "()"); },
    construct() { return attrappe("new " + name); },
    set(t, k, v) { t[k] = v; return true; },
  });
};
// WebGL2-Attrappe: alles gelingt (Shader, Framebuffer), drawArrays wird gezählt. RAUCH_GL=0 → kein WebGL2 (Rückfall-Weg)
let glZuege = 0;
const fakeGL = () => { const gl = attrappe("gl"); gl.FRAMEBUFFER_COMPLETE = 36053; gl.checkFramebufferStatus = () => 36053; gl.getShaderParameter = () => true;
  gl.getProgramParameter = () => true; gl.isContextLost = () => false; gl.drawArrays = () => { glZuege++; }; return gl; };
const el = () => { const e = attrappe("el"); e.getContext = (typ) => (typ === "webgl2" ? (process.env.RAUCH_GL === "0" ? null : fakeGL()) : attrappe("ctx2d")); e.width = 300; e.height = 150; e.style = { setProperty() { }, removeProperty() { } }; e.classList = { add() { }, remove() { }, toggle() { }, contains: () => false }; e.dataset = {}; e.children = []; e.value = ""; e.checked = false; return e; };
const els = new Map();
globalThis.window = globalThis;
globalThis.innerWidth = 412; globalThis.innerHeight = 915; globalThis.devicePixelRatio = 2;
globalThis.location = { search: query ? "?" + query : "", href: "http://x/", hostname: "x" };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = attrappe("document");
document.getElementById = (id) => { if (!els.has(id)) els.set(id, el()); return els.get(id); };
document.createElement = () => el();
document.querySelector = () => el(); document.querySelectorAll = () => [];
document.addEventListener = () => { }; document.visibilityState = "visible"; document.body = el(); document.documentElement = el();
globalThis.addEventListener = () => { };
globalThis.matchMedia = () => ({ matches: false, addEventListener() { } });
try { Object.defineProperty(globalThis, "navigator", { value: { userAgent: "node", maxTouchPoints: 0, vibrate: () => true }, configurable: true }); } catch (e) { }
globalThis.Audio = function () { return attrappe("audio"); };
for (const k of ["DOMMatrix", "Path2D", "ImageData", "Image"]) globalThis[k] = function () { return attrappe(k); };
let rafCb = null; globalThis.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
let uhr = 0; const echtNow = performance.now.bind(performance);
globalThis.performance.now = () => uhr + echtNow() * 0;   // Uhr steuern wir selbst
const timer = []; globalThis.setTimeout = (fn, ms) => { timer.push([uhr + (ms || 0), fn]); return timer.length; }; globalThis.clearTimeout = () => { };
globalThis.setInterval = () => 0; globalThis.clearInterval = () => { };
globalThis.requestIdleCallback = undefined;

const fehler = [];
process.on("uncaughtException", (e) => { fehler.push(String(e && e.stack || e)); });
console.log = () => { };   // Boot-Meldung leise
const out = (o) => process.stdout.write(JSON.stringify(o) + "\n");

try {
  await import("../../src/main.js");
} catch (e) { out({ ok: false, phase: "laden", fehler: String(e.stack || e) }); process.exit(1); }
const KK = globalThis.KK;
function bilder(n, hz) {
  for (let i = 0; i < n; i++) {
    uhr += 1000 / hz;
    for (let j = timer.length - 1; j >= 0; j--) if (timer[j][0] <= uhr) { const [, fn] = timer.splice(j, 1)[0]; try { fn(); } catch (e) { fehler.push("timer: " + (e.stack || e)); } }
    const cb = rafCb; rafCb = null;
    try { cb(uhr); } catch (e) { fehler.push("bild: " + String(e.stack || e).split("\n").slice(0, 4).join(" | ")); if (fehler.length > 5) return; }
  }
}
bilder(30, 60);
KK.start({ name: "Rauch" }); KK.god(true);
bilder(120, 60);
KK.goto(2);
bilder(60, 120);
for (let i = 0; i < 6; i++) KK.spawn("slime", 1 + i * 0.3, 0.5);
for (let i = 0; i < 40; i++) { KK.attack(); bilder(5, 60); }
bilder(60, 30);
const st = KK.state(), perf = KK.perf(), takt = KK.takt ? KK.takt() : null, auto = KK.auto ? KK.auto() : null;
out({ ok: fehler.length === 0, fehler: fehler.slice(0, 5), depth: st.depth, ents: st.ents, x: st.x, y: st.y, perf: { frames: perf.frames, workP95: perf.workP95, drawP95: perf.drawP95 }, takt, auto: auto && { stufe: auto.stufe, aktiv: auto.aktiv }, dreh: KK.R.pbDreh, post: KK.post ? KK.post() : null, glZuege, rs: KK.R.RS, glow: !!KK.R.gcv });
process.exit(fehler.length ? 1 : 0);
