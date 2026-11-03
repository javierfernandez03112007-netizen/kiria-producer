// Formato «Profe IA · Bomberados PRO» (anuncio de una función de la app con su GRABACIÓN REAL). Se carga DESPUÉS de
// scene.js (web/index.html) y sustituye su renderAt (que aquí es async: espera a cada fotograma de la grabación).
// Usa de scene.js: g, W, H, PR, CUE, Q, END, clamp, prog, eo, eio, back, lerp, hash, rr, txt, wrap, rgba, glowAt,
// background, sparks, dots, share, closing, punch, ORANGE, GOLD, WHITE, RED, TEAL, PINK, VIOLET, LETCOL, DIM.
//
//  · gancho: un sello rojo EXAMEN OFICIAL cae de golpe (primer fotograma) con AYUNTAMIENTO DE ALBACETE · 2026;
//  · «encuentras»: la pregunta con sus 4 opciones (estilo de la app); en «qué» la D se agranda; en «imposible», sacudida;
//  · «copias»: menú «Copiar» y la tarjeta vuela al móvil; «pasas»: el móvil con la grabación real (out/rec/rNNNN.jpg, 30 fps)
//    remapeada en el tiempo para que cada cosa salga cuando se dice (lo acelerado lleva «▶▶ ×N» en pantalla);
//  · «correcta» / «explicación» / «página»: zoom de cámara a la respuesta, a la explicación y a la fuente con su página;
//  · frase 5: la página del manual (out/pagina226.jpg) con el párrafo subrayado y el rótulo PROFE IA;
//  · venta: avión de papel (share) y placa BOMBERADOS con la etiqueta PRO.

let PI = null, PAGE = null;
const REC = new Map();
const PH_W = 600, PH_H = 1164, REC_W = 1206, REC_H = 2340, RSC = PH_W / REC_W;   // pantalla del móvil
const PH_X = 540 - PH_W / 2, PH_Y = 440;
const QUESTION = 'En una fuga de gas licuado del petróleo, este tiende a:';
const OPTIONS = ['Ascender rápidamente y diluirse en la atmósfera.', 'Acumularse en zonas bajas, fosos y sótanos.',
  'Descomponerse en derivados más ligeros, menos inflamables.', 'Combinarse con el nitrógeno del aire, generando NH3 y ciertos hidrocarburos aromáticos (paradiclorobenceno).'];

function loadImg(src) { const im = new Image(); im.src = src; return im.decode().then(() => im); }
function recFrame(r) {                         // fotograma de la grabación en el segundo r (guarda solo los últimos)
  const i = Math.max(1, Math.min(818, Math.round(r * 30) + 1));
  if (!REC.has(i)) {
    REC.set(i, loadImg(`../out/rec/r${String(i).padStart(4, '0')}.jpg`));
    if (REC.size > 4) REC.delete(REC.keys().next().value);
  }
  return REC.get(i);
}

