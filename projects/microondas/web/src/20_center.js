// ---------------------------------------------------------------- la escena del plano continuo: el micro (con su interior en rayos X y el magnetrón: módulo xray), la taza
// con el agua, el estallido, la cocina eléctrica con el cazo al lado, las moléculas y los paisajes de cerca (módulos), la cucharilla con el café, el
// termómetro, los avisos de la FDA, la mano y el palito. Todo en un plató oscuro con polvo en el aire (estelas al moverse la cámara).
const MW_POS = new THREE.Vector3(0, 0, -6), MAGLIFT = new THREE.Vector3(17, 40, -20);    // MAGLIFT: el magnetrón levantado (fase E)
let MUGW = new THREE.Vector3();          // base de la taza en el mundo
async function buildScene() {
  S.mw = buildMicrowave(); S.mw.position.copy(MW_POS); scene.add(S.mw);
  const U = S.mw.userData; S.mug = buildMug(); S.mug.position.copy(U.plateC).add(v3(0, U.plateTop - U.plateC.y + 0.02, 0)).add(MW_POS); scene.add(S.mug); MUGW.copy(S.mug.position);
  S.splash = buildSplash(2600, 1); S.splash.position.copy(MUGW); scene.add(S.splash);      // el estallido no gira con el plato
  S.erupt = buildErupt(3); S.splash.add(S.erupt);
  S.coffee = buildCoffee(); S.mug.add(S.coffee);
  S.stick = typeof buildMacStick === 'function' ? buildMacStick() : buildStick(); S.stick.visible = false; scene.add(S.stick);
  S.bub = buildBubbles(90); S.mug.add(S.bub);
  S.stove = await buildStove();
  if (typeof buildXray === 'function') S.xr = buildXray(S.mw);
  else if (typeof buildMagnetron === 'function') { S.mag = buildMagnetron(); scene.add(S.mag.group); S.mag.group.visible = false; }
  if (typeof buildMagWaves === 'function') { S.waves = buildMagWaves(); S.mw.add(S.waves.group); }
  if (typeof buildMolecules === 'function') { S.mol = buildMolecules(); scene.add(S.mol.group); }
  if (typeof buildMacro === 'function') { S.mac = buildMacro(); for (const g of Object.values(S.mac.groups || {})) scene.add(g); }
  // la mano (piel de «los dedos»): entra a coger la taza y se aparta
  S.hand = realHand({ inside: false }); S.hand.scale.setScalar(7.2); S.hand.visible = false; scene.add(S.hand);
  S.hand.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry.type === 'CylinderGeometry') { o.scale.y = 3.2; o.position.y = HAND_Y0 - 1.2 * 3.2; } });
  S.hand.userData.fingers.forEach(f => { f.bones[0].rotation.z = f.d.a * D2 * 0.35; });
  S.spoon = buildSpoon(); scene.add(S.spoon);
  S.thermo = buildThermo(); scene.add(S.thermo);
  S.signs = buildSigns(); scene.add(S.signs);
  // polvo en el aire del plató (deja estelas cuando la cámara se mueve: el «flujo óptico») y motas dentro del horno
  S.flow.push(flowCloud(9000, i => [-90 + hash(i * 1.3) * 230, -10 + hash(i * 2.7) * 90, -90 + hash(i * 3.9) * 170], { size: 1.7, bright: 0.5, nearF: 3, farF: 0.004, drift: 0.8, seed: 4, col: 0xffe6c4 }));
  S.flow.push(flowCloud(1800, i => [-20 + hash(i * 5.1) * 28, 4 + hash(i * 6.3) * 20, -38 + hash(i * 7.7) * 31], { size: 1.2, bright: 0.35, nearF: 0.8, farF: 0.02, drift: 0.25, seed: 5, col: 0xfff0d8 }));
  // reflejos: cada material con su HDRI; lo de dentro del horno, con menos
  envAll(scene, 1); const IN = [U.M.enamel, U.mica.material, U.lampGrille.material]; U.plate.traverse(o => o.material && IN.push(o.material));
  S.inner = [...new Set(IN)]; S.innerRoots = [S.mug, S.splash];
}
function innerEnv(k) { for (const m of S.inner) envMat(m, k); for (const r of S.innerRoots) envAll(r, k); }
// ---------- la cucharilla con café soluble (aparece sobre la taza, se inclina y lo echa)
function buildSpoon() {
  const g = new THREE.Group(), steel = new THREE.MeshPhysicalMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.18, envMapIntensity: 1.2, side: THREE.DoubleSide });
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel); bowl.scale.set(1, 0.42, 1.35); g.add(bowl);
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 11), steel); hd.position.set(0, 0.25, -7.2); hd.rotation.x = -0.12; g.add(hd);
  const coffee = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a170b, roughness: 0.85 })); coffee.scale.set(1, 0.35, 1.3); coffee.position.y = -0.05; g.add(coffee);
  g.userData = { coffee }; g.visible = false; return g;
}
// ---------- termómetro de laboratorio metido en el agua: la columna roja sube y pasa de 100
function buildThermo() {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 1.5, depthWrite: false });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 17, 24), glass); tube.position.y = 8.5; tube.renderOrder = 6; g.add(tube);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd62b2b, roughness: 0.25, emissive: 0x4a0000 })); g.add(bulb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 12), new THREE.MeshStandardMaterial({ color: 0xe8302a, roughness: 0.3, emissive: 0x7a0a05 })); col.position.y = 0.5; g.add(col);
  const tick = new THREE.MeshBasicMaterial({ color: 0x1c2430 });
  for (let d = 20; d <= 110; d += 10) { const y = 2 + (d - 20) / 90 * 14, m = new THREE.Mesh(new THREE.BoxGeometry(d % 50 === 0 ? 0.55 : 0.35, 0.05, 0.05), tick); m.position.set(0.5, y, 0); g.add(m); }
  g.userData = { col, Y: d => 2 + (d - 20) / 90 * 14 }; g.visible = false; return g;
}
// ---------- avisos (triángulos amarillos con «!») que salen alrededor del micro al hablar de la FDA
function buildSigns() {
  const g = new THREE.Group(), tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#FFC400'; c.strokeStyle = '#1C1C1C'; c.lineWidth = 16; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(w / 2, 22); c.lineTo(w - 18, h - 30); c.lineTo(18, h - 30); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#1C1C1C'; c.font = '900 150px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('!', w / 2, h - 58); });
  const P = [[-34, 30, -10], [30, 38, -18], [-24, 46, -32], [40, 20, -4], [-44, 14, -24], [10, 52, -26]];
  for (const p of P) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.position.set(...p); s.userData.p = v3(...p); s.scale.setScalar(0.001); g.add(s); }
  g.visible = false; return g;
}
// el estallido: τ (segundos reales) en cada momento (cámara lenta)
function tauAt(t) {
  if (t < SHT.B0) return 0.055;                                                                     // A: congelado (primer fotograma = último)
  if (t < SHT.C0) return 0.055 * (1 - win(t, SHT.B0, 0.95));                                        // B: se rebobina (las gotas vuelven a la taza)
  if (t >= K.saltar1 && t < SHT.E0) return clamp((t - K.saltar1) * 0.075, 0, 0.11) + Math.max(0, t - SHT.D0 - 0.3) * 0.12;   // C–D: salta a la cara (y luego se apaga)
  if (t >= SHT.P0 && t < K.manos9 - 0.15) return clamp((t - SHT.P0 - 0.04) * 0.07, 0, 0.16);       // P: al echar el café
  if (t >= K.manos9 - 0.15 && t < SHT.R0) return clamp((t - K.manos9 + 0.15) * 0.07, 0, 0.12);     // Q: le salta a la mano
  if (t >= SHT.U1) return 0.055 * clamp((t - SHT.U1) / (END - SHT.U1));                             // U: estalla otra vez y se congela (bucle)
  return 0;
}
function mugRot(t, sh) { const R = -0.6, w = 0.5;
  if (sh === 'B') return R - w * Math.max(0, K.saltar1 - t) * 0.4; if (sh === 'U') return R - w * Math.max(0, SHT.U1 - t);
  if (sh === 'G' || sh === 'L' || sh === 'N') return R + w * (t - SHT.G0) * 0.6; return R; }
