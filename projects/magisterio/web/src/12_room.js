// ---------------------------------------------------------------- el aula: suelo de terrazo, paredes con zócalo, tres ventanas con sol (izquierda),
// pizarra con abecedario (fondo), puerta con cartel, calendario y corcho (derecha), estanterías (delante), cinco mesas con 25 sillitas,
// rincón de matemáticas (ábaco), rincón de lectura (alfombra y estantería de cuentos), tallímetro y mesa de la maestra.
const TABLES = [[0, 0], [-1.8, -0.95], [1.8, -0.95], [-1.75, 1.35], [1.75, 1.35]];
const SEATS = [];          // 25 sitios: [x, z, giro] (5 por mesa: dos por cada lado largo y uno en la cabecera)
for (const [tx, tz] of TABLES) {
  for (const sx of [-0.3, 0.3]) { SEATS.push([tx + sx, tz + 0.5, Math.PI]); SEATS.push([tx + sx, tz - 0.5, 0]); }
  SEATS.push([tx + (tx > 0 ? 0.78 : -0.78), tz, tx > 0 ? -Math.PI / 2 : Math.PI / 2]);
}
const WIN_Z = [-2.05, 0.05, 2.15], WIN_Y0 = 0.95, WIN_Y1 = 2.6, WIN_W = 1.3;
const SUN_DIR = new THREE.Vector3(1, -0.82, -0.3).normalize();
function wallBox(x, y, z, w, h, d, m = M.wall) { const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; }
function buildRoom() {
  const R = S.room = {};
  // suelo y techo
  const fl = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.floor, false); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  const ce = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.ceil, false); ce.rotation.x = Math.PI / 2; ce.position.y = RH; scene.add(ce);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const p = mesh(new THREE.BoxGeometry(1.2, 0.03, 0.3), new THREE.MeshStandardMaterial({ color: 0xf4f2ec, emissive: 0xfff6e8, emissiveIntensity: 0.25, roughness: 0.6 }), false); p.position.set(-2.4 + i * 2.4, RH - 0.02, -1.4 + j * 2.8); scene.add(p); }
  // pared del fondo (pizarra), delante y derecha: yeso arriba, zócalo pintado abajo (hasta 1,0 m) con una moldura
  const T = 0.12;
  for (const [x, z, w, d] of [[0, -RZ - T / 2, 2 * RX + 2 * T, T], [0, RZ + T / 2, 2 * RX + 2 * T, T]]) { wallBox(x, RH / 2, z, w, RH, d); wallBox(x, 0.5, z + (z < 0 ? T / 2 + 0.004 : -T / 2 - 0.004), w - 0.02, 1.0, 0.008, M.wallLow); }
  // derecha, con el hueco de la puerta (z 0,85…1,75, hasta 2,1 m)
  const DZ0 = 0.85, DZ1 = 1.75, DH = 2.1;
  wallBox(RX + T / 2, RH / 2, (-RZ + DZ0) / 2, T, RH, DZ0 + RZ); wallBox(RX + T / 2, RH / 2, (DZ1 + RZ) / 2, T, RH, RZ - DZ1); wallBox(RX + T / 2, (DH + RH) / 2, (DZ0 + DZ1) / 2, T, RH - DH, DZ1 - DZ0);
  for (const [z0, z1] of [[-RZ, DZ0], [DZ1, RZ]]) wallBox(RX - 0.004, 0.5, (z0 + z1) / 2, 0.008, 1.0, z1 - z0, M.wallLow);
  // puerta (entreabierta no: cerrada) con cartel «AULA 3 AÑOS» y rótulo «CEIP» encima
  const door = mesh(new THREE.BoxGeometry(0.04, DH - 0.01, DZ1 - DZ0 - 0.02), M.woodD); door.position.set(RX + 0.01, DH / 2, (DZ0 + DZ1) / 2); scene.add(door);
  const knob = sph(0.03, M.steel); knob.position.set(RX - 0.03, 1.0, DZ1 - 0.12); scene.add(knob);
  const sign = plateText(0.42, 0.3, [['AULA', 0.22, 0.3], ['3 AÑOS', 0.34, 0.66]], { border: true }); sign.position.set(RX - 0.015, 1.5, (DZ0 + DZ1) / 2); sign.rotation.y = -Math.PI / 2; scene.add(sign); R.sign = sign;
  const ceip = plateText(0.7, 0.16, [['CEIP', 0.7, 0.55]], { bg: '#121316', fg: '#f2eee6' }); ceip.position.set(RX - 0.01, DH + 0.22, (DZ0 + DZ1) / 2); ceip.rotation.y = -Math.PI / 2; scene.add(ceip); R.ceip = ceip;
  // izquierda: tres ventanas (la luz del sol entra por ellas)
  const zs = [-RZ, ...WIN_Z.flatMap(z => [z - WIN_W / 2, z + WIN_W / 2]), RZ];
  for (let i = 0; i < zs.length; i += 2) wallBox(-RX - T / 2, RH / 2, (zs[i] + zs[i + 1]) / 2, T, RH, zs[i + 1] - zs[i]);
  for (const z of WIN_Z) { wallBox(-RX - T / 2, WIN_Y0 / 2, z, T, WIN_Y0, WIN_W); wallBox(-RX - T / 2, (WIN_Y1 + RH) / 2, z, T, RH - WIN_Y1, WIN_W);
    const fm = new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, roughness: 0.35, clearcoat: 0.6 });
    for (const [y, h] of [[WIN_Y0 + 0.025, 0.05], [WIN_Y1 - 0.025, 0.05], [(WIN_Y0 + WIN_Y1) / 2 + 0.25, 0.04]]) { const b = mesh(new THREE.BoxGeometry(0.08, h, WIN_W), fm); b.position.set(-RX - 0.02, y, z); scene.add(b); }
    for (const dz of [-WIN_W / 2 + 0.025, 0, WIN_W / 2 - 0.025]) { const b = mesh(new THREE.BoxGeometry(0.08, WIN_Y1 - WIN_Y0, 0.04), fm); b.position.set(-RX - 0.02, (WIN_Y0 + WIN_Y1) / 2, z + dz); scene.add(b); }
    const gl = mesh(new THREE.PlaneGeometry(WIN_W, WIN_Y1 - WIN_Y0), M.glass, false); gl.rotation.y = Math.PI / 2; gl.position.set(-RX - 0.03, (WIN_Y0 + WIN_Y1) / 2, z); scene.add(gl);
    const sill = mesh(new THREE.BoxGeometry(0.22, 0.03, WIN_W + 0.1), fm); sill.position.set(-RX + 0.06, WIN_Y0 - 0.015, z); scene.add(sill);
  }
  for (const [z0, z1] of [[-RZ, WIN_Z[0] - WIN_W / 2], [WIN_Z[0] - WIN_W / 2, RZ]]) wallBox(-RX + 0.004, 0.5, (z0 + z1) / 2, 0.008, 1.0, z1 - z0, M.wallLow);
  // fuera: cielo luminoso (se ve blanco por las ventanas y da resplandor)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.93, 0.8).multiplyScalar(2.2), toneMapped: false, fog: false }));
  sky.rotation.y = Math.PI / 2; sky.position.set(-RX - 2.5, 1.8, 0); scene.add(sky);
  // haces de sol: un prisma por ventana (la ventana barrida en la dirección del sol), aditivo y que se apaga a lo largo
  const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0.03 }, col: { value: new THREE.Color(1.0, 0.86, 0.62) } },
    vertexShader: 'attribute float along; varying float vA; varying vec3 vN; varying vec3 vV; void main(){ vA = along; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float op; uniform vec3 col; varying float vA; varying vec3 vN; varying vec3 vV; void main(){ float f = 0.35 + 0.65 * pow(1.0 - abs(dot(normalize(vN), vV)), 1.2); float a = op * f * pow(1.0 - vA, 1.6) * smoothstep(0.0, 0.06, vA); gl_FragColor = vec4(col * a, 1.); }' });
  R.beamM = beamM;
  for (const z of WIN_Z) {
    const c = [[WIN_Y0 + 0.05, z - WIN_W / 2 + 0.05], [WIN_Y0 + 0.05, z + WIN_W / 2 - 0.05], [WIN_Y1 - 0.05, z + WIN_W / 2 - 0.05], [WIN_Y1 - 0.05, z - WIN_W / 2 + 0.05]].map(([y, zz]) => v3(-RX, y, zz));
    const L = 4.2, far = c.map(p => p.clone().addScaledVector(SUN_DIR, Math.min(L, (p.y - 0.01) / -SUN_DIR.y)));
    const P = [...c, ...far], quads = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], pos = [], al = [];
    for (const q of quads) for (const k of [0, 1, 2, 0, 2, 3]) { const p = P[q[k]]; pos.push(p.x, p.y, p.z); al.push(q[k] >= 4 ? 1 : 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('along', new THREE.Float32BufferAttribute(al, 1)); g.computeVertexNormals();
    const b = new THREE.Mesh(g, beamM); b.renderOrder = 6; b.frustumCulled = false; scene.add(b);
  }
  // pizarra (3,2 × 1,2 m) con marco de madera, bandeja con tizas y borrador; encima, el abecedario
  const BW = 3.2, BH = 1.2, BY = 1.5;
  const bt = S.boardTex = cpuTex(2048, 768); bt.anisotropy = 8;
  const board = mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.88, metalness: 0 }), false); board.position.set(0, BY, -RZ + 0.03); scene.add(board); R.board = board;
  const gt = S.glowTex = cpuTex(1024, 384);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(2.4) }));
  glow.position.set(0, BY, -RZ + 0.034); glow.renderOrder = 7; scene.add(glow); R.glow = glow;
  for (const [x, y, w, h] of [[0, BY + BH / 2 + 0.03, BW + 0.12, 0.06], [0, BY - BH / 2 - 0.03, BW + 0.12, 0.06], [-BW / 2 - 0.03, BY, 0.06, BH], [BW / 2 + 0.03, BY, 0.06, BH]]) { const f = mesh(new THREE.BoxGeometry(w, h, 0.05), M.woodD); f.position.set(x, y, -RZ + 0.025); scene.add(f); }
  const tray = mesh(new THREE.BoxGeometry(BW, 0.025, 0.08), M.woodD); tray.position.set(0, BY - BH / 2 - 0.07, -RZ + 0.05); scene.add(tray);
  for (let i = 0; i < 4; i++) { const c = cyl(0.005, 0.005, 0.08, M.chalk, 10); c.rotation.z = Math.PI / 2; c.position.set(-1.2 + i * 0.13, BY - BH / 2 - 0.05, -RZ + 0.055); scene.add(c); }
  const er = grp(mesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), M.woodD), at(mesh(new THREE.BoxGeometry(0.14, 0.012, 0.05), M.felt), 0, -0.021, 0)); er.position.set(1.1, BY - BH / 2 - 0.035, -RZ + 0.05); scene.add(er);
  const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ', NC = 14;
  for (let i = 0; i < NC; i++) { const l = ABC[i]; const c = plateText(0.2, 0.26, [[l, 0.62, 0.42], [l.toLowerCase(), 0.26, 0.82, '#555']], { border: true }); c.position.set(-1.95 + i * 0.3, 2.53, -RZ + 0.01); c.rotation.z = (hash(i * 3.3) - 0.5) * 0.06; scene.add(c); }
  // tallímetro (a la izquierda de la pizarra): regla de 0 a 1,60 m
  const tall = mesh(new THREE.PlaneGeometry(0.34, 1.62), new THREE.MeshStandardMaterial({ roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, map: canvasTex(256, 1220, (g, w, h) => {
    g.fillStyle = '#f3f0e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#16171a';
    for (let c = 0; c <= 160; c += 2) { const y = h - c / 160 * (h - 20) - 6, big = c % 10 === 0; g.fillRect(0, y - (big ? 2 : 1), big ? 110 : (c % 5 === 0 ? 70 : 40), big ? 4 : 2); if (big && c > 0) { g.font = '800 46px Inter'; g.fillText(String(c), 124, y + 16); } }
    g.font = '800 30px Inter'; g.fillText('cm', 190, 40); }) }), false);
  tall.position.set(-2.62, 0.83, -RZ + 0.012); scene.add(tall); R.tall = tall;
  // corcho con dibujos (derecha, junto a la mesa de la maestra) y calendario + tarjeta de prácticas (derecha, junto a la puerta)
  const cork = mesh(new THREE.BoxGeometry(0.03, 0.9, 1.5), M.cork); cork.position.set(RX - 0.015, 1.55, -2.2); scene.add(cork);
  for (let i = 0; i < 6; i++) { const d = mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(256, 188, (g, w, h) => { g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#222'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.arc(w * (0.3 + hash(i) * 0.4), h * 0.35, 22 + hash(i * 2) * 14, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w * 0.15, h * 0.85); for (let k = 0; k < 8; k++) g.lineTo(w * (0.15 + k * 0.1), h * (0.85 - hash(i * 9 + k) * 0.25)); g.stroke(); }) }), false);
    d.rotation.y = -Math.PI / 2; d.rotation.x = (hash(i * 7) - 0.5) * 0.12; d.position.set(RX - 0.035, 1.75 - Math.floor(i / 3) * 0.38, -2.65 + (i % 3) * 0.45); scene.add(d); }
  // estanterías del frente con cajas y mochilas en los percheros (se ven en el plano de la maestra)
  const fs = shelfUnit(2.4, 0.9, 0.4, 2); fs.position.set(-1.6, 0, RZ - 0.2); fs.rotation.y = Math.PI; scene.add(fs);
  for (let i = 0; i < 6; i++) { const b = rbox(0.34, 0.24, 0.3, i % 2 ? M.macB : M.macW, 0.02); b.rotation.x = -Math.PI / 2; b.position.set(-2.4 + (i % 3) * 0.8 - (i > 2 ? 0 : 0) + 0.2, 0.18 + Math.floor(i / 3) * 0.42, RZ - 0.22); scene.add(b); }
  for (let i = 0; i < 6; i++) { const hk = cyl(0.008, 0.008, 0.06, M.steel, 8); hk.rotation.x = Math.PI / 2; hk.position.set(0.9 + i * 0.4, 1.25, RZ - 0.03); scene.add(hk);
    const bp = rbox(0.22, 0.28, 0.1, new THREE.MeshPhysicalMaterial({ color: [0xe8e5df, 0x2a2b2f, 0xb9b4ab][i % 3], roughness: 0.6, clearcoat: 0.3 }), 0.04); bp.position.set(0.9 + i * 0.4, 1.06, RZ - 0.09); scene.add(bp); }
  // cinco mesas y 25 sillitas (blancas y negras alternas)
  for (const [x, z] of TABLES) { const tb = kidTable(); tb.position.set(x, 0, z); scene.add(tb); }
  const ch = new THREE.InstancedMesh(chairGeo(), M.plW, SEATS.length); ch.castShadow = true; ch.receiveShadow = true;
  SEATS.forEach(([x, z, r], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, r, 0); _o.scale.setScalar(1); _o.updateMatrix(); ch.setMatrixAt(i, _o.matrix); ch.setColorAt(i, new THREE.Color(i % 2 ? 0x1c1c1f : 0xf0efea)); });
  scene.add(ch); R.chairs = ch;
  // mesa de la maestra (fondo a la derecha) con su silla
  const dk = new THREE.Group(); dk.position.set(2.65, 0, -2.75); scene.add(dk); R.desk = dk;
  const dt = rbox(1.3, 0.65, 0.04, M.woodD, 0.02); dt.rotation.x = -Math.PI / 2; dt.position.y = 0.75; dk.add(dt);
  const pan = mesh(new THREE.BoxGeometry(1.24, 0.5, 0.02), M.woodD); pan.position.set(0, 0.47, -0.28); dk.add(pan);
  for (const x of [-0.6, 0.6]) { const s = mesh(new THREE.BoxGeometry(0.04, 0.73, 0.6), M.woodD); s.position.set(x, 0.365, 0); dk.add(s); }
  const tch = grp(at(mesh(new THREE.BoxGeometry(0.44, 0.04, 0.42), M.black), 0, 0.46, 0), at(mesh(new THREE.BoxGeometry(0.44, 0.42, 0.03), M.black), 0, 0.7, 0.2), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => at(cyl(0.012, 0.012, 0.46, M.steel, 10), a * 0.19, 0.23, b * 0.18)));
  tch.position.set(2.65, 0, -3.3); tch.rotation.y = Math.PI; scene.add(tch);
  for (let i = 0; i < 3; i++) { const b = book(0.2, 0.27, 0.03, [0xe9e6e0, 0x1d1e22, 0xb5afa4][i]); b.rotation.set(-Math.PI / 2, 0, 0.1 * i); b.position.set(2.05 + 0.02 * i, 0.785 + 0.032 * i, -2.85); scene.add(b); }
  // rincón de matemáticas (esquina del fondo a la izquierda) y rincón de lectura (pared de las ventanas, en medio)
  const ms = shelfUnit(1.0, 0.55, 0.38, 1); ms.position.set(-3.95, 0, -2.75); ms.rotation.y = Math.PI / 2; scene.add(ms);
  const rug = mesh(new THREE.CircleGeometry(0.95, 64), M.felt, false); rug.rotation.x = -Math.PI / 2; rug.position.set(-3.05, 0.004, 0.25); scene.add(rug);
  const bs = shelfUnit(1.2, 0.8, 0.3, 2); bs.position.set(-4.02, 0, 0.25); bs.rotation.y = Math.PI / 2; scene.add(bs);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const b = book(0.2, 0.26, 0.025, [0xefebe3, 0x222326, 0xc9c2b6, 0x6d6a66][(i + r) % 4]); b.rotation.set(-0.2, Math.PI / 2, 0); b.position.set(-3.93, 0.2 + r * 0.38, -0.12 + i * 0.25); scene.add(b); }
  for (const [x, z, s] of [[-2.6, 0.95, 1], [-3.45, -0.45, 0.85]]) { const c = sph(0.22 * s, new THREE.MeshPhysicalMaterial({ color: 0xd9d4ca, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xffffff) }), 32, 20); c.scale.set(1, 0.38, 1); c.position.set(x, 0.07 * s, z); scene.add(c); }
}
// ---------------------------------------------------------------- luces del aula: el sol por las ventanas (con sombras), luz de techo suave y un foco
// que sigue a lo que se mira (para que siempre se lea el objeto)
function buildLights() {
  const sun = new THREE.DirectionalLight(0xffdcb0, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 5; sc.bottom = -5; sc.near = 0.5; sc.far = 30; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  sun.position.copy(SUN_DIR.clone().multiplyScalar(-12)); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xdce6f2, 0x4a4036, 0.1); scene.add(hemi);
  const key = new THREE.SpotLight(0xfff1e2, 30, 9, 0.75, 1.0, 1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 4; key.shadow.camera.near = 0.2; key.shadow.camera.far = 10;
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xdfe8ff, 3, 6, 1.6); scene.add(fill);
  const rim = new THREE.PointLight(0xffd7a8, 4, 5, 1.6); scene.add(rim);
  S.rig = { sun, hemi, key, fill, rim };
}
function rigAt(c, camP) {        // c = lo que se mira; el foco va arriba y un poco por delante, el relleno al lado de la cámara y el contraluz detrás
  const R = S.rig, d = c.clone().sub(camP), L = d.length(), u = d.clone().normalize(), side = v3(-u.z, 0, u.x);
  R.key.position.copy(c).addScaledVector(u, -L * 0.55).addScaledVector(side, L * 0.45).add(v3(0, 1.4 + L * 0.3, 0)); R.key.target.position.copy(c); R.key.target.updateMatrixWorld();
  R.key.distance = 3 + L * 2.2; R.key.intensity = 1.0 + 1.4 * L;
  R.fill.position.copy(camP).addScaledVector(side, -0.6).add(v3(0, 0.3, 0)); R.fill.intensity = 0.35 + 0.45 * L; R.fill.distance = 2 + L * 2;
  R.rim.position.copy(c).addScaledVector(u, 0.6 + L * 0.2).add(v3(0, 0.5, 0)); R.rim.intensity = 0.8 + 0.9 * L; R.rim.distance = 2 + L;
}
// polvo en suspensión por toda el aula (más en los haces de sol)
function buildFlow() {
  S.flow = [
    flowCloud(9000, i => { const z = WIN_Z[i % 3] + (hash(i * 3.1) - 0.5) * WIN_W, y = WIN_Y0 + hash(i * 5.7) * (WIN_Y1 - WIN_Y0), s = hash(i * 8.3) * ((y - 0.02) / -SUN_DIR.y);
      return [-RX + SUN_DIR.x * s, y + SUN_DIR.y * s, z + SUN_DIR.z * s]; }, { size: 1.5, bright: 0.85, farF: 0.05, nearF: 0.08, seed: 2, col: 0xffe2b8 }),
    flowCloud(5000, i => [(hash(i * 1.3) - 0.5) * 2 * RX, 0.05 + hash(i * 4.4) * 2.6, (hash(i * 6.1) - 0.5) * 2 * RZ], { size: 1.2, bright: 0.35, farF: 0.06, nearF: 0.05, seed: 3, col: 0xf0e6d8 }),
  ];
}
