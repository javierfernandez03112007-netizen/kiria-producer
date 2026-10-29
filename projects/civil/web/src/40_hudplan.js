// ---------------------------------------------------------------- HUD: cabecera, etiquetas, marcador Caminos–Arquitectura, rótulos y fuentes
const ckk = (t, t0, t1, d = 0.6) => (t < t0 || t > t1 + 0.3 ? 0 : clamp((t - t0) / d));
const ckf = (t, t1) => 1 - win(t, t1, 0.28);
function co(t, t0, t1, anchor, txt, sub, o = {}) { const k = ckk(t, t0, t1, o.d || 0.5); if (k > 0) callout(anchor, txt, sub, k, { ...o, fade: ckf(t, t1) }); }
const CA = '#FFB547', AR = '#62E3D4';
let SECT = [];
function buildHudPlan() {
  SECT = [[-9, 'LA PARADOJA'], [K.dicen, 'LEY Y SUPREMO'], [K.caminos4, 'EL DUELO'], [K.por6, 'POR DENTRO'], [K.carreteras, 'LA OBRA PÚBLICA'], [K.aun, 'EL POLIDEPORTIVO'], [K.porque9, 'LA LEY DE 1999'], [K.puente10, 'EL PUENTE'], [K.ley11, 'LA RESPUESTA']];
}
function sectAt(t) { let s = SECT[0][1]; for (const [t0, x] of SECT) if (t >= t0 - 0.05) s = x; return s; }
function headerC(t, sub) {
  hg.save(); hg.textBaseline = 'alphabetic';
  hg.letterSpacing = '8px'; hfont(42); hg.textAlign = 'left'; hg.fillStyle = HC.white; hg.fillText('INGENIERÍA CIVIL', 54, 142);
  hg.letterSpacing = '4px'; hfont(23, false); hg.fillStyle = HC.grey; hg.fillText(sub, 56, 182);
  hg.fillStyle = 'rgba(238,242,246,.35)'; hg.fillRect(56, 198, 968, 1.5);
  hg.textAlign = 'right'; hg.letterSpacing = '4px'; hfont(24); hg.fillStyle = CA; hg.fillText('CAMINOS', 1024, 122);
  hfont(18, false); hg.fillStyle = HC.grey; hg.fillText('VS', 1024, 152); hfont(24); hg.fillStyle = AR; hg.fillText('ARQUITECTURA', 1024, 182);
  hg.restore();
}
function plate2(txt, x, y, size, col, k, o = {}) { if (k <= 0.002) return; hg.save(); hg.globalAlpha = clamp(k * 2.5) * (o.a ?? 1); hfont(size); hg.letterSpacing = Math.round(size * 0.12) + 'px';
  const s = typed(txt, o.type === false ? 1 : clamp(k * 1.6)), w = hg.measureText(txt).width + size * 1.1, h = size * 1.6, sc = 1 + 0.25 * (1 - eo(clamp(k / 0.3)));
  hg.translate(x, y); hg.scale(sc, sc); hg.fillStyle = 'rgba(0,0,0,.62)'; rr(hg, -w / 2, -h / 2, w, h, h * 0.22); hg.fill(); glowStroke(col, 2.5, 14); hg.stroke(); noGlow();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; if (o.glow) { hg.shadowColor = col; hg.shadowBlur = o.glow; } hg.fillText(s, size * 0.06, 2); hg.restore(); }
function pill(txt, t, t0, t1, y = 1540, col = HC.white, size = 21) { const k = ckk(t, t0, t1, 0.4) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k; hfont(size, false); hg.letterSpacing = '3px';
  const w = hg.measureText(txt).width + 60; hg.fillStyle = 'rgba(0,0,0,.6)'; rr(hg, 540 - w / 2, y - size * 1.33, w, size * 2.66, size * 1.33); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 1.5; hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(typed(txt, k * 1.5), 540, y + 1); hg.restore(); }
