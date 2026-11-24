// ---------------------------------------------------------------- LA GENTE (día 3, Javi: «personas con boca y ojos, más realistas»)
// Cuerpo articulado (cadera, columna, pecho, cuello, cabeza, hombros, codos, muñecas, caderas, rodillas, tobillos), ropa y pelo variados, y una CARA
// pintada en el sombreador de la cabeza: ojos con iris, pupila y brillo que parpadean y miran, cejas, mejillas, nariz en relieve y una boca con
// labios que habla, sonríe y mastica. Sin texturas: la cara se ve nítida tanto de cerca (el rey) como a varios metros (la gente tras los cristales).
const FACE_FN = `
float fFill(float d){ float w = fwidth(d) * 0.8 + 1e-4; return 1.0 - smoothstep(-w, w, d); }
float fEll(vec2 p, vec2 r){ return (length(p / r) - 1.0) * min(r.x, r.y); }
void kwFace(inout vec3 col, inout vec3 em, inout float eyeM){
  vec3 d = normalize(vObj); if (d.z < 0.15) return;
  vec2 p = vec2(atan(d.x, d.z), asin(clamp(d.y, -1., 1.)));
  // mejillas
  for (int s = 0; s < 2; s++) { float sx = s == 0 ? -1. : 1.; col = mix(col, col * vec3(1.06, 0.80, 0.80), blush * (1. - smoothstep(0.02, 0.16, length(p - vec2(0.40 * sx, -0.20))))); }
  // ojos
  for (int s = 0; s < 2; s++) {
    float sx = s == 0 ? -1. : 1.; vec2 c = vec2(0.33 * sx, 0.06); vec2 r = vec2(0.17, 0.1);
    vec2 q = p - c; float ky = max(0.25, 1.0 - 0.32 * pow(q.x / r.x, 2.));
    float de = fEll(vec2(q.x, q.y / ky), r);
    float lidTop = c.y + r.y * (1.0 - 2.05 * blink) - 0.004;
    float vis = fFill(de) * fFill(p.y - lidTop);
    vec2 ic = c + vec2(gaze.x * 0.055, gaze.y * 0.03 - 0.004);
    float di = length(p - ic);
    vec3 ecol = vec3(0.93, 0.92, 0.89);
    ecol = mix(ecol, mix(eyeC * 0.45, eyeC, smoothstep(0.07, 0.025, di)), fFill(di - 0.066));
    ecol = mix(ecol, vec3(0.015), fFill(di - 0.03));
    ecol *= 1.0 - 0.25 * smoothstep(0.0, 0.05, q.y - (lidTop - c.y) + 0.05) * step(0.5, vis);   // sombra del párpado
    col = mix(col, ecol, vis); eyeM = max(eyeM, vis);
    em += vec3(0.75) * fFill(length(p - (ic + vec2(-0.02 * sx * 0.0 - 0.018, 0.024))) - 0.013) * vis;
    // pestañas / línea del párpado de arriba
    float topEdge = min(lidTop, c.y + r.y * ky * sqrt(max(0., 1. - pow(q.x / r.x, 2.))));
    float lash = fFill(abs(p.y - topEdge) - 0.011) * fFill(abs(q.x) - r.x * 1.04);
    col = mix(col, lashC, lash * 0.92);
    // línea suave de abajo
    float botEdge = c.y - r.y * ky * sqrt(max(0., 1. - pow(q.x / r.x, 2.)));
    col = mix(col, col * 0.82, fFill(abs(p.y - botEdge) - 0.006) * fFill(abs(q.x) - r.x * 0.9) * 0.6);
    // ceja
    vec2 bq = p - vec2(0.33 * sx, 0.235 + brow * 0.035);
    float by = 0.03 * (1. - pow(bq.x / 0.16, 2.)) + sx * bq.x * 0.08 * browTilt;
    float bw = 0.021 * browW * (1. - 0.55 * smoothstep(0.0, 0.16, sx * bq.x));
    col = mix(col, browC, fFill(abs(bq.y - by) - bw) * fFill(abs(bq.x) - 0.165));
  }
  // boca
  vec2 mq = p - vec2(0., -0.335);
  float w = 0.165 + 0.035 * smile; float xn = mq.x / w;
  float yy = mq.y - smile * 0.045 * xn * xn + 0.012 * smile;
  float hh = 0.005 + 0.07 * open;
  float lipsD = fEll(vec2(mq.x, yy - 0.002), vec2(w * 1.06, hh + 0.026));
  col = mix(col, lipC, fFill(lipsD) * 0.95);
  float dm = fEll(vec2(mq.x, yy), vec2(w * 0.9, hh));
  vec3 inner = mix(vec3(0.30, 0.06, 0.07), vec3(0.9, 0.88, 0.84), smoothstep(0.3, 0.55, open) * step(hh * 0.35, yy));
  col = mix(col, inner, fFill(dm) * smoothstep(0.0, 0.08, open));
  col = mix(col, lipC * 0.45, fFill(abs(yy) - 0.005) * fFill(abs(xn) - 0.92) * (1. - smoothstep(0.02, 0.1, open)));
  // sombra bajo la nariz y en las comisuras
  col *= 1.0 - 0.12 * (1. - smoothstep(0.0, 0.06, length(p - vec2(0., -0.2))));
}`;
let FACE_MATS = [];
function faceMat(o) {
  const m = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.52, metalness: 0 });
  const U = { blink: { value: 0 }, open: { value: 0 }, smile: { value: o.smile ?? 0.35 }, gaze: { value: new THREE.Vector2() }, brow: { value: 0 }, browTilt: { value: 0 }, browW: { value: 1 }, blush: { value: o.blush ?? 0.22 },
    eyeC: { value: new THREE.Color(o.eye) }, browC: { value: new THREE.Color(o.brow) }, lipC: { value: new THREE.Color(o.lip) }, lashC: { value: new THREE.Color(0x1a1210) } };
  m.userData.U = U;
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
    sh.fragmentShader = 'varying vec3 vObj; uniform float blink, open, smile, brow, browTilt, browW, blush; uniform vec2 gaze; uniform vec3 eyeC, browC, lipC, lashC;\n' + FACE_FN + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n vec3 faceE = vec3(0.); float eyeM = 0.; kwFace(diffuseColor.rgb, faceE, eyeM);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.12, eyeM);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += faceE;'); };
  m.customProgramCacheKey = () => 'kwFace4';
  FACE_MATS.push(m); return m; }

