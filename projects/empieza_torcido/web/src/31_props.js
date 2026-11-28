// ---------------------------------------------------------------- «Empieza torcido» (v2): EL CUBO PERFECTO, EL MONTÓN DE BLOQUES TACHADOS Y LA ESCALERA.
// El cubo blanco brilla como un espejo (lo pule); los bloques son grises, desiguales y llevan una X de tiza: al final vuelan uno a uno y forman la escalera
// torcida hasta la puerta. El cubo es el primer escalón.
const KNEEL = _v(-1.05, 0, 0.12);                                         // donde está arrodillado (mira a +x)
const CUBE0 = _v(-0.6, 0.15, 0.12);                                      // el cubo, en el suelo delante de él
const STEP0 = _v(-0.45, 0.15, 0.12);                                       // donde lo deja (primer escalón)
const STEPS = { n: 7, dx: 0.27, dy: 0.305, z: 0.12 };
const PILE = { x: -1.6, z: -0.5, n: 10 };
const stepTopAt = i => i === 0 ? _v(STEP0.x, 0.3, STEP0.z) : _v(STEP0.x + STEPS.dx * i, 0.3 + STEPS.dy * i, STEPS.z);
function perfectCube() { const m = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f4, roughness: 0.05, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0xffffff, emissiveIntensity: 0 });
  const b = rboxM(0.3, 0.3, 0.3, 0.006, m, 3); b.userData.m = m; return b; }
let _chalkT = null;
function chalkX() { if (_chalkT) return _chalkT; _chalkT = signTex(256, 256, (c, W, H) => { c.clearRect(0, 0, W, H); c.strokeStyle = 'rgba(245,245,245,0.9)'; c.lineCap = 'round'; c.lineWidth = 16; const R = rng(5);
    for (const [a, b, d, e] of [[0.22, 0.24, 0.78, 0.76], [0.78, 0.22, 0.24, 0.8]]) { for (let k = 0; k < 3; k++) { c.globalAlpha = 0.35 + 0.25 * k; c.beginPath(); c.moveTo(W * a + (R() - 0.5) * 8, H * b + (R() - 0.5) * 8); c.lineTo(W * d + (R() - 0.5) * 8, H * e + (R() - 0.5) * 8); c.stroke(); } } }); return _chalkT; }
const PB = { list: [] };
function buildBlocks(G) { const R = rng(83), xm = new THREE.MeshStandardMaterial({ map: chalkX(), transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
  const [sc, sh] = stuccoCanvases([140, 140, 140], 61, 256);
  // sitio en el montón: dos capas desordenadas; los primeros en volar son los de arriba
  const pileP = []; for (let i = 0; i < PILE.n; i++) { const L = i < 6 ? 0 : 1, a = (L ? (i - 6) / 4 : i / 6) * Math.PI * 2 + L, r = L ? 0.16 : 0.34;
    pileP.push({ p: _v(PILE.x + Math.cos(a) * r * 1.2, 0.14 + L * 0.27, PILE.z + Math.sin(a) * r * 0.8), r: _v((R() - 0.5) * 0.4, R() * 6.28, (R() - 0.5) * 0.4) }); }
  pileP.reverse();
  for (let i = 0; i < PILE.n; i++) { const w = 0.36 + R() * 0.09, h = 0.25 + R() * 0.06, d = 0.44 + R() * 0.12, v = 0.42 + R() * 0.16;
    const m = texMat(sc, sh, [1, 1], { r: 0.88, ns: 0.8 }); m.color.setRGB(v * 1.6, v * 1.6, v * 1.6);
    const b = rboxM(w, h, d, 0.03, m, 2); b.castShadow = b.receiveShadow = true; G.add(b);
    const x = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.78), xm); x.position.z = d / 2 + 0.004; b.add(x);
    const step = i < STEPS.n ? i + 1 : 0, top = step ? stepTopAt(step) : null;
    PB.list.push({ m: b, h, i, step, from: pileP[i], to: step ? { p: top.clone().add(_v((R() - 0.5) * 0.03, -h / 2, (R() - 0.5) * 0.05)), r: _v((R() - 0.5) * 0.1, (R() - 0.5) * 0.34, (R() - 0.5) * 0.2) } : null });
    b.position.copy(pileP[i].p); b.rotation.set(pileP[i].r.x, pileP[i].r.y, pileP[i].r.z); }
  return PB; }
// polvo blanco al posarse cada bloque (partículas que salen y caen)
const DUST = { n: 26 };
function buildDust(G) { const per = DUST.n, tot = per * STEPS.n, pos = new Float32Array(tot * 3), R = rng(7); DUST.seed = [];
  for (let i = 0; i < tot; i++) DUST.seed.push({ a: R() * Math.PI * 2, v: 0.4 + R() * 0.9, up: 0.3 + R() * 0.8, s: R() });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = cnv(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const m = new THREE.PointsMaterial({ color: 0xdedede, size: 0.035, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; G.add(p); DUST.p = p; }
