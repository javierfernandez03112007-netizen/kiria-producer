// ---------------------------------------------------------------- cámara: esquiador congelado → sus gafas → el cristal de hielo y los colores → la nieve y el ojo →
// las gafas grandes desmontadas (espejo, lente, polarizado, cámara de aire) → sol (categoría 3) → bajada nublada a través de la lente → duelo → bucle
let CKS = [], CUTS = [];
const P0 = [2.05, 0.42, 3.55], L0 = [-0.25, 1.32, -0.6];
function buildCam() {
  const k = (t, p, l, f = 40) => [t, p.isVector3 ? [p.x, p.y, p.z] : p, l.isVector3 ? [l.x, l.y, l.z] : l, f];
  const SG = wpos(SK.gog), F = HG_F, UP = v3(0, 1, 0), R = F.clone().cross(UP).normalize(), H = HG_P;
  const at = (o, f = 0, r = 0, u = 0) => o.clone().addScaledVector(F, f).addScaledVector(R, r).addScaledVector(UP, u);
  const P2 = P2G, F2 = F2G, R2 = F2.clone().cross(UP).normalize();
  const at2 = (f = 0, r = 0, u = 0) => P2.clone().addScaledVector(F2, f).addScaledVector(R2, r).addScaledVector(UP, u);
  CKS = [[
    k(-1.0, [2.1, 0.44, 3.65], L0, 48), k(0.0, P0, L0, 48), k(K.cielo1, [1.75, 0.48, 3.55], [-0.45, 1.5, -0.7], 48), k(K.suelo1 + 0.25, [2.3, 0.55, 2.8], [0.2, 0.9, -0.5], 46),
    k(K.porque2 + 0.1, SG.clone().add(v3(1.05, 0.12, 0.85)), SG, 36), k(K.naranjas2, SG.clone().add(v3(0.42, 0.05, 0.3)), SG, 30), k(K.espejo2 + 0.25, SG.clone().add(v3(0.3, 0.03, 0.2)), SG, 27), k(K.final2 + 0.15, SG.clone().add(v3(0.27, 0.035, 0.18)), SG, 27),
    k(K.luz3 + 0.35, [4.6, 2.6, 5.4], [-0.6, 5.6, -2.2], 54), k(K.colores3, [6.8, 3.8, 6.1], [-0.6, 5.2, -2.0], 56), k(K.ultra3 + 0.3, [7.3, 4.1, 6.4], [-0.4, 4.9, -1.8], 56),
    k(K.nieve4 + 0.25, [6.0, 1.7, 5.2], [2.8, 0.5, 1.2], 46), k(K.n80, [5.6, 0.75, 4.9], [3.3, 1.7, 2.0], 50),
    k(K.quema4, EYE_P.clone().add(v3(1.25, -1.55, 1.05)), EYE_P, 40), k(K.ojos4 + 0.25, EYE_P.clone().add(v3(0.95, -1.25, 0.85)), EYE_P, 36),
    k(K.vamos5 + 0.15, H.clone().add(v3(2.6, 0.6, 1.6)), H.clone().add(v3(0, 0.3, 0)), 44), k(K.desmontar5 + 0.6, H.clone().add(v3(2.95, 0.55, 1.75)), H.clone().add(v3(0, 0.1, 0)), 46),
    k(K.fuera6 + 0.2, H.clone().add(v3(2.0, -0.08, 1.2)), H.clone().add(v3(0, -0.32, 0)), 40), k(K.rebota6 + 0.2, H.clone().add(v3(2.2, -0.12, 1.3)), H.clone().add(v3(0, -0.3, 0)), 41),
    k(K.detras7, H.clone().add(v3(1.95, 0.05, 1.15)), H.clone().add(v3(0, -0.16, 0)), 38), k(K.ultra7, H.clone().add(v3(1.9, 0.02, 1.12)), H.clone().add(v3(0, -0.16, 0)), 38),
    k(K.polar8, H.clone().add(v3(2.3, 0.4, 1.35)), H.clone().add(v3(0, 0.02, 0)), 42), k(K.horizontal8, H.clone().add(v3(2.0, 0.25, 1.2)), H.clone().add(v3(0, -0.02, 0)), 40), k(K.vertical8, H.clone().add(v3(1.55, 0.18, 0.95)), H.clone().add(v3(0, 0.06, 0)), 36), k(K.pasar8 + 0.2, H.clone().add(v3(1.6, 0.2, 0.98)), H.clone().add(v3(0, 0.06, 0)), 36),
    k(K.segunda9 + 0.1, H.clone().add(v3(1.95, 0.55, 1.15)), H.clone().add(v3(0, 0.24, 0)), 38), k(K.empane9 + 0.2, H.clone().add(v3(1.7, 0.5, 1.0)), H.clone().add(v3(0, 0.27, 0)), 36),
    k(K.color10 + 0.5, H.clone().addScaledVector(F10, 2.2).add(v3(0, 0.05, 0)), H, 40), k(K.categoria10, H.clone().addScaledVector(F10, 1.85), H, 38), k(K.luz10 + 0.2, H.clone().addScaledVector(F10, 1.75).add(v3(0.25, 0.1, -0.3)), H, 38),
    k(K.dias11, at2(1.6, 0.4, 0.25), P2, 42), k(K.rosa11 + 0.2, at2(1.2, -0.25, 0.15), P2, 40),
    k(K.azul11, at2(0.15, -1.4, 0.3), P2, 42), k(K.dispersa11, at2(-0.85, -0.05, 0.12), at2(8, 0, -0.7), 52),
    k(K.vuelves11, at2(-0.55, 0.0, 0.07), at2(10, 0, -0.9), 56), k(K.relieve11 + 0.3, at2(-0.46, 0.02, 0.06), at2(12, 0.2, -1.0), 55),
    k(K.color12 + 0.2, at2(-1.55, 0.2, 0.32), at2(0, 0, 0.02), 46), k(K.moda12 + 0.25, at2(0.2, 1.5, 0.35), P2, 44), k(K.decides12, at2(2.2, 0.15, 0.12), P2, 42), k(K.tu12 + 0.3, at2(2.75, 0.05, 0.14), at2(0, 0, 0.04), 44), k(K.espejo12 + 0.3, at2(2.7, -0.05, 0.12), at2(0, 0, 0.04), 44),
    k(END - 0.75, [2.4, 0.5, 3.9], [-0.2, 1.4, -0.55], 46), k(END, P0, L0, 48), k(END + 0.5, [2.02, 0.41, 3.5], L0, 48),
  ]];
  const ks = CKS[0]; for (let i = 1; i < ks.length; i++) if (ks[i][0] <= ks[i - 1][0] + 0.04) ks[i][0] = ks[i - 1][0] + 0.04;
}
function camAt(t) { return camKeys(t, CKS[0]); }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// destellos en los momentos clave
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.desmontar5 + 0.1, 0.05], [K.deja8, 0.04], [K.relieve11, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt() { return 0; }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) { NOW = t; propsAt(t); pulsesAt(t); }
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
  renderer.setRenderTarget(rtM); renderer.setClearColor(0x000000, 1); renderer.clear(); if (post.uniforms.lensK.value > 0.001) renderer.render(maskScene, cam);
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
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); }
  const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0;
  hudBegin(); drawFrame(t);
  return true;
};
