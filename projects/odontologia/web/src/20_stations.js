// ---------------------------------------------------------------- la plaza de la odontología: la facultad en corte (cinco pisos = cinco años), la clínica con su cartel (y el
// «ESPECIALISTA» que se cae), el ortodoncista (con la interrogación, el máster, las estrellas y la placa de «especialista oficial» tachada) y las
// seis solicitudes de especialidad que Sanidad rechazó (sellos rojos)
function canvasPlane(w, h, px, draw, opts = {}) {
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
const PS = {};
function giant(o, s) { o.scale.setScalar(s); o.userData.s0 = s; o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; }
function label3(txt, w, h, fg, bg, size = 0.62) { const p = plateText(w, h, [[txt, size, 0.53]], { fg, bg, weight: 900 }); p.material.side = THREE.DoubleSide; return p; }
// la facultad: caja sin fachada con cinco pisos; en cada uno, lo que se estudia
const FL = { y0: 0.5, h: 0.5, w: 3.3, d: 1.25 };
function buildFaculty() {
  const F = new THREE.Group(); F.position.set(0, 0, AV.PZ1 + 0.02); scene.add(F); PS.fac = F;
  const wallM = flatM(0xf1e6d3, 0.85), slabM = flatM(0xe4dccd, 0.8), trimM = flatM(0x2f3a4a, 0.6);
  const H = FL.y0 + 5 * FL.h, W2 = FL.w;
  const back = new THREE.Mesh(new THREE.BoxGeometry(W2, H, 0.08), wallM); back.position.set(0, H / 2, -FL.d); F.add(back);
  for (const sd of [-1, 1]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.12, H + 0.06, FL.d + 0.1), flatM(0xd8c7ab, 0.85)); sw.position.set(sd * (W2 / 2 + 0.06), (H + 0.06) / 2, -FL.d / 2); F.add(sw); }
  for (let i = 0; i <= 5; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(W2 + 0.24, 0.05, FL.d + 0.12), i === 5 ? trimM : slabM); sl.position.set(0, FL.y0 + i * FL.h, -FL.d / 2 + 0.03); F.add(sl); }
  const ground = new THREE.Mesh(new THREE.BoxGeometry(W2, FL.y0, 0.1), flatM(0xd9cbb3, 0.6)); ground.position.set(0, FL.y0 / 2, -0.08); F.add(ground);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.36, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x9fc6dd, roughness: 0.08, metalness: 0.2, clearcoat: 1 })); door.position.set(0, 0.18, -0.02); F.add(door);
  const ground2 = label3('ENTRADA', 0.5, 0.08, '#1f4e79', '#ffffff', 0.6); ground2.position.set(0, 0.42, 0.0); F.add(ground2);
  const sign = label3('FACULTAD DE ODONTOLOGÍA', 2.6, 0.24, '#ffffff', '#1f4e79', 0.5); sign.position.set(0, H + 0.2, 0.02); F.add(sign);
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 0.05), trimM); signBack.position.set(0, H + 0.2, -0.02); F.add(signBack);
  PS.floors = [];
  const TOP = ['ANATOMÍA', 'MATERIALES', 'PRÓTESIS', 'CIRUGÍA', 'PACIENTES'], COL = [0xe8d6f0, 0xd6e8f2, 0xf2dfd0, 0xd9f0dc, 0xf3ecc9];
  for (let i = 0; i < 5; i++) { const y = FL.y0 + i * FL.h + 0.025, G = new THREE.Group(); G.position.set(0, y, -FL.d / 2); F.add(G);
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(W2 - 0.02, FL.h - 0.05), new THREE.MeshStandardMaterial({ color: COL[i], roughness: 0.9 })); bw.position.set(0, FL.h / 2, -FL.d / 2 + 0.05); G.add(bw);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(W2 * 0.7, 0.012, 0.08), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff4dc, emissiveIntensity: 0 })); lamp.position.set(0, FL.h - 0.04, -0.1); G.add(lamp);
    const tag = label3(`${i + 1}.º AÑO · ${TOP[i]}`, 1.5, 0.12, '#ffffff', '#1f4e79', 0.62); tag.position.set(0, FL.h - 0.075, FL.d / 2 + 0.035); G.add(tag);
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(W2, 0.09), new THREE.MeshPhysicalMaterial({ color: 0xcfe8f5, roughness: 0.05, transparent: true, opacity: 0.25, side: THREE.DoubleSide })); rail.position.set(0, 0.045, FL.d / 2 + 0.02); G.add(rail);
    const P2 = new THREE.Group(); P2.scale.setScalar(1.7); P2.position.z = 0.32; G.add(P2); PS.floors.push({ G, lamp, P: P2, tag, bw }); }
  // 1.º anatomía: calaveras y una mandíbula
  { const P2 = PS.floors[0].P; for (const [x, s] of [[-0.35, 0.95], [0.35, 0.95], [0, 1.25]]) { const sk = skull(1); sk.scale.setScalar(s); sk.position.set(x, 0.07, 0.05); sk.rotation.y = -x * 0.8; P2.add(sk);
      const st = cyl(0.04, 0.05, 0.07, flatM(0x3a3f47), 16); st.position.set(x, 0.035, 0.05); P2.add(st); } }
  // 2.º materiales: modelos de escayola, cubetas y jeringas de resina
  { const P2 = PS.floors[1].P; const plaster = flatM(0xf6f1e7, 0.9); const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.5), flatM(0x8a6a4a, 0.6)); table.position.set(0, 0.16, 0.05); P2.add(table);
    for (const sd of [-1, 1]) for (const z of [-0.18, 0.28]) { const l = cyl(0.015, 0.015, 0.16, flatM(0x3a3f47), 6); l.position.set(sd * 0.7, 0.08, z - 0.05 + 0.05); P2.add(l); }
    for (let i = 0; i < 4; i++) { const cast = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 8, 20, Math.PI * 1.2), plaster); cast.rotation.set(-Math.PI / 2, 0, Math.PI * 0.4 + 0.0); cast.position.set(-0.55 + i * 0.36, 0.2, 0.05); P2.add(cast);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), plaster); base.position.set(-0.55 + i * 0.36, 0.185, 0.03); base.scale.z = 0.8; P2.add(base); }
    for (let i = 0; i < 3; i++) { const sy = cyl(0.012, 0.012, 0.12, plastic([0x2ec4b6, 0xffffff, 0xff9f1c][i], 0.3), 10); sy.rotation.z = Math.PI / 2; sy.position.set(0.25 + i * 0.12, 0.19, 0.22); P2.add(sy); } }
  // 3.º prótesis: dentaduras (copias pequeñas de la arcada gigante) sobre un expositor
  { const P2 = PS.floors[2].P; for (const [x, up] of [[-0.45, 0], [0.45, 0], [0, 1]]) { const c = S.lower.clone(true); c.traverse(o => { if (o.isMesh && o.material && o.material.metalness === 1) o.visible = false; if (o.geometry && o.geometry.type === 'TorusGeometry') o.visible = false; });
      c.scale.setScalar(0.17); c.position.set(x, 0.1 + up * 0.04, 0.08 - up * 0.1); c.rotation.y = x * 0.6; P2.add(c); }
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.45), flatM(0x3a3f47, 0.5)); stand.position.set(0, 0.03, 0.05); P2.add(stand); }
  // 4.º cirugía: bandeja con fórceps, bisturí y jeringa; lámpara de quirófano y un cirujano
  { const P2 = PS.floors[3].P; const steel = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.2 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.22), steel); tray.position.set(-0.12, 0.2, 0.08); P2.add(tray); const leg = cyl(0.015, 0.015, 0.19, steel, 8); leg.position.set(-0.12, 0.095, 0.08); P2.add(leg);
    for (const sd of [-1, 1]) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 18, 1.4), steel); f.rotation.set(-Math.PI / 2, 0, sd * 0.3 + 1.2); f.position.set(-0.22, 0.215, 0.08 + sd * 0.012); P2.add(f); }
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.02), steel); blade.position.set(-0.08, 0.215, 0.03); P2.add(blade);
    const syr = cyl(0.016, 0.016, 0.16, plastic(0xf2f6fa, 0.2), 12); syr.rotation.z = Math.PI / 2; syr.position.set(-0.02, 0.225, 0.14); P2.add(syr);
    const doc = medFig('scrubs', 1.05); doc.position.set(0.24, 0, -0.05); doc.rotation.y = -0.5; P2.add(doc); PS.surgeon = doc;
    const lampG = new THREE.Group(); const disc = cyl(0.14, 0.12, 0.04, flatM(0xe9edf0, 0.4), 24); lampG.add(disc); const glow = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.9).multiplyScalar(2.2), toneMapped: false }));
    glow.rotation.x = Math.PI / 2; glow.position.y = -0.022; lampG.add(glow); lampG.position.set(-0.15, FL.h - 0.1, 0.05); P2.add(lampG); }
  // 5.º pacientes: sillón dental con su lámpara, un paciente y la dentista
  { const P2 = PS.floors[4].P; const chairM = plastic(0x2a9d8f, 0.35), base = flatM(0xe9edf0, 0.4);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.3), chairM); seat.position.set(0, 0.15, 0.05); P2.add(seat);
    const backr = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.32), chairM); backr.position.set(0, 0.22, -0.22); backr.rotation.x = 0.85; P2.add(backr);
    const legr = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.22), chairM); legr.position.set(0, 0.12, 0.28); legr.rotation.x = -0.35; P2.add(legr);
    const col = cyl(0.04, 0.06, 0.13, base, 16); col.position.set(0, 0.065, 0.02); P2.add(col);
    const pat = figurine(plastic(0x5d8db4, 0.45), 0.95); pat.rotation.x = -1.05; pat.position.set(0, 0.2, -0.12); P2.add(pat);
    const den = medFig('coat', 1.05); den.position.set(0.22, 0, 0.02); den.rotation.y = -1.2; P2.add(den); PS.dentist5 = den;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.3), base); arm.position.set(-0.15, FL.h - 0.12, -0.05); P2.add(arm);
    const lmp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.07), base); lmp.position.set(-0.08, FL.h - 0.16, 0.1); P2.add(lmp);
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.88).multiplyScalar(2.0), toneMapped: false })); lg.rotation.x = Math.PI / 2; lg.position.set(-0.08, FL.h - 0.182, 0.1); P2.add(lg); }
  F.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
