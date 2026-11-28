// ---------------------------------------------------------------- «El escalón torcido»: LA ESCALERA (365 bloques torcidos, uno por día) y LOS MUEBLES.
// Escalera: tramo recto dentro de la planta alta (del rincón de la izquierda hacia la derecha), sale por el agujero del tejado y sigue en espiral hacia el cielo.
const ST = { N: 365, RUN: 0.26, RISE: 0.24, z: -0.9, x0: -2.0, nIn: 13, nOut: 5, hR: 1.9, hRise: 0.18, hStep: 0.34, bw: 0.4, bh: 0.2, bd: 0.62 };
// posición (centro del bloque) y rumbo de cada escalón i (0…364)
function stairAt(i) {
  const y2 = HO.y2, top = j => y2 + 0.25 + ST.RISE * j;
  if (i < ST.nIn + ST.nOut) return { p: _v(ST.x0 + ST.RUN * i, top(i) - ST.bh / 2, ST.z), yaw: 0 };
  const n = ST.nIn + ST.nOut, e = stairAt(n - 1), j = i - n + 1, dth = ST.hStep / ST.hR, th = j * dth, R = ST.hR * (1 - 0.18 * clamp(j / 300));
  // la espiral empieza donde acaba el tramo recto (θ = 0 en el lado +x del centro) y gira hacia atrás (−z)
  const cx = e.p.x - ST.hR, cz = e.p.z, x = cx + R * Math.cos(th), z = cz - R * Math.sin(th);
  return { p: _v(x, e.p.y + ST.hRise * j, z), yaw: 0 }; }
// el rumbo «hacia arriba» de la escalera (tangente) y el lateral
function stairDir(i) { const a = stairAt(Math.max(0, i - 1)).p, b = stairAt(Math.min(ST.N - 1, i + 1)).p; return b.sub(a).setY(0).normalize(); }
const STAIR = {};
function buildStairs(G) { const g = new THREE.Group(); G.add(g); STAIR.g = g;
  const geo = rboxM(ST.bw, ST.bh, ST.bd, 0.025, null, 2).geometry; geo.computeVertexNormals();
  // arcilla cálida con un poco de grano (cada bloque, su tono)
  const [cc, ch] = stuccoCanvases([236, 214, 182], 61, 256); const m = texMat(cc, ch, [1, 1], { r: 0.78, ns: 0.6 }); STAIR.m = m;
  const im = new THREE.InstancedMesh(geo, m, ST.N); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; g.add(im); STAIR.im = im;
  const R = rng(77), col = new THREE.Color(); STAIR.base = [];
  for (let i = 0; i < ST.N; i++) { const a = stairAt(i), d = stairDir(i), yaw = Math.atan2(-d.z, d.x);
    const straight = [3, 9, 16, 41, 87, 140, 222, 301].includes(i);       // «casi todos»: unos pocos salen rectos
    const tw = straight ? 0 : 1, ry = (R() - 0.5) * 0.44 * tw, rx = (R() - 0.5) * 0.14 * tw, rz = (R() - 0.5) * 0.3 * tw;
    const off = _v((R() - 0.5) * 0.06 * tw, (R() - 0.5) * 0.03 * tw, (R() - 0.5) * 0.1 * tw);
    STAIR.base.push({ p: a.p.clone().add(off), yaw, rx, ry, rz, s: 0.92 + R() * 0.16, straight });
    col.setHSL(0.08 + (R() - 0.5) * 0.03, 0.32 + R() * 0.12, 0.76 + (R() - 0.5) * 0.1); im.setColorAt(i, col); }
  im.instanceColor.needsUpdate = true; stairsAt(ST.N, 0); return g; }
// cuántos hay puestos (n, con decimales: el último va apareciendo) y el «rebobinado» (k: 0 normal … 1 recogiéndose hacia arriba)
const _so = new THREE.Object3D();
function stairsAt(n, t) { const im = STAIR.im;
  for (let i = 0; i < ST.N; i++) { const b = STAIR.base[i], u = clamp(n - i), e = u <= 0 ? 0 : 1 + Math.sin(clamp(u / 0.6) * Math.PI) * (1 - clamp(u / 0.6)) * 0.12;
    _so.position.copy(b.p); _so.position.y += (1 - eo(clamp(u * 1.4))) * 0.5;
    _so.rotation.set(b.rx, b.yaw + b.ry, b.rz, 'YXZ'); _so.scale.set(b.s, 1, 1).multiplyScalar(Math.max(0.0001, e * eo(clamp(u * 1.6)))); _so.updateMatrix(); im.setMatrixAt(i, _so.matrix); }
  im.instanceMatrix.needsUpdate = true; }
// punto de apoyo del pie en el escalón i (encima del bloque)
function stepTop(i) { const b = STAIR.base[clamp(Math.round(i), 0, ST.N - 1)]; return b.p.clone().setY(b.p.y + ST.bh / 2); }

