// Formato «Explicado en 30 s» — ¿TRIÁNGULO O TETRAEDRO DEL FUEGO? (Bomberados). Se carga DESPUÉS de scene.js
// (web/index.html) y sustituye su renderAt. Usa de scene.js: g, W, H, PR, CUE, Q, END, clamp, prog, eo, eio, back, lerp,
// hash, rr, txt, rgba, mixc, rgbs, glowAt, background, sparks, share, closing, punch, ORANGE, GOLD, WHITE, RED, DIM.
//
// Pizarra de clase de noche:
//  · gancho: un triángulo de tiza ARDE como una mecha (primer fotograma); en «fuego» prende la llama del centro; en
//    «triángulo» la mecha cierra el triángulo; en «falta» el triángulo se despega de la pizarra y gira en 3D, y en «pieza»
//    salta delante una cuarta esquina vacía con «?» (líneas de tiza discontinuas);
//  · «combustible», «oxígeno», «calor»: una insignia con icono en cada esquina; «quita»: la del calor sale despedida, sus
//    lados se rompen y la llama se apaga con humo; vuelve y la llama prende otra vez;
//  · «polvo»/«extintor»: entra la boquilla de un extintor; la nube de polvo apaga la llama con las tres esquinas en su
//    sitio; en «otra» el «?» se pone rojo;
//  · «cuarta»: zoom al «?» → anillo de eslabones de fuego que se encienden unos a otros alrededor de la llama («alimente»),
//    rótulo REACCIÓN EN CADENA («reacción»); «corta»: el chorro de polvo parte un eslabón y todo se apaga;
//  · «triángulo» (2.º): vuelve el triángulo y sus lados parpadean en rojo; «tetraedro»: el «?» se vuelve la insignia de la
//    cadena y se arma el tetraedro 3D (caras de cristal, llama dentro) que gira; encuesta TRIÁNGULO / TETRAEDRO que se
//    vuelve bocadillos en «comenta»;
//  · venta: avión de papel (share) con golpe; en «Bomberados» el tetraedro estalla en brasas y sale la placa.
// La línea de tiempo (TT) la repite compose.py (sfx_track_tetra) para que cada sonido empiece y acabe con su imagen.

let TT = null, BOARD = null;
const C_COMB = '#E8913A', C_OXI = '#46C2F0', C_CAL = '#FF4D3D', C_REAC = '#F2B233';
const OX = 540, OY = 960;                                   // centro del triángulo en pantalla
const R3 = 330, H3 = R3 * Math.SQRT2, F3 = 1700;            // radio del triángulo, altura del tetraedro, focal
const VB = [[-R3 * Math.cos(Math.PI / 6), -R3 / 2, 0], [R3 * Math.cos(Math.PI / 6), -R3 / 2, 0], [0, R3, 0]];   // esquinas
const APEX = [0, 0, H3];                                    // la cuarta esquina (sale de la pizarra hacia la cámara)
const EL = [
  { name: 'COMBUSTIBLE', sub: '', col: C_COMB, icon: 'log', side: 'bottom' },
  { name: 'OXÍGENO', sub: 'COMBURENTE', col: C_OXI, icon: 'o2', side: 'bottom' },
  { name: 'CALOR', sub: 'ENERGÍA DE ACTIVACIÓN', col: C_CAL, icon: 'heat', side: 'top' },
  { name: 'REACCIÓN EN CADENA', sub: '', col: C_REAC, icon: 'chain', side: 'left' }];
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// ---------------------------------------------------------------- línea de tiempo
function ttInit() {
  const L = window.LINES_, c = k => CUE[k];
  TT = {
    f1: c('triangulo') + 0.22,                     // la mecha cierra el triángulo
    ign: c('fuego') - 0.05,                        // prende la llama del centro
    lift: c('falta') - 0.05,                       // el triángulo se despega de la pizarra y gira
    q: c('pieza'),                                 // salta la cuarta esquina «?»
    cual: c('cual'),
    b: [c('combustible'), c('oxigeno'), c('calor')],
    quita: c('quita') + 0.05,                      // sale despedida la esquina del calor
    out1: c('apaga') + 0.3,                        // llama apagada
    noz: c('polvo') - 0.12,                        // entra la boquilla del extintor
    spray0: c('extintor') + 0.06, spray1: c('otra') + 0.2,
    die2: c('apaga2') - 0.05, out2: c('llamas') + 0.35,
    red: c('otra'),                                // el «?» se pone rojo
    zoom: c('cuarta') - 0.15,                      // zoom al «?» → anillo de la cadena
    feed: c('alimente') - 0.1,                     // los eslabones se encienden unos a otros
    lab: c('reaccion'),                            // rótulo REACCIÓN EN CADENA
    jet: c('polvo2') - 0.05,                       // chorro de polvo contra el anillo
    cut: c('corta') + 0.04,                        // se parte un eslabón
    back: c('triangulo2') - 0.35,                  // vuelve el triángulo
    no: c('triangulo2'),                           // «no es un triángulo»: lados en rojo
    tet: c('tetraedro') - 0.08,                    // se arma el tetraedro
    poll: c('encuesta') - 0.1, triO: c('op_tri'), tetO: c('op_tet'), com: c('comenta'),
    share: c('compartir'), marca: c('marca')
  };
  TT.ret = Math.min(c('polvo') - 0.5, L[2].end + 0.1);      // vuelve el calor
  TT.relit = TT.ret + 0.2;
  TT.cutEnd = Math.min(TT.cut + 0.9, TT.back);
  CUE.descripcion = TT.marca - 0.2;                          // para share(): el avión acaba antes de la marca
  window.TT_ = TT;
}

