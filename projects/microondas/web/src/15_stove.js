// ---------------------------------------------------------------- el cazo al fuego: la cocina eléctrica y el cazo esmaltado son modelos reales escaneados de Poly Haven (CC0);
// la placa grande se pone al rojo, el cazo se ve en corte con el agua y las burbujas que nacen en las rayitas del fondo y suben.
// Unidades: cm. La cocina va lejos del microondas (STOVE_POS), con su encimera a la altura de la del microondas (y ≈ 0).
const STOVE_POS = new THREE.Vector3(100, -88.1, -18), POT_L = v3(-11.5, 87.4, 12.5), POT_R = 8.75, POT_WY = 8.6;
async function loadGLTF(path) { const g = await new GLTFLoader().loadAsync(ASSET + path); g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g.scene; }
function scratchTex() {        // fondo del cazo: esmalte con rayitas finas (donde nacen las burbujas)
  const t = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#d8dde0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const x = hash(i * 1.7) * w, y = hash(i * 2.3) * h, a = hash(i * 3.9) * 6.28, l = 6 + hash(i * 5.1) * 60; g.strokeStyle = `rgba(${hash(i * 7.7) > 0.5 ? '70,72,76' : '255,255,255'},${0.25 + hash(i * 4.4) * 0.4})`; g.lineWidth = 0.6 + hash(i * 6.6) * 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } });
  return t;
}
async function buildStove() {
  const G = new THREE.Group(), U = {}; G.position.copy(STOVE_POS); scene.add(G);
  const st = await loadGLTF('ph/electric_stove/electric_stove_1k.gltf'); st.scale.setScalar(100); G.add(st); U.stove = st;
  const potG = new THREE.Group(); potG.position.copy(POT_L); G.add(potG); U.potG = potG;
  const pot = await loadGLTF('ph/pot_enamel_01/pot_enamel_01_1k.gltf'); pot.scale.setScalar(100); potG.add(pot); U.pot = pot;
  pot.traverse(o => { if (o.name && o.name.includes('lid')) o.visible = false; if (o.isMesh) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; U.potMats = (U.potMats || []).concat(o.material); } });
  // la placa al rojo (encima de la placa de hierro, debajo del cazo)
  const glowT = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,90,30,.0)'); gr.addColorStop(0.35, 'rgba(255,80,20,.85)');
    gr.addColorStop(0.8, 'rgba(200,40,10,.7)'); gr.addColorStop(1, 'rgba(120,20,5,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let r = 0.2; r < 0.48; r += 0.045) { g.strokeStyle = 'rgba(255,170,90,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, r * w, 0, 7); g.stroke(); } });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(9.2, 64), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(POT_L.x, POT_L.y - 0.55, POT_L.z); G.add(glow); U.glow = glow;
  // agua del cazo: cuerpo (se ve en corte), cara del corte y superficie
  const wm = new THREE.MeshPhysicalMaterial({ color: 0x7aa3ae, roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const wb = new THREE.Mesh(new THREE.CylinderGeometry(POT_R - 0.15, POT_R - 0.35, POT_WY - 0.5, 64, 1, true), wm); wb.position.y = (POT_WY + 0.5) / 2; wb.renderOrder = 6; potG.add(wb); U.wb = wb;
  const cutT = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(170,205,215,.35)'); gr.addColorStop(1, 'rgba(60,110,130,.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(2 * (POT_R - 0.2), POT_WY - 0.5), new THREE.MeshPhysicalMaterial({ map: cutT, roughness: 0.04, clearcoat: 1, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  cf.position.set(0, (POT_WY + 0.5) / 2, 0); cf.renderOrder = 7; potG.add(cf); U.cutFace = cf;
  const sf = new THREE.Mesh(new THREE.CircleGeometry(POT_R - 0.15, 64), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.02, clearcoat: 1, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 2 }));
  sf.rotation.x = -Math.PI / 2; sf.position.y = POT_WY; sf.renderOrder = 7; potG.add(sf); U.surf = sf;
  // fondo con rayitas (dentro del cazo)
  const bt = new THREE.Mesh(new THREE.CircleGeometry(POT_R - 0.3, 64), new THREE.MeshPhysicalMaterial({ map: scratchTex(), roughness: 0.35, clearcoat: 0.6 })); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.55; potG.add(bt); U.bottom = bt;
  // burbujas: nacen en el fondo (mitad de atrás, la que se ve en corte), crecen, se sueltan y suben
  const BB = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), bubbleMat(0.95), 160); BB.frustumCulled = false; BB.renderOrder = 8;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < 160; i++) BB.setMatrixAt(i, _o.matrix); potG.add(BB); U.bub = BB;
  // el plano de corte (en coordenadas del mundo): quita la mitad de delante del cazo y del agua
  U.cutP = [new THREE.Plane(new THREE.Vector3(0, 0, -1), STOVE_POS.z + POT_L.z)];
  G.userData = U; return G;
}
// estado: heat (placa al rojo), cut (corte), boil (burbujas: 0..1), t
function stoveAt(SV, t, o) {
  const U = SV.userData, cut = (o.cut ?? 0) > 0.5, heat = o.heat ?? 0, boil = o.boil ?? 0;
  U.glow.material.opacity = heat * (0.85 + 0.1 * Math.sin(t * 7)); U.glow.visible = heat > 0.01;
  if (U._cut !== cut) { U._cut = cut; const cp = cut ? U.cutP : null; for (const m of U.potMats) { m.clippingPlanes = cp; m.needsUpdate = true; } for (const m of [U.wb.material, U.surf.material, U.bottom.material]) { m.clippingPlanes = cp; m.needsUpdate = true; } U.cutFace.visible = cut; }
  U.wb.visible = cut;
  for (let i = 0; i < 160; i++) { const h = q => hash(i * 4.71 + q * 1.37), per = 0.7 + 1.1 * h(1), ph = ((t / per + h(2)) % 1 + 1) % 1, a = Math.PI + h(3) * Math.PI, r = (POT_R - 1.2) * Math.sqrt(h(4));
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r * 0.98; let x = x0, y = 0.6, z = z0, s;
    if (ph < 0.4) s = 0.05 + 0.2 * (ph / 0.4); else { const q = (ph - 0.4) / 0.6; s = 0.25 + 0.08 * q; y = 0.6 + (POT_WY - 0.6) * q * q * 1.15; x += Math.sin(q * 8 + i) * 0.2; }
    const vis = i / 160 < boil && y < POT_WY - 0.1; _o.position.set(x, vis ? y : -1000, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(vis ? s : 0.0001); _o.updateMatrix(); U.bub.setMatrixAt(i, _o.matrix); }
  U.bub.instanceMatrix.needsUpdate = true;
}
