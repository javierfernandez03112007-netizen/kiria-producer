// ---------------------------------------------------------------- 29N · capítulo de un partido: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// El libro gigante del programa pasando páginas (gancho) → baja al atril del partido: cuatro medidas como objetos sobre el atril, «¿y con qué dinero?» →
// la intriga del siguiente partido sobre su atril → sube otra vez al libro (bucle). Nadie habla ni se mueve: las caras son fotos reales.
let TL = {};
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact, k = 1) => WORDS.filter(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))))[k - 1];
  const W_ = (w, li, d = 0, exact = false, k = 1) => { const v = find(w, li, exact, k); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 11 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    vox: W_('vox', 1), promete: W_('promete', 1), irpf: W_('irpf', 1), hijos: W_('hijos', 1),
    cuanto: W_('cuanto', 2), programa: W_('programa', 2), sesenta: W_('sesenta', 2), paginas: W_('paginas', 2), no: W_('no', 2, 0, true), quince: W_('quince', 2), veinticinco: W_('veinticinco', 2), circulan: W_('circulan', 2), otro: W_('otro', 2), documento: W_('documento', 2), dosmil: W_('dos', 2, 0, true),
    trae: W_('trae', 3), ciento: W_('ciento', 3), medidas: W_('medidas', 3), cuatro: W_('cuatro', 3),
    iva: W_('iva', 4), cero: W_('cero', 4), primera: W_('primera', 4), nueva: W_('nueva', 4), familia: W_('familia', 4),
    prohibir: W_('prohibir', 5), regularizaciones: W_('regularizaciones', 5), repatriar: W_('repatriar', 5), situacion: W_('situacion', 5),
    prioridad: W_('prioridad', 6), espanoles: W_('espanoles', 6), primero: W_('primero', 6), vivienda6: W_('vivienda', 6), guarderias: W_('guarderias', 6), sociales: W_('sociales', 6),
    tarjeta: W_('tarjeta', 7), unica: W_('unica', 7), extranjeros: W_('extranjeros', 7), solo: W_('solo', 7, 0, true), urgencias: W_('urgencias', 7),
    dinero: W_('dinero', 8), recortando: W_('recortando', 8), gasto: W_('gasto', 8), superfluo: W_('superfluo', 8), cuanto8: W_('cuanto', 8), tampoco: W_('tampoco', 8),
    proximo: W_('proximo', 9), frente: W_('frente', 9), nadie: W_('nadie', 9), herede: W_('herede', 9), diez: W_('diez', 9), pase: W_('pase', 9),
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
