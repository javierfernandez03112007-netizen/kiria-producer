// ---------------------------------------------------------------- RÓTULOS (como la interfaz de un juego): barra de arriba (el nombre del pueblo, habitantes y rey),
// el cartel de cada sitio cuando la cámara pasa cerca, el nombre del rey sobre el trono, el tablón de leyes y el comentario con más «me gusta».
// (Los nombres de los seguidores no se dibujan aquí: los pone el montaje. El del rey sí: lo dice la voz.)
const KING_AT = '@iannyanezz_';
function buildHudPlan() {}
const HF = (px, w = 800) => { hg.font = `${w} ${px}px Inter, sans-serif`; };
function hpill(x, y, txt, k, o = {}) {            // cartel con punta, centrado en x, con la punta en y
  if (k <= 0.01) return; const px = o.px || 34, s = popK(k); hg.save(); hg.translate(x, y); hg.scale(s, s); hg.globalAlpha = clamp(k * 2) * (o.a ?? 1); HF(px, 900); hg.letterSpacing = '2px'; const w = hg.measureText(txt).width + px * 1.3 + (o.crown ? px * 1.2 : 0), h = px * 1.75;
  hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 14 * PR; hg.shadowOffsetY = 4 * PR; hg.fillStyle = o.bg || '#ffffff'; rr(hg, -w / 2, -h - 16, w, h, h / 2); hg.fill(); hg.beginPath(); hg.moveTo(-12, -17); hg.lineTo(12, -17); hg.lineTo(0, 0); hg.closePath(); hg.fill();
  hg.shadowColor = 'transparent'; if (o.crown) crownIcon(-w / 2 + px * 1.05, -16 - h / 2, px * 0.5, o.fg || '#1c2430'); hg.fillStyle = o.fg || '#1c2430'; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, 1 + (o.crown ? px * 0.6 : 0), -16 - h / 2 + px * 0.04); hg.restore(); }
