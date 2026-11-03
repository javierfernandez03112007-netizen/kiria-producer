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
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    portazo1: atL(1, 'portazo'), y1: atL(1, '=y'), radiografia1: atL(1, 'radiografia'), puede1: atL(1, 'puede'), abrirla1: atL(1, 'abrirla'),
    como2: atL(2, 'como'), vamos2: atL(2, 'vamos'), dentro2: atL(2, 'dentro'), cerradura2: atL(2, 'cerradura'), y2: atL(2, '=y'), final2: atL(2, 'final'), comob2: atL(2, 'como', 2), evitarlo2: atL(2, 'evitarlo'),
    dentro3: atL(3, 'dentro'), cilindro3: atL(3, 'cilindro'), fila3: atL(3, 'fila'), pitones3: atL(3, 'pitones'), muelles3: atL(3, 'muelles'),
    sin4: atL(4, 'sin'), llave4: atL(4, 'llave'), pitones4: atL(4, 'pitones'), bloquean4: atL(4, 'bloquean'), giro4: atL(4, 'giro'),
    cada5: atL(5, 'cada'), diente5: atL(5, 'diente'), llave5: atL(5, 'llave'), sube5: atL(5, 'sube'), piton5: atL(5, 'piton'), altura5: atL(5, 'altura'), justa5: atL(5, 'justa'), todos5: atL(5, 'todos'), alinean5: atL(5, 'alinean'),
    entonces6: atL(6, 'entonces'), cilindro6: atL(6, 'cilindro'), gira6: atL(6, 'gira'), empuja6: atL(6, 'empuja'), cerrojo6: atL(6, 'cerrojo'), barra6: atL(6, 'barra'), recta6: atL(6, 'recta'), acero6: atL(6, 'acero'),
    pero7: atL(7, 'pero'), otra7: atL(7, 'otra'), pieza7: atL(7, 'pieza'), resbalon7: atL(7, 'resbalon'), cierra7: atL(7, 'cierra'), solo7: atL(7, 'solo'), portazo7: atL(7, 'portazo'),
    tiene8: atL(8, 'tiene'), cara8: atL(8, 'cara'), inclinada8: atL(8, 'inclinada'), ese8: atL(8, 'ese'), punto8: atL(8, 'punto'), debil8: atL(8, 'debil'),
    una9: atL(9, 'una'), lamina9: atL(9, 'lamina'), flexible9: atL(9, 'flexible'), como9: atL(9, 'como'), radiografia9: atL(9, 'radiografia'), entra9: atL(9, 'entra'), rendija9: atL(9, 'rendija'),
    empuja9: atL(9, 'empuja'), esa9: atL(9, '=esa'), cara9: atL(9, 'cara'), resbalon9: atL(9, 'resbalon'), mete9: atL(9, 'mete'),
    y10: atL(10, '=y'), ojo10: atL(10, 'ojo'), espana10: atL(10, 'espana'), denuncian10: atL(10, 'denuncian'), mas10: atL(10, '=mas'), n200: atL(10, '=200'), robos10: atL(10, 'robos'), casas10: atL(10, 'casas'), cada10: atL(10, 'cada'), dia10: atL(10, 'dia'),
    el11: atL(11, '=el'), cerrojo11: atL(11, 'cerrojo'), cambio11: atL(11, 'cambio'), recto11: atL(11, 'recto'), ninguna11: atL(11, 'ninguna'), lamina11: atL(11, 'lamina'), mueve11: atL(11, 'mueve'),
    asi12: atL(12, 'asi'), echa12: atL(12, '=echa'), siempre12: atL(12, 'siempre'), llave12: atL(12, 'llave'), aunque12: atL(12, 'aunque'), salgas12: atL(12, 'salgas'), minuto12: atL(12, 'minuto'),
    tu13: atL(13, '=tu'), das13: atL(13, 'das'), portazo13: atL(13, 'portazo'), echas13: atL(13, '=echas'), llave13: atL(13, 'llave'), mandaselo13: atL(13, 'mandaselo'), quien13: atL(13, 'quien'), nunca13: atL(13, 'nunca'), echa13: atL(13, '=echa'),
  };
  mats(); buildMats(); lockMats(); buildRig(); buildFloor();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; }
  scene.fog = new THREE.FogExp2(0x000000, 0.016);
  buildTimes(); buildLock(); buildHouses(); buildExtras();
  post.uniforms.ca.value = 0.4;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
