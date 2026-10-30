// ---------------------------------------------------------------- 1 · la nota: el avión sale del mar de nubes y sube a su velocidad de verdad (la cámara va con él);
// a su lado vuela un altímetro holográfico (cinta de 0 a 14, 1 m por punto) que se queda en 12,484
const TAPE_Y = CLOUD_Y + 0.5, CL_Z = -2.2, CL_T0 = 6.9, CL_X0 = 2.0, CL_VX = 6.2;    // ≈ 2 largos por segundo, como un avión de verdad
function buildClimb() {
  const G = new THREE.Group(); scene.add(G); S.tower = G;
  const holo = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 14.6, 0.01), holo(0x8fdcff)); spine.position.y = 7.2; G.add(spine);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 14.6), new THREE.MeshBasicMaterial({ color: 0x0a2a44, transparent: true, opacity: 0.28, depthWrite: false })); glass.position.set(0.3, 7.2, -0.01); G.add(glass);
  for (let v = 0; v <= 14; v += 0.25) { const major = Math.abs(v - Math.round(v)) < 0.01, half = !major && Math.abs(v * 2 - Math.round(v * 2)) < 0.01;
    const tk = new THREE.Mesh(new THREE.BoxGeometry(major ? 0.34 : half ? 0.2 : 0.1, major ? 0.022 : 0.012, 0.01), holo(0xd8f2ff)); tk.position.set((major ? 0.34 : half ? 0.2 : 0.1) / 2, v, 0); G.add(tk);
    if (major) { const l = label(String(v), { size: 90, w: 0.36, color: '#dff4ff', weight: 800, font: 'SpaceMono' }); l.position.set(0.62, v, 0); l.material.opacity = 0.95; G.add(l); } }
  S.mark = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.5), toneMapped: false })); S.mark.position.set(0.1, 12.484, 0.01); G.add(S.mark);
  S.top14 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 10, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 2.2, 3.0), transparent: true, toneMapped: false })); S.top14.position.set(0, 14, 0.01); G.add(S.top14);
  S.climbJet = makeJet({ stripe: '#c8102e', stripe2: '#f2b233', tail: 0xc8102e }); S.climbJet.scale.setScalar(2.8); scene.add(S.climbJet);
  S.climbTrail = [0, 1].map(i => buildJet({ n: 1300, len: 9, rad: 0.03, spread: 0.3, speed: 0.55, size: 1.25, bright: 0.5, kind: 2, seed: 20 + i, turb: 0.25 }));
  // nubes justo donde el avión rompe el mar de nubes (sale de ellas)
  S.climbPuffs = puffCloud(26, i => { const a = hash(i * 1.7) * Math.PI * 2, r = 0.4 + hash(i * 2.3) * 1.9; return [6.75 + Math.cos(a) * r * 1.3, CLOUD_Y + 0.15 + hash(i * 2.9) * 0.5, CL_Z + Math.sin(a) * r, 0.75 + hash(i * 4.1) * 0.85, 0.9]; }, { seed: 7, lit: 0xffe6d2, sh: 0x5d6a92 }); PUFFS.push(S.climbPuffs);
}
function climbY(t) { return keyed(t, [[CL_T0, CLOUD_Y - 2.4], [K.politecnica - 0.25, CLOUD_Y + 0.6], [K.un3 + 0.15, TAPE_Y + 8.9], [K.nota + 1.05, TAPE_Y + 12.484], [K.asi4 + 1.5, TAPE_Y + 12.484]]) + 0.05 * Math.sin(t * 0.8) * win(t, K.nota + 1.05, 1); }
function climbPos(t) { return v3(CL_X0 + CL_VX * (t - CL_T0), climbY(t), CL_Z); }
const NOTA = t => t > K.nota + 1.05 ? 12.484 : clamp(climbY(t) - TAPE_Y, 0, 12.484);      // lo que marca el altímetro (se queda en la nota)
const climbLook = t => { const p = climbPos(t); p.y = Math.max(p.y, CLOUD_Y + 0.9); return p; };   // antes de salir de las nubes, se mira al sitio por donde va a salir
function jetPose(J, p, d, bank = 0) { J.position.copy(p); _m4.lookAt(v3(0, 0, 0), d.clone().negate(), v3(0, 1, 0)); J.quaternion.setFromRotationMatrix(_m4); J.rotateY(-Math.PI / 2); J.rotateX(bank); }
function climbAt(t) {
  const on = t > CL_T0 && t < K.asi4 + 0.6; S.climbJet.visible = on; const tk = env(t, K.politecnica - 0.5, K.crees + 0.9, 0.4, 0.4); S.tower.visible = tk > 0.01;
  S.climbPuffs.visible = t > CL_T0 && t < K.crees;
  if (!on) { S.climbTrail.forEach(J => { J.u.power.value = 0; }); return; }
  const p = climbPos(t), d = climbPos(t + 0.03).sub(climbPos(t - 0.03)).normalize();
  jetPose(S.climbJet, p, d, 0.06 * Math.sin(t * 0.9));
  S.climbJet.userData.update(t, { flex: 0.14 + 0.03 * Math.sin(t * 3.1), land: t < K.politecnica + 0.8, halo: 0.07 });
  S.climbJet.updateWorldMatrix(true, false);
  S.climbTrail.forEach((J, i) => { const e = S.climbJet.localToWorld(S.climbJet.userData.exh[i].clone()); jetAt(J, e, d.clone().negate(), win(t, K.politecnica + 0.3, 0.6)); });
  // la cinta vuela al lado del avión (por delante, hacia la cámara): se mueve con él en horizontal, no en vertical → los números bajan al subir
  S.tower.position.set(p.x + 0.95, TAPE_Y, CL_Z + 1.05); S.tower.scale.set(1, 1, 1); S.tower.children.forEach(c => { if (c.material) c.material.opacity = (c.userData.op0 ?? (c.userData.op0 = c.material.opacity)) * tk; });
  const mk = pop(t, K.nota + 0.1, 0.4); S.mark.scale.set(Math.max(0.001, mk), 1, 1);
  const k14 = pop(t, K.sobre, 0.3); S.top14.visible = k14 > 0.01; S.top14.scale.setScalar(Math.max(0.001, k14) * (1 + 0.15 * Math.sin(t * 8))); S.top14.material.opacity = clamp(k14) * tk;
}
// ---------------------------------------------------------------- 2 · «todo lo que vuela»: alrededor del avión llegan volando un helicóptero (desde atrás), un dron (desde abajo),
// un cohete que despega entre las nubes y un satélite que cruza alto; todos van con el avión (la cámara también), el mundo pasa por debajo
function buildFamily() {
  S.heli = makeHeli(); S.heli.scale.setScalar(1.3); scene.add(S.heli);
  S.drone = makeDrone(); S.drone.scale.setScalar(1.6); scene.add(S.drone);
  S.rocket = makeRocket(); S.rocket.scale.setScalar(5); scene.add(S.rocket);
  S.rocketJet = buildJet({ n: 2600, len: 6.5, rad: 0.14, spread: 1.6, speed: 1.6, size: 1.2, bright: 1.3, seed: 3 });
  S.sat = makeSat(); S.sat.scale.setScalar(1.5); scene.add(S.sat);
}
// sitio de cada uno respecto al avión (x adelante, y arriba, z hacia la cámara) y por dónde entra
const FAM = { heli: v3(-0.7, 2.25, 1.1), heli0: v3(-7.5, 3.4, 2.0), drone: v3(0.45, -0.75, 3.4), drone0: v3(3.6, -4.2, 4.2), sat: v3(0.5, 4.7, -4.5), sat0: v3(-6.5, 8.5, -7) };
const ROCKET = { x: 0, z: -19, t0: 0 };
function rocketLift(t, t0) { const u = Math.max(0, t - t0); return 2.6 * u * u + 1.2 * u; }
function famSlot(t, t0, d, a, b) { const u = clamp((t - t0) / d), e = 1 - Math.pow(1 - u, 3); return { p: a.clone().lerp(b, e), v: b.clone().sub(a).multiplyScalar(3 * Math.pow(1 - u, 2) / d), u }; }
function familyAt(t) {
  const on = t > K.va4 - 0.4 && t < K.asi4 + 0.6; S.heli.visible = S.drone.visible = S.sat.visible = on;
  const tr = K.lo4 - 0.55, ron = t > tr && t < K.asi4 + 0.7; S.rocket.visible = ron;
  const J = climbPos(t);
  if (on) {
    // helicóptero: llega desde atrás más rápido que el avión y frena (morro arriba al frenar), luego vuela a su lado
    const h = famSlot(t, K.va4 - 0.35, 0.9, FAM.heli0, FAM.heli); S.heli.position.copy(J).add(h.p).add(v3(0.06 * Math.sin(t * 1.3), 0.05 * Math.sin(t * 1.7), 0));
    S.heli.rotation.set(0.04 * Math.sin(t * 1.1), 0.05 * Math.sin(t * 0.6), 0.22 * clamp(h.v.length() / 9) - 0.12); S.heli.userData.update(t);
    // dron: sube desde abajo a la derecha, se inclina hacia donde va y se endereza
    const dr = famSlot(t, K.todo4 - 0.3, 0.75, FAM.drone0, FAM.drone); S.drone.position.copy(J).add(dr.p).add(v3(0.04 * Math.sin(t * 2.1), 0.04 * Math.sin(t * 3.3), 0.03 * Math.cos(t * 1.7)));
    S.drone.rotation.set(-0.05 * dr.v.z, -0.4, -0.06 * dr.v.x - 0.12); S.drone.userData.update(t);
    // satélite: cruza alto y despliega los paneles
    const sa = famSlot(t, K.vuela4 - 0.35, 1.0, FAM.sat0, FAM.sat); S.sat.position.copy(J).add(sa.p); S.sat.rotation.set(0.35, 0.6 + t * 0.2, 0.25); S.sat.userData.deploy(clamp((t - K.vuela4 + 0.1) / 0.7));
  }
  // cohete: despega desde debajo de las nubes, lejos (no va con el avión: se queda atrás en la imagen)
  if (ron) { const x0 = climbPos(t).x + 2.4, y = CLOUD_Y - 3.0 + rocketLift(t, tr); S.rocket.position.set(x0, y, ROCKET.z); S.rocket.rotation.set(0, 0, -0.03 * Math.max(0, t - tr));
    S.rocket.updateWorldMatrix(true, false); const noz = S.rocket.localToWorld(v3(0, 0, 0)), dn = S.rocket.localToWorld(v3(0, -1, 0)).sub(noz).normalize(); jetAt(S.rocketJet, noz, dn, clamp((t - tr) / 0.2)); }
  else S.rocketJet.u.power.value = 0;
}
// ---------------------------------------------------------------- 3 · por dentro: el fuselaje en construcción (cuadernas, larguerillos, ventanillas con luz) y los bloques de la base
const TUN = v3(30, 4, 0), TUNR = 1.15, TUNL = 14;
function buildTunnel() {
  const G = new THREE.Group(); G.position.copy(TUN); scene.add(G); S.tunnel = G;
  const al = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.38, metalness: 0.9 }), prim = new THREE.MeshStandardMaterial({ color: 0x5f8a5a, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i <= 22; i++) { const x = -TUNL / 2 + i * TUNL / 22, f = new THREE.Mesh(new THREE.TorusGeometry(TUNR - 0.04, 0.045, 6, 64), i % 3 ? al : prim); f.rotation.y = Math.PI / 2; f.position.x = x; f.scale.set(1, 1.04, 1); G.add(f);
    const fb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2 * TUNR * 0.93), al); fb.position.set(x, -0.42, 0); G.add(fb); }
  for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(TUNL, 0.03, 0.03), al); s.position.set(0, Math.cos(a) * (TUNR - 0.07) * 1.04, Math.sin(a) * (TUNR - 0.07)); s.rotation.x = a; G.add(s); }
  for (let k = 0; k < 6; k++) { const rail = new THREE.Mesh(new THREE.BoxGeometry(TUNL, 0.02, 0.05), al); rail.position.set(0, -0.37, -0.75 + k * 0.3); G.add(rail); }
  // piel interior con las ventanillas encendidas (la luz del amanecer entra por ellas)
  const skinT = canvasTex(2048, 512, (g, w, h) => { g.fillStyle = '#3a4048'; g.fillRect(0, 0, w, h);
    for (let x = 30; x < w; x += 46) for (const y of [h * 0.31, h * 0.69]) { const gr = g.createLinearGradient(0, y - 22, 0, y + 22); gr.addColorStop(0, '#fff2d8'); gr.addColorStop(1, '#ffb27a'); g.fillStyle = gr; rr(g, x - 10, y - 20, 20, 40, 9); g.fill(); } });
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(TUNR, TUNR, TUNL, 64, 1, true), new THREE.MeshStandardMaterial({ map: skinT, emissiveMap: skinT, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.4, side: THREE.BackSide }));
  skin.rotation.z = Math.PI / 2; skin.scale.set(1, 1, 1.04); G.add(skin);
  // bloques (como en «Industrial»): ∫ cálculo, matriz álgebra, manzana física, molécula química, avión en tres vistas dibujo técnico
  const face = (draw, bg) => canvasTex(512, 512, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; draw(g, w, h); });
  const tex = [
    face((g, w, h) => { g.font = '700 300px serif'; g.fillText('∫', w * 0.42, h * 0.5); g.font = '700 110px Inter'; g.fillText('dx', w * 0.7, h * 0.62); }, '#2f7cf0'),
    face((g, w, h) => { g.font = '700 70px SpaceMono'; ['[ 2 0 1 ]', '[ 1 3 0 ]', '[ 0 1 4 ]'].forEach((s, i) => g.fillText(s, w / 2, h * (0.33 + i * 0.17))); }, '#7d55f0'),
    face((g, w, h) => { g.beginPath(); g.arc(w * 0.42, h * 0.45, 80, 0, 7); g.fill(); g.fillRect(w * 0.41, h * 0.22, 16, 50); g.font = '700 70px Inter'; g.fillText('F = m·a', w / 2, h * 0.8); g.lineWidth = 14; g.beginPath(); g.moveTo(w * 0.72, h * 0.25); g.lineTo(w * 0.72, h * 0.6); g.stroke(); g.beginPath(); g.moveTo(w * 0.66, h * 0.52); g.lineTo(w * 0.72, h * 0.62); g.lineTo(w * 0.78, h * 0.52); g.stroke(); }, '#18b878'),
    face((g, w, h) => { g.lineWidth = 12; const P = [[0.5, 0.3], [0.3, 0.6], [0.7, 0.6], [0.5, 0.8]]; g.beginPath(); g.moveTo(w * P[0][0], h * P[0][1]); g.lineTo(w * P[1][0], h * P[1][1]); g.moveTo(w * P[0][0], h * P[0][1]); g.lineTo(w * P[2][0], h * P[2][1]); g.moveTo(w * P[1][0], h * P[1][1]); g.lineTo(w * P[3][0], h * P[3][1]); g.stroke(); P.forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, 38, 0, 7); g.fill(); }); g.font = '700 60px Inter'; g.fillText('H₂O + CO₂', w / 2, h * 0.14); }, '#f07a2a'),
    face((g, w, h) => { g.lineWidth = 6; g.strokeStyle = '#1b2a4a'; g.fillStyle = '#1b2a4a'; g.strokeRect(30, 30, w - 60, h - 60); g.beginPath(); g.moveTo(w * 0.15, h * 0.3); g.lineTo(w * 0.85, h * 0.3); g.moveTo(w * 0.5, h * 0.2); g.lineTo(w * 0.42, h * 0.3); g.lineTo(w * 0.2, h * 0.36); g.moveTo(w * 0.5, h * 0.2); g.lineTo(w * 0.58, h * 0.3); g.lineTo(w * 0.8, h * 0.36); g.stroke();
      g.beginPath(); g.moveTo(w * 0.5, h * 0.48); g.lineTo(w * 0.5, h * 0.9); g.moveTo(w * 0.22, h * 0.66); g.lineTo(w * 0.78, h * 0.66); g.moveTo(w * 0.38, h * 0.85); g.lineTo(w * 0.62, h * 0.85); g.stroke(); g.font = '700 40px SpaceMono'; g.fillText('A-A', w * 0.82, h * 0.88); }, '#f1f3f6'),
  ];
  S.blocks = tex.map((tx, i) => { const b = rbox(0.42, 0.42, 0.42, plastic([0x2f7cf0, 0x7d55f0, 0x18b878, 0xf07a2a, 0xe8ebf0][i], 0.18), 0.07); const m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.3 });
    for (const [x, y, z, ry, rx] of [[0, 0, 0.212, 0, 0], [0.212, 0, 0, Math.PI / 2, 0], [-0.212, 0, 0, -Math.PI / 2, 0], [0, 0, -0.212, Math.PI, 0]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); b.add(p); }
    G.add(b); return b; });
}
// la cámara recorre el fuselaje de −x a +x a ≈ 2,5 m/s; cada bloque sale (sube del suelo) unos 2 m por delante de ella al oír su palabra
const TUN_X0 = -6.4, TUN_V = 2.75;
const tunCamX = t => TUN_X0 + TUN_V * (t - (K.asi4 + 0.25));
function tunnelAt(t) {
  const on = t > K.asi4 + 0.2 && t < K.aerod + 0.5; S.tunnel.visible = on; if (!on) return;
  const ws = [K.calculo, K.algebra, K.fisica, K.quimica, K.dibujo];
  S.blocks.forEach((b, i) => { const t0 = ws[i] - 0.12, k = pop(t, t0, 0.42), x = tunCamX(t0) + 2.7, sd = i % 2 ? 1 : -1;
    b.visible = k > 0.01; b.scale.setScalar(Math.max(0.001, k) * 0.86); b.position.set(x, lerp(-0.6, -0.08, eo(clamp((t - t0) / 0.35))) + 0.03 * Math.sin(t * 2 + i), sd * 0.24);
    b.rotation.set(0.1 * Math.sin(t * 1.3 + i), -Math.PI / 2 + sd * 0.55 + 0.25 * Math.sin(t * 0.8 + i), 0.06 * Math.sin(t * 1.1 + i)); });
}
// ---------------------------------------------------------------- 4 · túnel de viento: perfil de Joukowski con flujo potencial de verdad (líneas de corriente, más rápido por arriba) y mapa de presiones
const AER = v3(44, 3.6, 0), AFC = 1.3;      // centro y cuerda (m)
function joukowski() {     // círculo ζ (centro c, radio R) → perfil z = ζ + 1/ζ; flujo a 7° con circulación de Kutta
  const cx = -0.09, cy = 0.09, R = Math.hypot(1 - cx, cy), al = 7 * Math.PI / 180, beta = Math.asin(cy / R), Gam = 4 * Math.PI * R * Math.sin(al + beta);
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const csqrt = a => { const r = Math.hypot(a[0], a[1]), th = Math.atan2(a[1], a[0]) / 2; return [Math.sqrt(r) * Math.cos(th), Math.sqrt(r) * Math.sin(th)]; };
  const zeta = z => { const s = csqrt([z[0] * z[0] - z[1] * z[1] - 4, 2 * z[0] * z[1]]); const a = [(z[0] + s[0]) / 2, (z[1] + s[1]) / 2], b = [(z[0] - s[0]) / 2, (z[1] - s[1]) / 2]; return Math.hypot(a[0] - cx, a[1] - cy) >= Math.hypot(b[0] - cx, b[1] - cy) ? a : b; };
  const vel = z => { const zt = zeta(z), q = [zt[0] - cx, zt[1] - cy], e1 = [Math.cos(al), -Math.sin(al)], e2 = [Math.cos(al), Math.sin(al)];
    const q2 = cmul(q, q); let dw = [e1[0], e1[1]]; const t2 = cdiv([R * R * e2[0], R * R * e2[1]], q2); dw = [dw[0] - t2[0], dw[1] - t2[1]];
    const t3 = cdiv([0, Gam / (2 * Math.PI)], q); dw = [dw[0] + t3[0], dw[1] + t3[1]];
    const dz = [1 - cdiv([1, 0], cmul(zt, zt))[0], -cdiv([1, 0], cmul(zt, zt))[1]], v = cdiv(dw, dz); return [v[0], -v[1]]; };
  const shape = []; for (let i = 0; i <= 120; i++) { const th = i / 120 * Math.PI * 2, zt = [cx + R * Math.cos(th), cy + R * Math.sin(th)], d = zt[0] * zt[0] + zt[1] * zt[1]; shape.push([zt[0] + zt[0] / d, zt[1] - zt[1] / d]); }
  let xmin = 1e9, xmax = -1e9; shape.forEach(p => { xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); });
  return { vel, shape, xmin, xmax, chord: xmax - xmin, mid: (xmin + xmax) / 2 };
}
function buildAero() {
  const G = new THREE.Group(); G.position.copy(AER); scene.add(G); S.aero = G;
  const JK = joukowski(), k = AFC / JK.chord, toL = p => [(p[0] - JK.mid) * k, p[1] * k];
  // el perfil extruido (ala del túnel)
  const sh = new THREE.Shape(); JK.shape.forEach((p, i) => { const q = toL(p); i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1]); });
  const ag = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false, curveSegments: 4 }); ag.translate(0, 0, -0.6);
  const af = new THREE.Mesh(ag, new THREE.MeshPhysicalMaterial({ color: 0xd9dde3, roughness: 0.22, metalness: 0.85, clearcoat: 0.5 })); af.castShadow = true; G.add(af);
  // sección de ensayo: suelo y techo, pared del fondo (con el mapa de presiones), cristal delante, aristas de metal y el peine que suelta el humo
  const frm = metal(0x3a4250, 0.4), slab = new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.55, metalness: 0.4 });
  for (const y of [-1.0, 1.0]) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.45), slab); b.position.set(0, y, 0); b.receiveShadow = true; G.add(b); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.94), new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.7 })); back.position.z = -0.68; G.add(back);
  for (const y of [-0.96, 0.96]) for (const z of [-0.7, 0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.05, 0.05), frm); b.position.set(0, y, z); G.add(b); }
  for (const x of [-1.8, 1.8]) for (const z of [-0.7, 0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.97, 0.05), frm); b.position.set(x, 0, z); G.add(b); }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.94), new THREE.MeshPhysicalMaterial({ color: 0xcfe2ff, transparent: true, opacity: 0.07, roughness: 0.04, metalness: 0, clearcoat: 1, depthWrite: false })); glass.position.z = 0.7; glass.renderOrder = 8; G.add(glass);
  const rake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.06), frm); rake.position.set(-1.72, 0.0, 0.62); G.add(rake);
  // mapa de presiones (Cp = 1 − (V/U)²) en la pared del fondo: azul = baja presión (arriba), rojo = alta (abajo)
  const PW = 3.5, PH = 1.85, NX = 280, NY = 148;
  const cp = canvasTex(NX, NY, (g, w, h) => { const img = g.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = (i / w - 0.5) * PW / k + JK.mid, Y = (0.5 - j / h) * PH / k; let r = 40, gg = 50, b = 80, a = 255;
      const zz = [X, Y]; const zt = (() => { try { return 1; } catch (e) { return 0; } })();
      const v = JK.vel(zz), V2 = v[0] * v[0] + v[1] * v[1], c = clamp(1 - V2, -2.2, 1);
      const u = c < 0 ? -c / 2.2 : 0, p = c > 0 ? c : 0; r = Math.round(30 + 225 * p + 20 * u); gg = Math.round(40 + 120 * u * (1 - u) * 2 + 60 * p * (1 - p)); b = Math.round(60 + 195 * u); img.data.set([r, gg, b, a], (j * w + i) * 4); }
    g.putImageData(img, 0, 0); });
  cp.colorSpace = THREE.SRGBColorSpace;
  S.cpM = new THREE.MeshBasicMaterial({ map: cp, transparent: true, opacity: 0, toneMapped: true }); const cpl = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), S.cpM); cpl.position.z = -0.66; G.add(cpl);
  // líneas de corriente integradas (RK2) desde la izquierda; cada una guarda su tiempo de recorrido (las partículas van más rápido donde el flujo es más rápido)
  const lines = [];
  for (let s = 0; s < 30; s++) { const y0 = -0.82 + s * 1.64 / 29; let z = [(-1.8 / k) + JK.mid, y0 / k]; const pts = [], ts = [0]; let T = 0;
    for (let n = 0; n < 900; n++) { const q = toL(z); pts.push(v3(q[0], q[1], 0.62)); if (q[0] > 1.8) break;
      const v = JK.vel(z), sp = Math.hypot(v[0], v[1]) || 1e-6, dt = Math.min(0.012 / sp, 0.04); const zm = [z[0] + v[0] * dt * 0.5, z[1] + v[1] * dt * 0.5], vm = JK.vel(zm); z = [z[0] + vm[0] * dt, z[1] + vm[1] * dt]; T += dt; ts.push(T); }
    ts.length = pts.length; T = ts[ts.length - 1]; lines.push({ pts, ts, T }); }      // (una línea que no llega a salir se queda con lo recorrido)
  S.stream = { lines, n: 34 }; S.streamSeg = segSet(lines.length * 34, 0xf2f8ff, 2.6, 0.95); G.add(S.streamSeg);
  S.streamFull = lines.map(L => { const l = drawLine(L.pts.filter((_, i) => i % 3 === 0 || i === L.pts.length - 1), 0xbcd6f0, 1.4, 0); G.add(l); return l; });      // la línea entera, tenue (el «camino» del humo)
  lines.forEach(L => { const nz = cyl(0.012, 0.012, 0.08, frm, 8); nz.rotation.z = Math.PI / 2; nz.position.set(-1.68, L.pts[0].y, 0.62); G.add(nz); });
  // el avión de pasajeros encima del túnel, con su peso y su sustentación
  S.aeroJet = makeJet({ stripe: '#0f7b6c', stripe2: '#f2b233', tail: 0x0f7b6c }); S.aeroJet.scale.setScalar(2.6); S.aeroJet.rotation.y = Math.PI - 0.55; G.add(S.aeroJet);    // morro hacia −x: el viento del túnel le viene de frente
  S.wArrow = arrow3(1, plastic(0xff4b5c, 0.25), 0.04); S.wArrow.rotation.x = Math.PI; G.add(S.wArrow);
  S.lArrow = [1, -1].map(s => { const a = arrow3(1, plastic(0x38c8ff, 0.25), 0.035); G.add(a); return a; });
}
function aeroAt(t) {
  const on = t > K.aerod - 0.4 && t < K.estructuras + 0.5; S.aero.visible = on; if (!on) return;
  const fk = clamp((t - (K.aerod - 0.2)) / 0.5); S.cpM.opacity = 0.9 * win(t, K.aerod + 0.25, 0.5);
  const st = S.stream, seg = S.streamSeg.userData; let k = 0;
  st.lines.forEach((L, li) => { for (let j = 0; j < st.n; j++) {
    const tau = ((t * 0.55 + j / st.n * L.T + hash(li * 7.3) * L.T) % L.T), tau2 = Math.max(0, tau - 0.085);
    const at = tt => { let i = 1; while (i < L.ts.length - 1 && L.ts[i] < tt) i++; const f = (tt - L.ts[i - 1]) / Math.max(1e-9, L.ts[i] - L.ts[i - 1]); return L.pts[i - 1].clone().lerp(L.pts[i], clamp(f)); };
    const a = at(tau2), b = at(tau); if (fk < 1 && a.x > -1.8 + 3.6 * fk) { a.copy(b); } seg.set(k++, a, b); } });
  seg.flush(); S.streamSeg.material.opacity = 0.95 * fk; S.streamFull.forEach(l => { l.material.opacity = 0.2 * fk; drawK(l, fk); });
  // el avión entra volando desde la derecha (de frente al viento), frena y se queda encima del túnel balanceándose en el aire
  const ja = K.avion6 - 0.45, ju = clamp((t - ja) / 0.75), je = 1 - Math.pow(1 - ju, 3); S.aeroJet.visible = t > ja;
  S.aeroJet.position.set(lerp(4.6, 0.25, je), 1.9 + 0.05 * Math.sin(t * 1.3) + 0.35 * (1 - je), -0.75); S.aeroJet.rotation.set(0.08 * Math.sin(t * 0.9) + 0.25 * (1 - je), Math.PI - 0.55, 0.03 * Math.sin(t * 1.4));
  S.aeroJet.userData.update(t, { flex: 0.1 + 0.15 * win(t, K.sostiene, 0.5), halo: 0.07 });
  const wk = win(t, K.toneladas - 0.1, 0.45), lk = win(t, K.sostiene - 0.05, 0.5); S.aeroJet.updateWorldMatrix(true, false);
  const cg = S.aeroJet.position.clone().add(v3(0, -0.04, 0)), wing = s => S.aeroJet.localToWorld(v3(-0.1, 0.0, s * 0.25)).sub(S.aero.position);
  S.wArrow.visible = wk > 0.01; S.wArrow.position.copy(cg); S.wArrow.userData.setLen(1.25 * wk);
  S.lArrow.forEach((a, i) => { a.visible = lk > 0.01; a.position.copy(wing(i ? -1 : 1)); a.userData.setLen(0.95 * lk * (1 + 0.04 * Math.sin(t * 7 + i))); });
}
// ---------------------------------------------------------------- 5 · ensayo del ala: se dobla (colores de tensión) sin romperse; zoom a la piel: fibra de carbono por capas
const WNG = v3(55, 2.2, 0), WSPAN = 5.2, WSW = 0.52, WDH = 0.06;
const wChord = e => lerp(2.1, 0.5, e);
// punto del extradós a la fracción e de la envergadura y c de la cuerda (local del banco: envergadura en +x, cuerda hacia +z), con la flexión fl
const wTop = (e, c, fl) => v3(e * WSPAN, e * WSPAN * Math.tan(WDH) + 0.075 * wChord(e) + fl * e * e * WSPAN * 0.34, e * WSPAN * Math.tan(WSW) + c * wChord(e));
const WEAVE = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, w, h); const n = 16, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const over = ((i + j) % 4) < 2, x = i * s, y = j * s, gr = over ? g.createLinearGradient(x, y, x + s, y) : g.createLinearGradient(x, y, x, y + s);
    gr.addColorStop(0, '#1a1c20'); gr.addColorStop(0.5, over ? '#4a4f58' : '#3a3e46'); gr.addColorStop(1, '#16181b'); g.fillStyle = gr; g.fillRect(x + 1, y + 1, s - 2, s - 2); } });
