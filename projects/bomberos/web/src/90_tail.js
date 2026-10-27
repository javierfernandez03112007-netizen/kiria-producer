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
  let fl = 0; for (const [t0, k] of [[K.quedan + 0.3, 0.06], [K.setenta, 0.05], [K.cae, 0.06], [K.bomberados9, 0.08], [K.bomberados12, 0.1]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: los cascos cayendo y los dos que quedan, encendidos (sin HUD)
window.renderCover = function () {
  const t = window.COVER_T ? Number(window.COVER_T) : K.quedan + 0.45; frame(t);
  const C = window.COVER_CAM || [0.35, 1.25, 3.6, 0, 1.3, 0, 34];
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
    ocho: atL(1, '=ocho'), diez: atL(1, 'diez'), opositores1: atL(1, 'opositores'), madrid: atL(1, 'madrid'), quedan: atL(1, 'quedan'), plaza: atL(1, '=plaza'),
    ultima: atL(2, 'ultima'), comunidad: atL(2, 'comunidad'), presentaron: atL(2, 'presentaron'), personas: atL(2, 'personas'), doscientas: atL(2, 'doscientas', 2), plazas2: atL(2, 'plazas'),
    valencia: atL(3, 'valencia'), aspirantes: atL(3, 'aspirantes'), noventa: atL(3, 'noventa'), pais: atL(3, 'pais'), setenta: atL(3, 'setenta'), suspendio3: atL(3, 'suspendio'), examen3: atL(3, 'examen'),
    porque: atL(4, '=por'), suspende4: atL(4, 'suspende'), tanta: atL(4, 'tanta'), gente: atL(4, 'gente'),
    uno: atL(5, '=uno'), test5: atL(5, '=test'), eliminatorio: atL(5, 'eliminatorio'), temario5: atL(5, 'temario'), enorme: atL(5, 'enorme'), decenas: atL(5, 'decenas'), preguntas: atL(5, 'preguntas'), sola: atL(5, 'sola'), manana: atL(5, 'manana'), algunas: atL(5, 'algunas'), fallo: atL(5, 'fallo'), resta: atL(5, 'resta'),
    dos6: atL(6, '=dos'), tiempo: atL(6, 'tiempo'), mayoria6: atL(6, 'mayoria'), psicotecnico: atL(6, 'psicotecnico'), llegar: atL(6, 'llegar'), contestar: atL(6, 'contestar'),
    tres: atL(7, '=tres'), leerse: atL(7, 'leerse'), temario7: atL(7, 'temario'), entrenar: atL(7, 'entrenar'), examen7: atL(7, 'examen'),
    duro: atL(8, 'duro'), fisica: atL(8, 'fisica'), mayoria8: atL(8, 'mayoria'), cae: atL(8, '=cae'), antes: atL(8, 'antes'), test8: atL(8, '=test'),
    eso: atL(9, '=eso'), existe: atL(9, 'existe'), bomberados9: atL(9, 'bomberados'), app: atL(9, '=app'), opositores9: atL(9, 'opositores'),
    giras: atL(10, 'giras'), ruleta: atL(10, 'ruleta'), temario10: atL(10, 'temario'), haces: atL(10, 'haces'), test10: atL(10, '=test'), compites: atL(10, 'compites'), directo: atL(10, 'directo'), otros: atL(10, 'otros'), inteligencia: atL(10, 'inteligencia'), artificial: atL(10, 'artificial'),
    estudias: atL(11, 'estudias'), jugando: atL(11, 'jugando'), reloj: atL(11, 'reloj'), dia11: atL(11, '=dia'),
    bomberados12: atL(12, 'bomberados'), pruebala: atL(12, 'pruebala'), gratis: atL(12, 'gratis'), cinco: atL(12, 'cinco'), dias: atL(12, '=dias'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  // brasas que suben por todo el recorrido y polvo: el flujo óptico de los vuelos
  S.flow.push(flowCloud(40000, i => [-4 + hash(i * 1.31 + 7) * 28, 0.02, -36 + hash(i * 2.17 + 3) * 40], { size: 3.6, bright: 1.6, seed: 7, col: 0xffa060, rise: 0.22, riseH: 4.5, drift: 0.06, farF: 0.025, keep: 0.5 }));
  // y nubes más densas alrededor de cada zona (cascos, multitudes, examen, criba, app)
  for (const [k, Z] of [[0, v3(0, 0, 0)], [1, v3(0, 0, -11)], [2, v3(9, 0, -18)], [3, v3(18, 0, -13)], [4, v3(4, 0, -30)]])
    S.flow.push(flowCloud(6000, i => [Z.x + gauss(i + k * 1e5) * 2.2, 0.02, Z.z + gauss(i + k * 1e5 + 5e4) * 2.2], { size: 3.0, bright: 1.35, seed: 10 + k, col: 0xff9a50, rise: 0.18, riseH: 3.2, drift: 0.05, farF: 0.035, keep: 0.45 }));
  S.flow.push(flowCloud(9000, i => [-4 + hash(i * 3.71 + 1) * 28, 0.05 + hash(i * 4.33) * 5, -36 + hash(i * 5.91 + 2) * 40], { size: 1.4, bright: 0.55, seed: 8, farF: 0.03, keep: 0.3 }));
  S.helm = buildHelmets(); S.crowd = buildCrowds(); S.exam = buildExam(); S.gates = buildGates(); S.app = buildApp();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
