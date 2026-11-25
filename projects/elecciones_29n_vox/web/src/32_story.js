// ---------------------------------------------------------------- 29N · capítulo de un partido: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// El candado de combinación delante del hemiciclo (gancho) → baja al atril del partido: su programa, cuatro medidas como objetos sobre el atril, «¿y con qué
// dinero?» → la intriga del siguiente partido sobre su atril → sube otra vez al candado (bucle). Nadie habla ni se mueve: las caras son fotos reales.
let TL = {};
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact) => WORDS.find(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))));
  const W_ = (w, li, d = 0, exact = false) => { const v = find(w, li, exact); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 11 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    blindar: W_('blindar', 1), pensiones: W_('pensiones', 1), constitucion: W_('constitucion', 1), hacen: W_('hacen', 1), doscientos: W_('doscientos', 1), diputados: W_('diputados', 1),
    ningun: W_('ningun', 2), nunca: W_('nunca', 2), record: W_('record', 2), doscientos2: W_('doscientos', 2), dos2: W_('dos', 2, 0, true),
    promesas: W_('promesas', 3), psoe: W_('psoe', 3), programa: W_('programa', 3), quinientas: W_('quinientas', 3), cuatro: W_('cuatro', 3),
    uno4: W_('uno', 4), pib: W_('pib', 4), cien: W_('cien', 4, 0, true), pisos: W_('pisos', 4), publicos: W_('publicos', 4),
    jornada: W_('jornada', 5), treinta5: W_('treinta', 5), media: W_('media', 5), salario: W_('salario', 5), ley: W_('ley', 5), sesenta: W_('sesenta', 5), sueldo: W_('sueldo', 5),
    paga: W_('paga', 6), crianza: W_('crianza', 6), ocho: W_('ocho', 6), cuanto: W_('cuanto', 6),
    primer: W_('primer', 7), gratis: W_('gratis', 7), ayuda: W_('ayuda', 7), doscientos7: W_('doscientos', 7), dentista: W_('dentista', 7),
    dinero: W_('dinero', 8), impuestos: W_('impuestos', 8), grandes: W_('grandes', 8), especula: W_('especula', 8),
    proximo: W_('proximo', 9), vox: W_('vox', 9), promete: W_('promete', 9), irpf: W_('irpf', 9), hijos: W_('hijos', 9), cuanto9: W_('cuanto', 9),
    manda: W_('mandaselo', 10), jubila: W_('jubila', 10) };
  const G = new THREE.Group(); scene.add(G); S.G = G; T.lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd89a, emissiveIntensity: 1.6 }); T.glassDark = M.glass;
  S.depth = {}; for (const id of ORDER) S.depth[id] = await depthData('cand_' + id + '_d.jpg');
  buildSet(G); S.env.visible = false;
  S.pad = padlock(); S.pad.position.set(...PADP); G.add(S.pad); nightSrc(_v(PADP[0], PADP[1] + 0.5, PADP[2] + 1.8), 0xfff0dc, 7, 2.8, 'pad');
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
