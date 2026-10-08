/* backwerk.js — Technik-Etappe E4: Worker, der beim Ebenenwechsel Boden-Chunks und das Fels-Muster in OffscreenCanvas backt
   und als ImageBitmap (transferToImageBitmap, ohne Kopie) an den Hauptthread schickt (MIT).
   Der Hauptthread (render.js) zeichnet weiter selbst, wenn etwas fehlt (Rückfall synchron) — der Worker nimmt ihm nur die
   Spitzen ab. ?worker=0 oder kein OffscreenCanvas → gar kein Worker (wie v13).

   Nachrichten (Hauptthread → Worker):
     { typ: "ebene", id, K, d: { map:{w,h,solid,v,deco}, ring, edgeFront, B, biome, fels, dk, dkSeed } }   neue Ebene, Warteschlange leeren
     { typ: "chunks", id, liste: [[cx, cy], …] }    in dieser Reihenfolge backen (nächste zuerst)
     { typ: "fels", id }                            Fels-Muster (Masse + Tiefe) backen
   Antworten: { typ: "chunk", id, key, leer, bild, ox, oy, W, H, K, ms } · { typ: "fels", id, K, mass, deep, ms } · { typ: "fehler", text }
   Eine veraltete Ebene (id) wird nicht weitergebacken; zwischen zwei Chunks kommen neue Nachrichten dran (setTimeout 0).
   Hinweis Cache-Busting: art/deko/chunkbacken werden mit derselben ?v= wie dieses Skript geladen; deren eigene Importe
   (util, config, myth) nicht — Module Worker kennen die Importmap der Seite nicht. */

/** Worker-Logik an einen Bereich (self im Worker, Attrappe im Node-Test) hängen. mods = { A, D, CB } oder ein Promise darauf */
export function starteBackwerk(scope, mods, Leinwand) {
  let cur = null, q = [], laeuft = false;
  const post = (m, tr) => scope.postMessage(m, tr || []);
  // genau ein Durchlauf zur Zeit (laeuft); zwischen zwei Aufträgen kommen neue Nachrichten dran
  async function pumpe() {
    if (!q.length || !cur) { laeuft = false; return; }
    const job = q.shift();
    try {
      const { A, D, CB } = await mods;
      if (cur && job.id === cur.id) {
        const K = cur.K, t0 = performance.now();
        if (job.typ === "fels") {
          const mk = (fn, W, H) => { const cv = new Leinwand(Math.round(W * K), Math.round(H * K)), g = cv.getContext("2d"); g.scale(cv.width / W, cv.height / H); fn(g, cur.d.B, cur.d.biome); return cv.transferToImageBitmap(); };
          const mass = mk(A.drawRockMass, A.ROCK_W, A.ROCK_H), deep = mk(A.drawRockDeep, A.DEEP_W, A.DEEP_H);
          post({ typ: "fels", id: job.id, K, mass, deep, ms: +(performance.now() - t0).toFixed(1) }, [mass, deep]);
        } else {
          const [cx, cy] = job.c, key = cy * 64 + cx;
          if (CB.chunkLeer(cur.d, cx, cy)) post({ typ: "chunk", id: job.id, key, leer: true, K });
          else {
            const m = CB.chunkMasse(cx, cy), cv = new Leinwand(Math.ceil(m.W * K), Math.ceil(m.H * K)), g = cv.getContext("2d");
            g.scale(K, K);
            CB.backeChunk(g, cur.d, cx, cy, A, D);
            const bild = cv.transferToImageBitmap();
            post({ typ: "chunk", id: job.id, key, leer: false, bild, ox: m.ox, oy: m.oy, W: m.W, H: m.H, K, ms: +(performance.now() - t0).toFixed(1) }, [bild]);
          }
        }
      }
    } catch (e) { post({ typ: "fehler", text: String(e && e.message || e) }); q = []; laeuft = false; return; }
    laeuft = false;
    weiter();
  }
  function weiter() { if (q.length && !laeuft) { laeuft = true; setTimeout(pumpe, 0); } }
  scope.onmessage = (e) => {
    const m = e.data;
    if (m.typ === "ebene") { cur = { id: m.id, K: m.K, d: m.d }; q = []; return; }
    if (!cur || m.id !== cur.id) return;
    if (m.typ === "fels") q.unshift({ typ: "fels", id: m.id });
    else if (m.typ === "chunks") for (const c of m.liste) q.push({ typ: "chunk", id: m.id, c });
    weiter();
  };
  return { warteschlange: () => q.length };
}

// im echten Worker: selbst starten (Module mit derselben Version laden wie dieses Skript)
if (typeof WorkerGlobalScope !== "undefined" && typeof self !== "undefined" && self instanceof WorkerGlobalScope) {
  const v = new URL(self.location.href).search;
  const mods = Promise.all([import("./art.js" + v), import("./deko.js" + v), import("./chunkbacken.js" + v)]).then(([A, D, CB]) => ({ A, D, CB }));
  mods.catch((e) => self.postMessage({ typ: "fehler", text: "Laden: " + (e && e.message || e) }));
  starteBackwerk(self, mods, OffscreenCanvas);
}
