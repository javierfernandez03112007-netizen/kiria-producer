// Formato «Tus abuelos tenían media hora» (Bomberados): el salón de los abuelos contra el de hoy. Se carga DESPUÉS de
// scene.js (web/index.html) y sustituye su renderAt. Usa de scene.js: g, W, H, PR, CUE, Q, END, clamp, prog, eo, eio,
// back, lerp, hash, rr, txt, rgba, mixc, rgbs, glowAt, background, sparks, share, closing, punch, ORANGE, GOLD, WHITE.
//
// Pantalla partida: arriba el salón de tus abuelos (muebles de mediados del siglo XX, luz cálida, grano de película),
// abajo el tuyo (sofá de espuma y microfibra, luz fría). Cada salón se pinta UNA vez en perspectiva de un punto
// (makeRoom) y encima van el fuego, el humo que baja del techo, la luz y el flashover.
//  · gancho: una llamita en cada sofá y dos cuentas atrás «para salir»: 29:30 (abuelos) y 03:30 (tú);
//  · «algodón» / «espuma», «microfibra», «petróleo»: lupas sobre los cojines (algodón; espuma con burbujas y gota negra);
//  · «quemaron»: arranca el ensayo acelerado (×N en pantalla); en «horno» tu salón llega al flashover (3:30); el de los
//    abuelos sigue y llega al suyo al acabar «aguantó casi media hora» (29:30);
//  · «salvar»/«cierra»: dormitorio de noche con la puerta abierta y el pasillo en llamas; en «cierra» la puerta se cierra;
//  · «ensayo» (2.º): dos dormitorios, puerta cerrada (38 °C) y abierta (260 °C), con termómetros;
//  · venta: avión de papel (share) y placa BOMBERADOS sobre brasas.
// Datos: UL FSRI (ver projects/bomberados_abuelos/FUENTES.md). La línea de tiempo (SL) la repite compose.py.

