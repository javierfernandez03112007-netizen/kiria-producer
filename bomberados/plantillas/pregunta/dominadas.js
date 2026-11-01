// Formato «¿Qué nota sacarías?» — prueba física de DOMINADAS (Bomberados). Se carga DESPUÉS de scene.js (web/index.html)
// y sustituye su renderAt. Usa de scene.js: g, W, H, PR, CUE, Q, END, clamp, prog, eo, eio, back, lerp, hash, rr, txt, rgba,
// mixc, rgbs, glowAt, background, sparks, share, closing, punch, ORANGE, GOLD, WHITE, RED, TEAL.
//
// Estudio claro y suave. Un muñeco de bombero (casco, camiseta con banda reflectante) hace dominadas en una barra:
//  · gancho: acaba la repetición 11 en «once» y en «suspendes» cae un sello SUSPENSO y se suelta de la barra;
//  · «mira»: vuelve a la barra, el contador a 0 y aparece la escala oficial (video.json → tabla);
//  · parte SIN VOZ (hueco de la cuenta, voz.count): 30 repeticiones, primero a velocidad real y luego acelerado (×N en
//    pantalla); la nota salta en cada umbral (12 → 5 … 30 → 10) y la escala se va llenando (hombres y mujeres);
//  · técnica: «ojo» repetición mala (barbilla por debajo) ✗, «barbilla» buena ✓, «brazos» extensión completa ✓,
//    «balanceo» patada ✗;
//  · venta: «¿cuántas haces tú?», avión de papel (share) con golpe, y en «Bomberados» el fondo pasa a brasas con la placa.
// La línea de tiempo (PB) la usa también compose.py (sfx de la prueba) para que cada sonido vaya con su imagen.

let PB = null;
const INK = '#1B1D22', INK2 = '#5C6270', OK_ = '#22A35A', BAD = '#E5484D';
const BAR = { y: 560, x0: 230, x1: 850 }, CXB = 540, FLOOR = 1455;
const FS = 1.1;                                            // escala del muñeco
const GRIP = 165 * FS, SHW = 92 * FS, L1 = 126 * FS, L2 = 120 * FS, TORSO = 230 * FS, THIGH = 170 * FS, SHIN = 165 * FS;
const D_BOT = Math.sqrt((L1 + L2) ** 2 - (GRIP - SHW) ** 2) - 2, D_TOP = 34 * FS;   // hombros bajo la barra: abajo / arriba
const LEGS = THIGH + SHIN + 30;

function pbInit() {
  const L = window.LINES_;                                  // líneas de la voz (scene.js las guarda)
  const d0 = (L && L[1] ? L[1].end : CUE.nota + 0.8) + 0.12;          // empieza la parte sin voz
  const d1 = (L && L[2] ? L[2].start : d0 + 12) - 0.25;               // acaba
  const T = Q.tabla || { notas: [5, 6, 7, 8, 9, 10], hombres: [12, 16, 20, 24, 26, 30], mujeres: [12, 14, 18, 21, 23, 25] };
  // duraciones de las 30 repeticiones: reales al principio, aceleradas en medio, más lentas en las últimas
  const raw = [];
  for (let k = 1; k <= 30; k++) raw.push(k <= 3 ? 1.15 - 0.1 * (k - 1) : k <= 8 ? 0.8 - 0.07 * (k - 3) : k <= 27 ? 0.3 : [0.45, 0.65, 0.95][k - 28]);
  const tot = raw.reduce((a, b) => a + b, 0), span = d1 - d0 - 1.1;   // 1,1 s para celebrar el 10
  const durs = raw.map(x => x * span / tot);
  const ends = []; let acc = d0;
  for (const x of durs) { acc += x; ends.push(acc); }
  PB = { d0, d1, durs, ends, T, once: CUE.once ?? 0.5, susp: CUE.suspendes ?? 1.5, mira: CUE.mira ?? 4.3,
    ojo: CUE.ojo, barb: CUE.barbilla, braz: CUE.brazos, bal: CUE.balanceo, cuantas: CUE.cuantas, marca: CUE.marca };
  CUE.descripcion = CUE.marca - 0.2;                        // para share(): el avión acaba antes de la marca
}

