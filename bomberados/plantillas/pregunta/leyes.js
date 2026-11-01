// Fondo «escritorio» e intro «leyes» de la Pregunta del día (Bomberados, Nº 5: ¿qué ley regula el Sistema Nacional de
// Protección Civil?). Se carga DESPUÉS de scene.js (web/index.html) y usa sus utilidades: g, W, H, CUE, Q, END, clamp, prog,
// eo, eio, back, lerp, hash, rr, txt, rgba, mixc, rgbs, sstep, glowAt, background, sparks, LETCOL, ORANGE, GOLD, WHITE, RED.
//
// Escritorio de opositor de noche con flexo. En el primer fotograma caen cuatro libros de leyes (el número de cada norma en la
// tapa y su letra) y hay un cepo de acero abierto delante; en «trampa» el cepo se cierra de golpe (chispas, sacudida, papeles
// que vuelan); en «civil» se enciende un rotativo de emergencia que barre la escena; en «qué» la cámara sube los libros a la
// franja de arriba para dejar sitio a la pregunta; en «derogada» baja un sello DEROGADA que flota sin posarse en ninguno (va de
// libro en libro con la cuenta atrás y se va: no da la respuesta); en «Bomberados» los libros arden y sus páginas son brasas.
// Las fases (DK) las usa también compose.py para que cada sonido empiece y acabe con su imagen.

let DK = null;                                     // línea de tiempo del escritorio
function dkInit() {
  const tc = CUE.cuenta, t1 = CUE.letras[0] - 0.1, P = (t1 - tc) / 5;
  DK = {
    land: [0, 1, 2, 3].map(i => 0.05 + i * 0.1),   // los libros tocan la mesa
    trap: CUE.trampa ?? 0.45,                      // el cepo se cierra
    beacon: CUE.civil0 ?? 1.2,                     // se enciende el rotativo
    cam: CUE.enunciado - 0.12,                     // la cámara sube (0,9 s)
    stamp: CUE.derogada ?? CUE.opciones + 1,       // baja el sello
    tc, t1, P,
    burn: CUE.marca - 0.45,                        // arden los libros
    off: CUE.marca - 0.2,                          // se apaga el rotativo
  };
}
const BX = [180, 420, 660, 900], BY = 1060, BW = 210, BH = 290, BROT = [-0.06, 0.045, -0.035, 0.07];
const BCOL = [[96, 28, 26], [26, 44, 80], [24, 62, 44], [46, 32, 22]];
const TRAP = { x: 540, y: 1450, R: 235 };
const BEACON = { x: 118, y: 835 };
const PAPERS = [[300, 1270, 0.35], [790, 1290, -0.28], [560, 860, 0.12], [950, 870, -0.45], [120, 1250, 0.6]];

// ---------------------------------------------------------------- cámara
function dkCam(t) {
  const k = eio(prog(t, DK.cam, 0.9));
  const d = Math.max(0, t - DK.cam - 0.9);
  const s = lerp(1.1 + 0.05 * eo(prog(t, 0, DK.cam)), 0.62 + 0.012 * Math.sin(d * 0.5), k);
  const fx = lerp(540, 540 + 10 * Math.sin(d * 0.37), k), fy = lerp(1190, 1040, k);
  const ax = 540, ay = lerp(1150, 652, k);
  // sacudidas: libros (pequeñas) y cepo (grande)
  let sh = 0;
  for (const tl of DK.land) sh += 5 * Math.exp(-Math.pow((t - tl - 0.02) / 0.05, 2));
  sh += 15 * Math.exp(-Math.pow((t - DK.trap - 0.09) / 0.07, 2));
  return { s, fx, fy, ax, ay, k, sx: Math.sin(t * 91) * sh, sy: Math.cos(t * 77) * sh * 0.8 };
}
const toS = (C, x, y) => [(x - C.fx) * C.s + C.ax + C.sx, (y - C.fy) * C.s + C.ay + C.sy];   // escena → pantalla

