// Plantilla «Pregunta del día» (Bomberados, formato 3): canvas 2D, 1080x1920.
// Lee ../pregunta.json y ../tiempos.json del proyecto (la página vive en projects/<p>/web/index.html).
// window.renderAt(t) dibuja el fotograma del segundo t; window.ready = true cuando está cargado.
const W = 1080, H = 1920;
const PR = window.PR || 1;
const cv = document.createElement('canvas');
cv.width = W * PR; cv.height = H * PR;
cv.style.width = W + 'px'; cv.style.height = H + 'px';
document.body.appendChild(cv);
const g = cv.getContext('2d');

const GOLD = '#F2B233', EMBER = '#FF7A2F', RED = '#FF5A4E', WHITE = '#EEF2F6', WATER = '#5EC8F2', DIM = '#8A93A3';
const F = '../../../engine/fonts/';
let Q, CUE = {}, END = 25;

// ---------------------------------------------------------------- utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, t0, d) => clamp((t - t0) / d);
const eo = x => 1 - Math.pow(1 - x, 3);
const eio = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const norm = w => w.toLowerCase().normalize('NFC').replace(/[^0-9a-záéíóúñü]/g, '');

function cueTime(spec, lines) {
  const [word, k, line] = spec;
  let c = 0;
  for (const w of lines[line - 1].words) if (norm(w.w) === norm(word) && ++c === k) return w.start - 0.03;
  throw new Error('sin cue ' + spec);
}

function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function txt(s, x, y, px, col, w = 700, al = 'left', fam = 'Inter') { g.font = `${w} ${px}px ${fam}`; g.fillStyle = col; g.textAlign = al; g.fillText(s, x, y); }
function wrap(s, maxW, px, w = 700, fam = 'Inter') {
  g.font = `${w} ${px}px ${fam}`;
  const out = []; let line = '';
  for (const word of s.split(' ')) {
    const tst = line ? line + ' ' + word : word;
    if (g.measureText(tst).width > maxW && line) { out.push(line); line = word; } else line = tst;
  }
  if (line) out.push(line);
  return out;
}

