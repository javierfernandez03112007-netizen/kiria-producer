// ---------------------------------------------------------------- disposición: el ring en el centro y una estación por frase en un círculo alrededor (mirando hacia fuera);
// la cámara va por fuera del círculo, mirando hacia dentro: detrás de cada estación se ve siempre el ring (el duelo)
const R_ST = 5.5, R_CAM = 7.9;
const ANG = { C: 40, D: 80, E: 120, F: 160, G: 200, H: 240, I: 280, J: 320 };
const rad = a => a * Math.PI / 180;
const stP = (a, r = R_ST, y = 0) => v3(r * Math.sin(rad(a)), y, r * Math.cos(rad(a)));
const stT = a => v3(Math.cos(rad(a)), 0, -Math.sin(rad(a)));                  // tangente (x local de la estación)
function station(a) { const G = new THREE.Group(); G.position.copy(stP(a)); G.rotation.y = rad(a); scene.add(G); return G; }
const SW = '#FFB547', IN = '#62E3D4';
// cara de un bloque de código: «{ }» grande y líneas de código
const CODE_TEX = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#121016'; g.fillRect(0, 0, w, h); g.strokeStyle = SW; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = SW; g.font = '900 250px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('{ }', w / 2, h * 0.43);
  const L = [[0.18, 0.5], [0.24, 0.34], [0.24, 0.42], [0.18, 0.2]]; L.forEach(([x, l], i) => { g.fillStyle = i % 2 ? 'rgba(255,181,71,.55)' : 'rgba(238,242,246,.55)'; g.fillRect(w * x, h * (0.7 + i * 0.055), w * l, h * 0.025); }); });
// cara del chip: el «die» con pistas de circuito
const DIE_TEX = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0c1517'; g.fillRect(0, 0, w, h); g.strokeStyle = IN; g.lineWidth = 6; g.strokeRect(30, 30, w - 60, h - 60);
  g.lineWidth = 3; for (let i = 0; i < 26; i++) { const y = 60 + hash(i) * 390, x0 = 40, x1 = 120 + hash(i * 3) * 330; g.strokeStyle = `rgba(98,227,212,${0.35 + hash(i * 7) * 0.5})`; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.lineTo(x1 + 20, y + (hash(i * 5) - 0.5) * 60); g.stroke(); g.fillStyle = IN; g.fillRect(x1 + 14, y + (hash(i * 5) - 0.5) * 60 - 6, 12, 12); }
  g.fillStyle = 'rgba(98,227,212,.18)'; g.fillRect(150, 150, 212, 212); g.strokeStyle = IN; g.lineWidth = 5; g.strokeRect(150, 150, 212, 212);
  g.fillStyle = '#EEF2F6'; g.font = '900 76px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CPU', 256, 256); });
