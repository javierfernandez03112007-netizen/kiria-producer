// ---------------------------------------------------------------- HUD (como en Derecho): cabecera con la pregunta pendiente (¿cuánto va a ganar?), cifras grandes y rótulos con línea guía
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic';
  const tk = 1;
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('GTA 6', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL DINERO, POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('SALE EL', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('19 NOV', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('PS5 · XBOX SERIES', 1024, 178);
  const mk = win(t, K.ganar2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿CUÁNTO VA A GANAR? · ???', col = HC.red, blink = true;
    if (t > K.tres8 + 0.2) { txt = '3.200 M$ EL 1.ER AÑO (ANALISTAS)'; col = HC.green; blink = false; }
    if (t > K.mas8 + 0.3) { txt = 'MÁS QUE LA PELÍCULA N.º 1'; col = HG; blink = false; }
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
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: 0 / 100 · la película n.º 1 · GTA 5
  { const k = cw(t, K.historia1, K.es2 - 0.2); if (k > 0.01) { bigText('0 / 100', W / 2, Y, 120, HG, k, { glow: 26, type: false, dark: 30 }); bigText('PELÍCULAS HAN GANADO TANTO', W / 2, Y + 96, 30, HC.white, cw(t, K.ganado1, K.es2 - 0.2), { dark: 20 }); } }
  if (S.ctr.visible) { lab(S.gold1, 0, 0.04, 0, 'PELÍCULA N.º 1', '2.925 M$', cw(t, K.pelicula1 + 0.25, K.videojuego1 - 0.1), { dx: -120, dy: -170, color: HG });
    lab(S.case5, 0.05, 0.06, 0.008, 'GTA 5', 'MÁS DE 6.000 M$', cw(t, K.videojuego1, K.y2 - 0.05), { dx: 130, dy: -150, color: HC.green }); }
  // L2: GTA 6 en su vitrina · ¿cuánto va a ganar?
  if (S.vit.visible) { const L = S.vit.userData.lock; lab(L, 0, 0.12, 0.01, 'GTA 6', 'SALE EL 19 DE NOVIEMBRE', cw(t, K.sale2 - 0.05, K.cuanto2 - 0.05), { dx: 150, dy: -120, color: HG });
    const q = cw(t, K.cuanto2, K.el3); if (q > 0.01) { const P = proj(wpo(L, 0, 0.02, 0.02)); if (P.ok) bigText('?', P.x, P.y - 150, 150, HC.red, q, { glow: 30, type: false }); } }
  // L3: 800 M$ el primer día · 1.000 M$ en 3 días · récord
  { const a = cw(t, K.n800 - 0.1, K.lleva4 - 0.2); if (a > 0.01) { const n = t < K.n1000 - 0.1 ? 800e6 * eo(clamp((t - K.n800 + 0.1) / 0.8)) : 800e6 + 200e6 * eo(clamp((t - K.n1000 + 0.1) / 0.5));
      bigText(fmt(Math.round(n / 1e6) * 1e6) + ' $', W / 2, Y, 92, HC.green, a, { glow: 20, type: false, dark: 30 }); bigText(t < K.en3 ? 'EL PRIMER DÍA' : 'EN 3 DÍAS', W / 2, Y + 90, 32, HC.white, a, { dark: 20 }); }
    const D = ST.D; if (D.Z.visible) lab(D.med, 0, 0.0, 0.02, 'RÉCORD GUINNESS', 'NADA LLEGÓ TAN RÁPIDO', cw(t, K.record3 + 0.1, K.lleva4 - 0.1), { dx: -140, dy: -120, color: HG }); }
  // L4: 230 M de copias · 213 M de brasileños · sobran 17 M
  { const a = cw(t, K.n230 - 0.1, K.y5 - 0.15); if (a > 0.01) { bigText('+' + fmt(230 * eo(clamp((t - K.n230 + 0.1) / 0.9))) + ' M', W / 2, Y - 30, 96, HC.white, a, { type: false, dark: 30 }); bigText('COPIAS DE GTA 5', W / 2, Y + 50, 30, HC.white, a, { dark: 20 });
      bigText('BRASIL: 213 M DE HABITANTES', W / 2, Y + 115, 34, HG, cw(t, K.habitantes4 - 0.1, K.y5 - 0.15), { glow: 12, dark: 20 }); }
    const C = ST.C; if (C.Z.visible) callout(C.top.localToWorld(v3(0.24, 0.01, 0.236)), '17 M DE COPIAS MÁS', null, cw(t, K.brasil4, K.y5 - 0.1), { dx: 60, dy: -260, size: 26, bg: true, color: HG }); }
  // L5: Rockstar lo niega · el edificio más alto
  { const Kk = ST.K; if (Kk.Z.visible) { lab(Kk.doc, 0, 0.0, 0.0, 'ROCKSTAR LO NIEGA', null, cw(t, K.negar5 + 0.25, K.edificio5 - 0.1), { dx: -110, dy: -220, color: HC.red });
      lab(Kk.sky, 0, 0.86, 0, 'BURJ KHALIFA', 'EL MÁS ALTO · 1.500 M$', cw(t, K.edificio5 + 0.2, K.entre6 - 0.1), { dx: 120, dy: -110, color: HC.teal });
      lab(Kk.col.g, 0, 0.62, 0, 'COSTE DE GTA 6', 'ANALISTAS: 1.000–1.500 M$', cw(t, K.n1000b, K.cualquier6 - 0.1), { dx: -130, dy: -120, color: HG });
      lab(Kk.reel, 0, 0.17, 0, 'LA PELÍCULA MÁS CARA', '659 M$', cw(t, K.cualquier6 + 0.1, K.y7 - 0.1), { dx: -80, dy: -190, color: HC.white }); }
    const a = cw(t, K.n1000b - 0.1, K.mas6 - 0.05); if (a > 0.01) bigText('1.000–1.500 M$', W / 2, Y, 86, HG, a, { glow: 18, type: false, dark: 30 });
    const b = cw(t, K.mas6 - 0.05, K.y7 - 0.1); if (b > 0.01) bigText('MÁS QUE CUALQUIER PELÍCULA', W / 2, Y, 46, HC.white, b, { dark: 24 }); }
  // L7: 79,99 €
  { const a = cw(t, K.n80 - 0.15, K.respuesta8 - 0.1); if (a > 0.01) { bigText('79,99 €', W / 2, Y, 120, HC.red, a, { glow: 24, type: false, dark: 30 }); bigText('EDICIÓN ESTÁNDAR · ESPAÑA', W / 2, Y + 92, 28, HC.white, a, { dark: 20 }); } }
  // L8: la balanza · 3.200 M$ frente a 2.925 M$
  { const Bs = ST.B; if (Bs.Z.visible) { lab(Bs.reel, 0, 0.16, 0, 'PELÍCULA N.º 1', '2.925 M$', cw(t, K.segun8, K.pagarias9 - 0.1), { dx: -110, dy: -200, color: HC.white });
      lab(Bs.case, 0, 0.1, 0, 'GTA 6 · 1.ER AÑO', fmt(3200 * eo(clamp((t - K.tres8 + 0.1) / 1.4))) + ' M$', cw(t, K.tres8 - 0.1, K.pagarias9 - 0.1), { dx: 110, dy: -230, color: HC.green }); }
    const a = cw(t, K.tres8 - 0.1, K.pagarias9 - 0.1); if (a > 0.01) { bigText(fmt(3200 * eo(clamp((t - K.tres8 + 0.1) / 1.4))) + ' M$', W / 2, Y, 110, HC.green, a, { glow: 24, type: false, dark: 30 });
      bigText(t < K.mas8 ? 'SOLO EL PRIMER AÑO · SEGÚN LOS ANALISTAS' : 'MÁS QUE LA PELÍCULA N.º 1', W / 2, Y + 92, 30, t < K.mas8 ? HC.white : HG, a, { dark: 20 }); } }
  // L9: ¿80 €? · mándaselo
  { const a = cw(t, K.pagarias9 - 0.05, K.mandaselo9 - 0.05); if (a > 0.01) { bigText('¿PAGARÍAS 80 €?', W / 2, Y, 76, HC.white, a, { type: false, dark: 30 }); bigText('POR UN VIDEOJUEGO', W / 2, Y + 80, 34, HG, cw(t, K.videojuego9 - 0.15, K.mandaselo9 - 0.05), { dark: 20 }); }
    const m = cw(t, K.mandaselo9 - 0.05, END - 0.6); if (m > 0.01) { bigText('MÁNDASELO A QUIEN DICE QUE', W / 2, Y - 10, 40, HC.white, m, { dark: 24 }); bigText('JUGAR ES TIRAR EL DINERO', W / 2, Y + 60, 52, HG, cw(t, K.jugar9 - 0.1, END - 0.6), { glow: 14, dark: 26 }); } }
}
