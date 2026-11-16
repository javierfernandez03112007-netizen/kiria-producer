// ---------------------------------------------------------------- MACRO dentro del agua (estilo «explicador 3D» de las referencias de Javi: el metro por el túnel; de videojuego,
// formas limpias y legibles, luces cálidas con resplandor, nada diminuto ni borroso). Tres paisajes a escala real (cm) dentro de los recipientes de la escena, por
// los que la cámara vuela a ras como por unos raíles:
//  A) el fondo del cazo (frase 5, 20,3–23,5 s, «y las burbujas nacen en las rayitas del fondo»): el esmalte con rayas exageradas (surcos oscuros con el labio
//     brillante); dos rayas largas y paralelas hacen de raíles; en las rayas nacen burbujas que se hinchan, se sueltan y suben;
//  B) el fondo de la taza (frase 6, 26,6–29,4 s, «y si la taza es lisa, la burbuja no tiene dónde nacer»): el esmalte liso como un espejo (refleja de verdad) y
//     una burbuja solitaria con dos ojitos que se desliza buscando una raya, no la encuentra, se encoge y desaparece;
//  C) el palito de madera (frase 10, 45,85–48,1 s, «en sus vetas las burbujas nacen poco a poco»): vetas y poros exagerados, burbujas que nacen en ellos y
//     suben despacio; la cámara baja deslizándose por el palito desde la superficie hasta dentro del agua.
//  D) macWater(on, k): el aspecto bajo el agua (bruma azul clara para todo, cáusticas en los fondos, la superficie vista desde abajo como un techo que brilla y ondula).
// Todo se coloca con las globales de la escena (STOVE_POS + POT_L, POT_R, POT_WY; MUG y la matriz de la taza) en cada fotograma: si se mueven, esto las sigue.
// API: buildMacro(o) → MAC (MAC.groups.pot / .mug / .stick: añadirlos a la escena; o.mug = la taza de la escena, para seguirla) · buildMacStick() → el palito
// (14 × 0,64 × 0,16 cm, centrado, a lo largo de y; lo coloca la escena) · macroAt(t, P) con P = { pot, mug, stick } (0…1: actividad de cada uno; la cámara
// global ya colocada, para ordenar las burbujas) · macCamPot(u), macCamMug(u), macCamStick(u) → [px,py,pz, lx,ly,lz, fov] en el mundo (u 0…1; u = 0 encima
// del agua) · macWater(on, k) (k: 'pot' | 'mug' | 'stick').

const MAC_DEF = { pot: new THREE.Vector3(66.5, -0.7, -5.5), mug: new THREE.Vector3(-6, 5.17, -22.5), mugRot: -0.6 };
// fondos (coordenadas del cazo y de la taza), justo encima de los suyos: el fondo interior del cazo escaneado está en y = 0,598 y es plano hasta r ≈ 5,66
// (luego sube la pared); el de la taza, de 0,62 (centro) a 0,7 (r = 3,1)
const MAC_POTY = 0.615, MAC_POTFR = 5.62, MAC_MUGY = 0.71, MAC_MUGR = 3.08;
const MAC_WATER = new THREE.Color(0.075, 0.25, 0.36), MAC_NEAR = -3, MAC_FAR = 15;  // el tinte del agua (lineal): lineal con la distancia, ya se nota de cerca
let MAC = null, macStickRef = null;
const macPotBase = () => (typeof STOVE_POS !== 'undefined' && typeof POT_L !== 'undefined') ? STOVE_POS.clone().add(POT_L) : MAC_DEF.pot.clone();
const macPotR = () => (typeof POT_R !== 'undefined' ? POT_R : 8.75), macPotW = () => (typeof POT_WY !== 'undefined' ? POT_WY : 8.6), macMugW = () => (typeof MUG !== 'undefined' ? MUG.WY : 7.9);
function macRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- GLSL común: luz del agua, cáusticas, bruma
const MAC_GLSL = `
uniform float uTime, uCaus, uDens; uniform vec3 uWater;
// cáusticas (la red de luz que la superficie ondulada proyecta en el fondo): versión de la «Tileable Water Caustic» clásica
float macCaustic(vec2 p0, float t) {
  vec2 p = mod(p0, 6.2831853) - 250.0, i = p; float c = 1.0, inten = 0.005;
  for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1))); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return min(pow(abs(c), 8.0), 3.0);
}
float macH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float macN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(macH(i), macH(i + vec2(1, 0)), f.x), mix(macH(i + vec2(0, 1)), macH(i + vec2(1, 1)), f.x), f.y); }
// tinte y bruma del agua según la distancia a la cámara (uDens = cuánto del agua: 0 fuera, 1 dentro)
vec3 macFog(vec3 c, float d) { float f = clamp((d + 3.0) / 15.0, 0.0, 0.85) * uDens; return mix(c, uWater, f); }
`;
const MAC_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW, vN, vL;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vL = position; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;

