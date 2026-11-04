// ---------------------------------------------------------------- HUD: cabecera con el precio pendiente (bucle abierto), rótulos con línea guía y el cierre «comenta KIRIA»
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('NI UNA SOLA CÁMARA', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('VÍDEOS EN 3D · HECHOS CON IA', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('VISUALIZACIONES', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('3,2 M', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('EN 7 DÍAS', 1024, 178);
  const mk = win(t, K.comenta11, 0.3) * (1 - win(t, END - 1.2, 0.4));
  if (mk > 0.01) {
    const txt = 'COMENTA «KIRIA»', col = HG, blink = false;
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
// anillo de cuenta atrás (1 minuto) alrededor de un punto de pantalla
function timerRing(P, r, k, u, txt) {
  if (k <= 0.01 || !P || !P.ok) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.strokeStyle = 'rgba(238,242,246,.25)'; hg.lineWidth = 6; hg.beginPath(); hg.arc(P.x, P.y, r, 0, 7); hg.stroke();
  glowStroke(HG, 7, 16); hg.beginPath(); hg.arc(P.x, P.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u)); hg.stroke(); noGlow();
  hfont(34); hg.letterSpacing = '4px'; hg.fillStyle = HG; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, P.x, P.y - r - 36); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  // 3: el gancho, en el primer segundo
  if (S.paper.visible) { const P = wpo(S.paper, -0.12, 0.43 - PL0 * 0.86 / 860, 0.03); lab(P, 'EL GANCHO', 'SEGUNDO 1', cw(t, K.desde3 + 0.15, K.una4 - 0.1), { dx: -130, dy: 230, color: HG }); }
  // 4: la voz
  lab(v3(0.46, 1.05, WKZ), 'VOZ', null, cw(t, K.voz4 - 0.02, K.cada5 - 0.05), { dx: 110, dy: 200, color: HD });
  // 5: el objeto en 3D
  if (S.gavel.pv.visible) lab(wpo(S.gavel.gv, -0.48, 0.0, 0.13), 'OBJETO EN 3D', null, cw(t, K.d3_5 + 0.05, K.que5 + 0.1), { dx: -120, dy: -200, color: HC.white });
  // cierre: comenta KIRIA (y el enlace con el 10 %)
  { const k = cw(t, K.kiria11 + 0.45, END - 1.0); if (k > 0.01) {
      bigText('COMENTA «KIRIA»', W / 2, 1540, 66, HC.white, k, { glow: 12, type: false, dark: 26 });
      bigText('Y TE ESCRIBIMOS POR PRIVADO', W / 2, 1628, 30, HG, cw(t, K.kiria11 + 0.75, END - 1.0), { dark: 18, ls: 4 }); } }
}
