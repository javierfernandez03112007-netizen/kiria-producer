// ---------------------------------------------------------------- HUD sobrio (cine, no maqueta): cabecera con el truco pendiente (bucle abierto hasta el s 42), rótulos con
// línea guía sobre los objetos de verdad, «> 100 °C», la ficha de la FDA y la pregunta del final. En planos claros, tinta oscura con caja blanca; en oscuros, al revés.
let INK = '#1C2430', GREY = '#5A6472', HOT = '#E8590C', COOL = '#1F6FD1', GREEN = '#2E9D57', REDc = '#D32F2F', AMBc = '#C27A00', HUDD = false;
function hudPalette(dark) { HUDD = dark;
  if (dark) { INK = '#F2F5F8'; GREY = '#B4BEC9'; HOT = '#FF8A3D'; COOL = '#7FC4FF'; GREEN = '#7CF0A9'; REDc = '#FF5A4E'; AMBc = '#FFC24A'; }
  else { INK = '#1C2430'; GREY = '#5A6472'; HOT = '#E8590C'; COOL = '#1F6FD1'; GREEN = '#2E9D57'; REDc = '#D32F2F'; AMBc = '#C27A00'; } }
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 600]; }
const cw = (t, t0, t1, d = 0.25) => win(t, t0, d) * (1 - win(t, t1, d));
const hal = n => HUDD ? { dark: n } : { halo: n };
function lab(P, txt, sub, k, o = {}) { if (k <= 0.01) return; callout(P, txt, sub, k, { size: 28, subSize: 20, bg: true, light: !HUDD, subCol: GREY, color: INK, ...o }); }
const big = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { type: false, ...hal(22), ls: Math.round(size * 0.04), ...o });
const small = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { ...hal(14), ls: 2, ...o });
// cabecera: «ASÍ FUNCIONA · EL MICROONDAS» y el truco pendiente (parpadea hasta que se dice)
function hdr(t) {
  const a = win(t, SHT.B0, 0.35) * (1 - win(t, END - 0.9, 0.4)); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.shadowColor = HUDD ? 'rgba(0,0,0,.9)' : 'rgba(255,255,255,.95)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(46); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('EL MICROONDAS', 54, 142);
  hg.letterSpacing = '2px'; hfont(24, false); hg.fillStyle = GREY; hg.fillText('POR QUÉ EL AGUA PUEDE SALTARTE A LA CARA', 56, 180);
  hg.fillStyle = HUDD ? 'rgba(240,245,250,.25)' : 'rgba(28,36,48,.22)'; hg.fillRect(56, 196, 968, 2);
  hg.textAlign = 'right'; hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ', 1024, 112); hfont(32); hg.fillStyle = HOT; hg.fillText('FUNCIONA', 1024, 148);
  const mk = win(t, K.cara1 + 0.2, 0.3);
  if (mk > 0.01) {
    let txt = 'EL TRUCO PARA EVITARLO · ???', col = REDc, blink = true;
    if (t > K.truco10) { txt = 'EL TRUCO: NO LA CALIENTES DE MÁS'; col = GREEN; blink = false; }
    if (t > K.palito10) { txt = 'EL TRUCO: UN PALITO DE MADERA'; col = GREEN; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = a * mk * (on ? 1 : 0.25); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 238;
    hg.fillStyle = HUDD ? 'rgba(8,12,20,.72)' : 'rgba(255,255,255,.8)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke();
    hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1);
  }
  hg.restore();
}
// la cuenta de las ondas: sube hasta 2.450.000.000 cuando se dice
function countUp(t, a) {
  if (a <= 0.01) return; const k = clamp((t - K.n2450 + 0.1) / 1.1), n = Math.round(2450 * (1 - Math.pow(1 - k, 3))) * 1e6;
  const s = n.toLocaleString('es-ES').replace(/ /g, '.');
  big(s, 1500, 92, INK, a, { glow: HUDD ? 18 : 0 }); small('VECES POR SEGUNDO', 1572, 30, HUDD ? AMBc : GREY, a);
}
// la ficha de la FDA (aviso oficial, con su nombre)
function fdaCard(t, a) {
  if (a <= 0.01) return; const x0 = 90, x1 = 990, y0 = 1330, y1 = 1580, e = eo(clamp(a * 1.4));
  hg.save(); hg.globalAlpha = clamp(a * 2); hg.translate(0, (1 - e) * 40);
  hg.fillStyle = 'rgba(255,255,255,.95)'; hg.shadowColor = 'rgba(40,20,10,.28)'; hg.shadowBlur = 26; rr(hg, x0, y0, x1 - x0, y1 - y0, 18); hg.fill(); hg.shadowBlur = 0;
  hg.fillStyle = '#D32F2F'; rr(hg, x0, y0, 14, y1 - y0, 7); hg.fill();
  hg.textAlign = 'left'; hg.textBaseline = 'alphabetic'; hg.letterSpacing = '3px'; hfont(26); hg.fillStyle = '#5A6472'; hg.fillText('AVISO OFICIAL · FDA (EE. UU.)', x0 + 48, y0 + 62);
  hg.letterSpacing = '1px'; hfont(44); hg.fillStyle = '#1C2430'; hg.fillText(typed('Quemaduras graves', clamp((a - 0.2) * 2)), x0 + 48, y0 + 128);
  hfont(34, false); hg.fillStyle = '#1C2430'; hg.fillText(typed('por agua sobrecalentada en el microondas', clamp((a - 0.35) * 2)), x0 + 48, y0 + 182);
  hfont(24, false); hg.fillStyle = '#5A6472'; hg.fillText('en las manos y en la cara', x0 + 48, y0 + 222);
  hg.restore();
}
function hudAt(t) {
  const sh = shotAt(t); hudPalette(true); hudBegin(); hdr(t);          // siempre texto claro con sombra oscura (se lee sobre cualquier plano)
  const U = S.mw.userData, mw = (x, y, z) => S.mw.localToWorld(v3(x, y, z)), mg = (x, y, z) => S.mug.localToWorld(v3(x, y, z));
  // E: el magnetrón
  if (S.mag && (sh === 'E' || sh === 'F')) { const a = cw(t, K.magnetron2 + 0.35, SHT.F0 + 0.4); const p = S.mag.group.localToWorld(v3(0, 0, 0));
    lab(p, 'MAGNETRÓN', t > K.radares2 - 0.1 ? 'EL DE LOS RADARES DE LA II GUERRA MUNDIAL' : '', a, { dx: -170, dy: 260 }); }
  // F–G: 2.450 millones de veces por segundo
  countUp(t, cw(t, K.n2450 - 0.1, K.agua4 - 0.2));
  // I: la molécula protagonista (el oxígeno, negativo; los hidrógenos, positivos)
  if (sh === 'I' && S.mol && S.mol.heroAt) { const hr = S.mol.heroAt(), a = cw(t, K.moleculas4 - 0.05, K.giran4 + 0.7);
    lab(hr.O, 'MOLÉCULA DE AGUA', 'H₂O', a, { dx: 170, dy: 300 }); }
  // K: las rayitas del fondo del cazo
  if (sh === 'K') { const pot = v3(STOVE_POS.x + POT_L.x, STOVE_POS.y + POT_L.y, STOVE_POS.z + POT_L.z); lab(pot.clone().add(v3(-0.6, 0.6, -1.2)), 'RAYITAS DEL FONDO', 'AQUÍ NACEN LAS BURBUJAS', cw(t, K.rayitas5 - 0.1, SHT.L0), { dx: -160, dy: -300 }); }
  // L: vista térmica
  if (sh === 'L') { const a = cw(t, SHT.L0 + 0.4, SHT.M0); small('VISTA TÉRMICA', 1640, 26, GREY, a);
    lab(mg(-1.0, MUG.WY, 0.6), 'AGUA', 'LA CALIENTAN LAS ONDAS', cw(t, K.agua6 - 0.1, SHT.M0), { color: HOT, dx: -150, dy: -260 });
    lab(mg(0, 3.5, 4.1), 'TAZA', 'CASI NO SE CALIENTA', cw(t, K.taza6 - 0.1, SHT.M0), { color: COOL, dx: 150, dy: 220 }); }
  // M: la pared lisa
  if (sh === 'M') lab(v3(MUGW.x - 0.8, MUGW.y + 0.75, MUGW.z - 1.8), 'TAZA LISA', 'NINGÚN SITIO DONDE NACER', cw(t, K.lisa6, SHT.N0), { dx: 160, dy: -300 });
  // N: más de cien grados y quieta
  { const a = cw(t, K.cien7 - 0.05, SHT.O0 - 0.1); if (a > 0.01) { big('> 100 °C', 1480, 150, HOT, a); small(t > K.sigue7 - 0.1 ? 'Y SIGUE QUIETA' : '', 1580, 34, INK, a); } }
  // Q: la FDA
  fdaCard(t, cw(t, K.fda9 + 0.2, SHT.R0 - 0.1, 0.35));
  // S: las vetas del palito
  if (sh === 'S' && S.stick.visible) lab(S.stick.localToWorld(v3(0, 4.5, 0.1)), 'VETAS DE LA MADERA', 'LAS BURBUJAS NACEN AQUÍ', cw(t, K.vetas10 - 0.1, SHT.T0), { dx: 150, dy: -240 });
  // T–W: ¿micro o cazo? (un plano para cada palabra)
  if (sh === 'T' || sh === 'W') { const a = cw(t, K.micro11 - 0.05, K.mandaselo11 + 0.2, 0.15);
    big(sh === 'T' ? '¿MICRO…' : '…O CAZO?', 1520, 104, sh === 'T' ? INK : HOT, a); }
}