// ---- piezas
const SKINS = [0xf2d3be, 0xe8c1a4, 0xd9ab8c, 0xc79473, 0xa97a5c, 0x8c5f45, 0x6b4634, 0xf6e0d0];
const HAIRC = [0x1d1512, 0x2e2018, 0x4a2f1d, 0x6b4426, 0x8c5a2e, 0xc79a5a, 0xe2c27e, 0x9a3b1c, 0x7d7d80, 0xd8d5d0];
const EYEC = [0x3b2414, 0x4d2f17, 0x5e3a1c, 0x2f6b8a, 0x4b7a45, 0x6e5a30];
const TOPC = [0xc63d3d, 0x2f5fa8, 0x3f8a5e, 0xe2b13c, 0x2b2f38, 0xe8e4dc, 0x7a4fa0, 0xd9773a, 0x5e8fb8, 0x9a2f4f, 0x33706f, 0xb7a68a, 0x1e3352];
const LEGC = [0x2a3346, 0x1f2229, 0x4a4f58, 0x6b5a45, 0x3a4a6b, 0x8a7a62, 0x23262c];
const _mc = new Map();
const matOf = (c, r = 0.85, extra = {}) => { const k = c + '|' + r + JSON.stringify(extra); if (!_mc.has(k)) _mc.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra })); return _mc.get(k); };
const capsG = new Map(); const capG = (r, l) => { const k = r.toFixed(3) + ',' + l.toFixed(3); if (!capsG.has(k)) { const g = new THREE.CapsuleGeometry(r, l, 6, 14); g.translate(0, -l / 2 - r * 0.15, 0); capsG.set(k, g); } return capsG.get(k); };
function pm(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }
// torso: perfil torneado (cintura → pecho → hombros), aplanado de delante a atrás
function torsoGeo(wW, wC, wS, h, flat = 0.64) { const P = [[0.0, 0], [wW, 0.0], [wW * 1.04, h * 0.25], [wC, h * 0.62], [wC * 1.02, h * 0.82], [wS * 0.82, h * 0.95], [wS * 0.35, h * 1.02], [0.0, h * 1.03]].map(q => new THREE.Vector2(q[0], q[1]));
  const g = new THREE.LatheGeometry(P, 28); g.scale(1, 1, flat); g.computeVertexNormals(); return g; }
