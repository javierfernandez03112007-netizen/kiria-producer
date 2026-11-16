// ---------------------------------------------------------------- prueba de las moléculas de agua (frase 4: «El agua intenta seguirlas: sus moléculas giran sin parar, y eso es calor»,
// de 13,87 a 18,54 s en el vídeo). Aquí t = segundos desde el principio de la toma (0 … 4,67) y los parámetros siguen a la voz:
// «intenta seguirlas» (0,37–1,6 s) → el campo entra; «giran sin parar» (2,33–3,56 s) y «y eso es calor» (3,56–4,67 s) → el calor crece.
let MOLT = null;
const MOLT_DUR = 4.67;
async function labBuild() { MOLT = buildMolecules(); scene.add(MOLT.group); }
function molTestP(t) {
  return { on: clamp(t / 0.3 + 0.15), field: 0.3 + 0.7 * win(t, 0.15, 1.0), heat: 0.06 + 0.94 * win(t, 2.0, 2.4) };
}
function labAt(t) {
  const c = moleculesCam(t / MOLT_DUR);
  // la cámara se coloca ANTES de moleculesAt (ordena y desenfoca con ella), como hace frame() en 90_tail.js
  cam.fov = c[6]; cam.updateProjectionMatrix(); cam.position.set(c[0], c[1], c[2]); cam.up.set(0, 1, 0); cam.lookAt(c[3], c[4], c[5]); cam.updateMatrixWorld();
  moleculesAt(t, molTestP(t));
  return c;
}
