// ---------------------------------------------------------------- tiempos y animación (todo es función del instante t: se puede dibujar en cualquier orden)
// El perro: paseo inicial hacia ti (y es el mismo paseo con el que acaba, PER metros más allá: bucle exacto), quieto mientras se ve el
// chip, «izquierda, derecha, adelante» y la llegada al objetivo; al final mira a cámara y vuelve a andar.
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const easeIn = x => x * x * x;
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const H0 = Math.PI / 2;                                                   // rumbo: hacia +x
const RT = { tx: 1.52, hL: H0 + 0.7, hR: H0 - 0.7, step: 0.24 };          // objetivo en (tx, 0); giros de 40°
const DUTY = 0.62, LIFT = 0.055, RTURN = 0.3;                            // trote: apoyo 62 % del ciclo; altura del pie; «radio» al girar en el sitio
let TT = {}, STRIDE = 0.19, STEPA = 0.06, GT = null, ZL = [0, 0], ZR = [0, 0];
function buildTimes() {
  TT = {
    w1: 4.4,                                                                // el paseo inicial termina (quieto en el origen)
    scr0: K.aprendido2 - 0.05, lock: K.final2 - 0.05, scr1: K.digo2 + 0.5,   // 2: la pantalla con la pregunta
    aus0: K.empresa3 - 0.05, ausOff: K.en4 + 0.3,                           // 3: Australia en el suelo
    ret0: K.en4 - 0.05, elec: K.electrodos4, grow: K.crecen4,              // 4: el chip pelado, los electrodos y las neuronas que crecen
    prog: K.programa6, izq: K.izquierda6, der: K.derecha6, ade: K.adelante6, // 6
    obj: K.objetivo7,                                                        // 7
    jug: K.jugaron11, pong: K.pong11, doom: K.doom11,                        // 11
    w0: K.neuronas12 + 0.05,                                                 // 12: vuelve a andar (el paseo del principio)
  };
  TT.z1a = TT.izq + 0.02; TT.z1b = TT.z1a + 0.6;
  TT.z2a = TT.der + 0.02; TT.z2b = TT.z2a + 0.6;
  TT.fa = TT.ade + 0.06; TT.fb = K.mapa7 - 0.08;
  ZL = [RT.step * Math.sin(RT.hL), RT.step * Math.cos(RT.hL)]; ZR = [ZL[0] + RT.step * Math.sin(RT.hR), ZL[1] + RT.step * Math.cos(RT.hR)];
  buildGait(); buildRates();
}

