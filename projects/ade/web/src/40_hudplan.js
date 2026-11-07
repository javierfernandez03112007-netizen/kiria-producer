// ---------------------------------------------------------------- HUD: la trampa pendiente (arriba a la derecha), rótulos con línea guía, cifras grandes con su fuente,
// corchetes en las tres puertas, las ✗ de la llave, los sellos del final y la pregunta de bando
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
  hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 6; hg.fillText(typed('FUENTE: ' + txt, clamp(k * 1.5)), 56, 1548); hg.restore();
}
function cross(P, k, s = 34) {
  if (k <= 0.01 || !P) return; const e = backOut(clamp(k / 0.5)), r = s * e;
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(HRd, 9, 18); hg.lineCap = 'round';
  hg.beginPath(); hg.moveTo(P.x - r, P.y - r); hg.lineTo(P.x + r, P.y + r); hg.moveTo(P.x + r, P.y - r); hg.lineTo(P.x - r, P.y + r); hg.stroke(); noGlow(); hg.restore();
}
function pollPills(t, k) {
  if (k <= 0.01) return;
  const items = [['AUDITORÍA', '#62E3D4', 290], ['BANCA', '#FFC24A', 790]], y = 1370;
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
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // la trampa, pendiente hasta la respuesta
  bracketMsg(t, 'LA TRAMPA · ???', HC.amber, cw2(TT.trap + 0.05, K.trampa15, 0.3, 0.12), true);
  bracketMsg(t, 'LA TRAMPA ↓', HGr, cw2(K.trampa15, K.ade15 + 0.9, 0.12, 0.3), false);
  // 2 · 4: las torres de ofertas
  const top = c => _hv.set(COLS[c].x, COLS[c].n * PT + 0.01, COLS[c].z).clone();
  lab(top(0), 'LA MÁS PEDIDA', 'POR LAS EMPRESAS', cw2(K.piden2 - 0.05, K.trampa3 - 0.1), { color: HGd, dx: 120, dy: -60 });
  lab(top(0), 'ADE', '3,67 % DE LAS OFERTAS', cw2(K.ade4 + 0.05, K.n4_5 - 0.15), { color: HGd, dx: 130, dy: -40 });
  lab(top(1), 'COMERCIO Y MARKETING', '2.ª · 1,57 %', cw2(K.segunda4 - 0.25, K.n4_5 - 0.15), { color: HC.white, dx: -110, dy: 120 });
  lab(_hv.set(COLS[1].x, COLS[1].n * PT * 2 + 0.01, COLS[1].z).clone(), 'EL DOBLE', 'Y NO LLEGA', cw2(K.doble4 + 0.35, K.n4_5 - 0.15), { color: HC.teal, dx: -120, dy: -90 });
  srcLine('INFORME INFOEMPLEO ADECCO, OFERTAS DE EMPLEO DE 2024', cw2(K.ade4 + 0.2, K.n4_5 - 0.15));
  // 5 · 6 · 7: trabajan, cobran, puesto de universitario
  bigFig('8 DE CADA 10', 'TRABAJAN 4 AÑOS DESPUÉS', HC.white, cw2(K.n8_5 - 0.05, K.cobran6 + 0.15));
  { const k = cw2(K.n32_6 - 0.1, K.ahora7 - 0.1), n = Math.round(32000 * eo(clamp((t - K.n32_6 + 0.1) / 0.8)) / 100) * 100;
    bigFig(n.toLocaleString('es-ES').replace(/ /g, '.') + ' €', 'AL AÑO, DE MEDIA', HGd, k); }
  srcLine('U-RANKING 2026 (FUNDACIÓN BBVA E IVIE) · ADMINISTRACIÓN Y EMPRESA', cw2(K.n8_5, K.resto8 + 2.4));
  bigFig('4 DE CADA 10', 'CON PUESTO DE UNIVERSITARIO', HGd, cw2(K.n4_7 - 0.05, K.resto8 - 0.1));
  // 8: el resto
  lab(_hv.set(-0.1, 0.075, 0.05).clone(), 'SIN PUESTO DE UNIVERSITARIO', 'CASI 6 DE CADA 10', cw2(K.resto8 + 0.25, K.y9 - 0.1), { color: HC.grey, subCol: HC.white, dx: 140, dy: -170 });
  // 9: los nuevos
  { const k = cw2(K.salen9 - 0.05, K.fijate10 - 0.1), n = Math.round(14988 * eo(clamp((t - K.salen9) / 1.6)));
    bigFig('+' + n.toLocaleString('es-ES').replace(/ /g, '.'), 'GRADUADOS NUEVOS EN UN AÑO', HC.white, k, 1300); }
  // 10: tres salidas típicas
  SPECIAL.forEach(([k5, j], q) => { const d = S.doors[doorKey(k5, j)]; d.getWorldPosition(_hv); _hv.y += DH / 2; const P = proj(_hv);
    brackets(P.ok ? P : null, 190, 300, cw2(K.tres10 + q * 0.18, K.firmar11 + 0.1, 0.25, 0.25), HGr, 3); });
  // 11: auditoría · 12: banca · 13: Hacienda
  { const d = S.doors[doorKey(5, 0)];
    lab(d.localToWorld(v3(-0.048, 0.08, 0.035)), '3 AÑOS', 'DE EXPERIENCIA', cw2(K.n3_11, K.banco12 - 0.5), { color: HGd, dx: -60, dy: -160 });
    lab(d.localToWorld(v3(0.088, 0.04, 0.02)), 'EXAMEN DEL ESTADO', 'PARA FIRMAR AUDITORÍAS', cw2(K.examen11, K.banco12 - 0.5), { color: HC.white, dx: 60, dy: 190 }); }
  srcLine('LEY 22/2015 DE AUDITORÍA DE CUENTAS, ART. 9', cw2(K.n3_11, K.banco12 - 0.5));
  { const d = S.doors[doorKey(5, 1)], c = S.cert; if (c.visible) { c.getWorldPosition(_hv); lab(_hv.clone(), 'CERTIFICADO APARTE', 'LO EXIGE LA CNMV', cw2(K.certificado12, K.inspector13 - 0.2), { color: HGd, dx: 90, dy: -170 }); } }
  srcLine('CNMV, GUÍA TÉCNICA 4/2017 (MIFID II)', cw2(K.certificado12, K.inspector13 - 0.2));
  stamp('OPOSICIÓN', 540, 1330, cw2(K.oposicion13 + 0.05, K.ninguna14 - 0.05, 0.05, 0.2), HRd, 84);
  srcLine('CUERPO SUPERIOR DE INSPECTORES DE HACIENDA DEL ESTADO', cw2(K.oposicion13, K.ninguna14 - 0.05));
  // 14: la llave «ADE» no gira en ninguna
  SPECIAL.forEach(([k5, j], q) => { const tr = TT.tries[q]; lockWorld(doorKey(k5, j), _hv); _hv.y += 0.045; const P = proj(_hv); cross(P.ok ? P : null, cw2(tr + 0.28, TT.fly + 0.2, 0.25, 0.25), 30); });
  // 15: la llave del portal y los candados
  if (S.key.visible && t > K.llave15 - 0.1) { S.key.getWorldPosition(_hv); lab(_hv.clone(), 'ADE', 'LA LLAVE DEL PORTAL', cw2(K.llave15 - 0.05, K.pero15 + 0.1), { color: HGd, dx: -150, dy: -230 }); }
  { const key = TT.lockOrder[0]; lockWorld(key, _hv); lab(_hv.clone(), 'SU PROPIA CERRADURA', 'EN MUCHOS DESPACHOS', cw2(K.propia15 - 0.1, K.salidas16 - 0.1), { color: HRd, dx: 150, dy: -150 }); }
  // 16: salidas sí, atajos no
  stamp('SALIDAS ✓', 540, 1280, cw2(K.salidas16 + 0.05, K.mandaselo17 - 0.1, 0.05, 0.25), HGr, 70);
  stamp('ATAJOS ✗', 540, 1430, cw2(K.ninguno16 + 0.02, K.mandaselo17 - 0.1, 0.05, 0.25), HRd, 70);
  // 17: ¿auditoría o banca?
  pollPills(t, cw2(K.auditoria17 - 0.05, END - 0.35, 0.35, 0.3));
}
