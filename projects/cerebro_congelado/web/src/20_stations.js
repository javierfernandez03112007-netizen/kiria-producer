// ---------------------------------------------------------------- en el césped, delante de Homer: dos peanas con 100 figuritas cada una (comer rápido / despacio);
// a las que les da el «cerebro congelado» se les pone la cabeza azul hielo (27 de cada 100 frente a 13; BMJ 2002).
const ST = {};
const _o = new THREE.Object3D();
const softWhite = (c = 0xf7f6f3, r = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.15 });
const PLAT_SP = 0.92, FIG_SC = 30;
function buildStations() {
  ST.plats = [-6.6, 6.6].map((x, k) => { const g = new THREE.Group(); g.position.set(x, GY, 30); scene.add(g);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.25, 0.9, 96), softWhite(0xf4f2ee, 0.4)); top.position.y = 0.45; top.receiveShadow = true; top.castShadow = true; g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(6.05, 0.11, 8, 96), new THREE.MeshStandardMaterial({ color: k ? 0x2e9d57 : 0xd32f2f, roughness: 0.4, emissive: k ? 0x0d3a1f : 0x4a0c0c, emissiveIntensity: 0.6 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.92; g.add(rim);
    const figs = new THREE.InstancedMesh(studentGeo(false), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, clearcoat: 0.4 }), 100); figs.castShadow = true; figs.receiveShadow = true; figs.frustumCulled = false; g.add(figs);
    const pos = [], order = []; _o.position.set(0, 0, 0); _o.rotation.set(0, 0, 0); _o.scale.setScalar(0.0001); _o.updateMatrix();
    for (let i = 0; i < 100; i++) { pos.push(v3(((i % 10) - 4.5) * PLAT_SP, 0.9, (Math.floor(i / 10) - 4.5) * PLAT_SP)); order.push(i); figs.setColorAt(i, _clay); figs.setMatrixAt(i, _o.matrix); }
    order.sort((a, b) => hash(a * 7.3 + k * 13) - hash(b * 7.3 + k * 13)); g.userData = { figs, pos, order, n: k ? 13 : 27 }; g.visible = false; return g; });
}
const _ice = new THREE.Color(0x6fb2f2), _clay = new THREE.Color(0xefe9e1), _cc = new THREE.Color();
function stationsAt(t) {
  const vk = pop(t, K.comes8 - 0.35, 0.5) * (1 - win(t, K.truco9 + 0.1, 0.4)) * (1 - DK);
  ST.plats.forEach((g, k) => { g.visible = vk > 0.002; if (!g.visible) return; g.scale.setScalar(Math.max(0.0001, vk)); const U = g.userData, tf = k ? K.n13 - 0.15 : K.n27 - 0.15;
    for (let j = 0; j < 100; j++) { const i = U.order[j], p = U.pos[i], kk = pop(t, K.comes8 - 0.2 + i * 0.006, 0.3), fz = j < U.n ? clamp((t - tf - j * 0.022) / 0.25) : 0;
      _o.position.set(p.x, p.y + 1.2 * (1 - clamp(kk)), p.z); _o.rotation.set(0, (hash(i * 3.3) - 0.5) * 0.6, fz * 0.06 * Math.sin(t * 30 + i)); _o.scale.setScalar(Math.max(0.0001, FIG_SC * kk)); _o.updateMatrix(); U.figs.setMatrixAt(i, _o.matrix);
      _cc.copy(_clay).lerp(_ice, fz); U.figs.setColorAt(i, _cc); }
    U.figs.instanceMatrix.needsUpdate = true; U.figs.instanceColor.needsUpdate = true; });
}
