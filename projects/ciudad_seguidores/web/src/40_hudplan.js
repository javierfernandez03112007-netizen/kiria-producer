// ---------------------------------------------------------------- RÓTULOS (como la interfaz de un juego): barra de arriba (habitantes y rey), carteles sobre los
// edificios, avisos de lo que pasa, la tarjeta del comentario con más «me gusta» y el cartel de la ciudad sin nombre.
// (Los nombres de los seguidores no se dibujan aquí: los pone el montaje.)
function buildHudPlan() {}
const HF = (px, w = 800) => { hg.font = `${w} ${px}px Inter, sans-serif`; };
function hpill(x, y, txt, k, o = {}) {            // cartel con punta, centrado en x, con la punta en y
  if (k <= 0.01) return; const px = o.px || 34, s = popK(k); hg.save(); hg.translate(x, y); hg.scale(s, s); hg.globalAlpha = clamp(k * 2) * (o.a ?? 1); HF(px, 900); hg.letterSpacing = '2px'; const w = hg.measureText(txt).width + px * 1.3, h = px * 1.75;
  hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 14 * PR; hg.shadowOffsetY = 4 * PR; hg.fillStyle = o.bg || '#ffffff'; rr(hg, -w / 2, -h - 16, w, h, h / 2); hg.fill(); hg.beginPath(); hg.moveTo(-12, -17); hg.lineTo(12, -17); hg.lineTo(0, 0); hg.closePath(); hg.fill();
  hg.shadowColor = 'transparent'; hg.fillStyle = o.fg || '#1c2430'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, 1, -16 - h / 2 + px * 0.04); hg.restore(); }
