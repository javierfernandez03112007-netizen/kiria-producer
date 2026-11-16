// ---------------------------------------------------------------- la taza de cerámica esmaltada (verde azulado por fuera, blanca por dentro) con el agua, el estallido
// del agua sobrecalentada a cámara lenta (gotas que se estiran con la velocidad, la columna del centro y el vapor), el café soluble que cae, el palito de madera
// (textura real de roble, CC0) con las burbujas que nacen en sus vetas, y la vista en corte. Unidades: cm; origen de la taza abajo en el centro.
const MUG = { R: 4.15, H: 9.6, WY: 7.9, rIn: y => 3.62 + 0.27 * clamp((y - 0.7) / 8.6) };
const WATER_REFL = { name: 'aguaEspejo', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tint: { value: new THREE.Color(0.8, 0.9, 0.93) }, k: { value: 1 }, base: { value: 0.42 } },
  vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;\n#include <common>\n#include <logdepthbuf_pars_vertex>\nvoid main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
  fragmentShader: 'uniform vec3 color, tint; uniform sampler2D tDiffuse; uniform float k, base; varying vec4 vUv; varying vec3 vW;\n#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\n' +
    'vec3 V = normalize(cameraPosition - vW); float F = 0.02 + 0.98 * pow(1.0 - max(V.y, 0.0), 5.0); vec4 uv = vUv; uv.xy += vec2(sin(vW.x * 6.0 + vW.z * 2.0), sin(vW.z * 5.0 - vW.x * 3.0)) * 0.0025 * uv.w;' +
    'vec3 r = texture2DProj(tDiffuse, uv).rgb; float a = clamp(base + F, 0.0, 1.0) * k; gl_FragColor = vec4(r * tint, a); }' };
