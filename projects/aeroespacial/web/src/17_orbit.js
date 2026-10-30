// ---------------------------------------------------------------- 7 · la Tierra (continentes del mapa real, nubes, atmósfera, luces de ciudades de noche), el cohete que pone el satélite en órbita y el tráfico aéreo
const EC = v3(220, 0, 0), ER = 4.0, ORB = 4.9, ESUN = new THREE.Vector3(-0.25, 0.35, 0.9).normalize(), ESUN_N = new THREE.Vector3(0.78, 0.12, -0.62).normalize();   // de día, y anocheciendo sobre Europa
async function loadTopoLocal(url) {
  const d = await (await fetch(url)).json(); const [sx, sy] = d.transform.scale, [tx, ty] = d.transform.translate;
  const arcs = d.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const ring = idx => { const pts = []; for (const i of idx) { const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
  return d.objects.countries.geometries.map(g => { const polys = g.type === 'MultiPolygon' ? g.arcs : g.type === 'Polygon' ? [g.arcs] : []; return { name: (g.properties || {}).name || '', rings: polys.flatMap(p => p.map(ring)) }; });
}
const llv = (lon, lat, r = ER) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return v3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)); };
const EARTH_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
#include <logdepthbuf_vertex>
}`;
const EARTH_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tDay, tNight, tClouds; uniform vec3 sunDir, camP; uniform float night, cloudsK, time; varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(camP - vW); float d = dot(N, sunDir);
  vec4 day = texture2D(tDay, vUv); vec3 col = pow(day.rgb, vec3(2.2));
  float lit = smoothstep(-0.12, 0.25, d);
  vec3 H = normalize(sunDir + V); float sp = pow(max(dot(N, H), 0.), 60.) * (1. - day.a) * 0.9;
  vec3 c = col * (0.03 + 1.25 * max(d, 0.)) + vec3(1.0, 0.92, 0.8) * sp * lit;
  vec2 cu = vUv + vec2(time * 0.002, 0.); float cl = texture2D(tClouds, cu).r * cloudsK;
  c = mix(c, vec3(1.0) * (0.04 + 1.2 * max(d, 0.)), cl * 0.85);
  vec3 nl = pow(texture2D(tNight, vUv).rgb, vec3(2.2)) * 3.0 * night * (1. - smoothstep(-0.2, 0.06, d)) * (1. - cl * 0.7);
  float fr = pow(1. - max(dot(N, V), 0.), 3.0);
  c += vec3(0.25, 0.5, 1.0) * fr * (0.15 + 1.2 * lit) + nl;
  gl_FragColor = vec4(c, 1.);
}`;
const ATM_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 sunDir, camP; varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN), V = normalize(camP - vW); float f = pow(1. - abs(dot(N, V)), 5.0), l = smoothstep(-0.3, 0.4, dot(N, sunDir));
  gl_FragColor = vec4(vec3(0.3, 0.6, 1.2) * f * (0.1 + 1.6 * l), f * l);
}`;
async function buildEarth() {
  const C = await loadTopoLocal('../../../engine/geo/countries-50m.json');
  const Wt = 2048, Ht = 1024, X = lo => (lo + 180) / 360 * Wt, Y = la => (90 - la) / 180 * Ht;
  const land = document.createElement('canvas'); land.width = Wt; land.height = Ht; const lg = land.getContext('2d'); lg.fillStyle = '#000'; lg.fillRect(0, 0, Wt, Ht); lg.fillStyle = '#fff';
  for (const c of C) for (const r of c.rings) { lg.beginPath(); let px = null; r.forEach(([lo, la], i) => { const x = X(lo), y = Y(la); if (i === 0 || (px !== null && Math.abs(x - px) > Wt / 2)) lg.moveTo(x, y); else lg.lineTo(x, y); px = x; }); lg.closePath(); lg.fill(); }
  const mask = lg.getImageData(0, 0, Wt, Ht).data, isLand = (x, y) => mask[((Math.floor(y) * Wt) + Math.floor(x)) * 4] > 128;
  // ruido suave (sin cuadros) para el color de la tierra
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), hh = (a, b) => hash(a * 0.317 + b * 1.731);
    return lerp(lerp(hh(xi, yi), hh(xi + 1, yi), sx), lerp(hh(xi, yi + 1), hh(xi + 1, yi + 1), sx), sy); };
  const day = canvasTex(Wt, Ht, (g, w, h) => { const oc = g.createLinearGradient(0, 0, 0, h); oc.addColorStop(0, '#0c2238'); oc.addColorStop(0.5, '#0f3a5e'); oc.addColorStop(1, '#0c2238'); g.fillStyle = oc; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) { const la = 90 - y / h * 180, al = Math.abs(la);
      for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (!isLand(x, y)) { d[i + 3] = 0; continue; }
        const n = vn(x / 22, y / 22) * 0.22 + vn(x / 6, y / 6) * 0.1;
        let c = al < 12 ? [38, 82, 34] : al < 32 ? [150, 128, 84] : al < 55 ? [70, 98, 52] : al < 66 ? [88, 96, 74] : [228, 234, 240];
        if (al > 18 && al < 32 && n > 0.2) c = [96, 108, 60]; if (al >= 32 && al < 45 && n > 0.24) c = [128, 116, 80];
        d[i] = c[0] * (0.85 + n); d[i + 1] = c[1] * (0.85 + n); d[i + 2] = c[2] * (0.85 + n); d[i + 3] = 255; } }
    for (let y = 0; y < h; y++) { const la = 90 - y / h * 180; if (Math.abs(la) > 78) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 236; d[i + 3] = 255; } }
    g.putImageData(img, 0, 0); });
  day.colorSpace = THREE.NoColorSpace;
  // luces de noche: puntos en tierra, más densos en Europa, Norteamérica, India y Asia oriental
  const nightT = canvasTex(Wt, Ht, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const boxes = [[-10, 36, 30, 60, 1.0], [-125, 25, -70, 50, 0.8], [68, 8, 90, 30, 0.9], [100, 20, 142, 42, 0.9], [-60, -35, -35, -5, 0.4], [-100, 15, -80, 25, 0.5]];
    for (let i = 0; i < 60000; i++) { let lo = hash(i * 1.37) * 360 - 180, la = Math.asin(hash(i * 2.11) * 2 - 1) * 180 / Math.PI * 0.85, wgt = 0.07;
      for (const [a, b, c2, d2, k] of boxes) if (lo > a && lo < c2 && la > b && la < d2) wgt = k; if (hash(i * 3.7) > wgt) continue;
      const x = X(lo), y = Y(la); if (!isLand(x, y)) continue; const s = hash(i * 5.3); g.fillStyle = `rgba(255,${190 + s * 40},${120 + s * 50},${0.25 + s * 0.6})`; g.fillRect(x, y, s > 0.9 ? 2 : 1, s > 0.9 ? 2 : 1); } });
  // nubes: muchas manchas pequeñas y alargadas en las bandas de verdad (ecuador y latitudes medias), en grupos
  const clouds = canvasTex(2048, 1024, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < 420; c++) { const la0 = (hash(c * 4.1) < 0.3 ? (hash(c * 1.1) - 0.5) * 18 : (hash(c * 2.3) < 0.5 ? 1 : -1) * (35 + hash(c * 3.3) * 28)), x0 = hash(c * 5.7) * w, y0 = (90 - la0) / 180 * h;
      for (let i = 0; i < 16; i++) { const x = x0 + (hash(c * 31 + i) - 0.5) * 90, y = y0 + (hash(c * 17 + i * 3) - 0.5) * 30, r = 3 + hash(c * 7 + i * 5) * 11;
        g.save(); g.translate(x, y); g.scale(2.2, 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore(); } } });
  clouds.colorSpace = THREE.NoColorSpace; clouds.wrapS = THREE.RepeatWrapping;
  const G = new THREE.Group(); G.position.copy(EC); scene.add(G); S.earth = G;
  const eu = { tDay: { value: day }, tNight: { value: nightT }, tClouds: { value: clouds }, sunDir: { value: ESUN.clone() }, camP: { value: new THREE.Vector3() }, night: { value: 1 }, cloudsK: { value: 1 }, time: { value: 0 } };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 128, 64), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: eu })); ball.rotation.y = -Math.PI / 2; G.add(ball); S.earthU = eu; S.ball = ball;
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.035, 96, 48), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: ATM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { sunDir: eu.sunDir, camP: eu.camP } })); G.add(atm);
  // tráfico aéreo: ~1800 aviones en rutas entre aeropuertos (círculo máximo), luces que avanzan
  const AP = [[-3.56, 40.49], [2.08, 41.3], [-0.12, 51.47], [2.55, 49.0], [8.56, 50.03], [4.76, 52.31], [11.79, 48.35], [12.25, 41.8], [-9.13, 38.77], [23.94, 37.94], [28.81, 40.98], [37.41, 55.97], [-73.78, 40.64], [-87.9, 41.98], [-118.4, 33.94], [-80.29, 25.8], [-43.25, -22.81], [-58.54, -34.82], [-99.07, 19.43], [55.36, 25.25], [51.61, 25.27], [72.87, 19.09], [77.1, 28.56], [103.99, 1.36], [113.91, 22.31], [121.8, 31.14], [116.6, 40.08], [139.78, 35.55], [151.18, -33.95], [28.24, -26.13], [31.4, 30.12], [-6.27, 53.42], [10.74, 59.98], [18.92, 59.65], [-79.63, 43.68], [-122.38, 37.62], [-15.45, 28.06], [-5.9, 35.73], [3.21, 6.58], [-17.08, 14.74]];
  const routes = []; for (let i = 0; i < 260; i++) { const a = AP[Math.floor(hash(i * 3.1) * AP.length)], b = AP[Math.floor(hash(i * 7.3 + 1) * AP.length)]; if (a === b) continue; routes.push([a, b]); }
  const NP = 1800, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3));
  S.planes = new THREE.Points(pg, new THREE.PointsMaterial({ map: starTex0(), color: new THREE.Color(1.6, 1.4, 1.0), size: 0.045, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }));
  S.planes.frustumCulled = false; G.add(S.planes); S.planeData = Array.from({ length: NP }, (_, i) => ({ r: routes[i % routes.length], ph: hash(i * 1.9), sp: 0.015 + hash(i * 2.7) * 0.02 }));
  const rl = []; routes.forEach(([a, b]) => { const A = llv(a[0], a[1], 1).normalize(), B = llv(b[0], b[1], 1).normalize(); for (let k = 0; k < 24; k++) { const p = A.clone().lerp(B, k / 24).normalize().multiplyScalar(ER * 1.012), q = A.clone().lerp(B, (k + 1) / 24).normalize().multiplyScalar(ER * 1.012); rl.push(p.x, p.y, p.z, q.x, q.y, q.z); } });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rl, 3)); S.routes = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x5fb8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); G.add(S.routes);
  // costas y fronteras de Europa y el norte de África (nítidas al acercarse a Madrid); España en ámbar
  const segs = [], segsES = [];
  for (const c of C) for (const r of c.rings) { if (!r.some(([lo, la]) => lo > -25 && lo < 42 && la > 24 && la < 64)) continue; let prev = null;
    for (const q of r) { if (prev && Math.hypot(q[0] - prev[0], q[1] - prev[1]) < 0.12) continue; if (prev) (c.name === 'Spain' ? segsES : segs).push(llv(prev[0], prev[1], ER * 1.0015), llv(q[0], q[1], ER * 1.0015)); prev = q; } }
  const mkS = (arr, col, w) => { const n = arr.length / 2, l = segSet(n, col, w, 0); for (let i = 0; i < n; i++) l.userData.set(i, arr[2 * i], arr[2 * i + 1]); l.userData.flush(); G.add(l); return l; };
  S.coast = mkS(segs, 0x9fb4cc, 1.3); S.coastES = mkS(segsES, 0xffb547, 2.4);
  // llegadas a Madrid: aviones en fila hacia la pista, con su anillo de separación
  S.mad = llv(-3.56, 40.49); S.madN = S.mad.clone().normalize();
  S.approach = Array.from({ length: 7 }, (_, i) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.6), toneMapped: false })); G.add(p);
    const rgm = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.034, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.4, 0.9), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); p.add(rgm); return { p, rgm }; });
  S.runway = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.008), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.6), side: THREE.DoubleSide, toneMapped: false })); G.add(m); return m; });
  // el cohete pequeño (escala de la Tierra), el satélite, la órbita y las flechas
  S.orbRocket = makeRocket(); S.orbRocket.scale.setScalar(0.22); G.add(S.orbRocket);
  S.orbJet = buildJet({ n: 1600, len: 0.4, rad: 0.012, spread: 0.07, speed: 2.4, size: 1.1, bright: 1.2, seed: 11 });
  S.orbSat = makeSat(); S.orbSat.scale.setScalar(0.12); G.add(S.orbSat);
  const op = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; op.push(v3(Math.cos(a) * ORB, Math.sin(a) * ORB, 0)); }
  S.orbLine = drawLine(op, 0x9fe8ff, 2.2, 0.9); G.add(S.orbLine);
  const tr = []; for (let i = 0; i <= 80; i++) tr.push(v3(0, 0, 0)); S.trail = drawLine(tr, 0xffd29a, 2.6, 0.9); G.add(S.trail);
  S.gArrow = arrow3(1, plastic(0xff4b5c, 0.25), 0.03); G.add(S.gArrow); S.vArrow = arrow3(1, plastic(0x38e08a, 0.25), 0.03); G.add(S.vArrow);
  const fall = []; for (let i = 0; i <= 40; i++) fall.push(v3(0, 0, 0)); S.fall = drawLine(fall, 0xffffff, 1.8, 0.7); S.fall.material.dashed = true; S.fall.material.dashSize = 0.06; S.fall.material.gapSize = 0.05; G.add(S.fall);
}
// trayectoria de lanzamiento en el plano XY de la órbita (ángulo θ desde +y): sube vertical y gira hasta ir horizontal a la altura de la órbita
const TH0 = 0.1;
function launch(t) {
  const t0 = K.mecanica - 0.6, u = clamp((t - t0) / (K.satelite - t0 + 0.25));
  const r = lerp(ER, ORB, sm5(clamp(u * 1.05))), th = TH0 - Math.pow(u, 1.8) * 0.85;
  return { p: v3(Math.sin(th) * r, Math.cos(th) * r, 0), th, r, u };
}
const OMEGA = 0.55;      // velocidad angular del satélite en órbita (rad/s, de película)
function satPos(t) { const t1 = K.satelite + 0.25, L = launch(t1); const th = L.th - OMEGA * Math.max(0, t - t1); return { p: v3(Math.sin(th) * ORB, Math.cos(th) * ORB, 0), th }; }
function orbitAt(t) {
  const on = t > K.mecanica - 0.6 && t < K.de11 + 0.1; S.earth.visible = on; if (!on) { S.orbJet.u.power.value = 0; return; }
  S.earthU.time.value = t; S.earthU.camP.value.copy(cam.position); S.earthU.sunDir.value.copy(ESUN).lerp(ESUN_N, win(t, K.navegacion - 0.45, 1.3)).normalize();
  S.earth.rotation.y = 0.0;
  // cohete: sube y gira; a los 1,4 s se separa la primera etapa; con «satélite» se abre la cofia
  const L = launch(t), dirv = launch(t + 0.02).p.sub(launch(t - 0.02).p).normalize(), tS = K.satelite - 0.1;
  const R = S.orbRocket; R.visible = t < K.orbita + 0.6; R.position.copy(L.p); R.quaternion.setFromUnitVectors(v3(0, 1, 0), dirv.lengthSq() > 0 ? dirv : v3(0, 1, 0));
  const sep = t > K.como9 + 0.25, fs = Math.max(0, t - (K.como9 + 0.25));
  R.userData.s1.visible = !sep || fs < 1.2; if (sep) { R.userData.s1.position.set(0.03 * fs, -0.25 * fs - 0.5 * fs * fs, 0); R.userData.s1.rotation.z = 1.4 * fs; }
  const fo = Math.max(0, t - tS); R.userData.fair.forEach((f, i) => { f.position.set((i ? -1 : 1) * 0.12 * fo, 0.05 * fo, 0); f.rotation.z = (i ? 1 : -1) * 1.2 * fo; f.visible = fo < 1.0; });
  const noz = R.localToWorld(v3(0, sep ? 0.62 : 0, 0)), dn = R.localToWorld(v3(0, sep ? -0.4 : -1, 0)).sub(noz).normalize();
  jetAt(S.orbJet, noz, dn, (t < tS + 0.05 ? 1 : 0) * clamp((t - (K.mecanica - 0.6)) / 0.2));
  S.orbJet.u.len.value = sep ? 0.25 : 0.4; S.orbJet.u.rad.value = sep ? 0.008 : 0.012;
  // estela del ascenso
  const tr = []; for (let i = 0; i <= 80; i++) { const tt = lerp(K.mecanica - 0.6, Math.min(t, K.satelite + 0.25), i / 80); tr.push(launch(tt).p); }
  S.trail.geometry.setPositions(tr.flatMap(p => [p.x, p.y, p.z])); S.trail.material.opacity = 0.9 * (1 - win(t, K.porque9, 0.6)); S.trail.visible = t > K.mecanica - 0.4;
  // satélite: sale de la cofia y sigue en órbita; despliega los paneles con «órbita»
  const sv = t > tS; S.orbSat.visible = sv; const sp = sv ? satPos(t) : null;
  if (sv) { const p = t < K.satelite + 0.25 ? R.localToWorld(v3(0, 0.95, 0)).sub(S.earth.position) : sp.p; S.orbSat.position.copy(p); S.orbSat.rotation.set(0, t * 0.4, -sp.th); S.orbSat.userData.deploy(win(t, K.orbita - 0.05, 0.7)); }
  drawK(S.orbLine, win(t, K.orbita - 0.1, 0.9)); S.orbLine.material.opacity = 0.9 * (1 - win(t, K.navegacion + 0.4, 0.8));
  // flechas: gravedad hacia el centro, velocidad tangente; y la caída que nunca llega
  const ak = win(t, K.porque9 - 0.05, 0.35), fk = win(t, K.cae - 0.1, 0.45), hide = 1 - win(t, K.y10 - 0.1, 0.4);
  if (sv && ak > 0.01 && hide > 0.01) { const p = sp.p, nIn = p.clone().normalize().negate(), tg = v3(Math.cos(sp.th), -Math.sin(sp.th), 0).negate();
    S.gArrow.visible = true; S.gArrow.position.copy(p); S.gArrow.quaternion.setFromUnitVectors(v3(0, 1, 0), nIn); S.gArrow.userData.setLen(0.8 * ak * hide);
    S.vArrow.visible = true; S.vArrow.position.copy(p); S.vArrow.quaternion.setFromUnitVectors(v3(0, 1, 0), tg.normalize()); S.vArrow.userData.setLen(1.1 * ak * hide);
    const pts = []; for (let i = 0; i <= 40; i++) { const s = i / 40, th = sp.th - s * 1.2; pts.push(v3(Math.sin(th) * (ORB - s * s * 0.35), Math.cos(th) * (ORB - s * s * 0.35), 0)); }
    S.fall.geometry.setPositions(pts.flatMap(q => [q.x, q.y, q.z])); S.fall.computeLineDistances(); S.fall.visible = fk > 0.01; S.fall.material.opacity = 0.8 * fk * hide; }
  else { S.gArrow.visible = S.vArrow.visible = S.fall.visible = false; }
  // tráfico: luces moviéndose por sus rutas; con «aeropuertos», las llegadas a Madrid
  const tk = win(t, K.navegacion - 0.2, 0.6); S.planes.visible = tk > 0.01; S.routes.material.opacity = 0.18 * tk * (1 - 0.6 * win(t, K.aeropuertos, 0.6));
  if (S.planes.visible) { const a = S.planes.geometry.attributes.position.array;
    S.planeData.forEach((d, i) => { const A = llv(d.r[0][0], d.r[0][1], 1).normalize(), B = llv(d.r[1][0], d.r[1][1], 1).normalize(), u = (d.ph + t * d.sp) % 1, p = A.lerp(B, u).normalize().multiplyScalar(ER * 1.014); a.set([p.x, p.y, p.z], i * 3); });
    S.planes.geometry.attributes.position.needsUpdate = true; S.planes.material.size = 0.045 * (1 - 0.55 * win(t, K.aeropuertos, 0.8)); S.planes.material.opacity = tk; }
  const ak2 = win(t, K.aeropuertos - 0.1, 0.5), sk = win(t, K.sin10 - 0.1, 0.35), east = v3(0, 1, 0).cross(S.madN).normalize(), north = S.madN.clone().cross(east).normalize();
  S.runway.forEach((m, k) => { m.visible = ak2 > 0.01; m.position.copy(S.mad).addScaledVector(S.madN, 0.002).addScaledVector(east, (k ? -1 : 1) * 0.012); m.lookAt(S.mad.clone().addScaledVector(S.madN, 1).add(S.earth.position)); m.material.opacity = ak2; m.rotateZ(Math.PI / 2 - 0.1); });
  S.coast.material.opacity = 0.5 * win(t, K.aeropuertos - 0.3, 0.6); S.coastES.material.opacity = 0.95 * win(t, K.aeropuertos - 0.2, 0.6); S.coast.visible = S.coastES.visible = ak2 > 0.01 || t > K.aeropuertos - 0.3;
  S.approach.forEach((A, i) => { const s = ((t * 0.08 + i / 7) % 1), d = 0.03 + (1 - s) * 0.42, h = 0.004 + (1 - s) * 0.05;
    A.p.visible = ak2 > 0.01; A.p.position.copy(S.mad).addScaledVector(north, -d).addScaledVector(S.madN, h); A.rgm.visible = sk > 0.01; A.rgm.scale.setScalar(Math.max(0.001, sk)); A.rgm.material.opacity = sk; A.rgm.lookAt(cam.position); });
}
