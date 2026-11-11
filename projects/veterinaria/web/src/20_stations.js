// ---------------------------------------------------------------- estaciones en el círculo de radio R_ST (una por asignatura): Anatomía (plataforma giratoria con seis
// animales que cruzan el arco de rayos X), Farmacología (el mismo frasco, tres jeringas), Microbiología y parásitos (placa, garrapata y microbios que saltan
// del animal a la persona), Producción animal (granja, pienso y ADN), Cirugía (quirófano), lo que comes (supermercado y matadero) y Reproducción (la vaca en rayos X).
const ST = {};
function station(name, a, r = 0.95) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.035); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55;
function canvasPlane(w, h, px, draw, opts = {}) {        // plano con lienzo que se puede redibujar
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
// ---------- Anatomía: orden de la voz (perro, gato, caballo, vaca, cerdo, gallina), longitud ≈ 0,44 cada uno
const AN_KIND = [['dog', 0.78], ['cat', 0.85], ['horse', 0.19], ['cow', 0.2], ['pig', 0.3], ['hen', 0.85]];
const AN_R = 0.72, AN_SW = 0.26;      // radio de la plataforma y medio recorrido del barrido de rayos X (de la cabeza a la cola, delante)
function buildStations() {
  // ---------- L4 Anatomía
  { const s = station('AN', ANG.AN, 1.12);
    s.tt = new THREE.Group(); s.tt.position.y = 0.0; s.top.add(s.tt);
    s.tt.add(at(cyl(1.05, 1.07, 0.04, M.enamel, 72), 0, 0.02, 0)); s.tt.add(at(new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.008, 8, 96), M.brass), 0, 0.04, 0, 0, Math.PI / 2));
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, tk = mesh(new THREE.BoxGeometry(0.004, 0.002, 0.05), M.brass); tk.position.set(Math.sin(a) * 0.98, 0.041, Math.cos(a) * 0.98); tk.rotation.y = a; s.tt.add(tk); }
    s.ani = AN_KIND.map(([k, sc], i) => { const A = makeAnimal(k, sc), f = i * Math.PI / 3; A.position.set(Math.sin(f) * AN_R, 0.04, Math.cos(f) * AN_R); A.rotation.y = f - Math.PI / 2; addXray(A, 0x8fd2ff, { pw: 2.4, base: 0.04 }); xrMode(A, 'scan', v3(1, 0, 0), -1e9); s.tt.add(A); A.userData.s0 = 1; return A; });
    s.lamp = xrayLamp(AN_R, 0.66); s.lamp.position.y = 0.04; s.top.add(s.lamp);
  }
  // ---------- L5 Farmacología: el mismo frasco; gato, perro y caballo con su jeringa (de pequeña a enorme)
  { const s = station('FA', ANG.FA, 1.0);
    s.vial = vial(2.3); s.vial.position.set(-0.3, 0, -0.22); s.top.add(s.vial);
    s.ani = [['cat', 0.62, [-0.12, 0, 0.42], 0.9], ['dog', 0.62, [0.06, 0, 0.06], 0.6], ['horse', 0.2, [0.2, 0, -0.36], 0.35]].map(([k, sc, p, ry]) => { const A = makeAnimal(k, sc); A.position.set(...p); A.rotation.y = ry; s.top.add(A); A.userData.s0 = 1; return A; });
    s.syr = [[0.55, [-0.12, 0.36, 0.42]], [1.0, [0.06, 0.48, 0.06]], [2.0, [0.2, 0.66, -0.36]]].map(([sc, p]) => { const g = syringeV(sc); g.position.set(...p); g.rotation.z = -Math.PI / 2; s.top.add(g); g.userData.s0 = sc; return g; });
    s.lines = s.syr.map(g => { const a = v3(-0.3, 0.36, -0.22), b = g.position.clone().add(v3(0, 0.08 * g.userData.s0, 0)), m = a.clone().lerp(b, 0.5).add(v3(0, 0.25, 0)); const l = drawLine(new THREE.QuadraticBezierCurve3(a, m, b).getPoints(40), 0xffc24a, 2.4, 0.9); s.top.add(l); return l; });
  }
  // ---------- L6 Microbiología y parásitos: placa de Petri, garrapata, vaca y persona; los microbios saltan de una a otra
  { const s = station('MI', ANG.MI, 1.05);
    s.pet = petri(3.0); s.pet.position.set(-0.3, 0, -0.32); s.top.add(s.pet);
    s.tick = tick(2.4); s.tick.position.set(0.28, 0, 0.3); s.tick.rotation.y = -2.3; s.top.add(s.tick);
    s.cow = makeAnimal('cow', 0.2); s.cow.position.set(0.32, 0, -0.28); s.cow.rotation.y = -0.6; s.top.add(s.cow);
    s.hum = figurine(M.ceramic.clone(), 1.9); s.hum.position.set(-0.3, 0, 0.32); s.hum.rotation.y = 0.6; s.top.add(s.hum);
    s.germs = []; for (let i = 0; i < 26; i++) { const g = microbe(0.011 + hash(i * 3.3) * 0.008, i % 4 ? M.germ : M.germ2); g.visible = false; s.top.add(g); s.germs.push(g); }
    s.cowTint = s.cow.userData.mats.body; s.humMat = s.hum.userData.J.head.material;
  }
  // ---------- L7 Producción animal: granja (establo, silo, valla, vacas y gallinas), pienso y ADN
  { const s = station('PR', ANG.PR, 1.05);
    s.grass = at(cyl(0.98, 0.98, 0.012, M.grass, 72), 0, 0.006, 0); s.top.add(s.grass);
    s.barn = barn(1.25); s.barn.position.set(-0.3, 0.012, -0.36); s.barn.rotation.y = 0.35; s.top.add(s.barn);
    s.silo = silo(1.1); s.silo.position.set(0.22, 0.012, -0.5); s.top.add(s.silo);
    s.fences = [[0, 0.62, 0], [-0.55, 0.38, 1.0], [0.55, 0.38, -1.0]].map(([x, z, ry]) => { const f = fence(0.55, 5); f.position.set(x, 0.012, z); f.rotation.y = ry; s.top.add(f); return f; });
    s.cows = [[0.34, -0.05, -2.2], [0.1, 0.12, -0.6], [0.45, 0.25, 2.6]].map(([x, z, ry]) => { const A = makeAnimal('cow', 0.12); A.position.set(x, 0.012, z); A.rotation.y = ry; s.top.add(A); return A; });
    s.hens = [[-0.48, 0.12, 0.6], [-0.4, 0.2, 2.0]].map(([x, z, ry]) => { const A = makeAnimal('hen', 0.3); A.position.set(x, 0.012, z); A.rotation.y = ry; s.top.add(A); return A; });
    s.hay = [[-0.42, 0.42, 0.3], [-0.3, 0.5, -0.4]].map(([x, z, ry]) => { const h = hayBale(1.3); h.position.set(x, 0.012, z); h.rotation.y = ry; s.top.add(h); return h; });
    s.tro = trough(1.3); s.tro.position.set(-0.08, 0.012, 0.38); s.tro.rotation.y = 0.1; s.top.add(s.tro);
    s.dna = dnaHelix(0.5, 0.065, 2.2); s.dna.position.set(0.3, 0.02, 0.28); s.top.add(s.dna);
  }
  // ---------- L8 Cirugía: camilla de quirófano, el perro tumbado con el paño verde, lámpara, anestesia, monitor y puntos
  { const s = station('CI', ANG.CI, 1.0);
    s.table = examTable(1.45); s.table.position.set(0, 0, 0); s.top.add(s.table);
    const ty = 0.215 * 1.45 + 0.022;
    s.dog = makeAnimal('dog', 0.85); s.dog.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(v3(0, -1, 0), v3(0, 0, -1), v3(1, 0, 0))); s.dog.position.set(-0.05, ty + 0.08, 0.24); s.top.add(s.dog);
    poseAnimal(s.dog, { legs: { legFR: -0.5, legFL: -0.3, legHR: 0.4, legHL: 0.25 }, neck: -0.2, ear: 0.3 });
    s.drape = rbox(0.3, 0.26, 0.012, M.drape, 0.01); s.drape.rotation.x = -Math.PI / 2; s.drape.position.set(0.02, ty + 0.165, 0.0); s.top.add(s.drape);
    s.cut = mesh(new THREE.BoxGeometry(0.11, 0.002, 0.012), new THREE.MeshPhysicalMaterial({ color: 0xc04a52, roughness: 0.4, clearcoat: 0.6 })); s.cut.position.set(0.02, ty + 0.172, 0.0); s.top.add(s.cut);
    s.stitches = []; for (let i = 0; i < 6; i++) { const st2 = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0016, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.5 })); st2.position.set(-0.03 + i * 0.019, ty + 0.173, 0); st2.rotation.set(0, Math.PI / 2, 0); st2.visible = false; s.top.add(st2); s.stitches.push(st2); }
    s.needle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0018, 6, 20, Math.PI * 1.1), M.chrome); s.needle.visible = false; s.top.add(s.needle);
    s.lamp = surgLamp(1.25); s.lamp.position.set(0.0, 0.78, 0.02); s.top.add(s.lamp);
    s.pole = at(cyl(0.012, 0.012, 0.8, M.chrome, 12), 0.38, 0.4, 0.02); s.top.add(s.pole); s.top.add(at(cyl(0.08, 0.09, 0.015, M.enamel, 28), 0.38, 0.008, 0.02));
    s.anes = anesthesia(1.25); s.anes.position.set(0.56, 0, -0.2); s.anes.rotation.y = -0.6; s.top.add(s.anes);
    s.mask = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xdfeef7, roughness: 0.1, transparent: true, opacity: 0.6, clearcoat: 1, side: THREE.DoubleSide })); s.mask.visible = false; s.top.add(s.mask);
    s.hose = drawLine(new THREE.CatmullRomCurve3([v3(0.5, 0.3, -0.16), v3(0.44, 0.22, -0.12), v3(0.3, ty + 0.08, -0.134)]).getPoints(30), 0x9fb3c4, 3, 1); s.top.add(s.hose);
    s.mon = ecgMonitor(1.0); s.mon.position.set(-0.5, 0.42, -0.3); s.mon.rotation.y = 0.5; s.top.add(s.mon); drawEcg(s.mon.userData.scr, 0);
  }
  // ---------- L9 Lo que comes: frigorífico del supermercado con la bandeja, matadero con su semáforo, el veterinario oficial y los animales que pasan
  { const s = station('SA', ANG.SA, 1.25);
    s.fridge = new THREE.Group(); s.fridge.position.set(-0.45, 0, 0.3); s.fridge.rotation.y = 0.5; s.top.add(s.fridge);
    s.fridge.add(at(rbox(0.5, 0.3, 0.16, M.trim, 0.02), 0, 0.08, 0, 0, -Math.PI / 2));
    s.fridge.add(at(mesh(new THREE.BoxGeometry(0.46, 0.006, 0.26), M.steelB), 0, 0.162, 0)); s.fridge.add(at(mesh(new THREE.BoxGeometry(0.5, 0.02, 0.02), glowM(0xdff2ff, 2.2)), 0, 0.17, -0.15));
    s.trays = [[-0.13, 0.04, 0.2], [0.13, 0.03, -0.2]].map(([x, z, ry]) => { const tr = meatTray(0.95, false); tr.position.set(x, 0.165, z); tr.rotation.y = ry; s.fridge.add(tr); return tr; });
    s.tray = meatTray(1.7); s.tray.position.set(-0.12, 0, 0.62); s.tray.rotation.y = 0.25; s.top.add(s.tray);
    s.mag = magnifier(1.2); s.mag.visible = false; s.top.add(s.mag);
    s.stamp = rubberStamp('INSPECCIONADO'); s.stamp.scale.setScalar(1.6); s.stamp.visible = false; s.top.add(s.stamp);
    s.mark = canvasPlane(0.2, 0.11, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#b8121b'; g.lineWidth = 14; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 12, h / 2 - 12, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#b8121b'; g.font = '900 56px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('INSPECCIONADO', w / 2, h / 2 + 4, w - 70); }, { tr: true }); s.mark.rotation.x = -Math.PI / 2; s.mark.visible = false; s.top.add(s.mark);
    s.ab = abattoir(1.25); s.ab.position.set(0.22, 0, -0.42); s.ab.rotation.y = -0.15; s.top.add(s.ab);
    s.vet = medFig('coat', 2.0); s.hel = helmet(0.088); s.hel.position.set(0, 0.11, 0); s.vet.userData.J.neck.add(s.hel); s.vet.visible = false; s.top.add(s.vet);
    s.clip = mesh(new THREE.BoxGeometry(0.15, 0.2, 0.012), M.woodL); s.clip.position.set(0, -0.02, 0.03); s.clip.rotation.x = -0.6; s.vet.userData.J.hR.add(s.clip);
    s.line = [['pig', 0.17], ['cow', 0.12], ['pig', 0.17], ['cow', 0.12]].map(([k, sc]) => { const A = makeAnimal(k, sc); A.visible = false; s.top.add(A); return A; });
  }
  // ---------- L10 Reproducción: la vaca en rayos X con el útero, el ternero dentro y el brazo del veterinario con el guante largo
  { const s = station('RE', ANG.RE, 1.2);
    s.cow = makeAnimal('cow', 0.5); s.cow.position.set(0.05, 0, 0.0); s.cow.rotation.y = -Math.PI / 2 + 0.25; addXray(s.cow, 0x8fd2ff, { pw: 2.2, base: 0.035 }); xrMode(s.cow, 'scan', v3(1, 0, 0), -1e9); s.top.add(s.cow);
    const root = s.cow.userData.G.root;
    s.ut = new THREE.Mesh(uterusGeo(), xrayMat(0xff7aa8, { pw: 1.6, base: 0.12 })); s.ut.position.set(0, 0.86, -0.62); s.ut.scale.setScalar(1.35); s.ut.renderOrder = 8; root.add(s.ut);
    s.utCore = new THREE.Mesh(uterusGeo(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5c8a).multiplyScalar(0.35), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.utCore.position.copy(s.ut.position); s.utCore.scale.setScalar(1.24); root.add(s.utCore);
    s.calf = makeAnimal('calf', 0.11); poseAnimal(s.calf, { neck: 0.9, head: 0.4, legs: { legFR: -1.4, legFL: -1.3, legHR: 1.5, legHL: 1.4 } }); s.calf.position.set(0, 0.77, -0.52); s.calf.rotation.set(0.35, 0.0, 0); root.add(s.calf);
    { const fm = xrayMat(0xffc27a, { pw: 1.4, base: 0.25 }); for (const m of s.calf.userData.solids) m.material = fm; s.calfM = fm; }
    s.arm = glove(0.8); root.add(s.arm); s.arm.userData.m.emissive = new THREE.Color(0xff6a10); s.arm.userData.m.emissiveIntensity = 0.0;
    s.vet = medFig('coat', 10.5); s.vet.userData.J.shR.visible = false; root.add(s.vet);
  }
}
// ---------- un instante de cada estación
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L4 Anatomía: la plataforma gira y cada animal cruza el arco cuando se nombra (lo que ha cruzado se ve en rayos X)
  { const s = ST.AN; if (vis(s, CUTS[0] - 0.05, K.medicamento5)) {
    const T6 = [K.perro4, K.gato4, K.caballo4, K.vaca4, K.cerdo4, K.gallina4], D60 = Math.PI / 3;
    const th = keyed(t, [[CUTS[0] - 0.3, 0.12], ...T6.flatMap((tt, i) => [[tt - 0.12, -i * D60 + 0.025], [tt + 0.16, -i * D60 - 0.025]]), [T6[5] + 1.0, -5 * D60 - 0.15], [T6[5] + 2.0, -5 * D60 - 0.25]]);
    s.tt.rotation.y = th;
    const D = v3(1, 0, 0).applyQuaternion(s.Z.quaternion), front = s.top.localToWorld(v3(0, 0, AN_R)); let lampX = -AN_SW;
    s.ani.forEach((A, i) => {
      const pk = i === 0 ? 1 : pop(t, K.muchos4 - 0.1 + i * 0.07, 0.4); A.visible = pk > 0.01; if (!A.visible) return; A.scale.setScalar(Math.max(0.0001, pk));
      const sig = clamp((t - T6[i] + 0.1) / 0.32), sx = lerp(-AN_SW, AN_SW, eio(sig)); if (sig > 0 && sig < 1) lampX = sx;
      xrMode(A, 'scan', D, sig <= 0 ? -1e9 : sig >= 1 ? 1e9 : D.dot(front) + sx);
      poseAnimal(A, { walk: 0.0, neck: 0.05 * Math.sin(t * 2 + i), tail: Math.sin(t * 3 + i) * 0.2 });
    });
    s.lamp.position.x = lampX; const LU = s.lamp.userData, pul = 0.8 + 0.2 * Math.sin(t * 9); LU.cone.material.uniforms.op.value = 0.32 * pul; LU.lens.material.emissiveIntensity = 4 + Math.sin(t * 9); LU.ring.material.opacity = 0.8 * pul;
  } }
  // L5 Farmacología: el frasco, los tres animales y sus jeringas que se llenan con «otra dosis»
  { const s = ST.FA; if (vis(s, K.vaca4, K.parasitos6)) {
    show(s.vial, pop(t, K.farmacologia5 - 0.15, 0.45) * 2.3); s.vial.rotation.y = 0.4 * Math.sin(t * 0.7);
    s.ani.forEach((A, i) => { const k = pop(t, K.mismo5 - 0.1 + i * 0.08, 0.4); A.visible = k > 0.01; if (A.visible) A.scale.setScalar(Math.max(0.0001, k)); poseAnimal(A, { headY: 0.2 * Math.sin(t * 1.2 + i), tail: Math.sin(t * 3 + i) * 0.3 }); });
    s.syr.forEach((g, i) => { const k = pop(t, K.otra5 - 0.15 + i * 0.1, 0.4); g.visible = k > 0.01; if (g.visible) { g.scale.setScalar(Math.max(0.0001, k) * g.userData.s0); g.userData.setFill(eo(clamp((t - K.dosis5 - i * 0.12) / 0.55)) * [0.25, 0.55, 0.95][i]); } });
    s.lines.forEach((l, i) => drawK(l, clamp((t - K.medicamento5 - i * 0.12) / 0.45) * (1 - win(t, K.especie5 + 0.6, 0.3))));
  } }
  // L6 Microbiología: colonias que crecen, la garrapata camina, los microbios rodean a la vaca y saltan a la persona
  { const s = ST.MI; if (vis(s, K.dosis5, K.granjas7)) {
    show(s.pet, pop(t, K.microbiologia6 - 0.15, 0.45) * 3.0); s.pet.userData.cols.forEach((c, i) => { const k = clamp((t - K.microbiologia6 - 0.05 - hash(i * 2.2) * 0.7) / 0.35); c.visible = k > 0; c.scale.set(eo(k), 0.35 * eo(k), eo(k)); });
    const tk = pop(t, K.parasitos6 - 0.2, 0.45); show(s.tick, tk * 2.4); if (s.tick.visible) { const w = t * 9; s.tick.userData.legs.forEach((l, i) => { l.rotation.y = Math.sin(w + i * 1.7) * 0.25; }); s.tick.position.set(0.28 - 0.06 * clamp((t - K.parasitos6) / 2), 0, 0.3 + 0.04 * clamp((t - K.parasitos6) / 2)); }
    const ck = pop(t, K.enferma6 - 0.25, 0.45); show(s.cow, ck); poseAnimal(s.cow, { headY: 0.15 * Math.sin(t * 1.3), neck: 0.25 * win(t, K.animal6, 0.5) });
    const hk = pop(t, K.y6 - 0.1, 0.45); show(s.hum, hk);
    const sick = win(t, K.animal6 - 0.1, 0.5), sickH = win(t, K.ti6 - 0.15, 0.4);
    s.cow.userData.mats.body.emissive.setRGB(0.25 * sick, 0.02 * sick, 0.04 * sick);
    s.humMat.emissive = s.humMat.emissive || new THREE.Color(); s.hum.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.setRGB(0.4 * sickH, 0.03 * sickH, 0.05 * sickH); });
    const cc = v3(0.32, 0.2, -0.28), hc = v3(-0.3, 0.2, 0.32);
    s.germs.forEach((g, i) => { const t0 = K.enferma6 + i * 0.03, k = clamp((t - t0) / 0.3); g.visible = k > 0.01; if (!g.visible) return;
      const a = t * (1.6 + hash(i) * 1.5) + i * 2.4, r = 0.12 + hash(i * 3.1) * 0.08, yy = 0.05 + hash(i * 5.3) * 0.22;
      const orb = (c) => v3(c.x + Math.cos(a) * r, yy + Math.sin(a * 1.3) * 0.03, c.z + Math.sin(a) * r);
      const j = clamp((t - K.y6 - 0.05 - (i % 13) * 0.08) / 0.7), jump = i % 2 === 0 ? eio(j) : 0;
      const p = orb(cc).lerp(orb(hc), jump); p.y += Math.sin(jump * Math.PI) * 0.35; g.position.copy(p); g.scale.setScalar(eo(k)); g.rotation.set(t * 2 + i, t * 3, 0); });
  } }
  // L7 Producción animal: la granja se monta, el pienso cae en el comedero, el ADN sube girando
  { const s = ST.PR; if (vis(s, K.ti6 - 0.1, K.anestesia8)) {
    show(s.barn, pop(t, K.granjas7 - 0.2, 0.45) * 1.25); show(s.silo, pop(t, K.granjas7 - 0.05, 0.45) * 1.1);
    s.fences.forEach((f, i) => show(f, pop(t, K.produccion7 + i * 0.1, 0.35)));
    s.cows.forEach((A, i) => { show(A, pop(t, K.animal7 - 0.1 + i * 0.08, 0.4)); poseAnimal(A, { neck: 0.7 + 0.1 * Math.sin(t * 2 + i), tail: Math.sin(t * 2.4 + i) * 0.3 }); });
    s.hens.forEach((A, i) => { show(A, pop(t, K.granjas7 + 0.15 + i * 0.1, 0.35)); poseAnimal(A, { neck: 0.4 * Math.max(0, Math.sin(t * 6 + i * 2)) }); });
    s.hay.forEach((h, i) => show(h, pop(t, K.alimentacion7 - 0.1 + i * 0.1, 0.4) * 1.3)); show(s.tro, pop(t, K.alimentacion7 - 0.15, 0.4) * 1.3); fillTrough(s.tro, clamp((t - K.alimentacion7) / 0.6), t);
    const dk = clamp((t - K.genetica7 + 0.1) / 0.5); s.dna.visible = dk > 0.01; s.dna.rotation.y = t * 1.6; s.dna.userData.items.forEach((it, i) => { const k = clamp(dk * 1.4 - i / 26 * 0.4); it.visible = k > 0.01; it.scale.setScalar(Math.max(0.0001, eo(k))); });
    s.dna.userData.strands.forEach(st2 => { st2.scale.y = Math.max(0.0001, eo(dk)); st2.visible = dk > 0.01; });
  } }
  // L8 Cirugía: la lámpara se enciende, la mascarilla y el monitor, los puntos uno a uno
  { const s = ST.CI; if (vis(s, K.genetica7 - 0.1, K.espana9)) {
    const lk = win(t, K.quirofano8 - 0.05, 0.2); s.lamp.userData.leds.forEach(l => l.material.emissiveIntensity = 0.2 + 5 * lk); s.lamp.userData.lamp.children[0].material.emissive = new THREE.Color(0xfff2d6).multiplyScalar(0.12 * lk);
    const ak = pop(t, K.anestesia8 - 0.1, 0.4); s.mask.visible = ak > 0.01; if (s.mask.visible) { s.mask.scale.setScalar(Math.max(0.0001, ak)); s.mask.position.set(0.255, 0.215 * 1.45 + 0.102, -0.134); s.mask.rotation.set(0, 0, -Math.PI / 2); }
    drawK(s.hose, clamp((t - K.anestesia8) / 0.35)); s.anes.userData.bag.scale.set(1, 1.3 + 0.15 * Math.sin(t * 4) * win(t, K.anestesia8, 0.3), 1);
    show(s.mon, pop(t, K.anestesia8 + 0.1, 0.4)); if (s.mon.visible) drawEcg(s.mon.userData.scr, t);
    const n = s.stitches.length; s.stitches.forEach((st2, i) => { st2.visible = t > K.puntos8 - 0.1 + i * 0.07; });
    const nk = clamp((t - K.puntos8 + 0.1) / (n * 0.07)); s.needle.visible = nk > 0 && nk < 1; if (s.needle.visible) { const x = -0.03 + nk * 0.095; s.needle.position.set(x, 0.215 * 1.45 + 0.205, 0); s.needle.rotation.set(0, Math.PI / 2, t * 12); }
  } }
  // L9 Lo que comes: la bandeja y la lupa; el matadero en rojo hasta que entra el veterinario oficial; los animales pasan; el sello «INSPECCIONADO»
  { const s = ST.SA; if (vis(s, K.puntos8 - 0.1, K.reproduccion10)) {
    const mk = win(t, K.vigilas9 - 0.15, 0.35) * (1 - win(t, K.espana9 - 0.1, 0.35)); s.mag.visible = mk > 0.01; if (s.mag.visible) { s.mag.scale.setScalar(1.2 * mk); s.mag.position.set(-0.12 + 0.05 * Math.sin(t * 2.2), 0.2, 0.62 + 0.03 * Math.cos(t * 1.7)); s.mag.rotation.set(-1.25, 0, 0.2); }
    const on = win(t, K.dentro9 - 0.05, 0.15); s.ab.userData.lampR.material.emissiveIntensity = 4 * (1 - on) * win(t, K.matadero9 - 0.1, 0.2); s.ab.userData.lampG.material.emissiveIntensity = 4 * on;
    s.ab.userData.door.position.y = 0.085 + 0.15 * win(t, K.oficial9, 0.4) * (1 - win(t, K.dentro9 + 0.25, 0.3));
    // el veterinario: llega por la derecha y entra; vuelve a salir para revisar a los animales
    const wk = clamp((t - K.veterinario9 + 0.15) / 1.05), back = win(t, K.revisando9 - 0.2, 0.3);
    s.vet.visible = t > K.sin9 - 0.1 && (wk < 0.98 || back > 0.01);
    if (s.vet.visible) { const J = s.vet.userData.J, p0 = v3(0.72, 0, 0.15), p1 = v3(0.3, 0, -0.2), p2 = v3(0.42, 0, 0.18); const p = back > 0.01 ? p2 : p0.clone().lerp(p1, eio(wk));
      s.vet.position.copy(p); s.vet.rotation.y = back > 0.01 ? -1.3 : Math.atan2(p1.x - p0.x, p1.z - p0.z); const sw = back > 0.01 ? 0 : Math.sin(wk * 14) * 0.45 * (wk < 1 ? 1 : 0);
      J.hpL.rotation.x = sw; J.hpR.rotation.x = -sw; J.shL.rotation.x = -sw * 0.7; J.shR.rotation.x = back > 0.01 ? -1.0 : sw * 0.7; J.elR.rotation.x = back > 0.01 ? -0.6 : 0; s.clip.visible = back > 0.01; }
    s.line.forEach((A, i) => { const t0 = K.revisando9 + i * 0.32, u = (t - t0) / 1.6; A.visible = u > 0 && u < 1.05; if (!A.visible) return;
      const p = v3(0.75, 0, 0.32).lerp(v3(0.05, 0, 0.0), clamp(u)); A.position.copy(p); A.rotation.y = Math.atan2(-0.7, -0.32); poseAnimal(A, { walk: 0.35, phase: t * 9 + i }); A.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.005; });
    // el sello cae sobre la bandeja con «después»
    const sk = clamp((t - K.despues9 + 0.25) / 0.3), up = win(t, K.despues9 + 0.25, 0.35); s.stamp.visible = sk > 0 && t < K.despues9 + 0.9;
    if (s.stamp.visible) s.stamp.position.set(-0.12, 0.05 + 0.4 * (1 - eio(sk)) + 0.25 * up, 0.62); s.stamp.rotation.y = 0.25;
    s.mark.visible = t > K.despues9 + 0.04; s.mark.position.set(-0.12, 0.066, 0.62); s.mark.rotation.z = -0.25;
  } }
  // L10 Reproducción: la vaca pasa a rayos X; el útero y el ternero; el brazo con el guante entra hasta el hombro
  { const s = ST.RE; if (vis(s, K.dentro9, CUTS[CUTS.length - 1] + 0.02)) {
    const D = v3(0, 0, 1).applyQuaternion(s.cow.getWorldQuaternion(new THREE.Quaternion())), c = s.cow.getWorldPosition(new THREE.Vector3());
    const sk = clamp((t - K.reproduccion10 + 0.1) / 0.6), L = 0.7; xrMode(s.cow, 'scan', D, sk <= 0 ? -1e9 : sk >= 1 ? 1e9 : D.dot(c) + lerp(-L, L, eio(sk)));
    const uk = win(t, K.vaca10, 0.4); s.ut.visible = s.utCore.visible = uk > 0.01; s.ut.material.uniforms.op.value = uk * (1 + 0.5 * win(t, K.utero10 - 0.05, 0.2) * Math.max(0, Math.sin((t - K.utero10) * 8)));
    s.utCore.material.opacity = 0.5 * uk;
    const fk = win(t, K.prenada10 - 0.05, 0.35); s.calf.visible = fk > 0.01; s.calfM.uniforms.op.value = fk * (0.8 + 0.2 * Math.sin(t * 5));
    // el brazo: de fuera (detrás de la vaca) a dentro, encima del útero
    const ak = eio(clamp((t - K.palpa10 + 0.1) / (K.dentro10 + 0.3 - K.palpa10))) , deep = 0.08 * win(t, K.brazo10b - 0.1, 0.4);
    const hand = v3(0, 1.06, lerp(-1.3, -0.5 - deep, ak)), sh = v3(0.24, 1.42, lerp(-2.15, -1.36 - deep, ak));
    s.arm.visible = s.vet.visible = t > K.saber10;
    if (s.arm.visible) { const d = hand.clone().sub(sh), Lr = d.length(); s.arm.position.copy(hand); s.arm.quaternion.setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()); s.arm.scale.setScalar(Lr / 0.95);
      s.arm.userData.m.emissiveIntensity = 0.35 * win(t, K.palpa10, 0.3); s.arm.userData.hand.rotation.x = 0.25 * win(t, K.utero10, 0.3);
      s.vet.position.set(sh.x - 0.218, 0, sh.z - 0.02); s.vet.rotation.y = 0.0; const J = s.vet.userData.J; J.hpL.rotation.x = 0.1; J.hpR.rotation.x = -0.1; }
    poseAnimal(s.cow, { neck: 0.05, headY: 0.15 * Math.sin(t * 0.8), tail: 0.35, tailX: -0.2 });
  } }
}
