// ================================================================ EL MAGNETRÓN de un microondas de casa (tipo 2M246 / 2M261), de verdad
// Para «Cuidado cuando calientes agua en el microondas»: «Tu microondas lleva dentro un magnetrón…» (sale flotando en vista explosionada) y
// «Dispara ondas que vibran 2.450 millones de veces por segundo» (en corte: el cátodo al rojo en el centro, los electrones girando en espiral
// entre el cátodo y el ánodo de cobre con sus 10 cavidades, y los frentes de onda que salen por la antena).
//
// buildMagnetron(o) → MAG. MAG.group en cm, con el origen en el centro del ánodo; el eje del tubo es y (la antena hacia +y); las aletas salen
//   por ±z; la caja del filamento va abajo, con el condensador pasante y los dos terminales hacia +x. MAG.antennaTip: punta de la antena
//   (coordenadas del grupo; se mueve con la vista explosionada). o.guide = true añade la guía de ondas (un conducto de chapa sobre la brida,
//   o.guideLen cm de largo hacia +y, abierto por el final: ahí va la mica del horno).
// magnetronAt(t, P) con P = { explode, cut, glow, electrons, wave } (0..1) y, opcionales, { guide (0/1: ver la guía), cutYaw, cutHalf (rad:
//   hacia dónde mira y cuánto abre la cuña del corte; por defecto, el cuarto entre +x y +z) }.
// buildMagWaves() → MAGW (MAGW.group en coordenadas del microondas: llena la cavidad) y magWavesAt(t, P) con P = { on, flow } (0..1).
// Todo lo global empieza por mag / MAG (los archivos se concatenan en un solo módulo).

// ---------------------------------------------------------------- medidas (cm)
const MAGD = {
  an: { ri: 1.72, ro: 2.0, h: 1.3 },                         // ánodo de cobre: radio interior y exterior, media altura
  vn: { n: 10, ri: 0.6, ro: 1.74, t: 0.2, h: 0.5 },          // paletas (cavidades resonantes): radio de la punta y del pie, grosor, media altura
  ct: { r: 0.2, w: 0.032, h: 0.42, turns: 8 },               // cátodo: filamento en espiral (radio, hilo, media altura, vueltas)
  pl: { y0: 2.7, t: 0.18, x: 4.45, z: 3.7 },                 // chapa de arriba = brida de montaje (de y0 a y0 + t)
  yk: { x: 3.9, z: 3.7, t: 0.18 },                           // yugo en U (abajo y los dos lados en ±x)
  mg: { ri: 1.12, ro: 2.75, y0: 1.52, y1: 2.66 },            // imanes de ferrita en anillo (el de abajo es simétrico)
  fn: { n: 7, x: 3.6, z: 4.88, t: 0.06, dy: 0.36 },          // aletas de aluminio
  fb: { x: 2.3, z: 2.2, y0: -5.25, y1: -2.88, w: 0.08 },     // caja del filamento (chapa de 0,8 mm)
  tip: 5.76,                                                 // punta del capuchón de la antena
};
let MAG = null, MAGW = null, MAGT = null;
const _magN3 = new THREE.Matrix3(), _magV = new THREE.Vector3();
const magSst = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const magS5 = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };

