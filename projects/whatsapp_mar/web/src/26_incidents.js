// ---------------------------------------------------------------- 26 · los incidentes en el fondo del mar junto a Brasil (38,3–42,9 s):
// «Y no son los tiburones: tres de cada cuatro veces es un ancla o una red de pesca».
// Un tiburón (≈3 m, de maqueta, simpático) huele el cable y se va; un mercante (≈16 m) arrastra su ancla, engancha el cable 2 y lo PARTE
// (chispas y latigazo); pasa un pesquero con su red de arrastre rozando el fondo.
// Marco: el de la franja (como la playa): origen en la orilla de Brasil a nivel del mar (y = 0), +X mar adentro, z ∈ [−20, 20].
// API: buildIncidents() → Group (userData.anchors: shark, anchor, snapPoint, net, ship) · incidentsAt(t, {shark, anchor, snap, net}) (todo 0..1)
//      incCable2() (el tramo del cable 2 que se rompe; ya va dentro de buildIncidents) · INC_CAM(u) → [px,py,pz, lx,ly,lz, fov] (u 0..1 en 4,6 s)
const INC_XH = 19.0;            // x donde el ancla engancha el cable 2
const INC_ZD = 1.0;             // z donde cae el ancla (entre los dos cables)
const INC_XN = 15.6; const INC_NYAW = -0.3, INC_NZ = -1.6, INC_NL = 19;   // la red: rumbo (gira hacia la cámara), z por donde cruza y recorrido
           // x por donde pasa la red
const INC_SN = [16.5, CABLE_Z]; // donde el tiburón huele el cable 1
const INC_R = 0.055;            // radio de los cables
const incBed = (x, z) => seabedY(x, z) - SEA;
const incSS = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const incWin = (x, a, b) => clamp((x - a) / (b - a));
let _incPuffT = null;
function incPuffTex() { return _incPuffT || (_incPuffT = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(0.45, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); })); }

