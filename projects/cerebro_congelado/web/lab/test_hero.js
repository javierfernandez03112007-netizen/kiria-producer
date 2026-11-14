// ---------------------------------------------------------------- banco de pruebas del personaje (Homer de heladero): vistas fijas para comparar con las referencias
// (web/lab/ref/homer_modelo.jpg y homer_heladero.jpg). Cada t entero es una vista + una expresión; las de frente y perfil van con teleobjetivo.
const P_BITE_T = v3(-0.19, -1.32, 1.42), D_BITE_T = v3(0.22, 0.72, -0.66), P_HOLD_T = v3(-0.36, -1.66, 1.62), D_HOLD_T = v3(0.2, 0.8, -0.56),
  P_LOW_T = v3(-1.0, -3.3, 1.75), D_LOW_T = v3(0.1, 0.95, 0.3), ELBOW_T = v3(-2.0, -3.9, 0.9);
function labBuild(head) { }
// expresión: [boca abierta, sonrisa, mueca], ojos abiertos (0..1,5), mirada (yaw, pitch)
function heroFace(U, jaw, smile, grim, open, yaw = 0, pitch = 0) {
  const mi = U.headMesh.morphTargetInfluences; mi[0] = jaw; mi[1] = smile; mi[2] = grim; U.jaw.rotation.x = JAW_A * jaw;
  for (const e of U.eyes) eyePose(e, open, 1, yaw, pitch);
}
function labAt(t) {
  const U = S.hero.userData, v = Math.round(t);
  U.head.rotation.set(0, 0, 0);
  armPose(U, P_HOLD_T, D_HOLD_T, ELBOW_T); heroFace(U, 0.0, 0, 0, 1);
  const tele = (az, el, d, ly, fov) => [Math.sin(az) * Math.cos(el) * d, ly + Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d, 0, ly, 0, fov];
  switch (v) {
    case 1: return tele(0, 0, 80, -5.9, 12);                 // cuerpo entero de frente
    case 2: return tele(-Math.PI / 2, 0, 80, -5.9, 12);      // cuerpo entero de perfil (mira a la derecha de la imagen, como en la hoja)
    case 3: return tele(0, 0, 26, 0.25, 11);                 // cabeza de frente
    case 4: return tele(-Math.PI / 2, 0, 26, 0.25, 11);      // cabeza de perfil
    case 5: heroFace(U, 0.0, 0.85, 0, 1.05, 0.12, 0.05); return [-9.5, 1.2, 30, -0.6, -4.6, 0, 30];      // tres cuartos con el polo (como la foto del heladero)
    case 6: armPose(U, P_BITE_T, D_BITE_T, ELBOW_T); heroFace(U, 0.65, 0, 0, 1.3, 0, 0.26); return tele(-0.55, 0.05, 26, -0.3, 13);   // boca abierta mordiendo
    case 7: heroFace(U, 0.15, 0, 0.9, 0.2); U.head.rotation.x = 0.06; return tele(0.0, 0.0, 26, 0.0, 11);         // mueca de dolor, ojos apretados
    case 8: heroFace(U, 0.25, 1.0, 0, 1.1); return tele(0.35, 0.05, 26, 0.0, 11);   // sonrisa grande
    case 9: return tele(Math.PI, 0, 80, -5.9, 12);           // de espaldas
    case 10: return tele(-0.7, 0.1, 30, 0.1, 12);            // cabeza tres cuartos, neutra
  }
  return tele(0, 0, 80, -5.9, 12);
}
