// ---------------------------------------------------------------- tiempos y animación (todo es función del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
function bez(p0, p1, p2, p3, u, out) { const v = 1 - u; return out.set(0, 0, 0).addScaledVector(p0, v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); }
let TT = {};
const SUCK = 1.3;                                    // lo que tarda una moneda en meterse en la pantalla
function buildTimes() {
  TT = {
    rew0: K.binance3 - 0.15,                         // el dinero vuelve a estar en la cartera (empieza la historia)
    hot0: K.carteras3, net0: K.conectadas3,          // cartera caliente, conectada a internet
    mail0: K.oferta4 - 0.1, call0: K.videollamadas5, hr: K.recursos5, ceo: K.jefe5, fake: K.existe5,
    test0: K.prueba6, run: K.ejecutar6, bug0: K.programa7, av: K.antivirus7, calm: K.pero8, wait: K.esperaron8,
    ai: K.ia9, jump: K.saltaron9, land: K.ingenieros9 + 0.2,
    date: K.n29_10, attack: K.atacan10, timer0: K.n20_10, timer1: K.salen10, out0: K.salen10 - 0.1, chain0: K.salen10 - 0.25,
    big: K.mayor11, x4: K.cuatro11, rec: K.record11, fbi: K.fbi12, niegan: K.niegan12,
    money: K.y13, frz: K.congelado13 - 0.1, ref0: K.resto14, dlg: K.entrevista15 - 0.15, sus: K.sospecha15, chOut: K.entrevista15 - 0.3,
    loop: END - 1.25,
  };
}

