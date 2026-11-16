// ---------------------------------------------------------------- las moléculas de agua, por dentro (frase 4, 13,9–18,5 s: «El agua intenta seguirlas: sus moléculas giran sin
// parar, y eso es calor»). La cámara, metida en el agua de la taza a escala molecular: cientos de moléculas de H₂O en bolas y varillas (el oxígeno rojo y los
// dos hidrógenos blancos a 104,5°, con barniz brillante, reflejos de dos cajas de luz y sombra de contacto) dentro de un volumen de agua azul oscura con
// profundidad de campo (las de delante y las del fondo desenfocadas), partículas en suspensión y dispersión azulada.
// El campo de las microondas oscila (MOL_NU veces por segundo en pantalla; el de verdad, 2.450 millones de veces, no se vería): un pulso de luz fría barre el
// volumen de arriba abajo con cada cresta y las partículas en suspensión se mecen a un lado y al otro con él (la dirección del campo que se invierte).
// Las moléculas son dipolos (el lado del oxígeno, negativo; el de los hidrógenos, positivo): intentan seguir el campo y giran a un lado y al otro, con un poco
// de retraso (ese retraso es justo lo que calienta), cada vez más agitadas; se van encendiendo con un brillo naranja que crece («y eso es calor») y los
// enlaces de hidrógeno (puntos tenues entre una molécula y la de al lado) se rompen y se rehacen.
// Cómo se dibuja: «impostores». Cada átomo es un cuadrado de 2 triángulos y el sombreador calcula la esfera exacta (rayo-esfera), su profundidad (logarítmica,
// como el resto de la escena) y su desenfoque según la distancia al foco (el disco borroso de verdad: solape de dos círculos); las varillas, igual, con un
// cilindro. Todo va en un solo InstancedMesh ordenado de atrás adelante en cada fotograma (≈ 10 triángulos por molécula). Unidades propias: 1 ≈ 1,5 Å
// (una molécula mide ≈ 1,4 × 0,8). El grupo está lejos de la cocina (MOL_ORIGIN) y una esfera de agua profunda tapa el fondo de la cocina.
// API: buildMolecules() → MOL (MOL.group ya colocado: hay que añadirlo a la escena); moleculesAt(t, P) con P = { on, field, heat } (0…1; opcionales:
// focus = distancia de enfoque, cam = cámara con la que se ordena, por defecto la global `cam`, que tiene que estar ya colocada); moleculesCam(u) →
// [px,py,pz, lx,ly,lz, fov] en el mundo (u 0…1); MOL.heroAt() → { O, H1, H2, p } de la molécula protagonista en el mundo (para rótulos δ−/δ+ del HUD).

const MOL_ORIGIN = new THREE.Vector3(0, 2000, 0);
const MOL_NU = 2.0;                                                         // Hz en pantalla: 4 inversiones del campo por segundo
const MOL_LAMBDA = 22;                                                      // longitud de la onda en pantalla (unidades): el pulso cruza la imagen en ≈ 0,15 s
const MOL_K = new THREE.Vector3(0.22, -1, -0.32).normalize();               // hacia dónde viaja la onda: de arriba abajo, alejándose un poco
const MOL_E = new THREE.Vector3(1, 0, 0).addScaledVector(MOL_K, -MOL_K.x).normalize();   // el campo eléctrico (perpendicular a la onda: casi horizontal)
const MOL_DOF = 170, MOL_DOFMAX = 70;                                       // abertura (px de 1920 · unidades) y desenfoque máximo (px)
const MOL_FOG = 0.042;                                                      // extinción del agua por unidad
// la molécula (centro de masas en el origen; el dipolo, del oxígeno hacia los hidrógenos, es +y)
const MOL_M = (() => {
  const L = 0.68, a = 104.5 * Math.PI / 180, hx = L * Math.sin(a / 2), hy = L * Math.cos(a / 2), yo = -hy / 9;   // 16·yO + 2·(yO + hy) = 0
  return { L, rO: 0.25, rH: 0.155, rS: 0.058, O: new THREE.Vector3(0, yo, 0), H1: new THREE.Vector3(-hx, yo + hy, 0), H2: new THREE.Vector3(hx, yo + hy, 0) };
})();
// cámara: entra todavía avanzando (viene de acercarse a la superficie del agua), rodea despacio a la protagonista y al final empieza a salir
const MOL_CAMK = [[0, [1.5, 0.85, 11.2], [0.16, 0.06, 0], 42], [0.25, [0.75, 0.42, 6.5], [0.03, 0.02, 0], 42], [0.56, [-1.35, 0.22, 6.0], [-0.06, 0.0, 0], 42],
  [0.8, [-2.0, 0.75, 7.9], [-0.22, 0.08, -0.2], 43], [1, [-3.1, 1.9, 14.5], [-0.65, 0.22, -1.2], 44]];
let MOL = null;

function molRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function molRandQuat(r) { const u1 = r(), u2 = r() * 2 * Math.PI, u3 = r() * 2 * Math.PI, a = Math.sqrt(1 - u1), b = Math.sqrt(u1); return new THREE.Quaternion(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)); }
const molSs = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function molCamLocal(u) { return camKeys(clamp(u), MOL_CAMK); }
function moleculesCam(u) { const c = molCamLocal(u), o = MOL ? MOL.group.position : MOL_ORIGIN; return [c.p.x + o.x, c.p.y + o.y, c.p.z + o.z, c.l.x + o.x, c.l.y + o.y, c.l.z + o.z, c.f]; }