// ---------------------------------------------------------------- A) el fondo del cazo: esmalte con rayas (surcos calculados en el sombreador: canal oscuro, paredes que
// dan sombra y un labio que brilla, como los raíles), cáusticas y bruma. uSeg: los segmentos de las rayas (coordenadas del cazo, xz) y su semiancho.
const MAC_NS = 46;
const MAC_FLOOR_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MAC_GLSL}
uniform vec4 uSeg[${MAC_NS}]; uniform float uSegW[${MAC_NS}]; uniform vec3 uBase;
varying vec3 vW, vN, vL;
void main() {
  #include <logdepthbuf_fragment>
  vec2 p = vW.xz - uBase.xz;
  float best = 1e9; vec2 qn = vec2(0.0, 1.0); float w = 0.05;
  for (int i = 0; i < ${MAC_NS}; i++) { vec4 s = uSeg[i]; vec2 ab = s.zw - s.xy; float h = clamp(dot(p - s.xy, ab) / dot(ab, ab), 0.0, 1.0); vec2 q = p - s.xy - ab * h;
    float d = length(q) / uSegW[i]; if (d < best) { best = d; qn = q; w = uSegW[i]; } }
  vec2 qh = length(qn) > 1e-6 ? normalize(qn) : vec2(0.0, 1.0);
  // perfil: canal (x < 1) de profundidad 0,7·w y labio levantado (1 < x < 1,7)
  float x = best, dh = 0.0, inG = 0.0, lip = 0.0;
  if (x < 1.0) { dh = 2.0 * 0.7 * x; inG = 1.0 - x * x; }
  else if (x < 1.7) { float u = (x - 1.0) / 0.7; dh = 0.22 * 3.14159 / 0.7 * cos(u * 3.14159); lip = sin(u * 3.14159); }
  vec3 N = normalize(vec3(-dh * qh.x, 1.0, -dh * qh.y));
  vec3 V = normalize(cameraPosition - vW), L = normalize(vec3(-0.35, 1.0, 0.45)), H = normalize(L + V);
  // esmalte claro con motas; el canal, oscuro
  float sp = macN(p * 38.0) * 0.6 + macN(p * 91.0) * 0.4;
  vec3 base = vec3(0.62, 0.64, 0.67) * (0.93 + 0.12 * sp);
  base = mix(base, vec3(0.06, 0.07, 0.09), smoothstep(0.0, 0.85, inG) * 0.92);
  float dif = max(dot(N, L), 0.0), amb = 0.35 + 0.25 * N.y;
  vec3 col = base * (vec3(1.0, 0.93, 0.82) * dif * 1.05 + vec3(0.35, 0.55, 0.7) * amb);
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  col += vec3(1.0, 0.9, 0.75) * pow(max(dot(N, H), 0.0), 90.0) * (1.6 + 5.0 * lip) + vec3(0.45, 0.75, 0.95) * F * 0.55 * (1.0 - inG);   // brillo del esmalte y del labio
  col += vec3(1.0, 0.95, 0.8) * lip * 0.22;
  // cáusticas (sobre el esmalte, no dentro del canal)
  col += vec3(1.0, 0.96, 0.85) * macCaustic(p * 1.6, uTime * 0.9) * 0.55 * uCaus * (1.0 - 0.8 * inG);
  gl_FragColor = vec4(macFog(col, length(vW - cameraPosition)), 1.0);
}`;

// ---------------------------------------------------------------- B) el fondo de la taza: esmalte liso, brillante como un espejo (refleja de verdad con un Reflector),
// con un velo blanco cremoso, cáusticas y bruma
const MAC_GLAZE = { name: 'macEsmalte', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 }, uCaus: { value: 0 }, uDens: { value: 0 }, uWater: { value: MAC_WATER } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() { vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; varying vec4 vUv; varying vec3 vW;
${MAC_GLSL}
#include <logdepthbuf_pars_fragment>
void main() {
#include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vW); float F = 0.06 + 0.94 * pow(1.0 - max(V.y, 0.0), 4.0);
  vec3 r = texture2DProj(tDiffuse, vUv).rgb;
  vec3 base = vec3(0.86, 0.84, 0.8) * (vec3(1.0, 0.94, 0.85) * 0.75 + vec3(0.3, 0.5, 0.62) * 0.35);
  vec3 col = mix(base, r, clamp(0.35 + 0.75 * F, 0.0, 0.92));
  col += vec3(1.0, 0.96, 0.85) * macCaustic(vW.xz * 2.4, uTime * 0.9) * 0.35 * uCaus;
  gl_FragColor = vec4(macFog(col, length(vW - cameraPosition)), 1.0);
}` };

