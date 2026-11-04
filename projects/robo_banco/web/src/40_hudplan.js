// ---------------------------------------------------------------- HUD: cabecera, cotas (78 m, 4 m, 1,10 m), rótulos y contadores
function buildHudPlan() {}
const HG = '#FFC24A';
const cw = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '8px'; hfont(40); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('EL TÚNEL DEL BANCO', 54, 142);
  hg.letterSpacing = '4px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText('FORTALEZA · BRASIL · AGOSTO 2005', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('BOTÍN', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('R$ 164 M', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('3,5 TONELADAS', 1024, 178);
  hg.restore();
}
function counter(x, y, label, val, k, col = HG) {
  if (k <= 0.01) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.textAlign = 'center'; hg.textBaseline = 'middle';
  hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, x - 190, y - 74, 380, 140, 18); hg.fill();
  hg.letterSpacing = '4px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText(label, x, y - 40);
  hg.letterSpacing = '2px'; hfont(58); hg.fillStyle = col; hg.shadowColor = col; hg.shadowBlur = 14; hg.fillText(val, x, y + 18);
  hg.restore();
}
function calCard(x, y, top, big, k, col = HC.white) {
  if (k <= 0.01) return;
  const s = 0.85 + 0.15 * eo(clamp(k * 2));
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.translate(x, y); hg.scale(s, s);
  hg.fillStyle = '#f2efe6'; rr(hg, -120, -95, 240, 190, 16); hg.fill(); hg.fillStyle = '#b3122a'; rr(hg, -120, -95, 240, 58, 16); hg.fill(); hg.fillRect(-120, -55, 240, 18);
  hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(26); hg.fillStyle = '#ffffff'; hg.fillText(top, 0, -64);
  hfont(54); hg.fillStyle = '#16181d'; hg.letterSpacing = '1px'; hg.fillText(big, 0, 22); hg.restore();
}
const fmtR = v => 'R$ ' + Math.round(v) + ' M', fmtT = v => v.toFixed(1).replace('.', ',') + ' t';
function hudAt(t) {
  hudBegin(); hdr(t);
  const T0 = TY - TH / 2, T1 = TY + TH / 2;
  // 1: la cota del túnel (78 m)
  { const k = cw(t, K.n78 - 0.05, K.fortaleza2 + 0.1, 0.3, 0.35); if (k > 0.01) { const A = proj(v3(TX0, T0 - 0.5, CZ)), B = proj(v3(TX1, T0 - 0.5, CZ));
      if (A.ok && B.ok) { hg.save(); hg.globalAlpha = k; hg.strokeStyle = HG; hg.fillStyle = HG; hg.lineWidth = 3; const e = eo(clamp(k / 0.6)), Bx = A.x + (B.x - A.x) * e, By = A.y + (B.y - A.y) * e;
        hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(Bx, By); hg.stroke(); for (const P of [A, { x: Bx, y: By }]) { hg.beginPath(); hg.arc(P.x, P.y, 7, 0, 7); hg.fill(); }
        hg.letterSpacing = '4px'; hfont(44); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 10; hg.fillText(typed('78 m', clamp((k - 0.3) / 0.5)), (A.x + B.x) / 2, (A.y + B.y) / 2 + 52); hg.restore(); } } }
  lab(v3(VX0 + 6.2, SLB1 + 1.4, CZ - 2.6), 'CÁMARA ACORAZADA', null, cw(t, K.camara1, K.fortaleza2 - 0.1), { dx: -90, dy: -150, color: HC.white });
  // 2: Fortaleza, Brasil, 2005
  { const k = cw(t, K.fortaleza2 - 0.05, K.alquilan3 - 0.1, 0.25, 0.3); bigText('FORTALEZA · BRASIL', W / 2, 1480, 56, HC.white, k, { dark: 22 }); bigText('2005', W / 2, 1570, 72, HG, cw(t, K.y20052 - 0.05, K.alquilan3 - 0.1), { dark: 22, glow: 14 }); }
  // 3: la casa alquilada y la empresa falsa
  lab(v3(-4.0, 2.2, -2.6), 'CASA ALQUILADA', 'ENFRENTE DEL BANCO', cw(t, K.casa3 - 0.05, K.falsa3 - 0.1), { dx: 150, dy: 260, color: HC.white });
  { const k = cw(t, K.falsa3 - 0.05, K.tres4 + 0.2, 0.2, 0.3); stamp('FALSA', 700, 1380, k, HC.red, 84); }
  // 4: ventas a 0, abril → agosto, la tierra
  { const k = cw(t, K.tres4, K.casa4 + 0.2, 0.25, 0.3), m = ['ABRIL', 'MAYO', 'JUNIO', 'JULIO'][Math.min(3, Math.floor(clamp((t - K.tres4) / (K.casa4 - K.tres4)) * 4))];
    calCard(250, 1440, '2005', m, k); counter(720, 1440, 'CÉSPED VENDIDO', '0 m', cw(t, K.vender4, K.casa4 + 0.2, 0.25, 0.3), HC.red); }
  if (S.truck.visible) lab(S.dirt.getWorldPosition(new THREE.Vector3()), 'TIERRA', null, cw(t, K.tierra4 - 0.05, K.bajo5 + 0.1), { dx: 120, dy: -140, color: HG });
  // 5: 4 m bajo la avenida; vigas, luz, ventilación
  { const k = cw(t, K.bajo5, K.vigas5 - 0.1, 0.3, 0.3); if (k > 0.01) { const A = proj(v3(5.5, 0.05, CZ)), B = proj(v3(5.5, TY, CZ)); if (A.ok && B.ok) dimV(A, B, '4 m', k, HG, -60); } }
  lab(v3(8.85, T1 - 0.1, CZ - 0.2), 'VIGAS', null, cw(t, K.vigas5 - 0.05, K.luz5 + 0.4), { dx: -80, dy: -160, color: HC.white });
  lab(v3(11.8, T1 - 0.17, CZ - 0.2), 'LUZ', null, cw(t, K.luz5 - 0.05, K.ventilacion5 + 0.3), { dx: 90, dy: -170, color: HG });
  lab(v3(12.5, T1 - 0.13, CZ - 0.33), 'VENTILACIÓN', null, cw(t, K.ventilacion5 - 0.05, K.hasta6 + 0.1), { dx: 110, dy: -170, color: HC.teal });
  // 6: la losa de 1,10 m de hormigón armado
  { const k = cw(t, K.unmetro6 - 0.05, K.perforan7 + 0.1, 0.3, 0.3); if (k > 0.01) { const A = proj(v3(22.25, SLB1, CZ + 0.01)), B = proj(v3(22.25, SLB0, CZ + 0.01)); if (A.ok && B.ok) dimV(A, B, '1,10 m', k, HG, -30); } }
  lab(v3(25.2, (SLB0 + SLB1) / 2, CZ), 'HORMIGÓN ARMADO', 'CON BARRAS DE ACERO', cw(t, K.hormigon6 - 0.05, K.perforan7 + 0.2), { dx: 70, dy: 210, color: HC.white });
  // 7: el agujero (75 cm), la capa fina y la espera
  lab(v3(HX, SLB0 + 0.2, CZ), 'AGUJERO DE 75 cm', null, cw(t, K.perforan7 + 0.2, K.capa7 - 0.15), { dx: 120, dy: 190, color: HC.white });
  lab(v3(HX + 0.2, SLB1 - 0.04, CZ), 'CAPA FINA', 'SIN ROMPER', cw(t, K.capa7 - 0.05, K.viernes8 - 0.1), { dx: 120, dy: -170, color: HG });
  { const k = cw(t, K.esperan7 - 0.05, K.viernes8 - 0.1, 0.2, 0.25); if (k > 0.01) { hg.save(); hg.globalAlpha = clamp(k * 2); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, W / 2 - 110, 1350, 220, 220, 30); hg.fill(); hg.fillStyle = HC.white; hg.fillRect(W / 2 - 42, 1400, 28, 120); hg.fillRect(W / 2 + 14, 1400, 28, 120); hg.restore(); } }
  // 8: el viernes, con el banco cerrado
  calCard(W / 2, 1440, 'AGOSTO 2005', 'VIERNES', cw(t, K.viernes8 - 0.05, K.rompen8, 0.2, 0.25)); stamp('BANCO CERRADO', W / 2, 1650, cw(t, K.cerrado8 - 0.05, K.rompen8 + 0.1, 0.2, 0.25), HC.red, 46);
  // 9: cámaras y sensores que no funcionan
  for (const [i, tt, txt] of [[0, K.camaras9, 'CÁMARAS'], [3, K.sensores9, 'SENSORES']]) { const g = S.sec[i]; const P = g.getWorldPosition(new THREE.Vector3()).add(v3(0, -0.15, 0));
    lab(P, txt + ' ✕', 'NO FUNCIONAN', cw(t, tt - 0.05, K.solo10 - 0.05), { dx: i ? -100 : 100, dy: 170, color: HC.red }); }
  // 10: billetes de 50 ya usados
  lab(v3(PALS[1][0], SLB1 + 1.2, PALS[1][1] + 0.6), 'BILLETES DE R$ 50', 'YA USADOS', cw(t, K.billetes10 - 0.05, K.sacan11 - 0.1), { dx: -110, dy: -190, color: HG });
  // 11: toneladas y millones
  { const k = cw(t, K.toneladas11 - 0.1, K.lunes12 - 0.05, 0.25, 0.3), u = clamp((t - K.toneladas11 + 0.1) / (K.billetes11 - K.toneladas11 + 0.5));
    counter(290, 1450, 'PESO', fmtT(3.5 * eo(u)), k, HC.white); const u2 = clamp((t - K.n164 + 0.05) / (K.reales11 - K.n164 + 0.4)); counter(790, 1450, 'BOTÍN', fmtR(164 * eo(u2)), cw(t, K.n164 - 0.1, K.lunes12 - 0.05, 0.25, 0.3)); }
  // 12: el lunes
  calCard(W / 2, 1440, 'AGOSTO 2005', 'LUNES', cw(t, K.lunes12 - 0.05, K.agujero12 - 0.1, 0.2, 0.25));
  lab(v3(HX, SLB1 + 0.02, CZ - 0.3), 'EL AGUJERO', null, cw(t, K.agujero12 - 0.05, K.mayor13 - 0.05), { dx: -110, dy: -170, color: HG });
  // 13: el mayor robo a un banco de Brasil; lo recuperado
  { const k = cw(t, K.mayor13 - 0.05, TT.rw, 0.25, 0.4); bigText('EL MAYOR ROBO A UN BANCO', W / 2, 1380, 40, HC.white, k, { dark: 20 }); bigText('DE LA HISTORIA DE BRASIL', W / 2, 1440, 40, HC.white, k, { dark: 20 });
    const k2 = cw(t, K.mayor13b - 0.05, TT.rw, 0.25, 0.4); if (k2 > 0.01) { const x0 = 120, w = W - 240, y = 1530, f = 25 / 164 * eo(clamp((t - K.mayor13b) / 0.8));
      hg.save(); hg.globalAlpha = clamp(k2 * 2); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, x0 - 20, y - 50, w + 40, 150, 16); hg.fill();
      hg.fillStyle = 'rgba(255,82,71,.85)'; rr(hg, x0, y, w, 30, 15); hg.fill(); hg.fillStyle = HC.green; rr(hg, x0, y, Math.max(30, w * f), 30, 15); hg.fill();
      hg.textBaseline = 'middle'; hg.letterSpacing = '3px'; hfont(22); hg.textAlign = 'left'; hg.fillStyle = HC.green; hg.fillText('RECUPERADO ≈ R$ 25 M', x0, y + 62);
      hg.textAlign = 'right'; hg.fillStyle = '#ff8a80'; hg.fillText('SIN APARECER', x0 + w, y + 62); hg.restore(); } }
}
