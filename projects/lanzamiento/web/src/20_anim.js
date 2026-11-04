// ---------------------------------------------------------------- tiempos y animación de cada pieza (todo es función del instante t: se puede dibujar en cualquier orden)
const inSeg = (t, a, b) => t >= a && t < b;
const sinL = (t, f, ph = 0) => Math.sin(2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) * t / END + ph);     // periódico en END (bucle sin saltos)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
let TT = {};
function buildTimes() {
  TT = {
    glyph: [K.k32 + 0.17, K.coma1 + 0.1, K.dos1 + 0.06, K.millones1 + 0.05],     // «3», «,», «2», «M» (al oírlos)
    loop: END - 0.75,                                                 // los objetos vuelven a salir de la pantalla (bucle)
    land: K.camara1 + 0.03,                                           // la cámara de cine toca el suelo
    slam: K.oyes5 + 0.03,                                             // el mazo golpea el taco
    words: [K.subtitulos6, K.palabra6, K.a6, K.palabra6b].map(x => x + 0.03),
    suck: K.si11 + 0.02,                                              // las palabras y el taco se meten en la pantalla del móvil
    morph0: K.camara1 + 0.43, morph1: K.guion3 + 0.12,               // las aristas de la cámara de cine forman el guion
    swipes: [0.95, 2.1, 3.3, 5.0, 6.6, 8.3, 10.0, 12.6, 15.0, END - 0.7],   // 10: el bucle vuelve al mismo vídeo
  };
  TT.rings = [[K.sonido7, 4], [K.sonido7 + 0.12, 4], [K.efecto7, 0], [K.a7, 1], [K.efecto7b, 2], [K.efecto7b + 0.13, 3]];
}

// ---------------------------------------------------------------- la pantalla del móvil (lienzo 2D)
const pingpong = (k, n) => { const m = k % (2 * n - 2); return m < n ? m : 2 * n - 2 - m; };
function feedIdx(t) { let n = 0, last = -9; for (const s of TT.swipes) if (t >= s) { n++; last = s; } return { n, u: clamp((t - last) / 0.26) }; }
function drawReel(g, i, t, y0) {
  const R = REELS[i % REELS.length]; const im = R[pingpong(Math.floor(Math.max(0, t) * 10), R.length)];
  const w = SCR.w, h = w * 16 / 9, y = y0 + (SCR.h - h) / 2; g.drawImage(im, 0, y, w, h);
}
function icons(g, a = 1) {      // iconos genéricos de un vídeo vertical (sin logotipos): me gusta, comentar, enviar
  g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.lineJoin = 'round'; g.lineCap = 'round'; const x = SCR.w - 58; let y = SCR.h - 430;
  g.beginPath(); g.moveTo(x, y + 18); g.bezierCurveTo(x - 34, y - 6, x - 22, y - 34, x, y - 16); g.bezierCurveTo(x + 22, y - 34, x + 34, y - 6, x, y + 18); g.stroke();
  y += 92; g.beginPath(); g.arc(x, y, 22, 0.4, Math.PI * 2 - 0.1); g.lineTo(x + 26, y + 24); g.closePath(); g.stroke();
  y += 92; g.beginPath(); g.moveTo(x - 24, y - 6); g.lineTo(x + 24, y - 22); g.lineTo(x + 8, y + 24); g.lineTo(x - 2, y + 2); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(46, SCR.h - 196, 22, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)'; rr(g, 82, SCR.h - 210, 170, 22, 11); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; rr(g, 30, SCR.h - 158, 330, 18, 9); g.fill();
  g.restore();
}
function statusBar(g, dark = true) {
  g.fillStyle = dark ? '#ffffff' : '#111111'; g.font = '700 30px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('9:41', 40, 44);
  rr(g, SCR.w - 92, 30, 52, 26, 7); g.lineWidth = 3; g.strokeStyle = g.fillStyle; g.stroke(); g.fillRect(SCR.w - 88, 34, 38, 18);
  g.fillStyle = '#000000'; rr(g, SCR.w / 2 - 70, 18, 140, 44, 22); g.fill();
}
function drawFeed(g, t) {
  const { n, u } = feedIdx(t), e = eio(u);
  g.fillStyle = '#000'; g.fillRect(0, 0, SCR.w, SCR.h);
  if (u < 1) { drawReel(g, n + 9, t, -e * SCR.h); drawReel(g, n, t, (1 - e) * SCR.h); } else drawReel(g, n, t, 0);
  icons(g, 1); statusBar(g, true);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, SCR.h - 8, SCR.w, 4); g.fillStyle = '#ffffff'; g.fillRect(0, SCR.h - 8, SCR.w * ((t / END * 12) % 1), 4);
}
// resultados reales de la cuenta (ver FUENTES.md): visualizaciones (panel de Instagram, dato de Javi) y Metricool (seguidores, me gusta, envíos)
const STATS = [['3,2 M', 'visualizaciones en 7 días', 3.2, v => v.toFixed(1).replace('.', ',') + ' M'],
  ['+2.500', 'seguidores nuevos en 6 días', 2500, v => '+' + miles(v)],
  ['+150.000', 'me gusta en 2 semanas', 150000, v => '+' + miles(v)],
  ['+37.000', 'veces enviados en 2 semanas', 37000, v => '+' + miles(v)]];
