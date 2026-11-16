async function labBuild() { const s = new THREE.Mesh(new THREE.SphereGeometry(4, 48, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 })); s.position.set(0, 10, 0); s.castShadow = true; scene.add(s); }
function labAt(t) { const k = Math.round(t); envSet(4.71, ENV.bg, ENV.env, ENV.blur); lightsAt(v3(0, 10, 0), 40);
  if (k === 4) return [0, 12, 16, 0, 10, 0, 40];
  const a = [[0, -1], [1, 0], [0, 1], [-1, 0]][k]; return [0, 14, 0, a[0] * 100, 14, a[1] * 100, 60]; }
