// ---------------------------------------------------------------- «Química vs Ingeniería Química» (duelo): el laboratorio delante y la fábrica al fondo.
// Primer fotograma: la fábrica entera, en miniatura, DENTRO de un tubo de ensayo gigante sobre la mesa del laboratorio. En «toneladas» la
// fábrica sale del tubo y crece hasta su tamaño real al fondo; al final vuelve a meterse en el tubo (bucle). 1 unidad = 1 m.
const BENCH = { x: 0, z: 3.5, y: 0.92, w: 3.2, d: 1.15 };
const TUBE = { x: 0.15, z: 3.42, r: 0.3, h: 1.45 };            // tubo de ensayo gigante (el del gancho)
const MINI_Y = BENCH.y + 0.33;                                  // suelo de la fábrica en miniatura (dentro del tubo)
const PLANT0 = v3(0, 0, -10), PS0 = 0.03;                       // la fábrica: dónde está a tamaño real y a qué escala cabe en el tubo
const RACK = { x: -0.62, z: 3.8 }, BAL = { x: -1.3, z: 3.2 }, MOL = v3(0.15, 1.95, 3.42);
const TEAL_C = 0x35d6c6, AMB_C = 0xffb547;
let PL_G = null;                                                // grupo de la fábrica

const glassMat = (op = 0.12) => new THREE.MeshPhysicalMaterial({ color: 0xdfeaf2, roughness: 0.03, metalness: 0, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, side: THREE.DoubleSide });
const liquidMat = (c, i = 0.55) => new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.15, transparent: true, opacity: 0.88, clearcoat: 1 });
// tubo de ensayo: fondo redondo, cuerpo recto y borde
function testTube(r, h, m) {
  const prof = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI / 2; prof.push([Math.max(0.0005, Math.cos(a) * r), r + Math.sin(a) * r]); }
  prof.push([r, h - 0.02 * h]); prof.push([r * 1.12, h]); prof.push([r * 1.12, h * 1.012]); prof.push([r * 0.98, h * 1.016]);
  return lathe(prof, 48, m);
}
function flask(R, H, m) {           // matraz Erlenmeyer
  return lathe([[0.0005, 0], [R, 0], [R * 1.02, 0.03 * H], [R * 0.32, 0.68 * H], [R * 0.3, 0.95 * H], [R * 0.36, H], [R * 0.33, H * 1.01]], 48, m);
}
function beaker(R, H, m) { return lathe([[0.0005, 0], [R, 0], [R, H], [R * 1.06, H * 1.01]], 40, m); }

