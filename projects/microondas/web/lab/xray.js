// ================================================================ EL MICROONDAS POR DENTRO (estilo «explicador» de videojuego: formas limpias, luces cálidas que brillan,
// líneas cian). La carcasa se abre en despiece y deja ver las tripas: transformador (chapas + bobinas de cobre), condensador de alta tensión, diodo,
// ventilador, motor del plato, la GUÍA DE ONDAS (conducto de chapa de la antena del magnetrón a la ventana de mica), cables y el magnetrón montado en la
// guía. El magnetrón sube fuera del microondas y a su alrededor aparece una estación de radar de la Segunda Guerra Mundial (líneas cian que se rellenan).
// La cámara puede volar por dentro de la guía (como un túnel de metro: costuras, remaches y lámparas) y salir por la mica a la cavidad.
//
// buildXray(MW) → XR (todo cuelga de MW, en sus coordenadas). Necesita buildMagnetron (magnetron.js / 16_magnetron.js) concatenado antes.
// xrayAt(t, P) con P = { open, glow, hot, fan, lift, radar, beam } (0..1; fan = factor de vueltas) y, opcional, fly (el mismo u de xrayCam: aclara la
//   mica cuando la cámara la cruza y sube las lámparas de la guía).
// xrayCam(u) → [px,py,pz, lx,ly,lz, fov] en coordenadas del MUNDO (u 0..1: detrás de la antena, por la guía, sale por la mica a la cavidad).
// XR.anchors = { magnetron, transformer, capacitor, fan, waveguide, mica }: getters que devuelven Vector3 del mundo (para los rótulos).
// Todo lo global empieza por xr / XR.

// ---------------------------------------------------------------- medidas (cm, coordenadas del microondas)
const XRD = {
  duct: { x0: 9.08, x1: 13.3, y0: 11.2, y1: 19.8, z0: -31.0, z1: -9.6, t: 0.14 },   // guía de ondas (por dentro): pegada a la pared derecha de la cavidad
  win: { y0: 11.5, y1: 19.5, z0: -18, z1: -10 },                                      // ventana de mica (la boca de la guía en la cavidad)
  mag: [16.18, 15.5, -26],                                                            // magnetrón: la brida contra la guía, la antena dentro (hacia −x)
  lift: [17, 47, -19],                                                                // magnetrón arriba (fuera del microondas, en el foco del plato del radar)
  island: [17, 29.6, -19],                                                            // centro de la isla del radar
};
let XR = null;
const xrTmpV = new THREE.Vector3(), xrTmpQ = new THREE.Quaternion(), xrTmpE = new THREE.Euler();
const xrS5 = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };

// ---------------------------------------------------------------- texturas pequeñas (canvas)
function xrTex(w, h, draw, srgb = true, rep = null) { const t = canvasTex(w, h, draw); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
// el brillo «rayos X»: borde cian (fresnel) que se enciende con P.glow, y calor naranja (P.hot) en lo que se calienta
const XRU = { rim: { value: new THREE.Color(0, 0, 0) } };
function xrRim(m, hot = false) {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  m.onBeforeCompile = (sh, r) => { if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev(sh, r); sh.uniforms.xrRimC = XRU.rim;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 xrRimC;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += xrRimC * pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.6);'); };
  m.customProgramCacheKey = () => key + 'xr';
  if (hot) { m.emissive = new THREE.Color(0, 0, 0); m.userData.xrHot = hot; }
  return m;
}
function xrMats(MW) {
  const S = o => xrRim(new THREE.MeshStandardMaterial(o)), P = o => xrRim(new THREE.MeshPhysicalMaterial(o));
  const lam = xrTex(64, 64, (g, w, h) => { for (let i = 0; i < w; i++) { const k = 90 + (hash(i * 3.1) * 60 | 0); g.fillStyle = `rgb(${k},${k + 2},${k + 6})`; g.fillRect(i, 0, 1, h); } });   // chapas del núcleo
  const coil = c => xrTex(64, 64, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); for (let j = 0; j < h; j += 4) { g.fillStyle = 'rgba(40,12,0,.45)'; g.fillRect(0, j, w, 1); g.fillStyle = 'rgba(255,220,180,.35)'; g.fillRect(0, j + 1.5, w, 1); } });
  const pcb = xrTex(256, 512, (g, w, h) => { g.fillStyle = '#0e4a2c'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(190,170,90,.55)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { g.beginPath(); let x = hash(i * 1.3) * w, y = hash(i * 2.7) * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (k % 2) y += (hash(i * 7 + k) - 0.5) * 200; else x += (hash(i * 5 + k) - 0.5) * 160; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 14; i++) { g.fillStyle = '#16181c'; g.fillRect(hash(i * 9.1) * (w - 50), hash(i * 4.3) * (h - 30), 30 + hash(i) * 30, 16 + hash(i * 2) * 20); } });
  const earth = xrTex(256, 256, (g, w, h) => { g.fillStyle = '#4a3a28'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = hash(i) > 0.5 ? 'rgba(30,22,14,.35)' : 'rgba(120,96,64,.3)'; g.fillRect(hash(i * 3.3) * w, hash(i * 5.7) * h, 2 + hash(i * 1.1) * 4, 2 + hash(i * 2.2) * 4); } }, true, [3, 3]);
  const burlap = xrTex(64, 64, (g, w, h) => { g.fillStyle = '#9c8358'; g.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 3) { g.fillStyle = 'rgba(60,46,28,.35)'; g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } }, true, [2, 2]);
  return {
    shell: MW.userData.M.metal,
    galv: S({ color: 0xb8bdc3, metalness: 0.85, roughness: 0.36 }),
    galvGhost: S({ color: 0xb8bdc3, metalness: 0.85, roughness: 0.36, transparent: true }),
    core: S({ map: lam, color: 0x9aa0a8, metalness: 0.75, roughness: 0.42 }), coreCap: S({ color: 0x7c828a, metalness: 0.8, roughness: 0.35 }),
    coilA: S({ map: coil('#c8743c'), metalness: 0.85, roughness: 0.32, color: 0xffffff }, true), coilB: S({ map: coil('#9a4a22'), metalness: 0.7, roughness: 0.38, color: 0xffffff }, true),
    can: S({ color: 0xcfd2d6, metalness: 0.92, roughness: 0.26 }), black: P({ color: 0x141619, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    white: P({ color: 0xe8e4da, roughness: 0.5, clearcoat: 0.2 }), yellow: P({ color: 0xe0b630, roughness: 0.45, clearcoat: 0.3 }),
    tin: S({ color: 0xdedad0, metalness: 1, roughness: 0.22 }), pcb: S({ map: pcb, roughness: 0.55, metalness: 0.1 }),
    wR: P({ color: 0xc8261e, roughness: 0.35, clearcoat: 0.6 }), wK: P({ color: 0x1a1a1c, roughness: 0.35, clearcoat: 0.6 }), wW: P({ color: 0xe9e9e4, roughness: 0.4, clearcoat: 0.5 }),
    wB: P({ color: 0x2457c8, roughness: 0.35, clearcoat: 0.6 }), wY: P({ color: 0xe8c22a, roughness: 0.35, clearcoat: 0.6 }),
    earth: new THREE.MeshStandardMaterial({ map: earth, roughness: 0.95 }), burlap: new THREE.MeshStandardMaterial({ map: burlap, roughness: 0.9 }),
    steelR: new THREE.MeshStandardMaterial({ color: 0x7d858c, metalness: 0.75, roughness: 0.45 }), olive: new THREE.MeshStandardMaterial({ color: 0x4f5636, metalness: 0.2, roughness: 0.7 }),
  };
}
const xrMesh = (g, m, par, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; if (par) par.add(o); return o; };
const xrUV = (g, s) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s); return g; };
function xrBar(a, b, r, seg = 6) { const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r, r, L, seg, 1); g.translate(0, L / 2, 0); g.applyQuaternion(xrTmpQ.setFromUnitVectors(v3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; }
function xrWire(pts, r, m, par) { return xrMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => v3(...p))), pts.length * 10, r, 8, false), m, par); }

