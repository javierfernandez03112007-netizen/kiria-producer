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
  END = Math.ceil(lines[lines.length - 1].end + 2.6);
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  // 1 gancho · 2 pregunta · 3 Cortical Labs, Australia · 4 chip, electrodos, crecen · 5 señales, respuesta · 6 programa, pasos · 7 objetivo, mapa
  // 8 no es un cerebro, 86.000 millones, un puñado · 9 chip, programa, motores · 10 sin revisar · 11 Pong y Doom · 12 ¿derechos?
  K = {
    perro1: atL(1, 'perro'), no1: atL(1, '=no'), cerebro1: atL(1, 'cerebro'), pero1: atL(1, 'pero'), guian1: atL(1, 'guian'), neuronas1: atL(1, 'neuronas'), vivas1: atL(1, 'vivas'),
    y2: atL(2, '=y'), aprendido2: atL(2, 'aprendido'), neuronas2: atL(2, 'neuronas'), como2: atL(2, 'como'), final2: atL(2, 'final'), digo2: atL(2, 'digo'),
    cortical3: atL(3, 'cortical'), labs3: atL(3, 'labs'), empresa3: atL(3, 'empresa'), australia3: atL(3, 'australia'),
    en4: atL(4, '=en'), chip4: atL(4, 'chip'), electrodos4: atL(4, 'electrodos'), crecen4: atL(4, 'crecen'), neuronas4: atL(4, 'neuronas'), cultivadas4: atL(4, 'cultivadas'), laboratorio4: atL(4, 'laboratorio'),
    el5: atL(5, '=el'), chip5: atL(5, 'chip'), manda5: atL(5, 'manda'), senales5: atL(5, 'senales'), escucha5: atL(5, 'escucha'), responden5: atL(5, 'responden'),
    un6: atL(6, '=un'), programa6: atL(6, 'programa'), convierte6: atL(6, 'convierte'), pasos6: atL(6, 'pasos'), izquierda6: atL(6, 'izquierda'), derecha6: atL(6, 'derecha'), adelante6: atL(6, 'adelante'),
    perro7: atL(7, 'perro'), objetivo7: atL(7, 'objetivo'), mapa7: atL(7, 'mapa'),
    ojo8: atL(8, 'ojo'), no8: atL(8, '=no'), cerebro8: atL(8, 'cerebro'), tuyo8: atL(8, 'tuyo'), n86_8: atL(8, '86'), millones8: atL(8, 'millones'), aqui8: atL(8, 'aqui'), punado8: atL(8, 'punado'),
    y9: atL(9, '=y'), chip9: atL(9, 'chip'), programa9: atL(9, 'programa'), motores9: atL(9, 'motores'), siguen9: atL(9, 'siguen'), maquina9: atL(9, 'maquina'),
    todavia10: atL(10, 'todavia'), revisado10: atL(10, 'revisado'), cientificos10: atL(10, 'cientificos'),
    aprendido11: atL(11, 'aprendido'), segun11: atL(11, 'segun'), neuronas11: atL(11, 'neuronas'), jugaron11: atL(11, 'jugaron'), pong11: atL(11, 'pong'), doom11: atL(11, 'doom'),
    le12: atL(12, '=le'), derechos12: atL(12, 'derechos'), maquina12: atL(12, 'maquina'), neuronas12: atL(12, 'neuronas'),
  };
  mats(); buildMats(); buildRig();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  scene.fog = new THREE.FogExp2(0x000000, 0.085);
  buildTimes();
  buildDust(); buildMap(); buildRoute(); await buildAus();
  buildDog(); buildBrain(); buildScreen();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.TT = TT; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