// ---------------------------------------------------------------- GLSL común: profundidad, agua, pulso del campo, luz
const MOL_GLSL = `
uniform vec3 uKey, uKeyU, uRim, uRimU, uKeyCol, uRimCol, uWaveK, uE, uOrig;
uniform float uTime, uPhase, uKappa, uField, uHeat, uOn, uFogK;
uniform vec2 uPz;
float molDepth(float zv) {
#ifdef USE_LOGDEPTHBUF
  return log2(1.0 + zv) * logDepthBufFC * 0.5;
#else
  return 0.5 * ((uPz.x * -zv + uPz.y) / zv) + 0.5;
#endif
}
// pulso del campo en un punto (sin^8 de la fase): una cresta que barre el volumen
float molPulse(vec3 pl) { float s = sin(uPhase - uKappa * dot(pl, uWaveK)); s *= s; s *= s; return s * s; }
// el mismo pulso promediado a lo largo de un tramo del rayo (serie de Fourier de sin^8 con cada armónico atenuado por el promedio)
float molPulseAvg(float xi, float sxi) {
  float ph = uPhase - uKappa * xi, g = uKappa * sxi, g2 = g * g;
  return (70.0 - 112.0 * exp(-2.0 * g2) * cos(2.0 * ph) + 56.0 * exp(-8.0 * g2) * cos(4.0 * ph) - 16.0 * exp(-18.0 * g2) * cos(6.0 * ph) + 2.0 * exp(-32.0 * g2) * cos(8.0 * ph)) / 256.0;
}
// el color del agua profunda en una dirección: más clara hacia arriba y hacia la luz de contra (dispersión hacia delante); se templa con el calor
vec3 molWaterCol(vec3 d) {
  vec3 c = mix(vec3(0.0008, 0.0032, 0.0075), vec3(0.0055, 0.024, 0.047), smoothstep(-0.8, 0.9, d.y));
  float f = max(dot(d, uRim), 0.0);
  c += vec3(0.010, 0.038, 0.066) * pow(f, 5.0) + vec3(0.0025, 0.011, 0.02) * f * f;
  c += vec3(0.020, 0.0065, 0.0012) * uHeat * (0.45 + 0.55 * smoothstep(-0.6, 0.6, d.y));
  return c;
}
// luz que dispersa el agua entre la cámara (o, local) y un punto a distancia D en la dirección d; T = lo que pasa del objeto
vec3 molWater(vec3 o, vec3 d, float D, out float T) {
  float sg = uFogK * (1.0 + 10.0 * (1.0 - uOn) * (1.0 - uOn));
  T = exp(-sg * D);
  float m = 1.0 / sg - (T > 1e-6 ? D * T / max(1.0 - T, 1e-5) : 0.0);          // dónde pesa más el tramo (media de la exponencial truncada)
  float pa = molPulseAvg(dot(o + d * m, uWaveK), abs(dot(d, uWaveK)) * m * 0.85 + 0.4);
  return (1.0 - T) * (molWaterCol(d) + vec3(0.010, 0.030, 0.056) * uField * pa);
}
// caja de luz (rectángulo de bordes suaves) vista en el reflejo R
float molBox(vec3 R, vec3 L, vec3 U, vec2 sz, float soft) {
  float w = dot(R, L); if (w < 0.05) return 0.0;
  vec2 q = abs(vec2(dot(R, U), dot(R, cross(L, U))) / w);
  vec2 e = 1.0 - smoothstep(sz - soft, sz + soft, q);
  return e.x * e.y;
}
vec3 molEnv(vec3 R, float soft) {
  return molWaterCol(R) * 2.2 + uKeyCol * 3.4 * molBox(R, uKey, uKeyU, vec2(0.36, 0.25), soft) + uRimCol * 2.6 * molBox(R, uRim, uRimU, vec2(0.62, 0.13), soft);
}
`;

