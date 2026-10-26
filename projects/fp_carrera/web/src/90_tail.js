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
  let fl = 0; for (const [t0, k] of [[K.exige, 0.08], [K.punto8, 0.07], [K.punto11, 0.07], [K.las, 0.08], [K.nunca, 0.03]]) if (t > t0) fl += k * Math.exp(-(t - t0) / 0.07);
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
// portada: los dos podios, el de la carrera más alto, con el trofeo y la interrogación (sin HUD)
window.renderCover = function () {
  const t = Number(window.COVER_T || 9.6); frame(t);
  cam.fov = 32; cam.updateProjectionMatrix(); cam.position.set(1.15, 1.35, -1.2); cam.up.set(0, 1, 0); cam.lookAt(0.05, 0.95, -7); cam.updateMatrixWorld(); rigFollow(v3(0.05, 0.95, -7));
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
    casi: atL(1, 'casi'), cinco: atL(1, 'cinco'), diez: atL(1, 'diez'), ofertas: atL(1, 'ofertas'), piden: atL(1, 'piden'), fp1: atL(1, '=fp'), la1: atL(1, '=la'), carrera1: atL(1, 'carrera'), solo1: atL(1, 'solo'), dos1: atL(1, '=dos'),
    y2: atL(2, '=y'), aun: atL(2, 'aun'), hay2: atL(2, '=hay'), ingenieros: atL(2, 'ingenieros'), dicen2: atL(2, 'dicen'), uno: atL(2, 'uno'), fp2: atL(2, '=fp'), nunca: atL(2, 'nunca'), estara: atL(2, 'estara'), nivel: atL(2, 'nivel'),
    tienen: atL(3, 'tienen'), final: atL(3, 'final'), digo: atL(3, 'digo'), bando: atL(3, 'bando'), gustar: atL(3, 'gustar'),
    los4: atL(4, '=los'), fp4: atL(4, '=fp'), dicen4: atL(4, 'dicen'), dos4: atL(4, '=dos'), practicas: atL(4, 'practicas'), empresa: atL(4, 'empresa'), trabajar: atL(4, 'trabajar'), vosotros: atL(4, 'vosotros'), cuatro: atL(4, 'cuatro'), teoria: atL(4, 'teoria'),
    y5: atL(5, '=y'), carrera5: atL(5, 'carrera'), responden: atL(5, 'responden'), sabeis: atL(5, 'sabeis'), herramientas: atL(5, 'herramientas'), entendeis: atL(5, 'entendeis'), debajo: atL(5, 'debajo'),
    vamos: atL(6, 'vamos'), datos: atL(6, 'datos'),
    programar: atL(7, 'programar'), ley: atL(7, 'ley'), exige: atL(7, 'exige'), titulo: atL(7, 'titulo'), ingenieria: atL(7, 'ingenieria'), informatica7: atL(7, 'informatica'), regulada: atL(7, 'regulada'), industrial: atL(7, 'industrial'), teleco: atL(7, 'teleco'), si7: atL(7, '=si'),
    punto8: atL(8, 'punto'),
    pero9: atL(9, 'pero'), oposiciones: atL(9, 'oposiciones'), grupo9: atL(9, 'grupo'), exigen: atL(9, 'exigen'), con9: atL(9, '=con'), fp9: atL(9, '=fp'), mucho: atL(9, 'mucho'), b9: atL(9, '=b'),
    y10: atL(10, '=y'), master: atL(10, 'master'), universitario: atL(10, 'universitario'),
    punto11: atL(11, 'punto'),
    entonces: atL(12, 'entonces'), quien: atL(12, 'quien'),
    antes: atL(13, 'antes'), fp13: atL(13, '=fp'), tener: atL(13, 'tener'), puertas: atL(13, 'puertas'), abiertas: atL(13, 'abiertas'), carrera13: atL(13, 'carrera'),
    maestra: atL(14, 'maestra'), las: atL(14, '=las'), primero: atL(14, 'primero'), luego: atL(14, 'luego'), carrera14: atL(14, 'carrera'), selectividad: atL(14, 'selectividad'), medio: atL(14, 'medio'), convalidado: atL(14, 'convalidado'),
    equipo: atL(15, 'equipo'), fp15: atL(15, '=fp'), equipo2: atL(15, 'equipo', 2), carrera15: atL(15, 'carrera'), defiendelo: atL(15, 'defiendelo'), comentarios: atL(15, 'comentarios'),
  };
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  buildCam(); buildHudPlan();
  buildRig(); buildFloor(); buildFlow();
  S.flow.push(flowCloud(6000, i => [7 + gauss(i + 3e4) * 6, Math.abs(gauss(i + 4e4)) * 1.6 + 0.05, -9 + gauss(i + 5e4) * 3.5], { size: 1.5, bright: 0.55, seed: 5 }));
  S.cards = buildCards(); S.arena = buildArena(); S.verdict = buildVerdict(S.arena); S.data = buildData(); S.gates = buildGates();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
