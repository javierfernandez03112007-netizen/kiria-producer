// ---------------------------------------------------------------- HUD: cabecera con los dos bucles abiertos (veredicto y truco), datos y pique entre bandos
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
const HMAG = '#FF7AB8';
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'EL VÍDEO QUE ESTÁS VIENDO'], [K.borra, 'EL PIQUE'], [K.municion, 'LA MUNICIÓN'], [K.sonido6, 'LA RESPUESTA'], [K.asi, 'POR DENTRO'],
    [K.entonces, 'VEREDICTO'], [K.truco14, 'EL TRUCO'], [K.ahora, 'TU TURNO']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function loopBox(t, txt, col, k, y, blink, x1 = 1024) {
  hg.save(); hfont(19); hg.letterSpacing = '3px'; const w0 = hg.measureText(txt).width + 34; hg.restore();
  if (k <= 0.01) return x1 - w0; const on = !blink || Math.sin(t * 9) > -0.3;
  hg.save(); hg.globalAlpha = clamp(k); hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right'; hg.textBaseline = 'alphabetic';
  const w = hg.measureText(txt).width + 34, x0 = x1 - w;
  hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath(); hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
  hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke(); hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  hg.restore(); return x0;
}
function headerSI(t, sub) {
  hg.save(); hg.textBaseline = 'alphabetic'; const tk = 1;   // ya escrita: el último fotograma enlaza con el primero
  hg.letterSpacing = '8px'; hfont(44); hg.textAlign = 'left'; hg.fillStyle = HC.teal; hg.fillText(typed('SONIDO E IMAGEN', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('CONTRA', 1024, 108);
  hfont(40); hg.letterSpacing = '6px'; hg.fillStyle = HC.amber; hg.fillText(typed('TELECO', tk), 1024, 158);
  hg.restore();
  // bucles abiertos: el veredicto y el truco (se cierran al final)
  let x0 = 1024;
  if (t >= K.apellido + 0.1) x0 = loopBox(t, 'VEREDICTO · CON APELLIDO ✓', HC.white, clamp((t - K.apellido - 0.1) / 0.3), 240, false);
  else if (t >= K.facil2 + 0.4) x0 = loopBox(t, 'VEREDICTO · ???', HC.white, clamp((t - K.facil2 - 0.4) / 0.2), 240, true);
  if (t >= K.tira + 0.2) loopBox(t, 'TRUCO · ✓', HC.white, clamp((t - K.tira - 0.2) / 0.3), 240, false, x0 - 18);
  else if (t >= K.notado + 0.4) loopBox(t, 'TRUCO · ???', HC.white, clamp((t - K.notado - 0.4) / 0.2), 240, true, x0 - 18);
}
function pill(txt, t, t0, t1, y = 1500, col = HC.white) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(21, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - 28, w, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function bigPill(txt, t, t0, t1, y, col) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; const yy = y + 7 * Math.sin(t * 6);
  hfont(32); hg.letterSpacing = '4px'; const w = hg.measureText(txt).width + 80; glowStroke(col, 3, 14); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, yy - 46, w, 92, 46); hg.fill(); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, 540, yy + 2); hg.restore(); }