// la cabeza: esfera con barbilla algo más estrecha (en unidades de cabeza; la malla se escala a metros)
let _headG = null;
function headGeo() { if (_headG) return _headG; const g = new THREE.SphereGeometry(1, 48, 36), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const jaw = y < -0.1 ? 1 - 0.22 * Math.min(1, (-y - 0.1) / 0.8) : 1; x *= jaw; z *= y < -0.2 ? 1 - 0.08 * Math.min(1, (-y - 0.2) / 0.7) : 1; if (z > 0.6 && y < 0.25 && y > -0.55) z += 0.02 * (1 - Math.abs(x)); p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return (_headG = g); }
// pelo: casquete (y melena, moño, coleta o rizos según el estilo)
function hairGeo(style) { const G = []; const cap = new THREE.SphereGeometry(1.07, 36, 24, 0, Math.PI * 2, 0, style === 'buzz' ? 1.25 : 1.45); cap.rotateX(-0.28); cap.translate(0, 0.06, -0.05); G.push(cap);
  if (style === 'long' || style === 'bob') { const L = style === 'long' ? 1.9 : 1.15, back = new THREE.CylinderGeometry(1.0, 1.08, L, 32, 4, true, Math.PI * 0.55, Math.PI * 0.9); back.translate(0, -L / 2 + 0.25, -0.12); G.push(back); }
  if (style === 'bun') { const b = new THREE.SphereGeometry(0.42, 18, 14); b.translate(0, 0.72, -0.72); G.push(b); }
  if (style === 'pony') { const b = new THREE.SphereGeometry(0.3, 14, 10); b.translate(0, 0.35, -1.0); G.push(b); const t = new THREE.CapsuleGeometry(0.22, 0.9, 6, 12); t.rotateX(0.35); t.translate(0, -0.3, -1.12); G.push(t); }
  if (style === 'curly') { const R = rng(7); for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, e = R() * 1.2 + 0.05, s = new THREE.SphereGeometry(0.32 + R() * 0.12, 10, 8); s.translate(Math.cos(a) * Math.cos(e) * 1.02, 0.15 + Math.sin(e) * 1.02, Math.sin(a) * Math.cos(e) * 1.02 - 0.12); G.push(s); } }
  const g = mergeGeometries(G.map(x => x.index ? x.toNonIndexed() : x)); g.computeVertexNormals(); return g; }
const _hairG = {}; const hairOf = s => _hairG[s] || (_hairG[s] = hairGeo(s));
let _hairN = null;
function hairNormal() { if (_hairN) return _hairN; const c = cnv(256, 256), g = c.getContext('2d'), R = rng(5); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) { const x = R() * 256, v = (100 + R() * 120) | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.6 + R() * 1.6; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (R() - 0.5) * 20, 90, x + (R() - 0.5) * 20, 170, x + (R() - 0.5) * 12, 256); g.stroke(); }
  _hairN = normalFrom(c, 3.5); _hairN.repeat.set(6, 1); return _hairN; }

