// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t: se puede dibujar en cualquier orden)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
let TT = {};
function buildTimes() {
  TT = {
    signOff: K.salidas1 + 0.06,                                   // 1: la señal de SALIDA se apaga
    col0: K.y2, colB: K.carrera2 + 0.25,                          // 2: los folios forman las torres
    trap: K.trampa3,                                               // 3: «tiene trampa»
    ghost: K.doble4,                                               // 4: «más del doble»
    gridUp: K.n4_5 - 0.12, portO1: K.n8_5 - 0.5, enter: K.n8_5, portC1: K.media6 + 0.2,     // 5: las 100; entran 80
    cut: K.ahora7 + 0.04, up: K.trabajan7 + 0.1,                   // 7: la fachada se abre; suben 34
    caps: K.trabajos8 - 0.05, gray: K.pedian8,                     // 8: a los demás se les cae el birrete
    river: K.cada9,                                                // 9: los nuevos
    three: K.tres10,                                               // 10: tres salidas
    aud: K.auditorias11, yr: K.n3_11, exam: K.examen11, est: K.estado11,   // 11
    ban: K.banco12, cert: K.certificado12,                        // 12
    hac: K.hacienda13, opo: K.oposicion13,                         // 13
    try0: K.ninguna14 + 0.1,                                       // 14: la llave no abre ninguna
    fly: K.esa15, keyIn: K.ade15 - 0.06, turn: K.llave15 - 0.3, openP: K.portal15 - 0.12, locks: K.muchos15 - 0.08,   // 15
    allOn: K.salidas16, lad: K.atajos16 - 0.06, ladX: K.ninguno16, // 16
    portC2: K.no17 + 0.3, facIn: K.salidas17 + 0.1, papUp: K.auditoria17 + 0.3,   // 17 y vuelta al principio
  };
  TT.tries = [0, 1, 2].map(j => TT.try0 + j * 0.6);
  // cuándo se abre cada despacho con puesto: al llegar su primera figurita
  TT.doorOpen = {};
  for (const i of UP) { const f = FIG[i], key = doorKey(f.slot.k, f.slot.j), ta = f.up.t0 + f.up.dur * 0.78; TT.doorOpen[key] = Math.min(TT.doorOpen[key] ?? 1e9, ta - 0.25); }
  // orden de los candados de «muchos despachos» (los cerrados que no son los tres de arriba)
  TT.lockOrder = [];
  for (let k = 1; k < NLV; k++) for (let j = 0; j < 3; j++) { const key = doorKey(k, j); if (OPEN.some(([a, b]) => a === k && b === j) || SPECIAL.some(([a, b]) => a === k && b === j)) continue; TT.lockOrder.push(key); }
  TT.lockOrder.sort((a, b) => hash(a * 1.7) - hash(b * 1.7));
}
// parpadeo de un tubo al encenderse (k sube a 1 con dos fallos) o al apagarse
function flick(t, t0, d = 0.32) { const u = (t - t0) / d; if (u <= 0) return 0; if (u >= 1) return 1; return (u > 0.1 && u < 0.22) || (u > 0.38 && u < 0.5) || u > 0.72 ? 1 : 0.12; }

