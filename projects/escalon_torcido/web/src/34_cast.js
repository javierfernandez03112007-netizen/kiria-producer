// ---------------------------------------------------------------- «El escalón torcido»: LOS PERSONAJES. A = el perfeccionista (abajo), B = otra persona igual que aparece
// al final en su sitio (bucle: «quien lleva meses esperando el momento perfecto»), T = el que actúa (arriba). La sala de siluetas del efecto foco (16, en 4 filas de 4),
// con ojos que se encienden cuando miran; pupitres; la camiseta vergonzosa; el cerebro dentro de la cabeza transparente.
const COL = { A: 0x8f9bab, T: 0xf2e5d1, sil: 0x1d2029 };
const AUD = { rows: [1.95, 2.55, 3.15, 3.75], xs: [-1.65, -0.55, 0.55, 1.65], rise: 0.14 };
function shirtTex() { return signTex(1024, 512, (c, W, H) => { c.fillStyle = '#ffe11a'; c.fillRect(0, 0, W, H);
    // corazón rosa con purpurina y un arcoíris encima (camiseta «vergonzosa» inventada: sin personas ni marcas reales)
    const cx = W / 2, cy = H * 0.56, s = 120; c.save(); c.translate(cx, cy);
    const rb = ['#ff3b3b', '#ff9a1f', '#2fd06b', '#2f8bff', '#a64dff']; rb.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 16; c.beginPath(); c.arc(0, -40, 175 - i * 16, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); });
    c.beginPath(); c.moveTo(0, s * 0.95); c.bezierCurveTo(-s * 1.6, -s * 0.1, -s * 0.7, -s * 1.15, 0, -s * 0.45); c.bezierCurveTo(s * 0.7, -s * 1.15, s * 1.6, -s * 0.1, 0, s * 0.95); c.fillStyle = '#ff4fa3'; c.fill();
    const R = rng(4); for (let i = 0; i < 260; i++) { const x = (R() - 0.5) * s * 2.4, y = (R() - 0.55) * s * 2; c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.85)' : 'rgba(255,200,240,0.9)'; c.fillRect(x, y, 3, 3); }
    c.restore();
    c.fillStyle = '#ff4fa3'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.fillText('¡ME ENCANTA!', cx, H * 0.18); }); }
function tshirt(p) { const J = p.userData.J, k = p.userData.k, t = shirtTex(); t.wrapS = THREE.RepeatWrapping; t.offset.x = 0.5;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }), ms = new THREE.MeshStandardMaterial({ color: 0xffe11a, roughness: 0.85 });
  const prof = [[0.124, -0.075], [0.134, 0.0], [0.119, 0.13], [0.143, 0.27], [0.149, 0.36], [0.126, 0.425], [0.077, 0.462], [0.05, 0.47]];
  const g = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 36); g.scale(1, 1, 0.72); g.computeVertexNormals(); const sh = pm(g, m); J.spine.add(sh);
  const sl = []; for (const n of ['L', 'R']) { const s = pm(limbG(0.046 * k, 0.04 * k, 0.11 * k), ms); J['sh' + n].add(s); sl.push(s); }
  return { sh, sl, set(k) { const v = Math.max(0.0001, k); sh.scale.setScalar(v); sh.visible = k > 0.002; for (const s of sl) { s.scale.setScalar(v); s.visible = k > 0.002; } } }; }
// cabeza transparente con el cerebro dentro (solo A)
function brainIn(p) { const J = p.userData.J, hd = p.userData.headMesh, HS = p.userData.HS; hd.material = hd.material.clone(); hd.material.transparent = true; p.userData.headM = hd.material;
  const g = new THREE.SphereGeometry(1, 48, 32), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i);
    const n = 1 + 0.07 * Math.sin(x * 14 + y * 6) * Math.sin(z * 12 - y * 9) + 0.05 * Math.sin(x * 23 + z * 17) - (Math.abs(x) < 0.08 ? 0.12 * (1 - Math.abs(x) / 0.08) : 0); q.setXYZ(i, x * n, y * n * 0.82, z * n * 1.05); }
  g.computeVertexNormals(); const m = new THREE.MeshStandardMaterial({ color: 0xf0a3b4, roughness: 0.45, emissive: 0xff5a7a, emissiveIntensity: 0 }); const b = new THREE.Mesh(g, m);
  b.scale.set(HS[0] * 0.78, HS[1] * 0.7, HS[2] * 0.82); b.position.set(0, p.userData.HY + HS[1] * 0.12, -HS[2] * 0.05); J.head.add(b); b.visible = false; return { b, m }; }