// ---------------------------------------------------------------- la guía de ondas por dentro: túnel de chapa con costuras, remaches y lámparas cálidas
// (luz falsa en el sombreador: charcos de luz de cada lámpara y el resplandor de los frentes de onda que pasan; sin luces de verdad, que cuestan en toda la escena)
const XR_DUCT_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vL; varying vec3 vN;
void main(){ vL = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const XR_DUCT_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 lamps[12]; uniform vec3 warm, cyan, amb; uniform float lampI, beamI, z0, y0, y1; uniform float fr[6];
varying vec3 vL; varying vec3 vN;
float xh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN);
  float along = vL.z, across = abs(N.y) > 0.5 ? vL.x * 2.0 : vL.y;
  if (abs(N.z) > 0.5) { along = vL.y; across = vL.x * 2.0; }
  // chapa: costuras cada 4 cm, remaches junto a las costuras, vetas finas
  float ds = abs(fract((along - z0) / 4.0 + 0.5) - 0.5) * 4.0;
  float seam = 1.0 - smoothstep(0.03, 0.09, ds);
  vec2 rv = vec2(ds - 0.32, mod(across, 0.8) - 0.4); float rivet = 1.0 - smoothstep(0.06, 0.1, length(rv));
  float grain = 0.9 + 0.1 * xh(floor(vec2(along * 30.0, across * 3.0)));
  vec3 base = vec3(0.34, 0.35, 0.37) * grain * (1.0 - 0.55 * seam) + rivet * vec3(0.18);
  // luz de las lámparas (charcos cálidos) y de los frentes de onda (cian, con el lóbulo del modo TE10: más fuerte a media altura)
  vec3 li = amb;
  for (int k = 0; k < 12; k++) { vec3 L = lamps[k] - vL; float d2 = dot(L, L); li += warm * lampI * (0.25 + 0.75 * max(dot(N, L * inversesqrt(d2)), 0.0)) / (1.0 + d2 * 0.9); }
  float lobe = sin(3.14159 * clamp((vL.y - y0) / (y1 - y0), 0.0, 1.0)), wv = 0.0;
  for (int f = 0; f < 6; f++) { float d = (vL.z - fr[f]) / 0.55; wv += exp(-d * d); }
  vec3 col = base * li + cyan * beamI * wv * (0.35 + 0.65 * lobe) * (0.6 + 0.4 * base.r * 3.0) + rivet * warm * lampI * 0.02;
  gl_FragColor = vec4(col, 1.0);
}`;
// frentes de onda dentro de la guía: láminas que cruzan el conducto, brillantes en el centro (modo TE10) y con el borde encendido
const XR_FRONT_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const XR_FRONT_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float a; varying vec2 vU;
void main(){
  #include <logdepthbuf_fragment>
  if (a < 0.002) discard;
  float lobe = sin(3.14159 * vU.y), e = min(min(vU.x, 1.0 - vU.x) * 4.2, min(vU.y, 1.0 - vU.y) * 8.6), edge = exp(-e * 6.0);
  gl_FragColor = vec4(col, a * (0.1 + 0.55 * lobe * lobe + 0.9 * edge));
}`;

