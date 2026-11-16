// prueba de 26_incidents.js: fondo de arena, los dos cables, la superficie vista desde abajo, rayos de luz y la niebla azul (moodSet('agua')).
// bash lab/lab.sh ../src/26_incidents.js test_incidents.js incidents 0.2 0.7 1.1 1.5 1.9 2.3 2.7 3.0 3.3 3.6 4.0 4.4
let INCG = null;
async function labBuild() {
  moodSet('agua');
  // fondo de arena (mismo relieve que el de la franja)
  const sandT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#efe2c2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const x = hash(i * 1.7) * w, y = hash(i * 3.1) * h; g.fillStyle = `rgba(${hash(i) > 0.5 ? '120,95,60' : '255,248,225'},${0.08 + hash(i * 5.3) * 0.12})`; g.fillRect(x, y, 2, 2); }
    g.strokeStyle = 'rgba(150,120,80,.18)'; g.lineWidth = 6; for (let y = 0; y < h; y += 36) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + 8 * Math.sin(x * 0.03 + y)); g.stroke(); } });
  sandT.wrapS = sandT.wrapT = THREE.RepeatWrapping; sandT.repeat.set(10, 9);
  const bg = new THREE.PlaneGeometry(56, 44, 140, 110); bg.rotateX(-Math.PI / 2); bg.translate(22, 0, 0);
  const p = bg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, seabedY(Math.max(0, p.getX(i)), p.getZ(i)) - SEA); bg.computeVertexNormals();
  const bed = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: 0xfff6e0, map: sandT, roughness: 0.95 })); bed.receiveShadow = true; scene.add(bed);
  // cable 1 (el nuestro), entero, medio enterrado
  const P1 = []; for (let x = 0; x <= 46; x += 0.5) P1.push(v3(x, seabedY(x, CABLE_Z) - SEA, CABLE_Z));
  const c1 = tube(P1, INC_R, new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.45, metalness: 0.15 }), 300, false, 10); c1.receiveShadow = true; scene.add(c1);
  // unas piedras y algas para la escala
  const rockM = new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.9 });
  [[13, -9, 0.5], [22, 10, 0.7], [24, -12, 0.6], [11, 2.5, 0.35], [17.5, 13, 0.45], [26, 3, 0.4]].forEach(([x, z, r], i) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), rockM); s.scale.set(1.3, 0.6, 1); s.position.set(x, seabedY(x, z) - SEA + r * 0.2, z); s.castShadow = s.receiveShadow = true; scene.add(s); });
  const weedM = new THREE.MeshStandardMaterial({ color: 0x3f8f5a, roughness: 0.7 });
  for (let i = 0; i < 26; i++) { const x = 10 + hash(i * 2.3) * 16, z = -14 + hash(i * 5.7) * 28; if (Math.abs(z - CABLE_Z) < 1 || Math.abs(z - CABLE2_Z) < 3) continue;
    const h = 0.5 + hash(i) * 0.9, pts = []; for (let k = 0; k <= 6; k++) pts.push(v3(x + 0.12 * Math.sin(k + i), seabedY(x, z) - SEA + h * k / 6, z + 0.1 * Math.cos(k * 1.3 + i))); scene.add(tube(pts, 0.035, weedM, 18, false, 6)); }
  // la superficie del agua vista desde abajo
  const surfT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7fcfe3'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = hash(i * 1.9) * w, y = hash(i * 4.3) * h, r = 18 + hash(i * 7) * 46; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(235,255,255,.5)'); gr.addColorStop(1, 'rgba(235,255,255,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); } } });
  surfT.wrapS = surfT.wrapT = THREE.RepeatWrapping; surfT.repeat.set(8, 6);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshBasicMaterial({ color: 0xbff2ff, map: surfT, side: THREE.DoubleSide }));
  surf.rotation.x = Math.PI / 2; surf.position.set(25, 0, 0); scene.add(surf);
  INCG = buildIncidents(); scene.add(INCG);
}
function labAt(t) {
  const u = clamp(t / 4.6);
  incidentsAt(t, { shark: clamp(u / 0.32), anchor: clamp((u - 0.22) / 0.46), snap: clamp((u - 0.68) / 0.14), net: clamp((u - 0.72) / 0.28) });
  return INC_CAM(u);
}
