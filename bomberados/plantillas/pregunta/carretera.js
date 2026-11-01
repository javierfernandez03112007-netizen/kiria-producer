// Fondo «carretera» e intro «pas» de la Pregunta del día (Bomberados). Se carga DESPUÉS de scene.js (index.html) y usa
// sus utilidades y variables: g, W, H, CUE, Q, END, clamp, prog, eo, eio, back, lerp, hash, rr, txt, rgba, background,
// sparks, ORANGE, TEAL, RED, GOLD, WHITE, DIM.
//
// Escena 2D con perspectiva de verdad (focal 1.400 px, cámara a la altura de los ojos del conductor): carretera mojada de
// noche con lluvia, relámpago en el primer fotograma, un coche accidentado con los intermitentes de emergencia (su ritmo
// es el de la cuenta atrás), frenazo con cabeceo y ABS, el herido dentro del coche (chip «1 HERIDO» con ECG) y una grúa
// de cámara que sube y se aleja para dejar sitio a la pregunta. En «Bomberados» la lluvia se para, da la vuelta y se
// convierte en brasas.
//
// Mundo en metros: X a la derecha, Y hacia arriba, Z hacia delante. La trasera del coche accidentado está en Z = 0.
// Línea de tiempo (en pregunta.json → cues): accidente (frenazo), herido (chip), enunciado (sube la cámara), instinto,
// cuenta (cuenta atrás: fija el ritmo de los intermitentes), marca (la lluvia se convierte en brasas).

const RF = 1400;                                   // focal (px)
const LANE = 3.5;                                  // carril (m)
const RAIL_X = 5.0, POST_X = -4.95;                // bionda a la derecha, hitos de arista a la izquierda
let RD = null;                                     // línea de tiempo (se calcula con los cues la primera vez)
let RDL = null;                                    // lo último que se dibujó (cámara, caja del coche, cabeza): para el HUD

// ---------------------------------------------------------------- utilidades de color
const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const rgbs = (c, a = 1) => `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${a.toFixed(3)})`;
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
function noise1(x, s = 0) { return 0.5 + 0.25 * Math.sin(x * 1.7 + s) + 0.15 * Math.sin(x * 3.9 + 2.1 * s + 1) + 0.1 * Math.sin(x * 8.3 + 3.7 * s + 2); }

// ---------------------------------------------------------------- línea de tiempo
function rdInit() {
  const tA = CUE.accidente - 0.04, Tb = 1.15, v0 = 20, gap = 5.6;   // 72 km/h; se para a 5,6 m del coche
  const zS = -gap, zA = zS - v0 * Tb / 2.3, z0 = zA - v0 * tA;
  const tc = CUE.cuenta, P = (CUE.letras[0] - 0.1 - tc) / 5;         // un parpadeo = un número de la cuenta atrás
  RD = { tA, Tb, v0, zS, zA, z0, tc, P, tQ: (CUE.herido ?? CUE.enunciado) + 0.05, tQd: 1.15, tM: CUE.marca };
  carPrecompute();
}
function carZ(t) {                                 // ojos del conductor de NUESTRO coche (Z)
  if (t < RD.tA) return RD.z0 + RD.v0 * t;
  const u = clamp((t - RD.tA) / RD.Tb);
  return RD.zA + RD.v0 * RD.Tb * (1 - Math.pow(1 - u, 2.3)) / 2.3;
}
function speed(t) { if (t < RD.tA) return RD.v0; return RD.v0 * Math.pow(1 - clamp((t - RD.tA) / RD.Tb), 1.3); }
function hazard(t) {                               // intermitentes de emergencia: 0..1 (LED: encendido casi instantáneo)
  const u = (((t - RD.tc) / RD.P) % 1 + 1) % 1;
  return clamp(u / 0.035) * (1 - clamp((u - 0.5) / 0.05));
}
function lightning(t) { return 0.85 * Math.exp(-t / 0.085) + 0.5 * Math.exp(-Math.pow((t - 0.2) / 0.045, 2)) + 0.22 * Math.exp(-Math.pow((t - 0.37) / 0.05, 2)); }
function tailFlicker(t) {                          // piloto roto: falso contacto
  const s = Math.floor(t * 23);
  return hash(s * 3.7) > 0.55 ? 0.15 + 0.85 * hash(s + 0.5) : 0.05;
}

// ---------------------------------------------------------------- cámara
function rdCam(t) {
  const k = eio(prog(t, RD.tQ, RD.tQd));           // 0 = ojos del conductor → 1 = grúa alta y atrás
  const zc = carZ(t), v = speed(t), drive = v / RD.v0;
  let pitch = 0;                                   // cabeceo del frenazo (px; positivo = el morro baja, el horizonte sube)
  if (t >= RD.tA) {
    const s = t - RD.tA;
    pitch = s < RD.Tb ? 40 * eo(clamp(s / 0.28)) : 40 * Math.exp(-(s - RD.Tb) / 0.22) * Math.cos((s - RD.Tb) * 9.5);
  }
  let sx = (Math.sin(t * 41) * 0.9 + Math.sin(t * 23.7 + 1.3) * 0.7) * drive * 1.4;   // vibración de la carretera
  let sy = (Math.sin(t * 37.3 + 0.4) + Math.sin(t * 19.1) * 0.8) * drive * 1.6;
  if (t > RD.tA && t < RD.tA + RD.Tb) {            // ABS
    const a = 3.6 * (1 - 0.5 * (t - RD.tA) / RD.Tb);
    sx += Math.sin(t * 96) * a; sy += Math.sin(t * 83 + 1) * a * 1.2;
  }
  sy += Math.exp(-Math.pow((t - RD.tA - RD.Tb) / 0.07, 2)) * 11 * Math.sin(t * 61);    // golpe al pararse
  const d = Math.max(0, t - RD.tQ - RD.tQd);
  const x = lerp(1.35, 0.5, k) + 0.3 * Math.sin(d * 0.42) * k;
  const h = lerp(1.2, 2.7, k) + 0.07 * Math.sin(d * 0.33) * k;
  const z = zc - 5.8 * k + 0.04 * d * k;
  const yaw = k * Math.atan2(1.85 - x, 1.9 - z) + (1 - k) * 0.006 * Math.sin(t * 0.9);
  const hor = lerp(800, 440, k) - pitch * (1 - k);
  const roll = k * 0.016 + (1 - k) * (0.004 * Math.sin(t * 1.3) + 0.01 * Math.exp(-Math.pow((t - RD.tA - RD.Tb) / 0.12, 2)));
  return { x, h, z, yaw, cs: Math.cos(yaw), sn: Math.sin(yaw), hor, f: RF, sx: sx * (1 - k), sy: sy * (1 - k), roll, k, v, zc };
}

// ---------------------------------------------------------------- proyección (con recorte en el plano cercano)
function toCam(C, X, Y, Z) { const dx = X - C.x, dz = Z - C.z; return [dx * C.cs - dz * C.sn, Y, dx * C.sn + dz * C.cs]; }
function projCam(C, p) { return [W / 2 + C.f * p[0] / p[2], C.hor + C.f * (C.h - p[1]) / p[2], p[2]]; }
function P3(C, X, Y, Z) { const p = toCam(C, X, Y, Z); return p[2] < 0.08 ? null : projCam(C, p); }
function clipPoly(C, pts, near = 0.12) {
  const cp = pts.map(p => toCam(C, p[0], p[1], p[2]));
  const out = [];
  for (let i = 0; i < cp.length; i++) {
    const a = cp[i], b = cp[(i + 1) % cp.length], ain = a[2] >= near, bin = b[2] >= near;
    if (ain) out.push(a);
    if (ain !== bin) { const u = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, near]); }
  }
  return out.map(p => projCam(C, p));
}
function path(sp) { g.beginPath(); sp.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); return sp.length > 2; }
const fogK = z => 1 - Math.exp(-z / 95);           // niebla y lluvia a lo lejos

// ---------------------------------------------------------------- nuestras luces de cruce
function beamAt(R, X, Y, Z) {                      // 0..1: cuánto ilumina el cruce de nuestro coche ese punto
  const dz = Z - (R.carZ + 1.95);
  if (dz < 0.3) return 0;
  const cx = R.carX + 0.25 + dz * 0.03, half = 1.25 + dz * 0.22;     // el cruce europeo se abre a la derecha
  const lat = Math.exp(-Math.pow((X - cx) / half, 2) * 1.6);
  const far = dz < 3 ? sstep(0.3, 3, dz) : Math.exp(-(dz - 3) / 30);
  const hgt = Math.exp(-Math.max(0, Y - (0.68 - dz * 0.01)) * 2.2);  // corte del haz: poco por encima de los faros
  return lat * far * hgt;
}

