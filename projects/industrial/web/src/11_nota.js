
// ---------------------------------------------------------------- 1 · la nota de corte: columna de 0 a 14 altísima, la Politécnica, el robot que suelda «13,525» y la más alta
const NX = 84, NZ = -40;
const COLH = 6.3;          // altura de la columna (14 puntos)
function buildNota() {
  const Z = zone('nota', NX); Z.position.z = NZ;
  const base = rbox(1.6, 0.3, 1.6, plastic(0x161a24, 0.3), 0.08); base.position.y = 0.15; Z.add(base);
  const glass = cyl(0.42, 0.42, COLH, MAT.glass, 48); glass.position.y = 0.3 + COLH / 2; Z.add(glass); glass.castShadow = false;
  const cap = cyl(0.5, 0.5, 0.14, plastic(0x161a24, 0.3), 48); cap.position.y = 0.3 + COLH + 0.07; Z.add(cap);
  S.liq = cyl(0.36, 0.36, 1, new THREE.MeshStandardMaterial({ color: 0x3a1a00, emissive: 0xff8a1f, emissiveIntensity: 1.8, roughness: 0.3 }), 48); Z.add(S.liq); S.liq.castShadow = false;
  S.liqTop = new THREE.Mesh(new THREE.CircleGeometry(0.36, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false })); S.liqTop.rotation.x = -Math.PI / 2; Z.add(S.liqTop);
  // marcas de 0 a 14
  for (let i = 0; i <= 14; i++) { const y = 0.3 + i / 14 * COLH, big = i % 7 === 0;
    const tk = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.34 : 0.18, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, toneMapped: false })); tk.position.set(-0.6 - (big ? 0.08 : 0), y, 0.0); Z.add(tk);
    if (big || i === 13) { const l = label(String(i), { size: 90, w: big ? 0.42 : 0.3, color: i === 14 ? '#ffd76a' : '#cfe6ff', weight: 900 }); l.position.set(-1.05, y, 0); l.layers.set(0); Z.add(l); if (i === 14) S.l14 = l; } }
  // maniquí pequeño al pie, mirando hacia arriba
  const mm = makeDoll(plastic(PL.sky, 0.2)); mm.scale.setScalar(0.9); mm.position.set(1.05, 0, 1.0); mm.rotation.y = -0.6; Z.add(mm); S.nDoll = mm;
  mm.userData.J.neck.rotation.x = -0.55;
  // fachada de universidad genérica (columnas y frontón) a la derecha, detrás
  const U = new THREE.Group(); U.position.set(3.4, 0, -2.6); Z.add(U); S.uni = U;
  const um = plastic(0xeef1f6, 0.25);
  const steps = rbox(4.2, 0.3, 1.6, um, 0.05); steps.position.y = 0.15; U.add(steps);
  const plat = rbox(3.8, 0.2, 1.3, um, 0.05); plat.position.y = 0.4; U.add(plat);
  for (let i = 0; i < 6; i++) { const c = cyl(0.13, 0.15, 2.0, um, 24); c.position.set(-1.6 + i * 0.64, 1.5, 0.35); U.add(c); }
  const arch = rbox(4.0, 0.3, 1.2, um, 0.05); arch.position.y = 2.65; U.add(arch);
  const ped = new THREE.Shape(); ped.moveTo(-2.1, 0); ped.lineTo(2.1, 0); ped.lineTo(0, 0.9); ped.closePath();
  const pg = new THREE.Mesh(new THREE.ExtrudeGeometry(ped, { depth: 1.0, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), um); pg.position.set(0, 2.8, -0.5); pg.castShadow = true; U.add(pg);
  const wall = rbox(3.6, 2.0, 0.2, plastic(0x9fb2cf, 0.4), 0.03); wall.position.set(0, 1.5, -0.35); U.add(wall);
  U.traverse(o => { if (o.isMesh) o.castShadow = true; });
  S.uniL = pill('POLITÉCNICA DE MADRID', '#ffffff', 'rgba(16,20,30,.9)', 2.2, 70); Z.add(S.uniL);
  // robot que suelda la nota en el aire
  S.wArm = robotArm(PL.orange, 1.1); S.wArm.position.set(1.7, 0, -0.4); Z.add(S.wArm);
  const torch = cyl(0.03, 0.05, 0.3, MAT.dsteel, 16); torch.position.y = 0.2; S.wArm.userData.J.tool.add(torch);
  S.tip = new THREE.Object3D(); S.tip.position.y = 0.36; S.wArm.userData.J.tool.add(S.tip);
  S.weldS = sparks(Z, 140, 0xffc46a, 0.06); S.weldL = sph(0.05, glowM(0xfff2c8, 12)); Z.add(S.weldL);
  // la nota soldada: se escribe de izquierda a derecha y se enfría de blanco a dorado
  S.notaT = canvasTex(1024, 300); S.notaM = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.557), new THREE.MeshBasicMaterial({ map: S.notaT, transparent: true, toneMapped: false, depthWrite: false })); Z.add(S.notaM);
  S.notaM.position.set(0, 0.3 + COLH + 0.75, 0.25);
  // otras columnas (más bajas, sin nombre): es la más alta
  S.others = [];
  for (let i = 0; i < 6; i++) { const h = [0.62, 0.78, 0.55, 0.85, 0.7, 0.9][i] * COLH, x = (i < 3 ? -1 : 1) * (1.6 + (i % 3) * 1.2);
    const g = new THREE.Group(); g.position.set(x, 0, -1.6 - (i % 3) * 0.5); Z.add(g);
    const c = cyl(0.3, 0.3, h, plastic(0x3a4256, 0.3), 32); c.position.y = h / 2; g.add(c); g.userData.h = h; S.others.push(g); }
  S.crown = new THREE.Group(); Z.add(S.crown);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 12), MAT.gold); sp.position.set(Math.cos(a) * 0.38, 0.15, Math.sin(a) * 0.38); S.crown.add(sp); }
  const cr = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 10, 40), MAT.gold); cr.rotation.x = Math.PI / 2; S.crown.add(cr);
  S.topL = pill('LA MÁS ALTA · 2025', '#ffd76a', 'rgba(16,20,30,.92)', 1.9, 74); Z.add(S.topL);
  S.notaZ = Z;
}
function drawNota(rev, cool) {      // rev: 0..1 lo escrito; cool: 0 blanco incandescente → 1 dorado
  const g = S.notaT.userData.g, w = 1024, h = 300; g.clearRect(0, 0, w, h);
  g.font = '900 250px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = '13,525', tw = g.measureText(txt).width, x0 = w / 2 - tw / 2;
  g.save(); g.beginPath(); g.rect(0, 0, x0 + tw * rev, h); g.clip();
  const c1 = [255, 250, 230], c2 = [255, 196, 70], c = c1.map((v, i) => Math.round(lerp(v, c2[i], cool)));
  g.shadowColor = `rgba(255,${Math.round(lerp(220, 140, cool))},60,${lerp(1, 0.6, cool)})`; g.shadowBlur = lerp(60, 26, cool);
  g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillText(txt, w / 2, h / 2 + 10); g.restore();
  S.notaT.needsUpdate = true;
}
function notaAt(t) {
  const Z = S.notaZ;
  // nivel del líquido: sube con la frase hasta 13,525 / 14 al decir «sobre 14»
  const lv = keyed(t, [[K.y2, 0.02], [K.dificil, 0.05], [K.trece, 0.3], [K.sobre, 0.36], [K.catorce + 0.35, 13.525 / 14], [K.y_end_nota, 13.525 / 14]]);
  const h = Math.max(0.02, lv * COLH); S.liq.scale.set(1, h, 1); S.liq.position.y = 0.3 + h / 2; S.liqTop.position.y = 0.3 + h + 0.001;
  S.liq.material.emissiveIntensity = 1.6 + 1.2 * env(t, K.catorce, K.catorce + 0.8, 0.1, 0.6);
  neonLab(S.l14, 1 + 1.6 * env(t, K.catorce - 0.05, K.catorce + 0.7, 0.08, 0.5));
  // universidad
  const uk = pop(t, K.politecnica - 0.05, 0.45); show(S.uni, uk); S.uni.position.y = -0.4 * (1 - clamp(uk));
  lookLab(S.uniL, env(t, K.politecnica, K.pidio + 0.2, 0.15, 0.3), v3(3.4, 3.95, -2.0)); S.uniL.scale.setScalar(0.95);
  // robot soldador: escribe 13,525 en el aire de izquierda a derecha
  const rev = clamp((t - K.trece) / Math.max(0.5, K.sobre - K.trece - 0.05)), cool = clamp((t - K.sobre) / 0.8);
  const wk = env(t, K.trece - 0.35, K.sobre + 0.25, 0.3, 0.3);
  pose(S.wArm, 1.2 + 0.0, lerp(0.35, -0.55, wk), lerp(0.9, 1.25, wk), lerp(0.3, 0.9, wk));
  S.wArm.userData.J.base.rotation.y = lerp(0.6, 1.95 - 0.55 * rev, wk);
  if (t > K.trece - 0.05) drawNota(rev, cool); else drawNota(0, 0);
  S.notaM.visible = t > K.trece - 0.05; S.notaM.position.set(0, 0.3 + COLH + 0.75, 0.25);
  S.notaM.quaternion.copy(cam.quaternion);
  const tip = new THREE.Vector3(); S.tip.getWorldPosition(tip); Z.worldToLocal(tip);
  const wp = v3(lerp(-0.8, 0.8, rev), 0.3 + COLH + 0.75, 0.3);
  const weld = t > K.trece && t < K.sobre - 0.02;
  S.weldL.visible = weld; S.weldL.position.copy(wp); S.weldL.scale.setScalar(0.8 + 0.4 * Math.sin(t * 60));
  S.weldS.visible = weld || (t > K.sobre && t < K.sobre + 0.5); if (S.weldS.visible) burst(S.weldS, wp, t, 0, 0.9, 0.45, true, 4);
  S.weldS.material.opacity = weld ? 1 : clamp(1 - (t - K.sobre) / 0.5);
  // otras columnas y corona: la más alta
  const ok = sm5(clamp((t - (K.nota - 0.2)) / 0.6));
  S.others.forEach((g, i) => { const k = clamp(ok * 1.4 - i * 0.07); g.visible = k > 0.01; g.scale.set(1, Math.max(0.001, k), 1); });
  const ck = pop(t, K.alta, 0.4); show(S.crown, ck); S.crown.position.y = 0.3 + COLH + 0.2 + 0.3 * (1 - clamp(ck)); S.crown.rotation.y = t * 0.8;
  lookLab(S.topL, env(t, K.universidad, K.y_end_nota + 0.5, 0.2, 0.3), v3(0, 0.3 + COLH + 1.55, 0.3)); S.topL.scale.setScalar(0.9);
  // maniquí: mira arriba y se encoge de hombros con «dificilísimo»
  const J = S.nDoll.userData.J; J.neck.rotation.x = -0.55 - 0.2 * env(t, K.dificil, K.en1 + 0.5, 0.2, 0.4);
  J.shL.rotation.z = -0.2 - 0.5 * env(t, K.dificil, K.en1 + 0.4, 0.2, 0.3); J.shR.rotation.z = 0.2 + 0.5 * env(t, K.dificil, K.en1 + 0.4, 0.2, 0.3);
  return camKeys(t, [
    [K.y2 - 0.45, [2.2, 0.6, 3.8], [0.4, 1.2, 0], 36],
    [K.entrar, [2.0, 0.55, 3.6], [0.2, 1.8, 0], 36],
    [K.dificil + 0.45, [1.7, 0.6, 3.9], [0.0, 4.5, 0], 38],
    [K.politecnica + 0.25, [2.2, 2.7, 9.8], [1.5, 2.6, -1.1], 36],
    [K.trece, [0.3, 7.0, 6.4], [0.0, 7.2, 0.2], 34],
    [K.sobre - 0.1, [0.45, 6.9, 6.2], [0.05, 7.1, 0.2], 34],
    [K.catorce + 0.3, [0.7, 5.9, 7.0], [0.0, 6.3, 0.0], 36],
    [K.nota, [0.6, 4.8, 10.8], [0.0, 4.2, -0.6], 36],
    [K.y_end_nota, [0.5, 4.7, 12.6], [0.0, 4.0, -0.8], 36],
  ], Z);
}
function neonLab(l, k) { if (l) l.material.color.setRGB(k, k, k); }