// ---- una persona. o: { h, skin, hair:{style,color}, top, topType:'tee'|'long'|'coat'|'apron'|'chef'|'vet'|'king', legs, skirt, shoes, eye, female, seed }
// miembro torneado (cilindro con radios distintos y casquetes redondos): cuelga hacia −y desde la articulación
const _limbG = new Map();
function limbG(r0, r1, L) { const key = [r0, r1, L].map(x => x.toFixed(4)).join(','); if (_limbG.has(key)) return _limbG.get(key);
  const P = [], n = 7; for (let i = 0; i <= n; i++) { const a = Math.PI / 2 * (1 - i / n); P.push(new THREE.Vector2(r0 * Math.cos(a), r0 * Math.sin(a))); }
  P.push(new THREE.Vector2(r0, 0)); for (let i = 1; i <= 6; i++) { const u = i / 6, r = r0 + (r1 - r0) * u + Math.sin(u * Math.PI) * (r0 - r1) * 0.25; P.push(new THREE.Vector2(r, -L * u)); }
  for (let i = 1; i <= n; i++) { const a = -Math.PI / 2 * i / n; P.push(new THREE.Vector2(r1 * Math.cos(a), -L + r1 * Math.sin(a))); }
  const g = new THREE.LatheGeometry(P.map(v => new THREE.Vector2(Math.max(v.x, 1e-4), v.y)), 18); g.computeVertexNormals(); _limbG.set(key, g); return g; }
