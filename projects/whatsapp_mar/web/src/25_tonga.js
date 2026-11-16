// ---------------------------------------------------------------- TONGA (maqueta pequeña del Pacífico): la isla de Tongatapu, el volcán Hunga Tonga–Hunga Haʻapai
// y el único cable de internet (a Fiyi). Enero de 2022: el volcán estalla bajo el mar, el cable salta en trozos y el país se queda sin internet.
// Marco local: origen en la orilla de Tongatapu, y = 0 nivel del mar, +X tierra adentro (isla x ∈ [0, 28]), mar x ∈ [−90, 0], z ∈ [−18, 18], base en y = −30.
// API: buildTonga() → Group (userData.anchors: island, volcano, cableBreak, net, label); tongaAt(t, { te, net }); TON_CAM(u) → [px,py,pz, lx,ly,lz, fov].
//   te = segundos desde que empieza la erupción (<0: antes; 0..6), net = 1 con internet → 0 sin internet (lo llevas tú; las casas siguen con luz).
const TON_X0 = -90, TON_X1 = 28, TON_Z = 18, TON_BOT = -30;
const TON_V = { x: -48, z: -4 };                 // el volcán (centro del cono)
const TON_CZ = 6;                                // el cable (a Fiyi), por el fondo
const TON_BREAK = 0.45;                          // te en que el flujo parte el cable
const TON_SHORE = 2.5;                           // hasta dónde llega el mar (la playa corta el agua en x ≈ 2)
function tonBase(x, z) {                         // el fondo y la isla (sin el volcán)
  if (x > 0) return -1.2 + 2.6 * _sm(0, 4, x) + 0.15 * Math.sin(x * 0.6 + z * 0.4) * _sm(4, 8, x);
  return -1.2 - 25.5 * _sm(0, 24, -x) + 2.2 * _sm(-70, -90, x) + 0.35 * Math.sin(x * 0.5 + z * 0.3) * Math.sin(z * 0.4 - x * 0.2) * _sm(0, 6, -x);
}
function tonCone(x, z) {                         // el cono del volcán con su cráter (el islote asoma ~3 m)
  const dx = x - TON_V.x, dz = z - TON_V.z, r = Math.hypot(dx, dz), rc = 3.4, a = Math.atan2(dz, dx);
  if (r < rc) return 3 - 2.6 * (1 - (r / rc) ** 2);
  const u = clamp((r - rc) / 28);
  return -28.5 + 31.5 * Math.pow(1 - u, 1.5) + 0.9 * Math.sin(a * 7 + 1.3) * u * (1 - u) * 4 + 0.5 * Math.sin(a * 13) * u * (1 - u) * 3;
}
const tonH = (x, z) => Math.max(tonBase(x, z), tonCone(x, z));
function tonWave(x, z, t, te) {                  // la superficie del mar (olas suaves + la ola de la explosión)
  let y = 0.12 * Math.sin(0.5 * x + 1.1 * t) + 0.08 * Math.sin(0.7 * z - 0.9 * t + 0.3 * x) + 0.05 * Math.sin(1.7 * x + 2.3 * z + 1.9 * t);
  if (te > 0) { const r = Math.hypot(x - TON_V.x, z - TON_V.z), R = 6 + 34 * te, A = 2.2 * Math.exp(-te * 0.55); y += A * Math.exp(-(((r - R) / 2.6) ** 2)) - 0.6 * A * Math.exp(-(((r - R + 5) / 3) ** 2)); }
  return y;
}
const tonCablePts = () => {                      // el cable: sale de la estación de la playa (x = 3,5) y va por el fondo hacia −X hasta salir de la maqueta
  const P = []; P.push(v3(4.2, 1.8, TON_CZ), v3(3.2, 1.0, TON_CZ));
  for (let x = 2; x >= TON_X0 - 3; x -= 0.75) P.push(v3(x, tonH(Math.max(x, TON_X0), TON_CZ) + 0.35, TON_CZ));
  return P;
};
function tonGlowTex(stops) { return canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [k, c] of stops) r.addColorStop(k, c); g.fillStyle = r; g.fillRect(0, 0, w, h); }); }
const TON_SHELL_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
uniform mat4 inv; varying vec3 vL; varying vec3 vN; varying vec3 vV;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vL = (inv * wp).xyz; vec4 mv = viewMatrix * wp; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
}`;
const TON_SHELL_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float op, mode; varying vec3 vL; varying vec3 vN; varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
  if (mode < 0.5) { if (vL.y > 0.05 || abs(vL.z) > 18. || vL.x < -90. || vL.x > 2.) discard; } else { if (vL.y < 0.) discard; }
  float rim = 1. - abs(dot(normalize(vN), normalize(vV))); float a = pow(rim, 5.) * 1.2 * op;
  gl_FragColor = vec4(col * a, a); }`;
const TON_WATER_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
#include <logdepthbuf_vertex>
}`;
const TON_WATER_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 top, deep, flashC; uniform float op, time, flash; uniform vec2 vc; varying vec3 vP;
void main(){
#include <logdepthbuf_fragment>
  float k = smoothstep(-29., 0., vP.y); vec3 c = mix(deep, top, pow(k, 1.4));
  float ray = pow(0.5 + 0.5 * sin(vP.x * 0.33 + sin(vP.x * 0.09 + vP.z * 0.1) * 3. + time * 0.35 + vP.y * 0.05), 7.) * smoothstep(-26., -1., vP.y);
  c += top * ray * 0.9 + vec3(0.55, 0.85, 1.) * smoothstep(-1.6, 0., vP.y) * 0.35;
  float d = length(vec2(vP.x - vc.x, vP.y)); c += flashC * flash * exp(-d / 14.);
  gl_FragColor = vec4(c * op, op); }`;