function anchorPill(v, txt, k, o) { if (k <= 0.01) return; const p = proj(v); if (p.ok) hpill(p.x, p.y, txt, k, o); }
function heart(x, y, s, col) { hg.save(); hg.translate(x, y); hg.scale(s, s); hg.fillStyle = col; hg.beginPath(); hg.moveTo(0, 0.9); hg.bezierCurveTo(-1.6, -0.2, -0.9, -1.25, 0, -0.5); hg.bezierCurveTo(0.9, -1.25, 1.6, -0.2, 0, 0.9); hg.fill(); hg.restore(); }
function crownIcon(x, y, s, col) { hg.save(); hg.translate(x, y); hg.scale(s, s); hg.fillStyle = col; hg.beginPath(); hg.moveTo(-1, 0.6); hg.lineTo(-1.1, -0.6); hg.lineTo(-0.5, -0.05); hg.lineTo(0, -0.85); hg.lineTo(0.5, -0.05); hg.lineTo(1.1, -0.6); hg.lineTo(1, 0.6); hg.closePath(); hg.fill(); hg.restore(); }
function hudAt(t) {
  hudBegin(); const A = S.anc, rw = sm5(seg(t, TL.back0, TL.back1)), live = 1 - rw;
  // ---- barra de arriba: habitantes (los seguidores de hoy) y el rey
  { hg.save(); hg.shadowColor = 'rgba(0,0,0,.3)'; hg.shadowBlur = 16 * PR; hg.shadowOffsetY = 4 * PR; hg.fillStyle = 'rgba(18,24,34,.86)'; rr(hg, 70, 124, 940, 78, 39); hg.fill(); hg.shadowColor = 'transparent';
    hg.fillStyle = '#7ce0a0'; hg.beginPath(); hg.arc(116, 151, 9, 0, 7); hg.fill(); hg.beginPath(); hg.arc(116, 181, 17, Math.PI, 0); hg.fill();
    HF(33, 900); hg.textBaseline = 'middle'; hg.textAlign = 'left'; hg.fillStyle = '#ffffff'; hg.fillText('5.997', 146, 165); const w0 = hg.measureText('5.997').width; HF(25, 700); hg.fillStyle = '#aab4c2'; hg.letterSpacing = '2px'; hg.fillText('HABITANTES', 146 + w0 + 12, 166);
    const king = t >= TL.reign + 0.6 && t < END - 0.7, blink = 0.6 + 0.4 * Math.sin(t * 7); crownIcon(690, 163, 17, king ? '#ffd04a' : '#8a93a2'); HF(25, 700); hg.fillStyle = '#aab4c2'; hg.fillText('REY', 720, 166); const w1 = hg.measureText('REY').width;
    HF(31, 900); hg.letterSpacing = '1px'; hg.fillStyle = king ? '#ffd04a' : '#ff8a6a'; hg.globalAlpha = king ? 1 : blink; hg.fillText(king ? '¿TÚ?' : 'VACANTE', 720 + w1 + 14, 166); hg.restore(); }
  // ---- «una eres tú»: nada que rotular (los nombres los pone el montaje). El solar vacío:
  anchorPill(A.plot, '@¿tú?', win(t, TL.plot0 + 0.25, 0.3) * (1 - win(t, TL.plot1, 0.3)), { bg: '#ffffff', fg: '#1c2430', px: 46 });
  // ---- «cuantos más seamos»: +1, +1, +1… donde llegan los nuevos
  { const P = PEOPLE, g = seg(t, TL.more0, TL.more1 + 0.4); if (g > 0 && rw < 0.5) for (let n = 0; n < 16; n++) { const i = Math.floor((n + 0.5) / 16 * P.NG), t0 = TL.more0 + (i / (P.NG + 60)) * (TL.more1 + 0.4 - TL.more0), u = (t - t0) / 0.9; if (u <= 0 || u >= 1) continue;
      const p = proj(v3(P.gx[i], 8 + u * 26, P.gz[i])); if (!p.ok) continue; hg.save(); hg.globalAlpha = Math.sin(u * Math.PI); HF(54, 900); hg.textAlign = 'center'; hg.fillStyle = '#ffe07a'; hg.strokeStyle = 'rgba(40,30,0,.8)'; hg.lineWidth = 8; hg.strokeText('+1', p.x, p.y); hg.fillText('+1', p.x, p.y); hg.restore(); } }
  // ---- carteles de lo que tendrá la ciudad
  anchorPill(A.mercado, 'MERCADO', seg(t, TL.mercado + 0.1, TL.mercado + 0.45) * live * (1 - seg(t, TL.price - 0.2, TL.price)), { px: 36 });
  anchorPill(A.banco, 'BANCO', seg(t, TL.banco + 0.1, TL.banco + 0.45) * live, { px: 36 });
  anchorPill(A.hacienda, 'IMPUESTOS', seg(t, TL.tax + 0.1, TL.tax + 0.45) * live * (1 - win(t, TL.dry - 0.3, 0.3)), { px: 36, bg: '#ffd04a' });
  // ---- lo que pasará: sequía, subida de precios, crisis
  const noCr = 1 - seg(t, TL.crisis - 0.15, TL.crisis + 0.1);
  anchorPill(A.lago, 'SEQUÍA', seg(t, TL.dry + 0.1, TL.dry + 0.4) * live * noCr, { px: 44, bg: '#f0a020', fg: '#ffffff' });
  { const k = seg(t, TL.price, TL.price + 0.35) * live * noCr; anchorPill(A.mercado, 'PRECIOS ▲', k, { px: 44, bg: '#e2483d', fg: '#ffffff' });
    if (k > 0 && t < TL.back0 + 0.4) for (let n = 0; n < 6; n++) { const u = ((t - TL.price) * 0.9 + n / 6) % 1, p = proj(v3(A.mercado.x - 12 + n * 4.8, 4 + u * 16, A.mercado.z + (n % 2 ? 6 : -6))); if (!p.ok) continue;
        hg.save(); hg.globalAlpha = Math.sin(u * Math.PI) * k; hg.fillStyle = '#e2483d'; hg.beginPath(); hg.moveTo(p.x, p.y - 22); hg.lineTo(p.x + 18, p.y + 6); hg.lineTo(p.x + 7, p.y + 6); hg.lineTo(p.x + 7, p.y + 26); hg.lineTo(p.x - 7, p.y + 26); hg.lineTo(p.x - 7, p.y + 6); hg.lineTo(p.x - 18, p.y + 6); hg.closePath(); hg.fill(); hg.restore(); } }
  { const k = seg(t, TL.crisis, TL.crisis + 0.3) * (1 - sm5(seg(t, TL.back0, TL.back0 + 0.45))); if (k > 0.01) { const s = 1 + 0.5 * (1 - eo(clamp(k * 1.5))); hg.save(); hg.translate(W / 2, 1010); hg.scale(s, s); hg.rotate(-0.045); hg.globalAlpha = clamp(k * 3);
      HF(150, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '10px'; hg.lineWidth = 22; hg.strokeStyle = 'rgba(20,10,10,.85)'; hg.strokeText('CRISIS', 6, 0); hg.fillStyle = '#ff4a3d'; hg.fillText('CRISIS', 6, 0);
      hg.strokeStyle = '#ff4a3d'; hg.lineWidth = 14; hg.lineJoin = 'round'; hg.beginPath(); const pts = [[-300, 110], [-170, 150], [-60, 125], [60, 205], [170, 185], [300, 290]], n = clamp(k * 1.3) * (pts.length - 1); hg.moveTo(...pts[0]);
      for (let i = 1; i <= Math.floor(n); i++) hg.lineTo(...pts[i]); if (n < pts.length - 1) { const i = Math.floor(n), f = n - i; hg.lineTo(lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)); } hg.stroke(); hg.restore(); } }
  // ---- el trono: «?», la tarjeta del comentario con más «me gusta» y el cartel de la ciudad sin nombre
  { const k = seg(t, TL.who + 0.05, TL.who + 0.4) * (1 - win(t, TL.comment, 0.3)), p = proj(v3(A.seat.x, A.seat.y + 9, A.seat.z)); if (k > 0.01 && p.ok) { const s = popK(k) * (1 + 0.06 * Math.sin(t * 6)); hg.save(); hg.translate(p.x, p.y); hg.scale(s, s); hg.globalAlpha = clamp(k * 2); HF(230, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle';
      hg.lineWidth = 24; hg.strokeStyle = 'rgba(30,20,0,.85)'; hg.strokeText('?', 0, 0); hg.fillStyle = '#ffd04a'; hg.fillText('?', 0, 0); hg.restore(); } }
  { const k = seg(t, TL.comment, TL.comment + 0.35) * (1 - win(t, TL.reign + 0.2, 0.4)); if (k > 0.01) { const s = popK(k), x0 = -430, w = 860, h = 190; hg.save(); hg.translate(W / 2, 560); hg.scale(s, s); hg.globalAlpha = clamp(k * 2);
      hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 22 * PR; hg.shadowOffsetY = 6 * PR; hg.fillStyle = '#ffffff'; rr(hg, x0, -h / 2, w, h, 38); hg.fill(); hg.shadowColor = 'transparent';
      hg.fillStyle = '#d5dae2'; hg.beginPath(); hg.arc(x0 + 88, 0, 50, 0, 7); hg.fill(); hg.fillStyle = '#aab2be'; hg.beginPath(); hg.arc(x0 + 88, -14, 19, 0, 7); hg.fill(); hg.beginPath(); hg.arc(x0 + 88, 42, 34, Math.PI * 1.08, Math.PI * 1.92); hg.fill();
      HF(40, 900); hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.fillStyle = '#1c2430'; hg.fillText('@¿tú?', x0 + 164, -36); HF(36, 500); hg.fillStyle = '#4a5360'; hg.fillText(typed('Que la ciudad se llame…', seg(t, TL.comment + 0.25, TL.comment + 1.0)), x0 + 164, 30);
      const lk = sm5(seg(t, TL.like - 0.3, TL.like + 0.9)), n = Math.round(1 + lk * 2430), hs = 30 * (1 + 0.25 * Math.max(0, Math.sin((t - TL.like) * 14)) * (lk > 0 && lk < 1 ? 1 : 0)); heart(x0 + w - 92, -22, hs, lk > 0.02 ? '#ff3b5c' : '#c9ced6');
      HF(30, 800); hg.textAlign = 'center'; hg.fillStyle = '#1c2430'; hg.fillText(n.toLocaleString('es-ES').replace(/,/g, '.'), x0 + w - 92, 46); hg.restore(); } }
  { const k = seg(t, TL.name, TL.name + 0.35) * (1 - win(t, TL.reign + 0.2, 0.4)); if (k > 0.01) { const s = popK(k), w = 820, h = 200; hg.save(); hg.translate(W / 2, 1400); hg.scale(s, s); hg.globalAlpha = clamp(k * 2);
      hg.fillStyle = '#7a8088'; hg.fillRect(-w / 2 + 90, h / 2 - 4, 20, 90); hg.fillRect(w / 2 - 110, h / 2 - 4, 20, 90); hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 20 * PR; hg.shadowOffsetY = 6 * PR; hg.fillStyle = '#1f7a4d'; rr(hg, -w / 2, -h / 2, w, h, 26); hg.fill(); hg.shadowColor = 'transparent';
      hg.strokeStyle = '#ffffff'; hg.lineWidth = 6; rr(hg, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 18); hg.stroke(); HF(34, 700); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '6px'; hg.fillStyle = '#d6f2e2'; hg.fillText('BIENVENIDOS A', 0, -48);
      HF(74, 900); hg.letterSpacing = '10px'; hg.fillStyle = '#ffffff'; hg.fillText('_ _ _ _ _ _' + (Math.sin(t * 9) > 0 ? ' ▌' : '  '), 0, 34); hg.restore(); } }
}
