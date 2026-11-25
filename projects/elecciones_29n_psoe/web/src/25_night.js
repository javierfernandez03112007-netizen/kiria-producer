// ---------------------------------------------------------------- LA NOCHE (día 4): luna y estrellas, farolas que alumbran de verdad el suelo y las fachadas,
// ventanas encendidas y zonas que se pueden apagar (el apagón de la calle de la ferretería).
// Las farolas no son luces de three.js (cien luces serían lentísimas): son «luces baratas» solo difusas que se suman en el sombreador de
// TODOS los materiales (las 16 más cercanas a lo que mira la cámara, que se apagan poco a poco al salir de la lista: nada salta).
const NL_MAX = 16;
const NL = { V: { value: Array.from({ length: NL_MAX }, () => new THREE.Vector4()) }, C: { value: Array.from({ length: NL_MAX }, () => new THREE.Vector3()) } };
const NIGHT = { on: false, src: [], mats: [], zones: {}, spr: [] };
const NL_FRAG = `
{ vec3 nP = - vViewPosition;
  for (int i = 0; i < ${NL_MAX}; i++) { float r2 = nlV[i].w; if (r2 <= 0.0) continue; vec3 L = nlV[i].xyz - nP; float d2 = dot(L, L); if (d2 > 9.0 * r2) continue;
    float att = 1.0 / (1.0 + d2 / r2); att *= att * (1.0 - d2 / (9.0 * r2));
    float ndl = max(dot(normal, L * inversesqrt(max(d2, 1e-4))), 0.0);
    reflectedLight.directDiffuse += nlC[i] * (att * ndl) * BRDF_Lambert(material.diffuseColor); } }
`;
// fuente de luz barata: posición, color, intensidad, radio (m) y zona (para el apagón)
function nightSrc(p, color, I, r, zone = 'city') { const s = { p: p.clone ? p.clone() : _v(...p), c: new THREE.Color(color), I, r, zone }; NIGHT.src.push(s); return s; }
// un material que brilla y que se apaga con su zona (farolas, ventanas, carteles)
function nightMat(m, zone = 'city') { NIGHT.mats.push({ m, zone, I: m.emissiveIntensity ?? 1, op: m.opacity }); return m; }
function nightSprite(s, zone = 'city') { NIGHT.spr.push({ s, zone, op: s.material.opacity }); return s; }
function powerAt(zone, t) { const f = NIGHT.zones[zone]; return f ? clamp(f(t), 0, 1) : 1; }
// todos los materiales estándar reciben las luces baratas (se envuelve su onBeforeCompile, p. ej. el de las caras)
function nightify(root) {
  root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) { if (!m.isMeshStandardMaterial || m.userData.nl || (m.transparent && m.opacity < 0.5)) continue; m.userData.nl = 1;   // el cristal no recibe luz difusa
    const prev = m.onBeforeCompile, pk = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.nlV = NL.V; sh.uniforms.nlC = NL.C;
      sh.fragmentShader = `uniform vec4 nlV[${NL_MAX}];\nuniform vec3 nlC[${NL_MAX}];\n` + sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + NL_FRAG); };
    m.customProgramCacheKey = function () { return (pk ? pk.call(this) : '') + '|nl'; }; m.needsUpdate = true; } });
}
// cada fotograma (con la cámara ya colocada): las 16 fuentes más cercanas, en coordenadas de la cámara; el resto, a cero
const _nlv = new THREE.Vector3(), _nlRef = new THREE.Vector3();
function nightUpdate(t) {
  if (!NIGHT.on) return;
  for (const e of NIGHT.mats) { const k = powerAt(e.zone, t); if (e.m.emissiveIntensity !== undefined) e.m.emissiveIntensity = e.I * k; if (e.m.isMeshBasicMaterial || e.m.isSpriteMaterial) e.m.opacity = e.op * k; }
  for (const e of NIGHT.spr) e.s.material.opacity = e.op * powerAt(e.zone, t);
  cam.updateMatrixWorld(); const fw = cam.getWorldDirection(_nlRef).clone();
  const ref = cam.position.clone().addScaledVector(fw, 9);                       // un punto 9 m delante de la cámara
  const sc = NIGHT.src.map(s => [s.p.distanceTo(cam.position) * 0.6 + s.p.distanceTo(ref) * 0.4 - s.r * 0.5, s]).sort((a, b) => a[0] - b[0]);
  const cut = sc.length > NL_MAX ? sc[NL_MAX][0] : 1e9;
  for (let i = 0; i < NL_MAX; i++) { const V = NL.V.value[i], C = NL.C.value[i];
    if (i >= sc.length) { V.set(0, 0, 0, 0); C.set(0, 0, 0); continue; }
    const [d, s] = sc[i], fade = cut >= 1e9 ? 1 : clamp((cut - d) / Math.max(1, cut * 0.15), 0, 1), k = s.I * powerAt(s.zone, t) * fade;
    _nlv.copy(s.p).applyMatrix4(cam.matrixWorldInverse); V.set(_nlv.x, _nlv.y, _nlv.z, s.r * s.r); C.set(s.c.r * k, s.c.g * k, s.c.b * k); }
}
// halo de una farola o una bombilla (se apaga con su zona)
function nightGlow(G, p, col, s, op, zone = 'city') { const g = glowSprite(col, s, op); g.position.copy(p); G.add(g); return nightSprite(g, zone); }
// farola de noche: la de siempre con su propia bombilla (por zona), halo y luz barata
const NIGHT_LAMP = {};
function lampMat(zone) { if (NIGHT_LAMP[zone]) return NIGHT_LAMP[zone]; return NIGHT_LAMP[zone] = nightMat(new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc77a, emissiveIntensity: 5.5, roughness: 0.3 }), zone); }
function nightLamp(G, x, z, rotY, zone = 'city', I = 42) { const l = lampPost(); l.position.set(x, 0, z); l.rotation.y = rotY; G.add(l);
  l.traverse(o => { if (o.isMesh && o.material === T.lampGlow) o.material = lampMat(zone); });
  l.updateMatrixWorld(true); const head = l.localToWorld(_v(0.56, 3.6, 0)); nightSrc(head, 0xffc58a, I, 4.6, zone); nightGlow(G, head, 0xffcf8a, 1.3, 0.75, zone); return l; }
// ventanas: una parte de los cristales oscuros de un edificio pasa a ser ventana encendida (cálida, alguna fría como de tele)
const WIN_LIT = [];
function winLitMat(i, zone) { const k = zone + i; if (WIN_LIT[k]) return WIN_LIT[k]; const cols = [0xffc982, 0xffb46a, 0xffe0b0, 0x9fc4ff];
  return WIN_LIT[k] = nightMat(new THREE.MeshStandardMaterial({ color: 0x302418, emissive: cols[i % 4], emissiveIntensity: [2.2, 1.7, 2.6, 1.3][i % 4], roughness: 0.4 }), zone); }
function lightWindows(root, frac, seed, zone = 'city', glassM = T.glassDark) { const R = rng(seed); root.traverse(o => { if (o.isMesh && o.material === glassM && R() < frac) o.material = winLitMat(Math.floor(R() * 4), zone); }); }
