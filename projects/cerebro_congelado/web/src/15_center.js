// ---------------------------------------------------------------- el centro: el heladero muerde el polo y se congela en 2 segundos; la cabeza se abre de perfil y por
// dentro pasa lo de cada frase (el frío en el paladar, la alarma del nervio, la sangre, la arteria que se ensancha, las capas que duelen, el nervio de la
// frente); con el truco (la lengua contra el paladar) se derrite. Al final vuelve a morder (bucle con el primer fotograma).
const T_HIT = 0.12;
const P_BITE = v3(-0.32, -1.62, 1.28), D_BITE = v3(0.22, 0.9, -0.38), P_HOLD = v3(-0.44, -1.98, 1.42), D_HOLD = v3(0.17, 0.93, -0.22), P_LOW = v3(-0.58, -2.55, 1.38), D_LOW = v3(0.12, 0.96, 0.08), ELBOW = v3(-1.7, -4.2, 0.4);
const _pp = new THREE.Vector3(), _dd = new THREE.Vector3(), _bw = new THREE.Vector3();
function buildCenter() { S.hero = buildHero(); scene.add(S.hero); S.sec = buildSection(S.hero.userData.head); }
// 1 = la cabeza abierta de perfil
function cutK(t) {
  const a = win(t, K.truco2 + 0.55, 0.8) * (1 - win(t, K.cierra7 + 0.15, 0.55));
  const b = win(t, K.truco9 - 0.05, 0.75) * (1 - win(t, K.calentarlo9 - 0.25, 0.55));
  return Math.max(a, b);
}
// frente de la escarcha (sale de la boca) y del deshielo (también desde la boca, con el truco)
function freezeR(t) { return t < T_HIT + 0.05 ? 0 : 6.5 * Math.pow(clamp((t - T_HIT - 0.05) / 1.75), 1.35); }
function meltR(t) { return t < K.calentarlo9 - 0.35 ? -1 : -0.2 + 6.8 * Math.pow(clamp((t - (K.calentarlo9 - 0.35)) / 1.25), 1.2); }
// la arteria: radio (normal 0,015; ensanchada 0,034)
function acaR(t) {
  let k = win(t, K.ensancha4 - 0.15, 0.7) * (1 - win(t, K.n2012 - 0.1, 0.6));
  k = Math.max(k, win(t, K.abre7 - 0.35, 0.5) * (1 - win(t, K.cierra7 - 0.1, 0.6)));
  k = Math.max(k, win(t, K.truco9 - 0.05, 0.3) * (1 - win(t, K.paladar9 + 0.2, 0.7)));
  return 0.015 + 0.019 * k + 0.0015 * Math.sin(t * 9) * k;
}
function painK(t) {      // las capas que envuelven el cerebro, en rojo
  return Math.max(win(t, K.capas5 - 0.1, 0.5) * (1 - win(t, K.n2012 - 0.2, 0.5)), win(t, K.abre7 - 0.25, 0.4) * (1 - win(t, K.cierra7 - 0.05, 0.5)) * 0.85,
    win(t, K.truco9 - 0.05, 0.3) * (1 - win(t, K.paladar9 + 0.1, 0.7)) * 0.7);
}
function centerAt(t, st) {
  const U = S.hero.userData, mi = U.headMesh.morphTargetInfluences, sec = S.sec, SU = sec.userData;
  // la boca: abierta para morder (bucle), muerde a los 0,12 s y se queda así congelado; con el truco se cierra y sonríe; al final vuelve a abrirse
  const bite = 1 - win(t, 0.02, 0.14), endOpen = win(t, END - 0.75, 0.6), melt = win(t, K.calentarlo9 - 0.1, 0.7);
  mi[0] = Math.max(0.55 * bite, 0.2 * (1 - melt), 0.55 * endOpen) + 0.05 * Math.max(0, Math.sin((t - K.tu10) * 11)) * env(t, K.tu10, K.mandaselo10 - 0.2, 0.1, 0.2);
  mi[1] = melt * (1 - 0.7 * endOpen);
  mi[2] = 0.75 * win(t, 0.3, 0.6) * (1 - melt);
  SU.jaw.rotation.x = JAW_A * mi[0];
  // los ojos: muy abiertos al congelarse; parpadeo al deshelarse; miran el polo al preguntar
  const shock = win(t, 0.18, 0.3) * (1 - melt), blink = Math.max(0, 1 - Math.abs(t - (K.calentarlo9 + 0.75)) / 0.09);
  const lookDown = env(t, K.tu10 + 0.1, K.mandaselo10, 0.3, 0.3);
  for (const e of U.eyes) eyePose(e, (1 + 0.5 * shock) * (1 - blink), 1, 0, 0.32 * lookDown);
  U.brows.forEach((b, i) => { const s = i ? -1 : 1; b.position.y = 0.29 + 0.07 * shock + 0.02 * lookDown; b.rotation.z = s * 0.1 * shock; });
  // el polo: en la boca (morder) → un poco fuera mientras está congelado → abajo, contento → otra vez a la boca
  const away = win(t, 0.3, 0.45) * (1 - endOpen), low = win(t, K.calentarlo9 + 0.4, 0.8) * (1 - win(t, K.mandaselo10 + 0.25, END - 0.75 - (K.mandaselo10 + 0.25)));
  _pp.copy(P_BITE).lerp(P_HOLD, away).lerp(P_LOW, low); _dd.copy(D_BITE).lerp(D_HOLD, away).lerp(D_LOW, low);
  armPose(U, _pp, _dd, ELBOW);
  // la cabeza: un leve movimiento de vida (y quieta mientras está congelada)
  const live = 1 - win(t, 0.25, 0.3) * (1 - melt);
  U.head.rotation.set(0.03 * Math.sin(t * 1.3) * live - 0.04 * lookDown, 0.04 * Math.sin(t * 0.9) * live, 0);
  // la escarcha y los carámbanos
  S.hero.updateMatrixWorld(true); U.headMesh.localToWorld(_bw.set(0, -0.67, 0.86)); FZ.c.value.copy(_bw);
  const fr = freezeR(t), mr = meltR(t); FZ.r.value = t > K.calentarlo9 + 1.4 && t < END + 1 ? 0 : fr; FZ.m.value = mr;
  for (const ic of U.icicles) { const w = ic.m.parent.localToWorld(ic.p.clone()), d = w.distanceTo(FZ.c.value), k = clamp((FZ.r.value - d - 0.1) / 0.35) * clamp((d - FZ.m.value) / 0.3); const s = Math.max(0.0001, k); ic.m.scale.set(s, s, s); }
  // el corte de perfil (la gorra sale volando hacia arriba mientras la cabeza está abierta)
  const ck = cutK(t); U.cut[0].constant = ck > 0.001 ? lerp(1.1, -0.004, eio(ck)) : 5; sec.visible = ck > 0.02;
  const capOff = eio(clamp(ck * 1.6)); U.cap.position.set(0, 0.86 + 1.6 * capOff, -0.2 - 0.3 * capOff); U.cap.rotation.set(-0.1 - 0.5 * capOff, 0, 0.25 * capOff); U.cap.visible = capOff < 0.98;
  FZ.pk.value = 0;
  if (!sec.visible) return;
  // dentro: el frío en el paladar (y el calor del truco), la alarma del nervio, la sangre, la arteria, las capas que duelen, la frente
  const cold = win(t, K.enfria3 - 0.1, 0.5) * (1 - win(t, K.paladar9 + 0.3, 0.9)), warm = win(t, K.paladar9 - 0.05, 0.6) * (1 - win(t, K.calentarlo9 + 0.6, 0.4));
  SU.cold.scale.setScalar(Math.max(0.0001, 0.75 * cold * (1 + 0.05 * Math.sin(t * 6)))); SU.cold.material.opacity = 0.85 * cold;
  SU.warm.scale.setScalar(Math.max(0.0001, 0.8 * warm)); SU.warm.material.opacity = 0.9 * warm;
  SU.palate.material.emissive.setRGB(0.15 * cold, 0.35 * cold, 0.8 * cold); SU.palate.material.emissiveIntensity = 1;
  // el nervio: dos pulsos de alarma (paladar → cerebro) y luego el de la frente
  const p1 = (t - K.nervio3) / 0.75, p1b = (t - K.nervio3 - 0.8) / 0.75;
  SU.pulse.p.value = p1 > 0 && p1 < 1.2 ? p1 : (p1b > 0 && p1b < 1.2 ? p1b : (t > K.nervio6 - 0.2 && t < K.nervio6 + 1.0 ? (t - K.nervio6 + 0.2) / 1.0 : -1));
  SU.pulse2.p.value = t > K.nervio6 + 0.6 && t < K.frente6 + 0.5 ? clamp((t - K.nervio6 - 0.6) / (K.frente6 - K.nervio6 - 0.4)) : -1;
  const nGlow = env(t, K.nervio3 - 0.1, K.cuerpo4, 0.3, 0.5) + env(t, K.nervio6 - 0.1, K.n2012 - 0.2, 0.3, 0.5); SU.nervM.emissiveIntensity = 0.5 * nGlow; SU.nervM2.emissiveIntensity = 0.5 * env(t, K.nervio6 + 0.4, K.n2012 - 0.2, 0.3, 0.5);
  const fk = env(t, K.frente6 - 0.1, K.n2012 - 0.3, 0.35, 0.5); SU.fore.scale.setScalar(Math.max(0.0001, 0.5 * fk * (1 + 0.1 * Math.sin(t * 10)))); SU.fore.material.opacity = 0.6 * fk; U.head.localToWorld(FZ.pc.value.set(0, 0.45, 0.72)); FZ.pk.value = fk * (0.85 + 0.15 * Math.sin(t * 10));
  // la sangre sube por la carótida y entra en la arteria
  const bl = env(t, K.sangre4 - 0.15, K.craneo5, 0.3, 0.6) + 0.8 * env(t, K.abre7 - 0.35, K.cierra7, 0.3, 0.4);
  for (let i = 0; i < 40; i++) { const u = ((t * 0.55 + i / 40) % 1), onA = u > 0.45, c = onA ? SU.acaC : SU.carC, uu = onA ? (u - 0.45) / 0.55 : u / 0.45;
    c.getPointAt(clamp(uu), _o.position); _o.position.x += 0.012; _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.00001, 0.019 * bl * (0.7 + 0.5 * hash(i)))); _o.updateMatrix(); SU.blood.setMatrixAt(i, _o.matrix); }
  SU.blood.instanceMatrix.needsUpdate = true;
  acaRadius(sec, Math.round(acaR(t) * 2000) / 2000);
  SU.artM.emissiveIntensity = 0.4 + 0.8 * clamp((acaR(t) - 0.016) / 0.018);
  const pk = painK(t); SU.men.material.emissive.setRGB(0.55 * pk, 0.0, 0.0); SU.men.material.emissiveIntensity = 1 + 0.6 * Math.sin(t * 11) * win(t, K.esas5 - 0.1, 0.3);
  SU.men.material.color.setRGB(lerp(0.79, 0.72, pk), lerp(0.47, 0.015, pk), lerp(0.45, 0.012, pk));
  // la lengua sube y aprieta el paladar
  SU.tongue.position.y = 0.048 * win(t, K.aprieta9 + 0.05, 0.9) * (1 - win(t, K.calentarlo9 + 0.5, 0.5));
}
