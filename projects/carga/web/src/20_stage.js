// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const SEC = new THREE.Plane(new THREE.Vector3(0, 0, -1), 50);          // corte transversal: se queda z ≤ constante
const SECM = [];
function clipAll(objs) { for (const o of objs) o.traverse(m => { if (!m.material) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { x.clippingPlanes = [SEC]; x.clipping = true; if (!x.isLineMaterial && !x.isShaderMaterial && !SECM.includes(x)) SECM.push(x); }); }); }
let _secSide = false;      // caras de los dos lados solo mientras hay corte (dibujar las dos caras siempre cuesta mucho)
function secSides(on) { if (on === _secSide) return; _secSide = on; for (const x of SECM) { x.side = on ? THREE.DoubleSide : THREE.FrontSide; x.needsUpdate = true; } }
const PY_ON = 0.1 + PT / 2 + 0.0015;
const QE = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
const Q_ON = QE(-Math.PI / 2, 0.42, 0), Q_OFF = QE(-Math.PI / 2, 0.66, 0), Q_COIN = QE(-Math.PI / 2 + 0.03, 0.42, 0.02);
const pose = (p, q, ex = 0, xr = 0) => ({ p, q, ex, xr });
function vertIdle(t) { return pose(v3(0, 0.98 + 0.015 * Math.sin(t * 1.9), 0), QE(-0.08, -1.62 + 0.1 * Math.sin(t * 0.7), 0.05), 1, 0.2); }
function mixPose(A, B, e, arc = 0) { const p = A.p.clone().lerp(B.p, e); p.y += arc * Math.sin(Math.PI * e); return pose(p, A.q.clone().slerp(B.q, e), lerp(A.ex, B.ex, e), lerp(A.xr, B.xr, e)); }
function phonePose(t) {
  const ON = pose(v3(0, PY_ON, 0), Q_ON), HOV = pose(v3(0, 0.74 + 0.012 * Math.sin(t * 1.7), 0), Q_ON), OFF = pose(v3(0.21, PY_ON, 0.13), Q_OFF);
  const COIN = pose(v3(0.02, PY_ON + 0.0125, 0.02), Q_COIN);
  if (t >= END - 1.45) {                                                     // vuelta al primer fotograma (bucle)
    const u = clamp((t - (END - 1.45)) / 1.3), V = vertIdle(t - END);
    return mixPose(ON, V, sm5(u), 0.1);
  }
  const t0 = Math.max(0, t), V = vertIdle(t0);
  const tc = K.cada - 0.08, tl = K.apoyas + 0.16;
  if (t0 < tc) return V;
  if (t0 < tl) { const u = (t0 - tc) / (tl - tc); const P = mixPose(V, ON, sm5(u)); P.p.copy(V.p).lerp(ON.p, Math.pow(u, 2.1)); P.ex = 1 - sm5(clamp(u * 1.4)); return P; }
  const bounce = (ta) => 0.012 * Math.max(0, Math.sin((t - ta) * 34)) * Math.exp(-(t - ta) * 9);
  if (t < K.truco) { const P = pose(ON.p.clone(), Q_ON); P.p.y += bounce(tl); return P; }
  // «el truco»: sale disparado hacia arriba (fuera de plano) y vuelve a bajar cuando el campo «atraviesa la bobina del móvil»
  if (t < K.parece + 0.1) {
    const HIGH = pose(v3(0, 2.9, -0.2), Q_ON);
    const P = t < K.atraviesa - 0.15 ? mixPose(ON, HIGH, sm5(clamp((t - K.truco) / 0.7))) : mixPose(HIGH, HOV, sm5(clamp((t - K.atraviesa + 0.15) / 0.65)));
    P.ex = 0.62 * sm5(clamp((t - K.atraviesa - 0.3) / 0.5)); P.xr = sm5(clamp((t - K.atraviesa - 0.3) / 0.5));
    return P;
  }
  // «parece que carga por contacto»: baja y toca justo en «contacto»
  const tland = K.contacto + 0.1;
  if (t < tland) { const u = clamp((t - (K.parece + 0.1)) / (tland - K.parece - 0.1)); const A = pose(v3(0, 0.74 + 0.012 * Math.sin(t * 1.7), 0), Q_ON, 0.62, 1); const P = mixPose(A, ON, sm5(u)); P.p.y = lerp(A.p.y, ON.p.y, 1 - Math.pow(1 - u, 2.6)); P.ex = 0.62 * (1 - sm5(clamp(u * 1.6))); P.xr = 1 - sm5(clamp(u * 1.5)); return P; }
  if (t < K.descentrado) { const P = pose(ON.p.clone(), Q_ON); P.p.y += bounce(tland) * 0.5; return P; }
  // descentrado → imanes → centrado de golpe
  if (t < K.centran) { const P = mixPose(ON, OFF, sm5(clamp((t - K.descentrado) / 0.5))); P.xr = 0.8 * sm5(clamp((t - K.imanes + 0.1) / 0.4)); return P; }
  const tsn = K.centran + 0.16;
  if (t < tsn) { const u = clamp((t - K.centran) / 0.16); const P = mixPose(OFF, ON, u * u); P.xr = 0.8; return P; }
  if (t < K.algo) { const P = pose(ON.p.clone(), Q_ON); P.xr = 0.8 * (1 - sm5(clamp((t - tsn - 0.25) / 0.4))) + (t > K.y11 + 0.4 ? sm5(clamp((t - K.y11 - 0.4) / 0.4)) * (1 - sm5(clamp((t - K.y14) / 0.5))) : 0); return P; }
  // la moneda: se levanta, entra la moneda, se posa encima (y en rayos X para verla)
  const tup = K.algo + 0.35, tdn = K.robando + 0.2;
  if (t < K.proxima) {
    let P;
    if (t < tup) P = mixPose(ON, pose(v3(0, 0.34, 0), Q_ON), sm5((t - K.algo) / 0.35));
    else if (t < tdn) P = mixPose(pose(v3(0, 0.34, 0), Q_ON), COIN, sm5((t - tup) / (tdn - tup)));
    else P = COIN;
    P.xr = 0.82 * sm5(clamp((t - K.algo) / 0.4)); return P;
  }
  // «la próxima vez que lo apoyes»: fuera la moneda y vuelve a apoyarse
  const tre = K.apoyes + 0.12;
  if (t < tre) { const u = clamp((t - K.proxima) / (tre - K.proxima)); const up = pose(v3(0, 0.4, 0), Q_ON);
    const P = u < 0.45 ? mixPose(COIN, up, sm5(u / 0.45)) : mixPose(up, ON, Math.pow((u - 0.45) / 0.55, 2)); P.xr = 0.82 * (1 - sm5(clamp(u * 2))); return P; }
  // «están hablando»: se separa un poco para que se vea la onda entre las dos bobinas, y vuelve a apoyarse
  const lift = sm5(clamp((t - K.estan + 0.05) / 0.35)) * (1 - sm5(clamp((t - K.tu15) / 0.4)));
  const P = pose(ON.p.clone(), Q_ON); P.p.y += bounce(tre) + 0.4 * lift; return P;
}
// corriente: dirección y avance de los trazos (con los cambios de sentido cada vez más rápidos en la frase 4)
let FLIPS = [];
function buildFlips() { FLIPS = []; let tt = K.cambia + 0.05, d = 0.5; while (tt < K.crea - 0.1) { FLIPS.push(tt); tt += Math.max(1 / 90, d); d *= 0.72; } }
function curDir(t) { if (t < K.cambia + 0.05 || t > K.crea - 0.1) return 1; let n = 0; for (const f of FLIPS) { if (t >= f) n++; else break; } return n % 2 ? -1 : 1; }
function curSpeed(t) { return t >= K.cambia && t < K.crea ? 1.3 + 5 * clamp((t - K.cambia) / 2.2) : 1.0; }
function flowOff(t) { let o = 0; const dt = 1 / 240; for (let x = -1; x < t; x += dt) o += curDir(x) * curSpeed(x) * dt; return o; }
// brillo de la bobina emisora a lo largo del vídeo
function txGlow(t) {
  if (t < K.apoyas + 0.2) return 0.8;
  if (t < K.corriente4) return 0.12;
  if (t < K.corta) return keyed(t, [[K.corriente4, 0.15], [K.corriente4 + 0.25, 0.9], [K.crea, 0.8], [K.se6, 0.75], [K.realidad, 0.75], [K.dos7, 0.45], [K.en9, 0.45], [K.en9 + 0.5, 0.6], [K.y11, 0.6], [K.el11, 0.32], [K.mismo, 0.32], [K.morse, 0.6], [K.y14, 0.75]]);
  if (t < K.corta + 0.08) return 2.2;                                      // chispazo y corte
  if (t < K.apoyes + 0.1) return 0;
  return clamp((t - K.apoyes - 0.1) / 0.3) * 0.75 * (t > END - 1.45 ? 1 - sm5(clamp((t - END + 1.45) / 1.2)) * 0.2 : 1);
}
// golpecitos (modulación de carga) en la frase 13: puntos y rayas
const MORSE = [0.08, 0.08, 0.22, 0.08, 0.08, 0.08, 0.22, 0.22, 0.08, 0.08, 0.22, 0.08];
function tapAt(t) {
  if (t < K.golpecitos - 0.05 || t > K.morse + 0.6) return 0;
  let x = K.golpecitos - 0.05; for (const d of MORSE) { if (t >= x && t < x + d) return 1; x += d + 0.07; if (x > t) break; } return 0;
}
// partículas de energía (frase 8 y la moneda)
function buildEnergy() {
  const N = 150, m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), N);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); m.frustumCulled = false; m.renderOrder = 5; scene.add(m); S.energy = m;
}
function energyAt(t) {
  const m = S.energy, N = m.count, dm = new THREE.Matrix4(); let vis = false;
  const a8 = env(t, K.parte, K.en9 + 0.1, 0.2, 0.25), a14 = env(t, K.robando - 0.1, K.corta + 0.02, 0.2, 0.02);
  for (let i = 0; i < N; i++) {
    let s = 0, x = 0, y = 0, z = 0, r = 1, g = 0.6, b = 0.2;
    const life = 0.9, ph = ((t * (0.8 + hash(i) * 0.5) + hash(i * 3.7)) % life) / life, ang = hash(i * 5.1) * Math.PI * 2, rad = 0.09 + 0.14 * hash(i * 9.2);
    if (a8 > 0.01) {          // suben de la bobina del cargador a la del móvil; algunas se escapan y se vuelven calor
      const lost = hash(i * 13.3) < 0.32 && t > K.pierde, y0 = 0.05, y1 = 0.108;
      x = Math.cos(ang) * rad; z = Math.sin(ang) * rad * 0.35 - 0.02; y = lerp(y0, y1, ph);
      if (lost && ph > 0.35) { const k = (ph - 0.35) / 0.65; x += Math.cos(ang) * k * 0.12; y = lerp(y0, y1, 0.35) + k * 0.02; r = 1; g = lerp(0.6, 0.22, k); b = lerp(0.2, 0.05, k); }
      s = (i % 3 ? 0.0017 : 0) * a8 * Math.sin(Math.PI * ph); vis = true;
    } else if (a14 > 0.01) {  // se desvían hacia la moneda
      const C = S.coin.position; x = lerp(Math.cos(ang) * rad, C.x, ph * ph); z = lerp(Math.sin(ang) * rad, C.z, ph * ph); y = lerp(0.05, C.y, ph) + 0.02 * Math.sin(Math.PI * ph);
      r = 1; g = lerp(0.65, 0.25, ph); b = 0.08; s = 0.0035 * a14 * Math.sin(Math.PI * ph); vis = true;
    }
    dm.makeScale(Math.max(1e-5, s), Math.max(1e-5, s), Math.max(1e-5, s)); dm.setPosition(x, y, z); m.setMatrixAt(i, dm); m.setColorAt(i, _c.setRGB(r * 3, g * 3, b * 3));
  }
  m.visible = vis; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
}
// pings y paquetes entre las dos bobinas (frases 11 y 12)
function glyphTex(ch, col) { return canvasTex(256, 256, (g, w, h) => { g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 30; g.font = `700 190px SpaceMono, DejaVuMono`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, w / 2, h / 2 + 8); }); }
function buildPackets() {
  const mk = (ch, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glyphTex(ch, col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.renderOrder = 8; m.visible = false; scene.add(m); return m; };
  S.pk = { plus: mk('+', '#FFB547'), minus: mk('−', '#FFB547'), eq: mk('=', '#FFB547'), q: mk('?', '#62E3D4'), ok: mk('✓', '#FFB547') };
  S.rings = [0, 1, 2, 3].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), basicGlow(0x62e3d4, 2)); r.rotation.x = Math.PI / 2; r.visible = false; r.renderOrder = 7; scene.add(r); return r; });
  S.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), basicGlow(0xffb547, 2.5), 40); S.dots.frustumCulled = false; scene.add(S.dots);
}
function packetsAt(t) {
  const yT = 0.05, yR = 0.108, face = o => o.quaternion.copy(cam.quaternion);
  // anillos: el cargador pregunta (turquesa, sube) y el móvil contesta (ámbar, baja)
  const R = [[K.pregunta, 1], [K.hay11, 1], [K.si11, -1], [K.compatible, -1]];
  S.rings.forEach((r, i) => { const [t0, dir] = R[i], u = (t - t0) / 0.55; r.visible = u > 0 && u < 1; if (!r.visible) return;
    const s = 0.04 + 0.26 * eo(u); r.scale.set(s, s, s * 0.6); r.position.set(0, dir > 0 ? lerp(yT, yR, u) : lerp(yR, yT, u), 0); r.material.color.set(dir > 0 ? 0x62e3d4 : 0xffb547).multiplyScalar(2.2 * (1 - u)); });
  // glifos que bajan del móvil al cargador: «+», «−», «=»
  const G = [[S.pk.plus, K.mas12], [S.pk.minus, K.menos], [S.pk.eq, K.asi]];
  G.forEach(([o, t0]) => { const u = (t - t0 + 0.05) / 0.5; o.visible = u > 0 && u < 1.25; if (!o.visible) return; face(o);
    const s = 0.034 * (0.6 + 0.4 * eo(clamp(u * 3))) * (u > 1 ? 1 - (u - 1) * 4 : 1); o.scale.setScalar(Math.max(1e-4, s)); o.position.set(-0.02, lerp(yR - 0.008, yT + 0.012, sm5(clamp(u))), 0.015); });
  // ráfaga de paquetes pequeños «varias veces por segundo»
  const dm = new THREE.Matrix4(), a = env(t, K.luego, K.golpecitos, 0.3, 0.3); S.dots.visible = a > 0.01;
  for (let i = 0; i < 40; i++) { const u = ((t - K.luego) * 1.6 + i / 40 * 4) % 1, x = (hash(i * 3.3) - 0.5) * 0.3, z = (hash(i * 7.7) - 0.6) * 0.08; const s = 0.0016 * a * Math.sin(Math.PI * u);
    dm.makeScale(Math.max(1e-5, s), Math.max(1e-5, s), Math.max(1e-5, s)); dm.setPosition(x, lerp(yR, yT, u), z); S.dots.setMatrixAt(i, dm); }
  S.dots.instanceMatrix.needsUpdate = true;
}
// cable USB-C genérico (final: «¿con cable o sin cable?»)
function buildUsb() {
  const g = new THREE.Group(); scene.add(g); g.visible = false;
  const body = rbox(0.1, 0.24, 0.055, new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.35, metalness: 0.2, clearcoat: 0.6 }), 0.025); g.add(body); edges(body, 0xdfe6ee, 1.2, 30, 0.35);
  const tip = rbox(0.07, 0.08, 0.025, new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.2 }), 0.012); tip.position.y = 0.155; g.add(tip);
  const c = tube([v3(0, -0.12, 0), v3(0, -0.3, 0.02), v3(0.1, -0.55, 0.12), v3(0.35, -0.75, 0.3)], 0.016, new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.6 }), 40); g.add(c);
  return g;
}

