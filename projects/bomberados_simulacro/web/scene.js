// Bomberados — promo «Simulacro en directo» de Élite Bomberos (domingo 1 nov 2026): canvas 2D, 1080x1920, estilo «app».
// Lee ../video.json y ../tiempos.json del proyecto. window.renderAt(t) dibuja el fotograma del segundo t.
// Objetos que se transforman: la hoja de respuestas llena de ✗ (sello SUSPENSO, sobre una pila de manuales) → el
// calendario de octubre vacío («SIMULACROS 0») → pasa a noviembre, el domingo 1 se rodea y el contador pasa a 1 → la
// casilla sale volando y se hace el chip de la fecha; «SIMULACRO» + «EN DIRECTO» + Adrián Luna + Élite Bomberos → el
// título sube a la cabecera → casa con un portátil (examen en directo) + etiqueta de 10 € → botón APÚNTATE +
// @elitebomberos → vuelve la hoja y cada ✗ se vuelve ✓ → placa BOMBERADOS + recordatorio del simulacro.
const W = 1080, H = 1920;
const PR = window.PR || 1;
const cv = document.createElement('canvas');
cv.width = W * PR; cv.height = H * PR;
cv.style.width = W + 'px'; cv.style.height = H + 'px';
document.body.appendChild(cv);
const g = cv.getContext('2d');

const WHITE = '#EEF2F6', DIM = '#8A93A3', ORANGE = '#FF7A1A', TEAL = '#2DD4BF', PINK = '#F0457A', VIOLET = '#8B7CF6';
const RED = '#FF3B3B', GOLD = '#F2B233', EMBER = '#FF7A2F', INK = '#1B1D22', PAPER = '#F3EEE4', PEN = '#E0262B', OK = '#16A34A';
const LETCOL = [TEAL, ORANGE, PINK, VIOLET];
const F = '../../../engine/fonts/';
let V, CUE = {}, END = 24, CAM = null;

// ---------------------------------------------------------------- utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, t0, d) => clamp((t - t0) / d);
const eo = x => 1 - Math.pow(1 - x, 3);
const eio = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pulse = (t, t0, w) => Math.exp(-Math.pow((t - t0) / w, 2));
const norm = w => w.toLowerCase().normalize('NFC').replace(/[^0-9a-záéíóúñü]/g, '');

function cueTime(spec, lines) {
  const [word, k, line] = spec;
  let c = 0;
  for (const w of lines[line - 1].words) if (norm(w.w) === norm(word) && ++c === k) return w.start - 0.03;
  throw new Error('sin cue ' + spec);
}
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function txt(s, x, y, px, col, w = 700, al = 'left', fam = 'Inter') { g.font = `${w} ${px}px ${fam}`; g.fillStyle = col; g.textAlign = al; g.fillText(s, x, y); }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function camPt(x, y) { const p = CAM.transformPoint(new DOMPoint(x, y)); return [p.x / PR, p.y / PR]; }

// ---------------------------------------------------------------- chispas, fondo y rejilla (los de la plantilla «pregunta»)
function sparkAt(i, age) {
  const v = 260 + 380 * hash(i + 21), acc = 40 + 80 * hash(i + 22);
  const y = H + 30 - v * age - 0.5 * acc * age * age;
  const x = hash(i + 23) * W + (hash(i + 24) - 0.4) * 90 * age
    + 38 * Math.sin(age * (1.6 + 2 * hash(i + 25)) + 6 * hash(i + 26)) + 12 * Math.sin(age * (7 + 5 * hash(i + 27)) + i);
  return [x, y];
}
function sparks(t, n = 190) {
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const L = 2.2 + 3.5 * hash(i + 31), P = L + 0.3 + 2 * hash(i + 32);
    const age = (t + hash(i + 33) * P) % P;
    if (age > L) continue;
    const k = age / L;
    const [x, y] = sparkAt(i, age), [px, py] = sparkAt(i, Math.max(0, age - 0.03));
    if (y < -20) continue;
    const c = k < 0.35 ? [255, lerp(215, 160, k / 0.35), lerp(110, 45, k / 0.35)] : k < 0.75 ? [255, lerp(160, 85, (k - 0.35) / 0.4), lerp(45, 15, (k - 0.35) / 0.4)] : [lerp(255, 190, (k - 0.75) / 0.25), lerp(85, 35, (k - 0.75) / 0.25), 10];
    const fl = 0.65 + 0.35 * Math.sin(t * (22 + 9 * hash(i + 34)) + i * 3.1);
    const a = Math.min(1, age * 6) * (1 - Math.pow(k, 3)) * fl;
    const r = (1.1 + 2.2 * Math.pow(hash(i + 35), 2)) * (1 - 0.45 * k);
    const col = `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`;
    g.shadowColor = `rgba(255,110,30,${(0.9 * a).toFixed(3)})`; g.shadowBlur = r * 7;
    g.strokeStyle = `rgba(${col},${a.toFixed(3)})`; g.lineWidth = r * 1.8;
    g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
    g.shadowBlur = 0;
    g.globalCompositeOperation = 'lighter';
    const hr = r * 9, hg = g.createRadialGradient(x, y, 0, x, y, hr);
    hg.addColorStop(0, `rgba(255,140,40,${(0.35 * a).toFixed(3)})`); hg.addColorStop(1, 'rgba(255,80,10,0)');
    g.fillStyle = hg; g.fillRect(x - hr, y - hr, 2 * hr, 2 * hr);
    g.globalCompositeOperation = 'source-over';
  }
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const P = 5 + 4 * hash(i + 61), age = (t + hash(i + 62) * P) % P, k = age / P;
    const x = hash(i + 63) * W + 60 * Math.sin(age * 0.9 + i), y = H + 60 - k * (H + 200);
    const r = 10 + 14 * hash(i + 64), a = Math.sin(Math.PI * k) * 0.22 * (0.7 + 0.3 * Math.sin(t * 6 + i));
    const bg = g.createRadialGradient(x, y, 0, x, y, r);
    bg.addColorStop(0, `rgba(255,170,70,${a.toFixed(3)})`); bg.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = bg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  g.restore();
}

