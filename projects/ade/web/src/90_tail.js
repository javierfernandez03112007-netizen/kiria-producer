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
    new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '800' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Bebas', `url(${F}BebasNeue-Regular.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }),
    new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '600' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = Math.ceil((lines[lines.length - 1].end + 1.25) * 2) / 2;          // ≈ 1,3 s de cola tras la última palabra (59 s)
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    dijeron1: atL(1, 'dijeron'), ade1: atL(1, '=ade'), no1: atL(1, '=no'), salidas1: atL(1, 'salidas'),
    y2: atL(2, '=y'), carrera2: atL(2, 'carrera'), piden2: atL(2, 'piden'), empresas2: atL(2, 'empresas'),
    tiene3: atL(3, 'tiene'), trampa3: atL(3, 'trampa'), final3: atL(3, 'final'), cuento3: atL(3, 'cuento'),
    ade4: atL(4, '=ade'), aparece4: atL(4, 'aparece'), doble4: atL(4, 'doble'), ofertas4: atL(4, 'ofertas'), segunda4: atL(4, 'segunda'), carrera4: atL(4, 'carrera'),
    n4_5: atL(5, '=4'), anos5: atL(5, 'anos'), acabar5: atL(5, 'acabar'), n8_5: atL(5, '=8'), trabajando5: atL(5, 'trabajando'),
    cobran6: atL(6, 'cobran'), media6: atL(6, 'media'), n32_6: atL(6, '32000'), euros6: atL(6, 'euros'), ano6: atL(6, '=ano'),
    ahora7: atL(7, 'ahora'), feo7: atL(7, 'feo'), trabajan7: atL(7, 'trabajan'), solo7: atL(7, 'solo'), n4_7: atL(7, '=4'), tienen7: atL(7, 'tienen'), puesto7: atL(7, 'puesto'), universitario7: atL(7, 'universitario'),
    resto8: atL(8, 'resto'), trabajos8: atL(8, 'trabajos'), pedian8: atL(8, 'pedian'), carrera8: atL(8, 'carrera'),
    y9: atL(9, '=y'), cada9: atL(9, 'cada'), salen9: atL(9, 'salen'), n15_9: atL(9, '15000'), graduados9: atL(9, 'graduados'), nuevos9: atL(9, 'nuevos'),
    fijate10: atL(10, 'fijate'), tres10: atL(10, 'tres'), salidas10: atL(10, 'salidas'), tipicas10: atL(10, 'tipicas'),
    firmar11: atL(11, 'firmar'), auditorias11: atL(11, 'auditorias'), n3_11: atL(11, '=3'), experiencia11: atL(11, 'experiencia'), examen11: atL(11, 'examen'), estado11: atL(11, 'estado'),
    asesorar12: atL(12, 'asesorar'), banco12: atL(12, 'banco'), certificado12: atL(12, 'certificado'), aparte12: atL(12, 'aparte'),
    inspector13: atL(13, 'inspector'), hacienda13: atL(13, 'hacienda'), oposicion13: atL(13, 'oposicion'),
    ninguna14: atL(14, 'ninguna'), abre14: atL(14, 'abre'), ade14: atL(14, '=ade'),
    esa15: atL(15, 'esa'), trampa15: atL(15, 'trampa'), ade15: atL(15, '=ade'), llave15: atL(15, 'llave'), portal15: atL(15, 'portal'), pero15: atL(15, 'pero'),
    muchos15: atL(15, 'muchos'), despachos15: atL(15, 'despachos'), propia15: atL(15, 'propia'), cerradura15: atL(15, 'cerradura'),
    salidas16: atL(16, 'salidas'), atajos16: atL(16, 'atajos'), ninguno16: atL(16, 'ninguno'),
    mandaselo17: atL(17, 'mandaselo'), dijo17: atL(17, 'dijo'), ade17: atL(17, '=ade'), no17: atL(17, '=no'), salidas17: atL(17, 'salidas'), auditoria17: atL(17, 'auditoria'), banca17: atL(17, 'banca'),
  };
  mats(); buildMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  scene.fog = new THREE.FogExp2(0x000000, 0.08);
  buildFlow(); buildFloor(); buildBuilding(); buildCrowd(); buildPapers();
  buildTimes();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
