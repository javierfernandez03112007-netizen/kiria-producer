// ---------------------------------------------------------------- la cocina de verdad: el HDRI «Brown Photostudio 02» de Poly Haven (CC0: un loft blanco con su cocina,
// estanterías con botes y ventanales) da el fondo (desenfocado, como con un objetivo de cine) y la luz de todos los reflejos; encima va la encimera de madera
// (textura «kitchen_wood», CC0) y la luz de los ventanales (a la izquierda) con sombras suaves. Unidades: 1 = 1 cm; la encimera está en y = 0.
const _o = new THREE.Object3D();      // objeto de trabajo para las matrices de las instancias
const ASSET = '/projects/microondas/web/assets/';
const ENV = { file: 'brown_photostudio_02', rot: 4.71, bg: 0.07, env: 0.55, blur: 0.25, wb: [1, 1, 1] };   // plató oscuro: la cocina apenas se intuye detrás     // rot 4,71: detrás del micro, las estanterías de la cocina
const TEXL = new THREE.TextureLoader(), PENDING = [];
function tx(path, srgb = true, rep = null) { let ok, ko; PENDING.push(new Promise((a, b) => { ok = a; ko = b; })); const t = TEXL.load(ASSET + path, () => ok(), undefined, e => { console.error('ERROR textura ' + path); ok(); }); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
async function loadEnv() {
  const hdr = await new RGBELoader().loadAsync(ASSET + `ph/${window.ENVFILE || ENV.file}/${window.ENVFILE || ENV.file}_${window.ENVRES || '4k'}.hdr`); hdr.mapping = THREE.EquirectangularReflectionMapping;
  // balance de blancos (neutro con este HDRI)
  if (ENV.wb.some(v => v !== 1)) { const d = hdr.image.data, wb = ENV.wb, f = THREE.DataUtils; const half = d instanceof Uint16Array;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = half ? f.toHalfFloat(f.fromHalfFloat(d[i + c]) * wb[c]) : d[i + c] * wb[c];
    hdr.needsUpdate = true; }
  S.hdr = hdr; scene.background = hdr; scene.environment = hdr;
  envSet(ENV.rot, ENV.bg, ENV.env, ENV.blur);
}
function envSet(rot, bg, env, blur) {
  scene.backgroundRotation.set(0, rot, 0); scene.environmentRotation.set(0, rot, 0);
  scene.backgroundIntensity = bg; scene.environmentIntensity = env; scene.backgroundBlurriness = blur;
}
// la encimera (isla de madera barnizada) con su canto
function buildCounter() {
  const m = new THREE.MeshPhysicalMaterial({ map: tx('ph/kitchen_wood/kitchen_wood_Diffuse_2k.jpg', true, [10, 4]), normalMap: tx('ph/kitchen_wood/kitchen_wood_nor_gl_2k.jpg', false, [10, 4]),
    roughnessMap: tx('ph/kitchen_wood/kitchen_wood_Rough_2k.jpg', false, [10, 4]), aoMap: tx('ph/kitchen_wood/kitchen_wood_AO_2k.jpg', false, [10, 4]), roughness: 0.85, clearcoat: 0.45, clearcoatRoughness: 0.18, normalScale: new THREE.Vector2(0.6, 0.6) });
  const g = new THREE.BoxGeometry(180, 4, 110, 1, 1, 1); g.translate(-40, -2, -20); g.setAttribute('uv1', g.attributes.uv);
  const top = new THREE.Mesh(g, m); top.receiveShadow = true; top.castShadow = true; scene.add(top); S.counter = top;
  return top;
}
// luz de los ventanales (los del HDRI, a la izquierda y un poco por delante): sombras suaves; y un relleno frío muy suave
const WIN_DIR = new THREE.Vector3(-0.8, 0.55, 0.25).normalize();
function buildLights() {
  const key = new THREE.DirectionalLight(0xffe4c4, 2.0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0002;
  scene.add(key, key.target); const fill = new THREE.DirectionalLight(0xdbe6ff, 0.3); scene.add(fill, fill.target);
  const rim = new THREE.DirectionalLight(0x8fb6ff, 1.1); scene.add(rim, rim.target);                // contraluz frío: separa cada cosa del fondo oscuro
  S.L = { key, fill, rim };
}
// la sombra sigue a lo que mira la cámara (más fina cuanto más cerca)
function lightsAt(c, d) {
  const L = S.L, R = clamp(d * 0.7, 6, 120), sc = L.key.shadow.camera;
  L.key.position.copy(c).addScaledVector(WIN_DIR, 400); L.key.target.position.copy(c);
  sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = 400 - 3 * R - 30; sc.far = 400 + 3 * R + 60; sc.updateProjectionMatrix(); L.key.shadow.normalBias = R * 0.004;
  L.fill.position.copy(c).add(v3(0.3, 0.4, 1).multiplyScalar(300)); L.fill.target.position.copy(c);
  L.rim.position.copy(c).add(v3(0.5, 0.6, -1).multiplyScalar(300)); L.rim.target.position.copy(c);
}
// espera a que terminen de cargar todas las texturas e imágenes
// cada material con su propia intensidad de reflejos (con scene.environment, three.js ignora envMapIntensity): se le pone el HDRI a mano.
// k: factor extra (dentro del horno cerrado apenas llega la luz de la cocina)
function envMat(m, k = 1) { if (!m || !m.isMeshStandardMaterial || !S.hdr) return; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity;
  if (m.envMap !== S.hdr) { m.envMap = S.hdr; m.needsUpdate = true; } m.envMapRotation.set(0, ENV.rot, 0); m.envMapIntensity = m.userData.envFixed ?? m.userData.env0 * ENV.env * k; }
function envAll(root, k = 1) { root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) envMat(m, k); }); }
function waitLoads() { return Promise.all(PENDING); }