function source(txt, t, t0, t1) { const k = ckk(t, t0, t1, 0.3) * ckf(t, t1); if (k <= 0) return; hg.save(); hg.globalAlpha = k * 0.85; hfont(17, false); hg.letterSpacing = '2px'; hg.fillStyle = HC.grey; hg.textAlign = 'left'; hg.fillText(txt, 56, 1800); hg.restore(); }
// marcador CAMINOS a – b ARQUITECTURA (con «?» al final)
function scoreboard(t, a, b, k, y = 1600, pulseA = 0, pulseB = 0, q = false) {
  if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2);
  const w = 960, h = 118, x = 540 - w / 2, yy = y + (1 - eo(clamp(k))) * 60;
  hg.fillStyle = 'rgba(0,0,0,.66)'; rr(hg, x, yy - h / 2, w, h, 20); hg.fill(); hg.strokeStyle = 'rgba(238,242,246,.3)'; hg.lineWidth = 2; hg.stroke();
  hg.textBaseline = 'middle'; hg.letterSpacing = '4px';
  hfont(30); hg.textAlign = 'left'; hg.fillStyle = CA; hg.fillText('CAMINOS', x + 34, yy + 2); hg.textAlign = 'right'; hg.fillStyle = AR; hg.fillText('ARQUITECTURA', x + w - 34, yy + 2);
  hg.textAlign = 'center'; hg.letterSpacing = '0px';
  const sa = 1 + 0.5 * pulseA, sb = 1 + 0.5 * pulseB;
  hg.save(); hg.translate(540 - 62, yy + 4); hg.scale(sa, sa); hfont(62); hg.fillStyle = CA; if (pulseA > 0.01) { hg.shadowColor = CA; hg.shadowBlur = 30 * pulseA; } hg.fillText(q ? '?' : String(a), 0, 0); hg.restore();
  hfont(44, false); hg.fillStyle = HC.grey; hg.fillText('–', 540, yy + 2);
  hg.save(); hg.translate(540 + 62, yy + 4); hg.scale(sb, sb); hfont(62); hg.fillStyle = AR; if (pulseB > 0.01) { hg.shadowColor = AR; hg.shadowBlur = 30 * pulseB; } hg.fillText(q ? '?' : String(b), 0, 0); hg.restore();
  hg.restore();
}
function commentIcon(x, y, s, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x, y); const sc = 0.6 + 0.4 * eo(clamp(k / 0.4)); hg.scale(sc, sc);
  glowStroke(HC.white, 5, 12); hg.fillStyle = 'rgba(0,0,0,.5)'; rr(hg, -s, -s * 0.7, s * 2, s * 1.3, s * 0.35); hg.fill(); hg.stroke();
  hg.beginPath(); hg.moveTo(-s * 0.45, s * 0.6); hg.lineTo(-s * 0.6, s * 1.05); hg.lineTo(-s * 0.05, s * 0.6); hg.stroke(); noGlow();
  for (let i = 0; i < 3; i++) { hg.fillStyle = HC.white; hg.beginPath(); hg.arc(-s * 0.5 + i * s * 0.5, -s * 0.05, s * 0.13, 0, 7); hg.fill(); } hg.restore(); }
function sendIcon(x, y, s, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2); hg.translate(x + (1 - eo(clamp(k))) * -40, y); hg.rotate(-0.35); const sc = 0.6 + 0.4 * eo(clamp(k / 0.4)); hg.scale(sc, sc);
  glowStroke(HC.white, 5, 12); hg.fillStyle = 'rgba(0,0,0,.5)'; hg.beginPath(); hg.moveTo(-s, -s * 0.15); hg.lineTo(s, -s * 0.8); hg.lineTo(s * 0.35, s * 0.85); hg.lineTo(-s * 0.05, s * 0.2); hg.closePath(); hg.fill(); hg.stroke();
  hg.beginPath(); hg.moveTo(-s * 0.05, s * 0.2); hg.lineTo(s, -s * 0.8); hg.stroke(); noGlow(); hg.restore(); }