// ---------------------------------------------------------------- el coche accidentado (hatchback plateado)
const CAR = { x: 2.55, z: 0, yaw: -0.36, roll: 0.045 };
const CV = {                                       // vértices (x derecha, y arriba, z hacia delante; origen: trasera, suelo)
  RBLi: [-0.78, 0.30, 0.00], RBRi: [0.78, 0.30, 0.00], RTLi: [-0.76, 0.93, 0.05], RTRi: [0.76, 0.93, 0.05],   // portón
  RBLo: [-0.89, 0.30, 0.17], RBRo: [0.89, 0.30, 0.17], RTLo: [-0.87, 0.93, 0.21], RTRo: [0.87, 0.93, 0.21],   // tras el chaflán
  FBL: [-0.86, 0.30, 4.10], FBR: [0.86, 0.30, 4.10], FTL: [-0.82, 0.84, 3.98], FTR: [0.82, 0.84, 3.98],
  WFL: [-0.85, 0.90, 3.10], WFR: [0.85, 0.90, 3.10],
  RRL: [-0.63, 1.43, 0.64], RRR: [0.63, 1.43, 0.64], RFL: [-0.67, 1.45, 2.30], RFR: [0.67, 1.45, 2.30],
};
const CF = [                                       // caras: [nombre, vértices, normal (coche), tipo] (en orden de dibujo)
  ['rear', ['RBLi', 'RBRi', 'RTRi', 'RTLi'], [0, 0.08, -1], 'paint'],
  ['chL', ['RBLo', 'RBLi', 'RTLi', 'RTLo'], [-0.82, 0.05, -0.57], 'paint'],
  ['chR', ['RBRi', 'RBRo', 'RTRo', 'RTRi'], [0.82, 0.05, -0.57], 'paint'],
  ['left', ['RBLo', 'RTLo', 'WFL', 'FTL', 'FBL'], [-1, 0, 0], 'paint'],
  ['right', ['RBRo', 'FBR', 'FTR', 'WFR', 'RTRo'], [1, 0, 0], 'paint'],
  ['front', ['FBL', 'FTL', 'FTR', 'FBR'], [0, 0.15, 1], 'paint'],
  ['hood', ['WFL', 'WFR', 'FTR', 'FTL'], [0, 1, 0.08], 'paint'],
  ['shL', ['RTLo', 'RTLi', 'WFL'], [0, 1, 0], 'paint'],
  ['shR', ['RTRi', 'RTRo', 'WFR'], [0, 1, 0], 'paint'],
  ['rwin', ['RTLi', 'RTRi', 'RRR', 'RRL'], [0, 0.75, -0.66], 'rearglass'],
  ['roof', ['RRL', 'RRR', 'RFR', 'RFL'], [0, 1, 0.01], 'paint'],
  ['wind', ['RFL', 'RFR', 'WFR', 'WFL'], [0, 0.82, 0.57], 'glass'],
  ['lside', ['RTLi', 'RRL', 'RFL', 'WFL'], [-0.94, 0.35, -0.03], 'cabinL'],
  ['rside', ['RTRi', 'WFR', 'RFR', 'RRR'], [0.94, 0.35, -0.03], 'cabinR'],
];
const PAINT = [0.55, 0.59, 0.64];                  // plata
function carW(x, y, z) {                           // coche → mundo (balanceo + giro)
  const cr = Math.cos(CAR.roll), sr = Math.sin(CAR.roll);
  const xr = x * cr + y * sr, yr = y * cr - x * sr + 0.89 * sr;
  const cy = Math.cos(CAR.yaw), sy = Math.sin(CAR.yaw);
  return [CAR.x + xr * cy + z * sy, yr, CAR.z - xr * sy + z * cy];
}
function carN(n) {                                 // normal del coche → mundo
  const cr = Math.cos(CAR.roll), sr = Math.sin(CAR.roll);
  const xr = n[0] * cr + n[1] * sr, yr = n[1] * cr - n[0] * sr;
  const cy = Math.cos(CAR.yaw), sy = Math.sin(CAR.yaw);
  const v = [xr * cy + n[2] * sy, yr, -xr * sy + n[2] * cy], l = Math.hypot(...v);
  return v.map(c => c / l);
}
let CW_ = null;                                    // vértices y luces en mundo (el coche no se mueve)
function carPrecompute() {
  CW_ = { v: {}, f: [] };
  for (const [k, p] of Object.entries(CV)) CW_.v[k] = carW(...p);
  for (const [name, vs, n, type] of CF) {
    const pts = vs.map(k => CW_.v[k]);
    const c = [0, 1, 2].map(i => pts.reduce((s, p) => s + p[i], 0) / pts.length);
    CW_.f.push({ name, vs, pts, n: carN(n), c, type });
  }
  const rz = y => 0.05 * (y - 0.30) / 0.63 - 0.006;                // z del portón a la altura y
  CW_.rz = rz;
  CW_.lights = {                                   // luces (mundo)
    ambL: carW(-0.50, 0.79, rz(0.79)), ambR: carW(0.50, 0.79, rz(0.79)),           // intermitentes traseros
    redL: carW(-0.68, 0.79, rz(0.79)), redR: carW(0.68, 0.79, rz(0.79)),           // pilotos (el derecho, roto)
    rep: carW(-0.9, 0.78, 3.25),                                                     // repetidor lateral izquierdo
    frL: carW(-0.7, 0.68, 4.12), frR: carW(0.7, 0.68, 4.12),                         // intermitentes delanteros (no se ven)
    head: carW(-0.36, 1.13, 1.95),                                                   // cabeza del conductor herido
    steam: carW(-0.15, 0.95, 3.55),
  };
}

// ---------------------------------------------------------------- capas del mundo
function skyLayer(R) {
  const { C, L } = R, hor = C.hor;
  const top = mixc([3, 5, 10], [44, 56, 84], L), mid = mixc([8, 11, 19], [78, 92, 122], L), low = mixc([20, 22, 30], [132, 142, 162], L);
  const sg = g.createLinearGradient(0, hor - 1150, 0, hor + 8);
  sg.addColorStop(0, rgbs(top)); sg.addColorStop(0.72, rgbs(mid)); sg.addColorStop(1, rgbs(low));
  g.fillStyle = sg; g.fillRect(-80, -80, W + 160, hor + 90);
  const vx = W / 2 - C.f * Math.tan(C.yaw);        // punto de fuga
  // resplandor de un pueblo lejano
  const px = vx - 300, pg = g.createRadialGradient(px, hor, 10, px, hor, 560);
  pg.addColorStop(0, 'rgba(130,78,44,0.24)'); pg.addColorStop(1, 'rgba(130,78,44,0)');
  g.fillStyle = pg; g.fillRect(px - 560, hor - 560, 1120, 580);
  // nubes bajas: casi invisibles, se encienden con el relámpago
  for (let i = 0; i < 8; i++) {
    const ang = (hash(i + 3) - 0.5) * 1.4 + R.t * 0.004 * (1 + hash(i + 9));
    const cx = W / 2 + C.f * Math.tan(ang - C.yaw), cy = hor - 90 - 620 * hash(i + 5) * (1 - 0.35 * C.k);
    const rx = 380 + 420 * hash(i + 7), ry = rx * (0.22 + 0.12 * hash(i + 11));
    const a = 0.10 + 0.65 * L * (0.5 + 0.5 * hash(i + 13));
    g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
    const cg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    const cc = mixc([30, 36, 50], [175, 185, 210], L);
    cg.addColorStop(0, rgbs(cc, a)); cg.addColorStop(1, rgbs(cc, 0));
    g.fillStyle = cg; g.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    g.restore();
  }
}

function terrain(R) {                              // colinas y arboleda a lo lejos (en el infinito: solo las mueve el giro)
  const { C, L } = R, hor = C.hor;
  for (const [s, hgt, col] of [[1.3, 46, mixc([9, 11, 16], [40, 46, 60], L)], [4.1, 24, mixc([5, 7, 10], [16, 18, 24], L)]]) {
    g.beginPath(); g.moveTo(-100, hor + 4);
    for (let x = -100; x <= W + 100; x += 18) {
      const a = Math.atan((x - W / 2) / C.f) + C.yaw;
      g.lineTo(x, hor - 4 - hgt * noise1(a * 9, s) - 10 * Math.pow(noise1(a * 31, s + 2), 3));
    }
    g.lineTo(W + 100, hor + 4); g.closePath(); g.fillStyle = rgbs(col); g.fill();
  }
}

function ground(R) {
  const { C, L } = R, hor = C.hor;
  const gg = g.createLinearGradient(0, hor, 0, H + 60);
  gg.addColorStop(0, rgbs(mixc([10, 12, 16], [40, 46, 56], L))); gg.addColorStop(0.25, rgbs(mixc([6, 8, 9], [26, 30, 32], L))); gg.addColorStop(1, rgbs(mixc([8, 10, 9], [30, 34, 34], L)));
  g.fillStyle = gg; g.fillRect(-80, hor, W + 160, H - hor + 120);
}

function roadSurface(R) {
  const { C, L } = R;
  const sp = clipPoly(C, [[-4.7, 0, C.z - 30], [5.1, 0, C.z - 30], [5.1, 0, C.z + 1200], [-4.7, 0, C.z + 1200]]);
  if (!path(sp)) return;
  const rg = g.createLinearGradient(0, C.hor, 0, H);
  // asfalto mojado: brilla cerca del horizonte (refleja el cielo) y es casi negro cerca
  rg.addColorStop(0, rgbs(mixc([46, 50, 60], [150, 158, 175], L)));
  rg.addColorStop(0.035, rgbs(mixc([22, 24, 30], [90, 96, 108], L)));
  rg.addColorStop(0.2, rgbs(mixc([13, 14, 17], [52, 56, 62], L)));
  rg.addColorStop(1, rgbs(mixc([16, 17, 20], [44, 46, 50], L)));
  g.fillStyle = rg; g.fill();
}

