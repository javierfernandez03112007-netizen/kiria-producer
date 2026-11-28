// ---------------------------------------------------------------- «El escalón torcido»: LO QUE PASA EN CADA FOTOGRAMA (todo depende solo de t: se puede saltar a cualquier tiempo).
const SEAS0 = 2.55;                                    // estación del principio y del final (finales del verano: luz dorada, hojas que empiezan a girar)
// el «sala a oscuras» del efecto foco: del foco a «nadie te mira»
function darkK(t) { return win(t, TL.foco - 0.08, 0.4) * (1 - win(t, TL.nadie + 0.15, 1.1)); }
function outK(t) { return 0; }
// el flexo: encendido siempre, salvo un instante al final (se apaga cuando se cierra la trampilla y «clic» en «quien»)
function lampK(t) { return 1 - win(t, TL.manda + 0.3, 0.12) + win(t, TL.quien - 0.04, 0.05); }
// cuántos escalones hay puestos: 365, salvo en el año otra vez (L8): se recogen deprisa y vuelven a crecer
function stairN(t) { if (t < TL.rw0 || t > TL.gr1 + 0.5) return ST.N; if (t < TL.rw1) return ST.N * (1 - eio(seg(t, TL.rw0, TL.rw1)));
  if (t < TL.gr0) return 0; const u = seg(t, TL.gr0, TL.gr1); return ST.N * Math.min(1, u < 0.18 ? 0.035 * u / 0.18 : 0.035 + 0.965 * Math.pow((u - 0.18) / 0.82, 1.15)); }
const dayOf = n => clamp(Math.ceil(n - 1e-6), 1, ST.N);
const mult = n => Math.pow(1.01, clamp(n, 0, ST.N));
// el bloque del de abajo: dónde está (en el banco; al final lo baja al suelo para subirse)
const BLOCKF = _v(0.06, 0.11, 0.46);            // en el suelo, debajo de la trampilla
function blockPos(t) { const a = win(t, TL.ridiculo - 0.1, 0.45), b = win(t, TL.deja9b - 0.35, 0.4);
  if (t >= TL.manda + 0.9) return BLOCK0.clone();      // (bucle) vuelve al banco mientras la cámara mira a la trampilla: lo tiene B
  const up = BLOCK0.clone().add(_v(-0.18, 0.18, 0.05)); const p = BLOCK0.clone().lerp(up, a); return p.lerp(BLOCKF, b); }
