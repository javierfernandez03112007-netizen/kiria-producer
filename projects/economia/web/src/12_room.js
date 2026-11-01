// ---------------------------------------------------------------- la sala: suelo de mármol negro pulido, paredes con columnas de mármol claro y arcos,
// lucernario en el techo, el gran panel de cotizaciones al fondo (con una cinta de valores debajo), relojes de cuatro bolsas, filas de mesas
// de operadores con pantallas, y en el centro un pedestal negro con la montaña dorada (la bolsa).
const DESKS_L = [[-4.6, 3.3], [-4.6, 1.3], [-4.6, -0.7], [-4.6, -2.7]], DESKS_R = [[4.6, 3.3], [4.6, 1.3], [4.6, -0.7], [4.6, -2.7]];
const ST3 = v3(-2.4, 0, 2.3), ST4 = v3(-2.4, 0, 0.3), ST5 = v3(-2.4, 0, -1.7), ST8 = v3(2.5, 0, -2.0), ST9 = v3(2.5, 0, 0.1), ST11 = v3(2.4, 0, 2.3);
const BOARD = { w: 10, h: 3.125, y: 4.25, z: -RZ + 0.06 };
function wallBox(x, y, z, w, h, d, m = M.wall) { const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; }
function buildRoom() {
  const R = S.room = {};
  const fl = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.floor, false); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  // paredes y columnas (mármol claro) con arcos oscuros entre ellas
  wallBox(0, RH / 2, -RZ - 0.1, 2 * RX, RH, 0.2); wallBox(0, RH / 2, RZ + 0.1, 2 * RX, RH, 0.2);
  for (const s of [-1, 1]) { wallBox(s * (RX + 0.1), RH / 2, 0, 0.2, RH, 2 * RZ);
    for (let i = 0; i < 6; i++) { const z = -RZ + 1 + i * 2;
      const c = mesh(new THREE.CylinderGeometry(0.28, 0.32, RH - 0.9, 32), M.marbleW); c.position.set(s * (RX - 0.35), (RH - 0.9) / 2 + 0.3, z); scene.add(c);
      const b = mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), M.marbleW); b.position.set(s * (RX - 0.35), 0.15, z); scene.add(b);
      const k = mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), M.goldD); k.position.set(s * (RX - 0.35), RH - 0.48, z); scene.add(k);
      if (i < 5) { const a = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.2), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.6 })); a.position.set(s * (RX - 0.02), 2.6, z + 1); a.rotation.y = -s * Math.PI / 2; scene.add(a);
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 32, Math.PI), M.marbleW); arc.position.set(s * (RX - 0.05), 4.7, z + 1); arc.rotation.y = -s * Math.PI / 2; scene.add(arc); } } }
  const cornice = mesh(new THREE.BoxGeometry(2 * RX, 0.35, 0.35), M.goldD); cornice.position.set(0, RH - 0.2, -RZ + 0.1); scene.add(cornice);
  // techo con lucernario (paneles que dan una luz fría muy suave)
  const ce = mesh(new THREE.PlaneGeometry(2 * RX, 2 * RZ), M.wallL, false); ce.rotation.x = Math.PI / 2; ce.position.y = RH; scene.add(ce);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.82, 0.95).multiplyScalar(0.9), toneMapped: false }));
    p.rotation.x = Math.PI / 2; p.position.set(-4.2 + i * 2.8, RH - 0.01, -3.2 + j * 3.2); scene.add(p); }
  // el panel de cotizaciones (lienzo) con marco dorado y la cinta de valores debajo
  const bt = S.boardTex = cpuTex(2048, 640);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false, color: new THREE.Color(1, 1, 1).multiplyScalar(1.15) }));
  board.position.set(0, BOARD.y, BOARD.z); scene.add(board); R.board = board;
  for (const [x, y, w, h] of [[0, BOARD.y + BOARD.h / 2 + 0.06, BOARD.w + 0.24, 0.12], [0, BOARD.y - BOARD.h / 2 - 0.06, BOARD.w + 0.24, 0.12], [-BOARD.w / 2 - 0.06, BOARD.y, 0.12, BOARD.h], [BOARD.w / 2 + 0.06, BOARD.y, 0.12, BOARD.h]]) {
    const f = mesh(new THREE.BoxGeometry(w, h, 0.1), M.goldD); f.position.set(x, y, BOARD.z - 0.02); scene.add(f); }
  const tt = S.tickTex = cpuTex(2048, 64);
  const tick = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, 0.32), new THREE.MeshBasicMaterial({ map: tt, toneMapped: false })); tick.position.set(0, BOARD.y - BOARD.h / 2 - 0.36, BOARD.z); scene.add(tick); R.tick = tick;
  // relojes de cuatro bolsas (a la izquierda y a la derecha del panel)
  [['MADRID', 9.5], ['LONDRES', 8.5], ['NUEVA YORK', 3.5], ['TOKIO', 17.5]].forEach(([n, hr], i) => {
    const x = (i < 2 ? -1 : 1) * (BOARD.w / 2 + 0.75), y = BOARD.y + 0.75 - (i % 2) * 1.5, g = new THREE.Group(); g.position.set(x, y, -RZ + 0.05); scene.add(g);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.4 })); g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 48), M.goldD); g.add(rim);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, m = mesh(new THREE.BoxGeometry(0.02, 0.06, 0.005), M.black); m.position.set(Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0.005); m.rotation.z = -a; g.add(m); }
    const hh = mesh(new THREE.BoxGeometry(0.025, 0.2, 0.006), M.black); hh.geometry.translate(0, 0.09, 0); hh.position.z = 0.01; hh.rotation.z = -(hr % 12) / 12 * Math.PI * 2; g.add(hh);
    const mm = mesh(new THREE.BoxGeometry(0.016, 0.3, 0.006), M.black); mm.geometry.translate(0, 0.14, 0); mm.position.z = 0.012; mm.rotation.z = -((hr % 1) * 60) / 60 * Math.PI * 2; g.add(mm);
    const lab = plateText(0.8, 0.14, [[n, 0.7, 0.55]], { bg: null, fg: '#e9e2d2' }); lab.position.set(0, -0.56, 0.01); g.add(lab); });
  // mesas de operadores con tres pantallas cada una (gráficos de ambiente)
  const dg = deskGeo(), dm = new THREE.InstancedMesh(dg, M.wood, DESKS_L.length + DESKS_R.length); dm.castShadow = true; dm.receiveShadow = true;
  const amb = [0, 1, 2, 3].map(k => { const t = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.strokeStyle = k % 2 ? '#ff5a4e' : '#ffc24a'; g.lineWidth = 3; g.beginPath(); let y = h * 0.6; for (let x = 0; x <= w; x += 8) { y += (hash(x * 0.37 + k * 9) - (k % 2 ? 0.45 : 0.55)) * 14; y = Math.max(20, Math.min(h - 20, y)); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = '#c9ced6'; g.font = '700 18px Inter'; g.fillText(['BOLSA ESP', 'EURO / DÓLAR', 'ORO', 'BONO 10 AÑOS'][k], 10, 22); }); return t; });
  [...DESKS_L, ...DESKS_R].forEach(([x, z], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0); _o.scale.setScalar(1); _o.updateMatrix(); dm.setMatrixAt(i, _o.matrix);
    for (let k = -1; k <= 1; k++) { const mo = monitor(amb[(i + k + 1) % 4], 0.5, 0.3); mo.position.set(x + (x < 0 ? -0.22 : 0.22), DESK_Y, z + k * 0.55); mo.rotation.y = x < 0 ? Math.PI / 2 - k * 0.25 : -Math.PI / 2 + k * 0.25; scene.add(mo); } });
  scene.add(dm);
  // estaciones (mesas cortas para los objetos de cada frase) y pedestales
  for (const p of [ST3, ST4, ST5, ST11]) { const d = mesh(deskGeo(1.2, 0.7), M.wood); d.position.copy(p); d.rotation.y = p.x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(d); }
  for (const p of [ST8, ST9]) { const pd = lathe([[0, 0], [0.42, 0], [0.42, 0.06], [0.34, 0.1], [0.34, 0.86], [0.4, 0.9], [0.4, 0.95], [0, 0.95]], 48, M.marbleK); pd.position.copy(p); scene.add(pd); }
  // pedestal central (mármol negro con canto dorado)
  const pl = rbox(3.1, 1.5, PLAT_Y, M.marbleK, 0.04); pl.rotation.x = -Math.PI / 2; pl.position.set(0, PLAT_Y / 2, 0.4); scene.add(pl);
  const trim = mesh(new THREE.BoxGeometry(3.12, 0.025, 1.52), M.goldD); trim.position.set(0, PLAT_Y - 0.01, 0.4); scene.add(trim);
}
// ---------------------------------------------------------------- luces: lucernario (luz fría y suave desde arriba), foco cálido que sigue a lo que
// se mira, relleno y contraluz
function buildLights() {
  const sky = new THREE.DirectionalLight(0xdfe8ff, 1.1); sky.castShadow = true; sky.shadow.mapSize.set(2048, 2048);
  const sc = sky.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 7; sc.bottom = -7; sc.near = 0.5; sc.far = 30; sky.shadow.bias = -0.0004; sky.shadow.normalBias = 0.02; sky.shadow.radius = 4;
  sky.position.set(2, 12, 4); sky.target.position.set(0, 0, 0); scene.add(sky, sky.target);
  const hemi = new THREE.HemisphereLight(0xcfd8e8, 0x2a2018, 0.14); scene.add(hemi);
  const key = new THREE.SpotLight(0xffe7c4, 30, 9, 0.75, 1.0, 1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 4; key.shadow.camera.near = 0.2; key.shadow.camera.far = 12;
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xdfe8ff, 3, 6, 1.6); scene.add(fill);
  const rim = new THREE.PointLight(0xffd7a8, 4, 5, 1.6); scene.add(rim);
  const boardL = new THREE.PointLight(0xffd9a0, 6, 9, 1.6); boardL.position.set(0, BOARD.y, BOARD.z + 1.2); scene.add(boardL);
  S.rig = { sky, hemi, key, fill, rim };
}
function rigAt(c, camP) {
  const R = S.rig, d = c.clone().sub(camP), L = d.length(), u = d.clone().normalize(), side = v3(-u.z, 0, u.x);
  R.key.position.copy(c).addScaledVector(u, -L * 0.55).addScaledVector(side, L * 0.45).add(v3(0, 1.4 + L * 0.3, 0)); R.key.target.position.copy(c); R.key.target.updateMatrixWorld();
  R.key.distance = 3 + L * 2.2; R.key.intensity = 1.0 + 1.4 * L;
  R.fill.position.copy(camP).addScaledVector(side, -0.6).add(v3(0, 0.3, 0)); R.fill.intensity = 0.35 + 0.45 * L; R.fill.distance = 2 + L * 2;
  R.rim.position.copy(c).addScaledVector(u, 0.6 + L * 0.2).add(v3(0, 0.5, 0)); R.rim.intensity = 0.9 + 1.0 * L; R.rim.distance = 2 + L;
}
function buildFlow() {
  S.flow = [
    flowCloud(9000, i => [(hash(i * 1.3) - 0.5) * 2 * RX, 0.05 + Math.pow(hash(i * 4.4), 1.3) * (RH - 0.5), (hash(i * 6.1) - 0.5) * 2 * RZ], { size: 1.3, bright: 0.45, farF: 0.05, nearF: 0.05, seed: 3, col: 0xffe6c4 }),
    flowCloud(3000, i => [gauss(i) * 1.6, PLAT_Y + Math.abs(gauss(i + 9e3)) * 1.0, 0.4 + gauss(i + 2e4) * 1.0], { size: 1.1, bright: 0.5, seed: 1, nearF: 0.05, farF: 0.08, col: 0xfff0d8 }),
  ];
}
