// ---------------------------------------------------------------- objetos alrededor de la mano (estilo ilustración: blanco brillante y suave): el anillo de la resonancia y
// su pantalla (L4), el manómetro y la flecha de tirar (L3), los dos círculos del debate (L5), el reloj de 20 minutos (L6) y, en la 8, una peana blanca
// con el Ig Nobel y las 215 figuritas.
const ST = {};
const _o = new THREE.Object3D();
const softWhite = (c = 0xf7f6f3, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.15 });
function mriRing() {
  const g = new THREE.Group(), wm = softWhite();
  const prof = [[0.15, 0.0], [0.152, -0.05], [0.17, -0.075], [0.25, -0.08], [0.272, -0.065], [0.28, -0.03], [0.28, 0.03], [0.272, 0.065], [0.25, 0.08], [0.17, 0.075], [0.152, 0.05], [0.15, 0.0]];
  const body = lathe(prof, 96, wm); g.add(body);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.151, 0.151, 0.1, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.5, side: THREE.BackSide })); g.add(bore);
  const strip = new THREE.Mesh(new THREE.TorusGeometry(0.281, 0.006, 8, 96), new THREE.MeshStandardMaterial({ color: 0x2f8cff, emissive: 0x2f8cff, emissiveIntensity: 1.6 })); strip.rotation.x = Math.PI / 2; g.add(strip);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.004, 8, 96), new THREE.MeshStandardMaterial({ color: 0x9fd2ff, emissive: 0x6fbaff, emissiveIntensity: 1.4 })); glow.rotation.x = Math.PI / 2; glow.position.y = 0.05; g.add(glow);
  g.userData = { strip, glow }; return g;
}
function mriPanel() {
  const tex = canvasTex(720, 880, () => {}); let lk = -1;
  const g = new THREE.Group(); const fr = rbox(0.46, 0.56, 0.026, softWhite(), 0.04); g.add(fr);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.414, 0.506), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.0135; g.add(scr);
  g.userData.draw = k => { k = Math.round(k * 60) / 60; if (k === lk) return; lk = k; const c = tex.userData.g, w = 720, h = 880; c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2 + 30, gap = 22 + 22 * clamp(k * 1.6);
    const tis = c.createRadialGradient(cx, cy, 40, cx, cy, 330); tis.addColorStop(0, 'rgba(150,154,160,.75)'); tis.addColorStop(1, 'rgba(90,94,100,.35)'); c.fillStyle = tis; c.beginPath(); c.ellipse(cx, cy, 170, 400, 0, 0, 7); c.fill();
    c.fillStyle = '#dfe3e8'; c.beginPath(); c.ellipse(cx, cy + 210 + gap / 2, 72, 190, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx, cy - 215 - gap / 2, 78, 200, 0, 0, 7); c.fill();
    c.fillStyle = '#b4bac2'; c.beginPath(); c.ellipse(cx, cy - 38 - gap / 2, 86, 44, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx, cy + 40 + gap / 2, 82, 40, 0, 0, 7); c.fill();
    if (k > 0.3) { const r = 36 * eo(clamp((k - 0.3) / 0.25)); c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, cy, r * 1.7, r, 0, 0, 7); c.fill(); }
    c.fillStyle = '#8b939e'; c.font = '700 30px Inter'; c.textAlign = 'left'; c.fillText('RESONANCIA · DEDO', 30, 52); c.textAlign = 'right'; c.fillStyle = '#ffffff'; c.font = '900 40px Inter'; c.fillText((0.31 * clamp(k)).toFixed(2).replace('.', ',') + ' s', w - 30, 56);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(30, h - 46, w - 60, 8); c.fillStyle = '#4fa3ff'; c.fillRect(30, h - 46, (w - 60) * clamp(k), 8);
    tex.needsUpdate = true; };
  g.userData.draw(0); return g;
}
function dialTex(draw) { return canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill(); draw(c, w, h); }); }
function dial(r, tex) {
  const g = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.07, 16, 72), softWhite(0xeeeeec, 0.25)); g.add(rim);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.12, 72), softWhite(0xeeeeec)); back.rotation.x = Math.PI / 2; back.position.z = -r * 0.06; g.add(back);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 72), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 })); face.position.z = 0.002; g.add(face);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.02, clearcoat: 1, depthWrite: false })); glass.position.z = r * 0.05; g.add(glass);
  return g;
}
function gaugeSoft() {
  const tex = dialTex((c, w, h) => { const cx = w / 2, cy = h / 2;
    for (let i = 0; i <= 40; i++) { const a = Math.PI * (0.75 + 1.5 * i / 40), L = i % 5 ? 14 : 28; c.strokeStyle = '#2a3340'; c.lineWidth = i % 5 ? 3 : 6; c.beginPath(); c.moveTo(cx + Math.cos(a) * 206, cy + Math.sin(a) * 206); c.lineTo(cx + Math.cos(a) * (206 - L), cy + Math.sin(a) * (206 - L)); c.stroke(); }
    const arc = (a0, a1, col) => { c.strokeStyle = col; c.lineWidth = 18; c.beginPath(); c.arc(cx, cy, 225, Math.PI * (0.75 + 1.5 * a0), Math.PI * (0.75 + 1.5 * a1)); c.stroke(); };
    arc(0, 0.3, '#e04848'); arc(0.3, 0.7, '#f2b33d'); arc(0.7, 1, '#3c9b62');
    c.fillStyle = '#2a3340'; c.textAlign = 'center'; c.font = '900 50px Inter'; c.fillText('PRESIÓN', cx, cy + 120); c.font = '700 30px Inter'; c.fillText('BAJA', cx - 128, cy + 196); c.fillText('ALTA', cx + 128, cy + 196); });
  const g = dial(0.1, tex); const nd = new THREE.Group(); nd.position.z = 0.006; const n = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.08, 0.003).translate(0, 0.032, 0), new THREE.MeshStandardMaterial({ color: 0xd62f2f, roughness: 0.4 })); nd.add(n);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 24), new THREE.MeshStandardMaterial({ color: 0x2a3340 })); hub.rotation.x = Math.PI / 2; nd.add(hub); g.add(nd);
  g.userData.nd = nd; return g;
}
function clockSoft() {
  const tex = dialTex((c, w, h) => { const cx = w / 2, cy = h / 2; c.fillStyle = '#2a3340'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * 214, cy + Math.sin(a) * 214, i % 5 ? 5 : 9, 0, 7); c.fill(); if (i % 5 === 0) { c.font = '900 50px Inter'; c.fillText(String(i), cx + Math.cos(a) * 162, cy + Math.sin(a) * 162); } }
    c.font = '700 32px Inter'; c.fillText('MIN', cx, cy + 92); });
  const g = dial(0.11, tex);
  const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.104, 64, Math.PI / 2, 0.001), new THREE.MeshBasicMaterial({ color: 0x4fa3ff, transparent: true, opacity: 0.3, depthWrite: false })); sweep.position.z = 0.004; g.add(sweep);
  const hd = new THREE.Group(); hd.position.z = 0.007; hd.add(new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.09, 0.003).translate(0, 0.038, 0), new THREE.MeshStandardMaterial({ color: 0xd62f2f }))); g.add(hd);
  g.userData = { hd, sweep }; return g;
}
function arrowSoft(col = 0x2f7fe0) {
  const s = new THREE.Shape(); s.moveTo(-0.022, 0); s.lineTo(0.022, 0); s.lineTo(0.022, 0.17); s.lineTo(0.05, 0.17); s.lineTo(0, 0.26); s.lineTo(-0.05, 0.17); s.lineTo(-0.022, 0.17); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3 }); geo.translate(0, 0, -0.006);
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 1, emissive: col, emissiveIntensity: 0.25 })); m.castShadow = true; return m;
}
// círculo «lupa» del debate: la articulación en grande con su burbuja (nace) o rompiéndose en trocitos (rompe)
function insetJoint(burst) {
  const g = new THREE.Group(), R = 0.19, M = innerMats(), planes = [];
  for (let i = 0; i < 28; i++) planes.push(new THREE.Plane());
  const clipM = m => { const c = m.clone(); c.clippingPlanes = planes; c.clipIntersection = false; return c; };
  const bg = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#f7ece8'); gr.addColorStop(1, '#e6cbc4'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshStandardMaterial({ map: bg, roughness: 0.7 })); disc.position.z = -0.06; g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.009, 16, 96), softWhite(0xffffff, 0.2)); rim.position.z = -0.03; rim.scale.z = 3; g.add(rim);
  const s = 0.105 / 0.094;      // la articulación del dedo, ampliada
  const lo = new THREE.Mesh(phalanxGeo(-0.3, -0.024, 0.06, 0.055), clipM(M.bone)); const loC = new THREE.Mesh(cartGeo(-0.3, -0.024, 0.06, 0.055, 'head'), clipM(M.cart));
  const up = new THREE.Mesh(phalanxGeo(0.024, 0.3, 0.058, 0.052), clipM(M.bone)); const upC = new THREE.Mesh(cartGeo(0.024, 0.3, 0.058, 0.052, 'base'), clipM(M.cart));
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.062, 40), clipM(M.fluid)); fl.scale.set(1.12, 1, 0.84);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), M.bub); bub.scale.setScalar(0.0001); bub.renderOrder = 8;
  const J = new THREE.Group(); J.add(lo, loC, up, upC, fl, bub); J.rotation.x = 0.25; J.scale.setScalar(1.55); g.add(J);
  const bits = []; for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.bub); b.scale.setScalar(0.0001); J.add(b); bits.push(b); }
  g.userData = { planes, R, bub, bits, J, burst }; return g;
}
function insetClip(g) {      // planos del círculo (en el mundo): solo se ve lo que cae dentro del aro
  const U = g.userData; g.updateWorldMatrix(true, true); const n = U.planes.length, M4 = g.matrixWorld; _m3.getNormalMatrix(M4);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, P = U.planes[i]; P.normal.set(-Math.cos(a), -Math.sin(a), 0); P.constant = U.R * 0.985; P.applyMatrix4(M4, _m3); }
}
const PLAT = v3(HAND_L / 2, -0.42, 1.2);
function buildStations() {
  ST.ring = mriRing(); scene.add(ST.ring);
  ST.panel = mriPanel(); ST.panel.position.set(-0.71, 1.36, 0.32); ST.panel.rotation.y = 0.24; scene.add(ST.panel);
  ST.gauge = gaugeSoft(); ST.gauge.position.set(-0.48, 1.2, 0.3); ST.gauge.rotation.y = 0.3; ST.gauge.userData.s0 = 0.75; scene.add(ST.gauge);
  ST.arrow = arrowSoft(); scene.add(ST.arrow);
  ST.in1 = insetJoint(false); ST.in1.position.set(-0.56, 1.62, 0.62); scene.add(ST.in1);
  ST.in2 = insetJoint(true); ST.in2.position.set(-0.13, 1.62, 0.62); scene.add(ST.in2);
  ST.clock = clockSoft(); ST.clock.position.set(-0.54, 1.46, 0.24); ST.clock.rotation.y = 0.3; scene.add(ST.clock);
  // peana blanca con el premio y las 215 figuritas
  ST.plat = new THREE.Group(); ST.plat.position.copy(PLAT); scene.add(ST.plat);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.28, 0.06, 96), softWhite(0xf4f2ee, 0.45)); top.receiveShadow = true; top.castShadow = true; ST.plat.add(top);
  ST.prize = prize(); ST.prize.position.set(0, 0.03, -0.05); ST.prize.userData.s0 = 2.2; ST.plat.add(ST.prize);
  ST.figs = new THREE.InstancedMesh(studentGeo(false), new THREE.MeshPhysicalMaterial({ color: 0xefe9e1, roughness: 0.45, clearcoat: 0.4 }), 215); ST.figs.castShadow = true; ST.figs.frustumCulled = false; ST.plat.add(ST.figs);
  ST.fpos = []; for (let i = 0; i < 215; i++) { const r = 0.3 + 0.82 * Math.sqrt((i + 0.5) / 215), a = i * 2.39996 + 0.4; ST.fpos.push(v3(Math.cos(a) * r, 0.03, Math.sin(a) * r * 0.92 + 0.08)); }
}
// la pose del índice: un punto a lo largo de su eje (s) y su giro
const _bq = new THREE.Quaternion(), _bp = new THREE.Vector3();
function alongIndex(h, s, out) { const b = h.userData.fingers[0].bones[0]; b.updateWorldMatrix(true, false); b.getWorldQuaternion(_bq); return out.set(0, s, 0).applyMatrix4(b.matrixWorld); }
function stationsAt(t) {
  const H = S.hand;
  // L3: la flecha de tirar (al lado del dedo) y el manómetro (la presión cae)
  { const a = pop(t, K.tirar3 - 0.12, 0.4) * (1 - win(t, K.presion3 + 0.2, 0.3)) + 0.8 * env(t, K.crujir6 - 0.35, K.enseguida6 + 0.3, 0.3, 0.3);
    ST.arrow.visible = a > 0.01; if (ST.arrow.visible) { alongIndex(H, 0.44 + 0.02 * Math.sin(Math.max(0, t - K.tirar3) * 9), _bp); ST.arrow.position.copy(_bp).add(v3(-0.155, 0, 0.05)); ST.arrow.quaternion.copy(_bq); ST.arrow.scale.setScalar(Math.max(0.0001, 0.62 * a)); } }
  { const a = pop(t, K.presion3 - 0.3, 0.4) * (1 - win(t, K.golpe3 + 0.5, 0.3)); show(ST.gauge, a);
    if (ST.gauge.visible) ST.gauge.userData.nd.rotation.z = -1.95 + 3.9 * eio(clamp((t - K.presion3 + 0.05) / (K.cae3 + 0.45 - K.presion3))); }
  // L4: el anillo de resonancia baja por el dedo y la pantalla graba la cavidad (0,31 s)
  { const vin = eio(clamp((t - (K.n2015 + 0.35)) / 0.85)), vout = eio(clamp((t - (K.discute5 - 0.45)) / 0.55)), v = vin * (1 - vout);
    ST.ring.visible = v > 0.002; if (ST.ring.visible) { alongIndex(H, lerp(1.35, 0.42, vin) + 0.9 * vout, _bp); ST.ring.position.copy(_bp); ST.ring.quaternion.copy(_bq); ST.ring.scale.setScalar(Math.max(0.0001, 0.6 + 0.4 * v));
      ST.ring.userData.strip.material.emissiveIntensity = 1.2 + 1.2 * env(t, K.resonancia4 - 0.1, K.segundo4 + 0.4, 0.2, 0.3) * (0.7 + 0.3 * Math.sin(t * 20)); }
    const p = pop(t, K.n2015 + 0.25, 0.45) * (1 - win(t, K.discute5 - 0.35, 0.35)); show(ST.panel, p);
    if (ST.panel.visible) ST.panel.userData.draw(clamp((t - (K.resonancia4 - 0.1)) / (K.segundo4 + 0.25 - K.resonancia4))); }
  // L5: los dos círculos del debate: la burbuja que nace (izquierda) y la que se rompe (derecha)
  for (const [g, t0] of [[ST.in1, K.discute5 - 0.15], [ST.in2, K.discute5 + 0.05]]) { const a = pop(t, t0, 0.45) * (1 - win(t, K.burbuja6 - 0.3, 0.35)); show(g, a); if (!g.visible) continue; insetClip(g);
    const U = g.userData; U.J.rotation.y = 0.25 * Math.sin(t * 0.6);
    if (!U.burst) { const b = popk(t, K.nacer5 - 0.04); U.bub.scale.set(0.05 * b, 0.026 * b + 0.0001, 0.045 * b); }
    else { const u = t - (K.romperse5 - 0.04), alive = u < 0 ? 1 : Math.max(0, 1 - u / 0.08); U.bub.scale.set(0.05 * alive + 0.0001, 0.026 * alive + 0.0001, 0.045 * alive + 0.0001);
      U.bits.forEach((b, i) => { const a2 = i / U.bits.length * Math.PI * 2, e = eo(clamp(u / 0.5)); b.visible = u > 0 && u < 1.3; if (!b.visible) return; b.scale.setScalar(0.011 * (1 - clamp((u - 0.4) / 0.9)));
        b.position.set(Math.cos(a2) * 0.075 * e, Math.sin(a2 * 3) * 0.01 * e, Math.sin(a2) * 0.06 * e); }); } }
  // L6: el reloj de 20 minutos
  { const a = pop(t, K.durar6 + 0.1, 0.45) * (1 - win(t, K.respuesta7 - 0.2, 0.35)); show(ST.clock, a);
    if (ST.clock.visible) { const ck = eio(clamp((t - K.durar6) / (K.minutos6 + 1.0 - K.durar6))), U = ST.clock.userData; U.hd.rotation.z = -ck * Math.PI * 2;
      U.sweep.geometry.dispose(); U.sweep.geometry = new THREE.CircleGeometry(0.104, 64, Math.PI / 2 - ck * Math.PI * 2, Math.max(0.001, ck * Math.PI * 2)); } }
  // L8: la peana, el Ig Nobel y las 215 personas
  { const a = pop(t, K.ig8 - 0.55, 0.5) * (1 - win(t, K.tu9 - 0.25, 0.4)); ST.plat.visible = a > 0.002; if (ST.plat.visible) { ST.plat.scale.setScalar(Math.max(0.0001, a));
      show(ST.prize, pop(t, K.ig8 - 0.12, 0.45)); ST.prize.rotation.y = 0.3 * Math.sin(t * 0.8);
      const t0 = K.n215 - 0.15; for (let i = 0; i < 215; i++) { const p = ST.fpos[i], k = pop(t, t0 + i * 0.0042, 0.3); _o.position.set(p.x, p.y + 0.1 * (1 - clamp(k)), p.z); _o.rotation.set(0, Math.atan2(-p.x, 3 - p.z), 0); _o.scale.setScalar(Math.max(0.0001, k * 1.9)); _o.updateMatrix(); ST.figs.setMatrixAt(i, _o.matrix); }
      ST.figs.instanceMatrix.needsUpdate = true; } }
}
