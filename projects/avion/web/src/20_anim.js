// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const _o = new THREE.Object3D(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _e3 = new THREE.Euler(), _q3 = new THREE.Quaternion();
let TT = {};
function buildTimes() {
  TT = {
    crack: K.mal1, nasa: K.nasa2, n575: K.n575_2,                         // 1-2: la equis en la pizarra, la NASA, 575 t
    emerge: K.contaron3, curva: K.curva3, split: K.arriba3, meet: K.vez3, // 3: el ala sale de la pizarra; el «mito»: llegan a la vez
    cita: K.cita4, tunnel: K.tunel4, pulse: K.tunel4 + 0.3, first: K.antes4,   // 4: el túnel de viento; el de arriba llega antes
    acro: K.curva5 - 0.5, inv: K.boca5,                                   // 5: boca abajo
    tilt: K.inclinada6 - 0.2, push: K.empuja6,                            // 6: el ala se inclina y empuja el aire hacia abajo
    blocks: K.cientos7,                                                   // 7: cientos de toneladas de aire
    arrDn: K.abajo8, arrUp: K.empuja8b,                                   // 8: acción y reacción
    press: K.arriba9, lift: K.levanta9,                                   // 9: la presión; levanta el avión
    wake: K.respuesta10, poll: K.ventanilla11,                            // 10-11
    back: K.ventanilla11 + 0.3,                                           // el ala vuelve a la pizarra (bucle)
  };
  TT.fly0 = TT.emerge + 0.3; TT.fly1 = TT.split - 0.55;                   // el ala vuela de la pizarra a su sitio
}
// ---------------------------------------------------------------- el avión gigante: un único pasillo en el cielo, detrás del aula (teleobjetivo: se ve enorme
// encima de la pizarra). Vuela despacio hacia la izquierda; visible al principio (y al final, en bucle), con los bloques de aire y con la estela.
const BIG = { v: 2.5, psi: 0.30, x0: -5, y0: 50, z0: -128 };
function bigPose(t) {
  let u = null;
  if (t < 12.6) u = t; else if ((t >= 32.4 && t < 36.6) || t >= 43.2) u = t - END;
  if (u === null) return { on: false, x: 0, y: -80, z: 0, lift: 0 };
  const c = Math.cos(BIG.psi), s = Math.sin(BIG.psi), d = BIG.v * u;
  const lift = t > 40 ? 5 * eio(clamp((t - TT.lift) / 1.4)) * (1 - eio(clamp((t - 52.4) / 3.2))) : 0;
  return { on: true, x: BIG.x0 - c * d, y: BIG.y0 + lift, z: BIG.z0 + s * d, lift };
}
// un punto del avión (coordenadas propias: morro en -x, alas en ±z) en el mundo
function bigLocal(P, lx, ly, lz, out) { const c = Math.cos(BIG.psi), s = Math.sin(BIG.psi); return out.set(P.x + lx * c + lz * s, P.y + ly, P.z - lx * s + lz * c); }
// la avioneta: cruza por encima del aula, se da la vuelta y sigue boca abajo
function acroPose(t) { const k = t - TT.acro; return { k, x: 9 - 4.2 * k, y: 14 + Math.sin(k * 1.1) * 0.4, z: -22, roll: Math.PI * eio(clamp((t - TT.inv + 0.85) / 0.75)) }; }
function skyAt(t) {
  const P = bigPose(t), B = S.big; B.visible = P.on; B.position.set(P.x, P.y, P.z);
  _e3.set(Math.sin(2 * Math.PI * 4 * t / END) * 0.02, BIG.psi, Math.sin(2 * Math.PI * 3 * t / END) * 0.008 + (P.lift ? 0.02 * Math.sin(clamp((t - TT.lift) / 1.4) * Math.PI) : 0), 'YXZ'); B.quaternion.setFromEuler(_e3);
  // la avioneta y su humo de exhibición
  const A = acroPose(t); S.acro.visible = A.k > 0 && A.k < 4.4;
  if (S.acro.visible) { S.acro.position.set(A.x, A.y, A.z); S.acro.rotation.set(A.roll, 0, 0.05); S.prop.rotation.x = t * 40; }
  S.acroSmoke.visible = A.k > 0 && A.k < 4.6;
  if (S.acroSmoke.visible) { const N = 260;
    for (let i = 0; i < N; i++) { const age = i * 0.018, Q = acroPose(t - age); let s = 0;
      if (Q.k > 0.05) { s = Math.min(1, age * 6) * (1 - clamp((age - 3.2) / 1.4)) * (0.55 + age * 0.35); _o.position.set(Q.x + 3.7, Q.y + 0.05 - age * 0.25 + (hash(i * 3.1) - 0.5) * age * 0.3, Q.z + (hash(i * 5.3) - 0.5) * age * 0.3); }
      _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, s)); _o.updateMatrix(); S.acroSmoke.setMatrixAt(i, _o.matrix); }
    S.acroSmoke.instanceMatrix.needsUpdate = true; }
  // bloques de aire que el ala echa hacia abajo (cientos de toneladas por segundo)
  const bk = cwin(t, TT.blocks - 0.35, 36.4, 0.3, 0.3); S.blocks.visible = bk > 0.01 && P.on;
  if (S.blocks.visible) { const N = 140;
    for (let i = 0; i < N; i++) { const te = 32.0 + (i / N) * 4.4, u = t - te; let s = 0;
      if (u > 0 && u < 2.8) { const Q = bigPose(Math.max(32.45, te)), zs = (hash(i * 3.1) * 2 - 1) * 26, xs = lerp(9.5, 8, Math.abs(zs) / 28) + 3 + hash(i * 1.7) * 3;
        s = Math.min(1, u * 4) * (1 - clamp((u - 2.2) / 0.6)); bigLocal(Q, xs + u * 2.5, -4 - 6 * u - 4.5 * u * u, zs, _o.position); _o.rotation.set(u * 0.6 * hash(i), u * 0.5 + hash(i * 2.2), 0); }
      _o.scale.setScalar(Math.max(0.0001, s * bk)); _o.updateMatrix(); S.blocks.setMatrixAt(i, _o.matrix); }
    S.blocks.instanceMatrix.needsUpdate = true; }
  // la estela: el aire que el ala va dejando hacia abajo, todo el rato
  const wk = cwin(t, TT.wake - 0.5, END - 2.6, 0.6, 1.0); S.wake.visible = wk > 0.01 && P.on;      // sigue cayendo «todo el rato» (también desde el aula) y se apaga antes del bucle
  if (S.wake.visible) { const N = 1400;
    for (let i = 0; i < N; i++) { const te = 44.5 + (i / N) * 10.5, u = t - te; let s = 0;
      if (u > 0 && u < 4.0) { const Q = bigPose(te), zs = (hash(i * 7.3) * 2 - 1) * 27, xs = lerp(9.5, 8, Math.abs(zs) / 28) + 1.5 + hash(i * 1.3) * 2;
        s = (1 - clamp((u - 3.0) / 1.0)) * Math.min(1, u * 4); bigLocal(Q, xs + u * 1.5, -2.5 - 7 * u - 2.2 * u * u - hash(i * 2.9) * 1.5, zs, _o.position); }
      _o.rotation.set(0, 0, 0); _o.scale.set(s * wk * 0.8, s * wk * 4.5, s * wk * 0.8); _o.updateMatrix(); S.wake.setMatrixAt(i, _o.matrix); }
    S.wake.instanceMatrix.needsUpdate = true; }
  // presión alrededor del avión: azul encima de las alas, rojo debajo
  const pk = cwin(t, TT.lift - 0.3, K.flota10, 0.4, 0.6) * (P.on ? 1 : 0);
  S.lowP.visible = S.highP.visible = pk > 0.01;
  if (pk > 0.01) { bigLocal(P, 3, 7, 0, S.lowP.position); S.lowP.scale.set(80, 30, 1); S.lowP.material.opacity = pk * 0.95;
    bigLocal(P, 3, -10, 0, S.highP.position); S.highP.scale.set(80, 30, 1); S.highP.material.opacity = pk * 0.8; }
  // y la diferencia lo levanta: tres flechas que empujan desde abajo
  const lk = cwin(t, TT.lift - 0.1, K.flota10 - 0.2, 0.45, 0.4) * (P.on ? 1 : 0);
  S.liftArrows.forEach((a, i) => { a.visible = lk > 0.01; if (!a.visible) return; const z = (i - 1) * 17, x = i === 1 ? 2 : 8;
    bigLocal(P, x, -27 + 3 * Math.sin(t * 3 + i), z, a.position); a.userData.setLen(14 * backOut(clamp((lk - i * 0.12) / 0.6))); a.quaternion.identity(); });
}
// ---------------------------------------------------------------- el aula: la equis, el reloj, el dibujo de tiza (se despega con el ala y vuelve al final)
function drawAt(t) { return 1 - win(t, TT.emerge + 0.15, 0.7) + win(t, TT.back + 0.2, 1.0); }
function roomAt(t) {
  const ck = cwin(t, TT.crack, TT.emerge + 0.3, 0.12, 0.35); M.cross.opacity = ck * 0.95; S.cross.scale.setScalar(0.85 + 0.15 * backOut(clamp((t - TT.crack) / 0.3)));
  S.clockM.rotation.z = -Math.PI * 2 * 4 * t / END; S.clockH.rotation.z = -Math.PI * 2 * t / END;
  const dk = drawAt(t); M.boardDraw.opacity = dk; S.boardDraw.visible = dk > 0.005;
}
// ---------------------------------------------------------------- el túnel: el ala sale de la pizarra, el «mito», el humo de verdad, la inclinación
function alphaAt(t) { return lerp(S.AL0, S.AL1, alphaMix(t)); }
function alphaMix(t) { return eio(clamp((t - TT.tilt) / 0.9)) * (1 - eio(clamp((t - TT.back) / 1.2))); }
// dónde está el ala: 0 en la pizarra (plana, como el dibujo), 1 en su sitio
function foilK(t) { return eio(clamp((t - TT.fly0) / (TT.fly1 - TT.fly0))) * (1 - eio(clamp((t - TT.back) / 1.5))); }
function tunnelAt(t) {
  const al = alphaAt(t), mv = alphaMix(t), e = foilK(t);
  // el ala: aparece rellenando el dibujo de tiza, se despega y vuela a su sitio (girando un poco para que se vea que es de verdad)
  const on = t > TT.emerge && t < TT.back + 1.55; S.foil.visible = on;
  if (on) { const pop = backOut(clamp((t - TT.emerge) / 0.3)) * (t < TT.back ? 1 : 1 - clamp((t - TT.back - 1.35) / 0.2)), k = lerp(BD.k, 1, e);
    S.foil.position.set(lerp(BD.x0, TUN.x, e), lerp(BD.y0, TUN.y, e) + 0.35 * Math.sin(Math.PI * e) * (t < TT.back ? 1 : 0), lerp(BOARD.z + 0.02, TUN.z, e));
    S.foil.scale.set(k * lerp(0.9, 1, pop), k * lerp(0.9, 1, pop), Math.max(0.015, e) * Math.max(0.001, pop));
    S.foil.rotation.set(0, (t < TT.back ? 0.55 : -0.4) * Math.sin(Math.PI * e), -al * e); }
  // «curva por arriba»: la cara de arriba se ilumina de borde a borde
  const ck = cwin(t, TT.curva - 0.1, TT.split + 0.4, 0.1, 0.3); S.upLine.visible = ck > 0.01 && e > 0.98;
  if (S.upLine.visible) { S.upLine.geometry.instanceCount = Math.max(1, Math.round((S.upPts.length - 1) * clamp((t - TT.curva + 0.1) / 0.45))); S.upLineMat.opacity = ck; }
  // la caja de cristal (con fondo negro, como los túneles de humo), el ventilador y las líneas de corriente
  const tk = cwin(t, TT.tunnel, TT.back + 0.4, 0.45, 0.6); S.tunnel.children.forEach(c => { if (c !== S.foil && c !== S.upLine) c.visible = tk > 0.01; });
  M.tunBack.opacity = tk; S.tunBox.scale.set(1, lerp(0.6, 1, eo(tk)), lerp(0.4, 1, eo(tk)));
  S.fanBlades.rotation.x = t * 25; S.slMat.opacity = tk * 0.45;
  if (tk > 0.01) S.slines.forEach((l, i) => { const A = S.lines0[i], B = S.lines1[i], arr = new Float32Array(A.length * 3);
    for (let k = 0; k < A.length; k++) { arr[k * 3] = lerp(A[k].x, B[k].x, mv); arr[k * 3 + 1] = lerp(A[k].y, B[k].y, mv); arr[k * 3 + 2] = A[k].z; } l.geometry.setPositions(arr); });
  // los pulsos de humo: con 3° mientras se habla del túnel; con 9° cuando el ala empuja el aire hacia abajo
  const puff = (mesh, list, al2, k, tau0) => { mesh.visible = k > 0.01 && tk > 0.01; if (!mesh.visible) return;
    list.forEach((p, i) => { const tau = tau0 - p.k * 1.15, s = tau > 0 ? k : 0; zWorld(pathAt(p.path, tau, 0.03), al2, _p1);
      const inside = _p1.x < TUN.x + 0.2 + TUN.L / 2 - 0.03; _o.position.copy(_p1); _o.position.z += TUN.D * 0.3; _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, inside ? s : 0)); _o.updateMatrix(); mesh.setMatrixAt(i, _o.matrix); });
    mesh.instanceMatrix.needsUpdate = true; };
  puff(S.smoke, S.pulses, S.AL0, cwin(t, TT.pulse - 0.05, TT.acro + 0.3, 0.1, 0.4), (t - TT.pulse) * 3.2);
  puff(S.smoke1, S.pulses1, S.AL1, cwin(t, TT.tilt + 0.6, TT.blocks + 0.2, 0.15, 0.3), 2.5 + (t - TT.tilt - 0.6) * 4.2);
  // las dos bolitas: el «mito» (pegadas al ala, llegan a la vez) y luego el humo de verdad (la de arriba llega antes)
  const bv = (t > TT.split - 0.5 && t < TT.acro + 0.3); S.ballA.visible = S.ballB.visible = bv;
  if (bv) {
    if (t < TT.tunnel + 0.25) {
      const f = eio(clamp((t - TT.split) / (TT.meet - TT.split)));
      const pa = surfAt(S.upPath, f, 0.13), pb = surfAt(S.dnPath, f, -0.13);
      zWorld(pa, al, S.ballA.position).add(v3(0, 0, TUN.D * 0.5)); zWorld(pb, al, S.ballB.position).add(v3(0, 0, TUN.D * 0.5));
      const sc = backOut(clamp((t - TT.split + 0.5) / 0.4)) * (1 - clamp((t - TT.tunnel + 0.05) / 0.25)); S.ballA.scale.setScalar(Math.max(0.001, sc)); S.ballB.scale.setScalar(Math.max(0.001, sc));
    } else {
      const tau = (t - TT.pulse) * 3.2; zWorld(pathAt(S.pA, tau, 0.03), S.AL0, S.ballA.position).add(v3(0, 0, TUN.D * 0.5)); zWorld(pathAt(S.pB, tau, 0.03), S.AL0, S.ballB.position).add(v3(0, 0, TUN.D * 0.5));
      const sc = 1.15 * backOut(clamp((t - TT.tunnel - 0.25) / 0.35)), end = TUN.x + 0.2 + TUN.L / 2 - 0.05;
      S.ballA.scale.setScalar(Math.max(0.001, S.ballA.position.x < end ? sc : 0)); S.ballB.scale.setScalar(Math.max(0.001, S.ballB.position.x < end ? sc : 0));
    }
  }
  // la meta (el borde de salida): la «cita» del mito y la meta de la carrera de verdad; los rastros de las bolitas
  const fk = cwin(t, TT.split + 0.3, TT.acro + 0.2, 0.3, 0.3); S.finish.visible = fk > 0.01 && e > 0.98; S.finMat.opacity = fk * 0.85;
  const rk = cwin(t, TT.pulse, TT.acro + 0.2, 0.2, 0.3); S.trailA.visible = S.trailB.visible = rk > 0.01;
  if (rk > 0.01) { const tau = (t - TT.pulse) * 3.2; for (const L of [S.trailA, S.trailB]) { L.geometry.instanceCount = Math.max(1, Math.min(L.userData.n - 1, Math.round(tau / 0.03))); L.userData.m.opacity = rk * 0.8; } }
  // flechas: el ala empuja el aire hacia abajo; el aire empuja el ala hacia arriba
  const dk = cwin(t, TT.arrDn, TT.press + 0.2, 0.35, 0.3), uk = cwin(t, TT.arrUp, TT.press + 0.2, 0.35, 0.3);
  S.arrDn.visible = dk > 0.01 && tk > 0.01; S.arrUp.visible = uk > 0.01 && tk > 0.01;
  S.arrDn.userData.setLen(0.75 * backOut(dk)); S.arrUp.userData.setLen(0.75 * backOut(uk));
  // presión (con el ala inclinada)
  S.press.material.opacity = cwin(t, TT.press - 0.1, TT.lift - 0.3, 0.45, 0.4) * 0.95; S.press.visible = S.press.material.opacity > 0.01 && tk > 0.01;
  S.press.rotation.z = 0;
}
function pathAt(path, tau, dt) { if (tau <= 0) return path[0]; const f = tau / dt, i = Math.min(path.length - 2, Math.floor(f)), u = Math.min(1, f - i); return { x: lerp(path[i].x, path[i + 1].x, u), y: lerp(path[i].y, path[i + 1].y, u) }; }
function surfAt(path, f, dy) { const i = Math.min(path.length - 2, Math.floor(f * (path.length - 1))), u = f * (path.length - 1) - i; return { x: lerp(path[i].x, path[i + 1].x, u), y: lerp(path[i].y, path[i + 1].y, u) + dy }; }
function sceneAt(t) { skyAt(t); roomAt(t); tunnelAt(t); }
