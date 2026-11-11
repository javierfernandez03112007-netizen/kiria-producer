// ---------------------------------------------------------------- HUD: cabecera (huelga general · 24 h) con la pregunta pendiente (¿te pueden despedir?), titulares de cada frase
// en placas oscuras (se leen sobre el cielo y la calle) y rótulos sobre los objetos
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF', HR = '#FF5247';
function hdr(t) {
  hg.save(); const gr = hg.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, 'rgba(6,10,18,.55)'); gr.addColorStop(1, 'rgba(6,10,18,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, W, 300);
  hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = 10;
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = '#ffffff'; hg.textAlign = 'left'; hg.fillText('HUELGA GENERAL', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = '#E3E8EE'; hg.fillText('11 DE NOVIEMBRE · TODA ESPAÑA', 56, 182);
  hg.fillStyle = 'rgba(255,255,255,.45)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('DURACIÓN', 1024, 112);
  hfont(32); hg.fillStyle = HR; hg.fillText('24 HORAS', 1024, 148);
  hfont(17, false); hg.fillStyle = '#E3E8EE'; hg.fillText('00:00 – 24:00', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, END - 0.9, 0.4));
  if (mk > 0.01) {
    let txt = '¿TE PUEDEN DESPEDIR? · ???', col = HR, blink = true;
    if (t > K.despedir9) { txt = '¿DESPEDIR? NO ✓'; col = HC.green; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.shadowBlur = 0; hg.fillStyle = 'rgba(8,10,14,.6)'; hg.fillRect(x0, y - 22, w, 32);
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));
// titular en una placa oscura redondeada (ancho según el texto)
function cap(txt, y, size, col, k, o = {}) {
  if (k <= 0.01) return; hg.save(); hg.letterSpacing = (o.ls ?? Math.round(size * 0.12)) + 'px'; hfont(size); const tw = hg.measureText(txt).width, pw = tw + size * 1.1, ph = size * 1.55, x = o.x ?? W / 2;
  const e = eo(clamp(k * 1.4)); hg.globalAlpha = clamp(k * 3) * 0.78; hg.fillStyle = o.bg || 'rgba(10,12,18,1)'; rr(hg, x - pw / 2 * e, y - ph / 2, pw * e, ph, ph * 0.22); hg.fill();
  if (o.bar) { hg.globalAlpha = clamp(k * 3); hg.fillStyle = o.bar; hg.fillRect(x - pw / 2 * e, y - ph / 2, 8, ph); } hg.restore();
  bigText(txt, x, y + 2, size, col, k, { glow: o.glow, type: o.type, ls: o.ls ?? Math.round(size * 0.12) });
}
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
function checklist(items, x, y, t, a = 1, size = 40) {
  for (let i = 0; i < items.length; i++) { const [txt, t0, col] = items[i], k = cw(t, t0 - 0.08, 1e9) * a; if (k <= 0.01) continue;
    hg.save(); hg.letterSpacing = '3px'; hfont(size); const tw = hg.measureText(txt).width; hg.globalAlpha = clamp(k * 3) * 0.78; hg.fillStyle = 'rgba(10,12,18,1)'; rr(hg, x - 22, y + i * (size * 1.6) - size * 0.75, tw + 44, size * 1.5, 12); hg.fill(); hg.restore();
    bigText(txt, x, y + i * (size * 1.6), size, col || HC.white, k, { align: 'left', ls: 3 }); }
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1440;
  // L1
  { cap('EN TODA ESPAÑA', Y, 66, HR, cw(t, K.toda1 - 0.1, K.solo1 - 0.1), { glow: 12, bar: HR }); cap('NO SOLO POR LOS SUELDOS', Y, 50, HG, cw(t, K.solo1 - 0.05, K.si2 - 0.05), { bar: HG }); }
  // L2
  { const q = cw(t, K.despedir2 - 0.1, K.primera3 - 0.15); cap('¿TE PUEDEN DESPEDIR?', Y, 58, HR, q, { glow: 10, bar: HR }); cap('LA RESPUESTA, AL FINAL ↓', Y + 100, 32, '#ffffff', cw(t, K.digo2 - 0.05, K.primera3 - 0.15)); }
  // L3
  { cap('LA PRIMERA DE CCOO Y UGT', Y - 40, 44, '#ffffff', cw(t, K.primera3 - 0.05, K.sindicatos3 - 0.1)); cap('EN 14 AÑOS', Y + 50, 70, HG, cw(t, K.catorce3 - 0.1, K.sindicatos3 - 0.1), { glow: 12, type: false, bar: HG });
    cap('+ OTROS SINDICATOS', Y - 40, 44, '#ffffff', cw(t, K.sindicatos3 - 0.05, K.lema3 - 0.1)); cap('+ SINDICATO DE INQUILINAS', Y + 50, 44, HD, cw(t, K.inquilinas3 - 0.05, K.lema3 - 0.1));
    const l = cw(t, K.lema3 - 0.1, K.piden4 - 0.15); cap('SU LEMA', Y - 90, 34, HC.grey, l); cap('SALARIOS', Y - 10, 60, HG, cw(t, K.salarios3 - 0.1, K.piden4 - 0.15), { type: false }); cap('VIVIENDA', Y + 85, 60, '#ffffff', cw(t, K.vivienda3 - 0.1, K.piden4 - 0.15), { type: false }); cap('PRECIOS', Y + 180, 60, HD, cw(t, K.precios3 - 0.1, K.piden4 - 0.15), { type: false }); }
  // L4
  { const a = cw(t, K.piden4 - 0.05, K.vivienda5 - 0.2); cap('LO QUE PIDEN', Y - 120, 34, HC.grey, a);
    checklist([['↑ SUELDOS: HASTA +7 %', K.sueldos4, HG], ['↓ BAJAR LOS ALQUILERES', K.bajar4, HC.green], ['✗ DESAHUCIOS SIN ALTERNATIVA', K.desahucio4, HR]], 120, Y - 40, t, a, 40); }
  // L5
  { cap('¿VIVIENDA EN UNA HUELGA LABORAL?', Y, 40, '#ffffff', cw(t, K.vivienda5 - 0.05, K.dicen5 - 0.05));
    const d = cw(t, K.dicen5 - 0.05, K.asociacion6 - 0.2); cap('SEGÚN LOS SINDICATOS', Y - 70, 30, HC.grey, d); cap('EL SUELDO YA NO LLEGA', Y + 10, 52, HG, d, { bar: HG }); cap('PARA EL ALQUILER', Y + 100, 52, '#ffffff', cw(t, K.alquiler5 - 0.1, K.asociacion6 - 0.2));
    lab(PS.sc.userData.pans[0], 0, -0.5, 0, 'SUELDO', null, cw(t, K.sueldo5 - 0.05, K.asociacion6 - 0.2), { dx: -90, dy: -120, color: HG }); lab(PS.sc.userData.pans[1], 0, -0.3, 0, 'ALQUILER', null, cw(t, K.alquiler5 - 0.05, K.asociacion6 - 0.2), { dx: 90, dy: -150 }); }
  // L6
  { const c = cw(t, K.asociacion6 - 0.05, K.y7 - 0.15); cap('SEGÚN UNA ASOCIACIÓN DE PYMES', Y - 80, 32, '#ffffff', c);
    const n = Math.round(lerp(1850, 4560, eo(clamp((t - K.n4560 + 0.1) / 0.8)))); cap((t > K.n1850 - 0.1 ? '1.850 – ' : '') + (t > K.n4560 - 0.15 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '…') + ' M€', Y + 15, 72, HG, cw(t, K.n1850 - 0.1, K.y7 - 0.15), { glow: 14, type: false, bar: HG });
    cap('LO QUE COSTARÍA HOY · ESTIMACIÓN', Y + 105, 26, HC.grey, cw(t, K.millones6 - 0.1, K.y7 - 0.15)); }
  // L7
  { const p = cw(t, K.patronal7 - 0.05, K.dos7 - 0.15); cap('LA PATRONAL (CEOE) LA LLAMA', Y - 40, 34, '#ffffff', p); cap('«ELECTORAL»', Y + 50, 78, HR, cw(t, K.electoral7 - 0.1, K.dos7 - 0.15), { glow: 14, type: false, bar: HR });
    const k2 = cw(t, K.dos7 - 0.1, K.hoy8 - 0.15); cap('11 · HUELGA', Y - 60, 40, HR, k2, { bar: HR }); cap('13 · EMPIEZA LA CAMPAÑA', Y + 25, 40, HG, cw(t, K.campana7 - 0.1, K.hoy8 - 0.15), { bar: HG }); cap('29 · ELECCIONES GENERALES', Y + 110, 40, HD, cw(t, K.generales7 - 0.05, K.hoy8 - 0.15), { bar: HD }); }
  // L8
  { const h = cw(t, K.hoy8 - 0.05, K.y9 - 0.2); checklist([['00:00 · EMPIEZAN LOS PAROS', K.paros8, HR], ['SERVICIOS MÍNIMOS', K.minimos8, HD], ['MANIFESTACIONES EN MUCHAS CIUDADES', K.manifestaciones8, HG]], 90, Y - 60, t, h, 36); }
  // L9
  { const a = cw(t, K.y9 - 0.05, K.tu10 - 0.2); cap('¿Y EL DESPIDO?', Y - 130, 40, '#ffffff', cw(t, K.y9 - 0.05, K.despedir9 - 0.1));
    checklist([['✓ NO TE PUEDEN DESPEDIR NI SANCIONAR', K.despedir9, HC.green], ['✓ NO TIENES QUE AVISAR', K.avisar9, HC.green], ['✓ NO PUEDEN SUSTITUIRTE', K.sustituirte9, HC.green], ['✗ ESE DÍA NO COBRAS', K.cobras9, HR]], 70, Y - 70, t, a, 34);
    cap('CONSTITUCIÓN · ART. 28.2', Y - 150, 36, HG, cw(t, K.fundamental9 - 0.05, K.tu10 - 0.2), { bar: HG }); }
  // L10
  { const d = cw(t, K.tu10 - 0.05, K.mandaselo10 - 0.05); cap('¿LA HACES', Y - 40, 70, HR, d, { glow: 10, type: false, bar: HR }); cap('O VAS A TRABAJAR?', Y + 60, 70, HG, cw(t, K.trabajar10 - 0.1, K.mandaselo10 - 0.05), { glow: 10, type: false, bar: HG });
    const m = cw(t, K.mandaselo10 - 0.05, END - 0.6); cap('MÁNDASELO A QUIEN', Y - 30, 46, '#ffffff', m); cap('NO SABE SI PUEDE HACERLA', Y + 60, 46, HG, cw(t, K.quien10 - 0.05, END - 0.6), { bar: HG }); }
}
