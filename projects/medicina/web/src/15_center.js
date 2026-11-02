// ---------------------------------------------------------------- el centro: el martillo de reflejos y las 100 figuritas con bata (L1), la vitrina con la bata de
// especialista (L2), los libros y los huesos → el negatoscopio (L3) y el campo de los que se presentan al MIR: plazas (L9) y los 500 primeros (L10)
const SP = 0.06;                                   // separación entre figuritas
const GOLD3 = [23, 56, 81];                        // las tres que quedan en pie (menos de 4 de cada 100)
const FN = 123, FG = 75, FD = 4;                   // campo de 123 × 123 = 15.129 (más de quince mil); 75 filas = 9.225 plazas; 4 filas = 492 (antes del 500)
const FSP = 0.06;
const gridPos = i => v3(((i % 10) - 4.5) * SP, 0, (Math.floor(i / 10) - 4.5) * SP);
const fieldPos = (c, r) => v3((c - 61) * FSP, 0, (61 - r) * FSP);     // fila 0 = delante (z +): los primeros números
const ME_C = 47, ME_R = 38;                        // «tu número» (EJEMPLO): fila 38, columna 47 → nº 4.722
const T_HIT = 0.3;
const _o = new THREE.Object3D(), _up = v3(0, 1, 0), _ax = new THREE.Vector3(), _col = new THREE.Color();
const C_COAT = new THREE.Color(0xf2f4f6), C_GREY = new THREE.Color(0x3d3c3f), C_GOLD = new THREE.Color(0xffc24a), C_DIM = new THREE.Color(0x26272b), C_DERM = new THREE.Color(0x8fe6ff), C_SKIN = new THREE.Color(0xe6d2bd);
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  // rejilla de 100 (cuerpo con bata + cabeza) y birretes
  const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.62, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5 });
  S.grid = new THREE.InstancedMesh(coatGeo(false), gm, 100); S.grid.castShadow = true; S.grid.receiveShadow = true; S.grid.frustumCulled = false;
  S.heads = new THREE.InstancedMesh(headGeo(false), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, clearcoat: 0.3 }), 100); S.heads.castShadow = true; S.heads.frustumCulled = false;
  for (let i = 0; i < 100; i++) { S.grid.setColorAt(i, C_COAT); S.heads.setColorAt(i, C_SKIN); } Z.add(S.grid, S.heads);
  S.caps = new THREE.InstancedMesh(capGeo(), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5 }), 100); S.caps.castShadow = true; S.caps.frustumCulled = false; Z.add(S.caps);
  S.gold3 = GOLD3.map(i => { const g = new THREE.Group(); g.add(mesh(coatGeo(false), M.gold)); g.add(mesh(headGeo(false), M.gold));
    const lc = lightCone(0.05, 0.9, 0.22, 0xffd58a); g.add(lc); g.userData.cone = lc; g.position.copy(gridPos(i)); Z.add(g); return g; });
  // el martillo de reflejos gigante y el anillo de la onda
  S.ham = reflexHammer(0.72); Z.add(S.ham);
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.shock.rotation.x = -Math.PI / 2; S.shock.position.y = 0.004; Z.add(S.shock);
  S.dust = sparks(Z, 220, 0xffe0b0, 0.018);
  // vitrina con la bata de especialista y el diploma del grado
  S.vit = vitrine(0.34, 0.66); S.vit.position.set(0, 0, -0.72); Z.add(S.vit);
  const stand = grp(at(cyl(0.006, 0.006, 0.5, M.brass, 10), 0, 0.33, 0), at(cyl(0.004, 0.004, 0.2, M.brass, 8), 0, 0.57, 0, 0, 0, Math.PI / 2), at(cyl(0.05, 0.05, 0.01, M.brass, 24), 0, 0.085, 0));
  const coat = labCoat(0.46); coat.position.y = 0.11; S.vit.add(stand, coat);
  const plq = plateText(0.2, 0.045, [['ESPECIALISTA', 0.62, 0.5]], { fg: '#e8c77a', bg: '#2b1a12', border: true }); plq.position.set(0, 0.11, 0.176); S.vit.add(plq);
  S.dip = new THREE.Group(); Z.add(S.dip);
  const roll = cyl(0.012, 0.012, 0.25, M.paper, 20); roll.rotation.z = Math.PI / 2; S.dip.add(roll);
  const dpt = canvasTex(1024, 360, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b08a3e'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '700 46px Inter'; g.fillText('TÍTULO UNIVERSITARIO OFICIAL DE', w / 2, 110); g.font = '900 98px Inter'; g.fillText('GRADO EN MEDICINA', w / 2, 225); g.font = '500 34px Inter'; g.fillText('360 créditos ECTS · 6 años', w / 2, 300); });
  S.dipP = mesh(new THREE.PlaneGeometry(0.24, 0.084), new THREE.MeshStandardMaterial({ map: dpt, roughness: 0.8, side: THREE.DoubleSide }), false); S.dipP.position.y = -0.06; S.dip.add(S.dipP);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 8, 20), plastic(0x8e1418, 0.3)); rib.rotation.y = Math.PI / 2; S.dip.add(rib); S.dip.userData.rib = rib;
  // los libros (con las hojas que pasan solas), los huesos y el negatoscopio
  const BK = [[0x6e1414, 'ANATOMÍA'], [0x173d2a, 'FISIOLOGÍA'], [0x1b2a4a, 'HISTOLOGÍA'], [0x4a2a14, 'BIOQUÍMICA'], [0x2a1a2e, 'PATOLOGÍA'], [0x14361f, 'FARMACOLOGÍA']];
  S.books = BK.map(([c, n], k) => { const b = book(0.2, 0.28, 0.05, c, n, ''); b.userData.k = k; Z.add(b); return b; });
  S.flip = []; for (let k = 0; k < 9; k++) { const p = mesh(new THREE.PlaneGeometry(0.19, 0.27), new THREE.MeshStandardMaterial({ map: paperTex((g, w, h) => { textLines(g, 40, 60, w - 80, 12, 22, 'rgba(40,36,30,.5)', k); g.strokeStyle = 'rgba(60,40,30,.55)'; g.lineWidth = 3; g.beginPath(); g.ellipse(w / 2, h * 0.68, 60, 110, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w / 2 - 20, h * 0.52); g.lineTo(w / 2 + 20, h * 0.84); g.stroke(); }), roughness: 0.85, side: THREE.DoubleSide }), false); p.geometry.translate(0.095, 0, 0); const pv = new THREE.Group(); pv.add(p); Z.add(pv); S.flip.push(pv); }
  S.skull = skull(1.15); S.skull.position.set(-0.36, 0, 0.12); Z.add(S.skull);
  S.bone = bone(1.0); S.bone.rotation.set(0, 0.4, Math.PI / 2); S.bone.position.set(0.34, 0.03, 0.16); Z.add(S.bone);
  S.lbox = lightbox(1.0); S.lbox.position.set(0, 0, -0.2); Z.add(S.lbox);
  S.mag = magnifier(0.8); Z.add(S.mag);
  S.ob = openBook(0.34, 0.46, 0x6e1414, (g, w, h) => { g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '800 30px Inter'; g.fillText('ATLAS DE ANATOMÍA', 70, 80); g.fillText('Lámina 1', w / 2 + 60, 80);
    g.strokeStyle = 'rgba(70,40,30,.75)'; g.lineWidth = 4; const cx = w / 4 + 10, cy = h * 0.58; g.beginPath(); g.arc(cx, cy - 190, 40, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx, cy - 150); g.lineTo(cx, cy + 60); g.stroke();
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(cx, cy - 100 + i * 16, 70 - Math.abs(i - 4) * 4, 7, 0, Math.PI, 0); g.stroke(); }
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 18, cy - 140); g.lineTo(cx + sd * 90, cy - 30); g.lineTo(cx + sd * 100, cy + 70); g.stroke(); g.beginPath(); g.moveTo(cx + sd * 25, cy + 70); g.lineTo(cx + sd * 40, cy + 220); g.lineTo(cx + sd * 42, cy + 300); g.stroke(); }
    g.beginPath(); g.ellipse(cx, cy + 70, 45, 22, 0, 0, 7); g.stroke(); textLines(g, w / 2 + 60, 120, w / 2 - 130, 22, 24, 'rgba(40,36,30,.5)', 7); });
  const lect = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.34), M.wood); lect.position.y = 0.18; S.lect = grp(lect); S.lect.add(S.ob); S.ob.position.set(0, 0.37, 0); S.ob.rotation.x = 0.32;
  S.lect.position.set(0, 0, 0.55); Z.add(S.lect);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
  // el campo del MIR: 15.129 figuritas sencillas (cuerpo y cabeza) y el resplandor de las plazas
  const n = FN * FN;
  S.field = new THREE.InstancedMesh(coatGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), n); S.field.frustumCulled = false; S.field.receiveShadow = true;
  S.fieldH = new THREE.InstancedMesh(headGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), n); S.fieldH.frustumCulled = false;
  for (let i = 0; i < n; i++) { S.field.setColorAt(i, C_COAT); S.fieldH.setColorAt(i, C_SKIN); } Z.add(S.field, S.fieldH);
  const glowT = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); r.addColorStop(0, 'rgba(255,200,90,.9)'); r.addColorStop(0.6, 'rgba(255,180,60,.35)'); r.addColorStop(1, 'rgba(255,170,50,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  S.gglow = new THREE.Mesh(new THREE.PlaneGeometry(FN * FSP * 1.05, FG * FSP * 1.12), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  S.gglow.rotation.x = -Math.PI / 2; S.gglow.position.set(0, 0.003, fieldPos(0, (FG - 1) / 2).z); Z.add(S.gglow);
  S.dline = new THREE.Mesh(new THREE.PlaneGeometry(FN * FSP * 1.02, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe6ff).multiplyScalar(3), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  S.dline.rotation.x = -Math.PI / 2; S.dline.position.set(0, 0.004, fieldPos(0, FD - 0.5).z); Z.add(S.dline);
  S.me = new THREE.Group(); S.me.add(mesh(coatGeo(false), M.gold)); S.me.add(mesh(headGeo(false), M.gold)); const mc = lightCone(0.06, 1.4, 0.3, 0xffd58a); S.me.add(mc); S.me.userData.cone = mc; S.me.position.copy(fieldPos(ME_C, ME_R)); Z.add(S.me);
}
function fallState(i, t) {       // ángulo de caída (0 = de pie) de la figurita i de la rejilla
  const P = gridPos(i), dist = Math.hypot(P.x, P.z), dl = T_HIT + dist / 2.8 + hash(i * 3.7) * 0.05;
  let u = clamp((t - dl) / 0.26), th = Math.PI / 2 * 0.94 * u * u;
  if (u >= 1) th -= 0.1 * Math.sin(Math.PI * clamp((t - dl - 0.26) / 0.22)) * Math.exp(-(t - dl - 0.26) * 6);
  const up = clamp((t - (K.y2 + 0.05 + hash(i * 5.1) * 0.45)) / 0.32); th *= 1 - eio(up);
  return { th, slide: 0.025 * clamp(u) * (1 - eio(up)), lie: clamp(u) * (1 - eio(up)) };
}
function centerAt(t, st) {
  const fieldOn = t > K.mas9 - 0.6 && t < K.despues11 + 0.6, startOn = t < K.dentro3 + 0.9 || t > K.si13 - 1.5;
  const Z = S.ctr; Z.visible = fieldOn || startOn; if (!Z.visible) return;
  const showStart = startOn;
  // ---- el martillo: baja acelerando, golpea (onda, polvo, temblor), rebota y se va; al final vuelve a bajar hasta la pose del principio
  const yTop = 0.62; let gy = yTop * (1 - clamp(t / T_HIT) * clamp(t / T_HIT));
  if (t > T_HIT) { const u = t - T_HIT; gy = 0.05 * Math.abs(Math.sin(u * 14)) * Math.exp(-u * 9); }
  gy += eio(clamp((t - 1.25) / 0.9)) * 2.8;
  if (t > K.si13) gy = 2.8 - (2.8 - yTop) * eio(clamp((t - (END - 2.2)) / 2.2));
  S.ham.position.set(0.0, 0.158 + gy, 0.02); S.ham.rotation.set(0, 0.35, 0); S.ham.visible = showStart && gy < 2.7;
  const ush = t - T_HIT; S.shock.visible = ush > 0 && ush < 0.9; if (S.shock.visible) { const e = eo(clamp(ush / 0.85)); S.shock.scale.setScalar(0.1 + e * 1.9); S.shock.material.opacity = 0.85 * (1 - e); }
  S.dust.visible = ush > 0 && ush < 1.6; if (S.dust.visible) { burst(S.dust, v3(0, 0.02, 0), t, T_HIT, 0.45, 1.5, false, 0.7); S.dust.material.opacity = 1 - clamp(ush / 1.6); }
  // ---- la rejilla: caen 97 (gris), quedan 3 dorados; con «Y ninguno…» se levantan todos y con «carrera» llevan birrete
  const sink = win(t, K.crees3 - 0.1, 0.7) * (1 - win(t, K.si13 + 0.3, 0.8));
  const capK = pop(t, K.carrera2 - 0.05, 0.4) * (1 - win(t, K.crees3 - 0.1, 0.4));
  const gv = showStart && t < K.dentro3 + 0.9 || t > K.si13 - 1.5; S.grid.visible = S.heads.visible = gv;
  if (gv) {
    for (let i = 0; i < 100; i++) {
      const P = gridPos(i), f = fallState(i, t), isG = GOLD3.includes(i) && t > T_HIT && t < K.y2 + 0.1;
      const th = GOLD3.includes(i) ? 0 : f.th, lie = GOLD3.includes(i) ? 0 : f.lie;
      const d = Math.hypot(P.x, P.z) > 1e-4 ? v3(P.x, 0, P.z).normalize() : v3(1, 0, 0); _ax.set(d.z, 0, -d.x);
      _o.position.copy(P).addScaledVector(d, f.slide); _o.position.y = 0.011 * Math.sin(th) - sink * 0.09; _o.quaternion.setFromAxisAngle(_ax, th);
      _o.scale.setScalar(isG ? 0.0001 : 1); _o.updateMatrix(); S.grid.setMatrixAt(i, _o.matrix); S.heads.setMatrixAt(i, _o.matrix);
      _col.copy(C_COAT).lerp(C_GREY, lie); S.grid.setColorAt(i, _col); _col.copy(C_SKIN).lerp(C_GREY, lie * 0.8); S.heads.setColorAt(i, _col);
      _o.scale.setScalar(Math.max(0.0001, capK) * (isG ? 0 : 1)); _o.updateMatrix(); S.caps.setMatrixAt(i, _o.matrix);
    }
    S.grid.instanceMatrix.needsUpdate = true; S.grid.instanceColor.needsUpdate = true; S.heads.instanceMatrix.needsUpdate = true; S.heads.instanceColor.needsUpdate = true; S.caps.instanceMatrix.needsUpdate = true;
  }
  S.caps.visible = gv && capK > 0.002;
  const gk = t > T_HIT + 0.05 && t < K.y2 + 0.1;
  S.gold3.forEach((g, n) => { g.visible = gk; if (!gk) return; const k = pop(t, K.cuatro1 - 0.05 + n * 0.08, 0.4); g.scale.setScalar(1 + 0.25 * k); g.userData.cone.material.uniforms.op.value = 0.22 * k * (1 - win(t, K.y2 - 0.2, 0.3)); });
  // ---- la vitrina (L2): sube del suelo, se cierra con luz roja; el diploma se desenrolla con «carrera»
  const vk = win(t, K.y2 - 0.1, 0.5) * (1 - win(t, K.crees3 - 0.2, 0.5));
  S.vit.visible = vk > 0.01; S.vit.position.y = -0.85 * (1 - vk);
  if (S.vit.visible) { const led = S.vit.userData.led; led.material.emissiveIntensity = 3 * (t > K.ninguno2 ? 1 : 0) * (0.6 + 0.4 * Math.sin(t * 9)); }
  const dk = win(t, K.carrera2 - 0.25, 0.35) * (1 - win(t, K.crees3 - 0.3, 0.3));
  S.dip.visible = dk > 0.01; if (S.dip.visible) { S.dip.position.set(0, 0.2 + 0.03 * Math.sin(t * 2), 0.12); S.dip.rotation.set(-0.15, 0, 0); const uk = eo(clamp((t - K.carrera2) / 0.45)); S.dipP.scale.set(Math.max(0.001, uk), 1, 1); S.dipP.visible = uk > 0.01; S.dip.userData.rib.visible = uk < 0.1; S.dip.scale.setScalar(dk); }
  // ---- L3: los libros suben apilados; con «memorizar» pasan las hojas; con «huesos» salen el cráneo y el fémur;
  //      con «En realidad» los libros salen volando, sube el negatoscopio y la lupa encuentra «qué falla» (aro rojo)
  const bk = win(t, K.crees3 - 0.15, 0.5), fly = win(t, K.realidad3 - 0.15, 0.6), end3 = t < K.dentro3 + 0.9;
  S.books.forEach((b, k) => { b.visible = bk > 0.01 && end3 && fly < 0.999; if (!b.visible) return;
    const A = v3(0, 0.025 + k * 0.052 - 0.4 * (1 - bk), 0.05), dir = v3(Math.cos(k * 1.9) * 2.2, 1.4 + k * 0.15, -1.5 - hash(k) * 1.2), e = eio(clamp((fly - k * 0.05) / 0.8));
    b.position.copy(A).addScaledVector(dir, e); b.rotation.set(-Math.PI / 2 + e * 3 * (k % 2 ? 1 : -1), e * 2, (k - 2.5) * 0.12 + e * 4); b.scale.setScalar(1 - 0.5 * e); });
  const fk = win(t, K.memorizar3 - 0.1, 0.2) * (1 - win(t, K.realidad3 - 0.2, 0.15));
  S.flip.forEach((p, k) => { p.visible = fk > 0.01 && end3; if (!p.visible) return; const top = v3(-0.095, 0.025 + 6 * 0.052 + 0.004, 0.05); const ph = ((t * 3.2 + k / 9) % 1); p.position.copy(top); p.rotation.set(-Math.PI / 2, 0, 0); p.rotateY(-Math.PI * eio(ph)); });
  const hk = pop(t, K.huesos3 - 0.12, 0.4) * (1 - win(t, K.realidad3 - 0.1, 0.4)); show(S.skull, hk * 1.15 * (end3 ? 1 : 0)); show(S.bone, pop(t, K.huesos3 + 0.05, 0.4) * (1 - win(t, K.realidad3 - 0.1, 0.4)) * (end3 ? 1 : 0));
  if (S.skull.visible) { S.skull.rotation.y = 0.5 + Math.sin(t * 1.4) * 0.15; S.skull.userData.jaw.rotation.x = 0.1 + 0.08 * Math.max(0, Math.sin(t * 7)); }
  const lk = win(t, K.realidad3 - 0.25, 0.5) * (end3 ? 1 : 0); S.lbox.visible = lk > 0.01; S.lbox.position.y = -0.6 * (1 - lk);
  S.lbox.userData.film.material.emissiveIntensity = 1.25 * (0.3 + 0.7 * win(t, K.realidad3, 0.25));
  const rk = win(t, K.falla3 - 0.05, 0.25); S.lbox.userData.ring.material.opacity = rk * (0.75 + 0.25 * Math.sin(t * 12)); S.lbox.userData.ring.scale.setScalar(1 + 0.6 * (1 - eo(rk)));
  const mk = win(t, K.encontrar3 - 0.3, 0.4) * (1 - win(t, K.asi3, 0.3)) * (end3 ? 1 : 0); S.mag.visible = mk > 0.01;
  if (S.mag.visible) { const u = clamp((t - K.encontrar3 + 0.2) / (K.falla3 - K.encontrar3 + 0.2)), x = lerp(0.12, -0.0815, eio(u)), y = lerp(0.3, 0.19 + 0.33 * 0.08, eio(u)); S.mag.position.set(x, y - 0.6 * (1 - lk), -0.2 + 0.07); S.mag.rotation.set(0, 0, 0.5); S.mag.scale.setScalar(0.8 * mk); }
  const ok = win(t, K.asi3 - 0.4, 0.5); S.lect.visible = ok > 0.01 && end3; S.lect.position.y = -0.8 * (1 - ok);
  S.ctrCone.visible = startOn; S.ctrCone.material.uniforms.op.value = 0.05 * (t < K.dentro3 + 0.5 ? 1 : 0);
  // ---- el campo del MIR (L9–L10)
  const fv = fieldOn && t > K.mas9 - 0.5; S.field.visible = S.fieldH.visible = fv; S.me.visible = false; S.gglow.visible = S.dline.visible = fv;
  if (fv) {
    const t0 = K.n15000 - 0.15, gOn = win(t, K.n9000 - 0.05, 0.4), dim = win(t, K.plazas9 - 0.1, 0.6), dOn = win(t, K.dermatologia10 - 0.1, 0.5), dOff = win(t, K.agoto10 - 0.05, 0.6);
    const meK = win(t, K.numero9 - 0.2, 0.4) * (1 - win(t, K.este10 - 0.1, 0.4)), out = win(t, K.despues11 - 0.2, 0.6);
    let i = 0;
    for (let r = 0; r < FN; r++) for (let c = 0; c < FN; c++, i++) {
      const P = fieldPos(c, r), dist = Math.hypot(P.x, P.z - 3.6), k = pop(t, t0 + dist / 5.5 + hash(i * 0.37) * 0.1, 0.3) * (1 - out);
      _o.position.set(P.x, -0.09 * out, P.z); _o.quaternion.identity(); _o.scale.setScalar(Math.max(0.0001, k) * (c === ME_C && r === ME_R && meK > 0.01 ? 0.0001 : 1)); _o.updateMatrix(); S.field.setMatrixAt(i, _o.matrix); S.fieldH.setMatrixAt(i, _o.matrix);
      _col.copy(C_COAT);
      if (r < FG) _col.lerp(C_GOLD, gOn); else _col.lerp(C_DIM, dim * 0.85);
      if (r < FD) { _col.lerp(C_DERM, dOn); _col.lerp(C_GREY, dOff * 0.5); } else if (dOn > 0) _col.multiplyScalar(1 - 0.55 * dOn);
      if (meK > 0) _col.multiplyScalar(1 - 0.45 * meK);
      S.field.setColorAt(i, _col); _col.copy(C_SKIN).multiplyScalar((r >= FG ? 1 - 0.75 * dim : 1) * (1 - 0.5 * Math.max(meK, r < FD ? 0 : dOn))); S.fieldH.setColorAt(i, _col);
    }
    S.field.instanceMatrix.needsUpdate = true; S.field.instanceColor.needsUpdate = true; S.fieldH.instanceMatrix.needsUpdate = true; S.fieldH.instanceColor.needsUpdate = true;
    S.gglow.material.opacity = 0.6 * gOn * (1 - dOn * 0.7) * (1 - out); S.dline.material.opacity = dOn * (1 - out) * (0.8 + 0.2 * Math.sin(t * 10));
    S.me.visible = meK > 0.01; if (S.me.visible) { S.me.scale.setScalar(1 + 0.6 * pop(t, K.numero9 - 0.2, 0.4)); S.me.userData.cone.material.uniforms.op.value = 0.3 * meK; }
  }
}