// ---------------------------------------------------------------- guante de boxeo (rojo brillante): puño, pulgar y puño elástico blanco; mira hacia +z
function glove(col = 0xd8232f) {
  const g = new THREE.Group(), m = plastic(col, 0.25), wm = plastic(0xf3f5f9, 0.3);
  const fist = sph(0.05, m, 24, 18); fist.scale.set(1.0, 0.86, 1.18); fist.position.z = 0.012; g.add(fist);
  const thumb = sph(0.022, m, 16, 12); thumb.scale.set(1, 1, 1.6); thumb.position.set(0.04, -0.012, 0.02); g.add(thumb);
  const cuff = cyl(0.036, 0.04, 0.05, wm, 20); cuff.rotation.x = Math.PI / 2; cuff.position.z = -0.052; g.add(cuff);
  return g;
}
// ---------------------------------------------------------------- los dos aspirantes
function buildChip(s = 1) {         // Informática: chip de pie, con patillas a los cuatro lados
  const G = new THREE.Group(); G.scale.setScalar(s);
  const pkg = bx(0.3, 0.3, 0.035, DARK2, 1.6, TEAL); G.add(pkg);
  const die = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshStandardMaterial({ map: DIE_TEX, emissive: 0xffffff, emissiveMap: DIE_TEX, emissiveIntensity: 0.9, roughness: 0.4 })); die.position.z = 0.0185; G.add(die);
  const pinM = metal(0xc9ced6, 0.3);
  for (let i = 0; i < 9; i++) { const u = -0.12 + i * 0.03;
    for (const [x, y, rz] of [[u, 0.162, 0], [u, -0.162, 0], [0.162, u, Math.PI / 2], [-0.162, u, Math.PI / 2]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.008), pinM); p.position.set(x, y, -0.01); p.rotation.z = rz; G.add(p); } }
  G.userData = { die }; return G;
}
function buildCode(s = 1) {         // Software: bloque de código con «{ }»
  const G = new THREE.Group(); G.scale.setScalar(s);
  const b = solid(new THREE.BoxGeometry(0.3, 0.3, 0.07), DARK2, 1.6, AMBER); G.add(b);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshStandardMaterial({ map: CODE_TEX, emissive: 0xffffff, emissiveMap: CODE_TEX, emissiveIntensity: 0.9, roughness: 0.4 })); f.position.z = 0.0355; G.add(f);
  return G;
}
// ---------------------------------------------------------------- el ring (en el centro), los aspirantes con guantes, el rayo entre ellos, el BOE que cae, el anillo de 5 especialidades del chip
const RING_H = 0.14;
function buildRing() {
  const G = new THREE.Group(); scene.add(G); S.ring = G;
  const base = bx(1.5, RING_H, 1.5, DARK, 1.6, EDGE); base.position.y = RING_H / 2; G.add(base);
  const apron = textPlane(1.5, RING_H * 0.9, (g, w, h) => { g.fillStyle = '#0b0d11'; g.fillRect(0, 0, w, h); g.font = '900 26px Inter'; g.textBaseline = 'middle'; g.textAlign = 'right'; g.fillStyle = IN; g.fillText('INFORMÁTICA', w / 2 - 30, h / 2 + 2); g.textAlign = 'left'; g.fillStyle = SW; g.fillText('SOFTWARE', w / 2 + 30, h / 2 + 2); g.fillStyle = '#EEF2F6'; g.textAlign = 'center'; g.fillText('VS', w / 2, h / 2 + 2); }, 1024);
  apron.position.set(0, RING_H / 2, 0.752); G.add(apron);
  const postM = [plastic(TEAL, 0.25), plastic(AMBER, 0.25), plastic(0xf3f5f9, 0.3), plastic(0xf3f5f9, 0.3)];
  [[-0.7, 0.7], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]].forEach(([x, z], i) => { const p = cyl(0.025, 0.025, 0.5, postM[i % 2 === 0 ? 0 : 1], 16); if (z < 0) p.material = postM[2]; p.position.set(x, RING_H + 0.25, z); G.add(p); });
  for (const y of [0.16, 0.28, 0.4]) {    // cuerdas (que brillan un poco)
    const pts = [[-0.7, 0.7], [0.7, 0.7], [0.7, -0.7], [-0.7, -0.7], [-0.7, 0.7]].map(([x, z]) => v3(x, RING_H + y, z));
    const r = drawLine(pts, 0xf2f4f8, 2.2, 0.85); G.add(r); }
  S.chip = buildChip(1); G.add(S.chip);
  S.code = buildCode(1); G.add(S.code);
  S.glovesI = [glove(0xd8232f), glove(0xd8232f)]; S.glovesI.forEach(g => G.add(g));
  S.glovesS = [glove(0x2459d8), glove(0x2459d8)]; S.glovesS.forEach(g => G.add(g));
  S.bolt = segSet(24, 0xffffff, 2.6, 1); G.add(S.bolt); S.bolt2 = segSet(24, TEAL, 1.6, 0.9); G.add(S.bolt2);
  S.lblI = pill('INFORMÁTICA', IN, 'rgba(10,14,18,.9)', 0.36, 64); G.add(S.lblI);
  S.lblS = pill('SOFTWARE', SW, 'rgba(10,14,18,.9)', 0.3, 64); G.add(S.lblS);
  // el BOE que cae en medio y el anillo de las 5 especialidades que sale del chip
  S.boe = buildBook(0.62, 'BOE'); G.add(S.boe.G);
  S.ring5 = buildRing5(0.62); G.add(S.ring5.G);
  S.qm = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc21a, emissive: 0xff9a00, emissiveIntensity: 0.5, roughness: 0.2, clearcoat: 1 })); S.qm.scale.setScalar(0.42); G.add(S.qm);
  // final: quien sabe hacerlo (maniquí con portátil) y el cinturón de campeón
  S.coder = new THREE.Group(); G.add(S.coder);
  const desk = bx(0.36, 0.02, 0.22, DARK2, 1.2); desk.position.set(0, RING_H + 0.24, 0.05); S.coder.add(desk);
  for (const [x, z] of [[-0.16, -0.05], [0.16, -0.05], [-0.16, 0.15], [0.16, 0.15]]) { const l = cyl(0.008, 0.008, 0.23, metal(0x8a929e, 0.4), 8); l.position.set(x, RING_H + 0.115, z); S.coder.add(l); }
  S.lap = buildLaptop(0.62); S.lap.G.position.set(0, RING_H + 0.25, 0.07); S.coder.add(S.lap.G);
  S.doll = makeDoll(plastic(0xf1f3f7, 0.18)); S.doll.scale.setScalar(0.6); S.doll.position.set(0, RING_H - 0.02, -0.16); S.coder.add(S.doll);
  S.belt = buildBelt(); G.add(S.belt);
}
// anillo de 5 especialidades (la del software en ámbar): sale del chip; la porción del software se separa
const SPEC = ['COMPUTACIÓN', 'COMPUTADORES', 'SOFTWARE', 'SISTEMAS DE INFORMACIÓN', 'TECNOLOGÍAS DE LA INFORMACIÓN'];
function buildRing5(s = 1) {
  const G = new THREE.Group(); G.scale.setScalar(s); const parts = [];
  for (let i = 0; i < 5; i++) { const a0 = Math.PI / 2 - i * 2 * Math.PI / 5 - 0.03, a1 = a0 - 2 * Math.PI / 5 + 0.06, sh = new THREE.Shape();
    const r0 = 0.22, r1 = 0.4, N = 20; for (let k = 0; k <= N; k++) { const a = lerp(a0, a1, k / N); const x = Math.cos(a) * r1, y = Math.sin(a) * r1; k ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    for (let k = N; k >= 0; k--) { const a = lerp(a0, a1, k / N); sh.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); }
    const col = i === 2 ? AMBER : 0x1f3a3f, m = new THREE.MeshStandardMaterial({ color: col, emissive: i === 2 ? AMBER : TEAL, emissiveIntensity: i === 2 ? 0.55 : 0.12, roughness: 0.4 });
    const p = solid(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), m, 1.4, i === 2 ? AMBER : TEAL); const am = (a0 + a1) / 2; p.userData = { am, i }; G.add(p); parts.push(p);
    const lb = label(SPEC[i], { size: 64, w: SPEC[i].length > 14 ? 0.34 : 0.24, color: i === 2 ? '#1a1206' : '#cfeee9', weight: 900 }); lb.position.set(Math.cos(am) * 0.31, Math.sin(am) * 0.31, 0.032); lb.rotation.z = am - Math.PI / 2 + (Math.sin(am) < -0.2 ? Math.PI : 0); p.add(lb); }
  return { G, parts };
}
// ---------------------------------------------------------------- libro (el BOE o «LEY»), de «Civil»: tapa que se abre sobre el lomo
function buildBook(s = 1, kind = 'BOE') {
  const G = new THREE.Group(); G.scale.setScalar(s);
  const w = 0.42, d = 0.58, t = 0.014, pg = 0.05;
  const coverTex = canvasTex(420, 580, (g, W_, H_) => { g.fillStyle = '#1a1f27'; g.fillRect(0, 0, W_, H_); g.strokeStyle = '#d8c48a'; g.lineWidth = 6; g.strokeRect(22, 22, W_ - 44, H_ - 44); g.lineWidth = 2; g.strokeRect(34, 34, W_ - 68, H_ - 68);
    g.fillStyle = '#e8d9a8'; g.textAlign = 'center';
    if (kind === 'BOE') { g.font = '900 120px Inter'; g.fillText('BOE', W_ / 2, 230); g.font = '600 22px Inter'; g.fillText('BOLETÍN OFICIAL', W_ / 2, 300); g.fillText('DEL ESTADO', W_ / 2, 332); g.font = '500 20px SpaceMono'; g.fillText('Núm. 187 · 4-8-2009', W_ / 2, 480); }
    else { g.font = '900 92px Inter'; g.fillText('LEY', W_ / 2, 230); g.font = '600 24px Inter'; g.fillText('¿QUIÉN PUEDE', W_ / 2, 320); g.fillText('PROGRAMAR?', W_ / 2, 354); } });
  const CM = new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.6 }), PM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
  const back = bx(w, t, d, CM, 1.4); back.position.set(w / 2, t / 2, 0); G.add(back);
  const pagesR = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesR.position.set(w / 2, t + pg / 2, 0); G.add(pagesR);
  const pageTex = canvasTex(420, 560, (g, W_, H_) => { g.fillStyle = '#e4ded0'; g.fillRect(0, 0, W_, H_);
    if (kind === 'BOE') { g.fillStyle = '#2b2f36'; g.font = '700 22px Inter'; g.fillText('Ingeniería Informática', 30, 56); g.font = '500 16px Inter'; g.fillText('Tecnologías específicas:', 30, 92);
      ['Computación', 'Ingeniería de Computadores', 'Ingeniería del Software', 'Sistemas de Información', 'Tecnologías de la Información'].forEach((s_, i) => { g.fillStyle = i === 2 ? '#b8730a' : '#2b2f36'; g.font = (i === 2 ? '800 ' : '500 ') + '18px Inter'; g.fillText((i + 1) + '. ' + s_, 40, 130 + i * 32); });
      g.fillStyle = 'rgba(43,47,54,.35)'; for (let i = 0; i < 9; i++) g.fillRect(30, 320 + i * 22, 300 + (i * 37) % 60, 7); } });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95 })); page.rotation.x = -Math.PI / 2; page.position.set(w / 2, t + pg + 0.0015, 0); page.receiveShadow = true; G.add(page);
  const yp = t + pg / 2, hinge = new THREE.Group(); hinge.position.y = yp; G.add(hinge);
  const cv = bx(w, t, d, CM, 1.4); cv.position.set(-w / 2, t / 2 - yp, 0); hinge.add(cv);
  const pagesL = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesL.position.set(-w / 2, 0, 0); hinge.add(pagesL);
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ color: 0xe4ded0, roughness: 0.95 })); lp.rotation.x = -Math.PI / 2; lp.position.set(-w / 2, pg / 2 + 0.0015, 0); hinge.add(lp);
  const ct = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, d - 0.01), new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: coverTex, emissiveIntensity: 0.25 }));
  ct.rotation.x = Math.PI / 2; ct.rotation.z = Math.PI; ct.position.set(-w / 2, -yp - 0.0015, 0); hinge.add(ct);
  const spine = bx(t * 1.2, pg + 2 * t, d, CM, 1.2); spine.position.set(-t * 0.4, (pg + 2 * t) / 2, 0); G.add(spine);
  return { G, hinge, page, w, d, top: t + pg + t };
}
// ---------------------------------------------------------------- portátil (pantalla con código que se escribe) y cinturón de campeón
function buildLaptop(s = 1) {
  const G = new THREE.Group(); G.scale.setScalar(s);
  const base = bx(0.34, 0.014, 0.23, DARK2, 1.2); base.position.y = 0.007; G.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.7 })); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.0145, 0.02); G.add(kb);
  const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.112); lid.rotation.x = -0.25; G.add(lid);
  const sc = bx(0.34, 0.22, 0.01, DARK2, 1.2); sc.position.y = 0.11; lid.add(sc);
  const scrT = canvasTex(512, 320, () => {}), scr = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false })); scr.position.set(0, 0.11, 0.0055); lid.add(scr);
  return { G, lid, scrT };
}
const CODE_LINES = ['function entrega() {', '  const app = build(codigo);', '  test(app);', '  return deploy(app);', '}', '', '> npm run build', '✓ build OK'];
function drawScreen(T, k, done) {     // k: cuánto código se ha escrito (0-1)
  const g = T.userData.g, w = 512, h = 320; g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h);
  g.font = '700 25px SpaceMono'; const total = CODE_LINES.join('').length; let left = Math.floor(total * clamp(k));
  CODE_LINES.forEach((s_, i) => { const n = Math.min(s_.length, left); left -= n; if (n <= 0) return; g.fillStyle = s_.startsWith('✓') ? '#7CF0A9' : s_.startsWith('>') ? '#9AA1AB' : i % 2 ? SW : '#EEF2F6'; g.fillText(s_.slice(0, n), 20, 38 + i * 34); });
  if (done) { g.fillStyle = 'rgba(124,240,169,.18)'; g.fillRect(0, 0, w, h); }
  T.needsUpdate = true;
}
function buildBelt() {
  const G = new THREE.Group(), gold = metal(0xffc861, 0.2), strap = plastic(0x15171c, 0.4);
  const st = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 48), strap); st.scale.set(1, 1, 0.35); st.rotation.x = Math.PI / 2; G.add(st);
  const plate = cyl(0.06, 0.06, 0.012, gold, 32); plate.rotation.x = Math.PI / 2; plate.position.z = 0.115; G.add(plate);
  const star = textPlane(0.08, 0.08, (g, w, h) => { g.fillStyle = '#5a3a08'; g.font = '900 300px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', w / 2, h / 2 + 20); }, 256); star.position.z = 0.1215; G.add(star);
  for (const s of [-1, 1]) { const side = cyl(0.035, 0.035, 0.01, gold, 24); side.rotation.x = Math.PI / 2; side.position.set(s * 0.075, 0, 0.098); side.rotation.y = s * 0.6; G.add(side); }
  return G;
}
// ---------------------------------------------------------------- C · el ordenador por dentro: torre que se abre en despiece (y vuelve a montarse)
function buildPC() {
  const G = station(ANG.C); S.pc = G; const parts = [];
  const PCB = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#0f2a1f'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,230,190,.45)'; g.lineWidth = 3; for (let i = 0; i < 40; i++) { const x = hash(i) * w, y = hash(i * 2) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i * 3) - 0.5) * 300, y); g.lineTo(x + (hash(i * 3) - 0.5) * 300, y + (hash(i * 4) - 0.5) * 200); g.stroke(); } });
  const caseG = new THREE.Group(); G.add(caseG);
  const back = bx(0.5, 0.62, 0.02, DARK, 1.4); back.position.set(0, 0.31, -0.19); caseG.add(back);
  for (const [x, y, w, h, d] of [[0, 0.62, 0.5, 0.02, 0.4], [0, 0.0, 0.5, 0.02, 0.4], [-0.25, 0.31, 0.02, 0.62, 0.4], [0.25, 0.31, 0.02, 0.62, 0.4]]) { const p = bx(w, h, d, DARK, 1.4); p.position.set(x, y + (h === 0.02 ? 0.01 : 0), 0); caseG.add(p); }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.6), new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false })); glass.position.set(0, 0.31, 0.2); glass.renderOrder = 7; caseG.add(glass); edges(glass, EDGE, 1.2, 28, 0.8);
  const part = (mesh, name, dx, dy, dz) => { mesh.userData.home = mesh.position.clone(); mesh.userData.off = v3(dx, dy, dz); mesh.userData.name = name; G.add(mesh); parts.push(mesh); return mesh; };
  const mb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.012), new THREE.MeshStandardMaterial({ map: PCB, roughness: 0.6 })); mb.position.set(0.0, 0.34, -0.16); edges(mb, 0x7fe0b0, 1.2, 28, 0.9); part(mb, 'PLACA BASE', 0, 0.08, 0.2);
  const cpu = new THREE.Group(); cpu.add(bx(0.09, 0.09, 0.04, DARK2, 1.3, TEAL)); const fan = cyl(0.045, 0.045, 0.03, metal(0x9aa0aa, 0.35), 24); fan.rotation.x = Math.PI / 2; fan.position.z = 0.035; cpu.add(fan); cpu.position.set(-0.02, 0.42, -0.13); part(cpu, 'CPU', -0.14, 0.26, 0.85);
  const ram = new THREE.Group(); for (const x of [0, 0.03]) { const r = bx(0.012, 0.16, 0.035, new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.5 }), 1.2, 0x9fb4cc); r.position.x = x; ram.add(r); } ram.position.set(0.11, 0.42, -0.13); part(ram, 'RAM', 0.2, 0.22, 0.7);
  const gpu = new THREE.Group(); gpu.add(bx(0.3, 0.06, 0.1, DARK2, 1.3, 0x9fb4cc)); for (const x of [-0.07, 0.07]) { const f = cyl(0.035, 0.035, 0.012, metal(0x7c8592, 0.4), 24); f.position.set(x, -0.036, 0); gpu.add(f); } gpu.position.set(-0.03, 0.22, -0.08); part(gpu, 'GRÁFICA', 0.02, 0.0, 0.9);
  const psu = bx(0.2, 0.1, 0.16, DARK2, 1.3); psu.position.set(-0.12, 0.07, -0.05); part(psu, 'FUENTE', -0.12, 0.0, 0.6);
  const ssd = bx(0.1, 0.012, 0.07, new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.5 }), 1.2, TEAL); ssd.position.set(0.12, 0.1, -0.02); part(ssd, 'DISCO', 0.16, 0.06, 0.75);
  G.userData = { parts, caseG, glass };
}
// ---------------------------------------------------------------- D · los programas que usan millones: terminal → app → móvil → un mar de móviles encendidos
const APP_TEX = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h); g.fillStyle = SW; rr(g, 58, 150, 140, 140, 34); g.fill(); g.fillStyle = '#1a1206'; g.font = '900 78px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('{}', 128, 222);
  g.fillStyle = 'rgba(238,242,246,.5)'; for (let i = 0; i < 4; i++) g.fillRect(40, 340 + i * 30, 176 - i * 24, 12); });
