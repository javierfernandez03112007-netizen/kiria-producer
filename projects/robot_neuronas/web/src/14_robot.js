// ---------------------------------------------------------------- «El perro robot con neuronas humanas» (Cortical Labs, nov. 2026): piezas.
// Un perro robot camina sobre un mapa gigante; en el lomo lleva una cúpula de cristal con un chip de electrodos donde viven neuronas
// humanas (cuerpos que se encienden, dendritas que crecen y pulsos que viajan); Australia dibujada en el suelo; el cerebro de cristal
// con muchísimos puntos de luz; el panel del programa; la pantalla con el Pong y un pasillo de videojuego.
// El mapa (y el polvo) se repiten cada PER metros: el perro acaba PER metros más allá de donde empieza y el último fotograma es el primero.
const DOG = { y: 0.42, hipY: -0.04, hipX: 0.13, hipZ: 0.24, thigh: 0.2, shin: 0.21, footR: 0.03 };
const DOME = { y: 0.101, r: 0.12 };                                       // cúpula sobre el lomo (relativa al cuerpo)
const CHIP = { w: 0.15, t: 0.012 };                                       // chip dentro de la cúpula
const CHIP_Y = DOG.y + DOME.y + 0.012;                                    // altura del centro del chip (perro quieto)
const NN = 38;                                                            // neuronas en el chip (dibujo: «un puñado»)
const PER = 3.6;                                                          // periodo del mapa y del polvo (m)
const RTEAL = 0x2ee6c9, PINK = 0xff5fa8, GOLDC = 0xffc24a;
const MELB = [144.96, -37.81], AUS_S = 0.08;                             // Melbourne (lon, lat) y escala de Australia en el suelo (m por grado)
const _o = new THREE.Object3D();

