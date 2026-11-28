// ---------------------------------------------------------------- «El escalón torcido»: LA HISTORIA (los tiempos salen de la voz, tiempos.json).
// Casa cortada de dos plantas en una isla que flota al amanecer. Abajo, el perfeccionista (arcilla gris azulada) pule el mismo escalón; arriba, la escalera de
// bloques torcidos que ha puesto el otro (arcilla cálida), uno cada día, sale por el tejado y sube en espiral. El efecto foco (foco de teatro, sala de siluetas que
// le miran: la mitad → uno de cada cuatro) → quieto → el año otra vez en un minuto (×1,01 cada día → ×37,8) → la trampilla se abre, luz cálida, la mano, su
// escalón perfecto como el primero y sube → «mándaselo a quien…»: se enciende el flexo y abajo hay otra persona puliendo (bucle).
let TL = {};
// ambientes de este vídeo: amanecer (siempre) y sala a oscuras (el efecto foco)
MOODS.alba = { zen: 0x3d4f88, hor: 0xffbe92, gnd: 0xe9b998, sunD: [0.16, 0.24, -0.96], sunC: 0xffc27a, sunS: 1.15, stars: 0.0, clouds: 0.85, fogC: 0xefc2a6, fogD: 0.0045,
  key: [0xffd2a0, 3.4], keyD: [0.3, 0.55, -0.78], fill: [0xaebdf0, 0.28], hemi: [0xffe2c8, 0x5a4a52, 0.4], env: 0.34, exp: 1.0 };
MOODS.teatro = { zen: 0x070a16, hor: 0x141a2e, gnd: 0x06070c, sunD: [0.16, 0.24, -0.96], sunC: 0x000000, sunS: 0.0, stars: 0.35, clouds: 0.0, fogC: 0x080a12, fogD: 0.012,
  key: [0xffd2a0, 0.06], keyD: [0.3, 0.55, -0.78], fill: [0x6a7aa8, 0.05], hemi: [0x30384e, 0x0a0b10, 0.1], env: 0.08, exp: 1.0 };
