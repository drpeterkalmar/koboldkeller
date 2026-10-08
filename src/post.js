/* post.js — Technik-Etappe E3: „Kino-Look 2D“ — WebGL2-Endbild über dem Canvas-2D-Zeichner (MIT)

   Canvas 2D zeichnet weiter alles. Neu ist nur der letzte Schritt: das fertige 2D-Bild wird als Textur in WebGL2 geladen und
   dort fertig gemacht:
     • Hochskalieren + Nachschärfen (CAS, nach AMD FidelityFX „Contrast Adaptive Sharpening“): die 2D-Szene rendert mit
       Skala 0,8 … 0,5 (statt 1 … 0,5) und sieht trotzdem scharf aus → das bezahlt den GPU-Durchgang.
     • Bloom aus der vorhandenen Glow-Ebene: glowPass (Fackeln, Portale, Auren, Lichtstrahlen …) zeichnet bei aktivem Endbild in
       eine eigene Leinwand mit halber Auflösung; hier wird sie zweimal weichgezeichnet (Viertel-Auflösung) und als Schein
       dazugegeben. Scharfe Dinge (Rundumschlag-Sichel, Spezial-Ring, additive Partikel) bleiben in der Szene.
     • Farbkorrektur je Welt (Stadt neutral, Kerker kühl, Glutkeller warm), weich überblendet beim Ebenenwechsel.
     • Wärmeflimmern im Glutkeller (leichtes Wabern der Bildkoordinaten).
     • Vignette im Shader (ersetzt die 2D-Vignette in der Lightmap, gleiche Form und Weltfarbe wie v13) + Dither gegen Streifen.
   Rückfall auf reines 2D (wie v13): ?post=0, kein WebGL2, Shader-Fehler, Kontextverlust → POST.an = false, render.js stellt
   Auflösung, Glow und Vignette wie bisher wieder her (main.js ruft dann resize()).
   Reine Teile (Tabellen, Kern, Maße) sind ohne Browser getestet: tests/node/post.test.mjs.
   TODO Heavy-Job: alle Zahlen in GRADE/POST_STUFEN/SCHAERFE sind Startwerte — nur am Bild abstimmbar (A/B-Collage). */

// ---------------------------------------------------------------- reine Teile (Node-testbar)

/** je Stufe (0 = beste … 3): Skala der 2D-Szene und des Endbilds, jeweils relativ zur Gerätepixeldichte (gedeckelt auf 2).
    v13 ohne Endbild: Szene 1 / 0,8 / 0,65 / 0,5. */
export const POST_STUFEN = [
  { szene: 0.8, aus: 1.0 },
  { szene: 0.72, aus: 1.0 },
  { szene: 0.65, aus: 0.85 },
  { szene: 0.5, aus: 0.72 },
];
export const SCHAERFE = { hoch: 0.55, nativ: 0.2 };   // CAS-Stärke beim Hochskalieren bzw. ohne Skalierung (TODO Bild)

/** Pixelmaße für Szene (2D), Glow-Ebene, Bloom-Puffer und Endbild. dpr wird wie bisher auf 2 gedeckelt; bei dpr ≈ 1
    (Desktop) wird die Szene nicht unter 1 gerechnet (sonst wäre sie weicher als heute). */
export function postMasse(VW, VH, dprRoh, q) {
  const dpr = Math.min(2, dprRoh || 1), st = POST_STUFEN[Math.max(0, Math.min(POST_STUFEN.length - 1, q))];
  const RS = Math.max(Math.min(1, dpr), dpr * st.szene);
  const aus = Math.max(RS, dpr * st.aus);
  const sw = Math.round(VW * RS), sh = Math.round(VH * RS);
  const gw = Math.max(1, Math.ceil(sw / 2)), gh = Math.max(1, Math.ceil(sh / 2));
  return { RS, sw, sh, gw, gh, bw: Math.max(1, Math.ceil(gw / 2)), bh: Math.max(1, Math.ceil(gh / 2)),
    ow: Math.round(VW * aus), oh: Math.round(VH * aus), skala: RS / aus };
}

