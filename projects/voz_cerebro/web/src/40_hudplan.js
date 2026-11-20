// ---------------------------------------------------------------- RÓTULOS (lienzo 2D, limpios, en Inter): cada cosa con su nombre cuando se nombra, los contadores (4 chips, 256 electrodos,
// 97 de cada 100), «2025 · 1/40 de segundo», «ensayo clínico» y las fuentes en pequeño. Nunca en la franja de los subtítulos (arriba, y ≈ 250–420).
function buildHudPlan() { HFONT = 'Inter'; HW = [700, 500]; }
const HGOLD = '#FFC56A', HBLUE = '#8FD3FF', HRED = '#FF6A5A', HGREEN = '#7CF0A9';
function htx(txt, x, y, px, w, a, o = {}) { if (a <= 0.01) return 0; hg.save(); hg.globalAlpha = clamp(a); hg.font = `${w} ${px}px Inter, sans-serif`; hg.textAlign = o.align || 'center'; hg.textBaseline = 'alphabetic'; hg.letterSpacing = (o.ls ?? 0) + 'px';
  hg.shadowColor = o.glow || 'rgba(0,0,0,.85)'; hg.shadowBlur = (o.glow ? 26 : px * 0.25) * PR; hg.fillStyle = o.col || '#fff'; hg.fillText(txt, x, y); const tw = hg.measureText(txt).width; hg.restore(); return tw; }
