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
const MOL_LAMBDA = 16;                                                      // longitud de la onda en pantalla (unidades): el pulso cruza la imagen en ≈ 0,15 s
const MOL_K = new THREE.Vector3(0.22, -1, -0.32).normalize();               // hacia dónde viaja la onda: de arriba abajo, alejándose un poco
const MOL_E = new THREE.Vector3(1, 0, 0).addScaledVector(MOL_K, -MOL_K.x).normalize();   // el campo eléctrico (perpendicular a la onda: casi horizontal)
const MOL_DOF = 300, MOL_DOFMAX = 90;                                       // abertura (px de 1920 · unidades) y desenfoque máximo (px)
const MOL_FOG = 0.072;                                                      // extinción del agua por unidad
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
// pulso del campo en un punto (sin^16 de la fase): una cresta estrecha que barre el volumen
float molPulse(vec3 pl) { float s = sin(uPhase - uKappa * dot(pl, uWaveK)); s *= s; s *= s; s *= s; return s * s; }
// luz del pulso dispersada a lo largo del rayo, exacta: ∫ σ e^(−σs) sin^16(fase(s)) ds de 0 a D, con sin^16 = Σ a_k cos(2kφ) (6 armónicos;
// el 7.º y el 8.º no se notan) y cada término integrado con una exponencial compleja. Así la lámina de luz se ve barrer la imagen con su perspectiva.
float molPulseScatter(float xi0, float beta, float D, float sg) {
  float th = uPhase - uKappa * xi0, Dm = min(D, 60.0 / sg), eD = exp(-sg * Dm);
  float res = 0.196381 * (1.0 - eD);
  for (int k = 1; k <= 6; k++) {
    float fk = float(k), ak = k == 1 ? -0.349121 : (k == 2 ? 0.244385 : (k == 3 ? -0.133301 : (k == 4 ? 0.055542 : (k == 5 ? -0.017090 : 0.003662))));
    float wk = 2.0 * fk * uKappa * beta, tk = 2.0 * fk * th;
    vec2 ome = vec2(1.0 - eD * cos(wk * Dm), eD * sin(wk * Dm)), iz = vec2(sg, -wk) / (sg * sg + wk * wk);
    vec2 q = vec2(ome.x * iz.x - ome.y * iz.y, ome.x * iz.y + ome.y * iz.x) * sg;
    res += ak * (cos(tk) * q.x - sin(tk) * q.y);
  }
  return max(res, 0.0);
}
// el color del agua profunda en una dirección: más clara hacia arriba y hacia la luz de contra (dispersión hacia delante); se templa con el calor
vec3 molWaterCol(vec3 d) {
  vec3 c = mix(vec3(0.0005, 0.0032, 0.0052), vec3(0.0032, 0.022, 0.034), smoothstep(-0.8, 0.9, d.y));
  float f = max(dot(d, uRim), 0.0);
  c += vec3(0.006, 0.036, 0.05) * pow(f, 5.0) + vec3(0.0015, 0.010, 0.015) * f * f;
  c = mix(c, vec3(0.0075, 0.0034, 0.0016) * (0.55 + 0.6 * smoothstep(-0.7, 0.7, d.y)) + vec3(0.010, 0.004, 0.001) * pow(f, 3.0), 0.4 * uHeat);   // el agua se templa
  return c * (1.0 + 2.2 * (1.0 - uOn));
}
// luz que dispersa el agua entre la cámara (o, local) y un punto a distancia D en la dirección d; T = lo que pasa del objeto
float molSg() { return uFogK * (1.0 + 10.0 * (1.0 - uOn) * (1.0 - uOn)); }
vec3 molTrans(float D) { return exp(-molSg() * D * vec3(1.2, 1.0, 0.98)); }        // el agua se come antes el rojo: lo lejano se oscurece y se enfría
vec3 molWater(vec3 o, vec3 d, float D, out vec3 T) {
  float sg = molSg();
  T = molTrans(D);
  float pa = molPulseScatter(dot(o, uWaveK), dot(d, uWaveK), D, sg);
  return (1.0 - T) * molWaterCol(d) + vec3(0.013, 0.062, 0.094) * uField * pa;
}
// caja de luz (rectángulo de bordes suaves) vista en el reflejo R
float molBox(vec3 R, vec3 L, vec3 U, vec2 sz, float soft) {
  float w = dot(R, L); if (w < 0.05) return 0.0;
  vec2 q = abs(vec2(dot(R, U), dot(R, cross(L, U))) / w);
  vec2 e = 1.0 - smoothstep(sz - soft, sz + soft, q);
  return e.x * e.y * sz.x * sz.y / ((sz.x + soft) * (sz.y + soft));          // borrosa, más grande pero igual de energía
}
vec3 molEnv(vec3 R, float soft) {
  return molWaterCol(R) * 2.2 + uKeyCol * 3.6 * molBox(R, uKey, uKeyU, vec2(0.5, 0.34), soft + 0.1) + uRimCol * 2.8 * molBox(R, uRim, uRimU, vec2(0.7, 0.12), soft + 0.03);
}
`;

// ---------------------------------------------------------------- impostores: átomos (esferas), varillas (cilindros) y los puntos de los enlaces de hidrógeno
// Tipos: 0 oxígeno, 1 hidrógeno, 2 varilla, 3 punto de luz (motas en suspensión y puntos de los enlaces de hidrógeno), 4 halo (luz alrededor de una molécula caliente).
// iA: esfera/punto/halo → centro + radio · varilla → extremo del oxígeno + radio
// iB: esfera → vecino 1 + tipo · varilla → extremo del hidrógeno + tipo · punto/halo → color + tipo
// iC: esfera → vecino 2 + calor · varilla → (0) + calor · punto/halo → (0) + intensidad
// iD: esfera/punto → su centro al abrir el obturador (desenfoque de movimiento) · varilla → lo que se mueve su centro durante el obturador · halo → su centro
// Se dibujan de atrás adelante con mezcla premultiplicada (los puntos y halos suman: alfa 0) y sin escribir profundidad (solo se prueba contra el fondo y la
// escena): las varillas se recortan justo donde salen de cada esfera, así el orden basta y no hay cortes rectos en los bordes desenfocados.
const MOL_IMP_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 iA, iB, iC, iD;
uniform float uFocus, uDofK, uDofMax, uResY;
varying vec3 vPos, vB, vC, vD; varying vec4 vA, vI;
void main() {
  float ty = iB.w, r = iA.w;
  vec3 a = (modelViewMatrix * vec4(iA.xyz, 1.0)).xyz, b = (modelViewMatrix * vec4(iB.xyz, 1.0)).xyz, c = (modelViewMatrix * vec4(iC.xyz, 1.0)).xyz;
  bool stick = ty > 1.5 && ty < 2.5;
  vec3 a0 = stick ? a : (modelViewMatrix * vec4(iD.xyz, 1.0)).xyz, mv = stick ? mat3(modelViewMatrix) * iD.xyz : a - a0;
  vec3 ctr = stick ? (a + b) * 0.5 : (a + a0) * 0.5;
  float z = max(-ctr.z, 0.05);
  float px = z * 2.0 / (projectionMatrix[1][1] * uResY);                                   // un píxel, en unidades, a esa distancia
  float coc = min(uDofK * abs(1.0 / uFocus - 1.0 / z), uDofMax) * uResY / 1920.0;          // radio del desenfoque (px)
  float bw = (coc + 0.75) * px;                                                            // … en unidades (con el antialias)
  vec3 p;
  if (!stick) {                       // esfera (o su barrido): cuadrado de cara a la cámara en el centro del recorrido
    float R = r + bw + 0.5 * length(mv), D = length(ctr), hs = R / sqrt(max(1.0 - R * R / (D * D), 0.04)) * 1.04;
    vec3 f = ctr / D, rt = cross(f, vec3(0.0, 1.0, 0.0)); rt = length(rt) > 1e-3 ? normalize(rt) : vec3(1.0, 0.0, 0.0); vec3 up = cross(rt, f);
    p = ctr + (rt * position.x + up * position.y) * hs;
  } else {                            // varilla: cuadrado a lo largo del eje, ensanchado con su movimiento
    vec3 ax = b - a; float L = length(ax); vec3 ah = ax / max(L, 1e-5);
    vec3 sd = cross(ah, normalize(ctr)); float sl = length(sd); sd = sl > 1e-4 ? sd / sl : vec3(1.0, 0.0, 0.0);
    float w = (r + bw + 0.5 * length(mv - ah * dot(mv, ah))) * 1.3;
    p = (position.x < 0.0 ? a - ah * w : b + ah * w) + sd * position.y * w;
  }
  vPos = p; vA = vec4(a, r); vB = ty > 2.5 ? iB.xyz : b; vC = c; vD = stick ? mv : a0; vI = vec4(ty, iC.w, bw, px);
  gl_Position = projectionMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
}`;
const MOL_IMP_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
${MOL_GLSL}
uniform float uRO, uRH, uRS;
varying vec3 vPos, vB, vC, vD; varying vec4 vA, vI;
// área común de dos círculos de radios r y b con los centros a distancia d (el disco borroso de una esfera: su cobertura exacta)
float molOverlap(float d, float r, float b) {
  if (d >= r + b) return 0.0;
  if (d <= abs(r - b)) { float m = min(r, b); return PI * m * m; }
  float d2 = d * d, r2 = r * r, b2 = b * b;
  return r2 * acos(clamp((d2 + r2 - b2) / (2.0 * d * r), -1.0, 1.0)) + b2 * acos(clamp((d2 + b2 - r2) / (2.0 * d * b), -1.0, 1.0))
    - 0.5 * sqrt(max((-d + r + b) * (d + r - b) * (d - r + b) * (d + r + b), 0.0));
}
// cobertura de una esfera de radio r desenfocada (bw) y barrida de c0 a c1 durante el obturador (media de 4 posiciones);
// en c deja el centro donde el rayo pasa más cerca (ahí se sombrea)
float molSphCov(vec3 rd, vec3 c1, vec3 c0, float r, float bw, float px, out vec3 c) {
  vec3 mv = c1 - c0; float alpha;
  if (length(mv) > 0.3 * px) {
    alpha = 0.0;
    for (int i = 0; i < 4; i++) { vec3 ci = c0 + mv * ((float(i) + 0.5) * 0.25); float ti = dot(rd, ci); alpha += molOverlap(sqrt(max(dot(ci, ci) - ti * ti, 0.0)), r, bw); }
    alpha *= 0.25 / (PI * bw * bw);
    float rm = dot(rd, mv), Aq = dot(mv, mv) - rm * rm, Bq = dot(c0, mv) - dot(rd, c0) * rm;
    c = c0 + mv * clamp(Aq > 1e-12 ? -Bq / Aq : 1.0, 0.0, 1.0);
  } else { c = c1; float tc = dot(rd, c); alpha = molOverlap(sqrt(max(dot(c, c) - tc * tc, 0.0)), r, bw) / (PI * bw * bw); }
  return alpha;
}
// oclusión de una esfera (centro c, radio r) sobre un punto p con normal n
float molOccS(vec3 p, vec3 n, vec3 c, float r) { vec3 di = c - p; float l = length(di); float h = l / r; return clamp(max(dot(n, di / l), 0.0) / (h * h), 0.0, 1.0); }
// … y de una varilla (segmento a-b de radio r): como la esfera más cercana del segmento
float molOccC(vec3 p, vec3 n, vec3 a, vec3 b, float r) { vec3 ab = b - a; float s = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return molOccS(p, n, a + ab * s, r * 1.15); }
// la luz sobre la superficie (todo en el mundo): difusa envolvente, subsuperficie, brillo ancho, barniz con el reflejo nítido de las cajas de luz y fresnel
vec3 molShade(vec3 N, vec3 V, vec3 alb, float rough, float coat, float sss, float soft, out vec3 spec) {
  float NV = max(dot(N, V), 0.0), F = 0.04 + 0.96 * pow(1.0 - NV, 5.0);
  float k1 = dot(N, uKey), k2 = dot(N, uRim);
  vec3 dif = uKeyCol * max((k1 + 0.2) / 1.2, 0.0) + uRimCol * 0.65 * max((k2 + 0.1) / 1.1, 0.0);
  dif += uKeyCol * sss * smoothstep(-0.55, 0.05, k1) * (1.0 - smoothstep(0.05, 0.6, k1));          // el terminador se aclara (luz que entra y sale)
  vec3 amb = mix(vec3(0.004, 0.014, 0.02), vec3(0.022, 0.068, 0.095), N.y * 0.5 + 0.5);
  vec3 c = alb * (dif + amb) * (1.0 - F * coat);
  float a = rough * rough, a2 = a * a; spec = vec3(0.0);
  vec3 H1 = normalize(uKey + V), H2 = normalize(uRim + V);
  float d1 = max(dot(N, H1), 0.0), d2 = max(dot(N, H2), 0.0);
  float D1 = a2 / (PI * pow(d1 * d1 * (a2 - 1.0) + 1.0, 2.0)), D2 = a2 / (PI * pow(d2 * d2 * (a2 - 1.0) + 1.0, 2.0));
  spec = (uKeyCol * D1 * max(k1, 0.0) + uRimCol * D2 * max(k2, 0.0) * 0.7) * 0.06 + molEnv(reflect(-V, N), soft) * F * coat;
  return c;
}
void main() {
  vec3 rd = normalize(vPos);
  float ty = vI.x, bw = vI.z, px = vI.w, kb = max(bw - px, 0.0);
  vec3 N, P, alb; float alpha, glow = 0.0, ao = 1.0, rough = 0.42, coat = 1.0, sss = 0.0;
  float onk = smoothstep(0.0, 0.35, uOn);
  if (ty > 3.5) {                         // halo: la luz que el agua dispersa alrededor de una molécula caliente (suma: alfa 0 con la mezcla premultiplicada)
    vec3 c = vA.xyz; float r = vA.w + bw, tc = dot(rd, c), d = sqrt(max(dot(c, c) - tc * tc, 0.0)), q = d / r;
    float k = exp(-3.4 * q * q) * (1.0 - smoothstep(0.75, 1.0, q));
    if (k < 0.002) discard;
    gl_FragColor = vec4(vB * vI.y * k * molTrans(length(c)) * onk, 0.0);
    gl_FragDepth = molDepth(-c.z);
    return;
  }
  if (ty > 2.5) {                         // punto de luz (mota o enlace): esfera emisiva diminuta, desenfocada y barrida (suma)
    vec3 c; float a = molSphCov(rd, vA.xyz, vD, vA.w, bw, px, c) * vI.y;
    if (a < 0.0015) discard;
    gl_FragColor = vec4(vB * a * molTrans(length(c)) * onk, 0.0);
    gl_FragDepth = molDepth(-c.z);
    return;
  }
  if (ty < 1.5) {                         // átomo: esfera exacta, desenfocada con su disco y barrida con su movimiento
    vec3 c; float r = vA.w;
    alpha = molSphCov(rd, vA.xyz, vD, r, bw, px, c);
    if (alpha < 0.004) discard;
    float tc = dot(rd, c), d = sqrt(max(dot(c, c) - tc * tc, 0.0));
    vec3 sd = d > 1e-6 ? (rd * tc - c) / d : vec3(0.0);
    float de = min(d * r / (r + kb * 0.85 + px * 0.5), r * 0.999);                          // con desenfoque, el sombreado se estira al disco
    N = normalize(sd * de - rd * sqrt(r * r - de * de));
    P = c + N * r;
    bool isO = ty < 0.5;
    alb = isO ? vec3(0.30, 0.012, 0.011) : vec3(0.72, 0.74, 0.77);
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
    float R = r + kb * 0.85 + px * 0.5, bwm = bw + 0.5 * length(vD - ah * dot(vD, ah));        // + lo que se mueve de lado durante el obturador
    alpha = clamp((min(d + bwm, r) - max(d - bwm, -r)) / (2.0 * bwm), 0.0, 1.0);
    float sO = sqrt(max(uRO * uRO - r * r, 0.0)), sH = L - sqrt(max(uRH * uRH - r * r, 0.0));           // donde sale de cada esfera
    alpha *= smoothstep(sO - bwm * 0.5, sO + bwm * 0.5, sA) * (1.0 - smoothstep(sH - bwm * 0.5, sH + bwm * 0.5, sA));
    if (alpha < 0.004) discard;
    vec3 qh = d > 1e-6 ? q / d : vec3(0.0); vec3 vv = normalize(-rd + ah * bb);
    float de = min(d * r / R, r * 0.999);
    N = normalize(qh * (de / r) + vv * sqrt(1.0 - (de / r) * (de / r)));
    P = A + ah * clamp(sA, 0.0, L) + N * r;
    float hs = smoothstep(0.3, 0.7, sA / L);                                                    // mitad roja (oxígeno) y mitad blanca (hidrógeno)
    alb = mix(vec3(0.21, 0.009, 0.009), vec3(0.68, 0.70, 0.73), hs);
    rough = 0.38; sss = 0.15; glow = vI.y;
    ao = clamp(1.0 - 0.9 * molOccS(P, N, A, uRO) - 0.9 * molOccS(P, N, B, uRH), 0.3, 1.0);
  }
  // al mundo (las direcciones del grupo son las del mundo)
  vec3 Nw = (vec4(N, 0.0) * viewMatrix).xyz, Vw = (vec4(-rd, 0.0) * viewMatrix).xyz, Dw = -Vw;
  vec3 Pl = cameraPosition + (vec4(P, 0.0) * viewMatrix).xyz - uOrig, Ol = cameraPosition - uOrig;
  float soft = 0.035 + kb / max(vA.w, 0.02) * 0.35;
  vec3 col;
  {
    vec3 spec; col = molShade(Nw, Vw, alb, mix(rough, 0.8, clamp(soft * 1.5, 0.0, 1.0)), coat, sss, soft, spec) * ao;
    // el pulso del campo, al pasar, ilumina las moléculas con luz fría (sobre todo por arriba y en los bordes)
    float NV = max(dot(Nw, Vw), 0.0), pl = molPulse(Pl) * uField;
    col += vec3(0.3, 0.78, 1.0) * pl * pow(1.0 - NV, 2.5) * (0.55 + 0.6 * max(dot(Nw, -uWaveK), 0.0)) * ao * (1.0 - 0.7 * glow);   // solo en el borde: el cuerpo no cambia de color
    // calor: brilla desde dentro como el metal al rojo: el núcleo amarillo-naranja (al final pasa del umbral del resplandor) y el borde rojo oscuro;
    // la difusa se apaga y el barniz sigue reflejando las cajas de luz
    vec3 core = ty < 0.5 ? vec3(1.0, 0.33, 0.05) : (ty < 1.5 ? vec3(1.0, 0.6, 0.24) : vec3(1.0, 0.4, 0.09));
    float pr = pow(NV, 1.2);
    col = col * (1.0 - 0.65 * glow) + spec * ao * (1.0 - 0.3 * glow);
    col += mix(vec3(0.62, 0.06, 0.008), core, pr) * (0.3 * glow + 4.4 * glow * glow * glow) * (0.35 + 0.65 * pr);
  }
  vec3 T; float D = length(P);
  vec3 ins = molWater(Ol, Dw, D, T);
  col = col * T + ins;
  alpha = clamp(alpha * onk, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
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
  vec3 T; vec3 c = molWater(Ol, d, 1e6, T);
  // nubes muy suaves de luz dispersa (el volumen no es plano)
  float n = molN3(d * 2.6 + vec3(0.0, uTime * 0.03, uTime * 0.02)) * 0.65 + molN3(d * 6.1 - vec3(uTime * 0.02, 0.0, 0.0)) * 0.35;
  c *= 0.86 + 0.28 * n;
  gl_FragColor = vec4(c, 1.0);
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
  const s = 3.0;
  for (let z = -36; z < 16; z += s) for (let y = -24; y < 24; y += s) for (let x = -19; x < 19; x += s) {
    const p = v3(x + s * (0.12 + rng() * 0.76), y + s * (0.12 + rng() * 0.76), z + s * (0.12 + rng() * 0.76));
    const d = 14 - p.z; if (d < 0) continue;
    if (Math.abs(p.x + 0.9) > 4 + 0.3 * d || Math.abs(p.y - 0.4) > 4.5 + 0.46 * d) continue;
    if (p.length() < 2.2 || pos.some(o => o.distanceToSquared(p) < 2.15 * 2.15)) continue;          // nunca se tocan (alcance de cada una ≤ 0,81 + temblor)
    let ok = true, dmin = 1e9;
    for (let i = 0; i < path.length && ok; i++) {
      const c = path[i].p, dc = c.distanceTo(p); dmin = Math.min(dmin, dc); if (dc < 2.5) { ok = false; break; }
      if (i % 2 === 0) {                                  // línea de visión de la cámara a la protagonista: siempre despejada
        const l = path[i].l, cl = l.clone().sub(c), tt = clamp(p.clone().sub(c).dot(cl) / cl.lengthSq());
        if (tt > 0.04 && tt < 0.9 && c.clone().addScaledVector(cl, tt).distanceTo(p) < 1.3) ok = false;
      }
    }
    if (ok && rng() < 1 - 0.62 * molSs(13, 30, dmin)) { pos.push(p); quat.push(molRandQuat(rng)); }
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
    D.hot[i] = 0.5 + 0.5 * rng(); D.xi[i] = pos[i].dot(MOL_K);
  }
  D.amp[0] = 1.0; D.lag[0] = 0.4; D.hot[0] = 0.9;
  // candidatos a enlace de hidrógeno: el hidrógeno de una molécula cerca del oxígeno de otra y casi en línea con su enlace O–H
  const bonds = [], at = (i, k) => MOL_M[k].clone().applyQuaternion(quat[i]).add(pos[i]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j || pos[i].distanceToSquared(pos[j]) > 3.6 * 3.6) continue;
    const Oi = at(i, 'O'), Oj = at(j, 'O');
    for (const k of ['H1', 'H2']) { const H = at(i, k), d = H.distanceTo(Oj), c = H.clone().sub(Oi).normalize().dot(Oj.clone().sub(H).normalize());
      if (d < 2.3 && c > 0.85 && (i < 3 || j < 3 || rng() < 0.45)) bonds.push({ i, h: k === 'H1' ? 1 : 2, j, d0: d }); }
  }
  // uniformes compartidos (las tres capas leen los mismos objetos)
  const key = v3(-0.62, 0.62, 0.48).normalize(), rim = v3(0.46, 0.42, -0.78).normalize();
  const U = { uKey: { value: key }, uKeyU: { value: key.clone().cross(v3(0, 0, 1)).normalize() }, uRim: { value: rim }, uRimU: { value: rim.clone().cross(v3(0, 1, 0)).normalize() },
    uKeyCol: { value: new THREE.Color(1.0, 0.94, 0.86).multiplyScalar(1.15) }, uRimCol: { value: new THREE.Color(0.48, 0.86, 1.0).multiplyScalar(1.0) },
    uWaveK: { value: MOL_K.clone() }, uE: { value: MOL_E.clone() }, uOrig: { value: g.position.clone() },
    uTime: { value: 0 }, uPhase: { value: 0 }, uKappa: { value: 2 * Math.PI / MOL_LAMBDA }, uOmega: { value: 2 * Math.PI * MOL_NU }, uField: { value: 0 }, uHeat: { value: 0 }, uOn: { value: 1 },
    uFogK: { value: MOL_FOG }, uPz: { value: new THREE.Vector2() }, uFocus: { value: 7 }, uDofK: { value: MOL_DOF }, uDofMax: { value: MOL_DOFMAX }, uResY: { value: H * PR },
    uRes: { value: new THREE.Vector2(W * PR, H * PR) }, uRO: { value: MOL_M.rO }, uRH: { value: MOL_M.rH }, uRS: { value: MOL_M.rS } };
  const setPz = (r, s, camera) => { const e = camera.projectionMatrix.elements; U.uPz.value.set(e[10], e[14]); };
  // fondo
  const bg = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_BG_VS, fragmentShader: MOL_BG_FS, side: THREE.BackSide, depthWrite: true }));
  bg.frustumCulled = false; bg.renderOrder = -100; g.add(bg);
  // impostores
  const MAXP = n * 6 + 8000 + 2600, quad = new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3);
  const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute('position', quad); geo.setIndex([0, 1, 2, 0, 2, 3]);
  const attr = k => { const a = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); return a; };
  const aA = attr('iA'), aB = attr('iB'), aC = attr('iC'), aD = attr('iD'); geo.instanceCount = 0;
  const imp = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: MOL_IMP_VS, fragmentShader: MOL_IMP_FS, transparent: true, premultipliedAlpha: true, depthWrite: false, depthTest: true }));
  imp.frustumCulled = false; imp.renderOrder = 10; imp.onBeforeRender = setPz; g.add(imp);
  // partículas en suspensión (posición de partida + semilla): flotan, brillan al pasar el pulso y se mecen con el campo a un lado y al otro
  const NM = 2600, motes = new Float32Array(NM * 4), path = []; for (let i = 0; i <= 60; i++) path.push(molCamLocal(i / 60).p);
  for (let i = 0; i < NM; i++) { let p; do { p = v3(-7.5 + 14 * rng(), -7 + 15 * rng(), -16 + 32 * rng()); } while (path.some(c => c.distanceTo(p) < 0.9)); motes.set([p.x, p.y, p.z, rng()], i * 4); }
  MOL = { group: g, D, bonds, U, imp, geo, attrs: [aA, aB, aC, aD], motes, bg, MAXP: MAXP + NM, n,
    tmp: { A: new Float32Array(MAXP * 4), B: new Float32Array(MAXP * 4), C: new Float32Array(MAXP * 4), D: new Float32Array(MAXP * 4), key: new Float32Array(MAXP), ord: new Uint32Array(MAXP) },
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
const _molQ = [[0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1], [0, 0, 0, 1]], _molV = new Float32Array(9), _molPrev = new Float32Array(9);
const MOL_SHUT = 1 / 120;                                                    // obturador de 180° a 60 fps
// la pose de la molécula i en el instante t: el dipolo intenta seguir al campo (a un lado y al otro, con retraso) + la agitación del calor.
// Escribe los 3 átomos (O, H1, H2) en out (9 números) y deja el giro en _molQ[3]; devuelve el campo que nota (−1…1)
function molPose(D, i, t, field, heat, out) {
  const i3 = i * 3, i6 = i * 6, Phi = 2 * Math.PI * MOL_NU * t, kap = 2 * Math.PI / MOL_LAMBDA;
  const swing = (0.62 + 0.38 * heat) * field, tAmp = 0.06 + 0.5 * heat, jAmp = 0.025 + 0.15 * heat;
  const qs = _molQ[0], qt = _molQ[1], q0 = _molQ[2], qq = _molQ[3];
  const ef = Math.sin(Phi - kap * D.xi[i] - D.lag[i]), sw = swing * D.amp[i] * ef;
  molQRot(D.ax[i3] * sw, D.ax[i3 + 1] * sw, D.ax[i3 + 2] * sw, qs);
  molQRot(tAmp * Math.sin(D.tf[i6] * t + D.tf[i6 + 3]), tAmp * Math.sin(D.tf[i6 + 1] * t + D.tf[i6 + 4]), tAmp * Math.sin(D.tf[i6 + 2] * t + D.tf[i6 + 5]), qt);
  q0[0] = D.q0[i * 4]; q0[1] = D.q0[i * 4 + 1]; q0[2] = D.q0[i * 4 + 2]; q0[3] = D.q0[i * 4 + 3];
  molQMul(qt, molQMul(qs, q0, qq), qq);
  const px = D.pos[i3] + jAmp * Math.sin(D.jf[i6] * t + D.jf[i6 + 3]), py = D.pos[i3 + 1] + jAmp * Math.sin(D.jf[i6 + 1] * t + D.jf[i6 + 4]), pz = D.pos[i3 + 2] + jAmp * Math.sin(D.jf[i6 + 2] * t + D.jf[i6 + 5]);
  molQApply(qq, MOL_M.O, out, 0); molQApply(qq, MOL_M.H1, out, 3); molQApply(qq, MOL_M.H2, out, 6);
  for (let k = 0; k < 9; k += 3) { out[k] += px; out[k + 1] += py; out[k + 2] += pz; }
  return ef;
}

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
  const A = M.tmp.A, B = M.tmp.B, Cc = M.tmp.C, Dd = M.tmp.D, key = M.tmp.key, ord = M.tmp.ord, at = M.atoms;
  let np = 0;
  const push = (ax, ay, az, aw, bx, by, bz, bw, ccx, ccy, ccz, cw, dx, dy, dz) => {
    const k = np * 4; A[k] = ax; A[k + 1] = ay; A[k + 2] = az; A[k + 3] = aw; B[k] = bx; B[k + 1] = by; B[k + 2] = bz; B[k + 3] = bw; Cc[k] = ccx; Cc[k + 1] = ccy; Cc[k + 2] = ccz; Cc[k + 3] = cw;
    Dd[k] = dx; Dd[k + 1] = dy; Dd[k + 2] = dz;
    const mx = bw === 2 ? (ax + bx) / 2 : ax, my = bw === 2 ? (ay + by) / 2 : ay, mz = bw === 2 ? (az + bz) / 2 : az;
    key[np] = (mx - cx) * fx + (my - cy) * fy + (mz - cz) * fz; np++;
  };
  for (let i = 0; i < n; i++) {
    const ef = molPose(D, i, t, field, heat, _molV), qq = _molQ[3];
    for (let k = 0; k < 9; k++) at[i * 9 + k] = _molV[k];
    const px = D.pos[i * 3], py = D.pos[i * 3 + 1], pz = D.pos[i * 3 + 2];
    if (i === 0) { M.hero.O.set(at[0], at[1], at[2]).add(o); M.hero.H1.set(at[3], at[4], at[5]).add(o); M.hero.H2.set(at[6], at[7], at[8]).add(o);
      M.hero.p.set(0, 1, 0).applyQuaternion(new THREE.Quaternion(qq[0], qq[1], qq[2], qq[3])); M.fieldValue = field * Math.sin(Phi - kap * D.xi[0]); }
    // ¿se ve? (cono de la cámara con margen)
    const dx = px - cx, dy = py - cy, dz = pz - cz, zc = dx * fx + dy * fy + dz * fz;
    const vis = zc > 0.25 && Math.abs(dx * rx + dy * ry + dz * rz) < zc * th + 2.2 && Math.abs(dx * ux + dy * uy + dz * uz) < zc * tv + 2.2;
    M.vis[i] = vis ? 1 : 0; if (!vis) continue;
    // calor propio: crece con el calor y late un poco con cada giro (cuanto más rápido gira, más se calienta)
    const glow = heat * D.hot[i] * (0.82 + 0.18 * Math.abs(Math.cos(Phi - kap * D.xi[i] - D.lag[i])));
    const b = i * 9, Ox = at[b], Oy = at[b + 1], Oz = at[b + 2], H1x = at[b + 3], H1y = at[b + 4], H1z = at[b + 5], H2x = at[b + 6], H2y = at[b + 7], H2z = at[b + 8];
    // dónde estaban al abrir el obturador (desenfoque de movimiento)
    const pv = _molPrev; molPose(D, i, t - MOL_SHUT, field, heat, pv);
    push(Ox, Oy, Oz, MOL_M.rO, H1x, H1y, H1z, 0, H2x, H2y, H2z, glow, pv[0], pv[1], pv[2]);
    push(H1x, H1y, H1z, MOL_M.rH, Ox, Oy, Oz, 1, H2x, H2y, H2z, glow, pv[3], pv[4], pv[5]);
    push(H2x, H2y, H2z, MOL_M.rH, Ox, Oy, Oz, 1, H1x, H1y, H1z, glow, pv[6], pv[7], pv[8]);
    // las varillas, a mitad del obturador, con lo que se mueve su centro
    const mOx = (Ox + pv[0]) / 2, mOy = (Oy + pv[1]) / 2, mOz = (Oz + pv[2]) / 2;
    for (const h of [3, 6]) { const hx = (at[b + h] + pv[h]) / 2, hy = (at[b + h + 1] + pv[h + 1]) / 2, hz = (at[b + h + 2] + pv[h + 2]) / 2;
      push(mOx, mOy, mOz, MOL_M.rS, hx, hy, hz, 2, 0, 0, 0, glow, (Ox + at[b + h] - pv[0] - pv[h]) / 2, (Oy + at[b + h + 1] - pv[1] - pv[h + 1]) / 2, (Oz + at[b + h + 2] - pv[2] - pv[h + 2]) / 2); }
    if (glow > 0.04) push(px, py, pz, 1.15 + 0.35 * glow, 1.0, 0.34, 0.07, 4, 0, 0, 0, 0.36 * glow * glow * glow + 0.025 * glow, px, py, pz);
  }
  const fx0 = at[0] - cx, fy0 = at[1] - cy, fz0 = at[2] - cz, focus = P.focus ?? Math.max(1, fx0 * fx + fy0 * fy + fz0 * fz);
  // el dipolo de la protagonista (opcional, P.dipole 0…1): una nube tenue rojiza en el oxígeno (δ−) y azulada en los hidrógenos (δ+), los colores de los
  // mapas de carga; para acompañar a los rótulos δ−/δ+ del HUD (MOL.heroAt() da dónde ponerlos)
  const dip = clamp(P.dipole ?? 0);
  if (dip > 0.01 && M.vis[0]) {
    push(at[0], at[1], at[2], 0.62, 1.0, 0.16, 0.2, 4, 0, 0, 0, 0.2 * dip, at[0], at[1], at[2]);
    for (const h of [3, 6]) push(at[h], at[h + 1], at[h + 2], 0.46, 0.22, 0.52, 1.0, 4, 0, 0, 0, 0.22 * dip, at[h], at[h + 1], at[h + 2]);
  }
  // enlaces de hidrógeno: puntos tenues entre el hidrógeno de una y el oxígeno de la otra; se rompen al girar o separarse y se rehacen al volver
  for (const bd of M.bonds) {
    if (!M.vis[bd.i] || !M.vis[bd.j] || np > M.MAXP - 20) continue;
    const hb = bd.i * 9 + bd.h * 3, ob = bd.j * 9, oi = bd.i * 9;
    const Hx = at[hb], Hy = at[hb + 1], Hz = at[hb + 2], Ox = at[ob], Oy = at[ob + 1], Oz = at[ob + 2];
    const bz = (Hx - cx) * fx + (Hy - cy) * fy + (Hz - cz) * fz, near = 1 - molSs(2.2, 5.0, Math.abs(bz - focus));   // solo cerca del plano de foco
    if (near < 0.03) continue;
    let vx = Ox - Hx, vy = Oy - Hy, vz = Oz - Hz; const d = Math.hypot(vx, vy, vz); vx /= d; vy /= d; vz /= d;
    let wx = Hx - at[oi], wy = Hy - at[oi + 1], wz = Hz - at[oi + 2]; const wl = Math.hypot(wx, wy, wz); wx /= wl; wy /= wl; wz /= wl;
    const s = near * (1 - molSs(bd.d0 + 0.08, bd.d0 + 0.5, d)) * molSs(0.8, 0.94, vx * wx + vy * wy + vz * wz);
    if (s < 0.03) continue;
    const a0 = MOL_M.rH + 0.07, a1 = d - MOL_M.rO - 0.07, nd = Math.max(3, Math.round((a1 - a0) / 0.13));
    for (let k = 0; k <= nd; k++) { const u = a0 + (a1 - a0) * k / nd; const qx = Hx + vx * u, qy = Hy + vy * u, qz = Hz + vz * u; push(qx, qy, qz, 0.021, 0.52, 0.81, 0.95, 3, 0, 0, 0, s * 0.7, qx, qy, qz); }
  }
  // partículas en suspensión: deriva lenta + el empuje del campo (velocidad ∝ campo → posición ∝ −cos(fase)), con su trazo durante el obturador
  { const Mo = M.motes, NM = Mo.length / 4, Ex = MOL_E.x, Ey = MOL_E.y, Ez = MOL_E.z, Kx = MOL_K.x, Ky = MOL_K.y, Kz = MOL_K.z, Tm = t - 1 / 60;
    for (let i = 0; i < NM && np < M.MAXP - 1; i++) {
      const bx = Mo[i * 4], by = Mo[i * 4 + 1], bz = Mo[i * 4 + 2], sd = Mo[i * 4 + 3], xi = bx * Kx + by * Ky + bz * Kz, am = 0.2 * field * (0.6 + 0.8 * ((sd * 7.31) % 1));
      const sx = bx + 0.16 * Math.sin(t * 0.23 + sd * 61), sy = by + 0.16 * Math.sin(t * 0.19 + sd * 37), sz = bz + 0.16 * Math.sin(t * 0.21 + sd * 17), ph = omega * t - kap * xi, ph0 = omega * Tm - kap * xi;
      const e1 = -am * Math.cos(ph), e0 = -am * Math.cos(ph0);
      const x = sx + Ex * e1, y = sy + Ey * e1, z = sz + Ez * e1;
      const dx = x - cx, dy = y - cy, dz = z - cz, zc = dx * fx + dy * fy + dz * fz;
      if (zc < 0.4 || Math.abs(dx * rx + dy * ry + dz * rz) > zc * th + 0.6 || Math.abs(dx * ux + dy * uy + dz * uz) > zc * tv + 0.6) continue;
      const pulse = Math.pow(Math.abs(Math.sin(ph)), 16) * field, wm = ((sd * 5.3) % 1) * heat * 0.55, I = (0.9 + 2.6 * Math.pow((sd * 13.7) % 1, 3)) * (1 + 2.2 * pulse);
      push(x, y, z, 0.005 + 0.011 * sd * sd, (0.62 + 0.38 * wm) * I, (0.84 - 0.22 * wm) * I, (1.0 - 0.66 * wm) * I, 3, 0, 0, 0, 1, sx + Ex * e0, sy + Ey * e0, sz + Ez * e0);
    } }
  // de atrás adelante (para que los desenfoques se mezclen bien) y a la GPU
  for (let i = 0; i < np; i++) ord[i] = i;
  const sub = ord.subarray(0, np); sub.sort((a, b) => key[b] - key[a]);
  const [aA, aB, aC, aD] = M.attrs, dA = aA.array, dB = aB.array, dC = aC.array, dD = aD.array;
  for (let k = 0; k < np; k++) { const s = sub[k] * 4, d = k * 4; for (let c = 0; c < 4; c++) { dA[d + c] = A[s + c]; dB[d + c] = B[s + c]; dC[d + c] = Cc[s + c]; dD[d + c] = Dd[s + c]; } }
  for (const a of M.attrs) { a.clearUpdateRanges(); a.addUpdateRange(0, np * 4); a.needsUpdate = true; }
  M.geo.instanceCount = np; M.np = np;
  // uniformes
  U.uFocus.value = focus; U.uDofK.value = (P.aperture ?? 1) * MOL_DOF * clamp(focus / 7, 1, 1.8);      // al alejarse, el fondo sigue cremoso
  U.uTime.value = t; U.uPhase.value = Phi; U.uField.value = field; U.uHeat.value = heat; U.uOn.value = on; U.uOrig.value.copy(o);
  U.uResY.value = H * PR; U.uRes.value.set(W * PR, H * PR);
}
