/*
 * Dunia visual per slide.
 * Tiap scene tersusun dari beberapa layer SVG statis yang digerakkan lewat CSS
 * (rotasi, napas, melayang, riak, dsb.), sehingga ringan di GPU dan tetap hidup
 * selama slide tampil. Tidak ada gambar eksternal.
 */
(() => {
  "use strict";

  const GOLD = "#d2ad64";
  const GOLD_HI = "#f1d79a";
  const IVORY = "#f3eee0";
  const C = 400;
  const f = (n) => +n.toFixed(2);
  let uidCounter = 0;
  const uid = (p = "g") => `${p}${++uidCounter}`;

  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- geometry helpers ---------- */
  const pt = (r, deg, cx = C, cy = C) => [f(cx + r * Math.cos((deg * Math.PI) / 180)), f(cy + r * Math.sin((deg * Math.PI) / 180))];
  const ngon = (n, r, rot = -90, cx = C, cy = C) => Array.from({ length: n }, (_, i) => pt(r, rot + (360 / n) * i, cx, cy));
  const closed = (pts) => `M${pts.map((p) => p.join(" ")).join("L")}Z`;
  const starPts = (n, R, r, rot = -90, cx = C, cy = C) => Array.from({ length: n * 2 }, (_, i) => pt(i % 2 ? r : R, rot + (180 / n) * i, cx, cy));

  const circle = (r, a = "", cx = C, cy = C) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${a}/>`;
  const ellipse = (rx, ry, a = "", cx = C, cy = C) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${a}/>`;
  const path = (d, a = "") => `<path d="${d}" ${a}/>`;
  const line = (p1, p2, a = "") => `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" ${a}/>`;
  const rect = (x, y, w, h, a = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${a}/>`;

  function rays(n, r1, r2, a = "", alt = null, rot = 0, cx = C, cy = C) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const long = alt ? alt(i) : r2;
      s += line(pt(r1, rot + (360 / n) * i, cx, cy), pt(long, rot + (360 / n) * i, cx, cy), typeof a === "function" ? a(i) : a);
    }
    return s;
  }
  function ticks(n, r1, r2, majorEvery, r3, a = "") {
    let s = "";
    for (let i = 0; i < n; i++) {
      const major = majorEvery && i % majorEvery === 0;
      s += line(pt(major ? r3 : r1, (360 / n) * i - 90), pt(r2, (360 / n) * i - 90), `${a} ${major ? 'stroke-opacity=".9"' : 'stroke-opacity=".4"'}`);
    }
    return s;
  }
  function dots(n, r, size, a = "", rot = -90, cx = C, cy = C, bigEvery = 0, bigSize = 0) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const big = bigEvery && i % bigEvery === 0;
      const p = pt(r, rot + (360 / n) * i, cx, cy);
      s += `<circle cx="${p[0]}" cy="${p[1]}" r="${big ? bigSize : size}" ${a}/>`;
    }
    return s;
  }
  const sparkle = (x, y, s, a = "") => `<path d="M${x} ${f(y - s)}Q${x} ${y} ${f(x + s)} ${y}Q${x} ${y} ${x} ${f(y + s)}Q${x} ${y} ${f(x - s)} ${y}Q${x} ${y} ${x} ${f(y - s)}Z" ${a}/>`;

  function sparkles(seed, count, { minR = 80, maxR = 380, size = [5, 13], cx = C, cy = C, box = null } = {}) {
    const rnd = seeded(seed);
    let s = "";
    for (let i = 0; i < count; i++) {
      let x, y;
      if (box) { x = box[0] + rnd() * (box[2] - box[0]); y = box[1] + rnd() * (box[3] - box[1]); }
      else {
        const a = rnd() * 360;
        const r = minR + rnd() * (maxR - minR);
        [x, y] = pt(r, a, cx, cy);
      }
      s += sparkle(x, y, f(size[0] + rnd() * (size[1] - size[0])), `fill="${i % 3 ? GOLD_HI : IVORY}" stroke="none"`);
    }
    return s;
  }
  function pinpoints(seed, count, box, size = [0.8, 2.2], color = IVORY) {
    const rnd = seeded(seed);
    let s = "";
    for (let i = 0; i < count; i++) {
      s += `<circle cx="${f(box[0] + rnd() * (box[2] - box[0]))}" cy="${f(box[1] + rnd() * (box[3] - box[1]))}" r="${f(size[0] + rnd() * (size[1] - size[0]))}" fill="${color}" stroke="none"/>`;
    }
    return s;
  }

  /* ---------- svg + layer wrappers ---------- */
  const svg = (inner, a = "", vb = "0 0 800 800") =>
    `<svg viewBox="${vb}" fill="none" stroke="${GOLD}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${a}>${inner}</svg>`;

  function radial(id, stops) {
    return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops.map(([o, c, al]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${al}"/>`).join("")}</radialGradient>`;
  }
  function linear(id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
    return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, al]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${al}"/>`).join("")}</linearGradient>`;
  }
  function glow(color, alpha, r = 400, cx = C, cy = C) {
    const id = uid("gl");
    return svg(`<defs>${radial(id, [[0, color, alpha], [0.45, color, alpha * 0.32], [1, color, 0]])}</defs>${circle(r, `fill="url(#${id})" stroke="none"`, cx, cy)}`);
  }

  /** layer(inner, opts) -> HTML string. opts.anim = css class(es) for the looping motion. */
  function layer(inner, { anim = "", d, dl, z = 0, o = "", style = "", inner2 = "", wide = false, blend = "" } = {}) {
    const vars = `${d != null ? `--d:${d}s;` : ""}${dl != null ? `--dl:${dl}s;` : ""}${o ? `transform-origin:${o};` : ""}${blend ? `mix-blend-mode:${blend};` : ""}${style}`;
    const body = inner2 ? inner2.replace("%%", inner) : inner;
    return `<div class="sl" style="--z:${z}"><div class="se"><div class="sa ${anim}${wide ? " wide" : ""}" style="${vars}">${body}</div></div></div>`;
  }
  const origin = (x, y) => `${f((x / 800) * 100)}% ${f((y / 800) * 100)}%`;

  function crescent(c1, r1, c2, r2) {
    const dx = c2[0] - c1[0], dy = c2[1] - c1[1];
    const d = Math.hypot(dx, dy);
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(r1 * r1 - a * a, 0));
    const mx = c1[0] + (a * dx) / d, my = c1[1] + (a * dy) / d;
    const p1 = [f(mx + (h * dy) / d), f(my - (h * dx) / d)];
    const p2 = [f(mx - (h * dy) / d), f(my + (h * dx) / d)];
    const top = p1[1] < p2[1] ? p1 : p2;
    const bottom = top === p1 ? p2 : p1;
    return `M${top.join(" ")}A${r1} ${r1} 0 1 0 ${bottom.join(" ")}A${r2} ${r2} 0 1 1 ${top.join(" ")}Z`;
  }
  function wavePath(y, amp, period, width, phase = 0) {
    let dd = `M0 ${y}`;
    const half = period / 2;
    for (let x = 0, i = 0; x < width; x += half, i++) {
      const dir = (i + phase) % 2 ? 1 : -1;
      dd += `q${half / 2} ${amp * dir} ${half} 0`;
    }
    return dd;
  }
  function dunePath(y0, amp, phase) {
    let dd = "";
    for (let x = -60; x <= 860; x += 20) {
      const y = y0 + amp * Math.sin(x / 130 + phase) + amp * 0.5 * Math.sin(x / 57 + phase * 2);
      dd += `${dd ? "L" : "M"}${x} ${f(y)}`;
    }
    return { line: dd, fill: `${dd}L860 820L-60 820Z` };
  }
  function archPath(w, h, base, cx = C) {
    return `M${cx - w} ${base}V${f(base - h * 0.52)}C${cx - w} ${f(base - h * 0.78)} ${f(cx - w * 0.45)} ${f(base - h * 0.9)} ${cx} ${base - h}C${f(cx + w * 0.45)} ${f(base - h * 0.9)} ${cx + w} ${f(base - h * 0.78)} ${cx + w} ${f(base - h * 0.52)}V${base}`;
  }
  function leaf(jx, jy, dir, len = 170, rise = 60) {
    const L = len * dir;
    return {
      shape: `M${jx} ${jy}C${jx + L * 0.25} ${jy - rise} ${jx + L * 0.72} ${jy - rise * 1.1} ${jx + L} ${jy - rise * 0.5}C${jx + L * 0.72} ${jy + rise * 0.25} ${jx + L * 0.28} ${jy + rise * 0.2} ${jx} ${jy}Z`,
      rib: `M${jx} ${jy}Q${jx + L * 0.5} ${jy - rise * 0.55} ${jx + L * 0.92} ${jy - rise * 0.48}`
    };
  }

  /* =====================================================================
     SCENES
     ===================================================================== */
  const scenes = [];

  /* 1 — Mandala agung (judul) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#d2ad64", 0.34, 400), { anim: "breathe", d: 9 }));
    L.push(layer(svg(rays(36, 170, 395, (i) => `stroke-opacity="${i % 3 === 0 ? 0.5 : 0.22}"`, (i) => (i % 3 === 0 ? 395 : i % 2 ? 320 : 355))), { anim: "spin", d: 220, z: 0.08 }));
    L.push(layer(svg(
      circle(388, 'class="dr"') + circle(372, 'class="dr" stroke-opacity=".35"') + ticks(120, 372, 381, 10, 366) + dots(8, 388, 5, `fill="${GOLD_HI}" stroke="none"`)
    ), { anim: "spin rev", d: 260, z: 0.12 }));
    let petals = "";
    for (let i = 0; i < 16; i++) {
      const a = (360 / 16) * i - 90;
      petals += path(`M${pt(190, a).join(" ")}Q${pt(232, a + 7).join(" ")} ${pt(272, a).join(" ")}Q${pt(232, a - 7).join(" ")} ${pt(190, a).join(" ")}Z`, 'class="dr"');
    }
    L.push(layer(svg(
      path(closed(ngon(4, 330, 45)), 'class="dr"') + path(closed(ngon(4, 330, 0)), 'class="dr"') + circle(300, 'class="dr" stroke-opacity=".4"') + petals
    ), { anim: "spin", d: 150, z: 0.16 }));
    let flower = circle(164, 'class="dr" stroke-opacity=".5"');
    for (let i = 0; i < 8; i++) flower += circle(82, 'class="dr"', ...pt(82, i * 45, 0, 0).map((v) => f(C + v)));
    L.push(layer(svg(flower), { anim: "spin rev", d: 100, z: 0.24 }));
    L.push(layer(svg(
      path(closed(starPts(8, 130, 74)), 'class="dr" fill="rgba(210,173,100,.08)"') + path(closed(ngon(4, 60, 45)), 'class="dr"') + circle(54, 'class="dr"')
    ), { anim: "spin", d: 70, z: 0.3 }));
    const id = uid("co");
    L.push(layer(svg(`<defs>${radial(id, [[0, "#fff4cf", 1], [0.3, GOLD_HI, 0.8], [1, GOLD, 0]])}</defs>${circle(120, `fill="url(#${id})" stroke="none"`)}${circle(14, `fill="${IVORY}" stroke="none"`)}`), { anim: "breathe fast", d: 3.6, z: 0.36 }));
    [[388, 36, 5.5, false], [330, 52, 4.5, true], [262, 28, 4, false]].forEach(([r, dur, s, rev], i) => {
      L.push(layer(svg(dots(1, r, s, `fill="${GOLD_HI}" stroke="none"`) + dots(1, r, s * 2.6, `fill="${GOLD_HI}" fill-opacity=".18" stroke="none"`)), { anim: `spin${rev ? " rev" : ""}`, d: dur, z: 0.4 + i * 0.03 }));
    });
    for (let i = 0; i < 3; i++) L.push(layer(svg(sparkles(11 + i * 7, 9, { minR: 120, maxR: 390 })), { anim: "twinkle", d: 3.8 + i, dl: i * 1.1, z: 0.5 }));
    return L;
  });

  /* 2 — Empat penopang (kelompok) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#2fb89a", 0.24, 400), { anim: "breathe", d: 10 }));
    const corners = ngon(4, 330, -90);
    let nodes = "";
    corners.forEach((p) => {
      nodes += circle(26, 'class="dr" fill="rgba(8,24,17,.9)"', p[0], p[1]);
      nodes += path(closed(starPts(8, 15, 7, -90, p[0], p[1])), `fill="${GOLD_HI}" stroke="none"`);
      nodes += circle(40, 'stroke-opacity=".25"', p[0], p[1]);
    });
    L.push(layer(svg(path(closed(corners), 'class="dr"') + path(closed(ngon(4, 232, -90)), 'class="dr" stroke-opacity=".5"') + rays(4, 40, 330, 'stroke-opacity=".4"', null, -90) + nodes), { anim: "spin", d: 100, z: 0.12 }));
    let venn = "";
    for (let i = 0; i < 4; i++) {
      const [cx, cy] = pt(112, i * 90 - 90);
      venn += circle(158, `fill="rgba(210,173,100,.035)" class="dr" ${i % 2 ? 'stroke="#f1d79a" stroke-opacity=".55"' : ""}`, cx, cy);
    }
    L.push(layer(svg(venn + circle(270, 'class="dr" stroke-opacity=".3" stroke-dasharray="2 9"')), { anim: "spin rev", d: 80, z: 0.22 }));
    L.push(layer(svg(rays(8, 50, 322, 'class="flow" stroke-opacity=".5"')), { anim: "spin", d: 160, z: 0.26 }));
    L.push(layer(svg(circle(70, 'class="dr"') + circle(44, 'class="dr" stroke-opacity=".6"') + path(closed(starPts(4, 30, 10, -90)), `fill="${GOLD_HI}" stroke="none"`)), { anim: "breathe", d: 5, z: 0.34 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(circle(60, 'stroke-opacity=".7"')), { anim: "ripple", d: 6, dl: i * 2, o: "50% 50%", z: 0.3 }));
    L.push(layer(svg(dots(4, 330, 5.5, `fill="${GOLD_HI}" stroke="none"`)), { anim: "spin", d: 26, z: 0.4 }));
    L.push(layer(svg(dots(4, 232, 4, `fill="${IVORY}" stroke="none"`, 0)), { anim: "spin rev", d: 38, z: 0.42 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(sparkles(31 + i * 5, 8, { minR: 100, maxR: 385 })), { anim: "twinkle", d: 4 + i, dl: i * 0.9, z: 0.5 }));
    return L;
  });

  /* 3 — Mihrab cahaya (kata pengantar) */
  scenes.push(() => {
    const L = [];
    const base = 700;
    L.push(layer(glow("#e5a950", 0.34, 380, 400, 440), { anim: "breathe", d: 8 }));
    const rid = uid("ry");
    const wedge = (x1, x2) => `<path d="M400 150L${x1} ${base}L${x2} ${base}Z" fill="url(#${rid})" stroke="none"/>`;
    const wedges = wedge(250, 330) + wedge(340, 460) + wedge(470, 550);
    L.push(layer(svg(`<defs>${linear(rid, [[0, "#fff1c4", 0.55], [0.6, GOLD_HI, 0.12], [1, GOLD, 0]])}</defs>${wedges}`), { anim: "sway", d: 9, o: origin(400, 150), z: 0.1 }));
    L.push(layer(svg(`<defs>${linear(rid + "b", [[0, "#fff1c4", 0.4], [1, GOLD, 0]])}</defs><path d="M400 150L190 ${base}L270 ${base}Z" fill="url(#${rid}b)" stroke="none"/><path d="M400 150L530 ${base}L610 ${base}Z" fill="url(#${rid}b)" stroke="none"/>`), { anim: "pulse", d: 7, dl: 1.5, z: 0.12 }));
    const aid = uid("ar");
    L.push(layer(svg(
      `<defs>${radial(aid, [[0, "#ffd78a", 0.5], [1, "#e5a950", 0]])}</defs><path d="${archPath(115, 290, base)}Z" fill="url(#${aid})" stroke="none"/>` +
      [[250, 560], [205, 470], [160, 380], [115, 290]].map(([w, h]) => path(archPath(w, h, base), 'class="dr"')).join("") +
      line([150, base], [650, base], 'class="dr"') + line([128, base + 14], [672, base + 14], 'class="dr" stroke-opacity=".4"') +
      line([150, 290], [150, base], 'stroke-opacity=".25"') + line([650, 290], [650, base], 'stroke-opacity=".25"')
    ), { z: 0.22 }));
    let floor = "";
    for (let i = 0; i < 9; i++) floor += path(closed(starPts(8, 15, 7, -90, 130 + i * 67, base + 52)), 'class="dr" stroke-opacity=".6"');
    L.push(layer(svg(floor), { z: 0.26 }));
    const lid = uid("la");
    L.push(layer(svg(
      line([400, -20], [400, 318], 'stroke-opacity=".7"') +
      `<defs>${radial(lid, [[0, "#ffe6a8", 0.9], [1, "#e5a950", 0]])}</defs>` + circle(70, `fill="url(#${lid})" stroke="none"`, 400, 372) +
      path(closed(ngon(6, 30, -90, 400, 372)), 'class="dr" fill="rgba(255,214,130,.25)"') + line([400, 342], [400, 402], 'stroke-opacity=".6"') + circle(8, `fill="${IVORY}" stroke="none"`, 400, 372)
    ), { anim: "sway lamp", d: 6.5, o: origin(400, 0), z: 0.34 }));
    const cr = crescent([400, 106], 36, [412, 98], 30);
    L.push(layer(svg(path(cr, `fill="${GOLD_HI}" fill-opacity=".85" stroke="none"`) + path(cr, 'class="dr"') + path(closed(starPts(5, 12, 5, -90, 438, 86)), `fill="${GOLD_HI}" stroke="none"`)), { anim: "float", d: 6, z: 0.4 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(pinpoints(51 + i * 9, 26, [180, 380, 620, 780], [1, 2.8], GOLD_HI)), { anim: "rise", d: 16 + i * 5, dl: i * 4, z: 0.5 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(sparkles(61 + i * 3, 8, { box: [170, 160, 630, 620], size: [5, 12] })), { anim: "twinkle", d: 4.2 + i, dl: i, z: 0.55 }));
    return L;
  });

  /* 4 — Fajar di atas bukit (latar belakang) */
  scenes.push(() => {
    const L = [];
    const hy = 520;
    L.push(layer(glow("#f0a04a", 0.5, 560, 400, hy), { anim: "breathe", d: 8 }));
    L.push(layer(svg(pinpoints(71, 40, [20, 20, 780, 330], [0.8, 2], IVORY)), { anim: "twinkle", d: 5, z: 0.1 }));
    L.push(layer(svg(pinpoints(72, 30, [20, 20, 780, 300], [0.8, 1.8], GOLD_HI)), { anim: "twinkle", d: 7, dl: 2, z: 0.12 }));
    L.push(layer(svg(rays(44, 150, 760, (i) => `stroke-opacity="${i % 2 ? 0.14 : 0.3}"`, null, 0, 400, hy)), { anim: "spin", d: 140, o: origin(400, hy), z: 0.14 }));
    const sid = uid("su");
    L.push(layer(svg(
      `<defs>${radial(sid, [[0, "#fffbe6", 1], [0.55, "#ffd488", 0.95], [1, "#f0a04a", 0.85]])}</defs>` +
      circle(118, `fill="url(#${sid})" stroke="none"`, 400, hy) + circle(134, 'class="dr" stroke-opacity=".7"', 400, hy) + circle(158, 'class="dr" stroke-opacity=".35"', 400, hy)
    ), { anim: "sunrise", z: 0.2, inner2: '<div class="sa2 breathe" style="--d:7s">%%</div>' }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(circle(150, 'stroke-opacity=".6"', 400, hy)), { anim: "ripple", d: 7, dl: i * 2.3, o: origin(400, hy), z: 0.22 }));
    const duneBack = dunePath(hy + 10, 22, 0.4), duneMid = dunePath(hy + 70, 28, 2.1), duneFront = dunePath(hy + 140, 34, 4.3);
    L.push(layer(svg(path(duneBack.fill, 'fill="#0f2c21" fill-opacity=".92" stroke="none"') + path(duneBack.line, 'stroke-opacity=".5"')), { anim: "drift", d: 34, z: 0.3 }));
    L.push(layer(svg(path(duneMid.fill, 'fill="#0a1f17" fill-opacity=".96" stroke="none"') + path(duneMid.line, 'stroke-opacity=".4"')), { anim: "drift rev", d: 26, z: 0.5 }));
    L.push(layer(svg(path(duneFront.fill, 'fill="#06130d" stroke="none"') + path(duneFront.line, 'stroke-opacity=".28"')), { anim: "drift", d: 20, z: 0.8 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(pinpoints(81 + i * 7, 22, [60, 420, 740, 800], [1, 2.4], "#ffd488")), { anim: "rise", d: 14 + i * 5, dl: i * 3, z: 0.6 }));
    return L;
  });

  /* 5 — Kompas arah (tujuan) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#3aa6b8", 0.24, 400), { anim: "breathe", d: 10 }));
    L.push(layer(svg(circle(384, 'class="dr"') + circle(366, 'class="dr" stroke-opacity=".4"') + ticks(180, 366, 376, 5, 358)), { anim: "spin rev", d: 300, z: 0.1 }));
    L.push(layer(svg(circle(322, 'class="dr" stroke-dasharray="3 10" stroke-opacity=".6"') + ngon(8, 322, -90).map((p) => path(closed(ngon(3, 11, -90, p[0], p[1])), `fill="${GOLD_HI}" stroke="none"`)).join("")), { anim: "spin", d: 130, z: 0.16 }));
    const rose = (R, Rd, rn, rot) => closed(Array.from({ length: 16 }, (_, i) => pt(i % 4 === 0 ? R : i % 2 === 0 ? Rd : rn, rot + 22.5 * i - 90)));
    L.push(layer(svg(path(rose(300, 190, 62, 0), 'class="dr" fill="rgba(210,173,100,.07)"') + path(rose(210, 140, 50, 22.5), 'class="dr" stroke-opacity=".55"') + circle(120, 'class="dr" stroke-opacity=".5"')), { z: 0.22 }));
    L.push(layer(svg(circle(190, 'class="dr" stroke-dasharray="2 8" stroke-opacity=".6"') + circle(250, 'class="dr" stroke-opacity=".25"')), { anim: "spin rev", d: 60, z: 0.26 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(circle(70, 'stroke-opacity=".7"')), { anim: "ripple", d: 6, dl: i * 2, z: 0.28 }));
    L.push(layer(svg(
      path("M400 108L432 400L368 400Z", `fill="${GOLD}" fill-opacity=".92" stroke="${GOLD_HI}"`) + path("M400 692L432 400L368 400Z", `fill="${IVORY}" fill-opacity=".3" stroke="${IVORY}" stroke-opacity=".5"`) +
      circle(17, `fill="#0b2b20" stroke="${GOLD_HI}"`) + circle(6, `fill="${GOLD_HI}" stroke="none"`)
    ), { anim: "needle", z: 0.4 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(sparkles(91 + i * 5, 8, { minR: 130, maxR: 390 })), { anim: "twinkle", d: 4 + i, dl: i, z: 0.5 }));
    return L;
  });

  /* 6 — Tiga lingkaran (hubungan aqidah, tauhid, ibadah) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#2fa37a", 0.26, 400), { anim: "breathe", d: 9 }));
    const cols = ["#d2ad64", "#35b585", "#4a86d6"];
    let big = "";
    for (let i = 0; i < 3; i++) {
      const [cx, cy] = pt(108, i * 120 - 90);
      const id = uid("tr");
      big += `<defs>${radial(id, [[0, cols[i], 0.05], [0.7, cols[i], 0.2], [1, cols[i], 0.34]])}</defs>` + circle(192, `fill="url(#${id})" stroke="none"`, cx, cy) + circle(192, `class="dr" stroke="${cols[i]}" stroke-opacity=".9"`, cx, cy);
    }
    L.push(layer(svg(big), { anim: "spin", d: 170, z: 0.2, blend: "screen" }));
    let thin = "";
    for (let i = 0; i < 3; i++) { const [cx, cy] = pt(70, i * 120 + 30); thin += circle(262, 'class="dr" stroke-opacity=".35" stroke-dasharray="1 8"', cx, cy); }
    L.push(layer(svg(thin + circle(372, 'class="dr" stroke-opacity=".3"')), { anim: "spin rev", d: 120, z: 0.14 }));
    L.push(layer(svg(path(closed(ngon(3, 108, -90)), 'class="dr"') + path(closed(ngon(3, 108, 90)), 'class="dr" stroke-opacity=".5"') + circle(108, 'class="dr" stroke-opacity=".45"') + circle(42, 'class="dr"')), { anim: "spin", d: 64, z: 0.3 }));
    L.push(layer(svg(rays(3, 50, 388, 'stroke-opacity=".4" stroke-dasharray="3 9"', null, -90)), { anim: "spin rev", d: 90, z: 0.28 }));
    L.push(layer(svg(dots(3, 300, 6, `fill="${GOLD_HI}" stroke="none"`) + dots(3, 300, 15, `fill="${GOLD_HI}" fill-opacity=".14" stroke="none"`)), { anim: "spin", d: 34, z: 0.4 }));
    L.push(layer(svg(dots(3, 218, 4.5, `fill="${IVORY}" stroke="none"`, 90)), { anim: "spin rev", d: 46, z: 0.42 }));
    const cid = uid("cg");
    L.push(layer(svg(`<defs>${radial(cid, [[0, "#fff4cf", 1], [0.4, GOLD_HI, 0.5], [1, GOLD, 0]])}</defs>${circle(90, `fill="url(#${cid})" stroke="none"`)}${circle(10, `fill="${IVORY}" stroke="none"`)}`), { anim: "breathe fast", d: 3.4, z: 0.46 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(sparkles(101 + i * 4, 8, { minR: 100, maxR: 390 })), { anim: "twinkle", d: 4 + i, dl: i, z: 0.55 }));
    return L;
  });

  /* 7 — Bola dunia & orbit (tiga dimensi tauhid) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#3b78c4", 0.3, 420), { anim: "breathe", d: 10 }));
    let lat = circle(300, 'class="dr"');
    [-60, -30, 0, 30, 60].forEach((a) => {
      const r = 300 * Math.cos((a * Math.PI) / 180), y = C + 300 * Math.sin((a * Math.PI) / 180);
      lat += ellipse(f(r), f(r * 0.2), 'class="dr" stroke-opacity=".38"', C, f(y));
    });
    L.push(layer(svg(lat + line([C, 60], [C, 740], 'stroke-opacity=".4"') + circle(5, `fill="${GOLD_HI}" stroke="none"`, C, 60) + circle(5, `fill="${GOLD_HI}" stroke="none"`, C, 740)), { z: 0.16 }));
    for (let i = 0; i < 6; i++) L.push(layer(svg(circle(300, 'stroke-opacity=".5"')), { anim: "merid", d: 42, dl: -i * 7, z: 0.18 }));
    let orbit = "";
    [0, 60, 120].forEach((rot) => { orbit += `<g transform="rotate(${rot} 400 400)">${ellipse(372, 140, 'class="dr" stroke="#f3eee0" stroke-opacity=".34"')}</g>`; });
    L.push(layer(svg(orbit), { anim: "spin", d: 240, z: 0.26 }));
    [[0, 9], [60, 12.5], [120, 16]].forEach(([tilt, dur], i) => {
      const dot = svg(circle(9, `fill="${GOLD_HI}" stroke="none"`, 400, 28) + circle(22, `fill="${GOLD_HI}" fill-opacity=".2" stroke="none"`, 400, 28));
      L.push(`<div class="sl" style="--z:${0.4 + i * 0.03}"><div class="se"><div class="sa" style="transform:rotate(${tilt}deg)"><div class="sa" style="transform:scaleY(.378)"><div class="sa spin" style="--d:${dur}s">${dot}</div></div></div></div></div>`);
    });
    const nid = uid("nu");
    L.push(layer(svg(`<defs>${radial(nid, [[0, "#fffbe6", 1], [0.35, "#ffd488", 0.95], [0.75, "#d2ad64", 0.65], [1, "#d2ad64", 0.35]])}</defs>${circle(62, `fill="url(#${nid})" stroke="none"`)}${circle(78, 'class="dr" stroke-opacity=".7"')}${circle(96, 'class="dr" stroke-opacity=".3"')}`), { anim: "breathe", d: 5, z: 0.36 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(circle(80, 'stroke-opacity=".6"')), { anim: "ripple", d: 6, dl: i * 2, z: 0.34 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(pinpoints(111 + i * 3, 36, [20, 20, 780, 780], [0.8, 2], IVORY)), { anim: "twinkle", d: 5 + i * 2, dl: i, z: 0.6 }));
    return L;
  });

  /* 8 — Masjid malam & tasbih (uluhiyyah, asma wa sifat) */
  scenes.push(() => {
    const L = [];
    const gy = 640;
    L.push(layer(glow("#2b5f9e", 0.34, 460, 400, 300), { anim: "breathe", d: 10 }));
    L.push(layer(svg(pinpoints(121, 46, [10, 10, 790, 420], [0.8, 2.2], IVORY)), { anim: "twinkle", d: 5, z: 0.1 }));
    L.push(layer(svg(pinpoints(122, 34, [10, 10, 790, 400], [0.8, 2], GOLD_HI)), { anim: "twinkle", d: 7, dl: 2, z: 0.12 }));
    const mc = crescent([620, 168], 46, [636, 156], 38);
    const mid = uid("mo");
    L.push(layer(svg(`<defs>${radial(mid, [[0, "#fff4cf", 0.5], [1, "#fff4cf", 0]])}</defs>${circle(130, `fill="url(#${mid})" stroke="none"`, 620, 168)}${path(mc, `fill="${GOLD_HI}" fill-opacity=".92" stroke="none"`)}${path(mc, 'class="dr"')}`), { anim: "float", d: 8, z: 0.2 }));
    const cy = 470;
    L.push(layer(svg(
      circle(318, 'class="dr" stroke-opacity=".5"', 400, cy) + circle(332, 'class="dr" stroke-opacity=".22"', 400, cy) +
      dots(99, 325, 2.7, `fill="${GOLD_HI}" stroke="none"`, -90, 400, cy, 33, 6.5)
    ), { anim: "spin", d: 320, o: origin(400, cy), z: 0.24 }));
    L.push(layer(svg(circle(268, 'stroke-opacity=".25" stroke-dasharray="1 7"', 400, cy) + dots(33, 268, 2, `fill="${IVORY}" fill-opacity=".8" stroke="none"`, -90, 400, cy)), { anim: "spin rev", d: 200, o: origin(400, cy), z: 0.26 }));
    const bid = uid("bm");
    L.push(layer(svg(`<defs>${linear(bid, [[0, "#fff1c4", 0], [0.7, "#ffe29a", 0.38], [1, "#ffe29a", 0.6]])}</defs><path d="M382 0L418 0L430 340L370 340Z" fill="url(#${bid})" stroke="none"/>`), { anim: "pulse", d: 6, z: 0.3 }));
    const body = '#05120d';
    const dome = (cx, cyy, r) => `M${cx - r} ${cyy}A${r} ${r} 0 0 1 ${cx + r} ${cyy}Z`;
    const minaret = (x) => rect(x - 14, 360, 28, gy - 360, `fill="${body}" class="dr"`) + rect(x - 22, 398, 44, 12, `fill="${body}" class="dr"`) + path(`M${x - 14} 360L${x} 322L${x + 14} 360Z`, `fill="${body}" class="dr"`) + line([x, 322], [x, 300], "") + circle(4, `fill="${GOLD_HI}" stroke="none"`, x, 296);
    L.push(layer(svg(
      minaret(96) + minaret(704) +
      rect(140, 530, 120, gy - 530, `fill="${body}" class="dr"`) + path(dome(200, 530, 60), `fill="${body}" class="dr"`) +
      rect(540, 530, 120, gy - 530, `fill="${body}" class="dr"`) + path(dome(600, 530, 60), `fill="${body}" class="dr"`) +
      rect(250, cy, 300, gy - cy, `fill="${body}" class="dr"`) + path(dome(400, cy, 140), `fill="${body}" class="dr"`) +
      line([400, 330], [400, 296], "") + path(crescent([400, 280], 16, [405, 276], 13), `fill="${GOLD_HI}" stroke="none"`)
    ), { z: 0.5 }));
    const win = (x) => `<path d="M${x - 9} ${gy}V${gy - 52}A9 9 0 0 1 ${x + 9} ${gy - 52}V${gy}Z" fill="#ffcf7a" fill-opacity=".85" stroke="none"/>`;
    L.push(layer(svg([300, 335, 370, 400, 430, 465, 500].map(win).join("") + [190, 210, 590, 610].map((x) => `<path d="M${x - 6} 610V585A6 6 0 0 1 ${x + 6} 585V610Z" fill="#ffcf7a" fill-opacity=".8" stroke="none"/>`).join("")), { anim: "flicker", d: 4.5, z: 0.52 }));
    const gid = uid("gd");
    L.push(layer(svg(`<defs>${linear(gid, [[0, "#06130d", 1], [1, "#06130d", 1]])}</defs><rect x="-40" y="${gy}" width="880" height="200" fill="url(#${gid})" stroke="none"/>${line([-40, gy], [840, gy], 'stroke-opacity=".5"')}${line([60, gy + 26], [740, gy + 26], 'stroke-opacity=".22"')}${line([160, gy + 52], [640, gy + 52], 'stroke-opacity=".14"')}`), { z: 0.7 }));
    L.push(layer(svg(line([300, gy + 14], [500, gy + 14], `stroke="#ffcf7a" stroke-opacity=".5"`) + line([340, gy + 36], [460, gy + 36], `stroke="#ffcf7a" stroke-opacity=".35"`)), { anim: "shimmer", d: 4, z: 0.72 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(pinpoints(131 + i * 5, 18, [100, 400, 700, 790], [1.2, 2.8], "#ffe29a")), { anim: "rise", d: 15 + i * 5, dl: i * 4, z: 0.8 }));
    return L;
  });

  /* 9 — Tunas yang tumbuh (penanaman sejak dini) */
  scenes.push(() => {
    const L = [];
    const by = 650;
    L.push(layer(glow("#4fb36a", 0.3, 420, 400, 460), { anim: "breathe", d: 9 }));
    const sid = uid("sn");
    L.push(layer(svg(`<defs>${radial(sid, [[0, "#fffbe6", 0.95], [0.5, "#ffd488", 0.6], [1, "#ffd488", 0]])}</defs>${circle(140, `fill="url(#${sid})" stroke="none"`, 636, 170)}${circle(38, `fill="#fff1c4" stroke="none"`, 636, 170)}`), { anim: "breathe", d: 6, z: 0.14 }));
    L.push(layer(svg(rays(24, 56, 100, 'stroke-opacity=".6"', (i) => (i % 2 ? 84 : 100), 0, 636, 170) + circle(64, 'class="dr" stroke-opacity=".6"', 636, 170)), { anim: "spin", d: 50, o: origin(636, 170), z: 0.16 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(ellipse(260, 52, 'stroke-opacity=".6"', 400, by)), { anim: "ripple", d: 7, dl: i * 2.3, o: origin(400, by), z: 0.2 }));
    const g = dunePath(by, 10, 1.2);
    L.push(layer(svg(path(g.fill, 'fill="#0a1f14" fill-opacity=".95" stroke="none"') + path(g.line, 'class="dr" stroke-opacity=".6"') + ellipse(130, 22, 'class="dr" stroke-opacity=".35"', 400, by + 36) + ellipse(210, 36, 'class="dr" stroke-opacity=".2"', 400, by + 56)), { z: 0.34 }));
    const stem = "M400 650C390 570 412 480 400 340";
    L.push(layer(svg(path(stem, 'stroke="#4fb36a" stroke-width="12" stroke-opacity=".22"') + path(stem, 'class="dr" stroke="#9be0a8" stroke-width="3.2"')), { anim: "sway tiny", d: 7, o: origin(400, 650), z: 0.4 }));
    const joints = [[398, 590, -1, 170, 62], [404, 540, 1, 160, 58], [398, 480, -1, 140, 52], [403, 430, 1, 130, 48], [399, 384, -1, 100, 40]];
    joints.forEach(([jx, jy, dir, len, rise], i) => {
      const lf = leaf(jx, jy, dir, len, rise);
      const lid = uid("lf");
      const inner = svg(`<defs>${linear(lid, [[0, "#6fd28c", 0.45], [1, "#2d7d4f", 0.2]], 0, 0, dir > 0 ? 1 : 0, 1)}</defs>` + path(lf.shape, `fill="url(#${lid})" class="dr" stroke="#bff0c8"`) + path(lf.rib, 'class="dr" stroke="#bff0c8" stroke-opacity=".6"'));
      L.push(layer(inner, { anim: "grow", dl: 1.4 + i * 0.5, o: origin(jx, jy), z: 0.46, inner2: `<div class="sa2 sway" style="--d:${5 + i}s;transform-origin:${origin(jx, jy)}">%%</div>` }));
    });
    const flower = closed(starPts(8, 40, 17, -90, 400, 318));
    L.push(layer(svg(`${circle(70, `fill="#ffd488" fill-opacity=".18" stroke="none"`, 400, 318)}${path(flower, `class="dr" fill="rgba(255,212,136,.28)"`)}${circle(9, `fill="${IVORY}" stroke="none"`, 400, 318)}`), { anim: "bloom", dl: 4.2, o: origin(400, 318), z: 0.52, inner2: `<div class="sa2 spin" style="--d:60s;transform-origin:${origin(400, 318)}">%%</div>` }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(pinpoints(141 + i * 5, 22, [80, 300, 720, 800], [1.2, 2.8], i % 2 ? "#bff0c8" : "#ffe29a")), { anim: "rise", d: 14 + i * 4, dl: i * 3, z: 0.7 }));
    return L;
  });

  /* 10 — Jangkar & laut (kesimpulan) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#2a8fb0", 0.28, 420), { anim: "breathe", d: 10 }));
    const hid = uid("hl");
    L.push(layer(svg(`<defs>${radial(hid, [[0, "#fff4cf", 0.85], [1, "#fff4cf", 0]])}</defs>${circle(170, `fill="url(#${hid})" stroke="none"`, 400, 120)}${circle(30, `fill="#fff4cf" stroke="none"`, 400, 120)}${circle(58, 'class="dr" stroke-opacity=".5"', 400, 120)}${circle(90, 'class="dr" stroke-opacity=".25"', 400, 120)}`), { anim: "breathe", d: 7, z: 0.1 }));
    const bid = uid("bs");
    const shaft = (x1, x2) => `<path d="M400 120L${x1} 640L${x2} 640Z" fill="url(#${bid})" stroke="none"/>`;
    L.push(layer(svg(`<defs>${linear(bid, [[0, "#fff4cf", 0.34], [1, "#9fd8e8", 0]])}</defs>${shaft(120, 220)}${shaft(260, 340)}${shaft(460, 540)}${shaft(580, 680)}`), { anim: "sway", d: 11, o: origin(400, 120), z: 0.12 }));
    const wave = (y, fill, op, w = 1) => svg(`<defs>${linear(uid("wv"), [[0, "#fff", 0]])}</defs>` + path(`${wavePath(y, 16 * w, 400, 1600)}V820H0Z`, `fill="${fill}" fill-opacity="${op}" stroke="none"`) + path(wavePath(y, 16 * w, 400, 1600), `stroke-opacity="${op}"`), "", "0 0 1600 800");
    L.push(layer(wave(560, "#124a66", 0.5), { anim: "waveX", d: 26, wide: true, z: 0.2 }));
    const ar = (extra) => `class="dr" stroke-width="2.4" ${extra || ""}`;
    const anchor =
      path("M400 160C392 110 408 60 400 -30", 'stroke-opacity=".5" stroke-dasharray="3 6"') +
      circle(30, ar(), 400, 190) + line([400, 220], [400, 568], ar()) + line([322, 268], [478, 268], ar()) + circle(11, `fill="${GOLD_HI}" stroke="none"`, 322, 268) + circle(11, `fill="${GOLD_HI}" stroke="none"`, 478, 268) +
      path("M266 468C266 596 338 638 400 638C462 638 534 596 534 468", ar()) + path("M240 494L266 456L292 494", ar()) + path("M508 494L534 456L560 494", ar()) +
      path("M266 468C266 590 336 630 400 630C464 630 534 590 534 468", 'stroke-opacity=".25" stroke-width="12"');
    L.push(layer(svg(anchor), { anim: "swing", d: 8, o: origin(400, 190), z: 0.4 }));
    L.push(layer(wave(610, "#0c3a52", 0.72, 1.2), { anim: "waveX rev", d: 20, wide: true, z: 0.55 }));
    L.push(layer(wave(660, "#082a3e", 0.88, 1.4), { anim: "waveX", d: 15, wide: true, z: 0.7 }));
    L.push(layer(wave(715, "#051c2b", 0.95, 1.6), { anim: "waveX rev", d: 11, wide: true, z: 0.85 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(ellipse(150, 30, 'stroke-opacity=".6"', 400, 612)), { anim: "ripple", d: 6.5, dl: i * 2.2, o: origin(400, 612), z: 0.5 }));
    const rnd = seeded(151);
    let bubbles = "";
    for (let i = 0; i < 16; i++) bubbles += circle(f(2 + rnd() * 5), 'stroke-opacity=".6"', f(300 + rnd() * 200), f(420 + rnd() * 330));
    L.push(layer(svg(bubbles), { anim: "rise", d: 12, z: 0.6 }));
    L.push(layer(svg(bubbles.replace(/cx="(\d+)/g, (m, x) => `cx="${+x + 40}`)), { anim: "rise", d: 17, dl: 5, z: 0.62 }));
    L.push(layer(svg(sparkles(161, 9, { box: [60, 40, 740, 420], size: [5, 12] })), { anim: "twinkle", d: 4.5, z: 0.5 }));
    return L;
  });

  /* 11 — Perpustakaan pengetahuan (referensi) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#e0a64a", 0.28, 420), { anim: "breathe", d: 10 }));
    const rnd = seeded(171);
    const nodes = Array.from({ length: 18 }, () => pt(150 + rnd() * 235, rnd() * 360));
    let links = "", nodeSvg = "";
    nodes.forEach((a, i) => {
      const near = nodes.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).filter(([d, j]) => j !== i && d < 190).sort((x, y) => x[0] - y[0]).slice(0, 2);
      near.forEach(([, j]) => { if (j > i) links += line(a, nodes[j], 'class="flow" stroke-opacity=".5"'); });
      nodeSvg += circle(f(3 + rnd() * 4), `fill="${i % 3 ? GOLD_HI : IVORY}" stroke="none"`, a[0], a[1]) + circle(11, 'stroke-opacity=".3"', a[0], a[1]);
    });
    L.push(layer(svg(links + nodeSvg + circle(388, 'class="dr" stroke-opacity=".3"') + circle(300, 'class="dr" stroke-opacity=".18" stroke-dasharray="2 10"')), { anim: "spin", d: 260, z: 0.14 }));
    const cid = uid("cl");
    L.push(layer(svg(`<defs>${linear(cid, [[0, "#fff1c4", 0.5], [1, "#fff1c4", 0]], 0, 1, 0, 0)}</defs><path d="M340 360L460 360L520 -20L280 -20Z" fill="url(#${cid})" stroke="none"/>`), { anim: "pulse", d: 6, z: 0.2 }));
    const book = (x, y, w, h, i) => rect(x, y, w, h, 'class="dr" fill="rgba(14,42,31,.92)" rx="4"') + line([x + 22, y], [x + 22, y + h], 'stroke-opacity=".5"') + line([x + 30, y], [x + 30, y + h], 'stroke-opacity=".3"') + path(closed(starPts(8, 11, 5, -90, x + w - 36, y + h / 2)), `fill="${GOLD_HI}" stroke="none"`) + line([x + 50, y + h / 2], [x + w - 64, y + h / 2], 'stroke-opacity=".28"');
    [[250, 620, 300, 46, 0], [270, 572, 270, 44, 1], [240, 526, 310, 44, 2], [262, 484, 280, 40, 3]].forEach(([x, y, w, h, i]) => {
      L.push(layer(svg(book(x, y, w, h, i)), { anim: "float", d: 6 + i * 0.9, dl: -i * 1.3, z: 0.4 + i * 0.04 }));
    });
    const pageL = "M400 330C360 308 306 306 258 328L258 458C306 436 360 438 400 460Z";
    const pageR = "M400 330C440 308 494 306 542 328L542 458C494 436 440 438 400 460Z";
    L.push(layer(svg(path(pageL, 'class="dr" fill="rgba(243,238,224,.1)"') + [0, 1, 2, 3, 4].map((k) => path(`M280 ${350 + k * 20}Q330 ${344 + k * 20} 382 ${360 + k * 20}`, 'stroke-opacity=".3"')).join("")), { anim: "page", d: 5, o: origin(400, 400), z: 0.56 }));
    L.push(layer(svg(path(pageR, 'class="dr" fill="rgba(243,238,224,.1)"') + [0, 1, 2, 3, 4].map((k) => path(`M418 ${360 + k * 20}Q470 ${344 + k * 20} 520 ${350 + k * 20}`, 'stroke-opacity=".3"')).join("")), { anim: "page rev", d: 5, dl: -2, o: origin(400, 400), z: 0.56 }));
    for (let i = 0; i < 3; i++) L.push(layer(svg(pinpoints(181 + i * 4, 22, [230, 40, 570, 340], [1.2, 2.8], i % 2 ? IVORY : "#ffe29a")), { anim: "rise", d: 11 + i * 3, dl: i * 2.4, z: 0.7 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(sparkles(191 + i * 3, 8, { minR: 150, maxR: 390 })), { anim: "twinkle", d: 4 + i, dl: i, z: 0.6 }));
    return L;
  });

  /* 12 — Cahaya penutup (terima kasih) */
  scenes.push(() => {
    const L = [];
    L.push(layer(glow("#e8bf6a", 0.5, 430), { anim: "breathe", d: 7 }));
    L.push(layer(svg(rays(48, 120, 395, (i) => `stroke-opacity="${i % 2 ? 0.16 : 0.42}"`, (i) => (i % 2 ? 330 : 395))), { anim: "spin rev", d: 160, z: 0.08 }));
    L.push(layer(svg(rays(24, 200, 390, 'stroke-opacity=".3" stroke-dasharray="3 12"', null, 7.5)), { anim: "spin", d: 100, z: 0.12 }));
    for (let i = 0; i < 4; i++) L.push(layer(svg(circle(190, 'stroke-opacity=".6"')), { anim: "ripple wide", d: 8, dl: i * 2, z: 0.16 }));
    const cr = crescent([372, 404], 178, [440, 384], 146);
    const crid = uid("cr");
    L.push(layer(svg(`<defs>${linear(crid, [[0, "#fff1c4", 0.95], [0.5, GOLD_HI, 0.85], [1, "#b98b3f", 0.7]], 0, 0, 1, 1)}</defs>${path(cr, `fill="url(#${crid})" stroke="none"`)}${path(cr, 'class="dr" stroke-width="2" stroke="#fff1c4"')}`), { anim: "float", d: 7, z: 0.3 }));
    const sid = uid("st");
    L.push(layer(svg(`<defs>${radial(sid, [[0, "#fff4cf", 0.9], [1, "#fff4cf", 0]])}</defs>${circle(90, `fill="url(#${sid})" stroke="none"`, 500, 372)}${path(closed(starPts(5, 40, 17, -90, 500, 372)), `fill="#fff1c4" stroke="${GOLD_HI}"`)}`), { anim: "spin", d: 50, o: origin(500, 372), z: 0.4 }));
    const burstPos = [[150, 160], [650, 140], [120, 560], [690, 560], [260, 90], [560, 700], [700, 340]];
    burstPos.forEach(([x, y], i) => {
      const s = rays(14, 12, 64, `stroke="${i % 2 ? GOLD_HI : IVORY}" stroke-opacity=".9"`, (k) => (k % 2 ? 48 : 64), 0, x, y) + dots(14, 82, 2.4, `fill="${GOLD_HI}" stroke="none"`, 0, x, y);
      L.push(layer(svg(s), { anim: "burst", d: 6.5 + (i % 3), dl: i * 1.4, o: origin(x, y), z: 0.55 }));
    });
    for (let i = 0; i < 3; i++) L.push(layer(svg(sparkles(201 + i * 7, 11, { minR: 100, maxR: 395, size: [6, 16] })), { anim: "twinkle", d: 3.4 + i, dl: i * 0.8, z: 0.6 }));
    for (let i = 0; i < 2; i++) L.push(layer(svg(pinpoints(221 + i * 3, 30, [40, 200, 760, 800], [1.2, 3], GOLD_HI)), { anim: "rise", d: 13 + i * 4, dl: i * 3, z: 0.8 }));
    return L;
  });

  /* ---------- build ---------- */
  function build(index) {
    const make = scenes[((index % scenes.length) + scenes.length) % scenes.length];
    const el = document.createElement("div");
    el.className = "scene";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = make().join("");
    el.querySelectorAll(".se").forEach((node, i) => node.style.setProperty("--li", String(i)));
    let k = 0;
    el.querySelectorAll(".dr").forEach((node) => {
      node.setAttribute("pathLength", "1");
      node.style.setProperty("--k", String(Math.min(k++, 60)));
    });
    return el;
  }

  window.DeckScenes = { build, count: scenes.length };
})();
