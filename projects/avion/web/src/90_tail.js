// ---------------------------------------------------------------- un fotograma
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up2 = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60), t)); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36), t)); const PVP = vpOf();
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
  if (window.dbgHide) window.dbgHide();
  hudAt(t); drawFrame(t);
  return true;
};
// portada (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : 0.6; frame(t);
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); }
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); flowUpdate(t, VP, VP); fxUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0; post.uniforms.white.value = 0;
  hudBegin(); drawFrame(t);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '800' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Bebas', `url(${F}BebasNeue-Regular.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }),
    new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '600' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = Math.ceil((lines[lines.length - 1].end + 1.25) * 2) / 2;          // ≈ 1,3 s de cola tras la última palabra
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    explicaron1: atL(1, 'explicaron'), colegio1: atL(1, 'colegio'), avion1: atL(1, 'avion'), mal1: atL(1, 'mal'),
    nasa2: atL(2, 'nasa'), sostiene2: atL(2, 'sostiene'), avion2: atL(2, 'avion'), n575_2: atL(2, '=575'), toneladas2: atL(2, 'toneladas'), final2: atL(2, 'final'),
    contaron3: atL(3, 'contaron'), ala3: atL(3, 'ala'), aire3: atL(3, 'aire'), curva3: atL(3, 'curva'), arriba3: atL(3, 'arriba'), camino3: atL(3, 'camino'), corre3: atL(3, 'corre'), vez3: atL(3, 'vez'),
    pero4: atL(4, 'pero'), cita4: atL(4, 'cita'), tunel4: atL(4, 'tunel'), viento4: atL(4, 'viento'), llega4: atL(4, 'llega'), antes4: atL(4, 'antes'), mucho4: atL(4, 'mucho'), antes4b: atL(4, 'antes', 2),
    si5: atL(5, '=si'), curva5: atL(5, 'curva'), boca5: atL(5, 'boca'), abajo5: atL(5, 'abajo'),
    clave6: atL(6, 'clave'), inclinada6: atL(6, 'inclinada'), empuja6: atL(6, 'empuja'), abajo6: atL(6, 'abajo'),
    cientos7: atL(7, 'cientos'), segundo7: atL(7, 'segundo'),
    si8: atL(8, '=si'), abajo8: atL(8, 'abajo'), empuja8b: atL(8, 'empuja', 2), arriba8: atL(8, 'arriba'),
    arriba9: atL(9, 'arriba'), baja9: atL(9, 'baja'), sube9: atL(9, 'sube'), diferencia9: atL(9, 'diferencia'), levanta9: atL(9, 'levanta'), entero9: atL(9, 'entero'),
    respuesta10: atL(10, 'respuesta'), flota10: atL(10, 'flota'), rato10: atL(10, 'rato'),
    ventanilla11: atL(11, 'ventanilla'), pasillo11: atL(11, 'pasillo'), mandaselo11: atL(11, 'mandaselo'),
  };
  mats(); buildMats(); buildSceneMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(), sk = skyLand(); es.add(sk);                 // el reflejo del cielo y del valle
    const gr = new THREE.Mesh(new THREE.CircleGeometry(950, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.12, 0.13, 0.11) })); gr.rotation.x = -Math.PI / 2; gr.position.y = -70; es.add(gr);
    scene.environment = pm.fromScene(es, 0.02, 0.1, 3000).texture; scene.environmentIntensity = 0.75; }
  scene.fog = new THREE.FogExp2(HAZE.clone(), 0.00009); cam.near = 0.05; cam.far = 160000; cam.updateProjectionMatrix();
  buildFlow(); buildWorld(); buildTunnel(); buildLand();
  scene.traverse(o => { if (o.isInstancedMesh) o.frustumCulled = false; });      // las instancias se mueven: que nunca se recorten por una esfera vieja
  { const sun = S.rig.sun; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.position.set(-18, 30, 22); sun.target.position.set(0, 0, 0); const c = sun.shadow.camera; c.left = c.bottom = -9; c.right = c.top = 9; c.near = 1; c.far = 90; sun.shadow.bias = -0.0004; }
  buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
