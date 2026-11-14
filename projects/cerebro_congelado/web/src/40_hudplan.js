// ---------------------------------------------------------------- HUD sobre fondo claro (como en «los dedos»): cabecera con el truco pendiente, pasos numerados y
// rótulos en cajas blancas con línea guía.
const INK = '#1C2430', GREY = '#5A6472', GOLD = '#C27A00', TEALc = '#0E8C86', REDc = '#D32F2F', GREEN = '#2E9D57', BLUE = '#1F6FD1', ICE = '#2F86D6';
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 700]; }
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '4px'; hfont(46); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('TU CEREBRO', 54, 142);
  hg.letterSpacing = '2px'; hfont(24, false); hg.fillStyle = GREY; hg.fillText('QUÉ PASA CUANDO TE «CONGELA» UN HELADO', 56, 180);
  hg.fillStyle = 'rgba(28,36,48,.22)'; hg.fillRect(56, 196, 968, 2);
  hg.textAlign = 'right'; hg.letterSpacing = '2px';
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ FUNCIONA', 1024, 112);
  hfont(32); hg.fillStyle = ICE; hg.fillText('TU CUERPO', 1024, 148);
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('POR DENTRO', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = 'EL TRUCO PARA QUITARLO · ???', col = REDc, blink = true;
    if (t > K.truco9) { txt = 'EL TRUCO: LA LENGUA EN EL PALADAR'; col = GREEN; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk * (on ? 1 : 0.25); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.fillStyle = 'rgba(255,255,255,.75)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke();
    hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function labW(P, txt, sub, k, opt) { if (k <= 0.01 || !P.ok) return; callout(P, txt, sub, k, { size: 27, subSize: 20, bg: true, light: true, subCol: GREY, ...opt }); }
const big = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { type: false, halo: 22, ls: Math.round(size * 0.04), ...o });
const small = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { halo: 14, ls: 2, ...o });
function stepBadge(n, x, y, k, col) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 30 * (0.6 + 0.4 * eo(clamp(k * 1.5)));
  hg.fillStyle = col; hg.beginPath(); hg.arc(x, y, r, 0, 7); hg.fill(); hg.fillStyle = '#fff'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(34); hg.letterSpacing = '0px'; hg.fillText(String(n), x, y + 2); hg.restore(); }
