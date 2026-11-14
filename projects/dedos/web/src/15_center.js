// ---------------------------------------------------------------- el centro: una mano gigante en rayos X que se cruje los nudillos uno a uno (en cada uno estalla
// un destello de luz). Al final vuelve a la pose del primer fotograma (bucle).
const T_HIT = 0.3, HAND_S = 2.2;
const CRACK = [1.72, 0.3, 0.64, 0.98, 1.34];          // pulgar, índice, corazón, anular, meñique
const flexAt = (t, tc) => { const u = t - tc; if (u < -0.26 || u > 0.62) return 0; return u < 0 ? 1.25 * eio(clamp((u + 0.26) / 0.26)) : u < 0.14 ? 1.25 : 1.25 * (1 - eio(clamp((u - 0.14) / 0.48))); };
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  S.hand = xrayHand(HAND_S); S.hand.position.set(0, 1.32, 0); Z.add(S.hand);
  S.base = grp(cyl(0.5, 0.56, 0.08, M.wood, 64), at(cyl(0.505, 0.505, 0.012, M.brass, 64), 0, 0.03, 0)); S.base.position.y = 0.04; Z.add(S.base);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
}
function centerAt(t, st) {
  const Z = S.ctr, vis = t < K.cada3 + 2.4 || t > K.mandaselo9 - 1.0; Z.visible = vis; if (!vis) return;
  // los cinco nudillos al principio y un crujido más con «¿tú te los crujes?»
  const XC = i => K.mandaselo9 + 0.15 + (i - 1) * 0.14;                 // un crujido más, ya de vuelta en el centro
  const ang = CRACK.map((tc, i) => flexAt(t, tc) + (i >= 1 && i <= 4 ? flexAt(t, XC(i)) : 0));
  handPose(S.hand, ang);
  S.hand.userData.flashes.forEach((f, i) => { let k = 0; for (const tc of [CRACK[i], ...(i >= 1 && i <= 4 ? [XC(i)] : [])]) { const u = t - tc; if (u > 0 && u < 0.5) k = Math.max(k, Math.exp(-u * 7)); }
    f.scale.setScalar(Math.max(0.0001, 0.42 * k)); f.material.opacity = Math.min(1, k * 1.3); });
  S.hand.rotation.y = 0.1 * Math.sin(t * 0.35);
  S.ctrCone.material.uniforms.op.value = 0.05;
}
