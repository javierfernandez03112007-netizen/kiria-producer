let MW, MG;
async function labBuild() { MW = buildMicrowave(); MW.position.set(0, 0, -6); scene.add(MW); microwaveAt(MW, { on: 0.4, turn: 0, display: '12:34' });
  MG = buildMug(); MG.position.set(36, 0, 6); scene.add(MG);
  const s = new THREE.Mesh(new THREE.SphereGeometry(4, 48, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 })); s.position.set(-34, 4, 8); s.castShadow = true; scene.add(s); }
const ROTS = (window.ROTS || '0,1.57,3.14,4.71').split(',').map(Number);
function labAt(t) { const k = Math.round(t); envSet(ROTS[k % ROTS.length], ENV.bg, ENV.env, ENV.blur); lightsAt(v3(0, 10, -10), 120); return [10, 30, 120, 0, 12, -14, 34]; }