function person(o = {}) {
  const R = rng(o.seed ?? 1), h = o.h ?? (o.female ? 1.64 + R() * 0.1 : 1.73 + R() * 0.12), k = h / 1.72;
  const skin = o.skin ?? pick(R, SKINS), hairC = o.hairC ?? pick(R, HAIRC), top = o.top ?? pick(R, TOPC), legs = o.legs ?? pick(R, LEGC), shoes = o.shoes ?? pick(R, [0x1b1b1d, 0x3b2a20, 0xe8e6e0, 0x5a4636]);
  const style = o.hairStyle ?? (o.female ? pick(R, ['long', 'bob', 'bun', 'pony', 'curly', 'long']) : pick(R, ['short', 'short', 'buzz', 'curly', 'short', 'bald']));
  const topEff = ['vet', 'chef'].includes(o.topType) ? 0xf6f6f2 : top; const mSkin = matOf(skin, 0.55), mTop = matOf(topEff, 0.8), mTop2 = matOf(new THREE.Color(topEff).multiplyScalar(0.8).getHex(), 0.8), mLegs = matOf(legs, 0.82), mShoe = matOf(shoes, 0.45), mSole = matOf(0x2a2622, 0.7), mHair = matOf(hairC, 0.55, { normalMap: hairNormal(), normalScale: new THREE.Vector2(0.9, 0.9) });
  const root = new THREE.Group(), J = {}; root.userData = { J, k, h, seed: o.seed ?? 1, R, o, phase: R() * 100 };
  const jt = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const F = o.female ? 1 : 0;
  const pel = jt('pelvis', root, 0, 0.9 * k, 0), spine = jt('spine', pel, 0, 0.0, 0), chest = jt('chest', spine, 0, 0.27 * k, 0), neck = jt('neck', chest, 0, 0.19 * k, 0), head = jt('head', neck, 0, 0.07 * k, 0);
  root.userData.base = { pelY: 0.9 * k };
  // tronco: cadera → cintura → pecho → hombros caídos → base del cuello (un solo torneado, aplanado)
  const prof = [[0.0, -0.06], [0.13 + 0.015 * F, -0.06], [0.138 + 0.02 * F, 0.02], [0.123 - 0.008 * F, 0.13], [0.142 + 0.006 * F, 0.27], [0.15, 0.36], [0.128 - 0.012 * F, 0.425], [0.075, 0.46], [0.045, 0.47], [0.0, 0.47]];
  const tg = new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 32); tg.scale(1, 1, 0.68); tg.computeVertexNormals(); const torso = pm(tg, mTop); spine.add(torso);
  // cinturón y cuello de la camisa
  if (!['vet', 'chef', 'king', 'coat'].includes(o.topType) && !o.skirt) { const belt = pm(new THREE.CylinderGeometry(0.137 * k, 0.139 * k, 0.03 * k, 32, 1, true), matOf(0x2a2420, 0.5)); belt.scale.z = 0.68; belt.position.y = 0.02 * k; spine.add(belt); }
  const col = pm(new THREE.TorusGeometry(0.05 * k, 0.012 * k, 8, 24), mTop2); col.rotation.x = Math.PI / 2; col.position.y = 0.455 * k; spine.add(col);
  // pierna de los pantalones arriba (la cadera)
  const hip = pm(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), mLegs); hip.scale.set((0.135 + 0.015 * F) * k, 0.12 * k, 0.095 * k); hip.position.y = -0.03 * k; pel.add(hip);
  const nk = pm(new THREE.CylinderGeometry(0.04 * k, 0.046 * k, 0.12 * k, 16), mSkin); nk.position.y = 0.02 * k; neck.add(nk);
  // cabeza (grande, estilo animación: la cara se lee de lejos), nariz, orejas y pelo
  const HS = [0.112 * k, 0.136 * k, 0.122 * k], HY = 0.11 * k;
  const fm = faceMat({ skin, eye: o.eye ?? pick(R, EYEC), brow: new THREE.Color(hairC).multiplyScalar(0.7).getHex(), lip: new THREE.Color(skin).lerp(new THREE.Color(0xb4555a), 0.55).getHex(), blush: o.female ? 0.28 : 0.15 });
  const hd = pm(headGeo(), fm); hd.scale.set(...HS); hd.position.y = HY; head.add(hd);
  const nose = pm(new THREE.SphereGeometry(1, 14, 10), mSkin); nose.scale.set(0.018 * k, 0.027 * k, 0.024 * k); nose.position.set(0, HY - 0.016 * k, HS[2] * 0.97); nose.rotation.x = -0.3; head.add(nose);
  for (const s of [-1, 1]) { const ear = pm(new THREE.SphereGeometry(1, 12, 10), mSkin); ear.scale.set(0.013 * k, 0.032 * k, 0.022 * k); ear.position.set(s * HS[0] * 0.97, HY - 0.005 * k, -0.005 * k); head.add(ear); }
  if (style !== 'bald') { const hr = pm(hairOf(style), mHair); hr.scale.set(...HS); hr.position.y = HY; head.add(hr); }
  // brazos (hombro algo metido en el tronco; manga corta o larga)
  const longSleeve = ['long', 'coat', 'chef', 'vet', 'king'].includes(o.topType);
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const sh = jt('sh' + n, chest, s * (0.132 + 0.008 * (1 - F)) * k, 0.128 * k, 0); const shp = pm(new THREE.SphereGeometry(0.042 * k, 16, 12), mTop); sh.add(shp);
    const up = pm(limbG(0.041 * k, 0.033 * k, 0.26 * k), longSleeve ? mTop : mSkin); sh.add(up);
    if (!longSleeve) { const sl = pm(limbG(0.047 * k, 0.044 * k, 0.1 * k), mTop); sh.add(sl); }
    const el = jt('el' + n, sh, 0, -0.27 * k, 0); const fo = pm(limbG(0.034 * k, 0.026 * k, 0.23 * k), longSleeve ? mTop : mSkin); el.add(fo);
    const wr = jt('wr' + n, el, 0, -0.24 * k, 0); const hand = pm(new THREE.SphereGeometry(1, 14, 10), mSkin); hand.scale.set(0.03 * k, 0.05 * k, 0.017 * k); hand.position.y = -0.04 * k; wr.add(hand);
    const th = pm(limbG(0.01 * k, 0.008 * k, 0.035 * k), mSkin); th.position.set(-s * 0.02 * k, -0.012 * k, 0.012 * k); th.rotation.z = s * 0.7; wr.add(th);
    sh.rotation.z = s * 0.06; el.rotation.x = -0.12; }
  // piernas (muslo y pierna torneados; zapato con suela)
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    const hp = jt('hp' + n, pel, s * 0.075 * k, -0.04 * k, 0); const th = pm(limbG(0.072 * k, 0.05 * k, 0.4 * k), o.skirt ? mSkin : mLegs); hp.add(th);
    const kn = jt('kn' + n, hp, 0, -0.42 * k, 0); const sn = pm(limbG(0.05 * k, 0.034 * k, 0.38 * k), o.shorts || o.skirt ? mSkin : mLegs); kn.add(sn);
    const an = jt('an' + n, kn, 0, -0.41 * k, 0); const shoe = pm(new THREE.SphereGeometry(1, 18, 12), mShoe); shoe.scale.set(0.045 * k, 0.042 * k, 0.115 * k); shoe.position.set(0, -0.015 * k, 0.04 * k); an.add(shoe);
    const sole = pm(new THREE.BoxGeometry(0.085 * k, 0.018 * k, 0.24 * k), mSole); sole.position.set(0, -0.045 * k, 0.04 * k); an.add(sole); }
  // falda, delantal, bata, chaqueta de cocinero, capa de rey
  if (o.skirt) { const sk = pm(new THREE.CylinderGeometry(0.135 * k, 0.21 * k, 0.4 * k, 28, 1, true), matOf(o.skirt, 0.85, { side: THREE.DoubleSide })); sk.scale.z = 0.8; sk.position.y = -0.2 * k; pel.add(sk); }
  if (o.topType === 'apron' || o.topType === 'chef') { const ap = pm(new THREE.BoxGeometry(0.27 * k, 0.6 * k, 0.01 * k), matOf(o.apron ?? 0xf4f1ea, 0.9)); ap.position.set(0, -0.08 * k, 0.122 * k); spine.add(ap); }
  if (o.topType === 'vet' || o.topType === 'coat' || o.topType === 'chef') { const cc = o.topType === 'coat' ? top : 0xf6f6f2, coat = pm(new THREE.CylinderGeometry(0.15 * k, 0.2 * k, 0.48 * k, 28, 1, true), matOf(cc, 0.85, { side: THREE.DoubleSide })); coat.scale.z = 0.72; coat.position.y = -0.2 * k; spine.add(coat);
    if (o.topType === 'vet') { const st = pm(new THREE.TorusGeometry(0.07 * k, 0.006 * k, 8, 24, Math.PI * 1.2), matOf(0x2a2c30, 0.4)); st.rotation.set(Math.PI / 2 + 0.35, 0, Math.PI * 0.9); st.position.set(0, 0.18 * k, 0.06 * k); chest.add(st); } }
  if (o.topType === 'king') { const cape = pm(new THREE.CylinderGeometry(0.17 * k, 0.4 * k, 1.2 * k, 32, 6, true, Math.PI * 0.62, Math.PI * 0.76), matOf(0x8e1424, 0.62, { side: THREE.DoubleSide })); cape.position.set(0, -0.4 * k, -0.03 * k); chest.add(cape);
    const fur = pm(new THREE.TorusGeometry(0.15 * k, 0.04 * k, 10, 32), matOf(0xf4f0e6, 0.95)); fur.rotation.x = Math.PI / 2; fur.scale.set(1, 0.78, 1); fur.position.y = 0.17 * k; chest.add(fur);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, sp = pm(new THREE.SphereGeometry(0.011 * k, 6, 5), matOf(0x111111, 0.6)); sp.position.set(Math.cos(a) * 0.15 * k * 1.18, 0.18 * k, Math.sin(a) * 0.15 * k * 0.92); chest.add(sp); }
    const cr = crown(k * 1.12); cr.position.y = HY + HS[1] * 0.9; head.add(cr); root.userData.crown = cr; }
  if (o.hat === 'chef') { const hb = pm(new THREE.CylinderGeometry(0.115 * k, 0.115 * k, 0.12 * k, 24), matOf(0xf7f7f3, 0.9)); hb.position.y = HY + HS[1] * 0.85; head.add(hb); const pf = pm(new THREE.SphereGeometry(0.15 * k, 18, 12), matOf(0xf7f7f3, 0.9)); pf.scale.y = 0.6; pf.position.y = HY + HS[1] * 0.85 + 0.1 * k; head.add(pf); }
  if (o.hat === 'band') { const b = pm(new THREE.TorusGeometry(HS[0] * 1.03, 0.013 * k, 8, 32), matOf(0xf2f0ea, 0.8)); b.rotation.x = Math.PI / 2 - 0.25; b.scale.z = HS[2] / HS[0]; b.position.set(0, HY + HS[1] * 0.4, -0.01 * k); head.add(b); }
  root.userData.face = fm; root.userData.headMesh = hd; root.userData.HS = HS;
  return root; }