// ---------------------------------------------------------------- repeticiones: posición de los hombros (0 abajo → 1 arriba)
function repCurve(u) {                                      // u ∈ [0,1): sube, se mantiene arriba y baja
  if (u < 0.42) return eio(u / 0.42);
  if (u < 0.56) return 1;
  return 1 - eio((u - 0.56) / 0.44);
}
function demoState(t) {                                     // [nº de repeticiones contadas, altura 0..1]
  const { d0, ends, durs } = PB;
  if (t < d0) return [0, 0];
  for (let k = 0; k < 30; k++) {
    const s = ends[k] - durs[k];
    if (t < ends[k]) { const u = (t - s) / durs[k]; return [k + (u >= 0.42 ? 1 : 0), repCurve(u)]; }
  }
  const hold = t - ends[29];                                // tras la 30: sube y aguanta arriba celebrando, luego baja
  return [30, hold < 0.35 ? eio(hold / 0.35) : hold < 0.95 ? 1 : 1 - eio(clamp((hold - 0.95) / 0.5))];
}
function techRep(t, t0, kind) {                             // una repetición de la parte de técnica (1,3 s) desde t0
  const u = (t - t0) / 1.3;
  if (u < 0 || u >= 1) return null;
  if (kind === 'chin') return { h: 0.62 * repCurve(u), kick: 0 };          // la barbilla no pasa la barra
  if (kind === 'kip') return { h: repCurve(u), kick: Math.sin(Math.PI * clamp(u / 0.5)) };   // patada y balanceo
  return { h: repCurve(u), kick: 0 };
}

// ---------------------------------------------------------------- estado del muñeco en cada instante
function pose(t) {
  const P = { hang: true, h: 0, kick: 0, swing: 0, dropY: 0, squat: 0, bentBottom: 0 };
  const { once, susp, mira, d0, d1 } = PB;
  if (t < susp) {                                           // gancho: ya va subiendo y la barbilla pasa la barra en «once»
    const t0 = Math.min(-0.2, once - 0.75);
    if (t < once) P.h = eio(clamp((t - t0) / (once - t0)));
    else if (t < once + 0.15) P.h = 1;
    else P.h = 1 - eio(clamp((t - once - 0.15) / 0.5));
    P.count = t >= once ? 11 : 10;
    return P;
  }
  if (t < mira) {                                           // se suelta y cae al suelo
    P.count = 11;
    const u = t - susp;
    if (u < 0.12) { P.h = 0; return P; }
    P.hang = false;
    const fall = clamp((u - 0.12) / 0.38);
    P.dropY = 900 * fall * fall * 0.18 * 10 / 1.8;          // ≈ 500 px en 0,38 s
    P.dropY = Math.min(P.dropY, FLOOR - (BAR.y + D_BOT + TORSO + LEGS));
    const land = prog(u, 0.5, 0.35);
    P.squat = Math.sin(Math.PI * land) * 0.5;
    return P;
  }
  if (t < d0) {                                             // salta a la barra y espera colgado
    P.count = t < mira + 0.2 ? 11 : 0;
    const u = prog(t, mira, 0.55);
    if (u < 1) { P.hang = u > 0.75; P.dropY = (FLOOR - (BAR.y + D_BOT + TORSO + LEGS)) * (1 - eio(u)) - 60 * Math.sin(Math.PI * u); P.squat = (1 - u) * 0.3; }
    return P;
  }
  if (t < d1 + 0.25) { const [c, h] = demoState(t); P.count = c; P.h = h; return P; }
  P.count = 30;
  // técnica: «ojo» la barbilla no llega ✗ · «barbilla» sube y se queda arriba ✓ · «brazos» baja hasta estirar del todo ✓ ·
  // «balanceo» repetición con patada ✗ (cada ✓/✗ sale 0,45 s después de su palabra, justo cuando se ve)
  let cur = null;
  for (const c of [[PB.ojo, 'chin'], [PB.barb, 'good'], [PB.braz, 'ext'], [PB.bal, 'kip']]) if (c[0] !== undefined && t >= c[0] - 0.1) cur = c;
  if (cur && !(PB.cuantas !== undefined && t > PB.cuantas)) {
    const u = (t - cur[0] + 0.1) / 1.3;
    if (cur[1] === 'chin') P.h = 0.62 * repCurve(Math.min(u, 0.999));
    else if (cur[1] === 'good') P.h = u < 0.42 ? eio(u / 0.42) : 1;
    else if (cur[1] === 'ext') P.h = 1 - eio(clamp(u / 0.4));
    else if (u < 1) { P.h = repCurve(u); P.kick = Math.sin(Math.PI * clamp(u / 0.5)); P.swing = 0.09 * Math.sin((t - cur[0]) * 7) * P.kick; }
    P.tech = cur[1];
    return P;
  }
  if (PB.cuantas !== undefined && t > PB.cuantas) {         // venta: repeticiones lentas y limpias
    const u = ((t - PB.cuantas) / 1.6) % 1;
    P.h = repCurve(u) * 0.95;
  }
  return P;
}