// ---------------------------------------------------------------- mesa, flexo y polvo en la luz
function desk(t, C) {
  g.save(); g.translate(C.ax + C.sx, C.ay + C.sy); g.scale(C.s, C.s); g.translate(-C.fx, -C.fy);
  const wg = g.createLinearGradient(0, -400, 0, 2400);
  wg.addColorStop(0, '#1A0F0A'); wg.addColorStop(0.5, '#24150D'); wg.addColorStop(1, '#130B07');
  g.fillStyle = wg; g.fillRect(-1200, -800, 3480, 4000);
  // vetas de la madera
  g.lineWidth = 2;
  for (let i = 0; i < 70; i++) {
    const y0 = -700 + i * 52 + 14 * hash(i + 3);
    g.strokeStyle = `rgba(${60 + 30 * hash(i)},${34 + 18 * hash(i + 1)},${18 + 8 * hash(i + 2)},${(0.18 + 0.2 * hash(i + 4)).toFixed(3)})`;
    g.beginPath(); g.moveTo(-1200, y0);
    for (let x = -1200; x <= 2300; x += 80) g.lineTo(x, y0 + 9 * Math.sin(x * 0.004 + i) + 5 * Math.sin(x * 0.013 + i * 2.3));
    g.stroke();
  }
  // luz del flexo (arriba a la izquierda), cálida
  const lg = g.createRadialGradient(330, 900, 40, 380, 1000, 980);
  lg.addColorStop(0, 'rgba(255,196,120,0.42)'); lg.addColorStop(0.45, 'rgba(255,150,70,0.14)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.fillRect(-600, 0, 2400, 2200); g.restore();
  g.restore();
}
function dust(t, C) {                              // motas en el haz del flexo
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const x = 120 + 720 * hash(i + 11) + 40 * Math.sin(t * 0.3 + i), y = 520 + 900 * ((hash(i + 12) + t * 0.012 * (0.5 + hash(i + 13))) % 1);
    const [sx, sy] = toS(C, x, y);
    const a = 0.12 + 0.18 * Math.sin(t * (0.8 + hash(i)) + i) ** 2;
    g.fillStyle = `rgba(255,220,170,${a.toFixed(3)})`; g.beginPath(); g.arc(sx, sy, (1 + 1.6 * hash(i + 14)) * C.s, 0, 7); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- papeles (vuelan al cerrarse el cepo)
function paperAt(i, t) {                           // [x, y, rot, altura 0..1]
  const [x, y, r] = PAPERS[i];
  const u = prog(t, DK.trap + 0.06 + 0.03 * i, 1.25);
  if (u <= 0 || u >= 1) return [x + (u >= 1 ? 40 * (hash(i + 5) - 0.5) : 0), y + (u >= 1 ? 30 * (hash(i + 6) - 0.5) : 0), r + (u >= 1 ? 0.8 * (hash(i + 7) - 0.5) : 0), 0];
  const hgt = Math.sin(Math.PI * Math.pow(u, 0.7));
  const out = Math.sign(x - 540) || 1;           // hacia fuera, lejos de los libros
  return [x + out * 150 * eo(u) + 25 * Math.sin(u * 9 + i) * hgt, y + 40 * (hash(i + 6) - 0.5) * u - 150 * hgt, r + 0.8 * (hash(i + 7) - 0.5) * u + 1.2 * Math.sin(u * 7 + i) * hgt, hgt];
}
function paper(i, t, C, burn) {
  const [x, y, r, h] = paperAt(i, t);
  const [sx, sy] = toS(C, x, y);
  const s = C.s * (1 + 0.18 * h) * 0.85;
  g.save(); g.translate(sx, sy); g.rotate(r); g.scale(s, s * (1 - 0.35 * h * Math.abs(Math.sin(t * 9 + i))));
  g.fillStyle = `rgba(0,0,0,${(0.35 * (1 - h)).toFixed(3)})`; g.fillRect(-82, -108, 170, 222);
  const pg = g.createLinearGradient(-85, -110, 85, 110); pg.addColorStop(0, '#EDE3D0'); pg.addColorStop(1, '#B9AC94');
  g.fillStyle = pg; g.fillRect(-85, -112, 170, 222);
  g.fillStyle = 'rgba(60,50,40,0.45)';
  for (let k = 0; k < 11; k++) g.fillRect(-66, -88 + k * 17, 120 - 40 * hash(i * 13 + k), 4);
  if (burn > 0) { const bg = g.createLinearGradient(0, 112, 0, -112); bg.addColorStop(0, `rgba(255,120,30,${burn.toFixed(3)})`); bg.addColorStop(clamp(burn), `rgba(40,10,4,${burn.toFixed(3)})`); bg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bg; g.fillRect(-85, -112, 170, 222); }
  g.restore();
}

// ---------------------------------------------------------------- libros de leyes
function bookPose(i, t) {                          // [x, y, rot, sx, sy, altura de caída 0..1]
  const tl = DK.land[i];
  const u = prog(t, tl - 0.3, 0.3);
  if (u <= 0) return null;
  const fall = 1 - u * u;                          // cae acelerando
  const imp = Math.exp(-Math.pow((t - tl) / 0.05, 2)) * (t > tl - 0.02 ? 1 : 0);
  const bounce = t > tl ? 9 * Math.exp(-(t - tl) / 0.07) * Math.abs(Math.sin((t - tl) * 38)) : 0;
  return [BX[i] + 30 * fall * (i % 2 ? 1 : -1), BY - 1300 * fall - bounce, BROT[i] + 0.5 * fall * (i % 2 ? -1 : 1), 1 + 0.07 * imp, 1 - 0.07 * imp, fall];
}
function book(i, t, C, burn) {
  const p = bookPose(i, t); if (!p) return;
  const [x, y, rot, kx, ky, fall] = p;
  const [sx, sy] = toS(C, x, y);
  const s = C.s * (1 + 0.5 * fall);
  // sombra (más grande y suave cuanto más alto)
  const [shx, shy] = toS(C, BX[i] + 22, BY + 26);
  g.save(); g.translate(shx, shy); g.rotate(BROT[i]); g.scale(C.s * (1 + 0.6 * fall), C.s * (1 + 0.6 * fall));
  g.fillStyle = `rgba(0,0,0,${(0.55 * (1 - 0.7 * fall)).toFixed(3)})`; rr(-BW / 2, -BH / 2, BW, BH, 12); g.fill();
  g.restore();
  g.save(); g.translate(sx, sy); g.rotate(rot); g.scale(s * kx, s * ky);
  const c = BCOL[i];
  // grosor: páginas (crema) abajo y a la derecha, y el canto de la tapa
  rr(-BW / 2 + 7, -BH / 2 + 9, BW, BH, 10); g.fillStyle = '#D8CCB2'; g.fill();
  g.strokeStyle = 'rgba(120,100,70,0.6)'; g.lineWidth = 1;
  for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-BW / 2 + 12, BH / 2 + 2 + k); g.lineTo(BW / 2 + 4, BH / 2 + 2 + k); g.stroke(); }
  rr(-BW / 2 + 10, -BH / 2 + 13, BW, BH, 10); g.fillStyle = rgbs([c[0] * 0.55, c[1] * 0.55, c[2] * 0.55]); g.globalCompositeOperation = 'destination-over'; g.fill(); g.globalCompositeOperation = 'source-over';
  // tapa de piel con la luz del flexo (arriba a la izquierda)
  rr(-BW / 2, -BH / 2, BW, BH, 10);
  const cg = g.createLinearGradient(-BW / 2, -BH / 2, BW / 2, BH / 2);
  cg.addColorStop(0, rgbs([c[0] * 1.9 + 20, c[1] * 1.9 + 16, c[2] * 1.9 + 10])); cg.addColorStop(0.55, rgbs(c)); cg.addColorStop(1, rgbs([c[0] * 0.55, c[1] * 0.55, c[2] * 0.55]));
  g.fillStyle = cg; g.fill();
  // lomo (franja oscura a la izquierda) y marco dorado
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-BW / 2, -BH / 2, 22, BH);
  g.strokeStyle = 'rgba(232,186,92,0.85)'; g.lineWidth = 2.5; g.strokeRect(-BW / 2 + 34, -BH / 2 + 18, BW - 52, BH - 36);
  g.lineWidth = 1; g.strokeRect(-BW / 2 + 40, -BH / 2 + 24, BW - 64, BH - 48);
  // título dorado: tipo de norma y número
  const [kind, num] = (Q.libros && Q.libros[i]) || ['LEY', '?'];
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 3; g.shadowOffsetY = 2;
  g.letterSpacing = '3px'; txt(kind, 8, -38, kind.length > 6 ? 17 : 22, '#E8BA5C', 700, 'center', 'Inter'); g.letterSpacing = '0px';
  txt(num, 8, 30, num.length > 6 ? 52 : 60, '#F2CC72', 400, 'center', 'Bebas');
  g.fillStyle = 'rgba(232,186,92,0.7)'; g.fillRect(-36, 52, 88, 2);
  g.restore();
  // letra de la opción (círculo de su color)
  const lc = LETCOL[i];
  g.beginPath(); g.arc(-BW / 2 + 46, -BH / 2 + 50, 25, 0, 7); g.fillStyle = 'rgba(10,10,12,0.75)'; g.fill(); g.strokeStyle = lc; g.lineWidth = 3; g.stroke();
  txt('ABCD'[i], -BW / 2 + 46, -BH / 2 + 66, 40, lc, 400, 'center', 'Bebas');
  // brillo de la piel
  const sg = g.createLinearGradient(-BW / 2, -BH / 2, BW / 2, -BH / 4);
  sg.addColorStop(0, 'rgba(255,230,190,0.16)'); sg.addColorStop(1, 'rgba(255,230,190,0)');
  rr(-BW / 2, -BH / 2, BW, BH, 10); g.fillStyle = sg; g.fill();
  // fuego al final: se carboniza de abajo arriba
  if (burn > 0) {
    rr(-BW / 2, -BH / 2, BW, BH, 10); g.save(); g.clip();
    const bg = g.createLinearGradient(0, BH / 2, 0, -BH / 2);
    bg.addColorStop(0, `rgba(20,6,2,${burn.toFixed(3)})`); bg.addColorStop(clamp(burn * 0.9), `rgba(30,8,3,${burn.toFixed(3)})`);
    bg.addColorStop(clamp(burn * 0.9 + 0.08), `rgba(255,120,30,${(0.9 * burn).toFixed(3)})`); bg.addColorStop(clamp(burn * 0.9 + 0.2), 'rgba(255,120,30,0)');
    g.fillStyle = bg; g.fillRect(-BW / 2, -BH / 2, BW, BH);
    g.restore();
  }
  g.restore();
  // polvo al tocar la mesa
  const da = prog(t, DK.land[i], 0.45);
  if (da > 0 && da < 1) {
    for (let k = 0; k < 14; k++) {
      const a = (hash(i * 20 + k) - 0.5) * Math.PI * 0.9 + (k % 2 ? 0 : Math.PI);
      const dist = (40 + 120 * hash(i * 30 + k)) * eo(da);
      const [px, py] = toS(C, BX[i] + Math.cos(a) * (BW / 2 + dist), BY + BH / 2 - 10 - 30 * hash(i * 40 + k) * da + Math.sin(a) * dist * 0.3);
      g.fillStyle = `rgba(210,190,160,${(0.35 * (1 - da)).toFixed(3)})`; g.beginPath(); g.arc(px, py, (3 + 5 * hash(k + i)) * C.s * (1 + da), 0, 7); g.fill();
    }
  }
}