// ---------------------------------------------------------------- la ruta: 0→1 con velocidad suave (sube, crucero, baja)
const _rp = {};
function rampPos(u, a) {
  const key = a.toFixed(3), n = 2000; let T = _rp[key];
  if (!T) { T = new Float64Array(n + 1); let s = 0; const v = x => { const p = clamp(x / a), q = clamp((1 - x) / a); return p * p * (3 - 2 * p) * q * q * (3 - 2 * q); };
    for (let i = 1; i <= n; i++) { s += v((i - 0.5) / n) / n; T[i] = s; } for (let i = 1; i <= n; i++) T[i] /= s; _rp[key] = T; }
  const f = clamp(u) * n, i = Math.floor(f); return i >= n ? 1 : lerp(T[i], T[i + 1], f - i);
}
const segXZ = (t, t0, t1, A, B, a = 0.3) => { const u = rampPos((t - t0) / (t1 - t0), a); return [lerp(A[0], B[0], u), lerp(A[1], B[1], u)]; };
function walkXZ(tt, sh) { const t0 = TT.w0 - END; return [sh + lerp(RT.tx - PER, 0, rampPos((tt - t0) / (TT.w1 - t0), 0.11)), 0]; }
function dogXZ(t) {
  if (t >= TT.w0) return walkXZ(t - END, PER);
  if (t <= TT.w1) return walkXZ(t, 0);
  if (t < TT.z1a) return [0, 0];
  if (t < TT.z1b) return segXZ(t, TT.z1a, TT.z1b, [0, 0], ZL);
  if (t < TT.z2a) return ZL;
  if (t < TT.z2b) return segXZ(t, TT.z2a, TT.z2b, ZL, ZR);
  if (t < TT.fa) return ZR;
  if (t < TT.fb) return segXZ(t, TT.fa, TT.fb, ZR, [RT.tx, 0], 0.2);
  return [RT.tx, 0];
}
const dogH = t => H0 + (RT.hL - H0) * win(t, TT.z1a - 0.1, 0.26) + (RT.hR - RT.hL) * win(t, TT.z2a - 0.1, 0.3) + (H0 - RT.hR) * win(t, TT.fa - 0.12, 0.3);
function dogPose(t) { const [x, z] = dogXZ(t); return { x, z, h: dogH(t) }; }
// el paso: fase del trote = distancia recorrida (+ lo girado) / zancada; la zancada se ajusta para que en el vídeo entero quepa un número exacto de pasos
function buildGait() {
  const dt = 1 / 240, n = Math.round(END / dt) + 1, g = new Float64Array(n), sp = new Float64Array(n);
  let prev = dogXZ(0), ph = dogH(0), acc = 0;
  for (let i = 1; i < n; i++) { const t = i * dt, p = dogXZ(t), h = dogH(t), d = Math.hypot(p[0] - prev[0], p[1] - prev[1]) + RTURN * Math.abs(h - ph); acc += d; g[i] = acc; sp[i] = d / dt; prev = p; ph = h; }
  sp[0] = sp[1];
  const sm = new Float64Array(n), R = 30; for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = -R; j <= R; j++) { const k = (i + j + n - 1) % (n - 1); s += sp[k]; c++; } sm[i] = s / c; }
  STRIDE = acc / Math.round(acc / 0.19); STEPA = DUTY * STRIDE / 2;
  GT = { dt, n, g, sp: sm, tot: acc };
}
function gaitPhase(t) { let base = 0; while (t < 0) { t += END; base -= GT.tot; } while (t > END) { t -= END; base += GT.tot; } const f = t / GT.dt, i = Math.min(GT.n - 2, Math.floor(f)); return (base + lerp(GT.g[i], GT.g[i + 1], f - i)) / STRIDE; }
function gaitAct(t) { t = ((t % END) + END) % END; const f = t / GT.dt, i = Math.min(GT.n - 2, Math.floor(f)); return clamp(lerp(GT.sp[i], GT.sp[i + 1], f - i) / 0.15); }
function legIK(L, fz, fy) {
  const L1 = DOG.thigh, L2 = DOG.shin, D = Math.min(L1 + L2 - 1e-4, Math.hypot(fz, fy)), beta = Math.atan2(-fz, -fy);
  const gam = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), del = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
  L.hip.rotation.x = beta + gam; L.knee.rotation.x = -(Math.PI - del);
}
const explodeK = t => cwin(t, K.chip9 - 0.15, K.maquina9 + 0.6, 0.5, 0.5);
const _lc = new THREE.Vector3();
function dogAt(t) {
  const D = S.dog, [x, z] = dogXZ(t), h = dogH(t), ph = gaitPhase(t), act = gaitAct(t), X = explodeK(t);
  D.dog.position.set(x, 0, z); D.dog.rotation.y = h;
  const idle = 1 - act;
  D.body.position.y = DOG.y + act * 0.007 * Math.cos(4 * Math.PI * ph) + 0.003 * Math.sin(2 * Math.PI * 26 * t / END) * idle;
  D.body.rotation.z = act * 0.022 * Math.sin(2 * Math.PI * ph); D.body.rotation.x = act * 0.012 * Math.sin(4 * Math.PI * ph + 1);
  const hipH = D.body.position.y + DOG.hipY, mg = Math.max(cwin(t, K.pasos6 - 0.05, TT.fb + 0.2, 0.15, 0.4) * (0.7 + 0.8 * act), cwin(t, K.motores9 - 0.05, K.todavia10, 0.12, 0.3) * 1.8);
  for (const L of D.legs) {
    const p = fract(ph + (L.id === 'FL' || L.id === 'BR' ? 0 : 0.5));
    let fz, lift = 0;
    if (p < DUTY) fz = STEPA * (1 - 2 * p / DUTY);
    else { const u = (p - DUTY) / (1 - DUTY); fz = -STEPA + 2 * STEPA * sm5(u); lift = Math.sin(Math.PI * u); }
    L.hip.position.x = L.sx * (DOG.hipX + 0.1 * X);
    legIK(L, fz * act, -(hipH - DOG.footR) + lift * act * LIFT);
    L.motorM.emissiveIntensity = mg * (0.75 + 0.25 * Math.sin(t * 20 + L.sx * 2 + L.sz));
  }
  // despiece («el chip, el programa y los motores»)
  D.cap.position.y = 0.13 * X; D.chip.position.y = 0.012 + 0.3 * X; D.head.position.z = 0.36 + 0.14 * X;
  // la cabeza: mira un poco a los lados cuando está quieto; en «derechos» se gira hacia ti
  let yaw = 0.14 * Math.sin(2 * Math.PI * 3 * t / END + 0.5) * idle, pitch = 0.04 * Math.sin(2 * Math.PI * 5 * t / END) * idle;
  const lk = cwin(t, K.derechos12 - 0.12, TT.w0 + 0.1, 0.32, 0.4);
  if (lk > 0.001) { D.dog.updateMatrixWorld(); _lc.copy(cam.position); D.body.worldToLocal(_lc); const a = clamp(Math.atan2(_lc.x, _lc.z - 0.36), -1.15, 1.15), b = clamp(Math.atan2(_lc.y - 0.06, Math.hypot(_lc.x, _lc.z - 0.36)), -0.3, 0.35);
    yaw = lerp(yaw, a, lk); pitch = lerp(pitch, -b, lk); }
  D.head.rotation.set(pitch, yaw, 0);
  D.eyeM.color.copy(new THREE.Color(RTEAL)).multiplyScalar(2.2 + 1.8 * lk);
  // la cúpula de cristal se aparta de la vista cuando la cámara se mete a ver el chip
  D.glass.material.opacity = 0.015 + 0.105 * clamp((cam.position.distanceTo(D.dome.getWorldPosition(_lc)) - 0.5) / 0.5);
}

