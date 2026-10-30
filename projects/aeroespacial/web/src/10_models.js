// ---------------------------------------------------------------- perfiles NACA de 4 dígitos (contorno cerrado: borde de salida extradós → borde de ataque → borde de salida intradós)
function naca(m, p, tt, n = 20) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos(Math.PI * i / n)) / 2;
    const yt = 5 * tt * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0, dy = 0;
    if (m > 0) { if (x < p) { yc = m / (p * p) * (2 * p * x - x * x); dy = 2 * m / (p * p) * (p - x); } else { yc = m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x); dy = 2 * m / ((1 - p) ** 2) * (p - x); } }
    const th = Math.atan(dy);
    up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]); lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return [...up.slice().reverse(), ...lo.slice(1)];
}
// ala trapecial con flecha, diedro, torsión y perfil que adelgaza; envergadura a lo largo de +z (raíz en z = 0), borde de ataque de la raíz en x = 0
function wingGeo(o) {
  const nS = o.nS || 16, LR = naca(o.m ?? 0.02, o.p ?? 0.4, o.tcR, 20), LT = naca(o.m ?? 0.02, o.p ?? 0.4, o.tcT, 20), nL = LR.length;
  const pos = [], uv = [], idx = [];
  const sec = e => { const c = lerp(o.cr, o.ct, e), xLE = -e * o.span * Math.tan(o.sweep), y0 = e * o.span * Math.tan(o.dih), z = e * o.span, tw = -(o.twist || 0) * e;
    return LR.map((q, i) => { const ax = lerp(q[0], LT[i][0], e), ay = lerp(q[1], LT[i][1], e), xc = ax - 0.25, xr = xc * Math.cos(tw) - ay * Math.sin(tw) + 0.25, yr = xc * Math.sin(tw) + ay * Math.cos(tw);
      return [xLE - xr * c, y0 + yr * c, z]; }); };
  for (let j = 0; j <= nS; j++) { const e = j / nS; sec(e).forEach((p, i) => { pos.push(...p); uv.push(i / (nL - 1), e); }); }
  for (let j = 0; j < nS; j++) for (let i = 0; i < nL - 1; i++) { const a = j * nL + i, b = a + 1, c2 = a + nL, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
  const tip = sec(1), cx = tip.reduce((s, p) => s + p[0], 0) / nL, cy = tip.reduce((s, p) => s + p[1], 0) / nL, ci = pos.length / 3;
  pos.push(cx, cy, o.span); uv.push(0.5, 1);
  for (let i = 0; i < nL - 1; i++) idx.push(ci, nS * nL + i + 1, nS * nL + i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  g.userData = o; return g;
}
// material de ala que se dobla (flexión ∝ η²) y enseña la tensión (azul → rojo en la raíz) — uniforms en m.userData.u
function flexMat(base, span) {
  const u = { uFlex: { value: 0 }, uSpan: { value: span }, uStress: { value: 0 } };
  base.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uFlex, uSpan; varying float vEta;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat eta = clamp(position.z / uSpan, 0., 1.); vEta = eta; transformed.y += uFlex * eta * eta * uSpan * 0.34;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFlex, uStress; varying float vEta;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float sv = clamp((1.0 - vEta) * (0.35 + 0.65 * uFlex), 0., 1.);
        vec3 sc = sv < 0.33 ? mix(vec3(0.1, 0.35, 1.0), vec3(0.1, 0.95, 0.6), sv / 0.33) : sv < 0.66 ? mix(vec3(0.1, 0.95, 0.6), vec3(1.0, 0.85, 0.1), (sv - 0.33) / 0.33) : mix(vec3(1.0, 0.85, 0.1), vec3(1.0, 0.15, 0.08), (sv - 0.66) / 0.34);
        totalEmissiveRadiance += sc * uStress * 0.65; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45, uStress);`);
  };
  base.customProgramCacheKey = () => 'flex' + span.toFixed(3); base.userData.u = u; return base;
}
// fuselaje paramétrico: s 0 (morro, x = +0.5) → 1 (cola, x = −0.5); cola que sube por abajo; UV: u = s, v = ángulo desde arriba
function fuselageGeo(R, N = 110, M = 60) {
  const pos = [], uv = [], idx = [];
  const rad = s => s < 0.12 ? R * Math.pow(1 - Math.pow(1 - s / 0.12, 2.2), 0.5) : s < 0.66 ? R : R * Math.max(0.05, 1 - Math.pow((s - 0.66) / 0.34, 1.45) * 0.95);
  const yc = s => s > 0.66 ? (R - rad(s)) * 0.9 : s < 0.12 ? -(R - rad(s)) * 0.3 : 0;
  for (let j = 0; j <= N; j++) { const s = j / N, r = rad(s), y0 = yc(s);
    for (let i = 0; i <= M; i++) { const ph = i / M * Math.PI * 2; pos.push(0.5 - s, y0 + r * Math.cos(ph) * 1.03, r * Math.sin(ph)); uv.push(s, i / M); } }
  for (let j = 0; j < N; j++) for (let i = 0; i < M; i++) { const a = j * (M + 1) + i, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  g.userData = { rad, yc }; return g;
}
// pintura del fuselaje: ventanillas, puertas, cabina, línea de color y panza gris (sin logotipos ni matrícula real)
const _livery = {};
function liveryTex(stripe = '#1f4fa8', stripe2 = '#e3a72f') {
  const key = stripe + stripe2; if (_livery[key]) return _livery[key];
  return _livery[key] = canvasTex(4096, 1024, (g, w, h) => {
    g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, w, h);
    const belly = g.createLinearGradient(0, h * 0.32, 0, h * 0.5); belly.addColorStop(0, 'rgba(160,168,180,0)'); belly.addColorStop(1, 'rgba(160,168,180,.85)');
    g.fillStyle = belly; g.fillRect(0, h * 0.32, w, h * 0.36); const b2 = g.createLinearGradient(0, h * 0.5, 0, h * 0.68); b2.addColorStop(0, 'rgba(160,168,180,.85)'); b2.addColorStop(1, 'rgba(160,168,180,0)'); g.fillStyle = b2; g.fillRect(0, h * 0.5, w, h * 0.18);
    for (const v of [0.236, 0.764]) {        // línea de color bajo las ventanillas
      g.fillStyle = stripe; g.fillRect(w * 0.1, h * v - 9, w * 0.86, 18); g.fillStyle = stripe2; g.fillRect(w * 0.1, h * v + (v < 0.5 ? 13 : -17), w * 0.86, 4);
      for (let s = 0.155; s < 0.665; s += 0.0084) { if (Math.abs(s - 0.4) < 0.012 || Math.abs(s - 0.63) < 0.012) continue;      // ventanillas (salvo en las puertas)
        const x = s * w, y = h * (v < 0.5 ? 0.188 : 0.812); g.fillStyle = '#18202c'; rr(g, x - 7, y - 11, 14, 22, 6); g.fill(); g.fillStyle = 'rgba(150,190,230,.35)'; rr(g, x - 5, y - 9, 6, 9, 3); g.fill(); }
      for (const s of [0.142, 0.4, 0.63]) { g.strokeStyle = 'rgba(80,90,105,.9)'; g.lineWidth = 3; rr(g, s * w - 18, h * (v < 0.5 ? 0.16 : 0.78) - 4, 36, 70, 10); g.stroke(); }
      g.fillStyle = '#121822';                // cabina
      for (let k = 0; k < 3; k++) { const x0 = w * (0.034 + k * 0.011); g.beginPath(); const y = h * (v < 0.5 ? 0.14 : 0.86); g.moveTo(x0, y - 18); g.lineTo(x0 + w * 0.0095, y - 14); g.lineTo(x0 + w * 0.0095, y + 14); g.lineTo(x0, y + 18); g.closePath(); g.fill(); }
    }
    g.fillStyle = '#121822'; g.beginPath(); g.moveTo(w * 0.03, h * 0.03); g.lineTo(w * 0.055, h * 0.06); g.lineTo(w * 0.055, h * 0.94); g.lineTo(w * 0.03, h * 0.97); g.fill();   // parabrisas (por arriba)
  });
}
// góndola de turbofán (eje a lo largo de −x: entrada en x = 0); fan con álabes que giran y cono con espiral (se ve girar)
const SWIRL = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#16181d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2f2'; g.lineWidth = 22; g.beginPath(); g.moveTo(0, h); g.bezierCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.3, w, 0); g.stroke(); });
function nacelle(Ln, Rn, cowl, blades = 22) {
  const g = new THREE.Group();
  const prof = [[0.86, 0], [0.95, 0.012], [1.0, 0.06], [1.0, 0.45], [0.93, 0.78], [0.8, 1.0], [0.74, 0.985], [0.79, 0.32], [0.83, 0.03], [0.86, 0]].map(([r, y]) => [r * Rn, y * Ln]);
  const shell = lathe(prof, 64, cowl); shell.rotation.z = Math.PI / 2; g.add(shell);
  const inner = lathe([[0.79 * Rn, 0.06 * Ln], [0.78 * Rn, 0.9 * Ln]], 48, new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.6, metalness: 0.4, side: THREE.BackSide })); inner.rotation.z = Math.PI / 2; g.add(inner);
  const fan = new THREE.Group(); fan.position.x = -0.13 * Ln; g.add(fan);
  const bm = new THREE.MeshStandardMaterial({ color: 0x8c929c, roughness: 0.28, metalness: 1 });
  for (let i = 0; i < blades; i++) { const p = new THREE.Group(); p.rotation.x = i / blades * Math.PI * 2; fan.add(p);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.005 * Ln * 4, 0.6 * Rn, 0.2 * Rn), bm); b.position.y = 0.46 * Rn; b.rotation.y = 0.75; p.add(b); }
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.2 * Rn, 0.38 * Rn, 32), new THREE.MeshStandardMaterial({ map: SWIRL, roughness: 0.3, metalness: 0.6 })); sp.rotation.z = -Math.PI / 2; sp.position.x = 0.12 * Rn; fan.add(sp);
  const core = lathe([[0.55 * Rn, 0], [0.5 * Rn, 0.25 * Ln], [0.25 * Rn, 0.38 * Ln], [0.02 * Rn, 0.45 * Ln]], 40, metal(0x9aa0aa, 0.35)); core.rotation.z = Math.PI / 2; core.position.x = -0.95 * Ln; g.add(core);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.fan = fan; return g;
}
// avión de pasajeros bimotor de fuselaje ancho (largo 1, morro en +x, ala derecha en +z). update(t, o): fans, luces, flexión
function makeJet(o = {}) {
  const J = new THREE.Group(), R = 0.046;
  const tex = liveryTex(o.stripe, o.stripe2);
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tex, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  const fus = new THREE.Mesh(fuselageGeo(R), skin); fus.castShadow = true; fus.receiveShadow = true; J.add(fus);
  const wingM = flexMat(new THREE.MeshPhysicalMaterial({ color: 0xd2d6dc, roughness: 0.38, metalness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 }), 0.44);
  const W0 = { cr: 0.19, ct: 0.042, span: 0.44, sweep: 0.56, dih: 0.1, tcR: 0.13, tcT: 0.1, twist: 0.06, nS: 20 };
  const wg = wingGeo(W0), wings = [];
  for (const s of [1, -1]) { const w = new THREE.Mesh(wg, wingM); w.position.set(0.08, -0.024, s * R * 0.8); w.scale.z = s; w.castShadow = true; w.receiveShadow = true; J.add(w); wings.push(w);
    // aleta de punta (sharklet)
    const wl = new THREE.Mesh(wingGeo({ cr: 0.042, ct: 0.016, span: 0.04, sweep: 0.75, dih: 1.25, tcR: 0.1, tcT: 0.08, m: 0, nS: 4 }), wingM); wl.position.set(-W0.span * Math.tan(W0.sweep), W0.span * Math.tan(W0.dih), W0.span); w.add(wl); }
  // estabilizadores
  const tailM = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  for (const s of [1, -1]) { const h = new THREE.Mesh(wingGeo({ cr: 0.1, ct: 0.038, span: 0.16, sweep: 0.62, dih: 0.12, tcR: 0.1, tcT: 0.09, m: 0, nS: 8 }), tailM); h.position.set(-0.36, 0.012, s * 0.012); h.scale.z = s; h.castShadow = true; J.add(h); }
  const fin = new THREE.Mesh(wingGeo({ cr: 0.17, ct: 0.065, span: 0.16, sweep: 0.68, dih: 0, tcR: 0.1, tcT: 0.09, m: 0, nS: 8 }), new THREE.MeshPhysicalMaterial({ color: o.tail || 0x1f4fa8, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }));
  fin.rotation.x = -Math.PI / 2; fin.position.set(-0.31, 0.03, 0); fin.castShadow = true; J.add(fin);
  // motores bajo las alas (al 32 % de la semienvergadura), con pilón
  const cowl = new THREE.MeshPhysicalMaterial({ color: 0xeef1f4, roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 });
  const fans = [];
  for (const s of [1, -1]) { const e = 0.32, zz = s * (R * 0.8 + e * W0.span), xLE = 0.08 - e * W0.span * Math.tan(W0.sweep), yW = -0.024 + e * W0.span * Math.tan(W0.dih);
    const n = nacelle(0.13, 0.028, cowl); n.position.set(xLE + 0.075, yW - 0.04, zz); J.add(n); fans.push(n.userData.fan);
    const py = rbox(0.09, 0.03, 0.008, cowl, 0.004); py.position.set(xLE + 0.01, yW - 0.016, zz); py.rotation.z = -0.15; J.add(py); }
  // luces: navegación (roja izquierda, verde derecha), estrobos blancos en las puntas y la cola, baliza roja arriba y abajo
  const L = {};
  const light = (c, r = 0.006) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: starTex0(), color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); h.userData.halo = true; m.add(h); return m; };
  const tip = s => v3(0.08 - W0.span * Math.tan(W0.sweep) - 0.01, -0.024 + W0.span * Math.tan(W0.dih) + 0.03, s * (R * 0.8 + W0.span));
  L.red = light(new THREE.Color(3, 0.1, 0.1)); L.red.position.copy(tip(-1)); J.add(L.red);
  L.green = light(new THREE.Color(0.1, 3, 0.4)); L.green.position.copy(tip(1)); J.add(L.green);
  L.strobes = [tip(-1).add(v3(-0.012, 0, 0)), tip(1).add(v3(-0.012, 0, 0)), v3(-0.5, 0.008, 0)].map(p => { const l = light(new THREE.Color(4, 4, 4.4), 0.005); l.position.copy(p); J.add(l); return l; });
  L.beacons = [v3(0.05, R * 1.04, 0), v3(0.0, -R * 1.04, 0)].map(p => { const l = light(new THREE.Color(3.5, 0.2, 0.1), 0.006); l.position.copy(p); J.add(l); return l; });
  L.land = [1, -1].map(s => { const l = light(new THREE.Color(3, 3, 2.6), 0.007); l.position.set(0.07, -0.03, s * 0.06); J.add(l); return l; });
  J.traverse(q => { if (q.isMesh && !q.material.userData?.halo) q.castShadow = true; });
  const exh = [1, -1].map(s => { const e = 0.32, xLE = 0.08 - e * W0.span * Math.tan(W0.sweep), yW = -0.024 + e * W0.span * Math.tan(W0.dih); return v3(xLE + 0.075 - 0.17, yW - 0.04, s * (R * 0.8 + e * W0.span)); });
  J.userData = { fans, wings, wingM, L, fus, R, W0, exh,
    update(t, k = {}) {
      const spin = (k.fan ?? 1) * t * 38; fans.forEach((f, i) => { f.rotation.x = spin + i; });
      wingM.userData.u.uFlex.value = k.flex ?? 0.08 + 0.02 * Math.sin(t * 2.3); wingM.userData.u.uStress.value = k.stress ?? 0;
      const st = (t % 1.25) < 0.06 || ((t % 1.25) > 0.14 && (t % 1.25) < 0.19), bc = (t % 1.0) < 0.12;
      const vis = (l, on, sz) => { l.visible = on; l.children[0].scale.setScalar(sz); l.children[0].quaternion.copy(cam.quaternion); if (l.parent) { l.parent.getWorldQuaternion(_q); l.children[0].quaternion.premultiply(_q.invert()); } };
      const hs = (k.halo ?? 0.07) * 0.6; vis(L.red, true, hs); vis(L.green, true, hs); L.strobes.forEach(l => vis(l, st, hs * 1.25)); L.beacons.forEach(l => vis(l, bc, hs * 1.1)); L.land.forEach(l => vis(l, !!k.land, hs * 1.6));
    } };
  return J;
}
// ---------------------------------------------------------------- avión de papel (folio blanco doblado), largo 1, morro en +x
function makePaperPlane() {
  const g = new THREE.Group();
  const P = { n: [0.5, 0, 0], tl: [-0.5, 0.035, -0.27], tr: [-0.5, 0.035, 0.27], c: [-0.5, 0, 0], k: [-0.5, -0.09, 0], kf: [0.1, -0.02, 0] };
  const tri = (a, b, c) => [...P[a], ...P[b], ...P[c]];
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([...tri('n', 'tl', 'c'), ...tri('n', 'c', 'tr'), ...tri('n', 'c', 'k'), ...tri('n', 'k', 'c')], 3)); geo.computeVertexNormals();
  const paper = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x2a2826 });
  const m = new THREE.Mesh(geo, paper); m.castShadow = true; g.add(m);
  const crease = segSet(3, 0xb9b4aa, 1.4, 0.9); crease.userData.set(0, v3(...P.n), v3(...P.c)); crease.userData.set(1, v3(...P.n), v3(...P.k)); crease.userData.set(2, v3(...P.tl), v3(...P.tr)); crease.userData.flush(); g.add(crease);
  return g;
}
// ---------------------------------------------------------------- alas de ingeniero: insignia dorada (dos alas de plumas en relieve + medallón con texto)
function wingShape() {        // ala de piloto: borde superior que sube a la punta y plumas festoneadas por debajo
  const s = new THREE.Shape(); s.moveTo(0.0, 0.07);
  s.bezierCurveTo(0.3, 0.15, 0.65, 0.2, 1.0, 0.24);
  const F = [[1.0, 0.24, 0.9, 0.12], [0.9, 0.12, 0.78, 0.05], [0.78, 0.05, 0.64, -0.01], [0.64, -0.01, 0.5, -0.05], [0.5, -0.05, 0.36, -0.08], [0.36, -0.08, 0.2, -0.09]];
  for (const [x0, y0, x1, y1] of F) s.quadraticCurveTo(x0 - 0.01, y1 - 0.02, x1, y1);
  s.lineTo(0.0, -0.06); s.closePath(); return s;
}
const BADGE_TXT = (txt, col = '#3a2608') => canvasTex(512, 512, (g, w, h) => { g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 120px Inter'; g.fillText(txt, w / 2, h / 2 + 8); });
function makeBadge() {
  const g = new THREE.Group(), gold = new THREE.MeshPhysicalMaterial({ color: 0xffc35a, roughness: 0.22, metalness: 1, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  for (const s of [1, -1]) {
    const geo = new THREE.ExtrudeGeometry(wingShape(), { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 16 }); geo.translate(0.12, 0, -0.015);
    const w = new THREE.Mesh(geo, gold); w.scale.set(s, 1, 1); w.castShadow = true; g.add(w);
    // surcos entre plumas (relieve)
    for (const [x, y, a] of [[0.88, 0.13, 1.0], [0.76, 0.07, 1.05], [0.63, 0.02, 1.1], [0.5, -0.02, 1.15], [0.37, -0.045, 1.2]]) { const f = rbox(0.011, 0.11, 0.012, new THREE.MeshStandardMaterial({ color: 0x8a5a14, roughness: 0.5, metalness: 0.8 }), 0.004); f.position.set(s * (x + 0.12), y + 0.035, 0.026); f.rotation.z = s * (0.45 - a * 0.25); g.add(f); }
    const ln = rbox(0.62, 0.008, 0.01, new THREE.MeshStandardMaterial({ color: 0x8a5a14, roughness: 0.5, metalness: 0.8 }), 0.003); ln.position.set(s * 0.55, 0.11, 0.026); ln.rotation.z = s * 0.14; g.add(ln);
  }
  const disc = cyl(0.15, 0.15, 0.05, gold, 48); disc.rotation.x = Math.PI / 2; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 10, 48), gold); g.add(ring);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.135, 48), new THREE.MeshPhysicalMaterial({ color: 0x14203d, roughness: 0.3, metalness: 0.2, clearcoat: 1 })); face.position.z = 0.027; g.add(face);
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), new THREE.MeshBasicMaterial({ map: BADGE_TXT('?', '#ffc35a'), transparent: true, depthWrite: false, toneMapped: false })); mt.position.z = 0.029; g.add(mt);
  const plate = rbox(0.62, 0.075, 0.03, gold, 0.012); plate.position.set(0, -0.2, 0); g.add(plate);
  const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.065), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 112, (q, w, h) => { q.fillStyle = '#3a2608'; q.font = '900 74px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('INGENIERO AERONÁUTICO', w / 2, h / 2 + 4); }), transparent: true, depthWrite: false })); pt.position.set(0, -0.2, 0.017); g.add(pt);
  g.userData = { mt, gold };
  return g;
}
// ---------------------------------------------------------------- helicóptero (largo ≈ 1): cabina de cristal, botalón, patines, rotor principal y de cola (con disco de giro)
function makeHeli() {
  const g = new THREE.Group(), body = paint(0x1e2d4f, 0.3), stripe = paint(0xe9edf2, 0.3);
  const cab = sph(0.17, body, 32, 24); cab.scale.set(1.45, 1, 0.95); cab.position.set(0.18, 0.02, 0); g.add(cab);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.172, 32, 20, -0.9, 1.8, 0.35, 1.25), MAT.glass); gl.scale.set(1.45, 1, 0.95); gl.position.set(0.19, 0.03, 0); gl.rotation.z = -0.25; g.add(gl);
  const boom = cyl(0.03, 0.065, 0.6, body, 20); boom.rotation.z = Math.PI / 2; boom.position.set(-0.34, 0.06, 0); g.add(boom);
  const st = cyl(0.031, 0.066, 0.12, stripe, 20); st.rotation.z = Math.PI / 2; st.position.set(-0.2, 0.06, 0); g.add(st);
  const fin = new THREE.Mesh(wingGeo({ cr: 0.13, ct: 0.07, span: 0.14, sweep: 0.6, dih: 0, tcR: 0.12, tcT: 0.1, m: 0, nS: 4 }), body); fin.rotation.x = -Math.PI / 2; fin.position.set(-0.56, 0.06, 0); g.add(fin);
  const hst = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.2), body); hst.position.set(-0.5, 0.06, 0); g.add(hst);
  const mast = cyl(0.018, 0.022, 0.08, MAT.dsteel, 12); mast.position.set(0.14, 0.2, 0); g.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0.14, 0.245, 0); g.add(rotor);
  const bladeM = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.006, 0.045), bladeM); b.position.x = 0.31; const p = new THREE.Group(); p.rotation.y = i * Math.PI / 2; p.add(b); rotor.add(p); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshBasicMaterial({ color: 0x9aa4b8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; rotor.add(disc);
  const tr = new THREE.Group(); tr.position.set(-0.6, 0.13, 0.03); g.add(tr);
  for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.16, 0.02), bladeM); const p = new THREE.Group(); p.rotation.z = i * Math.PI / 2; p.add(b); tr.add(p); }
  for (const s of [1, -1]) { const sk = tube([v3(0.38, -0.2, s * 0.13), v3(0.3, -0.22, s * 0.13), v3(-0.1, -0.22, s * 0.13)], 0.012, MAT.dsteel, 12); g.add(sk);
    for (const x of [0.25, -0.02]) g.add(bar(v3(x, -0.21, s * 0.13), v3(x + 0.02, -0.1, s * 0.06), 0.009, MAT.dsteel)); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { rotor, tr, disc, update(t) { rotor.rotation.y = t * 28; tr.rotation.z = t * 70; } };
  return g;
}
// ---------------------------------------------------------------- dron cuadricóptero (ancho ≈ 0,6) con hélices que giran y luces
function makeDrone() {
  const g = new THREE.Group(), dk = paint(0x2a2e36, 0.35), props = [];
  const body = rbox(0.18, 0.07, 0.26, dk, 0.03); g.add(body);
  const top = rbox(0.12, 0.03, 0.18, paint(0x3c424e, 0.3), 0.012); top.position.y = 0.045; g.add(top);
  const pm = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5, metalness: 0.2 });
  for (const [x, z] of [[0.18, 0.22], [-0.18, 0.22], [0.18, -0.22], [-0.18, -0.22]]) {
    g.add(bar(v3(0, 0, 0), v3(x, 0.01, z), 0.014, dk));
    const mo = cyl(0.028, 0.028, 0.04, MAT.dsteel, 20); mo.position.set(x, 0.03, z); g.add(mo);
    const p = new THREE.Group(); p.position.set(x, 0.055, z); g.add(p); props.push(p);
    for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.022), pm); b.rotation.y = i * Math.PI; b.position.x = i ? -0.1 : 0.1; p.add(b); }
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: 0xaab4c8, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })); d.rotation.x = -Math.PI / 2; p.add(d);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: x > 0 ? new THREE.Color(0.2, 2.5, 0.4) : new THREE.Color(2.5, 0.15, 0.1), toneMapped: false })); led.position.set(x, -0.005, z); g.add(led);
  }
  const gim = sph(0.04, MAT.black, 16, 12); gim.position.set(0.1, -0.05, 0); g.add(gim); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), MAT.glass); lens.position.set(0.14, -0.05, 0); lens.rotation.y = Math.PI / 2; g.add(lens);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { props, update(t) { props.forEach((p, i) => { p.rotation.y = t * 60 * (i % 2 ? 1 : -1); }); } };
  return g;
}
// ---------------------------------------------------------------- cohete de dos etapas (alto 1, a lo largo de +y): primera etapa con 9 toberas, interetapa, segunda etapa y cofia que se abre en dos
function makeRocket() {
  const g = new THREE.Group(), R = 0.038, white = paint(0xf3f4f6, 0.35, 0.5), black = paint(0x101114, 0.4, 0.5);
  const s1 = new THREE.Group(); g.add(s1);
  const t1 = cyl(R, R, 0.6, white, 40); t1.position.y = 0.32; s1.add(t1);
  const band = cyl(R * 1.004, R * 1.004, 0.035, black, 40); band.position.y = 0.58; s1.add(band);
  const skirt = cyl(R * 1.02, R * 1.06, 0.03, black, 40); skirt.position.y = 0.025; s1.add(skirt);
  const bell = (r, h) => lathe([[r * 0.35, 0], [r * 0.4, h * 0.3], [r * 0.7, h * 0.75], [r, h]].map(([a, b]) => [a, -b]), 24, new THREE.MeshStandardMaterial({ color: 0x2a2523, roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }));
  s1.add(Object.assign(bell(0.012, 0.03), {})); for (let i = 0; i < 8; i++) { const b = bell(0.0105, 0.026); b.position.set(Math.cos(i / 8 * 6.283) * 0.024, 0.008, Math.sin(i / 8 * 6.283) * 0.024); s1.add(b); }
  for (let i = 0; i < 4; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.004), MAT.dsteel); const a = i / 4 * Math.PI * 2 + Math.PI / 4; fin.position.set(Math.cos(a) * (R + 0.015), 0.55, Math.sin(a) * (R + 0.015)); fin.rotation.y = -a; s1.add(fin); }
  const up = new THREE.Group(); up.position.y = 0.62; g.add(up);
  const inter = cyl(R, R, 0.06, black, 40); inter.position.y = 0.03; up.add(inter);
  const t2 = cyl(R, R, 0.2, white, 40); t2.position.y = 0.16; up.add(t2);
  const mv = bell(0.022, 0.05); mv.position.y = 0.0; up.add(mv); mv.visible = false; up.userData.mv = mv;
  const fair = [], prof = [[R * 1.02, 0], [R * 1.08, 0.04], [R * 1.08, 0.1], [R * 0.85, 0.15], [R * 0.45, 0.19], [0.002, 0.205]];
  for (let k = 0; k < 2; k++) { const f = lathe(prof, 24, white, k * Math.PI, Math.PI); f.material = white; f.position.y = 0.26; const p = new THREE.Group(); p.add(f); up.add(p); fair.push(p); }
  const pay = new THREE.Group(); pay.position.y = 0.3; up.add(pay);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { s1, up, fair, pay, R };
  return g;
}
// ---------------------------------------------------------------- satélite: cuerpo con manta térmica dorada, paneles solares que se despliegan en acordeón, antena parabólica
const MLI = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8952e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = hash(i * 1.3) * w, y = hash(i * 2.7) * h, l = 30 + hash(i * 3.1) * 90, a = hash(i * 4.3) * Math.PI; g.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,226,150' : '120,80,20'},${0.25 + hash(i * 5.9) * 0.35})`; g.lineWidth = 1 + hash(i * 7.1) * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } });
const CELLS = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#0d1a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(190,200,220,.55)'; g.lineWidth = 2;
  for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) { const gr = g.createLinearGradient(x, y, x + 32, y + 32); gr.addColorStop(0, 'rgba(60,90,170,.5)'); gr.addColorStop(1, 'rgba(10,20,50,0)'); g.fillStyle = gr; g.fillRect(x + 2, y + 2, 28, 28); } });