// ---------------------------------------------------------------- el tiburón (de maqueta: gris azulado, vientre blanco, ojos grandes). Mira a +X, arriba +Y; mide ≈ 3,1 m
function incShark() {
  const top = new THREE.Color(0x7f97ad), belly = new THREE.Color(0xf5f7fa), parts = [];
  const NX = 56, NR = 28;
  const rad = tb => tb < 0.03 ? 0.055 * Math.sqrt(tb / 0.03) : tb < 0.6 ? 0.055 + 0.325 * Math.pow(Math.sin(tb / 0.6 * Math.PI / 2), 1.2) : 0.38 * Math.sqrt(Math.max(0, 1 - Math.pow((tb - 0.6) / 0.4, 2)));
  { const P = [], C = [], U = [], I = [];
    for (let i = 0; i <= NX; i++) { const tb = i / NX, x = -1.5 + 3 * tb, r = rad(tb);
      for (let j = 0; j <= NR; j++) { const f = j / NR * Math.PI * 2, c = Math.cos(f), s = Math.sin(f);
        P.push(x, r * s * (s > 0 ? 0.95 : 0.78), r * c * 0.88); U.push(tb, j / NR);
        const w = incSS((-s - 0.08) / 0.3); const col = top.clone().lerp(belly, w); C.push(col.r, col.g, col.b); } }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); parts.push(g.toNonIndexed()); }
  const fin = (sh, th, col, fn) => { const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * 0.5, bevelSize: th * 0.6, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -th / 2); if (fn) fn(g); const n = g.attributes.position.count, C = new Float32Array(n * 3); for (let i = 0; i < n; i++) { C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(C, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); parts.push(g); };
  const S2 = pts => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) pts[i].length === 4 ? s.quadraticCurveTo(...pts[i]) : s.lineTo(...pts[i]); s.closePath(); return s; };
  // aleta dorsal, segunda dorsal, cola (lóbulo de arriba más grande) y pectorales
  fin(S2([[0.52, 0.28], [0.25, 0.62, -0.16, 0.86], [-0.06, 0.55, 0.02, 0.3]]), 0.05, top);
  fin(S2([[-0.66, 0.15], [-0.8, 0.3, -0.96, 0.36], [-0.88, 0.24, -0.9, 0.14]]), 0.035, top);
  fin(S2([[-1.32, 0.07], [-1.6, 0.38, -2.0, 0.8], [-1.78, 0.36, -1.66, 0.04], [-1.8, -0.18, -1.84, -0.46], [-1.55, -0.2, -1.32, -0.06]]), 0.05, top);
  for (const sd of [1, -1]) fin(S2([[0.24, 0], [0.12, 0.45, -0.36, 0.66], [-0.1, 0.3, -0.16, 0]]), 0.04, top, g => {
    g.rotateX(Math.PI / 2 + 0.5); if (sd < 0) g.scale(1, 1, -1); g.translate(0.55, -0.17, 0.2 * sd); });
  const geo = mergeGeometries(parts); geo.computeBoundingSphere();
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  const body = new THREE.Mesh(geo, mat); body.castShadow = true; body.receiveShadow = true;
  const g = new THREE.Group(); g.add(body);
  // ojos grandes y brillantes (lo que lo hace simpático) y una sonrisa suave
  const eyeM = new THREE.MeshPhysicalMaterial({ color: 0x0b0d12, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 });
  const hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sd of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), eyeM); e.position.set(1.02, 0.1, 0.225 * sd); e.scale.set(1, 1.08, 0.75); g.add(e);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 24), new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.5 })); ring.position.copy(e.position); ring.position.z += 0.012 * sd; ring.rotation.y = sd > 0 ? -0.35 : Math.PI + 0.35; ring.rotation.x = 0; ring.scale.set(1, 1.08, 1); g.add(ring);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), hiM); h.position.set(1.05, 0.135, 0.272 * sd); g.add(h); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 24, 1.5), new THREE.MeshStandardMaterial({ color: 0x3a4656, roughness: 0.6 }));
  smile.rotation.set(Math.PI / 2, 0, -0.75); smile.position.set(0.98, -0.175, 0); g.add(smile);
  const base = Float32Array.from(geo.attributes.position.array);
  g.userData = { body, geo, base };
  return g;
}
// ondula el cuerpo: A amplitud (m), ph fase, bend curva de giro
function incSharkFlex(sh, A, ph, bend) {
  const { geo, base } = sh.userData, p = geo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { const x = base[i], tb = clamp((x + 2.0) / 3.5), w = Math.pow(1 - tb, 1.7);
    p[i + 2] = base[i + 2] + A * w * Math.sin(ph - 4.2 * (1 - tb)) + bend * (1 - tb) * (1 - tb); }
  geo.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- un barco (casco en planta con proa a −z, obra viva roja, timón y hélice: lo que se ve desde abajo)
function incHull(L, B, draft, free, colTop, colBot) {
  const sh = new THREE.Shape(); sh.moveTo(-B / 2, -L / 2 + 0.4); sh.quadraticCurveTo(-B / 2, -L / 2, -B / 2 + 0.4, -L / 2); sh.lineTo(B / 2 - 0.4, -L / 2); sh.quadraticCurveTo(B / 2, -L / 2, B / 2, -L / 2 + 0.4);
  sh.lineTo(B / 2, L * 0.12); sh.quadraticCurveTo(B / 2, L * 0.4, 0, L / 2); sh.quadraticCurveTo(-B / 2, L * 0.4, -B / 2, L * 0.12); sh.closePath();
  const part = (y0, y1, col, bev) => { const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 16 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); const m = new THREE.Mesh(g, paint(col, 0.45, 0.4)); m.castShadow = true; m.receiveShadow = true; return m; };
  const g = new THREE.Group();
  g.add(part(-draft + 0.25, -0.3, colBot, 0.25));
  g.add(part(-0.3, free, colTop, 0.12));
  // timón y hélice (girando) bajo la popa
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.5, metalness: 0.5 });
  const brass = metal(0xc9a45c, 0.3);
  const rud = rbox(0.14, 1.3, 1.0, paint(colBot, 0.5, 0.3), 0.05); rud.rotation.y = Math.PI / 2; rud.position.set(0, -draft - 0.25, L / 2 - 0.55); g.add(rud);
  const prop = new THREE.Group(); prop.position.set(0, -draft - 0.25, L / 2 - 1.35);
  const hub = cyl(0.13, 0.13, 0.35, brass, 16); hub.rotation.x = Math.PI / 2; prop.add(hub);
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), brass); b.scale.set(0.42, 1, 0.12); b.position.y = 0.3; const a = new THREE.Group(); a.rotation.z = k * Math.PI * 2 / 3; b.rotation.y = 0.5; a.add(b); prop.add(a); }
  g.add(prop);
  const shaft = cyl(0.06, 0.06, 0.8, dark, 10); shaft.rotation.x = Math.PI / 2; shaft.position.set(0, -draft - 0.25, L / 2 - 1.85); g.add(shaft);
  g.userData.prop = prop; return g;
}
function incMerchant() {      // mercante pequeño (≈16 m): casco azul marino, obra viva roja, puente blanco a popa, chimenea y unos contenedores
  const L = 16, B = 4.2, g = incHull(L, B, 1.8, 1.4, 0x1d2f52, 0xb8382f);
  const white = paint(0xf1f3f5, 0.4, 0.5);
  const br = rbox(3.2, 2.4, 3.0, white, 0.15); br.position.set(0, 2.6, L / 2 - 2.6); g.add(br);
  const fun = cyl(0.45, 0.5, 1.6, paint(0xe2a331, 0.4), 20); fun.position.set(0, 4.5, L / 2 - 2.4); g.add(fun);
  const cols = [0xd94a3a, 0x2f7fd0, 0xe2a331, 0x3aa776, 0xd94a3a];
  cols.forEach((c, i) => { const b = rbox(3.0, 1.1, 2.0, paint(c, 0.5, 0.3), 0.06); b.position.set(0, 1.95, -L / 2 + 3.2 + i * 2.05); g.add(b); });
  g.userData.hawse = v3(B / 2 - 0.55, -0.35, -L / 2 + 1.6); g.userData.L = L;
  return g;
}
function incTrawler() {       // pesquero (≈11 m): casco rojo y blanco, puente adelante, pórtico de popa
  const L = 11, B = 3.6, g = incHull(L, B, 1.5, 1.2, 0xe8ecef, 0xc0392b);
  const wh = rbox(2.4, 1.9, 2.4, paint(0xf1f3f5, 0.4, 0.5), 0.12); wh.position.set(0, 2.2, -L / 2 + 3.4); g.add(wh);
  const blue = paint(0x2f7fd0, 0.4); const gm = metal(0xb9c0c9, 0.35);
  for (const sd of [-1, 1]) g.add(bar(v3(sd * 1.5, 1.2, L / 2 - 0.6), v3(sd * 1.1, 4.0, L / 2 - 0.9), 0.08, gm));
  g.add(bar(v3(-1.15, 4.0, L / 2 - 0.9), v3(1.15, 4.0, L / 2 - 0.9), 0.08, gm));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(B + 0.06, 0.22, L * 0.62), blue); stripe.position.set(0, 0.85, -0.6); g.add(stripe);
  g.userData.stern = v3(0, 0.2, L / 2 - 0.7); g.userData.L = L;
  return g;
}

