// prueba de la franja del Atlántico: vistas de museo, Brasil, bajo el agua, lo hondo, el cristal
async function labBuild() {
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2000), new THREE.MeshStandardMaterial({ color: 0x0b1a2c, roughness: 0.8 })); pl.rotation.x = -Math.PI / 2; pl.receiveShadow = true; scene.add(pl);
  await buildSlab(); scene.add(SLB.g);
}
const V = [
  ['museo', [-60, 150, 170], [SL * 0.45, 20, 0], 40, false, 0.3],
  ['museo', [SL * 0.4, 70, 130], [SL * 0.4, 22, 0], 38, false, 0.5],
  ['brasil', [30, SEA + 9, 26], [8, SEA - 2, 6], 45, false, 0.1],
  ['agua', [16, SEA - 2.2, 12], [24, SEA - 7.6, 6], 55, true, 0.04],
  ['abismo', [SL * 0.3, 14, 11], [SL * 0.3 + 24, 6, 6], 50, true, 0.31],
  ['museo', [SL - 30, 75, 70], [SL - 5, 30, 0], 40, false, 0.9],
];
function labAt(t) {
  const v = V[Math.min(V.length - 1, Math.floor(t))]; moodSet(v[0]); slabAt(t, { under: v[4], pulse: v[5] });
  const p = slabP(...v[1]), l = slabP(...v[2]); return [p.x, p.y, p.z, l.x, l.y, l.z, v[3], 0, 0];
}
