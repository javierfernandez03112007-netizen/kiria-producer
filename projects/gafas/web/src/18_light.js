// ---------------------------------------------------------------- la luz: rayos del sol, el espectro (colores + ultravioleta), el rebote en la nieve,
// el ojo, las ondas (luz que vibra en todas direcciones / reflejo que vibra en horizontal) y la rejilla del filtro polarizado
const LI = {};
const SPEC = [0xff3b3b, 0xff8a1f, 0xffd31a, 0x3ddc5a, 0x22c6e8, 0x3d6dff, 0x8b4dff];      // rojo → violeta
const UVC = 0xb98cff;
// rayo: línea gruesa que se dibuja de A a B (drawK) con un pulso de luz que viaja por ella
function beam(pts, color, width = 3, dashed = false) {
  const m = lineMat(color, width, 1, dashed); if (dashed) { m.dashSize = 0.06; m.gapSize = 0.05; m.dashScale = 1; }
  const l = polyline(pts, m); l.userData.nseg = pts.length - 1; l.frustumCulled = false; l.userData.pts = pts; return l;
}
// pulsos: puntos de luz que viajan por los rayos ya dibujados (en el sentido de la luz)
const PULSES = [];
function pulseOn(l, color, n = 2, speed = 0.6) { for (let i = 0; i < n; i++) PULSES.push({ l, c: new THREE.Color(color).multiplyScalar(3.2), ph: i / n + hash(PULSES.length * 3.7) * 0.3, speed }); }
function buildPulses() { LI.pulse = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), Math.max(1, PULSES.length)); LI.pulse.frustumCulled = false; scene.add(LI.pulse); PULSES.forEach((p, i) => LI.pulse.setColorAt(i, p.c)); }
function pulsesAt(t) {
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(); let n = 0;
  for (const p of PULSES) { const l = p.l, k = l.userData.k || 0; if (!l.visible || k < 0.05) continue; let o = l; let vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; } if (!vis) continue;
    const pts = l.userData.pts, u = ((t * p.speed + p.ph) % 1) * k, f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), w = l.localToWorld(pts[i].clone().lerp(pts[i + 1], f - i));
    const d = w.distanceTo(cam.position), s = Math.max(0.012, d * 0.0075); M.compose(w, Q, v3(s, s, s)); LI.pulse.setMatrixAt(n, M); LI.pulse.setColorAt(n, p.c); n++; }
  LI.pulse.count = n; LI.pulse.instanceMatrix.needsUpdate = true; if (LI.pulse.instanceColor) LI.pulse.instanceColor.needsUpdate = true;
}
function segPts(a, b, n = 24) { const p = []; for (let i = 0; i <= n; i++) p.push(a.clone().lerp(b, i / n)); return p; }
function buildLight() {
  const Z = new THREE.Group(); scene.add(Z); LI.Z = Z;
  // 1) del cielo y del suelo: rayos del sol que bajan al esquiador y rayos que rebotan en la nieve hacia sus gafas
  const G = wpos(SK.gog);                                 // gafas del esquiador
  LI.sky = []; LI.ground = [];
  for (let i = 0; i < 5; i++) { const off = v3((i - 2) * 0.16, (hash(i * 3.1) - 0.5) * 0.2, (hash(i * 5.7) - 0.5) * 0.3); const a = G.clone().add(off).addScaledVector(SUN_DIR, 22), b = G.clone().add(off.clone().multiplyScalar(0.25));
    const l = beam(segPts(a, b, 40), 0xffb22e, 6); Z.add(l); LI.sky.push(l); pulseOn(l, 0xffd27a, 2, 0.5); }
  for (let i = 0; i < 5; i++) { const gp = v3(G.x + 1.3 + i * 0.32, 0, G.z - 0.3 + (i - 2) * 0.42); gp.y = groundH(gp.x, gp.z) + 0.02; const a = gp.clone().addScaledVector(SUN_DIR, 18);
    const l1 = beam(segPts(a, gp, 30), 0xffb22e, 5.5), l2 = beam(segPts(gp, G.clone().add(v3(0, -0.02, (i - 2) * 0.03)), 24), 0xff8a1f, 5.5); Z.add(l1, l2); LI.ground.push([l1, l2, gp]); pulseOn(l1, 0xffd27a, 1, 0.6); pulseOn(l2, 0xffa040, 1, 0.8); }
  // 2) el espectro: el rayo blanco del sol atraviesa un cristal de hielo y se abre en colores; la ultravioleta va aparte (no se ve: discontinua)
  const C = v3(-3.5, 9.5, -5.0); LI.prismC = C;
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 6), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, metalness: 0, roughness: 0.02, transmission: 0, transparent: true, opacity: 0.45, clearcoat: 1, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false }));
  prism.position.copy(C); prism.rotation.set(0.4, 0.3, 1.2); edges(prism, 0xdff0ff, 1.8, 20, 0.9); Z.add(prism); LI.prism = prism;
  const inA = C.clone().addScaledVector(SUN_DIR, 60); LI.white = beam(segPts(inA, C, 40), 0xfff6e0, 8); Z.add(LI.white); pulseOn(LI.white, 0xffffff, 3, 0.4);
  LI.spec = []; const land = v3(2.6, 0, 1.2);
  const dirs = [];
  for (let i = 0; i < 8; i++) {           // 0..6 colores, 7 = ultravioleta (más desviada que el violeta)
    const f = i / 7, end = land.clone().add(v3(lerp(-2.6, 2.4, f), 0, lerp(1.6, -1.6, f))); end.y = groundH(end.x, end.z) + 0.03;
    const l = beam(segPts(C, end, 40), i < 7 ? SPEC[i] : UVC, i < 7 ? 5 : 4.5, i === 7); Z.add(l); LI.spec.push(l); dirs.push(end); pulseOn(l, i < 7 ? SPEC[i] : UVC, 1, 0.45);
  }
  LI.landPts = dirs;
  // rebote en la nieve: la ultravioleta vuelve hacia arriba (8 de cada 10 rayos discontinuos)
  LI.eye = buildEye(); LI.eye.position.set(3.4, 2.75, 2.0); LI.eye.lookAt(v3(3.9, 0, 2.6)); LI.eye.scale.setScalar(0.55); Z.add(LI.eye);
  LI.uvUp = [];
  for (let i = 0; i < 10; i++) { const gp = v3(2.9 + (i % 5) * 0.28, 0, 1.75 + Math.floor(i / 5) * 0.5); gp.y = groundH(gp.x, gp.z) + 0.03;
    const down = beam(segPts(gp.clone().addScaledVector(SUN_DIR, 9), gp, 24), UVC, 4.2, true), up = beam(segPts(gp, LI.eye.position.clone().add(v3((hash(i) - 0.5) * 0.12, (hash(i * 2) - 0.5) * 0.12, 0)), 24), UVC, 4.2, true);
    Z.add(down, up); LI.uvUp.push([down, up, i < 8]); pulseOn(down, UVC, 1, 0.7); if (i < 8) pulseOn(up, UVC, 1, 0.7); }
  // 3) ondas: la luz vibra en todas direcciones; el reflejo del hielo, en horizontal
  LI.waves = []; for (let i = 0; i < 6; i++) { const l = drawLine(segPts(v3(), v3(1, 0, 0), 140), i === 0 ? 0xfff0c8 : 0xffe2a8, 3.2, 1); Z.add(l); LI.waves.push(l); }
  // 4) haz de 100 «fotones» para la categoría 3 (pasan 18)
  LI.ph = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.8).multiplyScalar(3), toneMapped: false }), 100);
  LI.ph.frustumCulled = false; Z.add(LI.ph);
}
// ojo: esclerótica, iris, pupila y córnea (que se enrojece con la ultravioleta)
function buildEye() {
  const g = new THREE.Group();
  const irisT = canvasTex(256, 256, (c, w, h) => { const r = c.createRadialGradient(128, 128, 20, 128, 128, 128); r.addColorStop(0, '#0a0a0a'); r.addColorStop(0.28, '#0a0a0a'); r.addColorStop(0.3, '#2d6a8f'); r.addColorStop(0.75, '#5fa7c9'); r.addColorStop(0.95, '#1d3c55'); r.addColorStop(1, '#0d1a24'); c.fillStyle = r; c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.35; for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; c.strokeStyle = i % 2 ? '#9fd4ea' : '#16384f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40); c.lineTo(128 + Math.cos(a) * 120, 128 + Math.sin(a) * 120); c.stroke(); } });
  const scl = new THREE.MeshPhysicalMaterial({ color: 0xf4efe9, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05 });
  g.add(sph(0.5, scl, 48, 32));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 2, 0, 0.55), new THREE.MeshStandardMaterial({ map: irisT, roughness: 0.4 })); iris.rotation.x = Math.PI / 2; iris.scale.setScalar(1.004); g.add(iris);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.26, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.25, clearcoat: 1, emissive: 0xff2a1a, emissiveIntensity: 0, depthWrite: false }));
  cornea.rotation.x = Math.PI / 2; cornea.position.z = 0.33; g.add(cornea); g.userData.cornea = cornea;
  const burn = new THREE.Mesh(new THREE.SphereGeometry(0.505, 48, 32), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); g.add(burn); g.userData.burn = burn;
  return g;
}
// onda: de A a B, vibrando en la dirección u, con amplitud amp y fase
function setWave(l, A, B, u, amp, ph, k = 1, cut = 1) {
  const n = 140, pos = [], d = B.clone().sub(A);
  for (let i = 0; i <= n; i++) { const f = i / n, a = (f <= cut ? amp : amp * Math.max(0, 1 - (f - cut) * 60)); const p = A.clone().addScaledVector(d, f).addScaledVector(u, Math.sin(f * 26 - ph) * a); pos.push(p.x, p.y, p.z); }
  l.geometry.setPositions(pos); drawK(l, k);
}
