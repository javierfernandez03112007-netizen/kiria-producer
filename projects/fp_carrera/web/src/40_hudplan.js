// ---------------------------------------------------------------- HUD: cabecera con marcador, datos y pique entre bandos
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'OFERTAS DE EMPLEO  ·  ESPAÑA'], [K.y2, 'EL PIQUE'], [K.los4, 'LO QUE DICE CADA BANDO'], [K.vamos, 'LOS DATOS'], [K.pero9, 'OPOSICIONES  ·  MÁSTER'], [K.entonces, 'VEREDICTO'], [K.equipo, 'TU TURNO']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function scoreAt(t) { return [t > K.punto8 + 0.25 ? 1 : 0, t > K.punto11 + 0.25 ? 1 : 0]; }
function headerFP(t, sub, msg) {
  hg.save(); hg.textBaseline = 'alphabetic'; const tk = clamp((t + 0.6) / 0.7);
  hg.letterSpacing = '8px'; hfont(46); hg.textAlign = 'left';
  const parts = [['FP', HC.teal], [' VS ', HC.grey], ['CARRERA', HC.amber]]; let x = 54, n = Math.floor(13 * tk);
  for (const [s, c] of parts) { const ss = s.slice(0, Math.max(0, n)); n -= s.length; hg.fillStyle = c; hg.fillText(ss, x, 142); x += hg.measureText(s).width; }
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  // marcador
  const [a, b] = scoreAt(t), pa = t > K.punto8 + 0.25 ? Math.exp(-(t - K.punto8 - 0.25) * 5) : 0, pb = t > K.punto11 + 0.25 ? Math.exp(-(t - K.punto11 - 0.25) * 5) : 0;
  hg.textAlign = 'right'; hg.letterSpacing = '3px'; hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('MARCADOR', 1024, 108);
  hfont(Math.round(52 * (1 + 0.5 * pb))); hg.fillStyle = HC.amber; hg.shadowColor = HC.amber; hg.shadowBlur = 20 * pb; hg.fillText(String(b), 1024, 166); const wb = hg.measureText(String(b)).width;
  hg.shadowBlur = 0; hfont(40, false); hg.fillStyle = HC.grey; hg.fillText('—', 1024 - wb - 16, 160); const wd = hg.measureText('—').width;
  hfont(Math.round(52 * (1 + 0.5 * pa))); hg.fillStyle = HC.teal; hg.shadowColor = HC.teal; hg.shadowBlur = 20 * pa; hg.fillText(String(a), 1024 - wb - wd - 32, 166); hg.shadowBlur = 0;
  if (msg) { const { txt, col, k, blink } = msg, on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = clamp(k); hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 240;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath(); hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke(); hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y); }
  hg.restore();
}
// «+1» que vuela desde la escena hasta el marcador
function plusOne(t, t0, col, x1) { const u = (t - t0) / 0.6; if (u < 0 || u > 1.2) return; const e = sm5(clamp(u));
  bigText('+1', lerp(540, x1, e), lerp(980, 150, e), Math.round(lerp(220, 60, e)), col, 1, { type: false, glow: 30, a: u > 1 ? 1 - (u - 1) * 5 : 1 }); }