// ---------------------------------------------------------------- la superficie del agua vista desde abajo: un techo que brilla y ondula (la ventana de Snell, clara y cálida,
// y fuera de ella el reflejo azul del fondo); solo se ve desde dentro del agua
const MAC_CEIL_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MAC_GLSL}
uniform float uY;
varying vec3 vW, vN, vL;
void main() {
  #include <logdepthbuf_fragment>
  if (cameraPosition.y > uY - 0.01) discard;
  vec3 V = normalize(vW - cameraPosition);
  vec2 rp = vW.xz * 2.2; vec2 g = vec2(sin(rp.x * 1.3 + uTime * 2.1) + sin(rp.y * 1.7 - uTime * 1.6), sin(rp.y * 1.1 + uTime * 1.8) - sin(rp.x * 1.9 - uTime * 1.3)) * 0.09;
  float c = V.y + dot(g, V.xz);                                        // coseno con la vertical, con las ondas
  float win = smoothstep(0.62, 0.72, c);                                // dentro de la ventana de Snell (≈ 48,6°)
  float rip = macCaustic(vW.xz * 1.3, uTime * 1.1);
  vec3 col = mix(vec3(0.12, 0.34, 0.46) * (0.8 + 0.5 * rip), vec3(1.5, 1.42, 1.25) * (0.85 + 0.3 * rip), win);
  col += vec3(0.8, 0.95, 1.0) * smoothstep(0.55, 0.66, c) * (1.0 - win) * 0.6;   // el borde de la ventana, más claro
  gl_FragColor = vec4(macFog(col, length(vW - cameraPosition) * 0.6), 1.0);
}`;

// ---------------------------------------------------------------- burbujas: impostores (esfera exacta, 2 triángulos), transparentes, con el borde plateado, el anillo oscuro de dentro
// y un brillo nítido; prueban la profundidad (el fondo y los surcos las cortan) y se ordenan de atrás adelante
const MAC_BUB_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 iC;
varying vec3 vPos; varying vec4 vC;
void main() {
  vec3 c = (modelViewMatrix * vec4(iC.xyz, 1.0)).xyz; float r = iC.w, D = length(c), R = r * 1.02, hs = R / sqrt(max(1.0 - R * R / (D * D), 0.05)) * 1.06;
  vec3 f = c / D, rt = cross(f, vec3(0.0, 1.0, 0.0)); rt = length(rt) > 1e-3 ? normalize(rt) : vec3(1.0, 0.0, 0.0); vec3 up = cross(rt, f);
  vec3 p = c + (rt * position.x + up * position.y) * hs; vPos = p; vC = vec4(c, r);
  gl_Position = projectionMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
}`;
const MAC_BUB_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MAC_GLSL}
varying vec3 vPos; varying vec4 vC;
void main() {
  vec3 rd = normalize(vPos), c = vC.xyz; float r = vC.w, tc = dot(rd, c), d2 = dot(c, c) - tc * tc;
  if (d2 > r * r) discard;
  vec3 P = rd * (tc - sqrt(r * r - d2)), N = (P - c) / r, Nw = (vec4(N, 0.0) * viewMatrix).xyz, V = -rd;
  float nv = max(dot(N, V), 0.0), e = 1.0 - nv;
  vec3 Lw = normalize(vec3(-0.35, 1.0, 0.45)), R = reflect(-(vec4(V, 0.0) * viewMatrix).xyz, Nw);
  float hl = pow(max(dot(R, Lw), 0.0), 140.0) * 4.0 + pow(max(dot(R, Lw), 0.0), 18.0) * 0.35;
  float ring = smoothstep(0.62, 0.86, e) * (1.0 - smoothstep(0.9, 0.99, e));      // el anillo oscuro de dentro del borde
  float rim = pow(e, 3.0);
  float bot = pow(max(-Nw.y, 0.0), 3.0) * smoothstep(0.2, 0.6, e) * 0.5;            // la luz que la burbuja enfoca abajo
  vec3 col = vec3(0.8, 0.94, 1.0) * rim * 1.1 + vec3(1.0, 0.97, 0.9) * hl + vec3(0.9, 0.97, 1.0) * bot;
  col = mix(col, vec3(0.02, 0.06, 0.09), ring * 0.55);
  float a = clamp(0.1 + 0.75 * rim + ring * 0.35 + hl + bot, 0.0, 1.0);
  col = macFog(col, length(P));
  gl_FragColor = vec4(col, a);
  #ifdef USE_LOGDEPTHBUF
  gl_FragDepth = log2(1.0 + max(-P.z, 1e-4)) * logDepthBufFC * 0.5;
  #endif
}`;
function macBubbles(U, n) {
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const a = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iC', a); g.instanceCount = 0;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: MAC_BUB_VS, fragmentShader: MAC_BUB_FS, transparent: true, depthWrite: false }));
  m.frustumCulled = false; m.renderOrder = 9; m.userData = { a, n, tmp: new Float32Array(n * 4), key: new Float32Array(n), ord: new Uint32Array(n) }; return m;
}
// escribe las burbujas (lista [x,y,z,r] en coordenadas del objeto) ordenadas de atrás adelante según la cámara global
function macBubSet(m, list, cnt) {
  const D = m.userData, e = cam.matrixWorld.elements, cp = cam.position, fx = -e[8], fy = -e[9], fz = -e[10], mw = m.matrixWorld.elements; let k = 0;
  for (let i = 0; i < cnt && i < D.n; i++) { const x = list[i * 4], y = list[i * 4 + 1], z = list[i * 4 + 2];
    const wx = mw[0] * x + mw[4] * y + mw[8] * z + mw[12], wy = mw[1] * x + mw[5] * y + mw[9] * z + mw[13], wz = mw[2] * x + mw[6] * y + mw[10] * z + mw[14];
    D.key[k] = (wx - cp.x) * fx + (wy - cp.y) * fy + (wz - cp.z) * fz; D.ord[k] = i; k++; }
  const sub = D.ord.subarray(0, k); sub.sort((a, b) => D.key[b] - D.key[a]);
  const A = D.a.array; for (let j = 0; j < k; j++) { const s = sub[j] * 4; A[j * 4] = list[s]; A[j * 4 + 1] = list[s + 1]; A[j * 4 + 2] = list[s + 2]; A[j * 4 + 3] = list[s + 3]; }
  D.a.needsUpdate = true; m.geometry.instanceCount = k;
}

// ---------------------------------------------------------------- C) el palito: madera clara con vetas y poros exagerados (calculados en el sombreador a partir de la posición en el
// palito), más oscura y brillante donde está mojada (debajo de la superficie del agua)
const MAC_WOOD_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MAC_GLSL}
uniform float uWY;
varying vec3 vW, vN, vL;
void main() {
  #include <logdepthbuf_fragment>
  vec3 q = vL;                                                    // x: ancho (±0,32), y: largo (±7), z: grosor (±0,08)
  float warp = sin(q.y * 0.45 + q.x * 1.6) * 0.7 + (macN(vec2(q.y * 0.3, q.x * 1.5 + q.z * 3.0)) - 0.5) * 2.6;
  float g = q.x * 7.5 + q.z * 6.0 + warp, band = fract(g);
  float late = smoothstep(0.5, 0.72, band) * (1.0 - smoothstep(0.8, 0.97, band));             // las vetas (madera de verano, oscura), onduladas
  vec3 wood = mix(vec3(0.5, 0.31, 0.15), vec3(0.62, 0.42, 0.22), macN(vec2(q.y * 0.9, g * 0.6)));
  wood *= 0.92 + 0.16 * macN(vec2(q.x * 90.0 + q.z * 60.0, q.y * 1.5));                      // fibras finas a lo largo
  wood = mix(wood, vec3(0.24, 0.12, 0.045), late * 0.88);
  // poros: motas oscuras alargadas (≈ 0,2 × 0,7 mm, exageradas), más en las vetas: ahí nacen las burbujas
  vec2 pc = vec2(q.x * 20.0 + q.z * 14.0, q.y * 5.5); vec2 ci = floor(pc), cf = fract(pc) - 0.5 - (vec2(macH(ci + 3.1), macH(ci + 7.7)) - 0.5) * 0.4;
  float pore = step(macH(ci), 0.22 + 0.45 * late) * (1.0 - smoothstep(0.7, 1.0, length(vec2(cf.x / 0.2, cf.y / 0.24))));
  wood = mix(wood, vec3(0.07, 0.035, 0.015), pore * 0.92);
  float wet = 1.0 - smoothstep(uWY - 0.05, uWY + 0.12, vW.y);
  wood *= 1.0 - 0.32 * wet;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW), L = normalize(vec3(-0.35, 1.0, 0.45)), Hh = normalize(L + V);
  vec3 col = wood * (vec3(1.0, 0.93, 0.82) * (0.25 + 0.85 * max(dot(N, L), 0.0)) + vec3(0.3, 0.45, 0.55) * 0.45);
  col += vec3(1.0, 0.92, 0.8) * pow(max(dot(N, Hh), 0.0), mix(18.0, 70.0, wet)) * mix(0.08, 0.5, wet);
  col += vec3(1.0, 0.95, 0.85) * macCaustic(vW.xz * 2.0 + vW.y * 0.7, uTime * 0.9) * 0.3 * uCaus * wet;
  gl_FragColor = vec4(wet > 0.5 ? macFog(col, length(vW - cameraPosition)) : col, 1.0);
}`;
function buildMacStick() {
  const U = MAC ? MAC.U : macUniforms();
  const geo = new THREE.BoxGeometry(0.64, 14, 0.16, 6, 140, 2);    // (las caras con vértices de sobra por si se dobla o se ilumina por vértice)
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { ...U, uWY: { value: 13.07 } }, vertexShader: MAC_VS, fragmentShader: MAC_WOOD_FS }));
  m.castShadow = true; m.name = 'palito'; macStickRef = m; if (MAC) MAC.stick = m; return m;
}