// corona del rey: aro de oro con puntas, gemas y terciopelo dentro
function crown(k = 1) { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffc84a, roughness: 0.22, metalness: 1 }), gem = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.05, metalness: 0.2, emissive: c, emissiveIntensity: 0.35 });
  const band = pm(new THREE.CylinderGeometry(0.1 * k, 0.095 * k, 0.05 * k, 40, 1, true), gold); band.material.side = THREE.DoubleSide; g.add(band);
  const vel = pm(new THREE.SphereGeometry(0.093 * k, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matOf(0x7a0f22, 0.7)); vel.position.y = 0.0; vel.scale.y = 0.75; g.add(vel);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, sp = pm(new THREE.ConeGeometry(0.018 * k, 0.07 * k, 10), gold); sp.position.set(Math.sin(a) * 0.1 * k, 0.055 * k, Math.cos(a) * 0.1 * k); g.add(sp);
    const ball = pm(new THREE.SphereGeometry(0.011 * k, 10, 8), gold); ball.position.set(Math.sin(a) * 0.1 * k, 0.095 * k, Math.cos(a) * 0.1 * k); g.add(ball);
    const gm = pm(new THREE.SphereGeometry(0.011 * k, 12, 8), gem(i % 2 ? 0xd0102a : 0x1060d0)); gm.position.set(Math.sin(a + 0.39) * 0.101 * k, 0.0, Math.cos(a + 0.39) * 0.101 * k); g.add(gm); }
  return g; }

