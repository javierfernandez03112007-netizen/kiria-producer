// ---------------------------------------------------------------- un fotograma (renderAt), portada y arranque: tipos de letra, tiempos de la voz y escena
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
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    hoy1: atL(1, 'hoy'), huelga1: atL(1, 'huelga'), toda1: atL(1, 'toda'), espana1: atL(1, 'espana'), solo1: atL(1, 'solo'), sueldos1: atL(1, 'sueldos'),
    si2: atL(2, '=si'), haces2: atL(2, 'haces'), despedir2: atL(2, 'despedir'), digo2: atL(2, 'digo'), final2: atL(2, 'final'),
    primera3: atL(3, 'primera'), ccoo3: atL(3, 'ccoo'), ugt3: atL(3, 'ugt'), catorce3: atL(3, 'catorce'), anos3: atL(3, 'anos'), sindicatos3: atL(3, 'sindicatos'), inquilinas3: atL(3, 'inquilinas'),
    lema3: atL(3, 'lema'), salarios3: atL(3, 'salarios'), vivienda3: atL(3, 'vivienda'), precios3: atL(3, 'precios'),
    piden4: atL(4, 'piden'), subir4: atL(4, 'subir'), sueldos4: atL(4, 'sueldos'), n7: atL(4, '=7'), bajar4: atL(4, 'bajar'), alquileres4: atL(4, 'alquileres'), desahucio4: atL(4, 'desahucio'), alternativa4: atL(4, 'alternativa'),
    vivienda5: atL(5, 'vivienda'), laboral5: atL(5, 'laboral'), dicen5: atL(5, 'dicen'), sueldo5: atL(5, 'sueldo'), llega5: atL(5, 'llega'), alquiler5: atL(5, 'alquiler'),
    asociacion6: atL(6, 'asociacion'), pymes6: atL(6, 'pymes'), calcula6: atL(6, 'calcula'), costara6: atL(6, 'costara'), n1850: atL(6, '=1850'), n4560: atL(6, '=4560'), millones6: atL(6, 'millones'),
    y7: atL(7, '=y'), patronal7: atL(7, 'patronal'), electoral7: atL(7, 'electoral'), dos7: atL(7, 'dos'), campana7: atL(7, 'campana'), generales7: atL(7, 'generales'), n29: atL(7, '=29'), noviembre7: atL(7, 'noviembre'),
    hoy8: atL(8, 'hoy'), paros8: atL(8, 'paros'), medianoche8: atL(8, 'medianoche'), minimos8: atL(8, 'minimos'), manifestaciones8: atL(8, 'manifestaciones'), ciudades8: atL(8, 'ciudades'),
    y9: atL(9, '=y'), despido9: atL(9, 'despido'), despedir9: atL(9, 'despedir'), sancionar9: atL(9, 'sancionar'), fundamental9: atL(9, 'fundamental'), avisar9: atL(9, 'avisar'), sustituirte9: atL(9, 'sustituirte'), pero9: atL(9, 'pero'), cobras9: atL(9, 'cobras'),
    tu10: atL(10, '=tu'), haces10: atL(10, 'haces'), trabajar10: atL(10, 'trabajar'), leo10: atL(10, 'leo'), mandaselo10: atL(10, 'mandaselo'), quien10: atL(10, 'quien'), hacerla10: atL(10, 'hacerla'),
  };
  SPAIN = await (await fetch('./spain.json')).json();
  mats(); buildMats(); buildMedMats(); buildRig(); S.flow = [];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; }
  buildDay(); buildMap(); buildCity();
  post.uniforms.ca.value = 0.35; post.uniforms.vig.value = 0.22;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
