// ---------------------------------------------------------------- el panel de cotizaciones (lienzo de 2048 × 640 = 10 × 3,125 m) y la cinta de valores.
// Lo importante se dibuja en la franja central (≈ 3,6 m), que es lo que entra en un plano vertical; a los lados, tablas de mercados en tenue.
const BW = 2048, BH = 640, CX0 = 650, CX1 = 1398;
function buildBoard() { S.bd = { lastKey: '' }; }
const GOLD = '#FFC24A', REDC = '#FF5A4E', WHT = '#EEF2F6', GRY = '#8A919B';
function bTxt(g, s, x, y, size, col, k = 1, o = {}) { if (k <= 0) return; g.save(); g.globalAlpha = (o.a ?? 1) * clamp(k * 2); g.font = `${o.w || 800} ${size}px ${o.f || 'Inter'}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillStyle = col;
  if (o.type !== false && k < 1) { const n = Math.floor(s.length * clamp(k * 1.4)); s = s.slice(0, n); } g.fillText(s, x, y); g.restore(); }
function bLine(g, pts, k, col, w = 6, glow = 14) { if (k <= 0 || pts.length < 2) return; const n = Math.max(2, Math.floor(pts.length * clamp(k))); g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = glow;
  g.beginPath(); for (let i = 0; i < n; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]); g.stroke(); g.restore(); }
function sideTables(g, a) {         // tablas de mercados a los lados (sin cifras inventadas: solo nombres y flechas)
  g.save(); g.globalAlpha = a; g.font = '700 30px Inter'; g.textBaseline = 'middle';
  const rows = [['BOLSA ESP', 1], ['EURO / DÓLAR', -1], ['ORO', 1], ['BONO 10 AÑOS', -1], ['PETRÓLEO', 1], ['BOLSA EUROPA', 1], ['BOLSA EE. UU.', 1], ['BOLSA JAPÓN', -1]];
  for (const [x0, x1] of [[70, 560], [1488, 1978]]) rows.forEach(([n, d], i) => { const y = 92 + i * 62; g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x0, y - 26, x1 - x0, 52);
    g.fillStyle = '#c9ced6'; g.textAlign = 'left'; g.fillText(n, x0 + 18, y); g.fillStyle = d > 0 ? GOLD : REDC; g.textAlign = 'right'; g.fillText(d > 0 ? '▲' : '▼', x1 - 18, y); });
  g.restore();
}
function grid(g, a = 1) { g.save(); g.globalAlpha = 0.09 * a; g.strokeStyle = '#ffffff'; g.lineWidth = 1; for (let x = CX0; x <= CX1; x += 44) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 600); g.stroke(); } for (let y = 60; y <= 600; y += 44) { g.beginPath(); g.moveTo(CX0, y); g.lineTo(CX1, y); g.stroke(); } g.restore(); }
function walk(n, seed, drift, vol, y0) { const p = []; let y = y0; for (let i = 0; i < n; i++) { y += drift + (hash(i * 1.73 + seed) - 0.5) * vol; p.push(y); } return p; }
const IDX = walk(90, 1, -2.6, 16, 520), FUND = IDX.map((y, i) => y + i * 1.15 + Math.sin(i * 0.4) * 4);
function boardAt(t) {
  const B = S.bd, ph = [
    t < K.entonces2 - 0.1 ? 1 : 0, t >= K.entonces2 - 0.1 && t < K.mates6 - 0.15 ? 1 : 0, t >= K.mates6 - 0.15 && t < K.econom7 - 0.1 ? 1 : 0, t >= K.econom7 - 0.1 && t < K.finanzas8 - 0.1 ? 1 : 0,
    t >= K.finanzas8 - 0.1 && t < K.loco9 - 0.2 ? 1 : 0, t >= K.loco9 - 0.2 && t < K.uno10 - 0.1 ? 1 : 0, t >= K.uno10 - 0.1 && t < K.quien11 - 0.05 ? 1 : 0, t >= K.quien11 - 0.05 && t < K.fondos12 - 0.3 ? 1 : 0,
    t >= K.fondos12 - 0.3 && t < K.para13 - 0.1 ? 1 : 0, t >= K.para13 - 0.1 ? 1 : 0].indexOf(1);
  const q = v => Math.round(clamp(v) * 30);
  const ks = [q((t - K.subio1) / 1.3), q((t - K.n96) / 0.6), q((t - K.para2) / 0.4), q((t - K.mates6) / 0.5), q((t - K.estad6) / 0.5), q((t - K.muchas6) / 0.6), q((t - K.datos7 + 0.1) / 0.6), q((t - K.separar7) / 0.6),
    q((t - K.funciona7) / 0.4), q((t - K.cuanto8) / 0.6), q((t - K.nobel9) / 0.5), q((t - K.dos9) / 0.4), q((t - K.contrario9 - 0.05) / 0.4), q((t - K.uno10 - 0.05) / 1.0), q((t - K.otro10) / 0.4), q((t - K.infla10) / 0.9),
    q((t - K.primero11) / 0.4), q((t - K.cuesta11) / 0.6), q((t - K.copian12) / 0.6), q((t - K.cobran12) / 0.4), q((t - K.acaban12) / 0.8), q((t - K.asesor14) / 0.5), q((t - K.gestor14 - 0.05) / 0.3), q((t - K.indexado14 - 0.05) / 0.3), q((t - K.n2013) / 0.3)];
  const key = ph + '|' + ks.join(',');
  if (key !== B.lastKey) { B.lastKey = key; const T = S.boardTex, g = T.userData.g; const K2 = ks.map(v => v / 30);
    g.fillStyle = '#050608'; g.fillRect(0, 0, BW, BH); sideTables(g, 0.85);
    g.fillStyle = 'rgba(255,194,74,.08)'; g.fillRect(CX0 - 20, 30, CX1 - CX0 + 40, 580);
    if (ph === 0) { grid(g); const pts = IDX.map((y, i) => [CX0 + 30 + i * 7.6, y]); bLine(g, pts, K2[0], GOLD, 8, 18);
      bTxt(g, 'BOLSA ESPAÑOLA · 2025', (CX0 + CX1) / 2, 92, 40, WHT, 1, { w: 700 });
      if (K2[0] >= 1) bTxt(g, '+58,4 %', CX1 - 140, 150, 64, GOLD, 1, { type: false, w: 900 });
      if (K2[1] > 0) for (let j = 0; j < 6; j++) bLine(g, FUND.map((y, i) => [CX0 + 30 + i * 7.6, y + j * 9 + 6]), K2[1], 'rgba(160,166,176,.55)', 3, 0); }
    if (ph === 1) bTxt(g, '?', (CX0 + CX1) / 2, 330, 420, GOLD, K2[2], { type: false, w: 900 });
    if (ph === 2) { bTxt(g, 'max U(x, y)', (CX0 + CX1) / 2, 120, 54, WHT, K2[3], { f: 'Inter', w: 700 }); bTxt(g, 'Y = C + I + G + (X − M)', (CX0 + CX1) / 2, 215, 46, WHT, K2[4], { w: 700 });
      if (K2[5] > 0) { const pts = []; for (let i = 0; i <= 120; i++) { const x = -3 + i / 20; pts.push([(CX0 + CX1) / 2 + x * 100, 560 - 230 * Math.exp(-x * x / 2)]); } bLine(g, pts, K2[5], GOLD, 7, 14); bTxt(g, 'σ', (CX0 + CX1) / 2 + 120, 380, 48, GOLD, K2[5], { type: false }); } }
    if (ph === 3) { grid(g); const n = 40, pts = []; for (let i = 0; i < n; i++) { const x = hash(i * 2.3), y = 0.2 + 0.6 * x + (hash(i * 5.7) - 0.5) * 0.3; pts.push([CX0 + 60 + x * 620, 560 - y * 460]); }
      g.save(); pts.forEach((p, i) => { const a = clamp(K2[6] * 1.3 - i / n * 0.3); if (a <= 0) return; g.globalAlpha = a; g.fillStyle = K2[8] > 0 && (560 - p[1]) / 460 > 0.2 + 0.6 * (p[0] - CX0 - 60) / 620 ? GOLD : WHT; g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.fill(); }); g.restore();
      if (K2[7] > 0) { const sl = lerp(0, 0.6, eo(K2[7])), y0 = lerp(0.5, 0.2, eo(K2[7])); bLine(g, [[CX0 + 40, 560 - y0 * 460], [CX1 - 40, 560 - (y0 + sl * (CX1 - CX0 - 80) / 620) * 460]], 1, REDC, 7, 16); }
      bTxt(g, 'y = α + βx', (CX0 + CX1) / 2 + 120, 96, 42, WHT, K2[7], { w: 700 }); }
    if (ph === 4) { bTxt(g, 'VALOR =', (CX0 + CX1) / 2, 200, 66, WHT, K2[9], { w: 800 }); bTxt(g, 'Σ FLUJOS / (1 + r)ᵗ', (CX0 + CX1) / 2, 320, 54, GOLD, K2[9], { w: 800 }); }
    if (ph === 5) { bTxt(g, '2013', (CX0 + CX1) / 2, 215, 120, GOLD, K2[24], { type: false, w: 900 }); bTxt(g, 'NOBEL DE ECONOMÍA', (CX0 + CX1) / 2, 100, 54, WHT, K2[10], { w: 800 });
      bTxt(g, 'FAMA', (CX0 + CX1) / 2 - 190, 420, 70, WHT, K2[11], { w: 900 }); bTxt(g, 'SHILLER', (CX0 + CX1) / 2 + 170, 420, 70, WHT, K2[11], { w: 900 }); bTxt(g, '≠', (CX0 + CX1) / 2 - 10, 420, 90, REDC, K2[12], { type: false, w: 900 }); }
    if (ph === 6) { const mid = (CX0 + CX1) / 2; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(mid - 2, 60, 4, 540);
      const L = walk(60, 7, 0, 10, 340).map((y, i) => [CX0 + 30 + i * 5.6, y]); bLine(g, L, K2[13], WHT, 5, 10); bTxt(g, 'EL PRECIO', CX0 + 190, 110, 40, WHT, K2[13], { w: 800 }); bTxt(g, 'YA LO SABE TODO', CX0 + 190, 160, 34, WHT, K2[13], { w: 700 });
      const R2 = []; for (let i = 0; i <= 60; i++) { const u = i / 60; R2.push([mid + 30 + i * 5.6, u < 0.8 ? 520 - 380 * Math.pow(u / 0.8, 3) : 140 + (u - 0.8) / 0.2 * 420]); } bLine(g, R2, K2[15], REDC, 6, 14);
      bTxt(g, 'BURBUJA', mid + 190, 110, 44, REDC, K2[14], { w: 900 }); }
    if (ph === 7) { bTxt(g, '¿QUIÉN TENÍA RAZÓN?', (CX0 + CX1) / 2, 110, 50, WHT, 1, { type: false, w: 800 });
      if (K2[17] <= 0) { const w2 = eo(K2[16]); bTxt(g, 'FAMA', (CX0 + CX1) / 2 - 150, 300, 56 + 16 * w2, w2 > 0.5 ? GOLD : WHT, 1, { type: false, w: 900 }); bTxt(g, 'SHILLER', (CX0 + CX1) / 2 + 160, 300, 56, WHT, 1, { type: false, w: 900, a: 1 - 0.6 * w2 }); bTxt(g, 'o', (CX0 + CX1) / 2, 300, 44, GRY, 1, { type: false, w: 700 }); }
      if (K2[17] > 0) { const b0 = 470, x = CX0 + 120; g.save(); g.globalAlpha = clamp(K2[17] * 2); g.fillStyle = GOLD; g.fillRect(x, b0 - 260 * 1.0, 160, 260); g.fillStyle = '#9aa1ab'; g.fillRect(x + 300, b0 - 260 * (9.0 / 14.5) * lerp(1, 1, K2[17]), 160, 260 * (9.0 / 14.5));
        g.fillStyle = REDC; g.globalAlpha *= 0.85; g.fillRect(x + 300, b0 - 260, 160, 260 * (1 - 9.0 / 14.5) * eo(K2[17])); g.restore();
        bTxt(g, 'ÍNDICE  +14,5 %', x + 80, b0 + 50, 30, GOLD, 1, { type: false, w: 800 }); bTxt(g, 'FONDO MEDIO  +9,0 %', x + 380, b0 + 50, 30, WHT, 1, { type: false, w: 800 }); bTxt(g, '1.ᵉʳ SEMESTRE 2026', (CX0 + CX1) / 2, 590, 26, GRY, 1, { type: false, w: 700 }); } }
    if (ph === 8) { grid(g); const pi = IDX.map((y, i) => [CX0 + 30 + i * 7.6, y]); bLine(g, pi, 1, GOLD, 7, 14); bTxt(g, 'BOLSA', CX1 - 90, 130, 34, GOLD, 1, { type: false });
      for (let j = 0; j < 8; j++) bLine(g, FUND.map((y, i) => [CX0 + 30 + i * 7.6, y + j * 10 + 8]), 1, 'rgba(160,166,176,.5)', 3, 0);
      if (K2[18] > 0) { g.save(); g.setLineDash([18, 12]); bLine(g, pi.map(p => [p[0], p[1] - 10]), K2[18], '#DCE6FF', 5, 16); g.restore(); bTxt(g, 'FONDO INDEXADO = COPIA', (CX0 + CX1) / 2, 590, 30, '#DCE6FF', K2[18], { w: 800 }); }
      if (K2[19] > 0) bTxt(g, 'COMISIÓN BAJA', CX0 + 170, 110, 32, '#DCE6FF', K2[19], { w: 800 }); }
    if (ph === 9) {
      if (K2[21] > 0 && K2[22] < 0.25) { const fo = 1 - clamp(K2[22] * 4);
        bTxt(g, 'ESTO NO ES', (CX0 + CX1) / 2, 215, 44, GRY, K2[21], { a: fo, w: 800 }); bTxt(g, 'ASESORAMIENTO', (CX0 + CX1) / 2, 315, 62, WHT, K2[21], { a: fo, type: false, w: 900 });
        bTxt(g, 'FINANCIERO', (CX0 + CX1) / 2, 405, 62, GOLD, K2[21], { a: fo, type: false, w: 900 }); }
      bTxt(g, '¿GESTOR', (CX0 + CX1) / 2, 280, 110, WHT, K2[22], { type: false, w: 900 }); bTxt(g, 'O INDEXADO?', (CX0 + CX1) / 2, 420, 100, GOLD, K2[23], { type: false, w: 900 }); }
    T.needsUpdate = true; }
  // cinta de valores (se mueve sin parar y da vueltas enteras en el bucle)
  { const T = S.tickTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height, txt = '   BOLSA ESP ▲   ·   EURO / DÓLAR ▼   ·   ORO ▲   ·   BONO 10 AÑOS ▼   ·   PETRÓLEO ▲   ·   BOLSA EUROPA ▲   ·   BOLSA EE. UU. ▲   ·   BOLSA JAPÓN ▼';
    g.fillStyle = '#050608'; g.fillRect(0, 0, w, h); g.font = '800 40px Inter'; g.textBaseline = 'middle'; const tw = g.measureText(txt).width, off = -((t / END) * 3 % 1) * tw;
    for (let k = -1; k < Math.ceil(w / tw) + 1; k++) { let x = off + k * tw; g.fillStyle = GOLD; g.fillText(txt, x, h / 2 + 2); }
    T.needsUpdate = true; }
}
