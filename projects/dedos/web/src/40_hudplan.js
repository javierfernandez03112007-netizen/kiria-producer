// ---------------------------------------------------------------- HUD sobre fondo claro (estilo infografía médica): tinta oscura con halo blanco, rótulos en cajas blancas
// con línea guía, pasos numerados en la frase 3 y la pregunta pendiente (¿da artritis?) en la cabecera.
const INK = '#1C2430', GREY = '#5A6472', GOLD = '#C27A00', TEALc = '#0E8C86', REDc = '#D32F2F', GREEN = '#2E9D57', BLUE = '#1F6FD1';
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 700]; }
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '4px'; hfont(46); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('TUS DEDOS', 54, 142);
  hg.letterSpacing = '2px'; hfont(24, false); hg.fillStyle = GREY; hg.fillText('QUÉ PASA CUANDO TE LOS CRUJES', 56, 180);
  hg.fillStyle = 'rgba(28,36,48,.22)'; hg.fillRect(56, 196, 968, 2);
  hg.textAlign = 'right'; hg.letterSpacing = '2px';
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ FUNCIONA', 1024, 112);
  hfont(32); hg.fillStyle = GOLD; hg.fillText('TU CUERPO', 1024, 148);
  hfont(18, false); hg.fillStyle = GREY; hg.fillText('POR DENTRO', 1024, 178);
  const mk = win(t, K.tenian2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿DA ARTRITIS? · ???', col = REDc, blink = true;
    if (t > K.respuesta7 + 0.3) { txt = '50 AÑOS DE PRUEBA (UNGER)'; col = GOLD; blink = false; }
    if (t > K.ninguna8) { txt = 'NO: NI EN UNA MANO NI EN LA OTRA'; col = GREEN; blink = false; }
    if (t > K.tu9) { txt = '¿TÚ TE LOS CRUJES?'; col = INK; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk * (on ? 1 : 0.25); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.fillStyle = 'rgba(255,255,255,.75)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill();
    hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke();
    hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 27, subSize: 20, bg: true, light: true, subCol: GREY, ...opt }); }
function labP(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 27, subSize: 20, bg: true, light: true, subCol: GREY, ...opt }); }
const big = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { type: false, halo: 22, ls: Math.round(size * 0.04), ...o });
const small = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { halo: 14, ls: 2, ...o });
function stepBadge(n, x, y, k, col) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 30 * (0.6 + 0.4 * eo(clamp(k * 1.5)));
  hg.fillStyle = col; hg.beginPath(); hg.arc(x, y, r, 0, 7); hg.fill(); hg.fillStyle = '#fff'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(34); hg.letterSpacing = '0px'; hg.fillText(String(n), x, y + 2); hg.restore(); }
function check(P, k, col = GREEN, s = 1) { if (k <= 0.01 || !P.ok) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 46 * s * (0.5 + 0.5 * eo(clamp(k * 1.6)));
  hg.fillStyle = col; hg.beginPath(); hg.arc(P.x, P.y, r, 0, 7); hg.fill(); hg.strokeStyle = '#fff'; hg.lineWidth = 9 * s; hg.beginPath(); hg.moveTo(P.x - r * 0.42, P.y + r * 0.02); hg.lineTo(P.x - r * 0.1, P.y + r * 0.34); hg.lineTo(P.x + r * 0.46, P.y - r * 0.3); hg.stroke(); hg.restore(); }
function cross(P, k, s = 1) { if (k <= 0.01 || !P.ok) return; hg.save(); hg.globalAlpha = clamp(k * 2); const r = 40 * s * (0.5 + 0.5 * eo(clamp(k * 1.6)));
  hg.fillStyle = REDc; hg.beginPath(); hg.arc(P.x, P.y, r, 0, 7); hg.fill(); hg.strokeStyle = '#fff'; hg.lineWidth = 8 * s; hg.beginPath(); hg.moveTo(P.x - r * 0.38, P.y - r * 0.38); hg.lineTo(P.x + r * 0.38, P.y + r * 0.38); hg.moveTo(P.x + r * 0.38, P.y - r * 0.38); hg.lineTo(P.x - r * 0.38, P.y + r * 0.38); hg.stroke(); hg.restore(); }