// ---------------------------------------------------------------- estudio claro y barra
function studio(t) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#F4F1EC'); bg.addColorStop(0.6, '#E9E4DC'); bg.addColorStop(1, '#D6CFC4');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const sp = g.createRadialGradient(540, 820, 60, 540, 860, 820);
  sp.addColorStop(0, 'rgba(255,255,255,0.75)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sp; g.fillRect(0, 0, W, H);
  // suelo
  const fg = g.createLinearGradient(0, FLOOR - 10, 0, H);
  fg.addColorStop(0, '#CFC7BB'); fg.addColorStop(1, '#B9B0A3');
  g.fillStyle = fg; g.fillRect(0, FLOOR, W, H - FLOOR);
  g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, FLOOR, W, 3);
  // líneas suaves de fondo (rejilla de gimnasio)
  g.strokeStyle = 'rgba(40,40,50,0.045)'; g.lineWidth = 2;
  for (let x = 60; x < W; x += 120) { g.beginPath(); g.moveTo(x, 230); g.lineTo(x, FLOOR); g.stroke(); }
  const vg = g.createRadialGradient(540, 900, 500, 540, 900, 1300);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,45,30,0.22)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function station() {
  for (const x of [BAR.x0 - 16, BAR.x1 + 16]) {             // postes
    const pg = g.createLinearGradient(x - 16, 0, x + 16, 0);
    pg.addColorStop(0, '#2B2E35'); pg.addColorStop(0.5, '#4A4F59'); pg.addColorStop(1, '#22252B');
    g.fillStyle = pg; g.fillRect(x - 16, BAR.y - 40, 32, FLOOR - BAR.y + 40);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x + 10, FLOOR + 4, 46, 9, 0, 0, 7); g.fill();
  }
  const bg = g.createLinearGradient(0, BAR.y - 11, 0, BAR.y + 11);       // barra cromada
  bg.addColorStop(0, '#F7F8FA'); bg.addColorStop(0.35, '#B9BEC7'); bg.addColorStop(0.65, '#6B717C'); bg.addColorStop(1, '#C9CED6');
  g.fillStyle = bg; rr(BAR.x0 - 30, BAR.y - 11, BAR.x1 - BAR.x0 + 60, 22, 11); g.fill();
}

