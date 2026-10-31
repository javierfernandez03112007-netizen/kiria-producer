// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (qué te falta), cifras grandes y rótulos con línea guía
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
function hdr(t) {
  const a = 1 - 0.85 * whiteAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('DERECHO', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('240 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('4 AÑOS', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, K.si16 + 0.5, 0.4));
  if (mk > 0.01) {
    let txt = 'LO QUE TE FALTA · ???', col = HC.red, blink = true;
    if (t > K.master13) { txt = 'ABOGADO · MÁSTER + EXAMEN'; col = HC.green; blink = false; }
    if (t > K.oposicion14) { txt = 'JUEZ · OPOSICIÓN + ESCUELA'; col = HC.green; blink = false; }
    if (t > K.toga15) { txt = 'MÁSTER · EXAMEN · OPOSICIÓN'; col = HG; blink = false; }
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
  // L1: 3 de cada 100 · jueces o fiscales
  { const k = cw(t, K.tres1, K.y2 - 0.2); if (k > 0.01) { bigText('3 / 100', W / 2, Y, 120, HG, k, { glow: 26, type: false, dark: 30 }); bigText('PODRÁN SER JUEZ O FISCAL', W / 2, Y + 96, 30, HC.white, cw(t, K.podran1, K.y2 - 0.2), { dark: 20 }); } }
  // L2: la abogacía, cerrada · ¿qué te falta?
  if (S.vit.visible) { const L = S.vit.userData.lock; lab(L, 0, 0, 0.01, 'ABOGACÍA', 'CERRADA CON EL GRADO', cw(t, K.ninguno2 + 0.1, K.final2 - 0.1), { dx: 150, dy: -90, color: HC.red });
    const q = cw(t, K.falta2, K.cada3); if (q > 0.01) { const P = proj(wpo(L, 0, 0.02, 0.02)); if (P.ok) bigText('?', P.x, P.y - 150, 150, HC.red, q, { glow: 30, type: false }); } }
  // L3: +26.000 que empiezan · < 600 plazas
  { const k = cw(t, K.veintiseis3 - 0.1, K.crees4 - 0.3); if (k > 0.01) { const n = Math.round(26000 * eo(clamp((t - K.veintiseis3 + 0.1) / 0.9)) / 100) * 100; bigText('+' + n.toLocaleString('es-ES'), W / 2, Y - 40, 110, HC.white, k, { type: false, dark: 34 });
      bigText('EMPIEZAN DERECHO CADA AÑO', W / 2, Y + 50, 28, HC.white, k, { dark: 24 }); }
    const g = cw(t, K.plazas3, K.crees4 - 0.3); if (g > 0.01) { callout(S.gcenter.clone().add(v3(0, 0.05, 0)), 'PLAZAS DE JUEZ Y FISCAL', 'POR OPOSICIÓN', g, { dx: -120, dy: -200, size: 26, bg: true, color: HG });
      bigText('< 600', W / 2, Y + 150, 96, HG, cw(t, K.menos3, K.crees4 - 0.3), { glow: 18, type: false, dark: 34 }); } }
  // L4: memorizar ✗ → argumentar ✓
  { const k = cw(t, K.memorizar4 - 0.05, K.asi4); if (k > 0.01) { bigText('MEMORIZAR', W / 2, Y, 64, HC.white, k, { a: 1 - 0.55 * win(t, K.realidad4, 0.3), dark: 24 });
      const s = win(t, K.realidad4 - 0.05, 0.3); if (s > 0.01) { hg.save(); hg.strokeStyle = HC.red; hg.lineWidth = 7; hg.shadowColor = HC.red; hg.shadowBlur = 14; hg.beginPath(); hg.moveTo(W / 2 - 230, Y); hg.lineTo(W / 2 - 230 + 460 * eo(s), Y); hg.stroke(); hg.restore(); }
      bigText('ARGUMENTAR', W / 2, Y + 100, 72, HG, cw(t, K.ganar4 - 0.1, K.asi4), { glow: 20, dark: 26 }); } }
  // L5–L15: rótulos de cada estación
  const B = ST.B; if (B.Z.visible) { lab(B.col, 0, B.col.userData.h * 0.75, 0, 'DERECHO ROMANO', null, cw(t, K.derecho5 + 0.15, K.constitucional5 - 0.05), { dx: -110, dy: -120 });
    B.pyr.forEach((p, i) => lab(p, 0.06, 0, 0.06, ['REGLAMENTOS', 'LEYES', 'CONSTITUCIÓN'][i], null, cw(t, K.teoria5 + 0.15 + i * 0.12, K.civil6 - 0.1), { dx: 120, dy: -50 - i * 70, color: i === 2 ? HG : HC.white })); }
  const CI = ST.CI; if (CI.Z.visible) { lab(CI.paper, 0, 0.1, 0, 'CONTRATOS', null, cw(t, K.contratos6, K.herencias6 - 0.05), { dx: -110, dy: -130 }); lab(CI.env, 0, 0.02, 0, 'HERENCIAS', null, cw(t, K.herencias6 + 0.1, K.familia6 - 0.05), { dx: 110, dy: -150 });
    lab(CI.fam[1], 0, 1.1, 0, 'FAMILIA', null, cw(t, K.familia6 + 0.1, K.todo6 - 0.05), { dx: 110, dy: -110 }); lab(CI.mag, 0, 0, 0, 'LETRA PEQUEÑA', 'LO QUE FIRMAS SIN LEER', cw(t, K.todo6 + 0.2, K.penal7 - 0.1), { dx: 100, dy: -170, color: HG }); }
  const PE = ST.PE; if (PE.Z.visible) { lab(PE.pane, 0.04, 0.05, 0, 'DELITO', null, cw(t, K.delito7, K.pena7 - 0.05), { dx: -120, dy: -150, color: HC.teal }); lab(PE.hg, 0, 0.32, 0, 'PENA', null, cw(t, K.pena7 + 0.05, K.prueba7 - 0.05), { dx: 100, dy: -120 });
    lab(PE.mag, 0, 0, 0, 'PRUEBA', null, cw(t, K.prueba7 + 0.05, K.admin8 - 0.1), { dx: -120, dy: -160, color: HC.teal }); }
  const AD = ST.AD; if (AD.Z.visible) { lab(AD.bld, 0, 0.95, 0, 'ADMINISTRACIÓN', null, cw(t, K.admin8 + 0.3, K.defiende8 - 0.05), { dx: 110, dy: -130 }); lab(AD.cit, 0, 1.1, 0, 'CIUDADANO', null, cw(t, K.ciudadano8 + 0.1, K.mercantil9 - 0.1), { dx: -110, dy: -140, color: HG }); }
  const ME = ST.ME; if (ME.Z.visible) { lab(ME.tw[0], 0, 0.62, 0, 'EMPRESAS', null, cw(t, K.empresas9, K.despidos9 - 0.05), { dx: 120, dy: -110 }); lab(ME.box, 0, 0.18, 0, 'DESPIDOS', null, cw(t, K.despidos9 + 0.1, K.nominas9 - 0.05), { dx: -110, dy: -140, color: HC.red });
    lab(ME.nom, 0, 0.1, 0, 'NÓMINAS', null, cw(t, K.nominas9 + 0.1, K.procesal10 - 0.1), { dx: -100, dy: -150, color: HC.green }); }
  const PR = ST.PR; if (PR.Z.visible) { const k = cw(t, K.demanda10 - 0.1, K.internacional11 - 0.1); if (k > 0.01) { const u = clamp((t - K.demanda10) / (K.sentencia10 - K.demanda10)); hg.save(); hg.globalAlpha = k; const x0 = 200, x1 = 880, y = 1500; hg.strokeStyle = 'rgba(238,242,246,.35)'; hg.lineWidth = 3; hg.beginPath(); hg.moveTo(x0, y); hg.lineTo(x1, y); hg.stroke();
      hg.strokeStyle = HG; hg.lineWidth = 5; hg.shadowColor = HG; hg.shadowBlur = 12; hg.beginPath(); hg.moveTo(x0, y); hg.lineTo(x0 + (x1 - x0) * eo(u), y); hg.stroke(); hg.shadowBlur = 0; hfont(26); hg.letterSpacing = '3px'; hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('DEMANDA', x0, y - 26); hg.textAlign = 'right'; hg.fillStyle = u >= 1 ? HG : HC.grey; hg.fillText('SENTENCIA', x1, y - 26);
      for (const [x, on] of [[x0, true], [x1, u >= 1]]) { hg.fillStyle = on ? HG : '#444'; hg.beginPath(); hg.arc(x, y, 9, 0, 7); hg.fill(); } hg.restore(); }
    lab(PR.court, 0, 0.3, -0.3, 'JUICIO', null, cw(t, K.juicio10, K.demanda10 - 0.05), { dx: 110, dy: -140 }); }
  const IN = ST.IN; if (IN.Z.visible) { const g = IN.globe; lab(g, ll(-3.7, 40.4, 0.305).x, ll(-3.7, 40.4, 0.305).y, ll(-3.7, 40.4, 0.305).z, 'ESPAÑA', null, cw(t, K.internacional11 + 0.2, K.abogados12 - 0.2), { dx: -120, dy: -120, color: HG });
    lab(IN.stars, 0.46, 0, 0, 'UNIÓN EUROPEA', null, cw(t, K.europeo11 + 0.1, K.abogados12 - 0.2), { dx: 100, dy: -90 }); const k = cw(t, K.leyes11 + 0.2, K.abogados12 - 0.2); if (k > 0.01) bigText('MÁS ALLÁ DE ESPAÑA', W / 2, Y + 60, 44, HC.white, k, { dark: 24 }); }
  const SA = ST.SA; if (SA.Z.visible) { const wk = [K.abogados12, K.jueces12, K.fiscales12, K.notarios12], nm = ['ABOGADO', 'JUEZ', 'FISCAL', 'NOTARIO'];
    SA.figs.forEach((f, i) => lab(f, 0, 0.21, 0, nm[i], null, cw(t, wk[i] + 0.05, K.pero12), { dx: i < 2 ? -70 : 70, dy: -120 - (i % 2) * 70, size: 24 }));
    const s = cw(t, K.ninguno12, K.falta13 - 0.1); if (s > 0.01) stamp('NO BASTA', W / 2, 1330, s, HC.red, 92); }
  const AB = ST.AB; if (AB.Z.visible) { const wk = [K.master13, K.practicas13, K.examen13, K.colegiarte13], nm = ['MÁSTER DE ACCESO', 'PRÁCTICAS', 'EXAMEN ESTATAL', 'COLEGIACIÓN'];
    AB.items.forEach((o, i) => lab(o, 0, 0.05, 0, nm[i], i === 0 ? '≈ 1 AÑO Y MEDIO' : null, cw(t, wk[i] + 0.05, K.juez14 - 0.1), { dx: 100, dy: -90 - i * 30, color: i === 3 ? HG : HC.white, size: 24 })); }
  const JU = ST.JU; if (JU.Z.visible) { lab(JU.test, 0, 0.1, 0, '1 TEST', null, cw(t, K.test14 + 0.05, K.escuela14 - 0.1), { dx: 100, dy: -150 }); lab(JU.trib[2], 0, 0.24, 0, '2 ORALES', 'ANTE UN TRIBUNAL', cw(t, K.orales14, K.escuela14 - 0.1), { dx: -110, dy: -140, color: HG });
    lab(JU.pin, 0, 0.1, 0, 'ESCUELA JUDICIAL', 'BARCELONA', cw(t, K.escuela14 + 0.1, K.cuatro15 - 0.1), { dx: -120, dy: -130, color: HG }); }
  const TO = ST.TO; if (TO.Z.visible) { const k = cw(t, K.cuatro15, K.si16); if (k > 0.01) { bigText('4 AÑOS', W / 2, Y, 100, HC.white, k, { glow: 16, type: false, dark: 28 }); bigText('…Y LA TOGA, DESPUÉS', W / 2, Y + 92, 40, HG, cw(t, K.toga15 - 0.05, K.si16), { glow: 16, dark: 24 }); } }
  // L16: guárdalo · ¿abogado o juez?
  { const g = cw(t, K.guardalo16 - 0.05, K.dime16); if (g > 0.01) { const s = eo(clamp((t - K.guardalo16 + 0.05) / 0.3)); hg.save(); hg.globalAlpha = g; hg.translate(W / 2, Y); hg.scale(s, s); hg.fillStyle = HG; hg.shadowColor = HG; hg.shadowBlur = 24; hg.beginPath(); hg.moveTo(-50, -80); hg.lineTo(50, -80); hg.lineTo(50, 80); hg.lineTo(0, 45); hg.lineTo(-50, 80); hg.closePath(); hg.fill(); hg.restore(); }
    const d = cw(t, K.abogado16 - 0.15, END - 0.6); if (d > 0.01) { bigText('¿ABOGADO', W / 2 - 10, Y - 20, 74, HC.white, d, { glow: 14, type: false, dark: 26 }); bigText('O JUEZ?', W / 2, Y + 70, 74, HG, cw(t, K.juez16 - 0.1, END - 0.6), { glow: 18, type: false, dark: 26 }); } }
}
