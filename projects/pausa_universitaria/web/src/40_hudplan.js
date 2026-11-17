// ---------------------------------------------------------------- RÓTULOS: «Otra clase más…» (texto en pantalla, no se dice) y el eslogan del cierre.
function buildHudPlan() {}
function sText(txt, x, y, px, weight, a, o = {}) { if (a <= 0.01) return 0; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${weight} ${px}px Inter, sans-serif`; hg.textAlign = o.align || 'left'; hg.textBaseline = 'alphabetic'; hg.letterSpacing = (o.ls || 0) + 'px';
  hg.shadowColor = 'rgba(0,0,0,.6)'; hg.shadowBlur = px * 0.28 * PR; hg.shadowOffsetY = px * 0.04 * PR; hg.fillStyle = o.col || '#ffffff'; hg.fillText(txt, x, y); const w = hg.measureText(txt).width; hg.restore(); return w; }
function hudAt(t) {
  hudBegin();
  // 0–4 s · «Otra clase más…» (se escribe sola)
  { const a = clamp((t - 0.45) / 0.3) * (1 - clamp((t - 3.5) / 0.4)); if (a > 0.01) sText(typed('Otra clase más…', clamp((t - 0.55) / 0.9)), 1130, 330, 84, 800, a); }
  // 35,8–40 s · eslogan (más de 4 s en pantalla)
  { const t0 = 35.8, a = clamp((t - t0) / 0.5); if (a > 0.01) {
      hg.save(); hg.globalAlpha = 0.62 * a; const gr = hg.createLinearGradient(0, 0, 0, 470); gr.addColorStop(0, 'rgba(10,18,16,1)'); gr.addColorStop(1, 'rgba(10,18,16,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, W, 470); hg.restore();
      const dy = (1 - sm5(a)) * 24, y = 232 + dy;
      sText('CAFETERÍA DE LA FACULTAD', W / 2, 118 + dy, 28, 700, a * 0.9, { align: 'center', ls: 7, col: '#ffd98a' });
      hg.save(); hg.font = '900 104px Inter, sans-serif'; const w1 = hg.measureText('Entre clase y clase, ').width, w2 = hg.measureText('recarga.').width; hg.restore(); const x0 = W / 2 - (w1 + w2) / 2;
      sText('Entre clase y clase, ', x0, y, 104, 900, a); sText('recarga.', x0 + w1, y, 104, 900, clamp((t - t0 - 0.25) / 0.5), { col: '#ffd98a' });
      sText('Café con leche y media tostada de tomate y aceite', W / 2, y + 74, 42, 500, clamp((t - t0 - 0.6) / 0.6), { align: 'center' }); } }
}
