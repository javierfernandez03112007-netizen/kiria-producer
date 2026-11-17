// ---------------------------------------------------------------- el desayuno: taza de café con leche (con su plato y vapor), media tostada con tomate y aceite en su plato,
// y lo que lo prepara en la barra: cafetera, jarrita de leche, tostadora, cuenco de tomate con cuchara y aceitera. Medidas reales (m).
const FOOD = {};
function foodMats() {
  if (FOOD.m) return FOOD.m;
  const cer = new THREE.MeshPhysicalMaterial({ color: 0xfbfaf6, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const toastT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#e2b56a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = hash(i * 1.7); g.fillStyle = v > 0.6 ? 'rgba(150,90,30,.35)' : 'rgba(255,235,190,.35)'; g.beginPath(); g.arc(hash(i * 3.1) * w, hash(i * 5.3) * h, 1 + hash(i * 7) * 4, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(120,70,20,.5)'; g.lineWidth = 10; g.strokeRect(4, 4, w - 8, h - 8); });
  const tomT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#d8351f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = hash(i * 2.3) > 0.5 ? 'rgba(255,120,80,.5)' : 'rgba(150,20,10,.45)'; g.beginPath(); g.arc(hash(i * 3.7) * w, hash(i * 6.1) * h, 2 + hash(i) * 5, 0, 7); g.fill(); }
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,225,150,.8)'; g.beginPath(); g.ellipse(hash(i * 9.1) * w, hash(i * 4.3) * h, 2.5, 1.5, hash(i) * 3, 0, 7); g.fill(); } });
  FOOD.m = { cer, crust: new THREE.MeshStandardMaterial({ color: 0xb9792f, roughness: 0.8 }), crumb: new THREE.MeshStandardMaterial({ map: toastT, roughness: 0.85 }),
    tom: new THREE.MeshPhysicalMaterial({ map: tomT, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 }), oil: new THREE.MeshPhysicalMaterial({ color: 0xe6b422, roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 }),
    coffee: new THREE.MeshStandardMaterial({ color: 0x3a2112, roughness: 0.3 }), steel: metal(0xd5d9df, 0.25), dark: new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.5, metalness: 0.3 }),
    red: paint(0xc8322c, 0.3), milk: new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.4 }), glass: new THREE.MeshPhysicalMaterial({ color: 0x8a9a3a, roughness: 0.08, transparent: true, opacity: 0.55, clearcoat: 1 }) };
  return FOOD.m;
}
// taza con plato; level 0..1 (cuánto líquido), milk 0..1 (color: de café solo a café con leche)
function cupModel() {
  const M = foodMats(), g = new THREE.Group();
  const sau = lathe([[0, 0], [0.072, 0], [0.078, 0.006], [0.07, 0.01], [0.03, 0.008], [0, 0.008]], 40, M.cer); g.add(sau);
  const cup = lathe([[0, 0.008], [0.03, 0.008], [0.036, 0.014], [0.046, 0.06], [0.048, 0.082], [0.045, 0.082], [0.042, 0.062], [0.033, 0.02], [0, 0.018]], 44, M.cer); g.add(cup);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0055, 10, 24, Math.PI * 1.25), M.cer); hd.position.set(0.05, 0.048, 0); hd.rotation.z = -Math.PI * 0.62; hd.castShadow = true; g.add(hd);
  const lm = new THREE.MeshStandardMaterial({ color: 0x3a2112, roughness: 0.35 }), liq = new THREE.Mesh(new THREE.CircleGeometry(1, 36), lm); liq.rotation.x = -Math.PI / 2; g.add(liq);
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.55, 1, 36), new THREE.MeshStandardMaterial({ color: 0xf3e3c8, roughness: 0.6, transparent: true, opacity: 0 })); foam.rotation.x = -Math.PI / 2; g.add(foam);
  const steam = [0, 1, 2].map(i => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); g.add(s); return s; });
  g.userData = { sau, set(level, milk, t = 0, hot = 1) { const y = lerp(0.02, 0.074, clamp(level)), r = lerp(0.034, 0.0445, clamp(level)); liq.visible = level > 0.01; liq.position.y = y; liq.scale.setScalar(r); lm.color.setHex(0x3a2112).lerp(_c.setHex(0xc59a6a), clamp(milk));
      foam.position.y = y + 0.0005; foam.scale.setScalar(r); foam.material.opacity = 0.7 * clamp(milk * 1.3 - 0.3);
      steam.forEach((s, i) => { const u = (t * 0.35 + i / 3) % 1; s.position.set(Math.sin(u * 5 + i * 2) * 0.012, 0.09 + u * 0.11, Math.cos(u * 4 + i) * 0.01); s.scale.setScalar(0.03 + u * 0.05); s.material.opacity = 0.22 * hot * clamp(level * 2 - 0.8) * Math.sin(u * Math.PI); }); } };
  g.userData.set(1, 1); return g;
}
// plato con la media tostada: tomate 0..1 (se extiende de un lado a otro) y aceite 0..1 (gotas y brillo)
function toastModel() {
  const M = foodMats(), g = new THREE.Group(), flat = m => { m.rotation.x = -Math.PI / 2; return m; };
  const plate = lathe([[0, 0], [0.085, 0], [0.115, 0.012], [0.112, 0.016], [0.085, 0.006], [0, 0.006]], 48, M.cer); g.add(plate);
  const T = new THREE.Group(); T.position.y = 0.006; T.rotation.y = 0.35; g.add(T);
  const body = flat(rbox(0.185, 0.08, 0.024, M.crust, 0.03)); body.position.y = 0.012; T.add(body);
  const top = flat(new THREE.Mesh(new THREE.ShapeGeometry(rrShape(0.172, 0.068, 0.028), 12), M.crumb)); top.position.y = 0.0245; top.receiveShadow = true; T.add(top);
  { const uv = top.geometry.attributes.uv, p = top.geometry.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.172 + 0.5, p.getY(i) / 0.068 + 0.5); }
  const tg = new THREE.ShapeGeometry(rrShape(0.16, 0.058, 0.025), 12); { const uv = tg.attributes.uv, p = tg.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.16 + 0.5, p.getY(i) / 0.058 + 0.5); }
  const tm = M.tom.clone(); tm.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)]; const tom = flat(new THREE.Mesh(tg, tm)); tom.position.y = 0.0262; T.add(tom);
  const drops = []; for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.oil); d.position.set((hash(i * 3.3) - 0.5) * 0.14, 0.0275, (hash(i * 7.1) - 0.5) * 0.045); d.userData.s = 0.004 + hash(i * 5.7) * 0.006; T.add(d); drops.push(d); }
  g.userData = { T, set(tomK, oilK) { g.updateMatrixWorld(true); const a = T.localToWorld(v3(-0.08, 0, 0)), b = T.localToWorld(v3(0.08, 0, 0)), n = a.clone().sub(b).normalize(), pt = a.clone().lerp(b, clamp(tomK));
      tm.clippingPlanes[0].setFromNormalAndCoplanarPoint(n, pt); tom.visible = tomK > 0.01; tm.clearcoat = 0.5 + 0.5 * clamp(oilK); tm.roughness = 0.35 - 0.2 * clamp(oilK);
      drops.forEach((d, i) => { const k = clamp(oilK * 1.6 - i / 16 * 0.6); d.visible = k > 0.01; d.scale.set(d.userData.s * k, d.userData.s * 0.35 * k, d.userData.s * k); }); } };
  g.userData.set(1, 1); return g;
}
// la zona de preparación en la barra
function buildPrep() {
  const M = foodMats(), g = new THREE.Group(), U = {};
  // cafetera: cuerpo, grupo, mango del portafiltro, bandeja
  const mc = new THREE.Group(); { const b = rbox(0.62, 0.42, 0.4, M.red, 0.04); b.position.set(0, 0.33, -0.2); mc.add(b); const top = rbox(0.66, 0.05, 0.44, M.steel, 0.02); top.position.set(0, 0.56, -0.2); mc.add(top);
    const grp2 = cyl(0.045, 0.045, 0.06, M.steel, 20); grp2.position.set(0, 0.25, 0.06); mc.add(grp2); const pf = cyl(0.04, 0.035, 0.03, M.dark, 20); pf.position.set(0, 0.205, 0.06); mc.add(pf);
    const hdl = cyl(0.012, 0.012, 0.14, M.dark, 10); hdl.rotation.x = Math.PI / 2; hdl.position.set(0, 0.2, 0.15); mc.add(hdl);
    const tray = rbox(0.5, 0.02, 0.26, metal(0xb9bec6, 0.5), 0.01); tray.position.set(0, 0.012, 0.03); mc.add(tray); const base = rbox(0.62, 0.12, 0.2, M.red, 0.03); base.position.set(0, 0.06, -0.26); mc.add(base);
    for (let i = 0; i < 3; i++) { const c = cyl(0.03, 0.03, 0.006, M.steel, 16); c.rotation.x = Math.PI / 2; c.position.set(-0.2 + i * 0.2, 0.42, 0.005); mc.add(c); } }
  mc.position.set(CUP0.x, BAR.h, CUP0.z - 0.06); g.add(mc);
  U.coffee = cyl(0.0035, 0.0035, 1, M.coffee, 8); g.add(U.coffee);
  // jarrita de leche
  U.jug = new THREE.Group(); { const j = lathe([[0, 0], [0.034, 0], [0.038, 0.03], [0.033, 0.075], [0.037, 0.095], [0.034, 0.095], [0.03, 0.075], [0.035, 0.03], [0, 0.006]], 28, M.steel); U.jug.add(j);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 18, Math.PI), M.steel); h.position.set(-0.04, 0.05, 0); h.rotation.z = Math.PI / 2; U.jug.add(h); const ml = new THREE.Mesh(new THREE.CircleGeometry(0.031, 20), M.milk); ml.rotation.x = -Math.PI / 2; ml.position.y = 0.08; U.jug.add(ml); }
  g.add(U.jug); U.milk = cyl(0.004, 0.003, 1, M.milk, 8); g.add(U.milk);
  // tostadora
  const ts = new THREE.Group(); { const b = rbox(0.3, 0.19, 0.17, M.steel, 0.04); b.position.y = 0.105; ts.add(b); const sl = rbox(0.21, 0.012, 0.035, M.dark, 0.005); sl.position.y = 0.2; ts.add(sl); const kn = cyl(0.015, 0.015, 0.02, M.dark, 12); kn.rotation.z = Math.PI / 2; kn.position.set(0.155, 0.08, 0.03); ts.add(kn); }
  ts.position.set(5.72, BAR.h, -2.3); g.add(ts); U.toaster = ts;
  // cuenco de tomate con su cuchara y la aceitera
  const bowl = lathe([[0, 0], [0.04, 0], [0.07, 0.035], [0.074, 0.05], [0.07, 0.05], [0.04, 0.012], [0, 0.01]], 32, M.cer); bowl.position.set(7.02, BAR.h, -2.3); g.add(bowl);
  const tb = new THREE.Mesh(new THREE.CircleGeometry(0.066, 28), M.tom); tb.rotation.x = -Math.PI / 2; tb.position.set(7.02, BAR.h + 0.042, -2.3); g.add(tb);
  U.spoon = new THREE.Group(); { const b = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.steel); b.scale.set(1, 0.45, 1.4); U.spoon.add(b); const h = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.003, 0.13), M.steel); h.position.set(0, 0.004, 0.085); h.rotation.x = -0.12; U.spoon.add(h);
    const t2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.tom); t2.scale.set(1, 0.5, 1.3); U.spoon.add(t2); U.spoonTom = t2; }
  g.add(U.spoon);
  U.bottle = new THREE.Group(); { const b = lathe([[0, 0], [0.03, 0], [0.032, 0.01], [0.032, 0.12], [0.014, 0.165], [0.012, 0.2], [0.009, 0.2], [0.009, 0.165], [0, 0.165]], 24, M.glass); U.bottle.add(b); const o = cyl(0.027, 0.027, 0.1, M.oil, 20); o.position.y = 0.062; U.bottle.add(o);
    const sp = cyl(0.004, 0.006, 0.05, M.steel, 10); sp.position.y = 0.222; U.bottle.add(sp); }
  g.add(U.bottle); U.oil = cyl(0.0022, 0.0018, 1, M.oil, 8); g.add(U.oil);
  // la taza y el plato con la tostada (los que se preparan y quedan para el plano final)
  U.cup = cupModel(); g.add(U.cup); U.plate = toastModel(); U.plate.position.copy(PLATE); g.add(U.plate);
  U.bread = U.plate.userData.T; g.userData = U; FOOD.prep = g; return g;
}
function stream(m, a, b, k) { m.visible = k > 0.01; if (!m.visible) return; const d = b.clone().sub(a), L = d.length() * clamp(k * 3); m.scale.set(1, Math.max(0.001, L), 1); m.position.copy(a).addScaledVector(d.normalize(), L / 2); m.quaternion.setFromUnitVectors(v3(0, 1, 0), d); }
// o: coffee (0..1 cae el café), milk (0..1 la leche), slide (0..1 la taza va junto al plato), pop (0..1 la tostada salta de la tostadora al plato), tomato, oil (0..1)
function prepAt(t, o = {}) {
  const U = FOOD.prep.userData, cf = clamp(o.coffee ?? 1), mk = clamp(o.milk ?? 1), sl = clamp(o.slide ?? 1), pp = clamp(o.pop ?? 1), tk = clamp(o.tomato ?? 1), ok = clamp(o.oil ?? 1);
  U.cup.position.lerpVectors(CUP0, CUP1, sm5(sl)); U.cup.rotation.y = -0.6; U.cup.userData.set(0.5 * cf + 0.48 * mk, mk, t, 1);
  const spout = v3(CUP0.x, BAR.h + 0.19, CUP0.z); stream(U.coffee, spout, v3(CUP0.x, BAR.h + 0.03 + 0.03 * cf, CUP0.z), cf > 0 && cf < 1 ? 1 : 0);
  // la jarrita: entra, se inclina y echa la leche; se va
  const jk = mk > 0 && mk < 1 ? Math.min(1, mk * 6, (1 - mk) * 6) : 0; U.jug.visible = jk > 0.01; U.jug.position.set(CUP0.x - 0.075, BAR.h + 0.13 + (1 - jk) * 0.12, CUP0.z + 0.01); U.jug.rotation.z = -1.05 * jk;
  stream(U.milk, v3(CUP0.x - 0.028, BAR.h + 0.142, CUP0.z + 0.01), v3(CUP0.x - 0.005, BAR.h + 0.05 + 0.02 * mk, CUP0.z), jk > 0.85 ? 1 : 0);
  // la tostada: sube de la tostadora, salta al plato y cae en su sitio
  { const B = U.bread, home = v3(0, 0.006, 0), a = U.plate.worldToLocal(U.toaster.localToWorld(v3(0, 0.2, 0))); if (pp < 0.3) { const u = pp / 0.3; B.position.copy(a).add(v3(0, -0.07 + 0.09 * eo(u), 0)); B.rotation.set(Math.PI / 2, 0, 0); }
    else { const u = sm5((pp - 0.3) / 0.7); B.position.lerpVectors(a.clone().add(v3(0, 0.02, 0)), home, u); B.position.y += Math.sin(u * Math.PI) * 0.16; B.rotation.set(Math.PI / 2 * (1 - u), 0.35 * u, 0); } B.visible = pp > 0.001; }
  U.plate.userData.set(tk, ok);
  // la cuchara del tomate: va del cuenco a la tostada y la recorre
  { const act = tk > 0 && tk < 1, a = v3(7.02, BAR.h + 0.06, -2.3), p0 = U.bread.localToWorld(v3(-0.085, 0.035, 0)), p1 = U.bread.localToWorld(v3(0.085, 0.035, 0)); let p = a; if (act) p = tk < 0.15 ? a.clone().lerp(p0, tk / 0.15) : p0.clone().lerp(p1, (tk - 0.15) / 0.85);
    U.spoon.visible = act || tk <= 0; U.spoon.position.copy(act ? p.add(v3(0, 0.004 + 0.006 * Math.sin(tk * 40), 0)) : v3(7.02, BAR.h + 0.052, -2.26)); U.spoon.rotation.set(0, 0.4, act ? 0.25 : 0); U.spoonTom.visible = act; }
  // la aceitera: se levanta, se inclina sobre la tostada y la riega de un lado a otro
  { const rest = v3(7.32, BAR.h, -2.22), act = ok > 0 && ok < 1, k = act ? Math.min(1, ok * 5, (1 - ok) * 5) : 0, tx2 = U.bread.localToWorld(v3(lerp(-0.07, 0.07, ok), 0.03, 0));
    U.bottle.position.lerpVectors(rest, v3(tx2.x + 0.19, BAR.h + 0.2, tx2.z - 0.02), k); U.bottle.rotation.z = 1.9 * k; U.bottle.updateMatrixWorld(true);
    stream(U.oil, U.bottle.localToWorld(v3(0, 0.247, 0)), tx2, k > 0.9 ? 1 : 0); }
}