let SL = null, ROOM = null, BED = null, GRAIN = null;
const RS = 2;                                                        // resolución extra de los salones pintados (zoom de la apertura)
const PW = 1032, PH = 620, PX = 24, PY_TOP = 418, PY_BOT = 1078;    // paneles
const SB = 0.55, VPY = 0.32 * PH, EYE = 1 - 0.32;                   // perspectiva (escala del fondo, punto de fuga, ojo)
const TFO = { old: 1770, new: 210 };                                 // segundos hasta el flashover en el ensayo de UL
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// ---------------------------------------------------------------- perspectiva de la habitación
function P(X, Y, Z) {                       // X −1..1 (pared izquierda → derecha), Y 0..1 (suelo → techo), Z 0..1 (delante → fondo)
  const s = 1 / (1 + Z * (1 / SB - 1));
  return [PW / 2 + X * (PW / 2) * s, VPY + ((1 - Y) * PH - VPY) * s];
}
function crr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function poly(c, pts, fill) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } }
function box(c, X0, X1, Y0, Y1, Z0, Z1, col) {   // caja: lateral visible, tapa (si queda bajo los ojos) y cara de delante
  if (X0 > 0.001 && col.side) poly(c, [P(X0, Y0, Z0), P(X0, Y1, Z0), P(X0, Y1, Z1), P(X0, Y0, Z1)], col.side);
  if (X1 < -0.001 && col.side) poly(c, [P(X1, Y0, Z0), P(X1, Y1, Z0), P(X1, Y1, Z1), P(X1, Y0, Z1)], col.side);
  if (Y1 < EYE && col.top) poly(c, [P(X0, Y1, Z0), P(X1, Y1, Z0), P(X1, Y1, Z1), P(X0, Y1, Z1)], col.top);
  if (col.front) poly(c, [P(X0, Y0, Z0), P(X1, Y0, Z0), P(X1, Y1, Z0), P(X0, Y1, Z0)], col.front);
}
function frontRect(X0, X1, Y0, Y1, Z) { const a = P(X0, Y1, Z), b = P(X1, Y0, Z); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; }
function lin(c, x0, y0, x1, y1, stops) { const q = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => q.addColorStop(o, col)); return q; }
function softShadow(c, X0, X1, Z0, Z1, a) {     // sombra suave en el suelo bajo un mueble
  const p0 = P(X0, 0, Z0), p1 = P(X1, 0, Z1), cx = (p0[0] + p1[0]) / 2, cy = (p0[1] + p1[1]) / 2;
  const rx = Math.abs(p1[0] - p0[0]) / 2 + 30, ry = Math.abs(p1[1] - p0[1]) / 2 + 14;
  c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
  const q = c.createRadialGradient(0, 0, rx * 0.3, 0, 0, rx); q.addColorStop(0, `rgba(0,0,0,${a})`); q.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = q; c.fillRect(-rx, -rx, 2 * rx, 2 * rx); c.restore();
}
function flower(c, x, y, r, petal, mid) {
  c.fillStyle = petal;
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, 0, 7); c.fill(); }
  c.fillStyle = mid; c.beginPath(); c.arc(x, y, r * 0.3, 0, 7); c.fill();
}
function weddingPhoto(c, x, y, w, h, sepia) {    // foto de boda (siluetas, sin caras)
  c.save();
  c.fillStyle = sepia ? '#C9A97A' : '#BDBDBD'; c.fillRect(x, y, w, h);
  const q = c.createRadialGradient(x + w / 2, y + h * 0.4, 2, x + w / 2, y + h / 2, w);
  q.addColorStop(0, sepia ? 'rgba(255,240,210,0.6)' : 'rgba(255,255,255,0.5)'); q.addColorStop(1, 'rgba(0,0,0,0.25)'); c.fillStyle = q; c.fillRect(x, y, w, h);
  const ink = sepia ? '#5C4026' : '#3A3A3A';
  // novio
  c.fillStyle = ink; c.beginPath(); c.arc(x + w * 0.38, y + h * 0.36, w * 0.09, 0, 7); c.fill();
  c.beginPath(); c.moveTo(x + w * 0.24, y + h); c.lineTo(x + w * 0.27, y + h * 0.5); c.quadraticCurveTo(x + w * 0.38, y + h * 0.44, x + w * 0.49, y + h * 0.5); c.lineTo(x + w * 0.5, y + h); c.fill();
  // novia con velo
  c.fillStyle = sepia ? '#F1E2C6' : '#F2F2F2';
  c.beginPath(); c.moveTo(x + w * 0.5, y + h); c.quadraticCurveTo(x + w * 0.55, y + h * 0.42, x + w * 0.63, y + h * 0.3); c.quadraticCurveTo(x + w * 0.76, y + h * 0.42, x + w * 0.8, y + h); c.fill();
  c.fillStyle = sepia ? '#8A6A48' : '#555'; c.beginPath(); c.arc(x + w * 0.63, y + h * 0.38, w * 0.075, 0, 7); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- el salón (se pinta una vez por estilo)
function makeRoom(style) {
  const old = style === 'old';
  const cv = document.createElement('canvas'); cv.width = PW * PR * RS; cv.height = PH * PR * RS;
  const c = cv.getContext('2d'); c.scale(PR * RS, PR * RS);
  // paredes, suelo y techo
  const wallB = old ? '#CDAE78' : '#9EA5AE', wallS = old ? '#B9965F' : '#878E97', ceil = old ? '#D8C9A8' : '#B8BEC6';
  poly(c, [P(-1, 1, 0), P(1, 1, 0), P(1, 1, 1), P(-1, 1, 1)], ceil);
  poly(c, [P(-1, 0, 0), P(-1, 1, 0), P(-1, 1, 1), P(-1, 0, 1)], wallS);
  poly(c, [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)], wallS);
  poly(c, [P(-1, 0, 1), P(1, 0, 1), P(1, 1, 1), P(-1, 1, 1)], wallB);
  if (old) {                                 // papel pintado de rayas con motivos
    for (let i = 0; i < 26; i++) {
      const X0 = -1 + i * 2 / 26, X1 = X0 + 1 / 26;
      poly(c, [P(X0, 0, 1), P(X1, 0, 1), P(X1, 1, 1), P(X0, 1, 1)], 'rgba(170,110,40,0.13)');
      for (let j = 0; j < 9; j++) { const p = P(X0 + 1.5 / 26, 0.08 + j * 0.11 + (i % 2) * 0.055, 1); flower(c, p[0], p[1], 3.2, 'rgba(160,90,30,0.22)', 'rgba(120,60,20,0.25)'); }
    }
    for (const X of [-1, 1]) for (let i = 0; i < 14; i++) {
      const Z0 = i / 14, Z1 = Z0 + 0.5 / 14;
      poly(c, [P(X, 0, Z0), P(X, 0, Z1), P(X, 1, Z1), P(X, 1, Z0)], 'rgba(150,95,30,0.12)');
    }
  }
  // suelo: parqué (abuelos) o moqueta gris (hoy)
  poly(c, [P(-1, 0, 0), P(1, 0, 0), P(1, 0, 1), P(-1, 0, 1)], old ? '#7A4C2A' : '#5F646B');
  if (old) {
    c.lineWidth = 1.4;
    for (let i = 0; i <= 22; i++) {
      const X = -1 + i * 2 / 22, a = P(X, 0, 1), b = P(X, 0, 0);
      c.strokeStyle = 'rgba(60,32,14,0.55)'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      if (i < 22) for (let j = 0; j < 4; j++) {
        const Z = clamp(hash(i * 7 + j) * 0.95 + 0.02), p = P(X, 0, Z), q = P(X + 2 / 22, 0, Z);
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke();
        poly(c, [P(X, 0, Z), P(X + 2 / 22, 0, Z), P(X + 2 / 22, 0, Math.min(1, Z + 0.12)), P(X, 0, Math.min(1, Z + 0.12))], `rgba(${hash(i + j) > 0.5 ? '255,210,160' : '40,20,8'},0.06)`);
      }
    }
  } else {
    for (let i = 0; i < 2600; i++) { const X = hash(i * 1.3) * 2 - 1, Z = hash(i * 2.7 + 1), p = P(X, 0, Z); c.fillStyle = `rgba(${hash(i) > 0.5 ? '255,255,255' : '0,0,0'},0.05)`; c.fillRect(p[0], p[1], 2, 1.5); }
  }
  // rodapiés y moldura
  const sk = old ? '#6E4728' : '#F4F5F7';
  poly(c, [P(-1, 0, 1), P(1, 0, 1), P(1, 0.035, 1), P(-1, 0.035, 1)], sk);
  poly(c, [P(-1, 0, 0), P(-1, 0, 1), P(-1, 0.035, 1), P(-1, 0.035, 0)], sk);
  poly(c, [P(1, 0, 0), P(1, 0, 1), P(1, 0.035, 1), P(1, 0.035, 0)], sk);
  // esquinas en sombra (oclusión)
  for (const [a, b] of [[P(-1, 0, 1), P(-1, 1, 1)], [P(1, 0, 1), P(1, 1, 1)]]) {
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 10; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  // ventana (pared derecha), de noche
  const wz = old ? [0.38, 0.72] : [0.22, 0.8], wy = old ? [0.32, 0.74] : [0.2, 0.84];
  poly(c, [P(1, wy[0], wz[0]), P(1, wy[0], wz[1]), P(1, wy[1], wz[1]), P(1, wy[1], wz[0])], old ? '#5A3A20' : '#2B2F35');
  const gi = 0.025;
  poly(c, [P(1, wy[0] + gi, wz[0] + gi), P(1, wy[0] + gi, wz[1] - gi), P(1, wy[1] - gi, wz[1] - gi), P(1, wy[1] - gi, wz[0] + gi)], old ? '#1C2638' : '#141B28');
  if (old) {
    const m = (wz[0] + wz[1]) / 2; const a = P(1, wy[0], m), b = P(1, wy[1], m);
    c.strokeStyle = '#5A3A20'; c.lineWidth = 5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    const mo = P(1, wy[1] - 0.08, wz[0] + 0.08); c.fillStyle = 'rgba(240,235,210,0.85)'; c.beginPath(); c.arc(mo[0], mo[1], 7, 0, 7); c.fill();
    for (const [z0, z1] of [[wz[0] - 0.03, wz[0] + 0.07], [wz[1] - 0.07, wz[1] + 0.03]]) {   // visillos de encaje
      poly(c, [P(1, wy[0] - 0.04, z0), P(1, wy[0] - 0.04, z1), P(1, wy[1] + 0.05, z1), P(1, wy[1] + 0.05, z0)], 'rgba(250,246,236,0.72)');
      for (let k = 0; k < 6; k++) { const p = P(1, wy[0] + k * 0.07, (z0 + z1) / 2); c.fillStyle = 'rgba(200,190,170,0.35)'; c.beginPath(); c.arc(p[0], p[1], 3, 0, 7); c.fill(); }
    }
  } else {
    for (let i = 0; i < 26; i++) { const p = P(1, wy[0] + 0.05 + hash(i + 5) * 0.4, wz[0] + 0.05 + hash(i + 9) * (wz[1] - wz[0] - 0.1)); c.fillStyle = `rgba(255,${200 + 50 * hash(i)},150,${0.5 + 0.4 * hash(i + 2)})`; c.fillRect(p[0], p[1], 2.5, 2.5); }
    poly(c, [P(1, wy[0] - 0.04, wz[0] - 0.06), P(1, wy[0] - 0.04, wz[0] + 0.06), P(1, wy[1] + 0.06, wz[0] + 0.06), P(1, wy[1] + 0.06, wz[0] - 0.06)], 'rgba(205,210,215,0.65)');
  }
  // cuadros y reloj (pared del fondo)
  if (old) {
    let r = frontRect(-0.14, 0.14, 0.47, 0.7, 1); c.fillStyle = '#7A5426'; c.fillRect(r[0] - 7, r[1] - 7, r[2] + 14, r[3] + 14);
    c.fillStyle = '#B8904A'; c.fillRect(r[0] - 3, r[1] - 3, r[2] + 6, r[3] + 6); weddingPhoto(c, r[0], r[1], r[2], r[3], true);
    r = frontRect(-0.62, -0.47, 0.45, 0.8, 1);                                  // reloj de péndulo
    c.fillStyle = '#5E3B1E'; crr(c, r[0], r[1], r[2], r[3], 8); c.fill();
    c.fillStyle = '#F2E6CC'; c.beginPath(); c.arc(r[0] + r[2] / 2, r[1] + r[2] / 2 + 4, r[2] * 0.36, 0, 7); c.fill();
    c.strokeStyle = '#3A2410'; c.lineWidth = 2; c.beginPath(); c.moveTo(r[0] + r[2] / 2, r[1] + r[2] / 2 + 4); c.lineTo(r[0] + r[2] / 2 + 6, r[1] + r[2] / 2 - 6); c.stroke();
    c.fillStyle = '#C9A040'; c.beginPath(); c.arc(r[0] + r[2] / 2, r[1] + r[3] * 0.8, 7, 0, 7); c.fill();
  } else {
    let r = frontRect(-0.62, -0.26, 0.44, 0.74, 1);                             // lámina moderna
    c.fillStyle = '#F7F7F5'; c.fillRect(r[0], r[1], r[2], r[3]);
    c.fillStyle = '#E2B04A'; c.beginPath(); c.arc(r[0] + r[2] * 0.38, r[1] + r[3] * 0.45, r[3] * 0.24, 0, 7); c.fill();
    c.fillStyle = '#2E3A4A'; c.fillRect(r[0] + r[2] * 0.5, r[1] + r[3] * 0.3, r[2] * 0.3, r[3] * 0.5);
    r = frontRect(0.26, 0.66, 0.5, 0.515, 1); c.fillStyle = '#F5F5F3'; c.fillRect(r[0], r[1], r[2], r[3]);   // balda
    const ph = frontRect(0.3, 0.4, 0.515, 0.62, 1); c.fillStyle = '#222'; c.fillRect(ph[0] - 3, ph[1] - 3, ph[2] + 6, ph[3] + 6);
    weddingPhoto(c, ph[0], ph[1], ph[2], ph[3], false);                          // la misma foto de boda, en blanco y negro
    const pot = frontRect(0.5, 0.58, 0.515, 0.57, 1); c.fillStyle = '#EDEDED'; c.fillRect(pot[0], pot[1], pot[2], pot[3]);
    c.strokeStyle = '#3F7A4A'; c.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28; c.beginPath(); c.moveTo(pot[0] + pot[2] / 2, pot[1]); c.quadraticCurveTo(pot[0] + pot[2] / 2 + Math.cos(a) * 20, pot[1] - 30, pot[0] + pot[2] / 2 + Math.cos(a) * 34, pot[1] + Math.sin(a) * 40); c.stroke(); }
    // tira LED en el techo
    const a = P(-1, 0.995, 1), b = P(1, 0.995, 1); c.strokeStyle = 'rgba(160,200,255,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  // lámpara de techo
  if (old) { const p = P(0, 0.985, 0.55); c.fillStyle = '#F6E7C3'; c.beginPath(); c.ellipse(p[0], p[1] + 10, 46, 18, 0, 0, 7); c.fill(); }
  else for (const X of [-0.5, 0, 0.5]) { const p = P(X, 1, 0.55); c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(p[0], p[1] + 3, 12, 4, 0, 0, 7); c.fill(); }
  // alfombra
  if (old) {
    poly(c, [P(-0.62, 0, 0.28), P(0.62, 0, 0.28), P(0.62, 0, 0.74), P(-0.62, 0, 0.74)], '#8E2A1E');
    poly(c, [P(-0.55, 0, 0.32), P(0.55, 0, 0.32), P(0.55, 0, 0.7), P(-0.55, 0, 0.7)], '#B5552E');
    poly(c, [P(-0.42, 0, 0.38), P(0.42, 0, 0.38), P(0.42, 0, 0.64), P(-0.42, 0, 0.64)], '#7E2418');
    for (let i = 0; i < 7; i++) { const p = P(-0.36 + i * 0.12, 0, 0.51); flower(c, p[0], p[1], 9, '#D9A15A', '#4A140C'); }
  } else {
    poly(c, [P(-0.66, 0, 0.26), P(0.66, 0, 0.26), P(0.66, 0, 0.76), P(-0.66, 0, 0.76)], '#B9BCC1');
    for (let i = 0; i < 1600; i++) { const X = -0.64 + hash(i * 3.1) * 1.28, Z = 0.27 + hash(i * 1.7 + 2) * 0.48, p = P(X, 0, Z); c.fillStyle = `rgba(${hash(i + 1) > 0.5 ? '255,255,255' : '90,95,100'},0.18)`; c.fillRect(p[0], p[1], 1.5, 3); }
  }
  // televisor (pared izquierda)
  if (old) {
    softShadow(c, -0.98, -0.72, 0.55, 0.76, 0.25);
    box(c, -0.98, -0.72, 0, 0.2, 0.55, 0.76, { front: '#6A4424', top: '#86592F', side: '#5A381C' });       // mueble
    box(c, -0.95, -0.76, 0.2, 0.38, 0.58, 0.73, { front: '#3B2C20', top: '#4C3A2B', side: '#2E2219' });     // tele de tubo
    const s = [P(-0.76, 0.23, 0.6), P(-0.76, 0.23, 0.69), P(-0.76, 0.35, 0.69), P(-0.76, 0.35, 0.6)];
    poly(c, s, '#3E4A44'); poly(c, s.map((p, i) => [lerp(p[0], (s[0][0] + s[2][0]) / 2, 0.12), lerp(p[1], (s[0][1] + s[2][1]) / 2, 0.12)]), '#56665E');
    const an = P(-0.86, 0.38, 0.65); c.strokeStyle = '#2A2A2A'; c.lineWidth = 2; c.beginPath(); c.moveTo(an[0], an[1]); c.lineTo(an[0] - 22, an[1] - 46); c.moveTo(an[0], an[1]); c.lineTo(an[0] + 16, an[1] - 48); c.stroke();
  } else {
    box(c, -0.99, -0.8, 0, 0.1, 0.28, 0.76, { front: '#F2F2F0', top: '#FFFFFF', side: '#E4E4E2' });
    const s = [P(-0.985, 0.3, 0.3), P(-0.985, 0.3, 0.74), P(-0.985, 0.6, 0.74), P(-0.985, 0.6, 0.3)];
    poly(c, s, '#0B0D11');
    const gi2 = (u, v) => [lerp(lerp(s[0][0], s[1][0], u), lerp(s[3][0], s[2][0], u), v), lerp(lerp(s[0][1], s[1][1], u), lerp(s[3][1], s[2][1], u), v)];
    poly(c, [gi2(0.04, 0.06), gi2(0.96, 0.06), gi2(0.96, 0.94), gi2(0.04, 0.94)], '#2F5BB8');
    poly(c, [gi2(0.04, 0.55), gi2(0.96, 0.4), gi2(0.96, 0.94), gi2(0.04, 0.94)], '#1C3F86');
    poly(c, [gi2(0.6, 0.15), gi2(0.8, 0.12), gi2(0.8, 0.35), gi2(0.6, 0.38)], 'rgba(255,255,255,0.35)');
  }
  // lámpara de pie
  if (old) {
    const b = P(0.66, 0, 0.9), t0 = P(0.66, 0.55, 0.9);
    c.strokeStyle = '#4A3218'; c.lineWidth = 4; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(t0[0], t0[1]); c.stroke();
    const a0 = P(0.6, 0.52, 0.9), a1 = P(0.72, 0.52, 0.9), a2 = P(0.69, 0.64, 0.9), a3 = P(0.63, 0.64, 0.9);
    poly(c, [a0, a1, a2, a3], '#F1DDB0');
    c.strokeStyle = '#C79A55'; c.lineWidth = 2; for (let i = 0; i <= 8; i++) { const x = lerp(a0[0], a1[0], i / 8); c.beginPath(); c.moveTo(x, a0[1]); c.lineTo(x, a0[1] + 8); c.stroke(); }
  } else {
    const b = P(0.8, 0, 0.62), top = P(0.62, 0.86, 0.62), end = P(0.32, 0.66, 0.6);
    c.strokeStyle = '#B9BEC4'; c.lineWidth = 4; c.beginPath(); c.moveTo(b[0], b[1]); c.quadraticCurveTo(top[0] + 60, top[1] - 40, end[0], end[1]); c.stroke();
    c.fillStyle = '#C7CCD2'; c.beginPath(); c.ellipse(end[0], end[1] + 6, 28, 16, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#9AA0A6'; c.beginPath(); c.ellipse(b[0], b[1], 30, 9, 0, 0, 7); c.fill();
  }
  // sofá
  const S = old ? { X0: -0.5, X1: 0.5, z0: 0.79, z1: 0.97, seat: 0.19, back: 0.42, arm: 0.29 } : { X0: -0.58, X1: 0.58, z0: 0.77, z1: 0.97, seat: 0.16, back: 0.33, arm: 0.22 };
  softShadow(c, S.X0, S.X1, S.z0, S.z1, 0.35);
  const fab = old ? { front: '#C98B3A', top: '#D79C4B', side: '#B07630' } : { front: '#7B828A', top: '#8C939B', side: '#6B7178' };
  const fab2 = old ? { front: '#BD7F31', top: '#CF9443', side: '#A86E2A' } : { front: '#858C94', top: '#979EA6', side: '#70767D' };
  if (old) {                                // patas y faldón de madera
    for (const X of [S.X0 + 0.03, S.X1 - 0.03]) box(c, X - 0.012, X + 0.012, 0, 0.04, S.z0 + 0.01, S.z0 + 0.03, { front: '#4A2C14', top: '#5A3A1E', side: '#3A220F' });
    box(c, S.X0 + 0.02, S.X1 - 0.02, 0.04, 0.09, S.z0 + 0.005, S.z1, { front: '#7A4E26', top: '#8A5A2E', side: '#6A4220' });
  } else {
    for (const X of [S.X0 + 0.04, S.X1 - 0.04]) box(c, X - 0.006, X + 0.006, 0, 0.03, S.z0 + 0.01, S.z0 + 0.02, { front: '#151515', side: '#111' });
  }
  box(c, S.X0 + 0.06, S.X1 - 0.06, old ? 0.09 : 0.03, S.back, S.z1 - 0.05, S.z1, fab2);        // respaldo
  box(c, S.X0 + 0.06, S.X1 - 0.06, old ? 0.09 : 0.03, S.seat, S.z0 + 0.02, S.z1 - 0.05, fab);     // asiento
  const nC = old ? 2 : 3;
  for (let i = 0; i < nC; i++) {            // cojines
    const X0 = lerp(S.X0 + 0.08, S.X1 - 0.08, i / nC) + 0.006, X1 = lerp(S.X0 + 0.08, S.X1 - 0.08, (i + 1) / nC) - 0.006;
    box(c, X0, X1, S.seat, S.seat + 0.05, S.z0 + 0.025, S.z1 - 0.06, fab2);
    const r = frontRect(X0, X1, S.seat, S.seat + 0.05, S.z0 + 0.025); c.fillStyle = 'rgba(255,255,255,0.06)'; crr(c, r[0], r[1], r[2], r[3] * 0.4, 6); c.fill();
  }
  for (const [X0, X1] of [[S.X0, S.X0 + 0.07], [S.X1 - 0.07, S.X1]]) box(c, X0, X1, old ? 0.09 : 0.03, S.arm, S.z0, S.z1, fab);   // brazos
  if (old) {                                // flores del tapizado (caras de delante)
    for (const [X0, X1, Y0, Y1, Z] of [[S.X0 + 0.06, S.X1 - 0.06, S.seat + 0.05, S.back, S.z1 - 0.05], [S.X0, S.X0 + 0.07, 0.09, S.arm, S.z0], [S.X1 - 0.07, S.X1, 0.09, S.arm, S.z0], [S.X0 + 0.06, S.X1 - 0.06, 0.09, S.seat, S.z0 + 0.02]]) {
      const r = frontRect(X0, X1, Y0, Y1, Z);
      c.save(); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip();
      for (let i = 0; i < 60; i++) flower(c, r[0] + hash(i * 3 + X0 * 7) * r[2], r[1] + hash(i * 5 + Y0 * 11) * r[3], 5.5, 'rgba(250,226,170,0.55)', 'rgba(140,60,20,0.6)');
      c.restore();
    }
    const tp = frontRect(-0.1, 0.1, S.seat + 0.05, S.seat + 0.13, S.z1 - 0.07); c.fillStyle = 'rgba(250,246,236,0.9)'; crr(c, tp[0], tp[1], tp[2], tp[3], 6); c.fill();   // tapete de ganchillo
  } else {
    const r = frontRect(0.28, 0.42, S.seat + 0.03, S.seat + 0.13, S.z1 - 0.07); c.fillStyle = '#D9A33F'; crr(c, r[0], r[1], r[2], r[3], 10); c.fill();   // cojín de color
  }
  // mesa de centro
  if (old) {
    softShadow(c, -0.3, 0.3, 0.42, 0.6, 0.3);
    for (const [X, Z] of [[-0.24, 0.45], [0.24, 0.45], [-0.24, 0.57], [0.24, 0.57]]) box(c, X - 0.012, X + 0.012, 0, 0.13, Z - 0.01, Z + 0.01, { front: '#4E2E14', side: '#3E2410' });
    const a = P(-0.3, 0.14, 0.42), b = P(0.3, 0.14, 0.42), d = P(0, 0.14, 0.6);
    c.fillStyle = '#7A4A22'; c.beginPath(); c.ellipse((a[0] + b[0]) / 2, (a[1] + d[1]) / 2 + 6, (b[0] - a[0]) / 2, (a[1] - d[1]) / 2 + 6, 0, 0, 7); c.fill();
    c.fillStyle = '#93602F'; c.beginPath(); c.ellipse((a[0] + b[0]) / 2, (a[1] + d[1]) / 2, (b[0] - a[0]) / 2, (a[1] - d[1]) / 2 + 2, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(250,246,236,0.92)'; c.beginPath(); c.ellipse((a[0] + b[0]) / 2, (a[1] + d[1]) / 2, (b[0] - a[0]) / 4, (a[1] - d[1]) / 4, 0, 0, 7); c.fill();
    const v = P(0, 0.14, 0.5); c.fillStyle = '#3B6E8C'; crr(c, v[0] - 10, v[1] - 34, 20, 34, 8); c.fill();
    for (let i = 0; i < 5; i++) { c.fillStyle = ['#D8442E', '#F2C14E', '#D8442E', '#F6F0E0', '#F2C14E'][i]; c.beginPath(); c.arc(v[0] - 16 + i * 8, v[1] - 44 - (i % 2) * 8, 6, 0, 7); c.fill(); }
  } else {
    softShadow(c, -0.32, 0.32, 0.4, 0.58, 0.25);
    for (const [X, Z] of [[-0.28, 0.43], [0.28, 0.43], [-0.28, 0.55], [0.28, 0.55]]) box(c, X - 0.004, X + 0.004, 0, 0.09, Z - 0.004, Z + 0.004, { front: '#111', side: '#111' });
    box(c, -0.32, 0.32, 0.09, 0.11, 0.4, 0.58, { front: '#E9E9E7', top: '#F7F7F5', side: '#DADAD8' });
    const ph = P(0.08, 0.11, 0.48); c.fillStyle = '#111'; crr(c, ph[0] - 12, ph[1] - 6, 24, 12, 3); c.fill();
    c.fillStyle = 'rgba(120,170,255,0.9)'; crr(c, ph[0] - 10, ph[1] - 4.5, 20, 9, 2); c.fill();
    const mg = P(-0.12, 0.11, 0.5); c.fillStyle = '#E0E0DE'; crr(c, mg[0] - 8, mg[1] - 18, 16, 18, 3); c.fill();
  }
  // luz del ambiente y viñeta
  const lp = old ? P(0.66, 0.6, 0.9) : P(0.32, 0.6, 0.6);
  let q = c.createRadialGradient(lp[0], lp[1], 10, lp[0], lp[1], 640);
  q.addColorStop(0, old ? 'rgba(255,214,150,0.32)' : 'rgba(225,238,255,0.22)'); q.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = q; c.fillRect(0, 0, PW, PH);
  q = c.createRadialGradient(PW / 2, PH * 0.45, PW * 0.3, PW / 2, PH * 0.45, PW * 0.75);
  q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, old ? 'rgba(40,18,2,0.62)' : 'rgba(6,10,20,0.6)');
  c.fillStyle = q; c.fillRect(0, 0, PW, PH);
  c.fillStyle = old ? 'rgba(255,170,80,0.08)' : 'rgba(40,70,140,0.10)'; c.fillRect(0, 0, PW, PH);
  if (!old) {                               // la tele encendida y la tira LED tiñen de azul
    const tv = P(-0.985, 0.45, 0.52); const q2 = c.createRadialGradient(tv[0] + 40, tv[1], 10, tv[0] + 40, tv[1], 420);
    q2.addColorStop(0, 'rgba(90,140,255,0.28)'); q2.addColorStop(1, 'rgba(90,140,255,0)'); c.fillStyle = q2; c.fillRect(0, 0, PW, PH);
  }
  // dónde prende y por dónde se extiende el fuego
  const fire = P(S.X0 + 0.035, S.arm, S.z0 + 0.02);
  const spots = [[S.X0 + 0.035, S.arm, S.z0 + 0.02, 1]];
  for (let i = 0; i < 6; i++) spots.push([lerp(S.X0 + 0.12, S.X1 - 0.1, i / 5), i % 2 ? S.back : S.seat + 0.05, i % 2 ? S.z1 - 0.05 : S.z0 + 0.03, 0.9]);
  spots.push([S.X1 - 0.035, S.arm, S.z0 + 0.02, 0.9]);
  const late = [[-0.4, 0, 0.36, 0.8], [0, 0, 0.3, 0.9], [0.4, 0, 0.36, 0.8], [-0.88, 0.2, 0.62, 0.8], [0.98, wy[0], (wz[0] + wz[1]) / 2, 1], [0, 0.14, 0.5, 0.7], [-0.6, 0, 0.6, 0.8], [0.6, 0, 0.6, 0.8]];
  return { cv, fire, spots: spots.map(s => [...P(s[0], s[1], s[2]), s[3], s[2]]), late: late.map(s => [...P(s[0], s[1], s[2]), s[3], s[2]]) };
}

// ---------------------------------------------------------------- el dormitorio (noche)
function makeBedroom() {
  const cv = document.createElement('canvas'); cv.width = PW * PR * RS; cv.height = PH * PR * RS;
  const c = cv.getContext('2d'); c.scale(PR * RS, PR * RS);
  poly(c, [P(-1, 1, 0), P(1, 1, 0), P(1, 1, 1), P(-1, 1, 1)], '#232A3A');
  poly(c, [P(-1, 0, 0), P(-1, 1, 0), P(-1, 1, 1), P(-1, 0, 1)], '#26304A');
  poly(c, [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)], '#26304A');
  poly(c, [P(-1, 0, 1), P(1, 0, 1), P(1, 1, 1), P(-1, 1, 1)], '#2C3752');
  poly(c, [P(-1, 0, 0), P(1, 0, 0), P(1, 0, 1), P(-1, 0, 1)], '#3A2D24');
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(10,6,3,0.5)';
  for (let i = 0; i <= 16; i++) { const a2 = P(-1 + i / 8, 0, 1), b2 = P(-1 + i / 8, 0, 0); c.beginPath(); c.moveTo(a2[0], a2[1]); c.lineTo(b2[0], b2[1]); c.stroke(); }
  // marco de la puerta (centro del fondo)
  const fr = frontRect(-0.24, 0.24, 0, 0.82, 1); c.fillStyle = '#8E95A3'; c.fillRect(fr[0], fr[1], fr[2], fr[3]);
  // ventana con luna (pared izquierda) y su luz en el suelo
  poly(c, [P(-1, 0.36, 0.42), P(-1, 0.36, 0.74), P(-1, 0.78, 0.74), P(-1, 0.78, 0.42)], '#8C95A8');
  poly(c, [P(-1, 0.39, 0.45), P(-1, 0.39, 0.71), P(-1, 0.75, 0.71), P(-1, 0.75, 0.45)], '#0C1630');
  const mo = P(-1, 0.66, 0.52); c.fillStyle = 'rgba(235,240,255,0.95)'; c.beginPath(); c.arc(mo[0], mo[1], 8, 0, 7); c.fill();
  poly(c, [P(-0.98, 0, 0.45), P(-0.98, 0, 0.71), P(-0.35, 0, 0.62), P(-0.35, 0, 0.38)], 'rgba(150,180,255,0.10)');
  // mesilla y cama (contra la pared derecha)
  box(c, 0.08, 0.26, 0, 0.2, 0.86, 0.98, { front: '#4A3E32', top: '#57493B', side: '#3E342A' });
  const ph = P(0.17, 0.2, 0.9); c.fillStyle = '#111'; crr(c, ph[0] - 8, ph[1] - 4, 16, 8, 2); c.fill();
  softShadow(c, 0.3, 0.98, 0.36, 0.95, 0.4);
  box(c, 0.32, 0.99, 0, 0.12, 0.36, 0.94, { front: '#3E3024', top: '#4A3A2C', side: '#33271D' });         // base
  box(c, 0.32, 0.99, 0.12, 0.2, 0.37, 0.93, { front: '#9FAABB', top: '#B3BDCC', side: '#8C97A8' });      // colchón
  box(c, 0.32, 0.99, 0, 0.42, 0.93, 0.97, { front: '#33271D', top: '#3E3024', side: '#2A2018' });       // cabecero
  poly(c, [P(0.32, 0.205, 0.37), P(0.99, 0.205, 0.37), P(0.99, 0.205, 0.78), P(0.32, 0.205, 0.78)], '#34507E');   // edredón
  poly(c, [P(0.32, 0.12, 0.37), P(0.99, 0.12, 0.37), P(0.99, 0.205, 0.37), P(0.32, 0.205, 0.37)], '#2B4469');
  // quien duerme: el bulto bajo el edredón, el hombro y la cabeza en la almohada
  const b1 = P(0.66, 0.205, 0.58), b2 = P(0.62, 0.205, 0.74);
  c.fillStyle = '#3F5D8F'; c.beginPath(); c.ellipse(b1[0], b1[1] - 14, 150, 30, -0.06, Math.PI, 0); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.10)'; c.beginPath(); c.ellipse(b1[0] - 20, b1[1] - 30, 90, 10, -0.06, Math.PI, 0); c.fill();
  poly(c, [P(0.4, 0.205, 0.8), P(0.92, 0.205, 0.8), P(0.92, 0.25, 0.9), P(0.4, 0.25, 0.9)], '#C3CBD8');       // almohada
  c.fillStyle = '#3F5D8F'; c.beginPath(); c.ellipse(b2[0] - 4, b2[1] - 16, 46, 20, 0, Math.PI, 0); c.fill();      // hombro
  const hd = P(0.58, 0.27, 0.84); c.fillStyle = '#C99A7A'; c.beginPath(); c.ellipse(hd[0] + 8, hd[1] + 6, 20, 16, -0.2, 0, 7); c.fill();
  c.fillStyle = '#2E1E14'; c.beginPath(); c.ellipse(hd[0] - 4, hd[1], 26, 19, -0.2, 0, 7); c.fill();
  // luz de luna y viñeta
  let q = c.createRadialGradient(PW * 0.2, PH * 0.4, 20, PW * 0.2, PH * 0.4, PW * 0.8);
  q.addColorStop(0, 'rgba(120,150,230,0.12)'); q.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = q; c.fillRect(0, 0, PW, PH);
  q = c.createRadialGradient(PW / 2, PH * 0.45, PW * 0.3, PW / 2, PH * 0.45, PW * 0.75);
  q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(0,0,8,0.55)'); c.fillStyle = q; c.fillRect(0, 0, PW, PH);
  return { cv };
}
function grainCanvas() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d'), im = c.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const v = Math.floor(hash(i * 0.37 + 3) * 255); im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 26; }
  c.putImageData(im, 0, 0); return cv;
}

