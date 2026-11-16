// ---------------------------------------------------------------- EL MAPA DEL MUNDO DE NOCHE (el suelo de la maqueta). Prefijo map.
// Plano en y = 0, equirrectangular (mapP de 05_world.js: 10 unidades por grado, lon −200..160, 3600 × 1800). Texturas de geo_prep.py
// (Natural Earth, dominio público): mapa entero 8192² + detalle del Atlántico (lon −50..10, lat −10..50) y de Tonga (lon −182..−170, lat −25..−13).
// Luces de las ciudades (emisivas, cálidas); las de Mauritania y Tonga van aparte, y encima de esos dos países una capa cian de «internet».
// Cables: ~670 cintas planas de luz (rutas ilustrativas, no datos de TeleGeography) + EllaLink (dorado), el cable de Tonga y ACE.
//   buildMap() → Group   ·   mapAt(t, o)   ·   mapAnchor(nombre) → Vector3
//   o = { draw: 0..1 (aparecen los cables desde sus extremos), glow: brillo de los cables (1), lights: luces de las ciudades (1),
//         ella: posición del pulso de EllaLink de Sines (0) a Fortaleza (1) (< 0 sin pulso), ellaHi: resalte dorado de EllaLink (1),
//         breaks: 0..1 (roturas al azar por el mundo, van saliendo), ace: 0..1 (se rompe ACE frente a Mauritania), tongaCut: 0..1 (se rompe el de Tonga),
//         mauritania: 1 con internet / 0 sin (capa cian), tonga: igual, mauLights / tonLights: luces cálidas de las casas (1; no hace falta tocarlas),
//         sat: 0..1 (el satélite aparece) }
// Anclas: 'mauritania' (centro del país), 'nkc' (Nuakchot), 'ace' (rotura de ACE), 'tonga' (Nukuʻalofa), 'fiji' (Suva), 'tongacut', 'sat',
//         'ella0'..'ella3' (Sines, Funchal, Praia, Fortaleza), 'center'.
// Ojo: en los planos muy altos (el mapa entero) la niebla del ambiente 'museo' se lo come: baja S.fogK (p. ej. 0.05) y vuelve a llamar a moodSet.
const MAP_ATL = [-50, 10, -10, 50], MAP_TON = [-182, -170, -25, -13];
const MAP_Y = 0.12;                                   // altura de los cables sobre el mapa
const MAPS = { anchors: {}, u: null, cu: null };
const mapLL = (lon, lat, y = 0) => new THREE.Vector3((lon - LON0) * MAPK, y, -lat * MAPK);   // sin envolver (los cables pueden salirse del borde)
function mapAnchor(n) { const a = MAPS.anchors[n]; return a ? a.clone() : null; }
function mapTexL(p, srgb) { const t = tx('map/' + p, srgb); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }

