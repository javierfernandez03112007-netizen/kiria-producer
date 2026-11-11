// ---------------------------------------------------------------- HUD: cabecera con el «mensaje pendiente» (lo del brazo), titulares de cada asignatura y rótulos con línea guía
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
const HG = '#FFC24A', HD = '#8FE6FF', HT = '#62E3D4';
function hdr(t) {
  const a = 1 - 0.85 * whiteAt(t); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic';
  const tk = 1;     // la cabecera ya está escrita en el primer fotograma (así enlaza con el último)
  hg.letterSpacing = '9px'; hfont(44); hg.fillStyle = HC.white; hg.textAlign = 'left'; hg.fillText(typed('VETERINARIA', tk), 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(typed('EL GRADO, POR DENTRO', tk), 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 196, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '3px';
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('GRADO', 1024, 112);
  hfont(32); hg.fillStyle = HG; hg.fillText('300 ECTS', 1024, 148);
  hfont(17, false); hg.fillStyle = HC.grey; hg.fillText('5 AÑOS', 1024, 178);
  const mk = win(t, K.final2, 0.3) * (1 - win(t, K.asi11 + 0.6, 0.4));
  if (mk > 0.01) {
    let txt = 'LO DEL BRAZO · ???', col = HC.red, blink = true;
    if (t > K.reproduccion10) { txt = 'REPRODUCCIÓN ✓'; col = HC.green; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = a * mk; hfont(19); hg.letterSpacing = '3px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.strokeStyle = col; hg.lineWidth = 1.5; hg.beginPath();
    hg.moveTo(x0 + 10, y - 22); hg.lineTo(x0, y - 22); hg.lineTo(x0, y + 10); hg.lineTo(x0 + 10, y + 10);
    hg.moveTo(x1 - 10, y - 22); hg.lineTo(x1, y - 22); hg.lineTo(x1, y + 10); hg.lineTo(x1 - 10, y + 10); hg.stroke();
    hg.fillStyle = col; if (on) hg.fillText(txt, x1 - 15, y);
  }
  hg.restore();
}
const cw = (t, t0, t1) => win(t, t0, 0.25) * (1 - win(t, t1, 0.25));        // ventana de un rótulo
function lab(o, x, y, z, txt, sub, k, opt) { if (k <= 0.01 || !o.visible) return; callout(wpo(o, x, y, z), txt, sub, k, { size: 26, subSize: 19, bg: true, ...opt }); }
// lista con marcas (✓) que se van encendiendo
function checklist(items, x, y, t, a = 1, size = 40) {
  for (let i = 0; i < items.length; i++) { const [txt, t0, col] = items[i], k = cw(t, t0 - 0.08, 1e9) * a; if (k <= 0.01) continue;
    bigText('✓ ' + txt, x, y + i * (size * 1.5), size, col || HC.white, k, { align: 'left', dark: 22, ls: 4 }); }
}
function hudAt(t) {
  hudBegin(); hdr(t);
  const Y = 1430;
  // L1: el guante largo · la vaca
  if (S.glove.visible) lab(S.glove.userData.hand, 0, 0.12, 0, 'GUANTE LARGO', 'HASTA EL HOMBRO', cw(t, K.entero1 - 0.1, K.dentro1 + 0.2), { dx: -120, dy: -120, color: '#FF9A4A' });
  { const k = cw(t, K.dentro1 - 0.05, K.por2 - 0.1); if (k > 0.01) bigText('DENTRO DE UNA VACA', W / 2, Y + 40, 56, HC.white, k, { glow: 10, dark: 26 }); }
  // L2: ¿por qué?
  { const q = cw(t, K.por2 - 0.05, K.crees3 - 0.1); if (q > 0.01) bigText('?', W / 2, Y - 30, 240, HC.red, q, { glow: 34, type: false, dark: 34 }); }
  // L3: mascotas → muchos animales
  { const k = cw(t, K.mascotas3 - 0.1, K.realidad3); if (k > 0.01) bigText('MASCOTAS', W / 2, Y, 80, HD, k, { glow: 18, dark: 28 });
    const m = cw(t, K.muchos3 - 0.1, CUTS[0] - 0.25); if (m > 0.01) { bigText('MUCHOS ANIMALES', W / 2, Y - 20, 64, HG, m, { glow: 18, dark: 28 }); bigText('A LA VEZ', W / 2, Y + 60, 40, HC.white, cw(t, K.vez3 - 0.1, CUTS[0] - 0.25), { dark: 22 }); } }
  // L4: Anatomía y el nombre de cada animal al cruzar el arco
  { const s = ST.AN; if (s.Z.visible) {
    const k = cw(t, K.anatomia4 - 0.05, K.perro4 - 0.15); if (k > 0.01) { bigText('ANATOMÍA', W / 2, Y - 20, 92, HC.white, k, { glow: 14, dark: 30 }); bigText('NO DE UN CUERPO: DE MUCHOS', W / 2, Y + 70, 30, HG, cw(t, K.sino4 - 0.1, K.perro4 - 0.15), { dark: 22 }); }
    const T6 = [K.perro4, K.gato4, K.caballo4, K.vaca4, K.cerdo4, K.gallina4, K.farmacologia5 - 0.25], N6 = ['PERRO', 'GATO', 'CABALLO', 'VACA', 'CERDO', 'GALLINA'];
    for (let i = 0; i < 6; i++) { const k2 = cw(t, T6[i] - 0.06, T6[i + 1] - 0.1); if (k2 > 0.01) { bigText(N6[i], W / 2, Y, 96, HD, k2, { glow: 20, type: false, dark: 30 }); bigText(`${i + 1} / 6`, W / 2, Y + 80, 30, HC.grey, k2, { type: false, dark: 20 }); } }
  } }
  // L5: Farmacología: el mismo fármaco, otra dosis para cada especie
  { const s = ST.FA; if (s.Z.visible) {
    bigText('FARMACOLOGÍA', W / 2, Y - 20, 74, HC.white, cw(t, K.farmacologia5 - 0.05, K.otra5 - 0.1), { glow: 12, dark: 28 });
    bigText('EL MISMO FÁRMACO', W / 2, Y + 64, 34, HG, cw(t, K.mismo5 - 0.1, K.otra5 - 0.1), { dark: 22 });
    bigText('OTRA DOSIS', W / 2, Y, 84, HG, cw(t, K.otra5 - 0.05, K.microbiologia6 - 0.3), { glow: 18, type: false, dark: 30 });
    bigText('PARA CADA ESPECIE', W / 2, Y + 76, 32, HC.white, cw(t, K.cada5 - 0.1, K.microbiologia6 - 0.3), { dark: 22 });
    lab(s.vial, 0, 0.17, 0, 'MISMO FRASCO', null, cw(t, K.mismo5, K.otra5 + 0.2), { dx: -110, dy: -130, color: HG });
    ['GATO', 'PERRO', 'CABALLO'].forEach((n, i) => lab(s.syr[i], 0.07, 0, 0, n, null, cw(t, K.para5 ?? K.cada5 - 0.15 + i * 0.1, K.microbiologia6 - 0.3), { dx: i === 2 ? 110 : -110, dy: -90 - i * 20, color: HD }));
  } }
  // L6: Microbiología y parásitos · zoonosis
  { const s = ST.MI; if (s.Z.visible) {
    bigText('MICROBIOLOGÍA', W / 2, Y - 20, 72, HC.green, cw(t, K.microbiologia6 - 0.05, K.enferma6 - 0.1), { glow: 16, dark: 28 });
    lab(s.tick, 0, 0.06, 0, 'PARÁSITOS', 'GARRAPATA', cw(t, K.parasitos6 + 0.05, K.enferma6 + 0.4), { dx: 110, dy: -140, color: HC.amber });
    bigText('LO QUE ENFERMA A UN ANIMAL', W / 2, Y, 38, HC.white, cw(t, K.enferma6 - 0.05, K.y6 - 0.05), { dark: 24 });
    bigText('Y LO QUE PUEDE PASARTE A TI', W / 2, Y, 38, HC.red, cw(t, K.y6 - 0.05, K.produccion7 - 0.3), { glow: 12, dark: 24 });
    lab(s.hum, 0, 1.0, 0, 'ZOONOSIS', 'DEL ANIMAL A LA PERSONA', cw(t, K.ti6 - 0.1, K.produccion7 - 0.3), { dx: -110, dy: -150, color: HC.red });
  } }
  // L7: Producción animal: granjas, alimentación, genética
  { const s = ST.PR; if (s.Z.visible) { const a = cw(t, K.produccion7 - 0.05, K.cirugia8 - 0.3);
    bigText('PRODUCCIÓN ANIMAL', W / 2, Y - 60, 58, HC.white, a, { glow: 12, dark: 28 });
    checklist([['GRANJAS', K.granjas7, HC.white], ['ALIMENTACIÓN', K.alimentacion7, HG], ['GENÉTICA', K.genetica7, HD]], 300, Y + 10, t, a, 38);
  } }
  // L8: Cirugía: quirófano, anestesia, puntos
  { const s = ST.CI; if (s.Z.visible) { const a = cw(t, K.cirugia8 - 0.05, K.y9 - 0.25);
    bigText('CIRUGÍA', W / 2, Y - 40, 92, HC.white, a, { glow: 14, dark: 30 });
    lab(s.lamp.userData.lamp, 0, -0.03, 0, 'QUIRÓFANO', null, cw(t, K.quirofano8, K.y9 - 0.25), { dx: 120, dy: 60, color: HG });
    lab(s.mask, 0, 0.02, 0, 'ANESTESIA', null, cw(t, K.anestesia8 + 0.05, K.y9 - 0.25), { dx: 110, dy: -120, color: HD });
    lab(s.cut, 0.0, 0.0, 0, 'PUNTOS', null, cw(t, K.puntos8 - 0.02, K.y9 - 0.25), { dx: -110, dy: -110, color: HT });
  } }
  // L9: lo que comes · ningún matadero sin veterinario oficial · antes y después
  { const s = ST.SA; if (s.Z.visible) {
    bigText('LO QUE CASI NADIE SABE', W / 2, Y, 46, HG, cw(t, K.y9 - 0.05, K.tambien9 - 0.1), { glow: 12, dark: 26 });
    bigText('TAMBIÉN VIGILAS', W / 2, Y - 30, 52, HC.white, cw(t, K.tambien9 - 0.05, K.espana9 - 0.1), { dark: 26 }); bigText('LO QUE COMES', W / 2, Y + 50, 64, HG, cw(t, K.comes9 - 0.1, K.espana9 - 0.1), { glow: 16, dark: 28 });
    lab(s.ab, -0.08, 0.3, 0.18, 'MATADERO', 'EN ESPAÑA', cw(t, K.matadero9 - 0.05, K.revisando9), { dx: -120, dy: -120 });
    { const k = cw(t, K.ningun9 - 0.05, K.dentro9 - 0.05); if (k > 0.01) { bigText('SIN VETERINARIO OFICIAL', W / 2, Y - 10, 40, HC.red, k, { glow: 12, dark: 26 }); bigText('✗ NO FUNCIONA', W / 2, Y + 60, 48, HC.red, cw(t, K.funcionar9 - 0.05, K.dentro9 - 0.05), { type: false, dark: 26 }); } }
    { const k = cw(t, K.dentro9 - 0.05, K.revisando9 - 0.05); if (k > 0.01) bigText('✓ VETERINARIO DENTRO', W / 2, Y + 20, 48, HC.green, k, { glow: 14, type: false, dark: 26 }); }
    if (s.vet.visible) lab(s.vet.userData.J.neck, 0, 0.2, 0, 'VETERINARIO OFICIAL', null, cw(t, K.veterinario9 + 0.1, K.revisando9 - 0.1), { dx: 110, dy: -130, color: HC.green });
    bigText('REVISA CADA ANIMAL', W / 2, Y - 30, 46, HC.white, cw(t, K.revisando9 - 0.05, K.y10 - 0.3), { dark: 24 });
    { const a = cw(t, K.antes9 - 0.05, K.y10 - 0.3); if (a > 0.01) { bigText('✓ ANTES', W / 2 - 170, Y + 50, 56, HC.green, a, { type: false, dark: 26 }); bigText('✓ DESPUÉS', W / 2 + 150, Y + 50, 56, HC.green, cw(t, K.despues9 - 0.05, K.y10 - 0.3), { type: false, dark: 26 }); } }
  } }
  // L10: ¿y lo del brazo? Reproducción · ¿preñada? · útero · el brazo dentro
  { const s = ST.RE; if (s.Z.visible) {
    bigText('¿Y LO DEL BRAZO?', W / 2, Y, 64, HC.red, cw(t, K.y10 - 0.05, K.reproduccion10 - 0.05), { glow: 14, dark: 28 });
    bigText('REPRODUCCIÓN', W / 2, Y, 80, HC.green, cw(t, K.reproduccion10 - 0.05, K.saber10 - 0.05), { glow: 16, dark: 28 });
    bigText('¿PREÑADA?', W / 2, Y, 84, '#FF8FB5', cw(t, K.saber10 - 0.05, K.palpa10 - 0.1), { glow: 18, dark: 28 });
    lab(s.calf, 0, 0.12 / 0.11 * 0.0 + 0.0, 0, 'TERNERO', null, cw(t, K.prenada10 + 0.05, K.palpa10 - 0.05), { dx: -110, dy: -140, color: '#FFC27A' });
    lab(s.ut, 0, 0.14, 0.1, 'ÚTERO', null, cw(t, K.utero10 - 0.05, cut3Of() - 0.05), { dx: -110, dy: -150, color: '#FF8FB5' });
    bigText('SE PALPA DESDE DENTRO', W / 2, Y, 44, HC.white, cw(t, K.palpa10 - 0.05, K.con10 - 0.05), { dark: 24 });
    bigText('CON EL BRAZO METIDO', W / 2, Y, 50, '#FF9A4A', cw(t, K.con10 - 0.05, cut3Of() - 0.05), { glow: 14, dark: 26 });
  } }
  // L11–L12: vas a curar perros y gatos, pero antes, la vaca · ¿perros y gatos o vacas y caballos? · mándaselo
  if (t > CUTS[1]) {
    bigText('PERROS Y GATOS', W / 2, Y, 64, HD, cw(t, K.perros11 - 0.05, K.pero11 - 0.05), { glow: 14, dark: 26 });
    bigText('PERO ANTES, LA VACA', W / 2, Y, 60, HG, cw(t, K.pero11 - 0.05, K.perros12 - 0.1), { glow: 16, dark: 26 });
    const d = cw(t, K.perros12 - 0.05, K.te12 - 0.1); if (d > 0.01) { bigText('¿PERROS Y GATOS', W / 2, Y - 30, 58, HD, d, { glow: 14, type: false, dark: 26 }); bigText('O VACAS Y CABALLOS?', W / 2, Y + 50, 58, HG, cw(t, K.o12 - 0.05, K.te12 - 0.1), { glow: 16, type: false, dark: 26 }); }
    bigText('TE LEO EN COMENTARIOS', W / 2, Y, 42, HC.white, cw(t, K.te12 - 0.05, K.mandaselo12 - 0.05), { dark: 24 });
    { const m = cw(t, K.mandaselo12 - 0.05, END - 0.55); if (m > 0.01) { bigText('MÁNDASELO A QUIEN', W / 2, Y - 20, 44, HC.white, m, { dark: 24 }); bigText('QUIERE SER VETERINARIO', W / 2, Y + 44, 44, HG, cw(t, K.quien12 - 0.05, END - 0.55), { glow: 12, dark: 24 }); } }
  }
}
const cut3Of = () => CUTS[CUTS.length - 1];
