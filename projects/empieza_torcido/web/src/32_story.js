// ---------------------------------------------------------------- «Empieza torcido»: LA HISTORIA (sin voz: los tiempos son fijos, en segundos; dura 10 s).
// Sótano frío dentro de la isla: pule el bloque perfecto junto al montón de intentos tachados → entra un rayo de sol por la rendija de la trampilla → mira arriba →
// deja su bloque perfecto en el suelo (primer escalón) → los bloques tachados vuelan uno a uno y forman la escalera torcida → sube (se va calentando) → empuja la
// trampilla → sale a la hierba, de cara al sol, y el árbol florece. Arriba, todo el rato: «EMPIEZA TORCIDO.»
let TL = {};
const TT = { ray: 1.9, look: 2.2, stand: 2.75, place: 3.5, step0: 3.72, fly0: 3.85, fly1: 6.15, push: 6.45, open: 6.7, out0: 6.9, out1: 7.95, bloom: 7.55, turn: 8.1 };
MOODS.alba = { zen: 0x3d4f88, hor: 0xffbe92, gnd: 0xe9b998, sunD: [0.12, 0.16, -0.98], sunC: 0xffc27a, sunS: 1.2, stars: 0.0, clouds: 0.85, fogC: 0xefc2a6, fogD: 0.004,
  key: [0xffd2a0, 3.3], keyD: [0.25, 0.5, -0.83], fill: [0xaebdf0, 0.22], hemi: [0xffe2c8, 0x4a3e44, 0.32], env: 0.3, exp: 1.0 };
MOODS.sol = { zen: 0x5a78b8, hor: 0xffd4a4, gnd: 0xf0caa8, sunD: [0.12, 0.2, -0.98], sunC: 0xffd08a, sunS: 1.7, stars: 0.0, clouds: 0.85, fogC: 0xf6d2b6, fogD: 0.0035,
  key: [0xffdcae, 4.2], keyD: [0.25, 0.5, -0.83], fill: [0xc8d2f4, 0.32], hemi: [0xfff0dc, 0x5a4a50, 0.46], env: 0.42, exp: 1.0 };
async function buildScene() {
  TL = { end: END, ...TT };
  const G = new THREE.Group(); scene.add(G); S.G = G;
  S.isl = buildIsland(G); S.bas = buildBasement(G); S.tree = seasonTree(G, TREE.x, TREE.z);
  // todo lo del sótano va en un grupo con el suelo en y = 0
  const B = new THREE.Group(); B.position.y = BS.y0; G.add(B); S.B = B;
  S.bench = workbench(B); S.stool = stool(B); S.lamp = deskLamp(B); S.block = perfectBlock(); B.add(S.block); S.block.position.copy(BLOCK0);
  paperBalls(B); S.sk = sketches(B); buildPile(B);
  buildCast(B);
  S.glint = glowSprite(0xffffff, 0.2, 0); B.add(S.glint);
  // el rayo de sol por la rendija (un haz fino hasta el bloque) y su luz
  { const m = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying vec2 vU; varying vec3 vN, vV; void main(){ float f = abs(dot(vN, vV)); float a = k * (0.08 + 0.36 * vU.y) * smoothstep(0.05, 0.85, f); gl_FragColor = vec4(vec3(1., 0.82, 0.55) * a, 1.); }' });
    const g = new THREE.CylinderGeometry(0.02, 0.11, 1, 16, 1, true); g.translate(0, -0.5, 0); const r = new THREE.Mesh(g, m); r.frustumCulled = false; r.renderOrder = 5; B.add(r); S.ray = r; }
  S.raySrc = nightSrc(_v(0, 0, 0), 0xffc890, 0, 0.9, 'ray');
  // la luz de la trampilla abierta: foco cálido encima (con sombra: solo entra por el hueco) y un haz visible
  S.hsp = new THREE.SpotLight(0xffc98e, 0, 9, 0.6, 0.45, 1.0); S.hsp.position.set(HATCH.x - 0.2, 1.8, HATCH.z - 0.6); S.hsp.target.position.set(HATCH.x + 0.05, BS.y0, HATCH.z + 0.2);
  S.hsp.castShadow = true; S.hsp.shadow.mapSize.set(1024, 1024); S.hsp.shadow.bias = -0.0006; G.add(S.hsp, S.hsp.target); S.hsp.visible = false;
  { const Hh = BS.y1 - BS.y0, geo = new THREE.CylinderGeometry(HATCH.s * 0.66, HATCH.s * 0.86, Hh, 4, 1, true); geo.rotateY(Math.PI / 4);
    const m = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying vec2 vU; varying vec3 vN, vV; void main(){ float f = abs(dot(vN, vV)); float a = k * (0.04 + 0.14 * vU.y) * smoothstep(0.0, 0.5, f); gl_FragColor = vec4(vec3(1., 0.8, 0.52) * a, 1.); }' });
    const sh = new THREE.Mesh(geo, m); sh.position.set(HATCH.x + 0.05, (BS.y0 + BS.y1) / 2, HATCH.z + 0.08); sh.renderOrder = 5; G.add(sh); S.shaft = sh; }
  S.hsrc = nightSrc(_v(HATCH.x, BS.y1 - 0.3, HATCH.z), 0xffc98e, 0, 2.2, 'hatch');
  // una luz fría y baja de relleno en el sótano (que se lea la habitación) y otra cálida fuera
  nightSrc(_v(-0.4, BS.y0 + 1.7, -0.4), 0x8fa6d0, 0.35, 2.6, 'dn');
  buildFall(G);
  S.flow = [];
  envAll(scene); nightify(scene); NIGHT.on = true;
  NIGHT.zones.lamp = t => 1; NIGHT.zones.ray = t => 1; NIGHT.zones.hatch = t => 1; NIGHT.zones.dn = t => 1;
}
const sunK = t => win(t, TT.open - 0.1, 1.6);                         // el amanecer se enciende cuando abre la trampilla
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); const k = sunK(t); moodMix({ alba: 1 - k + 1e-4, sol: k + 1e-4 }); animAt(t, st); }
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
