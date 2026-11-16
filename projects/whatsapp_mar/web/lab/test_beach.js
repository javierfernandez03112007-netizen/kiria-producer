// prueba de la playa de Brasil (22_beach.js): bash lab/lab.sh ../src/22_beach.js test_beach.js beach 0 0.8 1.6 2.4 3 4 5 6 7
// 0–3 s: del primer fotograma (el móvil) a la subida (plano abierto); 4–6 s: la burbuja sube por la playa; 7: vista de toda la viñeta.
let TB = null;
async function labBuild() {
  moodSet('brasil');
  const root = atBeach(new THREE.Group()); scene.add(root);
  root.add(buildBeach());
  const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 40, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x1b6d82, roughness: 0.08, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.86 }));
  water.position.set(40, 0, 0); water.receiveShadow = true; root.add(water);                        // (el mar lo hace otra pieza; aquí solo un plano)
  const bub = msgBubble(); root.add(bub);
  TB = { root, bub }; root.updateMatrixWorld(true);
}
const _w = (x, y, z) => TB.root.localToWorld(v3(x, y, z));
function labAt(t) {
  const notif = t < 0.05 ? 1 : 1, buzz = t < 0.6 ? 1 - t / 0.6 : 0;
  beachAt(t, { screen: 1, notif, buzz });
  TB.bub.visible = t >= 3.5 && t < 6.9;
  const c0 = BEA_CAM0, P0 = v3(c0[0], c0[1], c0[2]), L0 = v3(c0[3], c0[4], c0[5]);
  let p, l, fov, blur = 0, foc;
  if (t <= 3.2) {   // la subida: distancia en escala logarítmica, el punto de mira se va hacia la orilla
    const u = eio(clamp(t / 3)), PW = v3(-12.8, 5.6, 17.6), LW = v3(-5.0, 1.3, 5.6);
    const d0 = P0.distanceTo(L0), d1 = PW.distanceTo(LW), d = Math.exp(lerp(Math.log(d0), Math.log(d1), u));
    l = L0.clone().lerp(LW, (d - d0) / (d1 - d0)); const dir = P0.clone().sub(L0).normalize().lerp(PW.clone().sub(LW).normalize(), u).normalize();
    p = l.clone().addScaledVector(dir, d); fov = lerp(c0[6], 52, u); blur = lerp(0.7, 0.15, u); foc = d;
  } else if (t < 6.9) {   // plano medio de la burbuja subiendo por la playa
    const k = clamp((t - 3.5) / 2.6), m = beaMsgPath(k); TB.bub.position.copy(m.pos); TB.bub.scale.setScalar(m.scale);
    l = m.pos.clone(); p = l.clone().add(v3(-1.6 - 0.6 * k, 1.0, 3.6 - 1.4 * k)); fov = 40; blur = 0.35; foc = p.distanceTo(l);
    const cw = TB.root.localToWorld(p.clone()); TB.bub.lookAt(cw); TB.bub.updateMatrixWorld();
  } else if (t < 7.5) { p = v3(-16, 16, 44); l = v3(-17, 0, 0); fov = 40; } else { p = v3(-19, 2.6, 2.5); l = v3(-25, 1.6, -3); fov = 44; }
  const pw = _w(p.x, p.y, p.z), lw = _w(l.x, l.y, l.z);
  return [pw.x, pw.y, pw.z, lw.x, lw.y, lw.z, fov, blur, foc];
}
