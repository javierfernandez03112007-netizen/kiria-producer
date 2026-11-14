// ---------------------------------------------------------------- el centro: una mano derecha de piel, vista por el dorso, sobre el fondo claro. El índice lleva un corte
// que se abre (la piel de arriba desaparece) y deja ver el dedo por dentro: al tirar, la articulación del medio se separa, el gas del líquido se junta y nace
// la burbuja. La mano izquierda (Unger) entra en la frase 7. Al final todo vuelve al primer fotograma (bucle).
const T_HIT = 0.3;
const flexAt = (t, tc, A = 0.95) => { const u = t - tc; if (u < -0.26 || u > 0.62) return 0; return u < 0 ? A * eio(clamp((u + 0.26) / 0.26)) : u < 0.14 ? A : A * (1 - eio(clamp((u - 0.14) / 0.48))); };
const CUT = { y0: 0.17, y1: 0.69, xm: 0.106, open: -0.01, closed: 0.13 };
const qflex = (t, tc, A = 0.6) => { const u = t - tc; if (u < -0.1 || u > 0.25) return 0; return u < 0 ? A * eio((u + 0.1) / 0.1) : u < 0.05 ? A : A * (1 - eio((u - 0.05) / 0.2)); };
const popk = (t, t0) => { const u = t - t0; if (u <= 0) return 0; return u < 0.09 ? eo(u / 0.09) * 1.15 : 1 + 0.15 * Math.exp(-(u - 0.09) * 9) * Math.cos((u - 0.09) * 32); };
const HAND_L = -1.62;
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  S.hand = realHand({ cut: true }); Z.add(S.hand);
  S.handL = realHand({ cut: true, left: true }); S.handL.position.x = HAND_L; Z.add(S.handL);
  // destello y onda del crujido dentro de la articulación
  const flT = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(160,220,255,.85)'); gr.addColorStop(0.65, 'rgba(60,160,240,.3)'); gr.addColorStop(1, 'rgba(60,160,240,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const rgT = canvasTex(256, 256, (c, w, h) => { c.strokeStyle = 'rgba(40,140,230,.95)'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.stroke(); });
  S.jf = new THREE.Sprite(new THREE.SpriteMaterial({ map: flT, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); S.jf.renderOrder = 11; scene.add(S.jf);
  S.jr = new THREE.Sprite(new THREE.SpriteMaterial({ map: rgT, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); S.jr.renderOrder = 11; scene.add(S.jr);
}
// el corte del índice: 1 = abierto
function cutK(t) {
  let k = 1 - win(t, 0.55, 0.7);
  k = Math.max(k, win(t, K.cada3 - 0.3, 0.65) * (1 - win(t, K.respuesta7 - 0.62, 0.5)));
  return Math.max(k, win(t, END - 1.05, 0.75));
}
// cuánto se separa la articulación del medio al tirar del dedo
function pullAt(t) {
  let p = 0.012 * eio(clamp(t / 0.3)) * (1 - win(t, 0.9, 0.5));
  const a = eio(clamp((t - (K.tirar3 - 0.05)) / 0.6)), b = t > K.golpe3 ? 0.007 * (1 - Math.exp(-(t - K.golpe3) * 18)) : 0;
  p += (0.013 * a + b) * (1 - win(t, K.respuesta7 - 0.62, 0.5));
  p += 0.006 * Math.sin(Math.PI * clamp((t - (K.crujir6 - 0.2)) / 0.7));       // vuelve a tirar (no cruje)
  return p;
}
// tamaño de la burbuja (1 = recién nacida)
function bubAt(t) {
  const a = popk(t, T_HIT) * (1 - win(t, 1.0, 0.4));
  const b = popk(t, K.golpe3) * (1 - 0.72 * eio(clamp((t - K.durar6) / (K.enseguida6 + 0.4 - K.durar6)))) * (1 - win(t, K.respuesta7 - 0.62, 0.45));
  return Math.max(a, b);
}
const _jw = new THREE.Vector3(), _q0 = new THREE.Quaternion();
function jointAt(h, t, pull, bk, dotK, conv, shake) {
  const F = h.userData.fingers[0], g = GAP + pull, r = F.r;
  F.fluid.scale.y = g * 1.55; F.fluid.position.y = -pull / 2;
  F.bub.visible = bk > 0.003; F.bub.position.set(0, -pull / 2, 0); F.bub.scale.set(r * 0.33 * bk, g * 0.43 * Math.min(1, bk), r * 0.27 * bk);
  F.dots.visible = dotK > 0.01;
  if (F.dots.visible) { for (let i = 0; i < F.dp.length; i++) { const p = F.dp[i], j = shake * 0.0022;
      _o.position.set(p.x * (1 - conv) + Math.sin(t * 37 + i) * j, (p.y * (g / GAP) - pull / 2) * (1 - conv) - pull / 2 * conv + Math.cos(t * 41 + i * 2) * j, p.z * (1 - conv));
      _o.rotation.set(0, 0, 0); _o.scale.setScalar(0.0021 * dotK * (1 - 0.5 * conv)); _o.updateMatrix(); F.dots.setMatrixAt(i, _o.matrix); }
    F.dots.instanceMatrix.needsUpdate = true; }
}
// crujido de un nudillo (destello + onda) en las marcas de la mano
function knuckleFx(h, t, times, s = 1) {
  h.userData.fx.forEach((f, i) => { let k = 0, ku = 9; for (const tc of times[i] || []) { const u = t - tc; if (u > 0 && u < 0.6) { k = Math.max(k, Math.exp(-u * 8)); ku = Math.min(ku, u); } }
    f.flash.scale.setScalar(Math.max(0.0001, 0.22 * s * k)); f.flash.material.opacity = Math.min(1, k * 1.4);
    const rk = ku < 0.55 ? ku / 0.55 : 1; f.ring.scale.setScalar(rk < 1 ? (0.06 + 0.3 * eo(rk)) * s : 0.0001); f.ring.material.opacity = rk < 1 ? (1 - rk) * 0.9 : 0; });
}
function centerAt(t, st) {
  const H = S.hand, U = H.userData;
  H.rotation.y = 0.035 * Math.sin(2 * Math.PI * t / END);
  // crujidos: el principio (tras el del índice por dentro), el «50 años», la frase 9
  const T1 = [[1.72], [], [0.64], [0.98], [1.34]];
  const cyc = []; if (t > K.medico1 - 0.1 && t < K.tenian2) { const c0 = K.medico1 + 0.05; for (let n = 0; n < 5; n++) for (let i = 1; i <= 4; i++) { (cyc[i] = cyc[i] || []).push(c0 + n * 0.5 + (i - 1) * 0.08); } }
  const XC = i => K.mandaselo9 + 0.15 + (i - 1) * 0.14;
  const times = [0, 1, 2, 3, 4].map(i => [...T1[i], ...(cyc[i] || []), ...(i >= 1 ? [XC(i)] : [K.mandaselo9 + 0.8])]);
  const ang = [0, 1, 2, 3, 4].map(i => { let a = 0; for (const tc of T1[i]) a = Math.max(a, flexAt(t, tc)); for (const tc of cyc[i] || []) a = Math.max(a, qflex(t, tc, 0.55)); for (const tc of i >= 1 ? [XC(i)] : [K.mandaselo9 + 0.8]) a = Math.max(a, flexAt(t, tc)); return a; });
  const pull = pullAt(t); handPose2(H, ang, [0, pull]);
  knuckleFx(H, t, times, t > K.medico1 - 0.2 && t < K.tenian2 ? 0.6 : 1);
  // la «artritis» del mito: rojez en los nudillos
  const rk = win(t, K.artritis1 - 0.1, 0.35) * (1 - win(t, K.tenian2 - 0.2, 0.5));
  U.fx.forEach((f, i) => { f.red.scale.setScalar(Math.max(0.0001, (i ? 0.3 : 0.24) * rk * (1 + 0.08 * Math.sin(t * 7 + i)))); f.red.material.opacity = rk * 0.75; });
  // el corte y lo que pasa dentro de la articulación del medio
  const ck = cutK(t); cutUpdate(H, lerp(CUT.closed, CUT.open, ck), CUT.y0, CUT.y1, CUT.xm);
  const bk = bubAt(t);
  const dotK = Math.max(1 - win(t, 0.24, 0.07), win(t, K.liquido3 - 0.1, 0.4) * (1 - win(t, K.golpe3 - 0.04, 0.06)), win(t, END - 1.0, 0.5));
  const conv = Math.max(t < 2 ? eio(clamp((t - 0.06) / 0.24)) : 0, eio(clamp((t - K.gas3) / (K.golpe3 - K.gas3))));
  const shake = win(t, K.presion3 - 0.1, 0.3) * (1 - win(t, K.golpe3 - 0.1, 0.1));
  jointAt(H, t, pull, bk, dotK, conv, shake);
  const F = U.fingers[0];
  F.cap.material.opacity = 0.38 + 0.3 * env(t, K.capsula3 - 0.05, K.liquido3 + 0.2, 0.25, 0.4);
  F.fluid.material.emissiveIntensity = 0.35 + 0.6 * env(t, K.liquido3 - 0.05, K.tirar3 + 0.1, 0.25, 0.4);
  // destello y onda en la articulación al nacer la burbuja
  F.bub.getWorldPosition(_jw); S.jf.position.copy(_jw); S.jr.position.copy(_jw);
  let fk = 0, ru = 9; for (const tc of [T_HIT, K.golpe3]) { const u = t - tc; if (u > 0 && u < 0.7) { fk = Math.max(fk, Math.exp(-u * 7)); ru = Math.min(ru, u); } }
  S.jf.scale.setScalar(Math.max(0.0001, 0.11 * fk)); S.jf.material.opacity = Math.min(1, fk * 1.3);
  const rr3 = ru < 0.6 ? ru / 0.6 : 1; S.jr.scale.setScalar(rr3 < 1 ? 0.03 + 0.16 * eo(rr3) : 0.0001); S.jr.material.opacity = rr3 < 1 ? (1 - rr3) * 0.9 : 0;
  // la mano izquierda de Unger: entra en la frase 7, cruje una y otra vez; en la 8 se abren los dos índices (sin artritis)
  const L = S.handL, lv = t > K.respuesta7 - 0.4 && t < K.mandaselo9; L.visible = lv;
  if (lv) { const e = eio(clamp((t - (K.respuesta7 - 0.3)) / 0.9)) * (1 - eio(clamp((t - (K.tu9 - 0.1)) / 0.9)));
    L.position.set(lerp(HAND_L - 2.2, HAND_L, e), 0, 0); L.rotation.y = -0.035 * Math.sin(2 * Math.PI * t / END);
    const P7 = 0.7, cy = t > K.crujio7 - 0.3 && t < K.anos7 + 0.4, ph = (t - (K.crujio7 - 0.3)) / P7, u = ((ph % 1) + 1) % 1 * P7, off = i => i ? 0.1 + (i - 1) * 0.06 : 0.36;
    const la = [0, 1, 2, 3, 4].map(i => cy ? qflex(u, off(i), 0.75) : 0); handPose2(L, la, []);
    const lt = [0, 1, 2, 3, 4].map(i => { if (!cy) return []; const c0 = Math.floor(ph) * P7 + (K.crujio7 - 0.3) + off(i); return [c0, c0 - P7]; });
    knuckleFx(L, t, lt, 0.8);
    const lk = win(t, K.ninguna8 - 0.1, 0.6) * (1 - win(t, K.ig8 + 0.3, 0.6)); cutUpdate(L, lerp(CUT.closed, CUT.open, lk), CUT.y0, CUT.y1, CUT.xm);
    jointAt(L, t, 0, 0, 0, 0, 0);
  }
  // en la frase 8 también se abre el índice derecho (los dos sanos)
  if (t > K.ninguna8 - 0.2 && t < K.ig8 + 1.0) { const lk = win(t, K.ninguna8 - 0.1, 0.6) * (1 - win(t, K.ig8 + 0.3, 0.6)); cutUpdate(H, lerp(CUT.closed, CUT.open, Math.max(ck, lk)), CUT.y0, CUT.y1, CUT.xm); }
}