// ---------- vista térmica (como una cámara FLIR): al cruzar el cristal de la puerta en L
const thermalMat = (T0, T1, y0, y1, nz = 0.03) => new THREE.ShaderMaterial({ uniforms: { T0: { value: T0 }, T1: { value: T1 }, y0: { value: y0 }, y1: { value: y1 }, nz: { value: nz } },
  vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vW; void main(){ vec4 p = vec4(position, 1.);\n#ifdef USE_INSTANCING\np = instanceMatrix * p;\n#endif\nvec4 w = modelMatrix * p; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;\n#include <logdepthbuf_vertex>\n}',
  fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform float T0, T1, y0, y1, nz; varying vec3 vW;\nfloat hh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }\n' +
    'vec3 iron(float t){ t = clamp(t, 0., 1.); vec3 c0 = vec3(0.02,0.01,0.08), c1 = vec3(0.17,0.04,0.42), c2 = vec3(0.55,0.08,0.5), c3 = vec3(0.88,0.2,0.24), c4 = vec3(0.98,0.5,0.1), c5 = vec3(1.,0.84,0.3), c6 = vec3(1.,0.98,0.88);\n' +
    'if (t < .2) return mix(c0, c1, t / .2); if (t < .4) return mix(c1, c2, (t - .2) / .2); if (t < .6) return mix(c2, c3, (t - .4) / .2); if (t < .75) return mix(c3, c4, (t - .6) / .15); if (t < .9) return mix(c4, c5, (t - .75) / .15); return mix(c5, c6, (t - .9) / .1); }\n' +
    'void main(){\n#include <logdepthbuf_fragment>\nfloat k = clamp((vW.y - y0) / (y1 - y0), 0., 1.); float n = (sin(vW.x * 1.7 + vW.z * 2.3) * sin(vW.z * 1.9 - vW.x * 1.1) + 0.5 * sin(vW.x * 4.1 - vW.z * 3.7) + (hh(vW * 40.) - .5) * 0.25) * nz;\n' +
    'vec3 c = iron(mix(T0, T1, k) + n); gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.25, 1.); }' });
