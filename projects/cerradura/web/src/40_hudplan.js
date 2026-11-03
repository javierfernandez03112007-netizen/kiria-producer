// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (cómo evitarlo), rótulos con línea guía, cotas y cifras
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF';
function hdr(t) {
  const a = 1 - darkAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('LA CERRADURA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('BOMBÍN', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('5 PITONES', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('PERFIL EUROPEO', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = 'CÓMO EVITARLO · ???', col = HC.red, blink = true;
    if (t > K.echa12) { txt = 'ECHA LA LLAVE'; col = HC.green; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = a * mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
// flecha curva (giro) alrededor de un punto de pantalla
function arcArrow(C, r, a0, a1, col, k, lw = 5, cross = 0) {
  if (k <= 0.01 || !C) return;
  const a = a0 + (a1 - a0) * eo(clamp(k));
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(col, lw, 14); hg.beginPath(); hg.arc(C.x, C.y, r, a0, a, a1 < a0); hg.stroke();
  const ex = C.x + Math.cos(a) * r, ey = C.y + Math.sin(a) * r, tg = a1 > a0 ? a + Math.PI / 2 : a - Math.PI / 2;
  hg.fillStyle = col; hg.beginPath(); hg.moveTo(ex + Math.cos(tg) * 22, ey + Math.sin(tg) * 22); hg.lineTo(ex + Math.cos(tg + 2.4) * 16, ey + Math.sin(tg + 2.4) * 16); hg.lineTo(ex + Math.cos(tg - 2.4) * 16, ey + Math.sin(tg - 2.4) * 16); hg.closePath(); hg.fill();
  if (cross > 0.01) { const s = 34 * eo(clamp(cross)); glowStroke(HC.red, 9, 18); hg.beginPath(); hg.moveTo(C.x - s, C.y - s); hg.lineTo(C.x + s, C.y + s); hg.moveTo(C.x + s, C.y - s); hg.lineTo(C.x - s, C.y + s); hg.stroke(); }
  noGlow(); hg.restore();
}
function arrowH(A, B, col, k, lw = 6) {      // flecha recta de A a B (pantalla)
  if (k <= 0.01 || !A || !B) return;
  const e = eo(clamp(k)), x = A.x + (B.x - A.x) * e, y = A.y + (B.y - A.y) * e, an = Math.atan2(B.y - A.y, B.x - A.x);
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(col, lw, 14); hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(x, y); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.moveTo(x + Math.cos(an) * 20, y + Math.sin(an) * 20); hg.lineTo(x + Math.cos(an + 2.5) * 18, y + Math.sin(an + 2.5) * 18); hg.lineTo(x + Math.cos(an - 2.5) * 18, y + Math.sin(an - 2.5) * 18); hg.closePath(); hg.fill(); noGlow(); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440, C = S.cyl;
  // L1: la puerta, abierta
  { const s = cw(t, K.abrirla1 + 0.05, K.como2 + 0.2); if (s > 0.01) stamp('ABIERTA', W / 2, Y, s, HC.red, 84); }
  // L2: corchetes alrededor de la cerradura
  if (inSeg(t, TT.cut1, TT.cut2)) { const b = cw(t, K.cerradura2 - 0.1, K.dentro3); if (b > 0.01) { const A = proj(v3(3.67, 10.72, 0)); if (A.ok) brackets(A, 520, 820, b, HC.white, 2); } }
  // L3: cilindro, pitones, muelles
  if (inSeg(t, TT.cut1, TT.cut2)) {
    lab(wpo(C, 0, -0.07, 0.27), 'CILINDRO', 'BOMBÍN', cw(t, K.cilindro3, K.sin4 - 0.1), { dx: 120, dy: 170, color: HG });
    lab(wpo(S.pins[2].kp, 0, 0.03, 0), 'PITONES', '× 5', cw(t, K.pitones3, K.sin4 - 0.1), { dx: -140, dy: 230 });
    lab(wpo(S.pins[3].sp, 0, 0.5, 0), 'MUELLES', null, cw(t, K.muelles3, K.sin4 - 0.1), { dx: -120, dy: -150, color: HD });
    // L4: sin llave, bloquean el giro
    lab(wpo(C, 0, -0.01, 0.29), 'SIN LLAVE', null, cw(t, K.llave4, K.cada5 - 0.15), { dx: 130, dy: 190, color: HC.grey });
    lab(wpo(C, 0, SHEAR, PZ[2]), 'BLOQUEADO', 'EL PITÓN CRUZA EL CORTE', cw(t, K.bloquean4, K.cada5 - 0.15), { dx: -140, dy: -170, color: HC.red });
    { const k = cw(t, K.giro4 - 0.1, K.cada5 - 0.15); if (k > 0.01) { const P = proj(wpo(C, 0, 0, 0.17)); if (P.ok) arcArrow({ x: P.x, y: P.y + 330 }, 70, -2.6, -0.6, HC.red, k, 5, clamp((t - K.giro4 - 0.15) / 0.3)); } }
    // L5: el diente, la altura justa, la línea de corte
    if (S.key.visible) lab(wpo(S.key, 0, keyTop(KU[1]) - 0.004, KU[1]), 'DIENTE', null, cw(t, K.diente5 + 0.1, K.altura5 - 0.15), { dx: 120, dy: 200, color: HC.white });
    { const k = cw(t, K.altura5, K.alinean5 - 0.1); if (k > 0.01) { const P1 = proj(wpo(C, 0, KH[2], PZ[2] - 0.004)), P2 = proj(wpo(C, 0, SHEAR, PZ[2] - 0.004)); if (P1.ok) dimV(P1, P2, 'ALTURA JUSTA', k, HG, -90); } }
    lab(wpo(C, 0, SHEAR, 0.29), 'LÍNEA DE CORTE', 'TODOS ALINEADOS', cw(t, K.alinean5, K.gira6 - 0.1), { dx: 120, dy: -190, color: HG });
    // L6: gira y empuja el cerrojo
    { const k = cw(t, K.gira6 - 0.05, K.cerrojo6); if (k > 0.01) { const P = proj(wpo(C, 0, 0, 0.62)); if (P.ok) arcArrow(P, 150, -1.9, 0.9, HG, k, 6); } }
    lab(wpo(S.boltMesh, 0.25, 0.1, 0), 'CERROJO', null, cw(t, K.cerrojo6, K.barra6 - 0.05), { dx: 90, dy: 200, color: HD });
    lab(wpo(S.boltMesh, 0.3, 0.1, 0), 'CERROJO', 'BARRA RECTA DE ACERO', cw(t, K.barra6 - 0.05, TT.cut2 + 0.2), { dx: -140, dy: 220, color: HD, len: 40 });
  }
  // L7–L9: planta del resbalón
  if (inSeg(t, TT.cut2, TT.cut3)) {
    const LM = S.latchMesh;
    lab(wpo(LM, 3.95, 0.22, 0.0), 'RESBALÓN', null, cw(t, K.resbalon7, K.tiene8 - 0.2), { dx: -130, dy: -200, color: HG });
    { const k = cw(t, K.cierra7, K.tiene8 - 0.2); if (k > 0.01) bigText('SE CIERRA SOLO', W / 2, Y, 58, HC.white, k, { dark: 24 }); }
    lab(wpo(S.bevel, 0, 0, 0), 'CARA INCLINADA', null, cw(t, K.inclinada8 - 0.05, K.punto8 - 0.05), { dx: 130, dy: 190, color: HG });
    lab(wpo(S.bevel, 0, 0, 0), 'PUNTO DÉBIL', null, cw(t, K.punto8, K.lamina9 - 0.35), { dx: 130, dy: 190, color: HC.red });
    if (S.film.visible && S.filmA) { const A = S.filmA[78];
      lab(v3(A[0], 11.9, A[2]), 'LÁMINA FLEXIBLE', null, cw(t, K.lamina9 + 0.25, K.radiografia9 - 0.1), { dx: -120, dy: -260, color: HC.white });
      lab(v3(A[0], 11.9, A[2]), 'RADIOGRAFÍA', 'O CUALQUIER LÁMINA FINA', cw(t, K.radiografia9, K.entra9 + 0.1), { dx: -120, dy: -260, color: HD }); }
    lab(v3(GX, LY + 0.02, 0.26), 'RENDIJA', null, cw(t, K.rendija9 - 0.1, K.empuja9 + 0.2), { dx: -140, dy: 220, color: HC.white });
    { const k = cw(t, K.empuja9, K.mete9 - 0.05); if (k > 0.01 && S.filmA) { const P = proj(v3(GX, LY, S.filmA[0][2] + 0.03)), Q = proj(v3(GX, LY, S.filmA[0][2] + 0.28)); if (P.ok && Q.ok) arrowH(Q, P, HD, k, 6);
        const B = proj(wpo(LM, 4.0, 0.11, 0)), B2 = proj(wpo(LM, 3.86, 0.11, 0)); if (B.ok && B2.ok) arrowH(B, B2, HG, cw(t, K.cara9 - 0.1, K.mete9 - 0.05), 6); } }
    { const s = cw(t, K.mete9 + 0.04, TT.cut3 + 0.3); if (s > 0.01) stamp('ABIERTA', W / 2, Y, s, HC.red, 84); }
  }
  // L10: más de 200 robos en casas cada día
  if (inSeg(t, TT.cut3 - 0.1, TT.cut4 + 0.1)) {
    const k = cw(t, K.n200 - 0.05, TT.cut4 - 0.05); if (k > 0.01) { const n = Math.min(200, Math.round(200 * eo(clamp((t - K.n200 + 0.05) / 0.6)))); bigText('+' + n, W / 2, Y - 60, 150, HC.red, k, { glow: 26, type: false, dark: 30 });
      bigText('ROBOS EN CASAS', W / 2, Y + 50, 40, HC.white, cw(t, K.robos10 - 0.05, TT.cut4 - 0.05), { dark: 22 });
      bigText('CADA DÍA', W / 2, Y + 112, 46, HG, cw(t, K.cada10 - 0.05, TT.cut4 - 0.05), { glow: 14, dark: 22 });
      bigText('74.353 DENUNCIAS EN 2025 · INTERIOR', W / 2, Y + 170, 20, HC.grey, cw(t, K.dia10 - 0.1, TT.cut4 - 0.05), { dark: 16 }); }
  }
  // L11: el cerrojo es recto: ninguna lámina lo mueve
  if (inSeg(t, TT.cut4, TT.cut5)) {
    lab(wpo(S.boltMesh, 0.1, 0.1, 0), 'CERROJO', null, cw(t, K.cerrojo11, K.recto11 - 0.1), { dx: -130, dy: -200, color: HD });
    lab(wpo(S.boltFace, 0.32, 0, 0), 'RECTO', null, cw(t, K.recto11, K.mueve11 + 0.6), { dx: -130, dy: -200, color: HD });
    { const k = cw(t, K.mueve11 - 0.05, TT.cut5 + 0.2); if (k > 0.01) { bigText('NO SE MUEVE', W / 2, Y, 66, HC.white, k, { glow: 12, dark: 26 });
      const P = proj(v3(GX, BY, 0.25)); if (P.ok) { const s = 36 * eo(clamp(k * 1.5)); hg.save(); glowStroke(HC.red, 9, 18); hg.beginPath(); hg.moveTo(P.x - s, P.y - s); hg.lineTo(P.x + s, P.y + s); hg.moveTo(P.x + s, P.y - s); hg.lineTo(P.x - s, P.y + s); hg.stroke(); noGlow(); hg.restore(); } } }
  }
  // L12: echa la llave (2 vueltas), aunque sea un minuto
  if (t >= TT.cut5) {
    const k = cw(t, K.echa12 - 0.05, K.tu13 - 0.1); if (k > 0.01) { bigText('ECHA LA LLAVE', W / 2, Y - 40, 72, HC.green, k, { glow: 16, type: false, dark: 28 });
      const v = fPhi(plugPhi(t)); const nv = v > 1.5 ? 2 : v > 0.5 ? 1 : 0; if (nv > 0) bigText(nv === 1 ? '1 VUELTA' : '2 VUELTAS', W / 2, Y + 48, 44, HC.white, k, { type: false, dark: 22 });
      bigText('AUNQUE SEA 1 MINUTO', W / 2, Y + 118, 32, HG, cw(t, K.aunque12, K.tu13 - 0.1), { dark: 20 }); }
    { const P = proj(wpo(C, 0, 0, 0.62)); const r = cw(t, K.echa12 - 0.05, K.minuto12 + 0.2); if (r > 0.01 && P.ok) arcArrow(P, 120, -1.9, 0.9 + 6.3 * clamp((t - K.echa12) / 2.2), HC.green, r, 5); }
    // L13: ¿portazo o llave?
    const d = cw(t, K.portazo13 - 0.1, END - 0.7); if (d > 0.01) { bigText('¿PORTAZO', W / 2, Y - 30, 84, HC.red, d, { glow: 16, type: false, dark: 28 }); bigText('O LLAVE?', W / 2, Y + 70, 84, HC.green, cw(t, K.llave13 - 0.1, END - 0.7), { glow: 16, type: false, dark: 28 }); }
  }
}
