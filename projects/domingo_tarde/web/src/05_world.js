// ---------------------------------------------------------------- EL MUNDO (1 unidad = 1 m). +X derecha, +Y arriba, +Z hacia la puerta; la ventana da a −Z (por ahí se pone el sol).
const ROOM = { x0: -2.1, x1: 2.1, z0: -2.2, z1: 2.2, h: 2.6 };
const WIN = { x: 0.1, w: 1.9, y0: 0.95, y1: 2.15 };                               // su ventana (en la pared del fondo, que es la fachada)
const BED = { x: -0.35, z: -1.45, w: 2.1, d: 1.25, top: 0.5 };                    // la cama, bajo la ventana
const BOY = { x: 0.05, z: -1.33, yaw: Math.PI - 0.35 };                            // sentado en la cama, mirando a la ventana (un poco girado)
const FAC = { cols: [WIN.x, WIN.x + 3.8], fh: 2.9, floors: [-2, -1, 0, 1, 2] };   // la fachada: 2 columnas × 5 plantas = 10 ventanas (la suya: columna 0, planta 0)
const seg = (t, a, b) => clamp((t - a) / (b - a));
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));               // 0→1→0 suave entre a y b
const stdM = (c, r = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const litM = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
function boxAt(par, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; }
function cylAt(par, rt, rb, h, m, x, y, z, sg = 20) { const c = cyl(rt, rb, h, m, sg); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; par.add(c); return c; }
function rboxAt(par, w, h, d, m, r, x, y, z) { const b = rbox(w, h, d, m, r); b.position.set(x, y, z); par.add(b); return b; }
// degradado de 4 tonos para el sombreado de dibujo (personaje)
let _toonG = null;
function toonM(c, o = {}) { _toonG = _toonG || (() => { const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 140, 140, 140, 255, 205, 205, 205, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  return new THREE.MeshToonMaterial({ color: c, gradientMap: _toonG, ...o }); }
