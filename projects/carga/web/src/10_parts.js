// ---------------------------------------------------------------- piezas: bobinas, móvil, cargador, imanes, moneda, llave, Faraday, barras
// cobre con corriente: trazos que corren a lo largo del hilo (uv.x) + calor (rojo anaranjado)
const COPPERS = [];
function copperMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xc8733f, metalness: 1, roughness: 0.3 });
  const U = { uOff: { value: 0 }, uRep: { value: 60 }, uGlow: { value: 0 }, uHeat: { value: 0 }, uBase: { value: 0.12 }, uCol: { value: new THREE.Color(1.0, 0.55, 0.2) } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2; uniform float uOff, uRep, uGlow, uHeat, uBase; uniform vec3 uCol;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float ph = fract(vUv2.x * uRep - uOff);
        float dash = smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.28, 0.6, ph));
        totalEmissiveRadiance += uCol * (dash * 1.5 + uBase) * uGlow;
        totalEmissiveRadiance += vec3(1.0, 0.24, 0.05) * uHeat * 1.8;`);
  };
  m.customProgramCacheKey = () => 'copperI';
  m.userData.U = U; COPPERS.push(m); return m;
}
class Spiral extends THREE.Curve {
  constructor(r0, r1, turns) { super(); this.r0 = r0; this.r1 = r1; this.turns = turns; }
  getPoint(u, out = new THREE.Vector3()) { const th = u * this.turns * Math.PI * 2, r = this.r0 + (this.r1 - this.r0) * u; return out.set(r * Math.cos(th), r * Math.sin(th), 0); }
}
// bobina plana (espiral en el plano XY local, normal +z) con sus dos patillas
function coil(r0, r1, turns, wr) {
  const g = new THREE.Group(), m = copperMat(); m.userData.U.uRep.value = turns * 5;
  const sp = new THREE.Mesh(new THREE.TubeGeometry(new Spiral(r0, r1, turns), Math.round(turns * 72), wr, 7, false), m); sp.castShadow = true; g.add(sp);
  const lead = tube([v3(r0, 0, 0), v3(r0 * 0.6, -r0 * 0.4, -wr * 2.5), v3(r1 + 0.03, -r0 * 0.5, -wr * 2.5), v3(r1 + 0.06, -r0 * 0.2, -wr * 2.5)], wr * 0.9, m, 24); g.add(lead);
  g.userData = { m, U: m.userData.U, r0, r1, turns, sp };
  return g;
}
function setCurrent(c, glow, off, heat = 0, base = 0.18) { const U = c.userData.U; U.uGlow.value = glow; U.uOff.value = off; U.uHeat.value = heat; U.uBase.value = base; }

// ---------------------------------------------------------------- materiales del móvil y del cargador
function phoneMats() {
  return {
    frame: new THREE.MeshPhysicalMaterial({ color: 0x531523, metalness: 0.85, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.35 }),
    back: new THREE.MeshStandardMaterial({ color: 0x3e0e1b, metalness: 0.35, roughness: 0.4 }),
    bump: new THREE.MeshStandardMaterial({ color: 0x47101f, metalness: 0.55, roughness: 0.2 }),
    lens: new THREE.MeshStandardMaterial({ color: 0x050608, metalness: 0.3, roughness: 0.05 }),
    ring: new THREE.MeshStandardMaterial({ color: 0x8a3a4a, metalness: 1, roughness: 0.22 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x040506, metalness: 0.0, roughness: 0.42, emissive: 0xffffff, emissiveIntensity: 0 }),
    batt: new THREE.MeshStandardMaterial({ color: 0x24272d, metalness: 0.4, roughness: 0.5 }),
    board: new THREE.MeshStandardMaterial({ color: 0x0f2a24, metalness: 0.3, roughness: 0.55 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 0.5, roughness: 0.35 }),
    ferrite: new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.2, roughness: 0.85 }),
    magnet: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 1, roughness: 0.25, emissive: 0x000000 }),
  };
}
function screenTex() {    // pantalla con el anillo de carga (genérico, sin interfaz real)
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(98,227,212,.25)'; g.lineWidth = 18; g.beginPath(); g.arc(w / 2, h * 0.45, 120, 0, 7); g.stroke();
    g.strokeStyle = '#62E3D4'; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.arc(w / 2, h * 0.45, 120, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.35); g.stroke();
    g.fillStyle = '#EEF2F6'; g.beginPath(); [[0.02, -0.075], [-0.045, 0.012], [0.0, 0.012], [-0.02, 0.075], [0.048, -0.01], [0.004, -0.01]].forEach(([x, y], i) => (i ? g.lineTo(w / 2 + x * 900, h * 0.45 + y * 900) : g.moveTo(w / 2 + x * 900, h * 0.45 + y * 900))); g.closePath(); g.fill();
  });
}
// móvil: x = ancho, y = largo, z = grosor (pantalla en +z). Partes separables para el despiece.
const PW = 0.72, PL = 1.48, PT = 0.082;
function buildPhone() {
  const M = phoneMats(), P = new THREE.Group(), parts = {};
  const add = (name, mesh, z, ez, xray = true) => { const g = new THREE.Group(); g.add(mesh); g.userData = { z, ez, xray }; g.position.z = z; P.add(g); parts[name] = g; return g; };
  // marco de aluminio (anillo)
  const outer = rrShape(PW, PL, 0.115), inner = rrShape(PW - 0.024, PL - 0.024, 0.104); outer.holes.push(new THREE.Path(inner.getPoints(48).reverse()));
  const fg = new THREE.ExtrudeGeometry(outer, { depth: PT * 0.8, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 4, curveSegments: 14 }); fg.translate(0, 0, -PT * 0.4);
  const frame = new THREE.Mesh(fg, M.frame); frame.castShadow = true; edges(frame, 0xe7d9dc, 1.2, 30);
  add('frame', frame, 0, 0);
  // trasera de cristal mate + isla de cámaras
  const back = rbox(PW - 0.01, PL - 0.01, 0.008, M.back, 0.11); edges(back, 0xe7d9dc, 1.2, 30);
  const bk = add('back', back, -PT / 2 + 0.004, -0.34);
  const bump = rbox(0.3, 0.3, 0.014, M.bump, 0.07); bump.position.set(-0.17, 0.5, -0.009); bk.add(bump);
  [[-0.235, 0.565], [-0.105, 0.565], [-0.17, 0.44]].forEach(([x, y]) => { const r = cyl(0.052, 0.052, 0.012, M.ring, 40); r.rotation.x = Math.PI / 2; r.position.set(x, y, -0.021); bk.add(r);
    const l = cyl(0.04, 0.04, 0.013, M.lens, 40); l.rotation.x = Math.PI / 2; l.position.set(x, y, -0.022); bk.add(l); });
  const fl = cyl(0.015, 0.015, 0.012, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.3 }), 20); fl.rotation.x = Math.PI / 2; fl.position.set(-0.07, 0.44, -0.02); bk.add(fl);
  // bobina receptora sobre su lámina de ferrita (y los imanes, ocultos hasta su momento)
  const cg = new THREE.Group(); const fer = rbox(0.46, 0.46, 0.004, M.ferrite, 0.05); cg.add(fer); fer.position.z = 0.003;
  const rx = coil(0.07, 0.2, 11, 0.0052); rx.position.z = -0.002; cg.add(rx);
  const mags = new THREE.Group(); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, mg = rbox(0.055, 0.03, 0.006, M.magnet, 0.008); mg.position.set(Math.cos(a) * 0.255, Math.sin(a) * 0.255, 0); mg.rotation.z = a + Math.PI / 2; mags.add(mg); }
  cg.add(mags); mags.visible = false;
  add('coil', cg, -PT / 2 + 0.014, -0.2, false);
  // batería y placa
  const bt = rbox(0.58, 0.84, 0.03, M.batt, 0.04); edges(bt, 0xbfc6cf, 1.1, 30, 0.5);
  const btl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.13), new THREE.MeshStandardMaterial({ map: canvasTex(512, 220, (g, w, h) => { g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5d646d'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#7d858f'; g.font = '700 54px SpaceMono'; g.textAlign = 'center'; g.fillText('Li-ion', w / 2, h / 2 + 18); }), roughness: 0.6 }));
  btl.position.set(0, -0.05, 0.0155); bt.add(btl);
  const bat = add('batt', bt, -0.006, -0.1, false); bat.position.y = -0.2; bat.userData.y = -0.2;
  const bd = rbox(0.6, 0.38, 0.012, M.board, 0.03); for (let i = 0; i < 7; i++) { const c = rbox(0.05 + hash(i) * 0.08, 0.04 + hash(i + 3) * 0.07, 0.01, M.chip, 0.005); c.position.set(-0.22 + (i % 4) * 0.14, -0.1 + Math.floor(i / 4) * 0.17, 0.009); bd.add(c); }
  const brd = add('board', bd, 0.008, 0.08, false); brd.position.y = 0.48; brd.userData.y = 0.48;
  // pantalla
  const sc = rbox(PW - 0.012, PL - 0.012, 0.008, M.screen, 0.11); M.screen.emissiveMap = screenTex(); edges(sc, 0xdfe6ee, 1.2, 30);
  const isl = rbox(0.17, 0.05, 0.002, new THREE.MeshBasicMaterial({ color: 0x000000 }), 0.025); isl.position.set(0, 0.64, 0.0045); sc.add(isl);
  add('screen', sc, PT / 2 - 0.004, 0.32);
  P.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  P.userData = { parts, M, rx, mags };
  scene.add(P); return P;
}
// despiece (0 = cerrado, 1 = abierto) y rayos X (0 = sólido, 1 = solo aristas en las carcasas)
function phoneState(P, ex, xr, edgeBase = 0.1) {
  const { parts } = P.userData;
  for (const k in parts) { const g = parts[k], u = g.userData; g.position.z = u.z + u.ez * ex; }
  for (const k of ['frame', 'back', 'screen']) { const g = parts[k]; setOp(g, 1 - 0.94 * xr); edgeOp(g, edgeBase + 0.85 * xr); }
  for (const k of ['batt', 'board']) setOp(parts[k], 1 - 0.92 * xr);
  edgeOp(parts.batt, 0.25 + 0.5 * xr);
}

// ---------------------------------------------------------------- cargador: disco grafito + bobina emisora dentro + cable
function buildCharger() {
  const C = new THREE.Group();
  const prof = [[0, 0], [0.47, 0], [0.495, 0.008], [0.5, 0.03], [0.5, 0.07], [0.492, 0.09], [0.47, 0.099], [0.43, 0.1], [0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y));
  const shellM = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.15, roughness: 0.55 });
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), shellM); shell.castShadow = true; shell.receiveShadow = true; edges(shell, 0xdfe6ee, 1.2, 24);
  C.add(shell);
  const padM = new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.92 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.003, 96), padM); pad.position.y = 0.1015; pad.receiveShadow = true; C.add(pad);
  const ledM = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x62e3d4, emissiveIntensity: 0 });
  const led = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, 0.022, 4, 10), ledM); led.rotation.z = Math.PI / 2; led.position.set(0, 0.05, 0.499); C.add(led);
  // interior: ferrita, bobina, placa
  const fer = cyl(0.26, 0.26, 0.012, new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 }), 64); fer.position.y = 0.03; C.add(fer);
  const tx = coil(0.085, 0.225, 10, 0.0068); tx.rotation.x = -Math.PI / 2; tx.position.y = 0.0435; C.add(tx);
  const pcb = rbox(0.22, 0.12, 0.01, new THREE.MeshStandardMaterial({ color: 0x0a1714, roughness: 0.6 }), 0.02); pcb.rotation.x = -Math.PI / 2; pcb.position.set(0, 0.018, -0.36); C.add(pcb);
  const mags = new THREE.Group(); const mm = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 1, roughness: 0.25 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, mg = rbox(0.06, 0.032, 0.012, mm, 0.008); mg.rotation.x = -Math.PI / 2; mg.rotation.z = a + Math.PI / 2; mg.position.set(Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3); mags.add(mg); }
  C.add(mags); mags.visible = false;
  // cable trenzado que se va al fondo
  const cable = tube([v3(0, 0.035, -0.49), v3(0, 0.022, -0.75), v3(-0.25, 0.018, -1.3), v3(-1.1, 0.018, -2.2), v3(-2.6, 0.018, -3.4), v3(-5, 0.018, -5.2)], 0.022, new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.6, metalness: 0.2 }), 120);
  C.add(cable);
  C.userData = { shell, pad, shellM, padM, ledM, tx, mags, fer, pcb, cable };
  scene.add(C); return C;
}
function chargerXray(C, xr, edgeBase = 0.12) {
  const u = C.userData;
  u.shellM.transparent = xr > 0.001; u.shellM.opacity = 1 - 0.93 * xr; u.shellM.depthWrite = xr < 0.5; u.shell.material.visible = xr < 0.985;
  u.padM.transparent = xr > 0.001; u.padM.opacity = 1 - 0.96 * xr; u.padM.depthWrite = xr < 0.5; u.pad.visible = xr < 0.985;
  edgeOp(u.shell, edgeBase + 0.8 * xr);
}

// ---------------------------------------------------------------- campo magnético: bucles de dipolo (ρ = ρ0 + L·sen³θ, y = L·sen²θ·cosθ)
// mitad de arriba (se estira hasta el móvil) y mitad de abajo (aplastada: se cierra por la ferrita)
function buildField() {
  const F = new THREE.Group(), up = new THREE.Group(), dn = new THREE.Group(); F.add(up, dn); F.position.y = 0.044;
  S.fieldM = lineMat(TEAL3.clone(), 2.2, 0, true); S.fieldM.dashSize = 0.035; S.fieldM.gapSize = 0.02;
  S.fieldM2 = lineMat(TEAL3.clone().multiplyScalar(0.6), 1.4, 0, true); S.fieldM2.dashSize = 0.02; S.fieldM2.gapSize = 0.03;
  const lines = [];
  const NA = 14, LS = [0.22, 0.36, 0.55, 0.8];
  for (let a = 0; a < NA; a++) {
    const ph = a / NA * Math.PI * 2 + 0.11;
    LS.forEach((L, j) => {
      const r0 = 0.04 + 0.11 * hash(a * 7 + j * 3), mat = j % 2 ? S.fieldM2 : S.fieldM;
      for (const half of [0, 1]) {
        const pts = []; for (let i = 0; i <= 40; i++) { const th = half ? lerp(Math.PI / 2, Math.PI - 0.02, i / 40) : lerp(0.02, Math.PI / 2, i / 40);
          const rho = r0 + L * Math.pow(Math.sin(th), 3), y = L * Math.sin(th) ** 2 * Math.cos(th); pts.push(v3(rho * Math.cos(ph), y, rho * Math.sin(ph))); }
        const l = polyline(pts, mat); (half ? dn : up).add(l); lines.push({ l, half, n: 40, L });
      }
    });
  }
  scene.add(F); S.field = { F, up, dn, lines };
}
function fieldState(t, k, stretch, off, bright = 1) {
  const f = S.field; f.F.visible = k > 0.003;
  f.up.scale.y = stretch; f.dn.scale.set(1, 0.09, 1);
  const ku = clamp(k * 2), kd = clamp(k * 2 - 1);
  for (const o of f.lines) o.l.geometry.instanceCount = Math.round(o.n * (o.half ? kd : ku));
  S.fieldM.opacity = clamp(k * 2) * bright; S.fieldM2.opacity = clamp(k * 2) * bright * 0.8;
  S.fieldM.dashOffset = -off; S.fieldM2.dashOffset = -off * 0.8;
}

// ---------------------------------------------------------------- moneda genérica (sin cara) y llave
function buildCoin() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xc9b47c, metalness: 1, roughness: 0.28, emissive: 0xff3a10, emissiveIntensity: 0 });
  const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = 0.116 + (i % 2 ? 0.0015 : 0); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  const coinG = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.01, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 }); coinG.translate(0, 0, -0.005);
  const c = new THREE.Mesh(coinG, m); c.rotation.x = -Math.PI / 2; c.castShadow = true; g.add(c);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 8, 64), m); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.007; g.add(rim);
  const st = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), m); st.rotation.x = -Math.PI / 2; st.position.y = 0.0075; g.add(st);
  g.userData = { m }; g.visible = false; scene.add(g); return g;
}
function buildKey() {
  const s = new THREE.Shape(); s.absarc(0, 0, 0.06, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.022, 0, Math.PI * 2, true); s.holes.push(hole);
  const b = new THREE.Shape(); b.moveTo(0.05, -0.016); b.lineTo(0.27, -0.016); b.lineTo(0.27, 0.0); b.lineTo(0.255, 0.012); b.lineTo(0.24, 0.0); b.lineTo(0.225, 0.016); b.lineTo(0.205, 0.0); b.lineTo(0.19, 0.014); b.lineTo(0.17, 0.016); b.lineTo(0.05, 0.016); b.closePath();
  const m = new THREE.MeshStandardMaterial({ color: 0xbfc4ca, metalness: 1, roughness: 0.3, emissive: 0xff3a10, emissiveIntensity: 0 });
  const g = new THREE.Group();
  for (const sh of [s, b]) { const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2, curveSegments: 24 }); const k = new THREE.Mesh(geo, m); k.rotation.x = -Math.PI / 2; k.castShadow = true; g.add(k); }
  g.userData = { m }; g.visible = false; scene.add(g); return g;
}

// ---------------------------------------------------------------- anillo de Faraday (1831): hierro + dos devanados + galvanómetro, en plano XY
function buildFaraday() {
  const G = new THREE.Group(); scene.add(G); G.visible = false;
  const R = 0.338, tr = 0.045;
  const ironM = new THREE.MeshStandardMaterial({ color: 0x2c2d31, metalness: 0.85, roughness: 0.45 });
  const U = { uA: { value: 0 } };
  ironM.onBeforeCompile = sh => { sh.uniforms.uA = U.uA;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp; uniform float uA;').replace('void main() {', 'void main() {\n float sA = atan(abs(vLp.x), -vLp.y) / 3.14159265; if (sA > uA) discard;'); };
  ironM.customProgramCacheKey = () => 'ironA';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, tr, 28, 140), ironM); ring.castShadow = true; G.add(ring);
  const ringE = edges(ring, 0xf1e6cf, 1.0, 40, 0);
  const wind = (phc, turns) => { const pts = []; for (let i = 0; i <= turns * 24; i++) { const v = i / (turns * 24), ph = phc + (v - 0.5) * 0.95, ps = v * turns * Math.PI * 2, rw = tr + 0.012;
      pts.push(v3((R + rw * Math.cos(ps)) * Math.cos(ph), (R + rw * Math.cos(ps)) * Math.sin(ph), rw * Math.sin(ps))); }
    const m = copperMat(); m.userData.U.uRep.value = turns * 3; const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 40, 0.0075, 6), m); w.castShadow = true; w.userData = { U: m.userData.U }; G.add(w); return w; };
  const wA = wind(-Math.PI / 2, 9), wB = wind(Math.PI / 2, 9);
  // galvanómetro a la derecha del devanado de arriba, pila a la izquierda del de abajo
  const gal = new THREE.Group(); gal.position.set(0.56, 0.26, 0); G.add(gal);
  const dial = cyl(0.12, 0.12, 0.03, new THREE.MeshStandardMaterial({ color: 0x1a1b1f, metalness: 0.6, roughness: 0.4 }), 48); dial.rotation.x = Math.PI / 2; gal.add(dial); edges(dial, 0xf1e6cf, 1.0, 30, 0.9);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9e1cf'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = '#2a2622'; g.lineWidth = 3;
    for (let i = -5; i <= 5; i++) { const a = -Math.PI / 2 + i * 0.22; g.beginPath(); g.moveTo(128 + Math.cos(a) * 92, 150 + Math.sin(a) * 92); g.lineTo(128 + Math.cos(a) * (i % 5 ? 104 : 112), 150 + Math.sin(a) * (i % 5 ? 104 : 112)); g.stroke(); } }) }));
  face.position.z = 0.016; gal.add(face);
  const needle = new THREE.Group(); needle.position.set(0, -0.022, 0.018); gal.add(needle);
  const nd = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.1, 0.002), new THREE.MeshBasicMaterial({ color: 0xb2201a })); nd.position.y = 0.05; needle.add(nd);
  const pile = new THREE.Group(); pile.position.set(-0.54, -0.33, 0); G.add(pile);
  for (let i = 0; i < 6; i++) { const d = cyl(0.06, 0.06, 0.018, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xb87333 : 0x9aa0a8, metalness: 1, roughness: 0.35 }), 36); d.position.y = i * 0.02; pile.add(d); }
  const wireM = new THREE.MeshStandardMaterial({ color: 0xc8733f, metalness: 1, roughness: 0.35 });
  const wires = [tube([v3(0.15, R + 0.03, 0.04), v3(0.36, 0.36, 0.06), v3(0.48, 0.3, 0.03)], 0.004, wireM, 30), tube([v3(0.15, R - 0.05, -0.04), v3(0.36, 0.2, -0.03), v3(0.5, 0.2, -0.02)], 0.004, wireM, 30),
    tube([v3(-0.15, -R - 0.03, 0.04), v3(-0.36, -0.3, 0.05), v3(-0.5, -0.24, 0.02)], 0.004, wireM, 30), tube([v3(-0.15, -R + 0.05, -0.04), v3(-0.38, -0.38, -0.02), v3(-0.56, -0.34, -0.01)], 0.004, wireM, 30)];
  wires.forEach(w => G.add(w));
  // flujo dentro del hierro: círculo de trazos turquesa
  const cp = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; cp.push(v3(Math.cos(a) * R, Math.sin(a) * R, 0)); }
  S.ironFluxM = lineMat(TEAL3.clone(), 2.4, 0, true); S.ironFluxM.dashSize = 0.03; S.ironFluxM.gapSize = 0.025;
  const flux = polyline(cp, S.ironFluxM); G.add(flux);
  G.userData = { U, ring, ringE, wA, wB, gal, needle, pile, wires, flux, ironM, R };
  return G;
}

// ---------------------------------------------------------------- barras de la prueba (cristal + relleno de luz)
function buildBars() {
  const B = new THREE.Group(); scene.add(B);
  const defs = [{ x: -0.78, z: -1.0, h: 1.426, c: 0xd9dee6, k: 0.85 }, { x: -0.26, z: -1.05, h: 2.101, c: 0xff9a2e, k: 1.0 }, { x: 0.26, z: -1.1, h: 2.562, c: 0xff5a3c, k: 1.0 }];
  B.userData.bars = defs.map(d => {
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); B.add(g);
    const gm = new THREE.MeshPhysicalMaterial({ color: 0x9fb2c8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1, 0.36), gm); shell.position.y = 0.5; g.add(shell); const e = edges(shell, 0xe6ecf2, 1.4, 20, 0.9);
    const fm = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: d.c, emissiveIntensity: d.k, roughness: 0.4, transparent: true, opacity: 0.92 });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), fm); fill.position.y = 0.5; g.add(fill);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.38), basicGlow(d.c, 2.2)); g.add(cap);
    return { g, shell, fill, cap, e, gm, fm, ...d };
  });
  return B;
}
function barState(b, k, fill, a = 1) {
  b.g.visible = k > 0.002; const H = b.h;
  b.shell.scale.set(1, Math.max(0.001, H * eo(clamp(k))), 1); b.shell.position.y = H * eo(clamp(k)) / 2;
  b.e.material.opacity = 0.9 * a * clamp(k * 3); b.gm.opacity = 0.07 * a;
  const fh = Math.max(0.001, H * clamp(fill)); b.fill.scale.set(1, fh, 1); b.fill.position.y = fh / 2; b.fill.visible = fill > 0.001; b.fm.opacity = 0.92 * a;
  b.cap.position.y = fh; b.cap.visible = fill > 0.001; b.cap.material.opacity = a;
}