function crac(P, k, col = BLUE) { if (k <= 0.01 || !P.ok) return; hg.save(); hg.globalAlpha = clamp(k * 3) * (1 - clamp((k - 0.7) / 0.3)); const s = 0.7 + 0.5 * eo(clamp(k * 3));
  hg.translate(P.x, P.y); hg.rotate(-0.12); hg.scale(s, s); hfont(54); hg.letterSpacing = '2px'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.lineWidth = 10; hg.strokeStyle = '#fff'; hg.strokeText('¡CRAC!', 0, 0); hg.fillStyle = col; hg.fillText('¡CRAC!', 0, 0); hg.restore(); }
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440, H1 = S.hand.userData, F = H1.fingers[0];
  // L1: el crujido del principio; «¿artritis?» en rojo; 50 años
  { const P = proj(S.jf.position); const k = clamp((t - T_HIT) / 0.9); if (t > T_HIT && t < T_HIT + 0.9) crac({ x: P.x + 150, y: P.y - 230, ok: P.ok }, k); }
  { const a = cw(t, K.artritis1 - 0.05, K.medico1 - 0.2); if (a > 0.01) { big('¿ARTRITIS?', Y, 104, REDc, a); small('LO QUE SIEMPRE TE HAN DICHO', Y + 84, 28, INK, a); } }
  { const a = cw(t, K.medico1 - 0.05, K.tenian2 - 0.32); if (a > 0.01) { big(Math.round(1 + 49 * eo(clamp((t - K.medico1) / (K.anos1 + 0.2 - K.medico1)))) + ' AÑOS', Y, 120, GOLD, a); small('UN MÉDICO LO COMPROBÓ EN SU PROPIA MANO', Y + 90, 28, INK, a); } }
  // L2: ¿tenían razón?
  { const a = cw(t, K.tenian2 - 0.05, K.cada3 - 0.1); if (a > 0.01) { big('¿TENÍAN RAZÓN?', Y, 84, INK, a); small('TE LO DIGO AL FINAL', Y + 78, 28, REDc, cw(t, K.digo2 - 0.1, K.cada3 - 0.1)); } }
  // L3: los pasos, como en una lámina: 1 la cápsula con líquido · 2 tiras · 3 la presión cae · 4 ¡burbuja!
  { const st = [[K.cada3 - 0.05, K.tirar3 - 0.32, 1, 'UNA CÁPSULA CON LÍQUIDO', TEALc], [K.tirar3 - 0.05, K.presion3 - 0.32, 2, 'TIRAS DEL DEDO', BLUE], [K.presion3 - 0.05, K.gas3 - 0.32, 3, 'LA PRESIÓN CAE', REDc], [K.gas3 - 0.05, K.n2015 - 0.32, 4, 'EL GAS FORMA UNA BURBUJA', TEALc]];
    for (const [t0, t1, n, txt, col] of st) { const a = cw(t, t0, t1); if (a <= 0.01) continue; hg.save(); hfont(58); hg.letterSpacing = '2px'; const w = hg.measureText(txt).width; hg.restore();
      stepBadge(n, W / 2 - w / 2 - 50, Y, a, col); bigText(txt, W / 2 + 24, Y, 58, INK, a, { type: false, halo: 20, ls: 2 }); }
    const c = cw(t, K.golpe3 - 0.05, K.n2015 - 0.32); if (c > 0.01) small('DE GOLPE, EN MENOS DE UN SEGUNDO', Y + 76, 28, GREY, c);
    if (cutK(t) > 0.5 && t > K.cada3 && t < K.n2015) {
      lab(F.ph[0], 0, 0.3, 0.03, 'HUESO', null, cw(t, K.nudillo3 + 0.2, K.capsula3 - 0.1), { dx: -170, dy: -40, color: INK });
      lab(F.cap, -F.r * 0.62, 0.0, 0.0, 'CÁPSULA', 'LA ENVUELVE', cw(t, K.capsula3 - 0.05, K.liquido3 - 0.1), { dx: -170, dy: -150, color: TEALc });
      lab(F.fluid, F.r * 0.3, 0, 0.02, 'LÍQUIDO SINOVIAL', 'CON GAS DISUELTO', cw(t, K.liquido3 - 0.05, K.tirar3 - 0.1), { dx: 150, dy: -200, color: TEALc });
      lab(F.bub, 0, 0, 0.0, 'BURBUJA DE GAS', null, cw(t, K.golpe3 + 0.1, K.n2015 - 0.1), { dx: 160, dy: -180, color: TEALc }); }
    if (t > K.golpe3 && t < K.golpe3 + 0.9) { const P = proj(S.jf.position); crac({ x: P.x - 120, y: P.y - 250, ok: P.ok }, clamp((t - K.golpe3) / 0.9)); }
    if (ST.arrow.visible && t < K.burbuja6) labP(proj(ST.arrow.localToWorld(v3(0, 0.27, 0))), 'TIRAS', null, cw(t, K.tirar3, K.presion3 - 0.1), { dx: -60, dy: -120, color: BLUE }); }
  // L4: 2015, la resonancia: 0,31 s
  { const a = cw(t, K.n2015 - 0.05, K.menos4 - 0.32); if (a > 0.01) { big('2015', Y, 120, INK, a); small('LO GRABAN POR PRIMERA VEZ EN UNA RESONANCIA', Y + 88, 26, BLUE, a); }
    const b = cw(t, K.menos4 - 0.05, K.discute5 - 0.32); if (b > 0.01) { big('0,31 s', Y, 130, BLUE, b); small('MENOS DE UN TERCIO DE SEGUNDO', Y + 92, 28, INK, b); }
    lab(ST.panel, 0, 0.29, 0.02, 'RESONANCIA MAGNÉTICA', 'PLOS ONE, 2015', cw(t, K.grabaron4, K.menos4 - 0.1), { dx: 120, dy: -150, color: BLUE }); }
  // L5: ¿al nacer o al romperse?
  { const a = cw(t, K.discute5 - 0.05, K.burbuja6 - 0.32); if (a > 0.01) { small('LOS CIENTÍFICOS AÚN NO SE PONEN DE ACUERDO', Y + 40, 30, INK, a); }
    for (const [g, txt, col, t0, sub] of [[ST.in1, '¿AL NACER?', TEALc, K.nacer5 - 0.4, 'KAWCHUK, 2015'], [ST.in2, '¿AL ROMPERSE?', GOLD, K.romperse5 - 0.4, 'ESTUDIOS DE 1971 Y 2018']]) {
      if (!g.visible) continue; const P = proj(wpo(g, 0, 0.19, 0)); const k = cw(t, t0, K.burbuja6 - 0.32);
      if (k > 0.01 && P.ok) { bigText(txt, P.x, P.y - 70, 44, col, k, { type: false, halo: 16, ls: 1 }); bigText(sub, P.x, P.y - 26, 20, GREY, k, { type: false, halo: 10, ls: 1, bold: false }); } }
    for (const [g, t0] of [[ST.in1, K.nacer5], [ST.in2, K.romperse5]]) if (g.visible && t > t0 && t < t0 + 0.9) { const P = proj(wpo(g, 0, -0.13, 0.05)); crac(P, clamp((t - t0) / 0.9), g === ST.in1 ? TEALc : GOLD); } }
  // L6: 20 minutos · ese dedo no vuelve a crujir
  { const b = cw(t, K.durar6 - 0.05, K.respuesta7 - 0.32); if (b > 0.01) { small(t < K.eso6 - 0.1 ? 'LA BURBUJA PUEDE DURAR' : 'Y MIENTRAS, ESE DEDO', Y - 78, 30, INK, b, { type: false });
      big(t < K.eso6 - 0.1 ? 'HASTA 20 MIN' : 'NO VUELVE A CRUJIR', Y, t < K.eso6 - 0.1 ? 104 : 78, t < K.eso6 - 0.1 ? BLUE : REDc, b); }
    if (t > K.burbuja6 && t < K.respuesta7) { lab(F.bub, 0, 0, 0, 'LA BURBUJA', 'SE VA DISOLVIENDO', cw(t, K.burbuja6 + 0.3, K.eso6 - 0.1), { dx: 150, dy: -180, color: TEALc });
      const P = proj(S.jf.position); cross({ x: P.x - 150, y: P.y + 40, ok: P.ok }, cw(t, K.crujir6 + 0.1, K.respuesta7 - 0.3)); } }
  // L7: Donald Unger, 50 años crujiendo una sola mano
  { const a = cw(t, K.donald7 - 0.05, K.dos7 - 0.32); if (a > 0.01) { big('DONALD UNGER', Y, 84, INK, a); small('MÉDICO · SOLO SE CRUJÍA LA IZQUIERDA', Y + 78, 28, GOLD, cw(t, K.sola7 - 0.1, K.dos7 - 0.32)); }
    const b = cw(t, K.dos7 - 0.05, K.tuvo8 - 0.32); if (b > 0.01) { big(t < K.n50b - 0.05 ? '2 VECES AL DÍA' : '50 AÑOS', Y, 104, GOLD, b); small('MÁS DE 36.500 CRUJIDOS', Y + 84, 28, INK, cw(t, K.n50b - 0.1, K.tuvo8 - 0.32)); }
    if (S.handL.visible) for (const [h, t1, a1, a2, col] of [[S.handL, K.sola7, 'LA IZQUIERDA', 'SE LA CRUJÍA', GOLD], [S.hand, K.mano7, 'LA DERECHA', 'NUNCA (PARA COMPARAR)', INK]]) {
      const k = cw(t, t1, K.tuvo8 - 0.1), P = proj(wpo(h, -0.1, 1.95, 0.05)); if (k <= 0.01 || !P.ok) continue; const y = Math.max(540, P.y - 90);
      bigText(a1, P.x, y, 34, col, k, { type: false, halo: 16, ls: 1 }); bigText(a2, P.x, y + 36, 21, GREY, k, { type: false, halo: 12, ls: 1, bold: false }); } }
  // L8: ninguna artritis · Ig Nobel · 215 personas
  { const a = cw(t, K.ninguna8 - 0.05, K.ig8 - 0.32); if (a > 0.01) { big('NINGUNA ARTRITIS', Y, 84, GREEN, a); small('NI EN UNA MANO NI EN LA OTRA', Y + 78, 28, INK, a); }
    if (S.handL.visible) { const k = cw(t, K.ninguna8 - 0.1, K.ig8 - 0.1); check(proj(wpo(S.handL, -0.35, 1.95, 0.1)), k); check(proj(wpo(S.hand, -0.35, 1.95, 0.1)), cw(t, K.ninguna8 + 0.1, K.ig8 - 0.1)); }
    const b = cw(t, K.ig8 - 0.05, K.n215 - 0.32); if (b > 0.01) { big('IG NOBEL', Y, 116, GOLD, b); small('MEDICINA · 2009', Y + 88, 30, INK, b); }
    const c = cw(t, K.n215 - 0.05, K.tu9 - 0.32); if (c > 0.01) { big(Math.round(215 * eo(clamp((t - K.n215 + 0.05) / 0.9))) + ' PERSONAS', Y, 96, INK, c); small('ESTUDIO DE 2011: LA MISMA CONCLUSIÓN', Y + 80, 28, GREEN, c); } }
  // L9: ¿tú te los crujes? · mándaselo
  { const a = cw(t, K.tu9 - 0.05, K.mandaselo9 - 0.3); if (a > 0.01) big('¿TÚ TE LOS CRUJES?', Y, 80, INK, a);
    const m = cw(t, K.mandaselo9 - 0.05, END - 0.6); if (m > 0.01) { small('MÁNDASELO A QUIEN TE DICE', Y - 10, 40, INK, m, { type: false }); big('QUE TE DARÁ ARTRITIS', Y + 62, 60, REDc, cw(t, K.dara9 - 0.1, END - 0.6)); } }
}
