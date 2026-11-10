// ---------------------------------------------------------------- HUD: la pregunta pendiente, el sello de la NASA, las cifras con su fuente, las etiquetas del
// túnel (las bolitas, el ángulo, las flechas, la presión), «no flota» y la votación con los asientos
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
  const items = [['VENTANILLA', '#62E3D4', 290], ['PASILLO', '#FFC24A', 790]], y = 1370;
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
// el sello rojo de «INCORRECTA»
function stamp2(P, k) {
  if (k <= 0.01 || !P || !P.ok) return; const e = backOut(clamp(k / 0.35)), s = lerp(1.6, 1, e);
  hg.save(); hg.globalAlpha = clamp(k * 3); hg.translate(P.x, P.y); hg.rotate(-0.14); hg.scale(s, s);
  hfont(58); hg.letterSpacing = '6px'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; const w = hg.measureText('INCORRECTA').width + 70;
  glowStroke(HRd, 7, 10); rr(hg, -w / 2, -62, w, 124, 14); hg.stroke(); noGlow(); hg.fillStyle = HRd; hg.fillText('INCORRECTA', 0, -14);
  hfont(26, false); hg.letterSpacing = '5px'; hg.fillText('SEGÚN LA NASA', 0, 34); hg.restore();
}
// los asientos de una fila: ventanilla y pasillo
function seats(t, k) {
  if (k <= 0.01) return; const y = 1150, sw = 92, sh = 104, gap = 14, aisle = 70, n = 6, total = n * sw + (n - 2) * gap + aisle, x0 = 540 - total / 2;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.55)'; rr(hg, x0 - 40, y - 90, total + 80, sh + 150, 28); hg.fill();
  for (let i = 0; i < n; i++) { const left = i < 3, j = left ? i : i - 3, x = x0 + (left ? 0 : 3 * sw + 2 * gap + aisle) + j * (sw + gap);
    const win = i === 0 || i === n - 1, ais = i === 2 || i === 3, kk = backOut(clamp((k - i * 0.06) / 0.5)), pulse = (win || ais) ? 1 + 0.04 * Math.sin(t * 6 + (win ? 0 : Math.PI)) : 1;
    hg.save(); hg.translate(x + sw / 2, y + sh / 2); hg.scale(kk * pulse, kk * pulse);
    hg.fillStyle = win ? '#62E3D4' : ais ? '#FFC24A' : 'rgba(238,242,246,.35)'; rr(hg, -sw / 2, -sh / 2, sw, sh, 18); hg.fill();
    hg.fillStyle = 'rgba(0,0,0,.25)'; rr(hg, -sw / 2 + 10, -sh / 2 + 10, sw - 20, 26, 8); hg.fill(); hg.restore(); }
  hfont(22); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.fillText('PASILLO', 540, y - 46);
  hg.strokeStyle = 'rgba(238,242,246,.5)'; hg.lineWidth = 2; hg.setLineDash([8, 8]); hg.beginPath(); hg.moveTo(540, y - 30); hg.lineTo(540, y + sh + 20); hg.stroke(); hg.setLineDash([]);
  hg.restore();
}
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // la pregunta, pendiente hasta la respuesta
  bracketMsg(t, 'LO QUE LO SOSTIENE · ???', HC.amber, cw2(K.final2, K.respuesta10, 0.3, 0.12), true);
  bracketMsg(t, 'LO QUE LO SOSTIENE ↓', HGr, cw2(K.respuesta10, K.rato10 + 0.6, 0.12, 0.3), false);
  // 1-2: la NASA y las 575 toneladas
  { _hv.set(0.2, BOARD.y, BOARD.z); stamp2(proj(_hv), cw2(K.nasa2 - 0.05, K.contaron3 - 0.1, 0.15, 0.3)); }
  bigFig('575 t', 'AIRBUS A380 · PESO MÁXIMO AL DESPEGAR', HC.white, cw2(K.n575_2 - 0.05, K.final2 + 0.5, 0.2, 0.3), 1300);
  srcLine('NASA GLENN · UNIVERSIDAD DE CAMBRIDGE · AIRBUS · «CIENTOS DE TONELADAS»: CÁLCULO DE EJEMPLO', cw2(K.nasa2, K.rato10, 0.3, 0.3));
  // 3-4: las bolitas: el «mito» y el humo de verdad
  if (S.ballA.visible) { S.ballA.getWorldPosition(_hv); _hv.y += 0.09; smallTag(proj(_hv), 'A · MÁS CAMINO', cw2(K.camino3 - 0.1, K.vez3 - 0.2, 0.2, 0.2), HC.amber, 24);
    smallTag(proj(_hv), 'LLEGA ANTES', cw2(K.antes4 - 0.05, K.curva5 - 0.2, 0.2, 0.2), HC.amber, 26); }
  if (S.ballB.visible) { S.ballB.getWorldPosition(_hv); _hv.y -= 0.09; smallTag(proj(_hv), 'B', cw2(K.camino3 - 0.1, K.vez3 - 0.2, 0.2, 0.2), HC.teal, 24);
    smallTag(proj(_hv), 'LLEGA DESPUÉS', cw2(K.antes4b - 0.05, K.curva5 - 0.2, 0.2, 0.2), HC.teal, 26); }
  { zWorld(S.upPath[S.upPath.length - 1], alphaAt(t), _hv); _hv.z += TUN.D * 0.5; _hv.y += 0.16; const P = proj(_hv), ck = cw2(K.vez3 - 0.1, K.tunel4, 0.2, 0.3);
    smallTag(P, 'CITA: A LA VEZ', ck, HC.white, 26); if (P.ok) cross({ x: P.x, y: P.y }, cw2(K.cita4 - 0.05, K.tunel4, 0.1, 0.3), 46); }
  { _hv.set(TUN.x + 0.2, TUN.y + TUN.H / 2 + 0.05, TUN.z); lab(_hv.clone(), 'TÚNEL DE VIENTO', 'HUMO DE COLORES · UNIVERSIDAD DE CAMBRIDGE', cw2(K.tunel4 + 0.2, K.llega4, 0.25, 0.25), { color: HC.white, dx: 110, dy: -120 }); }
  // 5: boca abajo
  if (S.acro.visible) { S.acro.getWorldPosition(_hv); _hv.y -= 1.6; smallTag(proj(_hv), 'BOCA ABAJO', cw2(K.boca5 - 0.1, K.clave6, 0.2, 0.2), HC.amber, 28); }
  // 6: el ángulo y el aire hacia abajo
  { zWorld({ x: -2.3, y: 0.0 }, alphaAt(t), _hv); _hv.z += TUN.D * 0.5; smallTag(proj(_hv), 'UN POCO INCLINADA', cw2(K.inclinada6 - 0.1, K.cientos7 - 0.2, 0.2, 0.2), HC.white, 24); }
  { zWorld({ x: 3.4, y: -0.9 }, S.AL1, _hv); _hv.z += TUN.D * 0.5; smallTag(proj(_hv), 'AIRE HACIA ABAJO', cw2(K.abajo6 - 0.1, K.cientos7 - 0.2, 0.2, 0.2), HC.teal, 26); }
  // 7: cientos de toneladas
  bigFig('≈ 480 t/s', 'DE AIRE HACIA ABAJO · UN A380 EN CRUCERO (CÁLCULO DE EJEMPLO)', HC.teal, cw2(K.cientos7 + 0.05, K.si8, 0.2, 0.25), 1300);
  // 8: acción y reacción
  if (S.arrDn.visible) { S.arrDn.getWorldPosition(_hv); _hv.y -= 0.8; smallTag(proj(_hv), 'EL ALA EMPUJA EL AIRE', cw2(K.abajo8, K.arriba9, 0.2, 0.2), HC.teal, 24); }
  if (S.arrUp.visible) { S.arrUp.getWorldPosition(_hv); _hv.y += 0.85; smallTag(proj(_hv), 'EL AIRE EMPUJA EL ALA', cw2(K.empuja8b, K.arriba9, 0.2, 0.2), HC.amber, 24); }
  // 9: presiones
  { _hv.set(TUN.x + 0.1, TUN.y + 0.42, TUN.z + TUN.D * 0.5); smallTag(proj(_hv), 'PRESIÓN BAJA', cw2(K.baja9 - 0.1, K.levanta9 - 0.2, 0.2, 0.2), '#7CC8FF', 26);
    _hv.set(TUN.x + 0.1, TUN.y - 0.4, TUN.z + TUN.D * 0.5); smallTag(proj(_hv), 'PRESIÓN ALTA', cw2(K.sube9 - 0.1, K.levanta9 - 0.2, 0.2, 0.2), '#FF8A6A', 26); }
  if (S.big.visible) { S.big.getWorldPosition(_hv); _hv.y += 9; smallTag(proj(_hv), 'LA DIFERENCIA LO LEVANTA', cw2(K.levanta9, K.respuesta10, 0.2, 0.2), HC.white, 26); }
  // 10: la respuesta
  bigFig('NO FLOTA', 'SE SUJETA EMPUJANDO EL AIRE HACIA ABAJO', HC.amber, cw2(K.flota10 - 0.05, K.rato10 + 0.7, 0.2, 0.3), 1290);
  // 11: ¿ventanilla o pasillo?
  seats(t, cw2(K.ventanilla11 - 0.1, END - 0.35, 0.35, 0.3));
  pollPills(t, cw2(K.ventanilla11 - 0.05, END - 0.35, 0.35, 0.3));
}
