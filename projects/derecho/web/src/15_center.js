// ---------------------------------------------------------------- el centro: el mazo y los 100 estudiantes (L1), la vitrina con la toga (L2),
// el campo de los que empiezan la carrera (L3) y los códigos que acaban en la balanza (L4).
const SP = 0.06;                                   // separación entre figuritas (la rejilla de 100 forma parte del campo)
const GOLD3 = [23, 56, 81];                        // los tres que llegan (posiciones en la rejilla 10×10)
const FN = 163, GRID0 = 77;                        // campo de 163×163 (= 26.569 ≈ más de veintiséis mil); la rejilla son las casillas 77…86
const GB = { c0: 85, c1: 108, r0: 43, r1: 66 };    // bloque dorado de 24×24 = 576 (≈ menos de seiscientas plazas)
const gridPos = i => v3(((i % 10) - 4.5) * SP, 0, (Math.floor(i / 10) - 4.5) * SP);
const T_HIT = 0.3;
const _o = new THREE.Object3D(), _up = v3(0, 1, 0), _ax = new THREE.Vector3(), _col = new THREE.Color();
const C_CER = new THREE.Color(0xe6e1d8), C_GREY = new THREE.Color(0x3d3c3f), C_GOLD = new THREE.Color(0xffc24a), C_DIM = new THREE.Color(0x2a2a2e);
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  // rejilla de 100 (figuritas detalladas) + birretes
  const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  S.grid = new THREE.InstancedMesh(studentGeo(false), gm, 100); S.grid.castShadow = true; S.grid.receiveShadow = true; S.grid.frustumCulled = false;
  for (let i = 0; i < 100; i++) S.grid.setColorAt(i, C_CER); Z.add(S.grid);
  S.caps = new THREE.InstancedMesh(capGeo(), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5 }), 100); S.caps.castShadow = true; S.caps.frustumCulled = false; Z.add(S.caps);
  S.gold3 = GOLD3.map(i => { const g = new THREE.Group(); const f = mesh(studentGeo(false), M.gold); g.add(f); const tg = toga(0.05, false); tg.position.y = 0.004; tg.visible = false; g.add(tg); g.userData.toga = tg;
    const lc = lightCone(0.05, 0.9, 0.22, 0xffd58a); g.add(lc); g.userData.cone = lc; g.position.copy(gridPos(i)); Z.add(g); return g; });
  // el mazo gigante y el anillo de la onda
  S.gav = gavel(0.95); Z.add(S.gav);
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.shock.rotation.x = -Math.PI / 2; S.shock.position.y = 0.004; Z.add(S.shock);
  S.dust = sparks(Z, 220, 0xffe0b0, 0.03);
  // vitrina con la toga y el diploma
  S.vit = vitrine(0.34, 0.66); S.vit.position.set(0, 0, -0.72); Z.add(S.vit);
  const stand = grp(at(cyl(0.006, 0.006, 0.5, M.brass, 10), 0, 0.33, 0), at(cyl(0.004, 0.004, 0.2, M.brass, 8), 0, 0.57, 0, 0, 0, Math.PI / 2), at(cyl(0.05, 0.05, 0.01, M.brass, 24), 0, 0.085, 0));
  const tg = toga(0.46, true); tg.position.y = 0.11; S.vit.add(stand, tg); S.vit.userData.toga = tg;
  S.dip = new THREE.Group(); Z.add(S.dip);
  const roll = cyl(0.014, 0.014, 0.3, M.paper, 20); roll.rotation.z = Math.PI / 2; S.dip.add(roll);
  const dpt = canvasTex(1024, 360, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b08a3e'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '700 46px Inter'; g.fillText('TÍTULO UNIVERSITARIO OFICIAL DE', w / 2, 110); g.font = '900 104px Inter'; g.fillText('GRADO EN DERECHO', w / 2, 225); g.font = '500 34px Inter'; g.fillText('240 créditos ECTS', w / 2, 300); });
  S.dipP = mesh(new THREE.PlaneGeometry(0.3, 0.105), new THREE.MeshStandardMaterial({ map: dpt, roughness: 0.8, side: THREE.DoubleSide }), false); S.dipP.position.y = -0.06; S.dip.add(S.dipP);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 8, 20), plastic(0x8e1418, 0.3)); rib.rotation.y = Math.PI / 2; S.dip.add(rib); S.dip.userData.rib = rib;
  // el campo (figuritas sencillas, miles) y su resplandor dorado
  const idx = []; for (let r = 0; r < FN; r++) for (let c = 0; c < FN; c++) if (!(c >= GRID0 && c < GRID0 + 10 && r >= GRID0 && r < GRID0 + 10)) idx.push([c, r]);
  S.field = new THREE.InstancedMesh(studentGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), idx.length); S.field.frustumCulled = false; S.field.receiveShadow = true;
  S.field.userData.cells = idx; for (let i = 0; i < idx.length; i++) S.field.setColorAt(i, C_CER); Z.add(S.field);
  const gx = ((GB.c0 + GB.c1) / 2 - 81.5) * SP, gz = ((GB.r0 + GB.r1) / 2 - 81.5) * SP, gw = (GB.c1 - GB.c0 + 1) * SP;
  S.gglow = new THREE.Mesh(new THREE.PlaneGeometry(gw * 1.08, gw * 1.08), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); r.addColorStop(0, 'rgba(255,200,90,.9)'); r.addColorStop(0.6, 'rgba(255,180,60,.35)'); r.addColorStop(1, 'rgba(255,170,50,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  S.gglow.rotation.x = -Math.PI / 2; S.gglow.position.set(gx, 0.003, gz); Z.add(S.gglow); S.gcenter = v3(gx, 0, gz);
  // los códigos, la balanza y el libro abierto
  const BK = [[0x6e1414, 'CÓDIGO CIVIL'], [0x173d2a, 'CÓDIGO PENAL'], [0x1b2a4a, 'CONSTITUCIÓN'], [0x4a2a14, 'ENJUICIAMIENTO'], [0x2a1a2e, 'C. DE COMERCIO'], [0x14361f, 'E. TRABAJADORES']];
  S.books = BK.map(([c, n], k) => { const b = book(0.2, 0.28, 0.05, c, n, 'BOE'); b.userData.k = k; Z.add(b); return b; });
  S.flip = []; for (let k = 0; k < 9; k++) { const p = mesh(new THREE.PlaneGeometry(0.19, 0.27), new THREE.MeshStandardMaterial({ map: paperTex((g, w, h) => textLines(g, 40, 60, w - 80, 26, 22, 'rgba(40,36,30,.5)', k)), roughness: 0.85, side: THREE.DoubleSide }), false); p.geometry.translate(0.095, 0, 0); const pv = new THREE.Group(); pv.add(p); Z.add(pv); S.flip.push(pv); }
  S.sc = scales(0.95); S.sc.position.set(0, 0, -0.25); Z.add(S.sc);
  S.ob = openBook(0.34, 0.46, 0x6e1414, (g, w, h) => { g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '800 30px Inter'; g.fillText('TÍTULO PRELIMINAR', 70, 80); g.fillText('Artículo 1', w / 2 + 60, 80); textLines(g, 70, 120, w / 2 - 130, 22, 24, 'rgba(40,36,30,.5)', 3); textLines(g, w / 2 + 60, 120, w / 2 - 130, 22, 24, 'rgba(40,36,30,.5)', 7); });
  const lect = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.34), M.wood); lect.position.y = 0.18; S.lect = grp(lect); S.lect.add(S.ob); S.ob.position.set(0, 0.37, 0); S.ob.rotation.x = 0.32;
  S.lect.position.set(0, 0, 0.55); Z.add(S.lect);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
}
function fallState(i, t) {       // ángulo de caída (0 = de pie) de la figurita i de la rejilla
  const P = gridPos(i), dist = Math.hypot(P.x, P.z), dl = T_HIT + dist / 2.8 + hash(i * 3.7) * 0.05;
  let u = clamp((t - dl) / 0.26), th = Math.PI / 2 * 0.94 * u * u;
  if (u >= 1) th -= 0.1 * Math.sin(Math.PI * clamp((t - dl - 0.26) / 0.22)) * Math.exp(-(t - dl - 0.26) * 6);
  const up = clamp((t - (K.y2 + 0.05 + hash(i * 5.1) * 0.45)) / 0.32); th *= 1 - eio(up);
  return { th, slide: 0.025 * clamp(u) * (1 - eio(up)), lie: clamp(u) * (1 - eio(up)) };
}
function centerAt(t, st) {
  const Z = S.ctr, vis = t < K.dentro4 + 0.9 || t > K.si16 - 1.5; Z.visible = vis; if (!vis) return;
  // ---- el mazo: baja acelerando, golpea (onda, polvo, temblor), rebota y se va; al final vuelve a bajar hasta la pose del principio
  const yRest = 0.0, yTop = 0.62;
  let gy = yTop * (1 - clamp(t / T_HIT) * clamp(t / T_HIT)) + yRest * 0;
  if (t > T_HIT) { const u = t - T_HIT; gy = 0.05 * Math.abs(Math.sin(u * 14)) * Math.exp(-u * 9); }
  gy += eio(clamp((t - 1.25) / 0.9)) * 2.8;                                 // se levanta y sale
  if (t > K.si16) gy = 2.8 - (2.8 - yTop) * eio(clamp((t - (END - 2.2)) / 2.2)) - 0; // vuelve desde arriba hasta la pose inicial
  S.gav.position.set(0.0, 0.08 + gy, 0.02); S.gav.rotation.set(0, 0.35, 0); S.gav.visible = gy < 2.7;
  const ush = t - T_HIT; S.shock.visible = ush > 0 && ush < 0.9; if (S.shock.visible) { const e = eo(clamp(ush / 0.85)); S.shock.scale.setScalar(0.1 + e * 1.9); S.shock.material.opacity = 0.85 * (1 - e); }
  S.dust.visible = ush > 0 && ush < 1.6; if (S.dust.visible) { burst(S.dust, v3(0, 0.02, 0), t, T_HIT, 0.45, 1.5, false, 0.7); S.dust.material.opacity = 1 - clamp(ush / 1.6); }
  // ---- la rejilla: caen 97 (se apagan en gris), quedan 3 dorados (con toga a partir de «jueces»); con «Y ninguno…» todos de pie y con birrete
  const fieldSink = win(t, K.crees4 - 0.1, 0.7) * (1 - win(t, K.si16 + 0.3, 0.8));
  const capK = pop(t, K.carrera2 - 0.05, 0.4) * (1 - win(t, K.crees4 - 0.1, 0.4));
  for (let i = 0; i < 100; i++) {
    const P = gridPos(i), f = fallState(i, t), isG = GOLD3.includes(i) && t > T_HIT && t < K.y2 + 0.1;
    let th = GOLD3.includes(i) ? 0 : f.th, lie = GOLD3.includes(i) ? 0 : f.lie;
    const d = Math.hypot(P.x, P.z) > 1e-4 ? v3(P.x, 0, P.z).normalize() : v3(1, 0, 0); _ax.set(d.z, 0, -d.x);
    _o.position.copy(P).addScaledVector(d, f.slide); _o.position.y = 0.011 * Math.sin(th) - fieldSink * 0.09; _o.quaternion.setFromAxisAngle(_ax, th);
    const sc = isG ? 0.0001 : 1; _o.scale.setScalar(sc); _o.updateMatrix(); S.grid.setMatrixAt(i, _o.matrix);
    _col.copy(C_CER).lerp(C_GREY, lie); if (t > K.plazas3 && t < K.dentro4 + 1) _col.lerp(C_DIM, win(t, K.menos3, 0.5)); S.grid.setColorAt(i, _col);
    _o.scale.setScalar(Math.max(0.0001, capK) * (isG ? 0 : 1)); _o.updateMatrix(); S.caps.setMatrixAt(i, _o.matrix);
  }
  S.grid.instanceMatrix.needsUpdate = true; S.grid.instanceColor.needsUpdate = true; S.caps.instanceMatrix.needsUpdate = true; S.caps.visible = capK > 0.002;
  const gk = t > T_HIT + 0.05 && t < K.y2 + 0.1;
  S.gold3.forEach((g, n) => { g.visible = gk; if (!gk) return; const k = pop(t, K.tres1 - 0.05 + n * 0.08, 0.4); g.scale.setScalar(1 + 0.25 * k);
    g.userData.cone.material.uniforms.op.value = 0.22 * k * (1 - win(t, K.y2 - 0.2, 0.3)); const tk = pop(t, K.jueces1 + n * 0.1, 0.35); g.userData.toga.visible = tk > 0.01; g.userData.toga.scale.setScalar(Math.max(0.001, tk)); });
  // ---- la vitrina (L2): sube del suelo, se cierra con luz roja; el diploma se desenrolla con «carrera»
  const vk = win(t, K.y2 - 0.1, 0.5) * (1 - win(t, K.cada3 - 0.2, 0.5));
  S.vit.visible = vk > 0.01; S.vit.position.y = -0.85 * (1 - vk);
  if (S.vit.visible) { const led = S.vit.userData.led; const on = t > K.ninguno2 ? 1 : 0; led.material.emissiveIntensity = 3 * on * (0.6 + 0.4 * Math.sin(t * 9)); }
  const dk = win(t, K.carrera2 - 0.25, 0.35) * (1 - win(t, K.cada3 - 0.3, 0.3));
  S.dip.visible = dk > 0.01; if (S.dip.visible) { S.dip.position.set(0, 0.2 + 0.03 * Math.sin(t * 2), 0.12); S.dip.rotation.set(-0.15, 0, 0); const uk = eo(clamp((t - K.carrera2) / 0.45)); S.dipP.scale.set(Math.max(0.001, uk), 1, 1); S.dipP.visible = uk > 0.01; S.dip.userData.rib.visible = uk < 0.1; S.dip.scale.setScalar(dk); }
  // ---- el campo (L3): aparece en ola desde la rejilla; con «Plazas…» se enciende el bloque dorado y el resto se apaga
  const fv = t > K.cada3 - 0.2 && t < K.realidad4; S.field.visible = fv;
  if (fv) {
    const cells = S.field.userData.cells, t0 = K.cada3 - 0.1, gOn = win(t, K.plazas3 - 0.05, 0.4), dim = win(t, K.menos3 - 0.1, 0.6);
    for (let i = 0; i < cells.length; i++) {
      const [c, r] = cells[i], x = (c - 81.5) * SP, z = (r - 81.5) * SP, dist = Math.hypot(x, z), k = pop(t, t0 + dist / 3.6 + hash(i * 0.37) * 0.12, 0.3);
      _o.position.set(x, -fieldSink * 0.09, z); _o.quaternion.identity(); _o.scale.setScalar(Math.max(0.0001, k)); _o.updateMatrix(); S.field.setMatrixAt(i, _o.matrix);
      const inG = c >= GB.c0 && c <= GB.c1 && r >= GB.r0 && r <= GB.r1;
      _col.copy(C_CER); if (inG) _col.lerp(C_GOLD, gOn); else _col.lerp(C_DIM, dim * 0.85); S.field.setColorAt(i, _col);
    }
    S.field.instanceMatrix.needsUpdate = true; S.field.instanceColor.needsUpdate = true;
  }
  S.gglow.visible = fv; S.gglow.material.opacity = 0.75 * win(t, K.plazas3, 0.5) * (1 - fieldSink);
  // ---- los códigos (L4): suben apilados; con «memorizar» las hojas pasan solas; con «En realidad» vuelan a la balanza y gana un lado
  const bk = win(t, K.crees4 - 0.15, 0.5), fly = win(t, K.realidad4 - 0.05, 0.55), tilt = (eio(clamp((t - K.ganar4 + 0.05) / 0.45)) * 0.24 + 0.03 * Math.sin(clamp((t - K.ganar4 - 0.4) / 0.6) * Math.PI * 2) * Math.exp(-Math.max(0, t - K.ganar4 - 0.4) * 3)) * (t > K.ganar4 - 0.1 ? 1 : 0);
  const scK = win(t, K.realidad4 - 0.3, 0.5); S.sc.visible = scK > 0.01 && t < K.dentro4 + 0.9; S.sc.position.y = -1.3 * (1 - scK); scalesTilt(S.sc, tilt);
  const pans = S.sc.userData.pans.map(p => { p.updateWorldMatrix(true, false); return p.localToWorld(v3(0, -0.42, 0)); });
  S.books.forEach((b, k) => {
    b.visible = bk > 0.01 && t < K.dentro4 + 0.9; if (!b.visible) return;
    const A = v3(0, 0.025 + k * 0.052 - 0.4 * (1 - bk), 0.05), side = k % 2, lvl = Math.floor(k / 2), Bp = pans[side].clone().add(v3(0, 0.02 + lvl * 0.034, 0));
    const f = clamp((fly - k * 0.06) / 0.7), e = eio(f); b.position.lerpVectors(A, Bp, e); b.position.y += Math.sin(e * Math.PI) * 0.25;
    b.rotation.set(-Math.PI / 2, 0, (k - 2.5) * 0.12 * (1 - e) + e * (side ? 0.2 : -0.2) + Math.sin(e * Math.PI) * 1.2 * (side ? 1 : -1)); b.scale.setScalar(1 - 0.38 * e);
  });
  const fk = win(t, K.memorizar4 - 0.1, 0.2) * (1 - win(t, K.realidad4 - 0.1, 0.15));
  S.flip.forEach((p, k) => { p.visible = fk > 0.01; if (!p.visible) return; const top = v3(-0.095, 0.025 + 6 * 0.052 + 0.004, 0.05); const ph = ((t * 3.2 + k / 9) % 1); p.position.copy(top); p.rotation.set(-Math.PI / 2 + 0, 0, 0); p.rotateY(-Math.PI * eio(ph)); p.children[0].material.opacity = 1; });
  const lk = win(t, K.ellas4 - 0.2, 0.5); S.lect.visible = lk > 0.01 && t < K.dentro4 + 0.9; S.lect.position.y = -0.8 * (1 - lk);
  S.ctrCone.material.uniforms.op.value = 0.05 * (t < K.dentro4 + 0.5 ? 1 : 0);
}
