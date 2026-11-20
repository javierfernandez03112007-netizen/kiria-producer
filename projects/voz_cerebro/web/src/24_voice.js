// ---------------------------------------------------------------- LA VOZ (en VOX), lámina «una voz propia»: el perfil de una cara hecho de partículas azules y moradas (mira a −x, a la izquierda de la pantalla)
// y la onda de colores que sale de su boca. Detrás de la cabeza, las grabaciones antiguas (vídeos) que alimentan la voz; arriba, la voz de robot que se tacha.
const VOX = new THREE.Vector3(-60, 0, 0);   // girada 90°: su «delante» (+z local) mira a +x, por donde llega la cámara desde el cerebro
function holoPanel(w, h, cw, ch, col = CYAN) { const g = new THREE.Group(), tex = canvasTex(cw, ch, null);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); g.add(p);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.4), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, toneMapped: false })); g.add(frame);
  g.userData = { tex, g: tex.userData.g, cw, ch, p, frame }; return g; }
function panelOp(P, a) { P.visible = a > 0.01; P.userData.p.material.opacity = a; P.userData.frame.material.opacity = 0.9 * a; }
const MONOF = '"SpaceMono","DejaVuMono",monospace';
function buildVoice(headGeo) { const g = new THREE.Group(), U = g.userData; g.position.copy(VOX); g.rotation.y = Math.PI / 2; g.updateMatrixWorld(true);
  // cara de partículas: puntos del escaneo, girados para mirar a −x; más densos y brillantes en el perfil
  const p = headGeo.attributes.position, n = p.count, pos = [], col = [], c = new THREE.Color(), R = rng(77);
  const cell = q => Math.floor(q / 0.035), key = (x, y, z) => cell(x) + ',' + cell(y) + ',' + cell(z), dens = new Map();
  for (let i = 0; i < n; i++) { const k = key(p.getX(i), p.getY(i), p.getZ(i)); dens.set(k, (dens.get(k) || 0) + 1); }
  let avg = 0; dens.forEach(v => avg += v); avg /= dens.size;
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < -0.95) continue; const rep = 1 + (R() > 0.5 ? 1 : 0), eq = Math.min(1.3, Math.sqrt(avg / dens.get(key(x, y, z)))), back = 1 - sm5(clamp((-z + 0.05) / 0.5));
    if (back <= 0.02 && R() > 0.25) continue;
    for (let r = 0; r < rep; r++) { const j = (R() - 0.5) * 0.012; pos.push(-z + j, y + j, x + j); const k = clamp((y + 0.6) / 1.6); c.setRGB(lerp(0.25, 0.55, k), lerp(0.55, 0.3, k), 1.0).multiplyScalar((0.7 + 0.5 * R()) * eq * (0.12 + 0.88 * back)); col.push(c.r, c.g, c.b); } }
  // polvo de partículas detrás de la cara (la nuca se deshace en polvo, como en la lámina): más denso cerca de la cabeza
  for (let i = 0; i < 9000; i++) { const u = Math.pow(R(), 1.6), x = -0.1 + u * 1.5, y = (R() - 0.45) * 2.2 * (0.85 + 0.3 * u), zz = (R() - 0.5) * 1.3 * (0.7 + 0.6 * u); pos.push(x, y, zz); c.setRGB(0.35, 0.45, 1).multiplyScalar((0.25 + 0.4 * R()) * (1 - 0.6 * u)); col.push(c.r, c.g, c.b); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  U.face = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.016, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: starTex0(), toneMapped: false })); g.add(U.face);
  // la boca (donde empieza la onda): el punto más adelantado de los labios
  let lip = null; for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (Math.abs(x) < 0.04 && y < -0.14 && y > -0.3 && (!lip || z > lip.z)) lip = { y, z }; }
  U.mouth = _v().set(-lip.z - 0.03, lip.y - 0.02, 0);
  const cols = [new THREE.Color(0.3, 0.95, 1.6), new THREE.Color(0.45, 0.5, 1.9), new THREE.Color(1.5, 0.4, 1.4), new THREE.Color(1.7, 0.95, 0.35)];
  U.waves = [0, 1, 2, 3, 4, 5].map(k => { const w = waveLine(900, cols, 0.024); g.add(w); return w; });
  // las grabaciones antiguas (tres vídeos) detrás de la cabeza y la onda que va de ellas a la cabeza
  U.films = [0, 1, 2].map(i => { const P = holoPanel(0.46, 0.3, 360, 236, new THREE.Color(1.0, 0.7, 0.35)); P.position.set(-1.12 + i * 0.5, -1.02 - (i === 1 ? 0.05 : 0), 0.3); g.add(P); return P; });
  U.feed = waveLine(500, [new THREE.Color(1.6, 0.9, 0.4), new THREE.Color(1.0, 0.6, 1.4)], 0.018); g.add(U.feed);
  U.robot = holoPanel(0.95, 0.38, 600, 240, new THREE.Color(1.0, 0.35, 0.3)); U.robot.position.set(-0.97, 0.55, 0.25); U.robot.scale.setScalar(0.8); g.add(U.robot);
  return g; }
function drawFilm(P, i, t, a) { const U = P.userData, c = U.g, w = U.cw, h = U.ch; c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(32,20,8,.8)'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,200,120,.10)'; for (let k = 0; k < 6; k++) c.fillRect(0, (k * 41 + t * 30) % h, w, 2);
  c.fillStyle = 'rgba(255,214,150,.85)'; const by = 150 + 3 * Math.sin(t * 7 + i); c.beginPath(); c.arc(115, by - 74, 32, 0, 7); c.fill(); c.beginPath(); c.ellipse(115, by + 24, 56, 50, 0, Math.PI, 0); c.fill();
  c.strokeStyle = 'rgba(255,200,120,.95)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < 140; x += 3) { const y = 118 + Math.sin(x * 0.2 + t * 9 + i) * 24 * Math.sin(x / 140 * Math.PI) * (0.6 + 0.4 * Math.sin(t * 3 + i)); x ? c.lineTo(195 + x, y) : c.moveTo(195 + x, y); } c.stroke();
  c.font = `700 22px ${MONOF}`; c.fillStyle = '#ffd08a'; c.fillText(['2019', '2020', '2021'][i], 14, 30); c.fillText('● REC', w - 90, 30); U.tex.needsUpdate = true; panelOp(P, a); }
function drawRobot(P, t, a, cross) { const U = P.userData, c = U.g, w = U.cw, h = U.ch; c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(40,8,8,.6)'; c.fillRect(0, 0, w, h);
  c.font = `700 26px ${MONOF}`; c.fillStyle = '#ff8a7a'; c.fillText('VOZ ROBÓTICA', 20, 36); c.strokeStyle = '#ff6a5a'; c.lineWidth = 4; c.beginPath(); let y;
  for (let x = 20; x < w - 20; x += 24) { y = hash(Math.floor(x / 24) + Math.floor(t * 8)) > 0.5 ? 110 : 180; c.lineTo(x, y); c.lineTo(x + 24, y); } c.stroke();
  if (cross > 0) { c.strokeStyle = '#ff3b30'; c.lineWidth = 14; c.lineCap = 'round'; const k = clamp(cross * 2), k2 = clamp(cross * 2 - 1); c.beginPath(); c.moveTo(60, 40); c.lineTo(60 + (w - 120) * k, 40 + (h - 80) * k); c.stroke(); if (k2 > 0) { c.beginPath(); c.moveTo(w - 60, 40); c.lineTo(w - 60 - (w - 120) * k2, 40 + (h - 80) * k2); c.stroke(); } }
  U.tex.needsUpdate = true; panelOp(P, a); }
