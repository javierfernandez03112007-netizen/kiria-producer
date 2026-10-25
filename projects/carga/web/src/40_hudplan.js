// ---------------------------------------------------------------- qué pone el HUD en cada instante
const wp = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.6); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
let SECT = [], TERM = [];
function buildHudPlan() {
  SECT = [[-9, 'MÓVIL  ·  CARGADOR'], [K.truco, 'TX  ·  BOBINA EMISORA'], [K.crea, 'CAMPO  ·  BOBINA RECEPTORA'], [K.se6, 'INDUCCIÓN  ·  1831'], [K.parece, 'CORTE TRANSVERSAL'],
    [K.pero, 'PÉRDIDAS  ·  CALOR'], [K.en9, 'PRUEBA 2020  ·  0 → 100 %'], [K.por10, 'ALINEACIÓN MAGNÉTICA'], [K.y11, 'PROTOCOLO  ·  TX ⇄ RX'], [K.y14, 'DETECCIÓN DE OBJETOS'], [K.la15, 'MÓVIL  ·  CARGADOR']];
  TERM = [
    { t0: K.pregunta + 0.1, who: 'TX', txt: '¿HAY ALGUIEN?' },
    { t0: K.si11, who: 'RX', txt: 'SÍ, SOY COMPATIBLE ✓' },
    { t0: K.varias, who: 'RX', txt: '· · ·  CADA ≤ 250 ms', col: HC.grey },
    { t0: K.mas12, who: 'RX', txt: 'MÁS  ▲' },
    { t0: K.menos, who: 'RX', txt: 'MENOS  ▼' },
    { t0: K.asi, who: 'RX', txt: 'ASÍ ESTÁ BIEN  ●' },
    { t0: K.cuenta14 + 0.15, who: 'RX', txt: 'RECIBO ESTO  ▮▮▮▮' },
    { t0: K.cuadra, who: 'TX', txt: 'NO CUADRA  ✕', col: HC.red },
    { t0: K.corta, who: 'TX', txt: 'CORTO LA ENERGÍA  ■', col: HC.red, d: 0.4 },
  ];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
// flecha de corriente alrededor de la bobina (arco ámbar que gira en el sentido de la corriente)
function coilArrow(t, a) {
  if (a <= 0.01) return;
  const dir = curDir(t), rot = flowOff(t) * 0.9, pts = [];
  for (let i = 0; i <= 64; i++) { const ang = rot + i / 64 * Math.PI * 1.55; pts.push(proj(v3(Math.cos(ang) * 0.3, 0.07, Math.sin(ang) * 0.3))); }
  if (dir < 0) pts.reverse();
  hg.save(); hg.globalAlpha = a; glowStroke(HC.amber, 3, 14); hg.beginPath(); pts.forEach((p, i) => (i ? hg.lineTo(p.x, p.y) : hg.moveTo(p.x, p.y))); hg.stroke();
  const p1 = pts[pts.length - 1], p0 = pts[pts.length - 4], ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  hg.fillStyle = HC.amber; hg.beginPath(); hg.moveTo(p1.x + Math.cos(ang) * 18, p1.y + Math.sin(ang) * 18); hg.lineTo(p1.x + Math.cos(ang + 2.5) * 16, p1.y + Math.sin(ang + 2.5) * 16); hg.lineTo(p1.x + Math.cos(ang - 2.5) * 16, p1.y + Math.sin(ang - 2.5) * 16); hg.closePath(); hg.fill();
  noGlow(); hg.restore();
}
function hudAt(t) {
  hudBegin();
  const P = S.phone, C = S.charger, pu = P.userData, cu = C.userData;
  const rxW = wp(pu.rx), txW = wp(cu.tx), batW = wp(pu.parts.batt), phW = P.position.clone();
  // ---- cabecera y mensaje pendiente
  let msg = null;
  if (t >= K.estan) msg = { txt: 'MENSAJE · RECIBIDO ✓', col: HC.teal, k: clamp((t - K.estan) / 0.3) };
  else if (t >= K.y11) msg = { txt: 'MENSAJE · DESCIFRANDO', col: HC.amber, k: 1, blink: true };
  else if (t >= K.final) msg = { txt: 'MENSAJE · ???', col: HC.white, k: clamp((t - K.final) / 0.2), blink: true };
  header(t, sectAt(t), msg);
  // ---- la onda de voz entre las dos bobinas (al principio, «están hablando» y el bucle)
  const wa = Math.max(env(t, -2, K.apoyas + 0.15, 0.1, 0.2), env(t, K.estan - 0.05, K.tu15 + 0.3, 0.3, 0.4), win(t, END - 1.0, 0.6));
  if (wa > 0.01) waveform(proj(txW), proj(rxW), 14 + 75 * Math.max(voice(t), t > END - 1.2 ? 0.45 : 0), t, wa);
  // ---- 1-2: RX / TX, bocadillo y «te lo cuento al final»
  co(t, K.movil1, K.apoyas, rxW, 'RX', 'MÓVIL', { dx: -170, dy: -120, d: 0.4 });
  co(t, K.cargador1, K.apoyas, txW, 'TX', 'CARGADOR', { dx: 170, dy: 150, d: 0.4 });
  const bk = ckk(t, K.y2, K.final + 0.5, 0.35);
  if (bk > 0) bubble(proj(phW.clone().add(v3(0, 0.1, 0))), bk, clamp((t - K.cuento) / (K.final + 0.4 - K.cuento)), t, 900, 232);
  // ---- 3-4: la bobina emisora y su corriente
  co(t, K.dentro + 0.1, K.bobina3 - 0.1, v3(0.43, 0.09, 0.22), 'CARCASA', 'PLÁSTICO', { dx: 130, dy: -150, d: 0.4 });
  co(t, K.bobina3, K.cambia, txW.clone().add(v3(0.16, 0.01, 0.08)), 'BOBINA EMISORA', 'HILO DE COBRE · Cu', { dx: 120, dy: -190, color: HC.white });
  coilArrow(t, env(t, K.corriente4, K.crea + 0.1, 0.3, 0.3));
  const sa = env(t, K.corriente4, K.crea, 0.3, 0.3);
  if (sa > 0.01) { const f = 2 + 70 * Math.pow(clamp((t - K.cambia) / 2.6), 2); scope((u, tt) => Math.sin(Math.PI * 2 * u * f * (curDir(tt) > 0 ? 1 : 1) - tt * 14), t, sa, 'CORRIENTE · TX', '87–205 kHz'); }
  const ca = env(t, K.cienmil - 0.1, K.crea, 0.2, 0.3);
  if (ca > 0.01) { const n = Math.round(100000 * eo(clamp((t - K.cienmil + 0.1) / 0.55))), s = '+' + n.toLocaleString('es-ES').replace(/\./g, ' ');
    bigText(s, 56, 1350, 64, HC.amber, ca, { align: 'left', type: false, ls: 4, glow: 18 });
    bigText('CAMBIOS DE SENTIDO', 58, 1420, 20, HC.grey, ca, { align: 'left', bold: false, ls: 4 }); bigText('POR SEGUNDO', 58, 1452, 20, HC.grey, ca, { align: 'left', bold: false, ls: 4 }); }
  // ---- 5: campo y bobina receptora
  const st = S.field.up.scale.y;
  co(t, K.campo5, K.se6, v3(0.42 * Math.cos(0.3), 0.044 + 0.21 * st, 0.42 * Math.sin(0.3)), 'CAMPO MAGNÉTICO', null, { dx: 120, dy: -150, color: HC.teal });
  co(t, K.bobina5, K.se6, rxW, 'BOBINA RECEPTORA', 'DENTRO DEL MÓVIL', { dx: -140, dy: -170 });
  co(t, K.corriente5, K.se6, batW, 'CORRIENTE → BATERÍA', null, { dx: -120, dy: 150, color: HC.amber });
  // ---- 6: inducción · Faraday
  const ia = ckk(t, K.induccion, K.parece - 0.1, 0.5) * ckf(t, K.parece - 0.1);
  bigText('INDUCCIÓN', 540, 1380, 88, HC.teal, ia, { glow: 22 }); bigText('ELECTROMAGNÉTICA', 540, 1452, 24, HC.grey, ia, { bold: false, ls: 8 });
  const fa = ckk(t, K.faraday, K.parece + 0.1, 0.5) * ckf(t, K.parece + 0.1);
  bigText('M. FARADAY · 1831', 540, 1530, 36, HC.white, fa, { ls: 6 });
  const F = S.faraday;
  if (F.visible) { co(t, K.descubrio, K.parece, wp(F).add(v3(-0.33, 0.0, 0.05)), 'ANILLO DE HIERRO', null, { dx: -60, dy: -230, d: 0.45 });
    co(t, K.faraday + 0.1, K.parece, wp(F.userData.gal), 'GALVANÓMETRO', null, { dx: 40, dy: -200, side: -1, d: 0.45 }); }
  // ---- 7: «¿contacto?» y el corte: las bobinas no se tocan
  const ka = ckk(t, K.contacto, K.realidad + 0.3, 0.3) * ckf(t, K.realidad + 0.3);
  if (ka > 0) { const p = proj(v3(0.33, 0.1, 0.28)); brackets(p, 230, 130, ka); bigText('¿CONTACTO?', p.x, p.y - 100, 30, HC.white, ka, { ls: 5 }); }
  co(t, K.bobinas7, K.en9, v3(0.16, 0.111, 0), 'BOBINA RX', 'MÓVIL', { dx: 90, dy: -160, d: 0.45 });
  co(t, K.bobinas7 + 0.15, K.en9, v3(0.17, 0.0435, 0), 'BOBINA TX', 'CARGADOR', { dx: 90, dy: 170, d: 0.45 });
  const da = ckk(t, K.nunca, K.en9, 0.5) * ckf(t, K.en9);
  if (da > 0) dimV(proj(v3(-0.06, 0.05, 0)), proj(v3(-0.06, 0.105, 0)), 'NO SE TOCAN', da, HC.white, -120);
  // ---- 8: pérdidas y calor
  co(t, K.pierde, K.en9, v3(0.24, 0.075, -0.02), 'PÉRDIDAS', null, { dx: 110, dy: -200, color: HC.amber, d: 0.4 });
  co(t, K.calor, K.en9 + 0.2, v3(-0.12, 0.05, -0.01), 'CALOR', null, { dx: -110, dy: 200, color: '#FF8A4C', d: 0.35 });
  // ---- 9-10: barras de la prueba
  const bars = S.bars.userData.bars, top = b => v3(b.x, b.fill.scale.y + 0.02, b.z);
  const ta = ckk(t, K.prueba, K.por10, 0.6) * ckf(t, K.por10);
  if (ta > 0) { hg.save(); hg.globalAlpha = ta; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 150, 1440, 780, 56, 28); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke(); hg.restore();
    bigText('PRUEBA 2020 · MISMO MÓVIL · 0 → 100 %', 540, 1469, 22, HC.white, ta, { bold: false, ls: 3 }); }
  co(t, K.prueba + 0.35, K.descentrado + 0.2, top(bars[0]), 'CON CABLE', '14,26 Wh', { dx: -60, dy: -120, side: -1, len: 40, d: 0.45, subSize: 22, subCol: HC.white });
  co(t, K.gasto + 0.2, K.descentrado + 0.2, top(bars[1]), 'SIN CABLE', '21,01 Wh', { dx: -40, dy: -170, side: -1, len: 40, d: 0.45, subSize: 22, subCol: HC.amber });
  co(t, K.cincuenta, K.aun + 0.1, top(bars[1]).add(v3(0.2, -0.1, 0)), '+47 %', 'MÁS ENERGÍA', { dx: 160, dy: -60, size: 58, color: HC.amber, d: 0.35 });
  co(t, K.descentrado, K.por10, phW.clone().add(v3(0.1, 0.04, 0.1)), 'DESCENTRADO', null, { dx: 120, dy: 140, color: HC.red, d: 0.4 });
  co(t, K.aun + 0.25, K.por10, top(bars[2]), '+80 %', '25,62 Wh', { dx: -140, dy: 60, size: 58, color: '#FF7A55', d: 0.35 });
  // ---- 10: imanes
  co(t, K.imanes, K.y11, v3(0.3 * Math.cos(0.6), 0.07, 0.3 * Math.sin(0.6)), 'IMANES', 'ALINEAN LAS BOBINAS', { dx: 130, dy: -170, d: 0.45 });
  co(t, K.centran + 0.15, K.y11, phW.clone().add(v3(0, 0.05, 0)), 'CENTRADO ✓', null, { dx: -120, dy: -200, color: HC.teal, d: 0.35 });
  // ---- 11-14: la conversación
  terminal(TERM, t, env(t, K.el11, K.la15 + 0.2, 0.35, 0.4));
  const ga = env(t, K.pide, K.se13 + 0.1, 0.3, 0.3);
  if (ga > 0) { const v = keyed(t, [[K.pide, 0.55], [K.mas12 + 0.25, 0.55], [K.mas12 + 0.5, 0.82], [K.menos + 0.25, 0.82], [K.menos + 0.5, 0.38], [K.asi + 0.25, 0.38], [K.asi + 0.5, 0.6]]);
    hbars([{ name: 'POTENCIA', v, col: HC.amber, txt: v > 0.7 ? '▲' : v < 0.45 ? '▼' : '●' }], t, ga, 'CONTROL DE POTENCIA'); }
  const ma = env(t, K.se13, K.y14 + 0.1, 0.3, 0.3);
  if (ma > 0) { scope((u, tt) => { const x = u * 4.2 - (tt - K.se13) * 2.2; let tap = 0, acc = 0; for (const d of MORSE) { const s = (x % 4.2 + 4.2) % 4.2; if (s >= acc && s < acc + d * 2.4) tap = 1; acc += d * 2.4 + 0.17; } return Math.sin(Math.PI * 2 * u * 30) * (tap ? 0.45 : 1); }, t, ma, 'MODULACIÓN DE CARGA', 'RX → TX', HC.teal);
    bigText('·  —  ·  ·  —', 832, 1222, 40, HC.amber, ckk(t, K.como13, K.y14, 0.4) * ckf(t, K.y14), { glow: 16, ls: 6 }); }
  const ea = env(t, K.cuenta14, K.corta + 0.7, 0.3, 0.3);
  if (ea > 0) { const bad = win(t, K.cuadra, 0.35); hbars([{ name: 'ENVÍA', v: 0.86, col: HC.teal }, { name: 'RECIBE', v: 0.86 - 0.32 * bad, col: HC.amber, gap: 0.32 * bad, txt: bad > 0.5 ? 'Δ NO CUADRA' : '' }], t, ea, 'BALANCE DE ENERGÍA'); }
  if (S.coin.visible) co(t, K.moneda, K.corta + 0.6, wp(S.coin), 'MONEDA', 'SE CALIENTA', { dx: 120, dy: 170, color: '#FF7A55', d: 0.35 });
  if (S.key.visible) co(t, K.llaves, K.corta + 0.6, wp(S.key), 'LLAVES', null, { dx: -110, dy: 190, color: '#FF7A55', d: 0.35 });
  stamp('CORTE', 540, 980, ckk(t, K.corta, K.la15, 0.5) * ckf(t, K.la15));
  // ---- 15: ¿con cable o sin cable?
  if (S.usb.visible) co(t, K.con15, END - 1.3, wp(S.usb).add(v3(0, 0.16, 0)), 'CON CABLE', null, { dx: -40, dy: -170, side: -1, d: 0.35 });
  co(t, K.sin15, END - 1.3, txW.clone().add(v3(0.2, 0.06, 0.2)), 'SIN CABLE', null, { dx: 120, dy: -190, d: 0.35 });
}