// ---------------------------------------------------------------- el muñeco de bombero (vista de frente)
function limb(x0, y0, x1, y1, w0, w1, col, col2) {          // segmento redondeado con volumen
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
  const gg = g.createLinearGradient(x0 + nx * w0, y0 + ny * w0, x0 - nx * w0, y0 - ny * w0);
  gg.addColorStop(0, col2); gg.addColorStop(0.45, col); gg.addColorStop(1, col2);
  g.fillStyle = gg;
  g.beginPath();
  g.moveTo(x0 + nx * w0, y0 + ny * w0); g.lineTo(x1 + nx * w1, y1 + ny * w1);
  g.arc(x1, y1, w1, a + Math.PI / 2, a - Math.PI / 2, true);
  g.lineTo(x0 - nx * w0, y0 - ny * w0);
  g.arc(x0, y0, w0, a - Math.PI / 2, a + Math.PI / 2, true);
  g.closePath(); g.fill();
}
function ik(sx, sy, wx, wy, side) {                         // codo (dos huesos), hacia fuera
  const dx = wx - sx, dy = wy - sy, d = Math.min(L1 + L2 - 0.5, Math.hypot(dx, dy));
  const a = Math.atan2(dy, dx), cosB = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), b = Math.acos(clamp(cosB, -1, 1));
  const ang = a + side * b;
  return [sx + Math.cos(ang) * L1, sy + Math.sin(ang) * L1];
}
function mannequin(t, P) {
  const skin = '#E9C9A6', skin2 = '#C99E78', shirt = '#24324A', shirt2 = '#151E2E', pant = '#2A3446', pant2 = '#161C27';
  const refl = '#F2D04A';
  const shY = BAR.y + lerp(D_BOT, D_TOP, P.h) + P.dropY + P.squat * 40;
  const S_ = FS;
  const sw = SHW, cx = CXB + (P.hang ? 0 : 0);
  g.save();
  g.translate(cx, shY); g.rotate(P.swing); g.translate(-cx, -shY);
  // sombra en el suelo (crece al acercarse)
  g.save(); g.setTransform(PR, 0, 0, PR, 0, 0);
  const feetY = shY + TORSO + LEGS - 30;
  const near = clamp(1 - (FLOOR - feetY) / 400);
  g.fillStyle = `rgba(30,20,10,${(0.10 + 0.22 * near).toFixed(3)})`; g.beginPath(); g.ellipse(cx, FLOOR + 6, 120 - 40 * (1 - near), 14, 0, 0, 7); g.fill();
  g.restore();
  // piernas (rodillas que suben en la patada)
  const hipY = shY + TORSO, kick = P.kick, sq = P.squat;
  for (const s of [-1, 1]) {
    const hx = cx + s * 44 * S_, kx = cx + s * (50 + 30 * kick) * S_, ky = hipY + THIGH * (1 - 0.55 * kick) - 70 * sq;
    const fx = cx + s * (38 + 10 * kick) * S_, fy = ky + SHIN * (1 - 0.35 * kick) - 30 * sq;
    limb(hx, hipY, kx, ky, 36 * S_, 28 * S_, pant, pant2);
    limb(kx, ky, fx, fy, 28 * S_, 22 * S_, pant, pant2);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(kx, ky, 18 * S_, 10 * S_, 0, 0, 7); g.fill();
    g.fillStyle = refl; g.save(); g.translate(fx, fy - 58); g.rotate(Math.atan2(fy - ky, fx - kx) - Math.PI / 2); g.fillRect(-23, -6, 46, 12); g.restore();
    g.fillStyle = '#121418'; rr(fx - 26, fy - 14, 52, 40, 12); g.fill();                   // bota
    g.fillStyle = 'rgba(255,255,255,0.12)'; rr(fx - 20, fy - 10, 40, 8, 4); g.fill();
  }
  // brazos: manos en la barra (si cuelga) o caídos
  const hands = P.hang ? [[cx - GRIP, BAR.y + 6], [cx + GRIP, BAR.y + 6]] : [[cx - 70 * S_, shY + TORSO], [cx + 70 * S_, shY + TORSO]];
  const armsBehind = [];
  for (const [i, s] of [[0, -1], [1, 1]]) {
    const sx = cx + s * sw, [wx, wy] = hands[i];
    const [ex, ey] = P.hang ? ik(sx, shY, wx, wy, s > 0 ? -1 : 1) : [sx + s * 30, shY + 120];
    armsBehind.push([sx, shY, ex, ey, wx, wy, s]);
  }
  // sombra suave del muñeco en la pared del fondo (profundidad)
  g.save(); g.globalAlpha = 0.10; g.fillStyle = '#3A2E22'; g.filter = 'blur(18px)';
  g.beginPath(); g.ellipse(cx + 40, shY + TORSO * 0.6, 120 * S_, TORSO * 1.25, 0, 0, 7); g.fill(); g.filter = 'none'; g.restore();
  // torso (camiseta) con hombros redondeados, banda reflectante y cinturón
  g.beginPath();
  g.moveTo(cx - sw - 26, shY + 10); g.quadraticCurveTo(cx - sw - 24, shY - 22, cx - sw + 14, shY - 20);
  g.quadraticCurveTo(cx, shY - 30, cx + sw - 14, shY - 20); g.quadraticCurveTo(cx + sw + 24, shY - 22, cx + sw + 26, shY + 10);
  g.quadraticCurveTo(cx + sw + 8, shY + TORSO * 0.45, cx + 82 * S_, hipY + 6); g.quadraticCurveTo(cx, hipY + 18, cx - 82 * S_, hipY + 6);
  g.quadraticCurveTo(cx - sw - 8, shY + TORSO * 0.45, cx - sw - 26, shY + 10); g.closePath();
  const tg = g.createLinearGradient(cx - sw, 0, cx + sw, 0);
  tg.addColorStop(0, shirt2); tg.addColorStop(0.4, shirt); tg.addColorStop(1, shirt2);
  g.fillStyle = tg; g.fill();
  g.save(); g.clip();
  g.fillStyle = refl; g.fillRect(cx - sw - 30, shY + 96 * S_, 2 * sw + 60, 17 * S_);
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(cx - sw - 30, shY + 100 * S_, 2 * sw + 60, 4);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(cx - 4, shY - 20, 8, TORSO);          // costura
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = `400 ${Math.round(32 * S_)}px Bebas`; g.textAlign = 'center'; g.fillText('BOMBERO', cx, shY + 160 * S_);
  g.fillStyle = '#0E1118'; rr(cx - 86 * S_, hipY - 10, 172 * S_, 22, 6); g.fill();          // cinturón
  g.fillStyle = '#8C93A0'; rr(cx - 14, hipY - 8, 28, 18, 4); g.fill();
  // brazos por delante del torso
  for (const [sx, sy, ex, ey, wx, wy, s] of armsBehind) {
    limb(sx, sy + 8, ex, ey, 27 * S_, 22 * S_, shirt, shirt2);   // manga hasta el codo
    g.fillStyle = refl; const ma = Math.atan2(ey - sy, ex - sx); g.save(); g.translate(lerp(sx, ex, 0.62), lerp(sy, ey, 0.62)); g.rotate(ma); g.fillRect(-8, -24 * S_, 16, 48 * S_); g.restore();
    limb(ex, ey, wx, wy, 20 * S_, 16 * S_, skin, skin2);
    g.fillStyle = '#121418';                                // guante: los dedos rodean la barra
    if (P.hang) { rr(wx - 22, wy - 30, 44, 34, 12); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(wx - 16, wy - 26, 32, 4); }
    else { g.beginPath(); g.arc(wx, wy + 2, 20, 0, 7); g.fill(); }
  }
  // cuello y cabeza de muñeco con casco
  limb(cx, shY - 4, cx, shY - 34 * S_, 23 * S_, 23 * S_, skin, skin2);
  const hy = shY - 80 * S_;
  const hg = g.createRadialGradient(cx - 14, hy - 14, 8, cx, hy, 56);
  hg.addColorStop(0, '#F3D7B7'); hg.addColorStop(1, skin2);
  g.fillStyle = hg; g.beginPath(); g.ellipse(cx, hy, 46 * S_, 56 * S_, 0, 0, 7); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = skin2; g.beginPath(); g.ellipse(cx + s * 46 * S_, hy + 4, 8, 14, 0, 0, 7); g.fill(); }   // orejas
  g.strokeStyle = 'rgba(120,80,50,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, hy + 26, 16, 0.2, Math.PI - 0.2); g.stroke();   // barbilla
  // casco
  g.beginPath(); g.ellipse(cx, hy - 26, 66, 16, 0, 0, 7); g.fillStyle = '#C98E0C'; g.fill();          // ala
  g.beginPath(); g.moveTo(cx - 50, hy - 26); g.quadraticCurveTo(cx - 52, hy - 98, cx, hy - 100); g.quadraticCurveTo(cx + 52, hy - 98, cx + 50, hy - 26); g.closePath();
  const cg = g.createLinearGradient(cx - 50, 0, cx + 50, 0); cg.addColorStop(0, '#E0A514'); cg.addColorStop(0.45, '#FFD24A'); cg.addColorStop(1, '#B67F08');
  g.fillStyle = cg; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(cx - 18, hy - 76, 12, 20, -0.4, 0, 7); g.fill();
  g.fillStyle = '#9B6B05'; g.fillRect(cx - 5, hy - 98, 10, 72);
  g.restore();
  return { chinY: hy + 50, shY };
}