/** Farbkorrektur je Welt (Index wie BIOMES: 0 Stadt, 1 Moos, 2 Kristall, 3 Zucker, 4 Frost, 5 Glut).
    lift/gamma/gain je Kanal, sat = Sättigung, kon = Kontrast, glow/bloom = Stärke Glow-Ebene/Schein, vign = Vignetten-Stärke
    (1 = wie v13), heat = Wärmeflimmern. Startwerte, TODO: am Bild abstimmen. */
export const GRADE = [
  { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], sat: 1.04, kon: 1.03, glow: 1, bloom: 0.35, vign: 1, heat: 0 },                     // Stadt: neutral
  { lift: [0, 0.004, 0.01], gamma: [1, 1.01, 1.02], gain: [0.98, 1, 1.02], sat: 1.03, kon: 1.06, glow: 1, bloom: 0.5, vign: 1, heat: 0 },     // Moos: kühl-grün
  { lift: [0, 0.006, 0.016], gamma: [0.99, 1, 1.03], gain: [0.96, 1, 1.05], sat: 1.05, kon: 1.06, glow: 1, bloom: 0.6, vign: 1, heat: 0 },   // Kristall: kühl-blau
  { lift: [0.012, 0, 0.008], gamma: [1.02, 1, 1.01], gain: [1.03, 0.99, 1.01], sat: 1.04, kon: 1.03, glow: 1, bloom: 0.55, vign: 1, heat: 0 }, // Zucker: zart rosa
  { lift: [0, 0.008, 0.02], gamma: [0.98, 1, 1.04], gain: [0.95, 1, 1.06], sat: 0.97, kon: 1.05, glow: 1, bloom: 0.55, vign: 1, heat: 0 },   // Frost: kalt
  { lift: [0.015, 0.004, 0], gamma: [1.04, 1, 0.97], gain: [1.06, 0.99, 0.92], sat: 1.06, kon: 1.07, glow: 1, bloom: 0.7, vign: 1, heat: 1 },  // Glut: warm + Flimmern
];
const SKALAR = ["sat", "kon", "glow", "bloom", "vign", "heat"], VEK = ["lift", "gamma", "gain"];
export function kopiereGrade(g) { const o = {}; for (const k of SKALAR) o[k] = g[k]; for (const k of VEK) o[k] = g[k].slice(); return o; }
/** a ← a + (b − a)·t (für das weiche Überblenden beim Ebenenwechsel) */
export function mischeGrade(a, b, t) {
  for (const k of SKALAR) a[k] += (b[k] - a[k]) * t;
  for (const k of VEK) for (let i = 0; i < 3; i++) a[k][i] += (b[k][i] - a[k][i]) * t;
  return a;
}

/** Gauß-Kern (Radius r Texel, sigma) für lineares Sampling: Mitte + 4 Paare (je Seite 4 Abrufe statt 8).
    Liefert { w0, off[4], wt[4] } — Summe w0 + 2·Σwt = 1. */
export function blurKern(sigma = 3.2, r = 8) {
  const g = []; let s = 0;
  for (let i = 0; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); g.push(v); s += i ? 2 * v : v; }
  for (let i = 0; i <= r; i++) g[i] /= s;
  const off = [], wt = [];
  for (let i = 1; i <= r; i += 2) { const a = g[i], b = g[i + 1] || 0, w = a + b; wt.push(w); off.push(w > 0 ? (i * a + (i + 1) * b) / w : i); }
  while (wt.length < 4) { wt.push(0); off.push(0); }
  return { w0: g[0], off: off.slice(0, 4), wt: wt.slice(0, 4) };
}

const hex3 = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
/** Vignette wie v13 (render.js makeVignette): Weiß → (#f4f0f6 bei 55 %) → Weltfarbe; Stadt ohne Weltfarbe: Weiß → #6a5a7a */
export function vignStopps(col) {
  if (!col) { const e = hex3("#6a5a7a"); return { mitte: e.map((v) => 1 + (v - 1) * 0.55), rand: e }; }
  return { mitte: hex3("#f4f0f6"), rand: hex3(col) };
}

// ---------------------------------------------------------------- Shader

