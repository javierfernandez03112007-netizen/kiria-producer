// ---------------------------------------------------------------- 29N · capítulo 0: LA HISTORIA. Dentro de la urna cae un sobre («no eliges presidente») → la pantalla
// cuenta 350 diputados y ellos señalan al presidente → los cuatro atriles con la foto real de cada candidato (hay más partidos, en penumbra) y la cita del jueves →
// uno a uno, las dos medidas de su programa como objetos sobre su atril (mismo trato, mismo sitio) → la nómina con el IRPF a cero y la pregunta «¿quién?» →
// «mañana, capítulo 1» → vuelta a la urna. Nadie habla ni se mueve: son fotos; no se les atribuyen frases. Los tiempos salen de la voz (tiempos.json).
let TL = {};
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const W_ = (w, li, d = 0) => { const v = WORDS.find(x => x.li === li && x.n.startsWith(norm(w))); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 11 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    presidente: W_('presidente', 1), eliges2: W_('eliges', 2), trescientos: W_('trescientos', 2), diputados: W_('diputados', 2), ellos: W_('ellos', 2), eligen2: W_('eligen', 2),
    hay: W_('hay', 3), partidos: W_('partidos', 3), estos: W_('estos', 3), debaten: W_('debaten', 3), jueves: W_('jueves', 3), dos3: W_('dos', 3),
    feijoo: W_('feijoo', 4), construir: W_('construir', 4), millon4: W_('millon', 4), viviendas4: W_('viviendas', 4), bajar: W_('bajar', 4), iva: W_('iva', 4), menores: W_('menores', 4),
    sanchez: W_('sanchez', 5), uno5: W_('uno', 5), pib: W_('pib', 5), vivienda5: W_('vivienda', 5), blindar: W_('blindar', 5), pensiones: W_('pensiones', 5), constitucion: W_('constitucion', 5),
    abascal: W_('abascal', 6), prohibir: W_('prohibir', 6), regularizaciones: W_('regularizaciones', 6), masivas: W_('masivas', 6), prioridad: W_('prioridad', 6), vivienda6: W_('vivienda', 6), ayudas: W_('ayudas', 6),
    colau: W_('colau', 7), jornada: W_('jornada', 7), treinta7: W_('treinta', 7), horas: W_('horas', 7), millon7: W_('millon', 7), publicas: W_('publicas', 7),
    uno8: W_('uno', 8), lleva: W_('lleva', 8), si: W_('si', 8), dieciocho: W_('dieciocho', 8), cero: W_('cero', 8), irpf: W_('irpf', 8), trabajo: W_('trabajo', 8),
    quien: W_('quien', 9), letra: W_('letra', 9), manana: W_('manana', 9), capitulo: W_('capitulo', 9), manda: W_('mandaselo', 10), votar: W_('votar', 10) };
  // cuándo manda cada atril (del principio de su frase al de la siguiente)
  TL.turn = { pp: [TL.L[4] - 0.25, TL.L[5] - 0.25], psoe: [TL.L[5] - 0.25, TL.L[6] - 0.25], vox: [TL.L[6] - 0.25, TL.L[7] - 0.25], fa: [TL.L[7] - 0.25, TL.L[8] - 0.2] };
  const G = new THREE.Group(); scene.add(G); S.G = G; T.lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd89a, emissiveIntensity: 1.6 }); T.glassDark = M.glass;
  buildSet(G); S.P = buildProps(G);
  const r1 = rng(11); S.flow = [flowCloud(2600, () => [-7 + r1() * 14, 0.4 + r1() * 6.5, -4 + r1() * 13], { size: 0.8, bright: 0.2, seed: 1, nearF: 0.5, farF: 0.03, col: 0xcfe0ff })];
  envAll(scene); nightify(scene); NIGHT.on = true;
  for (const id of ORDER) { NIGHT.zones['col_' + id] = t => colK(id, t); NIGHT.zones['spot_' + id] = t => spotK(id, t); NIGHT.zones['tot_' + id] = t => totK(id, t); } NIGHT.zones.urn = t => 1;
}
// cada pantalla: todas encendidas e iguales; la que tiene el turno, a tope, y las otras tres bajan igual; en «¿quién?» el brillo pasa de una a otra
function turnK(id, t) { const [a, b] = TL.turn[id]; return bump(t, a, b, 0.35, 0.35); }
function anyTurn(t) { let k = 0; for (const id of ORDER) k = Math.max(k, turnK(id, t)); return k; }
function totK(id, t) { const i = ORDER.indexOf(id), me = turnK(id, t), other = anyTurn(t) - me, pay = bump(t, TL.lleva - 0.2, TL.quien - 0.15, 0.3, 0.3), sweep = bump(t, TL.quien - 0.1, TL.letra - 0.1, 0.15, 0.25) * (0.5 + 0.5 * Math.sin(t * 9.5 - i * 1.57));
  return clamp(0.86 + 0.14 * me - 0.42 * other - 0.12 * pay + 0.14 * sweep - 0.3 * bump(t, TL.quien - 0.1, TL.letra - 0.1, 0.15, 0.25) * (1 - (0.5 + 0.5 * Math.sin(t * 9.5 - i * 1.57))), 0.3, 1); }