function buildLab() {
  const L = new THREE.Group(); scene.add(L); S.lab = L;
  // mesa de laboratorio: encimera de cerámica oscura sobre un mueble
  const top = mesh(new THREE.BoxGeometry(BENCH.w, 0.06, BENCH.d), M.ceramicD); top.position.set(BENCH.x, BENCH.y - 0.03, BENCH.z); L.add(top);
  const cab = mesh(new THREE.BoxGeometry(BENCH.w - 0.1, BENCH.y - 0.06, BENCH.d - 0.12), paint(0x22262d, 0.6, 0.2)); cab.position.set(BENCH.x, (BENCH.y - 0.06) / 2, BENCH.z); L.add(cab);
  for (const sx of [-1, 1]) { const h = mesh(new THREE.BoxGeometry(0.02, 0.04, 0.4), MAT.steel); h.position.set(BENCH.x + sx * 0.75, BENCH.y - 0.25, BENCH.z + BENCH.d / 2 - 0.05); L.add(h); }
  // el tubo gigante del gancho, con el «suelo» de la fábrica en miniatura dentro
  const T = new THREE.Group(); T.position.set(TUBE.x, BENCH.y, TUBE.z); L.add(T); S.tube = T;
  S.tubeGlass = testTube(TUBE.r, TUBE.h, glassMat(0.14)); T.add(S.tubeGlass);
  S.tubeRim = new THREE.Mesh(new THREE.TorusGeometry(TUBE.r * 1.12, 0.012, 10, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6 }));
  S.tubeRim.rotation.x = Math.PI / 2; S.tubeRim.position.y = TUBE.h * 1.006; T.add(S.tubeRim);
  S.miniFloor = cyl(TUBE.r * 0.97, TUBE.r * 0.97, 0.02, paint(0x2b2f36, 0.7, 0.1), 48); S.miniFloor.position.y = MINI_Y - BENCH.y - 0.01; T.add(S.miniFloor);
  S.tubeShards = sparks(scene, 90, 0xdfeaf2, 0.03); S.tubeShards.visible = false;
  // gradilla con tres tubos pequeños (uno, el del químico, se rellena con la sustancia nueva)
  const rack = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.16), M.woodL); rack.position.set(RACK.x, BENCH.y + 0.12, RACK.z); L.add(rack);
  const rb = mesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), M.woodL); rb.position.set(RACK.x, BENCH.y + 0.01, RACK.z); L.add(rb);
  for (const sx of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.02, 0.13, 0.14), M.woodL); p.position.set(RACK.x + sx * 0.24, BENCH.y + 0.065, RACK.z); L.add(p); }
  S.smallTubes = [];
  [[-0.14, 0x8f7bff, 0.1], [0, TEAL_C, 0.0], [0.14, AMB_C, 0.12]].forEach(([dx, c, lv], i) => {
    const g = new THREE.Group(); g.position.set(RACK.x + dx, BENCH.y + 0.02, RACK.z); L.add(g);
    g.add(testTube(0.028, 0.24, glassMat(0.2)));
    const liq = cyl(0.025, 0.025, 1, liquidMat(c, 0.7), 20); liq.position.y = 0.028; g.add(liq); liq.userData.c = c;
    g.userData.liq = liq; g.userData.lv = lv; S.smallTubes.push(g);
  });
  // matraz y vaso de precipitados con líquido
  const fk = new THREE.Group(); fk.position.set(0.98, BENCH.y, 3.28); L.add(fk); fk.add(flask(0.13, 0.32, glassMat(0.16)));
  const fl = lathe([[0.0005, 0.005], [0.122, 0.005], [0.123, 0.03], [0.088, 0.115], [0.0005, 0.115]], 40, liquidMat(TEAL_C, 0.6)); fk.add(fl); S.flask = fk;
  const bk = new THREE.Group(); bk.position.set(1.3, BENCH.y, 3.72); L.add(bk); bk.add(beaker(0.1, 0.2, glassMat(0.16)));
  const bl = cyl(0.094, 0.094, 0.09, liquidMat(AMB_C, 0.5), 32); bl.position.y = 0.05; bk.add(bl);
  // balanza de precisión con su pantalla («0,50 g», EJEMPLO) y un cuentagotas encima
  const B = new THREE.Group(); B.position.set(BAL.x, BENCH.y, BAL.z); L.add(B); S.bal = B;
  const base = mesh(new THREE.BoxGeometry(0.34, 0.08, 0.3), paint(0xe9ecef, 0.35, 0.6)); base.position.y = 0.04; B.add(base);
  const pan = cyl(0.11, 0.11, 0.012, MAT.steel, 40); pan.position.set(0, 0.095, -0.02); B.add(pan); S.pan = pan;
  const disp = plateText(0.2, 0.055, [['0,50 g', 0.7, 0.55]], { fg: '#7CF0A9', bg: '#06110b', font: 'SpaceMono', weight: 700 }); disp.position.set(0, 0.045, 0.152); disp.rotation.x = -0.35; B.add(disp);
  const dropper = new THREE.Group(); dropper.position.set(0, 0.42, -0.02); B.add(dropper);
  dropper.add(at(cyl(0.012, 0.004, 0.16, glassMat(0.35), 16), 0, 0.08, 0)); dropper.add(at(cyl(0.02, 0.02, 0.07, plastic(0x1b1d22, 0.4), 16), 0, 0.19, 0));
  S.drop = sph(0.012, liquidMat(TEAL_C, 1.2), 14, 10); S.drop.position.set(0, 0.0, 0); dropper.add(S.drop); S.dropper = dropper;
  // la molécula (bolas y palos): aparece en «moléculas», se reordena en «algo nuevo» y se mete en el tubo pequeño
  const MG = new THREE.Group(); MG.position.copy(MOL); scene.add(MG); S.mol = MG;
  const AT = [[0, 0, 0, 0.13, 'c'], [0.34, 0.12, 0.05, 0.13, 'c'], [-0.32, 0.14, -0.04, 0.13, 'c'], [0.02, -0.34, 0.06, 0.15, 'o'], [0.62, -0.04, 0.1, 0.09, 'h'],
    [0.36, 0.44, -0.08, 0.09, 'h'], [-0.58, -0.05, 0.08, 0.09, 'h'], [-0.36, 0.46, 0.06, 0.09, 'h'], [0.3, -0.58, 0.12, 0.09, 'h']];
  const AM = { c: paint(0x2f343c, 0.25, 1), o: liquidMat(TEAL_C, 0.9), h: paint(0xf2f4f7, 0.25, 1) };
  S.atoms = AT.map(([x, y, z, r, k], i) => { const s = sph(r, AM[k], 28, 20); s.position.set(x, y, z); s.userData.p0 = v3(x, y, z); MG.add(s); return s; });
  // reordenada («algo nuevo»): otra forma y un átomo nuevo que se une
  const P2 = [[0, 0, 0], [0.36, 0.0, 0.05], [-0.36, 0.0, -0.05], [0.0, 0.36, 0.08], [0.66, 0.16, 0.1], [0.5, -0.32, -0.08], [-0.66, 0.16, 0.08], [-0.5, -0.32, 0.06], [0.0, 0.7, 0.14]];
  S.atoms.forEach((s, i) => { s.userData.p1 = v3(...P2[i]); });
  S.newAtom = sph(0.15, liquidMat(AMB_C, 1.1), 28, 20); S.newAtom.userData.p1 = v3(0, -0.36, -0.06); MG.add(S.newAtom);
  const BONDS = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [2, 7], [3, 8]];
  S.bondM = paint(0xc9ced6, 0.3, 0.6);
  S.bonds = BONDS.map(([a, b]) => { const c = cyl(0.028, 0.028, 1, S.bondM, 12); MG.add(c); return { c, a, b }; });
  S.bondNew = cyl(0.028, 0.028, 1, S.bondM, 12); MG.add(S.bondNew);
  // receta: la tarjeta que el químico le pasa a la fábrica
  S.recipe = plateText(0.42, 0.56, [['RECETA', 0.1, 0.13], ['SUSTANCIA NUEVA', 0.06, 0.3], ['1  Mezclar', 0.055, 0.48], ['2  Calentar', 0.055, 0.6], ['3  Destilar', 0.055, 0.72], ['4  Enfriar', 0.055, 0.84]],
    { fg: '#1b1d22', bg: '#f2eee3', font: 'SpaceMono', weight: 700, align: 'left' });
  S.recipe.material.side = THREE.DoubleSide; scene.add(S.recipe); S.recipe.visible = false;
  S.seed = sph(0.06, liquidMat(TEAL_C, 2.6), 20, 14); scene.add(S.seed); S.seed.visible = false;   // la gota del químico que vuelve a encender la fábrica
}

