// ---------------------------------------------------------------- prueba de las moléculas de agua (frase 4: «El agua intenta seguirlas: sus moléculas giran sin parar, y eso es calor»,
// de 13,87 a 18,54 s en el vídeo). Aquí t = segundos desde el principio de la toma (0 … 4,67) y los parámetros siguen a la voz:
// «intenta seguirlas» (0,37–1,6 s) → el campo entra; «giran sin parar» (2,33–3,56 s) y «y eso es calor» (3,56–4,67 s) → el calor crece.
let MOLT = null;
const MOLT_DUR = 4.67;
async function labBuild() {
  MOLT = buildMolecules(); scene.add(MOLT.group);
  // comprobación (sale en el registro): la cámara nunca pasa por una molécula y las moléculas no chocan entre sí
  const D = MOLT.D, A = new Float32Array(D.n * 9); let minCam = 1e9, uMin = 0, minMol = 1e9;
  for (let k = 0; k <= 280; k++) {
    const t = MOLT_DUR * k / 280, P = molTestP(t), c = molCamLocal(t / MOLT_DUR).p;
    for (let i = 0; i < D.n; i++) { molPose(D, i, t, P.field, P.heat, A.subarray(i * 9, i * 9 + 9));
      for (let a = 0; a < 3; a++) { const d = Math.hypot(A[i * 9 + a * 3] - c.x, A[i * 9 + a * 3 + 1] - c.y, A[i * 9 + a * 3 + 2] - c.z) - (a ? MOL_M.rH : MOL_M.rO); if (d < minCam) { minCam = d; uMin = t / MOLT_DUR; } } }
    if (k % 40 === 0) for (let i = 0; i < D.n; i++) for (let j = i + 1; j < D.n; j++) {
      if (Math.abs(D.pos[i * 3] - D.pos[j * 3]) > 2.5 || Math.abs(D.pos[i * 3 + 1] - D.pos[j * 3 + 1]) > 2.5 || Math.abs(D.pos[i * 3 + 2] - D.pos[j * 3 + 2]) > 2.5) continue;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const d = Math.hypot(A[i * 9 + a * 3] - A[j * 9 + b * 3], A[i * 9 + a * 3 + 1] - A[j * 9 + b * 3 + 1], A[i * 9 + a * 3 + 2] - A[j * 9 + b * 3 + 2]) - (a ? MOL_M.rH : MOL_M.rO) - (b ? MOL_M.rH : MOL_M.rO); minMol = Math.min(minMol, d); }
    }
  }
  console.error('MOLCHECK moléculas ' + D.n + ' · enlaces candidatos ' + MOLT.bonds.length + ' · cámara-átomo mín ' + minCam.toFixed(2) + ' (u=' + uMin.toFixed(3) + ') · hueco mín entre moléculas ' + minMol.toFixed(2));
}
let MOLT_NF = 0;
function molTestP(t) {
  return { on: clamp(t / 0.3 + 0.15), field: 0.3 + 0.7 * win(t, 0.15, 1.0), heat: 0.06 + 0.94 * win(t, 2.0, 2.4), dipole: window.MOLDIP ? win(t, 1.4, 0.4) * (1 - win(t, 2.6, 0.5)) : 0 };
}
function labAt(t) {
  const c = moleculesCam(t / MOLT_DUR);
  // la cámara se coloca ANTES de moleculesAt (ordena y desenfoca con ella), como hace frame() en 90_tail.js
  cam.fov = c[6]; cam.updateProjectionMatrix(); cam.position.set(c[0], c[1], c[2]); cam.up.set(0, 1, 0); cam.lookAt(c[3], c[4], c[5]); cam.updateMatrixWorld();
  const t0 = performance.now(); moleculesAt(t, molTestP(t));
  if (MOLT_NF++ < 3) console.error('MOLCHECK t=' + t.toFixed(2) + ' primitivas ' + MOLT.np + ' (' + 2 * MOLT.np + ' triángulos) · CPU ' + (performance.now() - t0).toFixed(1) + ' ms');
  return c;
}