function makeSat() {
  const g = new THREE.Group(), mli = new THREE.MeshStandardMaterial({ map: MLI, roughness: 0.35, metalness: 0.85, color: 0xffffff });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), mli); body.castShadow = true; g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.02, 0.31), metal(0xd8dce2, 0.3)); top.position.y = 0.17; g.add(top);
  const dish = lathe([[0.001, 0], [0.06, 0.008], [0.12, 0.03], [0.15, 0.05]], 40, new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })); dish.position.set(0, 0.2, 0); dish.rotation.x = 0.4; g.add(dish);
  g.add(bar(v3(0, 0.18, 0), v3(0, 0.27, 0.04), 0.006, MAT.steel));
  const pm = new THREE.MeshStandardMaterial({ map: CELLS, roughness: 0.25, metalness: 0.6, side: THREE.DoubleSide }), wings = [];
  for (const s of [1, -1]) {
    const arm = bar(v3(s * 0.15, 0, 0), v3(s * 0.26, 0, 0), 0.008, MAT.steel); g.add(arm);
    const root = new THREE.Group(); root.position.set(s * 0.26, 0, 0); g.add(root); const panels = [];
    let parent = root;
    for (let k = 0; k < 3; k++) { const hinge = new THREE.Group(); hinge.position.x = k === 0 ? 0 : s * 0.36; parent.add(hinge);
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.006, 0.26), pm); p.position.x = s * 0.18; p.castShadow = true; hinge.add(p); panels.push(hinge); parent = hinge; }
    wings.push({ root, panels, s });
  }
  for (const [x, z] of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) { const n = cyl(0.004, 0.012, 0.02, MAT.dsteel, 10); n.position.set(x, -0.17, z); g.add(n); }
  g.userData = { wings, deploy(k) { wings.forEach(w => { const s = w.s; w.panels.forEach((h, i) => { const kk = clamp(k * 1.4 - i * 0.2); h.rotation.y = 0; h.rotation.z = i === 0 ? s * (1 - kk) * 1.45 : (i % 2 ? -1 : 1) * s * (1 - kk) * 2.9; }); }); } };
  g.userData.deploy(1);
  return g;
}
