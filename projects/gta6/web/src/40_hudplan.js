// ---------------------------------------------------------------- HUD: la pregunta pendiente (arriba a la derecha), la memoria del móvil, las cifras con su
// fuente, las etiquetas de lo que pesa (imagen, sonido, código) y la votación final
function buildHudPlan() {}
const HGd = '#FFC24A', HRd = '#FF5247', HGr = '#7CF0A9';
function lab(P, txt, sub, k, opt) { if (k <= 0.01 || !P) return; callout(P, txt, sub, k, { size: 27, subSize: 19, bg: true, ...opt }); }
function bracketMsg(t, txt, col, k, blink) {
  if (k <= 0.01) return; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = k; hfont(21); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
  hg.strokeStyle = col; hg.lineWidth = 1.6; hg.beginPath();
  hg.moveTo(x0 + 10, y - 24); hg.lineTo(x0, y - 24); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 24); hg.lineTo(x1, y - 24); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
  hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); hg.restore();
}
// cifra grande abajo (con subtítulo y fuente)
function bigFig(txt, sub, col, k, y = 1330) {
  if (k <= 0.01) return;
  bigText(txt, 540, y, 92, col, k, { glow: 18, dark: 22, ls: 6 });
  if (sub) bigText(sub, 540, y + 78, 30, HC.white, clamp(k * 1.2 - 0.15), { dark: 14, ls: 4 });
}
function srcLine(txt, k) {
  if (k <= 0.01) return;
  hg.save(); hg.globalAlpha = k * 0.85; hfont(17, false); hg.letterSpacing = '2px'; hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.fillStyle = HC.grey;
  const full = 'FUENTE: ' + txt, w = hg.measureText(full).width; if (w > 968) hfont(17 * 968 / w, false);      // nunca se sale por la derecha
  hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 6; hg.fillText(typed(full, clamp(k * 1.5)), 56, 1548); hg.restore();
}
function cross(P, k, s = 34) {
  if (k <= 0.01 || !P) return; const e = backOut(clamp(k / 0.5)), r = s * e;
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(HRd, 9, 18); hg.lineCap = 'round';
  hg.beginPath(); hg.moveTo(P.x - r, P.y - r); hg.lineTo(P.x + r, P.y + r); hg.moveTo(P.x + r, P.y - r); hg.lineTo(P.x - r, P.y + r); hg.stroke(); noGlow(); hg.restore();
}
function pollPills(t, k) {
  if (k <= 0.01) return;
  const items = [['PLAYSTATION', '#6FA8FF', 300], ['XBOX', '#7CF0A9', 790]], y = 1370;
  hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '5px';
  items.forEach(([txt, col, x], i) => {
    const kk = backOut(clamp((k - i * 0.15) / 0.5)), pulse = 1 + 0.03 * Math.sin(t * 7 + i * Math.PI);
    hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y); hg.scale(kk * pulse, kk * pulse);
    hfont(44); const w = hg.measureText(txt).width + 80, h = 96;
    hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.fill(); glowStroke(col, 4, 18); rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.stroke(); noGlow();
    hg.fillStyle = col; hg.fillText(txt, 0, 4); hg.restore();
  });
  hg.globalAlpha = clamp(k * 2); hfont(40); hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 10; hg.fillText('o', 540, y + 2);
  hg.restore();
}
const _hv = new THREE.Vector3();
function smallTag(P, txt, k, col = HC.white, size = 24) {
  if (k <= 0.01 || !P || !P.ok) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); hfont(size); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.textBaseline = 'middle';
  const w = hg.measureText(txt).width + 26, h = size * 1.6; hg.fillStyle = 'rgba(0,0,0,.66)'; rr(hg, P.x - w / 2, P.y - h / 2, w, h, h / 2); hg.fill();
  hg.fillStyle = col; hg.fillText(txt, P.x, P.y + 1); hg.restore();
}
function thirst(t, k, lvl) {
  if (k <= 0.01) return;
  const x = 930, y0 = 1300, y1 = 760, w = 46;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, x - w / 2 - 10, y1 - 20, w + 20, y0 - y1 + 40, 18); hg.fill();
  hg.strokeStyle = 'rgba(238,242,246,.45)'; hg.lineWidth = 2; rr(hg, x - w / 2, y1, w, y0 - y1, 12); hg.stroke();
  const yy = lerp(y0, y1, clamp(lvl)); const gr = hg.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#62E3D4'); gr.addColorStop(1, '#FF5247');
  hg.save(); hg.beginPath(); rr(hg, x - w / 2, y1, w, y0 - y1, 12); hg.clip(); hg.fillStyle = gr; hg.fillRect(x - w / 2, yy, w, y0 - yy); hg.restore();
  hfont(22); hg.letterSpacing = '4px'; hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 8; hg.fillText('SED', x, y0 + 50);
  hg.restore();
}
// la memoria del móvil (abajo): la barra se llena y se sale en rojo
function storageBar(t, k, over) {
  if (k <= 0.01) return;
  const x0 = 120, x1 = 960, y = 1395, w = x1 - x0, cap = x0 + w * 128 / 212;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, x0 - 26, y - 92, w + 52, 170, 26); hg.fill();
  hfont(24); hg.letterSpacing = '3px'; hg.textBaseline = 'middle'; hg.textAlign = 'left'; hg.fillStyle = HC.white; hg.fillText('MEMORIA DEL MÓVIL', x0, y - 50);
  hg.textAlign = 'right'; hg.fillStyle = over > 0.5 ? HRd : HC.grey; hg.fillText(over > 0.5 ? 'NO CABE' : '128 GB', x1, y - 50);
  rr(hg, x0, y - 16, w, 36, 18); hg.fillStyle = 'rgba(255,255,255,.12)'; hg.fill();
  const fill = lerp(x0, x1, clamp(k * 1.15)); hg.save(); rr(hg, x0, y - 16, w, 36, 18); hg.clip();
  hg.fillStyle = '#62E3D4'; hg.fillRect(x0, y - 16, Math.min(fill, cap) - x0, 36);
  if (fill > cap) { hg.fillStyle = over > 0.5 && Math.sin(t * 30) > -0.2 ? '#FF5247' : '#FFB547'; hg.fillRect(cap, y - 16, fill - cap, 36); }
  hg.restore();
  hg.strokeStyle = HC.white; hg.lineWidth = 3; hg.beginPath(); hg.moveTo(cap, y - 30); hg.lineTo(cap, y + 34); hg.stroke();
  hfont(21, false); hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.fillText('TU MÓVIL · 128 GB', (x0 + cap) / 2, y + 52);
  hg.fillStyle = over > 0.5 ? HRd : HC.amber; hg.fillText('GTA 6 · 212 GB', (cap + x1) / 2, y + 52);
  hg.restore();
}
// la descarga (abajo): barra que avanza despacio y el reloj
function downloadBar(t, k, u) {
  if (k <= 0.01) return;
  const x0 = 150, x1 = 930, y = 1420, w = x1 - x0;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, x0 - 30, y - 96, w + 60, 150, 26); hg.fill();
  hfont(24); hg.letterSpacing = '3px'; hg.textBaseline = 'middle'; hg.textAlign = 'left'; hg.fillStyle = HC.white; hg.fillText('DESCARGANDO · 212 GB', x0, y - 56);
  hg.textAlign = 'right'; hg.fillStyle = HC.teal; hg.fillText('300 Mb/s', x1, y - 56);
  rr(hg, x0, y - 18, w, 30, 15); hg.fillStyle = 'rgba(255,255,255,.12)'; hg.fill();
  hg.save(); rr(hg, x0, y - 18, w, 30, 15); hg.clip(); hg.fillStyle = '#62E3D4'; hg.fillRect(x0, y - 18, w * clamp(u), 30); hg.restore();
  hg.restore();
}
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // la pregunta, pendiente hasta la respuesta
  bracketMsg(t, 'LO QUE OCUPA · ???', HC.amber, cw2(K.final2, K.respuesta11, 0.3, 0.12), true);
  bracketMsg(t, 'LO QUE OCUPA ↓', HGr, cw2(K.respuesta11, K.pintado11 + 0.6, 0.12, 0.3), false);
  // 1: aún no ha salido; la memoria del móvil se desborda
  { _hv.set(0, PH.t, PH.l / 2); smallTag(proj(_hv), 'SALE EL 19 DE NOVIEMBRE', cw2(K.salido1 - 0.05, K.movil1 + 0.4, 0.2, 0.2), HC.amber, 24); }
  storageBar(t, cw2(K.cabria1 - 0.2, K.por2 + 0.5, 0.5, 0.3), win(t, K.movil1, 0.05));
  // 3: 212 GB con su fuente
  bigFig('212 GB', 'HASTA 212 GB SEGÚN LA CONSOLA', HC.amber, cw2(K.n212_3 - 0.05, K.n50000_4 - 0.2, 0.2, 0.25), 1300);
  srcLine('ROCKSTAR (3-11-2026) · RED DEAD 2: ROCKSTAR (2018) · CANCIONES Y DESCARGA: CÁLCULO DE EJEMPLO', cw2(K.rockstar3, K.codigo6 - 0.3, 0.3, 0.3));
  // 4: canciones y Red Dead 2
  { _hv.copy(S.discPC).add(v3(0, 0.55, 0)); lab(_hv.clone(), '≈ 53.000 CANCIONES', 'MP3 DE 4 MB CADA UNA', cw2(K.n50000_4 + 0.2, K.doble4 - 0.15), { color: HC.white, dx: 120, dy: -150 }); }
  if (S.rd.visible) { _hv.set(S.rd.position.x, H99 + 0.1, S.rd.position.z); lab(_hv.clone(), 'RED DEAD 2 · 99 GB', 'ROCKSTAR · 2018 · PS4', cw2(K.red4 - 0.1, K.fibra5 - 0.2), { color: '#FFC27A', dx: -150, dy: -120 });
    _hv.set(-PIL.w / 2, PH.t + PIL.h * 0.75, PIL.d / 2); lab(_hv.clone(), 'GTA 6 · 212 GB', 'EL DOBLE', cw2(K.doble4 + 0.1, K.fibra5 - 0.2), { color: HC.amber, dx: -140, dy: -90 }); }
  // 5: la fibra y el reloj
  { const p = S.fiberCurve.getPointAt(0.45); lab(p, 'FIBRA · 300 MEGAS', 'TODO PERFECTO', cw2(K.n300_5 - 0.05, K.tardarias5 - 0.1), { color: HC.teal, dx: 120, dy: -170 }); }
  downloadBar(t, cw2(K.tardarias5 - 0.3, K.crees6 - 0.1, 0.3, 0.25), clamp((t - (K.tardarias5 - 0.3)) / 30));
  bigFig('1 h 34 min', 'MÁS DE HORA Y MEDIA', HC.white, cw2(K.hora5 - 0.05, K.crees6 + 0.1, 0.2, 0.25), 1180);
  // 6: el código
  { _hv.copy(S.code.position); S.city.localToWorld(_hv); lab(_hv.clone(), 'EL CÓDIGO', 'EL PROGRAMA DEL JUEGO', cw2(K.codigo6 + 0.05, K.lo7 - 0.1), { color: '#5DFF9A', dx: 130, dy: -130 }); }
  // 8: las láminas: imagen de la pared, del coche y de la cara; borrosa frente a nítida
  [[S.peelWall, 'PARED'], [S.peelCar, 'COCHE'], [S.peelFace, 'CARA']].forEach(([m, txt], i) => { if (!m.visible) return; _hv.copy(m.position); smallTag(proj(_hv), txt + ' · UNA IMAGEN', cw2(K.imagenes8 + 0.3 + i * 0.12, K.para8 + 0.1, 0.2, 0.2), i ? HC.white : HC.amber, 24); });
  if (S.blurHalf.visible) { smallTag({ x: 285, y: 640, ok: true }, 'IMAGEN PEQUEÑA: BORROSA', cw2(K.cerca8, K.voz9 - 0.3, 0.2, 0.2), HRd, 26);
    smallTag({ x: 795, y: 1250, ok: true }, 'IMAGEN GRANDE: NÍTIDA', cw2(K.cerca8 + 0.15, K.voz9 - 0.3, 0.2, 0.2), HGr, 26); }
  // 9: el sonido
  [[v3(HERO_PED.x, 0.13, HERO_PED.z), 'VOZ', K.voz9], [v3(HERO_CAR.x, 0.09, HERO_CAR.z), 'CANCIÓN', K.cancion9], [v3(0.43, 0.09, -0.2), 'RUIDO DE LA CALLE', K.ruido9]].forEach(([p, txt, t0]) => {
    if (!S.city.visible) return; _hv.copy(p); S.city.localToWorld(_hv); smallTag(proj(_hv), txt, cw2(t0 + 0.05, K.sonido9 - 0.05, 0.2, 0.2), HC.white, 24); });
  { _hv.set(0, PH.t + PIL.h * 0.55, PIL.d / 2); lab(_hv.clone(), 'SONIDO GUARDADO', 'DENTRO DE LA DESCARGA', cw2(K.sonido9 + 0.25, K.ciudad10 + 0.4), { color: HC.teal, dx: 140, dy: -100 }); }
  // 10: sin esperar
  if (S.racer.visible && S.city.visible) { _hv.copy(S.racer.position).add(v3(0, 0.08, 0)); S.city.localToWorld(_hv); smallTag(proj(_hv), 'SIN ESPERAR', cw2(K.cualquier10, K.respuesta11 - 0.2, 0.2, 0.2), HC.amber, 24); }
  // 11: no es un juego · es una ciudad · cada ladrillo
  if (S.pad.visible) { _hv.copy(S.pad.position).add(v3(0, -0.36, 0)); smallTag(proj(_hv), 'UN JUEGO', cw2(K.no11 + 0.2, K.te11b, 0.2, 0.2), HC.white, 26); }
  bigFig('UNA CIUDAD', 'CON CADA DETALLE YA HECHO', HC.amber, cw2(K.ciudad11 - 0.05, K.cada11 + 0.1, 0.2, 0.25), 1300);
  if (S.brick.visible) { _hv.copy(S.brick.position).add(v3(0, -0.07, 0)); smallTag(proj(_hv), 'CADA LADRILLO, PINTADO', cw2(K.ladrillo11, K.playstation12 - 0.25, 0.2, 0.2), HC.amber, 26); }
  // 12: ¿PlayStation o Xbox?
  pollPills(t, cw2(K.playstation12 - 0.05, END - 0.35, 0.35, 0.3));
}