// ---------------------------------------------------------------- pantallas (lienzo 2D)
function silhouette(g, cx, cy, s, col = '#8a919c') {      // persona sin cara (recreación)
  g.fillStyle = col; g.beginPath(); g.arc(cx, cy - s * 0.32, s * 0.2, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx, cy + s * 0.32, s * 0.42, s * 0.3, 0, Math.PI, 0); g.fill();
}
function topBar(g, W2, title, col = '#e8ecf2') {
  g.fillStyle = '#15181e'; g.fillRect(0, 0, W2, 54); g.fillStyle = col; g.font = '700 24px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(title, 24, 28);
  [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([c, i]) => { g.fillStyle = c; g.beginPath(); g.arc(W2 - 90 + i * 26, 28, 8, 0, 7); g.fill(); });
}
function drawCall(g, t, W2, H2, glow) {
  g.fillStyle = '#0d0f13'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Videollamada · Entrevista de trabajo');
  g.fillStyle = '#1d2129'; rr(g, 24, 70, W2 - 48, H2 - 160, 18); g.fill(); silhouette(g, W2 / 2, H2 / 2 - 10, 260);
  g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, 40, H2 - 150, 250, 44, 10); g.fill(); g.fillStyle = '#fff'; g.font = '700 22px Inter'; g.fillText('Recursos Humanos', 56, H2 - 128);
  g.fillStyle = Math.sin(t * 6) > 0 ? '#ff4b4b' : '#7a2020'; g.beginPath(); g.arc(W2 - 70, 98, 9, 0, 7); g.fill();
  [[-90, '#2a2f38'], [0, '#e5484d'], [90, '#2a2f38']].forEach(([dx, c]) => { g.fillStyle = c; g.beginPath(); g.arc(W2 / 2 + dx, H2 - 46, 26, 0, 7); g.fill(); });
  if (glow > 0.01) { const gr = g.createRadialGradient(W2 / 2, H2 / 2 - 20, 0, W2 / 2, H2 / 2 - 20, W2 * 0.45); gr.addColorStop(0, `rgba(255,214,120,${0.85 * glow})`); gr.addColorStop(1, 'rgba(255,170,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); }
}
function drawDash(g, t, W2, H2) {
  g.fillStyle = '#0d0f13'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Operaciones · cartera caliente');
  g.fillStyle = '#7cf0a9'; g.font = '700 26px SpaceMono'; g.fillText('● CONECTADA A INTERNET', 30, 100);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(30, 150 + i * 60); g.lineTo(W2 - 30, 150 + i * 60); g.stroke(); }
  g.strokeStyle = '#ffc24a'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 60; i++) { const x = 30 + (W2 - 60) * i / 60, y = 330 - 90 * Math.sin(i * 0.21 + t * 0.6) * 0.5 - i * 1.6; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
}
function drawMail(g, t, W2, H2, k) {
  g.fillStyle = '#f4f5f7'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Correo');
  g.fillStyle = '#111'; g.font = '800 34px Inter'; g.textAlign = 'left'; g.fillText('Nueva oferta de trabajo', 40, 112);
  g.fillStyle = '#5b616b'; g.font = '600 22px Inter'; g.fillText('De: Director de proyecto · plataforma de empleo', 40, 152);
  g.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 6; i++) { rr(g, 40, 200 + i * 40, (W2 - 80) * (i === 5 ? 0.5 : 0.85 + 0.15 * hash(i)), 16, 8); g.fill(); }
  g.fillStyle = '#2563eb'; rr(g, 40, H2 - 110, 220, 64, 32); g.fill(); g.fillStyle = '#fff'; g.font = '800 24px Inter'; g.textAlign = 'center'; g.fillText('Responder', 150, H2 - 78);
  if (k < 1) { g.fillStyle = `rgba(0,0,0,${1 - k})`; g.fillRect(0, 0, W2, H2); }
}
function drawTwo(g, t, W2, H2) {
  g.fillStyle = '#0d0f13'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Videollamada · 2.ª entrevista');
  const tw = (W2 - 72) / 2, th = H2 - 150;
  const tile = (x, on, name, ceo) => { if (on <= 0.01) return; g.save(); g.globalAlpha = on; g.fillStyle = '#1d2129'; rr(g, x, 76, tw, th, 16); g.fill(); silhouette(g, x + tw / 2, 76 + th / 2, 190);
    g.fillStyle = 'rgba(0,0,0,.55)'; rr(g, x + 14, 76 + th - 54, tw * 0.62, 40, 10); g.fill(); g.fillStyle = '#fff'; g.font = '700 20px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, x + 28, 76 + th - 34);
    if (ceo) { const gl = win(t, TT.fake, 0.15); g.strokeStyle = gl > 0.5 ? '#ff4b4b' : 'rgba(255,255,255,.5)'; g.setLineDash([8, 6]); g.lineWidth = 3; rr(g, x + tw - 110, 92, 90, 90, 12); g.stroke(); g.setLineDash([]);
      g.fillStyle = gl > 0.5 ? '#ff4b4b' : 'rgba(255,255,255,.6)'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText('?', x + tw - 65, 140);
      if (gl > 0.01 && Math.sin(t * 40) > 0) { g.fillStyle = 'rgba(255,60,60,.25)'; g.fillRect(x, 76 + th * hash(Math.floor(t * 30)), tw, 18); } }
    g.restore(); };
  tile(24, win(t, TT.hr - 0.1, 0.2), 'Recursos Humanos', false); tile(48 + tw, win(t, TT.ceo - 0.1, 0.2), 'CEO', true);
}
function drawCode(g, t, W2, H2, stage) {      // editor + terminal de la «prueba técnica»
  g.fillStyle = '#0f1116'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'prueba-tecnica — editor');
  g.fillStyle = '#151820'; g.fillRect(0, 54, 210, H2 - 54); g.fillStyle = '#9aa1ab'; g.font = '600 20px SpaceMono'; g.textAlign = 'left'; g.textBaseline = 'middle';
  ['prueba-tecnica/', '  README.md', '  instalar.sh', '  src/', '  test/'].forEach((s, i) => g.fillText(s, 16, 90 + i * 34));
  for (let i = 0; i < 9; i++) { g.fillStyle = ['#7aa2f7', '#9ece6a', '#bb9af7', '#e0af68'][i % 4]; g.globalAlpha = 0.75; rr(g, 240 + (i % 3) * 30, 84 + i * 30, 160 + 260 * hash(i * 2.3), 14, 7); g.fill(); } g.globalAlpha = 1;
  const ty = H2 - 190; g.fillStyle = '#07080b'; g.fillRect(210, ty, W2 - 210, 190); g.fillStyle = '#7cf0a9'; g.font = '700 22px SpaceMono';
  const cmd = '$ ./instalar.sh && ejecutar prueba', k = clamp((t - TT.run + 0.1) / 0.5); g.fillText(cmd.slice(0, Math.floor(cmd.length * k)), 230, ty + 34);
  if (k >= 1) { const p = clamp((t - TT.run - 0.45) / 1.2); g.fillStyle = '#2a2f38'; rr(g, 230, ty + 70, W2 - 280, 18, 9); g.fill(); g.fillStyle = '#7cf0a9'; rr(g, 230, ty + 70, (W2 - 280) * p, 18, 9); g.fill();
    if (p >= 1) { g.fillStyle = '#e6ebf2'; g.fillText('✓ Prueba completada', 230, ty + 124); } }
  if (stage === 'bug' && Math.sin(t * 23) > 0.6) { g.fillStyle = 'rgba(255,40,40,.22)'; g.fillRect(0, 54 + (H2 - 54) * hash(Math.floor(t * 20)), W2, 26); }
}
function drawAV(g, t, W2, H2, k) {
  if (k <= 0.01) return; g.save(); g.globalAlpha = k; const w = 420, h = 150, x = W2 - w - 24, y = 70;
  g.fillStyle = '#1b2a20'; rr(g, x, y, w, h, 16); g.fill(); g.strokeStyle = '#3ddc84'; g.lineWidth = 3; rr(g, x, y, w, h, 16); g.stroke();
  g.fillStyle = '#3ddc84'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✓', x + 60, y + h / 2);
  g.textAlign = 'left'; g.fillStyle = '#e6ebf2'; g.font = '800 26px Inter'; g.fillText('Antivirus', x + 110, y + 56); g.fillStyle = '#9fe8bd'; g.font = '700 24px Inter'; g.fillText('Sin amenazas', x + 110, y + 96); g.restore();
}
function drawAI(g, t, W2, H2) {
  g.fillStyle = '#0f1116'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Asistente IA interno', '#ffb4b4');
  for (let i = 0; i < 5; i++) { const on = win(t, TT.ai + 0.2 + i * 0.35, 0.2); if (on <= 0) break; g.globalAlpha = on; const me = i % 2 === 0;
    g.fillStyle = me ? '#3b1d22' : '#1d2129'; rr(g, me ? W2 - 520 : 30, 80 + i * 92, 490, 70, 18); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, (me ? W2 - 500 : 50), 100 + i * 92, 300 + 120 * hash(i), 14, 7); g.fill(); rr(g, (me ? W2 - 500 : 50), 124 + i * 92, 200 + 100 * hash(i + 3), 14, 7); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = 'rgba(255,40,40,.12)'; g.fillRect(0, 0, W2, H2);
}
function drawAlert(g, t, W2, H2) {
  g.fillStyle = '#1a0607'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Operaciones · cartera caliente', '#ffb4b4');
  g.fillStyle = Math.sin(t * 8) > 0 ? '#ff4b4b' : '#a01d1d'; g.font = '900 52px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚠ RETIRADAS EN CURSO', W2 / 2, 140);
  g.font = '700 24px SpaceMono'; g.textAlign = 'left';
  for (let i = 0; i < 7; i++) { const n = Math.floor(t * 12) + i; g.fillStyle = `rgba(255,180,180,${0.85 - i * 0.1})`; g.fillText(`− ${(hash(n) * 900 + 50).toFixed(2)} → 0x${Math.floor(hash(n * 3.3) * 0xffffff).toString(16).padStart(6, '0')}…`, 60, 230 + i * 44); }
}
function drawOk(g, t, W2, H2) {
  g.fillStyle = '#07140c'; g.fillRect(0, 0, W2, H2); topBar(g, W2, 'Operaciones · cartera caliente', '#b9f5cf');
  g.fillStyle = '#3ddc84'; g.font = '900 52px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✓ FONDOS REPUESTOS', W2 / 2, H2 / 2 - 30);
  g.fillStyle = '#9fe8bd'; g.font = '700 26px Inter'; g.fillText('Según Binance, ningún cliente pierde dinero', W2 / 2, H2 / 2 + 40);
}
function drawDialog(g, t, W2, H2) {
  drawCode(g, t, W2, H2, ''); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W2, H2);
  const w = 620, h = 300, x = (W2 - w) / 2, y = (H2 - h) / 2, warn = win(t, TT.sus - 0.05, 0.15);
  g.fillStyle = '#f4f5f7'; rr(g, x, y, w, h, 22); g.fill();
  if (warn > 0) { g.strokeStyle = `rgba(255,59,59,${warn})`; g.lineWidth = 10; rr(g, x - 6, y - 6, w + 12, h + 12, 26); g.stroke(); }
  g.fillStyle = '#ffc24a'; rr(g, x + 34, y + 40, 76, 92, 10); g.fill(); g.fillStyle = '#7a5410'; g.font = '800 20px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ZIP', x + 72, y + 98);
  g.textAlign = 'left'; g.fillStyle = '#111'; g.font = '800 30px Inter'; g.fillText('prueba_tecnica.zip', x + 134, y + 70); g.fillStyle = '#5b616b'; g.font = '600 22px Inter'; g.fillText('¿Descargar y ejecutar?', x + 134, y + 110);
  g.fillStyle = '#e5484d'; rr(g, x + 34, y + h - 92, 260, 60, 30); g.fill(); g.fillStyle = '#2a2f38'; rr(g, x + w - 294, y + h - 92, 260, 60, 30); g.fill();
  g.fillStyle = '#fff'; g.font = '800 24px Inter'; g.textAlign = 'center'; g.fillText('Ejecutar', x + 164, y + h - 62); g.fillText('Cancelar', x + w - 164, y + h - 62);
}
function drawMain(t, glow) {
  const T = S.lap.userData.T, g = T.userData.g, W2 = T.userData.c.width, H2 = T.userData.c.height; g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < TT.rew0 - 0.2 || t >= TT.loop) drawCall(g, t, W2, H2, glow);
  else if (t < TT.mail0) drawDash(g, t, W2, H2);
  else if (t < TT.call0) drawMail(g, t, W2, H2, win(t, TT.mail0, 0.25));
  else if (t < TT.test0) drawTwo(g, t, W2, H2);
  else if (t < TT.calm) { drawCode(g, t, W2, H2, t > TT.bug0 ? 'bug' : ''); drawAV(g, t, W2, H2, cwin(t, TT.av - 0.05, TT.calm, 0.15, 0.2)); }
  else if (t < TT.ai) drawCode(g, t, W2, H2, '');
  else if (t < TT.attack) drawAI(g, t, W2, H2);
  else if (t < TT.ref0 + 0.6) drawAlert(g, t, W2, H2);
  else if (t < TT.dlg) drawOk(g, t, W2, H2);
  else drawDialog(g, t, W2, H2);
  T.needsUpdate = true;
}
function drawSide(i, t, red) {
  const T = S.side[i].userData.T, g = T.userData.g, W2 = T.userData.c.width, H2 = T.userData.c.height; g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = red ? '#1a0607' : '#0f1116'; g.fillRect(0, 0, W2, H2); topBar(g, W2, red ? 'Acceso remoto' : 'Carteras · firmas', red ? '#ffb4b4' : '#e8ecf2');
  for (let k = 0; k < 8; k++) { g.fillStyle = red ? 'rgba(255,120,120,.5)' : 'rgba(150,170,200,.45)'; rr(g, 30 + (k % 2) * 30, 90 + k * 46, 200 + 300 * hash(k * 1.7 + i), 16, 8); g.fill(); }
  if (red && Math.sin(t * 8) > 0) { g.fillStyle = '#ff4b4b'; g.font = '900 60px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚠', W2 - 90, H2 - 80); }
  T.needsUpdate = true;
}