function background(t) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#07080C'); bg.addColorStop(0.55, '#0D0B0C'); bg.addColorStop(1, '#2A0E05');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const fl = 0.85 + 0.1 * Math.sin(t * 5.1) + 0.05 * Math.sin(t * 13.3 + 1);
  const rg = g.createRadialGradient(W / 2, H + 120, 50, W / 2, H + 120, 1100 * fl);
  rg.addColorStop(0, 'rgba(255,122,47,0.55)'); rg.addColorStop(0.45, 'rgba(200,60,10,0.22)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = (i + 0.5) / 9 * W + Math.sin(t * 1.3 + i) * 30;
    const h = 260 + 120 * Math.sin(t * 2.2 + i * 1.7) + 80 * hash(i);
    const lg = g.createRadialGradient(x, H, 10, x, H - h * 0.4, h);
    lg.addColorStop(0, 'rgba(255,170,60,0.22)'); lg.addColorStop(0.5, 'rgba(255,90,20,0.10)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(x - h, H - 2 * h, 2 * h, 2 * h);
  }
  g.restore();
  const vg = g.createRadialGradient(W / 2, H * 0.45, 300, W / 2, H * 0.45, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

function dots(t) {
  const step = 26, oy = (t * 9) % step;
  for (let y = -step; y < H + step; y += step) {
    for (let x = 13; x < W; x += step) {
      const yy = y + oy;
      const n = 0.5 + 0.5 * Math.sin(x * 0.011 + t * 0.25) * Math.sin(yy * 0.0085 - t * 0.17);
      const side = Math.pow(Math.abs(x - W / 2) / (W / 2), 1.5);
      const a = (0.025 + 0.11 * n * n * n) * (0.45 + 0.55 * side);
      if (a < 0.03) continue;
      g.fillStyle = `rgba(70,210,150,${a.toFixed(3)})`; g.fillRect(x - 1.5, yy - 1.5, 3, 3);
    }
  }
}

// ---------------------------------------------------------------- cámara: arranca pegada a la primera ✗ y se aleja
const SHEET0 = { x: 540, y: 880, s: 0.92 };
const MARKX = 215, ROWY = i => -205 + i * 54, BX = j => -150 + j * 80;
const FIRST = 1;                                      // fila de la ✗ que abre el vídeo (en primer plano)
function sections() { return ['academia', 'domingo', 'simulacro', 'desde', 'apuntate', 'despues', 'marca'].map(k => CUE[k]).filter(x => x !== undefined); }
function shakeAmt(t) {
  let s = 0;
  for (const [t0, a] of [[0.05, 0.5], [0.17, 0.7], [CUE.examen1 + 0.1, 1], [CUE.simulacro0 + 0.05, 0.3], [CUE.simulacro + 0.1, 0.9], [CUE.precio + 0.22, 0.45], [CUE.marca, 0.5]]) {
    const u = t - t0; if (u >= 0 && u < 0.6) s += a * Math.exp(-u * 11);
  }
  return s;
}
function camera(t) {
  const px = SHEET0.x + MARKX * SHEET0.s, py = SHEET0.y + ROWY(FIRST) * SHEET0.s;
  const k = eio(prog(t, 0.36, 0.95));
  const z0 = Math.pow(6.5, 1 - k), m = k / z0;                  // la ✗ va en línea recta del centro a su sitio
  const fx = px + (540 - px) * m, fy = py + (960 - py) * m;
  const s0 = Math.max(0, ...sections().filter(x => x <= t));
  const zs = 1 + 0.02 * eo(prog(t, s0, 5)) + (s0 > 0 ? 0.045 * (1 - eo(prog(t, s0, 0.45))) : 0);
  const sh = shakeAmt(t);
  g.translate(540 + sh * 16 * Math.sin(t * 93), 960 + sh * 12 * Math.cos(t * 71));
  g.scale(zs * z0, zs * z0);
  g.translate(-fx, -fy);
}
function whips(t) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const b of sections()) {
    const u = prog(t, b - 0.02, 0.38);
    if (u <= 0 || u >= 1) continue;
    const a = 1 - u;
    for (let i = 0; i < 34; i++) {
      const ang = i / 34 * Math.PI * 2 + hash(i + b) * 0.2;
      const r1 = 260 + 900 * eo(u) * (0.7 + 0.5 * hash(i + 3)), r2 = r1 + 140 + 160 * hash(i + 9);
      g.strokeStyle = `rgba(255,170,90,${(0.22 * a).toFixed(3)})`; g.lineWidth = 2 + 3 * hash(i + 5);
      g.beginPath(); g.moveTo(540 + Math.cos(ang) * r1, 960 + Math.sin(ang) * r1); g.lineTo(540 + Math.cos(ang) * r2, 960 + Math.sin(ang) * r2); g.stroke();
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- la hoja de respuestas (frase 1 y frase 6)
const PICK = [2, 0, 1, 3, 1, 0, 2, 3, 0, 1];          // burbuja rellena en cada fila
const WRONG = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1];         // 7 ✗ y 3 ✓ (EJEMPLO)
function xMark(p) {                                   // ✗ de rotulador rojo, dos trazos
  g.save(); g.strokeStyle = PEN; g.lineWidth = 9; g.lineCap = 'round';
  const a = clamp(p * 2), b = clamp(p * 2 - 1);
  if (a > 0) { g.beginPath(); g.moveTo(-22, -22); g.lineTo(lerp(-22, 23, a), lerp(-22, 21, a)); g.stroke(); }
  if (b > 0) { g.beginPath(); g.moveTo(22, -23); g.lineTo(lerp(22, -21, b), lerp(-23, 22, b)); g.stroke(); }
  g.restore();
}
function checkMark(p, col) {                          // ✓ que se dibuja
  if (p <= 0) return;
  g.save(); g.strokeStyle = col; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  const L1 = Math.hypot(16, 17), L2 = Math.hypot(31, 40), d = p * (L1 + L2);
  g.beginPath(); g.moveTo(-22, 2);
  if (d <= L1) g.lineTo(-22 + 16 * d / L1, 2 + 17 * d / L1);
  else { const e = (d - L1) / L2; g.lineTo(-6, 19); g.lineTo(-6 + 31 * e, 19 - 40 * e); }
  g.stroke(); g.restore();
}
function stampDraw(p, out) {                          // sello de goma «SUSPENSO»
  const a = clamp(p * 4) * (1 - out);
  if (a <= 0) return;
  const s = lerp(1.9, 1, eo(p)) * (1 + 0.35 * out) * 0.84;       // dentro del papel
  g.save(); g.translate(-8, 30); g.rotate(-0.24); g.scale(s, s); g.globalAlpha *= a * 0.9;
  g.strokeStyle = PEN; g.lineWidth = 9; rr(-262, -98, 524, 176, 18); g.stroke();
  g.lineWidth = 3; rr(-246, -82, 492, 144, 12); g.stroke();
  g.letterSpacing = '6px'; txt('SUSPENSO', 3, 44, 150, PEN, 400, 'center', 'Bebas'); g.letterSpacing = '0px';
  g.fillStyle = PAPER;                                // tinta irregular
  for (let i = 0; i < 170; i++) { const x = -258 + hash(i * 1.37) * 516, y = -94 + hash(i * 2.11) * 168, r = 0.8 + 3.6 * Math.pow(hash(i * 5.3), 3); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.restore();
}
function sheetDraw(t, st) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 60; g.shadowOffsetY = 24;
  rr(-310, -410, 620, 820, 14); g.fillStyle = PAPER; g.fill();
  g.restore();
  const pg = g.createLinearGradient(-310, -410, 310, 410);
  pg.addColorStop(0, 'rgba(255,255,255,0.35)'); pg.addColorStop(1, 'rgba(170,150,120,0.22)');
  rr(-310, -410, 620, 820, 14); g.fillStyle = pg; g.fill();
  g.fillStyle = 'rgba(120,100,70,0.08)';             // grano del papel
  for (let i = 0; i < 300; i++) g.fillRect(-305 + hash(i * 3.1) * 610, -405 + hash(i * 7.7) * 810, 2, 2);
  g.letterSpacing = '2px'; txt('HOJA DE RESPUESTAS', -262, -332, 58, INK, 400, 'left', 'Bebas'); g.letterSpacing = '0px';
  txt('OPOSICIÓN · BOMBERO/A', -262, -294, 22, '#6B6760', 700, 'left', 'Inter');
  g.fillStyle = INK; g.fillRect(-262, -276, 524, 3);
  for (let j = 0; j < 4; j++) txt('ABCD'[j], BX(j), -240, 24, '#6B6760', 800, 'center', 'Inter');
  for (let i = 0; i < 10; i++) {
    const y = ROWY(i);
    g.fillStyle = 'rgba(27,29,34,0.08)'; g.fillRect(-262, y + 26, 524, 1.5);
    txt(String(i + 1), -222, y + 9, 26, INK, 800, 'right', 'Inter');
    for (let j = 0; j < 4; j++) {
      g.beginPath(); g.arc(BX(j), y, 17, 0, 7);
      if (j === PICK[i]) { g.fillStyle = '#25282F'; g.fill(); }
      else { g.strokeStyle = 'rgba(27,29,34,0.42)'; g.lineWidth = 2.5; g.stroke(); }
    }
    const p = st.marks[i], f = st.flip[i];
    if (p <= 0) continue;
    g.save(); g.translate(MARKX, y);
    if (!WRONG[i]) checkMark(p, OK);
    else if (f < 0.5) { g.scale(1 - 2 * f, 1); xMark(p); }
    else { g.scale(2 * f - 1, 1); checkMark(1, OK); }
    g.restore();
    if (WRONG[i] && f > 0 && f < 1) {               // destello al girar
      g.save(); g.globalCompositeOperation = 'lighter';
      const hg = g.createRadialGradient(MARKX, y, 0, MARKX, y, 70); hg.addColorStop(0, `rgba(45,212,191,${(0.5 * Math.sin(Math.PI * f)).toFixed(3)})`); hg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hg; g.fillRect(MARKX - 70, y - 70, 140, 140); g.restore();
    }
  }
  // salpicadura de tinta de la primera ✗
  if (st.splash > 0) {
    g.fillStyle = PEN;
    for (let i = 0; i < 9; i++) {
      const an = hash(i * 9.1) * Math.PI * 2, d = 30 + 40 * hash(i * 4.3) * st.splash, r = (0.8 + 2.2 * Math.pow(hash(i * 2.7), 2)) * clamp(st.splash * 3);
      g.beginPath(); g.arc(MARKX + Math.cos(an) * d, ROWY(FIRST) + Math.sin(an) * d, r, 0, 7); g.fill();
    }
  }
  txt('FIRMA:', -262, 352, 22, '#6B6760', 700, 'left', 'Inter');
  g.fillStyle = 'rgba(27,29,34,0.35)'; g.fillRect(-180, 356, 300, 2);
  stampDraw(st.stamp, st.stampOut);
  // barrido de repaso (frase 6)
  if (st.scan > 0 && st.scan < 1) {
    const y = lerp(-260, 300, st.scan);
    g.save(); g.globalCompositeOperation = 'lighter';
    const sg = g.createLinearGradient(0, y - 60, 0, y + 6); sg.addColorStop(0, 'rgba(45,212,191,0)'); sg.addColorStop(1, 'rgba(45,212,191,0.35)');
    g.fillStyle = sg; g.fillRect(-300, y - 60, 600, 66);
    g.fillStyle = 'rgba(45,212,191,0.9)'; g.fillRect(-300, y, 600, 4);
    g.restore();
  }
}
function sheet(t) {
  let x = SHEET0.x, y = SHEET0.y, s = SHEET0.s, r = 0, a = 1;
  const o = eio(prog(t, CUE.academia - 0.12, 0.5));               // se va a la izquierda en «academia»
  x = lerp(x, -560, o); r = lerp(0, -0.55, o);
  if (t >= CUE.despues - 0.1) {                                     // vuelve desde abajo en «después»
    const k = back(prog(t, CUE.despues - 0.1, 0.55));
    x = 540; y = lerp(2500, 930, k); r = lerp(0.25, 0, clamp(k)); s = 0.9;
    const e = eio(prog(t, CUE.marca - 0.2, 0.45));
    y = lerp(y, 1650, e); s = lerp(s, 0.35, e); a = 1 - e;
  } else if (o >= 1) return;
  if (a <= 0) return;
  const marks = [], flip = [];
  for (let i = 0; i < 10; i++) {
    marks.push(i === FIRST ? clamp((t + 0.1) / 0.3) : prog(t, CUE.fallando - 0.05 + 0.065 * i, 0.16));
    flip.push(prog(t, CUE.repasa + 0.1 + 0.075 * i, 0.22));
  }
  const st = { marks, flip, splash: prog(t, 0.12, 0.25) * (1 - prog(t, CUE.despues - 0.2, 0.2)), stamp: prog(t, CUE.examen1 - 0.02, 0.16), stampOut: eo(prog(t, CUE.repasa + 0.45, 0.4)), scan: prog(t, CUE.repasa, 0.9) };
  g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s); g.globalAlpha = a;
  sheetDraw(t, st);
  g.restore();
}

// ---------------------------------------------------------------- pila de manuales bajo la hoja («estudiar»)
const BOOKS = [['HIDRÁULICA', '#1E3A8A', 760, -10, 0.01], ['PRIMEROS AUXILIOS', '#7F1D1D', 720, 18, -0.012], ['MERCANCÍAS PELIGROSAS', '#14532D', 800, -6, 0.006],
  ['INCENDIOS', '#9A3412', 700, 14, -0.008], ['LEGISLACIÓN', '#374151', 780, -12, 0.01]];
function books(t) {
  const t0 = CUE.estudiar - 0.1;
  const o = eio(prog(t, CUE.academia - 0.08, 0.55));
  if (o >= 1) return;
  for (let i = 0; i < BOOKS.length; i++) {
    const [name, col, w, dx, rot] = BOOKS[i];
    const p = prog(t, t0 + 0.07 * i, 0.32);
    if (p <= 0) continue;
    const side = i % 2 ? 1 : -1, e = eo(p);
    const x = 540 + dx + side * (1 - e) * 1000 - o * (1400 + i * 90), y = 1302 + i * 66 - 26 * Math.sin(Math.PI * clamp(p * 1.4)) * (1 - e);
    const h = 62;
    g.save(); g.translate(x, y); g.rotate(rot + (1 - e) * 0.08 * side);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    rr(-w / 2, -h / 2, w, h, 8); g.fillStyle = col; g.fill();
    g.shadowColor = 'transparent';
    const sg = g.createLinearGradient(0, -h / 2, 0, h / 2); sg.addColorStop(0, 'rgba(255,255,255,0.18)'); sg.addColorStop(1, 'rgba(0,0,0,0.28)');
    rr(-w / 2, -h / 2, w, h, 8); g.fillStyle = sg; g.fill();
    g.fillStyle = 'rgba(242,178,51,0.85)'; g.fillRect(-w / 2 + 34, -h / 2 + 6, 7, h - 12); g.fillRect(w / 2 - 41, -h / 2 + 6, 7, h - 12);
    g.letterSpacing = '4px'; txt(name, 0, 14, 40, '#F3E9D2', 400, 'center', 'Bebas'); g.letterSpacing = '0px';
    g.restore();
  }
}

// ---------------------------------------------------------------- calendario (frases 2 y 3)
const CAL = { x: 540, y: 1030 };
const COLX = j => -339 + j * 113, ROWYC = r => -130 + r * 100;
function calCells(nov) {
  const first = nov ? 6 : 3, n = nov ? 30 : 31, out = [];          // 1 oct 2026 = jueves; 1 nov 2026 = domingo
  for (let d = 1; d <= n; d++) { const i = first + d - 1; out.push({ d, r: Math.floor(i / 7), c: i % 7 }); }
  return out;
}
function calendar(t) {
  const tin = CUE.academia - 0.12, tout = CUE.simulacro - 0.05;
  const e = eo(prog(t, tin, 0.5)), o = eio(prog(t, tout, 0.5));
  if (e <= 0 || o >= 1) return;
  g.save();
  g.translate(lerp(1750, CAL.x, e), CAL.y + o * 800); g.rotate(lerp(0.35, 0, e)); g.globalAlpha = 1 - o;
  rr(-450, -430, 900, 860, 28); g.fillStyle = 'rgba(17,18,20,0.94)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 2; g.stroke();
  const fu = prog(t, CUE.domingo - 0.1, 0.34), nov = fu >= 0.5;
  const sy = fu > 0 && fu < 1 ? Math.max(0.02, Math.abs(Math.cos(fu * Math.PI))) : 1;
  // mes
  g.save(); g.translate(0, -352); g.scale(1, sy);
  g.font = '400 100px Bebas'; g.letterSpacing = '3px'; g.textAlign = 'left';
  const mname = nov ? 'NOVIEMBRE' : 'OCTUBRE';
  g.fillStyle = WHITE; g.fillText(mname, -400, 36);
  const mw = g.measureText(mname + ' ').width;
  g.fillStyle = ORANGE; g.fillText('2026', -400 + mw, 36);
  g.letterSpacing = '0px';
  g.restore();
  // contador de simulacros: 0 (rojo) → 1 (naranja) cuando se rodea el domingo 1
  const cf = prog(t, CUE.uno + 0.1, 0.26), one = cf >= 0.5;
  const csy = cf > 0 && cf < 1 ? Math.max(0.02, Math.abs(Math.cos(cf * Math.PI))) : 1;
  const cp = 1 + 0.28 * pulse(t, CUE.simulacro0 + 0.12, 0.12) + 0.25 * pulse(t, CUE.uno + 0.28, 0.12);
  g.letterSpacing = '3px'; txt('SIMULACROS', 400, -374, 24, DIM, 800, 'right', 'Inter'); g.letterSpacing = '0px';
  g.save(); g.translate(352, -300); g.scale(cp, cp * csy);
  g.beginPath(); g.arc(0, 0, 50, 0, 7); g.fillStyle = rgba(one ? ORANGE : RED, 0.16); g.fill(); g.strokeStyle = one ? ORANGE : RED; g.lineWidth = 4; g.stroke();
  txt(one ? '1' : '0', 0, 30, 88, one ? ORANGE : RED, 400, 'center', 'Bebas');
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(-400, -240, 800, 2);
  for (let j = 0; j < 7; j++) txt('LMXJVSD'[j], COLX(j), -195, 40, j >= 5 ? ORANGE : DIM, 400, 'center', 'Bebas');
  // casillas
  g.save(); g.translate(0, 120); g.scale(1, sy); g.translate(0, -120);
  for (const c of calCells(nov)) {
    const x = COLX(c.c), y = ROWYC(c.r);
    const hot = nov && c.d === 1;
    if (hot && t > CUE.simulacro - 0.12) continue;                  // la casilla ya ha salido volando (chip de la fecha)
    rr(x - 52, y - 45, 104, 90, 14); g.fillStyle = 'rgba(255,255,255,0.035)'; g.fill();
    txt(String(c.d), x - 40, y - 8, 30, c.c >= 5 ? 'rgba(238,242,246,0.55)' : 'rgba(238,242,246,0.8)', 700, 'left', 'Inter');
    if (!nov) {
      const k = prog(t, CUE.simulacro0 - 0.12 + 0.012 * (c.d - 1), 0.18);   // ni un simulacro: raya roja en cada día
      if (k > 0) { g.strokeStyle = rgba(RED, 0.8); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 24, y + 22); g.lineTo(x - 24 + 48 * eo(k), y + 22); g.stroke(); }
      if (c.d === 31) { rr(x - 52, y - 45, 104, 90, 14); g.strokeStyle = TEAL; g.lineWidth = 3; g.stroke(); txt('HOY', x + 42, y - 12, 24, TEAL, 400, 'right', 'Bebas'); }
    } else if (hot) {
      const k = prog(t, CUE.uno - 0.06, 0.42);
      rr(x - 52, y - 45, 104, 90, 14); g.fillStyle = rgba(ORANGE, 0.3 * eo(k)); g.fill();
      if (k > 0) {
        g.save(); g.strokeStyle = ORANGE; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = rgba(ORANGE, 0.8); g.shadowBlur = 18;
        g.beginPath(); g.ellipse(x, y, 68, 58, -0.12, -2.0, -2.0 + 2.2 * Math.PI * eo(k)); g.stroke(); g.restore();
      }
    }
  }
  g.restore();
  g.restore();
}

