// ---------------------------------------------------------------- EL MUNDO del día 3 de Kiria World (unidades: metros; x = este, y = arriba, z = sur)
//   PLAZA (0, 0, 0) con el pedestal en el centro · AYUNTAMIENTO al norte (fachada en z = −15, salón detrás, trono al fondo)
//   CALLE de las tiendas al este (calzada en x ≈ 16–22; fachadas en x = 24, mirando a la plaza): sushi (norte), pastelería, veterinario (sur)
const GOLD = new THREE.Color(1.0, 0.62, 0.18), CYAN = new THREE.Color(0.25, 0.7, 1.0), WHITE = new THREE.Color(1, 1, 1);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));
const _v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ad = (p, c) => (p.add(c), c);     // añade y devuelve el HIJO (Object3D.add devuelve el padre: «g.add(x).position…» movía el edificio entero)
const stdM = (c, r = 0.6, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const addM = (c, op = 1, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...o });
function glowSprite(col, s = 1, op = 1) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.scale.setScalar(s); return m; }
const pick = (R, arr) => arr[Math.floor(R() * arr.length) % arr.length];
function shadowAll(o, cast = true, recv = true) { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; }
function place(o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }
function box(w, h, d, m, x = 0, y = 0, z = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; }
// caja con cantos redondeados (muebles, coches, letreros)
function rboxM(w, h, d, r, m, seg = 3) { const s = new THREE.Shape(), x0 = -w / 2 + r, y0 = -h / 2 + r, x1 = w / 2 - r, y1 = h / 2 - r;
  s.moveTo(x0, -h / 2); s.lineTo(x1, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, y0); s.lineTo(w / 2, y1); s.quadraticCurveTo(w / 2, h / 2, x1, h / 2); s.lineTo(x0, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y1); s.lineTo(-w / 2, y0); s.quadraticCurveTo(-w / 2, -h / 2, x0, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.98, bevelSegments: seg, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals();
  const mm = new THREE.Mesh(g, m); mm.castShadow = mm.receiveShadow = true; return mm; }

// ---- texturas hechas a mano (lienzo): ruido, ladrillo, baldosa, mármol, madera, asfalto, tierra con hierba; y su mapa de relieve (normal) a partir de la altura
function noise2(R, w, h, oct = 5) { const out = new Float32Array(w * h); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) { const s = 2 ** (o + 2), g = []; for (let i = 0; i <= s; i++) { g.push([]); for (let j = 0; j <= s; j++) g[i].push(R()); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const fx = x / w * s, fy = y / h * s, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy % s][ix % s], b = g[iy % s][(ix + 1) % s], c = g[(iy + 1) % s][ix % s], d = g[(iy + 1) % s][(ix + 1) % s]; out[y * w + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy); }
    tot += amp; amp *= 0.5; }
  for (let i = 0; i < out.length; i++) out[i] /= tot; return out; }
// de un lienzo de altura (gris) a un mapa de normales
function normalFrom(hc, k = 2) { const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), im = g.createImageData(w, h), H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texOf(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
// material con color + relieve a partir de dos lienzos (color y altura)
function texMat(col, hgt, rep, o = {}) { const m = new THREE.MeshStandardMaterial({ map: texOf(col, rep), roughness: o.r ?? 0.8, metalness: o.metal ?? 0, ...(o.extra || {}) });
  if (hgt) { m.normalMap = normalFrom(hgt, o.nk ?? 2); m.normalMap.repeat.set(rep[0], rep[1]); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); } return m; }
// ladrillo (fachadas): hiladas con llaga, color que varía y mortero claro
function brickCanvases(base = [150, 72, 52], seed = 3, W2 = 512) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), rows = 16, bw = W2 / 4, bh = W2 / rows, N = noise2(R, 128, 128, 4);
  g.fillStyle = '#cfc6b8'; g.fillRect(0, 0, W2, W2); gh.fillStyle = '#404040'; gh.fillRect(0, 0, W2, W2);
  for (let r = 0; r < rows; r++) for (let i = -1; i < 5; i++) { const x = i * bw + (r % 2 ? bw / 2 : 0), y = r * bh, v = 0.82 + R() * 0.3, cc = base.map(q => Math.min(255, q * v + (R() - 0.5) * 18));
    g.fillStyle = `rgb(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0})`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4); gh.fillStyle = `rgb(${(170 + R() * 40) | 0},${(170 + R() * 40) | 0},${(170 + R() * 40) | 0})`; gh.fillRect(x + 2, y + 2, bw - 4, bh - 4); }
  const id = g.getImageData(0, 0, W2, W2); for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], i = (y * W2 + x) * 4, k = 0.86 + n * 0.28; id.data[i] *= k; id.data[i + 1] *= k; id.data[i + 2] *= k; } g.putImageData(id, 0, 0);
  return [c, h]; }
// revoco liso pintado (fachadas de color) con manchas suaves
function stuccoCanvases(rgb, seed = 5, W2 = 256) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, W2, W2, 6), id = g.createImageData(W2, W2), ih = gh.createImageData(W2, W2);
  for (let i = 0; i < W2 * W2; i++) { const n = N[i], k = 0.9 + n * 0.16; id.data[i * 4] = rgb[0] * k; id.data[i * 4 + 1] = rgb[1] * k; id.data[i * 4 + 2] = rgb[2] * k; id.data[i * 4 + 3] = 255; const hh = 100 + n * 90 + R() * 30; ih.data[i * 4] = ih.data[i * 4 + 1] = ih.data[i * 4 + 2] = hh; ih.data[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0); gh.putImageData(ih, 0, 0); return [c, h]; }