function hudAt(t) {
  hudBegin();
  const D = S.duel.userData, I = S.inside.userData, E = S.eye, P = S.spec.userData, tt = loopT(t);
  headerSI(t, sectAt(t));
  // ---- 1-2: el 99 % borrado
  const ck = ckk(tt, K.mas1 - 0.05, K.notado + 0.35, 0.2) * ckf(tt, K.notado + 0.35);
  if (ck > 0) { const n = Math.round(99 * sm5(clamp((tt - K.mas1) / Math.max(0.4, K.ciento - K.mas1 + 0.2)))), pb = tt > K.borrado ? Math.exp(-(tt - K.borrado) * 5) : 0;
    bigText(n + ' %', 540, 1300, Math.round(170 * (1 + 0.25 * pb)), HC.red, ck, { type: false, glow: 30 + 30 * pb, ls: 8 });
    bigText('DEL VÍDEO, BORRADO', 540, 1420, 40, HC.white, ck * clamp((tt - K.video1 + 0.1) / 0.3), { ls: 8 }); }
  stamp('¿LA TELECO FÁCIL?', 540, 1380, ckk(t, K.facil2 - 0.05, K.municion + 0.2, 0.35) * ckf(t, K.municion + 0.2), HC.amber, 58);
  // ---- 4: la munición
  pill('UPM · NOTAS DE CORTE 2025-26', t, K.politecnica, K.sonido6 - 0.1, 1540);
  // ---- 4: la respuesta de Sonido e Imagen
  if (D.T.visible) co(t, K.sin6 - 0.05, K.asi, wpos(D.T).add(v3(0, 0.38, 0)), '«SIN NOSOTROS, NI UNA SERIE»', 'RESPONDE SONIDO E IMAGEN', { dx: -120, dy: -170, color: HC.teal, d: 0.45 });
  // ---- 7-9: por dentro
  co(t, K.senales, K.convierten + 0.2, v3(IZ.x - 0.35, 1.7, IZ.z), 'SEÑAL', 'CONTINUA', { dx: 120, dy: -170, color: HC.teal, d: 0.35 });
  co(t, K.convierten + 0.15, K.numeros + 0.3, v3(IZ.x + 0.35, 1.45 + 0.2, IZ.z), 'MUESTRAS', null, { dx: 110, dy: 170, color: HC.white, d: 0.35 });
  co(t, K.numeros, K.acustica, v3(IZ.x + 0.75, 2.15, IZ.z), 'NÚMEROS', '0 Y 1', { dx: 90, dy: -150, color: HC.teal, d: 0.35 });
  co(t, K.salas - 0.1, K.video9, wpos(I.R).add(v3(-0.3, 0.9, -0.5)), 'SALA', 'PANELES ACÚSTICOS', { dx: -100, dy: -150, color: HC.white, d: 0.35 });
  co(t, K.microfonos - 0.05, K.video9, wpos(I.mic).add(v3(-0.03, 1.17, 0)), 'MICRÓFONO', null, { dx: -110, dy: 140, color: HC.white, d: 0.35 });
  co(t, K.altavoces - 0.05, K.video9 + 0.2, wpos(I.spk).add(v3(0, 0.4, 0.1)), 'ALTAVOZ', null, { dx: 110, dy: -160, color: HC.teal, d: 0.35 });
  co(t, K.millones - 0.1, K.entonces, wpos(I.B).add(v3(-1.5, 0.1, 2.5)), 'MILLONES DE PANTALLAS', 'A LA VEZ', { dx: 60, dy: -260, color: HC.white, d: 0.4, size: 27 });
  // ---- 10-13: veredicto
  stamp('¿FÁCIL?', 540, 1380, ckk(t, K.facil10 - 0.05, K.nota, 0.35) * ckf(t, K.nota), HC.amber, 80);
  pill('NOTA DE CORTE = LA DEL ÚLTIMO QUE ENTRA', t, K.nota, K.dos12 - 0.1, 1540);
  if (D.crT.visible) co(t, K.gente, K.pide + 0.5, v3(DZ.x - 0.6, 0.12, DZ.z + 0.85), 'CUÁNTA GENTE LA PIDE', null, { dx: 60, dy: -260, color: HC.white, d: 0.4 });
  stamp('DIFICULTAD ✕', 540, 1380, ckk(t, K.dificil - 0.05, K.dos12, 0.35) * ckf(t, K.dos12), HC.red, 62);
  if (D.dT.visible) co(t, K.profesion - 0.1, K.master - 0.15, wpos(D.dT).add(v3(0, 0.16, 0)), 'LA MISMA PROFESIÓN', 'INGENIERO TÉCNICO DE TELECOMUNICACIÓN', { dx: 90, dy: -190, color: HC.white, d: 0.4 });
  if (D.door.visible) co(t, K.master - 0.05, K.facil13, wpos(D.door).add(v3(0.42, 1.3, 0)), 'EL MISMO MÁSTER', 'INGENIERO DE TELECOMUNICACIÓN', { dx: 100, dy: -150, color: HC.white, d: 0.4 });
  pill('ÓRDENES CIN/352/2009 Y CIN/355/2009', t, K.dos12, K.facil13, 1540);
  stamp('FÁCIL ✕', 540, 1380, ckk(t, K.no13 - 0.05, K.teleco13b + 0.3, 0.3) * ckf(t, K.teleco13b + 0.3), HC.red, 90);
  // ---- 14-16: el truco
  if (E.luma.visible) co(t, K.luz - 0.05, K.menos + 0.3, wpos(E.luma).add(v3(-0.3, 0.55, 0)), 'LUZ', 'TODO EL DETALLE', { dx: -100, dy: -170, color: HC.white, d: 0.4 });
  if (E.chroma.visible) co(t, K.color14b - 0.05, K.menos + 0.3, wpos(E.chroma).add(v3(0.42, -0.5, 0)), 'COLOR', '¼ DE LOS PUNTOS', { dx: 110, dy: 170, color: HC.amber, d: 0.4 });
  if (S.spec.visible) { const bx = i => S.spec.position.x + (i - (P.N - 1) / 2) * 0.034;
    co(t, K.fuerte - 0.05, K.ahora, v3(bx(P.LOUD), P.H0[P.LOUD] + 0.02, S.spec.position.z), 'FUERTE', null, { dx: -110, dy: -120, color: HC.amber, d: 0.35 });
    co(t, K.flojo - 0.05, K.tira + 0.1, v3(bx(P.WEAK), P.H0[P.WEAK] + 0.02, S.spec.position.z), 'FLOJO', 'TAPADO', { dx: 110, dy: -260, color: HC.teal, d: 0.35 });
    if (t > K.tira) { const p = proj(v3(bx(P.WEAK), 0.12, S.spec.position.z)); stamp('✕', p.x, p.y, ckk(t, K.tira, K.ahora + 0.2, 0.25) * ckf(t, K.ahora + 0.2), HC.red, 80); } }
  // ---- 17: tu turno
  bigPill('COMENTA ↓', t, K.teleco17 - 0.1, END - 1.3, 1380, HC.white);
  pill('MÁNDASELO A ALGUIEN DE TELECO →', t, K.mandaselo - 0.1, END - 1.3, 1520, HC.amber);
}
