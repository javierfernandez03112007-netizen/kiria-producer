// Reel «Del estrecho de Ormuz a tu casa» — motor 3D monocromo (three.js). window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  W, H, clamp, prog, lerp, eo, eio, ss, loglerp, ll, loadTopo, ringSegments, basicLines, fatLines, polySegments,
  arcPoints, surfaceRoute, Path, placeOnSphere, textSprite, makeShip, makeSatellite, makeTruck, makeCar, makeTree,
  makeLamp, makeHouse, makeHeroHouse, mat, glowMat, box,
} from './lib.js';

// ---------------------------------------------------------------- línea de tiempo (voz alineada)
const K = {
  arcs: 4.03, ormuz: 11.94, cuarta: 13.65, todo: 15.95, paso: 18.81, cuello: 21.49, tension: 23.87, teme: 25.28,
  sube: 27.38, brent: 28.89, setenta: 29.9, marzo: 32.08, sept: 34.39, espana: 37.43, bce: 38.62, transporte: 43.10,
  combustibles: 46.42, inflacion: 48.47, notado: 52.11, leo: 54.20, porque: 55.71,
};
const END = 60.0, ENTRY_END = 4.1, EXIT_START = 55.5;
const HORMUZ = [56.4, 26.5], GRANADA = [-3.6, 37.18];
const DEST = { 'EUROPA': [4.5, 51.9], 'ESPAÑA': [-5.4, 36.1], 'INDIA': [72.8, 19.0], 'CHINA': [121.5, 31.2],
  'JAPÓN': [139.7, 35.6], 'SINGAPUR': [103.8, 1.3], 'ÁFRICA': [18.4, -33.9], 'EE. UU.': [-95.0, 29.7] };