// ---------------------------------------------------------------- el ancla (clásica, de cepo: se lee a la primera). Cruz (crown) en el origen, caña hacia +Y, brazos en el plano YZ
function incAnchor() {
  const m = new THREE.MeshStandardMaterial({ color: 0x3b4049, roughness: 0.42, metalness: 0.65 });
  const g = new THREE.Group();
  const sh = cyl(0.075, 0.09, 1.75, m, 18); sh.position.y = 0.875; g.add(sh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 28), m); ring.position.y = 1.92; ring.rotation.y = Math.PI / 2; ring.castShadow = true; g.add(ring);
  const stock = cyl(0.055, 0.055, 1.5, m, 14); stock.rotation.z = Math.PI / 2; stock.position.y = 1.62; g.add(stock);
  for (const k of [-1, 1]) { const b = sph(0.08, m, 12, 8); b.position.set(0.75 * k, 1.62, 0); g.add(b); }
  // brazos: arco desde la cruz, subiendo hacia la caña, con uña (pala) en la punta
  const arms = []; for (let i = 0; i <= 20; i++) { const u = i / 20, a = (u * 2 - 1) * 1.15; arms.push(v3(0, 0.7 - 0.72 * Math.cos(a), 0.78 * Math.sin(a))); }
  g.add(tube(arms, 0.07, m, 40, false, 12));
  for (const k of [-1, 1]) { const a = 1.15 * k, tip = v3(0, 0.7 - 0.72 * Math.cos(a), 0.78 * Math.sin(a));
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 4), m); f.scale.set(0.35, 1, 1); f.castShadow = true;
    f.position.copy(tip).add(v3(0, 0.1, 0.02 * k)); f.rotation.x = -0.75 * k; g.add(f);
    const pt = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), m); pt.position.copy(tip).add(v3(0, 0.36, -0.12 * k)); pt.rotation.x = -0.75 * k; g.add(pt); }
  const crown = sph(0.1, m, 14, 10); g.add(crown);
  return g;
}