// A: la vida del de abajo
function animA(t) { const A = CAST.A, U = A.userData, J = U.J; const ts = t > 30 ? t - END : t;
  if (t > TL.arriba9 + 1.15) { A.visible = false; return; } A.visible = true;
  poseReset(A); A.position.set(SEAT.x, 0, SEAT.z); A.rotation.set(0, Math.PI / 2, 0);
  const stand = win(t, TL.estudiantes - 0.2, 0.7) * (1 - win(t, TL.nadie + 0.2, 0.8));           // se levanta para «entrar en clase» con la camiseta
  const up9 = win(t, TL.ridiculo - 0.3, 0.6);                                                    // se levanta para subir
  const frozen = win(t, TL.quieto7, 0.25) * (1 - win(t, TL.escalon9 + 0.2, 0.4));
  const speed = 1 + 0.9 * win(t, TL.vago - 0.1, 0.3) * (1 - win(t, TL.cerebro + 0.2, 0.5));
  const tl8 = t > TL.gr0 && t < TL.gr1 ? (t - TL.gr0) * 9 : 0;                                    // el año a cámara rápida: pule a toda velocidad
  const bp = blockPos(t);
  if (stand < 0.001 && up9 < 0.001) {                                   // sentado, puliendo
    poseSit(A, 0.08); A.position.y = SEAT.h - 0.47 * U.k; poseHunch(A, 1 + 0.25 * frozen); A.updateMatrixWorld(true);
    const pt = frozen > 0.5 ? TL.quieto7 + 0.1 : ts + tl8; posePolish(A, bp, pt, speed * (1 - frozen * 0.999), 1 - frozen);
    if (t > TL.escalon9 - 0.2) { const k = win(t, TL.escalon9 + 0.15, 0.5); J.head.rotation.x = lerp(J.head.rotation.x, -0.75, k); J.neck.rotation.x = lerp(J.neck.rotation.x, -0.35, k); J.spine.rotation.x = lerp(J.spine.rotation.x, 0.0, k); }
  } else if (up9 < 0.001) {                                             // de pie, mirando a la sala, con la camiseta
    const k = stand; A.rotation.y = lerp(Math.PI / 2, 0.15, eio(k)); A.position.x = lerp(SEAT.x, SEAT.x + 0.05, k); A.position.z = lerp(SEAT.z, SEAT.z + 0.35, k);
    poseSit(A, 0.08); A.position.y = (SEAT.h - 0.47 * U.k) * (1 - k); const J2 = J; for (const n of ['hpL', 'hpR', 'knL', 'knR']) J2[n].rotation.x *= 1 - k; J.pelvis.position.y = lerp(0.47 * U.k, U.base.pelY, k); J.spine.rotation.x = lerp(0.08, 0.06, k);
    poseHunch(A, 0.4 * (1 - k) + 0.25); J.shL.rotation.z = -0.1; J.shR.rotation.z = 0.1; J.elL.rotation.x = -0.3; J.elR.rotation.x = -0.3;
    const look = win(t, TL.creian, 0.4); J.head.rotation.y = Math.sin(t * 1.3) * 0.25 * (1 - look); J.head.rotation.x = 0.1 + 0.15 * look;
  } else {                                                              // L9: mira arriba, coge su escalón, lo pone en el suelo, se sube y le dan la mano
    const pl = win(t, TL.deja9b - 0.35, 0.4), on = win(t, TL.deja9b + 0.12, 0.3), reach = win(t, TL.poco - 0.35, 0.35), lift = eio(seg(t, TL.arriba9 - 0.05, TL.arriba9 + 1.05));
    poseSit(A, 0.08); for (const n of ['hpL', 'hpR', 'knL', 'knR']) J[n].rotation.x *= 1 - up9; J.pelvis.position.y = lerp(0.47 * U.k, U.base.pelY, up9);
    A.rotation.y = lerp(Math.PI / 2, 0.05, eio(up9)); A.position.x = lerp(SEAT.x, BLOCKF.x, on); A.position.z = lerp(SEAT.z, BLOCKF.z + 0.02, on);
    A.position.y = (SEAT.h - 0.47 * U.k) * (1 - up9) + 0.22 * eo(on) + 2.85 * lift;
    // agacharse a dejar el bloque (rodillas y espalda), luego erguido con el brazo arriba
    const bend = Math.sin(clamp(pl) * Math.PI) * (1 - on); J.spine.rotation.x = 0.7 * bend; J.hpL.rotation.x = J.hpR.rotation.x = -0.9 * bend; J.knL.rotation.x = J.knR.rotation.x = 1.4 * bend; J.pelvis.position.y -= 0.28 * bend;
    J.head.rotation.x = lerp(-0.2, -0.85, Math.max(reach, 1 - up9 * (1 - win(t, TL.ridiculo + 0.2, 0.3)))); A.updateMatrixWorld(true);
    if (on < 0.5) { reachTo(A, 'L', bp.clone().add(_v(0, 0.02, 0.17)), up9 * (1 - on * 2), _v(0, -1, -0.3)); reachTo(A, 'R', bp.clone().add(_v(0, 0.02, -0.17)), up9 * (1 - on * 2), _v(0, -1, -0.3)); }
    const hand = handMeet(t); if (reach > 0.001) reachTo(A, 'L', hand, reach, _v(0, 0, -1));
    if (reach < 0.999 && on > 0.5) { J.shR.rotation.z = 0.15; J.elR.rotation.x = -0.2; }
  }
  // color: gris azulado; se calienta al subir a la luz
  const warm = win(t, TL.poco, 1.2); CAST.AM.color.copy(CAST.A0).lerp(CAST.T0, warm);
  // la cabeza transparente con el cerebro (L3–L4)
  const br = win(t, TL.cerebro - 0.05, 0.35) * (1 - win(t, TL.mirando, 0.6)); CAST.brain.b.visible = br > 0.01; U.headM.opacity = 1 - 0.72 * br; U.headM.depthWrite = br < 0.5;
  CAST.brain.m.emissiveIntensity = 0.25 * br + 1.6 * bump(t, TL.trampa - 0.05, TL.trampa + 0.5, 0.08, 0.3) * br;
  CAST.shirt.set(pop(t, TL.camiseta - 0.05, 0.4) * (1 - win(t, TL.nadie + 0.1, 0.35)));
}
// donde se encuentran las dos manos (debajo del forjado, en la trampilla)
function handMeet(t) { const lift = eio(seg(t, TL.arriba9 - 0.05, TL.arriba9 + 1.05)); return _v(BLOCKF.x + 0.02, 2.0 + 2.85 * lift, BLOCKF.z - 0.02); }
// B: otra persona igual, en el sitio de A, solo al final (aparece mientras la cámara mira a la trampilla cerrándose)
function animB(t) { const B = CAST.B; B.visible = t > TL.manda + 0.9; if (!B.visible) return; const ts = t - END;
  poseReset(B); B.position.set(SEAT.x, SEAT.h - 0.47 * B.userData.k, SEAT.z); B.rotation.set(0, Math.PI / 2, 0); poseSit(B, 0.08); poseHunch(B, 1); B.updateMatrixWorld(true); posePolish(B, BLOCK0, ts, 1, 1); }
