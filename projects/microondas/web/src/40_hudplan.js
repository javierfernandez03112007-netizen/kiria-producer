// ---------------------------------------------------------------- HUD del plano continuo: rótulos de neón cian (como el «200 m» de la referencia de Javi): un punto en el
// objeto, una línea que brilla y una caja oscura con el texto; la cuenta de las ondas; «> 100 °C»; la ficha de la FDA; las gotas que salpican al
// objetivo; la cabecera con el truco pendiente (bucle abierto) y «¿micro… o cazo?».
let INK = '#F2F5F8', GREY = '#B4BEC9', HOT = '#FF8A3D', COOL = '#7FC4FF', GREEN = '#7CF0A9', REDc = '#FF5A4E', AMBc = '#FFC24A', CYAN = '#5CF2E6', HUDD = true;
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 600]; }
const cw = (t, t0, t1, d = 0.25) => win(t, t0, d) * (1 - win(t, t1, d));
const big = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { type: false, dark: 22, ls: Math.round(size * 0.04), ...o });
const small = (txt, y, size, col, k, o = {}) => bigText(txt, W / 2, y, size, col, k, { dark: 14, ls: 2, ...o });
// rótulo de neón: punto en el objeto → línea que brilla → caja oscura redondeada con el texto (y una segunda línea opcional)
function neon(P3, txt, sub, k, o = {}) {
  if (k <= 0.01 || !P3) return; const A = P3.isVector3 ? proj(P3) : P3; if (P3.isVector3 && !A.ok) return;
  const col = o.color || CYAN, size = o.size || 38, e = eo(clamp(k / 0.5)), dx = o.dx ?? 0, dy = o.dy ?? -170;
  hg.save(); hfont(size); hg.letterSpacing = '2px'; const tw = hg.measureText(txt).width; let sw = 0; if (sub) { hfont(Math.round(size * 0.55), false); sw = hg.measureText(sub).width; } hg.restore();
  const bw = Math.max(tw, sw) + 44, bh = sub ? size * 1.95 : size * 1.4;
  const bx = clamp(A.x + dx - bw / 2, 30, W - 30 - bw), by = clamp(A.y + dy - bh, 420, H - 260 - bh);
  const E = { x: bx + bw / 2, y: A.y + dy < A.y ? by + bh : by };
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.lineCap = 'round';
  const lx = A.x + (E.x - A.x) * e, ly = A.y + (E.y - A.y) * e;                                     // la línea crece del objeto a la caja
  hg.shadowColor = col; hg.shadowBlur = 16; hg.strokeStyle = col; hg.lineWidth = 4; hg.beginPath(); hg.moveTo(A.x, A.y); hg.lineTo(lx, ly); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.arc(A.x, A.y, 7, 0, 7); hg.fill();
  const kb = clamp((k - 0.35) / 0.4);
  if (kb > 0) { hg.globalAlpha = clamp(k * 2.5) * kb; hg.shadowBlur = 24; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.fillStyle = 'rgba(10,16,22,.82)'; rr(hg, bx, by, bw, bh, 18); hg.fill();
    hg.shadowColor = col; hg.shadowBlur = 14; hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, bx, by, bw, bh, 18); hg.stroke();
    hg.shadowBlur = 18; hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = '2px'; hg.fillText(txt, bx + bw / 2, by + (sub ? size * 0.78 : bh / 2 + 2));
    if (sub) { hg.shadowBlur = 0; hfont(Math.round(size * 0.55), false); hg.fillStyle = INK; hg.fillText(sub, bx + bw / 2, by + size * 1.45); } }
  hg.restore();
}
// cabecera: «ASÍ FUNCIONA · EL MICROONDAS» y el truco pendiente
function hdr(t) {
  const a = win(t, SHT.B0, 0.35) * (1 - win(t, END - 0.9, 0.4)); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(44); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('EL MICROONDAS', 54, 142);
  hg.letterSpacing = '2px'; hfont(23, false); hg.fillStyle = GREY; hg.fillText('POR QUÉ EL AGUA PUEDE SALTARTE A LA CARA', 56, 178);
  hg.textAlign = 'right'; hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ', 1024, 112); hfont(32); hg.fillStyle = HOT; hg.fillText('FUNCIONA', 1024, 148);
  const mk = win(t, K.cara1 + 0.2, 0.3);
  if (mk > 0.01) { let txt = 'EL TRUCO PARA EVITARLO · ???', col = REDc, blink = true;
    if (t > K.truco10) { txt = 'EL TRUCO: NO LA CALIENTES DE MÁS'; col = GREEN; blink = false; }
    if (t > K.palito10) { txt = 'EL TRUCO: UN PALITO DE MADERA'; col = GREEN; blink = false; }
    const on = !blink || Math.sin(t * 9) > -0.3; hg.globalAlpha = a * mk * (on ? 1 : 0.25); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right';
    const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 228;
    hg.fillStyle = 'rgba(8,12,20,.72)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke(); hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1); }
  hg.restore();
}
// la cuenta de las ondas: sube hasta 2.450.000.000 cuando se dice
function countUp(t, a) {
  if (a <= 0.01) return; const k = clamp((t - K.n2450 + 0.1) / 1.1), n = Math.round(2450 * (1 - Math.pow(1 - k, 3))) * 1e6, s = n.toLocaleString('es-ES').replace(/ /g, '.');
  hg.save(); hg.globalAlpha = clamp(a * 2); const y = 1430, bw = 900, bh = 190, bx = (W - bw) / 2;
  hg.fillStyle = 'rgba(10,16,22,.8)'; rr(hg, bx, y, bw, bh, 22); hg.fill(); hg.shadowColor = CYAN; hg.shadowBlur = 16; hg.strokeStyle = CYAN; hg.lineWidth = 3; rr(hg, bx, y, bw, bh, 22); hg.stroke();
  hg.fillStyle = CYAN; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(92); hg.letterSpacing = '3px'; hg.fillText(s, W / 2, y + 78);
  hg.shadowBlur = 0; hfont(30, false); hg.fillStyle = INK; hg.letterSpacing = '4px'; hg.fillText('VECES POR SEGUNDO', W / 2, y + 150); hg.restore();
}
// la ficha de la FDA
function fdaCard(t, a) {
  if (a <= 0.01) return; const x0 = 90, x1 = 990, y0 = 1330, y1 = 1580, e = eo(clamp(a * 1.4));
  hg.save(); hg.globalAlpha = clamp(a * 2); hg.translate(0, (1 - e) * 40);
  hg.fillStyle = 'rgba(255,255,255,.95)'; hg.shadowColor = 'rgba(0,0,0,.4)'; hg.shadowBlur = 26; rr(hg, x0, y0, x1 - x0, y1 - y0, 18); hg.fill(); hg.shadowBlur = 0;
  hg.fillStyle = '#D32F2F'; rr(hg, x0, y0, 14, y1 - y0, 7); hg.fill();
  hg.textAlign = 'left'; hg.textBaseline = 'alphabetic'; hg.letterSpacing = '3px'; hfont(26); hg.fillStyle = '#5A6472'; hg.fillText('AVISO OFICIAL · FDA (EE. UU.)', x0 + 48, y0 + 62);
  hg.letterSpacing = '1px'; hfont(46); hg.fillStyle = '#1C2430'; hg.fillText(typed('Quemaduras graves', clamp((a - 0.2) * 2)), x0 + 48, y0 + 128);
  hfont(32, false); hg.fillStyle = '#1C2430'; hg.fillText(typed('por agua sobrecalentada en el microondas', clamp((a - 0.35) * 2)), x0 + 48, y0 + 180);
  hfont(26); hg.fillStyle = '#D32F2F'; hg.fillText(typed('en las manos y en la cara', clamp((a - 0.5) * 2)), x0 + 48, y0 + 222);
  hg.restore();
}
// gotas en el objetivo (cuando el agua salta a la cámara): lentes pequeñas con brillo, que resbalan
function lensDrops(t, t0, seed) {
  const u = t - t0; if (u < 0 || u > 1.1) return; const a = 1 - clamp((u - 0.6) / 0.5);
  hg.save(); for (let i = 0; i < 26; i++) { const h = k => hash(i * 7.7 + k * 3.1 + seed), d0 = h(1) * 0.15; if (u < d0) continue;
    const x = h(2) * W, y = 380 + h(3) * (H - 700) + (u - d0) * (40 + 160 * h(4)), r = 14 + 46 * Math.pow(h(5), 2);
    const g = hg.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, `rgba(255,255,255,${0.55 * a})`); g.addColorStop(0.55, `rgba(200,225,235,${0.12 * a})`); g.addColorStop(0.92, `rgba(20,30,40,${0.35 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    hg.fillStyle = g; hg.beginPath(); hg.ellipse(x, y, r, r * (1 + 0.25 * h(6)), 0, 0, 7); hg.fill(); }
  hg.restore();
}
function hudAt(t) {
  const sh = shotAt(t); hudBegin(); hdr(t);
  const mw = (x, y, z) => S.mw.localToWorld(v3(x, y, z)), mg = (x, y, z) => S.mug.localToWorld(v3(x, y, z));
  const pot = v3(STOVE_POS.x + POT_L.x, STOVE_POS.y + POT_L.y, STOVE_POS.z + POT_L.z), A = S.xr && S.xr.anchors;
  const anc = k => A && A[k] ? (typeof A[k] === 'function' ? A[k]() : A[k]) : null;
  // C y P: el agua salta al objetivo
  lensDrops(t, K.cara1 - 0.05, 1); lensDrops(t, SHT.P0 + 0.45, 7);
  // D–E: las piezas por dentro; el magnetrón; el radar de la guerra
  if (sh === 'D' || sh === 'E') { const kd = cw(t, SHT.D0 + 0.8, SHT.E0 + 0.6);
    neon(anc('transformer'), 'TRANSFORMADOR', '', kd * 0.9, { size: 26, dx: -120, dy: 140, color: INK }); neon(anc('fan'), 'VENTILADOR', '', kd * 0.9, { size: 26, dx: 120, dy: 160, color: INK });
    const pm = anc('magnetron') || (S.mag ? S.mag.group.localToWorld(v3(0, 0, 0)) : MAGLIFT);
    neon(pm, 'MAGNETRÓN', t > K.radares2 - 0.1 ? 'LA PIEZA DE LOS RADARES' : '', cw(t, K.magnetron2 - 0.1, K.dispara3 - 0.3), { size: 46, dy: -200 });
    if (t > K.segunda2 - 0.2) neon(MAGLIFT.clone().add(v3(0, 16, 0)), 'II GUERRA MUNDIAL', '', cw(t, K.segunda2 - 0.15, K.dispara3 - 0.3), { size: 34, dy: -120, color: AMBc }); }
  // F–G: las ondas, 2.450 millones de veces por segundo
  if (sh === 'F') neon(anc('waveguide'), 'GUÍA DE ONDAS', '', cw(t, K.ondas3 - 0.2, K.ondas3 + 0.6), { size: 30, dy: -150 });
  countUp(t, cw(t, K.n2450 - 0.1, K.agua4 - 0.2));
  // I: la molécula de agua
  if (sh === 'I' && S.mol && S.mol.heroAt) neon(S.mol.heroAt().O, 'MOLÉCULA DE AGUA', 'H₂O', cw(t, K.moleculas4 - 0.05, K.giran4 + 0.7), { size: 36, dy: 360 });
  // J: el calor viene de abajo
  if (sh === 'J') neon(pot.clone().add(v3(0, -0.4, 6)), 'CALOR', '↑ DESDE ABAJO', cw(t, K.calor5 - 0.1, K.abajo5 + 0.4), { size: 44, color: HOT, dy: 220 });
  // K: las rayitas
  if (sh === 'K') neon(camAt(t).l, 'RAYITAS', 'AQUÍ NACEN LAS BURBUJAS', cw(t, K.rayitas5 - 0.15, SHT.L0 - 0.3), { size: 40, dy: -240 });
  // L: vista térmica
  if (sh === 'L' && THERM) { neon(mg(0.8, MUG.WY, 0.5), 'AGUA', 'CALIENTE', cw(t, K.agua6 - 0.15, SHT.M0), { size: 40, color: HOT, dx: -120, dy: -220 });
    neon(mg(0, 3.5, 4.1), 'TAZA', 'CASI NADA', cw(t, K.taza6 - 0.15, SHT.M0), { size: 40, color: COOL, dx: 140, dy: 240 }); }
  // M: la taza lisa
  if (sh === 'M') neon(camAt(t).l, 'LISA', 'NINGÚN SITIO DONDE NACER', cw(t, K.lisa6 + 0.3, SHT.N0 - 0.2), { size: 40, dy: -260 });
  // N: más de 100 °C y quieta
  if (sh === 'N' && S.thermo.visible) { S.thermo.updateMatrixWorld(); const top = S.thermo.localToWorld(v3(0, S.thermo.userData.col.scale.y, 0));
    neon(top, '> 100 °C', t > K.sigue7 - 0.1 ? 'Y SIGUE QUIETA' : '', cw(t, K.cien7 - 0.05, SHT.O0 - 0.1), { size: 64, color: HOT, dx: 160, dy: -200 }); }
  // Q: la FDA
  fdaCard(t, cw(t, K.fda9 + 0.2, SHT.R0 - 0.1, 0.35));
  // R: el temporizador
  if (sh === 'R') neon(mw(17.9, 23.9, 2.3), 'NO DE MÁS', '', cw(t, K.calientes10 - 0.1, SHT.S0), { size: 40, color: GREEN, dy: 260 });
  // S: las vetas del palito
  if (sh === 'S' && S.stick.visible && t > K.vetas10 - 0.3) neon(camAt(t).l, 'VETAS', 'LAS BURBUJAS NACEN AQUÍ', cw(t, K.vetas10 - 0.1, SHT.T0 - 0.2), { size: 40, color: GREEN, dy: -240 });
  // T: ¿micro… o cazo?
  if (sh === 'T') { neon(mw(0, 29.5, -18), '¿MICRO…', '', cw(t, K.micro11 - 0.05, K.mandaselo11 + 0.2, 0.15), { size: 64, color: INK, dy: -160 });
    neon(pot.clone().add(v3(0, 13.8, 0)), '…O CAZO?', '', cw(t, K.cazo11 - 0.05, K.mandaselo11 + 0.2, 0.15), { size: 64, color: HOT, dy: -160 }); }
}