// ---------------------------------------------------------------- la cadena (eslabones instanciados a lo largo de una curva)
function incChain(maxN = 110) {
  const geo = new THREE.TorusGeometry(0.075, 0.026, 8, 16); geo.scale(1, 1.5, 1);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x353a42, roughness: 0.4, metalness: 0.7 }), maxN);
  im.castShadow = true; im.frustumCulled = false; im.count = 0; return im;
}
const _incQ = new THREE.Quaternion(), _incQ2 = new THREE.Quaternion(), _incY = new THREE.Vector3(0, 1, 0);
function incChainSet(im, a, b, sag) {
  const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= sag;
  const cv = new THREE.QuadraticBezierCurve3(a, mid, b), L = cv.getLength(), n = Math.min(im.instanceMatrix.count, Math.max(2, Math.floor(L / 0.19)));
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = cv.getPointAt(u), tg = cv.getTangentAt(u);
    _incQ.setFromUnitVectors(_incY, tg); _incQ2.setFromAxisAngle(_incY, (i % 2) * Math.PI / 2); _incQ.multiply(_incQ2);
    _o.position.copy(p); _o.quaternion.copy(_incQ); _o.scale.setScalar(1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }
  im.count = n; im.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- el tramo del cable 2 que se rompe (x ∈ [1, 44], z = CABLE2_Z, medio enterrado). Se deforma con incCable2Set
function incCable2() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.45, metalness: 0.15 });
  const A = new THREE.Mesh(new THREE.BufferGeometry(), m), B = new THREE.Mesh(new THREE.BufferGeometry(), m); A.castShadow = B.castShadow = true; A.receiveShadow = B.receiveShadow = true;
  g.add(A, B);
  // los extremos rotos: cobre y fibra al rojo (se apagan)
  const hot = glowM(0xff6a1f, 4), tips = [];
  for (let k = 0; k < 2; k++) { const t = new THREE.Group(); const c = new THREE.Mesh(new THREE.SphereGeometry(INC_R * 1.05, 14, 10), hot); t.add(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(1.0, 0.45, 0.15).multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); sp.scale.setScalar(0.5); t.add(sp);
    t.userData.sp = sp; t.userData.c = c; t.visible = false; g.add(t); tips.push(t); }
  g.userData = { A, B, tips, hot, x0: 1, x1: 44 };
  incCable2Set(g, 0, 0, 0, -1, 0);
  return g;
}
// D: desplazamiento en z del punto de enganche (negativo = arrastrado hacia −z), Ly: cuánto se levanta de la arena, W: semiancho de la «V»,
// s: rotura (< 0 = entero), t: tiempo (para el latigazo)
function incCable2Set(g, D, Ly, W, s, t) {
  const U = g.userData, x0 = U.x0, x1 = U.x1, W2 = Math.max(W, 0.5);
  const pt = (x, env, envY, tipK) => { const q = clamp(1 - Math.abs(x - INC_XH) / W2), p = 0.6 * q + 0.4 * incSS(q);
    let dz = D * p, dy = Ly * p;
    if (s >= 0) { const lag = (1 - q) * 2.4; dz = D * p * Math.exp(-3.4 * s) * Math.cos(10.5 * s + lag) * (s > 0 ? 1 : 1); dy = Ly * p * Math.exp(-4 * s) + tipK * Math.pow(q, 3) * Math.sin(Math.PI * Math.min(1, s * 2.2)) * Math.exp(-1.5 * s); }
    const z = CABLE2_Z + dz; let y = incBed(x, z) + dy;
    const e = Math.min(x - x0, x1 - x) / 2; if (e < 1) y -= 0.25 * (1 - e);       // los extremos se meten en la arena
    return v3(x, y, z); };
  const build = (mesh, xa, xb) => { const n = Math.max(6, Math.round((xb - xa) * 4)), P = [];
    for (let i = 0; i <= n; i++) P.push(pt(lerp(xa, xb, i / n), 0, 0, 0.9));
    mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), n * 2, INC_R, 10, false); return P; };
  if (s < 0) { build(U.A, x0, x1); U.B.visible = false; for (const tp of U.tips) tp.visible = false; return; }
  const gap = 0.05 + 0.8 * eo(clamp(s * 1.6));
  const PA = build(U.A, x0, INC_XH - gap), PB = build(U.B, INC_XH + gap, x1); U.B.visible = true;
  const glow = Math.exp(-3 * s);
  [PA[PA.length - 1], PB[0]].forEach((p, k) => { const tp = U.tips[k]; tp.visible = glow > 0.03; tp.position.copy(p); tp.userData.sp.material.opacity = glow; tp.userData.sp.scale.setScalar(0.25 + 0.5 * glow); });
  U.hot.emissiveIntensity = 4 * glow + 0.2;
}

