// ---------------------------------------------------------------- arranque: letras, tiempos de la voz, el aula, la pizarra, los objetos y la cámara
(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('SpaceMono', `url(${F}SpaceMono-Bold.ttf)`, { weight: '700' }), new FontFace('SpaceMono', `url(${F}SpaceMono-Regular.ttf)`, { weight: '400' }),
    new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' }), new FontFace('DejaVuMono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '400' }),
    new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }), new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }),
    new FontFace('Cormorant', `url(${F}CormorantGaramond-300-italic.ttf)`, { style: 'italic', weight: '500' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const font3d = await new FontLoader().loadAsync('./node_modules/three/examples/fonts/helvetiker_bold.typeface.json');
  const lines = await (await fetch('../tiempos.json')).json();
  VENV = await (await fetch('../voz_env.json')).json();
  WORDS = lines.flatMap((l, li) => l.words.map(w => ({ ...w, n: norm(w.w), li: li + 1 })));
  END = lines[lines.length - 1].end + 1.2;
  const atL = (li, word, k = 1) => { const exact = word.startsWith('='), key = norm(word); let c = 0; for (const w of WORDS) if (w.li === li && (exact ? w.n === key : w.n.startsWith(key)) && ++c === k) return w.start - 0.03; console.error('ERROR sin palabra ' + li + ' ' + word); return 1e9; };
  K = {
    magisterio1: atL(1, 'magisterio'), carrera1: atL(1, 'carrera'), collares1: atL(1, 'collares'), macarrones1: atL(1, 'macarrones'), y1: atL(1, '=y'), verdad1: atL(1, 'verdad'),
    para2: atL(2, 'para'), sirven2: atL(2, 'sirven'), final2: atL(2, 'final'),
    crees3: atL(3, 'crees'), jugar3: atL(3, 'jugar'), ninos3: atL(3, 'ninos'), realidad3: atL(3, 'realidad'), aprender3: atL(3, 'aprender'), aprende3: atL(3, '=aprende'), cerebro3: atL(3, 'cerebro'),
    psicologia4: atL(4, 'psicologia'), aprender4: atL(4, 'aprender'), nino4: atL(4, 'nino'), edad4: atL(4, 'edad'),
    matematicas5: atL(5, 'matematicas'), sumar5: atL(5, 'sumar'), contar5: atL(5, 'contar'),
    lengua6: atL(6, 'lengua'), ensenar6: atL(6, 'ensenar'), leer6: atL(6, 'leer'), letra6: atL(6, '=letra'), letra6b: atL(6, '=letra', 2),
    dislexia7: atL(7, 'dislexia'), tdah7: atL(7, 'tdah'), autismo7: atL(7, 'autismo'), misma7: atL(7, 'misma'), clase7: atL(7, 'clase'),
    meses8: atL(8, 'meses'), practicas8: atL(8, 'practicas'), colegio8: atL(8, 'colegio'),
    facil9: atL(9, 'facil'), cataluna9: atL(9, 'cataluna'), este9: atL(9, 'este'), casi9: atL(9, 'casi'), mitad9: atL(9, 'mitad'), suspendio9: atL(9, 'suspendio'), examen9: atL(9, 'examen'), entrar9: atL(9, 'entrar'),
    oposicion10: atL(10, 'oposicion'), canarias10: atL(10, 'canarias'), diecinueve10: atL(10, 'diecinueve'), plaza10: atL(10, 'plaza'), infantil10: atL(10, 'infantil'),
    sacas11: atL(11, 'sacas'), veinticinco11: atL(11, 'veinticinco'), tres11: atL(11, 'tres'), anos11: atL(11, 'anos'), y11b: atL(11, '=y', 2), tu11: atL(11, '=tu'),
    y12: atL(12, '=y'), macarrones12: atL(12, 'macarrones'), ensartarlos12: atL(12, 'ensartarlos'), pinza12: atL(12, 'pinza'), usara12: atL(12, 'usara'), escribir12: atL(12, 'escribir'),
    si13: atL(13, '=si'), alterna13: atL(13, 'alterna'), blanco13: atL(13, 'blanco'), negro13: atL(13, 'negro'), serie13: atL(13, 'serie'), segun13: atL(13, 'segun'), cuatro13: atL(13, 'cuatro'), predice13: atL(13, 'predice'), matematicas13: atL(13, 'matematicas'), once13: atL(13, 'once'),
    primeros14: atL(14, 'primeros'), cerebro14: atL(14, 'cerebro'), crea14: atL(14, 'crea'), millon14: atL(14, 'millon'), conexiones14: atL(14, 'conexiones'), segundo14: atL(14, 'segundo'),
    asi15: atL(15, 'asi'), si15: atL(15, '=si'), magisterio15: atL(15, 'magisterio'), collares15: atL(15, 'collares'), pero15: atL(15, 'pero'), sabiendo15: atL(15, 'sabiendo'),
    mandaselo16: atL(16, 'mandaselo'), dijo16: atL(16, 'dijo'), facil16: atL(16, 'facil'), infantil16: atL(16, 'infantil'), primaria16: atL(16, 'primaria'),
  };
  mats(); buildMats(); buildLights(); buildRoom(); buildFlow(); buildBoard(); buildProps(font3d);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22; }
  scene.fog = new THREE.FogExp2(0x0d0c0b, 0.055);
  post.uniforms.ca.value = 0.4; post.uniforms.vig.value = 0.42;
  buildCam(); buildHudPlan();
  for (const m of LMS) m.resolution.set(W * PR, H * PR);
  window.K = K; window.END = END; window.dbgEval = s => eval(s);
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
