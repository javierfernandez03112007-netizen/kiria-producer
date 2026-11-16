// prueba de 24_fiber.js: los 5,9 s del vídeo (21,0–26,9 s) con la cámara FIB_CAM y la velocidad/pelo como los pondría la línea de tiempo
async function labBuild() { moodSet('fibra'); scene.add(buildFiber()); }
function labAt(t) {
  const u = t / 5.9, c = FIB_CAM(u);
  const speed = keyed(u, [[0, 1], [0.3, 1], [0.42, 0.3], [0.55, 0.35], [0.66, 1], [1, 1]]);
  const hair = win(u, 0.32, 0.1);
  fiberAt(t, { speed, hair, pulses: 1, cam: c });
  return c;
}