const VS = `#version 300 es
out vec2 uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Weichzeichnen in einer Richtung (lineares Sampling: 1 + 2×4 Abrufe ≈ 17-Texel-Gauß)
const FS_BLUR = `#version 300 es
precision highp float;
uniform sampler2D tex;
uniform vec2 dir;
uniform float w0;
uniform vec4 off;
uniform vec4 wt;
in vec2 uv;
out vec4 o;
void main() {
  vec3 c = texture(tex, uv).rgb * w0;
  for (int i = 0; i < 4; i++) {
    vec2 d = dir * off[i];
    c += (texture(tex, uv + d).rgb + texture(tex, uv - d).rgb) * wt[i];
  }
  o = vec4(c, 1.0);
}`;

const FS_END = `#version 300 es
precision highp float;
uniform sampler2D szene;
uniform sampler2D glow;
uniform sampler2D bloom;
uniform vec2 szPx;        // 1 / Szenen-Texturgröße
uniform float scharf;     // CAS 0 … 1
uniform vec3 lift;
uniform vec3 gam;
uniform vec3 gain;
uniform float sat;
uniform float kon;
uniform float glowK;
uniform float bloomK;
uniform vec3 vMitte;
uniform vec3 vRand;
uniform float vignK;
uniform vec2 res;         // Bildgröße in CSS-px (für die runde Vignette)
uniform float heat;
uniform float zeit;
in vec2 uv;
out vec4 o;

// Contrast Adaptive Sharpening (vereinfachte Fassung von AMD FidelityFX CAS, 5 Abrufe im Kreuz)
vec3 cas(vec2 p) {
  vec3 a = texture(szene, p + vec2(0.0, -szPx.y)).rgb;
  vec3 b = texture(szene, p + vec2(-szPx.x, 0.0)).rgb;
  vec3 c = texture(szene, p).rgb;
  vec3 d = texture(szene, p + vec2(szPx.x, 0.0)).rgb;
  vec3 e = texture(szene, p + vec2(0.0, szPx.y)).rgb;
  vec3 mn = min(min(min(a, b), min(d, e)), c);
  vec3 mx = max(max(max(a, b), max(d, e)), c);
  vec3 amp = sqrt(clamp(min(mn, 2.0 - mx) / max(mx, vec3(1e-4)), 0.0, 1.0));
  vec3 w = amp * (-1.0 / mix(8.0, 5.0, scharf));
  return clamp((c + (a + b + d + e) * w) / (1.0 + 4.0 * w), 0.0, 1.0);
}

