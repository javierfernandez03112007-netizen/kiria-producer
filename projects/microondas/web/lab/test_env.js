async function labBuild() { const m = new THREE.Mesh(new THREE.BoxGeometry(48, 28, 36), new THREE.MeshPhysicalMaterial({ color: 0xb8bcc2, metalness: 0.9, roughness: 0.3 })); m.position.set(0, 14, -18); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const s = new THREE.Mesh(new THREE.SphereGeometry(5, 48, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 })); s.position.set(-32, 5, 8); s.castShadow = true; scene.add(s);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 9.5, 48), new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.12, clearcoat: 1 })); c.position.set(32, 4.75, 8); c.castShadow = true; scene.add(c); }
const ROTS = [0, 1.57, 3.14, 4.71];
function labAt(t) { const k = Math.round(t); envSet(ROTS[k % 4], ENV.bg, ENV.env, ENV.blur); return [0, 26, 150, 0, 12, -10, 28]; }
