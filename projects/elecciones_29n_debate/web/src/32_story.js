// ---------------------------------------------------------------- 29N · capítulo de un partido: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// El marcador de pabellón y los relojes de posesión (gancho: árbitros de baloncesto) → la audiencia y los cinco bloques → un ataque de cada candidato (haz de
// luz de pantalla a pantalla y la frase en el marcador) → el dato (tuteo) → «¿quién ganó?» sin encuestas → otra vez 20:00 (bucle). Nadie habla ni se mueve: las caras son fotos reales.
let TL = {};
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact, k = 1) => WORDS.filter(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))))[k - 1];
  const W_ = (w, li, d = 0, exact = false, k = 1) => { const v = find(w, li, exact, k); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 11 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    anoche: W_('anoche', 1), cuatro: W_('cuatro', 1), candidatos: W_('candidatos', 1), cronometraron: W_('cronometraron', 1), arbitros: W_('arbitros', 1), baloncesto: W_('baloncesto', 1),
    siguieron: W_('siguieron', 2), diez: W_('diez', 2), millones: W_('millones', 2), personas: W_('personas', 2), cinco: W_('cinco', 2), bloques: W_('bloques', 2), vivienda: W_('vivienda', 2), inmigracion: W_('inmigracion', 2),
    cuatro3: W_('cuatro', 3), ataques: W_('ataques', 3), uno: W_('uno', 3, 0, true),
    feijoo4: W_('feijoo', 4), colau4: W_('colau', 4), usted: W_('usted', 4), calladita: W_('calladita', 4), sanchez4: W_('sanchez', 4), machista: W_('machista', 4), feijoo4b: W_('feijoo', 4, 0, false, 2), reprochaba: W_('reprochaba', 4), paiporta: W_('paiporta', 4),
    abascal5: W_('abascal', 5), buitre: W_('buitre', 5), sanchez5: W_('sanchez', 5), fondos: W_('fondos', 5),
    sanchez6: W_('sanchez', 6), feijoo6: W_('feijoo', 6), abascal6: W_('abascal', 6), unico: W_('unico', 6), mili: W_('mili', 6), bandera: W_('bandera', 6),
    colau7: W_('colau', 7), abascal7: W_('abascal', 7), verguenza: W_('verguenza', 7), insultos: W_('insultos', 7),
    dato: W_('dato', 8), sanchez8: W_('sanchez', 8), colau8: W_('colau', 8), tutearon: W_('tutearon', 8), feijoo8: W_('feijoo', 8), abascal8: W_('abascal', 8), apenas: W_('apenas', 8),
    gano: W_('gano', 9), ley: W_('ley', 9), encuestas: W_('encuestas', 9), domingo: W_('domingo', 9), decides: W_('decides', 9),
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
