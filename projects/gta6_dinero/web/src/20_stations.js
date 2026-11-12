// ---------------------------------------------------------------- estaciones en el círculo de radio R_ST (pedestal de madera con canto de latón y su haz de luz;
// su +z local mira hacia fuera, hacia la cámara): D los fajos del primer día (L3), C las copias frente a Brasil (L4), K el coste (L5–L6), P el precio (L7)
// y B la balanza de la respuesta (L8–L9).
const ST = {};
function station(name, a, r = 1.0) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55, LAY = BUN.h * 1.02;
const lay = musd => musd / 25;                    // capas de fajos: 25 M$ por capa (escala de la frase 3)
function buildStations() {
  // ---------- L3: el primer día (800 M$) y a los tres días (1.000 M$): columna de fajos, calendario de taco y medalla del récord
  { const s = station('D', ANG.D, 1.0);
    s.col = bundleColumn(44, 1.0); s.col.g.position.set(0.12, 0, -0.04); s.top.add(s.col.g);
    s.cal = dayCalendar(); s.cal.position.set(-0.19, 0, 0.16); s.cal.rotation.y = 0.3; s.top.add(s.cal);
    s.med = grp(medal()); s.med.scale.setScalar(1.6); s.top.add(s.med);
    s.sp = sparks(s.top, 120, 0xffd58a, 0.022);
  }
  // ---------- L4: 230 cajas pequeñas (1 por millón de copias) y 213 figuritas de Brasil encima; sobran 17 (en dorado)
  { const s = station('C', ANG.C, 1.05);
    const cg = new THREE.BoxGeometry(0.03, 0.0045, 0.036), cm = new THREE.MeshPhysicalMaterial({ color: 0x1b1e25, roughness: 0.35, clearcoat: 0.6 }), ct = new THREE.MeshPhysicalMaterial({ map: caseTex('GTA 5', '', TH5), roughness: 0.3, clearcoat: 0.8 });
    s.cases = new THREE.InstancedMesh(cg, [cm, cm, ct, cm, cm, cm], 230); s.cases.castShadow = true; s.cases.receiveShadow = true; s.cases.frustumCulled = false; s.top.add(s.cases);
    s.cpos = []; for (let i = 0; i < 230; i++) { const c = i % 23, r = Math.floor(i / 23); s.cpos.push(v3((c - 11) * 0.04, 0.0023, (r - 4.5) * 0.048 + 0.02)); }
    s.figs = new THREE.InstancedMesh(studentGeo(true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.5 }), 213); s.figs.castShadow = true; s.figs.frustumCulled = false; s.top.add(s.figs);
    const FC = [new THREE.Color(0x1f9e4a), new THREE.Color(0xf2c318), new THREE.Color(0x2c5fd6)]; for (let i = 0; i < 213; i++) s.figs.setColorAt(i, FC[hash(i * 7.7) < 0.55 ? 0 : hash(i * 3.3) < 0.7 ? 1 : 2]);
    s.glow = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.16), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.5); r.addColorStop(0, 'rgba(255,200,90,.9)'); r.addColorStop(1, 'rgba(255,170,50,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.glow.rotation.x = -Math.PI / 2; s.top.add(s.glow);
  }
  // ---------- L5–L6: el coste. La caja de GTA 6, el documento que se sella «NO», la maqueta del rascacielos, la columna de los analistas y la película más cara
  { const s = station('K', ANG.K, 1.05);
    s.case = gameCase('GTA 6', 'SALE EL 19-11-2026', TH6, 1.3); s.case.position.set(-0.46, 0.11, 0.2); s.case.rotation.set(-0.25, 0.35, 0); s.top.add(s.case);
    s.stand = mesh(new THREE.BoxGeometry(0.16, 0.012, 0.1), M.brass); s.stand.position.set(-0.46, 0.006, 0.21); s.top.add(s.stand);
    s.doc = stampDoc(); s.doc.rotation.x = -Math.PI / 2; s.doc.rotation.z = 0.08; s.doc.position.set(0.02, 0.003, 0.3); s.top.add(s.doc);
    s.stp = rubberStamp('NO'); s.top.add(s.stp);
    s.sky = supertall(0.85); s.sky.position.set(0.32, 0, -0.3); s.top.add(s.sky);
    s.col = bundleColumn(72, 1.0); s.col.g.position.set(0.0, 0, -0.3); s.top.add(s.col.g);
    // la bobina (la película más cara), de pie delante de su columna de fajos (659 M$): antes quedaba justo detrás de la caja de GTA 6
    s.reel = reelBig(0.085); s.reel.position.set(-0.3, 0, -0.11); s.reel.rotation.y = 0.15; s.top.add(s.reel);
    s.col2 = bundleColumn(32, 1.0); s.col2.g.position.set(-0.3, 0, -0.3); s.top.add(s.col2.g);
  }
  // ---------- L7: el precio. La caja de GTA 6 en su atril, la etiqueta de 79,99 € y el tique
  { const s = station('P', ANG.P, 0.95);
    s.case = gameCase('GTA 6', 'SALE EL 19-11-2026', TH6, 1.4); s.case.position.set(-0.07, 0.125, 0.0); s.case.rotation.set(-0.12, 0.15, 0); s.top.add(s.case);
    s.easel = grp(at(mesh(new THREE.BoxGeometry(0.24, 0.012, 0.14), M.brass), 0, 0.006, 0.02), at(mesh(new THREE.BoxGeometry(0.014, 0.24, 0.014), M.brass), 0, 0.12, -0.05, -0.12)); s.easel.position.set(-0.05, 0, 0); s.top.add(s.easel);
    s.tag = priceTagObj(); s.tag.scale.setScalar(1.35); s.top.add(s.tag);
    s.rec = receiptObj(); s.rec.rotation.set(-Math.PI / 2 + 0.05, 0, -0.35); s.rec.position.set(0.25, 0.006, 0.18); s.top.add(s.rec);
  }
  // ---------- L8–L9: la balanza. A la izquierda la película n.º 1 (bobina dorada y sus fajos); a la derecha GTA 6 y los fajos de su primer año
  { const s = station('B', ANG.B, 1.05);
    s.sc = scales(0.75); s.sc.position.set(0, 0, -0.05); s.top.add(s.sc);
    s.reel = reelBig(0.055, true); s.case = gameCase('GTA 6', 'SALE EL 19-11-2026', TH6, 0.72); s.top.add(s.reel, s.case);
    s.L = bundleColumn(9, 0.48); s.R = bundleColumn(10, 0.48); s.top.add(s.L.g, s.R.g);
    s.tag = priceTagObj(); s.tag.scale.setScalar(0.85); s.top.add(s.tag);
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L3
  { const s = ST.D; if (vis(s, K.el3 - 0.4, K.y5 + 0.4)) {
    const k = keyed(t, [[0, 0], [K.primer3 - 0.1, 0], [K.n800 + 0.35, lay(800)], [K.n1000 - 0.1, lay(800)], [K.n1000 + 0.45, lay(1000)]]); s.col.setN(k, 0.1);
    const n = t < K.en3 + 0.05 ? 1 : t < K.n3 + 0.15 ? 2 : 3; s.cal.userData.draw(n); show(s.cal, pop(t, K.primer3 - 0.2, 0.4));
    s.cal.rotation.x = n > 1 && t < K.n3 + 0.6 ? -0.15 * Math.sin(clamp((t - (n === 2 ? K.en3 + 0.05 : K.n3 + 0.15)) / 0.25) * Math.PI) : 0;
    const mk = pop(t, K.record3 - 0.1, 0.45); s.med.visible = mk > 0.01; s.med.position.set(0.12, s.col.top + 0.17 + 0.012 * Math.sin(t * 3), -0.02); s.med.rotation.y = 0.25 * Math.sin(t * 1.6); s.med.scale.setScalar(Math.max(0.0001, 1.6 * mk));
    s.sp.visible = t > K.record3 && t < K.record3 + 1.8; if (s.sp.visible) burst(s.sp, v3(0.12, s.col.top + 0.17, -0.02), t, K.record3, 0.3, 1.4, false, 0.25);
  } }
  // L4
  { const s = ST.C; if (vis(s, K.lleva4 - 0.6, K.rockstar5 + 0.3)) {
    const t0 = K.n230 - 0.2;
    for (let i = 0; i < 230; i++) { const p = s.cpos[i], k = pop(t, t0 + (i % 23) * 0.025 + Math.floor(i / 23) * 0.04, 0.3); _o.position.copy(p); _o.position.y += 0.06 * (1 - clamp(k)); _o.rotation.set(0, (hash(i) - 0.5) * 0.15, 0); _o.scale.setScalar(Math.max(0.0001, k)); _o.updateMatrix(); s.cases.setMatrixAt(i, _o.matrix); }
    s.cases.instanceMatrix.needsUpdate = true;
    const f0 = K.mas4b - 0.15;
    for (let i = 0; i < 213; i++) { const p = s.cpos[i], k = pop(t, f0 + (i % 23) * 0.02 + Math.floor(i / 23) * 0.035, 0.3); _o.position.set(p.x, 0.0045 + 0.08 * (1 - clamp(k)), p.z); _o.rotation.set(0, Math.PI + (hash(i * 3) - 0.5) * 0.4, 0); _o.scale.setScalar(Math.max(0.0001, k * 0.85)); _o.updateMatrix(); s.figs.setMatrixAt(i, _o.matrix); }
    s.figs.instanceMatrix.needsUpdate = true;
    const g0 = s.cpos[213], g1 = s.cpos[229]; s.glow.position.set((g0.x + g1.x) / 2, 0.006, (g0.z + g1.z) / 2); s.glow.scale.set((g1.x - g0.x + 0.08) / 0.75, 1, 1); s.glow.material.opacity = 0.9 * win(t, K.brasil4 - 0.1, 0.4);
  } }
  // L5–L6
  { const s = ST.K; if (vis(s, K.brasil4 + 0.1, K.ti7 + 0.6)) {
    show(s.case, pop(t, K.y5 - 0.1, 0.45) * 1.3); show(s.stand, pop(t, K.y5 - 0.15, 0.4));
    show(s.doc, pop(t, K.rockstar5 - 0.1, 0.4));
    const sd = t - (K.negar5 + 0.02), down = sd > 0 ? (sd < 0.12 ? sd / 0.12 : sd < 0.32 ? 1 : Math.max(0, 1 - (sd - 0.32) / 0.25)) : 0;
    s.stp.visible = t > K.rockstar5 && t < K.analistas6; s.stp.position.set(0.02, 0.32 - 0.31 * eio(down) + 0.1 * (1 - win(t, K.rockstar5, 0.3)), 0.3); s.stp.rotation.y = 0.08;
    const dk = sd > 0.1 ? 1 : 0; if (dk !== s.doc.userData.k) { const T = s.doc.userData.tex; s.doc.userData.draw(T.userData.g, T.userData.c.width, T.userData.c.height, dk); T.needsUpdate = true; s.doc.userData.k = dk; }
    const kk = win(t, K.edificio5 - 0.3, 0.9); s.sky.visible = kk > 0.01; s.sky.scale.set(1, Math.max(0.001, kk), 1);
    const ck = keyed(t, [[0, 0], [K.los6, 0], [K.n1000b + 0.2, 46], [K.n1500 - 0.1, 48], [K.n1500 + 0.35, 58]]); s.col.setN(ck, 0.08);
    show(s.reel, pop(t, K.cualquier6 - 0.2, 0.45)); s.col2.setN(keyed(t, [[0, 0], [K.cualquier6 - 0.1, 0], [K.pelicula6 + 0.3, Math.round(lay(659))]]), 0.08);   // 659 M$ = 26 capas de 25 M$
  } }
  // L7
  { const s = ST.P; if (vis(s, K.mas6 - 0.2, K.respuesta8 + 0.8)) {
    show(s.case, pop(t, K.y7 - 0.2, 0.45) * 1.4); show(s.easel, pop(t, K.y7 - 0.25, 0.4));
    const tk = win(t, K.costara7 - 0.3, 0.45); s.tag.visible = tk > 0.01; s.tag.position.set(0.12, 0.33 + 0.25 * (1 - tk), 0.06); s.tag.rotation.set(0, -0.15, 0.25 * Math.sin((t - K.costara7) * 3.2) * Math.exp(-Math.max(0, t - K.costara7) * 0.8) - 0.1);
    s.rec.visible = t > K.n80 - 0.3; s.rec.scale.set(1, Math.max(0.001, eo(clamp((t - K.n80 + 0.3) / 0.5))), 1);
  } }
  // L8–L9: la balanza. Los fajos de GTA 6 caen uno a uno sobre su platillo y, con «más que la película», ese lado baja
  { const s = ST.B; if (vis(s, K.euros7 + 0.2, K.mandaselo9 + 1.2)) {
    const rk = keyed(t, [[0, 0], [K.respuesta8, 0], [K.segun8, 9]]), gk = keyed(t, [[0, 0], [K.tres8 - 0.1, 0], [K.ano8, 8], [K.mas8 + 0.1, 10]]);
    s.L.setN(rk, 0.15); s.R.setN(gk, 0.15);
    const tilt = keyed(t, [[0, 0], [K.respuesta8 + 0.3, 0], [K.segun8 + 0.3, 0.16], [K.tres8, 0.16], [K.ano8, 0.02], [K.mas8 - 0.05, -0.02], [K.mas8 + 0.4, -0.24]]) + (t > K.mas8 + 0.4 ? 0.025 * Math.sin((t - K.mas8 - 0.4) * 5) * Math.exp(-(t - K.mas8 - 0.4) * 2.5) : 0);
    scalesTilt(s.sc, tilt);
    const pans = s.sc.userData.pans.map(p => { p.updateWorldMatrix(true, false); const w = p.localToWorld(v3(0, -0.42, 0)); return s.top.worldToLocal(w); });
    s.reel.position.copy(pans[0]).add(v3(0.045, 0.009, 0)); s.reel.rotation.y = 0.3; show(s.reel, pop(t, K.euros7 + 0.3, 0.4));
    s.L.g.position.copy(pans[0]).add(v3(-0.04, 0.009, 0.0)); s.L.g.rotation.y = 0.4;
    s.case.position.copy(pans[1]).add(v3(0.04, 0.009 + 0.062, 0.0)); s.case.rotation.set(-0.3, -0.2, 0); show(s.case, pop(t, K.euros7 + 0.4, 0.4) * 0.72);
    s.R.g.position.copy(pans[1]).add(v3(-0.045, 0.009, 0.0)); s.R.g.rotation.y = -0.3;
    const pk = win(t, K.pagarias9 - 0.25, 0.4) * (1 - win(t, K.mandaselo9 + 0.2, 0.3)); s.tag.visible = pk > 0.01; s.tag.userData.m.material.map = s.tag.userData.tB;
    s.tag.position.copy(pans[1]).add(v3(0.1, 0.2 + 0.2 * (1 - pk), 0.06)); s.tag.rotation.set(0, -0.2, 0.2 * Math.sin((t - K.pagarias9) * 3) * Math.exp(-Math.max(0, t - K.pagarias9) * 0.8));
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
