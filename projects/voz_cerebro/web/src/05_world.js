// ---------------------------------------------------------------- EL MUNDO: todo flota en un vacío negro. Cada escena está en su sitio y la cámara viaja de una a otra sin cortes
// (las estelas del «flujo óptico» hacen de puente). Unidades: la cabeza mide ≈ 2,3 de alto.
//   CABEZA (0, 0, 0) · CORTEZA en grande (MAC) · ORDENADOR / IA (AIP) · VOZ (VOX)
// (posiciones de cada escena: NEU en 21_neuro.js, VOX en 24_voice.js)
const GOLD = new THREE.Color(1.0, 0.62, 0.18), CYAN = new THREE.Color(0.25, 0.7, 1.0), WHITE = new THREE.Color(1, 1, 1);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));
const _v = () => new THREE.Vector3();
const stdM = (c, r = 0.5, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const addM = (c, op = 1, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...o });
function glowSprite(col, s = 1, op = 1) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.scale.setScalar(s); return m; }

// ---- holograma de cristal: borde brillante (fresnel), cuerpo casi transparente y líneas de barrido muy finas
const HOLO_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const HOLO_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col, col2; uniform float op, scan, time, edge;
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
#include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(vV); float f = 1. - abs(dot(N, V)), fr = pow(f, edge);
  float sl = 0.5 + 0.5 * sin(vW.y * 260. - time * 2.0); sl = smoothstep(0.6, 1.0, sl) * scan;
  vec3 c = mix(col2, col, fr) * (0.035 + 1.25 * fr + 0.08 * sl);
  float a = op * (0.035 + 1.25 * fr + 0.08 * sl);
  gl_FragColor = vec4(c * op, a);
}`;
function holoMat(col = CYAN, op = 1, o = {}) { return new THREE.ShaderMaterial({ vertexShader: HOLO_VS, fragmentShader: HOLO_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: o.side ?? THREE.FrontSide,
  uniforms: { col: { value: col.clone() }, col2: { value: (o.col2 || new THREE.Color(0.05, 0.15, 0.4)).clone() }, op: { value: op }, scan: { value: o.scan ?? 1 }, time: { value: 0 }, edge: { value: o.edge ?? 2.2 } } }); }

// ---- el cerebro de luz (lámina 1 de Javi): cuerpo oscuro, los pliegues encendidos en oro, el borde en azul, chispas que titilan y ondas de actividad.
// «hot» = una zona que se enciende (centro, radio, fuerza): la corteza motora del habla
const BR_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aP; attribute float aF;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW; varying float vF;
void main(){ vP = aP; vF = aF; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const BR_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float op, act, time, sparks, dim; uniform vec4 hot; uniform float hotK; uniform vec3 hotC;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW; varying float vF;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
#include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(vV); float f = 1. - abs(dot(N, V));
  float fold = smoothstep(0.0, -0.6, vF), crest = smoothstep(0.0, 0.5, vF);                 // vF = arruga (−1 surco … +1 cresta)
  float w = fwidth(vF) * 1.6 + 0.02, line = 1. - smoothstep(0.0, w, abs(vF - 0.05));          // filamentos de luz en el borde de cada pliegue
  vec3 gold = vec3(1.0, 0.56, 0.14), blue = vec3(0.16, 0.5, 1.0);
  float wave = 0.5 + 0.5 * sin(vP.z * 9. + vP.y * 5. - time * 2.2);
  float front = 1. - f;
  vec3 c = vec3(0.006, 0.009, 0.02) + gold * crest * (0.035 + 0.06 * act * wave) * front + gold * line * (0.55 + 0.9 * act * wave) * (0.4 + 0.6 * front)
         + blue * pow(f, 2.2) * 0.9 + blue * fold * 0.025;
  // chispas: puntitos que se encienden y se apagan
  vec3 q = floor(vP * 46.); float r = h3(q), tw = 0.5 + 0.5 * sin(time * (2. + r * 5.) + r * 40.);
  vec3 lp = fract(vP * 46.) - 0.5; float d = length(lp);
  c += (r > 0.86 ? 1. : 0.) * smoothstep(0.22, 0.0, d) * tw * sparks * mix(gold, vec3(1.0, 0.9, 0.7), 0.5) * 2.4;
  // la zona que se enciende
  float hd = distance(vW, hot.xyz), hk = smoothstep(hot.w, hot.w * 0.25, hd) * hotK;
  c += hotC * hk * (0.55 + 0.45 * sin(time * 6.)) * (0.6 + crest) * 1.4;
  c *= dim;
  gl_FragColor = vec4(c * op, op);
}`;
// arrugas alargadas que serpentean (circunvoluciones), no celdas: suma de dos campos de rayas deformadas
const bnz = v => { const a = Math.sin(v.z * 13 + 2.6 * Math.sin(v.y * 5.5 + v.x * 3) + 1.6 * Math.sin(v.x * 7 + 1)), b = Math.sin(v.y * 15 + 2.2 * Math.sin(v.z * 6 + 2) + 1.4 * Math.sin(v.x * 9));
  return 0.62 * a + 0.38 * b * (0.6 + 0.4 * Math.sin(v.z * 3 + v.y * 2)); };
