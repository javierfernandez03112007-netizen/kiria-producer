// ---------------------------------------------------------------- un fotograma
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function frame(t) {
  placeCam(camAt(prevT(t, 1 / 60))); const prevVP = vpOf();
  placeCam(camAt(prevT(t, 1 / 36))); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, st); worldUpdate(t, VP, PVP, st.p); fxUpdate(t, VP, PVP);
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
  if (window.camOverride) { window.camOverride(cam, v3); post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); const VP = vpOf(); worldUpdate(t, VP, VP, cam.position); fxUpdate(t, VP, VP); }
  if (window.dbgHide) window.dbgHide();
  hudAt(t); drawFrame(t);
  return true;
};
// portada: el avión saliendo de las nubes junto al altímetro en 12,484 (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.nota + 1.2; frame(t);
  if (window.COVER_CAM) { const C = window.COVER_CAM; cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); }
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); worldUpdate(t, VP, VP, cam.position); fxUpdate(t, VP, VP);
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
    aero0: atL(1, 'aeroespacial'), acabas: atL(1, 'acabas'), y1: atL(1, '=y'), no1: atL(1, '=no'), aero1: atL(1, 'aeronautico'),
    al1: atL(2, '=al'), que1: atL(2, '=que'),
    y3: atL(3, '=y'), politecnica: atL(3, 'politecnica'), un3: atL(3, '=un'), nota: atL(3, '12484'), sobre: atL(3, 'sobre'), y2025: atL(3, '2025'),
    crees: atL(4, 'crees'), aviones4: atL(4, 'aviones'), va4: atL(4, '=va', 2), todo4: atL(4, 'todo'), lo4: atL(4, '=lo'), vuela4: atL(4, 'vuela'), asi4: atL(4, 'asi'),
    base5: atL(5, 'base'), calculo: atL(5, 'calculo'), algebra: atL(5, 'algebra'), fisica: atL(5, 'fisica'), quimica: atL(5, 'quimica'), dibujo: atL(5, 'dibujo'),
    aerod: atL(6, 'aerodinamica'), avion6: atL(6, '=avion'), toneladas: atL(6, 'toneladas'), sostiene: atL(6, 'sostiene'),
    estructuras: atL(7, 'estructuras'), alas: atL(7, 'alas'), sin7: atL(7, '=sin'), fibra: atL(7, 'fibra'), carbono: atL(7, 'carbono'),
    propulsion: atL(8, 'propulsion'), motores: atL(8, 'motores'), reaccion: atL(8, 'reaccion'), cohetes: atL(8, 'cohetes'),
    mecanica: atL(9, 'mecanica'), como9: atL(9, 'como'), satelite: atL(9, 'satelite'), orbita: atL(9, 'orbita'), porque9: atL(9, '=por'), cae: atL(9, 'cae'),
    y10: atL(10, '=y'), navegacion: atL(10, 'navegacion'), aeropuertos: atL(10, 'aeropuertos'), miles10: atL(10, 'miles'), sin10: atL(10, '=sin'),
    de11: atL(11, '=de'), aviones11: atL(11, 'aviones'), motores11: atL(11, 'motores'), cohetes11: atL(11, 'cohetes'), satelites11: atL(11, 'satelites'), y11: atL(11, '=y'), vuele11: atL(11, 'vuele'), seguro11: atL(11, 'seguro'),
    y12: atL(12, '=y'), falta12: atL(12, 'falta'), ingeniero12: atL(12, 'ingeniero'), el12: atL(12, '=el'), master1: atL(12, 'master'),
    profesion: atL(13, 'profesion'), regulada: atL(13, 'regulada'), grado: atL(13, 'grado'), tecnico: atL(13, 'tecnico'), para13: atL(13, '=para'), ingeniero13b: atL(13, 'ingeniero', 2),
    master2: atL(13, 'master'), habilitante: atL(13, 'habilitante'), en13: atL(13, '=en', 1), y4: atL(13, '=4'), dos: atL(13, '=2'),
    seis: atL(14, '=6'), para14: atL(14, '=para'), todo14: atL(14, 'todo'), vuela14: atL(14, 'vuela'),
    si3: atL(15, '=si'), guardalo: atL(15, 'guardalo'), cuentame: atL(15, 'cuentame'), te2: atL(15, '=te'),
  };
  mats(); buildRig(); buildWorld(); scene.environment = skyEnv(); scene.environmentIntensity = 1.0;
  buildGrad(); buildClimb(); buildFamily(); buildTunnel(); buildAero(); buildWing(); buildEngine(); await buildEarth(); buildFormation();
  post.uniforms.ca.value = 0.45;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
