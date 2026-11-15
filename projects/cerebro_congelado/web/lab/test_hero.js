// ---------------------------------------------------------------- banco de pruebas de Homer (hero_v2.js): las vistas de la hoja de modelo (web/lab/ref/homer_modelo.jpg)
// Cada t entero es una vista + una expresión. Frente, perfil y espalda con teleobjetivo (casi ortográfico) para comparar con la hoja.
// Poses del polo (el puño en P, el polo hacia D, el codo hacia ELBOW)
const P_BITE_T = v3(-0.09, -2.17, 3.06), D_BITE_T = v3(0.05, 0.86, -0.5), P_HOLD_T = v3(-0.4, -2.95, 3.05), D_HOLD_T = v3(0.06, 0.95, -0.22),
  P_LOW_T = v3(-1.3, -4.6, 3.15), D_LOW_T = v3(0.1, 0.9, 0.4), ELBOW_T = v3(-3.0, -4.4, 0.8);
// cámaras: [az (0 = de frente, −π/2 = perfil mirando a la derecha), elevación, distancia, altura a la que mira, fov]
const HV = { cuerpo: [0, 0, 150, -4.75, 7.6], cabeza: [0, 0, 120, 1.0, 3.6], lejos: 150 };
// el brazo del polo caído a un lado (para las vistas de cuerpo entero, como en la hoja)
const P_SIDE_T = v3(-3.05, -7.1, 0.6), D_SIDE_T = v3(0.0, 0.3, 1), ELB_SIDE_T = v3(-3.0, -5.0, -0.5);
// fondo de estudio (gris medio, como una foto de producto: la camisa blanca y la piel amarilla se leen bien) y suelo con sombra
function labBuild(head) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {},
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nvarying vec3 vP; void main(){\n#include <logdepthbuf_fragment>\nfloat e = smoothstep(-0.4, 0.6, vP.y); gl_FragColor = vec4(mix(vec3(0.19, 0.18, 0.17), vec3(0.3, 0.3, 0.31), e), 1.); }' });
  const bg = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), m); bg.renderOrder = -2; bg.frustumCulled = false; scene.add(bg);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.ShadowMaterial({ opacity: 0.28 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -13.6; fl.receiveShadow = true; scene.add(fl);
}
// expresión: [boca abierta, sonrisa, mueca], ojos abiertos (0..1,5), mirada (yaw, pitch)
function heroFace(U, jaw, smile, grim, open, yaw = 0, pitch = 0) {
  const mi = U.headMesh.morphTargetInfluences; mi[0] = jaw; mi[1] = smile; mi[2] = grim; U.jaw.rotation.x = JAW_A * jaw;
  for (const e of U.eyes) eyePose(e, open, 1, yaw, pitch);
}
const tele = (az, el, d, ly, fov, lz = 0) => [Math.sin(az) * Math.cos(el) * d, ly + Math.sin(el) * d, lz + Math.cos(az) * Math.cos(el) * d, 0, ly, lz, fov];
function labAt(t) {
  const U = S.hero.userData, v = Math.round(t);
  U.head.rotation.set(0, 0, 0);
  armPose(U, P_LOW_T, D_LOW_T, ELBOW_T); heroFace(U, 0, 0, 0, 1);
  const B = HV.cuerpo, C = HV.cabeza;
  switch (v) {
    case 1: armPose(U, P_SIDE_T, D_SIDE_T, ELB_SIDE_T); return tele(0, 0, B[2], B[3], B[4]);   // cuerpo entero de frente
    case 2: armPose(U, P_SIDE_T, D_SIDE_T, ELB_SIDE_T); U.head.rotation.y = 0.45; return tele(1.05, 0.02, B[2], B[3], B[4]);   // vestido, tres cuartos mirando a la izquierda (la cabeza más de perfil, como en la hoja)
    case 3: return tele(0, 0, C[2], C[3], C[4]);                               // cabeza de frente, boca en reposo («~»)
    case 4: return tele(-Math.PI / 2, 0, C[2], C[3], C[4], 0.45);              // cabeza de perfil (mira a la derecha, como en la hoja)
    case 5: return tele(Math.PI, 0, C[2], C[3], C[4]);                         // la nuca
    case 6: heroFace(U, 1, 0, 0, 1.05); return tele(0, 0, C[2], C[3], C[4]);   // boca en «O»
    case 7: heroFace(U, 0, 1, 0, 1.05); return tele(0, 0, C[2], C[3], C[4]);   // sonrisa grande
    case 8: heroFace(U, 0, 0, 1, 1.0); return tele(0, 0, C[2], C[3], C[4]);    // dientes apretados (como en la hoja)
    case 14: heroFace(U, 0, 0, 0.85, 0.2); U.head.rotation.x = 0.06; return tele(0, 0, C[2], C[3], C[4]);   // dolor: dientes apretados y ojos apretados
    case 9: armPose(U, P_BITE_T, D_BITE_T, ELBOW_T); heroFace(U, 0.65, 0, 0, 1.25, 0, 0.26); return [-11, 1.0, 30, -0.4, -3.2, 0, 26];   // tres cuartos: el mordisco
    case 10: armPose(U, P_SIDE_T, D_SIDE_T, ELB_SIDE_T); return tele(Math.PI, 0, B[2], B[3], B[4]);   // cuerpo entero de espaldas
    case 11: return tele(-Math.PI / 2, 0, B[2], B[3], B[4]);                   // cuerpo entero de perfil
    case 12: heroFace(U, 0, 0, 0, 1); return tele(-0.75, 0.08, 60, 0.6, 8.5);  // cabeza tres cuartos
    case 13: armPose(U, P_HOLD_T, D_HOLD_T, ELBOW_T); heroFace(U, 0, 0.4, 0, 1.05, 0.1, 0.2); return [-12, 0.2, 31, -0.6, -4.2, 0, 30];   // tres cuartos con el polo
  }
  return tele(0, 0, B[2], B[3], B[4]);
}
