/*
 * Efek hidup: debu cahaya (canvas), pusaran partikel untuk opening,
 * parallax mengikuti kursor, sorotan cahaya, dan tilt 3D pada kartu.
 */
(() => {
  "use strict";

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const small = () => Math.min(window.innerWidth, window.innerHeight) < 560;
  const isReduced = () => Boolean(window.deckMotionReduced) || reducedQuery.matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- sprites ---------- */
  const spriteCache = new Map();
  function sprite(rgb) {
    const key = rgb.map((v) => Math.round(v / 6)).join(",");
    if (spriteCache.has(key)) return spriteCache.get(key);
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    grad.addColorStop(0.22, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.55)`);
    grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    if (spriteCache.size > 60) spriteCache.clear();
    spriteCache.set(key, c);
    return c;
  }
  const PALETTE = { gold: [236, 204, 130], ivory: [250, 244, 226], amber: [255, 170, 80], aqua: [150, 226, 232] };

  function fitCanvas(canvas, ctx, maxDpr) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  /* =====================================================================
     Debu cahaya di dalam deck
     ===================================================================== */
  const MOODS = [
    { rgb: PALETTE.gold, vy: -10, vx: 3, count: 1, size: 1.5, streak: true },
    { rgb: [190, 232, 214], vy: -9, vx: 4, count: 0.9, size: 1.4, streak: false },
    { rgb: PALETTE.amber, vy: -14, vx: 2, count: 1, size: 1.5, streak: false },
    { rgb: PALETTE.amber, vy: -22, vx: 5, count: 1, size: 1.8, streak: false },
    { rgb: PALETTE.aqua, vy: -5, vx: 8, count: 0.85, size: 1.3, streak: true },
    { rgb: [205, 232, 190], vy: -8, vx: -5, count: 1, size: 1.5, streak: false },
    { rgb: [170, 205, 255], vy: -4, vx: 6, count: 0.9, size: 1.3, streak: true },
    { rgb: PALETTE.ivory, vy: 3, vx: 2, count: 0.8, size: 1.3, streak: true },
    { rgb: [190, 240, 170], vy: -18, vx: 4, count: 1, size: 1.7, streak: false },
    { rgb: PALETTE.aqua, vy: -26, vx: 2, count: 0.85, size: 1.9, streak: false },
    { rgb: [255, 206, 120], vy: -7, vx: 3, count: 0.9, size: 1.4, streak: false },
    { rgb: PALETTE.gold, vy: -20, vx: 4, count: 1.25, size: 1.8, streak: true, fireworks: true }
  ];

  class Dust {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.parts = [];
      this.sparks = [];
      this.streaks = [];
      this.t = 0;
      this.max = small() ? 50 : 120;
      this.mood = { ...MOODS[0], rgb: [...MOODS[0].rgb] };
      this.target = MOODS[0];
      this.nextStreak = 4;
      this.nextFirework = 2;
      this.pointer = { x: -999, y: -999 };
      this.size = { w: 1, h: 1 };
      this.spriteTick = 0;
      this.sprite = sprite(this.mood.rgb);
      for (let i = 0; i < this.max; i++) this.parts.push(this.make(true));
    }
    make(anywhere) {
      const bokeh = Math.random() < 0.09;
      return {
        x: Math.random(), y: anywhere ? Math.random() : 1.05, z: 0.25 + Math.random() * 0.75,
        ph: Math.random() * 6.28, tw: 0.6 + Math.random() * 1.6, bokeh,
        s: bokeh ? 14 + Math.random() * 26 : 0.8 + Math.random() * 1.6, ox: 0, oy: 0
      };
    }
    setMood(index) {
      this.target = MOODS[index % MOODS.length];
      this.nextFirework = 0.6;
    }
    burst(x, y, n = 40, rgb = null, speed = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, v = (120 + Math.random() * 520) * speed;
        this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 1 + Math.random() * 1.4, s: 1.2 + Math.random() * 2.6, rgb: rgb || (Math.random() < 0.55 ? PALETTE.gold : Math.random() < 0.5 ? PALETTE.ivory : PALETTE.amber) });
      }
    }
    update(dt) {
      const m = this.mood, tg = this.target, k = 1 - Math.pow(0.002, dt);
      for (let i = 0; i < 3; i++) m.rgb[i] = lerp(m.rgb[i], tg.rgb[i], k);
      m.vy = lerp(m.vy, tg.vy, k); m.vx = lerp(m.vx, tg.vx, k);
      m.count = lerp(m.count, tg.count, k); m.size = lerp(m.size, tg.size, k);
      m.streak = tg.streak; m.fireworks = tg.fireworks;
      if (++this.spriteTick % 8 === 0) this.sprite = sprite(m.rgb);
      const { w, h } = this.size;
      const active = Math.round(this.max * clamp(m.count, 0.3, 1.3));
      this.t += dt;
      for (let i = 0; i < this.parts.length; i++) {
        const p = this.parts[i];
        if (i >= active) { p.dim = Math.max(0, (p.dim ?? 1) - dt * 1.2); } else { p.dim = Math.min(1, (p.dim ?? 0) + dt * 0.8); }
        const depth = 0.4 + p.z;
        p.x += ((m.vx * depth + Math.sin(this.t * 0.4 + p.ph) * 5) * dt) / w;
        p.y += (m.vy * depth * dt) / h;
        if (p.ox || p.oy) { p.x += (p.ox * dt) / w; p.y += (p.oy * dt) / h; p.ox *= 0.94; p.oy *= 0.94; }
        if (p.y < -0.06) p.y = 1.06; else if (p.y > 1.06) p.y = -0.06;
        if (p.x < -0.05) p.x = 1.05; else if (p.x > 1.05) p.x = -0.05;
        if (finePointer) {
          const dx = p.x * w - this.pointer.x, dy = p.y * h - this.pointer.y, d2 = dx * dx + dy * dy;
          if (d2 < 16900) { const d = Math.sqrt(d2) || 1, f = (1 - d / 130) * 90; p.ox += (dx / d) * f * dt * 8; p.oy += (dy / d) * f * dt * 8; }
        }
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.life += dt;
        if (s.life > s.max) { this.sparks.splice(i, 1); continue; }
        s.vx *= 0.975; s.vy = s.vy * 0.975 + 18 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      }
      if (m.streak && !isReduced()) {
        this.nextStreak -= dt;
        if (this.nextStreak <= 0) {
          this.nextStreak = 6 + Math.random() * 6;
          const a = (18 + Math.random() * 16) * (Math.PI / 180), sp = 900 + Math.random() * 500;
          this.streaks.push({ x: Math.random() * w * 0.7, y: Math.random() * h * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.8, len: 220 + Math.random() * 140 });
        }
      }
      for (let i = this.streaks.length - 1; i >= 0; i--) {
        const s = this.streaks[i];
        s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.life > s.max) this.streaks.splice(i, 1);
      }
      if (m.fireworks) {
        this.nextFirework -= dt;
        if (this.nextFirework <= 0) {
          this.nextFirework = 1.6 + Math.random() * 1.8;
          const rgb = [PALETTE.gold, PALETTE.ivory, PALETTE.amber][Math.floor(Math.random() * 3)];
          this.burst(w * (0.12 + Math.random() * 0.76), h * (0.12 + Math.random() * 0.42), small() ? 26 : 46, rgb, 0.7);
        }
      }
    }
    draw() {
      const { w, h } = this.size, ctx = this.ctx, m = this.mood;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of this.parts) {
        const a = (p.bokeh ? 0.07 : 0.2 + 0.55 * p.z) * (0.55 + 0.45 * Math.sin(this.t * p.tw + p.ph)) * (p.dim ?? 1);
        if (a <= 0.01) continue;
        const s = (p.bokeh ? p.s : p.s * m.size * (0.5 + p.z)) * (p.bokeh ? 1 : 3.2);
        ctx.globalAlpha = a;
        ctx.drawImage(this.sprite, p.x * w - s, p.y * h - s, s * 2, s * 2);
      }
      for (const s of this.sparks) {
        const u = s.life / s.max;
        ctx.globalAlpha = (1 - u) * (1 - u) * 0.95;
        const r = s.s * 6 * (1 - u * 0.5);
        ctx.drawImage(sprite(s.rgb), s.x - r, s.y - r, r * 2, r * 2);
      }
      for (const s of this.streaks) {
        const u = s.life / s.max, fade = Math.sin(u * Math.PI);
        const mag = Math.hypot(s.vx, s.vy), ux = s.vx / mag, uy = s.vy / mag;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - ux * s.len, s.y - uy * s.len);
        g.addColorStop(0, `rgba(255,244,214,${0.9 * fade})`);
        g.addColorStop(1, "rgba(255,244,214,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - ux * s.len, s.y - uy * s.len); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /* =====================================================================
     Pusaran partikel untuk opening
     ===================================================================== */
  class Swirl {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.count = small() ? 150 : 300;
      this.parts = Array.from({ length: this.count }, () => ({
        a: Math.random() * 6.283, r: 0.35 + Math.random() * 0.85, d: Math.random() * 1.1, dur: 1.9 + Math.random() * 1.2,
        s: 1 + Math.random() * 2.4, turns: 0.6 + Math.random() * 0.9, col: Math.random() < 0.6 ? PALETTE.gold : PALETTE.ivory
      }));
      this.sparks = [];
      this.start = 0;
      this.running = false;
      this.cx = 0; this.cy = 0; this.maxR = 1;
      this.burstDone = false;
    }
    begin(cx, cy) {
      this.cx = cx; this.cy = cy;
      this.start = performance.now();
      this.running = true;
      this.burstDone = false;
      this.sparks = [];
    }
    burst() {
      this.burstDone = true;
      const n = small() ? 130 : 260;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, v = 160 + Math.random() * 900;
        this.sparks.push({ x: this.cx, y: this.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 1.1 + Math.random() * 1.6, s: 1 + Math.random() * 2.8, rgb: Math.random() < 0.55 ? PALETTE.gold : Math.random() < 0.5 ? PALETTE.ivory : PALETTE.amber });
      }
    }
    stop() { this.running = false; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    frame(dt) {
      if (!this.running) return;
      const { w, h } = fitCanvas(this.canvas, this.ctx, small() ? 1.25 : 1.5);
      const ctx = this.ctx;
      this.maxR = Math.hypot(w, h) * 0.55;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,.2)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const t = (performance.now() - this.start) / 1000;
      for (const p of this.parts) {
        const u = clamp((t - p.d) / p.dur, 0, 1);
        if (u <= 0 || u >= 1) continue;
        const e = easeInOut(u);
        const rad = p.r * this.maxR * Math.pow(1 - e, 1.7);
        const ang = p.a + e * p.turns * 6.283;
        const x = this.cx + Math.cos(ang) * rad, y = this.cy + Math.sin(ang) * rad * 0.72;
        const a = Math.sin(u * Math.PI) * 0.9;
        const s = p.s * 5;
        ctx.globalAlpha = a;
        ctx.drawImage(sprite(p.col), x - s, y - s, s * 2, s * 2);
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.life += dt;
        if (s.life > s.max) { this.sparks.splice(i, 1); continue; }
        s.vx *= 0.972; s.vy = s.vy * 0.972 + 24 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const u = s.life / s.max;
        ctx.globalAlpha = (1 - u) * (1 - u);
        const r = s.s * 6 * (1 - u * 0.4);
        ctx.drawImage(sprite(s.rgb), s.x - r, s.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /* =====================================================================
     Loop utama
     ===================================================================== */
  const root = document.getElementById("presentation");
  const dustCanvas = document.getElementById("dust");
  const openCanvas = document.getElementById("openCanvas");
  const stage = document.getElementById("sceneStage");
  const spot = document.getElementById("spotlight");

  const dust = dustCanvas ? new Dust(dustCanvas) : null;
  const swirl = openCanvas ? new Swirl(openCanvas) : null;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -999, py: -999, active: false, last: 0 };
  const par = { x: 0, y: 0, ox: 0, oy: 0 };
  let last = performance.now();
  let hidden = document.hidden;
  let staticDrawn = false;

  function loop(now) {
    requestAnimationFrame(loop);
    if (hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // parallax target: pointer, or a slow idle drift so the scene never freezes
    const idle = now - pointer.last > 3500 || !pointer.active;
    const time = now / 1000;
    const tx = idle ? Math.sin(time * 0.21) * 0.55 : pointer.tx;
    const ty = idle ? Math.cos(time * 0.17) * 0.45 : pointer.ty;
    const reduced = isReduced();
    if (!reduced) {
      par.x = lerp(par.x, tx, 1 - Math.pow(0.04, dt));
      par.y = lerp(par.y, ty, 1 - Math.pow(0.04, dt));
      if (Math.abs(par.x - par.ox) > 0.0008 || Math.abs(par.y - par.oy) > 0.0008) {
        par.ox = par.x; par.oy = par.y;
        if (stage) { stage.style.setProperty("--mx", par.x.toFixed(4)); stage.style.setProperty("--my", par.y.toFixed(4)); }
        const shell = document.querySelector("#slideContent .slide-shell:last-child");
        if (shell) shell.style.translate = `${(-par.x * 7).toFixed(2)}px ${(-par.y * 5).toFixed(2)}px`;
      }
      if (spot && finePointer && pointer.active) {
        pointer.px = lerp(pointer.px < -900 ? pointer.x : pointer.px, pointer.x, 1 - Math.pow(0.0008, dt));
        pointer.py = lerp(pointer.py < -900 ? pointer.y : pointer.py, pointer.y, 1 - Math.pow(0.0008, dt));
        spot.style.transform = `translate3d(${pointer.px.toFixed(1)}px, ${pointer.py.toFixed(1)}px, 0)`;
      }
    }

    if (dust) {
      if (reduced) {
        if (!staticDrawn) { dust.size = fitCanvas(dust.canvas, dust.ctx, 1); dust.ctx.clearRect(0, 0, dust.size.w, dust.size.h); staticDrawn = true; }
      } else {
        staticDrawn = false;
        dust.size = fitCanvas(dust.canvas, dust.ctx, small() ? 1.25 : 1.5);
        dust.pointer.x = pointer.x; dust.pointer.y = pointer.y;
        dust.update(dt);
        dust.draw();
      }
    }
    if (swirl) swirl.frame(dt);
  }

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    pointer.x = event.clientX; pointer.y = event.clientY;
    pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    pointer.active = true; pointer.last = performance.now();
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { hidden = document.hidden; });

  /* ---------- tilt 3D untuk kartu ---------- */
  if (finePointer) {
    let tiltEl = null, raf = 0, ev = null;
    const apply = () => {
      raf = 0;
      if (!tiltEl || !ev || isReduced()) return;
      const r = tiltEl.getBoundingClientRect();
      const px = clamp((ev.clientX - r.left) / r.width, 0, 1), py = clamp((ev.clientY - r.top) / r.height, 0, 1);
      tiltEl.style.setProperty("--ry", `${((px - 0.5) * 10).toFixed(2)}deg`);
      tiltEl.style.setProperty("--rx", `${((0.5 - py) * 8).toFixed(2)}deg`);
      tiltEl.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      tiltEl.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    const reset = (el) => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); el.classList.remove("is-tilting"); };
    document.addEventListener("pointermove", (event) => {
      const el = event.target instanceof Element ? event.target.closest(".tilt") : null;
      if (tiltEl && tiltEl !== el) reset(tiltEl);
      tiltEl = el; ev = event;
      if (el) { el.classList.add("is-tilting"); if (!raf) raf = requestAnimationFrame(apply); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => { if (tiltEl) reset(tiltEl); tiltEl = null; }, true);
  }

  requestAnimationFrame((t) => { last = t; loop(t); });

  window.DeckFXLive = {
    setMood(index) { dust?.setMood(index); },
    burst(nx = 0.7, ny = 0.5, n = 70) {
      if (!dust || isReduced()) return;
      dust.burst(window.innerWidth * nx, window.innerHeight * ny, small() ? Math.round(n * 0.6) : n);
    },
    openingStart(cx, cy) { if (swirl && !isReduced()) swirl.begin(cx, cy); },
    openingBurst() { if (swirl && !isReduced()) swirl.burst(); },
    openingStop() { swirl?.stop(); }
  };
})();
