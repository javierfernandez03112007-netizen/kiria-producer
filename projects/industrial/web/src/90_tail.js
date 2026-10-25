
// ---------------------------------------------------------------- la pieza dorada que lleva la cámara de una escena a otra
function buildLead() {
  S.lead = new THREE.Group(); scene.add(S.lead);
  const g = gear(8, 0.07, 0.04, new THREE.MeshStandardMaterial({ color: 0x3a2400, emissive: 0xffb43a, emissiveIntensity: 3.2, roughness: 0.3, metalness: 0.4 })); S.lead.add(g); S.leadG = g;
  const core = sph(0.03, glowM(0xfff2c0, 9)); S.lead.add(core);
  S.leadL = new THREE.PointLight(0xffc46a, 0, 8, 1.4); scene.add(S.leadL);
  S.trail = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), glowM(0xffc23a, 5), 90); S.trail.frustumCulled = false; scene.add(S.trail);
  S.hit = sparks(scene, 110, 0xffe2a0, 0.06);
}

// ---------------------------------------------------------------- secuencia: qué zona manda en cada instante y cómo se pasa a la siguiente
let SEQ = [];
const D = 0.4;                 // medio vuelo (s)
const smoother = sm5;
function segIdx(t) { let i = 0; SEQ.forEach((s, k) => { if (t >= s.t0) i = k; }); return i; }
function leadAt(A, B, u) { const e = smoother(clamp(u / 0.86)); const p = A.l.clone().lerp(B.l, e); p.y += 0.6 * Math.sin(Math.PI * e); return p; }
const STN = ['base', 'struct', 'thermo', 'elec', 'auto', 'mat', 'biz', 'careers'];
function rigOf(s, t) {
  if (s.zone === 'grad') {
    const wide = env(t, K.seis + 0.2, K.si3 + 0.2, 0.6, 0.6) + (t < 30 ? 0 : 0);
    const a = [v3(GX, 1.6, 0), -Math.PI / 2, 1, 1, 0.55], b = [v3(GX - 20, 0.8, 0), 0, 3.0, 1.0, 0.9];
    return wide > 0 ? [a[0].clone().lerp(b[0], wide), lerp(a[1], b[1], wide), lerp(a[2], b[2], wide), lerp(a[3], b[3], wide), lerp(a[4], b[4], wide)] : a;
  }
  if (s.zone === 'nota') return [v3(NX, 2.6, NZ), 0, 1.5, 1, 0.6];
  if (s.zone === 'knife') return [v3(KX, 1.3, KZ), 0, 0.9, 1, 0.55];
  if (s.zone === 'reveal') { const e = sm5(clamp((t - s.t0) / 1.6)); const a = [v3(SX.careers, 1, 0), 0, 1.2, 1, 0.6], b = [v3(GX - 20, 0.8, 0), 0, 3.0, 1.0, 0.9]; return [a[0].clone().lerp(b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e), lerp(a[3], b[3], e), lerp(a[4], b[4], e)]; }
  return [v3(SX[s.zone], 1.0, 0), 0, 1, 1, 0.55];
}
function camState(t) {
  const i = segIdx(t), cur = SEQ[i], nxt = SEQ[i + 1];
  let A = null, B = null, ts = 0;
  if (i > 0 && cur.trans === 'fly' && t - cur.t0 < D) { A = SEQ[i - 1]; B = cur; ts = cur.t0; }
  else if (nxt && nxt.trans === 'fly' && nxt.t0 - t < D) { A = cur; B = nxt; ts = nxt.t0; }
  if (!A) { const c = cur.fn(t); return { p: c.p, l: c.l, f: c.f || 34, roll: 0, vis: cur.all ? null : [cur.zone], fns: [cur.fn], rig: rigOf(cur, t), lead: null, fade: dipFade(t) }; }
  const ca = A.fn(t), cb = B.fn(t), u = clamp((t - (ts - D)) / (2 * D)), e = smoother(clamp((u - 0.06) / 0.94)), arc = Math.sin(Math.PI * e);
  const p = ca.p.clone().lerp(cb.p, e); p.y += 1.2 * arc;
  const l = ca.l.clone().lerp(cb.l, e).lerp(leadAt(ca, cb, u), 0.55 * Math.sin(Math.PI * u));
  const ra = rigOf(A, t), rb = rigOf(B, t);
  return { p, l, f: lerp(ca.f || 34, cb.f || 34, e), arc, roll: 0.06 * arc * (B.t0 > 20 ? -1 : 1), vis: [A.zone, B.zone], fns: [A.fn, B.fn], rig: [ra[0].clone().lerp(rb[0], e), lerp(ra[1], rb[1], e), lerp(ra[2], rb[2], e), lerp(ra[3], rb[3], e), lerp(ra[4], rb[4], e)], lead: { A: ca, B: cb, u, ts }, fade: dipFade(t) };
}
function dipFade(t) { let f = 0; SEQ.forEach(s => { if (s.trans === 'dip') f = Math.max(f, 1 - clamp(Math.abs(t - s.t0) / 0.3)); }); return f * f * (3 - 2 * f); }