// ---------------------------------------------------------------- «SIMULACRO» + EN DIRECTO + fecha (pantalla) → cabecera
function pill(cx, cy, h, px, label, fill, stroke, col, dot, t) {
  g.font = `400 ${px}px Bebas`; g.letterSpacing = `${(px * 0.04).toFixed(1)}px`;
  const tw = g.measureText(label).width, dw = dot ? h * 0.5 : 0, w = tw + h * 0.9 + dw;
  rr(cx - w / 2, cy - h / 2, w, h, h / 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(2, h * 0.04); g.stroke(); }
  const x0 = cx - w / 2 + h * 0.45;
  if (dot) { g.beginPath(); g.arc(x0 + h * 0.13, cy, h * 0.14, 0, 7); g.fillStyle = `rgba(255,255,255,${(0.55 + 0.45 * Math.abs(Math.sin(t * 3.4))).toFixed(3)})`; g.fill(); }
  g.textAlign = 'left'; g.fillStyle = col; g.fillText(label, x0 + dw, cy + px * 0.35);
  g.letterSpacing = '0px';
  return w;
}
function measure(s, px, sp = 0.02) { g.font = `400 ${px}px Bebas`; g.letterSpacing = `${(px * sp).toFixed(1)}px`; const w = g.measureText(s).width; g.letterSpacing = '0px'; return w; }
function pillW(px, h, label, dot) { return measure(label, px, 0.04) + h * 0.9 + (dot ? h * 0.5 : 0); }

