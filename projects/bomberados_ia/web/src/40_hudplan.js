// ---------------------------------------------------------------- HUD: cabecera (tema + marca), la pregunta, cuenta atrás, etiquetas y cierre
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'LA PREGUNTA'], [K.sale, 'LA PLANTILLA'], [K.toca, 'BUSCARLA A MANO'], [K.ahora, 'CON BOMBERADOS'], [K.falso9, 'LA RESPUESTA'], [K.bomberados12, 'PRUÉBALA']];
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
// rótulo con fondo oscuro (legible sobre el fuego)
function plate2(txt, x, y, size, col, k, o = {}) { if (k <= 0.002) return; hg.save(); hg.globalAlpha = clamp(k * 2.5) * (o.a ?? 1); hfont(size); hg.letterSpacing = Math.round(size * 0.12) + 'px';
  const s = typed(txt, o.type === false ? 1 : clamp(k * 1.6)), w = hg.measureText(txt).width + size * 1.1, h = size * 1.6, sc = 1 + 0.25 * (1 - eo(clamp(k / 0.3)));
  hg.translate(x, y); hg.scale(sc, sc); hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, -w / 2, -h / 2, w, h, h * 0.22); hg.fill(); glowStroke(col, 2.5, 14); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; if (o.glow) { hg.shadowColor = col; hg.shadowBlur = o.glow; } hg.fillText(s, size * 0.06, 2); hg.restore(); }
// cuenta atrás 3·2·1 (piénsalo)
function countdown(t, t0, t1, x, y) { const k = ckk(t, t0, t1, 0.25) * ckf(t, t1); if (k <= 0) return; const u = clamp((t - t0) / (t1 - t0)), n = Math.max(1, 3 - Math.floor(u * 3));
  hg.save(); hg.globalAlpha = k; hg.fillStyle = 'rgba(0,0,0,.55)'; hg.beginPath(); hg.arc(x, y, 92, 0, 7); hg.fill();
  hg.strokeStyle = 'rgba(238,242,246,.18)'; hg.lineWidth = 10; hg.beginPath(); hg.arc(x, y, 78, 0, 7); hg.stroke();
  glowStroke('#FF7A2F', 10, 20); hg.beginPath(); hg.arc(x, y, 78, -Math.PI / 2, -Math.PI / 2 + 6.2832 * (1 - u)); hg.stroke(); noGlow();
  const p = (u * 3) % 1, sc = 1 + 0.35 * (1 - eo(clamp(p / 0.25)));
  hg.translate(x, y); hg.scale(sc, sc); hfont(84); hg.fillStyle = HC.white; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(String(n), 3, 6); hg.restore(); }
// bocadillo de comentario
function commentIcon(x, y, s, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y); const sc = 0.6 + 0.4 * eo(clamp(k / 0.4)); hg.scale(sc, sc);
  glowStroke(HC.white, 5, 12); hg.fillStyle = 'rgba(0,0,0,.5)'; rr(hg, -s, -s * 0.7, s * 2, s * 1.3, s * 0.35); hg.fill(); hg.stroke();
  hg.beginPath(); hg.moveTo(-s * 0.45, s * 0.6); hg.lineTo(-s * 0.6, s * 1.05); hg.lineTo(-s * 0.05, s * 0.6); hg.stroke(); noGlow();
  for (let i = 0; i < 3; i++) { hg.fillStyle = HC.white; hg.beginPath(); hg.arc(-s * 0.5 + i * s * 0.5, -s * 0.05, s * 0.13, 0, 7); hg.fill(); } hg.restore(); }