// ---- poses y gestos (todo por ángulos de las articulaciones; t en segundos)
const _P = { blink: 0 };
function blinkAt(t, ph) { const u = (t + ph) % 3.7; return u < 0.12 ? Math.sin(u / 0.12 * Math.PI) : 0; }
function talkAt(t, ph, k = 1) { const s = Math.sin(t * 15 + ph) * 0.5 + 0.5, s2 = Math.sin(t * 9.3 + ph * 2) * 0.5 + 0.5; return k * Math.max(0, s * s2 * 1.3 - 0.15); }
// postura base: de pie, quieto, respirando; mirada a un punto (cabeza y ojos)
function poseReset(p) { const J = p.userData.J; for (const n in J) { const j = J[n]; j.rotation.set(0, 0, 0); } J.pelvis.position.y = p.userData.base.pelY;
  J.shL.rotation.z = -0.06; J.shR.rotation.z = 0.06; J.elL.rotation.x = -0.12; J.elR.rotation.x = -0.12; }
function faceAt(p, t, o = {}) { const U = p.userData.face.userData.U, ph = p.userData.phase; U.blink.value = o.blink ?? blinkAt(t, ph); U.open.value = o.open ?? (o.talk ? talkAt(t, ph, o.talk) : 0); U.smile.value = o.smile ?? 0.35;
  U.gaze.value.set(o.gx ?? Math.sin(t * 0.37 + ph) * 0.25, o.gy ?? 0); U.brow.value = o.brow ?? 0; U.browTilt.value = o.tilt ?? 0; }
function breathe(p, t) { const J = p.userData.J, ph = p.userData.phase; J.chest.rotation.x = Math.sin(t * 1.6 + ph) * 0.015; J.head.rotation.y = Math.sin(t * 0.31 + ph) * 0.12; J.head.rotation.x = Math.sin(t * 0.23 + ph * 1.3) * 0.04; }
// sentado en una silla (altura del asiento ≈ 0,46): caderas a 90°, rodillas a 90°
function poseSit(p, lean = 0.08) { const J = p.userData.J, k = p.userData.k; J.pelvis.position.y = 0.47 * k; J.hpL.rotation.x = J.hpR.rotation.x = -Math.PI / 2 + 0.05; J.knL.rotation.x = J.knR.rotation.x = Math.PI / 2 - 0.05; J.spine.rotation.x = lean; J.hpL.rotation.z = -0.05; J.hpR.rotation.z = 0.05; }
// andar: piernas y brazos en vaivén (fase en metros recorridos)
function poseWalk(p, s, amp = 1) { const J = p.userData.J, k = p.userData.k, a = Math.sin(s * 2.6) * 0.42 * amp, b = Math.max(0, -Math.sin(s * 2.6 - 0.6)) * 0.7 * amp, b2 = Math.max(0, Math.sin(s * 2.6 - 0.6 + Math.PI)) * 0.7 * amp;
  J.hpL.rotation.x = a; J.hpR.rotation.x = -a; J.knL.rotation.x = b2; J.knR.rotation.x = b; J.shL.rotation.x = -a * 0.7; J.shR.rotation.x = a * 0.7; J.elL.rotation.x = -0.25; J.elR.rotation.x = -0.25;
  J.pelvis.position.y = p.userData.base.pelY + Math.abs(Math.sin(s * 2.6)) * 0.02 * k; J.chest.rotation.y = a * 0.12; }
