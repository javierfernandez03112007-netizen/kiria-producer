// ---------------------------------------------------------------- «¿Qué hace que alguien se pare?» (anuncio de kiriaai.com): un móvil gigante tumbado es el escenario.
// Por su pantalla corren publicaciones y los productos que van encima caen al vacío por el borde (la gente pasa de largo); la cinta se para;
// cae una foto, se sube, de ella sale el producto en 3D a una peana con focos; los vídeos del canal, la cámara que no existe, el contador,
// la barra del vídeo con el primer segundo, el rebobinado hasta el primer fotograma y kiriaai.com.
const BIG = { w: 1.5, l: 3.15, t: 0.075, sw: 1.42, sl: 3.07, r: 0.2 };   // móvil tumbado: ancho (x), largo (z), grosor; pantalla
const BSCR = { w: 600, h: Math.round(600 * BIG.sl / BIG.sw) };            // lienzo de la pantalla (arriba = −z, el borde de la cámara del móvil)
const TOPY = BIG.t + 0.0016;                                              // superficie de la pantalla
const FEED = { postH: 560, img0: 96, imgH: 400, top: 120 };              // publicaciones: alto, imagen (desde el borde de arriba de la publicación)
const PSF = 0.34;                                                          // escala de los productos que van en la cinta (unidades de la web → m)
const PEDP = v3(0, TOPY, 0.62);                                            // la peana del estudio (sobre la pantalla)
const FKINDS = ['caja', 'botella', 'lata', 'bolsa', 'taza'];
const POSTN = ['@tumarca', '@la_tienda', '@tu_negocio', '@mi_producto', '@tu_marca_es', '@nuevo_local'];
const POSTC = [[352, 0.7], [205, 0.55], [32, 0.75], [150, 0.45], [265, 0.5], [12, 0.6]];   // tono y saturación del fondo de cada publicación
const scrX = cx => (cx / BSCR.w - 0.5) * BIG.sw, scrZ = cy => (cy / BSCR.h - 0.5) * BIG.sl;    // lienzo → mundo (sobre la pantalla)
let THUMBS = [], PRIMER = null;

function buildBig() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.3, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.06 });
  const body = rbox(BIG.w, BIG.l, BIG.t, bodyM, BIG.r); body.rotation.x = -Math.PI / 2; body.position.y = BIG.t / 2; g.add(body);
  const rimM = metal(0xa3a9b3, 0.22);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(BIG.w + 0.012, BIG.l + 0.012, BIG.r), { depth: BIG.t * 0.45, bevelEnabled: false, curveSegments: 16 }), rimM);
  rim.rotation.x = -Math.PI / 2; rim.position.y = BIG.t * 0.28; rim.castShadow = true; g.add(rim);
  for (const [z, l] of [[-0.62, 0.34], [-0.2, 0.18], [0.02, 0.18]]) { const b = rbox(0.02, l, 0.03, rimM, 0.008); b.rotation.x = -Math.PI / 2; b.position.set(z < -0.5 ? BIG.w / 2 + 0.01 : -BIG.w / 2 - 0.01, BIG.t / 2, z); g.add(b); }
  const T = canvasTex(BSCR.w, BSCR.h); T.anisotropy = 16;
  const scr = new THREE.Mesh(rplane(BIG.sw, BIG.sl, BIG.r - 0.03), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) }));
  scr.rotation.x = -Math.PI / 2; scr.position.y = TOPY; scr.receiveShadow = true; g.add(scr);
  // cristal: un poco de reflejo de los focos
  const glass = new THREE.Mesh(rplane(BIG.sw + 0.02, BIG.sl + 0.02, BIG.r - 0.02), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false }));
  glass.rotation.x = -Math.PI / 2; glass.position.y = TOPY + 0.0012; g.add(glass);
  // sombra suave de lo que hay encima (no se ve en el negro, pero sí sobre la pantalla): plano que solo recibe sombras
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(BIG.sw, BIG.sl), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = TOPY + 0.0018; shadowCatcher.receiveShadow = true; g.add(shadowCatcher);
  g.traverse(o => { if (o.isMesh && o !== shadowCatcher && o !== scr) o.castShadow = true; });
  scene.add(g); S.big = g; S.bscrT = T;
}

