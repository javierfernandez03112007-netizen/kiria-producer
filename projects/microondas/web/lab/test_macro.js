// ---------------------------------------------------------------- prueba del macro bajo el agua: el cazo real (15_stove.js) y la taza (14_mug.js) alrededor; se lanza con
// EXTRA="../src/14_mug.js ../src/15_stove.js". Tiempos de la prueba: A (cazo) 0–3,2 s · B (taza) 10–12,8 s · C (palito) 20–22,25 s.
let MACT = null, MACMUG = null, MACSTOVE = null;
async function labBuild() {
  MACSTOVE = await buildStove(); stoveAt(MACSTOVE, 0, { heat: 0.7, boil: 0 });
  MACMUG = buildMug(); MACMUG.position.copy(MAC_DEF.mug); MACMUG.rotation.y = MAC_DEF.mugRot; scene.add(MACMUG);
  MACT = buildMacro({ mug: MACMUG }); for (const k in MACT.groups) scene.add(MACT.groups[k]);
  const st = MACT.stick; MACMUG.add(st); st.position.set(-1.0, 7.1, 0.6); st.rotation.set(0, 0, 0.42);      // el palito apoyado en la taza
  // ¿compilan todos los sombreadores? (los errores de three no salen en el registro del laboratorio)
  renderer.compile(scene, cam); for (const pr of renderer.info.programs) if (pr.diagnostics && !pr.diagnostics.runnable) console.error('ERROR sombreador ' + pr.name + ': ' + (pr.diagnostics.fragmentShader.log || '') + (pr.diagnostics.vertexShader.log || '') + pr.diagnostics.programLog);
}
function labAt(t) {
  let c, k, P;
  if (t < 5) { const u = t / 3.2; c = macCamPot(u); k = 'pot'; P = { pot: 1 }; }
  else if (t < 8) { MACT.groups.pot.updateMatrixWorld(); const a = v3(0.5, 4.5, 0.6).applyMatrix4(MACT.groups.pot.matrixWorld), b = v3(0.5, 0.56, 0.0).applyMatrix4(MACT.groups.pot.matrixWorld);
    c = [a.x, a.y, a.z, b.x, b.y, b.z, 50]; k = 'pot'; P = { pot: 1 }; }      // comprobación: el fondo del cazo visto desde arriba (dentro del agua)
  else if (t < 15) { const u = (t - 10) / 2.8; c = macCamMug(u); k = 'mug'; P = { mug: 1, mugU: u }; }
  else { const u = (t - 20) / 2.25; c = macCamStick(u); k = 'stick'; P = { stick: 1 }; }
  cam.fov = c[6]; cam.updateProjectionMatrix(); cam.position.set(c[0], c[1], c[2]); cam.up.set(0, 1, 0); cam.lookAt(c[3], c[4], c[5]); cam.updateMatrixWorld();
  macWater(clamp((macWaterY(k) - c[1]) / 0.3), k);
  macroAt(t, P);
  return c;
}