// ---------------------------------------------------------------- las neuronas del chip: presencia (se recogen y vuelven a crecer), disparos, pulsos y estímulos
const RATE = [], RATE2 = [], PHS = [], PRATE = [];
function buildRates() {
  for (let i = 0; i < NN; i++) { RATE.push(Math.max(1, Math.round((0.7 + 1.5 * hash(i * 3.3)) * END)) / END); RATE2.push(Math.round((4 + 4 * hash(i * 8.1)) * END) / END); PHS.push(hash(i * 7.7)); }
  for (let k = 0; k < 90; k++) PRATE.push(Math.round((1.4 + 2.2 * hash(k * 5.1)) * END) / END);
}
const tsI = i => TT.grow + 0.55 * hash(i * 4.4);
const grown = t => t < TT.grow ? 1 - win(t, TT.ret0, 0.32) : clamp((t - TT.grow) / 0.9);
function somaPres(i, t) { return t < TT.grow ? 1 - win(t, TT.ret0, 0.32) : pop(t, tsI(i), 0.3); }
function dendGrow(d, t) { return t < TT.grow ? 1 - win(t, TT.ret0 - 0.05, 0.3) : clamp((t - (Math.max(tsI(d.a), tsI(d.b)) + 0.12)) / 0.6); }
function nBurst(t) {
  return 1.0 * cwin(t, K.responden5 - 0.05, K.responden5 + 1.0, 0.06, 0.4) + 0.6 * cwin(t, K.convierte6 - 0.1, K.pasos6 + 0.3, 0.15, 0.3)
    + 1.0 * cwin(t, K.punado8 - 0.08, K.punado8 + 0.6, 0.05, 0.4) + 0.8 * cwin(t, TT.jug, TT.doom + 0.7, 0.1, 0.3) + 0.5 * cwin(t, K.neuronas1, K.vivas1 + 0.5, 0.15, 0.4);
}
const nAct = t => (0.42 + 0.1 * Math.sin(2 * Math.PI * 7 * t / END) + nBurst(t)) * grown(t);
function spike(i, t) { const a = Math.exp(-fract(t * RATE[i] + PHS[i]) * 14), b = Math.exp(-fract(t * RATE2[i] + PHS[i] * 3.1) * 12) * Math.min(1, nBurst(t)); return Math.max(a, b); }
const stimEnv = t => Math.max(cwin(t, K.manda5 + 0.1, K.escucha5 + 0.15, 0.12, 0.25), 0.7 * cwin(t, TT.jug, TT.doom + 0.5, 0.15, 0.3));
const _col = new THREE.Color();
function chipAt(t) {
  const U = S.dog.chip.userData, na = nAct(t);
  for (let i = 0; i < NN; i++) { const pr = somaPres(i, t), s = U.somas[i]; s.visible = pr > 0.003; s.scale.set(Math.max(0.001, pr), Math.max(0.001, pr) * 0.75, Math.max(0.001, pr));
    U.somaM[i].emissiveIntensity = (0.45 + 3.4 * spike(i, t) * Math.min(1.2, na)) * clamp(pr); }
  for (const d of U.dends) { const gk = dendGrow(d, t), c = Math.floor(gk * d.n / d.seg) * d.seg; d.tube.geometry.setDrawRange(0, c); d.tube.visible = c > 0; d.g = gk; }
  U.dendM.emissiveIntensity = 0.7 + 0.5 * Math.min(1, na);
  for (let k = 0; k < U.PN; k++) {
    const xx = t * PRATE[k] + hash(k * 2.9), c = Math.floor(xx), u = xx - c, d = U.dends[Math.floor(hash(k * 13.1 + c * 7.7) * U.dends.length)], rev = hash(k + c * 3.1) > 0.5;
    const on = hash(k * 1.7 + c * 5.3) < na * 0.8 && d.g >= 1;
    if (on) { _o.position.copy(d.curve.getPoint(rev ? 1 - u : u)); _o.scale.setScalar(0.6 + 0.7 * Math.sin(Math.PI * u)); } else { _o.position.set(0, 0, 0); _o.scale.setScalar(0.0001); }
    _o.rotation.set(0, 0, 0); _o.updateMatrix(); U.pulses.setMatrixAt(k, _o.matrix);
  }
  U.pulses.instanceMatrix.needsUpdate = true;
  const se = stimEnv(t);
  for (let i = 0; i < 100; i++) {
    const ix = Math.floor(i / 10), iz = i % 10, sj = U.stimE.indexOf(i);
    let e = 1.7 * Math.exp(-Math.pow((t - TT.elec - 0.05 - (ix + iz) / 18 * 0.55) / 0.08, 2));          // barrido en «electrodos»
    if (sj >= 0) e += 1.9 * se * (fract(t * 5 + sj * 0.13) < 0.35 ? 1 : 0.12);
    _col.setRGB(0.28 * e, 0.6 * e, 1.0 * e); U.padG.setColorAt(i, _col);
  }
  U.padG.instanceColor.needsUpdate = true;
  U.rings.forEach((m, j) => { const s = fract(t * 2.2 + j * 0.37); m.scale.setScalar(1 + 4 * s); m.material.opacity = (1 - s) * se * 0.9; m.visible = se > 0.01; });
  S.dog.domeL.intensity = (0.03 + 0.1 * Math.min(1.4, na));
  S.dog.stripM.opacity = clamp(0.2 + 0.6 * na);
}