// ---------------------------------------------------------------- folios: lluvia (principio y final), torres y vuelta al cielo
const _o = new THREE.Object3D(), _pp = new THREE.Vector3(), _pq = new THREE.Vector3(), _e2 = new THREE.Euler();
function rainPos(i, tau, out, eul) {           // false si aún no ha empezado a caer (está fuera de cuadro, arriba)
  const R = S.rain[i]; if (tau < R.s) return false;
  const u = Math.min(1, (tau - R.s) / R.fall), w = 1 - u;
  out.set(lerp(R.x0, R.xl, u) + Math.sin(u * Math.PI * 2 * R.sw) * 0.05 * w, lerp(1.25, 0.0035 + (i % 9) * 0.0024, u * (0.75 + 0.25 * u)), lerp(R.z0, R.zl, u) + Math.cos(u * Math.PI * 2 * R.sw) * 0.04 * w);
  eul.set(R.rx * w + Math.sin(u * 9 + i) * 0.4 * w, R.ry + u * 1.2, R.rz * w + Math.cos(u * 7 + i) * 0.4 * w); return true;
}
function colPos(c, k, out, eul) { const C = COLS[c]; out.set(C.x + (hash(k * 3.1 + c) - 0.5) * 0.004, (k + 0.5) * PT, C.z + (hash(k * 5.3 + c) - 0.5) * 0.004); eul.set(0, (hash(k * 7.7 + c) - 0.5) * 0.12, 0); }
function papersAt(t) {
  const A = S.papA, n = COLS[0].n, hide = () => { _o.scale.setScalar(0.0001); };
  for (let i = 0; i < n; i++) {
    _o.scale.setScalar(1);
    const tf = TT.col0 + (i / n) * 1.45;
    if (t >= TT.papUp) { if (!rainPos(i, t - END, _pp, _e2)) hide(); _o.position.copy(_pp); _o.rotation.copy(_e2); }      // otra vez la lluvia (bucle): las torres ya no se ven
    else if (t >= tf) { const e = eio(clamp((t - tf) / 0.5)); rainPos(i, Math.min(t, tf + 0.5), _pq, _e2); colPos(0, i, _pp, _e2);
      _o.position.copy(_pq).lerp(_pp, e); _o.position.y += Math.sin(Math.PI * e) * 0.22; const R = S.rain[i]; _o.rotation.set(R.rx * (1 - e) * 0.3, lerp(R.ry, _e2.y, e), R.rz * (1 - e) * 0.3); }
    else { if (!rainPos(i, t, _pp, _e2)) hide(); _o.position.copy(_pp); _o.rotation.copy(_e2); }
    _o.updateMatrix(); A.setMatrixAt(i, _o.matrix);
  }
  A.instanceMatrix.needsUpdate = true;
  [[S.papB, 1], [S.papC, 2]].forEach(([P, c]) => {
    const m = COLS[c].n;
    for (let k = 0; k < m; k++) {
      const tb = TT.colB + (k / m) * 1.15 + c * 0.08;
      colPos(c, k, _pp, _e2); _o.rotation.copy(_e2); _o.scale.setScalar(1);
      if (t < tb || t >= TT.papUp) _o.scale.setScalar(0.0001);
      else if (t < tb + 0.14) _pp.y += (1 - (t - tb) / 0.14) * 0.06;
      _o.position.copy(_pp); _o.updateMatrix(); P.setMatrixAt(k, _o.matrix);
    }
    P.instanceMatrix.needsUpdate = true;
  });
  // la torre fantasma: el doble de la segunda… y la de ADE sigue siendo más alta
  const gk = cwin(t, TT.ghost - 0.05, K.n4_5 - 0.1, 0.3, 0.3), h2 = COLS[1].n * PT; S.ghost.visible = gk > 0.01;
  if (S.ghost.visible) { const e = eo(clamp((t - TT.ghost + 0.05) / 0.55)); S.ghost.position.y = lerp(h2 * 0.5, h2 * 1.5, e) + 0.002; S.ghost.material.opacity = 0.32 * gk; S.ghost.userData.edges.material.opacity = 0.95 * gk; }
}

// ---------------------------------------------------------------- figuritas
const _fp = new THREE.Vector3(), _col = new THREE.Color();
function crowdAt(t) {
  const G = S.grid, Cp = S.caps;
  for (let i = 0; i < 100; i++) {
    const f = FIG[i]; let sc = pops(t, TT.gridUp + hash(i * 2.9) * 0.4, 0.4);
    _fp.copy(f.gp); _col.copy(C_CER); let capFall = -1;
    if (f.stay) {
      _col.lerp(C_GREY, win(t, TT.enter + 0.5, 0.6) * 0.85);
      if (t >= f.absorb.t0) { const s = walk(f.absorb, t, _fp); sc *= 1 - clamp((s - 0.72) / 0.28); }
    } else {
      _col.lerp(C_LIT, win(t, TT.enter - 0.05 + hash(i) * 0.25, 0.25));
      walk(f.enter, t, _fp);
      if (f.up && t >= f.up.t0) { const s = walk(f.up, t, _fp); _col.lerp(C_GOLD, clamp((s - 0.7) / 0.3)); }
      else if (f.up) { /* aún en la planta baja */ }
      if (!f.up) { _col.lerp(C_GREY, win(t, TT.gray + hash(i * 5.1) * 0.35, 0.3)); capFall = TT.caps + hash(i * 3.7) * 0.7; }
    }
    if (sc < 0.002) _o.scale.setScalar(0.0001); else _o.scale.setScalar(sc);
    _o.position.copy(_fp); _o.rotation.set(0, 0, 0); _o.updateMatrix(); G.setMatrixAt(i, _o.matrix); G.setColorAt(i, _col);
    // birrete: en la cabeza; a los de la planta baja se les cae al suelo
    if (capFall > 0 && t > capFall) {
      const u = clamp((t - capFall) / 0.34), b = t > capFall + 0.34 ? Math.abs(Math.sin((t - capFall - 0.34) * 18)) * Math.exp(-(t - capFall - 0.34) * 9) * 0.006 : 0;
      const sd = hash(i * 9.3) > 0.5 ? 1 : -1;
      _o.position.set(_fp.x + sd * 0.022 * u, _fp.y - 0.0585 * u * u + b, _fp.z + 0.014 * u); _o.rotation.set(0.25 * u, hash(i) * 2 * u, sd * 0.4 * u * (1 - u));
    }
    _o.updateMatrix(); Cp.setMatrixAt(i, _o.matrix);
  }
  G.instanceMatrix.needsUpdate = true; G.instanceColor.needsUpdate = true; Cp.instanceMatrix.needsUpdate = true;
  // los graduados nuevos
  const Rm = S.river, Rc = S.rcaps;
  for (let j = 0; j < NR; j++) {
    const R = RIV[j]; let sc = 1;
    if (t < R.enter.t0 || t < TT.river - 0.5) sc = 0;
    else { walk(R.enter, t, _fp, 0.004); if (t >= R.absorb.t0) { const s = walk(R.absorb, t, _fp, 0.004); sc = 1 - clamp((s - 0.7) / 0.3); } }
    _o.position.copy(_fp); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, sc)); _o.updateMatrix(); Rm.setMatrixAt(j, _o.matrix); Rc.setMatrixAt(j, _o.matrix);
  }
  Rm.instanceMatrix.needsUpdate = true; Rc.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- edificio: fachada, portal, despachos, señales, candados, llave y escalera
