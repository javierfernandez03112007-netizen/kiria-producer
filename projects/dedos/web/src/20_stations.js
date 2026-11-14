// ---------------------------------------------------------------- estaciones en el círculo de radio R_ST (pedestal de madera con canto de latón y su haz de luz;
// su +z local mira hacia fuera, hacia la cámara): D el nudillo por dentro (L3), C la resonancia (L4), K el debate y los 20 minutos (L5–L6),
// P las dos manos de Unger (L7) y B las radiografías, el premio y las 215 personas (L8).
const ST = {};
function station(name, a, r = 1.0) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const LH = 0.42;      // escala de las manos de Unger
function buildStations() {
  { const s = station('D', ANG.D, 1.0);
    s.kn = knuckleModel(); s.kn.position.set(-0.02, 0.24, 0.06); s.kn.scale.setScalar(1.35); s.top.add(s.kn);
    s.g = gauge(); s.g.position.set(0.5, 0.28, -0.12); s.g.rotation.y = -0.35; s.top.add(s.g);
    s.sp = sparks(s.top, 80, 0xbfe4ff, 0.018);
  }
  { const s = station('C', ANG.C, 1.0);
    s.mri = mriMachine(); s.mri.position.set(-0.26, 0, -0.08); s.mri.rotation.y = 0.45; s.mri.scale.setScalar(0.85); s.top.add(s.mri);
    s.scr = mriScreen(); s.scr.position.set(0.34, 0, 0.06); s.scr.rotation.y = -0.3; s.scr.scale.setScalar(1.25); s.top.add(s.scr);
  }
  { const s = station('K', ANG.K, 1.05);
    s.j1 = bellJar(); s.j1.position.set(-0.27, 0, 0.12); s.top.add(s.j1);
    s.j2 = bellJar(); s.j2.position.set(0.27, 0, 0.12); s.top.add(s.j2);
    s.clk = clock20(); s.clk.position.set(0, 0.36, -0.3); s.clk.scale.setScalar(1.4); s.top.add(s.clk);
  }
  { const s = station('P', ANG.P, 1.05);
    s.hL = xrayHand(LH); s.hL.scale.x = -LH; s.hL.position.set(-0.22, 0.27, 0.0); s.top.add(s.hL);
    s.hR = xrayHand(LH); s.hR.position.set(0.22, 0.27, 0.0); s.top.add(s.hR);
    for (const x of [-0.22, 0.22]) { const b = cyl(0.07, 0.08, 0.03, M.wood, 32); b.position.set(x, 0.015, 0); s.top.add(b); }
  }
  { const s = station('B', ANG.B, 1.05);
    s.lb = lightBox(); s.lb.position.set(-0.1, 0, -0.2); s.lb.scale.setScalar(1.15); s.top.add(s.lb);
    s.pr = prize(); s.pr.position.set(0.46, 0, 0.0); s.pr.rotation.y = -0.3; s.pr.scale.setScalar(1.3); s.pr.userData.s0 = 1.3; s.top.add(s.pr);
    s.figs = new THREE.InstancedMesh(studentGeo(true), new THREE.MeshPhysicalMaterial({ color: 0xe6e1d8, roughness: 0.4, clearcoat: 0.5 }), 215); s.figs.frustumCulled = false; s.top.add(s.figs);
    s.fpos = []; for (let i = 0; i < 215; i++) { const c = i % 22, r = Math.floor(i / 22); s.fpos.push(v3((c - 10.5) * 0.034, 0, 0.16 + r * 0.032)); }
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L3: al tirar del dedo se abre la articulación, la presión cae y nace la burbuja de golpe
  { const s = ST.D; if (vis(s, K.final2 - 0.4, K.resonancia4 + 0.5)) { const U = s.kn.userData;
    const pull = eio(clamp((t - (K.tirar3 - 0.05)) / 0.6)); U.ph.position.x = 0.05 * pull; U.fluid.scale.set(0.045 + 0.03 * pull, 0.11, 0.11); U.fluid.position.x = 0.025 * pull;
    const pr = eio(clamp((t - (K.presion3 - 0.05)) / 0.5)); s.g.userData.nd.rotation.z = -1.9 + 3.2 * pr;
    const b = t - (K.golpe3 - 0.02), bk = b > 0 ? (b < 0.12 ? eo(b / 0.12) * 1.15 : 1 + 0.15 * Math.exp(-(b - 0.12) * 7) * Math.cos((b - 0.12) * 30)) : 0;
    U.bub.scale.setScalar(Math.max(0.0001, 0.055 * bk)); U.bub.position.x = 0.025 * pull;
    s.sp.visible = b > 0 && b < 0.9; if (s.sp.visible) burst(s.sp, s.top.worldToLocal(U.bub.getWorldPosition(v3(0, 0, 0))), t, K.golpe3, 0.22, 0.8, false, 0.2);
  } }
  // L4: la resonancia: en el monitor aparece la cavidad y el reloj llega a 0,31 s
  { const s = ST.C; if (vis(s, K.burbuja3 - 0.4, K.ruido5)) s.scr.userData.draw(clamp((t - (K.grabaron4 - 0.1)) / (K.segundo4 + 0.3 - K.grabaron4))); }
  // L5–L6: el debate (la burbuja que nace y la que se rompe) y el reloj de 20 minutos (la burbuja se encoge despacio)
  { const s = ST.K; if (vis(s, K.segundo4 - 0.3, K.donald7 - 0.3)) { const A = s.j1.userData, Bq = s.j2.userData;
    const na = t - (K.nacer5 - 0.05), nk = na > 0 ? (na < 0.15 ? eo(na / 0.15) * 1.12 : 1 + 0.12 * Math.exp(-(na - 0.15) * 6) * Math.cos((na - 0.15) * 25)) : 0.0001;
    const shrink = 1 - 0.85 * eio(clamp((t - K.durar6) / (K.crujir6 - K.durar6)));
    A.bub.scale.setScalar(Math.max(0.0001, 0.055 * nk * shrink));
    const ro = t - (K.romperse5 - 0.05); Bq.bub.scale.setScalar(ro > 0 ? Math.max(0.0001, 0.055 * (1 - eo(clamp(ro / 0.1)))) : 0.055);
    Bq.bits.forEach((b, i) => { const a = i * 0.7, u = Math.max(0, ro); b.visible = ro > 0 && ro < 1.4; if (!b.visible) return; b.scale.setScalar(0.011 * (1 - clamp(u / 1.4))); b.position.set(Math.cos(a) * 0.06 * eo(clamp(u / 0.3)), 0.13 + 0.05 * u + Math.sin(a * 1.7) * 0.03, Math.sin(a) * 0.05 * eo(clamp(u / 0.3))); });
    const ck = eio(clamp((t - K.durar6) / (K.minutos6 + 1.0 - K.durar6))); s.clk.userData.hd.rotation.z = -ck * Math.PI * 2;
    s.clk.userData.sweep.geometry.dispose(); s.clk.userData.sweep.geometry = new THREE.CircleGeometry(0.134, 48, Math.PI / 2 - ck * Math.PI * 2, Math.max(0.001, ck * Math.PI * 2));
  } }
  // L7: las dos manos de Unger: la izquierda cruje una y otra vez (dos veces al día, 50 años) y la derecha no
  { const s = ST.P; if (vis(s, K.minutos6, K.tuvo8 + 0.5)) {
    const cyc = t > K.crujio7 - 0.3 && t < K.anos7 + 0.4, ph = (t - (K.crujio7 - 0.3)) / 0.55;
    const ang = [0, 1, 2, 3, 4].map(i => cyc ? flexAt(((ph % 1) + 1) % 1 * 0.55, 0.12 + i * 0.06) * 0.9 : 0); handPose(s.hL, ang);
    s.hL.userData.flashes.forEach((f, i) => { const u = (((ph % 1) + 1) % 1) * 0.55 - (0.12 + i * 0.06); const k = cyc && u > 0 && u < 0.3 ? Math.exp(-u * 9) : 0; f.scale.setScalar(Math.max(0.0001, 0.16 * k)); f.material.opacity = Math.min(1, k * 1.3); });
    handPose(s.hR, [0, 0, 0, 0, 0]);
  } }
  // L8: las radiografías limpias, el premio y las 215 personas
  { const s = ST.B; if (vis(s, K.anos7 - 0.3, K.crujes9 + 0.2)) {
    show(s.pr, pop(t, K.ig8 - 0.15, 0.45));
    const t0 = K.n215 - 0.15; for (let i = 0; i < 215; i++) { const p = s.fpos[i], k = pop(t, t0 + (i % 22) * 0.012 + Math.floor(i / 22) * 0.05, 0.3); _o.position.set(p.x, 0.08 * (1 - clamp(k)), p.z); _o.rotation.set(0, Math.PI, 0); _o.scale.setScalar(Math.max(0.0001, k * 1.1)); _o.updateMatrix(); s.figs.setMatrixAt(i, _o.matrix); }
    s.figs.instanceMatrix.needsUpdate = true;
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
const _o = new THREE.Object3D();