async function buildScene() {
  const LS = i => (WORDS.find(w => w.li === i) || { start: 0 }).start, LE = i => { const ws = WORDS.filter(w => w.li === i); return ws.length ? ws[ws.length - 1].end : 0; };
  const find = (w, li, exact, k = 1) => WORDS.filter(x => x.li === li && (exact ? x.n === norm(w) : x.n.startsWith(norm(w))))[k - 1];
  const W_ = (w, li, d = 0, exact = false, k = 1) => { const v = find(w, li, exact, k); if (!v) console.error('ERROR sin palabra ' + w + '_' + li); return v ? v.start - 0.03 + d : LS(li) + d; };
  const IDX = Array.from({ length: 12 }, (_, i) => i);
  TL = { end: END, L: IDX.map(LS), E: IDX.map(LE),
    abajo: W_('abajo', 1), anyo: W_('año', 1, 0, true), puliendo: W_('puliendo', 1), mismo: W_('mismo', 1), escalon1: W_('escalon', 1),
    arriba: W_('arriba', 2), puesto: W_('puesto', 2), uno2: W_('uno', 2, 0, true), cada2: W_('cada', 2), dia2: W_('dia', 2), torcidos: W_('torcidos', 2), casi: W_('casi', 2), todos: W_('todos', 2),
    abajo3: W_('abajo', 3), vago: W_('vago', 3), cerebro: W_('cerebro', 3), trampa: W_('trampa', 3), efecto: W_('efecto', 3), foco: W_('foco', 3),
    creemos: W_('creemos', 4), mundo: W_('mundo', 4), mirando: W_('mirando', 4), errores: W_('errores', 4),
    universidad: W_('universidad', 5), cornell: W_('cornell', 5), entrar: W_('entrar', 5), estudiantes: W_('estudiantes', 5), clase: W_('clase', 5), camiseta: W_('camiseta', 5), vergonzosa: W_('vergonzosa', 5),
    creian: W_('creian', 6), mitad: W_('mitad', 6), sala: W_('sala', 6), vio: W_('vio', 6, 0, true), uno6: W_('uno', 6, 0, true), cuatro: W_('cuatro', 6),
    nadie: W_('nadie', 7), mira7: W_('mira', 7, 0, true), crees: W_('crees', 7), miedo: W_('miedo', 7), mal: W_('mal', 7, 0, true), quieto7: W_('quieto', 7),
    quieto8: W_('quieto', 8), mejora: W_('mejora', 8, 0, true), mejorar: W_('mejorar', 8), ciento: W_('ciento', 8), dia8: W_('dia', 8), anyo8: W_('año', 8, 0, true), multiplica: W_('multiplica', 8), treinta: W_('treinta', 8), siete: W_('siete', 8),
    escalon9: W_('escalon', 9), torcido9: W_('torcido', 9), ridiculo: W_('ridiculo', 9), deja9b: W_('deja', 9, 0, true, 2), poco: W_('poco', 9), arriba9: W_('arriba', 9),
    manda: W_('mandaselo', 10), quien: W_('quien', 10), meses: W_('meses', 10), esperando: W_('esperando', 10), momento: W_('momento', 10), perfecto: W_('perfecto', 10) };
  // el año otra vez (L8): se recoge la escalera hasta el día 1 y vuelve a crecer hasta el 365
  TL.rw0 = TL.quieto8 - 0.1; TL.rw1 = TL.mejorar - 0.05; TL.gr0 = TL.mejorar + 0.05; TL.gr1 = TL.multiplica + 0.15;
  const G = new THREE.Group(); scene.add(G); S.G = G;
  S.isl = island(G); S.H = buildHouse(G); S.tree = seasonTree(G, WIN.x + 0.2, HO.zb - 2.1);
  S.cnt = slabCounter(G); buildFall(G);
  buildStairs(G);
  S.bench = workbench(G); S.stool = stool(G); S.lamp = deskLamp(G); S.block = perfectBlock(); G.add(S.block); S.block.position.copy(BLOCK0);
  paperBalls(G); S.sk = sketches(G); S.spot = theaterSpot(G);
  buildCast(G);
  S.glint = glowSprite(0xffffff, 0.2, 0); G.add(S.glint);
  // la luz de la trampilla abierta: foco cálido encima (con sombra: solo entra por el hueco) y un haz visible
  S.hsp = new THREE.SpotLight(0xffc98e, 0, 7, 0.62, 0.45, 1.0); S.hsp.position.set(HATCH.x - 0.15, HO.y2 + 1.6, HATCH.z - 0.35); S.hsp.target.position.set(HATCH.x + 0.05, 0, HATCH.z + 0.15);
  S.hsp.castShadow = true; S.hsp.shadow.mapSize.set(1024, 1024); S.hsp.shadow.bias = -0.0006; G.add(S.hsp, S.hsp.target);
  { const geo = new THREE.CylinderGeometry(HATCH.s * 0.7, HATCH.s * 0.86, HO.H1, 4, 1, true); geo.rotateY(Math.PI / 4);
    const m = new THREE.ShaderMaterial({ uniforms: { k: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying vec2 vU; varying vec3 vN, vV; void main(){ float f = abs(dot(vN, vV)); float a = k * (0.05 + 0.13 * vU.y) * smoothstep(0.0, 0.5, f); gl_FragColor = vec4(vec3(1., 0.8, 0.52) * a, 1.); }' });
    const sh = new THREE.Mesh(geo, m); sh.position.set(HATCH.x + 0.06, HO.H1 / 2, HATCH.z + 0.08); sh.renderOrder = 5; G.add(sh); S.shaft = sh; }
  // luz cálida de la planta alta (el sol que rebota) y fría de la baja; luz de la trampilla abierta
  nightSrc(_v(0.2, HO.y2 + 1.7, 0.2), 0xffd6a8, 1.6, 2.6, 'up'); nightSrc(_v(-1.2, HO.y2 + 0.9, 0.5), 0xffc890, 0.9, 1.8, 'up');
  nightSrc(_v(-0.6, 1.6, 0.6), 0x9fb6e0, 0.55, 2.2, 'dn');
  S.hsrc = nightSrc(_v(HATCH.x, HO.H1 - 0.25, HATCH.z), 0xffc98e, 0, 1.9, 'hatch');
  const r1 = rng(11); S.flow = [];
  envAll(scene); nightify(scene); NIGHT.on = true;
  NIGHT.zones.up = t => 1 - 0.9 * darkK(t); NIGHT.zones.dn = t => 1 - 0.95 * darkK(t) - 0.95 * outK(t); NIGHT.zones.lamp = t => lampK(t); NIGHT.zones.hatch = t => 1;
}
function stageAt(t, st) { NOW = t; lightsAt(st.l, st.p.distanceTo(st.l)); const d = darkK(t); moodMix({ alba: 1 - d, teatro: d });
  animAt(t, st); }
function fillAt(t) { return { k: 0, c: [0, 0, 0] }; }