// ---------------------------------------------------------------- impostores: átomos (esferas), varillas (cilindros) y los puntos de los enlaces de hidrógeno
// iA: esfera → centro + radio · varilla → extremo del oxígeno + radio · punto → centro + radio
// iB: esfera → vecino 1 + tipo · varilla → extremo del hidrógeno + tipo · punto → (0) + tipo        (tipo: 0 oxígeno, 1 hidrógeno, 2 varilla, 3 punto)
// iC: esfera → vecino 2 + calor · varilla → (0) + calor · punto → (0) + opacidad
const MOL_IMP_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 iA, iB, iC;
uniform float uFocus, uDofK, uDofMax, uResY;
varying vec3 vPos, vB, vC; varying vec4 vA, vI;
void main() {
  float ty = iB.w, r = iA.w;
  vec3 a = (modelViewMatrix * vec4(iA.xyz, 1.0)).xyz, b = (modelViewMatrix * vec4(iB.xyz, 1.0)).xyz, c = (modelViewMatrix * vec4(iC.xyz, 1.0)).xyz;
  bool stick = ty > 1.5 && ty < 2.5;
  vec3 ctr = stick ? (a + b) * 0.5 : a;
  float z = max(-ctr.z, 0.05);
  float px = z * 2.0 / (projectionMatrix[1][1] * uResY);                                   // un píxel, en unidades, a esa distancia
  float coc = min(uDofK * abs(1.0 / uFocus - 1.0 / z), uDofMax) * uResY / 1920.0;          // radio del desenfoque (px)
  float bw = (coc + 0.75) * px;                                                            // … en unidades (con el antialias)
  vec3 p;
  if (!stick) {
    float R = r + bw, D = length(a), hs = R / sqrt(max(1.0 - R * R / (D * D), 0.04)) * 1.04;
    vec3 f = a / D, rt = cross(f, vec3(0.0, 1.0, 0.0)); rt = length(rt) > 1e-3 ? normalize(rt) : vec3(1.0, 0.0, 0.0); vec3 up = cross(rt, f);
    p = a + (rt * position.x + up * position.y) * hs;
  } else {
    vec3 ax = b - a; float L = length(ax); vec3 ah = ax / max(L, 1e-5);
    vec3 sd = cross(ah, normalize(ctr)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
    float w = (r + bw) * 1.3;
    p = (position.x < 0.0 ? a - ah * w : b + ah * w) + sd * position.y * w;
  }
  vPos = p; vA = vec4(a, r); vB = b; vC = c; vI = vec4(ty, iC.w, bw, px);
  gl_Position = projectionMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
}`;
const MOL_IMP_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MOL_GLSL}
uniform float uRO, uRH, uRS;
varying vec3 vPos, vB, vC; varying vec4 vA, vI;
// área común de dos círculos de radios r y b con los centros a distancia d (el disco borroso de una esfera: su cobertura exacta)
float molOverlap(float d, float r, float b) {
  if (d >= r + b) return 0.0;
  if (d <= abs(r - b)) { float m = min(r, b); return PI * m * m; }
  float d2 = d * d, r2 = r * r, b2 = b * b;
  return r2 * acos(clamp((d2 + r2 - b2) / (2.0 * d * r), -1.0, 1.0)) + b2 * acos(clamp((d2 + b2 - r2) / (2.0 * d * b), -1.0, 1.0))
    - 0.5 * sqrt(max((-d + r + b) * (d + r - b) * (d - r + b) * (d + r + b), 0.0));
}
// oclusión de una esfera (centro c, radio r) sobre un punto p con normal n
float molOccS(vec3 p, vec3 n, vec3 c, float r) { vec3 di = c - p; float l = length(di); float h = l / r; return clamp(max(dot(n, di / l), 0.0) / (h * h), 0.0, 1.0); }
// … y de una varilla (segmento a-b de radio r): como la esfera más cercana del segmento
float molOccC(vec3 p, vec3 n, vec3 a, vec3 b, float r) { vec3 ab = b - a; float s = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return molOccS(p, n, a + ab * s, r * 1.15); }
// la luz sobre la superficie (todo en el mundo): difusa envolvente, subsuperficie, brillo ancho, barniz con el reflejo nítido de las cajas de luz y fresnel
vec3 molShade(vec3 N, vec3 V, vec3 alb, float rough, float coat, float sss, float soft) {
  float NV = max(dot(N, V), 0.0), F = 0.04 + 0.96 * pow(1.0 - NV, 5.0);
  float k1 = dot(N, uKey), k2 = dot(N, uRim);
  vec3 dif = uKeyCol * max((k1 + 0.3) / 1.3, 0.0) + uRimCol * 0.5 * max((k2 + 0.15) / 1.15, 0.0);
  dif += uKeyCol * sss * smoothstep(-0.55, 0.05, k1) * (1.0 - smoothstep(0.05, 0.6, k1));          // el terminador se aclara (luz que entra y sale)
  vec3 amb = mix(vec3(0.010, 0.026, 0.045), vec3(0.045, 0.10, 0.16), N.y * 0.5 + 0.5);
  vec3 c = alb * (dif + amb) * (1.0 - F * coat);
  float a = rough * rough, a2 = a * a;
  vec3 H1 = normalize(uKey + V), H2 = normalize(uRim + V);
  float d1 = max(dot(N, H1), 0.0), d2 = max(dot(N, H2), 0.0);
  float D1 = a2 / (PI * pow(d1 * d1 * (a2 - 1.0) + 1.0, 2.0)), D2 = a2 / (PI * pow(d2 * d2 * (a2 - 1.0) + 1.0, 2.0));
  c += (uKeyCol * D1 * max(k1, 0.0) + uRimCol * D2 * max(k2, 0.0) * 0.7) * 0.06;
  c += molEnv(reflect(-V, N), soft) * F * coat;
  return c;
}
void main() {
  vec3 rd = normalize(vPos);
  float ty = vI.x, bw = vI.z, px = vI.w, kb = max(bw - px, 0.0);
  vec3 N, P, alb; float alpha, glow = 0.0, ao = 1.0, rough = 0.42, coat = 1.0, sss = 0.0, lit = 1.0;
  if (ty > 2.5) {                       // punto de un enlace de hidrógeno: una motita de luz
    vec3 c = vA.xyz; float r = vA.w, tc = dot(rd, c), d = sqrt(max(dot(c, c) - tc * tc, 0.0));
    alpha = molOverlap(d, r, bw) / (PI * bw * bw) * vI.y;
    if (alpha < 0.004) discard;
    P = rd * tc; N = -rd; alb = vec3(0.0); lit = 0.0;
  } else if (ty < 1.5) {                // átomo: esfera exacta, desenfocada con su disco
    vec3 c = vA.xyz; float r = vA.w, tc = dot(rd, c), d = sqrt(max(dot(c, c) - tc * tc, 0.0));
    alpha = molOverlap(d, r, bw) / (PI * bw * bw);
    if (alpha < 0.004) discard;
    vec3 sd = d > 1e-6 ? (rd * tc - c) / d : vec3(0.0);
    float de = min(d * r / (r + kb * 0.85 + px * 0.5), r * 0.999);                          // con desenfoque, el sombreado se estira al disco
    N = normalize(sd * de - rd * sqrt(r * r - de * de));
    P = c + N * r;
    bool isO = ty < 0.5;
    alb = isO ? vec3(0.36, 0.016, 0.014) : vec3(0.74, 0.76, 0.79);
    rough = isO ? 0.36 : 0.42; sss = isO ? 0.18 : 0.32; glow = vI.y;
    // sombra de contacto: el otro átomo cercano y las varillas que salen de este
    float rr1 = isO ? uRH : uRO;
    ao = 1.0 - 0.85 * molOccS(P, N, vB, rr1) - 0.25 * molOccS(P, N, vC, uRH);
    ao -= 0.9 * molOccC(P, N, c, vB, uRS) + (isO ? 0.9 * molOccC(P, N, c, vC, uRS) : 0.0);
    ao = clamp(ao, 0.25, 1.0);
  } else {                                // varilla: cilindro exacto entre el oxígeno (A) y el hidrógeno (B)
    vec3 A = vA.xyz, B = vB; float r = vA.w, L = length(B - A); vec3 ah = (B - A) / L;
    float bb = dot(rd, ah), dd = dot(rd, -A), ee = dot(ah, -A), den = max(1.0 - bb * bb, 1e-5);
    float tR = (bb * ee - dd) / den, sA = (ee - bb * dd) / den;
    vec3 q = rd * tR - (A + ah * sA); float d = length(q);
    float R = r + kb * 0.85 + px * 0.5;
    alpha = clamp((min(d + bw, r) - max(d - bw, -r)) / (2.0 * bw), 0.0, 1.0) * min(1.0, r / max(bw, 1e-5) * 1.2);
    alpha *= smoothstep(-bw, bw * 0.5, sA) * smoothstep(-bw, bw * 0.5, L - sA);
    if (alpha < 0.004) discard;
    vec3 qh = d > 1e-6 ? q / d : vec3(0.0); vec3 vv = normalize(-rd + ah * bb);
    float de = min(d * r / R, r * 0.999);
    N = normalize(qh * (de / r) + vv * sqrt(1.0 - (de / r) * (de / r)));
    P = A + ah * clamp(sA, 0.0, L) + N * r;
    float hs = smoothstep(0.42, 0.58, sA / L);                                                  // mitad roja (oxígeno) y mitad blanca (hidrógeno)
    alb = mix(vec3(0.30, 0.014, 0.012), vec3(0.70, 0.72, 0.75), hs);
    rough = 0.38; sss = 0.15; glow = vI.y;
    ao = clamp(1.0 - 0.9 * molOccS(P, N, A, uRO) - 0.9 * molOccS(P, N, B, uRH), 0.3, 1.0);
  }
  // al mundo (las direcciones del grupo son las del mundo)
  vec3 Nw = (vec4(N, 0.0) * viewMatrix).xyz, Vw = (vec4(-rd, 0.0) * viewMatrix).xyz, Dw = -Vw;
  vec3 Pl = cameraPosition + (vec4(P, 0.0) * viewMatrix).xyz - uOrig, Ol = cameraPosition - uOrig;
  float soft = 0.035 + kb / max(vA.w, 0.02) * 0.35;
  vec3 col;
  if (lit > 0.5) {
    col = molShade(Nw, Vw, alb, mix(rough, 0.8, clamp(soft * 1.5, 0.0, 1.0)), coat, sss, soft) * ao;
    // el pulso del campo, al pasar, ilumina las moléculas con luz fría (sobre todo por arriba y en los bordes)
    float NV = max(dot(Nw, Vw), 0.0), pl = molPulse(Pl) * uField;
    col += vec3(0.16, 0.42, 0.85) * pl * (0.10 + 0.9 * pow(1.0 - NV, 3.0) + 0.35 * max(dot(Nw, -uWaveK), 0.0)) * ao;
    // calor: brillo naranja desde dentro (más en el centro del disco, como una brasa)
    vec3 hot = ty < 0.5 ? vec3(1.0, 0.25, 0.045) : (ty < 1.5 ? vec3(1.0, 0.46, 0.16) : vec3(1.0, 0.34, 0.08));
    col += hot * glow * (0.35 + 0.95 * pow(NV, 0.7)) * 2.1;
  } else col = vec3(0.55, 0.85, 1.0) * 1.3;
  float T, D = length(P);
  vec3 ins = molWater(Ol, Dw, D, T);
  col = col * T + ins;
  alpha *= smoothstep(0.0, 0.35, uOn);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  gl_FragDepth = molDepth(-P.z);
}`;

// ---------------------------------------------------------------- fondo: esfera de agua profunda alrededor de todo (tapa la cocina)
const MOL_BG_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`;
const MOL_BG_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MOL_GLSL}
varying vec3 vW;
float molH3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float molN3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(molH3(i), molH3(i + vec3(1, 0, 0)), f.x), mix(molH3(i + vec3(0, 1, 0)), molH3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(molH3(i + vec3(0, 0, 1)), molH3(i + vec3(1, 0, 1)), f.x), mix(molH3(i + vec3(0, 1, 1)), molH3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
void main() {
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vW - cameraPosition), Ol = cameraPosition - uOrig;
  float T; vec3 c = molWater(Ol, d, 1e6, T);
  // nubes muy suaves de luz dispersa (el volumen no es plano)
  float n = molN3(d * 2.6 + vec3(0.0, uTime * 0.03, uTime * 0.02)) * 0.65 + molN3(d * 6.1 - vec3(uTime * 0.02, 0.0, 0.0)) * 0.35;
  c *= 0.78 + 0.5 * n;
  gl_FragColor = vec4(c, 1.0);
}`;

// ---------------------------------------------------------------- partículas en suspensión: motitas que flotan, se mecen con el campo (a un lado y al otro) y dejan un trazo
// corto según se mueven; desenfocadas son discos (bokeh)
const MOL_MOTE_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 iM;
uniform vec3 uWaveK, uE, uOrig;
uniform float uTime, uPhase, uKappa, uOmega, uField, uHeat, uOn, uFogK, uFocus, uDofK, uDofMax, uTau, uMoteA;
uniform vec2 uRes;
varying vec2 vQ; varying float vA, vL, vR; varying vec3 vCol;
vec3 molMote(vec3 b, float sd, float T) {
  vec3 dr = vec3(sin(T * 0.23 + sd * 61.0), sin(T * 0.19 + sd * 37.0), sin(T * 0.21 + sd * 17.0)) * 0.16;
  float ph = uPhase - uOmega * (uTime - T) - uKappa * dot(b, uWaveK);
  return b + dr - uE * (uMoteA * uField * (0.6 + 0.8 * fract(sd * 7.31)) * cos(ph));           // velocidad ∝ campo → posición ∝ −cos(fase)
}
void main() {
  vec3 b = iM.xyz; float sd = iM.w;
  vec4 a = modelViewMatrix * vec4(molMote(b, sd, uTime), 1.0), q = modelViewMatrix * vec4(molMote(b, sd, uTime - uTau), 1.0);
  float z = -a.z;
  if (z < 0.4 || -q.z < 0.3) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vA = 0.0; return; }
  vec4 pa = projectionMatrix * a, pq = projectionMatrix * q;
  vec2 sa = pa.xy / pa.w * uRes * 0.5, sq = pq.xy / pq.w * uRes * 0.5;
  float k = uRes.y / 1920.0, core = (0.9 + 1.9 * sd * sd) * k, coc = min(uDofK * abs(1.0 / uFocus - 1.0 / z), uDofMax) * k, R = core + coc;
  vec2 dv = sa - sq; float L = min(length(dv), 300.0 * k); vec2 dir = L > 0.01 ? normalize(dv) : vec2(1.0, 0.0), nr = vec2(-dir.y, dir.x);
  vec2 s = (position.x < 0.0 ? sq - dir * R : sq + dir * (L + R)) + nr * position.y * R;
  vQ = vec2(position.x < 0.0 ? -R : L + R, position.y * R); vL = L; vR = R;
  gl_Position = vec4(s / (uRes * 0.5) * pa.w, pa.z, pa.w);
  #include <logdepthbuf_vertex>
  float sg = uFogK * (1.0 + 10.0 * (1.0 - uOn) * (1.0 - uOn));
  float pulse = pow(sin(uPhase - uKappa * dot(b, uWaveK)), 8.0) * uField;
  vA = (0.10 + 0.22 * fract(sd * 13.7)) * (core * core) / (R * R) * (2.0 * R / (2.0 * R + L)) * exp(-sg * z) * (1.0 + 2.2 * pulse) * uOn;
  vCol = mix(vec3(0.62, 0.84, 1.0), vec3(1.0, 0.62, 0.34), uHeat * 0.55 * fract(sd * 5.3));
}`;
const MOL_MOTE_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
varying vec2 vQ; varying float vA, vL, vR; varying vec3 vCol;
void main() {
  #include <logdepthbuf_fragment>
  if (vA < 0.0005) discard;
  float al = clamp(vQ.x, 0.0, vL), dist = length(vec2(vQ.x - al, vQ.y)) / vR;
  float pr = (1.0 - smoothstep(0.8, 1.0, dist)) * (0.82 + 0.18 * smoothstep(0.5, 0.92, dist));   // disco con el borde un poco más claro (bokeh)
  float a = pr * vA; if (a < 0.0004) discard;
  gl_FragColor = vec4(vCol, a);
}`;

