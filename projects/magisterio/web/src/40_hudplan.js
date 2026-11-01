// ---------------------------------------------------------------- HUD: cabecera con la pregunta pendiente (¿para qué sirven?), cifras grandes y rótulos
function buildHudPlan() {}
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  const tk = clamp((t - K.magisterio1 + 0.1) / 0.6);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('MAGISTERIO', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.globalAlpha = tk; hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('240 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('4 AÑOS', 1024, 178);
  const mk = win(t, K.final2 - 0.1, 0.3) * (1 - win(t, K.mandaselo16 + 0.4, 0.4));
  if (mk > 0.01) {
    let txt = 'PARA QUÉ SIRVEN · ???', col = HC.red, blink = true;
    if (t > K.pinza12) { txt = 'PINZA → ESCRITURA'; col = HC.green; blink = false; }
    if (t > K.serie13) { txt = 'SERIES → MATEMÁTICAS'; col = HC.green; blink = false; }
    if (t > K.conexiones14) { txt = '+1 MILLÓN DE CONEXIONES/S'; col = HC.green; blink = false; }
    if (t > K.sabiendo15) { txt = 'SABIENDO POR QUÉ'; col = HG; blink = false; }
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
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
const wp = (o, x = 0, y = 0, z = 0) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function strike(x0, x1, y, k, col = HC.red) { if (k <= 0.01) return; hg.save(); hg.strokeStyle = col; hg.lineWidth = 7; hg.shadowColor = col; hg.shadowBlur = 14; hg.beginPath(); hg.moveTo(x0, y); hg.lineTo(x0 + (x1 - x0) * eo(k), y); hg.stroke(); hg.restore(); }
function pinchIcon(P, k) {          // pulgar e índice (líneas técnicas) que se cierran sobre el macarrón
  if (k <= 0.01 || !P || !P.ok) return;
  const c = eo(clamp(k)), gap = lerp(70, 14, c), sd = P.x > W / 2 ? -1 : 1;
  hg.save(); hg.globalAlpha = clamp(k * 2); glowStroke(HC.white, 3, 10); hg.lineCap = 'round'; hg.lineJoin = 'round';
  for (const s of [-1, 1]) { hg.save(); hg.translate(P.x + sd * 40, P.y + s * gap); hg.scale(sd, 1); hg.rotate(s * 0.35); hg.beginPath(); hg.moveTo(0, -18); hg.lineTo(170, -22); hg.arcTo(195, 0, 170, 22, 22); hg.lineTo(0, 18); hg.arc(0, 0, 18, Math.PI / 2, Math.PI * 1.5); hg.stroke();
    hg.globalAlpha *= 0.6; hg.beginPath(); hg.moveTo(18, -8); hg.lineTo(42, -8); hg.moveTo(18, 8); hg.lineTo(42, 8); hg.stroke(); hg.restore(); }
  noGlow(); hg.setLineDash([6, 8]); hg.strokeStyle = HG; hg.lineWidth = 2; hg.beginPath(); hg.moveTo(P.x + sd * 20, P.y - gap - 30); hg.lineTo(P.x + sd * 20, P.y + gap + 30); hg.stroke(); hg.setLineDash([]);
  hg.restore();
}
function plane(x, y, s, k) {           // avión de papel (mándaselo)
  if (k <= 0.01) return; const e = eo(clamp(k)); hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x + (1 - e) * -120, y + (1 - e) * 60); hg.scale(s, s); hg.rotate(-0.25);
  hg.fillStyle = HG; hg.shadowColor = HG; hg.shadowBlur = 22; hg.beginPath(); hg.moveTo(-70, 0); hg.lineTo(80, -40); hg.lineTo(-10, 18); hg.closePath(); hg.fill();
  hg.fillStyle = '#b58425'; hg.beginPath(); hg.moveTo(-10, 18); hg.lineTo(80, -40); hg.lineTo(5, 45); hg.closePath(); hg.fill(); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const P = S.props, Y = 1450;
  // L1: el collar · «es verdad»
  lab(NK_C.clone().add(v3(0.09, 0.02, 0)), 'COLLAR DE MACARRONES', null, cw(t, K.collares1 - 0.05, K.y1), { dx: 120, dy: -150 });
  { const k = cw(t, K.verdad1 - 0.05, K.para2 + 0.15); if (k > 0.01) stamp('ES VERDAD', W / 2, 1380, k, HG, 92); }
  // L3: jugar ✗ → cómo aprende un cerebro
  { const k = cw(t, K.jugar3 - 0.05, K.cerebro3 + 0.6); if (k > 0.01) { bigText('JUGAR', W / 2, Y, 76, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad3, 0.3), dark: 26 }); strike(W / 2 - 170, W / 2 + 170, Y, win(t, K.realidad3 - 0.05, 0.3));
      const a = cw(t, K.aprende3 - 0.1, K.cerebro3 + 0.6); bigText('CÓMO APRENDE', W / 2, Y + 100, 60, HG, a, { glow: 18, dark: 26 }); bigText('UN CEREBRO', W / 2, Y + 170, 60, HG, cw(t, K.cerebro3 - 0.1, K.cerebro3 + 0.6), { glow: 18, dark: 26 }); } }
  // L4: tallímetro y edades
  lab(wp(S.room.tall, 0.17, 0.55, 0), 'PSICOLOGÍA', 'DEL DESARROLLO', cw(t, K.psicologia4 + 0.05, K.aprender4 + 0.1), { dx: 120, dy: -170 });
  { const ts = [K.aprender4, K.nino4, K.edad4], nm = [['1 AÑO', 'PRIMEROS PASOS'], ['3 AÑOS', 'FRASES'], ['6 AÑOS', 'EMPIEZA A LEER']];
    P.kidsH.forEach((kd, i) => lab(wp(kd, 0, 0.93, 0), nm[i][0], nm[i][1], cw(t, ts[i], K.matematicas5 - 0.2), { dx: i === 1 ? -120 : 120, dy: -110 - i * 60, color: i === 2 ? HG : HC.white, size: 24, subSize: 18 })); }
  // L5: el ábaco · 2 + 3 · contar
  lab(wp(P.ab, 0, 0.62, 0), 'MATEMÁTICAS', null, cw(t, K.matematicas5 + 0.05, K.sumar5 - 0.1), { dx: -120, dy: -150 });
  { const k = cw(t, K.sumar5 - 0.05, K.lengua6 - 0.2); if (k > 0.01) { bigText('2 + 3', W / 2 - 60, Y, 110, HC.white, k, { type: false, dark: 30 }); bigText('= 5', W / 2 + 200, Y, 110, HG, cw(t, K.sumar5 + 0.5, K.lengua6 - 0.2), { glow: 20, type: false, dark: 30 }); } }
  { const k = cw(t, K.contar5 - 0.1, K.lengua6 - 0.2); if (k > 0.01) for (let i = 0; i < 5; i++) { const x = P.abW / 2 - 0.045 - (4 - i) * 0.05, Q = proj(wp(P.ab, x, P.abY[4] + 0.075, 0)); if (Q.ok) bigText(String(i + 1), Q.x, Q.y, 54, HG, clamp((t - K.contar5 + 0.1 - i * 0.07) / 0.2) * k, { type: false, glow: 14, dark: 18 }); } }
  // L6: lengua · leer · letra a letra
  lab(v3(-3.88, 0.85, 0.25), 'LENGUA', null, cw(t, K.lengua6 + 0.05, K.leer6), { dx: 120, dy: -170 });
  lab(wp(P.book, 0, 0.02, 0), 'LEER', null, cw(t, K.leer6 - 0.05, K.letra6), { dx: -120, dy: -150 });
  lab(wp(P.letters[0], 0, 0.15, 0), 'LETRA A LETRA', null, cw(t, K.letra6 + 0.1, K.dislexia7 - 0.2), { dx: 110, dy: -150, color: HG });
  // L7: tres sitios de la misma mesa
  { const nm = ['DISLEXIA', 'TDAH', 'AUTISMO'], ts = [K.dislexia7, K.tdah7, K.autismo7];
    P.icons.forEach((o, i) => lab(wp(o, 0, i === 1 ? 0.12 : 0.07, 0), nm[i], null, cw(t, ts[i] + 0.05, K.meses8 - 0.25), { dx: i === 0 ? -110 : 110, dy: -120 - i * 50, color: i === 2 ? HG : HC.white }));
    const k = cw(t, K.misma7 - 0.05, K.meses8 - 0.2); if (k > 0.01) bigText('EN LA MISMA CLASE', W / 2, Y + 40, 56, HC.white, k, { dark: 26 }); }
  // L8: calendario · prácticas · colegio
  lab(wp(P.cal, 0, 0.22, 0.01), 'MESES', 'DE PRÁCTICAS', cw(t, K.meses8 + 0.05, K.facil9 - 0.15), { dx: -110, dy: -150 });
  lab(wp(P.badge, -0.02, -0.3, 0), 'PRÁCTICUM', '50 ECTS CON EL TFG', cw(t, K.practicas8 + 0.05, K.facil9 - 0.15), { dx: -120, dy: 70, color: HG });
  lab(wp(S.room.ceip, 0, 0, 0), 'COLEGIO', null, cw(t, K.colegio8, K.facil9 - 0.1), { dx: -120, dy: -90 });
  // L9: Cataluña: casi la mitad suspende el examen de acceso
  { const k = cw(t, K.mitad9 - 0.05, K.oposicion10 - 0.3); if (k > 0.01) { bigText('45,5 %', W / 2, Y, 130, HC.red, k, { glow: 24, type: false, dark: 34 });
      bigText('SUSPENDIÓ EL EXAMEN DE ACCESO', W / 2, Y + 100, 30, HC.white, cw(t, K.suspendio9, K.oposicion10 - 0.3), { dark: 22 });
      bigText('PAP 2026 · 2.346 DE 5.155', W / 2, Y + 150, 22, HC.grey, cw(t, K.examen9, K.oposicion10 - 0.3), { dark: 18 }); } }
  // L10: oposición en Canarias: 19 por plaza
  lab(wp(P.temario, 0, 0.3, 0), 'OPOSICIÓN', null, cw(t, K.oposicion10 + 0.05, K.diecinueve10 - 0.1), { dx: -120, dy: -150 });
  { const k = cw(t, K.canarias10, K.sacas11 - 0.2); if (k > 0.01) bigText('CANARIAS · 2026', W / 2, Y + 168, 24, HC.grey, k, { dark: 18 }); }
  { const k = cw(t, K.diecinueve10 - 0.1, K.sacas11 - 0.2); if (k > 0.01) { const n = Math.max(1, Math.min(19, Math.ceil((t - K.diecinueve10 + 0.12) / 0.03))); bigText(String(n), W / 2, Y - 40, 140, HC.white, k, { type: false, dark: 34 });
      bigText('POR PLAZA', W / 2, Y + 62, 52, HG, cw(t, K.plaza10 - 0.08, K.sacas11 - 0.2), { type: false, glow: 18, dark: 22 });
      bigText('EN INFANTIL', W / 2, Y + 118, 30, HC.white, cw(t, K.infantil10 - 0.05, K.sacas11 - 0.2), { dark: 18 }); } }
  lab(wp(P.goldChair, 0, 0.06, 0), '1 PLAZA', null, cw(t, K.plaza10, K.sacas11 - 0.2), { dx: 100, dy: -140, color: HG });
  // L11: hasta 25 niños de 3 años… y tú
  { const k = cw(t, K.veinticinco11 - 0.1, K.y12); if (k > 0.01) { const n = Math.max(1, Math.min(25, Math.ceil((t - K.veinticinco11 + 0.1) / 0.02))); bigText(String(n), W / 2, Y - 20, 150, HC.white, k * (1 - 0.6 * win(t, K.y11b, 0.2)), { type: false, dark: 34 });
      bigText('NIÑOS DE 3 AÑOS', W / 2, Y + 90, 36, HC.white, cw(t, K.tres11 - 0.05, K.y12) * (1 - 0.6 * win(t, K.y11b, 0.2)), { dark: 22 }); } }
  { const k = cw(t, K.y11b - 0.05, K.y12 + 0.1); if (k > 0.01) { bigText('Y TÚ', W / 2, 1180, 120, HG, k, { glow: 26, type: false, dark: 30 }); brackets({ x: W / 2, y: 1000 }, 900, 1200, k, HG, 3); } }
  // L12: ensartar · la pinza · escribir
  lab(v3(SER_X(0), LACE_Y + 0.008, LACE_Z), 'ENSARTAR', null, cw(t, K.ensartarlos12 + 0.1, K.pinza12 - 0.05), { dx: -120, dy: -170 });
  { const k = cw(t, K.pinza12 - 0.1, K.usara12 - 0.05), Q = proj(v3(SER_X(0) + 0.02, LACE_Y + 0.01, LACE_Z)); pinchIcon(Q, k); if (k > 0.01 && Q.ok) lab(Q, 'PINZA', 'PULGAR + ÍNDICE', k, { dx: -120, dy: -200, color: HG }); }
  if (P.pencil.visible) lab(wp(P.pencil, 0, 0.12, 0), 'ESCRITURA', null, cw(t, K.escribir12 - 0.05, K.si13 + 0.2), { dx: 120, dy: -160, color: HG });
  // L13: la serie · el estudio · 4 → 11 años
  { const k = cw(t, K.blanco13 - 0.05, K.predice13); if (k > 0.01) { const A = proj(v3(SER_X(0), LACE_Y, LACE_Z)), B2 = proj(v3(SER_X(1), LACE_Y, LACE_Z));
      if (A.ok) bigText('B', A.x, A.y - 90, 46, HC.white, cw(t, K.blanco13 - 0.05, K.predice13), { type: false, dark: 16 }); if (B2.ok) bigText('N', B2.x, B2.y - 90, 46, HC.white, cw(t, K.negro13 - 0.05, K.predice13), { type: false, dark: 16 });
      const s = cw(t, K.serie13 - 0.1, K.segun13); if (s > 0.01) { const C = proj(v3((SER_X(0) + SER_X(SER_N - 1)) / 2, LACE_Y, LACE_Z)); if (C.ok) { brackets(C, 720, 170, s, HG, 3); bigText('PRIMERA SERIE', W / 2, Y + 20, 56, HG, s, { glow: 18, dark: 26 }); } } } }
  { const k = cw(t, K.segun13 - 0.05, K.predice13 + 0.3); if (k > 0.01) { bigText('ESTUDIO: 517 NIÑOS, DE 4 A 11 AÑOS', W / 2, Y + 110, 26, HC.white, k, { dark: 20 }); bigText('RITTLE-JOHNSON Y OTROS (2017)', W / 2, Y + 152, 20, HC.grey, k, { dark: 16 }); } }
  { const k = cw(t, K.cuatro13 - 0.05, K.primeros14 - 0.2); if (k > 0.01) { bigText('4 AÑOS', W / 2 - 200, Y - 120, 60, HC.white, k, { type: false, dark: 26 }); const a = cw(t, K.predice13, K.primeros14 - 0.2);
      if (a > 0.01) { hg.save(); hg.globalAlpha = a; hg.strokeStyle = HG; hg.fillStyle = HG; hg.lineWidth = 6; hg.shadowColor = HG; hg.shadowBlur = 14; const x0 = W / 2 - 60, x1 = x0 + 160 * eo(clamp((t - K.predice13) / 0.4)); hg.beginPath(); hg.moveTo(x0, Y - 120); hg.lineTo(x1, Y - 120); hg.stroke(); hg.beginPath(); hg.moveTo(x1 + 18, Y - 120); hg.lineTo(x1 - 6, Y - 134); hg.lineTo(x1 - 6, Y - 106); hg.closePath(); hg.fill(); hg.restore(); }
      bigText('11 AÑOS', W / 2 + 250, Y - 120, 60, HG, cw(t, K.once13 - 0.05, K.primeros14 - 0.2), { type: false, glow: 18, dark: 26 }); } }
  // L14: un millón de conexiones por segundo
  { const k = cw(t, K.crea14 - 0.05, K.asi15); if (k > 0.01) { const u = clamp((t - K.crea14) / (K.millon14 + 0.2 - K.crea14)), n = Math.round(1e6 * (Math.exp(5 * u) - 1) / (Math.exp(5) - 1));
      bigText('+' + n.toLocaleString('es-ES'), W / 2, Y, 120, HG, k, { glow: 26, type: false, dark: 34 }); bigText('CONEXIONES POR SEGUNDO', W / 2, Y + 96, 34, HC.white, cw(t, K.conexiones14 - 0.05, K.asi15), { dark: 22 });
      bigText('CENTER ON THE DEVELOPING CHILD · HARVARD', W / 2, Y + 146, 19, HC.grey, cw(t, K.segundo14 - 0.1, K.asi15), { dark: 16 }); } }
  // L15: así que sí… pero sabiendo por qué
  { const k = cw(t, K.si15 - 0.05, K.magisterio15 + 0.4); if (k > 0.01) stamp('SÍ', W / 2, 1380, k, HG, 120); }
  { const k = cw(t, K.pero15 - 0.05, K.mandaselo16 - 0.1); if (k > 0.01) { bigText('…PERO SABIENDO', W / 2, Y, 62, HC.white, k, { dark: 26 }); bigText('POR QUÉ', W / 2, Y + 90, 92, HG, cw(t, K.sabiendo15 + 0.1, K.mandaselo16 - 0.1), { glow: 24, type: false, dark: 30 }); } }
  // L16: mándaselo · ¿Infantil o Primaria?
  { const k = cw(t, K.mandaselo16 - 0.05, K.infantil16 - 0.1); if (k > 0.01) { plane(W / 2 - 230, Y - 10, 0.9, k); bigText('MÁNDASELO', W / 2 + 70, Y, 70, HC.white, k, { dark: 26 }); bigText('A QUIEN DIJO QUE ERA FÁCIL', W / 2, Y + 86, 30, HG, cw(t, K.dijo16, K.infantil16 - 0.1), { dark: 20 }); } }
  { const d = cw(t, K.infantil16 - 0.1, END - 0.5); if (d > 0.01) { bigText('¿INFANTIL', W / 2, Y - 20, 84, HC.white, d, { glow: 14, type: false, dark: 28 }); bigText('O PRIMARIA?', W / 2, Y + 80, 84, HG, cw(t, K.primaria16 - 0.1, END - 0.5), { glow: 18, type: false, dark: 28 }); } }
}
