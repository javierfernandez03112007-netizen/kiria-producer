// prueba del decorado: primer fotograma, plano general, callejón, testigo, vista alta
async function labBuild() { scene.add(buildSet()); envAll(scene); }
const V = [[[2.5, 5.2, 13.5], [0, 2.6, -1.5], 42], [[0, 6, 16], [0, 3.5, -2], 45], [[6.6, 2.6, -16.5], [5.6, 1.0, -8.5], 50], [[-2.5, 2.2, 3], [-3.2, 2.0, -6.5], 45], [[22, 30, 42], [0, 0, -8], 45], [[-14, 3, 9], [6, 4, -6], 50]];
function labAt(t) { const v = V[Math.min(V.length - 1, Math.floor(t))]; moodSet(v === V[2] ? 'noche' : 'vice'); setAt(t, { cctv: 1, alarm: 1, alley: v === V[2] ? 1 : 0 }); return [...v[0], ...v[1], v[2], 0, 0]; }