// ---------------------------------------------------------------- el radar de la Segunda Guerra Mundial: se dibuja en líneas cian y se rellena de abajo arriba
function xrFillPatch(m) {   // el sólido aparece por debajo de una altura (mundo) con una franja cian en el frente
  const U = { xrFill: { value: -1e4 }, xrBand: { value: 0 } }; m.userData.xrU = U;
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vXrY;').replace('#include <project_vertex>', '#include <project_vertex>\n#ifdef USE_INSTANCING\nvXrY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;\n#else\nvXrY = (modelMatrix * vec4(transformed, 1.0)).y;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vXrY; uniform float xrFill, xrBand;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vXrY > xrFill) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.35, 1.6, 2.0) * xrBand * exp(-(xrFill - vXrY) * 1.2);'); };
  m.customProgramCacheKey = () => 'xrfill'; return m;
}
function xrLines(segs, w = 1.5, k = 2.4) { const g = new LineSegmentsGeometry(); g.setPositions(segs); const m = lineMat(0x6ff2ff, w, 0); m.color.multiplyScalar(k); const l = new LineSegments2(g, m); l.frustumCulled = false; l.renderOrder = 9; return l; }
function xrEdges(geo, thr = 30) { return Array.from(new THREE.EdgesGeometry(geo, thr).attributes.position.array); }
function xrBuildRadar(XRo, M) {
  const C = v3(...XRD.island), G = new THREE.Group(); G.position.copy(C); XRo.mw.add(G); const els = [];
  const el = (name, geo, mat, segs, delay, opts = {}) => { const m = xrFillPatch(mat.clone()); const o = opts.inst ? opts.inst(m) : xrMesh(geo, m, null); (opts.par || G).add(o);
    const l = xrLines(segs, opts.w || 1.5); (opts.par || G).add(l); if (opts.pos) { o.position.copy(opts.pos); l.position.copy(opts.pos); }
    els.push({ name, o, m, l, delay, y0: opts.y0 ?? 0, y1: opts.y1 ?? 10 }); return o; };
  // isla de tierra
  { const g = new THREE.CylinderGeometry(26, 27.5, 2.2, 56); g.translate(0, -1.1, 0); const ring = []; for (let i = 0; i < 56; i++) { const a0 = i / 56 * 6.2832, a1 = (i + 1) / 56 * 6.2832; ring.push(26 * Math.cos(a0), 0, 26 * Math.sin(a0), 26 * Math.cos(a1), 0, 26 * Math.sin(a1)); }
    el('isla', g, M.earth, ring, 0.0, { y0: -2.2, y1: 0.1 }); }
  // sacos terreros en media luna delante
  { const bag = rbox(3.3, 1.5, 1.9, M.burlap, 0.7).geometry; bag.rotateX(Math.PI / 2); const N = 54, segs = [];
    el('sacos', null, M.burlap, segs, 0.06, { y0: 0, y1: 3.2, inst: m => { const im = new THREE.InstancedMesh(bag, m, N); im.castShadow = true; im.receiveShadow = true; let k = 0;
      for (let row = 0; row < 2; row++) for (let i = 0; i < N / 2; i++) { const a = -0.55 + (i + row * 0.5) / (N / 2) * 2.5, r = 22.5;
        _o.position.set(r * Math.cos(a), 0.95 + row * 1.6, r * Math.sin(a)); _o.rotation.set(0, -a + Math.PI / 2, 0); _o.updateMatrix(); im.setMatrixAt(k++, _o.matrix);
        const p0 = v3(r * Math.cos(a - 0.04), 0.3 + row * 1.6, r * Math.sin(a - 0.04)), p1 = v3(r * Math.cos(a + 0.04), 0.3 + row * 1.6, r * Math.sin(a + 0.04)); segs.push(p0.x, p0.y + 1.2, p0.z, p1.x, p1.y + 1.2, p1.z); }
      im.instanceMatrix.needsUpdate = true; return im; } });
    els[els.length - 1].l.geometry.setPositions(segs); }
  // el gran plato parabólico (tipo «Würzburg») sobre su cabina, detrás del magnetrón: el magnetrón queda donde iría la antena de alimentación
  { const D = new THREE.Group(); D.position.set(0, 15.4, -13); D.rotation.x = -0.32; G.add(D); const f = 11, R = 15, prof = [];
    for (let i = 0; i <= 18; i++) { const r = R * i / 18; prof.push(new THREE.Vector2(Math.max(r, 0.01), r * r / (4 * f))); }
    const g = new THREE.LatheGeometry(prof, 64); g.rotateX(Math.PI / 2); const segs = [];
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.2832; for (let i = 0; i < 6; i++) { const r0 = R * i / 6, r1 = R * (i + 1) / 6; segs.push(r0 * Math.cos(a), r0 * Math.sin(a), r0 * r0 / (4 * f), r1 * Math.cos(a), r1 * Math.sin(a), r1 * r1 / (4 * f)); } }
    for (const r of [5, 10, 15]) for (let k = 0; k < 48; k++) { const a0 = k / 48 * 6.2832, a1 = (k + 1) / 48 * 6.2832, z = r * r / (4 * f); segs.push(r * Math.cos(a0), r * Math.sin(a0), z, r * Math.cos(a1), r * Math.sin(a1), z); }
    const dm = M.steelR.clone(); dm.side = THREE.DoubleSide;
    el('plato', g, dm, segs, 0.16, { par: D, y0: -15, y1: 17 });
    // brazos de la antena de alimentación (hacia el foco) y la cabina con su horquilla
    const arms = []; for (let k = 0; k < 3; k++) { const a = k / 3 * 6.2832 + 0.5; arms.push(xrBar(v3(R * Math.cos(a), R * Math.sin(a), R * R / (4 * f)), v3(0, 0, f), 0.18)); }
    el('brazos', magMerge(arms), M.steelR, xrEdges(magMerge(arms), 40), 0.3, { par: D, y0: -15, y1: 17 });
    const cab = new THREE.BoxGeometry(9, 7, 8); cab.translate(0, 3.5, -17); const fork = [xrBar(v3(-4, 7, -17), v3(-2.6, 15.4, -13.6), 0.5), xrBar(v3(4, 7, -17), v3(2.6, 15.4, -13.6), 0.5)];
    el('cabina', magMerge([cab, ...fork]), M.olive, xrEdges(cab, 30).concat(xrEdges(magMerge(fork), 40)), 0.1, { y0: 0, y1: 16 }); }
  // torre de celosía (tipo «Chain Home») con su antena de dipolos arriba
  { const T = [], H2 = 62, b0 = 5, b1 = 1.8, X = -27, Z = -20, lv = 8;
    const P = (y, sx, sz) => { const b = lerp(b0, b1, y / H2); return v3(X + sx * b, y, Z + sz * b); };
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) T.push(xrBar(P(0, sx, sz), P(H2, sx, sz), 0.28));
    for (let i = 0; i < lv; i++) { const ya = i / lv * H2, yb = (i + 1) / lv * H2; const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (let s = 0; s < 4; s++) { const [ax, az] = C4[s], [bx, bz] = C4[(s + 1) % 4]; T.push(xrBar(P(yb, ax, az), P(yb, bx, bz), 0.16), xrBar(P(ya, ax, az), P(yb, bx, bz), 0.1), xrBar(P(ya, bx, bz), P(yb, ax, az), 0.1)); } }
    for (let i = 0; i < 2; i++) { const y = H2 - 3 - i * 5; T.push(xrBar(v3(X - 7, y, Z + 2), v3(X + 7, y, Z + 2), 0.16)); for (let k = 0; k < 6; k++) { const x = X - 6 + k * 2.4; T.push(xrBar(v3(x, y - 1.8, Z + 2), v3(x, y + 1.8, Z + 2), 0.09)); } }
    const g = magMerge(T); el('torre', g, M.steelR, xrEdges(g, 40), 0.22, { y0: 0, y1: H2 + 2, w: 1.2 }); }
  // reflector: tambor sobre su horquilla y el haz que barre el cielo
  { const S = new THREE.Group(); S.position.set(21, 0, 13); G.add(S); const drum = new THREE.CylinderGeometry(2.4, 2.4, 3.6, 28); drum.rotateX(Math.PI / 2); drum.translate(0, 5.2, 0);
    const base = new THREE.CylinderGeometry(1.6, 2.4, 3.4, 20); base.translate(0, 1.7, 0); const g = magMerge([drum, base]);
    el('reflector', g, M.olive, xrEdges(g, 40), 0.3, { par: S, y0: 0, y1: 8 });
    const bm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { a: { value: 0 } },
      vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
      fragmentShader: '#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform float a; varying float vY; varying vec3 vN; varying vec3 vV; void main(){\n#include <logdepthbuf_fragment>\nfloat c = abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * 1.4, a * pow(c, 1.6) * smoothstep(0.0, 0.9, vY) * 0.5); }' });
    const cone = new THREE.CylinderGeometry(2.2, 16, 150, 32, 1, true); cone.translate(0, -75, 0); cone.rotateX(-Math.PI / 2);   // del tambor hacia +z local
    const beam = new THREE.Mesh(cone, bm); beam.position.set(0, 5.2, 0); beam.renderOrder = 8; beam.frustumCulled = false; S.add(beam); XRo.beamLight = beam; XRo.spot = S; }
  // cielo de noche (degradado azul y estrellas) alrededor de todo
  { const m = new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, uniforms: { a: { value: 0 } },
      vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
      fragmentShader: '#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform float a; varying vec3 vD; float xh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); } void main(){\n#include <logdepthbuf_fragment>\nfloat y = vD.y; vec3 c = mix(vec3(0.05, 0.09, 0.16), vec3(0.008, 0.012, 0.03), smoothstep(-0.1, 0.7, y)); c += vec3(0.09, 0.07, 0.05) * exp(-abs(y + 0.02) * 9.0);\nvec3 q = floor(vD * 260.0); float s = step(0.9965, xh(q)) * smoothstep(0.0, 0.25, y) * (0.5 + 0.5 * xh(q + 7.0)); c += vec3(0.8, 0.85, 1.0) * s * 1.4; gl_FragColor = vec4(c, a); }' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), m); sky.renderOrder = -5; sky.frustumCulled = false; G.add(sky); XRo.sky = sky; }
  XRo.radarG = G; XRo.radarEls = els;
}