// ---------------------------------------------------------------- el mapa del suelo: una baldosa de PER × PER con calles, manzanas, un parque y una plaza
function buildMap() {
  const PX = 4096, m2p = PX / PER;
  const T = canvasTex(PX, PX, (g, w, h) => {
    g.fillStyle = '#05080d'; g.fillRect(0, 0, w, h);
    const B = 0.9, road = 0.2;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x0 = (i * B + road / 2) * m2p, y0 = (j * B + road / 2) * m2p, s = (B - road) * m2p, id = i * 4 + j, hsh = hash(id * 7.31 + 1.7);
      if (id === 6) {                                                     // parque: césped oscuro con árboles (puntos)
        g.fillStyle = '#081512'; rr(g, x0, y0, s, s, 26); g.fill();
        for (let k = 0; k < 70; k++) { const px = x0 + 30 + hash(k * 3.1) * (s - 60), py = y0 + 30 + hash(k * 5.7) * (s - 60), r = 9 + hash(k * 1.3) * 14;
          g.fillStyle = 'rgba(46,230,201,.10)'; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(46,230,201,.18)'; g.lineWidth = 4; rr(g, x0, y0, s, s, 26); g.stroke();
        continue;
      }
      if (id === 9) {                                                     // plaza redonda
        g.fillStyle = '#0c131c'; rr(g, x0, y0, s, s, 18); g.fill();
        g.strokeStyle = 'rgba(160,200,230,.16)'; g.lineWidth = 5; g.beginPath(); g.arc(x0 + s / 2, y0 + s / 2, s * 0.32, 0, 7); g.stroke();
        g.beginPath(); g.arc(x0 + s / 2, y0 + s / 2, s * 0.08, 0, 7); g.stroke();
        continue;
      }
      // manzana: entera, partida en dos o en cuatro parcelas (edificios vistos desde arriba)
      const n = hsh > 0.66 ? 1 : hsh > 0.33 ? 2 : 4, gap = 12, cells = n === 1 ? [[0, 0, 1, 1]] : n === 2 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
      cells.forEach(([a, b, cw, ch], q) => {
        const bx = x0 + a * s + (a ? gap / 2 : 0), by = y0 + b * s + (b ? gap / 2 : 0), ww = cw * s - (cw < 1 ? gap / 2 : 0), hh = ch * s - (ch < 1 ? gap / 2 : 0);
        g.fillStyle = hash(id * 3.7 + q * 1.9) > 0.5 ? '#121e2c' : '#0e1823'; rr(g, bx, by, ww, hh, 12); g.fill();
        g.strokeStyle = 'rgba(46,230,201,.17)'; g.lineWidth = 3; rr(g, bx, by, ww, hh, 12); g.stroke();
      });
    }
    // rejilla fina (cada 10 cm) y líneas de las calles (discontinuas)
    g.strokeStyle = 'rgba(160,200,230,.06)'; g.lineWidth = 2;
    for (let k = 0; k <= 36; k++) { const p = k / 36 * w; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.strokeStyle = 'rgba(238,242,246,.15)'; g.lineWidth = 4; g.setLineDash([40, 50]);
    for (let k = 0; k <= 4; k++) { const p = k * 0.9 * m2p; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.setLineDash([]);
  });
  T.wrapS = T.wrapT = THREE.RepeatWrapping; T.anisotropy = 16;
  const SZ = 30; T.repeat.set(SZ / PER, SZ / PER); T.offset.set(-((SZ / 2 / PER) % 1), -((SZ / 2 / PER) % 1));     // las calles caen en x = 0 y z = 0
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), new THREE.MeshStandardMaterial({ map: T, roughness: 0.5, metalness: 0.2, color: 0xdde6ee }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m); S.map = m;
  // el objetivo: anillo rojo + cruz + resplandor (se enciende al llegar)
  const tg = new THREE.Group(), rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4d61).multiplyScalar(1.5), transparent: true, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.232, 64), rm); ring.rotation.x = -Math.PI / 2; tg.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.095, 48), rm); ring2.rotation.x = -Math.PI / 2; tg.add(ring2);
  for (const a of [0, Math.PI / 2]) for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.014), rm); b.rotation.set(-Math.PI / 2, 0, a); b.position.set(a ? 0 : s * 0.16, 0.001, a ? s * 0.16 : 0); tg.add(b); }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 48), new THREE.MeshBasicMaterial({ color: 0xff4d61, map: starTex0(), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; tg.add(glow);
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.245, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4d61).multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  wave.rotation.x = -Math.PI / 2; wave.position.y = 0.003; tg.add(wave);
  tg.position.y = 0.004; tg.traverse(o => { o.renderOrder = 4; }); scene.add(tg); tg.visible = false; S.target = { g: tg, rm, glow, wave };
}
// la ruta (línea discontinua que se dibuja a medida que anda): los puntos por los que pasa el perro entre «izquierda» y la llegada
function buildRoute() {
  const pts = []; for (let t = TT.z1a - 0.1; t <= TT.fb + 0.05; t += 0.02) { const p = dogPose(t); pts.push(v3(p.x, 0.007, p.z)); }
  S.routeT = []; for (let t = TT.z1a - 0.1; t <= TT.fb + 0.05; t += 0.02) S.routeT.push(t);
  S.route = drawLine(pts, RTEAL, 3.2, 0.95); S.route.material.dashed = true; S.route.material.dashSize = 0.05; S.route.material.gapSize = 0.035; S.route.computeLineDistances();
  S.route.material.needsUpdate = true; scene.add(S.route); S.route.visible = false;
}

// ---------------------------------------------------------------- Australia dibujada en el suelo (contorno real, Natural Earth) con Melbourne donde está el perro
async function buildAus() {
  const cs = await loadTopo('../../../engine/geo/countries-50m.json'), au = cs.find(c => c.name === 'Australia');
  const cosL = Math.cos(27 * Math.PI / 180), P = ([lo, la]) => v3((la - MELB[1]) * AUS_S, 0.012, (lo - MELB[0]) * cosL * AUS_S);
  const rings = au.rings.filter(r => r.length > 24).sort((a, b) => b.length - a.length);
  S.aus = rings.map((r, i) => { const pts = []; let last = null; for (const q of r) { const p = P(q); if (!last || p.distanceTo(last) > 0.008) { pts.push(p); last = p; } }
    const l = drawLine(pts, RTEAL, i ? 2.4 : 3.4, 1); l.visible = false; scene.add(l); return l; });
}

