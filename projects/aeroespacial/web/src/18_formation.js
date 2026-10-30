// ---------------------------------------------------------------- 8 · «de aquí sale quien diseña aviones, motores, cohetes y satélites… y quien hace que todo eso vuele seguro»:
// de vuelta sobre las nubes, volando hacia el amanecer (−x) a la velocidad de la formación; cada cosa llega al oírla y al final van todos juntos
// hacia el graduado. Y en «6 años para entender todo lo que vuela», todo pasa por encima de él.
const FM_V = 6.2, FM_X0 = 40.5, FM_Y = 3.4;                 // la formación va a 6,2 m/s hacia −x y llega encima del graduado al acabar la frase
const fmC = t => v3(FM_X0 - FM_V * (t - K.de11), FM_Y, 0);   // punto de referencia de la formación (la cámara va con él)
// huecos de cada uno en la formación (respecto a fmC; −x es hacia delante) y desde dónde llegan
const FMS = { lead: v3(-1.7, 0, -0.5), wing: v3(0.9, 0.5, -2.7), wing0: v3(9.5, 2.2, 5.5), heli: v3(1.8, -0.75, 1.6), heli0: v3(-3.5, 4.5, 7), drone: v3(0.3, 1.1, 2.3), drone0: v3(5, -3.5, 5) };
function buildFormation() {
  S.fJet = makeJet({ stripe: '#0f7b6c', stripe2: '#f2b233', tail: 0x0f7b6c }); S.fJet.scale.setScalar(2.6); scene.add(S.fJet);
  S.fTrail = [0, 1, 2, 3].map(i => buildJet({ n: 1200, len: 10, rad: 0.03, spread: 0.32, speed: 0.5, size: 1.25, bright: 0.45, kind: 2, seed: 30 + i, turb: 0.25 }));
  S.fRocketJet = buildJet({ n: 2400, len: 14, rad: 0.3, spread: 3.2, speed: 1.3, size: 1.3, bright: 1.25, seed: 13 });
  S.fRocket = makeRocket(); S.fRocket.scale.setScalar(9); scene.add(S.fRocket);
}
function slotPos(t, t0, d, a, b) { const u = clamp((t - t0) / d), e = 1 - Math.pow(1 - u, 3); return { p: a.clone().lerp(b, e), u, v: b.clone().sub(a).multiplyScalar(3 * Math.pow(1 - u, 2) / d) }; }
function trailsFor(J, trails, t, power) { J.updateWorldMatrix(true, false); const d = v3(1, 0, 0).applyQuaternion(J.quaternion).negate(); trails.forEach((T, i) => jetAt(T, J.localToWorld(J.userData.exh[i].clone()), d, power)); }
function formationAt(t) {
  const on = t > K.de11 - 0.05 && t < K.falta12 + 0.8;
  S.fJet.visible = on;
  if (!on) { S.fTrail.forEach(T => { T.u.power.value = 0; }); }
  if (on) {
    const C = fmC(t), fwd = v3(-1, 0, 0);
    // líder (verde azulado): ya está ahí al salir de la nube
    jetPose(S.fJet, C.clone().add(FMS.lead).add(v3(0, 0.05 * Math.sin(t * 1.1), 0.04 * Math.sin(t * 0.7))), fwd, 0.04 * Math.sin(t * 0.8));
    S.fJet.userData.update(t, { flex: 0.12 + 0.03 * Math.sin(t * 2.7), halo: 0.07 }); trailsFor(S.fJet, S.fTrail.slice(0, 2), t, 1);
    // «aviones»: el segundo avión (azul) llega por detrás de la cámara, pasa a su lado y se pone en su sitio
    const w = slotPos(t, K.aviones11 - 0.45, 1.1, FMS.wing0, FMS.wing); S.hookJet.visible = true; S.hookJet.scale.setScalar(2.4);
    jetPose(S.hookJet, C.clone().add(w.p), fwd.clone().add(w.v.clone().multiplyScalar(-0.02 / FM_V)).normalize(), -0.35 * (1 - w.u) + 0.04 * Math.sin(t * 0.9));
    S.hookJet.userData.update(t, { flex: 0.12, halo: 0.07 }); trailsFor(S.hookJet, S.fTrail.slice(2, 4), t, win(t, K.aviones11, 0.4));
    // «vuele seguro»: el helicóptero y el dron se unen
    const hk = t > K.y11 - 0.5, h = slotPos(t, K.y11 - 0.5, 1.2, FMS.heli0, FMS.heli);
    if (hk) { S.heli.visible = true; S.heli.position.copy(C).add(h.p); S.heli.rotation.set(0.03 * Math.sin(t * 1.3), Math.PI + 0.04 * Math.sin(t * 0.5), 0.18 * (1 - h.u) - 0.1); S.heli.userData.update(t); }
    const dk = t > K.y11 - 0.2, dr = slotPos(t, K.y11 - 0.2, 1.0, FMS.drone0, FMS.drone);
    if (dk) { S.drone.visible = true; S.drone.scale.setScalar(1.25); S.drone.position.copy(C).add(dr.p).add(v3(0, 0.03 * Math.sin(t * 3.1), 0)); S.drone.rotation.set(0.05 * Math.sin(t * 2), Math.PI - 0.3, 0.1 + 0.05 * Math.sin(t * 1.6)); S.drone.userData.update(t); }
    // «satélites»: cruza alto por encima
    const sk = t > K.satelites11 - 0.8 && t < K.y11 + 1.2;
    if (sk) { S.sat.visible = true; const u = t - (K.satelites11 - 0.8); S.sat.position.copy(C).add(v3(6.5 - 4.2 * u, 6.2 + 0.2 * u, -3.0)); S.sat.rotation.set(0.4, 0.5 + 0.2 * t, 0.3); S.sat.userData.deploy(1); }
  }
  // «cohetes»: un cohete grande despega del mar de nubes, lejos, delante (hacia el amanecer)
  const tr = K.cohetes11 - 1.45, ron = t > tr && t < K.y11 + 1.5; S.fRocket.visible = ron;
  if (ron) { const x0 = fmC(K.cohetes11).x - 30, y = CLOUD_Y - 9 + 2.2 * Math.pow(t - tr, 2) * 2.2 + 4 * (t - tr); S.fRocket.position.set(x0, y, -46); S.fRocket.rotation.set(0, 0, 0.05 * (t - tr));
    S.fRocket.updateWorldMatrix(true, false); const noz = S.fRocket.localToWorld(v3(0, 0, 0)), dn = S.fRocket.localToWorld(v3(0, -1, 0)).sub(noz).normalize(); jetAt(S.fRocketJet, noz, dn, clamp((t - tr) / 0.25)); }
  else S.fRocketJet.u.power.value = 0;
  flyoverAt(t);
}
// ---------------------------------------------------------------- «6 años para entender todo lo que vuela»: el graduado mira arriba y le pasan por encima un avión, un helicóptero,
// un cohete (lejos, detrás) y un satélite
function flyoverAt(t) {
  const t0 = K.seis - 0.2, on = t > t0 && t < K.si3 + 0.8; if (!on) return;
  const u = t - t0;
  S.climbJet.visible = true; S.climbJet.scale.setScalar(2.8); const jp = v3(9 - 7.5 * u, 6.2 + 0.25 * u, -3.5); jetPose(S.climbJet, jp, v3(-1, 0.03, 0).normalize(), 0.12);
  S.climbJet.userData.update(t, { flex: 0.12, halo: 0.08 }); trailsFor(S.climbJet, S.climbTrail, t, 1);
  if (t > K.para14 - 0.3) { S.heli.visible = true; const v = t - (K.para14 - 0.3); S.heli.position.set(-6 + 3.4 * v, 4.4 + 0.15 * Math.sin(t), -1.8); S.heli.rotation.set(0, 0, -0.12); S.heli.scale.setScalar(1.3); S.heli.userData.update(t); }
  if (t > K.todo14 - 0.6) { const v = t - (K.todo14 - 0.6); S.fRocket.visible = true; S.fRocket.position.set(-14, CLOUD_Y - 9 + 4.8 * v * v + 4 * v, -42); S.fRocket.rotation.set(0, 0, 0.03 * v);
    S.fRocket.updateWorldMatrix(true, false); const noz = S.fRocket.localToWorld(v3(0, 0, 0)), dn = S.fRocket.localToWorld(v3(0, -1, 0)).sub(noz).normalize(); jetAt(S.fRocketJet, noz, dn, clamp(v / 0.25)); }
  if (t > K.vuela14 - 0.5) { S.sat.visible = true; const v = t - (K.vuela14 - 0.5); S.sat.position.set(5 - 2.6 * v, 9.5, -6); S.sat.rotation.set(0.4, 0.4 + 0.3 * t, 0.2); S.sat.userData.deploy(1); }
}