function buildPlant() {
  const g = new THREE.Group(); scene.add(g); PL_G = g; S.plant = g;
  const white = paint(0xe7eaee, 0.38, 0.6), grey = paint(0x8f98a3, 0.42, 0.5), dark = paint(0x2a2f36, 0.6, 0.2), conc = paint(0x4a4e55, 0.9, 0);
  S.plantLights = [];
  const lamp = (x, y, z, c = 0xffd27a, r = 0.09) => { const s = sph(r, glowM(c, 3), 12, 8); s.position.set(x, y, z); g.add(s); S.plantLights.push(s); return s; };
  const add = (o, x, y, z) => { o.position.set(x, y, z); g.add(o); return o; };
  add(mesh(new THREE.BoxGeometry(17, 0.25, 11), conc), 0.5, 0.125, 0);
  // reactor: depósito vertical con fondos abombados sobre patas, aros, agitador y bocas
  const RX = -3.3, RZ = 0.4, RR = 1.35, RH = 3.0, RY = 1.55;
  S.reactor = new THREE.Group(); S.reactor.position.set(RX, 0, RZ); g.add(S.reactor);
  const rv = cyl(RR, RR, RH, white, 48); rv.position.y = RY + RH / 2; S.reactor.add(rv);
  for (const sy of [1, -1]) { const cap = sph(RR, white, 48, 24); cap.scale.set(1, 0.42, 1); cap.position.y = sy > 0 ? RY + RH : RY; S.reactor.add(cap); }
  for (const yy of [0.25, 0.5, 0.75]) { const band = new THREE.Mesh(new THREE.TorusGeometry(RR * 1.005, 0.035, 8, 64), grey); band.rotation.x = Math.PI / 2; band.position.y = RY + RH * yy; S.reactor.add(band); }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; S.reactor.add(bar(v3(Math.cos(a) * RR * 0.92, 0.25, Math.sin(a) * RR * 0.92), v3(Math.cos(a) * RR * 0.92, RY + 0.4, Math.sin(a) * RR * 0.92), 0.08, grey)); }
  const mot = cyl(0.32, 0.32, 0.55, dark, 24); mot.position.y = RY + RH + RR * 0.42 + 0.35; S.reactor.add(mot);
  const mot2 = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.5), paint(0x3a7bd5, 0.35, 0.8)); mot2.position.y = RY + RH + RR * 0.42 + 0.78; S.reactor.add(mot2);
  for (const [a, y] of [[0.4, RY + RH * 0.8], [2.2, RY + RH * 0.35], [4.1, RY + RH * 0.6]]) { const nz = cyl(0.16, 0.16, 0.45, grey, 20); nz.rotation.z = Math.PI / 2; nz.rotation.y = a; nz.position.set(Math.cos(a) * (RR + 0.18), y, -Math.sin(a) * (RR + 0.18)); S.reactor.add(nz); }
  S.reactorGlow = lamp(RX + RR * 0.72, RY + RH * 0.7, RZ + RR * 0.72, 0xffb547, 0.12);
  // columna de destilación: alta, con plataformas, barandillas y escalera
  const CX = 1.9, CZ = -1.6, CR = 0.75, CH = 10.5;
  S.column = new THREE.Group(); S.column.position.set(CX, 0.25, CZ); g.add(S.column);
  const cb = cyl(CR, CR, CH, white, 40); cb.position.y = CH / 2; S.column.add(cb);
  const ct = sph(CR, white, 40, 20); ct.scale.y = 0.45; ct.position.y = CH; S.column.add(ct);
  for (const yy of [2.6, 5.2, 7.8]) {
    const pl = cyl(CR + 0.62, CR + 0.62, 0.06, grey, 40); pl.position.y = yy; S.column.add(pl);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(CR + 0.6, 0.025, 6, 48), grey); rail.rotation.x = Math.PI / 2; rail.position.y = yy + 0.55; S.column.add(rail);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; S.column.add(bar(v3(Math.cos(a) * (CR + 0.6), yy, Math.sin(a) * (CR + 0.6)), v3(Math.cos(a) * (CR + 0.6), yy + 0.55, Math.sin(a) * (CR + 0.6)), 0.02, grey)); }
    const lp = sph(0.08, glowM(0xffd27a, 3), 10, 8); lp.position.set(CR + 0.55, yy + 0.6, 0); S.column.add(lp); S.plantLights.push(lp);
  }
  for (const sx of [-1, 1]) S.column.add(bar(v3(sx * 0.18, 0, CR + 0.32), v3(sx * 0.18, 8.3, CR + 0.32), 0.025, grey));
  for (let y = 0.4; y < 8.3; y += 0.4) S.column.add(bar(v3(-0.18, y, CR + 0.32), v3(0.18, y, CR + 0.32), 0.015, grey));
  S.columnTop = new THREE.Object3D(); S.columnTop.position.y = CH + 0.4; S.column.add(S.columnTop);
  // intercambiador de calor (horizontal) y bomba
  const HX = new THREE.Group(); HX.position.set(-0.4, 0.25, 3.0); g.add(HX); S.exch = HX;
  const sh = cyl(0.5, 0.5, 3.6, grey, 32); sh.rotation.z = Math.PI / 2; sh.position.y = 1.25; HX.add(sh);
  for (const sx of [-1, 1]) { const hd = sph(0.5, dark, 24, 16); hd.scale.x = 0.4; hd.position.set(sx * 1.8, 1.25, 0); HX.add(hd); HX.add(at(mesh(new THREE.BoxGeometry(0.3, 0.75, 0.7), dark), sx * 1.1, 0.375, 0)); }
  // depósitos de almacenamiento
  S.tanks = [];
  for (const [x, z] of [[5.6, 1.9], [5.6, -2.6]]) { const tg = new THREE.Group(); tg.position.set(x, 0.25, z); g.add(tg);
    const tb = cyl(1.7, 1.7, 3.0, white, 48); tb.position.y = 1.5; tg.add(tb); const dm = sph(1.7, white, 48, 16); dm.scale.y = 0.22; dm.position.y = 3.0; tg.add(dm);
    const st = new THREE.Mesh(new THREE.TorusGeometry(1.71, 0.03, 6, 64), grey); st.rotation.x = Math.PI / 2; st.position.y = 2.2; tg.add(st); S.tanks.push(tg); }
  // chimenea (antorcha) con su luz roja
  S.stack = new THREE.Group(); S.stack.position.set(-6.4, 0.25, -3.4); g.add(S.stack);
  const sk = cyl(0.26, 0.38, 11.5, grey, 24); sk.position.y = 5.75; S.stack.add(sk);
  for (const yy of [3, 6, 9]) { const rg = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 32), dark); rg.rotation.x = Math.PI / 2; rg.position.y = yy; S.stack.add(rg); }
  const red = sph(0.1, glowM(0xff3b30, 4), 10, 8); red.position.y = 11.6; S.stack.add(red); S.plantLights.push(red);
  S.stackTop = new THREE.Object3D(); S.stackTop.position.y = 11.7; S.stack.add(S.stackTop);
  // rack de tuberías y las tuberías que unen reactor → columna → intercambiador → depósitos
  const pr = (x0, x1, z, y) => { for (let x = x0; x <= x1 + 0.01; x += 2.5) { g.add(bar(v3(x, 0.25, z - 0.5), v3(x, y, z - 0.5), 0.06, grey)); g.add(bar(v3(x, 0.25, z + 0.5), v3(x, y, z + 0.5), 0.06, grey)); g.add(bar(v3(x, y, z - 0.55), v3(x, y, z + 0.55), 0.06, grey)); } };
  pr(-5, 7.5, 4.6, 3.6);
  S.pipes = [];
  const PIPE = (pts, r, m) => { const t = tube(pts.map(p => v3(...p)), r, m, pts.length * 14, false, 12); g.add(t); S.pipes.push(t); return t; };
  const pm1 = paint(0xb8c0ca, 0.3, 0.7), pm2 = paint(0xd0a24a, 0.3, 0.7), pm3 = paint(0x7f8a96, 0.3, 0.7);
  PIPE([[-6, 3.75, 4.35], [8.2, 3.75, 4.35]], 0.12, pm1); PIPE([[-6, 3.98, 4.75], [8.2, 3.98, 4.75]], 0.1, pm2); PIPE([[-6, 3.75, 5.05], [8.2, 3.75, 5.05]], 0.14, pm3);
  PIPE([[RX, RY + RH + 0.5, RZ], [RX, RY + RH + 1.4, RZ], [-1.0, RY + RH + 1.4, RZ - 0.6], [CX - 0.9, 6.0, CZ + 0.2], [CX - CR, 6.0, CZ]], 0.13, pm1);
  PIPE([[CX, CH + 0.5, CZ], [CX, CH + 1.1, CZ], [CX + 1.4, CH + 1.1, CZ], [CX + 1.6, 4.5, CZ + 1.6], [CX + 1.6, 3.9, 4.35]], 0.11, pm2);
  PIPE([[-2.2, 1.5, 3.0], [-3.3, 1.5, 2.2], [RX, 1.2, RZ + RR + 0.1]], 0.1, pm3);
  PIPE([[1.4, 1.5, 3.0], [3.4, 1.5, 3.0], [3.9, 1.6, 1.9], [5.6 - 1.75, 1.6, 1.9]], 0.1, pm1);
  PIPE([[5.6, 3.3, 1.9], [5.6, 3.9, 3.2], [5.6, 3.9, 4.35]], 0.09, pm2);
  // flujo por dentro de las tuberías (puntos que corren en «tuberías»)
  S.flowPts = sparks(g, 160, 0xffd27a, 0.12); S.flowPts.visible = false;
  S.flowCurves = S.pipes.map(t => t.geometry.parameters.path);
  // camión cisterna (sale cargado en «toneladas cada día»)
  const TK = new THREE.Group(); TK.position.set(9.5, 0.25, 2.2); g.add(TK); S.truck = TK;
  const cabM = paint(0xf2f4f7, 0.3, 1), chM = paint(0x1d2025, 0.6, 0.2);
  TK.add(at(mesh(new THREE.BoxGeometry(6.2, 0.35, 1.9), chM), 0, 0.85, 0));
  const cabG = mesh(new THREE.BoxGeometry(1.6, 1.8, 2.2), cabM); cabG.position.set(3.4, 1.7, 0); TK.add(cabG);
  TK.add(at(mesh(new THREE.BoxGeometry(0.05, 0.7, 1.9), new THREE.MeshPhysicalMaterial({ color: 0x0d1626, roughness: 0.05, metalness: 0.5, clearcoat: 1 })), 4.21, 2.05, 0));
  const tk = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 3.4, 10, 32), paint(0xdfe3e8, 0.2, 1)); tk.rotation.z = Math.PI / 2; tk.position.set(-0.6, 2.05, 0); tk.castShadow = true; TK.add(tk);
  for (const x of [-2.4, -1.4, 3.3]) for (const z of [-0.95, 0.95]) { const wh = cyl(0.48, 0.48, 0.35, chM, 24); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.48, z); TK.add(wh); }
  S.smoke = sparks(g, 120, 0xcfd6de, 0.5); S.steam = sparks(g, 70, 0xe6ecf2, 0.35);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}

function buildQuimica() { buildFloor(); buildLab(); buildPlant(); }
