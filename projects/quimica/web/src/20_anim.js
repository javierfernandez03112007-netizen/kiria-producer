// ---------------------------------------------------------------- tiempos y animación (todo depende de K: las palabras de la voz)
let TT = {};
function buildTimes() {
  TT = {
    grow0: K.toneladas2 - 0.12, grow1: K.toneladas2 + 1.55,      // la fábrica sale del tubo y crece hasta su tamaño real
    mol0: K.moleculas5 - 0.05, molNew: K.algo5 - 0.05,            // la molécula aparece y se reordena («algo nuevo»)
    molIn0: K.tubo5 - 0.1, molIn1: K.ensayo5 + 0.45,              // la molécula entra en el tubo pequeño
    rec0: K.receta6 - 0.15, rec1: K.fabrica6 + 0.85,              // la receta vuela del laboratorio al reactor
    flow0: K.tuberias6 - 0.1, flow1: K.baratas6 + 1.2,            // el producto corre por las tuberías
    truck0: K.toneladas6 - 0.15,                                   // el camión cisterna sale cargado
    off0: K.sin11 - 0.05, seed0: K.nada11 - 0.6, relight: K.fabricar11 + 0.35,   // sin el químico la fábrica se apaga; llega su gota y se enciende
    rw: END - 1.35,                                                // vuelta al principio: la fábrica se mete otra vez en el tubo
  };
}
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _qq = new THREE.Quaternion();
function plantK(t) { return eio(clamp((t - TT.grow0) / (TT.grow1 - TT.grow0))) * (1 - eio(clamp((t - TT.rw) / (END - 0.12 - TT.rw)))); }
function plantScale(t) { return PS0 * Math.pow(1 / PS0, plantK(t)); }
function plantOn(t) { return 1 - win(t, TT.off0, 0.35) * (1 - win(t, TT.relight, 0.4)); }
function stageAt2(t) {
  // --- la fábrica: dentro del tubo (miniatura) → tamaño real al fondo → otra vez al tubo
  const k = plantK(t), s = plantScale(t), on = plantOn(t);
  { const from = v3(TUBE.x, MINI_Y, TUBE.z); S.plant.position.copy(from).lerp(PLANT0, k); S.plant.position.y += Math.sin(k * Math.PI) * 3.2; S.plant.scale.setScalar(s); S.plant.rotation.y = (1 - k) * 0.35; }
  // --- el tubo gigante: se rompe cuando sale la fábrica y vuelve a aparecer al final
  { const gone = win(t, TT.grow0 - 0.05, 0.22) * (1 - win(t, TT.rw + 0.25, 0.6)), a = 1 - gone;
    S.tube.visible = a > 0.01; S.tubeGlass.material.opacity = 0.14 * a; S.tubeRim.material.opacity = 0.6 * a; S.miniFloor.scale.setScalar(Math.max(0.001, a));
    const u = t - TT.grow0; S.tubeShards.visible = u > 0 && u < 1.1 && t < TT.rw; if (S.tubeShards.visible) { burst(S.tubeShards, v3(TUBE.x, BENCH.y + 0.8, TUBE.z), t, TT.grow0, 0.55, 1.2, false, 5); S.tubeShards.material.opacity = 1 - clamp(u / 1.1); } }
  // --- humo de la chimenea y vapor de la columna (en coordenadas de la fábrica; el tamaño de los puntos sigue a la escala)
  { const sm = S.smoke, st = S.steam; sm.visible = st.visible = on > 0.05;
    if (sm.visible) { burst(sm, v3(-6.4, 11.95, -3.4), t, 0, 0.32, 3.2, true, -0.55); sm.material.size = 0.9 * s; sm.material.opacity = 0.32 * on;
      burst(st, v3(1.9, 11.4, -1.6), t, 0.4, 0.25, 2.4, true, -0.6); st.material.size = 0.6 * s; st.material.opacity = 0.28 * on; } }
  S.plantLights.forEach((l, i) => { l.material.emissiveIntensity = (3 + 0.6 * Math.sin(t * 3 + i)) * on; });
  S.reactorGlow.material.emissiveIntensity = (3 + 9 * cwin(t, K.reactores6 - 0.05, K.columnas6, 0.15, 0.4)) * on;
  // --- el producto corriendo por las tuberías
  { const a = cwin(t, TT.flow0, TT.flow1, 0.3, 0.6) * on; S.flowPts.visible = a > 0.01;
    if (S.flowPts.visible) { const arr = S.flowPts.geometry.attributes.position.array, n = S.flowPts.userData.n, C = S.flowCurves;
      for (let i = 0; i < n; i++) { const c = C[i % C.length], u = (hash(i * 1.37) + (t - TT.flow0) * (0.22 + hash(i) * 0.1)) % 1, p = c.getPointAt(u); arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; }
      S.flowPts.geometry.attributes.position.needsUpdate = true; S.flowPts.material.size = 0.22 * s; S.flowPts.material.opacity = a; } }
  // --- el camión cisterna sale cargado y vuelve a su sitio para el bucle
  { const u = clamp((t - TT.truck0) / 4.0); S.truck.position.x = 9.5 + 16 * u * u; S.truck.visible = (u < 0.98 || t > TT.rw) && plantK(t) > 0.5; if (t > TT.rw) S.truck.position.x = 9.5; }   // en miniatura no cabe en el tubo
  // --- la gota del cuentagotas en «gramos»
  { const u = clamp((t - K.gramos2 + 0.25) / 0.38); S.drop.position.y = -0.325 * u * u; S.drop.scale.setScalar(Math.max(0.001, u < 1 ? 1 : 1 - clamp((t - K.gramos2 - 0.13) / 0.15))); }
  // --- la molécula: aparece átomo a átomo, se reordena con un átomo nuevo y entra en el tubo pequeño
  { const vis = t > TT.mol0 - 0.05 && t < TT.molIn1 + 0.05; S.mol.visible = vis;
    if (vis) {
      const re = eio(clamp((t - TT.molNew) / 0.6)), inn = eio(clamp((t - TT.molIn0) / (TT.molIn1 - TT.molIn0)));
      S.atoms.forEach((a, i) => { a.position.copy(a.userData.p0).lerp(a.userData.p1, re); a.scale.setScalar(pops(t, TT.mol0 + i * 0.06, 0.32)); });
      S.newAtom.position.copy(S.newAtom.userData.p1); S.newAtom.scale.setScalar(pops(t, K.nuevo5 - 0.05, 0.4)); S.newAtom.material.emissiveIntensity = 1.1 + 3 * Math.exp(-Math.max(0, t - K.nuevo5) * 3);
      const bond = (c, A, B, ok) => { _pa.copy(A.position); _pb.copy(B.position); const d = _pa.distanceTo(_pb); c.visible = ok && d > 0.01; if (!c.visible) return; c.position.copy(_pa).add(_pb).multiplyScalar(0.5); c.scale.set(1, d, 1); c.quaternion.setFromUnitVectors(_up, _pb.sub(_pa).normalize()); };
      S.bonds.forEach(b => bond(b.c, S.atoms[b.a], S.atoms[b.b], S.atoms[b.a].scale.x > 0.6 && S.atoms[b.b].scale.x > 0.6));
      bond(S.bondNew, S.atoms[0], S.newAtom, S.newAtom.scale.x > 0.6);
      const tgt = v3(RACK.x, BENCH.y + 0.36, RACK.z); S.mol.position.copy(MOL).lerp(tgt, inn); S.mol.scale.setScalar(Math.max(0.001, 1 - 0.94 * inn) * (inn > 0.97 ? 1 - (inn - 0.97) / 0.03 : 1));
      S.mol.rotation.set(0.25 * Math.sin(t * 0.7), t * 0.75, 0);
    } }
  // --- los tubos pequeños: el del químico se llena con la sustancia nueva
  S.smallTubes.forEach((g, i) => { const liq = g.userData.liq; let lv = g.userData.lv;
    if (i === 1) lv = 0.15 * eio(clamp((t - TT.molIn1 + 0.25) / 0.6)) * (1 - win(t, TT.rw, 0.5));
    liq.visible = lv > 0.003; liq.scale.y = Math.max(0.001, lv); liq.position.y = 0.028 + lv / 2;
    liq.material.emissiveIntensity = i === 1 ? 0.7 + 2.5 * cwin(t, TT.molIn1 - 0.2, K.ingeniero6 + 0.3, 0.2, 0.5) + 2.2 * cwin(t, TT.seed0 - 0.3, TT.seed0 + 0.4, 0.15, 0.3) : 0.7; });
  // --- la receta vuela del laboratorio al reactor
  { const u = clamp((t - TT.rec0) / (TT.rec1 - TT.rec0)), R = S.recipe; R.visible = u > 0 && u < 1;
    if (R.visible) { const a = v3(-0.1, 1.75, 4.55), b = v3(-3.3, 5.3, -9.4), e = eio(clamp((u - 0.22) / 0.78));
      R.position.copy(a).lerp(b, e); R.position.y += Math.sin(e * Math.PI) * 3.0;
      R.scale.setScalar(Math.max(0.001, pop(t, TT.rec0, 0.35) * (1.5 + 5 * e) * (1 - clamp((u - 0.9) / 0.1))));
      R.quaternion.copy(cam.quaternion); R.rotateZ(0.12 * Math.sin(t * 2.2)); } }
  // --- la gota del químico que vuelve a encender la fábrica (frase 11)
  { const u = clamp((t - TT.seed0) / (TT.relight - TT.seed0)); S.seed.visible = u > 0 && u < 1;
    if (S.seed.visible) { const a = v3(RACK.x, BENCH.y + 0.3, RACK.z), b = v3(-3.3, 5.6, -9.6), e = eio(u); S.seed.position.copy(a).lerp(b, e); S.seed.position.y += Math.sin(e * Math.PI) * 4.5; S.seed.scale.setScalar(1.6 + 5 * e); } }
}
