// ---------------------------------------------------------------- 29N · capítulo de un partido: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// El marcador de pabellón y los relojes de posesión (gancho: árbitros de baloncesto) → la audiencia y los cinco bloques → un ataque de cada candidato (haz de
// luz de pantalla a pantalla y la frase en el marcador) → el dato (tuteo) → «¿quién ganó?» sin encuestas → otra vez 20:00 (bucle). Nadie habla ni se mueve: las caras son fotos reales.
let TL = {};
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact, k = 1) => WORDS.filter(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))))[k - 1];
  const W_ = (w, li, d = 0, exact = false, k = 1) => { const v = find(w, li, exact, k); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 15 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    cuatro: W_('cuatro', 1), candidatos: W_('candidatos', 1), baloncesto: W_('baloncesto', 1),
    siguieron: W_('siguieron', 2), diez: W_('diez', 2), millones: W_('millones', 2), cinco: W_('cinco', 2), inmigracion: W_('inmigracion', 2),
    empezo: W_('empezo', 3), colau3: W_('colau', 3), condenar: W_('condenar', 3), cuarenta: W_('cuarenta', 3), machistas: W_('machistas', 3), sanchez3: W_('sanchez', 3), feijoo3: W_('feijoo', 3), sumaron: W_('sumaron', 3), abascal3: W_('abascal', 3),
    ataques: W_('ataques', 4), dos4: W_('dos', 4, 0, true), cada: W_('cada', 4),
    feijoo5: W_('feijoo', 5), sanchez5: W_('sanchez', 5), pizza: W_('pizza', 5), cojonuda: W_('cojonuda', 5), tuiteo: W_('tuiteo', 5), precios: W_('precios', 5),
    colau6: W_('colau', 6), feijoo6: W_('feijoo', 6), gestion: W_('gestion', 6), mantiene: W_('mantiene', 6), mazon: W_('mazon', 6),
    feijoo7: W_('feijoo', 7), colau7: W_('colau', 7), usted: W_('usted', 7), calladita: W_('calladita', 7), sanchez7: W_('sanchez', 7), machista: W_('machista', 7), feijoo7b: W_('feijoo', 7, 0, false, 2), paiporta: W_('paiporta', 7),
    abascal8: W_('abascal', 8), buitre: W_('buitre', 8), sanchez8: W_('sanchez', 8), fondos: W_('fondos', 8), banda: W_('banda', 8), guarros: W_('guarros', 8), primarias: W_('primarias', 8),
    sanchez9: W_('sanchez', 9), gobernar: W_('gobernar', 9), motosierra: W_('motosierra', 9),
    feijoo10: W_('feijoo', 10), abascal10: W_('abascal', 10), unico: W_('unico', 10), mili: W_('mili', 10), bandera: W_('bandera', 10), abascal10b: W_('abascal', 10, 0, false, 2), servicio: W_('servicio', 10),
    colau11: W_('colau', 11), abascal11: W_('abascal', 11), verguenza: W_('verguenza', 11), insultos: W_('insultos', 11),
    dato: W_('dato', 12), sanchez12: W_('sanchez', 12), colau12: W_('colau', 12), tutearon: W_('tutearon', 12), feijoo12: W_('feijoo', 12), abascal12: W_('abascal', 12), apenas: W_('apenas', 12),
    gano: W_('gano', 13), ley: W_('ley', 13), encuestas: W_('encuestas', 13), domingo: W_('domingo', 13), decides: W_('decides', 13),
    manda: W_('mandaselo', 14) };
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
