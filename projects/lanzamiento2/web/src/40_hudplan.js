// ---------------------------------------------------------------- HUD: cabecera, el botón «Sube la foto de tu producto», las pestañas de la web, el dedo y el cierre
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('TU PRODUCTO, EN 3D', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('SUBE UNA FOTO · GÍRALO CON EL DEDO', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('PRUÉBALO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('EL DOMINGO', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('CON EL TUYO', 1024, 178);
  const mk = win(t, K.comenta6, 0.3) * (1 - win(t, END - 1.2, 0.4));
  if (mk > 0.01) {
    const txt = 'COMENTA «KIRIA»', col = HG;
    hg.globalAlpha = mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
function camIcon(x, y, s, col) {
  hg.save(); hg.translate(x, y); hg.scale(s, s); hg.strokeStyle = col; hg.lineWidth = 3.4; hg.lineJoin = 'round';
  hg.beginPath(); hg.moveTo(-19, -8); hg.lineTo(-9, -8); hg.lineTo(-4, -15); hg.lineTo(6, -15); hg.lineTo(11, -8); hg.lineTo(19, -8); hg.lineTo(19, 14); hg.lineTo(-19, 14); hg.closePath(); hg.stroke();
  hg.beginPath(); hg.arc(0, 3, 6.5, 0, 7); hg.stroke(); hg.restore();
}
// el botón de la web «Sube la foto de tu producto» (se pulsa en «foto»)
function uploadBtn(t) {
  const k = cwin(t, K.subes3 - 0.05, TT.upIn - 0.05, 0.25, 0.25); if (k <= 0.01) return;
  const pr = t > K.foto3 - 0.02 && t < K.foto3 + 0.14 ? 0.94 : 1, s = pr * (0.85 + 0.15 * eo(clamp(k))), w = 660, h = 96;
  hg.save(); hg.globalAlpha = clamp(k); hg.translate(W / 2, 1650); hg.scale(s, s);
  const r = t - K.foto3; if (r > 0 && r < 0.5) { hg.save(); hg.globalAlpha *= 1 - r / 0.5; hg.strokeStyle = '#ff6b7d'; hg.lineWidth = 5; rr(hg, -w / 2 - 30 * r / 0.5, -h / 2 - 30 * r / 0.5, w + 60 * r / 0.5, h + 60 * r / 0.5, h / 2 + 30 * r / 0.5); hg.stroke(); hg.restore(); }
  hg.fillStyle = 'rgba(255,255,255,.96)'; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.fill();
  camIcon(-w / 2 + 70, 0, 1.25, '#0c0e14');
  hg.fillStyle = '#0c0e14'; hg.font = '800 33px Inter'; hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.fillText('Sube la foto de tu producto', -w / 2 + 112, 2);
  hg.restore();
}
// las pestañas de la web («Cómo lo presentamos»): la que suena, encendida
const TKEYS = ['caja', 'bolsa', 'tarro', 'botella', 'lata', 'taza'], TNAMES = ['Caja', 'Bolsa', 'Tarro', 'Botella', 'Lata', 'Taza'];
function tabsHud(t) {
  const k = cwin(t, TT.upIn - 0.1, K.en4 + 0.1, 0.3, 0.3); if (k <= 0.01) return;
  const i = seqIdx(t), act = i >= 1 && i <= 6 ? TKEYS.indexOf(SEQ[i].k) : -1, kAct = i >= 1 ? pop(t, SEQ[i].t - 0.02, 0.3) : 0;
  hg.save(); hg.globalAlpha = clamp(k);
  hfont(19); hg.letterSpacing = '4px'; hg.fillStyle = HC.grey; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText('CÓMO LO PRESENTAMOS', W / 2, 1596); hg.letterSpacing = '0px';
  hg.font = '800 29px Inter'; const ws = TNAMES.map(s => hg.measureText(s).width + 40), gap = 12, tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1); let x = W / 2 - tot / 2;
  TNAMES.forEach((s, j) => { const w = ws[j], on = j === act, sc = on ? 0.9 + 0.1 * kAct : 1;
    hg.save(); hg.translate(x + w / 2, 1658); hg.scale(sc, sc);
    hg.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.12)'; rr(hg, -w / 2, -30, w, 60, 30); hg.fill();
    if (on) { hg.save(); hg.globalAlpha *= 0.6 * (1 - clamp((t - SEQ[i].t) / 0.6)); hg.strokeStyle = '#ff6b7d'; hg.lineWidth = 4; rr(hg, -w / 2 - 6, -36, w + 12, 72, 36); hg.stroke(); hg.restore(); }
    hg.fillStyle = on ? '#0c0e14' : '#dfe4ee'; hg.font = '800 29px Inter'; hg.textAlign = 'center'; hg.fillText(s, 0, 2); hg.restore(); x += w + gap; });
  hg.restore();
}
// el dedo (un punto que toca la pantalla): gira el producto, pulsa «Añadir a la cesta» y «Sube la foto de tu producto»
function touchDot(t) {
  let P = null, a = 0, press = false, rip = -1;
  const A = v3(PEDW.x - 0.3, PEDW.y + 0.22, PEDW.z + 0.24), B = v3(PEDW.x + 0.3, PEDW.y + 0.25, PEDW.z + 0.24);
  if (t > TT.drag0 - 0.3 && t < TT.tap + 0.5) {
    if (t < TT.drag1 + 0.12) { const u = eio(clamp((t - TT.drag0) / (TT.drag1 - TT.drag0))); P = proj(A.clone().lerp(B, u)); a = clamp((t - TT.drag0 + 0.3) / 0.2); press = t > TT.drag0 - 0.05; }
    else { const u = eio(clamp((t - TT.drag1 - 0.12) / (TT.tap - 0.06 - TT.drag1 - 0.12))), Pa = proj(B), Pb = proj(scrWorld(BTN_SHOP.x, BTN_SHOP.y));
      P = { x: lerp(Pa.x, Pb.x, u), y: lerp(Pa.y, Pb.y, u) - Math.sin(u * Math.PI) * 50, ok: true }; a = 1 - clamp((t - TT.tap - 0.3) / 0.2); press = t > TT.tap - 0.06 && t < TT.tap + 0.12; rip = t - TT.tap; }
  } else if (t > TT.tapUp - 0.6 && t < TT.tapUp + 0.5) {
    const Pb = proj(scrWorld(BTN_UP.x, BTN_UP.y)), u = eio(clamp((t - TT.tapUp + 0.6) / 0.5));
    P = { x: Pb.x + 130 * (1 - u), y: Pb.y + 170 * (1 - u), ok: true }; a = clamp((t - TT.tapUp + 0.6) / 0.15) * (1 - clamp((t - TT.tapUp - 0.3) / 0.2)); press = t > TT.tapUp - 0.06 && t < TT.tapUp + 0.12; rip = t - TT.tapUp;
  }
  if (!P || a <= 0.01) return null;
  hg.save(); hg.globalAlpha = a;
  hg.fillStyle = 'rgba(255,255,255,.22)'; hg.beginPath(); hg.arc(P.x, P.y, 50, 0, 7); hg.fill();
  hg.fillStyle = 'rgba(255,255,255,.9)'; hg.shadowColor = 'rgba(0,0,0,.5)'; hg.shadowBlur = 14; hg.beginPath(); hg.arc(P.x, P.y, press ? 24 : 29, 0, 7); hg.fill(); hg.shadowBlur = 0;
  if (rip > 0 && rip < 0.5) { hg.globalAlpha = a * (1 - rip / 0.5); hg.strokeStyle = '#ffffff'; hg.lineWidth = 4; hg.beginPath(); hg.arc(P.x, P.y, 32 + 80 * rip / 0.5, 0, 7); hg.stroke(); }
  hg.restore(); return P;
}
function hudAt(t) {
  hudBegin(); hdr(t);
  // 2: «en 3D»
  if (S.kinds.tarro.visible && t < K.subes3) lab(wpo(S.carrier, 0, 0.97, 0), 'EN 3D', null, cw(t, K.d3_2 + 0.05, K.subes3 - 0.1), { dx: 140, dy: -170, color: HG });
  // 3: subir la foto y elegir cómo presentarlo
  uploadBtn(t); tabsHud(t);
  // 4: el dedo
  const P = touchDot(t);
  if (P) lab(P, 'GÍRALO CON EL DEDO', null, cw(t, K.giran4 + 0.1, K.antes4 + 0.05), { dx: 70, dy: -230, side: 1, size: 24, color: HC.white });
  // 5: ¿el tuyo?
  if (S.kinds.q.visible) lab(wpo(S.carrier, 0, 0.9, 0), 'EL TUYO', null, cw(t, K.tuyo5 + 0.12, K.comenta6 - 0.05), { dx: -140, dy: -60, side: -1, color: HG });
  // cierre: comenta KIRIA y te paso el enlace por privado
  { const k = cw(t, K.kiria6 + 0.45, TT.pedBack0 + 0.35); if (k > 0.01) {
      bigText('COMENTA «KIRIA»', W / 2, 1560, 66, HC.white, k, { glow: 12, type: false, dark: 26 });
      bigText('Y TE PASO EL ENLACE POR PRIVADO', W / 2, 1648, 30, HG, cw(t, K.paso6 - 0.05, TT.pedBack0 + 0.35), { dark: 18, ls: 4 }); } }
}