// ---------------------------------------------------------------- monedas
const _o = new THREE.Object3D(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
let SCRP = null, SCRN = null;                         // centro de la pantalla y su normal (en el mundo)
function screenFrame() { if (SCRP) return; S.lap.updateMatrixWorld(true); const s = S.lap.userData.scr; SCRP = s.localToWorld(v3(0, 0, 0)); SCRN = s.localToWorld(v3(0, 0, 1)).sub(SCRP).normalize(); }
const SD = i => hash(i * 7.31) * 2.0, RW = i => hash(i * 2.9) * 0.9, RFD = i => hash(i * 9.7) * 1.4;
function pileAt(i, k = 1) { const q = S.pile[i]; _o.position.copy(q.p); _o.rotation.set(q.rx, q.ry, q.rz); _o.scale.setScalar(Math.max(0.001, k)); return k > 0.002; }
function suckAt(i, u) {
  const q = S.pile[i], P = q.p, e = eio(u);
  _a.copy(P).add(v3(0, 1.0 + hash(i) * 0.5, 0.2)); _b.copy(SCRP).addScaledVector(SCRN, 0.55).add(v3((hash(i * 3) - 0.5) * 0.4, 0.15, 0));
  bez(P, _a, _b, SCRP, e, _o.position);
  if (u > 0.55) { const w = (u - 0.55) / 0.45, ang = w * 9 + hash(i * 5) * 6.28, r = 0.16 * (1 - w) * Math.sin(w * Math.PI * 0.9 + 0.3); _o.position.x += Math.cos(ang) * r; _o.position.y += Math.sin(ang) * r; }
  _o.rotation.set(q.rx + u * 9, q.ry + u * 5, q.rz + u * 7); _o.scale.setScalar(Math.max(0.001, 1 - easeIn(clamp((u - 0.78) / 0.22)))); return true;
}
function coinMain(i, t) {
  const tau = t >= TT.loop ? t - END : t;
  if (tau < 3.0) { const u = (tau + 0.6 - SD(i)) / SUCK; if (u <= 0) return pileAt(i); if (u >= 1) return false; return suckAt(i, u); }
  if (t < TT.rew0) return false;
  const tOut = TT.out0 + S.outRank[i] / NCOIN * 3.2;
  if (t < tOut) return pileAt(i, pops(t, TT.rew0 + RW(i), 0.35));
  // vuelta: caen desde arriba
  if (t >= TT.ref0 + RFD(i)) { const u = clamp((t - TT.ref0 - RFD(i)) / 0.55); if (u >= 1) return pileAt(i); const q = S.pile[i]; _o.position.copy(q.p); _o.position.y += 2.6 * (1 - u * u); _o.rotation.set(q.rx + (1 - u) * 6, q.ry, q.rz + (1 - u) * 4); _o.scale.setScalar(1); return true; }
  // por su cadena
  const c = i % NCH, ch = S.chains[c], s = (t - tOut) / 2.0;
  let u;
  if (t < TT.frz) u = s < 1 ? s : s - Math.floor(s);
  else { const sf = (TT.frz - tOut) / 2.0, uf = sf < 1 ? sf : sf - Math.floor(sf); u = uf + (t - TT.frz) / 2.0; if (u >= 1) return false; }
  const q = S.pile[i];
  if (s < 0.15) { const w = s / 0.15, st = ch.curve.getPointAt(0.01); bez(q.p, _a.copy(q.p).add(v3(0, 0.6, 0)), _b.copy(st).add(v3(0, 0.25, 0)), st, eio(w), _o.position); }
  else { ch.curve.getPointAt(clamp(u), _o.position); _o.position.x += (hash(i * 1.9) - 0.5) * 0.18; _o.position.y += 0.16 + (hash(i * 2.7) - 0.5) * 0.14 + 0.03 * Math.sin(t * 9 + i); _o.position.z += (hash(i * 3.9) - 0.5) * 0.18; }
  _o.rotation.set(t * 4 + i, t * 3 + i * 0.7, i); _o.scale.setScalar(1); return true;
}
function coinsAt(t) {
  screenFrame(); let n = 0;
  for (let i = 0; i < NCOIN; i++) if (coinMain(i, t)) { _o.updateMatrix(); S.coins.setMatrixAt(n++, _o.matrix); }
  S.coins.count = n; S.coins.instanceMatrix.needsUpdate = true; S.coins.visible = n > 0;
  // congeladas: el hielo avanza desde la cartera hacia fuera
  let m = 0; const fo = 1 - win(t, TT.chOut, 0.6);
  if (t > TT.frz && fo > 0.002) for (let k = 0; k < NFZ; k++) { const c = FROZEN[k % FROZEN.length], ch = S.chains[c], u = 0.05 + 0.9 * (Math.floor(k / FROZEN.length) + hash(k * 1.3)) / (NFZ / FROZEN.length);
    const sc = pops(t, TT.frz + u * 0.9, 0.3) * fo; if (sc <= 0.002) continue; ch.curve.getPointAt(u, _o.position); _o.position.y += 0.16; _o.position.x += (hash(k * 2.1) - 0.5) * 0.16; _o.position.z += (hash(k * 3.1) - 0.5) * 0.16;
    _o.rotation.set(k, k * 0.7, k * 1.3); _o.scale.setScalar(sc); _o.updateMatrix(); S.fcoins.setMatrixAt(m++, _o.matrix); }
  S.fcoins.count = m; S.fcoins.instanceMatrix.needsUpdate = true; S.fcoins.visible = m > 0;
}

// ---------------------------------------------------------------- el programa espía: sale de la pantalla, baja por el cable y espera; luego salta a los otros portátiles
let BUGP = null;
function bugPaths() {
  if (BUGP) return BUGP; screenFrame();
  const kb = S.lap.localToWorld(v3(0, LAP.th + 0.02, -0.02)), back = S.lap.localToWorld(v3(0, LAP.th + 0.02, -LAP.d / 2 + 0.05)), sOut = SCRP.clone().addScaledVector(SCRN, 0.03);
  const emerge = new THREE.CatmullRomCurve3([sOut, sOut.clone().add(v3(0.06, -0.1, 0.02)), kb.clone().add(v3(0.08, 0.01, 0.08)), kb, back]);
  const sideP = S.side.map(l => { l.updateMatrixWorld(true); return l.localToWorld(v3(0, LAP.th + 0.03, -0.02)); });
  const wait = S.cMain.curve.getPointAt(0.42);
  const jumps = S.cSide.map((cb, i) => new THREE.CatmullRomCurve3([wait, v3(Math.sign(SIDE[i].x) * 0.6, 0.03, -0.6), cb.curve.getPointAt(0.55), cb.curve.getPointAt(0.25), cb.curve.getPointAt(0.02), sideP[i]]));
  BUGP = { emerge, jumps, sideP }; return BUGP;
}
function placeBug(b, curve, u, t, moving) {
  u = clamp(u); curve.getPointAt(u, b.position); curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)), _d); b.position.y += 0.02;
  b.lookAt(_a.copy(b.position).add(_d)); for (const L of b.userData.legs) L.piv.rotation.x = moving ? 0.5 * Math.sin(t * 28 + L.k * 2 + L.sx) : 0.08 * Math.sin(t * 3 + L.k);
}
function bugsAt(t) {
  const P = bugPaths(), B = S.bug, out = 1 - win(t, TT.big, 0.3);
  B.visible = t > TT.bug0 - 0.05 && out > 0.01;
  if (B.visible) {
    if (t < TT.calm) placeBug(B, P.emerge, (t - TT.bug0) / 1.6, t, true);
    else if (t < TT.attack) { const u = 0.42 * clamp((t - TT.calm) / 1.2); if (t < TT.calm + 1.2) placeBug(B, S.cMain.curve, u, t, true); else placeBug(B, S.cMain.curve, 0.42, t, false); }
    else placeBug(B, S.cMain.curve, 0.42 + 0.58 * eio(clamp((t - TT.attack) / 1.2)), t, true);
    B.scale.setScalar(Math.max(0.001, pop(t, TT.bug0, 0.3) * out * (1 + 0.08 * Math.sin(t * 6))));
  }
  S.bugs.forEach((b, i) => { b.visible = t > TT.jump - 0.05 && out > 0.01; if (!b.visible) return; const u = (t - TT.jump) / (TT.land - TT.jump); placeBug(b, P.jumps[i], u, t, u < 1); b.scale.setScalar(Math.max(0.001, pop(t, TT.jump, 0.3) * out)); });
}

