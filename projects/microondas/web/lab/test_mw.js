let MW;
async function labBuild() { MW = buildMicrowave(); MW.position.set(0, 0, -6); scene.add(MW); }
const VIEWS = [[-55, 32, 95, 0, 14, -16, 30], [0, 14, 70, -6, 13, -18, 32], [-3, 12, -3, -6, 7, -22, 60], [70, 40, 60, 0, 14, -20, 30]];
function labAt(t) { const k = Math.round(t); microwaveAt(MW, { on: k >= 1 ? 1 : 0, turn: t * 0.6, door: k === 2 ? 0.0 : 0, display: k ? '1:00' : '12:34' }); return VIEWS[k % 4]; }
