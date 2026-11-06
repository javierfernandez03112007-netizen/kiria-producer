// ---------------------------------------------------------------- HUD: cabecera, la pregunta pendiente, rótulos con línea guía, la onda de la voz, el rebobinado y el cierre
function buildHudPlan() {}
const HG = '#FFC24A';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01 || !P) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function bracketMsg(t, txt, col, k, blink) {
  if (k <= 0.01) return; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = k; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
  hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
  hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
  hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); hg.restore();
}
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('VÍDEOS CON IA', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('PARA TU NEGOCIO · SIN CÁMARAS', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ESTUDIO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('KIRIAAI.COM', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ENLACE EN LA BIO', 1024, 178);
  hg.restore();
  bracketMsg(t, '¿QUÉ LO PARA?', HC.amber, win(t, K.pare2 + 0.15, 0.3) * (1 - win(t, TT.first, 0.2)), true);
  bracketMsg(t, 'EL PRIMER SEGUNDO', HG, win(t, TT.first + 0.1, 0.3) * (1 - win(t, END - 1.3, 0.3)), false);
}
const wpt = (x, y, z) => v3(x, y, z);
const scrPt = (cx, cy) => v3(scrX(cx), TOPY, scrZ(cy));
// el rebobinado: «◀◀» y rayas de cinta de vídeo
function rewindFx(t) {
  const k = cwin(t, TT.rw0 - 0.02, TT.rw1, 0.08, 0.12); if (k <= 0.01) return;
  hg.save(); hg.globalAlpha = k;
  for (let i = 0; i < 9; i++) { const y = ((hash(i * 7.7 + Math.floor(t * 30) * 0.37) * H) | 0), h = 4 + hash(i * 3.1 + t) * 22;
    hg.fillStyle = `rgba(230,240,255,${0.05 + 0.12 * hash(i * 5.3 + t * 2)})`; hg.fillRect(0, y, W, h); }
  hg.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 6) hg.fillRect(0, y, W, 2);
  hfont(130); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '0px'; hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.8)'; hg.shadowBlur = 20;
  hg.fillText('◀◀', W / 2, 1180); hfont(26); hg.letterSpacing = '6px'; hg.fillText('REBOBINANDO', W / 2, 1290);
  hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const st = sceneT(t);
  // 1: los productos pasan de largo y caen por el borde
  lab(wpt(0, TOPY, -1.56), 'PASAN DE LARGO', null, cw(t, K.y1 - 0.05, K.que2 + 0.1), { dx: -150, dy: -150, color: HC.red });
  // 2: el tarro se queda en el borde
  if (t < TT.rw0) lab(wpt(0, TOPY + 0.32, -1.5), 'SE PARA', null, cw(t, TT.stop + 0.08, K.mandanos3 - 0.05), { dx: 140, dy: -160, color: HG });
  // 3: la foto
  lab(wpt(0, TOPY, S.fotoFlatZ), 'TU FOTO', null, cw(t, TT.fotoLand + 0.05, K.convertimos4 - 0.05), { dx: 160, dy: -150, color: HC.white });
  // 4: 3D, luz, movimiento y voz
  if (S.jarC.visible && t < TT.rw0) {
    const jp = wpt(PEDP.x, PEDP.y + 0.48, PEDP.z);
    lab(S.jarC.position.clone().add(v3(0, 0.44, 0)), '3D', null, cw(t, K.d3_4 + 0.05, K.luz4 - 0.05), { dx: 140, dy: -170, color: HG });
    const L0 = S.lights[0]; if (L0.visible) lab(L0.userData.head.getWorldPosition(new THREE.Vector3()), 'LUZ', null, cw(t, K.luz4, K.movimiento4 - 0.05), { dx: 130, dy: -120, side: 1, color: HC.white });
    lab(jp, 'MOVIMIENTO', null, cw(t, K.movimiento4, K.voz4 - 0.05), { dx: 140, dy: -190, color: HC.white });
    const vk = cw(t, K.voz4 - 0.05, K.asi5 + 0.05);
    if (vk > 0.01) { const A = proj(wpt(PEDP.x - 0.5, PEDP.y + 0.05, PEDP.z + 0.42)), B = proj(wpt(PEDP.x + 0.5, PEDP.y + 0.05, PEDP.z + 0.42));
      waveform(A, B, 26 + 70 * voice(t), t, vk, HC.teal); lab(proj(wpt(PEDP.x + 0.5, PEDP.y + 0.05, PEDP.z + 0.42)), 'VOZ', null, vk, { dx: 60, dy: -140, color: HC.teal }); }
  }
  // 5: todos nuestros vídeos · la cámara que no existe
  if (t < TT.rw0) {
    { const k = cw(t, K.todos5 - 0.05, K.sin5 - 0.1); if (k > 0.01) { const a = proj(scrPt(10, 200)), b = proj(scrPt(BSCR.w - 10, 1300)); brackets({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, Math.abs(b.x - a.x), Math.abs(b.y - a.y), k, HG, 3);
      bigText('NUESTROS VÍDEOS', W / 2, 1600, 40, HG, k, { dark: 20, ls: 6 }); } }
    if (S.filmCam.visible) lab(S.filmCam.position.clone().add(v3(0.05, 0.7, 0)), 'CÁMARA', null, cw(t, TT.cam0 + 0.1, TT.camGone), { dx: 150, dy: -120, color: HC.white });
    { const k = cwin(t, TT.camGone + 0.05, K.y6 - 0.05, 0.15, 0.25); if (k > 0.01) stamp('0 CÁMARAS', W / 2, 1560, k, HC.red, 70); }
    // 6: el dato
    // 7: el primer segundo de la barra
    { const k = cw(t, TT.first + 0.05, TT.rw0); if (k > 0.01) { const one = (SCRUB.x1 - SCRUB.x0) / END; lab(scrPt(SCRUB.x0 + one / 2, SCRUB.y), '1.ER SEGUNDO', null, k, { dx: 120, dy: -230, color: HG }); } }
  }
  // 8: el rebobinado y «este»: el primer fotograma otra vez
  rewindFx(t);
  { const k = cw(t, TT.rw1 + 0.02, TT.cta0 + 0.3); if (k > 0.01) { brackets({ x: W / 2, y: 1060 }, 940, 1380, k, HG, 4);       // visor: este es el primer segundo
      hg.save(); hg.globalAlpha = clamp(k) * (Math.sin(t * 10) > -0.2 ? 1 : 0.35); hg.fillStyle = HC.red; hg.beginPath(); hg.arc(110, 425, 11, 0, 7); hg.fill(); hg.restore();
      bigText('0:00', 136, 427, 30, HC.white, k, { align: 'left', type: false, dark: 14, ls: 4 }); } }
  // 9: el cierre
  { const k = cw(t, K.kiriaaicom9 - 0.02, END - 0.6); if (k > 0.01) bigText('KIRIAAI.COM', W / 2, 1585, 74, HC.white, k, { glow: 14, type: false, dark: 26 }); }
  { const k = cw(t, K.enlace9 - 0.05, END - 0.6); if (k > 0.01) bigText('ENLACE EN LA BIO', W / 2, 1672, 32, HG, k, { dark: 18, ls: 6 }); }
}