// ---------------------------------------------------------------- el mapa: Australia, la ruta y el objetivo
function mapAt(t) {
  // Australia (en «empresa de Australia»): se dibuja el contorno con el perro en Melbourne
  const ak = cwin(t, TT.aus0, TT.ausOff, 0.05, 0.35);
  S.aus.forEach((l, i) => { const k = i ? clamp((t - TT.aus0 - 0.45 - i * 0.05) / 0.3) : clamp((t - TT.aus0) / 0.85); l.visible = ak > 0.01 && k > 0; if (l.visible) { drawK(l, k); l.material.opacity = ak; } });
  // la ruta, a medida que anda (y se apaga al final, para el bucle)
  const fin = 1 - win(t, TT.w0 + 0.2, 0.9), rv = t > TT.z1a - 0.1 && fin > 0.005; S.route.visible = rv;
  if (rv) { let n = 0; while (n < S.routeT.length && S.routeT[n] <= t) n++; drawK(S.route, n / (S.routeT.length - 1)); S.route.material.opacity = 0.95 * fin; }
  // el objetivo
  const T = S.target, tv = t > TT.obj - 0.05 && fin > 0.005; T.g.visible = tv;
  if (tv) { T.g.position.set(RT.tx, 0.004, 0); T.g.scale.setScalar(Math.max(0.001, pop(t, TT.obj, 0.4))); T.rm.opacity = fin * (0.85 + 0.15 * Math.sin(t * 7));
    const s = fract(t * 1.1); T.wave.scale.setScalar(1 + 1.6 * s); T.wave.material.opacity = (1 - s) * 0.7 * fin * (t < TT.fb ? 1 : 0.4);
    T.glow.material.opacity = fin * (t < TT.fb ? 0.15 : 0.3 + 0.9 * Math.exp(-(t - TT.fb) / 0.5)); }
}

