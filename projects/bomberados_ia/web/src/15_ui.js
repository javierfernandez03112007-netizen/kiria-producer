// ---------------------------------------------------------------- la app en la pantalla (recreación): lista de fallos, la pregunta 37, el botón de la IA
// Lienzo de 900 × 1388 px para una ventana de 0,118 × 0,182 m. Las tarjetas de la IA van aparte (se separan de la pantalla).
const UI = { bg: '#0d1015', panel: '#161b23', line: 'rgba(238,242,246,.12)', white: '#eef2f6', grey: '#8f98a3', gold: '#f2b233', red: '#ff5a4e', teal: '#47dcc8', green: '#5fd38d' };
function uiText(g, s, x, y, px, col, w = 900, al = 'left', fam = 'Inter') { g.font = `${w} ${px}px ${fam}`; g.fillStyle = col; g.textAlign = al; g.fillText(s, x, y); }
function uiWrap(g, s, x, y, maxW, lh, px, col, w = 700) { g.font = `${w} ${px}px Inter`; g.fillStyle = col; g.textAlign = 'left'; const ws = s.split(' '); let line = '', yy = y;
  for (const wd of ws) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > maxW && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tst; } if (line) g.fillText(line, x, yy); return yy; }
function bookIcon(g, x, y, s, col) { g.save(); g.strokeStyle = col; g.lineWidth = s * 0.09; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, y + s * 0.15); g.quadraticCurveTo(x + s * 0.25, y, x + s * 0.5, y + s * 0.15); g.quadraticCurveTo(x + s * 0.75, y, x + s, y + s * 0.15);
  g.lineTo(x + s, y + s * 0.85); g.quadraticCurveTo(x + s * 0.75, y + s * 0.7, x + s * 0.5, y + s * 0.85); g.quadraticCurveTo(x + s * 0.25, y + s * 0.7, x, y + s * 0.85); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(x + s * 0.5, y + s * 0.15); g.lineTo(x + s * 0.5, y + s * 0.85); g.stroke(); g.restore(); }
