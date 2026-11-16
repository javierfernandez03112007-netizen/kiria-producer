// ---------------------------------------------------------------- EL MUNDO (contrato común de todas las piezas; ver projects/whatsapp_mar/MUNDO.md)
// Todo el vídeo es UNA maqueta de museo: una franja de océano Atlántico en corte (como un acuario largo) apoyada sobre un mapa del mundo,
// de Brasil (Fortaleza) a la península (Sines, Portugal). En los dos extremos hay «viñetas» a escala humana: la playa de Brasil (el hijo) y el
// pueblo de España con la cocina de la madre y la antena; la costa de Portugal con la estación del cable. Tonga es otra maqueta pequeña en el
// Pacífico. La fibra por dentro es un decorado aparte (micro).
// Unidades: en las viñetas, 1 unidad = 1 m. El mapa: 10 unidades por grado (equirrectangular, centrado en LON0). El suelo del mapa es y = 0.
const LON0 = -20, MAPK = 10;
function wrapLon(lon) { let l = lon; while (l < LON0 - 180) l += 360; while (l >= LON0 + 180) l -= 360; return l; }
function mapP(lon, lat, y = 0) { return new THREE.Vector3((wrapLon(lon) - LON0) * MAPK, y, -lat * MAPK); }
// ---------- la franja del Atlántico (la maqueta): marco local X (de Brasil a la península), Y arriba, Z hacia la cara de cristal delantera
const SEA = 40;                 // altura del mar (sobre el mapa)
const SW = 40;                  // ancho de la franja (z ∈ [−20, 20])
const XB = 40, XE = 60;         // tierra de Brasil (x ∈ [−XB, 0]) y de la península (x ∈ [L, L+XE])
const GEO = { BR: [-38.54, -3.72], IB: [-8.87, 37.95], TONGA: [-175.2, -21.14], FIJI: [178.44, -18.14], NKC: [-15.97, 18.08] };
const BRm = mapP(...GEO.BR), IBm = mapP(...GEO.IB);
const SL = BRm.distanceTo(IBm);                       // largo del océano en la maqueta (≈ 511 unidades)
const SX = IBm.clone().sub(BRm).normalize(), SY = new THREE.Vector3(0, 1, 0), SZ = new THREE.Vector3().crossVectors(SX, SY);
const SLAB_M = new THREE.Matrix4().makeBasis(SX, SY, SZ).setPosition(BRm);       // local → mundo (la y local es la altura sobre el mapa)
function slabP(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(SLAB_M); }
function slabDir(x, y, z) { return new THREE.Vector3(x, y, z).transformDirection(SLAB_M); }
function inSlab(o) { o.matrixAutoUpdate = true; o.position.copy(BRm); o.quaternion.setFromRotationMatrix(SLAB_M); return o; }   // pone un grupo en el marco de la franja
// viñetas: la playa (origen en la orilla de Brasil, al nivel del mar) y la península (origen en la orilla de Portugal). Mismos ejes que la franja.
const BEACH0 = () => slabP(0, SEA, 0), IBERIA0 = () => slabP(SL, SEA, 0);
function atBeach(g) { inSlab(g); g.position.copy(BEACH0()); return g; }
function atIberia(g) { inSlab(g); g.position.copy(IBERIA0()); return g; }
// ---------- el fondo del mar: profundidad (bajo el nivel del mar, en unidades) a lo largo de la franja, x ∈ [0, SL]
// Brasil: la playa baja suave (x 0→3), plataforma (→25, 8 de hondo), talud (→48), llanura abisal (~33), dorsal en medio (sube a ~17 con su valle), llanura,
// talud de Portugal (estrecho), plataforma (6) y la playa (x = SL).
const _sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function seaDepth(x) {
  const xr = SL - x;                                                     // distancia a la orilla de Portugal
  let d = 33 + 1.2 * Math.sin(x * 0.07) + 0.8 * Math.sin(x * 0.19 + 1.3);  // llanura abisal (ondulada)
  const mid = SL * 0.56, r = Math.abs(x - mid);                            // la dorsal centroatlántica, con su valle en medio
  d -= 16 * Math.exp(-Math.pow(r / 34, 2)) - 4 * Math.exp(-Math.pow(r / 4, 2)) + 3 * Math.exp(-Math.pow((x - mid + 60) / 10, 2)) + 3 * Math.exp(-Math.pow((x - mid - 70) / 9, 2));
  d -= 9 * Math.exp(-Math.pow((x - SL * 0.3) / 6, 2));                    // un monte submarino
  const br = x < 3 ? 2 * _sm(0, 3, x) : x < 25 ? 2 + 6 * _sm(3, 25, x) : 8 + (d - 8) * _sm(25, 48, x);   // lado de Brasil
  const pt = xr < 3 ? 2 * _sm(0, 3, xr) : xr < 14 ? 2 + 4 * _sm(3, 14, xr) : 6 + (d - 6) * _sm(14, 34, xr); // lado de Portugal
  if (x < 48) return br; if (xr < 34) return pt; return d;
}
function seabedY(x, z = 0) { return SEA - seaDepth(x) + 0.25 * Math.sin(x * 0.9 + z * 0.7) * Math.sin(z * 0.5 - x * 0.3) * clamp(seaDepth(x) / 4); }
// los cables en la franja: el nuestro (el del mensaje) y otro al lado (el que rompe el ancla)
const CABLE_Z = 6, CABLE2_Z = -5;
// ---------- colores de la casa
const COL = { msg: 0x3ccf6e, msgHex: '#3CCF6E', light: 0x9ff3ff, cyan: '#5CF2E6', red: 0xff3b30, gold: 0xffc46b, water: 0x0b5873, deep: 0x041a2b, sand: 0xe7c98f };
// ---------- la burbuja del mensaje en 3D (verde, genérica; sin logos): «Hijo, ¿dónde estás?». Mide ≈ 1 × 0,42 unidades (escala con .scale)
function msgBubble(txt = 'Hijo, ¿dónde estás?') {
  const g = new THREE.Group(), w = 1, h = 0.42, sh = rrShape(w, h, 0.16);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(w, h, 0.16), { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 10 }),
    new THREE.MeshPhysicalMaterial({ color: COL.msg, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, emissive: COL.msg, emissiveIntensity: 0.35 }));
  body.geometry.translate(0, 0, -0.03); body.castShadow = true; g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 12), body.material); tail.position.set(-w / 2 + 0.1, -h / 2 - 0.03, 0); tail.rotation.z = 0.7; g.add(tail);
  const tex = canvasTex(1024, 430, (c, W2, H2) => { c.fillStyle = '#0b2a14'; c.font = '700 92px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, W2 / 2, H2 / 2 + 4); });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.94), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  face.position.z = 0.062; g.add(face); const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.062; g.add(back);
  g.userData = { body, face }; return g;
}
// ---------- los cortes de la maqueta (las caras de tierra y roca, como un pastel de capas). Todas las piezas usan esto para que se vea igual.
// strataFace(xs, top, z, o): cara vertical en z (marco local), con x en las muestras xs, desde y = o.bot hasta top(x). Las y se miden respecto al
// NIVEL DEL MAR (o.yOff = lo que hay que sumar para pasar a la y del grupo: 0 en las viñetas, SEA en la franja). o.band: franja de arriba (tierra
// oscura o arena) de ese grosor; o.bandCol su color. La normal mira hacia +z si z > 0 (y hacia −z si z < 0); o.normalX = ±1 para caras en x.
let _strT = null;
function strataTex() {
  if (_strT) return _strT;
  _strT = canvasTex(1024, 1024, (g, w, h) => {
    const L = [[5, '#b08a58'], [0, '#c8b289'], [-6, '#a89272'], [-14, '#b48a5e'], [-24, '#7a6553'], [-34, '#4a403b'], [-46, '#2f2a28']];   // techo de cada capa (y sobre el mar) y color
    const Y = y => (5 - y) / 50 * h;
    for (let i = 0; i < L.length - 1; i++) { const [y0, c] = L[i], y1 = L[i + 1][0]; g.fillStyle = c; g.beginPath(); g.moveTo(0, Y(y0) + (i ? 6 * Math.sin(i * 1.7) : 0));
      for (let x = 0; x <= w; x += 8) g.lineTo(x, Y(y0) + (i ? 7 * Math.sin(x / w * Math.PI * 2 * (2 + i) + i) + 4 * Math.sin(x / w * Math.PI * 2 * 7 + i * 3) : 0));
      g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill(); }
    for (let i = 0; i < 9000; i++) { const x = hash(i * 1.37) * w, y = hash(i * 2.11) * h, r = 0.6 + hash(i * 3.3) * 2.2, a = 0.05 + hash(i * 4.9) * 0.12;
      g.fillStyle = hash(i * 5.7) > 0.5 ? `rgba(255,240,210,${a})` : `rgba(30,20,10,${a})`; g.fillRect(x, y, r, r); }
    for (let i = 0; i < 70; i++) { const y = hash(i * 9.1) * h, a = 0.06 + hash(i * 7.3) * 0.08; g.strokeStyle = `rgba(40,28,18,${a})`; g.lineWidth = 1 + hash(i) * 2; g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + 5 * Math.sin(x / w * Math.PI * 2 * 3 + i)); g.stroke(); }
  });
  _strT.wrapS = THREE.RepeatWrapping; return _strT;
}
let _strM = null;
const strataMat = () => _strM || (_strM = new THREE.MeshStandardMaterial({ map: strataTex(), roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
function strataFace(xs, top, z, o = {}) {
  const bot = o.bot ?? -SEA, yOff = o.yOff ?? 0, nx = o.normalX || 0, band = o.band ?? 0, g = new THREE.Group();
  const quad = (yb, yt, mat, uvs) => { const P = [], U = [], I = [];
    xs.forEach((x, i) => { const a = yb(x), b = yt(x); if (nx) { P.push(z, a + yOff, x, z, b + yOff, x); } else P.push(x, a + yOff, z, x, b + yOff, z); U.push(x / 40, uvs ? (a + 45) / 50 : 0, x / 40, uvs ? (b + 45) / 50 : 1); if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; g.add(m); return m; };
  quad(() => bot, x => top(x) - band, strataMat(), true);
  if (band > 0) quad(x => top(x) - band, top, new THREE.MeshStandardMaterial({ color: o.bandCol ?? 0x5b4630, roughness: 0.95, side: THREE.DoubleSide }), false);
  return g;
}
