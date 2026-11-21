// ---------------------------------------------------------------- LA ESCENA del día 4 (de noche): la estatua de Kiria tapada en la plaza con el rey y la gente,
// el cuartel de @marcos13_08 (oeste), la ferretería de @iz.her_019 y el apagón (sur), el hotel de @jossl53g con piscina y bar en la azotea (sureste)
// y los drones con «6.438». Los tiempos salen de la voz (tiempos.json).
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
    estatua: W_('estatua', 1), oro: W_('oro', 1), rey1: W_('rey', 1), para: W_('para', 1), final: W_('final', 2), quien: W_('quien', 2),
    ian: W_('iannyanezz', 3), coment: W_('comentario', 3), gusta: W_('gusta', 3), sigue: W_('sigue', 3), premio: W_('premio', 3),
    mientras: W_('mientras', 4), duerme: W_('duerme', 4),
    marcos: W_('marcos', 5), cuartel: W_('cuartel', 5), militar: W_('militar', 5), medianoche: W_('medianoche', 5), revista: W_('revista', 5),
    ferre: W_('ferreteria', 6), electricista: W_('electricista', 6), noche: W_('noche', 6), trabajo: W_('trabajo', 6), luz: W_('luz', 6), calle: W_('calle', 6),
    hotel: W_('hotel', 7), piscina: W_('piscina', 7), azotea: W_('azotea', 7), bar: W_('bar', 7), copas: W_('copas', 7), nadie: W_('nadie', 7),
    somos: W_('somos', 8), seis: W_('seis', 8), visto: W_('visto', 8),
    plaza: W_('plaza', 9), rey9: W_('rey', 9), tira: W_('tira', 9), tela: W_('tela', 9),
    kiria: W_('kiria', 10), nombre: W_('nombre', 10), orden: W_('orden', 10),
    justo: W_('justo', 11), coment11: W_('comentario', 11), nuevo: W_('nuevo', 11), rey11: W_('rey', 11),
    manda: W_('mandaselo', 12), estatua12: W_('estatua', 12) };
  TL.fix = TL.E[6] + 0.3; TL.pull = TL.tira + 0.05; TL.veil1 = TL.L[10] + 0.15;      // el electricista arregla la luz; el tirón y la tela en el suelo
  townMats(); const G = new THREE.Group(); scene.add(G); S.G = G;
  buildGround(G); buildHall(G); S.shops = buildShops(G);
  const walls = [[[214, 196, 168], 51], [[198, 214, 226], 52], [[226, 204, 176], 53], [[232, 220, 196], 54], [[205, 190, 210], 55]].map(([c, s]) => { const [a, b] = stuccoCanvases(c, s); return texMat(a, b, [3, 3], { r: 0.85, ns: 0.4 }); });
  const [bc, bh] = brickCanvases([140, 84, 60], 9), brickC = texMat(bc, bh, [2, 1.6], { r: 0.85, ns: 1.2 });
  // lado sur de la calle del sur: fachadas, la ferretería y un edificio estrecho hasta la calle de las tiendas (zona del apagón)
  for (const [x, w, fl, m, sd] of [[-24.2, 8, 3, walls[0], 70], [-16.0, 8, 2, brickC, 71], [-7.8, 8, 3, walls[2], 72], [0.0, 7, 2, walls[4], 73], [13.55, 3.9, 3, brickC, 74]]) {
    const b = genericFront(w, fl, m, sd); b.position.set(x, 0, 23.5); b.rotation.y = Math.PI; G.add(b); lightWindows(b, 0.5, 320 + sd, 'sur'); }
  buildHardware(G); buildHotel(G);
  // calle de las tiendas: fachadas del norte y la esquina; el cuartel en el lado oeste de la plaza
  { const b = genericFront(8, 3, walls[3], 80); b.position.set(SHOP.X, 0, -16.5); b.rotation.y = -Math.PI / 2; G.add(b); lightWindows(b, 0.5, 380); const c = genericFront(3.5, 2, brickC, 81); c.position.set(SHOP.X, 0, 13.25); c.rotation.y = -Math.PI / 2; G.add(c); lightWindows(c, 0.5, 381);
    for (let i = 0; i < 3; i++) { const d = genericFront(8, 2 + i % 2, walls[(i + 1) % 5], 82 + i); d.position.set(SHOP.X, 0, -24.6 - i * 8.1); d.rotation.y = -Math.PI / 2; G.add(d); lightWindows(d, 0.5, 383 + i); } }
  buildBarracks(G, walls[1]);
  for (const k of ['sushi', 'pastry', 'vet']) { const U = S.shops[k].userData; nightSrc(U.local(0, 3.0, -2.2), 0xffe2b8, 30, 4.2); nightSrc(U.local(0, 1.0, 1.0), 0xffd9a8, 10, 2.6); lightWindows(S.shops[k], 0.5, 340 + k.length); }
  lightWindows(S.hall, 0.85, 360);
  // plaza: pedestal con la estatua de Kiria tapada, focos, bancos, farolas, árboles, setos y césped
  S.ped = pedestal(); G.add(S.ped); const PT = S.ped.userData.top;
  S.kiria = kiriaStatue(); S.kiria.position.set(0, PT, 0); G.add(S.kiria); S.kiria.userData.gold.userData.envMapFixed = 'dia';
  // la placa de delante: «?» hasta que se destapa; después «KIRIA · por orden del rey @iannyanezz_»
  { const pl = S.ped.userData.plates[0]; S.plateQ = pl.material; S.plateK = pl.material.clone(); S.plateK.map = signTex(512, 276, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f2cf6c'); gr.addColorStop(1, '#b4862c'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#6e4c12'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = '#3d2806'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 92px Inter'; c.fillText('KIRIA', w / 2, h * 0.38); c.font = '700 30px Inter'; c.fillText('POR ORDEN DEL REY', w / 2, h * 0.66); c.fillText('@iannyanezz_', w / 2, h * 0.8); }); S.plateK.emissiveMap = S.plateK.map; S.plateK.emissive = new THREE.Color(0xffffff); S.plateK.emissiveIntensity = 0.55; }
  S.pullDir = _v(1, 0, 0.42).normalize(); S.veil = veilCloth(S.kiria, S.pullDir); S.kiria.add(S.veil); veilAt(S.veil, 0, -PT);
  S.rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(_v(0, 0, 0), _v(0, 1, 0)), 20, 0.018, 6), new THREE.MeshStandardMaterial({ color: 0xffcf6a, roughness: 0.35, metalness: 1 })); G.add(S.rope);
  // focos al pie del pedestal (luces de verdad: la estatua de oro tiene que brillar) y sus lentes
  S.spots = []; for (const a of [0.35, 2.45, 4.5]) { const sp = new THREE.SpotLight(0xffe6c0, 0, 14, 0.42, 0.55, 1.4); sp.position.set(Math.sin(a) * 2.35, 0.35, Math.cos(a) * 2.35); sp.target.position.set(0, PT + 1.9, 0); G.add(sp, sp.target); S.spots.push(sp);
    const fx = new THREE.Group(); fx.position.copy(sp.position); G.add(fx); fx.lookAt(sp.target.position); fx.add(box(0.28, 0.28, 0.34, stdM(0x1d1f22, 0.4), 0, 0, 0)); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d8).multiplyScalar(3), toneMapped: false })); lens.position.z = 0.175; fx.add(lens); }
  for (const a of [1.55, 2.6, 3.64, 4.69]) { const b = bench(); b.position.set(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2); b.rotation.y = a + Math.PI; G.add(b); }
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [14.6, -6], [14.6, 6], [23.0, -12.6], [23.0, 3.6], [23.0, 14.7]]) nightLamp(G, x, z, x > 14 ? (x > 20 ? Math.PI : 0) : Math.atan2(-x, -z) - Math.PI / 2);
  for (const x of [-20, -9, 2, 12.6, 27, 36]) nightLamp(G, x, 22.95, Math.PI / 2, 'sur');                      // calle del sur (se apagan)
  for (const x of [-14, -3, 8]) nightLamp(G, x, 15.75, -Math.PI / 2, 'sur');
  const R = rng(91); for (const [x, z, h] of [[12.8, -11, 6.5], [12.8, -3.5, 6], [12.8, 4, 6.8], [12.8, 11.5, 6.2], [-14, -10.5, 7], [-13, 9.5, 7.2], [-6.5, 10, 5.5], [6.5, 10, 5.8]]) { const t = tree(Math.floor(R() * 1000), h); t.position.set(x, 0.05, z); t.rotation.y = R() * 6; G.add(t); }
  for (const [x, z, w, d] of [[-6.5, 12.3, 3.6, 0.6], [6.5, 12.3, 3.6, 0.6], [-6.5, 7.7, 3.6, 0.6], [6.5, 7.7, 3.6, 0.6]]) { const hd = hedge(w, d, 0.7); hd.position.set(x, 0.4, z); G.add(hd); }
  S.grass = grassField(G, T.lawns, 70000, 5);
  // coches: aparcados (luces apagadas), los que pasan con los faros encendidos y un taxi en la puerta del hotel
  const paints = [0xb0141e, 0xf2f2ee, 0x1c2430, 0x8e9aa6, 0x1f4f8f, 0x2f6b3a, 0xc9a227, 0x6a1a2a];
  [[-20, 1], [-14.6, -1], [-8.8, 1], [-2.4, 1], [3.6, -1], [9.6, 1]].forEach(([z, d], i) => { const c = car(['sedan', 'hatch', 'suv'][i % 3], paints[i % paints.length], i + 1); c.position.set(16.65, 0.0, z); c.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; G.add(c); CARS.push({ c, park: true }); });
  CARM.head.emissiveIntensity = 0.15; CARM.tail.emissiveIntensity = 0.3;                                         // aparcados: luces apagadas
  const lightsOn = c => { const hm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 4.5, roughness: 0.1 }), tm = new THREE.MeshStandardMaterial({ color: 0x8a0a10, emissive: 0xff2020, emissiveIntensity: 2.2, roughness: 0.2 });
    c.traverse(o => { if (o.isMesh && o.material === CARM.head) o.material = hm; else if (o.isMesh && o.material === CARM.tail) o.material = tm; }); c.updateMatrixWorld(true);
    const box3 = new THREE.Box3().setFromObject(c), L = box3.max.x - box3.min.x; for (const s of [-1, 1]) { const gl = glowSprite(0xfff2d8, 1.1, 0.85); gl.position.set(-L / 2 + 0.05, 0.75, s * 0.62); c.add(gl); const cone = lightCone(0.9, 6, 0.035, 0xfff0d6); cone.position.set(-L / 2 - 0.05, 0.75, s * 0.6); cone.rotation.z = -Math.PI / 2 - 0.12; c.add(cone); } };
  for (let i = 0; i < 3; i++) { const c = car(['hatch', 'sedan', 'suv'][i], paints[(i + 4) % paints.length], 20 + i); G.add(c); lightsOn(c); CARS.push({ c, lane: i % 2 ? 21.2 : 18.8, dir: i % 2 ? -1 : 1, off: i * 31, v: 6 + i }); }
  for (let i = 0; i < 2; i++) { const c = car(['sedan', 'suv'][i], paints[(i + 1) % paints.length], 30 + i); G.add(c); lightsOn(c); CARS.push({ c, ew: true, lane: i ? 17.8 : 20.2, dir: i ? -1 : 1, off: 17 + i * 40, v: 5.5 + i }); }
  { const taxi = car('sedan', 0xf2f2ee, 41); taxi.position.set(29.5, 0, 20.9); taxi.rotation.y = 0; G.add(taxi); lightsOn(taxi); ad(taxi, box(0.5, 0.18, 0.25, nightMat(new THREE.MeshStandardMaterial({ color: 0x103010, emissive: 0x30ff60, emissiveIntensity: 2, roughness: 0.3 })), 0.2, 1.62, 0)); CARS.push({ c: taxi, park: true }); }
  // ---- la gente (más que el día 3: soldados, ferretería, hotel y la plaza llena para ver la estatua)
  const add = (p, x, y, z, ry, role, par = G) => { p.position.set(x, y, z); p.rotation.y = ry; par.add(p); PEOPLE.push(p); p.userData.role = role; ROLES.push(p); return p; };
  const olive = { topType: 'long', top: 0x4a5532, legs: 0x3d4729, shoes: 0x141414 };
  // plaza: el rey junto al pedestal con la cuerda de la tela, dos guardias y la gente en semicírculo (algunos con el móvil en alto)
  S.king = add(person({ topType: 'king', seed: 101, top: 0xf2e6c8, legs: 0x5a1020, hairStyle: 'short', hairC: 0x2e2018, skin: 0xe8c1a4, eye: 0x4d2f17 }), 2.85, 0, 2.15, -Math.PI * 0.62, { k: 'king', vip: 'king' });
  for (const [x, z] of [[-2.2, -1.0], [-1.0, -2.3]]) { const gd = add(person({ seed: 110 + x * 3, topType: 'long', top: 0x2b3a6b, legs: 0x1c1c22 }), x, 0, z, Math.atan2(x, z), { k: 'guard' }); capOn(gd, 0x2b3a6b, false); }
  S.crowd = []; const CR = rng(612); for (let i = 0; i < 24; i++) { const row = i % 2, a = -1.05 + (Math.floor(i / 2) / 11) * 2.1 + (CR() - 0.5) * 0.08, r = 5.0 + row * 1.15 + (CR() - 0.5) * 0.3, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (x > 1.2 && z < 3.6) continue; const p = add(person({ seed: 620 + i, female: CR() < 0.5 }), x, 0, z, Math.atan2(-x, -z), { k: 'crowd', i, phone: CR() < 0.3 }); S.crowd.push(p);
    if (p.userData.role.phone) { const ph = new THREE.Group(); ph.add(box(0.075, 0.15, 0.01, stdM(0x111111, 0.3), 0, 0, 0)); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.13), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe0ff).multiplyScalar(1.6), toneMapped: false })); sc.position.z = -0.006; sc.rotation.y = Math.PI; ph.add(sc); p.userData.J.wrR.add(ph); ph.position.set(0, -0.09, 0.02); p.userData.phoneObj = ph; } }
  // paseantes por las aceras de la calle del sur y de la calle de las tiendas (van y vienen en línea recta)
  S.walkers = []; const WR = rng(501); for (const [a, b, i] of [[[-26, 22.75], [12, 22.75], 0], [[12, 22.85], [-26, 22.85], 1], [[-24, 15.8], [12, 15.8], 2], [[23.7, 14], [23.7, -14], 3], [[14.6, -12], [14.6, 12], 4], [[-2, 15.9], [-24, 15.9], 5]]) { const p = add(person({ seed: 510 + i, female: WR() < 0.5 }), a[0], 0.14, a[1], 0, { k: 'line', a: _v(a[0], 0.14, a[1]), b: _v(b[0], 0.14, b[1]), v: 1.1 + WR() * 0.3, off: WR() * 30 }); S.walkers.push(p); }
  for (const a of [2.6, 3.64]) add(person({ seed: 540 + Math.round(a * 10), female: a > 3 }), Math.sin(a) * 6.45, 0, Math.cos(a) * 6.45, a + Math.PI, { k: 'sit' });
  // el cuartel: dieciocho soldados en tres filas mirando al portón; @marcos13_08 pasa revista; un centinela en la garita
  const BU = S.barracks.userData; S.soldiers = [];
  for (const [x, z, r, c] of BU.rows) { const s = add(person({ ...olive, seed: 700 + r * 10 + c, female: (r * 6 + c) % 5 === 2, hairStyle: (r * 6 + c) % 5 === 2 ? 'bun' : 'buzz' }), x, 0, z, Math.PI / 2, { k: 'soldier', r, c, z }); capOn(s, 0x3d4a2a); S.soldiers.push(s); }
  S.marcos = add(person({ ...olive, seed: 690, top: 0x3a4628, hairStyle: 'short' }), -20.6, 0, -3.8, 0, { k: 'marcos', vip: 'marcos13_08' }); capOn(S.marcos, 0x2f3a22, true); medalsOn(S.marcos);
  { const sn = add(person({ ...olive, seed: 699, hairStyle: 'buzz' }), BAR.X + 1.1, 0, 4.6, Math.PI / 2, { k: 'sentry' }); capOn(sn, 0x3d4a2a); }
  // la ferretería: @iz.her_019 tras el mostrador, dos clientes; el electricista en el armario de la luz (casco con linterna y chaleco)
  { const g = S.hardware, U = g.userData; S.izher = add(person({ female: true, seed: 801, topType: 'apron', apron: 0xff7a1a, top: 0x1d2a44, hairStyle: 'pony', hairC: 0x2a1a12 }), 1.2, 0, -4.85, 0, { k: 'izher', vip: 'iz.her_019' }, g);
    add(person({ seed: 802 }), 0.4, 0, -3.3, Math.PI, { k: 'client' }, g); add(person({ seed: 803, female: true }), -1.6, 0, -2.4, Math.PI * 0.8, { k: 'client' }, g);
    S.elec = add(person({ seed: 805, top: 0x2a3a5a, legs: 0x2a3446, topType: 'long' }), FER.X + 4.6, 0.14, 22.35, 0, { k: 'elec' }); S.helmet = hardHat(S.elec, 0xf2c418, true); vestOn(S.elec);
    S.helmBeam = lightCone(0.55, 3.2, 0.06, 0xfff2d8); G.add(S.helmBeam); S.helmSrc = nightSrc(_v(12.2, 1.9, 22.5), 0xfff4e0, 16, 1.8, 'casco'); }
  // el hotel: portero en la puerta, gente en los balcones, y en la azotea bañistas, tumbonas, el camarero, la barra y @jossl53g
  { const HU = S.hotel.userData, PY = HU.PY, cx = (HOT.X0 + HOT.X1) / 2;
    const dm = add(person({ seed: 901, topType: 'coat', top: 0x5a1020, legs: 0x1c1c22 }), cx + 2.9, 0.14, HOT.Z0 - 1.0, Math.PI, { k: 'doorman' }); capOn(dm, 0x5a1020, true);
    for (const [f, bx, ry, fem] of [[1, -3.3, Math.PI, true], [3, 3.3, Math.PI * 0.9, false], [5, 0, Math.PI * 1.1, true], [6, -3.3, Math.PI, false]]) add(person({ seed: 910 + f, female: fem }), cx + bx, HOT.G0 + f * HOT.FH + 0.16, HOT.Z0 - 0.7, ry, { k: 'balcony', f });
    const P = HU.pool; for (const [dx, dz, i] of [[-1.6, 0.4, 0], [1.4, -0.5, 1]]) { const p = add(person({ seed: 930 + i, female: i === 0, top: 0x000000, legs: 0x1f5fbf, shorts: true }), P.x + dx, PY - 0.55, P.z + dz, i ? -2.3 : 0.6, { k: 'swim', i, x: P.x + dx, z: P.z + dz }); const skinM = p.userData.J.neck.children.find(o => o.isMesh).material; p.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0x000000) o.material = skinM; }); }
    for (const [dx, i] of [[-2.4, 0], [0.6, 1]]) add(person({ seed: 940 + i, female: i === 1, shorts: true }), P.x + dx, PY + 0.18, P.z - P.d / 2 - 0.3, 0, { k: 'poolEdge', i });
    for (const [i, x] of [[0, P.x - 1.0], [1, P.x + 2.2]]) add(person({ seed: 950 + i, female: i === 0, shorts: true }), x, PY + 0.1, P.z - P.d / 2 - 1.85, Math.PI, { k: 'lounge', i });
    const B = HU.bar; S.bartender = add(person({ seed: 960, top: 0xf2f2ee, legs: 0x1b1b1d, topType: 'long' }), HOT.X0 + 0.75, PY, B.z - 0.3, Math.PI / 2, { k: 'bartender' }); bowTie(S.bartender);
    S.shaker = new THREE.Group(); S.shaker.add(cyl(0.035, 0.03, 0.16, new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 1, roughness: 0.15 }), 12)); S.bartender.userData.J.wrR.add(S.shaker); S.shaker.position.set(0, -0.1, 0.03);
    S.jossl = add(person({ seed: 970, top: 0x16161a, legs: 0x16161a, topType: 'long', hairStyle: 'short' }), B.x + 0.95, PY, B.z + 0.45, Math.PI / 2 + 0.15, { k: 'jossl', vip: 'jossl53g' });
    S.patrons = []; for (const [dx, dz, ry, i] of [[0.95, -1.2, Math.PI / 2 - 0.2, 0], [1.0, -0.45, Math.PI / 2, 1], [1.8, 1.2, Math.PI / 2 + 0.6, 2], [1.95, -0.25, Math.PI / 2 + 0.35, 3], [1.0, 1.35, Math.PI / 2 + 0.2, 4]]) { const p = add(person({ seed: 980 + i, female: i % 2 === 0 }), B.x + dx, PY, B.z + dz, ry, { k: 'patron', i }); S.patrons.push(p); }
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.05 }), drinkM = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.2, transparent: true, opacity: 0.85 });
    for (const [p, c] of [[S.jossl, 0xff9a3a], ...S.patrons.map((q, i) => [q, [0xff5aa0, 0x5ae0ff, 0xffd45a, 0x9aff7a, 0xff9a3a][i]])]) { const gl = new THREE.Group(); gl.add(cyl(0.035, 0.03, 0.11, glassM, 12)); ad(gl, cyl(0.03, 0.027, 0.07, drinkM(c), 12)).position.y = -0.015; p.userData.J.wrR.add(gl); gl.position.set(0, -0.09, 0.03); } }
  // la tienda de enfrente y el sushi también tienen gente cenando (se ven de lejos)
  { const g = S.shops.sushi, U = g.userData; add(person({ seed: 202, topType: 'chef', hat: 'band' }), -0.6, 0, -6.4, 0, { k: 'work' }, g);
    U.tables.forEach(([x, z], ti) => { if (ti > 1) return; for (const s of [-1, 1]) add(person({ seed: 210 + ti * 2 + (s > 0), female: (ti + (s > 0)) % 2 === 0 }), x + s * 0.75, 0, z, s < 0 ? Math.PI / 2 : -Math.PI / 2, { k: 'diner', side: s > 0 ? 'L' : 'R' }, g); }); }
  { const g = S.shops.pastry; add(person({ seed: 301, topType: 'chef', hat: 'chef', hairStyle: 'short' }), 0.6, 0, -5.25, 0, { k: 'work' }, g); }
  // la tarjeta del comentario (sobre la gente) y los drones
  S.cardT = signTex(1024, 384, () => {}); S.card = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ map: S.cardT, transparent: true, toneMapped: false })); S.card.position.set(0.6, 4.6, 3.2); G.add(S.card); S.card.visible = false;
  S.swarm = droneSwarm(G, 640, _v(4, 27, 4));
  S.kingSparks = sparks(G, 120, 0xffe08a, 0.05);
  // polvo/bruma en el aire de la noche (flujo óptico suave) cerca de la plaza y del cuartel
  const r1 = rng(11), r2 = rng(22);
  S.flow = [flowCloud(5000, () => [-38 + r1() * 76, 0.3 + r1() * 12, -16 + r1() * 46], { size: 1.0, bright: 0.25, seed: 1, nearF: 0.1, farF: 0.02, col: 0xffe8c8 }),
    flowCloud(3000, () => [HOT.X0 - 4 + r2() * 18, HOT.TOP + 0.5 + r2() * 6, HOT.Z0 - 4 + r2() * 16], { size: 0.9, bright: 0.25, seed: 2, nearF: 0.1, farF: 0.02, col: 0xe8f4ff })];
  envAll(scene); nightify(scene); NIGHT.on = true;
  // el apagón: la calle del sur se apaga con «luz» (parpadeo) y vuelve cuando el electricista arregla el armario
  NIGHT.zones.sur = t => { if (t < TL.luz - 0.15) return 1; if (t < TL.luz + 0.12) return Math.sin((t - TL.luz) * 90) > 0 ? 0.6 : 0.1; if (t < TL.fix) return 0; if (t < TL.fix + 0.35) return Math.sin((t - TL.fix) * 70) > -0.2 ? 0.9 : 0.15; return 1; };
  NIGHT.zones.bar = t => 1; NIGHT.zones.pool = t => 1; NIGHT.zones.casco = t => bump(t, TL.trabajo - 0.1, TL.fix + 1.5, 0.1, 0.4);
}
// ---- cada fotograma: la historia
const _tg = new THREE.Vector3();
function drawCard(n, a, who, txt) { const c = S.cardT.image.getContext('2d'), w = 1024, h = 384; c.clearRect(0, 0, w, h); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,0.96)'; rr(c, 10, 10, w - 20, h - 90, 60); c.fill(); c.beginPath(); c.moveTo(150, h - 82); c.lineTo(120, h - 10); c.lineTo(230, h - 82); c.fill();
  c.fillStyle = '#d6dbe3'; c.beginPath(); c.arc(110, 140, 62, 0, 7); c.fill(); c.fillStyle = '#9aa3b0'; c.beginPath(); c.arc(110, 122, 24, 0, 7); c.fill(); c.beginPath(); c.arc(110, 186, 40, Math.PI, 0); c.fill();
  c.fillStyle = '#e8b64a'; c.font = '900 46px Inter'; c.textAlign = 'center'; c.fillText('♛', 110, 70); c.textAlign = 'left';
  c.fillStyle = '#1a1d22'; c.font = '800 54px Inter'; c.textBaseline = 'middle'; c.fillText(who, 200, 100); c.fillStyle = '#5b6370'; c.font = '600 40px Inter'; c.fillText(txt, 200, 168);
  c.fillStyle = '#e23b55'; c.save(); c.translate(w - 300, 220); c.scale(2.2, 2.2); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-14, -6, -8, -18, 0, -10); c.bezierCurveTo(8, -18, 14, -6, 0, 6); c.fill(); c.restore();
  c.fillStyle = '#e23b55'; c.font = '900 64px Inter'; c.fillText(typeof n === 'number' ? n.toLocaleString('es-ES') : n, w - 250, 226); S.cardT.needsUpdate = true; S.card.material.opacity = a; }
