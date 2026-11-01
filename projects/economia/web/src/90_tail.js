// ---------------------------------------------------------------- arranque: letras, tiempos de la voz, la sala, el panel, los objetos y la cámara
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
    subio1: atL(1, 'subio'), n58: atL(1, '=58'), pasado1: atL(1, 'pasado'), n96: atL(1, '=96'), fondos1: atL(1, 'fondos'), profes1: atL(1, 'profesionales'), peor1: atL(1, 'peor'),
    entonces2: atL(2, 'entonces'), para2: atL(2, '=para'), final2: atL(2, 'final'),
    crees3: atL(3, 'crees'), rico3: atL(3, 'rico'), realidad3: atL(3, 'realidad'), casi3: atL(3, 'casi'), consigue3: atL(3, 'consigue'),
    micro4: atL(4, 'microeconomia'), sube4: atL(4, 'sube'), alquiler4: atL(4, 'alquiler'),
    macro5: atL(5, 'macroeconomia'), inflacion5: atL(5, 'inflacion'), paro5: atL(5, 'paro'), crisis5: atL(5, 'crisis'),
    mates6: atL(6, 'matematicas'), estad6: atL(6, 'estadistica'), muchas6: atL(6, 'muchas'), esperas6: atL(6, 'esperas'),
    econom7: atL(7, 'econometria'), datos7: atL(7, 'datos'), separar7: atL(7, 'separar'), funciona7: atL(7, 'funciona'), no7: atL(7, '=no'),
    finanzas8: atL(8, 'finanzas'), cuanto8: atL(8, 'cuanto'), empresa8: atL(8, 'empresa'),
    loco9: atL(9, 'loco'), n2013: atL(9, '=2013'), nobel9: atL(9, 'nobel'), dos9: atL(9, '=dos'), contrario9: atL(9, 'contrario'),
    uno10: atL(10, '=uno'), otro10: atL(10, 'otro'), infla10: atL(10, 'infla'), burbujas10: atL(10, 'burbujas'),
    quien11: atL(11, 'quien'), primero11: atL(11, 'primero'), intentar11: atL(11, 'intentar'), cuesta11: atL(11, 'cuesta'), comisiones11: atL(11, 'comisiones'), nunca11: atL(11, 'nunca'), bien11: atL(11, 'bien'),
    fondos12: atL(12, 'fondos'), copian12: atL(12, 'copian'), cobran12: atL(12, 'cobran'), acaban12: atL(12, 'acaban'), todos12: atL(12, 'todos'),
    para13: atL(13, '=para'), sirve13: atL(13, 'sirve'), vendan13: atL(13, 'vendan'), humo13: atL(13, 'humo'),
    esto14: atL(14, 'esto'), asesor14: atL(14, 'asesoramiento'), dime14: atL(14, 'dime'), gestor14: atL(14, 'gestor'), indexado14: atL(14, 'indexado'),
  };
  K.pct1 = K.n58 + 0.55; K.burst = K.quien11 - 0.15;
  mats(); buildMats(); buildLights(); buildRoom(); buildFlow(); buildBoard(); buildProps();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3; }
  scene.fog = new THREE.FogExp2(0x070605, 0.045);
  post.uniforms.ca.value = 0.4; post.uniforms.vig.value = 0.42;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
