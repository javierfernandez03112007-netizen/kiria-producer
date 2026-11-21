// ---------------------------------------------------------------- LA ESTATUA DE KIRIA (día 4): mujer de oro con corona, antorcha en alto y escudo de la ciudad,
// tapada con una tela roja de terciopelo que el rey retira de un tirón (la tela resbala hacia él y cae al suelo, arrugada).
// Y los drones: 420 luces en el cielo que forman «6.438» y después una lupa («¿te has visto?»).
const GOLDK = () => { const m = new THREE.MeshStandardMaterial({ color: 0xffcf6a, roughness: 0.2, metalness: 1 }); m.userData.envFixed = 0.9; return m; };
function capsule(r, len, m, seg = 12) { const c = pm(new THREE.CapsuleGeometry(r, len, 6, seg), m); return c; }
// une dos puntos con una cápsula (brazos de la estatua)
function limbBetween(a, b, r, m) { const d = b.clone().sub(a), c = capsule(r, Math.max(0.01, d.length() - 2 * r * 0.2), m); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(_v(0, 1, 0), d.normalize()); return c; }
function kiriaStatue() {
  const g = new THREE.Group(), gold = GOLDK(), U = g.userData; U.gold = gold;
  // vestido largo con pliegues (torneado aplanado): bajo ancho, cintura, pecho y hombros
  const prof = [[0.0, 0.0], [0.6, 0.0], [0.62, 0.05], [0.56, 0.28], [0.47, 0.78], [0.37, 1.28], [0.27, 1.72], [0.22, 1.95], [0.255, 2.14], [0.285, 2.3], [0.27, 2.44], [0.2, 2.56], [0.09, 2.63], [0.0, 2.64]];
  const lg = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0], q[1])), 72, 0, Math.PI * 2), P = lg.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z); if (r < 1e-4) continue; const a = Math.atan2(z, x), fold = (0.03 * Math.sin(a * 11 + y * 1.3) + 0.014 * Math.sin(a * 23 - y * 2.1)) * clamp(1.4 - y / 1.9, 0, 1);
    const k = (r + fold) / r; P.setX(i, x * k); P.setZ(i, z * k * 0.82); }
  lg.computeVertexNormals(); const dress = pm(lg, gold); g.add(dress);
  // cinturón y escote
  ad(g, pm(new THREE.TorusGeometry(0.235, 0.025, 10, 48), gold)).rotation.x = Math.PI / 2; g.children[g.children.length - 1].position.y = 1.97; g.children[g.children.length - 1].scale.set(1, 0.82, 1);
  // cuello, cabeza, moño, nariz y barbilla, y la corona
  const neck = pm(new THREE.CylinderGeometry(0.065, 0.08, 0.2, 20), gold); neck.position.y = 2.7; g.add(neck);
  const head = new THREE.Group(); head.position.set(0, 2.92, 0.01); g.add(head); U.head = head;
  const hd = pm(new THREE.SphereGeometry(1, 40, 28), gold); hd.scale.set(0.14, 0.18, 0.155); head.add(hd);
  const nose = pm(new THREE.SphereGeometry(1, 14, 10), gold); nose.scale.set(0.022, 0.04, 0.03); nose.position.set(0, -0.01, 0.15); nose.rotation.x = -0.35; head.add(nose);
  const chin = pm(new THREE.SphereGeometry(1, 14, 10), gold); chin.scale.set(0.06, 0.045, 0.05); chin.position.set(0, -0.135, 0.1); head.add(chin);
  for (const s of [-1, 1]) { const brow = pm(new THREE.SphereGeometry(1, 12, 8), gold); brow.scale.set(0.045, 0.012, 0.02); brow.position.set(s * 0.055, 0.045, 0.135); brow.rotation.z = s * 0.15; head.add(brow);
    const lid = pm(new THREE.SphereGeometry(1, 12, 8), gold); lid.scale.set(0.035, 0.016, 0.012); lid.position.set(s * 0.055, 0.012, 0.145); head.add(lid); }
  const lips = pm(new THREE.TorusGeometry(0.028, 0.009, 8, 20), gold); lips.scale.set(1, 0.4, 0.6); lips.position.set(0, -0.075, 0.138); head.add(lips);
  const hair = pm(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), gold); hair.scale.set(0.155, 0.19, 0.165); hair.position.set(0, 0.012, -0.012); hair.rotation.x = -0.25; head.add(hair);
  const bun = pm(new THREE.SphereGeometry(0.085, 20, 14), gold); bun.position.set(0, 0.05, -0.16); head.add(bun);
  const cr = crown(1.85); cr.traverse(o => { if (o.isMesh && o.material.metalness === 1) o.material = gold; }); cr.position.y = 0.15; head.add(cr);
  // brazo derecho en alto con la antorcha (su llama brilla: la luz de la ciudad)
  const shR = _v(0.25, 2.48, 0.0), elR = _v(0.36, 2.86, 0.05), haR = _v(0.33, 3.26, 0.08);
  g.add(limbBetween(shR, elR, 0.06, gold), limbBetween(elR, haR, 0.05, gold)); ad(g, pm(new THREE.SphereGeometry(0.075, 16, 12), gold)).position.copy(shR);
  const torch = new THREE.Group(); torch.position.copy(haR); g.add(torch); ad(torch, pm(new THREE.CylinderGeometry(0.035, 0.025, 0.42, 16), gold)).position.y = 0.06;
  ad(torch, pm(new THREE.CylinderGeometry(0.085, 0.045, 0.12, 20), gold)).position.y = 0.3;
  U.flameM = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffc45a, emissiveIntensity: 4.5, roughness: 0.4 });
  const flame = pm(new THREE.SphereGeometry(1, 20, 14), U.flameM); flame.scale.set(0.085, 0.17, 0.085); flame.position.y = 0.45; torch.add(flame); U.flame = flame; U.torchTop = _v(haR.x, haR.y + 0.5, haR.z);
  // brazo izquierdo apoyado en el escudo de Kiria World (la corona del estandarte)
  const shL = _v(-0.25, 2.48, 0.0), elL = _v(-0.36, 2.12, 0.08), haL = _v(-0.42, 1.82, 0.2);
  g.add(limbBetween(shL, elL, 0.06, gold), limbBetween(elL, haL, 0.05, gold)); ad(g, pm(new THREE.SphereGeometry(0.075, 16, 12), gold)).position.copy(shL);
  const shield = new THREE.Group(); shield.position.set(-0.52, 1.45, 0.22); shield.rotation.set(0, -0.35, 0.08); g.add(shield);
  const sd = pm(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 40), gold); sd.rotation.x = Math.PI / 2; shield.add(sd);
  const rim = pm(new THREE.TorusGeometry(0.36, 0.025, 10, 48), gold); rim.position.z = 0.025; shield.add(rim);
  const em = crown(2.0); em.traverse(o => { if (o.isMesh && o.material.metalness === 1) o.material = gold; }); em.position.set(0, -0.08, 0.04); em.rotation.x = Math.PI / 2 * 0; shield.add(em); em.scale.z = 0.35;
  shadowAll(g, true, true); U.H = 3.8; return g;
}
// ---- la tela roja: cubre la estatua (con el pico de la antorcha) y, al tirar el rey, resbala hacia él y cae al suelo arrugada
function veilCloth(statue, pullDir) {
  const NU = 72, NV = 40, U = statue.userData, top = U.torchTop.clone(), H = top.y + 0.08;
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(NU * NV * 3), uv = new Float32Array(NU * NV * 2), idx = [];
  // la tela cuelga de los puntos altos de la figura (la llama de la antorcha, la corona, los hombros y el codo): en cada altura y dirección llega hasta
  // donde llega el «tejado» que forman esos apoyos (pendiente de tienda de campaña) y, por debajo de los hombros, cae casi recta hasta el pedestal
  const SUP = [[top.x, top.y, top.z, 0.1], [0.0, 3.3, 0.0, 0.2], [0.0, 2.95, 0.02, 0.17], [0.3, 2.86, 0.05, 0.11], [0.27, 2.5, 0.0, 0.13], [-0.27, 2.5, 0.0, 0.13], [-0.4, 2.0, 0.15, 0.1]];
  const SH = [-0.52, 1.45, 0.22, 0.46];   // el escudo: la tela pasa por encima (si no, asomaba el borde de oro)
  const reach = (y, a) => { const dx = Math.cos(a), dz = Math.sin(a); let r = 0.12; for (const [cx, cy, cz, rho] of SUP) { if (y > cy + rho) continue; const drop = Math.max(0, cy - y), h = (cx * dx + cz * dz) + rho + drop * (cy > 2.4 ? 0.42 : 0.2); r = Math.max(r, h); }
    r = Math.min(r, 0.66 + 0.05 * clamp((0.6 - y) / 0.6, 0, 1)); const sd = (SH[0] * dx + SH[2] * dz), sy = Math.abs(y - SH[1]); if (sy < SH[3] + 0.6) r = Math.max(r, sd + Math.sqrt(Math.max(0, SH[3] * SH[3] - Math.min(sy, SH[3]) ** 2)) * 0.95 + 0.05 + Math.max(0, SH[1] - y) * 0.15); return r; };
  const rest = [], R = rng(404);
  for (let j = 0; j < NV; j++) { const v = j / (NV - 1), y = 0.02 + v * (H - 0.02);
    for (let i = 0; i < NU; i++) { const a = i / NU * Math.PI * 2, hang = clamp((2.7 - y) / 2.7, 0, 1), f = (0.07 * Math.sin(a * 9 + v * 1.6) + 0.035 * Math.sin(a * 17 - v * 3.1)) * (0.25 + 0.75 * hang) + 0.012 * (R() - 0.5);
      const r = reach(y, a) + 0.04 + f; const p = _v(Math.cos(a) * r, y, Math.sin(a) * r * 0.9); rest.push(p); const k = (j * NU + i) * 3; pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z; uv[(j * NU + i) * 2] = i / NU; uv[(j * NU + i) * 2 + 1] = v; } }
  for (let j = 0; j < NV - 1; j++) for (let i = 0; i < NU; i++) { const a = j * NU + i, b = j * NU + (i + 1) % NU, c = (j + 1) * NU + i, d = (j + 1) * NU + (i + 1) % NU; idx.push(a, c, b, b, c, d); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.MeshPhysicalMaterial({ color: 0x8c0d1d, roughness: 0.62, sheen: 1, sheenColor: new THREE.Color(0xff7080), sheenRoughness: 0.45, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(geo, m); cloth.castShadow = true; cloth.receiveShadow = true; cloth.frustumCulled = false;   // se mueve lejos de donde nace: sin recorte
  // el montón final: en el suelo de la plaza, del lado del rey (coordenadas del grupo de la estatua: el suelo está a −ped)
  const d = pullDir.clone().setY(0).normalize(), side = _v(-d.z, 0, d.x), pile = [];
  for (let n = 0; n < rest.length; n++) { const p = rest[n], v = Math.floor(n / NU) / (NV - 1), a = (n % NU) / NU * Math.PI * 2;
    const rr = 0.35 + 0.75 * (1 - v) + 0.1 * Math.sin(a * 5 + v * 7), base = d.clone().multiplyScalar(2.3 + 0.55 * (1 - v));
    pile.push(base.add(side.clone().multiplyScalar(Math.cos(a) * rr * 0.9)).add(d.clone().multiplyScalar(Math.sin(a) * rr * 0.55)).setY(0.06 + 0.22 * Math.abs(Math.sin(a * 3 + v * 9)) * (0.4 + 0.6 * v))); }
  cloth.userData = { rest, pile, d, NU, NV, H };
  return cloth;
}
// p: 0 (tapada) → 1 (en el suelo). groundY: altura del suelo de la plaza en coordenadas del grupo (−altura del pedestal)
function veilAt(cloth, p, groundY) {
  const U = cloth.userData, P = cloth.geometry.attributes.position; if (U.lastP === p) return; U.lastP = p;
  const lift = sm5(clamp(p / 0.25, 0, 1)), slide = sm5(clamp((p - 0.05) / 0.5, 0, 1)), fall = clamp((p - 0.22) / 0.78, 0, 1);
  for (let n = 0; n < U.rest.length; n++) { const r = U.rest[n], q = U.pile[n], v = Math.floor(n / U.NU) / (U.NV - 1);
    // 1) el tirón: la tela se despega un poco y resbala hacia el rey (más arriba, más deprisa)
    const s = slide * (0.4 + 0.9 * v), x = r.x + U.d.x * s * 1.2, z = r.z + U.d.z * s * 1.2, y = r.y + lift * 0.12 * v;
    // 2) cae (como con gravedad) hasta el montón del suelo
    const f = Math.pow(clamp((fall - 0.15 * (1 - v)) / 0.85, 0, 1), 1.6), fy = groundY + q.y;
    P.setXYZ(n, lerp(x, q.x, sm5(f)), lerp(y, fy, f), lerp(z, q.z, sm5(f))); }
  P.needsUpdate = true; cloth.geometry.computeVertexNormals();
}
// ---- drones: puntos de luz en el cielo; formas «6.438» y una lupa, en un plano de cara a la cámara
let _dotTex = null; function dotTex() { if (_dotTex) return _dotTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _dotTex = new THREE.CanvasTexture(c); return _dotTex; }
// puntos de una forma dibujada en un lienzo (texto o dibujo), centrados y con ancho w (m)
function shapePoints(draw, n, w, seed) { const c = document.createElement('canvas'); c.width = 600; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 600, 300); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; draw(g);
  const d = g.getImageData(0, 0, 600, 300).data, on = s => { const o = []; for (let y = 0; y < 300; y += s) for (let x = (Math.round(y / s) % 2) * s * 0.5; x < 600; x += s) if (d[(Math.round(y) * 600 + Math.round(x)) * 4] > 128) o.push([x, y]); return o; };
  // rejilla regular (como en los espectáculos de drones de verdad): el paso más fino que no pasa de n puntos
  let s = 3, pts = on(s); while (pts.length > n && s < 40) { s += 0.25; pts = on(s); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const sc = w / Math.max(1, x1 - x0), R = rng(seed), out = pts.map(([x, y]) => [(x - (x0 + x1) / 2) * sc, -(y - (y0 + y1) / 2) * sc]);
  while (out.length < n) { const q = out[Math.floor(R() * pts.length)]; out.push([q[0] + (R() - 0.5) * 0.02, q[1] + (R() - 0.5) * 0.02]); }   // los que sobran, encima de otro
  return out; }
function droneSwarm(G, n, center) {   // n drones
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ map: dotTex(), size: 0.75, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; G.add(pts); const R = rng(808);
  // donde esperan: una nube suelta muy alta sobre la plaza
  const idle = Array.from({ length: n }, () => _v(center.x + (R() - 0.5) * 34, center.y + 6 + R() * 10, center.z + (R() - 0.5) * 34));
  const num = shapePoints(g => { g.font = '800 200px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('6.438', 300, 150); }, n, 12, 9);
  const lupa = shapePoints(g => { g.lineWidth = 30; g.beginPath(); g.arc(250, 130, 82, 0, Math.PI * 2); g.stroke(); g.lineWidth = 44; g.lineCap = 'round'; g.beginPath(); g.moveTo(312, 192); g.lineTo(400, 270); g.stroke(); }, n, 8, 10);
  pts.userData = { idle, num, lupa, center: center.clone(), n, ph: Array.from({ length: n }, () => R() * 6.28) };
  return pts;
}
// el plano de las formas mira a la cámara (dir: de las luces hacia la cámara, horizontal)
function swarmAt(pts, t, T0, T1, T2, facing) {
  const U = pts.userData, P = pts.geometry.attributes.position, C = pts.geometry.attributes.color; const right = _v(facing.z, 0, -facing.x).normalize(), up = _v(0, 1, 0);
  const a = sm5(clamp((t - T0) / 1.1, 0, 1)), b = sm5(clamp((t - T1) / 0.9, 0, 1)), off = sm5(clamp((t - T2) / 1.2, 0, 1));
  for (let i = 0; i < U.n; i++) { const id = U.idle[i], nm = U.num[i], lp = U.lupa[i];
    const pn = U.center.clone().addScaledVector(right, nm[0]).addScaledVector(up, nm[1]), pl = U.center.clone().addScaledVector(right, lp[0]).addScaledVector(up, lp[1]);
    const p = id.clone().lerp(pn, a).lerp(pl, b); p.y += Math.sin(t * 1.3 + U.ph[i]) * 0.06 + off * 18; P.setXYZ(i, p.x, p.y, p.z);
    const tw = 0.75 + 0.25 * Math.sin(t * 5 + U.ph[i] * 3), k = (0.35 + 0.65 * Math.max(a, b)) * tw * (1 - off);
    C.setXYZ(i, lerp(0.75, 1.0, b) * k * 1.6, lerp(0.85, 0.82, b) * k * 1.6, lerp(1.0, 0.45, b) * k * 1.6); }
  P.needsUpdate = true; C.needsUpdate = true;
}