// ---------------------------------------------------------------- el cerebro (8: «no es un cerebro… el tuyo tiene unos 86.000 millones»)
function brainAt(t) {
  const B = S.brain, t0 = K.cerebro8 - 0.06, vis = t > t0 && t < K.chip9 + 0.45; B.g.visible = vis; if (!vis) return;
  const [x, z] = dogXZ(t), k = pop(t, t0, 0.55), out = win(t, K.aqui8 - 0.15, 0.4);
  B.g.position.set(x, lerp(0.7, 1.5, eo(clamp((t - t0) / 0.6))), z);
  B.g.scale.setScalar(Math.max(0.001, 0.5 * (0.2 + 0.8 * k) * (1 + 0.1 * win(t, K.tuyo8, 0.8)) * (1 - 0.9 * easeIn(out))));
  B.g.lookAt(cam.position); B.g.rotateZ(Math.PI); B.g.rotateX(Math.PI / 2 - 0.5); B.g.rotateZ(0.12 * Math.sin((t - t0) * 0.5));      // visto desde arriba: los dos hemisferios
  B.gm.uniforms.op.value = 0.9 * clamp(k) * (1 - out); B.gm.uniforms.lit.value = win(t, K.n86_8, 1.2);
  const u = clamp((t - (K.n86_8 - 0.15)) / (K.millones8 + 0.45 - K.n86_8 + 0.15));
  B.pts.geometry.setDrawRange(0, Math.floor(B.N * Math.pow(u, 1.6))); B.pts.material.opacity = 0.95 * (1 - out) * (1 - 0.45 * win(t, K.aqui8, 0.4));
}