const cross = y => 1 - 0.7 * Math.exp(-Math.pow((y - 330) / 85, 2));   // al cruzar la franja de los subtítulos, casi transparente
function simStack(t) {
  const t0 = CUE.simulacro;
  if (t < t0 - 0.14) return;
  const k = eio(prog(t, CUE.desde - 0.15, 0.55));
  const kb = eio(prog(t, CUE.desde - 0.03, 0.55)), kc = eio(prog(t, CUE.desde + 0.07, 0.55));   // escalonados: no se pisan
  const fade = 1 - prog(t, CUE.marca - 0.1, 0.4) * 0.6;
  const sh = shakeAmt(t) * (1 - k);
  g.save(); g.translate(sh * 16 * Math.sin(t * 93), sh * 12 * Math.cos(t * 71)); g.globalAlpha = fade;
  // posiciones en la cabecera
  const tw46 = measure('SIMULACRO', 46), bx = 60 + tw46 + 18, bw = pillW(26, 42, 'EN DIRECTO', true), cxh = bx + bw + 12, cw = pillW(26, 42, 'DOM 1 NOV', false);
  // chip de la fecha: sale de la casilla del domingo 1 (por detrás del título)
  const ca = eio(prog(t, t0 - 0.12, 0.5));
  if (CAM && ca > 0) {
    const [sx, sy] = camPt(CAL.x + COLX(6), CAL.y + ROWYC(0));
    const big = { x: 540, y: 556, h: 84, px: 54 };
    const w0 = 104, h0 = 90;
    const wb = pillW(54, 84, 'DOMINGO · 1 NOV', false);
    const cy = eo(prog(t, t0 - 0.12, 0.3));                       // sube antes de ir a la izquierda: rodea el título
    let x = lerp(sx, big.x, ca), y = lerp(sy, big.y, cy), h = lerp(h0, big.h, ca), w = lerp(w0, wb, ca);
    if (kc > 0) { x = lerp(x, cxh + cw / 2, kc); y = lerp(y, 124, kc); h = lerp(h, 42, kc); w = lerp(w, cw, kc); }
    g.save(); g.globalAlpha *= kc > 0 && kc < 1 ? cross(y) : 1;
    rr(x - w / 2, y - h / 2, w, h, lerp(14, h / 2, ca)); g.fillStyle = `rgba(255,122,26,${lerp(0.3, 0.16, ca).toFixed(3)})`; g.fill();
    g.strokeStyle = ORANGE; g.lineWidth = lerp(7, 3, ca); g.stroke();
    const lab = kc < 0.5 ? 'DOMINGO · 1 NOV' : 'DOM 1 NOV', lpx = lerp(54, 26, kc);
    g.globalAlpha *= clamp((ca - 0.45) * 3) * (kc < 0.5 ? 1 - kc * 2 : (kc - 0.5) * 2);
    g.font = `400 ${lpx}px Bebas`; g.letterSpacing = `${(lpx * 0.04).toFixed(1)}px`; g.textAlign = 'center'; g.fillStyle = ORANGE;
    g.fillText(lab, x, y + lpx * 0.35); g.letterSpacing = '0px';
    g.restore();
    if (ca < 0.6) { g.save(); g.globalAlpha *= 1 - ca / 0.6; txt('1', x - 40 * (1 - ca), y - 8, 30, WHITE, 700, 'left', 'Inter'); g.restore(); }
  }
  // título
  const px = lerp(236, 46, k), tw = measure('SIMULACRO', px);
  const slam = eo(prog(t, t0 - 0.04, 0.16)), sc = lerp(1.55, 1, slam);
  const tx = lerp(540 - tw / 2, 60, k), ty = lerp(800, 140, k);
  g.save(); g.globalAlpha *= clamp(slam * 3) * (k > 0 && k < 1 ? cross(ty - px * 0.35) : 1);
  g.translate(tx + tw / 2, ty - px * 0.35); g.scale(sc, sc); g.translate(-(tx + tw / 2), -(ty - px * 0.35));
  g.font = `400 ${px}px Bebas`; g.letterSpacing = `${(px * 0.02).toFixed(1)}px`; g.textAlign = 'left'; g.fillStyle = WHITE;
  g.shadowColor = 'rgba(255,122,26,0.45)'; g.shadowBlur = 40 * (1 - k); g.fillText('SIMULACRO', tx, ty); g.shadowBlur = 0; g.letterSpacing = '0px';
  const ul = eo(prog(t, t0 + 0.12, 0.35)) * (1 - k);
  if (ul > 0) { g.fillStyle = ORANGE; g.fillRect(tx, ty + 24, tw * ul, 12); }
  g.restore();
  // EN DIRECTO
  const ba = back(prog(t, CUE.directo - 0.06, 0.36));
  if (ba > 0) {
    const bh = lerp(88, 42, kb), bpx = lerp(62, 26, kb);
    const bcx = lerp(540, bx + bw / 2, kb), bcy = lerp(912, 124, kb);
    g.save(); g.translate(bcx, bcy); g.scale(kb > 0 ? 1 : ba, kb > 0 ? 1 : ba); g.globalAlpha *= kb > 0 && kb < 1 ? cross(bcy) : 1;
    if (kb < 1) { const gl = g.createRadialGradient(0, 0, 10, 0, 0, 260); gl.addColorStop(0, `rgba(255,59,59,${(0.35 * (1 - kb)).toFixed(3)})`); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(-260, -260, 520, 520); }
    pill(0, 0, bh, bpx, 'EN DIRECTO', RED, null, '#FFFFFF', true, t);
    g.restore();
  }
  // Adrián Luna
  const pa = eo(prog(t, CUE.adrian - 0.1, 0.4)), pout = eio(prog(t, CUE.desde - 0.2, 0.42));
  if (pa > 0 && pout < 1) {
    g.save(); g.globalAlpha *= pa * (1 - pout); g.translate(540 - (1 - pa) * 260, 1085 + pout * 520);
    rr(-400, -86, 800, 172, 26); g.fillStyle = 'rgba(17,18,20,0.92)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(-300, 0, 58, 0, 7); g.fillStyle = rgba(ORANGE, 0.16); g.fill(); g.strokeStyle = ORANGE; g.lineWidth = 3; g.stroke();
    mic(-300, 2, 1);
    g.letterSpacing = '5px'; txt('CON', -212, -24, 28, DIM, 800, 'left', 'Inter'); g.letterSpacing = '0px';
    txt('ADRIÁN LUNA', -214, 56, 98, WHITE, 400, 'left', 'Bebas');
    g.restore();
  }
  // Élite Bomberos
  const ea = prog(t, CUE.elite - 0.06, 0.45), eout = eio(prog(t, CUE.desde - 0.2, 0.42));
  if (ea > 0 && eout < 1) {
    const sp = lerp(36, 5, eo(ea));
    g.save(); g.globalAlpha *= clamp(ea * 2) * (1 - eout); g.translate(0, eout * 520);
    g.font = '400 96px Bebas'; g.letterSpacing = sp + 'px';
    const w = g.measureText('ÉLITE BOMBEROS').width, x0 = 540 - (w + 74) / 2;
    flame(x0 + 26, 1262, 1.15);
    g.textAlign = 'left'; g.fillStyle = ORANGE; g.fillText('ÉLITE BOMBEROS', x0 + 74, 1296); g.letterSpacing = '0px';
    g.restore();
  }
  g.restore();
}
function mic(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  rr(-13, -34, 26, 44, 13); g.fillStyle = ORANGE; g.fill();
  g.strokeStyle = ORANGE; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.arc(0, -8, 22, 0, Math.PI); g.stroke();
  g.beginPath(); g.moveTo(0, 14); g.lineTo(0, 30); g.moveTo(-13, 30); g.lineTo(13, 30); g.stroke();
  g.restore();
}
function flame(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const fg = g.createLinearGradient(0, -36, 0, 30); fg.addColorStop(0, '#FFD65C'); fg.addColorStop(1, ORANGE);
  g.beginPath(); g.moveTo(0, 30);
  g.bezierCurveTo(-24, 28, -28, 2, -12, -14);
  g.bezierCurveTo(-10, -4, -4, -2, -2, -6);
  g.bezierCurveTo(-6, -20, 2, -30, 6, -36);
  g.bezierCurveTo(10, -22, 28, -8, 24, 10);
  g.bezierCurveTo(22, 24, 12, 30, 0, 30);
  g.fillStyle = fg; g.shadowColor = rgba(ORANGE, 0.8); g.shadowBlur = 20; g.fill();
  g.restore();
}