function buildTonga() {
  const G = new THREE.Group(), U = {}; G.userData.T = U; renderer.shadowMap.enabled = true;
  // ---------- base de museo (madera oscura lacada, canto de latón) y la placa
  const base = mesh(new THREE.BoxGeometry(TON_X1 - TON_X0 + 4, 3.4, 2 * TON_Z + 4), new THREE.MeshPhysicalMaterial({ color: 0x1a1210, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }));
  base.position.set((TON_X0 + TON_X1) / 2, TON_BOT - 1.7, 0); G.add(base);
  const trim = mesh(new THREE.BoxGeometry(TON_X1 - TON_X0 + 4.2, 0.35, 2 * TON_Z + 4.2), metal(0xc9a45c, 0.3)); trim.position.set((TON_X0 + TON_X1) / 2, TON_BOT - 0.15, 0); G.add(trim);
  const plaque = textPlane(16, 2.2, (g, w, h) => { g.fillStyle = '#c9a45c'; rr(g, 4, 4, w - 8, h - 8, 18); g.fill(); g.fillStyle = '#2a1d0e'; g.font = '800 46px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TONGA · PACÍFICO SUR', w / 2, h / 2 + 2); }, 640);
  plaque.position.set(12, TON_BOT - 1.7, TON_Z + 2.02); G.add(plaque);
  // ---------- el terreno: fondo del mar, el cono del volcán con su islote y la isla (una sola malla con colores por altura)
  const NX = 200, NZ = 62, P = [], C = [], I = [], col = new THREE.Color();
  const cSand = new THREE.Color(0xd9bd88), cBed = new THREE.Color(0x8a7a62), cDeep = new THREE.Color(0x5c5248), cRock = new THREE.Color(0x3b3533), cGrass = new THREE.Color(0x4f9a46), cGrass2 = new THREE.Color(0x3d8040), cIslet = new THREE.Color(0x6b5a48);
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = TON_X0 + (TON_X1 - TON_X0) * i / NX, z = -TON_Z + 2 * TON_Z * j / NZ, yb = tonBase(x, z), yc = tonCone(x, z), y = Math.max(yb, yc);
    P.push(x, y, z);
    if (x > 3.2) col.copy(cGrass).lerp(cGrass2, 0.5 + 0.5 * Math.sin(x * 0.7) * Math.sin(z * 0.9));
    else if (yc > yb) col.copy(y > 0.4 ? cIslet : cRock).lerp(cDeep, clamp(-y / 60) * 0.3);
    else col.copy(cSand).lerp(cBed, _sm(-0.5, -6, y)).lerp(cDeep, _sm(-12, -26, y));
    C.push(col.r, col.g, col.b);
    if (i && j) { const a = (j - 1) * (NX + 1) + i - 1, b = a + 1, c = a + NX + 1, d = c + 1; I.push(a, c, b, b, c, d); }
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); tg.setIndex(I); tg.computeVertexNormals();
  const terr = mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 })); G.add(terr);
  // cortes (capas de tierra y roca), igual que en las otras piezas
  const xs = []; for (let i = 0; i <= 236; i++) xs.push(TON_X0 + (TON_X1 - TON_X0) * i / 236);
  const zs = []; for (let i = 0; i <= 72; i++) zs.push(-TON_Z + 2 * TON_Z * i / 72);
  G.add(strataFace(xs, x => tonH(x, TON_Z), TON_Z, { bot: TON_BOT, band: 0.6, bandCol: 0x4a3a2a }));
  G.add(strataFace(xs, x => tonH(x, -TON_Z), -TON_Z, { bot: TON_BOT, band: 0.6, bandCol: 0x4a3a2a }));
  G.add(strataFace(zs, z => tonH(TON_X0, z), TON_X0, { bot: TON_BOT, band: 0.6, bandCol: 0x4a3a2a, normalX: -1 }));
  G.add(strataFace(zs, z => tonH(TON_X1, z), TON_X1, { bot: TON_BOT, band: 0.6, bandCol: 0x3f6a33, normalX: 1 }));
  // el cráter: un charco de lava (se enciende en la erupción)
  const lava = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a20).multiplyScalar(0.0), toneMapped: false }));
  lava.rotation.x = -Math.PI / 2; lava.position.set(TON_V.x, 0.55, TON_V.z); G.add(lava); U.lava = lava;
  // ---------- el agua en corte (caras laterales con degradado y luz que cae), la superficie con olas y el cristal
  const wmat = (op) => new THREE.ShaderMaterial({ vertexShader: TON_WATER_VS, fragmentShader: TON_WATER_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, premultipliedAlpha: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { top: { value: new THREE.Color(COL.water) }, deep: { value: new THREE.Color(COL.deep) }, flashC: { value: new THREE.Color(0xff7a2a) }, op: { value: op }, time: { value: 0 }, flash: { value: 0 }, vc: { value: new THREE.Vector2(TON_V.x, 0) } } });
  U.wfaces = [];
  const wface = (zf, op, alongZ = false) => {      // tira vertical: abajo el fondo, arriba la superficie (se mueve con las olas)
    const S2 = alongZ ? zs : xs.filter(x => x <= TON_SHORE), n = S2.length, pos = new Float32Array(n * 6), idx = [];
    for (let i = 1; i < n; i++) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, wmat(op)); m.renderOrder = 5; m.frustumCulled = false; G.add(m);
    const f = { m, S: S2, zf, alongZ }; U.wfaces.push(f); return f;
  };
  wface(-TON_Z, 0.97); wface(TON_X0, 0.6, true); wface(TON_Z, 0.36);
  // superficie
  const SX0 = TON_X0, SX1 = TON_SHORE, SNX = 124, SNZ = 48;
  const sg = new THREE.PlaneGeometry(SX1 - SX0, 2 * TON_Z, SNX, SNZ); sg.rotateX(-Math.PI / 2); sg.translate((SX0 + SX1) / 2, 0, 0);
  sg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(sg.attributes.position.count * 3).fill(1), 3));
  const sea = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2, depthWrite: false }));
  sea.renderOrder = 6; sea.frustumCulled = false; G.add(sea); U.sea = sea; U.sea0 = Float32Array.from(sg.attributes.position.array);
  // cristal: casi invisible, con brillo en los cantos
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 });
  const GY0 = TON_BOT, GY1 = 3.2, GH = GY1 - GY0, GL = TON_SHORE - TON_X0 + 1;
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(GL, GH), glassM); p.position.set((TON_X0 + TON_SHORE + 1) / 2, (GY0 + GY1) / 2, s * (TON_Z + 0.05)); p.renderOrder = 7; G.add(p); }
  const pe = new THREE.Mesh(new THREE.PlaneGeometry(2 * TON_Z, GH), glassM); pe.rotation.y = Math.PI / 2; pe.position.set(TON_X0 - 0.05, (GY0 + GY1) / 2, 0); pe.renderOrder = 7; G.add(pe);
  const gx0 = TON_X0 - 0.05, gx1 = TON_SHORE + 1, gz = TON_Z + 0.05;
  const edgeL = [[[gx0, GY1, gz], [gx1, GY1, gz]], [[gx0, GY1, -gz], [gx1, GY1, -gz]], [[gx0, GY1, -gz], [gx0, GY1, gz]], [[gx0, GY0, gz], [gx0, GY1, gz]], [[gx0, GY0, -gz], [gx0, GY1, -gz]],
    [[gx1, GY1, gz], [gx1, 1.4, gz]], [[gx1, GY1, -gz], [gx1, 1.4, -gz]], [[gx0, GY0 + 0.05, gz], [gx1, GY0 + 0.05, gz]]];
  for (const [a, b] of edgeL) G.add(drawLine([v3(...a), v3(...b)], 0xd8f0ff, 1.6, 0.55));
  // ---------- Tongatapu: casitas con luces cálidas, palmeras, la antena y la estación del cable
  const houseM = [plastic(0xf2ece0, 0.4), plastic(0xf5d9b8, 0.4), plastic(0xd9ecf2, 0.4), plastic(0xf2e2c4, 0.4)];
  const roofM = [plastic(0xc4553a, 0.35), plastic(0x2f8f8a, 0.35), plastic(0x8a4a32, 0.35), plastic(0xe0e4e8, 0.35)];
  const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb35c).multiplyScalar(2.4), toneMapped: false });
  const roofG = new THREE.ConeGeometry(1.15, 0.8, 4, 1); roofG.rotateY(Math.PI / 4);
  const winG = new THREE.PlaneGeometry(0.34, 0.34), houses = [];
  let hs = 0;
  for (let gx = 0; gx < 7; gx++) for (let gz = 0; gz < 9; gz++) {
    hs++; const x = 6.5 + gx * 2.7 + (hash(hs * 3.1) - 0.5) * 1.1, z = -13.5 + gz * 3.3 + (hash(hs * 5.3) - 0.5) * 1.2;
    if (hash(hs * 7.7) < 0.22 || (Math.abs(z - TON_CZ) < 2.4 && x < 10) || (Math.abs(x - 15) < 2.2 && Math.abs(z + 1) < 2.2)) continue;
    const h = new THREE.Group(), w = 1.2 + hash(hs) * 0.6, d = 1.1 + hash(hs * 2) * 0.5, ht = 0.9 + hash(hs * 4) * 0.5, y0 = tonH(x, z);
    const body = mesh(new THREE.BoxGeometry(w, ht, d), houseM[hs % 4]); body.position.y = ht / 2; h.add(body);
    const roof = mesh(roofG, roofM[(hs * 7) % 4]); roof.scale.set(w / 1.6, 1, d / 1.6); roof.position.y = ht + 0.4; h.add(roof);
    for (const [px, pz, ry] of [[0, d / 2 + 0.01, 0], [w / 2 + 0.01, 0, Math.PI / 2], [-w * 0.22, d / 2 + 0.01, 0], [0, -d / 2 - 0.01, Math.PI]]) {
      if (hash(hs * 11 + px * 3 + pz) < 0.3) continue; const wn = new THREE.Mesh(winG, winM); wn.position.set(px, ht * 0.55, pz); wn.rotation.y = ry; h.add(wn); }
    h.position.set(x, y0 - 0.05, z); h.rotation.y = (hash(hs * 13) - 0.5) * 0.5; G.add(h); houses.push(h);
  }
  U.houses = houses;
  // palmeras pequeñas (tronco curvo + hojas)
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: 0x3f9a3a, roughness: 0.6, side: THREE.DoubleSide });
  const leafG = new THREE.PlaneGeometry(1.8, 0.45, 4, 1); { const a = leafG.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i) + 0.9; a.setX(i, x); a.setY(i, a.getY(i) * (1 - x / 2.2)); a.setZ(i, -0.18 * x * x); } leafG.rotateX(-Math.PI / 2); leafG.computeVertexNormals(); }
  const palm = (x, z, s) => { const g = new THREE.Group(), bend = (hash(x * 3 + z) - 0.5) * 0.9, hgt = 2.6 * s;
    const pts = [0, 0.33, 0.66, 1].map(k => v3(bend * k * k, hgt * k, 0)); g.add(tube(pts, 0.09 * s, trunkM, 8, false, 6));
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(leafG, leafM); l.castShadow = true; l.position.copy(pts[3]); l.rotation.set(0, i / 7 * Math.PI * 2 + hash(i + x), 0); l.scale.setScalar(s); g.add(l); }
    g.position.set(x, tonH(x, z) - 0.05, z); g.rotation.y = hash(z * 7 + x) * 6.28; G.add(g); };
  for (let i = 0; i < 46; i++) { const edge = i < 22, x = edge ? 2.6 + hash(i * 1.7) * 2.2 : 5 + hash(i * 2.3) * 22, z = -16.5 + hash(i * 4.1) * 33; if (Math.abs(z - TON_CZ) < 1.6 && x < 6) continue; palm(x, z, 0.8 + hash(i * 9) * 0.45); }
  // la estación del cable (en la playa) y la antena
  const st = mesh(new THREE.BoxGeometry(2.4, 1.3, 2.2), plastic(0xe8eef2, 0.35)); st.position.set(5.2, tonH(5.2, TON_CZ) + 0.6, TON_CZ); G.add(st);
  const stR = mesh(new THREE.BoxGeometry(2.6, 0.18, 2.4), plastic(0x2a3440, 0.4)); stR.position.set(5.2, st.position.y + 0.72, TON_CZ); G.add(stR);
  const TW = v3(15, tonH(15, -1), -1), twH = 9;
  const tw = new THREE.Group(); tw.position.copy(TW); G.add(tw);
  const twM = plastic(0xdfe3e8, 0.35);
  for (const [a, b] of [[[-0.55, 0, -0.55], [-0.08, twH, -0.08]], [[0.55, 0, -0.55], [0.08, twH, -0.08]], [[-0.55, 0, 0.55], [-0.08, twH, 0.08]], [[0.55, 0, 0.55], [0.08, twH, 0.08]]]) tw.add(bar(v3(...a), v3(...b), 0.07, twM, 6));
  for (let k = 1; k < 6; k++) { const y = k * twH / 6, s = 0.55 * (1 - y / twH) + 0.08; for (const [a, b] of [[[-s, y, -s], [s, y, -s]], [[s, y, -s], [s, y, s]], [[s, y, s], [-s, y, s]], [[-s, y, s], [-s, y, -s]]]) tw.add(bar(v3(...a), v3(...b), 0.04, twM, 5)); }
  for (const a of [0, 2.1, 4.2]) { const p = mesh(new THREE.BoxGeometry(0.3, 0.9, 0.12), twM); p.position.set(Math.cos(a) * 0.3, twH - 1, Math.sin(a) * 0.3); p.rotation.y = -a; tw.add(p); }
  const beaconM = new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(3), toneMapped: false }); const beacon = sph(0.22, beaconM, 12, 8); beacon.position.y = twH + 0.25; tw.add(beacon); U.beacon = beacon;
  // ---------- la capa de «internet»: puntos cian (móviles, wifi) sobre las casas, unidos a la antena; y la antena a la estación del cable
  const dotTex = tonGlowTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(160,250,255,.85)'], [0.6, 'rgba(90,230,240,.25)'], [1, 'rgba(90,230,240,0)']]);
  U.dots = []; const top = v3(TW.x, TW.y + twH + 0.2, TW.z);
  const hs2 = houses.slice().sort((a, b) => hash(a.position.x * 7 + a.position.z) - hash(b.position.x * 7 + b.position.z));
  hs2.forEach((h, i) => { if (i % 4 === 3) return;
    const p = h.position.clone(); p.y += 2.6 + hash(i * 3.3) * 0.8; p.x += (hash(i) - 0.5) * 0.6;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color(COL.light).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sp.position.copy(p); sp.scale.setScalar(1.3); G.add(sp);
    const mid = p.clone().lerp(top, 0.5); mid.y += 1.2 + p.distanceTo(top) * 0.08; const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(new THREE.Vector3().copy(p).multiplyScalar((1 - u) * (1 - u)).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(top, u * u)); }
    const ln = drawLine(pts, COL.light, 1.4, 0.55); G.add(ln);
    U.dots.push({ sp, ln, th: 0.08 + 0.84 * hash(i * 9.7 + 1.3), ph: hash(i * 5.1) * 6.28, p });
  });
  { const a = v3(5.2, st.position.y + 0.8, TON_CZ), mid = a.clone().lerp(top, 0.5); mid.y += 4; const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new THREE.Vector3().copy(a).multiplyScalar((1 - u) * (1 - u)).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(top, u * u)); }
    U.trunk = drawLine(pts, COL.light, 2.4, 0.9); G.add(U.trunk); }
  // anillos wifi alrededor de la antena (ondas que salen)
  U.rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    r.rotation.x = Math.PI / 2; r.position.copy(top); G.add(r); U.rings.push(r); }
  // icono rojo de «sin conexión» (wifi tachado) flotando sobre la isla
  const offTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(256, 256, 120, 256, 256, 256); gr.addColorStop(0, 'rgba(255,59,48,.55)'); gr.addColorStop(1, 'rgba(255,59,48,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff3b30'; rr(g, 86, 86, 340, 340, 80); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 6; rr(g, 92, 92, 328, 328, 76); g.stroke();
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = 26;
    for (const r of [150, 104, 58]) { g.beginPath(); g.arc(256, 330, r, Math.PI * 1.22, Math.PI * 1.78); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(256, 330, 17, 0, 6.29); g.fill();
    g.lineWidth = 30; g.strokeStyle = '#ff3b30'; g.beginPath(); g.moveTo(150, 150); g.lineTo(362, 362); g.stroke(); g.lineWidth = 22; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(150, 150); g.lineTo(362, 362); g.stroke();
  });
  const off = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: offTex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) }));
  off.renderOrder = 20; off.position.set(13, 15, 0); off.visible = false; G.add(off); U.off = off;
  // ---------- el cable (a Fiyi): trozos de tubo por el fondo; los del flanco del volcán saltan
  const cp = tonCablePts(), cableM = new THREE.MeshPhysicalMaterial({ color: 0x20262e, roughness: 0.35, clearcoat: 1, emissive: COL.light, emissiveIntensity: 0.0 });
  const brkM = cableM.clone(); U.brkM = brkM; const curve = new THREE.CatmullRomCurve3(cp); U.curve = curve; const CL = curve.getLength(); U.CL = CL;
  U.pieces = []; const PL2 = 2.2, NPc = Math.ceil(CL / PL2);
  for (let k = 0; k < NPc; k++) {
    const s0 = k / NPc, s1 = (k + 1) / NPc, pts = []; for (let q = 0; q <= 6; q++) pts.push(curve.getPointAt(lerp(s0, s1, q / 6)));
    const c = pts[3].clone(); for (const p of pts) p.sub(c);
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.7, 10, false), cableM); m.castShadow = true; m.position.copy(c); G.add(m);
    const brk = c.x < -36 && c.x > -61, i = U.pieces.length;
    if (brk) m.material = brkM;
    U.pieces.push({ m, c, brk, s: (s0 + s1) / 2, v: v3((hash(i * 3.7) - 0.5) * 8, 8 + hash(i * 5.3) * 8, 2 + hash(i * 7.1) * 5), w: v3(hash(i) - 0.5, hash(i * 2) - 0.5, hash(i * 3) - 0.5).multiplyScalar(9) });
  }
  const bk = U.pieces.filter(p => p.brk); U.sBreak = [bk[0].s - 0.5 / NPc, bk[bk.length - 1].s + 0.5 / NPc];     // tramo roto (de la isla hacia fuera: s crece hacia −X)
  U.ends = [curve.getPointAt(U.sBreak[0]), curve.getPointAt(U.sBreak[1])];
  U.cableM = cableM;
  // pulsos de luz que corren por el cable
  const pulseTex = tonGlowTex([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(170,250,255,.8)'], [1, 'rgba(90,230,240,0)']]);
  U.pulses = []; for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTex, color: new THREE.Color(COL.light).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sp.scale.setScalar(4.5); G.add(sp); U.pulses.push(sp); }
  // chispas rojas en los extremos rotos
  U.spk = [sparks(G, 90, 0xff5a30, 1.1), sparks(G, 90, 0xff5a30, 1.1)];
  U.endGlow = U.ends.map(p => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTex, color: new THREE.Color(0xff3b30).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.position.copy(p); s.visible = false; s.renderOrder = 8; G.add(s); return s; });
  // ---------- LA ERUPCIÓN
  const VT = v3(TON_V.x, 1.5, TON_V.z); U.VT = VT;
  // destello
  const flashTex = tonGlowTex([[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,240,200,.95)'], [0.4, 'rgba(255,150,60,.45)'], [1, 'rgba(255,90,30,0)']]);
  U.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  U.flash.position.copy(VT).add(v3(0, 6, 0)); U.flash.renderOrder = 15; U.flash.visible = false; G.add(U.flash);
  U.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xff7a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  U.glow.position.copy(VT).add(v3(0, 4, 0)); U.glow.visible = false; G.add(U.glow);
  U.light = new THREE.PointLight(0xff8a40, 0, 260, 1.3); U.light.position.copy(VT).add(v3(0, 22, -6)); G.add(U.light);
  // columna de ceniza y vapor (bolas de «algodón» iluminadas: se lee de lejos)
  const NA = 300, ashG = new THREE.IcosahedronGeometry(1, 1);
  const ash = new THREE.InstancedMesh(ashG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, emissive: 0x2a201a, emissiveIntensity: 1, flatShading: false }), NA);
  ash.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ash.castShadow = false; ash.frustumCulled = false; G.add(ash); U.ash = ash; U.ashD = [];
  const cAsh = new THREE.Color(0x4e4844), cAsh2 = new THREE.Color(0x2e2a29), cSteam = new THREE.Color(0xe4e8ec);
  for (let i = 0; i < NA; i++) {
    const surge = i < 46, s = hash(i * 1.91), steam = surge || hash(i * 6.6) < 0.3;
    const d = { surge, s, b: surge ? hash(i * 2.7) * 0.5 : Math.pow(hash(i * 2.7), 1.6) * 3.6, phi: hash(i * 3.9) * 6.283, rr: hash(i * 4.4), sz: 0.7 + hash(i * 8.1) * 0.6, hm: 35 + 95 * Math.pow(s, 0.8) };
    U.ashD.push(d); ash.setColorAt(i, (steam ? cSteam : cAsh).clone().lerp(cAsh2, surge ? 0.2 : hash(i * 9.9) * 0.7));
  }
  // rayos dentro de la columna
  U.bolts = []; for (let i = 0; i < 5; i++) { const pts = []; let p = v3(TON_V.x + (hash(i * 3) - 0.5) * 10, 30 + hash(i * 5) * 50, TON_V.z + (hash(i * 7) - 0.5) * 10);
    for (let k = 0; k < 8; k++) { pts.push(p.clone()); p = p.clone().add(v3((hash(i * 11 + k) - 0.5) * 7, -3 - hash(i * 13 + k) * 4, (hash(i * 17 + k) - 0.5) * 7)); }
    const b = tube(pts, 0.28, basicGlow(0xd8ccff, 4), 40, false, 4); b.castShadow = false; b.visible = false; G.add(b); U.bolts.push({ b, t0: 0.7 + i * 0.55 + hash(i * 19) * 0.3 }); }
  // bombas de lava (chispas naranjas)
  U.bombs = sparks(G, 160, 0xffa040, 0.9);
  // onda de choque en el aire (cúpula que se expande) y onda de presión en el agua (esfera recortada al agua del corte)
  const shellM = (c, mode) => new THREE.ShaderMaterial({ vertexShader: TON_SHELL_VS, fragmentShader: TON_SHELL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { inv: { value: new THREE.Matrix4() }, col: { value: new THREE.Color(c) }, op: { value: 0 }, mode: { value: mode } } });
  U.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), shellM(0xf4f6ff, 1)); U.dome.position.set(TON_V.x, 0, TON_V.z); U.dome.visible = false; U.dome.renderOrder = 9; G.add(U.dome);
  U.pwave = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), shellM(0x9fe8ff, 0)); U.pwave.position.set(TON_V.x, -1, TON_V.z); U.pwave.visible = false; U.pwave.renderOrder = 4; G.add(U.pwave);
  // flujo de rocas y lodo por la ladera (hacia el cable)
  const NR = 110, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 0.9 }), NR);
  rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rocks.castShadow = true; rocks.frustumCulled = false; G.add(rocks); U.rocks = rocks;
  U.rockD = []; for (let i = 0; i < NR; i++) U.rockD.push({ th: Math.PI / 2 + (hash(i * 2.3) - 0.5) * (i < 80 ? 1.9 : 6.28), lag: hash(i * 3.1), sz: 0.35 + hash(i * 5.9) ** 2 * 1.1 });
  const NM = 70, mud = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x6b5a46, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), NM);
  mud.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mud.frustumCulled = false; mud.renderOrder = 3; G.add(mud); U.mud = mud;
  U.mudD = []; for (let i = 0; i < NM; i++) U.mudD.push({ th: Math.PI / 2 + (hash(i * 4.7) - 0.5) * 2.0, lag: hash(i * 6.3), sz: 1.4 + hash(i * 8.8) * 1.8, up: hash(i * 9.4) });
  // ---------- anclas (marco local)
  G.userData.anchors = { island: v3(12, 3, 0), volcano: v3(TON_V.x, 3.5, TON_V.z), cableBreak: curve.getPointAt((U.sBreak[0] + U.sBreak[1]) / 2), net: v3(13, 15, 0), label: v3(12, 20, 0) };
  U.G = G; S.tonga = G; tongaAt(0, { te: -1, net: 1 }); return G;
}
const _tonM = new THREE.Matrix4(), _tonQ = new THREE.Quaternion(), _tonV = new THREE.Vector3(), _tonS = new THREE.Vector3(), _tonE = new THREE.Euler();
function tongaAt(t, o = {}) {
  const G = S.tonga, U = G.userData.T, te = o.te ?? -1, net = clamp(o.net ?? 1), E = te > 0;
  G.updateMatrixWorld(true); const inv = _tonM.copy(G.matrixWorld).invert();
  // ---- mar: olas, la ola de la explosión y espuma
  const sa = U.sea.geometry.attributes.position, sc = U.sea.geometry.attributes.color, s0 = U.sea0, cw = new THREE.Color(COL.water).lerp(new THREE.Color(0x6fc3d8), 0.55);
  for (let i = 0; i < sa.count; i++) { const x = s0[i * 3], z = s0[i * 3 + 2], y = tonWave(x, z, t, te); sa.array[i * 3 + 1] = y;
    let f = 0; if (E) { const r = Math.hypot(x - TON_V.x, z - TON_V.z), R = 6 + 34 * te; f = Math.exp(-(((r - R) / 2.2) ** 2)) * Math.exp(-te * 0.45) + Math.exp(-r / 7) * clamp(1.2 - te * 0.15); }
    f = clamp(f + Math.max(0, y - 0.18) * 1.5); sc.array[i * 3] = lerp(cw.r, 1, f); sc.array[i * 3 + 1] = lerp(cw.g, 1, f); sc.array[i * 3 + 2] = lerp(cw.b, 1, f); }
  sa.needsUpdate = true; sc.needsUpdate = true; U.sea.geometry.computeVertexNormals();
  // ---- flash / brillo
  const fl = E ? Math.exp(-te * 6) * clamp(te / 0.04) : 0, glow = E ? clamp(te / 0.3) * (0.55 + 0.45 * Math.exp(-te * 0.6)) * (0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3)) : 0;
  for (const f of U.wfaces) { const g = f.m.geometry.attributes.position, A = g.array;
    f.S.forEach((q, i) => { const x = f.alongZ ? f.zf : q, z = f.alongZ ? q : f.zf, yb = tonH(x, z), yt = Math.max(yb, tonWave(x, z, t, te));
      A.set([x, yb, z, x, yt, z], i * 6); });
    g.needsUpdate = true; const u = f.m.material.uniforms; u.time.value = t; u.flash.value = fl * 0.9 + glow * 0.25; }
  U.flash.visible = fl > 0.01; U.flash.scale.setScalar(12 + 45 * (1 - Math.exp(-te * 6))); U.flash.material.opacity = Math.min(1, fl * 1.3); U.flash.material.color.setScalar(1 + fl * 2);
  U.glow.visible = glow > 0.01; U.glow.scale.setScalar(26 + 8 * glow); U.glow.material.opacity = glow;
  U.lava.material.color.set(0xff6a20).multiplyScalar(3 * glow);
  U.light.intensity = 1600 * fl + 260 * glow;
  // ---- columna de ceniza
  const ash = U.ash;
  U.ashD.forEach((d, i) => { const a = te - d.b; if (!E || a <= 0) { _tonM.makeScale(0, 0, 0); ash.setMatrixAt(i, _tonM); return; }
    let x, y, z, sz;
    if (d.surge) { const R = 4 + (24 + 10 * d.rr) * (1 - Math.exp(-a * 1.5)); y = 0.6 + d.s * 2 + a * 0.5; x = TON_V.x + Math.cos(d.phi) * R; z = TON_V.z + Math.sin(d.phi) * R; sz = (2.4 + a * 1.1 + d.s * 1.2) * d.sz;
      if (Math.abs(z) > TON_Z + 6 || x < TON_X0 - 8) sz *= clamp(1 - (Math.max(Math.abs(z) - TON_Z - 6, TON_X0 - 8 - x)) / 6); sz *= clamp(1 - (a - 0.8) / 1.0); }
    else { y = 2 + d.hm * (1 - Math.exp(-a * 0.85)); const top = Math.pow(clamp(y / d.hm), 8) * (d.s > 0.55 ? 1 : 0.3);
      const rad = (1.5 + y * 0.1) * d.rr + top * (10 + 50 * (1 - Math.exp(-a * 0.35))) * (0.4 + 0.6 * d.rr);
      x = TON_V.x + Math.cos(d.phi) * rad + Math.sin(y * 0.05 + d.phi) * 2; z = TON_V.z + Math.sin(d.phi) * rad; sz = (2 + y * 0.06 + a * 0.6 + top * 3) * d.sz * clamp(a / 0.25); }
    _tonQ.setFromEuler(_tonE.set(d.phi, d.rr * 3, a * 0.2)); _tonM.compose(_tonV.set(x, y, z), _tonQ, _tonS.setScalar(Math.max(0.001, sz))); ash.setMatrixAt(i, _tonM); });
  ash.instanceMatrix.needsUpdate = true; ash.visible = E;
  ash.material.emissive.setRGB(0.05 + 0.22 * glow + 1.1 * fl, 0.045 + 0.08 * glow + 0.75 * fl, 0.045 + 0.02 * glow + 0.55 * fl);
  for (const B of U.bolts) { const k = (te - B.t0) % 2.2; B.b.visible = E && te > B.t0 && k < 0.3 && (k < 0.1 || k > 0.16); }
  U.bombs.visible = E && te < 3.2; if (U.bombs.visible) burst(U.bombs, U.VT, te, 0, 9, 3, false, 9.5);
  U.bombs.material.opacity = clamp(1.6 - te * 0.5);
  // ---- ondas de choque
  U.dome.visible = E && te < 1.6; if (U.dome.visible) { U.dome.scale.setScalar(5 + 150 * (1 - Math.exp(-te * 1.6))); const u = U.dome.material.uniforms; u.inv.value.copy(inv); u.op.value = 0.55 * Math.exp(-te * 2.4) * clamp(te / 0.05); }
  U.pwave.visible = E && te < 1.8; if (U.pwave.visible) { U.pwave.scale.setScalar(3 + 85 * te); const u = U.pwave.material.uniforms; u.inv.value.copy(inv); u.op.value = 1.6 * Math.exp(-te * 1.6) * clamp(te / 0.04); }
  // ---- flujo de rocas y lodo ladera abajo
  const rf = E ? 3.5 + 24 * (1 - Math.exp(-te * 1.05)) : 0;
  U.rockD.forEach((d, i) => { const r = 3.5 + Math.max(0, rf - 3.5 - d.lag * 7), on = E && rf - 3.5 - d.lag * 7 > 0;
    if (!on) { _tonM.makeScale(0, 0, 0); U.rocks.setMatrixAt(i, _tonM); return; }
    const x = TON_V.x + Math.cos(d.th) * r, z = TON_V.z + Math.sin(d.th) * r, y = tonH(x, z) + d.sz * 0.7 + Math.abs(Math.sin(r * 1.3 + i)) * 0.6 * clamp(3 - te);
    _tonQ.setFromEuler(_tonE.set(r * 0.9 + i, i, r * 0.6)); _tonM.compose(_tonV.set(x, y, z), _tonQ, _tonS.setScalar(d.sz)); U.rocks.setMatrixAt(i, _tonM); });
  U.rocks.instanceMatrix.needsUpdate = true;
  U.mudD.forEach((d, i) => { const k = rf - 3.5 - d.lag * 5, on = E && k > 0;
    if (!on) { _tonM.makeScale(0, 0, 0); U.mud.setMatrixAt(i, _tonM); return; }
    const r = 3.5 + k + 1.5, x = TON_V.x + Math.cos(d.th) * r, z = TON_V.z + Math.sin(d.th) * r, y = tonH(x, z) + 0.8 + d.up * (1.5 + te * 1.1);
    _tonM.compose(_tonV.set(x, y, z), _tonQ.identity(), _tonS.set(1, 0.6, 1).multiplyScalar(d.sz * (0.7 + 0.35 * te) * clamp(k / 2))); U.mud.setMatrixAt(i, _tonM); });
  U.mud.instanceMatrix.needsUpdate = true; U.mud.material.opacity = 0.6 * clamp(2.2 - te * 0.25);
  // ---- el cable: luz, pulsos y trozos que saltan
  const kb = te - TON_BREAK, broken = kb > 0;
  U.cableM.emissiveIntensity = 0.75 * (broken ? clamp(1 - kb * 0.8) : 1);
  U.brkM.emissive.set(broken ? 0xff5a20 : COL.light); U.brkM.emissiveIntensity = broken ? 2.2 * Math.exp(-kb * 0.9) + 0.15 : U.cableM.emissiveIntensity;
  for (const p of U.pieces) { if (!p.brk) continue; const m = p.m;
    if (!broken) { m.position.copy(p.c); m.rotation.set(0, 0, 0); continue; }
    const k = kb, dr = (1 - Math.exp(-k * 1.4)) / 1.4; m.position.set(p.c.x + p.v.x * dr, p.c.y + p.v.y * dr - 2.2 * k * k, p.c.z + p.v.z * dr);
    const fl2 = tonH(m.position.x, m.position.z) + 0.5; if (m.position.y < fl2) m.position.y = fl2;
    const sp = 1 - Math.exp(-k * 1.2); m.rotation.set(p.w.x * sp, p.w.y * sp, p.w.z * sp); }
  U.pulses.forEach((sp, i) => { const s = ((t * 0.32 + i / U.pulses.length) % 1); let vis = true, op = 1;
    if (broken) { vis = s < U.sBreak[0]; op = clamp(1 - kb * 0.7); }
    sp.visible = vis && op > 0.01 && net > 0.02; if (!sp.visible) return; sp.position.copy(U.curve.getPointAt(s)); sp.material.opacity = op * Math.min(1, net * 2); });
  U.spk.forEach((p, i) => { p.visible = broken && kb < 4.5; if (p.visible) burst(p, U.ends[i], t, 0, 1.6, 0.7, true, 3); p.material.opacity = clamp(1.4 - kb * 0.3); });
  U.endGlow.forEach(s => { s.visible = broken; s.scale.setScalar(7 + Math.sin(t * 17) * 1.2); s.material.opacity = clamp(1.5 - kb * 0.15); });
  // ---- internet en la isla: los puntos se apagan uno a uno (las casas siguen con luz)
  for (const d of U.dots) { const k = clamp((net - d.th) * 12 + 0.5), br = 0.85 + 0.15 * Math.sin(t * 3 + d.ph);
    d.sp.visible = k > 0.01; d.sp.scale.setScalar(1.3 * (0.4 + 0.6 * k) * br); d.sp.material.opacity = k; d.ln.visible = k > 0.02; d.ln.material.opacity = 0.55 * k; }
  U.trunk.material.opacity = 0.9 * clamp(net * 1.5); U.trunk.visible = net > 0.02;
  U.beacon.material.color.set(net > 0.05 ? COL.light : 0x3a3a3a).multiplyScalar(net > 0.05 ? 1 + 2 * (0.5 + 0.5 * Math.sin(t * 6)) : 1);
  U.rings.forEach((r, i) => { const ph = (t * 0.6 + i / 3) % 1; r.scale.setScalar(1 + ph * 9); r.material.opacity = (1 - ph) * 0.7 * clamp(net * 1.4); r.visible = net > 0.03; });
  // icono «sin conexión»
  const ko = clamp((0.45 - net) / 0.3); U.off.visible = ko > 0.01;
  if (U.off.visible) { const s = ko < 1 ? 1 + Math.sin(ko * Math.PI) * 0.25 : 1; U.off.scale.setScalar(7.5 * eo(ko) * s); U.off.position.y = 15 + 0.3 * Math.sin(t * 2.2); U.off.material.opacity = Math.min(1, ko * 1.5);
    G.getWorldQuaternion(_tonQ).invert(); U.off.quaternion.copy(_tonQ).multiply(cam.quaternion); }
}
// cámara (marco local) para u 0..1 (≈ 6,5 s): llega desde arriba, plano 3/4 (isla, volcán, cable en el corte), erupción en u ≈ 0,15, cable roto en ≈ 0,22,
// y se acerca a la isla mientras se apaga internet (0,5–1)
function TON_CAM(u) {
  const c = camKeys(u, [
    [0.00, [40, 330, 220], [-30, 0, -2], 34],
    [0.12, [110, 140, 205], [-30, 12, -2], 34],
    [0.26, [140, 62, 168], [-32, 28, -4], 34],
    [0.50, [132, 54, 152], [-26, 30, -4], 34],
    [1.00, [62, 30, 100], [2, 11, 0], 33],
  ]);
  return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f];
}
