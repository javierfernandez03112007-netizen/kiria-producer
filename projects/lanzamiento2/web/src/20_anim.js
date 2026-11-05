// ---------------------------------------------------------------- tiempos y animación (todo es función del instante t: se puede dibujar en cualquier orden)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };     // como la web al cambiar de presentación
const ZS0 = 0.15;                                    // relieve del tarro dentro de la foto en el primer (y último) fotograma
let TT = {}, SEQ = [];
function buildTimes() {
  TT = {
    inflate1: K.foto1 + 0.05,                        // el tarro termina de salir del papel («foto»)
    pedUp: K.una1, detach: K.foto1 + 0.12, land: K.es2 + 0.02,       // la peana sube del suelo; el tarro salta de la foto a la peana
    whip: K.d3_2,                                    // «3D»: vuelta entera
    dev0: K.subes3 + 0.05, dev1: K.foto3 + 0.12, fly0: K.foto3 + 0.18, upIn: K.ves3 + 0.12,   // la polaroid revela las fresas y se mete en la peana
    toWeb0: K.en4 - 0.15, toWeb1: K.web4 + 0.35, phone0: K.en4 - 0.2, phone1: K.en4 + 0.42,  // el móvil sube; la peana se pone delante de la pantalla
    drag0: K.giran4 + 0.02, drag1: K.dedo4 + 0.2, tap: K.comprarlo4 + 0.12,                    // se gira con el dedo; «Añadir a la cesta»
    reel: K.y4 + 0.05, heart: K.redes4 + 0.02,       // en redes
    tryP: K.el5 - 0.1, cal: K.domingo5 - 0.02, tapUp: K.probarlo5 + 0.15,                     // el domingo: «Pruébalo con el tuyo»
    com: K.comenta6 - 0.05, dm: K.privado6 - 0.05, plane0: K.paso6 - 0.05, plane1: K.privado6 + 0.25,
    back0: K.privado6 + 1.3, pedBack0: K.privado6 + 1.2, pedBack1: K.privado6 + 1.95, phoneDown0: K.privado6 + 1.25, phoneDown1: K.privado6 + 1.9,
    fotoUp0: K.privado6 + 1.5, fotoUp1: K.privado6 + 2.05, jarIn0: END - 1.55, jarIn1: END - 0.55, pedDown0: END - 0.85, pedDown1: END - 0.4,
  };
  // presentaciones (cada una sustituye a la anterior como en la web: la vieja se encoge en 0,26 s y la nueva crece en 0,62 s)
  SEQ = [{ k: 'tarro', t: -1e9 }, { k: 'caja', t: K.caja3 + 0.05 }, { k: 'bolsa', t: K.bolsa3 + 0.05 }, { k: 'tarro', t: K.tarro3 + 0.05 }, { k: 'botella', t: K.botella3 + 0.05 },
    { k: 'lata', t: K.lata3 + 0.05 }, { k: 'taza', t: K.taza3 + 0.05 }, { k: 'tarro', t: K.web4 - 0.05 }, { k: 'q', t: K.tuyo5 + 0.03 }, { k: null, t: K.comenta6 + 0.05 }, { k: 'tarro', t: TT.back0 }];
}
function seqOffsets() {          // cada presentación aparece mirando a la cámara (un poco de lado, como el «FRONT» de la web)
  SEQ.forEach((s, i) => { if (i === 0) { s.off = 0; return; } const tt = s.t + 0.35, c = camAt(tt), pp = pedPose(tt).p;
    s.off = Math.atan2(c.p.x - pp.x, c.p.z - pp.z) - spinAt(tt) + (s.k === 'q' ? 0 : -0.32); });
}
function seqIdx(t) { let i = 0; for (let j = 1; j < SEQ.length; j++) if (t >= SEQ[j].t) i = j; return i; }
function spinAt(t) { return 0.55 * Math.max(0, t - 0.25) + 2 * Math.PI * eio(clamp((t - TT.whip) / 0.75)) + 1.5 * Math.PI * eio(clamp((t - TT.drag0) / (TT.drag1 - TT.drag0))); }