// ---------------------------------------------------------------- interfaz: contador, nota, escala y técnica
function gradeOf(n) { const T = PB.T; let gr = null; for (let i = 0; i < T.notas.length; i++) if (n >= T.hombres[i]) gr = T.notas[i]; return gr; }
function gradeColor(gr) { return gr === null ? BAD : gr >= 9 ? '#D99A08' : gr >= 7 ? ORANGE : OK_; }
function header(t) {
  const a = 1 - prog(t, PB.marca - 0.3, 0.4);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.letterSpacing = '2px'; txt('PRUEBA FÍSICA', 60, 120, 40, INK, 400, 'left', 'Bebas');
  const w = g.measureText('PRUEBA FÍSICA ').width; g.letterSpacing = '0px';
  txt('· DOMINADAS', 60 + w, 120, 40, ORANGE, 400, 'left', 'Bebas');
  g.letterSpacing = '3px'; txt('BOMBERADOS', W - 60, 120, 36, INK, 400, 'right', 'Bebas'); g.letterSpacing = '0px';
  txt('Baremo oficial: ' + (Q.norma || ''), 60, 162, 24, INK2, 600, 'left');
  g.fillStyle = 'rgba(27,29,34,0.12)'; g.fillRect(60, 186, W - 120, 4);
  g.fillStyle = ORANGE; g.fillRect(60, 186, (W - 120) * clamp(t / END), 4);
  g.restore();
}
function counter(t, P) {
  const inTech = PB.ojo !== undefined && t > PB.ojo + 0.3 && t < (PB.cuantas ?? PB.marca);
  const a = (1 - prog(t, PB.cuantas ?? PB.marca, 0.3)) * (inTech ? 1 - prog(t, PB.ojo + 0.3, 0.2) : 1);
  if (a <= 0.01) return;
  const x = 880, y = 760;
  g.save(); g.globalAlpha = a * eo(prog(t, 0, 0.2));
  g.fillStyle = 'rgba(255,255,255,0.72)'; rr(x - 130, y - 150, 260, 230, 26); g.fill();
  g.strokeStyle = 'rgba(27,29,34,0.12)'; g.lineWidth = 2; g.stroke();
  g.letterSpacing = '3px'; txt('REPETICIONES', x, y - 106, 26, INK2, 400, 'center', 'Bebas'); g.letterSpacing = '0px';
  const n = P.count ?? 0;
  const k = PB._lastN === n ? PB._pop : (PB._pop = t, PB._lastN = n, t);
  const pop = 1 + 0.25 * Math.exp(-(t - k) * 9);
  txt(String(n), x, y + 44 * pop, 150 * pop, INK, 400, 'center', 'Bebas');
  // nota
  const gr = gradeOf(n), fail = gr === null;
  const by = y + 200;
  if (t > PB.susp - 0.05 && t < PB.mira + 0.3) { g.restore(); return; }     // en el gancho manda el sello SUSPENSO
  const gc = gradeColor(gr);
  const kg = PB._lastG === gr ? PB._gpop : (PB._gpop = t, PB._lastG = gr, t);
  const gp = back(clamp((t - kg) / 0.35));
  g.save(); g.translate(x, by); g.scale(0.85 + 0.15 * gp, 0.85 + 0.15 * gp);
  rr(-130, -70, 260, 140, 24); g.fillStyle = gc; g.shadowColor = rgba(gc.length === 7 ? gc : '#E5484D', 0.45); g.shadowBlur = 24; g.fill(); g.shadowBlur = 0;
  g.letterSpacing = '3px'; txt('NOTA', 0, -32, 26, 'rgba(255,255,255,0.85)', 400, 'center', 'Bebas'); g.letterSpacing = '0px';
  if (fail && n > 0) txt('SUSPENSO', 0, 42, 58, '#FFFFFF', 400, 'center', 'Bebas');
  else if (fail) txt('—', 0, 42, 70, '#FFFFFF', 400, 'center', 'Bebas');
  else txt(String(gr), 0, 50, 92, '#FFFFFF', 400, 'center', 'Bebas');
  g.restore();
  g.restore();
}
function scaleBar(t, P) {                                    // escala 0 → 30 con los umbrales de la tabla (hombres y mujeres)
  const a = eo(prog(t, PB.mira + 0.15, 0.4)) * (1 - prog(t, PB.cuantas ?? PB.marca, 0.3));
  if (a <= 0) return;
  const T = PB.T, x0 = 90, x1 = 990, y = 1545, X = n => lerp(x0, x1, n / 30);
  const n = P.count ?? 0;
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(255,255,255,0.6)'; rr(x0 - 30, y - 110, x1 - x0 + 60, 210, 22); g.fill();
  rr(x0, y - 14, x1 - x0, 28, 14); g.fillStyle = 'rgba(27,29,34,0.10)'; g.fill();
  rr(x0, y - 14, X(Math.min(n, 30)) - x0 + 0.01, 28, 14); const fg = g.createLinearGradient(x0, 0, x1, 0);
  fg.addColorStop(0, BAD); fg.addColorStop(0.39, BAD); fg.addColorStop(0.4, OK_); fg.addColorStop(0.75, ORANGE); fg.addColorStop(1, '#D99A08');
  g.fillStyle = fg; g.fill();
  for (let i = 0; i < T.notas.length; i++) {
    const xm = X(T.hombres[i]), on = n >= T.hombres[i];
    g.fillStyle = on ? gradeColor(T.notas[i]) : 'rgba(27,29,34,0.35)';
    g.beginPath(); g.arc(xm, y, on ? 17 : 12, 0, 7); g.fill();
    txt(String(T.notas[i]), xm, y - 38, 40, on ? gradeColor(T.notas[i]) : INK2, 400, 'center', 'Bebas');
    txt(String(T.hombres[i]), xm, y + 54, 28, on ? INK : INK2, 700, 'center', 'SpaceMono');
    const on2 = n >= T.mujeres[i];
    txt(String(T.mujeres[i]), xm, y + 86, 28, on2 ? '#B0306A' : INK2, 700, 'center', 'SpaceMono');
  }
  txt('NOTA', x0 - 4, y - 74, 22, INK2, 700, 'left', 'SpaceMono');
  txt('HOMBRES', x0 - 4, y + 54, 22, INK2, 700, 'left', 'SpaceMono');
  txt('MUJERES', x0 - 4, y + 86, 22, '#B0306A', 700, 'left', 'SpaceMono');
  g.restore();
}
function speedTag(t) {                                       // aviso honesto de que la parte sin voz va acelerada
  const { d0, ends } = PB;
  const fast = t > ends[3] && t < ends[27];
  const a = (fast ? 1 : 0) * eo(prog(t, ends[3], 0.2)) * (1 - prog(t, ends[27] - 0.2, 0.2));
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = a;
  rr(70, 640, 150, 64, 32); g.fillStyle = 'rgba(27,29,34,0.85)'; g.fill();
  txt('▶▶ ×4', 145, 685, 36, '#FFFFFF', 400, 'center', 'Bebas');
  g.restore();
}
function stampSusp(t) {                                      // sello SUSPENSO en «suspendes»
  const t0 = PB.susp, a = prog(t, t0 - 0.04, 0.12) * (1 - prog(t, PB.mira - 0.1, 0.3));
  if (a <= 0) return;
  const s = lerp(1.8, 1, eo(prog(t, t0 - 0.04, 0.16)));
  g.save(); g.globalAlpha = a; g.translate(540, 980); g.rotate(-0.12); g.scale(s, s);
  g.strokeStyle = BAD; g.lineWidth = 12; rr(-300, -95, 600, 190, 22); g.stroke();
  g.lineWidth = 4; rr(-282, -77, 564, 154, 16); g.stroke();
  txt('SUSPENSO', 0, 46, 132, BAD, 400, 'center', 'Bebas');
  g.restore();
}
function techLabels(t, P, info) {                            // ✓ / ✗ de la técnica
  const items = [[PB.ojo, false, 'NO CUENTA', 'la barbilla no pasa la barra'], [PB.barb, true, 'CUENTA', 'barbilla por encima de la barra'],
    [PB.braz, true, 'CUENTA', 'brazos estirados del todo al bajar'], [PB.bal, false, 'NO CUENTA', 'sin balanceo ni patadas']];
  for (let i = 0; i < items.length; i++) {
    const [t0, ok, lab, sub] = items[i];
    if (t0 === undefined) continue;
    const end = i + 1 < items.length && items[i + 1][0] !== undefined ? items[i + 1][0] - 0.1 : (PB.cuantas ?? t0 + 2) - 0.1;
    const a = prog(t, t0 + 0.45, 0.2) * (1 - prog(t, end, 0.15));
    if (a <= 0) continue;
    const col = ok ? OK_ : BAD, x = 880, y = 820;
    const s = back(prog(t, t0 + 0.45, 0.35));
    g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.arc(0, -40, 74, 0, 7); g.fillStyle = col; g.shadowColor = rgba(col, 0.5); g.shadowBlur = 26; g.fill(); g.shadowBlur = 0;
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    if (ok) { g.moveTo(-32, -40); g.lineTo(-8, -16); g.lineTo(34, -62); } else { g.moveTo(-26, -66); g.lineTo(26, -14); g.moveTo(26, -66); g.lineTo(-26, -14); }
    g.stroke();
    txt(lab, 0, 90, 58, col, 400, 'center', 'Bebas');
    g.restore();
    // línea de referencia de la barra para la barbilla
    if (i <= 1) {
      g.save(); g.globalAlpha = a * 0.9; g.setLineDash([14, 10]); g.strokeStyle = col; g.lineWidth = 4;
      g.beginPath(); g.moveTo(BAR.x0 - 60, BAR.y - 2); g.lineTo(BAR.x1 + 60, BAR.y - 2); g.stroke(); g.setLineDash([]);
      g.restore();
    }
  }
}
function celebration(t) {                                    // explosión dorada al llegar al 10
  const t0 = PB.ends[29] - 0.58 * PB.durs[29] + 0.42 * PB.durs[29];
  const u = prog(t, t0, 1.1);
  if (u <= 0 || u >= 1) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const a = hash(i + 3) * Math.PI * 2, v = 300 + 700 * hash(i + 7);
    const x = 880 + Math.cos(a) * v * eo(u), y = 960 + Math.sin(a) * v * eo(u) + 400 * u * u;
    g.fillStyle = `rgba(255,${Math.round(190 + 60 * hash(i))},${Math.round(60 + 80 * hash(i + 1))},${(1 - u).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, 6 + 6 * hash(i + 9), 0, 7); g.fill();
  }
  glowAt(880, 960, 420, [255, 200, 80], 0.5 * (1 - u));
  g.restore();
}
function askYou(t) {                                         // «¿Y TÚ, CUÁNTAS?» + COMENTA TU NÚMERO
  const t0 = PB.cuantas; if (t0 === undefined) return;
  const a = prog(t, t0 - 0.05, 0.25) * (1 - prog(t, (CUE.compartir ?? t0 + 2) - 0.1, 0.3));
  if (a <= 0) return;
  const s = back(prog(t, t0 - 0.05, 0.4));
  g.save(); g.globalAlpha = a; g.translate(860, 820); g.scale(s, s);
  rr(-160, -150, 320, 300, 30); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill(); g.strokeStyle = ORANGE; g.lineWidth = 5; g.stroke();
  txt('¿Y TÚ?', 0, -50, 84, INK, 400, 'center', 'Bebas');
  const ca = prog(t, CUE.comenta ?? t0 + 0.8, 0.3);
  g.globalAlpha = a * ca;
  txt('COMENTA', 0, 34, 54, ORANGE, 400, 'center', 'Bebas');
  txt('TU NÚMERO', 0, 92, 48, ORANGE, 400, 'center', 'Bebas');
  const bob = 8 * Math.abs(Math.sin((t - (CUE.comenta ?? t0)) * 5));
  g.fillStyle = ORANGE; g.beginPath(); g.moveTo(-24, 118 + bob); g.lineTo(24, 118 + bob); g.lineTo(0, 146 + bob); g.closePath(); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- fotograma
window.renderAt = t => {
  g.setTransform(PR, 0, 0, PR, 0, 0);
  if (!PB) pbInit();
  const kM = eio(prog(t, PB.marca - 0.3, 0.6));             // estudio → brasas de la marca
  if (kM < 1) {
    studio(t); station();
    const P = pose(t);
    mannequin(t, P);
    header(t); scaleBar(t, P); speedTag(t); counter(t, P); stampSusp(t); techLabels(t, P); celebration(t); askYou(t);
    if (kM > 0) { g.save(); g.globalAlpha = kM; background(t); sparks(t); g.restore(); }
  } else { background(t); sparks(t); }
  share(t);
  closing(t);
  const pu = punch(t);
  if (pu > 0.01) { const fg = g.createRadialGradient(540, 900, 50, 540, 900, 1100); fg.addColorStop(0, `rgba(255,214,140,${(0.32 * pu).toFixed(3)})`); fg.addColorStop(1, 'rgba(255,140,40,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = fg; g.fillRect(0, 0, W, H); g.restore(); }
  const f = prog(t, END - 0.25, 0.25);
  if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
};
