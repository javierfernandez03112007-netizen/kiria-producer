// ---------------------------------------------------------------- lo que pasa en cada instante: cielo, rayos, espectro, ojo, gafas desmontadas, ondas, vaho, fotones y colores
const HP = {};                     // gafas grandes (las del despiece) y las de espejo del duelo final
const EYE_P = v3(3.4, 2.75, 2.0), SNOW_HIT = v3(3.4, 0, 2.0);
const F10 = v3(1.9, 0.15, 1.3).normalize();
const P2G = v3(4.2, 1.3, -1.4), F2G = v3(1, -0.2, -0.05).normalize();      // gafas en la bajada nublada (posición y frente)
const qFacing = F => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(F, v3(0, 0, 0), v3(0, 1, 0)));
let Q_DOWN, Q_10;
let HG_P, HG_F, HG_Q;              // posición, frente (hacia la nieve) y orientación de las gafas grandes
const EXP = { mirror: 0.1, tint: 0.042, pol: -0.018, inner: -0.075, frame: -0.135 };    // despiece (en metros a tamaño real)
function buildProps() {
  HG_F = v3(0, -1, 0); HG_P = EYE_P.clone().addScaledVector(HG_F, 1.0);
  { const z = v3(0, -1, 0), x = v3(0.47, 0, -0.88).normalize(), y = z.clone().cross(x); Q_DOWN = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); }
  Q_10 = qFacing(F10);
  const hero = buildGoggles(4, 'hero'); hero.position.copy(HG_P); hero.quaternion.copy(Q_DOWN); scene.add(hero); HP.hero = hero; HG_Q = Q_DOWN.clone();
  HP.L = hero.userData.L; HP.L.frameG = new THREE.Group(); for (const o of [HP.L.frame, HP.L.foam, HP.L.strap, HP.L.vents]) { hero.remove(o); HP.L.frameG.add(o); } hero.add(HP.L.frameG);
  const duel = buildGoggles(4, 'mini'); scene.add(duel); HP.duel = duel; setLens(duel.userData.L.mirror.material, 'blueMirror');
  // rayos del despiece (en coordenadas de las gafas: entran por +z y van hacia el ojo, −z)
  HP.rays = []; const RZ0 = 0.3, RZ1 = -0.22;
  for (let i = 0; i < 12; i++) {
    const x = (hash(i * 3.3) - 0.5) * 0.12, y = (hash(i * 5.1) - 0.5) * 0.05, kind = i < 3 ? 'ref' : i < 6 ? 'uv' : i < 8 ? 'pol' : 'ok';
    const col = kind === 'uv' ? UVC : 0xffd98a, a = v3(x, y, RZ0), b = v3(x, y, RZ1);
    const l = beam(segPts(a, b, 60), col, kind === 'uv' ? 4.2 : 4.6, kind === 'uv'); hero.add(l); pulseOn(l, kind === 'uv' ? UVC : 0xffe6a8, 2, 0.55);
    let rb = null; if (kind === 'ref') { rb = beam(segPts(v3(x, y, EXP.mirror), v3(x + 0.09, y + 0.05, RZ0 + 0.08), 30), 0xffb24a, 4.2); hero.add(rb); pulseOn(rb, 0xffc070, 1, 0.7); }
    HP.rays.push({ l, rb, kind, x, y });
  }
  // marcadores de impacto (pequeños destellos donde se para la luz)
  HP.hits = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.7, 1).multiplyScalar(2.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 12);
  HP.hits.frustumCulled = false; scene.add(HP.hits);
  // silueta de la lente para la máscara (lo que se ve a través de ella)
  HP.mask = new THREE.Mesh(lensGeo(0.002), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false, depthWrite: false })); HP.mask.matrixAutoUpdate = false; maskScene.add(HP.mask);
}
// estado de la cámara de aire, colores, etc. según el tiempo
function heroPose(t) {     // despiece vertical bajo el ojo (mirando a la nieve) → de frente a la cámara (sol) → bajada nublada → de frente (duelo)
  const p = HG_P.clone(), q = Q_DOWN.clone();
  q.slerp(Q_10, eio(win(t, K.color10 - 0.3, 1.1)));
  const toSlope = win(t, K.dias11 - 0.6, 1.0);        // y se quedan en la pista para el duelo final
  if (toSlope > 0) { p.lerp(P2G, eio(toSlope)); q.slerp(qFacing(F2G), eio(toSlope)); }
  return { p, q };
}
function propsAt(t) {
  NOW = t;
  // ---- mundo: «espacio» al subir al sol, estudio oscuro en el despiece, nublado en el día de niebla
  const space = 0.55 * win(t, K.luz3 - 0.4, 1.2) * (1 - win(t, K.nieve4 - 0.3, 0.9));
  const dark = win(t, K.vamos5 - 0.1, 0.9) * (1 - win(t, K.color10 - 0.3, 1.0));
  const over = win(t, K.dias11 - 0.5, 1.3) * (1 - win(t, K.moda12, 1.4));
  worldAt(t, { space, dark, over, focus: t < K.color10 ? v3(0, 0, 0) : HG_P });
  skierAt(t, dark < 0.99 ? 1 : 0);
  // ---- L1: rayos del cielo y del suelo hacia las gafas del esquiador
  const sg = wpos(SK.gog);
  LI.sky.forEach((l, i) => { const k = win(t, K.cielo1 - 0.35 + i * 0.05, 0.55) * (1 - win(t, K.porque2 + 0.4, 0.5)); drawK(l, k); l.material.opacity = 1; });
  LI.ground.forEach(([l1, l2], i) => { const k = win(t, K.suelo1 - 0.45 + i * 0.05, 0.45), k2 = win(t, K.suelo1 - 0.05 + i * 0.05, 0.4), out = 1 - win(t, K.porque2 + 0.4, 0.5); drawK(l1, k * out); drawK(l2, k2 * out); });
  // ---- L2: la lente de las gafas del esquiador: naranja → espejo
  { const k = win(t, K.espejo2 - 0.15, 0.35) * (1 - win(t, K.final2, 0.6)); setLens(SK.gog.userData.L.mirror.material, 'orangeMirror', 'blueMirror', k); }
  // ---- L3: rayo blanco → cristal de hielo → colores; la ultravioleta aparte
  { const k0 = win(t, K.luz3 - 0.2, 0.7), out = 1 - win(t, K.ojos4 - 0.2, 0.6); drawK(LI.white, k0 * out); LI.prism.visible = k0 * out > 0.01; setOp(LI.prism, k0 * out);
    LI.spec.forEach((l, i) => { const k = i < 7 ? win(t, K.colores3 - 0.35 + i * 0.05, 0.6) : win(t, K.ultra3 - 0.25, 0.5); drawK(l, k * out); }); }
  // ---- L4: la nieve devuelve la ultravioleta (8 de cada 10 rayos) y llega al ojo, que se quema
  LI.uvUp.forEach(([d, u, back], i) => { const k = win(t, K.nieve4 - 0.3 + i * 0.03, 0.4), k2 = back ? win(t, K.devuelve4 - 0.1 + i * 0.04, 0.45) : 0, out = 1 - win(t, K.vamos5, 0.5); drawK(d, k * out); drawK(u, k2 * out); });
  { const k = win(t, K.nieve4 - 0.6, 0.6) * (1 - win(t, K.color10 - 0.6, 0.8)); LI.eye.visible = k > 0.01; show(LI.eye, Math.max(0.0001, k) * 0.55);
    const burn = win(t, K.quema4 - 0.1, 0.6) * (1 - win(t, K.vamos5 + 0.2, 0.6)); LI.eye.userData.burn.material.opacity = 0.32 * burn; LI.eye.userData.cornea.material.emissiveIntensity = 2.2 * burn; }
  // ---- L5–L9: las gafas grandes llegan, se desmontan y cada capa hace lo suyo con la luz
  const H = HP.hero, L = HP.L, pose = heroPose(t);
  const kin = win(t, K.vamos5 - 0.35, 0.8), kout = 1 - win(t, END - 1.4, 0.7);
  H.visible = kin * kout > 0.01; H.position.copy(pose.p).add(v3(-1.4, -0.5, 2.2).multiplyScalar(1 - eo(kin)));
  { const face = 1 - win(t, K.desmontar5 - 0.15, 0.8); H.quaternion.copy(pose.q); if (face > 0.001) H.quaternion.slerp(qFacing(v3(2.6, 0.6, 1.6).normalize()), eio(face)); H.rotateY((1 - eo(kin)) * 1.2); }   // llegan enseñando la lente naranja y giran hacia la nieve al desmontarse
  const ex = win(t, K.desmontar5 - 0.1, 1.0) * (1 - win(t, K.color10 - 0.2, 0.9));
  for (const k of ['mirror', 'tint', 'pol', 'inner']) L[k].position.z = EXP[k] * eio(ex);
  L.frameG.position.z = EXP.frame * eio(ex);
  for (const k of ['mirror', 'tint', 'pol', 'inner']) { const e = L[k].userData.edge; e.material.opacity = 0.9 * ex; e.visible = ex > 0.01; }
  // resaltar la capa de la que se habla
  const hl = { mirror: cw(t, K.fuera6, K.detras7), tint: cw(t, K.detras7, K.polar8), pol: cw(t, K.polar8, K.final9), inner: cw(t, K.final9, K.color10) };
  for (const k in hl) { const e = L[k].userData.edge; if (!e.visible) continue; e.material.color.setHex(hl[k] > 0.5 ? 0xffd27a : 0xe6ecf2); e.material.linewidth = 1.6 + 1.8 * hl[k]; }
  L.pol.material.opacity = 0.9 * Math.max(win(t, K.polar8 - 0.2, 0.5) * (1 - win(t, K.final9, 0.5)), 0.12 * ex);
  // color de la lente: naranja espejo → (sol) gris / plata → (niebla) naranja, amarillo, rosa → naranja
  { const m = L.mirror.material, tm = L.tint.material;
    let a = 'orangeMirror', b = 'orangeMirror', k = 0;
    if (t > K.gris10 - 0.2) { a = 'orangeMirror'; b = 'silver'; k = win(t, K.gris10 - 0.2, 0.4); }
    if (t > K.naranja11 - 0.2) { a = 'silver'; b = 'orange'; k = win(t, K.naranja11 - 0.2, 0.35); }
    if (t > K.amarillo11 - 0.15) { a = 'orange'; b = 'yellow'; k = win(t, K.amarillo11 - 0.15, 0.3); }
    if (t > K.rosa11 - 0.15) { a = 'yellow'; b = 'rose'; k = win(t, K.rosa11 - 0.15, 0.3); }
    if (t > K.frenan11 - 0.1) { a = 'rose'; b = 'orange'; k = win(t, K.frenan11 - 0.1, 0.4); }
    setLens(m, a, b, k);
    tm.color.copy(m.color); tm.opacity = 0.35 + 0.25 * (1 - m.metalness); }
  // rayos del despiece
  const kr = win(t, K.fuera6 - 0.3, 0.7) * (1 - win(t, K.color10 - 0.3, 0.5));
  let hi = 0; const M = new THREE.Matrix4(), hits = [];
  HP.rays.forEach((r, i) => {
    const front = 0.3, zm = EXP.mirror * eio(ex), zt = EXP.tint * eio(ex), zp = EXP.pol * eio(ex), stopZ = r.kind === 'ref' ? zm : r.kind === 'uv' ? zt : r.kind === 'pol' ? zp : -0.22;
    const stopAct = r.kind === 'ref' ? win(t, K.rebota6 - 0.1, 0.4) : r.kind === 'uv' ? win(t, K.frena7 - 0.1, 0.35) : r.kind === 'pol' ? win(t, K.deja8 - 0.15, 0.35) : 0;
    const zEnd = lerp(-0.22, stopZ, stopAct), frac = (front - zEnd) / (front + 0.22);
    drawK(r.l, kr * frac * (r.kind === 'uv' ? win(t, K.lente7 - 0.6, 0.6) + win(t, K.fuera6, 0.4) * 0.0 : 1) || 0);
    r.l.visible = kr > 0.01 && (r.kind !== 'uv' || t > K.lente7 - 0.6);
    if (r.rb) drawK(r.rb, kr * win(t, K.rebota6, 0.5));
    if (stopAct > 0.6 && kr > 0.1) hits.push([r.x, r.y, stopZ, r.kind]);
  });
  hits.forEach(([x, y, z, kind]) => { if (hi >= 12) return; const p = H.localToWorld(v3(x, y, z + 0.002)); const s = (kind === 'uv' ? 0.06 : 0.045) * (0.8 + 0.3 * Math.sin(t * 20 + x * 90)); M.compose(p, cam.quaternion, v3(s, s, s)); HP.hits.setMatrixAt(hi++, M); });
  HP.hits.count = hi; HP.hits.instanceMatrix.needsUpdate = true;
  // L8: ondas. Primero la luz vibra en todas direcciones; el reflejo del hielo, solo en horizontal; la rejilla vertical lo frena
  { const kw = win(t, K.reflejo8 - 0.4, 0.5) * (1 - win(t, K.final9 - 0.1, 0.4)), hor = win(t, K.horizontal8 - 0.2, 0.5), stop = win(t, K.deja8 - 0.1, 0.5);
    const A = H.localToWorld(v3(-0.025, 0.012, 0.3)), B = H.localToWorld(v3(-0.025, 0.012, -0.3)), X = v3(1, 0, 0).applyQuaternion(H.quaternion), Y = v3(0, 1, 0).applyQuaternion(H.quaternion);
    const zp = EXP.pol * eio(ex), cut = (0.3 - zp) / 0.6;
    LI.waves.forEach((l, i) => { const ang = i * Math.PI / 6 + t * 0.6 * (1 - hor), u = X.clone().multiplyScalar(Math.cos(ang)).addScaledVector(Y, Math.sin(ang));
      const keep = i === 0 ? 1 : 1 - hor, amp = 0.05 * (i === 0 ? 1 : 0.85), uu = i === 0 ? X.clone().multiplyScalar(Math.cos(ang * (1 - hor))).addScaledVector(Y, Math.sin(ang * (1 - hor))) : u;
      l.visible = kw * keep > 0.01; l.material.opacity = kw * keep; setWave(l, A, B, uu, amp, t * 9 + i, kw, i === 0 ? lerp(1, cut, stop) : 1); }); }
  // L9: vaho en la lente interior; la cámara de aire lo quita
  { const kd = win(t, K.segunda9 - 0.3, 0.5), gone = win(t, K.empane9 - 0.3, 0.8), D = L.drops, n = D.userData.n;
    D.visible = kd * (1 - gone) > 0.01; D.material.opacity = 0.7 * kd * (1 - gone); }
  // L10: 100 fotones contra la lente gris de categoría 3: pasan 18
  { const k = win(t, K.categoria10 - 0.3, 0.4) * (1 - win(t, K.dias11 - 0.2, 0.5)), ph = LI.ph; ph.visible = k > 0.01;
    if (ph.visible) { for (let i = 0; i < 100; i++) { const pass = i % 6 === 0 && i < 108; const x = ((i % 10) - 4.5) * 0.012, y = (Math.floor(i / 10) - 4.5) * 0.006;
        const ph0 = ((t * 0.7 + hash(i)) % 1), z = lerp(0.2, pass ? -0.3 : 0.004, ph0), fade = pass ? 1 : clamp((z - 0.0) / 0.04);
        const p = H.localToWorld(v3(x, y, z)), s = 0.0055 * k * (0.5 + 0.5 * fade) * (pass && z < 0 ? 1.4 : 1); M.compose(p, new THREE.Quaternion(), v3(s, s, s)); ph.setMatrixAt(i, M); }
      ph.instanceMatrix.needsUpdate = true; } }
  // L12: duelo naranja contra espejo
  { const k = win(t, K.tu12 - 0.3, 0.5) * (1 - win(t, END - 1.3, 0.6)), D = HP.duel; D.visible = k > 0.01; L.strap.visible = k > 0.01;
    if (D.visible) { const U = v3(0, 1, 0); D.position.copy(H.position).addScaledVector(U, 0.5 * eo(k)); D.quaternion.copy(H.quaternion); H.position.addScaledVector(U, -0.42 * eo(k)); D.rotateY(Math.sin(t * 0.8) * 0.12); D.scale.setScalar(4 * Math.max(0.0001, eo(k))); } }
  // cámara dentro de la montura (vista del esquiador): se quitan los cristales; el color lo pone el filtro de pantalla
  { const pov = win(t, K.dispersa11 - 0.5, 0.35) * (1 - win(t, K.moda12 - 0.35, 0.35)), pv = 1 - pov;
    L.mirror.material.opacity *= pv; L.tint.material.opacity *= pv; L.pol.material.opacity *= pv; L.inner.material.opacity = 0.22 * pv;
    for (const k of ['mirror', 'tint', 'pol', 'inner']) L[k].visible = pv > 0.01; }
  // vista a través de la lente naranja en la bajada nublada: vuelve el relieve
  { const kw = win(t, K.vuelves11 - 0.3, 0.6), k = (kw > 0 ? 1 : 0) * (1 - win(t, K.moda12 - 0.3, 0.5)), u = post.uniforms, w = lerp(-0.06, 1.06, kw);
    u.lensK.value = k; u.lensW.value = w; u.lensCol.value.set(1.0, 0.68, 0.38); u.lensCt.value = 1.75; RELIEF.uLensK.value = k; RELIEF.uLensW.value = w;
    H.updateMatrixWorld(true); HP.mask.matrix.copy(H.matrixWorld); HP.mask.visible = k > 0.001; }
}