// llevar la mano a la boca (comer con palillos, morder un pastel): k = 0 abajo … 1 en la boca
function poseEat(p, side, k) { const J = p.userData.J, sh = J['sh' + side], el = J['el' + side], s = side === 'L' ? -1 : 1; sh.rotation.x = -0.35 - 0.55 * k; sh.rotation.z = s * (0.15 + 0.15 * k); el.rotation.x = -1.2 - 1.05 * k; el.rotation.y = -s * 0.4 * k; }
// saludar con la mano (los que ven la cámara)
function poseWave(p, side, t, k = 1) { const J = p.userData.J, sh = J['sh' + side], el = J['el' + side], s = side === 'L' ? -1 : 1; sh.rotation.z = s * (0.08 + 2.5 * k); sh.rotation.x = -0.2 * k; el.rotation.x = 0; el.rotation.z = s * (0.35 + 0.35 * Math.sin(t * 9)) * k; }
// brazos sobre una mesa o mostrador (trabajar): manos delante a la altura del pecho
function poseWork(p, t, amp = 1) { const J = p.userData.J, ph = p.userData.phase; for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.x = -0.75 + Math.sin(t * 4 + ph + s) * 0.08 * amp; J['sh' + n].rotation.z = s * 0.18; J['el' + n].rotation.x = -1.0 + Math.sin(t * 6 + ph + s * 2) * 0.12 * amp; J['el' + n].rotation.y = s * 0.35; } J.spine.rotation.x = 0.12; J.head.rotation.x = 0.25; }
function lookAtP(p, target, k = 1) { const J = p.userData.J; p.updateMatrixWorld(true); const lp = J.neck.worldToLocal(target.clone()); const yaw = Math.atan2(lp.x, lp.z), pitch = -Math.atan2(lp.y - 0.1, Math.hypot(lp.x, lp.z));
  J.head.rotation.y = clamp(yaw, -1.0, 1.0) * k; J.head.rotation.x = clamp(pitch, -0.5, 0.5) * k; }

// brazo con cinemática inversa de dos huesos: lleva la mano (muñeca) a un punto del mundo; el codo se dobla hacia abajo y atrás
const _q1 = new THREE.Quaternion(), _q2b = new THREE.Quaternion(), _yA = new THREE.Vector3(0, -1, 0), _yU = new THREE.Vector3(0, 1, 0);
function reachTo(p, side, target, k = 1, pole = new THREE.Vector3(0, -1, -0.4)) { if (k <= 0.001) return; const J = p.userData.J, sh = J['sh' + side], el = J['el' + side], kk = p.userData.k;
  p.updateMatrixWorld(true); const d = J.chest.worldToLocal(target.clone()).sub(sh.position), L1 = 0.27 * kk, L2 = 0.28 * kk; let D = d.length(); if (D < 1e-4) return;
  D = Math.min(D, (L1 + L2) * 0.995); const dir = d.clone().normalize(), cosA = clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1), A = Math.acos(cosA);
  const n = new THREE.Vector3().crossVectors(dir, pole).normalize(); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); const u = dir.clone().applyAxisAngle(n, A);
  _q1.setFromUnitVectors(_yA, u); const t1 = d.clone().applyQuaternion(_q1.clone().invert()); const psi = Math.atan2(t1.x, t1.z); _q2b.setFromAxisAngle(_yU, psi);
  const qs = _q1.clone().multiply(_q2b), cosE = clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1), bend = Math.PI - Math.acos(cosE);
  if (k >= 0.999) { sh.quaternion.copy(qs); el.rotation.set(-bend, 0, 0); } else { sh.quaternion.slerp(qs, k); el.rotation.x = lerp(el.rotation.x, -bend, k); el.rotation.y *= 1 - k; el.rotation.z *= 1 - k; } }