function hudAt(t) {
  hudBegin();
  const tt = loopT(t);
  headerB(t, sectAt(t));
  // ---- 1: la pregunta
  plate2('¿CLASE B?', 540, 600, 56, '#F2B233', ckk(tt, K.clase - 0.05, K.verdadero - 0.1, 0.3) * ckf(tt, K.verdadero - 0.1), { glow: 16 });
  const kv = ckk(tt, K.verdadero, TV0() - 0.2, 0.35) * ckf(tt, TV0() - 0.2), kf = ckk(tt, K.falso1, TV0() - 0.2, 0.35) * ckf(tt, TV0() - 0.2);
  if (kv > 0 || kf > 0) { const pv = proj(LV.clone().add(v3(0, -0.21, 0))), pf = proj(LF.clone().add(v3(0, -0.21, 0)));
    plate2('VERDADERO', pv.x, pv.y + 40, 30, HC.white, kv); plate2('FALSO', pf.x, pf.y + 40, 30, HC.white, kf); }
  countdown(tt, K.piensalo, K.trampa1 - 0.08, 540, 1560);
  plate2('¡TRAMPA!', 540, 1560, 60, HC.red, ckk(tt, K.trampa1 - 0.05, TV0() + 0.1, 0.25) * ckf(tt, TV0() + 0.1), { glow: 20 });
  // ---- 2: la plantilla
  if (S.room.R.visible) {
    co(t, TV1() + 0.1, K.treinta - 0.15, S.sheet.bubV(), 'TU RESPUESTA: V', null, { dx: -120, dy: -260, color: HC.white, d: 0.35, bg: true });
    plate2('✗ FALLADA', 540, 1560, 64, HC.red, ckk(t, K.treinta, K.toca - 0.1, 0.22) * ckf(t, K.toca - 0.1), { glow: 22, type: false });
    // ---- 3-4: buscarla a mano
    co(t, K.manual3 - 0.05, K.tema - 0.1, D(-0.47, 0.9, 0.12), '¿MANUAL?', null, { dx: 120, dy: -230, color: '#F2B233', d: 0.3, bg: true, size: 40 });
    co(t, K.tema - 0.05, K.pagina3 - 0.05, D(-0.37, 0.82, 0.0), '¿TEMA?', null, { dx: 140, dy: -210, color: '#F2B233', d: 0.3, bg: true, size: 40 });
    co(t, K.pagina3 - 0.05, K.hojas - 0.05, D(-0.17, 0.77, 0.15), '¿PÁGINA?', null, { dx: 130, dy: -230, color: '#F2B233', d: 0.3, bg: true, size: 40 });
    const kp = ckk(t, K.hojas - 0.05, K.apuntes + 0.1, 0.25) * ckf(t, K.apuntes + 0.1);
    if (kp > 0) plate2('PÁG. ' + String(12 + Math.floor(clamp((t - K.hojas) / (K.apuntes - K.hojas)) * 371)).padStart(3, '0'), 540, 1560, 54, HC.white, kp, { type: false });
    const kc = ckk(t, K.va - 0.25, K.ahora - 0.1, 0.25) * ckf(t, K.ahora - 0.1);
    if (kc > 0) { const h = S.hrs || 17.08, hh = Math.floor(h), mm = Math.floor((h - hh) * 60); plate2(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 540, 1560, 70, '#F2B233', kc, { type: false, glow: 18 }); }
    // ---- 5-8: la app (recreación)
    const kr = ckk(t, K.ahora + 0.3, TF0(), 0.3) * ckf(t, TF0());
    if (kr > 0) { hg.save(); hg.globalAlpha = kr * 0.8; hfont(18, false); hg.letterSpacing = '3px'; hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText('RECREACIÓN DE LA APP · EJEMPLO', 56, 1790); hg.restore(); }
  }
  // ---- 9: ¡falso!
  plate2('FALSO', 540, 1500, 120, '#FFB547', ckk(t, K.falso9 - 0.03, K.falso9 + 1.0, 0.2) * ckf(t, K.falso9 + 1.0), { glow: 34, type: false });
  // ---- 10: el aceite es un líquido (B)… pero el de cocina tiene clase propia: la F
  if (S.ans.drop.visible || S.ans.bL.visible) {
    co(t, K.liquido - 0.05, K.b10 - 0.1, DP.clone().add(v3(0.04, 0.05, 0)), 'LÍQUIDO', null, { dx: 90, dy: -230, color: '#FFB547', d: 0.3, bg: true, size: 38 });
    co(t, K.b10 + 0.05, K.pero + 0.12, DP.clone().add(v3(0.06, 0.08, 0)), 'LÍQUIDOS → CLASE B', null, { dx: 80, dy: -250, color: HC.white, d: 0.3, bg: true, size: 34 });
  }
  co(t, K.cocina - 0.05, K.f10 - 0.15, v3(0.06, 0.12, 0.05), 'ACEITE DE COCINA', null, { dx: 110, dy: 260, color: '#FFB547', d: 0.3, bg: true, size: 34 });
  plate2('CLASE F', 540, 1520, 100, '#FFB547', ckk(t, K.f10 - 0.05, K.v11 - 0.25, 0.25) * ckf(t, K.v11 - 0.25), { glow: 30, type: false });
  pill('NORMA UNE-EN 2 · CLASIFICACIÓN DE LOS FUEGOS', t, K.propia, K.v11 - 0.25, 1660, HC.white);
  // ---- 11: ¿tú qué habías puesto?
  const kq = ckk(t, K.v11 + 0.05, K.bomberados12 - 0.2, 0.3) * ckf(t, K.bomberados12 - 0.2);
  plate2('¿V o F?', 540, 1530, 96, HC.white, kq, { glow: 20, type: false }); commentIcon(840, 1430, 46, ckk(t, K.comentarios - 0.1, K.bomberados12 - 0.2, 0.3) * ckf(t, K.bomberados12 - 0.2));
  // ---- 12-13: cierre
  const kt = ckk(t, K.falla - 0.05, END - 0.75, 0.3) * ckf(t, END - 0.75);
  if (kt > 0) { const gr = hg.createLinearGradient(0, 1230, 0, 1490); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, `rgba(0,0,0,${0.6 * kt})`); gr.addColorStop(0.7, `rgba(0,0,0,${0.6 * kt})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); hg.fillStyle = gr; hg.fillRect(0, 1230, W, 260);
    bigText('FALLA EN CASA,', 540, 1320, 58, HC.white, kt, { ls: 6, glow: 10 }); bigText('NO EN EL EXAMEN', 540, 1400, 58, '#F2B233', ckk(t, K.casa + 0.2, END - 0.75, 0.3) * ckf(t, END - 0.75), { ls: 6, glow: 14 }); }
  bigPill('PRUEBA GRATIS · 5 DÍAS', t, K.pruebala - 0.1, END - 0.75, 1560, '#F2B233');
}
