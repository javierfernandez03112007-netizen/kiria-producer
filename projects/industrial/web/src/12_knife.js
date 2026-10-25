
// ---------------------------------------------------------------- 2 · «crees que es una ingeniería más»: un engranaje solo… y el casco se abre como una navaja suiza con todas
const KX = 122, KZ = -40;
function buildKnife() {
  const Z = zone('knife', KX); Z.position.z = KZ;
  S.kGear = gear(10, 0.32, 0.14, MAT.gold); Z.add(S.kGear);
  S.kHat = hardHat(); S.kHat.scale.setScalar(1.5); Z.add(S.kHat);
  // herramientas que salen del ala como hojas de navaja: brazo + icono
  const icons = [
    () => { const g = new THREE.Group(); const gg = gear(9, 0.13, 0.07, plastic(PL.steel, 0.25)); g.add(gg); g.userData.spin = gg; return g; },                     // mecánica
    () => { const s = new THREE.Shape(); [[0.03, 0.2], [-0.1, -0.01], [0.0, -0.01], [-0.04, -0.2], [0.11, 0.04], [0.01, 0.04]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), plastic(0xffd23f, 0.2)); m.geometry.center(); const g = new THREE.Group(); g.add(m); return g; },  // electricidad
    () => { const g = new THREE.Group(), gl = MAT.glass; const b = sph(0.11, plastic(PL.green, 0.15)); b.scale.set(1, 0.85, 1); g.add(b); const n = cyl(0.035, 0.04, 0.12, plastic(0xe9f6ff, 0.1), 16); n.position.y = 0.12; g.add(n); return g; },  // química
    () => { const g = new THREE.Group(); const c = rbox(0.2, 0.2, 0.05, plastic(0x1d2230, 0.3), 0.02); g.add(c); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const p = rbox(0.03, 0.05, 0.02, MAT.gold, 0.005); p.position.set(-0.075 + i * 0.05, s * 0.12, 0); g.add(p); const q = p.clone(); q.rotation.z = Math.PI / 2; q.position.set(s * 0.12, -0.075 + i * 0.05, 0); g.add(q); }
      const core = rbox(0.08, 0.08, 0.06, glowM(0x37e0ff, 2.2), 0.01); g.add(core); return g; },                                                                     // electrónica
    () => { const g = new THREE.Group(); const p = rbox(0.06, 0.16, 0.06, plastic(PL.orange, 0.2), 0.02); p.position.y = -0.04; g.add(p); for (const s of [-1, 1]) { const f = rbox(0.03, 0.1, 0.05, MAT.dsteel, 0.01); f.position.set(s * 0.05, 0.07, 0); f.rotation.z = -s * 0.25; g.add(f); } return g; },  // automática
    () => { const g = new THREE.Group(); [0.08, 0.14, 0.2].forEach((h, i) => { const b = rbox(0.05, h, 0.05, plastic([PL.sky, PL.violet, PL.pink][i], 0.2), 0.012); b.position.set(-0.06 + i * 0.06, h / 2 - 0.1, 0); g.add(b); }); return g; },  // organización
  ];
  const names = ['MECÁNICA', 'ELECTRICIDAD', 'QUÍMICA', 'ELECTRÓNICA', 'AUTOMÁTICA', 'ORGANIZACIÓN'];
  S.tools = icons.map((mk, i) => {
    const piv = new THREE.Group(); Z.add(piv);
    const arm = rbox(0.09, 0.95, 0.06, plastic(0xd8dde6, 0.2), 0.03); arm.position.y = 0.48; piv.add(arm);
    const ic = mk(); ic.position.y = 1.12; ic.scale.setScalar(2.3); piv.add(ic);
    const lb = pill(names[i], '#ffffff', 'rgba(16,20,30,.9)', 0.78, 62); Z.add(lb);
    return { piv, ic, lb };
  });
  S.kRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 8, 80), new THREE.MeshBasicMaterial({ color: 0x8fe6ff, transparent: true, toneMapped: false })); S.kRing.rotation.x = Math.PI / 2; Z.add(S.kRing);
  S.knifeZ = Z;
}
const KH = v3(0, 1.35, 0);     // centro del casco
function knifeAt(t) {
  const Z = S.knifeZ;
  // el engranaje solitario: llega (la pieza dorada) y gira solo; luego se mete en el casco
  const gin = sm5(clamp((t - (K.realidad - 0.1)) / 0.35));
  S.kGear.visible = t < K.realidad + 0.3; S.kGear.position.copy(v3(0, 1.3, 0.2).lerp(KH, gin)); S.kGear.rotation.set(0.2, 0.3 * Math.sin(t), -t * 2.2); S.kGear.scale.setScalar(Math.max(0.001, 1 - gin) * (1 + 0.25 * env(t, K.ingenieria2, K.mas + 0.4, 0.15, 0.3)));
  // el casco aparece al decir «en realidad» y se abre con «son todas a la vez»
  const hk = pop(t, K.realidad - 0.05, 0.45);
  show(S.kHat, hk * 1.5); S.kHat.position.copy(KH).add(v3(0, -0.25, 0)); S.kHat.rotation.set(0.25 * Math.sin(t * 0.7) * 0.3 + 0.15, 0.5 + 0.25 * Math.sin(t * 0.5), 0);
  const tilt = sm5(clamp((t - K.asi) / 0.5)); S.kHat.rotation.x = 0.15 - 1.75 * tilt;    // «así es por dentro»: se gira y enseña su interior oscuro
  const T0 = [K.son, K.son + 0.14, K.todas, K.todas + 0.14, K.vez - 0.12, K.vez];
  S.tools.forEach((o, i) => {
    const a = -0.88 + i * 0.352, k = sm5(clamp((t - T0[i]) / 0.32)), close = sm5(clamp((t - (K.asi - 0.1)) / 0.35));
    const ang = lerp(Math.PI * 0.98, a, k) * (1 - close) + Math.PI * 0.98 * close;
    o.piv.visible = k > 0.01 && close < 0.99; o.piv.position.copy(KH).add(v3(0, -0.15, 0.45)); o.piv.rotation.set(0, 0, -ang);
    o.ic.rotation.set(0, t * 1.2 + i, 0); if (o.ic.userData.spin) o.ic.userData.spin.rotation.z = t * 3;
    const tip = v3(0, 1.62, 0).applyAxisAngle(v3(0, 0, 1), -ang).add(o.piv.position);
    lookLab(o.lb, k * (1 - close) * env(t, T0[i] + 0.15, K.asi, 0.2, 0.2), tip.add(v3(0, 0.0, 0.3))); o.lb.scale.setScalar(0.85);
  });
  const rk = env(t, K.son, K.asi, 0.3, 0.3); S.kRing.visible = rk > 0.01; S.kRing.position.copy(KH).add(v3(0, -0.25, 0)); S.kRing.scale.setScalar(1 + 0.5 * rk + 0.05 * Math.sin(t * 6)); S.kRing.material.opacity = rk * 0.8; S.kRing.material.color.setRGB(1.2, 2.2, 2.6);
  // cámara: plano corto del engranaje → se abre → se mete en el casco (a negro)
  const inside = KH.clone().add(v3(0, -0.6, 0.0));
  return camKeys(t, [
    [K.crees - 0.45, [0.4, 1.45, 2.6], [0, 1.3, 0.2], 34],
    [K.mas, [0.3, 1.42, 2.1], [0, 1.3, 0.2], 34],
    [K.realidad + 0.25, [0.5, 1.9, 5.9], [0, 1.5, 0], 36],
    [K.vez + 0.2, [0.4, 2.35, 7.6], [0, 2.0, 0], 36],
    [K.asi + 0.25, [0.3, 1.45, 3.8], [0, 1.15, 0], 36],
    [K.dentro + 0.25, [0.05, 1.15, 1.7], [0, 1.1, 0], 40],
    [K.base0, [0.0, 1.12, 0.55], [0, 1.1, -0.2], 46],
  ], Z);
}