// ---------------------------------------------------------------- la red de arrastre (embudo de malla con relinga de flotadores naranjas, burlones que ruedan por el fondo,
// puertas y cables hasta el pesquero). Marco local: la boca en z = 0, avanza hacia −z; y = 0 el fondo
function incNet() {
  const g = new THREE.Group(), NU = 22, NV = 44, LEN = 8.5;
  const tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = 'rgba(190,225,235,0.16)'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(240,250,255,0.95)'; c.lineWidth = 3.2;
    for (let i = -8; i <= 16; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 256, 256); c.stroke(); c.beginPath(); c.moveTo(i * 32, 256); c.lineTo(i * 32 + 256, 0); c.stroke(); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(9, 5);
  const sec = (s, th) => { const hw = lerp(3.0, 0.42, Math.pow(s, 0.7)), h = lerp(2.5, 0.75, Math.pow(s, 0.8)), yc = 0.15 + h / 2, c = Math.cos(th), sn = Math.sin(th);
    return v3(hw * Math.sign(c) * Math.pow(Math.abs(c), 0.65), yc + h / 2 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.8), s * LEN - 0.7 * Math.max(0, sn) * (1 - s) * (1 - s)); };
  const P = [], UV = [], I = [];
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const p = sec(i / NU, j / NV * Math.PI * 2); P.push(p.x, p.y, p.z); UV.push(j / NV, i / NU); }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const netM = new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.85, emissive: 0x2a4a55, emissiveIntensity: 0.6 });
  const net = new THREE.Mesh(geo, netM); net.renderOrder = 2; g.add(net);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), netM); cap.scale.set(0.42, 0.38, 0.6); cap.position.set(0, 0.15 + 0.75 / 2, LEN); g.add(cap);
  const rope = new THREE.MeshStandardMaterial({ color: 0xece4c8, roughness: 0.7 });
  const line = (f, n, r, m) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(f(i / n)); return tube(pts, r, m, n * 3, false, 8); };
  for (const th of [Math.PI / 2, 0, Math.PI, Math.PI * 0.25, Math.PI * 0.75]) g.add(line(s => sec(s, th), 16, 0.028, rope));
  const head = line(u => sec(0, u * Math.PI), 24, 0.04, rope); g.add(head);
  const footM = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.6 });
  g.add(line(u => sec(0, Math.PI + u * Math.PI), 24, 0.06, footM));
  const floatM = plastic(0xff7a2b, 0.3), floats = [];
  for (let k = 0; k < 9; k++) { const f = sph(0.15, floatM, 16, 12); f.position.copy(sec(0, Math.PI * (k + 0.5) / 9)).add(v3(0, 0.12, 0)); g.add(f); floats.push(f); }
  const bobs = [];
  for (let k = 0; k < 11; k++) { const b = cyl(0.17, 0.17, 0.13, footM, 18); const p = sec(0, Math.PI + Math.PI * (k + 0.5) / 11); b.position.copy(p); b.rotation.z = Math.PI / 2; g.add(b); bobs.push(b); }
  // puertas (otter boards) y bridas
  const doorM = paint(0xf2b415, 0.4), doors = [];
  for (const sd of [-1, 1]) { const d = rbox(1.4, 0.85, 0.12, doorM, 0.07); d.position.set(3.9 * sd, 0.75, -5.5); d.rotation.y = Math.PI / 2 + 0.35 * sd; d.rotation.z = 0.1 * sd; g.add(d); doors.push(d);
    g.add(bar(v3(3.9 * sd, 0.75, -5.5), sec(0, sd > 0 ? 0 : Math.PI).add(v3(0, 1.1, 0)), 0.02, rope));
    g.add(bar(v3(3.9 * sd, 0.75, -5.5), sec(0, sd > 0 ? -0.15 : Math.PI + 0.15), 0.02, rope)); }
  g.userData = { net, geo, base: Float32Array.from(P), bobs, doors, LEN, NV, NU };
  return g;
}

// ---------------------------------------------------------------- todo junto
function buildIncidents() {
  const G = new THREE.Group(); G.name = 'incidents';
  const A = { shark: new THREE.Object3D(), anchor: new THREE.Object3D(), snapPoint: new THREE.Object3D(), net: new THREE.Object3D(), ship: new THREE.Object3D() };
  for (const k in A) G.add(A[k]);
  // tiburón
  const shark = incShark(); shark.scale.setScalar(0.9); shark.rotation.order = 'YZX'; G.add(shark);
  const NS = v3(INC_SN[0], incBed(INC_SN[0], INC_SN[1]) + 0.13, INC_SN[1]);
  const bubM = new THREE.MeshPhysicalMaterial({ color: 0xdff8ff, roughness: 0.05, transparent: true, opacity: 0.6, clearcoat: 1, depthWrite: false });
  const bubs = []; for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.025 + 0.02 * hash(i * 3.3), 10, 8), bubM); b.visible = false; G.add(b); bubs.push(b); }
  // mercante, cadena, ancla
  const ship = incMerchant(); ship.rotation.y = -Math.PI / 2; G.add(ship);
  const chain = incChain(); G.add(chain);
  const anchor = incAnchor(); anchor.scale.setScalar(0.95); G.add(anchor);
  // cable 2 (el tramo que se rompe)
  const cab = incCable2(); G.add(cab);
  // arena levantada (ancla y red)
  const puffM = () => new THREE.SpriteMaterial({ map: incPuffTex(), color: 0xe2d2ae, transparent: true, depthWrite: false, opacity: 0 });
  const puffs = []; for (let i = 0; i < 34; i++) { const p = new THREE.Sprite(puffM()); p.visible = false; G.add(p); puffs.push(p); }
  const npuffs = []; for (let i = 0; i < 26; i++) { const p = new THREE.Sprite(puffM()); p.visible = false; G.add(p); npuffs.push(p); }
  // chispas de la rotura + destello + luz
  const SPK = new THREE.Group(); G.add(SPK);
  const sp1 = sparks(SPK, 110, 0xffa040, 0.11), sp2 = sparks(SPK, 70, 0xff3b24, 0.08);
  for (const s of [sp1, sp2]) { s.material.toneMapped = false; s.material.color.multiplyScalar(2.2); }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(1, 0.55, 0.2).multiplyScalar(4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  flash.visible = false; G.add(flash);
  const pl = new THREE.PointLight(0xff7a30, 0, 9, 1.6); G.add(pl);
  // red y pesquero
  const net = incNet(); const bedN = incBed(INC_XN, 0) - 0.05; G.add(net);
  const trawler = incTrawler(); trawler.rotation.y = INC_NYAW; G.add(trawler);
  const wm = new THREE.MeshStandardMaterial({ color: 0x8d949e, roughness: 0.5, metalness: 0.4 });
  const warps = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), wm); G.add(m); return m; });
  for (const b of [ship, trawler]) b.traverse(o => { o.castShadow = false; });
  G.userData = { anchors: A, shark, NS, bubs, ship, chain, anchor, cab, puffs, npuffs, sp1, sp2, flash, pl, net, trawler, warps, bedN };
  incidentsAt(0, { shark: 0, anchor: 0, snap: 0, net: 0 }, G);
  _INC = G;
  return G;
}
let _INC = null;
// claves del tiburón: [s, dx, dy, dz (respecto al punto que huele), giro, cabeceo]
const INC_SHK = [[0, -0.3, 2.3, 6.2, 1.57, -0.12], [0.22, -0.15, 1.3, 3.3, 1.57, -0.25], [0.4, 0, 0.46, 1.27, 1.57, -0.35], [0.47, 0, 0.38, 1.24, 1.57, -0.44], [0.53, 0, 0.48, 1.3, 1.57, -0.32],
  [0.59, 0, 0.38, 1.24, 1.57, -0.44], [0.66, 0, 0.5, 1.35, 1.57, -0.22], [0.78, 0.7, 0.85, 1.9, 0.2, 0.02], [0.88, 0.55, 1.4, 3.4, -0.95, 0.12], [1, -0.2, 2.5, 7.0, -1.57, 0.14]];