function step(n, txt, col, a, Y) { hg.save(); hfont(54); hg.letterSpacing = '2px'; const w = hg.measureText(txt).width; hg.restore(); stepBadge(n, W / 2 - w / 2 - 48, Y, a, col); bigText(txt, W / 2 + 22, Y, 54, INK, a, { type: false, halo: 20, ls: 2 }); }
// la gráfica del Doppler (2012): el flujo en la arteria sube cuando empieza el dolor y baja cuando se va
function doppler(t, a) {
  const x0 = 70, x1 = 1010, y0 = 1080, y1 = 1380, t0 = K.midieron7 - 0.2, t2 = K.cierra7 + 0.6, k = clamp((t - t0) / (t2 - t0)), A = (K.empieza7 - 0.1 - t0) / (t2 - t0), B = (K.cierra7 - 0.1 - t0) / (t2 - t0);
  const val = u => u < A ? 0.2 : u < A + 0.1 ? 0.2 + 0.62 * eio((u - A) / 0.1) : u < B ? 0.82 + 0.025 * Math.sin(u * 70) : u < B + 0.12 ? 0.82 - 0.58 * eio((u - B) / 0.12) : 0.24;
  hg.save(); hg.globalAlpha = clamp(a * 2); hg.fillStyle = 'rgba(255,255,255,.92)'; hg.shadowColor = 'rgba(60,40,30,.18)'; hg.shadowBlur = 18; rr(hg, x0 - 20, y0 - 70, x1 - x0 + 40, y1 - y0 + 100, 18); hg.fill(); hg.shadowBlur = 0;
  hfont(24); hg.letterSpacing = '2px'; hg.fillStyle = GREY; hg.textAlign = 'left'; hg.textBaseline = 'alphabetic'; hg.fillText('FLUJO EN LA ARTERIA DEL CEREBRO · DOPPLER', x0, y0 - 30);
  const gx0 = x0, gx1 = x1, gy0 = y1 - 10, gy1 = y0 + 20;
  hg.strokeStyle = 'rgba(28,36,48,.12)'; hg.lineWidth = 2; for (let i = 0; i <= 3; i++) { const y = gy0 + (gy1 - gy0) * i / 3; hg.beginPath(); hg.moveTo(gx0, y); hg.lineTo(gx1, y); hg.stroke(); }
  if (k > A) { hg.fillStyle = 'rgba(211,47,47,.12)'; hg.fillRect(gx0 + (gx1 - gx0) * A, gy1 - 10, (gx1 - gx0) * (Math.min(k, B + 0.06) - A), gy0 - gy1 + 10); }
  hg.strokeStyle = REDc; hg.lineWidth = 7; hg.lineJoin = 'round'; hg.beginPath(); for (let i = 0; i <= 160; i++) { const u = i / 160 * k, x = gx0 + (gx1 - gx0) * u, y = gy0 + (gy1 - gy0) * val(u); i ? hg.lineTo(x, y) : hg.moveTo(x, y); } hg.stroke();
  hg.fillStyle = INK; hg.beginPath(); hg.arc(gx0 + (gx1 - gx0) * k, gy0 + (gy1 - gy0) * val(k), 9, 0, 7); hg.fill();
  hfont(34); hg.textAlign = 'center'; if (k > A + 0.05) { hg.fillStyle = REDc; hg.fillText('DOLOR', gx0 + (gx1 - gx0) * (A + B) / 2, gy1 + 30); }
  if (k > B + 0.1) { hg.fillStyle = GREEN; hg.fillText('SE VA', gx0 + (gx1 - gx0) * Math.min(0.9, B + 0.2), gy0 - 30); }
  hg.restore();
}
const HL = (x, y, z) => { const h = S.hero.userData.head; return proj(wpo(h, x, y, z)); };
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440;
  // L1–L2: ¡cerebro congelado!
  { const a = cw(t, 0.45, K.final2 - 0.32); if (a > 0.01) { big('¡CEREBRO CONGELADO!', Y, 74, ICE, a); small('¿POR QUÉ DUELE TANTO?', Y + 70, 28, INK, a); } }
  { const a = cw(t, K.final2 - 0.05, K.helado3 - 0.3); if (a > 0.01) { big('AL FINAL, EL TRUCO', Y, 70, INK, a); small('PARA QUITÁRTELO', Y + 66, 28, GREEN, a); } }
  // L3: 1 el frío toca el paladar · el nervio da la alarma
  { const a = cw(t, K.helado3 - 0.05, K.cuerpo4 - 0.32); if (a > 0.01) step(1, t < K.nervio3 - 0.1 ? 'EL FRÍO TOCA EL PALADAR' : 'UN NERVIO DA LA ALARMA', ICE, a, Y);
    if (S.sec.visible) { labW(HL(0.05, -0.52, 0.42), 'PALADAR', null, cw(t, K.paladar3 - 0.05, K.cuerpo4 - 0.3), { dx: -150, dy: 150, color: ICE });
      labW(HL(0.06, -0.21, 0.02), 'NERVIO TRIGÉMINO', 'LLEVA LA ALARMA', cw(t, K.nervio3, K.cuerpo4 - 0.3), { dx: 150, dy: -160, color: GOLD }); } }
  // L4: 2 llega sangre de golpe · la arteria se ensancha
  { const a = cw(t, K.cuerpo4 - 0.05, K.cuerpo4 + 2.2); if (a > 0.01) step(2, 'LLEGA SANGRE CALIENTE', REDc, a, Y);
    const b = cw(t, K.arteria4 - 0.05, K.craneo5 - 0.32); if (b > 0.01) { big('LA ARTERIA SE ENSANCHA', Y, 62, REDc, b); small('EN SEGUNDOS', Y + 64, 28, INK, cw(t, K.ensancha4, K.craneo5 - 0.32)); }
    if (S.sec.visible) labW(HL(0.05, 0.6, 0.11), 'ARTERIA CEREBRAL ANTERIOR', null, cw(t, K.arteria4 + 0.1, K.craneo5 - 0.3), { dx: 120, dy: -170, color: REDc }); }
  // L5: 3 el cráneo no se estira · las capas que envuelven el cerebro sí duelen (el cerebro no)
  { const a = cw(t, K.craneo5 - 0.05, K.capas5 - 0.32); if (a > 0.01) step(3, 'EL CRÁNEO NO SE ESTIRA', INK, a, Y);
    const b = cw(t, K.capas5 - 0.05, K.nervio6 - 0.32); if (b > 0.01) { big('LAS MENINGES SÍ DUELEN', Y, 62, REDc, b); small('EL CEREBRO EN SÍ NO SIENTE DOLOR', Y + 64, 28, INK, cw(t, K.cerebro5 - 0.1, K.nervio6 - 0.32)); }
    if (S.sec.visible) { labW(HL(0.05, 1.0, -0.4), 'CRÁNEO', 'NO CEDE', cw(t, K.craneo5, K.capas5 - 0.2), { dx: 120, dy: -120, color: INK });
      labW(HL(0.05, 0.98, -0.55), 'MENINGES', 'SÍ TIENEN SENSORES DE DOLOR', cw(t, K.capas5 + 0.1, K.nervio6 - 0.3), { dx: 130, dy: -120, color: REDc }); } }
  // L6: 4 el nervio también llega a la frente
  { const a = cw(t, K.nervio6 - 0.05, K.n2012 - 0.32); if (a > 0.01) step(4, t < K.eso6 - 0.1 ? 'EL NERVIO LLEGA A LA FRENTE' : 'POR ESO TE DUELE AHÍ', GOLD, a, Y);
    if (S.sec.visible) labW(HL(0.0, 0.5, 0.74), 'LA FRENTE', null, cw(t, K.frente6, K.n2012 - 0.3), { dx: -120, dy: -150, color: REDc }); }
  // L7: 2012 · Harvard · el dolor va con la arteria
  { const a = cw(t, K.n2012 - 0.05, K.comes8 - 0.32); if (a > 0.01) { doppler(t, a); big('2012 · HARVARD', 1480, 64, INK, cw(t, K.n2012 - 0.05, K.dolor7 - 0.32));
      const b = cw(t, K.dolor7 - 0.05, K.comes8 - 0.32); if (b > 0.01) big(t < K.va7 - 0.05 ? 'ARTERIA ABIERTA = DOLOR' : 'SE CIERRA = SE VA', 1480, 52, t < K.va7 - 0.05 ? REDc : GREEN, b); } }
  // L8: comer rápido: el doble (27 de cada 100 frente a 13)
  { const a = cw(t, K.comes8 - 0.05, K.truco9 - 0.32); if (a > 0.01) {
      for (const [k, txt, col, n, t1] of [[0, 'RÁPIDO', REDc, 27, K.n27], [1, 'DESPACIO', GREEN, 13, K.n13]]) { const g = ST.plats[k]; if (!g.visible) continue; const P = proj(wpo(g, 0, 0.1, -0.7)); if (!P.ok) continue;
        bigText(txt, P.x, P.y - 110, 42, col, a, { type: false, halo: 16, ls: 1 }); const c = Math.round(n * clamp((t - t1 + 0.15) / 0.6)); if (t > t1 - 0.15) bigText(c + ' DE 100', P.x, P.y - 60, 36, ICE, a, { type: false, halo: 14, ls: 1 }); }
      big(t < K.n27 - 0.1 ? 'SI COMES RÁPIDO…' : 'EL DOBLE', Y + 40, 72, t < K.n27 - 0.1 ? INK : REDc, a); small('ESTUDIO CON 145 ALUMNOS · BMJ, 2002', Y + 108, 24, GREY, cw(t, K.n27 - 0.1, K.truco9 - 0.32)); } }
  // L9: el truco
  { const a = cw(t, K.truco9 - 0.05, K.calentarlo9 + 0.6); if (a > 0.01) { big('EL TRUCO', Y - 20, 80, GREEN, a); small(t < K.aprieta9 - 0.1 ? 'EL QUE RECOMIENDAN LOS MÉDICOS' : 'LA LENGUA CONTRA EL PALADAR', Y + 50, 30, INK, a); }
    if (S.sec.visible) labW(HL(0.05, -0.6, 0.32), 'LENGUA', 'CALIENTA EL PALADAR', cw(t, K.lengua9, K.calentarlo9 - 0.2), { dx: -150, dy: 160, color: GOLD }); }
  // L10: ¿muerdes o chupas? · mándaselo
  { const a = cw(t, K.tu10 - 0.05, K.mandaselo10 - 0.3); if (a > 0.01) { big('¿MUERDES EL HELADO', Y - 10, 60, INK, a); big('O LO CHUPAS?', Y + 60, 60, ICE, cw(t, K.chupas10 - 0.1, K.mandaselo10 - 0.3)); }
    const m = cw(t, K.mandaselo10 - 0.05, END - 0.6); if (m > 0.01) { small('MÁNDASELO A', Y - 10, 40, INK, m, { type: false }); big('QUIEN LO MUERDE', Y + 56, 64, REDc, cw(t, K.muerde10 - 0.15, END - 0.6)); } }
}
