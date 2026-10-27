// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t); rigFollow(st.l, t);
  flowUpdate(t, VP, PVP); fireUpdate(S.fire, t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  let fl = 0; for (const [t0, k] of [[K.treinta, 0.07], [K.bomberados5, 0.06], [K.falso9, 0.12], [K.f10, 0.08], [K.bomberados12, 0.1]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: la sartén en llamas con la V y la F formadas (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.piensalo + 0.3; frame(t);
  const C = window.COVER_CAM || [0.0, 0.58, 2.05, 0, 0.5, 0, 32];
  cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigFollow(v3(C[3], C[4], C[5]), t);
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); fireUpdate(S.fire, t, VP, VP); flowUpdate(t, VP, VP);
  post.uniforms.m0.value.set(0, 0); post.uniforms.J.value.set(0, 0, 0, 0); post.uniforms.flash.value = 0;
  drawFrame(t); hudBegin();
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  try { const im = new FontFace('Impact', `url(${F}impact.ttf)`); await im.load(); document.fonts.add(im); } catch (e) { console.log('sin Impact: la placa usa Inter'); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  const font = new FontLoader().parse(await (await fetch('./node_modules/three/examples/fonts/helvetiker_bold.typeface.json')).json());
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    fuego: atL(1, 'fuego'), aceite: atL(1, 'aceite'), sarten: atL(1, 'sarten'), clase: atL(1, 'clase'), b1: atL(1, '=b'), verdadero: atL(1, 'verdadero'), falso1: atL(1, 'falso'), piensalo: atL(1, 'piensalo'), trampa1: atL(1, 'trampa'),
    sale: atL(2, 'sale'), plantilla: atL(2, 'plantilla'), examen2: atL(2, 'examen'), treinta: atL(2, 'treinta'), rojo: atL(2, 'rojo'),
    toca: atL(3, 'toca'), buscarla: atL(3, 'buscarla'), manual3: atL(3, 'manual'), tema: atL(3, 'tema'), pagina3: atL(3, 'pagina'),
    pasas: atL(4, 'pasas'), hojas: atL(4, 'hojas'), indices: atL(4, 'indices'), apuntes: atL(4, 'apuntes'), manual4: atL(4, 'manual'), manual4b: atL(4, 'manual', 2), va: atL(4, '=va'), tarde: atL(4, 'tarde'),
    ahora: atL(5, 'ahora'), mira: atL(5, 'mira'), bomberados5: atL(5, 'bomberados'),
    tocas: atL(6, 'tocas'), pregunta6: atL(6, 'pregunta'), fallado: atL(6, 'fallado'), inteligencia: atL(6, 'inteligencia'), artificial: atL(6, 'artificial'), manual6: atL(6, 'manual'), pagina6: atL(6, 'pagina'),
    define: atL(7, 'define'), rodeos: atL(7, 'rodeos'),
    compara: atL(8, 'compara'), parecidas: atL(8, 'parecidas'), vuelvas: atL(8, 'vuelvas'), caer: atL(8, 'caer'), trampa8: atL(8, 'trampa'),
    falso9: atL(9, 'falso'),
    aceite10: atL(10, 'aceite'), liquido: atL(10, 'liquido'), liquidos: atL(10, 'liquidos'), b10: atL(10, '=b'), pero: atL(10, 'pero'), cocina: atL(10, 'cocina'), propia: atL(10, 'propia'), f10: atL(10, '=f'),
    tu: atL(11, '=tu'), puesto: atL(11, 'puesto'), v11: atL(11, '=v'), f11: atL(11, '=f'), comentarios: atL(11, 'comentarios'),
    bomberados12: atL(12, 'bomberados'), falla: atL(12, 'falla'), casa: atL(12, 'casa'), examen12: atL(12, 'examen'),
    pruebala: atL(13, 'pruebala'), gratis: atL(13, 'gratis'), cinco: atL(13, 'cinco'), dias: atL(13, 'dias'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  buildRig(); buildFloor(); buildFlow();
  S.pan = buildPan();
  S.fire = buildFire({ n0: 2600, nl: 3000, size: 0.022, lsize: 0.065, bright: 1.15, orig: v3(PZ.x, 0.055, PZ.z), rad: 0.11, hgt: 0.5 });
  S.room = buildRoom(); S.person = makePerson(); S.person.position.set(0, 0, 0.6); S.room.R.add(S.person);
  S.books = buildBooks(S.room.R); S.sheets = buildSheets(S.room.R); S.sheet = buildSheet(S.room.R); S.lap = buildLaptop(S.room.R);
  S.ans = buildAnswer(font);
  // brasas de la sartén, brasas del pasillo entre la sartén y la mesa (estelas en los vuelos), polvo de la habitación y motas delante de la pantalla
  S.flow.push(flowCloud(6000, i => [PZ.x + gauss(i) * 0.55, 0.06, PZ.z + gauss(i + 7e4) * 0.55], { size: 2.6, bright: 1.9, seed: 21, col: 0xffa060, rise: 0.38, riseH: 1.7, drift: 0.05, farF: 0.03, keep: 0.5 }));
  S.flow.push(flowCloud(16000, i => [-1.5 + hash(i * 1.31 + 7) * 11.5, 0.05 + hash(i * 4.4) * 0.3, -12.3 + hash(i * 2.17 + 3) * 14], { size: 2.6, bright: 1.35, seed: 22, col: 0xffa868, rise: 0.12, riseH: 2.6, drift: 0.05, farF: 0.03, keep: 0.5 }));
  S.flow.push(flowCloud(2600, i => [DZ.x + (hash(i * 3.1) - 0.5) * 2.4, 0.2 + hash(i * 5.3) * 1.8, DZ.z - 0.6 + hash(i * 7.9) * 2.0], { size: 1.3, bright: 0.45, seed: 23, col: 0xffe2b8, drift: 0.012, farF: 0.05, keep: 0.3 }));
  S.room.R.updateMatrixWorld(true); S.lap.setOpen(1); S.room.R.updateMatrixWorld(true);
  const SC = S.lap.scr.localToWorld(v3(0, 0, 0)), SN = S.lap.scr.localToWorld(v3(0, 0, 1)).sub(SC).normalize();
  S.flow.push(flowCloud(1600, i => [SC.x + (hash(i * 2.3) - 0.5) * 0.5, SC.y + (hash(i * 4.1) - 0.5) * 0.32, SC.z + 0.04 + hash(i * 6.7) * 0.5], { size: 1.0, bright: 0.55, seed: 24, col: 0xbfefff, nearF: 0.02, farF: 0.6, drift: 0.004, keep: 0.4 }));
  S.lap.setOpen(0); S.room.R.updateMatrixWorld(true);
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