function buildPhones() {
  const G = station(ANG.D); S.ph = G;
  const term = new THREE.Group(); term.position.set(0, 0.95, 0); G.add(term);
  term.add(bx(0.5, 0.32, 0.02, DARK2, 1.3, AMBER));
  const tT = canvasTex(512, 320, () => {}), tScr = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.29), new THREE.MeshBasicMaterial({ map: tT, toneMapped: false })); tScr.position.z = 0.011; term.add(tScr);
  const app = rbox(0.1, 0.1, 0.025, new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.6, roughness: 0.3 }), 0.025); G.add(app);
  const phone = new THREE.Group(); phone.position.set(0, 0.42, 0.1); G.add(phone);
  phone.add(rbox(0.13, 0.26, 0.012, plastic(0x15171c, 0.3), 0.02));
  const pS = new THREE.Mesh(new THREE.PlaneGeometry(0.118, 0.236), new THREE.MeshBasicMaterial({ map: APP_TEX, toneMapped: false })); pS.position.z = 0.0065; phone.add(pS);
  // el mar de móviles: tumbados en el suelo, de la estación hacia el ring, con la pantalla encendida
  const NX = 44, NZ = 50, geo = new THREE.BoxGeometry(0.05, 0.004, 0.1), mats_ = new THREE.MeshBasicMaterial({ map: APP_TEX, toneMapped: false });
  const sea = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.1), mats_, NX * NZ); sea.frustumCulled = false;
  const pos = []; for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) pos.push([(i - (NX - 1) / 2) * 0.075 + (hash(i * 7 + j) - 0.5) * 0.02, 0.003, 0.25 - j * 0.085 + (hash(i + j * 3) - 0.5) * 0.02, hash(i * 13 + j * 7)]);
  G.add(sea);
  G.userData = { term, tT, app, phone, sea, pos };
}
const TERM_LINES = ['$ git commit -m "nueva versión"', '$ build --release', '  compilando… 100%', '✓ app lista'];
function drawTerm(T, k) { const g = T.userData.g, w = 512, h = 320; g.fillStyle = '#0b0e12'; g.fillRect(0, 0, w, h); g.font = '700 24px SpaceMono'; const total = TERM_LINES.join('').length; let left = Math.floor(total * clamp(k));
  TERM_LINES.forEach((s_, i) => { const n = Math.min(s_.length, left); left -= n; if (n <= 0) return; g.fillStyle = s_.startsWith('✓') ? '#7CF0A9' : s_.startsWith('$') ? SW : '#9AA1AB'; g.fillText(s_.slice(0, n), 18, 48 + i * 44); }); T.needsUpdate = true; }
