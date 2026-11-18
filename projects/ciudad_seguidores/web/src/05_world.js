// ---------------------------------------------------------------- EL MUNDO: una ciudad en cuadrícula vista en diagonal desde arriba (como un juego de construir ciudades).
// 1 unidad = 1 m. Las calles van a lo largo de X y de Z; la cámara mira en diagonal (desde +X,+Z), así que en pantalla:
//   U = (x − z)/√2 → derecha · V = −(x + z)/√2 → hacia el fondo (arriba en pantalla).
// La ciudad ocupa un rectángulo ALTO en pantalla (|U| ≤ 104, |V| ≤ 272) para llenar el formato vertical. En el centro, la plaza con el trono.
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const NPOP = 5997;                                   // seguidores de Instagram de kiria.ai (exportación de Instagram del 17-11-2026, 23:28)
const PITCH = 42, BLOCK = 30, SQ = Math.SQRT1_2;
const REG = { u: 104, v: 272 }, REG2 = { u: 146, v: 314 };      // la ciudad de hoy y el anillo por donde crecerá
const toU = (x, z) => (x - z) * SQ, toV = (x, z) => -(x + z) * SQ, fromUV = (u, v) => [(u - v) * SQ, -(u + v) * SQ];
const seg = (t, a, b) => clamp((t - a) / (b - a));
const h2 = (a, b) => hash(a * 12.9898 + b * 78.233 + 0.37);
const SPECIAL = { '0,-1': 'mercado', '-1,0': 'banco', '-1,-1': 'hacienda', '1,0': 'lago' };
const PLOTP = new THREE.Vector3(5.6, 0, 30.8);          // el solar vacío («tu casa todavía no existe»): una esquina de la manzana (0, 1)
// manzanas: núcleo (hoy) y anillo (crecimiento). m = lo lejos que está del centro (0 centro … 1 borde de la ciudad de hoy)
function makeBlocks() { const out = [];
  for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) { if (!i && !j) continue; const x = i * PITCH, z = j * PITCH, u = toU(x, z), v = toV(x, z), au = Math.abs(u), av = Math.abs(v);
    const core = au <= REG.u - 12 && av <= REG.v - 12, ring = !core && au <= REG2.u - 12 && av <= REG2.v - 12; if (!core && !ring) continue;
    out.push({ i, j, x, z, u, v, core, m: Math.max(au / REG.u, av / REG.v), r: Math.hypot(u, v), kind: SPECIAL[i + ',' + j] || null, h: h2(i, j) }); }
  return out; }
