// ---------------------------------------------------------------- el mundo realista: un valle verde con montañas, río y pueblos; nubes (con su sombra en el
// suelo), nubes grises al fondo, pájaros y el cielo. El aula está en el prado del fondo del valle (el origen); el avión vuela muy por encima.
const SUN = new THREE.Vector3(0.76, 0.63, 0.15).normalize();     // hacia el sol: ≈ 39° de altura, por detrás del avión (su sombra cae delante)
const HAZE = new THREE.Color().setRGB(0.72, 0.82, 0.95);          // color de la bruma del horizonte (lineal): cielo y niebla iguales
const LAND = { cx: -3500, cz: 0, size: 22000, n: 520, outer: 90000, no: 150 };
function _h2(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = _h2(i, j), b = _h2(i + 1, j), c = _h2(i, j + 1), d = _h2(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1, n = 0; for (let k = 0; k < o; k++) { s += a * vnoise(x * f + k * 17.3, y * f - k * 9.1); n += a; a *= 0.5; f *= 2.03; } return s / n; }
function ridged(x, y, o = 6) { let s = 0, a = 0.5, f = 1, n = 0, w = 1; for (let k = 0; k < o; k++) { let r = 1 - Math.abs(vnoise(x * f + k * 31.7, y * f + k * 11.3) * 2 - 1); r *= r; s += a * r * w; w = clamp(r * 1.7); n += a; a *= 0.5; f *= 2.1; } return s / n; }
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function valleyZ(x) { return 900 * Math.sin(x / 4200) + 480 * Math.sin(x / 1700 + 1.3); }
function landH(x, z) {
  const zc = valleyZ(x), d = Math.abs(z - zc), dr = Math.abs(z - zc - 18 * Math.sin(x / 230)), wall = sstep(650, 4300, d);
  const mtn = 1500 * ridged(x / 4600, z / 4600) + 420 * fbm(x / 1700 + 7, z / 1700, 4);
  const hills = 46 * fbm(x / 900, z / 900, 3);                        // el fondo del valle: lomas suaves (nunca por debajo del río)
  let h = wall * (mtn + 150 * wall) + (1 - wall) * hills;
  h = Math.min(h, -7 + 24 * Math.pow(dr / 70, 2));                   // el cauce del río
  const r = Math.hypot(x, z), flat = sstep(230, 900, r);              // el prado del colegio: llano
  return h * flat - 0.06 * (1 - flat);
}
const _lin = (r, g, b) => [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
const LC = { f1: _lin(0.37, 0.52, 0.22), f2: _lin(0.45, 0.56, 0.27), f3: _lin(0.56, 0.56, 0.33), f4: _lin(0.30, 0.45, 0.19), f5: _lin(0.47, 0.43, 0.30), forest: _lin(0.13, 0.27, 0.11), forest2: _lin(0.19, 0.33, 0.13),
  meadow: _lin(0.42, 0.52, 0.24), rock: _lin(0.47, 0.45, 0.42), rock2: _lin(0.36, 0.34, 0.32), snow: _lin(0.95, 0.96, 0.99), gravel: _lin(0.58, 0.56, 0.50) };
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function landCol(x, z, h, ny) {
  const n1 = fbm(x / 340, z / 340, 3), n2 = vnoise(x / 150 + 50, z / 150 - 20), n3 = fbm(x / 60, z / 60, 2);
  const fa = 0.35 + 0.9 * (vnoise(x / 2500, z / 2500) - 0.5), fu = x * Math.cos(fa) + z * Math.sin(fa) + 40 * vnoise(x / 300, z / 300), fv = -x * Math.sin(fa) + z * Math.cos(fa);
  const fi = Math.floor(fu / (70 + 50 * vnoise(x / 900, z / 900))), fj = Math.floor(fv / (110 + 90 * _h2(fi, 7))), fh = _h2(fi, fj);
  let c = fh > 0.86 ? LC.f5 : fh > 0.72 ? LC.f3 : fh > 0.5 ? LC.f2 : fh > 0.25 ? LC.f1 : LC.f4; c = mix3(c, LC.f1, 0.3 + 0.3 * n2);   // parcelas de campos (poco contraste: sin escalones)
  c = mix3(c, mix3(LC.forest, LC.forest2, n3), sstep(18, 110, h + 70 * (n1 - 0.5)));     // bosque en las laderas
  c = mix3(c, LC.meadow, sstep(950, 1150, h + 150 * (n1 - 0.5)));                         // prados de alta montaña
  c = mix3(c, mix3(LC.rock, LC.rock2, n3), Math.max(sstep(0.84, 0.62, ny) * sstep(150, 500, h), sstep(1250, 1450, h + 120 * (n1 - 0.5))));
  c = mix3(c, LC.snow, sstep(1500, 1650, h + 180 * (n1 - 0.5)) * sstep(0.55, 0.78, ny));
  const dr = Math.abs(z - valleyZ(x) - 18 * Math.sin(x / 230)); c = mix3(c, LC.gravel, sstep(48, 26, dr) * 0.55);   // orillas del río
  const k = 0.9 + 0.2 * n3; return [c[0] * k, c[1] * k, c[2] * k];
}
// ---------------------------------------------------------------- nubes: grupos de cúmulos (sprites con textura propia: arriba al sol, abajo gris) y nubes grises al fondo
function cloudPuffTex(seed, gray = 0) {
  const W2 = 512, H2 = 384;
  return canvasTex(W2, H2, (g) => {
    const m = document.createElement('canvas'); m.width = W2; m.height = H2; const q = m.getContext('2d');
    for (let i = 0; i < 34; i++) { const x = W2 * (0.16 + 0.68 * hash(i * 3.1 + seed)), y = H2 * (0.38 + 0.36 * Math.pow(hash(i * 5.3 + seed), 0.7)), r = 46 + 96 * hash(i * 7.7 + seed) * (1 - 0.4 * Math.abs(x / W2 - 0.5) * 2);
      const gr = q.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const A = q.getImageData(0, 0, W2, H2).data, img = g.createImageData(W2, H2), D = img.data;
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      const k = (j * W2 + i) * 4, a0 = A[k + 3] / 255; if (a0 < 0.01) { D[k + 3] = 0; continue; }
      const n = fbm(i / 38 + seed * 7, j / 38, 4), y = j / H2, bottom = sstep(0.86, 0.7, y);
      const a = clamp((a0 * 1.55 - 0.16) * (0.72 + 0.56 * n)) * bottom;
      const up = j > 6 ? A[((j - 6) * W2 + i) * 4 + 3] / 255 : 0, edge = clamp(1 - up);                // más claro donde no hay nube encima (al sol)
      let b = 0.74 + 0.22 * sstep(0.8, 0.3, y) + 0.16 * edge + 0.1 * (n - 0.5); b = clamp(b * (gray ? 0.86 : 1));
      D[k] = 255 * clamp(b * 0.985); D[k + 1] = 255 * clamp(b * 0.99); D[k + 2] = 255 * clamp(b * 1.0 + (1 - b) * 0.12); D[k + 3] = 255 * a;
    }
    g.putImageData(img, 0, 0);
  });
}
function buildLand() {
  // el suelo: una malla fina alrededor del vuelo y otra gruesa hasta el horizonte (un poco más baja donde se pisan)
  S.cloudList = [];
  for (let i = 0; i < 90; i++) { const x = -14000 + 19000 * hash(i * 2.71), z = -7000 + 14000 * hash(i * 6.13), s = 220 + 380 * hash(i * 9.7);
    if (Math.abs(z - 380) < 1700 + 0.12 * Math.max(0, -x) && x > -6500) continue;       // lejos del pasillo de la cámara: se ven de lado, en el horizonte
    S.cloudList.push({ x, y: 1380 + 380 * hash(i * 4.4), z, s }); }
  for (const c of S.cloudList) { const t = (c.y - Math.max(0, landH(c.x, c.z))) / SUN.y; c.gx = c.x - SUN.x * t; c.gz = c.z - SUN.z * t; }      // dónde cae la sombra de cada nube
  const shade = (x, z) => { let f = 1; for (const c of S.cloudList) { const d2 = ((x - c.gx) ** 2 + (z - c.gz) ** 2) / (c.s * c.s * 0.75); if (d2 < 9) f *= 1 - 0.5 * Math.exp(-d2); } return f; };
  const grid = (cx, cz, size, n, lower) => {
    const geo = new THREE.PlaneGeometry(size, size, n, n); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, N = P.count, col = new Float32Array(N * 3), uv = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const x = P.getX(i) + cx, z = P.getZ(i) + cz; let h = landH(x, z); if (lower) h -= lower(x, z); P.setXYZ(i, x, h, z); uv[i * 2] = x / 140; uv[i * 2 + 1] = z / 140; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const NO = geo.attributes.normal;
    for (let i = 0; i < N; i++) { const x = P.getX(i), z = P.getZ(i), c = landCol(x, z, P.getY(i), NO.getY(i)), f = shade(x, z) * 1.15; col[i * 3] = c[0] * f; col[i * 3 + 1] = c[1] * f; col[i * 3 + 2] = c[2] * f; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, M.land); m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m;
  };
  const half = LAND.size / 2;
  S.landNear = grid(-2600, -700, 9200, 560, null);                                        // fina (16 m) donde miran el dron y la avioneta
  S.land = grid(LAND.cx, LAND.cz, LAND.size, LAND.n, (x, z) => { const e = Math.min(x + 7200, 2000 - x, z + 5300, 3900 - z); return e <= 0 ? 0 : 14 * Math.min(1, e / 300); });
  S.landFar = grid(LAND.cx, LAND.cz, LAND.outer, LAND.no, (x, z) => { const dx = Math.abs(x - LAND.cx) - half, dz = Math.abs(z - LAND.cz) - half, e = Math.max(dx, dz); return e < -1500 ? 90 : e < 0 ? 90 * (-e / 1500) : 0; });
  // el río (cinta brillante por el fondo del valle)
  { const pts = [], wid = []; for (let x = -26000; x <= 12000; x += 60) { const z = valleyZ(x) + 18 * Math.sin(x / 230); pts.push([x, z]); wid.push(34 + 10 * Math.sin(x / 900)); }
    const pos = new Float32Array(pts.length * 6), idx = [];
    pts.forEach(([x, z], i) => { const [x2, z2] = pts[Math.min(pts.length - 1, i + 1)], [x0, z0] = pts[Math.max(0, i - 1)], tx = x2 - x0, tz = z2 - z0, L = Math.hypot(tx, tz), nx = -tz / L, nz = tx / L, w = wid[i] / 2;
      pos.set([x + nx * w, -5.2, z + nz * w, x - nx * w, -5.2, z - nz * w], i * 6); if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    S.river = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1f5a70, roughness: 0.3, metalness: 0.05, envMapIntensity: 0.4 })); S.river.receiveShadow = true; S.river.frustumCulled = false; scene.add(S.river); }
  // pueblos: casas blancas con tejado rojo junto al río
  { const NH = 520, walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xeee6da, roughness: 0.9 }), NH);
    const rg = new THREE.CylinderGeometry(0.0001, 0.72, 1, 4, 1); rg.rotateY(Math.PI / 4); const roofs = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0x6b3a2c, roughness: 0.9 }), NH);
    let k = 0; const towns = [-11800, -9300, -6900, -4600, -2600, -1100, 1600, 3900, 6200];
    towns.forEach((tx, ti) => { const n = 40 + Math.floor(30 * hash(ti * 3.3)), side = hash(ti * 7.1) > 0.5 ? 1 : -1, cz = valleyZ(tx) + side * (150 + 120 * hash(ti));
      for (let j = 0; j < n && k < NH; j++) { const a = hash(ti * 100 + j * 1.7) * 6.283, r = 25 + 170 * Math.sqrt(hash(ti * 100 + j * 2.9)), x = tx + Math.cos(a) * r * 1.4, z = cz + Math.sin(a) * r * 0.8;
        if (Math.abs(z - valleyZ(x)) < 45 || Math.hypot(x, z) < 400) continue;
        const w = 8 + 6 * hash(j * 3.7 + ti), d = 9 + 7 * hash(j * 5.1 + ti), hh = 5 + 4 * hash(j * 2.3 + ti), y = landH(x, z), yaw = hash(j * 9.1 + ti) * 3.14;
        _o.position.set(x, y + hh / 2 - 0.5, z); _o.rotation.set(0, yaw, 0); _o.scale.set(w, hh, d); _o.updateMatrix(); walls.setMatrixAt(k, _o.matrix);
        _o.position.set(x, y + hh - 0.5 + 1.6, z); _o.scale.set(w * 1.45, 3.2, d * 1.45); _o.updateMatrix(); roofs.setMatrixAt(k, _o.matrix); k++; } });
    walls.count = roofs.count = k; walls.receiveShadow = roofs.receiveShadow = true; walls.frustumCulled = roofs.frustumCulled = false; scene.add(walls, roofs); }
  // las nubes: cada grupo, 7-12 sprites (base plana, más grandes abajo)
  const texW = [1, 2, 3, 4, 5, 6].map(s => cloudPuffTex(s)), texG = [7, 8, 9].map(s => cloudPuffTex(s, 1));
  S.cloudSprites = [];
  S.cloudList.forEach((c, ci) => { const n = 7 + Math.floor(6 * hash(ci * 1.9));
    for (let j = 0; j < n; j++) { const a = hash(ci * 31 + j * 2.3) * 6.283, r = c.s * 0.55 * Math.sqrt(hash(ci * 17 + j * 4.1)), up = c.s * 0.28 * hash(ci * 11 + j * 6.7) * (1 - r / (c.s * 0.6)), sz = c.s * (0.5 + 0.45 * hash(ci * 13 + j * 8.9));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texW[(ci + j) % texW.length], transparent: true, depthWrite: false, fog: true })); sp.material.color.setScalar(1.75);
      sp.position.set(c.x + Math.cos(a) * r * 1.2, c.y + up + sz * 0.22, c.z + Math.sin(a) * r * 0.9); sp.scale.set(sz * 1.35, sz, 1); scene.add(sp); S.cloudSprites.push(sp); } });
  // nubes grises al fondo, cerca del horizonte (sin niebla: ya llevan su color de lejos)
  S.farClouds = [];
  for (let i = 0; i < 22; i++) { const a = -Math.PI * 0.45 + Math.PI * 0.9 * hash(i * 3.9) + (i % 2 ? Math.PI : 0), r = 15000 + 12000 * hash(i * 5.5), w = 2600 + 3400 * hash(i * 2.2);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texG[i % texG.length], transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    const gcol = 0.86 + 0.16 * hash(i * 8.1); sp.material.color.setRGB(gcol * 0.95, gcol * 0.98, gcol * 1.04);
    sp.position.set(-3500 + Math.cos(a) * r, 1800 + 1800 * hash(i * 6.6), Math.sin(a) * r * 0.8); sp.scale.set(w * 1.5, w * 0.55, 1); scene.add(sp); S.farClouds.push(sp); }
  // pájaros: dos bandadas en uve (ánsares), con aleteo
  const bm = new THREE.MeshStandardMaterial({ color: 0x5b554b, roughness: 0.85 }), wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.18, 0, 0, 0.22, 0, 0, 0.12, 0, 0.55, -0.18, 0, 0, 0.12, 0, 0.55, -0.02, 0, 0.92, -0.02, 0, 0.92, 0.12, 0, 0.55, 0.16, 0, 0.98]), 3)); wingGeo.computeVertexNormals();
  const makeBird = () => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), bm); body.scale.set(0.95, 0.2, 0.22); g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.45, 6), bm); neck.rotation.z = Math.PI / 2 + 0.15; neck.position.set(-0.62, 0.04, 0); g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), bm); head.position.set(-0.86, 0.08, 0); g.add(head);
    const wl = new THREE.Mesh(wingGeo, bm), wr = new THREE.Mesh(wingGeo, bm); wr.scale.z = -1; wl.material.side = THREE.DoubleSide; g.add(wl, wr); g.userData.w = [wl, wr];
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(1.9); scene.add(g); return g; };
  S.flocks = [{ n: 9, f0: 25, y: 1532, z: 393, sp: 16 }, { n: 13, f0: -159, y: 1518, z: 326, sp: 16 }].map(F => ({ ...F, birds: Array.from({ length: F.n }, makeBird) }));
}
// el cielo: degradado de bruma a azul, con el sol y su halo (sigue a la cámara)
function skyLand() {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, uniforms: { sunDir: { value: SUN }, haze: { value: HAZE } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 sunDir, haze; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 zen = vec3(0.075, 0.22, 0.60), hor = haze, gnd = haze * vec3(0.86, 0.9, 0.92);
        vec3 c = h > 0. ? mix(hor, zen, pow(clamp(h * 1.05, 0., 1.), 0.48)) : mix(hor, gnd, clamp(-h * 6., 0., 1.));
        float s = max(dot(d, sunDir), 0.); c += vec3(1.0, 0.9, 0.72) * (pow(s, 1800.) * 30. + pow(s, 40.) * 0.35 + pow(s, 6.) * 0.12);
        gl_FragColor = vec4(c, 1.); }` });
  const s = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), m); s.renderOrder = -10; s.frustumCulled = false; return s;
}
function birdsAt(t) {
  const u = t < 13 ? t : (t >= 43 ? t - END : null);
  for (const F of S.flocks) F.birds.forEach((b, i) => { b.visible = u !== null; if (!b.visible) return;
    const row = Math.ceil(i / 2), side = i === 0 ? 0 : (i % 2 ? 1 : -1), P = bigBase(0);
    b.position.set(P.x + F.f0 - F.sp * u + row * 6.5 + 0.6 * Math.sin(u * 0.9 + i), F.y + 0.4 * Math.sin(u * 1.3 + i * 1.7) + row * 0.3, F.z + side * row * 5);
    b.rotation.set(0, 0, 0.04 * Math.sin(u * 0.8 + i));
    const fl = 0.62 * Math.sin(2 * Math.PI * 2.6 * u + i * 0.9); b.userData.w[0].rotation.x = -fl; b.userData.w[1].rotation.x = fl; });
}
