// ---------------------------------------------------------------- «El escalón torcido»: LAS ESTACIONES QUE CAEN (solo en el año otra vez, L8): nieve en invierno,
// pétalos en primavera y hojas en otoño alrededor de la casa (también se ven por las ventanas). Fuera del año otra vez no cae nada (el bucle no cambia).
const FALL = { N: 700, box: [-5.5, 5.5, -1.5, 10.5, -5.0, 3.2] };
let _dotT = null;
function dotTex() { if (_dotT) return _dotT; const c = cnv(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _dotT = new THREE.CanvasTexture(c); return _dotT; }
function buildFall(G) { const R = rng(91), [x0, x1, y0, y1, z0, z1] = FALL.box; S.fall = [];
  for (const [kind, col, size, n] of [['snow', 0xffffff, 0.07, FALL.N], ['petal', 0xffc2d6, 0.06, 420], ['leaf', 0xe0812c, 0.08, 420]]) {
    const pos = new Float32Array(n * 3), seed = []; for (let i = 0; i < n; i++) { const s = { x: x0 + R() * (x1 - x0), y: y0 + R() * (y1 - y0), z: z0 + R() * (z1 - z0), v: kind === 'snow' ? 0.6 + R() * 0.5 : 0.9 + R() * 0.6, ph: R() * 6.28, a: 0.15 + R() * 0.3 };
      // nada dentro de la casa (las plantas se ven limpias)
      if (s.x > HO.x0 - 0.3 && s.x < HO.x1 + 0.3 && s.z > HO.zb - 0.3 && s.z < HO.zf + 0.2) s.z = HO.zb - 0.6 - R() * 3.5;
      seed.push(s); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: col, size, map: dotTex(), transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true, fog: true });
    const p = new THREE.Points(geo, m); p.frustumCulled = false; p.visible = false; G.add(p); S.fall.push({ kind, p, seed, m }); } }
function fallAt(t) { const lap = win(t, TL.gr0 - 0.1, 0.25) * (1 - win(t, TL.gr1, 0.35)), w = S.season || [0, 0, 1, 0], [x0, x1, y0, y1] = FALL.box, Hh = y1 - y0;
  for (const F of S.fall) { const k = lap * (F.kind === 'snow' ? w[0] : F.kind === 'petal' ? w[1] : w[3]); F.p.visible = k > 0.02; F.m.opacity = 0.95 * k; if (!F.p.visible) continue;
    const a = F.p.geometry.attributes.position; F.seed.forEach((s, i) => { const y = y1 - ((y1 - s.y + s.v * t) % Hh + Hh) % Hh; a.setXYZ(i, s.x + Math.sin(t * 1.3 + s.ph) * s.a, y, s.z + Math.cos(t * 1.1 + s.ph) * s.a * 0.6); }); a.needsUpdate = true; } }
