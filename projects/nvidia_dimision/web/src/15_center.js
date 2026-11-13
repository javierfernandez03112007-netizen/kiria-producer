// ---------------------------------------------------------------- el centro: un chip gigante de tarjeta gráfica y una alianza de oro que cae sobre él como el
// mazo de Derecho y lo parte en dos (chispas, onda, polvo); detrás, la silla de director vacía, que se va rodando con «ha dimitido». En la frase 2 sube la
// vitrina con la carpeta de la investigación. Al final todo se rebobina: el chip se cierra, la silla vuelve y la alianza sube (bucle).
const T_HIT = 0.3, RING_R = 0.32, DROP = 0.36;
const _o = new THREE.Object3D(), _ax = new THREE.Vector3();
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  S.chip = chipObj(0.9); S.chip.position.y = 0.03; Z.add(S.chip);
  for (const sd of [-1, 1]) { const b = rbox(0.08, 0.8, 0.03, M.black, 0.006); b.rotation.x = Math.PI / 2; b.position.set(sd * 0.38, 0.015, 0); Z.add(b); }    // tacos bajo los bordes (el centro puede hundirse)
  S.ring = ringObj(RING_R, 0.12, 0.05); Z.add(S.ring);
  S.chair = execChair(0.92); Z.add(S.chair);
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.shock.rotation.x = -Math.PI / 2; S.shock.position.y = 0.004; Z.add(S.shock);
  S.dust = sparks(Z, 200, 0xffe0b0, 0.03); S.zap = sparks(Z, 140, 0xbfe4ff, 0.02);
  // la vitrina (frase 2) con la carpeta de la investigación en su atril
  S.vit = vitrine(0.34, 0.6); S.vit.position.set(0.58, 0, -0.5); S.vit.rotation.y = -0.45; Z.add(S.vit);
  const easel = grp(at(mesh(new THREE.BoxGeometry(0.2, 0.012, 0.12), M.brass), 0, 0.086, 0), at(mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), M.brass), 0, 0.18, -0.04, 0, -0.25));
  S.fold = folderObj('INVESTIGACIÓN', 'CONSEJO DE ADMINISTRACIÓN', 'CONFIDENCIAL'); S.fold.rotation.x = Math.PI / 2 - 0.18; S.fold.position.set(0, 0.098 + 0.16, 0.0); S.vit.add(easel, S.fold);
  S.ctrCone = lightCone(1.6, 5, 0.05); Z.add(S.ctrCone);
}
const CHIP_TOP = () => 0.03 + S.chip.userData.top;
function centerAt(t, st) {
  const Z = S.ctr, vis = t < K.jensen3 + 2.2 || t > K.mandaselo9 - 1.2; Z.visible = vis; if (!vis) return;
  const rew = eio(clamp((t - (END - 1.7)) / 1.7));                 // rebobinado final (0 → 1)
  // ---- la alianza: cae acelerando, se clava en el chip (rebote corto); al final sube hasta la pose del primer fotograma
  const top = CHIP_TOP(), sink = 0.022;
  let y = top + RING_R + DROP * (1 - clamp(t / T_HIT) * clamp(t / T_HIT));
  if (t > T_HIT) { const u = t - T_HIT; y = top + RING_R - sink * clamp(u / 0.05) + 0.03 * Math.abs(Math.sin(u * 14)) * Math.exp(-u * 9); }
  y += (sink + DROP) * rew;
  S.ring.position.set(0, y, 0.0); S.ring.rotation.set(0, 0.02 * Math.sin(t * 0.7), (t > T_HIT ? 0.03 * Math.sin((t - T_HIT) * 16) * Math.exp(-(t - T_HIT) * 4) : 0));
  // ---- el chip: se parte en dos con el golpe (el centro se hunde y las mitades se separan); al final se cierra
  const br = (t > T_HIT ? eo(clamp((t - T_HIT) / 0.12)) : 0) * (1 - rew);
  S.chip.userData.halves.forEach((h, i) => { const sd = i ? 1 : -1; h.rotation.z = sd * 0.05 * br; h.position.x = sd * (0.45 + 0.018 * br); });
  // ---- onda, polvo y chispas eléctricas en la grieta
  const ush = t - T_HIT; S.shock.visible = ush > 0 && ush < 0.9; if (S.shock.visible) { const e = eo(clamp(ush / 0.85)); S.shock.scale.setScalar(0.1 + e * 1.4); S.shock.material.opacity = 0.85 * (1 - e); }
  S.dust.visible = ush > 0 && ush < 1.6; if (S.dust.visible) { burst(S.dust, v3(0, 0.05, 0), t, T_HIT, 0.4, 1.5, false, 0.7); S.dust.material.opacity = 1 - clamp(ush / 1.6); }
  S.zap.visible = ush > 0 && ush < 1.1; if (S.zap.visible) { burst(S.zap, v3(0, top, 0), t, T_HIT, 0.25, 0.9, false, 1.2); S.zap.material.opacity = 1 - clamp(ush / 1.1); }
  // ---- la silla vacía: con «ha dimitido» se va rodando hacia atrás y gira; al final vuelve
  const go = eo(clamp((t - (K.dimitido1 - 0.05)) / 1.8)) * (1 - rew);
  S.chair.position.set(0.05 + 0.2 * go, 0, -1.0 - 2.2 * go); S.chair.rotation.y = 0.1 + 2.5 * go + 0.04 * Math.sin(t * 0.8) * (1 - go);
  // ---- la vitrina (frase 2): sube con «su empresa»; la luz roja de la cerradura parpadea con «otra cosa»
  const vk = win(t, K.empresa2 - 0.2, 0.6) * (1 - win(t, K.jensen3 + 0.9, 0.4));
  S.vit.visible = vk > 0.01; S.vit.position.y = -0.75 * (1 - vk);
  if (S.vit.visible) { const on = t > K.otra2 - 0.05 ? 1 : 0; S.vit.userData.led.material.emissiveIntensity = 3 * on * (0.6 + 0.4 * Math.sin(t * 9)); }
  S.ctrCone.material.uniforms.op.value = 0.05;
}