// ---------------------------------------------------------------- cepo de acero (se cierra en «trampa»)
function trapPhi(t) {
  const u = prog(t, DK.trap, 0.08);
  let phi = (Math.PI / 2) * eio(u);
  if (t > DK.trap + 0.08) phi += 0.08 * Math.exp(-(t - DK.trap - 0.08) / 0.09) * Math.sin((t - DK.trap) * 60);
  return phi;
}
function trap(t, C) {
  const phi = trapPhi(t), R = TRAP.R, al = 0.96, ca = Math.cos(al), sa = Math.sin(al);   // vista desde arriba en ángulo
  const P = (X, Y, Z) => toS(C, TRAP.x + X, TRAP.y - Y * ca - Z * sa);
  // sombra y placa base
  const [cx, cy] = P(0, 0, 0);
  g.save(); g.translate(cx + 12 * C.s, cy + 14 * C.s); g.scale(C.s, C.s * sa);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(0, 0, R * 1.08, 0, 7); g.fill(); g.restore();
  // muelles laterales (ballestas) y cadena
  for (const sgn of [-1, 1]) {
    const a = P(sgn * R * 0.95, 4, 0), b = P(sgn * R * 1.75, 4, 0);
    g.strokeStyle = '#5E646E'; g.lineWidth = 16 * C.s; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = 'rgba(230,236,245,0.5)'; g.lineWidth = 3 * C.s; g.beginPath(); g.moveTo(a[0], a[1] - 4 * C.s); g.lineTo(b[0], b[1] - 4 * C.s); g.stroke();
  }
  for (let k = 0; k < 6; k++) {
    const [lx, ly] = P(R * 0.2 + k * 34, 0, R * 1.05 + k * 10);
    g.strokeStyle = '#4C525B'; g.lineWidth = 5 * C.s; g.beginPath(); g.ellipse(lx, ly, 15 * C.s, 9 * C.s, k % 2 ? 0.4 : -0.4, 0, 7); g.stroke();
  }
  g.save(); g.translate(cx, cy); g.scale(C.s, C.s * sa);
  const bg = g.createRadialGradient(-20, -20, 5, 0, 0, R * 0.32);
  bg.addColorStop(0, '#A9AFB8'); bg.addColorStop(1, '#3D4249');
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R * 0.32, 0, 7); g.fill();
  g.fillStyle = '#2B2F35'; g.beginPath(); g.arc(0, 0, R * 0.12, 0, 7); g.fill();
  g.restore();
  // mandíbulas: la de atrás primero (gira hacia delante) y la de delante (gira hacia atrás)
  const jaw = (side) => {                          // side +1 = atrás (Z>0), -1 = delante
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const th = k / 40 * Math.PI, X = R * Math.cos(th), r0 = R * Math.sin(th);
      pts.push([X, r0 * Math.sin(phi), side * r0 * Math.cos(phi), th]);
    }
    const sp = pts.map(p => P(p[0], p[1], p[2]));
    // dientes (hacia el centro del arco)
    g.fillStyle = '#C8CDD5';
    for (let k = 1; k < 40; k += 3) {
      const [X, Y, Z, th] = pts[k], kin = 0.8;
      const a = P(pts[k - 1][0], pts[k - 1][1], pts[k - 1][2]), b = P(pts[k + 1][0], pts[k + 1][1], pts[k + 1][2]);
      const tip = P(X * kin, Y * kin, Z * kin + (side > 0 ? -1 : 1) * 0.06 * R * Math.sin(th) * (1 - Math.sin(phi)));
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(tip[0], tip[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#4A5059'; g.lineWidth = 17 * C.s;
    g.beginPath(); sp.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    g.strokeStyle = 'rgba(235,240,248,0.75)'; g.lineWidth = 4 * C.s;
    g.beginPath(); sp.forEach((p, k) => k ? g.lineTo(p[0], p[1] - 5 * C.s) : g.moveTo(p[0], p[1] - 5 * C.s)); g.stroke();
  };
  jaw(1); jaw(-1);
  // bisagras
  for (const sgn of [-1, 1]) { const [hx, hy] = P(sgn * R, 0, 0); g.fillStyle = '#2F343B'; g.beginPath(); g.arc(hx, hy, 14 * C.s, 0, 7); g.fill(); }
  // destello y chispas al cerrarse
  const tk = DK.trap + 0.08;
  const fl = Math.exp(-Math.pow((t - tk) / 0.05, 2));
  const [tx, ty] = P(0, R, 0);
  if (fl > 0.02) glowAt(tx, ty, 220 * C.s, [255, 240, 210], 0.85 * fl);
  const su = prog(t, tk, 0.4);
  if (su > 0 && su < 1) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let k = 0; k < 22; k++) {
      const a = -Math.PI / 2 + (hash(k + 71) - 0.5) * 2.6, v = (180 + 320 * hash(k + 72)) * C.s;
      const x = tx + Math.cos(a) * v * su, y = ty + Math.sin(a) * v * su + 260 * su * su * C.s;
      const x0 = tx + Math.cos(a) * v * Math.max(0, su - 0.06), y0 = ty + Math.sin(a) * v * Math.max(0, su - 0.06) + 260 * Math.max(0, su - 0.06) ** 2 * C.s;
      g.strokeStyle = `rgba(255,${Math.round(200 - 80 * su)},120,${(1 - su).toFixed(3)})`; g.lineWidth = 3 * C.s;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
    }
    g.restore();
  }
}