function bulbIcon(g, x, y, s, col) { g.save(); g.strokeStyle = col; g.lineWidth = s * 0.09; g.beginPath(); g.arc(x + s / 2, y + s * 0.38, s * 0.3, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(x + s * 0.62, y + s * 0.78); g.lineTo(x + s * 0.38, y + s * 0.78); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(x + s * 0.38, y + s * 0.92); g.lineTo(x + s * 0.62, y + s * 0.92); g.stroke(); g.restore(); }
function cmpIcon(g, x, y, s, col) { g.save(); g.strokeStyle = col; g.lineWidth = s * 0.09; g.lineCap = 'round'; for (const [yy, d] of [[0.32, 1], [0.68, -1]]) { g.beginPath(); g.moveTo(x + s * 0.1, y + s * yy); g.lineTo(x + s * 0.9, y + s * yy);
  const tip = d > 0 ? x + s * 0.9 : x + s * 0.1; g.moveTo(tip - d * s * 0.18, y + s * (yy - 0.14)); g.lineTo(tip, y + s * yy); g.lineTo(tip - d * s * 0.18, y + s * (yy + 0.14)); g.stroke(); } g.restore(); }
function sparkIcon(g, x, y, s, col) { g.save(); g.fillStyle = col; g.beginPath(); const cx = x + s / 2, cy = y + s / 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.16 : s * 0.5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); g.restore(); }
// cursor en coordenadas del lienzo de la app (px) → coordenadas de la pantalla (m)
const appXY = (px, py) => [(px / 900 - 0.5) * AW, (0.5 - py / (AH * APX)) * AH];
// estado de la app en el instante t
function drawApp(g, t) {
  const w = 900, h = Math.round(AH * APX);
  g.fillStyle = UI.bg; g.fillRect(0, 0, w, h);
  // cabecera
  g.fillStyle = '#11151c'; g.fillRect(0, 0, w, 120); g.fillStyle = UI.line; g.fillRect(0, 120, w, 2);
  g.letterSpacing = '2px'; uiText(g, 'BOMBERADOS', 44, 78, 46, UI.gold, 900); g.letterSpacing = '0px';
  g.fillStyle = 'rgba(71,220,200,.16)'; rr(g, w - 170, 38, 126, 50, 25); g.fill(); sparkIcon(g, w - 156, 47, 32, UI.teal); uiText(g, 'IA', w - 110, 76, 30, UI.teal, 900);
  const splash = clamp((t - (K.bomberados5 - 0.55)) / 0.35) * (1 - clamp((t - (K.tocas - 0.45)) / 0.25));
  const tq = K.fallado + 0.12, tai = K.inteligencia + 0.1;
  if (t < tq) {          // lista del simulacro con los aciertos y la 37 fallada
    uiText(g, 'SIMULACRO 3 · REVISIÓN', 44, 196, 30, UI.grey, 700); uiText(g, '28 / 30', w - 44, 196, 30, UI.white, 900, 'right');
    const rows = [[35, 1], [36, 1], [37, 0], [38, 1], [39, 1], [40, 1], [41, 1]];
    rows.forEach(([q, ok], i) => { const y = 250 + i * 128, hot = q === 37, hov = hot && t > K.tocas + 0.15, pr = hot && t > K.fallado - 0.05;
      g.fillStyle = pr ? 'rgba(255,90,78,.22)' : hov ? 'rgba(255,90,78,.12)' : UI.panel; rr(g, 34, y, w - 68, 108, 20); g.fill();
      if (hot) { g.strokeStyle = UI.red; g.lineWidth = hov ? 4 : 2; rr(g, 34, y, w - 68, 108, 20); g.stroke(); }
      uiText(g, 'Pregunta ' + q, 70, y + 66, 38, UI.white, 700); uiText(g, 'V / F', w - 250, y + 66, 28, UI.grey, 700);
      if (ok) { g.strokeStyle = UI.green; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(w - 130, y + 52); g.lineTo(w - 112, y + 72); g.lineTo(w - 78, y + 36); g.stroke(); }
      else { g.strokeStyle = UI.red; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(w - 128, y + 34); g.lineTo(w - 82, y + 78); g.moveTo(w - 82, y + 34); g.lineTo(w - 128, y + 78); g.stroke(); } });
  } else if (t < tai + 0.3) {     // la pregunta 37 y el botón «Pregúntale a la IA»
    const k = eo(clamp((t - tq) / 0.25));
    g.globalAlpha = k; g.fillStyle = UI.panel; rr(g, 34, 160, w - 68, 560, 26); g.fill(); g.strokeStyle = 'rgba(255,90,78,.6)'; g.lineWidth = 3; rr(g, 34, 160, w - 68, 560, 26); g.stroke();
    uiText(g, 'PREGUNTA 37 · VERDADERO O FALSO', 72, 232, 30, UI.grey, 700);
    uiWrap(g, 'Un fuego de aceite en una sartén es de clase B.', 72, 326, w - 150, 74, 56, UI.white, 900);
    uiText(g, 'TU RESPUESTA:', 72, 560, 32, UI.grey, 700); g.fillStyle = 'rgba(255,90,78,.2)'; rr(g, 340, 516, 150, 64, 14); g.fill(); uiText(g, 'V  ✗', 360, 563, 38, UI.red, 900);
    uiText(g, 'FALLADA', w - 72, 563, 30, UI.red, 900, 'right');
    const by = 780, press = t > K.inteligencia - 0.04, hov = t > K.inteligencia - 0.45;
    g.fillStyle = press ? '#5ff0dc' : hov ? '#47dcc8' : '#2fb8a6'; rr(g, 34, by, w - 68, 140, 70); g.fill();
    sparkIcon(g, 150, by + 44, 52, '#06201d'); uiText(g, 'PREGÚNTALE A LA IA', 230, by + 88, 44, '#06201d', 900);
    g.globalAlpha = 1;
  } else {                // la IA responde: la pregunta queda arriba en pequeño (las tarjetas van en 3D)
    g.fillStyle = UI.panel; rr(g, 34, 150, w - 68, 150, 22); g.fill();
    uiText(g, 'PREGUNTA 37', 64, 205, 26, UI.grey, 700); uiText(g, 'Fuego de aceite en sartén → ¿clase B?', 64, 262, 34, UI.white, 700);
    const th = t < K.manual6 - 0.25;
    if (th) { for (let i = 0; i < 3; i++) { const on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 1.1)); g.fillStyle = `rgba(71,220,200,${on})`; g.beginPath(); g.arc(w / 2 - 50 + i * 50, 700, 14, 0, 7); g.fill(); }
      uiText(g, 'La IA está buscando…', w / 2, 790, 32, UI.teal, 700, 'center'); }
  }
  // portada de la app al abrir el portátil
  if (splash > 0.01) { g.globalAlpha = splash; g.fillStyle = UI.bg; g.fillRect(0, 122, w, h - 122);
    g.letterSpacing = '4px'; uiText(g, 'BOMBERADOS', w / 2, 640, 96, UI.gold, 900, 'center'); g.letterSpacing = '3px'; uiText(g, 'LA APP PARA OPOSITORES A BOMBERO', w / 2, 720, 26, UI.white, 700, 'center', 'SpaceMono'); g.letterSpacing = '0px';
    g.globalAlpha = 1; }
  // clics: onda en el sitio del cursor
  for (const [tc, x, y] of [[K.fallado, 450, 250 + 2 * 128 + 54], [K.inteligencia, 450, 850]]) { const u = (t - tc) / 0.45; if (u > 0 && u < 1) { g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - u)})`; g.lineWidth = 6; g.beginPath(); g.arc(x, y, 20 + u * 90, 0, 7); g.stroke(); } }
  g.fillStyle = 'rgba(143,152,163,.75)'; g.letterSpacing = '3px'; uiText(g, 'RECREACIÓN · EJEMPLO', w / 2, h - 30, 22, 'rgba(143,152,163,.75)', 700, 'center', 'SpaceMono'); g.letterSpacing = '0px';
}
// tarjetas de la IA: k = cuánto texto se ve (tecleo); rev = 0…1, la letra oculta pasa a «F» (después de «Falso.»)
function drawCard(i, g, w, h, k, t, rev) {
  g.clearRect(0, 0, w, h); g.fillStyle = '#121821'; rr(g, 2, 2, w - 4, h - 4, 26); g.fill();
  g.strokeStyle = i === 2 ? 'rgba(242,178,51,.55)' : 'rgba(71,220,200,.55)'; g.lineWidth = 3; rr(g, 2, 2, w - 4, h - 4, 26); g.stroke();
  const hid = (x, y, s) => { if (rev > 0.01) { g.save(); g.shadowColor = '#ffb030'; g.shadowBlur = 30 * rev; uiText(g, 'F', x, y, s, `rgba(255,190,70,${rev})`, 900); g.restore(); }
    if (rev < 0.99) { g.globalAlpha = 1 - rev; g.fillStyle = UI.gold; rr(g, x - 4, y - s * 0.78, s * 0.72, s * 0.86, 8); g.fill(); g.globalAlpha = 1; } };
  if (i === 0) {
    bookIcon(g, 34, 34, 54, UI.teal); g.letterSpacing = '3px'; uiText(g, 'DÓNDE ESTÁ', 110, 72, 26, UI.teal, 900, 'left', 'SpaceMono'); g.letterSpacing = '0px';
    g.fillStyle = 'rgba(143,152,163,.25)'; rr(g, w - 170, 34, 136, 40, 10); g.fill(); uiText(g, 'EJEMPLO', w - 102, 62, 20, UI.grey, 700, 'center', 'SpaceMono');
    if (k > 0.05) uiText(g, typed('Manual de Incendios', k * 2), 34, 150, 48, UI.white, 900);
    if (k > 0.4) { uiText(g, 'Tema 2  ·', 34, 218, 44, UI.grey, 700); const hl = clamp((t - K.pagina6 + 0.05) / 0.2);
      if (hl > 0) { g.fillStyle = `rgba(242,178,51,${0.25 * hl})`; rr(g, 232, 176, 230, 58, 12); g.fill(); } uiText(g, 'Pág. 34', 246, 218, 44, UI.gold, 900); }
  } else if (i === 1) {
    bulbIcon(g, 34, 30, 56, UI.teal); g.letterSpacing = '3px'; uiText(g, 'DEFINICIÓN', 110, 72, 26, UI.teal, 900, 'left', 'SpaceMono'); g.letterSpacing = '0px';
    if (k > 0.02) { uiText(g, 'Clase', 34, 160, 46, UI.white, 900); hid(178, 160, 46);
      const s = 'fuegos de aceites y grasas en aparatos de cocina.'; g.font = '700 40px Inter';
      uiText(g, ':', 214, 160, 46, UI.white, 900); const ty = typed(s, k * 1.2); uiWrap(g, ty, 240, 160, w - 280, 56, 40, UI.white, 700); }
  } else {
    cmpIcon(g, 34, 30, 54, UI.gold); g.letterSpacing = '3px'; uiText(g, 'PREGUNTAS PARECIDAS', 110, 70, 26, UI.gold, 900, 'left', 'SpaceMono'); g.letterSpacing = '0px';
    const R = [['Fuego de gasolina', 'B', K.compara + 0.3], ['Fuego de butano', 'C', K.compara + 0.75], ['Aceite en una sartén', '?', K.parecidas + 0.05]];
    R.forEach(([q, c, t0], j) => { const a = eo(clamp((t - t0) / 0.3)); if (a <= 0) return; const y = 110 + j * 98, trap = j === 2;
      g.globalAlpha = a; g.fillStyle = trap ? 'rgba(242,178,51,.1)' : 'rgba(238,242,246,.05)'; rr(g, 24, y, w - 48, 84, 16); g.fill();
      const sh = trap ? Math.sin(t * 40) * 6 * clamp(1 - Math.abs(t - K.trampa8 - 0.2) / 0.3) : 0;
      uiText(g, q, 50 + (1 - a) * 40, y + 56, 38, UI.white, 700);
      g.fillStyle = trap ? 'rgba(242,178,51,.22)' : 'rgba(71,220,200,.18)'; rr(g, w - 250 + sh, y + 14, 200, 56, 14); g.fill();
      uiText(g, 'CLASE', w - 230 + sh, y + 54, 30, trap ? UI.gold : UI.teal, 900);
      if (trap) { if (rev < 0.99) { const pu = 0.6 + 0.4 * Math.sin(t * 8); g.globalAlpha = a * (1 - rev); uiText(g, '?', w - 106 + sh, y + 56, 42, `rgba(255,${Math.round(150 * pu)},70,1)`, 900); g.globalAlpha = a; }
        if (rev > 0.01) { g.save(); g.shadowColor = '#ffb030'; g.shadowBlur = 30 * rev; uiText(g, 'F', w - 108, y + 56, 42, `rgba(255,190,70,${rev})`, 900); g.restore(); } }
      else uiText(g, c, w - 106, y + 56, 42, UI.white, 900);
      g.globalAlpha = 1; });
  }
}
// punto del «?» de la tarjeta 3 (de ahí sale la F de fuego), en coordenadas de la pantalla
const QMARK_LOCAL = () => { const w = Math.round(0.11 * APX), h = Math.round(0.058 * APX); return v3(((w - 94) / w - 0.5) * 0.11, -0.06 + (0.5 - 347 / h) * 0.058, 0.006); };
