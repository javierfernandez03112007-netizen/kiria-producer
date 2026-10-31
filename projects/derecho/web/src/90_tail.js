// ---------------------------------------------------------------- un fotograma
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
  S.countries = await loadTopo('../../../engine/geo/countries-110m.json');
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    menos1: atL(1, 'menos'), tres1: atL(1, '=3'), cien1: atL(1, '=100'), estudiantes1: atL(1, 'estudiantes'), derecho1: atL(1, 'derecho'), podran1: atL(1, 'podran'), jueces1: atL(1, 'jueces'), fiscales1: atL(1, 'fiscales'),
    y2: atL(2, '=y'), ninguno2: atL(2, 'ninguno'), abogado2: atL(2, 'abogado'), carrera2: atL(2, 'carrera'), final2: atL(2, 'final'), falta2: atL(2, 'falta'),
    cada3: atL(3, 'cada'), veintiseis3: atL(3, 'veintiseis'), estudiantes3: atL(3, 'estudiantes'), plazas3: atL(3, 'plazas'), oposicion3: atL(3, 'oposicion'), menos3: atL(3, 'menos'), seiscientas3: atL(3, 'seiscientas'),
    crees4: atL(4, 'crees'), memorizar4: atL(4, 'memorizar'), realidad4: atL(4, 'realidad'), ganar4: atL(4, 'ganar'), ellas4: atL(4, 'ellas'), asi4: atL(4, 'asi'), dentro4: atL(4, 'dentro'),
    base5: atL(5, 'base'), derecho5: atL(5, 'derecho'), romano5: atL(5, 'romano'), constitucional5: atL(5, 'constitucional'), teoria5: atL(5, 'teoria'),
    civil6: atL(6, 'civil'), contratos6: atL(6, 'contratos'), herencias6: atL(6, 'herencias'), familia6: atL(6, 'familia'), todo6: atL(6, 'todo'), leer6: atL(6, 'leer'),
    penal7: atL(7, 'penal'), delito7: atL(7, 'delito'), pena7: atL(7, '=pena'), prueba7: atL(7, 'prueba'),
    admin8: atL(8, 'administrativo'), defiende8: atL(8, 'defiende'), ciudadano8: atL(8, 'ciudadano'), administracion8: atL(8, 'administracion'),
    mercantil9: atL(9, 'mercantil'), empresas9: atL(9, 'empresas'), despidos9: atL(9, 'despidos'), nominas9: atL(9, 'nominas'),
    procesal10: atL(10, 'procesal'), juicio10: atL(10, 'juicio'), demanda10: atL(10, 'demanda'), sentencia10: atL(10, 'sentencia'),
    internacional11: atL(11, 'internacional'), europeo11: atL(11, 'europeo'), leyes11: atL(11, 'leyes'), espana11: atL(11, 'espana'),
    abogados12: atL(12, 'abogados'), jueces12: atL(12, 'jueces'), fiscales12: atL(12, 'fiscales'), notarios12: atL(12, 'notarios'), pero12: atL(12, 'pero'), ninguno12: atL(12, 'ninguno'), carrera12: atL(12, 'carrera'),
    falta13: atL(13, 'falta'), master13: atL(13, 'master'), practicas13: atL(13, 'practicas'), examen13: atL(13, 'examen'), colegiarte13: atL(13, 'colegiarte'),
    juez14: atL(14, 'juez'), oposicion14: atL(14, 'oposicion'), test14: atL(14, 'test'), dos14: atL(14, '=dos'), orales14: atL(14, 'orales'), tribunal14: atL(14, 'tribunal'), apruebas14: atL(14, 'apruebas'), escuela14: atL(14, 'escuela'), barcelona14: atL(14, 'barcelona'),
    cuatro15: atL(15, 'cuatro'), anos15: atL(15, 'anos'), toga15: atL(15, 'toga'), despues15: atL(15, 'despues'),
    si16: atL(16, '=si'), guardalo16: atL(16, 'guardalo'), dime16: atL(16, 'dime'), abogado16: atL(16, 'abogado'), juez16: atL(16, 'juez'),
  };
  mats(); buildMats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  buildCenter(); buildStations();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