// ---------------------------------------------------------------- el perro robot (piezas de plástico y metal; patas con cadera y rodilla)
function buildDog() {
  const dog = new THREE.Group(), body = new THREE.Group(); dog.add(body); body.position.y = DOG.y;
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xe9edf2, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x1a1d23, roughness: 0.4, metalness: 0.5, clearcoat: 0.6 });
  const steel = metal(0x9aa3ad, 0.3);
  const torso = rbox(0.3, 0.18, 0.64, shell, 0.07); body.add(torso);
  const belly = rbox(0.24, 0.05, 0.5, dark, 0.02); belly.position.y = -0.1; body.add(belly);
  for (const sd of [-1, 1]) { const st = rbox(0.012, 0.06, 0.4, dark, 0.005); st.position.set(sd * 0.152, 0.0, 0); body.add(st); }
  // franjas de luz en los costados (se encienden con la actividad)
  const stripM = new THREE.MeshBasicMaterial({ color: new THREE.Color(PINK).multiplyScalar(1.6), transparent: true, opacity: 0.0, toneMapped: false });
  for (const sd of [-1, 1]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.008), stripM); s.rotation.y = sd * Math.PI / 2; s.position.set(sd * 0.1595, 0.03, 0); body.add(s); }
  // cabeza con visor y ojos
  const head = new THREE.Group(); head.position.set(0, 0.06, 0.36); body.add(head);
  const hs = rbox(0.2, 0.15, 0.2, shell, 0.05); hs.position.z = 0.04; head.add(hs);
  const visor = rbox(0.17, 0.07, 0.03, new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.6, clearcoat: 1 }), 0.02); visor.position.set(0, 0.0, 0.14); head.add(visor);
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(RTEAL).multiplyScalar(2.2), toneMapped: false });
  const eyes = [-0.045, 0.045].map(x => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.025, 4, 10), eyeM); e.rotation.z = Math.PI / 2; e.position.set(x, 0.0, 0.158); head.add(e); return e; });
  const neck = cyl(0.04, 0.05, 0.08, dark, 20); neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.04, 0.3); body.add(neck);
  // patas: cadera → muslo → rodilla → espinilla → pie (las rodillas quedan detrás, como en los perros robot de verdad)
  const legs = [];
  for (const [sx, sz, id] of [[-1, 1, 'FL'], [1, 1, 'FR'], [-1, -1, 'BL'], [1, -1, 'BR']]) {
    const hip = new THREE.Group(); hip.position.set(sx * DOG.hipX, DOG.hipY, sz * DOG.hipZ); body.add(hip);
    const hj = sph(0.045, dark, 20, 14); hip.add(hj);
    const motorM = new THREE.MeshStandardMaterial({ color: 0x15171c, emissive: 0xffb547, emissiveIntensity: 0, roughness: 0.5 });
    const hm = cyl(0.05, 0.05, 0.03, motorM, 24); hm.rotation.z = Math.PI / 2; hm.position.x = sx * 0.03; hip.add(hm);
    const th = cyl(0.032, 0.026, DOG.thigh, shell, 16); th.position.y = -DOG.thigh / 2; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -DOG.thigh; hip.add(knee);
    const kj = sph(0.032, dark, 16, 12); knee.add(kj);
    const km = cyl(0.036, 0.036, 0.024, motorM, 20); km.rotation.z = Math.PI / 2; km.position.x = sx * 0.02; knee.add(km);
    const sh = cyl(0.022, 0.016, DOG.shin, steel, 14); sh.position.y = -DOG.shin / 2; knee.add(sh);
    const foot = sph(DOG.footR, new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.85 }), 16, 12); foot.position.y = -DOG.shin; knee.add(foot);
    legs.push({ hip, knee, sx, sz, id, motorM, hm, km, foot });
  }
  // la cúpula de cristal con el chip (y una luz rosa dentro: la de las neuronas)
  const dome = new THREE.Group(); dome.position.y = DOME.y; body.add(dome);
  const ringB = cyl(DOME.r + 0.012, DOME.r + 0.016, 0.02, steel, 48); dome.add(ringB);
  const cap = new THREE.Group(); dome.add(cap);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(DOME.r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9fb0c0, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.0 }));
  glass.position.y = 0.01; glass.renderOrder = 8; cap.add(glass);
  const chip = buildChip(); chip.position.y = 0.012; dome.add(chip);
  const domeL = new THREE.PointLight(PINK, 0, 0.75, 2); domeL.position.y = 0.06; dome.add(domeL);
  dog.traverse(o => { if (o.isMesh && o !== glass) o.castShadow = true; });
  scene.add(dog);
  S.dog = { dog, body, head, legs, dome, cap, glass, chip, eyes, eyeM, domeL, stripM, shell };
}

