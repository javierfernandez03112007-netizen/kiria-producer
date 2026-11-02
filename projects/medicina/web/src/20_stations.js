// ---------------------------------------------------------------- estaciones (una por frase) en el círculo de radio R_ST: cuerpo sano (L4), lo que falla (L5), clínicas (L6),
// el hospital (L7), el MIR (L8), la residencia (L11), los años (L12) y quirófano o consulta (L13). Cada una: pedestal de madera con canto de latón y su haz de luz.
const ST = {};
function station(name, a, r = 0.95) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55;
function canvasPlane(w, h, px, draw, opts = {}) {        // plano con lienzo que se puede redibujar
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
function bookB(c, title) { const b = book(0.16, 0.22, 0.04, c, title, ''); b.rotation.x = -Math.PI / 2; return b; }
function buildStations() {
  // ---------- L4 el cuerpo sano: cráneo y fémur (Anatomía), corazón que late (Fisiología), glucosa (Bioquímica)
  { const s = station('CS', ANG.CS, 1.0);
    s.skull = skull(1.6); s.skull.position.set(-0.42, 0, -0.02); s.skull.rotation.y = 0.35; s.top.add(s.skull);
    s.bone = bone(1.1); s.bone.rotation.set(0, -0.5, Math.PI / 2); s.bone.position.set(-0.3, 0.03, 0.33); s.top.add(s.bone);
    s.heart = heartModel(1.7); s.heart.position.set(0.02, 0.03, 0.02); s.top.add(s.heart);
    s.hstand = grp(at(cyl(0.006, 0.006, 0.05, M.brass, 8), 0, 0.025, 0), at(cyl(0.06, 0.07, 0.012, M.wood, 24), 0, 0.006, 0)); s.hstand.position.set(0.02, 0, 0.02); s.top.add(s.hstand);
    s.mol = molecule(1.4); s.mol.position.set(0.44, 0.36, 0.04); s.top.add(s.mol);
    s.mstand = grp(at(cyl(0.005, 0.005, 0.22, M.brass, 8), 0, 0.11, 0), at(cyl(0.05, 0.06, 0.012, M.wood, 24), 0, 0.006, 0)); s.mstand.position.set(0.44, 0, 0.04); s.top.add(s.mstand);
  }
  // ---------- L5 lo que falla: microscopio (Patología), placa de Petri con colonias (Microbiología), frasco, blíster y jeringa (Farmacología)
  { const s = station('LF', ANG.LF, 1.0);
    s.mic = microscope(2.1); s.mic.position.set(-0.36, 0, -0.08); s.mic.rotation.y = 0.5; s.top.add(s.mic);
    s.pet = petri(1.5); s.pet.position.set(0.02, 0, 0.22); s.top.add(s.pet);
    s.bot = pillBottle(1.5); s.bot.position.set(0.38, 0, -0.18); s.top.add(s.bot);
    s.bli = blister(1.4); s.bli.position.set(0.36, 0.006, 0.18); s.bli.rotation.y = -0.4; s.top.add(s.bli);
    s.syr = syringe(1.3); s.syr.position.set(0.12, 0.02, -0.28); s.syr.rotation.y = 0.5; s.top.add(s.syr);
  }
  // ---------- L6 las clínicas: monitor con el electro (corazón), cerebro, osito y niño (niños), fonendo
  { const s = station('CL', ANG.CL, 1.05);
    s.mon = ecgMonitor(1.25); s.mon.position.set(-0.36, 0.36, -0.2); s.mon.rotation.y = 0.35; s.top.add(s.mon); drawEcg(s.mon.userData.scr, 0);
    s.st = stethoscope(1.3); s.st.position.set(-0.25, 0.0, 0.25); s.st.rotation.y = -0.3; s.top.add(s.st);
    s.brain = brainModel(1.9); s.brain.position.set(0.06, 0.26, -0.02); s.top.add(s.brain);
    s.bstand = grp(at(cyl(0.006, 0.006, 0.13, M.brass, 8), 0, 0.065, 0), at(cyl(0.07, 0.08, 0.012, M.wood, 24), 0, 0.006, 0)); s.bstand.position.set(0.06, 0, -0.02); s.top.add(s.bstand);
    s.ted = teddy(1.6); s.ted.position.set(0.42, 0, 0.12); s.ted.rotation.y = -0.6; s.top.add(s.ted);
    s.kid = medFig('kid', 0.62); s.kid.position.set(0.3, 0, 0.3); s.kid.rotation.y = -0.4; s.top.add(s.kid);
  }
  // ---------- L7 sexto: casi todo el año en el hospital (cama con paciente y gotero; médica y dos estudiantes con bata)
  { const s = station('HO', ANG.HO, 1.1);
    s.bed = hospitalBed(1.1); s.bed.position.set(0.0, 0, 0.0); s.bed.rotation.y = 0; s.top.add(s.bed);
    s.doc = medFig('coat', 2.1); s.doc.position.set(-0.42, 0, -0.06); s.doc.rotation.y = Math.PI / 2 + 0.3; s.top.add(s.doc); s.doc.userData.J.shR.rotation.x = -0.6;
    s.stu = [medFig('coat', 1.8), medFig('coat', 1.8)]; s.stu.forEach((f, i) => { f.position.set(0.32 + i * 0.1, 0, -0.42 + i * 0.16); f.rotation.y = -Math.PI / 2 - 0.3; s.top.add(f); });
    s.mon = ecgMonitor(0.7); s.mon.position.set(-0.3, 0.42, -0.5); s.mon.rotation.y = 0.4; s.top.add(s.mon);
  }
  // ---------- L8 el MIR: hoja de respuestas (200 preguntas), reloj (4 h 30 min) y lápiz
  { const s = station('MI', ANG.MI, 1.1);
    s.desk = grp(at(mesh(new THREE.BoxGeometry(0.8, 0.025, 0.46), M.woodL), 0, 0.12, 0)); for (const x of [-0.37, 0.37]) s.desk.add(at(mesh(new THREE.BoxGeometry(0.03, 0.12, 0.42), M.woodL), x, 0.06, 0)); s.top.add(s.desk);
    s.sheetK = -1; s.wrong = 137; s.sheet = canvasPlane(0.34, 0.46, 1024, (g, w, h) => drawSheet(g, w, h, 0, s.wrong), { cs: false });
    s.clip = rbox(0.38, 0.5, 0.012, M.woodL, 0.012); s.clip.rotation.x = -Math.PI / 2 + 0.42; s.clip.position.set(-0.05, 0.2, 0.0); s.desk.add(s.clip);
    const clamp2 = mesh(new THREE.BoxGeometry(0.12, 0.02, 0.025), M.chrome); clamp2.position.set(0, 0.24, 0.012); s.clip.add(clamp2);
    s.sheet.position.set(0, -0.01, 0.0075); s.clip.add(s.sheet);
    s.pen = pen(); s.pen.rotation.set(0.0, 0.6, -1.25); s.top.add(s.pen);
    s.clk = wallClock(1.35); s.clk.position.set(0.32, 0.55, -0.22); s.clk.rotation.y = -0.25; s.top.add(s.clk);
    s.cpost = grp(at(cyl(0.008, 0.008, 0.36, M.brass, 8), 0, 0.18, 0), at(cyl(0.06, 0.07, 0.012, M.wood, 24), 0, 0.006, 0)); s.cpost.position.set(0.32, 0, -0.24); s.top.add(s.cpost);
  }
  // ---------- L11 la residencia: escalera R1…R5, residente con pijama verde, nómina con monedas y la guardia (reloj a las 3)
  { const s = station('RE', ANG.RE, 1.15);
    s.steps = [0, 1, 2, 3, 4].map(k => { const st2 = mesh(new THREE.BoxGeometry(0.62, 0.06 * (k + 1), 0.13), k === 4 ? new THREE.MeshPhysicalMaterial({ color: 0x3a2112, roughness: 0.45, transparent: true, opacity: 0.55 }) : M.wood); st2.position.set(-0.08, 0.03 * (k + 1), 0.32 - k * 0.13); s.top.add(st2);
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.622, 0.005, 0.132), M.brass); e.position.set(-0.08, 0.06 * (k + 1), 0.32 - k * 0.13); s.top.add(e);
      const lb = plateText(0.09, 0.045, [['R' + (k + 1), 0.8, 0.5]], { fg: '#e8c77a' }); lb.position.set(-0.32, 0.06 * (k + 1) + 0.0035, 0.32 - k * 0.13); lb.rotation.x = -Math.PI / 2; s.top.add(lb); return st2; });
    s.res = medFig('scrubs', 1.0); s.top.add(s.res);
    s.nom = canvasPlane(0.2, 0.27, 512, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '900 40px Inter'; g.fillText('NÓMINA', 26, 58); g.font = '600 15px Inter'; g.fillText('MÉDICO INTERNO RESIDENTE · EJEMPLO', 26, 86);
      [['Sueldo base', '•••'], ['Complemento de grado', '•••'], ['Guardias', '•••'], ['LÍQUIDO A PERCIBIR', '•••• €']].forEach(([a, b], i) => { g.font = (a === a.toUpperCase() ? '800 ' : '500 ') + '20px Inter'; g.fillText(a, 26, 150 + i * 56); g.textAlign = 'right'; g.fillText(b, w - 26, 150 + i * 56); g.textAlign = 'left'; g.fillStyle = 'rgba(40,36,30,.25)'; g.fillRect(26, 162 + i * 56, w - 52, 2); g.fillStyle = '#2b2218'; }); });
    s.nom.rotation.x = -Math.PI / 2; s.nom.rotation.z = -0.25; s.nom.position.set(0.42, 0.004, 0.22); s.top.add(s.nom);
    s.coins = []; for (let i = 0; i < 6; i++) { const c = coin(0.026); c.position.set(0.44, 0.004 + i * 0.006, -0.02); s.top.add(c); s.coins.push(c); }
    s.clk = wallClock(0.85); s.clk.position.set(0.38, 0.5, -0.3); s.clk.rotation.y = -0.4; s.top.add(s.clk); setClock(s.clk, 3.0);
    s.cpost = grp(at(cyl(0.007, 0.007, 0.36, M.brass, 8), 0, 0.18, 0), at(cyl(0.05, 0.06, 0.012, M.wood, 24), 0, 0.006, 0)); s.cpost.position.set(0.38, 0, -0.32); s.top.add(s.cpost);
    s.moon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe8ff).multiplyScalar(1.6), toneMapped: false })); s.moon.position.set(0.12, 0.85, -0.42); s.top.add(s.moon);
  }
  // ---------- L12 once años: 6 libros del grado + 5 de la residencia y el cirujano encima
  { const s = station('AN', ANG.AN, 1.0);
    const cG = [0x6e1414, 0x173d2a, 0x1b2a4a, 0x4a2a14, 0x2a1a2e, 0x14361f];
    s.books = []; for (let k = 0; k < 11; k++) { const g = k < 6 ? bookB(cG[k], (k + 1) + '.º') : bookB(0x2c7a6c, 'R' + (k - 5)); g.position.set(-0.18, 0.02 + k * 0.042, 0.06); g.rotation.z = (hash(k * 3.3) - 0.5) * 0.25; s.top.add(g); s.books.push(g); }
    s.sur = medFig('scrubs', 1.35); s.sur.position.set(0.24, 0, 0.05); s.sur.rotation.y = -0.3; s.top.add(s.sur);
    s.scal = grp(at(mesh(new THREE.BoxGeometry(0.006, 0.006, 0.07), M.chrome), 0, 0, 0), at(mesh(new THREE.BoxGeometry(0.004, 0.012, 0.03), M.chrome), 0, 0.004, 0.048)); s.scal.position.set(0, -0.02, 0.03); s.scal.scale.setScalar(1 / (0.16 * 1.35)); s.sur.userData.J.hR.add(s.scal);
    s.sur.userData.J.shR.rotation.x = -0.8; s.sur.userData.J.elR.rotation.x = -0.9;
    s.sp = sparks(s.top, 140, 0xffd58a, 0.025);
  }
  // ---------- L13 ¿quirófano o consulta?: los dos, uno a cada lado
  { const s = station('DU', ANG.DU, 1.25);
    s.sur = surgery(1.05); s.sur.position.set(-0.42, 0, 0.0); s.sur.rotation.y = 0.35; s.top.add(s.sur);
    s.con = consult(1.05); s.con.position.set(0.4, 0, 0.02); s.con.rotation.y = -0.35; s.top.add(s.con);
    s.div = mesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), M.brass); s.div.position.set(0, 0.25, 0.1); s.top.add(s.div);
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L4
  { const s = ST.CS; if (vis(s, K.dentro3 - 0.2, K.patologia5 + 0.8)) {
    show(s.skull, pop(t, K.cuerpo4 - 0.15, 0.45) * 1.6); s.skull.rotation.y = 0.35 + 0.8 * (1 - eo(clamp((t - K.cuerpo4) / 0.9))); s.skull.userData.jaw.rotation.x = 0.06 + 0.06 * Math.max(0, Math.sin(t * 6));
    show(s.bone, pop(t, K.sano4 - 0.05, 0.4) * 1.1);
    const hk = pop(t, K.fisiologia4 - 0.15, 0.45); show(s.heart, hk * 1.7); show(s.hstand, hk); if (s.heart.visible) { const b = beat(t) * clamp((t - K.fisiologia4) / 0.3); s.heart.userData.body.scale.setScalar(1 + 0.07 * b); s.heart.rotation.y = 0.4 + Math.sin(t * 0.8) * 0.25; }
    const mk = pop(t, K.bioquimica4 - 0.15, 0.45); show(s.mol, mk * 1.4); show(s.mstand, mk); s.mol.rotation.set(t * 0.6, t * 0.9, 0.3);
  } }
  // L5
  { const s = ST.LF; if (vis(s, K.bioquimica4 - 0.4, K.clinicas6 + 0.8)) {
    show(s.mic, pop(t, K.patologia5 - 0.15, 0.45) * 2.1); s.mic.userData.light.material.emissiveIntensity = 2.5 * win(t, K.patologia5 + 0.2, 0.3);
    show(s.pet, pop(t, K.microbiologia5 - 0.15, 0.45) * 1.5); s.pet.userData.cols.forEach((c, i) => { const k = clamp((t - K.microbiologia5 - 0.05 - hash(i * 2.2) * 0.6) / 0.35); c.visible = k > 0; c.scale.set(eo(k), 0.35 * eo(k), eo(k)); });
    show(s.bot, pop(t, K.farmacologia5 - 0.15, 0.4) * 1.5); show(s.bli, pop(t, K.farmacologia5, 0.4) * 1.4); show(s.syr, pop(t, K.farmacologia5 + 0.18, 0.4) * 1.3);
    s.bli.userData.pills.forEach((p, i) => { const k = clamp((t - K.farmacologia5 - 0.1 - i * 0.04) / 0.2); p.visible = k > 0; p.position.y = 0.008 + 0.06 * (1 - eo(k)); });
  } }
  // L6
  { const s = ST.CL; if (vis(s, K.farmacologia5 - 0.4, K.hospital7 - 0.6)) {
    show(s.st, pop(t, K.clinicas6 - 0.15, 0.45) * 1.3);
    const mk = pop(t, K.corazon6 - 0.2, 0.45); show(s.mon, mk * 1.25); if (s.mon.visible) drawEcg(s.mon.userData.scr, t);
    const bk = pop(t, K.cerebro6 - 0.15, 0.45); show(s.brain, bk * 1.9); show(s.bstand, bk); s.brain.rotation.y = -0.6 + t * 0.5;
    show(s.ted, pop(t, K.ninos6 - 0.15, 0.4) * 1.6); show(s.kid, pop(t, K.ninos6 + 0.05, 0.4));
  } }
  // L7
  { const s = ST.HO; if (vis(s, K.ninos6 + 0.2, K.mir8 + 0.4)) {
    show(s.bed, pop(t, K.sexto7 - 0.2, 0.45) * 1.15); show(s.doc, pop(t, K.casi7 - 0.1, 0.4)); s.stu.forEach((f, i) => show(f, pop(t, K.entero7 - 0.1 + i * 0.1, 0.4)));
    const mk = pop(t, K.hospital7 - 0.15, 0.4); show(s.mon, mk * 0.7); if (s.mon.visible) drawEcg(s.mon.userData.scr, t);
  } }
  // L8
  { const s = ST.MI; if (vis(s, K.dentro7 - 0.3, K.n15000 + 0.4)) {
    s.desk.visible = true; s.desk.scale.setScalar(Math.max(0.0001, pop(t, K.falta8 - 0.2, 0.45)));
    const fk = clamp((t - K.n200 + 0.05) / (K.media8 - K.n200 + 0.3)), wr = t > K.fallo8 - 0.05 ? 1 : 0, key = fk + wr * 2;
    if (Math.abs(key - s.sheetK) > 0.004) { const T = s.sheet.userData.tex; drawSheet(T.userData.g, T.userData.c.width, T.userData.c.height, wr ? 1 : fk, wr ? s.wrong : -1); T.needsUpdate = true; s.sheetK = key; }
    const q = Math.min(199, Math.floor(200 * fk)), col = Math.floor(q / 50), row = q % 50;
    const rh = (1385 - 110) / 50, u = (20 + col * 246 + 36 + 26 * Math.floor(hash(q * 5.3) * 4)) / 1024 - 0.5, v = (100 + row * rh + rh / 2) / 1385 - 0.5;
    const lift = 0.006 + (fk > 0 && fk < 1 ? 0.004 * Math.abs(Math.sin(t * 40)) : 0.03), P = v3(u * 0.34, -v * 0.46, lift); s.sheet.localToWorld(P); s.top.worldToLocal(P);
    s.pen.visible = s.desk.scale.x > 0.5 && t < K.resta8 + 0.6; s.pen.position.copy(P);
    const ck = pop(t, K.cuatro8 - 0.2, 0.45); show(s.clk, ck * 1.35); show(s.cpost, ck); setClock(s.clk, 14 + 4.5 * eio(clamp((t - K.cuatro8) / (K.media8 - K.cuatro8 + 0.4))));
  } }
  // L11
  { const s = ST.RE; if (vis(s, K.agoto10 + 0.6, K.carrera12 + 0.6)) {
    s.steps.forEach((st2, k) => { const kk = pop(t, (k < 4 ? K.cuatro11 : K.cinco11) - 0.25 + k * 0.06, 0.35); st2.visible = kk > 0.01; st2.scale.set(1, Math.max(0.001, kk), 1); });
    const lvl = clamp((t - K.residencia11 + 0.3) / 1.2) * 5, z = 0.45 - lvl * 0.13, hop = Math.sin((lvl % 1) * Math.PI) * 0.05;
    s.res.visible = t > K.cuatro11 - 0.1; s.res.position.set(-0.08, 0.06 * Math.min(5, Math.floor(lvl + 0.5)) + hop, z); const J = s.res.userData.J; J.hpL.rotation.x = Math.sin(lvl * Math.PI * 2) * 0.5; J.hpR.rotation.x = -Math.sin(lvl * Math.PI * 2) * 0.5;
    show(s.nom, pop(t, K.cobrando11 - 0.15, 0.4)); s.coins.forEach((c, i) => { const k = clamp((t - K.cobrando11 - 0.05 - i * 0.05) / 0.18); c.visible = k > 0; c.position.y = 0.004 + i * 0.006 + 0.15 * (1 - eo(k)); });
    const gk = pop(t, K.guardias11 - 0.2, 0.4); show(s.clk, gk * 0.85); show(s.cpost, gk); show(s.moon, gk);
  } }
  // L12
  { const s = ST.AN; if (vis(s, K.guardias11 - 0.4, K.guardalo13 - 0.6)) {
    s.books.forEach((b, k) => { const t0 = k < 6 ? K.seis12 - 0.1 + k * 0.08 : K.cinco12 - 0.1 + (k - 6) * 0.08, kk = clamp((t - t0) / 0.2); b.visible = kk > 0; b.position.y = 0.02 + k * 0.042 + 0.3 * (1 - eo(kk)); });
    show(s.sur, pop(t, K.cirujano12 - 0.2, 0.45));
    s.sp.visible = t > K.once12 && t < K.once12 + 2; if (s.sp.visible) burst(s.sp, v3(-0.18, 0.5, 0.06), t, K.once12, 0.35, 1.4, false, 0.25);
  } }
  // L13
  { const s = ST.DU; if (vis(s, K.cirujano12 - 0.2, END + 1)) {
    show(s.sur, pop(t, K.si13 - 0.3, 0.45) * 1.05); show(s.con, pop(t, K.si13 - 0.1, 0.45) * 1.05); show(s.div, pop(t, K.si13, 0.4));
    const qk = win(t, K.quirofano13 - 0.15, 0.3), ck = win(t, K.consulta13 - 0.15, 0.3);
    s.sur.userData.leds.forEach(l => { l.material.emissiveIntensity = 0.6 + 5 * qk; });
    s.con.traverse(o => { if (o.material && o.material.emissiveMap) o.material.emissiveIntensity = 0.3 + 1.2 * ck; });
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