// ---------------------------------------------------------------- render base
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
document.body.appendChild(renderer.domElement);
const rtOpts = { type: THREE.HalfFloatType, samples: 4 };
const rtA = new THREE.WebGLRenderTarget(W, H, rtOpts), rtB = new THREE.WebGLRenderTarget(W, H, rtOpts);
const rtC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const mixMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, mixAB: { value: 0 }, blur: { value: 0 }, white: { value: 0 },
    black: { value: 0 }, vig: { value: 0.35 }, wipeC: { value: new THREE.Vector2(0.5, 0.5) }, wipeR: { value: 0 }, wipeCol: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA,tB; uniform float mixAB,blur,white,black,vig,wipeR,wipeCol; uniform vec2 wipeC; varying vec2 vUv;
    void main(){ vec2 c=vec2(.5); vec3 a=vec3(0.), b=vec3(0.);
      for(int i=0;i<8;i++){ float s=1.0-blur*0.3*float(i)/7.0; vec2 uv=c+(vUv-c)*s;
        a+=texture2D(tA,uv).rgb; b+=texture2D(tB,uv).rgb; }
      vec3 col=mix(a,b,mixAB)/8.0;
      float l=dot(col,vec3(0.2126,0.7152,0.0722)); col=vec3(l);
      vec2 d=(vUv-c)*vec2(0.5625,1.0); col*=1.0-vig*smoothstep(0.25,0.75,length(d)*1.6);
      vec2 dw=(vUv-wipeC)*vec2(0.5625,1.0); float wm=1.0-smoothstep(wipeR*0.92,wipeR,length(dw)); col=mix(col,vec3(wipeCol),wm*step(0.0001,wipeR));
      col=mix(col,vec3(1.0),white); col=mix(col,vec3(0.0),black); gl_FragColor=vec4(col,1.0);} `,
  depthTest: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mixMat);
const quadScene = new THREE.Scene(); quadScene.add(quad);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const composer = new EffectComposer(renderer);
const texPass = new TexturePass(rtC.texture);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.45, 0.9);
composer.addPass(texPass); composer.addPass(bloom); composer.addPass(new OutputPass());

// ---------------------------------------------------------------- escenas
const earth = new THREE.Scene(); earth.background = new THREE.Color(0x000000);
const earthCam = new THREE.PerspectiveCamera(40, W / H, 0.0003, 300);
const street = new THREE.Scene(); street.background = new THREE.Color(0x0b0b0b); street.fog = new THREE.Fog(0x0b0b0b, 60, 260);
const streetCam = new THREE.PerspectiveCamera(52, W / H, 0.05, 400);
const brent = new THREE.Scene(); brent.background = new THREE.Color(0xffffff); brent.fog = new THREE.Fog(0xffffff, 60, 200);
const brentCam = new THREE.PerspectiveCamera(50, W / H, 0.004, 300);

const S = {};   // objetos animados

async function buildEarth(c50, c10) {
  earth.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(5, 3, 4); earth.add(sun);
  // océano con borde luminoso (fresnel) y halo
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-max(dot(vN,vV),0.),3.); gl_FragColor=vec4(vec3(0.004)+vec3(0.16)*f,1.); }',
  }));
  earth.add(ocean);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f=pow(max(dot(vN,vV),0.),4.); gl_FragColor=vec4(vec3(0.22)*f,f); }',
  }));
  earth.add(halo); S.halo = halo;
  // costas y fronteras
  S.borders = basicLines(ringSegments(c50, 1.0008), 0xffffff, 0.55); earth.add(S.borders);
  // retícula
  const gr = [];
  for (let lo = -180; lo < 180; lo += 15) for (let la = -80; la < 80; la += 2) { const a = ll(lo, la, 1.0005), b = ll(lo, la + 2, 1.0005); gr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  for (let la = -75; la <= 75; la += 15) for (let lo = -180; lo < 180; lo += 2) { const a = ll(lo, la, 1.0005), b = ll(lo + 2, la, 1.0005); gr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  S.grid = basicLines(new Float32Array(gr), 0xffffff, 0.08); earth.add(S.grid);
  // golfo en detalle (10m) y España resaltada
  S.gulf = basicLines(ringSegments(c10, 1.0004, null, [44, 20, 66, 34]), 0xffffff, 0.0); earth.add(S.gulf);
  S.spain = fatLines(ringSegments(c10, 1.001, n => n === 'Spain'), 0xffffff, 2.5, 0); earth.add(S.spain);
  // estrellas
  const st = [];
  for (let i = 0; i < 4000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 60); st.push(v.x, v.y, v.z); }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(st, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 }));
  earth.add(stars);
  // satélites en órbita
  S.sats = [];
  for (let i = 0; i < 7; i++) {
    const s = makeSatellite(); s.scale.setScalar(0.03 + 0.01 * (i % 3)); earth.add(s);
    S.sats.push({ obj: s, r: 1.3 + 0.12 * i, inc: (i * 37 % 80 - 40) * Math.PI / 180, ph: i * 1.7, sp: 0.18 + 0.03 * (i % 4) });
  }
  // parábolas desde Ormuz
  S.arcs = [];
  for (const [name, d] of Object.entries(DEST)) {
    const pts = arcPoints(HORMUZ, d, 0.28);
    const line = fatLines(polySegments(pts), 0xffffff, 2.2, 0.95); earth.add(line);
    const dots = [];
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), glowMat()); earth.add(m); dots.push(m); }
    const lab = textSprite(name, { size: 90, weight: 800, height: 0.07, spacing: 0.08 }); earth.add(lab);
    lab.position.copy(ll(d[0], d[1], 1.09));
    S.arcs.push({ line, dots, path: new Path(pts), lab });
  }
  S.hub = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), glowMat()); S.hub.position.copy(ll(...HORMUZ, 1.002)); earth.add(S.hub);
  // carriles de Ormuz y barcos
  const OUT = [[50.2, 26.9], [52.6, 26.85], [55.0, 26.55], [56.25, 26.6], [56.95, 26.1], [57.8, 25.3], [59.2, 24.5]];
  const IN = [[59.2, 24.25], [57.7, 25.1], [56.8, 25.9], [56.25, 26.42], [55.0, 26.35], [52.6, 26.6], [50.2, 26.65]];
  const FEED = [[[48.6, 29.0], [50.2, 27.6], [52.6, 26.85]], [[50.6, 26.3], [52.6, 26.85]], [[51.8, 25.6], [53.4, 26.2], [55.0, 26.55]], [[54.2, 24.9], [55.0, 26.55]]];
  S.lanes = [];
  for (const wps of [OUT, IN, ...FEED]) {
    const pts = surfaceRoute(wps, 1.0003, 24);
    const l = fatLines(polySegments(pts), 0xffffff, 1.6, 0.0); earth.add(l);
    S.lanes.push({ l, path: new Path(pts) });
  }
  S.mainLane = S.lanes[0];
  S.diveShip = 2;
  S.ships = [];
  for (let i = 0; i < 16; i++) {
    const sh = makeShip(); sh.scale.setScalar(0.011); earth.add(sh);
    S.ships.push({ obj: sh, lane: i < 10 ? 0 : 1, ph: (i < 10 ? i / 10 : (i - 10) / 6) + 0.03 * (i % 3) });
  }
  // anillos de tensión en el estrecho
  S.rings = [];
  for (let k = 0; k < 3; k++) {
    const pts = []; const c = ll(56.3, 26.5).normalize();
    const e1 = new THREE.Vector3(0, 1, 0).cross(c).normalize(), e2 = c.clone().cross(e1).normalize();
    for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(c.clone().add(e1.clone().multiplyScalar(Math.cos(a))).add(e2.clone().multiplyScalar(Math.sin(a)))); }
    const ring = fatLines(polySegments(pts.map(p => p)), 0xffffff, 2, 0); earth.add(ring); S.rings.push(ring);
  }
  // ruta del barco hasta España
  const ROUTE = [[56.3, 26.55], [57.6, 25.2], [59.2, 23.4], [58.5, 19.5], [52.5, 14.2], [45.5, 12.4], [43.4, 12.6],
    [41.0, 15.5], [38.4, 20.0], [35.6, 25.0], [33.6, 27.6], [32.55, 29.9], [32.35, 31.3], [28.0, 33.0], [20.0, 34.6],
    [12.0, 37.0], [8.0, 37.8], [3.0, 37.6], [-0.9, 37.55]];
  const rp = surfaceRoute(ROUTE, 1.0005, 20);
  S.route = { line: fatLines(polySegments(rp), 0xffffff, 2.4, 0), path: new Path(rp) }; earth.add(S.route.line);
  S.bigShip = makeShip(); S.bigShip.scale.setScalar(0.016); earth.add(S.bigShip);
  // carreteras y camiones en España
  const ROADS = [[[-5.45, 36.13], [-4.4, 37.9], [-3.7, 40.4]], [[-0.38, 39.47], [-1.9, 39.6], [-3.7, 40.4]], [[2.17, 41.39], [-0.9, 41.65], [-3.7, 40.4]], [[-3.6, 37.18], [-3.7, 40.4]]];
  S.roads = ROADS.map(wps => { const pts = surfaceRoute(wps, 1.0006, 30); const l = fatLines(polySegments(pts), 0xffffff, 1.4, 0); earth.add(l); return { l, path: new Path(pts) }; });
  S.trucks = [];
  for (let i = 0; i < 8; i++) { const tr = makeTruck(); tr.scale.setScalar(0.0055); earth.add(tr); S.trucks.push({ obj: tr, road: i % 4, ph: i * 0.37 }); }
  S.granada = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 12, 10), glowMat()); S.granada.position.copy(ll(...GRANADA, 1.001)); earth.add(S.granada);
  // textos
  const T = (s, o) => { const sp = textSprite(s, o); earth.add(sp); sp.visible = false; return sp; };
  S.txt = {
    ormuz: T('ESTRECHO DE ORMUZ', { size: 110, height: 0.0075, spacing: 0.06 }),
    cuello: T('CUELLO DE BOTELLA', { size: 110, height: 0.0075, spacing: 0.06 }),
    mas: T('MÁS DE', { size: 80, weight: 700, height: 0.0045, spacing: 0.3, font: 'Mono' }),
    cuarta: T('1 DE CADA 4', { size: 150, height: 0.014 }),
    barriles: T('barriles de petróleo\nque viajan por mar', { size: 90, weight: 600, height: 0.0095 }),
    eia: T('Fuente: EIA, datos de 2024', { size: 60, weight: 500, height: 0.0028 }),
    iran: T('IRÁN', { size: 130, height: 0.006, spacing: 0.15 }),
    oman: T('OMÁN', { size: 130, height: 0.006, spacing: 0.15 }),
    eau: T('EAU', { size: 110, height: 0.0042, spacing: 0.15 }),
    golfo: T('GOLFO PÉRSICO', { size: 80, weight: 600, height: 0.0035, spacing: 0.25, font: 'Mono' }),
    tension: T('TENSIÓN', { size: 140, height: 0.009, spacing: 0.1 }),
    precio: T('PRECIO DEL\nPETRÓLEO ▲', { size: 120, height: 0.016 }),
    espana: T('¿Y EN ESPAÑA?', { size: 130, height: 0.03 }),
    bce1: T('SEGÚN EL BCE', { size: 80, weight: 700, height: 0.012, spacing: 0.25, font: 'Mono' }),
    bce2: T('el conflicto está\npresionando los precios', { size: 100, weight: 800, height: 0.034 }),
    tr1: T('TRANSPORTE', { size: 80, weight: 700, height: 0.007, spacing: 0.25, font: 'Mono' }),
    tr2: T('+10,5 %', { size: 170, height: 0.02 }),
    tr3: T('en un año · sobre todo, combustibles · INE', { size: 60, weight: 600, height: 0.0034 }),
    ip1: T('INFLACIÓN', { size: 80, weight: 700, height: 0.007, spacing: 0.25, font: 'Mono' }),
    ip2: T('4,9 %', { size: 170, height: 0.02 }),
    ip3: T('IPC septiembre 2026 · INE', { size: 60, weight: 600, height: 0.0034 }),
    q1: T('¿Lo has notado\nal llenar el depósito?', { size: 110, height: 0.012 }),
    q2: T('Te leo en comentarios ▼', { size: 80, weight: 700, height: 0.0042 }),
  };
}

function mapTexture(c50) {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024;
  const g = cv.getContext('2d');
  g.fillStyle = '#0c0c0c'; g.fillRect(0, 0, 2048, 1024);
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1;
  for (let lo = -180; lo <= 180; lo += 15) { const x = (lo + 180) / 360 * 2048; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  for (let la = -90; la <= 90; la += 15) { const y = (90 - la) / 180 * 1024; g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6;
  for (const c of c50) for (const r of c.rings) {
    g.beginPath();
    r.forEach(([lo, la], i) => { const x = (lo + 180) / 360 * 2048, y = (90 - la) / 180 * 1024; if (i && Math.abs(lo - r[i - 1][0]) > 180) g.moveTo(x, y); else if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function buildStreet(c50) {
  street.add(new THREE.HemisphereLight(0xb0b4bc, 0x101010, 0.55));
  const moon = new THREE.DirectionalLight(0xffffff, 0.6); moon.position.set(-20, 40, 15); street.add(moon);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(0x1c1c1c)); ground.rotation.x = -Math.PI / 2; street.add(ground);
  street.add(box(8, 0.02, 300, mat(0x111111), 0, 0.01, -60));
  for (const sx of [-1, 1]) street.add(box(2.5, 0.15, 300, mat(0x4a4a4a), sx * 5.25, 0.075, -60));
  for (let z = 40; z > -160; z -= 6) street.add(box(0.18, 0.03, 2.5, glowMat(0xd0d0d0), 0, 0.03, z));
  let seed = 0;
  for (const sx of [-1, 1]) for (let z = 30; z > -150; z -= 11) {
    if (sx === 1 && Math.abs(z - (-36)) < 6) continue;
    const hs = makeHouse(6 + (seed % 2), 4.2 + (seed % 3) * 0.4, 6, seed++);
    hs.position.set(sx * 13, 0, z); hs.rotation.y = -sx * Math.PI / 2; street.add(hs);
    const tr = makeTree(); tr.position.set(sx * 8.2, 0, z - 5.5); tr.scale.setScalar(1 + (seed % 3) * 0.2); street.add(tr);
  }
  for (const sx of [-1, 1]) for (let z = 36; z > -150; z -= 16) { const l = makeLamp(); l.position.set(sx * 6.3, 0, z); l.rotation.y = sx > 0 ? Math.PI : 0; street.add(l); }
  for (const z of [-20, -52]) { const pl = new THREE.PointLight(0xffffff, 40, 25, 1.6); pl.position.set(5, 4, z); street.add(pl); }
  const hero = makeHeroHouse(mapTexture(c50)); hero.position.set(14, 0, -36); hero.rotation.y = -Math.PI / 2; street.add(hero);
  hero.updateMatrixWorld(true);
  S.win = hero.localToWorld(hero.userData.window.clone());
  const M = hero.userData.map;
  const mapPt = (lon, lat, h = 0) => hero.localToWorld(M.c.clone().add(new THREE.Vector3(lon / 180 * M.w / 2, h, -lat / 90 * M.h / 2)));
  S.mapEnd = mapPt(20, 33, 0); S.mapCam = mapPt(20, 31.5, 0.42);
  S.mapNorth = hero.localToWorld(M.c.clone().add(new THREE.Vector3(0, 0, -1))).sub(hero.localToWorld(M.c.clone())).normalize();
  S.out = new THREE.Vector3(-1, 0, 0);
  S.cars = [];
  for (let i = 0; i < 5; i++) { const c = makeCar([0x9c9c9c, 0x5a5a5a, 0xcfcfcf][i % 3]); street.add(c); S.cars.push({ obj: c, lane: i % 2, z0: 30 - i * 37 }); }
  const W0 = S.win, D = S.out;
  const above = S.mapEnd.clone().add(new THREE.Vector3(0, 1.1, 0)).add(D.clone().multiplyScalar(0.9));
  S.camPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-2, 48, 6), new THREE.Vector3(-3, 22, -14),
    W0.clone().add(D.clone().multiplyScalar(10)).add(new THREE.Vector3(0, 1.0, 0.75)), W0.clone().add(D.clone().multiplyScalar(2.2)).add(new THREE.Vector3(0, 0.3, 0.75)),
    W0.clone().sub(D.clone().multiplyScalar(1.0)).add(new THREE.Vector3(0, 0.3, 0.75)), above, S.mapCam.clone()]);
  S.tgtPath = new THREE.CatmullRomCurve3([new THREE.Vector3(6, 0, -34), new THREE.Vector3(11, 2, -36), W0.clone(), W0.clone(),
    S.mapEnd.clone().add(new THREE.Vector3(0, 0.3, 0)), S.mapEnd.clone(), S.mapEnd.clone()]);
}

function buildBrent() {
  brent.add(new THREE.AmbientLight(0xffffff, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(5, 10, 8); brent.add(d);
  const grid = new THREE.GridHelper(160, 80, 0x9a9a9a, 0xd0d0d0); grid.position.set(20, 0, 0); brent.add(grid);
  const Y = v => (v - 50) * 0.15;
  S.bp = [new THREE.Vector3(0, Y(70), 0), new THREE.Vector3(6, Y(112), 0), new THREE.Vector3(20, Y(102), 0)];
  // ejes de referencia de precio
  for (const v of [60, 80, 100, 120]) {
    brent.add(box(60, 0.03, 0.03, new THREE.MeshBasicMaterial({ color: 0xbdbdbd }), 20, Y(v), -1.2));
    const t = textSprite(`${v} $`, { size: 60, weight: 600, color: '#8a8a8a', height: 0.5, font: 'Mono' }); t.position.set(-2.6, Y(v), -1.2); brent.add(t);
  }
  const solid = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(S.bp[0], S.bp[1]), 8, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  brent.add(solid); S.solid = solid;
  S.dashes = [];
  for (let i = 0; i < 24; i += 2) {
    const a = S.bp[1].clone().lerp(S.bp[2], i / 24), b = S.bp[1].clone().lerp(S.bp[2], (i + 1) / 24);
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, 0.13, 10), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    brent.add(m); S.dashes.push({ m, u: (i + 1) / 24 });
  }
  S.dots = S.bp.map(p => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), new THREE.MeshStandardMaterial({ color: 0x0a0a0a })); m.position.copy(p); brent.add(m); return m; });
  // poste vertical desde el suelo en cada punto
  S.bp.forEach(p => brent.add(box(0.04, p.y, 0.04, new THREE.MeshBasicMaterial({ color: 0x9a9a9a }), p.x, p.y / 2, 0)));
  const L = (s, o, p) => { const t = textSprite(s, o); t.position.copy(p); brent.add(t); return t; };
  S.btxt = {
    title: L('BRENT', { size: 150, color: '#000000', height: 1.6 }, new THREE.Vector3(1, Y(130), -2)),
    sub: L('dólares por barril', { size: 80, weight: 600, color: '#555555', height: 0.6 }, new THREE.Vector3(1, Y(124), -2)),
    p70: L('~70 $', { size: 150, color: '#000000', height: 1.3 }, S.bp[0].clone().add(new THREE.Vector3(0, 1.5, 0))),
    p110: L('+110 $', { size: 150, color: '#000000', height: 2.1 }, S.bp[1].clone().add(new THREE.Vector3(0, 2.0, 0))),
    p100: L('+100 $', { size: 150, color: '#000000', height: 2.1 }, S.bp[2].clone().add(new THREE.Vector3(0, 2.0, 0))),
    feb: L('FEB', { size: 90, weight: 700, color: '#444444', height: 0.6, font: 'Mono' }, new THREE.Vector3(0, 0.4, 1.6)),
    mar: L('MAR', { size: 90, weight: 700, color: '#444444', height: 0.6, font: 'Mono' }, new THREE.Vector3(6, 0.4, 1.6)),
    sep: L('SEP', { size: 90, weight: 700, color: '#444444', height: 1.0, font: 'Mono' }, new THREE.Vector3(20, 0.6, 1.6)),
    nota: L('los meses intermedios no se muestran', { size: 60, weight: 600, color: '#666666', height: 1.0 }, new THREE.Vector3(13, Y(98) - 2.2, 1.5)),
  };
  S.cart = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), new THREE.MeshStandardMaterial({ color: 0x000000 })); brent.add(S.cart);
}

// ---------------------------------------------------------------- utilidades de cámara
function earthLook(pos, target, up = new THREE.Vector3(0, 1, 0)) {
  const n = Math.max(0.00002, Math.min(0.0003, pos.distanceTo(target) * 0.02));
  if (Math.abs(earthCam.near - n) > 1e-7) { earthCam.near = n; earthCam.updateProjectionMatrix(); }
  earthCam.position.copy(pos); earthCam.up.copy(up); earthCam.lookAt(target);
}
function northAt(lon, lat) {
  return ll(lon, lat + 0.5).sub(ll(lon, lat)).normalize();
}
function setText(sp, a, pos, scaleK = 1) {
  sp.visible = a > 0.003;
  sp.material.opacity = a;
  if (pos) sp.position.copy(pos);
  if (!sp.userData.base) sp.userData.base = sp.scale.clone();
  sp.scale.copy(sp.userData.base).multiplyScalar(scaleK);
}
const pop = (t, t0) => 0.7 + 0.3 * eo(prog(t, t0, 0.35));
const envA = (t, t0, t1, fi = 0.35, fo = 0.35) => (t < t0 || t > t1 ? 0 : Math.min(eo(prog(t, t0, fi)), 1 - prog(t, t1 - fo, fo)));


// texto anclado a la vista: dy/dx en fracciones de la altura visible a la distancia del objetivo; h = altura relativa
function hud(sp, a, tgt, dy, h, dx = 0, k = 1) {
  sp.visible = a > 0.003; if (!sp.visible) return;
  sp.material.opacity = a;
  const cam = earthCam, d = cam.position.distanceTo(tgt);
  const vh = 2 * d * Math.tan(cam.fov * Math.PI / 360);
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  sp.position.copy(tgt).addScaledVector(up, dy * vh).addScaledVector(right, dx * vh * cam.aspect);
  const hh = 2.1 * h * vh * k; sp.scale.set(hh * sp.userData.aspect, hh, 1);
}

function updateSats(time) {
  for (const s of S.sats) {
    const a = s.ph + time * s.sp;
    const p = new THREE.Vector3(Math.cos(a) * s.r, 0, Math.sin(a) * s.r).applyAxisAngle(new THREE.Vector3(1, 0, 0), s.inc);
    s.obj.position.copy(p); s.obj.lookAt(0, 0, 0); s.obj.rotateY(time * 0.2);
  }
}

function shipU(s, t) {
  const jam = eo(prog(t, K.teme, 1.5));
  const v = 0.022, tj = K.teme;
  const disp = t < tj ? v * t : v * tj + v * ((t - tj) - 0.85 * (Math.min(t - tj, 1.5) * jam * 0.5 + Math.max(0, t - tj - 1.5)));
  let u = (s.ph + disp) % 1;
  if (jam > 0 && s.lane === 0) { const gate = 0.5; if (u < gate) u = Math.min(u, gate - 0.015 * (s.ph * 10 % 10) * jam); }
  return u;
}
function placeShip(s, t) {
  const { p, dir } = S.lanes[s.lane].path.at(shipU(s, t));
  s.obj.visible = true; placeOnSphere(s.obj, p, dir, 0.0008);
}

function resetEarth() {
  for (const k in S.txt) S.txt[k].visible = false;
  S.arcs.forEach(a => { a.line.visible = false; a.dots.forEach(d => (d.visible = false)); a.lab.visible = false; });
  S.lanes.forEach(l => (l.l.material.opacity = 0));
  S.ships.forEach(s => (s.obj.visible = false));
  S.rings.forEach(r => (r.visible = false));
  S.route.line.visible = false; S.bigShip.visible = false;
  S.roads.forEach(r => (r.l.material.opacity = 0)); S.trucks.forEach(t => (t.obj.visible = false));
  S.gulf.material.opacity = 0; S.spain.material.opacity = 0; S.hub.visible = false; S.granada.visible = false;
  S.borders.material.opacity = 0.55; S.grid.material.opacity = 0.08;
}

// ---------------------------------------------------------------- secciones
const earthCam2 = new THREE.PerspectiveCamera(40, W / H, 0.0003, 300);
const MAP_VIEW = () => { earthCam2.position.copy(ll(20, 33, 1.6)); earthCam2.up.set(0, 1, 0); earthCam2.lookAt(0, 0, 0); };

function streetAt(tau) {
  const u = eio(prog(tau, 2.1, 1.75));
  streetCam.position.copy(S.camPath.getPoint(u));
  const k = ss(prog(u, 0.82, 0.18));   // al final se mira el mapa desde arriba con el norte hacia arriba
  streetCam.up.set(0, 1, 0).lerp(S.mapNorth, k).normalize();
  streetCam.lookAt(S.tgtPath.getPoint(u));
  for (const c of S.cars) { const z = ((c.z0 - (c.lane ? -1 : 1) * 14 * tau) % 180 + 180) % 180 - 150; c.obj.position.set(c.lane ? 2 : -2, 0, z); c.obj.rotation.y = c.lane ? -Math.PI / 2 : Math.PI / 2; }
}

function entry(tau) {
  // espacio → Granada → calle → ventana → mapa sobre la mesa → Tierra
  const out = { scene: earth, cam: earthCam, white: 0, black: 0, bloom: 0.7, mixB: 0, blur: 0 };
  resetEarth(); updateSats(tau * 1.0);
  if (tau < 2.5) {
    let lon, lat, dist;
    if (tau < 1.0) { const u = tau / 1.0; lon = lerp(-14, -8, u); lat = lerp(28, 32, u); dist = lerp(5.8, 5.2, u); }
    else { const u = eio(prog(tau, 1.0, 1.4)); lon = lerp(-8, GRANADA[0], u); lat = lerp(32, GRANADA[1], u); dist = loglerp(5.2, 1.006, u); }
    const tgt = ll(lon, lat, 1).multiplyScalar(prog(tau, 1.0, 1.4) * 0.999);
    earthLook(ll(lon, lat, dist), tgt);
    S.granada.visible = tau > 1.2;
    if (tau >= 2.1) {
      streetAt(tau);
      out.sceneB = street; out.camB = streetCam; out.mixB = ss(prog(tau, 2.1, 0.4));
      out.blur = Math.sin(Math.PI * prog(tau, 2.1, 0.4)) * 0.3;
    }
    return out;
  }
  streetAt(tau);
  out.scene = street; out.cam = streetCam;
  if (tau >= 3.75) {   // el mapa se convierte en la Tierra
    MAP_VIEW();
    out.sceneB = earth; out.camB = earthCam2; out.mixB = ss(prog(tau, 3.75, 0.35));
    out.blur = Math.sin(Math.PI * prog(tau, 3.75, 0.35)) * 0.12;
  }
  return out;
}

function arcsAndHormuz(t) {
  const out = { scene: earth, cam: earthCam, white: 0, black: 0, bloom: 0.7 };
  resetEarth(); updateSats(t);
  // posición de cámara
  let pos, tgt, up = new THREE.Vector3(0, 1, 0);
  const hz = ll(56.3, 26.5, 1);
  if (t < 8.3) {
    const u = prog(t, 4.1, 4.2);
    pos = ll(lerp(20, 62, eio(u)), lerp(33, 24, eio(u)), lerp(1.6, 4.4, eio(u))); tgt = new THREE.Vector3(0, 0, 0);
  } else if (t < 12.0) {
    const u = eio(prog(t, 8.3, 3.7));
    const lon = lerp(62, 55.2, u), lat = lerp(24, 22.2, u);
    pos = ll(lon, lat, 1 + loglerp(3.4, 0.085, u)); tgt = hz.clone().multiplyScalar(u);
    up = new THREE.Vector3(0, 1, 0).lerp(northAt(56.3, 26.5), u).normalize();
  } else {
    const u = prog(t, 12.0, 16.0);
    const dive = ss(prog(t, 27.85, 0.72));
    pos = ll(lerp(55.2, 56.6, u), lerp(22.2, 23.0, u), 1 + lerp(0.085, 0.07, u));
    tgt = ll(lerp(56.3, 56.5, u), lerp(26.5, 26.2, u), 1);
    up = northAt(56.3, 26.5);
    if (dive > 0) {   // la cámara se acerca al puente blanco de un barco hasta que todo es blanco
      const sh = S.ships[S.diveShip].obj;
      placeShip(S.ships[S.diveShip], t);
      sh.updateMatrixWorld(true);
      const face = sh.localToWorld(new THREE.Vector3(-0.465, 0.1, 0)), end = sh.localToWorld(new THREE.Vector3(-0.5, 0.115, 0));
      const k = Math.pow(dive, 1.6);
      pos = pos.clone().lerp(end, k); tgt = tgt.clone().lerp(face, Math.min(1, dive * 1.4));
      up = up.clone().lerp(sh.position.clone().normalize(), dive).normalize();
    }
  }
  earthLook(pos, tgt, up);
  // parábolas
  const arcFade = 1 - prog(t, 10.0, 1.5);
  let i = 0;
  for (const a of S.arcs) {
    const p = eo(prog(t, K.arcs + 0.25 + i * 0.32, 1.1));
    if (p > 0 && arcFade > 0) {
      a.line.visible = true; a.line.material.opacity = 0.95 * arcFade;
      a.line.geometry.instanceCount = Math.max(1, Math.floor(p * a.line.userData.count));
      a.dots.forEach((d, k) => { const u = ((t * 0.35 + k / 3 + i * 0.13) % 1) * p; d.visible = t < 9.3; d.position.copy(a.path.at(u).p); });
      if (p >= 1) { a.lab.visible = true; a.lab.material.opacity = prog(t, K.arcs + 1.35 + i * 0.32, 0.3) * arcFade; }
    }
    i++;
  }
  S.hub.visible = t < 9.4;
  // Ormuz en detalle
  const near = prog(t, 9.6, 1.6);
  S.gulf.material.opacity = 0.9 * near;
  S.borders.material.opacity = 0.55 * (1 - 0.6 * near);
  S.grid.material.opacity = 0.08 * (1 - near);
  if (near > 0) {
    S.lanes.forEach(l => (l.l.material.opacity = 0.6 * near));
    const jam = eo(prog(t, K.teme, 1.5));
    for (const sh of S.ships) placeShip(sh, t);
  }
  // textos (anclados a la vista para que siempre se lean) y etiquetas geográficas
  earthCam.updateMatrixWorld();
  const T = S.txt, at = (lon, lat, h) => ll(lon, lat, 1 + h);
  hud(T.ormuz, envA(t, K.ormuz, K.cuello), tgt, 0.33, 0.034, 0, pop(t, K.ormuz));
  hud(T.cuello, envA(t, K.cuello, K.tension + 0.2), tgt, 0.33, 0.034, 0, pop(t, K.cuello));
  const cA = envA(t, K.cuarta, K.paso - 0.1);
  hud(T.mas, cA, tgt, 0.25, 0.022, 0, pop(t, K.cuarta));
  hud(T.cuarta, cA, tgt, 0.19, 0.07, 0, pop(t, K.cuarta));
  hud(T.barriles, cA * prog(t, K.todo - 0.4, 0.4), tgt, 0.11, 0.055);
  hud(T.eia, cA, tgt, 0.065, 0.016);
  const lab = prog(t, 10.6, 0.8) * (1 - prog(t, 27.9, 0.4));
  const em = 1 + 0.3 * eo(prog(t, K.paso, 0.4)) * (1 - prog(t, K.paso + 1.4, 0.6));
  const geo = (sp, a, p, h) => { sp.visible = a > 0.003; sp.material.opacity = a; sp.position.copy(p); sp.scale.set(h * sp.userData.aspect, h, 1); };
  const clear = 1 - cA;
  geo(T.iran, clear * lab * (0.6 + 0.4 * prog(t, K.paso, 0.4)), at(57.3, 27.7, 0.003), 0.0042 * em);
  geo(T.oman, clear * lab * (0.6 + 0.4 * prog(t, K.paso, 0.4)), at(56.9, 24.4, 0.003), 0.0042 * em);
  geo(T.eau, lab * 0.8, at(54.5, 24.1, 0.002), 0.003);
  geo(T.golfo, lab * 0.7, at(53.3, 27.0, 0.002), 0.0022);
  const tA = envA(t, K.tension, K.sube) * (0.75 + 0.25 * Math.sin(t * 9));
  hud(T.tension, tA, tgt, -0.12, 0.05, 0, pop(t, K.tension));
  hud(T.precio, envA(t, K.sube, 28.2, 0.3, 0.25), tgt, 0.2, 0.09, 0, pop(t, K.sube));
  // anillos de tensión
  const hot = eo(prog(t, K.tension, 1)) * (1 - prog(t, 27.9, 0.3));
  S.rings.forEach((r, k) => {
    r.visible = hot > 0; const ph = (t * 0.8 + k / 3) % 1;
    r.material.opacity = hot * (1 - ph); const R = 0.004 + 0.02 * ph;
    const c = ll(56.3, 26.5).normalize();
    r.position.copy(c.clone().multiplyScalar(1 + 0.0006 - 1)); r.scale.setScalar(1);
    // reescalado del anillo alrededor del centro c (radio R) proyectado sobre la superficie
    r.matrixAutoUpdate = false;
    const m = new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeScale(R, R, R)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
    r.matrix.copy(m);
  });
  S.mainLane.l.material.linewidth = 1.6;
  out.white = ss(prog(t, 28.42, 0.16));
  return out;
}

function brentSection(t) {
  const out = { scene: brent, cam: brentCam, white: 1 - ss(prog(t, 28.6, 0.35)), black: 0, bloom: 0.0 };
  // carro que recorre la línea
  const P = S.bp;
  let c;
  if (t < K.setenta) c = P[0].clone().add(new THREE.Vector3(-4 * (1 - prog(t, 28.6, K.setenta - 28.6)), 0, 0));
  else if (t < K.marzo + 0.3) c = P[0].clone().lerp(P[1], eio(prog(t, K.setenta, K.marzo + 0.3 - K.setenta)));
  else if (t < K.sept) c = P[1].clone();
  else c = P[1].clone().lerp(P[2], eio(prog(t, K.sept, 1.6)));
  const side = lerp(7.5, 9, prog(t, 28.6, 8));
  const off = new THREE.Vector3(-2.5, 4, side + 12);
  const dive = ss(prog(t, 36.25, 0.68));
  let pos = c.clone().add(off), tgt = c.clone().add(new THREE.Vector3(lerp(2.2, 5, eio(prog(t, K.marzo, 2.2))), 2.4, 0));
  S.cart.position.copy(c);
  const wide = eio(prog(t, K.sept - 0.3, 1.3));   // en el tramo largo la cámara se abre para verlo entero
  if (wide > 0) {
    const mid = P[1].clone().lerp(P[2], 0.5);
    pos.lerp(mid.clone().add(new THREE.Vector3(-2, 5, 34)), wide); tgt.lerp(mid.clone().add(new THREE.Vector3(0, 2.5, 0)), wide);
  }
  if (dive > 0) { const q = P[1].clone().lerp(P[2], 14.5 / 24); pos = pos.lerp(q.clone().add(new THREE.Vector3(0, 0, 0.16)), dive); tgt = tgt.lerp(q, Math.min(1, dive * 1.6)); }
  brentCam.position.copy(pos); brentCam.lookAt(tgt);
  // tramos visibles
  const p2 = eio(prog(t, K.sept, 1.6));
  S.solid.scale.set(1, 1, 1);
  S.solid.visible = t >= K.setenta - 0.4;
  S.dashes.forEach(d => (d.m.visible = d.u <= p2 + 0.05));
  const B = S.btxt;
  const vis = (sp, a) => { sp.visible = a > 0.003; sp.material.opacity = a; };
  const tf = 1 - prog(t, 32.0, 0.4);
  vis(B.title, prog(t, 28.7, 0.4) * tf); vis(B.sub, prog(t, 28.9, 0.4) * tf);
  B.title.position.set(c.x - 0.5, c.y + 6.2, -2); B.sub.position.set(c.x - 0.5, c.y + 5.0, -2);
  vis(B.p70, prog(t, K.setenta + 0.2, 0.3)); vis(B.p110, prog(t, K.marzo + 0.2, 0.3)); vis(B.p100, prog(t, K.sept + 0.9, 0.3));
  vis(B.feb, 1); vis(B.mar, 1); vis(B.sep, prog(t, K.sept, 0.5)); vis(B.nota, prog(t, K.sept + 0.4, 0.5) * (1 - prog(t, 36.2, 0.25)));
  out.black = ss(prog(t, 36.92, 0.16));
  return out;
}

function shipAndSpain(t) {
  const out = { scene: earth, cam: earthCam, white: 0, black: 1 - ss(prog(t, 37.1, 0.3)), bloom: 0.7 };
  resetEarth(); updateSats(t);
  S.borders.material.opacity = 0.45; S.grid.material.opacity = 0.05;
  const T = S.txt;
  const uS = eio(prog(t, 37.1, 4.5));
  const sp = S.route.path.at(uS);
  S.route.line.visible = true; S.route.line.material.opacity = 0.9;
  S.route.line.geometry.instanceCount = Math.max(1, Math.floor(uS * S.route.line.userData.count));
  S.bigShip.visible = true; placeOnSphere(S.bigShip, sp.p, sp.dir, 0.0012);
  let pos, tgt, up;
  const spainC = ll(-3.7, 39.6, 1);
  if (t < 41.6) {
    const n = sp.p.clone().normalize();
    const back = sp.dir.clone().multiplyScalar(-0.16), side = n.clone().cross(sp.dir).normalize().multiplyScalar(0.07);
    pos = sp.p.clone().add(n.multiplyScalar(lerp(0.32, 0.2, uS))).add(back).add(side); tgt = sp.p.clone(); up = sp.p.clone().normalize();
    up = new THREE.Vector3(0, 1, 0);
  } else {
    const u = prog(t, 41.6, 14);
    const az = lerp(-0.9, 0.5, u), alt = lerp(0.2, 0.06, eio(prog(t, 41.6, 13.9)));
    const g = ll(...GRANADA, 1);
    const center = spainC.clone().lerp(g, eio(prog(t, 50.5, 4)));
    const nrm = center.clone().normalize(), north = northAt(-3.7, 39.6);
    const east = north.clone().cross(nrm).normalize().negate();
    const dir = north.clone().multiplyScalar(-Math.cos(az)).add(east.multiplyScalar(Math.sin(az)));
    pos = center.clone().add(nrm.clone().multiplyScalar(alt)).add(dir.multiplyScalar(alt * 1.1));
    tgt = center; up = nrm;
    // transición suave desde el seguimiento del barco
    const k = ss(prog(t, 41.6, 1.2));
    if (k < 1) {
      const n = sp.p.clone().normalize();
      const p0 = sp.p.clone().add(n.multiplyScalar(0.2)).add(sp.dir.clone().multiplyScalar(-0.16));
      pos = p0.lerp(pos, k); tgt = sp.p.clone().lerp(tgt, k); up = new THREE.Vector3(0, 1, 0).lerp(up, k).normalize();
    }
  }
  earthLook(pos, tgt, up);
  earthCam.updateMatrixWorld();
  hud(T.espana, envA(t, K.espana, K.bce + 0.2), tgt, 0.3, 0.05, 0, pop(t, K.espana));
  hud(T.bce1, envA(t, K.bce, K.transporte), tgt, 0.33, 0.022, 0, pop(t, K.bce));
  hud(T.bce2, envA(t, K.bce, K.transporte), tgt, 0.25, 0.075, 0, pop(t, K.bce));
  // España
  const sA = prog(t, 40.6, 1.2);
  S.spain.material.opacity = sA; S.granada.visible = sA > 0;
  S.granada.scale.setScalar((0.35 + 0.12 * Math.sin(t * 5)) * Math.min(1, earthCam.position.distanceTo(ll(...GRANADA, 1)) / 0.15));
  S.roads.forEach(r => (r.l.material.opacity = 0.5 * prog(t, K.transporte - 0.4, 0.5)));
  if (t > K.transporte - 0.4) S.trucks.forEach(tr => { const r = S.roads[tr.road]; const u = (tr.ph + t * 0.07) % 1; const { p, dir } = r.path.at(u); tr.obj.visible = true; placeOnSphere(tr.obj, p, dir, 0.0005); });
  const tA = envA(t, K.transporte, K.inflacion);
  hud(T.tr1, tA, tgt, 0.33, 0.022, 0, pop(t, K.transporte)); hud(T.tr2, tA, tgt, 0.26, 0.085, 0, pop(t, K.transporte));
  hud(T.tr3, tA * prog(t, K.combustibles, 0.3), tgt, 0.2, 0.017);
  const iA = envA(t, K.inflacion, 52.0);
  hud(T.ip1, iA, tgt, 0.33, 0.022, 0, pop(t, K.inflacion)); hud(T.ip2, iA, tgt, 0.26, 0.085, 0, pop(t, K.inflacion)); hud(T.ip3, iA, tgt, 0.2, 0.017);
  hud(T.q1, envA(t, K.notado, 55.35, 0.35, 0.2), tgt, 0.27, 0.07, 0, pop(t, K.notado));
  hud(T.q2, envA(t, K.leo, 55.35, 0.3, 0.2), tgt, 0.19, 0.024, 0, pop(t, K.leo));
  if (t > 55.15) { MAP_VIEW(); out.sceneB = earth; out.camB = earthCam2; out.mixB = ss(prog(t, 55.15, 0.35)); }
  return out;
}

// ---------------------------------------------------------------- render
function frameState(t) {
  if (t < ENTRY_END) return entry(t);
  if (t >= EXIT_START) return entry((END - t) * ENTRY_END / (END - EXIT_START));
  if (t < 28.6) return arcsAndHormuz(t);
  if (t < 37.1) return brentSection(t);
  return shipAndSpain(t);
}

window.renderAt = function (t) {
  const st = frameState(t);
  renderer.setRenderTarget(rtA); renderer.render(st.scene, st.cam);
  if (st.sceneB && st.mixB > 0) { renderer.setRenderTarget(rtB); renderer.render(st.sceneB, st.camB); }
  mixMat.uniforms.tA.value = rtA.texture;
  mixMat.uniforms.tB.value = (st.sceneB && st.mixB > 0) ? rtB.texture : rtA.texture;
  mixMat.uniforms.mixAB.value = st.mixB || 0; mixMat.uniforms.blur.value = st.blur || 0;
  mixMat.uniforms.white.value = clamp(st.white || 0); mixMat.uniforms.black.value = clamp(st.black || 0);
  mixMat.uniforms.vig.value = st.scene === brent ? 0.12 : 0.4;
  mixMat.uniforms.wipeR.value = st.wipe ? st.wipe.r : 0;
  if (st.wipe) { mixMat.uniforms.wipeC.value.set(st.wipe.c[0], st.wipe.c[1]); mixMat.uniforms.wipeCol.value = st.wipe.col; }
  renderer.setRenderTarget(rtC); renderer.render(quadScene, quadCam);
  bloom.strength = st.bloom; bloom.enabled = st.bloom > 0;
  renderer.setRenderTarget(null);
  composer.render();
  return true;
};

// ---------------------------------------------------------------- arranque
(async () => {
  const F = '../../../engine/fonts/';
  const faces = [new FontFace('Inter', `url(${F}Inter-Black.otf)`, { weight: '900' }), new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '800' }),
    new FontFace('Inter', `url(${F}Inter-Bold.otf)`, { weight: '700' }), new FontFace('Inter', `url(${F}Inter-SemiBold.otf)`, { weight: '600' }),
    new FontFace('Inter', `url(${F}Inter-Medium.otf)`, { weight: '500' }), new FontFace('Mono', `url(${F}DejaVuSansMono-Bold.ttf)`, { weight: '700' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  const [c50, c10] = await Promise.all([loadTopo('../../../engine/geo/countries-50m.json'), loadTopo('../../../engine/geo/countries-10m.json')]);
  await buildEarth(c50, c10); buildStreet(c50); buildBrent();
  window.ready = true;
})().catch(e => { console.error('ERROR', e.stack || e); window.failed = String(e); });