void main() {
  vec2 q = uv;
  if (heat > 0.0) {                       // Wärmeflimmern: zwei langsame Wellen, oben (hinten) etwas stärker
    float s = sin(q.y * 85.0 + zeit * 3.1) * 0.6 + sin(q.y * 31.0 - zeit * 2.2 + q.x * 9.0) * 0.4;
    float k = heat * (0.6 + 0.4 * q.y);
    q.x += s * k * 0.0014;
    q.y += sin(q.x * 63.0 + zeit * 2.6) * k * 0.0007;
  }
  vec3 c = scharf > 0.0 ? cas(q) : texture(szene, q).rgb;
  // Vignette wie v13 (Mitte bei 48 % von oben = 52 % von unten), multipliziert wie früher die Lightmap
  vec2 px = (q - vec2(0.5, 0.51)) * res;
  float r0 = 0.25 * min(res.x, res.y), r1 = 0.62 * length(res);
  float t = clamp((length(px) - r0) / (r1 - r0), 0.0, 1.0);
  vec3 v = t < 0.55 ? mix(vec3(1.0), vMitte, t / 0.55) : mix(vMitte, vRand, (t - 0.55) / 0.45);
  c *= mix(vec3(1.0), v, vignK);
  // Glow-Ebene (wie früher „lighter“: Summe mit Deckel) + weicher Schein
  c = min(c + texture(glow, q).rgb * glowK, 1.0);
  c = min(c + texture(bloom, q).rgb * bloomK, 1.0);
  // Farbkorrektur: Lift/Gamma/Gain, Sättigung, Kontrast
  c = pow(max(c * gain + lift * (1.0 - c), 0.0), 1.0 / gam);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, sat);
  c = (c - 0.5) * kon + 0.5;
  // Dither gegen Streifen in Verläufen (Vignette, Schein)
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  o = vec4(clamp(c + (n - 0.5) / 255.0, 0.0, 1.0), 1.0);
}`;

export const SHADER = { VS, FS_BLUR, FS_END };   // für die statischen Prüfungen in tests/node/post.test.mjs

// ---------------------------------------------------------------- Zustand + WebGL

export const POST = {
  an: false, grund: "aus", gl: null, cv: null, masse: null, zeit: 0, bilder: 0, fehler: null,
  grade: kopiereGrade(GRADE[0]), biome: 0,
};
let S = null;               // WebGL-Objekte
let onAus = null;           // Rückfall-Meldung an main.js (resize)

function shader(gl, typ, src) {
  const s = gl.createShader(typ);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error("Shader: " + log); }
  return s;
}
function programm(gl, fs, uniforms) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Link: " + gl.getProgramInfoLog(p));
  const u = {}; for (const n of uniforms) u[n] = gl.getUniformLocation(p, n);
  return { p, u };
}
function textur(gl) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function puffer(gl, w, h) {
  const t = textur(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) throw new Error("Framebuffer unvollständig");
  return { t, f, w, h };
}

/** Endbild einschalten. cv2d = Canvas des 2D-Zeichners (bleibt für Eingaben zuständig, wird unsichtbar).
    aus(grund) wird bei späterem Rückfall (Kontextverlust) aufgerufen. Liefert true, wenn das Endbild läuft. */
export function postInit(cv2d, opts = {}) {
  onAus = opts.aus || null;
  if (opts.an === false) { POST.grund = "?post=0"; return false; }
  try {
    const cv = document.createElement("canvas");
    const gl = cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) { POST.grund = "kein WebGL2"; return false; }
    const blur = programm(gl, FS_BLUR, ["tex", "dir", "w0", "off", "wt"]);
    const end = programm(gl, FS_END, ["szene", "glow", "bloom", "szPx", "scharf", "lift", "gam", "gain", "sat", "kon", "glowK", "bloomK", "vMitte", "vRand", "vignK", "res", "heat", "zeit"]);
    const vao = gl.createVertexArray();
    S = { gl, cv, blur, end, vao, tSzene: textur(gl), tGlow: textur(gl), A: null, B: null, kern: blurKern() };
    cv.id = "post";
    cv.style.cssText = "position:absolute;left:0;top:0;width:100vw;height:100dvh;display:block;pointer-events:none";
    cv2d.after(cv);
    cv2d.style.opacity = "0";                                  // bekommt weiter alle Berührungen, sichtbar ist das Endbild
    cv.addEventListener("webglcontextlost", () => postAus("Kontextverlust"));
    POST.cv = cv; POST.gl = gl; POST.an = true; POST.grund = "an"; POST.cv2d = cv2d;
    return true;
  } catch (e) {
    POST.fehler = String(e && e.message || e); POST.grund = "Fehler";
    if (S && S.cv && S.cv.parentNode) S.cv.remove();
    S = null; POST.an = false;
    return false;
  }
}

/** zurück auf reines 2D (v13-Weg): Endbild ausblenden, 2D-Canvas wieder sichtbar; main.js ruft danach resize() */
export function postAus(grund) {
  if (!POST.an) return;
  POST.an = false; POST.grund = grund || "aus";
  if (POST.cv) POST.cv.style.display = "none";
  if (POST.cv2d) POST.cv2d.style.opacity = "";
  if (onAus) onAus(POST.grund);
}

/** Größen setzen (aus render.js resize). m = postMasse(…) */
export function postGroesse(m) {
  if (!POST.an || !S) return;
  POST.masse = m;
  const gl = S.gl;
  if (S.cv.width !== m.ow || S.cv.height !== m.oh) { S.cv.width = m.ow; S.cv.height = m.oh; }
  if (m.VW) { S.cv.style.width = m.VW + "px"; S.cv.style.height = m.VH + "px"; }   // genau wie der 2D-Canvas
  try {
    if (!S.A || S.A.w !== m.bw || S.A.h !== m.bh) {
      for (const P of [S.A, S.B]) if (P) { gl.deleteTexture(P.t); gl.deleteFramebuffer(P.f); }
      S.A = puffer(gl, m.bw, m.bh); S.B = puffer(gl, m.bw, m.bh);
    }
  } catch (e) { POST.fehler = String(e.message || e); postAus("Puffer"); }
}

function hochladen(gl, t, quelle, premul) {
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premul);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, quelle);
}

/** Ein Endbild. szene = 2D-Canvas, glowCv = Glow-Leinwand (halbe Auflösung), biome = Welt-Index, vignCol = Weltfarbe
    der Vignette (oder null), VW/VH = CSS-px, dt = Sekunden */
export function postBild(szene, glowCv, biome, vignCol, VW, VH, dt) {
  if (!POST.an || !S || !POST.masse) return;
  const gl = S.gl;
  if (gl.isContextLost()) { postAus("Kontextverlust"); return; }
  POST.zeit += dt; POST.bilder++;
  const ziel = GRADE[biome] || GRADE[0];
  mischeGrade(POST.grade, ziel, 1 - Math.exp(-dt * 3));       // ≈ 1 s Überblendung beim Ebenenwechsel
  POST.biome = biome;
  const g = POST.grade, m = POST.masse, k = S.kern;
  gl.bindVertexArray(S.vao);
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  // 1) Texturen: Szene (deckend) und Glow-Ebene (vormultipliziert: Farben sind schon „Licht-Summen“)
  gl.activeTexture(gl.TEXTURE0); hochladen(gl, S.tSzene, szene, false);
  gl.activeTexture(gl.TEXTURE1); hochladen(gl, S.tGlow, glowCv, true);
  // 2) Schein: Glow → (waagrecht, halbe Größe) A → (senkrecht) B
  gl.useProgram(S.blur.p);
  gl.uniform1f(S.blur.u.w0, k.w0); gl.uniform4fv(S.blur.u.off, k.off); gl.uniform4fv(S.blur.u.wt, k.wt);
  gl.uniform1i(S.blur.u.tex, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, S.A.f); gl.viewport(0, 0, S.A.w, S.A.h);
  gl.uniform2f(S.blur.u.dir, 1.5 / m.gw, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, S.A.t);
  gl.uniform1i(S.blur.u.tex, 2);
  gl.bindFramebuffer(gl.FRAMEBUFFER, S.B.f);
  gl.uniform2f(S.blur.u.dir, 0, 1.5 / S.A.h);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // 3) Endbild
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, m.ow, m.oh);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, S.B.t);
  const u = S.end.u, vs = vignStopps(vignCol);
  gl.useProgram(S.end.p);
  gl.uniform1i(u.szene, 0); gl.uniform1i(u.glow, 1); gl.uniform1i(u.bloom, 2);
  gl.uniform2f(u.szPx, 1 / m.sw, 1 / m.sh);
  gl.uniform1f(u.scharf, m.skala < 0.98 ? SCHAERFE.hoch : SCHAERFE.nativ);
  gl.uniform3fv(u.lift, g.lift); gl.uniform3fv(u.gam, g.gamma); gl.uniform3fv(u.gain, g.gain);
  gl.uniform1f(u.sat, g.sat); gl.uniform1f(u.kon, g.kon); gl.uniform1f(u.glowK, g.glow); gl.uniform1f(u.bloomK, g.bloom);
  gl.uniform3fv(u.vMitte, vs.mitte); gl.uniform3fv(u.vRand, vs.rand); gl.uniform1f(u.vignK, g.vign);
  gl.uniform2f(u.res, VW, VH); gl.uniform1f(u.heat, g.heat); gl.uniform1f(u.zeit, POST.zeit % 1000);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function postZustand() {
  return { an: POST.an, grund: POST.grund, fehler: POST.fehler, bilder: POST.bilder, biome: POST.biome, masse: POST.masse,
    grade: { sat: +POST.grade.sat.toFixed(3), bloom: +POST.grade.bloom.toFixed(3), heat: +POST.grade.heat.toFixed(3) } };
}
