// ---------------------------------------------------------------- RÓTULOS Y PANTALLAS (lienzo 2D): los bocadillos del chat (plano 2), la pantalla de la app a la derecha del sofá (plano 3),
// los textos del guion («Compara precios. Lee opiniones reales.», «Decidís entre todos.») y el confeti del abrazo. El cierre de marca (plano 6) lo hace el montaje.
function buildHudPlan() {}
const EMO = 'Inter, "Noto Color Emoji", sans-serif';
function sText(txt, x, y, px, weight, a, o = {}) { if (a <= 0.01) return 0; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${weight} ${px}px ${EMO}`; hg.textAlign = o.align || 'left'; hg.textBaseline = 'alphabetic';
  if (o.shadow !== false) { hg.shadowColor = 'rgba(0,0,0,.55)'; hg.shadowBlur = px * 0.3 * PR; hg.shadowOffsetY = px * 0.05 * PR; } hg.fillStyle = o.col || '#ffffff'; hg.fillText(txt, x, y); const w = hg.measureText(txt).width; hg.restore(); return w; }
// bocadillo de chat (verde claro, como un mensaje enviado) con su hora y el doble check; aparece con rebote
function chatBubble(txt, cx, cy, t, t0, px = 60) { const k = pop(t, t0, 0.32); if (k <= 0.01) return; hg.save(); hg.font = `700 ${px}px ${EMO}`; const tw = hg.measureText(txt).width, w = tw + px * 1.3, h = px * 2.05; cx = clamp(cx, w / 2 + 40, W - w / 2 - 40);
  hg.translate(cx, cy); hg.scale(k, k); hg.globalAlpha = clamp((t - t0) / 0.1); hg.shadowColor = 'rgba(0,0,0,.4)'; hg.shadowBlur = 30 * PR; hg.shadowOffsetY = 10 * PR; hg.fillStyle = '#d9fdd3'; rr(hg, -w / 2, -h / 2, w, h, px * 0.5); hg.fill();
  hg.beginPath(); hg.moveTo(w / 2 - px * 0.5, h / 2 - 6); hg.lineTo(w / 2 + px * 0.25, h / 2 + px * 0.42); hg.lineTo(w / 2 - px * 1.25, h / 2 - 2); hg.closePath(); hg.fill(); hg.shadowColor = 'transparent'; hg.shadowBlur = 0; hg.shadowOffsetY = 0;
  hg.fillStyle = '#111b21'; hg.textAlign = 'left'; hg.textBaseline = 'alphabetic'; hg.fillText(txt, -tw / 2 - px * 0.12, px * 0.18); hg.font = `500 ${px * 0.36}px Inter, sans-serif`; hg.fillStyle = '#5f7a72'; hg.textAlign = 'right'; hg.fillText('17:4' + (2 + Math.floor(hash(txt.length) * 3)) + '  ✓✓', w / 2 - px * 0.4, h / 2 - px * 0.2); hg.restore(); }
// ---- la app en grande (plano 3). Lienzo virtual de 540 de ancho dentro del marco del móvil
function appPanel(t) {
  const kin = sm5(seg(t, TL.panel, TL.panel + 0.5)) * (1 - sm5(seg(t, 19.6, 20.0))); if (kin <= 0.01) return; const x0 = 1296 + (1 - kin) * 760, y0 = 26, w = 556, h = 1000, s = (w - 28) / 540, vh = (h - 28) / s, g = hg;
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 50 * PR; g.shadowOffsetY = 18 * PR; g.fillStyle = '#16181d'; rr(g, x0, y0, w, h, 58); g.fill(); g.restore();
  g.save(); g.translate(x0 + 14, y0 + 14); g.scale(s, s); rr(g, 0, 0, 540, vh, 54); g.clip(); g.fillStyle = '#f2f3f5'; g.fillRect(0, 0, 540, vh);
  // cabecera, buscador y filtros
  appHeader(g, 540, null); g.fillStyle = BK.blue; g.fillRect(0, 126, 540, 110); g.fillStyle = '#fff'; g.strokeStyle = BK.yel; g.lineWidth = 7; rr(g, 20, 136, 500, 78, 14); g.fill(); g.stroke(); scrText(g, '🔍  Playa · 4 noches · 4 personas', 42, 187, 27, 700);
  const tapS = bump(t, TL.sort - 0.08, TL.sort + 0.25, 0.08, 0.2), sorted = sm5(seg(t, TL.sort + 0.12, TL.sort + 0.55)), chips = [['Precio más bajo', sorted > 0.3], ['Opiniones 8+', t > TL.rev - 0.3 && t < TL.no], ['Filtros', false]]; let cx = 20;
  for (const [c, on] of chips) { g.font = `700 23px Inter, sans-serif`; const cw = g.measureText(c).width + 34; g.fillStyle = on ? '#e7f1fb' : '#fff'; g.strokeStyle = on ? BK.cta : '#b9c0ca'; g.lineWidth = on ? 4 : 2.5; rr(g, cx, 258, cw, 56, 28); g.fill(); g.stroke(); scrText(g, c, cx + 17, 294, 23, 700, on ? BK.cta : BK.ink); cx += cw + 10; }
  if (tapS > 0.01) { g.save(); g.globalAlpha = 0.35 * tapS; g.fillStyle = BK.cta; g.beginPath(); g.arc(110, 286, 30 + 50 * (1 - tapS), 0, 7); g.fill(); g.restore(); }
  // la lista: al ordenar por precio, las tarjetas cambian de sitio (A 520 € · B 352 € · C 298 €  →  C · B · A)
  const no = bump(t, TL.no - 0.05, TL.si - 0.12, 0.18, 0.22), si = win(t, TL.si - 0.05, 0.25), gone = win(t, TL.no + 0.75, 0.3), ord0 = [0, 1, 2], ord1 = [2, 1, 0];
  for (let i = 0; i < 3; i++) { const st = STAYS[i], y = 336 + lerp(ord0[i], ord1[i], sorted) * 214, isB = i === 1, isC = i === 2, shx = isC ? 9 * no * Math.sin((t - TL.no) * 38) * (1 - gone) : 0;
    stayCard(g, st, 20 + shx, y - (isB ? 6 * si : 0), 500, 198, { sel: isB && (si > 0.4 || (t > TL.rev && t < TL.no)), a: isC ? 1 - 0.62 * gone : isB ? 1 : 1 - 0.5 * si });
    if (isC && no > 0.02 || isC && gone > 0.02) { const k = pop(t, TL.no + 0.12, 0.3); if (k > 0.01) { g.save(); g.translate(270 + shx, y + 99); g.scale(k, k); g.rotate(-0.12); g.strokeStyle = '#d4281c'; g.lineWidth = 9; g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, -200, -50, 400, 100, 16); g.fill(); g.stroke(); scrText(g, '“Ruidoso de noche”', 0, 14, 36, 900, '#d4281c', 'center'); g.restore(); } }
    if (isB && si > 0.02) { const k = pop(t, TL.si + 0.02, 0.32); g.save(); g.translate(462, y + 6); g.scale(k, k); g.fillStyle = '#1f9d55'; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-20, 2); g.lineTo(-5, 17); g.lineTo(22, -14); g.stroke(); g.restore(); } }
  // hoja que sube: primero las opiniones, después la cuenta entre cuatro
  const sheet = sm5(seg(t, TL.rev - 0.1, TL.rev + 0.3)) * (1 - sm5(seg(t, TL.no - 0.3, TL.no - 0.02))); if (sheet > 0.01) { const sy = vh - (vh - 372) * sheet, sp = sm5(seg(t, TL.split - 0.12, TL.split + 0.2));
    g.save(); g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 30; g.shadowOffsetY = -6; g.fillStyle = '#ffffff'; rr(g, 0, sy, 540, vh, 40); g.fill(); g.restore(); g.fillStyle = '#cfd4da'; rr(g, 230, sy + 16, 80, 8, 4); g.fill(); g.save(); g.translate(0, sy);
    scrText(g, 'Piso Brisa del Mar', 30, 84, 38, 900); g.fillStyle = BK.blue; rr(g, 30, 106, 84, 62, 12); g.fill(); scrText(g, '9,1', 72, 150, 38, 900, '#fff', 'center'); scrText(g, 'Fantástico', 130, 136, 30, 900); scrText(g, '214 opiniones', 130, 168, 24, 500, BK.grey);
    if (sp < 0.99) { g.save(); g.globalAlpha = 1 - sp; const revs = [['L', '#e07a5f', 'Lucía', 'Limpio y a 2 minutos', 'de la playa.'], ['M', '#3d9bd1', 'Marcos', 'Íbamos cuatro amigos:', 'perfecto y barato.'], ['S', '#81b29a', 'Sara', 'El anfitrión, majísimo.', 'Repetiríamos.']];
      revs.forEach((r, i) => { const k = pop(t, TL.rev + 0.3 + i * 0.36, 0.3); if (k <= 0.01) return; const y = 196 + i * 178; g.save(); g.translate(270, y + 80); g.scale(k, k); g.translate(-270, -80); g.fillStyle = '#f3f6fa'; rr(g, 24, 0, 492, 162, 20); g.fill(); g.fillStyle = r[1]; g.beginPath(); g.arc(70, 48, 28, 0, 7); g.fill(); scrText(g, r[0], 70, 59, 30, 900, '#fff', 'center');
        scrText(g, r[2], 112, 44, 27, 900); scrText(g, '★★★★★', 112, 76, 25, 700, '#f5a623'); scrText(g, '“' + r[3], 44, 116, 28, 500); scrText(g, r[4] + '”', 44, 148, 28, 500); g.restore(); }); g.restore(); }
    if (sp > 0.01) { g.save(); g.globalAlpha = sp; const t4 = Math.min(K['dividimos_2'], TL.no - 1.2), t5 = Math.min(K['cuatro_2'], TL.no - 0.55); scrText(g, 'Precio total · 4 noches', 270, 262, 30, 500, BK.grey, 'center'); scrText(g, '352 €', 270, 376, 118, 900, BK.ink, 'center');
      const k4 = pop(t, t4, 0.3); if (k4 > 0.01) { g.save(); g.translate(270, 462); g.scale(k4, k4); scrText(g, '÷ 4 personas', 0, 0, 56, 900, BK.cta, 'center'); g.restore(); }
      const k5 = pop(t, t5, 0.36); if (k5 > 0.01) { g.save(); g.translate(270, 640); g.scale(k5, k5); g.fillStyle = '#e6f6ec'; rr(g, -220, -128, 440, 196, 28); g.fill(); scrText(g, '88 €', 0, 0, 132, 900, '#1f8a4c', 'center'); scrText(g, 'por persona', 0, 48, 34, 700, '#1f8a4c', 'center'); g.restore(); } g.restore(); }
    g.restore(); }
  g.restore();
  sText('Pantalla simulada · datos de ejemplo', x0 + w / 2, y0 + h + 32, 20, 500, 0.85 * kin, { align: 'center' });
}
function hudAt(t) {
  hudBegin(); const n = shotAt(t).n;
  // ---- 2 · los mensajes del grupo
  if (n === 'bus') { const p = proj(headW(S.P.B)); chatBubble('¡¡SÍ!!', p.x - 430, p.y - 150, t, TL.bub[0], 104); }
  if (n === 'kit') { const p = proj(headW(S.P.C)); chatBubble('¿cuánto nos sale?', p.x - 520, p.y - 120, t, TL.bub[1], 72); }
  if (n === 'bed') { const p = proj(headW(S.P.D)); chatBubble('yo pongo mis ahorros del verano 💸', p.x + 560, p.y - 300, t, TL.bub[2], 58); }
  // ---- 3 · la app y «Compara precios. Lee opiniones reales.»
  if (n === 'sofa') { appPanel(t); const out = 1 - win(t, 19.5, 0.4), a1 = win(t, TL.sort + 0.1, 0.35) * out, a2 = win(t, TL.rev + 0.25, 0.35) * out;
    if (a1 > 0.01) { hg.save(); hg.globalAlpha = 0.5 * a1; const gr = hg.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, 'rgba(20,14,8,1)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 1200, 300); hg.restore(); }
    sText('Compara precios.', 70 - (1 - a1) * 30, 122, 74, 900, a1); sText('Lee opiniones reales.', 70 - (1 - a2) * 30, 208, 74, 900, a2, { col: '#ffd66b' }); }
  // ---- 4 · «Decidís entre todos.» y el confeti del abrazo
  if (n === 'vote' || n === 'hug') { const a = win(t, TL.vota + 0.35, 0.4) * (1 - win(t, 24.75, 0.25)), y = n === 'hug' ? 1000 : 128; hg.save(); hg.font = `900 84px ${EMO}`; const w1 = hg.measureText('Decidís ').width, w2 = hg.measureText('entre todos.').width; hg.restore();
    sText('Decidís ', W / 2 - (w1 + w2) / 2, y, 84, 900, a); sText('entre todos.', W / 2 - (w1 + w2) / 2 + w1, y, 84, 900, a, { col: '#ffd66b' }); }
  if (n === 'hug') { const u = t - 24.0, cols = ['#febb02', '#0071c2', '#f2664b', '#2f9e6b', '#ffffff', '#7d5fd0']; hg.save(); for (let i = 0; i < 90; i++) { const x = hash(i * 1.7) * W, sp = 520 + hash(i * 3.1) * 520, y = -60 + sp * u - 300 * hash(i * 5.3), r = u * (3 + hash(i) * 6) + i;
      hg.save(); hg.translate(x + 40 * Math.sin(u * 4 + i), y); hg.rotate(r); hg.fillStyle = cols[i % cols.length]; hg.globalAlpha = 0.95; hg.fillRect(-11, -6, 22, 12 * Math.abs(Math.cos(r * 1.3)) + 3); hg.restore(); } hg.restore(); }
}