// silueta de la sala: maniquí oscuro sentado, con dos ojos que se encienden
function silhouette(i) { const p = mannequin({ h: 1.58 + hash(i * 3.1) * 0.12, mat: SILM }); const J = p.userData.J, HS = p.userData.HS, HY = p.userData.HY, eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), EYEM[i]); e.position.set(s * 0.036, HY + 0.012, HS[2] * 0.93); J.head.add(e); eyes.push(e); }
  p.userData.eyes = eyes; return p; }
let SILM = null; const EYEM = [];
function desk() { const g = new THREE.Group(), m = stdM(0x23262e, 0.7); g.add(box(0.62, 0.035, 0.42, m, 0, 0.7, 0)); for (const sx of [-1, 1]) g.add(box(0.035, 0.7, 0.36, m, sx * 0.28, 0.35, 0)); shadowAll(g); return g; }
const CAST = {};
function buildCast(G) {
  CAST.A = mannequin({ col: COL.A, h: 1.62, phase: 0.4 }); G.add(CAST.A); CAST.shirt = tshirt(CAST.A); CAST.shirt.set(0); CAST.brain = brainIn(CAST.A);
  CAST.B = mannequin({ col: COL.A, h: 1.62, phase: 0.4 }); G.add(CAST.B); CAST.B.visible = false;
  CAST.T = mannequin({ col: COL.T, h: 1.66, phase: 2.1 }); G.add(CAST.T);
  CAST.AM = CAST.A.userData.mat; CAST.A0 = new THREE.Color(COL.A); CAST.T0 = new THREE.Color(COL.T);
  // la sala: 16 siluetas sentadas mirando a la casa (de espaldas a la cámara del plano general), con pupitre
  SILM = new THREE.MeshStandardMaterial({ color: COL.sil, roughness: 0.75 }); CAST.aud = []; CAST.desks = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const i = r * 4 + c; EYEM.push(new THREE.MeshStandardMaterial({ color: 0x080808, emissive: 0xffb447, emissiveIntensity: 0 }));
    const p = silhouette(i), x = AUD.xs[c] + (hash(i * 7.7) - 0.5) * 0.18, z = AUD.rows[r] + (hash(i * 5.3) - 0.5) * 0.1, y = -0.15 + AUD.rise * r;
    p.position.set(x, y, z); p.rotation.y = Math.PI + (x - SEAT.x) * 0.06; p.userData.home = _v(x, y, z); p.userData.ry = p.rotation.y; G.add(p); CAST.aud.push(p);
    const d = desk(); d.position.set(x, y, z - 0.42); G.add(d); CAST.desks.push(d);
    const st = new THREE.Group(); ad(st, cyl(0.17, 0.17, 0.04, SILM, 16)).position.y = 0.44; ad(st, cyl(0.025, 0.025, 0.43, SILM, 8)).position.y = 0.215; st.position.set(x, y, z + 0.02); G.add(st); p.userData.seat = st; }
  // las miradas: una línea de luz de cada cabeza a A (se ven desde detrás de la sala, como en una figura de ingeniería)
  CAST.lines = []; const lg = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); lg.translate(0, 0.5, 0);
  for (let i = 0; i < 16; i++) { const m = new THREE.MeshBasicMaterial({ color: 0xffb447, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const l = new THREE.Mesh(lg, m); l.frustumCulled = false; l.renderOrder = 4; G.add(l); CAST.lines.push(l); }
  // una luz baja delante de la sala (lo que rebota del foco) para que se lean las siluetas
  CAST.audL = nightSrc(_v(0, 1.3, 1.9), 0xffd9a8, 0, 3.2, 'aud');
}
