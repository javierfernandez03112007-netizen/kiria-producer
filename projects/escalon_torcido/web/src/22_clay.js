// ---------------------------------------------------------------- «El escalón torcido»: MANIQUÍES DE ARCILLA (formato «Dos vidas», engine/FORMATO_DOS_VIDAS.md).
// Mismas articulaciones que person() de 21_folk.js (pelvis, spine, chest, neck, head, shL/elL/wrL…, hpL/knL/anL…), así sirven sus poses y la
// cinemática inversa (reachTo). Sin cara, ni pelo, ni ropa: una sola arcilla mate (cálida y erguido el que actúa; gris azulada y encorvado el otro).
function clayMat(c) { return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.62, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.5), clearcoat: 0.15, clearcoatRoughness: 0.6 }); }
function mannequin(o = {}) {
  const h = o.h ?? 1.62, k = h / 1.72, m = o.mat ?? clayMat(o.col ?? 0xf1e6d6);
  const root = new THREE.Group(), J = {}; root.userData = { J, k, h, seed: o.seed ?? 1, phase: o.phase ?? 0, mat: m };
  const jt = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const pel = jt('pelvis', root, 0, 0.9 * k, 0), spine = jt('spine', pel, 0, 0.0, 0), chest = jt('chest', spine, 0, 0.27 * k, 0), neck = jt('neck', chest, 0, 0.19 * k, 0), head = jt('head', neck, 0, 0.07 * k, 0);
  root.userData.base = { pelY: 0.9 * k };
  // tronco torneado (cadera → cintura → pecho → hombros), aplanado
  const prof = [[0.0, -0.07], [0.118, -0.07], [0.128, 0.0], [0.112, 0.13], [0.136, 0.27], [0.142, 0.36], [0.118, 0.425], [0.07, 0.46], [0.04, 0.47], [0.0, 0.47]];
  const tg = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 36); tg.scale(1, 1, 0.7); tg.computeVertexNormals(); const torso = pm(tg, m); spine.add(torso); root.userData.torso = torso;
  const hip = pm(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), m); hip.scale.set(0.122 * k, 0.11 * k, 0.088 * k); hip.position.y = -0.04 * k; pel.add(hip);
  const nk = pm(new THREE.CylinderGeometry(0.036 * k, 0.044 * k, 0.13 * k, 18), m); nk.position.y = 0.02 * k; neck.add(nk);
  // cabeza: huevo liso, algo más grande que la de una persona (se lee de lejos); sin cara
  const HS = [0.105 * k, 0.128 * k, 0.112 * k], HY = 0.115 * k;
  const hd = pm(headGeo(), m); hd.scale.set(...HS); hd.position.y = HY; head.add(hd); root.userData.headMesh = hd; root.userData.HS = HS; root.userData.HY = HY;
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const sh = jt('sh' + n, chest, s * 0.128 * k, 0.128 * k, 0); sh.add(pm(new THREE.SphereGeometry(0.04 * k, 16, 12), m));
    sh.add(pm(limbG(0.038 * k, 0.03 * k, 0.26 * k), m));
    const el = jt('el' + n, sh, 0, -0.27 * k, 0); el.add(pm(limbG(0.031 * k, 0.024 * k, 0.23 * k), m));
    const wr = jt('wr' + n, el, 0, -0.24 * k, 0); const hand = pm(new THREE.SphereGeometry(1, 16, 12), m); hand.scale.set(0.028 * k, 0.048 * k, 0.018 * k); hand.position.y = -0.04 * k; wr.add(hand);
    const th = pm(limbG(0.01 * k, 0.008 * k, 0.034 * k), m); th.position.set(-s * 0.018 * k, -0.012 * k, 0.012 * k); th.rotation.z = s * 0.7; wr.add(th);
    sh.rotation.z = s * 0.06; el.rotation.x = -0.12; }
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const hp = jt('hp' + n, pel, s * 0.07 * k, -0.04 * k, 0); hp.add(pm(limbG(0.066 * k, 0.046 * k, 0.4 * k), m));
    const kn = jt('kn' + n, hp, 0, -0.42 * k, 0); kn.add(pm(limbG(0.046 * k, 0.032 * k, 0.38 * k), m));
    const an = jt('an' + n, kn, 0, -0.41 * k, 0); const ft = pm(new THREE.SphereGeometry(1, 18, 12), m); ft.scale.set(0.04 * k, 0.034 * k, 0.105 * k); ft.position.set(0, -0.02 * k, 0.045 * k); an.add(ft); }
  return root; }
// encorvado (el perfeccionista): espalda y cuello hacia delante, hombros caídos
function poseHunch(p, k = 1) { const J = p.userData.J; J.spine.rotation.x += 0.22 * k; J.chest.rotation.x += 0.12 * k; J.neck.rotation.x += 0.2 * k; J.head.rotation.x += 0.14 * k; J.shL.rotation.z -= 0.05 * k; J.shR.rotation.z += 0.05 * k; }
// pulir: las dos manos sobre el bloque (en coordenadas del mundo), la derecha frota en círculos
function posePolish(p, blockW, t, speed = 1, amp = 1) { const ph = t * 5.2 * speed, c = Math.cos(ph), s = Math.sin(ph);
  reachTo(p, 'R', blockW.clone().add(_v(0.05 + 0.05 * c * amp, 0.045 + 0.012 * s * amp, 0.03 + 0.06 * s * amp)), 1, _v(0, -1, -0.6));
  reachTo(p, 'L', blockW.clone().add(_v(-0.02, 0.035, -0.09)), 1, _v(0, -1, -0.6)); }
// arrodillado (para tender la mano por la trampilla)
function poseKneel(p, k = 1) { const J = p.userData.J, kk = p.userData.k; J.pelvis.position.y = lerp(p.userData.base.pelY, 0.5 * kk, k); J.hpL.rotation.x = -1.25 * k; J.knL.rotation.x = 1.25 * k; J.hpR.rotation.x = 0.1 * k; J.knR.rotation.x = 1.55 * k; J.anR.rotation.x = 0.4 * k; J.spine.rotation.x = 0.55 * k; J.neck.rotation.x = 0.35 * k; }