function miles(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
const GAINS = [124, 93, 127, 140, 975, 1138];      // seguidores nuevos por día, 27 oct – 1 nov (Metricool)
function drawStats(g, t, k) {
  g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, SCR.w, SCR.h); statusBar(g, true);
  g.save(); g.globalAlpha = k; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffffff'; g.font = '900 44px Inter'; g.fillText('Resultados', 36, 140);
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '500 24px Inter'; g.fillText('de nuestros propios vídeos', 36, 178);
  let y = 250;
  STATS.forEach(([fin, lab, val, fmt], i) => {
    const u = eo(clamp((t - K.videos11 - 0.05 - i * 0.16) / 0.8)), a = clamp((t - K.videos11 + 0.1 - i * 0.16) / 0.25);
    g.globalAlpha = k * a; g.fillStyle = '#16181d'; rr(g, 24, y, SCR.w - 48, 190, 26); g.fill();
    g.fillStyle = i === 0 ? '#ffc24a' : '#ffffff'; g.font = '900 78px Inter'; g.fillText(u >= 0.999 ? fin : fmt(val * u), 52, y + 102);
    g.fillStyle = 'rgba(255,255,255,.62)'; g.font = '600 27px Inter'; g.fillText(lab, 54, y + 152);
    if (i === 1) { const mx = Math.max(...GAINS), bw = 22, x0 = SCR.w - 56 - GAINS.length * (bw + 8); GAINS.forEach((v, j) => { const h = 76 * v / mx * eo(clamp((t - K.videos11 - 0.3 - j * 0.05) / 0.5)); g.fillStyle = j >= 4 ? '#7cf0a9' : 'rgba(124,240,169,.45)'; rr(g, x0 + j * (bw + 8), y + 104 - h, bw, Math.max(4, h), 5); g.fill(); }); }
    y += 214;
  });
  g.restore();
}
function drawComments(g, t, k, typed, posted) {
  drawFeed(g, t);
  g.fillStyle = `rgba(0,0,0,${0.45 * k})`; g.fillRect(0, 0, SCR.w, SCR.h);
  const top = SCR.h - (SCR.h * 0.62) * eo(k); g.save(); g.fillStyle = '#16181d'; rr(g, 0, top, SCR.w, SCR.h, 34); g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)'; rr(g, SCR.w / 2 - 40, top + 18, 80, 8, 4); g.fill();
  g.fillStyle = '#ffffff'; g.font = '800 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Comentarios', SCR.w / 2, top + 66);
  let y = top + 130;
  if (posted > 0) { g.globalAlpha = posted; g.fillStyle = '#9aa1ab'; g.beginPath(); g.arc(56, y + 10, 24, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; rr(g, 96, y - 8, 140, 14, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 38px Inter'; g.textAlign = 'left'; g.fillText('KIRIA', 96, y + 26); g.globalAlpha = 1; y += 100; }
  for (let i = 0; i < 3; i++) { g.fillStyle = '#3a3f49'; g.beginPath(); g.arc(56, y + 10, 24, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, 96, y - 6, 120 + 60 * hash(i), 14, 7); g.fill(); rr(g, 96, y + 20, 260 + 90 * hash(i + 5), 14, 7); g.fill(); y += 96; }
  const iy = SCR.h - 120; g.fillStyle = '#23262d'; rr(g, 24, iy, SCR.w - 140, 76, 38); g.fill();
  g.font = '900 36px Inter'; g.textAlign = 'left'; g.fillStyle = typed ? '#ffffff' : 'rgba(255,255,255,.4)'; g.fillText(typed || 'Añade un comentario…', 54, iy + 40);
  if (typed && Math.sin(t * 12) > 0) { const tw = g.measureText(typed).width; g.fillStyle = '#ffffff'; g.fillRect(58 + tw, iy + 20, 3, 40); }
  g.fillStyle = typed ? '#ffffff' : '#3a3f49'; g.beginPath(); g.arc(SCR.w - 66, iy + 38, 36, 0, 7); g.fill();
  g.fillStyle = typed ? '#111' : '#777'; g.beginPath(); g.moveTo(SCR.w - 82, iy + 50); g.lineTo(SCR.w - 66, iy + 22); g.lineTo(SCR.w - 50, iy + 50); g.closePath(); g.fill();
  g.restore();
}
function drawScreen(t) {
  const g = S.scrT.userData.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const ts = K.videos11 - 0.05, tm = K.comenta11, tEnd = END - 0.85;
  if (t >= ts && t < tm) drawStats(g, t, win(t, ts, 0.2));
  else if (t >= tm && t < tEnd + 0.3) {
    const typed = 'KIRIA'.slice(0, clamp(Math.floor((t - K.kiria11) / 0.09) + 1, 0, 5) * (t >= K.kiria11 ? 1 : 0));
    const posted = win(t, K.kiria11 + 0.75, 0.25); drawComments(g, t, win(t, tm, 0.3) * (1 - win(t, tEnd, 0.3)), posted > 0.5 ? '' : typed, posted);
  } else drawFeed(g, t);
  g.restore(); S.scrT.needsUpdate = true;
}

// ---------------------------------------------------------------- el guion (lienzo del papel)
function drawPaper(t, linesOn) {
  const T = S.paperT, g = T.userData.g, w = 620, h = 860; g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,70,40,.16)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const tk = clamp((t - K.guion3 - 0.05) / 0.35); g.fillStyle = '#16181d'; g.font = '900 54px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('GUION'.slice(0, Math.ceil(5 * tk)), 52, 92);
  g.fillStyle = 'rgba(22,24,29,.45)'; g.fillRect(52, 132, w - 104, 3);
  if (linesOn) {
    const n = 12, typed = clamp((t - K.que3) / 0.85) * n;
    const hl = win(t, K.desde3, 0.45);
    if (hl > 0) { g.fillStyle = 'rgba(255,194,74,.85)'; g.fillRect(44, PL0 - 22, (w - 88) * eo(hl), 44); }
    for (let i = 0; i < n; i++) { const k = clamp(typed - i); if (k <= 0) break; const lw = PLW(i); g.fillStyle = '#2a2c31'; g.fillRect(52, PL0 + i * PLS - 7, lw * k, 14); }
    const sw = win(t, K.segundo3, 0.25); if (sw > 0) { g.save(); g.globalAlpha = sw; g.translate(w - 110, 92); g.strokeStyle = '#d33a3a'; g.fillStyle = '#d33a3a'; g.lineWidth = 6; g.beginPath(); g.arc(0, 6, 30, 0, 7); g.stroke(); g.fillRect(-8, -36, 16, 10);
      g.beginPath(); g.moveTo(0, 6); g.lineTo(0, -14); g.stroke(); g.font = '800 30px SpaceMono'; g.textAlign = 'right'; g.fillText('0:01', -44, 8); g.restore(); }
  }
  T.needsUpdate = true;
}
const PL0 = 196, PLS = 52, PLW = i => (i === 11 ? 300 : 430 + 86 * hash(i * 3.7 + 1)) * (i === 0 ? 1.05 : 1);

// ---------------------------------------------------------------- todo en el instante t
const _o = new THREE.Object3D(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
function bez(p0, p1, p2, p3, u, out) { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(p0, v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); }
function glyphWorld(i) { const o = S.num.ms[i]; o.updateWorldMatrix(true, false); return v3(0, o.userData.h * 0.42, 0).applyMatrix4(o.matrixWorld); }
function stageAt2(t) {
  // móvil: flota un poco
  S.phone.position.y = PHN.y + 0.012 * sinL(t, 1.6); S.phone.rotation.y = 0.04 * sinL(t, 0.7); S.phone.updateMatrixWorld(true);
  drawScreen(t);
  { const dim = cwin(t, TT.morph0, K.si11 - 0.05, 0.5, 0.4); S.scr.material.color.setScalar(1.18 - 0.78 * dim); }   // la pantalla se apaga un poco mientras pasa lo de delante
  // ---- 1: los objetos salen disparados de la pantalla y se convierten en «3,2 M»
  const tau = t > TT.loop ? t - END : t;
  for (const b of S.burst) {
    const gT = TT.glyph[b.gl], t0 = Math.max(0.03, gT - 0.42), s0 = v3(b.p.x * 0.35, PHN.y + (b.p.y - PHN.y) * 0.4, 0.05);
    let p, s = 1, vis = true;
    if (tau < 0) { const u = clamp((tau + 0.75) / 0.75), e = 1 - Math.pow(1 - u, 2.2); p = s0.clone().lerp(b.p, e); s = 0.4 + 0.6 * e; }
    else if (tau < t0) { p = b.p.clone().add(b.p.clone().sub(s0).multiplyScalar(tau * 0.32)); }
    else if (tau < gT) { const u = (tau - t0) / (gT - t0), e = eio(u); const from = b.p.clone().add(b.p.clone().sub(s0).multiplyScalar(t0 * 0.32)), to = glyphWorld(b.gl);
      p = bez(from, from.clone().add(v3(0, 0.25, 0.3)), to.clone().add(v3(0, 0.15, 0.45)), to, e, new THREE.Vector3()); s = 1 - easeIn(clamp((u - 0.45) / 0.55)); }
    else vis = false;
    b.o.visible = vis && s > 0.01 && tau > -0.75;
    if (b.o.visible) { b.o.position.copy(p); b.o.scale.setScalar(s * (b.s0 || 1)); b.o.rotation.set(b.r[0] + b.w[0] * tau * 0.35, b.r[1] + b.w[1] * tau * 0.35, b.r[2] + b.w[2] * tau * 0.35); }
  }
  S.shards.forEach((sh, i) => { const vis = tau > -0.75 && tau < 1.5; sh.m.visible = vis; if (!vis) return;
    sh.m.position.copy(sh.a).addScaledVector(sh.v, tau * 0.55); sh.m.rotation.set(sh.w + tau * 2.1, sh.w * 0.7 + tau * 1.3, sh.w * 1.3);
    const a = clamp((tau + 0.6) / 0.25) * (1 - clamp((tau - 0.7) / 0.6)); sh.m.material.opacity = 0.35 * a; sh.m.userData.edges.material.opacity = 0.55 * a; });
  // cifras: aparecen al oírlas; brillan cuando les llegan las ▶
  const gone = win(t, K.ni1 - 0.05, 0.35);
  S.num.ms.forEach((o, i) => { const k = t < TT.loop ? pop(t, TT.glyph[i] - 0.06, 0.4) * (1 - gone) : 0; o.visible = k > 0.002; o.scale.setScalar(Math.max(0.0001, k)); });
  S.num.g.position.y = 2.14 + 0.02 * Math.sin(t * 1.3) + 0.6 * gone;
  const vis = K.visual1 - 0.08;
  S.num.ms[0].material.emissive.setScalar(0.35 * cwin(t, vis + 0.3, K.en1 + 0.5, 0.4, 0.5));
  // ▶ de la pantalla a las cifras
  { let n = 0; const on = t > vis && t < vis + 1.8;
    if (on) for (let i = 0; i < S.playData.length; i++) { const d = S.playData[i], st = vis + d.t0, u = (t - st) / d.d; if (u <= 0 || u >= 1) continue;
      const o = S.num.ms[d.gl]; o.updateWorldMatrix(true, false); const tg = v3((d.u - 0.5) * o.userData.w * 0.85, o.userData.h * (0.1 + d.v * 0.8), 0.07).applyMatrix4(o.matrixWorld);
      const a = d.a.clone(); a.y += S.phone.position.y - PHN.y;
      bez(a, a.clone().add(v3(0, 0.15, 0.6)), tg.clone().add(v3(0, -0.2, 0.5)), tg, eio(u), _a);
      _o.position.copy(_a); _o.quaternion.copy(cam.quaternion); _o.scale.setScalar(d.s * Math.min(1, u * 6) * (1 - easeIn(clamp((u - 0.8) / 0.2)))); _o.updateMatrix(); S.plays.setMatrixAt(n++, _o.matrix); }
    S.plays.count = n; S.plays.instanceMatrix.needsUpdate = true; S.plays.visible = n > 0; }
  // los 7 días
  S.days.forEach((d, i) => { const t0 = K.siete1 + 0.02 + i * 0.07, k = t < TT.loop ? pop(t, t0, 0.38) * (1 - gone) : 0; d.visible = k > 0.002; if (!d.visible) return;
    d.scale.setScalar(Math.max(0.001, k)); d.position.y = 1.95 + 0.6 * gone; d.rotation.x = -Math.PI / 2 * (1 - eo(clamp((t - t0) / 0.3))) + 0.12 * Math.sin(Math.max(0, t - K.dias1 - i * 0.05) * 9) * Math.exp(-Math.max(0, t - K.dias1 - i * 0.05) * 5) * (t > K.dias1 + i * 0.05 ? 1 : 0); });
  // ---- la cámara de cine cae, se queda en aristas y sus líneas forman la etiqueta
  { const t0 = K.ni1 - 0.2, tl = TT.land, g = S.mcam, vis = t > t0 && t < TT.morph0 + 0.05; g.visible = vis;
    if (vis) { const u = clamp((t - t0) / (tl - t0)); let y = 0.165 + (3.3 - 0.165) * (1 - u * u);
      if (t > tl) { const b = t - tl; y = 0.165 + 0.06 * Math.abs(Math.sin(b * 11)) * Math.exp(-b * 9); }
      g.position.set(0.42, y, 1.25); const r = 1 - eo(u); g.rotation.set(0.7 * r + (t > tl ? 0.03 * Math.sin((t - tl) * 20) * Math.exp(-(t - tl) * 8) : 0), -0.5 + 1.4 * r, 0.5 * r);
      faceOp(g, 1 - win(t, tl + 0.1, 0.32)); edgeOp(g, 1, 1); } }
  { const t0 = TT.morph0, t1 = TT.morph1, vis = t > t0 && t < t1 + 0.2, M2 = S.morph; M2.visible = vis;
    if (vis) { const N = S.camSegs.length, T2 = S.tagSegs.length;
      for (let i = 0; i < N; i++) { const di = (i / N) * 0.22, u = eio(clamp((t - t0 - di) / 0.42)), A = S.camSegs[i], B = S.tagSegs[i % T2], lift = Math.sin(Math.PI * u) * 0.22;
        _a.copy(A[0]).lerp(B[0], u); _a.y += lift; _b.copy(A[1]).lerp(B[1], u); _b.y += lift; M2.userData.set(i, _a, _b); }
      M2.userData.flush(); M2.material.opacity = 1 - win(t, t1, 0.18); } }
  // ---- 3: el guion sale de la pantalla
  { const t0 = TT.morph1 - 0.22, tb = K.una4 - 0.05, P = S.paper, vis = t > t0 && t < K.voz4 + 0.35; P.visible = vis;
    if (vis) { const e = eo(clamp((t - t0) / 0.3)); P.position.set(0, 1.06 + 0.012 * Math.sin(t * 2), WKZ); P.scale.setScalar(lerp(0.96, 1, e)); P.rotation.set(0, 0.03 * Math.sin(t * 1.1), 0.02 * Math.sin(t * 1.4));
      const out = win(t, tb + 0.22, 0.3); P.material.opacity = e * (1 - out); P.position.z -= out * 0.3; drawPaper(t, t < tb + 0.04); } }
  // ---- 4: las líneas del guion se levantan y son la onda de la voz; 5: se recogen y empieza el mazo
  { const t0 = K.una4 - 0.05, tv = K.voz4 + 0.05, tc = K.cada5, vis = t > t0 && t < tc + 0.5; S.bars.forEach(b => (b.visible = vis));
    if (vis) { S.paper.updateWorldMatrix(true, false);
      const k1 = eio(clamp((t - t0) / (tv - t0 + 0.12))), kc = eio(clamp((t - tc) / 0.45));
      S.barM.emissiveIntensity = 2.2 * k1; S.barM.color.setScalar(lerp(0.03, 0.9, k1));
      S.bars.forEach((b, i) => { const li = i >> 1, half = i & 1, lw = PLW(li) * 0.62 / 620, x0 = -0.31 + 52 * 0.62 / 620, xl = half ? x0 + lw * 0.5 : x0, wl = lw * 0.5 - 0.006;
        const yl = 0.43 - (PL0 + li * PLS) * 0.86 / 860; const Pw = v3(xl + wl / 2, yl, 0.035 * ((xl + wl / 2) / 0.31) ** 2 + 0.006).applyMatrix4(S.paper.matrixWorld);
        const xw = -0.46 + i * 0.04, env = voice(t - 0.03 - Math.abs(i - 11.5) * 0.006), hh = 0.04 + 0.5 * env * (0.55 + 0.45 * Math.sin(i * 1.7 + t * 11)) * (1 - 0.5 * Math.abs(i - 11.5) / 12);
        const Pw2 = v3(xw, 1.0, WKZ); b.position.copy(Pw).lerp(Pw2, k1); b.rotation.set(0, 0, Math.PI / 2 * (1 - k1));
        const len = lerp(wl, hh, k1); b.scale.set(lerp(0.014, 0.022, k1), Math.max(0.002, len * (1 - kc)), lerp(0.004, 0.022, k1));
        if (kc > 0) { b.position.lerp(v3(0, 0.92, WKZ + 0.18), kc * 0.6); } }); } }
  gavelAt(t); towerAt(t); ctaAt(t);
}

// ---------------------------------------------------------------- el mazo (se construye en 3D y golpea justo en «oyes»)
function gavelAt(t) {
  const { pv, gv } = S.gavel, t0 = K.cada5 - 0.02, tD = K.d3_5, tm = K.que5, ts = TT.slam, vis = t > t0 && t < ts + 0.9;
  pv.visible = vis; if (!vis) return;
  edgeOp(gv, 1 - 0.8 * win(t, tD + 0.45, 0.5), clamp((t - t0) / (tD - t0 - 0.1)));
  faceOp(gv, win(t, tD - 0.02, 0.3));
  let th = 1.0, x = PIV.x;
  if (t > tm) th = 1.0 + 0.28 * eio(clamp((t - tm) / 0.7)) + 0.06 * clamp((t - tm - 0.7) / (ts - tm - 0.78));
  if (t > ts - 0.08) { const u = clamp((t - ts + 0.08) / 0.08); th = lerp(1.34, 0, u * u); }
  if (t > ts) { const b = t - ts; th = 0.13 * Math.abs(Math.sin(b * 16)) * Math.exp(-b * 9); if (b > 0.32) { const v = eio(clamp((b - 0.32) / 0.4)); th = 0.9 * v; x = PIV.x + 1.3 * v; } }
  pv.position.set(x, PIV.y + (t < tm ? 0.28 * (1 - eio(clamp((t - tm + 0.2) / 0.6))) : 0), PIV.z); pv.rotation.set(th, 0, 0);
}

// ---------------------------------------------------------------- el taco, la torre de palabras, los anillos del sonido y el «remolino» hacia la etiqueta
function suckK(t, i) { return eio(clamp((t - TT.suck - 0.04 * i) / 0.48)); }
const SUCKP = v3(0, PHN.y + 0.15, 0.05);      // las palabras y el taco se meten en la pantalla
function suckTo(o, k, home) { if (k <= 0) return; const tg = SUCKP; o.position.copy(home).lerp(tg, k); o.position.y += Math.sin(Math.PI * k) * 0.25; }
function towerAt(t) {
  // taco
  { const k = pop(t, K.que5, 0.35), sk = suckK(t, 4), vis = k > 0.002 && sk < 0.999 && t < TT.loop; S.block.visible = vis;
    if (vis) { S.block.scale.setScalar(Math.max(0.001, k * (1 - sk))); S.block.position.set(0, 0, WKZ); S.block.rotation.set(0, 0, 0); suckTo(S.block, sk, v3(0, 0, WKZ)); S.block.rotation.y = sk * 4; } }
  // onda expansiva y chispas del golpe
  { const b = t - TT.slam, vis = b > 0 && b < 0.6; S.shock.visible = vis; if (vis) { const u = b / 0.6; S.shock.scale.setScalar(0.25 + 1.4 * eo(u)); S.shock.material.opacity = (1 - u) * 0.9; }
    S.sp.visible = b > 0 && b < 0.9; if (S.sp.visible) burst(S.sp, v3(0, 0.2, WKZ + 0.02), t, TT.slam, 0.5, 0.9, false, 2.6); }
  // las palabras del subtítulo, en dos filas (SUBTÍTULOS / PALABRA A PALABRA): cada una cae a su sitio al oírla
  let last = -1; TT.words.forEach((tw, i) => { if (t >= tw) last = i; });
  S.tower.forEach((w, i) => {
    const tw = TT.words[i], t0 = tw - 0.22, sk = suckK(t, 3 - i), vis = t > t0 && sk < 0.999 && t < TT.loop; w.g.visible = vis; if (!vis) return;
    const [xF, yF] = WSLOT[i], ryF = [0.04, -0.06, 0.05, -0.04][i];
    const u = clamp((t - t0) / 0.22); let y = yF + 0.32 * (1 - u * u);
    const b = t - tw; let sy = 1; if (b > 0 && b < 0.3) sy = 1 - 0.2 * Math.sin(b / 0.3 * Math.PI) * Math.exp(-b * 6);
    let pul = 0; for (const [te, wi] of TT.rings) if (wi === i || wi === 4) { const d = t - te; if (d > 0 && d < 0.35) pul = Math.max(pul, Math.sin(d / 0.35 * Math.PI)); }
    const home = v3(xF, y + 0.012 * Math.sin(t * 2.2 + i), WKZ); w.g.position.copy(home); w.g.rotation.set(0.05 * (1 - u), ryF, 0);
    w.g.scale.set(1 + 0.1 * pul, sy * (1 + 0.1 * pul), 1 + 0.1 * pul);
    if (sk > 0) { suckTo(w.g, sk, home); w.g.scale.multiplyScalar(1 - sk); w.g.rotation.z = sk * 3; }
    const hl = (i === last && t < TT.words[3] + 0.45) || pul > 0.15; const want = hl ? w.tH : w.tN; if (w.fp.material.map !== want) { w.fp.material.map = want; w.fp.material.needsUpdate = true; }
  });
  // anillos del sonido (alrededor de cada palabra; el de «sonido», de todas)
  S.rings.forEach((r, j) => { const ev = TT.rings[j]; if (!ev) { r.visible = false; return; } const d = t - ev[0], vis = d > 0 && d < 0.6; r.visible = vis; if (!vis) return;
    const u = d / 0.6, all = ev[1] === 4, P = all ? [0, 0.77] : WSLOT[ev[1]]; r.position.set(P[0], P[1], WKZ); r.scale.setScalar((all ? 0.35 : 0.12) + (all ? 0.75 : 0.45) * eo(u)); r.material.opacity = (1 - u) * 0.95; });
}
const WSLOT = [[0, 0.86], [-0.28, 0.68], [0, 0.68], [0.28, 0.68]];

// ---------------------------------------------------------------- tu negocio (toldo), el bocadillo «KIRIA» y la vuelta al principio
function ctaAt(t) {
  const tn = K.negocio11 - 0.02, tOut = END - 1.2;
  { const vis = t > tn && t < tOut + 0.4; S.awning.visible = vis;
    if (vis) { S.awning.position.y = S.phone.position.y + PHN.h / 2 + 0.11; const back = eio(clamp((t - tOut) / 0.35));
      S.slats.forEach((p, i) => { const k = eio(clamp((t - tn - i * 0.035) / 0.32)); p.rotation.x = lerp(-Math.PI / 2, 0.42 + 0.03 * Math.sin(t * 2 + i), k * (1 - back)) + 0.08 * Math.sin(clamp((t - tn - i * 0.035) / 0.5) * Math.PI) * (1 - back); p.scale.setScalar(Math.max(0.001, Math.min(1, k * 3) * (1 - back))); }); } }
  { const tb = K.comenta11 - 0.03, vis = t > tb && t < tOut + 0.45, B = S.bubble; B.visible = vis;
    if (vis) { const e = eio(clamp((t - tb) / 0.45)), back = eio(clamp((t - tOut) / 0.4)); const p = v3(0.12, 1.12, 0.06).lerp(v3(0.3, 1.5, 0.52), e).lerp(v3(0.1, 1.15, 0.0), back);
      B.position.copy(p); B.position.y += 0.015 * Math.sin(t * 2.4); B.rotation.set(0.03 * Math.sin(t * 1.5), -0.22 + 0.05 * Math.sin(t * 0.9), 0.04 * Math.sin(t * 1.2)); B.scale.setScalar(Math.max(0.001, pop(t, tb, 0.45) * (1 - back)));
      S.letters.forEach((l, i) => { const k = pop(t, K.kiria11 + i * 0.09, 0.3); l.visible = k > 0.002; l.scale.setScalar(Math.max(0.001, k)); l.position.z = 0.06 + 0.03 * Math.sin(clamp((t - K.kiria11 - i * 0.09) / 0.3) * Math.PI); }); } }
}