const incShk = (s, c) => mono(s, INC_SHK.map(k => k[0]), INC_SHK.map(k => k[c]));
// el ancla: posición de la cruz e inclinación según a (0..0,35 baja · 0,35..0,75 se arrastra · 0,75..1 tira del cable) y la rotura
function incAnchorPose(a, s) {
  const zHook = CABLE2_Z - 0.12, zPull = CABLE2_Z - 2.6;
  let z, lift, tilt, span, sag;
  const yHang = -2.4;
  if (a < 0.35) { const u = eio(a / 0.35); z = INC_ZD; const yb = incBed(INC_XH, z) + 0.12; const y = lerp(yHang, yb, u);
    return { p: v3(INC_XH, y, z), tilt: 0.05 * Math.sin(a * 40) * (1 - u), span: 0, sag: 0 }; }
  if (a < 0.75) { const u = (a - 0.35) / 0.4; z = lerp(INC_ZD, zHook, incSS(u) * 0.3 + u * 0.7); lift = 0.1; tilt = 1.15 * eo(clamp(u * 3)) + 0.06 * Math.sin(u * 30); span = 5.2 * eo(clamp(u * 1.6)); sag = 1.3; }
  else { const u = incSS((a - 0.75) / 0.25); z = lerp(zHook, zPull, u); lift = lerp(0.1, 0.42, u); tilt = 1.15 - 0.15 * u; span = 5.2 + 0.6 * u; sag = lerp(1.3, 0.25, u); }
  if (s > 0) { const u = eo(s); z -= 3.2 * u; lift = lerp(lift, 0.1, u); tilt = 1.0 + 0.1 * u + 0.25 * Math.exp(-4 * s) * Math.sin(s * 18); span += 3.2 * u; sag = lerp(sag, 0.9, u); }
  return { p: v3(INC_XH, incBed(INC_XH, z) + lift, z), tilt, span, sag };
}
function incidentsAt(t, o = {}, G = _INC) {
  const U = G.userData, A = U.anchors;
  const sS = clamp(o.shark ?? 0), aS = clamp(o.anchor ?? 0), snS = clamp(o.snap ?? 0), nS = clamp(o.net ?? 0);
  // ---- tiburón
  { const sh = U.shark, on = sS > 0.001 && sS < 0.999; sh.visible = on;
    const yaw0 = incShk(sS, 4), shake = 0.26 * Math.sin((sS - 0.62) / 0.12 * Math.PI * 2) * (sS > 0.62 && sS < 0.74 ? Math.sin((sS - 0.62) / 0.12 * Math.PI) : 0);
    sh.position.set(U.NS.x + incShk(sS, 1), U.NS.y + incShk(sS, 2), U.NS.z + incShk(sS, 3));
    sh.rotation.set(0.0, yaw0 + shake, incShk(sS, 5));
    const fast = 1 - 0.75 * (incWin(sS, 0.33, 0.42) - incWin(sS, 0.64, 0.74));
    const dy = (incShk(Math.min(1, sS + 0.02), 4) - incShk(Math.max(0, sS - 0.02), 4)) / 0.04;
    incSharkFlex(sh, 0.13 * fast, t * Math.PI * 2 * (1.2 + 1.2 * fast), clamp(-dy * 0.05, -0.3, 0.3));
    A.shark.position.copy(sh.position);
    U.bubs.forEach((b, i) => { const s0 = 0.45 + i * 0.035, k = (sS - s0) / 0.28; b.visible = on && k > 0 && k < 1; if (!b.visible) return;
      b.position.set(U.NS.x + 0.15 * Math.sin(i * 2.1 + k * 6), U.NS.y + 0.12 + k * 1.6, U.NS.z + 0.08 * Math.cos(i * 1.3 + k * 5)); b.material.opacity = 0.6 * (1 - k); }); }
  // ---- barco, cadena, ancla
  const P = incAnchorPose(aS, snS), sh = U.ship;
  const hOff = sh.userData.hawse.clone().applyAxisAngle(_incY, -Math.PI / 2);
  sh.position.set(INC_XH - hOff.x, 0.05 * Math.sin(t * 1.4), P.p.z - P.span - hOff.z);
  sh.rotation.set(0.02 * Math.sin(t * 1.1), -Math.PI / 2, 0.008 * Math.sin(t * 0.9 + 1));
  sh.userData.prop.rotation.z = t * 3;
  A.ship.position.set(sh.position.x, -1.8, sh.position.z);
  const an = U.anchor; an.position.copy(P.p); an.rotation.set(-P.tilt, 0, 0);
  an.updateMatrixWorld(); const ring = v3(0, 1.92, 0).applyMatrix4(an.matrix);
  sh.updateMatrix(); const hw = sh.userData.hawse.clone().applyMatrix4(sh.matrix);
  incChainSet(U.chain, ring, hw, P.sag);
  A.anchor.position.copy(P.p);
  // ---- cable 2: la «V» del enganche y la rotura
  const zHook = CABLE2_Z - 0.12;
  let D = 0, Ly = 0, Wd = 2;
  if (aS > 0.75) { const u = incSS((aS - 0.75) / 0.25); const P1 = incAnchorPose(Math.max(aS, 0.75), 0); D = Math.min(0, P1.p.z - 0.25 - CABLE2_Z) * (u > 0 ? 1 : 0); Ly = 0.38 * u; Wd = 2.5 + 3.2 * u; }
  if (snS > 0) { const P1 = incAnchorPose(1, 0); D = P1.p.z - 0.25 - CABLE2_Z; Ly = 0.38; Wd = 5.7; }
  incCable2Set(U.cab, D, Ly, Wd, snS > 0 ? snS : -1, t);
  const P1 = incAnchorPose(1, 0); A.snapPoint.position.set(INC_XH, incBed(INC_XH, P1.p.z) + 0.4, P1.p.z - 0.25);
  // ---- arena levantada por el ancla
  const crownAt = a => incAnchorPose(a, 0).p;
  U.puffs.forEach((p, i) => { const a0 = i < 5 ? 0.33 + i * 0.006 : 0.37 + (i - 5) / 29 * 0.62, age = (aS - a0) / 0.22 + (snS > 0 ? snS * 0.6 : 0);
    p.visible = aS > a0 && age < 1; if (!p.visible) return;
    const c = crownAt(a0), r1 = hash(i * 7.1), r2 = hash(i * 3.7);
    p.position.set(c.x + (r1 - 0.5) * 1.2, c.y + 0.15 + age * (0.5 + r2 * 0.6), c.z + (r2 - 0.5) * 0.7 + 0.3);
    p.scale.setScalar(0.5 + age * (1.4 + r1)); p.material.opacity = 0.6 * Math.sin(Math.PI * Math.min(1, age * 1.6 + 0.12)) * (1 - age); });
  // ---- la rotura: chispas, destello, luz
  { const on = snS > 0 && snS < 1, c = A.snapPoint.position; const st = snS * 1.1;
    U.sp1.visible = U.sp2.visible = on && snS < 0.85;
    if (U.sp1.visible) { burst(U.sp1, c, st, 0, 0.9, 1.0, false, 1.2); burst(U.sp2, c, st * 0.85, 0, 0.7, 1.0, false, 0.8);
      U.sp1.material.opacity = U.sp2.material.opacity = 1 - incSS(snS / 0.85); }
    const fl = snS > 0 ? Math.exp(-9 * snS) : 0; U.flash.visible = fl > 0.02; U.flash.position.copy(c); U.flash.scale.setScalar(0.6 + 2.4 * fl); U.flash.material.opacity = Math.min(1, fl * 1.4);
    U.pl.position.copy(c); U.pl.intensity = 60 * fl; }
  // ---- la red: avanza en diagonal (la boca mira a medias a la cámara), apoyada en la pendiente del fondo
  { const net = U.net, on = nS > 0.001 && nS < 0.999; net.visible = on; U.trawler.visible = on; for (const w of U.warps) w.visible = on;
    const P0 = incNetPos(nS), f = INC_NF.clone(), nrm = incBedN(P0.x, P0.z);
    const zA = f.clone().negate().addScaledVector(nrm, f.dot(nrm)).normalize(), xA = new THREE.Vector3().crossVectors(nrm, zA);
    net.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, nrm, zA)); net.position.set(P0.x, incBed(P0.x, P0.z) - 0.05, P0.z);
    const nu = net.userData, p = nu.geo.attributes.position.array, b = nu.base;
    for (let i = 0; i < p.length; i += 3) { const s = clamp(b[i + 2] / nu.LEN); p[i] = b[i] * (1 + 0.04 * Math.sin(t * 3.1 + s * 7)); p[i + 1] = b[i + 1] + 0.07 * s * Math.sin(t * 2.6 + s * 9 + b[i] * 0.8); }
    nu.geo.attributes.position.needsUpdate = true;
    for (const bb of nu.bobs) bb.rotation.x = -nS * INC_NL / 0.17;
    const tr = U.trawler; tr.position.copy(P0).addScaledVector(f, 15.5); tr.position.y = 0.05 * Math.sin(t * 1.6); tr.rotation.set(0.025 * Math.sin(t * 1.3), INC_NYAW, 0, 'YXZ');
    tr.updateMatrixWorld(); net.updateMatrixWorld();
    nu.doors.forEach((d, k) => { const a = d.getWorldPosition(new THREE.Vector3()), st = tr.localToWorld(v3((k ? 1 : -1) * 1.2, 0.6, tr.userData.L / 2 - 0.7));
      const w = U.warps[k], dd = st.clone().sub(a); w.position.copy(a).add(st).multiplyScalar(0.5); w.scale.set(1, dd.length(), 1); w.quaternion.setFromUnitVectors(_incY, dd.normalize()); });
    A.net.position.set(P0.x, incBed(P0.x, P0.z) + 1.3, P0.z);
    U.npuffs.forEach((pf, i) => { const n0 = i / 26, age = (nS - n0) / 0.16; pf.visible = on && nS > n0 && age < 1; if (!pf.visible) return;
      const r1 = hash(i * 5.3), r2 = hash(i * 9.1), q = incNetPos(n0), side = (r1 - 0.5) * 5.4;
      pf.position.set(q.x + xA.x * side - f.x * (0.5 + age), incBed(q.x, q.z) + 0.25 + age * 0.6, q.z + xA.z * side - f.z * (0.5 + age));
      pf.scale.setScalar(0.6 + age * (1.6 + r2)); pf.material.opacity = 0.5 * Math.sin(Math.PI * Math.min(1, age * 1.5 + 0.1)) * (1 - age); }); }
}
const INC_NF = new THREE.Vector3(-Math.sin(INC_NYAW), 0, -Math.cos(INC_NYAW));
function incNetPos(n) { return v3(INC_XN, 0, INC_NZ).addScaledVector(INC_NF, (n - 0.55) * INC_NL); }
function incBedN(x, z) { const e = 0.5; return v3(-(incBed(x + e, z) - incBed(x - e, z)) / (2 * e), 1, -(incBed(x, z + e) - incBed(x, z - e)) / (2 * e)).normalize(); }

