// ---------------------------------------------------------------- LOS SITIOS DONDE PASAN COSAS y sus oficios. Cada sitio se construye (abierto por arriba, para verlo
// por dentro desde la cámara) y deja en ROLES los puestos que ocupan seguidores: { x, z, yaw, job, k, … }.
//   k: 'S' quieto · 'T' sentado · 'P' va y viene entre (x, z) y (x2, z2) · 'C' da vueltas alrededor de (x, z) con radio r · 'V' dentro de un vehículo
//   arm: 'cut' (tijeras / pasar productos), 'wave' (saluda, dirige, limpia), 'hold' (brazo al frente: caña, manguera, bandeja)
const ROLES = [], SITES = [], PROPS = { cart: [], sack: [], rod: [], veh: [] };
const R = o => { ROLES.push({ k: 'S', yaw: 0, sc: 1, y: 0.5, ...o }); return ROLES[ROLES.length - 1]; };
const FY = Math.PI / 2;
function site(name, label, x, z, h = 7) { SITES.push({ name, label, p: new THREE.Vector3(x, h, z) }); }
// local abierto por arriba: suelo y paredes altas solo al fondo (−x y −z), que es lo que no tapa la vista
function shopShell(g, x, z, w, d, floor, wall, hgt = 3) { addBox(g, w, 0.12, d, stdM(floor, 0.8), x, 0.56, z).castShadow = false; const m = stdM(wall, 0.85);
  addBox(g, w, hgt, 0.3, m, x, 0.5 + hgt / 2, z - d / 2); addBox(g, 0.3, hgt, d, m, x - w / 2, 0.5 + hgt / 2, z); addBox(g, w, 0.5, 0.25, m, x, 0.75, z + d / 2); addBox(g, 0.25, 0.5, d, m, x + w / 2, 0.75, z); }
function vehicle(g, x, z, yaw, o = {}) {           // coche / taxi / furgón / camión: caja + cabina + ruedas; el frente es +z local
  const v = new THREE.Group(), L = o.L || 4.3, Wd = o.W || 1.9, hb = o.hb || 1.0, body = stdM(o.color ?? 0xd9342b, 0.5), dark = stdM(0x1c2026, 0.5);
  addBox(v, Wd, hb, L, body, 0, 0.45 + hb / 2, 0); addBox(v, Wd * 0.9, o.hc ?? 0.75, L * (o.cab ?? 0.5), o.box ? body : stdM(0x263442, 0.25, { metalness: 0.3 }), 0, 0.45 + hb + (o.hc ?? 0.75) / 2, o.cz ?? -L * 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(0.42, 0.42, 0.3, dark, 12); w.rotation.z = Math.PI / 2; w.position.set(sx * Wd / 2, 0.42, sz * L * 0.32); v.add(w); }
  if (o.top) addBox(v, o.top[0], o.top[1], o.top[2], stdM(o.top[3], 0.5), 0, 0.45 + hb + (o.hc ?? 0.75) + o.top[1] / 2, o.top[4] ?? 0);
  v.position.set(x, 0.04, z); v.rotation.y = yaw; g.add(v); return v; }

