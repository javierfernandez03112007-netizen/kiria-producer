// ---------------------------------------------------------------- «El efecto dominó» (formato «Metáfora visual», en blanco, negro y grises; sin voz).
// 19 fichas, cada una 1,45 veces más alta que la anterior (de 1,5 cm a 12 m: una ficha puede tumbar a otra ≈ 1,5 veces mayor). Física de verdad, calculada al
// arrancar: cada ficha gira sobre su canto delantero (θ'' = 3g/2h · sen θ), al tocar la siguiente la empuja y luego se apoya en ella. El vídeo va a cámara lenta
// variable (las pequeñas, muy lentas; la gigante, a ≈ 0,4×): el tiempo del vídeo se convierte en tiempo de la simulación con una curva suave.
const DOM = { N: 19, h0: 0.015, r: 1.45, g: 9.81 };
DOM.h = Array.from({ length: DOM.N }, (_, i) => DOM.h0 * Math.pow(DOM.r, i)); DOM.t = DOM.h.map(h => 0.16 * h); DOM.w = DOM.h.map(h => 0.5 * h); DOM.s = DOM.h.map(h => 0.45 * h);
DOM.X = [0]; for (let i = 0; i < DOM.N - 1; i++) DOM.X.push(DOM.X[i] + DOM.s[i] + DOM.t[i + 1]);
// ángulo máximo de la ficha i para no atravesar la i+1 (su esquina de arriba no puede pasar la cara de atrás de la siguiente)
function leanMax(i, thj) { const X = DOM.X, h = DOM.h, t = DOM.t, j = i + 1, Bx = X[j] - t[j] * Math.cos(thj), By = t[j] * Math.sin(thj), nx = -Math.cos(thj), ny = Math.sin(thj);
  const d = th => (X[i] + h[i] * Math.sin(th) - Bx) * nx + (h[i] * Math.cos(th) - By) * ny; let lo = 0, hi = Math.PI / 2; if (d(hi) >= 0) return hi;
  for (let k = 0; k < 36; k++) { const m = (lo + hi) / 2; if (d(m) >= 0) lo = m; else hi = m; } return lo; }
function simulate() { const N = DOM.N, h = DOM.h, g = DOM.g, dt = 1 / 2400, store = 1 / 480; const th = new Array(N).fill(0), om = new Array(N).fill(0), st = new Array(N).fill(false), t0 = new Array(N).fill(null);
  st[0] = true; th[0] = 0.03; om[0] = 1.2 * Math.sqrt(g / h[0]); t0[0] = 0; let T = 0, land = null, k = 0; const rec = [];
  while (T < 12) {
    for (let i = 0; i < N; i++) if (st[i] && th[i] < Math.PI / 2) { om[i] += 1.5 * g / h[i] * Math.sin(th[i]) * dt; th[i] += om[i] * dt; }
    if (th[N - 1] >= Math.PI / 2) { th[N - 1] = Math.PI / 2; if (land === null) land = T; om[N - 1] = om[N - 1] > 0 ? -0.12 * om[N - 1] : om[N - 1]; }
    for (let i = N - 2; i >= 0; i--) if (st[i]) { const m = leanMax(i, st[i + 1] ? th[i + 1] : 0); if (th[i] > m) { th[i] = m; om[i] = Math.min(om[i], st[i + 1] ? om[i + 1] : 0); } }
    for (let i = 0; i < N - 1; i++) if (st[i] && !st[i + 1] && th[i] >= Math.asin(Math.min(1, DOM.s[i] / h[i])) - 0.005) { st[i + 1] = true; th[i + 1] = 0.03; om[i + 1] = 0.55 * om[i] * h[i] / h[i + 1] + 0.6 * Math.sqrt(g / h[i + 1]); t0[i + 1] = T; }
    if (T >= k * store) { rec.push(th.slice()); k++; }
    T += dt; if (land !== null && T > land + 3) break; }
  DOM.rec = rec; DOM.store = store; DOM.t0 = t0; DOM.land = land; DOM.simEnd = T; }
// ángulo de la ficha i en el tiempo de simulación τ
function thAt(i, tau) { const R = DOM.rec, f = clamp(tau / DOM.store, 0, R.length - 1), k = Math.floor(f), u = f - k, a = R[k][i], b = R[Math.min(R.length - 1, k + 1)][i]; return tau <= 0 ? 0 : a + (b - a) * u; }
// ---- la cámara lenta: tiempo del vídeo → tiempo de la simulación (curva monótona por los arranques de cada ficha)
const WARP = { T: [], S: [] };
function buildWarp() { const V = [TT.push]; for (let i = 1; i < DOM.N; i++) V.push(V[i - 1] + TT.d0 * Math.pow(TT.dg, i - 1));
  const T = [], S = []; T.push(0); S.push(-TT.push * 0.05); V.forEach((v, i) => { T.push(v); S.push(DOM.t0[i]); });
  const vl = V[DOM.N - 1] + TT.lastFall; T.push(vl); S.push(DOM.land); T.push(vl + 6); S.push(DOM.land + 6 * 0.45);
  WARP.T = T; WARP.S = S; WARP.V = V; WARP.land = vl; }
const tauAt = t => mono(t, WARP.T, WARP.S);
// el frente de la ola: índice continuo (la última ficha que ha empezado a caer + lo que lleva de caída)
function frontAt(t) { const tau = tauAt(t); let c = 0; for (let i = 0; i < DOM.N; i++) { if (DOM.t0[i] !== null && tau >= DOM.t0[i]) c = i + clamp(thAt(i, tau) / 0.5); } return Math.min(c, DOM.N - 1); }
// ---- las fichas: blancas, con los puntos en la cara de delante (+x, la que mira a la cámara), cantos redondeados
function pipTex(a, b) { return signTex(256, 512, (c, W, H) => { c.fillStyle = '#f4f3f0'; c.fillRect(0, 0, W, H); c.fillStyle = '#121212'; c.fillRect(W * 0.12, H / 2 - 4, W * 0.76, 8);
    const P = { 0: [], 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]], 6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]] };
    for (const [n, y0] of [[a, 0], [b, H / 2]]) for (const [px, py] of P[n]) { c.beginPath(); c.arc(px * W, y0 + py * H / 2, W * 0.085, 0, 7); c.fill(); } }); }
function buildDominoes(G) { simulate(); buildWarp(); DOM.g = []; const R = rng(5);
  const body = new THREE.MeshPhysicalMaterial({ color: 0xf2f1ee, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.12 });
  for (let i = 0; i < DOM.N; i++) { const h = DOM.h[i], t = DOM.t[i], w = DOM.w[i], g = new THREE.Group(); g.position.set(DOM.X[i], 0, 0); G.add(g);
    const m = rboxM(t, h, w, Math.min(t, w) * 0.12, body, 2); m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; m.position.set(-bb.max.x, -bb.min.y, 0); m.castShadow = m.receiveShadow = true; g.add(m);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.9), new THREE.MeshPhysicalMaterial({ map: pipTex(Math.floor(R() * 7), Math.floor(R() * 7)), roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.12, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    face.rotation.y = Math.PI / 2; face.position.set(0.0025 * h, (bb.max.y - bb.min.y) / 2, 0); face.receiveShadow = true; g.add(face);
    DOM.g.push(g); } }
function dominoesAt(t) { const tau = tauAt(t); for (let i = 0; i < DOM.N; i++) DOM.g[i].rotation.z = -thAt(i, tau); }