// ---------------------------------------------------------------- dónde está cada molécula (y cómo mira al empezar)
function molLayout(rng) {
  const path = []; for (let i = 0; i <= 160; i++) path.push(molCamLocal(i / 160));
  const pos = [], quat = [];
  // la protagonista en el centro: el oxígeno arriba y los hidrógenos abajo (dipolo hacia abajo, de cara a la cámara): con el campo casi horizontal gira
  // en el plano de la imagen, a un lado y al otro, como un péndulo
  pos.push(new THREE.Vector3(0, 0, 0)); quat.push(new THREE.Quaternion(0, 0, 1, 0).multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), 0.25)));
  const hero = (k) => MOL_M[k].clone().applyQuaternion(quat[0]).add(pos[0]);
  // dos vecinas con enlace de hidrógeno: una recibe el hidrógeno de la protagonista y otra le da uno a su oxígeno
  { const H = hero('H2'), O = hero('O'), dir = H.clone().sub(O).normalize(), c = H.clone().addScaledVector(dir, 1.3 + MOL_M.L * 0.1);
    pos.push(c); const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir.clone().add(v3(0.3, -0.2, -0.5)).normalize()); quat.push(q); }
  { const O = hero('O'), dir = v3(-0.55, 0.8, -0.35).normalize(), c = O.clone().addScaledVector(dir, 1.3 + MOL_M.L);
    pos.push(c); const vloc = MOL_M.H1.clone().sub(MOL_M.O).normalize(), q = new THREE.Quaternion().setFromUnitVectors(vloc, dir.clone().negate());
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, 1.1)); quat.push(q); }
  const s = 2.7;
  for (let z = -50; z < 16; z += s) for (let y = -24; y < 24; y += s) for (let x = -19; x < 19; x += s) {
    const p = v3(x + s * (0.12 + rng() * 0.76), y + s * (0.12 + rng() * 0.76), z + s * (0.12 + rng() * 0.76));
    const d = 14 - p.z; if (d < 0) continue;
    if (Math.abs(p.x + 0.9) > 4 + 0.3 * d || Math.abs(p.y - 0.4) > 4.5 + 0.46 * d) continue;
    if (p.length() < 2.2 || pos.slice(1, 3).some(o => o.distanceTo(p) < 2.0)) continue;
    let ok = true;
    for (let i = 0; i < path.length && ok; i++) {
      const c = path[i].p; if (c.distanceTo(p) < 2.5) { ok = false; break; }
      if (i % 2 === 0) {                                  // línea de visión de la cámara a la protagonista: siempre despejada
        const l = path[i].l, cl = l.clone().sub(c), tt = clamp(p.clone().sub(c).dot(cl) / cl.lengthSq());
        if (tt > 0.04 && tt < 0.9 && c.clone().addScaledVector(cl, tt).distanceTo(p) < 1.3) ok = false;
      }
    }
    if (ok) { pos.push(p); quat.push(molRandQuat(rng)); }
  }
  // enlaces de hidrógeno: muchas moléculas apuntan uno de sus hidrógenos al oxígeno de la vecina más cercana (la red del agua)
  const n = pos.length;
  for (let i = 3; i < n; i++) {
    if (rng() > 0.62) continue;
    let bj = -1, bd = 3.5; for (let j = 0; j < n; j++) { if (j === i) continue; const dd = pos[i].distanceTo(pos[j]); if (dd < bd) { bd = dd; bj = j; } }
    if (bj < 0) continue;
    const dir = pos[bj].clone().sub(pos[i]).normalize(), vloc = (rng() < 0.5 ? MOL_M.H1 : MOL_M.H2).clone().sub(MOL_M.O).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(vloc, dir); q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir, rng() * 6.283)); quat[i] = q;
  }
  return { pos, quat };
}

