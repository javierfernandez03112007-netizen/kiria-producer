// ---------------------------------------------------------------- centro: la clínica veterinaria en miniatura (suelo de baldosas, dos paredes, camilla con el cachorro,
// negatoscopio y estante) y una vaca de tamaño real que revienta la pared del fondo y mete la cabeza. Al final se rebobina (bucle).
const CL_W = 1.5, CL_D = 1.1, CL_H = 1.25, WALL_Z = -0.55, WALL_T = 0.05, FLOOR_Y = 0.02;
const HOLE = { x0: -0.34, x1: 0.28, y0: 0.5, y1: 1.21 };
const COW_X = -0.04, COW_Z0 = -1.814, COW_LUNGE = 0.3;
const SHARD_G = 6.0;
function buildCenter() {
  const Z = new THREE.Group(); scene.add(Z); S.ctr = Z;
  // suelo de baldosas (tablero) y paredes
  const fl = mesh(new THREE.BoxGeometry(CL_W, FLOOR_Y, CL_D), [M.concrete, M.concrete, M.tile, M.concrete, M.concrete, M.concrete]); fl.position.set(0, FLOOR_Y / 2, 0); Z.add(fl);
  M.tile.map.repeat.set(1, 1);
  const hw = HOLE, wz = WALL_Z, wm = [M.plasterIn, M.plasterIn, M.plasterIn, M.plasterIn, M.plaster, M.plaster];
  const wallBox = (x0, x1, y0, y1) => { const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, WALL_T), wm); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz); Z.add(m); return m; };
  wallBox(-CL_W / 2, hw.x0, 0, CL_H); wallBox(hw.x1, CL_W / 2, 0, CL_H); wallBox(hw.x0, hw.x1, 0, hw.y0); wallBox(hw.x0, hw.x1, hw.y1, CL_H);
  const lw = mesh(new THREE.BoxGeometry(WALL_T, CL_H, CL_D + WALL_T), M.plaster); lw.position.set(-CL_W / 2 - WALL_T / 2, CL_H / 2, -WALL_T / 2); Z.add(lw);
  // franja de color (zócalo) y rodapié
  for (const [w, x, z, ry] of [[CL_W, 0, wz + WALL_T / 2 + 0.002, 0], [CL_D, -CL_W / 2 + 0.002, 0, Math.PI / 2]]) { const b = mesh(new THREE.BoxGeometry(w, 0.05, 0.004), M.band); b.position.set(x, 0.3, z); b.rotation.y = ry; Z.add(b);
    const sk = mesh(new THREE.BoxGeometry(w, 0.03, 0.008), M.enamel); sk.position.set(x, FLOOR_Y + 0.015, z); sk.rotation.y = ry; Z.add(sk); }
  // la parte de la pared que revienta
  S.wall = new THREE.Group(); S.wall.position.set((hw.x0 + hw.x1) / 2, (hw.y0 + hw.y1) / 2, wz); Z.add(S.wall);
  S.shards = wallShards(hw.x1 - hw.x0, hw.y1 - hw.y0, 6, 6, WALL_T, 3); for (const m of S.shards) { m.position.copy(m.userData.c); S.wall.add(m); }
  S.dust = sparks(Z, 260, 0xe8ded0, 0.03); S.chips = sparks(Z, 120, 0xbfb2a0, 0.016);
  // camilla, cachorro y gato
  S.table = examTable(1); S.table.position.set(0.06, FLOOR_Y, 0.02); Z.add(S.table);
  S.dog = makeAnimal('dog', 0.5); S.dog.position.set(0.12, FLOOR_Y + 0.23, 0.04); S.dog.rotation.y = -0.35; Z.add(S.dog);
  S.cat = makeAnimal('cat', 0.5); S.cat.position.set(-0.1, FLOOR_Y + 0.23, 0.06); S.cat.rotation.y = 0.5; Z.add(S.cat);
  // negatoscopio con la radiografía de un perro (pared izquierda) y estante con frascos (pared del fondo)
  S.lbox = lightbox(0.8); S.lbox.position.set(-CL_W / 2 + 0.03, 0.42, -0.12); S.lbox.rotation.y = Math.PI / 2; S.lbox.children.forEach(c => { if (!c.isMesh && c.children.length === 2) c.visible = false; }); Z.add(S.lbox);
  const shelf = mesh(new THREE.BoxGeometry(0.4, 0.012, 0.09), M.woodL); shelf.position.set(0.5, 0.56, wz + 0.07); Z.add(shelf);
  [[0.36, 0.7], [0.45, 0.55], [0.55, 0.65], [0.64, 0.5]].forEach(([x, s2], i) => { const b = i % 2 ? pillBottle(s2) : vial(s2); b.position.set(x, 0.566, wz + 0.07); Z.add(b); });
  // fonendo sobre la camilla («curando») y el guante largo (aparece con «brazo entero»)
  S.steth = stethoscope(0.9); S.steth.position.set(-0.08, FLOOR_Y + 0.232, 0.14); S.steth.rotation.y = 0.6; Z.add(S.steth);
  S.glove = glove(0.8); S.glove.scale.setScalar(0.42); Z.add(S.glove);
  // la vaca de tamaño real al otro lado de la pared, y los otros animales grandes (para «muchos animales a la vez»)
  S.cow = makeAnimal('cow', 1); S.cow.position.set(COW_X, 0, COW_Z0); Z.add(S.cow);
  S.horse = makeAnimal('horse', 1); S.horse.position.set(-1.3, 0, -1.4); S.horse.rotation.y = 0.6; Z.add(S.horse);
  S.pig = makeAnimal('pig', 1); S.pig.position.set(0.98, 0, 0.62); S.pig.rotation.y = -Math.PI / 2 - 0.35; Z.add(S.pig);
  S.hen = makeAnimal('hen', 1.25); S.hen.position.set(-CL_W / 2 - 0.02, CL_H, 0.15); S.hen.rotation.y = 0.9; Z.add(S.hen);
  for (const o of [S.horse, S.pig, S.hen]) o.userData.s0 = o.scale.x;
  Z.traverse(o => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
}
// estado de la pared: u = segundos desde el reventón (negativo: la vaca empuja; al final se rebobina hasta el estado del primer fotograma)
function burstU(t) { const r0 = END - 1.25; if (t < r0) return t - T_HIT; return lerp(-T_HIT, r0 - T_HIT > 1.4 ? 1.4 : r0 - T_HIT, eio(clamp((END - t) / 1.25))); }
function shardAt(m, u) {
  const d = m.userData, c = d.c, R = HOLE, w = R.x1 - R.x0, h = R.y1 - R.y0;
  if (u <= 0) { const b = Math.max(0, 1 - d.r * 0.8) * (0.022 + 0.006 * Math.sin(NOW * 40 + d.k * 9) * (u > -0.25 ? 1 : 0)); m.position.set(c.x, c.y, b); m.rotation.set((d.k - 0.5) * 0.06, (d.k2 - 0.5) * 0.06, 0); return; }
  const vy = 0.5 + d.k2 * 1.1, yFloor = FLOOR_Y + 0.02 - (R.y0 + R.y1) / 2, y0 = c.y;
  const tHit = (vy + Math.sqrt(vy * vy + 2 * SHARD_G * (y0 - yFloor))) / SHARD_G, ut = Math.min(u, tHit), tt = tHit + 0.12;
  // los trozos caen DENTRO de la clínica (entre 0,2 y 0,9 m de la pared y sin salirse por los lados): así ninguno pasa por delante de la cámara
  const wx = (R.x0 + R.x1) / 2, vz = Math.min(1.1 + d.k * 1.6 + (1 - d.r) * 0.8, (0.2 + 0.7 * d.k) / tt);
  const vx = clamp(c.x / (w / 2) * 0.9 + (d.k - 0.5) * 0.8, (-0.66 - wx - c.x) / tt, (0.66 - wx - c.x) / tt);
  const slide = u > tHit ? (1 - Math.exp(-(u - tHit) * 6)) * 0.12 : 0;
  m.position.set(c.x + vx * ut + vx * slide, y0 + vy * ut - 0.5 * SHARD_G * ut * ut, vz * ut + vz * slide);
  const sp = ut + slide * 2; m.rotation.set(-(1.2 + d.k * 4) * sp, (d.k2 - 0.5) * 5 * sp, (d.k - 0.5) * 6 * sp);
}
function centerAt(t, st) {
  const Z = S.ctr, on = t < CUTS[0] + 0.05 || t > CUTS[CUTS.length - 1] - 0.05; Z.visible = on; if (!on) return;
  const u = burstU(t);
  for (const m of S.shards) shardAt(m, u);
  // polvo y esquirlas del reventón
  const wc = S.wall.position;
  S.dust.visible = u > 0 && u < 1.6; if (S.dust.visible) { burst(S.dust, v3(wc.x, wc.y, wc.z + 0.05), u, 0, 0.35, 1.6, false, 0.25); S.dust.material.opacity = 0.55 * (1 - clamp(u / 1.6)); S.dust.material.transparent = true; }
  S.chips.visible = u > 0 && u < 1.0; if (S.chips.visible) { burst(S.chips, v3(wc.x, wc.y, wc.z + 0.05), u, 0, 0.8, 1.0, false, 2.6); }
  // la vaca: empuja (u < 0, con temblor), embiste al reventar y mueve la cabeza
  const C = S.cow, lung = u <= 0 ? 0 : eo(clamp(u / 0.32)) * COW_LUNGE;
  const push = u <= 0 ? 0.012 * Math.sin(NOW * 31) : 0;
  C.position.set(COW_X, 0, COW_Z0 + lung + push);
  // al final (rebobinado) las poses se funden con las del principio (tiempo t − END) para que el último fotograma enlace con el primero
  const lb = win(t, END - 1.3, 0.9), mixP = (a, b) => { const o = {}; for (const k in a) o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k] ?? 0, lb) : a[k]; return o; };
  const cowP = tt => { const sniff = u > 0.6 ? Math.sin(tt * 1.7) * 0.06 : 0, nod = tt > K.vaca1 - 0.1 && tt < K.vaca1 + 0.9 ? Math.sin((tt - K.vaca1 + 0.1) * 11) * 0.06 * (1 - clamp((tt - K.vaca1) / 0.9)) : 0;
    const lookDog = u > 0.6 ? 0.18 * win(tt, 1.0, 0.8) : 0;
    return { neck: 0.75 + nod, neckY: sniff * 0.6 - lookDog * 0.4, head: -0.6 + sniff * 0.5, headY: -lookDog, tail: Math.sin(tt * 2.3) * 0.25, ear: 0.15 + 0.12 * Math.sin(tt * 3.1) }; };
  poseAnimal(C, lb > 0 ? mixP(cowP(t), cowP(t - END)) : cowP(t));
  // cachorro: se asusta con el golpe, mira a la vaca, ladea la cabeza con «¿por qué?»
  const D = S.dog, jump = u > 0 && u < 0.5 ? Math.sin(u / 0.5 * Math.PI) * 0.035 : 0;
  D.position.y = FLOOR_Y + 0.23 + jump;
  const dogP = tt => { const tilt = win(tt, K.por2 - 0.1, 0.3) * (1 - win(tt, K.crees3, 0.4));
    return { neck: -0.1 - (u > 0 && u < 0.6 ? 0.25 : 0), headY: (u > 0.1 ? 0.5 * (1 - win(tt, 1.6, 0.6)) : 0) + 0.15 * Math.sin(tt * 1.3), headZ: 0.35 * tilt, tail: Math.sin(tt * 13) * 0.45, ear: -0.1 + (u > 0 && u < 0.8 ? 0.5 : 0) }; };
  poseAnimal(D, lb > 0 ? mixP(dogP(t), dogP(t - END)) : dogP(t));
  // gato: salta a la camilla con «gatos»
  const ck = pop(t, K.gatos1 - 0.18, 0.4) * (1 - win(t, END - 1.15, 0.4)); S.cat.visible = ck > 0.01; if (S.cat.visible) { S.cat.scale.setScalar(Math.max(0.0001, ck)); S.cat.position.y = FLOOR_Y + 0.23 + 0.08 * Math.sin(clamp((t - K.gatos1 + 0.18) / 0.4) * Math.PI);
    poseAnimal(S.cat, { headY: 0.25 * Math.sin(t * 0.9), tail: Math.sin(t * 2.6) * 0.3, tailX: 0.1 }); }
  show(S.steth, pop(t, K.curando1 - 0.1, 0.4) * (1 - win(t, END - 1.15, 0.4)) * 0.9);
  // el guante: cae con «y un día», se estira con «brazo entero» y gira despacio
  { const G = S.glove, k = win(t, K.y1 - 0.1, 0.45), off = 1 - win(t, K.crees3 - 0.2, 0.4) + (t > CUTS[CUTS.length - 1] ? 1 : 0); G.visible = k > 0.01 && off > 0.01 && t < CUTS[0];
    if (G.visible) { const s2 = 0.42 * k; G.scale.setScalar(Math.max(0.0001, s2)); G.position.set(0.36, 0.66 - 0.12 * eo(k) + 0.012 * Math.sin(t * 2), 0.22); G.rotation.set(0.15, t * 0.6, -0.25);
      G.userData.sleeve.scale.y = lerp(0.18, 1, eo(clamp((t - K.brazo1 + 0.05) / 0.5))); } }
  // animales grandes alrededor con «muchos animales a la vez»
  const big = [[S.horse, K.muchos3 - 0.12], [S.pig, K.animales3 - 0.12], [S.hen, K.vez3 - 0.45]];
  for (const [A, t0] of big) { const k = t > CUTS[CUTS.length - 1] ? (A === S.horse ? 1 - win(t, END - 1.2, 0.5) : 0) : pop(t, t0, 0.45); A.visible = k > 0.01; if (A.visible) A.scale.setScalar(Math.max(0.0001, k) * A.userData.s0); }
  poseAnimal(S.horse, { neck: 0.05 * Math.sin(t * 1.1), headY: 0.1 * Math.sin(t * 0.7), tail: Math.sin(t * 1.9) * 0.2, ear: 0.1 });
  poseAnimal(S.pig, { headY: 0.12 * Math.sin(t * 1.4), tail: 0 });
  poseAnimal(S.hen, { neck: 0.15 * Math.sin(t * 4.2), head: -0.1 });
}