// ---- planta baja: banco de trabajo, taburete, flexo, el bloque pulido, papeles arrugados, bocetos en la pared
const BENCH = { x: 0.66, z: 0.42, top: 0.7, L: 0.95, W: 0.6 };
const SEAT = { x: -0.36, z: 0.42, h: 0.56 };
const BLOCK0 = _v(0.24, BENCH.top + 0.11, 0.42);           // el bloque perfecto, encima del banco (centro)
function workbench(G) { const g = new THREE.Group(); g.position.set(BENCH.x, 0, BENCH.z); G.add(g); const wood = stdM(0x7f6248, 0.7), dark = stdM(0x4b3a2c, 0.8);
  g.add(box(BENCH.L, 0.06, BENCH.W, wood, 0, BENCH.top - 0.03, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, BENCH.top - 0.06, 0.05, dark, sx * (BENCH.L / 2 - 0.06), (BENCH.top - 0.06) / 2, sz * (BENCH.W / 2 - 0.06)));
  g.add(box(BENCH.L - 0.1, 0.03, BENCH.W - 0.1, dark, 0, 0.18, 0));
  // lijas, regla y trapo
  const sand = stdM(0xc9a46a, 0.95); for (let i = 0; i < 4; i++) { const s = box(0.14, 0.004, 0.1, sand, 0.15 + i * 0.05, BENCH.top + 0.003 + i * 0.004, -0.16 + i * 0.02); s.rotation.y = i * 0.4; g.add(s); }
  const rule = box(0.32, 0.006, 0.03, metal(0xc8ccd2, 0.3), 0.28, BENCH.top + 0.004, 0.2); rule.rotation.y = 0.3; g.add(rule);
  shadowAll(g); return g; }
function stool(G) { const g = new THREE.Group(); g.position.set(SEAT.x, 0, SEAT.z); G.add(g); const w = stdM(0x6e5440, 0.75);
  ad(g, cyl(0.19, 0.19, 0.05, w, 20)).position.y = SEAT.h - 0.025; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = cyl(0.018, 0.022, SEAT.h - 0.04, w, 8); l.position.set(Math.cos(a) * 0.12, (SEAT.h - 0.04) / 2, Math.sin(a) * 0.12); l.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1); g.add(l); }
  shadowAll(g); return g; }
// flexo: pie, dos brazos y la pantalla; la bombilla es una luz barata fría
function deskLamp(G) { const g = new THREE.Group(); g.position.set(BENCH.x + 0.36, BENCH.top, BENCH.z - 0.18); G.add(g); const m = stdM(0x2c3036, 0.4, { metalness: 0.5 });
  ad(g, cyl(0.08, 0.09, 0.025, m, 20)).position.y = 0.012; const a1 = new THREE.Group(); a1.position.y = 0.03; a1.rotation.z = 0.5; g.add(a1); const r1 = cyl(0.012, 0.012, 0.36, m, 8); r1.position.y = 0.18; a1.add(r1);
  const a2 = new THREE.Group(); a2.position.y = 0.36; a2.rotation.z = 1.35; a1.add(a2); const r2 = cyl(0.011, 0.011, 0.32, m, 8); r2.position.y = 0.16; a2.add(r2);
  const hd = new THREE.Group(); hd.position.y = 0.32; hd.rotation.z = 0.75; a2.add(hd); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.13, 24, 1, true), stdM(0x2c3036, 0.4, { metalness: 0.5, side: THREE.DoubleSide })); sh.position.y = -0.03; hd.add(sh);
  const bulbM = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, emissive: 0xdfe9ff, emissiveIntensity: 3.0 }); const bulb = sph(0.03, bulbM, 14, 10); bulb.position.y = -0.07; hd.add(bulb);
  shadowAll(g); g.updateMatrixWorld(true); const wp = bulb.getWorldPosition(new THREE.Vector3());
  return { g, bulbM, bulb, src: nightSrc(wp.clone().add(_v(0, -0.05, 0)), 0xcfe0ff, 3.2, 1.25, 'lamp'), glow: nightGlow(G, wp, 0xe8f0ff, 0.35, 0.6, 'lamp') }; }
// el bloque perfecto: canto vivo, brillo de espejo
function perfectBlock() { const m = new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, reflectivity: 0.6, sheen: 0 });
  const b = rboxM(ST.bw, 0.22, ST.bd * 0.6, 0.004, m, 2); b.userData.m = m; return b; }