// T: el que actúa (arriba del todo de su escalera; en el año otra vez va subiendo; al final, tumbado en la trampilla tendiendo la mano)
function animT(t, n) { const T = CAST.T, J = T.userData.J;
  const atHatch = t > TL.escalon9 - 0.4 && t < TL.manda + 0.9;
  if (atHatch) { T.visible = true; poseReset(T); const lift = eio(seg(t, TL.arriba9 - 0.05, TL.arriba9 + 1.05)), lean = win(t, TL.escalon9, 0.6) * (1 - 0.7 * lift);
    T.rotation.set(Math.PI / 2, 0, 0); T.position.set(HATCH.x - 0.02, HO.y2 + 0.12, HATCH.z - HATCH.s / 2 - 0.05 - T.userData.base.pelY);
    J.spine.rotation.x = 1.05 * lean; J.chest.rotation.x = 0.25 * lean; J.neck.rotation.x = -0.35 * lean; J.head.rotation.x = -0.2 * lean;
    J.hpL.rotation.x = J.hpR.rotation.x = 0.05; J.shR.rotation.x = -0.4; J.elR.rotation.x = -0.6; T.updateMatrixWorld(true);
    const reach = win(t, TL.ridiculo - 0.15, 0.5); const hand = handMeet(t).add(_v(0.01, 0.06, 0)); reachTo(T, 'L', hand, reach, _v(0, 0, 1)); J.shL.rotation.z *= 1;
    if (reach < 0.999) { J.shL.rotation.x = lerp(-0.4, J.shL.rotation.x, reach); }
    return; }
  if (t > TL.manda + 0.9) { T.visible = false; return; }
  T.visible = true; poseReset(T);
  const i = Math.max(0, Math.floor(n) - 1), top = n < 1 ? _v(ST.x0 - 0.32, HO.y2, ST.z) : stepTop(i), d = stairDir(Math.min(i + 1, ST.N - 1));
  T.position.copy(top); T.rotation.set(0, Math.atan2(d.x, d.z), 0);
  // pone el bloque del día: se agacha, lo deja delante y se endereza (bucle de 1,6 s; en el año otra vez, rápido)
  const fast = t > TL.gr0 && t < TL.gr1, ph = fast ? (t * 9) % 1 : ((t + 0.4) % 1.6) / 1.6, b = Math.sin(clamp(ph / 0.7) * Math.PI);
  J.spine.rotation.x = 0.55 * b; J.hpL.rotation.x = J.hpR.rotation.x = -0.5 * b; J.knL.rotation.x = J.knR.rotation.x = 0.9 * b; J.pelvis.position.y -= 0.16 * b;
  J.shL.rotation.x = J.shR.rotation.x = -0.9 * b - 0.2; J.elL.rotation.x = J.elR.rotation.x = -0.5; J.shL.rotation.z = -0.25; J.shR.rotation.z = 0.25; breathe(T, t); }