// ---------------------------------------------------------------- la cámara (marco local) para u 0..1 (4,6 s): plano medio bajo el agua mirando hacia la orilla (−x).
// El tiburón (0–0,3) en el cable 1 (a la izquierda), luego se desliza a la derecha: cae el ancla, se arrastra y parte el cable 2 (0,3–0,75); se abre y pasa la red (0,75–1)
const INC_CAMK = [
  [0.00, [26.6, -4.4, 8.6], [16.5, -5.0, 7.4], 50],
  [0.27, [26.2, -4.5, 7.6], [16.5, -5.1, 6.9], 50],
  [0.40, [27.4, -4.2, 0.4], [18.6, -4.4, -0.9], 54],
  [0.58, [27.2, -4.3, -2.8], [18.8, -4.9, -3.8], 54],
  [0.70, [26.6, -4.4, -5.6], [18.8, -5.4, -6.8], 52],
  [0.80, [27.0, -4.5, -5.2], [18.6, -5.5, -6.0], 54],
  [0.90, [28.4, -4.4, -2.0], [16.8, -5.2, -3.2], 58],
  [1.00, [28.8, -4.3, -1.2], [16.8, -5.1, -2.8], 58]];
function INC_CAM(u) { const c = camKeys(clamp(u), INC_CAMK); return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f]; }
