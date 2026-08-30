/* particles.js — Funken, Treffer, Münz-Pops (MIT) */
"use strict";
var Particles = (function () {
  const list = [];
  function spawn(x, y, color, n, spread, up) {
    for (let i = 0; i < n; i++) {
      list.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - (up || 0),
        life: 0.45 + Math.random() * 0.45, t: 0,
        color, size: 2 + Math.random() * 3.5,
      });
    }
    if (list.length > 400) list.splice(0, list.length - 400);
  }
  function step(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t += dt;
      if (p.t > p.life) { list.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function draw(ctx, camX, camY) {
    for (const p of list) {
      const sx = W.isoX(p.x, p.y) - camX;
      const sy = W.isoY(p.x, p.y) - camY - (1 - p.t / p.life) * 16;
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.beginPath(); ctx.ellipse(sx, sy, p.size, p.size, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  return { spawn, step, draw, list };
})();