// ---------------------------------------------------------------- chispas: estelas que suben, se enfrían y serpentean
function sparkAt(i, age) {
  const v = 260 + 380 * hash(i + 21), acc = 40 + 80 * hash(i + 22);
  const y = H + 30 - v * age - 0.5 * acc * age * age;
  const x = hash(i + 23) * W + (hash(i + 24) - 0.4) * 90 * age
    + 38 * Math.sin(age * (1.6 + 2 * hash(i + 25)) + 6 * hash(i + 26)) + 12 * Math.sin(age * (7 + 5 * hash(i + 27)) + i);
  return [x, y];
}
function sparks(t) {
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < 190; i++) {
    const L = 2.2 + 3.5 * hash(i + 31), P = L + 0.3 + 2 * hash(i + 32);
    const age = (t + hash(i + 33) * P) % P;
    if (age > L) continue;
    const k = age / L;
    const [x, y] = sparkAt(i, age), [px, py] = sparkAt(i, Math.max(0, age - 0.03));
    if (y < -20) continue;
    // color de la temperatura: blanco-amarillo → naranja → rojo brasa
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
  // unas pocas brasas cerca de la cámara, grandes y desenfocadas
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

// ---------------------------------------------------------------- fondo: brasas y fuego en bucle
function background(t) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#07080C'); bg.addColorStop(0.55, '#0D0B0C'); bg.addColorStop(1, '#2A0E05');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // resplandor que respira abajo
  const fl = 0.85 + 0.1 * Math.sin(t * 5.1) + 0.05 * Math.sin(t * 13.3 + 1);
  let rg = g.createRadialGradient(W / 2, H + 120, 50, W / 2, H + 120, 1100 * fl);
  rg.addColorStop(0, 'rgba(255,122,47,0.55)'); rg.addColorStop(0.45, 'rgba(200,60,10,0.22)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  // lenguas de fuego (siluetas suaves que suben)
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = (i + 0.5) / 9 * W + Math.sin(t * 1.3 + i) * 30;
    const h = 260 + 120 * Math.sin(t * 2.2 + i * 1.7) + 80 * hash(i);
    const lg = g.createRadialGradient(x, H, 10, x, H - h * 0.4, h);
    lg.addColorStop(0, 'rgba(255,170,60,0.22)'); lg.addColorStop(0.5, 'rgba(255,90,20,0.10)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(x - h, H - 2 * h, 2 * h, 2 * h);
  }
  g.restore();
  // viñeta
  const vg = g.createRadialGradient(W / 2, H * 0.45, 300, W / 2, H * 0.45, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- HUD
function hud(t) {
  const a = 1 - prog(t, CUE.marca - 0.1, 0.4) * 0.6;
  g.globalAlpha = a;
  txt('PREGUNTA DEL DÍA · Nº ' + Q.numero, 60, 128, 34, GOLD, 700, 'left', 'SpaceMono');
  txt(Q.tema, 60, 172, 26, DIM, 600, 'left', 'Inter');
  txt('BOMBERADOS', W - 60, 128, 30, WHITE, 700, 'right', 'SpaceMono');
  g.fillStyle = 'rgba(238,242,246,0.25)'; g.fillRect(60, 196, W - 120, 2);
  // sello pequeño con el examen de donde sale la pregunta (aparece cuando se va el sello grande)
  if (Q.examen && CUE.enunciado !== undefined) {
    const k = eo(prog(t, CUE.enunciado + 0.2, 0.4));
    g.globalAlpha = a * k;
    txt(Q.examen, W - 60, 172, 24, RED, 700, 'right', 'SpaceMono');
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- la manguera / la reducción (intro «reduccion»)
// perfil de radio a lo largo de x para la manguera (k=0) y para la reducción (k=1)
function hoseR(x) {                       // manguera estrangulada: reloj de arena y boquilla
  const p = clamp((x - 330) / 230);
  return lerp(118, 40, eio(p));
}
const PY = 655, PS = 0.85;               // centro y escala de la reducción
const RX0 = 150, RX1 = 930, RC0 = 470, RC1 = 590, RW = 96, RN = RW * 25 / 45;
function redR(x) { return lerp(RW, RN, eio(clamp((x - RC0) / (RC1 - RC0)))); }

function pipe(t, k, cx, cy, sc, alpha) {
  // k: 0 manguera → 1 reducción. Coordenadas locales: x en [-60, 1140] (manguera) o [RX0, RX1] (reducción)
  g.save(); g.globalAlpha = alpha;
  g.translate(cx, cy); g.scale(sc, sc); g.translate(-540, 0);
  const x0 = lerp(-80, RX0, k), x1 = lerp(600, RX1, k);
  const R = x => lerp(hoseR(x), redR(lerp(RX0, RX1, (x - x0) / (x1 - x0))), k);
  const N = 80, top = [], bot = [];
  for (let i = 0; i <= N; i++) { const x = lerp(x0, x1, i / N); top.push([x, -R(x)]); bot.push([x, R(x)]); }
  // cuerpo
  const wall = 18 * (1 - k) + 14 * k;
  g.beginPath();
  top.forEach(([x, y], i) => i ? g.lineTo(x, y - wall) : g.moveTo(x, y - wall));
  for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1] + wall);
  g.closePath();
  const body = g.createLinearGradient(0, -140, 0, 140);
  if (k < 0.5) { body.addColorStop(0, '#E0473A'); body.addColorStop(0.5, '#8E1E16'); body.addColorStop(1, '#3A0B07'); }
  else { body.addColorStop(0, '#C9CED6'); body.addColorStop(0.5, '#59606B'); body.addColorStop(1, '#22262D'); }
  g.fillStyle = body; g.fill();
  // agua dentro (corte)
  g.beginPath();
  top.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
  g.closePath();
  const wg = g.createLinearGradient(0, -120, 0, 120);
  wg.addColorStop(0, 'rgba(94,200,242,0.95)'); wg.addColorStop(0.5, 'rgba(30,110,190,0.95)'); wg.addColorStop(1, 'rgba(10,50,110,0.95)');
  g.fillStyle = wg; g.fill();
  g.save(); g.clip();
  // vetas de agua: el tiempo de paso respeta caudal = sección × velocidad
  const vRef = 420;
  for (let i = 0; i < 46; i++) {
    const lane = (hash(i + 1) * 2 - 1) * 0.8;
    let x = x0 + ((t * vRef * (0.8 + 0.4 * hash(i + 4)) + hash(i + 8) * 3000) % (x1 - x0 + 200)) - 100;
    // avance acelerado en lo estrecho: x se estira donde el radio es menor
    const rr0 = R(clamp(x, x0, x1)), sp = Math.pow(R(x0 + 1) / rr0, 2);
    const len = 26 * Math.min(sp, 6);
    g.strokeStyle = `rgba(220,245,255,${0.35 + 0.4 * hash(i + 2)})`; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x - len, lane * rr0); g.lineTo(x, lane * rr0); g.stroke();
  }
  g.restore();
  // brillo y bordes
  g.strokeStyle = k < 0.5 ? 'rgba(255,190,170,0.6)' : 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
  g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y - wall + 4) : g.moveTo(x, y - wall + 4)); g.stroke();
  g.strokeStyle = 'rgba(255,122,47,0.55)'; g.lineWidth = 3;
  g.beginPath(); bot.forEach(([x, y], i) => i ? g.lineTo(x, y + wall - 3) : g.moveTo(x, y + wall - 3)); g.stroke();
  // bridas de la reducción
  if (k > 0.5) {
    g.globalAlpha = alpha * prog(k, 0.5, 0.5);
    for (const [x, r] of [[RX0, RW], [RX1, RN]]) {
      rr(x - 14, -r - 34, 28, 2 * r + 68, 6);
      const fg = g.createLinearGradient(x - 14, 0, x + 14, 0); fg.addColorStop(0, '#9AA1AC'); fg.addColorStop(1, '#3B414B');
      g.fillStyle = fg; g.fill();
    }
  }
  g.restore();
  return { x1 };
}