// la sala del efecto foco: aparece en «creemos», mira (todos → la mitad → uno de cada cuatro) y se va en «nadie te mira»
const LOOK_HALF = [0, 2, 5, 7, 8, 10, 13, 15], LOOK_QUARTER = [2, 5, 8, 15];
function animAud(t) { CAST.lines.forEach(l => { l.visible = false; }); const vis = win(t, TL.creemos - 0.25, 0.5) * (1 - win(t, TL.nadie + 0.05, 0.6)); const desk = pop(t, TL.clase - 0.12, 0.45) * (1 - win(t, TL.nadie + 0.05, 0.6));
  const Ap = CAST.A.getWorldPosition(new THREE.Vector3()).add(_v(0, 1.2, 0)), half = win(t, TL.mitad - 0.1, 0.3), quarter = win(t, TL.vio - 0.05, 0.3), allK = win(t, TL.mundo - 0.1, 0.5);
  CAST.aud.forEach((p, i) => { p.visible = vis > 0.01; p.userData.seat.visible = vis > 0.01; CAST.desks[i].visible = desk > 0.01; CAST.desks[i].scale.setScalar(Math.max(0.0001, desk));
    if (!p.visible) return; const h = p.userData.home; p.position.set(h.x, h.y - 1.4 * (1 - eo(vis)), h.z); poseReset(p); poseSit(p, 0.12); p.updateMatrixWorld(true);
    // a quién mira: en L4 todos; en «la mitad», 8; en «uno de cada cuatro», 4; el resto, al pupitre
    const lk = LOOK_HALF.includes(i), lq = LOOK_QUARTER.includes(i);
    let m = allK; m = lerp(m, lk ? 1 : 0, half); m = lerp(m, lq ? 1 : 0, quarter); m *= vis;
    const ph = hash(i * 2.3) * 6; lookAtP(p, Ap, m); p.userData.J.head.rotation.x += (1 - m) * 0.45; p.userData.J.head.rotation.y += (1 - m) * Math.sin(t * 0.7 + ph) * 0.2;
    EYEM[i].emissiveIntensity = 4.5 * m * (0.85 + 0.15 * Math.sin(t * 3 + ph));
    // la línea de la mirada: de la cabeza al pecho de A (crece al empezar a mirar)
    const L = CAST.lines[i]; L.visible = m > 0.01; if (L.visible) { const a = p.userData.J.head.getWorldPosition(new THREE.Vector3()).add(_v(0, 0.08, 0)), b = Ap.clone().add(_v((hash(i) - 0.5) * 0.12, -0.25 + (hash(i * 3) - 0.5) * 0.2, 0)), d = b.clone().sub(a), len = d.length() * eo(clamp(m * 1.3));
      L.position.copy(a); L.quaternion.setFromUnitVectors(_v(0, 1, 0), d.normalize()); L.scale.set(0.006, len, 0.006); L.material.opacity = 0.75 * m; } });
  CAST.audL.I = 0.55 * vis; }
// el foco de teatro: cae del techo en «foco», se apaga después de «nadie te mira»
function animSpot(t) { const S0 = S.spot, k = darkK(t), dn = pop(t, TL.foco - 0.12, 0.35) * (1 - win(t, TL.nadie + 0.4, 0.6));
  S0.g.visible = dn > 0.003; S0.body.position.y = HO.H1 - 0.12 + (1 - dn) * 0.3; S0.body.scale.setScalar(Math.max(0.0001, dn));
  const on = win(t, TL.foco, 0.06) * (1 - win(t, TL.nadie + 0.2, 0.7)); S0.sp.intensity = 38 * on; S0.lens.material.emissiveIntensity = 6 * on; S0.cone.material.uniforms.k.value = on; S0.cone.visible = on > 0.01; }
// la trampilla: se abre en «el escalón torcido» (luz cálida que baja) y se cierra en «mándaselo»
function animHatch(t) { const o = eio(seg(t, TL.escalon9 - 0.1, TL.escalon9 + 0.7)) * (1 - eio(seg(t, TL.manda + 0.15, TL.manda + 0.7)));
  for (const h of S.H.hatch) h.piv.rotation.z = -h.s * 1.85 * o; S.hsrc.I = 5.5 * o; S.hatchK = o;
  S.shaft.visible = o > 0.01; S.shaft.material.uniforms.k.value = o; S.hsp.intensity = 26 * o; }
// el brillo que recorre el bloque perfecto al pulirlo
function animGlint(t) { const g = S.glint, ts = t > 30 ? t - END : t, ph = ((ts + 0.2) % 2.4) / 2.4, k = Math.sin(clamp(ph / 0.35) * Math.PI) * (1 - darkK(t) * 0.6) * (CAST.A.visible || CAST.B.visible ? 1 : 0);
  const bp = blockPos(t); g.position.copy(bp).add(_v(-0.16 + 0.32 * clamp(ph / 0.35), 0.075, 0.12)); g.material.opacity = 0.95 * k; g.scale.setScalar(0.12 + 0.18 * k); g.material.rotation = ts * 0.8; }
// estaciones por la ventana y en la isla
function animSeason(t, n) { const s = t > TL.rw0 && t < TL.gr1 + 0.5 ? SEAS0 - 4 + 4 * n / ST.N : SEAS0; seasonAt(S, s); }
function animAt(t, st) {
  const n = stairN(t); stairsAt(n, t);
  counterDraw(S.cnt, { txt: 'DÍA ' + dayOf(n) }); S.cnt.material.opacity = clamp((st.p.distanceTo(S.cnt.position) - 4.5) / 1.5) * (1 - 0.9 * darkK(t)); S.cnt.visible = S.cnt.material.opacity > 0.01;
  papersAt(t > TL.rw0 && t < TL.gr1 + 0.5 ? clamp(n / ST.N) : 1);
  animSeason(t, n); animA(t); animB(t); animT(t, n); animAud(t); animSpot(t); animHatch(t); animGlint(t);
  S.block.position.copy(blockPos(t)); S.block.rotation.y = 0;
  S.lamp.bulbM.emissiveIntensity = 3.0 * lampK(t);
}
