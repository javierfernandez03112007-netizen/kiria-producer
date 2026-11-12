// ---------------------------------------------------------------- el centro: cien bobinas de cine (las películas más taquilleras, una dorada: la n.º 1) y la caja de
// GTA 5 gigante que cae sobre ellas como el mazo de Derecho (no queda ninguna en pie); detrás sube la vitrina con GTA 6 y el calendario del 19 (L2).
// Al final las bobinas se levantan y la caja sube hasta la pose del primer fotograma (bucle).
const RG = { sp: 0.085 }, GOLD1 = 63;
const gridP = i => v3(((i % 10) - 4.5) * RG.sp, 0, (Math.floor(i / 10) - 4.5) * RG.sp);
const T_HIT = 0.3, CASE_S = 3.2, CASE_TOP = 0.42;
const _o = new THREE.Object3D(), _ax = new THREE.Vector3();
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  const RP = reelSmallParts(0.034, 0.012);
  S.reels = new THREE.InstancedMesh(RP.geo, RP.mats, 100); S.reels.castShadow = true; S.reels.receiveShadow = true; S.reels.frustumCulled = false; Z.add(S.reels);
  S.gold1 = mesh(RP.geo, RP.gold); Z.add(S.gold1);
  S.case5 = gameCase('GTA 5', 'SALIÓ EN 2013', TH5, CASE_S); Z.add(S.case5);
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.shock.rotation.x = -Math.PI / 2; S.shock.position.y = 0.004; Z.add(S.shock);
  S.dust = sparks(Z, 220, 0xffe0b0, 0.03);
  // la vitrina con GTA 6 (sube detrás) y el calendario de mesa
  S.vit = vitrine(0.34, 0.6); S.vit.position.set(0.58, 0, -0.5); S.vit.rotation.y = -0.45; Z.add(S.vit);
  const easel = grp(at(mesh(new THREE.BoxGeometry(0.2, 0.012, 0.12), M.brass), 0, 0.086, 0), at(mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), M.brass), 0, 0.18, -0.04, 0, -0.25));
  S.case6v = gameCase('GTA 6', 'SALE EL 19-11-2026', TH6, 1.55); S.case6v.position.set(0, 0.098 + 0.132, 0.0); S.case6v.rotation.x = -0.18; S.vit.add(easel, S.case6v);
  S.cal = deskCalendar(1.0); S.cal.position.set(0.98, 0, -0.28); S.cal.rotation.y = -0.6; Z.add(S.cal);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
}
function fallState(i, t) {       // ángulo de caída de la bobina i (0 = de pie): caen en ola desde la caja; al final se levantan (rebobinado)
  const P = i < 0 ? gridP(GOLD1) : gridP(i), dist = Math.hypot(P.x, P.z), dl = T_HIT + dist / 2.6 + hash(i * 3.7 + 1) * 0.05 + (i < 0 ? 0.55 : 0);
  let u = clamp((t - dl) / 0.24), th = Math.PI / 2 * 0.985 * u * u;
  if (u >= 1) th -= 0.08 * Math.sin(Math.PI * clamp((t - dl - 0.24) / 0.22)) * Math.exp(-(t - dl - 0.24) * 6);
  if (i < 0) th += (t > T_HIT + 0.1 && u <= 0 ? 0.12 * Math.sin((t - T_HIT) * 22) * Math.exp(-(t - T_HIT) * 2.5) : 0);      // la dorada se tambalea antes de caer
  const up = clamp((t - (K.mandaselo9 + 0.2 + hash(i * 5.1 + 2) * 0.6)) / 0.35); th *= 1 - eio(up);
  return th;
}
function centerAt(t, st) {
  const Z = S.ctr, vis = t < K.el3 + 1.6 || t > K.pagarias9 - 1.2; Z.visible = vis; if (!vis) return;
  // ---- la caja: cae acelerando, golpea (onda, polvo, temblor), rebota un poco; al final sube hasta la pose del primer fotograma
  let y = CASE_TOP * (1 - clamp(t / T_HIT) * clamp(t / T_HIT));
  if (t > T_HIT) { const u = t - T_HIT; y = 0.035 * Math.abs(Math.sin(u * 13)) * Math.exp(-u * 8); }
  y += CASE_TOP * eio(clamp((t - (END - 1.7)) / 1.7));
  S.case5.position.set(0, 0.272 + y, 0); S.case5.rotation.set(0, 0, 0.02 * Math.sin((t - T_HIT) * 15) * Math.exp(-Math.max(0, t - T_HIT) * 4) * (t > T_HIT ? 1 : 0));
  const ush = t - T_HIT; S.shock.visible = ush > 0 && ush < 0.9; if (S.shock.visible) { const e = eo(clamp(ush / 0.85)); S.shock.scale.setScalar(0.1 + e * 1.4); S.shock.material.opacity = 0.85 * (1 - e); }
  S.dust.visible = ush > 0 && ush < 1.6; if (S.dust.visible) { burst(S.dust, v3(0, 0.02, 0), t, T_HIT, 0.4, 1.5, false, 0.7); S.dust.material.opacity = 1 - clamp(ush / 1.6); }
  // ---- las bobinas: caen hacia fuera desde la caja; la dorada (la película n.º 1) aguanta un instante y también cae
  for (let i = 0; i < 100; i++) {
    const P = gridP(i), th = i === GOLD1 ? 0 : fallState(i, t), d = Math.hypot(P.x, P.z) > 1e-4 ? v3(P.x, 0, P.z).normalize() : v3(1, 0, 0);
    _ax.set(d.z, 0, -d.x); _o.position.copy(P); _o.position.y = 0.034 * Math.cos(th) + 0.006 * Math.sin(th); _o.position.addScaledVector(d, 0.034 * Math.sin(th));
    _o.quaternion.setFromAxisAngle(_ax, th); _o.scale.setScalar(i === GOLD1 ? 0.0001 : 1); _o.updateMatrix(); S.reels.setMatrixAt(i, _o.matrix);
  }
  S.reels.instanceMatrix.needsUpdate = true;
  { const P = gridP(GOLD1), th = fallState(-1, t), d = v3(P.x, 0, P.z).normalize(); _ax.set(d.z, 0, -d.x); S.gold1.position.copy(P); S.gold1.position.y = 0.034 * Math.cos(th) + 0.006 * Math.sin(th); S.gold1.position.addScaledVector(d, 0.034 * Math.sin(th)); S.gold1.quaternion.setFromAxisAngle(_ax, th); }
  // ---- la vitrina (L2): sube del suelo con «Y el 19…»; la luz roja de la cerradura parpadea con «¿Cuánto…?»; el calendario sale con «19»
  const vk = win(t, K.y2 - 0.15, 0.6) * (1 - win(t, K.el3 + 0.6, 0.4));
  S.vit.visible = vk > 0.01; S.vit.position.y = -0.75 * (1 - vk);
  if (S.vit.visible) { const on = t > K.cuanto2 - 0.05 ? 1 : 0; S.vit.userData.led.material.emissiveIntensity = 3 * on * (0.6 + 0.4 * Math.sin(t * 9)); }
  const ck = pop(t, K.diecinueve2 - 0.12, 0.45) * (1 - win(t, K.el3 + 0.6, 0.3)); show(S.cal, ck);
  S.ctrCone.material.uniforms.op.value = 0.05;
}