// baldosas de piedra (plaza, aceras): piezas rectangulares en hiladas, juntas oscuras
function tileCanvases(base = [178, 170, 158], seed = 7, W2 = 512, nx = 6, ny = 8, joint = 4) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, 128, 128, 5);
  g.fillStyle = '#5d5a55'; g.fillRect(0, 0, W2, W2); gh.fillStyle = '#202020'; gh.fillRect(0, 0, W2, W2); const tw = W2 / nx, th = W2 / ny;
  for (let r = 0; r < ny; r++) for (let i = -1; i <= nx; i++) { const x = i * tw + (r % 2 ? tw / 2 : 0), y = r * th, v = 0.86 + R() * 0.22, cc = base.map(q => q * v);
    g.fillStyle = `rgb(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0})`; g.fillRect(x + joint / 2, y + joint / 2, tw - joint, th - joint); const hv = (180 + R() * 50) | 0; gh.fillStyle = `rgb(${hv},${hv},${hv})`; gh.fillRect(x + joint / 2, y + joint / 2, tw - joint, th - joint); }
  const id = g.getImageData(0, 0, W2, W2); for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], i = (y * W2 + x) * 4, k = 0.88 + n * 0.24; id.data[i] *= k; id.data[i + 1] *= k; id.data[i + 2] *= k; } g.putImageData(id, 0, 0);
  return [c, h]; }
// mármol pulido (salón del ayuntamiento): ajedrezado crema y gris con vetas
function marbleCanvas(seed = 9, W2 = 1024, checker = true) { const R = rng(seed), c = cnv(W2, W2), g = c.getContext('2d'), N = noise2(R, 256, 256, 6), id = g.createImageData(W2, W2), cell = W2 / 4;
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const dark = checker && ((Math.floor(x / cell) + Math.floor(y / cell)) % 2) === 1, n = N[((y >> 2) % 256) * 256 + ((x >> 2) % 256)];
    const vein = Math.pow(Math.abs(Math.sin((x * 0.012 + y * 0.007 + n * 9.0) * 1.6)), 18); const b = dark ? [70, 74, 82] : [232, 226, 212], k = 0.94 + n * 0.1 - vein * (dark ? -0.6 : 0.35);
    const i = (y * W2 + x) * 4; const edge = checker && (x % cell < 2 || y % cell < 2) ? 0.75 : 1; id.data[i] = b[0] * k * edge; id.data[i + 1] = b[1] * k * edge; id.data[i + 2] = b[2] * k * edge; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return c; }
// tablas de madera (suelos de las tiendas, mesas)
function woodCanvases(base = [150, 105, 66], seed = 11, W2 = 512, planks = 8) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, 64, 256, 4), id = g.createImageData(W2, W2), ih = gh.createImageData(W2, W2), pw = W2 / planks;
  const off = Array.from({ length: planks }, () => R() * W2), tone = Array.from({ length: planks }, () => 0.82 + R() * 0.3);
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const p = Math.floor(x / pw), yy = (y + off[p]) % W2, n = N[(Math.floor(yy / 2) % 256) * 64 + Math.floor((x % pw) / pw * 64)], grain = 0.85 + 0.15 * Math.sin((x % pw) * 0.35 + n * 14);
    const seam = (x % pw < 2) || (yy % (W2 / 2) < 2) ? 0.55 : 1, k = tone[p] * grain * seam, i = (y * W2 + x) * 4; id.data[i] = base[0] * k; id.data[i + 1] = base[1] * k; id.data[i + 2] = base[2] * k; id.data[i + 3] = 255;
    const hv = seam < 1 ? 40 : 150 + n * 60; ih.data[i] = ih.data[i + 1] = ih.data[i + 2] = hv; ih.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); gh.putImageData(ih, 0, 0); return [c, h]; }
// asfalto con grava
function asphaltCanvases(seed = 13, W2 = 512) { const R = rng(seed), c = cnv(W2, W2), h = cnv(W2, W2), g = c.getContext('2d'), gh = h.getContext('2d'), N = noise2(R, 128, 128, 5), id = g.createImageData(W2, W2), ih = gh.createImageData(W2, W2);
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], s = R(), v = 52 + n * 26 + (s > 0.93 ? 30 : s < 0.06 ? -14 : 0), i = (y * W2 + x) * 4;
    id.data[i] = v; id.data[i + 1] = v * 1.01; id.data[i + 2] = v * 1.04; id.data[i + 3] = 255; const hv = 110 + (s > 0.9 ? 70 : 0) + n * 40; ih.data[i] = ih.data[i + 1] = ih.data[i + 2] = hv; ih.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); gh.putImageData(ih, 0, 0); return [c, h]; }
// tierra con hierba (debajo de las briznas)
function lawnCanvas(seed = 17, W2 = 512) { const R = rng(seed), c = cnv(W2, W2), g = c.getContext('2d'), N = noise2(R, 128, 128, 6), id = g.createImageData(W2, W2);
  for (let y = 0; y < W2; y++) for (let x = 0; x < W2; x++) { const n = N[((y >> 2) % 128) * 128 + ((x >> 2) % 128)], s = R(), i = (y * W2 + x) * 4, k = 0.75 + n * 0.5 + (s - 0.5) * 0.25;
    id.data[i] = 62 * k; id.data[i + 1] = 108 * k; id.data[i + 2] = 40 * k; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return c; }
// letrero: texto sobre fondo, en un plano (rótulos de tiendas, pergamino, placas)
function signTex(w, h, draw) { const c = cnv(w, h), g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signPlane(w, h, px, draw, o = {}) { const t = signTex(px, Math.round(px * h / w), draw); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? 0.5, metalness: o.metal ?? 0, transparent: !!o.alpha, emissive: o.glow ? 0xffffff : 0x000000, emissiveMap: o.glow ? t : null, emissiveIntensity: o.glow ?? 0 })); m.receiveShadow = true; return m; }
