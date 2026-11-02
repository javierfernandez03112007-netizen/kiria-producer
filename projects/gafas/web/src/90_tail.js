// ---------------------------------------------------------------- arranque: letras, tiempos de la voz, el mundo, el esquiador, la luz, las gafas y la cámara
(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    nieve1: atL(1, 'nieve'), sol1: atL(1, '=sol'), dos1: atL(1, '=dos'), cielo1: atL(1, 'cielo'), suelo1: atL(1, 'suelo'),
    porque2: atL(2, '=por'), gafas2: atL(2, 'gafas'), naranjas2: atL(2, 'naranjas'), espejo2: atL(2, 'espejo'), final2: atL(2, 'final'),
    luz3: atL(3, '=luz'), colores3: atL(3, 'colores'), parte3: atL(3, 'parte'), ves3: atL(3, '=ves'), ultra3: atL(3, 'ultravioleta'),
    nieve4: atL(4, 'nieve'), devuelve4: atL(4, 'devuelve'), n80: atL(4, '=80'), quema4: atL(4, 'quema'), ojos4: atL(4, 'ojos'),
    vamos5: atL(5, 'vamos'), desmontar5: atL(5, 'desmontar'), gafas5: atL(5, 'gafas'),
    fuera6: atL(6, 'fuera'), espejo6: atL(6, 'espejo'), capa6: atL(6, 'capa'), rebota6: atL(6, 'rebota'), entrar6: atL(6, 'entrar'),
    detras7: atL(7, 'detras'), lente7: atL(7, 'lente'), frena7: atL(7, 'frena'), ultra7: atL(7, 'ultravioleta'),
    polar8: atL(8, 'polarizada'), filtro8: atL(8, 'filtro'), reflejo8: atL(8, 'reflejo'), hielo8: atL(8, 'hielo'), horizontal8: atL(8, 'horizontal'), filtro8b: atL(8, 'filtro', 2), rejilla8: atL(8, 'rejilla'), vertical8: atL(8, 'vertical'), deja8: atL(8, 'deja'), pasar8: atL(8, 'pasar'),
    final9: atL(9, 'final'), segunda9: atL(9, 'segunda'), aire9: atL(9, 'aire'), empane9: atL(9, 'empane'),
    color10: atL(10, 'color'), sol10: atL(10, '=sol'), gris10: atL(10, 'gris'), categoria10: atL(10, 'categoria'), dejan10: atL(10, 'dejan'), n18: atL(10, '=18'), luz10: atL(10, '=luz'),
    dias11: atL(11, 'dias'), nublados11: atL(11, 'nublados'), naranja11: atL(11, 'naranja'), amarillo11: atL(11, 'amarillo'), rosa11: atL(11, 'rosa'), frenan11: atL(11, 'frenan'), azul11: atL(11, 'azul'), dispersa11: atL(11, 'dispersa'), vuelves11: atL(11, 'vuelves'), relieve11: atL(11, 'relieve'),
    color12: atL(12, 'color'), moda12: atL(12, 'moda'), decides12: atL(12, 'decides'), tu12: atL(12, '=tu'), naranjas12: atL(12, 'naranjas'), espejo12: atL(12, 'espejo'),
  };
  mats(); buildMats(); buildWorld(); buildLights(); buildSkier(); buildLight(); buildProps(); buildPulses();
  { // reflejos: un cielo y una nieve sencillos para las lentes de espejo
    const es = new THREE.Scene(), sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), W0.sky.material.clone()); sky.material.uniforms.over.value = 0; sky.material.uniforms.space.value = 0; sky.material.uniforms.dark.value = 0; es.add(sky);
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0xe8eef6 })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -2; es.add(gnd);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 0.55;
  }
  post.uniforms.ca.value = 0.35; post.uniforms.vig.value = 0.36;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