function beamFootprint(R) {                        // la luz de nuestros faros sobre el asfalto mojado (y la sombra del coche)
  const { C } = R;
  const cz = R.carZ + 1.95;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [Z, w, a] of [[3.2, 1.5, 0.13], [5, 2.0, 0.17], [7.5, 2.6, 0.17], [11, 3.3, 0.14], [16, 4.2, 0.1], [23, 5.2, 0.06], [33, 6.5, 0.035]]) {
    const X = R.carX + 0.3 + (Z - 3) * 0.03;
    const p = P3(C, X, 0, cz + Z); if (!p) continue;
    const rx = C.f * w / p[2], ry = Math.max(4, C.f * C.h * w / (p[2] * p[2]) * 1.15);
    const gg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gg.addColorStop(0, `rgba(255,236,208,${a})`); gg.addColorStop(0.55, `rgba(255,232,200,${(a * 0.45).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,230,200,0)');
    g.save(); g.translate(p[0], p[1]); g.scale(1, ry / rx); g.fillStyle = gg; g.fillRect(-rx, -rx, 2 * rx, 2 * rx); g.restore();
  }
  g.restore();
  // sombra del coche accidentado: tapa el haz hacia delante
  const hl = [R.carX, cz];
  let lo = null, hi = null;
  for (const k of ['RBLo', 'RBRo', 'RBLi', 'RBRi', 'FBL', 'FBR']) {
    const p = CW_.v[k], a = Math.atan2(p[0] - hl[0], p[2] - hl[1]);
    if (!lo || a < lo.a) lo = { a, p }; if (!hi || a > hi.a) hi = { a, p };
  }
  const far = (q, a) => [q[0] + Math.sin(a) * 90, 0, q[2] + Math.cos(a) * 90];
  const sh = clipPoly(C, [[lo.p[0], 0, lo.p[2]], [hi.p[0], 0, hi.p[2]], far(hi.p, hi.a), far(lo.p, lo.a)]);
  if (path(sh)) { g.fillStyle = 'rgba(11,12,15,0.8)'; g.fill(); }
}

function markings(R) {                             // líneas blancas: bordes continuos y eje discontinuo (3,5 m + 9 m)
  const { C, L } = R;
  const paint = (X, z0, z1, w) => {
    const sp = clipPoly(C, [[X - w, 0.003, z0], [X + w, 0.003, z0], [X + w, 0.003, z1], [X - w, 0.003, z1]]);
    if (!path(sp)) return;
    const zm = (z0 + z1) / 2, dz = Math.max(0.5, zm - C.z);
    const b = clamp(0.07 + beamAt(R, X, 0, zm) * 1.1 + L * 0.55) * (1 - 0.85 * fogK(dz));
    g.fillStyle = rgbs([230 * b + 6, 232 * b + 7, 236 * b + 9]); g.fill();
  };
  const z0 = C.z - 6;
  for (let z = Math.floor(z0 / 4) * 4; z < C.z + 260; z += 4) { paint(-3.6, z, z + 4, 0.06); paint(3.6, z, z + 4, 0.075); }
  const per = 12.5;
  for (let z = Math.floor(z0 / per) * per; z < C.z + 260; z += per) paint(0, z, z + 3.5, 0.06);
}

function lightList(R) {                            // focos de luz de la escena (para reflejos, halos y lluvia)
  const Lg = CW_.lights, hz = R.hz;
  return [
    { p: Lg.ambL, col: [255, 150, 30], i: hz * 1.0, r: 0.5 },
    { p: Lg.ambR, col: [255, 150, 30], i: hz * 1.0, r: 0.5 },
    { p: Lg.rep, col: [255, 150, 30], i: hz * 0.45, r: 0.25 },
    { p: Lg.redL, col: [255, 30, 26], i: 0.42, r: 0.35 },
    { p: Lg.redR, col: [255, 30, 26], i: 0.42 * R.tail, r: 0.35 },
  ];
}

function wetReflections(R) {                       // en el asfalto mojado cada luz deja estelas verticales rotas hacia la cámara
  const { C, t } = R;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const s of lightList(R)) {
    if (s.i < 0.02) continue;
    const pg = P3(C, s.p[0], 0, s.p[2]), pm = P3(C, s.p[0], -s.p[1], s.p[2]);
    if (!pg || !pm) continue;
    const k = C.f / pg[2];
    const len = (pm[1] - pg[1]) * 2.4 + 24, wdt = Math.max(3, k * 0.09);
    for (let j = 0; j < 7; j++) {
      const off = (j - 3) / 3, x = pg[0] + off * wdt + Math.sin(t * 5.3 + j * 1.9) * wdt * 0.12;
      const fl = 0.55 + 0.45 * Math.sin(t * 7.1 + j * 2.3) * Math.sin(t * 3.3 + j);
      const a = s.i * 0.2 * (1 - Math.abs(off) * 0.6) * fl;
      const y0 = pg[1] + 2, y1 = pg[1] + len * (0.75 + 0.25 * hash(j + 3));
      const lg = g.createLinearGradient(0, y0, 0, y1);
      lg.addColorStop(0, rgbs(s.col, 0)); lg.addColorStop(0.1, rgbs(s.col, a)); lg.addColorStop(0.4, rgbs(s.col, a * 0.4)); lg.addColorStop(1, rgbs(s.col, 0));
      g.strokeStyle = lg; g.lineWidth = Math.max(1, wdt * 0.28);
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x + Math.sin(t * 2 + j) * 2, y1); g.stroke();
    }
    const pr = k * 1.3;                            // charco de luz alrededor
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, pr);
    rg.addColorStop(0, rgbs(s.col, 0.09 * s.i)); rg.addColorStop(1, rgbs(s.col, 0));
    g.save(); g.translate(pg[0], pg[1]); g.scale(1, 0.28); g.fillStyle = rg; g.fillRect(-pr, -pr, 2 * pr, 2 * pr); g.restore();
  }
  g.restore();
}

function splashes(R) {                             // gotas que rebotan en el asfalto (se ven en el haz)
  const { C, t } = R;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 1.4;
  for (let i = 0; i < 90; i++) {
    const P = 0.22 + 0.2 * hash(i + 401), age = (t + hash(i + 402) * P) % P, k = age / P;
    const n = Math.floor((t + hash(i + 402) * P) / P);
    const X = R.carX - 2.5 + 7.5 * hash(i * 7 + n * 13.1), Z = R.carZ + 3 + 26 * Math.pow(hash(i * 11 + n * 5.3), 1.4);
    const b = beamAt(R, X, 0, Z) * 1.4 + R.L * 0.6;
    if (b < 0.05) continue;
    const p = P3(C, X, 0, Z); if (!p) continue;
    const r = C.f * (0.02 + 0.07 * k) / p[2];
    g.strokeStyle = `rgba(220,232,245,${(0.55 * b * (1 - k)).toFixed(3)})`;
    g.beginPath(); g.ellipse(p[0], p[1], r, r * 0.3, 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- arcén: bionda (derecha), hitos (izquierda), árboles
function roadsideItems(R) {
  const { C } = R, items = [];
  for (let z = Math.floor((C.z - 4) / 4) * 4; z < C.z + 170; z += 4) items.push({ z: z + 2, kind: 'rail', z0: z });
  for (let z = Math.floor((C.z - 10) / 25) * 25 + 7; z < C.z + 320; z += 25) items.push({ z, kind: 'hito' });
  return items.sort((a, b) => b.z - a.z);
}

function drawItem(R, it) {
  const { C, L } = R;
  const dz = it.z - C.z;
  if (dz < 0.2) return;
  const fog = fogK(dz);
  if (it.kind === 'rail') {
    const z0 = it.z0, z1 = z0 + 4;
    // poste
    const pp = clipPoly(C, [[RAIL_X + 0.05, 0, z0], [RAIL_X + 0.05, 0.62, z0], [RAIL_X + 0.17, 0.62, z0], [RAIL_X + 0.17, 0, z0]]);
    if (path(pp)) { g.fillStyle = rgbs(mixc([20, 22, 26], [16, 18, 22], fog)); g.fill(); }
    // la bionda (cara hacia la carretera) con un brillo arriba
    const b = clamp(0.05 + beamAt(R, RAIL_X, 0.7, it.z) * 0.95 + L * 0.6 + ambAt(R, RAIL_X, 0.7, it.z) * 0.5);
    const sp = clipPoly(C, [[RAIL_X, 0.55, z0], [RAIL_X, 0.86, z0], [RAIL_X, 0.86, z1], [RAIL_X, 0.55, z1]]);
    if (path(sp)) {
      const base = mixc([150 * b + 10, 158 * b + 11, 168 * b + 13], [14, 18, 24], fog);
      const amb = ambAt(R, RAIL_X, 0.7, it.z);
      g.fillStyle = rgbs([base[0] + 120 * amb, base[1] + 60 * amb, base[2] + 8 * amb]); g.fill();
      const mid = clipPoly(C, [[RAIL_X - 0.01, 0.69, z0], [RAIL_X - 0.01, 0.73, z0], [RAIL_X - 0.01, 0.73, z1], [RAIL_X - 0.01, 0.69, z1]]);
      if (path(mid)) { g.fillStyle = rgbs(mixc([base[0] * 0.45, base[1] * 0.45, base[2] * 0.45], [14, 18, 24], fog * 0.5)); g.fill(); }
    }
    // captafaro (cada 8 m): retrorreflectante, se enciende con nuestros faros
    if (Math.round(z0 / 4) % 2 === 0) {
      const p = P3(C, RAIL_X - 0.02, 0.76, z0 + 0.1);
      if (p) {
        const e = clamp(beamAt(R, RAIL_X, 0.7, z0) * 2.6 + 0.04) * (1 - fog * 0.6);
        const s = Math.max(1.2, C.f * 0.05 / p[2]);
        g.fillStyle = `rgba(255,${Math.round(150 + 60 * e)},${Math.round(40 + 40 * e)},${(0.35 + 0.65 * e).toFixed(3)})`;
        g.fillRect(p[0] - s, p[1] - s * 0.8, 2 * s, 1.6 * s);
        if (e > 0.12) glowAt(p[0], p[1], s * 6 + 4, [255, 160, 50], 0.35 * e);
      }
    }
  } else if (it.kind === 'hito') {
    const z = it.z, X = POST_X;
    const b = clamp(0.06 + beamAt(R, X, 0.6, z) * 1.2 + L * 0.6);
    const body = clipPoly(C, [[X - 0.07, 0, z], [X - 0.07, 1.0, z], [X + 0.07, 1.0, z], [X + 0.07, 0, z]]);
    if (path(body)) { g.fillStyle = rgbs(mixc([215 * b + 8, 215 * b + 8, 210 * b + 8], [14, 18, 24], fog)); g.fill(); }
    const band = clipPoly(C, [[X - 0.072, 0.62, z], [X - 0.072, 0.84, z], [X + 0.072, 0.84, z], [X + 0.072, 0.62, z]]);
    if (path(band)) { g.fillStyle = rgbs(mixc([8, 8, 9], [14, 18, 24], fog)); g.fill(); }
    const p = P3(C, X + 0.075, 0.73, z);
    if (p) {
      const e = clamp(beamAt(R, X, 0.7, z) * 3 + 0.05) * (1 - fog * 0.6), s = Math.max(1, C.f * 0.035 / p[2]);
      g.fillStyle = `rgba(235,240,255,${(0.3 + 0.7 * e).toFixed(3)})`; g.fillRect(p[0] - s * 0.6, p[1] - s * 1.4, s * 1.2, s * 2.8);
      if (e > 0.15) glowAt(p[0], p[1], s * 7 + 4, [210, 225, 255], 0.3 * e);
    }
  }
}
function ambAt(R, X, Y, Z) {                        // luz ámbar de los intermitentes en un punto (decae con la distancia)
  if (R.hz < 0.01) return 0;
  const a = CW_.lights.ambL, b = CW_.lights.ambR;
  const d = Math.min(Math.hypot(X - a[0], Y - a[1], Z - a[2]), Math.hypot(X - b[0], Y - b[1], Z - b[2]));
  return R.hz * 1.6 / (1 + d * d * 0.35);
}
function glowAt(x, y, r, col, a) {
  if (a <= 0.004 || r < 1) return;
  const gg = g.createRadialGradient(x, y, 0, x, y, r);
  gg.addColorStop(0, rgbs(col, a)); gg.addColorStop(0.4, rgbs(col, a * 0.35)); gg.addColorStop(1, rgbs(col, 0));
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gg; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}

// ---------------------------------------------------------------- vapor que sale del capó (iluminado por los intermitentes)
function steam(R) {
  const { C, t } = R, e = CW_.lights.steam;
  for (let i = 0; i < 46; i++) {
    const Pp = 3.4, age = (t + hash(i + 501) * Pp) % Pp, k = age / Pp;
    const X = e[0] + (hash(i + 502) - 0.5) * 0.5 + (0.35 + 0.3 * hash(i + 503)) * age + 0.12 * Math.sin(age * 2 + i);
    const Y = e[1] + 0.05 + 0.55 * age + 0.05 * age * age;
    const Z = e[2] + (hash(i + 504) - 0.5) * 0.6 + 0.25 * age;
    const p = P3(C, X, Y, Z); if (!p) continue;
    const r = C.f * (0.18 + 0.42 * k) / p[2];
    const fl = R.hz * 0.9 * (1 - k * 0.5) + R.L * 0.6;
    const a = (0.16 + 0.1 * hash(i + 505)) * Math.sin(Math.PI * Math.min(1, k * 1.15));
    const col = [70 + 150 * fl, 76 + 90 * fl, 86 + 20 * fl];
    const sg = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
    sg.addColorStop(0, rgbs(col, a)); sg.addColorStop(1, rgbs(col, 0));
    g.fillStyle = sg; g.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r);
  }
}

// ---------------------------------------------------------------- el coche
function quadPt(q, u, v) {                         // punto (u, v) de un cuadrilátero [a (0,0), b (1,0), c (1,1), d (0,1)] (mundo)
  const [a, b, c, d] = q;
  const p = i => lerp(lerp(a[i], b[i], u), lerp(d[i], c[i], u), v);
  return [p(0), p(1), p(2)];
}
function drawCar(R) {
  const { C } = R, V = CW_.v;
  const visible = f => (C.x - f.c[0]) * f.n[0] + (C.h - f.c[1]) * f.n[1] + (C.z - f.c[2]) * f.n[2] > 0;
  // sombra de contacto
  for (const [m, a] of [[0.16, 0.22], [0.08, 0.3], [0, 0.45]]) {
    const sh = clipPoly(C, [carW(-0.92 - m, 0.002, 0.05 - m), carW(0.92 + m, 0.002, 0.05 - m), carW(0.9 + m, 0.002, 4.05 + m), carW(-0.9 - m, 0.002, 4.05 + m)]);
    if (path(sh)) { g.fillStyle = `rgba(2,2,3,${a})`; g.fill(); }
  }
  // ruedas traseras (se ven por debajo del paragolpes)
  for (const s of [-1, 1]) {
    const tq = clipPoly(C, [carW(s * 0.68, 0, 0.7), carW(s * 0.9, 0, 0.7), carW(s * 0.9, 0.33, 0.7), carW(s * 0.68, 0.33, 0.7)]);
    if (path(tq)) { g.fillStyle = '#060607'; g.fill(); }
  }
  const bbox = [1e9, 1e9, -1e9, -1e9];
  const grow = sp => { for (const p of sp) { bbox[0] = Math.min(bbox[0], p[0]); bbox[1] = Math.min(bbox[1], p[1]); bbox[2] = Math.max(bbox[2], p[0]); bbox[3] = Math.max(bbox[3], p[1]); } };
  for (const f of CW_.f) {
    if (!visible(f)) continue;
    const sp = clipPoly(C, f.pts);
    if (!path(sp)) continue;
    grow(sp);
    // degradado entre el punto más alto y el más bajo de la cara, cada uno con su luz
    const yMax = Math.max(...f.pts.map(p => p[1])), yMin = Math.min(...f.pts.map(p => p[1]));
    const avg = sel => { const q = f.pts.filter(sel); return [0, 1, 2].map(i => q.reduce((s, p) => s + p[i], 0) / q.length); };
    const Ptop = avg(p => p[1] > yMax - 0.05), Pbot = avg(p => p[1] < yMin + 0.05);
    const st = P3(C, ...Ptop), sb = P3(C, ...Pbot);
    const ambK = f.name === 'rear' ? 0.12 : 0.06;
    if (f.type === 'paint') {
      const ct = shadeAt(R, f.n, Ptop, PAINT, ambK), cb = shadeAt(R, f.n, Pbot, PAINT, ambK);
      const gg = st && sb && Math.abs(sb[1] - st[1]) > 1 ? g.createLinearGradient(0, st[1], 0, sb[1]) : null;
      if (gg) {
        gg.addColorStop(0, rgbs([ct[0] * 1.25 + 8, ct[1] * 1.25 + 9, ct[2] * 1.25 + 12])); gg.addColorStop(0.5, rgbs([(ct[0] + cb[0]) * 0.5, (ct[1] + cb[1]) * 0.5, (ct[2] + cb[2]) * 0.5]));
        gg.addColorStop(1, rgbs([cb[0] * 0.8, cb[1] * 0.8, cb[2] * 0.8]));
        g.fillStyle = gg;
      } else g.fillStyle = rgbs(ct);
      g.fill();
      g.strokeStyle = rgbs([ct[0] * 1.5 + 22, ct[1] * 1.5 + 24, ct[2] * 1.5 + 28], 0.45); g.lineWidth = 1.3; g.stroke();
    } else if (f.type === 'cabinL' || f.type === 'cabinR') {
      const pc = shadeAt(R, f.n, f.c, PAINT, ambK);
      g.fillStyle = rgbs([pc[0] * 0.95, pc[1] * 0.95, pc[2] * 0.95]); g.fill();
      const q = f.vs.map(k => V[k]);
      const Q4 = [q[0], q[3], q[2], q[1]];          // [atrás-abajo, delante-abajo, delante-arriba, atrás-arriba]
      for (const [u0, u1, drv] of [[0.25, 0.555, false], [0.585, 0.95, true]]) {
        const wp = [quadPt(Q4, u0 + 0.06, 0.1), quadPt(Q4, u1, 0.1), quadPt(Q4, u1 - 0.03, 0.88), quadPt(Q4, u0 + 0.16, 0.88)];
        const ws = clipPoly(C, wp);
        if (!path(ws)) continue;
        const ys = ws.map(p => p[1]);
        const gl = g.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
        gl.addColorStop(0, rgbs([30 + 120 * R.L, 36 + 125 * R.L, 48 + 135 * R.L])); gl.addColorStop(1, '#06080b');
        g.fillStyle = gl; g.fill();
        if (drv && f.type === 'cabinL') driverInside(R, ws);
        g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2; g.stroke();
      }
    } else {
      const ct = shadeAt(R, f.n, Ptop, [0.10, 0.12, 0.15], 0.04);
      const gl = st && sb && Math.abs(sb[1] - st[1]) > 1 ? g.createLinearGradient(0, st[1], 0, sb[1]) : null;
      if (gl) { gl.addColorStop(0, rgbs([ct[0] + 30 + 100 * R.L, ct[1] + 34 + 105 * R.L, ct[2] + 44 + 110 * R.L])); gl.addColorStop(1, rgbs([ct[0] * 0.5 + 5, ct[1] * 0.5 + 6, ct[2] * 0.5 + 8])); g.fillStyle = gl; }
      else g.fillStyle = rgbs(ct);
      g.fill();
      if (f.type === 'rearglass') rearGlass(R, f);
    }
  }
  rearDetails(R, visible);
  sideDetails(R, visible);
  RDL.bbox = bbox;
  RDL.head = P3(C, ...CW_.lights.head);
}

function driverInside(R, ws) {                     // el conductor herido, con la cabeza caída, a contraluz del salpicadero
  const { C, t } = R, h = CW_.lights.head;
  g.save(); path(ws); g.clip();
  const dash = carW(-0.36, 0.95, 2.65), pd = P3(C, ...dash);
  if (pd) {
    const r = C.f * 0.6 / pd[2];
    glowAt(pd[0], pd[1], r, [70, 140, 210], 0.35);
    const bl = hazardDash(R);                      // testigo de emergencia en el salpicadero, al ritmo de los intermitentes
    glowAt(pd[0] + r * 0.2, pd[1], r * 0.5, [255, 60, 40], 0.4 * bl);
  }
  const p = P3(C, ...h);
  if (p) {
    const s = C.f / p[2];
    g.fillStyle = '#020203';
    g.save(); g.translate(p[0], p[1]); g.rotate(-0.55 + 0.03 * Math.sin(t * 1.1));
    g.beginPath(); g.ellipse(0, 0, 0.095 * s, 0.12 * s, 0, 0, Math.PI * 2); g.fill();            // cabeza
    g.fillRect(-0.05 * s, 0.05 * s, 0.1 * s, 0.18 * s);                                              // cuello
    g.beginPath(); g.ellipse(0.02 * s, 0.3 * s, 0.22 * s, 0.13 * s, 0.2, 0, Math.PI * 2); g.fill(); // hombros
    g.restore();
    // reposacabezas
    const hr = P3(C, ...carW(-0.36, 1.18, 1.62));
    if (hr) { const s2 = C.f / hr[2]; g.fillStyle = '#050608'; rr(hr[0] - 0.12 * s2, hr[1] - 0.09 * s2, 0.24 * s2, 0.17 * s2, 0.05 * s2); g.fill(); }
  }
  g.restore();
}
const hazardDash = R => R.hz;
function rearGlass(R, f) {                         // luna trasera rota: telaraña desde el golpe
  const { C } = R;
  const q = [f.pts[0], f.pts[1], f.pts[2], f.pts[3]];   // RTL(0,0) RTR(1,0) RRR(1,1) RRL(0,1)
  const sp = clipPoly(C, q);
  g.save(); path(sp); g.clip();
  // reflejo ámbar de los intermitentes en el cristal
  const pa = P3(C, ...quadPt(q, 0.2, 0.15)), pb = P3(C, ...quadPt(q, 0.8, 0.15));
  for (const pp of [pa, pb]) if (pp) glowAt(pp[0], pp[1], C.f * 0.5 / pp[2], [255, 140, 30], 0.25 * R.hz);
  const imp = [0.33, 0.48];
  const b = 0.22 + 0.4 * R.L + 0.25 * R.hz;
  g.lineWidth = 1.1; g.strokeStyle = `rgba(215,225,235,${b.toFixed(3)})`;
  g.beginPath();
  for (let i = 0; i < 17; i++) {                   // grietas radiales
    const a = i / 17 * Math.PI * 2 + hash(i + 601) * 0.3;
    let u = imp[0], v = imp[1];
    const p0 = P3(C, ...quadPt(q, u, v)); if (!p0) continue;
    g.moveTo(p0[0], p0[1]);
    for (let s = 1; s <= 6; s++) {
      u += Math.cos(a + (hash(i * 7 + s) - 0.5) * 0.5) * 0.11; v += Math.sin(a + (hash(i * 9 + s) - 0.5) * 0.5) * 0.2;
      const p1 = P3(C, ...quadPt(q, u, v)); if (p1) g.lineTo(p1[0], p1[1]);
    }
  }
  for (let ring = 1; ring <= 4; ring++) {          // anillos de la telaraña
    const rr_ = ring * 0.07;
    for (let i = 0; i <= 24; i++) {
      const a = i / 24 * Math.PI * 2, j = 1 + (hash(ring * 31 + i) - 0.5) * 0.4;
      const p1 = P3(C, ...quadPt(q, imp[0] + Math.cos(a) * rr_ * j, imp[1] + Math.sin(a) * rr_ * 1.8 * j));
      if (p1) i ? g.lineTo(p1[0], p1[1]) : g.moveTo(p1[0], p1[1]);
    }
  }
  g.stroke();
  const pi = P3(C, ...quadPt(q, imp[0], imp[1]));
  if (pi) glowAt(pi[0], pi[1], C.f * 0.12 / pi[2], [230, 240, 255], 0.35);
  g.restore();
}
function rearDetails(R, visible) {                 // pilotos (envuelven la esquina), intermitentes, matrícula sin números, paragolpes
  const { C } = R, rz = CW_.rz;
  const F = n => CW_.f.find(f => f.name === n);
  const rear = F('rear');
  const hz = R.hz;
  if (visible(rear)) {
    const quad = (x0, x1, y0, y1) => clipPoly(C, [carW(x0, y0, rz(y0) - 0.004), carW(x1, y0, rz(y0) - 0.004), carW(x1, y1, rz(y1) - 0.004), carW(x0, y1, rz(y1) - 0.004)]);
    const bb = beamAt(R, CAR.x, 0.4, 0);
    if (path(quad(-0.78, 0.78, 0.30, 0.47))) { g.fillStyle = rgbs([14 + 46 * bb, 15 + 46 * bb, 17 + 48 * bb]); g.fill(); }        // paragolpes
    if (path(quad(-0.78, 0.78, 0.465, 0.475))) { g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill(); }
    const pb = beamAt(R, CAR.x, 0.52, 0);
    if (path(quad(-0.26, 0.26, 0.50, 0.61))) { g.fillStyle = rgbs([60 + 160 * pb, 62 + 160 * pb, 66 + 156 * pb]); g.fill(); }        // matrícula
    if (path(quad(-0.26, -0.215, 0.50, 0.61))) { g.fillStyle = '#1D3D9A'; g.fill(); }
    for (let i = 0; i < 6; i++) { const x0 = -0.18 + i * 0.07; if (path(quad(x0, x0 + 0.045, 0.525, 0.585))) { g.fillStyle = rgbs([30, 32, 36], 0.35 + 0.25 * pb); g.fill(); } }
    for (const s of [-1, 1]) if (path(quad(s * 0.68 - 0.06, s * 0.68 + 0.06, 0.37, 0.405))) { const e = clamp(bb * 2.2); g.fillStyle = rgbs([110 + 145 * e, 10 + 20 * e, 10 + 20 * e]); g.fill(); }
    for (const s of [-1, 1]) {                     // grupo óptico: rojo por fuera, ámbar por dentro
      const red = s < 0 ? 1 : R.tail;
      const rq = quad(s < 0 ? -0.78 : 0.58, s < 0 ? -0.58 : 0.78, 0.70, 0.88);
      if (path(rq)) { g.fillStyle = rgbs([80 + 175 * red * 0.8, 8 + 22 * red, 8 + 18 * red]); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.stroke(); if (s > 0) brokenLens(R, rq); }
      const aq = quad(s < 0 ? -0.58 : 0.44, s < 0 ? -0.44 : 0.58, 0.72, 0.86);
      if (path(aq)) { g.fillStyle = rgbs([95 + 160 * hz, 48 + 158 * hz, 12 + 60 * hz]); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke(); }
    }
  }
  for (const [n, s] of [['chL', -1], ['chR', 1]]) {   // el piloto sigue por el chaflán
    const f = F(n); if (!visible(f)) continue;
    const q = [CW_.v[s < 0 ? 'RBLo' : 'RBRi'], CW_.v[s < 0 ? 'RBLi' : 'RBRo'], CW_.v[s < 0 ? 'RTLi' : 'RTRo'], CW_.v[s < 0 ? 'RTLo' : 'RTRi']];
    const red = s < 0 ? 1 : R.tail;
    const sp = clipPoly(C, [quadPt(q, 0.04, 0.63), quadPt(q, 0.96, 0.63), quadPt(q, 0.96, 0.92), quadPt(q, 0.04, 0.92)]);
    if (path(sp)) { g.fillStyle = rgbs([70 + 160 * red * 0.8, 6 + 20 * red, 6 + 16 * red]); g.fill(); }
    const bp = clipPoly(C, [quadPt(q, 0, 0), quadPt(q, 1, 0), quadPt(q, 1, 0.27), quadPt(q, 0, 0.27)]);
    if (path(bp)) { g.fillStyle = '#0f1013'; g.fill(); }
  }
  const rw = F('rwin');                            // tercera luz de freno (apagada)
  if (visible(rw)) {
    const q = rw.pts;
    const sp = clipPoly(C, [quadPt(q, 0.36, 0.9), quadPt(q, 0.64, 0.9), quadPt(q, 0.64, 0.97), quadPt(q, 0.36, 0.97)]);
    if (path(sp)) { g.fillStyle = '#3a0a0a'; g.fill(); }
  }
}

function brokenLens(R, sp) {                       // piloto derecho roto
  g.save(); path(sp); g.clip();
  g.strokeStyle = 'rgba(30,0,0,0.85)'; g.lineWidth = 2;
  const xs = sp.map(p => p[0]), ys = sp.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, w = Math.max(...xs) - Math.min(...xs);
  g.beginPath();
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + 0.4; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w * 0.7); }
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(cx - w * 0.1, cy, w * 0.22, 0, 7); g.fill();
  g.restore();
}
function sideDetails(R, visible) {                 // lateral izquierdo: ruedas con llanta, juntas de las puertas, retrovisor y repetidor
  const { C } = R;
  const left = CW_.f.find(f => f.name === 'left');
  if (!visible(left)) return;
  for (const zc of [0.78, 3.32]) {
    const ring = (r, x) => { const a = []; for (let i = 0; i < 30; i++) { const t = i / 30 * Math.PI * 2; a.push(carW(x, 0.31 + Math.sin(t) * r, zc + Math.cos(t) * r)); } return clipPoly(C, a); };
    if (path(ring(0.37, -0.892))) { g.fillStyle = '#040405'; g.fill(); }
    if (path(ring(0.31, -0.9))) { g.fillStyle = '#0B0B0D'; g.fill(); }
    const rb = clamp(0.1 + beamAt(R, CAR.x - 1, 0.3, zc) * 0.8 + R.L * 0.5 + ambAt(R, CAR.x - 1, 0.3, zc) * 0.25);
    const rim = ring(0.2, -0.905);
    if (path(rim)) {
      const ys = rim.map(p => p[1]);
      const lg = g.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
      lg.addColorStop(0, rgbs([170 * rb + 14, 176 * rb + 15, 184 * rb + 17])); lg.addColorStop(1, rgbs([70 * rb + 8, 72 * rb + 8, 76 * rb + 9]));
      g.fillStyle = lg; g.fill();
    }
    for (let k = 0; k < 5; k++) {                  // huecos entre radios
      const a0 = k / 5 * Math.PI * 2 + 0.3, pts = [];
      for (const [r, da] of [[0.07, -0.25], [0.17, -0.38], [0.17, 0.38], [0.07, 0.25]]) pts.push(carW(-0.907, 0.31 + Math.sin(a0 + da) * r, zc + Math.cos(a0 + da) * r));
      if (path(clipPoly(C, pts))) { g.fillStyle = '#050506'; g.fill(); }
    }
    const hub = ring(0.045, -0.908);
    if (path(hub)) { g.fillStyle = rgbs([120 * rb + 10, 124 * rb + 10, 130 * rb + 12]); g.fill(); }
  }
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.6;
  for (const z of [1.72, 2.92]) {
    const a = P3(C, ...carW(-0.893, 0.36, z)), b = P3(C, ...carW(-0.893, 0.92, z + 0.04));
    if (a && b) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  }
  for (const z of [1.45, 2.6]) {                   // manetas
    const a = P3(C, ...carW(-0.895, 0.80, z)), b = P3(C, ...carW(-0.895, 0.80, z + 0.16));
    if (a && b) { g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = Math.max(1.5, C.f * 0.025 / a[2]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  }
  const m = clipPoly(C, [carW(-0.86, 0.92, 2.9), carW(-1.06, 0.95, 2.95), carW(-1.06, 1.06, 2.92), carW(-0.86, 1.04, 2.85)]);
  if (path(m)) { g.fillStyle = '#16181c'; g.fill(); }
  const rp = P3(C, ...CW_.lights.rep);
  if (rp) { const s = Math.max(1.5, C.f * 0.03 / rp[2]); g.fillStyle = rgbs([110 + 145 * R.hz, 60 + 140 * R.hz, 10]); g.fillRect(rp[0] - s * 1.5, rp[1] - s * 0.6, s * 3, s * 1.2); }
}

function debris(R) {                               // cristales y trozos de piloto en el asfalto (destellan con los faros)
  const { C, t } = R;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 80; i++) {
    const X = 1.6 + 2.6 * hash(i + 701) + (hash(i + 702) - 0.5) * 0.8, Z = -2.6 + 3.2 * Math.pow(hash(i + 703), 0.7);
    const p = P3(C, X, 0.01, Z); if (!p) continue;
    const red = i % 9 === 0;
    const gl = Math.pow(Math.max(0, Math.sin(t * (0.6 + hash(i + 704)) + i * 1.7 + C.x * 4 + C.h * 3)), 10);
    const b = clamp(beamAt(R, X, 0.1, Z) * 1.3 + ambAt(R, X, 0, Z) * 0.5 + R.L * 0.5) * (0.25 + 0.75 * gl);
    if (b < 0.03) continue;
    const s = Math.max(0.8, C.f * 0.012 / p[2]);
    g.fillStyle = red ? `rgba(255,40,30,${(0.8 * b).toFixed(3)})` : `rgba(225,238,255,${(0.9 * b).toFixed(3)})`;
    g.fillRect(p[0] - s, p[1] - s * 0.5, 2 * s, s);
    if (gl > 0.6 && !red) { g.fillRect(p[0] - s * 4 * gl, p[1] - 0.5, s * 8 * gl, 1); g.fillRect(p[0] - 0.5, p[1] - s * 3 * gl, 1, s * 6 * gl); }
  }
  g.restore();
  for (const [x, z, w, rot] of [[2.2, -1.5, 0.2, 0.6], [3.3, -0.8, 0.14, -0.4], [1.5, -2.1, 0.11, 1.2], [2.7, -2.6, 0.09, 2.2]]) {
    const pts = [0, 1, 2, 3, 4].map(j => { const a = rot + j / 5 * 6.28; return [x + Math.cos(a) * w * (0.5 + 0.5 * hash(j + x)), 0.012, z + Math.sin(a) * w * 0.6]; });
    const sp = clipPoly(C, pts);
    if (path(sp)) { const b = beamAt(R, x, 0.1, z); g.fillStyle = rgbs([6 + 16 * b, 6 + 16 * b, 7 + 17 * b]); g.fill(); g.strokeStyle = rgbs([90 * b + 10, 92 * b + 10, 96 * b + 12], 0.6); g.lineWidth = 1; g.stroke(); }
  }
}

function lightGlows(R) {                           // halos (con lluvia hay mucho halo) y un destello horizontal corto
  const { C } = R;
  for (const s of lightList(R)) {
    if (s.i < 0.02) continue;
    const p = P3(C, ...s.p); if (!p) continue;
    const k = C.f / p[2], amber = s.col[1] > 100;
    glowAt(p[0], p[1], Math.max(14, k * (amber ? 0.6 : 0.38)), s.col, (amber ? 0.34 : 0.26) * s.i);
    glowAt(p[0], p[1], Math.max(5, k * 0.13), [255, 232, 196], (amber ? 0.75 : 0.45) * s.i);
    if (amber && s.i > 0.3) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const lw = Math.max(40, k * 1.5), th = Math.max(1.5, k * 0.012);
      const lg = g.createLinearGradient(p[0] - lw, 0, p[0] + lw, 0);
      lg.addColorStop(0, 'rgba(255,150,40,0)'); lg.addColorStop(0.5, `rgba(255,196,110,${(0.30 * s.i).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,150,40,0)');
      g.fillStyle = lg; g.fillRect(p[0] - lw, p[1] - th, 2 * lw, 2 * th);
      g.restore();
    }
  }
  for (const k of ['frL', 'frR']) {                // los intermitentes delanteros no se ven, pero tiñen el vapor y el arcén
    const p = P3(C, ...CW_.lights[k]); if (!p) continue;
    glowAt(p[0], p[1] - C.f * 0.35 / p[2], C.f * 1.6 / p[2], [255, 140, 30], 0.12 * R.hz);
  }
}