// ---------------------------------------------------------------- construir
function macUniforms() { return { uTime: { value: 0 }, uCaus: { value: 0 }, uDens: { value: 0 }, uWater: { value: MAC_WATER } }; }
function buildMacro(o = {}) {
  const U = macUniforms(), rng = macRng(20261116);
  const G = { pot: new THREE.Group(), mug: new THREE.Group(), stick: new THREE.Group() };
  G.pot.name = 'macro_cazo'; G.mug.name = 'macro_taza'; G.stick.name = 'macro_palito';
  // ---- A) el cazo (coordenadas del cazo: origen en su base, y hacia arriba)
  const R = MAC_POTFR;
  // las rayas: dos largas y paralelas (los raíles por los que va la cámara) y otras sueltas que se cruzan
  const S0 = new THREE.Vector2(-4.85, 2.3), S1 = new THREE.Vector2(4.8, -1.95), dir = S1.clone().sub(S0).normalize(), nrm = new THREE.Vector2(-dir.y, dir.x), RAIL = 0.36;
  const seg = [], segW = [];
  for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {           // cada raíl en dos tramos con un quiebro mínimo (no es una regla)
    const a = S0.clone().addScaledVector(nrm, sd * RAIL + (k ? 0.03 * sd : 0)).lerp(S1.clone().addScaledVector(nrm, sd * RAIL), k * 0.5);
    const b = S0.clone().addScaledVector(nrm, sd * RAIL).lerp(S1.clone().addScaledVector(nrm, sd * RAIL + 0.02 * sd), 0.5 + k * 0.5);
    seg.push([a.x, a.y, b.x, b.y]); segW.push(0.055); }
  while (seg.length < MAC_NS) { const c = new THREE.Vector2((rng() * 2 - 1) * R * 0.9, (rng() * 2 - 1) * R * 0.9); if (c.length() > R - 0.6) continue;
    const an = rng() * Math.PI, L = 0.6 + 3.4 * Math.pow(rng(), 1.5), d2 = new THREE.Vector2(Math.cos(an), Math.sin(an)).multiplyScalar(L / 2);
    const a = c.clone().sub(d2), b = c.clone().add(d2); if (a.length() > R - 0.2 || b.length() > R - 0.2) continue;
    // que no tape los raíles por delante de la cámara: las que cruzan el pasillo, finas
    seg.push([a.x, a.y, b.x, b.y]); segW.push(0.022 + 0.03 * rng()); }
  const potU = { ...U, uSeg: { value: seg.map(s => new THREE.Vector4(...s)) }, uSegW: { value: segW }, uBase: { value: new THREE.Vector3() } };
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 128), new THREE.ShaderMaterial({ uniforms: potU, vertexShader: MAC_VS, fragmentShader: MAC_FLOOR_FS }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = MAC_POTY; G.pot.add(floor);
  // sitios donde nacen las burbujas: a lo largo de los raíles (uno cada ≈ 0,5 cm) y en las rayas sueltas
  const sites = [];
  for (let s = 0; s < 4; s++) { const [ax, az, bx, bz] = seg[s], L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 0.5);
    for (let k = 0; k < n; k++) { const u = (k + 0.3 + 0.4 * rng()) / n; sites.push({ x: ax + (bx - ax) * u, z: az + (bz - az) * u, w: segW[s], rail: 1 }); } }
  const corr = (x, z) => { const px = x - S0.x, pz = z - S0.y, h = px * dir.x + pz * dir.y; return Math.abs(px * nrm.x + pz * nrm.y) < 0.3 && h > -1 && h < 12; };   // pasillo de la cámara
  for (let s = 4; s < MAC_NS; s++) { const [ax, az, bx, bz] = seg[s], n = 1 + Math.floor(rng() * 2.5); for (let k = 0; k < n; k++) { const u = rng(), x = ax + (bx - ax) * u, z = az + (bz - az) * u;
    if (!corr(x, z)) sites.push({ x, z, w: segW[s], rail: 0 }); } }
  for (const st of sites) { st.per = 0.85 + 0.9 * rng(); st.ph = rng(); st.rmax = (st.rail ? 0.07 : 0.035) + (st.rail ? 0.06 : 0.04) * rng(); st.sw = rng() * 6.28; }
  const potBub = macBubbles(U, sites.length); G.pot.add(potBub);
  const potCeil = new THREE.Mesh(new THREE.CircleGeometry(macPotR() - 0.15, 96), new THREE.ShaderMaterial({ uniforms: { ...U, uY: { value: 0 } }, vertexShader: MAC_VS, fragmentShader: MAC_CEIL_FS, side: THREE.DoubleSide }));
  potCeil.rotation.x = -Math.PI / 2; potCeil.position.y = macPotW(); G.pot.add(potCeil);
  // ---- B) la taza (coordenadas de la taza: origen abajo en el centro)
  const glaze = new Reflector(new THREE.CircleGeometry(MAC_MUGR, 96), { textureWidth: 640, textureHeight: 640, clipBias: 0.002, multisample: 0, shader: MAC_GLAZE });
  glaze.rotation.x = -Math.PI / 2; glaze.position.y = MAC_MUGY; G.mug.add(glaze);
  const gu = glaze.material.uniforms; gu.uTime = U.uTime; gu.uCaus = U.uCaus; gu.uDens = U.uDens; gu.uWater = U.uWater;
  const mugCeil = new THREE.Mesh(new THREE.CircleGeometry((typeof MUG !== 'undefined' ? MUG.rIn(MUG.WY) : 3.87) - 0.02, 96), new THREE.ShaderMaterial({ uniforms: { ...U, uY: { value: 0 } }, vertexShader: MAC_VS, fragmentShader: MAC_CEIL_FS, side: THREE.DoubleSide }));
  mugCeil.rotation.x = -Math.PI / 2; mugCeil.position.y = macMugW(); G.mug.add(mugCeil);
  // la burbuja solitaria con ojitos (una esfera de burbuja + dos ojos de dibujo: blanco, pupila negra y un brillo)
  const hero = new THREE.Group(); G.mug.add(hero);
  const heroBub = macBubbles(U, 1); hero.add(heroBub);
  const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff }), eyeK = new THREE.MeshBasicMaterial({ color: 0x0b0d10 }), eyeH = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const eyes = []; for (const sd of [-1, 1]) { const e = new THREE.Group(), w = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), eyeW); w.scale.set(1, 1.25, 0.45); e.add(w);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), eyeK); p.scale.set(1, 1.15, 0.5); p.position.z = 0.32; e.add(p);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), eyeH); h.position.set(0.22, 0.3, 0.55); e.add(h); e.userData = { p, sd }; hero.add(e); eyes.push(e); }
  // ---- C) el palito y sus burbujas (en el mundo; el palito lo coloca la escena)
  if (!macStickRef) { MAC = { U }; buildMacStick(); }
  else { const su = macStickRef.material.uniforms; for (const k of ['uTime', 'uCaus', 'uDens', 'uWater']) su[k] = U[k]; }      // si se hizo antes: que comparta los uniformes
  const stickBub = macBubbles(U, 90); G.stick.add(stickBub);
  const ssites = []; for (let i = 0; i < 90; i++) { const face = rng() < 0.8 ? (rng() < 0.5 ? 1 : -1) : 0; ssites.push({ x: face ? (rng() - 0.5) * 0.56 : (rng() < 0.5 ? -0.33 : 0.33), y: -7 + 6.2 * rng(),
    z: face ? face * 0.085 : (rng() - 0.5) * 0.12, nx: face ? 0 : Math.sign(rng() - 0.5), nz: face, per: 2.4 + 2.2 * rng(), ph: rng(), rmax: 0.035 + 0.045 * rng(), sw: rng() * 6.28 }); }
  for (const s of ssites) if (!s.nz) s.nx = s.x > 0 ? 1 : -1;
  MAC = { groups: G, U, potU, seg, segW, sites, potBub, potCeil, floor, glaze, mugCeil, hero, heroBub, eyes, stickBub, ssites, stick: macStickRef, mugObj: o.mug || null, rails: { S0, S1, dir, nrm, RAIL },
    list: new Float32Array(Math.max(sites.length, 90) * 4), fog: null };
  macFrames();
  return MAC;
}

