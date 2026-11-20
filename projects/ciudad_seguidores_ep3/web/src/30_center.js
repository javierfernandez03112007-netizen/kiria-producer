// ---------------------------------------------------------------- LA ESCENA del día 3: quién está dónde y qué hace (los tiempos llegan con la voz de Javi)
let TL = {}; const PEOPLE = [], CARS = [], ROLES = [];
// edificio de fondo: fachada con ventanas, planta baja con persiana o portal, cornisa (para cerrar la plaza y la calle)
function genericFront(w, floors, wall, seed) { const R = rng(seed), g = new THREE.Group(), H0 = 3.8, H = H0 + floors * 3.2 + 0.5;
  g.add(box(w, H, 0.5, wall, 0, H / 2, -0.25)); g.add(box(w, H, 8, stdM(0x9a948a, 0.9), 0, H / 2, -4.5));
  const nW = Math.max(2, Math.floor(w / 2.6)); for (let f = 0; f < floors; f++) for (let i = 0; i < nW; i++) { const x = -w / 2 + (i + 0.5) * w / nW, y = H0 + 0.8 + f * 3.2; g.add(box(1.2, 1.7, 0.1, T.frame, x, y + 0.85, 0.02)); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.54), T.glassDark); gl.position.set(x, y + 0.85, 0.08); g.add(gl);
    if (R() < 0.5) { const cu = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4), stdM(pick(R, [0xe8dcc0, 0xc9d8e8, 0xe8c9c9]), 0.9)); cu.position.set(x - 0.26, y + 0.85, 0.06); g.add(cu); }
    g.add(box(1.4, 0.1, 0.28, stdM(0xe6e0d4, 0.6), x, y - 0.05, 0.12)); if (R() < 0.3) { g.add(box(1.6, 0.08, 0.7, stdM(0xe6e0d4, 0.6), x, y - 0.06, 0.35)); for (let k = 0; k < 7; k++) ad(g, cyl(0.012, 0.012, 0.9, T.iron, 6)).position.set(x - 0.75 + k * 0.25, y + 0.42, 0.68); g.add(box(1.6, 0.04, 0.04, T.iron, x, y + 0.88, 0.68)); } }
  for (let i = 0; i < nW; i++) { const x = -w / 2 + (i + 0.5) * w / nW; if (R() < 0.6) { g.add(box(w / nW - 0.5, 2.9, 0.08, stdM(0x6f7378, 0.5, { metalness: 0.4 }), x, 1.5, 0.02)); for (let k = 0; k < 14; k++) g.add(box(w / nW - 0.5, 0.02, 0.1, stdM(0x55595e, 0.5), x, 0.2 + k * 0.2, 0.04)); }
    else { g.add(box(1.1, 2.4, 0.1, stdM(0x5a3a26, 0.5), x, 1.2, 0.03)); g.add(box(1.4, 0.3, 0.2, stdM(0xe6e0d4, 0.6), x, 2.55, 0.08)); } }
  g.add(box(w + 0.3, 0.35, 0.6, stdM(0xe6e0d4, 0.6), 0, H - 0.18, 0.1)); g.add(box(w, 0.15, 0.4, stdM(0xe6e0d4, 0.6), 0, H0, 0.05)); shadowAll(g); return g; }
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const W_ = (w, li, d = 0) => { const k = norm(w) + '_' + li, o = Object.getPrototypeOf(K) === Object.prototype ? K : K; const v = WORDS.find(x => x.li === li && x.n.startsWith(norm(w))); return v ? v.start - 0.03 + d : LS(li) + d; };
  TL = { end: END, L: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(LS), E: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(LE),
    stamp: W_('firmar', 1, 0.25), tocar: W_('tocar', 1), trono: W_('trono', 2), ley2: W_('ley', 2), semana: W_('semana', 2), homen: W_('homenajeara', 2), seguidor: W_('seguidor', 2), final: W_('final', 3), tu: W_('tu', 3),
    crece: W_('crece', 4), pedis: W_('pedis', 4), sushi: W_('sushi', 5), mesa: W_('mesa', 5), libre: W_('mesa', 5, 0.15), past: W_('pasteleria', 6), tartas: W_('tartas', 6), escap: W_('escaparate', 6), cola: W_('cola', 6), esquina: W_('esquina', 6),
    vet: W_('veterinario', 7), paciente: W_('paciente', 7), perro: W_('perro', 7), vacunar: W_('vacunar', 7), plaza: W_('plaza', 8), pedestal: W_('pedestal', 8), vacio: W_('vacio', 8),
    coment: W_('comentario', 9), gusta: W_('gusta', 9), semana9: W_('semana', 9), construir: W_('construira', 9), nombre: W_('nombre', 9), estatua: W_('estatua', 9), oro: W_('oro', 9), manda: W_('mandaselo', 10), estatua10: W_('estatua', 10) };
  townMats(); const G = new THREE.Group(); scene.add(G); S.G = G;
  buildGround(G); buildHall(G); S.shops = buildShops(G);
  // edificios de fondo: lado oeste de la plaza, lado sur (tras la calle transversal), norte de la calle de las tiendas y la esquina
  const walls = [[[214, 196, 168], 51], [[198, 214, 226], 52], [[226, 204, 176], 53], [[232, 220, 196], 54], [[205, 190, 210], 55]].map(([c, s]) => { const [a, b] = stuccoCanvases(c, s); return texMat(a, b, [3, 3], { r: 0.85, ns: 0.4 }); });
  const [bc, bh] = brickCanvases([140, 84, 60], 9), brickC = texMat(bc, bh, [2, 1.6], { r: 0.85, ns: 1.2 });
  for (let i = 0; i < 4; i++) { const b = genericFront(8, 3 + (i % 2), walls[i % 5], 60 + i); b.position.set(-16, 0, -10 + i * 8); b.rotation.y = Math.PI / 2; G.add(b); }
  for (let i = 0; i < 6; i++) { const b = genericFront(8, 2 + (i % 3), i % 2 ? brickC : walls[(i + 2) % 5], 70 + i); b.position.set(-18 + i * 8.2, 0, 23.5); b.rotation.y = Math.PI; G.add(b); }
  { const b = genericFront(8, 3, walls[3], 80); b.position.set(SHOP.X, 0, -16.5); b.rotation.y = -Math.PI / 2; G.add(b); const c = genericFront(3.5, 2, brickC, 81); c.position.set(SHOP.X, 0, 13.25); c.rotation.y = -Math.PI / 2; G.add(c);
    for (let i = 0; i < 3; i++) { const d = genericFront(8, 2 + i % 2, walls[(i + 1) % 5], 82 + i); d.position.set(SHOP.X, 0, -24.6 - i * 8.1); d.rotation.y = -Math.PI / 2; G.add(d); } }
  // plaza: pedestal, bancos, farolas, árboles en los céspedes, setos y parterres
  S.ped = pedestal(); G.add(S.ped);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5, b = bench(); b.position.set(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2); b.rotation.y = a + Math.PI; G.add(b); }
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [14.6, -6], [14.6, 6], [23.0, -12.6], [23.0, 3.6], [23.0, 14.7]]) { const l = lampPost(); l.position.set(x, 0, z); l.rotation.y = x > 14 ? (x > 20 ? Math.PI : 0) : Math.atan2(-x, -z) - Math.PI / 2; G.add(l); }
  const R = rng(91); for (const [x, z, h] of [[12.8, -11, 6.5], [12.8, -3.5, 6], [12.8, 4, 6.8], [12.8, 11.5, 6.2], [-14, -13.5, 7], [-13, 0, 6.5], [-13, 9, 7.2], [-6.5, 10, 5.5], [6.5, 10, 5.8]]) { const t = tree(Math.floor(R() * 1000), h); t.position.set(x, 0.05, z); t.rotation.y = R() * 6; G.add(t); }
  for (const [x, z, w, d] of [[-6.5, 12.3, 3.6, 0.6], [6.5, 12.3, 3.6, 0.6], [-6.5, 7.7, 3.6, 0.6], [6.5, 7.7, 3.6, 0.6]]) { const hd = hedge(w, d, 0.7); hd.position.set(x, 0.4, z); G.add(hd); }
  S.grass = grassField(G, T.lawns, 70000, 5);
  // coches: aparcados en el lado de la plaza y alguno que pasa
  const paints = [0xb0141e, 0xf2f2ee, 0x1c2430, 0x8e9aa6, 0x1f4f8f, 0x2f6b3a, 0xc9a227, 0x6a1a2a];
  [[-20, 1], [-14.6, -1], [-8.8, 1], [-2.4, 1], [3.6, -1], [9.6, 1]].forEach(([z, d], i) => { const c = car(['sedan', 'hatch', 'suv'][i % 3], paints[i % paints.length], i + 1); c.position.set(16.65, 0.0, z); c.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; G.add(c); CARS.push({ c, park: true }); });
  for (let i = 0; i < 3; i++) { const c = car(['hatch', 'sedan', 'suv'][i], paints[(i + 4) % paints.length], 20 + i); G.add(c); CARS.push({ c, lane: i % 2 ? 21.2 : 18.8, dir: i % 2 ? -1 : 1, off: i * 31, v: 6 + i }); }
  // ---- la gente
  const H = S.hall.userData, add = (p, x, y, z, ry, role, par = G) => { p.position.set(x, y, z); p.rotation.y = ry; par.add(p); PEOPLE.push(p); p.userData.role = role; ROLES.push(p); return p; };
  S.king = add(person({ topType: 'king', seed: 101, top: 0xf2e6c8, legs: 0x5a1020, hairStyle: 'short', hairC: 0x2e2018, skin: 0xe8c1a4, eye: 0x4d2f17 }), 0, H.dais, -32.6 + 0.16, 0, { k: 'king', vip: 'king' }, S.hall);
  for (const s of [-1, 1]) { const gd = add(person({ seed: 110 + s, topType: 'long', top: 0x2b3a6b, legs: 0x1c1c22 }), s * 2.3, HALL.FL, -29.4, 0, { k: 'guard' }, S.hall); const hb = new THREE.Group(); ad(hb, cyl(0.02, 0.02, 2.4, T.woodD, 8)).position.y = 1.2; const bl = box(0.02, 0.32, 0.18, T.goldD, 0, 2.42, 0.05); hb.add(bl); ad(hb, new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.25, 8), T.goldD)).position.y = 2.65; hb.position.set(-s * 0.28, 0, 0.12); gd.add(hb); gd.userData.halberd = hb; }
  for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, row = Math.floor(i / 2); add(person({ seed: 120 + i, female: i % 3 === 0 }), side * (2.4 + (row % 2) * 0.8), HALL.FL, -22.5 - row * 1.1, Math.PI + side * 0.25, { k: 'court' }, S.hall); }
  // sushi
  { const g = S.shops.sushi, U = g.userData; S.lydia = add(person({ female: true, seed: 201, topType: 'long', top: 0x1b1b1d, legs: 0x1b1b1d, hairStyle: 'long', hairC: 0x2e2018 }), U.dX - 0.4, 0, -1.4, Math.PI * 0.85, { k: 'owner', vip: 'lydiaa.rc' }, g);
    add(person({ seed: 202, topType: 'chef', hat: 'band' }), -0.6, 0, -6.4, 0, { k: 'chefSushi' }, g);
    U.tables.forEach(([x, z], ti) => { for (const s of [-1, 1]) add(person({ seed: 210 + ti * 2 + (s > 0), female: (ti + (s > 0)) % 2 === 0 }), x + s * 0.75, 0, z, s < 0 ? Math.PI / 2 : -Math.PI / 2, { k: 'diner', side: s > 0 ? 'L' : 'R' }, g); });
    for (let i = 0; i < 5; i++) add(person({ seed: 230 + i, female: i % 2 === 1 }), -2.8 + i * 1.1, 0, -4.85, Math.PI, { k: 'bar' }, g);
    S.couple = [add(person({ seed: 240, female: true }), U.dX + 0.4, 0, 2.4, Math.PI, { k: 'couple' }, g), add(person({ seed: 241 }), U.dX - 0.25, 0, 2.6, Math.PI, { k: 'couple' }, g)]; }
  // pastelería y la cola hasta la esquina
  { const g = S.shops.pastry, U = g.userData; S.salvador = add(person({ seed: 301, topType: 'chef', hat: 'chef', hairStyle: 'short' }), 0.6, 0, -5.25, 0, { k: 'baker', vip: 'salvadormatthias34' }, g);
    add(person({ seed: 302, female: true }), -0.6, 0, -3.5, Math.PI, { k: 'buy' }, g); add(person({ seed: 303 }), 1.4, 0, -3.55, Math.PI, { k: 'buy' }, g);
    S.queue = []; for (let i = 0; i < 15; i++) { const q = add(person({ seed: 310 + i, female: i % 2 === 0 }), U.dX + 0.3 + i * 0.8, 0, 1.25 + (i % 2) * 0.12, -Math.PI / 2, { k: 'queue', i }, g); S.queue.push(q); } }
  // veterinario: la veterinaria, el perro en la camilla, su dueño y la sala de espera
  { const g = S.shops.vet, U = g.userData; S.zamii = add(person({ female: true, seed: 401, topType: 'vet', hairStyle: 'pony', hairC: 0x1d1512, legs: 0x3a6b8a }), -1.2, 0, -3.35, 0, { k: 'vet', vip: 'zamii.luu' }, g);
    const syr = new THREE.Group(); syr.add(cyl(0.012, 0.012, 0.11, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.1 }), 10)); ad(syr, cyl(0.002, 0.002, 0.05, CARM.chrome || stdM(0xdddddd, 0.2), 4)).position.y = -0.08; syr.rotation.z = Math.PI / 2; S.zamii.userData.J.wrL.add(syr); syr.position.set(0, -0.08, 0.03); S.syringe = syr;
    S.dog = dog(0xc98a4b); S.dog.position.set(-1.2, 0.9, -2.6); S.dog.rotation.y = -Math.PI / 2; g.add(S.dog);
    add(person({ seed: 402 }), -0.15, 0, -2.3, -Math.PI / 2, { k: 'owner2' }, g);
    add(person({ seed: 403, female: true }), 1.4, 0, -1.2, -Math.PI / 2, { k: 'wait' }, g); add(person({ seed: 404 }), 2.0, 0, -2.8, -Math.PI / 2, { k: 'wait' }, g);
    const small = dog(0xf2efe8); small.scale.setScalar(0.6); small.position.set(1.1, 0, -2.6); small.rotation.y = -Math.PI / 2; g.add(small); S.dog2 = small; }
  // la plaza: paseantes, gente sentada en los bancos, un niño con globo, alguien con perro
  S.walkers = []; const WR = rng(501);
  for (let i = 0; i < 10; i++) { const p = add(person({ seed: 510 + i, female: WR() < 0.5 }), 0, 0, 0, 0, { k: 'walk', r: 7.5 + WR() * 4, a0: WR() * 6.3, v: (0.9 + WR() * 0.5) * (WR() < 0.5 ? -1 : 1) }); S.walkers.push(p); }
  for (let i = 0; i < 4; i++) { const a = [0.5, 1.55, 3.6, 4.65][i] , p = add(person({ seed: 530 + i, female: i % 2 === 0 }), Math.sin(a) * 6.45, 0, Math.cos(a) * 6.45, a + Math.PI, { k: 'sit' }); }
  // el sello pasa a la mano del rey (cuelga bajo la muñeca derecha) y la mesita se acerca al trono
  { const H = S.hall.userData; H.table.position.set(0.85, H.dais, -32.6 + 0.78); H.seal.position.set(0.098, 0.85, 0.181);
    S.sealFx = sparks(H.table, 60, 0xffd27a, 0.02); }
  S.statue = goldStatue(); S.statue.position.set(0, S.ped.userData.top, 0); S.statue.rotation.y = Math.PI * 0.25; G.add(S.statue); S.statue.visible = false; S.statFx = sparks(G, 160, 0xffe08a, 0.06);
  S.namePlates = S.ped.userData.plates.map(pl => { const n = signPlane(0.78, 0.42, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f2cf6c'); gr.addColorStop(1, '#b4862c'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#6e4c12'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#3d2806'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 64px Inter'; c.fillText('TU NOMBRE', w / 2, h / 2 - 14); c.font = '700 30px Inter'; c.fillText('mejor seguidor de la semana', w / 2, h / 2 + 46); }, { metal: 0.85, r: 0.3 });
    n.position.copy(pl.position); n.rotation.copy(pl.rotation); n.position.addScaledVector(_v(0, 0, 1).applyEuler(pl.rotation), 0.004); n.visible = false; S.ped.add(n); return n; });
  // la tarjeta del comentario (encima del pedestal): bocadillo con el corazón y los «me gusta» que suben
  S.cardT = signTex(1024, 384, () => {}); S.card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ map: S.cardT, transparent: true, toneMapped: false })); S.card.position.set(0, 4.6, 0); G.add(S.card); S.card.visible = false;
  // foco sobre el pedestal (haz de luz polvoriento)
  S.beam = lightCone(1.6, 7, 0.09, 0xffe7b8); S.beam.position.set(0, 6.4, 0); G.add(S.beam);
  // polvo en el aire (flujo óptico): en el salón (en los haces de sol) y en la calle
  const r1 = rng(11), r2 = rng(22);
  S.flow = [flowCloud(5000, () => [(r1() - 0.5) * 24, HALL.FL + r1() * 10, -17 - r1() * 16], { size: 1.3, bright: 0.55, seed: 1, nearF: 0.08, farF: 0.02, col: 0xfff0d0 }),
    flowCloud(6000, () => [-14 + r2() * 40, 0.3 + r2() * 9, -18 + r2() * 36], { size: 1.2, bright: 0.35, seed: 2, nearF: 0.1, farF: 0.015, col: 0xfff6e2 })];
  envAll(scene);
}
// ---- cada fotograma: la historia
const _tg = new THREE.Vector3();
function drawCard(n, a) { const c = S.cardT.image.getContext('2d'), w = 1024, h = 384; c.clearRect(0, 0, w, h); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,0.96)'; rr(c, 10, 10, w - 20, h - 90, 60); c.fill(); c.beginPath(); c.moveTo(150, h - 82); c.lineTo(120, h - 10); c.lineTo(230, h - 82); c.fill();
  c.fillStyle = '#d6dbe3'; c.beginPath(); c.arc(110, 140, 62, 0, 7); c.fill(); c.fillStyle = '#9aa3b0'; c.beginPath(); c.arc(110, 122, 24, 0, 7); c.fill(); c.beginPath(); c.arc(110, 186, 40, Math.PI, 0); c.fill();
  c.fillStyle = '#1a1d22'; c.font = '800 54px Inter'; c.textBaseline = 'middle'; c.fillText('Tu comentario', 200, 100); c.fillStyle = '#5b6370'; c.font = '600 40px Inter'; c.fillText('«Quiero un…»', 200, 168);
  c.fillStyle = '#e23b55'; c.save(); c.translate(w - 300, 220); c.scale(2.2, 2.2); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-14, -6, -8, -18, 0, -10); c.bezierCurveTo(8, -18, 14, -6, 0, 6); c.fill(); c.restore();
  c.fillStyle = '#e23b55'; c.font = '900 64px Inter'; c.fillText(n.toLocaleString('es-ES'), w - 250, 226); S.cardT.needsUpdate = true; S.card.material.opacity = a; }
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); if (S.grassTime) S.grassTime.value = t;
  const H = S.hall.userData, inHall = st.p.z < -16.6 && Math.abs(st.p.x) < 13; for (const f of H.flags) flagWave(f, t);
  moodMix({ dia: inHall ? 0.25 : 1, salon: inHall ? 0.75 : 0 });
  // el pergamino: sin sello hasta el golpe, sellado después
  const sealed = t >= TL.stamp; H.law.material.map = sealed ? H.lawT2 : H.lawT; H.law.material.needsUpdate = H.law.userData.s !== sealed; H.law.userData.s = sealed;
  burst(S.sealFx, _v(0.098, 0.84, 0.181), t, TL.stamp, 0.6, 0.5, false, 1.5); S.sealFx.material.opacity = bump(t, TL.stamp, TL.stamp + 0.35, 0.02, 0.4);
  for (const p of PEOPLE) { poseReset(p); breathe(p, t); const r = p.userData.role, ph = p.userData.phase;
    if (r.k === 'king') { poseSit(p, 0.05);
      // el golpe del sello: la mano baja sobre el pergamino, sella y sube; luego descansa en el brazo del trono
      // el sello (en la mesita) sube y baja; la mano del rey lo agarra por el pomo
      const dn = seg(t, TL.stamp + 0.12, TL.stamp + 0.7), back = win(t, TL.end - 1.0, 0.8);
      const hY = t < TL.stamp ? 0.16 * (1 - sm5(seg(t, TL.stamp - 0.3, TL.stamp))) + 0.015 * Math.sin(t * 2.5) : 0.2 * sm5(dn) * (1 - back) + 0.16 * back;
      H.seal.position.y = 0.828 + hY; H.table.updateMatrixWorld(true); const top = H.table.localToWorld(_v(0.098, 0.828 + hY + 0.24, 0.181));
      const rest = Math.max(1 - win(t, TL.stamp + 0.9, 0.8), back); if (rest > 0.01) reachTo(p, 'R', top, rest);
      // en «tú», señala a la cámara
      const pt = bump(t, TL.tu - 0.25, TL.E[3] + 0.5, 0.3, 0.4); if (pt > 0.01) reachTo(p, 'L', st.p.clone().lerp(p.localToWorld(_v(0, 1.0, 0.3)), 0.82), pt);
      lookAtP(p, st.p, 0.6 + 0.4 * bump(t, TL.trono - 0.4, TL.ley2, 0.4, 0.4)); faceAt(p, t, { smile: 0.75, gx: 0.0, gy: -0.1, brow: 0.3 * bump(t, TL.tu - 0.2, TL.E[3], 0.2, 0.3) }); }
    else if (r.k === 'court') { const cl = bump(t, TL.seguidor, TL.final + 0.6, 0.2, 0.4); if (cl > 0.01) { const c = Math.abs(Math.sin(t * 9 + ph)); for (const [n, s] of [['L', -1], ['R', 1]]) { p.userData.J['sh' + n].rotation.x = -1.0 * cl; p.userData.J['sh' + n].rotation.z = s * (0.15 + 0.25 * c) * cl; p.userData.J['el' + n].rotation.x = -0.9 * cl; p.userData.J['el' + n].rotation.y = -s * 0.6 * cl; } }
      lookAtP(p, H.throne.getWorldPosition(_tg).add(_v(0, 1.6, 0)), 0.8); faceAt(p, t, { smile: 0.4 + 0.4 * cl, open: cl > 0.1 ? 0.35 * cl : undefined }); }
    else if (r.k === 'diner') { poseSit(p, 0.12); const e = Math.max(0, Math.sin(t * 1.3 + ph)); poseEat(p, r.side, e); faceAt(p, t, { talk: e < 0.2 ? 1 : 0, open: e > 0.9 ? 0.3 : undefined, smile: 0.5 }); }
    else if (r.k === 'bar') { poseSit(p, 0.1); p.userData.J.pelvis.position.y = 0.74 * p.userData.k; faceAt(p, t, { talk: (Math.sin(t * 0.7 + ph) > 0.3) ? 1 : 0, smile: 0.45 }); }
    else if (r.k === 'chefSushi' || r.k === 'baker') { poseWork(p, t, 1); faceAt(p, t, { smile: 0.55 }); }
    else if (r.k === 'owner') { faceAt(p, t, { smile: 0.7, talk: bump(t, TL.sushi, TL.libre, 0.2, 0.2) }); const w = bump(t, TL.sushi + 0.2, TL.libre + 0.3, 0.3, 0.3); if (w > 0.01) poseWave(p, 'R', t, w); }
    else if (r.k === 'couple') { const k = 0,   // se quedan en la acera: si se acercaban al cristal, la cámara les pasaba rozando la cabeza
      sad = bump(t, TL.libre + 0.1, TL.L[6], 0.2, 0.4); p.position.z = lerp(3.4, 2.0, k); p.position.x = p.userData.x0 ?? (p.userData.x0 = p.position.x); if (k > 0.01 && k < 0.99) poseWalk(p, k * 3, 1);
      if (sad > 0.01) { for (const [n, s] of [['L', -1], ['R', 1]]) { p.userData.J['sh' + n].rotation.z = s * (0.08 + 0.55 * sad); p.userData.J['el' + n].rotation.x = -1.3 * sad; } } faceAt(p, t, { open: 0.45 * sad, brow: 0.8 * sad, smile: 0.35 - 0.6 * sad }); }
    else if (r.k === 'queue') { faceAt(p, t, { talk: Math.sin(t * 0.6 + ph) > 0.4 ? 1 : 0, smile: 0.4 }); if (r.i % 4 === 1) lookAtP(p, p.localToWorld(_v(0.6, 1.5, 0.2)), 0.5); }
    else if (r.k === 'vet') { const sy = bump(t, TL.paciente - 0.3, TL.L[8] + 0.2, 0.4, 0.4), oh = bump(t, TL.vacunar - 0.45, TL.L[8] + 0.4, 0.15, 0.4);
      p.userData.J.shL.rotation.x = -0.9 * sy - 0.6 * oh; p.userData.J.elL.rotation.x = -1.2 * sy; p.userData.J.shL.rotation.z = -0.2;
      lookAtP(p, S.dog.getWorldPosition(_tg).add(_v(0, 0.3, 0)), 0.8); faceAt(p, t, { smile: 0.5 - 0.7 * oh, open: 0.5 * oh, brow: 0.9 * oh }); }
    else if (r.k === 'owner2') { const oh = bump(t, TL.vacunar - 0.4, TL.L[8] + 0.4, 0.15, 0.4); lookAtP(p, S.dog.getWorldPosition(_tg).add(_v(0, 0.3, 0)), 0.8); faceAt(p, t, { open: 0.4 * oh, brow: 0.8 * oh, smile: 0.3 }); if (oh > 0.01) { p.userData.J.shR.rotation.x = -1.1 * oh; p.userData.J.shL.rotation.x = -1.1 * oh; } }
    else if (r.k === 'walk') { const s = t * r.v + r.a0 * r.r, a = s / r.r; p.position.set(Math.sin(a) * r.r, 0, Math.cos(a) * r.r); p.rotation.y = a + (r.v > 0 ? Math.PI / 2 : -Math.PI / 2); poseWalk(p, Math.abs(s), 1); faceAt(p, t, {}); }
    else if (r.k === 'sit') { poseSit(p, 0.05); faceAt(p, t, { talk: Math.sin(t * 0.5 + ph) > 0 ? 1 : 0 }); }
    else faceAt(p, t, { talk: Math.sin(t * 0.8 + ph) > 0.5 ? 0.8 : 0 });
    // al final, toda la plaza aplaude la estatua
    if (r.k === 'walk' || r.k === 'sit' || r.k === 'queue') { const ap = bump(t, TL.estatua + 0.2, TL.end, 0.4, 0.4); if (ap > 0.01 && (r.k !== 'queue')) { const c = Math.abs(Math.sin(t * 9 + ph)); for (const [n, s] of [['L', -1], ['R', 1]]) { p.userData.J['sh' + n].rotation.x = -1.0 * ap; p.userData.J['sh' + n].rotation.z = s * (0.15 + 0.25 * c) * ap; p.userData.J['el' + n].rotation.x = -0.9 * ap; p.userData.J['el' + n].rotation.y = -s * 0.6 * ap; } } } }
  // el cartel de la puerta del sushi: ABIERTO → COMPLETO
  { const D = S.shops.sushi.userData.doorSign; D[0].visible = t < TL.libre; D[1].visible = t >= TL.libre; }
  // el perro: tiembla en la camilla; con «vacunar» salta y se esconde detrás de su dueño
  if (S.dog) { const J = S.dog.userData.J, j0 = TL.vacunar - 0.45, j = seg(t, j0, j0 + 0.55), run = seg(t, j0 + 0.55, j0 + 1.3);
    const P0 = _v(-1.2, 0.9, -2.6), P1 = _v(-0.55, 0, -1.9), P2 = _v(0.25, 0, -2.0); const p = j < 1 ? P0.clone().lerp(P1, j) : P1.clone().lerp(P2, sm5(run)); if (j > 0 && j < 1) p.y = lerp(0.9, 0, j) + Math.sin(j * Math.PI) * 0.45;
    S.dog.position.copy(p); S.dog.rotation.y = -Math.PI / 2 + (j > 0 ? Math.PI * 0.75 * sm5(Math.min(1, j * 2)) : 0); const tr = j <= 0 ? 1 : 0.2;
    J.body.position.x = Math.sin(t * 40) * 0.004 * tr; J.head.rotation.y = j <= 0 ? Math.sin(t * 8) * 0.5 * bump(t, TL.perro, TL.vacunar - 0.45, 0.2, 0.1) + Math.sin(t * 2) * 0.15 : Math.sin(t * 3) * 0.2; J.tail.rotation.z = Math.sin(t * 14) * 0.6;
    for (const [n, s] of [['FL', 1], ['FR', -1], ['BL', -1], ['BR', 1]]) J[n].rotation.x = run > 0 && run < 1 ? Math.sin(t * 18) * 0.7 * s : (j > 0 && j < 1 ? -0.6 * s * 0.3 : 0);
    J.earL.rotation.z = -0.25 - 0.3 * (j > 0 && j < 1 ? 1 : 0); J.earR.rotation.z = 0.25 + 0.3 * (j > 0 && j < 1 ? 1 : 0); }
  if (S.dog2) { const J = S.dog2.userData.J; J.tail.rotation.z = Math.sin(t * 10) * 0.5; J.head.rotation.y = Math.sin(t * 1.3) * 0.4; }
  // el pedestal: foco, tarjeta del comentario con los «me gusta» que suben y la estatua que sube con chispas
  const cardA = bump(t, TL.coment, TL.estatua - 0.2, 0.35, 0.35); S.card.visible = cardA > 0.01; if (S.card.visible) { drawCard(Math.round(lerp(12, 4821, sm5(seg(t, TL.gusta - 0.2, TL.construir)))), cardA); S.card.lookAt(st.p); }
  S.beam.material.uniforms.op.value = 0.09 * win(t, TL.pedestal - 0.3, 0.6);
  { const k = seg(t, TL.estatua - 0.1, TL.estatua + 0.9); S.statue.visible = k > 0 && t < TL.end - 0.05; S.statue.scale.setScalar(1.25 * (0.001 + 0.999 * sm5(k))); S.statue.position.y = S.ped.userData.top - 0.6 * (1 - sm5(k)); S.statue.rotation.y = Math.PI * 0.25 + (1 - sm5(k)) * 3;
    burst(S.statFx, _v(0, S.ped.userData.top + 1.0, 0), t, TL.estatua, 1.2, 1.1, false, 1.2); S.statFx.material.opacity = bump(t, TL.estatua, TL.estatua + 1.0, 0.05, 0.6);
    const nm = t >= TL.nombre - 0.1 && t < TL.end - 0.05; S.namePlates.forEach(n => n.visible = nm); S.ped.userData.plates.forEach(pl => pl.visible = !nm); }
  // coches que pasan
  for (const C of CARS) if (!C.park) { const s = ((t * C.v + C.off) % 90) - 45; C.c.position.set(C.lane, 0, C.dir * s); C.c.rotation.y = C.dir > 0 ? Math.PI / 2 : -Math.PI / 2; carRoll(C.c, t * C.v); }
}
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
