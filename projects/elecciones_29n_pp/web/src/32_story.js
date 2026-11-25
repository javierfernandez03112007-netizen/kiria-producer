// ---------------------------------------------------------------- 29N · capítulo de un partido: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// La nómina gigante con el IRPF a cero, la lupa y las barras de la rebaja (gancho) → baja al atril del partido: cuatro medidas como objetos sobre el atril, «¿y con qué dinero?» →
// la intriga del siguiente partido sobre su atril → sube otra vez a la nómina (bucle). Nadie habla ni se mueve: las caras son fotos reales.
let TL = {};
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact, k = 1) => WORDS.filter(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))))[k - 1];
  const W_ = (w, li, d = 0, exact = false, k = 1) => { const v = find(w, li, exact, k); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 11 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    cero: W_('cero', 1), irpf: W_('irpf', 1), primer: W_('primer', 1), trabajo: W_('trabajo', 1), promesa: W_('promesa', 1), pp: W_('pp', 1),
    letra: W_('letra', 2), pequena: W_('pequena', 2), dieciocho: W_('dieciocho', 2), treinta: W_('treinta', 2), baja: W_('baja', 2), setenta: W_('setenta', 2), segundo: W_('segundo', 2), mitad: W_('mitad', 2), tercero: W_('tercero', 2), veinticinco: W_('veinticinco', 2), cuarto: W_('cuarto', 2),
    trae: W_('trae', 3), doscientas: W_('doscientas', 3), medidas: W_('medidas', 3), cuatro: W_('cuatro', 3),
    millon: W_('millon', 4), casas: W_('casas', 4), iva: W_('iva', 4), primera: W_('primera', 4), diez: W_('diez', 4), cuatro4: W_('cuatro', 4), menos: W_('menos', 4), cuarenta: W_('cuarenta', 4),
    iva5: W_('iva', 5), cero5: W_('cero', 5), alimentos: W_('alimentos', 5), mientras: W_('mientras', 5), crisis: W_('crisis', 5),
    subirlas: W_('subirlas', 6), ipc: W_('ipc', 6),
    cupo: W_('cupo', 7), trabajadores: W_('trabajadores', 7), control: W_('control', 7), fronteras: W_('fronteras', 7),
    dinero: W_('dinero', 8), empieza: W_('empieza', 8), auditar: W_('auditar', 8), gasto: W_('gasto', 8), cien: W_('cien', 8, 0, true),
    proximo: W_('proximo', 9), psoe: W_('psoe', 9), blindar: W_('blindar', 9), pensiones: W_('pensiones', 9), constitucion: W_('constitucion', 9), falta: W_('falta', 9),
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