let THERM = false;
function thermal(on) {
  if (on === THERM) return; THERM = on; const U = S.mw.userData, Um = S.mug.userData, my = MUGW.y;
  const swap = (root, mk) => root.traverse(o => { if (!(o.isMesh || o.isSprite) || o === S.splash || o.parent === S.splash) return; if (on) { o.userData.m0 = o.material; const tm = mk(o); o.material = Array.isArray(o.material) ? o.material.map(() => tm) : tm; } else if (o.userData.m0) { o.material = o.userData.m0; o.userData.m0 = null; } });
  const cool = thermalMat(0.16, 0.12, 0, 26, 0.02), grille = thermalMat(0.34, 0.34, 0, 1, 0.01), plate = thermalMat(0.22, 0.2, 0, 10, 0.02);
  const mug = thermalMat(0.4, 0.26, my + 5.5, my + 9.8, 0.02), water = thermalMat(0.96, 0.9, -1, 1, 0.035);
  swap(S.mw, o => o.material === U.lampGrille.material ? grille : U.plate.getObjectById(o.id) ? plate : cool);
  swap(S.mug, o => Um.surfMeshes.includes(o) || o === Um.mirror ? water : mug);
  S.splash.visible = !on;
  S.thermBg = S.thermBg || new THREE.Color(0x04020e);
}
function stageAt(t, st) {
  NOW = t; const U = S.mw.userData, sh = shotAt(t), mx = MUGW.x, my = MUGW.y, mz = MUGW.z;
  // la puerta: abierta desde «pero» (se abre) hasta el palito; se cierra en «¿micro…»
  const door = (sh === 'O' ? win(t, K.pero8 - 0.05, 0.5) : ['P', 'Q', 'R', 'S'].includes(sh) ? 1 : sh === 'T' ? 1 - win(t, SHT.T0 + 0.3, 0.5) : 0) * 0.78;
  const running = ['A', 'B', 'C', 'G', 'H', 'L', 'M', 'N', 'U'].includes(sh) ? 1 : 0;
  const secs = Math.max(0, Math.ceil(60 - t * 0.9)), disp = sh === 'R' ? (t < K.calientes10 + 0.2 ? '3:00' : t < K.mas10 ? '2:00' : '1:00') : sh === 'S' || sh === 'T' ? '1:00' : (running ? `0:${String(secs % 60).padStart(2, '0')}` : '12:34');
  const rot = mugRot(t, sh); S.mug.rotation.y = rot; microwaveAt(S.mw, { on: running, lamp: Math.max(running, door > 0.05 ? 1 : 0), turn: rot, door, display: disp });
  // vista térmica: al cruzar el cristal en L, hasta zambullirse en la taza (M)
  thermal(t > 25.15 && t < K.lisa6 + 0.2);
  { const want = THERM ? S.thermBg : sh === 'I' ? null : S.hdr; if (scene.background !== want) scene.background = want; }
  // la taza: estallido (A congelado, B rebobinado, C salta a la cara, P con el café, Q a la mano, U otra vez)
  const tau = tauAt(t), doorShut = door < 0.05;
  if (!THERM) innerEnv(lerp(0.25, 0.6, clamp(door / 0.78)));
  { const dz = Math.abs(st.p.z - (-4.8)), near = door < 0.05 ? 1 - clamp((dz - 5) / 22) : 0; U.screen.material.opacity = 1 - near; U.veil.material.opacity = near * 0.55; }   // rejilla desenfocada de cerca
  const sdir = sh === 'P' ? v3(0.15, 0, 1) : sh === 'Q' ? v3(0.6, 0.1, 0.8) : v3(0, 0, 1);
  splashAt(S.splash, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null, frontZ: -6 - mz, floorOut: -my, steam: 1, light: doorShut ? null : v3(0.2, 0.8, 0.55) });
  eruptAt(S.erupt, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null });
  const bulge = tau > 0 ? 0.35 * Math.exp(-Math.pow((tau - 0.012) / 0.02, 2)) : 0, crown = tau > 0 ? clamp(tau / 0.05) : 0;
  mugSurface(S.mug, t, { amp: tau > 0 ? 0.35 * clamp(tau / 0.02) : (sh === 'S' ? 0.03 : 0.004), bulge, crown: crown * 0.4, rise: boilLevel(tau) });
  { const Um = S.mug.userData, calm = tau <= 0 && !THERM; Um.mirror.visible = calm; Um.surfMeshes[0].visible = !calm; Um.surfMeshes[1].visible = !calm && !THERM; }
  // la cucharilla aparece, se inclina y echa el café (O)
  { const sp = S.spoon, vis = sh === 'O' && t > K.mueves8 - 0.2; sp.visible = vis;
    if (vis) { const a = win(t, K.mueves8 - 0.2, 0.5), tilt = win(t, K.echas8 - 0.15, 0.35); sp.position.set(mx + 0.5, my + 15 + 4 * (1 - a), mz + 1.5); sp.rotation.set(-0.3 - 1.0 * tilt, 0.4, 0.15); sp.userData.coffee.visible = tilt < 0.6; } }
  coffeeAt(S.coffee, sh === 'O' || sh === 'P' ? clamp((t - (K.echas8 + 0.05)) / (K.hierve8 - K.echas8 - 0.05)) : 0);
  // el termómetro (N): metido en el agua, la columna sube y pasa de 100
  { const th = S.thermo, vis = sh === 'N'; th.visible = vis;
    if (vis) { const d = lerp(80, 104, win(t, K.agua7 + 0.2, K.cien7 + 0.5 - K.agua7)), y = th.userData.Y(d); th.position.set(mx - 1.6, my + 0.9, mz + 0.8); th.rotation.set(0.12, 0, 0.22);
      th.userData.col.scale.y = y; th.userData.col.position.y = y / 2; } }
  // el palito (S): cae dentro de la taza y se queda apoyado
  { const sk = S.stick, vis = sh === 'S' || (sh === 'T' && t < SHT.T0 + 0.6); sk.visible = vis;
    if (vis) { const f = win(t, K.palito10 - 0.1, 0.45); sk.position.set(mx + 0.9, my + 0.75 + 16 * (1 - f) * (1 - f), mz - 0.6); sk.rotation.set(-0.12, 0.25, -0.22 - 0.5 * (1 - f)); } }
  bubblesAt(S.bub, t, v3(0.9, 1.2, -0.5), v3(2.2, 7.6, -1.4), 0, { rate: 0.55, scale: 0.55 });
  if (S.mac) macroAt(t, { pot: sh === 'K' ? 1 : 0, mug: sh === 'M' ? 1 : 0, stick: sh === 'S' ? 1 : 0 });
  // la cocina: el cazo en la placa (al rojo desde «calor»), hirviendo al final
  stoveAt(S.stove, t, { heat: sh === 'J' ? win(t, K.calor5 - 0.3, 0.6) : (['K', 'L', 'T', 'U'].includes(sh) ? 1 : 0), cut: 0, boil: sh === 'K' || sh === 'J' ? clamp((t - K.calor5) / 1.4) : (['T', 'L'].includes(sh) ? 0.8 : 0) });
  { const Us = S.stove.userData; Us.surf.material.envMapIntensity = sh === 'K' ? 0.1 : 1.6; for (const m of Us.potMats) m.envMapIntensity = (m.userData.env0 ?? 1) * ENV.env * (sh === 'K' ? 0.45 : 1); }
  // el micro por dentro (rayos X), el magnetrón que sube con el radar de la guerra, y las ondas
  if (S.xr) xrayAt(t, { open: (sh === 'D' ? win(t, SHT.D0 + 0.2, 0.9) : ['E', 'F'].includes(sh) ? 1 : sh === 'G' ? 1 - win(t, SHT.G0 + 0.4, 1.2) : 0),
    glow: ['D', 'E', 'F'].includes(sh) ? 1 : 0, hot: ['F', 'G'].includes(sh) ? 1 : 0.3, fan: running, lift: sh === 'E' ? win(t, SHT.E0 + 0.1, 0.8) * (1 - win(t, K.dispara3 - 0.45, 0.4)) : 0,
    radar: sh === 'E' ? win(t, K.radares2 - 0.1, 0.6) * (1 - win(t, K.mundial2 + 0.2, 0.35)) : 0, beam: sh === 'F' ? win(t, K.ondas3 - 0.1, 0.5) : 0 });
  else if (S.mag) { const e = sh === 'E'; S.mag.group.visible = e;
    if (e) { const up = win(t, SHT.E0 + 0.1, 0.8), G = S.mag.group; G.position.lerpVectors(v3(17, 15.5, -20), MAGLIFT, up); G.rotation.set(0, 0.4 * up, (1 - up) * Math.PI / 2); G.updateMatrixWorld(true);
      magnetronAt(t, { explode: win(t, K.pieza2, 1.0) * (1 - win(t, K.mundial2 - 0.1, 0.6)), cut: 0, glow: 0.4, electrons: 0, wave: 0 }); } }
  if (S.waves) magWavesAt(t, { on: sh === 'G' ? 1 : 0, flow: sh === 'G' ? clamp((t - SHT.G0) / 2.2) : 0 });
  // la carcasa se vuelve de cristal (si no hay módulo de rayos X)
  if (!S.xr) { const gk = sh === 'D' || sh === 'E' ? win(t, SHT.D0 + 0.3, 0.6) * (1 - win(t, K.dispara3 - 0.3, 0.4)) : 0; if (!THERM) U.shell.material.forEach((m, i) => { if (i < 2) { m.transparent = gk > 0; m.opacity = 1 - 0.85 * gk; m.depthWrite = gk < 0.5; } }); }
  if (S.mol) moleculesAt(t, { on: sh === 'I' ? clamp((t - SHT.I0) / 0.3 + 0.15) : 0, field: sh === 'I' ? win(t, K.intenta4, 0.4) : 0, heat: sh === 'I' ? clamp((t - K.giran4 + 0.2) / (K.calor4 - K.giran4 + 0.6)) : 0,
    dipole: sh === 'I' ? win(t, K.moleculas4, 0.3) * (1 - win(t, K.giran4 + 0.5, 0.4)) : 0 });
  // los avisos de la FDA: salen uno a uno alrededor del micro (Q)
  { const g = S.signs, vis = sh === 'Q'; g.visible = vis;
    if (vis) g.children.forEach((s, i) => { const k = pop(t, K.fda9 + 0.12 + i * 0.32, 0.45) * (1 - win(t, SHT.R0 - 0.4, 0.3)); s.scale.setScalar(Math.max(0.001, 9 * k)); s.position.copy(s.userData.p).add(v3(0, Math.sin(t * 2 + i) * 0.6, 0)); }); }
  // la mano: entra por la puerta abierta a coger la taza; le salta el agua y se aparta (Q)
  { const vis = sh === 'Q' && t > K.avisos9 - 0.3; S.hand.visible = vis;
    if (vis) { const hit = K.manos9 - 0.1, reach = win(t, K.avisos9 - 0.3, hit - K.avisos9 + 0.3), back = win(t, hit + 0.05, 0.3);
      const handle = S.mug.localToWorld(v3(6.2, 5.6, 0)), from = v3(22, 20, 22), F = handle.clone().sub(from).normalize();
      const B = v3(0.25, 1, 0.1); B.addScaledVector(F, -B.dot(F)).normalize(); const X = new THREE.Vector3().crossVectors(F, B);
      S.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, F, B)); S.hand.rotateX(-0.25 * back); S.hand.rotateZ(0.15);
      S.hand.position.copy(handle).addScaledVector(F, -(13.6 + 12 * (1 - reach) + 16 * back)).add(v3(1.5 * back, 2 * back, 0));
      handPose2(S.hand, [0.35 + 0.3 * reach - 0.4 * back, 0.3 + 0.45 * reach - 0.35 * back, 0.4 + 0.45 * reach - 0.35 * back, 0.5 + 0.4 * reach - 0.35 * back, 0.6 + 0.35 * reach - 0.35 * back]); } }
  // luces que siguen a lo que se mira
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