// podio de la alta velocidad
function podium(t, k) { if (k <= 0.01) return; hg.save(); hg.globalAlpha = clamp(k * 2);
  const base = 1690, bw = 230, gap = 30, xs = [540 - bw - gap / 2, 540 + gap / 2], hs = [220, 150], cols = ['rgba(238,242,246,.55)', CA], labs = [['1.º', 'CHINA'], ['2.º', 'ESPAÑA']];
  for (let i = 0; i < 2; i++) { const kk = eo(clamp((k - i * 0.15) / 0.6)), h = hs[i] * kk; hg.fillStyle = 'rgba(0,0,0,.6)'; hg.fillRect(xs[i], base - h, bw, h);
    hg.strokeStyle = cols[i]; hg.lineWidth = 3; if (i === 1) { hg.shadowColor = CA; hg.shadowBlur = 18; } hg.strokeRect(xs[i], base - h, bw, h); hg.shadowBlur = 0;
    hg.fillStyle = cols[i]; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hfont(46); hg.letterSpacing = '2px'; if (kk > 0.4) { hg.fillText(labs[i][0], xs[i] + bw / 2, base - h + 46); hfont(30); hg.letterSpacing = '4px'; hg.fillText(labs[i][1], xs[i] + bw / 2, base - h + 96); } }
  hg.restore(); }
function zzz(P, t, k) { if (k <= 0.01 || !P || !P.ok) return; hg.save(); for (let i = 0; i < 3; i++) { const ph = ((t * 0.7 + i / 3) % 1); hg.globalAlpha = k * Math.sin(Math.PI * ph); hfont(40 + i * 10); hg.fillStyle = HC.white; hg.textAlign = 'center';
  hg.fillText('z', P.x + 60 + ph * 90 + i * 12, P.y - 80 - ph * 200); } hg.restore(); }