// ---------------------------------------------------------------- dónde están (cada fotograma, de las globales de la escena)
function macFrames() {
  const M = MAC, b = macPotBase(); M.groups.pot.position.copy(b); M.potU.uBase.value.copy(b);
  M.potCeil.position.y = macPotW(); M.potCeil.material.uniforms.uY.value = b.y + macPotW();
  if (M.mugObj) { M.mugObj.updateMatrixWorld(); M.mugObj.matrixWorld.decompose(M.groups.mug.position, M.groups.mug.quaternion, M.groups.mug.scale); }
  else { M.groups.mug.position.copy(MAC_DEF.mug); M.groups.mug.rotation.set(0, MAC_DEF.mugRot, 0); }
  M.groups.pot.updateMatrixWorld(true); M.groups.mug.updateMatrixWorld(true);
  M.mugCeil.material.uniforms.uY.value = M.groups.mug.position.y + macMugW();
  if (M.stick) M.stick.material.uniforms.uWY.value = M.groups.mug.position.y + macMugW();
}
const macWaterY = k => k === 'pot' ? MAC.groups.pot.position.y + macPotW() : MAC.groups.mug.position.y + macMugW();

// ---------------------------------------------------------------- D) bajo el agua: bruma azul clara (también para los materiales normales de la escena, con scene.fog), cáusticas
// y el techo. on: 0…1 (0 = fuera del agua); k: 'pot' | 'mug' | 'stick'
function macWater(on, k = 'pot') {
  const M = MAC; on = clamp(on);
  if (on > 0.001) { if (!M.fog) M.fog = new THREE.Fog(MAC_WATER.clone(), MAC_NEAR, MAC_FAR); M.fog.color.copy(MAC_WATER);
    M.fog.near = MAC_NEAR + (1 - on) * 60; M.fog.far = MAC_FAR / 0.85 + (1 - on) * 200; scene.fog = M.fog; }                 // niebla lineal: tiñe ya de cerca
  else if (scene.fog === M.fog) scene.fog = null;
  M.U.uDens.value = on; M.U.uCaus.value = on;
  M.potCeil.visible = on > 0.001 && k === 'pot'; M.mugCeil.visible = on > 0.001 && k !== 'pot';
}

