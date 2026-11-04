// ---------------------------------------------------------------- HUD: cabecera del duelo, rótulos y el marcador (trabajo y sueldo)
function buildHudPlan() {}
const TEAL_H = '#35D6C6', AMB_H = '#FFB547';
const cw = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
function lab(P, txt, sub, k, opt) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 27, subSize: 19, bg: true, ...opt }); }
const fmtE = v => Math.round(v).toLocaleString('es-ES').replace(/ /g, '.') + ' €';
function hdr(t) {
  hg.save(); hg.textBaseline = 'alphabetic'; hg.textAlign = 'left'; hg.letterSpacing = '6px'; hfont(40);
  let x = 54; for (const [s, c] of [['QUÍMICA', TEAL_H], [' VS ', HC.white], ['ING. QUÍMICA', AMB_H]]) { hg.fillStyle = c; hg.fillText(s, x, 142); x += hg.measureText(s).width; }
  hg.letterSpacing = '4px'; hfont(22, false); hg.fillStyle = HC.grey; hg.fillText('DUELO DE CARRERAS', 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  // la pregunta abierta, arriba a la derecha, hasta la respuesta
  const k = cw(t, K.cobra3, K.n27_9, 0.3, 0.3);
  if (k > 0.01) { const on = Math.sin(t * 9) > -0.3, txt = '¿QUIÉN COBRA MÁS?'; hg.globalAlpha = k; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 150; hg.strokeStyle = AMB_H; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10); hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = AMB_H; if (on) hg.fillText(txt, x1 - 15, y); }
  hg.restore();
}
function panel(x, y, w, h, a, border = 'rgba(238,242,246,.22)') { hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(4,6,10,.72)'; rr(hg, x, y, w, h, 18); hg.fill(); hg.strokeStyle = border; hg.lineWidth = 1.5; rr(hg, x, y, w, h, 18); hg.stroke(); hg.restore(); }
function txt(s, x, y, size, col, a = 1, o = {}) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = a; hg.textAlign = o.align || 'left'; hg.textBaseline = 'middle'; hg.letterSpacing = (o.ls ?? 3) + 'px'; hfont(size, o.bold ?? true); hg.fillStyle = col; hg.fillText(o.type === undefined ? s : typed(s, o.type), x, y); hg.restore(); }
function check(x, y, k, col) { if (k <= 0.01) return; const e = eo(clamp(k / 0.4)); hg.save(); hg.globalAlpha = clamp(k * 3); hg.strokeStyle = col; hg.lineWidth = 6; hg.lineCap = 'round'; hg.beginPath(); hg.moveTo(x - 14, y); hg.lineTo(x - 14 + 10 * clamp(e * 2), y + 10 * clamp(e * 2)); if (e > 0.5) hg.lineTo(x - 4 + 20 * (e - 0.5) * 2, y + 10 - 22 * (e - 0.5) * 2); hg.stroke(); hg.restore(); }
function person(x, y, s, col, a) { hg.save(); hg.globalAlpha = a; hg.fillStyle = col; hg.beginPath(); hg.arc(x, y - 22 * s, 10 * s, 0, 7); hg.fill(); rr(hg, x - 12 * s, y - 8 * s, 24 * s, 34 * s, 9 * s); hg.fill(); hg.restore(); }
function chip(s, x, y, col, k, size = 34) { if (k <= 0.01) return; const sc = 0.8 + 0.2 * eo(clamp(k * 2)); hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.translate(x, y); hg.scale(sc, sc); hg.letterSpacing = '4px'; hfont(size); const w = hg.measureText(s).width + 56, h = size * 1.9;
  hg.fillStyle = 'rgba(4,6,10,.8)'; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 3; rr(hg, -w / 2, -h / 2, w, h, h / 2); hg.stroke(); hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(s, 0, 2); hg.restore(); }
