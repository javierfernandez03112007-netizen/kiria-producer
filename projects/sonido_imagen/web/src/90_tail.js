// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  rigFollow(st.l); stageAt(t);
  flowUpdate(t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  let fl = 0; for (const [t0, k] of [[K.borrado, 0.1], [K.cables + 0.1, 0.06], [K.no13, 0.07], [K.apellido, 0.07], [K.tira, 0.05]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
  post.uniforms.flash.value = fl; post.uniforms.tint.value.set(0, 0, 0);
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
// portada: el ojo estallando en cubos (sin HUD)
window.renderCover = function () {
  const t = Number(window.COVER_T || 2.0); frame(t);
  const C = window.COVER_CAM || [0.9, 1.75, 3.0, 0, 1.62, 0, 32];
  cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigFollow(v3(C[3], C[4], C[5]));
  if (window.camOverride) window.camOverride(cam, v3);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0;
  drawFrame(t); hudBegin();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    te1: atL(1, '=te'), enganando: atL(1, 'enganando'), mas1: atL(1, '=mas'), noventa: atL(1, 'noventa'), ciento: atL(1, 'ciento'), video1: atL(1, 'video'), borrado: atL(1, 'borrado'),
    y2: atL(2, '=y'), notado: atL(2, 'notado'), borra: atL(2, 'borra'), sonido2: atL(2, 'sonido'), carrera2: atL(2, 'carrera'), teleco2: atL(2, 'teleco'), llaman: atL(2, 'llaman'), facil2: atL(2, 'facil'),
    tienen3: atL(3, 'tienen'), razon: atL(3, 'razon'), final: atL(3, 'final'), truco3: atL(3, 'truco'),
    municion: atL(4, 'municion'), politecnica: atL(4, 'politecnica'), teleco4: atL(4, 'teleco'), nueve: atL(4, 'nueve'), cuatro4: atL(4, 'cuatro'), sonido4: atL(4, 'sonido'), ocho: atL(4, 'ocho'),
    fp5: atL(5, '=fp'), rematan: atL(5, 'rematan'), cuatro5: atL(5, 'cuatro'), enchufando: atL(5, 'enchufando'), cables: atL(5, 'cables'),
    sonido6: atL(6, 'sonido'), responde: atL(6, 'responde'), sin6: atL(6, '=sin'), veriais: atL(6, 'veriais'), serie: atL(6, 'serie'),
    asi: atL(7, 'asi'), dentro: atL(7, 'dentro'), senales: atL(7, 'senales'), matematicas: atL(7, 'matematicas'), convierten: atL(7, 'convierten'), numeros: atL(7, 'numeros'),
    acustica: atL(8, '=acustica'), electro: atL(8, 'electroacustica'), salas: atL(8, 'salas'), microfonos: atL(8, 'microfonos'), altavoces: atL(8, 'altavoces'),
    video9: atL(9, 'video'), llega: atL(9, 'llega'), millones: atL(9, 'millones'), pantallas: atL(9, 'pantallas'), vez: atL(9, 'vez'),
    entonces: atL(10, 'entonces'), facil10: atL(10, 'facil'),
    nota: atL(11, 'nota'), mide: atL(11, 'mide'), gente: atL(11, 'gente'), pide: atL(11, 'pide'), dificil: atL(11, 'dificil'),
    dos12: atL(12, '=dos'), misma: atL(12, 'misma'), profesion: atL(12, 'profesion'), ingeniero: atL(12, 'ingeniero'), master: atL(12, 'master'),
    teleco13: atL(13, 'teleco'), facil13: atL(13, 'facil'), no13: atL(13, '=no'), teleco13b: atL(13, 'teleco', 2), apellido: atL(13, 'apellido'),
    truco14: atL(14, 'truco'), ojo: atL(14, 'ojo'), luz: atL(14, 'luz'), color14: atL(14, 'color'), color14b: atL(14, 'color', 2), cuatro14: atL(14, 'cuatro'), menos: atL(14, 'menos'),
    fotogramas: atL(15, 'fotogramas'), cambia: atL(15, 'cambia'), guarda15: atL(15, 'guarda'), mueve: atL(15, 'mueve'),
    sonido16: atL(16, 'sonido'), fuerte: atL(16, 'fuerte'), tapa: atL(16, 'tapa'), flojo: atL(16, 'flojo'), flojo2: atL(16, 'flojo', 2), tira: atL(16, 'tira'),
    ahora: atL(17, 'ahora'), vuelve: atL(17, 'vuelve'), notas: atL(17, 'notas'), teleco17: atL(17, 'teleco'), leo: atL(17, 'leo'), mandaselo: atL(17, 'mandaselo'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  S.flow.push(flowCloud(5000, i => [gauss(i + 3e4) * 2.6, Math.abs(gauss(i + 4e4)) * 1.5 + 0.05, -9 + gauss(i + 5e4) * 2.4], { size: 1.5, bright: 0.55, seed: 5 }));
  S.flow.push(flowCloud(6000, i => [12 + gauss(i + 6e4) * 4.5, Math.abs(gauss(i + 7e4)) * 1.6 + 0.05, -16 + gauss(i + 8e4) * 3], { size: 1.5, bright: 0.55, seed: 6 }));
  S.eye = buildEye(); S.duel = buildDuel(); S.inside = buildInside(); S.spec = buildSpectrum();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