// ---------------------------------------------------------------- un fotograma
function macroAt(t, P = {}) {
  const M = MAC; if (!M) return; macFrames(); M.U.uTime.value = t;
  const pot = clamp(P.pot ?? 0), mug = clamp(P.mug ?? 0), stk = clamp(P.stick ?? 0);
  M.groups.pot.visible = pot > 0.001; M.groups.mug.visible = mug > 0.001; M.groups.stick.visible = stk > 0.001;
  const L = M.list;
  // A) burbujas del cazo: se hinchan dentro de la raya (medio hundidas en el surco), se sueltan y suben haciendo eses
  if (pot > 0.001) { const top = macPotW() - 0.12; let n = 0;
    M.sites.forEach((s, i) => { if ((i * 0.6180339) % 1 > pot) return; const ph = ((t / s.per + s.ph) % 1 + 1) % 1; let x = s.x, z = s.z, y, r;
      if (ph < 0.62) { r = s.rmax * Math.pow(ph / 0.62, 0.55); y = MAC_POTY + r * 0.45; }
      else { const q = (ph - 0.62) / 0.38; r = s.rmax * (1 + 0.35 * q); y = MAC_POTY + s.rmax * 0.6 + q * q * 3.2 + q * 1.2; x += Math.sin(q * 9 + s.sw) * 0.06 * q; z += Math.cos(q * 7 + s.sw) * 0.06 * q; }
      if (r < 0.004 || y > top) return; L[n * 4] = x; L[n * 4 + 1] = y; L[n * 4 + 2] = z; L[n * 4 + 3] = r; n++; });
    macBubSet(M.potBub, L, n); }
  // B) la burbuja con ojitos: se desliza por el esmalte buscando una raya, mira a un lado y a otro, no la encuentra, se encoge y desaparece
  if (mug > 0.001) { const u = clamp(P.mugU ?? mug), r0 = 0.3;
    const path = u2 => { const a = -2.2 + 2.6 * u2; return [Math.cos(a) * 1.4 * (0.6 + 0.4 * u2), Math.sin(a) * 1.1 * (0.6 + 0.4 * u2)]; };
    const um = Math.min(u, 0.62) / 0.62, [hx, hz] = path(sm5(um)), [px2, pz2] = path(sm5(Math.max(0, um - 0.03)));
    const shrink = clamp((u - 0.78) / 0.2), r = r0 * (1 - sm5(shrink)) * (1 + 0.04 * Math.sin(t * 9));
    const sl = um < 1 ? 1 : 0, wob = Math.sin(t * 11) * 0.05 * sl;
    L[0] = hx; L[1] = MAC_MUGY + r * (0.92 + wob); L[2] = hz; L[3] = Math.max(r, 0.0001); macBubSet(M.heroBub, L, r > 0.002 ? 1 : 0);
    // la cara mira a la cámara; los ojos buscan: a un lado y al otro mientras se desliza y al pararse
    const C = new THREE.Vector3().copy(cam.position); M.groups.mug.worldToLocal(C); const cen = v3(hx, MAC_MUGY + r * 0.92, hz), f = C.sub(cen).setY(0.25 * C.y).normalize();
    const look = Math.sin(t * 3.1) * 0.5 * (u > 0.5 && u < 0.85 ? 1.6 : 1), side = v3(f.z, 0, -f.x).normalize();
    M.eyes.forEach(e => { const sd = e.userData.sd, d = f.clone().applyAxisAngle(v3(0, 1, 0), sd * 0.36).add(v3(0, 0.3, 0)).normalize();
      e.position.copy(cen).addScaledVector(d, r * 0.97); e.lookAt(M.groups.mug.localToWorld(e.position.clone().add(d))); e.scale.setScalar(Math.max(0.0001, r * 0.2));
      e.userData.p.position.set(look * 0.3, 0.05 + 0.1 * Math.sin(t * 2.3), 0.32); e.visible = r > 0.01; }); }
  // C) burbujas del palito: nacen en los poros de la parte mojada, crecen despacio, se sueltan y suben tranquilas
  if (stk > 0.001 && M.stick) { const S = M.stick; S.updateMatrixWorld(); const mw = S.matrixWorld, wy = macWaterY('stick'); let n = 0; const p = new THREE.Vector3(), nn = new THREE.Vector3();
    M.ssites.forEach((s, i) => { if ((i * 0.6180339) % 1 > stk) return; p.set(s.x, s.y, s.z).applyMatrix4(mw); if (p.y > wy - 0.15) return;
      nn.set(s.nx, 0, s.nz).transformDirection(mw); const ph = ((t / s.per + s.ph) % 1 + 1) % 1; let r, x, y, z;
      if (ph < 0.7) { r = s.rmax * Math.pow(ph / 0.7, 0.6); x = p.x + nn.x * r * 0.8; y = p.y + nn.y * r * 0.8; z = p.z + nn.z * r * 0.8; }
      else { const q = (ph - 0.7) / 0.3; r = s.rmax * (1 + 0.2 * q); x = p.x + nn.x * (s.rmax * 0.8 + q * 0.25) + Math.sin(q * 6 + s.sw) * 0.04; y = p.y + nn.y * s.rmax + q * q * 1.6 + q * 0.4; z = p.z + nn.z * (s.rmax * 0.8 + q * 0.25); }
      if (y > wy - 0.05 || r < 0.004) return; L[n * 4] = x; L[n * 4 + 1] = y; L[n * 4 + 2] = z; L[n * 4 + 3] = r; n++; });
    macBubSet(M.stickBub, L, n); }
}