// ---------------------------------------------------------------- construir
function buildMolecules() {
  const rng = molRng(161120);
  const g = new THREE.Group(); g.name = 'moleculas'; g.position.copy(MOL_ORIGIN);
  const { pos, quat } = molLayout(rng), n = pos.length;
  // datos de cada molécula: posición y orientación de partida, eje y amplitud del giro (dipolo × campo), retraso, agitación térmica, calor propio
  const D = { n, pos: new Float32Array(n * 3), q0: new Float32Array(n * 4), ax: new Float32Array(n * 3), amp: new Float32Array(n), lag: new Float32Array(n),
    tf: new Float32Array(n * 6), jf: new Float32Array(n * 6), hot: new Float32Array(n), xi: new Float32Array(n) };
  const _p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    pos[i].toArray(D.pos, i * 3); D.q0[i * 4] = quat[i].x; D.q0[i * 4 + 1] = quat[i].y; D.q0[i * 4 + 2] = quat[i].z; D.q0[i * 4 + 3] = quat[i].w;
    _p.set(0, 1, 0).applyQuaternion(quat[i]);                       // dipolo (del oxígeno, −, hacia los hidrógenos, +)
    const ax = _p.clone().cross(MOL_E), sa = ax.length();             // el par de fuerzas gira el dipolo hacia el campo alrededor de dipolo × campo
    if (sa < 0.05) ax.set(0, 0, 1).cross(_p); ax.normalize(); ax.toArray(D.ax, i * 3);
    D.amp[i] = Math.sqrt(Math.max(sa, 0.12)) * (0.8 + 0.4 * rng());
    D.lag[i] = 0.32 + 0.3 * rng();                                   // retraso de fase (rad): intentan seguirlo y no llegan
    for (let k = 0; k < 3; k++) { D.tf[i * 6 + k] = (0.55 + 1.6 * rng()) * 2 * Math.PI; D.tf[i * 6 + 3 + k] = rng() * 6.283; D.jf[i * 6 + k] = (0.5 + 1.3 * rng()) * 2 * Math.PI; D.jf[i * 6 + 3 + k] = rng() * 6.283; }
    D.hot[i] = 0.6 + 0.4 * rng(); D.xi[i] = pos[i].dot(MOL_K);
  }
  D.amp[0] = 1.0; D.lag[0] = 0.4; D.hot[0] = 0.9;
  // candidatos a enlace de hidrógeno: el hidrógeno de una molécula cerca del oxígeno de otra y casi en línea con su enlace O–H
  const bonds = [], at = (i, k) => MOL_M[k].clone().applyQuaternion(quat[i]).add(pos[i]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j || pos[i].distanceToSquared(pos[j]) > 3.6 * 3.6) continue;
    const Oi = at(i, 'O'), Oj = at(j, 'O');
    for (const k of ['H1', 'H2']) { const H = at(i, k), d = H.distanceTo(Oj), c = H.clone().sub(Oi).normalize().dot(Oj.clone().sub(H).normalize());
      if (d < 2.8 && c > 0.8) bonds.push({ i, h: k === 'H1' ? 1 : 2, j, d0: d }); }
  }
  // uniformes compartidos (las tres capas leen los mismos objetos)
  const key = v3(-0.62, 0.62, 0.48).normalize(), rim = v3(0.46, 0.42, -0.78).normalize();
  const U = { uKey: { value: key }, uKeyU: { value: key.clone().cross(v3(0, 0, 1)).normalize() }, uRim: { value: rim }, uRimU: { value: rim.clone().cross(v3(0, 1, 0)).normalize() },
    uKeyCol: { value: new THREE.Color(1.0, 0.94, 0.86).multiplyScalar(1.15) }, uRimCol: { value: new THREE.Color(0.55, 0.8, 1.0).multiplyScalar(1.0) },
    uWaveK: { value: MOL_K.clone() }, uE: { value: MOL_E.clone() }, uOrig: { value: g.position.clone() },
    uTime: { value: 0 }, uPhase: { value: 0 }, uKappa: { value: 2 * Math.PI / MOL_LAMBDA }, uOmega: { value: 2 * Math.PI * MOL_NU }, uField: { value: 0 }, uHeat: { value: 0 }, uOn: { value: 1 },
    uFogK: { value: MOL_FOG }, uPz: { value: new THREE.Vector2() }, uFocus: { value: 7 }, uDofK: { value: MOL_DOF }, uDofMax: { value: MOL_DOFMAX }, uResY: { value: H * PR },
    uRes: { value: new THREE.Vector2(W * PR, H * PR) }, uRO: { value: MOL_M.rO }, uRH: { value: MOL_M.rH }, uRS: { value: MOL_M.rS }, uTau: { value: 0.11 }, uMoteA: { value: 0.2 } };
  const setPz = (r, s, camera) => { const e = camera.projectionMatrix.elements; U.uPz.value.set(e[10], e[14]); };
  // fondo
  const bg = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_BG_VS, fragmentShader: MOL_BG_FS, side: THREE.BackSide, depthWrite: true }));
  bg.frustumCulled = false; bg.renderOrder = -100; g.add(bg);
  // impostores
  const MAXP = n * 5 + 8000, quad = new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3);
  const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute('position', quad); geo.setIndex([0, 1, 2, 0, 2, 3]);
  const attr = k => { const a = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); return a; };
  const aA = attr('iA'), aB = attr('iB'), aC = attr('iC'); geo.instanceCount = 0;
  const imp = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_IMP_VS, fragmentShader: MOL_IMP_FS, transparent: true, depthWrite: true, depthTest: true }));
  imp.frustumCulled = false; imp.renderOrder = 10; imp.onBeforeRender = setPz; g.add(imp);
  // partículas en suspensión
  const NM = 1100, mg = new THREE.InstancedBufferGeometry(); mg.setAttribute('position', quad); mg.setIndex([0, 1, 2, 0, 2, 3]);
  const M4 = new Float32Array(NM * 4), path = []; for (let i = 0; i <= 60; i++) path.push(molCamLocal(i / 60).p);
  for (let i = 0; i < NM; i++) { let p; do { p = v3(-10 + 18 * rng(), -9 + 19 * rng(), -30 + 46 * rng()); } while (path.some(c => c.distanceTo(p) < 0.9)); M4.set([p.x, p.y, p.z, rng()], i * 4); }
  mg.setAttribute('iM', new THREE.InstancedBufferAttribute(M4, 4)); mg.instanceCount = NM;
  const motes = new THREE.Mesh(mg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_MOTE_VS, fragmentShader: MOL_MOTE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; motes.renderOrder = 11; g.add(motes);
  MOL = { group: g, D, bonds, U, imp, geo, attrs: [aA, aB, aC], motes, bg, MAXP, n,
    tmp: { A: new Float32Array(MAXP * 4), B: new Float32Array(MAXP * 4), C: new Float32Array(MAXP * 4), key: new Float32Array(MAXP), ord: new Uint32Array(MAXP) },
    atoms: new Float32Array(n * 9), vis: new Uint8Array(n), hero: { O: v3(0, 0, 0), H1: v3(0, 0, 0), H2: v3(0, 0, 0), p: v3(0, -1, 0) }, fieldValue: 0, E: MOL_E.clone(), K: MOL_K.clone(),
    heroAt() { return this.hero; } };
  return MOL;
}