// ---------------------------------------------------------------- fuego y humo
function flame(x, y, s, k, t, seed = 0, halo = 1) {   // y = base; s = escala; k = intensidad
  if (k <= 0.01 || s <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (halo > 0) glowAt(x, y - 80 * s, 300 * s, [255, 110, 35], 0.4 * k * halo);
  for (let i = 0; i < 6; i++) {
    const ph = seed * 3.1 + i * 1.7, off = (i - 2.5) / 2.5;
    const h = s * k * (210 + 70 * Math.sin(t * 7.3 + ph) + 35 * Math.sin(t * 13.1 + ph * 2)) * (1 - 0.4 * Math.abs(off));
    const w = s * (44 + 12 * Math.sin(t * 5 + ph)) * (1 - 0.3 * Math.abs(off));
    const bx = x + off * 42 * s, sw = s * k * (24 * Math.sin(t * 4.1 + ph) + 11 * Math.sin(t * 9.7 + ph * 1.3));
    g.beginPath(); g.moveTo(bx - w, y);
    g.bezierCurveTo(bx - w * 1.08, y - h * 0.42, bx + sw * 0.4 - w * 0.4, y - h * 0.72, bx + sw, y - h);
    g.bezierCurveTo(bx + sw * 0.4 + w * 0.4, y - h * 0.72, bx + w * 1.08, y - h * 0.42, bx + w, y);
    g.quadraticCurveTo(bx, y + w * 0.5, bx - w, y);
    const q = g.createLinearGradient(0, y + w * 0.4, 0, y - h);
    q.addColorStop(0, `rgba(255,236,190,${(0.5 * k).toFixed(3)})`); q.addColorStop(0.25, `rgba(255,186,80,${(0.42 * k).toFixed(3)})`);
    q.addColorStop(0.62, `rgba(255,105,30,${(0.26 * k).toFixed(3)})`); q.addColorStop(1, 'rgba(190,40,10,0)');
    g.fillStyle = q; g.fill();
  }
  g.restore();
}
function smokeLayer(R, Ys, dark, t, seed) {    // capa de humo que baja del techo hasta la altura Ys (0 suelo … 1 techo)
  if (Ys >= 0.995) return;
  const yF = P(-1, Ys, 0)[1], bl = P(-1, Ys, 1), br = P(1, Ys, 1);
  const col = dark ? [16, 16, 18] : [92, 88, 82], a = dark ? 0.94 : 0.78;
  g.save();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(PW, 0); g.lineTo(PW, yF);
  for (let i = 0; i <= 24; i++) { const u = i / 24, x = lerp(br[0], bl[0], u), y = br[1] + 7 * Math.sin(u * 11 + t * 1.7 + seed) + 5 * Math.sin(u * 23 - t * 2.3); if (i === 0) g.lineTo(PW, yF); g.lineTo(x, y); }
  g.lineTo(0, yF); g.closePath();
  g.fillStyle = lin(g, 0, 0, 0, Math.max(yF, 10), [[0, rgbs(col, a)], [0.8, rgbs(col, a * 0.92)], [1, rgbs(col, a * 0.7)]]); g.fill();
  // bocanadas que ruedan por el borde
  const edge = x => x < bl[0] ? lerp(yF, bl[1], x / bl[0]) : x > br[0] ? lerp(br[1], yF, (x - br[0]) / (PW - br[0])) : br[1];
  for (let i = 0; i < 9; i++) {
    const u = (hash(i + seed) + t * 0.05 * (0.5 + hash(i + 3))) % 1, x = lerp(30, PW - 30, u), yb = edge(x);
    const r = 60 + 50 * hash(i + 7);
    const q = g.createRadialGradient(x, yb - 10, 0, x, yb - 10, r);
    q.addColorStop(0, rgbs(col, a * 0.55)); q.addColorStop(1, rgbs(col, 0));
    g.fillStyle = q; g.fillRect(x - r, yb - 10 - r, 2 * r, 2 * r);
  }
  g.restore();
}

// ---------------------------------------------------------------- línea de tiempo
function slInit() {
  const L = window.LINES_, c = k => CUE[k];
  SL = {};
  SL.race0 = c('quemaron') - 0.05;                          // arranca el ensayo (acelerado)
  SL.foNew = c('horno') + 0.04;                             // tu salón: flashover (3:30)
  SL.foOld = Math.max(SL.foNew + 1.2, (c('hora2') ?? L[5].end) - 0.25);   // el de los abuelos: flashover (29:30) en «media hora»
  SL.v1 = TFO.new / (SL.foNew - SL.race0);
  SL.v2 = (TFO.old - TFO.new) / (SL.foOld - SL.foNew);
  SL.bed0 = L[6].start - 0.05;                              // dormitorio («esta noche»)
  SL.close = c('cierra') + 0.02;                            // se cierra la puerta
  SL.split = c('ensayo2') - 0.15;                           // dos dormitorios
  SL.t38 = c('treinta'); SL.t260 = c('doscientos');
  SL.share = c('compartir'); SL.marca = c('marca');
  CUE.descripcion = SL.marca - 0.2;
  window.SL_ = SL;
}
function tau(t) {                                           // segundos del ensayo
  if (t < SL.race0) return 0;
  if (t < SL.foNew) return SL.v1 * (t - SL.race0);
  return Math.min(TFO.old + 60, TFO.new + SL.v2 * (t - SL.foNew));
}
const mmss = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

// ---------------------------------------------------------------- un salón ardiendo
function drawRoom(style, px, py, t, a, sc = 1) {
  if (a <= 0.01) return;
  const R = ROOM[style], ta = tau(t), tf = TFO[style];
  const kr = clamp(ta / tf), k = Math.max(0.05, kr), fo = ta >= tf, tfo = style === 'new' ? SL.foNew : SL.foOld;
  const f = fo ? eo(prog(t, tfo, 0.5)) : 0;
  const shake = fo ? 10 * Math.exp(-Math.pow((t - tfo - 0.08) / 0.18, 2)) : 0;
  const fl = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.7);
  g.save(); g.globalAlpha = a;
  g.translate(px + PW / 2 + Math.sin(t * 90) * shake, py + PH / 2 + Math.cos(t * 77) * shake * 0.6); g.scale(sc, sc); g.translate(-PW / 2, -PH / 2);
  // sombra del panel
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; rr(0, 0, PW, PH, 26); g.fillStyle = '#000'; g.fill(); g.restore();
  g.save(); rr(0, 0, PW, PH, 26); g.clip();
  g.drawImage(R.cv, 0, 0, PW, PH);
  // la habitación se oscurece con el humo y se tiñe con el fuego
  g.fillStyle = `rgba(0,0,0,${(0.45 * Math.pow(kr, 1.3) + 0.25 * f).toFixed(3)})`; g.fillRect(0, 0, PW, PH);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = `rgba(255,105,30,${((0.03 + 0.17 * kr) * fl).toFixed(3)})`; g.fillRect(0, 0, PW, PH);
  glowAt(R.fire[0], R.fire[1] - 30, 160 + 520 * k, [255, 120, 40], (0.35 + 0.4 * k) * fl);
  g.restore();
  // llamas: prende en el brazo del sofá y se extiende por el sofá
  const n = R.spots.length;
  for (let i = 0; i < n; i++) {
    const th = i === 0 ? 0 : 0.2 + 0.68 * (i / (n - 1));
    const kk = fo ? 1 : clamp((kr - th) / 0.22);
    if (kk <= 0 && i > 0) continue;
    const s = (i === 0 ? 0.32 + 0.75 * Math.pow(kr, 0.9) : 0.25 + 0.6 * kk) * R.spots[i][2] * (1 + 0.5 * f);
    flame(R.spots[i][0], R.spots[i][1] + 4 + (i % 3) * 6, s, i === 0 ? 1 : 0.78, t, i + (style === 'new' ? 0 : 20), i === 0 ? 1 : 0.12);
  }
  if (kr < 0.15) for (let i = 0; i < 10; i++) {   // hilo de humo de la llamita
    const P2 = 2.2, age = (t + i * P2 / 10) % P2, u = age / P2, x = R.fire[0] + 14 * Math.sin(age * 2.2 + i) * u, y = R.fire[1] - 50 - u * 230;
    const r = 10 + 40 * u, q = g.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, `rgba(${style === 'new' ? '40,40,44' : '120,112,100'},${(0.28 * Math.sin(Math.PI * u) * (1 - kr / 0.15)).toFixed(3)})`); q.addColorStop(1, 'rgba(60,60,60,0)');
    g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // humo: capa que baja del techo (solo cuando arranca el ensayo); el de hoy, negro y espeso
  if (kr > 0.002) {
    const Ys = fo ? lerp(0.3, 0.16, f) : 1 - (0.04 + 0.66 * Math.pow(kr, 1.2));
    smokeLayer(R, Ys, style === 'new', t, style === 'new' ? 1 : 5);
  }
  // rollover: lenguas de fuego que ruedan dentro del humo justo antes del flashover
  const ro = fo ? 1 - f : clamp((kr - 0.82) / 0.18);
  if (ro > 0.01) {
    const Yr = fo ? 0.6 : 1 - (0.04 + 0.66 * Math.pow(kr, 1.2)) + 0.06;
    for (let i = 0; i < 5; i++) {
      const p = P(-0.75 + i * 0.37 + 0.06 * Math.sin(t * 2.6 + i), Math.min(0.97, Yr + 0.1 * hash(i + 7)), 0.35 + 0.5 * hash(i + 3));
      g.save(); g.translate(p[0], p[1]); g.scale(1.8, -0.5); g.globalAlpha = 0.42;
      flame(0, 0, 0.26 + 0.16 * ro, 0.38 * ro, t, 40 + i, 0); g.restore();
    }
  }
  // flashover: arde todo a la vez
  if (f > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,120,30,${(0.16 * f * fl).toFixed(3)})`; g.fillRect(0, 0, PW, PH);
    g.restore();
    const items = [];
    for (let i = 0; i < 30; i++) {
      const X = -0.97 + 1.94 * hash(i * 3.3 + 1), Z = 0.06 + 0.9 * hash(i * 1.7 + 2), Y = hash(i + 9) < 0.75 ? 0 : 0.2 * hash(i + 4);
      items.push([P(X, Y, Z), (0.28 + 0.5 * hash(i + 6)) * (1.25 - 0.65 * Z), Z, 100 + i]);
    }
    for (const sp of R.late) items.push([[sp[0], sp[1]], 0.55 * sp[2], sp[3], 60 + items.length]);
    items.sort((p, q) => q[2] - p[2]);                     // del fondo hacia delante
    for (const [p, sc2, , sd] of items) flame(p[0], p[1] + 4, sc2 * (0.55 + 0.45 * f), 1, t, sd, 0.15);
    // brasas que suben
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const P2 = 1.2 + hash(i + 31), age = (t + hash(i + 32) * P2) % P2, u = age / P2;
      const x = hash(i + 33) * PW + 30 * Math.sin(age * 3 + i), y = PH - u * PH * 1.1;
      g.fillStyle = `rgba(255,${Math.round(170 + 60 * hash(i))},90,${(f * Math.sin(Math.PI * u) * 0.9).toFixed(3)})`;
      g.beginPath(); g.arc(x, y, 1.5 + 2 * hash(i + 34), 0, 7); g.fill();
    }
    const flash = Math.exp(-Math.pow((t - tfo - 0.04) / 0.11, 2));
    g.fillStyle = `rgba(255,240,210,${(0.7 * flash).toFixed(3)})`; g.fillRect(0, 0, PW, PH);
    g.restore();
    // humo negro que lo tapa todo arriba
    g.fillStyle = lin(g, 0, 0, 0, PH * 0.5, [[0, `rgba(12,8,6,${(0.85 * f).toFixed(3)})`], [1, 'rgba(12,8,6,0)']]); g.fillRect(0, 0, PW, PH * 0.5);
  }
  if (style === 'old' && GRAIN) {               // grano de película
    g.save(); g.globalAlpha = a * 0.8; g.translate(-(Math.floor(t * 24) * 37) % 256, -(Math.floor(t * 24) * 53) % 256);
    g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(0, 0, PW + 256, PH + 256); g.restore();
  }
  g.restore();
  rr(0, 0, PW, PH, 26); g.strokeStyle = style === 'old' ? 'rgba(255,214,150,0.55)' : 'rgba(190,210,235,0.45)'; g.lineWidth = 3; g.stroke();
  g.restore();
}
function panelLabel(px, py, t0, title, sub, warm, t) {
  const a = eo(prog(t, t0 - 0.05, 0.3));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.font = '400 46px Bebas'; const w = Math.max(g.measureText(title).width, 10);
  g.font = '700 16px SpaceMono'; const w2 = g.measureText(sub).width;
  const bw = Math.max(w, w2) + 44;
  rr(px + 18, py + 18, bw, 88, 18); g.fillStyle = 'rgba(10,10,12,0.72)'; g.fill();
  txt(title, px + 40, py + 64, 46, warm ? '#FFE3B8' : '#E6EEF8', 400, 'left', 'Bebas');
  txt(sub, px + 40, py + 90, 16, warm ? '#E0B47A' : '#9FB3C8', 700, 'left', 'SpaceMono');
  g.restore();
}
function timerBox(px, py, t0, style, t) {      // cuenta atrás «para salir»
  const a = back(prog(t, t0 - 0.05, 0.35));
  if (a <= 0) return;
  const ta = tau(t), rem = TFO[style] - ta, done = rem <= 0;
  const pulse = 1 + (t < SL.race0 ? 0.06 * Math.exp(-Math.pow((t - CUE.sabes - 0.1) / 0.18, 2)) : 0);
  const blink = done ? (Math.floor(t * 4) % 2 ? 0.55 : 1) : 1;
  const col = done ? '#FF4D3D' : style === 'new' ? '#FF5A4E' : (rem < 300 ? '#FF8A3D' : '#FFE3B8');
  const x = px + PW - 264, y = py + 18;
  g.save(); g.globalAlpha = clamp(a); g.translate(x + 123, y + 62); g.scale(a * pulse, a * pulse); g.translate(-123, -62);
  rr(0, 0, 246, 124, 20); g.fillStyle = 'rgba(8,8,10,0.8)'; g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  g.globalAlpha = clamp(a) * blink; txt(mmss(rem), 123, 82, 92, col, 400, 'center', 'Bebas');
  g.globalAlpha = clamp(a); txt(done ? 'FLASHOVER' : 'PARA SALIR', 123, 112, 17, done ? '#FF8A7A' : '#B9B9C0', 700, 'center', 'SpaceMono');
  g.restore();
  // ×N mientras va acelerado
  const fast = t > SL.race0 && ta < TFO.old;
  if (fast) {
    const v = t < SL.foNew ? SL.v1 : SL.v2, lab = '×' + (v > 100 ? Math.round(v / 10) * 10 : Math.round(v));
    g.save(); g.globalAlpha = eo(prog(t, SL.race0, 0.2)) * (done ? 0.4 : 1);
    rr(x - 112, y + 40, 98, 46, 23); g.fillStyle = 'rgba(8,8,10,0.75)'; g.fill();
    txt('▶▶ ' + lab, x - 63, y + 74, 30, '#FFFFFF', 400, 'center', 'Bebas');
    g.restore();
  }
}
function lens(px, py, t0, t1, cx, cy, ax, ay, kind, t, labels) {   // lupa sobre el cojín
  const a = back(prog(t, t0 - 0.05, 0.4)) * (1 - prog(t, t1, 0.3));
  if (a <= 0.01) return;
  const R = 128 * Math.min(1, a);
  g.save(); g.globalAlpha = clamp(a);
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.setLineDash([8, 8]);
  g.beginPath(); g.moveTo(px + ax, py + ay); g.lineTo(px + cx, py + cy); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(px + ax, py + ay, 10, 0, 7); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
  g.save(); g.beginPath(); g.arc(px + cx, py + cy, R, 0, 7); g.clip();
  g.fillStyle = kind === 'cotton' ? '#EFE6D6' : '#E8C877'; g.fillRect(px + cx - R, py + cy - R, 2 * R, 2 * R);
  if (kind === 'cotton') {                    // cápsulas de algodón con su cáscara
    g.fillStyle = '#D9C9A8'; g.fillRect(px + cx - R, py + cy - R, 2 * R, 2 * R);
    for (const [ox, oy, s2] of [[-52, -40, 0.9], [48, -48, 0.8], [-36, 52, 0.85], [56, 46, 0.95], [6, 2, 1.05]]) {
      const x = px + cx + ox, y = py + cy + oy;
      g.fillStyle = '#5A3A1E';
      for (let i = 0; i < 5; i++) { const an = i * 1.2566 + 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an - 0.3) * 40 * s2, y + Math.sin(an - 0.3) * 40 * s2); g.lineTo(x + Math.cos(an) * 52 * s2, y + Math.sin(an) * 52 * s2); g.lineTo(x + Math.cos(an + 0.3) * 40 * s2, y + Math.sin(an + 0.3) * 40 * s2); g.closePath(); g.fill(); }
      for (let i = 0; i < 5; i++) {
        const an = i * 1.2566, bx = x + Math.cos(an) * 16 * s2, by = y + Math.sin(an) * 16 * s2, r = 22 * s2;
        const q = g.createRadialGradient(bx - r * 0.35, by - r * 0.35, 2, bx, by, r); q.addColorStop(0, '#FFFFFF'); q.addColorStop(0.7, '#F1ECE2'); q.addColorStop(1, '#D8CFC0');
        g.fillStyle = q; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
      }
    }
  } else {                                    // espuma: celdas con burbujas
    for (let i = 0; i < 70; i++) {
      const x = px + cx + (hash(i + 21) - 0.5) * 2 * R, y = py + cy + (hash(i + 22) - 0.5) * 2 * R, r = 7 + 14 * hash(i + 23);
      g.fillStyle = 'rgba(160,120,40,0.35)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,240,190,0.7)'; g.lineWidth = 2; g.stroke();
    }
    const dp = prog(t, CUE.petroleo - 0.05, 0.35);   // gota de petróleo
    if (dp > 0) {
      const s = back(dp), x = px + cx, y = py + cy;
      g.save(); g.translate(x, y); g.scale(s, s);
      g.beginPath(); g.moveTo(0, -62); g.bezierCurveTo(26, -24, 44, 6, 44, 26); g.arc(0, 26, 44, 0, Math.PI); g.bezierCurveTo(-44, 6, -26, -24, 0, -62);
      const q = g.createRadialGradient(-14, 6, 4, 0, 20, 60); q.addColorStop(0, '#4A4A52'); q.addColorStop(1, '#050507');
      g.fillStyle = q; g.fill(); g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-16, 14, 8, 14, -0.4, 0, 7); g.fill();
      g.restore();
    }
  }
  g.restore();
  g.beginPath(); g.arc(px + cx, py + cy, R, 0, 7); g.strokeStyle = '#FFFFFF'; g.lineWidth = 7; g.stroke();
  // rótulos
  let ly = py + cy - 30;
  for (const [t2, s, col] of labels) {
    const la = eo(prog(t, t2 - 0.05, 0.25));
    if (la <= 0) continue;
    g.globalAlpha = clamp(a) * la;
    g.font = '400 48px Bebas'; g.textAlign = 'right'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(8,8,10,0.85)'; g.lineWidth = 9; g.strokeText(s, px + cx - R - 24, ly);
    g.fillStyle = col; g.fillText(s, px + cx - R - 24, ly);
    ly += 54;
  }
  g.restore();
}
function badgeMid(y, t0, t1, s, t) {
  const a = eo(prog(t, t0 - 0.05, 0.3)) * (1 - prog(t, t1, 0.3));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = '700 22px SpaceMono'; const w = g.measureText(s).width + 48;
  rr(540 - w / 2, y - 25, w, 50, 25); g.fillStyle = '#FF7A1A'; g.fill();
  txt(s, 540, y + 8, 22, '#FFFFFF', 700, 'center', 'SpaceMono');
  g.restore();
}

// ---------------------------------------------------------------- el dormitorio: puerta, humo, termómetro
function drawBedroom(px, py, t, a, opts) {     // opts: {theta (0 cerrada … 1 abierta), smoke 0..1, cool 0..1, temp, tmax, label, col}
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = a; g.translate(px, py);
  g.save(); rr(0, 0, PW, PH, 26); g.clip();
  const fr = frontRect(-0.2, 0.2, 0, 0.78, 1);
  g.drawImage(BED.cv, 0, 0, PW, PH);
  // vuelve a abrir el hueco de la puerta (el lienzo lo tapa con el marco) y dibuja la hoja
  g.save(); g.beginPath(); g.rect(fr[0] + 10, fr[1] + 10, fr[2] - 20, fr[3] - 10); g.clip();
  g.fillStyle = '#1A0C06'; g.fillRect(fr[0], fr[1], fr[2], fr[3]);
  g.save(); g.globalCompositeOperation = 'lighter';
  glowAt(fr[0] + fr[2] / 2, fr[1] + fr[3] * 0.7, fr[2] * 1.4, [255, 110, 30], 0.85);
  for (let i = 0; i < 4; i++) flame(fr[0] + fr[2] * (0.15 + i * 0.25), fr[1] + fr[3] + 6, 0.5, 1, t, 90 + i);
  g.restore();
  g.restore();
  // la luz del fuego del pasillo entra por la puerta y se proyecta en el suelo
  if (opts.theta > 0.02) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const c0 = P(-0.19, 0, 1), c1 = P(0.19, 0, 1), d0 = P(-0.75, 0, 0.15), d1 = P(0.9, 0, 0.15);
    g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); g.lineTo(d1[0], d1[1]); g.lineTo(d0[0], d0[1]); g.closePath();
    g.fillStyle = lin(g, 0, c0[1], 0, d0[1], [[0, `rgba(255,120,40,${(0.5 * opts.theta).toFixed(3)})`], [1, 'rgba(255,90,20,0)']]); g.fill();
    glowAt(fr[0] + fr[2] / 2, fr[1] + fr[3] * 0.6, fr[2] * 2.2, [255, 110, 30], 0.45 * opts.theta);
    g.restore();
  }
  const th = opts.theta * 1.35;                // ángulo de apertura (0 … ≈ 77°)
  const Xh = -0.19, Xf = Xh + 0.38 * Math.cos(th), Zf = 1 - 0.19 * Math.sin(th);
  const leaf = [P(Xh, 0, 1), P(Xf, 0, Zf), P(Xf, 0.77, Zf), P(Xh, 0.77, 1)];
  poly(g, leaf, rgbs(mixc([92, 98, 112], [150, 110, 90], opts.theta)));
  const bi = (u, v) => [lerp(lerp(leaf[0][0], leaf[1][0], u), lerp(leaf[3][0], leaf[2][0], u), v), lerp(lerp(leaf[0][1], leaf[1][1], u), lerp(leaf[3][1], leaf[2][1], u), v)];
  for (const [v0, v1] of [[0.08, 0.45], [0.55, 0.92]]) poly(g, [bi(0.18, v0), bi(0.82, v0), bi(0.82, v1), bi(0.18, v1)], 'rgba(0,0,0,0.12)');
  const hn = bi(0.88, 0.5); g.fillStyle = '#B8A050'; g.beginPath(); g.arc(hn[0], hn[1], 6, 0, 7); g.fill();
  // humo que entra por la puerta abierta
  if (opts.smoke > 0.01) smokeLayer(null, 1 - 0.68 * opts.smoke, true, t, 9);
  // luz: cálida si entra el fuego, fría y tranquila si la puerta está cerrada
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = `rgba(255,100,30,${(0.08 * opts.theta + 0.12 * opts.smoke).toFixed(3)})`; g.fillRect(0, 0, PW, PH);
  g.restore();
  g.fillStyle = `rgba(10,25,70,${(0.18 * opts.cool).toFixed(3)})`; g.fillRect(0, 0, PW, PH);
  if (opts.theta < 0.05) {                     // la rendija de luz bajo la puerta cerrada
    const a0 = P(-0.19, 0, 1), a1 = P(0.19, 0, 1); g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,140,50,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(a0[0], a0[1] - 2); g.lineTo(a1[0], a1[1] - 2); g.stroke(); g.restore();
  }
  g.restore();
  rr(0, 0, PW, PH, 26); g.strokeStyle = opts.frame || 'rgba(190,210,235,0.45)'; g.lineWidth = 3; g.stroke();
  // termómetro
  if (opts.temp !== undefined) {
    const x = PW - 96, y0 = 150, y1 = 520, frac = clamp((opts.temp - 0) / 300);
    rr(x - 16, y0, 32, y1 - y0, 16); g.fillStyle = 'rgba(8,8,10,0.75)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.stroke();
    rr(x - 8, lerp(y1, y0 + 8, frac), 16, (y1 - 8) - lerp(y1, y0 + 8, frac) + 8, 8); g.fillStyle = opts.col; g.fill();
    g.beginPath(); g.arc(x, y1 + 22, 30, 0, 7); g.fillStyle = opts.col; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
    g.font = '400 92px Bebas'; g.textAlign = 'right'; g.lineJoin = 'round';
    const s = Math.round(opts.temp) + ' °C';
    g.strokeStyle = 'rgba(8,8,10,0.85)'; g.lineWidth = 12; g.strokeText(s, x - 44, lerp(y1, y0 + 8, frac) + 30);
    g.fillStyle = opts.col; g.fillText(s, x - 44, lerp(y1, y0 + 8, frac) + 30);
  }
  if (opts.label) panelLabel(0, 0, -1, opts.label, opts.sub || '', false, t);
  g.restore();
}

// ---------------------------------------------------------------- fotograma
window.renderAt = t => {
  g.setTransform(PR, 0, 0, PR, 0, 0);
  if (!SL) slInit();
  if (!ROOM) { ROOM = { old: makeRoom('old'), new: makeRoom('new') }; BED = makeBedroom(); GRAIN = grainCanvas(); }
  const L = window.LINES_;
  const kM = eio(prog(t, SL.marca - 0.3, 0.6));
  // fondo: noche cálida, oscura
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0B0B0E'); bg.addColorStop(1, '#16100C');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (kM < 1) {
    // apertura: de muy cerca de la llamita del sofá de los abuelos a los dos salones; luego, un empuje lento
    const op = eio(prog(t, 0.05, 1.35)), fp = [PX + ROOM.old.fire[0], PY_TOP + ROOM.old.fire[1]];
    const z = lerp(2.5, 1, op) * (1 + 0.025 * eo(prog(t, 1.4, 8)) + 0.05 * punch(t));
    const F = [lerp(fp[0], 540, op), lerp(fp[1], 1060, op)], T = [540, lerp(880, 1060, op)];
    g.save(); g.translate(T[0], T[1]); g.scale(z, z); g.translate(-F[0], -F[1]);
    // 1) los dos salones (hasta el dormitorio)
    const roomsA = 1 - prog(t, SL.bed0, 0.35);
    if (roomsA > 0) {
      drawRoom('old', PX, PY_TOP, t, roomsA);
      drawRoom('new', PX, PY_BOT, t, roomsA);
      g.save(); g.globalAlpha = roomsA;
      panelLabel(PX, PY_TOP, CUE.abuelos, 'EL SALÓN DE TUS ABUELOS', 'MUEBLES DE MEDIADOS DEL SIGLO XX', true, t);
      panelLabel(PX, PY_BOT, CUE.tu, 'EL TUYO', 'MUEBLES DE HOY', false, t);
      timerBox(PX, PY_TOP, CUE.media, 'old', t);
      timerBox(PX, PY_BOT, CUE.cuatro, 'new', t);
      const ro = ROOM.old.spots[3], rn = ROOM.new.spots[2];
      lens(PX, PY_TOP, CUE.algodon, CUE.ensayo, 790, 330, ro[0], ro[1], 'cotton', t, [[CUE.algodon, 'ALGODÓN', '#FFE3B8']]);
      lens(PX, PY_BOT, CUE.espuma, CUE.ensayo, 790, 330, rn[0], rn[1], 'foam', t,
        [[CUE.espuma, 'ESPUMA', '#E6EEF8'], [CUE.microfibra, '+ MICROFIBRA', '#E6EEF8'], [CUE.plastico, '= PLÁSTICO', '#FF8A3D']]);
      badgeMid((PY_TOP + PH + PY_BOT) / 2, CUE.ensayo, SL.bed0, 'ENSAYO REAL · UL (EE. UU.)', t);
      g.restore();
    }
    // 2) el dormitorio: la puerta abierta… y se cierra
    const bedA = prog(t, SL.bed0 + 0.1, 0.35);
    if (bedA > 0) {
      const sp = eio(prog(t, SL.split, 0.55));                // sube arriba cuando llegan los dos dormitorios
      const y = lerp(750, PY_TOP, sp);
      const theta = 1 - eio(prog(t, SL.close, 0.6));
      const cool = 1 - theta;
      const tTop = sp > 0 ? lerp(20, 38, eo(prog(t, SL.t38 - 0.1, 1.0))) : undefined;
      drawBedroom(PX, y, t, bedA, { theta, smoke: 0.25 * theta, cool, temp: sp > 0.5 ? tTop : undefined, col: '#5EC8F2',
        label: sp > 0.5 ? 'PUERTA CERRADA' : undefined, sub: 'OTRO ENSAYO DE UL', frame: theta > 0.5 ? 'rgba(255,150,80,0.6)' : 'rgba(150,200,255,0.6)' });
      if (sp > 0) {
        const tb = lerp(20, 260, eo(prog(t, SL.t260 - 0.1, 1.2)));
        const sm = clamp(0.35 + 0.65 * prog(t, SL.split, 3.5));
        drawBedroom(PX, PY_BOT + (1 - eo(sp)) * 300, t, sp, { theta: 1, smoke: sm, cool: 0, temp: tb, col: '#FF4D3D', label: 'PUERTA ABIERTA', sub: 'OTRO ENSAYO DE UL', frame: 'rgba(255,120,80,0.7)' });
      }
    }
    g.restore();
    // cabecera (para quien lo ve sin sonido) y fuente
    const h1 = eo(prog(t, 1.1, 0.4)) * (1 - prog(t, SL.bed0, 0.3)), h2 = eo(prog(t, SL.bed0 + 0.3, 0.4)) * (1 - prog(t, SL.share - 0.1, 0.25));
    for (const [ha, a1, a2] of [[h1, '¿CUÁNTO TIEMPO TIENES ', 'PARA SALIR?'], [h2, 'ESTA NOCHE, ', 'CIERRA LA PUERTA']]) {
      if (ha <= 0) continue;
      g.save(); g.globalAlpha = ha; g.font = '400 70px Bebas';
      const w1 = g.measureText(a1).width, w2 = g.measureText(a2).width, x0 = 540 - (w1 + w2) / 2;
      g.textAlign = 'left'; g.fillStyle = '#F4F1EA'; g.fillText(a1, x0, 200 + 14 * (1 - ha)); g.fillStyle = ORANGE; g.fillText(a2, x0 + w1, 200 + 14 * (1 - ha));
      g.restore();
    }
    const fa = eo(prog(t, 1.1, 0.4)) * (1 - prog(t, SL.share - 0.1, 0.25));
    if (fa > 0) { g.save(); g.globalAlpha = fa * 0.75; txt('Datos: ensayos de UL (FSRI), EE. UU.', 540, 1768, 22, '#B9B4AA', 700, 'center', 'SpaceMono'); g.restore(); }
    // bajo el avión de compartir, todo se oscurece
    const dim = prog(t, SL.share - 0.1, 0.25);
    if (dim > 0) { g.fillStyle = `rgba(0,0,0,${(0.6 * dim).toFixed(3)})`; g.fillRect(0, 0, W, H); }
    if (kM > 0) { g.save(); g.globalAlpha = kM; background(t); sparks(t); g.restore(); }
  } else { background(t); sparks(t); }
  share(t);
  closing(t);
  const pu = punch(t);
  if (pu > 0.01) { const fg = g.createRadialGradient(540, 900, 50, 540, 900, 1100); fg.addColorStop(0, `rgba(255,214,140,${(0.32 * pu).toFixed(3)})`); fg.addColorStop(1, 'rgba(255,140,40,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = fg; g.fillRect(0, 0, W, H); g.restore(); }
  const f = prog(t, END - 0.25, 0.25);
  if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
};