function brainMat() { return new THREE.ShaderMaterial({ vertexShader: BR_VS, fragmentShader: BR_FS, transparent: true, depthWrite: true, side: THREE.FrontSide,
  uniforms: { op: { value: 1 }, act: { value: 0.6 }, time: { value: 0 }, sparks: { value: 1 }, dim: { value: 1 }, hot: { value: new THREE.Vector4(0, 0, 0, 0.2) }, hotK: { value: 0 }, hotC: { value: new THREE.Color(1.0, 0.75, 0.3) } } }); }
// un hemisferio (eje largo en z, la cara medial en x = 0). Devuelve la geometría con aP (posición sin arrugas) y aF (profundidad del surco)
function hemiGeo(seg = 200) { const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), p = geo.attributes.position, v = new THREE.Vector3(), aP = new Float32Array(p.count * 3), aF = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); aP[i * 3] = v.x; aP[i * 3 + 1] = v.y; aP[i * 3 + 2] = v.z; const n = bnz(v), fold = Math.pow(Math.max(0, -n), 0.7); aF[i] = n;
    v.multiplyScalar(1 + 0.055 * n - 0.03 * fold);
    if (v.x < 0) v.x *= 0.25; v.x *= 0.62; v.y *= 0.62; v.z *= 1.0; if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.55;                         // cara medial plana y base más plana
    if (v.z < -0.3 && v.y < 0.1) v.y -= 0.08 * (-v.z - 0.3);                                                                                 // lóbulo occipital un poco caído
    if (v.z > 0.1 && v.y < -0.05) v.y += 0.0;
    p.setXYZ(i, v.x, v.y, v.z); }
  geo.setAttribute('aP', new THREE.BufferAttribute(aP, 3)); geo.setAttribute('aF', new THREE.BufferAttribute(aF, 1)); geo.computeVertexNormals(); return geo; }

