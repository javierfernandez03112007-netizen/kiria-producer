// ---------------------------------------------------------------- la dentadura gigante de la plaza (monumento de ≈ 3 m… de 30 m a escala de la ciudad): dos arcadas con encías,
// 28 dientes con su forma (incisivos, caninos, premolares con dos cúspides, molares con cuatro y raíces), brackets de acero con ligaduras de colores
// y el arco de alambre; el empaste, la muela que sale volando y la férula transparente (invisible) para la última frase.
const TEETH = [['inc', 8.6], ['lat', 6.6], ['can', 7.6], ['pm', 7.0], ['pm', 6.6], ['mol', 10.2], ['mol', 9.2]];      // de delante a atrás (anchos en mm)
const ARCH = { A: 0.8, B: 1.1, TH: 1.72 };       // arcada: x = A·sin θ, z = −B·(1 − cos θ)
const archP = th => v3(ARCH.A * Math.sin(th), 0, -ARCH.B * (1 - Math.cos(th)));
const archT = th => v3(ARCH.A * Math.cos(th), 0, -ARCH.B * Math.sin(th)).normalize();
function archLen(th) { let L = 0, p = archP(0); for (let i = 1; i <= 60; i++) { const q = archP(th * i / 60); L += q.distanceTo(p); p = q; } return L; }
function thAt(s) { let lo = 0, hi = ARCH.TH; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (archLen(m) < s) lo = m; else hi = m; } return (lo + hi) / 2; }
// diente: caja redondeada deformada según el tipo (corona hacia +y, cara exterior hacia +z); con raíz(es) hacia −y
function toothGeo(type, w, h, d) {
  const g = new THREE.BoxGeometry(1, 1, 1, 8, 10, 8), p = g.attributes.position, c = [];
  const top = new THREE.Color(0xfbf8f1), neck = new THREE.Color(0xe9dcc0);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) || 1, L = Math.hypot(x, y, z) || 1, k = 0.55;      // redondear
    x = x * (1 - k) + x / L * n * k; y = y * (1 - k) + y / L * n * k; z = z * (1 - k) + z / L * n * k;
    const u = y + 0.5;            // 0 en el cuello, 1 en el borde
    let sx = w, sy = h, sz = d;
    if (type === 'inc' || type === 'lat') { sz = d * (1.0 - 0.62 * u); sx = w * (0.82 + 0.22 * u); }                    // pala: fina en el borde
    if (type === 'can') { sz = d * (1.0 - 0.45 * u); sx = w * (0.9 + 0.15 * u) * (1 - 0.75 * Math.pow(Math.max(0, u - 0.55) / 0.45, 1.6) * (Math.abs(x) * 2)); }
    let X = x * sx, Y = y * sy, Z = z * sz;
    if ((type === 'pm' || type === 'mol') && y > 0.2) {          // cúspides en la cara de masticar
      const cx = type === 'mol' ? Math.cos(x * Math.PI * 2) : 1, cz = Math.cos(z * Math.PI * 2);
      Y += (0.07 + 0.06 * cx * cz) * h * Math.min(1, (y - 0.2) / 0.3);
    }
    p.setXYZ(i, X, Y + h / 2, Z);
    const cc = neck.clone().lerp(top, Math.min(1, u * 1.3)); c.push(cc.r, cc.g, cc.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals();
  const parts = [g.toNonIndexed()];
  const nr = type === 'mol' ? 3 : type === 'pm' ? 2 : 1;      // raíces
  for (let r = 0; r < nr; r++) { const rl = Math.min(h * (type === 'can' ? 1.5 : 1.15), 0.12), cone = new THREE.ConeGeometry(Math.min(w, d) * (nr > 1 ? 0.22 : 0.3), rl, 10, 1);
    cone.rotateX(Math.PI); cone.translate(nr > 1 ? (r - (nr - 1) / 2) * w * 0.32 : 0, -rl / 2 + 0.01, nr === 3 && r === 1 ? -d * 0.2 : 0);
    const q = cone.toNonIndexed(); const cl = []; for (let i = 0; i < q.attributes.position.count; i++) cl.push(neck.r * 0.97, neck.g * 0.93, neck.b * 0.86); q.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); parts.push(q); }
  for (const q of parts) for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'color'].includes(k)) q.deleteAttribute(k);
  return mergeGeometries(parts);
}
function buildTeeth() {
  const T = new THREE.Group(); scene.add(T); S.teeth = T;
  const enamel = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0xffffff, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color(0xfff3e0), sheenRoughness: 0.5 });
  const gumM = new THREE.MeshPhysicalMaterial({ color: 0xd9727f, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new THREE.Color(0xffc4cc) });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1.0, roughness: 0.18 });
  const SC = archLen(ARCH.TH) / TEETH.reduce((a, [, w]) => a + w, 0), stretch = 1;      // mm → unidades: los dientes llenan la arcada con sus proporciones reales
  const mk = (upper) => {
    const J = new THREE.Group(), teeth = [], brackets = [], wirePts = [];
    // encía: herradura extruida (banda entre dos curvas paralelas a la arcada)
    const sh = new THREE.Shape(), N = 48, off = 0.17;
    for (let i = 0; i <= N; i++) { const th = -ARCH.TH + 2 * ARCH.TH * i / N, p = archP(th), n = v3(Math.sin(th), 0, Math.cos(th)); const q = p.clone().addScaledVector(n, off); i ? sh.lineTo(q.x, -q.z) : sh.moveTo(q.x, -q.z); }
    for (let i = N; i >= 0; i--) { const th = -ARCH.TH + 2 * ARCH.TH * i / N, p = archP(th), n = v3(Math.sin(th), 0, Math.cos(th)); const q = p.clone().addScaledVector(n, -off); sh.lineTo(q.x, -q.z); }
    const gg = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.045, bevelSegments: 4, curveSegments: 4 }); gg.rotateX(-Math.PI / 2); gg.translate(0, -0.16, 0);
    const gum = new THREE.Mesh(gg, gumM); gum.castShadow = gum.receiveShadow = true; J.add(gum);
    let s = 0;
    for (const side of [-1, 1]) { s = 0; TEETH.forEach(([type, wmm], idx) => { const w = wmm * SC * stretch, sc = s + w / 2; s += w;
        const th = side * thAt(sc), p = archP(th), t = archT(th);
        const h = (type === 'mol' ? 7.2 : type === 'pm' ? 8.0 : type === 'can' ? 10.5 : 9.8) * SC, dpt = (type === 'mol' ? 10.5 : type === 'pm' ? 8.6 : 7.4) * SC;
        const m = new THREE.Mesh(toothGeo(type, w * 0.94, h, dpt), enamel); m.castShadow = true; m.receiveShadow = true;
        const holder = new THREE.Group(); holder.position.copy(p); holder.position.y = -0.04; holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, v3(0, 1, 0), t.clone().cross(v3(0, 1, 0))));
        holder.add(m); J.add(holder); teeth.push({ holder, mesh: m, type, idx, side, w, h, d: dpt, th });
        if (idx <= 4) { const b = new THREE.Group(); const base = rbox(w * 0.4, h * 0.3, w * 0.12, steel, w * 0.03); base.position.z = 0; b.add(base);
            const lig = new THREE.Mesh(new THREE.TorusGeometry(w * 0.13, w * 0.035, 6, 16), plastic([0x2ec4b6, 0xff4f8b, 0x7b61ff, 0x2ec4b6, 0xff4f8b][idx], 0.35)); lig.position.z = w * 0.07; b.add(lig);
            b.position.set(0, h * 0.5, dpt * (type === 'inc' || type === 'lat' ? 0.36 : 0.45) + 0.01); b.userData.wz = w * 0.08; holder.add(b); b.traverse(o => { if (o.isMesh) o.castShadow = true; }); brackets.push({ b, idx, side, sc: side * sc });
            wirePts.push({ s: side * sc, p: null, b }); } }); }
    wirePts.sort((a, b2) => a.s - b2.s);
    J.userData = { teeth, brackets, wirePts, gum }; return J;
  };
  // mandíbula inferior (dientes hacia arriba) y superior (girada: dientes hacia abajo), con la bisagra atrás
  S.lower = mk(false); S.lower.position.y = 0.2; T.add(S.lower);
  S.upperHinge = new THREE.Group(); S.upperHinge.position.set(0, 0.6, -1.4); T.add(S.upperHinge);
  S.upper = mk(true); S.upper.position.set(0, 0.0, 1.4); S.upper.rotation.set(0, 0, Math.PI); S.upper.scale.set(1.05, 1, 1.06); S.upperHinge.add(S.upper);
  // arcos de alambre (se dibujan al final de los brackets)
  S.wires = [S.lower, S.upper].map(J => { const W2 = new THREE.Mesh(new THREE.BufferGeometry(), steel); W2.castShadow = true; J.add(W2); J.userData.wire = W2; return W2; });
  // empaste (primer molar superior izquierdo) y la muela que sale (segundo molar inferior derecho)
  { const tu = S.lower.userData.teeth.find(q => q.type === 'mol' && q.idx === 5 && q.side === -1); S.cavityTooth = tu;
    S.cavity = new THREE.Mesh(new THREE.CircleGeometry(tu.w * 0.22, 20), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.9 })); S.cavity.rotation.x = -Math.PI / 2; S.cavity.position.set(0, tu.h * 1.06, 0); tu.holder.add(S.cavity);
    S.filling = new THREE.Mesh(new THREE.SphereGeometry(tu.w * 0.24, 20, 10, 0, 6.283, 0, 1.2), new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.85, roughness: 0.25 })); S.filling.scale.y = 0.35; S.filling.position.set(0, tu.h * 1.04, 0); tu.holder.add(S.filling);
    S.pullTooth = S.lower.userData.teeth.find(q => q.type === 'mol' && q.idx === 6 && q.side === 1); }
  // férula transparente (invisible) sobre la mitad derecha
  S.aligner = new THREE.Group(); const clear = new THREE.MeshPhysicalMaterial({ color: 0xcdeeff, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.55, depthWrite: false, emissive: 0x2a6f8f, emissiveIntensity: 0.25 });
  for (const J of [S.lower, S.upper]) for (const q of J.userData.teeth) if (q.side === 1) { const a = new THREE.Mesh(q.mesh.geometry, clear); a.scale.set(1.07, 1.06, 1.12); a.position.y = 0.004; a.renderOrder = 8; q.holder.add(a); a.userData.al = true; q.alMesh = a; }
  T.position.set(PLZ.x, 0.012, PLZ.z + 0.6); T.scale.setScalar(1.5);
  S.teethBase = T.scale.x;
}
function wireGeo(J, k) {      // arco de alambre por los brackets que ya están puestos
  J.updateMatrixWorld(true); const pts = []; const inv = new THREE.Matrix4().copy(J.matrixWorld).invert();
  for (const w of J.userData.wirePts) { if (!w.b.visible || w.b.scale.x < 0.5) continue; const p = new THREE.Vector3(0, 0, w.b.userData.wz || 0.03); w.b.localToWorld(p); pts.push(p.applyMatrix4(inv)); }
  if (pts.length < 2 || k <= 0.01) return null;
  const curve = new THREE.CatmullRomCurve3(pts); const n = Math.max(2, Math.round(80 * k)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(80).slice(0, n + 1)), n, 0.011, 6, false);
}
function teethAt(t) {
  const T = S.teeth; T.visible = true;
  // la boca se cierra de golpe justo al empezar (y, para el bucle, se abre y se vuelve a cerrar al final); se abre para empastar y sacar la muela
  const tl = t > END - 1.05 ? t - END : t;
  let open = 0.55 * clamp((tl + 1.0) / 0.35) * (1 - eio(clamp((tl + 0.4) / 0.48)));
  if (t > 0.08 && t < 0.4) open -= 0.03 * Math.sin(Math.PI * clamp((t - 0.08) / 0.3));
  open = Math.max(open, 0.95 * win(t, K.acabar4 - 0.3, 0.45) * (1 - win(t, K.brackets4 - 0.25, 0.4)));
  S.upperHinge.rotation.x = -open;
  // empaste
  { const c = win(t, K.acabar4 - 0.2, 0.2), f = pop(t, K.empastar4 - 0.05, 0.35); S.cavity.visible = c > 0.5 && f < 0.5 && t < END - 1.2; S.filling.visible = f > 0.01 && t < END - 1.2; S.filling.scale.set(Math.max(0.0001, f), 0.35 * Math.max(0.0001, f), Math.max(0.0001, f)); }
  // la muela sale volando
  { const q = S.pullTooth, u = clamp((t - K.muelas4 + 0.05) / 0.9); if (t < END - 1.2 && u > 0) { const e = eio(Math.min(1, u * 1.4)); q.holder.position.y = -0.04 + 0.35 * e + 1.2 * Math.max(0, u - 0.5) ** 2; q.mesh.rotation.set(1.2 * Math.max(0, u - 0.3), 0, 0.8 * Math.max(0, u - 0.35)); q.holder.visible = u < 0.98 || t > K.todo4; if (t > K.todo4) { const r = pop(t, K.todo4, 0.35); q.holder.position.y = -0.04; q.mesh.rotation.set(0, 0, 0); q.mesh.scale.setScalar(Math.max(0.0001, r)); } else q.mesh.scale.setScalar(1); }
    else { q.holder.position.y = -0.04; q.mesh.rotation.set(0, 0, 0); q.holder.visible = true; } }
  // brackets: puestos desde el principio; se quitan al «acabar» y se vuelven a poner uno a uno con «brackets» (y el alambre)
  for (const J of [S.lower, S.upper]) { const B = J.userData.brackets;
    B.forEach(({ b, idx, side }) => { const t0 = K.brackets4 - 0.25 + idx * 0.05 + (side > 0 ? 0.025 : 0) + (J === S.upper ? 0.0 : 0.12);
      const off = win(t, K.acabar4 - 0.25, 0.25) * (1 - win(t, t0, 0.01)), k = t < t0 ? 1 - off : pop(t, t0, 0.3); b.visible = k > 0.01; b.scale.setScalar(Math.max(0.0001, k)); });
    const wk = t > K.acabar4 - 0.3 && t < K.brackets4 + 0.9 ? clamp((t - K.brackets4 - 0.25) / 0.6) : 1; const key = Math.round(wk * 20) + '_' + B.filter(x => x.b.visible && x.b.scale.x >= 0.5).length;
    if (J.userData.wireKey !== key) { J.userData.wireKey = key; const g = wireGeo(J, wk); J.userData.wire.geometry.dispose(); J.userData.wire.geometry = g || new THREE.BufferGeometry(); J.userData.wire.visible = !!g; } }
  // férula transparente (última frase): aparece en la mitad derecha
  { const a = win(t, K.invisibles8 - 0.2, 0.3) * (1 - win(t, END - 1.2, 0.3)); for (const J of [S.lower, S.upper]) for (const q of J.userData.teeth) if (q.alMesh) { q.alMesh.visible = a > 0.01; q.alMesh.material.opacity = 0.55 * a; }
    for (const J of [S.lower, S.upper]) J.userData.brackets.forEach(({ b, side }) => { if (side > 0 && a > 0.5) b.visible = false; }); }
  T.rotation.y = 0.04 * Math.sin(t * 0.4);
}