// ---------------------------------------------------------------- E · la generalista: un chip grande y sus 5 ramas alrededor (circuitos, redes, sistemas operativos, IA… y software)
function buildHub() {
  const G = station(ANG.E); S.hub = G;
  const chip = buildChip(1.5); chip.position.set(0, 0.72, 0); G.add(chip);
  const sats = [], links = segSet(5, TEAL, 2, 0.9); G.add(links);
  const at = [[-0.25, 1.16], [0.25, 1.16], [-0.27, 0.32], [0.27, 0.32], [0, 1.36]];
  const mk = [
    () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.008), new THREE.MeshStandardMaterial({ color: 0x0f2a1f, roughness: 0.6 })); edges(b, 0x7fe0b0, 1.2, 28, 1); g.add(b);
      for (let i = 0; i < 4; i++) { const c = bx(0.025, 0.02, 0.012, DARK2, 1, 0x7fe0b0); c.position.set(-0.05 + i * 0.033, (i % 2 ? 0.02 : -0.02), 0.01); g.add(c); } return g; },
    () => { const g = new THREE.Group(); const P = [[0, 0.05], [-0.06, 0.0], [0.06, 0.01], [-0.03, -0.05], [0.04, -0.05]].map(([x, y]) => v3(x, y, 0)); P.forEach(p => { const s = sph(0.012, glowM(TEAL, 1.6), 10, 8); s.position.copy(p); g.add(s); });
      const l = segSet(6, TEAL, 1.6, 0.9); [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 2]].forEach(([a, b], i) => l.userData.set(i, P[a], P[b])); l.userData.flush(); g.add(l); return g; },
    () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const w = bx(0.12, 0.08, 0.004, DARK2, 1.1, i === 2 ? 0xffffff : 0x9fb4cc); w.position.set(-0.02 + i * 0.02, 0.02 - i * 0.02, i * 0.008); g.add(w); const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.012), glowLine(i === 2 ? 0x9fd0ff : 0x5b6b80, 1)); bar.position.set(-0.02 + i * 0.02, 0.054 - i * 0.02, i * 0.008 + 0.003); g.add(bar); } return g; },
    () => { const g = new THREE.Group(); const L = [3, 4, 2], P = []; L.forEach((n, li) => { P.push([]); for (let k = 0; k < n; k++) { const p = v3(-0.06 + li * 0.06, (k - (n - 1) / 2) * 0.03, 0); const s = sph(0.009, glowM(0xb08cff, 1.8), 10, 8); s.position.copy(p); g.add(s); P[li].push(p); } });
      const l = segSet(3 * 4 + 4 * 2, 0xb08cff, 1.1, 0.7); let q = 0; for (let a = 0; a < 2; a++) P[a].forEach(p => P[a + 1].forEach(r => l.userData.set(q++, p, r))); l.userData.flush(); g.add(l); return g; },
    () => buildCode(0.42),
  ];
  const names = ['CIRCUITOS', 'REDES', 'SISTEMAS OPERATIVOS', 'INTELIGENCIA ARTIFICIAL', 'SOFTWARE'];
  for (let i = 0; i < 5; i++) { const s = mk[i](); s.position.set(at[i][0], at[i][1], 0.05); G.add(s); sats.push(s);
    const lb = label(names[i], { size: 64, w: names[i].length > 12 ? 0.3 : 0.18, color: i === 4 ? SW : '#cfeee9', weight: 900 }); lb.position.set(0, -0.1, 0.01); s.add(lb); }
  G.userData = { chip, sats, links, at };
}
// ---------------------------------------------------------------- F · Software va al grano: requisitos ✓, arquitectura (cajas que se unen), pruebas (filas en verde) y el ciclo que entrega versiones
function buildPipe() {
  const G = station(ANG.F); S.pipe = G;
  // requisitos: hoja con casillas que se marcan
  const req = new THREE.Group(); req.position.set(0, 1.22, 0); G.add(req);
  req.add(bx(0.34, 0.22, 0.01, DARK2, 1.2, AMBER));
  const reqT = canvasTex(512, 330, () => {}); const reqP = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshBasicMaterial({ map: reqT, transparent: true, toneMapped: false })); reqP.position.z = 0.0055; req.add(reqP);
  // arquitectura: 4 cajas y sus conexiones
  const arch = new THREE.Group(); arch.position.set(0, 0.88, 0); G.add(arch);
  const boxes = [[-0.12, 0.06], [0.12, 0.06], [0, -0.06], [0, 0.17]].map(([x, y], i) => { const b = bx(0.1, 0.06, 0.04, DARK2, 1.3, i === 3 ? AMBER : 0x9fb4cc); b.position.set(x, y, 0); arch.add(b); return b; });
  const archL = segSet(4, AMBER, 2, 0.9); arch.add(archL);
  // pruebas: filas que se ponen en verde
  const tests = new THREE.Group(); tests.position.set(0, 0.56, 0); G.add(tests);
  tests.add(bx(0.34, 0.2, 0.01, DARK2, 1.2, 0x7cf0a9));
  const testT = canvasTex(512, 300, () => {}); const testP = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.18), new THREE.MeshBasicMaterial({ map: testT, transparent: true, toneMapped: false })); testP.position.z = 0.0055; tests.add(testP);
  // entrega: ciclo (flecha circular) que suelta una versión en cada vuelta
  const loop = new THREE.Group(); loop.position.set(0, 0.24, 0); G.add(loop);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.01, 8, 64, Math.PI * 1.7), glowLine(AMBER, 1.4)); loop.add(arc);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.045, 16), glowLine(AMBER, 1.4)); head.position.set(0.09, 0, 0); loop.add(head);
  const vers = ['v1.0', 'v1.1', 'v1.2', 'v1.3'].map((v, i) => { const p = pill(v, '#1a1206', 'rgba(255,181,71,.95)', 0.09, 64); G.add(p); return p; });
  G.userData = { req, reqT, arch, boxes, archL, tests, testT, loop, arc, head, vers };
}
function drawReq(T, n) { const g = T.userData.g, w = 512, h = 330; g.clearRect(0, 0, w, h); g.font = '700 30px Inter'; g.fillStyle = SW; g.fillText('REQUISITOS', 22, 44);
  ['Registro de usuarios', 'Pago con tarjeta', 'Funciona sin conexión'].forEach((s_, i) => { const y = 100 + i * 70, on = i < n; g.strokeStyle = on ? '#7CF0A9' : '#9AA1AB'; g.lineWidth = 4; g.strokeRect(22, y - 28, 36, 36);
    if (on) { g.strokeStyle = '#7CF0A9'; g.lineWidth = 6; g.beginPath(); g.moveTo(28, y - 10); g.lineTo(38, y + 2); g.lineTo(54, y - 22); g.stroke(); } g.fillStyle = '#EEF2F6'; g.font = '600 28px Inter'; g.fillText(s_, 76, y); }); T.needsUpdate = true; }
