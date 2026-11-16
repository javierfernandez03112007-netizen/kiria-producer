// ---------------------------------------------------------------- la escena y lo que pasa en cada frase. Cocina real (HDRI), microondas en la encimera, la taza dentro, la
// cocina eléctrica con el cazo al lado, el magnetrón y las moléculas (módulos aparte), la mano y el palito de madera.
const MW_POS = new THREE.Vector3(0, 0, -6);
let MUGW = new THREE.Vector3();          // base de la taza en el mundo
async function buildScene() {
  S.mw = buildMicrowave(); S.mw.position.copy(MW_POS); scene.add(S.mw);
  const U = S.mw.userData; S.mug = buildMug(); S.mug.position.copy(U.plateC).add(v3(0, U.plateTop - U.plateC.y + 0.02, 0)).add(MW_POS); scene.add(S.mug); MUGW.copy(S.mug.position);
  S.splash = buildSplash(1500, 1); S.splash.position.copy(MUGW); scene.add(S.splash);      // el estallido no gira con el plato
  S.erupt = buildErupt(3); S.splash.add(S.erupt);
  S.coffee = buildCoffee(); S.mug.add(S.coffee);
  S.stick = buildStick(); S.stick.position.set(1.4, 0.75, 0.5); S.stick.rotation.set(0.1, 0.35, -0.2); S.stick.visible = false; S.mug.add(S.stick);
  S.bub = buildBubbles(90); S.mug.add(S.bub);
  S.stove = await buildStove();
  if (typeof buildMagnetron === 'function') { S.mag = buildMagnetron(); S.mag.group.position.copy(MW_POS).add(v3(17.6, 15.5, -17)); scene.add(S.mag.group); }
  if (typeof buildMagWaves === 'function') { S.waves = buildMagWaves(); S.mw.add(S.waves.group); }
  if (typeof buildMolecules === 'function') S.mol = buildMolecules();
  // la mano (piel real, la de «los dedos»): entra a coger la taza
  S.hand = realHand({ inside: false }); S.hand.scale.setScalar(7.2); S.hand.visible = false; scene.add(S.hand);      // mano de ≈ 19 cm
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
// el plato gira con el horno encendido (y la taza con él); en los estallidos (cámara lenta) apenas se mueve. R: el asa mira hacia delante a la derecha
function mugRot(t, sh) { const R = -0.6, w = 0.5;
  if (sh === 'B') return R - w * (SHT.C0 - t); if (sh === 'U') return R - w * Math.max(0, SHT.U1 - t);
  if (sh === 'G' || sh === 'H') return R + w * (t - SHT.G0); if (sh === 'N') return R + w * (t - SHT.N0); return R; }
const T_THERM = () => [K.microondas6 - 0.05, K.lisa6 - 0.35];
function stageAt(t, st) {
  NOW = t; const U = S.mw.userData, sh = shotAt(t);
  // el microondas: luz, plato, puerta, pantalla
  const doorOpen = (sh === 'O' || sh === 'P' || sh === 'Q' || sh === 'S') ? 1 : 0;
  const door = doorOpen ? (sh === 'O' ? win(t, K.pero8 - 0.1, 0.5) * 0.78 : 0.78) : 0;
  const on = doorOpen || sh === 'T' ? 0 : sh === 'U' ? win(t, SHT.U0, 0.6) : 1;
  const secs = Math.max(0, Math.ceil(60 - (t - 0.75) * 0.9)), disp = sh === 'R' || sh === 'S' ? '1:00' : (on ? `0:${String(secs % 60).padStart(2, '0')}` : '12:34');
  const rot = mugRot(t, sh); S.mug.rotation.y = rot; microwaveAt(S.mw, { on, lamp: Math.max(on, doorOpen), turn: rot, door, display: disp });
  // la taza: superficie, estallido, café, palito, burbujas, corte y vista térmica
  const tau = tauAt(t), doorShut = door < 0.05, mz = MUGW.z;
  innerEnv(lerp(0.2, 0.6, clamp(door / 0.78)));
  { const dz = Math.abs(st.p.z - (-4.8)), near = door < 0.05 ? 1 - clamp((dz - 5) / 22) : 0; U.screen.material.opacity = 1 - near; U.veil.material.opacity = near * 0.55; }   // rejilla desenfocada de cerca
  const sdir = sh === 'Q' ? v3(0.55, 0, 0.8) : sh === 'P' ? v3(0.15, 0, 1) : v3(0, 0, 1);
  splashAt(S.splash, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null, frontZ: -6 - mz, floorOut: -MUGW.y, steam: 1 });
  eruptAt(S.erupt, tau, { dir: sdir, floor: -0.05, wallZ: doorShut ? -6 - mz - 0.25 : null });
  const bulge = tau > 0 ? 0.35 * Math.exp(-Math.pow((tau - 0.012) / 0.02, 2)) : 0, crown = tau > 0 ? clamp(tau / 0.05) : 0;
  mugSurface(S.mug, t, { amp: tau > 0 ? 0.35 * clamp(tau / 0.02) : (sh === 'S' ? 0.03 : 0), bulge, crown });
  coffeeAt(S.coffee, sh === 'O' || sh === 'P' ? clamp((t - (K.echas8 - 0.1)) / (K.hierve8 - K.echas8 + 0.05)) : 0);
  S.stick.visible = sh === 'S'; bubblesAt(S.bub, t, v3(1.45, 1.2, 0.55), v3(2.6, 7.6, 1.5), sh === 'S' ? clamp((t - K.vetas10 + 0.3) / 1.2) : 0, { rate: 0.55, scale: 0.8 });
  mugCut(S.mug, sh === 'L' || sh === 'M');
  { const [a, b] = T_THERM(), k = sh === 'L' ? win(t, a + 0.2, 0.5) : 0, Um = S.mug.userData; Um.therm = k;
    Um.mat.emissive.setRGB(0.05 * k, 0.16 * k, 0.6 * k); Um.hmat.emissive.copy(Um.mat.emissive); Um.mat.emissiveIntensity = Um.hmat.emissiveIntensity = 1;
    const wbm = Um.waterBody.material; wbm.color.setRGB(lerp(0.44, 1.0, k), lerp(0.6, 0.42, k), lerp(0.65, 0.1, k)); wbm.emissive = wbm.emissive || new THREE.Color(); wbm.emissive.setRGB(1.6 * k * win(t, K.agua6 - 0.1, 0.5), 0.5 * k * win(t, K.agua6 - 0.1, 0.5), 0.05 * k); wbm.opacity = lerp(0.28, 0.85, k); }
  // la cocina: el cazo (placa al rojo, corte, burbujas)
  stoveAt(S.stove, t, { heat: sh === 'J' ? win(t, K.calor5 - 0.2, 0.6) : (sh === 'K' || sh === 'T' ? 1 : 0), cut: sh === 'K' ? 1 : 0, boil: sh === 'K' ? clamp((t - K.burbujas5 + 0.6) / 1.2) : (sh === 'T' ? 0.6 : 0) });
  // el magnetrón (fuera de la carcasa) y las ondas
  if (S.mag) { const e = ['E', 'F'].includes(sh), k = sh === 'E' ? win(t, K.magnetron2 + 0.15, 0.9) : 1; S.mag.group.visible = e;
    magnetronAt(t, { explode: sh === 'E' ? win(t, K.pieza2, 1.2) : 0.35, cut: sh === 'F' ? win(t, K.dispara3 + 0.1, 0.6) : 0, glow: sh === 'F' ? 1 : 0.4 * k, electrons: sh === 'F' ? win(t, K.dispara3 + 0.3, 0.5) : 0, wave: sh === 'F' ? win(t, K.ondas3, 0.5) : 0 });
    S.mag.group.position.copy(MW_POS).add(v3(17.6, 15.5 + 14 * k * (sh === 'E' ? 1 : 1), -17 + 10 * k)); }
  if (S.waves) magWavesAt(t, { on: sh === 'G' ? 1 : 0, flow: sh === 'G' ? win(t, SHT.G0, 0.8) : 0 });
  // la carcasa del microondas se vuelve de cristal para enseñar el magnetrón
  { const gk = sh === 'E' ? win(t, K.magnetron2 - 0.2, 0.6) : 0; U.shell.material.forEach((m, i) => { if (i < 2) { m.transparent = gk > 0; m.opacity = 1 - 0.85 * gk; m.depthWrite = gk < 0.5; } }); }
  if (S.mol) moleculesAt(t, { on: sh === 'I' ? 1 : 0, field: sh === 'I' ? win(t, K.intenta4, 0.4) : 0, heat: sh === 'I' ? clamp((t - K.giran4 + 0.2) / (K.calor4 - K.giran4 + 0.6)) : 0 });
  // la mano: entra por delante a la derecha hacia el asa; al estallar, salta hacia atrás
  { const vis = sh === 'Q'; S.hand.visible = vis;
    if (vis) { const hit = K.quemaduras9 - 0.25, reach = win(t, SHT.Q0 + 0.1, hit - SHT.Q0 - 0.1), back = win(t, hit + 0.05, 0.35);
      const F = v3(-0.62, -0.12, -0.77).normalize(), B = v3(0.18, 0.94, -0.29); B.addScaledVector(F, -B.dot(F)).normalize(); const X = new THREE.Vector3().crossVectors(F, B);
      S.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, F, B)); S.hand.rotateX(0.35 * back);
      const handle = S.mug.localToWorld(v3(6.2, 5.2, 0));
      S.hand.position.copy(handle).addScaledVector(F, -(14.2 + 11 * (1 - reach) + 16 * back)).add(v3(0, 5 * back, 0));
      handPose2(S.hand, [0.25 + 0.2 * reach - 0.3 * back, 0.35 + 0.25 * reach - 0.3 * back, 0.45 + 0.25 * reach - 0.3 * back, 0.55 + 0.2 * reach - 0.3 * back, 0.65 + 0.15 * reach - 0.3 * back]); } }
  // luces de la cocina y su sombra alrededor de lo que se mira
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