function hudAt(t) {
  hudBegin(); hdr(t);
  // 1: química e ingeniería química, «¿la misma carrera?»
  if (S.tube.visible) lab(v3(TUBE.x + TUBE.r * 0.95, BENCH.y + 1.15, TUBE.z), 'QUÍMICA', null, cw(t, K.quimica1 - 0.05, K.realidad2), { dx: -150, dy: 230, color: TEAL_H });
  lab(S.plant.getWorldPosition(new THREE.Vector3()).add(v3(0, 0.18, 0)), 'INGENIERÍA QUÍMICA', null, cw(t, K.ingenieria1 - 0.05, K.realidad2), { dx: 140, dy: 300, color: AMB_H });
  bigText('¿LA MISMA CARRERA?', W / 2, 1640, 50, HC.white, cw(t, K.misma1 - 0.05, K.realidad2 + 0.1), { dark: 22 });
  // 2: gramos y toneladas
  { const k = cw(t, K.gramos2 - 0.05, K.otra2, 0.2, 0.25); if (k > 0.01) { panel(330, 1420, 420, 170, k); txt('GRAMOS', W / 2, 1468, 24, HC.grey, k, { align: 'center', bold: false }); txt('0,50 g', W / 2, 1535, 66, TEAL_H, k, { align: 'center', ls: 2 }); } }
  bigText('TONELADAS', W / 2, 1560, 92, AMB_H, cw(t, K.toneladas2 - 0.05, K.cual3 - 0.05, 0.15, 0.3), { dark: 26, glow: 16 });
  // 3: la pregunta
  bigText('¿QUIÉN COBRA MÁS?', W / 2, 1480, 64, HC.white, cw(t, K.cual3 - 0.05, K.primero4 - 0.05), { dark: 24 });
  bigText('TE LO DIGO AL FINAL', W / 2, 1565, 30, HC.grey, cw(t, K.digo3 - 0.1, K.primero4 - 0.05), { dark: 18 });
  // 4: 1.º curso, casi igual
  { const k = cw(t, K.primero4 - 0.05, K.separan5 + 0.15, 0.25, 0.3);
    if (k > 0.01) { const x = 90, y = 1230, w = 900, h = 470; panel(x, y, w, h, k);
      txt('1.º CURSO', x + 36, y + 52, 30, HC.white, k); txt('QUÍMICA', x + 560, y + 52, 22, TEAL_H, k, { align: 'center' }); txt('ING. QUÍMICA', x + 760, y + 52, 22, AMB_H, k, { align: 'center' });
      [['Química', K.quimica4], ['Matemáticas', K.matematicas4], ['Física', K.fisica4], ['Laboratorio', K.laboratorio4]].forEach(([s, t0], i) => {
        const yy = y + 130 + i * 82, kk = win(t, t0 - 0.06, 0.3) * k; if (kk <= 0.01) return;
        hg.save(); hg.globalAlpha = k * 0.35; hg.fillStyle = 'rgba(238,242,246,.4)'; hg.fillRect(x + 36, yy - 40, w - 72, 1.2); hg.restore();
        txt(s, x + 36, yy, 34, HC.white, kk, { bold: false, ls: 1, type: clamp(kk * 1.6) }); check(x + 560, yy - 6, kk, TEAL_H); check(x + 760, yy - 6, clamp((t - t0 - 0.12) / 0.3) * k, AMB_H); });
      stamp('CASI IGUAL', W / 2, y + h + 70, cw(t, K.laboratorio4 + 0.35, K.separan5 + 0.15, 0.2, 0.3), TEAL_H, 52); } }
  // 5: el químico: moléculas, algo nuevo, tubo de ensayo
  if (S.mol.visible) { lab(S.atoms[1].getWorldPosition(new THREE.Vector3()), 'MOLÉCULAS', null, cw(t, K.moleculas5 - 0.05, K.nuevo5 - 0.1), { dx: 130, dy: 280, color: TEAL_H });
    lab(S.newAtom.getWorldPosition(new THREE.Vector3()), 'SUSTANCIA NUEVA', null, cw(t, K.nuevo5 - 0.05, K.tubo5 - 0.05), { dx: -120, dy: 300, color: AMB_H }); }
  lab(v3(RACK.x, BENCH.y + 0.22, RACK.z), 'TUBO DE ENSAYO', null, cw(t, K.tubo5 - 0.05, K.ingeniero6 - 0.1), { dx: 120, dy: 280, color: HC.white });
  // 6: la fábrica: receta, reactor, columna, tuberías, toneladas, seguras y baratas
  if (S.recipe.visible) lab(S.recipe.position.clone(), 'RECETA', null, cw(t, K.receta6 - 0.05, K.fabrica6 + 0.2, 0.2, 0.2), { dx: 140, dy: 200, color: HC.white });
  lab(v3(-3.3, 4.6, -9.6), 'REACTOR', null, cw(t, K.reactores6 - 0.05, K.columnas6 - 0.05, 0.2, 0.2), { dx: 140, dy: 260, color: AMB_H });
  lab(v3(1.9, 8.6, -11.6), 'COLUMNA DE DESTILACIÓN', null, cw(t, K.columnas6 - 0.05, K.tuberias6 - 0.05, 0.2, 0.2), { dx: -140, dy: 360, color: AMB_H });
  lab(v3(2.4, 3.98, -5.25), 'TUBERÍAS', null, cw(t, K.tuberias6 - 0.05, K.salgan6, 0.2, 0.2), { dx: 140, dy: 300, color: AMB_H });
  if (S.truck.visible) lab(S.truck.getWorldPosition(new THREE.Vector3()).add(v3(-0.6, 3.2, 0)), 'TONELADAS AL DÍA', null, cw(t, K.toneladas6 - 0.05, K.seguras6, 0.2, 0.25), { dx: -140, dy: 320, color: AMB_H });
  chip('✓ SEGURAS', 330, 1560, AMB_H, cw(t, K.seguras6 - 0.05, K.uno7 - 0.1, 0.15, 0.25), 34); chip('✓ BARATAS', 760, 1560, AMB_H, cw(t, K.baratas6 - 0.05, K.uno7 - 0.1, 0.15, 0.25), 34);
  // 7: dónde acaba cada uno
  { const k = cw(t, K.uno7 - 0.05, K.trabajo8 - 0.05, 0.25, 0.3);
    if (k > 0.01) { const cols = [[60, TEAL_H, 'QUÍMICO', [['LABORATORIOS', K.laboratorios7], ['INVESTIGACIÓN', K.investigacion7], ['FARMACÉUTICAS', K.farmaceuticas7]], K.uno7],
      [560, AMB_H, 'ING. QUÍMICO', [['PLANTAS QUÍMICAS', K.plantas7], ['REFINERÍAS', K.refinerias7], ['DEPURADORAS', K.depuradoras7]], K.otro7]];
      for (const [x, col, title, items, t0] of cols) { const kk = win(t, t0 - 0.08, 0.3) * k; if (kk <= 0.01) continue; panel(x, 1420, 460, 330, kk, col);
        txt(title, x + 32, 1472, 28, col, kk); items.forEach(([s, ti], i) => { const ki = win(t, ti - 0.06, 0.25) * k; txt('· ' + s, x + 32, 1550 + i * 64, 27, HC.white, ki, { bold: false, ls: 2, type: clamp(ki * 1.5) }); }); } } }
  // 8: trabajo: unos 8 de cada 10 (afiliados a la Seguridad Social)
  { const k = cw(t, K.trabajo8 - 0.05, K.pero9 + 0.15, 0.25, 0.3);
    if (k > 0.01) { panel(70, 1250, 940, 440, k); txt('TRABAJANDO · 4 AÑOS DESPUÉS', 104, 1300, 24, HC.grey, k, { bold: false });
      [[TEAL_H, 'QUÍMICA', '81,2 %', 1420], [AMB_H, 'ING. QUÍMICA', '84,6 %', 1580]].forEach(([col, name, pc, y], r) => {
        txt(name, 104, y - 62, 22, col, k);
        for (let i = 0; i < 10; i++) { const on = i < 8, ki = clamp((t - K.n8_8 + 0.3 - i * 0.05) / 0.25); person(130 + i * 66, y + 10, 1.25, on && ki > 0 ? col : 'rgba(238,242,246,.22)', k * (on ? 0.35 + 0.65 * ki : 0.6)); }
        txt(pc, 980, y + 6, 36, col, k * win(t, K.n10_8 - 0.1, 0.3), { align: 'right', ls: 1 }); }); } }
  // 9 y 10: lo que ganan (base media de cotización), con la diferencia
  { const k = cw(t, K.pero9 + 0.05, K.eso11 + 0.1, 0.3, 0.35);
    if (k > 0.01) { const x = 70, y = 1080, w = 940, h = 660, base = y + h - 120, top = y + 150, MX = 34000;
      panel(x, y, w, h, k); txt('LO QUE GANAN · 4 AÑOS DESPUÉS', x + 34, y + 50, 26, HC.white, k); txt('BASE MEDIA DE COTIZACIÓN AL AÑO', x + 34, y + 90, 20, HC.grey, k, { bold: false });
      const bars = [[x + 250, TEAL_H, 'QUÍMICA', 27253, K.n27_9], [x + 690, AMB_H, 'ING. QUÍMICA', 31202, K.n31_10]];
      for (const [bx, col, name, v, t0] of bars) { const g = eio(clamp((t - t0 + 0.15) / 0.8)), val = v * g, hh = (base - top) * val / MX;
        hg.save(); hg.globalAlpha = k; hg.fillStyle = 'rgba(238,242,246,.08)'; hg.fillRect(bx - 80, top, 160, base - top);
        hg.shadowColor = col; hg.shadowBlur = 18; hg.fillStyle = col; hg.fillRect(bx - 80, base - hh, 160, hh); hg.restore();
        txt(name, bx, base + 44, 24, col, k, { align: 'center' }); if (g > 0.01) txt(fmtE(val), bx, base - hh - 40, 44, HC.white, k, { align: 'center', ls: 1 }); }
      const kd = win(t, K.casi10 - 0.05, 0.35) * k;
      if (kd > 0.01) { const y1 = base - (base - top) * 27253 / MX, y2 = base - (base - top) * 31202 / MX, xx = x + 460; hg.save(); hg.globalAlpha = kd; hg.strokeStyle = AMB_H; hg.lineWidth = 3; hg.setLineDash([10, 8]);
        hg.beginPath(); hg.moveTo(x + 330, y1); hg.lineTo(xx + 140, y1); hg.stroke(); hg.setLineDash([]); hg.beginPath(); hg.moveTo(xx + 10, y1); hg.lineTo(xx + 10, y2); hg.stroke(); hg.restore();
        txt('+3.949 €', xx + 10, y1 + 62, 40, AMB_H, kd, { align: 'center', ls: 1 }); }
      txt('FUENTE: U-RANKING 2025 (FUNDACIÓN BBVA-IVIE) · SEG. SOCIAL · EGRESADOS DE 2019', W / 2, y + h - 28, 15, HC.grey, k * 0.9, { align: 'center', bold: false, ls: 1 }); } }
  // 11: sin el químico…
  stamp('SIN QUÍMICO', W / 2, 1500, cw(t, K.sin11 - 0.05, K.nada11 + 0.1, 0.2, 0.3), HC.red, 64);
  bigText('NADA QUE FABRICAR', W / 2, 1610, 38, HC.white, cw(t, K.nada11 - 0.05, TT.relight + 0.2, 0.2, 0.3), { dark: 20 });
  // 12: ¿laboratorio o fábrica?
  bigText('¿LABORATORIO O FÁBRICA?', W / 2, 1400, 58, HC.white, cw(t, K.laboratorio12 - 0.05, END - 1.15, 0.2, 0.4), { dark: 24 });
  chip('EQUIPO QUÍMICA', W / 2, 1540, TEAL_H, cw(t, K.equipo12 - 0.05, END - 1.15, 0.15, 0.4), 32);
  chip('EQUIPO ING. QUÍMICA', W / 2, 1660, AMB_H, cw(t, K.equipo12b - 0.05, END - 1.15, 0.15, 0.4), 32);
}
