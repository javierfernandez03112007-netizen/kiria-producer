// módulo de ejemplo: una esfera en el centro del cerebro
let DUMMY = null;
function buildDummy(head) { DUMMY = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), new THREE.MeshStandardMaterial({ color: 0xff8866, emissive: 0xff5522, emissiveIntensity: 0.5 })); DUMMY.position.set(0, 0.68, -0.12); head.add(DUMMY); }