// ---------------------------------------------------------------- la cinta de publicaciones: productos (copias que comparten geometría y materiales)
function buildFeedProducts() {
  S.fp = {};
  for (const k of ['tarro', ...FKINDS]) {
    const base = buildKind(k), arr = [base];
    for (let i = 0; i < 2; i++) arr.push(base.clone());
    for (const o of arr) { o.visible = false; scene.add(o); }
    S.fp[k] = arr;
  }
}

// ---------------------------------------------------------------- focos de estudio (caja de luz en un pie), la peana y la foto del estudio
function softbox() {
  const g = new THREE.Group(), dk = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, metalness: 0.4 });
  const leg = (a) => { const l = bar(v3(0, 0.02, 0), v3(Math.cos(a) * 0.16, 0.0, Math.sin(a) * 0.16), 0.008, dk); return l; };
  for (let i = 0; i < 3; i++) g.add(leg(i * 2.094 + 0.4));
  const pole = cyl(0.011, 0.011, 0.72, dk, 12); pole.position.y = 0.36; g.add(pole);
  const head = new THREE.Group(); head.position.y = 0.74; g.add(head);
  const box = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.07, 0.2, 4, 1, true), dk); box.rotation.set(Math.PI / 2, Math.PI / 4, 0); box.position.z = 0.1; head.add(box);
  const panelM = new THREE.MeshStandardMaterial({ color: 0x222428, emissive: 0xfff4e6, emissiveIntensity: 0, roughness: 0.9 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), panelM); panel.position.z = 0.2; head.add(panel);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { head, panelM }; return g;
}
function buildStudio() {
  buildPed(); S.ped.g.visible = false;
  S.lights = [-1, 1, 0].map((sd, i) => { const L = softbox(); scene.add(L); L.visible = false; L.userData.sd = sd; L.userData.i = i; return L; });
  // el tarro del estudio (el que sale de la foto)
  S.jar = buildKind('tarro'); S.jarC = new THREE.Group(); S.jarC.add(S.jar); scene.add(S.jarC); S.jarC.visible = false;
  buildFoto(); S.foto.root.visible = false;
  // la cámara de cine que no existe (cuerpo, dos bobinas, objetivo y trípode)
  const c = new THREE.Group(), cm = new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.35, metalness: 0.6, clearcoat: 0.6 }), mt = metal(0x9aa0a8, 0.25);
  const bd = rbox(0.34, 0.2, 0.14, cm, 0.02); bd.position.y = 0.66; c.add(bd);
  for (const x of [-0.08, 0.1]) { const r = cyl(0.085, 0.085, 0.05, cm, 32); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.position.set(x, 0.85, 0); c.add(r);
    const hub = cyl(0.025, 0.025, 0.055, mt, 16); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.85, 0); c.add(hub); }
  const lens = cyl(0.05, 0.06, 0.12, cm, 32); lens.rotation.x = Math.PI / 2; lens.position.set(0.05, 0.66, 0.13); c.add(lens);
  const ring = cyl(0.062, 0.062, 0.02, mt, 32); ring.rotation.x = Math.PI / 2; ring.position.set(0.05, 0.66, 0.19); c.add(ring);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; c.add(bar(v3(0, 0.56, 0), v3(Math.cos(a) * 0.22, 0.0, Math.sin(a) * 0.22), 0.01, mt)); }
  const cms = []; c.traverse(o => { if (o.isMesh) cms.push(o); }); for (const o of cms) { o.castShadow = true; edges(o, 0xeef2f6, 1.6, 30, 0.85); }
  scene.add(c); c.visible = false; S.filmCam = c;
  S.camSparks = sparks(scene, 140, 0xdfe8ff, 0.03);
  // «3,2 M» en 3D que sale de la pantalla
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc24a, metalness: 0.9, roughness: 0.22, clearcoat: 1, emissive: 0x3a2400, emissiveIntensity: 0.4 });
  S.big3 = text3('3,2 M', 0.36, 0.08, gold, { bevel: 0.01 }); S.big3.rotation.x = -Math.PI / 2; scene.add(S.big3); S.big3.visible = false;
}
