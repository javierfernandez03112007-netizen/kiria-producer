// ---------------------------------------------------------------- HUD: cabecera (tema + marca), cifras grandes, etiquetas y sellos
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'LOS DATOS'], [K.porque, 'POR QUÉ SE SUSPENDE'], [K.duro, 'DÓNDE SE CAE'], [K.eso, 'LA SOLUCIÓN']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function headerB(t, sub) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '7px'; hfont(40); hg.textAlign = 'left'; hg.fillStyle = '#F2B233'; hg.fillText('OPOSICIÓN A BOMBERO', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '5px'; hfont(30); hg.fillStyle = HC.white; hg.fillText('BOMBERADOS', 1024, 150);
  hg.restore();
}
function pill(txt, t, t0, t1, y = 1540, col = HC.white) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(21, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - 28, w, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function bigPill(txt, t, t0, t1, y, col) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; const yy = y + 6 * Math.sin(t * 6);
  hfont(36); hg.letterSpacing = '4px'; const w = hg.measureText(txt).width + 90; glowStroke(col, 3, 18); hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, yy - 50, w, 100, 50); hg.fill(); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, 540, yy + 2); hg.restore(); }
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function hudAt(t) {
  hudBegin();
  const tt = loopT(t), A = S.app, E = S.exam, G = S.gates;
  headerB(t, sectAt(t));
  // ---- 1: 8 de cada 10 sin plaza
  const k1 = ckk(tt, K.ocho - 0.05, K.ultima - 0.1, 0.25) * ckf(tt, K.ultima - 0.1);
  if (k1 > 0) { const gr = hg.createLinearGradient(0, 1460, 0, 1860); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.45, `rgba(0,0,0,${0.72 * k1})`); gr.addColorStop(1, `rgba(0,0,0,${0.72 * k1})`); hg.fillStyle = gr; hg.fillRect(0, 1460, W, 400); }
  if (k1 > 0) { const n = Math.min(8, Math.floor(clamp((tt - K.ocho) / 0.55) * 8 + 0.999)), pb = tt > K.quedan ? Math.exp(-(tt - K.quedan) * 5) : 0;
    bigText(`${n} / 10`, 540, 1660, Math.round(140 * (1 + 0.2 * pb)), HC.red, k1, { type: false, glow: 28 + 30 * pb, ls: 6 });
    bigText('SIN PLAZA', 540, 1770, 44, HC.white, k1 * clamp((tt - K.quedan + 0.1) / 0.3), { ls: 10 }); }
  // ---- 2: Madrid
  const km = ckk(t, K.ultima + 0.15, K.valencia - 0.2, 0.3) * ckf(t, K.valencia - 0.2);
  if (km > 0) { bigText(fmt(1285 * clamp((t - K.ultima - 0.2) / (K.personas - K.ultima - 0.2))), 540, 1330, 120, HC.white, km, { type: false, glow: 18, ls: 6 });
    bigText('PRESENTADOS', 540, 1420, 30, HC.grey, km, { ls: 8 });
    bigText('267 PLAZAS', 540, 1500, 64, '#F2B233', km * clamp((t - K.doscientas + 0.1) / 0.3), { type: false, glow: 20, ls: 6 }); }
  pill('COMUNIDAD DE MADRID · BOMBERO ESPECIALISTA · 2025', t, K.ultima, K.valencia - 0.2, 1620);
  // ---- 3: València y País Vasco
  const kv = ckk(t, K.valencia - 0.05, K.pais - 0.2, 0.3) * ckf(t, K.pais - 0.2);
  if (kv > 0) { bigText(fmt(1634 * clamp((t - K.valencia + 0.3) / (K.aspirantes - K.valencia))), 540, 1330, 120, HC.white, kv, { type: false, glow: 18, ls: 6 });
    bigText('ASPIRANTES', 540, 1420, 30, HC.grey, kv, { ls: 8 });
    bigText('92 PLAZAS', 540, 1500, 64, '#F2B233', kv * clamp((t - K.noventa + 0.1) / 0.3), { type: false, glow: 20, ls: 6 }); }
  pill('AYUNTAMIENTO DE VALÈNCIA · 2026', t, K.valencia, K.pais - 0.2, 1620);
  const kp = ckk(t, K.setenta - 0.05, K.porque - 0.35, 0.3) * ckf(t, K.porque - 0.35);
  if (kp > 0) { bigText(`${Math.round(75 * sm5(clamp((t - K.setenta) / 0.6)))} %`, 540, 1340, 150, HC.red, kp, { type: false, glow: 30, ls: 6 });
    bigText('SUSPENDIÓ EL PRIMER EXAMEN', 540, 1460, 36, HC.white, kp * clamp((t - K.suspendio3 + 0.1) / 0.3), { ls: 6 }); }
  pill('OPE ÁLAVA Y GIPUZKOA · DATO DEL GOBIERNO VASCO', t, K.pais, K.porque - 0.35, 1620);
  // ---- 4: ¿por qué?
  bigText('¿POR QUÉ?', 540, 1380, 130, '#FF7A2F', ckk(t, K.porque - 0.05, K.uno - 0.1, 0.3) * ckf(t, K.uno - 0.1), { glow: 30, ls: 12 });
  // ---- 5: el test
  stamp('ELIMINATORIO', 540, 1500, ckk(t, K.eliminatorio - 0.05, K.temario5 + 0.6, 0.3) * ckf(t, K.temario5 + 0.6), HC.red, 70);
  if (E.Z.visible) { co(t, K.decenas - 0.05, K.manana + 0.4, v3(EZ.x + 0.3, 1.45, EZ.z + 0.01), 'DECENAS DE PREGUNTAS', null, { dx: 100, dy: -170, color: HC.white, d: 0.4, bg: true });
    bigText('1 SOLA MAÑANA', 540, 1560, 54, '#F2B233', ckk(t, K.sola - 0.05, K.algunas, 0.3) * ckf(t, K.algunas), { type: false, glow: 14, ls: 6 });
    co(t, K.fallo - 0.05, K.dos6 - 0.1, v3(EZ.x - 0.2, 1.25, EZ.z + 0.01), 'CADA FALLO RESTA', null, { dx: -100, dy: -200, color: HC.red, d: 0.35, bg: true });
  // ---- 6: el tiempo
    co(t, K.psicotecnico - 0.1, K.tres - 0.1, wpos(E.sw).add(v3(0, 0.33, 0.05)), 'PSICOTÉCNICO', 'CONTRA EL RELOJ', { dx: -110, dy: -170, color: HC.white, d: 0.35, bg: true });
    stamp('SIN CONTESTAR', 540, 1520, ckk(t, K.contestar - 0.05, K.tres - 0.1, 0.3) * ckf(t, K.tres - 0.1), HC.red, 66);
  // ---- 7: leer ≠ entrenar
    co(t, K.leerse - 0.05, K.duro - 0.1, v3(EZ.x - 0.8, 1.75, EZ.z + 0.2), 'LEER', null, { dx: -60, dy: -170, color: HC.grey, d: 0.35 });
    co(t, K.entrenar - 0.1, K.duro - 0.1, v3(EZ.x + 1.05, 1.35, EZ.z + 0.15), 'ENTRENAR', null, { dx: 60, dy: -230, color: '#F2B233', d: 0.35 });
    bigText('≠', 540, 1380, 220, HC.white, ckk(t, K.entrenar - 0.2, K.duro - 0.1, 0.3) * ckf(t, K.duro - 0.1), { type: false, glow: 20 }); }
  // ---- 8: la criba
  if (G.Z.visible) { co(t, K.cae - 0.05, K.eso - 0.1, wpos(G.gT).add(v3(-0.5, 0.15, 0.6)), 'LA MAYORÍA CAE AQUÍ', null, { dx: 60, dy: 230, color: HC.red, d: 0.35, bg: true, size: 34 });
    co(t, K.duro + 0.3, K.cae + 0.2, wpos(G.gF).add(v3(0, 1.2, 0)), 'LO DURO NO ES ESTO', null, { dx: 80, dy: -160, color: HC.white, d: 0.35, bg: true }); }
  // ---- 9-11: la app
  if (A.wheel.visible) co(t, K.ruleta - 0.05, K.haces, wpos(A.wheel).add(v3(0.5, 0.45, 0.05)), 'RULETA DEL TEMARIO', null, { dx: 60, dy: -150, color: '#F2B233', d: 0.35 });
  if (A.duel.visible) { co(t, K.directo - 0.1, K.inteligencia - 0.1, wpos(A.dA).add(v3(0, 0.9, 0)), 'EN DIRECTO', 'CONTRA OTROS OPOSITORES', { dx: -90, dy: -200, color: '#F2B233', d: 0.35 });
    co(t, K.inteligencia - 0.05, K.estudias, wpos(A.ai).add(v3(0, 0.15, 0)), 'CONTRA LA IA', null, { dx: 80, dy: -180, color: '#62E3D4', d: 0.35 });
    // reloj de la partida
    const kr = ckk(t, K.reloj - 0.1, K.bomberados12 - 0.2, 0.3) * ckf(t, K.bomberados12 - 0.2);
    if (kr > 0) { const left = Math.max(0, 20 - (t - K.reloj) * 4); hg.save(); hg.globalAlpha = kr; const cx = 540, cy = 1430, r = 70;
      hg.strokeStyle = 'rgba(238,242,246,.2)'; hg.lineWidth = 10; hg.beginPath(); hg.arc(cx, cy, r, 0, 7); hg.stroke();
      glowStroke('#FF7A2F', 10, 18); hg.beginPath(); hg.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * left / 20); hg.stroke(); noGlow();
      hg.fillStyle = HC.white; hfont(44); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '2px'; hg.fillText(`0:${String(Math.ceil(left)).padStart(2, '0')}`, cx, cy + 2); hg.restore(); } }
  // ---- 12: cierre
  bigPill('PRUEBA GRATIS · 5 DÍAS', t, K.pruebala - 0.1, END - 0.75, 1460, '#F2B233');
}