// ---------------------------------------------------------------- línea de tiempo
function piInit() {
  const L = window.LINES_, c = k => CUE[k];
  PI = {
    q0: c('encuentras') - 0.1, que: c('que'), imp: c('imposible'), calm: c('facil') - 0.1,
    copy: c('copias') - 0.05, fly: c('copias') + 0.5, phone: c('pasas') - 0.45,
    seg: c('segundos'), ok: c('correcta'), exp: c('explicacion'), pag: c('pagina'), tem: c('temario'),
    page: L[4].start - 0.15, tag: c('pregunta2'), ent: c('entiende'), ava: c('avanzando'),
    share: c('compartir'), marca: c('marca')
  };
  PI.l3end = L[2].end; PI.l4end = L[3].end;
  // grabación: [segundo del vídeo, segundo de la grabación]
  PI.K = [[PI.phone, 1.3], [PI.phone + 0.45, 2.4], [PI.phone + 0.9, 5.25], [PI.phone + 1.35, 5.9], [Math.max(PI.phone + 1.6, PI.l3end + 0.1), 6.9],
    [Math.max(PI.phone + 1.9, PI.seg), 7.3], [PI.ok - 0.25, 17.3], [PI.exp, 18.4], [PI.pag - 0.15, 20.6], [PI.pag + 0.5, 22.4],
    [PI.tem, 23.6], [PI.tem + 0.5, 24.6], [PI.l4end + 0.4, 25.6]];
  // cámara sobre la pantalla del móvil: [segundo, zoom, centro x, centro y (en píxeles de la grabación)]
  PI.Z = [[PI.phone, 1, REC_W / 2, REC_H / 2], [PI.ok - 0.3, 1, REC_W / 2, REC_H / 2], [PI.ok - 0.05, 1.85, 640, 1050],
    [PI.exp - 0.1, 1.85, 640, 1060], [PI.exp + 0.15, 1.75, 640, 1240], [PI.pag - 0.2, 1.75, 640, 1240],
    [PI.pag + 0.3, 1.8, 660, 1050], [PI.tem - 0.05, 1.8, 660, 1050], [PI.tem + 0.4, 1, REC_W / 2, REC_H / 2]];
  CUE.descripcion = PI.marca - 0.2;
  window.PI_ = PI;
}
function recTime(t) {
  const K = PI.K;
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const u = (t - K[i - 1][0]) / Math.max(1e-6, K[i][0] - K[i - 1][0]); return lerp(K[i - 1][1], K[i][1], u); }
  return Math.min(27.2, K[K.length - 1][1] + (t - K[K.length - 1][0]));
}
function recSpeed(t) { return (recTime(t + 0.05) - recTime(t - 0.05)) / 0.1; }
function cam(t) {
  const Z = PI.Z;
  if (t <= Z[0][0]) return Z[0].slice(1);
  for (let i = 1; i < Z.length; i++) if (t <= Z[i][0]) { const u = eio((t - Z[i - 1][0]) / Math.max(1e-6, Z[i][0] - Z[i - 1][0])); return [1, 2, 3].map(k => lerp(Z[i - 1][k], Z[i][k], u)); }
  return Z[Z.length - 1].slice(1);
}