// ---------------------------------------------------------------- ruido y texturas procedurales (todas se repiten sin costuras)
function magVN(x, y, px, py, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const H = (i, j) => hash((((i % px) + px) % px) * 3.17 + (((j % py) + py) % py) * 41.73 + s * 113.9);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function magFbm(x, y, px, py, oct, s) { let v = 0, a = 0.5, n = 0, f = 1; for (let o = 0; o < oct; o++) { v += a * magVN(x * f, y * f, px * f, py * f, s + o * 7); n += a; a *= 0.5; f *= 2; } return v / n; }
// dos texturas a la vez: color (sRGB) y datos (r = oclusión, g = rugosidad, b = metal), con un pincel opcional encima (rayas, huellas)
function magImg2(w, h, fn, post) {
  const A = canvasTex(w, h), B = canvasTex(w, h), ga = A.userData.g, gb = B.userData.g;
  const ia = ga.createImageData(w, h), ib = gb.createImageData(w, h), a = ia.data, b = ib.data, c = [0, 0, 0], d = [255, 128, 255];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { d[0] = 255; d[1] = 128; d[2] = 255; fn(i / w, j / h, c, d); const k = (j * w + i) * 4;
    a[k] = c[0]; a[k + 1] = c[1]; a[k + 2] = c[2]; a[k + 3] = 255; b[k] = d[0]; b[k + 1] = d[1]; b[k + 2] = d[2]; b[k + 3] = 255; }
  ga.putImageData(ia, 0, 0); gb.putImageData(ib, 0, 0); if (post) post(ga, gb, w, h);
  B.colorSpace = THREE.NoColorSpace; for (const t of [A, B]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; }
  return [A, B];
}
function magPal(stops, x, c) { let i = 0; while (i < stops.length - 2 && x > stops[i + 1][0]) i++; const [x0, c0] = stops[i], [x1, c1] = stops[i + 1], k = magSst(x0, x1, x); for (let q = 0; q < 3; q++) c[q] = c0[q] + (c1[q] - c0[q]) * k; }
// rayas finas (brillan y son menos rugosas) y huellas de dedos (más rugosas)
function magWear(ga, gb, w, h, n, seed, colS, huellas = 0) {
  for (let i = 0; i < n; i++) { const x = hash(i * 3.1 + seed) * w, y = hash(i * 5.7 + seed) * h, an = hash(i * 7.9 + seed) * Math.PI, L = 8 + hash(i * 9.3 + seed) * 70, cx = Math.cos(an) * L, cy = Math.sin(an) * L;
    for (const [ox, oy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) {
      gb.strokeStyle = 'rgba(255,40,255,0.45)'; gb.lineWidth = 0.7; gb.beginPath(); gb.moveTo(x + ox, y + oy); gb.lineTo(x + ox + cx, y + oy + cy); gb.stroke();
      ga.strokeStyle = colS; ga.lineWidth = 0.7; ga.beginPath(); ga.moveTo(x + ox, y + oy); ga.lineTo(x + ox + cx, y + oy + cy); ga.stroke(); } }
  for (let i = 0; i < huellas; i++) { const x = hash(i * 13.1 + seed) * w, y = hash(i * 17.3 + seed) * h, r = 10 + hash(i * 19.7) * 16;
    for (let k = 0; k < 7; k++) { gb.strokeStyle = 'rgba(255,215,255,0.18)'; gb.lineWidth = 1.6; gb.beginPath(); gb.ellipse(x, y, r - k * 2.2, (r - k * 2.2) * 0.72, hash(i) * 3, 0, 6.3); gb.stroke(); } }
}
function magTextures() {
  if (MAGT) return MAGT; const T = {};
  // acero cincado con pasivado amarillo (bicromatado): dorado con manchas verdosas, cobrizas y violáceas; donde la película es fina, el cinc
  const ZN = [[0.18, [168, 108, 64]], [0.36, [200, 166, 90]], [0.5, [214, 190, 106]], [0.62, [184, 180, 98]], [0.75, [136, 156, 104]], [0.9, [124, 110, 156]]];
  [T.znC, T.znD] = magImg2(512, 512, (u, v, c, d) => {
    const n = magFbm(u * 3, v * 3, 3, 3, 5, 1), m = magFbm(u * 8, v * 8, 8, 8, 4, 2), f = hash(u * 913.1 + v * 7123.7);
    magPal(ZN, n * 1.25 - 0.1, c);
    const z = magSst(0.6, 0.8, m) * 0.55; c[0] += (198 - c[0]) * z; c[1] += (199 - c[1]) * z; c[2] += (194 - c[2]) * z;
    const g = 1 + (f - 0.5) * 0.06; c[0] *= g; c[1] *= g; c[2] *= g;
    d[1] = 255 * (0.27 + 0.16 * m + 0.05 * f);
  }, (ga, gb, w, h) => magWear(ga, gb, w, h, 70, 1, 'rgba(236,226,190,0.35)', 3));
  // cobre: brillante con pátina y manchas de óxido; marcas del torno alrededor
  const CU = [[0.0, [238, 152, 108]], [0.4, [228, 138, 96]], [0.6, [194, 108, 72]], [0.8, [136, 76, 52]], [1.0, [100, 60, 46]]];
  [T.cuC, T.cuD] = magImg2(512, 512, (u, v, c, d) => {
    const n = magFbm(u * 4, v * 4, 4, 4, 5, 11), l = magFbm(u * 2, v * 90, 2, 90, 2, 12), f = hash(u * 517.3 + v * 9131.1);
    const ox = magSst(0.55, 0.8, n);
    magPal(CU, ox * 0.85 + (n - 0.5) * 0.25 + 0.12, c);
    const k = 0.95 + (l - 0.5) * 0.14 + (f - 0.5) * 0.04; c[0] *= k; c[1] *= k; c[2] *= k;
    d[1] = 255 * (0.2 + 0.3 * ox + 0.08 * l); d[2] = 255 * (1 - 0.3 * ox);
  }, (ga, gb, w, h) => magWear(ga, gb, w, h, 40, 5, 'rgba(255,200,170,0.3)'));
  // cobre mecanizado (las paletas por dentro): limpio, con las marcas de la fresa
  [T.cmC, T.cmD] = magImg2(256, 256, (u, v, c, d) => {
    const l = magFbm(u * 2, v * 60, 2, 60, 2, 61), n = magFbm(u * 4, v * 4, 4, 4, 3, 62);
    const k = 0.96 + (l - 0.5) * 0.12; c[0] = 240 * k; c[1] = (156 - n * 14) * k; c[2] = (112 - n * 12) * k;
    d[1] = 255 * (0.17 + 0.1 * l + 0.08 * n);
  });
  // aluminio cepillado (aletas): vetas a lo largo de u, algo de polvo
  [T.alC, T.alD] = magImg2(512, 512, (u, v, c, d) => {
    const s = magFbm(u * 2, v * 160, 2, 160, 3, 21), n = magFbm(u * 5, v * 5, 5, 5, 4, 22), f = hash(u * 7919.1 + v * 113.3);
    const dirt = magSst(0.6, 0.82, n), b = 214 + (s - 0.5) * 26 + (f - 0.5) * 6 - dirt * 30;
    c[0] = b; c[1] = b + 1; c[2] = b + 3 - dirt * 5;
    d[1] = 255 * (0.3 + (s - 0.5) * 0.18 + dirt * 0.25);
  });
  // ferrita: gris muy oscuro, mate, de grano fino con algún cristalito que brilla
  [T.feC, T.feD] = magImg2(256, 256, (u, v, c, d) => {
    const f = hash(u * 3917.1 + v * 77.7), g = hash(u * 131.7 + v * 5711.3), n = magFbm(u * 6, v * 6, 6, 6, 3, 31);
    let b = 52 + (f - 0.5) * 24 + (n - 0.5) * 16, r = 0.8 + (g - 0.5) * 0.14;
    if (f > 0.986) { b += 38; r = 0.42; }
    c[0] = b; c[1] = b; c[2] = b + 2; d[1] = 255 * r; d[2] = 0;
  });
  // cerámica de alúmina (aislante de la antena y del pie del cátodo): blanco roto, motitas
  [T.ceC] = magImg2(256, 256, (u, v, c, d) => { const n = magFbm(u * 4, v * 4, 4, 4, 3, 41), f = hash(u * 2711.3 + v * 91.7); let b = 230 + (n - 0.5) * 10; if (f > 0.994) b -= 55; c[0] = b + 2; c[1] = b; c[2] = b - 9; });
  // hierro niquelado (piezas polares) / acero inoxidable (capuchón)
  [T.stC, T.stD] = magImg2(256, 256, (u, v, c, d) => {
    const n = magFbm(u * 4, v * 4, 4, 4, 4, 51), l = magFbm(u * 2, v * 70, 2, 70, 2, 52), b = 184 + (n - 0.5) * 22 + (l - 0.5) * 12;
    c[0] = b; c[1] = b; c[2] = b - 4; d[1] = 255 * (0.24 + 0.14 * n);
  }, (ga, gb, w, h) => magWear(ga, gb, w, h, 25, 9, 'rgba(240,240,236,0.3)'));
  // oclusión de las aletas (vista en planta: abiertas por los extremos en z, tapadas por el yugo en x y oscuras junto al ánodo)
  T.finAO = magImg2(256, 256, (u, v, c, d) => { const x = (u - 0.5) * 7.2, z = (v - 0.5) * 9.88, e = 4.94 - Math.abs(z), r = Math.hypot(x, z);
    let ao = 1 - 0.68 * magSst(0.0, 2.3, e); ao *= 1 - 0.3 * (1 - magSst(2.0, 2.9, r)); ao *= 1 - 0.18 * magSst(3.0, 3.6, Math.abs(x)); d[0] = 255 * ao; })[1];
  // malla de punto de acero inoxidable (la junta de la antena): bucles al tresbolillo
  [T.knC, T.knD] = magImg2(128, 128, (u, v, c, d) => {
    const x = u * 4, y = v * 4, row = Math.floor(y), off = (row % 2) * 0.5, fx = x + off - Math.floor(x + off) - 0.5, fy = y - row - 0.5;
    const lp = Math.abs(Math.hypot(fx * 1.1, fy * 0.8) - 0.3), k = Math.exp(-lp * lp * 70), b = 60 + 160 * k;
    c[0] = b; c[1] = b; c[2] = b + 4; d[1] = 255 * (0.55 - 0.3 * k);
  });
  // etiqueta de papel plateado (sin marcas: solo los datos de la pieza)
  T.label = canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = '#dcdad2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(90,80,60,${0.03 + hash(i) * 0.05})`; g.fillRect(hash(i * 3.3) * w, hash(i * 5.1) * h, 2, 2); }
    g.fillStyle = '#1c1c1c'; g.font = '700 46px sans-serif'; g.fillText('MAGNETRÓN', 28, 66); g.font = '500 30px sans-serif';
    g.fillText('2450 MHz   ·   900 W', 28, 118); g.fillText('F: 3,3 V ~   Ea: 4,0 kV', 28, 160); g.fillText('Nº 61-0412-B', 28, 202);
    for (let i = 0; i < 46; i++) { const ww = 1 + (hash(i * 7.7) * 4 | 0); g.fillRect(300 + i * 4.4, 176, ww, 90); }
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(60,45,20,.0)'); gr.addColorStop(1, 'rgba(60,45,20,.22)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  MAGT = T; return T;
}

// ---------------------------------------------------------------- materiales. Los que se cortan llevan la «tapa del corte»: con el corte activo se
// dibujan por las dos caras y, donde se ve la cara de atrás a través del corte, se pinta como la cara plana del corte (normal del plano, metal
// vivo del color de la pieza). Así las piezas parecen macizas al cortarlas sin tener que construir las tapas.
function magCutPatch(m, capHex, capR, capM) {
  const U = { magCapC: { value: new THREE.Color(capHex) }, magCapRM: { value: new THREE.Vector2(capR, capM) } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <clipping_planes_pars_fragment>', '#include <clipping_planes_pars_fragment>\nuniform vec3 magCapC; uniform vec2 magCapRM;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float magK = 0.0; vec3 magN = vec3(0.0, 0.0, 1.0);
        #if NUM_CLIPPING_PLANES > 0
        if (!gl_FrontFacing) {
          // el rayo de la cámara a este punto: ¿salió de la zona quitada por uno de los planos antes de llegar aquí? → es la tapa de ese plano
          vec3 Pv = -vClipPosition; float sx = 1.0, se = 0.0;
          for (int i = 0; i < NUM_CLIPPING_PLANES; i++) { vec4 pl = clippingPlanes[i]; float nd = dot(pl.xyz, Pv); float s = -pl.w / (abs(nd) > 1e-6 ? nd : 1e-6);
            if (nd > 0.0) { if (s < sx) { sx = s; magN = -pl.xyz; } } else { se = max(se, s); } }
          if (sx < 0.9999 && sx > se) magK = 1.0;
        }
        #endif`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (magK > 0.5) diffuseColor.rgb = magCapC;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nif (magK > 0.5) { roughnessFactor = magCapRM.x; metalnessFactor = magCapRM.y; }')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (magK > 0.5) { normal = magN; nonPerturbedNormal = magN; }')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (magK > 0.5) totalEmissiveRadiance = vec3(0.0);')
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
        if (magK > 0.5) material.clearcoat = 0.0;
        #endif
        #ifdef USE_IRIDESCENCE
        if (magK > 0.5) material.iridescence = 0.0;
        #endif`);
  };
  m.customProgramCacheKey = () => 'magcut1';
  return m;
}
// tipos de material: [fábrica, color de la tapa del corte, su rugosidad, su metal]
function magKinds(T) {
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);
  return {
    zn: [() => P({ map: T.znC, roughnessMap: T.znD, metalnessMap: T.znD, roughness: 1, metalness: 1, clearcoat: 0.25, clearcoatRoughness: 0.4, iridescence: 0.35, iridescenceIOR: 1.6, iridescenceThicknessMap: T.znD, iridescenceThicknessRange: [180, 620] }), 0xc8c8c2, 0.3, 1],
    cu: [() => S({ map: T.cuC, roughnessMap: T.cuD, metalnessMap: T.cuD, roughness: 1, metalness: 1 }), 0xf0a27e, 0.24, 1],
    cuIn: [() => S({ map: T.cmC, roughnessMap: T.cmD, roughness: 1, metalness: 1, vertexColors: true }), 0xf0a27e, 0.22, 1],
    fe: [() => S({ map: T.stC, roughnessMap: T.stD, roughness: 1.1, metalness: 1, color: 0xd8d8d4 }), 0xcfcfca, 0.3, 1],
    ferr: [() => S({ map: T.feC, roughnessMap: T.feD, roughness: 1, metalness: 0, bumpMap: T.feC, bumpScale: 0.9 }), 0x58585c, 0.6, 0],
    al: [() => P({ map: T.alC, roughnessMap: T.alD, aoMap: T.finAO, aoMapIntensity: 1, roughness: 1, metalness: 1, anisotropy: 0.55 }), 0xdedfe2, 0.25, 1],
    cer: [() => P({ map: T.ceC, roughness: 0.42, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3 }), 0xf2efe8, 0.65, 0],
    cap: [() => S({ map: T.stC, roughnessMap: T.stD, roughness: 0.7, metalness: 1, color: 0xf4f4f2 }), 0xd8d8d4, 0.25, 1],
    kov: [() => S({ color: 0x9c968e, roughness: 0.36, metalness: 1 }), 0xb0aaa2, 0.3, 1],
    knit: [() => S({ map: T.knC, roughnessMap: T.knD, bumpMap: T.knC, bumpScale: 1.2, roughness: 1, metalness: 1, color: 0xe8e8e8 }), 0xbcbcbc, 0.4, 1],
    tin: [() => S({ color: 0xdcd8cc, roughness: 0.2, metalness: 1 }), 0xdedad0, 0.2, 1],
    capC: [() => P({ color: 0x7a4a2c, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 }), 0x8a5a38, 0.6, 0],
    wire: [() => P({ color: 0xa8582a, roughness: 0.32, metalness: 0.75, clearcoat: 1, clearcoatRoughness: 0.12 }), 0xd08a60, 0.3, 1],
    rod: [() => S({ color: 0x3a3a3e, roughness: 0.7, metalness: 0 }), 0x4a4a4e, 0.6, 0],
    label: [() => S({ map: T.label, roughness: 0.55, metalness: 0.15 }), 0xd0d0cc, 0.5, 0],
  };
}

// ---------------------------------------------------------------- geometría
// perfil de torno (polígono cerrado en (r, y), en sentido antihorario = caras hacia fuera) con un chaflán fino en cada esquina: aristas vivas con su brillo
function magProf(poly, b = 0.02) {
  const P = poly.map(([r, y]) => new THREE.Vector2(r, y)), n = P.length, out = [], mid = P[0].clone().add(P[1]).multiplyScalar(0.5); out.push(mid);
  for (let k = 1; k <= n; k++) { const c = P[k % n], p = P[k - 1], q = P[(k + 1) % n], bb = Math.min(b, c.distanceTo(p) * 0.4, c.distanceTo(q) * 0.4);
    if (bb < 1e-4) { out.push(c.clone()); continue; }
    out.push(c.clone().add(p.clone().sub(c).normalize().multiplyScalar(bb)), c.clone().add(q.clone().sub(c).normalize().multiplyScalar(bb))); }
  out.push(mid.clone()); return out;
}
// torno con uv a escala real (s = repeticiones de la textura por cm; número entero de repeticiones alrededor para que no haya costura)
function magLatheGeo(poly, { b = 0.02, seg = 64, s = 0.3, ao = null } = {}) {
  const pts = magProf(poly, b), g = new THREE.LatheGeometry(pts, seg), np = pts.length, L = [0];
  for (let i = 1; i < np; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const uv = g.attributes.uv; for (let i = 0; i <= seg; i++) for (let j = 0; j < np; j++) { const tiles = Math.max(1, Math.round(2 * Math.PI * pts[j].x * s)); uv.setXY(i * np + j, (i / seg) * tiles, L[j] * s); }
  if (ao) { const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const k = ao(Math.hypot(P.getX(i), P.getZ(i)), P.getY(i), (P.getX(i) * N.getX(i) + P.getZ(i) * N.getZ(i)) / Math.max(1e-4, Math.hypot(P.getX(i), P.getZ(i)))); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  return g;
}
// uv planas a escala real según hacia dónde mira cada cara (cajas y extrusiones)
function magBoxUV(g, s) { const P = g.attributes.position, N = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < P.count; i++) { const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (ax >= ay && ax >= az) uv.setXY(i, z * s, y * s); else if (ay >= az) uv.setXY(i, x * s, z * s); else uv.setXY(i, x * s, y * s); }
  return g; }
function magMesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
function magMerge(list) { return mergeGeometries(list.map(g => g.index ? g.toNonIndexed() : g), false); }
// forma en planta (x, z) extruida hacia +y entre y0 e y0 + t (chapas): el plano de la forma pasa a ser el horizontal
function magPlate(shape, y0, t, bev = 0.02, cs = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: cs });
  g.translate(0, 0, bev); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;      // (x, y, z) → (x, z, −y): la profundidad pasa a ser la altura
}
function magRect(x0, y0, x1, y1, r = 0, sh = new THREE.Shape()) {
  if (r <= 0) { sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.closePath(); return sh; }
  sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
  sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0); return sh;
}
function magHole(sh, x, y, r) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); sh.holes.push(p); return sh; }
// hélice (filamento del cátodo, bobinas de choque) a lo largo de y o de x
class MagHelix extends THREE.Curve {
  constructor(r, len, turns, axis = 'y') { super(); this.r = r; this.len = len; this.turns = turns; this.axis = axis; }
  getPoint(t, out = new THREE.Vector3()) { const a = t * this.turns * Math.PI * 2, c = this.r * Math.cos(a), s = this.r * Math.sin(a), l = (t - 0.5) * this.len; return this.axis === 'y' ? out.set(c, l, s) : out.set(l, c, s); }
}