// ---------------------------------------------------------------- un fotograma
// cuaternión por vector de giro (ángulo · eje) y producto, en números sueltos (sin crear objetos en el bucle)
function molQRot(wx, wy, wz, out) { const a = Math.hypot(wx, wy, wz); if (a < 1e-9) { out[0] = out[1] = out[2] = 0; out[3] = 1; return out; } const s = Math.sin(a / 2) / a; out[0] = wx * s; out[1] = wy * s; out[2] = wz * s; out[3] = Math.cos(a / 2); return out; }
function molQMul(a, b, o) { const x = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], y = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], z = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], w = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]; o[0] = x; o[1] = y; o[2] = z; o[3] = w; return o; }
function molQApply(q, v, o, k) { const tx = 2 * (q[1] * v.z - q[2] * v.y), ty = 2 * (q[2] * v.x - q[0] * v.z), tz = 2 * (q[0] * v.y - q[1] * v.x);
  o[k] = v.x + q[3] * tx + q[1] * tz - q[2] * ty; o[k + 1] = v.y + q[3] * ty + q[2] * tx - q[0] * tz; o[k + 2] = v.z + q[3] * tz + q[0] * ty - q[1] * tx; }
const _molQ = [[0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1]], _molV = new Float32Array(9);

function moleculesAt(t, P = {}) {
  const M = MOL; if (!M) return;
  const on = clamp(P.on ?? 1), field = clamp(P.field ?? 0), heat = clamp(P.heat ?? 0);
  M.group.visible = on > 0.001; if (!M.group.visible) return;
  const D = M.D, n = D.n, U = M.U, o = M.group.position;
  // la cámara con la que se ordena y se desenfoca (la global, ya colocada para este fotograma)
  const C = P.cam || cam; C.updateMatrixWorld(); const e = C.matrixWorld.elements;
  const cx = e[12] - o.x, cy = e[13] - o.y, cz = e[14] - o.z, fx = -e[8], fy = -e[9], fz = -e[10], rx = e[0], ry = e[1], rz = e[2], ux = e[4], uy = e[5], uz = e[6];
  const tv = Math.tan((C.fov || 40) * Math.PI / 360), th = tv * (C.aspect || W / H);
  const omega = 2 * Math.PI * MOL_NU, kap = 2 * Math.PI / MOL_LAMBDA, Phi = omega * t;
  const swing = (0.62 + 0.38 * heat) * field;                          // amplitud del giro (rad) para amp = 1: ≈ 36° → 57°
  const tAmp = 0.06 + 0.5 * heat, jAmp = 0.025 + 0.15 * heat;           // agitación térmica: giro (rad) y temblor (unidades)
  const A = M.tmp.A, B = M.tmp.B, Cc = M.tmp.C, key = M.tmp.key, ord = M.tmp.ord, at = M.atoms;
  let np = 0;
  const push = (ax, ay, az, aw, bx, by, bz, bw, ccx, ccy, ccz, cw) => {
    const k = np * 4; A[k] = ax; A[k + 1] = ay; A[k + 2] = az; A[k + 3] = aw; B[k] = bx; B[k + 1] = by; B[k + 2] = bz; B[k + 3] = bw; Cc[k] = ccx; Cc[k + 1] = ccy; Cc[k + 2] = ccz; Cc[k + 3] = cw;
    const mx = bw === 2 ? (ax + bx) / 2 : ax, my = bw === 2 ? (ay + by) / 2 : ay, mz = bw === 2 ? (az + bz) / 2 : az;
    key[np] = (mx - cx) * fx + (my - cy) * fy + (mz - cz) * fz; np++;
  };
  const qs = _molQ[0], qt = _molQ[1], q0 = _molQ[2], qq = _molQ[3];
  for (let i = 0; i < n; i++) {
    const i3 = i * 3, i6 = i * 6;
    // giro: el dipolo intenta seguir al campo (a un lado y al otro, con retraso) + la agitación del calor
    const ef = Math.sin(Phi - kap * D.xi[i] - D.lag[i]);
    molQRot(D.ax[i3] * swing * D.amp[i] * ef, D.ax[i3 + 1] * swing * D.amp[i] * ef, D.ax[i3 + 2] * swing * D.amp[i] * ef, qs);
    molQRot(tAmp * Math.sin(D.tf[i6] * t + D.tf[i6 + 3]), tAmp * Math.sin(D.tf[i6 + 1] * t + D.tf[i6 + 4]), tAmp * Math.sin(D.tf[i6 + 2] * t + D.tf[i6 + 5]), qt);
    q0[0] = D.q0[i * 4]; q0[1] = D.q0[i * 4 + 1]; q0[2] = D.q0[i * 4 + 2]; q0[3] = D.q0[i * 4 + 3];
    molQMul(qt, molQMul(qs, q0, qq), qq);
    const px = D.pos[i3] + jAmp * Math.sin(D.jf[i6] * t + D.jf[i6 + 3]), py = D.pos[i3 + 1] + jAmp * Math.sin(D.jf[i6 + 1] * t + D.jf[i6 + 4]), pz = D.pos[i3 + 2] + jAmp * Math.sin(D.jf[i6 + 2] * t + D.jf[i6 + 5]);
    molQApply(qq, MOL_M.O, _molV, 0); molQApply(qq, MOL_M.H1, _molV, 3); molQApply(qq, MOL_M.H2, _molV, 6);
    for (let k = 0; k < 9; k += 3) { at[i * 9 + k] = px + _molV[k]; at[i * 9 + k + 1] = py + _molV[k + 1]; at[i * 9 + k + 2] = pz + _molV[k + 2]; }
    if (i === 0) { M.hero.O.set(at[0], at[1], at[2]).add(o); M.hero.H1.set(at[3], at[4], at[5]).add(o); M.hero.H2.set(at[6], at[7], at[8]).add(o);
      M.hero.p.set(0, 1, 0).applyQuaternion(new THREE.Quaternion(qq[0], qq[1], qq[2], qq[3])); M.fieldValue = field * Math.sin(Phi - kap * D.xi[0]); }
    // ¿se ve? (cono de la cámara con margen)
    const dx = px - cx, dy = py - cy, dz = pz - cz, zc = dx * fx + dy * fy + dz * fz;
    const vis = zc > 0.25 && Math.abs(dx * rx + dy * ry + dz * rz) < zc * th + 2.2 && Math.abs(dx * ux + dy * uy + dz * uz) < zc * tv + 2.2;
    M.vis[i] = vis ? 1 : 0; if (!vis) continue;
    // calor propio: crece con el calor y late un poco con cada giro (cuanto más rápido gira, más se calienta)
    const glow = heat * D.hot[i] * (0.82 + 0.18 * Math.abs(Math.cos(Phi - kap * D.xi[i] - D.lag[i])));
    const b = i * 9, Ox = at[b], Oy = at[b + 1], Oz = at[b + 2], H1x = at[b + 3], H1y = at[b + 4], H1z = at[b + 5], H2x = at[b + 6], H2y = at[b + 7], H2z = at[b + 8];
    push(Ox, Oy, Oz, MOL_M.rO, H1x, H1y, H1z, 0, H2x, H2y, H2z, glow);
    push(H1x, H1y, H1z, MOL_M.rH, Ox, Oy, Oz, 1, H2x, H2y, H2z, glow);
    push(H2x, H2y, H2z, MOL_M.rH, Ox, Oy, Oz, 1, H1x, H1y, H1z, glow);
    push(Ox, Oy, Oz, MOL_M.rS, H1x, H1y, H1z, 2, 0, 0, 0, glow);
    push(Ox, Oy, Oz, MOL_M.rS, H2x, H2y, H2z, 2, 0, 0, 0, glow);
  }
  // enlaces de hidrógeno: puntos tenues entre el hidrógeno de una y el oxígeno de la otra; se rompen al girar o separarse y se rehacen al volver
  for (const bd of M.bonds) {
    if (!M.vis[bd.i] || !M.vis[bd.j] || np > M.MAXP - 20) continue;
    const hb = bd.i * 9 + bd.h * 3, ob = bd.j * 9, oi = bd.i * 9;
    const Hx = at[hb], Hy = at[hb + 1], Hz = at[hb + 2], Ox = at[ob], Oy = at[ob + 1], Oz = at[ob + 2];
    let vx = Ox - Hx, vy = Oy - Hy, vz = Oz - Hz; const d = Math.hypot(vx, vy, vz); vx /= d; vy /= d; vz /= d;
    let wx = Hx - at[oi], wy = Hy - at[oi + 1], wz = Hz - at[oi + 2]; const wl = Math.hypot(wx, wy, wz); wx /= wl; wy /= wl; wz /= wl;
    const s = (1 - molSs(bd.d0 + 0.08, bd.d0 + 0.5, d)) * molSs(0.8, 0.94, vx * wx + vy * wy + vz * wz);
    if (s < 0.03) continue;
    const a0 = MOL_M.rH + 0.07, a1 = d - MOL_M.rO - 0.07, nd = Math.max(3, Math.round((a1 - a0) / 0.15));
    for (let k = 0; k <= nd; k++) { const u = a0 + (a1 - a0) * k / nd; push(Hx + vx * u, Hy + vy * u, Hz + vz * u, 0.024, 0, 0, 0, 3, 0, 0, 0, s * 0.75); }
  }
  // de atrás adelante (para que los desenfoques se mezclen bien) y a la GPU
  for (let i = 0; i < np; i++) ord[i] = i;
  const sub = ord.subarray(0, np); sub.sort((a, b) => key[b] - key[a]);
  const [aA, aB, aC] = M.attrs, dA = aA.array, dB = aB.array, dC = aC.array;
  for (let k = 0; k < np; k++) { const s = sub[k] * 4, d = k * 4; for (let c = 0; c < 4; c++) { dA[d + c] = A[s + c]; dB[d + c] = B[s + c]; dC[d + c] = Cc[s + c]; } }
  for (const a of M.attrs) { a.clearUpdateRanges(); a.addUpdateRange(0, np * 4); a.needsUpdate = true; }
  M.geo.instanceCount = np; M.np = np;
  // uniformes
  const hx = at[0] - cx, hy = at[1] - cy, hz = at[2] - cz;
  U.uFocus.value = P.focus ?? Math.max(1, hx * fx + hy * fy + hz * fz);
  U.uTime.value = t; U.uPhase.value = Phi; U.uField.value = field; U.uHeat.value = heat; U.uOn.value = on; U.uOrig.value.copy(o);
  U.uResY.value = H * PR; U.uRes.value.set(W * PR, H * PR);
}
