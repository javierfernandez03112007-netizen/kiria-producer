// ---------------------------------------------------------------- «Empieza torcido»: EL PERSONAJE (maniquí de arcilla de 22_clay.js: gris azulado y encorvado
// en el sótano; se va calentando mientras sube hasta el blanco cálido de fuera).
const COL = { A: 0x8f9bab, W: 0xf3e5cf };
const CAST = {};
function buildCast(B) { CAST.A = mannequin({ col: COL.A, h: 1.62, phase: 0.4 }); B.add(CAST.A); CAST.AM = CAST.A.userData.mat; CAST.A0 = new THREE.Color(COL.A); CAST.A1 = new THREE.Color(COL.W); }