// ---------------------------------------------------------------- casa + portátil con el simulacro en directo (frase 4)
function laptop(t) {
  g.save(); g.translate(540, 1110);
  g.beginPath(); g.moveTo(-300, 200); g.lineTo(300, 200); g.lineTo(330, 236); g.lineTo(-330, 236); g.closePath();
  g.fillStyle = '#2A2E36'; g.fill(); g.fillStyle = '#3A3F49'; g.fillRect(-300, 200, 600, 6);
  rr(-60, 222, 120, 8, 4); g.fillStyle = '#1C1F25'; g.fill();
  g.save(); g.shadowColor = 'rgba(255,122,26,0.35)'; g.shadowBlur = 50;
  rr(-310, -200, 620, 400, 22); g.fillStyle = '#23262D'; g.fill(); g.restore();
  rr(-310, -200, 620, 400, 22); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.stroke();
  rr(-292, -182, 584, 364, 10); g.fillStyle = '#0C0E12'; g.fill();
  // barra de arriba: EN DIRECTO + SIMULACRO + reloj
  pill(-197, -150, 34, 22, 'EN DIRECTO', RED, null, '#FFFFFF', true, t);
  txt('SIMULACRO', -108, -141, 28, WHITE, 400, 'left', 'Bebas');
  const ru = prog(t, CUE.examen2, 9);
  g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(258, -150, 17, 0, 7); g.stroke();
  if (t > CUE.examen2 - 0.2) { g.strokeStyle = ORANGE; g.lineCap = 'round'; g.beginPath(); g.arc(258, -150, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ru)); g.stroke(); }
  // la pregunta y las 4 opciones
  rr(-272, -116, 544, 66, 10); g.fillStyle = '#171A20'; g.fill();
  rr(-252, -100, 400, 10, 5); g.fillStyle = 'rgba(238,242,246,0.38)'; g.fill();
  rr(-252, -78, 290, 10, 5); g.fill();
  const sel = prog(t, CUE.examen2 + 0.35, 0.2);
  for (let i = 0; i < 4; i++) {
    const y = -18 + i * 52, col = LETCOL[i], on = i === 1 ? sel : 0;
    rr(-272, y - 21, 360, 42, 10); g.fillStyle = on > 0 ? rgba(TEAL, 0.18 * on) : '#15171B'; g.fill();
    g.strokeStyle = on > 0 ? rgba(TEAL, on) : 'rgba(255,255,255,0.08)'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(-248, y, 14, 0, 7); g.fillStyle = rgba(col, 0.2); g.fill(); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
    txt('ABCD'[i], -248, y + 8, 22, col, 400, 'center', 'Bebas');
    rr(-222, y - 5, 120 + 100 * hash(i + 4), 10, 5); g.fillStyle = 'rgba(238,242,246,0.28)'; g.fill();
  }
  // el profesor en directo
  rr(108, -40, 164, 200, 12); g.fillStyle = '#1A1D23'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2; g.stroke();
  g.save(); rr(108, -40, 164, 200, 12); g.clip();
  const pg = g.createLinearGradient(0, -10, 0, 160); pg.addColorStop(0, '#FF9A4A'); pg.addColorStop(1, '#C2410C');
  g.fillStyle = pg; g.beginPath(); g.arc(190, 32, 28, 0, 7); g.fill();
  g.beginPath(); g.ellipse(190, 134, 60, 46, 0, Math.PI, 2 * Math.PI); g.fill();
  g.restore();
  g.beginPath(); g.arc(124, -24, 5, 0, 7); g.fillStyle = `rgba(255,59,59,${(0.5 + 0.5 * Math.abs(Math.sin(t * 3.4))).toFixed(3)})`; g.fill();
  txt('ADRIÁN', 190, 150, 22, WHITE, 400, 'center', 'Bebas');
  // reflejo de la pantalla
  const gl = g.createLinearGradient(-292, -182, 292, 182); gl.addColorStop(0, 'rgba(255,255,255,0.05)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0.02)');
  rr(-292, -182, 584, 364, 10); g.fillStyle = gl; g.fill();
  g.restore();
}
function house(t) {
  const tin = CUE.desde - 0.1, tout = CUE.apuntate - 0.12;
  const e = eo(prog(t, tin, 0.5)), o = eio(prog(t, tout, 0.5));
  if (e <= 0 || o >= 1) return;
  g.save(); g.translate(0, (1 - e) * 1000 + o * 1150);
  const hk = eo(prog(t, CUE.casa - 0.14, 0.55));
  if (hk > 0) {
    const hg = g.createRadialGradient(540, 1120, 40, 540, 1120, 560);
    hg.addColorStop(0, `rgba(255,122,26,${(0.22 * hk).toFixed(3)})`); hg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hg; g.fillRect(150, 560, 780, 1000);
    const L = 2830;
    g.save(); g.setLineDash([L * hk, L]); g.strokeStyle = ORANGE; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round';
    g.shadowColor = rgba(ORANGE, 0.7); g.shadowBlur = 24;
    g.beginPath(); g.moveTo(200, 1520); g.lineTo(200, 870); g.lineTo(540, 615); g.lineTo(880, 870); g.lineTo(880, 1520); g.lineTo(200, 1520); g.stroke();
    g.restore();
  }
  laptop(t);
  g.restore();
}