// ---------------------------------------------------------------- rotativo de emergencia (se enciende en «civil»)
function beaconOn(t) { return prog(t, DK.beacon, 0.06) * (1 - prog(t, DK.off, 0.15)); }
function beacon(t, C) {
  const on = beaconOn(t);
  const [bx, by] = toS(C, BEACON.x, BEACON.y);
  const s = C.s;
  // base y cúpula
  g.save(); g.translate(bx, by); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(12, 64, 70, 22, 0, 0, 7); g.fill();
  rr(-58, 30, 116, 40, 10); const bb = g.createLinearGradient(0, 30, 0, 70); bb.addColorStop(0, '#2A2C31'); bb.addColorStop(1, '#0D0E10'); g.fillStyle = bb; g.fill();
  g.beginPath(); g.moveTo(-50, 34); g.lineTo(-44, -38); g.quadraticCurveTo(0, -78, 44, -38); g.lineTo(50, 34); g.closePath();
  const th = 2 * Math.PI * 1.25 * Math.max(0, t - DK.beacon);
  const face = 0.5 + 0.5 * Math.cos(th - Math.PI / 2);   // el foco mira hacia la cámara
  const dg = g.createLinearGradient(-50, 0, 50, 0);
  const lit = 0.25 + 0.75 * on * (0.35 + 0.65 * face);
  dg.addColorStop(0, rgbs([120 + 135 * lit, 44 + 110 * lit, 6 + 40 * lit], 0.95)); dg.addColorStop(0.5, rgbs([170 + 85 * lit, 70 + 130 * lit, 10 + 60 * lit], 0.95)); dg.addColorStop(1, rgbs([110 + 120 * lit, 40 + 90 * lit, 6 + 30 * lit], 0.95));
  g.fillStyle = dg; g.fill();
  g.strokeStyle = 'rgba(255,220,160,0.35)'; g.lineWidth = 2; g.stroke();
  g.restore();
  if (on <= 0.01) return;
  glowAt(bx, by - 10 * s, (120 + 260 * face) * s, [255, 150, 40], on * (0.35 + 0.55 * face * face));
  // dos haces que giran y barren la mesa
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const off of [0, Math.PI]) {
    const a = th + off, len = 1500 * s, half = 0.13;
    const lg = g.createLinearGradient(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len * 0.62);
    lg.addColorStop(0, `rgba(255,160,50,${(0.34 * on).toFixed(3)})`); lg.addColorStop(0.5, `rgba(255,130,30,${(0.10 * on).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = lg;
    g.beginPath(); g.moveTo(bx, by - 10 * s);
    g.lineTo(bx + Math.cos(a - half) * len, by + Math.sin(a - half) * len * 0.62);
    g.lineTo(bx + Math.cos(a + half) * len, by + Math.sin(a + half) * len * 0.62);
    g.closePath(); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- sello DEROGADA: flota, va de libro en libro y se va
function stampState(t) {
  const t0 = DK.stamp;
  if (t < t0 - 0.05) return null;
  const seq = [0, 2, 1, 3];                        // nunca se posa: el orden no dice nada
  let x = 540;
  for (let k = 0; k < 5; k++) {
    const tk = DK.tc + k * DK.P;
    const target = k < 4 ? BX[seq[k]] : 540;
    x = lerp(x, target, eio(prog(t, tk - 0.05, 0.28)));
  }
  const drop = eo(prog(t, t0 - 0.05, 0.38));       // baja desde arriba
  const lift = eio(prog(t, DK.t1 + 0.05, 0.45));   // se va al acabar la cuenta atrás
  const y = BY - 175 - (1 - drop) * 1100 - lift * 1300 + 8 * Math.sin(t * 3.1);
  const sw = 0.08 * Math.sin(t * 2.3) + 0.12 * (1 - drop);
  return { x, y, rot: sw, a: clamp(drop * 2) * (1 - lift) };
}
function stamp(t, C) {
  const S = stampState(t); if (!S || S.a <= 0.01) return;
  // sombra sobre la mesa/los libros (más pequeña y oscura cuanto más baja)
  const hgt = clamp((BY - S.y - 120) / 900);
  const [shx, shy] = toS(C, S.x + 30, BY + 10);
  g.save(); g.translate(shx, shy); g.scale(C.s * (1 + hgt), C.s * (1 + hgt) * 0.45);
  const sg = g.createRadialGradient(0, 0, 10, 0, 0, 150);
  sg.addColorStop(0, `rgba(0,0,0,${(0.55 * (1 - hgt) * S.a).toFixed(3)})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.fillRect(-150, -150, 300, 300); g.restore();
  const [sx, sy] = toS(C, S.x, S.y);
  g.save(); g.globalAlpha = S.a; g.translate(sx, sy); g.rotate(S.rot); g.scale(C.s * 1.05, C.s * 1.05);
  // mango de madera
  g.fillStyle = '#1C120C'; rr(-14, -150, 28, 70, 8); g.fill();
  const kg = g.createRadialGradient(-12, -186, 4, 0, -176, 46); kg.addColorStop(0, '#5A3A26'); kg.addColorStop(1, '#1A100A');
  g.fillStyle = kg; g.beginPath(); g.ellipse(0, -176, 44, 34, 0, 0, 7); g.fill();
  // cuerpo rojo con el rótulo
  rr(-128, -86, 256, 92, 10); const bgd = g.createLinearGradient(0, -86, 0, 6); bgd.addColorStop(0, '#E2342C'); bgd.addColorStop(1, '#8E1410'); g.fillStyle = bgd; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.stroke();
  g.letterSpacing = '4px'; txt('DEROGADA', 0, -24, 52, '#FFF4EE', 400, 'center', 'Bebas'); g.letterSpacing = '0px';
  // goma
  g.fillStyle = '#3A0B08'; rr(-122, 6, 244, 20, 6); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- fuego final (los libros arden y se vuelven brasas)
function flames(t, C, burn) {
  if (burn <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const base = BY + BH / 2 - (BH + 20) * clamp(burn * 0.9);      // las llamas siguen la línea que se va quemando
    for (let k = 0; k < 9; k++) {
      const x = BX[i] - BW / 2 + 18 + (BW - 36) * hash(i * 17 + k) + 8 * Math.sin(t * 7 + k * 1.7 + i);
      const hgt = (70 + 170 * hash(i * 9 + k + 3)) * Math.min(1, burn * 1.6) * (0.7 + 0.3 * Math.sin(t * (13 + 5 * hash(k + i)) + k));
      const wdt = 16 + 22 * hash(i * 5 + k);
      const [bx0, by0] = toS(C, x, base + 30 * hash(i + k));
      const s = C.s, sway = 14 * Math.sin(t * (6 + k) + i);
      const fg = g.createLinearGradient(bx0, by0, bx0, by0 - hgt * s);
      fg.addColorStop(0, `rgba(255,214,120,${(0.6 * burn).toFixed(3)})`); fg.addColorStop(0.35, `rgba(255,130,40,${(0.45 * burn).toFixed(3)})`); fg.addColorStop(1, 'rgba(190,40,10,0)');
      g.fillStyle = fg;
      g.beginPath(); g.moveTo(bx0 - wdt * s, by0);
      g.bezierCurveTo(bx0 - wdt * 1.2 * s, by0 - hgt * s * 0.4, bx0 + sway * s * 0.5, by0 - hgt * s * 0.75, bx0 + sway * s, by0 - hgt * s);
      g.bezierCurveTo(bx0 + sway * s * 0.3 + wdt * 0.4 * s, by0 - hgt * s * 0.6, bx0 + wdt * 1.2 * s, by0 - hgt * s * 0.35, bx0 + wdt * s, by0);
      g.closePath(); g.fill();
    }
    const [gx, gy] = toS(C, BX[i], BY);
    glowAt(gx, gy, 280 * C.s, [255, 120, 30], 0.4 * burn);
    for (let k = 0; k < 16; k++) {                 // brasas que suben del libro
      const P_ = 0.9 + 0.8 * hash(i * 31 + k), age = ((t - DK.burn) + hash(i * 7 + k) * P_) % P_;
      if (t < DK.burn || age < 0) continue;
      const ex = BX[i] + (hash(i * 11 + k) - 0.5) * BW + 30 * Math.sin(age * 4 + k), ey = BY - age * (260 + 200 * hash(k + i * 3));
      const [px, py] = toS(C, ex, ey);
      const a = burn * (1 - age / P_);
      g.fillStyle = `rgba(255,${Math.round(170 - 80 * age / P_)},60,${a.toFixed(3)})`; g.beginPath(); g.arc(px, py, (2 + 2.5 * hash(k + i)) * C.s * 1.6, 0, 7); g.fill();
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- fondo completo (lo llama renderAt)
let DK_GRAIN = null;
function deskBackground(t) {
  if (!DK) dkInit();
  const C = dkCam(t);
  const burn = eio(prog(t, DK.burn, 0.55));        // 0 → 1 los libros arden
  const kM = eio(prog(t, DK.burn + 0.35, 0.6));    // 0 escritorio → 1 brasas
  if (kM < 1) {
    desk(t, C);
    for (let i = 0; i < PAPERS.length; i++) if (paperAt(i, t)[3] < 0.05) paper(i, t, C, burn);
    for (let i = 0; i < 4; i++) book(i, t, C, burn);
    beacon(t, C);
    trap(t, C);
    stamp(t, C);
    for (let i = 0; i < PAPERS.length; i++) if (paperAt(i, t)[3] >= 0.05) paper(i, t, C, burn);
    flames(t, C, burn);
    dust(t, C);
    // telón inferior para leer las tarjetas cuando sube la cámara
    if (C.k > 0) {
      const sg = g.createLinearGradient(0, 800, 0, H);
      sg.addColorStop(0, 'rgba(4,3,3,0)'); sg.addColorStop(0.2, `rgba(4,3,3,${(0.6 * C.k).toFixed(3)})`); sg.addColorStop(1, `rgba(4,3,3,${(0.85 * C.k).toFixed(3)})`);
      g.fillStyle = sg; g.fillRect(0, 800, W, H - 800);
    }
    const vg = g.createRadialGradient(W / 2, H * 0.42, 360, W / 2, H * 0.45, 1250);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // grano de película
    if (!DK_GRAIN) {
      DK_GRAIN = document.createElement('canvas'); DK_GRAIN.width = DK_GRAIN.height = 256;
      const gc = DK_GRAIN.getContext('2d'), id = gc.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (hash(i * 0.37) - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      gc.putImageData(id, 0, 0);
    }
    g.save(); g.globalAlpha = 0.06; g.globalCompositeOperation = 'overlay';
    const ox = Math.floor(hash(Math.floor(t * 60)) * 256), oy = Math.floor(hash(Math.floor(t * 60) + 0.5) * 256);
    g.fillStyle = g.createPattern(DK_GRAIN, 'repeat'); g.translate(-ox, -oy); g.fillRect(0, 0, W + 256, H + 256);
    g.restore();
  }
  if (kM > 0) { g.save(); g.globalAlpha = kM; background(t); sparks(t); g.restore(); }
}
