// ---------------------------------------------------------------- EL MUNDO: una casa de muñecas (sin pared delantera). 1 unidad = 1 m. +X a la derecha, +Y arriba, +Z hacia la cámara.
// Aula x ∈ [−13, −3] (los alumnos miran a la pizarra, a la izquierda; el reloj, en la pared del fondo) · pasillo x ∈ [−3, 2] · cafetería x ∈ [2, 14].
// Pared del fondo en z = −3,5; suelo hasta z = 3. La puerta del aula está en la pared x = −3.
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const ZB = -3.5, WH = 3.1;
const DESK = { x: -5.2, z: 1.2 };                       // el pupitre del protagonista (el más cercano a la cámara, última fila)
const CLOCK = new THREE.Vector3(-6.6, 2.4, ZB + 0.06);
const BAR = { x0: 3.4, x1: 9.2, z: -2.25, h: 0.95 };    // la barra de la cafetería (su tablero, a 0,95 m)
const CUP0 = new THREE.Vector3(4.9, BAR.h, -2.1), CUP1 = new THREE.Vector3(6.37, BAR.h, -2.0), PLATE = new THREE.Vector3(6.6, BAR.h, -2.1);
const TABLE = new THREE.Vector3(8.0, 0, 1.0);          // la mesa donde desayunan
const seg = (t, a, b) => clamp((t - a) / (b - a));