function mugProfile() {
  const O = [[0.01, 0], [3.55, 0], [3.82, 0.12], [3.95, 0.45], [4.05, 2], [4.15, 6], [4.24, 9.25], [4.3, 9.5], [4.26, 9.66], [4.14, 9.7], [4.0, 9.6]];
  const I = [[MUG.rIn(9.3), 9.3], [MUG.rIn(6), 6], [MUG.rIn(2), 2], [3.5, 0.95], [3.1, 0.7], [0.01, 0.62]];
  return { pts: [...O, ...I].map(([r, y]) => new THREE.Vector2(r, y)), nOut: O.length };
}
function buildMug(o = {}) {
  const G = new THREE.Group(), U = {};
  const { pts, nOut } = mugProfile(), seg = 96;
  const g = new THREE.LatheGeometry(pts, seg);      // (sin recalcular normales: así no sale la costura)
  // color por vértice: esmalte de fuera (verde azulado oscuro) y de dentro (blanco)
  const col = new Float32Array(g.attributes.position.count * 3), cOut = new THREE.Color(o.color ?? 0x2b5a68), cIn = new THREE.Color(0xf3f1ec), cc = new THREE.Color();
  for (let i = 0; i <= seg; i++) for (let j = 0; j < pts.length; j++) { const k = i * pts.length + j; cc.copy(j < nOut - 1 ? cOut : cIn); if (j === nOut - 1 || j === nOut - 2) cc.copy(cOut).lerp(cIn, 0.35); col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const speck = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${hash(i) > 0.5 ? '0,0,0' : '255,255,255'},${0.05 + hash(i * 3.3) * 0.08})`; c.beginPath(); c.arc(hash(i * 1.9) * w, hash(i * 7.1) * h, 0.6 + hash(i * 2.2) * 1.4, 0, 7); c.fill(); } });
  speck.wrapS = speck.wrapT = THREE.RepeatWrapping; speck.repeat.set(6, 3); speck.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, roughnessMap: speck, bumpMap: speck, bumpScale: 0.02, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
  const body = new THREE.Mesh(g, mat); body.castShadow = true; body.receiveShadow = true; G.add(body); U.mat = mat; U.body = body;
  // el asa: curva en C con sección ovalada
  { const cv = new THREE.CatmullRomCurve3([v3(3.9, 7.6, 0), v3(5.6, 7.7, 0), v3(6.8, 6.4, 0), v3(6.7, 4.0, 0), v3(5.5, 2.6, 0), v3(4.0, 2.4, 0)]);
    const hg = new THREE.TubeGeometry(cv, 64, 0.58, 18, false); const P = hg.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) * 0.62); hg.computeVertexNormals();
    const hm = new THREE.MeshPhysicalMaterial({ color: o.color ?? 0x2b5a68, roughness: 0.32, roughnessMap: speck, bumpMap: speck, bumpScale: 0.02, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
    const h = new THREE.Mesh(hg, hm); h.castShadow = true; G.add(h); U.handle = h; U.hmat = hm; }
  // el agua: superficie (rejilla polar que se deforma: menisco, hervor, el bulto del estallido) en dos capas: un velo de color y el reflejo (aditivo)
  { const NR = 40, NA = 96, rW = MUG.rIn(MUG.WY) - 0.02, pos = [], idx = [];
    // sin vértices repetidos (centro único y la vuelta cerrada) para que las normales no hagan costura
    pos.push(0, 0, 0); for (let i = 1; i <= NR; i++) for (let j = 0; j < NA; j++) { const r = rW * Math.pow(i / NR, 0.85), a = j / NA * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
    const vi = (i, j) => i === 0 ? 0 : 1 + (i - 1) * NA + (j % NA);
    for (let j = 0; j < NA; j++) idx.push(0, vi(1, j + 1), vi(1, j));
    for (let i = 1; i < NR; i++) for (let j = 0; j < NA; j++) { const a = vi(i, j), b = vi(i + 1, j), c = vi(i, j + 1), d = vi(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
    U.surfBase = Float32Array.from(pos); U.NR = NR; U.NA = NA; U.rW = rW;
    const tint = new THREE.MeshPhysicalMaterial({ color: 0x8fb2b8, roughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false });
    const refl = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.015, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01, ior: 1.33, envMapIntensity: 2.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const s1 = new THREE.Mesh(sg, tint), s2 = new THREE.Mesh(sg, refl); for (const s of [s1, s2]) { s.position.y = MUG.WY; s.renderOrder = 7; G.add(s); }
    U.surf = sg; U.surfMeshes = [s1, s2];
    // agua quieta: espejo de verdad (Reflector) con Fresnel: refleja el techo del horno (oscurece un poco el agua) y la lámpara (destello);
    // así se ve que hay agua en una taza blanca. Solo cuando la superficie está lisa (en el hervor se usa la malla que se deforma).
    const wr = new Reflector(new THREE.CircleGeometry(rW - 0.02, 96), { textureWidth: 1024, textureHeight: 1024, clipBias: 0.002, multisample: 0, shader: WATER_REFL });
    wr.rotation.x = -Math.PI / 2; wr.position.y = MUG.WY + 0.01; wr.renderOrder = 7; wr.material.transparent = true; wr.material.depthWrite = false; G.add(wr); U.mirror = wr;
    // el cuerpo del agua (solo se ve en corte)
    const wb = new THREE.Mesh(new THREE.CylinderGeometry(rW - 0.01, MUG.rIn(0.8) - 0.02, MUG.WY - 0.65, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x6f9aa6, roughness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    wb.position.y = (MUG.WY + 0.65) / 2; wb.renderOrder = 6; wb.visible = false; G.add(wb); U.waterBody = wb;
    // la cara del corte del agua (trapecio en z = 0)
    const fs = new THREE.Shape(); fs.moveTo(-MUG.rIn(0.7) + 0.02, 0.66); fs.lineTo(MUG.rIn(0.7) - 0.02, 0.66); fs.lineTo(rW, MUG.WY); fs.lineTo(-rW, MUG.WY); fs.closePath();
    const cf = new THREE.Mesh(new THREE.ShapeGeometry(fs), wb.material); cf.renderOrder = 6; cf.visible = false; G.add(cf); U.cutFace = cf; }
  G.userData = U; return G;
}
// la superficie del agua: menisco en el borde + rizos de hervor (amp) + el bulto del centro (bulge, en cm) y el anillo que se abre (crown)
function mugSurface(M, t, o = {}) {
  const U = M.userData, P = U.surf.attributes.position, B = U.surfBase, amp = o.amp ?? 0, bulge = o.bulge ?? 0, crown = o.crown ?? 0, rise = o.rise ?? 0;
  for (let k = 0; k < P.count; k++) { const x = B[k * 3], z = B[k * 3 + 2], r = Math.hypot(x, z), u = r / U.rW;
    let y = 0.09 * Math.pow(u, 14) + rise;                                     // menisco (y el nivel que sube al hervir)
    y += amp * (0.12 * Math.sin(x * 5.1 + t * 13) * Math.sin(z * 4.3 - t * 11) + 0.06 * Math.sin(r * 9 - t * 20));
    y += bulge * Math.exp(-r * r / 2.2) + crown * 0.6 * Math.exp(-Math.pow((r - 1.6 - crown * 1.5) / 0.55, 2));
    P.setY(k, y); }
  P.needsUpdate = true; U.surf.computeVertexNormals();
}
// corte de la taza (plano x = 0: se quita la mitad de delante) para ver el agua por dentro
function mugCut(M, on) {
  const U = M.userData; if (!U.cutP) U.cutP = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  M.updateWorldMatrix(true, false); U.cutP[0].constant = new THREE.Vector3().setFromMatrixPosition(M.matrixWorld).z;     // plano z = z de la taza (mundo)
  if (U.cutFace) U.cutFace.visible = !!on;
  const cp = on ? U.cutP : null; for (const m of [U.mat, U.hmat]) { m.clippingPlanes = cp; m.side = on ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; }
  for (const s of U.surfMeshes) { s.material.clippingPlanes = cp; s.material.needsUpdate = true; }
  U.waterBody.visible = !!on; U.waterBody.material.clippingPlanes = cp;
}
// material de gota de agua (instanciado): uL = dirección hacia la lámpara (en el mundo), se pasa a la vista en cada fotograma
function dropMat() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: true, uniforms: { uL: { value: new THREE.Vector3(0.7, 0.5, -0.5) }, uL2: { value: new THREE.Vector3(-0.3, 0.6, 0.75) }, bright: { value: 1 } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN; varying vec3 vV; void main(){ vec4 p = vec4(position,1.); vec3 nn = normal;\n#ifdef USE_INSTANCING\np = instanceMatrix * p; nn = mat3(instanceMatrix) * nn;\n#endif\nvec4 mv = modelViewMatrix * p; vN = normalize(normalMatrix * nn); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform vec3 uL, uL2; uniform float bright; varying vec3 vN; varying vec3 vV; void main(){\n#include <logdepthbuf_fragment>\n' +
      'vec3 N = normalize(vN), V = normalize(vV); float ndv = abs(dot(N, V)), rim = pow(1.0 - ndv, 1.6);' +
      'vec3 c = mix(vec3(1.0, 0.97, 0.92) * 0.85 * bright, vec3(0.05, 0.055, 0.06), smoothstep(0.15, 0.85, rim)); float a = mix(0.16, 0.8, smoothstep(0.1, 0.9, rim));' +
      'float s1 = pow(max(dot(N, normalize(uL + V)), 0.0), 160.0), s2 = pow(max(dot(N, normalize(uL2 + V)), 0.0), 90.0) * 0.35;' +
      'float glint = pow(max(dot(-N, normalize(uL - V)), 0.0), 6.0) * 0.6;' +   // la luz que atraviesa la gota por detrás (destello del lado contrario)
      'c += vec3(1.0, 0.92, 0.78) * (s1 * 5.0 + glint * 1.4) * bright + vec3(0.85, 0.9, 1.0) * s2 * 2.0; a = clamp(a + s1 + s2 + glint * 0.5, 0.0, 1.0);' +
      'gl_FragColor = vec4(c, a); }' });
}
// ---------- el estallido (hervor de golpe del agua sobrecalentada), a cámara lenta. τ = tiempo REAL desde que empieza, en segundos.
// Lo que se ve en los vídeos de verdad: el agua sube de nivel, la superficie se llena de burbujas de vapor que revientan y lanzan rocío fino, del centro sale un
// chorro de gotas alargadas (hacia la cámara si o.dir) y sale vapor. Las gotas se pegan al cristal de la puerta cerrada o caen a la encimera si está abierta.
const SPL = { NB: 64 };
const boilLevel = tau => tau <= 0 ? 0 : 1.3 * clamp(tau / 0.012) * (1 - 0.6 * clamp((tau - 0.06) / 0.08));
function buildSplash(n = 2600, seed = 1) {
  const G = new THREE.Group(), geo = new THREE.SphereGeometry(1, 14, 10);
  // gota = lente pequeña (como en la fotografía de alta velocidad): centro claro (concentra la luz), borde oscuro y el destello de la lámpara del horno
  const m = dropMat();
  const im = new THREE.InstancedMesh(geo, m, n); im.frustumCulled = false; im.renderOrder = 9; G.add(im);
  // burbujas que asoman y revientan en la superficie
  const NB = SPL.NB, BD = new Float32Array(NB * 5);                                     // x, z, rMax, nace, revienta
  for (let j = 0; j < NB; j++) { const h = k => hash(j * 5.13 + k * 2.37 + seed * 3.3), r = 3.2 * Math.sqrt(h(1)), a = h(2) * 6.283, tb = 0.055 * Math.pow(h(4), 1.5);
    BD.set([Math.cos(a) * r, Math.sin(a) * r, 0.22 + 0.55 * Math.pow(h(3), 1.6), tb, tb + 0.004 + 0.011 * h(5)], j * 5); }
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 18), bubbleMat(0.45), NB); bub.frustumCulled = false; bub.renderOrder = 8; G.add(bub);
  // gotas: el chorro del centro (gordas y alargadas) y el rocío de cada burbuja que revienta
  const D = new Float32Array(n * 8);                                                     // x0, z0, vx, vy, vz, tamaño, τ0, tipo
  for (let i = 0; i < n; i++) { const h = k => hash(i * 7.31 + k * 1.913 + seed * 13.7), core = i < n * 0.14;
    if (core) { const r = 1.0 * Math.sqrt(h(1)), a = h(2) * 6.283, out = 4 + 22 * h(4);
      D.set([Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * out, 110 + 170 * h(3), Math.sin(a) * out, 0.035 + 0.06 * Math.pow(h(5), 1.3), 0.008 + 0.03 * h(6), 1], i * 8); }
    else { const j = Math.floor(h(7) * NB), bx = BD[j * 5], bz = BD[j * 5 + 1], br = BD[j * 5 + 2], a = h(2) * 6.283, out = 8 + 45 * h(4);
      D.set([bx + Math.cos(a) * br * 0.6, bz + Math.sin(a) * br * 0.6, Math.cos(a) * out, (35 + 150 * h(3)) * (0.6 + br), Math.sin(a) * out, 0.01 + 0.04 * Math.pow(h(5), 2.2), BD[j * 5 + 4] + 0.002 * h(6), 0], i * 8); } }
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix); for (let j = 0; j < NB; j++) bub.setMatrixAt(j, _o.matrix);
  // vapor: nubecillas (textura de ruido) que suben, crecen y se deshacen; a contraluz de la lámpara del horno brillan
  const st = canvasTex(256, 256, (c, w, h) => { const img = c.createImageData(w, h), d = img.data;
    const n2 = (x, y, f) => { let v = 0, a = 1, s = 0; for (let o = 0; o < 5; o++) { v += a * (Math.sin(x * f * 1.7 + hash(o * 3.1) * 9) * Math.sin(y * f * 1.3 + hash(o * 7.7) * 9) * 0.5 + 0.5); s += a; a *= 0.55; f *= 2.1; } return v / s; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w - 0.5, v = y / h - 0.5, r = Math.hypot(u, v) * 2, fall = Math.max(0, 1 - r * r) ** 1.6;
      const a = fall * Math.pow(n2(u * 6, v * 6, 1.2), 2.2) * 1.6, i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, a * 255); }
    c.putImageData(img, 0, 0); });
  const steam = []; for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, color: 0xfff4e6, transparent: true, depthWrite: false, opacity: 0, rotation: hash(i * 9.1) * 6.28 })); s.renderOrder = 10; G.add(s); steam.push(s); }
  G.userData = { im, D, n, steam, seed, bub, BD, NB }; return G;
}
const _sv = new THREE.Vector3(), _sq = new THREE.Quaternion(), _sY = new THREE.Vector3(0, 1, 0);
// o.dir: hacia dónde se inclina el chorro; o.floor: altura (local) del suelo del horno; o.wallZ: con la puerta cerrada, las gotas se quedan pegadas al cristal (z local)
// y resbalan; o.frontZ + o.floorOut: con la puerta abierta, más allá de frontZ caen a la encimera
function splashAt(SP, tau, o = {}) {
  const U = SP.userData, D = U.D, g = 981, dir = o.dir || null, floor = o.floor ?? -0.2, wallZ = o.wallZ ?? null, frontZ = o.frontZ ?? 1e9, floorOut = o.floorOut ?? floor, lv = boilLevel(tau);
  { const mu = U.im.material.uniforms; cam.updateMatrixWorld(); const vm = new THREE.Matrix3().setFromMatrix4(cam.matrixWorldInverse);
    mu.uL.value.copy(o.light || v3(0.72, 0.52, -0.46)).applyMatrix3(vm).normalize(); mu.uL2.value.copy(v3(-0.3, 0.6, 0.75)).applyMatrix3(vm).normalize(); mu.bright.value = o.bright ?? 1; }
  for (let i = 0; i < U.n; i++) { const b = i * 8, t = tau - D[b + 6];
    if (tau <= 0 || t <= 0) { _o.position.set(0, -1000, 0); _o.scale.setScalar(0.0001); _o.updateMatrix(); U.im.setMatrixAt(i, _o.matrix); continue; }
    let vx = D[b + 2], vy = D[b + 3], vz = D[b + 4]; if (dir) { const k = D[b + 7] ? 0.5 : 0.3; vx += dir.x * vy * k; vz += dir.z * vy * k; }
    let x = D[b] + vx * t, y = MUG.WY + lv + vy * t - 0.5 * g * t * t, z = D[b + 1] + vz * t, vyy = vy - g * t, s = D[b + 5] * clamp(t / 0.002), flat = 0;
    if (wallZ !== null && z > wallZ && vz > 0) {                                                        // choca con el cristal de la puerta y resbala
      const th = (wallZ - D[b + 1]) / vz, yh = MUG.WY + lv + vy * th - 0.5 * g * th * th; x = D[b] + vx * th; z = wallZ; y = Math.max(floor, yh - 5 * (t - th)); vx = 0; vyy = -5; vz = 0; flat = 1; }
    const inside = Math.hypot(x, z) < MUG.rIn(MUG.WY) - 0.1, fl = z > frontZ ? floorOut : floor;
    if (inside && y < MUG.WY + lv && vyy < 0) s *= clamp((y - MUG.WY - lv + 0.6) / 0.6);              // las que vuelven a caer dentro se hunden
    if (!inside && y < fl) { const tl = (y - fl) / Math.max(1, -vyy); y = fl; s *= clamp(1 + tl * 10); flat = 2; }   // las que caen fuera se aplastan y se van
    if (flat === 1) { _o.position.set(x, y, z - s * 0.3); _o.quaternion.identity(); _o.scale.set(s * 1.5, s * 1.9, Math.max(0.0001, s * 0.35)); }
    else if (flat === 2) { _o.position.set(x, y + s * 0.15, z); _o.quaternion.identity(); _o.scale.set(Math.max(0.0001, s * 1.7), Math.max(0.0001, s * 0.3), Math.max(0.0001, s * 1.7)); }
    else { const sp = Math.hypot(vx, vyy, vz), stretch = 1 + Math.min(D[b + 7] ? 3.2 : 2.2, sp * 0.009 * (o.blur ?? 1));
      _o.position.set(x, y, z); _sv.set(vx, vyy, vz).normalize(); _o.quaternion.setFromUnitVectors(_sY, _sv);
      _o.scale.set(Math.max(0.0001, s), Math.max(0.0001, s * stretch), Math.max(0.0001, s)); }
    _o.updateMatrix(); U.im.setMatrixAt(i, _o.matrix); }
  U.im.instanceMatrix.needsUpdate = true;
  // las burbujas de la superficie: asoman (casquete), crecen y revientan
  for (let j = 0; j < U.NB; j++) { const b = j * 5, u = (tau - U.BD[b + 3]) / (U.BD[b + 4] - U.BD[b + 3]);
    if (tau <= 0 || u <= 0 || u >= 1) { _o.position.set(0, -1000, 0); _o.scale.setScalar(0.0001); }
    else { const r = U.BD[b + 2] * Math.pow(sm5(clamp(u * 1.25)), 0.6); _o.position.set(U.BD[b], MUG.WY + lv - r * 0.45, U.BD[b + 1]); _o.quaternion.identity(); _o.scale.set(r, r * 0.9, r); }
    _o.updateMatrix(); U.bub.setMatrixAt(j, _o.matrix); }
  U.bub.instanceMatrix.needsUpdate = true;
  U.steam.forEach((s, i) => { const t = tau - 0.012 - (i % 14) * 0.006, k = clamp(t / 0.16); s.visible = t > 0 && (o.steam ?? 1) > 0;
    if (!s.visible) return; const a = hash(i * 3.7) * 6.283, r = 0.6 + 2.6 * hash(i * 5.1) + 9 * k * hash(i * 1.3), d = o.dir ? 6 * k : 0;
    s.position.set(Math.cos(a) * r + (o.dir ? o.dir.x * d : 0), MUG.WY + lv + 1 + 16 * Math.pow(k, 0.7) * (0.4 + hash(i * 2.9)), Math.sin(a) * r + (o.dir ? o.dir.z * d : 0));
    s.scale.setScalar(2.2 + 9 * Math.pow(k, 0.6) * (0.6 + 0.8 * hash(i * 4.4))); s.material.rotation = hash(i * 9.1) * 6.28 + k * (hash(i) - 0.5) * 2;
    s.material.opacity = 0.34 * Math.sin(Math.PI * clamp(k * 1.05)) * (o.steam ?? 1); });
}
// ---------- el bulto del principio (el agua se abomba antes de reventar), continuo: metaballs → superficie con marching cubes. Va en el grupo del estallido.
const ERU = { HE: 6, Y0: -3.2, res: 72 };                 // cubo de 12 cm: de WY-3,2 a WY+8,8; celda ≈ 0,17 cm
function buildErupt(seed = 3) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 1, thickness: 1.5, ior: 1.33, specularIntensity: 1, envMapIntensity: 1.6, attenuationColor: new THREE.Color(0xd8f0f2), attenuationDistance: 10 });
  const mc = new THREE.Group(), m = new MarchingCubes(ERU.res, mat, false, false, 60000); m.isolation = 80; m.frustumCulled = false; m.renderOrder = 8;
  m.scale.setScalar(ERU.HE); m.position.set(0, MUG.WY + ERU.Y0 + ERU.HE, 0); mc.add(m);
  const B = [[0, 0, 1.45, 1]];                                                            // x, z, radio, peso: el bulto del centro y los grumos de su superficie
  for (let i = 0; i < 16; i++) { const h = k => hash(i * 4.77 + k * 1.31 + seed * 9.1), a = h(1) * 6.283, r = 0.4 + 1.6 * h(2); B.push([Math.cos(a) * r, Math.sin(a) * r, 0.35 + 0.4 * h(3), 0.6 + 0.4 * h(4)]); }
  mc.userData = { m, B }; return mc;
}
function eruptAt(EP, tau, o = {}) {
  const { m, B } = EP.userData, HE = ERU.HE, cy = MUG.WY + ERU.Y0 + HE, sub = 12, iso = m.isolation, lv = boilLevel(tau);
  const up = clamp(tau / 0.011), burst = clamp((tau - 0.011) / 0.008), k = Math.pow(sm5(up), 0.8) * (1 - sm5(burst));
  EP.visible = k > 0.02; if (!EP.visible) return; m.reset();
  for (const [x, z, r0, w] of B) { const r = r0 * k * (w < 1 ? (0.6 + 0.6 * up) : 1), y = MUG.WY + lv - (w < 1 ? 0.3 : 1.1) + (w < 1 ? 1.2 : 1.7) * k;
    if (r < 0.1) continue; const nx = x / (2 * HE) + 0.5, ny = (y - cy) / (2 * HE) + 0.5, nz = z / (2 * HE) + 0.5, d = r / (2 * HE); m.addBall(nx, ny, nz, d * d * (iso + sub), sub); }
  m.update();
}
// ---------- el café soluble: gránulos que caen (a cámara lenta) y tocan el agua en τHit
function buildCoffee(n = 140) {
  const geo = new THREE.IcosahedronGeometry(1, 1); { const P = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); v.multiplyScalar(0.7 + 0.45 * hash(Math.round(v.x * 50) * 3.1 + Math.round(v.y * 50) * 7.7 + Math.round(v.z * 50) * 1.3)); P.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); }
  const m = new THREE.MeshPhysicalMaterial({ color: 0x24140b, roughness: 0.62, clearcoat: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0x6b4a30) });
  const im = new THREE.InstancedMesh(geo, m, n); im.castShadow = true; im.frustumCulled = false;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix);
  im.userData = { n }; return im;
}
// u: 0 arriba … 1 tocan el agua (cada gránulo con su retraso)
function coffeeAt(CF, u) {
  const n = CF.userData.n;
  for (let i = 0; i < n; i++) { const h = k => hash(i * 3.17 + k * 9.1), uu = clamp((u - h(1) * 0.25) / 0.75), a = h(2) * 6.283, r = 1.6 * Math.sqrt(h(3));
    const y = MUG.WY + 16 * (1 - uu) * (1 - uu) + 0.3, s = 0.08 + 0.12 * h(4);
    _o.position.set(Math.cos(a) * r, uu >= 1 ? -1000 : y, Math.sin(a) * r); _o.rotation.set(h(5) * 6 + u * 4, h(6) * 6, h(7) * 6); _o.scale.set(s, s * (0.6 + h(8) * 0.6), s * 0.8); _o.updateMatrix(); CF.setMatrixAt(i, _o.matrix); }
  CF.instanceMatrix.needsUpdate = true;
}
// ---------- el palito de madera (textura real de roble) y las burbujas que nacen en sus vetas y suben despacio
function buildStick() {
  const s = new THREE.Shape(), w = 0.32, L = 14; s.moveTo(-w, 0); s.lineTo(-w, L); s.absarc(0, L, w, Math.PI, 0, true); s.lineTo(w, 0); s.absarc(0, 0, w, 0, Math.PI, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -0.08);
  const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 6 + 0.5, P.getY(i) / 6);
  const m = new THREE.MeshPhysicalMaterial({ map: tx('ph/white_oak_veneer/white_oak_veneer_Diffuse_2k.jpg'), normalMap: tx('ph/white_oak_veneer/white_oak_veneer_nor_gl_2k.jpg', false), roughnessMap: tx('ph/white_oak_veneer/white_oak_veneer_Rough_2k.jpg', false), roughness: 0.75 });
  for (const t of [m.map, m.normalMap, m.roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); }
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function buildBubbles(n = 90) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), bubbleMat(0.9), n); im.frustumCulled = false; im.renderOrder = 8;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix);
  im.userData = { n }; return im;
}
// burbujas que nacen en puntos de un segmento (a → b, en coordenadas de la taza), crecen, se sueltan y suben hasta la superficie; k: 0..1 cuántas
function bubblesAt(BB, t, a, b, k, o = {}) {
  const n = BB.userData.n, top = o.top ?? MUG.WY, rate = o.rate ?? 1;
  for (let i = 0; i < n; i++) { const h = q => hash(i * 5.33 + q * 2.71), per = 0.9 + 1.4 * h(1), ph = ((t * rate / per + h(2)) % 1 + 1) % 1, u = h(3);
    const on = i / n < k; const nx = a.x + (b.x - a.x) * u + (h(4) - 0.5) * 0.25, ny = a.y + (b.y - a.y) * u, nz = a.z + (b.z - a.z) * u + (h(5) - 0.5) * 0.25;
    let x = nx, y = ny, z = nz, r;
    if (ph < 0.45) r = 0.04 + 0.11 * (ph / 0.45); else { const q = (ph - 0.45) / 0.55; r = 0.15; y = ny + (top - ny) * q * q * 1.2; x += Math.sin(q * 9 + i) * 0.12; }
    const vis = on && y < top - 0.05; _o.position.set(x, vis ? y : -1000, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(vis ? r * (o.scale ?? 1) : 0.0001); _o.updateMatrix(); BB.setMatrixAt(i, _o.matrix); }
  BB.instanceMatrix.needsUpdate = true;
}
