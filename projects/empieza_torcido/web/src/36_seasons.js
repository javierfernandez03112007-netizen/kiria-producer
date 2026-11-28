// ---------------------------------------------------------------- «Empieza torcido»: PÉTALOS (cuando sale, el árbol florece y el viento suelta pétalos hacia la cámara).
const FALL = { N: 380 };
let _dotT = null;
function dotTex() { if (_dotT) return _dotT; const c = cnv(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _dotT = new THREE.CanvasTexture(c); return _dotT; }
function buildFall(G) { const R = rng(91), n = FALL.N, pos = new Float32Array(n * 3); S.pet = [];
  for (let i = 0; i < n; i++) S.pet.push({ x: TREE.x + (R() - 0.5) * 2.4, y: 3.0 + R() * 1.8, z: TREE.z + (R() - 0.5) * 1.8, vx: 0.5 + R() * 0.9, vy: -0.25 - R() * 0.35, vz: 0.7 + R() * 1.1, ph: R() * 6.28, d: R() * 0.9 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xff6f9e, size: 0.085, map: dotTex(), transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }); const p = new THREE.Points(geo, m); p.frustumCulled = false; p.visible = false; G.add(p); S.petP = p; }
function fallAt(t) { const k = win(t, TT.bloom, 0.4); S.petP.visible = k > 0.01; S.petP.material.opacity = 0.95 * k; if (!S.petP.visible) return;
  const a = S.petP.geometry.attributes.position; S.pet.forEach((s, i) => { const u = Math.max(0, t - TT.bloom - s.d); a.setXYZ(i, s.x + s.vx * u + Math.sin(t * 2 + s.ph) * 0.12, s.y + s.vy * u + Math.sin(t * 1.3 + s.ph) * 0.06, s.z + s.vz * u); }); a.needsUpdate = true; }
