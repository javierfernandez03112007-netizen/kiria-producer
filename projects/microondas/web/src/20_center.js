// ---------------------------------------------------------------- la escena y lo que pasa en cada frase. Cocina real (HDRI), microondas en la encimera, la taza dentro, la
// cocina eléctrica con el cazo al lado, el magnetrón y las moléculas (módulos aparte), la mano y el palito de madera.
const MW_POS = new THREE.Vector3(0, 0, -6), MAGUP = new THREE.Vector3(17.6, 34, -13);   // MAGUP: el magnetrón fuera, encima del micro
let MUGW = new THREE.Vector3();          // base de la taza en el mundo
async function buildScene() {
  S.mw = buildMicrowave(); S.mw.position.copy(MW_POS); scene.add(S.mw);
  const U = S.mw.userData; S.mug = buildMug(); S.mug.position.copy(U.plateC).add(v3(0, U.plateTop - U.plateC.y + 0.02, 0)).add(MW_POS); scene.add(S.mug); MUGW.copy(S.mug.position);
  S.splash = buildSplash(2600, 1); S.splash.position.copy(MUGW); scene.add(S.splash);      // el estallido no gira con el plato
  S.erupt = buildErupt(3); S.splash.add(S.erupt);
  S.coffee = buildCoffee(); S.mug.add(S.coffee);
  S.stick = buildStick(); S.stick.position.set(0.9, 0.75, -1.1); S.stick.rotation.set(-0.12, 0.25, -0.22); S.stick.visible = false; S.mug.add(S.stick);
  S.bub = buildBubbles(90); S.mug.add(S.bub);
  S.stove = await buildStove();
  if (typeof buildMagnetron === 'function') { S.mag = buildMagnetron(); scene.add(S.mag.group); S.mag.group.visible = false; }
  if (typeof buildMagWaves === 'function') { S.waves = buildMagWaves(); S.mw.add(S.waves.group); }
  if (typeof buildMolecules === 'function') { S.mol = buildMolecules(); scene.add(S.mol.group); }
  // la mano (piel real, la de «los dedos»): entra a coger la taza
  S.hand = realHand({ inside: false }); S.hand.scale.setScalar(7.2); S.hand.visible = false; scene.add(S.hand);      // mano de ≈ 19 cm
  S.hand.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry.type === 'CylinderGeometry') { o.scale.y = 3.2; o.position.y = HAND_Y0 - 1.2 * 3.2; } });   // antebrazo largo
  S.hand.userData.fingers.forEach(f => { f.bones[0].rotation.z = f.d.a * D2 * 0.35; });          // dedos juntos (mano que va a coger algo, no abierta)
  handPose2(S.hand, [0.35, 0.55, 0.65, 0.75, 0.85]);
  // reflejos: cada material con su HDRI; lo de dentro del horno, con menos (la caja de metal tapa la cocina)
  envAll(scene, 1); const IN = [U.M.enamel, U.mica.material, U.lampGrille.material]; U.plate.traverse(o => o.material && IN.push(o.material));
  S.inner = [...new Set(IN)]; S.innerRoots = [S.mug, S.splash];
}
function innerEnv(k) { for (const m of S.inner) envMat(m, k); for (const r of S.innerRoots) envAll(r, k); }
// mezcla suave entre a y b según u (0..1)
const mixv = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
// el estallido: τ (segundos reales) en cada momento. A cámara lenta: 1 s de vídeo ≈ 0,06 s de verdad
function tauAt(t) {
  if (t < SHT.B0) return 0.055;                                                                   // A: congelado en el aire (primer fotograma = último)
  if (t >= SHT.C0 && t < SHT.E0) return clamp((t - SHT.C0) * 0.075, 0, 0.11);                     // C–D: estalla hacia la cámara
  if (t >= SHT.P0 && t < SHT.Q0) return clamp((t - SHT.P0 - 0.05) * 0.06, 0, 0.13);               // P: al echar el café
  if (t >= SHT.Q0 && t < SHT.R0) return clamp((t - K.quemaduras9 + 0.25) * 0.06, 0, 0.13);        // Q: al coger la taza
  if (t >= SHT.U1) return 0.055 * clamp((t - SHT.U1) / (END - SHT.U1));                           // U: vuelve a estallar y se congela (bucle)
  return 0;
}
// el plato gira con el horno encendido (y la taza con él); en los estallidos (cámara lenta) apenas se mueve. R: el asa mira hacia delante a la derecha.
// En el corte (S) la taza va derecha (asa a la derecha) para que el corte coincida con su cara del agua.
function mugRot(t, sh) { const R = -0.6, w = 0.5;
  if (sh === 'B') return R - w * (SHT.C0 - t); if (sh === 'U') return R - w * Math.max(0, SHT.U1 - t);
  if (sh === 'G' || sh === 'H') return R + w * (t - SHT.G0); if (sh === 'N') return R + w * (t - SHT.N0); if (sh === 'S' || sh === 'M') return 0; return R; }