function hudAt(t) {
  hudBegin();
  const tt = loopT(t);
  if (t < END - 0.3) headerC(t, sectAt(t)); else headerC(t, SECT[0][1]);
  // ---- 1: la paradoja
  co(tt, K.arquitecto + 0.25, K.ingeniero - 0.1, v3(BRX.x + 0.2, 0.36, BRX.z), 'ARQUITECTO', '✓ PUEDE PROYECTARLO', { dx: -60, dy: -330, color: AR, subCol: AR, d: 0.4, bg: true, size: 34 });
  co(t, K.ingeniero + 0.1, K.no1 - 0.15, HSX.clone().add(v3(0, 0.3, 0)), 'INGENIERO DE CAMINOS', null, { dx: -120, dy: -300, color: CA, d: 0.35, bg: true, size: 32 });
  plate2('✗ TU CASA, NO', 540, 1560, 64, HC.red, ckk(t, K.tu1 - 0.1, K.dicen + 0.1, 0.25) * ckf(t, K.dicen + 0.1), { glow: 22, type: false });
  // ---- 2: la ley y el Supremo
  if (S.book.G.visible) co(t, K.ley2 - 0.05, K.porque3 - 0.15, v3(0.7, 0.07, -1.05), 'LEY 38/1999', 'ORDENACIÓN DE LA EDIFICACIÓN', { dx: -140, dy: 300, color: HC.white, d: 0.35, bg: true, size: 34 });
  if (S.gavel.G.visible) co(t, K.tribunal, K.porque3 - 0.15, v3(1.2, 0.14, -1.12), 'TRIBUNAL SUPREMO', null, { dx: 80, dy: -280, color: HC.white, d: 0.35, bg: true, size: 32 });
  // ---- 3: la pregunta, sin respuesta
  pill('LA RESPUESTA, AL FINAL', t, K.final3, K.caminos4 - 0.2, 1580, HC.white, 24);
  // ---- 4-5: el duelo (pantalla partida: arriba Caminos, abajo Arquitectura)
  const kd = ckk(t, K.caminos4 + 0.1, K.esto - 0.1, 0.4) * ckf(t, K.esto - 0.1);
  if (kd > 0) { const P = proj(v3(ZB.x, 0.86, ZB.z)); if (P.ok && P.y > 300 && P.y < 1700) { hg.save(); hg.globalAlpha = kd; hg.strokeStyle = 'rgba(238,242,246,.45)'; hg.lineWidth = 2; hg.setLineDash([16, 12]); hg.beginPath(); hg.moveTo(40, P.y); hg.lineTo(1040, P.y); hg.stroke(); hg.setLineDash([]);
    hfont(26); hg.letterSpacing = '5px'; hg.textAlign = 'left'; hg.textBaseline = 'bottom'; hg.fillStyle = CA; hg.fillText('▲ CAMINOS', 56, P.y - 14); hg.textBaseline = 'top'; hg.fillStyle = AR; hg.fillText('▼ ARQUITECTURA', 56, P.y + 14); hg.restore(); } }
  const sA = t > K.caiga + 0.12 ? 1 : 0, sB = t > K.dentro5 + 0.15 ? 1 : 0;
  scoreboard(t, sA, sB, kd, 1640, Math.exp(-Math.max(0, t - K.caiga - 0.12) * 5) * sA, Math.exp(-Math.max(0, t - K.dentro5 - 0.15) * 5) * sB);
  // ---- 6: lo que estudia uno de Caminos
  if (S.soil.G.visible) { const L = S.soil.layers; let y = 0; const names = ['ARENA', 'ARCILLA', 'GRAVAS', 'ROCA'];
    L.forEach(([h], i) => { co(t, K.suelos + i * 0.12, K.inclina - 0.15, v3(ZC.x - 0.12, y - h / 2, ZC.z + 0.66), names[i], null, { dx: -90, dy: 0, len: 30, color: HC.white, d: 0.3, bg: true, size: 26 }); y -= h; });
    co(t, K.inclina + 0.15, K.estructuras - 0.15, v3(ZC.x + 0.1, -0.3, ZC.z + 0.66), 'SUELO BLANDO', 'ASIENTO → SE INCLINA', { dx: 110, dy: 180, color: CA, d: 0.35, bg: true, size: 28 }); }
  plate2('SUELOS', 540, 1560, 58, HC.white, ckk(t, K.suelos - 0.05, K.estructuras - 0.12, 0.2) * ckf(t, K.estructuras - 0.12), { type: false });
  plate2('ESTRUCTURAS', 540, 1560, 58, HC.white, ckk(t, K.estructuras - 0.05, K.presas - 0.12, 0.2) * ckf(t, K.presas - 0.12), { type: false });
  if (S.deck.G.visible) { co(t, K.trenes, K.viento - 0.1, v3(ZC.x + 0.4, 0.5, ZC.z), 'TREN', null, { dx: -80, dy: -240, color: HC.white, d: 0.25, bg: true, size: 28 });
    co(t, K.viento, K.presas - 0.1, v3(ZC.x + 0.9, 0.45, ZC.z - 0.4), 'VIENTO', null, { dx: 60, dy: -260, color: '#BFEFFF', d: 0.25, bg: true, size: 28 }); }
  plate2('AGUA', 540, 1560, 58, '#BFEFFF', ckk(t, K.presas - 0.05, K.carreteras - 0.15, 0.2) * ckf(t, K.carreteras - 0.15), { type: false });
  // ---- 7: la red
  pill('RED DE ALTA VELOCIDAD · ESQUEMA', t, K.vias + 0.1, K.aun - 0.1, 1430, CA, 20);
  podium(t, ckk(t, K.segunda - 0.05, K.aun - 0.1, 0.6) * ckf(t, K.aun - 0.1));
  source('ATLAS DE ALTA VELOCIDAD DE LA UIC · DATOS DE 2025', t, K.segunda, K.aun - 0.1);
  // ---- 8: el polideportivo sí, tu casa no
  pill('TRIBUNAL SUPREMO · 2012', t, K.supremo8 - 0.05, K.polideportivo - 0.1, 1580, HC.white, 24);
  if (S.sports.G.visible) co(t, K.polideportivo + 0.1, K.porque9 - 0.1, S.sports.G.position.clone().add(v3(0, 0.16, 0)), 'POLIDEPORTIVO', '✓ CAMINOS', { dx: -70, dy: -280, color: CA, subCol: CA, d: 0.35, bg: true, size: 30 });
  if (S.house2.G.visible && t > K.no8 - 0.02) { const P = proj(S.house2.G.position.clone().add(v3(0, 0.18, 0))); if (P.ok) stamp('NO', P.x, P.y, ckk(t, K.no8 - 0.02, K.porque9, 0.3) * ckf(t, K.porque9), HC.red, 110); }
  source('STS 19-01-2012 (PABELLÓN POLIDEPORTIVO) · LEY 38/1999, ART. 10', t, K.polideportivo, K.porque9 - 0.1);
  // ---- 9: la ley de 1999
  pill('LEY 38/1999 · ARTÍCULO 10', t, K.y1999 - 0.05, K.edificio9 - 0.1, 1580, HC.white, 24);
  const names = ['VIVIENDA', 'COLEGIO', 'HOSPITAL', 'IGLESIA'], verbs = [K.vive, K.estudia, K.cura, K.reza];
  if (S.book2.G.visible) verbs.forEach((tv, i) => { const P = S.slots[i].clone().add(v3(0, 0.62, 0)); const A = proj(P);
    if (A.ok) { const k = ckk(t, tv + 0.45, K.puente10 - 0.5, 0.25) * ckf(t, K.puente10 - 0.5); if (k > 0) { hg.save(); hg.globalAlpha = k; hfont(24); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.fillStyle = HC.white; hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 8; hg.fillText(names[i], A.x, A.y); hg.restore(); }
      const ks = ckk(t, K.firma + i * 0.1, K.puente10 - 0.5, 0.3) * ckf(t, K.puente10 - 0.5); if (ks > 0) stamp('✓', A.x, A.y + 70, ks, AR, 44); } });
  plate2('LO FIRMA UN ARQUITECTO', 540, 1560, 44, AR, ckk(t, K.firma - 0.05, K.puente10 - 0.5, 0.25) * ckf(t, K.puente10 - 0.5), { type: false, glow: 14 });
  source('LEY 38/1999 DE ORDENACIÓN DE LA EDIFICACIÓN, ARTS. 2.1.A Y 10.2.A', t, K.y1999, K.puente10 - 0.5);
  // ---- 10: el puente no es un edificio; el cartel; el Supremo
  plate2('PUENTE ≠ EDIFICIO', 540, 1560, 54, HC.white, ckk(t, K.edificio10 - 0.05, K.colegio - 0.1, 0.25) * ckf(t, K.colegio - 0.1), { type: false });
  plate2('EN EXCLUSIVA', 540, 1560, 54, CA, ckk(t, K.exclusiva - 0.05, K.supremo10 - 0.05, 0.2) * ckf(t, K.supremo10 - 0.05), { type: false, glow: 16 });
  pill('TRIBUNAL SUPREMO · 2012 · NO', t, K.supremo10 - 0.05, K.ley11 - 0.1, 1580, HC.red, 24);
  source('STS 20-02-2012, REC. 2208/2010 (PROYECTO DE UN PUENTE)', t, K.colegio, K.ley11 - 0.1);
  // ---- 11: quién duerme dentro
  if (S.house.head) { const P = proj(wpos(S.house.head)); zzz(P, t, ckk(t, K.dormir + 0.15, END - 1.6, 0.4) * ckf(t, K.arquitectura12)); }
  // ---- 12: el marcador final y el cierre
  const kq = ckk(t, K.caminos12 - 0.05, END - 0.5, 0.35) * ckf(t, END - 0.5);
  scoreboard(t, 0, 0, kq, 1600, 0, 0, true);
  commentIcon(380, 1450, 42, ckk(t, K.mandaselo - 0.1, END - 0.5, 0.3) * ckf(t, END - 0.5)); sendIcon(700, 1450, 42, ckk(t, K.mandaselo + 0.05, END - 0.5, 0.3) * ckf(t, END - 0.5));
}
