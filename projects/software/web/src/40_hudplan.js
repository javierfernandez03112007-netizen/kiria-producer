// ---------------------------------------------------------------- rótulos 2D (solo los que ayudan a leer): piezas del ordenador, las notas que suben y la diferencia
function buildHudPlan() {}
const wpo = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(v3(x, y, z)); };
function hudAt(t) {
  hudBegin();
  // despiece del ordenador
  if (S.pc.visible) { const k = win(t, K.por3 + 0.25, 0.3) * (1 - win(t, K.montar - 0.2, 0.3));
    if (k > 0.01) S.pc.userData.parts.forEach((p, i) => { const pos = wpos(p); callout(pos, p.userData.name, null, clamp(k * 1.3 - i * 0.06), { dx: i % 2 ? 110 : -110, dy: -60 - (i % 3) * 40, size: 24, bg: true, color: i === 1 ? HC.teal : HC.white }); }); }
  // «millones»
  if (S.ph.visible) { const k = win(t, K.millones + 0.1, 0.3); if (k > 0.01) bigText('MILLONES DE USUARIOS', W / 2, 1480, 46, HC.amber, k, { glow: 18 }); }
  // las notas de corte que suben y la diferencia
  if (S.score.visible) {
    const U = S.score.userData, v1 = 10.175 * eo(clamp((t - (K.n1 - 0.25)) / 1.2)), v2 = 10.036 * eo(clamp((t - (K.n2 - 0.25)) / 1.2));
    [[v1, 0, HC.teal], [v2, 1, HC.amber]].forEach(([v, i, col]) => { if (v < 0.05) return; const b = U.bars[i], top = wpo(S.score, b.position.x, 0.05 + v * SC_K + 0.06, 0.06), P = proj(top);
      if (!P.ok) return; hg.save(); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '2px'; hfont(40); hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 10; hg.fillStyle = col; hg.fillText(v.toFixed(3).replace('.', ','), P.x, P.y); hg.restore(); });
    const gk = win(t, K.ni7 - 0.05, 0.35);
    if (gk > 0.01) { const a = proj(wpo(S.score, 0.01, 0.05 + 10.175 * SC_K, 0.07)), b = proj(wpo(S.score, 0.01, 0.05 + 10.036 * SC_K, 0.07)); dimV(a, b, '0,139', gk, HC.white, 0); }
  }
}
