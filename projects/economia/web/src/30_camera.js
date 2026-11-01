// ---------------------------------------------------------------- cámara: los gestores en la montaña dorada → la sala → el panel («?») → monedas →
// alquiler → macro → panel (matemáticas, econometría) → torre → medallas → panel y burbuja → comisiones → la línea que copia → humo → panel → bucle.
let CKS = [], CUTS = [];
const T0 = [1.72, 1.6, 1.78], L0 = [0.78, 1.33, 0.42], TA = [1.95, 1.7, 2.05], LA = [0.7, 1.32, 0.42];
const BV = (z = 1.4, y = 3.1, ly = 3.72, x = 0) => [[x, y, z], [x, ly, -RZ]];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p, l, f];
  const [bp, bl] = BV(), [bp2, bl2] = BV(1.4, 3.1, 4.05);
  CKS = [[
    k(-1.0, TA, LA, 37), k(0.0, T0, L0, 36), k(K.subio1, [1.8, 1.66, 1.9], [0.7, 1.32, 0.42], 37), k(K.pct1 + 0.3, [3.0, 2.3, 4.3], [0, 1.2, 0.35], 44), k(K.n96 - 0.1, [1.2, 1.8, 2.6], [-0.2, 1.15, 0.4], 42),
    k(K.profes1, [-0.45, 1.45, 2.0], [-1.3, 0.95, 0.4], 44), k(K.peor1, [-0.75, 1.32, 1.55], [-1.42, 0.88, 0.4], 42),
    k(K.para2 - 0.1, bp2, bl2, 44), k(K.final2, [0, 3.2, 1.0], [0, 3.72, -RZ], 43),
    k(K.crees3 + 0.15, [-1.35, 1.3, 3.05], [-2.4, 0.92, 2.3], 40), k(K.realidad3, [-1.5, 1.22, 2.9], [-2.35, 0.95, 2.25], 38), k(K.consigue3 + 0.2, [-1.55, 1.2, 2.85], [-2.35, 0.92, 2.25], 38),
    k(K.micro4 + 0.25, [-1.25, 1.25, 1.15], [-2.35, 1.02, 0.42], 44), k(K.alquiler4 + 0.2, [-1.32, 1.22, 1.1], [-2.35, 1.04, 0.42], 43),
    k(K.macro5 + 0.25, [-0.05, 1.42, -1.6], [-2.35, 1.06, -1.7], 50), k(K.crisis5 + 0.25, [-0.12, 1.4, -1.62], [-2.35, 1.06, -1.7], 49),
    k(K.mates6 + 0.2, bp, bl, 46), k(K.esperas6, [0, 3.3, 1.2], [0, 3.72, -RZ], 45), k(K.econom7 + 0.2, [0.05, 3.32, 1.1], [0.05, 3.74, -RZ], 45), k(K.no7, [0.05, 3.3, 1.0], [0.05, 3.72, -RZ], 45),
    k(K.finanzas8 + 0.3, [1.35, 1.75, -0.6], [2.5, 1.45, -2.0], 44), k(K.empresa8 + 0.2, [1.45, 1.7, -0.75], [2.5, 1.5, -2.0], 43),
    k(K.loco9 + 0.2, [0, 3.2, 1.3], [0, 3.72, -RZ], 46), k(K.nobel9 + 0.1, [0, 3.15, 1.2], [0, 3.72, -RZ], 46), k(K.dos9 + 0.05, [1.6, 1.3, 1.15], [2.5, 1.18, 0.1], 38), k(K.contrario9 + 0.3, [1.55, 1.28, 1.1], [2.5, 1.18, 0.1], 37),
    k(K.uno10 + 0.2, [0, 3.2, 1.3], [0, 3.72, -RZ], 46), k(K.otro10 + 0.2, [0.05, 3.25, 0.8], [0.05, 3.72, -RZ], 42), k(K.infla10 + 0.15, [1.5, 1.95, 2.5], [0.5, 1.75, 0.4], 42), k(K.quien11 - 0.15, [1.45, 1.95, 2.45], [0.55, 1.78, 0.4], 41),
    k(K.quien11 + 0.35, [0, 3.2, 1.3], [0, 3.72, -RZ], 46), k(K.intentar11 - 0.1, [0.05, 3.2, 0.8], [0.05, 3.7, -RZ], 42),
    k(K.cuesta11, [1.25, 1.3, 3.25], [2.38, 0.9, 2.3], 42), k(K.bien11 + 0.15, [1.3, 1.28, 3.2], [2.38, 0.9, 2.3], 41),
    k(K.fondos12 + 0.1, [0, 3.2, 1.0], [0, 3.72, -RZ], 43), k(K.copian12 + 0.3, [2.5, 1.85, 3.1], [0.1, 1.2, 0.5], 44), k(K.todos12 + 0.2, [2.1, 1.7, 2.8], [0.6, 1.3, 0.6], 42),
    k(K.para13 + 0.3, [0.55, 1.4, 2.6], [0, 1.05, 1.3], 40), k(K.humo13 + 0.3, [0.5, 1.35, 2.5], [0, 1.1, 1.3], 39),
    k(K.asesor14, [0, 3.1, 1.2], [0, 3.7, -RZ], 43), k(K.indexado14 + 0.3, [0.05, 3.15, 1.0], [0.05, 3.7, -RZ], 42),
    k(END - 1.0, TA, LA, 37), k(END, T0, L0, 36), k(END + 0.5, [1.7, 1.59, 1.75], [0.78, 1.33, 0.42], 36),
  ]];
  const ks = CKS[0]; for (let i = 1; i < ks.length; i++) if (ks[i][0] <= ks[i - 1][0] + 0.04) ks[i][0] = ks[i - 1][0] + 0.04;
}
function camAt(t) { return camKeys(t, CKS[0]); }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// destellos en los momentos clave
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.n96, 0.06], [K.para2, 0.05], [K.contrario9, 0.05], [K.burst, 0.07], [K.primero11, 0.05], [K.humo13, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
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
