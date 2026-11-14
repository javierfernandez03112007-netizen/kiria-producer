// ---------------------------------------------------------------- objetos alrededor: las flechas de presión (dentro del cráneo), la pantalla del Doppler de 2012
// (encima de la cabeza) y las dos peanas con 100 figuritas cada una (comer rápido / despacio).
const ST = {};
const _o = new THREE.Object3D();
const softWhite = (c = 0xf7f6f3, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.15 });
function arrowFlat(col) {
  const s = new THREE.Shape(); s.moveTo(-0.03, 0); s.lineTo(0.03, 0); s.lineTo(0.03, 0.14); s.lineTo(0.07, 0.14); s.lineTo(0, 0.24); s.lineTo(-0.07, 0.14); s.lineTo(-0.03, 0.14); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2 }); geo.translate(0, 0, -0.006); geo.rotateY(Math.PI / 2);
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 1, emissive: col, emissiveIntensity: 0.35 }));
}
function dopplerPanel() {
  const tex = canvasTex(960, 640, () => {}); let lk = -1;
  const g = new THREE.Group(); const fr = rbox(1.74, 1.18, 0.05, softWhite(), 0.08); g.add(fr);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 1.093), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.026; g.add(scr);
  // k: 0 → 1 a lo largo de la frase 7; a, b: dónde empieza a subir el flujo y dónde vuelve a bajar (fracciones del eje)
  g.userData.draw = (k, a, b) => { k = Math.round(k * 120) / 120; if (k === lk) return; lk = k; const c = tex.userData.g, w = 960, h = 640; c.fillStyle = '#06080c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#8b939e'; c.font = '700 30px Inter'; c.textAlign = 'left'; c.fillText('FLUJO EN LA ARTERIA DEL CEREBRO', 40, 60); c.textAlign = 'right'; c.fillText('DOPPLER', w - 40, 60);
    const X0 = 60, X1 = w - 50, Y0 = h - 110, Y1 = 120, val = u => u < a ? 0.22 : u < a + 0.12 ? 0.22 + 0.62 * eio((u - a) / 0.12) : u < b ? 0.84 + 0.03 * Math.sin(u * 60) : u < b + 0.14 ? 0.84 - 0.58 * eio((u - b) / 0.14) : 0.26;
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { const y = Y0 + (Y1 - Y0) * i / 4; c.beginPath(); c.moveTo(X0, y); c.lineTo(X1, y); c.stroke(); }
    if (k > a) { c.fillStyle = 'rgba(235,60,60,.22)'; c.fillRect(X0 + (X1 - X0) * a, Y1 - 10, (X1 - X0) * (Math.min(k, b + 0.07) - a), Y0 - Y1 + 10); }
    c.strokeStyle = '#ff5a5a'; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath(); for (let i = 0; i <= 200; i++) { const u = i / 200 * k; const x = X0 + (X1 - X0) * u, y = Y0 + (Y1 - Y0) * val(u); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    const cu = k, cx = X0 + (X1 - X0) * cu, cy = Y0 + (Y1 - Y0) * val(cu); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy, 10, 0, 7); c.fill();
    c.font = '900 40px Inter'; c.textAlign = 'center';
    if (k > a + 0.06) { c.fillStyle = '#ff6b6b'; c.fillText('DOLOR', X0 + (X1 - X0) * (a + b) / 2 + 30, Y1 + 40); }
    if (k > b + 0.12) { c.fillStyle = '#7fe0a8'; c.fillText('SE VA', X0 + (X1 - X0) * Math.min(0.93, b + 0.2), Y0 - 60); }
    c.fillStyle = '#8b939e'; c.font = '700 26px Inter'; c.textAlign = 'left'; c.fillText('2012 · AGUA HELADA CONTRA EL PALADAR · 13 VOLUNTARIOS', 40, h - 40);
    tex.needsUpdate = true; };
  g.userData.draw(0, 0.3, 0.7); return g;
}
function buildStations() {
  const head = S.hero.userData.head;
  // flechas de presión: desde el centro del cerebro hacia el cráneo (en el plano del corte)
  ST.arrows = []; for (const th of [-0.25, 0.25, 0.75, 1.25, 1.75, 2.3]) { const A = new THREE.Group(); A.rotation.x = th; const m = arrowFlat(0xd8372c); m.position.y = 0.36; A.add(m); A.position.set(0.06, 0.38, -0.18); A.userData.s = m; S.sec.add(A); ST.arrows.push(A); }
  // la pantalla del Doppler, encima de la cabeza y mirando a la cámara (de perfil)
  ST.panel = dopplerPanel(); ST.panel.position.set(0.0, 2.05, -0.05); ST.panel.rotation.y = Math.PI / 2; scene.add(ST.panel);
  // las dos peanas con 100 figuritas (las que se «congelan» se vuelven azules)
  ST.plats = [-0.88, 0.88].map((x, k) => { const g = new THREE.Group(); g.position.set(x, -2.75, 3.4); scene.add(g);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.82, 0.07, 72), softWhite(0xf4f2ee, 0.45)); top.receiveShadow = true; top.castShadow = true; g.add(top);
    const figs = new THREE.InstancedMesh(studentGeo(false), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, clearcoat: 0.4 }), 100); figs.castShadow = true; figs.frustumCulled = false; g.add(figs);
    const pos = [], order = []; for (let i = 0; i < 100; i++) { pos.push(v3(((i % 10) - 4.5) * 0.112, 0.035, (Math.floor(i / 10) - 4.5) * 0.112)); order.push(i); figs.setColorAt(i, new THREE.Color(0xefe9e1)); }
    order.sort((a, b) => hash(a * 7.3 + k * 13) - hash(b * 7.3 + k * 13)); g.userData = { figs, pos, order, n: k ? 13 : 27 }; return g; });
}
const _ice = new THREE.Color(0x7fb8f0), _clay = new THREE.Color(0xefe9e1), _cc = new THREE.Color();
function stationsAt(t) {
  // flechas de presión (frase 5)
  const ak = env(t, K.presion5 - 0.2, K.esas5, 0.35, 0.4); for (let i = 0; i < ST.arrows.length; i++) { const A = ST.arrows[i]; A.visible = ak > 0.01 && S.sec.visible; if (!A.visible) continue; const s = ak * (1 + 0.12 * Math.sin(t * 8 + i)); A.userData.s.scale.setScalar(Math.max(0.0001, s)); A.userData.s.position.y = 0.36 + 0.03 * Math.sin(t * 8 + i); }
  // pantalla del Doppler (frase 7)
  ST.panel.visible = false; const pk = 0;
  if (ST.panel.visible) { const t0 = K.midieron7 - 0.2, t1 = K.cierra7 + 0.6, f = u => (u - t0) / (t1 - t0); ST.panel.userData.draw(clamp(f(t)), f(K.empieza7 - 0.1), f(K.cierra7 - 0.1)); }
  // las peanas (frase 8)
  const vk = pop(t, K.comes8 - 0.35, 0.5) * (1 - win(t, K.medicos9 - 0.6, 0.4));
  ST.plats.forEach((g, k) => { g.visible = vk > 0.002; if (!g.visible) return; g.scale.setScalar(Math.max(0.0001, vk)); const U = g.userData, tf = k ? K.n13 - 0.15 : K.n27 - 0.15;
    for (let j = 0; j < 100; j++) { const i = U.order[j], p = U.pos[i], kk = pop(t, K.comes8 - 0.2 + i * 0.006, 0.3); _o.position.set(p.x, p.y + 0.1 * (1 - clamp(kk)), p.z); _o.rotation.set(0, Math.PI * 0.0, 0); _o.scale.setScalar(Math.max(0.0001, 1.6 * kk)); _o.updateMatrix(); U.figs.setMatrixAt(i, _o.matrix);
      const fz = j < U.n ? clamp((t - tf - j * 0.022) / 0.25) : 0; _cc.copy(_clay).lerp(_ice, fz); U.figs.setColorAt(i, _cc); }
    U.figs.instanceMatrix.needsUpdate = true; U.figs.instanceColor.needsUpdate = true; });
}
