// ---------------------------------------------------------------- laboratorio: Homer en modo fantasma (cristal azul) sobre fondo oscuro + el módulo que se prueba.
// El archivo de prueba define labBuild(head) (construye el módulo, una vez) y labAt(t) (anima el módulo y devuelve la cámara [px,py,pz, lx,ly,lz, fov]).
// window.GHOST (0..1) controla el fantasma; window.NOHERO = true lo oculta.
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
  NOW = t; const c = labAt(t);
  cam.fov = c[6] || 34; cam.updateProjectionMatrix(); cam.position.set(c[0], c[1], c[2]); cam.up.set(0, 1, 0); cam.lookAt(c[3], c[4], c[5]); cam.updateMatrixWorld();
  if (S.hero) S.hero.updateMatrixWorld(true);
  const VP = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0; post.uniforms.tint.value.set(0, 0, 0);
  hudBegin(); drawFrame(t); return true;
};
(async () => {
  mats(); buildMats(); S.flow = [];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; }
  scene.background = new THREE.Color(window.LABDAY ? 0xe9e6e1 : 0x02050b);
  const hemi = new THREE.HemisphereLight(0x9fb8ff, 0x101018, 0.6), key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4); scene.add(hemi, key); S.LAB = { hemi, key };
  if (window.LABDAY) { hemi.color.set(0xfff4ea); hemi.groundColor.set(0xb9a99b); hemi.intensity = 0.8; key.intensity = 2.6; key.position.set(-3, 4.2, 3.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    const c = key.shadow.camera; c.left = c.bottom = -9; c.right = c.top = 9; c.near = 0.5; c.far = 40; key.shadow.normalBias = 0.02; key.target.position.set(0, -5, 0); scene.add(key.target);
    const fill = new THREE.DirectionalLight(0xdfeaff, 0.6); fill.position.set(4, 1, 3); const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(2, 3, -5); scene.add(fill, rim); scene.environmentIntensity = 0.6; }
  if (typeof preloadHero === 'function') await preloadHero();
  S.hero = buildHero(); scene.add(S.hero); S.hero.traverse(o => { o.renderOrder = 30; }); FZ.gh.value = window.GHOST ?? (window.LABDAY ? 0 : 1); S.hero.visible = !window.NOHERO;
  { const U = S.hero.userData; armPose(U, v3(-0.36, -1.66, 1.62), v3(0.2, 0.8, -0.56), v3(-2, -3.9, 0.9)); }
  post.uniforms.ca.value = 0.25; post.uniforms.vig.value = 0.35; post.uniforms.bloom.value = 0.9;
  labBuild(S.hero.userData.head);
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.dbgEval = s => eval(s); window.glLost = () => renderer.getContext().isContextLost(); window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
