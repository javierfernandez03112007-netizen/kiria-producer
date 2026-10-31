// ---------------------------------------------------------------- estaciones (una por frase, de la L5 a la L15) en el círculo de radio R_ST.
// Cada una es un pedestal de madera con canto de latón y su haz de luz; su +z local mira hacia fuera (hacia la cámara).
const ST = {};
function station(name, a, r = 0.95) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55;
function canvasPlane(w, h, px, draw, opts = {}) {        // plano con lienzo que se puede redibujar (firma, burbujas del test…)
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
function buildStations() {
  // ---------- L5 la base: columna romana, Constitución y la pirámide normativa
  { const s = station('B', ANG.B, 1.0);
    s.col = column(0.62, 0.065); s.col.position.set(-0.42, 0, 0.0); s.top.add(s.col);
    s.con = book(0.24, 0.32, 0.06, 0x5c1010, 'CONSTITUCIÓN', 'ESPAÑOLA · 1978'); s.con.position.set(0, 0.16, 0.1); s.con.rotation.y = 0.0; s.top.add(s.con);
    s.pyr = [0, 1, 2].map(k => { const rb = 0.2 - k * 0.055, rt = rb - 0.045, h = 0.075; const m = mesh(new THREE.CylinderGeometry(rt, rb, h, 4, 1), k === 2 ? M.marble : M.stone); m.rotation.y = Math.PI / 4; const g = grp(m); const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xcfa860 })); e.rotation.y = Math.PI / 4; g.add(e); g.position.set(0.44, h / 2 + k * h, 0.02); s.top.add(g); return g; });
  }
  // ---------- L6 Civil: contrato con pluma (firma que se dibuja), testamento lacrado y llave, familia, letra pequeña con lupa
  { const s = station('CI', ANG.CI, 1.0);
    s.sig = []; for (let i = 0; i <= 60; i++) { const u = i / 60; s.sig.push([330 + u * 330 + Math.sin(u * 22) * 18, 560 - Math.sin(u * 9) * 26 - Math.cos(u * 31) * 10 * (1 - u)]); }
    
    s.drawC = (g, w, h, k) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 52px Inter'; g.fillText('CONTRATO', w / 2, 80); g.font = '600 22px Inter'; g.fillText('DE ARRENDAMIENTO DE VIVIENDA · EJEMPLO', w / 2, 116);
      textLines(g, 60, 150, w - 120, 14, 22, 'rgba(40,36,30,.55)', 2); g.font = '400 9px Inter'; g.fillStyle = 'rgba(40,36,30,.7)'; for (let i = 0; i < 12; i++) g.fillText('La parte arrendataria renuncia expresamente a… cláusula adicional ' + (i + 7) + '.ª, penalización y prórroga tácita, salvo pacto en contrario…', w / 2, 830 + i * 12);
      g.strokeStyle = 'rgba(40,36,30,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(320, 600); g.lineTo(690, 600); g.stroke(); g.font = '500 18px Inter'; g.fillStyle = 'rgba(40,36,30,.7)'; g.fillText('Firma', 505, 625);
      if (k > 0) { g.strokeStyle = '#13235c'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); const n = Math.floor(s.sig.length * k); for (let i = 0; i < n; i++) i ? g.lineTo(s.sig[i][0], s.sig[i][1]) : g.moveTo(s.sig[i][0], s.sig[i][1]); g.stroke(); } };
    s.paper = canvasPlane(0.3, 0.41, 768, (g, w, h) => s.drawC(g, w, h, 0));
    s.paper.rotation.x = -Math.PI / 2; s.paper.position.set(-0.12, 0.004, 0.12); s.paper.rotation.z = 0.12; s.top.add(s.paper); s.sigK = -1;
    s.pen = pen(); s.top.add(s.pen);
    s.env = grp(mesh(new THREE.BoxGeometry(0.24, 0.012, 0.15), M.paper), at(cyl(0.028, 0.028, 0.012, M.wax, 24), 0, 0.012, 0)); const lab = plateText(0.18, 0.05, [['TESTAMENTO', 0.6, 0.5]], { fg: '#2b2218', metal: 0 }); lab.rotation.x = -Math.PI / 2; lab.position.set(0, 0.0065, -0.045); s.env.add(lab);
    s.env.position.set(0.3, 0.006, -0.1); s.env.rotation.y = -0.3; s.top.add(s.env); s.key = key(1.1); s.key.rotation.x = -Math.PI / 2; s.key.position.set(0.24, 0.01, 0.08); s.top.add(s.key);
    s.fam = [figurine(M.ceramic, 1.0), figurine(M.ceramic, 0.95), figurine(M.ceramic, 0.6)]; s.fam.forEach((f, i) => { f.position.set(-0.05 + i * 0.12 - 0.3, 0, -0.4 + (i === 2 ? 0.06 : 0)); s.top.add(f); });
    const J = s.fam[2].userData.J; J.shL.rotation.z = -0.5; s.fam[0].userData.J.shR.rotation.z = 0.35; s.fam[1].userData.J.shL.rotation.z = -0.35;
    s.mag = magnifier(0.9); s.top.add(s.mag);
  }
  // ---------- L7 Penal: esposas, huella en un cristal, marcadores de pruebas, reloj de arena y lupa
  { const s = station('PE', ANG.PE, 1.0);
    s.cuffs = handcuffs(); s.cuffs.position.set(-0.32, 0.01, 0.22); s.cuffs.rotation.y = 0.4; s.top.add(s.cuffs);
    const fpm = new THREE.MeshBasicMaterial({ map: fingerprintTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    s.pane = grp(mesh(new THREE.BoxGeometry(0.34, 0.26, 0.008), M.glass, false), at(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), fpm), 0.04, 0.0, 0.006)); s.fp = fpm;
    s.pane.position.set(0.05, 0.16, -0.12); s.top.add(s.pane); const ft = grp(mesh(new THREE.BoxGeometry(0.36, 0.03, 0.06), M.dsteel)); ft.position.set(0.05, 0.015, -0.12); s.top.add(ft);
    s.mk = [1, 2, 3].map((n, i) => { const m = marker(n); m.position.set(-0.15 + i * 0.16, 0, 0.3 - (i % 2) * 0.08); s.top.add(m); return m; });
    s.hg = hourglass(0.95); s.hg.position.set(0.42, 0, 0.1); s.top.add(s.hg);
    s.mag = magnifier(1.0); s.top.add(s.mag);
  }
  // ---------- L8 Administrativo: el edificio de la Administración, un ciudadano con su recurso y el sello de registro
  { const s = station('AD', ANG.AD, 1.05);
    s.bld = building(0.6); s.bld.position.set(0, 0, -0.25); s.top.add(s.bld);
    s.cit = figurine(M.ceramic, 0.75); s.cit.position.set(-0.1, 0, 0.32); s.cit.rotation.y = Math.PI; s.top.add(s.cit); s.cit.userData.J.shR.rotation.x = -0.9;
    s.doc = canvasPlane(0.06, 0.08, 128, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.font = '900 20px Inter'; g.textAlign = 'center'; g.fillText('RECURSO', w / 2, 30); textLines(g, 14, 48, w - 28, 6, 12, 'rgba(40,36,30,.5)', 4); });
    s.doc.position.set(0, -0.03, 0.02); s.cit.userData.J.hR.add(s.doc); s.doc.scale.setScalar(1 / (0.16 * 0.75)); s.doc.rotation.y = Math.PI;
    s.forms = new THREE.Group(); for (let i = 0; i < 9; i++) { const f = mesh(new THREE.BoxGeometry(0.2, 0.006, 0.27), M.paper); f.position.set((hash(i) - 0.5) * 0.01, 0.003 + i * 0.006, (hash(i * 3) - 0.5) * 0.01); f.rotation.y = (hash(i * 7) - 0.5) * 0.08; s.forms.add(f); }
    s.forms.position.set(0.36, 0, 0.2); s.top.add(s.forms);
    s.mark = canvasPlane(0.16, 0.08, 256, (g, w, h) => { g.strokeStyle = '#b8121b'; g.lineWidth = 7; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#b8121b'; g.font = '900 44px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('REGISTRO', w / 2, h / 2 + 2); }, { tr: true });
    s.mark.rotation.x = -Math.PI / 2; s.mark.position.set(0.36, 0.058, 0.2); s.top.add(s.mark);
    s.stp = rubberStamp('REGISTRO'); s.stp.position.set(0.36, 0.3, 0.2); s.top.add(s.stp);
  }
  // ---------- L9 Mercantil y Laboral: torres de oficinas, la caja del despido y la nómina con monedas
  { const s = station('ME', ANG.ME, 1.0);
    s.tw = [[0.12, 0.62, 0.12, 1], [0.1, 0.44, 0.1, 2], [0.14, 0.34, 0.12, 3]].map(([w, h, d, sd], i) => { const t = tower(w, h, d, sd); t.position.set(-0.46 + i * 0.15, 0, -0.25 + (i % 2) * 0.1); s.top.add(t); return t; });
    s.box = cardboardBox(); s.box.position.set(0.05, 0, 0.12); s.box.rotation.y = 0.3; s.top.add(s.box);
    s.nom = canvasPlane(0.24, 0.32, 512, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'left'; g.font = '900 44px Inter'; g.fillText('NÓMINA', 30, 64); g.font = '600 18px Inter'; g.fillText('RECIBO INDIVIDUAL DE SALARIOS · EJEMPLO', 30, 94);
      const rows = [['DEVENGOS', ''], ['Salario base', '••••'], ['Complementos', '•••'], ['DEDUCCIONES', ''], ['Seguridad Social', '•••'], ['IRPF', '•••'], ['LÍQUIDO A PERCIBIR', '•••• €']]; rows.forEach(([a, b], i) => { g.font = (a === a.toUpperCase() ? '800 ' : '500 ') + '22px Inter'; g.fillText(a, 30, 160 + i * 52); g.textAlign = 'right'; g.fillText(b, w - 30, 160 + i * 52); g.textAlign = 'left'; g.fillStyle = 'rgba(40,36,30,.25)'; g.fillRect(30, 172 + i * 52, w - 60, 2); g.fillStyle = '#2b2218'; }); });
    s.nom.rotation.x = -Math.PI / 2 + 0.0; s.nom.position.set(0.4, 0.004, 0.18); s.nom.rotation.z = -0.15; s.top.add(s.nom);
    s.coins = []; for (let i = 0; i < 7; i++) { const c = coin(0.028); c.position.set(0.42 + (hash(i) - 0.5) * 0.006, 0.004 + i * 0.0065, -0.08); s.top.add(c); s.coins.push(c); }
  }
  // ---------- L10 Procesal: la sala de vistas; la demanda viaja hasta el estrado y vuelve convertida en sentencia
  { const s = station('PR', ANG.PR, 1.05);
    s.court = courtroom(0.72); s.court.position.set(0, 0, -0.02); s.top.add(s.court);
    const docT = (title) => (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 30px Inter'; g.fillText(title, w / 2, 44); textLines(g, 20, 70, w - 40, 8, 16, 'rgba(40,36,30,.5)', title.length); };
    s.dem = canvasPlane(0.12, 0.16, 256, docT('DEMANDA')); s.sen = canvasPlane(0.12, 0.16, 256, docT('SENTENCIA')); s.top.add(s.dem, s.sen);
  }
  // ---------- L11 Internacional y Europeo: el globo con las fronteras reales, España en dorado, las doce estrellas y arcos que salen
  { const s = station('IN', ANG.IN, 1.0);
    const G = new THREE.Group(); G.position.set(0, 0.42, 0); s.top.add(G); s.globe = G;
    const sp2 = sph(0.3, M.ocean, 64, 48); G.add(sp2);
    if (S.countries) { const lines = fatLines(ringSegments(S.countries, 0.302), 0xd8dde6, 1.1, 0.75); G.add(lines); const es = fatLines(ringSegments(S.countries, 0.304, n => n === 'Spain'), 0xffc24a, 3.2, 1); G.add(es); s.es = es; }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.006, 8, 96, Math.PI * 1.2), M.brass); ring.rotation.set(0, 0, Math.PI * 0.4); G.add(ring);
    const stem = grp(at(cyl(0.012, 0.016, 0.12, M.brass, 16), 0, 0.06, 0), at(cyl(0.09, 0.11, 0.025, M.wood, 32), 0, 0.012, 0)); s.top.add(stem);
    s.stars = new THREE.Group(); s.stars.position.set(0, 0.42, 0); for (let i = 0; i < 12; i++) { const st2 = star5(0.03); const a = i * Math.PI / 6; st2.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0); s.stars.add(st2); } s.top.add(s.stars);
    const es0 = [-3.7, 40.4]; s.arcs = [[2.35, 48.86], [-74, 40.7], [139.7, 35.7], [-58.4, -34.6], [28, -26], [37.6, 55.75], [-99, 19.4]].map((d, i) => { const pts = arcPoints(es0, d, 0.35, 80).map(p => p.multiplyScalar(0.305)); const l = drawLine(pts, i % 2 ? 0xffc24a : 0xffe6b0, 2.4, 0.95); G.add(l); return l; });
    G.rotation.set(0.25, 0, 0);
  }
  // ---------- L12 salidas: abogado, juez, fiscal y notario (figuritas con su atributo); y el título solo no basta
  { const s = station('SA', ANG.SA, 1.1);
    const mk = (x, withToga, extra) => { const g = new THREE.Group(); const d = figurine(M.ceramic, 1.25); g.add(d); if (withToga) { const tg = toga(0.2, withToga === 'p'); tg.position.y = 0.0; g.add(tg); } if (extra) g.add(extra); g.position.set(x, 0, 0); s.top.add(g); return g; };
    const brief = grp(rbox(0.09, 0.065, 0.025, M.leather(0x3b2414), 0.008), at(new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 6, 16, Math.PI), M.brass), 0, 0.034, 0)); brief.position.set(0.055, 0.04, 0.03);
    const gv = gavel(0.16); gv.position.set(0.06, 0.1, 0.04); gv.rotation.z = -0.6;
    const fold = grp(rbox(0.07, 0.09, 0.01, M.leather(0x1b2a4a), 0.004)); fold.position.set(0.05, 0.1, 0.04); fold.rotation.z = 0.3;
    const nst = rubberStamp('NOTARÍA'); nst.scale.setScalar(0.5); nst.position.set(0.07, 0, 0.06);
    s.figs = [mk(-0.42, 't', brief), mk(-0.14, 'p', gv), mk(0.14, 't', fold), mk(0.42, null, nst)];
    s.figs[3].children[0].traverse(o => { if (o.isMesh) o.material = M.ceramicD; });
    s.dip = grp(); const dpt = canvasTex(1024, 360, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b08a3e'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 104px Inter'; g.fillText('GRADO EN DERECHO', w / 2, 200); });
    const dp = mesh(new THREE.PlaneGeometry(0.28, 0.1), new THREE.MeshStandardMaterial({ map: dpt, roughness: 0.8, side: THREE.DoubleSide }), false); s.dip.add(dp); s.dip.position.set(0, 0.24, 0.42); s.top.add(s.dip);
  }
  // ---------- L13 para ser abogado: escalera con el máster, las prácticas, el examen estatal y la colegiación; arriba, la toga
  { const s = station('AB', ANG.AB, 1.1);
    s.steps = [0, 1, 2, 3].map(k => { const st2 = mesh(new THREE.BoxGeometry(0.7, 0.07 * (k + 1), 0.17), M.wood); st2.position.set(0, 0.035 * (k + 1), 0.3 - k * 0.17); s.top.add(st2); const e = new THREE.Mesh(new THREE.BoxGeometry(0.702, 0.006, 0.172), M.brass); e.position.set(0, 0.07 * (k + 1), 0.3 - k * 0.17); s.top.add(e); return st2; });
    const it = [book(0.09, 0.12, 0.025, 0x1b2a4a, 'MÁSTER', 'DE ACCESO'), grp(rbox(0.11, 0.08, 0.03, M.leather(0x3b2414), 0.01), at(new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16, Math.PI), M.brass), 0, 0.042, 0)),
      canvasPlane(0.1, 0.13, 256, (g, w, h) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 26px Inter'; g.fillText('EXAMEN', w / 2, 36); g.fillText('ESTATAL', w / 2, 64); textLines(g, 24, 86, w - 48, 9, 14, 'rgba(40,36,30,.45)', 9); g.save(); g.translate(w / 2, h * 0.72); g.rotate(-0.2); g.strokeStyle = '#1d8a3a'; g.lineWidth = 6; g.strokeRect(-80, -30, 160, 60); g.fillStyle = '#1d8a3a'; g.font = '900 44px Inter'; g.fillText('APTO', 0, 15); g.restore(); }, { cs: true }),
      medal()];
    s.items = it.map((o, k) => { o.position.set(0.22, 0.07 * (k + 1) + 0.065, 0.3 - k * 0.17); if (k === 1) o.position.y -= 0.02; s.top.add(o); return o; });
    s.fig = figurine(M.ceramic, 1.1); s.top.add(s.fig);
    s.tg = toga(0.18, false); s.top.add(s.tg);
  }
  // ---------- L14 para ser juez: el test, el tribunal (dos orales) y la Escuela Judicial en Barcelona
  { const s = station('JU', ANG.JU, 1.15);
        s.drawT = (g, w, h, k) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2218'; g.textAlign = 'center'; g.font = '900 34px Inter'; g.fillText('PRIMER EJERCICIO · TEST', w / 2, 52);
      for (let q = 0; q < 12; q++) { const y = 110 + q * 48; g.font = '700 22px Inter'; g.textAlign = 'right'; g.fillText(String(q + 1), 70, y + 8); for (let o = 0; o < 4; o++) { const x = 120 + o * 92; g.strokeStyle = '#2b2218'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 15, 0, 7); g.stroke(); g.font = '700 16px Inter'; g.textAlign = 'center'; g.fillText('ABCD'[o], x, y + 6);
        if (q < Math.floor(12 * k) && o === Math.floor(hash(q * 5.3) * 4)) { g.fillStyle = '#13235c'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.fillStyle = '#2b2218'; } } } };
    s.test = canvasPlane(0.2, 0.27, 512, (g, w, h) => s.drawT(g, w, h, 0), { cs: true }); s.test.position.set(-0.46, 0.17, 0.2); s.test.rotation.set(-0.5, 0.35, 0); s.top.add(s.test); s.testK = -1;
    s.table = grp(at(mesh(new THREE.BoxGeometry(0.66, 0.02, 0.17), M.wood), 0, 0.09, 0), at(mesh(new THREE.BoxGeometry(0.64, 0.002, 0.15), M.felt), 0, 0.101, 0), at(mesh(new THREE.BoxGeometry(0.64, 0.08, 0.01), M.wood), 0, 0.045, 0.075)); s.table.position.set(0.12, 0, -0.32); s.top.add(s.table);
    for (const x of [-0.18, 0.18]) { const l = mesh(new THREE.BoxGeometry(0.02, 0.08, 0.14), M.wood); l.position.set(x, 0.04, 0); s.table.add(l); }
    s.tgv = gavel(0.13); s.tgv.position.set(0.0, 0.112, 0.03); s.tgv.rotation.y = 0.8; s.table.add(s.tgv);
    s.chairs = [0, 1, 2, 3, 4].map(i => { const c = chair(0.2); c.scale.setScalar(0.55); c.position.set(-0.12 + i * 0.12, 0, -0.47); s.top.add(c); return c; });
    s.trib = [0, 1, 2, 3, 4].map(i => { const g = new THREE.Group(); const f = figurine(M.ceramic, 0.9); g.add(f); const tg = toga(0.145, true); g.add(tg); g.position.set(-0.12 + i * 0.12, 0, -0.43); s.top.add(g); return g; });
    s.cand = grp(at(figurine(M.ceramic, 0.9), 0, 0, 0.05), at(mesh(new THREE.BoxGeometry(0.11, 0.1, 0.06), M.wood), 0, 0.05, -0.03), at(mesh(new THREE.BoxGeometry(0.13, 0.012, 0.08), M.wood), 0, 0.104, -0.035, 0, 0.25)); s.cand.position.set(0.12, 0, 0.1); s.cand.rotation.y = Math.PI; s.top.add(s.cand);
    s.bld = building(0.32, M.marble); s.bld.position.set(0.5, 0, 0.18); s.bld.rotation.y = -0.5; s.top.add(s.bld);
    s.pin = grp(at(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 20), plastic(0xd62d2d, 0.25)), 0, 0.035, 0, 0, Math.PI), at(sph(0.028, plastic(0xd62d2d, 0.2)), 0, 0.08, 0)); s.pin.position.set(0.5, 0.33, 0.18); s.top.add(s.pin);
  }
  // ---------- L15 la respuesta: cuatro años de carrera… y la toga, después
  { const s = station('TO', ANG.TO, 1.0);
    s.fig = figurine(M.ceramic, 1.6); s.fig.position.set(0.05, 0, 0); s.top.add(s.fig);
    s.years = [0, 1, 2, 3].map(k => { const b = book(0.16, 0.22, 0.04, [0x6e1414, 0x173d2a, 0x1b2a4a, 0x4a2a14][k], '', ''); b.rotation.x = -Math.PI / 2; b.position.set(-0.22, 0.02 + k * 0.042, 0.1); b.rotation.z = (hash(k) - 0.5) * 0.3; s.top.add(b); return b; });
    s.tg = toga(0.27, true); s.top.add(s.tg);
    s.sp = sparks(s.top, 140, 0xffd58a, 0.025);
    s.dip = diploma(); s.dip.scale.setScalar(0.6); s.dip.position.set(0.3, 0.03, 0.18); s.dip.rotation.y = 0.4; s.top.add(s.dip);
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L5
  { const s = ST.B; if (vis(s, K.asi4 - 0.5, K.civil6 + 1.6)) {
    show(s.col, pop(t, K.derecho5 - 0.12, 0.45)); s.col.rotation.y = 0.4 * (1 - eo(clamp((t - K.derecho5) / 0.8)));
    const ck = pop(t, K.constitucional5 - 0.12, 0.45); show(s.con, ck); s.con.rotation.y = -0.6 * (1 - eo(clamp((t - K.constitucional5) / 0.7)));
    s.pyr.forEach((p, k) => { const kk = pop(t, K.teoria5 - 0.15 + k * 0.12, 0.35); p.visible = kk > 0.002; p.scale.set(kk, kk, kk); p.position.y = 0.0375 + k * 0.075 + 0.25 * (1 - clamp(kk)); });
  } }
  // L6
  { const s = ST.CI; if (vis(s, K.base5, K.penal7 + 1.0)) {
    const pk = pop(t, K.contratos6 - 0.15, 0.4); show(s.paper, pk);
    const sk = clamp((t - K.contratos6 - 0.1) / 0.75); if (Math.abs(sk - s.sigK) > 0.004) { const T = s.paper.userData.tex; s.drawC(T.userData.g, T.userData.c.width, T.userData.c.height, sk); T.needsUpdate = true; s.sigK = sk; }
    const pi = s.sig[Math.min(s.sig.length - 1, Math.floor(sk * (s.sig.length - 1)))], u = pi[0] / 768, v = pi[1] / 1050;
    const pp = v3((u - 0.5) * 0.3, 0, (v - 0.5) * 0.41).applyAxisAngle(_up, 0.12).add(v3(-0.12, 0.004, 0.12));
    s.pen.visible = pk > 0.05 && t < K.todo6 + 0.3; s.pen.position.copy(pp); s.pen.position.y += 0.012 + (sk > 0 && sk < 1 ? 0 : 0.04); s.pen.rotation.set(0.5, 0.3, -0.35);
    show(s.env, pop(t, K.herencias6 - 0.12, 0.4)); show(s.key, pop(t, K.herencias6 + 0.05, 0.4)); s.key.rotation.z = 2 * (1 - eo(clamp((t - K.herencias6) / 0.6)));
    s.fam.forEach((f, i) => show(f, pop(t, K.familia6 - 0.12 + i * 0.09, 0.4)));
    const mk = win(t, K.todo6 - 0.15, 0.45); s.mag.visible = mk > 0.01; s.mag.position.set(-0.12 + 0.02 * Math.sin(t * 3), 0.07 + 0.1 * (1 - mk), 0.25 - 0.02 * mk); s.mag.rotation.set(-Math.PI / 2 + 0.25, 0, 0.6); s.mag.scale.setScalar(0.9 * mk);
  } }
  // L7
  { const s = ST.PE; if (vis(s, K.civil6 + 0.5, K.admin8 + 1.0)) {
    show(s.cuffs, pop(t, K.penal7 - 0.15, 0.45)); s.cuffs.rotation.y = 0.4 + 1.2 * (1 - eo(clamp((t - K.penal7) / 0.6)));
    show(s.pane, pop(t, K.delito7 - 0.3, 0.4)); s.fp.opacity = 0.95 * win(t, K.delito7 - 0.05, 0.35) * (0.85 + 0.15 * Math.sin(t * 7));
    s.mk.forEach((m, i) => show(m, pop(t, K.delito7 + 0.05 + i * 0.1, 0.35)));
    show(s.hg, pop(t, K.pena7 - 0.15, 0.4)); { const u = clamp((t - K.pena7) / 3), U = s.hg.userData; U.top.scale.setScalar(Math.max(0.05, 1 - u * 0.7)); U.bot.scale.setScalar(0.3 + u * 0.7); U.stream.visible = t > K.pena7; }
    const mk = win(t, K.prueba7 - 0.35, 0.4); s.mag.visible = mk > 0.01; s.mag.position.set(0.09 - 0.25 * (1 - mk), 0.17, 0.0); s.mag.rotation.set(0, 0, 0.35); s.mag.scale.setScalar(Math.max(0.001, mk));
  } }
  // L8
  { const s = ST.AD; if (vis(s, K.penal7 + 0.5, K.mercantil9 + 1.0)) {
    const bk = win(t, K.admin8 - 0.25, 0.6); s.bld.visible = bk > 0.01; s.bld.position.y = -0.6 * (1 - bk); s.bld.scale.setScalar(0.6 * (0.6 + 0.4 * bk) * (1 + 0.12 * win(t, K.administracion8 - 0.1, 0.5)));
    show(s.cit, pop(t, K.ciudadano8 - 0.15, 0.4) * (0.75 / 0.75)); s.cit.scale.setScalar(Math.max(0.0001, pop(t, K.ciudadano8 - 0.15, 0.4)) * 0.16 * 0.75);
    show(s.forms, pop(t, K.admin8 + 0.1, 0.4));
    const sd = t - (K.defiende8 - 0.05), down = sd > 0 ? (sd < 0.12 ? sd / 0.12 : sd < 0.3 ? 1 : Math.max(0, 1 - (sd - 0.3) / 0.25)) : 0;
    s.stp.visible = t > K.admin8 + 0.1; s.stp.position.y = 0.3 - 0.245 * eio(down); s.mark.visible = sd > 0.12; s.mark.material.opacity = 1;
  } }
  // L9
  { const s = ST.ME; if (vis(s, K.admin8 + 0.5, K.procesal10 + 1.0)) {
    s.tw.forEach((w, i) => { const k = win(t, K.empresas9 - 0.4 + i * 0.08, 0.45); w.visible = k > 0.01; w.scale.set(1, Math.max(0.001, k), 1); });
    const bk = pop(t, K.despidos9 - 0.12, 0.4); show(s.box, bk); s.box.position.x = 0.05 + 0.12 * eio(clamp((t - K.despidos9 - 0.2) / 0.8));
    show(s.nom, pop(t, K.nominas9 - 0.2, 0.4)); s.coins.forEach((c, i) => { const k = clamp((t - K.nominas9 - 0.05 - i * 0.05) / 0.18); c.visible = k > 0; c.position.y = 0.004 + i * 0.0065 + 0.15 * (1 - eo(k)); });
  } }
  // L10
  { const s = ST.PR; if (vis(s, K.mercantil9 + 0.5, K.internacional11 + 1.0)) {
    show(s.court, pop(t, K.procesal10 - 0.15, 0.45) * 0.72);
    const f = clamp((t - K.demanda10) / 0.75), A = v3(-0.26, 0.12, 0.13), B = v3(0, 0.36, -0.2), C2 = v3(0.0, 0.3, 0.22);
    const P = f < 1 ? A.clone().lerp(B, eio(f)).add(v3(0, Math.sin(f * Math.PI) * 0.15, 0)) : B.clone().lerp(C2, eio(clamp((t - K.sentencia10) / 0.4)));
    s.dem.visible = t > K.demanda10 - 0.2 && t < K.sentencia10; s.sen.visible = t >= K.sentencia10; for (const d of [s.dem, s.sen]) { d.position.copy(P); d.rotation.set(-0.4 + f * 0.4, Math.sin(f * 6) * 0.2, 0); d.scale.setScalar(Math.max(0.001, pop(t, K.demanda10 - 0.2, 0.3)) * (t > K.sentencia10 ? 1 + 0.4 * eo(clamp((t - K.sentencia10) / 0.4)) : 1)); }
    const gv = s.court.userData.gavel, gs = t - K.sentencia10 + 0.08; gv.rotation.z = gs > 0 && gs < 0.35 ? -0.9 * Math.sin(Math.min(1, gs / 0.12) * Math.PI / 2) * (gs < 0.12 ? 1 : 1 - (gs - 0.12) / 0.23) : 0;
  } }
  // L11
  { const s = ST.IN; if (vis(s, K.procesal10 + 0.5, K.abogados12 + 1.0)) {
    const gk = pop(t, K.internacional11 - 0.2, 0.5); show(s.globe, gk); s.globe.rotation.y = -1.9 + t * 0.35;
    s.stars.visible = t > K.europeo11 - 0.2; s.stars.children.forEach((st2, i) => { const k = pop(t, K.europeo11 - 0.1 + i * 0.03, 0.3); st2.scale.setScalar(Math.max(0.001, k)); }); s.stars.rotation.z = t * 0.4;
    s.arcs.forEach((l, i) => drawK(l, clamp((t - K.leyes11 - i * 0.12) / 0.6)));
  } }
  // L12
  { const s = ST.SA; if (vis(s, K.internacional11 + 0.5, K.falta13 + 1.0)) {
    const wk = [K.abogados12, K.jueces12, K.fiscales12, K.notarios12];
    s.figs.forEach((f, i) => { const k = pop(t, wk[i] - 0.15, 0.4); f.visible = k > 0.002; f.scale.setScalar(Math.max(0.0001, k)); setOp(f, 1 - 0.65 * win(t, K.ninguno12, 0.4)); });
    const dk = pop(t, K.pero12 - 0.05, 0.4); show(s.dip, dk); s.dip.rotation.set(-0.15, 0.1 * Math.sin(t * 2), 0);
  } }
  // L13
  { const s = ST.AB; if (vis(s, K.carrera12 - 0.6, K.juez14 + 1.0)) {
    const wk = [K.master13, K.practicas13, K.examen13, K.colegiarte13];
    s.items.forEach((o, k) => show(o, pop(t, wk[k] - 0.15, 0.4)));
    let lvl = 0; wk.forEach((w, k) => { lvl += eio(clamp((t - w + 0.25) / 0.35)); });
    const z = 0.38 - lvl * 0.17, y = lvl > 0 ? 0.07 * Math.ceil(lvl - 0.001) : 0, hop = Math.sin((lvl % 1) * Math.PI) * 0.06;
    s.fig.position.set(-0.12, (lvl > 0 ? 0.07 * Math.min(4, Math.floor(lvl + 0.5)) : 0) + hop, z); s.fig.visible = t > K.falta13 - 0.3; const J = s.fig.userData.J; J.hpL.rotation.x = Math.sin(lvl * Math.PI * 2) * 0.5; J.hpR.rotation.x = -Math.sin(lvl * Math.PI * 2) * 0.5;
    const tk = clamp((t - K.colegiarte13 - 0.25) / 0.5); s.tg.visible = tk > 0; s.tg.position.copy(s.fig.position).add(v3(0, 0.45 * (1 - eo(tk)), 0)); s.tg.scale.setScalar(1.1);
  } }
  // L14
  { const s = ST.JU; if (vis(s, K.colegiarte13 - 0.5, K.cuatro15 + 1.0)) {
    show(s.test, pop(t, K.oposicion14 - 0.1, 0.4)); const tk = clamp((t - K.test14 + 0.1) / 0.9); if (Math.abs(tk - s.testK) > 0.01) { const T = s.test.userData.tex; s.drawT(T.userData.g, T.userData.c.width, T.userData.c.height, tk); T.needsUpdate = true; s.testK = tk; }
    const tk2 = win(t, K.juez14 - 0.35, 0.45); s.table.visible = tk2 > 0.01; s.table.position.y = -0.2 * (1 - tk2); s.chairs.forEach(c => { c.visible = tk2 > 0.01; c.position.y = -0.2 * (1 - tk2); });
    s.trib.forEach((g, i) => show(g, pop(t, K.orales14 - 0.2 + i * 0.07, 0.4)));
    show(s.cand, pop(t, K.tribunal14 - 0.2, 0.4));
    show(s.bld, pop(t, K.escuela14 - 0.15, 0.45) * 0.32); show(s.pin, pop(t, K.barcelona14 - 0.1, 0.4)); s.pin.position.y = 0.33 + 0.02 * Math.sin(t * 5);
  } }
  // L15
  { const s = ST.TO; if (vis(s, K.barcelona14 - 0.6, K.dime16 + 0.5)) {
    show(s.fig, pop(t, K.cuatro15 - 0.4, 0.4) * 1); s.fig.scale.setScalar(Math.max(0.0001, pop(t, K.cuatro15 - 0.4, 0.4)) * 0.16 * 1.6);
    s.years.forEach((b, k) => { const kk = clamp((t - K.cuatro15 - 0.05 - k * 0.14) / 0.2); b.visible = kk > 0; b.position.y = 0.02 + k * 0.042 + 0.3 * (1 - eo(kk)); b.position.x = -0.22; });
    const tk = clamp((t - K.toga15 + 0.1) / 0.55); s.tg.visible = tk > 0; s.tg.position.set(0.05, 0.6 * (1 - eo(tk)), 0); s.tg.rotation.y = 1.5 * (1 - eo(tk));
    s.sp.visible = t > K.toga15 + 0.3 && t < K.toga15 + 2.3; if (s.sp.visible) burst(s.sp, v3(0.05, 0.25, 0), t, K.toga15 + 0.3, 0.35, 1.4, false, 0.25);
    show(s.dip, pop(t, K.anos15, 0.4) * 0.6);
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
