// ---------------------------------------------------------------- cámara: un solo plano (sin cortes). En el rebobinado vuelve por su camino al primer fotograma;
// en el cierre sube a ver la pantalla desde arriba y al final baja otra vez al primer fotograma (bucle)
let CKS = [], A0 = null;
function buildCam() {
  A0 = [[0.62, 0.36, -2.95], [0.0, -0.02, -1.25], 40];                       // desde más allá del borde: los productos vienen hacia ti y caen al vacío
  const TOP = [[0.0, 4.65, 0.98], [0.0, 0.0, -0.02], 40];                      // la pantalla entera, desde arriba
  CKS = [
    [-3, ...A0],
    [0, ...A0],
    [K.producto1, [0.5, 0.42, -3.1], [0.0, -0.02, -1.2], 40],
    [K.gente1, [0.36, 0.4, -3.05], [0.0, 0.0, -1.3], 40],
    [TT.stop, [0.3, 0.42, -2.6], [0.0, 0.12, -1.45], 40],                      // «se pare»: el tarro, en el borde
    [K.final2, [0.22, 0.4, -2.45], [0.0, 0.12, -1.47], 40],
    [K.mandanos3 - 0.25, [0.35, 1.45, -2.75], [0.0, 0.0, -1.1], 40],          // sube por encima del borde antes de ir a la foto
    [K.mandanos3 + 0.1, [0.45, 2.7, -1.25], [0.0, 0.0, -0.45], 40],           // 3: cae la foto y se sube
    [K.foto3 + 0.15, [0.8, 3.05, 1.0], [0.0, 0.0, -0.42], 40],
    [K.producto3, [0.75, 2.9, 1.25], [0.0, 0.0, -0.4], 40],
    [K.convertimos4 + 0.25, [0.5, 1.25, 3.3], [0.0, 0.32, 0.2], 40],          // 4: la foto, de pie; sale el tarro
    [K.d3_4 + 0.2, [-0.35, 1.05, 3.25], [0.0, 0.3, 0.45], 40],
    [K.luz4, [-0.85, 1.2, 3.2], [0.0, 0.34, 0.5], 40],
    [K.movimiento4 + 0.3, [0.55, 1.0, 3.25], [0.0, 0.34, 0.55], 40],
    [K.voz4, [0.8, 1.05, 3.05], [0.0, 0.32, 0.6], 40],
    [K.asi5 + 0.5, ...TOP],                                                     // 5: los vídeos del canal
    [K.sin5, [0.0, 4.45, 0.92], [0.0, 0.0, -0.02], 40],
    [K.camara5 + 0.25, [-0.15, 3.3, 1.45], [-0.2, 0.0, 0.0], 40],              // la cámara que se deshace
    [K.dias6, [0.0, 4.4, 0.85], [0.0, 0.0, -0.1], 40],                        // 6: el contador
    [K.visualizaciones6, [0.0, 3.9, 0.55], [0.0, 0.0, -0.32], 40],
    [K.secreto7, [0.0, 4.4, 0.95], [0.0, 0.0, 0.05], 40],                      // 7: la barra del vídeo y el primer segundo
    [K.primer7 + 0.2, [0.0, 3.5, 1.75], [0.0, 0.0, 0.42], 40],
    [K.inesperado7, [0.0, 3.85, 1.35], [0.0, 0.0, 0.05], 40],
    [TT.rw0, [0.0, 4.0, 1.2], [0.0, 0.0, -0.05], 40],
  ];
  CKS.TOP = TOP;
}
const camPath = st => camKeys(st, CKS);
function camAt(t) {
  if (t < TT.cta0) return camPath(sceneT(t));
  const c0 = camPath(sceneT(TT.cta0)), arr = v => [v.x, v.y, v.z];
  return camKeys(t, [[TT.cta0, arr(c0.p), arr(c0.l), c0.f], [TT.cta0 + 0.55, [0.35, 2.3, -2.55], [0.0, 0.0, -0.9], 40], [TT.web + 0.25, ...CKS.TOP], [TT.loop0, [0.0, 4.3, 0.92], [0.0, 0.0, -0.06], 40],
    [END - 0.75, [0.45, 1.9, -2.75], [0.0, 0.0, -1.05], 40], [END - 0.12, ...A0], [END, ...A0]]);
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.stop, 0.03], [TT.land, 0.035], [TT.luz, 0.05], [TT.camGone, 0.04], [TT.rw1, 0.07]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function lightsOn(st) { return win(st, TT.luz, 0.12) * studioK(st); }
function stageAt(t, st0) {
  const st = sceneT(t); NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 5, 0.4, 1.2);
  rigAt(c, yaw, k, 0.95 + 0.5 * lightsOn(st), 0.62);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.14;
  scene.fog.density = 0.05;
  stageAt2(t, st);
  post.uniforms.fade.value = 0;
}