WEAVE.wrapS = WEAVE.wrapT = THREE.RepeatWrapping;
function buildWing() {
  const G = new THREE.Group(); G.position.copy(WNG); scene.add(G); S.wingRig = G;
  const wall = rbox(1.2, 4.2, 3.8, new THREE.MeshStandardMaterial({ color: 0x5b5f66, roughness: 0.85 }), 0.05); wall.position.set(-0.65, 0.4, 1.1); G.add(wall);
  for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 0.12), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf2c230 : 0x16181c, roughness: 0.6 })); st.position.set(-0.03, 0.4, 2.35 + i * 0.12); G.add(st); }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.75, metalness: 0.2 })); deck.position.set(3, -1.7, 1.2); deck.receiveShadow = true; G.add(deck);
  const wm = flexMat(new THREE.MeshPhysicalMaterial({ color: 0xc9ced6, roughness: 0.4, metalness: 0.35, clearcoat: 0.6 }), WSPAN);
  S.bigWing = new THREE.Mesh(wingGeo({ cr: 2.1, ct: 0.5, span: WSPAN, sweep: WSW, dih: WDH, tcR: 0.13, tcT: 0.1, twist: 0.05, nS: 30 }), wm); S.bigWing.rotation.y = Math.PI / 2; S.bigWing.castShadow = true; S.bigWing.receiveShadow = true; G.add(S.bigWing); S.bigWingM = wm;
  // 4 actuadores hidráulicos desde el suelo que empujan el ala hacia arriba (encima no hay nada: la punta se ve subir)
  const rodM = metal(0x8d96a2, 0.35), cylM = plastic(0xffc21a, 0.3);
  S.jacks = [0.35, 0.55, 0.75, 0.92].map(e => { const base = cyl(0.12, 0.14, 0.12, MAT.dsteel, 20); G.add(base); const c = cyl(0.075, 0.075, 1.0, cylM, 20); G.add(c); const r = cyl(0.035, 0.035, 1, rodM, 12); G.add(r);
    const pad = rbox(0.34, 0.05, 0.3, MAT.rubber, 0.02); G.add(pad); return { e, r, c, pad, base }; });
  // muestra de fibra de carbono: 4 capas (0°, 45°, 90°, −45°) que salen de la piel del ala y se separan
  S.plies = [0, 45, 90, -45].map((ang, i) => { const t2 = WEAVE.clone(); t2.needsUpdate = true; t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(2, 2); t2.rotation = ang * Math.PI / 180; t2.center.set(0.5, 0.5);
    const m = new THREE.MeshPhysicalMaterial({ map: t2, color: 0xffffff, roughness: 0.32, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.6), m); p.castShadow = true; G.add(p); return p; });
}
function wingAt(t) {
  const on = t > K.estructuras - 0.4 && t < K.propulsion + 0.5; S.wingRig.visible = on; if (!on) return;
  const fl = 0.82 * win(t, K.alas - 0.05, 0.9) * (1 + 0.03 * Math.sin(t * 6) * win(t, K.sin7, 0.2)), u = S.bigWingM.userData.u;
  u.uFlex.value = fl; u.uStress.value = win(t, K.alas + 0.1, 0.4) * (1 - win(t, K.fibra - 0.2, 0.4));
  S.jacks.forEach(J => { const p = wTop(J.e, 0.45, fl).add(v3(0, -0.16 * wChord(J.e), 0)), fy = -1.64; J.base.position.set(p.x, fy + 0.06, p.z); J.c.position.set(p.x, fy + 0.62, p.z); J.r.position.set(p.x, (p.y + fy + 1.0) / 2, p.z); J.r.scale.y = Math.max(0.01, p.y - (fy + 1.0)); J.pad.position.copy(p).add(v3(0, -0.03, 0)); });
  const pk = win(t, K.fibra - 0.12, 0.5), pk2 = win(t, K.carbono - 0.1, 0.6), base = wTop(0.25, 0.42, fl);
  S.plies.forEach((p, i) => { p.visible = pk > 0.01; p.position.copy(base).add(v3(0, 0.02 + i * (0.014 + 0.15 * pk2) + 0.06 * pk, 0)); p.rotation.set(0.04, -0.12 + (i - 1.5) * 0.09 * pk2, 0.07); p.scale.setScalar(Math.max(0.001, pk)); });
}
// ---------------------------------------------------------------- 6 · propulsión: turbofán que se abre en corte (fan, compresor, cámara de combustión, turbina) y tobera de cohete encendida
const ENG = v3(68, 2.4, 0), RKE = v3(75, 3.2, -0.6);
function ring(nb, r0, r1, chord, m, twist = 0.6) {
  const geo = new THREE.BoxGeometry(0.014, r1 - r0, chord), im = new THREE.InstancedMesh(geo, m, nb);
  for (let i = 0; i < nb; i++) { const a = i / nb * Math.PI * 2; _q.setFromEuler(_e.set(a, 0, 0)); _q2.setFromEuler(_e.set(0, twist, 0)); _q.multiply(_q2);
    _p.set(0, Math.cos(a) * (r0 + r1) / 2, Math.sin(a) * (r0 + r1) / 2); _m4.compose(_p, _q, _s.set(1, 1, 1)); im.setMatrixAt(i, _m4); }
  im.castShadow = true; return im;
}
function buildEngine() {
  const G = new THREE.Group(); G.position.copy(ENG); G.rotation.y = -0.35; scene.add(G); S.engine = G;
  const E = new THREE.Group(); E.scale.setScalar(0.95); G.add(E);
  const ti = new THREE.MeshStandardMaterial({ color: 0xa7adb6, roughness: 0.25, metalness: 1 }), hot = new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.35, metalness: 1, emissive: 0xff5a1a, emissiveIntensity: 0 });
  const cowlM = new THREE.MeshPhysicalMaterial({ color: 0xeef1f4, roughness: 0.28, metalness: 0.1, clearcoat: 1, side: THREE.DoubleSide });
  const prof = [[0.94, 0.25], [1.03, 0.2], [1.08, 0.05], [1.1, -0.4], [1.06, -1.2], [0.96, -1.65], [0.9, -1.62], [0.95, -0.4], [0.97, 0.15], [0.94, 0.25]].map(([r, x]) => [r, -x]);
  const hinged = (mesh, y) => { const h = new THREE.Group(); h.position.set(0, y, 0); mesh.position.set(0, -y, 0); h.add(mesh); E.add(h); return h; };
  S.cowl = [0, 1].map(k => { const c = lathe(prof, 48, cowlM, -Math.PI / 2 + k * Math.PI, Math.PI); c.rotation.z = Math.PI / 2; return hinged(c, 1.12); });   // mitad 0 = la de la cámara (+z)
  S.fanR = new THREE.Group(); E.add(S.fanR); S.lowR = new THREE.Group(); E.add(S.lowR); S.highR = new THREE.Group(); E.add(S.highR);
  const fan = ring(24, 0.16, 0.95, 0.32, ti, 0.75); S.fanR.add(fan);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 40), new THREE.MeshStandardMaterial({ map: SWIRL, roughness: 0.3, metalness: 0.6 })); sp.rotation.z = -Math.PI / 2; sp.position.x = 0.22; S.fanR.add(sp);
  for (let s = 0; s < 3; s++) { const r = ring(40, 0.2, 0.52 - s * 0.03, 0.08, ti, 0.5); r.position.x = -0.32 - s * 0.12; S.lowR.add(r); }
  for (let s = 0; s < 8; s++) { const r = ring(48, 0.18, 0.34 - s * 0.012, 0.05, ti, 0.45); r.position.x = -0.78 - s * 0.075; S.highR.add(r); }
  S.comb = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 16, 48), new THREE.MeshStandardMaterial({ color: 0x3a2a22, emissive: 0xff6a1a, emissiveIntensity: 0, roughness: 0.4, metalness: 0.6 })); S.comb.rotation.y = Math.PI / 2; S.comb.position.x = -1.48; E.add(S.comb);
  for (let s = 0; s < 2; s++) { const r = ring(44, 0.2, 0.37, 0.06, hot, 0.5); r.position.x = -1.65 - s * 0.09; S.highR.add(r); }
  for (let s = 0; s < 5; s++) { const r = ring(56, 0.24, 0.42 + s * 0.03, 0.07, ti, 0.55); r.position.x = -1.9 - s * 0.11; S.lowR.add(r); }
  S.hotM = hot;
  const core = [[0.55, -0.25], [0.4, -0.75], [0.37, -1.4], [0.42, -1.7], [0.52, -2.4], [0.45, -2.75]].map(([r, x]) => [r, -x]);
  S.coreC = [0, 1].map(k => { const c = lathe(core, 40, new THREE.MeshStandardMaterial({ color: 0x5a616b, roughness: 0.45, metalness: 0.9, side: THREE.DoubleSide }), -Math.PI / 2 + k * Math.PI, Math.PI); c.rotation.z = Math.PI / 2; return hinged(c, 0.56); });
  const plug = lathe([[0.2, 2.3], [0.17, 2.7], [0.02, 3.0]].map(([r, x]) => [r, x]), 32, metal(0x7a808a, 0.35)); plug.rotation.z = Math.PI / 2; E.add(plug);
  S.engJet = buildJet({ n: 1400, len: 3.5, rad: 0.3, spread: 0.7, speed: 2.6, size: 0.6, bright: 0.45, kind: 1, seed: 5, turb: 0.6 });
  // motor cohete en el banco de pruebas, disparando hacia abajo (entre las nubes)
  const R2 = new THREE.Group(); R2.position.copy(RKE); scene.add(R2); S.rke = R2;
  const tubes = canvasTex(512, 64, (g, w, h) => { for (let x = 0; x < w; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#3a2014'); gr.addColorStop(0.5, '#c27a4a'); gr.addColorStop(1, '#3a2014'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); } });
  tubes.wrapS = THREE.RepeatWrapping; tubes.repeat.set(2, 1);
  const bellProf = []; for (let i = 0; i <= 24; i++) { const u = i / 24; bellProf.push([0.22 + 0.68 * Math.pow(u, 0.62), -0.45 - u * 1.6]); }
  S.bellM = new THREE.MeshStandardMaterial({ map: tubes, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide, emissive: 0xff4a10, emissiveIntensity: 0 });
  const bell = lathe([[0.3, 0.1], [0.32, -0.25], [0.22, -0.45], ...bellProf], 48, S.bellM); R2.add(bell);
  const dome = sph(0.32, metal(0x8a8f98, 0.3), 24, 12); dome.scale.y = 0.6; dome.position.y = 0.1; R2.add(dome);
  const tp = cyl(0.14, 0.14, 0.5, metal(0x6a707a, 0.35), 24); tp.position.set(0.45, 0.2, 0.1); R2.add(tp);
  R2.add(tube([v3(0.45, -0.05, 0.1), v3(0.4, -0.3, 0.2), v3(0.12, -0.35, 0.3)], 0.045, MAT.steel, 16)); R2.add(tube([v3(0.45, 0.45, 0.1), v3(0.2, 0.55, 0), v3(0, 0.4, 0)], 0.05, MAT.steel, 16));
  const frame = metal(0x2b2f36, 0.5); for (const [x, z] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6]]) R2.add(bar(v3(x * 0.4, 0.4, z * 0.4), v3(x * 1.4, 1.6, z * 1.4), 0.04, frame));
  S.rkeJet = buildJet({ n: 3000, len: 8, rad: 0.62, spread: 1.6, speed: 1.3, size: 1.1, bright: 1.25, seed: 9 });
  S.shock = shockDiamonds(7); R2.add(S.shock);
}
function engineAt(t) {
  const on = t > K.propulsion - 0.5 && t < K.mecanica + 0.3; S.engine.visible = on; S.rke.visible = on;
  if (!on) { S.engJet.u.power.value = 0; S.rkeJet.u.power.value = 0; return; }
  const spool = win(t, K.propulsion - 0.4, 0.8);
  S.fanR.rotation.x = spool * t * 26; S.lowR.rotation.x = spool * t * 26; S.highR.rotation.x = spool * t * 55;
  const cut = win(t, K.motores - 0.12, 0.6), cut2 = win(t, K.motores + 0.12, 0.55); S.cowl[0].rotation.x = -1.95 * cut; S.coreC[0].rotation.x = -2.1 * cut2;
  S.comb.material.emissiveIntensity = 3.2 * win(t, K.reaccion - 0.1, 0.4) * (0.85 + 0.15 * Math.sin(t * 31)); S.hotM.emissiveIntensity = 1.2 * win(t, K.reaccion, 0.5);
  const ex = S.engine.localToWorld(v3(-2.9, 0, 0)), dx = S.engine.localToWorld(v3(-3.9, 0, 0)).sub(ex).normalize(); jetAt(S.engJet, ex, dx, win(t, K.reaccion, 0.4) * (t < K.cohetes + 0.6 ? 1 : 0));
  const fire = win(t, K.cohetes - 0.25, 0.25), noz = S.rke.localToWorld(v3(0, -2.05, 0));
  jetAt(S.rkeJet, noz, v3(0, -1, 0), fire * (0.9 + 0.1 * Math.sin(t * 40))); S.bellM.emissiveIntensity = 0.8 * fire;
  S.shock.children.forEach(m => { const i = m.userData.i; m.visible = fire > 0.05; m.position.set(0, -2.3 - i * 0.62, 0); m.scale.set(0.5 - i * 0.04, 0.42, 1).multiplyScalar(fire * (0.9 + 0.12 * Math.sin(t * 50 + i))); m.quaternion.copy(cam.quaternion); });
}
