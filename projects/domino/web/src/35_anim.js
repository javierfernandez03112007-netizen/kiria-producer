// ---------------------------------------------------------------- «El efecto dominó»: LO QUE PASA EN CADA FOTOGRAMA (todo depende solo de t).
// la persona: arrodillada, el dedo empuja la primera ficha; cuando la cámara se ha ido, se levanta; al final, de pie, mira la cadena
function animFigure(t) { const A = CAST.A, U = A.userData, J = U.J; poseReset(A);
  const end = t > WARP.land; A.position.set(-0.46, 0, 0.06); A.rotation.set(0, Math.PI / 2 - (end ? 0.12 : 0.05), 0);
  A.visible = end; const H = CAST.hand; H.visible = !end && t < TT.push + 2.0;
  if (!end) { // la mano entra por la izquierda, la yema toca el canto de arriba de la primera ficha, la empuja y se retira
    const inn = eio(seg(t, 0, TT.push - 0.15)), push = eio(seg(t, TT.push - 0.15, TT.push + 0.05)), out = eio(seg(t, TT.push + 0.2, TT.push + 1.4));
    const bt = -DOM.t[0] - 0.0012, tip = _v(bt + 0.0035 * push - 0.06 * out - 0.07 * (1 - inn), DOM.h[0] * 0.86 + 0.03 * out + 0.025 * (1 - inn), -0.03 * out - 0.04 * (1 - inn));
    H.position.copy(tip); H.rotation.set(0.15, -0.6, -0.22 + 0.06 * push); }
  else { A.position.set(-0.62, 0, -0.2); breath(A, t, 0.6, 0.35); A.updateMatrixWorld(true); lookAtP(A, _v(8, 1.2, 0), 0.7); J.shL.rotation.z = -0.1; J.shR.rotation.z = 0.1; } }
// polvo: un soplo blanco en cada golpe de las fichas grandes y una nube al caer la gigante
const DUST = { per: 60, from: 8 };
function buildDust(G) { const R = rng(9), ev = []; for (let i = DUST.from; i < DOM.N; i++) ev.push({ i, big: false }); ev.push({ i: DOM.N - 1, big: true });
  const n = ev.reduce((s, e) => s + (e.big ? DUST.per * 8 : DUST.per), 0), pos = new Float32Array(n * 3), seeds = [];
  for (const e of ev) for (let k = 0; k < (e.big ? DUST.per * 8 : DUST.per); k++) seeds.push({ e, a: R() * Math.PI * 2, v: 0.4 + R() * 0.9, up: 0.1 + R() * 0.5, s: R(), x: R() });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = cnv(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const m = new THREE.PointsMaterial({ color: 0xdadada, size: 1, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true });
  DUST.p = new THREE.Points(geo, m); DUST.p.frustumCulled = false; G.add(DUST.p); DUST.seeds = seeds; DUST.m = m; }
function dustAt(t) { const a = DUST.p.geometry.attributes.position; let any = 0;
  DUST.seeds.forEach((s, i) => { const e = s.e, h = DOM.h[e.i], t0 = e.big ? WARP.land : WARP.V[e.i] + 0.05, u = t - t0, life = e.big ? 3.5 : 1.0;
    if (u < 0 || u > life) { a.setXYZ(i, 0, -999, 0); return; } any = 1;
    if (e.big) { const L = DOM.h[DOM.N - 1], x = DOM.X[DOM.N - 1] + s.x * L, r = s.v * L * 0.22 * (1 - Math.exp(-u * 1.6));
      a.setXYZ(i, x + Math.cos(s.a) * r * 0.3, 0.05 + s.up * L * 0.12 * (1 - Math.exp(-u * 2)), Math.sin(s.a) * (DOM.w[DOM.N - 1] * 0.5 + r)); }
    else { const x = DOM.X[e.i] - DOM.t[e.i] * 0.5, r = s.v * h * 0.25 * (1 - Math.exp(-u * 3)); a.setXYZ(i, x + Math.cos(s.a) * r, 0.02 * h + s.up * h * 0.15 * (1 - Math.exp(-u * 3)), Math.sin(s.a) * (DOM.w[e.i] * 0.5 + r)); } });
  a.needsUpdate = true; DUST.p.visible = !!any; DUST.m.size = Math.max(0.02, hOf(frontSmooth(Math.min(t, WARP.V[DOM.N - 1]))) * 0.08) * (t > WARP.land - 0.2 ? 6 : 1); }
function animAt(t, st) { dominoesAt(t); S.mirror.forEach((c, i) => { c.rotation.z = DOM.g[i].rotation.z; }); animFigure(t); dustAt(t); }