// ---------------------------------------------------------------- escena 1: el sello y la pregunta
function examStamp(t) {
  const out = eio(prog(t, PI.q0 - 0.2, 0.5));           // sube y se hace pequeño cuando entra la pregunta
  const fade = 1 - prog(t, PI.calm, 0.35);
  if (fade <= 0) return;
  const s0 = lerp(2.4, 1, eo(prog(t, -0.02, 0.2))), sq = 1 + 0.06 * Math.exp(-Math.pow((t - 0.2) / 0.06, 2));
  const y = lerp(760, 230, out), s = s0 * sq * lerp(1, 0.62, out);
  g.save(); g.globalAlpha = fade; g.translate(540, y); g.rotate(-0.07 * (1 - out * 0.5)); g.scale(s, s);
  g.strokeStyle = '#FF3B30'; g.lineWidth = 12; rr(-360, -96, 720, 192, 24); g.stroke();
  g.lineWidth = 4; rr(-342, -78, 684, 156, 16); g.stroke();
  txt('EXAMEN OFICIAL', 0, 46, 138, '#FF3B30', 400, 'center', 'Bebas');
  g.restore();
  // ayuntamiento y año
  const a1 = eo(prog(t, (CUE.albacete ?? 0.4) - 0.05, 0.3)) * fade, a2 = back(prog(t, (CUE.anio ?? 1.2) - 0.05, 0.35)) * fade;
  const yy = lerp(960, 330, out);
  if (a1 > 0 && out < 0.98) { g.save(); g.globalAlpha = a1 * (1 - out); txt('AYUNTAMIENTO DE ALBACETE', 540, yy, 72, '#F4F1EA', 400, 'center', 'Bebas'); g.restore(); }
  if (a2 > 0 && out < 0.98) { g.save(); g.globalAlpha = clamp(a2) * (1 - out); g.translate(540, yy + 150); g.scale(a2, a2); txt('2026', 0, 0, 170, ORANGE, 400, 'center', 'Bebas'); g.restore(); }
}
function questionCard(t, x, y, s, a, sel) {     // tarjeta de la pregunta en (x, y) = centro de arriba, escala s
  if (a <= 0.01) return;
  const w = 960, pad = 46;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s); g.translate(-w / 2, 0);
  const qL = wrap(QUESTION, w - 2 * pad, 46, 800, 'Inter');
  const oL = OPTIONS.map(o => wrap(o, w - 2 * pad - 110, 36, 600, 'Inter'));
  let h = pad + qL.length * 58 + 26 + oL.reduce((sum, l) => sum + Math.max(1, l.length) * 46 + 34, 0) + pad - 10;
  // sombra y tarjeta
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 50; rr(0, 0, w, h, 34); g.fillStyle = 'rgba(16,17,22,0.96)'; g.fill(); g.restore();
  rr(0, 0, w, h, 34); g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2; g.stroke();
  if (sel > 0) { rr(0, 0, w, h, 34); g.fillStyle = `rgba(60,130,255,${(0.22 * sel).toFixed(3)})`; g.fill(); g.strokeStyle = `rgba(90,160,255,${sel.toFixed(3)})`; g.lineWidth = 5; g.stroke(); }
  let yy = pad + 40;
  for (const l of qL) { txt(l, pad, yy, 46, '#FFFFFF', 800, 'left', 'Inter'); yy += 58; }
  yy += 26;
  const dK = Math.exp(-Math.pow((t - PI.que - 0.35) / 0.45, 2)) + 0.6 * prog(t, PI.que, 0.2) * (1 - prog(t, PI.calm, 0.3));
  for (let i = 0; i < 4; i++) {
    const n = Math.max(1, oL[i].length), rh = n * 46 + 14;
    const isD = i === 3, k = isD ? clamp(dK) : 0;
    g.save();
    if (isD && k > 0) { rr(pad - 18, yy - 44, w - 2 * pad + 36, rh + 16, 20); g.fillStyle = `rgba(139,124,246,${(0.22 * k).toFixed(3)})`; g.fill(); g.strokeStyle = `rgba(139,124,246,${(0.9 * k).toFixed(3)})`; g.lineWidth = 4; g.stroke(); }
    g.beginPath(); g.arc(pad + 30, yy - 12 + (n - 1) * 23, 30, 0, 7); g.fillStyle = LETCOL[i]; g.fill();
    txt('ABCD'[i], pad + 30, yy + 1 + (n - 1) * 23, 34, '#0B0B0E', 400, 'center', 'Bebas');
    let ly = yy;
    for (const l of oL[i]) { txt(l, pad + 84, ly, 36, isD && k > 0.3 ? '#EDE9FF' : '#D9DCE3', 600, 'left', 'Inter'); ly += 46; }
    g.restore();
    yy += rh + 20;
  }
  g.restore();
  return h * s;
}
function confusion(t) {                         // «¿qué es?» signos de interrogación; «imposible» pantalla roja
  const a = prog(t, PI.que - 0.05, 0.25) * (1 - prog(t, PI.calm, 0.3));
  if (a > 0) for (let i = 0; i < 5; i++) {
    const p = back(prog(t, PI.que + i * 0.12, 0.35));
    if (p <= 0) continue;
    const x = [150, 930, 120, 960, 540][i], y = [600, 640, 1330, 1290, 1510][i], r = [-0.3, 0.25, 0.2, -0.2, 0][i];
    g.save(); g.globalAlpha = a * clamp(p); g.translate(x, y + 8 * Math.sin(t * 6 + i)); g.rotate(r); g.scale(p, p);
    txt('?', 0, 40, 130, i % 2 ? VIOLET : '#FF3B30', 400, 'center', 'Bebas'); g.restore();
  }
  const im = Math.exp(-Math.pow((t - PI.imp - 0.12) / 0.2, 2));
  if (im > 0.01) {
    const q = g.createRadialGradient(540, 960, 300, 540, 960, 1150); q.addColorStop(0, 'rgba(255,0,0,0)'); q.addColorStop(1, `rgba(255,40,30,${(0.5 * im).toFixed(3)})`);
    g.fillStyle = q; g.fillRect(0, 0, W, H);
  }
}
function copyMenu(t) {                          // menú «Copiar» de iOS sobre la tarjeta
  const a = back(prog(t, PI.copy, 0.3)) * (1 - prog(t, PI.fly + 0.05, 0.15));
  if (a <= 0) return;
  g.save(); g.globalAlpha = clamp(a); g.translate(540, 470); g.scale(a, a);
  rr(-300, -50, 600, 100, 22); g.fillStyle = 'rgba(40,40,44,0.97)'; g.fill();
  const items = ['Copiar', 'Seleccionar todo', 'Buscar'];
  let x = -270;
  g.font = '600 32px Inter';
  for (let i = 0; i < items.length; i++) {
    const w = g.measureText(items[i]).width;
    if (i === 0) { rr(x - 16, -36, w + 32, 72, 14); g.fillStyle = `rgba(255,255,255,${(0.18 * clamp((t - PI.copy - 0.25) / 0.1)).toFixed(3)})`; g.fill(); }
    txt(items[i], x, 11, 32, '#FFFFFF', 600, 'left', 'Inter');
    x += w + 54;
    if (i < 2) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 27, -28, 2, 56); }
  }
  g.restore();
}