const _fw = new THREE.Vector3(), _qq = new THREE.Vector3(), _frus = new THREE.Frustum(), _pm = new THREE.Matrix4(), _bs = new THREE.Sphere();
function placeCam(st) { if (cam.fov !== st.f) { cam.fov = st.f; cam.updateProjectionMatrix(); } cam.position.copy(st.p); cam.up.set(0, 1, 0); cam.lookAt(st.l); cam.rotateZ(st.roll || 0); cam.updateMatrixWorld(); }
function frame(t) {
  placeCam(camState(t - 1 / 60)); const prevVP = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  post.uniforms.flash.value = 0;
  const st = camState(t); placeCam(st);
  st.fns.forEach(fn => fn(t));
  // cuando se ve la fábrica entera (y en la respuesta) se animan todas las estaciones; si no, solo las de la escena
  if (!st.vis) { [baseAt, structAt, thermoAt, elecAt, autoAt, matAt, bizAt, careersAt].forEach(fn => fn(t)); gradAt(t); placeCam(st); }
  _frus.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  for (const k in zones) {
    if (k === 'hall') { zones[k].visible = !st.vis || st.vis.some(z => STN.includes(z)); continue; }
    if (st.vis) zones[k].visible = st.vis.includes(k);
    else { if (k === 'nota' || k === 'knife') { zones[k].visible = false; continue; } _bs.center.set(zones[k].position.x, 1.5, zones[k].position.z); _bs.radius = k === 'careers' ? 7 : 5.5; zones[k].visible = _frus.intersectsSphere(_bs); }
  }
  // en la respuesta, las estaciones solo se encienden cuando se ve la fábrica (las otras veces, a oscuras detrás)
  rigAt(...st.rig);
  scene.environmentIntensity = 0.5; S.gridM.opacity = 0.2 + 0.35 * (st.arc || 0);
  // pieza dorada, estela e impacto
  S.hit.visible = false;
  if (st.lead) {
    const { A, B, u } = st.lead, vis = clamp(Math.min(u / 0.06, (0.92 - u) / 0.06)), lp = leadAt(A, B, u), sz = 0.9 + 0.6 * Math.sin(Math.PI * u);
    S.lead.visible = vis > 0.01; S.lead.position.copy(lp); S.lead.scale.setScalar(Math.max(0.001, sz * vis * Math.max(1, lp.distanceTo(cam.position) * 0.35))); S.lead.lookAt(cam.position); S.leadG.rotation.z = t * 9;
    S.leadL.position.copy(lp); S.leadL.intensity = 26 * vis;
    S.trail.visible = vis > 0.01;
    const dm = new THREE.Matrix4();
    for (let k = 0; k < 90; k++) { const q = leadAt(A, B, u - (k + 1) * 0.0028), s = Math.max(0.001, 0.03 * vis * (1 - k / 90) * Math.max(1, q.distanceTo(cam.position) * 0.3)); dm.makeScale(s, s, s); dm.setPosition(q.x, q.y, q.z); S.trail.setMatrixAt(k, dm); }
    S.trail.instanceMatrix.needsUpdate = true;
    const th = st.lead.ts - D + 2 * D * 0.86;
    if (t > th) { S.hit.visible = true; burst(S.hit, B.l, t, th, 0.7, 0.45, false, 2); S.hit.material.opacity = Math.max(0, 1 - (t - th) / 0.45); post.uniforms.flash.value = 0.01 * Math.exp(-(t - th) / 0.05); }
  } else { S.lead.visible = S.trail.visible = false; S.leadL.intensity = 0; }
  // desenfoque de movimiento: cuánto se ha movido en pantalla un punto a la distancia a la que se mira
  const dist = Math.min(12, st.p.distanceTo(st.l)); cam.getWorldDirection(_fw); _qq.copy(cam.position).addScaledVector(_fw, dist).applyMatrix4(prevVP);
  let dx = -_qq.x * 0.25, dy = -_qq.y * 0.25; const L = Math.hypot(dx, dy), MX = 0.1; if (L > MX) { dx *= MX / L; dy *= MX / L; }
  return { dir: [dx, dy], fade: st.fade, vig: 0.32 };
}
function blurPass(src, dst, dx, dy) { quad.material = blurM; blurM.uniforms.tA.value = src.texture; blurM.uniforms.d.value.set(dx, dy); renderer.setRenderTarget(dst); renderer.render(quadScene, quadCam); }
function drawFrame(st, t) {
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  quad.material = brightM; brightM.uniforms.tA.value = rtA.texture; renderer.setRenderTarget(rtB[0]); renderer.render(quadScene, quadCam);
  blurPass(rtB[0], rtB[1], 1 / BW, 0); blurPass(rtB[1], rtB[0], 0, 1 / BH);
  blurPass(rtB[0], rtC[1], 2 / BW, 0); blurPass(rtC[1], rtC[0], 0, 2 / BH); blurPass(rtC[0], rtC[1], 3 / BW, 0); blurPass(rtC[1], rtC[0], 0, 3 / BH);
  quad.material = post; post.uniforms.tA.value = rtA.texture; post.uniforms.tB.value = rtB[0].texture; post.uniforms.tC.value = rtC[0].texture;
  post.uniforms.dir.value.set(st.dir[0], st.dir[1]); post.uniforms.fade.value = st.fade; post.uniforms.vig.value = st.vig; post.uniforms.time.value = t;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
}
window.renderAt = function (t) {
  const st = frame(t);
  if (window.camOverride) { window.camOverride(cam, v3); st.dir = [0, 0]; }
  drawFrame(st, t);
  return true;
};
// portada: el graduado, el casco flotando sin llegar y la interrogación brillando en el hueco
window.renderCover = function () {
  const t = Number(window.COVER_T || K.falta1 + 0.15), st = frame(t);
  const Z = S.gradZ; Z.updateMatrixWorld(); const P = v3(4.4, 1.55, -1.15).applyMatrix4(Z.matrixWorld), L = v3(0, 2.25, 0).applyMatrix4(Z.matrixWorld);
  cam.fov = 34; cam.updateProjectionMatrix(); cam.position.copy(P); cam.up.set(0, 1, 0); cam.lookAt(L); cam.updateMatrixWorld();
  st.dir = [0, 0]; st.fade = 0; drawFrame(st, t);
  return true;
};

