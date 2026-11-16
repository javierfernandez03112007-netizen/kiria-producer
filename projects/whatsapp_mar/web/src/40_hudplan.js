// ---------------------------------------------------------------- HUD: rótulos de neón (punto en el objeto → línea que brilla → caja oscura con el texto, como el «200 m» de la
// referencia de Javi), títulos grandes («200.000 km/s», «600 CABLES», «¿SATÉLITE O CABLE?»), el cronómetro del cruce (6.000 km · 0,03 s) y la cabecera.
// Los subtítulos (los pone el montaje) van en y≈330: aquí nada entre y=230 y y=420.
let INK = '#F2F5F8', GREY = '#B4BEC9', HOT = '#FF8A3D', REDc = '#FF5A4E', AMBc = '#FFC24A', CYAN = '#5CF2E6', GOLD = '#FFD27A', GREENc = '#7CF0A9';
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 600]; }
const cw = (t, t0, t1, d = 0.25) => win(t, t0, d) * (1 - win(t, t1, d));
function neon(P3, txt, sub, k, o = {}) {
  if (k <= 0.01 || !P3) return; const A = P3.isVector3 ? proj(P3) : P3; if (P3.isVector3 && !A.ok) return;
  const col = o.color || CYAN, size = o.size || 38, e = eo(clamp(k / 0.5)), dx = o.dx ?? 0, dy = o.dy ?? -170;
  hg.save(); hfont(size); hg.letterSpacing = '2px'; const tw = hg.measureText(txt).width; let sw = 0; if (sub) { hfont(Math.round(size * 0.55), false); sw = hg.measureText(sub).width; } hg.restore();
  const bw = Math.max(tw, sw) + 44, bh = sub ? size * 1.95 : size * 1.4;
  const bx = clamp(A.x + dx - bw / 2, 30, W - 30 - bw), by = clamp(A.y + dy - bh, 440, H - 280 - bh);
  const E = { x: clamp(A.x + dx, bx + 20, bx + bw - 20), y: A.y + dy < A.y ? by + bh : by };
  const ax = clamp(A.x, -50, W + 50), ay = clamp(A.y, -50, H + 50);
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.lineCap = 'round';
  const lx = ax + (E.x - ax) * e, ly = ay + (E.y - ay) * e;
  hg.shadowColor = col; hg.shadowBlur = 16; hg.strokeStyle = col; hg.lineWidth = 4; hg.beginPath(); hg.moveTo(ax, ay); hg.lineTo(lx, ly); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.arc(ax, ay, 7, 0, 7); hg.fill();
  const kb = clamp((k - 0.35) / 0.4);
  if (kb > 0) { hg.globalAlpha = clamp(k * 2.5) * kb; hg.shadowBlur = 24; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.fillStyle = 'rgba(10,16,22,.84)'; rr(hg, bx, by, bw, bh, 18); hg.fill();
    hg.shadowColor = col; hg.shadowBlur = 14; hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, bx, by, bw, bh, 18); hg.stroke();
    hg.shadowBlur = 18; hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = '2px'; hg.fillText(txt, bx + bw / 2, by + (sub ? size * 0.78 : bh / 2 + 2));
    if (sub) { hg.shadowBlur = 0; hfont(Math.round(size * 0.55), false); hg.fillStyle = INK; hg.fillText(sub, bx + bw / 2, by + size * 1.45); } }
  hg.restore();
}
// título grande de neón (centrado), con un rebote al aparecer
function bigNeon(txt, y, size, col, k, sub = '') {
  if (k <= 0.01) return; const s = 0.85 + 0.15 * eo(clamp(k / 0.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(W / 2, y); hg.scale(s, s); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = Math.round(size * 0.04) + 'px';
  hg.shadowColor = 'rgba(0,0,0,.85)'; hg.shadowBlur = 30; hg.fillStyle = 'rgba(0,0,0,.001)'; hg.fillText(txt, 0, 0);
  hg.shadowColor = col; hg.shadowBlur = 28; hg.fillStyle = col; hg.fillText(txt, 0, 0); hg.shadowBlur = 10; hg.fillStyle = '#ffffff'; hg.globalAlpha *= 0.55; hg.fillText(txt, 0, 0);
  if (sub) { hg.globalAlpha = clamp(k * 2); hg.shadowBlur = 12; hg.shadowColor = 'rgba(0,0,0,.9)'; hfont(Math.round(size * 0.36), false); hg.letterSpacing = '3px'; hg.fillStyle = INK; hg.fillText(sub, 0, size * 0.85); }
  hg.restore();
}
// cabecera: «ASÍ FUNCIONA · TU MENSAJE»
function hdr(t) {
  const a = win(t, 1.7, 0.4) * (1 - win(t, END - 1.1, 0.4)) * (1 - 0.85 * cw(t, FIBW[0] - 0.1, FIBW[1] + 0.1, 0.15)); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(42); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('TU MENSAJE', 54, 142);
  hg.letterSpacing = '2px'; hfont(23, false); hg.fillStyle = GREY; hg.fillText('DE ESPAÑA A BRASIL EN 0,03 SEGUNDOS', 56, 178);
  hg.textAlign = 'right'; hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ', 1024, 112); hfont(32); hg.fillStyle = CYAN; hg.fillText('FUNCIONA', 1024, 148);
  hg.restore();
}
// el cronómetro del cruce: los km y los segundos corren mientras la luz cruza el océano
function crossClock(t, a) {
  if (a <= 0.01) return; const t0 = K['hunde_8'], t1 = K['segundo_8'] + 0.1, u = clamp((t - t0) / (t1 - t0)), ue = eio(u);
  const km = Math.round(6000 * ue / 10) * 10, sec = (0.03 * ue).toFixed(3).replace('.', ',');
  hg.save(); hg.globalAlpha = clamp(a * 2); const bw = 820, bh = 210, bx = (W - bw) / 2, y = 1470;
  hg.fillStyle = 'rgba(10,16,22,.84)'; rr(hg, bx, y, bw, bh, 22); hg.fill(); hg.shadowColor = GOLD; hg.shadowBlur = 16; hg.strokeStyle = GOLD; hg.lineWidth = 3; rr(hg, bx, y, bw, bh, 22); hg.stroke();
  hg.textBaseline = 'middle'; hg.textAlign = 'center'; hfont(76); hg.letterSpacing = '2px'; hg.fillStyle = GOLD; hg.fillText(km.toLocaleString('es-ES').replace(/\s/g, '.') + ' km', W / 2, y + 70);
  hg.shadowBlur = 10; hfont(56); hg.fillStyle = INK; hg.fillText(sec + ' s', W / 2, y + 152);
  // barra de Portugal a Brasil
  hg.shadowBlur = 0; hg.fillStyle = 'rgba(255,255,255,.18)'; rr(hg, bx + 40, y + bh - 22, bw - 80, 8, 4); hg.fill(); hg.fillStyle = GOLD; rr(hg, bx + 40, y + bh - 22, (bw - 80) * ue, 8, 4); hg.fill();
  hg.restore();
}
const anc = (g, n) => { const A = g && g.userData && g.userData.anchors; const a = A && A[n]; if (!a) return null; return a.isVector3 ? g.localToWorld(a.clone()) : wpos(a); };
function hudAt(t) {
  hudBegin(); hdr(t);
  // 1 · Brasil
  neon(Bw(-6.5, 0.7, 8.5), 'BRASIL', '18:47', cw(t, K['brasil_1'] - 0.15, K['ese_2'] + 0.25), { size: 50, color: AMBc, dy: -230 });
  // 2 · el fondo del mar
  neon(Sw(27, seabedY(27, CABLE_Z) + 0.2, CABLE_Z), 'FONDO DEL MAR', 'POR UN CABLE', cw(t, K['fondo_2'] - 0.1, K['mas_3'] + 0.2), { size: 42, dy: -260 });
  // 3 · 99 de cada 100 por cable; el satélite, casi solo
  neon(mapP(-42, 30, 0.5), '99 DE CADA 100', 'DATOS ENTRE CONTINENTES: POR CABLE', cw(t, K['99_3'] - 0.05, K['y_4'] + 0.1), { size: 46, color: CYAN, dy: -300 });
  const fA = fnOf('mapAnchor'), sat = fA ? fA('sat') : null;
  if (sat) neon(sat, 'SATÉLITE', 'MENOS DE 1 DE CADA 100', cw(t, K['viajan_3'] - 0.2, K['y_4'] + 0.1), { size: 30, color: GREY, dy: 200, dx: 120 });
  // 4 · Mauritania sin internet
  neon(mapP(...GEO.NKC, 0.5), 'MAURITANIA · 2018', '2 DÍAS SIN INTERNET', cw(t, K['entero_4'] - 0.3, K['al_5'] - 0.2), { size: 40, color: REDc, dy: -240 });
  // 5–6 · España, la antena, la fibra
  neon(Iw(40, 7, 10), 'ESPAÑA', '22:47', cw(t, 13.55, K['enviarlo_5'] + 0.1, 0.2), { size: 46, color: AMBc, dy: -220 });
  neon(anc(S.iberia, 'antenna') || Iw(30, 26, -6), 'ANTENA', '', cw(t, K['antena_5'] - 0.1, K['ahi_6'] + 0.4), { size: 42, dy: -200 });
  neon(Iw(14, 1.6, 20), 'FIBRA ÓPTICA', 'LUZ POR UN HILO DE CRISTAL', cw(t, K['fibra_6'] - 0.1, K['luz_6'] + 0.4), { size: 40, dy: -260 });
  // 7 · fino como un pelo, 200.000 km/s
  if (inFiberWin(t)) { neon(anc(S.fiber, 'fiber'), 'FIBRA · 0,125 mm', '', cw(t, K['fino_7'] - 0.1, K['a_7'] + 0.1, 0.2), { size: 36, dy: -220 });
    neon(anc(S.fiber, 'hair'), 'PELO', '', cw(t, K['pelo_7'] - 0.3, K['a_7'] + 0.1, 0.2), { size: 36, color: AMBc, dy: 220 });
    bigNeon('200.000 km/s', 1460, 112, CYAN, cw(t, K['200000_7'] - 0.05, FIBW[1] - 0.15, 0.2), 'LA VELOCIDAD DE LA LUZ EN EL CRISTAL'); }
  // 8 · Portugal; 6.000 km en 0,03 s
  neon(anc(S.iberia, 'station') || Iw(10, 4, 10), 'PORTUGAL', '', cw(t, K['portugal_8'] - 0.1, K['mar_8'] + 0.2), { size: 46, color: AMBc, dy: -230 });
  crossClock(t, cw(t, K['6000_8'] - 0.15, K['hay_9'] + 0.1));
  // 9 · más de 600 cables; se rompen 150–200 al año
  bigNeon('+600 CABLES', 1450, 104, CYAN, cw(t, K['600_9'] - 0.05, K['rompen_9'] - 0.2, 0.2));
  bigNeon('150–200', 1430, 120, REDc, cw(t, K['150_9'] - 0.05, K['y_10'] + 0.05, 0.2), 'ROTURAS CADA AÑO');
  // 10 · tiburones no; anclas y redes sí
  neon(anc(S.inc, 'shark'), 'TIBURONES', 'CASI NUNCA', cw(t, K['tiburones_10'] - 0.05, K['tres_10'] + 0.3), { size: 40, color: GREY, dy: -220 });
  neon(anc(S.inc, 'snapPoint') || anc(S.inc, 'anchor'), '3 DE CADA 4', 'ANCLAS Y REDES DE PESCA', cw(t, K['tres_10'] - 0.05, K['en_11'] + 0.1), { size: 50, color: REDc, dy: -260 });
  // 11 · Tonga, 5 semanas
  neon(anc(S.tonga, 'label') || anc(S.tonga, 'island') || Tw(10, 2, 0), 'TONGA · 2022', t > K['cinco_11'] - 0.1 ? '5 SEMANAS CASI SIN INTERNET' : 'SU ÚNICO CABLE', cw(t, K['tonga_11'] - 0.1, K['asi_12'] + 0.05), { size: 48, color: REDc, dy: -240 });
  // 13 · ¿satélite o cable?
  bigNeon('¿SATÉLITE', 1350, 108, GREY, cw(t, K['satelite_13'] - 0.05, END - 0.55, 0.3)); bigNeon('O CABLE?', 1490, 108, CYAN, cw(t, K['cable_13'] - 0.05, END - 0.55, 0.3));
}