// ---------------------------------------------------------------- la nube de electrones: cada electrón sale del cátodo y va hacia las paletas
// en espiral, dentro de uno de los 5 «radios» que giran (el modo π de un ánodo de 10 cavidades), con pequeños bucles de cicloide; una parte se
// queda girando pegada al cátodo. Cada electrón es una cinta (estela) de NS tramos calculada en el sombreador (su posición ahora y antes).
const MAG_EL_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 seed; attribute vec3 cs;
uniform float time, power, rc, ra, hh, om, dts, nseg, sz; uniform vec2 res;
varying float vA; varying float vT;
vec3 ePos(float T, vec4 s, out float a) {
  float life = mix(0.55, 1.05, s.x), q = T / life + s.y * 17.0; a = fract(q); float cyc = floor(q);
  float h1 = fract(sin(cyc * 12.9898 + s.z * 78.233) * 43758.5453), h2 = fract(sin(cyc * 4.1414 + s.w * 31.71) * 24634.6345);
  float r, th, y;
  if (s.x < 0.28) { r = rc + 0.022 + 0.1 * h1 * h1; th = om * 2.4 * T + s.z * 6.2832 + s.w * 40.0; y = (h2 - 0.5) * 2.0 * hh; }
  else { float sp = floor(s.w * 5.0), ar = pow(a, 0.8);
    r = mix(rc + 0.03, ra + 0.01, ar);
    th = om * T + sp * 1.256637 + (h1 - 0.5) * 0.42 * (1.0 - 0.4 * ar) - 1.35 * ar;
    float ph = a * 6.2832 * 3.0; r += 0.03 * (1.0 - cos(ph)) * (1.0 - ar); th += 0.1 * sin(ph);
    y = (h2 - 0.5) * 2.0 * hh; }
  return vec3(r * cos(th), y, r * sin(th));
}
void main(){
  float aA, aB; vec3 A = ePos(time - cs.z * dts, seed, aA), B = ePos(time - (cs.z + 1.0) * dts, seed, aB);
  mat4 PM = projectionMatrix * modelViewMatrix; vec4 ca = PM * vec4(A, 1.0), cb = PM * vec4(B, 1.0);
  vec2 pa = ca.xy / ca.w * res * 0.5, pb = cb.xy / cb.w * res * 0.5, d = pb - pa; float L = length(d);
  vec2 dir = L > 0.001 ? d / L : vec2(1.0, 0.0), nr = vec2(-dir.y, dir.x);
  float px = sz * projectionMatrix[1][1] * res.y * 0.5 / max(ca.w, 0.001);
  float w = max(1.1, px) * (1.0 - 0.6 * (cs.z + cs.x) / nseg);
  vec4 c = cs.x < 0.5 ? ca : cb; vec2 p = cs.x < 0.5 ? pa - dir * w * step(cs.z, 0.5) : pb;
  p += nr * cs.y * w;
  gl_Position = vec4(p / (res * 0.5) * c.w, c.z, c.w);
  #include <logdepthbuf_vertex>
  float lf = smoothstep(0.0, 0.06, aA) * (1.0 - smoothstep(0.85, 1.0, aA));
  vA = (aB > aA || ca.w < 0.01 || power < 0.002) ? 0.0 : power * pow(1.0 - (cs.z + cs.x) / nseg, 1.4) * lf;
  vT = cs.y;
}`;
const MAG_EL_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
varying float vA; varying float vT;
void main(){
  #include <logdepthbuf_fragment>
  if (vA < 0.002) discard;
  float k = exp(-vT * vT * 3.2);
  vec3 col = mix(vec3(0.22, 0.42, 1.0) * 1.7, vec3(1.25, 1.35, 1.6) * 3.2, k * k);
  gl_FragColor = vec4(col * k, vA);
}`;
function magElectrons(n = 900, NS = 12) {
  const V = n * NS * 4, seed = new Float32Array(V * 4), cs = new Float32Array(V * 3), idx = new Uint32Array(n * NS * 6);
  let v = 0, q = 0;
  for (let i = 0; i < n; i++) { const s = [hash(i * 1.37 + 0.1), hash(i * 2.71 + 0.3), hash(i * 3.97 + 0.7), hash(i * 5.31 + 0.9)];
    for (let j = 0; j < NS; j++) { const b = v; for (const [x, y] of [[0, -1], [0, 1], [1, -1], [1, 1]]) { seed.set(s, v * 4); cs.set([x, y, j], v * 3); v++; }
      idx.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], q); q += 6; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V * 3), 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 4)); g.setAttribute('cs', new THREE.BufferAttribute(cs, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.ShaderMaterial({ vertexShader: MAG_EL_VS, fragmentShader: MAG_EL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, rc: { value: MAGD.ct.r + 0.05 }, ra: { value: MAGD.vn.ri }, hh: { value: MAGD.vn.h * 0.86 }, om: { value: 2.4 },
      dts: { value: 0.024 }, nseg: { value: NS }, sz: { value: 0.022 }, res: { value: new THREE.Vector2(W * PR, H * PR) } } });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 8; return me;
}
// el halo azul de la carga espacial: discos apilados con la misma rueda de 5 radios que los electrones
const MAG_HZ_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const MAG_HZ_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float time, power, rc, ra, om; varying vec3 vL;
void main(){
  #include <logdepthbuf_fragment>
  float r = length(vL.xz), th = atan(vL.z, vL.x), x = (r - rc) / (ra - rc);
  if (x < 0.0 || x > 1.0 || power < 0.002) discard;
  float arm = th - om * time + 1.35 * pow(x, 0.8), s = 0.5 + 0.5 * cos(arm * 5.0);
  float d = pow(s, 3.0) * (1.0 - x) * smoothstep(0.0, 0.2, x) + 0.4 * exp(-x * 5.0);
  gl_FragColor = vec4(vec3(0.3, 0.5, 1.0) * 1.3, power * d * 0.22 * smoothstep(1.0, 0.8, x));
}`;

// ---------------------------------------------------------------- frentes de onda: cáscaras esféricas que crecen desde una fuente; solo se dibuja la
// parte que cae dentro de una caja (la cavidad del horno o la guía). La rejilla de direcciones cubre solo el casquete que ve la caja.
const MAG_SH_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float iR; attribute float iA; attribute float iS;
uniform vec3 C;
varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vA; varying float vS;
void main(){
  vec3 p = C + position * iR; vP = p; vA = iA; vS = iS;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * position); vV = -mv.xyz;
  gl_Position = iA > 0.0005 ? projectionMatrix * mv : vec4(0.0, 0.0, -2.0, 1.0);
  #include <logdepthbuf_vertex>
}`;
const MAG_SH_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 bMin, bMax, tA, tB; uniform float time, gain, wallK;
varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vA; varying float vS;
void main(){
  #include <logdepthbuf_fragment>
  if (vA < 0.0005 || vP.x < bMin.x || vP.y < bMin.y || vP.z < bMin.z || vP.x > bMax.x || vP.y > bMax.y || vP.z > bMax.z) discard;
  float c = abs(dot(normalize(vN), normalize(vV))), rim = pow(1.0 - c, 2.6);
  vec3 dw = min(vP - bMin, bMax - vP); float dm = min(dw.x, min(dw.y, dw.z)), wall = wallK * exp(-dm * 2.2);
  float sh = 0.72 + 0.28 * sin(vP.x * 1.7 + time * 2.3 + 2.0 * sin(vP.y * 1.3 - time * 1.1)) * sin(vP.z * 1.5 - time * 1.9 + vS * 5.0);
  float a = vA * gain * (0.07 + rim + wall) * sh;
  vec3 col = (mod(vS, 2.0) < 0.5 ? tA : tB) * a;
  gl_FragColor = vec4(col, a * 0.3);
}`;
function magShellSet(C, bMin, bMax, o = {}) {
  const nT = o.nT || 18, nP = o.nP || 44, lam = o.lam || 6.1;
  // la caja vista desde la fuente: dirección media y abertura del casquete
  const corners = []; for (let i = 0; i < 8; i++) corners.push(v3(i & 1 ? bMax.x : bMin.x, i & 2 ? bMax.y : bMin.y, i & 4 ? bMax.z : bMin.z));
  const inside = C.x >= bMin.x - 1e-3 && C.x <= bMax.x + 1e-3 && C.y >= bMin.y - 1e-3 && C.y <= bMax.y + 1e-3 && C.z >= bMin.z - 1e-3 && C.z <= bMax.z + 1e-3;
  const cl = v3(clamp(C.x, bMin.x, bMax.x), clamp(C.y, bMin.y, bMax.y), clamp(C.z, bMin.z, bMax.z)), dmin = C.distanceTo(cl);
  let dmax = 0; for (const p of corners) dmax = Math.max(dmax, C.distanceTo(p));
  let D, tmax;
  if (inside && dmin < 1e-3 && !o.onWall) { D = o.D ? o.D.clone().normalize() : v3(0, 1, 0); tmax = Math.PI; }
  else { D = bMin.clone().add(bMax).multiplyScalar(0.5).sub(C).normalize(); if (o.D) D = o.D.clone().normalize(); tmax = 0; for (const p of corners) tmax = Math.max(tmax, p.clone().sub(C).normalize().angleTo(D)); tmax = Math.min(Math.PI, tmax + 0.04); }
  const U = Math.abs(D.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0), E1 = new THREE.Vector3().crossVectors(D, U).normalize(), E2 = new THREE.Vector3().crossVectors(D, E1);
  const pos = [], idx = [];
  for (let i = 0; i <= nT; i++) { const th = tmax * i / nT, st = Math.sin(th), ct = Math.cos(th);
    for (let j = 0; j <= nP; j++) { const ph = 2 * Math.PI * j / nP; const d = D.clone().multiplyScalar(ct).addScaledVector(E1, st * Math.cos(ph)).addScaledVector(E2, st * Math.sin(ph)); pos.push(d.x, d.y, d.z); } }
  for (let i = 0; i < nT; i++) for (let j = 0; j < nP; j++) { const a = i * (nP + 1) + j, b = a + nP + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const K = Math.max(2, Math.ceil((dmax - dmin) / lam) + 2);
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const iR = new THREE.InstancedBufferAttribute(new Float32Array(K), 1), iA = new THREE.InstancedBufferAttribute(new Float32Array(K), 1), iS = new THREE.InstancedBufferAttribute(new Float32Array(K), 1);
  for (const a of [iR, iA, iS]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iR', iR); g.setAttribute('iA', iA); g.setAttribute('iS', iS); g.instanceCount = K;
  const m = new THREE.ShaderMaterial({ vertexShader: MAG_SH_VS, fragmentShader: MAG_SH_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    uniforms: { C: { value: C.clone() }, bMin: { value: bMin.clone() }, bMax: { value: bMax.clone() }, tA: { value: new THREE.Color(o.tA ?? 0x8f7dff) }, tB: { value: new THREE.Color(o.tB ?? 0x6fa8ff) },
      time: { value: 0 }, gain: { value: 0 }, wallK: { value: o.wallK ?? 0 } } });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = o.ro ?? 4;
  return { mesh: me, g, m, iR, iA, iS, K, lam, dmin, dmax, amp: o.amp ?? 1, tris: nT * nP * 2 * K };
}
// pone los radios del fotograma: frentes cada λ que avanzan a «speed» cm/s; solo hasta el frente de la emisión (Rf) y con atenuación
function magShellsAt(S, t, speed, Rf, gain, att = 30, fade = 3) {
  const ph = ((t * speed) / S.lam) % 1, m0 = Math.floor(S.dmin / S.lam - ph);
  for (let k = 0; k < S.K; k++) { const m = m0 + k, R = (m + ph) * S.lam;
    const a = R < 0.04 ? 0 : S.amp * (1 - magSst(Rf - fade, Rf, R)) * magSst(0.0, 0.8, R) / (1 + R / att);
    S.iR.array[k] = Math.max(R, 0.001); S.iA.array[k] = a > 0.002 ? a : 0; S.iS.array[k] = ((m % 2) + 2) % 2; }
  S.iR.needsUpdate = S.iA.needsUpdate = S.iS.needsUpdate = true; S.m.uniforms.time.value = t; S.m.uniforms.gain.value = gain; S.mesh.visible = gain > 0.002;
}

// ---------------------------------------------------------------- EL MAGNETRÓN
function buildMagnetron(o = {}) {
  const D = MAGD, T = magTextures(), K = magKinds(T), G = new THREE.Group(); G.name = 'magnetron';
  const M = { group: G, parts: [], pieces: [], antennaTip0: v3(0, D.tip, 0), antennaTip: v3(0, D.tip, 0), tris: 0 };
  // cada «pieza» que se corta tiene sus materiales (con sus planos de corte en su propio marco)
  let piece = null;
  const newPiece = root => { piece = { root, mats: [], planes: [new THREE.Plane(), new THREE.Plane()] }; M.pieces.push(piece); return piece; };
  const mat = (kind, cut = true) => { const [f, ch, cr, cm] = K[kind], m = f(); if (cut && piece) { magCutPatch(m, ch, cr, cm); piece.mats.push(m); } return m; };
  const part = (obj, off, t0, d) => { M.parts.push({ obj, base: obj.position.clone(), off, t0, d }); return obj; };
  const add = (par, g, m, cast = true) => { const me = magMesh(g, m, cast); par.add(me); return me; };
  newPiece(G);
  const mZn = mat('zn'), mCu = mat('cu'), mCuIn = mat('cuIn'), mFe = mat('fe'), mFerr = mat('ferr'), mAl = mat('al'), mCer = mat('cer'), mCap = mat('cap'), mKov = mat('kov'), mKnit = mat('knit');

  // ---- el tubo (no se mueve): ánodo de cobre con sus 10 paletas, aros de unión, piezas polares de hierro, cátodo, pie de cerámica y cable de antena
  const tube = new THREE.Group(); G.add(tube);
  const aoIn = (r, y, nr) => nr < -0.5 ? 0.42 : nr > 0.5 ? 0.62 : 0.75;     // pared de dentro (al fondo de las cavidades), de fuera (entre aletas), caras
  add(tube, magLatheGeo([[D.an.ri, -D.an.h], [D.an.ro, -D.an.h], [D.an.ro, D.an.h], [D.an.ri, D.an.h]], { b: 0.03, seg: 72, s: 0.35, ao: aoIn }), mCuIn);
  { const V = D.vn, L = V.ro - V.ri + 0.04, list = [];
    for (let i = 0; i < V.n; i++) { const a = (i + 0.5) * 2 * Math.PI / V.n, g = new THREE.BoxGeometry(L, 2 * V.h, V.t, 1, 1, 1); g.translate(V.ri + L / 2, 0, 0); g.rotateY(-a); list.push(g); }
    const g = magMerge(list); magBoxUV(g, 0.5); const P = g.attributes.position, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i), P.getZ(i)), k = 1 - 0.55 * magSst(0.7, 1.7, r); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); add(tube, g, mCuIn);
    // aros de unión (alternan las paletas: fijan el modo π), arriba y abajo
    const rings = []; for (const sy of [1, -1]) for (const [r0, r1] of [[0.78, 0.86], [1.0, 1.08]]) { const y0 = sy > 0 ? V.h : -V.h - 0.09, y1 = y0 + 0.09; rings.push(magLatheGeo([[r0, y0], [r1, y0], [r1, y1], [r0, y1]], { b: 0.012, seg: 56, s: 0.5, ao: () => 0.62 })); }
    add(tube, magMerge(rings), mCuIn); }
  // piezas polares (embudos de hierro que concentran el campo) con su tapa y el cuello donde se asienta el imán; la de abajo, simétrica
  const poleTop = [[0.34, 0.6], [0.52, 0.57], [1.71, 1.06], [1.71, 1.31], [2.0, 1.31], [2.0, 1.46], [1.0, 1.46], [1.0, 2.88], [0.34, 2.88]];
  add(tube, magLatheGeo(poleTop, { b: 0.025, seg: 72, s: 0.35 }), mFe);
  add(tube, magLatheGeo(poleTop.map(([r, y]) => [r, -y]).reverse(), { b: 0.025, seg: 72, s: 0.35 }), mFe);
  // pie del cátodo: cerámica con su anillo de kovar, debajo del imán de abajo (dentro de la caja del filamento)
  add(tube, magLatheGeo([[0.22, -4.18], [0.6, -4.18], [0.62, -4.1], [0.62, -3.05], [0.6, -2.97], [0.22, -2.97]], { b: 0.03, seg: 48, s: 0.5 }), mCer);
  add(tube, magLatheGeo([[0.3, -2.97], [0.7, -2.97], [0.7, -2.88], [0.3, -2.88]], { b: 0.012, seg: 48, s: 0.5 }), mKov);
  // cátodo (no se corta: es la estrella): filamento de tungsteno en espiral, sombreretes de molibdeno, varilla central y patas
  const mW = new THREE.MeshStandardMaterial({ color: 0x8c8c92, metalness: 1, roughness: 0.42, emissive: 0xff5c1c, emissiveIntensity: 0 });
  const mMo = new THREE.MeshStandardMaterial({ color: 0xb4b4ba, metalness: 1, roughness: 0.3, emissive: 0xff4a12, emissiveIntensity: 0 });
  M.mW = mW; M.mMo = mMo;
  const C = D.ct; add(tube, new THREE.TubeGeometry(new MagHelix(C.r, 2 * C.h, C.turns, 'y'), C.turns * 22, C.w, 8, false), mW, false);
  for (const sy of [1, -1]) { const y0 = sy * (C.h + 0.02), y1 = y0 + sy * 0.07; add(tube, magLatheGeo([[0.04, Math.min(y0, y1)], [0.36, Math.min(y0, y1)], [0.36, Math.max(y0, y1)], [0.04, Math.max(y0, y1)]], { b: 0.012, seg: 40, s: 1 }), mMo, false);
    add(tube, magLatheGeo([[0.04, sy > 0 ? y1 : y1 - 0.12], [0.16, sy > 0 ? y1 : y1 - 0.12], [0.16, sy > 0 ? y1 + 0.12 : y1], [0.04, sy > 0 ? y1 + 0.12 : y1]], { b: 0.01, seg: 24, s: 1 }), mMo, false); }
  { const g = new THREE.CylinderGeometry(0.04, 0.04, C.h + 0.09 + 4.32, 10); const me = add(tube, g, mMo, false); me.position.set(0, (C.h + 0.09 - 4.32) / 2, 0); }
  { const g = new THREE.CylinderGeometry(0.05, 0.05, 4.32 - C.h - 0.09, 10); const me = add(tube, g, mMo, false); me.position.set(0.17, (-C.h - 0.09 - 4.32) / 2, 0); }
  // cable de la antena: sale de lo alto de una paleta (por detrás, fuera del corte), atraviesa la pieza polar y sube por el eje
  const mLead = new THREE.MeshStandardMaterial({ color: 0xe0926a, metalness: 1, roughness: 0.3 });
  { const a = (6 + 0.5) * 2 * Math.PI / D.vn.n, c = Math.cos(a), s = Math.sin(a);
    const crv = new THREE.CatmullRomCurve3([v3(1.25 * c, 0.5, 1.25 * s), v3(1.12 * c, 0.78, 1.12 * s), v3(0.6 * c, 1.4, 0.6 * s), v3(0.1 * c, 2.0, 0.1 * s), v3(0, 2.6, 0), v3(0, 5.3, 0)]);
    add(tube, new THREE.TubeGeometry(crv, 80, 0.05, 8, false), mLead, false); }

  // ---- antena: manguito de cobre, aislante de cerámica, anillo de kovar y capuchón (salen hacia arriba en la vista explosionada)
  const antC = new THREE.Group(); G.add(antC); part(antC, v3(0, 3.3, 0), 0.05, 0.6);
  add(antC, magLatheGeo([[0.62, 2.88], [1.22, 2.88], [1.22, 2.96], [0.92, 2.96], [0.92, 3.36], [0.62, 3.36]], { b: 0.015, seg: 56, s: 0.5 }), mCu);
  add(antC, magLatheGeo([[0.62, 3.36], [0.9, 3.36], [0.935, 3.62], [0.935, 4.32], [0.9, 4.58], [0.62, 4.58]], { b: 0.03, seg: 56, s: 0.5 }), mCer);
  add(antC, magLatheGeo([[0.6, 4.58], [0.86, 4.58], [0.86, 4.72], [0.6, 4.72]], { b: 0.015, seg: 56, s: 0.5 }), mKov);
  const capG = new THREE.Group(); G.add(capG); part(capG, v3(0, 4.7, 0), 0.0, 0.55);
  add(capG, magLatheGeo([[0.0, 4.72], [0.77, 4.72], [0.77, 4.86], [0.71, 4.92], [0.71, 5.0], [0.75, 5.05], [0.75, 5.36], [0.68, 5.55], [0.5, 5.68], [0.26, 5.745], [0.0, D.tip]], { b: 0.02, seg: 64, s: 0.6 }), mCap);
  // junta de malla de punto alrededor de la antena (cierra el paso de las microondas entre la brida y la guía)
  const knit = new THREE.Group(); G.add(knit); part(knit, v3(0, 2.5, 0), 0.1, 0.6);
  { const g = new THREE.TorusGeometry(1.42, 0.2, 14, 72); g.rotateX(Math.PI / 2); g.scale(1, 0.62, 1); g.translate(0, D.pl.y0 + D.pl.t + 0.12, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 36, uv.getY(i) * 6); add(knit, g, mKnit); }

  // ---- chapa de arriba (brida de montaje con sus 4 agujeros)
  const plate = new THREE.Group(); G.add(plate); part(plate, v3(0, 1.9, 0), 0.12, 0.62);
  { const sh = magRect(-D.pl.x, -D.pl.z, D.pl.x, D.pl.z, 0.45); magHole(sh, 0, 0, 1.04); for (const sx of [-1, 1]) for (const sz of [-1, 1]) magHole(sh, sx * 4.14, sz * 3.05, 0.2);
    const g = magPlate(sh, D.pl.y0, D.pl.t, 0.025, 40); magBoxUV(g, 0.12); add(plate, g, mZn); }
  // ---- imanes de ferrita
  const mgT = new THREE.Group(), mgB = new THREE.Group(); G.add(mgT, mgB); part(mgT, v3(0, 1.05, 0), 0.2, 0.62); part(mgB, v3(0, -1.05, 0), 0.2, 0.62);
  { const pr = [[D.mg.ri, D.mg.y0], [D.mg.ro, D.mg.y0], [D.mg.ro, D.mg.y1], [D.mg.ri, D.mg.y1]];
    add(mgT, magLatheGeo(pr, { b: 0.06, seg: 72, s: 0.45 }), mFerr); add(mgB, magLatheGeo(pr.map(([r, y]) => [r, -y]).reverse(), { b: 0.06, seg: 72, s: 0.45 }), mFerr); }
  // ---- aletas de aluminio (encajadas a presión en el ánodo, con su cuello y las pestañas dobladas en los extremos)
  { const F = D.fn, sh = magRect(-F.x, -F.z, F.x, F.z, 0.12); magHole(sh, 0, 0, 2.04);
    const gp = magPlate(sh, -F.t / 2, F.t, 0.012, 56);
    const gc = magLatheGeo([[2.01, F.t / 2 - 0.01], [2.07, F.t / 2 - 0.01], [2.07, 0.24], [2.01, 0.24]], { b: 0.008, seg: 72 });
    const lips = [-1, 1].map(sz => { const g = new THREE.BoxGeometry(2 * F.x, 0.3, F.t, 1, 1, 1); g.translate(0, F.t / 2 - 0.15, sz * (F.z + F.t / 2 - 0.005)); return g; });
    const gf = magMerge([gp, gc, ...lips]), P = gf.attributes.position, uv = gf.attributes.uv;
    for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + 3.6) / 7.2, (P.getZ(i) + 4.94) / 9.88);
    for (let k = 0; k < F.n; k++) { const fg = new THREE.Group(); fg.position.y = (k - (F.n - 1) / 2) * F.dy; G.add(fg); add(fg, gf, mAl); part(fg, v3(0, (k - (F.n - 1) / 2) * 0.17, 0), 0.32 + 0.02 * Math.abs(k - 3), 0.62); } }
  // ---- yugo en U: chapa de abajo, dos dobleces y los lados (con las lengüetas que entran en la chapa de arriba) y la etiqueta
  const yoke = new THREE.Group(); G.add(yoke); part(yoke, v3(0, -2.9, 0), 0.15, 0.65);
  { const Y = D.yk, ro = 0.43, ri = ro - Y.t, xb = Y.x - ro, yb = -D.pl.y0 - Y.t + ro, list = [];
    const sh = magRect(-xb, -Y.z, xb, Y.z, 0); magHole(sh, 0, 0, 1.04); list.push(magPlate(sh, -D.pl.y0 - Y.t, Y.t, 0, 40));
    for (const sx of [1, -1]) {
      const b = new THREE.Shape(); b.absarc(xb, yb, ro, -Math.PI / 2, 0, false); b.lineTo(xb + ri, yb); b.absarc(xb, yb, ri, 0, -Math.PI / 2, true); b.closePath();
      const gb = new THREE.ExtrudeGeometry(b, { depth: 2 * Y.z, bevelEnabled: false, curveSegments: 10 }); gb.translate(0, 0, -Y.z); if (sx < 0) gb.rotateY(Math.PI); list.push(gb);
      const gw = new THREE.BoxGeometry(Y.t, D.pl.y0 - yb, 2 * Y.z); gw.translate(sx * (Y.x - Y.t / 2), (D.pl.y0 + yb) / 2, 0); list.push(gw);
      for (const sz of [-1, 1]) { const gt = new THREE.BoxGeometry(Y.t, 0.3, 0.7); gt.translate(sx * (Y.x - Y.t / 2), D.pl.y0 + 0.13, sz * 1.9); list.push(gt); } }
    const g = magMerge(list); magBoxUV(g, 0.12); add(yoke, g, mZn);
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.1), mat('label')); lb.material.userData.magClipOnly = true; lb.rotation.y = -Math.PI / 2; lb.position.set(-Y.x - 0.004, 0.15, 0.1); lb.receiveShadow = true; yoke.add(lb); }

  // ---- caja del filamento (va a un lado en la vista explosionada): chapa de acero, bobinas de choque y el condensador pasante con sus dos terminales
  const fbox = new THREE.Group(); G.add(fbox); part(fbox, v3(4.6, -3.9, 0), 0.25, 0.7);
  newPiece(fbox);
  { const B = D.fb, mB = mat('zn'), list = [];
    const fr = magRect(-B.x, -B.z, B.x, B.z, 0.3); fr.holes.push(magRect(-B.x + B.w, -B.z + B.w, B.x - B.w, B.z - B.w, 0.22, new THREE.Path()));
    list.push(magPlate(fr, B.y0 + B.w, B.y1 - B.y0 - 2 * B.w, 0, 12));
    list.push(magPlate(magRect(-B.x, -B.z, B.x, B.z, 0.3), B.y0, B.w, 0.015, 12));
    const top = magRect(-B.x, -B.z, B.x, B.z, 0.3); magHole(top, 0, 0, 0.72); list.push(magPlate(top, B.y1 - B.w, B.w, 0.015, 24));
    const g = magMerge(list); magBoxUV(g, 0.15); add(fbox, g, mB);
    // condensador pasante: placa de montaje, cuerpo, aislante y los dos terminales planos (estañados, con su agujero)
    const mT = mat('tin'), mCC = mat('capC'), mCan = mat('cap'), yc = -4.1;
    { const g2 = new THREE.BoxGeometry(0.06, 1.9, 2.0); g2.translate(B.x + 0.03, yc, 0); magBoxUV(g2, 0.3); add(fbox, g2, mCan); }
    { const g2 = new THREE.CylinderGeometry(0.78, 0.78, 0.85, 40); g2.rotateZ(-Math.PI / 2); g2.translate(B.x + 0.06 + 0.425, yc, 0); add(fbox, g2, mCan); }
    { const g2 = new THREE.CylinderGeometry(0.62, 0.7, 0.34, 40); g2.rotateZ(-Math.PI / 2); g2.translate(B.x + 0.91 + 0.17, yc, 0); add(fbox, g2, mCC); }
    for (const sz of [-1, 1]) { const s2 = magRect(0, -0.32, 1.1, 0.32, 0.05); magHole(s2, 0.82, 0, 0.1);
      const g2 = new THREE.ExtrudeGeometry(s2, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 16 }); g2.translate(B.x + 1.08, yc, sz * 0.36 - 0.035); add(fbox, g2, mT); }
    // bobinas de choque (hilo de cobre esmaltado sobre varillas de ferrita) y los cables hasta el pie del cátodo y el condensador
    const mWire = mat('wire'), mRod = mat('rod');
    for (const sz of [-1, 1]) { const cz = sz * 1.12, cy = -4.4;
      const gr = new THREE.CylinderGeometry(0.19, 0.19, 2.3, 20); gr.rotateZ(Math.PI / 2); gr.translate(0.45, cy, cz); add(fbox, gr, mRod);
      const gh = new THREE.TubeGeometry(new MagHelix(0.27, 1.9, 12, 'x'), 12 * 16, 0.045, 6, false); gh.translate(0.45, cy, cz); add(fbox, gh, mWire);
      const w1 = new THREE.CatmullRomCurve3([v3(sz > 0 ? 0 : 0.17, -4.2, 0), v3(-0.4, -4.3, cz * 0.5), v3(-0.5, cy + 0.27, cz)]);
      const w2 = new THREE.CatmullRomCurve3([v3(1.4, cy + 0.27, cz), v3(1.9, -4.2, cz * 0.6), v3(B.x + 0.1, yc, sz * 0.36)]);
      for (const c of [w1, w2]) add(fbox, new THREE.TubeGeometry(c, 24, 0.035, 6, false), mWire); } }
  piece = M.pieces[0];

  // ---- guía de ondas (opcional): conducto de chapa sobre la brida alrededor de la antena; acaba abierto (ahí está la mica del horno)
  if (o.guide) { const L = o.guideLen ?? 5.1, gi = { x: 2.2, z: 4.3 }, w = 0.07, y0 = D.pl.y0 + D.pl.t, g = new THREE.Group(); G.add(g); M.guide = g; M.guideBox = [v3(-gi.x, y0, -gi.z), v3(gi.x, y0 + L, gi.z)];
    const fr = magRect(-gi.x - w, -gi.z - w, gi.x + w, gi.z + w, 0.15); fr.holes.push(magRect(-gi.x, -gi.z, gi.x, gi.z, 0.08, new THREE.Path()));
    const gg = magMerge([magPlate(fr, y0, L, 0, 10), magPlate((() => { const s = magRect(-gi.x - 0.6, -gi.z - 0.6, gi.x + 0.6, gi.z + 0.6, 0.3); s.holes.push(magRect(-gi.x, -gi.z, gi.x, gi.z, 0.08, new THREE.Path())); return s; })(), y0 + L - 0.1, 0.1, 0.01, 10)]);
    magBoxUV(gg, 0.12); add(g, gg, mat('fe')); }

  // ---- lo que brilla: luz del filamento (cálida), electrones, halo azul y frentes de onda de la antena
  M.light = new THREE.PointLight(0xff7a30, 0, 1.95, 2); G.add(M.light);
  M.el = magElectrons(); G.add(M.el);
  { const hm = new THREE.ShaderMaterial({ vertexShader: MAG_HZ_VS, fragmentShader: MAG_HZ_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { time: { value: 0 }, power: { value: 0 }, rc: { value: D.ct.r + 0.04 }, ra: { value: D.vn.ri }, om: { value: 2.4 } } });
    const list = []; for (let k = 0; k < 5; k++) { const g = new THREE.RingGeometry(D.ct.r + 0.03, D.vn.ri, 64, 1); g.rotateX(-Math.PI / 2); g.translate(0, (k - 2) * 0.18, 0); list.push(g); }
    M.haze = new THREE.Mesh(magMerge(list), hm); M.haze.renderOrder = 7; M.haze.frustumCulled = false; G.add(M.haze); }
  { const src = v3(0, 5.25, 0), free = [v3(-9, D.pl.y0 + D.pl.t + 0.05, -9), v3(9, 16, 9)];
    M.wFree = magShellSet(src, free[0], free[1], { nT: 26, nP: 52, lam: 1.5, D: v3(0, 1, 0), tA: 0x9a86ff, tB: 0x78b0ff, ro: 5 }); G.add(M.wFree.mesh);
    if (M.guide) { M.wGuide = magShellSet(src, M.guideBox[0], M.guideBox[1], { nT: 24, nP: 48, lam: 1.5, D: v3(0, 1, 0), tA: 0x9a86ff, tB: 0x78b0ff, ro: 5, wallK: 0.5 }); M.guide.add(M.wGuide.mesh); } }
  G.traverse(ob => { if (ob.isMesh && ob.geometry && ob.geometry.index) M.tris += ob.geometry.index.count / 3 * (ob.geometry.instanceCount && ob.geometry.instanceCount < 1e6 ? ob.geometry.instanceCount : 1); else if (ob.isMesh) M.tris += ob.geometry.attributes.position.count / 3; });
  MAG = M; magnetronAt(0, {}, M); return M;
}

// ---------------------------------------------------------------- estado por fotograma
function magnetronAt(t, P = {}, M = MAG) {
  if (!M) return;
  const ex = clamp(P.explode ?? 0), cut = clamp(P.cut ?? 0), gl = clamp(P.glow ?? 0), el = clamp(P.electrons ?? 0), wv = clamp(P.wave ?? 0);
  // 1) vista explosionada: cada pieza a su ritmo (en cascada), y flotando un poco cuando está fuera
  M.parts.forEach((p, i) => { const k = magS5((ex - p.t0) / p.d); p.obj.position.copy(p.base).addScaledVector(p.off, k); if (k > 0) p.obj.position.y += Math.sin(t * 1.15 + i * 1.9) * 0.05 * k; });
  M.antennaTip.copy(M.antennaTip0).add(M.parts.find(p => p.off.y > 4.5).obj.position);
  M.group.updateWorldMatrix(true, true);
  // 2) corte en cuña: quita {p·n1 > d y p·n2 > d} (en el marco de cada pieza); d baja de fuera hacia el eje
  const on = cut > 0.0005, d = lerp(7.8, 0, eio(cut)), yaw = P.cutYaw ?? Math.PI / 4, half = P.cutHalf ?? Math.PI / 4;
  const n1 = v3(Math.sin(yaw - half), 0, -Math.cos(yaw - half)), n2 = v3(-Math.sin(yaw + half), 0, Math.cos(yaw + half));     // (ya cambiados de signo: normales hacia lo que se queda)
  for (const pc of M.pieces) { const Mw = pc.root.matrixWorld; _magN3.getNormalMatrix(Mw);
    pc.planes[0].set(n1, d).applyMatrix4(Mw, _magN3); pc.planes[1].set(n2, d).applyMatrix4(Mw, _magN3);
    for (const m of pc.mats) if (m.userData.magOn !== on) { m.userData.magOn = on; m.clippingPlanes = on ? pc.planes : null; m.clipIntersection = true; m.clipShadows = true;
      if (!m.userData.magClipOnly) m.side = on ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; } }
  // 3) filamento al rojo (y su luz, que tiñe las puntas de las paletas)
  const sc = M.group.getWorldScale(_magV).x;
  M.mW.emissiveIntensity = 2.7 * gl; M.mMo.emissiveIntensity = 0.5 * gl * gl;
  M.light.intensity = (0.85 * gl + 0.3 * el) * sc * sc; M.light.distance = 1.95 * sc; M.light.color.setRGB(1, 0.42 + 0.25 * el * (1 - gl * 0.5), 0.16 + 0.5 * el * (1 - gl * 0.5));
  // 4) electrones y su halo
  const U = M.el.material.uniforms; U.time.value = t; U.power.value = el; M.el.visible = el > 0.002;
  M.haze.material.uniforms.time.value = t; M.haze.material.uniforms.power.value = el; M.haze.visible = el > 0.002;
  // 5) frentes de onda desde la antena (dentro de la guía si se ve; si no, al aire, hacia arriba)
  const gOn = !!(M.guide && (P.guide ?? 1) > 0.5); if (M.guide) M.guide.visible = gOn;
  const S = gOn ? M.wGuide : M.wFree, So = gOn ? M.wFree : M.wGuide;
  if (So) So.mesh.visible = false;
  S.m.uniforms.C.value.copy(M.antennaTip).y -= 0.5;
  magShellsAt(S, t, 6.0, 4 + 16 * wv, wv * 0.55, 6, 2.5);
}

// ---------------------------------------------------------------- LAS ONDAS DENTRO DEL HORNO (coordenadas del microondas). Salen por la mica (pared
// derecha) y rebotan en las paredes: frentes de la fuente y de sus «imágenes» (las reflexiones en las 6 paredes, hasta 2 rebotes), cada uno
// recortado a la cavidad; en la pared, donde choca el frente, brilla un poco. λ visible = 6,1 cm (media longitud de onda real, 12,2 cm: crestas y valles).
function buildMagWaves(o = {}) {
  const C = (typeof MWD !== 'undefined' && MWD.cav) || { x0: -21, x1: 9, y0: 3.4, y1: 24.6, z0: -33, z1: 0 };
  const bMin = v3(C.x0, C.y0, C.z0), bMax = v3(C.x1, C.y1, C.z1), S0 = o.src ? o.src.clone() : v3(C.x1, 15.5, -14), lam = o.lam ?? 6.1;
  const G = new THREE.Group(); G.name = 'magWaves'; const W = { group: G, sets: [], tris: 0 };
  const walls = [[0, C.x0], [0, C.x1], [1, C.y0], [1, C.y1], [2, C.z0], [2, C.z1]];
  const refl = (p, ax, w) => { const q = p.clone(); q.setComponent(ax, 2 * w - p.getComponent(ax)); return q; };
  const srcs = [{ p: S0, n: 0 }], seen = new Set([S0.toArray().map(x => x.toFixed(2)).join()]);
  for (let depth = 1; depth <= (o.depth ?? 2); depth++) for (const s of srcs.filter(s => s.n === depth - 1)) for (const [ax, w] of walls) {
    const q = refl(s.p, ax, w), key = q.toArray().map(x => x.toFixed(2)).join(); if (seen.has(key) || q.distanceTo(s.p) < 0.01) continue; seen.add(key); srcs.push({ p: q, n: depth }); }
  for (const s of srcs) { const onW = s.n === 0, set = magShellSet(s.p, bMin, bMax, { nT: onW ? 26 : s.n === 1 ? 16 : 10, nP: onW ? 60 : s.n === 1 ? 36 : 24, lam, onWall: onW, D: onW ? v3(-1, 0, 0) : null, amp: Math.pow(0.6, s.n), wallK: 0.6, ro: 4 });
    W.sets.push(set); G.add(set.mesh); W.tris += set.tris; }
  // el brillo de la boca: un resplandor suave sobre la mica, donde salen las ondas
  { const gt = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    const m = new THREE.MeshBasicMaterial({ map: gt, color: new THREE.Color(0x8f86ff), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), m); me.position.set(C.x1 - 0.05, S0.y, S0.z); me.rotation.y = -Math.PI / 2; me.renderOrder = 4; G.add(me); W.glow = me; }
  W.src = S0; W.box = [bMin, bMax]; MAGW = W; magWavesAt(0, {}, W); return W;
}
function magWavesAt(t, P = {}, W = MAGW) {
  if (!W) return;
  const on = clamp(P.on ?? 0), flow = clamp(P.flow ?? 0), Rf = 2 + flow * 110;
  for (const s of W.sets) magShellsAt(s, t, 14, Rf, on * 0.5, 40, 4);
  W.glow.material.opacity = on * clamp(flow * 4) * (0.5 + 0.15 * Math.sin(t * 9.0)); W.glow.visible = W.glow.material.opacity > 0.002;
}