// ---------------------------------------------------------------- el chip: placa, rejilla de electrodos dorados, pocillo con el medio de cultivo,
// neuronas (cuerpos + dendritas) y pulsos
function buildChip() {
  const g = new THREE.Group();
  const pcb = rbox(CHIP.w, CHIP.w, CHIP.t, new THREE.MeshPhysicalMaterial({ color: 0x0f3a2c, roughness: 0.45, metalness: 0.2, clearcoat: 0.8 }), 0.004);
  pcb.rotation.x = -Math.PI / 2; g.add(pcb);
  // pistas de cobre (del borde a la rejilla) y contactos
  const tr = canvasTex(512, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(214,170,90,.6)'; c.lineWidth = 3;
    for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, r0 = 150, r1 = 236, ca = Math.cos(a), sa = Math.sin(a);
      c.beginPath(); c.moveTo(w / 2 + ca * r0, h / 2 + sa * r0); c.lineTo(w / 2 + ca * (r0 + 40), h / 2 + sa * (r0 + 40));
      const m = Math.max(Math.abs(ca), Math.abs(sa)); c.lineTo(w / 2 + ca / m * r1, h / 2 + sa / m * r1); c.stroke(); }
    c.fillStyle = 'rgba(214,170,90,.75)'; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, ca = Math.cos(a), sa = Math.sin(a), m = Math.max(Math.abs(ca), Math.abs(sa)); c.fillRect(w / 2 + ca / m * 236 - 7, h / 2 + sa / m * 236 - 7, 14, 14); } });
  const trM = new THREE.Mesh(new THREE.PlaneGeometry(CHIP.w * 0.98, CHIP.w * 0.98), new THREE.MeshBasicMaterial({ map: tr, transparent: true, depthWrite: false, toneMapped: false }));
  trM.rotation.x = -Math.PI / 2; trM.position.y = CHIP.t / 2 + 0.0004; g.add(trM);
  // rejilla de electrodos (10 × 10) y su brillo (azul = el chip estimula)
  const EN = 10, es = 0.0095, eg = new THREE.BoxGeometry(0.0048, 0.0012, 0.0048);
  const eM = new THREE.MeshStandardMaterial({ color: 0xd9b25c, metalness: 1, roughness: 0.25 });
  const el = new THREE.InstancedMesh(eg, eM, EN * EN); let k = 0; const ePos = [];
  for (let i = 0; i < EN; i++) for (let j = 0; j < EN; j++) { const x = (i - (EN - 1) / 2) * es, z = (j - (EN - 1) / 2) * es; _o.position.set(x, CHIP.t / 2 + 0.0006, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); el.setMatrixAt(k++, _o.matrix); ePos.push(v3(x, CHIP.t / 2 + 0.0013, z)); }
  g.add(el);
  const padG = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.011, 0.011), new THREE.MeshBasicMaterial({ color: 0xffffff, map: starTex0(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), EN * EN);
  for (let i = 0; i < EN * EN; i++) { _o.position.copy(ePos[i]); _o.position.y += 0.0003; _o.rotation.set(-Math.PI / 2, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); padG.setMatrixAt(i, _o.matrix); padG.setColorAt(i, new THREE.Color(0, 0, 0)); }
  padG.renderOrder = 6; padG.frustumCulled = false; g.add(padG);
  // pocillo de cristal con el medio de cultivo (rosa, como el de los laboratorios)
  const well = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.014, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 }));
  well.position.y = CHIP.t / 2 + 0.007; well.renderOrder = 7; g.add(well);
  const wellRim = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.0012, 8, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.5, clearcoat: 1 }));
  wellRim.rotation.x = Math.PI / 2; wellRim.position.y = CHIP.t / 2 + 0.014; g.add(wellRim);
  const med = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.006, 64), new THREE.MeshStandardMaterial({ color: 0xff5f9a, roughness: 0.45, transparent: true, opacity: 0.08, depthWrite: false, emissive: 0xff5fa8, emissiveIntensity: 0.03 }));
  med.position.y = CHIP.t / 2 + 0.0035; med.renderOrder = 7; g.add(med);
  // neuronas: cuerpos (esferas que brillan) y dendritas (tubos finos que crecen) entre vecinas
  const top = CHIP.t / 2 + 0.003, cells = [];
  for (let i = 0; i < NN; i++) { const a = hash(i * 9.13) * 6.283, r = Math.sqrt(hash(i * 4.71)) * 0.052; cells.push(v3(Math.cos(a) * r, top + hash(i * 2.3) * 0.002, Math.sin(a) * r)); }
  const somaM = cells.map(() => new THREE.MeshStandardMaterial({ color: 0x2a1022, emissive: PINK, emissiveIntensity: 0.6, roughness: 0.4 }));
  const somas = cells.map((p, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0032 + hash(i * 5.5) * 0.0018, 14, 10), somaM[i]); s.position.copy(p); s.userData.r = 0.0032 + hash(i * 5.5) * 0.0018; g.add(s); return s; });
  const dendM = new THREE.MeshStandardMaterial({ color: 0x1b0f1a, emissive: 0xc06cff, emissiveIntensity: 0.9, roughness: 0.6 });
  const dends = [];
  for (let i = 0; i < NN; i++) {
    const near = cells.map((p, j) => [j, p.distanceTo(cells[i])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2 + Math.floor(hash(i * 1.7) * 2));
    for (const [j] of near) { if (dends.some(d => (d.a === j && d.b === i) || (d.a === i && d.b === j))) continue;
      const A = cells[i], B = cells[j], M2 = A.clone().lerp(B, 0.5).add(v3((hash(i * 3 + j) - 0.5) * 0.012, 0.003, (hash(i + j * 3) - 0.5) * 0.012));
      const curve = new THREE.CatmullRomCurve3([A, M2, B]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0006, 5, false), dendM); g.add(tube);
      dends.push({ a: i, b: j, curve, tube, n: tube.geometry.index.count, seg: 6 * 5 }); }
  }
  // pulsos que viajan por las dendritas
  const PN = 90, pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0017, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd6f0).multiplyScalar(2.6), toneMapped: false }), PN);
  pulses.frustumCulled = false; g.add(pulses);
  // anillos de estímulo (los dispara el chip)
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ab0ff).multiplyScalar(2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const stimE = [12, 27, 34, 45, 53, 61, 66, 72, 87];
  const rings = stimE.map(e => { const m = new THREE.Mesh(new THREE.RingGeometry(0.0035, 0.005, 32), ringM.clone()); m.rotation.x = -Math.PI / 2; m.position.copy(ePos[e]); m.position.y += 0.0005; m.renderOrder = 6; g.add(m); return m; });
  g.userData = { cells, somas, somaM, dends, pulses, PN, eM, padG, rings, stimE, ePos, dendM, med, well };
  return g;
}

