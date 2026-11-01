// ---------------------------------------------------------------- la pizarra (lienzo de 2048 × 768 = 3,2 × 1,2 m): tiza que se escribe al decirse.
// Izquierda: el cerebro (L3) y sus conexiones encendidas (L14). Centro: «¿FÁCIL?», Cataluña y 100 aspirantes, casi la mitad tachados (L9).
// Derecha: la fecha y un sol (siempre) y las matemáticas de 11 años (L13).
const BCW = 2048, BCH = 768;
const boardW = (px, py) => v3((px / BCW - 0.5) * 3.2, 1.5 + (0.5 - py / BCH) * 1.2, -RZ + 0.036);
const BR = { x: 70, y: 150, w: 560, h: 430 };            // caja del cerebro en el lienzo
const brainP = ([u, v]) => [BR.x + u * BR.w, BR.y + v * BR.h];
function smoothPts(pts, n = 8) {        // Catmull-Rom → polilínea densa
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } }
  out.push(pts[pts.length - 1]); return out;
}
const BRAIN_OUT = [[0.10, 0.62], [0.05, 0.48], [0.07, 0.33], [0.15, 0.2], [0.28, 0.1], [0.44, 0.05], [0.6, 0.06], [0.75, 0.12], [0.87, 0.23], [0.94, 0.38], [0.94, 0.52], [0.89, 0.62], [0.8, 0.68], [0.68, 0.7], [0.58, 0.68], [0.5, 0.72], [0.42, 0.8], [0.3, 0.82], [0.2, 0.78], [0.13, 0.71], [0.10, 0.62]];
const BRAIN_IN = [
  [[0.66, 0.7], [0.76, 0.74], [0.84, 0.8], [0.82, 0.88], [0.72, 0.9], [0.62, 0.85], [0.6, 0.78]],
  [[0.65, 0.8], [0.72, 0.79], [0.8, 0.82]], [[0.66, 0.85], [0.73, 0.85], [0.78, 0.87]],
  [[0.56, 0.74], [0.57, 0.86], [0.58, 0.99]], [[0.62, 0.86], [0.63, 0.99]],
  [[0.2, 0.66], [0.32, 0.6], [0.44, 0.56], [0.55, 0.53], [0.63, 0.5]],
  [[0.5, 0.06], [0.48, 0.18], [0.5, 0.3], [0.46, 0.42], [0.48, 0.52]],
  [[0.16, 0.32], [0.26, 0.29], [0.32, 0.36], [0.41, 0.31]], [[0.11, 0.45], [0.22, 0.43], [0.3, 0.48], [0.39, 0.45]],
  [[0.22, 0.18], [0.3, 0.23], [0.37, 0.16]], [[0.58, 0.2], [0.66, 0.25], [0.73, 0.19], [0.81, 0.26]],
  [[0.58, 0.34], [0.68, 0.39], [0.77, 0.34], [0.88, 0.41]], [[0.6, 0.47], [0.71, 0.51], [0.84, 0.5]],
  [[0.28, 0.71], [0.39, 0.66], [0.5, 0.64]], [[0.24, 0.76], [0.36, 0.75]],
];
function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
function buildBoard() {
  const B = S.bd = {};
  // pizarra de fondo: casi negra, con nubes de tiza borrada y pasadas de borrador
  const base = B.base = document.createElement('canvas'); base.width = BCW; base.height = BCH; const g = base.getContext('2d');
  g.fillStyle = '#1b1e1d'; g.fillRect(0, 0, BCW, BCH);
  for (let i = 0; i < 70; i++) { const x = hash(i * 3.1) * BCW, y = hash(i * 5.3) * BCH, r = 60 + hash(i * 7.7) * 260, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(235,235,225,${0.025 + hash(i * 1.9) * 0.035})`); gr.addColorStop(1, 'rgba(235,235,225,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.lineCap = 'round'; for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(230,230,220,${0.012 + hash(i * 4.4) * 0.02})`; g.lineWidth = 50 + hash(i * 6.6) * 70; g.beginPath(); const x = hash(i * 8.8) * BCW, y = hash(i * 9.9) * BCH; g.moveTo(x, y); g.lineTo(x + 200 + hash(i) * 400, y + (hash(i * 2) - 0.5) * 60); g.stroke(); }
  for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(255,255,255,${hash(i * 0.37) * 0.035})`; g.fillRect(hash(i * 1.71) * BCW, hash(i * 2.93) * BCH, 2, 2); }
  // ruido para el grano de la tiza (se resta de los trazos)
  const nz = B.noise = document.createElement('canvas'); nz.width = BCW; nz.height = BCH; const ng = nz.getContext('2d');
  for (let i = 0; i < 260000; i++) { ng.fillStyle = `rgba(0,0,0,${0.35 + hash(i * 0.913) * 0.65})`; const s = 1 + (hash(i * 1.37) > 0.8 ? 1 : 0); ng.fillRect(hash(i * 2.17) * BCW, hash(i * 3.31) * BCH, s, s); }
  B.chalk = document.createElement('canvas'); B.chalk.width = BCW; B.chalk.height = BCH; B.cg = B.chalk.getContext('2d', { willReadFrequently: true });
  // el cerebro en polilíneas (contorno + surcos), en el orden en que se dibuja
  B.brain = [smoothPts(BRAIN_OUT.map(brainP), 10), ...BRAIN_IN.map(p => smoothPts(p.map(brainP), 8))];
  B.brainLen = B.brain.map(polyLen); B.brainTot = B.brainLen.reduce((a, b) => a + b, 0);
  // red de conexiones (L14): nodos dentro del contorno y aristas a los vecinos, en orden de crecimiento desde el centro
  const poly = BRAIN_OUT, inside = (u, v) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) c = !c; } return c; };
  const nodes = []; for (let i = 0; nodes.length < 230 && i < 5000; i++) { const u = hash(i * 1.913 + 7), v = hash(i * 3.17 + 2); if (inside(u, v)) nodes.push([u, v]); }
  const edges = [], seen = new Set();
  nodes.forEach((a, i) => { const d = nodes.map((b, j) => [j, Math.hypot(a[0] - b[0], (a[1] - b[1]) * 0.77)]).sort((p, q) => p[1] - q[1]);
    for (let k = 1; k <= 4; k++) { const j = d[k][0], key = Math.min(i, j) + '_' + Math.max(i, j); if (!seen.has(key)) { seen.add(key); edges.push([i, j]); } }
    if (hash(i * 5.5) > 0.6) { const j = d[6 + Math.floor(hash(i * 8.1) * 14)][0], key = Math.min(i, j) + '_' + Math.max(i, j); if (!seen.has(key)) { seen.add(key); edges.push([i, j]); } } });
  const c0 = nodes.reduce((b, n, i) => (Math.hypot(n[0] - 0.5, n[1] - 0.42) < Math.hypot(nodes[b][0] - 0.5, nodes[b][1] - 0.42) ? i : b), 0);
  edges.forEach(e => { const m = [(nodes[e[0]][0] + nodes[e[1]][0]) / 2, (nodes[e[0]][1] + nodes[e[1]][1]) / 2]; e.push(Math.hypot(m[0] - nodes[c0][0], m[1] - nodes[c0][1]) + hash(e[0] * 3 + e[1]) * 0.12); });
  edges.sort((a, b) => a[2] - b[2]); B.nodes = nodes; B.edges = edges; B.lastKey = ''; B.lastG = -1;
  // los 100 aspirantes (10 × 10) y los 45 que se tachan (orden fijo)
  B.cross = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => hash(a * 7.31) - hash(b * 7.31)).slice(0, 45);
}
// trazo de tiza: la fracción k de la polilínea, con dos pasadas (una más fina y desplazada) para que no quede «digital»
function chalkLine(g, pts, k, w = 6, a = 0.92) {
  if (k <= 0) return; const L = polyLen(pts) * clamp(k); let acc = 0;
  for (const [dx, dy, ww, aa] of [[0, 0, w, a], [1.2, -0.8, w * 0.55, a * 0.6]]) {
    g.save(); g.globalAlpha = aa; g.lineWidth = ww; g.strokeStyle = '#f1f0e8'; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0] + dx, pts[0][1] + dy); acc = 0;
    for (let i = 1; i < pts.length; i++) { const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + s >= L) { const u = (L - acc) / s; g.lineTo(lerp(pts[i - 1][0], pts[i][0], u) + dx, lerp(pts[i - 1][1], pts[i][1], u) + dy); break; }
      g.lineTo(pts[i][0] + dx, pts[i][1] + dy); acc += s; }
    g.stroke(); g.restore(); }
}
function chalkText(g, txt, x, y, size, k, o = {}) {        // se escribe de izquierda a derecha
  if (k <= 0) return; g.save(); g.font = `${o.w || 800} ${size}px ${o.font || 'Inter'}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(txt).width, x0 = (o.align === 'left' ? x : x - tw / 2) - 10;
  g.beginPath(); g.rect(x0, y - size, (tw + 20) * clamp(k), size * 2); g.clip();
  g.translate(x, y); g.rotate(o.rot || -0.015); g.fillStyle = '#f1f0e8'; g.globalAlpha = o.a ?? 0.95; g.fillText(txt, 0, 0); g.restore();
}
function stick(g, x, y, s, k) {           // muñeco de palitos (cabeza, cuerpo, brazos, piernas)
  if (k <= 0) return; const e = clamp(k);
  chalkLine(g, [[x, y - 14 * s], [x, y + 6 * s]], e, 3.2); chalkLine(g, [[x - 9 * s, y - 6 * s], [x + 9 * s, y - 6 * s]], e, 3);
  chalkLine(g, [[x - 7 * s, y + 18 * s], [x, y + 6 * s], [x + 7 * s, y + 18 * s]], e, 3);
  g.save(); g.globalAlpha = 0.92 * e; g.strokeStyle = '#f1f0e8'; g.lineWidth = 3.2; g.beginPath(); g.arc(x, y - 20 * s, 6 * s, 0, 7 * e); g.stroke(); g.restore();
}
function boardAt(t) {
  const B = S.bd;
  const kb = clamp((t - K.aprender3 + 0.05) / (K.cerebro3 + 0.25 - K.aprender3));
  const kf = clamp((t - K.facil9 + 0.05) / 0.45), kc = clamp((t - K.cataluna9) / 0.5), kp = clamp((t - K.este9 + 0.05) / (K.casi9 + 0.15 - K.este9)), kx = clamp((t - K.mitad9) / (K.examen9 + 0.1 - K.mitad9));
  const km = clamp((t - K.predice13) / (K.matematicas13 + 0.55 - K.predice13)), ko = clamp((t - K.once13 + 0.05) / 0.4);
  const key = [kb, kf, kc, kp, kx, km, ko].map(v => Math.round(v * 120)).join(',');
  if (key !== B.lastKey) {
    B.lastKey = key; const g = B.cg; g.clearRect(0, 0, BCW, BCH);
    // siempre: la fecha y un sol de clase de Infantil (arriba a la derecha)
    chalkText(g, 'NOVIEMBRE', 1830, 70, 40, 1, { a: 0.8 });
    { const sx = 1960, sy = 160; chalkLine(g, smoothPts(Array.from({ length: 13 }, (_, i) => [sx + Math.cos(i / 12 * 6.283) * 24, sy + Math.sin(i / 12 * 6.283) * 24]), 4), 1, 4, 0.8);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; chalkLine(g, [[sx + Math.cos(a) * 34, sy + Math.sin(a) * 34], [sx + Math.cos(a) * 50, sy + Math.sin(a) * 50]], 1, 4, 0.8); } }
    // L3: el cerebro
    if (kb > 0) { let L = B.brainTot * kb; B.brain.forEach((p, i) => { const l = B.brainLen[i], u = clamp(L / l); chalkLine(g, p, u, i ? 4.5 : 6.5); L -= l; }); }
    // L9: «¿FÁCIL?», Cataluña 2026 y los 100 aspirantes; se tachan 45
    chalkText(g, '¿FÁCIL?', 1024, 110, 92, kf);
    chalkText(g, 'CATALUÑA · 2026', 1024, 188, 40, kc, { w: 700 });
    if (kp > 0) for (let i = 0; i < 100; i++) { const c = i % 10, r = Math.floor(i / 10), x = 772 + c * 56, y = 262 + r * 47; stick(g, x, y, 0.95, clamp(kp * 1.6 - (i / 100) * 0.6) * 1.0); }
    if (kx > 0) B.cross.forEach((i, n) => { const c = i % 10, r = Math.floor(i / 10), x = 772 + c * 56, y = 262 + r * 47 - 4, e = clamp(kx * 45 / 6 - n / 6) ; if (e <= 0) return;
      chalkLine(g, [[x - 17, y - 22], [x + 17, y + 20]], clamp(e * 2), 4.2); chalkLine(g, [[x + 17, y - 22], [x - 17, y + 20]], clamp(e * 2 - 1), 4.2); });
    // L13: matemáticas de quinto (11 años)
    chalkText(g, '3/4 + 1/2 = 5/4', 1690, 360, 66, km);
    chalkText(g, '11 AÑOS', 1690, 480, 56, ko, { w: 700 });
    // grano: se come parte de los trazos; luego, pizarra + tiza
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.42; g.drawImage(B.noise, 0, 0); g.restore();
    const T = S.boardTex, bg = T.userData.g; bg.drawImage(B.base, 0, 0); bg.drawImage(B.chalk, 0, 0); T.needsUpdate = true;
  }
  // L14: la red se enciende (crece muy deprisa: «un millón por segundo») y se apaga al volver al collar
  const t0 = K.crea14 - 0.25, t1 = K.segundo14 + 0.4, grow = t < t0 ? 0 : clamp((Math.exp(3.2 * (t - t0) / (t1 - t0)) - 1) / (Math.exp(3.2) - 1));
  const fade = win(t, K.cerebro14 - 0.3, 0.4) * (1 - win(t, K.magisterio15 - 0.4, 0.6)), gk = Math.round(grow * 400) / 400 + Math.round(fade * 60) * 10;
  if (gk !== B.lastG || (fade > 0 && fade < 1) || grow > 0 && grow < 1 || fade > 0) {
    B.lastG = gk; const T = S.glowTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height, sx = w / BCW, sy = h / BCH;
    g.clearRect(0, 0, w, h);
    if (fade > 0.001) {
      g.save(); g.scale(sx, sy); g.globalAlpha = 0.35 * fade; B.brain.forEach((p, i) => { g.strokeStyle = '#fff4e0'; g.lineWidth = i ? 5 : 7; g.lineCap = 'round'; g.beginPath(); p.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }); g.restore();
      const n = Math.floor(B.edges.length * grow), P2 = q => [(BR.x + q[0] * BR.w) * sx, (BR.y + q[1] * BR.h) * sy];
      g.lineCap = 'round'; g.lineWidth = 1.3;
      for (let i = 0; i < n; i++) { const [a, b] = B.edges[i], A = P2(B.nodes[a]), Bq = P2(B.nodes[b]), fl = 0.55 + 0.45 * Math.sin(t * 9 + i * 1.7);
        g.strokeStyle = `rgba(255,236,200,${(0.55 * fl * fade).toFixed(3)})`; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(Bq[0], Bq[1]); g.stroke(); }
      const nn = Math.min(B.nodes.length, Math.floor(B.nodes.length * Math.min(1, grow * 1.4)));
      for (let i = 0; i < nn; i++) { const p = P2(B.nodes[i]), on = hash(i * 3.3 + Math.floor(t * 14)) > 0.82; g.fillStyle = `rgba(255,248,232,${((on ? 1 : 0.55) * fade).toFixed(3)})`; g.beginPath(); g.arc(p[0], p[1], on ? 3 : 1.7, 0, 7); g.fill(); }
    }
    T.needsUpdate = true;
  }
}
