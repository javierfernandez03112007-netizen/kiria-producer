// ---------------------------------------------------------------- HUD: cabecera con la pregunta pendiente (¿naranja o espejo?), cifras grandes y rótulos técnicos
function buildHudPlan() {}
const HO = '#FFB547', HB = '#8FB8FF', HV = '#C9A6FF';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
const wpL = (o, x = 0, y = 0, z = 0) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('GAFAS DE ESQUÍ', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('LA LUZ, POR DENTRO', tk), 56, 182);
  hg.globalAlpha = tk; hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('LA NIEVE REFLEJA', 1024, 112);
  hfont(32); hg.fillStyle = HV; hg.fillText('≤ 80 % UV', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('FUENTE: OMS', 1024, 178);
  const mk = win(t, K.final2 - 0.1, 0.3) * (1 - win(t, END - 0.6, 0.4));
  if (mk > 0.01) {
    let txt = 'NARANJA O ESPEJO · ???', col = HC.red, blink = true;
    if (t > K.decides12 - 0.1) { txt = 'LA LUZ QUE DECIDES NO VER'; col = HO; blink = false; }
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
// barra del espectro (7 colores + UV); «dim» apaga el azul y el violeta
function specBar(x, y, w, h, k, dim) {
  if (k <= 0.01) return;
  const cols = ['#ff3b3b', '#ff8a1f', '#ffd31a', '#3ddc5a', '#22c6e8', '#3d6dff', '#8b4dff'];
  hg.save(); hg.globalAlpha = k; const sw = w / 7;
  cols.forEach((c, i) => { hg.fillStyle = c; hg.globalAlpha = k * (i >= 4 ? 1 - 0.78 * dim : 1); hg.fillRect(x + i * sw * eo(k), y, sw * eo(k) - 3, h); });
  hg.globalAlpha = k; hfont(18, false); hg.letterSpacing = '3px'; hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText('ROJO', x, y + h + 30); hg.textAlign = 'right'; hg.fillText('AZUL · VIOLETA', x + w, y + h + 30);
  if (dim > 0.01) { hg.globalAlpha = k * dim; hg.strokeStyle = HO; hg.lineWidth = 3; hg.setLineDash([10, 8]); hg.strokeRect(x + 4 * sw - 6, y - 10, 3 * sw + 8, h + 20); hg.setLineDash([]);
    hfont(22); hg.fillStyle = HO; hg.textAlign = 'center'; hg.fillText('MENOS AZUL', x + 5.5 * sw, y - 24); }
  hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430, H = HP.hero, L = HP.L;
  // L1: dos veces (cielo y suelo)
  { const k = cw(t, K.cielo1 - 0.1, K.porque2 + 0.2); if (k > 0.01) bigText('1 · DESDE EL CIELO', W / 2, Y + 30, 46, HC.white, k, { dark: 22 }); }
  { const k = cw(t, K.suelo1 - 0.1, K.porque2 + 0.2); if (k > 0.01) bigText('2 · DESDE EL SUELO', W / 2, Y + 100, 46, HO, k, { glow: 14, dark: 22 }); }
  // L3: luz visible y ultravioleta
  lab(LI.spec[3].userData.pts[24], 'LUZ VISIBLE', 'TODOS LOS COLORES', cw(t, K.colores3 - 0.05, K.nieve4 - 0.1), { dx: 130, dy: -130 });
  lab(LI.spec[7].userData.pts[20], 'ULTRAVIOLETA', 'NO SE VE', cw(t, K.ultra3 - 0.1, K.nieve4 + 0.3), { dx: -120, dy: 110, color: HV });
  // L4: 80 %
  { const k = cw(t, K.n80 - 0.1, K.quema4 - 0.15); if (k > 0.01) { const n = Math.min(80, Math.max(1, Math.round(80 * eo(clamp((t - K.n80 + 0.1) / 0.6))))); bigText(n + ' %', W / 2, Y - 20, 140, HV, k, { glow: 26, type: false, dark: 34 });
    bigText('DE LA ULTRAVIOLETA REBOTA', W / 2, Y + 82, 32, HC.white, k, { dark: 22 }); bigText('NIEVE RECIÉN CAÍDA · FUENTE: OMS', W / 2, Y + 130, 20, HC.grey, k, { dark: 16 }); } }
  if (LI.eye.visible) lab(wpL(LI.eye, 0, 0, 0.5), 'CÓRNEA', 'SE QUEMA: CEGUERA DE LA NIEVE', cw(t, K.quema4 - 0.05, K.vamos5 - 0.1), { dx: -140, dy: -140, color: HC.red });
  // L6–L9: capas
  if (H.visible) {
    lab(wpL(L.mirror, -0.06, 0.03, 0), 'ESPEJO', 'CAPA FINÍSIMA: REBOTA LUZ', cw(t, K.espejo6 - 0.1, K.detras7 - 0.05), { dx: -120, dy: -150, color: HO });
    lab(wpL(L.tint, 0.05, 0.03, 0), 'LENTE', 'FRENA LA ULTRAVIOLETA', cw(t, K.lente7 - 0.1, K.polar8 - 0.05), { dx: 120, dy: -150, color: HV });
    lab(wpL(L.pol, -0.05, 0.035, 0), 'FILTRO POLARIZADO', 'REJILLA VERTICAL', cw(t, K.filtro8 - 0.1, K.final9 - 0.1), { dx: -110, dy: -170, color: HB });
    { const k = cw(t, K.reflejo8 - 0.05, K.filtro8b ?? K.final9); if (k > 0.01) { bigText('REFLEJO DEL HIELO', W / 2, Y + 20, 44, HC.white, k, { dark: 22 }); bigText('VIBRA EN HORIZONTAL  ⟷', W / 2, Y + 84, 38, HO, cw(t, K.horizontal8 - 0.1, K.final9 - 0.1), { glow: 14, dark: 22 }); } }
    { const k = cw(t, K.deja8 - 0.05, K.final9 - 0.05); if (k > 0.01) stamp('NO PASA', W / 2, Y + 170, k, HC.red, 84); }
    { const k = cw(t, K.aire9 - 0.15, K.color10 - 0.1); if (k > 0.01) { const a = wpL(L.tint, 0.0, -0.045, 0), b = wpL(L.inner, 0.0, -0.045, 0); dimV(proj(a), proj(b), 'AIRE', k, HB); } }
    lab(wpL(L.inner, 0.05, 0.03, 0), 'LENTE INTERIOR', 'NO SE EMPAÑA', cw(t, K.segunda9 - 0.05, K.color10 - 0.1), { dx: 120, dy: -150, color: HB });
  }
  // L10: categoría 3
  { const k = cw(t, K.categoria10 - 0.1, K.dias11 - 0.15); if (k > 0.01) { bigText('CATEGORÍA 3', W / 2, Y - 10, 92, HC.white, k, { dark: 30 }); bigText('PASA ENTRE EL 8 Y EL 18 % DE LA LUZ', W / 2, Y + 70, 30, HO, cw(t, K.dejan10 - 0.1, K.dias11 - 0.15), { glow: 12, dark: 20 }); bigText('PARA DÍAS DE SOL', W / 2, Y + 118, 22, HC.grey, k, { dark: 16 }); } }
  // L11: nublado → menos azul → relieve
  { const k = cw(t, K.nublados11 - 0.1, K.vuelves11 - 0.2); if (k > 0.01) { bigText('DÍA NUBLADO', W / 2, Y - 40, 60, HC.white, k, { dark: 26 }); specBar(W / 2 - 330, Y + 40, 660, 46, cw(t, K.frenan11 - 0.3, K.vuelves11 - 0.2), win(t, K.azul11 - 0.2, 0.5));
      bigText('EL AZUL ES LA LUZ QUE MÁS SE DISPERSA', W / 2, Y + 190, 26, HC.white, cw(t, K.dispersa11 - 0.3, K.vuelves11 - 0.2), { dark: 18 }); } }
  { const k = cw(t, K.relieve11 - 0.2, K.moda12 - 0.3); if (k > 0.01) bigText('RELIEVE', W / 2, Y + 60, 70, HO, k, { glow: 18, dark: 26 }); }
  // L12: duelo
  if (HP.duel.visible) { const k = cw(t, K.naranjas12 - 0.2, END - 0.7); lab(wpL(H, 0, -0.06, 0), 'NARANJA', null, k, { dx: 60, dy: 150, color: HO }); lab(wpL(HP.duel, 0, -0.06, 0), 'ESPEJO', null, cw(t, K.espejo12 - 0.2, END - 0.7), { dx: -60, dy: 150, color: HB }); }
}