function heart(x, y, s, col) { hg.save(); hg.translate(x, y); hg.scale(s, s); hg.fillStyle = col; hg.beginPath(); hg.moveTo(0, 0.9); hg.bezierCurveTo(-1.6, -0.2, -0.9, -1.25, 0, -0.5); hg.bezierCurveTo(0.9, -1.25, 1.6, -0.2, 0, 0.9); hg.fill(); hg.restore(); }
function crownIcon(x, y, s, col) { hg.save(); hg.translate(x, y); hg.scale(s, s); hg.fillStyle = col; hg.beginPath(); hg.moveTo(-1, 0.6); hg.lineTo(-1.1, -0.6); hg.lineTo(-0.5, -0.05); hg.lineTo(0, -0.85); hg.lineTo(0.5, -0.05); hg.lineTo(1.1, -0.6); hg.lineTo(1, 0.6); hg.closePath(); hg.fill(); hg.restore(); }
const ppmOf = v => { const d = cam.position.distanceTo(v); return (H / 2) / Math.tan(cam.fov * Math.PI / 360) / d; };
function hudAt(t) {
  hudBegin(); const lift = S.lift || 0, TOP = 420;
  // ---- el cartel de cada sitio cuando se ve de cerca (pero no tanto como para tapar a la gente)
  for (const s of SITES) { if (!s.label) continue; const m = ppmOf(s.p), k = clamp((m - 29) / 6) * (1 - clamp((m - 150) / 30)); if (k <= 0.01) continue; const p = proj(s.p); if (!p.ok || p.x < -100 || p.x > W + 100 || p.y < TOP + 30 || p.y > H) continue; hpill(clamp(p.x, 190, W - 190), p.y, s.label, k * clamp((p.y - TOP - 30) / 60), { px: clamp(m * 0.5, 30, 46) }); }
  // ---- el rey: su nombre sobre el trono (mientras lleva la corona)
  { const p = proj(S.anc.king), m = ppmOf(S.anc.king), k = clamp((m - 13) / 5) * (1 - lift); if (p.ok && k > 0.01 && p.y > TOP) hpill(p.x, p.y, KING_AT, k, { px: clamp(m * 0.75, 34, 60), bg: '#ffd04a', fg: '#3a2a00', crown: 1 }); }
  // ---- barra de arriba: el nombre del pueblo, los habitantes y el rey
  { hg.save(); hg.shadowColor = 'rgba(0,0,0,.3)'; hg.shadowBlur = 16 * PR; hg.shadowOffsetY = 4 * PR; hg.fillStyle = 'rgba(18,24,34,.88)'; rr(hg, 46, 120, 988, 84, 42); hg.fill(); hg.shadowColor = 'transparent'; hg.textBaseline = 'middle'; hg.textAlign = 'left';
    HF(34, 900); hg.letterSpacing = '2px'; hg.fillStyle = '#7ce0a0'; hg.fillText('KIRIA WORLD', 80, 164); let x = 80 + hg.measureText('KIRIA WORLD').width + 26; hg.fillStyle = 'rgba(255,255,255,.25)'; hg.fillRect(x, 144, 2, 38); x += 22;
    hg.fillStyle = '#ffffff'; hg.beginPath(); hg.arc(x + 9, 152, 7.5, 0, 7); hg.fill(); hg.beginPath(); hg.arc(x + 9, 178, 14, Math.PI, 0); hg.fill(); HF(31, 900); hg.letterSpacing = '0px'; hg.fillText('6.124', x + 32, 165);
    const king = lift < 0.5, blink = 0.6 + 0.4 * Math.sin(t * 7); crownIcon(690, 162, 16, king ? '#ffd04a' : '#8a93a2'); HF(king ? 29 : 31, 900); hg.fillStyle = king ? '#ffd04a' : '#ff8a6a'; hg.globalAlpha = king ? 1 : blink; hg.fillText(king ? KING_AT : '¿TÚ?', 718, 165); hg.restore(); }
  // ---- 1 · «ya tiene nombre: Kiria World»: el nombre en grande
  { const k = seg(t, TL.name - 0.05, TL.name + 0.3) * (1 - win(t, TL.king - 0.15, 0.35)); if (k > 0.01) { const s = popK(k); hg.save(); hg.translate(W / 2, 760); hg.scale(s, s); hg.rotate(-0.03); hg.globalAlpha = clamp(k * 2); HF(150, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '4px';
      hg.lineWidth = 26; hg.lineJoin = 'round'; hg.strokeStyle = 'rgba(12,40,24,.92)'; hg.strokeText('KIRIA', 0, -80); hg.strokeText('WORLD', 0, 70); hg.fillStyle = '#ffffff'; hg.fillText('KIRIA', 0, -80); hg.fillStyle = '#7ce0a0'; hg.fillText('WORLD', 0, 70); hg.restore(); } }
  // ---- 2 · «ya somos 6.124»
  { const k = seg(t, TL.pop + 0.15, TL.pop + 0.45) * (1 - win(t, K['y_2'] - 0.1, 0.35)); if (k > 0.01) { const s = popK(k); hg.save(); hg.translate(W / 2, 600); hg.scale(s, s); hg.globalAlpha = clamp(k * 2); HF(170, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle';
      hg.lineWidth = 26; hg.lineJoin = 'round'; hg.strokeStyle = 'rgba(18,24,34,.92)'; hg.strokeText('6.124', 0, 0); hg.fillStyle = '#ffffff'; hg.fillText('6.124', 0, 0); HF(46, 900); hg.letterSpacing = '8px'; hg.lineWidth = 14; hg.strokeText('HABITANTES', 0, 118); hg.fillStyle = '#7ce0a0'; hg.fillText('HABITANTES', 0, 118); hg.restore(); } }
  // ---- 7 · el tablón de leyes (vacío) · 8 · el comentario con más «me gusta» · se cumple · nuevo rey
  { const k = seg(t, TL.ley - 0.05, TL.ley + 0.35) * (1 - win(t, TL.nuevo - 0.55, 0.35)); if (k > 0.01) { const s = popK(k), w = 880, h = 300, ok = seg(t, TL.cumple, TL.cumple + 0.3); hg.save(); hg.translate(W / 2, 640); hg.scale(s, s); hg.globalAlpha = clamp(k * 2);
      hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 22 * PR; hg.shadowOffsetY = 6 * PR; hg.fillStyle = '#f6efdc'; rr(hg, -w / 2, -h / 2, w, h, 26); hg.fill(); hg.shadowColor = 'transparent'; hg.fillStyle = '#7a4a22'; rr(hg, -w / 2, -h / 2, w, 84, 26); hg.fill(); hg.fillRect(-w / 2, -h / 2 + 50, w, 34);
      HF(40, 900); hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '5px'; hg.fillStyle = '#fff3d6'; hg.fillText('LEYES DE KIRIA WORLD', 0, -h / 2 + 44);
      hg.textAlign = 'left'; hg.letterSpacing = '0px'; HF(52, 900); hg.fillStyle = '#3a2a1a'; hg.fillText('1.', -w / 2 + 50, 8); HF(44, 700); hg.fillStyle = ok > 0.01 ? '#1f7a4d' : '#9a8a70'; hg.fillText(ok > 0.01 ? typed('La ley más votada', ok * 1.2) : '____________________' + (Math.sin(t * 9) > 0 ? ' ▌' : ''), -w / 2 + 120, 10);
      HF(52, 900); hg.fillStyle = '#b9ab90'; hg.fillText('2.', -w / 2 + 50, 92); HF(44, 700); hg.fillText('____________________', -w / 2 + 120, 94);
      if (ok > 0.01) { const s2 = 1 + 0.6 * (1 - eo(clamp(ok * 1.4))); hg.translate(w / 2 - 190, 62); hg.scale(s2 * 0.9, s2 * 0.9); hg.rotate(-0.12); hg.globalAlpha = clamp(ok * 3); hg.strokeStyle = '#1f7a4d'; hg.lineWidth = 7; rr(hg, -125, -42, 250, 84, 12); hg.stroke(); HF(46, 900); hg.textAlign = 'center'; hg.letterSpacing = '3px'; hg.fillStyle = '#1f7a4d'; hg.fillText('SE CUMPLE', 0, 3); }
      hg.restore(); } }
  { const k = seg(t, TL.escribe, TL.escribe + 0.35) * (1 - win(t, TL.nuevo + 1.6, 0.4)); if (k > 0.01) { const s = popK(k), x0 = -430, w = 860, h = 190; hg.save(); hg.translate(W / 2, 1420); hg.scale(s, s); hg.globalAlpha = clamp(k * 2);
      hg.shadowColor = 'rgba(0,0,0,.35)'; hg.shadowBlur = 22 * PR; hg.shadowOffsetY = 6 * PR; hg.fillStyle = '#ffffff'; rr(hg, x0, -h / 2, w, h, 38); hg.fill(); hg.shadowColor = 'transparent';
      hg.fillStyle = '#d5dae2'; hg.beginPath(); hg.arc(x0 + 88, 0, 50, 0, 7); hg.fill(); hg.fillStyle = '#aab2be'; hg.beginPath(); hg.arc(x0 + 88, -14, 19, 0, 7); hg.fill(); hg.beginPath(); hg.arc(x0 + 88, 42, 34, Math.PI * 1.08, Math.PI * 1.92); hg.fill();
      HF(40, 900); hg.textAlign = 'left'; hg.textBaseline = 'middle'; hg.fillStyle = '#1c2430'; hg.fillText('@¿tú?', x0 + 164, -36); if (lift > 0.3) { crownIcon(x0 + 164 + hg.measureText('@¿tú?').width + 34, -40, 20, '#f0a020'); }
      HF(36, 500); hg.fillStyle = '#4a5360'; hg.fillText(typed('Mi ley para Kiria World es…', seg(t, TL.escribe + 0.25, TL.escribe + 1.1)), x0 + 164, 30);
      const lk = sm5(seg(t, TL.gusta - 0.4, TL.gusta + 0.9)), n = Math.round(1 + lk * 3118), hs = 30 * (1 + 0.25 * Math.max(0, Math.sin((t - TL.gusta) * 14)) * (lk > 0 && lk < 1 ? 1 : 0)); heart(x0 + w - 92, -22, hs, lk > 0.02 ? '#ff3b5c' : '#c9ced6');
      HF(30, 800); hg.textAlign = 'center'; hg.fillStyle = '#1c2430'; hg.fillText(n.toLocaleString('es-ES').replace(/,/g, '.'), x0 + w - 92, 46); hg.restore(); } }
  // la corona, ya sin dueño: «¿quién será el nuevo rey?»
  { const k = lift * (1 - win(t, END - 1.2, 0.3)); if (k > 0.5) { const p = proj(v3(CITY.crown.position.x, CITY.crown.position.y + 5.5, CITY.crown.position.z)); if (p.ok) hpill(p.x, p.y, 'NUEVO REY: ¿TÚ?', (k - 0.5) * 2, { px: 46, bg: '#ffd04a', fg: '#3a2a00', crown: 1 }); } }
}