// ---------------------------------------------------------------- la pantalla (2: «¿qué habían aprendido?» · 11: Pong y el pasillo)
function screenAt(t) {
  const Sc = S.screen, v1 = t > TT.scr0 && t < TT.scr1, v2 = t > K.aprendido11 - 0.05 && t < K.le12 + 0.3; Sc.g.visible = v1 || v2; if (!Sc.g.visible) return;
  const t0 = v1 ? TT.scr0 : K.aprendido11 - 0.05, t1 = v1 ? TT.scr1 : K.le12 + 0.3, [x, z] = dogXZ(t);
  const k = Math.max(0.001, pop(t, t0, 0.42) * (1 - easeIn(win(t, t1 - 0.36, 0.36))));
  Sc.g.position.set(x - 0.05, 1.12 + 0.012 * Math.sin(t * 1.7), z); Sc.g.scale.setScalar(k); Sc.g.lookAt(cam.position);
  Sc.back.material.opacity = 0.5 * clamp(k);
  const g = Sc.T.userData.g, W2 = 640, H2 = 400;
  if (t >= TT.doom - 0.06 && v2) drawCorridor(g, t - TT.doom);
  else if (t >= TT.jug && v2) drawPong(g, t - TT.jug);
  else if (v1 && t >= TT.lock) drawLock(g, t - TT.lock);
  else drawQ(g, t);
  Sc.T.needsUpdate = true;
}
function scanlines(g, W2, H2, a = 0.22) { g.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H2; y += 4) g.fillRect(0, y, W2, 2); }
function drawQ(g, t) {
  const W2 = 640, H2 = 400, fr = Math.floor(t * 24);
  g.fillStyle = '#05070b'; g.fillRect(0, 0, W2, H2);
  for (let i = 0; i < 260; i++) { const x = Math.floor(hash(i * 3.1 + fr * 0.71) * 64) * 10, y = Math.floor(hash(i * 5.3 + fr * 1.37) * 40) * 10, v = hash(i * 1.9 + fr); g.fillStyle = `rgba(${150 + v * 100 | 0},${170 + v * 80 | 0},${200 + v * 55 | 0},${0.05 + v * 0.18})`; g.fillRect(x, y, 10, 10); }
  const gl = hash(fr * 3.3) > 0.8 ? (hash(fr) - 0.5) * 22 : 0;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 230px ${MONO}`;
  g.fillStyle = 'rgba(255,95,168,.75)'; g.fillText('?', W2 / 2 + gl - 6, H2 / 2 + 8); g.fillStyle = 'rgba(98,227,212,.75)'; g.fillText('?', W2 / 2 - gl + 6, H2 / 2 + 8);
  g.fillStyle = '#EEF2F6'; g.fillText('?', W2 / 2 + gl * 0.3, H2 / 2 + 8);
  g.font = `700 22px ${MONO}`; g.fillStyle = 'rgba(238,242,246,.65)'; g.fillText('ARCHIVO: ???', W2 / 2, H2 - 34);
  scanlines(g, W2, H2);
}
function drawLock(g, t) {
  const W2 = 640, H2 = 400; g.fillStyle = '#05070b'; g.fillRect(0, 0, W2, H2);
  const k = eo(clamp(t / 0.25)), cx = W2 / 2, cy = 168;
  g.strokeStyle = '#FFC24A'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy - 40 + 20 * (1 - k), 52, Math.PI, 0); g.lineTo(cx + 52, cy - 10); g.moveTo(cx - 52, cy - 40 + 20 * (1 - k)); g.lineTo(cx - 52, cy - 10); g.stroke();
  g.fillStyle = '#FFC24A'; rr(g, cx - 80, cy - 14, 160, 118, 16); g.fill(); g.fillStyle = '#05070b'; g.beginPath(); g.arc(cx, cy + 34, 14, 0, 7); g.fill(); g.fillRect(cx - 5, cy + 38, 10, 34);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 40px ${MONO}`; g.fillStyle = '#EEF2F6'; g.letterSpacing = '6px'; g.fillText('AL FINAL', cx, 340); g.letterSpacing = '0px';
  scanlines(g, W2, H2, 0.18);
}
// Pong: dos palas y la pelota (la de la izquierda la mueven las neuronas); píxeles gordos
function drawPong(g, u) {
  const W2 = 640, H2 = 400, P = 10; g.fillStyle = '#020304'; g.fillRect(0, 0, W2, H2);
  g.fillStyle = 'rgba(238,242,246,.5)'; for (let y = 10; y < H2; y += 30) g.fillRect(W2 / 2 - 4, y, 8, 16);
  const vx = 560, vy = 330, bx0 = 300, by0 = 120, tri = (x, a, b) => { const L = b - a, m = fract((x - a) / (2 * L)) * 2; return a + L * (m < 1 ? m : 2 - m); };
  const bx = tri(bx0 + vx * u, 50, W2 - 60), by = tri(by0 + vy * u, 20, H2 - 30);
  const pl = clamp(lerp(by, H2 / 2, 0.25) - 40, 10, H2 - 90), pr = clamp(H2 - by - 40 + 30 * Math.sin(u * 3), 10, H2 - 90);
  g.fillStyle = '#FF5FA8'; g.fillRect(30, Math.round(pl / P) * P, 16, 80); g.fillStyle = '#EEF2F6'; g.fillRect(W2 - 46, Math.round(pr / P) * P, 16, 80);
  g.fillRect(Math.round(bx / P) * P, Math.round(by / P) * P, 16, 16);
  g.font = `700 54px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#FF5FA8'; g.fillText(String(3 + Math.floor(u * 1.4)), W2 / 2 - 70, 18); g.fillStyle = '#EEF2F6'; g.fillText('2', W2 / 2 + 70, 18);
  scanlines(g, W2, H2, 0.2);
}
// pasillo de un videojuego en primera persona (genérico): paredes de ladrillo que pasan, suelo, techo, punto de mira y un arma de píxeles
let _cor = null;
function drawCorridor(g, u) {
  const W2 = 640, H2 = 400, w = 160, h = 100; if (!_cor) { const c = document.createElement('canvas'); c.width = w; c.height = h; _cor = c.getContext('2d'); }
  const c = _cor, cx = w / 2 + 6 * Math.sin(u * 2.2), cy = h / 2 - 4; c.fillStyle = '#120806'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { const d = Math.abs(y - cy) / (h / 2); c.fillStyle = y < cy ? `rgb(${20 + d * 30 | 0},${14 + d * 18 | 0},${12 + d * 14 | 0})` : `rgb(${40 + d * 70 | 0},${28 + d * 40 | 0},${18 + d * 22 | 0})`; c.fillRect(0, y, w, 1); }
  for (let s = 0; s < 14; s++) {                     // tramos de pared que se acercan
    const z = 1 + ((s - fract(u * 2.6)) * 0.55), z1 = z + 0.55; if (z <= 0.2) continue;
    for (const sd of [-1, 1]) { const x0 = cx + sd * 34 / z, x1 = cx + sd * 34 / z1, y0a = cy - 30 / z, y0b = cy + 30 / z, y1a = cy - 30 / z1, y1b = cy + 30 / z1, sh = clamp(1.3 / z);
      c.fillStyle = `rgb(${70 * sh + 30 | 0},${36 * sh + 14 | 0},${24 * sh + 10 | 0})`; c.beginPath(); c.moveTo(x0, y0a); c.lineTo(x1, y1a); c.lineTo(x1, y1b); c.lineTo(x0, y0b); c.closePath(); c.fill();
      c.strokeStyle = `rgba(0,0,0,${0.5 * sh})`; c.lineWidth = 1; for (let r = 1; r < 5; r++) { const ya = lerp(y0a, y0b, r / 5), yb = lerp(y1a, y1b, r / 5); c.beginPath(); c.moveTo(x0, ya); c.lineTo(x1, yb); c.stroke(); } }
  }
  c.fillStyle = '#000'; c.fillRect(cx - 34 / 8.7, cy - 30 / 8.7, 68 / 8.7, 60 / 8.7);
  const bob = Math.abs(Math.sin(u * 7)) * 3, fl = fract(u * 1.6) < 0.12;
  if (fl) { c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(w / 2, h - 30 - bob, 7, 0, 7); c.fill(); }
  c.fillStyle = '#3a3f46'; c.fillRect(w / 2 - 6, h - 26 - bob, 12, 26); c.fillStyle = '#5a616b'; c.fillRect(w / 2 - 4, h - 34 - bob, 8, 10); c.fillStyle = '#b07a56'; c.fillRect(w / 2 - 9, h - 12 - bob, 18, 12);
  c.fillStyle = '#7CF0A9'; c.fillRect(w / 2 - 1, h / 2 - 5, 2, 3); c.fillRect(w / 2 - 1, h / 2 + 2, 2, 3); c.fillRect(w / 2 - 5, h / 2 - 1, 3, 2); c.fillRect(w / 2 + 2, h / 2 - 1, 3, 2);
  g.imageSmoothingEnabled = false; g.drawImage(_cor.canvas, 0, 0, W2, H2); g.imageSmoothingEnabled = true;
  scanlines(g, W2, H2, 0.16);
}

// ---------------------------------------------------------------- el panel del programa (6 y 9): convierte la respuesta en pasos (EJEMPLO)
const CODE = [['respuesta = leer_chip()', '#FF5FA8'], ['si respuesta == A:', '#EEF2F6'], ['    paso(IZQUIERDA)', '#FFB547'], ['si respuesta == B:', '#EEF2F6'], ['    paso(DERECHA)', '#FFB547'], ['si respuesta == C:', '#EEF2F6'], ['    paso(ADELANTE)', '#FFB547']];
function codeAt(t) {
  const v1 = cwin(t, TT.prog + 0.1, TT.izq - 0.12, 0.3, 0.3), v2 = 0, k = v1, Pn = S.code.panel;      // (en 9 el programa va en el HUD)
  Pn.visible = k > 0.01; if (!Pn.visible) return;
  const [x, z] = dogXZ(t), t0 = TT.prog + 0.1;
  Pn.position.set(x - 0.28, 0.83, z + 0.36);
  Pn.quaternion.copy(cam.quaternion); Pn.scale.setScalar(Math.max(0.001, pop(t, t0, 0.4) * clamp(k * 1.5) * (v1 >= v2 ? 1 : 0.7))); Pn.material.opacity = clamp(k);
  const g = S.code.P.userData.g, W2 = 560, H2 = 600;
  g.clearRect(0, 0, W2, H2); g.fillStyle = 'rgba(6,10,16,.9)'; rr(g, 4, 4, W2 - 8, H2 - 8, 26); g.fill(); g.strokeStyle = 'rgba(46,230,201,.6)'; g.lineWidth = 3; rr(g, 4, 4, W2 - 8, H2 - 8, 26); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `700 24px ${MONO}`; g.fillStyle = '#9AA1AB'; g.letterSpacing = '4px'; g.fillText('PROGRAMA · EJEMPLO', 36, 52); g.letterSpacing = '0px';
  g.fillStyle = 'rgba(238,242,246,.25)'; g.fillRect(36, 80, W2 - 72, 2);
  const ty = clamp((t - t0) / 1.0) * CODE.reduce((s, l) => s + l[0].length, 0); let left = ty;
  g.font = `700 27px ${MONO}`;
  CODE.forEach(([s, col], i) => { const n = Math.max(0, Math.min(s.length, Math.floor(left))); left -= s.length; g.fillStyle = col; g.fillText(s.slice(0, n), 36, 130 + i * 66);
    if (n > 0 && n < s.length && Math.sin(t * 12) > 0) g.fillRect(36 + g.measureText(s.slice(0, n)).width + 4, 116 + i * 66, 14, 28); });
  S.code.P.needsUpdate = true;
}
