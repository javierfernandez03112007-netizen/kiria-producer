// ---------------------------------------------------------------- HUD: cabecera con la pregunta pendiente (¿para qué sirven?), cifras grandes y rótulos
function buildHudPlan() {}
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('ECONOMÍA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.globalAlpha = tk; hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('240 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('4 AÑOS', 1024, 178);
  const mk = win(t, K.final2 - 0.1, 0.3) * (1 - win(t, K.dime14, 0.4));
  if (mk > 0.01) {
    let txt = 'PARA QUÉ SIRVE · ???', col = HC.red, blink = true;
    if (t > K.sirve13) { txt = 'PARA QUE NO TE VENDAN HUMO'; col = HG; blink = false; }
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
  const P = S.props, Y = 1450, SRC = 'SPIVA · S&P DOW JONES INDICES';
  // L1: +58,4 % · 96 de cada 100
  { const k = cw(t, K.n58 - 0.05, K.n96 - 0.15); if (k > 0.01) { bigText('+58,4 %', W / 2, Y - 20, 130, HG, k, { glow: 26, type: false, dark: 34 }); bigText('BOLSA ESPAÑOLA · 2025', W / 2, Y + 80, 32, HC.white, k, { dark: 22 }); } }
  { const k = cw(t, K.n96 - 0.05, K.entonces2 - 0.1); if (k > 0.01) { const n = Math.min(96, Math.max(1, Math.round(96 * eo(clamp((t - K.n96 + 0.05) / 0.7))))); bigText(n + ' / 100', W / 2, Y - 20, 130, HC.red, k, { glow: 24, type: false, dark: 34 });
      bigText('FONDOS PROFESIONALES: PEOR', W / 2, Y + 80, 32, HC.white, cw(t, K.fondos1 - 0.05, K.entonces2 - 0.1), { dark: 22 }); bigText(SRC, W / 2, Y + 128, 20, HC.grey, cw(t, K.profes1, K.entonces2 - 0.1), { dark: 16 }); } }
  // L3: hacerte rico ✗ → por qué casi nadie lo consigue
  { const k = cw(t, K.rico3 - 0.1, K.micro4 - 0.2); if (k > 0.01) { bigText('HACERTE RICO', W / 2, Y, 70, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad3, 0.3), dark: 26 }); strike(W / 2 - 230, W / 2 + 230, Y, win(t, K.realidad3 - 0.05, 0.3));
      bigText('POR QUÉ CASI NADIE', W / 2, Y + 96, 54, HG, cw(t, K.casi3 - 0.1, K.micro4 - 0.2), { glow: 18, dark: 26 }); bigText('LO CONSIGUE', W / 2, Y + 160, 54, HG, cw(t, K.consigue3 - 0.1, K.micro4 - 0.2), { glow: 18, dark: 26 }); } }
  // L4–L8: asignaturas
  lab(wp(P.house, 0, 0.42, 0), 'MICROECONOMÍA', 'OFERTA Y DEMANDA', cw(t, K.micro4 + 0.05, K.macro5 - 0.2), { dx: 120, dy: -160 });
  lab(wp(P.macroMon[1], 0, 0.42, 0.02), 'MACROECONOMÍA', null, cw(t, K.macro5 + 0.05, K.mates6 - 0.2), { dx: -110, dy: -170 });
  { const k = cw(t, K.mates6 - 0.05, K.econom7 - 0.15); if (k > 0.01) { bigText('MATEMÁTICAS', W / 2, Y + 230, 64, HC.white, k, { dark: 26 }); bigText('+ ESTADÍSTICA', W / 2, Y + 305, 52, HG, cw(t, K.estad6 - 0.05, K.econom7 - 0.15), { glow: 16, dark: 24 }); } }
  { const k = cw(t, K.econom7 - 0.05, K.finanzas8 - 0.15); if (k > 0.01) { bigText('ECONOMETRÍA', W / 2, Y + 230, 66, HG, k, { glow: 18, dark: 26 }); bigText('DATOS: QUÉ FUNCIONA Y QUÉ NO', W / 2, Y + 305, 30, HC.white, cw(t, K.separar7 - 0.05, K.finanzas8 - 0.15), { dark: 20 }); } }
  lab(wp(P.tower, 0, 0.8, 0), 'FINANZAS', 'CUÁNTO VALE UNA EMPRESA', cw(t, K.finanzas8 + 0.1, K.loco9 - 0.2), { dx: -120, dy: -140, color: HG });
  // L9: Nobel 2013: Fama y Shiller
  P.medals.forEach((g, i) => lab(wp(g, 0, 0.36, 0), i ? 'ROBERT SHILLER' : 'EUGENE FAMA', i ? 'LAS BURBUJAS' : 'MERCADOS EFICIENTES', cw(t, K.dos9 + i * 0.1, K.uno10 - 0.2), { dx: i ? -100 : 100, dy: i ? -170 : -40, color: i ? HC.red : HG, size: 24, subSize: 18 }));
  // L10: la burbuja
  if (P.bubble.visible) lab(P.bubble.position.clone().add(v3(0.2, 0.25, 0)), 'BURBUJA', null, cw(t, K.burbujas10 - 0.1, K.burst), { dx: 120, dy: -120, color: HC.red });
  // L11: comisiones · el fondo medio, por detrás
  lab(wp(P.cbox, 0, 0.1, 0), 'COMISIONES', null, cw(t, K.comisiones11 - 0.05, K.fondos12 - 0.2), { dx: 110, dy: -150, color: HC.red });
  { const k = cw(t, K.nunca11 - 0.1, K.fondos12 - 0.2); if (k > 0.01) { bigText('−5,5 PUNTOS', W / 2, Y, 100, HC.red, k, { glow: 20, type: false, dark: 30 }); bigText('FONDO MEDIO FRENTE A LA BOLSA', W / 2, Y + 84, 28, HC.white, k, { dark: 20 }); bigText('1.ER SEMESTRE 2026 · ' + SRC, W / 2, Y + 128, 19, HC.grey, k, { dark: 16 }); } }
  // L12: la copia de la bolsa, por delante
  lab(P.idxCurve.getPointAt(0.55), 'FONDO INDEXADO', 'COPIA A LA BOLSA', cw(t, K.copian12 + 0.1, K.para13 - 0.2), { dx: -120, dy: -160, color: '#DCE6FF' });
  { const k = cw(t, K.acaban12 - 0.05, K.para13 - 0.2); if (k > 0.01) { bigText('LA BOLSA GANÓ', W / 2, Y, 52, HC.white, k, { dark: 24 }); bigText('AL 96 % DE LOS FONDOS', W / 2, Y + 76, 48, HG, k, { glow: 16, dark: 24 }); bigText('BOLSA ESPAÑOLA · 2025 · ' + SRC, W / 2, Y + 126, 19, HC.grey, k, { dark: 16 }); } }
  // L13: humo
  { const k = cw(t, K.humo13 - 0.05, K.esto14); if (k > 0.01) bigText('HUMO', W / 2, Y + 20, 110, HC.white, k * (1 - 0.7 * clamp((t - K.humo13) / 0.9)), { type: false, dark: 30 }); }
  // L14: no es asesoramiento · ¿gestor o indexado?
  { const k = cw(t, K.esto14 - 0.05, END - 0.5); if (k > 0.01) bigText('NO ES ASESORAMIENTO FINANCIERO', W / 2, 1290, 26, HC.grey, k, { dark: 18 }); }
  // (el duelo «¿gestor o indexado?» va en el panel)
}
