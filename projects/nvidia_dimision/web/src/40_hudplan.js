// ---------------------------------------------------------------- HUD (como en Derecho): cabecera con la pregunta pendiente (¿qué investigan?), cifras grandes y
// rótulos con línea guía. Todo lo que no confirma Nvidia lleva el medio que lo publica.
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('NVIDIA', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('LA DIMISIÓN DE SU JEFE', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('DIMITE EL', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('12 NOV', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('TRAS 33 AÑOS', 1024, 178);
  const mk = win(t, K.otra2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿QUÉ INVESTIGAN? · ???', col = HC.red, blink = true;
    if (t > K.respuesta7 + 0.3) { txt = '¿OBJETIVO DE ESPIONAJE? (CONSEJO)'; col = HG; blink = false; }
    if (t > K.crees9) { txt = '¿Y TÚ QUÉ CREES?'; col = HC.white; blink = false; }
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
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: dimite · tras confesar una infidelidad
  { const a = cw(t, K.dimitido1 - 0.05, K.confesar1 - 0.32); if (a > 0.01) { bigText('DIMITE', W / 2, Y, 120, HC.white, a, { glow: 20, type: false, dark: 30 }); bigText('EL JEFE DE NVIDIA', W / 2, Y + 92, 30, HG, a, { dark: 20 }); }
    const b = cw(t, K.confesar1 - 0.05, K.pero2 - 0.1); if (b > 0.01) { bigText('TRAS CONFESAR', W / 2, Y - 10, 44, HC.white, b, { dark: 24 }); bigText('UNA INFIDELIDAD', W / 2, Y + 62, 60, HG, b, { glow: 14, dark: 26 }); }
    if (S.ctr.visible) { lab(S.chip, 0.33, 0.12, 0.3, 'NVIDIA', 'CHIPS PARA LA IA', cw(t, K.nvidia1, K.dimitido1 - 0.05), { dx: 120, dy: -140, color: HC.green });
      lab(S.chair, 0, 1.25, 0, 'SU SILLA', 'VACÍA', cw(t, K.dimitido1 + 0.3, K.confesar1 + 0.2), { dx: -120, dy: -120, color: HC.white }); } }
  // L2: no investiga si fue infiel… sino otra cosa (la «?» roja sobre la vitrina)
  { const a = cw(t, K.no2 - 0.05, K.otra2 - 0.32); if (a > 0.01) { bigText('NO INVESTIGA', W / 2, Y - 10, 44, HC.white, a, { dark: 24 }); bigText('SI FUE INFIEL', W / 2, Y + 60, 56, HC.white, a, { dark: 26 }); }
    const b = cw(t, K.otra2 - 0.05, K.jensen3 - 0.1); if (b > 0.01) bigText('SINO OTRA COSA', W / 2, Y + 20, 62, HC.red, b, { glow: 16, dark: 26 });
    if (S.vit.visible) { const L = S.vit.userData.lock; const q = cw(t, K.otra2, K.jensen3 + 0.2); if (q > 0.01) { const P = proj(wpo(L, 0, 0.02, 0.02)); if (P.ok) bigText('?', P.x, P.y - 150, 150, HC.red, q, { glow: 30, type: false }); } } }
  // L3: 33 años al frente · la empresa más valiosa del mundo
  { const D = ST.D; const a = cw(t, K.n33 - 0.1, K.nvidia3 - 0.1); if (a > 0.01) { bigText('33 AÑOS', W / 2, Y, 110, HC.white, a, { glow: 18, type: false, dark: 30 }); bigText('AL FRENTE · COFUNDÓ NVIDIA EN 1993', W / 2, Y + 88, 28, HC.white, a, { dark: 20 }); }
    const b = cw(t, K.valiosa3 - 0.1, K.domingo4 - 0.15); if (b > 0.01) { bigText('N.º 1 DEL MUNDO', W / 2, Y, 92, HG, b, { glow: 22, type: false, dark: 30 }); bigText('5,85 BILLONES $ · OCTUBRE DE 2026', W / 2, Y + 86, 28, HC.white, b, { dark: 20 }); }
    if (D.Z.visible) { lab(D.np, 0, 0.06, 0.02, 'JENSEN HUANG', 'COFUNDADOR Y CEO', cw(t, K.huang3 + 0.2, K.nvidia3 - 0.1), { dx: 130, dy: -170, color: HC.white });
      lab(D.med, 0, 0.0, 0.02, 'LA EMPRESA MÁS VALIOSA', 'DEL MUNDO (OCT. 2026)', cw(t, K.valiosa3 + 0.15, K.domingo4 - 0.1), { dx: -150, dy: -110, color: HG }); } }
  // L4: «Fui infiel a mi mujer»
  { const C = ST.C; const a = cw(t, K.fui4 - 0.05, K.consejo5 - 0.1); if (a > 0.01) { bigText('«FUI INFIEL A MI MUJER»', W / 2, Y, 52, HC.white, a, { glow: 10, dark: 28 }); bigText('CARTA A SUS EMPLEADOS · DOMINGO 8 NOV', W / 2, Y + 80, 26, HG, a, { dark: 20 }); }
    if (C.Z.visible) { lab(C.letter, 0.0, 0.11, 0, 'SU CARTA', '8 DE NOVIEMBRE', cw(t, K.escribio4, K.fui4 - 0.1), { dx: 130, dy: -200, color: HC.white });
      // L5: la investigación y la dimisión
      lab(C.doc, 0, 0.12, 0, 'EL CONSEJO', 'ABRE UNA INVESTIGACIÓN', cw(t, K.consejo5 + 0.1, K.pocos5 - 0.1), { dx: 140, dy: -170, color: HG });
      lab(C.np, 0, 0.03, 0, 'DIMITE', '12 DE NOVIEMBRE', cw(t, K.dimitio5 + 0.25, K.jueves6 - 0.1), { dx: -140, dy: -160, color: HC.red }); }
    const b = cw(t, K.investigacion5 - 0.05, K.dimitio5 - 0.32); if (b > 0.01) { bigText('INVESTIGACIÓN', W / 2, Y - 10, 64, HC.white, b, { glow: 12, type: false, dark: 28 }); bigText('INDEPENDIENTE · LA ABRE EL CONSEJO', W / 2, Y + 64, 28, HG, b, { dark: 20 }); }
    const c = cw(t, K.dimitio5 - 0.05, K.jueves6 - 0.1); if (c > 0.01) { bigText('DIMITE', W / 2, Y, 120, HC.red, c, { glow: 24, type: false, dark: 30 }); bigText('SE ANUNCIA EL 12 DE NOVIEMBRE', W / 2, Y + 90, 28, HC.white, c, { dark: 20 }); } }
  // L6: −13 % al abrir la bolsa
  { const Kk = ST.K; const a = cw(t, K.abrir6 - 0.05, K.hundio6 - 0.32); if (a > 0.01) bigText('JUEVES · APERTURA', W / 2, Y + 20, 56, HC.white, a, { dark: 26 });
    const b = cw(t, K.hundio6 - 0.05, K.respuesta7 - 0.1); if (b > 0.01) { const n = Math.round(13 * eo(clamp((t - K.hundio6 + 0.05) / 0.9))); bigText('−' + n + ' %', W / 2, Y, 140, HC.red, b, { glow: 26, type: false, dark: 30 }); bigText('AL ABRIR LA BOLSA · CAYÓ MÁS DE UN 13 %', W / 2, Y + 100, 26, HC.white, b, { dark: 20 }); }
    if (Kk.Z.visible) lab(Kk.bell.userData.hb, 0, -0.12, 0.05, 'APERTURA', 'JUEVES 12 NOV', cw(t, K.abrir6 + 0.1, K.hundio6 - 0.1), { dx: 130, dy: -170, color: HG }); }
  // L7: ¿objetivo de espionaje extranjero?
  { const P = ST.P; const a = cw(t, K.objetivo7 - 0.05, K.segun8 - 0.1); if (a > 0.01) { bigText('¿OBJETIVO DE ESPIONAJE', W / 2, Y - 10, 46, HC.white, a, { dark: 24 }); bigText('EXTRANJERO?', W / 2, Y + 58, 60, HG, cw(t, K.espionaje7 - 0.1, K.segun8 - 0.1), { glow: 14, dark: 26 }); bigText('LO INVESTIGA EL CONSEJO DE NVIDIA', W / 2, Y + 118, 24, HC.white, a, { dark: 18 }); }
    if (P.Z.visible) { lab(P.fold, 0, 0.0, 0.0, 'LA RESPUESTA', 'LO QUE INVESTIGA EL CONSEJO', cw(t, K.respuesta7 + 0.4, K.espionaje7 - 0.1), { dx: 130, dy: -230, color: HG });
      // L8: las dos relaciones, cada una con el medio que la publica
      lab(P.sil1, 0, 0.36 * 0.74, 0, 'SOSPECHOSA DE ESPIAR', 'PARA CHINA · SEGÚN THE WASHINGTON POST', cw(t, K.sospechosa8, K.y8 - 0.05), { dx: 120, dy: -200, color: HC.red, subSize: 17 });
      lab(P.sil2, 0, 0.24 * 0.74, 0, 'DIRECTIVA A SUS ÓRDENES', 'SEGÚN THE NEW YORK TIMES', cw(t, K.directiva8 + 0.1, K.crees9 - 0.1), { dx: -120, dy: -230, color: HC.white, subSize: 17 }); }
    const b = cw(t, K.mujer8 - 0.05, K.y8 - 0.1); if (b > 0.01) { bigText('LA MUJER CON LA QUE FUE INFIEL', W / 2, Y - 10, 34, HC.white, b, { dark: 22 }); bigText('¿ESPÍA PARA CHINA?', W / 2, Y + 60, 64, HC.red, cw(t, K.sospechosa8 - 0.1, K.y8 - 0.1), { glow: 14, dark: 26 }); bigText('SOSPECHOSA, SEGÚN THE WASHINGTON POST', W / 2, Y + 120, 24, HC.white, cw(t, K.sospechosa8 - 0.1, K.y8 - 0.1), { dark: 18 }); }
    const c = cw(t, K.otra8 - 0.05, K.crees9 - 0.32); if (c > 0.01) { bigText('OTRA RELACIÓN', W / 2, Y - 10, 64, HC.white, c, { glow: 10, type: false, dark: 26 }); bigText('CON UNA DIRECTIVA A SUS ÓRDENES', W / 2, Y + 62, 32, HG, cw(t, K.directiva8 - 0.1, K.crees9 - 0.1), { dark: 20 }); bigText('SEGÚN THE NEW YORK TIMES', W / 2, Y + 116, 24, HC.white, c, { dark: 18 }); } }
  // L9: la pregunta y el envío
  { const Bs = ST.B; const a = cw(t, K.crees9 - 0.05, K.mandaselo9 - 0.3); if (a > 0.01) { bigText('¿POR UNA INFIDELIDAD', W / 2, Y - 10, 50, HC.white, a, { dark: 26 }); bigText('LE TIENEN QUE OBLIGAR A DIMITIR?', W / 2, Y + 62, 42, HG, cw(t, K.obligar9 - 0.15, K.mandaselo9 - 0.05), { glow: 12, dark: 24 }); }
    if (Bs.Z.visible) { lab(Bs.ring, 0, 0.06, 0, 'VIDA PRIVADA', null, cw(t, K.crees9 + 0.3, K.mandaselo9 - 0.1), { dx: -110, dy: -200, color: HG });
      lab(Bs.np, 0, 0.03, 0, 'SU CARGO', null, cw(t, K.crees9 + 0.5, K.mandaselo9 - 0.1), { dx: 110, dy: -230, color: HC.white }); }
    const m = cw(t, K.mandaselo9 - 0.05, END - 0.6); if (m > 0.01) { bigText('MÁNDASELO A QUIEN DIGA', W / 2, Y - 10, 40, HC.white, m, { dark: 24 }); bigText('QUE ES SU VIDA PRIVADA', W / 2, Y + 60, 52, HG, cw(t, K.vida9 - 0.1, END - 0.6), { glow: 14, dark: 26 }); } }
}