// ---------------------------------------------------------------- todo en el instante t
function stageAt2(t) {
  // monedas, bicho, pantallas
  const suckGlow = 0.5 * (t < 3 ? clamp(1 - Math.abs(t - 0.9) / 2) : t >= TT.loop ? clamp((t - TT.loop) / 1.25) : 0);
  drawMain(t, suckGlow); S.side.forEach((l, i) => drawSide(i, t, t > TT.land));
  coinsAt(t); bugsAt(t);
  // cartera: caliente (brillo naranja) y luego en alarma
  { const V = S.vault, hot = cwin(t, TT.hot0, TT.attack + 0.5, 0.4, 0.4), alarm = t > TT.attack && t < TT.ref0 + 1.5;
    V.glow.material.opacity = 0.25 + 0.65 * hot + (alarm ? 0.4 * (0.5 + 0.5 * Math.sin(t * 10)) : 0); V.glow.material.color.set(alarm ? 0xff4040 : 0xffffff);
    V.led.material.emissive.set(alarm ? 0xff2a2a : 0x35ff8a); V.led.material.emissiveIntensity = alarm ? 3 + 3 * (Math.sin(t * 12) > 0 ? 1 : 0) : 3; }
  // internet y cables (el brillo corre por dentro; rojo cuando entra el programa espía)
  { const k = pop(t, TT.net0, 0.4), N = S.net; N.g.visible = k > 0.002 && t < TT.loop; N.g.scale.setScalar(Math.max(0.001, k)); N.g.rotation.y = t * 0.4; N.ring.rotation.z = t * 0.8;
    S.cNet.m.visible = t > TT.net0 - 0.05; S.cNet.m.material.emissiveIntensity = 1.4 * win(t, TT.net0, 0.5) * (t < TT.loop ? 1 : 0); S.cNet.T.offset.x = -t * 0.6; }
  const redMain = t > TT.calm && t < TT.ref0, redSide = t > TT.land && t < TT.ref0;
  for (const [cb, red, sp] of [[S.cMain, redMain, 0.5], [S.cSide[0], redSide, 0.45], [S.cSide[1], redSide, 0.45]]) { cb.T.offset.x = -t * sp; cb.m.material.emissive.set(red ? 0xff3030 : 0xffffff); cb.m.material.emissiveIntensity = red ? 1.8 : 0.9; }
  // cadenas de bloques: se construyen desde la cartera; hielo en las congeladas; se van al final
  { const fade = 1 - win(t, TT.chOut, 0.6);
    S.chains.forEach((ch, c) => { const fz = FROZEN.includes(c);
      ch.blocks.forEach(({ b, u }, k) => { const s = pop(t, TT.chain0 + u * 0.9, 0.3) * fade; b.visible = s > 0.002; if (!b.visible) return; b.scale.setScalar(Math.max(0.001, s));
        if (fz) { const ik = win(t, TT.frz + u * 0.9, 0.25); b.material.color.setRGB(lerp(0.08, 0.8, ik), lerp(0.09, 0.93, ik), lerp(0.11, 1.0, ik)); b.material.emissive.setRGB(0.25 * ik, 0.65 * ik, 1.1 * ik); b.scale.multiplyScalar(1 + 0.18 * ik); } });
      ch.line.visible = t > TT.chain0 && fade > 0.01; ch.line.material.opacity = 0.6 * fade * win(t, TT.chain0, 0.8); });
    S.ice.visible = t > TT.frz && t < TT.chOut + 0.6; if (S.ice.visible) { const a = S.ice.geometry.attributes.position.array, n = S.ice.userData.n;
      for (let k = 0; k < n; k++) { const c = FROZEN[k % FROZEN.length], u = clamp(hash(k * 3.1) * clamp((t - TT.frz) / 0.9)), p = S.chains[c].curve.getPointAt(u); a[k * 3] = p.x + (hash(k) - 0.5) * 0.4; a[k * 3 + 1] = p.y + 0.1 + (hash(k * 2) - 0.5) * 0.4 + 0.1 * Math.sin(t * 2 + k); a[k * 3 + 2] = p.z + (hash(k * 5) - 0.5) * 0.4; }
      S.ice.geometry.attributes.position.needsUpdate = true; S.ice.material.opacity = 0.9 * fade; S.ice.material.size = 0.09; } }
  // torres del récord: la grande (este robo) y la pequeña (el récord anterior)
  { const out = 1 - win(t, TT.money, 0.4);
    S.towers.forEach((T, j) => { const t0 = j === 1 ? TT.big : TT.rec, dur = j === 1 ? 1.5 : 0.5, kk = clamp((t - t0) / dur), cnt = Math.floor(T.n * kk); let m = 0;
      if (out > 0.002) for (let i = 0; i < cnt; i++) { const drop = clamp((t - t0 - i / T.n * dur) / 0.12); _o.position.set(T.x + (hash(i * 1.7 + j) - 0.5) * 0.012, 0.005 + i * 0.01 + 0.25 * (1 - drop), 1.3 + (hash(i * 2.3 + j) - 0.5) * 0.012);
        _o.rotation.set(0, i * 0.37, 0); _o.scale.set(4.3 * out, 1, 4.3 * out); _o.updateMatrix(); T.im.setMatrixAt(m++, _o.matrix); }
      T.im.count = m; T.im.instanceMatrix.needsUpdate = true; T.im.visible = m > 0; }); }
}
