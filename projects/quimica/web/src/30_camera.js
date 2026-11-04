// ---------------------------------------------------------------- cámara: un plano continuo (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
let NOWL = new THREE.Vector3();
function buildCam() {
  const A0 = [[0.62, 1.7, 5.6], [0.15, 1.52, 3.42], 40];             // gancho: la fábrica dentro del tubo de ensayo
  CKS = [
    [0, ...A0],
    [K.misma1, [0.5, 1.7, 5.2], [0.15, 1.6, 3.42], 40],
    [K.gramos2 - 0.12, [-0.68, 1.42, 4.35], [-1.3, 1.02, 3.2], 36],     // 1: la balanza: gramos
    [K.toneladas2 + 0.15, [1.4, 2.4, 7.2], [0.0, 2.4, -0.5], 42],      // la fábrica sale del tubo
    [K.cobra3, [3.0, 4.3, 11.5], [0.0, 4.0, -7.5], 44],                // … y crece al fondo
    [K.final3, [0.0, 3.0, 10.2], [0.0, 3.4, -5.0], 42],                // 2: el duelo, laboratorio delante y fábrica detrás
    [K.primero4, [-1.6, 2.5, 8.8], [0.0, 3.0, -4.0], 42],              // 3: 1.º curso, casi igual
    [K.laboratorio4 + 0.35, [1.4, 2.5, 8.3], [0.0, 3.0, -4.0], 42],
    [K.separan5 + 0.1, [0.9, 2.15, 6.0], [0.15, 1.8, 3.42], 40],       // 4: el químico: la molécula
    [K.moleculas5 + 0.1, [0.95, 2.3, 6.15], [0.15, 1.95, 3.42], 38],
    [K.nuevo5 + 0.25, [-0.55, 2.25, 6.05], [0.15, 1.95, 3.42], 38],
    [K.tubo5 + 0.05, [-0.1, 1.48, 4.75], [-0.62, 1.12, 3.8], 36],       // … que entra en el tubo de ensayo
    [K.ensayo5 + 0.45, [0.0, 1.42, 4.68], [-0.62, 1.1, 3.8], 36],
    [K.receta6, [0.9, 2.2, 7.0], [-0.1, 1.85, 4.4], 40],                // 5: la receta vuela a la fábrica
    [K.fabrica6 + 0.35, [5.0, 5.4, 4.5], [-1.5, 3.8, -7.5], 44],
    [K.reactores6, [-0.6, 5.6, -2.4], [-3.3, 3.6, -9.6], 40],          // reactor
    [K.columnas6, [5.2, 7.8, -4.4], [1.9, 6.6, -11.6], 42],            // columna
    [K.tuberias6, [4.6, 7.4, -0.4], [0.0, 3.8, -6.0], 42],             // tuberías
    [K.toneladas6, [13.0, 2.8, -1.6], [9.8, 1.7, -7.8], 42],           // el camión, cargado
    [K.seguras6, [9.0, 7.6, 5.8], [0.5, 3.6, -9.5], 44],
    [K.baratas6 + 0.45, [7.6, 6.9, 6.8], [0.5, 3.6, -9.5], 44],
    [K.uno7, [-1.6, 2.0, 6.6], [0.0, 1.45, 3.4], 40],                  // 6: dónde acaba cada uno
    [K.farmaceuticas7 + 0.15, [-1.2, 2.1, 6.3], [0.0, 1.5, 3.4], 40],
    [K.otro7, [6.6, 5.2, 3.8], [0.0, 4.0, -9.5], 44],
    [K.depuradoras7 + 0.25, [5.6, 5.5, 4.8], [0.0, 4.0, -9.5], 44],
    [K.trabajo8, [0.0, 3.5, 11.8], [0.0, 3.0, -4.0], 44],              // 7: trabajo y sueldo (con el duelo de fondo)
    [K.cuatro9, [-2.4, 3.7, 11.2], [0.0, 3.6, -5.0], 44],
    [K.mas10 + 0.45, [2.4, 3.7, 11.2], [0.0, 3.6, -5.0], 44],
    [K.sin11, [5.6, 5.0, 2.8], [-1.0, 3.6, -9.5], 44],                 // 8: sin el químico, la fábrica se apaga…
    [K.fabricar11, [1.2, 3.3, 9.8], [-1.6, 3.0, -4.5], 44],            // … y su gota la enciende
    [K.laboratorio12, [0.0, 3.0, 10.3], [0.0, 3.3, -5.0], 42],         // 9: ¿laboratorio o fábrica?
    [K.ingenieria12 + 0.35, [0.0, 2.8, 9.7], [0.0, 3.2, -5.0], 42],
    [END - 1.0, [0.9, 1.95, 6.3], [0.15, 1.66, 3.42], 40],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  const u = t - TT.grow0; if (u > 0 && u < 0.6) { const a = 0.04 * Math.exp(-u * 6); st.p.x += Math.sin(u * 83) * a; st.p.y += Math.sin(u * 71 + 1) * a; }   // golpe al romperse el tubo
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.grow0, 0.1], [K.nuevo5, 0.05], [TT.relight, 0.06]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; NOWL.copy(st.l);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 6, 0.45, 2.8);
  rigAt(c, yaw, k, 0.62, 0.62);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.3;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