// ---------------------------------------------------------------- poses: peana, soporte del producto (foto ↔ peana), móvil y polaroid
function pedPose(t) {
  const hid = -PED_H - 0.03; let p = PED0.clone(), s = 1, vis = true;
  if (t < TT.pedUp) { p.y = hid; vis = false; }
  else if (t < TT.pedUp + 0.38) p.y = lerp(hid, 0, backOut((t - TT.pedUp) / 0.38));
  else if (t >= TT.toWeb0 && t < TT.toWeb1) { const e = eio((t - TT.toWeb0) / (TT.toWeb1 - TT.toWeb0)); p.lerp(PEDW, e); p.y += Math.sin(e * Math.PI) * 0.12; s = lerp(1, PEDW_S, e); }
  else if (t >= TT.toWeb1 && t < TT.pedBack0) { p.copy(PEDW); s = PEDW_S; p.y += 0.008 * Math.sin((t - TT.toWeb1) * 2.1); }
  else if (t >= TT.pedBack0 && t < TT.pedBack1) { const e = eio((t - TT.pedBack0) / (TT.pedBack1 - TT.pedBack0)); p.copy(PEDW).lerp(PED0, e); p.y += Math.sin(e * Math.PI) * 0.1; s = lerp(PEDW_S, 1, e); }
  else if (t >= TT.pedDown0) { const u = clamp((t - TT.pedDown0) / (TT.pedDown1 - TT.pedDown0)); p.y = lerp(0, hid, u * u); vis = u < 1; }
  return { p, s, vis };
}
const _qa = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
function photoPose(zs, outP, outQ) {
  S.foto.tilt.updateWorldMatrix(true, false);
  outP.set(0, FOTO_FLOOR, FOTO.d / 2 + 0.0015 + JAR_R * zs).applyMatrix4(S.foto.tilt.matrixWorld); S.foto.tilt.getWorldQuaternion(outQ);
}
function bez(p0, p1, p2, p3, u, out) { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(p0, v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); }
function inPhotoK(t) { return t < TT.detach ? 1 : t < TT.jarIn0 ? 1 - clamp((t - TT.detach) / 0.3) : clamp((t - TT.jarIn1 + 0.3) / 0.3); }
function carrierAt(t) {
  const C = S.carrier, pp = pedPose(t), top = v3(pp.p.x, pp.p.y + PED_H * pp.s, pp.p.z), ps = PS * pp.s;
  if (t < TT.detach || t >= TT.jarIn1) {
    const zs = t < TT.detach ? lerp(ZS0, 1, eio(clamp(t / TT.inflate1))) : ZS0;
    photoPose(zs, C.position, C.quaternion); C.scale.set(PS, PS, PS * zs);
  } else if (t < TT.land) {
    const e = eio((t - TT.detach) / (TT.land - TT.detach)); photoPose(1, _pa, _qa);
    bez(_pa, _pa.clone().add(v3(0, 0.22, 0.3)), top.clone().add(v3(0, 0.4, 0)), top, e, C.position); C.quaternion.copy(_qa).slerp(_qi, e); C.scale.setScalar(PS);
  } else if (t < TT.jarIn0) {
    C.position.copy(top); C.quaternion.identity(); C.scale.setScalar(ps);
    const b = t - TT.land; if (b > 0 && b < 0.42) { const sq = 0.12 * Math.sin(b / 0.42 * Math.PI) * (1 - b / 0.42); C.scale.set(ps * (1 + sq * 0.5), ps * (1 - sq), ps * (1 + sq * 0.5)); }
  } else {
    const e = eio((t - TT.jarIn0) / (TT.jarIn1 - TT.jarIn0)), zs = lerp(1, ZS0, e); photoPose(zs, _pb, _qa);
    bez(top, top.clone().add(v3(0, 0.4, 0)), _pb.clone().add(v3(0, 0.22, 0.3)), _pb, e, C.position); C.quaternion.identity().slerp(_qa, e); C.scale.set(lerp(ps, PS, e), lerp(ps, PS, e), lerp(ps, PS * zs, e));
  }
}
function phoneY(t) {
  if (t < TT.phone0 || t >= TT.phoneDown1) return -2;
  if (t < TT.phone1) return lerp(-1.0, PHN.y, backOut((t - TT.phone0) / (TT.phone1 - TT.phone0)));
  if (t >= TT.phoneDown0) { const u = (t - TT.phoneDown0) / (TT.phoneDown1 - TT.phoneDown0); return lerp(PHN.y, -1.0, u * u); }
  return PHN.y + 0.01 * Math.sin((t - TT.phone1) * 1.7);
}

