// ---------------------------------------------------------------- tiempos y animación (todo depende solo del instante t)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const backOut = x => { x = clamp(x); return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2); };
const fract = x => x - Math.floor(x);
const _o = new THREE.Object3D(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
let TT = {};
function buildTimes() {
  TT = {
    crack: K.mal1, nasa: K.nasa2, n575: K.n575_2,                         // 1-2: la equis en la pizarra, la NASA, 575 t
    emerge: K.contaron3, split: K.arriba3, meet: K.vez3,                  // 3: el ala sale de la pizarra; el «mito»: llegan a la vez
    cita: K.cita4, tunnel: K.tunel4, pulse: K.tunel4 + 0.3, first: K.antes4,   // 4: el túnel de viento; el de arriba llega antes
    acro: K.curva5 - 0.6, inv: K.boca5,                                   // 5: boca abajo
    tilt: K.inclinada6 - 0.2, push: K.empuja6,                            // 6: el ala se inclina y empuja el aire hacia abajo
    blocks: K.cientos7,                                                   // 7: cientos de toneladas de aire
    arrDn: K.abajo8, arrUp: K.empuja8b,                                   // 8: acción y reacción
    press: K.arriba9, lift: K.levanta9,                                   // 9: la presión; levanta el avión
    wake: K.respuesta10, poll: K.ventanilla11,                            // 10-11
    back: K.ventanilla11 + 0.3,                                           // el ala vuelve a la pizarra (bucle)
  };
}
// ---------------------------------------------------------------- el avión gigante: tres pasadas (aula, bloques de aire, presión y estela) y vuelta al principio
function bigPose(t) {
  if (t < 14) return { on: true, x: 4 - 1.2 * t, y: 11, z: -14 };
  if (t >= END - 2.4) return { on: true, x: 4 - 1.2 * (t - END), y: 11, z: -14 };
  if (t >= 32.8 && t < 36.4) return { on: true, x: 12 - 3.2 * (t - 32.8), y: 24, z: -34 };
  if (t >= 42.9 && t < 52.4) return { on: true, x: 14 - 3.2 * (t - 42.9), y: 24 + 1.6 * eio(clamp((t - TT.lift) / 1.3)), z: -34 };
  return { on: false, x: 0, y: -50, z: 0 };
}
function skyAt(t) {
  const P = bigPose(t), B = S.big; B.visible = P.on; B.position.set(P.x, P.y, P.z); B.rotation.set(Math.sin(t * 0.5) * 0.025, 0, Math.sin(t * 0.37) * 0.01);
  // la avioneta: entra, gira hasta quedar boca abajo y cruza así
  const A = S.acro, ak = (t - TT.acro); A.visible = ak > 0 && ak < 3.8;
  if (A.visible) { A.position.set(18 - 10 * ak, 8.5 + Math.sin(ak * 1.3) * 0.4, -8); A.rotation.set(Math.PI * eio(clamp((t - TT.inv + 0.9) / 0.8)), 0, 0.06); S.prop.rotation.x = t * 40; }
  // bloques de aire que caen bajo el avión (cientos de toneladas por segundo)
  const bk = cwin(t, TT.blocks - 0.2, 36.3, 0.3, 0.3); S.blocks.visible = bk > 0.01 && P.on;
  if (S.blocks.visible) { const N = 90;
    for (let i = 0; i < N; i++) { const ts = 32.8 + (i / N) * 3.4, u = t - ts; let s = 0;
      if (u > 0 && u < 2.4) { const Q = bigPose(ts); s = 1 - clamp((u - 1.9) / 0.5); _o.position.set(Q.x - 6 + (hash(i * 3.1) - 0.5) * 16, Q.y - 3 - 7 * u - 3 * u * u, Q.z + (hash(i * 5.7) - 0.5) * 46); _o.rotation.set(u * 2 * hash(i), u * 1.5, 0); }
      _o.scale.setScalar(Math.max(0.0001, s * bk)); _o.updateMatrix(); S.blocks.setMatrixAt(i, _o.matrix); }
    S.blocks.instanceMatrix.needsUpdate = true; }
  // la estela: el aire que el ala va dejando hacia abajo, todo el rato
  const wk = cwin(t, TT.wake - 0.6, 52.2, 0.6, 0.3); S.wake.visible = wk > 0.01 && P.on;
  if (S.wake.visible) { const N = 900;
    for (let i = 0; i < N; i++) { const te = 42.9 + (i / N) * 9.5, u = t - te; let s = 0;
      if (u > 0 && u < 5.5) { const Q = bigPose(te), side = hash(i * 7.3) * 2 - 1; s = (1 - clamp((u - 4) / 1.5)) * Math.min(1, u * 3);
        _o.position.set(Q.x - 5 + 9.5 * Math.abs(side) + 6 + (hash(i * 1.3) - 0.5) * 2, Q.y - 2 - 5.5 * u - (hash(i * 2.9)) * 2, Q.z + side * 27 + side * u * 0.8); }
      _o.rotation.set(0, 0, 0); _o.scale.set(s * wk, s * wk * 3.2, s * wk); _o.updateMatrix(); S.wake.setMatrixAt(i, _o.matrix); }
    S.wake.instanceMatrix.needsUpdate = true; }
  // presión alrededor del avión: azul encima de las alas, rojo debajo
  const pk = cwin(t, K.diferencia9 - 0.2, TT.wake + 0.8, 0.4, 0.5) * (P.on ? 1 : 0);
  S.lowP.visible = S.highP.visible = pk > 0.01;
  if (pk > 0.01) { S.lowP.position.set(P.x + 2, P.y + 1.8, P.z); S.lowP.scale.set(30, 64, 1); S.lowP.material.opacity = pk * 0.55;
    S.highP.position.set(P.x + 2, P.y - 4.8, P.z); S.highP.scale.set(30, 64, 1); S.highP.material.opacity = pk * 0.55; }
}
// ---------------------------------------------------------------- el aula: la equis, el reloj
function roomAt(t) {
  const ck = cwin(t, TT.crack, TT.emerge + 0.5, 0.15, 0.4); M.cross.opacity = ck * 0.95; S.cross.scale.setScalar(0.85 + 0.15 * backOut(clamp((t - TT.crack) / 0.3)));
  S.clockM.rotation.z = -Math.PI * 2 * 4 * t / END; S.clockH.rotation.z = -Math.PI * 2 * t / END;
}
// ---------------------------------------------------------------- el túnel: el ala sale de la pizarra, el «mito», el humo de verdad, la inclinación
function alphaAt(t) { return lerp(S.AL0, S.AL1, eio(clamp((t - TT.tilt) / 0.9)) * (1 - eio(clamp((t - TT.back) / 1.2)))); }
function tunnelAt(t) {
  const al = alphaAt(t), mv = alphaMix(t);
  // el ala: de la pizarra (plana) a su sitio; al final vuelve a la pizarra
  const e = eio(clamp((t - TT.emerge) / 1.2)) * (1 - eio(clamp((t - TT.back) / 1.6))), on = t > TT.emerge - 0.05 && t < TT.back + 1.6;
  S.foil.visible = on; if (on) { S.foil.position.set(lerp(0.0, TUN.x, e), lerp(BOARD.y, TUN.y, e), lerp(BOARD.z + 0.04, TUN.z, e)); S.foil.scale.set(lerp(0.9, 1, e), lerp(0.9, 1, e), Math.max(0.02, e)); S.foil.rotation.z = -al; }
  // la caja de cristal, el ventilador y las líneas de corriente
  const tk = cwin(t, TT.tunnel, TT.back + 0.4, 0.5, 0.6); S.tunnel.children.forEach(c => { if (c !== S.foil) c.visible = tk > 0.01; });
  S.fanBlades.rotation.x = t * 25; S.slMat.opacity = tk * 0.5;
  if (tk > 0.01) S.slines.forEach((l, i) => { const A = S.lines0[i], B = S.lines1[i], arr = new Float32Array(A.length * 3);
    for (let k = 0; k < A.length; k++) { arr[k * 3] = lerp(A[k].x, B[k].x, mv); arr[k * 3 + 1] = lerp(A[k].y, B[k].y, mv); arr[k * 3 + 2] = A[k].z; } l.geometry.setPositions(arr); });
  // los pulsos de humo: solo mientras se habla del túnel
  const sk = cwin(t, TT.pulse - 0.05, TT.acro + 0.3, 0.1, 0.4); S.smoke.visible = sk > 0.01 && tk > 0.01;
  if (S.smoke.visible) { const tau0 = (t - TT.pulse) * 3.2;
    S.pulses.forEach((p, i) => { const tau = tau0 - p.k * 1.15, s = tau > 0 ? sk : 0; const z = pathAt(p.path, tau, 0.03); zWorld(z, S.AL0, _p1);
      const inside = _p1.x < TUN.x + 0.2 + TUN.L / 2 - 0.03; _o.position.copy(_p1); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, inside ? s : 0)); _o.updateMatrix(); S.smoke.setMatrixAt(i, _o.matrix); });
    S.smoke.instanceMatrix.needsUpdate = true; }
  // las dos bolitas: el «mito» (pegadas al ala, llegan a la vez) y luego el humo de verdad (la de arriba llega antes)
  const bv = (t > TT.emerge + 1.0 && t < TT.acro + 0.3); S.ballA.visible = S.ballB.visible = bv;
  if (bv) {
    if (t < TT.tunnel + 0.25) {
      const f = eio(clamp((t - TT.split) / (TT.meet - TT.split))), pre = eio(clamp((t - TT.emerge - 1.0) / (TT.split - TT.emerge - 1.0)));
      const LE = S.upPath[0], lead = { x: lerp(LE.x - 1.6, LE.x, pre), y: LE.y };
      const pa = t < TT.split ? { x: lead.x, y: lead.y + 0.13 } : surfAt(S.upPath, f, 0.13), pb = t < TT.split ? { x: lead.x, y: lead.y - 0.13 } : surfAt(S.dnPath, f, -0.13);
      zWorld(pa, al, S.ballA.position).add(v3(0, 0, TUN.D * 0.5)); zWorld(pb, al, S.ballB.position).add(v3(0, 0, TUN.D * 0.5));
      const sc = backOut(clamp((t - TT.emerge - 1.0) / 0.4)); S.ballA.scale.setScalar(Math.max(0.001, sc)); S.ballB.scale.setScalar(Math.max(0.001, sc));
    } else {
      const tau = (t - TT.pulse) * 3.2; zWorld(pathAt(S.pA, tau, 0.03), S.AL0, S.ballA.position).add(v3(0, 0, TUN.D * 0.5)); zWorld(pathAt(S.pB, tau, 0.03), S.AL0, S.ballB.position).add(v3(0, 0, TUN.D * 0.5));
      S.ballA.scale.setScalar(1.15); S.ballB.scale.setScalar(1.15);
    }
  }
  // flechas: el ala empuja el aire hacia abajo; el aire empuja el ala hacia arriba
  const dk = cwin(t, TT.arrDn, TT.press + 0.2, 0.35, 0.3), uk = cwin(t, TT.arrUp, TT.press + 0.2, 0.35, 0.3);
  S.arrDn.visible = dk > 0.01 && tk > 0.01; S.arrUp.visible = uk > 0.01 && tk > 0.01;
  S.arrDn.userData.setLen(0.75 * backOut(dk)); S.arrUp.userData.setLen(0.75 * backOut(uk));
  // presión (con el ala inclinada)
  S.press.material.opacity = cwin(t, TT.press - 0.1, TT.lift - 0.3, 0.45, 0.4) * 0.95; S.press.visible = S.press.material.opacity > 0.01 && tk > 0.01;
  S.press.rotation.z = 0;
}
function alphaMix(t) { return eio(clamp((t - TT.tilt) / 0.9)) * (1 - eio(clamp((t - TT.back) / 1.2))); }
function pathAt(path, tau, dt) { if (tau <= 0) return path[0]; const f = tau / dt, i = Math.min(path.length - 2, Math.floor(f)), u = Math.min(1, f - i); return { x: lerp(path[i].x, path[i + 1].x, u), y: lerp(path[i].y, path[i + 1].y, u) }; }
function surfAt(path, f, dy) { const i = Math.min(path.length - 2, Math.floor(f * (path.length - 1))), u = f * (path.length - 1) - i; return { x: lerp(path[i].x, path[i + 1].x, u), y: lerp(path[i].y, path[i + 1].y, u) + dy }; }
function sceneAt(t) { skyAt(t); roomAt(t); tunnelAt(t); }