// ================= EL CEREBRO REAL (superficie media de la corteza del Human Connectome Project, «Conte69 32k», incluida en BrainSpace, BSD-3):
// dos hemisferios con su curvatura (aC) y la profundidad de cada surco (aD, en mm: + = hundido). Se pinta en tres estilos, como las láminas de Javi:
//   «luz»  = cuerpo azul noche, la luz de oro saliendo de los surcos, borde azul y chispas (lámina 1)
//   «azul» = todo azul eléctrico con líneas (lámina «señales neuronales»)
//   «rosa» = cerebro de verdad, rosado y brillante (láminas del chip y del brazo robótico): material con luz real
const GLOW_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 aCD; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vL; varying float vC; varying float vD;
void main(){ vC = aCD.x; vD = aCD.y; vL = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const GLOW_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float op, time, act, sparks, blue, lines; uniform vec3 cA, cB; uniform vec4 hot; uniform float hotK; uniform vec3 hotC;
varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vL; varying float vC; varying float vD;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float ridge(vec3 p){ float n = vn(p) * 0.6 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 + 3.3) * 0.1; return 1. - abs(n * 2. - 1.); }
void main(){
#include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(vV); float nv = abs(dot(N, V)), f = 1. - nv;
  float sul = smoothstep(-0.6, 3.2, vD);                                    // 0 en la cresta, 1 en el fondo del surco
  float crest = 1. - smoothstep(-2.5, 0.2, vD);
  float grad = smoothstep(-70., 60., vL.z + 0.4 * vL.y);                    // delante (frente) más oro, detrás más azul
  vec3 inner = mix(cB, cA, grad);
  float wave = 0.65 + 0.35 * sin(vL.z * 0.09 + vL.y * 0.05 - time * 1.6);
  vec3 c = vec3(0.004, 0.008, 0.022) * (0.5 + nv);
  c += inner * pow(sul, 1.8) * (0.3 + 0.5 * act * wave);                   // la luz sale de los surcos
  float edge = 1. - smoothstep(0.0, 0.9, abs(vD - 0.4));                    // hilo de luz en el borde de cada pliegue
  c += inner * edge * 0.16 * (0.6 + act * wave) * lines;
  float fil = pow(ridge(vL * 0.11 + vec3(0., 0., time * 0.02)), 26.);         // filamentos finos de luz por toda la superficie (como venas de oro)
  float fil2 = pow(ridge(vL * 0.24 + 11.), 30.);
  c += mix(inner, vec3(1.0, 0.8, 0.45), 0.3) * (fil * 0.75 + fil2 * 0.3) * (0.5 + 0.8 * act * wave) * lines * (0.4 + 0.6 * nv);
  c += cB * pow(f, 3.0) * 0.55 + vec3(0.12, 0.25, 0.6) * crest * pow(f, 1.6) * 0.1;   // borde azul
  vec3 q = floor(vL * 0.42 + 0.5); float r = h3(q), tw = 0.5 + 0.5 * sin(time * (1.5 + r * 4.) + r * 30.); vec3 lp = fract(vL * 0.42 + 0.5) - 0.5;
  c += step(0.84, r) * smoothstep(0.26, 0.0, length(lp)) * tw * sparks * mix(vec3(1.0, 0.78, 0.42), vec3(1.0), 0.3) * 4.0;    // chispas
  float hd = distance(vW, hot.xyz), hk = smoothstep(hot.w, hot.w * 0.2, hd) * hotK;
  c += hotC * hk * (0.6 + 0.4 * sin(time * 6.)) * (0.5 + sul) * 2.2;
  gl_FragColor = vec4(c * op, op);
}`;
function glowBrainMat(o = {}) { return new THREE.ShaderMaterial({ vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: true,
  uniforms: { op: { value: 1 }, time: { value: 0 }, act: { value: 0.7 }, sparks: { value: 1 }, blue: { value: 0 }, lines: { value: 1 }, cA: { value: (o.cA || new THREE.Color(1.0, 0.55, 0.12)).clone() }, cB: { value: (o.cB || new THREE.Color(0.18, 0.45, 1.0)).clone() },
    hot: { value: new THREE.Vector4(0, 0, 0, 10) }, hotK: { value: 0 }, hotC: { value: new THREE.Color(1.0, 0.8, 0.35) } } }); }
let BRAIN_GEO = null;
async function loadBrainGeo() { if (BRAIN_GEO) return BRAIN_GEO; const meta = await (await fetch(ASSET + 'brain_meta.json')).json(), out = {};
  for (const h of ['lh', 'rh']) { const [pos, idx, attr] = await Promise.all(['pos', 'idx', 'attr'].map(k => fetch(ASSET + `brain_${h}_${k}.bin`).then(r => r.arrayBuffer())));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('aCD', new THREE.BufferAttribute(new Float32Array(attr), 2)); g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
    g.computeVertexNormals(); out[h] = g; }
  BRAIN_GEO = out; return out; }
// color del cerebro rosa (por vértice: más claro en las crestas, más oscuro y rojizo en los surcos)
function pinkColors(g) { const a = g.attributes.aCD, n = a.count, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const d = clamp((a.getY(i) + 2.5) / 6); c.setRGB(lerp(0.9, 0.42, d), lerp(0.4, 0.08, d), lerp(0.5, 0.16, d)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
// cerebelo con sus láminas finas (folias) y el tronco del encéfalo, en mm como la corteza (se colocan debajo y detrás)
function cerebellumGeo() { const g = new THREE.SphereGeometry(1, 160, 100), p = g.attributes.position, v = new THREE.Vector3(), aCD = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const fol = Math.sin((v.y * 1.0 + 0.22 * v.z * v.z + 0.06 * Math.sin(v.x * 9)) * 64); const d = Math.max(0, -fol) * 2.2; v.multiplyScalar(1 - 0.01 * d);
    if (Math.abs(v.x) < 0.14) v.z -= 0.1; v.set(v.x * 50, v.y * 24, v.z * 31); p.setXYZ(i, v.x, v.y, v.z); aCD[i * 2] = 0; aCD[i * 2 + 1] = d * 1.6 - 0.6; }
  g.setAttribute('aCD', new THREE.BufferAttribute(aCD, 2)); g.computeVertexNormals(); return g; }
function stemGeo() { const pts = [[0, 0], [8, 1], [11, 8], [15, 18], [14.5, 27], [10, 36], [8.5, 48], [8, 62]].map(q => new THREE.Vector2(q[0], -q[1])), g = new THREE.LatheGeometry(pts, 48), n = g.attributes.position.count, aCD = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) aCD[i * 2 + 1] = -1; g.setAttribute('aCD', new THREE.BufferAttribute(aCD, 2)); g.computeVertexNormals(); return g; }
// el cerebro completo (en mm; se escala fuera). style: 'luz' | 'azul'; con pink = true crea además la versión rosa (con luz real)
async function realBrain(o = {}) { const G = await loadBrainGeo(), g = new THREE.Group(), U = g.userData;
  U.gm = glowBrainMat(o); U.parts = [];
  for (const h of ['lh', 'rh']) { const m = new THREE.Mesh(G[h], U.gm); m.position.x = h === 'lh' ? 1.2 : -1.2; m.renderOrder = 3; g.add(m); U.parts.push(m); }
  U.cbm = glowBrainMat(o); U.cbm.uniforms.lines.value = 0.6; const cb = new THREE.Mesh(cerebellumGeo(), U.cbm); cb.position.set(0, -34, -70); cb.rotation.x = 0.3; g.add(cb); U.cb = cb;
  U.stm = glowBrainMat({ cA: new THREE.Color(0.35, 0.5, 0.8), cB: new THREE.Color(0.25, 0.45, 0.9) }); U.stm.uniforms.sparks.value = 0.2; const st = new THREE.Mesh(stemGeo(), U.stm); st.position.set(0, -12, -26); st.rotation.x = 0.3; g.add(st); U.st = st;
  if (o.pink) { const pm = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 1.0, clearcoatRoughness: 0.14, sheen: 0.3, sheenColor: new THREE.Color(1, 0.75, 0.8), transparent: true, opacity: 0 }); U.pm = pm; pm.userData.studio = 1;
    for (const h of ['lh', 'rh']) { if (!G[h].attributes.color) pinkColors(G[h]); const m = new THREE.Mesh(G[h], pm); m.position.x = h === 'lh' ? 1.2 : -1.2; g.add(m); U.parts.push(m); }
    const cbg = cb.geometry; if (!cbg.attributes.color) pinkColors(cbg); const cp = new THREE.Mesh(cbg, pm); cp.position.copy(cb.position); cp.rotation.copy(cb.rotation); g.add(cp); }
  U.mats = [U.gm, U.cbm, U.stm]; return g; }
function brainGlowAt(B, t, o = {}) { const U = B.userData; for (const m of U.mats) { const u = m.uniforms; u.time.value = t; u.op.value = o.op ?? 1; if (o.act !== undefined) u.act.value = o.act; if (o.cA) u.cA.value.copy(o.cA); if (o.cB) u.cB.value.copy(o.cB); if (o.sparks !== undefined) u.sparks.value = o.sparks * (m === U.stm ? 0.2 : 1); }
  for (const m of U.mats) { const vis = (o.op ?? 1) > 0.003; m.visible = vis; }
  if (U.pm) { U.pm.opacity = o.pink ?? 0; U.pm.visible = U.pm.opacity > 0.003; U.pm.depthWrite = U.pm.opacity > 0.98; } }