// ---------------------------------------------------------------- pizarra (se pinta una vez)
function makeBoard() {
  const cv2 = document.createElement('canvas'); cv2.width = W * PR; cv2.height = H * PR;
  const b = cv2.getContext('2d'); b.scale(PR, PR);
  const bg = b.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1B2723'); bg.addColorStop(0.55, '#16211D'); bg.addColorStop(1, '#0F1714');
  b.fillStyle = bg; b.fillRect(0, 0, W, H);
  for (let i = 0; i < 11; i++) {                             // borrones del borrador
    const x = hash(i + 1) * W, y = 200 + hash(i + 2) * 1450, rx = 240 + 280 * hash(i + 3), ry = 70 + 110 * hash(i + 4);
    b.save(); b.translate(x, y); b.rotate((hash(i + 5) - 0.5) * 0.6); b.scale(1, ry / rx);
    const gr = b.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(215,228,220,${(0.035 + 0.03 * hash(i + 6)).toFixed(3)})`); gr.addColorStop(1, 'rgba(215,228,220,0)');
    b.fillStyle = gr; b.fillRect(-rx, -rx, 2 * rx, 2 * rx); b.restore();
  }
  b.lineCap = 'round';
  for (let i = 0; i < 26; i++) {                             // barridos del borrador (arcos tenues)
    const x = hash(i + 40) * W, y = 150 + hash(i + 41) * 1600, r = 120 + 260 * hash(i + 42), a0 = hash(i + 43) * 6.3;
    b.strokeStyle = `rgba(220,230,224,${(0.012 + 0.02 * hash(i + 44)).toFixed(3)})`; b.lineWidth = 30 + 50 * hash(i + 45);
    b.beginPath(); b.arc(x, y, r, a0, a0 + 0.6 + hash(i + 46)); b.stroke();
  }
  for (let i = 0; i < 3200; i++) {                           // polvo de tiza
    const x = hash(i * 1.37 + 11) * W, y = hash(i * 2.11 + 7) * H, a = 0.025 + 0.09 * Math.pow(hash(i + 99), 2);
    b.fillStyle = `rgba(232,236,230,${a.toFixed(3)})`; b.fillRect(x, y, 1 + hash(i + 5) * 1.8, 1 + hash(i + 6) * 1.8);
  }
  b.save(); b.fillStyle = 'rgba(232,236,230,0.075)'; b.font = '700 40px SpaceMono';   // apuntes medio borrados
  b.translate(610, 1560); b.rotate(-0.04); b.fillText('combustible + O2 → CO2 + H2O + calor', -560, 0); b.restore();
  b.save(); b.fillStyle = 'rgba(232,236,230,0.06)'; b.font = '700 52px SpaceMono';
  b.translate(820, 230); b.rotate(0.05); b.fillText('T ↑', 0, 0); b.restore();
  // repisa de madera con una tiza y el borrador
  const ly = 1800, lg = b.createLinearGradient(0, ly, 0, H);
  lg.addColorStop(0, '#5B3B22'); lg.addColorStop(0.18, '#7A5232'); lg.addColorStop(1, '#2B1A0E');
  b.fillStyle = lg; b.fillRect(0, ly, W, H - ly);
  b.fillStyle = 'rgba(0,0,0,0.45)'; b.fillRect(0, ly - 6, W, 6);
  b.fillStyle = 'rgba(255,230,190,0.18)'; b.fillRect(0, ly + 4, W, 3);
  b.save(); b.translate(300, ly + 14); b.rotate(-0.05); b.fillStyle = '#ECEAE2'; b.beginPath(); b.roundRect(-70, -12, 140, 24, 10); b.fill(); b.restore();
  b.save(); b.translate(760, ly + 6); b.fillStyle = '#3A3A44'; b.beginPath(); b.roundRect(-110, -26, 220, 40, 8); b.fill();
  b.fillStyle = '#C9C2B4'; b.beginPath(); b.roundRect(-110, 6, 220, 16, 6); b.fill(); b.restore();
  BOARD = cv2;
}

// ---------------------------------------------------------------- 3D: giro del objeto y proyección
function rot(p, yaw, pitch) {
  let x = p[0], y = p[1], z = p[2];
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];
  return [x, y, z];
}
function proj(p, V) {
  const r = rot(p, V.yaw, V.pitch);
  const s = F3 / (F3 - r[2]) * V.sc;
  return { x: V.ox + r[0] * s, y: V.oy - r[1] * s, s, z: r[2] };
}
function spin(t, t0, w, tau = 0.35) {                       // giro con arranque suave (integral de una rampa)
  const u = t - t0;
  return u <= 0 ? 0 : w * (u - tau * (1 - Math.exp(-u / tau)));
}
function view(t) {
  const l = eio(prog(t, TT.lift, 0.85));
  let yaw = -0.5 * l + 0.07 * Math.sin((t - TT.lift) * 0.9) * l, pitch = -0.25 * l;
  yaw -= spin(t, TT.tet + 0.25, 0.95);                      // el tetraedro gira
  pitch -= 0.08 * eio(prog(t, TT.tet + 0.2, 0.6));
  const pk = eio(prog(t, TT.poll, 0.45));                   // encuesta: sube y se hace pequeño
  return { yaw, pitch, ox: OX, oy: lerp(OY, 830, pk), sc: lerp(1, 0.74, pk) };
}

// ---------------------------------------------------------------- tiza, brasa y luz
function chalkLine(x1, y1, x2, y2, w, a, seed) {
  if (a <= 0.01) return;
  g.save(); g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const ox = (hash(seed + k) - 0.5) * 2.6, oy = (hash(seed + k + 9) - 0.5) * 2.6;
    g.setLineDash([4 + 10 * hash(seed + k + 1), 1 + 3 * hash(seed + k + 2), 7 + 12 * hash(seed + k + 3), 1.5 + 2.5 * hash(seed + k + 4)]);
    g.lineDashOffset = 40 * hash(seed + k + 5);
    g.strokeStyle = `rgba(237,235,227,${(a * [0.8, 0.45, 0.35][k]).toFixed(3)})`;
    g.lineWidth = w * [1, 0.62, 0.45][k];
    g.beginPath(); g.moveTo(x1 + ox, y1 + oy); g.lineTo(x2 + ox, y2 + oy); g.stroke();
  }
  g.setLineDash([]); g.restore();
}
function heatRGB(h) {                                       // 0 metal oscuro → 0,5 rojo vivo → 1 blanco amarillo
  return h < 0.5 ? mixc([62, 56, 52], [215, 70, 20], h / 0.5) : mixc([215, 70, 20], [255, 228, 150], (h - 0.5) / 0.5);
}
function glowLine(a, b, col0, col1, w, alpha) {             // arista de fuego: halo + núcleo claro
  if (alpha <= 0.01) return;
  g.save(); g.lineCap = 'round';
  const gr = (al) => { const q = g.createLinearGradient(a.x, a.y, b.x, b.y); q.addColorStop(0, rgbs(col0, al)); q.addColorStop(1, rgbs(col1, al)); return q; };
  g.globalCompositeOperation = 'lighter';
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
  g.strokeStyle = gr(0.16 * alpha); g.lineWidth = w * 5; g.stroke();
  g.strokeStyle = gr(0.42 * alpha); g.lineWidth = w * 2.1; g.stroke();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = gr(0.95 * alpha); g.lineWidth = w; g.stroke();
  g.strokeStyle = `rgba(255,248,232,${(0.85 * alpha).toFixed(3)})`; g.lineWidth = w * 0.4; g.stroke();
  g.restore();
}
function dashLine(a, b, alpha, col = [237, 235, 227]) {
  if (alpha <= 0.01) return;
  g.save(); g.setLineDash([18, 14]); g.lineDashOffset = 0; g.lineCap = 'round';
  g.strokeStyle = rgbs(col, 0.7 * alpha); g.lineWidth = 5;
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  g.setLineDash([]); g.restore();
}

// ---------------------------------------------------------------- llama, humo, chispas
function flame(x, y, s, k, t, seed = 0) {                   // y = base de la llama; k = 0..1 (tamaño e intensidad)
  if (k <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  glowAt(x, y - 90 * s * k, 330 * s * (0.55 + 0.45 * k), [255, 110, 35], 0.42 * k);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const ph = seed * 3.1 + i * 1.7, off = (i - (n - 1) / 2) / ((n - 1) / 2);
    const h = s * k * (215 + 70 * Math.sin(t * 7.3 + ph) + 35 * Math.sin(t * 13.1 + ph * 2)) * (1 - 0.42 * Math.abs(off));
    const w = s * (46 + 12 * Math.sin(t * 5 + ph)) * (1 - 0.32 * Math.abs(off)) * (0.6 + 0.4 * k);
    const bx = x + off * 44 * s, sway = s * k * (24 * Math.sin(t * 4.1 + ph) + 11 * Math.sin(t * 9.7 + ph * 1.3));
    g.beginPath();
    g.moveTo(bx - w, y);
    g.bezierCurveTo(bx - w * 1.08, y - h * 0.42, bx + sway * 0.4 - w * 0.4, y - h * 0.72, bx + sway, y - h);
    g.bezierCurveTo(bx + sway * 0.4 + w * 0.4, y - h * 0.72, bx + w * 1.08, y - h * 0.42, bx + w, y);
    g.quadraticCurveTo(bx, y + w * 0.55, bx - w, y);
    const gr = g.createLinearGradient(0, y + w * 0.4, 0, y - h);
    gr.addColorStop(0, `rgba(255,236,190,${(0.5 * k).toFixed(3)})`);
    gr.addColorStop(0.25, `rgba(255,186,80,${(0.42 * k).toFixed(3)})`);
    gr.addColorStop(0.62, `rgba(255,105,30,${(0.26 * k).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(190,40,10,0)');
    g.fillStyle = gr; g.fill();
  }
  // núcleo
  const hc = s * k * (120 + 25 * Math.sin(t * 9 + seed)), wc = s * 30 * (0.6 + 0.4 * k);
  g.beginPath(); g.moveTo(x - wc, y);
  g.bezierCurveTo(x - wc, y - hc * 0.5, x - wc * 0.3, y - hc * 0.8, x + s * 6 * Math.sin(t * 6 + seed), y - hc);
  g.bezierCurveTo(x + wc * 0.3, y - hc * 0.8, x + wc, y - hc * 0.5, x + wc, y);
  g.quadraticCurveTo(x, y + wc * 0.5, x - wc, y);
  const gc = g.createLinearGradient(0, y, 0, y - hc);
  gc.addColorStop(0, `rgba(255,255,240,${(0.7 * k).toFixed(3)})`); gc.addColorStop(1, 'rgba(255,200,90,0)');
  g.fillStyle = gc; g.fill();
  // pavesas que suben
  for (let i = 0; i < 14; i++) {
    const P = 0.9 + 0.8 * hash(i + seed * 7 + 1), age = (t + hash(i + seed * 7 + 2) * P) % P, u = age / P;
    const px = x + (hash(i + seed * 7 + 3) - 0.5) * 70 * s + Math.sin(age * 5 + i) * 18 * s;
    const py = y - 60 * s - u * 300 * s * (0.6 + 0.4 * k);
    const a = k * Math.sin(Math.PI * u) * 0.8;
    g.fillStyle = `rgba(255,${Math.round(150 + 80 * (1 - u))},${Math.round(60 * (1 - u))},${a.toFixed(3)})`;
    g.beginPath(); g.arc(px, py, (1.6 + 1.8 * hash(i + 4)) * s, 0, 7); g.fill();
  }
  g.restore();
}
function smoke(x, y, t0, t, sc = 1, n = 16, life = 1.3) {   // humo de una llama que se apaga (dura 0,6 + life s)
  const u = t - t0; if (u < 0 || u > 0.6 + life) return;
  g.save();
  for (let i = 0; i < n; i++) {
    const age = u - i * 0.6 / n;
    if (age <= 0 || age > life) continue;
    const k = age / life;
    const px = x + (hash(i + 3) - 0.5) * 40 * sc + Math.sin(age * 2.4 + i) * 34 * k * sc;
    const py = y - (150 * age + 70 * age * age) * sc;
    const r = (18 + 85 * k) * sc;
    const a = 0.22 * Math.min(1, k * 6) * (1 - k);
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(176,178,172,${a.toFixed(3)})`); gr.addColorStop(1, 'rgba(176,178,172,0)');
    g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r);
  }
  g.restore();
}
function burst(x, y, t0, t, n = 22, sp = 420, life = 0.7, seed = 0) {   // chispas que saltan (rotura, mecha)
  const u = t - t0; if (u < 0 || u > life) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = hash(i + seed) * 6.283, v = sp * (0.4 + 0.6 * hash(i + seed + 1)), k = u / (life * (0.6 + 0.4 * hash(i + seed + 2)));
    if (k >= 1) continue;
    const px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + 600 * u * u;
    const qx = px - Math.cos(a) * v * 0.025, qy = py - (Math.sin(a) * v + 1200 * u) * 0.025;
    g.strokeStyle = `rgba(255,${Math.round(200 - 90 * k)},${Math.round(90 - 70 * k)},${(1 - k).toFixed(3)})`; g.lineWidth = 3;
    g.beginPath(); g.moveTo(qx, qy); g.lineTo(px, py); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- insignias (las piezas del fuego)
function icon(kind, s, col, t) {                             // dibujado en el origen; s ≈ radio útil
  g.save();
  if (kind === 'log') {
    g.rotate(-0.28);
    const Lg = s * 1.65, Rg = s * 0.44;
    const wg = g.createLinearGradient(0, -Rg, 0, Rg); wg.addColorStop(0, '#C07C3E'); wg.addColorStop(0.5, '#8C5328'); wg.addColorStop(1, '#5A3216');
    g.fillStyle = wg; rr(-Lg / 2, -Rg, Lg, 2 * Rg, Rg * 0.35); g.fill();
    g.strokeStyle = 'rgba(40,20,8,0.55)'; g.lineWidth = s * 0.05;
    for (let k = 0; k < 3; k++) { const yy = -Rg * 0.5 + k * Rg * 0.5; g.beginPath(); g.moveTo(-Lg / 2 + s * 0.12, yy); g.lineTo(Lg / 2 - s * 0.35, yy + s * 0.04 * (k - 1)); g.stroke(); }
    g.beginPath(); g.ellipse(Lg / 2, 0, Rg * 0.42, Rg, 0, 0, 7); g.fillStyle = '#E6B47C'; g.fill();
    g.strokeStyle = '#9A6533'; g.lineWidth = s * 0.04;
    for (const f of [0.75, 0.48, 0.22]) { g.beginPath(); g.ellipse(Lg / 2, 0, Rg * 0.42 * f, Rg * f, 0, 0, 7); g.stroke(); }
  } else if (kind === 'o2') {
    g.font = `400 ${(s * 1.5).toFixed(1)}px Bebas`; g.textAlign = 'center'; g.fillStyle = col;
    g.fillText('O', -s * 0.16, s * 0.52);
    g.font = `400 ${(s * 0.72).toFixed(1)}px Bebas`; g.fillText('2', s * 0.5, s * 0.72);
  } else if (kind === 'heat') {
    g.lineWidth = s * 0.13; g.strokeStyle = '#F2EFE6';
    rr(-s * 0.17, -s * 0.9, s * 0.34, s * 1.28, s * 0.17); g.stroke();
    g.beginPath(); g.arc(0, s * 0.55, s * 0.32, 0, 7); g.fillStyle = col; g.fill(); g.stroke();
    g.fillStyle = col; rr(-s * 0.075, -s * 0.55 - 0.08 * s * Math.sin(t * 3), s * 0.15, s * 1.1, s * 0.07); g.fill();
    g.strokeStyle = col; g.lineWidth = s * 0.08; g.lineCap = 'round';
    for (const dx of [-0.62, 0.62]) {
      g.beginPath();
      for (let k = 0; k <= 10; k++) { const yy = s * (0.3 - k * 0.09), xx = s * dx + s * 0.08 * Math.sin(k * 1.2 + t * 6); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
    }
  } else if (kind === 'chain') {
    g.lineWidth = s * 0.17; g.strokeStyle = col;
    for (const [dx, a] of [[-0.3, 0.75], [0.3, 0.75]]) {
      g.save(); g.translate(dx * s, 0); g.rotate(a); rr(-s * 0.55, -s * 0.26, s * 1.1, s * 0.52, s * 0.26); g.stroke(); g.restore();
    }
  } else if (kind === 'q') {
    g.font = `400 ${(s * 1.75).toFixed(1)}px Bebas`; g.textAlign = 'center'; g.fillStyle = col; g.fillText('?', 0, s * 0.62);
  }
  g.restore();
}
function badge(p, el, a, lab, t, opt = {}) {                // p: punto proyectado {x, y, s}
  if (a <= 0.01) return;
  const s = (opt.scale ?? 1) * p.s, r = 62 * s, col = opt.col || el.col;
  g.save(); g.globalAlpha = a;
  glowAt(p.x, p.y, r * 2.4, hexRGB(col), 0.38);
  g.beginPath(); g.arc(p.x, p.y, r, 0, 7);
  if (opt.ghost) {
    g.fillStyle = 'rgba(20,28,25,0.55)'; g.fill();
    g.setLineDash([12, 10]); g.lineWidth = 5 * s; g.strokeStyle = col; g.stroke(); g.setLineDash([]);
  } else {
    const fg = g.createRadialGradient(p.x - r * 0.3, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
    fg.addColorStop(0, '#2A2E33'); fg.addColorStop(1, '#0D0F12');
    g.fillStyle = fg; g.fill(); g.lineWidth = 6 * s; g.strokeStyle = col; g.stroke();
  }
  g.save(); g.translate(p.x, p.y); icon(opt.icon || el.icon, r * 0.62, col, t); g.restore();
  if (lab > 0.01) {
    g.globalAlpha = a * lab;
    const side = opt.side || el.side, px = Math.max(12, Math.min(26, 18 * s));
    const nm = opt.name ?? el.name, sub = opt.sub ?? el.sub;
    g.font = `400 ${(56 * Math.min(1.15, s)).toFixed(1)}px Bebas`; g.textAlign = 'center'; g.lineJoin = 'round';
    let ly = side === 'top' ? p.y - r - (sub ? 52 : 22) : p.y + r + 56 * Math.min(1.15, s);
    let lx = p.x;
    if (side === 'left') { g.textAlign = 'right'; lx = p.x - r - 22; ly = p.y + 18; }
    const tw = g.measureText(nm).width;
    if (g.textAlign === 'center') lx = clamp(lx, 34 + tw / 2, W - 34 - tw / 2);
    else if (lx - tw < 34) { g.textAlign = 'center'; lx = clamp(p.x, 34 + tw / 2, W - 34 - tw / 2); ly = p.y - r - 24; }
    g.strokeStyle = 'rgba(8,10,10,0.85)'; g.lineWidth = 9; g.strokeText(nm, lx, ly);
    g.fillStyle = '#F4F1EA'; g.fillText(nm, lx, ly);
    if (sub) {
      g.font = `700 ${px.toFixed(1)}px SpaceMono`;
      g.strokeText(sub, lx, ly + px + 10); g.fillStyle = col; g.fillText(sub, lx, ly + px + 10);
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- extintor y polvo
function extinguisher(t, tip, tIn, tOut) {
  const a = eo(prog(t, tIn, 0.35)) * (1 - eio(prog(t, tOut, 0.4)));
  if (a <= 0.001) return;
  const x = tip[0] + (1 - a) * 560, y = tip[1];
  g.save(); g.lineCap = 'round';
  // cuerpo rojo (asoma por la derecha, abajo)
  const bx = x + 215, by = y + 500;
  g.save(); g.translate(bx, by); g.rotate(-0.08);
  const rg = g.createLinearGradient(-95, 0, 95, 0);
  rg.addColorStop(0, '#7E0F0B'); rg.addColorStop(0.35, '#E0261B'); rg.addColorStop(0.55, '#FF5A44'); rg.addColorStop(1, '#8E140E');
  g.fillStyle = rg; rr(-95, -40, 190, 700, 70); g.fill();
  g.fillStyle = 'rgba(245,240,230,0.9)'; g.fillRect(-95, 120, 190, 150);
  g.fillStyle = 'rgba(30,30,30,0.5)'; for (let k = 0; k < 4; k++) g.fillRect(-60, 150 + k * 28, 120 - k * 18, 9);
  g.fillStyle = '#2B2B2E'; rr(-34, -92, 68, 60, 10); g.fill();               // válvula
  g.fillStyle = '#4A4A50'; rr(-80, -120, 150, 26, 12); g.fill();             // maneta
  g.restore();
  // manguera
  g.strokeStyle = '#121214'; g.lineWidth = 28;
  g.beginPath(); g.moveTo(x + 150, y); g.bezierCurveTo(x + 300, y + 4, x + 300, y + 220, bx - 20, by - 80); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(x + 150, y - 9); g.bezierCurveTo(x + 296, y - 5, x + 292, y + 214, bx - 28, by - 86); g.stroke();
  // boquilla (cono)
  const ng = g.createLinearGradient(0, y - 34, 0, y + 34); ng.addColorStop(0, '#5A5A60'); ng.addColorStop(0.45, '#26262A'); ng.addColorStop(1, '#0E0E10');
  g.fillStyle = ng; g.beginPath(); g.moveTo(x, y - 36); g.lineTo(x + 165, y - 15); g.lineTo(x + 165, y + 15); g.lineTo(x, y + 36); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(x, y, 9, 36, 0, 0, 7); g.fillStyle = '#3A3A40'; g.fill();
  g.restore();
}
function powder(t, tip, aim, t0, t1, rate = 170, reach = 1) {   // chorro + nube de polvo (estable fotograma a fotograma)
  if (t < t0) return 0;
  const dx = aim[0] - tip[0], dy = aim[1] - tip[1], D = Math.hypot(dx, dy), ux = dx / D, uy = dy / D;
  const n = Math.floor((t1 - t0) * rate);
  let dens = 0;
  g.save();
  for (let i = 0; i < n; i++) {
    const tb = t0 + i / rate, age = t - tb;
    if (age <= 0) break;
    const life = 1.0 + 0.9 * hash(i + 5);
    if (age > life) continue;
    const k = age / life, sp = (0.36 * (hash(i + 7) - 0.5)) * (0.5 + k) + 0.05 * Math.sin(i);
    const v0 = (D * 3.6 + 420 * hash(i + 3)) * reach, d = v0 * (1 - Math.exp(-3.2 * age)) / 3.2;
    const cx = Math.cos(sp), sx = Math.sin(sp), vx = ux * cx - uy * sx, vy = ux * sx + uy * cx;
    const px = tip[0] + vx * d + Math.sin(age * 3 + i) * 26 * k, py = tip[1] + vy * d - 40 * k + 50 * age * age + (hash(i + 11) - 0.5) * 120 * k;
    const r = 10 + 70 * Math.pow(k, 0.6) * (0.6 + 0.6 * hash(i + 13));
    const a = 0.2 * Math.min(1, age * 10) * (1 - k);
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(246,238,212,${a.toFixed(3)})`); gr.addColorStop(1, 'rgba(246,238,212,0)');
    g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r);
    if (Math.hypot(px - aim[0], py - aim[1]) < 120) dens += a;
  }
  // nube que envuelve el objetivo y se deshace despacio
  const ca = eo(prog(t, t0 + 0.2, Math.max(0.2, (t1 - t0) * 0.6))) * (1 - eo(prog(t, t1 + 0.1, 1.4)));
  if (ca > 0.01) for (let i = 0; i < 9; i++) {
    const grow = prog(t, t0 + 0.2, (t1 - t0) + 1.4);
    const px = aim[0] + (hash(i + 31) - 0.5) * 220 * reach + 30 * Math.sin(t * 0.8 + i), py = aim[1] + (hash(i + 32) - 0.6) * 200 * reach - 50 * grow;
    const r = (90 + 90 * hash(i + 33)) * (0.7 + 0.7 * grow) * reach;
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(240,232,206,${(0.2 * ca).toFixed(3)})`); gr.addColorStop(1, 'rgba(240,232,206,0)');
    g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r);
  }
  g.restore();
  return dens;
}

// ---------------------------------------------------------------- el triángulo / tetraedro
function edgeFrac(t, e) {                                   // los lados que tocan la esquina del calor se rompen al quitarla
  if (e === 0) return 1;
  return Math.max(1 - eio(prog(t, TT.quita, 0.28)), eio(prog(t, TT.ret + 0.12, 0.3)) * (t > TT.ret ? 1 : 0));
}
function calOffset(t) {                                     // la insignia del calor sale despedida y vuelve
  const o = eio(prog(t, TT.quita, 0.45)) * (1 - eio(prog(t, TT.ret, 0.38)));
  return [780 * o, -500 * o, 2.5 * o];
}
function flameK(t) {                                        // la llama del centro
  if (t < TT.quita + 0.1) return eo(prog(t, TT.ign, 0.35));
  if (t < TT.relit) return 1 - eio(prog(t, TT.quita + 0.1, Math.max(0.2, TT.out1 - TT.quita - 0.1)));
  if (t < TT.die2) return eo(prog(t, TT.relit, 0.3));
  if (t < TT.back) return 1 - eio(prog(t, TT.die2, Math.max(0.2, TT.out2 - TT.die2)));
  return eo(prog(t, TT.back + 0.1, 0.35)) * (1 + 0.35 * Math.exp(-Math.pow((t - TT.tet - 0.35) / 0.25, 2)));
}
function perimPt(p) {                                       // punto del perímetro (0..1) desde la esquina de arriba, en sentido horario
  const order = [2, 1, 0, 2], k = Math.min(2, Math.floor(p * 3)), u = p * 3 - k;
  const a = VB[order[k]], b = VB[order[k + 1]];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), 0];
}
function flamelet(x, y, s, k, t, seed) {                   // llamita ligera (rastro de la mecha)
  if (k <= 0.02) return;
  for (let i = 0; i < 3; i++) {
    const ph = seed * 2.3 + i * 2.1, off = i - 1;
    const h = s * k * (150 + 55 * Math.sin(t * 9 + ph) + 25 * Math.sin(t * 17 + ph * 1.7)) * (1 - 0.3 * Math.abs(off));
    const w = s * 30 * (1 - 0.25 * Math.abs(off)) * (0.6 + 0.4 * k);
    const bx = x + off * 20 * s, sw = s * k * 16 * Math.sin(t * 6 + ph);
    g.beginPath(); g.moveTo(bx - w, y);
    g.bezierCurveTo(bx - w, y - h * 0.45, bx + sw * 0.4 - w * 0.4, y - h * 0.75, bx + sw, y - h);
    g.bezierCurveTo(bx + sw * 0.4 + w * 0.4, y - h * 0.75, bx + w, y - h * 0.45, bx + w, y);
    g.quadraticCurveTo(bx, y + w * 0.5, bx - w, y);
    const gr = g.createLinearGradient(0, y, 0, y - h);
    gr.addColorStop(0, `rgba(255,238,190,${(0.55 * k).toFixed(3)})`); gr.addColorStop(0.35, `rgba(255,160,60,${(0.4 * k).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(200,50,10,0)');
    g.fillStyle = gr; g.fill();
  }
}
function fuse(t) {                                          // gancho: el triángulo de tiza arde como una mecha
  const p = lerp(0.07, 1, clamp(t / TT.f1));
  const flat = 1 - eio(prog(t, TT.lift, 0.5));
  if (flat <= 0) return;
  const P = q => ({ x: OX + q[0], y: OY - q[1] });
  const sp = 0.93 / TT.f1;                                  // velocidad de la mecha (perímetro por segundo)
  const flash = Math.exp(-Math.pow((t - TT.f1 - 0.08) / 0.12, 2));
  const N = 72;
  g.save(); g.lineCap = 'butt';
  for (let j = 0; j < N; j++) {
    const u0 = j / N, u1 = (j + 1) / N;
    const a = P(perimPt(u0)), b = P(perimPt(Math.min(u1, p)));
    if (u0 >= p) { const b2 = P(perimPt(u1)); chalkLine(a.x, a.y, b2.x, b2.y, 9, flat, j * 3.7); continue; }
    const age = (p - Math.min(u1, p)) / sp, hot = Math.exp(-age / 0.35);
    const col = mixc([255, 140, 60], [255, 236, 190], Math.max(hot, flash));
    const al = flat * (0.8 + 0.2 * Math.max(hot, prog(t, TT.f1, 0.25)));
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgbs(col, 0.2 * al * (0.6 + 0.8 * Math.max(hot, flash))); g.lineWidth = 36;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = rgbs(col, al); g.lineWidth = 9;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  // llamitas a lo largo de lo que ya ha prendido (se apagan poco a poco y del todo al cerrarse el triángulo)
  g.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 54; j++) {
    const u = (j + 0.5) / 54;
    if (u > p) break;
    const age = (p - u) / sp, k = flat * Math.exp(-age / 0.55) * Math.exp(-Math.max(0, t - TT.f1) / 0.3);
    const q = P(perimPt(u));
    flamelet(q.x, q.y + 4, 0.34 + 0.12 * hash(j), k, t, j);
  }
  g.restore();
  // frente de la mecha: llama y chispas
  if (t < TT.f1) {
    const f = P(perimPt(p));
    flame(f.x, f.y + 12, 0.5, 1, t, 5);
    glowAt(f.x, f.y, 170, [255, 200, 120], 0.55);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {                          // chispas emitidas cada 1/60 s desde donde estaba la mecha
      const te = Math.floor(t * 60 - i) / 60, age = t - te;
      if (te < -0.6 || age > 0.6) continue;
      const q = P(perimPt(lerp(0.07, 1, clamp(te / TT.f1))));
      const id = Math.floor(te * 60);
      const a = -Math.PI / 2 + (hash(id * 1.31 + 0.7) - 0.5) * 2.6, v = 220 + 380 * hash(id + 0.5);
      const x = q.x + Math.cos(a) * v * age, y = q.y + Math.sin(a) * v * age + 900 * age * age, k = age / 0.6;
      g.strokeStyle = `rgba(255,${Math.round(215 - 100 * k)},${Math.round(120 - 100 * k)},${(1 - k).toFixed(3)})`; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x - Math.cos(a) * v * 0.022, y - (Math.sin(a) * v + 1800 * age) * 0.022); g.lineTo(x, y); g.stroke();
    }
    g.restore();
  }
}
function objectLayer(t, V, A) {                             // triángulo/tetraedro 3D, insignias, «?», llama dentro
  const tet = eio(prog(t, TT.tet, 0.4));                    // 0 triángulo → 1 tetraedro
  const P3 = VB.map(v => proj(v, V)), PA = proj(APEX, V);
  const lifted = eio(prog(t, TT.lift, 0.5));
  const center = proj([0, 0, (H3 / 4) * tet], V);
  // insignias: piezas y su animación
  const cal = calOffset(t);
  const PB_ = P3.map((p, i) => i === 2 ? { x: p.x + cal[0], y: p.y + cal[1], s: p.s, z: p.z } : p);
  // aristas de la base
  const red = Math.exp(-Math.pow((t - TT.no - 0.2) / 0.22, 2));            // «no es un triángulo»: parpadeo rojo
  const flash = Math.exp(-Math.pow((t - TT.f1 - 0.1) / 0.15, 2));
  const pairs = [[0, 1], [1, 2], [2, 0]];
  const faces = [[0, 1, 3], [1, 2, 3], [2, 0, 3], [0, 1, 2]];
  const all = [...PB_, PA];
  const cols = [...EL.map(e => hexRGB(e.col))];
  // caras (solo tetraedro): las de atrás, la llama, las de delante
  const fv = faces.map(f => {
    const [a, b, c] = f.map(i => all[i]);
    const nz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);   // sentido en pantalla
    return { f, front: nz, z: (a.z + b.z + c.z) / 3 };
  });
  // orientación hacia fuera: el centro del tetraedro respecto a cada cara
  const drawFace = (o, alpha) => {
    if (alpha <= 0.005) return;
    const [a, b, c] = o.f.map(i => all[i]);
    g.save(); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.closePath();
    const col = o.f.includes(3) ? mixc(cols[o.f[0]], cols[o.f[1]], 0.5) : [255, 190, 110];
    const gr = g.createLinearGradient(a.x, a.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
    gr.addColorStop(0, rgbs(mixc(col, [255, 255, 255], 0.25), alpha)); gr.addColorStop(1, rgbs(col, alpha * 0.45));
    g.fillStyle = gr; g.fill(); g.restore();
  };
  const sorted = fv.slice().sort((p, q) => p.z - q.z);
  const faceA = eo(prog(t, TT.tet + 0.15, 0.5)) * A;
  // decidir delante/detrás con el producto vectorial en pantalla (las caras con el mismo signo que la base vista desde fuera)
  const sgnBase = Math.sign(fv[3].front) || 1;
  for (const o of sorted) { const back_ = o.f.includes(3) ? Math.sign(o.front) === sgnBase : true; if (back_) drawFace(o, 0.13 * faceA); }
  // llama (dentro)
  const fk = flameK(t);
  flame(center.x, center.y + 70 * center.s, 0.95 * center.s, fk * A, t, 1);
  glowAt(center.x, center.y - 40, 520, [255, 120, 40], 0.12 * fk * A);
  for (const o of sorted) { const back_ = o.f.includes(3) ? Math.sign(o.front) === sgnBase : true; if (!back_) drawFace(o, 0.2 * faceA); }
  // aristas de la base (3D) — antes del despegue las pinta la mecha
  for (let e = 0; e < 3; e++) {
    const [i, j] = pairs[e];
    const fr = edgeFrac(t, e);
    if (fr <= 0.001) continue;
    let a = PB_[i], b = PB_[j];
    if (e === 1) { b = { x: lerp(PB_[1].x, P3[2].x, fr), y: lerp(PB_[1].y, P3[2].y, fr) }; a = PB_[1]; }
    if (e === 2) { a = PB_[0]; b = { x: lerp(P3[0].x, P3[2].x, fr), y: lerp(P3[0].y, P3[2].y, fr) }; }
    let c0 = mixc([255, 205, 140], cols[i], prog(t, TT.b[i], 0.3)), c1 = mixc([255, 205, 140], cols[j], prog(t, TT.b[j], 0.3));
    if (e === 2) { c0 = mixc([255, 205, 140], cols[0], prog(t, TT.b[0], 0.3)); c1 = mixc([255, 205, 140], cols[2], prog(t, TT.b[2], 0.3)); }
    c0 = mixc(c0, [255, 60, 50], red); c1 = mixc(c1, [255, 60, 50], red);
    glowLine(a, b, c0, c1, 8 * (1 + 0.6 * flash + 0.5 * red), A * lifted);
    if (fr < 1 && fr > 0.02 && t < TT.ret) burst(b.x, b.y, TT.quita + 0.05, t, 16, 360, 0.6, 30 + e);
  }
  // la cuarta esquina: «?» (discontinua) → insignia de la cadena (tetraedro)
  const qa = eo(prog(t, TT.q - 0.08, 0.3)) * A;
  if (qa > 0.01) {
    for (let i = 0; i < 3; i++) {
      const tip = { x: lerp(P3[i].x, PA.x, eio(prog(t, TT.q, 0.35))), y: lerp(P3[i].y, PA.y, eio(prog(t, TT.q, 0.35))) };
      dashLine(P3[i], tip, qa * (1 - tet));
      const d = clamp((tet * 1.6) - i * 0.2);                // aristas de fuego del vértice nuevo
      if (d > 0) glowLine(P3[i], { x: lerp(P3[i].x, PA.x, d), y: lerp(P3[i].y, PA.y, d) }, cols[i], hexRGB(C_REAC), 8, A);
    }
  }
  // insignias, de atrás a delante
  const items = [0, 1, 2].map(i => ({ i, p: PB_[i], z: PB_[i].z }));
  items.push({ i: 3, p: PA, z: PA.z });
  items.sort((p, q) => p.z - q.z);
  const lab = (1 - eio(prog(t, TT.poll, 0.3))) * (1 - eio(prog(t, TT.tet + 0.1, 0.3)) * 0.0);
  for (const it of items) {
    if (it.i < 3) {
      const ap = TT.b[it.i];
      const pa = back(prog(t, ap - 0.04, 0.32));
      if (pa <= 0) continue;
      const pr = it.i === 2 ? { ...it.p } : it.p;
      if (it.i === 2 && cal[2] > 0) { g.save(); g.translate(pr.x, pr.y); g.rotate(cal[2]); g.translate(-pr.x, -pr.y); }
      const dep = it.z < -120 && tet > 0.5 ? 0.6 : 1;      // las de detrás, más apagadas al girar
      badge(pr, EL[it.i], Math.min(1, pa) * A * dep, lab * Math.min(1, pa) * (tet > 0.5 ? 0 : 1), t, { scale: pa });
      if (it.i === 2 && cal[2] > 0) g.restore();
    } else if (qa > 0.01) {
      const pop = back(prog(t, TT.q, 0.4)), pulse = 1 + 0.12 * Math.exp(-Math.pow((t - TT.cual - 0.15) / 0.25, 2)) + 0.1 * Math.exp(-Math.pow((t - TT.red - 0.15) / 0.25, 2));
      const redK = prog(t, TT.red, 0.2) * (1 - prog(t, TT.zoom, 0.2));
      const qcol = redK > 0.5 ? C_CAL : '#EDEBE3';
      if (tet < 1) badge(PA, EL[3], qa * (1 - tet), 0, t, { ghost: true, icon: 'q', col: qcol, scale: Math.max(0.01, pop) * pulse });
      if (tet > 0) badge(PA, EL[3], qa * tet, 0, t, { scale: back(prog(t, TT.tet, 0.4)) * 1.08 });
      // «LA 4.ª PIEZA» bajo el «?» (desde «cuál» hasta el zoom); en el tetraedro, su nombre
      const la = prog(t, TT.cual, 0.25) * (1 - prog(t, TT.zoom, 0.2)) + prog(t, TT.tet + 0.2, 0.3) * (1 - prog(t, TT.poll, 0.3)) * (t > TT.back ? 1 : 0);
      if (la > 0.01) {
        g.save(); g.globalAlpha = la * A;
        const nm = tet > 0.5 ? 'REACCIÓN EN CADENA' : 'LA 4.ª PIEZA', col = tet > 0.5 ? C_REAC : (redK > 0.5 ? C_CAL : '#EDEBE3');
        g.font = `400 ${tet > 0.5 ? 50 : 54}px Bebas`; g.textAlign = 'center'; g.lineJoin = 'round';
        const ly = PA.y - 62 * PA.s - 26, tw = g.measureText(nm).width, lx = clamp(PA.x, 34 + tw / 2, W - 34 - tw / 2);
        g.strokeStyle = 'rgba(8,10,10,0.85)'; g.lineWidth = 9; g.strokeText(nm, lx, ly);
        g.fillStyle = col; g.fillText(nm, lx, ly);
        g.restore();
      }
    }
  }
  // onda de choque al armarse el tetraedro
  const sw = prog(t, TT.tet + 0.3, 0.6);
  if (sw > 0 && sw < 1) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(255,200,110,${(0.7 * (1 - sw) * A).toFixed(3)})`; g.lineWidth = 10 * (1 - sw) + 2;
    g.beginPath(); g.arc(center.x, center.y, 120 + 520 * eo(sw), 0, 7); g.stroke();
    glowAt(center.x, center.y, 560, [255, 190, 100], 0.5 * (1 - sw) * A);
    g.restore();
  }
  return { center, PA, P3 };
}

// ---------------------------------------------------------------- la cuarta pieza: anillo de eslabones de fuego
function ringScene(t, A) {
  if (A <= 0.01) return;
  const cx = 540, cy = 900, Rr = 255, N = 14;
  const born = TT.zoom + 0.12;
  const tc = TT.cut, after = t > tc;
  const rotA = 0.32 * (Math.min(t, tc) - born);
  const fe = eo(prog(t, TT.feed, 0.45));
  const sag = eio(prog(t, tc + 0.25, 0.9));
  // eslabón que se parte: el más cercano a la derecha (por donde llega el polvo) en el momento del corte
  let ib = 0, best = 9;
  for (let i = 0; i < N; i++) { const a = ((i / N * 6.283 + 0.32 * (tc - born)) % 6.283 + 6.283) % 6.283; const d = Math.min(a, 6.283 - a); if (d < best) { best = d; ib = i; } }
  g.save(); g.globalAlpha = A;
  // llama que alimenta la cadena (dentro del anillo)
  const kf = (0.32 + 0.68 * fe) * (1 - eio(prog(t, tc + 0.05, 0.45)));
  flame(cx, cy + 120, 1.05, kf, t, 3);
  if (after) smoke(cx, cy + 20, tc + 0.35, t, 1.1);
  for (let i = 0; i < N; i++) {
    const asm = eo(prog(t, born + i * 0.022, 0.32));
    if (asm <= 0) continue;
    const ang = i / N * 6.283 + rotA;
    let x = cx + Math.cos(ang) * Rr * asm, y = cy + Math.sin(ang) * Rr * asm + 150 * sag * (0.6 + 0.4 * Math.sin(ang));
    // energía: dos pulsos que corren eslabón a eslabón
    const ph = (Math.min(t, tc) - TT.feed) * 1.25;
    let h = 0.18 + 0.82 * fe * Math.pow(0.5 + 0.5 * Math.cos(6.283 * (i / N * 2 - ph)), 3);
    h = Math.max(h, 0.3 * fe);
    if (after) {                                            // tras el corte, se apagan desde la rotura
      const dist = Math.min(Math.abs(i - ib), N - Math.abs(i - ib));
      h *= 1 - eo(prog(t, tc + 0.04 * dist, 0.35));
    }
    const flat = i % 2 === 0, Lk = flat ? 132 : 118, Wk = flat ? 54 : 15;
    const tang = ang + Math.PI / 2;
    if (after && i === ib) {                                // el eslabón partido: dos mitades que saltan
      const u = t - tc;
      for (const sgn of [-1, 1]) {
        const px = x + sgn * 70 * eo(clamp(u / 0.5)) + 40 * u, py = y + 520 * u * u - sgn * 30 * u;
        g.save(); g.translate(px, py); g.rotate(tang + sgn * 1.8 * u);
        g.strokeStyle = rgbs(heatRGB(Math.max(0, 0.9 - u * 1.4)), Math.max(0, 1 - u * 0.9)); g.lineWidth = 13; g.lineCap = 'round';
        g.beginPath(); g.arc(sgn * 14, 0, 26, sgn > 0 ? -1.4 : 1.75, sgn > 0 ? 1.4 : 4.55); g.stroke();
        g.restore();
      }
      continue;
    }
    g.save(); g.translate(x, y); g.rotate(tang);
    const col = heatRGB(h);
    if (h > 0.35) { g.shadowColor = rgbs([255, 120, 40], 0.9 * (h - 0.3)); g.shadowBlur = 34 * h; }
    if (flat) {
      rr(-Lk / 2, -Wk / 2, Lk, Wk, Wk / 2); g.lineWidth = 14; g.strokeStyle = rgbs(col, 1); g.stroke();
      g.shadowBlur = 0; g.lineWidth = 4; g.strokeStyle = rgbs(mixc(col, [255, 255, 240], 0.5), 0.5 + 0.5 * h); g.stroke();
    } else {
      rr(-Lk / 2, -Wk / 2, Lk, Wk, Wk / 2); g.fillStyle = rgbs(col, 1); g.fill();
      g.shadowBlur = 0; g.fillStyle = rgbs(mixc(col, [255, 255, 240], 0.4), 0.5 * h); rr(-Lk / 2 + 8, -3, Lk - 16, 5, 2.5); g.fill();
    }
    g.restore();
    if (h > 0.55) flame(x, y + 8, 0.2 * h, h, t, 10 + i);
  }
  // rótulos
  const la = prog(t, TT.zoom + 0.2, 0.3);
  g.font = '400 54px Bebas'; g.textAlign = 'center'; g.lineJoin = 'round';
  g.globalAlpha = A * la; g.strokeStyle = 'rgba(8,10,10,0.85)'; g.lineWidth = 9;
  g.strokeText('LA 4.ª PIEZA', cx, cy - Rr - 80); g.fillStyle = '#EDEBE3'; g.fillText('LA 4.ª PIEZA', cx, cy - Rr - 80);
  const lp = back(prog(t, TT.lab - 0.03, 0.4));
  if (lp > 0) {
    g.save(); g.globalAlpha = A * clamp(lp); g.translate(cx, cy + Rr + 190); g.scale(lp, lp);
    g.font = '400 104px Bebas'; g.strokeStyle = 'rgba(8,10,10,0.9)'; g.lineWidth = 12;
    g.strokeText('REACCIÓN EN CADENA', 0, 0); g.fillStyle = C_REAC; g.fillText('REACCIÓN EN CADENA', 0, 0);
    g.restore();
    glowAt(cx, cy + Rr + 160, 480, [255, 190, 90], 0.35 * Math.exp(-Math.pow((t - TT.lab - 0.15) / 0.25, 2)) * A);
  }
  if (after) burst(cx + Rr, cy, tc, t, 30, 520, 0.8, 70);
  g.restore();
}

// ---------------------------------------------------------------- encuesta
function triIcon(x, y, s, col) {
  g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.95, y + s * 0.65); g.lineTo(x - s * 0.95, y + s * 0.65); g.closePath();
  g.strokeStyle = col; g.lineWidth = 6; g.lineJoin = 'round'; g.stroke();
}
function tetIcon(x, y, s, col) {
  const p = [[x - s * 0.95, y + s * 0.6], [x + s * 0.95, y + s * 0.6], [x + s * 0.15, y + s * 0.15], [x, y - s]];
  g.strokeStyle = col; g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(...p[0]); g.lineTo(...p[1]); g.lineTo(...p[3]); g.closePath(); g.stroke();
  g.globalAlpha *= 0.6; g.beginPath(); g.moveTo(...p[0]); g.lineTo(...p[2]); g.lineTo(...p[1]); g.moveTo(...p[2]); g.lineTo(...p[3]); g.stroke();
  g.globalAlpha /= 0.6;
}
function poll(t) {
  const out = 1 - prog(t, TT.share - 0.12, 0.25);
  if (t < TT.poll || out <= 0) return;
  const bub = eio(prog(t, TT.com - 0.02, 0.3));
  for (const [k, x, t0, col, nm] of [[0, 290, TT.triO, '#46C2F0', 'TRIÁNGULO'], [1, 790, TT.tetO, C_REAC, 'TETRAEDRO']]) {
    const a = back(prog(t, t0 - 0.06, 0.35));
    if (a <= 0) continue;
    const y = 1390 - 16 * bub;
    g.save(); g.globalAlpha = out * clamp(a); g.translate(x, y); g.scale(a, a);
    const w = 440, h = 150;
    g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 40);
    if (bub > 0) {                                          // se vuelve bocadillo de comentario
      const sx = k ? 120 : -120;
      g.moveTo(sx - 40 * bub, h / 2 - 2); g.lineTo(sx - 70 * bub, h / 2 + 52 * bub); g.lineTo(sx + 10 * bub, h / 2 - 2);
    }
    g.fillStyle = 'rgba(12,14,16,0.88)'; g.fill();
    g.lineWidth = 5; g.strokeStyle = col; g.stroke();
    if (k) tetIcon(-w / 2 + 78, 2, 40, col); else triIcon(-w / 2 + 78, 6, 40, col);
    txt(nm, 46, 27, 74, '#F4F1EA', 400, 'center', 'Bebas');
    g.restore();
  }
  if (bub > 0) {
    g.save(); g.globalAlpha = out * bub;
    const bob = 9 * Math.abs(Math.sin((t - TT.com) * 5));
    g.font = '400 70px Bebas'; g.textAlign = 'center'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(8,10,10,0.9)'; g.lineWidth = 10; g.strokeText('COMENTA', 540, 1585);
    g.fillStyle = ORANGE; g.fillText('COMENTA', 540, 1585);
    g.beginPath(); g.moveTo(510, 1608 + bob); g.lineTo(570, 1608 + bob); g.lineTo(540, 1644 + bob); g.closePath(); g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------- brasas de la marca: el tetraedro estalla
function embersOut(t, V) {
  const t0 = TT.marca - 0.3, u = t - t0;
  if (u < 0 || u > 1.3) return;
  const pts = [...VB.map(v => proj(v, V)), proj(APEX, V)];
  const E = [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]];
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 120; i++) {
    const e = E[i % 6], k0 = hash(i + 3), a = pts[e[0]], b = pts[e[1]];
    const x0 = lerp(a.x, b.x, k0), y0 = lerp(a.y, b.y, k0);
    const ang = Math.atan2(y0 - V.oy, x0 - V.ox) + (hash(i + 5) - 0.5), v = 260 + 520 * hash(i + 7);
    const life = 0.8 + 0.5 * hash(i + 9), k = u / life;
    if (k >= 1) continue;
    const x = x0 + Math.cos(ang) * v * u, y = y0 + Math.sin(ang) * v * u - 260 * u * u;
    const c = heatRGB(1 - k);
    g.fillStyle = rgbs(c, 1 - k); g.beginPath(); g.arc(x, y, 3 + 3 * hash(i + 11), 0, 7); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- cabecera
function header(t) {
  const a = 1 - prog(t, TT.marca - 0.3, 0.3);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.font = '400 50px Bebas'; g.textAlign = 'left'; g.fillStyle = '#EDEBE3';
  g.fillText('TEORÍA DEL ', 70, 150);
  const w = g.measureText('TEORÍA DEL ').width;
  g.fillStyle = ORANGE; g.fillText('FUEGO', 70 + w, 150);
  rr(70, 172, 940, 6, 3); g.fillStyle = 'rgba(237,235,227,0.15)'; g.fill();
  rr(70, 172, 940 * clamp(t / (TT.marca - 0.3)), 6, 3); g.fillStyle = ORANGE; g.fill();
  g.restore();
}

// ---------------------------------------------------------------- fotograma
window.renderAt = t => {
  g.setTransform(PR, 0, 0, PR, 0, 0);
  if (!TT) ttInit();
  if (!BOARD) makeBoard();
  const kM = eio(prog(t, TT.marca - 0.3, 0.6));            // pizarra → brasas de la marca
  // cámara: en el gancho empieza cerca de la mecha y se abre; golpes en el corte y al armarse el tetraedro
  const open = eio(prog(t, 0, 1.35));
  const zc = [lerp(600, 540, open), lerp(735, 960, open)];
  const kick = 0.035 * Math.exp(-Math.pow((t - TT.cut - 0.05) / 0.12, 2)) + 0.05 * Math.exp(-Math.pow((t - TT.tet - 0.32) / 0.14, 2)) + 0.07 * punch(t);
  const z = lerp(1.65, 1, open) + kick;
  if (kM < 1) {
    g.save(); g.translate(zc[0], zc[1]); g.scale(z, z); g.translate(-zc[0], -zc[1]);
    g.drawImage(BOARD, -20, -20, W + 40, H + 40);
    const V = view(t);
    const fk = flameK(t);
    // la luz del fuego en la pizarra
    const lc = proj([0, 0, 0], V);
    glowAt(lc.x, lc.y - 60, 760, [255, 120, 40], 0.16 * fk * (0.9 + 0.1 * Math.sin(t * 17)));
    // rastro de tiza que queda en la pizarra al despegarse el triángulo
    const ringV = prog(t, TT.zoom + 0.1, 0.35) * (1 - prog(t, TT.back, 0.35));
    const trace = eio(prog(t, TT.lift, 0.5)) * 0.2 * (1 - ringV) * (1 - eio(prog(t, TT.tet, 0.6)));
    if (trace > 0) for (let e = 0; e < 3; e++) { const a = VB[[2, 1, 0][e]], b = VB[[1, 0, 2][e]]; chalkLine(OX + a[0], OY - a[1], OX + b[0], OY - b[1], 8, trace, 50 + e); }
    // capa del triángulo (se aleja en el zoom a la cuarta pieza y vuelve en el 2.º «triángulo»)
    const zIn = eio(prog(t, TT.zoom, 0.55)), back_ = eo(prog(t, TT.back, 0.4));
    const triA = (1 - prog(t, TT.zoom + 0.2, 0.3)) * (t < TT.back ? 1 : 1) + (t >= TT.back ? back_ : 0);
    const ringA = prog(t, TT.zoom + 0.1, 0.35) * (1 - prog(t, TT.back, 0.35));
    const triVis = t < TT.zoom + 0.5 || t >= TT.back;
    if (triVis) {
      g.save();
      let qx = 540, qy = 960;
      if (t < TT.back) { const PA = proj(APEX, V); qx = PA.x; qy = PA.y; const zz = 1 + 2.4 * zIn; g.translate(qx, qy); g.scale(zz, zz); g.translate(-qx, -qy); }
      else { const zz = lerp(0.88, 1, back_); g.translate(540, 960); g.scale(zz, zz); g.translate(-540, -960); }
      const A = t < TT.back ? 1 - prog(t, TT.zoom + 0.08, 0.25) : back_;
      fuse(t);
      if (t >= TT.lift - 0.01) {
        objectLayer(t, V, A);                              // la llama y las aristas pasan sin corte de la tiza al 3D
      } else {
        // antes del despegue: solo la llama del centro (la mecha la pinta fuse)
        flame(OX, OY + 70, 0.95, fk, t, 1);
      }
      // humo al apagarse (calor fuera) y tras el polvo
      smoke(OX, OY - 40, TT.out1 - 0.2, t, 1);
      smoke(OX, OY - 40, TT.out2 - 0.15, t, 0.8, 12, 1.0);
      // extintor y polvo
      extinguisher(t, [790, 880], TT.noz, TT.spray1 + 0.3);
      powder(t, [790, 880], [560, 900], TT.spray0, TT.spray1);
      g.restore();
    }
    // la cuarta pieza: anillo de fuego (con su propio chorro de polvo)
    if (ringA > 0.01) {
      g.save();
      const zz = lerp(0.55, 1, eo(prog(t, TT.zoom + 0.1, 0.45)));
      g.translate(540, 900); g.scale(zz, zz); g.translate(-540, -900);
      ringScene(t, ringA);
      extinguisher(t, [900, 900], TT.jet - 0.3, TT.cut + 0.35);
      powder(t, [900, 900], [790, 900], TT.jet, TT.cut + 0.2, 150, 0.7);
      g.restore();
    }
    embersOut(t, view(t));
    g.restore();
    poll(t);
    header(t);
    // bajo el avión de compartir, la pizarra se oscurece
    const dim = prog(t, TT.share - 0.1, 0.25);
    if (dim > 0) { g.fillStyle = `rgba(0,0,0,${(0.55 * dim).toFixed(3)})`; g.fillRect(0, 0, W, H); }
    if (kM > 0) { g.save(); g.globalAlpha = kM; background(t); sparks(t); g.restore(); }
  } else { background(t); sparks(t); }
  share(t);
  closing(t);
  const pu = punch(t);
  if (pu > 0.01) { const fg = g.createRadialGradient(540, 900, 50, 540, 900, 1100); fg.addColorStop(0, `rgba(255,214,140,${(0.32 * pu).toFixed(3)})`); fg.addColorStop(1, 'rgba(255,140,40,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = fg; g.fillRect(0, 0, W, H); g.restore(); }
  const f = prog(t, END - 0.25, 0.25);
  if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
};