// ---------------------------------------------------------------- la pantalla del móvil (lienzo 2D): tienda online, vídeo en redes, «pruébalo con el tuyo», comentarios y mensaje
function statusBar(g, dark = true) {
  g.fillStyle = dark ? '#ffffff' : '#111111'; g.font = '700 30px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('9:41', 40, 44);
  rr(g, SCR.w - 92, 30, 52, 26, 7); g.lineWidth = 3; g.strokeStyle = g.fillStyle; g.stroke(); g.fillRect(SCR.w - 88, 34, 38, 18);
  g.fillStyle = '#000000'; rr(g, SCR.w / 2 - 70, 18, 140, 44, 22); g.fill();
}
function icons(g, a = 1, liked = false) {      // iconos genéricos de un vídeo vertical (sin logotipos): me gusta, comentar, enviar
  g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round'; const x = SCR.w - 58; let y = SCR.h - 430;
  g.beginPath(); g.moveTo(x, y + 18); g.bezierCurveTo(x - 34, y - 6, x - 22, y - 34, x, y - 16); g.bezierCurveTo(x + 22, y - 34, x + 34, y - 6, x, y + 18);
  if (liked) { g.fillStyle = '#ff4d61'; g.fill(); } else g.stroke();
  y += 92; g.beginPath(); g.arc(x, y, 22, 0.4, Math.PI * 2 - 0.1); g.lineTo(x + 26, y + 24); g.closePath(); g.stroke();
  y += 92; g.beginPath(); g.moveTo(x - 24, y - 6); g.lineTo(x + 24, y - 22); g.lineTo(x + 8, y + 24); g.lineTo(x - 2, y + 2); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(46, SCR.h - 196, 22, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 24px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('@tumarca', 82, SCR.h - 196);
  g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, 30, SCR.h - 158, 330, 18, 9); g.fill(); rr(g, 30, SCR.h - 128, 220, 18, 9); g.fill();
  g.restore();
}
function browserBar(g, url, cart = 0) {
  g.fillStyle = '#1a1f2c'; rr(g, 16, 82, SCR.w - 32, 60, 30); g.fill();
  g.strokeStyle = '#8f98ab'; g.lineWidth = 3; g.beginPath(); g.arc(50, 108, 7, Math.PI, 0); g.stroke(); g.fillStyle = '#8f98ab'; rr(g, 40, 108, 20, 15, 3); g.fill();
  g.fillStyle = '#c3cad8'; g.font = '600 23px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(url, 74, 113);
  if (cart > 0) { const x = SCR.w - 62, y = 112; g.strokeStyle = '#ffffff'; g.lineWidth = 3.5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - 16, y - 12); g.lineTo(x - 10, y - 12); g.lineTo(x - 4, y + 8); g.lineTo(x + 14, y + 8); g.lineTo(x + 18, y - 6); g.lineTo(x - 7, y - 6); g.stroke();
    g.beginPath(); g.arc(x - 1, y + 15, 3, 0, 7); g.arc(x + 11, y + 15, 3, 0, 7); g.fillStyle = '#ffffff'; g.fill();
    const k = pop(cart, 0, 0.35); if (k > 0.01) { g.save(); g.translate(x + 16, y - 15); g.scale(k, k); g.fillStyle = '#7cf0a9'; g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fill(); g.fillStyle = '#0c0e14'; g.font = '900 17px Inter'; g.textAlign = 'center'; g.fillText('1', 0, 1); g.restore(); } }
}
function stageBg(g, sx, sy, sw, sh) {     // el degradado del visor de la web
  g.save(); rr(g, sx, sy, sw, sh, 26); g.clip();
  let gr = g.createRadialGradient(SCR.w / 2, sy, 0, SCR.w / 2, sy, sh * 1.1); gr.addColorStop(0, '#1b2133'); gr.addColorStop(1, '#0b0d14'); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
  gr = g.createRadialGradient(SCR.w / 2, sy + sh * 0.66, 0, SCR.w / 2, sy + sh * 0.66, sw * 0.62); gr.addColorStop(0, 'rgba(180,92,255,0.28)'); gr.addColorStop(1, 'rgba(180,92,255,0)'); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
  g.restore();
}
const BTN_SHOP = { x: SCR.w / 2, y: 1003 }, BTN_UP = { x: SCR.w / 2, y: 1003 };     // centros de los botones (para el dedo)
function drawShop(g, t) {
  g.fillStyle = '#0c0e14'; g.fillRect(0, 0, SCR.w, SCR.h); statusBar(g, true); browserBar(g, 'tumarca.es/tienda/fresa', t > TT.tap ? t - TT.tap : 0);
  const sx = 16, sy = 158, sw = SCR.w - 32, sh = 650; stageBg(g, sx, sy, sw, sh);
  g.fillStyle = 'rgba(255,255,255,.1)'; rr(g, 34, 176, 128, 40, 20); g.fill(); g.fillStyle = '#e3e8f3'; g.font = '700 20px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Vista 3D', 98, 197);
  const hk = 1 - cwin(t, TT.drag0 - 0.3, TT.drag1 + 0.1, 0.2, 0.3); if (hk > 0.01) { g.globalAlpha = hk; g.fillStyle = 'rgba(220,226,240,.75)'; g.font = '600 21px Inter'; g.fillText('↔  Arrastra para girarlo', SCR.w / 2, sy + sh - 34); g.globalAlpha = 1; }
  g.textAlign = 'left'; g.fillStyle = '#8d96a8'; g.font = '700 21px SpaceMono'; g.letterSpacing = '3px'; g.fillText(BRAND, 34, 852); g.letterSpacing = '0px';
  g.fillStyle = '#ffffff'; g.font = '900 52px Inter'; g.fillText(PNAME, 34, 902);
  const added = t > TT.tap, pr = t > TT.tap - 0.06 && t < TT.tap + 0.12 ? 0.96 : 1;
  g.save(); g.translate(BTN_SHOP.x, BTN_SHOP.y); g.scale(pr, pr); g.fillStyle = added ? '#7cf0a9' : '#ffffff'; rr(g, -(SCR.w - 60) / 2, -43, SCR.w - 60, 86, 43); g.fill();
  g.fillStyle = '#0c0e14'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.fillText(added ? '✓  En la cesta' : 'Añadir a la cesta', 0, 2); g.restore();
  g.fillStyle = 'rgba(255,255,255,.16)'; rr(g, 34, 1076, 380, 16, 8); g.fill(); rr(g, 34, 1106, 300, 16, 8); g.fill();
}
function drawReel(g, t) {
  const gr = g.createRadialGradient(SCR.w / 2, SCR.h * 0.45, 30, SCR.w / 2, SCR.h * 0.45, SCR.h * 0.68); gr.addColorStop(0, '#ffe4e1'); gr.addColorStop(0.5, '#f2808b'); gr.addColorStop(1, '#6e1424');
  g.fillStyle = gr; g.fillRect(0, 0, SCR.w, SCR.h);
  g.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + t * 0.15; g.beginPath(); g.moveTo(SCR.w / 2, SCR.h * 0.55); g.arc(SCR.w / 2, SCR.h * 0.55, SCR.h, a, a + 0.12); g.closePath(); g.fill(); }
  g.fillStyle = '#ffffff'; g.font = '900 48px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NUEVO', SCR.w / 2, 196);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 24px Inter'; g.fillText(PNAME.toUpperCase() + ' · ' + BRAND, SCR.w / 2, 244);
  const gr2 = g.createLinearGradient(0, SCR.h * 0.74, 0, SCR.h); gr2.addColorStop(0, 'rgba(0,0,0,0)'); gr2.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = gr2; g.fillRect(0, 0, SCR.w, SCR.h);
  icons(g, 1, t > TT.heart); statusBar(g, true);
  const hk = clamp((t - TT.heart) / 0.55); if (hk > 0 && hk < 1) { g.save(); g.globalAlpha = 1 - hk * hk; g.translate(SCR.w / 2, SCR.h * 0.3); g.scale(0.5 + hk, 0.5 + hk); g.fillStyle = '#ff4d61';
    g.beginPath(); g.moveTo(0, 60); g.bezierCurveTo(-120, -20, -60, -110, 0, -50); g.bezierCurveTo(60, -110, 120, -20, 0, 60); g.fill(); g.restore(); }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, SCR.h - 8, SCR.w, 4); g.fillStyle = '#ffffff'; g.fillRect(0, SCR.h - 8, SCR.w * clamp((t - TT.reel) / 2.4), 4);
}
const TABS = ['Caja', 'Bolsa', 'Tarro', 'Botella', 'Lata', 'Taza', 'Foto en 3D'];
function drawTry(g, t) {      // el apartado «¿Vendes productos?» de kiriaai.com: el visor arriba y «Pruébalo con el tuyo» abajo
  g.fillStyle = '#0c0e14'; g.fillRect(0, 0, SCR.w, SCR.h); statusBar(g, true); browserBar(g, '••••••••.com');      // la dirección no se enseña hasta el domingo 8 a las 12:00 (Javi, 5-11-2026)
  stageBg(g, 16, 158, SCR.w - 32, 650);
  g.fillStyle = 'rgba(255,255,255,.1)'; rr(g, 34, 176, 128, 40, 20); g.fill(); g.fillStyle = '#e3e8f3'; g.font = '700 20px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Vista 3D', 98, 197);
  g.fillStyle = '#ff6b7d'; g.font = '700 19px SpaceMono'; g.letterSpacing = '3px'; g.textAlign = 'left'; g.fillText('¿VENDES PRODUCTOS?', 34, 850); g.letterSpacing = '0px';
  g.fillStyle = '#ffffff'; g.font = '900 44px Inter'; g.fillText('Pruébalo con el tuyo', 34, 902);
  const pulse = t > TT.cal ? 0.5 + 0.5 * Math.sin((t - TT.cal) * 7) : 0, pressed = t > TT.tapUp - 0.05 && t < TT.tapUp + 0.12 ? 0.95 : 1;
  g.save(); g.translate(BTN_UP.x, BTN_UP.y); g.scale(pressed, pressed);
  if (t > TT.cal) { g.save(); g.globalAlpha = 0.35 + 0.5 * pulse; g.strokeStyle = '#ff4d61'; g.lineWidth = 5; g.shadowColor = '#ff4d61'; g.shadowBlur = 22; rr(g, -(SCR.w - 60) / 2 - 6, -43 - 6, SCR.w - 48, 98, 49); g.stroke(); g.restore(); }
  g.fillStyle = t > TT.tapUp ? '#ffe3e6' : '#ffffff'; rr(g, -(SCR.w - 60) / 2, -43, SCR.w - 60, 86, 43); g.fill();
  g.strokeStyle = '#0c0e14'; g.lineWidth = 3.5; g.lineJoin = 'round'; const cx = -178; g.beginPath(); g.moveTo(cx - 18, -8); g.lineTo(cx - 8, -8); g.lineTo(cx - 3, -15); g.lineTo(cx + 7, -15); g.lineTo(cx + 12, -8); g.lineTo(cx + 20, -8); g.lineTo(cx + 20, 14); g.lineTo(cx - 18, 14); g.closePath(); g.stroke();
  g.beginPath(); g.arc(cx + 1, 3, 6, 0, 7); g.stroke();
  g.fillStyle = '#0c0e14'; g.font = '800 26px Inter'; g.textAlign = 'left'; g.fillText('Sube la foto de tu producto', cx + 36, 2); g.restore();
  g.fillStyle = 'rgba(255,255,255,.16)'; rr(g, 34, 1076, 380, 16, 8); g.fill(); rr(g, 34, 1106, 300, 16, 8); g.fill();
}
function drawComments(g, t, k, typed, posted) {
  drawReel(g, t); g.fillStyle = `rgba(0,0,0,${0.45 * k})`; g.fillRect(0, 0, SCR.w, SCR.h);
  const top = SCR.h - (SCR.h * 0.62) * eo(k); g.save(); g.fillStyle = '#16181d'; rr(g, 0, top, SCR.w, SCR.h, 34); g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, SCR.w / 2 - 40, top + 18, 80, 8, 4); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Comentarios', SCR.w / 2, top + 66);
  let y = top + 130;
  if (posted > 0) { g.globalAlpha = posted; g.fillStyle = '#9aa1ab'; g.beginPath(); g.arc(56, y + 10, 24, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; rr(g, 96, y - 8, 140, 14, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 38px Inter'; g.textAlign = 'left'; g.fillText('KIRIA', 96, y + 26); g.globalAlpha = 1; y += 100; }
  for (let i = 0; i < 3; i++) { g.fillStyle = '#3a3f49'; g.beginPath(); g.arc(56, y + 10, 24, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, 96, y - 6, 120 + 60 * hash(i), 14, 7); g.fill(); rr(g, 96, y + 20, 260 + 90 * hash(i + 5), 14, 7); g.fill(); y += 96; }
  const iy = SCR.h - 120; g.fillStyle = '#23262d'; rr(g, 24, iy, SCR.w - 140, 76, 38); g.fill();
  g.font = '900 36px Inter'; g.textAlign = 'left'; g.fillStyle = typed ? '#ffffff' : 'rgba(255,255,255,.4)'; g.fillText(typed || 'Añade un comentario…', 54, iy + 40);
  if (typed && Math.sin(t * 12) > 0) { const tw = g.measureText(typed).width; g.fillStyle = '#ffffff'; g.fillRect(58 + tw, iy + 20, 3, 40); }
  g.fillStyle = typed ? '#ffffff' : '#3a3f49'; g.beginPath(); g.arc(SCR.w - 66, iy + 38, 36, 0, 7); g.fill();
  g.fillStyle = typed ? '#111' : '#777'; g.beginPath(); g.moveTo(SCR.w - 82, iy + 50); g.lineTo(SCR.w - 66, iy + 22); g.lineTo(SCR.w - 50, iy + 50); g.closePath(); g.fill();
  g.restore();
}
function drawDM(g, t, k) {
  g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, SCR.w, SCR.h); statusBar(g, true);
  g.save(); g.globalAlpha = k; g.fillStyle = '#16181d'; g.fillRect(0, 76, SCR.w, 96); g.fillStyle = '#3a3f49'; g.beginPath(); g.arc(70, 124, 30, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Mensajes', 116, 124);
  g.fillStyle = '#ffffff'; rr(g, SCR.w - 220, 230, 190, 70, 35); g.fill(); g.fillStyle = '#111317'; g.font = '900 32px Inter'; g.textAlign = 'center'; g.fillText('KIRIA', SCR.w - 125, 266);
  const m = win(t, K.privado6 - 0.05, 0.3); if (m > 0) { g.globalAlpha = k * m; const y = 340 + 30 * (1 - eo(m));
    g.fillStyle = '#23262d'; rr(g, 30, y, 400, 92, 30); g.fill(); g.fillStyle = '#ffffff'; g.font = '700 28px Inter'; g.textAlign = 'left'; g.fillText('¡Aquí tienes el enlace!', 58, y + 46);
    g.fillStyle = '#23262d'; rr(g, 30, y + 112, 440, 170, 26); g.fill(); g.fillStyle = '#7cf0a9'; rr(g, 54, y + 136, 120, 120, 20); g.fill();
    g.strokeStyle = '#0b0c0f'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.arc(98, y + 196, 22, 0.6, 3.9); g.stroke(); g.beginPath(); g.arc(130, y + 196, 22, 3.75, 7.05); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.fillText('Enlace', 196, y + 180); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '600 22px Inter'; g.fillText('Toca para abrir', 196, y + 222); }
  g.restore();
}
function drawScreen(t) {
  const g = S.scrT.userData.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const swipe = (t0, fa, fb) => { const u = eio(clamp((t - t0) / 0.3)); if (u < 1) { g.save(); g.translate(0, -u * SCR.h); fa(); g.restore(); g.save(); g.translate(0, (1 - u) * SCR.h); fb(); g.restore(); } else fb(); };
  if (t < TT.reel) drawShop(g, t);
  else if (t < TT.tryP) swipe(TT.reel, () => drawShop(g, t), () => drawReel(g, t));
  else if (t < TT.com) swipe(TT.tryP, () => drawReel(g, t), () => drawTry(g, t));
  else if (t < TT.dm) { const typed = 'KIRIA'.slice(0, clamp(Math.floor((t - K.kiria6) / 0.09) + 1, 0, 5) * (t >= K.kiria6 ? 1 : 0)), posted = win(t, K.kiria6 + 0.6, 0.25);
    if (t < TT.com + 0.3) { drawTry(g, t); const k = win(t, TT.com, 0.3); g.fillStyle = `rgba(0,0,0,${k})`; g.fillRect(0, 0, SCR.w, SCR.h); if (k > 0.5) drawComments(g, t, (k - 0.5) * 2, '', 0); }
    else drawComments(g, t, 1, posted > 0.5 ? '' : typed, posted); }
  else drawDM(g, t, win(t, TT.dm, 0.2));
  const on = win(t, TT.phone0 + 0.1, 0.3); if (on < 1) { g.fillStyle = `rgba(0,0,0,${1 - on})`; g.fillRect(0, 0, SCR.w, SCR.h); }
  g.restore(); S.scrT.needsUpdate = true;
}
function scrWorld(cx, cy) { S.phone.updateWorldMatrix(true, false); return v3((cx / SCR.w - 0.5) * PHN.sw, (0.5 - cy / SCR.h) * PHN.sh, PHN.d / 2 + 0.002).applyMatrix4(S.phone.matrixWorld); }

// ---------------------------------------------------------------- todo en el instante t
const _o = new THREE.Object3D();
function flashK(t) { let f = 0; for (const te of [TT.land, TT.whip, TT.upIn, ...SEQ.slice(1).map(s => s.t), TT.tapUp]) if (t > te) f += Math.exp(-(t - te) / 0.25); return Math.min(1.5, f); }
function stageAt2(t) {
  // polaroid: en su soporte; revela las fresas y vuela a la peana («Subes una foto»); al final sube del suelo, vacía
  { const R = S.foto.root; let vis = true, k = 0; R.position.set(0, 0, 0); R.rotation.set(0, 0, 0); R.scale.setScalar(1);
    if (t >= TT.dev0 && t < TT.upIn) k = clamp((t - TT.dev0) / (TT.dev1 - TT.dev0));
    if (t >= TT.fly0 && t < TT.upIn) { const u = (t - TT.fly0) / (TT.upIn - TT.fly0), e = eio(u), pp = pedPose(t).p, tg = v3(pp.x, PED_H * 0.6, pp.z + PED_R * 0.9);
      bez(v3(0, 0, 0), v3(0, 0.5, 0.15), tg.clone().add(v3(0, 0.55, 0.1)), tg, e, R.position); R.rotation.set(-1.25 * e, 0.5 * Math.sin(e * Math.PI), 0); R.scale.setScalar(Math.max(0.001, lerp(1, 0.1, e * e))); }
    else if (t >= TT.upIn && t < TT.fotoUp0) vis = false;
    else if (t >= TT.fotoUp0 && t < TT.fotoUp1) R.position.y = lerp(-1.1, 0, backOut((t - TT.fotoUp0) / (TT.fotoUp1 - TT.fotoUp0)));
    R.visible = vis; drawFoto(k);
    S.foto.sh.material.opacity = inPhotoK(t); S.foto.sh.visible = S.foto.sh.material.opacity > 0.01; }
  // peana
  { const pp = pedPose(t), P = S.ped; P.g.visible = pp.vis; P.g.position.copy(pp.p); P.g.scale.setScalar(pp.s); P.turn.rotation.y = spinAt(t);
    const fl = flashK(t); P.halo.material.opacity = 0.85 + fl * 0.4; P.ring.material.color.setScalar(1.5 + fl * 1.2);
    P.rips.forEach(r => { const u = (t * 0.3 + r.ph) % 1; r.m.scale.setScalar(0.36 + 0.71 * u); r.m.material.opacity = (0.42 + fl * 0.6) * Math.pow(1 - u, 1.6) * Math.min(1, u / 0.08); }); }
  // el producto (presentación actual y la anterior que se encoge) en su soporte
  carrierAt(t); S.spin.rotation.y = spinAt(t);
  { const i = seqIdx(t), cur = SEQ[i], prev = i > 0 ? SEQ[i - 1] : null;
    for (const k of KINDS) S.kinds[k].visible = false;
    const put = (s, sc) => { if (!s.k || sc <= 0.001) return; const o = S.kinds[s.k]; o.visible = true; o.scale.setScalar(Math.max(0.001, sc)); o.rotation.y = s.off; };
    put(cur, i === 0 ? 1 : backOut((t - cur.t) / 0.62));
    if (prev && t - cur.t < 0.26 && prev.k !== cur.k) put(prev, 1 - ((t - cur.t) / 0.26) ** 2);
    if (cur.k === 'tarro' && i === SEQ.length - 1 && t > TT.jarIn0) {      // vuelta a la foto: de frente (un múltiplo de vuelta entera)
      const y0 = spinAt(TT.jarIn0) + cur.off, tg = Math.round(y0 / (2 * Math.PI)) * 2 * Math.PI, e = eio(clamp((t - TT.jarIn0) / (TT.jarIn1 - TT.jarIn0)));
      S.kinds.tarro.rotation.y = lerp(spinAt(t) + cur.off, tg, e) - spinAt(t); } }
  // móvil
  { const y = phoneY(t); S.phone.visible = y > -1.5; S.phone.position.set(0, y, -0.06); S.phone.rotation.set(0, 0.03 * Math.sin(t * 0.7), 0); if (S.phone.visible) drawScreen(t); }
  // calendario «DOMINGO»
  { const k = pop(t, TT.cal, 0.42) * (1 - eio(clamp((t - TT.com + 0.1) / 0.3))), C = S.cal; C.visible = k > 0.002;
    if (C.visible) { C.position.set(0.28, 1.47 + 0.015 * Math.sin(t * 2.2), 0.55); C.rotation.set(0.05, -0.28 + 0.04 * Math.sin(t * 1.3), 0.04); C.scale.setScalar(Math.max(0.001, k)); } }
  // bocadillo «KIRIA» y avión de papel con el enlace
  { const tb = K.comenta6 - 0.03, tp = TT.plane0, vis = t > tb && t < tp + 0.32, B = S.bubble; B.visible = vis;
    if (vis) { const e = eio(clamp((t - tb) / 0.45)), back = eio(clamp((t - tp) / 0.3)); B.position.copy(v3(0.05, 1.15, 0.0).lerp(v3(0.26, 1.42, 0.55), e)); B.position.y += 0.015 * Math.sin(t * 2.4);
      B.rotation.set(0.03 * Math.sin(t * 1.5), -0.22 + 0.05 * Math.sin(t * 0.9), 0.04 * Math.sin(t * 1.2)); B.scale.setScalar(Math.max(0.001, pop(t, tb, 0.45) * (1 - back)));
      S.letters.forEach((l, i) => { const k = pop(t, K.kiria6 + i * 0.09, 0.3); l.visible = k > 0.002; l.scale.setScalar(Math.max(0.001, k)); l.position.z = 0.06 + 0.03 * Math.sin(clamp((t - K.kiria6 - i * 0.09) / 0.3) * Math.PI); }); } }
  { const P = S.plane, tp = TT.plane0, tin = TT.plane1, vis = t > tp && t < tin; P.visible = vis;
    if (vis) { const u = clamp((t - tp) / (tin - tp)), e = eio(u), A = v3(0.26, 1.42, 0.55), B1 = v3(0.95, 1.8, 1.0), B2 = v3(-0.55, 1.7, 1.1), Z = v3(0.0, 1.2, 0.0);
      const pos = bez(A, B1, B2, Z, e, new THREE.Vector3()), nx = bez(A, B1, B2, Z, Math.min(1, e + 0.02), new THREE.Vector3());
      P.position.copy(pos); P.lookAt(nx.x + (nx.x === pos.x ? 0.001 : 0), nx.y, nx.z + 0.0001); P.rotateZ(Math.sin(u * Math.PI * 2) * 0.5); P.scale.setScalar(Math.max(0.001, pop(t, tp, 0.25) * (1 - easeIn(clamp((u - 0.8) / 0.2)))) * 0.9); } }
}