function drawTests(T, n) { const g = T.userData.g, w = 512, h = 300; g.clearRect(0, 0, w, h); g.font = '700 30px Inter'; g.fillStyle = '#7CF0A9'; g.fillText('PRUEBAS', 22, 42);
  for (let i = 0; i < 5; i++) { const y = 86 + i * 44, on = i < n; g.fillStyle = on ? 'rgba(124,240,169,.22)' : 'rgba(238,242,246,.08)'; g.fillRect(22, y - 26, 468, 36); g.fillStyle = on ? '#7CF0A9' : '#9AA1AB'; g.font = '700 26px SpaceMono'; g.fillText((on ? '✓ ' : '· ') + ['login', 'pago', 'offline', 'carga', 'seguridad'][i], 34, y); } T.needsUpdate = true; }
// ---------------------------------------------------------------- G · el marcador: notas de corte (escala de 0 a 14)
const SC_K = 0.085;       // m por punto
function buildScore() {
  const G = station(ANG.G); S.score = G;
  const scale = new THREE.Group(); G.add(scale);
  const tick = glowLine(0xd8f2ff, 1.2);
  for (let v = 0; v <= 14; v++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(v % 2 ? 0.03 : 0.06, 0.004, 0.004), tick); tk.position.set(-0.32, 0.05 + v * SC_K, 0); scale.add(tk);
    if (v % 2 === 0) { const l = label(String(v), { size: 80, w: 0.06, color: '#cfe0ee', weight: 800, font: 'SpaceMono' }); l.position.set(-0.38, 0.05 + v * SC_K, 0); scale.add(l); } }
  const axis = new THREE.Mesh(new THREE.BoxGeometry(0.004, 14 * SC_K, 0.004), tick); axis.position.set(-0.32, 0.05 + 7 * SC_K, 0); scale.add(axis);
  const bars = [[TEAL, -0.12], [AMBER, 0.14]].map(([c, x]) => { const b = solid(new THREE.BoxGeometry(0.16, 1, 0.12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.35 }), 1.4, 0xffffff); b.position.set(x, 0.05, 0); G.add(b); return b; });
  const top14 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.004, 0.004), glowLine(0xffffff, 0.8)); top14.position.set(0.0, 0.05 + 14 * SC_K, 0); G.add(top14);
  const names = [pill('INFORMÁTICA', IN, 'rgba(10,14,18,.9)', 0.2, 64), pill('SOFTWARE', SW, 'rgba(10,14,18,.9)', 0.17, 64)]; names[0].position.set(-0.12, 0.0, 0.08); names[1].position.set(0.14, 0.0, 0.08); names.forEach(n => G.add(n));
  const uni = label('POLITÉCNICA DE MADRID · 2025', { size: 60, w: 0.5, color: '#9AA1AB', weight: 700 }); uni.position.set(0.02, 0.05 + 14 * SC_K + 0.07, 0); G.add(uni);
  G.userData = { bars, names, uni };
}
// ---------------------------------------------------------------- H · el BOE abierto y el anillo de las 5 especialidades encima
function buildSpec() {
  const G = station(ANG.H); S.spec = G;
  const lect = bx(0.3, 0.42, 0.24, DARK, 1.3); lect.position.set(0, 0.21, 0); G.add(lect);
  const book = buildBook(0.9, 'BOE'); book.G.position.set(0, 0.42, 0); book.G.rotation.x = 0.0; G.add(book.G);
  const r5 = buildRing5(1.15); r5.G.position.set(0, 1.08, 0.05); G.add(r5.G);
  G.userData = { book, r5 };
}
// ---------------------------------------------------------------- I · los créditos: dos columnas de 24 cubos (10 créditos cada uno): 12 iguales, 5 de especialidad (≈ 48), el resto
function buildCredits() {
  const G = station(ANG.I); S.cred = G; const cols = [];
  const cm = { base: new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.4, emissive: 0x303540, emissiveIntensity: 0.4 }), I: new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 0.45, roughness: 0.35 }),
    S: new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.45, roughness: 0.35 }), rest: new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.6 }) };
  for (const [k, x] of [['I', -0.13], ['S', 0.13]]) { const cubes = []; for (let i = 0; i < 24; i++) { const kind = i < 12 ? 'base' : i < 17 ? k : 'rest'; const c = solid(new THREE.BoxGeometry(0.15, 0.042, 0.12), cm[kind], 1.0, kind === 'base' ? 0x9aa1ab : 0xffffff, 0.6); c.position.set(x, 0.023 + i * 0.047, 0); G.add(c); cubes.push(c); } cols.push(cubes); }
  const names = [pill('INFORMÁTICA', IN, 'rgba(10,14,18,.9)', 0.2, 64), pill('SOFTWARE', SW, 'rgba(10,14,18,.9)', 0.17, 64)]; names[0].position.set(-0.13, -0.03, 0.09); names[1].position.set(0.13, -0.03, 0.09); names.forEach(n => G.add(n));
  const brace = segSet(3, 0xffffff, 2, 0.9); G.add(brace);
  const lbBase = pill('120 CRÉDITOS IGUALES', '#10131a', 'rgba(238,242,246,.95)', 0.3, 60); G.add(lbBase);
  const lb48 = pill('48 DE ESPECIALIDAD', '#1a1206', 'rgba(255,181,71,.95)', 0.28, 60); G.add(lb48);
  G.userData = { cols, brace, lbBase, lb48 };
}
// ---------------------------------------------------------------- J · la ley en blanco; los dos títulos que se van; el portátil que compila igual; «ni un título, ni un colegio»
function buildLaw() {
  const G = station(ANG.J); S.law = G;
  const law = buildBook(1.0, 'LEY'); law.G.position.set(0, 0.0, 0.05); G.add(law.G);
  const scrolls = [[IN, 'INFORMÁTICA'], [SW, 'SOFTWARE']].map(([c, n], i) => { const g = new THREE.Group(); const sc = cyl(0.03, 0.03, 0.28, plastic(0xfaf3e0, 0.4), 24); sc.rotation.z = Math.PI / 2; g.add(sc);
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 24), plastic(c === IN ? TEAL : AMBER, 0.25)); rib.rotation.y = Math.PI / 2; g.add(rib);
    const lb = pill(n, c, 'rgba(10,14,18,.9)', 0.2, 64); lb.position.set(0, -0.07, 0.02); g.add(lb); G.add(g); return g; });
  const lap = buildLaptop(1.2); G.add(lap.G);
  const title = new THREE.Group(); G.add(title);
  title.add(textPlane(0.3, 0.21, (g, w, h) => { g.fillStyle = '#efe7d2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b89a52'; g.lineWidth = 10; g.strokeRect(16, 16, w - 32, h - 32); g.fillStyle = '#4a3a1a'; g.textAlign = 'center'; g.font = '900 64px Inter'; g.fillText('TÍTULO', w / 2, h * 0.45); g.font = '500 30px Inter'; g.fillText('universitario', w / 2, h * 0.68); }, 512));
  const college = new THREE.Group(); G.add(college);
  const cb = bx(0.3, 0.03, 0.14, DARK2, 1.2); cb.position.y = 0.015; college.add(cb);
  for (let i = 0; i < 4; i++) { const c = cyl(0.012, 0.012, 0.15, DARK2, 12); c.position.set(-0.1 + i * 0.066, 0.105, 0.03); edges(c, EDGE, 1, 40, 0.8); college.add(c); }
  const roof = solid(new THREE.CylinderGeometry(0.0, 0.18, 0.07, 3, 1), DARK2, 1.2); roof.rotation.y = Math.PI / 6; roof.scale.set(1, 1, 0.45); roof.position.y = 0.215; college.add(roof);
  const cl = label('COLEGIO', { size: 70, w: 0.16, color: '#EEF2F6', weight: 900 }); cl.position.set(0, 0.31, 0.03); college.add(cl);
  const X = () => { const m = textPlane(0.36, 0.36, (g, w, h) => { g.strokeStyle = '#FF5247'; g.lineWidth = 40; g.lineCap = 'round'; g.beginPath(); g.moveTo(60, 60); g.lineTo(w - 60, h - 60); g.moveTo(w - 60, 60); g.lineTo(60, h - 60); g.stroke(); }, 256); m.renderOrder = 9; G.add(m); return m; };
  const xs = [X(), X()];
  G.userData = { law, scrolls, lap, title, college, xs };
}