function buildSites() {
  const g = new THREE.Group(), wood = stdM(0xb98a5a, 0.8), white = stdM(0xf4f1ea, 0.8), steel = stdM(0xc9ced6, 0.4, { metalness: 0.6 }), dark = stdM(0x2a2d34, 0.6);
  // ================= EL REY, en el trono (figurita normal en un trono gigante)
  R({ x: 0.5, z: 0.5, y: CITY.throne.userData.seatY + 0.35, yaw: Math.PI / 4, job: 'rey', k: 'T', sc: 1.25, shirt: 0x7a2fb0, king: 1 }); site('trono', null, 0, 0, 30);
  // ================= MANZANA DE TIENDAS (0, 1): peluquería, panadería y bar con terraza
  { const bx = 0, bz = 42;
    // peluquería
    shopShell(g, bx - 8.5, bz - 9.5, 11, 9, 0xe9d9c6, 0xf2b8c6); site('peluqueria', 'PELUQUERÍA', bx - 8.5, bz - 9.5);
    addBox(g, 7, 1.6, 0.1, stdM(0xbfe3f2, 0.15, { metalness: 0.5 }), bx - 9, 2.3, bz - 13.8);
    for (const [i, cx] of [[0, -11.2], [1, -7.2]]) { addBox(g, 0.95, 0.55, 0.95, stdM(0xc8322c, 0.6), bx + cx, 1.0, bz - 11.6); addBox(g, 0.95, 0.9, 0.16, stdM(0xc8322c, 0.6), bx + cx, 1.6, bz - 11.1); addBox(g, 0.2, 0.5, 0.2, steel, bx + cx, 0.72, bz - 11.6);
      R({ x: bx + cx, z: bz - 11.65, y: 0.95, yaw: Math.PI, job: 'cliente', k: 'T', vip: i ? null : 'cliente', cape: 1 }); R({ x: bx + cx + 1.05, z: bz - 11.2, yaw: -1.9, job: i ? 'peluquero' : 'peluquera', arm: 'cut', shirt: 0x26282e, vip: i ? null : 'peluquera' }); }
    addBox(g, 0.6, 0.5, 3.2, wood, bx - 13.4, 0.85, bz - 7.6); for (const dz of [-8.6, -7.6, -6.6]) R({ x: bx - 13.3, z: bz + dz, y: 0.7, yaw: FY, job: 'esperando turno', k: 'T' });
    R({ x: bx - 9.5, z: bz - 7.2, x2: bx - 5, z2: bz - 7.4, spd: 0.7, k: 'P', job: 'barre el suelo', arm: 'hold' });
    { const p = cyl(0.22, 0.22, 2.4, stdM(0xffffff, 0.4, { map: canvasTex(32, 64, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = ['#d9342b', '#ffffff', '#2f6fd0', '#ffffff'][i % 4]; q.fillRect(0, i * 8, w, 8); } }) }), 12); p.position.set(bx - 2.8, 1.75, bz - 5.2); g.add(p); }
    // panadería
    shopShell(g, bx + 8.5, bz - 9.5, 11, 9, 0xf2e3c2, 0xe8b25a); site('panaderia', 'PANADERÍA', bx + 8.5, bz - 9.5);
    addBox(g, 8, 1.1, 1.1, wood, bx + 8.5, 1.1, bz - 9.6); for (let i = 0; i < 9; i++) addBox(g, 0.6, 0.22, 0.28, stdM(0xd9903a, 0.7), bx + 5.2 + i * 0.82, 1.78, bz - 9.6 + (i % 2 ? 0.2 : -0.2), 0.4);
    addBox(g, 9, 2.2, 0.6, wood, bx + 8.5, 1.65, bz - 13.5); for (let i = 0; i < 12; i++) addBox(g, 0.55, 0.3, 0.3, stdM([0xd9903a, 0xc87a2a, 0xe6b25a][i % 3], 0.7), bx + 4.6 + (i % 6) * 1.5, 1.4 + Math.floor(i / 6) * 0.9, bz - 13.1); addBox(g, 1.8, 2.0, 1.6, dark, bx + 13, 1.5, bz - 12.6);
    R({ x: bx + 6.8, z: bz - 11.2, job: 'panadero', shirt: 0xf4f1ea, hat: 0xffffff, arm: 'hold' }); R({ x: bx + 10.6, z: bz - 11.2, job: 'panadera', shirt: 0xf4f1ea, hat: 0xffffff, arm: 'cut' });
    for (let i = 0; i < 7; i++) R({ x: bx + 8.3 + (i % 2) * 0.25, z: bz - 8.0 + i * 1.15, yaw: Math.PI, job: i ? 'en la cola del pan' : 'compra el pan' });
    // bar con terraza
    addBox(g, 6, 3.2, 5, stdM(0xc8704a, 0.8), bx - 11, 2.1, bz + 5.5); addBox(g, 6.6, 0.3, 5.6, stdM(0x8a3f2a, 0.8), bx - 11, 3.85, bz + 5.5); addBox(g, 3, 1.1, 0.8, wood, bx - 7.4, 1.05, bz + 5.5); site('bar', 'BAR', bx + 1, bz + 8);
    R({ x: bx - 8.6, z: bz + 5.5, yaw: FY, job: 'camarera', shirt: 0x26282e, arm: 'cut' });
    const um = [0xe2483d, 0x2f9e5a, 0x2f6fd0, 0xf0a020, 0xe2483d, 0x2f6fd0, 0x2f9e5a]; [[-3, 4.5], [2, 4.5], [7, 4.5], [12, 5.5], [-3, 10.5], [2, 10.5], [7, 10.5]].forEach(([tx, tz], i) => { const t = cyl(0.75, 0.75, 0.08, white, 18); t.position.set(bx + tx, 1.3, bz + tz); g.add(t); const p = cyl(0.06, 0.06, 2.6, steel, 6); p.position.set(bx + tx, 1.8, bz + tz); g.add(p);
      const u = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.8, 8), stdM(um[i], 0.8)); u.position.set(bx + tx, 3.4, bz + tz); u.castShadow = true; g.add(u);
      const n = 2 + (i % 2); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + i; R({ x: bx + tx + Math.cos(a) * 1.35, z: bz + tz + Math.sin(a) * 1.35, y: 0.42, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), job: 'tomando algo', k: 'T' }); } });
    R({ x: bx - 6, z: bz + 7.5, x2: bx + 10, z2: bz + 7.6, spd: 1.3, k: 'P', job: 'camarero', shirt: 0x26282e, arm: 'hold' }); }
  // ================= SUPERMERCADO (0, −1): estanterías, dos cajas, carros y la cola
  { const bx = 0, bz = -42; shopShell(g, bx, bz, 27, 24, 0xe6e9ec, 0x4fa36a, 3.6); site('super', 'SUPERMERCADO', bx, bz + 2, 8);
    const pc = [0xe2483d, 0xf0a020, 0x2f6fd0, 0x2f9e5a, 0xf2d03a, 0x8a5cd0]; for (const [k, sx] of [[0, -11.6], [1, -7.2], [2, 7.2], [3, 11.6]]) { addBox(g, 1.3, 1.9, 13, white, bx + sx, 1.55, bz - 4.5); for (let i = 0; i < 9; i++) addBox(g, 1.34, 0.42, 1.25, stdM(pc[(i + k) % 6], 0.6), bx + sx, 1.0 + (i % 3) * 0.6, bz - 10 + Math.floor(i / 3) * 4.3 + (i % 3) * 0.7); }
    addBox(g, 9, 1.9, 1.3, white, bx, 1.55, bz - 11.2); for (let i = 0; i < 6; i++) addBox(g, 1.3, 0.45, 1.34, stdM(pc[i], 0.6), bx - 3.7 + i * 1.5, 1.2 + (i % 2) * 0.6, bz - 11.2);
    for (const [k, cx] of [[0, -3.6], [1, 2.4]]) { addBox(g, 1.0, 0.95, 3.4, stdM(0x3a4048, 0.5), bx + cx, 1.05, bz + 8); addBox(g, 0.8, 0.06, 2.4, stdM(0x16181c, 0.4), bx + cx, 1.56, bz + 7.7); addBox(g, 0.5, 0.5, 0.5, stdM(0xf4f1ea, 0.5), bx + cx - 0.2, 1.8, bz + 9.2);
      R({ x: bx + cx - 1.05, z: bz + 8.2, yaw: FY, job: 'cajera', shirt: 0x2f9e5a, arm: 'cut', vip: k ? null : 'cajera' });
      const n = k ? 7 : 12; for (let i = 0; i < n; i++) { const z = bz + 7.6 - i * 1.5; R({ x: bx + cx + 1.15 + (hash(i * 3.1 + k) - 0.5) * 0.25, z, yaw: 0, job: i ? 'en la cola de la caja' : 'pagando' }); if (i % 2 === 0 && i) PROPS.cart.push({ x: bx + cx + 1.15, z: z + 0.85, yaw: 0, full: 0.5 + hash(i) * 0.5 }); } }
    { const r = R({ x: bx - 9.4, z: bz - 9.5, x2: bx - 9.4, z2: bz + 1.5, spd: 0.8, k: 'P', job: 'llenando el carro', vip: 'carro' }); PROPS.cart.push({ role: r, full: 1.35 }); }
    { const r = R({ x: bx + 9.4, z: bz + 1, x2: bx + 9.4, z2: bz - 9, spd: 0.7, k: 'P', job: 'de compras' }); PROPS.cart.push({ role: r, full: 0.6 }); }
    R({ x: bx + 5.9, z: bz - 6, yaw: FY, job: 'reponedor', shirt: 0x2f9e5a, arm: 'cut' }); R({ x: bx - 1.5, z: bz - 9.6, yaw: Math.PI, job: 'mirando la fruta' }); R({ x: bx + 2.6, z: bz - 9.6, yaw: Math.PI, job: 'eligiendo yogures' });
    for (let i = 0; i < 6; i++) PROPS.cart.push({ x: bx - 12.3 + (i % 2) * 0.75, z: bz + 6.5 + Math.floor(i / 2) * 1.0, yaw: 0, full: 0 }); }
  // ================= BANCO (−1, 0): el edificio, el furgón blindado y los guardias que sacan el dinero
  { const bx = -42, bz = 0, b = new THREE.Group(), stone = stdM(0xece6d6, 0.8), dk = stdM(0xcfc7b2, 0.85), gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 });
    addBox(b, 24, 1.4, 19, dk, 0, 1.2, 0); addBox(b, 20, 9, 12, stone, 0, 6.4, -2.5); for (let i = 0; i < 6; i++) { const c = cyl(0.95, 0.95, 9, stone, 14); c.position.set(-9 + i * 3.6, 6.4, 6); b.add(c); } addBox(b, 22, 1.2, 17, dk, 0, 11.5, 0); addBox(b, 2.6, 4.2, 0.3, stdM(0x3a2a1a, 0.6), 0, 4.0, 3.6);
    { const s = new THREE.Shape(); s.moveTo(-11.5, 0); s.lineTo(11.5, 0); s.lineTo(0, 5); s.lineTo(-11.5, 0); const p = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: false }), stone); p.position.set(0, 12.1, -8); p.castShadow = p.receiveShadow = true; b.add(p); const c = cyl(1.7, 1.7, 0.5, gold, 24); c.rotation.x = Math.PI / 2; c.position.set(0, 13.9, 8.2); b.add(c); }
    b.position.set(bx - 3, 0.5, bz - 3); b.rotation.y = Math.PI / 4; b.scale.setScalar(0.82); g.add(b); site('banco', 'BANCO', bx + 6, bz + 6, 9);
    const van = vehicle(g, bx + 2, bz + 17.9, -FY, { L: 6.2, W: 2.3, hb: 1.9, hc: 0.9, cab: 0.26, cz: 2.2, color: 0x3a4a5e, box: 0 }); addBox(van, 2.32, 0.5, 6.22, stdM(0xf2c14e, 0.5), 0, 1.5, 0); PROPS.van = van;
    const door = [bx + 3.6, bz + 3.6], rear = [bx + 5.9, bz + 16.3]; for (const ph of [0, 0.5]) { const r = R({ x: door[0], z: door[1], x2: rear[0], z2: rear[1], spd: 1.7, ph, k: 'P', job: 'guardia de seguridad', shirt: 0x1c2740, hat: 0x101216, arm: 'hold' }); PROPS.sack.push({ role: r }); }
    R({ x: bx + 8.6, z: bz + 14.2, yaw: 0.7, job: 'guardia de seguridad', shirt: 0x1c2740, hat: 0x101216 }); R({ x: bx + 0.2, z: bz + 17.9, job: 'conduce el furgón', k: 'V', vy: 3.6 });
    for (let i = 0; i < 4; i++) R({ x: bx + 9.5 + i * 1.2, z: bz - 6 + i * 1.2, yaw: -Math.PI * 0.75, job: i ? 'en la cola del cajero' : 'sacando dinero' }); addBox(g, 1.0, 2.0, 0.6, stdM(0x2f6fd0, 0.5), bx + 8.5, 1.5, bz - 7, Math.PI / 4); }
  // ================= BOMBEROS (1, 1) y la parada de taxis de al lado
  { const bx = 42, bz = 42, red = stdM(0xc23a2e, 0.7); addBox(g, 18, 6, 10, red, bx - 4, 3.5, bz - 8); addBox(g, 18.6, 0.4, 10.6, white, bx - 4, 6.7, bz - 8); addBox(g, 3.4, 10, 3.4, red, bx + 8.5, 5.5, bz - 9.5); for (let i = 0; i < 3; i++) addBox(g, 4.4, 4.4, 0.2, dark, bx - 9.5 + i * 5.5, 2.7, bz - 2.95); site('bomberos', 'BOMBEROS', bx - 2, bz + 2, 9);
    const tr = vehicle(g, bx - 1, bz + 6.5, FY, { L: 8.6, W: 2.5, hb: 1.9, hc: 0.9, cab: 0.26, cz: 3.1, color: 0xd9241b }); addBox(tr, 0.5, 0.3, 7.5, steel, 0, 2.95, -0.8); addBox(tr, 1.5, 0.12, 6.8, white, 0, 2.6, -0.8);
    for (const [dx, a] of [[-3.2, 'wave'], [0.2, 'wave'], [3.4, 'hold']]) R({ x: bx - 1 + dx, z: bz + 8.6, yaw: Math.PI, job: a === 'hold' ? 'bombero (manguera)' : 'bombera (lava el camión)', shirt: 0x1c2740, hat: 0xf2d03a, arm: a });
    R({ x: bx - 9.5, z: bz - 1.6, job: 'bombero de guardia', shirt: 0x1c2740, hat: 0xf2d03a }); R({ x: bx + 6.5, z: bz + 3.5, x2: bx + 10.5, z2: bz + 10, spd: 1.2, k: 'P', job: 'bombero (entrenando)', shirt: 0x1c2740, hat: 0xf2d03a });
    for (let i = 0; i < 3; i++) { const z = bz - 6 + i * 6.2, x = bx + 17.9; vehicle(g, x, z, 0, { color: 0xf2c21a, top: [0.9, 0.3, 0.4, 0x16181c] }); R({ x, z, job: 'taxista', k: 'V', vy: 2.7 }); } R({ x: bx + 16.2, z: bz + 3.4, y: 0.3, yaw: 2.4, job: 'taxista (esperando)', shirt: 0xf4f1ea }); site('taxis', 'TAXIS', bx + 17.9, bz, 5); }
  // ================= COLEGIO (2, 1): el edificio, el patio y la profesora con su clase
  { const bx = 84, bz = 42, cream = stdM(0xf6e9c8, 0.85); addBox(g, 24, 7, 9, cream, bx, 4, bz - 9.5); addBox(g, 25, 0.5, 10, stdM(0xb4472f, 0.8), bx, 7.75, bz - 9.5); for (let i = 0; i < 7; i++) addBox(g, 1.8, 1.8, 0.12, stdM(0x9fd0f2, 0.2), bx - 9.6 + i * 3.2, 4.6, bz - 4.95); addBox(g, 2.4, 3.2, 0.14, stdM(0x6b4a2e, 0.7), bx, 2.1, bz - 4.95);
    for (const [x, z, w, d] of [[0, 14.5, 29, 0.2], [14.5, 5, 0.2, 19], [-14.5, 5, 0.2, 19]]) addBox(g, w, 1.1, d, stdM(0x5a8f4a, 0.7), bx + x, 1.05, bz + z); site('cole', 'COLEGIO', bx, bz + 4, 9);
    R({ x: bx - 5, z: bz + 5, yaw: 0.6, job: 'profesora', shirt: 0xe07a3a, arm: 'wave' }); for (let i = 0; i < 10; i++) R({ x: bx - 5, z: bz + 5, r: 3.3, a0: i / 10 * Math.PI * 2, w: 0.35, k: 'C', sc: 0.62, job: 'en clase, en el patio', face: 'in' });
    for (let i = 0; i < 7; i++) R({ x: bx + 6.5, z: bz + 7, r: 2.6 + (i % 2) * 0.9, a0: i / 7 * Math.PI * 2, w: 1.5, k: 'C', sc: 0.6, job: 'jugando al pilla-pilla', face: 'run' }); R({ x: bx - 12, z: bz - 2, job: 'conserje', shirt: 0x6b7280 }); }
  // ================= LAGO (1, 0): pescadores, patos y gente en la hierba
  { const bx = 42, bz = 0; const bed = new THREE.Mesh(new THREE.CircleGeometry(11.8, 40), stdM(0x9a7a4e, 0.95)); bed.rotation.x = -Math.PI / 2; bed.position.set(bx, 0.53, bz); bed.receiveShadow = true; g.add(bed);
    const w = new THREE.Mesh(new THREE.CircleGeometry(11.2, 40), new THREE.MeshPhysicalMaterial({ color: 0x3f9fe0, roughness: 0.08, metalness: 0.1, clearcoat: 1 })); w.rotation.x = -Math.PI / 2; w.position.set(bx, 0.57, bz); g.add(w); site('lago', 'LAGO', bx, bz, 5);
    for (const a of [0.55, 1.05, 2.3]) { const x = bx + Math.cos(a) * 12.3, z = bz + Math.sin(a) * 12.3, yaw = Math.atan2(-Math.cos(a), -Math.sin(a)); R({ x, z, yaw, job: 'pescando', arm: 'hold', hat: 0xd9c27a }); PROPS.rod.push({ x, z, yaw }); }
    for (let i = 0; i < 6; i++) { const a = -2.2 + i * 0.5; R({ x: bx + Math.cos(a) * 13.4, z: bz + Math.sin(a) * 13.4, y: 0.42, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), job: 'de pícnic', k: 'T' }); } PROPS.pond = [bx, bz]; }
  // ================= OBRA (−1, 1): un edificio a medio hacer, la grúa y la cuadrilla
  { const bx = -42, bz = 42, con = stdM(0xbfbfb8, 0.9), yel = stdM(0xf2c21a, 0.6); for (let a = 0; a < 3; a++) for (let c = 0; c < 2; c++) addBox(g, 0.7, 7.4, 0.7, con, bx - 7 + a * 6, 4.2, bz - 8 + c * 7); addBox(g, 13.6, 0.4, 8, con, bx - 1, 4.1, bz - 4.5); addBox(g, 7, 0.4, 8, con, bx - 4.3, 7.7, bz - 4.5);
    addBox(g, 1.3, 24, 1.3, yel, bx + 9, 12.5, bz - 9); addBox(g, 20, 0.9, 0.9, yel, bx + 2, 24, bz - 9); addBox(g, 0.12, 9, 0.12, dark, bx - 4, 19.3, bz - 9); addBox(g, 1.6, 1.0, 1.6, con, bx - 4, 14.5, bz - 9);
    { const s = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.4, 14), stdM(0xd9b56a, 0.95)); s.position.set(bx + 7, 1.7, bz + 8); s.castShadow = true; g.add(s); const m = cyl(0.9, 0.7, 1.4, stdM(0xe07a2a, 0.6), 12); m.rotation.z = 0.5; m.position.set(bx + 1, 1.5, bz + 9); g.add(m); for (let i = 0; i < 10; i++) addBox(g, 0.9, 0.45, 0.45, stdM(0xb4472f, 0.8), bx - 9 + (i % 5) * 0.95, 0.75 + Math.floor(i / 5) * 0.46, bz + 6); } site('obra', 'OBRA', bx, bz, 10);
    const wk = { shirt: 0xf07a1a, hat: 0xf2d03a }; R({ x: bx - 8, z: bz + 7.2, x2: bx - 2, z2: bz + 0.5, spd: 1.2, k: 'P', job: 'albañil', arm: 'hold', ...wk }); R({ x: bx + 5.5, z: bz + 6.5, x2: bx + 1, z2: bz + 1, spd: 1.0, ph: 0.4, k: 'P', job: 'albañil', arm: 'hold', ...wk });
    R({ x: bx + 0.2, z: bz + 10.2, yaw: Math.PI, job: 'en la hormigonera', arm: 'cut', ...wk }); R({ x: bx - 1, z: bz - 4.5, y: 4.3, job: 'encofrador', arm: 'cut', ...wk }); R({ x: bx + 3, z: bz - 3.5, y: 4.3, yaw: 2, job: 'ferrallista', ...wk }); R({ x: bx + 10.5, z: bz + 2, yaw: -FY, job: 'jefa de obra', shirt: 0xf07a1a, hat: 0xffffff, arm: 'wave' }); }
  // ================= MERCADO (1, −1): seis puestos con su vendedor y sus clientes
  { const bx = 42, bz = -42, cols = [['#d9342b', '#ffffff'], ['#2f9e5a', '#ffffff'], ['#2f6fd0', '#ffffff'], ['#f0a020', '#ffffff']], st = ['frutera', 'pescadero', 'quesera', 'florista', 'carnicero', 'verdulera']; let n = 0; site('mercado', 'MERCADO', bx, bz, 7);
    for (const x of [-9, 0, 9]) for (const z of [-7, 7]) { const c = cols[n % 4], t = canvasTex(64, 64, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = c[i % 2]; q.fillRect(i * 8, 0, 8, h); } });
      addBox(g, 6, 1.3, 3.0, wood, bx + x, 1.15, bz + z); const aw = addBox(g, 7.2, 0.3, 4.6, stdM(0xffffff, 0.8, { map: t }), bx + x, 4.4, bz + z - 0.4); aw.rotation.x = 0.2; for (const px of [-3.2, 3.2]) addBox(g, 0.25, 3.8, 0.25, wood, bx + x + px, 2.4, bz + z - 2.2);
      for (let k = 0; k < 6; k++) { const f = sph(0.45, stdM([0xf08a1c, 0xd9342b, 0x7fbf3a, 0xf2d03a][(k + n) % 4], 0.6), 8, 6); f.position.set(bx + x - 2.2 + (k % 3) * 2.2, 2.05, bz + z - 0.5 + Math.floor(k / 3) * 1.0); g.add(f); }
      R({ x: bx + x, z: bz + z - 2.5, job: st[n], shirt: 0xf4f1ea, arm: 'cut' }); for (let k = 0; k < 2 + (n % 2); k++) R({ x: bx + x - 1.6 + k * 1.6, z: bz + z + 2.5 + (k % 2) * 0.5, yaw: Math.PI, job: 'comprando en el mercado' }); n++; } }
  // ================= PARQUE (−1, −1): fuente, caminos, columpios, gente corriendo, perros, clase de yoga y el carrito de los helados
  { const bx = -42, bz = -42, path = stdM(0xe3d6b4, 0.95), stone = stdM(0xd8d2c4, 0.9), tree = (x, z, s2 = 1) => { const f = new THREE.Mesh(new THREE.ConeGeometry(2.6 * s2, 6.5 * s2, 7), stdM([0x3f8a4b, 0x4f9a52, 0x357a45][Math.floor(hash(x * 3.1 + z) * 3)], 0.9)); f.position.set(x, 0.5 + 5 * s2, z); f.castShadow = true; g.add(f); const t = cyl(0.45 * s2, 0.6 * s2, 2.2 * s2, stdM(0x7a5a3a, 0.9), 6); t.position.set(x, 0.5 + 1.1 * s2, z); g.add(t); };
    site('parque', 'PARQUE', bx, bz, 8); addBox(g, 29, 0.06, 2.2, path, bx, 0.53, bz).castShadow = false; addBox(g, 2.2, 0.06, 29, path, bx, 0.53, bz).castShadow = false; { const r = cyl(5.4, 5.4, 0.07, path, 36); r.position.set(bx, 0.535, bz); r.castShadow = false; g.add(r); }
    { const b = cyl(3.1, 3.3, 0.7, stone, 28); b.position.set(bx, 0.9, bz); g.add(b); const w = cyl(2.8, 2.8, 0.1, new THREE.MeshPhysicalMaterial({ color: 0x4fb0ea, roughness: 0.08, clearcoat: 1 }), 28); w.position.set(bx, 1.23, bz); g.add(w); const c = cyl(0.35, 0.5, 2.2, stone, 12); c.position.set(bx, 2.1, bz); g.add(c); const j = sph(0.7, stdM(0xcfeaff, 0.2), 12, 10); j.position.set(bx, 3.5, bz); g.add(j); PROPS.jet = j; }
    for (const [x, z, s2] of [[-13, -13, 0.8], [-7, -13.2, 0.6], [6, -13, 0.7], [13, -12.5, 0.85], [-13.2, -6, 0.6], [-13, 6, 0.7], [13.2, -4, 0.6], [-12.8, 13, 0.75], [-4, 13.2, 0.55], [13, 13, 0.6], [-8.5, -8, 0.55], [8.5, -8.5, 0.5]]) tree(bx + x, bz + z, s2);
    // columpios, tobogán y arenero
    addBox(g, 5.5, 0.16, 5.5, stdM(0xe8d6a0, 0.95), bx + 8.5, 0.58, bz + 8.5); for (const sx of [-1.6, 1.6]) addBox(g, 0.16, 2.6, 0.16, stdM(0xd9342b, 0.6), bx + 3.6 + sx, 1.8, bz + 11.4); addBox(g, 3.5, 0.16, 0.16, stdM(0xd9342b, 0.6), bx + 3.6, 3.1, bz + 11.4);
    { const sl = addBox(g, 0.9, 0.12, 3.4, stdM(0x2f6fd0, 0.5), bx + 12.2, 1.45, bz + 4.2); sl.rotation.x = 0.5; addBox(g, 0.9, 2.2, 0.2, stdM(0xf0a020, 0.6), bx + 12.2, 1.6, bz + 2.6); }
    for (let i = 0; i < 4; i++) R({ x: bx + 8.5, z: bz + 8.5, r: 1.2 + (i % 2) * 0.8, a0: i * 1.6, w: 0.5 + i * 0.12, k: 'C', sc: 0.6, job: 'jugando en el arenero', face: 'run' }); for (const sx of [-0.8, 0.8]) R({ x: bx + 3.6 + sx, z: bz + 11.4, y: 1.0, sc: 0.62, k: 'T', job: 'en el columpio' });
    R({ x: bx + 12.2, z: bz + 5.6, sc: 0.6, job: 'en el tobogán' }); for (let i = 0; i < 3; i++) R({ x: bx + 5.2 + i * 1.3, z: bz + 13.6, yaw: Math.PI, job: 'vigilando a los niños' });
    // corredores (dan la vuelta al parque), paseos con perro, yoga, helados y gente en la hierba
    for (let i = 0; i < 9; i++) R({ k: 'L', b: { x: bx, z: bz }, r: 12.2 + (i % 2) * 0.9, q: 3, s0: i * 11.3, spd: 2.5 + (i % 3) * 0.45, dir: i % 4 ? 1 : -1, y: 0.5, job: 'corriendo por el parque' });
    for (let i = 0; i < 4; i++) R({ k: 'L', b: { x: bx, z: bz }, r: 9.6, q: 3, s0: i * 19, spd: 0.9, dir: -1, y: 0.5, dog: 1, job: 'paseando al perro' });
    R({ x: bx - 8.5, z: bz + 3.6, yaw: FY, job: 'profe de yoga', arm: 'wave', shirt: 0x8a5cd0 }); for (let i = 0; i < 6; i++) R({ x: bx - 6.2 + (i % 2) * 1.9, z: bz + 2.2 + Math.floor(i / 2) * 1.5, yaw: -FY, job: 'en clase de yoga', arm: 'wave' });
    addBox(g, 1.8, 1.1, 1.0, white, bx + 6.5, 1.1, bz - 5.6); { const u = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 8), stdM(0xff6fb5, 0.8)); u.position.set(bx + 6.5, 2.9, bz - 5.6); u.castShadow = true; g.add(u); }
    R({ x: bx + 6.5, z: bz - 6.8, job: 'heladero', shirt: 0xf4f1ea, hat: 0xff6fb5, arm: 'hold' }); for (let i = 0; i < 4; i++) R({ x: bx + 6.4 + (i % 2) * 0.2, z: bz - 4.2 + i * 1.1, yaw: Math.PI, sc: i % 2 ? 0.62 : 1, job: 'en la cola de los helados' });
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.4; R({ x: bx - 6 + Math.cos(a) * 2.2 - (i > 3 ? 1 : 0), z: bz - 8 + Math.sin(a) * 1.6 - (i > 3 ? 0.5 : 0), y: 0.42, yaw: a + 2, k: 'T', job: 'tumbado en la hierba' }); } }
  // ================= POLIDEPORTIVO (2, 0): campo de fútbol 7 y dos pistas de pádel
  { const bx = 84, bz = 0; site('deporte', 'POLIDEPORTIVO', bx, bz, 7);
    const ft = canvasTex(512, 280, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = i % 2 ? '#3f9a4a' : '#47a853'; q.fillRect(i * w / 8, 0, w / 8, h); } q.strokeStyle = '#ffffff'; q.lineWidth = 5; q.strokeRect(12, 12, w - 24, h - 24); q.beginPath(); q.moveTo(w / 2, 12); q.lineTo(w / 2, h - 12); q.stroke(); q.beginPath(); q.arc(w / 2, h / 2, 42, 0, 7); q.stroke(); q.strokeRect(12, h / 2 - 70, 70, 140); q.strokeRect(w - 82, h / 2 - 70, 70, 140); });
    { const p = new THREE.Mesh(new THREE.PlaneGeometry(26, 14.2), stdM(0xffffff, 0.9, { map: ft })); p.rotation.x = -Math.PI / 2; p.position.set(bx, 0.53, bz - 7.2); p.receiveShadow = true; g.add(p); for (const sx of [-1, 1]) { addBox(g, 0.12, 2.0, 0.12, white, bx + sx * 12.9, 1.5, bz - 9.2); addBox(g, 0.12, 2.0, 0.12, white, bx + sx * 12.9, 1.5, bz - 5.2); addBox(g, 0.12, 0.12, 4.1, white, bx + sx * 12.9, 2.5, bz - 7.2); } }
    const tm = [0xd9342b, 0x2f6fd0]; for (let i = 0; i < 12; i++) { const t2 = i % 2, col = Math.floor(i / 2) % 3, row = Math.floor(i / 6); R({ x: bx + (t2 ? 1 : -1) * (2.4 + col * 3.2) + (row ? 1.4 : -0.6), z: bz - 10.6 + row * 6.4 + (col % 2) * 1.3, r: 1.1 + (i % 3) * 0.6, a0: i * 1.3, w: (0.7 + (i % 4) * 0.22) * (i % 2 ? 1 : -1), k: 'C', job: 'jugando al fútbol', shirt: tm[t2], face: 'run' }); }
    for (const sx of [-1, 1]) R({ x: bx + sx * 11.8, z: bz - 7.2, x2: bx + sx * 11.8, z2: bz - 5.8, spd: 0.9, k: 'P', job: sx < 0 ? 'portero' : 'portera', shirt: sx < 0 ? 0xf2d03a : 0x2f9e5a }); R({ x: bx, z: bz - 1.4, x2: bx + 5, z2: bz - 1.2, spd: 1.6, k: 'P', job: 'árbitro', shirt: 0x16181c });
    for (let i = 0; i < 6; i++) R({ x: bx - 9 + i * 2.1, z: bz + 0.9, yaw: Math.PI, job: 'viendo el partido' }); PROPS.ball = { c: [bx, bz - 7.2] };
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false }), pt = canvasTex(256, 140, (q, w, h) => { q.fillStyle = '#2f6fd0'; q.fillRect(0, 0, w, h); q.strokeStyle = '#ffffff'; q.lineWidth = 4; q.strokeRect(6, 6, w - 12, h - 12); q.beginPath(); q.moveTo(w * 0.27, 6); q.lineTo(w * 0.27, h - 6); q.moveTo(w * 0.73, 6); q.lineTo(w * 0.73, h - 6); q.moveTo(w * 0.27, h / 2); q.lineTo(w * 0.73, h / 2); q.stroke(); });
    PROPS.padel = []; for (const cx of [-7.3, 7.3]) { const x0 = bx + cx, z0 = bz + 9; const p = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.6), stdM(0xffffff, 0.8, { map: pt })); p.rotation.x = -Math.PI / 2; p.position.set(x0, 0.535, z0); p.receiveShadow = true; g.add(p);
      for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 6.6), glass); w.position.set(x0 + sx * 6, 1.8, z0); g.add(w); } { const w = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 0.1), glass); w.position.set(x0, 1.8, z0 - 3.3); g.add(w); } addBox(g, 0.06, 0.85, 6.6, white, x0, 0.95, z0); PROPS.padel.push([x0, z0]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) R({ x: x0 + sx * 3.4, z: z0 + sz * 1.5 - 0.6, x2: x0 + sx * 3.4, z2: z0 + sz * 1.5 + 0.6, spd: 1.1, ph: hash(cx + sx * 2 + sz), k: 'P', job: 'jugando al pádel', arm: 'cut', faceX: -sx }); } }
  // ================= EN LA CALLE: policías dirigiendo el tráfico y un músico con su público en la plaza
  for (const [x, z] of [[21, -21], [-21, 21], [-21, -21]]) R({ x, z, y: 0.06, yaw: Math.PI / 4, job: 'policía (dirige el tráfico)', shirt: 0x2f55b8, hat: 0x16233f, arm: 'wave' });
  { const [x, z] = fromUV(-17, -15.5); R({ x, z, y: 0.16, yaw: Math.PI / 4, job: 'tocando la guitarra', arm: 'cut', shirt: 0x16181c }); addBox(g, 0.5, 0.9, 0.3, wood, x + 0.5, 1.0, z + 0.5, 0.6);
    for (let i = 0; i < 11; i++) { const a = Math.PI / 4 + (i - 5) * 0.27, rr2 = 3.4 + (i % 2) * 1.1; R({ x: x + Math.sin(a) * rr2, z: z + Math.cos(a) * rr2, y: 0.16, yaw: a + Math.PI, job: 'escuchando al músico' }); } site('musico', null, x, z, 4); }
  SITES.push({ name: 'plaza', label: null, p: new THREE.Vector3(0, 3, 0) });
  return g;
}