function stageAt(t) {
  const P = S.phone, C = S.charger, F = S.faraday, cu = C.userData, pu = P.userData;
  // ---- móvil
  const ps = phonePose(t); P.position.copy(ps.p); P.quaternion.copy(ps.q);
  const fadeAll = env(t, K.induccion + 0.15, K.parece + 0.25, 0.45, 0.4);   // Faraday: carcasas fuera
  phoneState(P, ps.ex, ps.xr, 0.08);
  for (const k of ['frame', 'back', 'screen', 'batt', 'board']) { const g = pu.parts[k]; if (fadeAll > 0.001) { setOp(g, (1 - fadeAll) * (k === 'batt' || k === 'board' ? 1 : 1 - 0.94 * ps.xr)); edgeOp(g, (1 - fadeAll) * (0.08 + 0.85 * ps.xr)); } }
  pu.M.screen.emissiveIntensity = 1.1 * env(t, K.apoyas + 0.25, K.truco + 0.2, 0.25, 0.3) + 1.1 * env(t, K.apoyes + 0.25, END - 1.5, 0.25, 0.4);
  // ---- cargador
  let cx = keyed(t, [[0, 0.6], [1.9, 0.6], [2.4, 0], [K.dentro, 0], [K.dentro + 0.5, 1], [K.parece + 0.1, 1], [K.parece + 0.5, 0], [K.imanes - 0.25, 0], [K.imanes + 0.1, 1], [K.centran + 0.5, 1], [K.y11, 0.0], [K.y11 + 0.5, 1], [K.mismo + 0.6, 1], [K.y14 - 0.2, 0]]);
  if (t > END - 1.45) cx = 0.6 * sm5(clamp((t - END + 1.45) / 1.0));
  chargerXray(C, cx, 0.1 * (1 - fadeAll));
  if (fadeAll > 0.001) { cu.shellM.opacity *= 1 - fadeAll; cu.padM.opacity *= 1 - fadeAll; edgeOp(cu.shell, (1 - fadeAll) * (0.1 + 0.8 * cx)); cu.shellM.transparent = cu.padM.transparent = true; }
  cu.fer.visible = cu.pcb.visible = fadeAll < 0.9;
  const ledOn = t > K.apoyas + 0.2 && t < K.corta || t > K.apoyes + 0.15 && t < END - 1.0;
  cu.ledM.emissive.set(t > K.corta && t < K.apoyes ? 0xff4e42 : 0x62e3d4); cu.ledM.emissiveIntensity = ledOn ? 0.7 : (t > K.corta && t < K.corta + 1.2 ? 0.9 * (Math.sin(t * 22) > 0 ? 1 : 0.15) : 0);
  // ---- bobinas: corriente y calor
  const off = flowOff(t), tg = txGlow(t), heat = 0.9 * env(t, K.calor - 0.1, K.en9 + 0.9, 0.4, 0.8);
  const tap = tapAt(t), mod = t > K.mismo && t < K.morse + 0.6 ? 0.35 + 0.9 * tap : 1;
  setCurrent(cu.tx, tg * mod, off, heat * 0.8);
  const macro = env(t, K.dos7 - 0.3, K.en9 + 0.3, 0.3, 0.3) + env(t, K.el11 - 0.3, K.mismo + 0.4, 0.3, 0.4);
  const rxOn = (t < K.apoyas + 0.2 ? 0.55 : (t > K.aparece && t < K.corta ? (t < K.aparece + 0.3 ? 0.9 * (t - K.aparece) / 0.3 : 0.75) : (t > K.apoyes + 0.1 ? 0.6 : 0))) * (1 - 0.55 * macro);
  setCurrent(pu.rx, rxOn * mod, -off * 0.9, heat);
  S.rig.coilL.intensity = 1.4 * tg + 2.5 * heat;
  // ---- campo magnético
  const fk = keyed(t, [[K.crea - 0.02, 0], [K.crea + 0.8, 1], [K.induccion + 0.2, 1], [K.y6, 0], [K.realidad + 0.1, 0], [K.dos7, 1], [K.en9 - 0.1, 1], [K.en9 + 0.4, 0], [K.y11, 0], [K.y11 + 0.6, 1], [K.corta, 1], [K.corta + 0.12, 0], [K.apoyes + 0.1, 0], [K.apoyes + 0.7, 1], [END - 1.6, 1], [END - 1.1, 0]]);
  const ph = P.position.y, stretch = 1 + 1.15 * clamp((ph - PY_ON) / 0.6);
  fieldState(t, fk, stretch, off * 0.55, (0.55 + 0.45 * mod) * (t > K.corta && t < K.corta + 0.12 ? 2.5 : 1));
  S.rig.fieldL.intensity = 1.6 * fk;
  // ---- Faraday: las bobinas se convierten en los devanados del anillo de hierro
  const fr = env(t, K.y6 - 0.1, K.parece + 0.35, 0.55, 0.45);
  F.visible = fr > 0.002; const fu = F.userData;
  if (F.visible) {
    F.position.set(0, 0.044 + fu.R, 0); fu.U.uA.value = fr; edgeOp(fu.ring, 0.55 * fr);
    const wk = pop(t, K.y6 + 0.05, 0.45) * (1 - win(t, K.parece, 0.3)); fu.wA.scale.setScalar(Math.max(1e-3, wk)); fu.wB.scale.setScalar(Math.max(1e-3, wk));
    fu.wA.position.set(0, -fu.R * (1 - wk), 0); fu.wB.position.set(0, fu.R * (1 - wk), 0);
    fu.wA.userData.U.uGlow.value = 1.1 * wk; fu.wA.userData.U.uOff.value = off; fu.wB.userData.U.uGlow.value = 0.9 * wk * win(t, K.faraday - 0.05, 0.2); fu.wB.userData.U.uOff.value = -off;
    const gk = pop(t, K.descubrio, 0.4) * (1 - win(t, K.parece, 0.3)); fu.gal.scale.setScalar(Math.max(1e-3, gk)); fu.pile.scale.setScalar(Math.max(1e-3, gk)); fu.wires.forEach(w => w.visible = gk > 0.5);
    fu.needle.rotation.z = -0.95 * Math.exp(-Math.max(0, t - K.faraday) * 2.4) * Math.sin(Math.max(0, t - K.faraday) * 9) * (t > K.faraday ? 1 : 0);
    S.ironFluxM.opacity = fr * win(t, K.faraday - 0.1, 0.3); S.ironFluxM.dashOffset = -off * 0.4;
  }
  // las bobinas planas se encogen hacia los devanados mientras crece el anillo
  const mk = win(t, K.y6 - 0.1, 0.45) * (1 - win(t, K.parece, 0.35));
  cu.tx.scale.setScalar(Math.max(1e-3, 1 - mk)); pu.rx.scale.setScalar(Math.max(1e-3, 1 - mk)); pu.parts.coil.children[0].visible = mk < 0.7;
  // ---- corte transversal
  const sec = keyed(t, [[K.realidad - 0.05, 0], [K.realidad + 0.55, 1], [K.en9 - 0.2, 1], [K.en9 + 0.3, 0], [K.y11 + 0.05, 0], [K.y11 + 0.75, 1], [K.mismo + 0.3, 1], [K.mismo + 0.9, 0]]);
  SEC.constant = sec > 0.001 ? lerp(1.2, 0, sm5(sec)) : 50; secSides(sec > 0.001);
  // ---- barras de la prueba
  const bars = S.bars.userData.bars, bOut = 1 - win(t, K.por10, 0.5);
  barState(bars[0], win(t, K.prueba - 0.1, 0.4) * bOut, win(t, K.prueba + 0.1, 0.6) * bOut, 1 + 0.6 * env(t, K.con9, K.cable9 + 0.4, 0.1, 0.3));
  barState(bars[1], win(t, K.cargar9, 0.4) * bOut, win(t, K.gasto, 0.85) * bOut);
  barState(bars[2], win(t, K.descentrado + 0.1, 0.4) * bOut, win(t, K.aun, 0.6) * bOut);
  // ---- imanes
  const mg = env(t, K.imanes - 0.2, K.y11 + 0.2, 0.25, 0.3); cu.mags.visible = pu.mags.visible = mg > 0.01;
  cu.mags.scale.setScalar(Math.max(1e-3, pop(t, K.imanes - 0.2, 0.35))); pu.mags.scale.setScalar(Math.max(1e-3, pop(t, K.imanes - 0.1, 0.35)));
  // ---- moneda y llave
  const coin = S.coin, key = S.key;
  coin.visible = t > K.algo + 0.12 && t < K.apoyes; key.visible = t > K.llaves - 0.35 && t < K.apoyes;
  if (coin.visible) { const inn = sm5(clamp((t - K.algo - 0.12) / 0.5)), out = sm5(clamp((t - K.proxima - 0.05) / 0.45));
    coin.position.set(lerp(0.9, 0.06, inn) + 1.2 * out, 0.1015 + 0.0072, lerp(0.55, 0.1, inn) + 0.6 * out); coin.rotation.y = 2 * (1 - inn) + out;
    const ch = win(t, K.robando, 0.8) * (1 - win(t, K.corta + 0.05, 1.0)); coin.userData.m.emissiveIntensity = 2.4 * ch; coin.userData.m.emissive.setRGB(1, 0.18 + 0.25 * ch, 0.04);
    S.rig.coinL.intensity = 3.5 * ch; S.rig.coinL.position.set(coin.position.x, 0.16, coin.position.z); }
  else S.rig.coinL.intensity = 0;
  if (key.visible) { const inn = sm5(clamp((t - K.llaves + 0.35) / 0.45)), out = sm5(clamp((t - K.proxima) / 0.45));
    key.position.set(lerp(-0.95, -0.2, inn) - 1.2 * out, 0.1015 + 0.006, lerp(-0.6, -0.16, inn) - 0.5 * out); key.rotation.y = 0.7 + 1.5 * (1 - inn);
    const kh = win(t, K.llaves + 0.1, 0.7) * (1 - win(t, K.corta + 0.05, 1.0)); key.userData.m.emissiveIntensity = 2.0 * kh; }
  // ---- energía, pings, paquetes, USB
  energyAt(t); packetsAt(t);
  const ub = S.usb, uk = env(t, K.tu15 - 0.1, END - 1.3, 0.35, 0.4); ub.visible = uk > 0.01;
  if (ub.visible) { ub.position.set(-0.68, 0.45 + 0.03 * Math.sin(t * 2), 0.35); ub.rotation.set(0.15, 0.6 + 0.2 * Math.sin(t * 0.8), -0.25); ub.scale.setScalar(Math.max(1e-3, uk)); }
}