const _rp = [new THREE.Vector3(), new THREE.Vector3()];
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); if (S.grassTime) S.grassTime.value = t; if (S.poolT) S.poolT.value = t;
  const H = S.hall.userData; for (const f of H.flags) flagWave(f, t); flagWave(S.barracks.userData.flag, t + 3);
  S.barracks.userData.leaves[1].visible = t < TL.militar + 0.27;     // la cámara cruza esa hoja de la reja al entrar: se quita cuando ya no se ve (salía un fotograma negro)
  moodMix({ noche: 1 });
  const PT = S.ped.userData.top;
  // la tela: cubre la estatua hasta el tirón del rey; después resbala hacia él y cae
  const vp = seg(t, TL.pull, TL.veil1 + 0.25); veilAt(S.veil, vp, -PT);
  // la cuerda dorada: de la tela a la mano derecha del rey (tensa al tirar); se va con la tela
  { S.king.updateMatrixWorld(true); const hand = S.king.userData.J.wrR.getWorldPosition(_rp[0]); const anc = S.kiria.localToWorld(_v(0.66 + vp * 1.6, 0.9 - vp * 0.8, 0.3 + vp * 0.6)); const ok = vp < 0.7;
    S.rope.visible = ok; if (ok) { const mid = anc.clone().lerp(hand, 0.5); mid.y -= 0.35 * (1 - bump(t, TL.tira - 0.3, TL.pull + 0.3, 0.2, 0.2)); S.rope.geometry.dispose(); S.rope.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(anc, mid, hand), 20, 0.018, 6); } }
  S.ped.userData.plates[0].material = t >= TL.kiria - 0.1 ? S.plateK : S.plateQ;
  // los focos de la estatua: suben al destaparla; la antorcha brilla (y alumbra un poco)
  { const k = 0.35 + 0.65 * win(t, TL.pull + 0.3, 0.6); for (const sp of S.spots) sp.intensity = 95 * k; S.kiria.userData.flameM.emissiveIntensity = 4.5 + Math.sin(t * 13) * 0.4 + Math.sin(t * 7.3) * 0.3; }
  // gente
  for (const p of ROLES) { const r = p.userData.role, ph = p.userData.phase; poseReset(p); breathe(p, t);
    if (r.k === 'king') {
      const pointUp = bump(t, TL.rey1 - 0.2, TL.para + 0.1, 0.25, 0.25), no = bump(t, TL.para - 0.1, TL.L[2] + 0.2, 0.15, 0.3), wave = bump(t, TL.sigue - 0.1, TL.premio, 0.25, 0.25), prem = bump(t, TL.premio - 0.15, TL.E[3] + 0.6, 0.25, 0.4);
      const hold = 1 - win(t, TL.pull + 0.2, 0.3), yank = bump(t, TL.tira - 0.2, TL.pull + 0.45, 0.15, 0.3), cheer = bump(t, TL.kiria, TL.E[10] + 0.4, 0.3, 0.4);
      const J = p.userData.J;
      // mano derecha sujeta la cuerda a la altura de la cadera; al tirar, el brazo va hacia atrás y el cuerpo se inclina
      J.shR.rotation.x = -0.45 * hold + 0.55 * yank; J.elR.rotation.x = -0.9 * hold - 0.3 * yank; J.spine.rotation.x = -0.12 * yank; J.spine.rotation.y = 0.25 * yank;
      if (pointUp > 0.01) { reachTo(p, 'L', S.kiria.localToWorld(_v(0.3, 3.4, 0.0)), pointUp * 0.9); }
      if (no > 0.01) { const J2 = J; J2.shL.rotation.x = -1.3 * no; J2.elL.rotation.x = -1.3 * no; J2.wrL.rotation.z = Math.sin(t * 16) * 0.5 * no; }
      if (wave > 0.01) poseWave(p, 'L', t, wave);
      if (prem > 0.01) reachTo(p, 'L', S.kiria.localToWorld(_v(0.0, 1.2, 0.6)), prem * 0.8);
      if (cheer > 0.01) { for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.z = s * 2.4 * cheer; J['el' + n].rotation.z = s * 0.3 * cheer; } }
      lookAtP(p, wave > 0.3 || prem > 0.3 ? st.p : S.kiria.localToWorld(_v(0, 2.6, 0)), 0.8);
      faceAt(p, t, { smile: 0.55 + 0.35 * cheer, talk: bump(t, TL.L[3], TL.E[3], 0.1, 0.1) * 0.8, open: no > 0.3 ? 0.15 : undefined }); }
    else if (r.k === 'guard') { faceAt(p, t, { smile: 0.15 }); }
    else if (r.k === 'crowd') { const look = S.kiria.localToWorld(_v(0, 2.4, 0)); lookAtP(p, look, 0.7);
      const wow = bump(t, TL.pull + 0.4, TL.E[10] + 0.8, 0.2, 0.5), clap = bump(t, TL.kiria + 0.3, TL.L[11] + 0.4, 0.3, 0.4), argue = bump(t, TL.justo - 0.1, TL.manda, 0.25, 0.4) * (r.i % 3 === 0 ? 1 : 0);
      if (r.phone) { const up = 1 - 0.0 * wow; reachTo(p, 'R', p.localToWorld(_v(0.08, 1.55 + 0.1 * wow, 0.38)), up); if (p.userData.phoneObj) p.userData.phoneObj.rotation.set(-1.45, 0, 0); }
      else if (clap > 0.01) { const c = Math.abs(Math.sin(t * 9 + ph)); for (const [n, s] of [['L', -1], ['R', 1]]) { p.userData.J['sh' + n].rotation.x = -1.0 * clap; p.userData.J['sh' + n].rotation.z = s * (0.15 + 0.25 * c) * clap; p.userData.J['el' + n].rotation.x = -0.9 * clap; p.userData.J['el' + n].rotation.y = -s * 0.6 * clap; } }
      if (argue > 0.01) { p.userData.J.shL.rotation.z = -0.6 * argue; p.userData.J.elL.rotation.x = -1.2 * argue; p.userData.J.wrL.rotation.y = Math.sin(t * 7 + ph) * 0.6 * argue; }
      faceAt(p, t, { open: 0.45 * wow, brow: 0.6 * wow + 0.5 * argue, smile: 0.35 + 0.4 * clap - 0.5 * argue, talk: argue > 0.3 ? 1 : (Math.sin(t * 0.7 + ph) > 0.6 ? 0.6 : 0) }); }
    else if (r.k === 'line') { const L = r.a.distanceTo(r.b), s = (t * r.v + r.off) % L; p.position.copy(r.a).lerp(r.b, s / L); p.rotation.y = Math.atan2(r.b.x - r.a.x, r.b.z - r.a.z); poseWalk(p, t * r.v, 1); faceAt(p, t, {}); }
    else if (r.k === 'walk') { const s = t * r.v + r.a0 * r.r, a = s / r.r; p.position.set(Math.sin(a) * r.r, 0, Math.cos(a) * r.r); p.rotation.y = a + (r.v > 0 ? Math.PI / 2 : -Math.PI / 2); poseWalk(p, Math.abs(s), 1); faceAt(p, t, {}); }
    else if (r.k === 'sit') { poseSit(p, 0.05); faceAt(p, t, { talk: Math.sin(t * 0.5 + ph) > 0 ? 1 : 0 }); }
    else if (r.k === 'soldier') { // firmes; saludan cuando pasa su coronel por delante
      const dz = Math.abs(S.marcos.position.z - r.z), sal = r.r === 0 ? clamp(1 - (dz - 0.5) / 0.7, 0, 1) * win(t, TL.L[5], 0.2) : 0;
      if (sal > 0.01) reachTo(p, 'R', p.localToWorld(_v(0.09, 1.66 * p.userData.k, 0.12)), sal, _v(1, 0, 0.2)); faceAt(p, t, { smile: 0.05, blink: undefined }); lookAtP(p, r.r === 0 ? S.marcos.getWorldPosition(_tg).add(_v(0, 1.6, 0)) : p.localToWorld(_v(0, 1.6, 3)), 0.5 * (r.r === 0 ? 1 : 0.3)); }
    else if (r.k === 'marcos') { // pasa revista: anda despacio por delante de la primera fila, mirando a cada soldado
      const k = seg(t, TL.L[5] - 0.6, TL.E[5] + 1.6); p.position.set(-20.6, 0, lerp(-3.9, 3.9, k)); p.rotation.y = 0; if (k > 0 && k < 1) poseWalk(p, k * 9, 0.55);
      const j = Math.min(5, Math.max(0, Math.round((p.position.z + 3.1) / 1.24))); lookAtP(p, S.soldiers[j].getWorldPosition(_tg).add(_v(0, 1.65, 0)), 0.9); p.userData.J.shL.rotation.x = -0.15; p.userData.J.elL.rotation.x = -1.4; p.userData.J.shL.rotation.z = -0.25;
      faceAt(p, t, { smile: 0.2, talk: bump(t, TL.revista - 0.2, TL.E[5] + 0.5, 0.1, 0.1) * 0.7 }); }
    else if (r.k === 'sentry') { faceAt(p, t, { smile: 0.05 }); }
    else if (r.k === 'izher') { const ph2 = bump(t, TL.electricista - 0.2, TL.fix + 0.6, 0.25, 0.3), dark = 1 - powerAt('sur', t);
      if (ph2 > 0.01) reachTo(p, 'R', p.localToWorld(_v(0.13, 1.6 * p.userData.k, 0.08)), ph2); lookAtP(p, dark > 0.5 ? p.localToWorld(_v(0, 2.2, 1)) : p.localToWorld(_v(0, 1.6, 2)), 0.6);
      faceAt(p, t, { talk: ph2 > 0.5 ? 1 : 0, open: dark > 0.5 ? 0.35 : undefined, brow: 0.7 * dark, smile: 0.5 - 0.6 * dark }); }
    else if (r.k === 'client') { faceAt(p, t, { talk: Math.sin(t * 0.8 + ph) > 0.4 ? 0.8 : 0, open: (1 - powerAt('sur', t)) > 0.5 ? 0.4 : undefined }); }
    else if (r.k === 'elec') { // abre el armario con «trabajo», mete las manos con la linterna del casco, chispazo y vuelve la luz
      const open = win(t, TL.trabajo - 0.2, 0.5), work = bump(t, TL.trabajo + 0.2, TL.fix + 0.4, 0.3, 0.3), jolt = bump(t, TL.fix - 0.05, TL.fix + 0.35, 0.05, 0.25);
      S.cabinet.userData.door.rotation.y = -1.9 * open; p.userData.J.spine.rotation.x = 0.25 * work - 0.2 * jolt; p.userData.J.head.rotation.x = 0.3 * work;
      if (work > 0.01) { const tgt = S.cabinet.localToWorld(_v(0.1, 1.05, 0.25)); reachTo(p, 'R', tgt.clone().add(_v(Math.sin(t * 5) * 0.03, 0, 0)), work); reachTo(p, 'L', S.cabinet.localToWorld(_v(-0.25, 0.85, 0.25)), work * 0.8); }
      faceAt(p, t, { brow: 0.4 * work + 0.6 * jolt, open: 0.5 * jolt, smile: 0.2 + 0.6 * win(t, TL.fix + 0.4, 0.4) });
      const lampOn = bump(t, TL.trabajo - 0.1, TL.fix + 1.5, 0.1, 0.4); S.helmet.userData.lamp.material.emissiveIntensity = 6 * lampOn; p.updateMatrixWorld(true);
      const hp = S.helmet.userData.lamp.getWorldPosition(_tg), aim = S.cabinet.localToWorld(_v(0, 0.95, 0.2)); S.helmSrc.p.copy(hp).lerp(aim, 0.35); S.helmBeam.position.copy(hp); S.helmBeam.lookAt(aim); S.helmBeam.rotateX(-Math.PI / 2); S.helmBeam.material.uniforms.op.value = 0.08 * lampOn * (1 - 0.7 * powerAt('sur', t)); }
    else if (r.k === 'doorman') { faceAt(p, t, { smile: 0.5 }); if (bump(t, TL.hotel - 0.3, TL.piscina, 0.2, 0.3) > 0.01) poseWave(p, 'R', t, bump(t, TL.hotel - 0.3, TL.piscina, 0.2, 0.3) * 0.6); }
    else if (r.k === 'balcony') { lookAtP(p, p.localToWorld(_v(0, 1.4, 4)), 0.5); faceAt(p, t, { talk: Math.sin(t * 0.6 + ph) > 0.3 ? 0.7 : 0 }); p.userData.J.shL.rotation.x = -0.5; p.userData.J.elL.rotation.x = -1.0; p.userData.J.shR.rotation.x = -0.5; p.userData.J.elR.rotation.x = -1.0; }
    else if (r.k === 'swim') { const a = t * 0.35 + r.i * 3; p.position.set(r.x + Math.sin(a) * 0.9, S.hotel.userData.PY - 0.62 + Math.sin(t * 2 + ph) * 0.02, r.z + Math.cos(a * 0.7) * 0.4); p.rotation.y = a + (r.i ? 2 : 0.6);
      p.userData.J.shL.rotation.z = -0.9 + Math.sin(t * 2.4 + ph) * 0.3; p.userData.J.shR.rotation.z = 0.9 - Math.sin(t * 2.4 + ph) * 0.3; faceAt(p, t, { smile: 0.7, talk: Math.sin(t * 0.9 + ph) > 0.5 ? 0.7 : 0 }); }
    else if (r.k === 'poolEdge') { poseSit(p, 0.0); p.userData.J.knL.rotation.x = p.userData.J.knR.rotation.x = 1.25 + Math.sin(t * 2 + ph) * 0.15; faceAt(p, t, { smile: 0.6, talk: Math.sin(t * 0.7 + ph) > 0.2 ? 0.8 : 0 }); }
    else if (r.k === 'lounge') { poseSit(p, -0.55); p.userData.J.hpL.rotation.x = p.userData.J.hpR.rotation.x = -0.25; p.userData.J.knL.rotation.x = p.userData.J.knR.rotation.x = 0.05; p.userData.J.pelvis.position.y = 0.42 * p.userData.k; faceAt(p, t, { smile: 0.6 }); }
    else if (r.k === 'bartender') { const sh = Math.sin(t * 14) * 0.5 + 0.5; p.userData.J.shR.rotation.x = -1.6 - 0.25 * sh; p.userData.J.elR.rotation.x = -0.9 + 0.3 * sh; p.userData.J.shL.rotation.x = -1.4 - 0.25 * sh; p.userData.J.elL.rotation.x = -1.0 + 0.3 * sh; faceAt(p, t, { smile: 0.7, talk: Math.sin(t * 1.1) > 0.3 ? 0.8 : 0 }); }
    else if (r.k === 'jossl' || r.k === 'patron') { const toast = bump(t, TL.copas - 0.25, TL.nadie + 0.3, 0.25, 0.35), dance = r.k === 'patron' && r.i >= 2 ? 1 : 0;
      p.userData.J.shR.rotation.x = -0.9 - 1.0 * toast; p.userData.J.elR.rotation.x = -1.2 + 0.7 * toast; if (r.k === 'jossl' && bump(t, TL.hotel - 0.2, TL.azotea, 0.2, 0.3) > 0.01) poseWave(p, 'L', t, bump(t, TL.hotel - 0.2, TL.azotea, 0.2, 0.3) * 0.7);
      if (dance) { p.userData.J.pelvis.position.x = Math.sin(t * 6 + ph) * 0.03; p.userData.J.spine.rotation.z = Math.sin(t * 6 + ph) * 0.08; p.userData.J.shL.rotation.z = -0.5 - Math.sin(t * 6 + ph) * 0.4; p.userData.J.elL.rotation.x = -1.2; }
      faceAt(p, t, { smile: 0.75, talk: Math.sin(t * 1.3 + ph) > 0.2 ? 1 : 0 }); }
    else if (r.k === 'diner') { poseSit(p, 0.12); const e = Math.max(0, Math.sin(t * 1.3 + ph)); poseEat(p, r.side, e); faceAt(p, t, { talk: e < 0.2 ? 1 : 0 }); }
    else if (r.k === 'work') { poseWork(p, t, 1); faceAt(p, t, { smile: 0.55 }); }
    else faceAt(p, t, { talk: Math.sin(t * 0.8 + ph) > 0.5 ? 0.8 : 0 }); }
  // chispas: el rey al destapar (lluvia dorada) y el armario de la luz al arreglarlo
  burst(S.kingSparks, S.kiria.localToWorld(_v(0.33, 3.8, 0.1)), t, TL.pull + 0.5, 1.3, 1.4, false, 2.2); S.kingSparks.material.opacity = bump(t, TL.pull + 0.5, TL.pull + 2.2, 0.05, 0.8);
  burst(S.cabSparks, S.cabinet.localToWorld(_v(0.05, 1.05, 0.3)), t, TL.fix - 0.05, 0.9, 0.55, false, 4); S.cabSparks.material.opacity = bump(t, TL.fix - 0.05, TL.fix + 0.6, 0.02, 0.35);
  // la furgoneta: luz naranja que gira
  for (const b of S.van.userData.beacons) { const k = Math.pow(Math.max(0, Math.sin(t * 9 + b.ph)), 3); b.m.emissiveIntensity = 0.4 + 5 * k; b.s.material.opacity = 0.9 * k; }
  // el hotel: las plantas vuelven de abajo arriba cuando vuelve la luz
  hotelPower(t < TL.luz ? 1 : t < TL.fix ? 0 : seg(t, TL.fix + 0.2, TL.azotea), t);
  // tarjetas del comentario: «@iannyanezz_» con sus «me gusta» y, al final, la del próximo rey (con el número que sube)
  { const a1 = bump(t, TL.coment - 0.25, TL.premio + 0.2, 0.3, 0.35), a2 = bump(t, TL.coment11 - 0.25, TL.manda + 0.2, 0.3, 0.35);
    S.card.visible = a1 > 0.01 || a2 > 0.01; if (a1 > 0.01) drawCard('1º', a1, '@iannyanezz_', 'El comentario con más «me gusta»');   // sin números inventados
    else if (a2 > 0.01) drawCard(Math.round(lerp(0, 999, sm5(seg(t, TL.coment11, TL.rey11)))), a2, 'Tu comentario', '«Quiero ser rey…»'); if (S.card.visible) S.card.lookAt(st.p); }
  // drones: forman «6.438» con «somos» y una lupa con «¿te has visto?»; se van al llegar a la plaza
  { if (!S.swarmFace && t > TL.somos - 3 && typeof camAt === 'function') { const c = camAt(TL.somos + 0.6); S.swarmFace = c.p.clone().sub(S.swarm.userData.center).setY(0).normalize(); }
    const face = S.swarmFace || _v(1, 0, 1).normalize(); S.swarm.visible = t > TL.L[7] && t < TL.tira + 2; if (S.swarm.visible) swarmAt(S.swarm, t, TL.somos - 0.2, TL.visto - 0.25, TL.plaza + 0.2, face); }
  // coches que pasan
  for (const C of CARS) if (!C.park) { const s = ((t * C.v + C.off) % 90) - 45; if (C.ew) { C.c.position.set(C.dir * s + 5, 0, C.lane); C.c.rotation.y = C.dir > 0 ? Math.PI : 0; } else { C.c.position.set(C.lane, 0, C.dir * s); C.c.rotation.y = C.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } carRoll(C.c, t * C.v); }
}
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
