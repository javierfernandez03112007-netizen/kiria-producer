// ---------------------------------------------------------------- RÓTULOS (lienzo 2D): el número de cada ventana que se enciende («8 de cada 10») y la fuente de cada dato.
function buildHudPlan() {}
function sText(txt, x, y, px, weight, a, o = {}) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${weight} ${px}px Inter, sans-serif`; hg.textAlign = o.align || 'center'; hg.textBaseline = 'alphabetic'; hg.shadowColor = 'rgba(0,0,0,.75)'; hg.shadowBlur = px * 0.35 * PR; hg.shadowOffsetY = px * 0.05 * PR; hg.fillStyle = o.col || '#ffffff'; hg.fillText(txt, x, y); hg.restore(); }
function hudAt(t) {
  hudBegin();
  if (cam.position.z < -9) { const LT = litTimes(), U = S.fac.userData, out = 1 - win(t, TL.help - 0.5, 0.3); let n = 0;
    const badge = (cx, cy, num, t0) => { const k = pop(t, t0, 0.3) * out; if (k <= 0.01) return; const p = proj(v3(cx - WIN.w / 2 + 0.2, cy + 0.42, ROOM.z0 - 0.3)); hg.save(); hg.translate(p.x, p.y); hg.scale(k, k); hg.shadowColor = 'rgba(0,0,0,.5)'; hg.shadowBlur = 14 * PR; hg.fillStyle = '#ff9a3d'; hg.beginPath(); hg.arc(0, 0, 30, 0, 7); hg.fill(); hg.shadowBlur = 0; hg.fillStyle = '#1a1420'; hg.font = '900 38px Inter, sans-serif'; hg.textAlign = 'center'; hg.fillText(String(num), 0, 14); hg.restore(); };
    badge(U.mine.cx, U.mine.cy, 1, TL.casi - 0.1); U.rooms.forEach(r => { if (r.has) { badge(r.s.cx, r.s.cy, n + 2, LT[n]); n++; } });
    sText('Encuesta de LinkedIn · EE. UU., 2021 · jóvenes: 78 %', W / 2, 1838, 30, 700, win(t, TL.casi - 0.6, 0.4) * out, { col: '#f4ead8' }); }
  sText('Universidad de Baylor, 2018 · 57 estudiantes', W / 2, 1838, 30, 700, win(t, TL.est + 0.2, 0.4) * (1 - win(t, TL.send - 0.3, 0.3)), { col: '#f4ead8' });
}
