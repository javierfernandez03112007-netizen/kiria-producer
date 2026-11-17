// ---------------------------------------------------------------- EL MUNDO: una calle de Vice City al atardecer, en maqueta. 1 unidad = 1 m.
// Ejes: +X hacia el este (a lo largo de la calle), +Y arriba, +Z hacia el sur (la playa). La cámara suele mirar al oeste, calle abajo, hacia la puesta de sol.
// Calzada z ∈ [−4, 4]; aceras z ∈ [−7,5, −4] (norte) y [4, 7,5] (sur). Edificios al norte (fachada en z = −7,5). El callejón, entre dos
// edificios, en x ∈ [4, 7,5]. La joyería (con su alarma) en x ∈ [−9, −1]. La cámara de seguridad cuelga de un pórtico en x = −10.
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const RING = new THREE.Vector3(0, 0, 0);                    // donde rodean al protagonista (primer y último fotograma)
const ALLEY = { x0: 4, x1: 7.5, z0: -7.5, z1: -19, hide: new THREE.Vector3(6.35, 0, -11.6), bin: new THREE.Vector3(5.2, 0, -10.2) };
const SHOP = { x0: -9, x1: -1, door: -5.2, alarm: new THREE.Vector3(-2.6, 3.55, -7.38) };
const CCTV = { x: -10, y: 2.55, z: -0.7, beam: 2.9 };            // en un pórtico sobre la calle, detrás del protagonista
const WIT = new THREE.Vector3(-3.4, 0.16, -5.5);            // el testigo, en la acera de la joyería
const CAR0 = { p: new THREE.Vector3(3.9, 0, -0.9), yaw: Math.PI - 0.08 };   // el coche del protagonista, aparcado junto a él
const NEON = { pink: 0xff4fb0, teal: 0x45f0e0, yellow: 0xffd34a, violet: 0xa06bff, orange: 0xff8a3d, red: 0xff3b4e, blue: 0x3d8bff };
// posiciones del cerco de policía (primer fotograma): [x, z, orientación]; el frente del coche es su +x local
const RINGP = [[-6.8, -1.2, -0.05], [8.2, -1.3, Math.PI + 0.15], [-2.0, -2.5, -0.2]];
const yawDir = a => new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));       // hacia dónde mira un objeto con rotation.y = a