function buildPlazaSet() {
  buildFaculty();
  // la clínica: banderola perpendicular a la fachada con «CLÍNICA DENTAL · ORTODONCIA» y debajo el panel «ESPECIALISTA» que se cae
  { const b = S.clinicB, G = new THREE.Group(); G.position.set(-0.25, GH + 0.62, 0.3); b.g.add(G); PS.sign = G;
    const tex = canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f78b4'; g.fillRect(0, 0, w, 120); g.fillStyle = '#fff'; g.font = '900 64px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CLÍNICA DENTAL', w / 2, 62);
      g.fillStyle = '#1b1e24'; g.font = '900 76px Inter'; g.fillText('ORTODONCIA', w / 2, 200); g.fillStyle = '#1f78b4'; g.beginPath(); g.arc(w / 2, 280, 12, 0, 7); g.fill(); });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.55), [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), flatM(0x1f78b4), flatM(0x1f78b4), flatM(0xffffff), flatM(0xffffff)]);
    // la cara con el texto mira a lo largo de la avenida: se gira la caja para que sus caras ±z queden perpendiculares a la fachada
    G.add(box);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.62), flatM(0x2b3038, 0.5)); arm.position.set(0, 0.19, -0.02); G.add(arm);
    const tex2 = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#ffc24a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1e24'; g.font = '900 70px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ESPECIALISTA', w / 2, h / 2 + 4); });
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.55), [new THREE.MeshStandardMaterial({ map: tex2, roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: tex2, roughness: 0.4 }), flatM(0xffc24a), flatM(0xffc24a), flatM(0xffc24a), flatM(0xffc24a)]);
    const spG = new THREE.Group(); spG.add(sp); spG.position.set(0, -0.25, 0); G.add(spG); PS.spec = spG;
    for (const sd of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.07, 4), flatM(0x666666)); ch.position.set(sd * 0.0, -0.19, sd * 0.2); G.add(ch); PS['chain' + sd] = ch; }
    G.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  // el ortodoncista, en la puerta de la clínica
  { const b = S.clinicB; b.g.updateMatrixWorld(true); const pos = v3(0.15, 0, 0.42).applyMatrix4(b.g.matrixWorld);
    PS.hero = medFig('coat', 1.12); PS.hero.position.set(pos.x, 0.02, pos.z); PS.hero.rotation.y = -Math.PI / 2 + 0.55; scene.add(PS.hero); PS.hero.traverse(o => { if (o.isMesh) o.castShadow = true; });
    PS.qm = qmark(plastic(0xff2d2d, 0.25)); PS.qm.scale.setScalar(0.2); PS.qm.userData.s0 = 0.2; PS.qm.position.set(pos.x, 0.33, pos.z); scene.add(PS.qm);
    PS.diploma = new THREE.Group(); const fr = rbox(0.3, 0.22, 0.02, flatM(0x5a3a1a, 0.5), 0.01); PS.diploma.add(fr);
    const dt = canvasPlane(0.27, 0.19, 512, (g, w, h) => { g.fillStyle = '#fbf6e8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a227'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#1b2a4a'; g.textAlign = 'center';
      g.font = '900 54px Inter'; g.fillText('MÁSTER', w / 2, 92); g.font = '700 32px Inter'; g.fillText('EN ORTODONCIA', w / 2, 140); g.fillStyle = '#7a6a4a'; g.font = '600 24px Inter'; g.fillText('TÍTULO PROPIO · EJEMPLO', w / 2, 200);
      g.fillStyle = '#c9a227'; g.beginPath(); g.arc(w - 70, h - 70, 30, 0, 7); g.fill(); });
    dt.position.z = 0.012; PS.diploma.add(dt); PS.diploma.position.set(pos.x - 0.3, 0.3, pos.z + 0.12); scene.add(PS.diploma);
    PS.stars = []; for (let i = 0; i < 5; i++) { const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 - Math.PI / 2, r = k % 2 ? 0.016 : 0.04; k ? sh.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
      const st = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.6, roughness: 0.25, emissive: 0x553300 }));
      st.castShadow = true; scene.add(st); PS.stars.push(st); }
    PS.badge = new THREE.Group(); const bd = rbox(0.34, 0.12, 0.02, flatM(0x1f4e79, 0.4), 0.02); PS.badge.add(bd); const bt = label3('ESPECIALISTA OFICIAL', 0.32, 0.1, '#ffffff', null, 0.42); bt.position.z = 0.012; PS.badge.add(bt);
    PS.badgeX = []; for (const sd of [-1, 1]) { const x = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.022, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.12, 0.1).multiplyScalar(1.6), toneMapped: false })); x.rotation.z = sd * 0.32; x.position.z = 0.02; PS.badge.add(x); PS.badgeX.push(x); }
    PS.badge.position.set(pos.x - 0.05, 0.42, pos.z + 0.08); scene.add(PS.badge); PS.heroPos = pos; }
  // las seis solicitudes de especialidad (julio de 2026), en fila delante de la dentadura
  { const names = ['PERIODONCIA', 'CIRUGÍA BUCAL', 'ODONTOPEDIATRÍA', 'ORTODONCIA', 'PRÓTESIS', 'ENDODONCIA']; PS.folders = names.map((n, i) => { const g = new THREE.Group();
      const body = rbox(0.42, 0.56, 0.05, flatM(i === 3 ? 0xffe9a8 : 0xf3e7c9, 0.7), 0.02); body.position.y = 0.3; g.add(body);
      const tx = canvasPlane(0.4, 0.54, 512, (c, w, h) => { c.fillStyle = i === 3 ? '#ffe9a8' : '#f3e7c9'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2a4a'; c.font = '700 34px Inter'; c.textAlign = 'center'; c.fillText('SOLICITUD DE', w / 2, 70); c.fillText('ESPECIALIDAD', w / 2, 112);
        c.font = `900 ${n.length > 12 ? 44 : 54}px Inter`; c.fillStyle = i === 3 ? '#b3222b' : '#1b1e24'; c.fillText(n, w / 2, 250); textLines(c, 50, 320, w - 100, 7, 30, 'rgba(40,36,30,.35)', i + 1); });
      tx.position.set(0, 0.3, 0.027); g.add(tx);
      const st = new THREE.Group(); const stp = canvasPlane(0.42, 0.16, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#d6262e'; c.lineWidth = 12; c.strokeRect(12, 12, w - 24, h - 24); c.fillStyle = '#d6262e'; c.font = '900 72px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RECHAZADA', w / 2, h / 2 + 6); }, { tr: true });
      stp.material.transparent = true; stp.material.depthWrite = false; st.add(stp); st.position.set(0, 0.32, 0.034); st.rotation.z = 0.18; g.add(st); g.userData.stamp = st;
      const a = (i - 2.5) * 0.24; g.position.set(PLZ.x + Math.sin(a) * 2.4, 0.012, PLZ.z + 1.9 + Math.cos(a) * 0.9 - 0.9); g.rotation.y = a * 0.9; scene.add(g); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }); }
}
const gone = (t, t1) => 1 - win(t, t1, 0.25);
function plazaAt(t) {
  // facultad: se enciende cada piso con su palabra
  { const keys = [K.anatomia3, K.materiales3, K.protesis3, K.cirugia3, K.pacientes3]; PS.floors.forEach((f, i) => { const on = t > K.cinco3 - 0.3 ? win(t, keys[i] - 0.2, 0.25) : 0; f.lamp.material.emissiveIntensity = 1.8 * on;
      const k = t > END - 1.3 ? 1 : (t < K.odontologia3 - 0.3 ? 1 : 0.0001 + 0.9999 * pop(t, keys[i] - 0.2, 0.4)); f.P.scale.setScalar(Math.max(0.0001, k) * 1.7); f.bw.material.emissive = f.bw.material.emissive || new THREE.Color(); f.bw.material.emissive.setRGB(0.35 * on, 0.33 * on, 0.3 * on); });
    if (PS.surgeon && PS.surgeon.userData.J) PS.surgeon.userData.J.shR.rotation.x = -0.6 - 0.3 * Math.sin(t * 3);
    if (PS.dentist5 && PS.dentist5.userData.J) { PS.dentist5.userData.J.shL.rotation.x = -0.9; PS.dentist5.userData.J.neck.rotation.x = 0.35; } }
  // el cartel: «ESPECIALISTA» se suelta y cae (frase 1); vuelve a su sitio al final (bucle)
  { const u = t > END - 0.8 ? 0 : clamp((t - K.existe1 + 0.05) / 0.75); const sp = PS.spec;
    if (u <= 0) { sp.position.set(0, -0.25, 0); sp.rotation.set(0, 0, 0); sp.visible = true; }
    else { const fall = Math.max(0, u - 0.12) / 0.88; sp.rotation.set(0, 0, Math.min(1, u * 6) * 0.5 + fall * 1.2); sp.position.set(0, -0.25 - 0.62 * fall * fall * (1 + fall), 0.04 * fall); sp.visible = sp.position.y > -0.95 || t > K.existe1 + 2; if (fall >= 0.999) sp.position.y = -0.9; }
    PS['chain-1'].visible = u <= 0.05; PS['chain1'].visible = u <= 0; }
  // el ortodoncista: interrogación (frase 2), máster, estrellas y placa tachada (frase 7)
  { const H = PS.heroPos; show(PS.qm, pop(t, K.entonces2 - 0.25, 0.4) * gone(t, K.odontologia3 - 0.4) + pop(t, K.asi7 - 0.3, 0.4) * gone(t, K.master7 - 0.1)); PS.qm.rotation.y = 0.45 * Math.sin(t * 2.2);
    const dk = pop(t, K.master7 - 0.15, 0.45) * gone(t, END - 1.2); show(PS.diploma, dk); PS.diploma.quaternion.copy(cam.quaternion); PS.diploma.position.set(H.x - 0.21, 0.24 + 0.012 * Math.sin(t * 2), H.z - 0.12); PS.diploma.scale.setScalar(Math.max(0.0001, dk * 0.8));
    PS.stars.forEach((st, i) => { const k = pop(t, K.buenisimo7 - 0.2 + i * 0.07, 0.35) * gone(t, END - 1.2); st.visible = k > 0.01; st.scale.setScalar(Math.max(0.0001, k * 1.1)); const a = -0.9 + i * 0.45;
      const r2 = v3(0.88, 0, 0.47); st.position.set(H.x + r2.x * Math.sin(a) * 0.12, 0.25 + Math.cos(a) * 0.075, H.z + r2.z * Math.sin(a) * 0.12); st.scale.multiplyScalar(0.8); st.quaternion.copy(cam.quaternion); st.rotateZ(t * 1.5 + i); });
    const bk = pop(t, K.especialista7 - 0.15, 0.4) * gone(t, END - 1.2); show(PS.badge, bk); PS.badge.quaternion.copy(cam.quaternion); PS.badge.position.set(H.x + 0.01, 0.4, H.z + 0.02); PS.badge.scale.setScalar(Math.max(0.0001, bk * 0.75));
    PS.badgeX.forEach((x, i) => { const k = clamp((t - K.serlo7 + 0.25 - i * 0.12) / 0.15); x.visible = k > 0.01; x.scale.set(Math.max(0.0001, k), 1, 1); });
    const J = PS.hero.userData.J; if (J) { J.neck.rotation.y = 0.4 * Math.sin(t * 0.9); J.shR.rotation.x = t > K.master7 - 0.2 && t < END - 1.2 ? -1.2 : 0; } }
  // las solicitudes: aparecen y Sanidad las sella como rechazadas una a una (la de ortodoncia, la última)
  { const order = [0, 1, 2, 4, 5, 3]; PS.folders.forEach((g, i) => { const k = pop(t, K.julio6 - 0.3 + i * 0.06, 0.4) * gone(t, K.asi7 - 0.3); show(g, k);
      const j = order.indexOf(i), ts = (j < 5 ? K.rechazo6 - 0.05 + j * 0.16 : K.ortodoncia6 + 0.05); const sk = clamp((t - ts) / 0.12); const st = g.userData.stamp; st.visible = sk > 0.01; st.scale.setScalar(Math.max(0.0001, 1 + 1.5 * (1 - eo(sk)))); }); }
}
