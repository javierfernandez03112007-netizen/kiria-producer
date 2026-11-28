// ---------------------------------------------------------------- «La sombra» (blanco, negro y grises; sin voz; 21 s). LA HISTORIA (tiempos fijos).
// Quieto entre el farol y la pared, delante de su sombra de nueve metros → se sobresalta → retrocede dos pasos hacia el farol (la sombra crece y se sale del
// plano) → se encoge, se tapa la cabeza y tiembla (la sombra tiembla con la llama) → se calma, baja los brazos, respira → avanza hacia la pared (el primer
// paso con duda): la sombra encoge con cada paso → llega, levanta la mano y toca la pared: la mano de su sombra se junta con la suya, los dos del mismo tamaño.
let TL = {};
const TT = { startle: 2.4, back0: 2.65, back1: 4.45, cower0: 4.3, cower1: 7.5, rise0: 7.5, rise1: 9.6, walk0: 10.5, walk1: 17.3, hand0: 17.65, touch: 18.8 };
MOODS.oscuro = { zen: 0x000000, hor: 0x030303, gnd: 0x000000, sunD: [0.2, 0.3, -0.9], sunC: 0x000000, sunS: 0.0, stars: 0.0, clouds: 0.0, fogC: 0x000000, fogD: 0.006,
  key: [0xffffff, 0.0], keyD: [-0.5, 0.75, 0.45], fill: [0xffffff, 0.035], hemi: [0xffffff, 0x000000, 0.045], env: 0.05, exp: 1.0 };
const P_START = _v(-1.0, 0, 1.15), P_BACK = _v(-1.17, 0, 1.6), P_WALL = _v(0.16, 0, -2.62);
async function buildScene() {
  TL = { end: END, ...TT };
  const G = new THREE.Group(); scene.add(G); S.G = G;
  S.room = buildRoom(G); S.lan = buildLantern(G); S.L = Object.assign(S.L || {}, {}); S.lamp = buildLampLights(G); buildMotes(G);
  CAST.A = mannequin({ col: 0x9c9c9c, h: 1.66, phase: 0.4 }); G.add(CAST.A); CAST.AM = CAST.A.userData.mat;
  S.flow = [];
  envAll(scene); nightify(scene); NIGHT.on = true;
}
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); moodMix({ oscuro: 1 }); post.uniforms.ca.value = 0; animAt(t, st); }
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
const CAST = {};
