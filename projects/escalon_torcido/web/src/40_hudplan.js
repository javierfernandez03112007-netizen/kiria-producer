// ---------------------------------------------------------------- «El escalón torcido»: RÓTULOS (formato «Dos vidas»): en cada planta, arriba a la izquierda, lo que hay
// y cómo es, en monoespaciada; arriba a la derecha, cuánto ha crecido (×37,8 frente a ×1). Y los datos de cada frase: el ángulo de los bloques torcidos, «efecto foco»,
// Cornell, «creían: la mitad» → «de verdad: 1 de cada 4», 1,01³⁶⁵. Nada por encima de y ≈ 470 (ahí van los subtítulos).
function buildHudPlan() { HFONT = MONO; HW = [700, 400]; }
const fmt1 = x => x.toFixed(1).replace('.', ',');
// caja de rótulo: dos líneas, alineada a la izquierda o a la derecha del punto
function tag(x, y, l1, l2, a, o = {}) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = a; hg.textBaseline = 'alphabetic'; hg.letterSpacing = '3px';
  const s1 = o.s1 || 30, s2 = o.s2 || 22, right = o.right; hfont(s1); const w1 = hg.measureText(l1).width; hfont(s2, false); const w2 = l2 ? hg.measureText(l2).width : 0; const w = Math.max(w1, w2) + 30, h = l2 ? s1 + s2 + 28 : s1 + 22;
  const x0 = right ? x - w : x; hg.fillStyle = o.bg || 'rgba(16,18,24,0.58)'; rr(hg, x0, y, w, h, 10); hg.fill();
  hg.textAlign = 'left'; hfont(s1); hg.fillStyle = o.c1 || HC.white; hg.fillText(l1, x0 + 15, y + s1 + 6); if (l2) { hfont(s2, false); hg.fillStyle = o.c2 || '#C9CED6'; hg.fillText(l2, x0 + 15, y + s1 + s2 + 14); }
  hg.restore(); }
function chipC(txt, y, col, a, size = 30) { if (a <= 0.01) return; hg.save(); hg.globalAlpha = clamp(a); hg.letterSpacing = '4px'; hfont(size); const w = hg.measureText(txt).width + 44, x = W / 2 - w / 2, s = 0.9 + 0.1 * eo(clamp(a));
  hg.translate(W / 2, y); hg.scale(s, s); hg.translate(-W / 2, -y); hg.fillStyle = 'rgba(12,14,20,0.78)'; rr(hg, x, y - size * 0.95, w, size * 1.9, size * 0.95); hg.fill(); hg.strokeStyle = col; hg.lineWidth = 2.5; rr(hg, x, y - size * 0.95, w, size * 1.9, size * 0.95); hg.stroke();
  hg.fillStyle = col; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.fillText(txt, W / 2, y + 2); hg.restore(); }