function pill(txt, t, t0, t1, y = 1470) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(21, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - 28, w, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = HC.white; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function hudAt(t) {
  hudBegin();
  const A = S.arena.userData, V = S.verdict, G = S.gates.userData, C = S.cards;
  let msg = null;
  if (t >= K.las) msg = { txt: 'VEREDICTO · LAS DOS ✓', col: HC.white, k: clamp((t - K.las) / 0.3) };
  else if (t >= K.final) msg = { txt: 'VEREDICTO · ???', col: HC.white, k: clamp((t - K.final) / 0.2), blink: true };
  headerFP(t, sectAt(t), msg);
  // ---- 1: ofertas
  const s1 = ckk(t, K.fp1, K.y2 - 0.15, 0.35) * ckf(t, K.y2 - 0.15), s2 = ckk(t, K.dos1 - 0.1, K.y2 - 0.15, 0.35) * ckf(t, K.y2 - 0.15);
  bigText('FP · 46,96 %', 540, 1330, 76, HC.teal, s1, { type: false, glow: 18, ls: 6 });
  bigText('CARRERA · 21,42 %', 540, 1425, 76, HC.amber, s2, { type: false, glow: 18, ls: 6 });
  pill('INFOEMPLEO ADECCO · TODAS LAS OFERTAS DE 2024', t, K.ofertas, K.y2 - 0.2, 1530);
  // ---- 2: «nunca estará a su nivel»
  const nk = ckk(t, K.nunca + 0.1, K.tienen + 0.4, 0.5) * ckf(t, K.tienen + 0.4);
  if (nk > 0) { const a = proj(wpos(A.dF).add(v3(0.0, 1.3, 0))), b = proj(wpos(A.dC).add(v3(0.0, 1.3, 0))); dimV({ x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, '«SU NIVEL»', nk, HC.amber, 0); }
  // ---- 4-5: lo que dice cada bando
  co(t, K.dos4, K.vosotros, wpos(A.dF).add(v3(0, 1.3, 0)), '«2 AÑOS + PRÁCTICAS»', 'Y A TRABAJAR', { dx: -120, dy: -170, color: HC.teal, d: 0.45 });
  co(t, K.cuatro, K.responden, wpos(A.yC[3]).add(v3(0, 0.2, 0)), '«4 AÑOS DE TEORÍA»', 'DICEN LOS DE FP', { dx: 100, dy: -150, side: -1, color: HC.teal, d: 0.45 });
  co(t, K.herramientas, K.debajo, wpos(A.wr), '«SABÉIS USAR HERRAMIENTAS»', 'DICEN LOS DE LA CARRERA', { dx: 120, dy: -170, color: HC.amber, d: 0.45 });
  co(t, K.debajo, K.vamos + 0.3, wpos(A.under).add(v3(0.2, 0.1, 0)), '«LO QUE HAY DEBAJO»', null, { dx: 120, dy: -200, color: HC.amber, d: 0.4 });
  bigText('DATOS', 540, 980, 120, HC.white, ckk(t, K.datos - 0.05, K.programar, 0.3) * ckf(t, K.programar), { glow: 24, ls: 30 });
  // ---- 7-8: ningún título obligatorio · profesiones reguladas · punto FP
  stamp('NINGÚN TÍTULO OBLIGATORIO', 540, 1350, ckk(t, K.titulo, K.ingenieria + 0.8, 0.4) * ckf(t, K.ingenieria + 0.8), HC.white, 46);
  stamp('PUNTO PARA FP', 540, 1380, ckk(t, K.punto8, K.punto8 + 1.0, 0.4) * ckf(t, K.punto8 + 1.0), HC.teal, 64);
  plusOne(t, K.punto8 + 0.05, HC.teal, 890);
  // ---- 9-11: oposiciones, máster, punto carrera
  pill('ESTATUTO DEL EMPLEADO PÚBLICO · ART. 76', t, K.oposiciones, K.y10, 1530);
  co(t, K.grupo9 - 0.2, K.con9, wpos(G.kC), 'GRADO', 'ABRE A1 Y A2', { dx: -110, dy: 90, color: HC.amber, d: 0.4 });
  co(t, K.con9, K.y10, wpos(G.kF), 'TÉCNICO SUPERIOR', 'HASTA EL GRUPO B', { dx: -120, dy: 120, color: HC.teal, d: 0.4 });
  if (t > K.b9 && t < K.y10) { const p = proj(wpos(G.lv[3].g).add(v3(0.2, 0.25, 0.1))); stamp('✕', p.x, p.y, ckk(t, K.b9, K.y10, 0.25) * ckf(t, K.y10), HC.red, 70); }
  pill('REAL DECRETO 822/2021 · ACCESO AL MÁSTER', t, K.master - 0.3, K.punto11, 1530);
  if (t > K.master && t < K.universitario + 0.1) { const p = proj(wpos(G.md).add(v3(0.1, 0.9, 0.2))); stamp('✕', p.x, p.y, ckk(t, K.master, K.universitario, 0.25) * ckf(t, K.universitario), HC.red, 80); }
  stamp('PUNTO PARA LA CARRERA', 540, 1380, ckk(t, K.punto11, K.punto11 + 1.0, 0.4) * ckf(t, K.punto11 + 1.0), HC.amber, 56);
  plusOne(t, K.punto11 + 0.05, HC.amber, 1010);
  // ---- 13-14: veredicto
  if (V.rocket.visible) co(t, K.antes, K.tener, wpos(V.rocket), 'EMPEZAR ANTES', '2 AÑOS', { dx: 130, dy: 60, color: HC.teal, d: 0.4 });
  co(t, K.puertas, K.maestra, wpos(S.arena.userData.yC[3]).add(v3(0, 0.75, 0)), 'MÁS PUERTAS', 'OPOSICIONES A · MÁSTER', { dx: -120, dy: -120, color: HC.amber, d: 0.4 });
  if (V.bar.visible) co(t, K.selectividad, K.medio, wpos(V.bar), 'SIN SELECTIVIDAD', 'ENTRAS CON LA NOTA DEL FP', { dx: 130, dy: -150, color: HC.teal, d: 0.4 });
  if (V.ects.visible) co(t, K.medio, K.equipo, wpos(V.ects), 'MEDIO CURSO CONVALIDADO', 'RD 1618/2011 · MÍNIMO 30 ECTS', { dx: -100, dy: -150, color: HC.teal, d: 0.4 });
  // ---- 15: tu turno
  const ck = ckk(t, K.defiendelo, END - 1.3, 0.4) * ckf(t, END - 1.3);
  if (ck > 0) { hg.save(); hg.globalAlpha = ck; const y = 1440 + 8 * Math.sin(t * 6); glowStroke(HC.white, 3, 14); hg.fillStyle = 'rgba(0,0,0,.55)'; rr(hg, 300, y - 50, 480, 100, 50); hg.fill(); hg.stroke(); noGlow();
    hg.fillStyle = HC.white; hfont(34); hg.letterSpacing = '5px'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText('COMENTA ↓', 540, y + 2); hg.restore(); }
}
