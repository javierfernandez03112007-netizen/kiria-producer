// ---------------------------------------------------------------- estaciones en el círculo de radio R_ST (pedestal de madera con canto de latón y su haz de luz;
// su +z local mira hacia fuera, hacia la cámara): D los 33 años y la empresa más valiosa (L3), C la carta, la investigación y la dimisión (L4–L5),
// K la bolsa (L6), P el expediente del espionaje y las dos relaciones (L7–L8) y B la balanza de la pregunta (L9).
const ST = {};
function station(name, a, r = 1.0) {
  const Z = new THREE.Group(); Z.position.copy(stP(a)); Z.rotation.y = a * D2; scene.add(Z);
  const pl = plinth(r, 0.55); Z.add(pl); const lc = lightCone(r * 1.15, 4.6, 0.055); Z.add(lc);
  const top = new THREE.Group(); top.position.y = 0.55; Z.add(top);
  ST[name] = { Z, top, a, cone: lc }; return ST[name];
}
const TOP = 0.55, LAY = BUN.h * 1.02;
function looseBundles(n, parent) { const ms = bundleMats(), out = []; for (let i = 0; i < n; i++) { const b = mesh(bundleGeo(), ms); parent.add(b); out.push(b); } return out; }
function buildStations() {
  // ---------- L3: 33 años al frente (calendario de años y la placa de su mesa) y la empresa más valiosa del mundo (columna de fajos y medalla)
  { const s = station('D', ANG.D, 1.0);
    s.cal = yearCalendar(); s.cal.position.set(-0.3, 0, -0.02); s.cal.rotation.y = 0.3; s.cal.scale.setScalar(1.35); s.cal.userData.s0 = 1.35; s.top.add(s.cal);
    s.np = nameplate('JENSEN HUANG', 'CEO · NVIDIA', 1.0); s.np.position.set(0.0, 0, 0.16); s.top.add(s.np);
    s.col = bundleColumn(50, 1.0); s.col.g.position.set(0.3, 0, -0.16); s.top.add(s.col.g);
    s.med = grp(medal()); s.med.scale.setScalar(1.6); s.top.add(s.med); s.sp = sparks(s.top, 120, 0xffd58a, 0.022);
  }
  // ---------- L4–L5: la carta del domingo, el documento del consejo que se sella y, con «dimitió», la placa que cae y la silla que se va
  { const s = station('C', ANG.C, 1.0);
    s.letter = letterObj(); s.letter.rotation.set(-Math.PI / 2, 0, 0.06); s.letter.position.set(-0.04, 0.003, 0.28); s.letter.scale.setScalar(1.5); s.top.add(s.letter);
    s.pen = pen(); s.pen.rotation.set(Math.PI / 2, 0, -0.6); s.pen.position.set(0.2, 0.01, 0.3); s.top.add(s.pen);
    s.ring = ringObj(0.045, 0.018, 0.008); s.ring.rotation.x = Math.PI / 2; s.ring.position.set(0.24, 0.01, 0.12); s.top.add(s.ring);
    s.doc = boardDoc(); s.doc.rotation.set(-Math.PI / 2, 0, 0.1); s.doc.position.set(-0.32, 0.003, -0.12); s.doc.scale.setScalar(1.3); s.top.add(s.doc);
    s.stp = rubberStamp('ABIERTA'); s.top.add(s.stp);
    s.np = nameplate('JENSEN HUANG', 'CEO', 0.85); s.np.position.set(0.3, 0, -0.06); s.top.add(s.np);
    s.chair = execChair(0.3); s.chair.position.set(0.3, 0, -0.42); s.top.add(s.chair);
  }
  // ---------- L6: la campana de apertura, el panel de la acción (−13 %) y la columna de fajos que pierde su parte de arriba
  { const s = station('K', ANG.K, 1.05);
    s.bell = bellObj(); s.bell.position.set(-0.4, 0, 0.12); s.bell.rotation.y = 0.45; s.top.add(s.bell);
    s.board = tickerBoard(); s.board.position.set(0.04, 0, -0.18); s.board.scale.setScalar(1.25); s.top.add(s.board);
    s.col = bundleColumn(40, 1.0); s.col.g.position.set(0.48, 0, 0.12); s.top.add(s.col.g);
    s.loose = looseBundles(5, s.top);
  }
  // ---------- L7–L8: el expediente con la lupa y el micrófono; la silueta de la mujer (según The Washington Post) y el organigrama con la directiva
  // (según The New York Times). Siluetas sin cara ni nombre
  { const s = station('P', ANG.P, 1.05);
    s.fold = folderObj('EXPEDIENTE', '¿OBJETIVO DE ESPIONAJE?', 'CONFIDENCIAL'); s.fold.position.set(-0.02, 0, 0.26); s.fold.rotation.y = -0.08; s.fold.scale.setScalar(1.25); s.top.add(s.fold);
    s.mag = magnifier(1.5); s.top.add(s.mag);
    s.bug = bugObj(); s.bug.scale.setScalar(1.8); s.bug.userData.s0 = 1.8; s.bug.position.set(0.06, 0.016, 0.24); s.top.add(s.bug);
    s.sil1 = silhouette(0.36); s.sil1.position.set(-0.4, 0, -0.18); s.sil1.rotation.y = 0.25; s.top.add(s.sil1);
    s.org = orgChart(); s.org.position.set(0.32, 0, -0.32); s.org.rotation.y = -0.2; s.top.add(s.org);
    s.sil2 = silhouette(0.24); s.sil2.position.set(0.3, 0, -0.06); s.sil2.rotation.y = -0.2; s.top.add(s.sil2);
  }
  // ---------- L9: la balanza. Vida privada (la alianza) frente al cargo (la placa de CEO)
  { const s = station('B', ANG.B, 1.05);
    s.sc = scales(0.75); s.sc.position.set(0, 0, -0.05); s.top.add(s.sc);
    s.ring = ringObj(0.06, 0.024, 0.011); s.np = nameplate('CEO', 'NVIDIA', 0.42); s.top.add(s.ring, s.np);
  }
}
function stationsAt(t) {
  const vis = (s, a, b) => { s.Z.visible = t > a && t < b; return s.Z.visible; };
  // L3
  { const s = ST.D; if (vis(s, K.final2 - 0.4, K.escribio4 + 0.5)) {
    show(s.cal, pop(t, K.jensen3 - 0.1, 0.4)); s.cal.userData.draw(1993 + Math.round(33 * eio(clamp((t - (K.n33 - 0.25)) / (K.frente3 - K.n33 + 0.2)))));
    show(s.np, pop(t, K.huang3 - 0.15, 0.4));
    const k = keyed(t, [[0, 0], [K.nvidia3 - 0.1, 0], [K.mundo3 + 0.2, 48]]); s.col.setN(k, 0.1);
    const mk = pop(t, K.valiosa3 - 0.1, 0.45); s.med.visible = mk > 0.01; s.med.position.set(0.3, s.col.top + 0.17 + 0.012 * Math.sin(t * 3), -0.16); s.med.rotation.y = 0.25 * Math.sin(t * 1.6); s.med.scale.setScalar(Math.max(0.0001, 1.6 * mk));
    s.sp.visible = t > K.valiosa3 && t < K.valiosa3 + 1.8; if (s.sp.visible) burst(s.sp, v3(0.3, s.col.top + 0.17, -0.16), t, K.valiosa3, 0.3, 1.4, false, 0.25);
  } }
  // L4–L5
  { const s = ST.C; if (vis(s, K.mundo3 - 0.3, K.abrir6 + 0.3)) {
    s.letter.userData.draw(clamp((t - (K.fui4 - 0.02)) / (K.mujer4 + 0.3 - K.fui4)));
    show(s.doc, pop(t, K.consejo5 - 0.25, 0.4) * 1.3);
    const sd = t - (K.investigacion5 + 0.05), down = sd > 0 ? (sd < 0.12 ? sd / 0.12 : sd < 0.32 ? 1 : Math.max(0, 1 - (sd - 0.32) / 0.25)) : 0;
    s.stp.visible = t > K.consejo5 - 0.2 && t < K.dimitio5 + 0.4; s.stp.position.set(-0.32, 0.3 - 0.295 * eio(down) + 0.1 * (1 - win(t, K.consejo5 - 0.2, 0.3)), -0.12); s.stp.rotation.y = 0.1;
    const dk = sd > 0.1 ? 1 : 0; if (dk !== s.doc.userData.k) { const T = s.doc.userData.tex; s.doc.userData.draw(T.userData.g, T.userData.c.width, T.userData.c.height, dk); T.needsUpdate = true; s.doc.userData.k = dk; }
    const fall = eio(clamp((t - (K.dimitio5 - 0.05)) / 0.45)); s.np.rotation.x = -1.42 * fall; s.np.position.set(0.3, 0.004 * fall, -0.06 - 0.03 * fall);
    const go = eo(clamp((t - (K.dimitio5 - 0.05)) / 1.4)); s.chair.position.set(0.3 + 0.12 * go, 0, -0.42 - 0.28 * go); s.chair.rotation.y = 2.2 * go;
  } }
  // L6
  { const s = ST.K; if (vis(s, K.dimitio5 - 0.3, K.respuesta7 + 0.4)) {
    const hb = s.bell.userData, u = t - K.abrir6; hb.ham.rotation.z = u < 0 ? 0.6 * win(t, K.abrir6 - 0.45, 0.35) : 0.6 * (1 - eo(clamp(u / 0.06))) + 0.35 * clamp((u - 0.12) / 0.4);
    hb.hb.rotation.z = u > 0 ? 0.09 * Math.sin(u * 22) * Math.exp(-u * 2.2) : 0;
    s.board.userData.draw(clamp((t - (K.hundio6 - 0.1)) / (K.n13 + 0.3 - K.hundio6)));
    const fk = t - (K.hundio6 + 0.05); s.col.setN(fk > 0 ? 35 : 40, 0.08);
    s.loose.forEach((b, i) => { const t0 = 0.0 + i * 0.07, u2 = Math.max(0, fk - t0), y0 = 40 * LAY + BUN.h / 2 - i * LAY, ang = 0.6 + i * 1.1;
      b.visible = fk > t0 - 1e-3; if (!b.visible) return; const dx = Math.cos(ang) * 0.35 * u2, dz = Math.sin(ang) * 0.25 * u2;
      const y = Math.max(BUN.h / 2 + 0.002 + i * 0.004, y0 - 4.9 * u2 * u2); b.position.set(0.48 + dx, y, 0.12 + dz); b.rotation.set(1.5 * Math.min(u2, 0.45) * (i % 2 ? 1 : -1), i * 0.7, 2.1 * Math.min(u2, 0.45)); });
  } }
  // L7–L8
  { const s = ST.P; if (vis(s, K.n13 - 0.3, K.crees9 + 0.6)) {
    const mu = eio(clamp((t - (K.investigan7 - 0.2)) / (K.espionaje7 - K.investigan7 + 0.2))); s.mag.position.set(-0.34 + 0.4 * mu, 0.1 - 0.02 * mu, 0.36 - 0.12 * mu); s.mag.rotation.set(-1.0, 0, 0.4 - 0.3 * mu);
    show(s.bug, pop(t, K.espionaje7 - 0.12, 0.35)); s.bug.userData.led.material.emissiveIntensity = 3 * (Math.sin(t * 10) > 0 ? 1 : 0.2);
    show(s.sil1, pop(t, K.mujer8 - 0.15, 0.45)); s.sil1.userData.m.emissive.setHex(0x5a0d12); s.sil1.userData.m.emissiveIntensity = 0.6 * win(t, K.sospechosa8 - 0.1, 0.3);
    show(s.org, pop(t, K.otra8 - 0.3, 0.45)); s.org.userData.draw(clamp((t - (K.relacion8 - 0.05)) / (K.directiva8 + 0.3 - K.relacion8)));
    show(s.sil2, pop(t, K.directiva8 - 0.12, 0.45));
  } }
  // L9: la balanza duda (sube y baja) mientras se hace la pregunta
  { const s = ST.B; if (vis(s, K.crees9 - 0.7, K.mandaselo9 + 1.2)) {
    const u = t - (K.crees9 - 0.1), tilt = u > 0 ? 0.17 * Math.sin(u * 2.4) * Math.exp(-u * 0.22) : 0; scalesTilt(s.sc, tilt);
    const pans = s.sc.userData.pans.map(p => { p.updateWorldMatrix(true, false); const w = p.localToWorld(v3(0, -0.42, 0)); return s.top.worldToLocal(w); });
    s.ring.position.copy(pans[0]).add(v3(0, 0.009 + 0.06, 0)); s.ring.rotation.set(0, 0.2, 0); show(s.ring, pop(t, K.crees9 - 0.4, 0.4));
    s.np.position.copy(pans[1]).add(v3(0, 0.009, 0.0)); s.np.rotation.set(0, -0.15, 0); show(s.np, pop(t, K.crees9 - 0.3, 0.4));
  } }
  for (const k in ST) { const s = ST[k]; if (s.Z.visible) s.cone.material.uniforms.op.value = 0.055; }
}
