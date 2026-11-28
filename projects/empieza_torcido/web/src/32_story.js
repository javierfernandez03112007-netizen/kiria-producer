// ---------------------------------------------------------------- «Empieza torcido» (v2, blanco, negro y grises): LA HISTORIA (sin voz: tiempos fijos; dura 8 s).
// Arrodillado, pule un cubo blanco perfecto junto al montón de bloques tachados; arriba flota una puerta cerrada con luz por las rendijas → se entreabre y le
// cae un rayo → mira arriba → deja el cubo como primer escalón → los bloques tachados vuelan y forman la escalera torcida → sube (de gris a blanco) → abre la
// puerta: la luz lo inunda → se queda en el umbral, silueta. Arriba, todo el rato: «EMPIEZA TORCIDO.»
let TL = {};
const TT = { crack: 1.25, look: 1.5, stand: 2.0, place: 2.5, step0: 2.68, fly0: 2.72, fly1: 4.95, push: 5.2, open: 5.38, walk0: 5.55, walk1: 6.45 };
MOODS.negro = { zen: 0x000000, hor: 0x070707, gnd: 0x000000, sunD: [0.2, 0.3, -0.9], sunC: 0x000000, sunS: 0.0, stars: 0.0, clouds: 0.0, fogC: 0x000000, fogD: 0.018,
  key: [0xffffff, 0.28], keyD: [-0.5, 0.75, 0.45], fill: [0xffffff, 0.08], hemi: [0xffffff, 0x000000, 0.07], env: 0.12, exp: 1.0 };
async function buildScene() {
  TL = { end: END, ...TT };
  const G = new THREE.Group(); scene.add(G); S.G = G;
  S.st = buildStage(G); S.cube = perfectCube(); G.add(S.cube); S.cube.position.copy(CUBE0);
  buildBlocks(G); buildDust(G); buildCast(G);
  S.glint = glowSprite(0xffffff, 0.2, 0); G.add(S.glint);
  S.flow = [];
  envAll(scene); nightify(scene); NIGHT.on = true;
}
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); moodMix({ negro: 1 }); animAt(t, st); }
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
