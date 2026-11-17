// ---------------------------------------------------------------- HUD: las estrellas (cinco en GTA 5, seis en GTA 6) y, debajo, las pistas que tiene la policía (coche, ropa,
// aspecto, cámara y pareja), con un hilo de neón hasta cada cosa en la calle; rótulos de neón, la cabecera y el truco pendiente.
// Los subtítulos (los pone el montaje) van en y≈330: aquí nada entre y = 250 y y = 420.
let INK = '#F2F5F8', GREY = '#B4BEC9', REDc = '#FF5A4E', AMBc = '#FFC24A', CYAN = '#5CF2E6', PINK = '#FF5FB8', GREENc = '#7CF0A9', VIOL = '#B58CFF', ORNG = '#FF9A3D', GOLDs = '#FFE9A8';
const STAR_Y = 505, STAR_R = 40, PLQ_Y = 596, PLQ_W = 150, PLQ_H = 150, PLQ_GAP = 18;
const PLQ = [{ n: 'COCHE', c: ORNG }, { n: 'ROPA', c: PINK }, { n: 'ASPECTO', c: CYAN }, { n: 'CÁMARA', c: REDc }, { n: 'PAREJA', c: VIOL }];
function buildHudPlan() { HFONT = 'Inter'; HW = [900, 600]; }
const cw = (t, t0, t1, d = 0.25) => win(t, t0, d) * (1 - win(t, t1, d));
const starX = (i, n = 6) => W / 2 + (i - (n - 1) / 2) * 96, plqX = i => W / 2 + (i - 2) * (PLQ_W + PLQ_GAP);
function neon(P3, txt, sub, k, o = {}) {
  if (k <= 0.01 || !P3) return; const A = P3.isVector3 ? proj(P3) : P3; if (P3.isVector3 && !A.ok) return;
  const col = o.color || CYAN, size = o.size || 38, e = eo(clamp(k / 0.5)), dx = o.dx ?? 0, dy = o.dy ?? -170;
  hg.save(); hfont(size); hg.letterSpacing = '2px'; const tw = hg.measureText(txt).width; let sw = 0; if (sub) { hfont(Math.round(size * 0.55), false); sw = hg.measureText(sub).width; } hg.restore();
  const bw = Math.max(tw, sw) + 44, bh = sub ? size * 1.95 : size * 1.4;
  const bx = clamp(A.x + dx - bw / 2, 30, W - 30 - bw), by = clamp(A.y + dy - bh, o.ymin ?? 440, H - 280 - bh);
  const E = { x: clamp(A.x + dx, bx + 20, bx + bw - 20), y: A.y + dy < A.y ? by + bh : by };
  const ax = clamp(A.x, -50, W + 50), ay = clamp(A.y, -50, H + 50);
  hg.save(); hg.globalAlpha = clamp(k * 2.5); hg.lineCap = 'round';
  const lx = ax + (E.x - ax) * e, ly = ay + (E.y - ay) * e;
  hg.shadowColor = col; hg.shadowBlur = 16; hg.strokeStyle = col; hg.lineWidth = 4; hg.beginPath(); hg.moveTo(ax, ay); hg.lineTo(lx, ly); hg.stroke();
  hg.fillStyle = col; hg.beginPath(); hg.arc(ax, ay, 7, 0, 7); hg.fill();
  const kb = clamp((k - 0.35) / 0.4);
  if (kb > 0) { hg.globalAlpha = clamp(k * 2.5) * kb; hg.shadowBlur = 24; hg.shadowColor = 'rgba(0,0,0,.6)'; hg.fillStyle = 'rgba(10,12,24,.86)'; rr(hg, bx, by, bw, bh, 18); hg.fill();
    hg.shadowColor = col; hg.shadowBlur = 14; hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, bx, by, bw, bh, 18); hg.stroke();
    hg.shadowBlur = 18; hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = '2px'; hg.fillText(txt, bx + bw / 2, by + (sub ? size * 0.78 : bh / 2 + 2));
    if (sub) { hg.shadowBlur = 0; hfont(Math.round(size * 0.55), false); hg.fillStyle = INK; hg.fillText(sub, bx + bw / 2, by + size * 1.45); } }
  hg.restore();
}
function bigNeon(txt, y, size, col, k, sub = '') {
  if (k <= 0.01) return; const s = 0.85 + 0.15 * eo(clamp(k / 0.6));
  hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(W / 2, y); hg.scale(s, s); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(size); hg.letterSpacing = Math.round(size * 0.04) + 'px';
  hg.lineJoin = 'round'; hg.strokeStyle = 'rgba(8,6,20,.9)'; hg.lineWidth = size * 0.16; hg.strokeText(txt, 0, 0);
  hg.shadowColor = col; hg.shadowBlur = 28; hg.fillStyle = col; hg.fillText(txt, 0, 0); hg.shadowBlur = 10; hg.fillStyle = '#ffffff'; hg.globalAlpha *= 0.5; hg.fillText(txt, 0, 0);
  if (sub) { hg.globalAlpha = clamp(k * 2); hg.shadowBlur = 12; hg.shadowColor = 'rgba(0,0,0,.9)'; hfont(Math.round(size * 0.36), false); hg.letterSpacing = '3px'; hg.fillStyle = INK; hg.fillText(sub, 0, size * 0.85); }
  hg.restore();
}
// cabecera y el truco pendiente (bucle abierto): «EL TRUCO DE JASON Y LUCÍA · ???» → «EL TRUCO: SEPÁRALOS»
function hdr(t) {
  const a = win(t, 1.7, 0.4) * (1 - win(t, END - 1.1, 0.4)); if (a <= 0.01) return;
  hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 12;
  hg.letterSpacing = '4px'; hfont(42); hg.fillStyle = INK; hg.textAlign = 'left'; hg.fillText('GTA 6 · LA POLICÍA', 54, 142);
  hg.letterSpacing = '2px'; hfont(22, false); hg.fillStyle = GREY; hg.fillText('LO QUE ROCKSTAR HA CONTADO A IGN', 56, 178);
  hg.textAlign = 'right'; hfont(18, false); hg.fillStyle = GREY; hg.fillText('ASÍ', 1024, 112); hfont(32); hg.fillStyle = PINK; hg.fillText('FUNCIONA', 1024, 148);
  const mk = win(t, K['truco_2'] - 0.1, 0.3) * (1 - win(t, 43.0, 0.4));
  if (mk > 0.01) { const done = t > K['separalos_10'], txt = done ? 'EL TRUCO: SEPÁRALOS' : 'EL TRUCO DE JASON Y LUCÍA · ???', col = done ? GREENc : VIOL, on = done || Math.sin(t * 9) > -0.3;
    hg.globalAlpha = a * mk * (on ? 1 : 0.3); hfont(20); hg.letterSpacing = '2px'; hg.textAlign = 'right'; const w = hg.measureText(txt).width + 34, x1 = 1024, x0 = x1 - w, y = 228;
    hg.fillStyle = 'rgba(10,8,24,.74)'; rr(hg, x0, y - 26, w, 40, 8); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2; rr(hg, x0, y - 26, w, 40, 8); hg.stroke(); hg.fillStyle = col; hg.fillText(txt, x1 - 17, y + 1); }
  hg.restore();
}
// ---- las estrellas: estado (0 = hueca, 1 = encendida) de cada una y si se ve
function starsAt(t) {
  const lit = [1, 1, 1, 1, 1, 0], sc = [1, 1, 1, 1, 1, 1]; let a = 1, six = 1;
  const blink = t0 => Math.floor((t - t0) * 7) % 2 === 0 ? 1 : 0;
  if (t >= 10.3 && t < K['seis_4'] - 0.1) { six = 1 - win(t, 10.3, 0.4); if (t > K['parpadearan_3']) { const b = blink(K['parpadearan_3']); for (let i = 0; i < 5; i++) lit[i] = b; } a = 1 - win(t, 14.05, 0.4); }
  else if (t >= K['seis_4'] - 0.1 && t < K['todo_6']) { for (let i = 0; i < 6; i++) { const ti = K['seis_4'] - 0.05 + i * 0.14; lit[i] = t > ti ? 1 : 0; sc[i] = pops(t, ti, 0.3); } }
  else if (t >= K['todo_6'] && t < K['pista_7'] - 0.3) { const off = win(t, K['todo_6'], 0.3); for (let i = 0; i < 6; i++) lit[i] = 1 - off; const tc = K['testigo_6'] + 0.42; if (t > tc && t < K['ve_6']) { lit[0] = 1; sc[0] = 0.75 + 0.25 * pops(t, tc, 0.3); } }
  else if (t >= K['pista_7'] - 0.3 && t < K['buscan_10']) { const b = t > K['facil_9'] ? (t > K['facil_9'] + 0.85 ? 0 : blink(K['facil_9'])) : 1; for (let i = 0; i < 6; i++) { const ti = K['pista_7'] - 0.3 + i * 0.08; lit[i] = i < 3 && t > ti ? b : 0; if (i < 3) sc[i] = 0.75 + 0.25 * pops(t, ti, 0.3); } }
  else if (t >= K['buscan_10'] && t < K['cinco_11'] - 0.1) { const tb = TL.split + 0.6, b = t > tb ? (t > tb + 0.6 ? 0 : blink(tb)) : 1; for (let i = 0; i < 6; i++) { const ti = K['buscan_10'] + i * 0.1; lit[i] = i < 2 && t > ti ? b : 0; if (i < 2) sc[i] = 0.75 + 0.25 * pops(t, ti, 0.3); } }
  else if (t >= K['cinco_11'] - 0.1) { for (let i = 0; i < 6; i++) { const ti = K['cinco_11'] - 0.1 + i * 0.12; lit[i] = i < 5 && t > ti ? 1 : 0; if (i < 5) sc[i] = 0.75 + 0.25 * pops(t, ti, 0.3); } }
  return { lit, sc, a, six };
}
function starPath(x, y, r) { hg.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.46 : r; hg.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } hg.closePath(); }
function drawStars(t) {
  const st = starsAt(t); if (st.a <= 0.01) return; const pulse = 1 + 0.05 * Math.sin(t / END * Math.PI * 2 * 60);
  hg.save(); hg.lineJoin = 'round';
  for (let i = 0; i < 6; i++) { const al = st.a * (i === 5 ? st.six : 1); if (al <= 0.01 || st.sc[i] <= 0.01) continue; const n = 5 + st.six, x = starX(i, n), r = STAR_R * st.sc[i] * (st.lit[i] ? pulse : 1);
    hg.globalAlpha = al; hg.shadowColor = 'rgba(0,0,0,.75)'; hg.shadowBlur = 14; starPath(x, STAR_Y, r + 5); hg.fillStyle = 'rgba(10,8,22,.82)'; hg.fill();
    if (st.lit[i]) { hg.shadowColor = '#FFD76A'; hg.shadowBlur = 26; starPath(x, STAR_Y, r); hg.fillStyle = GOLDs; hg.fill(); hg.shadowBlur = 0; starPath(x, STAR_Y, r * 0.62); hg.fillStyle = '#ffffff'; hg.globalAlpha = al * 0.55; hg.fill(); }
    else { hg.shadowBlur = 0; starPath(x, STAR_Y, r); hg.strokeStyle = 'rgba(235,238,245,.75)'; hg.lineWidth = 3; hg.stroke(); } }
  hg.restore();
}
// ---- iconos de las pistas (centrados en 0,0; tamaño ≈ 70)
function icon(i, col) {
  hg.fillStyle = col; hg.strokeStyle = col; hg.lineWidth = 6; hg.lineCap = 'round'; hg.lineJoin = 'round';
  if (i === 0) { hg.beginPath(); rr(hg, -40, -6, 80, 24, 9); hg.fill(); hg.beginPath(); hg.moveTo(-24, -6); hg.lineTo(-13, -27); hg.lineTo(15, -27); hg.lineTo(28, -6); hg.closePath(); hg.fill();
    hg.fillStyle = '#0a0c18'; for (const x of [-22, 22]) { hg.beginPath(); hg.arc(x, 18, 12, 0, 7); hg.fill(); } hg.fillStyle = col; for (const x of [-22, 22]) { hg.beginPath(); hg.arc(x, 18, 7.5, 0, 7); hg.fill(); } }
  else if (i === 1) { hg.beginPath(); hg.moveTo(-14, -30); hg.quadraticCurveTo(0, -18, 14, -30); hg.lineTo(40, -16); hg.lineTo(30, 4); hg.lineTo(20, -2); hg.lineTo(20, 32); hg.lineTo(-20, 32); hg.lineTo(-20, -2); hg.lineTo(-30, 4); hg.lineTo(-40, -16); hg.closePath(); hg.fill(); }
  else if (i === 2) { hg.beginPath(); hg.arc(0, -14, 17, 0, 7); hg.fill(); hg.beginPath(); hg.moveTo(-32, 34); hg.quadraticCurveTo(-32, 6, 0, 6); hg.quadraticCurveTo(32, 6, 32, 34); hg.closePath(); hg.fill(); }
  else if (i === 3) { hg.save(); hg.rotate(0.28); rr(hg, -34, -16, 52, 28, 6); hg.fill(); hg.beginPath(); hg.moveTo(18, -9); hg.lineTo(36, -16); hg.lineTo(36, 12); hg.lineTo(18, 5); hg.closePath(); hg.fill(); hg.restore();
    hg.beginPath(); hg.moveTo(-12, 12); hg.lineTo(-12, 30); hg.lineTo(-34, 30); hg.stroke(); }
  else if (i === 4) { for (const [x, s] of [[-17, 1], [17, 1]]) { hg.beginPath(); hg.arc(x, -15, 13, 0, 7); hg.fill(); hg.beginPath(); hg.moveTo(x - 24, 32); hg.quadraticCurveTo(x - 24, 4, x, 4); hg.quadraticCurveTo(x + 24, 4, x + 24, 32); hg.closePath(); hg.fill(); } }
}
function lockIcon(col, open) { hg.strokeStyle = col; hg.fillStyle = col; hg.lineWidth = 7; hg.lineCap = 'round'; hg.save(); if (open) { hg.translate(-6, -6); hg.rotate(-0.5); } hg.beginPath(); hg.arc(0, -12, 15, Math.PI, 0); hg.lineTo(15, -2); hg.moveTo(-15, -12); hg.lineTo(-15, -2); hg.stroke(); hg.restore(); rr(hg, -24, -4, 48, 38, 8); hg.fill(); }
// estado de cada pista: ap (aparece), on (encendida), off (borrada)
function plqAt(t) {
  const on0 = [K['coche_5'] - 0.05, K['ropa_5'] - 0.05, K['aspecto_5'] - 0.05, K['grabado_5'] + 0.15, K['pareja_10'] - 0.05], off0 = [K['una_8'] - 0.05, K['otra_8'] - 0.05, 1e9, 1e9, TL.split + 0.25];
  const row = win(t, K['debajo_4'] - 0.05, 0.3) * (1 - 0.72 * cw(t, K['todo_6'] + 0.1, K['pista_7'] - 0.35, 0.3)) * (1 - win(t, 42.3, 0.6));
  return PLQ.map((p, i) => { const ap = eo(seg(t, K['debajo_4'] + i * 0.14, K['debajo_4'] + i * 0.14 + 0.35)); let on = t > on0[i] ? 1 : 0, off = t > off0[i] ? 1 : 0;
    if (off && t < off0[i] + 0.4) on = Math.floor((t - off0[i]) * 16) % 2; else if (off) on = 0;                    // parpadea como un neón al apagarse
    const pk = t > on0[i] && !off ? 1 + 0.12 * (1 - seg(t, on0[i], on0[i] + 0.3)) : 1;
    return { ap, on, off: off && t >= off0[i] + 0.4 ? 1 : 0, pk, lock: i === 4 ? (t < K['truco_10'] ? 1 : t < on0[4] ? 2 : 0) : 0, row }; });
}
function drawPlaques(t) {
  const P = plqAt(t); if (P[0].row <= 0.01) return; const A = S.anc, anc = [[A.car], [A.shirt], [A.face], [A.cctv], [A.face, A.lucia]];
  hg.save(); hg.globalAlpha = 0.34 * P[0].row; const gr = hg.createLinearGradient(0, 430, 0, 790); gr.addColorStop(0, 'rgba(8,6,20,0)'); gr.addColorStop(0.2, 'rgba(8,6,20,1)'); gr.addColorStop(0.8, 'rgba(8,6,20,1)'); gr.addColorStop(1, 'rgba(8,6,20,0)'); hg.fillStyle = gr; hg.fillRect(0, 430, W, 360); hg.restore();
  // hilos de neón de cada pista encendida a su cosa en la calle
  P.forEach((p, i) => { if (!p.on || p.ap < 0.99) return; const x = plqX(i), y = PLQ_Y + PLQ_H; for (const a of anc[i]) { const q = proj(a); if (!q.ok) continue; const qx = clamp(q.x, 20, W - 20), qy = clamp(q.y, y + 20, H - 200);
    hg.save(); hg.globalAlpha = 0.9 * p.row; hg.shadowColor = PLQ[i].c; hg.shadowBlur = 14; hg.strokeStyle = PLQ[i].c; hg.lineWidth = 3.5; hg.setLineDash([2, 12]); hg.lineDashOffset = -t * 60; hg.lineCap = 'round'; hg.beginPath(); hg.moveTo(x, y + 4); hg.lineTo(qx, qy); hg.stroke();
    hg.setLineDash([]); hg.fillStyle = PLQ[i].c; hg.beginPath(); hg.arc(qx, qy, 4, 0, 7); hg.fill(); hg.lineWidth = 3; hg.beginPath(); hg.arc(qx, qy, 20 + 4 * Math.sin(t * 6), 0, 7); hg.stroke(); hg.restore(); } });
  P.forEach((p, i) => { if (p.ap <= 0.01) return; const x = plqX(i), y = PLQ_Y - (1 - p.ap) * 26, c = PLQ[i].c, w = PLQ_W * p.pk, h = PLQ_H * p.pk;
    hg.save(); hg.globalAlpha = p.ap * p.row; hg.translate(x, y + PLQ_H / 2);
    hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = 18; hg.fillStyle = 'rgba(12,10,28,.9)'; rr(hg, -w / 2, -h / 2, w, h, 20); hg.fill();
    if (p.on) { hg.shadowColor = c; hg.shadowBlur = 20; hg.strokeStyle = c; hg.lineWidth = 4; } else { hg.shadowBlur = 0; hg.strokeStyle = p.off ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.34)'; hg.lineWidth = 2.5; }
    rr(hg, -w / 2, -h / 2, w, h, 20); hg.stroke();
    hg.save(); hg.translate(0, -16); const ic = p.on ? c : (p.off ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.42)'); if (p.on) { hg.shadowColor = c; hg.shadowBlur = 16; } else hg.shadowBlur = 0;
    if (p.lock) lockIcon(p.lock === 2 ? VIOL : 'rgba(255,255,255,.42)', p.lock === 2); else icon(i, ic); hg.restore();
    hg.shadowBlur = 0; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(21); hg.letterSpacing = '2px'; hg.fillStyle = p.on ? INK : (p.off ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.55)'); hg.fillText(p.lock ? '???' : PLQ[i].n, 0, 52);
    if (p.off) { hg.strokeStyle = REDc; hg.lineWidth = 7; hg.lineCap = 'round'; hg.shadowColor = REDc; hg.shadowBlur = 10; hg.beginPath(); hg.moveTo(-w / 2 + 22, h / 2 - 24); hg.lineTo(w / 2 - 22, -h / 2 + 24); hg.stroke(); }
    hg.restore(); });
}
function hudAt(t) {
  hudBegin(); hdr(t); const A = S.anc;
  drawPlaques(t); drawStars(t);
  // 1 · no te busca a ti: busca tu ropa y tu coche
  neon(A.nude, 'TÚ', '', cw(t, K['ti_1'] - 0.2, 5.55, 0.2), { size: 48, color: INK, dx: 70, dy: -150, ymin: 620 });
  neon(A.shirt, 'TU ROPA', '', cw(t, K['ropa_1'] - 0.12, 5.75, 0.2), { size: 44, color: PINK, dx: -170, dy: -150, ymin: 620 });
  neon(A.car, 'TU COCHE', '', cw(t, K['coche_1'] - 0.12, 6.4, 0.2), { size: 44, color: ORNG, dx: 60, dy: 230, ymin: 620 });
  // 2 · Jason y Lucía
  neon(A.face, 'JASON', '', cw(t, K['jason_2'] - 0.1, 10.15, 0.2), { size: 40, color: ORNG, dx: 170, dy: -150, ymin: 620 });
  neon(A.lucia, 'LUCÍA', '', cw(t, K['lucia_2'] - 0.1, 10.15, 0.2), { size: 40, color: PINK, dx: -170, dy: -170, ymin: 620 });
  // 3 · en GTA 5…  4 · ahora, en GTA 6
  bigNeon('EN GTA 5', 1500, 100, GREY, cw(t, K['gta_3'] - 0.1, 14.45, 0.2), 'ESCONDERTE Y ESPERAR');
  bigNeon('EN GTA 6', 1500, 100, CYAN, cw(t, K['ahora_4'] - 0.05, K['pero_4'] + 0.2, 0.2), 'SEIS ESTRELLAS');
  // 6 · el testigo; la alarma; sin testigo ni alarma, no hay estrellas
  { const u = seg(t, K['testigo_6'] - 0.15, K['testigo_6'] + 0.42), q = proj(A.wit); if (u > 0 && t < K['ve_6'] && q.ok) { const x1 = starX(0, 6), y1 = STAR_Y + 30, x = q.x + (x1 - q.x) * eo(u), y = q.y + (y1 - q.y) * eo(u);
      hg.save(); hg.shadowColor = AMBc; hg.shadowBlur = 14; hg.strokeStyle = AMBc; hg.lineWidth = 4; hg.setLineDash([3, 14]); hg.lineDashOffset = -t * 90; hg.lineCap = 'round'; hg.beginPath(); hg.moveTo(q.x, q.y); hg.lineTo(x, y); hg.stroke(); hg.restore(); } }
  neon(A.wit, 'TESTIGO', 'LLAMA A LA POLICÍA', cw(t, K['testigo_6'] - 0.1, K['nadie_6'] + 0.1, 0.2), { size: 40, color: AMBc, dx: 170, dy: 230, ymin: 800 });
  neon(A.alarm, 'ALARMA', 'EN SILENCIO', cw(t, K['salta_6'] - 0.1, 29.0, 0.2), { size: 40, color: REDc, dx: 150, dy: 260, ymin: 800 });
  bigNeon('SIN TESTIGOS', 1480, 92, GREENc, cw(t, K['hay_6'] - 0.1, 29.15, 0.2), 'NO HAY ESTRELLAS');
  // 8 · una menos… otra menos
  bigNeon('UNA PISTA MENOS', 1520, 84, GREENc, cw(t, K['una_8'] - 0.05, K['unas_8'] + 0.05, 0.15));
  bigNeon('OTRA MENOS', 1520, 84, GREENc, cw(t, K['otra_8'] - 0.05, K['cuantas_9'] + 0.25, 0.15));
  // 10 · el truco: si buscan a una pareja… sepáralos
  neon(A.face, 'JASON', '', cw(t, K['jason_10'] - 0.1, TL.split, 0.2), { size: 36, color: ORNG, dx: 150, dy: -160, ymin: 800 });
  neon(A.lucia, 'LUCÍA', '', cw(t, K['lucia_10'] - 0.1, TL.split, 0.2), { size: 36, color: PINK, dx: -150, dy: -170, ymin: 800 });
  bigNeon('SEPÁRALOS', 1500, 112, VIOL, cw(t, K['separalos_10'] - 0.05, 41.55, 0.15));
  // 11 · ¿huyes o te cambias de ropa?
  bigNeon('¿HUYES…', 1400, 108, INK, cw(t, K['huyes_11'] - 0.05, 45.1, 0.25)); bigNeon('…O TE CAMBIAS?', 1530, 96, PINK, cw(t, K['cambias_11'] - 0.05, 45.1, 0.25));
}