// ---------------------------------------------------------------- lluvia (y su transformación en brasas)
function rainClock(t) {                            // ∫ velocidad vertical: −1 = cae normal; en la marca se para y sube
  const t0 = RD.tM - 0.35;
  if (t <= t0) return -t;
  let s = -t0;
  const n = 40, dt = (t - t0) / n;
  for (let i = 0; i < n; i++) { const tt = t0 + (i + 0.5) * dt; s += (-1 + 1.13 * eio(prog(tt, t0, 0.85))) * dt; }
  return s;
}
function rain(R, kM) {
  const { C, t } = R;
  const fade = 1 - prog(t, RD.tM + 0.7, 0.9);
  if (fade <= 0) return;
  const sh = 0.03;                                 // «obturador»: largo de la estela
  const clock = rainClock(t), clockP = rainClock(t - sh);
  const vy = 9.5, BOXX = 16, BOXY = 7, BOXZ = 30;
  const zc = C.z, zcp = rdCamZ(t - sh);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 950; i++) {
    const x0 = hash(i + 801) * BOXX, y0 = hash(i + 802) * BOXY, z0 = Math.pow(hash(i + 803), 1.35) * BOXZ;
    const pos = (clk, cz, tt) => {
      const X = C.x - BOXX / 2 + (((x0 + 1.4 * tt) % BOXX) + BOXX) % BOXX;
      const Y = (((y0 + vy * clk) % BOXY) + BOXY) % BOXY;
      const Z = cz + 1.4 + (((z0 - cz) % BOXZ) + BOXZ) % BOXZ;
      return [X, Y, Z];
    };
    const a = pos(clock, zc, t), b = pos(clockP, zcp, t - sh);
    if (Math.abs(a[1] - b[1]) > 2.5 || Math.abs(a[2] - b[2]) > 2.5) continue;
    const p = P3(C, ...a), q = P3(C, ...b);
    if (!p || !q) continue;
    const lit = beamAt(R, a[0], Math.min(a[1], 0.9), a[2]) * 2.2 + ambAt(R, a[0], a[1], a[2]) * 0.9 + R.L * 0.9;
    const dz = p[2];
    const ember = hash(i + 805) < 0.3;              // en la marca, solo 3 de cada 10 gotas se vuelven brasa; el resto se apaga
    const keep = ember ? 1 : 1 - kM;
    if (keep <= 0.01) continue;
    const base = (0.13 + 0.62 * clamp(lit)) * (1 - fogK(dz) * 0.6) * fade * keep;
    const col = mixc(mixc([165, 185, 210], [255, 212, 160], clamp(lit * 0.6)), [255, 150 - 50 * hash(i), 40], ember ? kM : 0);
    const w = Math.max(0.8, C.f * 0.0065 / dz) * (1 + (ember ? 2.2 : 0) * kM);
    g.strokeStyle = rgbs(col, base * (0.45 + 0.55 * hash(i + 804)) * (1 + (ember ? 1.5 : 0) * kM));
    g.lineWidth = w;
    const wob = ember ? Math.sin(t * (3 + 3 * hash(i)) + i) * 6 * kM : 0;
    g.beginPath(); g.moveTo(q[0] + wob * 0.6, q[1]); g.lineTo(p[0] + wob, p[1]); g.stroke();
    if (ember && kM > 0.05) glowAt(p[0] + wob, p[1], w * 9, [255, 120, 30], 0.32 * kM * fade);
  }
  g.restore();
}

