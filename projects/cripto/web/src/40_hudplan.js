// ---------------------------------------------------------------- HUD: cabecera (con kiriaai.com), rótulos con línea guía, reloj de los 20 minutos, torres y cierre
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HICE = '#9FDCFF';
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
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
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText('EL MAYOR ROBO CRIPTO', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText('HACKEO A BINANCE · 29 OCT 2026', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.letterSpacing = '3px'; hfont(16, false); hg.fillStyle = 'rgba(238,242,246,.55)'; hg.fillText('VÍDEO HECHO CON IA · KIRIAAI.COM', 56, 232);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('ROBADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('+6.000 M$', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('EN UNOS 20 MIN', 1024, 178);
  hg.restore();
  bracketMsg(t, '¿RECUPERADO?', HC.amber, win(t, K.recuperado2, 0.3) * (1 - win(t, K.y13, 0.25)), true);
  bracketMsg(t, '≈ 2.850 M$ CONGELADOS', HICE, win(t, K.n2850_13 + 0.3, 0.3) * (1 - win(t, END - 1.3, 0.3)), false);
}
// reloj: de 00:00 a 20:00 mientras salen las monedas
function timerHud(t) {
  const k = cwin(t, TT.timer0 - 0.1, K.mayor11 - 0.1); if (k <= 0.01) return;
  const u = clamp((t - TT.timer0) / (TT.timer1 + 0.6 - TT.timer0)), secs = Math.round(u * 1200), mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  bigText(`${mm}:${ss}`, W / 2, 1490, 110, HG, k, { glow: 16, type: false, dark: 24, ls: 8 });
  bigText('MINUTOS', W / 2, 1572, 26, HC.grey, k, { type: false, dark: 14, ls: 8 });
}
function panel2(l1, l2, c1, c2, y, k) {
  if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k); hfont(34); hg.letterSpacing = '4px'; const w = Math.max(hg.measureText(l1).width, (hfont(26), hg.measureText(l2).width)) + 70;
  hg.fillStyle = 'rgba(0,0,0,.72)'; rr(hg, W / 2 - w / 2, y - 62, w, 132, 12); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(34); hg.fillStyle = c1; hg.fillText(typed(l1, clamp(k * 1.5)), W / 2, y - 18); hfont(26); hg.fillStyle = c2; hg.fillText(typed(l2, clamp(k * 1.5 - 0.3)), W / 2, y + 30); hg.restore();
}
function hudAt(t) {
  hudBegin(); hdr(t);
  // 3: la cartera caliente
  lab(v3(VAULT.x + VAULT.w / 2, VAULT.base + VAULT.h * 0.8, VAULT.z + VAULT.d / 2), 'CARTERA CALIENTE', 'CONECTADA A INTERNET', cw(t, K.carteras3, K.ingenieros4 - 0.1), { dx: 120, dy: -170, color: HG });
  // 5: la empresa que no existe
  if (t > TT.fake - 0.1 && t < TT.test0) { screenFrame(); lab(S.lap.userData.scr.localToWorld(v3(0.2, 0.08, 0)), 'EMPRESA FALSA', null, cw(t, TT.fake, TT.test0 - 0.05), { dx: 90, dy: -160, color: HC.red }); }
  // 7–8: el programa espía
  if (S.bug.visible) {
    lab(S.bug.position, 'PROGRAMA ESPÍA', 'EL ANTIVIRUS NO LO VE', cw(t, K.espia7, K.pero8 - 0.05), { dx: -130, dy: -170, color: HC.red });
    lab(S.bug.position, 'ESPERANDO…', 'SEMANAS', cw(t, K.esperaron8, K.ia9 - 0.05), { dx: 120, dy: -150, color: HC.red });
  }
  // 9: la IA interna y los otros dos ingenieros
  lab(wpo(S.lap, 0, 0.42, -0.2), 'IA DE LA EMPRESA', null, cw(t, K.ia9, K.saltaron9), { dx: 120, dy: -150, color: HC.red });
  S.side.forEach((l, i) => lab(wpo(l, 0, 0.45, -0.2), i ? 'INGENIERO 3' : 'INGENIERO 2', null, cw(t, TT.land - 0.2, K.n29_10), { dx: i ? -40 : 40, dy: -150, color: HC.red }));
  // 10: el día, el reloj y las cadenas
  // el sello se va antes de que salga el reloj (en el mismo sitio): con la voz de Javi se pisaban ≈ 0,7 s
  { const k = cwin(t, K.n29_10 - 0.05, TT.timer0 - 0.35, 0.2, 0.25); if (k > 0.01) stamp('29 OCT 2026', W / 2, 1480, k, HC.red, 70); }
  timerHud(t);
  lab(S.chains[NCH - 2].curve.getPointAt(0.55), '10 CADENAS DE BLOQUES', null, cw(t, K.cadenas10, K.mayor11 - 0.1), { dx: -150, dy: -140, color: HC.white });
  // 11: las torres
  lab(v3(0.6, 2.55, 1.3), 'ESTE ROBO', '+6.000 M$ · 2026', cw(t, TT.big + 0.6, K.fbi12), { dx: -60, dy: -130, color: HG });
  lab(v3(-0.6, 0.65, 1.3), 'RÉCORD ANTERIOR', '~1.500 M$ · BYBIT, 2025', cw(t, TT.rec, K.fbi12), { dx: -60, dy: -170, color: HC.white });
  { const k = cwin(t, TT.x4, K.fbi12, 0.15, 0.3); if (k > 0.01) bigText('×4', W / 2, 1020, 170, HG, k, { glow: 18, type: false, dark: 26 }); }
  // 12: el FBI
  panel2('FBI: HACKERS DE COREA DEL NORTE', 'GRUPO TRADERTRAITOR', HC.white, HC.grey, 1470, cw(t, K.fbi12, K.y13 - 0.1));
  { const k = cwin(t, K.niegan12, K.y13 - 0.1, 0.15, 0.25); if (k > 0.01) stamp('LO NIEGAN', W / 2, 1640, k, HC.red, 56); }
  // 13: congelado · 14: lo repone Binance
  lab(S.chains[FROZEN[1]].curve.getPointAt(0.45), '≈ 2.850 M$', 'CONGELADOS', cw(t, K.n2850_13 + 0.2, K.resto14), { dx: -140, dy: -150, color: HICE });
  lab(v3(VAULT.x - VAULT.w / 2, VAULT.base + VAULT.h * 0.75, VAULT.z + VAULT.d / 2), 'LO PONE BINANCE', 'SEGÚN BINANCE, NINGÚN CLIENTE PIERDE', cw(t, K.puesto14, K.entrevista15 - 0.1), { dx: -110, dy: -170, color: HG });
  // 15: sospecha
  { const k = cwin(t, K.sospecha15, END - 0.35, 0.15, 0.3); if (k > 0.01) stamp('SOSPECHA', W / 2, 1500, k, HC.red, 96); }
}
