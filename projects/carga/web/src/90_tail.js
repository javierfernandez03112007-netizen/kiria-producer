// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t);
  flowUpdate(t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  // flujo de la cámara para el desenfoque: cómo se ha movido en pantalla el plano al que se mira
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  // destellos: aterrizajes, «Faraday», imanes y el corte
  let fl = 0; for (const [t0, k] of [[K.apoyas + 0.16, 0.05], [K.faraday, 0.04], [K.centran + 0.16, 0.05], [K.corta, 0.16], [K.apoyes + 0.12, 0.04]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.06);
  post.uniforms.flash.value = fl;
  const red = t > K.corta ? 0.06 * Math.exp(-(t - K.corta) / 0.35) : 0; post.uniforms.tint.value.set(red, 0, 0);
  return st;
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = rtA.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BLW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BLH);
  blurPass(rtB[0], rtC[1], 2 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BLH); blurPass(rtC[0], rtC[1], 3 / BLW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BLH);
  quad.material = post; post.uniforms.tA.value = rtA.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); }
  if (window.dbgHide) window.dbgHide();
  drawFrame(t); hudAt(t);
  return true;
};
// portada: el móvil despiezado de pie sobre el cargador, hablando (sin desenfoque)
window.renderCover = function () {
  const t = Number(window.COVER_T || 0.55); frame(t);
  if (window.camOverride) window.camOverride(cam, v3);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0;
  drawFrame(t); hudBegin();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    tu: atL(1, '=tu'), movil1: atL(1, 'movil'), habla: atL(1, 'habla'), cargador1: atL(1, 'cargador'), cada: atL(1, 'cada'), apoyas: atL(1, 'apoyas'),
    y2: atL(2, '=y'), dice2: atL(2, 'dice'), te2: atL(2, '=te'), cuento: atL(2, 'cuento'), final: atL(2, 'final'),
    truco: atL(3, 'truco'), dentro: atL(3, 'dentro'), cargador3: atL(3, 'cargador'), hay3: atL(3, '=hay'), bobina3: atL(3, 'bobina'), cobre: atL(3, 'cobre'),
    su: atL(4, '=su'), corriente4: atL(4, 'corriente'), cambia: atL(4, 'cambia'), sentido: atL(4, 'sentido'), mas4: atL(4, '=mas'), cienmil: atL(4, '100000'), veces4: atL(4, 'veces'), segundo4: atL(4, 'segundo'),
    crea: atL(5, 'crea'), campo5: atL(5, 'campo'), atraviesa: atL(5, 'atraviesa'), bobina5: atL(5, 'bobina'), movil5: atL(5, 'movil'), y5: atL(5, '=y'), aparece: atL(5, 'aparece'), corriente5: atL(5, 'corriente'),
    se6: atL(6, '=se'), induccion: atL(6, 'induccion'), y6: atL(6, '=y'), descubrio: atL(6, 'descubrio'), faraday: atL(6, 'faraday'),
    parece: atL(7, 'parece'), carga7: atL(7, '=carga'), contacto: atL(7, 'contacto'), realidad: atL(7, 'realidad'), dos7: atL(7, '=dos'), bobinas7: atL(7, 'bobinas'), nunca: atL(7, 'nunca'), tocan: atL(7, 'tocan'),
    pero: atL(8, 'pero'), parte: atL(8, 'parte'), energia8: atL(8, 'energia'), pierde: atL(8, 'pierde'), forma: atL(8, 'forma'), calor: atL(8, 'calor'),
    en9: atL(9, '=en'), prueba: atL(9, 'prueba'), cargar9: atL(9, 'cargar'), sin9: atL(9, '=sin'), gasto: atL(9, 'gasto'), casi: atL(9, 'casi'), cincuenta: atL(9, '50'), mas9: atL(9, '=mas'), con9: atL(9, '=con'), cable9: atL(9, 'cable', 2),
    descentrado: atL(10, 'descentrado'), aun: atL(10, 'aun'), mas10: atL(10, '=mas'), por10: atL(10, '=por'), cargadores: atL(10, 'cargadores'), imanes: atL(10, 'imanes'), centran: atL(10, 'centran'),
    y11: atL(11, '=y'), dice11: atL(11, 'dice'), el11: atL(11, '=el'), pregunta: atL(11, 'pregunta'), hay11: atL(11, '=hay'), alguien: atL(11, 'alguien'), y11b: atL(11, '=y', 2), movil11: atL(11, 'movil'), si11: atL(11, '=si'), soy: atL(11, 'soy'), compatible: atL(11, 'compatible'),
    luego: atL(12, 'luego'), varias: atL(12, 'varias'), segundo12: atL(12, 'segundo'), pide: atL(12, 'pide'), mas12: atL(12, '=mas'), menos: atL(12, 'menos'), o12: atL(12, '=o'), asi: atL(12, 'asi'), bien: atL(12, 'bien'),
    se13: atL(13, '=se'), dice13: atL(13, 'dice'), mismo: atL(13, 'mismo'), campo13: atL(13, 'campo'), golpecitos: atL(13, 'golpecitos'), como13: atL(13, 'como'), morse: atL(13, 'morse'),
    y14: atL(14, '=y'), cuenta14: atL(14, 'cuenta'), energia14: atL(14, 'energia'), recibe: atL(14, 'recibe'), si14: atL(14, '=si'), cuadra: atL(14, 'cuadra'), algo: atL(14, 'algo'), robando: atL(14, 'robando'),
    moneda: atL(14, 'moneda'), llaves: atL(14, 'llaves'), y14b: atL(14, '=y', 2), cargador14: atL(14, 'cargador'), corta: atL(14, 'corta'),
    la15: atL(15, '=la'), proxima: atL(15, 'proxima'), apoyes: atL(15, 'apoyes'), sabes: atL(15, 'sabes'), estan: atL(15, 'estan'), hablando: atL(15, 'hablando'),
    tu15: atL(15, '=tu'), cargas15: atL(15, 'cargas'), con15: atL(15, '=con'), cable15a: atL(15, 'cable', 1), sin15: atL(15, '=sin'), cable15b: atL(15, 'cable', 2),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.42; }
  buildFlips(); buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  S.phone = buildPhone(); S.charger = buildCharger(); buildField(); S.faraday = buildFaraday(); S.bars = buildBars();
  S.coin = buildCoin(); S.key = buildKey(); buildEnergy(); buildPackets(); S.usb = buildUsb();
  clipAll([S.phone, S.charger, S.field.F, S.coin, S.key]);
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