// ---------- el plano: MeshStandardMaterial (le da la luz del museo y la niebla) con el muestreo cambiado: mapa base + detalles sin costura
function mapPlane() {
  const geo = new THREE.PlaneGeometry(3600, 1800, 1, 1); geo.rotateX(-Math.PI / 2);
  const baseC = mapTexL('base_color.jpg', true), baseL = mapTexL('base_lights.png', false);
  const u = MAPS.u = {
    tAtlC: { value: mapTexL('atl_color.jpg', true) }, tAtlL: { value: mapTexL('atl_lights.png', false) },
    tTonC: { value: mapTexL('ton_color.jpg', true) }, tTonL: { value: mapTexL('ton_lights.png', false) },
    rAtl: { value: new THREE.Vector4(...MAP_ATL) }, rTon: { value: new THREE.Vector4(...MAP_TON) },
    uLights: { value: 1 }, uMauL: { value: 1 }, uTonL: { value: 1 }, uMauNet: { value: 1 }, uTonNet: { value: 1 }, uTime: { value: 0 },
  };
  const m = new THREE.MeshStandardMaterial({ map: baseC, emissiveMap: baseL, emissive: 0xffffff, roughness: 0.82, metalness: 0.0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec2 vMP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMP = position.xz;');
    sh.fragmentShader = `varying vec2 vMP; uniform sampler2D tAtlC, tAtlL, tTonC, tTonL; uniform vec4 rAtl, rTon; uniform float uLights, uMauL, uTonL, uMauNet, uTonNet, uTime;
      vec2 mapLonLat(){ return vec2(vMP.x / ${MAPK.toFixed(1)} + ${LON0.toFixed(1)}, -vMP.y / ${MAPK.toFixed(1)}); }
      vec2 rUv(vec4 r, vec2 ll){ return vec2((ll.x - r.x) / (r.y - r.x), (ll.y - r.z) / (r.w - r.z)); }
      float rW(vec2 q){ vec2 e = min(q, 1.0 - q); return smoothstep(0.0, 0.06, min(e.x, e.y)); }
      ` + sh.fragmentShader
      .replace('#include <map_fragment>', `
        vec2 ll = mapLonLat(); vec2 qa = rUv(rAtl, ll), qt = rUv(rTon, ll); float wa = rW(qa), wt = rW(qt);
        vec4 mc = texture2D(map, vMapUv);
        if (wa > 0.0) mc = mix(mc, texture2D(tAtlC, qa), wa);
        if (wt > 0.0) mc = mix(mc, texture2D(tTonC, qt), wt);
        diffuseColor *= mc;`)
      .replace('#include <emissivemap_fragment>', `
        vec3 L = texture2D(emissiveMap, vMapUv).rgb;
        if (wa > 0.0) L = mix(L, texture2D(tAtlL, qa).rgb, wa);
        if (wt > 0.0) L = mix(L, texture2D(tTonL, qt).rgb, wt);
        bool isT = ll.x < -150.0; float cL = isT ? uTonL : uMauL, cN = isT ? uTonNet : uMauNet;
        float warm = (L.r + L.g * cL) * uLights;
        vec3 em = vec3(1.0, 0.62, 0.30) * (warm * 1.6 + warm * warm * 2.2);
        // internet: una red cian sobre el país (rejilla fina que respira + borde); se apaga con cN = 0
        float msk = isT ? min(1.0, L.b * 2.5) : L.b; vec2 gq = ll * (isT ? 12.0 : 3.0); vec2 gf = abs(fract(gq) - 0.5);
        float grid = smoothstep(0.43, 0.5, max(gf.x, gf.y));
        float edge = smoothstep(0.25, 0.5, msk) * (1.0 - smoothstep(0.5, 0.85, msk));
        float br = 0.75 + 0.25 * sin(uTime * 3.0 + ll.x * 2.0 + ll.y * 1.3);
        em += vec3(0.25, 0.95, 1.0) * cN * (msk * 0.09 * br + edge * 0.55 + L.g * 1.9);
        totalEmissiveRadiance = em;`);
  };
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.renderOrder = -1; return mesh;
}

// ---------- los cables: una geometría de cintas (2 vértices por punto), shader propio aditivo
const MAP_CAB_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 nrm; attribute float side, sArc; attribute vec4 cab; attribute vec2 brk; attribute float clen;
uniform float uW0, uWk; varying float vSide, vS, vLen; varying vec4 vCab; varying vec2 vBrk; varying float vX;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); float d = distance(wp.xyz, cameraPosition);
  vec3 vd = (wp.xyz - cameraPosition) / d; vec2 hz = normalize(vd.xz + 1e-5);
  float w = uW0 + uWk * d; if (cab.y > 0.5) w *= (cab.y < 1.5 ? 1.8 : 1.4);
  w *= mix(1.0, 1.0 / max(0.25, abs(vd.y)), abs(dot(nrm, hz)));            // de canto (plano oblicuo) se ensancha para no verse a trazos
  wp.xz += nrm * side * w * 0.5; vSide = side; vS = sArc; vLen = clen; vCab = cab; vBrk = brk; vX = position.x;
  gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