// ---------- vista térmica (como una cámara FLIR): cada cosa con el color de su temperatura (paleta «hierro»), en lineal para el ACES del final
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
  swap(S.mug, o => Um.surfMeshes.includes(o) ? water : mug);
  Um.surfMeshes[1].visible = !on; S.splash.visible = !on;
  S.thermBg = S.thermBg || new THREE.Color(0x04020e); scene.background = on ? S.thermBg : S.hdr;
}
const T_THERM = () => [K.microondas6 - 0.05, K.lisa6 - 0.35];
// ---------- dentro del agua (planos K y M): niebla azulada, la superficie vista desde abajo
let UNDER = 0;
function underwater(on, col = 0xc9dcdc, dens = 0.07) {
  const k = on ? 1 : 0; if (k === UNDER) return; UNDER = k;
  scene.fog = on ? new THREE.FogExp2(col, dens) : null;
  for (const m of S.mug.userData.surfMeshes.map(o => o.material)) { m.side = on ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; }
}
function stageAt(t, st) {
  NOW = t; const U = S.mw.userData, sh = shotAt(t);
  // el microondas: luz, plato, puerta, pantalla
  const doorOpen = (sh === 'O' || sh === 'P' || sh === 'Q' || sh === 'S') ? 1 : 0;
  const door = doorOpen ? (sh === 'O' ? win(t, K.pero8 - 0.1, 0.5) * 0.78 : 0.78) : 0;
  const on = doorOpen ? 0 : sh === 'U' ? win(t, SHT.U0, 0.6) : 1;
  const secs = Math.max(0, Math.ceil(60 - (t - 0.75) * 0.9)), disp = sh === 'R' || sh === 'S' ? (sh === 'R' ? `${t < SHT.R0 + 0.9 ? '1:00' : '0:5' + (9 - Math.floor((t - SHT.R0 - 0.9) / 0.9) % 10)}` : '1:00') : (on ? `0:${String(secs % 60).padStart(2, '0')}` : '12:34');
  const rot = mugRot(t, sh); S.mug.rotation.y = rot; microwaveAt(S.mw, { on, lamp: Math.max(on, doorOpen), turn: rot, door, display: disp });
  thermal(sh === 'L');
  // la taza: superficie, estallido, café, palito, burbujas, corte
  const tau = tauAt(t), doorShut = door < 0.05, mz = MUGW.z;
  if (!THERM) innerEnv(lerp(0.2, 0.6, clamp(door / 0.78)));
  { const dz = Math.abs(st.p.z - (-4.8)), near = door < 0.05 ? 1 - clamp((dz - 5) / 22) : 0; U.screen.material.opacity = 1 - near; U.veil.material.opacity = near * 0.55; }   // rejilla desenfocada de cerca
  const sdir = sh === 'Q' ? v3(0.1, 0.1, 1) : sh === 'P' ? v3(0.15, 0, 1) : v3(0, 0, 1);
  splashAt(S.splash, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null, frontZ: -6 - mz, floorOut: -MUGW.y, steam: 1, light: doorShut ? null : v3(0.2, 0.8, 0.55) });
  eruptAt(S.erupt, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null });
  const bulge = tau > 0 ? 0.35 * Math.exp(-Math.pow((tau - 0.012) / 0.02, 2)) : 0, crown = tau > 0 ? clamp(tau / 0.05) : 0;
  mugSurface(S.mug, t, { amp: tau > 0 ? 0.35 * clamp(tau / 0.02) : (sh === 'S' ? 0.03 : sh === 'L' ? 0.02 : 0.004), bulge, crown: crown * 0.4, rise: boilLevel(tau) });
  coffeeAt(S.coffee, sh === 'O' || sh === 'P' ? clamp((t - (K.echas8 - 0.1)) / (K.hierve8 - K.echas8 + 0.05)) : 0);
  S.stick.visible = sh === 'S';
  { S.stick.updateMatrix(); const A = v3(0, 1.2, 0.12).applyMatrix4(S.stick.matrix), B = v3(0, 7.3, 0.12).applyMatrix4(S.stick.matrix);      // las burbujas nacen en las vetas del palito
    bubblesAt(S.bub, t, A, B, sh === 'S' ? clamp((t - K.vetas10 + 0.3) / 1.2) : 0, { rate: 0.55, scale: 0.55 }); }
  mugCut(S.mug, sh === 'S' || sh === 'M');
  { const Um = S.mug.userData, calm = tau <= 0 && !THERM && sh !== 'S' && sh !== 'M'; Um.mirror.visible = calm; Um.surfMeshes[0].visible = !calm; Um.surfMeshes[1].visible = !calm && !THERM; }
  // la cocina: el cazo (placa al rojo, burbujas)
  stoveAt(S.stove, t, { heat: sh === 'J' ? win(t, K.calor5 - 0.2, 0.6) : (sh === 'K' || sh === 'W' ? 1 : 0), cut: 0, boil: sh === 'K' ? clamp((t - K.burbujas5 + 0.6) / 1.4) : (sh === 'W' ? 1 : 0) });
  // el magnetrón: primero en su sitio (detrás del panel, con la antena hacia la mica), sube fuera de la carcasa de cristal, se despieza («la pieza de
  // los radares…»), se vuelve a montar y se abre en corte («dispara ondas»: el cátodo al rojo, los electrones, las ondas por la antena)
  if (S.mag) { const e = sh === 'E' || sh === 'F'; S.mag.group.visible = e;
    if (e) { const up = win(t, K.magnetron2 + 0.25, 1.0), G = S.mag.group, A = v3(17, 15.5, -20), Bp = MAGUP;
      G.position.lerpVectors(A, Bp, up); G.rotation.set(0, lerp(0, 0.42, up) - 0.51 * win(t, SHT.F0, 0.6), (1 - up) * Math.PI / 2); G.updateMatrixWorld(true);
      magnetronAt(t, { explode: sh === 'E' ? win(t, K.pieza2, 1.0) * (1 - win(t, K.mundial2 - 0.1, 0.6)) : 0, cut: sh === 'F' ? win(t, K.dispara3 + 0.05, 0.5) : 0,
        glow: sh === 'F' ? 1 : 0.25 * up, electrons: sh === 'F' ? win(t, K.dispara3 + 0.3, 0.5) : 0, wave: sh === 'F' ? win(t, K.ondas3, 0.6) : 0 }); } }
  if (S.waves) magWavesAt(t, { on: sh === 'G' ? 1 : 0, flow: sh === 'G' ? clamp((t - SHT.G0) / 2.2) : 0 });
  // la carcasa del microondas se vuelve de cristal para enseñar el magnetrón
  { const gk = sh === 'E' || sh === 'F' ? win(t, K.magnetron2 - 0.2, 0.6) : 0; if (!THERM) U.shell.material.forEach((m, i) => { if (i < 2) { m.transparent = gk > 0; m.opacity = 1 - 0.85 * gk; m.depthWrite = gk < 0.5; } }); }
  if (S.mol) moleculesAt(t, { on: sh === 'I' ? clamp((t - SHT.I0) / 0.3 + 0.15) : 0, field: sh === 'I' ? win(t, K.intenta4, 0.4) : 0, heat: sh === 'I' ? clamp((t - K.giran4 + 0.2) / (K.calor4 - K.giran4 + 0.6)) : 0,
    dipole: sh === 'I' ? win(t, K.moleculas4, 0.3) * (1 - win(t, K.giran4 + 0.5, 0.4)) : 0 });
  // fondo: el HDRI de la cocina; nada en las moléculas (su esfera de agua lo tapa) y morado oscuro en la vista térmica
  { const want = THERM ? S.thermBg : sh === 'I' ? null : S.hdr; if (scene.background !== want) scene.background = want; }
  // la mano, en primera persona: entra desde abajo hacia el asa; al estallar, se retira de golpe
  { const vis = sh === 'Q'; S.hand.visible = vis;
    if (vis) { const hit = K.quemaduras9 - 0.25, reach = win(t, SHT.Q0 + 0.1, hit - SHT.Q0 - 0.1), back = win(t, hit + 0.05, 0.3);
      const handle = S.mug.localToWorld(v3(6.2, 5.6, 0)), from = v3(5, 17, 14), F = handle.clone().sub(from).normalize();
      const B = v3(0.25, 1, 0.1); B.addScaledVector(F, -B.dot(F)).normalize(); const X = new THREE.Vector3().crossVectors(F, B);
      S.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, F, B)); S.hand.rotateX(-0.25 * back); S.hand.rotateZ(0.15);
      S.hand.position.copy(handle).addScaledVector(F, -(13.6 + 12 * (1 - reach) + 14 * back)).add(v3(1.2 * back, -3 * back, 0));
      handPose2(S.hand, [0.35 + 0.3 * reach - 0.4 * back, 0.3 + 0.45 * reach - 0.35 * back, 0.4 + 0.45 * reach - 0.35 * back, 0.5 + 0.4 * reach - 0.35 * back, 0.6 + 0.35 * reach - 0.35 * back]); } }
  // luces de la cocina y su sombra alrededor de lo que se mira
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