function rdCamZ(t) { const k = eio(prog(t, RD.tQ, RD.tQd)); const d = Math.max(0, t - RD.tQ - RD.tQd); return carZ(t) - 5.8 * k + 0.04 * d * k; }

// ---------------------------------------------------------------- dentro del coche: gotas en el parabrisas y velocímetro
function povLayer(R, a) {
  const { C, t } = R;
  const pov = (1 - C.k) * a;
  if (pov <= 0.01) return;
  // gotas en el parabrisas (desenfocadas): casi transparentes, con el borde y el brillo de las luces
  const hz = P3(C, ...CW_.lights.ambL);
  for (let i = 0; i < 46; i++) {
    const born = hash(i + 901) * 3.0 - 0.8;
    if (t < born) continue;
    const x = hash(i + 902) * W, y = 230 + hash(i + 903) * (H - 420);
    const r = 6 + 14 * Math.pow(hash(i + 904), 2);
    const slide = C.v > 4 ? (t - born) * (C.v / 20) * 30 * hash(i + 905) : 0;
    const yy = y - slide;
    const near = hz ? Math.exp(-Math.hypot(x - hz[0], yy - hz[1]) / 300) : 0;
    const lit = clamp(0.25 + R.L * 0.9 + near * R.hz * 1.3);
    const col = mixc([170, 190, 220], [255, 170, 70], clamp(near * R.hz * 1.6));
    const al = pov * clamp((t - born) * 4);
    const gg = g.createRadialGradient(x, yy, r * 0.45, x, yy, r);
    gg.addColorStop(0, rgbs(col, 0.03 * al)); gg.addColorStop(0.8, rgbs(col, 0.16 * al * lit)); gg.addColorStop(1, rgbs(col, 0));
    g.fillStyle = gg; g.beginPath(); g.arc(x, yy, r, 0, 7); g.fill();
    g.fillStyle = rgbs([255, 250, 240], 0.55 * al * lit); g.beginPath(); g.arc(x + r * 0.3, yy + r * 0.35, r * 0.13, 0, 7); g.fill();
  }
  // velocímetro proyectado en el parabrisas (HUD): 72 → 0 en el frenazo
  const sa = pov * (1 - prog(t, RD.tA + RD.Tb + 0.5, 0.4)) * eo(prog(t, 0.15, 0.3));
  if (sa > 0.01) {
    const kmh = Math.round(speed(t) * 3.6);
    g.save(); g.globalAlpha = sa;
    g.shadowColor = 'rgba(98,240,220,0.8)'; g.shadowBlur = 18;
    txt(String(kmh), 540, 1520, 120, '#CFFCF5', 400, 'center', 'Bebas');
    g.shadowBlur = 0;
    txt('km/h', 540, 1566, 30, 'rgba(207,252,245,0.75)', 700, 'center', 'SpaceMono');
    g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = 'rgba(207,252,245,0.15)';
    g.beginPath(); g.arc(540, 1500, 120, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.strokeStyle = speed(t) < 6 ? RED : '#7FF0E0';
    g.beginPath(); g.arc(540, 1500, 120, Math.PI * 1.15, Math.PI * (1.15 + 0.7 * speed(t) / 33)); g.stroke();
    g.restore();
  }
}

// ---------------------------------------------------------------- etalonaje: viñeta, relámpago, pulso rojo y grano
let GRAIN = null;
function grade(R, kM) {
  const { C, t } = R;
  const live = 1 - kM;
  if (live <= 0) return;
  // telón inferior para que se lean las tarjetas cuando sube la cámara
  if (C.k > 0) {
    const sg = g.createLinearGradient(0, 760, 0, H);
    sg.addColorStop(0, 'rgba(3,4,6,0)'); sg.addColorStop(0.25, `rgba(3,4,6,${(0.55 * C.k * live).toFixed(3)})`); sg.addColorStop(1, `rgba(3,4,6,${(0.8 * C.k * live).toFixed(3)})`);
    g.fillStyle = sg; g.fillRect(0, 760, W, H - 760);
  }
  const vg = g.createRadialGradient(W / 2, H * 0.45, 380, W / 2, H * 0.45, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${(0.62 * live).toFixed(3)})`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // relámpago: un velo frío
  if (R.L > 0.01) { g.fillStyle = `rgba(200,215,255,${(0.16 * R.L * live).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  // «el instinto te la juega»: pulso rojo en los bordes
  if (CUE.instinto !== undefined) {
    const p = Math.exp(-Math.pow((t - CUE.instinto - 0.15) / 0.22, 2)) + 0.5 * Math.exp(-Math.pow((t - CUE.instinto - 0.75) / 0.18, 2));
    if (p > 0.01) {
      const rg = g.createRadialGradient(W / 2, H * 0.55, 520, W / 2, H * 0.55, 1180);
      rg.addColorStop(0, 'rgba(255,20,20,0)'); rg.addColorStop(1, `rgba(210,12,12,${(0.42 * p * live).toFixed(3)})`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
  }
  // grano de película (precalculado)
  if (!GRAIN) {
    GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 256;
    const gc = GRAIN.getContext('2d'), id = gc.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (hash(i * 0.37) - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0);
  }
  g.save(); g.globalAlpha = 0.07 * live; g.globalCompositeOperation = 'overlay';
  const ox = Math.floor(hash(Math.floor(t * 60)) * 256), oy = Math.floor(hash(Math.floor(t * 60) + 0.5) * 256);
  g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.translate(-ox, -oy); g.fillRect(0, 0, W + 256, H + 256);
  g.restore();
}

// ---------------------------------------------------------------- fondo completo (lo llama renderAt)
function roadBackground(t) {
  if (!RD) rdInit();
  const C = rdCam(t);
  const R = { t, C, L: lightning(t), hz: hazard(t), carX: 1.75, carZ: C.zc, tail: tailFlicker(t) };
  RDL = { C, R };
  const kM = eio(prog(t, RD.tM - 0.35, 0.8));       // 0 carretera → 1 brasas
  const shake = () => { g.translate(W / 2 + C.sx, H / 2 + C.sy); g.rotate(C.roll); g.scale(1.035, 1.035); g.translate(-W / 2, -H / 2); };
  if (kM < 1) {
    g.save(); shake();
    skyLayer(R); terrain(R); ground(R); treeline(R); roadSurface(R); beamFootprint(R); markings(R); wetReflections(R); splashes(R);
    const items = roadsideItems(R);
    for (const it of items) if (it.z > 1) drawItem(R, it);
    steam(R);
    drawCar(R);
    for (const it of items) if (it.z <= 1) drawItem(R, it);
    debris(R);
    lightGlows(R);
    g.restore();
  }
  if (kM > 0) { g.save(); g.globalAlpha = kM; background(t); sparks(t); g.restore(); }
  g.save(); shake(); rain(R, kM); g.restore();
  if (kM < 1) povLayer(R, 1);
  grade(R, kM);
}

// ---------------------------------------------------------------- HUD de la intro «pas»: aviso → encuadre → «1 HERIDO»
function introPAS(t) {
  if (!RDL || !RDL.bbox) return;
  const { C } = RDL, bb = RDL.bbox;
  const out = 1 - prog(t, CUE.cuenta - 0.15, 0.35);
  if (out <= 0) return;
  const t1 = CUE.primero0 ?? 0.4;
  const lock = eio(prog(t, RD.tA - 0.02, 0.32));
  const cx = (bb[0] + bb[2]) / 2, top = bb[1];
  // 1) aviso de peligro sobre el coche a lo lejos, con la distancia que baja
  const wa = eo(prog(t, t1, 0.3)) * (1 - lock) * out;
  if (wa > 0.01) {
    const dist = Math.max(0, Math.round(-C.z - 0.0));
    const pop = back(prog(t, t1, 0.4)), pulse = 1 + 0.06 * Math.sin(t * 12);
    g.save(); g.globalAlpha = wa; g.translate(cx, top - 70); g.scale(pop * pulse, pop * pulse);
    g.beginPath(); g.moveTo(0, -40); g.lineTo(38, 26); g.lineTo(-38, 26); g.closePath();
    g.fillStyle = 'rgba(255,170,30,0.18)'; g.fill(); g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#FFB020'; g.shadowColor = 'rgba(255,170,30,0.9)'; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0;
    txt('!', 0, 18, 46, '#FFB020', 400, 'center', 'Bebas');
    g.restore();
    g.save(); g.globalAlpha = wa;
    g.setLineDash([6, 8]); g.strokeStyle = 'rgba(255,176,32,0.6)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, top - 26); g.lineTo(cx, top - 4); g.stroke(); g.setLineDash([]);
    txt(dist + ' m', cx, top - 128, 34, '#FFD27A', 700, 'center', 'SpaceMono');
    g.restore();
  }
  // 2) encuadre del accidente (se clava al frenar)
  if (lock > 0.01) {
    const pad = 22 * (1 + 1.2 * (1 - lock)), ex = (bb[2] - bb[0]) / 2 + pad, ey = (bb[3] - bb[1]) / 2 + pad, my = (bb[1] + bb[3]) / 2;
    const L = Math.min(ex, ey) * 0.38;
    g.save(); g.globalAlpha = lock * out * (0.75 + 0.25 * Math.sin(t * 9) * (1 - prog(t, RD.tA + 0.6, 0.3)));
    g.strokeStyle = ORANGE; g.lineWidth = 5; g.lineCap = 'round'; g.shadowColor = rgba(ORANGE, 0.8); g.shadowBlur = 14;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = cx + sx * ex, y = my + sy * ey;
      g.beginPath(); g.moveTo(x - sx * L, y); g.lineTo(x, y); g.lineTo(x, y - sy * L); g.stroke();
    }
    g.shadowBlur = 0;
    g.restore();
  }
  // 3) el herido: anillo rojo que late sobre su cabeza + chip «1 HERIDO» con electrocardiograma
  const th = CUE.herido;
  if (th !== undefined && RDL.head) {
    const ha = eo(prog(t, th - 0.05, 0.3)) * out;
    if (ha > 0.01) {
      const hp = RDL.head, bpm = t > (CUE.instinto ?? 1e9) ? 138 : 112, per = 60 / bpm;
      const ph = ((t - th) % per + per) % per / per, beat = Math.exp(-ph * 7);
      const rr0 = Math.max(10, C.f * 0.16 / hp[2]);
      g.save(); g.globalAlpha = ha;
      g.strokeStyle = RED; g.lineWidth = 3; g.shadowColor = 'rgba(255,60,60,0.9)'; g.shadowBlur = 16;
      g.beginPath(); g.arc(hp[0], hp[1], rr0 * (1 + 0.25 * beat), 0, 7); g.stroke();
      g.globalAlpha = ha * (1 - ph); g.beginPath(); g.arc(hp[0], hp[1], rr0 * (1.3 + 1.6 * ph), 0, 7); g.stroke();
      g.shadowBlur = 0; g.restore();
      // chip encima del encuadre, con línea hasta la cabeza
      const s = back(prog(t, th - 0.05, 0.45)) * (1 - 0.18 * C.k);
      const chx = clamp(cx, 300, 780), chy = Math.max(top - 104 - 30 * (1 - C.k), 520);
      g.save(); g.globalAlpha = ha;
      g.strokeStyle = 'rgba(255,90,78,0.7)'; g.lineWidth = 2; g.setLineDash([5, 6]);
      g.beginPath(); g.moveTo(chx, chy + 44 * s); g.lineTo(hp[0], hp[1] - rr0); g.stroke(); g.setLineDash([]);
      g.translate(chx, chy); g.scale(s, s);
      rr(-200, -44, 400, 88, 44); g.fillStyle = 'rgba(16,8,10,0.88)'; g.fill(); g.strokeStyle = RED; g.lineWidth = 3; g.stroke();
      // corazón
      g.save(); g.translate(-152, 2); g.scale(1 + 0.18 * beat, 1 + 0.18 * beat);
      g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-30, -6, -16, -30, 0, -14); g.bezierCurveTo(16, -30, 30, -6, 0, 16); g.fillStyle = RED; g.shadowColor = 'rgba(255,60,60,0.9)'; g.shadowBlur = 14 * beat; g.fill(); g.restore();
      txt('1 HERIDO', -116, 19, 54, WHITE, 400, 'left', 'Bebas');
      // electrocardiograma con barrido
      const ex0 = 38, ex1 = 180, span = 2.2;
      g.save(); g.beginPath(); g.rect(ex0, -36, ex1 - ex0, 72); g.clip();
      g.strokeStyle = '#FF6B5E'; g.lineWidth = 3; g.lineJoin = 'round'; g.shadowColor = 'rgba(255,90,80,0.9)'; g.shadowBlur = 8;
      g.beginPath();
      for (let i = 0; i <= 90; i++) {
        const tt = t - span + span * i / 90;
        const q = ((tt - th) % per + per) % per / per;
        let y = 0;
        if (q < 0.06) y = -4 * Math.sin(q / 0.06 * Math.PI);
        else if (q > 0.12 && q < 0.15) y = 6; else if (q >= 0.15 && q < 0.19) y = -30 * Math.sin((q - 0.15) / 0.04 * Math.PI); else if (q >= 0.19 && q < 0.23) y = 9 * Math.sin((q - 0.19) / 0.04 * Math.PI);
        else if (q > 0.35 && q < 0.5) y = -7 * Math.sin((q - 0.35) / 0.15 * Math.PI);
        const x = lerp(ex0, ex1, i / 90);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke(); g.restore();
      g.restore();
    }
  }
}

function treeline(R) {                             // linde del bosque a ambos lados (siluetas con copas), con niebla al fondo
  const { C, L } = R;
  const vx = W / 2 - C.f * Math.tan(C.yaw), vy = C.hor;
  for (const [side, X0, amp, hgt, seed] of [[1, 17, 3, 10, 5], [-1, -19, 3, 11, 9], [1, 9.5, 1.5, 7, 1], [-1, -10.5, 2, 8, 3]]) {
    const top = [], bot = [];
    let z = C.z + 0.5;
    while (z < C.z + 300) {
      const dz = z - C.z;
      const X = X0 + side * amp * (noise1(z * 0.031, seed) - 0.5);
      const Hh = hgt * (0.55 + 0.3 * noise1(z * 0.07, seed + 1) + 0.2 * Math.pow(Math.abs(Math.sin(z * 0.45 + seed)), 0.45) + 0.05 * Math.sin(z * 1.7 + seed * 3));
      top.push([X, Hh, z]); bot.push([X, 0, z]);
      z += Math.max(0.35, dz * 0.06);
    }
    const sp = clipPoly(C, top.concat(bot.reverse()));
    if (!path(sp)) continue;
    const fogc = mixc([22, 25, 34], [120, 130, 152], L), dark = mixc(Math.abs(X0) > 12 ? [7, 9, 13] : [4, 5, 7], [12, 14, 18], L);
    const rg = g.createRadialGradient(vx, vy, 0, vx, vy, 720);
    rg.addColorStop(0, rgbs(fogc)); rg.addColorStop(0.18, rgbs(mixc(fogc, dark, 0.6))); rg.addColorStop(0.55, rgbs(dark)); rg.addColorStop(1, rgbs(dark));
    g.fillStyle = rg; g.fill();
  }
}

function shadeAt(R, n, P, base, ambK) {            // color (0-255) de la pintura o el cristal en un punto: cielo + faros + relámpago + ámbar
  const hx = R.carX, hy = 0.65, hz = R.carZ + 1.95;
  let lx = hx - P[0], ly = hy - P[1], lz = hz - P[2];
  const d = Math.hypot(lx, ly, lz); lx /= d; ly /= d; lz /= d;
  const facing = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
  const beam = beamAt(R, P[0], P[1], P[2]) * facing * 1.05;
  const sky = 0.04 + 0.1 * Math.max(0, n[1]);
  const flash = R.L * 0.7 * (0.3 + 0.7 * Math.max(0, n[1]));
  const amb = ambAt(R, P[0], P[1], P[2]) * ambK;
  return [255 * (base[0] * (sky + flash + beam) + amb * 0.85), 255 * (base[1] * (sky + flash + beam * 0.95) + amb * 0.45), 255 * (base[2] * (sky + flash + beam * 0.85) + amb * 0.08)];
}
