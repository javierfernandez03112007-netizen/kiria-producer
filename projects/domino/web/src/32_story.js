// ---------------------------------------------------------------- «El efecto dominó»: LA HISTORIA (sin voz; 21,5 s; todo se mueve siempre).
// Plano muy cercano: una ficha de 1,5 cm y un dedo enorme que la empuja → la ola de fichas cada vez más grandes, con la cámara corriendo a su lado y alejándose
// a la vez que crecen → la última, de 12 m, cae hacia la cámara a cámara lenta y levanta polvo → la cámara vuelve volando por encima de la cadena hasta la
// persona que empujó la primera, pequeña al principio de todo. Arriba: «LO PEQUEÑO / MUEVE LO ENORME.»
let TL = {};
const TT = { push: 1.25, d0: 0.32, dg: 1.095, lastFall: 2.6 };
MOODS.domino = { zen: 0x000000, hor: 0x060606, gnd: 0x000000, sunD: [0.2, 0.3, -0.9], sunC: 0x000000, sunS: 0.0, stars: 0.0, clouds: 0.0, fogC: 0x000000, fogD: 0.012,
  key: [0xffffff, 2.6], keyD: [0.32, 0.82, 0.48], fill: [0xffffff, 0.22], hemi: [0xffffff, 0x000000, 0.1], env: 0.32, exp: 1.0 };
const CAST = {};
async function buildScene() {
  TL = { end: END, ...TT };
  const G = new THREE.Group(); scene.add(G); S.G = G;
  buildDominoes(G); buildMirror(G); buildBlackFloor(G); buildFigure(G); buildHand(G); buildDust(G);
  buildCamPath();
  S.flow = [];
  envAll(scene); nightify(scene); NIGHT.on = true;
  S.L.fillD.set(-0.6, 0.35, 0.72);
}
// suelo negro brillante, algo transparente: debajo, una copia boca abajo de las fichas hace de reflejo (barato y sin errores de profundidad)
function buildBlackFloor(G) { const m = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.86 });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), m); f.rotation.x = -Math.PI / 2; f.position.set(10, 0, 0); f.receiveShadow = true; f.renderOrder = 1; G.add(f); S.floor = f; }
function buildMirror(G) { const M = new THREE.Group(); M.scale.y = -1; G.add(M); S.mirror = [];
  for (const g of DOM.g) { const c = g.clone(true); c.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } }); M.add(c); S.mirror.push(c); } }
// la persona: arrodillada junto a la primera ficha, con un dedo (un cilindro) en la mano derecha
function buildHand(G) { const m = CAST.A.userData.mat, H = new THREE.Group(); G.add(H); CAST.hand = H;
  // la yema del índice está en el origen del grupo; el dedo apunta a +x y el antebrazo se va hacia −x
  const idx = pm(limbG(0.0095, 0.0078, 0.07), m); idx.rotation.z = Math.PI / 2; idx.position.set(-0.07, 0, 0); H.add(idx);
  const palm = pm(new THREE.SphereGeometry(1, 24, 16), m); palm.scale.set(0.05, 0.022, 0.04); palm.position.set(-0.11, -0.004, -0.012); H.add(palm);
  for (const [z, a] of [[-0.018, 0.0], [-0.032, 0.15], [-0.044, 0.3]]) { const f = pm(new THREE.SphereGeometry(1, 14, 10), m); f.scale.set(0.022, 0.012, 0.01); f.position.set(-0.078, -0.016 - a * 0.02, z); H.add(f); }
  const th = pm(limbG(0.009, 0.007, 0.04), m); th.rotation.set(0, 0.5, 1.2); th.position.set(-0.095, -0.008, 0.02); H.add(th);
  const arm = pm(limbG(0.034, 0.027, 0.3), m); arm.rotation.z = -Math.PI / 2; arm.position.set(-0.145, -0.004, -0.012); H.add(arm);
  shadowAll(H, true, true); }
function buildFigure(G) { const A = mannequin({ col: 0xd9d9d9, h: 1.7, phase: 0.3 }); G.add(A); CAST.A = A; const J = A.userData.J, k = A.userData.k;
  const fm = A.userData.mat, f = pm(limbG(0.0085 * k, 0.007 * k, 0.06 * k), fm); f.position.set(0.004, -0.075 * k, 0.006); f.rotation.x = -0.15; J.wrR.add(f); CAST.finger = f; }
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); moodMix({ domino: 1 }); post.uniforms.ca.value = 0; animAt(t, st); }
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