// ---------------------------------------------------------------- el cerebro (holograma): dos hemisferios con circunvoluciones que brillan en los surcos y el
// borde, y muchísimos puntos de luz dentro
const BRAIN_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aP; varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){ vP = aP; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const BRAIN_FS = `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 col; uniform float op, lit; varying vec3 vP; varying vec3 vN; varying vec3 vV;
float nz(vec3 v){ return sin(v.x * 11. + sin(v.y * 7.) * 2.) * sin(v.y * 13. + sin(v.z * 9.) * 2.) * sin(v.z * 12. + sin(v.x * 8.) * 2.); }
void main(){
  #include <logdepthbuf_fragment>
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.4);
  float n = nz(vP), w = fwidth(n) * 1.4 + 0.015, fold = 1. - smoothstep(0., w, abs(n));
  float a = op * (0.05 + 0.85 * f + 0.6 * fold * (0.45 + 0.55 * lit));
  gl_FragColor = vec4(col * a, a);
}`;
const bnz = v => Math.sin(v.x * 11 + Math.sin(v.y * 7) * 2) * Math.sin(v.y * 13 + Math.sin(v.z * 9) * 2) * Math.sin(v.z * 12 + Math.sin(v.x * 8) * 2);
function buildBrain() {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);      // eje largo a lo largo de z (se orienta hacia la cámara)
  const geo = new THREE.SphereGeometry(1, 160, 110), p = geo.attributes.position, v = new THREE.Vector3(), aP = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); aP[i * 3] = v.x; aP[i * 3 + 1] = v.y; aP[i * 3 + 2] = v.z;
    v.multiplyScalar(1 + 0.055 * bnz(v)); if (v.x < 0) v.x *= 0.3; v.x *= 0.6; v.y *= 0.56; if (v.y < -0.22) v.y = -0.22 + (v.y + 0.22) * 0.6; p.setXYZ(i, v.x, v.y, v.z); }
  geo.setAttribute('aP', new THREE.BufferAttribute(aP, 3)); geo.computeVertexNormals();
  const gm = new THREE.ShaderMaterial({ vertexShader: BRAIN_VS, fragmentShader: BRAIN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color(0xff7fbf).multiplyScalar(1.15) }, op: { value: 0 }, lit: { value: 0 } } });
  for (const sd of [-1, 1]) { const h = new THREE.Mesh(geo, gm); h.position.x = sd * 0.2; h.scale.x = sd; h.renderOrder = 7; inner.add(h); }      // cara medial plana, una frente a la otra
  // puntos (26.000: la idea de «muchísimos», no son 86.000 millones)
  const N = 26000, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { let x, y, z, k = 0; do { x = hash(i * 1.31 + k) * 2 - 1; y = hash(i * 2.17 + k) * 2 - 1; z = hash(i * 3.71 + k) * 2 - 1; k += 0.37; } while (x * x + y * y + z * z > 0.9);
    const sd = x >= 0 ? 1 : -1; pos[i * 3] = sd * (0.21 + Math.abs(x) * 0.52); pos[i * 3 + 1] = Math.max(-0.2, y * 0.5); pos[i * 3 + 2] = z * 0.93; }
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: new THREE.Color(0xff8fc8).multiplyScalar(1.5), size: 0.02, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, map: starTex0() }));
  pts.frustumCulled = false; inner.add(pts);
  scene.add(g); g.visible = false; S.brain = { g, gm, pts, N };
}

