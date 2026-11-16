// ---------------------------------------------------------------- la franja del Atlántico en corte (el acuario largo de la maqueta): el fondo del mar (arena en la costa,
// sedimento en lo hondo, la dorsal), las capas de roca en el corte, el agua (láminas de color por profundidad), la superficie con olas y brillo
// (vista desde abajo, un techo de luz), el cristal y su marco, el cable del mensaje (con su pulso de luz) y el otro cable, y la nieve marina.
// Marco de la franja (05_world.js): x de Brasil (0) a Portugal (SL), y desde el mapa (0) hasta el mar (SEA), z ∈ [−SW/2, SW/2].
const SLB = { U: [] };
function slbXs(step = 2) { const xs = []; for (let x = 0; x < 60; x += 0.5) xs.push(x); for (let x = 60; x < SL - 50; x += step) xs.push(x); for (let x = SL - 50; x < SL; x += 0.5) xs.push(x); xs.push(SL); return xs; }
// luz del sol en el agua (cáusticas): se suma a lo iluminado del fondo poco hondo
const SLB_CAUST = `float slbCaust(vec2 p, float t){ vec2 i = p; float c = 1.0; for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1)));
  i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x)); c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0); }`;
function slbSeabed() {
  const xs = slbXs(2), zs = []; for (let z = -SW / 2; z <= SW / 2 + 1e-6; z += 1) zs.push(z);
  const nx = xs.length, nz = zs.length, P = new Float32Array(nx * nz * 3), C = new Float32Array(nx * nz * 3), U = new Float32Array(nx * nz * 2), D = new Float32Array(nx * nz), I = [];
  const sand = new THREE.Color(0xd2c4a0), mud = new THREE.Color(0x857d70), deep = new THREE.Color(0x4c4f5a), rock = new THREE.Color(0x3e3936), c = new THREE.Color();
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = xs[i], z = zs[j], y = seabedY(x, z), k = i * nz + j, d = seaDepth(x);
    P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z; U[k * 2] = x / 3; U[k * 2 + 1] = z / 3; D[k] = d;
    const sl = Math.abs(seaDepth(x + 1) - seaDepth(Math.max(0, x - 1))) / 2, n = hash(Math.floor(x * 1.3) * 7.1 + j * 3.3) * 0.08;
    c.copy(sand).lerp(mud, _sm(4, 14, d)).lerp(deep, _sm(18, 30, d)).lerp(rock, clamp(sl * 1.6) * 0.8 + (x > SL * 0.45 && x < SL * 0.67 ? 0.35 * _sm(14, 24, 33 - d) : 0));
    c.offsetHSL(0, 0, n - 0.04); C[k * 3] = c.r; C[k * 3 + 1] = c.g; C[k * 3 + 2] = c.b;
    if (i && j) { const a = (i - 1) * nz + j - 1, b = i * nz + j - 1; I.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setAttribute('depth', new THREE.BufferAttribute(D, 1)); geo.setIndex(I); geo.computeVertexNormals();
  const grain = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const v = 90 + hash(i * 1.7) * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.3) * h, 1 + hash(i) * 1.5, 1 + hash(i * 2) * 1.5); }
    for (let r = 0; r < 40; r++) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, r / 40 * h + 5 * Math.sin(x / w * Math.PI * 6 + r)); g.stroke(); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.colorSpace = THREE.NoColorSpace;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, bumpMap: grain, bumpScale: 0.6 });
  const uT = { value: 0 }, uC = { value: 1 }; SLB.U.push(uT);
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uC = uC;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float depth; varying float vDep; varying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDep = depth; vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT, uC; varying float vDep; varying vec3 vWp;\n' + SLB_CAUST)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n{ float ck = uC * (1.0 - smoothstep(3.0, 12.0, vDep)) * smoothstep(0.2, 1.2, vDep); reflectedLight.directDiffuse += diffuseColor.rgb * min(slbCaust(vWp.xz * 1.6, uT * 0.5), 1.5) * ck * 0.8; }'); };
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; SLB.bedMat = m; SLB.caust = uC; return mesh;
}
// el agua vista desde fuera: láminas de color (más clara arriba, azul marino abajo) a varias profundidades del corte
function slbWaterSlices() {
  const g = new THREE.Group(), xs = slbXs(3);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { top: { value: new THREE.Color(0x1aa3c4) }, mid: { value: new THREE.Color(0x0b5d86) }, bot: { value: new THREE.Color(0x05203f) }, op: { value: 0.16 } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float dep; varying float vD; varying float vY; void main(){ vD = dep; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 top, mid, bot; uniform float op; varying float vD; varying float vY;
void main(){
#include <logdepthbuf_fragment>
  float k = clamp((${SEA.toFixed(1)} - vY) / 30.0, 0.0, 1.0); vec3 c = k < 0.35 ? mix(top, mid, k / 0.35) : mix(mid, bot, (k - 0.35) / 0.65);
  gl_FragColor = vec4(c, op * (0.75 + 0.5 * k)); }` });
  for (const z of [18.5, 13, 9, 1, -9, -15, -19]) {
    const P = [], A = [], I = []; xs.forEach((x, i) => { const yb = seabedY(x, z); P.push(x, yb, 0, x, SEA, 0); A.push(SEA - yb, 0); if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('dep', new THREE.Float32BufferAttribute(A, 1)); geo.setIndex(I);
    const m = new THREE.Mesh(geo, mat); m.position.z = z; m.renderOrder = 1; g.add(m);
  }
  SLB.sliceMat = mat; return g;
}
// la superficie del mar: azul con brillo (reflejos del cielo), clara y transparente donde hay poca agua, espuma en la orilla; vista desde abajo, un techo de luz
function slbSurface() {
  const xs = slbXs(2.5), zs = []; for (let z = -SW / 2; z <= SW / 2 + 1e-6; z += 2) zs.push(z);
  const nx = xs.length, nz = zs.length, P = [], D = [], UV = [], I = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { P.push(xs[i], SEA, zs[j]); D.push(seaDepth(xs[i])); UV.push(xs[i] / 9, zs[j] / 9); if (i && j) { const a = (i - 1) * nz + j - 1, b = i * nz + j - 1; I.push(a, a + 1, b, b, a + 1, b + 1); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('depth', new THREE.Float32BufferAttribute(D, 1)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const nrm = canvasTex(512, 512, (g, w, h) => {      // olitas (mapa de normales): suma de ondas que se repite
    const img = g.createImageData(w, h), d = img.data, W2 = [];
    for (let i = 0; i < 26; i++) { const f = 2 + Math.floor(Math.pow(hash(i * 3.7), 1.5) * 28), a = hash(i * 5.1) * Math.PI * 2; W2.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), 1.6 / f, hash(i * 9.3) * 6.28]); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let dx = 0, dy = 0; for (const [a, b, amp, ph] of W2) { const s = Math.cos((a * x / w + b * y / h) * Math.PI * 2 + ph) * amp; dx += s * a; dy += s * b; }
      const k = (y * w + x) * 4; d[k] = 128 + dx * 9; d[k + 1] = 128 + dy * 9; d[k + 2] = 255; d[k + 3] = 255; }
    g.putImageData(img, 0, 0); });
  nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.colorSpace = THREE.NoColorSpace;
  const m = new THREE.MeshPhysicalMaterial({ color: 0x0a4c6e, roughness: 0.22, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, normalMap: nrm, normalScale: new THREE.Vector2(0.55, 0.55),
    transparent: true, opacity: 0.9, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const uT = { value: 0 }; SLB.U.push(uT);
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float depth; varying float vDep; varying vec3 vWp2;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDep = depth; vWp2 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; varying float vDep; varying vec3 vWp2;')
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', 'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0; vec3 mapN2 = texture2D( normalMap, vNormalMapUv * 2.71 + vec2(0.37, 0.61) + vec2(-uT * 0.019, uT * 0.013) ).xyz * 2.0 - 1.0; vec3 mapN3 = texture2D( normalMap, vNormalMapUv * 0.31 + vec2(uT * 0.004, -uT * 0.003) ).xyz * 2.0 - 1.0; mapN = vec3(mapN.xy * 0.5 + mapN2.xy * 0.35 + mapN3.xy * 0.6, 1.0);'))
      .replace('#include <color_fragment>', `#include <color_fragment>
        float sh0 = 1.0 - smoothstep(0.2, 6.0, vDep);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.62, 0.66), sh0 * 0.85);
        diffuseColor.a *= mix(1.0, 0.45, sh0);
        float fo = (1.0 - smoothstep(0.0, 1.6, vDep)) * smoothstep(0.55, 0.95, sin(vDep * 9.0 + uT * 2.2) * 0.5 + 0.5 + 0.25 * sin(vWp2.x * 3.1 + vWp2.z * 2.3));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), fo * 0.85); diffuseColor.a = mix(diffuseColor.a, 1.0, fo);`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (!gl_FrontFacing) { float r = 0.5 + 0.5 * sin(vWp2.x * 1.7 + uT * 1.3) * sin(vWp2.z * 1.9 - uT * 1.1); vec3 c = mix(vec3(0.32, 0.72, 0.82), vec3(0.85, 0.98, 1.0), r * r);
          #ifdef USE_FOG
          float fd = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth); c = mix(c, fogColor, fd * 0.85);
          #endif
          gl_FragColor = vec4(c, 0.92); }`); };
  const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 3; SLB.surfMat = m; SLB.surfN = nrm; return mesh;
}
// el cristal (casi invisible; brilla en los bordes) y el marco oscuro de la maqueta
function slbGlass() {
  const g = new THREE.Group(), xs = slbXs(4);
  const gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, fog: false, uniforms: { tint: { value: new THREE.Color(0xbfe9ff) }, op: { value: 1 } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 tint; uniform float op; varying vec3 vN; varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.0); gl_FragColor = vec4(tint, (0.035 + 0.45 * f) * op); }` });
  for (const z of [SW / 2, -SW / 2]) {
    const P = [], I = []; xs.forEach((x, i) => { P.push(x, seabedY(x, z) - 0.3, z, x, SEA + 0.6, z); if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(z > 0 ? I : I.map((v, i) => I[i - (i % 3) + 2 - (i % 3)])); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, gm); m.renderOrder = 4; g.add(m);
  }
  // marco: un perfil oscuro arriba a cada lado (y abajo, donde el cristal toca la roca)
  const fm = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.35, metalness: 0.6 });
  for (const z of [SW / 2, -SW / 2]) { const top = new THREE.Mesh(new THREE.BoxGeometry(SL, 0.35, 0.35), fm); top.position.set(SL / 2, SEA + 0.6, z); top.castShadow = true; g.add(top);
    const pts = xs.map(x => v3(x, seabedY(x, z) - 0.3, z)); const bot = tube(pts, 0.14, fm, pts.length * 2, false, 6); g.add(bot); }
  SLB.glassMat = gm; return g;
}
// cables: tubo con grosor variable (fino en la costa, más grueso en lo hondo, para que se vea desde lejos) y luz: flujo de datos tenue + el pulso del mensaje
function slbCablePath(z, x0 = 0, x1 = SL) { const pts = []; for (const x of slbXs(2)) if (x >= x0 && x <= x1) pts.push(v3(x, seabedY(x, z) + Math.min(0.05, seaDepth(x) * 0.02), z)); return pts; }
function cableGeo(pts, rad, rs = 10) {
  const n = pts.length, P = [], N = [], UV = [], I = [], L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1])); const tot = L[n - 1];
  const t = new THREE.Vector3(), b = new THREE.Vector3(), nn = new THREE.Vector3(), up = v3(0, 1, 0);
  for (let i = 0; i < n; i++) { t.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize(); b.crossVectors(t, up).normalize(); nn.crossVectors(b, t); const r = rad(L[i] / tot, pts[i]);
    for (let j = 0; j <= rs; j++) { const a = j / rs * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a); const dx = nn.x * cs + b.x * sn, dy = nn.y * cs + b.y * sn, dz = nn.z * cs + b.z * sn;
      P.push(pts[i].x + dx * r, pts[i].y + dy * r + r * 0.6, pts[i].z + dz * r); N.push(dx, dy, dz); UV.push(L[i] / tot, j / rs); }
    if (i) for (let j = 0; j < rs; j++) { const a = (i - 1) * (rs + 1) + j, c = i * (rs + 1) + j; I.push(a, a + 1, c, a + 1, c + 1, c); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  g.userData = { L, tot }; return g;
}
function cableMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0x1a1f26, roughness: 0.45, metalness: 0.2, emissive: COL.light, emissiveIntensity: 1 });
  m.defines = { USE_UV: '' };
  const u = { uT: { value: 0 }, uPos: { value: -1 }, uLen: { value: o.len ?? 0.012 }, uFlow: { value: o.flow ?? 0.35 }, uBase: { value: o.base ?? 0.35 }, uTot: { value: o.tot ?? 500 }, uPk: { value: 1 }, uRed: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT, uPos, uLen, uFlow, uBase, uTot, uPk, uRed;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float d = vUv.x - uPos; float pk = exp(-d * d / (uLen * uLen)) * 6.0 + (d < 0.0 && d > -uLen * 9.0 ? exp(d / (uLen * 3.0)) * 1.2 : 0.0);
        float fl = pow(0.5 + 0.5 * sin((vUv.x * uTot / 6.0 - uT * 1.6) * 6.2832), 6.0) * uFlow;
        float stripe = smoothstep(0.3, 0.0, abs(vUv.y - 0.25)) + smoothstep(0.3, 0.0, abs(vUv.y - 0.75));
        totalEmissiveRadiance = mix(emissive, vec3(1.0, 0.25, 0.15), uRed) * (uBase * (0.5 + stripe) + fl * stripe + pk * uPk * (0.7 + 0.3 * stripe));`); };
  return m;
}
// pulso de luz con halo (para el resplandor): un sprite que sigue el cable
function slbGlowSprite(col = COL.light, s = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(col).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.scale.setScalar(s); sp.renderOrder = 6; return sp; }
function pathAt(pts, L, u, out = new THREE.Vector3()) { const tot = L[L.length - 1], d = clamp(u) * tot; let i = 1; while (i < L.length - 1 && L[i] < d) i++; const k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); return out.copy(pts[i - 1]).lerp(pts[i], clamp(k)); }
async function buildSlab() {
  const g = new THREE.Group(); inSlab(g); SLB.g = g;
  g.add(slbSeabed());
  // el corte: capas de roca bajo el fondo (delante y detrás)
  const xs = slbXs(2);
  for (const z of [SW / 2, -SW / 2]) g.add(strataFace(xs, x => seabedY(x, z) - SEA, z, { bot: -SEA, yOff: SEA, band: 0.5, bandCol: 0xb59a6a }));
  g.add(slbWaterSlices()); g.add(slbSurface()); g.add(slbGlass());
  // la base de la maqueta (zócalo negro) bajo todo
  const base = new THREE.Mesh(new THREE.BoxGeometry(SL + XB + XE + 6, 1.2, SW + 6), new THREE.MeshStandardMaterial({ color: 0x0d0f13, roughness: 0.4, metalness: 0.3 })); base.position.set((SL + XE - XB) / 2, 0.6, 0); base.receiveShadow = true; g.add(base);
  // el cable del mensaje (z = 6) y el otro (z = −5)
  const p1 = slbCablePath(CABLE_Z), g1 = cableGeo(p1, (u, p) => lerp(0.07, 0.32, _sm(6, 26, seaDepth(p.x)))), m1 = cableMat({ tot: g1.userData.tot });
  SLB.c1 = { pts: p1, L: g1.userData.L, mesh: new THREE.Mesh(g1, m1), m: m1 }; SLB.c1.mesh.castShadow = true; g.add(SLB.c1.mesh);
  const c2x0 = fnOf('incCable2') ? 44 : 0, p2 = slbCablePath(CABLE2_Z, c2x0), g2 = cableGeo(p2, (u, p) => lerp(0.055, 0.3, _sm(c2x0, c2x0 + 50, p.x) * _sm(6, 26, seaDepth(p.x)))), m2 = cableMat({ tot: g2.userData.tot, flow: 0.2, base: 0.22 });
  SLB.c2 = { pts: p2, L: g2.userData.L, mesh: new THREE.Mesh(g2, m2), m: m2 }; SLB.c2.mesh.castShadow = true; g.add(SLB.c2.mesh);
  SLB.pulse = slbGlowSprite(COL.light, 1.2); g.add(SLB.pulse);
  g.add(slbDecor());
  // nieve marina (deja estelas al moverse la cámara): mucha cerca de las costas, menos en medio
  const P = (x, y, z) => { const v = slabP(x, y, z); return [v.x, v.y, v.z]; };
  S.flow.push(flowCloud(5000, i => { const x = Math.pow(hash(i * 1.3), 1.6) * 70, z = -19 + hash(i * 2.7) * 38, yb = seabedY(x, z); return P(x, yb + hash(i * 3.9) * (SEA - yb), z); }, { size: 1.5, bright: 0.45, nearF: 0.3, farF: 0.02, drift: 0.15, seed: 7, col: 0xcff6ff }));
  S.flow.push(flowCloud(3000, i => { const x = SL - Math.pow(hash(i * 4.1), 1.6) * 60, z = -19 + hash(i * 5.3) * 38, yb = seabedY(x, z); return P(x, yb + hash(i * 6.7) * (SEA - yb), z); }, { size: 1.5, bright: 0.45, nearF: 0.3, farF: 0.02, drift: 0.15, seed: 8, col: 0xcff6ff }));
  S.flow.push(flowCloud(4000, i => { const x = 40 + hash(i * 7.7) * (SL - 80), z = -19 + hash(i * 8.9) * 38, yb = seabedY(x, z); return P(x, yb + hash(i * 9.1) * (SEA - yb), z); }, { size: 1.7, bright: 0.4, nearF: 1, farF: 0.008, drift: 0.4, seed: 9, col: 0xcff6ff }));
  envAll(g);
  return g;
}
// cada fotograma: tiempo del agua, olas, pulsos y si la cámara está bajo el agua (entonces: niebla azul, sin láminas ni cristal)
function slabAt(t, o = {}) {
  for (const u of SLB.U) u.value = t;
  SLB.surfN.offset.set(t * 0.012, t * 0.007);
  for (const c of [SLB.c1, SLB.c2]) c.m.userData.u.uT.value = t;
  const pu = o.pulse ?? -1, U1 = SLB.c1.m.userData.u; U1.uPos.value = pu; U1.uPk.value = o.pulseK ?? 1; U1.uFlow.value = o.flow ?? 0.35;
  SLB.pulse.visible = pu >= 0 && pu <= 1 && (o.pulseK ?? 1) > 0.01; if (SLB.pulse.visible) { pathAt(SLB.c1.pts, SLB.c1.L, pu, SLB.pulse.position); SLB.pulse.position.y += 0.25; SLB.pulse.updateMatrixWorld(); const dc = wpos(SLB.pulse).distanceTo(cam.position); SLB.pulse.scale.setScalar(clamp(dc * 0.045, 0.25, 9) * (o.pulseS ?? 1)); }
  const under = !!o.under; SLB.sliceMat.uniforms.op.value = under ? 0 : 0.16; SLB.glassMat.uniforms.op.value = under ? 0 : 1; slbDecorAt(t, under);
}
// ¿está un punto (en el mundo) dentro del agua de la franja? (para saber si la cámara va buceando)
function slabUnder(pw) { const p = pw.clone().applyMatrix4(new THREE.Matrix4().copy(SLAB_M).invert()); return p.x > 0 && p.x < SL && Math.abs(p.z) < SW / 2 && p.y < SEA && p.y > seabedY(p.x, p.z) - 1; }
function slabLocal(pw) { return pw.clone().applyMatrix4(new THREE.Matrix4().copy(SLAB_M).invert()); }
// ---------- vida en el fondo cerca de las costas: rocas, praderas de algas que se mecen, haces de luz bajo la superficie y bancos de peces
function slbDecor() {
  const g = new THREE.Group(), zones = [[3, 46], [SL - 46, SL - 3]], okZ = z => Math.abs(z - CABLE_Z) > 1.3 && Math.abs(z - CABLE2_Z) > 1.3;
  // rocas
  const rg = new THREE.IcosahedronGeometry(1, 3); { const p = rg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(x * 3.1 + 1) * Math.sin(y * 2.3 + 2) + 0.12 * Math.sin(z * 4.7 + x * 1.3); p.setXYZ(i, x * k, y * k * 0.65, z * k); } rg.computeVertexNormals(); }
  const rocks = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), 700); let n = 0;
  for (let i = 0; i < 2600 && n < 700; i++) { const zn = zones[i % 2], x = zn[0] + hash(i * 3.3) * (zn[1] - zn[0]), z = -18.5 + hash(i * 5.9) * 37; if (!okZ(z) || seaDepth(x) < 1.2 || (z > 2 && z < 15)) continue;
    const s = 0.12 + Math.pow(hash(i * 7.1), 3) * 0.9; _o.position.set(x, seabedY(x, z) + s * 0.15, z); _o.rotation.set(hash(i) * 3, hash(i * 2) * 6.3, hash(i * 4) * 3); _o.scale.set(s, s * (0.6 + hash(i * 8) * 0.6), s); _o.updateMatrix(); rocks.setMatrixAt(n, _o.matrix);
    _c.setHSL(0.07 + hash(i * 9) * 0.12, 0.14 + hash(i * 11) * 0.2, 0.42 + hash(i * 13) * 0.2); rocks.setColorAt(n, _c); n++; }
  rocks.count = n; rocks.castShadow = true; rocks.receiveShadow = true; g.add(rocks);
  // algas: hojas finas en manojos (se mecen con la corriente)
  const bl = new THREE.PlaneGeometry(0.09, 1, 1, 6); bl.translate(0, 0.5, 0); { const p = bl.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.8)); } }
  const sw = new THREE.MeshStandardMaterial({ color: 0x3f8f4e, roughness: 0.7, side: THREE.DoubleSide }); const uT = { value: 0 }; SLB.U.push(uT);
  sw.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>',
    '#include <begin_vertex>\nfloat ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.9; transformed.x += sin(uT * 1.6 + ph + position.y * 2.0) * position.y * position.y * 0.35; transformed.z += cos(uT * 1.3 + ph) * position.y * position.y * 0.2;'); };
  const weed = new THREE.InstancedMesh(bl, sw, 2600); n = 0;
  for (let c = 0; c < 140 && n < 2600; c++) { const zn = zones[c % 2], x0 = zn[0] + hash(c * 4.4) * (zn[1] - zn[0]), z0 = -18 + hash(c * 6.6) * 36, d0 = seaDepth(x0); if (d0 < 1.5 || d0 > 14 || !okZ(z0)) continue;
    for (let j = 0; j < 18 && n < 2600; j++) { const x = x0 + (hash(c * 31 + j) - 0.5) * 1.6, z = z0 + (hash(c * 37 + j * 3) - 0.5) * 1.6; if (!okZ(z)) continue; const h = 0.5 + hash(c * 41 + j) * 1.6;
      _o.position.set(x, seabedY(x, z) - 0.05, z); _o.rotation.set((hash(j * 3 + c) - 0.5) * 0.4, hash(j * 7 + c) * 6.3, (hash(j * 5 + c) - 0.5) * 0.4); _o.scale.set(1, h, 1); _o.updateMatrix(); weed.setMatrixAt(n, _o.matrix);
      _c.setHSL(0.27 + hash(c * 3 + j) * 0.1, 0.45, 0.25 + hash(c + j * 9) * 0.15); weed.setColorAt(n, _c); n++; } }
  weed.count = n; g.add(weed);
  // haces de luz bajo la superficie (solo se notan bajo el agua)
  const rayT = canvasTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const g2 = c.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h); });
  SLB.rayMat = new THREE.MeshBasicMaterial({ map: rayT, color: 0x9fe6ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 46; i++) { const zn = zones[i % 2], x = zn[0] + hash(i * 2.3) * (zn[1] - zn[0] - 10), z = -17 + hash(i * 4.7) * 34, d = Math.min(seaDepth(x), 12); if (d < 2) continue;
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + hash(i) * 1.6, d * 1.3), SLB.rayMat); r.position.set(x + d * 0.25, SEA - d * 0.62, z); r.rotation.set(0, hash(i * 6.1) * 3.14, 0.32); r.renderOrder = 5; g.add(r); }
  // bancos de peces (pequeños, de colores, nadan en círculo)
  const fg = new THREE.ConeGeometry(0.07, 0.3, 6); fg.rotateZ(-Math.PI / 2); const tail = new THREE.ConeGeometry(0.06, 0.1, 4); tail.rotateZ(Math.PI / 2); tail.translate(-0.19, 0, 0);
  const fish = new THREE.InstancedMesh(mergeGeometries([fg, tail]), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.2 }), 180); fish.frustumCulled = false; g.add(fish);
  SLB.fish = { mesh: fish, schools: [[14, 4.5, 12, 3.0], [27, 6.0, -12, 3.5], [SL - 14, 4.0, 11, 2.6], [SL - 26, 6.5, -2, 3.2]] };
  for (let i = 0; i < 180; i++) { _c.setHSL([0.12, 0.55, 0.08, 0.6][i % 4] + hash(i) * 0.04, 0.8, 0.55); fish.setColorAt(i, _c); }
  return g;
}
function slbDecorAt(t, under) {
  SLB.rayMat.opacity = under ? 0.16 : 0.03;
  const F = SLB.fish; if (!F) return; const per = 45;
  for (let i = 0; i < 180; i++) { const s = F.schools[Math.floor(i / per)], j = i % per, a = t * 0.35 * (j % 2 ? 1 : 0.92) + j * 0.31 + hash(i) * 0.4, r = s[3] * (0.6 + 0.4 * hash(i * 3)), y = SEA - s[1] + Math.sin(a * 2 + j) * 0.4 + (hash(i * 5) - 0.5) * 0.8;
    _o.position.set(s[0] + Math.cos(a) * r, y, s[2] + Math.sin(a) * r * 0.6); _o.rotation.set(0, -a - Math.PI / 2 + Math.sin(t * 6 + j) * 0.15, 0); _o.scale.setScalar(0.8 + hash(i * 7) * 0.5); _o.updateMatrix(); F.mesh.setMatrixAt(i, _o.matrix); }
  F.mesh.instanceMatrix.needsUpdate = true;
}