function lab(P, txt, sub, t, t0, t1, o = {}) { const k = clamp((t - t0) / 0.6) * (1 - win(t, t1, 0.35)); if (k <= 0.01) return; callout(P, txt, sub, Math.min(1, (t - t0) / 0.9), { size: 30, subSize: 22, color: o.col || HC.white, subCol: o.subCol || HC.grey, dx: o.dx ?? 150, dy: o.dy ?? 120, len: 46, a: k, bg: true }); }
function counter(t, t0, from, to, dur) { return Math.round(lerp(from, to, sm5(clamp((t - t0) / dur)))); }
function hudAt(t) {
  hudBegin(); const U = S.head.userData, inHead = cam.position.z > -100 && cam.position.x > -30;
  // ---- ELA: la vía, el corte y los músculos
  if (inHead) { const c0 = U.paths[1].getPointAt(0.5), cut = U.paths[1].getPointAt(0.42 + 0.0), mus = U.muscles[1].position.clone();
    lab(c0, 'NEURONAS MOTORAS', 'llevan la orden a los músculos', t, TL.neur - 0.2, TL.pens - 0.3, { col: HGOLD, dx: 150, dy: -190 });
    lab(mus, 'LENGUA · LABIOS · LARINGE', 'los músculos del habla', t, TL.musc - 0.2, TL.pens - 0.3, { col: HBLUE, dx: 110, dy: 300 });
    // la corteza del habla (cerebro solo y cerebro rosa)
    lab(U.speech, 'CORTEZA MOTORA DEL HABLA', 'aquí nace la orden de hablar', t, TL.intactos - 0.4, TL.impl - 0.2, { col: HGOLD, dx: -150, dy: 260 }); }
  // ---- 4 chips · 256 electrodos
  { const a = clamp((t - (TL.cuatro - 0.2)) / 0.4) * (1 - win(t, CUTS[0] - 0.3, 0.3)); if (a > 0.01) { const nC = TL.k.filter(tk => t >= tk).length, nE = t < TL.e256 ? 0 : counter(t, TL.e256, 0, 256, 1.0);
      hg.save(); hg.globalAlpha = a; hg.fillStyle = 'rgba(4,10,22,.72)'; rr(hg, 160, 1430, 760, 240, 34); hg.fill(); hg.strokeStyle = 'rgba(143,211,255,.55)'; hg.lineWidth = 2; rr(hg, 160, 1430, 760, 240, 34); hg.stroke(); hg.restore();
      htx(String(nC), 330, 1580, 120, 900, a, { col: HBLUE }); htx('CHIPS', 330, 1630, 26, 700, a, { col: HC.grey, ls: 4 });
      htx(String(nE), 690, 1580, 120, 900, a * clamp((t - TL.e256 + 0.1) / 0.3), { col: HGOLD }); htx('ELECTRODOS', 690, 1630, 26, 700, a * clamp((t - TL.e256 + 0.1) / 0.3), { col: HC.grey, ls: 4 });
      htx('×', 510, 1570, 60, 500, a * 0.6, { col: HC.grey }); } }
  // ---- las neuronas y el electrodo
  if (cam.position.distanceTo(NEU) < 30) { const tip = NEU.clone().add(_v().set(-1.55, 0.95, 0.3)); lab(tip, 'ELECTRODO', 'escucha a la neurona', t, TL.captar - 0.3, TL.cuando + 0.15, { col: HGOLD, dx: 160, dy: 200 });
    lab(S.neuro.userData.cells[0].getWorldPosition(_v()), 'NEURONA', null, t, TL.captar + 0.2, TL.cuando + 0.15, { col: HBLUE, dx: -150, dy: -160 }); }
  // ---- la IA y las palabras
  { const a = clamp((t - TL.ia) / 0.4) * (1 - win(t, TL.result - 0.2, 0.3)); if (a > 0.01 && inHead) { htx('INTELIGENCIA ARTIFICIAL', W / 2, 1430, 30, 700, a, { col: HBLUE, ls: 6 }); htx('señal → sonidos → palabras', W / 2, 1476, 26, 500, a * 0.85, { col: HC.grey }); }
    const wa = clamp((t - TL.convierte) / 0.3) * (1 - win(t, TL.result - 0.35, 0.3)); if (wa > 0.01) { const s = '«Hola, sigo aquí»', n = Math.floor(s.length * clamp((t - TL.convierte) / 1.0)); htx(s.slice(0, Math.max(1, n)), W / 2, 1610, 92, 900, wa, { glow: '#ffb347' }); htx('frase de ejemplo', W / 2, 1668, 22, 500, wa * 0.8, { col: HC.grey, ls: 3 }); } }
  // ---- 97 de cada 100
  { const a = clamp((t - TL.result - 0.05) / 0.4) * (1 - win(t, TL.incre - 0.6, 0.4)); if (a > 0.01) { const k = clamp((t - TL.prec) / 1.6), wrong = [23, 58, 86], x0 = W / 2 - 4.5 * 62, y0 = 560;
      hg.save(); hg.globalAlpha = a * 0.9; hg.fillStyle = 'rgba(4,10,22,.7)'; rr(hg, x0 - 60, y0 - 60, 9 * 62 + 120, 9 * 62 + 120, 30); hg.fill(); hg.restore();
      for (let i = 0; i < 100; i++) { const on = clamp(k * 100 - i), bad = wrong.includes(i), x = x0 + (i % 10) * 62, y = y0 + Math.floor(i / 10) * 62; hg.save(); hg.globalAlpha = a; hg.fillStyle = on > 0 ? (bad ? HRED : HGREEN) : 'rgba(120,150,190,.25)';
        if (on > 0) { hg.shadowColor = hg.fillStyle; hg.shadowBlur = 14 * PR; } hg.beginPath(); hg.arc(x, y, 20 * (0.7 + 0.3 * eo(on)), 0, 7); hg.fill(); hg.restore(); }
      htx(`${counter(t, TL.prec, 0, 97, 1.6)} %`, W / 2, 1360, 170, 900, a, { glow: '#7CF0A9' }); htx('DE LAS PALABRAS, BIEN', W / 2, 1420, 30, 700, a, { col: HC.grey, ls: 5 }); } }
  // ---- grabaciones antiguas, su voz, voz robótica
  if (cam.position.x < -30) { const V = S.voice.userData; lab(V.films[1].getWorldPosition(_v()), 'GRABACIONES ANTIGUAS', 'su voz de antes de la ELA', t, TL.grab, TL.robot - 0.6, { col: HGOLD, dx: -60, dy: -200 });
    lab(S.voice.localToWorld(V.mouth.clone().add(_v().set(-0.75, -0.04, 0))), 'SU PROPIA VOZ', null, t, TL.voz - 0.2, TL.y2025 - 0.2, { col: HBLUE, dx: 40, dy: 240 }); }
  // ---- 2025 · 1/40 de segundo
  { const a = clamp((t - TL.y2025) / 0.4) * (1 - win(t, TL.todavia - 0.3, 0.3)); if (a > 0.01) { htx('2025', W / 2, 1300, 150, 900, a, { glow: '#8FD3FF' });
      const k = clamp((t - TL.tecno) / 0.6); if (k > 0) { const cx = W / 2, cy = 1500; hg.save(); hg.globalAlpha = a * k; hg.strokeStyle = 'rgba(143,211,255,.25)'; hg.lineWidth = 10; hg.beginPath(); hg.arc(cx - 230, cy - 18, 46, 0, 7); hg.stroke();
        hg.strokeStyle = HBLUE; hg.shadowColor = HBLUE; hg.shadowBlur = 16 * PR; hg.beginPath(); hg.arc(cx - 230, cy - 18, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp((t - TL.tecno) / 0.4)); hg.stroke(); hg.restore();
        htx('0,025 s', cx + 40, cy, 74, 900, a * k, { col: '#fff' }); htx('de la señal a su voz · 1/40 de segundo', cx, cy + 62, 26, 500, a * k, { col: HC.grey }); } } }
  // ---- ensayo clínico y labios quietos
  { const a = clamp((t - TL.todavia - 0.2) / 0.4) * (1 - win(t, TL.recup - 0.2, 0.3)); if (a > 0.01) { hg.save(); hg.globalAlpha = a; hg.strokeStyle = 'rgba(255,197,106,.8)'; hg.lineWidth = 2.5; rr(hg, W / 2 - 290, 1440, 580, 96, 48); hg.stroke(); hg.restore(); htx('ENSAYO CLÍNICO · EXPERIMENTAL', W / 2, 1502, 30, 700, a, { col: HGOLD, ls: 4 }); } }
  if (inHead) lab(U.lip, 'LABIOS QUIETOS', 'la voz sale del ordenador', t, TL.mover - 0.3, TL.futuro, { col: HBLUE, dx: 120, dy: 260 });
  // ---- fuentes (pequeño, abajo)
  const src = t > TL.impl - 0.3 && t < TL.result ? 'BrainGate2 · UC Davis · NEJM, 2024' : t > TL.result && t < TL.incre - 0.4 ? 'NEJM, 2024 · 97,5 % de acierto' : t > TL.y2025 && t < TL.todavia ? 'Nature, 2025' : '';
  if (src) htx(src, W / 2, 1860, 24, 500, 0.75, { col: '#c9d6e6' });
}