function jet(t, cx, cy, sc, alpha) {        // chorro disparado que sale de la boquilla
  if (alpha <= 0) return;
  g.save(); g.globalAlpha = alpha; g.translate(cx, cy); g.scale(sc, sc); g.translate(-540, 0);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 160; i++) {
    const u = (t * 1.6 + hash(i + 20)) % 1;
    const x = 600 + u * 900;
    const y = -u * u * 160 - u * 60 + (hash(i + 30) - 0.5) * (14 + u * 120);
    const r = 3 + 9 * hash(i + 40) * (0.4 + u);
    g.fillStyle = `rgba(150,220,255,${(0.65 * (1 - u * 0.7)).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const core = g.createLinearGradient(600, 0, 1300, 0);
  core.addColorStop(0, 'rgba(220,245,255,0.9)'); core.addColorStop(1, 'rgba(120,200,255,0)');
  g.strokeStyle = core; g.lineWidth = 46; g.lineCap = 'round';
  g.beginPath(); g.moveTo(600, 0); g.quadraticCurveTo(900, -90, 1300, -280); g.stroke();
  g.restore();
}

function gauge(t, x, y, r, alpha, stemTo) {   // manómetro con «?» y la aguja que tiembla
  if (alpha <= 0) return;
  g.save(); g.globalAlpha = alpha;
  if (stemTo !== undefined) { g.fillStyle = '#6B727D'; g.fillRect(x - 9, y + r - 4, 18, stemTo - (y + r) + 6); }
  g.translate(x, y);
  g.beginPath(); g.arc(0, 0, r + 10, 0, 7); g.fillStyle = '#B9BFC8'; g.fill();
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = '#F4F1EA'; g.fill();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (0.75 + 1.5 * i / 10);
    g.strokeStyle = '#2A2E35'; g.lineWidth = i % 5 ? 2 : 4;
    g.beginPath(); g.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); g.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); g.stroke();
  }
  txt('?', 0, r * 0.62, r * 0.75, RED, 900, 'center');
  const a = Math.PI * (0.75 + 1.5 * (0.5 + 0.35 * Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1)));
  g.strokeStyle = RED; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); g.stroke();
  g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fillStyle = '#2A2E35'; g.fill();
  g.restore();
}

function dimV(x, yc, r, label, k) {          // cota vertical (diámetro) con su rótulo
  if (k <= 0) return;
  g.save(); g.globalAlpha = k;
  const h = r * eo(k);
  g.strokeStyle = GOLD; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x, yc - h); g.lineTo(x, yc + h); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x - 14, yc + s * h); g.lineTo(x + 14, yc + s * h); g.stroke(); }
  const ty = yc + RW * PS + 66;
  rr(x - 92, ty - 40, 184, 56, 12); g.fillStyle = 'rgba(10,10,14,0.85)'; g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
  txt(label, x, ty, 36, GOLD, 700, 'center', 'SpaceMono');
  g.restore();
}

function introReduccion(t) {
  const tm = CUE.enunciado;                   // la manguera se transforma en la reducción
  const k = eio(prog(t, tm - 0.15, 0.75));
  const zoom = lerp(1.18 - 0.1 * prog(t, 0, tm), 1, k);
  const cx = lerp(540 + 30 * Math.sin(t * 0.9), 540, k), cy = lerp(1040, PY, k);
  const sc = lerp(zoom, PS, k);
  const out = 1 - prog(t, CUE.cuenta - 0.1, 0.45);            // se aparta para la cuenta atrás
  const cy2 = cy - 260 * eio(1 - out);
  if (out > 0) {
    g.save(); g.translate(540, cy2); g.rotate(lerp(-0.06 + 0.03 * Math.sin(t * 0.7), 0, k)); g.translate(-540, -cy2);
    jet(t, cx, cy2, sc, 1 - prog(t, tm - 0.2, 0.4));
    pipe(t, k, cx, cy2, sc, out);
    g.restore();
    // manómetro: aparece al oír «presión»
    const ga = eo(prog(t, CUE.manometro, 0.35)) * out;
    const gx = lerp(460, 540 + (760 - 540) * PS, k), gy = lerp(790, PY - RN * PS - 100, k), gr = lerp(110, 56, k);
    gauge(t, gx, cy2 - (cy - gy), gr * (0.6 + 0.4 * back(prog(t, CUE.manometro, 0.4))), ga, lerp(1040 - 125, PY - RN * PS - 10, k) + (cy2 - cy));
    // cotas
    dimV(540 + (300 - 540) * PS, cy2, RW * PS, 'Ø 45 mm', prog(t, CUE.d1, 0.35) * out);
    dimV(540 + (760 - 540) * PS, cy2, RN * PS, 'Ø 25 mm', prog(t, CUE.d2, 0.35) * out);
  }
}

// ---------------------------------------------------------------- pulmones de brasa + monitor (intro «respiracion»)
const BP = 4.2;                               // un ciclo respiratorio (s): inspiración, espiración y pausa
function breath(t) {                          // 0 = vacío, 1 = lleno
  const u = (((t % BP) + BP) % BP) / BP;
  if (u < 0.4) return eio(u / 0.4);
  if (u < 0.85) return 1 - eio((u - 0.4) / 0.45);
  return 0;
}
function lungPath(side) {                     // side -1 = pulmón de la izquierda de la pantalla, +1 = derecha (con la escotadura del corazón)
  const s = side;
  g.beginPath();
  g.moveTo(150 * s, -250);
  g.bezierCurveTo(230 * s, -240, 285 * s, -130, 290 * s, 40);
  g.bezierCurveTo(295 * s, 160, 275 * s, 230, 240 * s, 250);
  g.bezierCurveTo(180 * s, 275, 90 * s, 270, 45 * s, 230);
  if (s > 0) {
    g.bezierCurveTo(35, 180, 105, 160, 100, 95);
    g.bezierCurveTo(95, 30, 45, -40, 70, -170);
  } else g.bezierCurveTo(35 * s, 120, 40 * s, -60, 70 * s, -170);
  g.bezierCurveTo(85 * s, -225, 110 * s, -255, 150 * s, -250);
  g.closePath();
}
function branch(x, y, ang, len, w, depth, seed, k) {   // árbol bronquial que se enciende (k: 0..1)
  if (depth === 0 || len < 8) return;
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
  const sp = 0.42 + 0.18 * hash(seed);
  branch(x2, y2, ang - sp, len * (0.68 + 0.08 * hash(seed + 1)), w * 0.68, depth - 1, seed * 2 + 1, k);
  branch(x2, y2, ang + sp, len * (0.68 + 0.08 * hash(seed + 2)), w * 0.68, depth - 1, seed * 2 + 2, k);
}
function lungs(t, cx, cy, sc, alpha) {
  if (alpha <= 0) return;
  const b = breath(t);
  g.save(); g.globalAlpha = alpha;
  g.translate(cx, cy); g.scale(sc * (0.93 + 0.09 * b), sc * (0.95 + 0.06 * b));
  // tráquea
  g.lineCap = 'round';
  g.strokeStyle = '#E8A04A'; g.lineWidth = 40;
  g.beginPath(); g.moveTo(0, -360); g.lineTo(0, -170); g.stroke();
  g.strokeStyle = 'rgba(90,30,8,0.55)'; g.lineWidth = 4;
  for (let i = 0; i < 6; i++) { const y = -350 + i * 30; g.beginPath(); g.moveTo(-18, y); g.lineTo(18, y); g.stroke(); }
  for (const s of [-1, 1]) {
    // halo de brasa
    g.save(); g.shadowColor = `rgba(255,110,30,${0.55 + 0.35 * b})`; g.shadowBlur = 70;
    lungPath(s);
    const lg = g.createRadialGradient(150 * s, 30, 20, 150 * s, 30, 340);
    lg.addColorStop(0, '#FFC25A'); lg.addColorStop(0.35, '#FF6A1F'); lg.addColorStop(0.75, '#B3260B'); lg.addColorStop(1, '#5A0E04');
    g.fillStyle = lg; g.fill();
    g.restore();
    // brasas que laten dentro
    g.save(); lungPath(s); g.clip();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const px = s * (60 + 220 * hash(i * 3 + (s > 0 ? 1 : 2))), py = -220 + 460 * hash(i * 5 + 7);
      const r = 30 + 60 * hash(i + 11), a = (0.10 + 0.12 * Math.sin(t * (2 + 3 * hash(i)) + i)) * (0.6 + 0.6 * b);
      const eg = g.createRadialGradient(px, py, 0, px, py, r);
      eg.addColorStop(0, `rgba(255,200,90,${Math.max(0, a).toFixed(3)})`); eg.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = eg; g.fillRect(px - r, py - r, 2 * r, 2 * r);
    }
    g.restore();
    // borde
    lungPath(s); g.strokeStyle = 'rgba(255,214,120,0.55)'; g.lineWidth = 3; g.stroke();
    // bronquios
    g.save(); lungPath(s); g.clip();
    g.strokeStyle = `rgba(255,236,190,${0.55 + 0.35 * b})`; g.shadowColor = 'rgba(255,200,120,0.9)'; g.shadowBlur = 10;
    g.beginPath(); g.moveTo(0, -170); g.lineTo(95 * s, -95); g.lineWidth = 22; g.stroke();
    branch(95 * s, -95, Math.PI / 2 - s * 0.55, 95, 15, 6, s > 0 ? 3 : 4, b);          // hacia abajo y afuera
    branch(95 * s, -95, s > 0 ? -0.15 : Math.PI + 0.15, 75, 12, 5, s > 0 ? 9 : 10, b);  // lóbulo de arriba
    branch(95 * s, -95, Math.PI / 2 + s * 0.12, 90, 12, 5, s > 0 ? 13 : 14, b);       // hacia la base
    g.restore();
  }
  // bronquios principales (fuera del recorte, para que se vean salir de la tráquea)
  g.strokeStyle = '#E8A04A'; g.lineWidth = 26;
  g.beginPath(); g.moveTo(0, -180); g.quadraticCurveTo(-40, -150, -95, -95); g.stroke();
  g.beginPath(); g.moveTo(0, -180); g.quadraticCurveTo(40, -150, 95, -95); g.stroke();
  g.restore();
}

function stamp(t, alpha) {                    // sello del examen oficial
  const t0 = CUE.sello;
  if (t0 === undefined || t < t0 || alpha <= 0) return;
  const p = prog(t, t0, 0.22);
  const s = lerp(1.9, 1, eio(p));
  g.save(); g.globalAlpha = alpha * clamp(p * 3);
  g.translate(540, 520); g.rotate(-0.07); g.scale(s, s);
  const ink = '#FF4A3D';
  rr(-380, -125, 760, 250, 26); g.fillStyle = 'rgba(40,6,4,0.55)'; g.fill();
  g.strokeStyle = ink; g.lineWidth = 9; g.stroke();
  rr(-362, -107, 724, 214, 18); g.lineWidth = 3; g.stroke();
  txt('EXAMEN OFICIAL', 0, -4, 92, ink, 400, 'center', 'Impact');
  const la = eo(prog(t, CUE.albacete ?? t0, 0.25)), ya = eo(prog(t, CUE.anio ?? t0, 0.25));
  g.globalAlpha = alpha * la;
  txt('AYUNTAMIENTO DE ALBACETE', 0, 62, 36, ink, 700, 'center', 'SpaceMono');
  g.globalAlpha = alpha * ya;
  g.save(); g.translate(352, -122); g.rotate(0.12); g.scale(lerp(1.6, 1, ya), lerp(1.6, 1, ya));
  g.beginPath(); g.arc(0, 0, 62, 0, 7); g.fillStyle = ink; g.fill();
  txt('2026', 0, 18, 50, '#1A0503', 400, 'center', 'Impact');
  g.restore();
  g.restore();
}

function monitor(t, x, y, w, h, alpha) {      // monitor de frecuencia respiratoria: onda y «? rpm»
  if (alpha <= 0) return;
  g.save(); g.globalAlpha = alpha;
  rr(x, y, w, h, 22); g.fillStyle = 'rgba(4,10,12,0.92)'; g.fill();
  g.strokeStyle = 'rgba(98,227,212,0.45)'; g.lineWidth = 3; g.stroke();
  // rejilla
  g.strokeStyle = 'rgba(98,227,212,0.08)'; g.lineWidth = 1;
  for (let gx = x + 30; gx < x + w; gx += 40) { g.beginPath(); g.moveTo(gx, y + 80); g.lineTo(gx, y + h - 20); g.stroke(); }
  for (let gy = y + 90; gy < y + h - 20; gy += 40) { g.beginPath(); g.moveTo(x + 20, gy); g.lineTo(x + w - 20, gy); g.stroke(); }
  const CY = '#62E3D4';
  txt('FR', x + 28, y + 56, 40, CY, 700, 'left', 'SpaceMono');
  txt('frecuencia respiratoria', x + 92, y + 54, 24, 'rgba(98,227,212,0.7)', 600, 'left');
  const blink = 0.55 + 0.45 * Math.sin(t * 6);
  g.globalAlpha = alpha * blink;
  txt('?', x + w - 120, y + 64, 70, CY, 400, 'right', 'Impact');
  g.globalAlpha = alpha;
  txt('rpm', x + w - 28, y + 58, 28, 'rgba(98,227,212,0.8)', 700, 'right', 'SpaceMono');
  // onda con barrido (como un monitor de verdad)
  const x0 = x + 24, x1 = x + w - 24, ytop = y + 110, ybot = y + h - 34, span = 7.5;
  const head = ((t % span) + span) % span;
  g.strokeStyle = CY; g.lineWidth = 4; g.lineJoin = 'round'; g.shadowColor = 'rgba(98,227,212,0.8)'; g.shadowBlur = 12;
  g.beginPath();
  let started = false, lastX = -1;
  for (let i = 0; i <= 220; i++) {
    const tt = t - span + 0.35 + (span - 0.35) * i / 220;       // hueco borrado delante del barrido
    const ph = ((tt % span) + span) % span;
    const px = lerp(x0, x1, ph / span);
    const py = lerp(ybot, ytop, breath(tt));
    if (!started || px < lastX) { g.moveTo(px, py); started = true; } else g.lineTo(px, py);
    lastX = px;
  }
  g.stroke(); g.shadowBlur = 0;
  // punto del barrido
  const hx = lerp(x0, x1, head / span), hy = lerp(ybot, ytop, breath(t));
  g.beginPath(); g.arc(hx, hy, 8, 0, 7); g.fillStyle = '#DFFFFA'; g.fill();
  g.restore();
}

function introRespiracion(t) {
  const tm = CUE.enunciado;
  const k = eio(prog(t, tm - 0.15, 0.8));                       // de pantalla completa a la zona de arriba
  const out = 1 - prog(t, CUE.cuenta - 0.1, 0.45);              // se aparta para la cuenta atrás
  if (out <= 0) return;
  const lift = -260 * eio(1 - out);
  // sacudida al caer el sello
  const sh = CUE.sello !== undefined ? Math.exp(-Math.pow((t - CUE.sello - 0.2) / 0.08, 2)) : 0;
  g.save(); g.translate(Math.sin(t * 90) * 10 * sh, Math.cos(t * 77) * 8 * sh);
  const drift = 1 + 0.04 * prog(t, 0, tm);                       // la cámara se acerca despacio
  const cx = lerp(540, 255, k), cy = lerp(1080, 650, k) + lift;
  lungs(t, cx, cy, lerp(1.12 * drift, 0.5, k), out);
  stamp(t, 1 - prog(t, tm - 0.1, 0.35));
  const ma = eo(prog(t, CUE.fr ?? tm, 0.4)) * out;
  monitor(t, lerp(1100, 480, eo(prog(t, CUE.fr ?? tm, 0.5))), 495 + lift, 540, 300, ma);
  g.restore();
}

// ---------------------------------------------------------------- tarjetas de la pregunta
const CX = 60, CW = W - 120;
const LET = ['A', 'B', 'C', 'D'];
const EY = 890;                               // arriba de la tarjeta del enunciado
function enunciadoLayout() {
  const lines = wrap(Q.enunciado, CW - 80, 50, 800);
  return { lines, h: 60 + lines.length * 60 };
}
function lineHL(l, x, y, px, col, hl) {      // una línea con las palabras de Q.resaltar en oro
  g.font = `800 ${px}px Inter`; g.textAlign = 'left';
  let xx = x;
  for (const w of l.split(' ')) {
    g.fillStyle = (Q.resaltar || []).some(r => norm(r) === norm(w)) ? hl : col;
    g.fillText(w, xx, y);
    xx += g.measureText(w + ' ').width;
  }
}
function cards(t) {
  const out = 1 - eio(prog(t, CUE.marca - 0.15, 0.55));
  if (out <= 0) return;
  const { lines: elines, h: eh } = enunciadoLayout();
  // enunciado
  const ea = eo(prog(t, CUE.enunciado, 0.45));
  if (ea > 0) {
    g.save(); g.globalAlpha = ea * out; g.translate(0, (1 - ea) * 40 + (1 - out) * 300);
    rr(CX, EY, CW, eh, 22); g.fillStyle = 'rgba(14,12,14,0.8)'; g.fill();
    g.strokeStyle = EMBER; g.lineWidth = 3; g.stroke();
    const glow = CUE.opciones !== undefined ? prog(t, CUE.opciones, 0.3) : 0;
    elines.forEach((l, i) => lineHL(l, CX + 40, EY + 78 + i * 60, 50, WHITE, glow > 0 ? GOLD : WHITE));
    g.restore();
  }
  // las 4 opciones, a la vez
  const oa = prog(t, CUE.opciones, 0.5);
  if (oa <= 0) return;
  for (let i = 0; i < 4; i++) {
    const y = EY + eh + 14 + i * 148;
    const p = back(oa);
    g.save(); g.globalAlpha = clamp(oa * 2) * out;
    g.translate(540, y + 66); g.scale(lerp(0.9, 1, p), lerp(0.9, 1, p)); g.translate(-540, -(y + 66));
    g.translate((1 - out) * (i % 2 ? 1 : -1) * 700, 0);
    // latido durante la cuenta atrás y al nombrar su letra
    const beat = t > CUE.cuenta && t < CUE.letras[0] ? 0.5 + 0.5 * Math.sin((t - CUE.cuenta) * Math.PI * 2) : 0;
    const say = Math.exp(-Math.pow((t - CUE.letras[i] - 0.15) / 0.18, 2));
    rr(CX, y, CW, 132, 20);
    g.fillStyle = `rgba(${18 + 30 * say},${16 + 18 * say},${18},0.8)`; g.fill();
    g.strokeStyle = say > 0.2 ? GOLD : `rgba(242,178,51,${0.35 + 0.25 * beat})`; g.lineWidth = 2 + 3 * say; g.stroke();
    // letra
    const lx = CX + 70, ly = y + 66, lr = 42 * (1 + 0.25 * say);
    g.beginPath(); g.arc(lx, ly, lr, 0, 7);
    const lg = g.createLinearGradient(lx, ly - lr, lx, ly + lr); lg.addColorStop(0, '#FFD65C'); lg.addColorStop(1, '#E88C1E');
    g.fillStyle = lg; g.fill();
    txt(LET[i], lx, ly + 18 * (1 + 0.25 * say), 52 * (1 + 0.25 * say), '#160F05', 400, 'center', 'Impact');
    const lines = wrap(Q.opciones[i], CW - 170, 40, 600);
    const y0 = ly - (lines.length - 1) * 24 + 14;
    lines.forEach((l, j) => txt(l, CX + 140, y0 + j * 48, 40, WHITE, 600));
    g.restore();
  }
}

// ---------------------------------------------------------------- cuenta atrás y «respuesta en la descripción»
function countdown(t) {
  const t0 = CUE.cuenta, t1 = CUE.letras[0] - 0.1;
  const a = prog(t, t0, 0.3) * (1 - prog(t, t1, 0.35));
  if (a <= 0) return;
  const x = 540, y = 680, r = 150;
  const u = clamp((t - t0) / (t1 - t0));
  const n = Math.max(0, 5 - Math.floor(u * 5));
  const sub = (u * 5) % 1;
  g.save(); g.globalAlpha = a;
  g.beginPath(); g.arc(x, y, r + 18, 0, 7); g.fillStyle = 'rgba(10,10,14,0.85)'; g.fill();
  g.lineWidth = 16; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  g.strokeStyle = n <= 2 ? RED : GOLD; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - u)); g.stroke();
  const pop = 1 + 0.25 * Math.exp(-sub * 8);
  txt(String(n), x, y + 70 * pop, 200 * pop, n <= 2 ? RED : WHITE, 400, 'center', 'Impact');
  g.restore();
}

function toDescription(t) {
  const a = eo(prog(t, CUE.descripcion, 0.4)) * (1 - prog(t, CUE.marca - 0.2, 0.35));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const y = 690, s = lerp(0.85, 1, back(prog(t, CUE.descripcion, 0.5)));
  g.translate(540, y); g.scale(s, s);
  rr(-420, -130, 840, 180, 28); g.fillStyle = 'rgba(14,12,14,0.9)'; g.fill(); g.strokeStyle = GOLD; g.lineWidth = 4; g.stroke();
  txt('LA RESPUESTA,', 0, -50, 64, WHITE, 400, 'center', 'Impact');
  txt('EN LA DESCRIPCIÓN', 0, 26, 64, GOLD, 400, 'center', 'Impact');
  const b = 14 * Math.abs(Math.sin((t - CUE.descripcion) * 4));
  g.fillStyle = GOLD;
  g.beginPath(); g.moveTo(-34, 80 + b); g.lineTo(34, 80 + b); g.lineTo(0, 124 + b); g.closePath(); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- letras A B C D al decirlas (zona de arriba)
function letters(t) {
  const t0 = CUE.letras[0] - 0.1, t1 = CUE.descripcion - 0.1;
  const a = prog(t, t0, 0.25) * (1 - prog(t, t1, 0.3));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  for (let i = 0; i < 4; i++) {
    const p = back(prog(t, CUE.letras[i], 0.35));
    if (p <= 0) continue;
    const x = 540 + (i - 1.5) * 220, y = 680;
    g.save(); g.translate(x, y); g.scale(p, p);
    g.beginPath(); g.arc(0, 0, 92, 0, 7);
    const lg = g.createLinearGradient(0, -92, 0, 92); lg.addColorStop(0, '#FFD65C'); lg.addColorStop(1, '#E88C1E');
    g.fillStyle = lg; g.fill();
    txt(LET[i], 0, 40, 120, '#160F05', 400, 'center', 'Impact');
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- cierre: placa BOMBERADOS + prueba gratis
function closing(t) {
  const a = prog(t, CUE.marca - 0.1, 0.35);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  // halo de brasa
  const hg = g.createRadialGradient(540, 900, 50, 540, 900, 620);
  hg.addColorStop(0, 'rgba(255,122,47,0.45)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = hg; g.fillRect(0, 300, W, 1200);
  const s = lerp(0.6, 1, back(prog(t, CUE.marca - 0.1, 0.55)));
  g.save(); g.translate(540, 880); g.scale(s, s);
  g.font = '400 150px Impact'; const tw = g.measureText('BOMBERADOS').width;
  const pw = tw + 110, ph = 210;
  rr(-pw / 2, -ph / 2, pw, ph, 32);
  const pg = g.createLinearGradient(0, -ph / 2, 0, ph / 2); pg.addColorStop(0, '#FFD65C'); pg.addColorStop(1, '#E88C1E');
  g.fillStyle = pg; g.shadowColor = 'rgba(255,122,47,0.9)'; g.shadowBlur = 60; g.fill(); g.shadowBlur = 0;
  rr(-pw / 2 + 8, -ph / 2 + 8, pw - 16, 22, 11); g.fillStyle = 'rgba(255,240,190,0.35)'; g.fill();
  txt('BOMBERADOS', 0, 54, 150, '#160F05', 400, 'center', 'Impact');
  g.restore();
  const la = eo(prog(t, CUE.marca + 0.6, 0.4));
  g.globalAlpha = a * la;
  txt('Falla en casa, no en el examen.', 540, 1080 + 20 * (1 - la), 52, WHITE, 800, 'center');
  // botón de la prueba gratis
  const pa = prog(t, CUE.prueba, 0.45);
  if (pa > 0) {
    const ps = back(pa);
    g.globalAlpha = a * clamp(pa * 2);
    g.save(); g.translate(540, 1270); g.scale(ps, ps);
    rr(-400, -78, 800, 156, 78); g.fillStyle = EMBER; g.shadowColor = 'rgba(255,122,47,0.8)'; g.shadowBlur = 40; g.fill(); g.shadowBlur = 0;
    txt('PRUÉBALA GRATIS 5 DÍAS', 0, 26, 74, '#FFFFFF', 400, 'center', 'Impact');
    g.restore();
    g.globalAlpha = a * prog(t, CUE.prueba + 0.5, 0.4);
    txt('enlace en la bio', 540, 1420, 40, DIM, 600, 'center');
  }
  g.restore();
}

// ---------------------------------------------------------------- fotograma
window.renderAt = t => {
  g.setTransform(PR, 0, 0, PR, 0, 0);
  background(t);
  sparks(t);
  if (Q.intro === 'reduccion') introReduccion(t);
  if (Q.intro === 'respiracion') introRespiracion(t);
  countdown(t);
  letters(t);
  toDescription(t);
  cards(t);
  closing(t);
  hud(t);
  // fundido de entrada/salida muy corto
  const f = Math.max(1 - prog(t, 0, 0.12), prog(t, END - 0.25, 0.25));
  if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
};

(async () => {
  try {
    const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }),
      new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
      new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
      new FontFace('Impact', `url(${F}impact.ttf)`)];
    for (const f of faces) { await f.load(); document.fonts.add(f); }
    Q = await (await fetch('../pregunta.json')).json();
    const lines = await (await fetch('../tiempos.json')).json();
    for (const [k, v] of Object.entries(Q.cues)) CUE[k] = Array.isArray(v[0]) ? v.map(s => cueTime(s, lines)) : cueTime(v, lines);
    END = lines[lines.length - 1].end + 1.2;
    window.END = END;
    window.ready = true;
  } catch (e) { window.failed = String(e); console.log('ERROR', e); }
})();