// ---------------------------------------------------------------- etiqueta de precio: 10 €
function priceTag(t) {
  const t0 = CUE.precio - 0.15;
  if (t < t0) return;
  const d = back(prog(t, t0, 0.38));
  const toCta = eio(prog(t, CUE.apuntate - 0.1, 0.5)), gone = eio(prog(t, CUE.despues - 0.1, 0.45));
  if (gone >= 1) return;
  const px = lerp(792, 858, toCta) + gone * 600, py = lerp(636, 488, toCta) - (1 - d) * 1000;
  const s = lerp(1, 0.72, toCta);
  const u = Math.max(0, t - t0 - 0.3);
  const ang = 0.5 * Math.exp(-u * 2.4) * Math.cos(u * 7.2) + 0.04 * Math.sin(t * 1.7);
  g.save(); g.translate(px, py); g.scale(s, s);
  g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fillStyle = GOLD; g.fill();           // chincheta
  g.rotate(ang);
  g.strokeStyle = 'rgba(238,242,246,0.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 124); g.stroke();
  g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 34; g.shadowOffsetY = 12;
  rr(-126, 96, 252, 206, 26); const tg = g.createLinearGradient(0, 96, 0, 302); tg.addColorStop(0, '#FF8A2A'); tg.addColorStop(1, '#E2560A'); g.fillStyle = tg; g.fill();
  g.restore();
  g.beginPath(); g.arc(0, 124, 11, 0, 7); g.fillStyle = '#3A1A06'; g.fill();
  g.strokeStyle = 'rgba(238,242,246,0.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 118); g.stroke();
  g.letterSpacing = '5px'; txt('SOLO', 2, 180, 30, '#FFF4E8', 900, 'center', 'Inter'); g.letterSpacing = '0px';
  txt('10 €', 0, 286, 128, '#FFFFFF', 400, 'center', 'Bebas');
  // brillo que cruza
  const sw = prog((t - t0 - 0.55) % 2.6, 0, 0.5);
  if (t > t0 + 0.55 && sw > 0 && sw < 1) {
    g.save(); rr(-126, 96, 252, 206, 26); g.clip(); g.globalCompositeOperation = 'lighter';
    const x = lerp(-260, 260, sw);
    const bg = g.createLinearGradient(x - 50, 0, x + 50, 0); bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
    g.setTransform(g.getTransform().multiply(new DOMMatrix([1, 0, -0.35, 1, 0, 0])));
    g.fillStyle = bg; g.fillRect(x - 50, 80, 100, 240);
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- APÚNTATE + @elitebomberos (frase 5)
const HANDLE = '@elitebomberos';
function cta(t) {
  const t0 = CUE.apuntate;
  if (t < t0 - 0.1) return;
  const out = eio(prog(t, CUE.despues - 0.12, 0.45));
  const tap = t0 + 0.5;
  if (out < 1) {
    // botón
    const b = back(prog(t, t0 - 0.06, 0.4)), press = 1 - 0.07 * pulse(t, tap, 0.07);
    g.save(); g.globalAlpha = clamp(b * 2) * (1 - out); g.translate(540, 1200 - out * 160); g.scale(b * press, b * press);
    rr(-320, -78, 640, 156, 78); g.fillStyle = ORANGE; g.shadowColor = rgba(ORANGE, 0.8); g.shadowBlur = 44; g.fill(); g.shadowBlur = 0;
    rr(-300, -68, 600, 26, 13); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill();
    g.letterSpacing = '5px'; txt('APÚNTATE', 0, 37, 106, '#FFFFFF', 400, 'center', 'Bebas'); g.letterSpacing = '0px';
    g.restore();
    // dedo (toque) y onda
    const m = eio(prog(t, t0 + 0.05, 0.45));
    const fx = lerp(820, 640, m), fy = lerp(1560, 1222, m);
    const fa = prog(t, t0 + 0.05, 0.15) * (1 - prog(t, tap + 0.35, 0.25)) * (1 - out);
    if (fa > 0) {
      g.save(); g.globalAlpha = fa;
      const pr = 1 - 0.25 * pulse(t, tap, 0.08);
      g.beginPath(); g.arc(fx, fy, 38 * pr, 0, 7); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.stroke();
      g.restore();
    }
    const rp = prog(t, tap, 0.55);
    if (rp > 0 && rp < 1) { g.save(); g.globalAlpha = (1 - rp) * (1 - out); g.strokeStyle = WHITE; g.lineWidth = 6; g.beginPath(); g.arc(640, 1222, 40 + 260 * eo(rp), 0, 7); g.stroke(); g.restore(); }
    // EN INSTAGRAM
    const ia = eo(prog(t, CUE.instagram - 0.06, 0.4));
    if (ia > 0) { g.save(); g.globalAlpha = ia * (1 - out); g.letterSpacing = '8px'; txt('EN INSTAGRAM', 544, 836 + (1 - ia) * 30 - out * 160, 40, DIM, 800, 'center', 'Inter'); g.letterSpacing = '0px'; g.restore(); }
  }
  // @elitebomberos: se escribe y luego baja al pie
  const ty = prog(t, CUE.elite2 - 0.1, 0.5);
  if (ty > 0) {
    const n = Math.ceil(ty * HANDLE.length), s = HANDLE.slice(0, n);
    const k = eio(prog(t, CUE.despues - 0.1, 0.5)), gone = prog(t, CUE.marca - 0.1, 0.3);
    if (gone < 1) {
      let px = 100;
      g.font = `900 ${px}px Inter`; const wf = g.measureText(HANDLE).width;
      if (wf > 880) px = px * 880 / wf;
      px = lerp(px, 46, k);
      g.font = `900 ${px}px Inter`;
      const wfull = g.measureText(HANDLE).width, x0 = 540 - wfull / 2, y = lerp(1000, 1508, k);
      g.save(); g.globalAlpha = 1 - gone; g.textAlign = 'left';
      g.fillStyle = ORANGE; g.fillText(s.slice(0, 1), x0, y);
      const wat = g.measureText('@').width;
      g.fillStyle = WHITE; g.fillText(s.slice(1), x0 + wat, y);
      if (ty < 1 || (t - CUE.elite2) < 1.2) {
        const cw = g.measureText(s).width;
        if (Math.sin(t * 12) > -0.2) { g.fillStyle = ORANGE; g.fillRect(x0 + cw + 6, y - px * 0.78, Math.max(3, px * 0.06), px * 0.9); }
      }
      g.restore();
    }
  }
}

// ---------------------------------------------------------------- cierre: placa BOMBERADOS + lema + recordatorio
function closing(t) {
  const a = prog(t, CUE.marca - 0.1, 0.35);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const hg = g.createRadialGradient(540, 900, 50, 540, 900, 620);
  hg.addColorStop(0, 'rgba(255,122,47,0.45)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hg; g.fillRect(0, 300, W, 1200);
  const s = lerp(0.6, 1, back(prog(t, CUE.marca - 0.1, 0.55)));
  g.save(); g.translate(540, 860); g.scale(s, s);
  g.font = '400 150px Bebas'; const tw = g.measureText('BOMBERADOS').width;
  const pw = tw + 110, ph = 210;
  rr(-pw / 2, -ph / 2, pw, ph, 32);
  const pg = g.createLinearGradient(0, -ph / 2, 0, ph / 2); pg.addColorStop(0, '#FFD65C'); pg.addColorStop(1, '#E88C1E');
  g.fillStyle = pg; g.shadowColor = 'rgba(255,122,47,0.9)'; g.shadowBlur = 60; g.fill(); g.shadowBlur = 0;
  rr(-pw / 2 + 8, -ph / 2 + 8, pw - 16, 22, 11); g.fillStyle = 'rgba(255,240,190,0.35)'; g.fill();
  txt('BOMBERADOS', 0, 54, 150, '#160F05', 400, 'center', 'Bebas');
  g.restore();
  const la = eo(prog(t, (CUE.falla ?? CUE.marca + 0.6) - 0.05, 0.4));
  g.globalAlpha = a * la;
  txt('Falla en casa, no en el examen.', 540, 1060 + 20 * (1 - la), 52, WHITE, 800, 'center');
  // recordatorio del simulacro
  const ra = back(prog(t, (CUE.falla ?? CUE.marca + 0.6) + 0.5, 0.45));
  if (ra > 0) {
    g.globalAlpha = a * clamp(ra * 2);
    const s1 = 'SIMULACRO · DOM 1 NOV · ';
    g.font = '400 50px Bebas'; g.letterSpacing = '2px'; const w1 = g.measureText(s1).width;
    g.font = '900 38px Inter'; g.letterSpacing = '0px'; const w2 = g.measureText(HANDLE).width;
    const wt = w1 + w2;
    g.save(); g.translate(540, 1236); g.scale(ra, ra);
    rr(-wt / 2 - 40, -48, wt + 80, 96, 48); g.fillStyle = 'rgba(17,18,20,0.92)'; g.fill(); g.strokeStyle = ORANGE; g.lineWidth = 3; g.stroke();
    g.textAlign = 'left'; g.font = '400 50px Bebas'; g.letterSpacing = '2px'; g.fillStyle = WHITE; g.fillText(s1, -wt / 2, 18);
    g.letterSpacing = '0px'; g.font = '900 38px Inter'; g.fillStyle = ORANGE; g.fillText(HANDLE, -wt / 2 + w1, 15);
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- cabecera
function hud(t) {
  const fade = 1 - prog(t, CUE.marca - 0.1, 0.4) * 0.6;
  g.save(); g.globalAlpha = fade * eo(prog(t, 0.9, 0.4));
  g.letterSpacing = '3px'; txt('BOMBERADOS', W - 60, 138, 40, WHITE, 400, 'right', 'Bebas'); g.letterSpacing = '0px';
  g.fillStyle = 'rgba(238,242,246,0.12)'; g.fillRect(60, 200, W - 120, 4);
  g.fillStyle = ORANGE; g.fillRect(60, 200, (W - 120) * clamp(t / END), 4);
  g.restore();
}

// ---------------------------------------------------------------- fotograma
window.renderAt = t => {
  g.setTransform(PR, 0, 0, PR, 0, 0);
  background(t);
  dots(t);
  sparks(t);
  g.save(); camera(t); CAM = g.getTransform();
  books(t);
  sheet(t);
  calendar(t);
  house(t);
  priceTag(t);
  cta(t);
  closing(t);
  g.restore();
  if (t < 1.8) { g.save(); g.globalAlpha = 0.85 * (1 - prog(t, 1.1, 0.7)); sparks(t + 3.7, 90); g.restore(); }   // chispas por delante en la apertura
  simStack(t);
  whips(t);
  hud(t);
  const f = prog(t, END - 0.25, 0.25);
  if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
};

(async () => {
  try {
    const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }),
      new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
      new FontFace('Bebas', `url(${F}BebasNeue-Regular.ttf)`)];
    for (const f of faces) { await f.load(); document.fonts.add(f); }
    V = await (await fetch('../video.json')).json();
    const lines = await (await fetch('../tiempos.json')).json();
    for (const [k, v] of Object.entries(V.cues)) CUE[k] = Array.isArray(v[0]) ? v.map(s => cueTime(s, lines)) : cueTime(v, lines);
    END = lines[lines.length - 1].end + 1.2;
    window.END = END;
    window.ready = true;
  } catch (e) { window.failed = String(e); console.log('ERROR', e); }
})();
