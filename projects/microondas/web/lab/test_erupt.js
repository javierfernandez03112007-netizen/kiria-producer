// estallido: microondas cerrado, taza, gotas, agua continua y vapor; plano A/C. TAUS por defecto
let MW, MG, SP, EP;
async function labBuild() { MW = buildMicrowave(); MW.position.set(0, 0, -6); scene.add(MW); const U = MW.userData;
  MG = buildMug(); MG.position.copy(U.plateC).add(v3(0, U.plateTop - U.plateC.y + 0.02, 0)).add(MW.position); MG.rotation.y = -0.6; scene.add(MG);
  SP = buildSplash(2600, 1); SP.position.copy(MG.position); scene.add(SP); EP = buildErupt(3); SP.add(EP);
  envAll(scene, 1); for (const m of [U.M.enamel, U.mica.material, U.lampGrille.material]) envMat(m, 0.2); envAll(MG, 0.2); envAll(SP, 0.2); }
const TAUS = (window.TAUS || '0.01,0.02,0.035,0.055,0.08,0.11').split(',').map(Number);
function labAt(t) { const k = Math.round(t), tau = TAUS[k % TAUS.length], c = MG.position, wallZ = -6 - c.z - 0.25, dir = v3(0, 0, 1);
  microwaveAt(MW, { on: 1, turn: -0.6, display: '0:58' }); const U = MW.userData; U.screen.material.opacity = 1; U.veil.material.opacity = 0;
  splashAt(SP, tau, { dir, floor: -0.05, wallZ }); eruptAt(EP, tau, { dir, floor: -0.05, wallZ });
  const bulge = 0.35 * Math.exp(-Math.pow((tau - 0.012) / 0.02, 2)); mugSurface(MG, t, { amp: 0.35 * clamp(tau / 0.02), bulge, crown: 0.4 * clamp(tau / 0.05), rise: boilLevel(tau) });
  lightsAt(v3(c.x, c.y + 11, c.z), 15);
  return [c.x - 1.5, c.y + 15.3, c.z + 12.8, c.x, c.y + 10.5, c.z, 46, window.DOF ? Number(window.DOF) : 18]; }
