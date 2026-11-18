// ---------------------------------------------------------------- EL MUNDO (episodio 2): Kiria World ya es un pueblo. Cuadrícula vista en diagonal desde arriba.
// 1 unidad = 1 m. Las calles van a lo largo de X y de Z; la cámara mira en diagonal (desde +X,+Z), así que en pantalla:
//   U = (x − z)/√2 → derecha · V = −(x + z)/√2 → hacia el fondo (arriba en pantalla).
// Cada manzana (30 m) tiene 16 casas alrededor (una por cada 5 seguidores) y un patio en medio. En el centro, la plaza con el trono.
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const NPOP = 6124;                                   // seguidores de Instagram de kiria.ai el 18-11-2026 (dato de Javi; Metricool daba 6.081 el 17-11)
const NNAMED = 5997;                                 // de los primeros 5.997 hay nombre (exportación del 17-11); los nuevos, sin etiqueta hasta la próxima
const PITCH = 42, BLOCK = 30, SQ = Math.SQRT1_2;
const REG = { u: 104, v: 272 }, REG2 = { u: 146, v: 314 };      // el campamento del episodio 1 y el pueblo de hoy
const toU = (x, z) => (x - z) * SQ, toV = (x, z) => -(x + z) * SQ, fromUV = (u, v) => [(u - v) * SQ, -(u + v) * SQ];
const seg = (t, a, b) => clamp((t - a) / (b - a));
const h2 = (a, b) => hash(a * 12.9898 + b * 78.233 + 0.37);
// manzanas con algo especial (las demás son de casas)
const SPECIAL = { '0,-1': 'super', '-1,0': 'banco', '1,0': 'lago', '0,1': 'tiendas', '1,1': 'bomberos', '2,1': 'cole', '-1,1': 'obra', '1,-1': 'mercado', '-1,-1': 'parque', '2,0': 'deporte' };
const KING = NPOP - 1;                               // el rey de hoy (su comentario fue el más votado del episodio 1): sentado en el trono
// los seguidores que nombra la voz (número de seguidor por orden de llegada; los nombres van en script.txt)
const VIP = { cliente: 50, peluquera: 3951, carro: 2672, cajera: 5215 };
function makeBlocks() { const out = [];
  for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) { if (!i && !j) continue; const x = i * PITCH, z = j * PITCH, u = toU(x, z), v = toV(x, z), au = Math.abs(u), av = Math.abs(v);
    if (au > REG2.u - 12 || av > REG2.v - 12) continue;
    out.push({ i, j, x, z, u, v, core: au <= REG.u - 12 && av <= REG.v - 12, m: Math.max(au / REG.u, av / REG.v), r: Math.hypot(u, v), kind: SPECIAL[i + ',' + j] || null, h: h2(i, j) }); }
  return out.sort((p, q) => p.m - q.m); }
// camino en bucle alrededor de (cx, cz): cuadrado de semilado r con las esquinas redondeadas (radio q); s = metros recorridos → [x, z, rumbo]
function loopAt(cx, cz, r, q, s, dir = 1) { const Ls = 2 * (r - q), La = Math.PI * q / 2, P = 4 * (Ls + La); let u = ((dir > 0 ? s : -s) % P + P) % P; const k = Math.floor(u / (Ls + La)); u -= k * (Ls + La);
  let lx, lz, hx, hz; if (u < Ls) { lx = -r + q + u; lz = -r; hx = 1; hz = 0; } else { const a = (u - Ls) / q; lx = r - q + q * Math.sin(a); lz = -r + q - q * Math.cos(a); hx = Math.cos(a); hz = Math.sin(a); }
  for (let i = 0; i < k; i++) { [lx, lz] = [-lz, lx]; [hx, hz] = [-hz, hx]; }
  if (dir < 0) { hx = -hx; hz = -hz; } return [cx + lx, cz + lz, Math.atan2(hx, hz)]; }
const loopLen = (r, q) => 4 * (2 * (r - q) + Math.PI * q / 2);
