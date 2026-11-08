// ---------------------------------------------------------------- HUD: el truco pendiente (arriba a la derecha), la cuenta del vaso con su fuente, la bodega,
// las rondas numeradas, el medidor de sed, el anuncio frente a la tapa y la votación final
function buildHudPlan() {}
const HGd = '#FFC24A', HRd = '#FF5247', HGr = '#7CF0A9';
function lab(P, txt, sub, k, opt) { if (k <= 0.01 || !P) return; callout(P, txt, sub, k, { size: 27, subSize: 19, bg: true, ...opt }); }
function bracketMsg(t, txt, col, k, blink) {
  if (k <= 0.01) return; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = k; hfont(21); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
  hg.strokeStyle = col; hg.lineWidth = 1.6; hg.beginPath();
  hg.moveTo(x0 + 10, y - 24); hg.lineTo(x0, y - 24); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 24); hg.lineTo(x1, y - 24); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
  hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); hg.restore();
}
// cifra grande abajo (con subtítulo y fuente)
function bigFig(txt, sub, col, k, y = 1330) {
  if (k <= 0.01) return;
  bigText(txt, 540, y, 92, col, k, { glow: 18, dark: 22, ls: 6 });
  if (sub) bigText(sub, 540, y + 78, 30, HC.white, clamp(k * 1.2 - 0.15), { dark: 14, ls: 4 });
}
function srcLine(txt, k) {
  if (k <= 0.01) return;
  hg.save(); hg.globalAlpha = k * 0.85; hfont(17, false); hg.letterSpacing = '2px'; hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.fillStyle = HC.grey;
  const full = 'FUENTE: ' + txt, w = hg.measureText(full).width; if (w > 968) hfont(17 * 968 / w, false);      // nunca se sale por la derecha
  hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 6; hg.fillText(typed(full, clamp(k * 1.5)), 56, 1548); hg.restore();
}
function cross(P, k, s = 34) {
  if (k <= 0.01 || !P) return; const e = backOut(clamp(k / 0.5)), r = s * e;
  hg.save(); hg.globalAlpha = clamp(k * 3); glowStroke(HRd, 9, 18); hg.lineCap = 'round';
  hg.beginPath(); hg.moveTo(P.x - r, P.y - r); hg.lineTo(P.x + r, P.y + r); hg.moveTo(P.x + r, P.y - r); hg.lineTo(P.x - r, P.y + r); hg.stroke(); noGlow(); hg.restore();
}
function pollPills(t, k) {
  if (k <= 0.01) return;
  const items = [['GRANADA', '#62E3D4', 300], ['JAÉN', '#FFC24A', 780]], y = 1370;
  hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '5px';
  items.forEach(([txt, col, x], i) => {
    const kk = backOut(clamp((k - i * 0.15) / 0.5)), pulse = 1 + 0.03 * Math.sin(t * 7 + i * Math.PI);
    hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y); hg.scale(kk * pulse, kk * pulse);
    hfont(44); const w = hg.measureText(txt).width + 80, h = 96;
    hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.fill(); glowStroke(col, 4, 18); rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.stroke(); noGlow();
    hg.fillStyle = col; hg.fillText(txt, 0, 4); hg.restore();
  });
  hg.globalAlpha = clamp(k * 2); hfont(40); hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 10; hg.fillText('o', 540, y + 2);
  hg.restore();
}
const _hv = new THREE.Vector3();
function smallTag(P, txt, k, col = HC.white, size = 24) {
  if (k <= 0.01 || !P || !P.ok) return;
  hg.save(); hg.globalAlpha = clamp(k * 2); hfont(size); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.textBaseline = 'middle';
  const w = hg.measureText(txt).width + 26, h = size * 1.6; hg.fillStyle = 'rgba(0,0,0,.66)'; rr(hg, P.x - w / 2, P.y - h / 2, w, h, h / 2); hg.fill();
  hg.fillStyle = col; hg.fillText(txt, P.x, P.y + 1); hg.restore();
}
function thirst(t, k, lvl) {
  if (k <= 0.01) return;
  const x = 930, y0 = 1300, y1 = 760, w = 46;
  hg.save(); hg.globalAlpha = clamp(k * 2);
  hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, x - w / 2 - 10, y1 - 20, w + 20, y0 - y1 + 40, 18); hg.fill();
  hg.strokeStyle = 'rgba(238,242,246,.45)'; hg.lineWidth = 2; rr(hg, x - w / 2, y1, w, y0 - y1, 12); hg.stroke();
  const yy = lerp(y0, y1, clamp(lvl)); const gr = hg.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#62E3D4'); gr.addColorStop(1, '#FF5247');
  hg.save(); hg.beginPath(); rr(hg, x - w / 2, y1, w, y0 - y1, 12); hg.clip(); hg.fillStyle = gr; hg.fillRect(x - w / 2, yy, w, y0 - yy); hg.restore();
  hfont(22); hg.letterSpacing = '4px'; hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 8; hg.fillText('SED', x, y0 + 50);
  hg.restore();
}
function hudAt(t) {
  hudBegin();
  const cw2 = (t0, t1, fi = 0.22, fo = 0.22) => win(t, t0, fi) * (1 - win(t, t1, fo));
  // el truco, pendiente hasta la respuesta
  bracketMsg(t, 'EL TRUCO · ???', HC.amber, cw2(K.truco3 + 0.05, K.verdadero11, 0.3, 0.12), true);
  bracketMsg(t, 'EL TRUCO ↓', HGr, cw2(K.verdadero11, K.bar12 + 0.9, 0.12, 0.3), false);
  // 4-7: la cuenta en el vaso gigante
  if (S.big.visible) {
    const k = S.big.scale.x, Ly = i => { const L = S.layers[i].userData; return S.big.localToWorld(v3(0.3, L.y0 + L.h * 0.5, 0.25)); };
    lab(S.big.localToWorld(v3(0.0, BIGH + 0.04, 0)), '3 €', 'CAÑA CON TAPA EN GRANADA', cw2(K.n3_4 - 0.05, K.pero8, 0.25, 0.2) * clamp(k), { color: HC.white, dx: -120, dy: -90 });
    lab(Ly(0), 'IVA · 0,27 €', 'EL 10 % DE LA HOSTELERÍA', cw2(K.n27_5, K.pero8, 0.25, 0.2) * clamp(k), { color: HC.grey, subCol: HC.white, dx: 150, dy: 60 });
    lab(Ly(1), 'CERVEZA · ≈ 0,50 €', 'LO QUE LE CUESTA AL BAR', cw2(TT.beer + 0.2, K.pero8, 0.25, 0.2) * clamp(k), { color: HGd, dx: 150, dy: -10 });
    lab(Ly(2), 'QUEDAN · 2,23 €', 'PARA TODO LO DEMÁS', cw2(K.quedan7 + 0.2, K.pero8, 0.25, 0.2) * clamp(k), { color: '#3FC58F', dx: 150, dy: -110 });
    ['TAPA', 'LOCAL', 'SUELDOS', 'GANAR'].forEach((txt, i) => { const ic = S.icons[i]; if (!ic.visible) return; ic.getWorldPosition(_hv); _hv.y -= 0.16; smallTag(proj(_hv), txt, cw2(TT.icons[i] + 0.15, K.pero8, 0.2, 0.2), i === 3 ? HGd : HC.white); });
  }
  srcLine('GUÍAS DE GRANADA · LEY DEL IVA (10 %) · CERVEZA: ESTIMACIÓN DEL SECTOR', cw2(K.n3_4, K.pero8));
  // 6: la bodega
  { const kg = S.kegs[2]; kg.getWorldPosition(_hv); _hv.y += 0.62; lab(_hv.clone(), 'UN BARRIL DE 30 LITROS', '≈ 150 CAÑAS · ≈ 0,50 € CADA UNA', cw2(K.cerveza6 + 0.6, K.quedan7 - 0.25), { color: HGd, dx: -130, dy: -150 }); }
  // 8-9: las rondas, numeradas
  const rk = [S.hero, ...S.rounds.map(r => r.c)];
  rk.forEach((c, i) => { if (!c.visible) return; c.getWorldPosition(_hv); _hv.y += 0.2; const t0 = i === 0 ? K.primera8 : TT.rounds[i - 1] + 0.15;
    smallTag(proj(_hv), (i + 1) + '.ª', cw2(t0, K.pero11, 0.2, 0.25), i === 0 ? HC.white : HGd, 26); });
  // 10: la sed sube con la sal y baja cuando llega otra caña
  const lv = clamp((t - TT.salt) / (TT.drink - TT.salt)) * 0.92 * (1 - eio(clamp((t - TT.coins) / 0.4)) * 0.85);
  thirst(t, cw2(TT.salt + 0.1, K.pero11 - 0.05, 0.25, 0.25), lv);
  // 12-13: la tapa es el anuncio; el anuncio de pago, apagado
  if (S.ring.visible) { lab(SIGNP.clone().add(v3(0.55, -0.1, 0.1)), 'SU ANUNCIO', 'SE SIRVE EN UN PLATO', cw2(K.anuncio12, K.negocio14 - 0.1), { color: HGd, dx: 150, dy: 160 }); }
  { S.adFace.getWorldPosition(_hv); lab(_hv.clone().add(v3(0.0, 0.7, 0)), 'PUBLICIDAD', 'SE PAGA', cw2(K.publicidad13 + 0.05, K.negocio14 - 0.1), { color: HC.grey, subCol: HC.white, dx: -110, dy: -140 }); }
  // 15: ¿Granada o Jaén?
  pollPills(t, cw2(K.granada15 - 0.05, END - 0.35, 0.35, 0.3));
}
