// ---------------------------------------------------------------- LA ESCENA del día 5 (al atardecer): el salón del trono (el nuevo rey @yugo_gb dice que no a la corona: rueda por el suelo),
// la fragua real al pie de la escalinata, la calle del sur con el club de @ammmm_mal, el cine y el restaurante chino de @god_nika0206, el campo del club de fútbol
// de @luquita.berna (al oeste), la puerta sur del cuartel (@victorelcrepeer_mc entra, @marcos13_08: «¡Adelante!») y el balcón del ayuntamiento con la máscara.
// Los tiempos salen de la voz (tiempos.json).
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
  const W_ = (w, li, d = 0) => { const v = WORDS.find(x => x.li === li && x.n.startsWith(norm(w))); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 13 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    rey1: W_('rey', 1), no1: W_('no', 1), corona1: W_('corona', 1), final2: W_('final', 2), lugar: W_('lugar', 2),
    yugo: W_('yugo', 3), coment3: W_('comentario', 3), diecio: W_('dieciocho', 3), gusta3: W_('gusta', 3), puso: W_('puso', 3), condicion: W_('condicion', 3),
    mientras: W_('mientras', 4), forjan: W_('forjan', 4), ciudad: W_('ciudad', 4), cumple: W_('cumple', 4), pedisteis: W_('pedisteis', 4),
    ammm: W_('ammmm', 5), club5: W_('club', 5), portero: W_('portero', 5), nadie: W_('nadie', 5),
    god: W_('god', 6), cine: W_('cine', 6), chino: W_('chino', 6), estreno: W_('estreno', 6), queda: W_('queda', 6), rollito: W_('rollito', 6),
    luquita: W_('luquita', 7), futbol: W_('futbol', 7), siete: W_('siete', 7), suyo: W_('suyo', 7),
    victor: W_('victor', 8), soldado: W_('soldado', 8), marcos: W_('marcos', 8), adelante: W_('adelante', 8),
    ahora: W_('ahora', 9), rey9: W_('rey', 9), sale: W_('sale', 9), balcon: W_('balcon', 9),
    mascara: W_('mascara', 10), acero: W_('acero', 10), refleja: W_('refleja', 10), cielo: W_('cielo', 10),
    mejor: W_('mejor', 11), corona11: W_('corona', 11), coment11: W_('comentario', 11), proximo: W_('proximo', 11), rey11: W_('rey', 11),
    ni: W_('ni', 6), manda: W_('mandaselo', 12), nunca: W_('nunca', 12), corona12: W_('corona', 12) };
  TL.swap = (TL.L[6] + TL.L[7]) / 2;                     // la corona vuelve a su cojín (la cámara está lejos) para el bucle del final
  TL.kingOut = TL.L[9] - 2.5; TL.kingIn = TL.L[12] + 0.7; // el rey sube al balcón y vuelve al salón (siempre fuera de cámara)
  townMats(); const G = new THREE.Group(); scene.add(G); S.G = G;
  buildGround(G); buildHall(G); S.shops = buildShops(G); S.hall.userData.tcrown.visible = false;
  const walls = [[[214, 196, 168], 51], [[198, 214, 226], 52], [[226, 204, 176], 53], [[232, 220, 196], 54], [[205, 190, 210], 55]].map(([c, s]) => { const [a, b] = stuccoCanvases(c, s); return texMat(a, b, [3, 3], { r: 0.85, ns: 0.4 }); });
  const [bc, bh] = brickCanvases([140, 84, 60], 9), brickC = texMat(bc, bh, [2, 1.6], { r: 0.85, ns: 1.2 });
  // lado sur de la calle del sur: el restaurante chino, el cine y el club (día 5), dos fachadas, la ferretería y el hotel
  S.chinese = chineseFront(8); S.chinese.position.set(-24.2, 0, 23.5); S.chinese.rotation.y = Math.PI; G.add(S.chinese); lightWindows(S.chinese, 0.45, 371);
  S.cinema = cinemaFront(8); S.cinema.position.set(-16.0, 0, 23.5); S.cinema.rotation.y = Math.PI; G.add(S.cinema); lightWindows(S.cinema, 0.45, 372);
  S.club = clubFront(8); S.club.position.set(-7.8, 0, 23.5); S.club.rotation.y = Math.PI; G.add(S.club); lightWindows(S.club, 0.5, 373);
  for (const o of [S.chinese, S.cinema, S.club]) { o.updateMatrixWorld(true); if (o.userData.src) o.userData.src.p.applyMatrix4(o.matrixWorld); }
  { const U = S.chinese.userData; U.src = nightSrc(S.chinese.localToWorld(_v(0, 3.2, -2.8)), 0xffb070, 11, 4.2); nightSrc(S.chinese.localToWorld(_v(0, 3.0, 1.2)), 0xff6a3a, 8, 3.0); }
  for (const [x, w, fl, m, sd] of [[0.0, 7, 2, walls[4], 73], [13.55, 3.9, 3, brickC, 74]]) { const b = genericFront(w, fl, m, sd); b.position.set(x, 0, 23.5); b.rotation.y = Math.PI; G.add(b); lightWindows(b, 0.5, 320 + sd); }
  buildHardware(G); buildHotel(G);
  { const b = genericFront(8, 3, walls[3], 80); b.position.set(SHOP.X, 0, -16.5); b.rotation.y = -Math.PI / 2; G.add(b); lightWindows(b, 0.4, 380); const c = genericFront(3.5, 2, brickC, 81); c.position.set(SHOP.X, 0, 13.25); c.rotation.y = -Math.PI / 2; G.add(c); lightWindows(c, 0.4, 381);
    for (let i = 0; i < 3; i++) { const d = genericFront(8, 2 + i % 2, walls[(i + 1) % 5], 82 + i); d.position.set(SHOP.X, 0, -24.6 - i * 8.1); d.rotation.y = -Math.PI / 2; G.add(d); lightWindows(d, 0.4, 383 + i); } }
  buildBarracks(G, walls[1]);
  for (const k of ['sushi', 'pastry', 'vet']) { const U = S.shops[k].userData; nightSrc(U.local(0, 3.0, -2.2), 0xffe2b8, 26, 4.2); lightWindows(S.shops[k], 0.4, 340 + k.length); }
  lightWindows(S.hall, 0.6, 360);
  // el campo del club de fútbol (al oeste de la calle del sur, junto al cuartel)
  S.pitch = footballPitch(32, 20); S.pitch.position.set(-51, 0, 31); G.add(S.pitch);
  { const R = rng(93); for (const [x, z, h] of [[-71, 26, 7.5], [-71, 37, 6.8], [-62, 45.6, 6.5], [-45, 45.8, 7.2], [-37, 46.2, 6.4]]) { const t = tree(Math.floor(R() * 1000), h); t.position.set(x, 0.05, z); t.rotation.y = R() * 6; G.add(t); } }
  // plaza: la estatua de Kiria (ya destapada), bancos, farolas, árboles, setos y césped; la fragua al lado del ayuntamiento
  S.ped = pedestal(); G.add(S.ped); const PT = S.ped.userData.top;
  S.kiria = kiriaStatue(); S.kiria.position.set(0, PT, 0); G.add(S.kiria); S.kiria.userData.gold.userData.envMapFixed = 'atardecer';
  { const pl = S.ped.userData.plates[0]; const m = pl.material.clone(); m.map = signTex(512, 276, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f2cf6c'); gr.addColorStop(1, '#b4862c'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#6e4c12'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = '#3d2806'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 92px Inter'; c.fillText('KIRIA', w / 2, h * 0.38); c.font = '700 30px Inter'; c.fillText('POR ORDEN DEL REY', w / 2, h * 0.66); c.fillText('@iannyanezz_', w / 2, h * 0.8); }); m.emissiveMap = m.map; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 0.3; pl.material = m; }
  for (const a of [1.55]) { const b = bench(); b.position.set(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2); b.rotation.y = a + Math.PI; G.add(b); }
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [14.6, -6], [14.6, 6], [23.0, -12.6], [23.0, 3.6], [23.0, 14.7]]) nightLamp(G, x, z, x > 14 ? (x > 20 ? Math.PI : 0) : Math.atan2(-x, -z) - Math.PI / 2);
  for (const x of [-27, -20, -12, 2, 12.6, 27, 36]) nightLamp(G, x, 22.95, Math.PI / 2);
  for (const x of [-24, -11, -3, 8]) nightLamp(G, x, 15.75, -Math.PI / 2);
  const R = rng(91); for (const [x, z, h] of [[12.8, -11, 6.5], [12.8, -3.5, 6], [12.8, 4, 6.8], [12.8, 11.5, 6.2], [-14, -10.5, 7], [-13, 9.5, 7.2], [6.5, 10, 5.8]]) { const t = tree(Math.floor(R() * 1000), h); t.position.set(x, 0.05, z); t.rotation.y = R() * 6; G.add(t); }
  for (const [x, z, w, d] of [[-6.5, 12.3, 3.6, 0.6], [6.5, 12.3, 3.6, 0.6], [-6.5, 7.7, 3.6, 0.6], [6.5, 7.7, 3.6, 0.6]]) { const hd = hedge(w, d, 0.7); hd.position.set(x, 0.4, z); G.add(hd); }
  S.grass = grassField(G, T.lawns, 70000, 5);
  S.forge = forge(); S.forge.position.set(-2.5, 0, -9.5); S.forge.rotation.y = Math.PI / 2; G.add(S.forge); S.forge.updateMatrixWorld(true);
  nightSrc(S.forge.localToWorld(_v(-1.2, 1.3, 0)), 0xff7a2a, 30, 3.4, 'forja'); nightSrc(S.forge.localToWorld(_v(0.5, 1.0, 0)), 0xff8a3a, 10, 1.6, 'pieza');
  // el balcón y el salón: cojín del mayordomo y la corona que rueda
  S.cushion = cushion(); S.cushion.position.set(0.62, 2.25, -31.42); G.add(S.cushion);
  S.rcrown = crown(1.15); G.add(S.rcrown); envAll(S.rcrown);
  CR.Pc = _v(0.62, 2.25 + 0.09 + CROWN.b, -31.42); CR.P0 = _v(0.42, HALL.FL, -29.62); CR.f0 = _v(0.08, 0, 1).normalize(); CR.s0 = _v(CR.f0.z, 0, -CR.f0.x);
  // coches: aparcados en la calle de las tiendas y los que pasan (ya con los faros encendidos); un taxi en la puerta del hotel
  const paints = [0xb0141e, 0xf2f2ee, 0x1c2430, 0x8e9aa6, 0x1f4f8f, 0x2f6b3a, 0xc9a227, 0x6a1a2a];
  [[-20, 1], [-14.6, -1], [-8.8, 1], [-2.4, 1], [3.6, -1], [9.6, 1]].forEach(([z, d], i) => { const c = car(['sedan', 'hatch', 'suv'][i % 3], paints[i % paints.length], i + 1); c.position.set(16.65, 0.0, z); c.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; G.add(c); CARS.push({ c, park: true }); });
  CARM.head.emissiveIntensity = 0.15; CARM.tail.emissiveIntensity = 0.3;
  const lightsOn = c => { const hm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 3.5, roughness: 0.1 }), tm = new THREE.MeshStandardMaterial({ color: 0x8a0a10, emissive: 0xff2020, emissiveIntensity: 1.8, roughness: 0.2 });
    c.traverse(o => { if (o.isMesh && o.material === CARM.head) o.material = hm; else if (o.isMesh && o.material === CARM.tail) o.material = tm; }); };
  for (let i = 0; i < 3; i++) { const c = car(['hatch', 'sedan', 'suv'][i], paints[(i + 4) % paints.length], 20 + i); G.add(c); lightsOn(c); CARS.push({ c, lane: i % 2 ? 21.2 : 18.8, dir: i % 2 ? -1 : 1, off: i * 31, v: 6 + i }); }
  { const taxi = car('sedan', 0xf2f2ee, 41); taxi.position.set(29.5, 0, 20.9); taxi.rotation.y = 0; G.add(taxi); lightsOn(taxi); CARS.push({ c: taxi, park: true }); }
  // ---- la gente
  const add = (p, x, y, z, ry, role, par = G) => { p.position.set(x, y, z); p.rotation.y = ry; par.add(p); PEOPLE.push(p); p.userData.role = role; ROLES.push(p); return p; };
  const olive = { topType: 'long', top: 0x4a5532, legs: 0x3d4729, shoes: 0x141414 };
  // el salón del trono: el rey (de espaldas, sin corona), el mayordomo con el cojín, dos guardias y los cortesanos que ven rodar la corona
  S.king = add(person({ topType: 'king', seed: 105, top: 0xf2e6c8, legs: 0x2a1a30, hairStyle: 'short', hairC: 0x1e1612, skin: 0xd9ae8c, eye: 0x3d2a17 }), -0.05, HALL.FL + 0.6, -31.7, Math.PI, { k: 'king', vip: 'yugo_gb' });
  S.king.userData.crown.visible = false; steelMask(S.king); S.king.userData.hallAt = t => t < TL.kingOut || t > TL.kingIn;
  S.cham = add(person({ seed: 120, topType: 'coat', top: 0x4b2a78, legs: 0x1c1c22, hairStyle: 'short', hairC: 0x8a8a8a }), 0.98, HALL.FL + 0.6, -31.42, -Math.PI / 2, { k: 'cham' }, S.hall);
  for (const s of [-1, 1]) { const gd = add(person({ seed: 130 + s, topType: 'long', top: 0x2b3a6b, legs: 0x1c1c22 }), s * 2.7, HALL.FL, -29.9, 0, { k: 'hguard' }, S.hall); capOn(gd, 0x2b3a6b, false); }
  S.courtiers = []; const CRR = rng(140); for (const [x, z, i] of [[-2.1, -27.3, 0], [2.2, -27.6, 1], [-2.3, -25.4, 2], [2.4, -25.2, 3], [-2.0, -23.2, 4], [2.1, -22.9, 5]]) { const p = add(person({ seed: 141 + i, female: i % 2 === 0, topType: CRR() < 0.5 ? 'coat' : 'long', top: [0x6a1a2a, 0x1f4f6f, 0x5a4a2a, 0x2a5a3a, 0x7a5a8a, 0x3a3a4a][i] }), x, HALL.FL, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, { k: 'court', i }, S.hall); S.courtiers.push(p); }
  // la fragua: el herrero con su martillo y tres mirones
  { const g = S.forge; S.smith = add(person({ seed: 160, topType: 'apron', apron: 0x5a3a22, top: 0x3a3632, legs: 0x2a2620, hairStyle: 'buzz', skin: 0xc99a78 }), 0.5, 0, -0.72, 0, { k: 'smith' }, g);
    S.hammer = smithHammer(); S.smith.userData.J.wrR.add(S.hammer); S.hammer.position.set(0, -0.06, 0.02);
    for (const [x, z, i] of [[2.2, -2.0, 0], [1.2, -2.3, 1], [-2.4, -2.0, 2]]) add(person({ seed: 165 + i, female: i === 1 }), x, 0, z, Math.atan2(0.5 - x, -z), { k: 'watch', i }, g); }
  // el club: @ammmm_mal en la puerta, el portero, la cola tras el cordón y @rojas.esthe (electricista) arreglando el neón en la escalera
  { const g = S.club; S.ammm = add(person({ seed: 201, top: 0xf2f2ee, topType: 'coat', legs: 0x16161a, hairStyle: 'short', hairC: 0x141010 }), 0, 0.14, 0.42, 0, { k: 'ammm', vip: 'ammmm_mal' }, g); shades(S.ammm);
    S.bouncer = add(person({ seed: 202, top: 0x111114, topType: 'long', legs: 0x111114, hairStyle: 'buzz', skin: 0x8a5a3c }), -0.98, 0.14, 0.72, -Math.PI / 2, { k: 'bouncer' }, g); S.bouncer.scale.setScalar(1.08);
    S.queue = []; for (let i = 0; i < 7; i++) { const p = add(person({ seed: 210 + i, female: i % 3 !== 1, top: [0xff5a8a, 0x2a2a2e, 0x3df2ff, 0xf2e6c8, 0x9a5cff, 0x1f1f24, 0xffd36a][i] }), -1.6 - i * 0.6, 0.14, 0.48, Math.PI / 2, { k: 'queue', i }, g); S.queue.push(p); if (i === 3) { const ph = new THREE.Group(); ph.add(box(0.075, 0.15, 0.01, stdM(0x111111, 0.3), 0, 0, 0)); p.userData.J.wrR.add(ph); ph.position.set(0, -0.09, 0.02); ph.rotation.x = -1.2; } }
    const ld = ladder(3.4); ld.position.set(2.15, 0.14, 0.55); ld.rotation.x = -0.14; g.add(ld);
    S.esthe = add(person({ seed: 230, female: true, top: 0x2a3a5a, legs: 0x2a3446, topType: 'long', hairStyle: 'pony', hairC: 0x2a1810 }), 2.15, 1.7, 0.52, Math.PI, { k: 'esthe', vipW: 'rojas.esthe' }, g); hardHat(S.esthe, 0xf2c418, false); vestOn(S.esthe); }
  // el cine: @god_nika0206 en la alfombra roja, la taquillera y la cola con palomitas
  { const g = S.cinema; S.god = add(person({ seed: 250, top: 0x1d1d22, topType: 'coat', legs: 0x1d1d22, hairStyle: 'short', hairC: 0x2a1a10 }), 0, 0.15, 1.0, 0, { k: 'god', vip: 'god_nika0206' }, g); bowTie(S.god, 0xc8102e);
    add(person({ seed: 251, female: true, top: 0x7a1424, topType: 'long', hairStyle: 'bun' }), 1.35, 0.14, 0.12, 0, { k: 'ticket' }, g);
    S.cinq = []; for (let i = 0; i < 5; i++) { const p = add(person({ seed: 260 + i, female: i % 2 === 0, top: [0x3a6a9a, 0xe8b64a, 0x5a2a6a, 0xf2f2ee, 0x2a6a4a, 0xc84a3a][i] }), 2.25 + i * 0.62, 0.14, 1.35, -Math.PI / 2, { k: 'cinq', i }, g); S.cinq.push(p);
      if (i % 2 === 0) { const pc = popcorn(); p.userData.J.wrR.add(pc); pc.position.set(0, -0.1, 0.05); } } }
  // el restaurante chino: mesas llenas; en la del escaparate se acaban los rollitos de primavera
  { const g = S.chinese, U = g.userData, chairM = stdM(0x3a1a12, 0.6); S.rolls = rollPlate(); U.tables[1][2].add(S.rolls); S.rolls.position.set(0, 0.815, 0);
    U.tables.forEach(([x, z], ti) => { for (const s of [-1, 1]) { const ch = chairS(chairM); ch.position.set(x + s * 0.78, 0.36, z); ch.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(ch);
      const p = add(person({ seed: 300 + ti * 2 + (s > 0), female: (ti + (s > 0)) % 2 === 0 }), x + s * 0.7, 0.36, z, s < 0 ? Math.PI / 2 : -Math.PI / 2, { k: ti === 1 ? 'rollEat' : 'diner', side: s > 0 ? 'L' : 'R', s }, g); if (ti === 1) (s < 0 ? S.eatA = p : S.eatB = p); } });
    S.waiter = add(person({ seed: 320, top: 0xf2f2ee, legs: 0x1b1b1d, topType: 'long' }), -0.3, 0.36, -2.75, Math.PI * 0.15, { k: 'waiter' }, g); bowTie(S.waiter); }
  // el campo: @luquita.berna con el 7, cuatro de su equipo y cuatro del otro, el portero, el árbitro y la grada
  { const g = S.pitch, blue = { top: 0x1f5fbf, legs: 0xf2f2ee, shorts: true }, red = { top: 0xc81e2a, legs: 0x111114, shorts: true };
    S.luquita = add(person({ ...blue, seed: 400, hairStyle: 'short', hairC: 0x2a1a10 }), 4, 0, 2.5, Math.PI / 2, { k: 'luquita', vip: 'luquita.berna' }, g); shirtNumber(S.luquita, 7);
    S.players = []; for (const [x, z, team, n, i] of [[1.5, -3.5, 0, 4, 0], [-4, 4.5, 0, 9, 1], [8, 6.5, 0, 10, 2], [-9, -2, 0, 2, 3], [9.5, -1.5, 1, 3, 4], [11.5, 3.5, 1, 5, 5], [6, -5.5, 1, 8, 6], [-2, 1, 1, 6, 7]]) {
      const p = add(person({ ...(team ? red : blue), seed: 410 + i, hairStyle: ['short', 'buzz', 'pony', 'short'][i % 4], female: i === 2 || i === 6 }), x, 0, z, team ? -Math.PI / 2 : Math.PI / 2, { k: 'player', i, x, z, team }, g); shirtNumber(p, n); S.players.push(p); }
    S.keeper = add(person({ seed: 430, top: 0xf2d22a, legs: 0x111114, shorts: true, topType: 'long' }), 15.3, 0, 0.2, -Math.PI / 2, { k: 'keeper' }, g); shirtNumber(S.keeper, 1, '#111111');
    add(person({ seed: 431, top: 0x111114, legs: 0x111114, shorts: true }), 2, 0, -6.8, 0.3, { k: 'ref' }, g);
    for (let i = 0; i < 14; i++) { const row = i % 4, x = -7.5 + Math.floor(i / 4) * 4.6 + row * 0.7; add(person({ seed: 440 + i, female: i % 3 === 0, top: i % 2 ? 0x1f5fbf : 0xf2f2ee }), x, 0.4 + row * 0.4 - 0.47, -(10 + 2.4 + row * 0.85) + 0.05, 0, { k: 'fan', i }, g); } }
  // el cuartel: los soldados formados, el centinela, @marcos13_08 (coronel), @victorelcrepeer_mc que entra y @danielxd22114 (mecánico) con el camión
  const BU = S.barracks.userData; S.soldiers = [];
  for (const [x, z, r, c] of BU.rows) { const s = add(person({ ...olive, seed: 700 + r * 10 + c, female: (r * 6 + c) % 5 === 2, hairStyle: (r * 6 + c) % 5 === 2 ? 'bun' : 'buzz' }), x, 0, z, Math.PI / 2, { k: 'soldier', r, c, z }); capOn(s, 0x3d4a2a); S.soldiers.push(s); }
  S.marcos = add(person({ ...olive, seed: 690, top: 0x3a4628, hairStyle: 'short' }), -25.5, 0, 12.3, 0, { k: 'marcos', vip: 'marcos13_08' }); capOn(S.marcos, 0x2f3a22, true); medalsOn(S.marcos);
  S.victor = add(person({ seed: 695, top: 0x3a8a3a, legs: 0x2a3446, topType: 'long', hairStyle: 'short', hairC: 0x3a2412 }), -30.0, 0, 19.5, 0, { k: 'victor', vip: 'victorelcrepeer_mc' }); S.victorCap = capOn(S.victor, 0x3d4a2a);
  { const sn = add(person({ ...olive, seed: 699, hairStyle: 'buzz' }), BAR.X + 1.1, 0, 4.6, Math.PI / 2, { k: 'sentry' }); capOn(sn, 0x3d4a2a); }
  { const tr = armyTruck(); tr.position.set(-31.0, 0, 9.0); G.add(tr); const hood = box(1.2, 0.06, 1.8, stdM(0x4a5532, 0.65), 0, 0, 0); hood.position.set(-31.0 + 3.2, 2.35, 9.0); hood.rotation.z = 1.1; G.add(hood); shadowAll(tr);
    S.mech = add(person({ seed: 698, top: 0x2a4a6a, legs: 0x2a4a6a, topType: 'long', hairStyle: 'buzz' }), -26.95, 0, 9.45, -Math.PI / 2, { k: 'mech', vipW: 'danielxd22114' }); const wr = wrench(stdM(0xb8bcc2, 0.3, { metalness: 0.8 })); S.mech.userData.J.wrR.add(wr); wr.position.set(0, -0.08, 0.03); }
  S.bubble = speechBubble('¡Adelante!'); G.add(S.bubble); S.bubble.visible = false;
  // la plaza: la gente frente al ayuntamiento, para ver salir al rey al balcón (algunos con el móvil)
  S.crowd = []; const CRW = rng(612); for (let i = 0; i < 28; i++) { const row = Math.floor(i / 7), col = i % 7, x = 1.1 + col * 1.3 + (CRW() - 0.5) * 0.5 + (row % 2) * 0.6, z = -11.0 + row * 1.45 + (CRW() - 0.5) * 0.4;
    const p = add(person({ seed: 620 + i, female: CRW() < 0.5 }), x, 0, z, Math.atan2(-x, -16 - z), { k: 'crowd', i, phone: CRW() < 0.3 }); S.crowd.push(p);
    if (p.userData.role.phone) { const ph = new THREE.Group(); ph.add(box(0.075, 0.15, 0.01, stdM(0x111111, 0.3), 0, 0, 0)); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.13), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe0ff).multiplyScalar(1.4), toneMapped: false })); sc.position.z = -0.006; sc.rotation.y = Math.PI; ph.add(sc); p.userData.J.wrR.add(ph); ph.position.set(0, -0.09, 0.02); p.userData.phoneObj = ph; } }
  // paseantes por la acera norte de la calle del sur y por la calle de las tiendas
  S.walkers = []; const WR = rng(501); for (const [a, b, i] of [[[-26, 15.8], [12, 15.8], 2], [[23.7, 14], [23.7, -14], 3], [[14.6, -12], [14.6, 12], 4], [[-2, 15.9], [-24, 15.9], 5]]) { const p = add(person({ seed: 510 + i, female: WR() < 0.5 }), a[0], 0.14, a[1], 0, { k: 'line', a: _v(a[0], 0.14, a[1]), b: _v(b[0], 0.14, b[1]), v: 1.1 + WR() * 0.3, off: WR() * 30 }); S.walkers.push(p); }
  // la tienda de enfrente y el sushi también tienen gente
  { const g = S.shops.sushi, U = g.userData; add(person({ seed: 202, topType: 'chef', hat: 'band' }), -0.6, 0, -6.4, 0, { k: 'work' }, g);
    U.tables.forEach(([x, z], ti) => { if (ti > 1) return; for (const s of [-1, 1]) add(person({ seed: 220 + ti * 2 + (s > 0), female: (ti + (s > 0)) % 2 === 0 }), x + s * 0.75, 0, z, s < 0 ? Math.PI / 2 : -Math.PI / 2, { k: 'diner', side: s > 0 ? 'L' : 'R' }, g); }); }
  { const g = S.shops.pastry; add(person({ seed: 301, topType: 'chef', hat: 'chef', hairStyle: 'short' }), 0.6, 0, -5.25, 0, { k: 'work' }, g); }
  // la tarjeta del comentario
  S.cardT = signTex(1024, 384, () => {}); S.card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ map: S.cardT, transparent: true, toneMapped: false, depthWrite: false })); S.card.renderOrder = 6; G.add(S.card); S.card.visible = false;
  const r1 = rng(11); S.flow = [flowCloud(4000, () => [-30 + r1() * 60, 0.3 + r1() * 10, -14 + r1() * 42], { size: 0.9, bright: 0.22, seed: 1, nearF: 0.1, farF: 0.02, col: 0xffe2c0 })];
  envAll(scene); nightify(scene); NIGHT.on = true;
  NIGHT.zones.forja = t => 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3); NIGHT.zones.pieza = t => clamp(1.2 - (t - TL.L[5]) / 20, 0.15, 1);
  NIGHT.zones.sur = NIGHT.zones.bar = NIGHT.zones.pool = t => 1; NIGHT.zones.casco = t => 0;
}
// ---- cada fotograma: la historia
const _tg = new THREE.Vector3();
function drawCard(n, a, who, txt) { const c = S.cardT.image.getContext('2d'), w = 1024, h = 384; c.clearRect(0, 0, w, h); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,0.96)'; rr(c, 10, 10, w - 20, h - 90, 60); c.fill(); c.beginPath(); c.moveTo(150, h - 82); c.lineTo(120, h - 10); c.lineTo(230, h - 82); c.fill();
  c.fillStyle = '#d6dbe3'; c.beginPath(); c.arc(110, 140, 62, 0, 7); c.fill(); c.fillStyle = '#9aa3b0'; c.beginPath(); c.arc(110, 122, 24, 0, 7); c.fill(); c.beginPath(); c.arc(110, 186, 40, Math.PI, 0); c.fill();
  c.fillStyle = '#e8b64a'; c.font = '900 46px Inter'; c.textAlign = 'center'; c.fillText('♛', 110, 70); c.textAlign = 'left';
  c.fillStyle = '#1a1d22'; c.font = '800 54px Inter'; c.textBaseline = 'middle'; c.fillText(who, 200, 100); c.fillStyle = '#5b6370'; c.font = '600 40px Inter'; c.fillText(txt, 200, 168);
  c.fillStyle = '#e23b55'; c.save(); c.translate(w - 300, 220); c.scale(2.2, 2.2); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-14, -6, -8, -18, 0, -10); c.bezierCurveTo(8, -18, 14, -6, 0, 6); c.fill(); c.restore();
  c.fillStyle = '#e23b55'; c.font = '900 64px Inter'; c.fillText(typeof n === 'number' ? n.toLocaleString('es-ES') : n, w - 250, 226); S.cardT.needsUpdate = true; S.card.material.opacity = a; }
