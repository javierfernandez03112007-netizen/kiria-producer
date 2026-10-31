// ---------------------------------------------------------------- un fotograma
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60))); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36))); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, st); flowUpdate(t, VP, PVP); fxUpdate(t, VP, PVP);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
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
// portada: el cara a cara en el ring (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : 0.4; frame(t);
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
    crees: atL(1, 'crees'), software1: atL(1, 'software'), informatica1: atL(1, 'informatica'), rivales: atL(1, 'rivales'), realidad: atL(1, 'realidad'), boe1: atL(1, 'boe'), una1: atL(1, '=una'), parte: atL(1, 'parte'), otra: atL(1, 'otra'),
    y2: atL(2, '=y'), final2: atL(2, 'final'), ley2: atL(2, 'ley'), gustar: atL(2, 'gustar'), ninguna: atL(2, 'ninguna'),
    dicen3: atL(3, 'dicen'), vosotros3: atL(3, 'vosotros'), solo: atL(3, 'solo'), programais: atL(3, 'programais'), nosotros3: atL(3, 'nosotros'), funciona: atL(3, 'funciona'), ordenador3: atL(3, 'ordenador'), por3: atL(3, '=por'), dentro: atL(3, 'dentro'),
    responden: atL(4, 'responden'), vosotros4: atL(4, 'vosotros'), montar: atL(4, 'montar'), ordenador4: atL(4, 'ordenador'), nosotros4: atL(4, 'nosotros'), construimos: atL(4, 'construimos'), programas: atL(4, 'programas'), millones: atL(4, 'millones'),
    generalista: atL(5, 'generalista'), circuitos: atL(5, 'circuitos'), redes: atL(5, 'redes'), sistemas: atL(5, 'sistemas'), inteligencia: atL(5, 'inteligencia'), software5: atL(5, 'software'),
    software6: atL(6, 'software'), grano: atL(6, 'grano'), requisitos: atL(6, 'requisitos'), arquitectura: atL(6, 'arquitectura'), pruebas: atL(6, 'pruebas'), equipos: atL(6, 'equipos'), entregan: atL(6, 'entregan'), semanas: atL(6, 'semanas'),
    politecnica: atL(7, 'politecnica'), y2025: atL(7, '2025'), informatica7: atL(7, 'informatica'), n1: atL(7, '10175'), software7: atL(7, 'software'), n2: atL(7, '10036'), ni7: atL(7, '=ni'), decimas: atL(7, 'decimas'),
    boe8: atL(8, 'boe'), cinco: atL(8, 'cinco'), especialidades: atL(8, 'especialidades'), informatica8: atL(8, 'informatica'),
    mitad: atL(9, 'mitad'), misma: atL(9, 'misma'), cambian: atL(9, 'cambian'), n48: atL(9, '48'), especialidad9: atL(9, 'especialidad'),
    ley10: atL(10, 'ley'), programar10: atL(10, 'programar'), nada: atL(10, 'nada'),
    profesion: atL(11, 'profesion'), regulada: atL(11, 'regulada'), programar11: atL(11, 'programar'), una11: atL(11, '=una', 2), otra11: atL(11, '=otra'),
    titulo12: atL(12, 'titulo'), colegio: atL(12, 'colegio'),
    pelea: atL(13, 'pelea'), titulo13: atL(13, 'titulo'), quien: atL(13, 'quien'), hacerlo: atL(13, 'hacerlo'),
    software14: atL(14, 'software'), informatica14: atL(14, 'informatica'), comentarios: atL(14, 'comentarios'), mandaselo: atL(14, 'mandaselo'), informatico: atL(14, 'informatico'),
  };
  mats(); buildRig(); buildFloor(); buildFlow();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  buildRing(); buildPC(); buildPhones(); buildHub(); buildPipe(); buildScore(); buildSpec(); buildCredits(); buildLaw();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
