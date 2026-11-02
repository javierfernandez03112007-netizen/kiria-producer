// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (qué te falta), cifras grandes y rótulos con línea guía
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF';
function hdr(t) {
  const a = 1 - 0.85 * whiteAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('MEDICINA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('360 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('6 AÑOS', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, K.si13 + 0.5, 0.4));
  if (mk > 0.01) {
    let txt = 'LO QUE TE FALTA · ???', col = HC.red, blink = true;
    if (t > K.mir8) { txt = 'MIR · 200 PREGUNTAS'; col = HC.green; blink = false; }
    if (t > K.residencia11) { txt = 'MIR + RESIDENCIA'; col = HG; blink = false; }
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
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: menos de 4 de cada 100 · pueden elegir Dermatología
  { const k = cw(t, K.cuatro1, K.y2 - 0.2); if (k > 0.01) { bigText('< 4 / 100', W / 2, Y, 120, HG, k, { glow: 26, type: false, dark: 30, ls: 6 }); bigText('PUEDEN ELEGIR DERMATOLOGÍA', W / 2, Y + 96, 30, HC.white, cw(t, K.elegir1, K.y2 - 0.2), { dark: 20 }); } }
  // L2: la especialidad, cerrada · ¿qué te falta?
  if (S.vit.visible) { const L = S.vit.userData.lock; lab(L, 0, 0, 0.01, 'ESPECIALISTA', 'NO CON EL GRADO', cw(t, K.ninguno2 + 0.1, K.final2 - 0.1), { dx: 150, dy: -90, color: HC.red });
    const q = cw(t, K.falta2, K.crees3); if (q > 0.01) { const P = proj(wpo(L, 0, 0.02, 0.02)); if (P.ok) bigText('?', P.x, P.y - 150, 150, HC.red, q, { glow: 30, type: false }); } }
  // L3: memorizar ✗ → diagnosticar ✓
  { const k = cw(t, K.memorizar3 - 0.05, K.asi3); if (k > 0.01) { bigText('MEMORIZAR', W / 2, Y, 64, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad3, 0.3), dark: 24 });
      const s = win(t, K.realidad3 - 0.05, 0.3); if (s > 0.01) { hg.save(); hg.strokeStyle = HC.red; hg.lineWidth = 7; hg.shadowColor = HC.red; hg.shadowBlur = 14; hg.beginPath(); hg.moveTo(W / 2 - 230, Y); hg.lineTo(W / 2 - 230 + 460 * eo(s), Y); hg.stroke(); hg.restore(); }
      bigText('DIAGNOSTICAR', W / 2, Y + 100, 70, HG, cw(t, K.encontrar3 - 0.1, K.asi3), { glow: 20, dark: 26 }); } }
  if (S.lbox.visible) lab(S.lbox.userData.ring, 0, 0.04, 0, 'AQUÍ FALLA', null, cw(t, K.falla3 + 0.05, K.asi3), { dx: -120, dy: -150, color: HC.red });
  // L4–L8: rótulos de cada estación
  const CS = ST.CS; if (CS.Z.visible) { lab(CS.skull, 0, 0.24, 0, 'ANATOMÍA', null, cw(t, K.anatomia4 + 0.1, K.luego5 - 0.1), { dx: -110, dy: -130 });
    lab(CS.heart, 0, 0.3, 0, 'FISIOLOGÍA', null, cw(t, K.fisiologia4 + 0.1, K.luego5 - 0.1), { dx: 100, dy: -150, color: HC.red }); lab(CS.mol, 0, 0.1, 0, 'BIOQUÍMICA', null, cw(t, K.bioquimica4 + 0.1, K.luego5 - 0.1), { dx: -100, dy: -140, color: HG }); }
  const LF = ST.LF; if (LF.Z.visible) { lab(LF.mic, 0, 0.3, 0, 'PATOLOGÍA', null, cw(t, K.patologia5 + 0.1, K.desde6 - 0.1), { dx: -110, dy: -120 });
    lab(LF.pet, 0, 0.03, 0, 'MICROBIOLOGÍA', null, cw(t, K.microbiologia5 + 0.1, K.desde6 - 0.1), { dx: -100, dy: -170, color: HC.green }); lab(LF.bot, 0, 0.16, 0, 'FARMACOLOGÍA', null, cw(t, K.farmacologia5 + 0.1, K.desde6 - 0.1), { dx: 100, dy: -130, color: HD }); }
  const CL = ST.CL; if (CL.Z.visible) { const k = cw(t, K.tercero6 - 0.05, K.sexto7 - 0.2); if (k > 0.01) bigText('DESDE 3.º · CLÍNICAS', W / 2, Y + 40, 44, HC.white, k, { dark: 24 });
    lab(CL.mon, 0, 0.13, 0, 'CORAZÓN', 'CARDIOLOGÍA', cw(t, K.corazon6 + 0.1, K.sexto7 - 0.15), { dx: -100, dy: -120, color: HC.red }); lab(CL.brain, 0, 0.1, 0, 'CEREBRO', 'NEUROLOGÍA', cw(t, K.cerebro6 + 0.1, K.sexto7 - 0.15), { dx: 100, dy: -160 });
    lab(CL.ted, 0, 0.18, 0, 'NIÑOS', 'PEDIATRÍA', cw(t, K.ninos6 + 0.1, K.sexto7 - 0.15), { dx: 100, dy: -110, color: HG }); }
  const HO = ST.HO; if (HO.Z.visible) { const k = cw(t, K.sexto7, K.mir8 - 0.3); if (k > 0.01) { bigText('6.º · ROTATORIO', W / 2, Y, 70, HC.white, k, { glow: 12, dark: 26 }); bigText('CASI TODO EL AÑO EN EL HOSPITAL', W / 2, Y + 76, 28, HG, cw(t, K.entero7, K.mir8 - 0.3), { dark: 20 }); } }
  const MI = ST.MI; if (MI.Z.visible) { const k = cw(t, K.n200 - 0.05, K.cuatro8 - 0.1); if (k > 0.01) { const n = Math.min(200, Math.round(200 * eo(clamp((t - K.n200 + 0.05) / 0.6)))); bigText(String(n), W / 2, Y - 10, 130, HC.white, k, { glow: 14, type: false, dark: 30 }); bigText('PREGUNTAS · 4 OPCIONES', W / 2, Y + 80, 30, HC.white, k, { dark: 20 }); }
    const c = cw(t, K.cuatro8 - 0.05, K.fallo8 - 0.1); if (c > 0.01) { bigText('4 H 30 MIN', W / 2, Y, 96, HG, c, { glow: 18, type: false, dark: 30 }); }
    const f = cw(t, K.fallo8 - 0.05, K.mas9 - 0.1); if (f > 0.01) { bigText('ACIERTO +3', W / 2, Y - 20, 60, HC.green, f, { type: false, dark: 24 }); bigText('FALLO −1', W / 2, Y + 60, 72, HC.red, cw(t, K.resta8 - 0.1, K.mas9 - 0.1), { glow: 16, type: false, dark: 26 }); } }
  // L9: +15.000 · ≈ 9.000 plazas · tu número
  { const k = cw(t, K.n15000 - 0.1, K.tu9 - 0.2); if (k > 0.01) { const n = Math.round(15000 * eo(clamp((t - K.n15000 + 0.1) / 0.9)) / 100) * 100; bigText('+' + n.toLocaleString('es-ES'), W / 2, Y - 40, 110, HC.white, k, { type: false, dark: 34 });
      bigText('SE PRESENTAN AL MIR', W / 2, Y + 50, 28, HC.white, k, { dark: 24 }); bigText('≈ 9.000 PLAZAS', W / 2, Y + 150, 80, HG, cw(t, K.n9000 - 0.05, K.tu9 - 0.2), { glow: 18, type: false, dark: 34 }); }
    const m = cw(t, K.numero9 - 0.05, K.este10 - 0.15); if (m > 0.01 && S.me.visible) { callout(S.me.position.clone().add(v3(0, 0.07, 0)), 'TU NÚMERO', 'Nº 4.722 · EJEMPLO', m, { dx: 110, dy: -160, size: 28, subSize: 20, bg: true, color: HG });
      bigText('→ ESPECIALIDAD', W / 2, Y, 50, HC.white, cw(t, K.especialidad9 - 0.1, K.este10 - 0.15), { dark: 24 }); bigText('→ CIUDAD', W / 2, Y + 70, 50, HG, cw(t, K.ciudad9 - 0.1, K.este10 - 0.15), { dark: 24 }); } }
  // L10: Dermatología, agotada antes del 500
  { const k = cw(t, K.dermatologia10 - 0.05, K.y11 - 0.1); if (k > 0.01) { bigText('DERMATOLOGÍA', W / 2, Y - 30, 70, HD, k, { glow: 18, dark: 28 });
      const n = Math.min(500, Math.max(1, Math.round(500 * eo(clamp((t - K.dermatologia10) / (K.agoto10 - K.dermatologia10 + 0.2)))))); bigText('Nº 1 → ' + n, W / 2, Y + 50, 40, HC.white, k, { type: false, dark: 22 });
      const s = cw(t, K.agoto10 - 0.05, K.y11 - 0.1); if (s > 0.01) stamp('AGOTADA', W / 2, Y + 170, s, HC.red, 84); } }
  // L11–L12
  const RE = ST.RE; if (RE.Z.visible) { const k = cw(t, K.cuatro11 - 0.05, K.cobrando11 - 0.1); if (k > 0.01) { bigText('4 – 5 AÑOS', W / 2, Y, 96, HC.white, k, { glow: 14, type: false, dark: 28 }); bigText('DE RESIDENCIA', W / 2, Y + 80, 34, HG, cw(t, K.residencia11 - 0.1, K.cobrando11 - 0.1), { dark: 22 }); }
    lab(RE.nom, 0, 0.12, 0, 'COBRANDO', 'CONTRATO DE RESIDENTE', cw(t, K.cobrando11 + 0.1, K.seis12 - 0.1), { dx: -110, dy: -140, color: HC.green }); lab(RE.clk, 0, 0.16, 0, 'GUARDIAS', null, cw(t, K.guardias11 + 0.05, K.seis12 - 0.1), { dx: -110, dy: -120, color: HC.amber }); }
  const AN = ST.AN; if (AN.Z.visible) { const a = cw(t, K.seis12 - 0.05, K.si13 - 0.1); if (a > 0.01) { const s5 = cw(t, K.cinco12 - 0.1, K.si13 - 0.1), dx = s5 > 0.01 ? 200 : 0;
      bigText('6', W / 2 - dx, Y - 20, 110, HC.white, a, { type: false, dark: 28 }); bigText('GRADO', W / 2 - dx, Y + 60, 30, HC.grey, a, { dark: 20 });
      if (s5 > 0.01) { bigText('+', W / 2, Y - 20, 90, HC.white, s5, { type: false, dark: 24 }); bigText('5', W / 2 + dx, Y - 20, 110, '#62E3D4', s5, { type: false, dark: 28 }); bigText('RESIDENCIA', W / 2 + dx, Y + 60, 30, '#62E3D4', s5, { dark: 20 }); }
      const o = cw(t, K.once12 - 0.05, K.si13 - 0.1); if (o > 0.01) bigText('= 11 AÑOS', W / 2, Y + 150, 96, HG, o, { glow: 22, type: false, dark: 30 }); }
    lab(AN.sur, 0, 1.15, 0, 'CIRUJANO', null, cw(t, K.cirujano12 + 0.05, K.si13 - 0.1), { dx: 110, dy: -130, color: HG }); }
  // L13: guárdalo · ¿quirófano o consulta?
  { const g = cw(t, K.guardalo13 - 0.05, K.dime13); if (g > 0.01) { const s = eo(clamp((t - K.guardalo13 + 0.05) / 0.3)); hg.save(); hg.globalAlpha = g; hg.translate(W / 2, Y); hg.scale(s, s); hg.fillStyle = HG; hg.shadowColor = HG; hg.shadowBlur = 24; hg.beginPath(); hg.moveTo(-50, -80); hg.lineTo(50, -80); hg.lineTo(50, 80); hg.lineTo(0, 45); hg.lineTo(-50, 80); hg.closePath(); hg.fill(); hg.restore(); }
    const d = cw(t, K.quirofano13 - 0.15, END - 0.6); if (d > 0.01) { bigText('¿QUIRÓFANO', W / 2 - 10, Y - 20, 74, '#62E3D4', d, { glow: 14, type: false, dark: 26 }); bigText('O CONSULTA?', W / 2, Y + 70, 74, HG, cw(t, K.consulta13 - 0.1, END - 0.6), { glow: 18, type: false, dark: 26 }); } }
}
