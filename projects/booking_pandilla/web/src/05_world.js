// ---------------------------------------------------------------- EL MUNDO: seis decorados pequeños (maquetas), uno por sitio, separados 40 m en X. 1 unidad = 1 m.
// +X derecha, +Y arriba, +Z hacia la cámara. Cada plano del guion es un decorado y una cámara; entre planos hay CORTE (no barrido).
function fnOf(n) { try { return eval('typeof ' + n + " === 'function' ? " + n + ' : null'); } catch (e) { return null; } }
const O = { lib: 0, bus: 40, kit: 80, bed: 120, sofa: 160, town: 240 };       // origen (x) de cada decorado
const seg = (t, a, b) => clamp((t - a) / (b - a));
// los planos: nombre, inicio, fin (s). 1 la chispa · 2 el grupo responde (tres planos cortos) · 3 comparar · 4 la votación (+ el abrazo) · 5 el viaje (cuatro planos)
const SHOTS = [['lib', 0, 5], ['bus', 5, 6.65], ['kit', 6.65, 8.3], ['bed', 8.3, 10], ['sofa', 10, 20], ['vote', 20, 24.0], ['hug', 24.0, 25],
  ['arrive', 25, 27.4], ['beach', 27.4, 29.7], ['wall', 29.7, 32.1], ['selfie', 32.1, 35.01]].map(s => ({ n: s[0], a: s[1], b: s[2] }));
function shotAt(t) { for (const s of SHOTS) if (t < s.b) return s; return SHOTS[SHOTS.length - 1]; }
// el alojamiento del ejemplo (INVENTADO: nombres, precios y notas de mentira para enseñar cómo se compara)
const STAYS = [{ id: 'A', name: 'Apto. Las Dunas', score: '8,2', word: 'Muy bien', price: 520, col: '#f0a020' }, { id: 'B', name: 'Piso Brisa del Mar', score: '9,1', word: 'Fantástico', price: 352, col: '#2f9e5a' },
  { id: 'C', name: 'Hostal El Faro', score: '6,4', word: 'Agradable', price: 298, col: '#8a5cd0' }];