// ---------------------------------------------------------------- escena 2: el móvil con la grabación
function phoneFrame(t, img, a) {
  const [z, cx, cy] = cam(t);
  const sx = PH_X + cx * RSC, sy = PH_Y + cy * RSC;           // centro del zoom en pantalla (sin zoom)
  const slide = 1 - eo(prog(t, PI.phone, 0.5));
  // transformación continua: interpola el centro con el zoom
  const k = clamp((z - 1) / 0.8);
  const fx = lerp(540, sx, k), fy = lerp(PH_Y + PH_H / 2, sy, k);
  g.save(); g.globalAlpha = a;
  g.translate(540, PH_Y + PH_H / 2 + slide * 1300); g.scale(z, z); g.translate(-fx, -fy);
  // carcasa
  g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 60; rr(PH_X - 18, PH_Y - 18, PH_W + 36, PH_H + 36, 74); g.fillStyle = '#0B0B0D'; g.fill(); g.restore();
  rr(PH_X - 18, PH_Y - 18, PH_W + 36, PH_H + 36, 74);
  g.strokeStyle = lin2(PH_X, PH_Y, PH_X + PH_W, PH_Y + PH_H); g.lineWidth = 5; g.stroke();
  g.save(); rr(PH_X, PH_Y, PH_W, PH_H, 56); g.clip();
  if (img) g.drawImage(img, PH_X, PH_Y, PH_W, PH_H);
  overlays(t);
  g.restore();
  rr(540 - 62, PH_Y + 14, 124, 34, 17); g.fillStyle = '#000'; g.fill();             // isla dinámica
  g.restore();
  return { z, fx, fy, slide };
}
function lin2(x0, y0, x1, y1) { const q = g.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, '#5A5D66'); q.addColorStop(0.5, '#1E1F24'); q.addColorStop(1, '#6A6D76'); return q; }
const RX = x => PH_X + x * RSC, RY = y => PH_Y + y * RSC;
function overlays(t) {                          // marcas sobre la grabación (coordenadas de la grabación)
  // la respuesta correcta
  const a1 = eo(prog(t, PI.ok, 0.25)) * (1 - prog(t, PI.exp - 0.1, 0.2));
  if (a1 > 0) { g.save(); g.globalAlpha = a1; rr(RX(250), RY(1000), 860 * RSC, 110 * RSC, 14); g.strokeStyle = '#2ECC71'; g.lineWidth = 3.5; g.stroke(); g.restore(); }
  // la explicación: subrayado
  const a2 = prog(t, PI.exp + 0.1, 0.9) * (1 - prog(t, PI.pag - 0.25, 0.2));
  if (a2 > 0) {
    g.save(); g.globalAlpha = 0.9 * (1 - prog(t, PI.pag - 0.25, 0.2));
    for (let i = 0; i < 4; i++) {
      const p = clamp(a2 * 4 - i), y = RY(1185 + i * 70);
      if (p <= 0) continue;
      g.fillStyle = 'rgba(255,214,10,0.35)'; g.fillRect(RX(260), y, 840 * RSC * p, 46 * RSC);
    }
    g.restore();
  }
  // la fuente con su página
  const a3 = back(prog(t, PI.pag + 0.45, 0.35)) * (1 - prog(t, PI.tem - 0.1, 0.15));
  if (a3 > 0) { g.save(); g.globalAlpha = clamp(a3); g.beginPath(); g.ellipse(RX(600), RY(1024), 110 * RSC * clamp(a3), 44 * RSC * clamp(a3), 0, 0, 7); g.strokeStyle = ORANGE; g.lineWidth = 4; g.stroke(); g.restore(); }
}
function sideBadges(t) {                        // rótulos fuera del móvil (pantalla)
  const items = [[PI.ok, PI.exp - 0.1, '✓ CORRECTA', '#2ECC71'], [PI.exp + 0.05, PI.pag - 0.2, 'SU EXPLICACIÓN', '#FFD60A'], [PI.pag + 0.4, PI.tem + 0.2, 'PÁGINA EXACTA', ORANGE]];
  for (const [t0, t1, s, col] of items) {
    const a = back(prog(t, t0, 0.35)) * (1 - prog(t, t1, 0.2));
    if (a <= 0) continue;
    g.save(); g.globalAlpha = clamp(a); g.translate(540, 1690); g.scale(a, a);
    g.font = '400 70px Bebas'; const w = g.measureText(s).width + 70;
    rr(-w / 2, -52, w, 104, 52); g.fillStyle = 'rgba(10,10,12,0.9)'; g.fill(); g.strokeStyle = col; g.lineWidth = 5; g.stroke();
    txt(s, 0, 25, 70, col, 400, 'center', 'Bebas');
    g.restore();
  }
  // grabación acelerada: dilo
  const sp = recSpeed(t), fast = t > PI.phone + 0.2 && t < PI.l4end + 0.4 && sp > 1.6;
  if (fast) {
    g.save(); rr(70, 470, 150, 60, 30); g.fillStyle = 'rgba(10,10,12,0.8)'; g.fill();
    txt('▶▶ ×' + Math.round(sp), 145, 513, 36, '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
  }
}
function header(t, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = '400 64px Bebas';
  const a1 = 'PROFE IA · ', a2 = 'BOMBERADOS PRO', w1 = g.measureText(a1).width, w2 = g.measureText(a2).width, x0 = 540 - (w1 + w2) / 2;
  g.textAlign = 'left'; g.fillStyle = '#F4F1EA'; g.fillText(a1, x0, 205); g.fillStyle = ORANGE; g.fillText(a2, x0 + w1, 205);
  g.restore();
}

// ---------------------------------------------------------------- escena 3: la página del manual y el rótulo
function manualPage(t) {
  const a = eo(prog(t, PI.page, 0.4)) * (1 - prog(t, PI.share - 0.1, 0.3));
  if (a <= 0 || !PAGE) return;
  const z = lerp(1.0, 1.9, eio(prog(t, PI.page + 0.2, 2.2)));
  const cx = lerp(603, 330, eio(prog(t, PI.page + 0.2, 2.2))), cy = lerp(837, 340, eio(prog(t, PI.page + 0.2, 2.2)));
  const base = 1000 / 1206;
  g.save(); g.globalAlpha = a;
  g.translate(540, 1000); g.scale(z * base, z * base); g.translate(-cx, -cy);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 40; g.drawImage(PAGE, 0, 0); g.restore();
  // subrayado del punto 5 (zonas bajas), línea a línea
  const lines = [[140, 300, 420], [140, 328, 420], [140, 356, 100]];
  for (let i = 0; i < 3; i++) {
    const p = clamp((prog(t, PI.page + 0.6, 1.1) * 3) - i);
    if (p <= 0) continue;
    const [x, y, w] = lines[i];
    g.fillStyle = 'rgba(255,214,10,0.45)'; g.fillRect(x - 4, y - 2, w * p, 26);
  }
  g.restore();
  // rótulo PROFE IA
  const ta = eo(prog(t, PI.tag - 0.05, 0.35)) * (1 - prog(t, PI.share - 0.1, 0.3));
  if (ta > 0) {
    g.save(); g.globalAlpha = ta;
    const band = g.createLinearGradient(0, 1150, 0, 1720); band.addColorStop(0, 'rgba(8,8,10,0)'); band.addColorStop(0.12, 'rgba(8,8,10,0.88)'); band.addColorStop(0.88, 'rgba(8,8,10,0.88)'); band.addColorStop(1, 'rgba(8,8,10,0)');
    g.fillStyle = band; g.fillRect(0, 1150, W, 570);
    const s = back(prog(t, PI.tag - 0.05, 0.4));
    g.save(); g.translate(540, 1330); g.scale(s, s); txt('PROFE IA', 0, 0, 170, ORANGE, 400, 'center', 'Bebas'); g.restore();
    txt('TU PROFESOR PARTICULAR, SIEMPRE DISPONIBLE', 540, 1420, 52, '#F4F1EA', 400, 'center', 'Bebas');
    const chips = [[PI.tag, 'PREGUNTA'], [PI.ent, 'ENTIENDE'], [PI.ava, 'AVANZA']];
    for (let i = 0; i < 3; i++) {
      const ca = back(prog(t, chips[i][0] - 0.05, 0.3));
      if (ca <= 0) continue;
      const x = 240 + i * 300;
      g.save(); g.globalAlpha = ta * clamp(ca); g.translate(x, 1550); g.scale(ca, ca);
      rr(-125, -42, 250, 84, 42); g.fillStyle = 'rgba(255,122,26,0.16)'; g.fill(); g.strokeStyle = ORANGE; g.lineWidth = 3; g.stroke();
      txt(chips[i][1], 0, 16, 46, '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
    }
    g.restore();
  }
}
function proTag(t) {                            // etiqueta PRO junto a la placa de la marca
  const a = back(prog(t, PI.marca + 0.25, 0.35));
  if (a <= 0) return;
  g.save(); g.globalAlpha = clamp(a); g.translate(880, 760); g.rotate(0.12); g.scale(a, a);
  rr(-80, -42, 160, 84, 18); g.fillStyle = '#FF3B30'; g.shadowColor = 'rgba(255,59,48,0.7)'; g.shadowBlur = 30; g.fill(); g.shadowBlur = 0;
  txt('PRO', 0, 24, 72, '#FFFFFF', 400, 'center', 'Bebas'); g.restore();
}

// ---------------------------------------------------------------- fotograma
window.renderAt = async t => {
  g.setTransform(PR, 0, 0, PR, 0, 0);
  if (!PI) piInit();
  if (!PAGE) PAGE = await loadImg('../out/pagina226.jpg').catch(() => null);
  const kM = eio(prog(t, PI.marca - 0.3, 0.6));
  const phoneA = t >= PI.phone ? 1 - prog(t, PI.page, 0.35) : 0;
  const img = phoneA > 0 ? await recFrame(recTime(t)) : null;
  background(t);
  g.save(); g.globalAlpha = 0.6; dots(t); g.restore();
  const shake = 14 * Math.exp(-Math.pow((t - PI.imp - 0.15) / 0.22, 2)), st = 18 * Math.exp(-Math.pow((t - 0.17) / 0.07, 2));
  g.save(); g.translate(Math.sin(t * 83) * (shake + st), Math.cos(t * 67) * (shake + st) * 0.6);
  // escena 1
  examStamp(t);
  if (t < PI.fly + 0.6) {
    const fl = eio(prog(t, PI.fly, 0.55));
    const a = eo(prog(t, PI.q0, 0.35)) * (1 - prog(t, PI.fly + 0.4, 0.15));
    const y = lerp(lerp(1500, 600, eo(prog(t, PI.q0, 0.45))), 1380, fl), s = lerp(1, 0.22, fl);
    questionCard(t, 540 + 0 * fl, y, s, a, clamp((t - PI.copy - 0.2) / 0.2) * (1 - fl));
  }
  confusion(t);
  copyMenu(t);
  g.restore();
  // escena 2: el móvil
  if (phoneA > 0) { phoneFrame(t, img, phoneA); sideBadges(t); }
  header(t, eo(prog(t, PI.phone, 0.4)) * (1 - prog(t, PI.share - 0.1, 0.3)) * (phoneA > 0 ? 1 - clamp((cam(t)[0] - 1) / 0.25) : 1));
  // escena 3: la página y el rótulo
  manualPage(t);
  // venta
  const dim = prog(t, PI.share - 0.1, 0.25) * (1 - kM);
  if (dim > 0) { g.fillStyle = `rgba(0,0,0,${(0.5 * dim).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  if (kM > 0) { g.save(); g.globalAlpha = kM; background(t); sparks(t); g.restore(); }
  share(t);
  closing(t);
  proTag(t);
  const pu = punch(t);
  if (pu > 0.01) { const fg = g.createRadialGradient(540, 900, 50, 540, 900, 1100); fg.addColorStop(0, `rgba(255,214,140,${(0.32 * pu).toFixed(3)})`); fg.addColorStop(1, 'rgba(255,140,40,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = fg; g.fillRect(0, 0, W, H); g.restore(); }
  const f = prog(t, END - 0.25, 0.25);
  if (f > 0) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
};
