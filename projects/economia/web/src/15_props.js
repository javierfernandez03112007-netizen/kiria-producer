// ---------------------------------------------------------------- objetos que se mueven: la montaña dorada y los 100 gestores, las monedas y el embudo,
// la casa del alquiler, las tres pantallas de la macro, la torre de oficinas, las dos medallas, la burbuja, las comisiones, la línea que
// copia a la bolsa y el humo.
const _o = new THREE.Object3D(), _q0 = new THREE.Quaternion(), _Y = v3(0, 1, 0);
const CH = { x0: -1.3, x1: 1.3, z0: -0.1, z1: 0.9, h: 0.6 };
const chartU = u => 0.05 + 0.5 * Math.pow(u, 1.15) + 0.035 * Math.sin(u * 23) * (1 - u * 0.4) + 0.025 * Math.sin(u * 61 + 1) - (u > 0.42 && u < 0.55 ? 0.06 * Math.sin((u - 0.42) / 0.13 * Math.PI) : 0);
const chartY = (x, k = 1) => PLAT_Y + chartU(clamp((x - CH.x0) / (CH.x1 - CH.x0))) * k;
const WIN = [96, 97, 98, 99];           // los 4 que se quedan arriba
const CSUIT = new THREE.Color(0x6a707b), CGOLD = new THREE.Color(0xffc24a);
function buildProps() {
  const P = S.props = {};
  // la montaña dorada: el perfil de la cotización extruido 1 m de fondo
  const sh = new THREE.Shape(); sh.moveTo(CH.x0, 0); const N = 220;
  for (let i = 0; i <= N; i++) { const u = i / N, x = lerp(CH.x0, CH.x1, u); sh.lineTo(x, chartU(u)); }
  sh.lineTo(CH.x1, 0); sh.closePath();
  const cg = new THREE.ExtrudeGeometry(sh, { depth: CH.z1 - CH.z0, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 4 });
  const chart = mesh(cg, M.goldChart); chart.position.set(0, PLAT_Y, CH.z0); scene.add(chart); P.chart = chart;
  // los 100 gestores (10 × 10), con traje; los 4 de arriba, dorados
  const fm = new THREE.InstancedMesh(figGeo(), M.suit, 100); fm.castShadow = true; fm.receiveShadow = true; fm.frustumCulled = false; scene.add(fm); P.figs = fm;
  P.fig0 = []; for (let i = 0; i < 100; i++) { const c = i % 10, r = Math.floor(i / 10), u = 0.06 + c * 0.093 + (hash(i * 3.3) - 0.5) * 0.02;
    P.fig0.push({ x: lerp(CH.x0, CH.x1, WIN.includes(i) ? 0.86 + (i - 96) * 0.03 : u), z: CH.z0 + 0.09 + r * 0.088 + (hash(i * 5.1) - 0.5) * 0.02, ts: K.n96 + 0.05 + hash(i * 7.7) * 0.55, rot: hash(i * 2.9) * 6.28 });
    fm.setColorAt(i, WIN.includes(i) ? CGOLD : CSUIT.clone().offsetHSL(0, 0, (hash(i) - 0.5) * 0.06)); }
  // monedas y embudo (L3)
  const fun = lathe([[0.025, 0], [0.03, 0.06], [0.03, 0.09], [0.16, 0.26], [0.17, 0.27], [0.155, 0.27], [0.024, 0.095], [0.02, 0.06], [0.016, 0]], 48, M.silver);
  fun.position.set(ST3.x + 0.05, DESK_Y + 0.11, ST3.z - 0.12); scene.add(fun); P.funnel = fun;
  const legs = [0, 1, 2].map(k => { const a = k / 3 * Math.PI * 2, l = cyl(0.006, 0.006, 0.2, M.dsteel, 8); l.position.set(fun.position.x + Math.cos(a) * 0.1, DESK_Y + 0.1, fun.position.z + Math.sin(a) * 0.1); scene.add(l); return l; });
  const coins = new THREE.InstancedMesh(coinGeo(), M.coin, 25); coins.castShadow = true; coins.frustumCulled = false; scene.add(coins); P.coins = coins;
  P.heap = []; for (let i = 0; i < 24; i++) { const a = hash(i * 1.7) * 6.28, r = Math.sqrt(hash(i * 2.3)) * 0.1; P.heap.push(v3(ST3.x + 0.05 + Math.cos(a) * r, DESK_Y + 0.003 + Math.floor(i / 8) * 0.0065 + 0.003, ST3.z + 0.22 + Math.sin(a) * r)); }
  // casa del alquiler (L4) con su cartel de precio
  const hs = houseModel(); hs.position.set(ST4.x + 0.02, DESK_Y, ST4.z - 0.05); hs.rotation.y = Math.PI / 2; scene.add(hs); P.house = hs;
  P.rentTex = cpuTex(512, 256); P.rentK = -1;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: P.rentTex, roughness: 0.5 })); tag.position.set(ST4.x + 0.05, DESK_Y + 0.5, ST4.z + 0.24); tag.rotation.y = Math.PI / 2; scene.add(tag); P.tag = tag;
  const pole = cyl(0.005, 0.005, 0.42, M.dsteel, 8); pole.position.set(ST4.x + 0.05, DESK_Y + 0.21, ST4.z + 0.24); scene.add(pole);
  const arrow = arrow3(0.3, M.gold, 0.012); arrow.position.set(ST4.x + 0.05, DESK_Y + 0.28, ST4.z - 0.05); scene.add(arrow); P.rentArrow = arrow;
  // las tres pantallas de la macro (L5)
  P.macroTex = [0, 1, 2].map(() => cpuTex(512, 320)); P.macroK = -1;
  P.macroMon = P.macroTex.map((t, k) => { const mo = monitor(t, 0.52, 0.32); mo.position.set(ST5.x + 0.05, DESK_Y, ST5.z - (k - 1) * 0.58); mo.rotation.y = Math.PI / 2 + (k - 1) * 0.22; scene.add(mo); return mo; });
  // torre de oficinas (L8) en su pedestal
  const tw = towerModel(1.0); tw.position.set(ST8.x, 0.95, ST8.z); scene.add(tw); P.tower = tw;
  // dos medallas (L9) en su pedestal, una frente a otra
  P.medals = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(ST9.x, 0.95, ST9.z + s * 0.16); scene.add(g);
    const st = cyl(0.008, 0.012, 0.13, M.dsteel, 10); st.position.y = 0.065; g.add(st); const md = medal(); md.position.y = 0.24; g.add(md); g.userData.md = md; g.userData.s = s; return g; });
  // la burbuja (L10) sobre la montaña y sus gotas al explotar
  P.bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { tm: { value: 0 } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: '#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform float tm; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){\n#include <logdepthbuf_fragment>\n float f = 1.0 - abs(dot(normalize(vN), vV)); float a = pow(f, 2.0) * 2.4 + 0.06; vec3 iri = 0.5 + 0.5 * cos(6.2831 * (f * 1.6 + vP.y * 0.8 + tm * 0.2) + vec3(0.0, 2.1, 4.2)); vec3 c = mix(vec3(1.0), iri, 0.55) * a; float sp = pow(max(0.0, dot(reflect(-vV, normalize(vN)), normalize(vec3(0.4, 0.8, 0.5)))), 60.0) * 2.5; gl_FragColor = vec4(c + sp, 1.0); }' }));
  P.bubble.position.set(0.55, PLAT_Y + 1.0, 0.4); P.bubble.renderOrder = 6; scene.add(P.bubble);
  P.drops = sparks(scene, 160, 0xdfe8ff, 0.03);
  // comisiones (L11): la pila del inversor y la caja de cristal donde se van las monedas
  const cm = new THREE.InstancedMesh(coinGeo(), M.coin, 14); cm.castShadow = true; cm.frustumCulled = false; scene.add(cm); P.cstack = cm;
  const box = mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), M.glass, false); box.position.set(ST11.x - 0.02, DESK_Y + 0.1, ST11.z - 0.25); scene.add(box); P.cbox = box;
  const bl = plateText(0.3, 0.06, [['COMISIONES', 0.62, 0.55]], { bg: '#121316', fg: '#f2eee6' }); bl.position.set(ST11.x - 0.02, DESK_Y + 0.24, ST11.z - 0.25); bl.rotation.y = -Math.PI / 2; scene.add(bl);
  // la línea que copia a la bolsa (L12): tubo plateado sobre el canto delantero de la montaña
  const pts = []; for (let i = 0; i <= 160; i++) { const x = lerp(CH.x0, CH.x1 + 0.35, i / 160), xx = Math.min(x, CH.x1); pts.push(v3(x, (x <= CH.x1 ? chartY(xx) : chartY(CH.x1) + (x - CH.x1) * 0.35) + 0.012, CH.z1 + 0.03)); }
  P.idxCurve = new THREE.CatmullRomCurve3(pts); P.idx = new THREE.Mesh(new THREE.TubeGeometry(P.idxCurve, 320, 0.012, 10, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.9, 1).multiplyScalar(2.2), toneMapped: false }));
  P.idx.geometry.setDrawRange(0, 0); scene.add(P.idx);
  // el «producto» que se convierte en humo (L13)
  const pb = rbox(0.22, 0.22, 0.22, M.gold, 0.02); pb.position.set(0, PLAT_Y + 0.11, 1.32); scene.add(pb); P.pbox = pb;
  P.smoke = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(240 * 3), 3)), new THREE.PointsMaterial({ color: 0xbfc3c8, size: 0.22, transparent: true, opacity: 0.0, depthWrite: false, map: starTex0() }));
  P.smoke.frustumCulled = false; scene.add(P.smoke);
}
// ---------------------------------------------------------------- un instante
function setInst(im, i, p, q, s) { _o.position.copy(p); _o.quaternion.copy(q); _o.scale.setScalar(Math.max(0.0001, s)); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }
function propsAt(t) {
  const P = S.props;
  // la montaña sube con «subió … 58 %» (y vuelve a su sitio para el bucle)
  const kc = lerp(0.4, 1, eo(clamp((t - K.subio1) / (K.pct1 + 0.35 - K.subio1)))) , kcLoop = t > END - 0.8 ? 1 : kc;
  const ky = t > END - 0.8 ? lerp(1, 0.4, eio(clamp((t - (END - 0.8)) / 0.8))) : kc; P.chart.scale.y = ky;
  // los gestores: 96 resbalan montaña abajo y caen al suelo; al final vuelven a subir (bucle)
  const back = win(t, K.dime14, 0.5);
  for (let i = 0; i < 100; i++) {
    const f = P.fig0[i]; let x = f.x, y = chartY(x, ky), z = f.z, tilt = 0, s = 0.13;
    if (!WIN.includes(i) && t > f.ts && back < 1) {
      const u = t - f.ts, xs = f.x - 1.6 * u * u;
      if (xs > CH.x0) { x = xs; y = chartY(x, ky); tilt = Math.min(0.5, u * 0.9); }
      else { const tEdge = f.ts + Math.sqrt((f.x - CH.x0) / 1.6), ue = t - tEdge, v = 3.2 * (tEdge - f.ts); x = CH.x0 - v * ue * 0.6; y = Math.max(PLAT_Y + 0.013, chartY(CH.x0, ky) - 4.9 * ue * ue); tilt = Math.min(Math.PI / 2, 0.5 + ue * 6); if (y <= PLAT_Y + 0.014) x = CH.x0 - 0.04 - hash(i * 9.1) * 0.19; }
      s = 0.13 * (1 - win(t, K.esto14, 0.3));
    }
    if (back > 0 && !WIN.includes(i)) s = 0.13 * pop(t, K.dime14 + hash(i * 3.7) * 0.5, 0.35);
    _o.position.set(x, y, z); _o.rotation.set(0, f.rot * 0.2 - 0.3, tilt); _o.scale.setScalar(Math.max(0.0001, s)); _o.updateMatrix(); P.figs.setMatrixAt(i, _o.matrix);
  }
  P.figs.instanceMatrix.needsUpdate = true;
  // monedas: montón al decir «rico»; se cuelan por el embudo con «casi nadie» y solo sale una con «consigue»
  for (let i = 0; i < 25; i++) {
    let p = null, q = _q0.identity(), s = 1;
    if (i < 24) { const t0 = K.rico3 - 0.15 + i * 0.012, u = clamp((t - t0) / 0.4), h = P.heap[i];
      if (u <= 0) s = 0; else { p = h.clone(); p.y += (1 - eo(u)) * 0.5; q = new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(i) - 0.5) * 0.3, 0, (hash(i * 2) - 0.5) * 0.3)); }
      const t1 = K.casi3 - 0.05 + i * 0.03, v = clamp((t - t1) / 0.45); if (v > 0 && p) { const top = P.funnel.position.clone().add(v3(0, 0.27, 0)); p = easeArc(h, top, v, 0.18); if (v > 0.85) s = (1 - v) / 0.15; }
      if (t > K.micro4 + 0.6) s = 0; }
    else { const t2 = K.consigue3 - 0.08, u = clamp((t - t2) / 0.35); if (u > 0 && t < K.micro4 + 0.6) { p = P.funnel.position.clone().add(v3(0.0, -0.11 + 0.0 * u, 0)); p.y = lerp(DESK_Y + 0.05, DESK_Y + 0.003, eo(u)); p.x += 0.12 * eo(u); } else s = 0; }
    if (!p) { p = v3(0, -5, 0); s = 0; }
    setInst(P.coins, i, p, q, s);
  }
  P.coins.instanceMatrix.needsUpdate = true;
  // alquiler: el precio sube de 750 € a 1.050 € al decir «sube»; la flecha crece
  { const k = clamp((t - K.sube4) / 0.6), v = Math.round(lerp(750, 1050, eio(k)) / 10) * 10;
    if (v !== P.rentK) { P.rentK = v; const T = P.rentTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height; g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#141416'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#555'; g.font = '800 44px Inter'; g.textAlign = 'center'; g.fillText('ALQUILER', w / 2, 72); g.fillStyle = k > 0 ? '#c0392b' : '#141416'; g.font = '900 104px Inter'; g.fillText(v.toLocaleString('es-ES') + ' €', w / 2, 190); T.needsUpdate = true; }
    P.rentArrow.userData.setLen(0.02 + 0.32 * eo(k)); P.rentArrow.visible = k > 0.01; }
  // macro: inflación, paro y crisis (cada pantalla se dibuja al decir su palabra)
  { const ks = [clamp((t - K.inflacion5 + 0.05) / 0.6), clamp((t - K.paro5 + 0.05) / 0.5), clamp((t - K.crisis5 + 0.05) / 0.6)], key = ks.map(v => Math.round(v * 40)).join(',');
    if (key !== P.macroK) { P.macroK = key; P.macroTex.forEach((T, k) => drawMacro(T, k, ks[k])); } }
  // torre: crece planta a planta con «Finanzas»
  { const k = clamp((t - K.finanzas8 + 0.1) / 0.8), n = P.tower.userData.n, kk = Math.max(0.06, Math.ceil(k * n) / n); P.tower.userData.body.scale.y = kk; P.tower.userData.body.position.y = kk * P.tower.userData.h / 2; P.tower.userData.cap.position.y = kk * P.tower.userData.h + 0.015; }
  // medallas: aparecen con «dos» y se dan la espalda con «contrario»
  P.medals.forEach(g => { const s = g.userData.s, k = pops(t, K.nobel9 - 0.1 + (s > 0 ? 0.12 : 0), 0.4), turn = eio(clamp((t - K.contrario9) / 0.5));
    g.scale.setScalar(k); g.userData.md.rotation.y = s * (Math.PI / 2) * (1 - 2 * turn) * -1 + Math.sin(t * 1.3 + s) * 0.05; });
  // burbuja: se infla con «infla burbujas» y explota al acabar la frase
  { const t0 = K.infla10 - 0.05, tp = K.quien11 - 0.15, k = clamp((t - t0) / (tp - t0)); P.bubble.visible = k > 0 && t < tp; P.bubble.scale.setScalar(0.02 + 0.36 * eo(k) + 0.01 * Math.sin(t * 12)); P.bubble.material.uniforms.tm.value = t;
    P.drops.visible = t > tp && t < tp + 0.7; if (P.drops.visible) burst(P.drops, P.bubble.position, t, tp, 0.9, 0.7, false, 2.5); }
  // comisiones: 5 monedas vuelan de la pila a la caja de cristal
  { for (let i = 0; i < 14; i++) { const base = v3(ST11.x + 0.02, DESK_Y + 0.003 + i * 0.0065, ST11.z + 0.18); let p = base, s = pops(t, K.quien11 + 0.3, 0.4);
      if (i >= 9) { const t0 = K.comisiones11 - 0.35 + (13 - i) * 0.12, u = clamp((t - t0) / 0.4); if (u > 0) p = easeArc(base, P.cbox.position.clone().add(v3(0, -0.05 + (13 - i) * 0.007, 0)), u, 0.15); }
      setInst(P.cstack, i, p, _q0.identity(), s); }
    P.cstack.instanceMatrix.needsUpdate = true; }
  // la línea que copia a la bolsa: se dibuja con «copian» y adelanta con «acaban por delante»
  { const a = clamp((t - K.copian12 + 0.05) / 0.7) * 0.8 + clamp((t - K.acaban12) / 0.9) * 0.2, n = P.idx.geometry.index.count;
    P.idx.geometry.setDrawRange(0, Math.floor(n * a / 6) * 6); P.idx.visible = a > 0.001 && t < K.dime14 + 0.3; }
  // el «producto» brillante aparece con «vendan» y se deshace en humo con «humo»
  { const k = pops(t, K.vendan13 - 0.15, 0.35), th = K.humo13, u = clamp((t - th) / 1.1);
    P.pbox.visible = k > 0.01 && t < th + 0.05; P.pbox.scale.setScalar(k); P.pbox.rotation.y = t * 0.8;
    P.smoke.visible = u > 0 && u < 1; if (P.smoke.visible) { const a = P.smoke.geometry.attributes.position.array, c = P.pbox.position;
      for (let i = 0; i < 240; i++) { const th2 = hash(i * 1.3) * 6.283, ph = (hash(i * 2.7) - 0.2) * 1.2, r = (0.05 + hash(i * 3.9) * 0.5) * eo(u);
        a[i * 3] = c.x + Math.cos(th2) * Math.cos(ph) * r; a[i * 3 + 1] = c.y + Math.sin(ph) * r * 0.7 + u * 0.3; a[i * 3 + 2] = c.z + Math.sin(th2) * Math.cos(ph) * r; }
      P.smoke.geometry.attributes.position.needsUpdate = true; P.smoke.material.opacity = 0.55 * (1 - u); P.smoke.material.size = 0.12 + 0.3 * u; } }
}
function easeArc(a, b, u, hgt) { const p = a.clone().lerp(b, eio(clamp(u))); p.y += Math.sin(Math.PI * clamp(u)) * hgt; return p; }
// pantallas de la macro: 0 inflación (precios que suben), 1 paro (barras), 2 crisis (caída)
function drawMacro(T, k, kk) {
  const g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height;
  g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#e9edf2'; g.font = '800 40px Inter'; g.fillText(['INFLACIÓN', 'PARO', 'CRISIS'][k], 22, 52);
  if (kk <= 0) { T.needsUpdate = true; return; }
  g.lineWidth = 7; g.lineJoin = 'round'; g.lineCap = 'round';
  if (k === 0) { g.strokeStyle = '#ffc24a'; g.beginPath(); const n = Math.floor(60 * kk); for (let i = 0; i <= n; i++) { const x = 30 + i * 7.5, y = h - 50 - Math.pow(i / 60, 1.6) * 180 - Math.sin(i * 0.7) * 6; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  if (k === 1) { for (let i = 0; i < 8; i++) { const v = clamp(kk * 8 - i); if (v <= 0) break; const bh = (60 + hash(i * 3.1) * 140) * v; g.fillStyle = i === 7 ? '#ff5a4e' : '#c9ced6'; g.fillRect(36 + i * 56, h - 30 - bh, 38, bh); } }
  if (k === 2) { g.strokeStyle = '#ff5a4e'; g.beginPath(); const n = Math.floor(60 * kk); for (let i = 0; i <= n; i++) { const x = 30 + i * 7.5, y = i < 38 ? h - 120 - i * 2.4 - Math.sin(i) * 5 : h - 211 + (i - 38) * 8.5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  T.needsUpdate = true;
}