(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Serif', `url(${F}LiberationSerif-Regular.ttf)`), new FontFace('Serif', `url(${F}LiberationSerif-Italic.ttf)`, { style: 'italic' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    industrial1: atL(1, 'industrial', 1), acabas: atL(1, 'acabas'), y1: atL(1, '=y'), no1: atL(1, '=no'), industrial2: atL(1, 'industrial', 2),
    al1: atL(2, '=al'), que1: atL(2, 'que'), falta1: atL(2, 'falta'),
    y2: atL(3, '=y'), entrar: atL(3, 'entrar'), dificil: atL(3, 'dificil'), en1: atL(3, '=en'), politecnica: atL(3, 'politecnica'), pidio: atL(3, 'pidio'), trece: atL(3, '13525'), sobre: atL(3, 'sobre'), catorce: atL(3, '=14'),
    nota: atL(3, 'nota'), alta: atL(3, 'alta'), universidad: atL(3, 'universidad'),
    crees: atL(4, 'crees'), ingenieria2: atL(4, 'ingenieria'), mas: atL(4, '=mas'), realidad: atL(4, 'realidad'), son: atL(4, '=son'), todas: atL(4, 'todas'), vez: atL(4, 'vez'), asi: atL(4, 'asi'), dentro: atL(4, 'dentro'),
    base0: atL(5, '=la'), base1: atL(5, 'base'), calculo: atL(5, 'calculo'), algebra: atL(5, 'algebra'), fisica: atL(5, 'fisica'), quimica: atL(5, 'quimica'), dibujo: atL(5, 'dibujo'), tecnico: atL(5, 'tecnico'),
    estructuras: atL(6, 'estructuras'), maquinas: atL(6, 'maquinas'), viga: atL(6, 'viga'), aguanta: atL(6, 'aguanta'), como1: atL(6, 'como'), mueve: atL(6, 'mueve'), mecanismo: atL(6, 'mecanismo'),
    termo: atL(7, 'termodinamica'), calor: atL(7, 'calor'), mueve2: atL(7, 'mueve'), motor: atL(7, '=motor'), agua: atL(7, 'agua'), turbina: atL(7, 'turbina'),
    electricidad: atL(8, 'electricidad'), circuitos: atL(8, 'circuitos'), motores: atL(8, 'motores'), chips: atL(8, 'chips'), controlan: atL(8, 'controlan'),
    automatica: atL(9, 'automatica'), ensenar: atL(9, 'ensenar'), fabrica1: atL(9, 'fabrica'), sola: atL(9, 'sola'),
    materiales: atL(10, 'materiales'), fabricacion: atL(10, 'fabricacion'), de10: atL(10, '=de'), hecho: atL(10, 'hecho'), objeto: atL(10, 'objeto'), y_mat: atL(10, '=y', 2), produce: atL(10, 'produce'),
    y_hasta: atL(11, '=y'), empresa: atL(11, 'empresa'), costes: atL(11, 'costes'), organizacion: atL(11, 'organizacion'), proyectos: atL(11, 'proyectos'),
    de12: atL(12, '=de'), sale: atL(12, 'sale'), disena: atL(12, 'disena'), coches: atL(12, 'coches'), robots: atL(12, 'robots'), centrales: atL(12, 'centrales'), cadenas: atL(12, 'cadenas'),
    y3: atL(12, '=y', 2), acaba: atL(12, 'acaba'), dirigiendo: atL(12, 'dirigiendo'), fabrica2: atL(12, 'fabrica'),
    y_q: atL(13, '=y'), falta2: atL(13, 'falta'), industrial3: atL(13, 'industrial'), master1: atL(13, 'master'),
    profesion: atL(14, 'profesion'), regulada: atL(14, 'regulada'), ejercerla: atL(14, 'ejercerla'), grado: atL(14, 'grado'), master2: atL(14, 'master'), habilitante: atL(14, 'habilitante'),
    en3: atL(14, '=en'), y4: atL(14, '=4'), dos: atL(14, '=2'),
    seis: atL(15, '=6'), fabrica3: atL(15, 'fabrica'),
    si3: atL(16, '=si'), guardalo: atL(16, 'guardalo'), cuentame: atL(16, 'cuentame'), te2: atL(16, '=te'),
  };
  K.y_end_nota = K.crees - 0.3; K.te2 = K.te2;
  SEQ = [
    { zone: 'grad', t0: -1, fn: gradAt },
    { zone: 'nota', t0: K.y2 + 0.02, fn: notaAt, trans: 'fly' },
    { zone: 'knife', t0: K.crees - 0.05, fn: knifeAt, trans: 'fly' },
    { zone: 'base', t0: K.base0, fn: baseAt, trans: 'dip' },
    { zone: 'struct', t0: K.estructuras - 0.12, fn: structAt, trans: 'fly' },
    { zone: 'thermo', t0: K.termo - 0.12, fn: thermoAt, trans: 'fly' },
    { zone: 'elec', t0: K.electricidad - 0.12, fn: elecAt, trans: 'fly' },
    { zone: 'auto', t0: K.automatica - 0.12, fn: autoAt, trans: 'fly' },
    { zone: 'mat', t0: K.materiales - 0.12, fn: matAt, trans: 'fly' },
    { zone: 'biz', t0: K.y_hasta - 0.05, fn: bizAt, trans: 'fly' },
    { zone: 'careers', t0: K.de12 - 0.05, fn: careersAt, trans: 'fly' },
    { zone: 'reveal', t0: K.y3 - 0.1, fn: revealAt, all: true },
    { zone: 'grad', t0: K.y_q, fn: gradAt, all: true },
  ];
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; }
  mats(); buildFloor(); buildRig(); buildLead();
  buildGrad(); buildNota(); buildKnife();
  buildHall(); buildBase(); buildStruct(); buildThermo(); buildElec(); buildAuto(); buildMat(); buildBiz(); buildCareers();
  window.K = K; window.SEQ = SEQ;
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