// ---------------------------------------------------------------- cámaras (u 0…1; u = 0 por encima del agua, para empalmar)
function macToWorld(G, c) { const p = v3(...c[0]).applyMatrix4(G.matrixWorld), l = v3(...c[1]).applyMatrix4(G.matrixWorld); return [p.x, p.y, p.z, l.x, l.y, l.z, c[2]]; }
// A) baja al fondo del cazo y vuela a ras (≈ 4 mm) entre los dos raíles, con las burbujas naciendo a los lados
function macCamPot(u) {
  const M = MAC; macFrames(); const { S0, S1, dir } = M.rails, y0 = MAC_POTY, W = macPotW();
  const at = (s, h) => [S0.x + dir.x * s, y0 + h, S0.y + dir.y * s];
  const KS = [[0, at(-0.4, W + 2.8), at(2.2, y0)], [0.22, at(0.4, y0 + 0.75), at(3.2, y0 + 0.1)], [0.4, at(1.6, y0 + 0.42), at(4.6, y0 + 0.12)], [1, at(7.9, y0 + 0.38), at(10.9, y0 + 0.14)]];
  const T = KS.map(k => k[0]), comp = (j, c) => mono(clamp(u), T, KS.map(k => k[j][c]));
  return macToWorld(M.groups.pot, [[comp(1, 0), comp(1, 1), comp(1, 2)], [comp(2, 0), comp(2, 1), comp(2, 2)], 54 - 6 * clamp(1 - u / 0.3)]);
}
// B) entra en la taza, baja al esmalte y sigue a la burbuja a ras (≈ 5 mm)
function macCamMug(u) {
  const M = MAC; macFrames(); const W = macMugW(), y0 = MAC_MUGY;
  const KS = [[0, [2.2, W + 3.2, 2.4], [0.4, y0, -0.2]], [0.25, [1.6, y0 + 1.1, 2.3], [-0.2, y0 + 0.2, -0.4]], [0.6, [0.4, y0 + 0.5, 2.2], [-0.4, y0 + 0.25, -0.5]], [1, [-1.2, y0 + 0.42, 1.9], [0.3, y0 + 0.25, -0.6]]];
  const T = KS.map(k => k[0]), comp = (j, c) => mono(clamp(u), T, KS.map(k => k[j][c]));
  return macToWorld(M.groups.mug, [[comp(1, 0), comp(1, 1), comp(1, 2)], [comp(2, 0), comp(2, 1), comp(2, 2)], 50]);
}
// C) baja deslizándose por el palito, de fuera del agua a dentro, mirando su cara
function macCamStick(u) {
  const M = MAC; macFrames(); const S = M.stick; S.updateMatrixWorld(); const mw = S.matrixWorld, wy = macWaterY('stick');
  const ax = v3(0, 1, 0).transformDirection(mw), nz = v3(0, 0, 1).transformDirection(mw), c0 = v3(0, 0, 0).applyMatrix4(mw);
  const sw = Math.abs(ax.y) > 1e-3 ? (wy - c0.y) / ax.y : 0;                 // dónde cruza el palito la superficie (a lo largo del eje)
  const s = mono(clamp(u), [0, 0.35, 1], [sw + 2.6, sw + 0.4, sw - 2.3]), d = mono(clamp(u), [0, 1], [1.5, 0.75]);
  const p = c0.clone().addScaledVector(ax, s).addScaledVector(nz, d).add(v3(0, 0.15, 0)), l = c0.clone().addScaledVector(ax, s - 1.1 - 0.4 * u);
  return [p.x, p.y, p.z, l.x, l.y, l.z, 50];
}