// ---------------------------------------------------------------- la pantalla flotante (pregunta, Pong y un pasillo de videojuego) y el panel del programa
function buildScreen() {
  const g = new THREE.Group(), T = canvasTex(640, 400);
  g.add(rbox(0.56, 0.37, 0.02, new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.6, metalness: 0.4 }), 0.02));
  const scr = new THREE.Mesh(rplane(0.52, 0.325, 0.012), new THREE.MeshBasicMaterial({ map: T, toneMapped: false })); scr.position.z = 0.0105; g.add(scr);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.43), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd0ff).multiplyScalar(0.25), map: starTex0(), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  back.position.z = -0.02; back.scale.setScalar(1.6); g.add(back);
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  scene.add(g); g.visible = false; S.screen = { g, T, back };
  const P = canvasTex(560, 600), panel = new THREE.Mesh(rplane(0.3, 0.32, 0.016), new THREE.MeshBasicMaterial({ map: P, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  panel.renderOrder = 9; scene.add(panel); panel.visible = false; S.code = { panel, P };
}
function rplane(w, h, r, seg = 10) { const geo = new THREE.ShapeGeometry(rrShape(w, h, r), seg); const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return geo; }

// ---------------------------------------------------------------- polvo en suspensión que se repite cada PER metros (así el bucle es exacto)
function buildDust() {
  const M = 260, tiles = [];
  for (let i = -3; i <= 4; i++) for (let j = -3; j <= 3; j++) tiles.push([i, j]);
  const gen = (q, hmax) => { const ti = tiles[Math.floor(q / M)], k = q % M; return [ti[0] * PER + hash(k * 3.1 + hmax) * PER, 0.03 + Math.pow(hash(k * 5.7 + hmax), 1.3) * hmax, ti[1] * PER + hash(k * 8.3 + hmax) * PER]; };
  S.flow = [flowCloud(M * tiles.length, q => gen(q, 2.2), { size: 1.5, bright: 0.55, farF: 0.06, nearF: 0.18, drift: 0, seed: 2, col: 0xd8e6ff, seedOf: q => q % M })];
}