const MAP_CAB_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uDraw, uGlow, uElla, uEllaHi, uBreaks, uAce, uTonCut, uTime; uniform vec3 cCab, cElla, cRed;
varying float vSide, vS, vLen; varying vec4 vCab; varying vec2 vBrk; varying float vX;
void main(){
#include <logdepthbuf_fragment>
  if (abs(vX) > 1800.0) discard;
  float kind = vCab.y;
  // aparece desde los dos extremos hacia el medio (desfase por cable)
  float r = clamp((uDraw - vCab.x * 0.55) / 0.45, 0.0, 1.0);
  float e = min(vS, 1.0 - vS) * vLen, front = r * 0.5 * vLen + (r >= 1.0 ? 1e5 : 0.0);
  if (e > front) discard;
  float head = r < 1.0 ? exp(-pow((front - e) / 6.0, 2.0)) : 0.0;
  float prof = exp(-vSide * vSide * 3.2);
  vec3 c = cCab * (0.85 + 0.15 * vCab.z);
  float I = 1.3 * uGlow;
  if (kind > 0.5 && kind < 1.5) { c = mix(cCab, cElla, uEllaHi); I = mix(1.3, 2.4, uEllaHi) * uGlow;
    if (uElla >= 0.0) { float p = exp(-pow((vS - uElla) * vLen / 9.0, 2.0)); c += vec3(1.0, 0.9, 0.7) * p * 3.0; } }
  vec3 col = c * I * (0.55 + 0.45 * prof) + vec3(1.0) * prof * head * 4.0;
  // roturas: tramo rojo alrededor del punto (y un hueco en el medio)
  float bk = kind > 1.5 && kind < 2.5 ? uAce : kind > 2.5 ? uTonCut : (vBrk.y >= 0.0 ? clamp((uBreaks - vBrk.y) * 12.0, 0.0, 1.0) : 0.0);
  if (bk > 0.0) { float db = abs(vS - vBrk.x) * vLen; float rl = max(22.0, length(vec2(dFdx(vS), dFdy(vS))) * vLen * 9.0); float red = bk * (1.0 - smoothstep(rl * 0.45, rl, db));
    col = mix(col, cRed * (2.2 + 1.2 * sin(uTime * 9.0)), red); if (db < 0.8 * bk) discard; }
  float a = prof * (0.6 + 0.4 * prof);
  gl_FragColor = vec4(col * a, 1.0); }`;

function mapCables(J) {
  const P = [], NR = [], SD = [], SA = [], CB = [], BK = [], CL = [], IX = [];
  const rnd = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(12345);
  const n = J.cables.length, NB = 70;
  // roturas al azar: NB cables (no especiales) con su punto y su orden de aparición
  const order = [...Array(n).keys()].filter(i => !J.cables[i].n).sort(() => rnd() - 0.5).slice(0, NB);
  const brkOf = {}; order.forEach((ci, k) => { brkOf[ci] = [0.25 + 0.5 * rnd(), k / NB * 0.95]; });
  MAPS.cables = []; MAPS.sparks = [];
  J.cables.forEach((c, ci) => {
    const pts = []; for (let i = 0; i < c.p.length; i += 2) pts.push([c.p[i] / J.scale, c.p[i + 1] / J.scale]);
    const xz = pts.map(([lo, la]) => [(lo - LON0) * MAPK, -la * MAPK]);
    const s = [0]; for (let i = 1; i < xz.length; i++) s.push(s[i - 1] + Math.hypot(xz[i][0] - xz[i - 1][0], xz[i][1] - xz[i - 1][1]));
    const L = s[s.length - 1] || 1;
    const kind = c.n === 'EllaLink' ? 1 : c.n === 'ACE' ? 2 : c.n === 'Tonga Cable' ? 3 : 0;
    let bx = -1, by = -1;
    if (brkOf[ci]) [bx, by] = brkOf[ci];
    const near = (lo, la) => { let b = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p[0] - lo, p[1] - la); if (d < bd) { bd = d; b = i; } }); return s[b] / L; };
    if (kind === 2) bx = near(-16.75, 17.4);              // ACE: frente a Nuakchot
    if (kind === 3) bx = near(-175.55, -20.75);           // Tonga: cerca del volcán (Hunga Tonga)
    const delay = kind ? 0 : rnd(), tone = rnd();
    MAPS.cables.push({ pts, xz, s, L, kind, name: c.n || '', stops: c.s || [] });
    if (bx >= 0) { const k = Math.max(1, s.findIndex(v => v >= bx * L)); const t0 = (bx * L - s[k - 1]) / Math.max(1e-6, s[k] - s[k - 1]);
      MAPS.sparks.push({ x: lerp(xz[k - 1][0], xz[k][0], t0), z: lerp(xz[k - 1][1], xz[k][1], t0), rank: kind === 2 ? -2 : kind === 3 ? -3 : by }); if (kind === 2) MAPS.anchors.ace = new THREE.Vector3(MAPS.sparks.at(-1).x, 0, MAPS.sparks.at(-1).z); if (kind === 3) MAPS.anchors.tongacut = new THREE.Vector3(MAPS.sparks.at(-1).x, 0, MAPS.sparks.at(-1).z); }
    // si el cable sale del mapa por un lado, se dibuja otra vez desplazado 360° (el shader recorta |x| > 1800)
    const xs = xz.map(p => p[0]), shifts = [0];
    if (Math.min(...xs) < -1800) shifts.push(3600); if (Math.max(...xs) > 1800) shifts.push(-3600);
    for (const sh of shifts) {
      const base = P.length / 3;
      for (let i = 0; i < xz.length; i++) {
        const a = xz[Math.max(0, i - 1)], b = xz[Math.min(xz.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
        for (const sd of [-1, 1]) { P.push(xz[i][0] + sh, MAP_Y + (kind ? 0.05 : 0) + (ci % 7) * 0.004, xz[i][1]); NR.push(-dz, dx); SD.push(sd); SA.push(s[i] / L); CB.push(delay, kind, tone, 0); BK.push(bx, kind ? -1 : by); CL.push(L); }
        if (i) { const k = base + i * 2; IX.push(k - 2, k - 1, k, k - 1, k + 1, k); }
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('nrm', new THREE.Float32BufferAttribute(NR, 2));
  g.setAttribute('side', new THREE.Float32BufferAttribute(SD, 1)); g.setAttribute('sArc', new THREE.Float32BufferAttribute(SA, 1));
  g.setAttribute('cab', new THREE.Float32BufferAttribute(CB, 4)); g.setAttribute('brk', new THREE.Float32BufferAttribute(BK, 2)); g.setAttribute('clen', new THREE.Float32BufferAttribute(CL, 1));
  g.setIndex(IX);
  const u = MAPS.cu = { uDraw: { value: 1 }, uGlow: { value: 1 }, uElla: { value: -1 }, uEllaHi: { value: 1 }, uBreaks: { value: 0 }, uAce: { value: 0 }, uTonCut: { value: 0 }, uTime: { value: 0 },
    uW0: { value: 0.12 }, uWk: { value: 0.0011 }, cCab: { value: new THREE.Color(0x5fe8ff) }, cElla: { value: new THREE.Color(COL.gold) }, cRed: { value: new THREE.Color(COL.red) } };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: MAP_CAB_VS, fragmentShader: MAP_CAB_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2; return mesh;
}

// ---------- chispas de las roturas (sprites aditivos, tamaño mínimo en píxeles para que se vean también desde muy alto)
function mapSparks() {
  const n = MAPS.sparks.length, P = new Float32Array(n * 3), R = new Float32Array(n);
  MAPS.sparks.forEach((s, i) => { P.set([s.x, MAP_Y + 0.4, s.z], i * 3); R[i] = s.rank; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('rank', new THREE.BufferAttribute(R, 1));
  const u = MAPS.su = { uBreaks: { value: 0 }, uAce: { value: 0 }, uTonCut: { value: 0 }, uTime: { value: 0 }, uPR: { value: PR }, tS: { value: starTex0() } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
      attribute float rank; uniform float uBreaks, uAce, uTonCut, uTime, uPR; varying float vK, vF;
      void main(){ float k = rank < -2.5 ? uTonCut : rank < -1.5 ? uAce : clamp((uBreaks - rank) * 12.0, 0.0, 1.0); vK = k;
        float ph = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
        vF = 0.6 + 0.4 * sin(uTime * 23.0 + ph * 40.0) * sin(uTime * 7.0 + ph * 13.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float d = -mv.z; gl_PointSize = k <= 0.0 ? 0.0 : uPR * clamp(2600.0 * 4.0 / d, 26.0, 120.0) * (0.7 + 0.5 * vF) * (1.0 + 1.5 * (1.0 - k) * step(0.001, k));
#include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
      uniform sampler2D tS; varying float vK, vF;
      void main(){
#include <logdepthbuf_fragment>
        if (vK <= 0.0) discard; vec2 q = gl_PointCoord - 0.5; float r = length(q);
        float a = texture2D(tS, gl_PointCoord).a; float star = max(0.0, 1.0 - abs(q.x) * 14.0) * max(0.0, 1.0 - abs(q.y) * 2.2) + max(0.0, 1.0 - abs(q.y) * 14.0) * max(0.0, 1.0 - abs(q.x) * 2.2);
        vec3 c = mix(vec3(1.0, 0.25, 0.12), vec3(1.0, 0.85, 0.6), smoothstep(0.25, 0.0, r));
        gl_FragColor = vec4(c * (a * 3.0 + star * 2.5) * vF * vK, 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 3; return p;
}

// ---------- el satélite: cuerpo dorado, dos alas de paneles solares, antena, luz que parpadea; haz tenue hasta el mapa
function mapSatellite() {
  const g = new THREE.Group(), s = new THREE.Group(); g.add(s);
  const foil = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.32, metalness: 1, emissive: 0x6a4410, emissiveIntensity: 0.8 });
  const white = paint(0xeef1f5, 0.35), dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, metalness: 0.6 });
  const pT = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#0d1b3a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { const x = 8 + i * 62, y = 8 + j * 50; const gr = c.createLinearGradient(x, y, x + 58, y + 46); gr.addColorStop(0, '#2f5fc4'); gr.addColorStop(1, '#173a8a'); c.fillStyle = gr; c.fillRect(x, y, 56, 44);
      c.strokeStyle = 'rgba(160,200,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 28, y); c.lineTo(x + 28, y + 44); c.moveTo(x, y + 22); c.lineTo(x + 56, y + 22); c.stroke(); } });
  const panM = new THREE.MeshPhysicalMaterial({ map: pT, roughness: 0.25, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x4f86ff, emissiveIntensity: 1.1, emissiveMap: pT });
  const body = rbox(1.6, 1.6, 2.0, foil, 0.12); s.add(body);
  const top = rbox(1.7, 0.18, 2.1, white, 0.05); top.position.y = 0.88; s.add(top);
  for (const sd of [-1, 1]) {
    const arm = bar(v3(sd * 0.8, 0, 0), v3(sd * 1.6, 0, 0), 0.06, dark); s.add(arm);
    const wing = new THREE.Group(); wing.position.x = sd * 1.6;
    for (let k = 0; k < 2; k++) { const pn = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 1.5), [dark, dark, panM, dark, dark, dark]); pn.position.x = sd * (1.25 + k * 2.4); pn.castShadow = true; wing.add(pn); }
    s.add(wing);
  }
  const dish = lathe([[0.02, 0], [0.45, 0.12], [0.72, 0.32], [0.74, 0.34]], 32, white); dish.rotation.x = Math.PI; dish.position.y = -1.0; s.add(dish);
  s.add(bar(v3(0, -1.0, 0), v3(0, -1.45, 0), 0.03, dark));
  const ant = bar(v3(0, 0.95, 0.5), v3(0, 2.0, 0.5), 0.025, white); s.add(ant);
  const blink = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4040, toneMapped: false })); blink.position.set(0, 2.05, 0.5); s.add(blink);
  // el haz: cono abierto que se desvanece hacia el mapa + un círculo de luz en el suelo
  const bT = canvasTex(8, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe8ff).multiplyScalar(0.045), map: bT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 1, 1, 48, 1, true), beamM); beam.geometry.translate(0, -0.5, 0); g.add(beam);
  const fT = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(0.8, 'rgba(255,255,255,.25)'); gr.addColorStop(0.92, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const foot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fe8ff).multiplyScalar(0.10), map: fT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  foot.rotation.x = -Math.PI / 2; g.add(foot);
  s.scale.setScalar(2.6);
  g.userData = { s, beam, foot, blink, beamM, footM: foot.material };
  return g;
}
const MAP_SAT_LL = [-31, 21], MAP_SAT_Y = 95, MAP_SAT_R = 22;

function buildMap() {
  const g = new THREE.Group(); g.name = 'map';
  g.add(mapPlane());
  MAPS.group = g;
  const A = MAPS.anchors;
  A.center = mapLL(-20, 0); A.mauritania = mapLL(-10.6, 20.2); A.nkc = mapLL(-15.97, 18.08); A.tonga = mapLL(-175.2, -21.14); A.fiji = mapLL(178.44 - 360, -18.14);
  A.sat = mapLL(MAP_SAT_LL[0], MAP_SAT_LL[1], MAP_SAT_Y);
  // los cables llegan por fetch (JSON): la carga se suma a las texturas pendientes
  let ok; PENDING.push(new Promise(a => { ok = a; }));
  fetch(ASSET + 'map/cables.json').then(r => r.json()).then(J => {
    const cab = mapCables(J); g.add(cab); g.add(MAPS.sparkPts = mapSparks()); MAPS.cabMesh = cab;
    ['Sines', 'Funchal', 'Praia', 'Fortaleza'].forEach((n, i) => { const p = J.stops[n]; A['ella' + i] = mapLL(p[0], p[1]); });
    ok();
  }).catch(e => { console.error('ERROR cables ' + e); ok(); });
  const sat = MAPS.sat = mapSatellite(); sat.position.copy(A.sat); g.add(sat);
  sat.userData.beam.scale.set(MAP_SAT_R, MAP_SAT_Y, MAP_SAT_R); sat.userData.foot.scale.setScalar(MAP_SAT_R * 2); sat.userData.foot.position.y = -MAP_SAT_Y + 0.2;
  g.userData.anchors = A;
  return g;
}

function mapAt(t, o = {}) {
  const u = MAPS.u, cu = MAPS.cu, su = MAPS.su;
  if (u) { u.uLights.value = o.lights ?? 1; u.uMauL.value = o.mauLights ?? 1; u.uTonL.value = o.tonLights ?? 1; u.uMauNet.value = o.mauritania ?? 1; u.uTonNet.value = o.tonga ?? 1; u.uTime.value = t; }
  if (cu) { cu.uDraw.value = o.draw ?? 1; cu.uGlow.value = o.glow ?? 1; cu.uElla.value = o.ella ?? -1; cu.uEllaHi.value = o.ellaHi ?? 1;
    cu.uBreaks.value = o.breaks ?? 0; cu.uAce.value = o.ace ?? 0; cu.uTonCut.value = o.tongaCut ?? 0; cu.uTime.value = t; }
  if (su) { su.uBreaks.value = o.breaks ?? 0; su.uAce.value = o.ace ?? 0; su.uTonCut.value = o.tongaCut ?? 0; su.uTime.value = t; }
  const S2 = MAPS.sat; if (S2) { const k = o.sat ?? 1; S2.visible = k > 0.002; const d = S2.userData;
    d.s.position.y = Math.sin(t * 0.9) * 0.6; d.s.rotation.y = 0.5 + Math.sin(t * 0.3) * 0.15; d.s.rotation.z = Math.sin(t * 0.7) * 0.05;
    d.s.scale.setScalar(2.6 * Math.max(0.001, eo(clamp(k)))); d.beamM.opacity = k; d.footM.opacity = k; d.blink.visible = (t * 1.2) % 1 < 0.15; }
}