// ---------------------------------------------------------------- EL MICROONDAS POR DENTRO
function buildXray(MW) {
  const U = MW.userData, C = MWD.cav, W = MWD.W, H = MWD.H, D = MWD.D, fy0 = MWD.foot, fy1 = fy0 + H, M = xrMats(MW), d = XRD.duct;
  const X = { mw: MW, group: new THREE.Group(), panels: [], hot: [], fans: [] }; MW.add(X.group); X.group.name = 'xray';
  // ---- carcasa en piezas (la original es una sola): marco delantero, paredes de la cavidad y su chapa de fuera; tapa, lados y trasera, que se separan
  U.shell.visible = false; MW.traverse(o => { if (o.isMesh && o.parent === MW && Math.abs(o.position.z + D + 0.05) < 0.02) o.visible = false; });   // (y la tapa trasera suelta)
  { const sh = roundRectShape(-W / 2, fy0, W / 2, fy1, 1.8); sh.holes.push(rectPathXY(C.x0, C.y0, C.x1, C.y1));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.0, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 3, curveSegments: 10 }); g.translate(0, 0, -1.4); xrUV(g, 1 / 48); xrMesh(g, M.shell, X.group); }
  const wallE = MW.userData.M.enamel, win = XRD.win;
  const winShape = (L0, L1, A0, A1, hole) => { const s = new THREE.Shape(); s.moveTo(L0, A0); s.lineTo(L1, A0); s.lineTo(L1, A1); s.lineTo(L0, A1); s.closePath(); if (hole) s.holes.push(rectPathXY(-win.z1, win.y0, -win.z0, win.y1)); return s; };
  { // pared derecha de la cavidad (con la ventana de la guía), esmalte por dentro y chapa por fuera
    for (const [x, m] of [[C.x1, wallE], [C.x1 + 0.05, M.galv]]) { const g = new THREE.ShapeGeometry(winShape(-C.z1, -C.z0, C.y0, C.y1, true)); g.rotateY(Math.PI / 2); g.translate(x, 0, 0); const o = xrMesh(g, m, X.group, false); if (m === M.galv) o.material = M.galv; }
    const pl = (w, h, m, f) => { const g = new THREE.PlaneGeometry(w, h); f(g); return xrMesh(g, m, X.group, false); };
    pl(-C.z0, C.y1 - C.y0, wallE, g => { g.rotateY(Math.PI / 2); g.translate(C.x0, (C.y0 + C.y1) / 2, C.z0 / 2); });
    pl(C.x1 - C.x0, -C.z0, wallE, g => { g.rotateX(Math.PI / 2); g.translate((C.x0 + C.x1) / 2, C.y1, C.z0 / 2); });
    pl(C.x1 - C.x0, -C.z0, wallE, g => { g.rotateX(-Math.PI / 2); g.translate((C.x0 + C.x1) / 2, C.y0, C.z0 / 2); });
    pl(C.x1 - C.x0, -C.z0, M.galv, g => { g.rotateX(-Math.PI / 2); g.translate((C.x0 + C.x1) / 2, C.y1 + 0.06, C.z0 / 2); });            // chapa de fuera, arriba
    pl(C.x1 - C.x0, -C.z0, M.galv, g => { g.rotateX(Math.PI / 2); g.translate((C.x0 + C.x1) / 2, C.y0 - 0.06, C.z0 / 2); });             // y abajo
    pl(C.x1 - C.x0, C.y1 - C.y0, M.galv, g => { g.rotateY(Math.PI); g.translate((C.x0 + C.x1) / 2, (C.y0 + C.y1) / 2, C.z0 - 0.06); }); // y detrás
    pl(W - 1, -D + 1, M.galv, g => { g.rotateX(-Math.PI / 2); g.translate(0, fy0 + 0.06, -D / 2); });                                // chasis (suelo)
  }
  const panel = (w, h, pos, rot, off, t0, rotOff) => { const g = rbox(w, h, 0.16, M.shell, 1.0).geometry; xrUV(g, 1 / 48); const m = M.shell.clone(); const o = xrMesh(g, m, X.group);
    o.position.copy(pos); o.rotation.copy(rot); X.panels.push({ o, p0: pos.clone(), r0: rot.clone(), off, t0, rotOff }); return o; };
  panel(W, D - 0.4, v3(0, fy1 - 0.08, -D / 2 - 0.2), new THREE.Euler(-Math.PI / 2, 0, 0), v3(0, 26, -12), 0.0, v3(-0.22, 0, 0.05));      // tapa
  panel(D - 0.4, H, v3(W / 2 - 0.08, (fy0 + fy1) / 2, -D / 2 - 0.2), new THREE.Euler(0, Math.PI / 2, 0), v3(20, 7, -4), 0.12, v3(0, 0.25, -0.12)); // lado derecho
  panel(W, H, v3(0, (fy0 + fy1) / 2, -D + 0.08), new THREE.Euler(0, 0, 0), v3(0, 6, -24), 0.22, v3(0.12, 0, 0));                         // trasera
  panel(D - 0.4, H, v3(-W / 2 + 0.08, (fy0 + fy1) / 2, -D / 2 - 0.2), new THREE.Euler(0, Math.PI / 2, 0), v3(-7, 3, 0), 0.3, v3(0, -0.1, 0.05)); // lado izquierdo (se aparta poco)

  // ---- la guía de ondas: por dentro (túnel con luz falsa) y por fuera (chapa galvanizada que se vuelve fantasma con P.glow)
  { const dg = new THREE.Group(); X.group.add(dg); X.duct = dg; const Lz = d.z1 - d.z0, Wx = d.x1 - d.x0, Hy = d.y1 - d.y0;
    const lamps = []; for (let k = 0; k < 6; k++) { const z = d.z0 + 1.2 + k * 3.9; lamps.push(v3(d.x1 - 0.35, d.y1 - 0.45, z), v3(d.x0 + 0.35, d.y1 - 0.45, z + 1.95)); }
    const um = new THREE.ShaderMaterial({ vertexShader: XR_DUCT_VS, fragmentShader: XR_DUCT_FS,
      uniforms: { lamps: { value: lamps }, warm: { value: new THREE.Color(1.0, 0.62, 0.3) }, cyan: { value: new THREE.Color(0.45, 0.8, 1.0) }, amb: { value: new THREE.Color(0.05, 0.055, 0.07) },
        lampI: { value: 1 }, beamI: { value: 0 }, z0: { value: d.z0 }, y0: { value: d.y0 }, y1: { value: d.y1 }, fr: { value: [-99, -99, -99, -99, -99, -99] } } });
    X.ductMat = um; const inner = [];
    { const g = new THREE.PlaneGeometry(Wx, Lz); g.rotateX(-Math.PI / 2); g.translate((d.x0 + d.x1) / 2, d.y0, (d.z0 + d.z1) / 2); inner.push(g); }       // suelo
    { const g = new THREE.PlaneGeometry(Wx, Lz); g.rotateX(Math.PI / 2); g.translate((d.x0 + d.x1) / 2, d.y1, (d.z0 + d.z1) / 2); inner.push(g); }        // techo
    { const g = new THREE.PlaneGeometry(Lz, Hy, 1, 1); g.rotateY(-Math.PI / 2); g.translate(d.x1, (d.y0 + d.y1) / 2, (d.z0 + d.z1) / 2); inner.push(g); } // pared de fuera (la de la antena)
    { const s = new THREE.Shape(); s.moveTo(-d.z1, d.y0); s.lineTo(-d.z0, d.y0); s.lineTo(-d.z0, d.y1); s.lineTo(-d.z1, d.y1); s.closePath(); s.holes.push(rectPathXY(-win.z1, win.y0, -win.z0, win.y1));
      const g = new THREE.ShapeGeometry(s); g.rotateY(Math.PI / 2); g.translate(d.x0, 0, 0); inner.push(g); }                                          // pared de la cavidad, con la ventana
    { const g = new THREE.PlaneGeometry(Wx, Hy); g.translate((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, d.z0); inner.push(g); }                              // fondo
    { const g = new THREE.PlaneGeometry(Wx, Hy); g.rotateY(Math.PI); g.translate((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, d.z1); inner.push(g); }          // final
    const ig = magMerge(inner.map(g => { g.deleteAttribute('uv'); return g; })); X.ductIn = new THREE.Mesh(ig, um); dg.add(X.ductIn);
    // por fuera: 5 caras (sin la de la cavidad)
    const t = d.t, out = [];
    const bx = (w, h, dd, x, y, z) => { const g = new THREE.BoxGeometry(w, h, dd); g.translate(x, y, z); return g; };
    out.push(bx(Wx + 2 * t, t, Lz + 2 * t, (d.x0 + d.x1) / 2 + t / 2, d.y0 - t / 2, (d.z0 + d.z1) / 2), bx(Wx + 2 * t, t, Lz + 2 * t, (d.x0 + d.x1) / 2 + t / 2, d.y1 + t / 2, (d.z0 + d.z1) / 2),
      bx(t, Hy, Lz + 2 * t, d.x1 + t / 2, (d.y0 + d.y1) / 2, (d.z0 + d.z1) / 2), bx(Wx, Hy, t, (d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, d.z0 - t / 2), bx(Wx, Hy, t, (d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, d.z1 + t / 2));
    // pestañas con remaches a lo largo (se leen bien desde fuera)
    for (const y of [d.y0 - t - 0.2, d.y1 + t + 0.2]) out.push(bx(0.5, 0.4, Lz + 2 * t, d.x1 + 0.1, y, (d.z0 + d.z1) / 2));
    const og = magMerge(out); X.ductOut = xrMesh(og, M.galvGhost, dg); X.ductOut.renderOrder = 2;
    // lámparas (bombillas cálidas que brillan)
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.7, 0.4).multiplyScalar(6), toneMapped: false }); X.bulbMat = bulb;
    const bg = new THREE.SphereGeometry(0.16, 12, 8); for (const p of lamps) { const b = new THREE.Mesh(bg, bulb); b.position.copy(p); dg.add(b); }
    // frentes de onda (láminas que viajan de la antena a la ventana)
    X.fronts = []; const fm = new THREE.ShaderMaterial({ vertexShader: XR_FRONT_VS, fragmentShader: XR_FRONT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { col: { value: new THREE.Color(0.55, 0.85, 1.6) }, a: { value: 0 } } });
    for (let k = 0; k < 6; k++) { const m = fm.clone(); const o = new THREE.Mesh(new THREE.PlaneGeometry(Wx - 0.1, Hy - 0.1), m); o.position.set((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, -99); o.renderOrder = 7; o.frustumCulled = false; dg.add(o); X.fronts.push(o); } }

  // ---- el magnetrón, con la brida contra la guía y la antena dentro
  X.mag = buildMagnetron({}); MW.add(X.mag.group); X.mag.group.position.set(...XRD.mag); X.mag.group.rotation.set(0, 0, Math.PI / 2);
  X.mag.group.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !o.material.userData.xrDone) { const m = o.material; m.userData.xrDone = true;
    const T = MAGT; if (m.map === T.cuC || m.map === T.cmC) m.userData.xrHotK = 1.0; else if (m.map === T.alC) m.userData.xrHotK = 0.45; else if (m.map === T.znC) m.userData.xrHotK = 0.25;
    if (m.userData.xrHotK) { m.emissive = new THREE.Color(0, 0, 0); X.hot.push(m); } } });
  // ---- transformador de alta tensión: núcleo de chapas (E-I) con sus dos bobinas de cobre
  { const T = new THREE.Group(); T.position.set(17.4, fy0 + 0.06, -13.2); X.group.add(T); X.tr = T;
    const s = new THREE.Shape(); s.moveTo(-5.3, 0); s.lineTo(5.3, 0); s.lineTo(5.3, 8.6); s.lineTo(-5.3, 8.6); s.closePath(); s.holes.push(rectPathXY(-3.6, 1.5, -1.4, 7.1), rectPathXY(1.4, 1.5, 3.6, 7.1));
    const g = new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 }); g.translate(0, 0, -3);
    { const uv = g.attributes.uv, P = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, P.getZ(i) * 4, P.getY(i) * 0.1); }
    xrMesh(g, [M.coreCap, M.core], T);
    const cA = rbox(7.0, 2.6, 8.6, M.coilA, 0.9); cA.position.set(0, 3.0, 0); T.add(cA); const cB = rbox(7.0, 2.4, 8.2, M.coilB, 0.9); cB.position.set(0, 5.75, 0); T.add(cB);
    for (const sz of [-1, 1]) { const f = rbox(13.5, 0.25, 1.6, M.galv, 0.1); f.position.set(0, 0.13, sz * 3.6); T.add(f); }
    X.hot.push(M.coilA, M.coilB); M.coilA.userData.xrHotK = 0.9; M.coilB.userData.xrHotK = 0.9; }
  // ---- condensador de alta tensión (lata ovalada con sus dos terminales) y el diodo
  { const K = new THREE.Group(); K.position.set(13.4, fy0 + 0.06, -27.4); X.group.add(K); X.cap = K;
    const can = rbox(3.8, 4.8, 6.4, M.can, 1.7); can.position.set(0, 2.4, 0); K.add(can);
    const band = rbox(3.86, 1.4, 6.46, M.black, 1.72); band.position.set(0, 2.9, 0); K.add(band);
    for (const z of [-1.4, 1.4]) { const tab = rbox(0.9, 1.0, 0.1, M.tin, 0.08); tab.position.set(0, 5.25, z); K.add(tab); const ins = xrMesh(new THREE.CylinderGeometry(0.55, 0.65, 0.4, 16), M.white, K); ins.position.set(0, 4.95, z); }
    const dio = xrMesh(new THREE.CylinderGeometry(0.34, 0.34, 3.0, 16), M.black, K); dio.rotation.z = Math.PI / 2; dio.position.set(3.4, 1.1, 2.4);
    const bnd = xrMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.35, 16), M.white, K); bnd.rotation.z = Math.PI / 2; bnd.position.set(4.6, 1.1, 2.4); X.diode = dio; }
  // ---- ventilador detrás del magnetrón (sopla sobre las aletas)
  { const F = new THREE.Group(); F.position.set(17, 15.5, -33.8); X.group.add(F); X.fan = F;
    const s = rrShape(11.4, 11.4, 1.2); s.holes.push((() => { const p = new THREE.Path(); p.absarc(0, 0, 5.3, 0, Math.PI * 2, true); return p; })());
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 1, curveSegments: 24 }); g.translate(0, 0, -0.5); xrMesh(g, M.black, F);
    const rot = new THREE.Group(); F.add(rot); X.fans.push(rot); xrMesh(new THREE.CylinderGeometry(1.4, 1.4, 1.2, 24), M.black, rot).rotation.x = Math.PI / 2;
    for (let k = 0; k < 7; k++) { const b = rbox(3.9, 1.7, 0.12, M.black, 0.6); b.position.set(Math.cos(k / 7 * 6.2832) * 3.2, Math.sin(k / 7 * 6.2832) * 3.2, 0); b.rotation.set(0, 0, k / 7 * 6.2832); b.rotateX(0.55); rot.add(b); }
    const mot = xrMesh(new THREE.CylinderGeometry(2.0, 2.0, 1.6, 24), M.can, F); mot.rotation.x = Math.PI / 2; mot.position.z = -1.0;
    for (let k = 0; k < 3; k++) { const a = k / 3 * 6.2832 + 0.3; xrMesh(xrBar(v3(Math.cos(a) * 2, Math.sin(a) * 2, -1.0), v3(Math.cos(a) * 5.4, Math.sin(a) * 5.4, -0.6), 0.2), M.black, F); } }
  // ---- motor del plato, debajo de la cavidad
  { const Mo = new THREE.Group(); Mo.position.set(-6, fy0 + 0.06, -16.5); X.group.add(Mo); X.motor = Mo;
    const box = rbox(5.4, 1.5, 4.2, M.yellow, 0.5); box.position.set(0, 0.8, 0); Mo.add(box); const c = xrMesh(new THREE.CylinderGeometry(2.0, 2.0, 1.0, 28), M.can, Mo); c.position.set(-1.2, 2.0, 0);
    const sh = xrMesh(new THREE.CylinderGeometry(0.25, 0.25, 2.2, 10), M.tin, Mo); sh.position.set(0, 2.4, 0); }
  // ---- placa de control detrás del panel
  { const pcb = rbox(11, 24.5, 0.16, M.pcb, 0.3); pcb.position.set(17.9, 15.2, -2.6); X.group.add(pcb); X.pcb = pcb;
    for (let i = 0; i < 5; i++) { const c = xrMesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 14), i % 2 ? M.wB : M.black, X.group); c.rotation.x = Math.PI / 2; c.position.set(14 + i * 1.6, 6 + (i % 3) * 3, -3.3); }
    const relay = rbox(2.4, 2.0, 1.6, M.white, 0.2); relay.position.set(20.5, 9, -3.5); X.group.add(relay); }
  // ---- cables
  xrWire([[17.4, 7.6, -9.5], [16, 10, -16], [14.5, 8.5, -23], [13.4, 6.4, -26]], 0.2, M.wR, X.group);                  // alta tensión: transformador → condensador
  xrWire([[13.4, 6.4, -28.8], [15.5, 9.5, -30.5], [19.5, 18.5, -29.5], [20.3, 20.4, -26.4]], 0.13, M.wY, X.group);        // condensador → filamento del magnetrón
  xrWire([[14.0, 6.0, -28.8], [16.5, 8.5, -31.5], [21, 18, -30.5], [20.3, 20.4, -25.6]], 0.13, M.wK, X.group);
  xrWire([[19.5, 2.4, -8.2], [20.5, 3.5, -5.5], [20.5, 6, -3.2]], 0.13, M.wW, X.group); xrWire([[15.2, 2.4, -8.2], [14.5, 3.5, -5], [14.5, 7, -3.2]], 0.13, M.wB, X.group);
  xrWire([[21.5, 12, -33.8], [23, 9, -30], [23, 8, -12], [21, 9, -3.4]], 0.11, M.wK, X.group);
  xrWire([[-3.5, 1.4, -16.5], [5, 1.3, -17], [12, 1.3, -10], [16, 4, -3.2]], 0.11, M.wW, X.group);

  // ---- el radar
  xrBuildRadar(X, M);
  // ---- anclas para los rótulos (posición del mundo)
  const wp = o => o.getWorldPosition(new THREE.Vector3());
  X.anchors = { get magnetron() { return wp(X.mag.group); }, get transformer() { return X.tr.localToWorld(v3(0, 9, 0)); }, get capacitor() { return X.cap.localToWorld(v3(0, 5.6, 0)); },
    get fan() { return wp(X.fan); }, get waveguide() { return X.duct.localToWorld(v3((d.x0 + d.x1) / 2, d.y1 + 0.5, -20)); }, get mica() { return MW.localToWorld(v3(C.x1, 15.5, -14)); } };
  X.tris = 0; X.group.traverse(o => { if (o.isMesh && o.geometry) X.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); });
  XR = X; xrayAt(0, {}); return X;
}

