// prueba de 23_iberia.js: el pueblo de noche, la cocina de la madre, la antena y el tubo bajo la calle.
// Línea de tiempo de prueba: 0–1,8 entrada · 1,8–3,4 escribe · 3,4–4,2 envía · 4,2–9,2 salida (ondas 4,2–6,8 · pulso 6,95–8,95 · pulso2 8,95–9,2)
let IG;
async function labBuild() {
  moodSet('iberia'); IG = buildIberia(); scene.add(IG);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 600), new THREE.MeshStandardMaterial({ color: 0x06202e, roughness: 0.55, metalness: 0.1 })); sea.rotation.x = -Math.PI / 2; sea.position.set(-400, 0, 0); scene.add(sea);
}
function labAt(t) {
  const type = clamp((t - 1.8) / 1.6), send = clamp((t - 3.4) / 0.8), waves = clamp((t - 4.2) / 2.6), pulse = clamp((t - 6.95) / 2.0), pulse2 = clamp((t - 8.95) / 0.25);
  iberiaAt(t, { type, send, waves, pulse, pulse2 });
  if (window.LABCAM) return window.LABCAM;
  if (t < 1.8) return IBE_CAM_IN(t / 1.8);
  if (t < 4.2) return IBE_CAM_IN(1);
  return IBE_CAM_OUT(clamp((t - 4.2) / 5));
}