// visible si el punto está dentro de la pantalla (con margen) y delante de la cámara
const onScr = (P, mx = 30, y0 = 470, y1 = H - 160) => P.ok && P.x > mx && P.x < W - mx && P.y > y0 && P.y < y1;
function hudAt(t) { hudBegin(); const T = TL, n = stairN(t);
  // ---- rótulos de cada planta (siempre que la planta se vea entera de frente)
  const up = proj(_v(HO.x0 + 0.1, HO.y3 - 0.08, HO.zf)), upR = proj(_v(HO.x1 - 0.1, HO.y3 - 0.08, HO.zf)), dn = proj(_v(HO.x0 + 0.1, HO.H1 - 0.08, HO.zf)), dnR = proj(_v(HO.x1 - 0.1, HO.H1 - 0.08, HO.zf));
  const wide = (P, Q) => onScr(P) && onScr(Q) && Q.x - P.x > 380 ? clamp((Q.x - P.x - 380) / 120) : 0;
  const ku = wide(up, upR), kd = wide(dn, dnR) * (1 - darkK(t));
  const dd = dayOf(n), nTxt = dd + (dd === 1 ? ' ESCALÓN' : ' ESCALONES');
  tag(up.x + 8, up.y + 10, nTxt, 'UNO CADA DÍA · TORCIDOS', ku, { c1: '#FFF4E2' });
  tag(upR.x - 8, upR.y + 10, '×' + fmt1(mult(dd)), null, ku, { right: true, s1: 40, c1: '#FFC861' });
  const q7 = win(t, T.quieto7, 0.2) * (1 - win(t, T.escalon9, 0.4));
  tag(dn.x + 8, dn.y + 10, '1 ESCALÓN', q7 > 0.5 ? 'EL MISMO · QUIETO' : 'EL MISMO · PERFECTO', kd, { c1: '#E8EEF6', c2: q7 > 0.5 ? '#FF8A7A' : '#AFC0D6' });
  tag(dnR.x - 8, dnR.y + 10, '×1,0', null, kd, { right: true, s1: 40, c1: '#9FB6D6' });
  // ---- L2: «torcidos, casi todos»: el ángulo de unos bloques (y uno recto)
  const kt = win(t, T.torcidos - 0.05, 0.25) * (1 - win(t, T.E[2] - 0.1, 0.3));
  if (!S.calls) { const c = [], R = [], seen = new Set(); for (let i = 6; i < 17; i++) { const b = STAIR.base[i]; if (b.straight) R.push(i); else c.push(i); }
    c.sort((a, b) => Math.abs(STAIR.base[b].rz) - Math.abs(STAIR.base[a].rz)); const pickd = []; for (const i of c) { const d = Math.round(STAIR.base[i].rz * 180 / Math.PI); if (!seen.has(d) && pickd.length < 3) { seen.add(d); pickd.push(i); } } S.calls = [...pickd.sort((a, b) => a - b), ...R.slice(0, 1)]; }
  S.calls.forEach((i, j) => { const [dx, dy] = [[150, -90], [-170, -60], [160, 70], [-160, 90]][j], d = j * 0.08; const b = STAIR.base[i], P = proj(b.p.clone().add(_v(0, ST.bh / 2, 0))); if (!onScr(P, 40, 470, H - 120)) return;
    const deg = Math.round(b.rz * 180 / Math.PI), txt = b.straight ? '0°' : (deg > 0 ? '+' : '−') + Math.abs(deg) + '°';
    callout(P, txt, b.straight ? 'RECTO' : 'TORCIDO', clamp((kt - d) / 0.5) * kt, { dx, dy, len: 40, size: 38, subSize: 22, color: b.straight ? HC.teal : HC.amber }); });
  // ---- L3: el efecto foco
  chipC('EFECTO FOCO', 560, '#FFE7B8', win(t, T.efecto - 0.05, 0.25) * (1 - win(t, T.mirando, 0.4)), 34);
  // ---- L4: «nuestros errores»: un círculo rojo en el bloque
  { const k = win(t, T.errores - 0.05, 0.25) * (1 - win(t, T.L[5] - 0.2, 0.3)); if (k > 0.01) { const P = proj(blockPos(t).add(_v(0.08, 0.08, 0.1))); if (P.ok) { hg.save(); hg.globalAlpha = k; glowStroke('#FF5247', 3.5, 12); hg.beginPath(); hg.arc(P.x, P.y, 26 + 30 * (1 - eo(k)), 0, 7); hg.stroke(); noGlow();
      hg.fillStyle = '#FF5247'; hfont(26); hg.letterSpacing = '3px'; hg.textAlign = 'left'; hg.fillText('¿SE NOTA?', P.x + 40, P.y - 30); hg.restore(); } } }
  // ---- L5–L6: Cornell, «creían: la mitad» → «de verdad: 1 de cada 4»
  const kc = win(t, T.cornell - 0.1, 0.3) * (1 - win(t, T.nadie, 0.4));
  chipC('UNIVERSIDAD DE CORNELL · 2000', 540, '#EEF2F6', kc, 28);
  chipC('CREÍAN: LA MITAD (1 DE CADA 2)', 640, '#FFB547', win(t, T.mitad - 0.1, 0.3) * (1 - win(t, T.nadie, 0.4)), 28);
  chipC('DE VERDAD: 1 DE CADA 4', 730, '#62E3D4', win(t, T.cuatro - 0.15, 0.3) * (1 - win(t, T.nadie, 0.4)), 30);
  // ---- L8: el año otra vez: 1,01 elevado al día
  { const k = win(t, T.ciento - 0.1, 0.3) * (1 - win(t, T.E[8] + 0.02, 0.3)); if (k > 0.01) { const d = dayOf(n); hg.save(); hg.globalAlpha = k; hg.textAlign = 'center'; hg.textBaseline = 'middle'; hg.letterSpacing = '3px';
      hg.fillStyle = 'rgba(12,14,20,0.72)'; rr(hg, W / 2 - 215, 556, 450, 84, 42); hg.fill();
      hfont(34); hg.fillStyle = '#FFF4E2'; hg.fillText('1,01', W / 2 - 46, 600); hfont(22); hg.fillText(String(d), W / 2 + 18, 578); hfont(34); hg.fillStyle = '#FFC861'; hg.fillText('= ' + fmt1(mult(d)), W / 2 + 125, 600); hg.restore(); } }
  // él, arriba del todo de su escalera (al final de L2 y en el ×37)
  { const k = win(t, T.todos - 0.2, 0.3) * (1 - win(t, T.abajo3, 0.25)); if (k > 0.01 && CAST.T.visible) {
      const P = proj(CAST.T.position.clone().add(_v(0, 0.85, 0))); if (P.ok && P.x > 40 && P.x < W - 40 && P.y > 400 && P.y < H - 200) { brackets(P, 90, 130, k, '#FFC861', 3);
        hg.save(); hg.globalAlpha = k; hfont(24); hg.letterSpacing = '3px'; hg.textAlign = 'center'; hg.fillStyle = '#FFC861'; hg.fillText('ÉL · DÍA ' + dayOf(n), P.x, P.y + 100); hg.restore(); } } }
  bigText('×37,8', W / 2, 760, 150, '#FFC861', win(t, T.treinta - 0.05, 0.3) * (1 - win(t, T.E[8] + 0.02, 0.3)), { glow: 30, dark: 24, type: false });
}
window.labelsAt = function (t) { frame(t); return { p: [], h: [], k: [] }; };
