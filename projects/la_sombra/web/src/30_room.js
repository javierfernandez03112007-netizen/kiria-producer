// ---------------------------------------------------------------- «La sombra» (formato «Metáfora visual», en blanco, negro y grises): LA HABITACIÓN.
// Una pared de yeso enorme al fondo (z = −3), suelo de hormigón y, en el suelo, un farol con una vela: la única luz. Entre el farol y la pared, él: cuanto más
// cerca del farol, más grande su sombra en la pared (física de verdad: foco con sombra en la llama). Unidades en metros; el suelo es y = 0.
const ROOM = { wallZ: -3.0, wallW: 14, wallH: 14 };
const LAMP = _v(-1.4, 0, 2.0);                                          // el farol (en el suelo)
const FLAME = () => LAMP.clone().add(_v(0, 0.27, 0));                   // la llama
const gm = (v, r = 0.85, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(v, v, v), roughness: r, ...o });
function tex2(w, h, draw, rep) { const c = cnv(w, h), g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
// yeso: grano fino, manchas suaves y alguna grieta; hormigón: árido y juntas
function plasterMat() { const R = rng(41), N = noise2(R, 256, 256, 6);
  const t = tex2(1024, 1024, (c, W, H) => { const id = c.createImageData(W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = N[((y >> 2) % 256) * 256 + ((x >> 2) % 256)], g = 176 + n * 42 + (R() - 0.5) * 10, i = (y * W + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = g; id.data[i + 3] = 255; } c.putImageData(id, 0, 0);
    c.strokeStyle = 'rgba(70,70,70,0.35)'; c.lineWidth = 1.4; for (let k = 0; k < 4; k++) { let x = R() * W, y = R() * H; c.beginPath(); c.moveTo(x, y); for (let s = 0; s < 14; s++) { x += (R() - 0.5) * 30; y += 8 + R() * 18; c.lineTo(x, y); } c.stroke(); } }, [3, 3]);
  const [, hc] = stuccoCanvases([128, 128, 128], 43, 512); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.93, color: new THREE.Color(0.72, 0.72, 0.72) }); m.normalMap = normalFrom(hc, 1.6); m.normalMap.repeat.set(4, 4); m.normalScale.set(0.5, 0.5); return m; }
function concreteMat() { const R = rng(47), N = noise2(R, 256, 256, 5);
  const t = tex2(1024, 1024, (c, W, H) => { const id = c.createImageData(W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = N[((y >> 2) % 256) * 256 + ((x >> 2) % 256)], s = R(), g = 72 + n * 34 + (s > 0.985 ? 26 : s < 0.012 ? -18 : 0), i = (y * W + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = g; id.data[i + 3] = 255; } c.putImageData(id, 0, 0);
    c.strokeStyle = 'rgba(20,20,20,0.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke(); }, [3, 3]);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.82 }); }
function buildRoom(G) { const g = new THREE.Group(); G.add(g); const U = {}; g.userData = U;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.wallW, ROOM.wallH, 1, 1), plasterMat()); wall.position.set(0.5, ROOM.wallH / 2, ROOM.wallZ); wall.receiveShadow = true; g.add(wall); U.wall = wall;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.wallW, 16), concreteMat()); floor.rotation.x = -Math.PI / 2; floor.position.set(0.5, 0, ROOM.wallZ + 8); floor.receiveShadow = true; g.add(floor); U.floor = floor;
  g.add(box(ROOM.wallW, 0.12, 0.03, gm(0.32, 0.7), 0.5, 0.06, ROOM.wallZ + 0.015));                                   // rodapié
  return g; }
// el farol: base, cuatro postes, cristales, tejadillo con asa y una vela con su llama
function buildLantern(G) { const g = new THREE.Group(); g.position.copy(LAMP); G.add(g); const U = {}; g.userData = U; const iron = gm(0.16, 0.45, { metalness: 0.7 });
  g.add(box(0.2, 0.03, 0.2, iron, 0, 0.015, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.018, 0.32, 0.018, iron, sx * 0.085, 0.19, sz * 0.085));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.14, depthWrite: false });
  for (const [x, z, ry] of [[0, 0.085, 0], [0, -0.085, 0], [0.085, 0, Math.PI / 2], [-0.085, 0, Math.PI / 2]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.3), glass); p.position.set(x, 0.19, z); p.rotation.y = ry; g.add(p); }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.08, 4, 1), iron); cap.rotation.y = Math.PI / 4; cap.position.y = 0.39; g.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 8, 24), iron); ring.position.y = 0.46; g.add(ring);
  const candle = cyl(0.028, 0.03, 0.17, gm(0.92, 0.6), 16); candle.position.y = 0.115; g.add(candle);
  U.flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(3.2), toneMapped: false });
  const fg = new THREE.SphereGeometry(1, 16, 12); fg.translate(0, 1, 0); const flame = new THREE.Mesh(fg, U.flameM); flame.scale.set(0.011, 0.022, 0.011); flame.position.y = 0.205; g.add(flame); U.flame = flame;
  U.glow = glowSprite(0xffffff, 0.55, 0.85); U.glow.position.y = 0.24; g.add(U.glow); U.glow2 = glowSprite(0xffffff, 1.6, 0.22); U.glow2.position.y = 0.24; g.add(U.glow2);
  shadowAll(g, false, true); return g; }
// la luz (buildLampLights; buildLights es la del motor): un foco en la llama hacia la pared (la sombra grande) y una luz baja sin sombra para el suelo y el farol
function buildLampLights(G) { const U = {};
  U.sp = new THREE.SpotLight(0xffffff, 7, 30, 0.78, 0.55, 0.6); U.sp.position.copy(FLAME()); U.sp.target.position.set(1.0, 4.2, ROOM.wallZ);
  U.sp.castShadow = true; U.sp.shadow.mapSize.set(2048, 2048); U.sp.shadow.bias = -0.0005; U.sp.shadow.normalBias = 0.008; U.sp.shadow.radius = 1.2; U.sp.shadow.camera.near = 0.12; U.sp.shadow.camera.far = 16;
  G.add(U.sp, U.sp.target);
  U.pt = new THREE.PointLight(0xffffff, 1.6, 3.2, 2); U.pt.position.copy(FLAME()).add(_v(0, 0.05, 0)); G.add(U.pt);
  return U; }
// polvo que flota en la luz (entre el farol y la pared)
const MOTES = { n: 300 };
function buildMotes(G) { const R = rng(13), pos = new Float32Array(MOTES.n * 3); MOTES.s = [];
  for (let i = 0; i < MOTES.n; i++) MOTES.s.push({ x: -2.2 + R() * 4.8, y: 0.1 + R() * 4.2, z: ROOM.wallZ + 0.3 + R() * 5.0, ph: R() * 6.28, v: 0.02 + R() * 0.05, a: 0.05 + R() * 0.12 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = cnv(32, 32), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.32, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending });
  MOTES.p = new THREE.Points(geo, m); MOTES.p.frustumCulled = false; G.add(MOTES.p); }
function motesAt(t) { const a = MOTES.p.geometry.attributes.position; MOTES.s.forEach((s, i) => { a.setXYZ(i, s.x + Math.sin(t * 0.3 + s.ph) * s.a, s.y + ((t * s.v + s.ph) % 1) * 0.25 - 0.12, s.z + Math.cos(t * 0.23 + s.ph * 1.7) * s.a); }); a.needsUpdate = true; }
