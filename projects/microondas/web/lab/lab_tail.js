// ---------------------------------------------------------------- laboratorio del microondas: la cocina real (HDRI «Blinds», encimera, luz de ventana) + el módulo que se
// prueba. El archivo de prueba define async labBuild() (construye, una vez) y labAt(t) (anima y devuelve la cámara [px,py,pz, lx,ly,lz, fov, desenfoque?, enfoque?] en cm).
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
let SRC = rtA;
function drawFrame(t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam); SRC = rtA;
  if (dofM.uniforms.scale.value > 0) { quad.material = dofM; dofM.uniforms.tA.value = rtA.texture; dofM.uniforms.tD.value = rtA.depthTexture; dofM.uniforms.logF.value = Math.log2(cam.far + 1);
    renderer.setRenderTarget(rtD); renderer.render(quadScene, quadCam); SRC = rtD; }
  renderer.setRenderTarget(rtF); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(fxScene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = SRC.texture; brightM.uniforms.tF.value = rtF.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BLW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BLH);
  blurPass(rtB[0], rtC[1], 2 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BLH); blurPass(rtC[0], rtC[1], 3 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BLH);
  hg.getImageData(0, 0, 1, 1); hudTex.needsUpdate = true; post.uniforms.tH.value = hudTex;
  quad.material = post; post.uniforms.tA.value = SRC.texture; post.uniforms.tF.value = rtF.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  NOW = t; const c = labAt(t);
  cam.fov = c[6] || 34; cam.updateProjectionMatrix(); cam.position.set(c[0], c[1], c[2]); cam.up.set(0, 1, 0); cam.lookAt(c[3], c[4], c[5]); cam.updateMatrixWorld();
  const l = v3(c[3], c[4], c[5]); lightsAt(l, cam.position.distanceTo(l));
  dofM.uniforms.focus.value = c[8] || cam.position.distanceTo(l); dofM.uniforms.scale.value = c[7] || 0;          // [7] = desenfoque (0 = no), [8] = distancia de enfoque
  const VP = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0; post.uniforms.tint.value.set(0, 0, 0);
  hudBegin(); drawFrame(t); return true;
};
(async () => {
  mats(); buildMats(); S.flow = [];
  await loadEnv(); buildCounter(); buildLights(); cam.near = 0.05; cam.far = 8000; cam.updateProjectionMatrix();
  post.uniforms.ca.value = 0.2; post.uniforms.vig.value = 0.22; post.uniforms.bloom.value = 0.5;
  await labBuild();
  await waitLoads();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost(); window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
