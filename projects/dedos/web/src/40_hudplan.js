// ---------------------------------------------------------------- HUD (como en Derecho): cabecera con la pregunta pendiente (¿da artritis?), cifras grandes y
// rótulos con línea guía.
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('TUS DEDOS', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('QUÉ PASA CUANDO TE LOS CRUJES', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ASÍ FUNCIONA', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('TU CUERPO', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('POR DENTRO', 1024, 178);
  const mk = win(t, K.tenian2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿DA ARTRITIS? · ???', col = HC.red, blink = true;
    if (t > K.respuesta7 + 0.3) { txt = '50 AÑOS DE PRUEBA (UNGER)'; col = HG; blink = false; }
    if (t > K.ninguna8) { txt = 'NO: NI EN UNA MANO NI EN LA OTRA'; col = HC.green; blink = false; }
    if (t > K.tu9) { txt = '¿TÚ TE LOS CRUJES?'; col = HC.white; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: 50 años
  { const a = cw(t, K.medico1 - 0.05, K.tenian2 - 0.32); if (a > 0.01) { bigText(Math.round(1 + 49 * eo(clamp((t - K.medico1) / (K.anos1 + 0.2 - K.medico1)))) + ' AÑOS', W / 2, Y, 110, HG, a, { glow: 18, type: false, dark: 30 }); bigText('UN MÉDICO LO COMPROBÓ EN SU PROPIA MANO', W / 2, Y + 88, 26, HC.white, a, { dark: 20 }); } }
  // L2: ¿tenían razón? (la «?» roja junto a la mano)
  { const a = cw(t, K.tenian2 - 0.05, K.cada3 - 0.1); if (a > 0.01) { bigText('¿TENÍAN RAZÓN?', W / 2, Y + 10, 72, HC.white, a, { glow: 10, type: false, dark: 28 });
      if (S.ctr.visible) { const P = proj(wpo(S.hand, 0.0, 0.42, 0.08)); if (P.ok) bigText('?', P.x + 190, P.y - 120, 170, HC.red, a, { glow: 30, type: false }); } } }
  // L3: la cápsula con líquido, la presión cae, la burbuja
  { const D = ST.D; const U = D.kn.userData;
    if (D.Z.visible) { lab(U.caps, 0.0, 0.9, 0.3, 'CÁPSULA', 'LLENA DE LÍQUIDO SINOVIAL', cw(t, K.capsula3, K.tirar3 - 0.1), { dx: 120, dy: -200, color: HG });
      lab(D.g, 0, 0.1, 0.02, 'PRESIÓN', 'DENTRO DEL NUDILLO', cw(t, K.presion3, K.gas3 - 0.1), { dx: -140, dy: -150, color: HC.red });
      lab(U.bub, 0, 1.0, 0, 'BURBUJA DE GAS', 'SE FORMA DE GOLPE', cw(t, K.golpe3 + 0.1, K.n2015 - 0.1), { dx: 130, dy: -190, color: HC.teal }); }
    const a = cw(t, K.tirar3 - 0.05, K.presion3 - 0.32); if (a > 0.01) bigText('TIRAS DEL DEDO', W / 2, Y + 20, 64, HC.white, a, { glow: 8, type: false, dark: 26 });
    const b = cw(t, K.presion3 - 0.05, K.golpe3 - 0.32); if (b > 0.01) bigText('LA PRESIÓN CAE', W / 2, Y + 20, 72, HC.red, b, { glow: 14, type: false, dark: 28 });
    const c = cw(t, K.golpe3 - 0.05, K.n2015 - 0.32); if (c > 0.01) { bigText('¡BURBUJA!', W / 2, Y, 110, HC.teal, c, { glow: 22, type: false, dark: 30 }); bigText('EL GAS DEL LÍQUIDO SE JUNTA DE GOLPE', W / 2, Y + 86, 26, HC.white, c, { dark: 20 }); } }
  // L4: 2015, la resonancia: 0,31 s
  { const C = ST.C; const a = cw(t, K.n2015 - 0.05, K.menos4 - 0.32); if (a > 0.01) { bigText('2015', W / 2, Y, 110, HC.white, a, { glow: 14, type: false, dark: 30 }); bigText('LA PRIMERA VEZ QUE SE GRABA EN UNA RESONANCIA', W / 2, Y + 86, 24, HG, a, { dark: 20 }); }
    const b = cw(t, K.menos4 - 0.05, K.discute5 - 0.32); if (b > 0.01) { bigText('0,31 s', W / 2, Y, 120, HG, b, { glow: 22, type: false, dark: 30 }); bigText('MENOS DE UN TERCIO DE SEGUNDO', W / 2, Y + 90, 28, HC.white, b, { dark: 20 }); }
    if (C.Z.visible) lab(C.scr, 0, 0.56, 0.02, 'RESONANCIA MAGNÉTICA', 'PLOS ONE, 2015', cw(t, K.grabaron4, K.menos4 - 0.1), { dx: -140, dy: -170, color: HC.white }); }
  // L5–L6: ¿al nacer o al romperse? · 20 minutos
  { const Kk = ST.K; const a = cw(t, K.discute5 - 0.05, K.burbuja6 - 0.32); if (a > 0.01) { bigText('¿AL NACER…', W / 2, Y - 10, 64, HC.white, a, { glow: 8, type: false, dark: 26 }); bigText('O AL ROMPERSE?', W / 2, Y + 62, 64, HG, cw(t, K.romperse5 - 0.1, K.burbuja6 - 0.32), { glow: 12, type: false, dark: 26 }); bigText('LOS CIENTÍFICOS AÚN NO SE PONEN DE ACUERDO', W / 2, Y + 122, 24, HC.white, a, { dark: 18 }); }
    if (Kk.Z.visible) { lab(Kk.j1, 0, 0.42, 0, '¿AL NACER?', 'RESONANCIA, 2015', cw(t, K.nacer5 - 0.05, K.burbuja6 - 0.1), { dx: -110, dy: -180, color: HC.teal });
      lab(Kk.j2, 0, 0.42, 0, '¿AL ROMPERSE?', 'ESTUDIOS DE 1971 Y 2018', cw(t, K.romperse5 - 0.05, K.burbuja6 - 0.1), { dx: 110, dy: -180, color: HG }); }
    const b = cw(t, K.durar6 - 0.05, K.respuesta7 - 0.32); if (b > 0.01) { const n = Math.round(20 * eio(clamp((t - K.durar6) / (K.minutos6 + 1.0 - K.durar6)))); bigText(n + ' MIN', W / 2, Y, 120, HG, b, { glow: 20, type: false, dark: 30 }); bigText(t < K.eso6 ? 'LA BURBUJA PUEDE SEGUIR AHÍ' : 'Y MIENTRAS, ESE DEDO NO VUELVE A CRUJIR', W / 2, Y + 90, 28, HC.white, b, { dark: 20 }); } }
  // L7: Donald Unger, 50 años crujiendo una sola mano
  { const P = ST.P; const a = cw(t, K.donald7 - 0.05, K.dos7 - 0.32); if (a > 0.01) { bigText('DONALD UNGER', W / 2, Y, 76, HC.white, a, { glow: 10, type: false, dark: 28 }); bigText('MÉDICO · SOLO LA MANO IZQUIERDA', W / 2, Y + 74, 28, HG, cw(t, K.sola7 - 0.1, K.dos7 - 0.32), { dark: 20 }); }
    const b = cw(t, K.dos7 - 0.05, K.tuvo8 - 0.32); if (b > 0.01) { bigText(t < K.n50b - 0.05 ? '2 VECES AL DÍA' : '50 AÑOS', W / 2, Y, 100, HG, b, { glow: 18, type: false, dark: 30 }); bigText('MÁS DE 36.500 CRUJIDOS', W / 2, Y + 84, 28, HC.white, cw(t, K.n50b - 0.1, K.tuvo8 - 0.32), { dark: 20 }); }
    if (P.Z.visible) { lab(P.hL, 0.03, 0.62, 0.05, 'LA IZQUIERDA', 'SE LA CRUJÍA', cw(t, K.sola7, K.tuvo8 - 0.1), { dx: -40, dy: -290, color: HG });
      lab(P.hR, 0.03, 0.62, 0.05, 'LA DERECHA', 'NO (PARA COMPARAR)', cw(t, K.mano7, K.tuvo8 - 0.1), { dx: 40, dy: -150, color: HC.white }); } }
  // L8: ninguna artritis · Ig Nobel · 215 personas
  { const Bs = ST.B; const a = cw(t, K.ninguna8 - 0.05, K.ig8 - 0.32); if (a > 0.01) { bigText('NINGUNA ARTRITIS', W / 2, Y, 70, HC.green, a, { glow: 14, type: false, dark: 28 }); bigText('NI EN UNA MANO NI EN LA OTRA', W / 2, Y + 74, 28, HC.white, a, { dark: 20 }); }
    const b = cw(t, K.ig8 - 0.05, K.n215 - 0.32); if (b > 0.01) { bigText('IG NOBEL', W / 2, Y, 100, HG, b, { glow: 20, type: false, dark: 30 }); bigText('MEDICINA · 2009', W / 2, Y + 84, 28, HC.white, b, { dark: 20 }); }
    const c = cw(t, K.n215 - 0.05, K.tu9 - 0.32); if (c > 0.01) { bigText(Math.round(215 * eo(clamp((t - K.n215 + 0.05) / 0.9))) + ' PERSONAS', W / 2, Y, 84, HC.white, c, { glow: 10, type: false, dark: 28 }); bigText('ESTUDIO DE 2011: LA MISMA CONCLUSIÓN', W / 2, Y + 80, 28, HC.green, c, { dark: 20 }); }
    if (Bs.Z.visible) { const F = Bs.lb.userData.films; lab(F[0], 0, 0.1, 0.005, 'SIN ARTRITIS', null, cw(t, K.ninguna8 - 0.1, K.ig8 - 0.1), { dx: -110, dy: -150, color: HC.green }); lab(F[1], 0, 0.1, 0.005, 'SIN ARTRITIS', null, cw(t, K.ninguna8 + 0.1, K.ig8 - 0.1), { dx: 110, dy: -150, color: HC.green }); } }
  // L9: ¿tú te los crujes? · mándaselo
  { const a = cw(t, K.tu9 - 0.05, K.mandaselo9 - 0.3); if (a > 0.01) bigText('¿TÚ TE LOS CRUJES?', W / 2, Y + 20, 68, HC.white, a, { glow: 10, type: false, dark: 28 });
    const m = cw(t, K.mandaselo9 - 0.05, END - 0.6); if (m > 0.01) { bigText('MÁNDASELO A QUIEN TE DICE', W / 2, Y - 10, 40, HC.white, m, { dark: 24 }); bigText('QUE TE DARÁ ARTRITIS', W / 2, Y + 60, 56, HG, cw(t, K.dara9 - 0.1, END - 0.6), { glow: 14, dark: 26 }); } }
}