function colK(id, t) { const me = turnK(id, t), other = anyTurn(t) - me; return clamp(0.5 * (1 + 0.3 * me - 0.6 * other), 0, 1); }
function spotK(id, t) { const me = turnK(id, t), other = anyTurn(t) - me; return clamp(0.55 * (1 + 0.6 * me - 0.6 * other), 0, 1); }
// el sobre: cae dentro de la urna hacia la cámara. u = segundos desde el primer fotograma; la segunda caída enlaza el final con el principio
function envU(t) { return t < END / 2 ? t : t - END; }
function envAt(u) { const e = S.env, base = S.urn.position.y, ux = SET.URN[0], uz = SET.URN[2], k = clamp((u + 0.9) / 1.6), fall = Math.pow(k, 1.3);             // en el primer fotograma ya viene cayendo (se ve arriba)
  e.visible = u > -0.9; const y = lerp(base + 0.52, base + 0.128, fall), flut = Math.sin(k * 7.5) * (1 - k);
  e.position.set(ux + 0.025 * flut + 0.005, y, uz - 0.1 + 0.03 * Math.sin(k * 5) * (1 - k)); e.rotation.set(lerp(-0.2, -Math.PI / 2 + 0.06, Math.pow(k, 2.2)) + 0.2 * flut, 0.2 * flut + 0.12, 0.12 * flut); }
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); moodMix({ plato: 1 });
  envAt(envU(t));
  // la pantalla grande: «29N» → hemiciclo que cuenta 350 y señala al presidente → la cita del jueves → «29N» → «mañana, capítulo 1»
  { const hA = bump(t, TL.eliges2 - 0.25, TL.hay + 0.1, 0.3, 0.35), cita = bump(t, TL.debaten - 0.35, TL.L[4] - 0.35, 0.3, 0.3), man = bump(t, TL.manana - 0.15, TL.manda + 0.5, 0.25, 0.4), q2 = x => Math.round(x * 20) / 20;
    const quiet = Math.max(anyTurn(t), bump(t, TL.lleva - 0.3, TL.manana, 0.3, 0.3));
    wallDraw({ hemi: hA > 0.01 ? Math.round(seg(t, TL.trescientos - 0.05, TL.diputados + 0.25) * 350) / 350 : 0, hemiA: q2(hA), pres: q2(win(t, TL.ellos - 0.05, 0.45)), cita: q2(cita), man: q2(man), base: q2(clamp(1 - hA - cita - man - quiet)), band: ORDER.map(id => q2(colK(id, t) * (1 - 0.85 * hA))) }); }
  // las pantallas de los cuatro (y su reflejo: comparten material) y las de los demás partidos, que se encienden un momento
  for (const id of ORDER) { const k = totK(id, t); S.tot[id].mat.emissiveIntensity = SCREEN_I * k; S.spots[id].cone.material.uniforms.op.value = 0.015 + 0.04 * spotK(id, t); }
  { const k = bump(t, TL.hay - 0.1, TL.estos + 0.15, 0.3, 0.45); S.dims.forEach((d, i) => { const f = k * (0.6 + 0.4 * Math.sin(t * 5 + i)); d.userData.pl.emissiveIntensity = 0.5 * f; d.userData.tm.emissiveIntensity = 0.12 + 0.9 * f; }); }
  // las medidas (cada objeto aparece con su palabra, sobre el atril)
  const P = S.P, vis = (g, a, b) => { const k = bump(t, a, b, 0.001, 0.2); g.visible = k > 0.01; if (g.visible) g.scale.setScalar(Math.max(0.01, pop(t, a, 0.4)) * Math.min(1, k * 1.2)); return g.visible; }, ps = (o, t0, d = 0.35) => o.scale.setScalar(Math.max(0.001, pop(t, t0, d)));
  if (vis(P.pp.a, TL.construir - 0.1, TL.bajar - 0.12)) P.pp.houses.forEach((h, i) => { const s0 = h.userData.s0 ?? (h.userData.s0 = 1); h.scale.setScalar(Math.max(0.001, pop(t, lerp(TL.construir, TL.viviendas4 + 0.15, i / 14), 0.3)) * s0); });
  if (vis(P.pp.b, TL.bajar - 0.1, TL.turn.pp[1] + 0.1)) { const f = win(t, TL.menores - 0.12, 0.25); P.pp.t10.visible = f < 0.5; P.pp.t4.visible = f >= 0.5; P.pp.t10.scale.set(1, Math.max(0.02, 1 - f * 2), 1); P.pp.t4.scale.set(1, Math.max(0.02, f * 2 - 1), 1); P.pp.house.rotation.y = 0.25 * Math.sin(t * 1.4); }
  if (vis(P.psoe.a, TL.uno5 - 0.1, TL.blindar - 0.12)) { const k = sm5(seg(t, TL.pib - 0.1, TL.vivienda5)), x0 = -0.38, x1 = -0.14; P.psoe.slice.position.set(lerp(x0, x1, k), lerp(0.29, 0.2, k) + 0.1 * Math.sin(k * Math.PI), 0); P.psoe.slice.rotation.z = -k * 1.2; P.psoe.slice.visible = k < 0.97; ps(P.psoe.house, TL.vivienda5 - 0.08); }
  if (vis(P.psoe.b, TL.blindar - 0.1, TL.turn.psoe[1] + 0.1)) { ps(P.psoe.shield, TL.pensiones - 0.05); P.psoe.shield.scale.multiplyScalar(0.5); P.psoe.lock.scale.setScalar(Math.max(0.001, pop(t, TL.constitucion + 0.25, 0.3)) * 0.55); P.psoe.book.rotation.y = -0.22 + 0.06 * Math.sin(t * 1.3); }
  if (vis(P.vox.a, TL.prohibir - 0.1, TL.prioridad - 0.12)) { const hitT = TL.masivas + 0.28, d = clamp((hitT - t) / 0.3, 0, 1), up = clamp((t - hitT) / 0.35, 0, 1); ps(P.vox.doc, TL.regularizaciones - 0.1);
    P.vox.stamp.visible = t > TL.regularizaciones + 0.2; P.vox.stamp.position.set(-0.25 + 0.22 * up, 0.13 + 0.06 * up, 0.03 + 0.3 * d * d + 0.18 * up); P.vox.stamp.rotation.set(Math.PI / 2 - 0.1, 0, 0); P.vox.mark.visible = t >= hitT; P.vox.mark.scale.setScalar(t >= hitT ? 1 + 0.25 * Math.max(0, 1 - (t - hitT) / 0.18) : 1); }
  if (vis(P.vox.b, TL.prioridad - 0.1, TL.turn.vox[1] + 0.1)) { ps(P.vox.hs, TL.vivienda6 - 0.08); ps(P.vox.aid, TL.ayudas - 0.08); const k = win(t, TL.vivienda6 - 0.15, 0.35);                        // el «1.º» grande pasa al tejado de la casa; con «ayudas» sale el suyo
    P.vox.b1.position.set(lerp(-0.26, -0.3, k), lerp(0.19, 0.3, k), 0.12); P.vox.b1.scale.setScalar(Math.max(0.001, pop(t, TL.prioridad - 0.05, 0.35)) * lerp(1.25, 0.5, k)); P.vox.b2.position.set(-0.05, 0.2, 0.12); P.vox.b2.scale.setScalar(Math.max(0.001, pop(t, TL.ayudas - 0.02, 0.35)) * 0.5); }
  if (vis(P.fa.a, TL.jornada - 0.1, TL.millon7 - 0.3)) { const f = win(t, TL.treinta7 - 0.05, 0.4); for (const i of [8, 9]) { const c = P.fa.cells[i]; c.scale.set(1, Math.max(0.02, 1 - f), 1); c.position.y = 0.06 + 0.1 * Math.max(0.02, 1 - f); c.visible = f < 0.98; }
    P.fa.h40.visible = P.fa.lab40.visible = f < 0.5; P.fa.h32.visible = P.fa.lab32.visible = f >= 0.5; ps(P.fa.h32, TL.treinta7 + 0.15); ps(P.fa.lab32, TL.treinta7 + 0.15); }
  if (vis(P.fa.b, TL.millon7 - 0.28, TL.turn.fa[1] + 0.1)) P.fa.blocks.forEach((b, i) => { b.scale.set(1, Math.max(0.001, pop(t, lerp(TL.millon7 - 0.2, TL.publicas, i / 4), 0.45)), 1); });
  // la intriga: la nómina (IRPF a cero), un «?» sobre cada pantalla y la lupa en la letra pequeña
  { const a = bump(t, TL.lleva - 0.15, TL.manana - 0.05, 0.01, 0.3); P.pay.g.visible = a > 0.01; if (P.pay.g.visible) { P.pay.g.scale.setScalar(Math.max(0.01, pop(t, TL.lleva - 0.15, 0.45)) * Math.min(1, a * 1.3)); P.pay.g.rotation.z = 0.012 * Math.sin(t * 1.1);
      drawPay(t > TL.cero + 0.02 ? 1 : 0, Math.round(win(t, TL.dieciocho - 0.1, 0.3) * 10) / 10); const mg = bump(t, TL.letra - 0.25, TL.manana - 0.05, 0.25, 0.25); P.pay.mag.visible = mg > 0.01; P.pay.mag.position.set(-0.55 + 1.0 * seg(t, TL.letra - 0.15, TL.manana - 0.15), -0.5 + 0.03 * Math.sin(t * 3), 0.08); P.pay.mag.scale.setScalar(2.4 * Math.max(0.01, mg)); }
    ORDER.forEach((id, i) => { const q = P.q[id], k = bump(t, TL.quien - 0.1 + i * 0.1, TL.letra - 0.45, 0.01, 0.2); q.visible = k > 0.01; if (q.visible) { q.scale.setScalar(Math.max(0.01, pop(t, TL.quien - 0.1 + i * 0.1, 0.35)) * Math.min(1, k * 1.3)); q.position.y = TOTEM.Y + TOTEM.H + 0.42 + 0.04 * Math.sin(t * 3 + i); } }); }
  for (const c of S.cams) c.userData.head.rotation.y = 0.15 * Math.sin(t * 0.4 + c.position.x);
}
const SCREEN_I = 0.9;                                  // luz de las pantallas con las fotos
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