const _kp = new THREE.Vector3(), _kq = new THREE.Vector3(), _kd = new THREE.Vector3(), _kc = new THREE.Vector3(), _ky = new THREE.Vector3();
function lockWorld(key, out) { const d = S.doors[key]; return d.userData.lk.getWorldPosition(out); }
function buildingAt(t) {
  // fachada: se va de arriba abajo con «Ahora, lo feo» (barrido de luz) y vuelve de abajo arriba al final
  const nF = S.facade.length;
  S.facade.forEach((f, idx) => {
    const lvl = idx < NLV - 1 ? idx + 1 : 0;
    const a = 1 - win(t, TT.cut + (NLV - 1 - lvl) * 0.13, 0.3) + win(t, TT.facIn + lvl * 0.1, 0.35);
    f.material.opacity = clamp(a); f.visible = a > 0.01; f.material.depthWrite = a > 0.6;
  });
  { const u = (t - TT.cut) / 0.95; S.scan.visible = u > 0 && u < 1; if (S.scan.visible) { S.scan.position.y = lerp(TOPY + 0.02, 0.01, u); S.scan.material.opacity = Math.sin(u * Math.PI); } }
  // portal: se abre para los 80, se cierra; la llave lo vuelve a abrir; se cierra al final
  const op = Math.max(eio(win(t, TT.portO1, 0.45)) * (1 - eio(win(t, TT.portC1, 0.5))), eio(win(t, TT.openP, 0.55)) * (1 - eio(win(t, TT.portC2, 0.55))));
  S.leaves[0].rotation.y = op * 1.35; S.leaves[1].rotation.y = -op * 1.35;
  S.inGlow.material.color.setRGB(1, 0.86, 0.66).multiplyScalar(0.1 + op * 0.55);
  const fl = win(t, TT.openP + 0.05, 0.25) * (1 - win(t, TT.openP + 0.6, 1.6) * 0.65) * (1 - win(t, TT.portC2 - 0.2, 0.5)); S.flood.visible = fl > 0.01; S.flood.material.opacity = fl;
  // señal grande del portal: encendida, se apaga con «salidas»; se enciende con «Salidas tiene»
  signOn(S.bigSign, t < TT.allOn ? 1 - flick(t, TT.signOff, 0.4) : flick(t, TT.allOn, 0.35));
  // despachos
  for (const key in S.doors) {
    const d = S.doors[key], U = d.userData, sp = SPECIAL.findIndex(([a, b]) => a === U.k && b === U.j), ot = TT.doorOpen[key];
    const o = ot ? eio(win(t, ot, 0.4)) : 0;
    U.pv.rotation.y = -o * 1.25; U.glow.material.color.setRGB(1, 0.77, 0.42).multiplyScalar(0.18 + o * 1.9);
    let on = t >= TT.allOn ? flick(t, TT.allOn + 0.04 + hash(key * 1.3) * 0.5, 0.3) : 0;
    if (sp >= 0 && t >= TT.three) on = Math.max(on, flick(t, TT.three + sp * 0.14, 0.3));
    signOn(U.sg, on);
    // candados: los tres de arriba, con su frase; los demás en cascada con «muchos despachos»
    let lt = null; if (sp === 0) lt = TT.aud; if (sp === 1) lt = TT.ban; if (sp === 2) lt = TT.hac;
    const li = TT.lockOrder.indexOf(+key); if (li >= 0) lt = TT.locks + li * 0.2;
    const lk = U.lk; lk.visible = lt !== null && t > lt && t < TT.facIn + 2;
    if (lk.visible) { const u = clamp((t - lt) / 0.3); lk.scale.setScalar(U.lk.userData.s0 * Math.max(0.0001, backOut(u))); lk.userData.sh.position.y = 0.014 * (1 - eio(clamp((t - lt - 0.18) / 0.12))); lk.position.y = DH * 0.47 + 0.03 * (1 - eo(u)); }
    // destello rojo cuando la llave «ADE» no gira
    if (sp >= 0) { const tr = TT.tries[sp], fx = t > tr + 0.28 ? Math.exp(-(t - tr - 0.28) * 7) : 0; lk.children[0].material.emissive?.setRGB(fx * 0.9, 0, 0); }
  }
  // auditoría: el calendario pasa tres hojas (año 1, 2, 3) y aparece el examen; banca: el certificado entra en la cerradura; Hacienda: el temario crece
  S.cal.visible = t > TT.aud + 0.25 && t < TT.facIn; if (S.cal.visible) { S.cal.scale.setScalar(Math.max(0.0001, backOut(clamp((t - TT.aud - 0.25) / 0.3)))); S.cal.userData.pages.forEach((pv, k) => { const tf = TT.yr + 0.1 + k * 0.28; pv.rotation.x = k < 2 ? -eio(clamp((t - tf) / 0.22)) * 2.6 : 0; pv.visible = pv.rotation.x > -2.55; }); }
  S.exam.visible = t > TT.exam - 0.05 && t < TT.facIn; if (S.exam.visible) { const u = clamp((t - TT.exam + 0.05) / 0.35); S.exam.scale.setScalar(Math.max(0.0001, backOut(u))); S.exam.rotation.z = (1 - eo(u)) * 0.8; }
  S.cert.visible = t > TT.cert - 0.1 && t < TT.facIn; if (S.cert.visible) { const u = eio(clamp((t - TT.cert + 0.1) / 0.6)), lk = S.doors[doorKey(5, 1)].userData.lk; S.cert.position.set(lerp(-0.06, lk.position.x - 0.005, u), lerp(0.1, lk.position.y - 0.035, u), lerp(0.08, 0.03, u)); S.cert.rotation.set(0, lerp(0.6, 0, u), lerp(-0.4, 0, u)); S.cert.scale.setScalar(lerp(0.9, 0.55, u)); }
  S.books.forEach((b, k) => { const tb = TT.opo - 0.05 + k * 0.09; b.visible = t > tb && t < TT.facIn; if (b.visible) { const u = clamp((t - tb) / 0.2); b.rotation.set(0, (hash(k * 3.3) - 0.5) * 0.25, 0); b.position.set(-0.088 + (hash(k * 1.9) - 0.5) * 0.008, k * 0.0122 + (1 - eo(u)) * 0.05, 0.045); } });
  keyAt(t);
  // escalera «ATAJO»: aparece apoyada en la fachada, se tacha y se cae
  const L = S.lad; L.visible = t > TT.lad && t < TT.ladX + 0.75;
  if (L.visible) { const pu = backOut(clamp((t - TT.lad) / 0.28)), fu = clamp((t - TT.ladX - 0.08) / 0.6); L.scale.setScalar(Math.max(0.0001, pu)); L.position.set(0.3, -fu * fu * 0.25, 0.6 + fu * 0.15); L.rotation.set(-0.29 + fu * fu * 1.7, 0, fu * 0.25); }
}
// la llave: prueba las tres cerraduras de arriba (no gira), baja creciendo hasta el portal, entra, gira y se deshace en luz
const _kh = new THREE.Vector3(), _kx = new THREE.Vector3(), _kyy = new THREE.Vector3();
const AX_T = new THREE.Vector3(-0.35, -0.18, -1).normalize(), AX_P = new THREE.Vector3(0, 0, -1), TIP = 0.168, S_IN = 1.15;
const _kf1 = new THREE.Vector3(), _kf2 = new THREE.Vector3();
function keyFlight(t, out) {          // dónde va la llave mientras baja desde Hacienda hasta el portal (también la sigue la cámara)
  const u = eio(clamp((t - TT.fly) / (TT.keyIn - TT.fly)));
  lockWorld(doorKey(5, 2), _kf1); _kf1.y += 0.0024; _kf1.z += 0.0063; _kf1.addScaledVector(AX_T, -(TIP * 0.3 + 0.03));
  _kf2.set(0, 0.102, BZ1 + 0.0205).addScaledVector(AX_P, -(TIP * S_IN + 0.1));
  out.copy(_kf1).lerp(_kf2, u); out.x += Math.sin(Math.PI * u) * 0.22; out.z += Math.sin(Math.PI * u) * 0.3; return out;
}
function keyAt(t) {
  const K0 = S.key, vis = t > TT.try0 - 0.3 && t < TT.openP + 0.45; K0.visible = vis; S.keyGlow.visible = false; if (!vis) return;
  _kh.set(0, 0.102, BZ1 + 0.0205);                                  // ojo de la cerradura del portal (puerta cerrada)
  // delante de la cerradura del despacho j de arriba: la punta toca el ojo; back = cuánto se separa
  const front = (j, s, ax, back, out) => { lockWorld(doorKey(5, j), out); out.y += 0.0024; out.z += 0.0063; return out.addScaledVector(ax, -(TIP * s + back)); };
  let s = 0.3, roll = 0; const pos = _kp, axis = _kd;
  if (t < TT.fly) {
    axis.copy(AX_T);
    let j = 0; for (let q = 0; q < 3; q++) if (t >= TT.tries[q] - 0.05) j = q;
    const tr = TT.tries[j];
    if (t < tr) { front(0, s, axis, 0.05, pos); pos.y += 0.05 * (1 - eo(clamp((t - TT.try0 + 0.3) / 0.3))); }
    else if (t < tr + 0.14) front(j, s, axis, 0.035 * (1 - eio((t - tr) / 0.14)), pos);
    else if (t < tr + 0.42) { front(j, s, axis, 0, pos); roll = Math.sin((t - tr - 0.14) * 38) * 0.25 * (1 - (t - tr - 0.14) / 0.28); }
    else if (j < 2 && t < tr + 0.6) { const u = eio((t - tr - 0.42) / 0.18); front(j, s, axis, 0.03, pos); front(j + 1, s, axis, 0.03, _kq); pos.lerp(_kq, u); pos.y += Math.sin(Math.PI * u) * 0.025; }
    else front(j, s, axis, 0.03 * clamp((t - tr - 0.42) / 0.1), pos);
  } else if (t < TT.keyIn) {
    const u = eio(clamp((t - TT.fly) / (TT.keyIn - TT.fly)));
    s = lerp(0.3, S_IN, u); axis.copy(AX_T).lerp(AX_P, u).normalize(); keyFlight(t, pos);
  } else {
    s = S_IN; axis.copy(AX_P);
    const u = eio(clamp((t - TT.keyIn) / 0.3)); pos.copy(_kh).addScaledVector(AX_P, -(TIP * S_IN - 0.022 + 0.1 * (1 - u)));
    roll = eio(clamp((t - TT.turn) / 0.28)) * Math.PI / 2;
    const gone = clamp((t - TT.openP - 0.1) / 0.3); s *= 1 - gone * gone;
    S.keyGlow.visible = t > TT.turn; S.keyGlow.position.copy(pos).addScaledVector(AX_P, -0.08); S.keyGlow.quaternion.copy(cam.quaternion);
    S.keyGlow.material.opacity = win(t, TT.turn + 0.12, 0.2) * (0.55 + gone * 1.3) * (1 - clamp((t - TT.openP - 0.38) / 0.08)); S.keyGlow.scale.setScalar(0.5 + gone * 1.5);
  }
  K0.position.copy(pos); K0.scale.setScalar(Math.max(0.0001, s));
  // la punta (−z de la llave) apunta a la cerradura; el ojo de la llave se gira hacia la cámara (más el giro de «no gira» / «gira»)
  _kq.copy(pos).sub(axis); K0.up.set(0, 1, 0); K0.lookAt(_kq); K0.updateMatrixWorld();
  _kc.copy(cam.position).sub(pos).normalize(); _ky.setFromMatrixColumn(K0.matrixWorld, 2).normalize(); _kc.addScaledVector(_ky, -_kc.dot(_ky));
  _kx.setFromMatrixColumn(K0.matrixWorld, 0).normalize(); _kyy.setFromMatrixColumn(K0.matrixWorld, 1).normalize();
  K0.rotateZ(Math.atan2(_kc.dot(_kyy), _kc.dot(_kx)) + roll);
}
function sceneAt(t) { papersAt(t); crowdAt(t); buildingAt(t); }
