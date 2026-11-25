// ---------------------------------------------------------------- 29N · capítulo de un partido: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// La torre de lingotes con la raya del tope y la vivienda social (gancho) → baja al atril del partido: cuatro medidas como objetos sobre el atril, «¿y con qué dinero?» →
// las cuatro pantallas encendidas («el domingo decides tú») → sube otra vez a la torre (bucle). Nadie habla ni se mueve: las caras son fotos reales.
let TL = {};
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact, k = 1) => WORDS.filter(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))))[k - 1];
  const W_ = (w, li, d = 0, exact = false, k = 1) => { const v = find(w, li, exact, k); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 11 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    frente: W_('frente', 1), nadie: W_('nadie', 1), herede: W_('herede', 1), diez: W_('diez', 1), millones: W_('millones', 1),
    pase: W_('pase', 2), impuesto: W_('impuesto', 2), cien: W_('cien', 2, 0, true), iria: W_('iria', 2), duplicar: W_('duplicar', 2), social: W_('social', 2),
    programa: W_('programa', 3), ciento: W_('ciento', 3), paginas: W_('paginas', 3), cuatro: W_('cuatro', 3),
    jornada: W_('jornada', 4), treinta: W_('treinta', 4), cobrando: W_('cobrando', 4), empezando: W_('empezando', 4), treinta2: W_('treinta', 4, 0, false, 2), salario: W_('salario', 4), sesenta: W_('sesenta', 4), sueldo: W_('sueldo', 4),
    millon: W_('millon', 5), pisos: W_('pisos', 5), doce: W_('doce', 5), tope: W_('tope', 5), alquiler: W_('alquiler', 5),
    doscientos: W_('doscientos', 6), mes: W_('mes', 6, 0, true), hijo: W_('hijo', 6), dieciocho: W_('dieciocho', 6), ganes: W_('ganes', 6),
    comedor: W_('comedor', 7), gratis: W_('gratis', 7),
    dinero: W_('dinero', 8), impuestos: W_('impuestos', 8), fortunas: W_('fortunas', 8), empresas: W_('empresas', 8), veinte: W_('veinte', 8),
    visto: W_('visto', 9), domingo: W_('domingo', 9), decides: W_('decides', 9),
    manda: W_('mandaselo', 10) };
  const G = new THREE.Group(); scene.add(G); S.G = G; T.lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd89a, emissiveIntensity: 1.6 }); T.glassDark = M.glass;
  S.depth = {}; for (const id of ORDER) S.depth[id] = await depthData('cand_' + id + '_d.jpg');
  buildSet(G); S.env.visible = false;
  buildHook(G);
  S.P = buildProps(G);
  const r1 = rng(11); S.flow = [flowCloud(2600, () => [-7 + r1() * 14, 0.4 + r1() * 6.5, -4 + r1() * 13], { size: 0.8, bright: 0.2, seed: 1, nearF: 0.5, farF: 0.03, col: 0xcfe0ff })];
  envAll(scene); nightify(scene); NIGHT.on = true;
  for (const o of ORDER) { const u = t => (totK(o, t) - 0.3) / 0.7; NIGHT.zones['col_' + o] = t => 0.25 + 0.65 * u(t); NIGHT.zones['spot_' + o] = t => 0.2 + 0.8 * u(t); NIGHT.zones['tot_' + o] = t => totK(o, t); } NIGHT.zones.urn = t => 1; NIGHT.zones.pad = t => 1;
}
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); moodMix({ plato: 1 });
  chapterAt(t, st);
  for (const c of S.cams) c.userData.head.rotation.y = 0.15 * Math.sin(t * 0.4 + c.position.x);
}
const SCREEN_I = 0.9;                                  // luz de las pantallas con las fotos
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