// ---------------------------------------------------------------- estado por fotograma
function xrayAt(t, P = {}, X = XR) {
  if (!X) return;
  const open = clamp(P.open ?? 0), glow = clamp(P.glow ?? 0), hot = clamp(P.hot ?? 0), fan = P.fan ?? 0, lift = clamp(P.lift ?? 0), radar = clamp(P.radar ?? 0), beam = clamp(P.beam ?? 0), fly = P.fly ?? -1;
  // carcasa en despiece: cada panel sale hacia fuera a su ritmo y se vuelve algo transparente
  for (const p of X.panels) { const k = xrS5((open - p.t0) / 0.62); p.o.position.copy(p.p0).addScaledVector(p.off, k); p.o.rotation.set(p.r0.x + p.rotOff.x * k, p.r0.y + p.rotOff.y * k, p.r0.z + p.rotOff.z * k);
    const op = 1 - 0.62 * k; p.o.material.transparent = op < 0.999; p.o.material.opacity = op; p.o.material.depthWrite = op > 0.7; p.o.visible = op > 0.02; }
  // rayos X: borde cian en las tripas; la guía por fuera se vuelve fantasma para ver los frentes de onda
  XRU.rim.value.setRGB(0.25 * glow, 0.8 * glow, 1.1 * glow);
  X.ductOut.material.opacity = 1 - 0.7 * glow; X.ductOut.material.transparent = glow > 0.001; X.ductOut.material.depthWrite = glow < 0.5;
  X.ductOut.visible = fly < 0;      // con la cámara entrando en la guía, la chapa de fuera no estorba
  // calor: el magnetrón y las bobinas del transformador, al rojo suave
  for (const m of X.hot) m.emissive.setRGB(1.0, 0.36, 0.1).multiplyScalar(hot * 0.55 * (m.userData.xrHotK || 1));
  // ventilador
  for (const r of X.fans) r.rotation.z = -t * fan * 14;
  // el magnetrón sube: sale de la guía (+x), sube unos 25 cm y se pone de pie girando despacio
  { const G = X.mag.group, k1 = xrS5(lift / 0.25), k2 = xrS5((lift - 0.18) / 0.82);
    const p0 = v3(...XRD.mag), p1 = v3(XRD.mag[0] + 4.4, XRD.mag[1], XRD.mag[2]), p2 = v3(...XRD.lift);
    G.position.copy(p0).lerp(p1, k1).lerp(p2, k2);
    const q0 = new THREE.Quaternion().setFromEuler(xrTmpE.set(0, 0, Math.PI / 2)), q2 = new THREE.Quaternion().setFromEuler(xrTmpE.set(-0.18, 0.75 + t * 0.35, 0, 'YXZ'));
    G.quaternion.copy(q0).slerp(q2, k2); }
  magnetronAt(t, { glow: hot, wave: lift > 0.5 ? beam * 0.6 : 0 }, X.mag);
  // los frentes de onda en la guía: salen de la antena y viajan hasta la ventana
  { const d = XRD.duct, z0 = XRD.mag[2] + 0.6, z1 = -13.0, L = z1 - z0, sp = L / 6, on = lift < 0.05 ? beam : 0, fr = X.ductMat.uniforms.fr.value;
    X.fronts.forEach((o, k) => { const z = z0 + ((t * 7.5 + k * sp) % L); o.position.z = z; const a = on * Math.min(1, (z - z0) / 1.2) * (1 - magSst(-16.5, z1, z)); o.material.uniforms.a.value = a; o.visible = a > 0.002; fr[k] = a > 0.002 ? z : -99; });
    X.ductMat.uniforms.beamI.value = 1.6 * (lift < 0.05 ? beam : 0); X.ductMat.uniforms.lampI.value = 0.9 + (fly >= 0 ? 0.6 : 0); }
  // la mica: brilla cuando pasan las ondas y se aclara cuando la cámara la cruza
  { const mm = X.mw.userData.mica.material, cross = fly >= 0 ? magSst(0.58, 0.72, fly) : 0; mm.transparent = cross > 0.001; mm.opacity = 1 - 0.92 * cross; mm.depthWrite = cross < 0.5;
    mm.emissive = mm.emissive || new THREE.Color(); mm.emissive.setRGB(0.45, 0.35, 1.0).multiplyScalar(0.5 * beam * (lift < 0.05 ? 1 : 0)); }
  // el radar: cada pieza se dibuja en líneas y se rellena de abajo arriba (y al revés al irse)
  { X.radarG.visible = radar > 0.002; const gy = X.radarG.getWorldPosition(xrTmpV).y;
    for (const e of X.radarEls) { const p = clamp((radar - e.delay) / 0.6), wire = magSst(0, 0.25, p) * (1 - 0.65 * magSst(0.75, 1, p)), fill = magSst(0.25, 0.95, p);
      e.l.material.opacity = wire; e.l.visible = wire > 0.01; e.o.visible = fill > 0.001;
      const wy = e.o.getWorldPosition(xrTmpV).y, h = wy + lerp(e.y0 - 2, e.y1 + 6, fill);
      e.m.userData.xrU.xrFill.value = fill >= 0.999 ? 1e5 : h; e.m.userData.xrU.xrBand.value = magSst(0.2, 0.35, p) * (1 - magSst(0.85, 1, p)); }
    X.sky.material.uniforms.a.value = magSst(0, 0.45, radar);
    X.beamLight.material.uniforms.a.value = magSst(0.45, 0.85, radar); X.spot.rotation.set(0, -2.2 + Math.sin(t * 0.9) * 0.7, 0); X.beamLight.rotation.x = -(0.95 + Math.sin(t * 0.6) * 0.12); }
}

// ---------------------------------------------------------------- la cámara que vuela por la guía (coordenadas del MUNDO)
function xrayCam(u, X = XR) {
  const KS = [[0.0, [11.6, 17.6, -30.5], [11.4, 16.4, -22.0], 72], [0.3, [11.3, 17.0, -24.0], [11.0, 16.0, -15.0], 74], [0.55, [11.1, 16.2, -17.6], [10.4, 15.8, -10.5], 74],
    [0.7, [10.7, 15.7, -14.6], [6.0, 15.3, -14.2], 70], [0.82, [7.6, 15.4, -14.2], [-4.0, 12.5, -15.0], 62], [1.0, [1.5, 15.2, -12.5], [-10.0, 9.0, -17.5], 54]];
  const c = camKeys(clamp(u), KS), mw = X ? X.mw : null; const p = c.p.clone(), l = c.l.clone(); if (mw) { mw.updateWorldMatrix(true, false); p.applyMatrix4(mw.matrixWorld); l.applyMatrix4(mw.matrixWorld); }
  return [p.x, p.y, p.z, l.x, l.y, l.z, c.f];
}
