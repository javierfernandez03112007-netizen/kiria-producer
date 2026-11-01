// ---------------------------------------------------------------- cámara: el collar → la mesa desde arriba («?») → el aula → la pizarra (cerebro) →
// tallímetro → ábaco → rincón de lectura → mesa 1 → calendario y puerta → pizarra (Cataluña) → mesa de la maestra → la clase vista por la
// maestra → la mesa (ensartar, escribir, la serie) → pizarra (11 años) → pizarra (conexiones) → el collar (bucle).
let CKS = [], CUTS = [];
const T0 = [0.2, 1.02, 0.66], L0 = [0, 0.835, 0], TA = [0.24, 1.06, 0.78], LA = [0, 0.83, 0];
const BRD = (x, d = 2.2, y = 1.48, ly = 1.47, dx = 0) => [[x + dx, y, -RZ + d], [x, ly, -RZ]];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p, l, f];
  const [b1p, b1l] = BRD(-1.07, 2.4, 1.44, 1.4), [b2p, b2l] = BRD(0, 2.35, 1.5, 1.5), [b3p, b3l] = BRD(1.05, 2.5, 1.42, 1.38), [b4p, b4l] = BRD(-1.07, 2.4, 1.44, 1.4);
  CKS = [[
    k(-1.0, TA, LA, 35), k(0.0, T0, L0, 34), k(K.collares1 - 0.1, [0.17, 0.99, 0.58], [0, 0.835, 0], 34), k(K.macarrones1 + 0.35, [0.42, 1.06, 0.98], [0.06, 0.72, 0], 40),
    k(K.verdad1 + 0.15, [0.36, 1.0, 0.86], [0.05, 0.73, 0], 39), k(K.para2 + 0.35, [-0.34, 1.32, 0.42], [-0.43, 0.55, -0.12], 38), k(K.final2 + 0.3, [-0.36, 1.27, 0.37], [-0.43, 0.55, -0.12], 37),
    k(K.jugar3 + 0.1, [1.2, 1.7, 2.3], [-0.2, 0.55, -0.5], 44), k(K.ninos3 + 0.35, [1.9, 2.05, 3.1], [-0.4, 0.5, -0.9], 46),
    k(K.realidad3 + 0.4, [0.6, 1.75, 0.6], [-0.7, 1.2, -2.5], 44), k(K.aprende3, [-0.75, 1.52, -1.1], [-1.05, 1.46, -RZ], 42), k(K.cerebro3 + 0.15, b1p, b1l, 40), k(K.psicologia4 - 0.2, [-1.08, 1.44, -RZ + 2.25], b1l, 41),
    k(K.psicologia4 + 0.3, [-2.42, 1.12, -0.5], [-2.42, 0.62, -RZ + 0.3], 50), k(K.edad4 + 0.25, [-2.4, 1.1, -0.62], [-2.42, 0.62, -RZ + 0.3], 49),
    k(K.matematicas5 + 0.25, [-2.62, 1.2, -1.32], [-3.9, 0.84, -2.72], 44), k(K.sumar5 - 0.1, [-2.85, 1.12, -1.55], [-3.9, 0.88, -2.74], 42), k(K.contar5 + 0.3, [-2.92, 1.1, -1.62], [-3.9, 0.9, -2.75], 41),
    k(K.lengua6 + 0.3, [-1.45, 0.95, 0.55], [-2.66, 0.16, 0.08], 46), k(K.leer6, [-1.48, 0.78, 0.3], [-2.66, 0.12, 0.04], 46), k(K.letra6b + 0.2, [-1.42, 0.64, -0.1], [-2.55, 0.1, -0.12], 48),
    k(K.dislexia7 + 0.15, [-1.98, 0.84, -0.34], [-2.02, 0.6, -0.95], 42), k(K.tdah7 - 0.25, [-1.96, 0.84, -0.35], [-2.0, 0.6, -0.95], 42), k(K.tdah7 + 0.12, [-1.79, 0.83, -0.36], [-1.8, 0.6, -0.95], 42), k(K.autismo7 - 0.25, [-1.77, 0.83, -0.37], [-1.79, 0.6, -0.95], 42), k(K.autismo7 + 0.12, [-1.6, 0.84, -0.36], [-1.6, 0.61, -0.95], 42),
    k(K.misma7, [-1.5, 1.2, 0.5], [-1.8, 0.6, -0.95], 44), k(K.clase7 + 0.35, [1.3, 2.3, 2.9], [-1.2, 0.55, -1.0], 46),
    k(K.meses8 + 0.1, [2.7, 1.5, 0.6], [4.18, 1.4, -0.12], 44), k(K.practicas8 + 0.2, [2.72, 1.48, 0.66], [4.18, 1.36, -0.02], 44), k(K.colegio8 + 0.25, [2.72, 1.62, 0.1], [4.18, 1.85, 1.3], 46),
    k(K.facil9 + 0.35, [0, 1.42, -RZ + 2.35], [0, 1.32, -RZ], 44), k(K.mitad9, [0.02, 1.4, -RZ + 2.25], [0, 1.31, -RZ], 43), k(K.entrar9 + 0.2, [0.0, 1.4, -RZ + 2.2], [0, 1.31, -RZ], 43),
    k(K.oposicion10 + 0.1, [2.52, 1.24, -1.5], [2.5, 0.84, -2.8], 44), k(K.diecinueve10 + 0.1, [2.6, 1.18, -1.58], [2.6, 0.82, -2.72], 42), k(K.plaza10 + 0.1, [2.6, 1.08, -1.9], [2.6, 0.82, -2.86], 40), k(K.infantil10 + 0.3, [2.6, 1.07, -1.92], [2.6, 0.82, -2.86], 40),
    k(K.sacas11 + 0.1, [0.45, 1.62, -3.05], [0.0, 0.55, 1.0], 50), k(K.anos11 + 0.2, [0.42, 1.6, -3.0], [0.0, 0.55, 1.0], 50), k(K.tu11 + 0.1, [0.36, 1.56, -2.8], [0.0, 0.6, 1.0], 48),
    k(K.macarrones12 + 0.25, [0.36, 1.0, 0.85], [0.1, 0.6, 0.05], 42), k(K.ensartarlos12 + 0.15, [0.05, 0.75, 0.62], [0.17, 0.565, 0.2], 36), k(K.pinza12, [0.07, 0.71, 0.54], [0.18, 0.562, 0.2], 34), k(K.usara12 - 0.22, [0.08, 0.7, 0.52], [0.18, 0.562, 0.2], 34),
    k(K.usara12, [0.24, 0.88, 0.25], [0.11, 0.56, -0.14], 38), k(K.escribir12 + 0.6, [0.2, 0.84, 0.18], [0.1, 0.56, -0.15], 36),
    k(K.alterna13 + 0.2, [0.44, 0.82, 0.64], [0.03, 0.56, 0.2], 44), k(K.serie13 + 0.2, [0.4, 0.8, 0.6], [0.02, 0.56, 0.2], 44), k(K.cuatro13, [0.42, 0.84, 0.66], [0.02, 0.565, 0.2], 45), k(K.predice13 - 0.05, [0.42, 0.86, 0.68], [0.02, 0.57, 0.2], 45),
    k(K.matematicas13 + 0.15, b3p, b3l, 42), k(K.once13 + 0.4, [1.05, 1.42, -RZ + 2.4], b3l, 42),
    k(K.primeros14, b4p, b4l, 42), k(K.segundo14 + 0.2, [-1.07, 1.42, -RZ + 2.1], [-1.07, 1.4, -RZ], 42),
    k(K.magisterio15, [0.34, 1.02, 0.88], [0.04, 0.78, 0], 40), k(K.collares15, [0.24, 0.94, 0.6], [0, 0.83, 0], 39), k(K.sabiendo15, [0.18, 0.92, 0.47], [0, 0.835, 0], 38),
    k(K.facil16, [0.2, 0.93, 0.48], [0, 0.835, 0], 39),
    k(END - 1.0, TA, LA, 35), k(END, T0, L0, 34), k(END + 0.5, [0.19, 1.01, 0.62], [0, 0.835, 0], 34),
  ]];
}
function camAt(t) { return camKeys(t, CKS[0]); }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// destellos en los momentos clave
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.verdad1, 0.08], [K.cerebro3, 0.05], [K.suspendio9, 0.05], [K.plaza10, 0.05], [K.tu11, 0.07], [K.millon14, 0.08], [K.sabiendo15, 0.07]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt() { return 0; }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) { NOW = t; propsAt(t); boardAt(t); rigAt(st.l, st.p); }
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up2 = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60))); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36))); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, st); flowUpdate(t, VP, PVP); fxUpdate(t, VP, PVP);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up2.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up2, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  post.uniforms.flash.value = flashAt(t); post.uniforms.white.value = whiteAt(t); post.uniforms.tint.value.set(0, 0, 0);
  return st;
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  renderer.setRenderTarget(rtF); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(fxScene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = rtA.texture; brightM.uniforms.tF.value = rtF.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BLW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BLH);
  blurPass(rtB[0], rtC[1], 2 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BLH); blurPass(rtC[0], rtC[1], 3 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BLH);
  hg.getImageData(0, 0, 1, 1); hudTex.needsUpdate = true; post.uniforms.tH.value = hudTex;
  quad.material = post; post.uniforms.tA.value = rtA.texture; post.uniforms.tF.value = rtF.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP); }
  hudAt(t); drawFrame(t);
  return true;
};
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : 0.6; frame(t);
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigAt(v3(C[3], C[4], C[5]), cam.position); }
  const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0;
  hudBegin(); drawFrame(t);
  return true;
};
