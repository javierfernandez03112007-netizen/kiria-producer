// ---------------------------------------------------------------- un fotograma
const _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
const vpOf = () => new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
function frame(t) {
  placeCam(camAt(t - 1 / 60)); const prevVP = vpOf();
  placeCam(camAt(t - 1 / 36)); const PVP = vpOf();
  const st = camAt(t); placeCam(st); const VP = vpOf();
  stageAt(t, VP, PVP); rigFollow(st.l, t, st.p);
  flowUpdate(t, VP, PVP); S.gridM.uniforms.camP.value.copy(cam.position);
  const d = Math.max(0.05, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _rt.setFromMatrixColumn(cam.matrixWorld, 0); _up.setFromMatrixColumn(cam.matrixWorld, 1);
  const P0 = cam.position.clone().addScaledVector(_fw, d), Px = P0.clone().addScaledVector(_rt, d * 0.4), Py = P0.clone().addScaledVector(_up, d * 0.4);
  const a = [P0, Px, Py].map(p => p.clone().applyMatrix4(VP)), b = [P0, Px, Py].map(p => p.clone().applyMatrix4(prevVP));
  const m = a.map((q, i) => [q.x - b[i].x, q.y - b[i].y]), dx = [a[1].x - a[0].x, a[1].y - a[0].y], dy = [a[2].x - a[0].x, a[2].y - a[0].y];
  const det = dx[0] * dy[1] - dy[0] * dx[1] || 1e-6, N = [[m[1][0] - m[0][0], m[2][0] - m[0][0]], [m[1][1] - m[0][1], m[2][1] - m[0][1]]];
  const inv = [[dy[1] / det, -dy[0] / det], [-dx[1] / det, dx[0] / det]];
  const J = [N[0][0] * inv[0][0] + N[0][1] * inv[1][0], N[0][0] * inv[0][1] + N[0][1] * inv[1][1], N[1][0] * inv[0][0] + N[1][1] * inv[1][0], N[1][0] * inv[0][1] + N[1][1] * inv[1][1]];
  post.uniforms.m0.value.set(m[0][0], m[0][1]); post.uniforms.a0.value.set(a[0].x, a[0].y); post.uniforms.J.value.set(...J);
  let fl = 0; for (const [t0, k] of [[K.no1 + 0.02, 0.09], [K.supremo2 + 0.08, 0.06], [K.estructuras + 0.3, 0.05], [K.dijo + 0.04, 0.1], [K.no8, 0.05], [K.polideportivo, 0.04]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: el puente desplegado sobre el plano y la casa con el «NO» (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.tu1 + 0.3; frame(t);
  const C = window.COVER_CAM || [0.9, 0.95, 2.6, 0.3, 0.2, -0.1, 32];
  cam.fov = C[6]; cam.updateProjectionMatrix(); cam.position.set(C[0], C[1], C[2]); cam.up.set(0, 1, 0); cam.lookAt(C[3], C[4], C[5]); cam.updateMatrixWorld(); rigFollow(v3(C[3], C[4], C[5]), t, cam.position);
  if (window.camOverride) window.camOverride(cam, v3);
  const VP = vpOf(); flowUpdate(t, VP, VP); stageAt(t, VP, VP);
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
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    arquitecto: atL(1, 'arquitecto'), puede1: atL(1, 'puede'), proyectar1: atL(1, 'proyectar'), puente1: atL(1, 'puente'), ingeniero: atL(1, 'ingeniero'), caminos1: atL(1, 'caminos'), no1: atL(1, '=no'), tu1: atL(1, '=tu'), casa1: atL(1, 'casa'),
    dicen: atL(2, 'dicen'), ley2: atL(2, 'ley'), tribunal: atL(2, 'tribunal'), supremo2: atL(2, 'supremo'),
    porque3: atL(3, 'por'), final3: atL(3, 'final'), digo: atL(3, 'digo'), gustar: atL(3, 'gustar'), nadie: atL(3, 'nadie'),
    caminos4: atL(4, 'caminos'), vosotros4: atL(4, 'vosotros'), dibujais: atL(4, 'dibujais'), nosotros4: atL(4, 'nosotros'), hacemos4: atL(4, 'hacemos'), que4: atL(4, '=que'), no4: atL(4, '=no'), caiga: atL(4, 'caiga'),
    arquitectos5: atL(5, 'arquitectos'), vosotros5: atL(5, 'vosotros'), calculais: atL(5, 'calculais'), nosotros5: atL(5, 'nosotros'), vivir: atL(5, 'vivir'), dentro5: atL(5, 'dentro'),
    por6: atL(6, '=por'), dentro6: atL(6, 'dentro'), esto: atL(6, 'esto'), suelos: atL(6, 'suelos'), inclina: atL(6, 'inclina'), torre: atL(6, 'torre'), pisa: atL(6, 'pisa'), estructuras: atL(6, 'estructuras'), trenes: atL(6, 'trenes'), viento: atL(6, 'viento'), presas: atL(6, 'presas'), frenan: atL(6, 'frenan'), rios: atL(6, 'rios'),
    carreteras: atL(7, 'carreteras'), vias: atL(7, 'vias'), espana: atL(7, 'espana'), segunda: atL(7, 'segunda'), alta: atL(7, 'alta'), mundo: atL(7, 'mundo'),
    aun: atL(8, 'aun'), supremo8: atL(8, 'supremo'), polideportivo: atL(8, 'polideportivo'), tu8: atL(8, '=tu'), no8: atL(8, '=no'),
    porque9: atL(9, 'porque'), ley9: atL(9, 'ley'), y1999: atL(9, '1999'), dice9: atL(9, 'dice'), edificio9: atL(9, 'edificio'), vive: atL(9, 'vive'), estudia: atL(9, 'estudia'), cura: atL(9, 'cura'), reza: atL(9, 'reza'), firma: atL(9, 'firma'), arquitecto9: atL(9, 'arquitecto'),
    puente10: atL(10, 'puente'), edificio10: atL(10, 'edificio'), colegio: atL(10, 'colegio'), exclusiva: atL(10, 'exclusiva'), supremo10: atL(10, 'supremo'), dijo: atL(10, 'dijo'), no10: atL(10, '=no', 2),
    ley11: atL(11, 'ley'), calcula: atL(11, 'calcula'), mejor: atL(11, 'mejor'), mira11b: atL(11, 'mira', 2), dormir: atL(11, 'dormir'), dentro11: atL(11, 'dentro'),
    caminos12: atL(12, 'caminos'), arquitectura12: atL(12, 'arquitectura'), mandaselo: atL(12, 'mandaselo'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; }
  buildRig(); buildFloor(); buildFlow();
  S.sheet = buildSheet(); S.bridge = buildBridge(); S.comp = buildCompass();
  S.house = buildHouse(true); S.house.G.position.copy(HSX); scene.add(S.house.G); S.stamp = buildStamp();
  S.book = buildBook(1); scene.add(S.book.G); S.gavel = buildGavel(); S.gavel2 = buildGavel();
  S.q = buildQ(); S.duel = buildDuel(); S.soil = buildSoil(); S.deck = buildDeckBridge(); S.river = buildRiver(); S.map = await buildMap();
  const MAD = mp(...CITY.mad, 0);
  S.sports = buildSports(); S.sports.G.position.copy(MAD).add(v3(-0.19, 0, 0.06));
  S.house2 = buildHouse(false); S.house2.G.position.copy(MAD).add(v3(0.2, 0, 0.06)); S.house2.G.scale.setScalar(0.75); scene.add(S.house2.G);
  S.book2 = buildBook(2.2); S.book2.G.position.copy(ZF); scene.add(S.book2.G);
  S.slots = [-0.45, -0.15, 0.15, 0.45].map((x, i) => v3(ZF.x + x, 0, ZF.z - (i === 0 || i === 3 ? 0.86 : 1.0)));
  S.iconFrom = [-0.6, -0.22, 0.22, 0.6].map(x => v3(ZF.x + x, 0.15, ZF.z + 0.12));
  S.icons = [0, 1, 2, 3].map(k => { const g = buildIcon(k); scene.add(g); return g; });
  S.blds = [0, 1, 2, 3].map(k => { const g = buildBuilding(k); scene.add(g); return g; });
  S.sig = drawLine(Array.from({ length: 60 }, (_, i) => { const u = i / 59; return v3(ZF.x + 0.28 + u * 0.42, 0.146, ZF.z + 0.42 - Math.sin(u * 19) * 0.03 * (1 - u * 0.5) - u * 0.04); }), TEAL, 2.6, 1); scene.add(S.sig);
  S.sign = buildSign(); S.formulas = buildFormulas();
  post.uniforms.ca.value = 0.35;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