// la corona: primera caída (u = t) y, para el bucle, la segunda (u = t − END) desde el cojín
function crownU(t) { return t < TL.swap ? t : t - END; }
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); if (S.grassTime) S.grassTime.value = t; if (S.poolT) S.poolT.value = t;
  const H = S.hall.userData; for (const f of H.flags) flagWave(f, t); flagWave(S.barracks.userData.flag, t + 3);
  { const inK = Math.abs(st.p.x) < 13 ? clamp((-15.9 - st.p.z) / 1.4, 0, 1) : 0; moodMix({ atardecer: 1 - inK + 1e-4, salonT: inK + 1e-4 }); H.shaftM.uniforms.op.value = 0.16; H.shaftM.uniforms.col.value.setRGB(1.0, 0.7, 0.45); }
  S.barracks.userData.leaves[1].visible = true;
  hotelPower(1, t);
  // la corona y el cojín
  const u = crownU(t); crownState(u, S.rcrown); S.cushion.rotation.z = 0.32 * win(u, CRU.F - 0.05, 0.3) * (t < TL.swap || u > -2 ? 1 : 0); S.cushion.position.y = 2.25 - 0.04 * win(u, CRU.F - 0.05, 0.3);
  const crownW = S.rcrown.getWorldPosition(_v());
  // la fragua: golpes de martillo (chispas en cada golpe) y la pieza que se enfría
  const FU = S.forge.userData, strikeT = 0.62, hitPh = ((t - TL.L[4] + 4) % strikeT) / strikeT, forging = bump(t, TL.L[4] - 2.5, TL.E[4] + 1.5, 0.3, 0.3);
  FU.hot.emissiveIntensity = 3 * clamp(1.2 - (t - TL.L[5]) / 20, 0.15, 1); FU.coals.emissiveIntensity = 3.2 * (0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3));
  { const lastHit = t - ((t - TL.L[4] + 4) % strikeT); burst(FU.sparks, FU.piece.position.clone().add(_v(0, 0.05, 0)), t, lastHit, 0.7, 0.45, false, 6); FU.sparks.material.opacity = forging * clamp(1 - (t - lastHit) / 0.45, 0, 1) * (t > lastHit ? 1 : 0);
    burst(FU.embers, _v(-1.2, 1.0, 0), t, 0, 0.12, 1.6, true, -0.25); }
  // gente
  for (const p of ROLES) { const r = p.userData.role, ph = p.userData.phase; poseReset(p); breathe(p, t);
    if (r.k === 'king') { const J = p.userData.J, inT = t < TL.kingOut || t > TL.kingIn; p.userData.mask.visible = !inT;
      if (inT) { p.position.set(-0.05, HALL.FL + 0.6, -31.7); p.rotation.y = Math.PI;
        const noK = t < TL.swap ? bump(t, -1, 2.5, 0.01, 0.6) : bump(t - END, -1.65, 1, 0.3, 0.01), cond = t < TL.swap ? bump(t, TL.puso - 0.25, TL.E[3] + 0.5, 0.25, 0.4) : 0;
        if (noK > 0.01) reachTo(p, 'R', p.localToWorld(_v(0.5, 1.42 * p.userData.k, 0.28)), noK);
        if (cond > 0.01) { reachTo(p, 'L', p.localToWorld(_v(-0.2, 1.95 * p.userData.k, 0.18)), cond); }
        lookAtP(p, S.hall.localToWorld(_v(-1.6, 3.2, -34)), 0.6); faceAt(p, t, { smile: 0.3 }); }
      else { const k = seg(t, TL.sale - 0.7, TL.sale + 0.8); p.position.set(0, HALL.H + 0.5, lerp(-18.0, -15.1, k)); p.rotation.y = 0; if (k > 0 && k < 1) poseWalk(p, k * 4.2, 0.8);
        const wave = bump(t, TL.sale + 0.4, TL.L[10] + 0.2, 0.3, 0.3), up = bump(t, TL.refleja - 0.3, TL.E[10] + 0.6, 0.4, 0.5), arms = bump(t, TL.mejor - 0.2, TL.E[11] + 0.5, 0.3, 0.4), rail = (1 - wave) * win(t, TL.sale + 0.9, 0.3) * (1 - arms);
        if (wave > 0.01) poseWave(p, 'R', t, wave * 0.8);
        if (rail > 0.01) { for (const [s, n] of [[-1, 'L'], [1, 'R']]) reachTo(p, n, p.localToWorld(_v(s * 0.3, 0.92, 0.45)), rail); }
        if (arms > 0.01) { for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.z = s * 2.3 * arms; J['el' + n].rotation.z = s * 0.25 * arms; } }
        lookAtP(p, up > 0.01 ? p.localToWorld(_v(0.6, 4.5, 3)) : st.p, 0.55 + 0.25 * up); J.head.rotation.x -= 0.25 * up; faceAt(p, t, { smile: 0.5 }); } }
    else if (r.k === 'cham') { const J = p.userData.J, uu = crownU(t), shock = t < TL.swap ? bump(t, -1, 4.2, 0.01, 0.6) : bump(t - END, -1.2, 1, 0.2, 0.01);
      const L1 = S.cushion.localToWorld(_v(-0.02, 0.0, 0.2)), R1 = S.cushion.localToWorld(_v(-0.02, 0.0, -0.2)); reachTo(p, 'L', L1, 1); reachTo(p, 'R', R1, 1);
      lookAtP(p, shock > 0.2 ? crownW : S.king.getWorldPosition(_tg).add(_v(0, 1.6, 0)), 0.85); J.spine.rotation.x = 0.12 * (1 - shock);
      faceAt(p, t, { open: 0.55 * shock, brow: 0.8 * shock, smile: 0.35 - 0.6 * shock }); }
    else if (r.k === 'hguard') { faceAt(p, t, { smile: 0.1 }); lookAtP(p, crownW, 0.5 * (t < 6 || t > END - 2 ? 1 : 0)); }
    else if (r.k === 'court') { const roll = t < TL.swap ? bump(t, -1, 4.5, 0.01, 0.8) : bump(t - END, -1.2, 1, 0.3, 0.01);
      lookAtP(p, roll > 0.1 ? crownW : (t > TL.L[3] - 0.3 && t < TL.E[3] + 1 ? S.king.getWorldPosition(_tg).add(_v(0, 1.7, 0)) : p.localToWorld(_v(0, 1.6, 2))), 0.9);
      if (r.i % 3 === 0 && roll > 0.1) { reachTo(p, 'R', p.localToWorld(_v(0.12, 1.55 * p.userData.k, 0.25)), roll * 0.8); }
      faceAt(p, t, { open: 0.5 * roll, brow: 0.7 * roll, smile: 0.35 - 0.4 * roll, talk: roll < 0.1 && Math.sin(t * 0.7 + ph) > 0.5 ? 0.7 : 0 }); }
    else if (r.k === 'smith') { const J = p.userData.J, raise = 0.5 - 0.5 * Math.cos(Math.min(1, hitPh / 0.55) * Math.PI), down = hitPh > 0.55 ? Math.sin((hitPh - 0.55) / 0.45 * Math.PI / 2) : 0, a = forging * (raise - down * 1.0);
      J.shR.rotation.x = -0.6 - 1.7 * Math.max(0, a); J.elR.rotation.x = -0.5 - 0.7 * Math.max(0, a); J.spine.rotation.x = 0.18 + 0.05 * Math.max(0, a);
      if (forging < 0.02) { J.shR.rotation.x = -0.4; J.elR.rotation.x = -0.7; }
      reachTo(p, 'L', S.forge.localToWorld(_v(0.2, 0.86, 0.02)), 0.9); lookAtP(p, FU.piece.getWorldPosition(_tg), 0.8); faceAt(p, t, { brow: 0.5, smile: 0.2 }); }
    else if (r.k === 'watch') { lookAtP(p, FU.piece.getWorldPosition(_tg), 0.7); faceAt(p, t, { open: 0.15, talk: Math.sin(t * 0.8 + ph) > 0.6 ? 0.6 : 0 }); }
    else if (r.k === 'ammm') { const J = p.userData.J, beat = Math.sin(t * 7.5), up = bump(t, TL.club5 - 0.2, TL.portero, 0.25, 0.3);
      J.pelvis.position.x = beat * 0.02; J.spine.rotation.z = beat * 0.06; J.head.rotation.z = beat * 0.05; J.knL.rotation.x = Math.max(0, beat) * 0.2; J.knR.rotation.x = Math.max(0, -beat) * 0.2;
      if (up > 0.01) for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.z = s * 2.4 * up; J['el' + n].rotation.z = s * 0.4 * up; } else poseWave(p, 'R', t, 0.5);
      faceAt(p, t, { smile: 0.85, open: 0.2 }); }
    else if (r.k === 'bouncer') { const stop = bump(t, TL.nadie - 0.35, TL.E[5] + 1.0, 0.2, 0.3); poseArmsCrossed(p, 1 - stop);
      if (stop > 0.01) reachTo(p, 'R', p.localToWorld(_v(0.08, 1.45, 0.55)), stop); lookAtP(p, S.queue[0].getWorldPosition(_tg).add(_v(0, 1.6, 0)), 0.7); faceAt(p, t, { smile: 0.0, brow: 0.6 }); }
    else if (r.k === 'queue') { const J = p.userData.J, nope = r.i < 3 ? bump(t, TL.nadie, TL.E[5] + 1.2, 0.3, 0.4) : 0, step = r.i === 0 ? bump(t, TL.nadie - 0.6, TL.nadie + 0.1, 0.3, 0.2) : 0;
      p.position.x = -1.6 - r.i * 0.6 + 0.25 * step; if (r.i === 1 && nope > 0.01) { for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.z = s * 0.7 * nope; J['el' + n].rotation.x = -0.9 * nope; } }
      if (r.i === 3) reachTo(p, 'R', p.localToWorld(_v(0.1, 1.45, 0.3)), 1);
      lookAtP(p, r.i < 3 ? S.bouncer.getWorldPosition(_tg).add(_v(0, 1.7, 0)) : p.localToWorld(_v(Math.sin(t * 0.3 + ph), 1.6, 2)), 0.6); faceAt(p, t, { open: 0.3 * nope, brow: 0.7 * nope, smile: 0.4 - 0.7 * nope, talk: nope > 0.3 ? 1 : (Math.sin(t * 0.9 + ph) > 0.5 ? 0.7 : 0) }); }
    else if (r.k === 'esthe') { const J = p.userData.J, w = Math.sin(t * 3 + ph) * 0.03; reachTo(p, 'R', S.club.localToWorld(_v(1.6 + w, 3.6, 0.12)), 1); reachTo(p, 'L', S.club.localToWorld(_v(1.95, 3.0, 0.3)), 0.9);
      J.hpL.rotation.x = -0.35; J.knL.rotation.x = 0.6; lookAtP(p, S.club.localToWorld(_v(1.6, 3.6, 0.1)), 0.9); faceAt(p, t, { brow: 0.3, smile: 0.3 }); }
    else if (r.k === 'god') { const w1 = bump(t, TL.god - 0.3, TL.cine + 0.6, 0.3, 0.3), w2 = bump(t, TL.estreno - 0.3, TL.queda, 0.25, 0.3);
      if (w1 > 0.01) poseWave(p, 'R', t, w1); if (w2 > 0.01) { reachTo(p, 'L', p.localToWorld(_v(-0.35, 2.05, 0.55)), w2); }
      lookAtP(p, st.p, 0.6); faceAt(p, t, { smile: 0.8, talk: bump(t, TL.L[6], TL.chino, 0.1, 0.1) * 0.6 }); }
    else if (r.k === 'ticket') { faceAt(p, t, { smile: 0.6, talk: Math.sin(t * 0.9 + ph) > 0.3 ? 0.8 : 0 }); lookAtP(p, S.cinq[0].getWorldPosition(_tg).add(_v(0, 1.6, 0)), 0.6); }
    else if (r.k === 'cinq') { lookAtP(p, r.i % 2 ? S.god.getWorldPosition(_tg).add(_v(0, 1.7, 0)) : p.localToWorld(_v(0.3, 1.6, 2)), 0.5); faceAt(p, t, { smile: 0.55, talk: Math.sin(t * 0.8 + ph) > 0.4 ? 0.8 : 0 }); }
    else if (r.k === 'rollEat') { poseSit(p, 0.1); const ts = rollTimes(), mine = r.s < 0 ? [1, 3] : [0, 2, 4]; let e = 0;
      for (const i of mine) e = Math.max(e, bump(t, ts[i] - 0.45, ts[i] + 0.5, 0.2, 0.25)); const toMouth = mine.some(i => t > ts[i] && t < ts[i] + 0.7);
      if (e > 0.01 && !toMouth) reachTo(p, r.s < 0 ? 'R' : 'L', S.rolls.getWorldPosition(_tg).add(_v(0, 0.05, 0)), e); else if (e > 0.01) poseEat(p, r.s < 0 ? 'R' : 'L', e);
      lookAtP(p, S.rolls.getWorldPosition(_tg), 0.6); faceAt(p, t, { smile: 0.6, talk: toMouth ? 0.5 : 0, open: toMouth ? 0.3 : undefined }); }
    else if (r.k === 'waiter') { reachTo(p, 'L', p.localToWorld(_v(-0.2, 1.25, 0.35)), 1); faceAt(p, t, { smile: 0.6 }); }
    else if (r.k === 'luquita') { const J = p.userData.J, shotT = TL.futbol + 0.32, k = seg(t, TL.luquita - 0.6, shotT - 0.05), celebr = win(t, TL.siete - 0.25, 0.35), dir0 = Math.atan2(10.2, -2.4);
      if (t < shotT) { p.position.set(lerp(2.0, 12.2, k), 0, lerp(3.2, 0.8, k)); p.rotation.y = dir0; if (k > 0 && k < 1) poseWalk(p, t * 3.2, 1.25); }
      else { const kc = seg(t, TL.siete - 0.3, TL.E[7] + 1.4), turn = win(t, TL.siete - 0.45, 0.35); p.position.set(lerp(12.2, 8.4, kc), 0, lerp(0.8, -2.2, kc)); p.rotation.y = lerp(dir0, Math.atan2(-3.8, -3.0), turn); if (kc > 0 && kc < 1) poseWalk(p, t * 3.0, 1.0); }
      const kick = bump(t, shotT - 0.2, shotT + 0.35, 0.12, 0.2); if (kick > 0.01) { J.hpR.rotation.x = -1.1 * kick; J.knR.rotation.x = 0.3 * kick; J.shL.rotation.z = -0.6 * kick; }
      if (celebr > 0.01) for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.z = s * 2.5 * celebr; J['el' + n].rotation.z = s * 0.3 * celebr; }
      faceAt(p, t, { smile: 0.5 + 0.4 * celebr, open: 0.5 * celebr }); }
    else if (r.k === 'player') { const a = t * 0.6 + r.i * 1.7, dx = Math.sin(a) * 1.2, dz = Math.cos(a * 0.8) * 0.9, follow = r.team ? clamp((t - TL.luquita) / 3, 0, 1) * 2.5 : 0;
      p.position.set(r.x + dx + follow, 0, r.z + dz); p.rotation.y = Math.atan2(Math.cos(a) * 1.2 + 0.5, -Math.sin(a * 0.8) * 0.72); poseWalk(p, t * 2.2 + ph, 0.9);
      const cheer = r.team ? 0 : win(t, TL.futbol + 0.8, 0.4); if (cheer > 0.01) for (const [n, s] of [['L', -1], ['R', 1]]) p.userData.J['sh' + n].rotation.z = s * 2.4 * cheer;
      lookAtP(p, S.pitch.userData.ball.getWorldPosition(_tg), 0.6); faceAt(p, t, { smile: r.team ? 0.2 : 0.5 + 0.4 * cheer }); }
    else if (r.k === 'keeper') { const J = p.userData.J, dive = bump(t, TL.futbol + 0.36, TL.futbol + 1.9, 0.25, 0.4), side = 1; p.position.set(15.3, 0.6 * Math.sin(Math.min(1, dive) * Math.PI) * 0.5, 0.2 + side * 1.2 * dive);
      J.spine.rotation.z = -side * 1.1 * dive; for (const [n, s] of [['L', -1], ['R', 1]]) J['sh' + n].rotation.z = s * 2.0 * Math.max(dive, 0.25); lookAtP(p, S.pitch.userData.ball.getWorldPosition(_tg), 0.7); faceAt(p, t, { open: 0.4 * dive, brow: 0.6 }); }
    else if (r.k === 'ref') { p.position.x = 2 + Math.sin(t * 0.4) * 2; poseWalk(p, t * 1.6, 0.6); faceAt(p, t, {}); }
    else if (r.k === 'fan') { poseSit(p, 0.05); const goal = bump(t, TL.futbol + 0.8, TL.E[7] + 2.5, 0.25, 0.5); if (goal > 0.01 && r.i % 2 === 0) for (const [n, s] of [['L', -1], ['R', 1]]) p.userData.J['sh' + n].rotation.z = s * 2.5 * goal;
      faceAt(p, t, { smile: 0.4 + 0.5 * goal, open: 0.5 * goal * (r.i % 2 ? 0 : 1) }); }
    else if (r.k === 'soldier') { const sal = r.r === 0 ? bump(t, TL.adelante + 0.1, TL.E[8] + 1.8, 0.3, 0.4) * (r.c % 2 ? 1 : 0.0) : 0;
      if (sal > 0.01) reachTo(p, 'R', p.localToWorld(_v(0.09, 1.66 * p.userData.k, 0.12)), sal, _v(1, 0, 0.2)); faceAt(p, t, { smile: 0.05 }); lookAtP(p, S.victor.getWorldPosition(_tg).add(_v(0, 1.6, 0)), 0.25); }
    else if (r.k === 'marcos') { const J = p.userData.J, go = bump(t, TL.adelante - 0.3, TL.E[8] + 1.5, 0.25, 0.4);
      if (go > 0.01) { reachTo(p, 'R', p.localToWorld(_v(-0.45, 1.3, 0.55)), go); } else { J.shL.rotation.x = -0.15; J.elL.rotation.x = -1.4; J.shL.rotation.z = -0.25; }
      lookAtP(p, S.victor.getWorldPosition(_tg).add(_v(0, 1.65, 0)), 0.9); faceAt(p, t, { smile: 0.3 + 0.4 * go, talk: bump(t, TL.adelante - 0.1, TL.E[8] + 0.2, 0.05, 0.1) }); }
    else if (r.k === 'victor') { const k1 = seg(t, TL.victor - 0.6, TL.soldado + 0.4), k2 = seg(t, TL.adelante + 0.25, TL.adelante + 1.5);
      if (t < TL.adelante) { p.position.set(lerp(-30.0, -25.5, k1), 0, lerp(19.5, 15.5, k1)); p.rotation.y = Math.atan2(4.5, -4.0); if (k1 > 0 && k1 < 1) poseWalk(p, t * 2.4, 0.9); }
      else { p.position.set(-25.5, 0, lerp(15.5, 13.55, k2)); p.rotation.y = lerp(Math.atan2(4.5, -4.0), Math.PI, Math.min(1, k2 * 4 + win(t, TL.adelante - 0.6, 0.4))); if (k2 > 0 && k2 < 1) poseWalk(p, t * 2.4, 0.9); }
      if (t > TL.soldado + 0.4 && t < TL.adelante) p.rotation.y = lerp(Math.atan2(4.5, -4.0), Math.PI, win(t, TL.soldado + 0.4, 0.5));
      const capK = win(t, TL.adelante + 0.9, 0.35); S.victorCap.visible = capK > 0.02; S.victorCap.scale.setScalar(Math.max(0.01, pop(t, TL.adelante + 0.9, 0.4)));
      const salute = bump(t, TL.adelante + 1.5, TL.L[9] + 1.0, 0.3, 0.3); if (salute > 0.01) reachTo(p, 'R', p.localToWorld(_v(0.09, 1.66 * p.userData.k, 0.12)), salute, _v(1, 0, 0.2));
      lookAtP(p, S.marcos.getWorldPosition(_tg).add(_v(0, 1.65, 0)), t > TL.soldado ? 0.8 : 0.3); faceAt(p, t, { smile: 0.45 + 0.4 * win(t, TL.adelante, 0.3), open: 0.25 * bump(t, TL.adelante, TL.adelante + 1, 0.1, 0.3) }); }
    else if (r.k === 'sentry') { faceAt(p, t, { smile: 0.05 }); }
    else if (r.k === 'mech') { const J = p.userData.J; J.spine.rotation.x = 0.55; J.head.rotation.x = 0.3; reachTo(p, 'R', _v(-27.65 + Math.sin(t * 5) * 0.04, 1.3, 9.25), 1); reachTo(p, 'L', _v(-27.65, 1.25, 9.7), 0.9); faceAt(p, t, { brow: 0.4 }); }
    else if (r.k === 'crowd') { const J = p.userData.J, kingP = S.king.getWorldPosition(_tg).add(_v(0, 1.7, 0)), watch = t > TL.kingOut && t < TL.kingIn ? win(t, TL.L[9] - 0.5, 0.6) : 0, wow = bump(t, TL.sale + 0.2, TL.E[10] + 0.8, 0.3, 0.5), cheer = bump(t, TL.mejor - 0.1, TL.manda + 0.6, 0.3, 0.5);
      lookAtP(p, watch > 0.5 ? kingP : p.localToWorld(_v(Math.sin(t * 0.3 + ph) * 1.5, 1.6, 2)), watch > 0.5 ? 0.9 : 0.5);
      if (r.phone && watch > 0.01) { reachTo(p, 'R', p.localToWorld(_v(0.08, 1.6, 0.36)), watch); if (p.userData.phoneObj) p.userData.phoneObj.rotation.set(-1.2, 0, 0); }
      else if (cheer > 0.01 && r.i % 2 === 0) for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.z = s * 2.3 * cheer; J['el' + n].rotation.z = s * 0.3 * cheer; }
      else if (cheer > 0.01) { const c = Math.abs(Math.sin(t * 9 + ph)); for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.x = -1.0 * cheer; J['sh' + n].rotation.z = s * (0.15 + 0.25 * c) * cheer; J['el' + n].rotation.x = -0.9 * cheer; J['el' + n].rotation.y = -s * 0.6 * cheer; } }
      faceAt(p, t, { open: 0.45 * wow, brow: 0.6 * wow, smile: 0.4 + 0.4 * cheer, talk: watch < 0.5 && Math.sin(t * 0.7 + ph) > 0.6 ? 0.6 : 0 }); }
    else if (r.k === 'line') { const L = r.a.distanceTo(r.b), s = (t * r.v + r.off) % L; p.position.copy(r.a).lerp(r.b, s / L); p.rotation.y = Math.atan2(r.b.x - r.a.x, r.b.z - r.a.z); poseWalk(p, t * r.v, 1); faceAt(p, t, {}); }
    else if (r.k === 'diner') { poseSit(p, 0.12); const e = Math.max(0, Math.sin(t * 1.3 + ph)); poseEat(p, r.side, e); faceAt(p, t, { talk: e < 0.2 ? 1 : 0 }); }
    else if (r.k === 'work') { poseWork(p, t, 1); faceAt(p, t, { smile: 0.55 }); }
    else faceAt(p, t, { talk: Math.sin(t * 0.8 + ph) > 0.5 ? 0.8 : 0 }); }
  // los rollitos: se acaban uno a uno; el último con «rollito»
  { const ts = rollTimes(); S.rolls.userData.rolls.forEach((r, i) => { r.visible = t < ts[i]; }); }
  // el club: «COMPLETO» se enciende cuando el portero para a la cola
  S.club.userData.full.emissiveIntensity = 0.05 + 2.2 * win(t, TL.nadie - 0.1, 0.15) * (0.85 + 0.15 * Math.sin(t * 20));
  // el cine: las bombillas de la marquesina se encienden en ola
  S.cinema.userData.bulbM.emissiveIntensity = 3.5 + 1.8 * Math.max(0, Math.sin(t * 6));
  // el balón: pies de @luquita.berna → tiro → red; la red se hincha
  { const B = S.pitch.userData.ball, L = S.luquita, s0 = TL.futbol + 0.32, s1 = TL.futbol + 0.77;
    if (t < s0) { const f = L.localToWorld(_v(0, 0.11, 0.42 + 0.1 * Math.abs(Math.sin(t * 6.4)))); B.position.copy(S.pitch.worldToLocal(f)); B.position.y = 0.11; B.rotation.x = t * 9; }
    else if (t < s1) { const k = (t - s0) / (s1 - s0), a = _v(12.6, 0.11, 0.7), b = _v(16.55, 1.15, -0.95); B.position.copy(a).lerp(b, k); B.position.y = lerp(0.11, 1.15, k) + 0.5 * Math.sin(k * Math.PI); B.rotation.x = t * 20; }
    else { const k = clamp((t - s1) / 0.6, 0, 1); B.position.set(16.55 + 0.45 * k, Math.max(0.11, 1.15 - 1.04 * k * k), -0.95 - 0.1 * k); }
    const net = S.pitch.userData.goals[1].userData.net, puff = bump(t, s1 - 0.02, s1 + 0.5, 0.05, 0.4); net.scale.set(1 + 0.25 * puff, 1, 1); net.position.x = 0.62 + 0.15 * puff; }
  // «¡Adelante!»
  { const a = bump(t, TL.adelante - 0.15, TL.E[8] + 1.3, 0.12, 0.3); S.bubble.visible = a > 0.01; if (S.bubble.visible) { S.bubble.position.copy(S.marcos.getWorldPosition(_tg)).add(_v(0.9, 2.45, 0.2)); S.bubble.scale.setScalar(Math.max(0.01, pop(t, TL.adelante - 0.15, 0.35))); S.bubble.material.opacity = a; S.bubble.lookAt(st.p); } }
  // tarjetas: «@yugo_gb» con sus 18 me gusta (sobre el rey, en el salón) y, al final, la del próximo rey sobre la gente (número que sube)
  { const a1 = bump(t, TL.coment3 - 0.25, TL.E[3] + 0.3, 0.3, 0.35), a2 = bump(t, TL.coment11 - 0.25, TL.manda + 0.2, 0.3, 0.35);
    S.card.visible = a1 > 0.01 || a2 > 0.01; if (a1 > 0.01) { drawCard(18, a1, '@yugo_gb', 'El comentario con más «me gusta»'); S.card.position.set(0.15, 3.95, -31.0); }
    else if (a2 > 0.01) { drawCard(Math.round(lerp(0, 999, sm5(seg(t, TL.coment11, TL.rey11)))), a2, 'Tu comentario', '«Quiero ser rey…»'); S.card.position.set(3.6, 4.3, -6.6); } if (S.card.visible) S.card.lookAt(st.p); }
  // coches que pasan por la calle de las tiendas
  for (const C of CARS) if (!C.park) { const s = ((t * C.v + C.off) % 90) - 45; C.c.position.set(C.lane, 0, C.dir * s); C.c.rotation.y = C.dir > 0 ? Math.PI / 2 : -Math.PI / 2; carRoll(C.c, t * C.v); }
}
// cuándo desaparece cada rollito (los tres primeros, antes de que llegue la cámara)
function rollTimes() { return [TL.cine, TL.chino, TL.estreno, TL.queda + 0.1, TL.rollito + 0.12]; }
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