// papeles arrugados (bolas facetadas) por el suelo: se van acumulando
const PAPER = { N: 64 };
function paperBalls(G) { const geo = new THREE.IcosahedronGeometry(0.05, 1); { const p = geo.attributes.position, R = rng(31); for (let i = 0; i < p.count; i++) { const v = _v(p.getX(i), p.getY(i), p.getZ(i)), k = 0.75 + R() * 0.5; p.setXYZ(i, v.x * k, v.y * k, v.z * k); } geo.computeVertexNormals(); }
  const m = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.95, flatShading: true }); const im = new THREE.InstancedMesh(geo, m, PAPER.N); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; G.add(im);
  const R = rng(37); PAPER.im = im; PAPER.base = [];
  for (let i = 0; i < PAPER.N; i++) { let x, z, ok = false; for (let k = 0; k < 30 && !ok; k++) { const a = R() * Math.PI * 2, r = 0.35 + Math.pow(R(), 1.3) * 1.25; x = SEAT.x + 0.1 + Math.cos(a) * r * 1.1; z = 0.4 + Math.sin(a) * r * 0.6;
      ok = x > HO.x0 + 0.1 && x < HO.x1 - 0.1 && z > HO.zb + 0.1 && z < HO.zf - 0.15 && !(Math.abs(x - BENCH.x) < 0.55 && Math.abs(z - BENCH.z) < 0.36); }
    const s = 0.75 + R() * 0.6; PAPER.base.push({ p: _v(x, 0.05 * s, z), r: _v(R() * 6, R() * 6, R() * 6), s, d: R() }); }
  papersAt(1); return im; }
function papersAt(k) { const im = PAPER.im; for (let i = 0; i < PAPER.N; i++) { const b = PAPER.base[i], u = clamp((k * PAPER.N - i)); _so.position.copy(b.p); _so.position.y += (1 - eo(u)) * 0.6; _so.rotation.set(b.r.x, b.r.y, b.r.z); _so.scale.setScalar(Math.max(0.0001, b.s * eo(u))); _so.updateMatrix(); im.setMatrixAt(i, _so.matrix); } im.instanceMatrix.needsUpdate = true; }
// bocetos clavados en la pared de abajo (escalones dibujados, tachados en rojo)
function sketches(G) { const g = new THREE.Group(); G.add(g); const R = rng(53);
  for (let i = 0; i < 9; i++) { const w = 0.3, h = 0.21, p = signPlane(w, h, 256, (c, W, H) => { c.fillStyle = '#f3efe4'; c.fillRect(0, 0, W, H); c.strokeStyle = '#4a5260'; c.lineWidth = 3;
      c.strokeRect(W * 0.25, H * 0.3, W * 0.5, H * 0.35); c.beginPath(); c.moveTo(W * 0.25, H * 0.3); c.lineTo(W * 0.35, H * 0.18); c.lineTo(W * 0.85, H * 0.18); c.lineTo(W * 0.75, H * 0.3); c.moveTo(W * 0.85, H * 0.18); c.lineTo(W * 0.85, H * 0.53); c.lineTo(W * 0.75, H * 0.65); c.stroke();
      c.font = '700 18px SpaceMono'; c.fillStyle = '#4a5260'; c.fillText('v' + (i + 2), 12, H - 14); c.strokeStyle = 'rgba(200,40,40,0.85)'; c.lineWidth = 6; c.beginPath(); c.moveTo(W * 0.15, H * 0.15); c.lineTo(W * 0.9, H * 0.85); c.moveTo(W * 0.9, H * 0.15); c.lineTo(W * 0.15, H * 0.85); c.stroke(); }, { r: 0.9 });
    p.position.set(-1.9 + (i % 5) * 0.36 + (R() - 0.5) * 0.05, 1.3 + Math.floor(i / 5) * 0.27 + (R() - 0.5) * 0.04, HO.zb + 0.012); p.rotation.z = (R() - 0.5) * 0.12; g.add(p); }
  return g; }
// foco de teatro (el «efecto foco»): cuerpo, cono de luz visible y una luz de verdad con sombra
function theaterSpot(G) { const g = new THREE.Group(); G.add(g); const m = stdM(0x1c1e22, 0.45, { metalness: 0.6 });
  const body = new THREE.Group(); body.position.set(SEAT.x + 0.1, HO.H1 - 0.12, SEAT.z - 0.1); g.add(body);
  const can = cyl(0.12, 0.1, 0.32, m, 20); can.rotation.x = Math.PI / 2; body.add(can); const lens = sph(0.085, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 0 }), 18, 10); lens.scale.z = 0.3; lens.position.z = 0.17; body.add(lens);
  body.rotation.x = Math.PI / 2;                 // apunta hacia abajo
  const sp = new THREE.SpotLight(0xfff1dc, 0, 6, 0.36, 0.25, 1.2); sp.position.set(SEAT.x + 0.1, HO.H1 - 0.2, SEAT.z - 0.1); sp.target.position.set(SEAT.x + 0.15, 0, SEAT.z); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0005; g.add(sp, sp.target);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95, HO.H1 - 0.25, 40, 1, true), new THREE.ShaderMaterial({ uniforms: { k: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float k; varying vec2 vU; varying vec3 vN, vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 1.6); float a = k * (0.16 + 0.1 * (1. - vU.y)) * (1. - f * 0.7); gl_FragColor = vec4(vec3(1., 0.95, 0.85) * a, 1.); }' }));
  cone.position.set(SEAT.x + 0.12, (HO.H1 - 0.25) / 2, SEAT.z - 0.05); g.add(cone);
  return { g, body, lens, sp, cone }; }
