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
  if (S.ctrCone) S.ctrCone.visible = false;      // en la portada, sin el haz del centro (de frente se ve como columnas)
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
    imaginas1: atL(1, 'imaginas'), veterinaria1: atL(1, 'veterinaria'), curando1: atL(1, 'curando'), perros1: atL(1, 'perros'), gatos1: atL(1, 'gatos'), y1: atL(1, '=y', 2), dia1: atL(1, 'dia'),
    meter1: atL(1, 'meter'), brazo1: atL(1, 'brazo'), entero1: atL(1, 'entero'), dentro1: atL(1, 'dentro'), vaca1: atL(1, 'vaca'),
    por2: atL(2, 'por'), digo2: atL(2, 'digo'), final2: atL(2, 'final'),
    crees3: atL(3, 'crees'), carrera3: atL(3, 'carrera'), mascotas3: atL(3, 'mascotas'), realidad3: atL(3, 'realidad'), estudias3: atL(3, 'estudias'), muchos3: atL(3, 'muchos'), animales3: atL(3, 'animales'), vez3: atL(3, 'vez'),
    anatomia4: atL(4, 'anatomia'), no4: atL(4, '=no'), cuerpo4: atL(4, 'cuerpo'), sino4: atL(4, 'sino'), muchos4: atL(4, 'muchos'), perro4: atL(4, 'perro'), gato4: atL(4, 'gato'), caballo4: atL(4, 'caballo'), vaca4: atL(4, 'vaca'), cerdo4: atL(4, 'cerdo'), gallina4: atL(4, 'gallina'),
    farmacologia5: atL(5, 'farmacologia'), mismo5: atL(5, 'mismo'), medicamento5: atL(5, 'medicamento'), otra5: atL(5, 'otra'), dosis5: atL(5, 'dosis'), cada5: atL(5, 'cada'), especie5: atL(5, 'especie'),
    microbiologia6: atL(6, 'microbiologia'), parasitos6: atL(6, 'parasitos'), enferma6: atL(6, 'enferma'), animal6: atL(6, 'animal'), y6: atL(6, '=y', 2), pasarte6: atL(6, 'pasarte'), ti6: atL(6, '=ti'),
    produccion7: atL(7, 'produccion'), animal7: atL(7, 'animal'), granjas7: atL(7, 'granjas'), alimentacion7: atL(7, 'alimentacion'), genetica7: atL(7, 'genetica'),
    cirugia8: atL(8, 'cirugia'), quirofano8: atL(8, 'quirofano'), anestesia8: atL(8, 'anestesia'), puntos8: atL(8, 'puntos'),
    y9: atL(9, '=y'), casi9: atL(9, 'casi'), sabe9: atL(9, 'sabe'), tambien9: atL(9, 'tambien'), vigilas9: atL(9, 'vigilas'), comes9: atL(9, 'comes'), espana9: atL(9, 'espana'), ningun9: atL(9, 'ningun'), matadero9: atL(9, 'matadero'),
    funcionar9: atL(9, 'funcionar'), sin9: atL(9, '=sin'), veterinario9: atL(9, 'veterinario'), oficial9: atL(9, 'oficial'), dentro9: atL(9, 'dentro'), revisando9: atL(9, 'revisando'), cada9: atL(9, 'cada'), animal9: atL(9, 'animal'), antes9: atL(9, 'antes'), despues9: atL(9, 'despues'),
    y10: atL(10, '=y'), brazo10: atL(10, 'brazo'), reproduccion10: atL(10, 'reproduccion'), saber10: atL(10, 'saber'), vaca10: atL(10, 'vaca'), prenada10: atL(10, 'prenada'), palpa10: atL(10, 'palpa'), utero10: atL(10, 'utero'), desde10: atL(10, 'desde'),
    dentro10: atL(10, 'dentro'), con10: atL(10, '=con'), brazo10b: atL(10, 'brazo', 2), metido10: atL(10, 'metido'),
    asi11: atL(11, 'asi'), si11: atL(11, '=si'), curar11: atL(11, 'curar'), perros11: atL(11, 'perros'), gatos11: atL(11, 'gatos'), pero11: atL(11, 'pero'), antes11: atL(11, 'antes'), vaca11: atL(11, 'vaca'),
    perros12: atL(12, 'perros'), gatos12: atL(12, 'gatos'), o12: atL(12, '=o'), vacas12: atL(12, 'vacas'), caballos12: atL(12, 'caballos'), te12: atL(12, '=te'), leo12: atL(12, 'leo'), mandaselo12: atL(12, 'mandaselo'), quien12: atL(12, 'quien'), veterinario12: atL(12, 'veterinario'),
  };
  mats(); buildMats(); buildMedMats(); buildVetMats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
